"""Authentication and per-user authorization helpers."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Header, HTTPException, Request
from jwt import PyJWKClient

from app.config import get_settings

log = logging.getLogger("recruitgpt.auth")

_jwks_client: Optional[PyJWKClient] = None


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated principal — used to scope all data access."""

    user_id: str


def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    settings = get_settings()
    if not settings.clerk_jwks_url:
        return None
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.clerk_jwks_url, cache_keys=True)
    return _jwks_client


def _verify_clerk_jwt(token: str) -> Optional[str]:
    settings = get_settings()
    if not settings.clerk_secret_key and not settings.clerk_jwks_url:
        return None

    client = _get_jwks_client()
    if client is None:
        return None

    try:
        signing_key = client.get_signing_key_from_jwt(token)
        decode_kwargs: dict = {
            "algorithms": ["RS256"],
            "options": {"verify_aud": False},
        }
        if settings.clerk_issuer:
            decode_kwargs["issuer"] = settings.clerk_issuer
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
        sub = payload.get("sub")
        return str(sub) if sub else None
    except Exception as exc:
        log.debug("Clerk JWT verification failed: %s", exc)
        return None


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> CurrentUser:
    """Resolve the authenticated user for this request.

    Priority:
    1. Clerk JWT in Authorization: Bearer <jwt>  → user_id = JWT sub
    2. API secret key in Authorization: Bearer <secret> + X-User-Id header
    3. Dev mode (require_auth=false): X-User-Id or default_dev_user_id
    """
    settings = get_settings()
    token: Optional[str] = None

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token:
        clerk_user = _verify_clerk_jwt(token)
        if clerk_user:
            return CurrentUser(user_id=clerk_user)

        if settings.api_secret_key and token == settings.api_secret_key:
            uid = (x_user_id or settings.default_dev_user_id).strip()
            if not uid:
                raise HTTPException(401, "X-User-Id required with API secret")
            return CurrentUser(user_id=uid)

    if settings.require_auth:
        raise HTTPException(
            401,
            "Authentication required. Provide a valid Bearer token.",
        )

    uid = (x_user_id or settings.default_dev_user_id).strip()
    if not uid:
        raise HTTPException(401, "X-User-Id header required")
    return CurrentUser(user_id=uid)


def assert_owner(resource_owner_id: Optional[str], user: CurrentUser) -> None:
    """Raise 404 if the resource does not belong to the current user."""
    if resource_owner_id != user.user_id:
        raise HTTPException(404, "Resource not found")