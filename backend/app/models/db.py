"""Async SQLAlchemy engine + session helpers."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings
from app.models.database import Base

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def init_engine() -> AsyncEngine:
    """Create the global async engine. Idempotent."""
    global _engine, _session_maker
    if _engine is None:
        settings = get_settings()
        url = settings.database_url
        if "sqlite" in url:
            # SQLite + aiosqlite does not support pool_size / max_overflow
            _engine = create_async_engine(url, echo=False)
        else:
            _engine = create_async_engine(
                url,
                echo=False,
                pool_size=10,
                max_overflow=20,
            )
        _session_maker = async_sessionmaker(
            _engine, expire_on_commit=False, class_=AsyncSession
        )
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    if _session_maker is None:
        init_engine()
    assert _session_maker is not None
    return _session_maker


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    sm = get_session_maker()
    async with sm() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_all() -> None:
    """Create all tables and apply lightweight schema migrations."""
    engine = init_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_owner_id_columns)


def _migrate_owner_id_columns(connection) -> None:
    """Add owner_id to existing SQLite/Postgres tables when missing."""
    from sqlalchemy import inspect, text

    inspector = inspect(connection)
    for table in ("candidates", "jobs"):
        if table not in inspector.get_table_names():
            continue
        columns = {col["name"] for col in inspector.get_columns(table)}
        if "owner_id" in columns:
            continue
        connection.execute(
            text(
                f"ALTER TABLE {table} "
                "ADD COLUMN owner_id VARCHAR(64) NOT NULL DEFAULT 'dev-user'"
            )
        )
        try:
            connection.execute(
                text(f"CREATE INDEX IF NOT EXISTS ix_{table}_owner_id ON {table} (owner_id)")
            )
        except Exception:
            pass
