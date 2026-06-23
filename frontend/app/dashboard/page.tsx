"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapApiCandidates } from "@/lib/candidateAdapter";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";
import { useWorkspaceInterviews } from "@/lib/useWorkspaceInterviews";
import { useWorkspaceAnalytics } from "@/lib/useWorkspaceAnalytics";
import {
  useWorkspaceActivity,
  useWorkspaceJobsOverview,
  useWorkspaceInsight,
} from "@/lib/useWorkspaceBundle";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  ChevronRight,
  Briefcase,
  Users,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Avatar,
  KpiLink,
  SectionHeader,
  FeaturedCandidate,
  RankedCandidateRow,
} from "@/components/app/Atoms";
import { DashboardLoadingShell } from "@/components/app/LoadingStates";
import type { PipelineStage } from "@/lib/mock";
import { funnelColor } from "@/lib/funnelColors";

function funnelHref(stage: PipelineStage): string {
  const params = new URLSearchParams({ stage });
  return `/candidates?${params.toString()}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useWorkspaceStats();
  const { data: analytics } = useWorkspaceAnalytics();
  const { data: interviews = [] } = useWorkspaceInterviews();
  const { data: activity = [] } = useWorkspaceActivity();
  const { data: jobs = [] } = useWorkspaceJobsOverview();
  const { data: insight } = useWorkspaceInsight();

  const { data: apiCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api.listCandidates(),
  });
  const { data: rankings = [] } = useQuery({
    queryKey: ["challenge-rankings"],
    queryFn: () => api.challengeRankings(),
  });

  const topCandidates = React.useMemo(() => {
    if (!apiCandidates?.length) return [];
    return mapApiCandidates(apiCandidates, rankings).slice(0, 5);
  }, [apiCandidates, rankings]);

  const featured = topCandidates[0];
  const runners = topCandidates.slice(1, 5);

  const funnel = stats?.funnel ?? [];
  const maxFunnel = Math.max(...funnel.map((s) => s.count), 1);
  const hiredCount = funnel.find((s) => s.stage === "Hired")?.count ?? 0;
  const appliedCount = funnel.find((s) => s.stage === "Applied")?.count ?? 0;
  const funnelRate =
    appliedCount > 0
      ? `${((hiredCount / appliedCount) * 100).toFixed(1)}%`
      : "—";

  const offerKpi = analytics?.kpis.find((k) => k.label === "Offer acceptance");
  const timeToHire = analytics?.time_to_hire ?? [];
  const maxDays = Math.max(...timeToHire.map((t) => t.days), 1);
  const currentDays = timeToHire[timeToHire.length - 1]?.days;
  const todayInterviews = interviews.filter((i) => i.when.startsWith("Today"));

  const subtitle = stats
    ? `${stats.jobs} roles · ${stats.candidates.toLocaleString()} candidates · ${stats.synced ? "rankings synced" : "import pending"}`
    : "Loading workspace…";

  return (
    <AppShell
      title="Dashboard"
      subtitle={subtitle}
      actions={
        <>
          <Link href="/ai" className="btn btn--secondary btn--sm">
            <Sparkles size={15} /> Ask RecruitGPT
          </Link>
          <Link href="/jobs/new" className="btn btn--primary btn--sm">
            <Plus size={15} /> New job
          </Link>
        </>
      }
    >
      {statsLoading && !stats ? (
        <DashboardLoadingShell />
      ) : (
        <div className="bento bento--dash">
          <div className="bento__span-12 metrics-row">
            <KpiLink
              href="/jobs"
              label="Active jobs"
              value={stats ? String(stats.jobs) : "—"}
              hint="open requisitions"
              icon={Briefcase}
            />
            <KpiLink
              href="/candidates"
              label="Candidates"
              value={stats ? stats.candidates.toLocaleString() : "—"}
              hint={stats?.pool_label ?? "challenge pool"}
              icon={Users}
            />
            <KpiLink
              href="/interviews"
              label="Interviews"
              value={stats ? String(stats.interviews) : "—"}
              hint="scheduled"
              icon={CalendarClock}
            />
            <KpiLink
              href="/analytics"
              label="Offer acceptance"
              value={offerKpi?.value ?? "—"}
              delta={offerKpi?.delta}
              icon={TrendingUp}
            />
          </div>

          <div className="bento__span-7">
            <div className="panel panel--flush h-full">
              <div className="panel__head">
                <SectionHeader
                  title="Top ranked candidates"
                  subtitle="Challenge ranker · highest match scores"
                  action={
                    <Link href="/candidates" className="text-action">
                      View all <ChevronRight size={13} />
                    </Link>
                  }
                />
              </div>
              {featured ? (
                <>
                  <FeaturedCandidate
                    candidate={featured}
                    href={`/candidates?highlight=${featured.id}`}
                  />
                  {runners.map((c, i) => (
                    <RankedCandidateRow
                      key={c.id}
                      rank={i + 2}
                      candidate={c}
                      href={`/candidates?highlight=${c.id}`}
                    />
                  ))}
                </>
              ) : (
                <p className="panel__body text-[13px] text-ink-muted">
                  No candidates loaded — run import-challenge-candidates.sh
                </p>
              )}
            </div>
          </div>

          <div className="bento__span-5 flex flex-col gap-4">
            <div className="panel">
              <div className="panel__head panel__head--inline">
                <SectionHeader
                  title="Hiring funnel"
                  subtitle="Stage distribution"
                  action={
                    <Link href="/analytics" className="text-action font-semibold text-ink tnum">
                      {funnelRate}
                    </Link>
                  }
                />
              </div>
              <div className="panel__body panel__body--tight">
                <div className="funnel-compact">
                  {funnel.map((s, i) => {
                    const pct = (s.count / maxFunnel) * 100;
                    return (
                      <button
                        key={s.stage}
                        type="button"
                        className="funnel-compact__row"
                        onClick={() =>
                          router.push(funnelHref(s.stage as PipelineStage))
                        }
                      >
                        <span className="funnel-compact__label">{s.stage}</span>
                        <div className="funnel-compact__track">
                          <div
                            className="funnel-compact__fill"
                            style={{
                              width: `${Math.max(pct, 4)}%`,
                              background: funnelColor(s.stage, i),
                            }}
                          />
                        </div>
                        <span className="funnel-compact__count">
                          {s.count.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <Link href="/analytics" className="panel block card--hover">
              <div className="panel__head panel__head--inline">
                <SectionHeader
                  title="Time to hire"
                  subtitle="Monthly trend"
                  action={
                    <span className="text-[13px] font-semibold text-ink tnum inline-flex items-center gap-1">
                      <TrendingUp size={13} className="text-positive" />
                      {currentDays != null ? `${currentDays}d` : "—"}
                    </span>
                  }
                />
              </div>
              <div className="panel__body panel__body--tight">
                <div className="mini-bars">
                  {timeToHire.map((t, idx) => (
                    <div
                      key={t.month}
                      className={`mini-bars__col${idx === timeToHire.length - 1 ? " is-current" : ""}`}
                      title={`${t.month}: ${t.days} days`}
                    >
                      <div
                        className="mini-bars__bar"
                        style={{
                          height: `${Math.max((t.days / maxDays) * 100, 8)}%`,
                        }}
                      />
                      <span className="mini-bars__label">{t.month.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </div>

          <div className="bento__span-8">
            <div className="panel">
              <div className="panel__head">
                <SectionHeader
                  title="Open requisitions"
                  action={
                    <Link href="/jobs" className="text-action">
                      All jobs <ChevronRight size={13} />
                    </Link>
                  }
                />
              </div>
              <div className="panel__body panel__body--list">
                <div className="panel__list">
                {jobs.slice(0, 5).map((j) => (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="job-row">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">
                        {j.title}
                      </div>
                      <div className="text-[12px] text-ink-muted">
                        {j.candidate_count} candidates · {j.status}
                      </div>
                    </div>
                    <div className="job-row__stat">
                      <div className="text-[15px] font-semibold text-ink tnum">
                        {j.stages.interview}
                      </div>
                      <div className="text-[11px] text-ink-faint">in interview</div>
                    </div>
                    <span className="badge badge--neutral">{j.days_open}d</span>
                    <ArrowUpRight size={14} className="text-ink-faint shrink-0" />
                  </Link>
                ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bento__span-4 flex flex-col gap-4">
            <div className="panel">
              <div className="panel__head">
                <SectionHeader
                  title="Recent activity"
                  action={
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => router.push("/candidates")}
                    >
                      Pipeline
                    </button>
                  }
                />
              </div>
              <div className="panel__body panel__body--list">
                <div className="panel__list">
                {activity.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="feed-item"
                    onClick={() => router.push(a.href)}
                  >
                    <Avatar name={a.actor} color={a.actor_color} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-ink-secondary leading-snug">
                        <span className="font-semibold text-ink">{a.actor}</span>{" "}
                        {a.action}{" "}
                        <span className="font-semibold text-ink">{a.target}</span>
                      </p>
                      <p className="text-[11.5px] text-ink-faint truncate mt-0.5">
                        {a.time}
                      </p>
                    </div>
                  </button>
                ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel__head">
                <SectionHeader
                  title="Today's interviews"
                  action={
                    <Link href="/interviews" className="text-action">
                      Calendar
                    </Link>
                  }
                />
              </div>
              <div className="panel__body panel__body--list">
                <div className="panel__list">
                {todayInterviews.length > 0 ? (
                  todayInterviews.slice(0, 4).map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className="feed-item"
                      onClick={() => router.push("/interviews")}
                    >
                      <Avatar
                        name={i.candidate}
                        color={i.candidate_color}
                        size={28}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-ink truncate">
                          {i.candidate}
                        </div>
                        <div className="text-[11.5px] text-ink-muted truncate">
                          {i.round} · {i.interviewer}
                        </div>
                      </div>
                      <span className="text-[11.5px] font-medium text-ink-secondary whitespace-nowrap">
                        {i.when.replace("Today · ", "")}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-[12.5px] text-ink-muted py-2 px-2">
                    No interviews today.
                  </p>
                )}
                </div>
              </div>
            </div>

            {insight && insight.screened_count > 0 && (
              <div className="insight-callout">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-accent" />
                  <span className="text-[12px] font-semibold text-ink">
                    Pipeline insight
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-secondary leading-relaxed">
                  <span className="font-semibold text-ink">
                    {insight.screened_count} candidates
                  </span>{" "}
                  in Screened — {insight.candidate_names}
                </p>
                <Link
                  href="/candidates?stage=Screened"
                  className="btn btn--primary btn--sm mt-3 inline-flex"
                >
                  Review <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}