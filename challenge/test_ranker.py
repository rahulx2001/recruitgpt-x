"""Tests for offline Redrob ranker v3."""

from __future__ import annotations

import json
from pathlib import Path

from challenge.honeypot import honeypot_risk, is_structural_honeypot
from challenge.jd_config import WEAK_TITLES
from challenge.redrob_ranker import _skill_bucket, rank_candidates, score_candidate
from challenge.text_match import phrase_in_text

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "data" / "sample_candidates.json"


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
    candidates = ROOT / "data" / "candidates.jsonl"
    if not candidates.exists():
        return
    target = None
    for line in candidates.open(encoding="utf-8"):
        r = json.loads(line)
        if r["candidate_id"] == "CAND_0039754":
            target = r
            break
    assert target is not None
    sc = score_candidate(target)
    assert honeypot_risk(target) >= 0.55
    assert is_structural_honeypot(target)
    top = rank_candidates(candidates, top_k=100)
    ids = {t.candidate_id for t in top}
    assert "CAND_0039754" not in ids


def test_skill_hyphen_normalization():
    assert _skill_bucket("Hugging-Face") == "secondary"
    assert _skill_bucket("fine-tuning") == "secondary"


def test_reasoning_uses_model_score():
    sample = ROOT / "data" / "sample_candidates.json"
    if not sample.exists():
        return
    data = json.loads(sample.read_text(encoding="utf-8"))
    tmp = ROOT / "data" / "_test_sample.jsonl"
    with open(tmp, "w", encoding="utf-8") as f:
        for row in data[:50]:
            f.write(json.dumps(row) + "\n")
    top = rank_candidates(tmp, top_k=5)
    tmp.unlink(missing_ok=True)
    assert "model score" in top[0].reasoning.lower()
    assert len({r.reasoning for r in top}) >= 3


def test_full_dataset_structural_honeypots_below_threshold():
    candidates = ROOT / "data" / "candidates.jsonl"
    if not candidates.exists():
        return
    top = rank_candidates(candidates, top_k=100)
    traps = sum(1 for r in top if r.components.get("honeypot_risk", 0) >= 0.55)
    assert traps == 0, f"{traps} structural honeypots in top 100"


def test_scores_not_saturated():
    candidates = ROOT / "data" / "candidates.jsonl"
    if not candidates.exists():
        return
    top = rank_candidates(candidates, top_k=100)
    raw_unique = len({round(r.raw_score, 6) for r in top})
    assert raw_unique >= 20, f"only {raw_unique} unique raw scores in top 100"


def test_availability_component_present():
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    row = score_candidate(data[0])
    assert "availability" in row.components
    assert "career_semantic" in row.components


def test_calibrated_scores_monotonic():
    candidates = ROOT / "data" / "candidates.jsonl"
    if not candidates.exists():
        return
    top = rank_candidates(candidates, top_k=100)
    scores = [r.score for r in top]
    assert all(scores[i] >= scores[i + 1] for i in range(len(scores) - 1))
    assert scores[0] > scores[-1]