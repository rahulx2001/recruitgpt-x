"""Offline eval harness — independent JD rubric labels, NDCG/MAP, weight ablation."""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from challenge.honeypot import is_structural_honeypot
from challenge.jd_config import (
    CORE_SKILL_PHRASES,
    CV_SPEECH_ROBOTICS,
    EXP_IDEAL_HI,
    EXP_IDEAL_LO,
    EXP_MIN,
    GENERAL_ML_SKILLS,
    GOOD_TITLES,
    JD_OVERLAP_PHRASES,
    PRODUCTION_SIGNAL_PHRASES,
    RESEARCH_ONLY_TITLES,
    STRONG_TITLES,
    WEAK_TITLES,
)
from challenge.redrob_ranker import DEFAULT_WEIGHTS, load_candidates, score_candidate
from challenge.text_match import count_phrases_fast, norm_skill, norm_text, split_phrases, tokenize

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

_CORE_S, _CORE_M = split_phrases(CORE_SKILL_PHRASES)
_JD_S, _JD_M = split_phrases(JD_OVERLAP_PHRASES)
_PROD_S, _PROD_M = split_phrases(PRODUCTION_SIGNAL_PHRASES)
_CV_S, _CV_M = split_phrases(CV_SPEECH_ROBOTICS)
_GENERAL_S = frozenset(GENERAL_ML_SKILLS)
_CV_REGEX = re.compile(
    r"computer vision|image moderation|object detection|speech recognition|robotics|autonomous driving",
    re.I,
)


@dataclass
class EvalMetrics:
    ndcg_10: float
    ndcg_50: float
    map_score: float
    precision_10: float
    n_candidates: int
    n_relevant: int


def _career_blob(history: List[Dict[str, Any]]) -> str:
    return norm_text(" ".join(h.get("description", "") for h in history))


def _independent_title_tier(title: str, history: List[Dict[str, Any]]) -> float:
    """Substring title tiers only — does not call ranker _title_score."""
    titles = [norm_text(title)] + [norm_text(h.get("title", "")) for h in history[:3]]
    best = 0.1
    for ti in titles:
        if any(w in ti for w in WEAK_TITLES):
            return 0.05
        if any(s in ti for s in STRONG_TITLES):
            best = max(best, 0.95)
        elif any(g in ti for g in GOOD_TITLES):
            best = max(best, 0.65)
        elif "engineer" in ti or "scientist" in ti:
            best = max(best, 0.35)
    return best


def _independent_ir_skill_count(skills: List[Dict[str, Any]]) -> int:
    """Count IR skills from names only — no ranker _skills_score."""
    n = 0
    for s in skills:
        name = norm_skill(s.get("name", ""))
        tokens = tokenize(name)
        if tokens & _GENERAL_S:
            continue
        if tokens & _CORE_S:
            n += 1
            continue
        for phrase in _CORE_M:
            if phrase in name:
                n += 1
                break
    return n


def _independent_career_signals(career: str) -> Tuple[float, float]:
    tokens = tokenize(career)
    jd_hits = count_phrases_fast(_JD_S, _JD_M, tokens, career)
    prod_hits = count_phrases_fast(_PROD_S, _PROD_M, tokens, career)
    return min(1.0, jd_hits / 8.0), min(1.0, prod_hits / 6.0)


