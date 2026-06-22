"""GitHub activity service — uses API when token is set, else seed-aware heuristics."""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from app.config import get_settings


def _username_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parts = url.rstrip("/").split("/")
    return parts[-1] if parts else None


async def fetch_github_stats(github_url: Optional[str], seed_stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Return GitHub activity stats for a candidate profile."""
    if seed_stats:
        return dict(seed_stats)

    username = _username_from_url(github_url)
    if not username:
        return {
            "commits_per_month": 0,
            "public_repos": 0,
            "total_stars": 0,
            "source": "none",
        }

    settings = get_settings()
    token = getattr(settings, "github_token", "") or ""
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"https://api.github.com/users/{username}", headers=headers)
            if r.status_code != 200:
                raise ValueError(f"GitHub API {r.status_code}")
            data = r.json()
            return {
                "commits_per_month": max(4, min(60, (data.get("public_repos") or 0) * 2)),
                "public_repos": data.get("public_repos", 0),
                "total_stars": 0,
                "followers": data.get("followers", 0),
                "source": "github_api",
            }
    except Exception:
        # Deterministic heuristic from username for demos without API token
        seed = sum(ord(c) for c in username) % 40
        return {
            "commits_per_month": 12 + seed,
            "public_repos": 5 + seed % 15,
            "total_stars": seed * 3,
            "source": "heuristic",
        }