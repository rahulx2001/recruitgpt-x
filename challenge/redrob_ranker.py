"""Offline hybrid ranker v3 — trap-aware, availability-weighted, calibrated scores."""

from __future__ import annotations

import heapq
import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple

from challenge.assessment import assessment_boost, assessment_penalty, assessment_score
from challenge.availability import availability_modifier, availability_score
from challenge.honeypot import honeypot_penalty, honeypot_risk, is_structural_honeypot
from challenge.jd_config import (
    CAREER_JD_WEIGHTS,
    CONSULTING_FIRMS,
    CORE_SKILL_PHRASES,
    CV_SPEECH_ROBOTICS,
    EXP_IDEAL_HI,
    EXP_IDEAL_LO,
    EXP_MAX,
    EXP_MIN,
    FAANG_CURRENT_PENALTY,
    FRAMEWORK_NOISE,
    GOOD_TITLES,
    HONEYPOT_SKILL_NOISE,
    INDIA_LOCATIONS,
    JD_OVERLAP_PHRASES,
    PREFERRED_LOCATIONS,
    PRODUCTION_SIGNAL_PHRASES,
    RESEARCH_ONLY_TITLES,
    SECONDARY_SKILL_PHRASES,
    STARTUP_BOOST_SIGNALS,
    STRONG_TITLES,
    WEAK_TITLES,
)
from challenge.semantic import career_semantic_score
from challenge.text_match import count_phrases, norm_skill, norm_text, phrase_in_text

_PROF_MAP = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}


@dataclass
class ScoredCandidate:
    candidate_id: str
    score: float
    reasoning: str
    components: Dict[str, float] = field(default_factory=dict)
    raw_score: float = 0.0
    core_skill_count: int = 0


def _skill_bucket(name: str) -> str:
    n = norm_skill(name)
    if any(phrase_in_text(p, n) for p in CORE_SKILL_PHRASES):
        return "core"
    if any(phrase_in_text(p, n) for p in SECONDARY_SKILL_PHRASES):
        return "secondary"
    if any(phrase_in_text(p, n) for p in HONEYPOT_SKILL_NOISE):
        return "noise"
    return "other"


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
) -> Tuple[float, int, int]:
    if not skills:
        return 0.08, 0, 0
    core = secondary = noise = 0
    quality = 0.0
    assess = signals.get("skill_assessment_scores") or {}

    for s in skills:
        name = s.get("name", "")
        bucket = _skill_bucket(name)
        prof = _PROF_MAP.get(norm_text(s.get("proficiency", "")), 2)
        endorse = int(s.get("endorsements", 0) or 0)
        months = int(s.get("duration_months", 0) or 0)
        verified = next((float(v) for k, v in assess.items() if phrase_in_text(name, k)), None)
        trust = min(1.0, 0.35 + min(endorse, 30) / 90 + min(months, 48) / 120)
        if verified is not None:
            trust = 0.55 * trust + 0.45 * (verified / 100.0)
        if prof >= 3 and months == 0:
            trust *= 0.35

        if bucket == "core":
            core += 1
            quality += (0.55 + prof * 0.1) * trust
        elif bucket == "secondary":
            secondary += 1
            quality += (0.22 + prof * 0.05) * trust
        elif bucket == "noise":
            noise += 1

    if core == 0 and secondary == 0:
        return 0.06, 0, noise

    raw = quality / max(1, core + secondary * 0.45)
    noise_penalty = max(0.30, 1.0 - noise * 0.09)
    return min(1.0, raw * noise_penalty), core, noise


