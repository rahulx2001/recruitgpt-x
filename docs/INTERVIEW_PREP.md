# RecruitGPT X — Interview Prep (private)

## Architecture (30-second pitch)
Bi-encoder retrieval (precomputed MiniLM embeddings) → hybrid JD-aligned scorer (trap/availability modifiers) → cross-encoder rerank on top-500 → calibrated top-100 with grounded reasoning.

## Cold questions

**Why bi-encoder + cross-encoder vs pure lexical?**
Lexical misses Tier-5 plain-language fits ("built a recommendation system at a product company"). Bi-encoder scales to 100K via precomputed cosine. Cross-encoder adds deep (JD, career) relevance on the decision boundary (top-500 → top-10).

**Offline ↔ online correlation?**
Track NDCG@10 on recruiter shortlist feedback; monitor saved_by_recruiters and interview_completion_rate lift for ranked cohort vs baseline keyword ATS.

**A/B test plan?**
50/50 traffic split on shortlist order; primary: recruiter contact rate + interview pass rate; guardrail: time-to-shortlist.

**Why these weights?**
Ablation on behavioral-independent proxy + hand labels on sample set; current blend balances title/IR depth, production narrative, availability (JD explicitly values open-to-work).

**Scale to 2M?**
Precompute embeddings once; serve ANN index (FAISS HNSW) for bi-encoder retrieval → same rerank pipeline on top-K.

**Honeypot failure modes?**
Subtle impossibilities (education vs YoE, overlapping tenure). Mitigated by structural rules + cross-encoder narrative mismatch on stuffers.

**Graceful degradation?**
Missing embeddings.npy or sentence-transformers → lexical semantic + stage-1 only. Reproduction never breaks.