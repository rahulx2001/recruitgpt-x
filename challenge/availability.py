"""Availability intelligence — JD treats inactive/unresponsive candidates as not hireable."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict

_REFERENCE_DATE = date(2026, 6, 22)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def availability_score(signals: Dict[str, Any]) -> float:
    """
    Composite availability in [0, 1].

    Weights (JD: down-weight perfect-on-paper but inactive):
      open_to_work 25%, recency 20%, applications 10%, response rate 20%,
      interview completion 10%, response time 10%, offer acceptance 5%.
    """
    open_to_work = bool(signals.get("open_to_work_flag", False))
    last_active = _parse_date(signals.get("last_active_date"))
    apps = int(signals.get("applications_submitted_30d", 0) or 0)
    rr = float(signals.get("recruiter_response_rate", 0) or 0)
    icr = float(signals.get("interview_completion_rate", 0) or 0)
    rth = float(signals.get("avg_response_time_hours", 0) or 0)
    oar = float(signals.get("offer_acceptance_rate", -1) or -1)

    if last_active:
        days_idle = (_REFERENCE_DATE - last_active).days
    else:
        days_idle = 365

    recency = max(0.0, 1.0 - days_idle / 180.0)
    otw_s = 1.0 if open_to_work else 0.12
    apps_s = min(1.0, apps / 4.0)
    rr_s = min(1.0, rr * 1.15)
    icr_s = min(1.0, icr)
    rth_s = min(1.0, 36.0 / rth) if rth > 0 else 0.35
    oar_s = min(1.0, max(0.0, oar)) if oar >= 0 else 0.5

    return min(
        1.0,
        0.25 * otw_s
        + 0.20 * recency
        + 0.10 * apps_s
        + 0.20 * rr_s
        + 0.10 * icr_s
        + 0.10 * rth_s
        + 0.05 * oar_s,
    )


def availability_modifier(signals: Dict[str, Any]) -> float:
    """Strong multiplier — availability can swing ranking ±40%."""
    s = availability_score(signals)
    if s < 0.2:
        return 0.42
    if s < 0.35:
        return 0.58
    if s < 0.5:
        return 0.75
    if s < 0.65:
        return 0.88
    return 0.90 + s * 0.10