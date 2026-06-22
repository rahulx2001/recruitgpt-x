# RecruitGPT X — Production Deploy Guide

Deploy backend to **Railway** and frontend to **Vercel** in ~30 minutes.

---

## Prerequisites

- [Railway](https://railway.app) account
- [Vercel](https://vercel.com) account
- [Clerk](https://clerk.com) account (production auth)
- LLM API key (NVIDIA NIM or MiniMax M3)
- GitHub repo pushed

---

## Step 1 — Railway (Backend)

### 1.1 Create project

1. New Project → Deploy from GitHub → select `recruitgpt-x`
2. Set **Root Directory** to `backend`
3. Add **PostgreSQL** plugin → copy `DATABASE_URL`

### 1.2 Environment variables

```bash
APP_ENV=production
REQUIRE_AUTH=true
AUTO_SEED_ON_STARTUP=true
USE_SEMANTIC_RANKING_WEIGHTS=false

DATABASE_URL=postgresql+asyncpg://...   # Railway provides this
CORS_ORIGINS=https://your-app.vercel.app

# LLM (pick one)
NVIDIA_API_KEY=nvapi-...
# MINIMAX_API_KEY=...

# Embeddings — use TF-IDF on Railway unless you add torch (large image)
EMBEDDING_PROVIDER=local

# Clerk
CLERK_SECRET_KEY=sk_live_...
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_ISSUER=https://<your-clerk-domain>

DEFAULT_DEV_USER_ID=dev-user
```

### 1.3 Deploy

Railway runs automatically:

- `releaseCommand`: `alembic upgrade head`
- `startCommand`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 1.4 Verify backend

```bash
curl https://<railway-app>.up.railway.app/health
# {"status":"ok"}

curl https://<railway-app>.up.railway.app/api/jobs/ranking-weights
# hackathon_spec weights: skill_match 0.30, ...
```

Copy the Railway public URL — you need it for Vercel.

---

## Step 2 — Vercel (Frontend)

### 2.1 Import project

1. Vercel → New Project → import GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework: Next.js (auto-detected)

### 2.2 Environment variables

```bash
NEXT_PUBLIC_API_URL=https://<railway-app>.up.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_DEV_USER_ID=dev-user
```

### 2.3 Deploy

Vercel builds with `vercel.json` config. After deploy, update Railway `CORS_ORIGINS` to your Vercel URL and redeploy backend.

---

## Step 3 — Clerk setup

1. Create Clerk application
2. Enable Email/Google sign-in
3. Add allowed origins: `https://your-app.vercel.app`
4. Copy publishable + secret keys to Vercel and Railway
5. Set JWKS URL in Railway backend env

---

## Step 4 — Demo data

On first deploy with `AUTO_SEED_ON_STARTUP=true`, empty databases auto-seed 12 candidates + 1 job.

Manual seed (SSH or Railway shell):

```bash
cd backend && python -m app.data.seed
```

---

## Step 5 — Pre-demo checklist

Run locally before judging:

```bash
./scripts/deploy-check.sh
python ../run_tests.py
```

### Demo URLs to share with judges

| Service | URL |
|---------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend API | `https://<railway>.up.railway.app` |
| API Docs | `https://<railway>.up.railway.app/docs` |
| Ranking weights | `GET /api/jobs/ranking-weights` |

---

## Optional: Qdrant Cloud

For production vector search (instead of in-memory fallback):

1. Create cluster at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Set `QDRANT_URL` and `QDRANT_API_KEY` on Railway

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Match `CORS_ORIGINS` to exact Vercel URL |
| 401 on API | Set Clerk keys; sign in on frontend |
| Empty candidates | Run seed or enable `AUTO_SEED_ON_STARTUP` |
| Slow cold start | BGE model loads on first request — warm up before demo |
| CSS 404 locally | `cd frontend && npm run dev:clean` |