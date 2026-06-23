#!/usr/bin/env bash
# End-to-end Docker ranker reproduction (Stage 3). Requires Docker daemon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export RANKER_USE_CROSS_ENCODER=0

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker not installed — config files validated only"
  bash scripts/validate-docker-config.sh
  exit 0
fi

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing"
  exit 1
fi
if [[ ! -f data/embeddings/embeddings.fp16.npz ]]; then
  echo "ERROR: data/embeddings/embeddings.fp16.npz missing"
  exit 1
fi

echo "==> Building ranker image..."
docker compose -f docker-compose.ranker.yml build

echo "==> Running offline ranker in container (network_mode: none)..."
docker compose -f docker-compose.ranker.yml run --rm ranker

OUT="$ROOT/submission.csv"
if [[ ! -f "$OUT" ]]; then
  echo "ERROR: container did not write submission.csv"
  exit 1
fi

echo "==> Byte-identity vs committed artifact..."
python scripts/verify_submission_artifact.py --artifact "$OUT"
echo "Docker reproduction PASS"