# RecruitGPT X

> **The AI Recruiter That Thinks Like a Hiring Manager**

An intelligent candidate discovery platform that ranks candidates based on **semantic understanding**, **career trajectory**, **behavioral signals**, and **future potential** — not just keyword overlap.

[![Demo](https://img.shields.io/badge/demo-ready-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20FastAPI%20%7C%20LangGraph-purple)](#)

---

## 🎯 Why RecruitGPT X?

Traditional ATS systems are dumb. They match keywords, count years, and miss the best candidates.

RecruitGPT X answers the real question hiring managers care about:

> **"Who should we hire, and why?"**

We go beyond resumes. We analyze:

| Signal | Source | Why It Matters |
|---|---|---|
| **Semantic fit** | Resume + JD embeddings | Catches meaning, not words |
| **Career trajectory** | LinkedIn-style data | Shows growth velocity |
| **Behavioral patterns** | GitHub commits, learning | Reveals real engagement |
| **Skill evolution** | Projects over time | Shows adaptability |
| **Future potential** | Pattern reasoning | Predicts who's a future leader |
| **Bias detection** | Demographic signals | Fair & explainable hiring |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (Vercel)                    │
│  Dashboard │ Ranking │ Candidate Radar │ AI Chat │ What-If     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────────┐
│                  FastAPI Backend (Railway)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            LangGraph Multi-Agent Orchestrator            │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Job Under-   │  │ Candidate    │  │ Behavioral   │   │   │
│  │  │ standing     │  │ Intelligence │  │ Intelligence │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Career       │  │ Semantic     │  │ Ranking      │   │   │
│  │  │ Trajectory   │  │ Matching     │  │ Agent        │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                       ┌──────────────┐                    │   │
│  │                       │ Explainability│                   │   │
│  │                       └──────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────┬────────────────────────┬─────────────────────┬────────────┘
     │                        │                     │
┌────▼──────┐         ┌──────▼──────┐       ┌──────▼──────┐
│PostgreSQL │         │   Qdrant    │       │   BGE-Large │
│(Profiles) │         │(Vector DB)  │       │(Embeddings) │
└───────────┘         └─────────────┘       └─────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (optional, for Qdrant + Postgres)

### 1. Clone & Setup
```bash
cd recruitgpt-x
cp .env.example .env
# Add your OPENAI_API_KEY (or ANTHROPIC_API_KEY) to .env
```

### 2. Start Infrastructure
```bash
docker compose up -d qdrant postgres
```

### 3. Start Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.data.seed        # Loads demo candidates
uvicorn app.main:app --reload  # → http://localhost:8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev                    # → http://localhost:3000
```

### 5. Open the App
Visit **http://localhost:3000** — paste a job description, watch the multi-agent system rank candidates, and explore the explanations.

---

## 🤖 The 7 Agents

| # | Agent | Job |
|---|---|---|
| 1 | **Job Understanding** | Parse JDs into structured hiring blueprints |
| 2 | **Candidate Intelligence** | Extract skills, projects, achievements |
| 3 | **Behavioral Intelligence** | GitHub, learning, consistency scores |
| 4 | **Career Trajectory** | Growth velocity & adaptability |
| 5 | **Semantic Matching** | Embedding-based meaning match |
| 6 | **Ranking** | Weighted multi-signal scoring |
| 7 | **Explainability** | Recruiter-friendly reasoning |

All orchestrated via **LangGraph** with shared state and conditional routing.

---

## ✨ Wow Features

- 🎯 **AI Recruiter Chat** — Ask "Why is Rahul above Amit?" in plain English
- 📡 **Candidate Radar** — Interactive skill cluster visualization
- 🔮 **Future Potential Predictor** — "Where will this person be in 2 years?"
- 🔄 **What-If Analysis** — Drop a requirement, see ranking shift live
- ⚖️ **Bias Detection** — Surface demographic skew in your shortlist
- 🧠 **Natural Language Search** — "Show SQL-strong, PowerBI-weak candidates"

---

## 📚 Documentation

- [Architecture Deep Dive](docs/ARCHITECTURE.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Pitch Deck Outline](docs/PITCH_DECK.md)
- [API Reference](docs/API.md)
- [Evaluation Metrics](docs/EVALUATION.md)

---

## 🏆 Hackathon Winning Differentiators

1. **True multi-agent reasoning** — not a single LLM call
2. **Behavioral + Trajectory intelligence** — beyond resumes
3. **Explainable rankings** — every score has reasoning
4. **Bias detection built-in** — fair AI hiring
5. **Live what-if analysis** — interactive recruiter experience
6. **Future potential** — predicts who'll be great, not just who is now

---

Built for the **India Runs Data & AI Challenge: Intelligent Candidate Discovery** hackathon.

> **Git repo:** This folder is the submission repo (`recruitgpt-x`). Initialize here, not in the parent monorepo. Stage 4 reviewers look for incremental commits — commit as you build, not as one dump at the end.

### Why does the UI show 12 candidates but rank.py uses 100,000?

| System | Data source | Count |
|---|---|---|
| **Web app** (`/candidates`) | SQLite via `seed.py` (demo profiles) | 12 by default |
| **Offline ranker** (`rank.py`) | `candidates.jsonl` (challenge file) | 100,000 |

To load your **top-100 ranked** challenge candidates into the dashboard:

```bash
./scripts/import-challenge-candidates.sh
# or: cd backend && python -m app.data.import_challenge --top-100 --replace
```

Importing all 100K into SQLite is possible (`--limit 100000`) but slow and heavy for local demo — the submission CSV only needs the offline ranker.

---

## Hackathon Offline Ranker

The challenge requires a **CPU-only, no-network** ranker over `candidates.jsonl`. Use the `challenge/` module at the repo root:

```bash
# Dataset already copied to data/candidates.jsonl (100K profiles)
pip install -r requirements-ranker.txt   # pytest only; rank.py uses stdlib
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
python scripts/validate_submission.py submission.csv   # must print "Submission is valid."
python scripts/check_honeypots.py submission.csv       # must print "PASS"
RECROB_PARTICIPANT_ID=team_xxx ./scripts/export_submission.sh  # portal filename §2
./scripts/pre-submit.sh                                        # full checklist before push
```

### Docker reproduction (Stage 3)

```bash
docker compose -f docker-compose.ranker.yml build
docker compose -f docker-compose.ranker.yml run --rm ranker   # needs data/candidates.jsonl mounted
```

### HuggingFace sandbox (§10.5)

```bash
./scripts/prepare_hf_space.sh   # bundle sandbox/ for upload
# Deploy sandbox/ to HF Space → set sandbox_link in submission_metadata.yaml
python -m pytest challenge/test_ranker.py -q
python rank.py --self-test
```

See `sandbox/README.md` for Space deploy steps.

### Deliverables in this repo

| File | Description |
|---|---|
| `submission.csv` | Top-100 ranked candidates (validated) |
| `submission_metadata.yaml` | Reproducibility + team metadata for portal |
| `docs/RecruitGPT_X_Approach.pptx` | Approach deck |
| `docs/RecruitGPT_X_Approach.pdf` | PDF version for submission |
| `challenge/redrob_ranker.py` | Hybrid scoring engine |
| `challenge/jd_config.py` | Parsed JD requirements from `job_description.docx` |

### Ranking approach (summary)

1. **Title + career** — Strong match for Senior AI / ML / IR roles; honeypot titles (HR Manager, Accountant, etc.) heavily penalized.
2. **Skills** — Core AI/IR skills (embeddings, retrieval, vector DBs, PyTorch) with endorsement + duration trust; noise skills demoted.
3. **Production signals** — Deployment, scale, NDCG/MRR language in summaries and history.
4. **Redrob behavioral modifier** — Response rate, GitHub activity, recruiter saves, profile completeness.
5. **Honeypot traps** — Unrelated title + inflated AI skill count → multiplicative penalty.

Top result: **CAND_0002025** (Senior AI Engineer, 7 core IR skills, 0.80 response rate). Zero honeypot titles in top 100.