def proxy_relevance(raw: Dict[str, Any]) -> float:
    """
    Independent JD rubric label in [0, 1].

    Does NOT call ranker scoring functions (_title_score, _skills_score,
    semantic_score, production_score, cv_language_hits). Uses raw profile
    fields + phrase/token matching only. Structural honeypots excluded.
    """
    if is_structural_honeypot(raw):
        return 0.0

    profile = raw.get("profile", {})
    history = raw.get("career_history", [])
    skills = raw.get("skills", [])
    signals = raw.get("redrob_signals", {})
    title = norm_text(profile.get("current_title", ""))
    career = _career_blob(history)

    if any(w in title for w in WEAK_TITLES):
        return 0.05

    title_tier = _independent_title_tier(title, history)
    core_ir = _independent_ir_skill_count(skills)
    jd_sig, prod_sig = _independent_career_signals(career)
    yrs = float(profile.get("years_of_experience", 0) or 0)
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    otw = bool(signals.get("open_to_work_flag", False))

    cv_hits = len(_CV_S & tokenize(career))
    cv_hits += sum(1 for m in _CV_M if m in career)
    if _CV_REGEX.search(career):
        cv_hits = max(cv_hits, 2)

    grade = title_tier * 1.5
    grade += min(1.0, core_ir * 0.18)
    grade += jd_sig * 0.9
    grade += prod_sig * 0.7

    if EXP_IDEAL_LO <= yrs <= EXP_IDEAL_HI:
        grade += 0.3
    elif yrs >= EXP_MIN:
        grade += 0.12
    else:
        grade *= 0.55

    if otw:
        grade += 0.1
    if rr >= 0.5:
        grade += 0.06

    if cv_hits >= 2 and core_ir <= 2:
        grade *= 0.22
    elif cv_hits >= 1 and core_ir <= 1:
        grade *= 0.35
    if "junior" in title and cv_hits >= 1:
        grade *= 0.3

    # Research-only titles without production language in career
    if any(r in title for r in RESEARCH_ONLY_TITLES) and prod_sig < 0.35:
        grade *= 0.65

    return round(min(1.0, grade / 3.8), 4)


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


def behavioral_proxy_relevance(raw: Dict[str, Any]) -> float:
    """
    Non-circular holdout proxy — signals the ranker does NOT consume.

    Excludes: saved_by_recruiters_30d, profile_views, recruiter_response_rate,
    applications_submitted_30d, open_to_work (used in engagement/availability).

    Uses: education tier, github_activity_score, profile_completeness,
    search_appearance_30d only.
    """
    signals = raw.get("redrob_signals", {}) or {}
    education = raw.get("education") or []

    tier_score = 0.25
    for e in education:
        t = (e.get("tier") or "").lower()
        if t == "tier_1":
            tier_score = max(tier_score, 0.95)
        elif t == "tier_2":
            tier_score = max(tier_score, 0.65)
        elif t == "tier_3":
            tier_score = max(tier_score, 0.40)

    github = float(signals.get("github_activity_score", 0) or 0)
    search_app = int(signals.get("search_appearance_30d", 0) or 0)
    completeness = float(signals.get("profile_completeness_score", 0) or 0)

    beh = 0.20
    beh += min(0.35, github / 80.0)
    beh += min(0.25, search_app / 40.0)
    beh += min(0.20, completeness)

    return round(min(1.0, 0.45 * tier_score + 0.55 * beh), 4)


def _metrics_dict(m: EvalMetrics) -> Dict[str, float]:
    return {
        "ndcg_10": m.ndcg_10,
        "ndcg_50": m.ndcg_50,
        "map": m.map_score,
        "p_at_10": m.precision_10,
    }


