# RecruitGPT X — Backend

FastAPI + LangGraph multi-agent orchestration for intelligent candidate ranking.

## Stack
- **FastAPI** — async HTTP API
- **LangGraph** — multi-agent state machine
- **LangChain** — LLM orchestration
- **Qdrant** — vector database
- **PostgreSQL** (asyncpg + SQLAlchemy) — relational store
- **BGE-Large** — local embeddings (sentence-transformers)
- **Pydantic v2** — schemas

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Make sure Postgres + Qdrant are running
docker compose up -d

# Initialize DB + seed demo data
python -m app.data.seed

# Run server
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
app/
├── main.py                  # FastAPI entrypoint
├── config.py                # Settings
├── api/routes/              # HTTP endpoints
├── agents/                  # 7 LangGraph agents
├── services/                # LLM, embeddings, vector store
├── models/                  # DB models + schemas
├── data/                    # Seed scripts
└── utils/                   # Helpers
```

## Environment Variables

See `.env.example` at repo root.

## Key Endpoints

- `POST /api/jobs/parse` — Parse JD into hiring blueprint
- `POST /api/jobs` — Create job
- `GET /api/jobs/{id}/rank` — Run full ranking pipeline
- `POST /api/candidates` — Add candidate
- `POST /api/search` — Natural language search
- `POST /api/chat` — AI recruiter chat
- `POST /api/whatif` — What-if re-ranking
- `GET /api/jobs/{id}/bias` — Bias report