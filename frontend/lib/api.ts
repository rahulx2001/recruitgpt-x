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

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
    body,
    cache: "no-store",
  });
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
};

export { API_BASE };