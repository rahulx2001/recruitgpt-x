"""Add skill_history table for temporal skill evolution.

Revision ID: 20250622_0002
Revises: 20250622_0001
Create Date: 2026-06-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20250622_0002"
down_revision: Union[str, None] = "20250622_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("skill_history"):
        op.create_table(
            "skill_history",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column(
                "candidate_id",
                sa.String(36),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("skill_name", sa.Text(), nullable=False),
            sa.Column("year", sa.Integer(), nullable=False),
            sa.Column("proficiency", sa.Integer(), server_default="1"),
            sa.Column("source", sa.Text(), server_default="experience"),
            sa.Column("context", sa.Text()),
        )
        op.create_index(
            "ix_skill_history_candidate_id", "skill_history", ["candidate_id"]
        )


def downgrade() -> None:
    if _has_table("skill_history"):
        op.drop_index("ix_skill_history_candidate_id", table_name="skill_history")
        op.drop_table("skill_history")