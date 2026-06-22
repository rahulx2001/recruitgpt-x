"""Verified skill assessments — IR-relevant scores only."""

from __future__ import annotations

from typing import Any, Dict, List

from challenge.jd_config import CORE_SKILL_PHRASES, SECONDARY_SKILL_PHRASES
from challenge.text_match import norm_skill, phrase_in_tokens, split_phrases, tokenize

_CORE_S, _CORE_M = split_phrases(CORE_SKILL_PHRASES)
_SEC_S, _SEC_M = split_phrases(SECONDARY_SKILL_PHRASES)


def _skill_is_ir(name: str) -> bool:
    n = norm_skill(name)
    tokens = tokenize(n)
    if any(phrase_in_tokens(p, tokens, n) for p in _CORE_S):
        return True
    if any(phrase_in_tokens(p, tokens, n) for p in _SEC_S):
        return True
    for p in _CORE_M + _SEC_M:
        if phrase_in_tokens(p, tokens, n):
            return True
    return False


def _ir_assessment_values(scores: Dict[str, float]) -> list[float]:
    out: list[float] = []
    for name, val in scores.items():
        if _skill_is_ir(name):
            try:
                out.append(float(val))
            except (TypeError, ValueError):
                pass
    return out


def _ir_vals_from_signals(signals: Dict[str, Any]) -> list[float]:
    scores: Dict[str, float] = signals.get("skill_assessment_scores") or {}
    return _ir_assessment_values(scores) if scores else []


def assessment_score(
    signals: Dict[str, Any],
    skills: List[Dict[str, Any]],
    ir_vals: list[float] | None = None,
) -> float:
    vals = ir_vals if ir_vals is not None else _ir_vals_from_signals(signals)
    if not vals:
        return 0.45
    return min(1.0, sum(vals) / len(vals) / 100.0)


def assessment_boost(
    signals: Dict[str, Any],
    skills: List[Dict[str, Any]],
    ir_vals: list[float] | None = None,
) -> float:
    vals = ir_vals if ir_vals is not None else _ir_vals_from_signals(signals)
    if not vals:
        return 1.0
    s = assessment_score(signals, skills, vals)
    if s >= 0.85:
        return 1.08
    if s >= 0.70:
        return 1.04
    if s < 0.35:
        return 0.92
    return 1.0


def assessment_penalty(
    signals: Dict[str, Any],
    skills: List[Dict[str, Any]],
    ir_vals: list[float] | None = None,
) -> float:
    scores: Dict[str, float] = signals.get("skill_assessment_scores") or {}
    if not scores:
        return 1.0
    expert_unverified = 0
    for sk in skills:
        if (sk.get("proficiency") or "").lower() != "expert":
            continue
        name = sk.get("name", "")
        if not _skill_is_ir(name):
            continue
        match = next((v for k, v in scores.items() if _skill_is_ir(k) and name.lower() in k.lower()), None)
        if match is None or float(match) < 50:
            expert_unverified += 1
    if expert_unverified >= 3:
        return 0.82
    if expert_unverified >= 1:
        return 0.92
    return 1.0


def top_ir_assessments(signals: Dict[str, Any], limit: int = 2) -> list[tuple[str, float]]:
    scores: Dict[str, float] = signals.get("skill_assessment_scores") or {}
    ir = [(k, float(v)) for k, v in scores.items() if _skill_is_ir(k)]
    ir.sort(key=lambda x: -x[1])
    return ir[:limit]