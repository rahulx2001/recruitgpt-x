#!/usr/bin/env bash
# Start backend (8000) and frontend (3000) for local development.
set -euo pipefail
ROOT="$(dirname "$0")/.."

cleanup() { jobs -p | xargs kill 2>/dev/null || true; }
trap cleanup EXIT

(cd "$ROOT/backend" && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
(cd "$ROOT/frontend" && npm run dev:clean) &
wait