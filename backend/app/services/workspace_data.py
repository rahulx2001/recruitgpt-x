"""Single source of truth for workspace UI data (candidates + submission.csv)."""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.database import CandidateORM
from app.services.job_repo import list_jobs
from app.utils.pii_crypto import decrypt_pii

_ROOT = Path(__file__).resolve().parents[3]
_SUBMISSION = _ROOT / "submission.csv"

_FUNNEL_COLORS = {
    "Applied": "#5d2a1a",
    "Screened": "#6b3826",
    "Interview": "#7d4832",
    "Offer": "#915640",
    "Hired": "#a6654e",
}
_FUNNEL_ORDER = ["Applied", "Screened", "Interview", "Offer", "Hired"]


@dataclass
class RankingEntry:
    candidate_id: str
    rank: int
    score: float
    reasoning: str = ""


@dataclass
class CandidateRow:
    orm: CandidateORM
    redrob_id: str
    ranking: Optional[RankingEntry] = None


@dataclass
class WorkspaceContext:
    candidates: List[CandidateRow] = field(default_factory=list)
    rankings: Dict[str, RankingEntry] = field(default_factory=dict)
    submission_ids: List[str] = field(default_factory=list)
    pool_label: str = "challenge_top_100"

    @property
    def total(self) -> int:
        return len(self.candidates)

    @property
    def matched_count(self) -> int:
        return sum(1 for c in self.candidates if c.ranking is not None)

    @property
    def sync_ok(self) -> bool:
        return self.total > 0 and self.matched_count == self.total == len(self.submission_ids)


