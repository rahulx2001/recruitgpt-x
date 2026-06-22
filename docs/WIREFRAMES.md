# RecruitGPT X — UI Wireframes (ASCII)

> Expected deliverable #7 — screen layouts for judges and docs.

---

## Landing (`/`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] RecruitGPT X          Dashboard  Jobs  Candidates   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     The AI Recruiter That Thinks Like a Hiring Manager      │
│     [ Parse a JD ]  [ View Demo Job ]                       │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ 7 Agents│ │ Semantic│ │ Explain │ │  Bias   │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│ KPI: Jobs │ Candidates │ Avg Fit │ Pipeline Status           │
├──────────────────────────┬──────────────────────────────────┤
│ Job Selector             │ Top Ranked (preview)              │
│ [ Senior ML Engineer ▼ ] │ 1. Priya — 88%                    │
│                          │ 2. Rahul — 82%                    │
│ [ Run Ranking ]          │ 3. ...                            │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Job Detail (`/jobs/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│ Senior ML Engineer                    [ Re-rank ] [ What-if ] │
├─────────────────────────────────────────────────────────────┤
│ [ Overview ] [ Rankings ] [ Chat ] [ Bias ] [ Radar ]       │
├─────────────────────────────────────────────────────────────┤
│ Agent Pipeline ████████░░ 7/7                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #1 Priya Sharma    88%  ████████████░░                  │ │
│ │ Strengths · Weaknesses · Interview focus                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Candidate Radar (`/radar`)

```
┌─────────────────────────────────────────────────────────────┐
│                    ● JOB (center)                           │
│           skill labels on ring                              │
│      ○───○  similarity edges (clusters)                   │
│    ○       ○  candidates sized by hireability               │
│      ○───○  hover = tooltip, click = select               │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Chat (`/jobs/[id]` tab)

```
┌─────────────────────────────────────────────────────────────┐
│ Recruiter: Why is Priya ranked above Rahul?                 │
│ AI: Priya leads on semantic fit (87% vs 61%) and ...        │
│ [ Type message...                              ] [ Send ]   │
└─────────────────────────────────────────────────────────────┘
```

---

## What-If (`/whatif`)

```
┌─────────────────────────────────────────────────────────────┐
│ Remove skill: [ Power BI ✕ ]  Add: [ Rust + ]               │
│ Seniority override: [ Staff ▼ ]                             │
│ [ Re-rank ] → side-by-side rank delta                       │
└─────────────────────────────────────────────────────────────┘
```