"""Agent 6 — Ranking Agent.

Combines all sub-scores into a final hireability score and produces a ranked list.
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.models.schemas import (
    BehavioralScores,
    CandidateIntelligence,
    HiringBlueprint,
    RankedCandidate,
    SemanticScores,
    SubScores,
    TrajectoryScores,
)

# Hackathon prompt spec (100% — no semantic dimension).
PROMPT_WEIGHTS: Dict[str, float] = {
    "skill_match": 0.30,
    "project_relevance": 0.20,
    "career_growth": 0.15,
    "behavioral": 0.15,
    "learning": 0.10,
    "communication": 0.10,
    "semantic": 0.00,
}

# Enhanced mode: prompt-aligned (90%) + semantic meaning-fit (10%). Sum = 1.0.
SEMANTIC_WEIGHTS: Dict[str, float] = {
    "skill_match": 0.27,
    "project_relevance": 0.18,
    "career_growth": 0.135,
    "behavioral": 0.135,
    "learning": 0.09,
    "communication": 0.09,
    "semantic": 0.10,
}

# Back-compat alias
DEFAULT_WEIGHTS = SEMANTIC_WEIGHTS


def get_ranking_weights(*, use_semantic: bool | None = None) -> Dict[str, float]:
    """Return active ranking weights. Default matches hackathon spec."""
    if use_semantic is None:
        from app.config import get_settings

        use_semantic = get_settings().use_semantic_ranking_weights
    return SEMANTIC_WEIGHTS if use_semantic else PROMPT_WEIGHTS


def _skill_match_score(
    blueprint: HiringBlueprint, intel: CandidateIntelligence
) -> float:
    """What fraction of required hard skills are present in candidate skills."""
    required = {s.lower() for s in blueprint.hard_skills}
    if not required:
        return 0.5
    cand = {s.lower() for s in intel.skills}
    return round(len(required & cand) / len(required), 3)


def _project_relevance_score(
    blueprint: HiringBlueprint, intel: CandidateIntelligence
) -> float:
    """How well do candidate projects align with required domain keywords / skills."""
    if not intel.projects:
        return 0.3
    keywords = {k.lower() for k in (blueprint.domain_keywords + blueprint.hard_skills)}
    if not keywords:
        return 0.5
    matches = 0
    total = 0
    for proj in intel.projects:
        proj_text = (
            (proj.name or "")
            + " "
            + (proj.description or "")
            + " "
            + " ".join(proj.technologies or [])
        ).lower()
        for kw in keywords:
            total += 1
            if kw in proj_text:
                matches += 1
    if total == 0:
        return 0.5
    return round(matches / total, 3)


def _communication_score(intel: CandidateIntelligence) -> float:
    """Proxy for communication: evidence from leadership, presentations, mentoring."""
    base = 0.5
    base += min(0.3, 0.05 * len(intel.communication_evidence))
    base += min(0.2, 0.04 * len(intel.leadership_evidence))
    return round(min(1.0, base), 3)


def compute_sub_scores(
    blueprint: HiringBlueprint,
    intel: CandidateIntelligence,
    behavioral: BehavioralScores,
    trajectory: TrajectoryScores,
    semantic: SemanticScores,
) -> SubScores:
    return SubScores(
        skill_match=_skill_match_score(blueprint, intel),
        project_relevance=_project_relevance_score(blueprint, intel),
        career_growth=round(trajectory.composite, 3),
        behavioral=round(behavioral.composite, 3),
        learning=round(behavioral.learning_score, 3),
        communication=_communication_score(intel),
        semantic=round(semantic.composite_semantic_score, 3),
    )


def compute_hireability(
    sub: SubScores, weights: Dict[str, float] | None = None
) -> float:
    w = weights if weights else get_ranking_weights()
    score = (
        w["skill_match"] * sub.skill_match
        + w["project_relevance"] * sub.project_relevance
        + w["career_growth"] * sub.career_growth
        + w["behavioral"] * sub.behavioral
        + w["learning"] * sub.learning
        + w["communication"] * sub.communication
        + w["semantic"] * sub.semantic
    )
    return round(min(1.0, max(0.0, score)), 4)


def rank_candidates(
    enriched: List[Dict[str, Any]],
    weights: Dict[str, float] | None = None,
) -> List[RankedCandidate]:
    """Sort enriched candidates by hireability and assign rank."""
    # Sort by hireability desc
    enriched.sort(key=lambda e: e["hireability_score"], reverse=True)
    ranked: List[RankedCandidate] = []
    for i, e in enumerate(enriched):
        rc = RankedCandidate(
            candidate_id=e["profile"].id,
            candidate_name=e["profile"].full_name,
            rank=i + 1,
            hireability_score=e["hireability_score"],
            sub_scores=e["sub_scores"],
            explanation=e.get("explanation") or _placeholder_explanation(e),
            intelligence=e.get("intelligence"),
            behavioral=e.get("behavioral"),
            trajectory=e.get("trajectory"),
            semantic=e.get("semantic"),
        )
        ranked.append(rc)
    return ranked


def _placeholder_explanation(enriched: Dict[str, Any]) -> Any:
    from app.models.schemas import Explanation

    sub: SubScores = enriched["sub_scores"]
    return Explanation(
        summary=f"Ranked #{enriched.get('rank', '?')} with hireability {enriched['hireability_score']:.2f}",
        strengths=[
            f"Skill match: {sub.skill_match:.0%}",
            f"Behavioral: {sub.behavioral:.0%}",
        ],
        weaknesses=[],
        interview_focus_areas=["Validate domain depth"],
        hiring_manager_talking_points=["Discuss recent projects"],
    )
