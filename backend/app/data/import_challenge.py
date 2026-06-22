"""Import Redrob challenge candidates.jsonl into the web app database.

The offline ranker (rank.py) reads 100K profiles directly. The UI uses SQLite
and defaults to 12 demo candidates from seed.py. This script bridges them by
loading ranked challenge profiles into the dashboard.

Usage:
  python -m app.data.import_challenge --top-100
  python -m app.data.import_challenge --limit 500 --jsonl ../data/candidates.jsonl
  python -m app.data.import_challenge --top-100 --replace   # drop demo candidates first
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set

from sqlalchemy import delete, select

from app.config import get_settings
from app.models.database import CandidateORM
from app.models.db import create_all, get_session_maker
from app.models.schemas import CandidateCreate, Project, SkillProficiency, WorkExperience
from app.services.candidate_repo import create_candidate
from app.services.indexing import index_candidate

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("import_challenge")

_PROF_MAP = {"beginner": 1, "intermediate": 2, "advanced": 4, "expert": 5}
ROOT = Path(__file__).resolve().parents[3]


def _load_ids_from_submission(path: Path) -> List[str]:
    ids: List[str] = []
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            ids.append(row["candidate_id"].strip())
    return ids


def _iter_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def _lookup_by_ids(jsonl: Path, ids: Set[str]) -> Dict[str, Dict[str, Any]]:
    found: Dict[str, Dict[str, Any]] = {}
    remaining = set(ids)
    for raw in _iter_jsonl(jsonl):
        cid = raw.get("candidate_id")
        if cid in remaining:
            found[cid] = raw
            remaining.discard(cid)
            if not remaining:
                break
    return found


def _map_record(raw: Dict[str, Any]) -> CandidateCreate:
    cid = raw["candidate_id"]
    profile = raw.get("profile", {})
    signals = raw.get("redrob_signals", {})

    skills: List[SkillProficiency] = []
    for s in raw.get("skills", []):
        months = int(s.get("duration_months", 0) or 0)
        skills.append(
            SkillProficiency(
                name=s.get("name", "Unknown"),
                proficiency=_PROF_MAP.get(str(s.get("proficiency", "")).lower(), 3),
                years=round(months / 12, 1),
            )
        )

    experiences: List[WorkExperience] = []
    for h in raw.get("career_history", []):
        experiences.append(
            WorkExperience(
                company=h.get("company", ""),
                role=h.get("title", ""),
                start_date=(h.get("start_date") or "")[:7],
                end_date=(h.get("end_date") or "")[:7] if h.get("end_date") else None,
                description=h.get("description", ""),
                is_current=bool(h.get("is_current")),
            )
        )

    edu = raw.get("education") or []
    school = edu[0].get("institution") if edu else None

    gh = signals.get("github_activity_score")
    github_stats = None
    if gh is not None and float(gh) >= 0:
        score = float(gh)
        github_stats = {
            "commits_per_month": int(score / 3),
            "public_repos": max(1, int(score / 10)),
            "total_stars": int(score * 5),
            "contributions_last_year": int(score * 4),
            "redrob_github_activity_score": score,
        }

    summary = profile.get("summary", "")
    signal_lines = [
        f"Redrob ID: {cid}",
        f"Response rate: {signals.get('recruiter_response_rate', 'n/a')}",
        f"Profile completeness: {signals.get('profile_completeness_score', 'n/a')}",
        f"Saved by recruiters (30d): {signals.get('saved_by_recruiters_30d', 'n/a')}",
    ]

    return CandidateCreate(
        full_name=profile.get("anonymized_name") or cid,
        email=f"{cid.lower()}@redrob.challenge",
        headline=profile.get("headline"),
        location=profile.get("location"),
        current_role=profile.get("current_title"),
        years_experience=int(round(float(profile.get("years_of_experience", 0) or 0))),
        resume_text="\n\n".join([summary, *signal_lines]).strip(),
        school=school,
        skills=skills,
        experiences=experiences,
        projects=[],
        certifications=[
            f"{c.get('name')} ({c.get('issuer', '')}, {c.get('year', '')})"
            for c in raw.get("certifications", [])
        ],
        github_stats=github_stats,
    )


async def import_candidates(
    *,
    jsonl_path: Path,
    owner_id: str,
    candidate_ids: Optional[List[str]] = None,
    limit: Optional[int] = None,
    replace: bool = False,
) -> int:
    await create_all()
    session_maker = get_session_maker()

    ids: List[str]
    if candidate_ids:
        ids = candidate_ids[: limit or len(candidate_ids)]
    else:
        ids = []
        for i, raw in enumerate(_iter_jsonl(jsonl_path)):
            if limit and i >= limit:
                break
            ids.append(raw["candidate_id"])

    if not ids:
        log.warning("No candidate IDs to import.")
        return 0

    log.info("Importing %d candidates from %s", len(ids), jsonl_path)
    records = _lookup_by_ids(jsonl_path, set(ids))
    missing = [i for i in ids if i not in records]
    if missing:
        log.warning("Missing %d IDs in jsonl (first: %s)", len(missing), missing[:3])

    imported = 0
    async with session_maker() as session:
        if replace:
            await session.execute(
                delete(CandidateORM).where(CandidateORM.owner_id == owner_id)
            )
            await session.commit()
            log.info("Cleared existing candidates for owner=%s", owner_id)

        for cid in ids:
            raw = records.get(cid)
            if not raw:
                continue
            payload = _map_record(raw)
            profile = await create_candidate(session, payload, owner_id=owner_id)
            # Store Redrob linkage on ORM row
            row = await session.get(CandidateORM, str(profile.id))
            if row:
                row.extra_metadata = {
                    "redrob_candidate_id": cid,
                    "redrob_signals": raw.get("redrob_signals", {}),
                    "source": "challenge_jsonl",
                }
            index_candidate(profile)
            imported += 1
            if imported % 25 == 0:
                log.info("  … %d imported", imported)

        await session.commit()

    log.info("Done — imported %d candidates (owner=%s)", imported, owner_id)
    return imported


async def _main() -> None:
    p = argparse.ArgumentParser(description="Import Redrob jsonl into web app DB")
    p.add_argument(
        "--jsonl",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
        help="Path to candidates.jsonl",
    )
    p.add_argument(
        "--submission",
        type=Path,
        default=ROOT / "submission.csv",
        help="submission.csv for --top-100",
    )
    p.add_argument("--top-100", action="store_true", help="Import ranked top 100 from submission.csv")
    p.add_argument("--limit", type=int, default=None, help="Import first N from jsonl")
    p.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing candidates for dev-user before import",
    )
    args = p.parse_args()

    if not args.jsonl.exists():
        alt = Path(
            "/Users/rahulkumarsinghj/DeveloperFolder/Code/ai_rca_platform/"
            "India_runs_data_and_ai_challenge/candidates.jsonl"
        )
        if alt.exists():
            args.jsonl = alt
            log.info("Using challenge jsonl at %s", alt)
        else:
            raise SystemExit(f"jsonl not found: {args.jsonl}")

    settings = get_settings()
    owner = settings.default_dev_user_id

    ids: Optional[List[str]] = None
    limit = args.limit
    if args.top_100:
        if not args.submission.exists():
            raise SystemExit(f"submission.csv not found: {args.submission}")
        ids = _load_ids_from_submission(args.submission)
        log.info("Loading top %d from %s", len(ids), args.submission)

    n = await import_candidates(
        jsonl_path=args.jsonl,
        owner_id=owner,
        candidate_ids=ids,
        limit=limit,
        replace=args.replace,
    )
    print(f"Imported {n} challenge candidates into the web app database.")


if __name__ == "__main__":
    asyncio.run(_main())