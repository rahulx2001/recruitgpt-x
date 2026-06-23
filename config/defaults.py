"""Central defaults for offline ranker — override via environment where noted."""

from __future__ import annotations

import os
from datetime import date


def _parse_iso_date(value: str, fallback: date) -> date:
    value = (value or "").strip()
    if len(value) < 10:
        return fallback
    try:
        return date(int(value[0:4]), int(value[5:7]), int(value[8:10]))
    except ValueError:
        return fallback


# Honeypot tenure/recency checks use this reference calendar date.
# Override: export HONEYPOT_REFERENCE_DATE=2026-06-22
_DEFAULT_REF = date(2026, 6, 22)
HONEYPOT_REFERENCE_DATE = _parse_iso_date(
    os.environ.get("HONEYPOT_REFERENCE_DATE", ""),
    _DEFAULT_REF,
)