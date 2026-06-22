"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db import get_session_maker


async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield a DB session; roll back on unhandled route errors."""
    sm = get_session_maker()
    async with sm() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise