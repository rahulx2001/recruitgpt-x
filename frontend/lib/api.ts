import type {
  BiasReport,
  Candidate,
  ChatMessage,
  ChatResponse,
  HiringBlueprint,
  Job,
  PotentialPrediction,
  RankedCandidate,
  RankingResult,
  SearchResult,
  WhatIfRequest,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEV_USER_ID =
  process.env.NEXT_PUBLIC_DEV_USER_ID || "dev-user";

const REQUEST_TIMEOUT_MS =
  typeof window !== "undefined" &&
  !API_BASE.includes("localhost") &&
  !API_BASE.includes("127.0.0.1")
    ? 90_000
    : 15_000;

type TokenGetter = () => Promise<string | null>;

let authTokenGetter: TokenGetter | null = null;

/** Register Clerk (or other) token provider — called from Providers on mount. */
export function setAuthTokenGetter(getter: TokenGetter | null) {
  authTokenGetter = getter;
}

async function buildAuthHeaders(
  base: Record<string, string>,
): Promise<Record<string, string>> {
  const headers = { ...base };

  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        return headers;
      }
    } catch {
      // fall through to dev user header
    }
  }

  headers["X-User-Id"] = DEV_USER_ID;
  return headers;
}

async function http<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    baseHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  } else if (init?.body) {
    body = init.body;
  }

  const headers = await buildAuthHeaders(baseHeaders);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `Request timed out — is the backend running at ${API_BASE}?`
      );
    }
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Start it with: uvicorn app.main:app --host 127.0.0.1 --port 8000`
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as {
        detail?: string | Array<{ msg?: string; loc?: string[] }>;
      };
      if (typeof parsed.detail === "string") {
        message = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        message = parsed.detail
          .map((d) => {
            const field = d.loc?.slice(-1)[0];
            return field ? `${field}: ${d.msg ?? "invalid"}` : d.msg;
          })
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      // keep raw text
    }
    throw new Error(message || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Jobs
  parseJD: (title: string, description: string) =>
    http<HiringBlueprint>("/api/jobs/parse", {
      method: "POST",
      json: { title, description },
    }),
  createJob: (payload: {
    title: string;
    description: string;
    blueprint?: HiringBlueprint;
  }) => http<Job>("/api/jobs", { method: "POST", json: payload }),
  deleteJob: (id: string) =>
    http<{ ok: boolean; job_id: string }>(`/api/jobs/${id}`, {
      method: "DELETE",
    }),
  listJobs: () => http<Job[]>("/api/jobs"),
  getJob: (id: string) => http<Job>(`/api/jobs/${id}`),
  rankJob: (id: string, refresh = false) =>
    http<RankingResult>(`/api/jobs/${id}/rank?refresh=${refresh}`),
  whatIf: (id: string, payload: Omit<WhatIfRequest, "job_id">) =>
    http<RankingResult>(`/api/jobs/${id}/whatif`, {
      method: "POST",
      json: { job_id: id, ...payload },
    }),
  biasReport: (id: string) => http<BiasReport>(`/api/jobs/${id}/bias`),
  chat: (
    id: string,
    message: string,
    history: ChatMessage[] = []
  ): Promise<ChatResponse> =>
    http<ChatResponse>(`/api/jobs/${id}/chat`, {
      method: "POST",
      json: { job_id: id, message, history },
    }),

  // Candidates
  listCandidates: () => http<Candidate[]>("/api/candidates"),
  getCandidate: (id: string) => http<Candidate>(`/api/candidates/${id}`),
  predictPotential: (id: string) =>
    http<PotentialPrediction>(`/api/candidates/${id}/potential`),

  // Search
  search: (query: string, top_k = 10) =>
    http<SearchResult[]>("/api/search", {
      method: "POST",
      json: { query, top_k },
    }),

  // Workspace (dashboard counts + challenge rankings)
  workspaceMe: () =>
    http<import("./analyticsTypes").WorkspaceUserProfile>("/api/workspace/me"),
  workspaceStats: () =>
    http<{
      candidates: number;
      jobs: number;
      interviews: number;
      scorecards_pending: number;
      pool_label: string;
      funnel: Array<{ stage: string; count: number; color: string }>;
      synced: boolean;
      ranked_count: number;
    }>("/api/workspace/stats"),
  workspaceSync: () =>
    http<{
      ok: boolean;
      db_candidates: number;
      submission_rows: number;
      matched_rankings: number;
      missing_in_db: string[];
      missing_in_submission: string[];
      message: string;
    }>("/api/workspace/sync"),
  workspaceActivity: () =>
    http<
      Array<{
        id: string;
        actor: string;
        actor_color: string;
        action: string;
        target: string;
        context: string;
        time: string;
        href: string;
      }>
    >("/api/workspace/activity"),
  workspaceShortlists: () =>
    http<
      Array<{
        id: string;
        job_id: string;
        name: string;
        job: string;
        owner: string;
        owner_color: string;
        department: string;
        location: string;
        status: string;
        strong_hire_count: number;
        interview_count: number;
        members: Array<{
          candidate_id: string;
          name: string;
          avatar_color: string;
          match_score: number;
          title: string;
          stage: string;
          recommendation: string;
        }>;
      }>
    >("/api/workspace/shortlists"),
  workspaceSearchMeta: () =>
    http<{
      suggested: string[];
      recent: string[];
      saved: Array<{ name: string; query: string; count: number; owner: string }>;
    }>("/api/workspace/search-meta"),
  workspaceJobsOverview: () =>
    http<
      Array<{
        id: string;
        title: string;
        candidate_count: number;
        stages: { applied: number; screened: number; interview: number; offer: number };
        status: string;
        created_at: string;
        days_open: number;
      }>
    >("/api/workspace/jobs-overview"),
  workspaceInsight: () =>
    http<{
      screened_count: number;
      candidate_names: string;
      job_title: string;
    }>("/api/workspace/insight"),
  workspaceInterviews: () =>
    http<
      Array<{
        id: string;
        candidate_id: string;
        candidate: string;
        candidate_color: string;
        role: string;
        round: string;
        interviewer: string;
        when: string;
        status: "Scheduled" | "Awaiting feedback" | "Completed";
        recommendation: string;
        rank?: number;
        match_score?: number;
        pipeline_stage?: string;
        concern?: string;
        starts_in_minutes?: number | null;
        meeting_url?: string;
        scorecard_status?: string;
      }>
    >("/api/workspace/interviews"),
  workspaceAnalytics: () =>
    http<import("./analyticsTypes").WorkspaceAnalyticsPayload>(
      "/api/workspace/analytics"
    ),
  challengeRankings: () =>
    http<
      Array<{
        candidate_id: string;
        rank: number;
        score: number;
        reasoning: string;
      }>
    >("/api/workspace/challenge-rankings"),

  // Google Calendar (Workspace)
  calendarStatus: () =>
    http<{
      configured: boolean;
      connected: boolean;
      provider: string;
      account_email?: string | null;
      message: string;
    }>("/api/calendar/status"),
  calendarOAuthUrl: () =>
    http<{ url: string | null; demo: boolean; message?: string }>(
      "/api/calendar/oauth/url"
    ),
  calendarFreeBusy: (interviewer: string, date: string) =>
    http<{
      date: string;
      interviewer: string;
      blocks: Array<{ start: string; end: string; label: string; source: string }>;
      synced: boolean;
    }>(
      `/api/calendar/freebusy?interviewer=${encodeURIComponent(interviewer)}&date=${date}`
    ),
};

export { API_BASE };