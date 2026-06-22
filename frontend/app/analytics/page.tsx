"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
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
          <div key={i} className="card p-5 h-[260px] animate-pulse bg-subtle/50" />
        ))}
      </div>
    ),
  }
);

export default function AnalyticsPage() {
  const { data, isLoading, isError, isFetching, refetch, error } =
    useWorkspaceAnalytics();
  const [timedOut, setTimedOut] = React.useState(false);

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
    ? `Challenge pool · ${data.candidate_count} candidates · derived from ranker scores`
    : usingFallback
    ? "Showing cached demo analytics — backend unreachable"
    : isLoading
    ? "Loading analytics from backend…"
    : "Analytics unavailable";

  return (
    <AppShell
      title="Analytics"
      subtitle={subtitle}
      actions={
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {(analytics?.kpis ?? Array.from({ length: 4 }, () => null)).map(
          (kpi, i) =>
            kpi ? (
              <Kpi
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
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