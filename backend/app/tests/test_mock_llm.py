"""Mock LLM personalization tests — ensures demo mode shows unique explanations."""

import json

from app.services.llm import LLMService

_EXPLAIN_SYSTEM = """You are a senior recruiter writing a candidate evaluation.
Return valid JSON with summary, strengths, weaknesses, interview_focus_areas, hiring_manager_talking_points."""


def _explanation_prompt(name: str, rank: int, hire: float, skill: float, semantic: float) -> str:
    return f"""JOB BLUEPRINT:
- Role: Senior level
- Required hard skills: Python, PyTorch
- Domain: FinTech

CANDIDATE: {name}
- Years experience: 6

SUB-SCORES (0-1):
- Skill match: {skill:.2f}
- Project relevance: 0.70
- Career growth: 0.65
- Behavioral: 0.72
- Learning: 0.60
- Communication: 0.55
- Semantic: {semantic:.2f}

RANK: #{rank} (hireability {hire:.2f})

KEY SIGNALS DETECTED:
Strengths: Strong skill match ({skill:.0%})
Weaknesses: none specific

Write a recruiter-friendly explanation. Return JSON:
- summary
- strengths
- weaknesses
- interview_focus_areas
- hiring_manager_talking_points
"""


def test_mock_explanations_are_unique_per_candidate():
    raw_a = LLMService._mock_complete(
        _EXPLAIN_SYSTEM, _explanation_prompt("Priya Sharma", 1, 0.88, 0.91, 0.87)
    )
    raw_b = LLMService._mock_complete(
        _EXPLAIN_SYSTEM, _explanation_prompt("Rahul Verma", 8, 0.41, 0.38, 0.44)
    )
    a = json.loads(raw_a)
    b = json.loads(raw_b)
    assert "Priya Sharma" in a["summary"]
    assert "Rahul Verma" in b["summary"]
    assert a["summary"] != b["summary"]
    assert a["strengths"] != b["strengths"]


def test_mock_explanation_includes_rank_context():
    raw = LLMService._mock_complete(
        _EXPLAIN_SYSTEM, _explanation_prompt("Alex Chen", 3, 0.72, 0.68, 0.71)
    )
    data = json.loads(raw)
    assert "#3" in data["summary"]
    assert "Alex Chen" in data["summary"]
    assert len(data["interview_focus_areas"]) >= 1