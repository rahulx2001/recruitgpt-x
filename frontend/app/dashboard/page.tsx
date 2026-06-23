"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Sparkles,
  ChevronRight,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, KpiLink, SectionHeader } from "@/components/app/Atoms";
import {
  DashboardLoadingShell,
  KpiGridSkeleton,
} from "@/components/app/LoadingStates";
import { RecruitingHealthSummary } from "@/components/app/RecruitingHealthSummary";
import { AiInsightsCard } from "@/components/app/AiInsightsCard";
import { AttentionQueue } from "@/components/app/AttentionQueue";
import { TopCandidatesTable } from "@/components/app/TopCandidatesTable";
import { PipelineSnapshot } from "@/components/app/PipelineSnapshot";
import { TodaySchedule } from "@/components/app/TodaySchedule";
import { JobPipelineRow } from "@/components/app/JobPipelineRow";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";
import { useWorkspaceInterviews } from "@/lib/useWorkspaceInterviews";
import { useWorkspaceAnalytics } from "@/lib/useWorkspaceAnalytics";
import {
  useWorkspaceActivity,
  useWorkspaceJobsOverview,
  useWorkspaceMe,
} from "@/lib/useWorkspaceBundle";
import {
  dashboardGreeting,
  dashboardDateLabel,
  dashboardUserFirstName,
  syncPillLabel,
  filterDashboardActivity,
  resolveRecruitingHealth,
} from "@/lib/dashboardUtils";

