#!/usr/bin/env python3
"""
RecruitGPT X — Offline ranker for India Runs Data & AI Challenge.

Usage:
  python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv

No network calls. Runs on CPU. Produces hackathon submission CSV (top 100).
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Stage-3 canonical path: cross-encoder OFF unless explicitly enabled.
os.environ.setdefault("RANKER_USE_CROSS_ENCODER", "0")

from challenge.data_paths import challenge_file
from challenge.redrob_ranker import rank_candidates, run_self_test, write_submission

DEFAULT_DATA = challenge_file("candidates.jsonl")


def main() -> int:
    p = argparse.ArgumentParser(description="Rank Redrob candidates offline")
    p.add_argument(
        "--candidates",
        type=Path,
        default=DEFAULT_DATA,
        help="Path to candidates.jsonl",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=ROOT / "submission.csv",
        help="Output submission CSV path",
    )
    p.add_argument("--top-k", type=int, default=100)
    p.add_argument("--self-test", action="store_true", help="Run on sample only")
    args = p.parse_args()

    if args.self_test:
        sample = challenge_file("sample_candidates.json")
        return run_self_test(sample if sample.exists() else None)

    if not args.candidates.exists():
        from challenge.data_paths import candidates_not_found_help

        print(candidates_not_found_help(args.candidates), file=sys.stderr)
        return 1

    t0 = time.perf_counter()
    print(f"Ranking from {args.candidates} ...")
    top = rank_candidates(args.candidates, top_k=args.top_k)
    write_submission(top, args.out)
    elapsed = time.perf_counter() - t0
    print(f"Wrote {len(top)} rows to {args.out} in {elapsed:.1f}s")
    print("Top 5:")
    for i, row in enumerate(top[:5], 1):
        print(f"  {i}. {row.candidate_id} score={row.score:.4f} — {row.reasoning[:80]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())