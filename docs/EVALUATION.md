# RecruitGPT X — Evaluation Metrics

How we measure whether the system ranks better than keyword ATS tools.

---

## 1. Ranking quality

| Metric | Definition | Target |
|--------|------------|--------|
| **NDCG@10** | Normalized discounted cumulative gain on top-10 vs expert labels | > 0.75 |
| **MRR** | Mean reciprocal rank of first relevant candidate | > 0.80 |
| **Skill coverage** | % of JD hard skills matched by top-3 candidates | > 85% |
| **Semantic lift** | NDCG with semantic agent ON vs keyword-only baseline | +15% |

### Baseline comparison
- **Keyword ATS**: set overlap on `hard_skills` + years experience filter
- **RecruitGPT X**: full 7-agent pipeline with 20% semantic weight

---

## 2. Explainability

| Metric | Definition | Target |
|--------|------------|--------|
| **Explanation completeness** | % of ranked candidates with strengths + weaknesses + interview focus | 100% |
| **Recruiter usefulness** | 1–5 rating from pilot users on explanation clarity | > 4.0 |
| **Groundedness** | % of explanation claims supported by sub-scores | > 90% |

---

## 3. Behavioral & trajectory signals

| Metric | Definition |
|--------|------------|
| **Growth correlation** | Spearman ρ between `career_growth` and promotion velocity in seed labels |
| **Behavioral lift** | Rank change when GitHub stats removed vs full pipeline |
| **Potential accuracy** | % of `predicted_level_2y` within one level of heuristic label |

---

## 4. Fairness & bias

| Metric | Definition | Target |
|--------|------------|--------|
| **Demographic parity** | Max group share in top-10 shortlist | < 70% per dimension |
| **Flag precision** | % of bias flags confirmed on manual review | > 80% |
| **Fairness score** | `1 - max_concentration` across gender/ethnicity/school/location | > 0.6 |

Dimensions tracked: gender, ethnicity, school, location.

---

## 5. Performance & UX

| Metric | Target |
|--------|--------|
| Cached rank latency (`/rank` cache hit) | < 200ms |
| Full pipeline (12 candidates, mock LLM) | < 5s |
| Chat response (cached ranking) | < 2s |
| Vector search (`/search`) | < 500ms |

---

## 6. Demo acceptance checklist

- [ ] Priya Sharma in top-5 for ML Engineer JD
- [ ] "Why is Rahul ranked above Amit?" returns name-specific comparison
- [ ] What-If removing PyTorch shifts rankings visibly
- [ ] Search "SQL strong, Power BI weak" returns filtered results
- [ ] Bias audit shows gender + ethnicity + school + location
- [ ] `/ready` reports `candidates_indexed > 0`

---

## 7. Hackathon judging alignment

| Criterion | Evidence |
|-----------|----------|
| Innovation | 7-agent LangGraph, semantic + behavioral + trajectory |
| Technical depth | FastAPI, Qdrant, BGE, MiniMax M3, explainable scores |
| Business impact | Faster shortlisting, bias detection, recruiter chat |
| Demo quality | Dashboard, radar, what-if, live pipeline animation |
| Scalability | Postgres + Qdrant production path, ranking cache |