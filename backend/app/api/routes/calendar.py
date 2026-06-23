"""Google Calendar integration (Workspace) — OAuth + free/busy.

Production flow:
1. Admin enables Google Calendar API in Google Cloud Console (Workspace org).
2. OAuth consent + scopes: calendar.events, calendar.freebusy
3. Each interviewer connects once; tokens stored encrypted per user.
4. HR scheduling calls freebusy to avoid conflicts; create event pushes Meet link.
"""

from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

_GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CALENDAR_CLIENT_ID", "")
_GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/api/calendar/oauth/callback"
)

# Demo busy blocks per interviewer (simulates Google Calendar free/busy)
_DEMO_BUSY: dict[str, list[tuple[str, str, str]]] = {
    "Jordan Lee": [
        ("10:00", "11:30", "Hiring sync"),
        ("14:00", "15:00", "1:1 · blocked"),
    ],
    "Priya Raman": [
        ("09:30", "10:30", "Team standup"),
        ("13:00", "14:30", "Focus time"),
    ],
    "Sam Devi": [
        ("11:00", "12:00", "All-hands prep"),
        ("15:30", "16:30", "Customer call"),
    ],
    "Alex Romero": [
        ("08:00", "09:00", "Commute block"),
        ("16:00", "17:00", "OOO hold"),
    ],
}


class CalendarConnectionStatus(BaseModel):
    configured: bool
    connected: bool
    provider: str = "google_workspace"
    account_email: Optional[str] = None
    message: str


class BusyBlock(BaseModel):
    start: str
    end: str
    label: str
    source: str = "google_calendar"


class FreeBusyResponse(BaseModel):
    date: str
    interviewer: str
    blocks: List[BusyBlock]
    synced: bool


@router.get("/status", response_model=CalendarConnectionStatus)
async def calendar_status() -> CalendarConnectionStatus:
    configured = bool(_GOOGLE_CLIENT_ID)
    return CalendarConnectionStatus(
        configured=configured,
        connected=not configured,  # demo: treat as connected when OAuth not configured
        account_email="priya.sharma@northwind.com" if not configured else None,
        message=(
            "Google OAuth not configured — showing demo busy blocks. "
            "Set GOOGLE_CALENDAR_CLIENT_ID to enable live Workspace sync."
            if not configured
            else "Connect your Google Workspace account to sync availability."
        ),
    )


@router.get("/oauth/url")
async def calendar_oauth_url() -> dict:
    if not _GOOGLE_CLIENT_ID:
        return {
            "url": None,
            "demo": True,
            "message": "Add GOOGLE_CALENDAR_CLIENT_ID to enable Google sign-in.",
        }
    scopes = "https://www.googleapis.com/auth/calendar.events%20https://www.googleapis.com/auth/calendar.freebusy"
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={_GOOGLE_CLIENT_ID}"
        f"&redirect_uri={_GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        f"&scope={scopes}"
        "&access_type=offline"
        "&prompt=consent"
    )
    return {"url": url, "demo": False}


@router.get("/freebusy", response_model=FreeBusyResponse)
async def calendar_freebusy(
    interviewer: str = Query(..., description="Interviewer display name"),
    on: date = Query(..., alias="date", description="ISO date YYYY-MM-DD"),
) -> FreeBusyResponse:
    """Return busy intervals for an interviewer on a given day (Google free/busy shape)."""
    day = on
    weekday = day.weekday()
    blocks: List[BusyBlock] = []

    for start_s, end_s, label in _DEMO_BUSY.get(interviewer, []):
        blocks.append(
            BusyBlock(
                start=_iso(day, start_s),
                end=_iso(day, end_s),
                label=label,
            )
        )

    # Weekends: mark mornings as personal blocks for demo
    if weekday >= 5:
        blocks.append(
            BusyBlock(
                start=_iso(day, "09:00"),
                end=_iso(day, "13:00"),
                label="Personal · Google Calendar",
            )
        )

    return FreeBusyResponse(
        date=day.isoformat(),
        interviewer=interviewer,
        blocks=blocks,
        synced=True,
    )


def _iso(day: date, hhmm: str) -> str:
    h, m = hhmm.split(":")
    dt = datetime.combine(day, time(int(h), int(m)))
    return dt.isoformat()