#!/usr/bin/env bash
# Canonical Stage-3 reproduction: sync data → embeddings → rank → verify artifact.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Canonical pipeline: bi-encoder + hybrid scorer only (no network-dependent CE).
export RANKER_USE_CROSS_ENCODER=0

echo "╔══════════════════════════════════════════════════╗"
echo "║  RecruitGPT X — Reproduce Ranking (Stage 3)      ║"
echo "╚══════════════════════════════════════════════════╝"
echo

bash scripts/sync_challenge_data.sh

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing. Mount or sync official bundle."
  exit 1
fi

EMB_DIR="data/embeddings"
needs_precompute=0
if [[ ! -f "${EMB_DIR}/candidate_ids.json" ]]; then
  needs_precompute=1
fi
if [[ ! -f "${EMB_DIR}/embeddings.fp16.npz" && ! -f "${EMB_DIR}/embeddings.npy" ]]; then
  needs_precompute=1
fi

if [[ "$needs_precompute" -eq 1 ]]; then
  echo "==> Precomputing bi-encoder embeddings (one-time, requires model cache or network)..."
  python scripts/precompute_embeddings.py --candidates ./data/candidates.jsonl
  echo
elif [[ ! -f "${EMB_DIR}/embeddings.fp16.npz" && -f "${EMB_DIR}/embeddings.npy" ]]; then
  echo "==> Packing float16 embeddings bundle for reproduction..."
  python - <<'PY'
import numpy as np
from pathlib import Path
root = Path("data/embeddings")
m = np.load(root / "embeddings.npy")
j = np.load(root / "jd_embedding.npy")
np.savez_compressed(
    root / "embeddings.fp16.npz",
    embeddings=m.astype("float16"),
    jd_embedding=j.astype("float16"),
)
print(f"Wrote {root / 'embeddings.fp16.npz'}")
PY
  echo
fi

echo "==> Ranking 100K (CPU, offline)..."
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
echo

echo "==> Verifying artifact matches fresh output..."
python scripts/verify_submission_artifact.py --artifact ./submission.csv
echo

echo "==> No-embeddings path (judge fresh clone without npy)..."
python - <<'PY'
import csv
import os
import tempfile
from pathlib import Path

import challenge.embeddings as emb_mod
import challenge.redrob_ranker as rr
from challenge.data_paths import challenge_file
from challenge.redrob_ranker import rank_candidates, write_submission

empty = Path(tempfile.mkdtemp())
emb_mod._DEFAULT_DIR = empty
rr._EMBED_STORE = None

top = rank_candidates(challenge_file("candidates.jsonl"), top_k=100)
no_emb = [r.candidate_id for r in top]

with open("submission.csv", newline="", encoding="utf-8") as f:
    emb = [row["candidate_id"] for row in csv.DictReader(f)]

for k in (10, 100):
    pos = sum(1 for i in range(k) if emb[i] == no_emb[i])
    overlap = len(set(emb[:k]) & set(no_emb[:k]))
    print(f"  no-embeddings vs artifact top-{k}: positional {pos}/{k}  set {overlap}/{k}")
    if k == 10 and overlap < 9:
        raise SystemExit(f"FAIL: no-embeddings top-10 overlap {overlap} < 9")
PY

echo
echo "Reproduction complete: submission.csv is current and verified."