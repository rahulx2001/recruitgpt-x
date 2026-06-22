#!/usr/bin/env bash
# Pre-deploy verification for RecruitGPT X
set -euo pipefail
ROOT="$(dirname "$0")/.."
cd "$ROOT/backend"

echo "==> Running test suite..."
python -m pytest app/tests -q

echo "==> Checking Alembic..."
alembic current || alembic upgrade head

echo "==> Verifying ranking weights endpoint..."
python -c "
from app.agents.ranking import get_ranking_weights, PROMPT_WEIGHTS
w = get_ranking_weights(use_semantic=False)
assert w == PROMPT_WEIGHTS, w
print('Hackathon weights OK:', w)
"

echo "==> Checking required docs..."
for f in ../docs/DEPLOY.md ../docs/architecture-diagram.svg ../docs/DEMO_SCRIPT.md ../docs/PITCH_DECK.md; do
  test -f "$f" || { echo "Missing $f"; exit 1; }
done

echo "==> Optional live demo acceptance (requires backend on :8000)..."
if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  bash "$(dirname "$0")/demo-acceptance.sh"
else
  echo "   Skipped — start backend with: ./scripts/dev.sh"
fi

echo "✅ Deploy check passed. See docs/DEPLOY.md for Railway + Vercel steps."