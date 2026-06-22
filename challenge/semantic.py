"""Career semantic matching — plain-language Tier-5, CPU-only."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import FrozenSet, Tuple

from challenge.jd_config import CAREER_JD_WEIGHTS, JD_DOCUMENT
from challenge.text_match import norm_text, split_phrases, tokenize

_CAREER_REGEX: Tuple[Tuple[re.Pattern[str], float], ...] = tuple(
    (re.compile(p, re.I), w)
    for p, w in (
        (r"built.{0,40}(recommend|ranking|retrieval|search)", 0.22),
        (r"shipped.{0,40}(embed|vector|retriev|rank)", 0.20),
        (r"deployed.{0,30}(model|system|pipeline|index)", 0.18),
        (r"(offline|online).{0,20}(a/?b|experiment)", 0.15),
        (r"(ndcg|mrr).{0,25}(improv|metric|evaluat)", 0.18),
        (r"hybrid.{0,15}(search|retriev)", 0.16),
        (r"product.{0,20}(company|team|users)", 0.12),
        (r"recruiter.{0,20}(search|match|rank)", 0.14),
    )
)

_JD_TF = Counter(re.findall(r"[a-z0-9]{3,}", norm_text(JD_DOCUMENT)))
_CAREER_JD_S, _CAREER_JD_M = split_phrases(tuple(CAREER_JD_WEIGHTS.keys()))


def _cosine(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a[t] * b[t] for t in a if t in b)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _phrase_weighted_hits(career_blob: str, tokens: FrozenSet[str]) -> float:
    score = 0.0
    for phrase, w in CAREER_JD_WEIGHTS.items():
        if phrase in _CAREER_JD_S:
            if phrase in tokens:
                score += w
        elif phrase in career_blob:
            score += w
    return score


def jd_tfidf_similarity(career_tf: Counter[str]) -> float:
    """Offline proxy for bi-encoder JD cosine when embeddings.npy is absent.

    Uses the same token space as career_semantic TF scoring, mapped to [0, 1]
    like EmbeddingStore.cosine_vs_jd. Keeps fresh-clone reproduction within
    one candidate of the artifact path on top-10 (tested: 10/10 set @ top-10).
    """
    cos = _cosine(career_tf, _JD_TF)
    return max(0.0, min(1.0, (cos + 1.0) / 2.0))


def career_semantic_from_blobs(
    career_blob: str,
    career_tf: Counter[str],
    career_tokens: FrozenSet[str] | None = None,
) -> float:
    if not career_blob:
        return 0.0
    tokens = career_tokens if career_tokens is not None else tokenize(career_blob)
    pattern_score = sum(w for pat, w in _CAREER_REGEX if pat.search(career_blob))
    phrase_score = _phrase_weighted_hits(career_blob, tokens)
    tf_score = _cosine(career_tf, _JD_TF) * 2.5
    return min(1.0, (pattern_score + phrase_score + tf_score) / 1.8)