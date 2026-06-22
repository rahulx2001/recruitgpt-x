#!/usr/bin/env python3
"""
Scan submission top-100 for structural honeypots (§7 disqualification check).

Uses honeypot_risk() — NOT weak-title keyword matching.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.honeypot import honeypot_risk, is_structural_honeypot

HONEYPOT_THRESHOLD = 0.10
RISK_THRESHOLD = 0.55


def load_by_id(candidates_path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    with open(candidates_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                row = json.loads(line)
                out[row["candidate_id"]] = row
    return out


def check_submission(csv_path: Path, candidates_path: Path | None) -> int:
    by_id: dict[str, dict] = {}
    if candidates_path and candidates_path.exists():
        by_id = load_by_id(candidates_path)

    rows: list[dict[str, str]] = []
    with open(csv_path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    honeypots: list[tuple[int, str, float, str]] = []
    for row in rows:
        cid = row["candidate_id"].strip()
        rank = int(row["rank"])
        raw = by_id.get(cid)
        if raw:
            risk = honeypot_risk(raw)
            title = raw.get("profile", {}).get("current_title", "?")
        else:
            risk = 0.0
            title = "unknown"
        if is_structural_honeypot(raw, RISK_THRESHOLD) if raw else False:
            honeypots.append((rank, cid, risk, title))

    n = len(rows)
    rate = len(honeypots) / n if n else 0.0
    print(f"Submission: {csv_path.name}")
    print(f"Rows scanned: {n}")
    print(f"Structural honeypots (risk>={RISK_THRESHOLD}): {len(honeypots)} ({rate * 100:.1f}%)")
    print(f"Threshold: {HONEYPOT_THRESHOLD * 100:.0f}%")

    if honeypots:
        print("\nHoneypot entries:")
        for rank, cid, risk, title in honeypots:
            print(f"  rank {rank}: {cid} — {title} (risk={risk:.2f})")
        print("\nFAIL — honeypot rate exceeds threshold.")
        return 1

    print("\nPASS — no structural honeypots in submission.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Check submission for structural honeypots")
    p.add_argument("csv", type=Path, help="Path to submission CSV")
    p.add_argument(
        "--candidates",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
        help="Path to candidates.jsonl",
    )
    args = p.parse_args()
    if not args.csv.exists():
        print(f"ERROR: file not found: {args.csv}", file=sys.stderr)
        return 1
    return check_submission(args.csv, args.candidates)


if __name__ == "__main__":
    raise SystemExit(main())