#!/usr/bin/env python3
"""Scan full pool for structural honeypot recall (Tier-2 trap robustness)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.honeypot import honeypot_risk, is_structural_honeypot
from challenge.redrob_ranker import load_candidates


def main() -> int:
    path = ROOT / "data" / "candidates.jsonl"
    if not path.exists():
        print("SKIP: candidates.jsonl missing")
        return 0

    n = 0
    flagged = 0
    high = 0
    for raw in load_candidates(path):
        n += 1
        risk = honeypot_risk(raw)
        if risk >= 0.35:
            high += 1
        if is_structural_honeypot(raw):
            flagged += 1

    rate = flagged / n if n else 0
    print(f"Scanned: {n}")
    print(f"Structural honeypots (risk>=0.55): {flagged} ({rate*100:.2f}%)")
    print(f"Elevated risk (>=0.35): {high} ({(high/n*100 if n else 0):.2f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())