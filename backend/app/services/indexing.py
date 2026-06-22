"""Ingest a candidate into the vector store for semantic search."""

from __future__ import annotations

from typing import Any, Dict

from app.models.schemas import CandidateProfile
from app.services.embeddings import get_embeddings
from app.services.vector_store import get_vector_store


def _build_candidate_text(profile: CandidateProfile) -> str:
    skills = ", ".join([s.name for s in profile.skills])
    exps = " | ".join([f"{e.role} @ {e.company}" for e in profile.experiences])
    proj = " | ".join([p.name for p in profile.projects])
    return (
        f"{profile.full_name} — {profile.headline or ''}\n"
        f"Current: {profile.current_role or ''}\n"
        f"Years: {profile.years_experience}\n"
        f"Skills: {skills}\n"
        f"Experience: {exps}\n"
        f"Projects: {proj}\n"
        f"Resume: {(profile.resume_text or '')[:1000]}"
    )


def index_candidate(profile: CandidateProfile) -> None:
    """Compute embedding and upsert into vector store."""
    emb = get_embeddings()
    vs = get_vector_store()
    text = _build_candidate_text(profile)
    vector = emb.embed_one(text)
    payload = {
        "candidate_id": str(profile.id),
        "name": profile.full_name,
        "headline": profile.headline or "",
        "current_role": profile.current_role or "",
        "years_experience": profile.years_experience,
        "skills": [s.name for s in profile.skills],
    }
    vs.upsert_candidate(str(profile.id), vector, payload)


def index_job(
    job_id: str, title: str, description: str, blueprint_dict: Dict[str, Any]
) -> None:
    emb = get_embeddings()
    vs = get_vector_store()
    text = f"{title}\n{description[:2000]}"
    vector = emb.embed_one(text)
    vs.upsert_job(job_id, vector, {"title": title, "blueprint": blueprint_dict})
