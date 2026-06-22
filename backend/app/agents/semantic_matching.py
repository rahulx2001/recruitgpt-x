"""Agent 5 — Semantic Matching Agent.

Compares candidate profile embeddings with job blueprint embeddings.
Uses both embedding similarity and LLM reasoning for functional relevance.
"""

from __future__ import annotations

from typing import Any, Dict

from app.models.schemas import (
    CandidateIntelligence,
    CandidateProfile,
    HiringBlueprint,
    SemanticScores,
)
from app.services.embeddings import get_embeddings
from app.services.llm import get_llm
from app.utils.prompt_sanitizer import sanitize_for_llm, wrap_untrusted

SEMANTIC_SYSTEM = """You are a semantic matching expert. Given a job's hiring blueprint
and a candidate's intelligence profile, score the semantic match.

Score 0.0-1.0:
- embedding_similarity: meaning-level match between job and candidate
- functional_similarity: do they perform the SAME FUNCTION the job needs?
- experience_relevance: is past experience directly relevant?
- domain_alignment: are they in the right domain?
- composite_semantic_score: weighted blend

Return valid JSON only."""


def _build_candidate_text(
    profile: CandidateProfile, intel: CandidateIntelligence
) -> str:
    skills = ", ".join(intel.skills or [s.name for s in profile.skills])
    roles = ", ".join([e.role for e in profile.experiences])
    companies = ", ".join([e.company for e in profile.experiences])
    return f"""Candidate {profile.full_name} — {profile.headline or ""}
Current role: {profile.current_role or ""}
Skills: {skills}
Past roles: {roles}
Companies: {companies}
Years experience: {profile.years_experience}
Summary: {sanitize_for_llm(intel.summary or (profile.resume_text or ""), max_len=500)}
"""


def _build_job_text(blueprint: HiringBlueprint, description: str) -> str:
    return f"""Job description: {sanitize_for_llm(description, max_len=1500)}
Required skills: {", ".join(blueprint.hard_skills)}
Industry: {blueprint.industry}
Seniority: {blueprint.seniority}
Domain keywords: {", ".join(blueprint.domain_keywords)}
"""


def _cosine(a, b) -> float:
    import numpy as np

    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    na = float(np.linalg.norm(va))
    nb = float(np.linalg.norm(vb))
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(va, vb) / (na * nb))


async def semantic_match(
    profile: CandidateProfile,
    intel: CandidateIntelligence,
    blueprint: HiringBlueprint,
    description: str,
) -> SemanticScores:
    emb = get_embeddings()
    cand_text = _build_candidate_text(profile, intel)
    job_text = _build_job_text(blueprint, description)
    cand_vec = emb.embed_one(cand_text)
    job_vec = emb.embed_one(job_text)
    embedding_sim = _cosine(cand_vec, job_vec)

    # Functional heuristic: overlap of skills with required hard skills
    cand_skill_set = {
        s.lower() for s in (intel.skills or [s.name for s in profile.skills])
    }
    required = {s.lower() for s in blueprint.hard_skills}
    if required:
        overlap = len(cand_skill_set & required) / len(required)
    else:
        overlap = 0.0
    functional_sim = round(0.6 * overlap + 0.4 * max(0.0, embedding_sim), 3)

    # Domain alignment heuristic
    cand_text_lower = cand_text.lower()
    domain_hits = sum(
        1 for kw in blueprint.domain_keywords if kw.lower() in cand_text_lower
    )
    domain_align = (
        min(1.0, domain_hits / max(1, len(blueprint.domain_keywords)))
        if blueprint.domain_keywords
        else 0.5
    )

    # Experience relevance — years match
    yrs_match = 0.0
    if blueprint.years_experience_min:
        if profile.years_experience >= blueprint.years_experience_min:
            yrs_match = min(
                1.0, profile.years_experience / (blueprint.years_experience_min + 3)
            )
        else:
            yrs_match = (
                profile.years_experience / max(1, blueprint.years_experience_min) * 0.6
            )

    llm = get_llm()
    user_prompt = f"""JOB BLUEPRINT:
Hard skills: {", ".join(blueprint.hard_skills)}
Seniority: {blueprint.seniority}
Years min: {blueprint.years_experience_min}
Hidden requirements: {", ".join(blueprint.hidden_requirements)}

CANDIDATE PROFILE:
{cand_text[:1500]}

CANDIDATE INTELLIGENCE SUMMARY:
{intel.summary}

PRELIMINARY SCORES:
- embedding_similarity: {embedding_sim:.3f}
- functional_similarity: {functional_sim:.3f}
- experience_relevance: {yrs_match:.3f}
- domain_alignment: {domain_align:.3f}

Refine these scores with nuanced reasoning. Return JSON:
- embedding_similarity
- functional_similarity
- experience_relevance
- domain_alignment
- composite_semantic_score (weighted blend)
"""
    fallback = {
        "embedding_similarity": round(embedding_sim, 3),
        "functional_similarity": functional_sim,
        "experience_relevance": round(yrs_match, 3),
        "domain_alignment": round(domain_align, 3),
        "composite_semantic_score": round(
            0.3 * embedding_sim
            + 0.3 * functional_sim
            + 0.2 * yrs_match
            + 0.2 * domain_align,
            3,
        ),
    }
    data = await llm.structured_complete(SEMANTIC_SYSTEM, user_prompt, fallback)
    if not data.get("composite_semantic_score"):
        vals = [
            data.get("embedding_similarity", 0),
            data.get("functional_similarity", 0),
            data.get("experience_relevance", 0),
            data.get("domain_alignment", 0),
        ]
        data["composite_semantic_score"] = round(sum(vals) / 4.0, 3)
    return SemanticScores(**data)
