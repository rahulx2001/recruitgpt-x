"""Initial schema — matches app/models/database.py

Revision ID: 20250622_0001
Revises:
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20250622_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("candidates"):
        op.create_table(
            "candidates",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("owner_id", sa.String(64), nullable=False, server_default="dev-user"),
            sa.Column("full_name", sa.Text(), nullable=False),
            sa.Column("email", sa.Text(), unique=True),
            sa.Column("headline", sa.Text()),
            sa.Column("location", sa.Text()),
            sa.Column("current_role", sa.Text()),
            sa.Column("years_experience", sa.Integer(), server_default="0"),
            sa.Column("resume_text", sa.Text(), server_default=""),
            sa.Column("linkedin_url", sa.Text()),
            sa.Column("github_url", sa.Text()),
            sa.Column("portfolio_url", sa.Text()),
            sa.Column("gender", sa.Text()),
            sa.Column("ethnicity", sa.Text()),
            sa.Column("school", sa.Text()),
            sa.Column("github_stats", sa.JSON()),
            sa.Column("certifications", sa.Text()),
            sa.Column("metadata", sa.JSON()),
            sa.Column("created_at", sa.DateTime(timezone=True)),
        )
        op.create_index("ix_candidates_owner_id", "candidates", ["owner_id"])

    if not _has_table("work_experiences"):
        op.create_table(
            "work_experiences",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id", ondelete="CASCADE")),
            sa.Column("company", sa.Text()),
            sa.Column("role", sa.Text()),
            sa.Column("start_date", sa.Text()),
            sa.Column("end_date", sa.Text()),
            sa.Column("description", sa.Text()),
            sa.Column("is_current", sa.Boolean(), server_default=sa.false()),
        )

    if not _has_table("projects"):
        op.create_table(
            "projects",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id", ondelete="CASCADE")),
            sa.Column("name", sa.Text()),
            sa.Column("description", sa.Text(), server_default=""),
            sa.Column("technologies", sa.Text()),
            sa.Column("url", sa.Text()),
            sa.Column("impact", sa.Text()),
        )

    if not _has_table("candidate_skills"):
        op.create_table(
            "candidate_skills",
            sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("skill_name", sa.Text(), primary_key=True),
            sa.Column("proficiency", sa.Integer(), server_default="3"),
            sa.Column("years", sa.Float(), server_default="0"),
            sa.Column("category", sa.Text()),
        )

    if not _has_table("jobs"):
        op.create_table(
            "jobs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("owner_id", sa.String(64), nullable=False, server_default="dev-user"),
            sa.Column("title", sa.Text()),
            sa.Column("description", sa.Text()),
            sa.Column("blueprint", sa.JSON()),
            sa.Column("created_at", sa.DateTime(timezone=True)),
        )
        op.create_index("ix_jobs_owner_id", "jobs", ["owner_id"])

    if not _has_table("rankings"):
        op.create_table(
            "rankings",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id", ondelete="CASCADE")),
            sa.Column("candidate_id", sa.String(36), sa.ForeignKey("candidates.id")),
            sa.Column("rank", sa.Integer()),
            sa.Column("hireability_score", sa.Float()),
            sa.Column("sub_scores", sa.JSON()),
            sa.Column("explanation", sa.JSON()),
            sa.Column("created_at", sa.DateTime(timezone=True)),
        )

    if not _has_table("ranking_cache"):
        op.create_table(
            "ranking_cache",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id", ondelete="CASCADE"), unique=True),
            sa.Column("job_title", sa.Text()),
            sa.Column("blueprint", sa.JSON()),
            sa.Column("ranked", sa.JSON()),
            sa.Column("pipeline_metadata", sa.JSON()),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )

    # Backfill owner_id on legacy DBs created before multi-tenancy
    if _has_table("candidates"):
        cols = {c["name"] for c in inspect(op.get_bind()).get_columns("candidates")}
        if "owner_id" not in cols:
            op.add_column(
                "candidates",
                sa.Column("owner_id", sa.String(64), nullable=False, server_default="dev-user"),
            )
            op.create_index("ix_candidates_owner_id", "candidates", ["owner_id"])
    if _has_table("jobs"):
        cols = {c["name"] for c in inspect(op.get_bind()).get_columns("jobs")}
        if "owner_id" not in cols:
            op.add_column(
                "jobs",
                sa.Column("owner_id", sa.String(64), nullable=False, server_default="dev-user"),
            )
            op.create_index("ix_jobs_owner_id", "jobs", ["owner_id"])


def downgrade() -> None:
    for table in (
        "ranking_cache",
        "rankings",
        "candidate_skills",
        "projects",
        "work_experiences",
        "jobs",
        "candidates",
    ):
        if _has_table(table):
            op.drop_table(table)