"""Job-related API routes."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.explainability import chat_about_rankings
from app.agents.graph import run_full_pipeline
from app.agents.ranking import get_ranking_weights

from app.agents.job_understanding import parse_job_description
from app.api.auth import CurrentUser, get_current_user
from app.api.deps import get_session
from app.api.rate_limit import rate_limit_expensive
from app.models.schemas import (
    BiasReport,
    ChatRequest,
    ChatResponse,
    HiringBlueprint,
    Job,
    JobCreate,
    RankedCandidate,
    RankingResult,
    WhatIfRequest,
)
from app.services.candidate_repo import list_candidate_profiles
from app.services.indexing import index_job
from app.services.job_repo import create_job, delete_job, get_job, list_jobs, update_blueprint
from app.services.ranking_repo import get_cached_ranking, save_ranking_cache

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _ensure_job_blueprint(
    session: AsyncSession, job: Job, owner_id: str
) -> Job:
    if job.blueprint:
        return job
    bp = await parse_job_description(job.title, job.description)
    updated = await update_blueprint(session, str(job.id), bp, owner_id=owner_id)
    assert updated is not None
    return updated


async def _run_and_cache_ranking(
    session: AsyncSession,
    job: Job,
    *,
    owner_id: str,
    title_suffix: str = "",
    extra_metadata: Dict[str, Any] | None = None,
) -> RankingResult:
    candidates = await list_candidate_profiles(session, owner_id)
    if not candidates:
        raise HTTPException(400, "No candidates in database. Seed first.")

    on_progress = extra_metadata.pop("on_progress", None) if extra_metadata else None
    use_semantic = (
        extra_metadata.pop("use_semantic_weights", None)
        if extra_metadata
        else None
    )
    result_state = await run_full_pipeline(
        job_id=str(job.id),
        job_title=job.title + title_suffix,
        job_description=job.description,
        blueprint=job.blueprint,
        candidates=candidates,
        weights=get_ranking_weights(use_semantic=use_semantic),
        on_progress=on_progress,
    )

    ranking = RankingResult(
        job_id=job.id,
        job_title=job.title + title_suffix,
        blueprint=job.blueprint,
        ranked_candidates=result_state.get("ranked", []),
        pipeline_metadata={
            **(extra_metadata or {}),
            **result_state.get("metadata", {}),
            "ranking_weights": result_state.get("weights") or get_ranking_weights(),
        },
        created_at=datetime.now(timezone.utc),
        cached=False,
    )

    if not title_suffix:
        await save_ranking_cache(session, ranking)
        await session.commit()

    return ranking


async def _get_ranking(
    session: AsyncSession,
    job: Job,
    *,
    owner_id: str,
    refresh: bool = False,
    title_suffix: str = "",
    extra_metadata: Dict[str, Any] | None = None,
) -> RankingResult:
    if not refresh and not title_suffix:
        cached = await get_cached_ranking(session, str(job.id))
        if cached:
            cached.cached = True
            cached.pipeline_metadata = {
                **(cached.pipeline_metadata or {}),
                "cached": True,
                "ranking_weights": (cached.pipeline_metadata or {}).get(
                    "ranking_weights"
                )
                or get_ranking_weights(),
            }
            return cached
    return await _run_and_cache_ranking(
        session,
        job,
        owner_id=owner_id,
        title_suffix=title_suffix,
        extra_metadata=extra_metadata,
    )


def _build_bias_report(
    job_id: UUID,
    ranked: List[RankedCandidate],
    candidates,
    *,
    cached: bool = False,
) -> BiasReport:
    shortlist = ranked[: min(10, len(ranked))]

    gender_dist: Dict[str, int] = {}
    ethnicity_dist: Dict[str, int] = {}
    school_dist: Dict[str, int] = {}
    location_dist: Dict[str, int] = {}

    for rc in shortlist:
        cand = next((c for c in candidates if c.id == rc.candidate_id), None)
        if not cand:
            continue
        if cand.gender:
            gender_dist[cand.gender] = gender_dist.get(cand.gender, 0) + 1
        ethnicity = cand.ethnicity
        if ethnicity:
            ethnicity_dist[ethnicity] = ethnicity_dist.get(ethnicity, 0) + 1
        if cand.school:
            school_dist[cand.school] = school_dist.get(cand.school, 0) + 1
        if cand.location:
            location_dist[cand.location] = location_dist.get(cand.location, 0) + 1

    flags: List[str] = []
    total = max(1, len(shortlist))

    for g, count in gender_dist.items():
        if count / total > 0.7:
            flags.append(
                f"Gender skew: {count}/{total} ({count / total:.0%}) of shortlist are {g}"
            )

    for e, count in ethnicity_dist.items():
        if count / total > 0.7:
            flags.append(
                f"Ethnicity skew: {count}/{total} ({count / total:.0%}) of shortlist are {e}"
            )

    for s, count in school_dist.items():
        if count / total > 0.5:
            flags.append(f"School concentration: {count}/{total} from {s}")

    for loc, count in location_dist.items():
        if count / total > 0.6:
            flags.append(f"Location concentration: {count}/{total} from {loc}")

    max_concentration = 0.0
    for d in [gender_dist, ethnicity_dist, school_dist, location_dist]:
        if d:
            total_d = sum(d.values()) or 1
            share = max(d.values()) / total_d
            max_concentration = max(max_concentration, share)
    fairness = round(max(0.0, 1.0 - max_concentration + 0.3), 3)

    return BiasReport(
        job_id=job_id,
        shortlist_size=len(shortlist),
        gender_distribution=gender_dist,
        ethnicity_distribution=ethnicity_dist,
        school_distribution=school_dist,
        location_distribution=location_dist,
        flags=flags,
        overall_fairness_score=fairness,
        cached_ranking=cached,
    )


@router.post("/parse", response_model=HiringBlueprint)
async def parse_jd(
    request: Request,
    payload: Dict[str, str],
    user: CurrentUser = Depends(get_current_user),
):
    """Parse a JD into a hiring blueprint without persisting anything."""
    rate_limit_expensive(request, user)
    title = (payload.get("title") or "")[:500]
    description = (payload.get("description") or "")[:50_000]
    if not description:
        raise HTTPException(400, "description is required")
    return await parse_job_description(title, description)


@router.post("", response_model=Job)
async def create_job_endpoint(
    request: Request,
    payload: JobCreate,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Create a new job. Auto-parses the blueprint if not provided."""
    rate_limit_expensive(request, user)
    blueprint = payload.blueprint
    if blueprint is None:
        blueprint = await parse_job_description(payload.title, payload.description)
    job = await create_job(session, payload, blueprint, owner_id=user.user_id)
    index_job(str(job.id), job.title, job.description, blueprint.model_dump())
    await session.commit()
    return job


