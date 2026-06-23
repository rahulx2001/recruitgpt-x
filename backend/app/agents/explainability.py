"""Agent 7 — Explainability Agent.

Generates recruiter-friendly narrative explanations for ranked candidates.
"""

from __future__ import annotations

from typing import Any, Dict

from app.models.schemas import (
    BehavioralScores,
    CandidateIntelligence,
    CandidateProfile,
    Explanation,
    HiringBlueprint,
    RankedCandidate,
    SemanticScores,
    SubScores,
    TrajectoryScores,
)
from app.services.llm import get_llm
from app.utils.ai_guardrails import (
    CHAT_SYSTEM_GUARDRAILS,
    redact_assistant_output,
    sanitize_chat_history,
)
from app.utils.prompt_sanitizer import sanitize_for_llm

EXPLAIN_SYSTEM = """You are a senior recruiter writing a candidate evaluation for a hiring manager.
Given a candidate's scores, write a structured explanation.

Provide:
- summary: 2-3 sentence headline verdict
- strengths: 3-5 bullet points highlighting what they bring
- weaknesses: 2-4 bullet points of gaps or risks
- interview_focus_areas: 2-3 things to probe in the interview
- hiring_manager_talking_points: 2-3 questions for the hiring manager to ask

Be specific, evidence-based, and candid. Avoid fluff. Return valid JSON."""


async def explain_candidate(
    profile: CandidateProfile,
    blueprint: HiringBlueprint,
    intel: CandidateIntelligence,
    behavioral: BehavioralScores,
    trajectory: TrajectoryScores,
    semantic: SemanticScores,
    sub: SubScores,
    rank: int,
    hireability: float,
) -> Explanation:
    llm = get_llm()

    strengths_signals = []
    if sub.skill_match > 0.7:
        strengths_signals.append(f"Strong skill match ({sub.skill_match:.0%})")
    if sub.project_relevance > 0.7:
        strengths_signals.append(
            f"Highly relevant project portfolio ({sub.project_relevance:.0%})"
        )
    if trajectory.growth_velocity > 0.7:
        strengths_signals.append(
            f"Strong career trajectory (growth velocity {trajectory.growth_velocity:.0%})"
        )
    if behavioral.consistency_score > 0.7:
        strengths_signals.append("Consistent activity and learning patterns")
    if semantic.composite_semantic_score > 0.8:
        strengths_signals.append("Excellent semantic fit with role")

    weakness_signals = []
    if sub.skill_match < 0.5:
        weakness_signals.append("Partial skill match — gaps in core requirements")
    if sub.communication < 0.5:
        weakness_signals.append("Limited demonstrated communication evidence")
    if trajectory.adaptability < 0.5:
        weakness_signals.append("Lower adaptability signals")
    if behavioral.consistency_score < 0.5:
        weakness_signals.append("Inconsistent activity pattern")

    user_prompt = f"""JOB BLUEPRINT:
- Role: {blueprint.seniority} level
- Required hard skills: {", ".join(blueprint.hard_skills)}
- Hidden requirements: {", ".join(blueprint.hidden_requirements)}
- Domain: {blueprint.industry}

CANDIDATE: {profile.full_name}
- Headline: {profile.headline or "—"}
- Years experience: {profile.years_experience}
- Current role: {profile.current_role or "—"}

SUB-SCORES (0-1):
- Skill match: {sub.skill_match:.2f}
- Project relevance: {sub.project_relevance:.2f}
- Career growth: {sub.career_growth:.2f}
- Behavioral: {sub.behavioral:.2f}
- Learning: {sub.learning:.2f}
- Communication: {sub.communication:.2f}
- Semantic: {sub.semantic:.2f}

RANK: #{rank} (hireability {hireability:.2f})

KEY SIGNALS DETECTED:
Strengths: {", ".join(strengths_signals) or "none specific"}
Weaknesses: {", ".join(weakness_signals) or "none specific"}

TRAJECTORY: {trajectory.trajectory_type}, potential {trajectory.future_potential:.0%}
BEHAVIORAL COMPOSITE: {behavioral.composite:.0%}

Write a recruiter-friendly explanation. Return JSON:
- summary
- strengths: list of strings
- weaknesses: list of strings
- interview_focus_areas: list of strings
- hiring_manager_talking_points: list of strings
"""
    fallback = {
        "summary": (
            f"Ranked #{rank} with overall hireability score {hireability:.0%}. "
            f"Skill match {sub.skill_match:.0%}, semantic fit {sub.semantic:.0%}."
        ),
        "strengths": strengths_signals
        or ["Solid overall profile across evaluated dimensions"],
        "weaknesses": weakness_signals or ["No critical weaknesses identified"],
        "interview_focus_areas": [
            "Validate depth in core required skills",
            "Probe collaboration and communication style",
        ],
        "hiring_manager_talking_points": [
            "Walk through most recent project decisions and trade-offs",
            "Discuss motivations for career moves",
        ],
    }
    data = await llm.structured_complete(EXPLAIN_SYSTEM, user_prompt, fallback)
    return Explanation(**data)


