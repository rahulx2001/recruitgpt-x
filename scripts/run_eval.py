#!/usr/bin/env python3
"""Run offline ranker eval harness (proxy labels + weight ablation)."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.eval_harness import run_holdout_eval, write_eval_report


def main() -> int:
    p = argparse.ArgumentParser(description="Evaluate ranker on hash holdout")
    p.add_argument(
        "--candidates",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
        help="Path to candidates.jsonl",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=ROOT / "data" / "eval_report.json",
        help="Output JSON report path",
    )
    p.add_argument("--sample-rate", type=float, default=0.05)
    p.add_argument("--max-n", type=int, default=5000)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--top-k", type=int, default=100)
    args = p.parse_args()

    if not args.candidates.exists():
        print(f"ERROR: not found: {args.candidates}", file=sys.stderr)
        return 1

    t0 = time.perf_counter()
    report = run_holdout_eval(
        args.candidates,
        sample_rate=args.sample_rate,
        seed=args.seed,
        max_n=args.max_n,
        top_k=args.top_k,
    )
    elapsed = time.perf_counter() - t0
    report["runtime_seconds"] = round(elapsed, 2)

    write_eval_report(args.out, report)

    m = report["metrics_current_weights"]
    best = report["best_preset_by_ndcg10"]
    print(f"Eval holdout: n={report['holdout']['n_scored']} relevant={report['holdout']['n_relevant_proxy']}")
    print(f"Current weights — NDCG@10={m['ndcg_10']} NDCG@50={m['ndcg_50']} MAP={m['map']} P@10={m['p_at_10']}")
    print(f"Best ablation preset: {best['name']} (NDCG@10={best['ndcg_10']})")
    print(f"Wrote {args.out} in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())