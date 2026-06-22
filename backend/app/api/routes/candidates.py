"""Candidate-related API routes."""

from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser, get_current_user
from app.api.deps import get_session
from app.api.rate_limit import rate_limit_expensive, rate_limit_upload
from app.config import get_settings
from app.models.schemas import (
    CandidateCreate,
    CandidateProfile,
    PotentialPrediction,
)
from app.services.candidate_repo import (
    create_candidate,
    get_candidate_profile,
    list_candidate_profiles,
)
from app.services.indexing import index_candidate
from app.services.llm import get_llm
from app.services.resume_parser import extract_resume_text

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

_ALLOWED_UPLOAD_TYPES = {
    "text/plain",
    "application/pdf",
    "application/octet-stream",
}


@router.get("", response_model=List[CandidateProfile])
async def list_all(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    return await list_candidate_profiles(session, user.user_id)


@router.post("", response_model=CandidateProfile)
async def create(
    payload: CandidateCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    profile = await create_candidate(session, payload, owner_id=user.user_id)
    await session.commit()
    index_candidate(profile)
    return profile


@router.post("/upload-resume", response_model=CandidateProfile)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    full_name: str = "",
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Create a candidate from a plain-text resume upload."""
    rate_limit_upload(request, user)
    settings = get_settings()

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in _ALLOWED_UPLOAD_TYPES:
        raise HTTPException(400, f"Unsupported file type: {content_type}")

    raw = await file.read(settings.max_upload_bytes + 1)
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(413, f"File exceeds {settings.max_upload_bytes} bytes")

    text = extract_resume_text(raw, file.filename)
    if not text:
        raise HTTPException(
            400,
            "Could not extract text from uploaded file. Use .txt or .pdf.",
        )

    name = full_name.strip()[:200] or (
        (file.filename or "New Candidate").replace(".txt", "").replace(".pdf", "")
    )[:200]
    payload = CandidateCreate(full_name=name, resume_text=text[:50_000])
    profile = await create_candidate(session, payload, owner_id=user.user_id)
    await session.commit()
    index_candidate(profile)
    return profile


@router.get("/{candidate_id}", response_model=CandidateProfile)
async def get_one(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    p = await get_candidate_profile(session, str(candidate_id), user.user_id)
    if not p:
        raise HTTPException(404, "Candidate not found")
    return p


@router.get("/{candidate_id}/potential", response_model=PotentialPrediction)
async def predict_potential(
    request: Request,
    candidate_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    rate_limit_expensive(request, user)
    p = await get_candidate_profile(session, str(candidate_id), user.user_id)
    if not p:
        raise HTTPException(404, "Candidate not found")

    llm = get_llm()
    system = """You are a career trajectory predictor. Based on a candidate's profile,
predict their likely level in 2 and 5 years. Levels: Junior, Mid, Senior, Staff, Principal, Distinguished.
Provide confidence 0-1 and reasoning."""

    user_prompt = f"""Candidate: {p.full_name}
Current role: {p.current_role or "unknown"}
Years experience: {p.years_experience}
Skills: {", ".join([s.name for s in p.skills])}
Recent roles: {" → ".join([e.role for e in p.experiences[-4:]])}

Return JSON: current_level, predicted_level_2y, predicted_level_5y, confidence, reasoning, growth_signals (list)"""

    fallback = {
        "current_level": "Senior" if p.years_experience >= 5 else "Mid",
        "predicted_level_2y": "Staff" if p.years_experience >= 5 else "Senior",
        "predicted_level_5y": "Principal",
        "confidence": 0.6,
        "reasoning": "Projection from experience timeline and skill breadth heuristics.",
        "growth_signals": [],
    }
    data = await llm.structured_complete(system, user_prompt, fallback)
    return PotentialPrediction(candidate_id=p.id, **data)