def load_submission_rankings() -> Dict[str, RankingEntry]:
    if not _SUBMISSION.exists():
        return {}
    out: Dict[str, RankingEntry] = {}
    with open(_SUBMISSION, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            cid = row["candidate_id"].strip().upper()
            out[cid] = RankingEntry(
                candidate_id=cid,
                rank=int(row["rank"]),
                score=float(row["score"]),
                reasoning=row.get("reasoning", ""),
            )
    return out


def load_submission_ids() -> List[str]:
    if not _SUBMISSION.exists():
        return []
    with open(_SUBMISSION, encoding="utf-8", newline="") as f:
        return [row["candidate_id"].strip().upper() for row in csv.DictReader(f)]


def resolve_redrob_id(orm: CandidateORM) -> Optional[str]:
    meta = orm.extra_metadata or {}
    stored = meta.get("redrob_candidate_id")
    if stored:
        return str(stored).strip().upper()

    email = decrypt_pii(orm.email) or ""
    if isinstance(email, str) and "@redrob.challenge" in email.lower():
        local = email.split("@", 1)[0].strip()
        return local.upper()

    resume = decrypt_pii(orm.resume_text) or ""
    m = re.search(r"Redrob ID:\s*(\S+)", resume, re.I)
    return m.group(1).strip().upper() if m else None


async def load_workspace_context(
    session: AsyncSession,
    owner_id: str,
) -> WorkspaceContext:
    rankings = load_submission_rankings()
    submission_ids = load_submission_ids()

    stmt = (
        select(CandidateORM)
        .where(CandidateORM.owner_id == owner_id)
        .options(
            selectinload(CandidateORM.experiences),
            selectinload(CandidateORM.skills),
        )
        .order_by(CandidateORM.created_at)
    )
    res = await session.execute(stmt)
    orms = list(res.scalars().all())

    rows: List[CandidateRow] = []
    for orm in orms:
        rid = resolve_redrob_id(orm)
        if not rid:
            continue
        rows.append(
            CandidateRow(
                orm=orm,
                redrob_id=rid,
                ranking=rankings.get(rid),
            )
        )

    pool_label = "challenge_top_100" if len(rows) <= 100 else "imported_pool"
    return WorkspaceContext(
        candidates=rows,
        rankings=rankings,
        submission_ids=submission_ids,
        pool_label=pool_label,
    )


def score_to_stage(rank: int, score: float) -> str:
    if rank <= 10:
        return "Interview"
    if rank <= 30:
        return "Screened"
    if rank <= 60:
        return "Applied"
    if score >= 0.8:
        return "Offer"
    return "Applied"


def score_to_recommendation(score: float) -> str:
    if score >= 0.88:
        return "Strong Hire"
    if score >= 0.75:
        return "Hire"
    if score >= 0.6:
        return "Lean Hire"
    return "Hold"


def build_funnel(ctx: WorkspaceContext) -> List[dict]:
    counts = {s: 0 for s in _FUNNEL_ORDER}
    for row in ctx.candidates:
        rank = row.ranking.rank if row.ranking else 999
        score = row.ranking.score if row.ranking else 0.0
        stage = score_to_stage(rank, score)
        counts[stage] = counts.get(stage, 0) + 1
    return [
        {
            "stage": stage,
            "count": counts.get(stage, 0),
            "color": _FUNNEL_COLORS.get(stage, "#3A3D43"),
        }
        for stage in _FUNNEL_ORDER
    ]


def sorted_by_rank(ctx: WorkspaceContext) -> List[CandidateRow]:
    return sorted(
        ctx.candidates,
        key=lambda r: r.ranking.rank if r.ranking else 999,
    )


def top_skills(ctx: WorkspaceContext, limit: int = 8) -> List[str]:
    freq: Dict[str, int] = {}
    for row in ctx.candidates:
        for sk in row.orm.skills or []:
            name = (sk.skill_name or "").strip()
            if name:
                freq[name] = freq.get(name, 0) + 1
    return [k for k, _ in sorted(freq.items(), key=lambda x: -x[1])[:limit]]


async def jobs_for_owner(session: AsyncSession, owner_id: str) -> list:
    return await list_jobs(session, owner_id)


ROLE_CATALOG: List[dict] = [
    {
        "slug": "senior-ml-engineer",
        "title": "Senior ML Engineer",
        "department": "Engineering",
        "location": "Pune / Remote",
        "owner": "Jordan Lee",
        "owner_color": "#4F46E5",
        "status": "Interviewing",
        "keywords": (
            "machine learning",
            "ml engineer",
            "recommendation",
            "ranking",
            "retrieval",
            "pytorch",
            "tensorflow",
            "embedding",
            "recsys",
            "nlp",
            "computer vision",
        ),
    },
    {
        "slug": "data-scientist",
        "title": "Data Scientist",
        "department": "Data",
        "location": "Remote (India)",
        "owner": "Jordan Lee",
        "owner_color": "#4F46E5",
        "status": "Interviewing",
        "keywords": (
            "data scientist",
            "statistician",
            "experimentation",
            "causal",
            "analytics",
            "ab test",
            "forecasting",
        ),
    },
    {
        "slug": "backend-engineer",
        "title": "Backend Engineer",
        "department": "Engineering",
        "location": "Pune / Hybrid",
        "owner": "Alex Romero",
        "owner_color": "#2563EB",
        "status": "Offer stage",
        "keywords": (
            "backend",
            "golang",
            "java",
            "node.js",
            "microservice",
            "kafka",
            "postgresql",
            "distributed systems",
            "api engineer",
        ),
    },
    {
        "slug": "product-analyst",
        "title": "Product Analyst",
        "department": "Data",
        "location": "Bengaluru",
        "owner": "Priya Raman",
        "owner_color": "#0E9F6E",
        "status": "Open",
        "keywords": (
            "product analyst",
            "product analytics",
            "growth analyst",
            "funnel",
            "amplitude",
            "mixpanel",
            "sql analyst",
        ),
    },
    {
        "slug": "business-analyst",
        "title": "Business Analyst",
        "department": "Operations",
        "location": "Noida",
        "owner": "Sam Devi",
        "owner_color": "#C2780C",
        "status": "Open",
        "keywords": (
            "business analyst",
            "operations analyst",
            "stakeholder",
            "requirements",
            "process mapping",
            "excel",
        ),
    },
]


def _profile_text(row: CandidateRow) -> str:
    orm = row.orm
    skills = " ".join((s.skill_name or "") for s in (orm.skills or []))
    return " ".join(
        filter(
            None,
            [
                orm.current_role or "",
                orm.headline or "",
                skills,
                row.ranking.reasoning if row.ranking else "",
            ],
        )
    ).lower()


def assign_candidate_role(row: CandidateRow) -> str:
    text = _profile_text(row)
    best_title = ROLE_CATALOG[0]["title"]
    best_score = 0
    for role in ROLE_CATALOG:
        score = sum(1 for kw in role["keywords"] if kw in text)
        if score > best_score:
            best_score = score
            best_title = role["title"]
    if best_score == 0:
        rid = row.redrob_id
        idx = sum(ord(ch) for ch in rid) % len(ROLE_CATALOG)
        best_title = ROLE_CATALOG[idx]["title"]
    return best_title


def role_catalog_by_title() -> Dict[str, dict]:
    return {r["title"]: r for r in ROLE_CATALOG}


def _normalize_title(title: str) -> str:
    t = title.lower().replace("machine learning", "ml")
    return re.sub(r"[^a-z0-9]+", "", t)


def title_similarity(a: str, b: str) -> int:
    na = _normalize_title(a)
    nb = _normalize_title(b)
    if not na or not nb:
        return 0
    if na in nb or nb in na:
        return max(len(na), len(nb))
    tokens_a = set(re.findall(r"[a-z]+", a.lower()))
    tokens_b = set(re.findall(r"[a-z]+", b.lower()))
    return len(tokens_a & tokens_b)


def best_role_for_job(job_title: str) -> str:
    best_title = ROLE_CATALOG[0]["title"]
    best_score = 0
    for role in ROLE_CATALOG:
        score = title_similarity(job_title, role["title"])
        if score > best_score:
            best_score = score
            best_title = role["title"]
    return best_title


def candidate_matches_job(row: CandidateRow, job_title: str) -> bool:
    assigned = assign_candidate_role(row)
    target_role = best_role_for_job(job_title)
    if assigned == target_role:
        return True
    nj = _normalize_title(job_title)
    na = _normalize_title(assigned)
    nt = _normalize_title(target_role)
    return bool(na and (na in nj or nj in na or nt in nj or nj in nt))


def job_display_meta(job_title: str, description: str = "") -> dict:
    dept = ""
    location = ""
    for line in description.split("\n")[:6]:
        line = line.strip()
        if line.lower().startswith("department:"):
            dept = line.split(":", 1)[1].strip()
        if line.lower().startswith("location:"):
            location = line.split(":", 1)[1].strip()

    catalog = role_catalog_by_title()
    role = catalog.get(best_role_for_job(job_title), ROLE_CATALOG[0])
    return {
        "department": dept or role["department"],
        "location": location or role["location"],
        "owner": role["owner"],
        "owner_color": role["owner_color"],
        "status": role["status"],
    }