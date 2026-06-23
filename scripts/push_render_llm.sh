#!/usr/bin/env bash
# Push NVIDIA_API_KEY from .env.deploy to Render service recruitgpt-api.
# Requires: RENDER_API_KEY from https://dashboard.render.com/u/settings#api-keys
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_ENV="$ROOT/.env.deploy"
SERVICE_NAME="${RENDER_SERVICE_NAME:-recruitgpt-api}"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "Set RENDER_API_KEY (from Render Dashboard → Account Settings → API Keys)"
  exit 1
fi

# shellcheck disable=SC1090
source "$DEPLOY_ENV"

if [[ -z "${NVIDIA_API_KEY:-}" ]]; then
  echo "NVIDIA_API_KEY missing in .env.deploy"
  exit 1
fi

echo "==> Resolving Render service: $SERVICE_NAME"
SERVICE_JSON=$(curl -sf -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services?limit=100")

SERVICE_ID=$(python3 -c "
import json, sys, os
name = os.environ['SERVICE_NAME']
data = json.load(sys.stdin)
for item in data:
    s = item.get('service') or item
    if s.get('name') == name:
        print(s['id'])
        break
" <<< "$SERVICE_JSON")

if [[ -z "$SERVICE_ID" ]]; then
  echo "Service '$SERVICE_NAME' not found on Render account."
  exit 1
fi

echo "==> Service id: $SERVICE_ID"

put_env() {
  local key="$1" val="$2"
  curl -sf -X PUT \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${key}" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"value": sys.argv[1]}))' "$val")" \
    >/dev/null
  echo "  set $key"
}

put_env "NVIDIA_API_KEY" "$NVIDIA_API_KEY"
put_env "LLM_PROVIDER_PREFERENCE" "${LLM_PROVIDER_PREFERENCE:-nvidia}"
put_env "NVIDIA_BASE_URL" "${NVIDIA_BASE_URL:-https://integrate.api.nvidia.com/v1}"
put_env "NVIDIA_MODEL" "${NVIDIA_MODEL:-moonshotai/kimi-k2.6}"

echo "==> Triggering redeploy"
curl -sf -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -d '{}' >/dev/null

echo "Done. Wait ~2 min, then:"
echo "  curl https://recruitgpt-api.onrender.com/api/status"