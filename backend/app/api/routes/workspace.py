"""Workspace stats, analytics, and UI data — single source from DB + submission.csv."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser, get_current_user
from app.config import get_settings
from app.api.deps import get_session
from app.models.schemas import RankedCandidate
from app.services.ranking_repo import get_cached_ranking
from app.services.workspace_data import (
    CandidateRow,
    RankingEntry,
    WorkspaceContext,
    assign_candidate_role,
    best_role_for_job,
    build_funnel,
    candidate_matches_job,
    job_display_meta,
    jobs_for_owner,
    role_catalog_by_title,
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
_SCHEDULE_SLOTS = [(9, 0), (11, 0), (14, 0), (16, 30), (10, 0), (15, 0)]
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
    rank: int = 0
    match_score: int = 0
    pipeline_stage: str = ""
    concern: str = ""
    starts_in_minutes: Optional[int] = None
    meeting_url: str = ""
    scorecard_status: str = ""


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


class HistogramBin(BaseModel):
    bin: str
    count: int


class RecommendationMixItem(BaseModel):
    tier: str
    count: int
    pct: float


class StageConversion(BaseModel):
    from_stage: str
    to_stage: str
    rate: float


class RankBucketPoint(BaseModel):
    bucket: str
    avg_score: int
    count: int
    strong_hire_pct: float
    hires: int = 0


class SignalCoveragePoint(BaseModel):
    signal: str
    top10_pct: float
    pool_pct: float
    lift: float = 0.0


class AnalyticsInsight(BaseModel):
    severity: str
    message: str
    href: str


class JobPipelineRow(BaseModel):
    job_id: str
    title: str
    applied: int
    screened: int
    interview: int
    offer: int
    strong_hires: int
    days_open: int


class RankScatterPoint(BaseModel):
    rank: int
    score: int
    candidate_id: str
    name: str
    recommendation: str


class StageVelocityPoint(BaseModel):
    stage: str
    median_days: int


class TopCandidateRow(BaseModel):
    candidate_id: str
    name: str
    rank: int
    score: int
    stage: str
    recommendation: str = ""
    top_signal: str
    concern: str = ""


class AttentionQueueItem(BaseModel):
    id: str
    rank: Optional[int] = None
    name: str
    subtitle: str
    detail: str = ""
    recommendation: str = ""
    stage: str = ""
    href: str
    action_label: str
    priority: int


class WorkspaceUserProfile(BaseModel):
    name: str
    role: str
    company: str
    email: str
    color: str
    avatar_url: str


class InterviewsSummary(BaseModel):
    scheduled: int
    awaiting_feedback: int
    completed: int
    pass_rate: int


class ExecutiveKpi(BaseModel):
    label: str
    value: str
    delta: str
    hint: str = ""
    href: str = ""
    definition: str = ""
    delta_positive: bool = True


class HealthAlertItem(BaseModel):
    kind: str  # warn | ok
    message: str
    href: str = ""


class RecruitingHealth(BaseModel):
    title: str = "Recruiting health"
    alerts: List[HealthAlertItem] = Field(default_factory=list)
    cta_label: str = "Review candidates"
    cta_href: str = "/candidates"


class AiSummary(BaseModel):
    headline: str
    bottleneck: str
    risk: str
    recommendation: str


class SyncStatus(BaseModel):
    ok: bool
    db_candidates: int
    submission_rows: int
    matched_rankings: int
    missing_in_db: List[str] = Field(default_factory=list)
    missing_in_submission: List[str] = Field(default_factory=list)
    message: str


class WorkspaceAnalytics(BaseModel):
    pool_label: str
    candidate_count: int
    kpis: List[AnalyticsKpi]
    time_to_hire: List[TimeToHirePoint]
    conversion_funnel: List[FunnelStage]
    source_quality: List[SourceQualityPoint]
    trends: List[TrendPoint]
    executive_kpis: List[ExecutiveKpi] = Field(default_factory=list)
    score_histogram: List[HistogramBin] = Field(default_factory=list)
    recommendation_mix: List[RecommendationMixItem] = Field(default_factory=list)
    stage_conversion: List[StageConversion] = Field(default_factory=list)
    rank_buckets: List[RankBucketPoint] = Field(default_factory=list)
    signal_coverage: List[SignalCoveragePoint] = Field(default_factory=list)
    insights: List[AnalyticsInsight] = Field(default_factory=list)
    jobs_pipeline: List[JobPipelineRow] = Field(default_factory=list)
    rank_scatter: List[RankScatterPoint] = Field(default_factory=list)
    stage_velocity: List[StageVelocityPoint] = Field(default_factory=list)
    top_candidates: List[TopCandidateRow] = Field(default_factory=list)
    interviews_summary: Optional[InterviewsSummary] = None
    sync: Optional[SyncStatus] = None
    score_stats: Dict[str, float] = Field(default_factory=dict)
    recruiting_health: Optional[RecruitingHealth] = None
    ai_summary: Optional[AiSummary] = None
    attention_queue: List[AttentionQueueItem] = Field(default_factory=list)


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
    title: str = ""
    stage: str = ""
    recommendation: str = ""


class ShortlistCard(BaseModel):
    id: str
    job_id: str
    name: str
    job: str
    owner: str
    owner_color: str
    members: List[ShortlistMember]
    department: str = ""
    location: str = ""
    status: str = "Open"
    strong_hire_count: int = 0
    interview_count: int = 0


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


def _workspace_user_profile() -> WorkspaceUserProfile:
    s = get_settings()
    return WorkspaceUserProfile(
        name=s.workspace_user_name,
        role=s.workspace_user_role,
        company=s.workspace_user_company,
        email=s.workspace_user_email,
        color=s.workspace_user_color,
        avatar_url=s.workspace_user_avatar_url,
    )


def _relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    mins = max(0, int(delta.total_seconds() / 60))
    if mins < 1:
        return "just now"
    if mins < 60:
        return f"{mins}m ago"
    hours = mins // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


def _format_clock(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _job_pool(ctx: WorkspaceContext, job_title: str) -> List[CandidateRow]:
    return [
        row
        for row in ctx.candidates
        if row.ranking and candidate_matches_job(row, job_title)
    ]


def _job_stages_for_pool(pool: List[CandidateRow]) -> JobStageCounts:
    counts = {"Applied": 0, "Screened": 0, "Interview": 0, "Offer": 0}
    for row in pool:
        if not row.ranking:
            continue
        stage = score_to_stage(row.ranking.rank, row.ranking.score)
        if stage in counts:
            counts[stage] += 1
    return JobStageCounts(
        applied=counts["Applied"],
        screened=counts["Screened"],
        interview=counts["Interview"],
        offer=counts["Offer"],
    )


def _interview_owner(row: CandidateRow) -> str:
    role_title = assign_candidate_role(row)
    catalog = role_catalog_by_title()
    fallback = next(iter(catalog.values()))
    return catalog.get(role_title, fallback)["owner"]


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


def _interview_when(
    rank: int, stage: str, status: str
) -> tuple[str, Optional[int]]:
    now = datetime.now()
    if status == "Awaiting feedback":
        return "Yesterday", None
    if status == "Completed":
        completed = now - timedelta(days=max(1, (rank % 5) + 1))
        weekday = completed.strftime("%a")
        slot_h, slot_m = _SCHEDULE_SLOTS[(rank - 1) % len(_SCHEDULE_SLOTS)]
        return f"{weekday} · {_format_clock(completed.replace(hour=slot_h, minute=slot_m))}", None
    hour, minute = _SCHEDULE_SLOTS[(rank - 1) % len(_SCHEDULE_SLOTS)]
    slot = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if stage == "Interview":
        if slot <= now:
            slot += timedelta(days=1)
            day_label = "Tomorrow" if slot.date() == (now + timedelta(days=1)).date() else slot.strftime("%a")
        else:
            day_label = "Today"
        starts_in = max(1, int((slot - now).total_seconds() / 60)) if day_label == "Today" else None
        return f"{day_label} · {_format_clock(slot)}", starts_in
    days_ahead = max(1, ((rank - 11) % 5) + 1)
    future = now + timedelta(days=days_ahead)
    day_label = future.strftime("%a")
    return f"{day_label} · {_format_clock(future.replace(hour=hour, minute=minute))}", None


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
        role = assign_candidate_role(row)
        when, starts_in = _interview_when(rank, stage, status)
        if status == "Scheduled":
            scorecard_status = "Pending"
        elif status == "Awaiting feedback":
            scorecard_status = "Overdue" if when == "Yesterday" else "Feedback Due"
        else:
            scorecard_status = "Submitted"
        interviews.append(
            WorkspaceInterview(
                id=f"int_{rid}",
                candidate_id=rid,
                candidate=row.orm.full_name,
                candidate_color=_avatar_color(rid),
                role=role,
                round=_ROUNDS[(rank - 1) % len(_ROUNDS)],
                interviewer=_interview_owner(row),
                when=when,
                status=status,
                recommendation=(
                    score_to_recommendation(score) if status == "Completed" else ""
                ),
                rank=rank,
                match_score=round(score * 100),
                pipeline_stage=stage,
                concern=_extract_concern(row.ranking.reasoning),
                starts_in_minutes=starts_in,
                meeting_url=(
                    f"https://meet.google.com/lookup/{rid[-8:].lower()}"
                    if status == "Scheduled"
                    else ""
                ),
                scorecard_status=scorecard_status,
            )
        )
    return interviews


_SIGNAL_RULES = [
    ("IR / retrieval in career", ("retrieval", "ranking", "semantic search", "embedding", "faiss", "milvus", "qdrant")),
    ("Production shipped language", ("production", "shipped", "deployed", "scaled")),
    ("Core IR stack skills", ("faiss", "pinecone", "weaviate", "sentence transformer", "information retrieval")),
    ("Availability concern flagged", ("notice period", "60-day", "90-day", "60 day", "90 day")),
]

_STAGE_VELOCITY_DAYS = {
    "Applied": 4,
    "Screened": 8,
    "Interview": 14,
    "Offer": 6,
    "Hired": 3,
}


def _reasoning_text(row: CandidateRow) -> str:
    return (row.ranking.reasoning if row.ranking else "").lower()


def _has_signal(text: str, keywords: tuple[str, ...]) -> bool:
    return any(kw in text for kw in keywords)


def _extract_top_signal(reasoning: str) -> str:
    if not reasoning:
        return "Ranked from challenge submission"
    m = re.search(r"JD fit:\s*([^\.]+)", reasoning, re.I)
    if m:
        return m.group(1).strip()[:80]
    m = re.search(r"@\s*([^:]+):", reasoning)
    if m:
        return m.group(0).strip()[:80]
    return reasoning.split(".")[0][:80]


def _extract_concern(reasoning: str) -> str:
    if not reasoning:
        return ""
    for label in ("Concerns:", "Watch items:", "Flags:", "Gaps to validate:"):
        if label.lower() in reasoning.lower():
            part = re.split(label, reasoning, flags=re.I)[-1]
            return part.split(".")[0].strip()[:100]
    return ""


def _score_histogram(scores_pct: List[int]) -> List[HistogramBin]:
    bins = [
        ("0–60", 0, 60),
        ("60–70", 60, 70),
        ("70–80", 70, 80),
        ("80–90", 80, 90),
        ("90–100", 90, 101),
    ]
    out: List[HistogramBin] = []
    for label, lo, hi in bins:
        count = sum(1 for s in scores_pct if lo <= s < hi)
        out.append(HistogramBin(bin=label, count=count))
    return out


def _stage_conversions(funnel_counts: Dict[str, int]) -> List[StageConversion]:
    order = ["Applied", "Screened", "Interview", "Offer", "Hired"]
    out: List[StageConversion] = []
    for i in range(len(order) - 1):
        a, b = order[i], order[i + 1]
        from_n = funnel_counts.get(a, 0)
        to_n = funnel_counts.get(b, 0)
        rate = round(100 * to_n / from_n, 1) if from_n else 0.0
        out.append(StageConversion(from_stage=a, to_stage=b, rate=rate))
    return out


def _build_signal_coverage(rows: List[CandidateRow]) -> List[SignalCoveragePoint]:
    ranked = [r for r in rows if r.ranking]
    if not ranked:
        return []
    top10 = [r for r in ranked if r.ranking and r.ranking.rank <= 10]
    out: List[SignalCoveragePoint] = []
    for label, keywords in _SIGNAL_RULES:
        pool_hit = sum(1 for r in ranked if _has_signal(_reasoning_text(r), keywords))
        top_hit = sum(1 for r in top10 if _has_signal(_reasoning_text(r), keywords))
        pool_pct = round(100 * pool_hit / len(ranked), 1)
        top_pct = round(100 * top_hit / max(len(top10), 1), 1)
        out.append(
            SignalCoveragePoint(
                signal=label,
                top10_pct=top_pct,
                pool_pct=pool_pct,
                lift=round(top_pct - pool_pct, 1),
            )
        )
    return sorted(out, key=lambda s: -abs(s.lift))


def _build_recruiting_health(
    ctx: WorkspaceContext,
    funnel_counts: Dict[str, int],
    strong_in_applied: int,
    sync: SyncStatus,
    interview_rows: List[WorkspaceInterview],
    awaiting_feedback: int,
    trends: List[TrendPoint],
) -> RecruitingHealth:
    alerts: List[HealthAlertItem] = []
    screened = funnel_counts.get("Screened", 0)
    need_review = screened + strong_in_applied
    if need_review > 0:
        alerts.append(
            HealthAlertItem(
                kind="warn",
                message=f"{need_review} candidate{'s' if need_review != 1 else ''} need review",
                href="/candidates?stage=Screened",
            )
        )
    if awaiting_feedback > 0:
        alerts.append(
            HealthAlertItem(
                kind="warn",
                message=f"{awaiting_feedback} scorecard{'s' if awaiting_feedback != 1 else ''} overdue",
                href="/interviews",
            )
        )
    unmatched = max(0, ctx.total - ctx.matched_count)
    if unmatched > 0:
        alerts.append(
            HealthAlertItem(
                kind="warn",
                message=f"{unmatched} candidate{'s' if unmatched != 1 else ''} unmatched",
                href="/settings",
            )
        )
    if trends and len(trends) >= 2:
        score_delta = trends[-1].score - trends[-2].score
        if score_delta > 0:
            alerts.append(
                HealthAlertItem(
                    kind="ok",
                    message=f"Top candidate score increased {score_delta}%",
                    href="/analytics",
                )
            )
    today_iv = sum(1 for i in interview_rows if i.when.startswith("Today"))
    active_iv = today_iv + awaiting_feedback
    if active_iv > 0:
        alerts.append(
            HealthAlertItem(
                kind="ok",
                message=f"{active_iv} interview{'s' if active_iv != 1 else ''} active today",
                href="/interviews",
            )
        )
    if not alerts:
        alerts.append(
            HealthAlertItem(
                kind="ok",
                message="Pipeline healthy — review top 10 candidates",
                href="/candidates",
            )
        )
    cta_href = "/candidates"
    cta_label = "Review candidates"
    if strong_in_applied > 0:
        cta_href = "/candidates?filter=Strong+Hire"
        cta_label = "Review Strong Hires"
    elif awaiting_feedback > 0:
        cta_href = "/interviews?filter=feedback"
        cta_label = "Submit scorecards"
    return RecruitingHealth(
        alerts=alerts[:5],
        cta_href=cta_href,
        cta_label=cta_label,
    )


def _build_attention_queue(
    top_candidates: List[TopCandidateRow],
    interview_rows: List[WorkspaceInterview],
) -> List[AttentionQueueItem]:
    items: List[AttentionQueueItem] = []
    seen_ids: set[str] = set()

    for c in top_candidates:
        if (
            c.recommendation == "Strong Hire"
            and c.stage in ("Applied", "Screened")
        ):
            items.append(
                AttentionQueueItem(
                    id=f"strong-{c.candidate_id}",
                    rank=c.rank,
                    name=c.name,
                    subtitle=c.top_signal,
                    detail=c.concern,
                    recommendation=c.recommendation,
                    stage=c.stage,
                    href=f"/candidates?highlight={c.candidate_id}",
                    action_label="Move to interview",
                    priority=1,
                )
            )
            seen_ids.add(c.candidate_id)

    for i in interview_rows:
        if i.when.startswith("Today"):
            items.append(
                AttentionQueueItem(
                    id=f"today-{i.id}",
                    name=i.candidate,
                    subtitle=f"{i.round} · {i.role}",
                    stage="Interview",
                    href="/interviews?filter=today",
                    action_label="View schedule",
                    priority=2,
                )
            )

    for i in interview_rows:
        if i.status == "Awaiting feedback":
            items.append(
                AttentionQueueItem(
                    id=f"feedback-{i.id}",
                    name=i.candidate,
                    subtitle=f"{i.round} · feedback due",
                    href="/interviews?filter=feedback",
                    action_label="Submit scorecard",
                    priority=3,
                )
            )

    for c in top_candidates:
        if c.concern and c.candidate_id not in seen_ids:
            items.append(
                AttentionQueueItem(
                    id=f"concern-{c.candidate_id}",
                    rank=c.rank,
                    name=c.name,
                    subtitle=c.concern,
                    stage=c.stage,
                    href=f"/candidates?highlight={c.candidate_id}",
                    action_label="Review",
                    priority=4,
                )
            )
            seen_ids.add(c.candidate_id)

    for c in top_candidates:
        if c.rank <= 10 and c.stage == "Applied" and c.candidate_id not in seen_ids:
            items.append(
                AttentionQueueItem(
                    id=f"contact-{c.candidate_id}",
                    rank=c.rank,
                    name=c.name,
                    subtitle="Top-10 · not yet in pipeline",
                    recommendation=c.recommendation,
                    stage="Applied",
                    href=f"/candidates?highlight={c.candidate_id}",
                    action_label="Add to shortlist",
                    priority=5,
                )
            )

    return sorted(items, key=lambda x: x.priority)[:6]


def _build_ai_summary(
    funnel_counts: Dict[str, int],
    stage_conversion: List[StageConversion],
    notice_flags: int,
    strong_in_applied: int,
    avg_score: int,
) -> AiSummary:
    applied = funnel_counts.get("Applied", 0)
    screened = funnel_counts.get("Screened", 0)
    interview = funnel_counts.get("Interview", 0)
    screen_to_iv = next(
        (c for c in stage_conversion if c.from_stage == "Screened" and c.to_stage == "Interview"),
        None,
    )
    screen_rate = screen_to_iv.rate if screen_to_iv else 0.0
    applied_to_screen = next(
        (c for c in stage_conversion if c.from_stage == "Applied" and c.to_stage == "Screened"),
        None,
    )
    applied_rate = applied_to_screen.rate if applied_to_screen else 0.0

    if screen_rate < 20 and screened > 0:
        headline = "Your hiring funnel is bottlenecked at screening."
        bottleneck = (
            f"{screened} candidates reached screening but only "
            f"{interview} progressed to interviews ({screen_rate}% conversion)."
        )
    elif applied_rate < 25 and applied > 0:
        headline = "Applied volume is not converting into screened candidates."
        bottleneck = (
            f"{applied} candidates applied with only {screened} screened "
            f"({applied_rate}% conversion)."
        )
    else:
        headline = "Pipeline is moving — focus on top-ranked finalists."
        bottleneck = (
            f"{applied} in Applied, {screened} screened, {interview} in interview "
            f"(avg match {avg_score})."
        )

    if notice_flags:
        risk = (
            f"{notice_flags} high-scoring candidates in top-20 have notice "
            "periods above 60 days."
        )
    else:
        risk = "No major availability risks flagged in the top-20 pool."

    if strong_in_applied > 0:
        recommendation = (
            f"Move {strong_in_applied} Strong Hire{'s' if strong_in_applied != 1 else ''} "
            "from Applied to interview, then review top-20 for notice-period risk."
        )
    elif notice_flags:
        recommendation = (
            "Review top-20 candidates and prioritize those below a 60-day notice period."
        )
    else:
        recommendation = "Review top-10 finalists and schedule interviews for this week."

    return AiSummary(
        headline=headline,
        bottleneck=bottleneck,
        risk=risk,
        recommendation=recommendation,
    )


def _build_insights(
    ctx: WorkspaceContext,
    funnel_counts: Dict[str, int],
    strong_in_applied: int,
    sync: SyncStatus,
    stage_conversion: List[StageConversion],
) -> List[AnalyticsInsight]:
    insights: List[AnalyticsInsight] = []
    if strong_in_applied > 0:
        insights.append(
            AnalyticsInsight(
                severity="high",
                message=f"{strong_in_applied} Strong Hire{'s' if strong_in_applied != 1 else ''} still in Applied stage",
                href="/candidates?filter=Strong+Hire",
            )
        )
    screen_to_iv = next(
        (c for c in stage_conversion if c.from_stage == "Screened" and c.to_stage == "Interview"),
        None,
    )
    if screen_to_iv and screen_to_iv.rate < 15:
        insights.append(
            AnalyticsInsight(
                severity="medium",
                message=f"Screened → Interview conversion {screen_to_iv.rate}% (below 15% benchmark)",
                href="/candidates?stage=Screened",
            )
        )
    notice_flags = 0
    for row in sorted_by_rank(ctx)[:20]:
        if row.ranking and _has_signal(_reasoning_text(row), ("60-day", "90-day", "60 day", "90 day")):
            notice_flags += 1
    if notice_flags:
        insights.append(
            AnalyticsInsight(
                severity="low",
                message=f"{notice_flags} candidates in top-20 flagged with notice > 60d",
                href="/candidates?shortlist=shortlist-top10",
            )
        )
    if not sync.ok:
        insights.append(
            AnalyticsInsight(
                severity="critical",
                message=sync.message,
                href="/settings",
            )
        )
    if not insights:
        insights.append(
            AnalyticsInsight(
                severity="low",
                message="Pipeline and ranker coverage look healthy — review top-10 finalists",
                href="/candidates",
            )
        )
    return insights[:6]


def _build_analytics(
    ctx: WorkspaceContext,
    *,
    jobs: Optional[list] = None,
    interviews: Optional[List[WorkspaceInterview]] = None,
    sync: Optional[SyncStatus] = None,
) -> WorkspaceAnalytics:
    matched_entries = [r.ranking for r in ctx.candidates if r.ranking]
    n = len(matched_entries)
    funnel = _funnel_models(ctx)
    funnel_counts = {f.stage: f.count for f in funnel}
    sync_status = sync or _sync_status(ctx)
    interview_rows = interviews or _build_interviews(ctx)

    empty = WorkspaceAnalytics(
        pool_label=ctx.pool_label,
        candidate_count=ctx.total,
        kpis=[
            AnalyticsKpi(label="Candidates in pool", value=str(ctx.total), delta="import data"),
            AnalyticsKpi(label="Ranker coverage", value="0%", delta="run ranker"),
        ],
        time_to_hire=[],
        conversion_funnel=funnel,
        source_quality=[],
        trends=[],
        sync=sync_status,
        interviews_summary=InterviewsSummary(
            scheduled=0, awaiting_feedback=0, completed=0, pass_rate=0
        ),
    )

    if n == 0:
        empty.executive_kpis = [
            ExecutiveKpi(
                label="Ranker coverage",
                value="0%",
                delta="import candidates",
                href="/candidates",
                definition="submission.csv rows matched in DB",
            )
        ]
        return empty

    matched_entries.sort(key=lambda r: r.rank)
    scores = [r.score for r in matched_entries]
    scores_pct = [round(s * 100) for s in scores]
    avg_score = sum(scores) / n
    quality = round(avg_score * 100)
    strong_hire = sum(1 for s in scores if s >= 0.88)
    hire_plus = sum(1 for s in scores if s >= 0.75)
    coverage = round(100 * ctx.matched_count / max(ctx.total, 1))

    active_pipeline = (
        funnel_counts.get("Screened", 0)
        + funnel_counts.get("Interview", 0)
        + funnel_counts.get("Offer", 0)
    )
    applied_n = max(funnel_counts.get("Applied", 0), 1)
    hired_n = funnel_counts.get("Hired", 0)
    pipeline_conversion = round(100 * hired_n / applied_n, 1)

    scheduled = sum(1 for i in interview_rows if i.status == "Scheduled")
    awaiting = sum(1 for i in interview_rows if i.status == "Awaiting feedback")
    completed = sum(1 for i in interview_rows if i.status == "Completed")
    pass_rate = 0
    if completed:
        pass_rate = round(
            100
            * sum(
                1
                for i in interview_rows
                if i.status == "Completed"
                and i.recommendation in ("Strong Hire", "Hire")
            )
            / completed
        )

    # Legacy modeled series — used for KPI trend deltas and charts
    time_to_hire: List[TimeToHirePoint] = []
    trends: List[TrendPoint] = []
    for i, month in enumerate(_ANALYTICS_MONTHS):
        cutoff = max(1, round((i + 1) * n / len(_ANALYTICS_MONTHS)))
        bucket = matched_entries[:cutoff]
        bucket_scores = [r.score for r in bucket]
        bucket_avg = sum(bucket_scores) / len(bucket_scores)
        days = max(14, round(44 - bucket_avg * 14))
        time_to_hire.append(TimeToHirePoint(month=month, days=days))
        trends.append(
            TrendPoint(
                month=month,
                rate=round(
                    100 * sum(1 for s in bucket_scores if s >= 0.75) / len(bucket_scores)
                ),
                score=round(bucket_avg * 100),
            )
        )

    score_trend_delta = 0
    if len(trends) >= 2:
        score_trend_delta = trends[-1].score - trends[-2].score
    score_delta_label = (
        f"{abs(score_trend_delta)} from last ranking run"
        if score_trend_delta != 0
        else "stable this cycle"
    )
    coverage_week_delta = min(12, max(0, coverage - 50)) if coverage > 50 else 0
    coverage_delta_label = (
        f"{coverage_week_delta}% this week"
        if coverage_week_delta > 0 and sync_status.ok
        else ("synced" if sync_status.ok else "needs sync")
    )

    executive_kpis = [
        ExecutiveKpi(
            label="Active pipeline",
            value=str(active_pipeline),
            delta=f"{funnel_counts.get('Interview', 0)} in interview",
            hint="Screened + Interview + Offer",
            href="/candidates",
            definition="Count of candidates in active hiring stages from rank-derived funnel",
        ),
        ExecutiveKpi(
            label="Strong hire pool",
            value=str(strong_hire),
            delta=f"{round(100 * strong_hire / n)}% of ranked pool",
            hint="score ≥ 88%",
            href="/candidates?filter=Strong+Hire",
            definition="Candidates with ranker score ≥ 0.88 from submission.csv",
        ),
        ExecutiveKpi(
            label="Avg match score",
            value=str(quality),
            delta=score_delta_label,
            hint="across ranked pool",
            href="/analytics",
            definition="Arithmetic mean of submission.csv scores × 100",
            delta_positive=score_trend_delta >= 0,
        ),
        ExecutiveKpi(
            label="Pipeline conversion",
            value=f"{pipeline_conversion}%",
            delta="Applied → Hired",
            hint="end-to-end",
            href="/candidates",
            definition="Hired count / Applied count from stage model",
            delta_positive=pipeline_conversion > 0,
        ),
        ExecutiveKpi(
            label="Interviews active",
            value=str(scheduled + awaiting),
            delta=f"{awaiting} awaiting feedback",
            hint="scheduled this cycle",
            href="/interviews",
            definition="Scheduled + awaiting feedback from workspace interviews",
        ),
        ExecutiveKpi(
            label="Ranker coverage",
            value=f"{coverage}%",
            delta=coverage_delta_label,
            hint=f"{ctx.matched_count}/{ctx.total} matched",
            href="/settings",
            definition="DB candidates with submission.csv ranking match",
            delta_positive=sync_status.ok,
        ),
    ]

    tiers = [
        ("Top 10", 1, 10),
        ("Rank 11–30", 11, 30),
        ("Rank 31–60", 31, 60),
        ("Rank 61–100", 61, 100),
    ]
    rank_buckets: List[RankBucketPoint] = []
    source_quality: List[SourceQualityPoint] = []
    for label, lo, hi in tiers:
        tier = [r for r in matched_entries if lo <= r.rank <= hi]
        if not tier:
            continue
        tier_avg = sum(r.score for r in tier) / len(tier)
        strong_pct = round(
            100 * sum(1 for r in tier if r.score >= 0.88) / len(tier), 1
        )
        hires = sum(1 for r in tier if r.score >= 0.75)
        rank_buckets.append(
            RankBucketPoint(
                bucket=label,
                avg_score=round(tier_avg * 100),
                count=len(tier),
                strong_hire_pct=strong_pct,
                hires=hires,
            )
        )
        source_quality.append(
            SourceQualityPoint(
                source=label,
                quality=round(tier_avg * 100),
                hires=hires,
            )
        )

    rec_order = ["Strong Hire", "Hire", "Lean Hire", "Hold"]
    rec_counts = {t: 0 for t in rec_order}
    for s in scores:
        rec_counts[score_to_recommendation(s)] += 1
    recommendation_mix = [
        RecommendationMixItem(
            tier=t,
            count=rec_counts[t],
            pct=round(100 * rec_counts[t] / n, 1),
        )
        for t in rec_order
        if rec_counts[t] > 0
    ]

    sorted_rows = sorted_by_rank(ctx)
    rank_scatter = [
        RankScatterPoint(
            rank=row.ranking.rank,
            score=round(row.ranking.score * 100),
            candidate_id=row.redrob_id,
            name=row.orm.full_name,
            recommendation=score_to_recommendation(row.ranking.score),
        )
        for row in sorted_rows
        if row.ranking
    ]

    top_candidates = []
    for row in sorted_rows[:10]:
        if not row.ranking:
            continue
        rank = row.ranking.rank
        score = row.ranking.score
        top_candidates.append(
            TopCandidateRow(
                candidate_id=row.redrob_id,
                name=row.orm.full_name,
                rank=rank,
                score=round(score * 100),
                stage=score_to_stage(rank, score),
                recommendation=score_to_recommendation(score),
                top_signal=_extract_top_signal(row.ranking.reasoning),
                concern=_extract_concern(row.ranking.reasoning),
            )
        )

    strong_in_applied = sum(
        1
        for row in sorted_rows
        if row.ranking
        and score_to_recommendation(row.ranking.score) == "Strong Hire"
        and score_to_stage(row.ranking.rank, row.ranking.score) == "Applied"
    )

    stage_conversion = _stage_conversions(funnel_counts)
    signal_coverage = _build_signal_coverage(sorted_rows)
    notice_flags = sum(
        1
        for row in sorted_rows[:20]
        if row.ranking
        and _has_signal(_reasoning_text(row), ("60-day", "90-day", "60 day", "90 day"))
    )
    insights = _build_insights(
        ctx, funnel_counts, strong_in_applied, sync_status, stage_conversion
    )
    recruiting_health = _build_recruiting_health(
        ctx,
        funnel_counts,
        strong_in_applied,
        sync_status,
        interview_rows,
        awaiting,
        trends,
    )
    ai_summary = _build_ai_summary(
        funnel_counts,
        stage_conversion,
        notice_flags,
        strong_in_applied,
        quality,
    )
    attention_queue = _build_attention_queue(top_candidates, interview_rows)

    jobs_pipeline: List[JobPipelineRow] = []
    now = datetime.now(timezone.utc)
    for job in jobs or []:
        pool = _job_pool(ctx, job.title)
        job_stages = _job_stages_for_pool(pool)
        job_strong_hires = sum(
            1
            for row in pool
            if row.ranking
            and score_to_recommendation(row.ranking.score) == "Strong Hire"
        )
        created = job.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        days_open = max(1, (now - created).days)
        jobs_pipeline.append(
            JobPipelineRow(
                job_id=str(job.id),
                title=job.title.strip(),
                applied=job_stages.applied,
                screened=job_stages.screened,
                interview=job_stages.interview,
                offer=job_stages.offer,
                strong_hires=job_strong_hires,
                days_open=days_open,
            )
        )

    sorted_pct = sorted(scores_pct)
    mid = len(sorted_pct) // 2
    median = sorted_pct[mid] if sorted_pct else 0
    p90_idx = min(len(sorted_pct) - 1, int(len(sorted_pct) * 0.9))
    p90 = sorted_pct[p90_idx] if sorted_pct else 0
    if len(scores_pct) > 1:
        mean = sum(scores_pct) / len(scores_pct)
        variance = sum((x - mean) ** 2 for x in scores_pct) / len(scores_pct)
        std_dev = variance ** 0.5
    else:
        std_dev = 0.0

    return WorkspaceAnalytics(
        pool_label=ctx.pool_label,
        candidate_count=ctx.total,
        kpis=[
            AnalyticsKpi(label="Avg match score", value=str(quality), delta="ranker mean"),
            AnalyticsKpi(label="Strong hire pool", value=str(strong_hire), delta=f"{round(100 * strong_hire / n)}%"),
            AnalyticsKpi(label="Ranker coverage", value=f"{coverage}%", delta="synced" if sync_status.ok else "gap"),
            AnalyticsKpi(label="Hire+ rate (proxy)", value=f"{round(100 * hire_plus / n)}%", delta="score ≥ 0.75"),
        ],
        time_to_hire=time_to_hire,
        conversion_funnel=funnel,
        source_quality=source_quality,
        trends=trends,
        executive_kpis=executive_kpis,
        score_histogram=_score_histogram(scores_pct),
        recommendation_mix=recommendation_mix,
        stage_conversion=stage_conversion,
        rank_buckets=rank_buckets,
        signal_coverage=signal_coverage,
        insights=insights,
        jobs_pipeline=jobs_pipeline,
        rank_scatter=rank_scatter,
        stage_velocity=[
            StageVelocityPoint(stage=s, median_days=d)
            for s, d in _STAGE_VELOCITY_DAYS.items()
        ],
        top_candidates=top_candidates,
        interviews_summary=InterviewsSummary(
            scheduled=scheduled,
            awaiting_feedback=awaiting,
            completed=completed,
            pass_rate=pass_rate,
        ),
        sync=sync_status,
        score_stats={
            "median": float(median),
            "p90": float(p90),
            "std_dev": round(std_dev, 1),
            "mean": float(quality),
        },
        recruiting_health=recruiting_health,
        ai_summary=ai_summary,
        attention_queue=attention_queue,
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


def _member(
    row: CandidateRow,
    ranked: Optional[RankedCandidate] = None,
) -> ShortlistMember:
    if ranked:
        rank = ranked.rank
        score = ranked.hireability_score
    else:
        rank = row.ranking.rank if row.ranking else 999
        score = row.ranking.score if row.ranking else 0.0
    return ShortlistMember(
        candidate_id=row.redrob_id,
        name=row.orm.full_name,
        avatar_color=_avatar_color(row.redrob_id),
        match_score=round(score * 100),
        title=row.orm.current_role or row.orm.headline or "Candidate",
        stage=score_to_stage(rank, score),
        recommendation=score_to_recommendation(score),
    )


def _shortlist_pool_rows(
    ctx: WorkspaceContext,
    job_title: str,
    by_uuid: Dict[str, CandidateRow],
    ranking_rows: Optional[List[RankedCandidate]],
) -> List[tuple[CandidateRow, Optional[RankedCandidate]]]:
    pool: List[tuple[CandidateRow, Optional[RankedCandidate]]] = []
    if ranking_rows:
        for rc in ranking_rows:
            row = by_uuid.get(str(rc.candidate_id))
            if row:
                pool.append((row, rc))
        return pool

    matched = [
        r
        for r in ctx.candidates
        if r.ranking and candidate_matches_job(r, job_title)
    ]
    matched = sorted(matched, key=lambda r: r.ranking.rank if r.ranking else 999)
    if matched:
        return [(r, None) for r in matched]

    return [
        (r, None)
        for r in sorted_by_rank(ctx)
        if r.ranking
    ]


def _job_shortlist_status(
    pool: List[tuple[CandidateRow, Optional[RankedCandidate]]],
    fallback: str,
) -> str:
    interview_count = 0
    for row, ranked in pool:
        rank = ranked.rank if ranked else (row.ranking.rank if row.ranking else 999)
        score = (
            ranked.hireability_score
            if ranked
            else (row.ranking.score if row.ranking else 0.0)
        )
        if score_to_stage(rank, score) == "Interview":
            interview_count += 1
    if interview_count >= 3:
        return "Interviewing"
    if interview_count > 0:
        return "Open"
    return fallback


async def _build_shortlists(
    ctx: WorkspaceContext,
    session: AsyncSession,
    jobs: list,
) -> List[ShortlistCard]:
    by_uuid = {row.orm.id: row for row in ctx.candidates}
    out: List[ShortlistCard] = []

    for job in jobs:
        job_id = str(job.id)
        meta = job_display_meta(job.title, job.description)
        ranking = await get_cached_ranking(session, job_id)
        ranking_rows = ranking.ranked_candidates if ranking else None
        pool = _shortlist_pool_rows(ctx, job.title, by_uuid, ranking_rows)

        members = [_member(row, ranked) for row, ranked in pool[:12]]
        strong_hires = sum(
            1
            for row, ranked in pool
            if score_to_recommendation(
                ranked.hireability_score
                if ranked
                else (row.ranking.score if row.ranking else 0.0)
            )
            == "Strong Hire"
        )
        interview_count = sum(
            1
            for row, ranked in pool
            if score_to_stage(
                ranked.rank if ranked else (row.ranking.rank if row.ranking else 999),
                ranked.hireability_score
                if ranked
                else (row.ranking.score if row.ranking else 0.0),
            )
            == "Interview"
        )
        status = _job_shortlist_status(pool, meta["status"])

        out.append(
            ShortlistCard(
                id=f"shortlist-{job_id}",
                job_id=job_id,
                name=f"{job.title} — finalists",
                job=job.title,
                owner=meta["owner"],
                owner_color=meta["owner_color"],
                members=members,
                department=meta["department"],
                location=meta["location"],
                status=status,
                strong_hire_count=strong_hires,
                interview_count=interview_count,
            )
        )

    return sorted(out, key=lambda s: (-len(s.members), -s.strong_hire_count))


def _build_activity(ctx: WorkspaceContext) -> List[ActivityItem]:
    ranked = sorted_by_rank(ctx)
    items: List[ActivityItem] = []
    if ranked:
        newest = max(
            (r.orm.created_at for r in ranked if r.orm.created_at),
            default=datetime.now(timezone.utc),
        )
        items.append(
            ActivityItem(
                id="act_import",
                actor="RecruitGPT",
                actor_color="#7C3AED",
                action="loaded",
                target=f"{ctx.total} challenge candidates",
                context=ctx.pool_label,
                time=_relative_time(newest),
                href="/candidates",
            )
        )
    for i, row in enumerate(ranked[:4]):
        if not row.ranking:
            continue
        stage = score_to_stage(row.ranking.rank, row.ranking.score)
        created = row.orm.created_at or datetime.now(timezone.utc)
        items.append(
            ActivityItem(
                id=f"act_{row.redrob_id}",
                actor="Pipeline",
                actor_color=_ACTIVITY_COLORS[i % len(_ACTIVITY_COLORS)],
                action="ranked",
                target=row.orm.full_name,
                context=f"#{row.ranking.rank} · {stage} · {round(row.ranking.score * 100)}% match",
                time=_relative_time(created),
                href=f"/candidates?highlight={row.redrob_id}",
            )
        )
    interviews = _build_interviews(ctx)
    for iv in interviews[:2]:
        items.append(
            ActivityItem(
                id=f"act_iv_{iv.id}",
                actor=iv.interviewer,
                actor_color="#475569",
                action="scheduled interview with",
                target=iv.candidate,
                context=f"{iv.round} · {iv.when}",
                time="today" if iv.when.startswith("Today") else iv.when.split(" · ")[0].lower(),
                href="/interviews?filter=today" if iv.when.startswith("Today") else "/interviews",
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
    saved = []
    for job in jobs[:3]:
        role = best_role_for_job(job.title)
        meta = job_display_meta(job.title, job.description)
        saved.append(
            SavedSearchItem(
                name=f"{job.title} finalists",
                query=f"role {job.title}",
                count=sum(
                    1
                    for r in ctx.candidates
                    if r.ranking and assign_candidate_role(r) == role
                ),
                owner=meta["owner"],
            )
        )
    if not saved:
        saved = [
            SavedSearchItem(
                name="Challenge pool finalists",
                query="top ranked candidates",
                count=ctx.matched_count,
                owner="Jordan Lee",
            )
        ]

    return SearchMeta(suggested=suggested[:4], recent=recent, saved=saved)


def _build_jobs_overview(ctx: WorkspaceContext, jobs: list) -> List[JobOverview]:
    now = datetime.now(timezone.utc)
    out: List[JobOverview] = []
    for j in jobs:
        pool = _job_pool(ctx, j.title)
        stages = _job_stages_for_pool(pool)
        meta = job_display_meta(j.title, j.description or "")
        created = j.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        days_open = max(1, (now - created).days)
        if stages.interview > 0:
            status = "Interviewing"
        elif stages.offer > 0:
            status = "Offer stage"
        else:
            status = meta["status"]
        out.append(
            JobOverview(
                id=str(j.id),
                title=j.title.strip(),
                candidate_count=len(pool),
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


@router.get("/me", response_model=WorkspaceUserProfile)
async def workspace_me(user: CurrentUser = Depends(get_current_user)):
    _ = user
    return _workspace_user_profile()


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
    jobs = await jobs_for_owner(session, user.user_id)
    interviews = _build_interviews(ctx)
    sync = _sync_status(ctx)
    return _build_analytics(ctx, jobs=jobs, interviews=interviews, sync=sync)


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
    jobs = await jobs_for_owner(session, user.user_id)
    return await _build_shortlists(ctx, session, jobs)


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