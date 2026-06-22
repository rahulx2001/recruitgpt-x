"""Verified skill assessments — objective evidence over self-reported proficiency."""

from __future__ import annotations

from typing import Any, Dict, List

from challenge.jd_config import CORE_SKILL_PHRASES, SECONDARY_SKILL_PHRASES
from challenge.text_match import norm_skill, phrase_in_text


def _skill_is_ir(name: str) -> bool:
    n = norm_skill(name)
    return any(phrase_in_text(p, n) for p in CORE_SKILL_PHRASES) or any(
        phrase_in_text(p, n) for p in SECONDARY_SKILL_PHRASES
    )


def assessment_score(signals: Dict[str, Any], skills: List[Dict[str, Any]]) -> float:
    """
    Normalized 0–1 from skill_assessment_scores.
    Prioritizes IR/retrieval assessments; neutral 0.45 if none taken.
    """
    scores: Dict[str, float] = signals.get("skill_assessment_scores") or {}
    if not scores:
        return 0.45

    ir_vals: list[float] = []
    all_vals: list[float] = []
    for name, val in scores.items():
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        all_vals.append(v)
        if _skill_is_ir(name):
            ir_vals.append(v)

    chosen = ir_vals if ir_vals else all_vals
    if not chosen:
        return 0.45
    return min(1.0, sum(chosen) / len(chosen) / 100.0)


def assessment_boost(signals: Dict[str, Any], skills: List[Dict[str, Any]]) -> float:
    """Multiplier: high verified IR skill scores lift trust."""
    s = assessment_score(signals, skills)
    if s >= 0.85:
        return 1.08
    if s >= 0.70:
        return 1.04
    if s < 0.35:
        return 0.92
    return 1.0


def assessment_penalty(signals: Dict[str, Any], skills: List[Dict[str, Any]]) -> float:
    """Penalize high self-reported skills with poor/no assessments."""
    scores: Dict[str, float] = signals.get("skill_assessment_scores") or {}
    if not scores:
        return 1.0

    expert_unverified = 0
    for sk in skills:
        if (sk.get("proficiency") or "").lower() != "expert":
            continue
        name = sk.get("name", "")
        if _skill_is_ir(name):
            match = next((v for k, v in scores.items() if phrase_in_text(name, k)), None)
            if match is None or float(match) < 50:
                expert_unverified += 1

    if expert_unverified >= 3:
        return 0.82
    if expert_unverified >= 1:
        return 0.92
    return 1.0