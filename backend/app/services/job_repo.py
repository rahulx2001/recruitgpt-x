"""Repository for jobs."""

from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import JobORM
from app.models.schemas import HiringBlueprint, Job, JobCreate


async def create_job(
    session: AsyncSession,
    payload: JobCreate,
    blueprint: Optional[HiringBlueprint],
    *,
    owner_id: str,
) -> Job:
    job = JobORM(
        id=str(uuid.uuid4()),
        owner_id=owner_id,
        title=payload.title,
        description=payload.description,
        blueprint=blueprint.model_dump() if blueprint else None,
    )
    session.add(job)
    await session.flush()
    return await get_job(session, job.id, owner_id)


async def get_job(
    session: AsyncSession, job_id: str, owner_id: str
) -> Optional[Job]:
    stmt = select(JobORM).where(JobORM.id == job_id, JobORM.owner_id == owner_id)
    res = await session.execute(stmt)
    row = res.scalar_one_or_none()
    if not row:
        return None
    return _to_job(row)


async def get_job_owner_id(session: AsyncSession, job_id: str) -> Optional[str]:
    stmt = select(JobORM.owner_id).where(JobORM.id == job_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()


async def list_all_jobs(session: AsyncSession) -> List[Job]:
    """Internal — index all tenants at startup. Not exposed via API."""
    stmt = select(JobORM).order_by(JobORM.created_at.desc())
    res = await session.execute(stmt)
    return [_to_job(r) for r in res.scalars().all()]


async def list_jobs(session: AsyncSession, owner_id: str) -> List[Job]:
    stmt = (
        select(JobORM)
        .where(JobORM.owner_id == owner_id)
        .order_by(JobORM.created_at.desc())
    )
    res = await session.execute(stmt)
    return [_to_job(r) for r in res.scalars().all()]


async def update_blueprint(
    session: AsyncSession,
    job_id: str,
    blueprint: HiringBlueprint,
    *,
    owner_id: str,
) -> Optional[Job]:
    stmt = select(JobORM).where(JobORM.id == job_id, JobORM.owner_id == owner_id)
    res = await session.execute(stmt)
    row = res.scalar_one_or_none()
    if not row:
        return None
    row.blueprint = blueprint.model_dump()
    await session.flush()
    return _to_job(row)


def _to_job(row: JobORM) -> Job:
    bp = None
    if row.blueprint:
        try:
            bp = HiringBlueprint(**row.blueprint)
        except Exception:
            bp = None
    return Job(
        id=uuid.UUID(row.id),
        title=row.title,
        description=row.description,
        blueprint=bp,
        created_at=row.created_at,
    )