"""Tests for offline Redrob ranker v4."""

from __future__ import annotations

import json
import time
from pathlib import Path

from challenge.honeypot import honeypot_risk, is_structural_honeypot
from challenge.jd_config import GENERAL_ML_SKILLS
from challenge.redrob_ranker import _skill_bucket, rank_candidates, score_candidate
from challenge.text_match import phrase_in_text

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "data" / "sample_candidates.json"
CANDIDATES = ROOT / "data" / "candidates.jsonl"


def test_substring_bugs_fixed():
    assert not phrase_in_text("map", "roadmap design")
    assert not phrase_in_text("search", "research scientist")
    assert phrase_in_text("python", "strong python skills")


def test_honeypots_not_in_top_sample():
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    rows = [score_candidate(raw) for raw in data]
    rows.sort(key=lambda x: (-x.raw_score, x.candidate_id))
    for row in rows[:10]:
        assert row.components.get("honeypot_risk", 0) < 0.55


def test_impossible_tenure_demoted():
    if not CANDIDATES.exists():
        return
    target = None
    for line in CANDIDATES.open(encoding="utf-8"):
        r = json.loads(line)
        if r["candidate_id"] == "CAND_0039754":
            target = r
            break
    assert target is not None
    sc = score_candidate(target)
    assert honeypot_risk(target) >= 0.55
    assert is_structural_honeypot(target)
    top = rank_candidates(CANDIDATES, top_k=100)
    ids = {t.candidate_id for t in top}
    assert "CAND_0039754" not in ids


def test_skill_hyphen_normalization():
    assert _skill_bucket("Hugging-Face") == "secondary"
    assert _skill_bucket("fine-tuning") == "secondary"


def test_python_tensorflow_not_core_ir_names():
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    row = score_candidate(data[0])
    for name in row.core_skill_names:
        assert name.lower() not in {s.lower() for s in GENERAL_ML_SKILLS}


def test_reasoning_uses_model_score():
    if not SAMPLE.exists():
        return
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    tmp = ROOT / "data" / "_test_sample.jsonl"
    with open(tmp, "w", encoding="utf-8") as f:
        for row in data[:50]:
            f.write(json.dumps(row) + "\n")
    top = rank_candidates(tmp, top_k=5)
    tmp.unlink(missing_ok=True)
    assert "model score" in top[0].reasoning.lower()
    assert len({r.reasoning for r in top}) >= 3


def test_full_dataset_structural_honeypots_below_threshold():
    if not CANDIDATES.exists():
        return
    top = rank_candidates(CANDIDATES, top_k=100)
    traps = sum(1 for r in top if r.components.get("honeypot_risk", 0) >= 0.55)
    assert traps == 0, f"{traps} structural honeypots in top 100"


def test_scores_not_saturated():
    if not CANDIDATES.exists():
        return
    top = rank_candidates(CANDIDATES, top_k=100)
    raw_unique = len({round(r.raw_score, 6) for r in top})
    assert raw_unique >= 20, f"only {raw_unique} unique raw scores in top 100"


def test_availability_component_present():
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    row = score_candidate(data[0])
    assert "availability" in row.components
    assert "career_semantic" in row.components


def test_calibrated_scores_monotonic():
    if not CANDIDATES.exists():
        return
    top = rank_candidates(CANDIDATES, top_k=100)
    scores = [r.score for r in top]
    assert all(scores[i] >= scores[i + 1] for i in range(len(scores) - 1))
    assert scores[0] > scores[-1]


def test_cv_profiles_not_in_top_100():
    if not CANDIDATES.exists():
        return
    top = rank_candidates(CANDIDATES, top_k=100)
    for row in top:
        reasoning = row.reasoning.lower()
        assert "computer vision" not in reasoning or row.components.get("cv_penalty", 1.0) >= 0.9
        assert "image moderation" not in reasoning
        title = reasoning.split(",")[0].lower()
        if "junior" in title and row.components.get("cv_penalty", 1.0) < 0.8:
            raise AssertionError(f"junior CV profile at rank with cv_penalty: {row.candidate_id}")


def test_eval_harness_produces_metrics():
    from challenge.eval_harness import proxy_relevance, run_holdout_eval

    sample = json.loads(SAMPLE.read_text(encoding="utf-8"))
    assert 0.0 <= proxy_relevance(sample[0]) <= 1.0
    tmp = ROOT / "data" / "_eval_sample.jsonl"
    with open(tmp, "w", encoding="utf-8") as f:
        for row in sample:
            f.write(json.dumps(row) + "\n")
    report = run_holdout_eval(tmp, sample_rate=1.0, max_n=50, top_k=20)
    tmp.unlink(missing_ok=True)
    m = report["metrics_current_weights"]
    assert "ndcg_10" in m
    assert report["weight_ablation"]["current"]["ndcg_10"] == m["ndcg_10"]


def test_runtime_under_budget():
    """Full 100K ranking must finish under 60s (Stage-3 hard limit is 300s)."""
    if not CANDIDATES.exists():
        return
    t0 = time.perf_counter()
    rank_candidates(CANDIDATES, top_k=100)
    elapsed = time.perf_counter() - t0
    assert elapsed < 60.0, f"ranking took {elapsed:.1f}s — exceeds 60s budget"