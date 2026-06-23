#!/usr/bin/env bash
# Create public GitHub repo and push recruitgpt-x (§10 portal link).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load deploy secrets before reading GITHUB_USER / GITHUB_REPO
if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.deploy" && set +a
fi

REPO_NAME="${GITHUB_REPO:-recruitgpt-x}"
GITHUB_USER="${GITHUB_USER:-rahulx2001}"
REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set GITHUB_TOKEN (or GH_TOKEN) or create .env.deploy"
  echo "  Create .env.deploy with GITHUB_TOKEN (repo scope)"
  exit 1
fi

echo "==> Creating public repo ${GITHUB_USER}/${REPO_NAME} (if missing)..."
repo_check=$(curl -sS -o /tmp/gh_repo_check.json -w "%{http_code}" \
  -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}")
if [[ "$repo_check" != "200" ]]; then
  create_resp=$(curl -sS -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/user/repos" \
    -d "{\"name\":\"${REPO_NAME}\",\"description\":\"RecruitGPT X — Redrob India Runs hackathon ranker\",\"private\":false,\"auto_init\":false}")
  if ! echo "$create_resp" | python3 -c "import sys,json; r=json.load(sys.stdin); sys.exit(0 if r.get('html_url') else 1)" 2>/dev/null; then
    msg=$(echo "$create_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','unknown'))" 2>/dev/null || echo "unknown")
    echo "ERROR: Could not create ${GITHUB_USER}/${REPO_NAME}: ${msg}"
    echo "  → Create an empty public repo manually at https://github.com/new"
    echo "  → Or regenerate a classic PAT with 'repo' scope, then re-run this script"
    exit 1
  fi
  echo "Created: https://github.com/${GITHUB_USER}/${REPO_NAME}"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
else
  git remote add origin "https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

echo "==> Pushing main branch..."
git push -u origin main

# Restore remote without embedded token
git remote set-url origin "$REMOTE"

echo ""
echo "GitHub repo live: $REMOTE"
echo "Update submission_metadata.yaml:"
echo "  github_repo: \"$REMOTE\""