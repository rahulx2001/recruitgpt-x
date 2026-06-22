#!/usr/bin/env bash
# Deploy sandbox/ to HuggingFace Space (§10.5). Requires: huggingface-cli login
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SPACE="${HF_SPACE:-rahulkumarsinghj/recruitgpt-ranker}"

if ! command -v huggingface-cli >/dev/null 2>&1; then
  echo "Install: pip install huggingface_hub"
  echo "Then: huggingface-cli login"
  exit 1
fi

if ! huggingface-cli whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: huggingface-cli login"
  exit 1
fi

./scripts/prepare_hf_space.sh

echo "==> Uploading sandbox/ to Space: $SPACE"
huggingface-cli upload "$SPACE" sandbox/ --repo-type=space

URL="https://huggingface.co/spaces/${SPACE}"
echo ""
echo "Deployed. Update submission_metadata.yaml:"
echo "  sandbox_link: \"$URL\""