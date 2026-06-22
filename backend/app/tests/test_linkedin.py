"""LinkedIn enrichment tests."""

import asyncio

from app.models.schemas import CandidateProfile
from app.services.linkedin import _slug_from_url, fetch_linkedin_profile
from datetime import datetime, timezone
from uuid import uuid4


def test_slug_from_linkedin_url():
    assert _slug_from_url("https://linkedin.com/in/priya-sharma-ml") == "priya-sharma-ml"
    assert _slug_from_url("https://www.linkedin.com/pub/john-doe/1/2/3") == "john-doe"


def test_heuristic_linkedin_enrichment():
    profile = CandidateProfile(
        id=uuid4(),
        created_at=datetime.now(timezone.utc),
        full_name="Priya Sharma",
        headline="Senior ML Engineer",
        linkedin_url="https://linkedin.com/in/priya-sharma-ml",
    )
    result = asyncio.run(fetch_linkedin_profile(profile.linkedin_url, profile))
    assert result["source"] in ("heuristic", "linkedin_og")
    assert result.get("headline")