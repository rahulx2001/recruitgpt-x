#!/usr/bin/env bash
# Validate Docker reproduction files without requiring Docker installed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Docker config validation (no docker daemon required)"

required=(
  docker-compose.ranker.yml
  docker/Dockerfile.ranker
  rank.py
  challenge/redrob_ranker.py
  challenge/honeypot.py
  challenge/availability.py
  challenge/assessment.py
  challenge/semantic.py
  challenge/text_match.py
  requirements-ranker.txt
)

for f in "${required[@]}"; do
  [[ -f "$f" ]] || { echo "MISSING: $f"; exit 1; }
  echo "  OK $f"
done

python3 - <<'PY'
import re
from pathlib import Path

compose = Path("docker-compose.ranker.yml").read_text()
dockerfile = Path("docker/Dockerfile.ranker").read_text()
assert "network_mode: none" in compose, "ranker must use network_mode: none"
assert "python:3.11" in dockerfile, "Dockerfile must use Python 3.11"
assert "rank.py" in compose
assert "data/embeddings" in compose, "compose must mount embeddings for v5 reproduction"
assert "embeddings.fp16.npz" in dockerfile, "Dockerfile must bundle fp16 embeddings"
print("  OK compose constraints (network_mode: none, embeddings mount, rank.py)")
PY

echo "==> PASS — Docker files ready for Stage 3 reproduction"
echo "    Run when Docker available:"
echo "    docker compose -f docker-compose.ranker.yml build"
echo "    docker compose -f docker-compose.ranker.yml run --rm ranker"