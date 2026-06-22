#!/usr/bin/env python3
"""Stage 4 reasoning sanity checks on submission.csv (§3.4)."""

from __future__ import annotations

import csv
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

MIN_LEN = 40
_MIDWORD_ELLIPSIS = re.compile(r"…[a-z]{1,3}\s", re.I)


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

    top10 = [r for r in rows if int(r["rank"]) <= 10]
    repetitive = sum(1 for r in top10 if "Top pick for Redrob Senior AI Engineer" in r["reasoning"])
    if repetitive >= 5:
        errors.append(
            f"top-10 uses stale template {repetitive}/10 times — vary Stage-4 reasoning"
        )
    top_openers = {t.split(".")[0] for t in texts[:10]}
    if len(top_openers) < 7:
        errors.append(f"top-10 opener diversity low ({len(top_openers)}/10 unique leads)")

    sample = random.sample(rows, min(10, len(rows)))
    for r in sample:
        reason = (r.get("reasoning") or "").strip()
        rank = int(r["rank"])
        if len(reason) < MIN_LEN:
            errors.append(f"rank {rank}: reasoning too short ({len(reason)} chars)")
        if _MIDWORD_ELLIPSIS.search(reason):
            errors.append(f"rank {rank}: mid-word ellipsis truncation detected")
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