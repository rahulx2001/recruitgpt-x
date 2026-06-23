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
- [Evaluation Limitations](docs/evaluation_limitations.md) — proxy vs synthetic vs hidden GT
- [Evaluation Honesty Statement](docs/evaluation_honesty_statement.md)
- [Judge FAQ](docs/judge_faq.md)

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
# One-command pipeline (rank + validate + tests):
./scripts/finalize_submission.sh

# Portal export with your registered participant ID:
RECROB_PARTICIPANT_ID=team_xxx ./scripts/finalize_submission.sh

# Full pre-push checklist (metadata, docker, backend):
./scripts/pre-submit.sh
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

**Submission pipeline** (`RANKER_USE_CROSS_ENCODER=0`, byte-reproducible):

1. **Title + career** — Senior AI / Recommendation Systems / Search / ML roles boosted; honeypot titles heavily penalized.
2. **Skills** — Core AI/IR skills (embeddings, retrieval, vector DBs, ranking) with endorsement + duration trust.
3. **Bi-encoder** — Committed `embeddings.fp16.npz` (MiniLM-L6-v2@1110a243); TF-IDF fallback if absent.
4. **Production + product pedigree** — Deployment signals; product-company history over pure consulting.
5. **Behavioral + logistics** — Response rate, GitHub, notice period, title-chaser penalty.
6. **Honeypot traps** — Structural traps → multiplicative penalty.

**Not used in submission artifact:** cross-encoder rerank (`RANKER_USE_CROSS_ENCODER=1` is experimental only; requires offline HF cache).

### Evaluation disclaimer

Offline metrics in `data/eval_report.json` are **proxies**, not hidden ground truth.  
`synthetic_proxy_labels.json` is **automatically generated** by `scripts/build_synthetic_proxy_labels.py` — **not human-labeled ground truth** (excludes submission top-100).  
See [evaluation_honesty_statement.md](docs/evaluation_honesty_statement.md) and [audit_resolution_checklist.md](docs/audit_resolution_checklist.md).

### Reproduce & verify

```bash
./scripts/reproduce_ranking.sh          # rank + byte-verify
python scripts/verify_submission_artifact.py
```

Dataset: mount `candidates.jsonl` via `--candidates`, `CHALLENGE_DATA_ROOT`, or `./scripts/sync_challenge_data.sh`.