@router.get("/ranking-weights")
async def ranking_weights_info(
    semantic_weights: bool = Query(
        False, description="Return semantic-enhanced weights instead of hackathon spec"
    ),
):
    """Expose active hireability weights for demo / judge Q&A."""
    weights = get_ranking_weights(use_semantic=semantic_weights)
    return {
        "mode": "semantic_enhanced" if semantic_weights else "hackathon_spec",
        "weights": weights,
        "description": (
            "Hackathon spec: Skill 30%, Project 20%, Career 15%, "
            "Behavioral 15%, Learning 10%, Communication 10%"
            if not semantic_weights
            else "Enhanced: 90% hackathon spec + 10% semantic meaning-fit"
        ),
    }


@router.get("", response_model=List[Job])
async def list_jobs_endpoint(
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    return await list_jobs(session, user.user_id)


@router.get("/{job_id}", response_model=Job)
async def get_job_endpoint(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    job = await get_job(session, str(job_id), user.user_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/{job_id}")
async def delete_job_endpoint(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Delete a job and its cached ranking — removes the linked shortlist card."""
    deleted = await delete_job(session, str(job_id), owner_id=user.user_id)
    if not deleted:
        raise HTTPException(404, "Job not found")
    await session.commit()
    return {"ok": True, "job_id": str(job_id)}


@router.get("/{job_id}/rank/stream")
async def rank_stream(
    request: Request,
    job_id: UUID,
    refresh: bool = Query(False),
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """SSE stream of pipeline agent progress, then final ranking metadata."""
    rate_limit_expensive(request, user)
    job = await get_job(session, str(job_id), user.user_id)
    if not job:
        raise HTTPException(404, "Job not found")
    job = await _ensure_job_blueprint(session, job, user.user_id)

    if not refresh:
        cached = await get_cached_ranking(session, str(job.id))
        if cached:
            async def cached_events():
                yield f"data: {json.dumps({'type': 'cached', 'count': len(cached.ranked_candidates)})}\n\n"
                yield f"data: {json.dumps({'type': 'complete', 'cached': True})}\n\n"

            return StreamingResponse(cached_events(), media_type="text/event-stream")

    async def event_generator():
        queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()

        async def on_progress(evt: Dict[str, Any]) -> None:
            await queue.put({"type": "progress", **evt})

        async def run_pipeline() -> RankingResult:
            return await _get_ranking(
                session,
                job,
                owner_id=user.user_id,
                refresh=True,
                extra_metadata={"on_progress": on_progress},
            )

        task = asyncio.create_task(run_pipeline())
        while not task.done():
            try:
                evt = await asyncio.wait_for(queue.get(), timeout=0.25)
                yield f"data: {json.dumps(evt)}\n\n"
            except asyncio.TimeoutError:
                continue
        while not queue.empty():
            evt = await queue.get()
            yield f"data: {json.dumps(evt)}\n\n"
        try:
            result = await task
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return
        yield f"data: {json.dumps({'type': 'complete', 'count': len(result.ranked_candidates), 'cached': False})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{job_id}/rank", response_model=RankingResult)
async def rank_for_job(
    request: Request,
    job_id: UUID,
    refresh: bool = Query(False, description="Force re-run of the 7-agent pipeline"),
    semantic_weights: bool = Query(
        False,
        description="Use semantic-enhanced weights (10%% semantic) instead of hackathon spec",
    ),
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Run (or return cached) multi-agent ranking for a job."""
    rate_limit_expensive(request, user)
    job = await get_job(session, str(job_id), user.user_id)
    if not job:
        raise HTTPException(404, "Job not found")
    job = await _ensure_job_blueprint(session, job, user.user_id)
    extra = {"use_semantic_weights": semantic_weights} if semantic_weights else None
    return await _get_ranking(
        session,
        job,
        owner_id=user.user_id,
        refresh=refresh,
        extra_metadata=extra,
    )


@router.post("/{job_id}/whatif", response_model=RankingResult)
async def whatif_rerank(
    request: Request,
    job_id: UUID,
    payload: WhatIfRequest,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Re-rank with modified requirements (not cached)."""
    rate_limit_expensive(request, user)
    job = await get_job(session, str(job_id), user.user_id)
    if not job or not job.blueprint:
        raise HTTPException(404, "Job or blueprint not found")

    blueprint = job.blueprint.model_copy(deep=True)
    if payload.removed_skills:
        blueprint.hard_skills = [
            s for s in blueprint.hard_skills if s not in payload.removed_skills
        ]
    if payload.added_skills:
        blueprint.hard_skills = list(set(blueprint.hard_skills + payload.added_skills))
    if payload.seniority_override:
        blueprint.seniority = payload.seniority_override

    job = job.model_copy(update={"blueprint": blueprint})
    return await _get_ranking(
        session,
        job,
        owner_id=user.user_id,
        refresh=True,
        title_suffix=" (what-if)",
        extra_metadata={"whatif": True},
    )


@router.get("/{job_id}/bias", response_model=BiasReport)
async def bias_report(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Analyze demographic distribution in the top shortlist (uses cached ranking)."""
    job = await get_job(session, str(job_id), user.user_id)
    if not job:
        raise HTTPException(404, "Job not found")

    candidates = await list_candidate_profiles(session, user.user_id)
    if not candidates:
        raise HTTPException(400, "No candidates")

    job = await _ensure_job_blueprint(session, job, user.user_id)
    ranking = await _get_ranking(session, job, owner_id=user.user_id, refresh=False)
    return _build_bias_report(
        job.id,
        ranking.ranked_candidates,
        candidates,
        cached=ranking.cached,
    )


@router.post("/{job_id}/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: Request,
    job_id: UUID,
    payload: ChatRequest,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """AI recruiter chat — uses cached ranking for fast responses."""
    rate_limit_expensive(request, user)
    job = await get_job(session, str(job_id), user.user_id)
    if not job or not job.blueprint:
        raise HTTPException(404, "Job or blueprint not found")

    ranking = await _get_ranking(session, job, owner_id=user.user_id, refresh=False)
    ranked = ranking.ranked_candidates
    history = [m.model_dump() for m in payload.history]

    from app.utils.ai_guardrails import assess_user_message

    verdict = assess_user_message(payload.message)
    if not verdict.allowed:
        return ChatResponse(
            reply=verdict.block_reply,
            referenced_candidates=[],
            guardrail_notice=verdict.code or "blocked",
        )

    reply = await chat_about_rankings(
        job.blueprint,
        ranked,
        verdict.sanitized_message,
        history,
    )

    referenced = []
    for rc in ranked:
        if rc.candidate_name.lower() in reply.lower():
            referenced.append(rc.candidate_id)
    return ChatResponse(reply=reply, referenced_candidates=referenced)