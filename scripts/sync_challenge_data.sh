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

if [[ -z "${CHALLENGE_DATA_ROOT:-}" ]]; then
  # Common local paths (dev convenience only — judges should set CHALLENGE_DATA_ROOT)
  for candidate in \
    "$HOME/Downloads/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge" \
    "$HOME/Downloads/India_runs_data_and_ai_challenge" \
    ; do
    if [[ -d "$candidate" ]]; then
      CHALLENGE_DATA_ROOT="$candidate"
      break
    fi
  done
fi

OFFICIAL="${CHALLENGE_DATA_ROOT:-}"

if [[ -z "$OFFICIAL" || ! -d "$OFFICIAL" ]]; then
  echo "ERROR: Official challenge folder not found."
  echo "Set CHALLENGE_DATA_ROOT to your bundle path, e.g.:"
  echo "  export CHALLENGE_DATA_ROOT=\"/path/to/India_runs_data_and_ai_challenge\""
  echo "Or place candidates.jsonl at data/candidates.jsonl and skip sync."
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