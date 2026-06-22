"""Agent 2 — Candidate Intelligence Agent.

Extracts skills, technologies, projects, achievements, leadership evidence,
and communication evidence from a candidate's resume + profile data.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.models.schemas import (
    CandidateIntelligence,
    CandidateProfile,
    Project,
)
from app.services.llm import get_llm
from app.services.skill_evolution import (
    build_skill_history_from_profile,
    skill_evolution_narrative,
)
from app.utils.prompt_sanitizer import sanitize_for_llm, wrap_untrusted

CANDIDATE_INTEL_SYSTEM = """You are an expert candidate profiler. Read a candidate's resume,
LinkedIn, and portfolio data and extract a STRUCTURED intelligence profile.

Extract:
- skills: all technical and domain skills mentioned
- technologies: specific tools, frameworks, languages
- projects: named projects with technologies used
- achievements: quantifiable wins (impact, scale, leadership)
- leadership_evidence: signals they led people, projects, or initiatives
- communication_evidence: writing, presenting, mentoring, public work
- summary: 2-3 sentence profile summary

Return valid JSON. Be exhaustive — surface everything relevant."""


def _skill_evolution_timeline(profile: CandidateProfile) -> list[str]:
    """Temporal skill evolution from skill_history table + role progression."""
    history = build_skill_history_from_profile(profile)
    narrative = skill_evolution_narrative(history)
    if narrative:
        return narrative

    timeline: list[str] = []
    if profile.experiences:
        for exp in profile.experiences[-3:]:
            tech_hint = ""
            if exp.description:
                tech_hint = f" — {sanitize_for_llm(exp.description, max_len=80)}"
            timeline.append(
                f"{exp.start_date or '?'}→{exp.end_date or 'now'}: {exp.role} @ {exp.company}{tech_hint}"
            )
    return timeline[:6]


async def extract_intelligence(
    profile: CandidateProfile,
    *,
    linkedin_context: Optional[Dict[str, Any]] = None,
) -> CandidateIntelligence:
    llm = get_llm()

    skills_text = ", ".join([s.name for s in profile.skills]) or "—"
    exp_text = (
        "\n".join(
            [
                f"- {e.role} @ {e.company} ({e.start_date or '?'} to {e.end_date or 'present'}): {e.description or ''}"
                for e in profile.experiences
            ]
        )
        or "—"
    )
    proj_text = (
        "\n".join(
            [
                f"- {p.name}: {p.description} (tech: {', '.join(p.technologies or [])})"
                for p in profile.projects
            ]
        )
        or "—"
    )
    certs_text = ", ".join(profile.certifications) or "—"
    linkedin_text = "—"
    if linkedin_context and linkedin_context.get("source") not in (None, "none"):
        linkedin_text = (
            f"headline={linkedin_context.get('headline', '—')}; "
            f"summary={linkedin_context.get('summary', linkedin_context.get('headline', '—'))}; "
            f"completeness={linkedin_context.get('profile_completeness', '—')}; "
            f"source={linkedin_context.get('source')}"
        )

    user_prompt = f"""CANDIDATE: {profile.full_name}
HEADLINE: {profile.headline or "—"}
CURRENT ROLE: {profile.current_role or "—"}
YEARS EXPERIENCE: {profile.years_experience}
LOCATION: {profile.location or "—"}
LINKEDIN URL: {profile.linkedin_url or "—"}
LINKEDIN ENRICHMENT:
{linkedin_text}

SKILLS:
{skills_text}

WORK EXPERIENCE:
{exp_text}

PROJECTS:
{proj_text}

CERTIFICATIONS:
{certs_text}

SKILL HISTORY (temporal):
{history_text}

{wrap_untrusted("resume_text", profile.resume_text or "", max_len=3000)}

Extract a structured intelligence profile. Return JSON with:
- skills: list of strings
- technologies: list of strings
- projects: list of {{name, description, technologies, impact}}
- achievements: list of strings (quantifiable wins)
- leadership_evidence: list of strings
- communication_evidence: list of strings
- skill_evolution: list of strings (temporal skill growth narrative)
- summary: 2-3 sentence profile summary
"""
    history = build_skill_history_from_profile(profile)
    history_text = (
        "\n".join(
            f"- {h.year}: {h.skill_name} (prof {h.proficiency}, {h.source})"
            + (f" — {h.context}" if h.context else "")
            for h in sorted(history, key=lambda x: (x.year, x.skill_name))[:12]
        )
        or "—"
    )
    evolution = _skill_evolution_timeline(profile)
    fallback = {
        "skills": [s.name for s in profile.skills],
        "technologies": [s.name for s in profile.skills if s.proficiency >= 3],
        "projects": [p.model_dump() for p in profile.projects],
        "achievements": [
            (p.impact or p.description)
            for p in profile.projects
            if (p.impact or p.description)
        ][:5],
        "leadership_evidence": [],
        "communication_evidence": [],
        "skill_evolution": evolution,
        "summary": profile.headline or "",
    }
    data = await llm.structured_complete(CANDIDATE_INTEL_SYSTEM, user_prompt, fallback)

    # Always ensure we have skills — fall back to profile.skills if LLM/mock returned empty.
    # This makes skill_match score meaningful even when no LLM is configured.
    if not data.get("skills"):
        data["skills"] = [s.name for s in profile.skills]
    if not data.get("technologies"):
        data["technologies"] = [s.name for s in profile.skills if s.proficiency >= 3]
    if not data.get("projects"):
        data["projects"] = [p.model_dump() for p in profile.projects]
    if not data.get("achievements"):
        data["achievements"] = [
            (p.impact or p.description)
            for p in profile.projects
            if (p.impact or p.description)
        ][:5]
    if not data.get("summary"):
        data["summary"] = profile.headline or profile.current_role or ""

    if not data.get("skill_evolution"):
        data["skill_evolution"] = evolution
    if data.get("skill_evolution") and "skill evolution" not in (data.get("summary") or "").lower():
        evo = "; ".join(data["skill_evolution"][:2])
        data["summary"] = f"{data['summary']} Skill evolution: {evo}".strip()

    # Coerce projects back into Project objects if dicts
    if isinstance(data.get("projects"), list):
        coerced = []
        for p in data["projects"]:
            if isinstance(p, dict):
                try:
                    coerced.append(Project(**p))
                except Exception:
                    coerced.append(
                        Project(
                            name=str(p.get("name", "unknown")),
                            description=p.get("description", ""),
                            technologies=p.get("technologies", []) or [],
                        )
                    )
            else:
                coerced.append(p)
        data["projects"] = coerced

    return CandidateIntelligence(**data)
