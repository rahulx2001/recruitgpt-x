"""Repository for reading/writing candidates."""

from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import (
    CandidateORM,
    CandidateSkillORM,
    ProjectORM,
    SkillHistoryORM,
    WorkExperienceORM,
)
from app.models.schemas import (
    CandidateCreate,
    CandidateProfile,
    Project,
    SkillHistoryEntry,
    SkillProficiency,
    WorkExperience,
)
from app.services.skill_evolution import build_skill_history
from app.utils.pii_crypto import decrypt_pii, encrypt_pii


async def create_candidate(
    session: AsyncSession, payload: CandidateCreate, *, owner_id: str
) -> CandidateProfile:
    cand = CandidateORM(
        id=str(uuid.uuid4()),
        owner_id=owner_id,
        full_name=payload.full_name,
        headline=payload.headline,
        location=payload.location,
        current_role=payload.current_role,
        years_experience=payload.years_experience,
        resume_text=encrypt_pii(payload.resume_text) or "",
        email=encrypt_pii(payload.email),
        linkedin_url=payload.linkedin_url,
        github_url=payload.github_url,
        portfolio_url=payload.portfolio_url,
        gender=payload.gender,
        ethnicity=payload.ethnicity,
        school=payload.school,
        github_stats=payload.github_stats,
        certifications=payload.certifications,
    )
    session.add(cand)
    await session.flush()

    for e in payload.experiences:
        session.add(
            WorkExperienceORM(
                id=str(uuid.uuid4()),
                candidate_id=cand.id,
                company=e.company,
                role=e.role,
                start_date=e.start_date,
                end_date=e.end_date,
                description=e.description,
                is_current=e.is_current,
            )
        )

    for p in payload.projects:
        session.add(
            ProjectORM(
                id=str(uuid.uuid4()),
                candidate_id=cand.id,
                name=p.name,
                description=p.description,
                technologies=p.technologies,
                url=p.url,
                impact=p.impact,
            )
        )

    for s in payload.skills:
        session.add(
            CandidateSkillORM(
                candidate_id=cand.id,
                skill_name=s.name,
                proficiency=s.proficiency,
                years=s.years,
            )
        )

    history = payload.skill_history or build_skill_history(
        skills=payload.skills,
        experiences=payload.experiences,
        projects=payload.projects,
        certifications=payload.certifications,
    )
    for h in history:
        session.add(
            SkillHistoryORM(
                id=str(uuid.uuid4()),
                candidate_id=cand.id,
                skill_name=h.skill_name,
                year=h.year,
                proficiency=h.proficiency,
                source=h.source,
                context=h.context,
            )
        )

    await session.flush()
    return await get_candidate_profile(session, cand.id, owner_id)


async def get_candidate_profile(
    session: AsyncSession, candidate_id: str, owner_id: str
) -> Optional[CandidateProfile]:
    stmt = (
        select(CandidateORM)
        .where(CandidateORM.id == candidate_id, CandidateORM.owner_id == owner_id)
        .options(
            selectinload(CandidateORM.experiences),
            selectinload(CandidateORM.projects),
            selectinload(CandidateORM.skills),
            selectinload(CandidateORM.skill_history),
        )
    )
    res = await session.execute(stmt)
    cand = res.scalar_one_or_none()
    if not cand:
        return None
    return _to_profile(cand)


async def list_all_candidate_profiles(session: AsyncSession) -> List[CandidateProfile]:
    """Internal — index all tenants at startup. Not exposed via API."""
    stmt = select(CandidateORM).options(
        selectinload(CandidateORM.experiences),
        selectinload(CandidateORM.projects),
        selectinload(CandidateORM.skills),
        selectinload(CandidateORM.skill_history),
    )
    res = await session.execute(stmt)
    return [_to_profile(c) for c in res.scalars().all()]


async def list_candidate_profiles(
    session: AsyncSession, owner_id: str
) -> List[CandidateProfile]:
    stmt = (
        select(CandidateORM)
        .where(CandidateORM.owner_id == owner_id)
        .options(
            selectinload(CandidateORM.experiences),
            selectinload(CandidateORM.projects),
            selectinload(CandidateORM.skills),
            selectinload(CandidateORM.skill_history),
        )
    )
    res = await session.execute(stmt)
    rows = res.scalars().all()
    return [_to_profile(c) for c in rows]


def _to_profile(c: CandidateORM) -> CandidateProfile:
    return CandidateProfile(
        id=uuid.UUID(c.id),
        full_name=c.full_name,
        email=decrypt_pii(c.email),
        headline=c.headline,
        location=c.location,
        current_role=c.current_role,
        years_experience=c.years_experience,
        resume_text=decrypt_pii(c.resume_text) or "",
        linkedin_url=c.linkedin_url,
        github_url=c.github_url,
        portfolio_url=c.portfolio_url,
        gender=c.gender,
        ethnicity=c.ethnicity,
        school=c.school,
        github_stats=c.github_stats,
        certifications=c.certifications or [],
        created_at=c.created_at,
        skills=[
            SkillProficiency(
                name=s.skill_name, proficiency=s.proficiency, years=s.years
            )
            for s in (c.skills or [])
        ],
        experiences=[
            WorkExperience(
                company=e.company,
                role=e.role,
                start_date=e.start_date,
                end_date=e.end_date,
                description=e.description,
                is_current=e.is_current,
            )
            for e in (c.experiences or [])
        ],
        projects=[
            Project(
                name=p.name,
                description=p.description or "",
                technologies=p.technologies or [],
                url=p.url,
                impact=p.impact,
            )
            for p in (c.projects or [])
        ],
        skill_history=[
            SkillHistoryEntry(
                skill_name=h.skill_name,
                year=h.year,
                proficiency=h.proficiency,
                source=h.source,
                context=h.context,
            )
            for h in (c.skill_history or [])
        ],
    )