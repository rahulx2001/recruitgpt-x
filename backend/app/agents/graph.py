"""LangGraph orchestration of all 7 agents.

Each agent is a dedicated graph node for observability and demo storytelling.
Candidate-level work runs concurrently via asyncio.gather where safe.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.behavioral_intelligence import score_behavior
from app.agents.candidate_intelligence import extract_intelligence
from app.agents.career_trajectory import score_trajectory
from app.agents.explainability import explain_candidate
from app.agents.ranking import (
    compute_hireability,
    compute_sub_scores,
    get_ranking_weights,
    rank_candidates,
)
from app.agents.semantic_matching import semantic_match
from app.services.github import fetch_github_stats
from app.services.linkedin import fetch_linkedin_profile
from app.models.schemas import (
    CandidateProfile,
    HiringBlueprint,
    RankedCandidate,
)


class RecruitmentState(TypedDict, total=False):
    """Shared state passed between LangGraph nodes."""

    job_id: str
    job_title: str
    job_description: str
    blueprint: HiringBlueprint
    candidates: List[CandidateProfile]
    enriched: List[Dict[str, Any]]
    ranked: List[RankedCandidate]
    weights: Dict[str, float]
    metadata: Dict[str, Any]


def _meta(state: RecruitmentState) -> Dict[str, Any]:
    return dict(state.get("metadata", {}))


def _append_agent(md: Dict[str, Any], name: str) -> None:
    completed = md.get("agents_completed", [])
    if name not in completed:
        md["agents_completed"] = completed + [name]


# ============================================================
# Agent nodes (1–7)
# ============================================================


async def node_job_understanding(state: RecruitmentState) -> Dict[str, Any]:
    """Agent 1 — blueprint is parsed before graph entry; mark stage complete."""
    md = _meta(state)
    _append_agent(md, "job_understanding")
    return {"metadata": md}


async def node_candidate_intelligence(state: RecruitmentState) -> Dict[str, Any]:
    """Agent 2 — extract skills, projects, achievements per candidate (parallel)."""
    candidates: List[CandidateProfile] = state.get("candidates", [])
    enriched: List[Dict[str, Any]] = list(state.get("enriched", []))
    by_id = {e["profile"].id: e for e in enriched}

    async def process(cand: CandidateProfile) -> None:
        if cand.id not in by_id:
            by_id[cand.id] = {"profile": cand}
        if "intelligence" not in by_id[cand.id]:
            linkedin_ctx = None
            if cand.linkedin_url:
                linkedin_ctx = await fetch_linkedin_profile(cand.linkedin_url, cand)
                by_id[cand.id]["linkedin_context"] = linkedin_ctx
            by_id[cand.id]["intelligence"] = await extract_intelligence(
                cand, linkedin_context=linkedin_ctx
            )

    await asyncio.gather(*[process(c) for c in candidates])

    md = _meta(state)
    _append_agent(md, "candidate_intelligence")
    md["enriched_count"] = len(by_id)
    return {"enriched": list(by_id.values()), "metadata": md}


async def node_parallel_signals(state: RecruitmentState) -> Dict[str, Any]:
    """Agents 3+4 — behavioral and career trajectory per candidate (parallel)."""
    enriched = list(state.get("enriched", []))

    async def process(e: Dict[str, Any]) -> None:
        profile = e["profile"]
        if profile.github_url and not profile.github_stats:
            live_stats = await fetch_github_stats(profile.github_url)
            profile = profile.model_copy(update={"github_stats": live_stats})
            e["profile"] = profile
        coros = []
        keys = []
        if "behavioral" not in e:
            coros.append(score_behavior(profile))
            keys.append("behavioral")
        if "trajectory" not in e:
            coros.append(score_trajectory(profile))
            keys.append("trajectory")
        if coros:
            results = await asyncio.gather(*coros)
            for key, val in zip(keys, results):
                e[key] = val

    await asyncio.gather(*[process(e) for e in enriched])

    md = _meta(state)
    _append_agent(md, "behavioral_intelligence")
    _append_agent(md, "career_trajectory")
    return {"enriched": enriched, "metadata": md}


async def node_semantic_matching(state: RecruitmentState) -> Dict[str, Any]:
    """Agent 5 — embedding + LLM semantic alignment (parallel per candidate)."""
    enriched = list(state.get("enriched", []))
    blueprint: HiringBlueprint = state["blueprint"]
    description: str = state["job_description"]
    weights = state.get("weights")

    async def process(e: Dict[str, Any]) -> None:
        if "semantic" not in e:
            e["semantic"] = await semantic_match(
                e["profile"],
                e["intelligence"],
                blueprint,
                description,
            )
        if "sub_scores" not in e:
            e["sub_scores"] = compute_sub_scores(
                blueprint,
                e["intelligence"],
                e["behavioral"],
                e["trajectory"],
                e["semantic"],
            )
        if "hireability_score" not in e:
            e["hireability_score"] = compute_hireability(e["sub_scores"], weights)
        e.setdefault("explanation", None)

    await asyncio.gather(*[process(e) for e in enriched])

    md = _meta(state)
    _append_agent(md, "semantic_matching")
    return {"enriched": enriched, "metadata": md}


async def node_ranking(state: RecruitmentState) -> Dict[str, Any]:
    """Agent 6 — mark ranking stage (sort happens in rank_candidates)."""
    md = _meta(state)
    _append_agent(md, "ranking")
    return {"metadata": md}


async def node_explainability(state: RecruitmentState) -> Dict[str, Any]:
    """Agent 7 — recruiter-friendly narratives + final ranked list."""
    enriched: List[Dict[str, Any]] = state.get("enriched", [])
    blueprint: HiringBlueprint = state["blueprint"]

    # Pre-sort once for rank assignment in explanations
    enriched.sort(key=lambda e: e["hireability_score"], reverse=True)

    async def explain_one(i: int, e: Dict[str, Any]) -> None:
        expl = await explain_candidate(
            profile=e["profile"],
            blueprint=blueprint,
            intel=e["intelligence"],
            behavioral=e["behavioral"],
            trajectory=e["trajectory"],
            semantic=e["semantic"],
            sub=e["sub_scores"],
            rank=i + 1,
            hireability=e["hireability_score"],
        )
        e["explanation"] = expl
        e["rank"] = i + 1

    await asyncio.gather(*[explain_one(i, e) for i, e in enumerate(enriched)])

    ranked = rank_candidates(enriched, state.get("weights"))
    md = _meta(state)
    _append_agent(md, "explainability")
    md["candidate_count"] = len(enriched)
    return {"enriched": enriched, "ranked": ranked, "metadata": md}


# ============================================================
# Graph construction
# ============================================================


def build_pipeline() -> Any:
    """Build the 7-agent LangGraph state machine."""
    g = StateGraph(RecruitmentState)

    g.add_node("job_understanding", node_job_understanding)
    g.add_node("candidate_intelligence", node_candidate_intelligence)
    g.add_node("parallel_signals", node_parallel_signals)
    g.add_node("semantic_matching", node_semantic_matching)
    g.add_node("ranking", node_ranking)
    g.add_node("explainability", node_explainability)

    g.set_entry_point("job_understanding")
    g.add_edge("job_understanding", "candidate_intelligence")
    g.add_edge("candidate_intelligence", "parallel_signals")
    g.add_edge("parallel_signals", "semantic_matching")
    g.add_edge("semantic_matching", "ranking")
    g.add_edge("ranking", "explainability")
    g.add_edge("explainability", END)

    return g.compile()


_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline


async def run_full_pipeline(
    job_id: str,
    job_title: str,
    job_description: str,
    blueprint: HiringBlueprint,
    candidates: List[CandidateProfile],
    weights: Dict[str, float] | None = None,
    on_progress: Any | None = None,
) -> Dict[str, Any]:
    """Run the entire pipeline. Returns a state dict with ranked list."""
    pipeline = get_pipeline()
    initial: RecruitmentState = {
        "job_id": job_id,
        "job_title": job_title,
        "job_description": job_description,
        "blueprint": blueprint,
        "candidates": candidates,
        "enriched": [],
        "ranked": [],
        "weights": weights if weights is not None else get_ranking_weights(),
        "metadata": {"candidate_count": len(candidates), "agents_completed": []},
    }

    if on_progress is None:
        final = await pipeline.ainvoke(initial)
        return final

    # Stream agent completion events for SSE consumers
    final: Dict[str, Any] = dict(initial)
    async for event in pipeline.astream(initial):
        for _node, update in event.items():
            if isinstance(update, dict):
                final.update(update)
                completed = final.get("metadata", {}).get("agents_completed", [])
                if completed:
                    await on_progress(
                        {"agent": completed[-1], "completed": completed.copy()}
                    )
    return final