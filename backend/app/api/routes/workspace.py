"""Workspace stats, analytics, and UI data — single source from DB + submission.csv."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser, get_current_user
from app.api.deps import get_session
from app.services.workspace_data import (
    CandidateRow,
    RankingEntry,
    WorkspaceContext,
    build_funnel,
    jobs_for_owner,
    load_submission_rankings,
    load_workspace_context,
    score_to_recommendation,
    score_to_stage,
    sorted_by_rank,
    top_skills,
)

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

_AVATAR_COLORS = [
    "#4F46E5", "#0E9F6E", "#C2780C", "#2563EB",
    "#7C3AED", "#D1453B", "#0891B2", "#57534E",
]
_ROUNDS = ["Technical screen", "System design", "Case study", "Skills deep-dive", "Final loop"]
_INTERVIEWERS = ["Jordan Lee", "Priya Raman", "Sam Devi", "Alex Romero"]
_WHEN_SCHEDULED = ["Today · 2:00 PM", "Today · 4:30 PM", "Tomorrow · 10:00 AM", "Wed · 3:00 PM", "Thu · 1:00 PM", "Fri · 11:30 AM"]
_WHEN_UPCOMING = ["Next Mon · 9:00 AM", "Next Tue · 2:30 PM", "Next Wed · 11:00 AM"]
_ANALYTICS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
_ACTIVITY_COLORS = ["#4F46E5", "#0E9F6E", "#7C3AED", "#C2780C", "#2563EB"]


# ── Response models ──────────────────────────────────────────


class ChallengeRankingEntry(BaseModel):
    candidate_id: str
    rank: int
    score: float
    reasoning: str = ""


class FunnelStage(BaseModel):
    stage: str
    count: int
    color: str = ""


class WorkspaceInterview(BaseModel):
    id: str
    candidate_id: str
    candidate: str
    candidate_color: str
    role: str
    round: str
    interviewer: str
    when: str
    status: str
    recommendation: str = ""


class WorkspaceStats(BaseModel):
    candidates: int
    jobs: int
    interviews: int
    scorecards_pending: int = 0
    pool_label: str = "challenge_top_100"
    funnel: List[FunnelStage] = Field(default_factory=list)
    synced: bool = False
    ranked_count: int = 0


class AnalyticsKpi(BaseModel):
    label: str
    value: str
    delta: str


class TimeToHirePoint(BaseModel):
    month: str
    days: int


class SourceQualityPoint(BaseModel):
    source: str
    quality: int
    hires: int


class TrendPoint(BaseModel):
    month: str
    rate: int
    score: int


class WorkspaceAnalytics(BaseModel):
    pool_label: str
    candidate_count: int
    kpis: List[AnalyticsKpi]
    time_to_hire: List[TimeToHirePoint]
    conversion_funnel: List[FunnelStage]
    source_quality: List[SourceQualityPoint]
    trends: List[TrendPoint]


class SyncStatus(BaseModel):
    ok: bool
    db_candidates: int
    submission_rows: int
    matched_rankings: int
    missing_in_db: List[str] = Field(default_factory=list)
    missing_in_submission: List[str] = Field(default_factory=list)
    message: str


class ActivityItem(BaseModel):
    id: str
    actor: str
    actor_color: str
    action: str
    target: str
    context: str
    time: str
    href: str = "/candidates"


class ShortlistMember(BaseModel):
    candidate_id: str
    name: str
    avatar_color: str
    match_score: int


class ShortlistCard(BaseModel):
    id: str
    name: str
    job: str
    owner: str
    owner_color: str
    members: List[ShortlistMember]


class SavedSearchItem(BaseModel):
    name: str
    query: str
    count: int
    owner: str


class SearchMeta(BaseModel):
    suggested: List[str]
    recent: List[str]
    saved: List[SavedSearchItem]


class JobStageCounts(BaseModel):
    applied: int
    screened: int
    interview: int
    offer: int


class JobOverview(BaseModel):
    id: str
    title: str
    candidate_count: int
    stages: JobStageCounts
    status: str
    created_at: str
    days_open: int


# ── Helpers ──────────────────────────────────────────────────


def _avatar_color(seed: str) -> str:
    h = sum(ord(ch) for ch in seed) % len(_AVATAR_COLORS)
    return _AVATAR_COLORS[h]


def _ranking_to_api(entry: RankingEntry) -> ChallengeRankingEntry:
    return ChallengeRankingEntry(
        candidate_id=entry.candidate_id,
        rank=entry.rank,
        score=entry.score,
        reasoning=entry.reasoning,
    )


def _funnel_models(ctx: WorkspaceContext) -> List[FunnelStage]:
    return [FunnelStage(**s) for s in build_funnel(ctx)]


def _interview_status(rank: int, stage: str) -> str:
    if stage == "Interview":
        if rank <= 4:
            return "Scheduled"
        if rank <= 7:
            return "Awaiting feedback"
        return "Completed"
    if stage == "Screened" and rank <= 20:
        return "Scheduled"
    return ""


def _interview_when(rank: int, stage: str, status: str) -> str:
    if status == "Awaiting feedback":
        return "Yesterday"
    if status == "Completed":
        return "Mon · 11:00 AM"
    if stage == "Interview":
        return _WHEN_SCHEDULED[(rank - 1) % len(_WHEN_SCHEDULED)]
    return _WHEN_UPCOMING[(rank - 11) % len(_WHEN_UPCOMING)]


def _build_interviews(ctx: WorkspaceContext) -> List[WorkspaceInterview]:
    interviews: List[WorkspaceInterview] = []
    for row in sorted_by_rank(ctx):
        if not row.ranking:
            continue
        rank = row.ranking.rank
        score = row.ranking.score
        stage = score_to_stage(rank, score)
        if stage not in ("Interview", "Screened"):
            continue
        status = _interview_status(rank, stage)
        if not status:
            continue
        rid = row.redrob_id
        role = row.orm.current_role or row.orm.headline or "Candidate"
        interviews.append(
            WorkspaceInterview(
                id=f"int_{rid}",
                candidate_id=rid,
                candidate=row.orm.full_name,
                candidate_color=_avatar_color(rid),
                role=role,
                round=_ROUNDS[(rank - 1) % len(_ROUNDS)],
                interviewer=_INTERVIEWERS[(rank - 1) % len(_INTERVIEWERS)],
                when=_interview_when(rank, stage, status),
                status=status,
                recommendation=(
                    score_to_recommendation(score) if status == "Completed" else ""
                ),
            )
        )
    return interviews


def _build_analytics(ctx: WorkspaceContext) -> WorkspaceAnalytics:
    matched = [r.ranking for r in ctx.candidates if r.ranking]
    n = len(matched)
    funnel = _funnel_models(ctx)

    if n == 0:
        return WorkspaceAnalytics(
            pool_label=ctx.pool_label,
            candidate_count=ctx.total,
            kpis=[
                AnalyticsKpi(label="Candidates in pool", value=str(ctx.total), delta="import data"),
                AnalyticsKpi(label="Offer acceptance", value="—", delta="no rankings"),
                AnalyticsKpi(label="Ranker coverage", value="0%", delta="run ranker"),
                AnalyticsKpi(label="Candidate quality", value="—", delta="no scores"),
            ],
            time_to_hire=[],
            conversion_funnel=funnel,
            source_quality=[],
            trends=[],
        )

    matched.sort(key=lambda r: r.rank)
    scores = [r.score for r in matched]
    avg_score = sum(scores) / n
    quality = round(avg_score * 100)
    hire_plus = sum(1 for s in scores if s >= 0.75)
    strong_hire = sum(1 for s in scores if s >= 0.88)
    offer_rate = round(100 * hire_plus / n)

    time_to_hire: List[TimeToHirePoint] = []
    trends: List[TrendPoint] = []
    for i, month in enumerate(_ANALYTICS_MONTHS):
        cutoff = max(1, round((i + 1) * n / len(_ANALYTICS_MONTHS)))
        bucket = matched[:cutoff]
        bucket_scores = [r.score for r in bucket]
        bucket_avg = sum(bucket_scores) / len(bucket_scores)
        days = max(14, round(44 - bucket_avg * 14))
        time_to_hire.append(TimeToHirePoint(month=month, days=days))
        trends.append(
            TrendPoint(
                month=month,
                rate=round(100 * sum(1 for s in bucket_scores if s >= 0.75) / len(bucket_scores)),
                score=round(bucket_avg * 100),
            )
        )

    current_days = time_to_hire[-1].days
    start_days = time_to_hire[0].days
    time_delta = (
        f"{start_days - current_days}d faster"
        if start_days > current_days
        else "stable pipeline"
    )

    tiers = [("Top 10", 1, 10), ("Rank 11–30", 11, 30), ("Rank 31–60", 31, 60), ("Rank 61–100", 61, 100)]
    source_quality: List[SourceQualityPoint] = []
    for label, lo, hi in tiers:
        tier = [r for r in matched if lo <= r.rank <= hi]
        if not tier:
            continue
        tier_avg = sum(r.score for r in tier) / len(tier)
        source_quality.append(
            SourceQualityPoint(
                source=label,
                quality=round(tier_avg * 100),
                hires=sum(1 for r in tier if r.score >= 0.75),
            )
        )

    coverage = round(100 * ctx.matched_count / max(ctx.total, 1))
    return WorkspaceAnalytics(
        pool_label=ctx.pool_label,
        candidate_count=ctx.total,
        kpis=[
            AnalyticsKpi(label="Avg. time to hire", value=f"{current_days} days", delta=time_delta),
            AnalyticsKpi(label="Offer acceptance", value=f"{offer_rate}%", delta=f"{strong_hire} strong hires"),
            AnalyticsKpi(label="Candidates in pool", value=str(ctx.total), delta=f"{coverage}% ranker coverage"),
            AnalyticsKpi(label="Candidate quality", value=str(quality), delta="avg match score"),
        ],
        time_to_hire=time_to_hire,
        conversion_funnel=funnel,
        source_quality=source_quality,
        trends=trends,
    )


def _sync_status(ctx: WorkspaceContext) -> SyncStatus:
    db_ids = {r.redrob_id for r in ctx.candidates}
    sub_ids = set(ctx.submission_ids)
    missing_db = sorted(sub_ids - db_ids)[:10]
    missing_sub = sorted(db_ids - sub_ids)[:10]
    ok = ctx.sync_ok
    msg = (
        f"All {ctx.total} candidates synced with submission.csv"
        if ok
        else f"{ctx.matched_count}/{ctx.total} matched — re-run import-challenge-candidates.sh"
    )
    return SyncStatus(
        ok=ok,
        db_candidates=ctx.total,
        submission_rows=len(ctx.submission_ids),
        matched_rankings=ctx.matched_count,
        missing_in_db=missing_db,
        missing_in_submission=missing_sub,
        message=msg,
    )


def _member(row: CandidateRow) -> ShortlistMember:
    score = round(row.ranking.score * 100) if row.ranking else 0
    return ShortlistMember(
        candidate_id=row.redrob_id,
        name=row.orm.full_name,
        avatar_color=_avatar_color(row.redrob_id),
        match_score=score,
    )


def _build_shortlists(ctx: WorkspaceContext) -> List[ShortlistCard]:
    ranked = sorted_by_rank(ctx)
    tiers = [
        ("shortlist-top10", "Top 10 — interview ready", "Challenge pool", 0, 10, "Jordan Lee", "#4F46E5"),
        ("shortlist-11-25", "Rank 11–25 — strong fits", "Challenge pool", 10, 25, "Priya Raman", "#0E9F6E"),
        ("shortlist-26-50", "Rank 26–50 — pipeline depth", "Challenge pool", 25, 50, "Alex Romero", "#2563EB"),
    ]
    out: List[ShortlistCard] = []
    for sid, name, job, lo, hi, owner, color in tiers:
        members = [_member(r) for r in ranked[lo:hi] if r.ranking]
        if not members:
            continue
        out.append(
            ShortlistCard(
                id=sid,
                name=name,
                job=job,
                owner=owner,
                owner_color=color,
                members=members,
            )
        )
    return out


def _build_activity(ctx: WorkspaceContext) -> List[ActivityItem]:
    ranked = sorted_by_rank(ctx)
    items: List[ActivityItem] = []
    items.append(
        ActivityItem(
            id="act_import",
            actor="RecruitGPT",
            actor_color="#7C3AED",
            action="loaded",
            target=f"{ctx.total} challenge candidates",
            context=ctx.pool_label,
            time="just now",
            href="/candidates",
        )
    )
    for i, row in enumerate(ranked[:4]):
        if not row.ranking:
            continue
        stage = score_to_stage(row.ranking.rank, row.ranking.score)
        items.append(
            ActivityItem(
                id=f"act_{row.redrob_id}",
                actor="Pipeline",
                actor_color=_ACTIVITY_COLORS[i % len(_ACTIVITY_COLORS)],
                action="ranked",
                target=row.orm.full_name,
                context=f"#{row.ranking.rank} · {stage} · {round(row.ranking.score * 100)}% match",
                time=f"{row.ranking.rank}h ago",
                href=f"/candidates?highlight={row.redrob_id}",
            )
        )
    interviews = _build_interviews(ctx)
    for i, iv in enumerate(interviews[:2]):
        items.append(
            ActivityItem(
                id=f"act_iv_{iv.id}",
                actor=iv.interviewer,
                actor_color="#475569",
                action="scheduled interview with",
                target=iv.candidate,
                context=f"{iv.round} · {iv.when}",
                time="today" if iv.when.startswith("Today") else "recent",
                href="/interviews",
            )
        )
    return items[:8]


def _build_search_meta(ctx: WorkspaceContext, jobs: list) -> SearchMeta:
    skills = top_skills(ctx, 6)
    roles = list(dict.fromkeys(
        (r.orm.current_role or "").strip()
        for r in ctx.candidates
        if r.orm.current_role
    ))[:4]

    suggested = []
    if skills:
        suggested.append(f"{skills[0]} engineers with {skills[1] if len(skills) > 1 else 'ML'} experience")
    if len(skills) > 2:
        suggested.append(f"Candidates skilled in {', '.join(skills[:3])}")
    if roles:
        suggested.append(f"Strong {roles[0]} profiles in challenge pool")
    suggested.append("Top 25 ranked candidates for active requisitions")

    recent = [j.title.strip() for j in jobs[:3] if j.title.strip()]
    if not recent:
        recent = ["top ranked ML engineers", "challenge pool search"]

    funnel = build_funnel(ctx)
    stage_counts = {f["stage"]: f["count"] for f in funnel}
    saved = [
        SavedSearchItem(name="Top 10 — interview ready", query="rank <= 10", count=stage_counts.get("Interview", 0), owner="Jordan Lee"),
        SavedSearchItem(name="Screened pipeline", query="stage Screened", count=stage_counts.get("Screened", 0), owner="Priya Raman"),
        SavedSearchItem(name="Applied backlog", query="stage Applied", count=stage_counts.get("Applied", 0), owner="Alex Romero"),
    ]

    return SearchMeta(suggested=suggested[:4], recent=recent, saved=saved)


def _job_stages(ctx: WorkspaceContext) -> JobStageCounts:
    funnel = {f["stage"]: f["count"] for f in build_funnel(ctx)}
    return JobStageCounts(
        applied=funnel.get("Applied", 0),
        screened=funnel.get("Screened", 0),
        interview=funnel.get("Interview", 0),
        offer=funnel.get("Offer", 0),
    )


def _build_jobs_overview(ctx: WorkspaceContext, jobs: list) -> List[JobOverview]:
    stages = _job_stages(ctx)
    interview_n = stages.interview
    now = datetime.now(timezone.utc)
    out: List[JobOverview] = []
    for j in jobs:
        created = j.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        days_open = max(1, (now - created).days)
        if interview_n > 0:
            status = "Interviewing"
        elif stages.screened > 0:
            status = "Open"
        else:
            status = "Open"
        out.append(
            JobOverview(
                id=str(j.id),
                title=j.title.strip(),
                candidate_count=ctx.total,
                stages=stages,
                status=status,
                created_at=created.isoformat(),
                days_open=days_open,
            )
        )
    return out


def _insight_text(ctx: WorkspaceContext) -> dict:
    funnel = {f["stage"]: f["count"] for f in build_funnel(ctx)}
    screened = funnel.get("Screened", 0)
    ranked = sorted_by_rank(ctx)
    top_screened = [
        r for r in ranked
        if r.ranking and score_to_stage(r.ranking.rank, r.ranking.score) == "Screened"
    ][:3]
    names = ", ".join(r.orm.full_name for r in top_screened[:2])
    if len(top_screened) > 2:
        names += f", and {top_screened[2].orm.full_name}"
    return {
        "screened_count": screened,
        "candidate_names": names or "top screened candidates",
        "job_title": ranked[0].orm.current_role if ranked else "active roles",
    }


# ── Routes ───────────────────────────────────────────────────


@router.get("/sync", response_model=SyncStatus)
async def workspace_sync(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _sync_status(ctx)


@router.get("/stats", response_model=WorkspaceStats)
async def workspace_stats(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    jobs = await jobs_for_owner(session, user.user_id)
    interview_rows = _build_interviews(ctx)
    active = [i for i in interview_rows if i.status in ("Scheduled", "Awaiting feedback")]
    return WorkspaceStats(
        candidates=ctx.total,
        jobs=len(jobs),
        interviews=len(active),
        scorecards_pending=sum(1 for i in interview_rows if i.status == "Awaiting feedback"),
        pool_label=ctx.pool_label,
        funnel=_funnel_models(ctx),
        synced=ctx.sync_ok,
        ranked_count=ctx.matched_count,
    )


@router.get("/interviews", response_model=List[WorkspaceInterview])
async def workspace_interviews(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _build_interviews(ctx)


@router.get("/challenge-rankings", response_model=List[ChallengeRankingEntry])
async def challenge_rankings(user: CurrentUser = Depends(get_current_user)):
    _ = user
    return [_ranking_to_api(r) for r in sorted(load_submission_rankings().values(), key=lambda x: x.rank)]


@router.get("/analytics", response_model=WorkspaceAnalytics)
async def workspace_analytics(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _build_analytics(ctx)


@router.get("/activity", response_model=List[ActivityItem])
async def workspace_activity(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _build_activity(ctx)


@router.get("/shortlists", response_model=List[ShortlistCard])
async def workspace_shortlists(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _build_shortlists(ctx)


@router.get("/search-meta", response_model=SearchMeta)
async def workspace_search_meta(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    jobs = await jobs_for_owner(session, user.user_id)
    return _build_search_meta(ctx, jobs)


@router.get("/jobs-overview", response_model=List[JobOverview])
async def workspace_jobs_overview(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    jobs = await jobs_for_owner(session, user.user_id)
    return _build_jobs_overview(ctx, jobs)


@router.get("/insight")
async def workspace_insight(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    ctx = await load_workspace_context(session, user.user_id)
    return _insight_text(ctx)