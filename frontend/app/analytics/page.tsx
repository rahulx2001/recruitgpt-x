"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Download, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Kpi } from "@/components/app/Atoms";
import { useWorkspaceAnalytics } from "@/lib/useWorkspaceAnalytics";
import { analyticsFallback } from "@/lib/analyticsFallback";

const AnalyticsCharts = dynamic(
  () =>
    import("@/components/app/AnalyticsCharts").then((m) => m.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="chart-card h-[320px] animate-pulse bg-subtle/40" />
        ))}
      </div>
    ),
  }
);

const PERIODS = ["7d", "30d", "90d", "YTD"] as const;

export default function AnalyticsPage() {
  const { data, isLoading, isError, isFetching, refetch, error } =
    useWorkspaceAnalytics();
  const [timedOut, setTimedOut] = React.useState(false);
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>("30d");

  React.useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  const usingFallback = isError || timedOut;
  const analytics = data ?? (usingFallback ? analyticsFallback : null);

  const subtitle = data
    ? `Challenge pool · ${data.candidate_count.toLocaleString()} candidates · derived from ranker scores`
    : usingFallback
    ? "Showing cached demo analytics — backend unreachable"
    : isLoading
    ? "Loading analytics from backend…"
    : "Analytics unavailable";

  const insightTiles = analytics
    ? [
        {
          label: "Pool size",
          value: analytics.candidate_count.toLocaleString(),
          hint: "challenge candidates",
        },
        {
          label: "Time to hire",
          value: `${analytics.time_to_hire.at(-1)?.days ?? "—"}d`,
          hint: "current estimate",
        },
        {
          label: "Top tier score",
          value: `${Math.max(...analytics.source_quality.map((s) => s.quality), 0)}%`,
          hint: "best rank bucket",
        },
        {
          label: "Acceptance",
          value: `${analytics.trends.at(-1)?.rate ?? "—"}%`,
          hint: "latest month",
        },
      ]
    : [];

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
        <div className="card p-4 mb-5 border-warning/30 bg-warning/5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-ink">
              Could not load live analytics
            </p>
            <p className="text-[13px] text-ink-muted mt-0.5">
              {(error as Error)?.message ??
                (timedOut
                  ? "Request timed out — showing demo data below."
                  : "Ensure the backend is running on http://localhost:8000.")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Retry
          </button>
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
        <p className="text-[12.5px] text-ink-muted">
          Viewing <span className="font-medium text-ink-secondary">{period}</span>{" "}
          · scores from offline ranker
        </p>
      </div>

      {insightTiles.length > 0 && (
        <div className="analytics-insight-row">
          {insightTiles.map((tile) => (
            <div key={tile.label} className="insight-tile">
              <div className="insight-tile__label">{tile.label}</div>
              <div className="insight-tile__value">{tile.value}</div>
              <div className="insight-tile__hint">{tile.hint}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {(analytics?.kpis ?? Array.from({ length: 4 }, () => null)).map(
          (kpi, i) =>
            kpi ? (
              <Kpi
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                sparkSeed={i + 2}
              />
            ) : (
              <div key={i} className="kpi animate-pulse">
                <div className="h-3 w-24 bg-subtle rounded mb-3" />
                <div className="h-7 w-16 bg-subtle rounded mb-2" />
                <div className="h-3 w-20 bg-subtle rounded" />
              </div>
            )
        )}
      </div>

      {analytics && (
        <AnalyticsCharts
          data={{
            time_to_hire: analytics.time_to_hire,
            conversion_funnel: analytics.conversion_funnel,
            source_quality: analytics.source_quality,
            trends: analytics.trends,
          }}
        />
      )}
    </AppShell>
  );
}