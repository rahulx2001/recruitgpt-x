export type AnalyticsPeriod = "7d" | "30d" | "90d" | "YTD";

export type ExecutiveKpi = {
  label: string;
  value: string;
  delta: string;
  hint?: string;
  href?: string;
  definition?: string;
  delta_positive?: boolean;
};

export type HealthAlert = {
  kind: "warn" | "ok";
  message: string;
  href?: string;
};

export type RecruitingHealth = {
  title: string;
  alerts: HealthAlert[];
  cta_label: string;
  cta_href: string;
};

export type AiSummary = {
  headline: string;
  bottleneck: string;
  risk: string;
  recommendation: string;
};

export type WorkspaceAnalyticsPayload = {
  pool_label: string;
  candidate_count: number;
  kpis: Array<{ label: string; value: string; delta: string }>;
  time_to_hire: Array<{ month: string; days: number }>;
  conversion_funnel: Array<{ stage: string; count: number; color: string }>;
  source_quality: Array<{ source: string; quality: number; hires: number }>;
  trends: Array<{ month: string; rate: number; score: number }>;
  executive_kpis: ExecutiveKpi[];
  score_histogram: Array<{ bin: string; count: number }>;
  recommendation_mix: Array<{ tier: string; count: number; pct: number }>;
  stage_conversion: Array<{ from_stage: string; to_stage: string; rate: number }>;
  rank_buckets: Array<{
    bucket: string;
    avg_score: number;
    count: number;
    strong_hire_pct: number;
    hires: number;
  }>;
  signal_coverage: Array<{
    signal: string;
    top10_pct: number;
    pool_pct: number;
    lift: number;
  }>;
  insights: Array<{ severity: string; message: string; href: string }>;
  jobs_pipeline: Array<{
    job_id: string;
    title: string;
    applied: number;
    screened: number;
    interview: number;
    offer: number;
    strong_hires: number;
    days_open: number;
  }>;
  rank_scatter: Array<{
    rank: number;
    score: number;
    candidate_id: string;
    name: string;
    recommendation: string;
  }>;
  stage_velocity: Array<{ stage: string; median_days: number }>;
  top_candidates: Array<{
    candidate_id: string;
    name: string;
    rank: number;
    score: number;
    stage: string;
    top_signal: string;
    concern: string;
  }>;
  interviews_summary: {
    scheduled: number;
    awaiting_feedback: number;
    completed: number;
    pass_rate: number;
  } | null;
  sync: {
    ok: boolean;
    db_candidates: number;
    submission_rows: number;
    matched_rankings: number;
    message: string;
  } | null;
  score_stats: {
    median?: number;
    p90?: number;
    std_dev?: number;
    mean?: number;
  };
  recruiting_health?: RecruitingHealth | null;
  ai_summary?: AiSummary | null;
};