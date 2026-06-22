#!/usr/bin/env bash
# Load Redrob challenge candidates into the web app (replaces 12 demo profiles).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

JSONL="${1:-$ROOT/data/candidates.jsonl}"
if [[ ! -f "$JSONL" ]]; then
  JSONL="/Users/rahulkumarsinghj/DeveloperFolder/Code/ai_rca_platform/India_runs_data_and_ai_challenge/candidates.jsonl"
fi

source .venv/bin/activate
python -m app.data.import_challenge --jsonl "$JSONL" --top-100 --replace

echo "Restart backend (or wait for reload) then open /candidates — you should see 100 profiles."