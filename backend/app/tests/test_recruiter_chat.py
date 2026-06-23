"""Data-grounded recruiter chat tests."""

from uuid import UUID

from app.models.schemas import (
    Explanation,
    HiringBlueprint,
    RankedCandidate,
    SubScores,
)
from app.services.recruiter_chat import data_grounded_chat_response


def _rc(rank: int, name: str, score: float, **subs) -> RankedCandidate:
    sub = SubScores(
        skill_match=subs.get("skill", 0.7),
        semantic=subs.get("semantic", 0.7),
        career_growth=subs.get("growth", 0.6),
        behavioral=subs.get("behavioral", 0.6),
        project_relevance=0.6,
        learning=0.5,
        communication=0.5,
    )
    return RankedCandidate(
        candidate_id=UUID(f"00000000-0000-4000-8000-{rank:012x}"),
        candidate_name=name,
        rank=rank,
        hireability_score=score,
        sub_scores=sub,
        explanation=Explanation(
            summary=f"{name} is a strong fit for retrieval work.",
            strengths=[f"{name} ships ranking systems"],
            weaknesses=["Validate notice period"],
            interview_focus_areas=["IR depth"],
            hiring_manager_talking_points=["Walk through last project"],
        ),
    )


def _blueprint() -> HiringBlueprint:
    return HiringBlueprint(
        hard_skills=["Python", "FAISS"],
        soft_skills=["Communication"],
        industry="Technology",
        seniority="Senior",
        years_experience_min=5,
        leadership_requirement="medium",
        communication_requirement="high",
        growth_expectation="fast",
        hidden_requirements=["retrieval"],
        domain_keywords=["ranking"],
        reasoning="test",
    )


def test_top3_question_uses_real_names():
    ranked = [
        _rc(1, "Ira Dalal", 0.99),
        _rc(2, "Saanvi Naidu", 0.93),
        _rc(3, "Aryan Goyal", 0.86),
    ]
    a = data_grounded_chat_response(
        _blueprint(), ranked, "Who are the top 3 candidates in the pool?"
    )
    b = data_grounded_chat_response(
        _blueprint(), ranked, "Which screened candidates should we advance?"
    )
    assert "Ira Dalal" in a
    assert "Saanvi Naidu" in a
    assert "Aryan Goyal" in a
    assert a != b
    assert "advance" in b.lower() or "interview" in b.lower()


def test_compare_two_candidates():
    ranked = [
        _rc(1, "Ira Dalal", 0.99, skill=0.8, semantic=0.85),
        _rc(2, "Saanvi Naidu", 0.93, skill=0.7, semantic=0.75),
    ]
    reply = data_grounded_chat_response(
        _blueprint(), ranked, "Compare Ira Dalal vs Saanvi Naidu"
    )
    assert "Ira Dalal" in reply
    assert "Saanvi Naidu" in reply
    assert "rank" in reply.lower()