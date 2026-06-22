#!/usr/bin/env bash
# Deploy sandbox/ to HuggingFace Space (§10.5). Requires HF token.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load deploy secrets before reading HF_SPACE
if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.deploy" && set +a
fi

SPACE="${HF_SPACE:-rahulx2001/recruitgpt-ranker}"
SPACE_NAME="${SPACE##*/}"
SPACE_USER="${SPACE%%/*}"

TOKEN="${HF_TOKEN:-${HUGGING_FACE_HUB_TOKEN:-}}"

HF_BIN="${HF_BIN:-}"
if [[ -z "$HF_BIN" ]]; then
  if command -v hf >/dev/null 2>&1; then
    HF_BIN="$(command -v hf)"
  elif [[ -x "$ROOT/backend/.venv/bin/hf" ]]; then
    HF_BIN="$ROOT/backend/.venv/bin/hf"
  else
    echo "Install: pip install huggingface_hub"
    exit 1
  fi
fi

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set HF_TOKEN or create .env.deploy"
  echo "  cp .env.deploy.example .env.deploy   # add your token"
  exit 1
fi

export HF_TOKEN="$TOKEN"
export HUGGING_FACE_HUB_TOKEN="$TOKEN"

echo "==> Verifying HF token..."
if ! curl -sS -H "Authorization: Bearer ${TOKEN}" https://huggingface.co/api/whoami-v2 | python3 -c "import sys,json; u=json.load(sys.stdin); assert 'name' in u or 'fullname' in u or 'email' in u" 2>/dev/null; then
  echo "ERROR: Invalid HF_TOKEN"
  exit 1
fi

echo "==> Creating Space ${SPACE} (if missing)..."
curl -sS -X POST "https://huggingface.co/api/repos/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${SPACE_NAME}\",\"type\":\"space\",\"sdk\":\"gradio\",\"private\":false}" \
  >/dev/null 2>&1 || true

./scripts/prepare_hf_space.sh

echo "==> Uploading sandbox/ to Space: ${SPACE}"
"$HF_BIN" upload "$SPACE" sandbox/ --repo-type=space

URL="https://huggingface.co/spaces/${SPACE}"
echo ""
echo "HF Space live: ${URL}"
echo "Update submission_metadata.yaml:"
echo "  sandbox_link: \"${URL}\""