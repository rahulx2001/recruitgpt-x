#!/usr/bin/env python3
"""Verify every candidate_id in submission exists in candidates.jsonl (§3)."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_ids(path: Path) -> set[str]:
    ids: set[str] = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                ids.add(json.loads(line)["candidate_id"])
    return ids


def main() -> int:
    p = argparse.ArgumentParser(description="Validate submission IDs against candidates.jsonl")
    p.add_argument("csv", type=Path, help="Submission CSV path")
    p.add_argument(
        "--candidates",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
        help="Path to candidates.jsonl",
    )
    args = p.parse_args()

    if not args.csv.exists():
        print(f"ERROR: CSV not found: {args.csv}", file=sys.stderr)
        return 1
    if not args.candidates.exists():
        print(f"ERROR: candidates file not found: {args.candidates}", file=sys.stderr)
        return 1

    valid = load_ids(args.candidates)
    missing: list[str] = []
    with open(args.csv, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            cid = row["candidate_id"].strip()
            if cid not in valid:
                missing.append(cid)

    if missing:
        print(f"FAIL — {len(missing)} unknown candidate_id(s):")
        for cid in missing[:20]:
            print(f"  - {cid}")
        if len(missing) > 20:
            print(f"  ... and {len(missing) - 20} more")
        return 1

    print(f"PASS — all 100 candidate_ids exist in {args.candidates.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())