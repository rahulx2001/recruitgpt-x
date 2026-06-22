#!/usr/bin/env bash
# Full pre-push / pre-portal-upload checklist for Redrob challenge.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
pass=0
fail=0

ok()   { echo -e "${GREEN}[PASS]${NC} $1"; pass=$((pass+1)); }
bad()  { echo -e "${RED}[FAIL]${NC} $1"; fail=$((fail+1)); }

echo "╔══════════════════════════════════════════════════╗"
echo "║  RecruitGPT X — Pre-Submit Checklist             ║"
echo "╚══════════════════════════════════════════════════╝"
echo

# ── 1. Repo structure ──────────────────────────────────────────────
for f in rank.py pyproject.toml requirements.txt submission_metadata.yaml \
         challenge/redrob_ranker.py scripts/validate_submission.py \
         scripts/check_honeypots.py scripts/export_submission.sh \
         docs/RecruitGPT_X_Approach.pdf docs/RecruitGPT_X_Approach.pptx; do
  [[ -f "$f" ]] && ok "file: $f" || bad "missing: $f"
done

# ── 2. Git history ───────────────────────────────────────────────
if git rev-parse --git-dir >/dev/null 2>&1; then
  ncommits=$(git rev-list --count HEAD 2>/dev/null || echo 0)
  if [[ "$ncommits" -ge 3 ]]; then
    ok "git commits: $ncommits (structured history)"
  else
    bad "git commits: $ncommits (need ≥3 logical commits)"
  fi
else
  bad "not a git repo — run: git init"
fi

# ── 3. Metadata placeholders ─────────────────────────────────────
if grep -q 'example.com\|XXXXXXXXXX' submission_metadata.yaml 2>/dev/null; then
  bad "submission_metadata.yaml still has placeholder contact info"
else
  ok "submission_metadata.yaml contact info filled"
fi

if grep -q 'rahulkumarsinghj/recruitgpt-ranker' submission_metadata.yaml 2>/dev/null; then
  bad "sandbox_link still placeholder — deploy HF Space first"
else
  ok "sandbox_link appears configured"
fi

# ── 4. Offline ranker ────────────────────────────────────────────
if [[ -f data/candidates.jsonl ]]; then
  t0=$(date +%s%N)
  python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
  elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
  ok "rank.py: ${elapsed_ms}ms on 100K"

  if python scripts/validate_submission.py submission.csv >/dev/null 2>&1; then
    ok "submission.csv validates"
  else
    bad "submission.csv validation failed"
  fi

  if python scripts/check_honeypots.py submission.csv >/dev/null 2>&1; then
    ok "honeypot check passed"
  else
    bad "honeypot check failed"
  fi

  if python scripts/validate_submission_ids.py submission.csv >/dev/null 2>&1; then
    ok "candidate IDs verified in jsonl"
  else
    bad "unknown candidate IDs in submission"
  fi

  if python scripts/validate_reasoning.py submission.csv >/dev/null 2>&1; then
    ok "reasoning quality checks"
  else
    bad "reasoning validation failed"
  fi
else
  bad "data/candidates.jsonl missing (see data/README.md)"
fi

# ── 5. Tests ─────────────────────────────────────────────────────
if python -m pytest challenge/test_ranker.py -q >/dev/null 2>&1; then
  ok "challenge tests (5)"
else
  bad "challenge/test_ranker.py failed"
fi

if (cd backend && python -m pytest app/tests -q >/dev/null 2>&1); then
  ok "backend tests"
else
  bad "backend tests failed"
fi

# ── 6. Frontend typecheck ────────────────────────────────────────
if (cd frontend && npx tsc --noEmit >/dev/null 2>&1); then
  ok "TypeScript clean"
else
  bad "frontend tsc errors"
fi

# ── 7. Live API (optional) ─────────────────────────────────────
if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  mode=$(curl -sf http://127.0.0.1:8000/api/status | python3 -c "import sys,json; print(json.load(sys.stdin).get('llm_mode','?'))" 2>/dev/null || echo "?")
  ok "backend live (llm_mode=$mode)"
  if bash scripts/demo-acceptance.sh >/dev/null 2>&1; then
    ok "demo acceptance script"
  else
    bad "demo acceptance script"
  fi
else
  echo "   [SKIP] backend not running on :8000"
fi

# ── 8. Docker ranker ───────────────────────────────────────────
if bash scripts/validate-docker-config.sh >/dev/null 2>&1; then
  ok "Docker config validated (files + constraints)"
else
  bad "Docker config validation failed"
fi
if command -v docker >/dev/null 2>&1; then
  if docker compose -f docker-compose.ranker.yml build >/dev/null 2>&1; then
    ok "Docker ranker image builds"
  else
    bad "Docker ranker build failed"
  fi
else
  echo "   [SKIP] docker daemon not installed (config files OK)"
fi

echo
echo "══════════════════════════════════════════════════"
echo "  $pass passed, $fail failed"
echo "══════════════════════════════════════════════════"

if [[ "$fail" -gt 0 ]]; then
  echo
  echo "Fix failures above, then:"
  echo "  RECROB_PARTICIPANT_ID=team_xxx ./scripts/export_submission.sh"
  echo "  git add -A && git commit -m 'chore: pre-submission fixes'"
  echo "  git push origin main"
  exit 1
fi

echo
echo "Ready to push. Final steps:"
echo "  1. Fill submission_metadata.yaml contact + sandbox_link"
echo "  2. RECROB_PARTICIPANT_ID=<your_id> ./scripts/export_submission.sh"
echo "  3. git push origin main"
exit 0