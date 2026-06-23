#!/usr/bin/env bash
# End-to-end Docker ranker reproduction (Stage 3). Requires Docker daemon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export RANKER_USE_CROSS_ENCODER=0
DOCKER_OUT="$ROOT/data/docker_repro/submission.csv"

if ! command -v docker >/dev/null 2>&1; then
  echo "SKIP: docker not installed — config files validated only"
  bash scripts/validate-docker-config.sh
  exit 0
fi

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing — run ./scripts/sync_challenge_data.sh"
  exit 1
fi
if [[ ! -f data/embeddings/embeddings.fp16.npz ]]; then
  echo "ERROR: data/embeddings/embeddings.fp16.npz missing"
  exit 1
fi

mkdir -p data/docker_repro
rm -f "$DOCKER_OUT"

echo "==> Building ranker image..."
docker compose -f docker-compose.ranker.yml build

echo "==> Running offline ranker in container (network_mode: none)..."
docker compose -f docker-compose.ranker.yml run --rm ranker

if [[ ! -f "$DOCKER_OUT" ]]; then
  echo "ERROR: container did not write $DOCKER_OUT"
  exit 1
fi

echo "==> Validate Docker output format..."
python scripts/validate_submission.py "$DOCKER_OUT"
python scripts/validate_reasoning.py "$DOCKER_OUT"

echo "==> Compare Docker output vs committed artifact..."
python scripts/verify_submission_artifact.py --artifact "$ROOT/submission.csv" --fresh-out "$DOCKER_OUT"
echo "Docker reproduction PASS"