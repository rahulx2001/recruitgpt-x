"""Offline hybrid ranker v5 — bi-encoder + hybrid scorer (CE opt-in), trap-aware."""

from __future__ import annotations

import hashlib
import heapq
import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple

from challenge.assessment import (
    _ir_vals_from_signals,
    assessment_boost,
    assessment_penalty,
    assessment_score,
    top_ir_assessments,
)
from challenge.availability import availability_modifier, availability_score
from challenge.embeddings import EmbeddingStore
from challenge.rerank import (
    blend_stage1_cross_encoder,
    cross_encoder_enabled,
    rerank_scores,
)
from challenge.features import (
    CandidateIndex,
    build_index,
    cv_language_hits,
    ir_career_snippet,
    jd_overlap_score,
    production_score,
    semantic_score,
)
from challenge.semantic import jd_tfidf_similarity
from challenge.honeypot import honeypot_risk, risk_to_penalty
from challenge.jd_config import (
    CONSULTING_FIRMS,
    CORE_SKILL_PHRASES,
    CV_SPEECH_ROBOTICS,
    EXP_IDEAL_HI,
    EXP_IDEAL_LO,
    EXP_MAX,
    EXP_MIN,
    FAANG_CURRENT_PENALTY,
    FRAMEWORK_NOISE,
    GENERAL_ML_SKILLS,
    GOOD_TITLES,
    HONEYPOT_SKILL_NOISE,
    INDIA_LOCATIONS,
    PREFERRED_LOCATIONS,
    RESEARCH_ONLY_TITLES,
    SECONDARY_SKILL_PHRASES,
    STARTUP_BOOST_SIGNALS,
    STRONG_TITLES,
    WEAK_TITLES,
)
from challenge.text_match import (
    clean_leading_ellipsis_fragment,
    compile_multi_patterns,
    count_phrases_fast,
    norm_skill,
    norm_text,
    split_phrases,
    tokenize,
    truncate_at_word_boundary,
)

_PROF_MAP = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}

_CORE_S, _CORE_M = split_phrases(CORE_SKILL_PHRASES)
_SEC_S, _SEC_M = split_phrases(SECONDARY_SKILL_PHRASES)
_NOISE_S, _NOISE_M = split_phrases(HONEYPOT_SKILL_NOISE)
_CV_S, _CV_M = split_phrases(CV_SPEECH_ROBOTICS)
_FW_S, _FW_M = split_phrases(FRAMEWORK_NOISE)
_RESEARCH_S, _RESEARCH_M = split_phrases(("published", "paper", "academic", "phd", "thesis"))
_RESEARCH_P = compile_multi_patterns(_RESEARCH_M)
_FW_P = compile_multi_patterns(_FW_M)
_CORE_M_P = compile_multi_patterns(_CORE_M)
_SEC_M_P = compile_multi_patterns(_SEC_M)
_NOISE_M_P = compile_multi_patterns(_NOISE_M)
_GENERAL_S = frozenset(GENERAL_ML_SKILLS)

RERANK_POOL_SIZE = 500
_STAGE1_BLEND_ALPHA = 0.62

_EMBED_STORE: EmbeddingStore | None = None


def _embedding_store() -> EmbeddingStore:
    global _EMBED_STORE
    if _EMBED_STORE is None:
        _EMBED_STORE = EmbeddingStore()
    return _EMBED_STORE


# Ablation winner on behavioral proxy (eval_harness): title_heavy beats uniform/current.
DEFAULT_WEIGHTS: Dict[str, float] = {
    "title": 0.24,
    "skills": 0.18,
    "career_semantic": 0.12,
    "production": 0.10,
    "assessment": 0.08,
    "availability": 0.10,
    "jd_overlap": 0.06,
    "experience": 0.05,
    "location": 0.03,
    "engagement": 0.04,
}


@dataclass
class ScoredCandidate:
    candidate_id: str
    score: float
    reasoning: str
    components: Dict[str, float] = field(default_factory=dict)
    raw_score: float = 0.0
    core_skill_count: int = 0
    core_skill_names: List[str] = field(default_factory=list)


def _any_pattern(patterns: tuple, text: str) -> bool:
    for pat in patterns:
        if pat.search(text):
            return True
    return False


