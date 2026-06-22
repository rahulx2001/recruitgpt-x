"""Career semantic matching — plain-language Tier-5 retrieval, CPU-only, no API."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any, Dict, List, Tuple

from challenge.jd_config import CAREER_JD_WEIGHTS, JD_DOCUMENT
from challenge.text_match import norm_text, phrase_in_text

# Plain-language patterns the JD says judges care about (no keyword stuffing required)
_CAREER_REGEX: Tuple[Tuple[re.Pattern[str], float], ...] = tuple(
    (
        re.compile(p, re.IGNORECASE),
        w,
    )
    for p, w in (
        (r"built.{0,40}(recommend|ranking|retrieval|search)", 0.22),
        (r"shipped.{0,40}(embed|vector|retriev|rank)", 0.20),
        (r"deployed.{0,30}(model|system|pipeline|index)", 0.18),
        (r"(offline|online).{0,20}(a/?b|experiment)", 0.15),
        (r"(ndcg|mrr|map).{0,25}(improv|metric|evaluat)", 0.18),
        (r"hybrid.{0,15}(search|retriev)", 0.16),
        (r"product.{0,20}(company|team|users)", 0.12),
        (r"recruiter.{0,20}(search|match|rank)", 0.14),
    )
)


def _career_blob(history: List[Dict[str, Any]]) -> str:
    return norm_text(" ".join(h.get("description", "") for h in history))


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


def _tf(text: str) -> Counter[str]:
    tokens = re.findall(r"[a-z0-9]{3,}", norm_text(text))
    return Counter(tokens)


def _cosine(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a[t] * b[t] for t in a if t in b)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


_JD_TF = _tf(JD_DOCUMENT)


def career_semantic_score(profile: Dict[str, Any], history: List[Dict[str, Any]]) -> float:
    """
    Lightweight semantic layer:
    - Regex patterns for plain-language achievements (Tier-5 defense)
    - TF cosine similarity between career text and JD document
    - Weighted phrase hits in career descriptions only
    """
    career = _career_blob(history)
    full = _profile_blob(profile, history)
    if not career and not full:
        return 0.0

    pattern_score = 0.0
    target = career or full
    for pat, weight in _CAREER_REGEX:
        if pat.search(target):
            pattern_score += weight

    phrase_score = 0.0
    for phrase, weight in CAREER_JD_WEIGHTS.items():
        if phrase_in_text(phrase, career):
            phrase_score += weight

    tf_score = _cosine(_tf(career), _JD_TF) * 2.5

    combined = pattern_score + phrase_score + tf_score
    return min(1.0, combined / 1.8)