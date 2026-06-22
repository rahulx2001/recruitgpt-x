"""Offline eval harness — proxy expert labels, NDCG/MAP/P@k, weight ablation."""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from challenge.features import build_index, cv_language_hits, production_score, semantic_score
from challenge.honeypot import honeypot_risk, is_structural_honeypot
from challenge.jd_config import EXP_IDEAL_HI, EXP_IDEAL_LO, EXP_MIN, GOOD_TITLES, STRONG_TITLES, WEAK_TITLES
from challenge.redrob_ranker import DEFAULT_WEIGHTS, _skills_score, _title_score, load_candidates, score_candidate
from challenge.text_match import norm_text

# Alternate weight presets for ablation (sum ≈ 1.0)
WEIGHT_PRESETS: Dict[str, Dict[str, float]] = {
    "current": dict(DEFAULT_WEIGHTS),
    "semantic_heavy": {
        "title": 0.14,
        "skills": 0.14,
        "career_semantic": 0.22,
        "production": 0.12,
        "assessment": 0.10,
        "availability": 0.10,
        "jd_overlap": 0.06,
        "experience": 0.05,
        "location": 0.03,
        "engagement": 0.04,
    },
    "title_heavy": {
        "title": 0.24,
        "skills": 0.18,
        "career_semantic": 0.12,
        "production": 0.10,
        "assessment": 0.08,
        "availability": 0.10,
        "jd_overlap": 0.06,
        "experience": 0.05,
        "location": 0.03,
        "engagement": 0.04,
    },
    "availability_heavy": {
        "title": 0.14,
        "skills": 0.14,
        "career_semantic": 0.13,
        "production": 0.10,
        "assessment": 0.08,
        "availability": 0.18,
        "jd_overlap": 0.06,
        "experience": 0.05,
        "location": 0.04,
        "engagement": 0.08,
    },
    "uniform": {k: 0.10 for k in DEFAULT_WEIGHTS},
}


@dataclass
class EvalMetrics:
    ndcg_10: float
    ndcg_50: float
    map_score: float
    precision_10: float
    n_candidates: int
    n_relevant: int


def proxy_relevance(raw: Dict[str, Any]) -> float:
    """
    JD-aligned expert proxy label in [0, 1]. Independent of ranker weights.
    Used for offline calibration — not challenge ground truth.
    """
    if is_structural_honeypot(raw):
        return 0.0

    profile = raw.get("profile", {})
    history = raw.get("career_history", [])
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})
    title = norm_text(profile.get("current_title", ""))

    if any(w in title for w in WEAK_TITLES):
        return 0.05

    idx = build_index(profile, history)
    title_s = _title_score(profile.get("current_title", ""), history)
    _, core_ir_n, noise_n, _ = _skills_score(skills, signals)
    sem_s = semantic_score(idx)
    prod_s = production_score(idx)
    yrs = float(profile.get("years_of_experience", 0) or 0)
    cv_hits = cv_language_hits(idx)
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    otw = bool(signals.get("open_to_work_flag", False))

    grade = 0.0

    if any(s in title for s in STRONG_TITLES):
        grade += 1.4
    elif any(g in title for g in GOOD_TITLES):
        grade += 0.9
    elif "engineer" in title or "scientist" in title:
        grade += 0.45
    else:
        grade += 0.15

    grade += min(1.2, core_ir_n * 0.22)
    grade += sem_s * 1.0
    grade += prod_s * 0.8

    if EXP_IDEAL_LO <= yrs <= EXP_IDEAL_HI:
        grade += 0.35
    elif yrs >= EXP_MIN:
        grade += 0.15
    else:
        grade *= 0.6

    if otw:
        grade += 0.12
    if rr >= 0.5:
        grade += 0.08

    if cv_hits >= 2 and core_ir_n <= 2:
        grade *= 0.25
    elif cv_hits >= 1 and core_ir_n <= 1:
        grade *= 0.4

    if "junior" in title and cv_hits >= 1:
        grade *= 0.35

    if noise_n >= 5 and core_ir_n <= 2:
        grade *= 0.5

    if honeypot_risk(raw) >= 0.35:
        grade *= 0.3

    if title_s >= 1.0:
        grade += 0.25

    return round(min(1.0, grade / 4.0), 4)


def _dcg(rels: Sequence[float], k: int) -> float:
    return sum(rel / math.log2(i + 2) for i, rel in enumerate(rels[:k]))


