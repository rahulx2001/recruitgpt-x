"""Detect recycled career-description templates across the candidate pool."""

from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List

from challenge.text_match import norm_text

_MIN_FINGERPRINT_LEN = 40
_FINGERPRINT_CHARS = 96


def blurb_fingerprint(description: str) -> str:
    """Normalized prefix used to spot shared synthetic career blurbs."""
    text = norm_text(description or "")
    if len(text) < _MIN_FINGERPRINT_LEN:
        return ""
    return text[:_FINGERPRINT_CHARS].strip()


def build_career_blurb_counts(candidates: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for raw in candidates:
        for role in raw.get("career_history", []) or []:
            fp = blurb_fingerprint(role.get("description", ""))
            if fp:
                counts[fp] = counts.get(fp, 0) + 1
    return counts


def build_career_blurb_counts_from_path(path) -> Dict[str, int]:
    with open(path, "r", encoding="utf-8") as f:
        rows = (json.loads(line) for line in f if line.strip())
        return build_career_blurb_counts(rows)


def template_blurb_modifier(
    history: List[Dict[str, Any]],
    blurb_counts: Dict[str, int] | None,
) -> float:
    """
    Penalize candidates whose career text is copied from high-frequency templates.
    Dataset traps include identical ranking/RAG blurbs across unrelated profiles.
    """
    if not blurb_counts or not history:
        return 1.0

    worst = 1.0
    for role in history[:3]:
        fp = blurb_fingerprint(role.get("description", ""))
        if not fp:
            continue
        n = blurb_counts.get(fp, 1)
        if n >= 800:
            worst = min(worst, 0.62)
        elif n >= 400:
            worst = min(worst, 0.72)
        elif n >= 200:
            worst = min(worst, 0.80)
        elif n >= 100:
            worst = min(worst, 0.88)
        elif n >= 50:
            worst = min(worst, 0.94)
        elif n >= 25:
            worst = min(worst, 0.97)
    return worst