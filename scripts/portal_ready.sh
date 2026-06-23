#!/usr/bin/env bash
# Full portal-readiness gate — run before uploading team_xxx.csv.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "╔══════════════════════════════════════════════════╗"
echo "║  RecruitGPT X — Portal Readiness Gate            ║"
echo "╚══════════════════════════════════════════════════╝"
echo

bash scripts/sync_challenge_data.sh

export RANKER_USE_CROSS_ENCODER=0
bash scripts/reproduce_ranking.sh

python scripts/validate_submission.py submission.csv
python scripts/validate_submission_ids.py submission.csv
python scripts/check_honeypots.py submission.csv --candidates ./data/candidates.jsonl
python scripts/validate_reasoning.py submission.csv
python scripts/verify_submission_artifact.py --artifact submission.csv
python scripts/mock_stage4_review.py submission.csv
python scripts/scan_honeypot_recall.py

if command -v docker >/dev/null 2>&1; then
  bash scripts/verify_docker_ranker.sh
else
  bash scripts/validate-docker-config.sh
  echo "[SKIP] Docker daemon not available — config validated only"
fi

PARTICIPANT_ID="${RECROB_PARTICIPANT_ID:-}"
if [[ -n "$PARTICIPANT_ID" ]]; then
  cp submission.csv "./${PARTICIPANT_ID}.csv"
  python scripts/validate_submission.py "./${PARTICIPANT_ID}.csv"
  echo "Portal file ready: ./${PARTICIPANT_ID}.csv"
else
  echo "Set RECROB_PARTICIPANT_ID=team_xxx to export portal CSV filename"
fi

echo
echo "Portal checklist:"
echo "  [ ] Upload ${PARTICIPANT_ID:-team_xxx}.csv"
echo "  [ ] Upload submission_metadata.yaml"
echo "  [ ] Confirm sandbox: https://huggingface.co/spaces/rahulsinghx2001/recruitgpt-ranker"
echo "  [ ] Review docs/stage5_interview_prep.md"
echo
echo "PORTAL READY GATE: PASS"