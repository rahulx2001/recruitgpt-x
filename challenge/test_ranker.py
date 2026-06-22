"""Tests for offline Redrob ranker — honeypot rejection and JD alignment."""

from __future__ import annotations

import json
from pathlib import Path

from challenge.jd_config import WEAK_TITLES
from challenge.redrob_ranker import _skill_bucket, rank_candidates, score_candidate

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "data" / "sample_candidates.json"


def test_honeypots_not_in_top_sample():
    rows = []
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    for raw in data:
        rows.append(score_candidate(raw))
    rows.sort(key=lambda x: (-x.raw_score, -x.core_skill_count, x.candidate_id))
    top10 = rows[:10]
    for row in top10:
        title = row.reasoning.split(" with ")[0].lower()
        assert not any(w in title for w in WEAK_TITLES), f"Honeypot in top 10: {row.reasoning}"


def test_recommendation_or_senior_ai_leads_sample():
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    rows = [score_candidate(raw) for raw in data]
    rows.sort(key=lambda x: (-x.raw_score, -x.core_skill_count, x.candidate_id))
    top = rows[0]
    title = top.reasoning.split(" with ")[0].lower()
    assert any(
        k in title
        for k in (
            "recommendation",
            "senior ai",
            "machine learning",
            "ml engineer",
            "data scientist",
        )
    )


def test_skill_hyphen_normalization():
    assert _skill_bucket("Hugging-Face") == "secondary"
    assert _skill_bucket("hugging_face") == "secondary"
    assert _skill_bucket("fine-tuning") == "secondary"


def test_reasoning_includes_location_and_github():
    raw = {
        "candidate_id": "CAND_TEST01",
        "profile": {
            "current_title": "ML Engineer",
            "years_of_experience": 6.0,
            "location": "Pune, India",
        },
        "career_history": [],
        "skills": [{"name": "PyTorch", "proficiency": "advanced", "endorsements": 10, "duration_months": 24}],
        "redrob_signals": {"recruiter_response_rate": 0.75, "github_activity_score": 88.5},
    }
    row = score_candidate(raw)
    assert "Pune" in row.reasoning
    assert "GitHub" in row.reasoning


def test_full_dataset_top100_no_honeypots():
    candidates = ROOT / "data" / "candidates.jsonl"
    if not candidates.exists():
        return
    top = rank_candidates(candidates, top_k=100)
    for row in top:
        title = row.reasoning.split(" with ")[0].lower()
        assert not any(w in title for w in WEAK_TITLES), row.reasoning