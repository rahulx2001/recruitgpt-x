#!/usr/bin/env bash
# Copy NVIDIA / LLM keys from .env.deploy → backend/.env (local dev only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_ENV="$ROOT/.env.deploy"
BACKEND_ENV="$ROOT/backend/.env"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "No .env.deploy found. Add NVIDIA_API_KEY there first."
  exit 1
fi

# shellcheck disable=SC1090
source "$DEPLOY_ENV"

if [[ -z "${NVIDIA_API_KEY:-}" ]]; then
  echo "NVIDIA_API_KEY missing in .env.deploy"
  exit 1
fi

touch "$BACKEND_ENV"

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$BACKEND_ENV" 2>/dev/null; then
    # macOS sed
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$BACKEND_ENV"
  else
    echo "${key}=${val}" >> "$BACKEND_ENV"
  fi
}

upsert "LLM_PROVIDER_PREFERENCE" "${LLM_PROVIDER_PREFERENCE:-nvidia}"
upsert "NVIDIA_API_KEY" "$NVIDIA_API_KEY"
upsert "NVIDIA_BASE_URL" "${NVIDIA_BASE_URL:-https://integrate.api.nvidia.com/v1}"
upsert "NVIDIA_MODEL" "${NVIDIA_MODEL:-moonshotai/kimi-k2.6}"

echo "Synced LLM keys from .env.deploy → backend/.env"
echo "Verify: curl http://localhost:8000/api/status | python3 -m json.tool"
echo ""
echo "Production (Render) does NOT read local .env files."
echo "Run: RENDER_API_KEY=rnd_xxx ./scripts/push_render_llm.sh"
echo "Or add NVIDIA_API_KEY manually in Render → recruitgpt-api → Environment."