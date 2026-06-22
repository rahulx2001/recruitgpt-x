"""Cross-encoder re-rank for top pool — graceful fallback when model unavailable."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from challenge.embeddings import candidate_text
from challenge.jd_config import JOB_COMPANY, JOB_TITLE
from challenge.text_match import norm_text

_CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_JD_QUERY = norm_text(
    f"{JOB_TITLE} at {JOB_COMPANY}. "
    "Senior AI engineer founding team embeddings retrieval ranking hybrid search "
    "vector database production deployed users evaluation ndcg learning to rank "
    "recommendation systems sentence transformers product company shipper."
)

_model = None
_model_available: Optional[bool] = None


def _get_model():
    global _model, _model_available
    if _model_available is False:
        return None
    if _model is not None:
        return _model
    try:
        from sentence_transformers import CrossEncoder

        _model = CrossEncoder(_CROSS_ENCODER_MODEL)
        _model_available = True
        return _model
    except Exception:
        _model_available = False
        return None


def cross_encoder_available() -> bool:
    return _get_model() is not None


def rerank_scores(raws: Sequence[Dict[str, Any]], batch_size: int = 32) -> Optional[List[float]]:
    """
    Score (JD, candidate career text) pairs. Returns normalized [0,1] scores or None.
    """
    model = _get_model()
    if model is None or not raws:
        return None
    pairs = []
    for raw in raws:
        profile = raw.get("profile", {})
        history = raw.get("career_history", [])
        pairs.append((_JD_QUERY, candidate_text(profile, history)))

    try:
        raw_scores = model.predict(pairs, batch_size=batch_size, show_progress_bar=False)
        scores = [float(s) for s in raw_scores]
        lo = min(scores)
        hi = max(scores)
        span = hi - lo if hi > lo else 1.0
        return [max(0.0, min(1.0, (s - lo) / span)) for s in scores]
    except Exception:
        return None


def blend_stage1_cross_encoder(
    stage1: float,
    cross: Optional[float],
    *,
    alpha: float = 0.62,
) -> float:
    if cross is None:
        return stage1
    return alpha * stage1 + (1.0 - alpha) * cross