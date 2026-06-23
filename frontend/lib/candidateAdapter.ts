import type { Candidate as ApiCandidate } from "./types";
import type {
  Candidate as UiCandidate,
  PipelineStage,
  Recommendation,
  Trajectory,
} from "./mock";
import { resolveCandidateGender } from "./gender";
import { assignCandidateRole } from "./roleAssignment";

export type ChallengeRanking = {
  candidate_id: string;
  rank: number;
  score: number;
  reasoning: string;
};

const AVATAR_COLORS = [
  "#4F46E5",
  "#0E9F6E",
  "#C2780C",
  "#2563EB",
  "#7C3AED",
  "#D1453B",
  "#0891B2",
  "#57534E",
];

export function parseRedrobId(c: ApiCandidate): string | null {
  const email = c.email?.toLowerCase() ?? "";
  if (email.endsWith("@redrob.challenge")) {
    const local = email.split("@")[0];
    return local.toUpperCase().replace(/^cand_/, "CAND_");
  }
  const m = c.resume_text.match(/Redrob ID:\s*(\S+)/i);
  return m?.[1] ?? null;
}

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 0.88) return "Strong Hire";
  if (score >= 0.75) return "Hire";
  if (score >= 0.6) return "Lean Hire";
  return "Hold";
}

function scoreToStage(rank: number, score: number): PipelineStage {
  if (rank <= 10) return "Interview";
  if (rank <= 30) return "Screened";
  if (rank <= 60) return "Applied";
  if (score >= 0.8) return "Offer";
  return "Applied";
}

function githubScore(c: ApiCandidate): number {
  const gh = c.github_stats as Record<string, number> | null | undefined;
  if (gh?.redrob_github_activity_score != null) {
    return Math.round(Number(gh.redrob_github_activity_score));
  }
  if (gh?.contributions_last_year != null) {
    return Math.min(99, Math.round(Number(gh.contributions_last_year) / 4));
  }
  return 50;
}

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

function extractReasons(reasoning: string): string[] {
  if (!reasoning) return ["Ranked from offline challenge submission."];
  const parts = reasoning
    .split(/because|also|Concerns:/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return parts.slice(0, 3).map((s) => s.replace(/\.$/, ""));
}

export function apiCandidateToUi(
  c: ApiCandidate,
  ranking?: ChallengeRanking
): UiCandidate {
  const redrobId = parseRedrobId(c) ?? c.id;
  const company =
    c.experiences?.find((e) => e.is_current)?.company ??
    c.experiences?.[0]?.company ??
    "—";
  const matchScore = ranking
    ? Math.round(ranking.score * 100)
    : Math.min(95, 55 + (c.skills?.length ?? 0) * 3);
  const rank = ranking?.rank ?? 999;
  const score = ranking?.score ?? matchScore / 100;

  const skills =
    c.skills?.map((s) => s.name).filter(Boolean).slice(0, 8) ?? [];

  const trajectory: Trajectory =
    c.years_experience >= 8 ? "High" : c.years_experience >= 4 ? "Steady" : "Emerging";

  const gender = resolveCandidateGender(c.full_name, c.gender);

  return {
    id: redrobId,
    name: c.full_name,
    title: c.current_role ?? c.headline ?? "Candidate",
    company,
    location: c.location ?? "—",
    gender,
    avatarColor: avatarColor(redrobId),
    matchScore,
    skillsMatch: matchScore,
    experienceMatch: Math.min(99, 60 + c.years_experience * 4),
    githubMatch: githubScore(c),
    experienceYears: c.years_experience,
    githubScore: githubScore(c),
    skills,
    recommendation: scoreToRecommendation(score),
    trajectory,
    stage: scoreToStage(rank, score),
    job: assignCandidateRole(c, ranking),
    appliedDaysAgo: Math.max(1, 120 - rank),
    reasons: extractReasons(ranking?.reasoning ?? ""),
    concern: ranking?.reasoning.includes("Concerns:")
      ? ranking.reasoning.split("Concerns:")[1]?.split(".")[0]?.trim()
      : undefined,
  };
}

export function buildRankingMap(
  rankings: ChallengeRanking[]
): Map<string, ChallengeRanking> {
  return new Map(rankings.map((r) => [r.candidate_id, r]));
}

export function mapApiCandidates(
  rows: ApiCandidate[],
  rankings: ChallengeRanking[]
): UiCandidate[] {
  const map = buildRankingMap(rankings);
  return rows
    .map((c) => {
      const rid = parseRedrobId(c);
      return apiCandidateToUi(c, rid ? map.get(rid) : undefined);
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function mapSearchResults(
  results: Array<{
    candidate: ApiCandidate;
    similarity: number;
    matched_aspects: string[];
  }>,
  rankings: ChallengeRanking[]
): UiCandidate[] {
  const map = buildRankingMap(rankings);
  return results.map((r) => {
    const rid = parseRedrobId(r.candidate);
    const ranking = rid ? map.get(rid) : undefined;
    const ui = apiCandidateToUi(r.candidate, ranking);
    const simScore = Math.round(r.similarity * 100);
    return {
      ...ui,
      matchScore: ranking ? ui.matchScore : simScore,
      reasons: r.matched_aspects.length
        ? r.matched_aspects.map((a) => `Matched: ${a}`)
        : ui.reasons,
    };
  });
}