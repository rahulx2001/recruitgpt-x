# 🎬 RecruitGPT X — 5-Minute Demo Script

> **Goal**: Wow judges with a live, end-to-end demo showing semantic ranking, explainability, and wow features.

---

## Setup Before Demo
- Frontend running at `localhost:3000`
- Backend running at `localhost:8000`
- Seeded with 12 demo candidates
- Open browser tab with Job page ready

---

## 🎤 NARRATION SCRIPT

### Act 1 — The Problem (30 sec)
> "Every recruiter knows the pain: you post a job, you get 500 resumes, and your ATS tells you the ones with the most keyword matches are best. But the best candidate — the one who grew 3x in 2 years, who shipped open-source projects, who's about to become a leader — they don't keyword-stuff. They get filtered out."
>
> "RecruitGPT X thinks like a hiring manager. It reads resumes like a person, reasons like a recruiter, and ranks like a talent partner."

### Act 2 — The Job Understanding (45 sec)
*[Open `localhost:3000/jobs/new`, paste in a Senior ML Engineer JD]*

> "Watch what happens when we drop in a job description."

*[Click "Analyze Job"]*

> "Our first agent — the **Job Understanding Agent** — reads the JD and produces a structured hiring blueprint: not just 'needs Python', but hidden expectations like 'startup experience', 'production ML systems', and 'fast-track to staff'."

*[Show blueprint panel]*

> "These hidden signals are what great recruiters pick up on — now our AI does too."

### Act 3 — The Candidate Intelligence (60 sec)
*[Auto-navigate to ranking view]*

> "Now here's where it gets interesting. Seven agents collaborate in a LangGraph pipeline:"

*[Show agent pipeline animation]*

> "Agent 2 reads every resume and profile — extracting skills, projects, achievements, leadership evidence.
> Agent 3 looks at GitHub activity and learning patterns.
> Agent 4 analyzes career trajectory — is this person accelerating or plateauing?
> Agent 5 does semantic matching using BGE embeddings — meaning match, not keyword match.
> Agent 6 combines all signals with weighted scoring.
> Agent 7 generates recruiter-friendly explanations."

*[Show ranking list appear]*

### Act 4 — The Explainability (45 sec)
*[Click on Rank #1 candidate]*

> "Why is this candidate ranked #1? Look — the system doesn't just give a score. It explains."

*[Show explanation panel]*

> "Strengths: 'Strong PyTorch and production ML experience. Career trajectory shows accelerating growth — Senior to Lead in 2.5 years. Active GitHub contributor with consistent learning pattern.'
> Weaknesses: 'Limited domain exposure in FinTech.'
> Interview focus: 'Assess adaptability to financial risk modeling domain.'"

> "This is exactly what a hiring manager needs. Not a score — a story."

### Act 5 — The Wow Features (90 sec)
*[Open AI Chat tab]*

> "Recruiters can ask questions in natural language."

*[Type: "Why is Rahul ranked above Amit?"]*

> "The system reasons over the rankings and gives a clear, contextual answer."

*[Open What-If playground]*

> "Here's where it gets fun. What if we drop the PyTorch requirement?"

*[Toggle off PyTorch]*

> "Watch the ranking shift live. This is what-if analysis — letting hiring managers explore trade-offs in real time."

*[Open Bias Report]*

> "And critically — we surface bias. If your shortlist is 90% from one college or one gender, we flag it. Fair AI hiring, built in."

*[Open Candidate Radar]*

> "And here's the candidate radar — a live visualization of where candidates cluster in skill space. The bullseye is the job. Outliers? They might be your hidden gems."

### Act 6 — The Future Potential (30 sec)
*[Click "Predict Potential" on Rank #3 candidate]*

> "And finally — future potential. Based on trajectory, learning velocity, and pattern analysis, we predict where this person will be in 2 years."

*[Show "Senior → Staff → Tech Lead" projection]*

> "We're not just hiring for today. We're hiring for tomorrow."

### Act 7 — Close (20 sec)
> "RecruitGPT X. The AI recruiter that thinks like a hiring manager.
> Semantic understanding. Behavioral intelligence. Career trajectory analysis. Explainable rankings. Bias detection. Future potential.
> Built on Next.js, FastAPI, LangGraph, Qdrant, and BGE embeddings.
> Thank you."

---

## 🎯 Demo Tips

| Tip | Why |
|---|---|
| **Use the seeded "Senior ML Engineer" job** | Already proven to give great rankings |
| **Have backup screenshots** | If live demo fails, switch to recorded |
| **Pre-compute one ranking** | So first load is instant |
| **Highlight the agent animation** | Visual proof of multi-agent architecture |
| **End on bias detection** | Strong ethics story closes well |

---

## ⏱️ Timing

| Act | Duration |
|---|---|
| 1. Problem | 0:30 |
| 2. Job Understanding | 0:45 |
| 3. Candidate Intelligence | 1:00 |
| 4. Explainability | 0:45 |
| 5. Wow Features | 1:30 |
| 6. Future Potential | 0:30 |
| 7. Close | 0:20 |
| **Total** | **5:00** |