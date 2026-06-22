"""Honeypot detection — structural traps, not title-keyword matching."""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List

from challenge.text_match import norm_text

_REFERENCE_DATE = date(2026, 6, 22)


def _parse_date(value: str | None) -> date | None:
    if not value or len(value) < 10:
        return None
    try:
        return date(int(value[0:4]), int(value[5:7]), int(value[8:10]))
    except ValueError:
        return None


def _career_span_years(history: List[Dict[str, Any]]) -> float:
    if not history:
        return 0.0
    starts: list[date] = []
    ends: list[date] = []
    for role in history:
        start = _parse_date(role.get("start_date"))
        if not start:
            continue
        starts.append(start)
        end = _parse_date(role.get("end_date")) if role.get("end_date") else _REFERENCE_DATE
        ends.append(end or _REFERENCE_DATE)
    if not starts:
        return 0.0
    earliest = min(starts)
    latest = max(ends)
    return max(0.0, (latest - earliest).days / 365.25)


def honeypot_risk(raw: Dict[str, Any]) -> float:
    """
    Returns 0.0 (clean) → 1.0 (certain trap).

    Rules:
    1. Expert skills with zero months used (documented signature)
    2. Claimed YoE >> calendar span of career_history
    3. Overlapping roles exceeding plausible concurrent employment
    4. Expert skill stuffing with thin duration/endorsement mismatch
    5. Suspicious endorsement density on unverified skills
    """
    profile = raw.get("profile", {})
    skills: List[Dict[str, Any]] = raw.get("skills", [])
    history: List[Dict[str, Any]] = raw.get("career_history", [])
    risk = 0.0

    # Rule 1 — expert @ 0 months
    expert_zero = [
        s
        for s in skills
        if (s.get("proficiency") or "").lower() == "expert"
        and int(s.get("duration_months", 0) or 0) == 0
    ]
    if len(expert_zero) >= 6:
        risk = max(risk, 0.95)
    elif len(expert_zero) >= 4:
        risk = max(risk, 0.80)
    elif len(expert_zero) >= 2:
        risk = max(risk, 0.50)

    # Rule 2 — impossible tenure vs career span
    claimed = float(profile.get("years_of_experience", 0) or 0)
    span = _career_span_years(history)
    if span > 0 and claimed > span * 1.25 + 1.5:
        gap = claimed - span
        risk = max(risk, min(0.98, 0.55 + gap * 0.06))

    # Rule 3 — overlapping roles (sum durations >> span)
    if history:
        total_months = sum(int(h.get("duration_months", 0) or 0) for h in history)
        span_months = max(1.0, span * 12)
        if total_months > span_months * 1.6 and span > 2:
            risk = max(risk, 0.6)

    # Rule 4 — skill stuffing: many expert/advanced, low average duration
    expert_adv = [
        s for s in skills if (s.get("proficiency") or "").lower() in ("expert", "advanced")
    ]
    if len(expert_adv) >= 10:
        avg_dur = sum(int(s.get("duration_months", 0) or 0) for s in expert_adv) / len(expert_adv)
        if avg_dur < 8:
            risk = max(risk, 0.75)

    # Rule 5 — high endorsements + zero duration on same skill
    for s in skills:
        endorse = int(s.get("endorsements", 0) or 0)
        months = int(s.get("duration_months", 0) or 0)
        prof = (s.get("proficiency") or "").lower()
        if endorse >= 25 and months == 0 and prof in ("expert", "advanced"):
            risk = max(risk, 0.65)

    # Rule 6 — date contradictions (end before start)
    for role in history:
        start = _parse_date(role.get("start_date"))
        end = _parse_date(role.get("end_date"))
        if start and end and end < start:
            risk = max(risk, 0.8)

    return min(1.0, risk)


def risk_to_penalty(risk: float) -> float:
    """Map honeypot_risk → multiplicative demotion (compute once per candidate)."""
    if risk >= 0.9:
        return 0.02
    if risk >= 0.75:
        return 0.08
    if risk >= 0.55:
        return 0.22
    if risk >= 0.35:
        return 0.45
    if risk >= 0.2:
        return 0.72
    return max(0.85, 1.0 - risk * 0.35)


def honeypot_penalty(raw: Dict[str, Any]) -> float:
    return risk_to_penalty(honeypot_risk(raw))


def is_structural_honeypot(raw: Dict[str, Any], threshold: float = 0.55) -> bool:
    return honeypot_risk(raw) >= threshold