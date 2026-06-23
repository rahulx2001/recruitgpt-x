#!/usr/bin/env bash
# Appwrite Sites setup for RecruitGPT X frontend (backend stays on Render).
set -euo pipefail

cat <<'EOF'
Appwrite Sites — deploy checklist
=================================

Architecture:
  Appwrite Sites  →  frontend/     (Next.js)
  Render (free)   →  backend/      (FastAPI — recruitgpt-api.onrender.com)

1) Appwrite Console → Sites → Create site → Connect repository
   - Repo:     rahulx2001/recruitgpt-x
   - Branch:   main
   - Root dir: frontend
   - Framework: Next.js

2) Build settings (defaults are fine):
   - Install: npm install
   - Build:   npm run build
   - Output:  ./.next

3) Environment variables (Sites → Settings → Environment):
   NEXT_PUBLIC_API_URL=https://recruitgpt-api.onrender.com
   NEXT_PUBLIC_DEV_USER_ID=dev-user

4) Deploy → copy your site URL (e.g. https://recruitgpt-x.appwrite.network)

5) Render → recruitgpt-api → Environment → update CORS_ORIGINS:
   ["https://YOUR-SITE.appwrite.network","https://recruitgpt-x.vercel.app","http://localhost:3000"]

6) Open your Appwrite site. First load may take ~1 min while Render wakes up.

Backend health check:
  curl https://recruitgpt-api.onrender.com/health

EOF