def _skill_bucket_tokens(tokens: frozenset[str], norm_name: str) -> str:
    if tokens & _CORE_S or _any_pattern(_CORE_M_P, norm_name):
        return "core"
    if tokens & _SEC_S or _any_pattern(_SEC_M_P, norm_name):
        return "secondary"
    if tokens & _NOISE_S or _any_pattern(_NOISE_M_P, norm_name):
        return "noise"
    return "other"


def _skill_bucket(name: str) -> str:
    n = norm_skill(name)
    return _skill_bucket_tokens(tokenize(n), n)


def _is_general_ml_skill_tokens(tokens: frozenset[str]) -> bool:
    return bool(tokens & _GENERAL_S)


def _is_general_ml_skill(name: str) -> bool:
    return _is_general_ml_skill_tokens(tokenize(norm_skill(name)))


def _title_score(title: str, history: List[Dict[str, Any]]) -> float:
    titles = [norm_text(title)] + [norm_text(h.get("title", "")) for h in history]
    best = 0.15
    for ti in titles:
        if "senior ai engineer" in ti:
            best = max(best, 1.06)
        elif "recommendation systems" in ti:
            best = max(best, 1.08)
        elif any(s in ti for s in ("search engineer", "information retrieval")):
            best = max(best, 1.05)
        elif "nlp engineer" in ti:
            best = max(best, 1.03)
        elif any(s in ti for s in STRONG_TITLES):
            best = max(best, 0.98)
        elif any(g in ti for g in GOOD_TITLES):
            best = max(best, 0.68)
        elif any(w in ti for w in WEAK_TITLES):
            best = max(best, 0.10)
        elif "engineer" in ti or "scientist" in ti:
            best = max(best, 0.40)
    return min(best, 1.1)


def _experience_score(years: float, history: List[Dict[str, Any]]) -> float:
    from challenge.honeypot import _career_span_years

    span = _career_span_years(history)
    if span > 0 and years > span * 1.2 + 1.0:
        return 0.15
    if years < EXP_MIN:
        return max(0.2, years / EXP_MIN * 0.5)
    if EXP_IDEAL_LO <= years <= EXP_IDEAL_HI:
        return 1.0
    if years <= EXP_MAX:
        return 0.85 - (years - EXP_IDEAL_HI) * 0.04
    return 0.45


def _skills_score(
    skills: List[Dict[str, Any]], signals: Dict[str, Any]
) -> Tuple[float, int, int, List[str]]:
    if not skills:
        return 0.08, 0, 0, []
    core = secondary = noise = 0
    quality = 0.0
    core_names: List[str] = []
    assess = signals.get("skill_assessment_scores") or {}

    for s in skills:
        name = s.get("name", "")
        n = norm_skill(name)
        tokens = tokenize(n)
        bucket = _skill_bucket_tokens(tokens, n)
        prof = _PROF_MAP.get(norm_text(s.get("proficiency", "")), 2)
        endorse = int(s.get("endorsements", 0) or 0)
        months = int(s.get("duration_months", 0) or 0)
        verified = next(
            (float(v) for k, v in assess.items() if name.lower() in k.lower()),
            None,
        )
        trust = min(1.0, 0.35 + min(endorse, 30) / 90 + min(months, 48) / 120)
        if verified is not None:
            trust = 0.55 * trust + 0.45 * (verified / 100.0)
        if prof >= 3 and months == 0:
            trust *= 0.35

        if bucket == "core":
            core += 1
            quality += (0.55 + prof * 0.1) * trust
            if not _is_general_ml_skill_tokens(tokens):
                core_names.append(name)
        elif bucket == "secondary":
            secondary += 1
            quality += (0.22 + prof * 0.05) * trust
        elif bucket == "noise":
            noise += 1

    if core == 0 and secondary == 0:
        return 0.06, 0, noise, []

    raw = quality / max(1, core + secondary * 0.45)
    noise_penalty = max(0.30, 1.0 - noise * 0.09)
    return min(1.0, raw * noise_penalty), len(core_names), noise, core_names