def _profile_blob(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> str:
    return norm_text(
        " ".join(
            [
                profile.get("summary", ""),
                profile.get("headline", ""),
                *[h.get("description", "") for h in history],
            ]
        )
    )


def _jd_overlap_score(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    career = norm_text(" ".join(h.get("description", "") for h in history))
    hits = count_phrases(JD_OVERLAP_PHRASES, career)
    return min(1.0, hits / 7.0)


def _production_score(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    career = norm_text(" ".join(h.get("description", "") for h in history))
    hits = count_phrases(PRODUCTION_SIGNAL_PHRASES, career)
    return min(1.0, hits / 5.0)


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


def _research_penalty(profile: Dict[str, Any], history: List[Dict[str, Any]], prod_s: float) -> float:
    titles = [norm_text(profile.get("current_title", ""))]
    titles.extend(norm_text(h.get("title", "")) for h in history[:3])
    research = any(any(r in t for r in RESEARCH_ONLY_TITLES) for t in titles)
    blob = _profile_blob(profile, history)
    research_lang = count_phrases(("published", "paper", "academic", "phd", "thesis"), blob) >= 2
    if (research or research_lang) and prod_s < 0.45:
        return 0.55
    if research and prod_s < 0.65:
        return 0.78
    return 1.0


def _cv_speech_penalty(skills: List[Dict[str, Any]], core_n: int) -> float:
    cv = sum(1 for s in skills if any(phrase_in_text(p, s.get("name", "")) for p in CV_SPEECH_ROBOTICS))
    if cv >= 2 and core_n <= 2:
        return 0.60
    if cv >= 3 and core_n <= 3:
        return 0.75
    return 1.0


def _framework_penalty(skills: List[Dict[str, Any]], core_n: int, history: List[Dict[str, Any]]) -> float:
    fw = sum(1 for s in skills if any(phrase_in_text(n, s.get("name", "")) for n in FRAMEWORK_NOISE))
    blob = _profile_blob({}, history)
    fw_lang = count_phrases(FRAMEWORK_NOISE, blob)
    if (fw >= 2 or fw_lang >= 2) and core_n <= 2:
        return 0.75
    if fw >= 3:
        return 0.85
    return 1.0


def _weak_title_penalty(title: str, core_n: int, noise_n: int) -> float:
    t = norm_text(title)
    if any(w in t for w in WEAK_TITLES):
        return 0.12 if (core_n + noise_n) >= 4 else 0.25
    if noise_n >= 5 and core_n <= 2:
        return 0.30
    return 1.0


def _engagement_score(signals: Dict[str, Any]) -> float:
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    saved = int(signals.get("saved_by_recruiters_30d", 0) or 0)
    icr = float(signals.get("interview_completion_rate", 0) or 0)
    return min(1.0, 0.5 * min(1.0, rr * 1.1) + 0.3 * min(1.0, saved / 8) + 0.2 * icr)


def _career_highlight(history: List[Dict[str, Any]], limit: int = 90) -> str:
    for role in history[:2]:
        desc = (role.get("description") or "").strip()
        if len(desc) > 30:
            snippet = desc[:limit].rsplit(" ", 1)[0] + "…" if len(desc) > limit else desc
            return f"{role.get('title', 'Role')} @ {role.get('company', '?')}: {snippet}"
    return ""


def _build_reasoning(
    raw: Dict[str, Any],
    *,
    rank: int,
    core_n: int,
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
    assess = signals.get("skill_assessment_scores") or {}

    core_names = [s.get("name", "") for s in skills if _skill_bucket(s.get("name", "")) == "core"][:3]
    skill_txt = ", ".join(core_names) if core_names else "no verified core IR stack in skills list"

    strengths: List[str] = []
    if components.get("career_semantic", 0) >= 0.55:
        strengths.append("career history describes shipped retrieval/ranking work in plain language")
    if core_n >= 4:
        strengths.append(f"{core_n} core IR skills ({skill_txt})")
    elif core_names:
        strengths.append(f"core skills: {skill_txt}")
    if components.get("assessment", 0) >= 0.7:
        top_a = sorted(assess.items(), key=lambda x: -float(x[1]))[:2]
        strengths.append(
            "verified assessments: " + ", ".join(f"{k} {v:.0f}" for k, v in top_a)
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
    if core_n < 3:
        concerns.append("thin core IR skill depth")
    if components.get("faang", 1.0) < 1.0:
        concerns.append(f"currently at {company} — JD flags big-tech ladder seekers")
    if components.get("research", 1.0) < 0.8:
        concerns.append("research-heavy without strong production signals")

    highlight = _career_highlight(history)
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

    extra = f" Career note: {highlight}." if highlight else ""
    return f"{lead} {why}{concern_txt}{extra}"


def score_candidate(raw: Dict[str, Any]) -> ScoredCandidate:
    cid = raw["candidate_id"]
    profile = raw.get("profile", {})
    history = raw.get("career_history", [])
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})

    title_s = _title_score(profile.get("current_title", ""), history)
    exp_s = _experience_score(float(profile.get("years_of_experience", 0) or 0), history)
    skill_s, core_n, noise_n = _skills_score(skills, signals)
    prod_s = _production_score(profile, history)
    loc_s = _location_score(profile)
    jd_s = _jd_overlap_score(profile, history)
    sem_s = career_semantic_score(profile, history)
    avail_s = availability_score(signals)
    assess_s = assessment_score(signals, skills)
    engage_s = _engagement_score(signals)
    hp_risk = honeypot_risk(raw)

    base = (
        0.17 * title_s
        + 0.16 * skill_s
        + 0.15 * sem_s
        + 0.11 * prod_s
        + 0.10 * assess_s
        + 0.10 * avail_s
        + 0.06 * jd_s
        + 0.05 * exp_s
        + 0.04 * loc_s
        + 0.06 * engage_s
    )

    modifiers = (
        honeypot_penalty(raw)
        * _consulting_penalty(history)
        * availability_modifier(signals)
        * assessment_boost(signals, skills)
        * assessment_penalty(signals, skills)
        * _faang_current_modifier(profile)
        * _startup_boost(profile, history)
        * _research_penalty(profile, history, prod_s)
        * _cv_speech_penalty(skills, core_n)
        * _framework_penalty(skills, core_n, history)
        * _weak_title_penalty(profile.get("current_title", ""), core_n, noise_n)
    )

    raw_final = base * modifiers

    components = {
        "title": title_s,
        "skills": skill_s,
        "career_semantic": sem_s,
        "production": prod_s,
        "assessment": assess_s,
        "availability": avail_s,
        "jd_overlap": jd_s,
        "experience": exp_s,
        "location": loc_s,
        "engagement": engage_s,
        "honeypot_risk": hp_risk,
        "honeypot": honeypot_penalty(raw),
        "faang": _faang_current_modifier(profile),
        "research": _research_penalty(profile, history, prod_s),
    }

    return ScoredCandidate(
        candidate_id=cid,
        score=raw_final,
        reasoning="",
        components=components,
        raw_score=raw_final,
        core_skill_count=core_n,
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
    """Two-pass: score all, keep top-K via min-heap of raw_score (evict lowest)."""
    heap: list[Tuple[float, str, ScoredCandidate]] = []
    for raw in load_candidates(candidates_path):
        sc = score_candidate(raw)
        entry = (sc.raw_score, sc.candidate_id, sc)
        if len(heap) < top_k:
            heapq.heappush(heap, entry)
        elif sc.raw_score > heap[0][0]:
            heapq.heapreplace(heap, entry)

    finalists = sorted((x[2] for x in heap), key=_sort_key)
    finalist_ids = {f.candidate_id for f in finalists}

    raw_cache: Dict[str, Dict[str, Any]] = {}
    for raw in load_candidates(candidates_path):
        cid = raw["candidate_id"]
        if cid in finalist_ids:
            raw_cache[cid] = raw
        if len(raw_cache) == len(finalist_ids):
            break

    calibrated = _calibrate_scores([f.raw_score for f in finalists])
    out: List[ScoredCandidate] = []
    for i, row in enumerate(finalists):
        src = raw_cache.get(row.candidate_id, {})
        cal = calibrated[i]
        reasoning = _build_reasoning(
            src,
            rank=i + 1,
            core_n=row.core_skill_count,
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
    """
    Map model scores → monotonic [0.99, 0.20] preserving real separation.
    Uses actual relevance, not a fake linear ramp.
    """
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
    for i in range(1, len(out)):
        if out[i] >= out[i - 1]:
            out[i] = round(out[i - 1] - 0.0001, 4)
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