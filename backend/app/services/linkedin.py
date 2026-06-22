"""LinkedIn-style profile enrichment.

Uses Open Graph metadata when reachable; falls back to seed-aware heuristics.
We do not scrape authenticated LinkedIn APIs (ToS) — public OG tags only.
"""

from __future__ import annotations

import re
from typing import Any, Dict, Optional

import httpx

from app.models.schemas import CandidateProfile


def _slug_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parts = url.rstrip("/").split("/")
    for i, p in enumerate(parts):
        if p in ("in", "pub") and i + 1 < len(parts):
            return parts[i + 1].split("?")[0]
    return parts[-1].split("?")[0] if parts else None


def _heuristic_profile(
    slug: str, profile: Optional[CandidateProfile] = None
) -> Dict[str, Any]:
    seed = sum(ord(c) for c in slug) % 100
    headline = profile.headline if profile and profile.headline else ""
    if not headline and profile:
        headline = profile.current_role or profile.full_name
    return {
        "slug": slug,
        "headline": headline,
        "location": profile.location if profile else None,
        "connections_tier": ["500+", "500+", "1000+"][seed % 3],
        "profile_completeness": round(0.55 + (seed % 40) * 0.01, 2),
        "endorsement_signals": min(30, 5 + seed % 25),
        "open_to_work": seed % 7 == 0,
        "source": "heuristic",
    }


async def fetch_linkedin_profile(
    linkedin_url: Optional[str],
    profile: Optional[CandidateProfile] = None,
) -> Dict[str, Any]:
    """Return LinkedIn-style enrichment for Agent 2."""
    slug = _slug_from_url(linkedin_url)
    if not slug:
        return {"source": "none"}

    headers = {
        "User-Agent": "RecruitGPT-X/1.0 (demo enrichment; +https://recruitgpt.local)",
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            r = await client.get(linkedin_url or "", headers=headers)
            if r.status_code == 200 and "linkedin" in (r.text or "").lower():
                title_m = re.search(
                    r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)',
                    r.text,
                    re.I,
                )
                desc_m = re.search(
                    r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)',
                    r.text,
                    re.I,
                )
                title = title_m.group(1) if title_m else ""
                desc = desc_m.group(1) if desc_m else ""
                if title or desc:
                    return {
                        "slug": slug,
                        "headline": title or (profile.headline if profile else ""),
                        "summary": desc,
                        "location": profile.location if profile else None,
                        "profile_completeness": 0.85,
                        "source": "linkedin_og",
                    }
    except Exception:
        pass

    return _heuristic_profile(slug, profile)