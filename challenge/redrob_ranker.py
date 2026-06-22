"""Offline hybrid ranker v5 — bi-encoder + cross-encoder rerank, trap-aware."""

from __future__ import annotations

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
from challenge.rerank import blend_stage1_cross_encoder, rerank_scores
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
    compile_multi_patterns,
    count_phrases_fast,
    norm_skill,
    norm_text,
    split_phrases,
    tokenize,
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


DEFAULT_WEIGHTS: Dict[str, float] = {
    "title": 0.17,
    "skills": 0.16,
    "career_semantic": 0.15,
    "production": 0.11,
    "assessment": 0.10,
    "availability": 0.10,
    "jd_overlap": 0.06,
    "experience": 0.05,
    "location": 0.04,
    "engagement": 0.06,
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


def _truncate_snippet(text: str, limit: int = 88) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


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
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})
    history = raw.get("career_history", [])

    title = profile.get("current_title", "Candidate")
    company = profile.get("current_company", "")
    yrs = float(profile.get("years_of_experience", 0) or 0)
    loc = profile.get("location", "unknown")
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    notice = int(signals.get("notice_period_days", 0) or 0)
    otw = bool(signals.get("open_to_work_flag", False))

    skill_txt = ", ".join(core_names[:3]) if core_names else "no verified core IR stack in skills list"
    ir_snippet = ir_career_snippet(history)

    strengths: List[str] = []
    if ir_snippet and components.get("career_semantic", 0) >= 0.45:
        strengths.append("career history describes shipped retrieval/ranking work in plain language")
    elif components.get("career_semantic", 0) >= 0.55:
        strengths.append("career descriptions align with JD retrieval/ranking themes")
    if core_ir_n >= 4:
        strengths.append(f"{core_ir_n} core IR skills ({skill_txt})")
    elif core_names:
        strengths.append(f"core IR skills: {skill_txt}")
    ir_assess = top_ir_assessments(signals)
    if ir_assess and components.get("assessment", 0) >= 0.7:
        strengths.append(
            "verified IR assessments: " + ", ".join(f"{k} {v:.0f}" for k, v in ir_assess)
        )
    if components.get("availability", 0) >= 0.65:
        strengths.append(f"actively available (open_to_work={otw}, response rate {rr:.0%})")
    if any(c in norm_text(loc) for c in PREFERRED_LOCATIONS):
        strengths.append("Pune/Noida location fit")
    if not strengths:
        strengths.append("partial overlap with JD retrieval mandate")

    concerns: List[str] = []
    hp_risk = components.get("honeypot_risk", 0)
    if hp_risk >= 0.35:
        concerns.append(f"profile consistency risk ({hp_risk:.0%})")
    if not otw:
        concerns.append("not flagged open to work")
    if components.get("availability", 0) < 0.4:
        concerns.append("low availability/recency signals")
    if rr < 0.35:
        concerns.append(f"low recruiter response ({rr:.0%})")
    if notice >= 60:
        concerns.append(f"{notice}-day notice period")
    if core_ir_n < 3:
        concerns.append("thin core IR skill depth")
    if components.get("faang", 1.0) < 1.0:
        concerns.append(f"currently at {company} — JD flags big-tech ladder seekers")
    if components.get("research", 1.0) < 0.8:
        concerns.append("research-heavy without strong production signals")
    if components.get("cv_penalty", 1.0) < 0.8:
        concerns.append("CV/speech/robotics focus without sufficient IR depth")

    co = f" @ {company}" if company else ""
    lead = f"{title}{co}, {yrs:.1f}y, {loc}."

    why = (
        f"Ranked #{rank} (model score {calibrated_score:.4f}) because "
        + (strengths[0] if strengths else "of marginal JD fit")
    )
    if len(strengths) > 1:
        why += f"; also {strengths[1]}"
    why += "."

    concern_txt = ""
    if concerns:
        concern_txt = f" Concerns: {'; '.join(concerns[:3])}."
    elif rank <= 10:
        concern_txt = " Concerns: founding-role scope may still need validation in technical screen."

    jd_tie = ""
    if rank <= 10 and ir_snippet:
        jd_tie = (
            " JD fit: career evidence supports founding-team retrieval/ranking mandate "
            f"({ir_snippet.split(':', 1)[-1].strip()[:60]}…)."
        )

    extra = ""
    if ir_snippet:
        extra = f" Career note: {ir_snippet}."
    elif history:
        for role in history[:2]:
            desc = (role.get("description") or "").strip()
            if len(desc) > 30:
                extra = (
                    f" Career note: {role.get('title', 'Role')} @ {role.get('company', '?')}: "
                    f"{_truncate_snippet(desc)}."
                )
                break

    return f"{lead} {why}{concern_txt}{jd_tie}{extra}"


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
    Two-stage ranking:
    1) Hybrid score all candidates → keep top RERANK_POOL_SIZE
    2) Cross-encoder rerank pool → take top_k (graceful fallback if model missing)
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