def ndcg_at_k(ranked_rels: Sequence[float], k: int) -> float:
    if not ranked_rels:
        return 0.0
    dcg = _dcg(ranked_rels, k)
    ideal = _dcg(sorted(ranked_rels, reverse=True), k)
    return dcg / ideal if ideal > 0 else 0.0


def average_precision(ranked_rels: Sequence[float], threshold: float = 0.5) -> float:
    hits = 0
    sum_prec = 0.0
    for i, rel in enumerate(ranked_rels, 1):
        if rel >= threshold:
            hits += 1
            sum_prec += hits / i
    if hits == 0:
        return 0.0
    return sum_prec / hits


def precision_at_k(ranked_rels: Sequence[float], k: int, threshold: float = 0.5) -> float:
    if k <= 0:
        return 0.0
    return sum(1 for r in ranked_rels[:k] if r >= threshold) / k


def iter_holdout(
    candidates_path: Path,
    *,
    sample_rate: float = 0.05,
    seed: int = 42,
    max_n: int = 5000,
) -> Iterable[Dict[str, Any]]:
    """Deterministic hash holdout — ~5% of pool without loading all into RAM."""
    mod = max(1, int(1 / sample_rate))
    n = 0
    for raw in load_candidates(candidates_path):
        cid = raw["candidate_id"]
        bucket = int(hashlib.md5(f"{seed}:{cid}".encode()).hexdigest(), 16) % mod
        if bucket == 0:
            yield raw
            n += 1
            if n >= max_n:
                break


def rank_pool(
    rows: Sequence[Dict[str, Any]],
    weights: Dict[str, float] | None = None,
) -> List[Tuple[str, float]]:
    scored = [(r["candidate_id"], score_candidate(r, weights=weights).raw_score) for r in rows]
    scored.sort(key=lambda x: (-x[1], x[0]))
    return scored


def evaluate_ranking(
    ranked_ids: Sequence[str],
    relevance: Dict[str, float],
    *,
    relevant_threshold: float = 0.5,
) -> EvalMetrics:
    rels = [relevance[cid] for cid in ranked_ids]
    n_rel = sum(1 for v in relevance.values() if v >= relevant_threshold)
    return EvalMetrics(
        ndcg_10=round(ndcg_at_k(rels, 10), 4),
        ndcg_50=round(ndcg_at_k(rels, 50), 4),
        map_score=round(average_precision(rels, relevant_threshold), 4),
        precision_10=round(precision_at_k(rels, 10, relevant_threshold), 4),
        n_candidates=len(relevance),
        n_relevant=n_rel,
    )


def run_holdout_eval(
    candidates_path: Path,
    *,
    sample_rate: float = 0.05,
    seed: int = 42,
    max_n: int = 5000,
    top_k: int = 100,
) -> Dict[str, Any]:
    pool = list(iter_holdout(candidates_path, sample_rate=sample_rate, seed=seed, max_n=max_n))
    relevance = {r["candidate_id"]: proxy_relevance(r) for r in pool}
    ranked = rank_pool(pool, weights=DEFAULT_WEIGHTS)
    ranked_ids = [cid for cid, _ in ranked[:top_k]]
    metrics = evaluate_ranking(ranked_ids, relevance)

    ablation: Dict[str, Dict[str, float]] = {}
    for name, preset in WEIGHT_PRESETS.items():
        ids = [cid for cid, _ in rank_pool(pool, weights=preset)[:top_k]]
        m = evaluate_ranking(ids, relevance)
        ablation[name] = {
            "ndcg_10": m.ndcg_10,
            "ndcg_50": m.ndcg_50,
            "map": m.map_score,
            "p_at_10": m.precision_10,
        }

    best = max(ablation.items(), key=lambda x: x[1]["ndcg_10"])
    return {
        "holdout": {
            "seed": seed,
            "sample_rate": sample_rate,
            "n_scored": len(pool),
            "n_relevant_proxy": metrics.n_relevant,
            "top_k": top_k,
        },
        "metrics_current_weights": {
            "ndcg_10": metrics.ndcg_10,
            "ndcg_50": metrics.ndcg_50,
            "map": metrics.map_score,
            "p_at_10": metrics.precision_10,
        },
        "weight_ablation": ablation,
        "best_preset_by_ndcg10": {"name": best[0], **best[1]},
        "weights_current": DEFAULT_WEIGHTS,
        "note": (
            "Proxy expert labels derived from JD rubric (honeypots, IR depth, production, "
            "availability). Used for offline weight justification — not challenge hidden labels."
        ),
    }


def write_eval_report(path: Path, report: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")