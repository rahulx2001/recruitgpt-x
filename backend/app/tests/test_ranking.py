"""Ranking weight and hireability tests."""

from app.agents.ranking import (
    DEFAULT_WEIGHTS,
    PROMPT_WEIGHTS,
    SEMANTIC_WEIGHTS,
    compute_hireability,
    get_ranking_weights,
)
from app.models.schemas import SubScores


def test_default_weights_sum_to_one():
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 0.001


def test_prompt_weights_sum_to_one():
    assert abs(sum(PROMPT_WEIGHTS.values()) - 1.0) < 0.001


def test_default_ranking_weights_match_hackathon_spec():
    w = get_ranking_weights(use_semantic=False)
    assert w == PROMPT_WEIGHTS
    assert w["skill_match"] == 0.30
    assert w["semantic"] == 0.00


def test_semantic_ranking_weights():
    w = get_ranking_weights(use_semantic=True)
    assert w == SEMANTIC_WEIGHTS
    assert w["semantic"] == 0.10


def test_compute_hireability_bounds():
    sub = SubScores(
        skill_match=0.8,
        project_relevance=0.7,
        career_growth=0.6,
        behavioral=0.75,
        learning=0.65,
        communication=0.5,
        semantic=0.85,
    )
    score = compute_hireability(sub)
    assert 0.0 <= score <= 1.0
    assert score > 0.6