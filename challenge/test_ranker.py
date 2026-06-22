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


def test_applied_scientist_not_research_only_penalty():
    """Applied scientist is strong-title only; not in RESEARCH_ONLY_TITLES."""
    from challenge.jd_config import RESEARCH_ONLY_TITLES, STRONG_TITLES
    from challenge.redrob_ranker import _research_penalty
    from challenge.features import build_index

    assert "applied scientist" in STRONG_TITLES
    assert "applied scientist" not in RESEARCH_ONLY_TITLES
    assert "research engineer" not in STRONG_TITLES

    raw = {
        "candidate_id": "TEST_APPLIED",
        "profile": {
            "current_title": "Applied Scientist",
            "years_of_experience": 6.0,
        },
        "career_history": [
            {
                "title": "Applied Scientist",
                "company": "CRED",
                "description": "Shipped hybrid retrieval and ranking in production for 2M users.",
            }
        ],
        "skills": [{"name": "Information Retrieval", "proficiency": "expert"}],
        "redrob_signals": {},
    }
    idx = build_index(raw["profile"], raw["career_history"])
    assert _research_penalty(raw["profile"], raw["career_history"], 0.7, idx) == 1.0


def test_calibrated_scores_have_floor():
    from challenge.redrob_ranker import _calibrate_scores

    raw = [1.0, 1.0, 0.5, 0.5, 0.1]
    cal = _calibrate_scores(raw)
    assert all(s >= 0.20 for s in cal)
    assert all(cal[i] >= cal[i + 1] for i in range(len(cal) - 1))


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
    assert report.get("label_method") == "independent_jd_rubric"
    m = report["metrics_self_consistency_proxy"]
    assert "ndcg_10" in m
    assert "hidden" in report.get("note", "").lower()
    abl = report.get("weight_ablation_on_behavioral_proxy") or report.get("weight_ablation", {})
    assert abl["current"]["ndcg_10"] >= 0


def test_behavioral_twin_breaks_tie():
    base = json.loads(SAMPLE.read_text(encoding="utf-8"))[0]
    twin_a = json.loads(json.dumps(base))
    twin_b = json.loads(json.dumps(base))
    twin_a["candidate_id"] = "TWIN_A"
    twin_b["candidate_id"] = "TWIN_B"
    twin_a["redrob_signals"]["recruiter_response_rate"] = 0.85
    twin_a["redrob_signals"]["saved_by_recruiters_30d"] = 6
    twin_a["redrob_signals"]["open_to_work_flag"] = True
    twin_b["redrob_signals"]["recruiter_response_rate"] = 0.12
    twin_b["redrob_signals"]["saved_by_recruiters_30d"] = 0
    twin_b["redrob_signals"]["open_to_work_flag"] = False
    sa = score_candidate(twin_a)
    sb = score_candidate(twin_b)
    assert sa.raw_score > sb.raw_score


def test_keyword_stuffer_far_from_top():
    from challenge.jd_config import CORE_SKILL_PHRASES

    skills = [
        {
            "name": p.title(),
            "proficiency": "expert",
            "endorsements": 40,
            "duration_months": 0,
        }
        for p in CORE_SKILL_PHRASES[:20]
    ]
    stuffer = {
        "candidate_id": "STUFFER_TEST",
        "profile": {
            "current_title": "Marketing Manager",
            "years_of_experience": 5.0,
            "summary": "Enterprise sales and brand campaigns.",
            "headline": "Marketing Manager",
            "location": "Mumbai",
            "country": "India",
        },
        "career_history": [
            {
                "title": "Marketing Manager",
                "company": "Acme",
                "description": "Led brand campaigns and social media growth.",
            }
        ],
        "skills": skills,
        "redrob_signals": {"open_to_work_flag": True, "recruiter_response_rate": 0.5},
    }
    sc = score_candidate(stuffer)
    assert sc.raw_score < 0.25


def test_honeypot_recall_scan_runs():
    if not CANDIDATES.exists():
        return
    from challenge.honeypot import honeypot_risk, is_structural_honeypot
    from challenge.redrob_ranker import load_candidates

    n = flagged = 0
    for raw in load_candidates(CANDIDATES):
        n += 1
        if is_structural_honeypot(raw) or honeypot_risk(raw) >= 0.55:
            flagged += 1
        if n >= 20000:
            break
    assert n > 0
    assert flagged >= 5, f"honeypot recall suspiciously low: {flagged}/{n}"


def test_runtime_under_budget():
    """Full 100K ranking must finish under 300s (Stage-3 hard limit)."""
    if not CANDIDATES.exists():
        return
    t0 = time.perf_counter()
    rank_candidates(CANDIDATES, top_k=100)
    elapsed = time.perf_counter() - t0
    assert elapsed < 300.0, f"ranking took {elapsed:.1f}s — exceeds 300s budget"
    assert elapsed < 180.0, f"ranking took {elapsed:.1f}s — target <180s with rerank"