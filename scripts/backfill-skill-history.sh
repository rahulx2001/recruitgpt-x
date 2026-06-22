#!/usr/bin/env bash
# Backfill skill_history for existing candidates (safe to re-run).
set -euo pipefail
cd "$(dirname "$0")/../backend"
python - <<'PY'
import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.db import get_session_maker
from app.models.database import CandidateORM, SkillHistoryORM
from app.services.skill_evolution import build_skill_history
from app.models.schemas import SkillProficiency, WorkExperience, Project

async def main():
    sm = get_session_maker()
    async with sm() as session:
        stmt = select(CandidateORM).options(
            selectinload(CandidateORM.skills),
            selectinload(CandidateORM.experiences),
            selectinload(CandidateORM.projects),
            selectinload(CandidateORM.skill_history),
        )
        rows = (await session.execute(stmt)).scalars().all()
        updated = 0
        for c in rows:
            if c.skill_history:
                continue
            skills = [
                SkillProficiency(name=s.skill_name, proficiency=s.proficiency, years=s.years)
                for s in (c.skills or [])
            ]
            exps = [
                WorkExperience(
                    company=e.company, role=e.role, start_date=e.start_date,
                    end_date=e.end_date, description=e.description, is_current=e.is_current,
                )
                for e in (c.experiences or [])
            ]
            projs = [
                Project(name=p.name, description=p.description or "", technologies=p.technologies or [])
                for p in (c.projects or [])
            ]
            history = build_skill_history(
                skills=skills, experiences=exps, projects=projs,
                certifications=c.certifications or [],
            )
            for h in history:
                session.add(SkillHistoryORM(
                    id=str(uuid.uuid4()), candidate_id=c.id,
                    skill_name=h.skill_name, year=h.year, proficiency=h.proficiency,
                    source=h.source, context=h.context,
                ))
            updated += 1
        await session.commit()
        print(f"Backfilled skill_history for {updated} candidates")

asyncio.run(main())
PY