def _candidates_mentioned(message: str, ranked: list[RankedCandidate]) -> list:
    """Match full names or first names mentioned in the recruiter's question."""
    msg = message.lower()
    found: list[RankedCandidate] = []
    seen: set = set()
    for rc in ranked:
        full = rc.candidate_name.lower()
        tokens = [full, full.split()[0]] if full else []
        if any(t and t in msg for t in tokens):
            if rc.candidate_id not in seen:
                seen.add(rc.candidate_id)
                found.append(rc)
    return found


def _format_candidate_line(rc: RankedCandidate) -> str:
    s = rc.sub_scores
    return (
        f"{rc.candidate_name} (#{rc.rank}, score {rc.hireability_score:.2f}): "
        f"skill={s.skill_match:.3f}, semantic={s.semantic:.3f}, "
        f"growth={s.career_growth:.3f}, behavioral={s.behavioral:.3f}"
    )


async def chat_about_rankings(
    blueprint: HiringBlueprint,
    ranked: list[RankedCandidate],
    message: str,
    history: list = None,
) -> str:
    """Conversational AI recruiter — answers free-form questions about the shortlist."""
    llm = get_llm()

    top = ranked[:5]
    top_summary = "\n".join(
        [
            f"#{rc.rank} {rc.candidate_name} (score {rc.hireability_score:.2f}) — "
            f"skill_match={rc.sub_scores.skill_match:.0%}, "
            f"semantic={rc.sub_scores.semantic:.0%}, "
            f"career_growth={rc.sub_scores.career_growth:.0%}, "
            f"behavioral={rc.sub_scores.behavioral:.0%}. "
            f"Reasoning: {rc.explanation.summary}"
            for rc in top
        ]
    )

    mentioned = _candidates_mentioned(message, ranked)
    comparison_block = ""
    if len(mentioned) >= 2:
        comparison_block = "COMPARISON:\n" + "\n".join(
            _format_candidate_line(rc) for rc in mentioned[:4]
        )
    elif len(mentioned) == 1:
        comparison_block = "FOCUS CANDIDATE:\n" + _format_candidate_line(mentioned[0])

    safe_history = sanitize_chat_history(history)
    history_text = ""
    if safe_history:
        history_text = "\n".join(
            [f"{m['role'].upper()}: {m['content']}" for m in safe_history]
        )

    safe_message = sanitize_for_llm(message or "", max_len=4000)

    system = CHAT_SYSTEM_GUARDRAILS

    user = f"""JOB: {blueprint.seniority} role. Required skills: {", ".join(blueprint.hard_skills)}.

TOP CANDIDATES:
{top_summary}

{comparison_block}

CONVERSATION HISTORY:
{history_text or "(none)"}

RECRUITER'S QUESTION: {safe_message}

Answer as a recruiting partner."""

    raw = await llm.complete(system, user, temperature=0.3)
    return redact_assistant_output(raw)
