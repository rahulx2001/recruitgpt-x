# RecruitGPT X — Architecture Deep Dive

## 1. System Overview

RecruitGPT X is a **multi-agent AI recruitment platform** built around a single principle:

> **Ranking = f(Semantics, Trajectory, Behavior, Context)**

The system is composed of three loosely coupled layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER  →  Next.js 14 (App Router, Tailwind, RSC) │
├─────────────────────────────────────────────────────────────────┤
│  INTELLIGENCE LAYER  →  FastAPI + LangGraph + LangChain        │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER          →  PostgreSQL + Qdrant + Object Storage   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Agent Graph (LangGraph)

The core of the system is a **LangGraph state machine** with 7 agents that collaborate on a shared `RecruitmentState` object.

```
┌──────────────────┐
│  Parse Job (JD)  │
│  Agent 1         │
└────────┬─────────┘
         │ hiring_blueprint
         ▼
┌──────────────────┐
│ Load Candidates  │  (Postgres + Qdrant hybrid retrieval)
│ from Vector DB   │
└────────┬─────────┘
         │ candidate_pool
         ▼
┌──────────────────┐
│  For each cand:  │
│  ┌────────────┐  │
│  │ Agent 2    │──┼──► Candidate Profile
│  │ Agent 3    │──┼──► Behavioral Scores
│  │ Agent 4    │──┼──► Trajectory Scores
│  └────────────┘  │
└────────┬─────────┘
         │ enriched_candidates[]
         ▼
┌──────────────────┐
│  Agent 5         │
│  Semantic Match  │  (BGE embeddings + LLM reasoning)
└────────┬─────────┘
         │ semantic_scores
         ▼
┌──────────────────┐
│  Agent 6         │
│  Ranking         │  (Weighted multi-signal score)
└────────┬─────────┘
         │ ranked_candidates
         ▼
┌──────────────────┐
│  Agent 7         │
│  Explainability  │  (LLM-generated recruiter reasoning)
└────────┬─────────┘
         │ final_shortlist
         ▼
       [OUTPUT]
```

### State Schema

```python
class RecruitmentState(TypedDict):
    job_id: str
    job_description: str
    hiring_blueprint: HiringBlueprint
    candidate_pool: List[Candidate]
    enriched_candidates: List[EnrichedCandidate]
    semantic_scores: Dict[str, float]
    ranked_candidates: List[RankedCandidate]
    explanations: Dict[str, Explanation]
    metadata: Dict[str, Any]
```

---

## 3. Agent Specifications

### Agent 1 — Job Understanding Agent
- **Input**: Raw JD text
- **Method**: Structured LLM extraction (function calling)
- **Output**:
  ```json
  {
    "hard_skills": ["Python", "PyTorch", "SQL", "AWS"],
    "soft_skills": ["Leadership", "Communication"],
    "industry": "FinTech",
    "seniority": "Senior",
    "years_experience_min": 5,
    "leadership_requirement": "high",
    "communication_requirement": "high",
    "growth_expectation": "fast-track to staff",
    "hidden_requirements": ["startup experience", "production ML"],
    "domain_keywords": ["fraud detection", "risk modeling"]
  }
  ```

### Agent 2 — Candidate Intelligence Agent
- **Input**: Resume + LinkedIn profile + portfolio
- **Method**: LLM structured extraction
- **Output**:
  ```json
  {
    "skills": ["Python", "PyTorch", "Airflow"],
    "projects": [{...}],
    "achievements": [{...}],
    "leadership_evidence": ["Led team of 4"],
    "communication_evidence": ["Presented at KDD"]
  }
  ```

### Agent 3 — Behavioral Intelligence Agent
- **Input**: GitHub activity, learning patterns, cert timeline
- **Method**: Heuristic + LLM scoring
- **Output**:
  ```json
  {
    "growth_score": 0.82,
    "consistency_score": 0.91,
    "learning_score": 0.78,
    "initiative_score": 0.85,
    "reasoning": "..."
  }
  ```

### Agent 4 — Career Trajectory Agent
- **Input**: Career timeline
- **Method**: Sequence analysis + LLM reasoning
- **Output**:
  ```json
  {
    "trajectory_type": "accelerating",
    "growth_velocity": 0.88,
    "adaptability": 0.75,
    "future_potential": 0.91,
    "reasoning": "..."
  }
  ```

### Agent 5 — Semantic Matching Agent
- **Input**: Hiring blueprint + candidate profile
- **Method**: BGE embeddings + LLM cross-encoder reasoning
- **Output**:
  ```json
  {
    "embedding_similarity": 0.84,
    "functional_similarity": 0.79,
    "experience_relevance": 0.86,
    "domain_alignment": 0.71,
    "composite_semantic_score": 0.80
  }
  ```

### Agent 6 — Ranking Agent
- **Input**: All signals
- **Method**: Weighted scoring with config-driven weights
- **Hackathon prompt weights** (`PROMPT_WEIGHTS`, sum = 100%):
  | Signal | Weight |
  |---|---|
  | Skill Match | 30% |
  | Project Relevance | 20% |
  | Career Growth | 15% |
  | Behavioral | 15% |
  | Learning | 10% |
  | Communication | 10% |
- **Production default** (`DEFAULT_WEIGHTS` = prompt 90% + semantic 10%):
  | Signal | Weight |
  |---|---|
  | Skill Match | 27% |
  | Project Relevance | 18% |
  | Career Growth | 13.5% |
  | Behavioral | 13.5% |
  | Learning | 9% |
  | Communication | 9% |
  | Semantic (meaning-level fit) | 10% |
