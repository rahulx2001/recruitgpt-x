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
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  Avatar,
  CandidateAvatar,
  KpiLink,
  MatchScore,
  RecommendationBadge,
  StageBadge,
  SectionHeader,
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
    return mapApiCandidates(apiCandidates, rankings).slice(0, 4);
  }, [apiCandidates, rankings]);

  const funnel = stats?.funnel ?? [];
  const maxFunnel = Math.max(...funnel.map((s) => s.count), 1);
  const hiredCount = funnel.find((s) => s.stage === "Hired")?.count ?? 0;
  const appliedCount = funnel.find((s) => s.stage === "Applied")?.count ?? 0;
  const funnelRate =
    appliedCount > 0
      ? `${((hiredCount / appliedCount) * 100).toFixed(1)}% applied → hired`
      : "—";

  const offerKpi = analytics?.kpis.find((k) => k.label === "Offer acceptance");
  const timeToHire = analytics?.time_to_hire ?? [];
  const maxDays = Math.max(...timeToHire.map((t) => t.days), 1);
  const currentDays = timeToHire[timeToHire.length - 1]?.days;

  const subtitle = stats
    ? `${stats.jobs} active requisitions · ${stats.candidates} candidates · ${stats.synced ? "synced" : "needs re-import"}`
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
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <KpiLink
          href="/jobs"
          label="Active jobs"
          value={stats ? String(stats.jobs) : "—"}
          delta="open requisitions"
        />
        <KpiLink
          href="/candidates"
          label="Candidates in pipeline"
          value={stats ? stats.candidates.toLocaleString() : "—"}
          delta={stats?.pool_label ?? "challenge pool"}
        />
        <KpiLink
          href="/interviews"
          label="Interviews scheduled"
          value={stats ? String(stats.interviews) : "—"}
          delta="active pipeline"
        />
        <KpiLink
          href="/analytics"
          label="Offer acceptance"
          value={offerKpi?.value ?? "—"}
          delta={offerKpi?.delta ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="card p-5">
            <SectionHeader
              title="Hiring funnel"
              action={
                <Link
                  href="/analytics"
                  className="badge badge--positive badge--dot hover:opacity-80 transition-opacity"
                >
                  {funnelRate}
                </Link>
              }
            />
            <div className="space-y-2.5 mt-4">
              {funnel.map((s, i) => {
                const pct = (s.count / maxFunnel) * 100;
                const conv =
                  i === 0
                    ? 100
                    : funnel[i - 1].count > 0
                    ? Math.round((s.count / funnel[i - 1].count) * 100)
                    : 0;
                return (
                  <button
                    key={s.stage}
                    type="button"
                    className="funnel-row funnel-row--clickable"
                    onClick={() =>
                      router.push(funnelHref(s.stage as PipelineStage))
                    }
                  >
                    <div className="funnel-label">{s.stage}</div>
                    <div className="funnel-track">
                      <div
                        className="funnel-bar"
                        style={{
                          width: `${Math.max(pct, 12)}%`,
                          background: funnelColor(s.stage, i),
                        }}
                      >
                        <span className="text-[13px] font-semibold text-white tnum">
                          {s.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="funnel-conv">
                      {i === 0 ? "—" : `${conv}%`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-5 pb-3">
              <SectionHeader
                title="Top candidates this week"
                action={
                  <Link
                    href="/candidates"
                    className="text-[13px] font-medium text-accent hover:text-accent-hover inline-flex items-center gap-1"
                  >
                    View all <ChevronRight size={14} />
                  </Link>
                }
              />
            </div>
            <div className="divide-y divide-line">
              {topCandidates.map((c) => (
                <Link
                  key={c.id}
                  href={`/candidates?highlight=${c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-subtle transition-colors"
                >
                  <MatchScore value={c.matchScore} />
                  <CandidateAvatar name={c.name} gender={c.gender} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink truncate">
                        {c.name}
                      </span>
                      <RecommendationBadge value={c.recommendation} />
                    </div>
                    <div className="text-[12.5px] text-ink-muted truncate">
                      {c.title} · {c.company} · {c.experienceYears}y
                    </div>
                  </div>
                  <StageBadge value={c.stage} />
                </Link>
              ))}
              {topCandidates.length === 0 && (
                <p className="px-5 py-8 text-ink-muted text-[14px]">
                  No candidates loaded — run import-challenge-candidates.sh
                </p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader
              title="Open requisitions"
              action={
                <Link
                  href="/jobs"
                  className="text-[13px] font-medium text-accent hover:text-accent-hover inline-flex items-center gap-1"
                >
                  All jobs <ChevronRight size={14} />
                </Link>
              }
            />
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {jobs.slice(0, 4).map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="card card--hover p-4 block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[14px] font-semibold text-ink">
                        {j.title}
                      </div>
                      <div className="text-[12.5px] text-ink-muted">
                        {j.candidate_count} candidates · {j.status}
                      </div>
                    </div>
                    <ArrowUpRight size={15} className="text-ink-faint" />
                  </div>
                  <div className="flex items-center gap-2 mt-3.5">
                    <span className="text-[20px] font-semibold text-ink tnum">
                      {j.stages.interview}
                    </span>
                    <span className="text-[12.5px] text-ink-muted">
                      in interview
                    </span>
                    <span className="badge badge--positive ml-auto">
                      {j.days_open}d open
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <SectionHeader
              title="Recent activity"
              action={
                <button
                  type="button"
                  className="text-[13px] font-medium text-accent hover:text-accent-hover"
                  onClick={() => router.push("/candidates")}
                >
                  See pipeline
                </button>
              }
            />
            <div className="space-y-1 mt-1">
              {activity.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full flex gap-3 py-2 text-left rounded-lg hover:bg-subtle transition-colors px-1 -mx-1"
                  onClick={() => router.push(a.href)}
                >
                  <Avatar name={a.actor} color={a.actor_color} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-secondary leading-snug">
                      <span className="font-semibold text-ink">{a.actor}</span>{" "}
                      {a.action}{" "}
                      <span className="font-semibold text-ink">{a.target}</span>
                    </p>
                    <p className="text-[12px] text-ink-faint truncate">
                      {a.context} · {a.time}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <SectionHeader
              title="Today's interviews"
              action={
                <Link
                  href="/interviews"
                  className="text-[13px] font-medium text-accent hover:text-accent-hover"
                >
                  Calendar
                </Link>
              }
            />
            <div className="space-y-2.5 mt-2">
              {interviews
                .filter((i) => i.when.startsWith("Today"))
                .slice(0, 4)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="w-full flex items-center gap-3 rounded-lg hover:bg-subtle transition-colors py-1 px-1 -mx-1 text-left"
                    onClick={() => router.push("/interviews")}
                  >
                    <Avatar
                      name={i.candidate}
                      color={i.candidate_color}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">
                        {i.candidate}
                      </div>
                      <div className="text-[12px] text-ink-muted truncate">
                        {i.round} · {i.interviewer}
                      </div>
                    </div>
                    <span className="text-[12px] font-medium text-ink-secondary whitespace-nowrap">
                      {i.when.replace("Today · ", "")}
                    </span>
                  </button>
                ))}
              {interviews.filter((i) => i.when.startsWith("Today")).length ===
                0 && (
                <p className="text-[13px] text-ink-muted py-2">
                  No interviews scheduled for today.
                </p>
              )}
            </div>
          </div>

          {insight && insight.screened_count > 0 && (
            <div className="card p-5 bg-accent-soft/60 border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-accent" />
                <span className="text-[13px] font-semibold text-ink">
                  RecruitGPT insight
                </span>
              </div>
              <p className="text-[13px] text-ink-secondary leading-relaxed">
                <span className="font-semibold text-ink">
                  {insight.screened_count} candidates
                </span>{" "}
                in Screened including {insight.candidate_names}. Review them to
                keep your pipeline moving.
              </p>
              <Link
                href="/candidates?stage=Screened"
                className="btn btn--primary btn--sm mt-3.5 inline-flex"
              >
                Review candidates <ArrowUpRight size={14} />
              </Link>
            </div>
          )}

          <Link href="/analytics" className="card p-5 block card--hover">
            <SectionHeader title="Time to hire" />
            <div className="flex items-end gap-1 mt-3 h-20">
              {timeToHire.map((t, idx) => (
                <div
                  key={t.month}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full rounded-md bg-accent/15"
                    style={{ height: `${(t.days / maxDays) * 100}%` }}
                  >
                    <div
                      className="w-full rounded-md bg-accent"
                      style={{
                        height: "100%",
                        opacity: idx === timeToHire.length - 1 ? 1 : 0.35,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[13px] text-ink-muted">Now</span>
              <span className="text-[15px] font-semibold text-ink inline-flex items-center gap-1">
                <TrendingUp size={15} className="text-positive" />{" "}
                {currentDays != null ? `${currentDays} days` : "—"}
              </span>
            </div>
          </Link>
        </div>
      </div>
      </>
      )}
    </AppShell>
  );
}