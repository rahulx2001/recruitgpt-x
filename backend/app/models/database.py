"""SQLAlchemy ORM models — cross-compatible (Postgres + SQLite)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class _JSONList(TypeDecorator):
    """Stores a list as JSON text — portable across SQLite + Postgres."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (list, dict)):
            return value
        try:
            return json.loads(value)
        except Exception:
            return None


class Base(DeclarativeBase):
    pass


class CandidateORM(Base):
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True, default="dev-user")
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    headline: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(Text)
    current_role: Mapped[Optional[str]] = mapped_column(Text)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)
    resume_text: Mapped[str] = mapped_column(Text, default="")
    linkedin_url: Mapped[Optional[str]] = mapped_column(Text)
    github_url: Mapped[Optional[str]] = mapped_column(Text)
    portfolio_url: Mapped[Optional[str]] = mapped_column(Text)
    gender: Mapped[Optional[str]] = mapped_column(Text)
    ethnicity: Mapped[Optional[str]] = mapped_column(Text)
    school: Mapped[Optional[str]] = mapped_column(Text)
    github_stats: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    certifications: Mapped[Optional[List[str]]] = mapped_column(_JSONList)
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Relationships
    experiences: Mapped[List["WorkExperienceORM"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    projects: Mapped[List["ProjectORM"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    skills: Mapped[List["CandidateSkillORM"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    skill_history: Mapped[List["SkillHistoryORM"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )


class WorkExperienceORM(Base):
    __tablename__ = "work_experiences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE")
    )
    company: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text)
    start_date: Mapped[Optional[str]] = mapped_column(Text)
    end_date: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)

    candidate: Mapped["CandidateORM"] = relationship(back_populates="experiences")


class ProjectORM(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    technologies: Mapped[Optional[List[str]]] = mapped_column(_JSONList)
    url: Mapped[Optional[str]] = mapped_column(Text)
    impact: Mapped[Optional[str]] = mapped_column(Text)

    candidate: Mapped["CandidateORM"] = relationship(back_populates="projects")


class SkillHistoryORM(Base):
    """Temporal skill adoption — year-over-year progression."""

    __tablename__ = "skill_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    skill_name: Mapped[str] = mapped_column(Text)
    year: Mapped[int] = mapped_column(Integer)
    proficiency: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(Text, default="experience")
    context: Mapped[Optional[str]] = mapped_column(Text)

    candidate: Mapped["CandidateORM"] = relationship(back_populates="skill_history")


class CandidateSkillORM(Base):
    __tablename__ = "candidate_skills"

    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True
    )
    skill_name: Mapped[str] = mapped_column(Text, primary_key=True)
    proficiency: Mapped[int] = mapped_column(Integer, default=3)
    years: Mapped[float] = mapped_column(Float, default=0.0)
    category: Mapped[Optional[str]] = mapped_column(Text)

    candidate: Mapped["CandidateORM"] = relationship(back_populates="skills")


class JobORM(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True, default="dev-user")
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    blueprint: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class RankingORM(Base):
    __tablename__ = "rankings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE")
    )
    candidate_id: Mapped[str] = mapped_column(String(36), ForeignKey("candidates.id"))
    rank: Mapped[int] = mapped_column(Integer)
    hireability_score: Mapped[float] = mapped_column(Float)
    sub_scores: Mapped[Dict[str, Any]] = mapped_column(JSON)
    explanation: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class RankingCacheORM(Base):
    """One cached ranking snapshot per job — avoids re-running the full pipeline."""

    __tablename__ = "ranking_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), unique=True
    )
    job_title: Mapped[str] = mapped_column(Text)
    blueprint: Mapped[Dict[str, Any]] = mapped_column(JSON)
    ranked: Mapped[List[Dict[str, Any]]] = mapped_column(JSON)
    pipeline_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