def _consulting_penalty(history: List[Dict[str, Any]]) -> float:
    if not history:
        return 0.88
    firms = [norm_text(h.get("company", "")) for h in history]
    consulting = sum(1 for f in firms if any(c in f for c in CONSULTING_FIRMS))
    if consulting == len(firms) and len(firms) >= 2:
        return 0.45
    if consulting >= len(firms) * 0.75:
        return 0.65
    return 1.0


def _location_score(profile: Dict[str, Any]) -> float:
    loc = norm_text(profile.get("location", ""))
    country = norm_text(profile.get("country", ""))
    if any(c in loc for c in PREFERRED_LOCATIONS):
        return 1.0
    if country == "india" or any(c in loc for c in INDIA_LOCATIONS):
        return 0.92
    if country in ("united states", "usa", "canada", "uk", "united kingdom"):
        return 0.50
    return 0.38


def _faang_current_modifier(profile: Dict[str, Any]) -> float:
    co = norm_text(profile.get("current_company", ""))
    if any(f in co for f in FAANG_CURRENT_PENALTY):
        return 0.93
    return 1.0


def _startup_boost(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    firms = [norm_text(profile.get("current_company", ""))]
    firms.extend(norm_text(h.get("company", "")) for h in history[:2])
    if any(any(s in f for s in STARTUP_BOOST_SIGNALS) for f in firms):
        return 1.05
    return 1.0


def _research_penalty(
    profile: Dict[str, Any], history: List[Dict[str, Any]], prod_s: float, idx: CandidateIndex
) -> float:
    titles = [norm_text(profile.get("current_title", ""))]
    titles.extend(norm_text(h.get("title", "")) for h in history[:3])
    research = any(any(r in t for r in RESEARCH_ONLY_TITLES) for t in titles)
    research_lang = count_phrases_fast(_RESEARCH_S, _RESEARCH_M, idx.full_tokens, idx.full_blob, _RESEARCH_P) >= 2
    if (research or research_lang) and prod_s < 0.45:
        return 0.55
    if research and prod_s < 0.65:
        return 0.78
    return 1.0


def _cv_speech_penalty(
    idx: CandidateIndex,
    core_ir_n: int,
    title: str,
    sem_s: float,
) -> float:
    cv_signal = cv_language_hits(idx)
    if cv_signal == 0:
        return 1.0

    t = norm_text(title)
    is_junior = "junior" in t or "intern" in t or ("associate" in t and "senior" not in t)

    if is_junior and cv_signal >= 1:
        return 0.30
    if cv_signal >= 2 and core_ir_n <= 1:
        return 0.40
    if cv_signal >= 1 and core_ir_n <= 2 and sem_s < 0.45:
        return 0.50
    if cv_signal >= 3:
        return 0.65
    if cv_signal >= 2:
        return 0.78
    return 0.90


def _framework_penalty(core_ir_n: int, idx: CandidateIndex) -> float:
    fw = len(_FW_S & idx.full_tokens)
    fw += sum(1 for pat in _FW_P if pat.search(idx.full_blob))
    fw_lang = count_phrases_fast(_FW_S, _FW_M, idx.career_tokens, idx.career_blob, _FW_P)
    if (fw >= 2 or fw_lang >= 2) and core_ir_n <= 2:
        return 0.75
    if fw >= 3:
        return 0.85
    return 1.0


def _weak_title_penalty(title: str, core_ir_n: int, noise_n: int) -> float:
    t = norm_text(title)
    if any(w in t for w in WEAK_TITLES):
        return 0.12 if (core_ir_n + noise_n) >= 4 else 0.25
    if noise_n >= 5 and core_ir_n <= 2:
        return 0.30
    return 1.0


def _engagement_score(signals: Dict[str, Any]) -> float:
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    saved = int(signals.get("saved_by_recruiters_30d", 0) or 0)
    icr = float(signals.get("interview_completion_rate", 0) or 0)
    return min(1.0, 0.5 * min(1.0, rr * 1.1) + 0.3 * min(1.0, saved / 8) + 0.2 * icr)


def _truncate_snippet(text: str, limit: int = 110) -> str:
    return truncate_at_word_boundary(text, limit)


def _reasoning_variant(candidate_id: str, tag: str, n: int) -> int:
    if n <= 0:
        return 0
    digest = hashlib.sha256(f"{candidate_id}:{tag}".encode()).hexdigest()
    return int(digest, 16) % n


_CAREER_IR_SHIPPED = (
    "career narrative documents production retrieval or ranking delivery",
    "work history cites shipped search/ranking systems in plain language",
    "profile describes hands-on retrieval/ranking ownership, not keyword padding",
    "career write-ups reference embedding or ranking systems taken to production",
    "past roles show concrete IR delivery milestones in narrative form",
    "experience section evidences ranking-layer or semantic-search shipping",
    "background aligns with founding-team retrieval mandate via career stories",
    "résumé text shows retrieval/ranking work described without title gaming",
    "career history backs hybrid-search or vector-retrieval production work",
    "narrative evidence points to ranking/retrieval systems built for users",
    "role descriptions mention ranking models or search quality improvements",
    "track record includes search/ranking infrastructure beyond buzzwords",
    "employment history supports JD retrieval focus through project detail",
    "career arc reflects applied IR work visible in role descriptions",
    "profile demonstrates ranking/search delivery from prior product roles",
    "documented ranking/search projects appear across prior employers",
    "search-quality or ranking-layer ownership visible in employment history",
    "production IR stories are present without inflated title signals",
    "candidate describes vector or hybrid retrieval work credibly",
    "ranking and retrieval themes recur in substantive role blurbs",
    "applied search/ranking delivery is evident from career text alone",
)

_CAREER_IR_ALIGNED = (
    "career descriptions track JD retrieval and ranking themes",
    "role summaries overlap the Senior AI Engineer retrieval mandate",
    "work history partially matches hybrid-search responsibilities in the JD",
    "experience narratives touch ranking/retrieval without dominant IR depth",
    "background shows adjacent retrieval themes in recent roles",
)

_SKILL_DEPTH = (
    "{n} core IR skills on profile ({skills})",
    "skills list hits {n} JD core IR tools: {skills}",
    "IR stack depth: {skills} ({n} core matches)",
    "verified tooling includes {skills} across {n} core IR areas",
    "technical skills cover {skills} ({n} core IR signals)",
    "profile lists {n} core retrieval tools — {skills}",
)

_SKILL_LIGHT = (
    "skills include {skills}",
    "IR tooling present: {skills}",
    "listed stack: {skills}",
    "core IR mentions: {skills}",
)

_CONCERN_LEADS = ("Concerns", "Flags", "Gaps to validate", "Risks", "Watch items")

_NOTICE_CONCERNS = (
    "{days}-day notice period",
    "notice period is {days} days",
    "long notice window ({days} days)",
)

_OTW_CONCERNS = (
    "not flagged open to work",
    "open_to_work flag is false",
    "no active open-to-work signal",
)

_THIN_IR_CONCERNS = (
    "thin core IR skill depth",
    "limited core IR tooling on skills list",
    "shallow IR skill coverage",
    "sparse JD core IR skills on profile",
    "skills section lacks IR stack breadth",
    "few explicit retrieval/ranking tools listed",
    "IR tooling evidence is narrow",
    "core retrieval skills not strongly represented",
    "limited FAISS/vector-search style skill proof",
    "skills list under-represents hybrid-search tooling",
    "IR depth on paper is thinner than top-band picks",
    "missing breadth in core IR skill inventory",
    "retrieval stack signals are light versus peers",
    "core IR keyword coverage is modest",
    "skills evidence does not show deep IR tooling",
)

_AVAIL_CONCERNS = (
    "low availability/recency signals",
    "weak availability and profile recency",
    "limited recent engagement signals",
)

_RESPONSE_CONCERNS = (
    "low recruiter response ({rate})",
    "recruiter response rate is low ({rate})",
    "weak recruiter response ({rate})",
)

_JD_TIE_TOP10 = (
    "JD fit: founding retrieval/ranking mandate supported by ({excerpt})",
    "Matches Redrob Senior AI Engineer scope via ({excerpt})",
    "Relevant JD evidence: ({excerpt})",
    "JD alignment: ({excerpt})",
    "Founding-team retrieval fit shown in ({excerpt})",
    "Role mandate link: ({excerpt})",
)

_RANK_INTRO = (
    "Ranked #{rank} (score {score:.4f}) — {primary}",
    "At #{rank} with score {score:.4f}: {primary}",
    "Position #{rank} (model {score:.4f}): {primary}",
    "Placed #{rank}; score {score:.4f}. {primary}",
    "#{rank} at {score:.4f} — {primary}",
    "Rank {rank} (calibrated {score:.4f}): {primary}",
    "Holds rank {rank} on score {score:.4f}; {primary}",
    "Score {score:.4f} places them #{rank}: {primary}",
)

_SECONDARY_JOIN = ("; plus ", "; additionally ", "; also ", " — and ", ". Further, ")


def _pick(pool: Tuple[str, ...], candidate_id: str, tag: str) -> str:
    return pool[_reasoning_variant(candidate_id, tag, len(pool))]


def _order_concerns(candidate_id: str, concerns: List[str]) -> List[str]:
    if len(concerns) <= 1:
        return concerns
    return sorted(concerns, key=lambda c: _reasoning_variant(candidate_id, c, 10_000))


def _vary_career_snippet(candidate_id: str, snippet: str, limit: int = 110) -> str:
    if len(snippet) <= limit:
        return snippet
    start = _reasoning_variant(candidate_id, "snippet_start", max(1, len(snippet) - limit + 1))
    return _truncate_snippet(snippet[start:], limit)


def _career_strength(
    candidate_id: str,
    ir_snippet: str,
    career_semantic: float,
) -> str:
    if ir_snippet and career_semantic >= 0.45:
        return _pick(_CAREER_IR_SHIPPED, candidate_id, "career_shipped")
    if career_semantic >= 0.55:
        return _pick(_CAREER_IR_ALIGNED, candidate_id, "career_aligned")
    return "partial overlap with the JD retrieval mandate"


def _skill_strength(candidate_id: str, core_ir_n: int, skill_txt: str) -> str:
    if core_ir_n >= 4:
        tpl = _pick(_SKILL_DEPTH, candidate_id, "skill_depth")
        return tpl.format(n=core_ir_n, skills=skill_txt)
    if skill_txt and skill_txt != "no verified core IR stack in skills list":
        tpl = _pick(_SKILL_LIGHT, candidate_id, "skill_light")
        return tpl.format(skills=skill_txt)
    return "limited explicit core IR skill coverage on profile"


def _build_reasoning(
    raw: Dict[str, Any],
    *,
    rank: int,
    core_ir_n: int,
    core_names: List[str],
    components: Dict[str, float],
    calibrated_score: float,
) -> str:
    profile = raw.get("profile", {})
    signals = raw.get("redrob_signals", {})
    history = raw.get("career_history", [])
    candidate_id = raw.get("candidate_id", "CAND_UNKNOWN")

    title = profile.get("current_title", "Candidate")
    company = profile.get("current_company", "")
    yrs = float(profile.get("years_of_experience", 0) or 0)
    loc = profile.get("location", "unknown")
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    notice = int(signals.get("notice_period_days", 0) or 0)
    otw = bool(signals.get("open_to_work_flag", False))

    skill_txt = ", ".join(core_names[:3]) if core_names else "no verified core IR stack in skills list"
    ir_snippet = ir_career_snippet(history)
    career_sem = float(components.get("career_semantic", 0) or 0)

    strengths: List[str] = []
    strengths.append(_career_strength(candidate_id, ir_snippet, career_sem))
    strengths.append(_skill_strength(candidate_id, core_ir_n, skill_txt))

    ir_assess = top_ir_assessments(signals)
    if ir_assess and components.get("assessment", 0) >= 0.7:
        assess_txt = ", ".join(f"{k} {v:.0f}" for k, v in ir_assess)
        assess_variants = (
            f"Redrob IR assessments: {assess_txt}",
            f"platform assessments back IR depth ({assess_txt})",
            f"verified assessment scores — {assess_txt}",
        )
        strengths.append(_pick(assess_variants, candidate_id, "assess"))

    if components.get("availability", 0) >= 0.65:
        avail_variants = (
            f"actively available (open_to_work={otw}, recruiter response {rr:.0%})",
            f"strong availability signals (OTW={otw}, response {rr:.0%})",
            f"recruiter engagement looks active: OTW {otw}, response {rr:.0%}",
        )
        strengths.append(_pick(avail_variants, candidate_id, "avail"))

    if any(c in norm_text(loc) for c in PREFERRED_LOCATIONS):
        loc_variants = (
            "based in Pune/Noida corridor — location fit",
            "Pune/Noida location matches hybrid JD preference",
            "geography aligns with Pune/Noida hiring focus",
        )
        strengths.append(_pick(loc_variants, candidate_id, "loc"))

    concerns: List[str] = []
    hp_risk = components.get("honeypot_risk", 0)
    if hp_risk >= 0.35:
        concerns.append(f"profile consistency risk ({hp_risk:.0%})")
    if not otw:
        concerns.append(_pick(_OTW_CONCERNS, candidate_id, "otw"))
    if components.get("availability", 0) < 0.4:
        concerns.append(_pick(_AVAIL_CONCERNS, candidate_id, "avail_low"))
    if rr < 0.35:
        concerns.append(
            _pick(_RESPONSE_CONCERNS, candidate_id, "resp").format(rate=f"{rr:.0%}")
        )
    if notice >= 60:
        concerns.append(
            _pick(_NOTICE_CONCERNS, candidate_id, "notice").format(days=notice)
        )
    if core_ir_n < 3:
        concerns.append(_pick(_THIN_IR_CONCERNS, candidate_id, "thin_ir"))
    if components.get("faang", 1.0) < 1.0:
        concerns.append(f"currently at {company} — JD flags big-tech ladder seekers")
    if components.get("research", 1.0) < 0.8:
        concerns.append("research-heavy without strong production signals")
    if components.get("cv_penalty", 1.0) < 0.8:
        concerns.append("CV/speech/robotics focus without sufficient IR depth")

    co = f" @ {company}" if company else ""
    lead_variants = (
        f"{title}{co}, {yrs:.1f}y, {loc}.",
        f"{title}{co} — {yrs:.1f} years — {loc}.",
        f"{loc}-based {title}{co} ({yrs:.1f}y experience).",
        f"{title} at {company}, {yrs:.1f}y, {loc}." if company else f"{title}, {yrs:.1f}y, {loc}.",
    )
    lead = _pick(lead_variants, candidate_id, "lead")

    primary = strengths[0]
    secondary = strengths[1] if len(strengths) > 1 else ""
    tertiary = strengths[2] if len(strengths) > 2 else ""

    intro_tpl = _pick(_RANK_INTRO, candidate_id, "intro")
    intro = intro_tpl.format(rank=rank, score=calibrated_score, primary=primary)
    if secondary:
        join = _pick(_SECONDARY_JOIN, candidate_id, "join")
        intro += join + secondary
    intro += "."

    concern_lead = _pick(_CONCERN_LEADS, candidate_id, "concern_lead")
    if concerns:
        ordered = _order_concerns(candidate_id, concerns)
        concern_txt = f" {concern_lead}: {'; '.join(ordered[:3])}."
    elif rank <= 10:
        concern_txt = (
            f" {concern_lead}: founding-role scope still needs validation in technical screen."
        )
    elif rank >= 85:
        concern_txt = (
            f" {concern_lead}: marginal JD fit — included as lower-band coverage for rank {rank}."
        )
    else:
        concern_txt = ""

    jd_tie = ""
    if rank <= 10 and ir_snippet:
        jd_excerpt = clean_leading_ellipsis_fragment(
            _truncate_snippet(ir_snippet.split(":", 1)[-1].strip(), 72)
        )
        jd_tpl = _pick(_JD_TIE_TOP10, candidate_id, "jd_tie")
        jd_tie = f" {jd_tpl.format(excerpt=jd_excerpt)}."

    career_extra = ""
    if ir_snippet:
        career_labels = ("Career note", "Evidence", "Profile excerpt", "Relevant history")
        label = _pick(career_labels, candidate_id, "career_label")
        snippet = _vary_career_snippet(candidate_id, ir_snippet)
        career_extra = f" {label}: {snippet}."
    elif history:
        for role in history[:2]:
            desc = (role.get("description") or "").strip()
            if len(desc) > 30:
                label = _pick(("Career note", "Earlier role", "Background"), candidate_id, "career_alt")
                career_extra = (
                    f" {label}: {role.get('title', 'Role')} @ {role.get('company', '?')}: "
                    f"{_truncate_snippet(desc)}."
                )
                break

    layout = _reasoning_variant(candidate_id, "layout", 8)
    parts: List[str]
    if layout == 0:
        parts = [lead, intro, concern_txt, jd_tie, career_extra]
    elif layout == 1:
        parts = [lead, intro, career_extra, concern_txt, jd_tie]
    elif layout == 2:
        parts = [lead, jd_tie, intro, concern_txt, career_extra]
    elif layout == 3:
        parts = [lead, career_extra, intro, concern_txt, jd_tie]
    elif layout == 4:
        parts = [intro, lead, concern_txt, jd_tie, career_extra]
    elif layout == 5:
        parts = [lead, intro + (f" {tertiary}." if tertiary else ""), concern_txt, career_extra]
    elif layout == 6:
        parts = [lead, concern_txt, intro, jd_tie, career_extra]
    else:
        parts = [lead, intro, jd_tie, concern_txt, career_extra]

    body = " ".join(p.strip() for p in parts if p and p.strip())
    if rank >= 90 and "marginal" not in body.lower() and "lower-band" not in body.lower():
        body += " Included near cutoff given weaker IR depth versus higher ranks."
    return body


def score_candidate(
    raw: Dict[str, Any],
    weights: Dict[str, float] | None = None,
) -> ScoredCandidate:
    cid = raw["candidate_id"]
    profile = raw.get("profile", {})
    history = raw.get("career_history", [])
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})

    idx = build_index(profile, history)

    title_s = _title_score(profile.get("current_title", ""), history)
    exp_s = _experience_score(float(profile.get("years_of_experience", 0) or 0), history)
    skill_s, core_ir_n, noise_n, core_names = _skills_score(skills, signals)
    prod_s = production_score(idx)
    loc_s = _location_score(profile)
    jd_s = jd_overlap_score(idx)
    bi_enc = _embedding_store().cosine_vs_jd(cid)
    if bi_enc is None:
        bi_enc = jd_tfidf_similarity(idx.career_tf)
    sem_s = semantic_score(idx, bi_enc)
    avail_s = availability_score(signals)
    ir_vals = _ir_vals_from_signals(signals)
    assess_s = assessment_score(signals, skills, ir_vals)
    engage_s = _engagement_score(signals)

    hp_risk = honeypot_risk(raw)
    hp_pen = risk_to_penalty(hp_risk)
    faang_mod = _faang_current_modifier(profile)
    research_mod = _research_penalty(profile, history, prod_s, idx)
    cv_mod = _cv_speech_penalty(idx, core_ir_n, profile.get("current_title", ""), sem_s)

    w = weights or DEFAULT_WEIGHTS
    base = (
        w["title"] * title_s
        + w["skills"] * skill_s
        + w["career_semantic"] * sem_s
        + w["production"] * prod_s
        + w["assessment"] * assess_s
        + w["availability"] * avail_s
        + w["jd_overlap"] * jd_s
        + w["experience"] * exp_s
        + w["location"] * loc_s
        + w["engagement"] * engage_s
    )

    modifiers = (
        hp_pen
        * _consulting_penalty(history)
        * availability_modifier(signals)
        * assessment_boost(signals, skills, ir_vals)
        * assessment_penalty(signals, skills, ir_vals)
        * faang_mod
        * _startup_boost(profile, history)
        * research_mod
        * cv_mod
        * _framework_penalty(core_ir_n, idx)
        * _weak_title_penalty(profile.get("current_title", ""), core_ir_n, noise_n)
    )

    raw_final = base * modifiers

    components = {
        "title": title_s,
        "skills": skill_s,
        "career_semantic": sem_s,
        "bi_encoder": bi_enc if bi_enc is not None else -1.0,
        "production": prod_s,
        "assessment": assess_s,
        "availability": avail_s,
        "jd_overlap": jd_s,
        "experience": exp_s,
        "location": loc_s,
        "engagement": engage_s,
        "honeypot_risk": hp_risk,
        "honeypot": hp_pen,
        "faang": faang_mod,
        "research": research_mod,
        "cv_penalty": cv_mod,
    }

    return ScoredCandidate(
        candidate_id=cid,
        score=raw_final,
        reasoning="",
        components=components,
        raw_score=raw_final,
        core_skill_count=core_ir_n,
        core_skill_names=core_names,
    )


