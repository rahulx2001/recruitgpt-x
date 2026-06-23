import type { AnalyticsPeriod, WorkspaceAnalyticsPayload } from "./analyticsTypes";

const RANK_CUTOFF: Record<AnalyticsPeriod, number> = {
  "7d": 25,
  "30d": 50,
  "90d": 75,
  YTD: 100,
};

const TREND_MONTHS: Record<AnalyticsPeriod, number> = {
  "7d": 1,
  "30d": 2,
  "90d": 4,
  YTD: 6,
};

function histogramFromScores(scores: number[]): WorkspaceAnalyticsPayload["score_histogram"] {
  const bins = [
    { bin: "0–60", lo: 0, hi: 60 },
    { bin: "60–70", lo: 60, hi: 70 },
    { bin: "70–80", lo: 70, hi: 80 },
    { bin: "80–90", lo: 80, hi: 90 },
    { bin: "90–100", lo: 90, hi: 101 },
  ];
  return bins.map(({ bin, lo, hi }) => ({
    bin,
    count: scores.filter((s) => s >= lo && s < hi).length,
  }));
}

function recommendationMixFromScatter(
  scatter: WorkspaceAnalyticsPayload["rank_scatter"]
): WorkspaceAnalyticsPayload["recommendation_mix"] {
  const order = ["Strong Hire", "Hire", "Lean Hire", "Hold"];
  const counts = Object.fromEntries(order.map((t) => [t, 0])) as Record<string, number>;
  for (const p of scatter) {
    counts[p.recommendation] = (counts[p.recommendation] ?? 0) + 1;
  }
  const n = scatter.length || 1;
  return order
    .filter((t) => counts[t] > 0)
    .map((t) => ({
      tier: t,
      count: counts[t],
      pct: Math.round((100 * counts[t]) / n * 10) / 10,
    }));
}

/** Slice ranker-derived analytics by period (rank depth + trend window). */
export function filterAnalyticsByPeriod(
  data: WorkspaceAnalyticsPayload,
  period: AnalyticsPeriod
): WorkspaceAnalyticsPayload {
  const rankMax = RANK_CUTOFF[period];
  const scatter = data.rank_scatter.filter((p) => p.rank <= rankMax);
  const scores = scatter.map((p) => p.score);
  const mean = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  const p90 = sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]!
    : 0;

  const strongHire = scatter.filter((p) => p.recommendation === "Strong Hire").length;
  const trendMonths = TREND_MONTHS[period];

  const executive_kpis = data.executive_kpis.map((kpi) => {
    if (kpi.label === "Strong hire pool") {
      return {
        ...kpi,
        value: String(strongHire),
        delta: `${scatter.length ? Math.round((100 * strongHire) / scatter.length) : 0}% in ${period} window`,
      };
    }
    if (kpi.label === "Avg match score") {
      return {
        ...kpi,
        value: String(mean),
        delta: `median ${median} · top ${rankMax} ranks`,
      };
    }
    return kpi;
  });

  const rank_buckets = data.rank_buckets.filter((b) => {
    if (rankMax <= 10) return b.bucket === "Top 10";
    if (rankMax <= 30) return b.bucket === "Top 10" || b.bucket === "Rank 11–30";
    if (rankMax <= 60)
      return b.bucket !== "Rank 61–100";
    return true;
  });

  return {
    ...data,
    executive_kpis,
    rank_scatter: scatter,
    top_candidates: data.top_candidates.filter((c) => c.rank <= rankMax),
    score_histogram: histogramFromScores(scores),
    recommendation_mix: recommendationMixFromScatter(scatter),
    rank_buckets,
    trends: data.trends.slice(-trendMonths),
    time_to_hire: data.time_to_hire.slice(-trendMonths),
    score_stats: {
      mean,
      median,
      p90,
      std_dev: data.score_stats.std_dev,
    },
  };
}