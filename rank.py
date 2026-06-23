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
# Refuse silent TF-IDF fallback unless explicitly disabled (ablation only).
os.environ.setdefault("RANKER_REQUIRE_EMBEDDINGS", "1")

from challenge.data_paths import challenge_file
from challenge.redrob_ranker import _embedding_store, rank_candidates, run_self_test, write_submission
from challenge.rerank import cross_encoder_enabled

DEFAULT_DATA = challenge_file("candidates.jsonl")


def _print_ranker_mode(*, allow_fallback: bool) -> None:
    store = _embedding_store()
    print(f"Embeddings: {store.describe()}")
    ce = cross_encoder_enabled()
    print(f"Cross-encoder: {'ON (experimental — not submission path)' if ce else 'OFF (submission path)'}")
    if allow_fallback:
        print("Embedding guard: relaxed (--allow-tfidf-fallback)", file=sys.stderr)
    elif not store.available:
        print("Embedding guard: RANKER_REQUIRE_EMBEDDINGS=1 (will abort if .npz missing)", file=sys.stderr)


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
    p.add_argument(
        "--allow-tfidf-fallback",
        action="store_true",
        help="Allow TF-IDF fallback when embeddings missing (ablation only; non-canonical)",
    )
    args = p.parse_args()

    if args.self_test:
        os.environ["RANKER_REQUIRE_EMBEDDINGS"] = "0"
        sample = challenge_file("sample_candidates.json")
        return run_self_test(sample if sample.exists() else None)

    if args.allow_tfidf_fallback:
        os.environ["RANKER_REQUIRE_EMBEDDINGS"] = "0"

    if not args.candidates.exists():
        from challenge.data_paths import candidates_not_found_help

        print(candidates_not_found_help(args.candidates), file=sys.stderr)
        return 1

    _print_ranker_mode(allow_fallback=args.allow_tfidf_fallback)

    t0 = time.perf_counter()
    print(f"Ranking from {args.candidates} ...")
    try:
        top = rank_candidates(args.candidates, top_k=args.top_k)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    write_submission(top, args.out)
    elapsed = time.perf_counter() - t0
    print(f"Wrote {len(top)} rows to {args.out} in {elapsed:.1f}s")
    print("Top 5:")
    for i, row in enumerate(top[:5], 1):
        print(f"  {i}. {row.candidate_id} score={row.score:.4f} — {row.reasoning[:80]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())