export default function DashboardPage() {
  const { data: me } = useWorkspaceMe();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useWorkspaceStats();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useWorkspaceAnalytics();
  const { data: interviews = [] } = useWorkspaceInterviews();
  const { data: activity = [] } = useWorkspaceActivity();
  const { data: jobs = [] } = useWorkspaceJobsOverview();

  const funnel = stats?.funnel ?? analytics?.conversion_funnel ?? [];
  const hiredCount = funnel.find((s) => s.stage === "Hired")?.count ?? 0;
  const appliedCount = funnel.find((s) => s.stage === "Applied")?.count ?? 0;
  const funnelRate =
    appliedCount > 0
      ? `${((hiredCount / appliedCount) * 100).toFixed(1)}%`
      : "—";

  const topCandidates = React.useMemo(
    () => (analytics?.top_candidates ?? []).slice(0, 8),
    [analytics]
  );

  const attentionItems = analytics?.attention_queue ?? [];

  const todayInterviews = interviews.filter((i) => i.when.startsWith("Today"));
  const awaitingFeedback = interviews.filter(
    (i) => i.status === "Awaiting feedback"
  );
  const filteredActivity = filterDashboardActivity(activity);

  const recruitingHealth = resolveRecruitingHealth(analytics);
  const sync = analytics?.sync;
  const matched = sync?.matched_rankings ?? stats?.ranked_count ?? 0;
  const total = sync?.db_candidates ?? stats?.candidates ?? 0;
  const syncLabel = syncPillLabel(
    stats?.synced ?? sync?.ok ?? false,
    matched,
    total
  );

  const sortedJobs = [...jobs].sort(
    (a, b) => b.stages.interview - a.stages.interview || b.days_open - a.days_open
  );

  const jobsPipelineMap = new Map(
    (analytics?.jobs_pipeline ?? []).map((j) => [j.job_id, j])
  );

  const [loadTimedOut, setLoadTimedOut] = React.useState(false);
  const stillLoading =
    (statsLoading || analyticsLoading) && !stats && !analytics;

  React.useEffect(() => {
    if (!stillLoading) {
      setLoadTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setLoadTimedOut(true), 12_000);
    return () => window.clearTimeout(t);
  }, [stillLoading]);

  const initialLoad = stillLoading && !loadTimedOut;
  const dataUnavailable =
    loadTimedOut || statsError || analyticsError || (!stats && !analytics && !stillLoading);

  const firstName = dashboardUserFirstName(me?.name);
  const titleName = firstName || "there";

  const subtitle = stats
    ? `${dashboardDateLabel()} · ${stats.jobs} open roles · ${stats.candidates.toLocaleString()} candidates`
    : analytics
    ? `${dashboardDateLabel()} · ${analytics.candidate_count.toLocaleString()} candidates`
    : "Loading workspace…";

  return (
    <AppShell
      title={`${dashboardGreeting()}, ${titleName}`}
      subtitle={subtitle}
      actions={
        <>
          <Link
            href="/settings"
            className={`sync-pill sync-pill--${syncLabel.tone}`}
          >
            {syncLabel.text}
          </Link>
          <Link href="/candidates" className="btn btn--primary btn--sm">
            <Users size={15} /> Review top 10
          </Link>
          <Link href="/ai" className="btn btn--secondary btn--sm">
            <Sparkles size={15} /> Ask RecruitGPT
          </Link>
          <Link href="/jobs/new" className="btn btn--ghost btn--sm">
            <Plus size={15} /> New job
          </Link>
        </>
      }
    >
      {initialLoad ? (
        <DashboardLoadingShell />
      ) : dataUnavailable ? (
        <div className="panel p-8 text-center">
          <p className="text-[15px] font-medium text-ink">
            Could not load dashboard data
          </p>
          <p className="text-[13px] text-ink-muted mt-2">
            Start the backend, then refresh:
          </p>
          <code className="block mt-3 text-[12px] text-ink-muted bg-subtle rounded-lg px-3 py-2">
            cd backend && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000
          </code>
        </div>
      ) : (
        <div className="bento bento--dash gap-4">
          {recruitingHealth && (
            <div className="bento__span-12">
              <RecruitingHealthSummary health={recruitingHealth} />
            </div>
          )}

          <div className="bento__span-12">
            {analytics?.executive_kpis?.length ? (
              <div className="metrics-row metrics-row--6">
                {analytics.executive_kpis.map((kpi) => (
                  <KpiLink
                    key={kpi.label}
                    href={kpi.href || "/analytics"}
                    label={kpi.label}
                    value={kpi.value}
                    delta={kpi.delta}
                    hint={kpi.hint}
                    definition={kpi.definition}
                    positive={kpi.delta_positive ?? true}
                  />
                ))}
              </div>
            ) : (
              <KpiGridSkeleton count={6} />
            )}
          </div>

          {analytics?.ai_summary && (
            <div className="bento__span-12">
              <AiInsightsCard summary={analytics.ai_summary} />
            </div>
          )}

          <div className="bento__span-8">
            <AttentionQueue items={attentionItems} />
          </div>
          <div className="bento__span-4">
            <TodaySchedule
              todayInterviews={todayInterviews}
              awaitingFeedback={awaitingFeedback}
              scorecardsPending={stats?.scorecards_pending ?? awaitingFeedback.length}
            />
          </div>

          <div className="bento__span-7">
            <div className="panel panel--flush h-full">
              <div className="panel__head">
                <SectionHeader
                  title="Top ranked"
                  subtitle="Challenge ranker · submission.csv"
                  action={
                    <Link href="/candidates" className="text-action">
                      View all <ChevronRight size={13} />
                    </Link>
                  }
                />
              </div>
              <TopCandidatesTable rows={topCandidates} />
            </div>
          </div>
          <div className="bento__span-5">
            <PipelineSnapshot
              funnel={funnel}
              stageConversion={analytics?.stage_conversion ?? []}
              hireRate={funnelRate}
            />
          </div>

          <div className="bento__span-12">
            <div className="panel">
              <div className="panel__head">
                <SectionHeader
                  title="Open requisitions"
                  subtitle="Sorted by interview activity"
                  action={
                    <Link href="/jobs" className="text-action">
                      All jobs <ChevronRight size={13} />
                    </Link>
                  }
                />
              </div>
              <div className="panel__body panel__body--list">
                {sortedJobs.length > 0 ? (
                  <div className="panel__list">
                    {sortedJobs.slice(0, 5).map((j) => {
                      const pipe = jobsPipelineMap.get(j.id);
                      return (
                        <JobPipelineRow
                          key={j.id}
                          id={j.id}
                          title={j.title}
                          status={j.status}
                          daysOpen={j.days_open}
                          stages={j.stages}
                          candidateCount={j.candidate_count}
                          strongHires={pipe?.strong_hires}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <p className="text-[14px] font-medium text-ink">
                      No open requisitions yet
                    </p>
                    <p className="text-[13px] text-ink-muted mt-1">
                      Create a job to start ranking candidates and building shortlists.
                    </p>
                    <Link href="/jobs/new" className="btn btn--primary btn--sm mt-4">
                      <Plus size={15} /> Create job
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bento__span-12">
            <div className="panel">
              <div className="panel__head">
                <SectionHeader
                  title="Recent activity"
                  action={
                    <Link href="/candidates" className="text-action">
                      View all activity →
                    </Link>
                  }
                />
              </div>
              <div className="panel__body panel__body--list">
                {filteredActivity.length > 0 ? (
                  <div className="panel__list">
                    {filteredActivity.map((a) => (
                      <Link key={a.id} href={a.href} className="feed-item">
                        <Avatar name={a.actor} color={a.actor_color} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] text-ink-secondary leading-snug">
                            <span className="font-semibold text-ink">{a.actor}</span>{" "}
                            {a.action}{" "}
                            <span className="font-semibold text-ink">{a.target}</span>
                          </p>
                          <p className="text-[11.5px] text-ink-faint truncate mt-0.5">
                            {a.context} · {a.time}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-muted px-4 py-6">
                    No recent activity yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}