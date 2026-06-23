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

    m = report["metrics_self_consistency_proxy"]
    b = report.get("metrics_behavioral_independent_proxy", {})
    h = report.get("hand_label_eval", {})
    best = report.get("best_preset_by_ndcg10", {})
    print(f"Eval holdout: n={report['holdout']['n_scored']} relevant={report['holdout']['n_relevant_proxy']}")
    print(f"JD self-consistency proxy — NDCG@10={m.get('ndcg_10')} (NOT hidden GT)")
    if b:
        print(f"Behavioral independent proxy — NDCG@10={b.get('ndcg_10')} MAP={b.get('map')}")
    if h:
        m50 = h.get("metrics_at_0.5") or h.get("metrics", {})
        print(
            f"Hand labels — NDCG@10={m50.get('ndcg_10')} p@10={m50.get('p_at_10')} "
            f"n={h.get('n_labeled')} relevant@0.5={h.get('n_relevant_threshold_0.5')}"
        )
    if best:
        print(f"Best ablation (behavioral proxy): {best.get('name')} NDCG@10={best.get('ndcg_10')}")
    ha = report.get("weight_ablation_on_hand_labels") or {}
    if ha and h.get("best_preset_by_ndcg10"):
        bh = h["best_preset_by_ndcg10"]
        print(f"Best ablation (hand labels): {bh.get('name')} NDCG@10={bh.get('ndcg_10')}")
    print(f"Wrote {args.out} in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())