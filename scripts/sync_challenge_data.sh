#!/usr/bin/env bash
# Link recruitgpt-x/data/* → official India Runs challenge bundle (single source of truth).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.deploy" && set +a
fi

# Judges: set CHALLENGE_DATA_ROOT to the official bundle path.
# If data/candidates.jsonl is already a regular file (not symlink), skip sync.
if [[ -f data/candidates.jsonl && ! -L data/candidates.jsonl ]]; then
  echo "==> data/candidates.jsonl present (regular file) — skip sync"
  exit 0
fi

OFFICIAL="${CHALLENGE_DATA_ROOT:-}"

if [[ -z "$OFFICIAL" || ! -d "$OFFICIAL" ]]; then
  echo "ERROR: Official challenge folder not found."
  echo "Set CHALLENGE_DATA_ROOT to your bundle path, e.g.:"
  echo "  export CHALLENGE_DATA_ROOT=\"/path/to/India_runs_data_and_ai_challenge\""
  echo "Or copy candidates.jsonl into data/candidates.jsonl (regular file, not symlink)."
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

# Dev-only debug file (gitignored) — never required for reproduction
printf '%s\n' "$OFFICIAL" > data/.challenge_source

echo
echo "Linked $linked files ($missing missing)."
if [[ "$missing" -gt 0 ]]; then
  exit 1
fi

echo "Official data is now the only source for data/* inputs."
echo "Note: data/.challenge_source is gitignored; use git archive for submission packaging."