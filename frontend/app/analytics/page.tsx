"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { RecruitingHealthSummary } from "@/components/app/RecruitingHealthSummary";
import { InsightsPanel } from "@/components/app/InsightsPanel";
import { AiInsightsCard } from "@/components/app/AiInsightsCard";
import { useWorkspaceAnalytics } from "@/lib/useWorkspaceAnalytics";
import { resolveRecruitingHealth } from "@/lib/dashboardUtils";
import { analyticsFallback } from "@/lib/analyticsFallback";
import { filterAnalyticsByPeriod } from "@/lib/analyticsPeriod";
import type { AnalyticsPeriod } from "@/lib/analyticsTypes";

const AnalyticsCharts = dynamic(
  () =>
    import("@/components/app/AnalyticsCharts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="chart-card h-[280px] animate-pulse bg-subtle/30" />
        ))}
      </div>
    ),
  }
);

const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "YTD"];

const PERIOD_HINT: Record<AnalyticsPeriod, string> = {
  "7d": "Top 25 ranks · 1 month trend",
  "30d": "Top 50 ranks · 2 month trend",
  "90d": "Top 75 ranks · 4 month trend",
  YTD: "Full pool · 6 month trend",
};

export default function AnalyticsPage() {
  const { data, isLoading, isError, isFetching, refetch, error } =
    useWorkspaceAnalytics();
  const [timedOut, setTimedOut] = React.useState(false);
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("30d");

  React.useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  const usingFallback = isError || timedOut;
  const raw = data ?? (usingFallback ? analyticsFallback : null);
  const analytics = React.useMemo(
    () => (raw ? filterAnalyticsByPeriod(raw, period) : null),
    [raw, period]
  );
  const recruitingHealth = React.useMemo(
    () => resolveRecruitingHealth(analytics),
    [analytics]
  );

  const subtitle = data
    ? `${data.candidate_count.toLocaleString()} candidates · ranker intelligence + pipeline health`
    : usingFallback
    ? "Cached demo data — backend unreachable"
    : isLoading
    ? "Loading analytics…"
    : "Analytics unavailable";

  return (
    <AppShell
      title="Analytics"
      subtitle={subtitle}
      actions={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => window.alert("Export scheduled (demo)")}
          >
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </>
      }
    >
      {usingFallback && !data && (
        <div className="panel mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="panel__body py-3">
            <p className="text-[13px] font-medium text-ink">
              Could not load live analytics
            </p>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              {(error as Error)?.message ??
                (timedOut
                  ? "Request timed out — showing demo data below."
                  : "Ensure the backend is running on http://localhost:8000.")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm mr-4"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Retry
          </button>
        </div>
      )}

      {recruitingHealth && (
        <div className="mb-4">
          <RecruitingHealthSummary health={recruitingHealth} />
        </div>
      )}

      <div className="analytics-toolbar">
        <div className="seg" role="tablist" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={`seg-btn ${period === p ? "is-active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-faint">
          Window:{" "}
          <span className="text-ink-secondary font-medium">{PERIOD_HINT[period]}</span>
        </p>
      </div>

      {analytics && analytics.executive_kpis.length > 0 && (
        <div className="analytics-hero analytics-hero--6">
          {analytics.executive_kpis.map((kpi) => {
            const inner = (
              <>
                <div className="analytics-hero__label">{kpi.label}</div>
                <div className="analytics-hero__value">{kpi.value}</div>
                <div
                  className={`analytics-hero__hint ${
                    kpi.delta_positive === false ? "is-negative" : ""
                  }`}
                >
                  {kpi.delta_positive === false ? "↓" : "↑"} {kpi.delta}
                </div>
                {kpi.hint ? (
                  <div className="analytics-hero__meta">{kpi.hint}</div>
                ) : null}
              </>
            );
            return kpi.href ? (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="analytics-hero__item analytics-hero__item--link"
                title={kpi.definition}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={kpi.label}
                className="analytics-hero__item"
                title={kpi.definition}
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {analytics && (
        <div className="analytics-priority-row space-y-3.5 mt-3.5">
          <InsightsPanel insights={analytics.insights} />
          <AiInsightsCard summary={analytics.ai_summary} />
        </div>
      )}

      {analytics && <AnalyticsCharts data={analytics} />}
    </AppShell>
  );
}