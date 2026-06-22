#!/usr/bin/env python3
"""Stage 4 reasoning sanity checks on submission.csv (§3.4)."""

from __future__ import annotations

import csv
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

MIN_LEN = 40
TEMPLATE_PREFIX = " with "


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_reasoning.py submission.csv")
        return 1

    path = Path(sys.argv[1])
    rows: list[dict[str, str]] = []
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            rows.append(row)

    errors: list[str] = []
    empty = [r for r in rows if not (r.get("reasoning") or "").strip()]
    if empty:
        errors.append(f"{len(empty)} rows have empty reasoning")

    texts = [r["reasoning"].strip() for r in rows if r.get("reasoning")]
    unique_ratio = len(set(texts)) / max(1, len(texts))
    if unique_ratio < 0.5:
        errors.append(f"low variation: only {unique_ratio:.0%} unique reasoning strings")

    sample = random.sample(rows, min(10, len(rows)))
    for r in sample:
        reason = (r.get("reasoning") or "").strip()
        rank = int(r["rank"])
        if len(reason) < MIN_LEN:
            errors.append(f"rank {rank}: reasoning too short ({len(reason)} chars)")
        if rank <= 10 and "concern" in reason.lower() and "top pick" not in reason.lower():
            pass  # minor flags OK
        if rank >= 90 and "top pick" in reason.lower():
            errors.append(f"rank {rank}: glowing tone inconsistent with low rank")

    print(f"Checked {len(rows)} rows, sampled {len(sample)} for tone/length.")
    print(f"Unique reasoning ratio: {unique_ratio:.0%}")

    if errors:
        print("\nWARNINGS:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("Reasoning checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())