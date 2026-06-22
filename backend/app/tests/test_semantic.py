"""Semantic matching edge-case tests."""

from datetime import datetime, timezone
from uuid import uuid4

from app.agents.semantic_matching import _build_candidate_text
from app.models.schemas import CandidateIntelligence, CandidateProfile


def test_build_candidate_text_handles_empty_resume():
    profile = CandidateProfile(
        id=uuid4(),
        created_at=datetime.now(timezone.utc),
        full_name="Test User",
        resume_text="",
        skills=[],
        experiences=[],
    )
    intel = CandidateIntelligence(skills=["Python"], summary="")
    text = _build_candidate_text(profile, intel)
    assert "Summary:" in text
    assert "Test User" in text
    # Guard: None resume_text must not crash (runtime DB edge case)
    profile.resume_text = None  # type: ignore[assignment]
    text2 = _build_candidate_text(profile, intel)
    assert "Summary:" in text2