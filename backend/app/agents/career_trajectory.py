"""Agent 4 — Career Trajectory Agent.

Analyzes work-experience timeline to determine growth velocity, adaptability,
and future potential.
"""

from __future__ import annotations

from typing import Any, Dict

from app.models.schemas import CandidateProfile, TrajectoryScores
from app.services.llm import get_llm

TRAJECTORY_SYSTEM = """You are a career trajectory analyst. Given a candidate's work history,
determine their career pattern and predict their trajectory.

Analyze:
- Promotion velocity (titles climbing over time?)
- Role changes (lateral moves, domain switches, scope expansion)
- Tenure patterns (long stints vs job-hopping)
- Skill evolution across roles
- Trajectory type: one of [accelerating, steady, plateauing, declining]

Score 0.0-1.0:
- growth_velocity: how fast are they moving up?
- adaptability: evidence of learning new domains / skills
- future_potential: where will they be in 2-3 years?
- composite: weighted combination

Provide brief reasoning. Return valid JSON."""


def _heuristic_trajectory(profile: CandidateProfile) -> Dict[str, Any]:
    """Baseline trajectory from raw timeline."""
    exps = profile.experiences or []
    n_roles = len(exps)
    years = max(1, profile.years_experience or 1)

    # Title-based seniority signals
    senior_keywords = [
        "senior",
        "staff",
        "principal",
        "lead",
        "manager",
        "director",
        "head",
    ]
    junior_keywords = ["intern", "junior", "associate", "assistant"]

    senior_count = sum(
        1 for e in exps if any(k in (e.role or "").lower() for k in senior_keywords)
    )
    junior_count = sum(
        1 for e in exps if any(k in (e.role or "").lower() for k in junior_keywords)
    )

    growth_velocity = min(1.0, senior_count / max(1, n_roles))
    adaptability = min(1.0, len({(e.company or "") for e in exps}) / max(2, n_roles))
    future_potential = min(1.0, (senior_count + 1) / max(2, n_roles))

    # Trajectory type heuristic
    if senior_count >= 2 and years >= 4:
        trajectory_type = "accelerating"
    elif senior_count > junior_count:
        trajectory_type = "steady"
    elif senior_count == 0 and n_roles >= 3:
        trajectory_type = "plateauing"
    else:
        trajectory_type = "steady"

    timeline_summary = (
        " → ".join([f"{e.role} @ {e.company}" for e in exps[-4:]]) or "No work history"
    )

    return {
        "trajectory_type": trajectory_type,
        "growth_velocity": round(growth_velocity, 3),
        "adaptability": round(adaptability, 3),
        "future_potential": round(future_potential, 3),
        "timeline_summary": timeline_summary,
    }


async def score_trajectory(profile: CandidateProfile) -> TrajectoryScores:
    llm = get_llm()
    heur = _heuristic_trajectory(profile)

    exp_lines = (
        "\n".join(
            [
                f"- {e.role} @ {e.company} ({e.start_date or '?'} to {e.end_date or 'present'})"
                for e in profile.experiences
            ]
        )
        or "No work history"
    )

    user_prompt = f"""CANDIDATE: {profile.full_name}
YEARS EXPERIENCE: {profile.years_experience}

WORK HISTORY:
{exp_lines}

HEURISTIC BASELINE:
- trajectory_type: {heur["trajectory_type"]}
- growth_velocity: {heur["growth_velocity"]}
- adaptability: {heur["adaptability"]}
- future_potential: {heur["future_potential"]}
- timeline_summary: {heur["timeline_summary"]}

Refine with nuanced reasoning. Return JSON:
- trajectory_type: accelerating | steady | plateauing | declining
- growth_velocity: float 0-1
- adaptability: float 0-1
- future_potential: float 0-1
- composite: float 0-1
- reasoning: string
- timeline_summary: string
"""
    fallback = {
        **heur,
        "composite": round(
            (heur["growth_velocity"] + heur["adaptability"] + heur["future_potential"])
            / 3.0,
            3,
        ),
        "reasoning": "Heuristic baseline (LLM unavailable).",
    }
    data = await llm.structured_complete(TRAJECTORY_SYSTEM, user_prompt, fallback)
    if not data.get("composite"):
        vals = [
            data.get("growth_velocity", 0),
            data.get("adaptability", 0),
            data.get("future_potential", 0),
        ]
        data["composite"] = round(sum(vals) / 3.0, 3)
    return TrajectoryScores(**data)
