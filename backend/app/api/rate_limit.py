"""Lightweight in-memory rate limiter for expensive endpoints."""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from typing import DefaultDict, Dict, Tuple

from fastapi import HTTPException, Request

from app.api.auth import CurrentUser
from app.config import get_settings


@dataclass
class _Bucket:
    window_start: float = 0.0
    count: int = 0


_lock = Lock()
_buckets: DefaultDict[str, _Bucket] = defaultdict(_Bucket)


def _client_key(request: Request, user: CurrentUser) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    return f"{user.user_id}:{ip}"


def _check(key: str, *, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    with _lock:
        bucket = _buckets[key]
        if now - bucket.window_start >= window_seconds:
            bucket.window_start = now
            bucket.count = 0
        bucket.count += 1
        if bucket.count > limit:
            raise HTTPException(
                429,
                f"Rate limit exceeded. Max {limit} requests per {window_seconds}s.",
            )


def rate_limit_expensive(request: Request, user: CurrentUser) -> None:
    """Apply to LLM-heavy routes (rank, chat, parse, potential, whatif)."""
    settings = get_settings()
    key = _client_key(request, user)
    _check(
        f"expensive:{key}",
        limit=settings.rate_limit_expensive_per_minute,
        window_seconds=60,
    )


def rate_limit_upload(request: Request, user: CurrentUser) -> None:
    settings = get_settings()
    key = _client_key(request, user)
    _check(
        f"upload:{key}",
        limit=settings.rate_limit_upload_per_minute,
        window_seconds=60,
    )