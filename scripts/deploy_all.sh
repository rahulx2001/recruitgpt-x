#!/usr/bin/env bash
# One-command deploy: GitHub repo + HuggingFace Space (§10 / §10.5).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════╗"
echo "║  RecruitGPT X — Deploy GitHub + HF Space         ║"
echo "╚══════════════════════════════════════════════════╝"
echo

if [[ ! -f "$ROOT/.env.deploy" ]]; then
  echo "Create $ROOT/.env.deploy from .env.deploy.example with your tokens."
  exit 1
fi

./scripts/deploy_github.sh
echo
./scripts/deploy_hf_space.sh
echo
echo "Deploy complete. Verify:"
echo "  curl -sI https://github.com/${GITHUB_USER:-rahulkumarsinghj}/${GITHUB_REPO:-recruitgpt-x} | head -1"
echo "  curl -sI https://huggingface.co/spaces/${HF_SPACE:-rahulkumarsinghj/recruitgpt-ranker} | head -1"