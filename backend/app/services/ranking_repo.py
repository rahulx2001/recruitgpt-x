"""Persist and retrieve cached ranking results per job."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import RankingCacheORM
from app.models.schemas import HiringBlueprint, RankedCandidate, RankingResult


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def save_ranking_cache(
    session: AsyncSession,
    result: RankingResult,
    pipeline_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Overwrite cached ranking for a job (one cache row per job)."""
    job_id = str(result.job_id)
    ranked_payload = [rc.model_dump(mode="json") for rc in result.ranked_candidates]
    blueprint_payload = result.blueprint.model_dump(mode="json")

    stmt = select(RankingCacheORM).where(RankingCacheORM.job_id == job_id)
    row = (await session.execute(stmt)).scalar_one_or_none()

    if row:
        row.job_title = result.job_title
        row.blueprint = blueprint_payload
        row.ranked = ranked_payload
        row.pipeline_metadata = pipeline_metadata or result.pipeline_metadata
        row.updated_at = _now()
    else:
        session.add(
            RankingCacheORM(
                id=str(uuid.uuid4()),
                job_id=job_id,
                job_title=result.job_title,
                blueprint=blueprint_payload,
                ranked=ranked_payload,
                pipeline_metadata=pipeline_metadata or result.pipeline_metadata,
                updated_at=_now(),
            )
        )
    await session.flush()


async def get_cached_ranking(
    session: AsyncSession, job_id: str
) -> Optional[RankingResult]:
    """Return the latest cached ranking for a job, if any."""
    stmt = select(RankingCacheORM).where(RankingCacheORM.job_id == job_id)
    row = (await session.execute(stmt)).scalar_one_or_none()
    if not row or not row.ranked:
        return None

    try:
        blueprint = HiringBlueprint(**(row.blueprint or {}))
        ranked: List[RankedCandidate] = [
            RankedCandidate(**item) for item in row.ranked
        ]
        return RankingResult(
            job_id=uuid.UUID(row.job_id),
            job_title=row.job_title,
            blueprint=blueprint,
            ranked_candidates=ranked,
            pipeline_metadata=row.pipeline_metadata or {"cached": True},
            created_at=row.updated_at,
        )
    except Exception:
        return None


async def clear_ranking_cache(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        delete(RankingCacheORM).where(RankingCacheORM.job_id == job_id)
    )