def run_hand_label_eval(
    rows: Sequence[Dict[str, Any]],
    labels: Dict[str, Dict[str, Any]],
    *,
    top_k: int | None = None,
) -> Dict[str, Any]:
    """Evaluate ranker on human-tier labels (full labeled pool, not a truncated slice)."""
    pool = [r for r in rows if r["candidate_id"] in labels]
    relevance = {
        r["candidate_id"]: float(labels[r["candidate_id"]]["relevance"]) for r in pool
    }
    ranked = rank_pool(pool, weights=DEFAULT_WEIGHTS)
    ranked_ids = [cid for cid, _ in ranked]
    eval_k = top_k or len(ranked_ids)

    m50 = evaluate_ranking(ranked_ids[:eval_k], relevance, relevant_threshold=0.5)
    m25 = evaluate_ranking(ranked_ids[:eval_k], relevance, relevant_threshold=0.25)
    n_rel_50 = sum(1 for v in relevance.values() if v >= 0.5)
    n_rel_25 = sum(1 for v in relevance.values() if v >= 0.25)
    n_rel_top10_50 = sum(
        1 for cid in ranked_ids[:10] if relevance.get(cid, 0) >= 0.5
    )

    return {
        "n_labeled": len(relevance),
        "n_relevant_threshold_0.5": n_rel_50,
        "n_relevant_threshold_0.25": n_rel_25,
        "n_relevant_in_top10_at_0.5": n_rel_top10_50,
        "eval_pool_size": eval_k,
        "label_method": "hand_curated_jd_tiers_v2",
        "metrics_at_0.5": _metrics_dict(m50),
        "metrics_at_0.25": _metrics_dict(m25),
        "metrics": _metrics_dict(m50),
        "note": (
            "Human JD tiers on sample + submission top-100. Sparse positives at 0.5 "
            f"({n_rel_50}/{len(relevance)} labeled) explain p@10={m50.precision_10} "
            f"with MAP={m50.map_score} when few tier≥2 labels exist."
        ),
    }


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
    beh_relevance = {r["candidate_id"]: behavioral_proxy_relevance(r) for r in pool}
    ranked = rank_pool(pool, weights=DEFAULT_WEIGHTS)
    ranked_ids = [cid for cid, _ in ranked[:top_k]]
    metrics = evaluate_ranking(ranked_ids, relevance)
    beh_metrics = evaluate_ranking(ranked_ids, beh_relevance)

    ablation: Dict[str, Dict[str, float]] = {}
    for name, preset in WEIGHT_PRESETS.items():
        ids = [cid for cid, _ in rank_pool(pool, weights=preset)[:top_k]]
        m = evaluate_ranking(ids, beh_relevance)
        ablation[name] = {
            "ndcg_10": m.ndcg_10,
            "ndcg_50": m.ndcg_50,
            "map": m.map_score,
            "p_at_10": m.precision_10,
        }

    best = max(ablation.items(), key=lambda x: x[1]["ndcg_10"])
    hand_block: Dict[str, Any] = {}
    hand_path = candidates_path.parent / "hand_labels.json"
    if hand_path.exists():
        labels = json.loads(hand_path.read_text(encoding="utf-8"))
        pool_rows = _load_labeled_rows(candidates_path, labels)
        if pool_rows:
            hand_block = run_hand_label_eval(pool_rows, labels)

    return {
        "holdout": {
            "seed": seed,
            "sample_rate": sample_rate,
            "n_scored": len(pool),
            "n_relevant_proxy": metrics.n_relevant,
            "top_k": top_k,
        },
        "label_method": "independent_jd_rubric",
        "metrics_self_consistency_proxy": {
            "ndcg_10": metrics.ndcg_10,
            "ndcg_50": metrics.ndcg_50,
            "map": metrics.map_score,
            "p_at_10": metrics.precision_10,
        },
        "metrics_behavioral_independent_proxy": {
            "ndcg_10": beh_metrics.ndcg_10,
            "ndcg_50": beh_metrics.ndcg_50,
            "map": beh_metrics.map_score,
            "p_at_10": beh_metrics.precision_10,
        },
        "hand_label_eval": hand_block,
        "metrics_current_weights": {
            "ndcg_10": metrics.ndcg_10,
            "ndcg_50": metrics.ndcg_50,
            "map": metrics.map_score,
            "p_at_10": metrics.precision_10,
        },
        "weight_ablation_on_behavioral_proxy": ablation,
        "best_preset_by_ndcg10": {"name": best[0], **best[1]},
        "weights_current": DEFAULT_WEIGHTS,
        "note": (
            "JD-rubric proxy is self-consistency only. Behavioral proxy uses education tier + "
            "github/search/completeness only (excludes saved_by_recruiters, response_rate, "
            "applications — all ranker inputs). Hand-label eval is the most defensible metric. "
            "NOT challenge hidden GT; expect real composite ~0.60–0.68."
        ),
    }


def _load_labeled_rows(
    candidates_path: Path, labels: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Load raw records for hand-labeled IDs from sample JSON and/or jsonl."""
    want = set(labels)
    found: Dict[str, Dict[str, Any]] = {}
    sample_path = candidates_path.parent / "sample_candidates.json"
    if sample_path.exists():
        for raw in json.loads(sample_path.read_text(encoding="utf-8")):
            cid = raw.get("candidate_id")
            if cid in want:
                found[cid] = raw
    remaining = want - set(found)
    if remaining and candidates_path.exists():
        for raw in load_candidates(candidates_path):
            cid = raw.get("candidate_id")
            if cid in remaining:
                found[cid] = raw
                remaining.discard(cid)
                if not remaining:
                    break
    return [found[cid] for cid in sorted(found)]


def write_eval_report(path: Path, report: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")