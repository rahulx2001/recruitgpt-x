# RecruitGPT X — API Reference

Base URL: `http://localhost:8000` (dev) · `https://<railway-app>.up.railway.app` (prod)

Interactive docs: `GET /docs` (Swagger UI)

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness + vector store index counts |

---

## Jobs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs/parse` | Parse JD → `HiringBlueprint` (no persist) |
| `POST` | `/api/jobs` | Create job + auto-parse blueprint |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/{id}` | Get job by ID |
| `GET` | `/api/jobs/{id}/rank?refresh=false` | Rank candidates (cached by default) |
| `POST` | `/api/jobs/{id}/whatif` | Re-rank with modified requirements |
| `GET` | `/api/jobs/{id}/bias` | Bias audit on top-10 shortlist |
| `POST` | `/api/jobs/{id}/chat` | AI recruiter chat |

### Rank (cached)

```bash
curl "http://localhost:8000/api/jobs/{job_id}/rank"
curl "http://localhost:8000/api/jobs/{job_id}/rank?refresh=true"  # force re-run
```

Returns `RankingResult` with `cached: true` when served from DB cache.

### What-If

```json
POST /api/jobs/{id}/whatif
{
  "job_id": "...",
  "removed_skills": ["Power BI"],
  "added_skills": ["Kubernetes"],
  "seniority_override": "Staff"
}
```

### Chat

```json
POST /api/jobs/{id}/chat
{
  "job_id": "...",
  "message": "Why is Rahul ranked above Amit?",
  "history": []
}
```

---

## Candidates

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/candidates` | List all candidates |
| `POST` | `/api/candidates` | Create candidate |
| `GET` | `/api/candidates/{id}` | Get candidate profile |
| `GET` | `/api/candidates/{id}/potential` | Future potential prediction |

---

## Search

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/search` | Natural language + vector search |

```json
POST /api/search
{
  "query": "Strong in SQL but lacking Power BI",
  "top_k": 10
}
```

Parses structured filters (`required_skills`, `excluded_skills`, themes) and combines with Qdrant/in-memory vector similarity.

---

## Response schemas (key fields)

### `HiringBlueprint`
`hard_skills`, `soft_skills`, `industry`, `seniority`, `hidden_requirements`, `domain_keywords`, `reasoning`

### `RankedCandidate`
`rank`, `candidate_name`, `hireability_score`, `sub_scores`, `explanation`, `intelligence`, `behavioral`, `trajectory`, `semantic`

### `BiasReport`
`gender_distribution`, `ethnicity_distribution`, `school_distribution`, `location_distribution`, `flags`, `overall_fairness_score`, `cached_ranking`

---

## Environment

| Variable | Purpose |
|----------|---------|
| `MINIMAX_API_KEY` | MiniMax M3 LLM (preferred) |
| `OPENAI_API_KEY` | OpenAI fallback |
| `DATABASE_URL` | PostgreSQL or SQLite |
| `QDRANT_URL` | Vector DB |
| `EMBEDDING_PROVIDER` | `local` (BGE) or `openai` |