- **Output**: Ranked list with sub-scores

### Agent 7 — Explainability Agent
- **Input**: Ranked candidate + raw signals
- **Method**: LLM narrative generation
- **Output**:
  ```json
  {
    "summary": "Strong fit due to...",
    "strengths": [...],
    "weaknesses": [...],
    "interview_focus_areas": [...],
    "hiring_manager_talking_points": [...]
  }
  ```

---

## 4. Data Layer

### PostgreSQL / SQLite Schema (matches `app/models/database.py`)

```sql
-- Candidates (multi-tenant via owner_id)
CREATE TABLE candidates (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL DEFAULT 'dev-user',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  headline TEXT,
  location TEXT,
  current_role TEXT,
  years_experience INT DEFAULT 0,
  resume_text TEXT DEFAULT '',
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  gender TEXT,
  ethnicity TEXT,
  school TEXT,
  github_stats JSON,
  certifications JSON,  -- list stored as JSON text (SQLite portable)
  metadata JSON,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ix_candidates_owner_id ON candidates (owner_id);

-- Work Experiences (timeline)
CREATE TABLE work_experiences (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) REFERENCES candidates(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  is_current BOOLEAN DEFAULT FALSE
);

-- Projects
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  candidate_id VARCHAR(36) REFERENCES candidates(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT DEFAULT '',
  technologies JSON,
  url TEXT,
  impact TEXT
);

-- Skills (composite PK — no separate skills lookup table)
CREATE TABLE candidate_skills (
  candidate_id VARCHAR(36) REFERENCES candidates(id) ON DELETE CASCADE,
  skill_name TEXT,
  proficiency INT DEFAULT 3,
  years FLOAT DEFAULT 0,
  category TEXT,
  PRIMARY KEY (candidate_id, skill_name)
);

-- Jobs
CREATE TABLE jobs (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL DEFAULT 'dev-user',
  title TEXT,
  description TEXT,
  blueprint JSON,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ix_jobs_owner_id ON jobs (owner_id);

-- Per-candidate ranking rows (historical)
CREATE TABLE rankings (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id VARCHAR(36) REFERENCES candidates(id),
  rank INT,
  hireability_score FLOAT,
  sub_scores JSON,
  explanation JSON,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached full ranking snapshot (one per job)
CREATE TABLE ranking_cache (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  job_title TEXT,
  blueprint JSON,
  ranked JSON,
  pipeline_metadata JSON,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Qdrant Collections

- `candidate_profiles` — full profile embeddings (1024-dim BGE or TF-IDF fallback)
- `job_descriptions` — JD embeddings

---

## 5. API Surface

All `/api/*` routes require `X-User-Id` (dev) or `Authorization: Bearer <Clerk JWT>` (production).

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/jobs/parse` | Parse JD → blueprint |
| `POST` | `/api/jobs` | Create job |
| `GET` | `/api/jobs` | List jobs (owner-scoped) |
| `GET` | `/api/jobs/{id}` | Job detail |
| `GET` | `/api/jobs/{id}/rank` | Run full ranking pipeline |
| `GET` | `/api/jobs/{id}/rank/stream` | SSE pipeline progress |
| `POST` | `/api/jobs/{id}/whatif` | What-if re-ranking |
| `GET` | `/api/jobs/{id}/bias` | Bias report |
| `POST` | `/api/jobs/{id}/chat` | AI recruiter chat |
| `GET` | `/api/candidates` | List candidates |
| `POST` | `/api/candidates` | Add candidate |
| `POST` | `/api/candidates/upload-resume` | TXT/PDF resume upload |
| `GET` | `/api/candidates/{id}` | Profile detail |
| `GET` | `/api/candidates/{id}/potential` | Future potential |
| `POST` | `/api/search` | Natural language candidate search |

---

## 6. Frontend Architecture

```
app/
├── page.tsx                    # Landing
├── dashboard/page.tsx          # Main dashboard
├── jobs/
│   ├── new/page.tsx            # Create job
│   └── [id]/page.tsx           # Job detail + ranking
├── candidates/
│   ├── page.tsx                # Candidate list
│   └── [id]/page.tsx           # Candidate detail
├── chat/page.tsx               # AI recruiter chat
└── whatif/page.tsx             # What-if playground

components/
├── ui/                         # Shadcn-style primitives
├── CandidateCard.tsx
├── RankedList.tsx
├── SkillRadar.tsx              # Recharts radar chart
├── ExplainabilityPanel.tsx
├── ChatInterface.tsx
├── BiasReport.tsx
├── WhatIfPlayground.tsx
└── CandidateRadar.tsx          # D3/visx cluster viz
```

State: Zustand for global, TanStack Query for server state.

---

## 7. Scalability

- **Horizontal**: FastAPI workers + Qdrant cluster
- **Async pipelines**: LangGraph supports concurrent candidate processing
- **Caching**: Ranking results cached in Postgres
- **Streaming**: SSE for real-time pipeline progress
- **Cost control**: Embeddings pre-computed; LLM only for hard reasoning

---

## 8. Security & Fairness

- **PII handling**: Resume text encrypted at rest
- **Bias detection**: Monitors ranking distribution across demographics
- **Auditability**: Every score has traceable sub-scores
- **Explainability**: GDPR-grade right-to-explanation