#!/usr/bin/env bash
# Bootstrap .env files for local development with live LLM + Clerk.
set -euo pipefail
ROOT="$(dirname "$0")/.."

echo "==> Setting up environment files..."

if [[ ! -f "$ROOT/backend/.env" ]]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "  Created backend/.env from .env.example"
else
  echo "  backend/.env already exists (skipped)"
fi

if [[ ! -f "$ROOT/frontend/.env.local" ]]; then
  cp "$ROOT/frontend/.env.local.example" "$ROOT/frontend/.env.local"
  echo "  Created frontend/.env.local from .env.local.example"
else
  echo "  frontend/.env.local already exists (skipped)"
fi

echo ""
echo "==> Configure these keys for LIVE mode (not mock):"
echo "  backend/.env:"
echo "    NVIDIA_API_KEY=nvapi-...     # or MINIMAX_API_KEY / OPENAI_API_KEY"
echo "    LLM_PROVIDER_PREFERENCE=auto # or minimax / nvidia / openai"
echo ""
echo "  frontend/.env.local:"
echo "    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..."
echo "    CLERK_SECRET_KEY=sk_test_..."
echo ""
echo "==> Verify after adding keys:"
echo "  curl http://localhost:8000/api/status | python3 -m json.tool"