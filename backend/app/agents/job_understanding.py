"""Agent 1 — Job Understanding Agent.

Parses a raw job description into a structured HiringBlueprint.
"""

from __future__ import annotations

import json
from typing import Any, Dict

from app.models.schemas import HiringBlueprint
from app.services.llm import get_llm
from app.utils.prompt_sanitizer import sanitize_for_llm, wrap_untrusted

JOB_UNDERSTANDING_SYSTEM = """You are an expert technical recruiter and head of talent.
Your job is to read a job description and extract a STRUCTURED hiring blueprint.

You must identify:
1. Hard skills (specific technical skills required)
2. Soft skills (communication, leadership, collaboration)
3. Industry context
4. Seniority level (Intern | Junior | Mid | Senior | Staff | Principal)
5. Minimum years of experience required
6. Leadership requirement (low | medium | high)
7. Communication requirement (low | medium | high)
8. Growth expectation (e.g. "IC track", "fast-track to staff", "people manager")
9. HIDDEN requirements — what the JD implies but doesn't say explicitly
   (e.g. "startup experience", "production-scale systems", "cross-functional leadership")
10. Domain keywords — specific concepts the role touches

Always return valid JSON matching the schema. Be specific and insightful — surface what
a great recruiter would notice between the lines."""


async def parse_job_description(title: str, description: str) -> HiringBlueprint:
    """Parse a JD into a HiringBlueprint using LLM."""
    llm = get_llm()
    user_prompt = f"""JOB TITLE: {sanitize_for_llm(title, max_len=500)}

{wrap_untrusted("job_description", description, max_len=50_000)}

Extract a structured hiring blueprint. Return JSON with these fields:
- hard_skills: list of strings
- soft_skills: list of strings
- industry: string
- seniority: one of [Intern, Junior, Mid, Senior, Staff, Principal]
- years_experience_min: integer
- leadership_requirement: one of [low, medium, high]
- communication_requirement: one of [low, medium, high]
- growth_expectation: string describing expected trajectory
- hidden_requirements: list of inferred requirements not stated explicitly
- domain_keywords: list of key domain concepts
- reasoning: brief paragraph explaining your interpretation
"""
    fallback = {
        "hard_skills": [],
        "soft_skills": [],
        "industry": "",
        "seniority": "Senior",
        "years_experience_min": 3,
        "leadership_requirement": "medium",
        "communication_requirement": "medium",
        "growth_expectation": "",
        "hidden_requirements": [],
        "domain_keywords": [],
        "reasoning": "Fallback blueprint (LLM unavailable).",
    }
    data = await llm.structured_complete(
        JOB_UNDERSTANDING_SYSTEM, user_prompt, fallback
    )
    return HiringBlueprint(**data)
