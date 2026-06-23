#!/usr/bin/env bash
# Bundle everything needed for H2S portal upload (CSV + PDF + metadata copy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="${ROOT}/portal_upload"
TEAM_NAME="${TEAM_NAME:-Schadn}"

mkdir -p "$OUT"

echo "==> Validating submission.csv..."
python scripts/validate_submission.py submission.csv
python scripts/validate_submission_ids.py submission.csv
python scripts/check_honeypots.py submission.csv
python scripts/validate_reasoning.py submission.csv

echo "==> Building portal upload bundle in portal_upload/"
cp -f submission.csv "${OUT}/submission.csv"
cp -f submission.csv "${OUT}/${TEAM_NAME}.csv"
cp -f docs/RecruitGPT_X_Approach.pdf "${OUT}/RecruitGPT_X_Approach.pdf"
cp -f submission_metadata.yaml "${OUT}/submission_metadata.yaml"

for f in submission.csv "${TEAM_NAME}.csv"; do
  python scripts/validate_submission.py "${OUT}/${f}"
done

cat > "${OUT}/PORTAL_FIELDS.txt" <<EOF
H2S / India Runs — paste these on the Submissions form
======================================================

Team name:        Schadn
Primary contact:  Rahul Kumar Singh
Email:            rahulsinghx2001@gmail.com
Phone:            +91-8539816642

GitHub repo:      https://github.com/rahulx2001/recruitgpt-x
Sandbox (HF):     https://huggingface.co/spaces/rahulsinghx2001/recruitgpt-ranker

AI tools:         Cursor + Other (Grok)
Compute:          MacBook Pro (Apple Silicon), 16GB RAM, Python 3.11, CPU only

CSV to upload:    Try submission.csv first.
                  If the form asks for team name, use Schadn.csv instead.

PDF to upload:    RecruitGPT_X_Approach.pdf

Methodology (optional, paste if asked):
Hybrid offline ranker: lexical + TF-IDF + committed MiniLM bi-encoder,
honeypot detection, availability signals, template-blurb penalty.
Cross-encoder OFF. ~49s on 100K CPU. Byte-reproducible via ./scripts/reproduce_ranking.sh.
EOF

echo
echo "Portal bundle ready:"
ls -lh "$OUT"
echo
echo "Open H2S → INDIA RUNS → DASHBOARD → Submissions"
echo "Upload files from: ${OUT}/"