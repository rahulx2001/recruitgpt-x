#!/usr/bin/env bash
# Deploy RecruitGPT X frontend to Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: vercel login"
  exit 1
fi

API_URL="${NEXT_PUBLIC_API_URL:-}"
if [[ -z "$API_URL" ]]; then
  echo "Set NEXT_PUBLIC_API_URL to your public backend (Railway, etc.)."
  echo "Example:"
  echo "  NEXT_PUBLIC_API_URL=https://your-app.up.railway.app ./scripts/deploy_vercel.sh"
  exit 1
fi

cd "$FRONTEND"

echo "==> Linking Vercel project (frontend root)..."
vercel link --yes 2>/dev/null || vercel link

echo "==> Setting production env..."
vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production

vercel env rm NEXT_PUBLIC_DEV_USER_ID production --yes 2>/dev/null || true
printf '%s' "${NEXT_PUBLIC_DEV_USER_ID:-dev-user}" | vercel env add NEXT_PUBLIC_DEV_USER_ID production

echo "==> Deploying to production..."
vercel deploy --prod --yes

echo ""
echo "Done. Update backend CORS_ORIGINS to include your Vercel URL, then redeploy backend."