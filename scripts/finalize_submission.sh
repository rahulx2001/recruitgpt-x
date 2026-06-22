#!/usr/bin/env bash
# One-command submission pipeline: rank → validate → export.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PARTICIPANT_ID="${RECROB_PARTICIPANT_ID:-${1:-}}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  RecruitGPT X — Finalize Submission              ║"
echo "╚══════════════════════════════════════════════════╝"
echo

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing. See data/README.md"
  exit 1
fi

echo "==> Ranking 100K candidates (CPU, offline)..."
t0=$(date +%s%N)
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
echo "    Done in ${elapsed_ms}ms"
echo

echo "==> Validation suite..."
python scripts/validate_submission.py submission.csv
python scripts/validate_submission_ids.py submission.csv
python scripts/check_honeypots.py submission.csv --candidates ./data/candidates.jsonl
python scripts/validate_reasoning.py submission.csv
python -m pytest challenge/test_ranker.py -q
echo

if [[ -n "$PARTICIPANT_ID" ]]; then
  echo "==> Exporting portal file: ${PARTICIPANT_ID}.csv"
  cp submission.csv "./${PARTICIPANT_ID}.csv"
  python scripts/validate_submission.py "./${PARTICIPANT_ID}.csv"
  echo "    Ready: ./${PARTICIPANT_ID}.csv"
else
  echo "==> Skipping portal export (set RECROB_PARTICIPANT_ID=team_xxx to export)"
fi

echo
echo "Submission finalized. Next:"
echo "  1. Fill submission_metadata.yaml (email, phone, sandbox_link)"
echo "  2. RECROB_PARTICIPANT_ID=<id> ./scripts/finalize_submission.sh"
echo "  3. Upload ${PARTICIPANT_ID:-team_xxx}.csv + metadata to portal"