#!/usr/bin/env bash
# Export submission CSV with portal participant ID filename (§2).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PARTICIPANT_ID="${RECROB_PARTICIPANT_ID:-${1:-}}"
if [[ -z "$PARTICIPANT_ID" ]]; then
  echo "Usage: RECROB_PARTICIPANT_ID=team_xxx ./scripts/export_submission.sh"
  echo "   or: ./scripts/export_submission.sh team_xxx"
  exit 1
fi

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing. See data/README.md"
  exit 1
fi

python rank.py --candidates ./data/candidates.jsonl --out "./${PARTICIPANT_ID}.csv"
python scripts/validate_submission.py "./${PARTICIPANT_ID}.csv"
python scripts/validate_submission_ids.py "./${PARTICIPANT_ID}.csv"
python scripts/check_honeypots.py "./${PARTICIPANT_ID}.csv"
python scripts/validate_reasoning.py "./${PARTICIPANT_ID}.csv"

echo "Ready for upload: ${PARTICIPANT_ID}.csv"