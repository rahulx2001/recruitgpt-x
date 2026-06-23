"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { AiSummary } from "@/lib/analyticsTypes";

export function AiInsightsCard({
  summary,
}: {
  summary: AiSummary | null | undefined;
}) {
  if (!summary) return null;

  return (
    <div className="ai-insights-card">
      <div className="ai-insights-card__head">
        <div className="ai-insights-card__badge">
          <Sparkles size={14} />
          RecruitGPT Insights
        </div>
        <Link href="/ai" className="text-action text-[12px]">
          Ask follow-up →
        </Link>
      </div>
      <h3 className="ai-insights-card__headline">{summary.headline}</h3>
      <div className="ai-insights-card__body">
        <p>{summary.bottleneck}</p>
        <p>
          <span className="ai-insights-card__label">Top risk:</span> {summary.risk}
        </p>
        <p>
          <span className="ai-insights-card__label">Recommendation:</span>{" "}
          {summary.recommendation}
        </p>
      </div>
    </div>
  );
}