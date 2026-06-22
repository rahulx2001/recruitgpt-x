import {
  candidateQuality,
  conversionFunnel,
  offerAcceptance,
  sourceQuality,
  timeToHire,
} from "./mock";

/** Offline fallback when the analytics API is unreachable. */
export const analyticsFallback = {
  pool_label: "challenge_top_100",
  candidate_count: 100,
  kpis: [
    { label: "Avg. time to hire", value: "26 days", delta: "15d faster" },
    { label: "Offer acceptance", value: "73%", delta: "trending up" },
    { label: "Candidates in pool", value: "100", delta: "100% ranker coverage" },
    { label: "Candidate quality", value: "84", delta: "+13 pts since Jan" },
  ],
  time_to_hire: timeToHire,
  conversion_funnel: conversionFunnel.map((row, i) => ({
    ...row,
    color: ["#5d2a1a", "#6b3826", "#7d4832", "#915640", "#a6654e"][i],
  })),
  source_quality: sourceQuality,
  trends: offerAcceptance.map((row, i) => ({
    month: row.month,
    rate: row.rate,
    score: candidateQuality[i]?.score ?? 80,
  })),
};