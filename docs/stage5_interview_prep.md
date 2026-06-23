# Stage 5 Interview Prep — Defend Your Work

30-minute Redrob engineering call. Know this cold without slides.

## 60-second pitch

RecruitGPT X ranks 100K candidates offline in ~49s on CPU with no network. Hybrid scorer: title + skills + career semantic + bi-encoder (MiniLM fp16 `.npz`) + honeypot detection + availability. Cross-encoder is experimental only (OFF for submission). Output: byte-reproducible `submission.csv` with fact-grounded reasoning.

## Architecture (draw from memory)

```
candidates.jsonl (100K)
  → feature extraction (title, skills, career, signals)
  → hybrid weighted score (DEFAULT_WEIGHTS in redrob_ranker.py)
  → top-500 pool → optional CE rerank (OFF)
  → calibrate scores [0.99 → 0.20]
  → top-100 + grounded reasoning
  → submission.csv
```

## Top-3 picks — why?

| Rank | Candidate | One-line defense |
|------|-----------|------------------|
| 1 | Sarvam AI — Senior Data Scientist | Semantic search / IR in production; strong skill stack (Weaviate, semantic search) |
| 2 | CRED — Recommendation Systems Engineer | Owned e-commerce ranking layer; 6 core IR skills |
| 3 | Nykaa — Recommendation Systems Engineer | Shipped ranking models for discovery feed |

## Expected questions + answers

**Why title weight 0.24?**  
JD is Senior AI Engineer founding role. Title captures role evidence (Recommendation Systems Engineer, Search Engineer). Plain-language Tier-5s still score via `career_semantic` + bi-encoder. See `docs/judge_faq.md` Q1–2.

**Why CE off?**  
CE-on caused 3/10 top-10 drift and needs HF network. Spec requires network OFF at rank time. `RANKER_USE_CROSS_ENCODER=0` default.

**How do honeypots work?**  
`challenge/honeypot.py` — structural traps (impossible tenure, inconsistent dates). 0 in top-100. Tests: `test_impossible_tenure_demoted`, `test_keyword_stuffer_far_from_top`.

**How do you reproduce?**  
`./scripts/reproduce_ranking.sh` or `python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv`. Hash lock: `data/SUBMISSION_ARTIFACT.sha256`.

**What are your eval metrics?**  
Proxies only — NOT hidden GT. Self-consistency, behavioral proxy, synthetic rule-based labels. See `docs/evaluation_honesty_statement.md`.

**What would you do at 2M scale?**  
Precomputed embeddings + FAISS/HNSW ANN, geographic sharding, two-stage retrieve-then-rerank. Current: linear scan ~48s/100K.

**Did AI write your code?**  
Grok/Cursor assisted. I own architecture, weights, honeypot logic, eval honesty, and can walk through any file live.

## Live demo commands

```bash
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
python scripts/verify_submission_artifact.py --artifact submission.csv
python scripts/mock_stage4_review.py submission.csv
python scripts/check_honeypots.py submission.csv
```

## Files to know by heart

| File | Purpose |
|------|---------|
| `rank.py` | CLI entry |
| `challenge/redrob_ranker.py` | Scoring + reasoning |
| `challenge/honeypot.py` | Trap detection |
| `challenge/embeddings.py` | fp16 matrix load |
| `challenge/jd_config.py` | Weights, skill phrases |
| `scripts/reproduce_ranking.sh` | Canonical repro |