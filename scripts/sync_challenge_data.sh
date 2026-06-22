#!/usr/bin/env bash
# Link recruitgpt-x/data/* → official India Runs challenge bundle (single source of truth).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load override if set
if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.deploy" && set +a
fi

OFFICIAL="${CHALLENGE_DATA_ROOT:-/Users/rahulkumarsinghj/Downloads/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge}"

if [[ ! -d "$OFFICIAL" ]]; then
  echo "ERROR: Official challenge folder not found:"
  echo "  $OFFICIAL"
  echo "Set CHALLENGE_DATA_ROOT to your bundle path, then re-run."
  exit 1
fi

mkdir -p data
echo "==> Syncing data/ from official bundle:"
echo "    $OFFICIAL"
echo

FILES=(
  candidates.jsonl
  sample_candidates.json
  job_description.docx
  candidate_schema.json
  redrob_signals_doc.docx
  submission_spec.docx
  sample_submission.csv
  submission_metadata_template.yaml
  README.docx
  validate_submission.py
)

linked=0
missing=0
for f in "${FILES[@]}"; do
  src="$OFFICIAL/$f"
  dst="data/$f"
  if [[ ! -f "$src" ]]; then
    echo "  [MISSING] $f"
    missing=$((missing + 1))
    continue
  fi
  rm -f "$dst"
  ln -sf "$src" "$dst"
  echo "  [LINK] $f"
  linked=$((linked + 1))
done

# Record source for debugging / reproduction
printf '%s\n' "$OFFICIAL" > data/.challenge_source

echo
echo "Linked $linked files ($missing missing)."
if [[ "$missing" -gt 0 ]]; then
  exit 1
fi

echo "Official data is now the only source for data/* inputs."