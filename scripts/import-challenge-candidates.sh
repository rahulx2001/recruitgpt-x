#!/usr/bin/env bash
# Load Redrob challenge candidates into the web app (replaces 12 demo profiles).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

# Always use official challenge bundle (synced into data/ or CHALLENGE_DATA_ROOT).
bash "$ROOT/scripts/sync_challenge_data.sh"
JSONL="${1:-$ROOT/data/candidates.jsonl}"

source .venv/bin/activate
python -m app.data.import_challenge --jsonl "$JSONL" --top-100 --replace

echo "Restart backend (or wait for reload) then open /candidates — you should see 100 profiles."