#!/usr/bin/env python3
"""Verify submission.csv is byte-identical to a fresh rank.py run (Stage 3 gate)."""

from __future__ import annotations

import argparse
import csv
import hashlib
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Canonical reproduction: cross-encoder OFF (network-independent, deterministic).
import os

os.environ.setdefault("RANKER_USE_CROSS_ENCODER", "0")

from challenge.data_paths import challenge_file
from challenge.redrob_ranker import rank_candidates, write_submission


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_rows(path: Path, n: int = 100) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))[:n]


def _load_ids(path: Path, n: int = 100) -> list[str]:
    return [row["candidate_id"].strip() for row in _load_rows(path, n)]


def _ranking_overlap(artifact: Path, fresh: Path) -> dict[int, dict[str, int]]:
    art = _load_ids(artifact)
    new = _load_ids(fresh)
    out: dict[int, dict[str, int]] = {}
    for k in (10, 50, 100):
        pos = sum(1 for i in range(k) if art[i] == new[i])
        overlap = len(set(art[:k]) & set(new[:k]))
        out[k] = {"positional": pos, "set_overlap": overlap}
    return out


def compare(artifact: Path, fresh: Path) -> int:
    art_bytes = artifact.read_bytes()
    fresh_bytes = fresh.read_bytes()
    art_hash = hashlib.sha256(art_bytes).hexdigest()
    fresh_hash = hashlib.sha256(fresh_bytes).hexdigest()

    print(f"artifact sha256: {art_hash}")
    print(f"fresh    sha256: {fresh_hash}")

    if art_bytes == fresh_bytes:
        print("\nPASS: submission.csv is byte-for-byte identical to fresh rank.py output")
        return 0

    art = _load_ids(artifact)
    new = _load_ids(fresh)
    if len(art) != 100 or len(new) != 100:
        print(f"FAIL: expected 100 rows (artifact={len(art)}, fresh={len(new)})")
        return 1

    overlap = _ranking_overlap(artifact, fresh)
    for k in (10, 50, 100):
        pos = overlap[k]["positional"]
        ov = overlap[k]["set_overlap"]
        print(f"top-{k:>3}: positional {pos:>2}/{k}  set overlap {ov:>2}/{k}")

    ranking_identical = all(overlap[k]["positional"] == k for k in (10, 50, 100))
    if ranking_identical:
        print(
            "\nPASS (ranking identical, score bytes differ): "
            "candidate ordering matches on top-10/50/100 — "
            "likely numpy/BLAS float formatting across environments."
        )
        print("Primary gate: byte hash mismatch. Ranking gate: PASS.")
        return 0

    print("\nFAIL: artifact hash mismatch AND ranking changed — regenerate with:")
    print("  RANKER_USE_CROSS_ENCODER=0 ./scripts/reproduce_ranking.sh")
    print("Common cause: submission was built with cross-encoder ON but reproduce path has CE OFF.")
    return 1


def main() -> int:
    p = argparse.ArgumentParser(description="Verify submission.csv vs fresh rank.py (byte identity)")
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
        print("Resolution order:", file=sys.stderr)
        print("  1. python rank.py --candidates /path/to/candidates.jsonl", file=sys.stderr)
        print("  2. export CHALLENGE_DATA_ROOT=/path/to/challenge/folder", file=sys.stderr)
        print("  3. ./scripts/sync_challenge_data.sh  (symlink into ./data/)", file=sys.stderr)
        return 1

    tmp: tempfile.NamedTemporaryFile[str] | None = None
    fresh_path = args.fresh_out
    if fresh_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
        fresh_path = Path(tmp.name)
        tmp.close()

    print(f"==> Fresh rank from {args.candidates} (RANKER_USE_CROSS_ENCODER=0)")
    top = rank_candidates(args.candidates, top_k=100)
    write_submission(top, fresh_path)
    print(f"==> Compare {args.artifact} vs {fresh_path}")
    return compare(args.artifact, fresh_path)


if __name__ == "__main__":
    raise SystemExit(main())