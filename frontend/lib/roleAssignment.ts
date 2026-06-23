import type { Candidate as ApiCandidate } from "./types";
import type { ChallengeRanking } from "./candidateAdapter";
import { parseRedrobId } from "./candidateAdapter";

export const ROLE_CATALOG = [
  {
    slug: "senior-ml-engineer",
    title: "Senior ML Engineer",
    department: "Engineering",
    location: "Pune / Remote",
    keywords: [
      "machine learning",
      "ml engineer",
      "recommendation",
      "ranking",
      "retrieval",
      "pytorch",
      "tensorflow",
      "embedding",
      "recsys",
      "nlp",
      "computer vision",
    ],
  },
  {
    slug: "data-scientist",
    title: "Data Scientist",
    department: "Data",
    location: "Remote (India)",
    keywords: [
      "data scientist",
      "statistician",
      "experimentation",
      "causal",
      "analytics",
      "ab test",
      "forecasting",
    ],
  },
  {
    slug: "backend-engineer",
    title: "Backend Engineer",
    department: "Engineering",
    location: "Pune / Hybrid",
    keywords: [
      "backend",
      "golang",
      "java",
      "node.js",
      "microservice",
      "kafka",
      "postgresql",
      "distributed systems",
      "api engineer",
    ],
  },
  {
    slug: "product-analyst",
    title: "Product Analyst",
    department: "Data",
    location: "Bengaluru",
    keywords: [
      "product analyst",
      "product analytics",
      "growth analyst",
      "funnel",
      "amplitude",
      "mixpanel",
      "sql analyst",
    ],
  },
  {
    slug: "business-analyst",
    title: "Business Analyst",
    department: "Operations",
    location: "Noida",
    keywords: [
      "business analyst",
      "operations analyst",
      "stakeholder",
      "requirements",
      "process mapping",
      "excel",
    ],
  },
] as const;

function profileText(c: ApiCandidate, ranking?: ChallengeRanking): string {
  const skills = (c.skills ?? []).map((s) => s.name).join(" ");
  return [
    c.current_role ?? "",
    c.headline ?? "",
    skills,
    ranking?.reasoning ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function assignCandidateRole(
  c: ApiCandidate,
  ranking?: ChallengeRanking
): string {
  const text = profileText(c, ranking);
  let bestTitle: string = ROLE_CATALOG[0].title;
  let bestScore = 0;

  for (const role of ROLE_CATALOG) {
    const score = role.keywords.reduce(
      (n, kw) => n + (text.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestTitle = role.title;
    }
  }

  if (bestScore === 0) {
    const rid = parseRedrobId(c) ?? c.id;
    const idx =
      [...rid].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
      ROLE_CATALOG.length;
    bestTitle = ROLE_CATALOG[idx]!.title;
  }

  return bestTitle;
}