# Interview Prep — Canonical Submission Path Only

> **Judges:** This doc describes the **offline ranker that produced `submission.csv`**.
> For the optional LangGraph web demo, see `docs/ARCHITECTURE.md` (marked DEMO ONLY).
> Cross-encoder and LLM agents are **not** used in the submission artifact.

## 30-second pitch

Hybrid CPU ranker: committed `all-MiniLM-L6-v2` embeddings (`embeddings.fp16.npz`) + lexical/title/signals → calibrated top-100. **Cross-encoder OFF.** No LLM at rank time. Byte-reproducible via `./scripts/reproduce_ranking.sh`.

## Architecture (submission)

```
candidates.jsonl → hybrid scorer (10 weighted signals) → top-500 pool → calibrate → top-100 + reasoning → submission.csv
```

Required artifacts: `data/embeddings/embeddings.fp16.npz` (committed, 71 MB). If missing, `rank.py` **aborts** (`RANKER_REQUIRE_EMBEDDINGS=1`) rather than silently falling back to TF-IDF.

## Cold questions — honest answers

**Why bi-encoder vs pure lexical?**  
Lexical misses plain-language Tier-5 fits. Precomputed MiniLM cosine scales to 100K in ~49s CPU. Without `.npz`, top-10 **set** overlap vs canonical drops to ~3/10 (positional ~4/10) — not interchangeable.

**Why is cross-encoder OFF?**  
CE needs HF cache/network, drifts across machines (prior audit: 3/10 top-10 drift CE-on). Spec requires network OFF. `RANKER_USE_CROSS_ENCODER=0` default; torch not in `requirements-ranker.txt`.

**Why these weights?**  
Ablation on **behavioral-independent proxy** and **synthetic rule-based labels** (`synthetic_proxy_labels.json`) — **not human labels** (`docs/evaluation_honesty_statement.md`).

**Honeypot / stuffer defense?**  
Structural rules in `challenge/honeypot.py` + title/skill/career scoring — **not** cross-encoder. Tests: `test_keyword_stuffer_far_from_top`, `test_impossible_tenure_demoted`.

**Hidden GT estimate ~0.60–0.68?**  
Honest guess with **zero correlation evidence** — offline proxies are diagnostics only, not validation against secret labels.

**Byte-identical on judge hardware?**  
Ordering is deterministic. Score **bytes** may differ across numpy/BLAS; `verify_submission_artifact.py` accepts identical top-100 ordering as secondary PASS.

**Title weight 0.24?**  
Founding Senior AI Engineer JD; title captures role evidence. Plain-language shippers score via `career_semantic` + bi-encoder. See `docs/judge_faq.md` Q1–2.

**Precompute vs runtime constraints?**  
Spec allows one-time off-the-clock embedding job. Ranking step itself: no network, CPU only. See `docs/precompute_policy.md`.

**What are you submitting vs the web app?**  
**Graded:** `rank.py` + `challenge/` → `submission.csv`. **Optional demo:** FastAPI/Next.js LangGraph UI — separate product surface, not the submission ranker.

## Live commands

```bash
./scripts/reproduce_ranking.sh
python scripts/verify_submission_artifact.py --artifact submission.csv
python scripts/mock_stage4_review.py submission.csv
```

Extended prep: `docs/stage5_interview_prep.md` · Evidence: `docs/judge_faq.md`