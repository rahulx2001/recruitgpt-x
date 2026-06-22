#!/usr/bin/env python3
"""
Scan submission.csv top-100 for honeypot titles (§7 disqualification check).

Usage:
  python scripts/check_honeypots.py submission.csv
  python scripts/check_honeypots.py submission.csv --candidates ./data/candidates.jsonl
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.jd_config import WEAK_TITLES

HONEYPOT_THRESHOLD = 0.10


def load_titles(candidates_path: Path) -> dict[str, str]:
    titles: dict[str, str] = {}
    with open(candidates_path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            profile = row.get("profile", {})
            titles[row["candidate_id"]] = profile.get("current_title", "")
    return titles


def is_honeypot_title(title: str) -> bool:
    t = title.lower()
    return any(w in t for w in WEAK_TITLES)


def check_submission(csv_path: Path, candidates_path: Path | None) -> int:
    titles: dict[str, str] = {}
    if candidates_path and candidates_path.exists():
        titles = load_titles(candidates_path)

    rows: list[dict[str, str]] = []
    with open(csv_path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    honeypots: list[tuple[int, str, str]] = []
    for row in rows:
        cid = row["candidate_id"].strip()
        rank = int(row["rank"])
        title = titles.get(cid, row["reasoning"].split(" with ")[0])
        if is_honeypot_title(title):
            honeypots.append((rank, cid, title))

    n = len(rows)
    rate = len(honeypots) / n if n else 0.0
    print(f"Submission: {csv_path.name}")
    print(f"Rows scanned: {n}")
    print(f"Honeypots found: {len(honeypots)} ({rate * 100:.1f}%)")
    print(f"Threshold: {HONEYPOT_THRESHOLD * 100:.0f}%")

    if honeypots:
        print("\nHoneypot entries:")
        for rank, cid, title in honeypots:
            print(f"  rank {rank}: {cid} — {title}")
        print("\nFAIL — honeypot rate exceeds threshold.")
        return 1

    print("\nPASS — no honeypot titles in submission.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Check submission for honeypot titles")
    p.add_argument("csv", type=Path, help="Path to submission CSV")
    p.add_argument(
        "--candidates",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
        help="Optional candidates.jsonl for authoritative titles",
    )
    args = p.parse_args()
    if not args.csv.exists():
        print(f"ERROR: file not found: {args.csv}", file=sys.stderr)
        return 1
    return check_submission(args.csv, args.candidates)


if __name__ == "__main__":
    raise SystemExit(main())