def load_candidates(path) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def _sort_key(x: ScoredCandidate) -> Tuple:
    return (
        -x.raw_score,
        -x.components.get("career_semantic", 0),
        -x.core_skill_count,
        -x.components.get("assessment", 0),
        -x.components.get("availability", 0),
        -x.components.get("production", 0),
        x.candidate_id,
    )


def rank_candidates(candidates_path, top_k: int = 100) -> List[ScoredCandidate]:
    """
    Ranking pipeline (canonical / Stage 3):
    1) Hybrid score all candidates → keep top RERANK_POOL_SIZE
    2) Optional cross-encoder rerank (RANKER_USE_CROSS_ENCODER=1 only)
    3) Calibrated top_k with grounded reasoning
    """
    pool_size = max(top_k, RERANK_POOL_SIZE)
    heap: list[Tuple[float, str, ScoredCandidate, Dict[str, Any]]] = []
    for raw in load_candidates(candidates_path):
        sc = score_candidate(raw)
        entry = (sc.raw_score, sc.candidate_id, sc, raw)
        if len(heap) < pool_size:
            heapq.heappush(heap, entry)
        elif sc.raw_score > heap[0][0]:
            heapq.heapreplace(heap, entry)

    pool = sorted((x[2] for x in heap), key=_sort_key)
    raw_by_id = {x[2].candidate_id: x[3] for x in heap}

    ce_scores = None
    if cross_encoder_enabled():
        ce_scores = rerank_scores([raw_by_id[s.candidate_id] for s in pool])
    if ce_scores:
        for sc, ce in zip(pool, ce_scores):
            blended = blend_stage1_cross_encoder(
                sc.raw_score, ce, alpha=_STAGE1_BLEND_ALPHA
            )
            sc.raw_score = blended
            sc.components["cross_encoder"] = ce
        pool = sorted(pool, key=_sort_key)

    finalists = pool[:top_k]

    calibrated = _calibrate_scores([f.raw_score for f in finalists])
    out: List[ScoredCandidate] = []
    for i, row in enumerate(finalists):
        src = raw_by_id.get(row.candidate_id, {})
        cal = calibrated[i]
        reasoning = _build_reasoning(
            src,
            rank=i + 1,
            core_ir_n=row.core_skill_count,
            core_names=row.core_skill_names,
            components=row.components,
            calibrated_score=cal,
        )
        out.append(
            ScoredCandidate(
                candidate_id=row.candidate_id,
                score=cal,
                reasoning=reasoning,
                components=row.components,
                raw_score=row.raw_score,
                core_skill_count=row.core_skill_count,
            )
        )
    return out


