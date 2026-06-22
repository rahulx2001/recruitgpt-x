# RecruitGPT X — Frontend

Next.js 14 (App Router) + Tailwind + shadcn-style UI.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack
- **Next.js 14** — App Router, RSC
- **TypeScript** — type safety
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **Recharts** — charts (radar, bar)
- **TanStack Query** — server state
- **Zustand** — global state
- **Lucide React** — icons

## Structure

```
app/                  # Routes
├── page.tsx          # Landing
├── dashboard/        # Dashboard
├── jobs/             # Job creation & ranking
├── candidates/       # Candidate browse
├── chat/             # AI recruiter chat
└── whatif/           # What-if playground

components/
├── ui/               # Primitives
├── RankedList.tsx
├── CandidateCard.tsx
├── ExplainabilityPanel.tsx
├── SkillRadar.tsx
├── CandidateRadar.tsx
├── ChatInterface.tsx
└── ...

lib/
├── api.ts            # API client
└── types.ts          # Shared types
```