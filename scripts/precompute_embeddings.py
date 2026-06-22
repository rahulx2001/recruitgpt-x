#!/usr/bin/env python3
"""Precompute bi-encoder embeddings for all candidates (offline, one-time)."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.embeddings import EmbeddingStore, candidate_text
from challenge.redrob_ranker import load_candidates


def main() -> int:
    p = argparse.ArgumentParser(description="Precompute career embeddings")
    p.add_argument(
        "--candidates",
        type=Path,
        default=ROOT / "data" / "candidates.jsonl",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=ROOT / "data" / "embeddings",
    )
    p.add_argument("--batch-size", type=int, default=256)
    args = p.parse_args()

    if not args.candidates.exists():
        print(f"ERROR: {args.candidates} not found", file=sys.stderr)
        return 1

    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        print("Install: pip install sentence-transformers numpy", file=sys.stderr)
        return 1

    model_name = EmbeddingStore.model_name()
    print(f"==> Loading {model_name} ...")
    model = SentenceTransformer(model_name)

    ids: list[str] = []
    texts: list[str] = []
    for raw in load_candidates(args.candidates):
        profile = raw.get("profile", {})
        history = raw.get("career_history", [])
        ids.append(raw["candidate_id"])
        texts.append(candidate_text(profile, history))

    print(f"==> Encoding {len(texts)} candidates ...")
    t0 = time.perf_counter()
    matrix = model.encode(texts, batch_size=args.batch_size, show_progress_bar=True)
    jd_emb = model.encode([EmbeddingStore.jd_source_text()], show_progress_bar=False)[0]
    elapsed = time.perf_counter() - t0

    args.out.mkdir(parents=True, exist_ok=True)
    np.save(args.out / "embeddings.npy", matrix.astype("float32"))
    np.save(args.out / "jd_embedding.npy", jd_emb.astype("float32"))
    (args.out / "candidate_ids.json").write_text(json.dumps(ids), encoding="utf-8")
    meta = {
        "model": model_name,
        "n_candidates": len(ids),
        "dim": int(matrix.shape[1]),
        "elapsed_seconds": round(elapsed, 2),
    }
    (args.out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"==> Wrote {args.out} ({len(ids)} x {matrix.shape[1]}) in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())