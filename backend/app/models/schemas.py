"""Pydantic schemas — API contracts and shared types."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

# ============================================================
# Candidate Schemas
# ============================================================


class WorkExperience(BaseModel):
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    is_current: bool = False


class Project(BaseModel):
    name: str
    description: str = ""
    technologies: List[str] = Field(default_factory=list)
    url: Optional[str] = None
    impact: Optional[str] = None


class SkillProficiency(BaseModel):
    name: str
    proficiency: int = 3  # 1-5
    years: float = 0.0


class SkillHistoryEntry(BaseModel):
    """Year-over-year skill adoption record."""

    skill_name: str
    year: int = Field(..., ge=1990, le=2030)
    proficiency: int = Field(default=1, ge=1, le=5)
    source: str = "experience"  # experience | project | certification | inferred
    context: Optional[str] = None


class CandidateBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=320)
    headline: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=200)
    current_role: Optional[str] = Field(None, max_length=200)
    years_experience: int = Field(default=0, ge=0, le=60)
    resume_text: str = Field(default="", max_length=50_000)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    school: Optional[str] = None


class CandidateCreate(CandidateBase):
    skills: List[SkillProficiency] = Field(default_factory=list)
    experiences: List[WorkExperience] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    skill_history: List[SkillHistoryEntry] = Field(default_factory=list)
    github_stats: Optional[Dict[str, Any]] = None
    certifications: List[str] = Field(default_factory=list)


class Candidate(CandidateBase):
    id: UUID
    created_at: datetime


class CandidateProfile(Candidate):
    """Enriched candidate with all related data."""

    skills: List[SkillProficiency] = Field(default_factory=list)
    experiences: List[WorkExperience] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    skill_history: List[SkillHistoryEntry] = Field(default_factory=list)
    github_stats: Optional[Dict[str, Any]] = None
    certifications: List[str] = Field(default_factory=list)


# ============================================================
# Job Schemas
# ============================================================


class HiringBlueprint(BaseModel):
    hard_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    industry: str = ""
    seniority: str = ""
    years_experience_min: int = 0
    leadership_requirement: str = "medium"
    communication_requirement: str = "medium"
    growth_expectation: str = ""
    hidden_requirements: List[str] = Field(default_factory=list)
    domain_keywords: List[str] = Field(default_factory=list)
    reasoning: str = ""


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=50_000)
    blueprint: Optional[HiringBlueprint] = None


class Job(JobCreate):
    id: UUID
    blueprint: Optional[HiringBlueprint] = None
    created_at: datetime


# ============================================================
# Agent / Scoring Schemas
# ============================================================


class CandidateIntelligence(BaseModel):
    skills: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    leadership_evidence: List[str] = Field(default_factory=list)
    communication_evidence: List[str] = Field(default_factory=list)
    skill_evolution: List[str] = Field(default_factory=list)
    summary: str = ""


class BehavioralScores(BaseModel):
    growth_score: float = 0.0
    consistency_score: float = 0.0
    learning_score: float = 0.0
    initiative_score: float = 0.0
    composite: float = 0.0
    reasoning: str = ""
    signals: Dict[str, Any] = Field(default_factory=dict)


class TrajectoryScores(BaseModel):
    trajectory_type: str = "steady"  # accelerating | steady | plateauing | declining
    growth_velocity: float = 0.0
    adaptability: float = 0.0
    future_potential: float = 0.0
    composite: float = 0.0
    reasoning: str = ""
    timeline_summary: str = ""


class SemanticScores(BaseModel):
    embedding_similarity: float = 0.0
    functional_similarity: float = 0.0
    experience_relevance: float = 0.0
    domain_alignment: float = 0.0
    composite_semantic_score: float = 0.0


class SubScores(BaseModel):
    skill_match: float = 0.0
    project_relevance: float = 0.0
    career_growth: float = 0.0
    behavioral: float = 0.0
    learning: float = 0.0
    communication: float = 0.0
    semantic: float = 0.0


class Explanation(BaseModel):
    summary: str = ""
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    interview_focus_areas: List[str] = Field(default_factory=list)
    hiring_manager_talking_points: List[str] = Field(default_factory=list)


class RankedCandidate(BaseModel):
    candidate_id: UUID
    candidate_name: str
    rank: int
    hireability_score: float
    sub_scores: SubScores
    explanation: Explanation
    intelligence: Optional[CandidateIntelligence] = None
    behavioral: Optional[BehavioralScores] = None
    trajectory: Optional[TrajectoryScores] = None
    semantic: Optional[SemanticScores] = None


class RankingResult(BaseModel):
    job_id: UUID
    job_title: str
    blueprint: HiringBlueprint
    ranked_candidates: List[RankedCandidate]
    pipeline_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    cached: bool = False


# ============================================================
# Chat / Search / Misc
# ============================================================


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str = Field(..., max_length=4_000)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        role = v.strip().lower()
        if role not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return role


class ChatRequest(BaseModel):
    job_id: UUID
    message: str = Field(..., min_length=1, max_length=4_000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    reply: str
    referenced_candidates: List[UUID] = Field(default_factory=list)
    guardrail_notice: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2_000)
    top_k: int = Field(default=10, ge=1, le=50)
    filters: Optional[Dict[str, Any]] = None


class SearchResult(BaseModel):
    candidate: CandidateProfile
    similarity: float
    matched_aspects: List[str] = Field(default_factory=list)


class WhatIfRequest(BaseModel):
    job_id: UUID
    removed_skills: List[str] = Field(default_factory=list)
    added_skills: List[str] = Field(default_factory=list)
    seniority_override: Optional[str] = None


class BiasReport(BaseModel):
    job_id: UUID
    shortlist_size: int
    gender_distribution: Dict[str, int] = Field(default_factory=dict)
    ethnicity_distribution: Dict[str, int] = Field(default_factory=dict)
    school_distribution: Dict[str, int] = Field(default_factory=dict)
    location_distribution: Dict[str, int] = Field(default_factory=dict)
    flags: List[str] = Field(default_factory=list)
    overall_fairness_score: float = 1.0
    cached_ranking: bool = False


class PotentialPrediction(BaseModel):
    candidate_id: UUID
    current_level: str
    predicted_level_2y: str
    predicted_level_5y: str
    confidence: float
    reasoning: str
    growth_signals: List[str] = Field(default_factory=list)
