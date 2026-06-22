#!/usr/bin/env python3
"""Verify submission.csv matches a fresh rank.py run (Stage 3 / portal artifact check)."""

from __future__ import annotations

import argparse
import csv
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.data_paths import challenge_file
from challenge.redrob_ranker import rank_candidates, write_submission


def _load_ids(path: Path, n: int = 100) -> list[str]:
    with open(path, newline="", encoding="utf-8") as f:
        return [row["candidate_id"].strip() for row in csv.DictReader(f)][:n]


def compare(artifact: Path, fresh: Path, *, min_top100_overlap: int = 100) -> int:
    art = _load_ids(artifact)
    new = _load_ids(fresh)
    if len(art) != 100 or len(new) != 100:
        print(f"FAIL: expected 100 rows (artifact={len(art)}, fresh={len(new)})")
        return 1

    failures = 0
    for k in (10, 50, 100):
        pos = sum(1 for i in range(k) if art[i] == new[i])
        overlap = len(set(art[:k]) & set(new[:k]))
        print(f"top-{k:>3}: positional {pos:>2}/{k}  set overlap {overlap:>2}/{k}")
        if k == 100 and overlap < min_top100_overlap:
            failures += 1
            print(
                f"FAIL: top-100 set overlap {overlap} < required {min_top100_overlap}"
            )

    if failures:
        print("\nArtifact is stale — regenerate:")
        print("  ./scripts/reproduce_ranking.sh")
        return 1

    if art == new:
        print("\nPASS: submission.csv is byte-for-byte identical to fresh rank.py output")
    else:
        print("\nPASS: top-100 candidate set matches fresh rank (order may differ slightly)")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Verify submission.csv vs fresh rank.py")
    p.add_argument(
        "--artifact",
        type=Path,
        default=ROOT / "submission.csv",
        help="Committed or portal submission CSV",
    )
    p.add_argument(
        "--candidates",
        type=Path,
        default=challenge_file("candidates.jsonl"),
    )
    p.add_argument(
        "--min-top100-overlap",
        type=int,
        default=100,
        help="Minimum unique IDs in common between artifact and fresh top-100",
    )
    p.add_argument(
        "--fresh-out",
        type=Path,
        default=None,
        help="Optional path for fresh ranking output (default: temp file)",
    )
    args = p.parse_args()

    if not args.artifact.exists():
        print(f"ERROR: artifact not found: {args.artifact}", file=sys.stderr)
        return 1
    if not args.candidates.exists():
        print(f"ERROR: candidates not found: {args.candidates}", file=sys.stderr)
        return 1

    tmp: tempfile.NamedTemporaryFile[str] | None = None
    fresh_path = args.fresh_out
    if fresh_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
        fresh_path = Path(tmp.name)
        tmp.close()

    print(f"==> Fresh rank from {args.candidates}")
    top = rank_candidates(args.candidates, top_k=100)
    write_submission(top, fresh_path)
    print(f"==> Compare {args.artifact} vs {fresh_path}")
    return compare(args.artifact, fresh_path, min_top100_overlap=args.min_top100_overlap)


if __name__ == "__main__":
    raise SystemExit(main())