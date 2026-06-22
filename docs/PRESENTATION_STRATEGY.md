# RecruitGPT X — Winning Presentation Strategy

> Judge Q&A prep, narrative arc, and objection handling for the 5-minute demo.

---

## 1. Opening Hook (15 seconds)

**Say:** "Your ATS rejects the best candidate every week — not because they're unqualified, but because keyword matchers can't read growth, potential, or meaning."

**Show:** Landing page → Dashboard with ranked shortlist.

---

## 2. Core Narrative (3 minutes)

| Beat | Screen | Talking Point |
|------|--------|---------------|
| Parse JD | Jobs → New | "Agent 1 reads the JD like a recruiter — hidden requirements, seniority, domain." |
| Pipeline | Job detail → Rank | "Seven agents run in parallel — semantic, behavioral, trajectory, explainability." |
| Explain | Ranked list | "Every score has a narrative — not a black box." |
| Wow | Chat / What-if / Bias | "Ask why someone ranked #3. Remove a skill and re-rank. Audit demographic skew." |

---

## 3. Judge Q&A — Prepared Answers

### "Is this authenticated? Is data isolated?"

**Answer:** Yes. Every API route scopes data by `owner_id`. Dev mode uses `X-User-Id`; production uses Clerk JWT verification. Cross-tenant access returns 404. Rate limits protect LLM endpoints.

### "You claim multi-signal — is GitHub/LinkedIn live?"

**Answer:** Yes — at pipeline runtime. GitHub stats are fetched from `api.github.com` when `github_url` is set. LinkedIn enrichment pulls public Open Graph metadata when reachable, with seed-aware heuristics as fallback (no authenticated scraping — LinkedIn ToS). Both feed Agent 2 and Agent 3 before scoring.

### "What if the LLM is down?"

**Answer:** Three layers: (1) NVIDIA NIM live, (2) provider fallback chain, (3) deterministic heuristic mock that personalizes explanations per candidate name and scores — demo never shows identical text.

### "How do you handle bias?"

**Answer:** Bias report aggregates gender, ethnicity, school, location on the shortlist with concentration flags. We never infer ethnicity from location. Fairness score surfaces skew before humans review.

### "Can this scale?"

**Answer:** LangGraph parallelizes per-candidate work. Ranking is cached per job. Vector search is Qdrant with UUID point IDs. Stateless FastAPI scales horizontally; Postgres + Qdrant are managed services on Railway.

### "Ranking weights don't match your slide"

**Answer:** We added semantic fit (20%) as a first-class signal — the hackathon brief predates embedding-first matching. Weights sum to 1.0 and are documented in `ranking.py` and ARCHITECTURE.md.

---

## 4. Differentiation Sound Bites

- "ATS counts keywords. We model **meaning, growth, and potential**."
- "Not one LLM call — **seven specialized agents** with observable state."
- "Recruiters get **evidence**, not scores — interview focus areas included."
- "What-if analysis lets hiring managers **change requirements live**."

---

## 5. Risks to Acknowledge Proactively

| Risk | Honest framing |
|------|----------------|
| PDF parsing | Basic pdfminer extraction; production would add OCR |
| Skill evolution | Heuristic from experience timeline today; `skill_history` table in roadmap |
| Radar viz | Interactive similarity graph with hover clusters — not full force-directed D3 |
| Wireframes | ASCII wireframes in `WIREFRAMES.md`; Figma is post-hackathon |

---

## 6. Close (30 seconds)

**Say:** "RecruitGPT X answers the question hiring managers actually ask: *Who should we hire, and why?* — with reasoning, evidence, and fairness built in."

**CTA:** "Happy to run a live what-if or bias audit on any candidate you name."