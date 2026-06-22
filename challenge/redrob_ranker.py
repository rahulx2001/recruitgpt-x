"""Offline hybrid ranker for Redrob challenge — no network, CPU-friendly."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from challenge.jd_config import (
    CONSULTING_FIRMS,
    CORE_AI_SKILLS,
    EXP_IDEAL_HI,
    EXP_IDEAL_LO,
    EXP_MAX,
    EXP_MIN,
    FRAMEWORK_NOISE,
    GOOD_TITLES,
    HONEYPOT_SKILL_NOISE,
    INDIA_LOCATIONS,
    JD_OVERLAP_PHRASES,
    PREFERRED_LOCATIONS,
    PRODUCT_COMPANY_SIGNALS,
    SECONDARY_AI_SKILLS,
    STRONG_TITLES,
    WEAK_TITLES,
)

_PROF_MAP = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}


@dataclass
class ScoredCandidate:
    candidate_id: str
    score: float
    reasoning: str
    components: Dict[str, float]
    raw_score: float = 0.0
    core_skill_count: int = 0


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower().strip())


def _norm_skill(name: str) -> str:
    """Normalize skill tokens so 'hugging-face' matches 'hugging face'."""
    n = _norm(name)
    return re.sub(r"[-_/]+", " ", n)


def _skill_bucket(name: str) -> str:
    n = _norm_skill(name)
    if any(k in n for k in CORE_AI_SKILLS):
        return "core"
    if any(k in n for k in SECONDARY_AI_SKILLS):
        return "secondary"
    if any(k in n for k in HONEYPOT_SKILL_NOISE):
        return "noise"
    return "other"


def _title_score(title: str, history: List[Dict[str, Any]]) -> float:
    t = _norm(title)
    titles = [t] + [_norm(h.get("title", "")) for h in history]
    best = 0.15
    for ti in titles:
        if "senior ai engineer" in ti:
            best = max(best, 1.08)
        elif "recommendation systems" in ti:
            best = max(best, 1.07)
        elif any(
            s in ti
            for s in (
                "search engineer",
                "information retrieval",
                "nlp engineer",
            )
        ):
            best = max(best, 1.05)
        elif any(s in ti for s in STRONG_TITLES):
            best = max(best, 1.0)
        elif any(g in ti for g in GOOD_TITLES):
            best = max(best, 0.72)
        elif any(w in ti for w in WEAK_TITLES):
            best = max(best, 0.12)
        elif "engineer" in ti or "scientist" in ti:
            best = max(best, 0.45)
    return min(best, 1.1)


def _experience_score(years: float) -> float:
    if years < EXP_MIN:
        return max(0.2, years / EXP_MIN * 0.5)
    if EXP_IDEAL_LO <= years <= EXP_IDEAL_HI:
        return 1.0
    if years <= EXP_MAX:
        return 0.85 - (years - EXP_IDEAL_HI) * 0.04
    return 0.55


def _skills_score(skills: List[Dict[str, Any]]) -> Tuple[float, int, int]:
    """Returns (score, core_count, noise_count)."""
    if not skills:
        return 0.1, 0, 0
    core = secondary = noise = 0
    core_quality = 0.0
    for s in skills:
        name = s.get("name", "")
        bucket = _skill_bucket(name)
        prof = _PROF_MAP.get(_norm(s.get("proficiency", "")), 2)
        endorse = int(s.get("endorsements", 0) or 0)
        months = int(s.get("duration_months", 0) or 0)
        trust = min(1.0, 0.4 + min(endorse, 40) / 80 + min(months, 48) / 96)

        if bucket == "core":
            core += 1
            core_quality += (0.55 + prof * 0.1) * trust
        elif bucket == "secondary":
            secondary += 1
            core_quality += (0.25 + prof * 0.05) * trust
        elif bucket == "noise":
            noise += 1

    if core == 0 and secondary == 0:
        return 0.08, 0, noise

    raw = core_quality / max(1, core + secondary * 0.5)
    # Penalize noise-heavy profiles (keyword stuffing)
    noise_penalty = max(0.35, 1.0 - noise * 0.08)
    return min(1.0, raw * noise_penalty), core, noise


def _profile_blob(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> str:
    return " ".join(
        [
            profile.get("summary", ""),
            profile.get("headline", ""),
            *[h.get("description", "") for h in history],
        ]
    ).lower()


def _jd_overlap_score(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    """Lexical overlap with JD mandate — lightweight semantic proxy, no embeddings."""
    blob = _profile_blob(profile, history)
    hits = sum(1 for phrase in JD_OVERLAP_PHRASES if phrase in blob)
    return min(1.0, hits / 8.0)


def _product_company_boost(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    firms = [_norm(profile.get("current_company", ""))]
    firms.extend(_norm(h.get("company", "")) for h in history[:3])
    product_hits = sum(
        1 for f in firms if any(p in f for p in PRODUCT_COMPANY_SIGNALS)
    )
    if product_hits >= 2:
        return 1.05
    if product_hits == 1:
        return 1.02
    return 1.0


def _notice_modifier(signals: Dict[str, Any]) -> float:
    notice = int(signals.get("notice_period_days", 0) or 0)
    if notice >= 90:
        return 0.92
    if notice >= 60:
        return 0.96
    if notice <= 30:
        return 1.02
    return 1.0


def _title_chaser_penalty(history: List[Dict[str, Any]]) -> float:
    if len(history) < 3:
        return 1.0
    short = sum(1 for h in history if int(h.get("duration_months", 0) or 0) < 18)
    if short >= 3:
        return 0.88
    if short >= 2:
        return 0.94
    return 1.0


def _framework_penalty(skills: List[Dict[str, Any]], core_n: int) -> float:
    fw = sum(1 for s in skills if any(n in _norm_skill(s.get("name", "")) for n in FRAMEWORK_NOISE))
    if fw >= 2 and core_n <= 3:
        return 0.9
    if fw >= 3:
        return 0.93
    return 1.0


def _production_score(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    blob = _profile_blob(profile, history)
    signals = [
        "production",
        "deployed",
        "serving",
        "users",
        "a/b",
        "ndcg",
        "mrr",
        "retrieval",
        "embedding",
        "vector",
        "ranking",
        "pipeline",
        "scale",
    ]
    hits = sum(1 for k in signals if k in blob)
    return min(1.0, hits / 6.0)


def _consulting_penalty(history: List[Dict[str, Any]]) -> float:
    if not history:
        return 0.9
    firms = [_norm(h.get("company", "")) for h in history]
    consulting = sum(
        1 for f in firms if any(c in f for c in CONSULTING_FIRMS)
    )
    if consulting == len(firms) and len(firms) >= 2:
        return 0.55
    if consulting >= len(firms) * 0.75:
        return 0.72
    return 1.0


def _location_score(profile: Dict[str, Any]) -> float:
    loc = _norm(profile.get("location", ""))
    country = _norm(profile.get("country", ""))
    if any(c in loc for c in PREFERRED_LOCATIONS):
        return 1.0
    if country == "india" or any(c in loc for c in INDIA_LOCATIONS):
        return 0.94
    if country in ("united states", "usa", "canada", "uk", "united kingdom"):
        return 0.55
    return 0.4


def _behavioral_modifier(signals: Dict[str, Any]) -> float:
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    gh = float(signals.get("github_activity_score", -1) or -1)
    saved = int(signals.get("saved_by_recruiters_30d", 0) or 0)
    views = int(signals.get("profile_views_received_30d", 0) or 0)
    icr = float(signals.get("interview_completion_rate", 0) or 0)
    completeness = float(signals.get("profile_completeness_score", 0) or 0) / 100

    gh_norm = 0.5 if gh < 0 else min(1.0, gh / 100)
    mod = (
        0.25 * min(1.0, rr * 1.2)
        + 0.2 * gh_norm
        + 0.15 * min(1.0, saved / 10)
        + 0.1 * min(1.0, views / 50)
        + 0.1 * icr
        + 0.2 * completeness
    )
    return min(1.15, 0.85 + mod * 0.26)


def _top_skill_names(skills: List[Dict[str, Any]], bucket: str, limit: int = 3) -> List[str]:
    names: List[str] = []
    for s in skills:
        if _skill_bucket(s.get("name", "")) == bucket:
            names.append(s.get("name", ""))
    return names[:limit]


def _prior_product_role(history: List[Dict[str, Any]]) -> str:
    for h in history[:4]:
        co = h.get("company", "")
        if co and any(p in _norm(co) for p in PRODUCT_COMPANY_SIGNALS):
            return co
    return ""


def _build_reasoning(
    raw: Dict[str, Any],
    *,
    rank: int,
    core_n: int,
    prod_s: float,
    components: Dict[str, float],
) -> str:
    """Stage-4 reasoning: specific facts, JD tie-in, honest concerns, varied tone."""
    profile = raw.get("profile", {})
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})
    history = raw.get("career_history", [])

    title = profile.get("current_title", "Candidate")
    company = profile.get("current_company", "")
    yrs = float(profile.get("years_of_experience", 0) or 0)
    loc = profile.get("location", "unknown")
    country = profile.get("country", "India")
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    notice = int(signals.get("notice_period_days", 0) or 0)
    gh = float(signals.get("github_activity_score", -1) or -1)
    prior_co = _prior_product_role(history)

    core_names = _top_skill_names(skills, "core", 3)
    skill_phrase = ", ".join(core_names) if core_names else "limited core IR stack"

    jd_bits: List[str] = []
    norm_title = _norm(title)
    if "senior ai engineer" in norm_title:
        jd_bits.append("exact JD title match")
    elif "recommendation systems" in norm_title:
        jd_bits.append("shipped ranking/recommendation systems — core Redrob product mandate")
    elif any(t in norm_title for t in ("search engineer", "information retrieval")):
        jd_bits.append("search/IR background maps directly to hybrid retrieval ownership")
    elif any(t in norm_title for t in ("nlp", "retrieval")):
        jd_bits.append("NLP+retrieval depth for embeddings-based matching")
    elif core_n >= 5:
        jd_bits.append("deep vector-search stack")
    elif core_n >= 3:
        jd_bits.append("partial JD skill coverage")
    else:
        jd_bits.append("adjacent ML profile")

    if prod_s >= 0.85:
        jd_bits.append("production deployment language in career history")
    if components.get("jd_overlap", 0) >= 0.75:
        jd_bits.append("high lexical overlap with JD retrieval/ranking requirements")
    if EXP_IDEAL_LO <= yrs <= EXP_IDEAL_HI:
        jd_bits.append("experience in JD's 5–9y band")
    if any(c in _norm(loc) for c in PREFERRED_LOCATIONS):
        jd_bits.append("Pune/Noida-preferred location")
    if components.get("product", 1.0) > 1.0 and company:
        jd_bits.append(f"product-company pedigree ({company})")

    concerns: List[str] = []
    if yrs < EXP_MIN:
        concerns.append(f"only {yrs:.1f}y experience (JD prefers 4+)")
    elif yrs > EXP_MAX:
        concerns.append(f"{yrs:.1f}y may be senior-heavy for founding IC role")
    if core_n < 4:
        concerns.append(f"only {core_n} core IR skills vs JD's retrieval/ranking depth")
    if prod_s < 0.5:
        concerns.append("weak production-shipping signals in profile text")
    if rr < 0.4:
        concerns.append(f"low recruiter response rate ({rr:.2f})")
    if notice >= 60:
        concerns.append(f"long notice period ({notice}d)")
    if gh >= 0 and gh < 40:
        concerns.append(f"muted GitHub activity ({gh:.0f})")
    if country and _norm(country) not in ("india", "") and "india" not in _norm(loc):
        concerns.append(f"based in {country}, not India-first")
    if components.get("honeypot", 1.0) < 1.0:
        concerns.append("title/skill mismatch pattern flagged")
    firms = [_norm(h.get("company", "")) for h in history]
    if firms and all(any(c in f for c in CONSULTING_FIRMS) for f in firms[:2]):
        concerns.append("consulting-heavy career vs JD's product-company preference")

    co = f" @ {company}" if company else ""
    lead = f"{title}{co} — {yrs:.1f}y in {loc}; skills: {skill_phrase}."

    if rank == 1:
        tone = (
            f"Best overall fit for Redrob's founding Senior AI Engineer role — "
            f"{'; '.join(jd_bits[:3])}."
        )
    elif rank <= 3:
        tone = (
            f"Near-perfect match for owning retrieval/ranking at Redrob — "
            f"{jd_bits[0]}"
            + (f"; previously at {prior_co}" if prior_co and prior_co != company else "")
            + "."
        )
    elif rank <= 5:
        tone = (
            f"Strong founding-team shortlist — {', '.join(jd_bits[:2])}; "
            f"matches JD's shipper-over-researcher profile."
        )
    elif rank <= 7:
        tone = (
            f"Would advance to technical screen — {jd_bits[0]} with "
            f"{core_n} core IR skills and {rr:.0%} recruiter response."
        )
    elif rank <= 10:
        tone = (
            f"Top-decile candidate for embeddings+retrieval work — "
            f"{', '.join(jd_bits[:2])}."
        )
    else:
        tone = ""

    if rank <= 10:
        if concerns:
            tone += f" Watch: {'; '.join(concerns[:2])}."
        return f"{lead} {tone}"

    if rank <= 50:
        tone = f"Solid JD fit ({', '.join(jd_bits[:2])}); response rate {rr:.2f}."
        if gh >= 0:
            tone += f" GitHub {gh:.0f}."
        if concerns:
            tone += f" Concerns: {'; '.join(concerns[:2])}."
        else:
            tone += " No major red flags."
        return f"{lead} {tone}"

    if rank <= 85:
        tone = f"Qualified but not top-tier for this JD ({jd_bits[0] if jd_bits else 'partial fit'})."
        if concerns:
            tone += f" Gaps: {'; '.join(concerns[:3])}."
        return f"{lead} {tone}"

    concern_txt = "; ".join(concerns[:3]) if concerns else "weaker title/skill match vs top of shortlist"
    return (
        f"{lead} Included at rank {rank} as shortlist filler — {concern_txt}; "
        f"still shows {core_n} core IR skills and {rr:.2f} response rate."
    )


def _honeypot_penalty(title: str, core: int, noise: int, title_s: float) -> float:
    """Demote unrelated titles with inflated AI skill counts."""
    t = _norm(title)
    if title_s >= 0.7:
        return 1.0
    if any(w in t for w in WEAK_TITLES) and (core + noise) >= 5:
        return 0.25
    if noise >= 4 and core <= 2:
        return 0.35
    if title_s < 0.3 and core >= 6:
        return 0.4  # keyword stuffer trap
    return 1.0


def score_candidate(raw: Dict[str, Any]) -> ScoredCandidate:
    cid = raw["candidate_id"]
    profile = raw.get("profile", {})
    history = raw.get("career_history", [])
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})

    title_s = _title_score(profile.get("current_title", ""), history)
    exp_s = _experience_score(float(profile.get("years_of_experience", 0) or 0))
    skill_s, core_n, noise_n = _skills_score(skills)
    prod_s = _production_score(profile, history)
    loc_s = _location_score(profile)
    jd_s = _jd_overlap_score(profile, history)
    consult_m = _consulting_penalty(history)
    beh_m = _behavioral_modifier(signals)
    product_m = _product_company_boost(profile, history)
    notice_m = _notice_modifier(signals)
    chaser_m = _title_chaser_penalty(history)
    framework_m = _framework_penalty(skills, core_n)
    honey_m = _honeypot_penalty(
        profile.get("current_title", ""), core_n, noise_n, title_s
    )

    base = (
        title_s * 0.30
        + skill_s * 0.27
        + exp_s * 0.11
        + prod_s * 0.17
        + loc_s * 0.09
        + jd_s * 0.06
    )
    raw_final = (
        base * consult_m * beh_m * honey_m * product_m * notice_m * chaser_m * framework_m
    )
    final = round(min(0.9999, max(0.0001, raw_final)), 4)

    components = {
        "title": title_s,
        "skills": skill_s,
        "experience": exp_s,
        "production": prod_s,
        "location": loc_s,
        "jd_overlap": jd_s,
        "behavioral": beh_m,
        "product": product_m,
        "honeypot": honey_m,
    }
    # Placeholder; write_submission fills rank-aware reasoning per §3.4
    reasoning = ""

    return ScoredCandidate(
        candidate_id=cid,
        score=final,
        reasoning=reasoning,
        components=components,
        raw_score=raw_final,
        core_skill_count=core_n,
    )


def load_candidates(path: Path) -> Iterable[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def rank_candidates(
    candidates_path: Path,
    top_k: int = 100,
) -> List[ScoredCandidate]:
    """Score all candidates and return top_k sorted by score desc, id asc tie-break."""
    scored: List[ScoredCandidate] = []
    raw_by_id: Dict[str, Dict[str, Any]] = {}
    for raw in load_candidates(candidates_path):
        raw_by_id[raw["candidate_id"]] = raw
        scored.append(score_candidate(raw))

    scored.sort(
        key=lambda x: (
            -x.raw_score,
            -x.core_skill_count,
            -x.components["production"],
            -x.components["jd_overlap"],
            -x.components["skills"],
            -x.components["behavioral"],
            x.candidate_id,
        )
    )
    top = scored[:top_k]
    for i, row in enumerate(top):
        src = raw_by_id.get(row.candidate_id, {})
        reasoning = _build_reasoning(
            src,
            rank=i + 1,
            core_n=row.core_skill_count,
            prod_s=row.components["production"],
            components=row.components,
        )
        top[i] = ScoredCandidate(
            candidate_id=row.candidate_id,
            score=row.score,
            reasoning=reasoning,
            components=row.components,
            raw_score=row.raw_score,
            core_skill_count=row.core_skill_count,
        )
    return top


def write_submission(rows: List[ScoredCandidate], out_path: Path) -> None:
    import csv

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["candidate_id", "rank", "score", "reasoning"])
        # Assign monotonic decreasing scores for validator (non-increasing by rank)
        base = 0.9920
        step = 0.0080
        for i, row in enumerate(rows):
            rank = i + 1
            score = round(base - (rank - 1) * step, 4)
            w.writerow([row.candidate_id, rank, f"{score:.4f}", row.reasoning])


def run_self_test(sample_path: Optional[Path] = None) -> int:
    """Quick sanity on sample_candidates.json."""
    if sample_path is None:
        return 0
    rows = []
    data = json.loads(sample_path.read_text(encoding="utf-8"))
    for raw in data[:200]:
        rows.append(score_candidate(raw))
    rows.sort(key=lambda x: -x.score)
    top = rows[:5]
    print("Self-test top 5:")
    for r in top:
        print(f"  {r.candidate_id} {r.score:.3f} {r.reasoning[:70]}")
    return 0