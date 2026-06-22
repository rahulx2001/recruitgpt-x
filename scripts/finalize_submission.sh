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

bash scripts/sync_challenge_data.sh

if [[ ! -f data/candidates.jsonl ]]; then
  echo "ERROR: data/candidates.jsonl missing after sync. See data/README.md"
  exit 1
fi

if [[ ! -f data/embeddings/embeddings.npy ]]; then
  echo "==> Precomputing bi-encoder embeddings (one-time, offline)..."
  python scripts/precompute_embeddings.py --candidates ./data/candidates.jsonl
  echo
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

echo "==> Hand labels (sample set)..."
python scripts/build_hand_labels.py
echo "==> Offline eval harness (behavioral proxy + hand labels)..."
python scripts/run_eval.py --candidates ./data/candidates.jsonl --out ./data/eval_report.json
python scripts/scan_honeypot_recall.py
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