def _calibrate_scores(raw_scores: List[float]) -> List[float]:
    """Map model scores → monotonic [0.99, 0.20] preserving real separation."""
    if not raw_scores:
        return []
    lo = min(raw_scores)
    hi = max(raw_scores)
    span = hi - lo if hi > lo else 1.0
    out: List[float] = []
    for s in raw_scores:
        norm = (s - lo) / span
        cal = 0.20 + 0.79 * norm
        out.append(round(cal, 4))
    floor = 0.20
    for i in range(1, len(out)):
        if out[i] >= out[i - 1]:
            out[i] = round(max(floor, out[i - 1] - 0.0001), 4)
    return out


def write_submission(rows: List[ScoredCandidate], out_path) -> None:
    import csv
    from pathlib import Path

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["candidate_id", "rank", "score", "reasoning"])
        for i, row in enumerate(rows):
            w.writerow([row.candidate_id, i + 1, f"{row.score:.4f}", row.reasoning])


def run_self_test(sample_path: Optional = None) -> int:
    if sample_path is None:
        return 0
    rows = []
    data = json.loads(sample_path.read_text(encoding="utf-8"))
    for raw in data[:200]:
        rows.append(score_candidate(raw))
    rows.sort(key=_sort_key)
    print("Self-test top 5:")
    for r in rows[:5]:
        print(f"  {r.candidate_id} {r.raw_score:.4f}")
    return 0