#!/usr/bin/env bash
# Create public GitHub repo and push recruitgpt-x (§10 portal link).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_NAME="${GITHUB_REPO:-recruitgpt-x}"
GITHUB_USER="${GITHUB_USER:-rahulx2001}"
REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

# Load deploy secrets if present
if [[ -f "$ROOT/.env.deploy" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$ROOT/.env.deploy" && set +a
fi

TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set GITHUB_TOKEN (or GH_TOKEN) or create .env.deploy"
  echo "  cp .env.deploy.example .env.deploy   # add your token"
  exit 1
fi

echo "==> Creating public repo ${GITHUB_USER}/${REPO_NAME} (if missing)..."
curl -sS -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}" >/dev/null 2>&1 || \
curl -sS -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user/repos" \
  -d "{\"name\":\"${REPO_NAME}\",\"description\":\"RecruitGPT X — Redrob India Runs hackathon ranker\",\"private\":false,\"auto_init\":false}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('created:', r.get('html_url', r.get('message','?')))"

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