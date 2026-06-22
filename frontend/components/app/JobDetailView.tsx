"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  MessageSquare,
  Scale,
  Radar,
  LayoutGrid,
  ListOrdered,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  JobCardsSkeleton,
  RankingLoader,
  TabPanelSkeleton,
} from "@/components/app/LoadingStates";
import { api } from "@/lib/api";
import { useWorkspaceJobsOverview } from "@/lib/useWorkspaceBundle";
import type { HiringBlueprint } from "@/lib/types";
import { FUNNEL_STAGE_COLORS } from "@/lib/funnelColors";

const TabLoader = () => <TabPanelSkeleton />;

const AgentPipeline = dynamic(
  () => import("@/components/AgentPipeline").then((m) => m.AgentPipeline),
  { loading: () => <TabLoader /> }
);
const HiringBlueprintCard = dynamic(
  () =>
    import("@/components/HiringBlueprintCard").then((m) => m.HiringBlueprintCard),
  { loading: () => <TabLoader /> }
);
const RankedList = dynamic(
  () => import("@/components/RankedList").then((m) => m.RankedList),
  { loading: () => <TabLoader /> }
);
const BiasReportCard = dynamic(
  () => import("@/components/BiasReportCard").then((m) => m.BiasReportCard),
  { loading: () => <TabLoader /> }
);
const ChatInterface = dynamic(
  () => import("@/components/ChatInterface").then((m) => m.ChatInterface),
  { loading: () => <TabLoader /> }
);
const WhatIfPlayground = dynamic(
  () => import("@/components/WhatIfPlayground").then((m) => m.WhatIfPlayground),
  { loading: () => <TabLoader /> }
);
const CandidateRadar = dynamic(
  () => import("@/components/CandidateRadar").then((m) => m.CandidateRadar),
  { loading: () => <TabLoader /> }
);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "rankings", label: "Rankings", icon: ListOrdered },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "bias", label: "Bias", icon: Scale },
  { id: "whatif", label: "What-If", icon: GitBranch },
  { id: "radar", label: "Radar", icon: Radar },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

const statusTone: Record<string, string> = {
  Open: "badge--info",
  Interviewing: "badge--accent",
  "Offer stage": "badge--warning",
};

export function JobDetailView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const jobId = typeof params.id === "string" ? params.id : "";

  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId =
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "overview";

  const setTab = (tab: TabId) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    const qs = next.toString();
    router.replace(qs ? `/jobs/${jobId}?${qs}` : `/jobs/${jobId}`, {
      scroll: false,
    });
  };

  const { data: job, isLoading: jobLoading, isError: jobError } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: !!jobId,
  });

  const {
    data: ranking,
    isLoading: rankLoading,
    isError: rankError,
    error: rankErr,
    isFetching: rankFetching,
  } = useQuery({
    queryKey: ["job-ranking", jobId],
    queryFn: () => api.rankJob(jobId),
    enabled: !!jobId && !!job,
    staleTime: 5 * 60_000,
  });

  const rerank = useMutation({
    mutationFn: () => api.rankJob(jobId, true),
    onSuccess: (data) => {
      queryClient.setQueryData(["job-ranking", jobId], data);
    },
  });

  const { data: jobsOverview = [] } = useWorkspaceJobsOverview();
  const overview = jobsOverview.find((j) => j.id === jobId);

  const blueprint: HiringBlueprint | null =
    ranking?.blueprint ?? job?.blueprint ?? null;

  const [rankPage, setRankPage] = React.useState(1);
  const [rankPageSize, setRankPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  const ranked = ranking?.ranked_candidates ?? [];
  const totalRankPages = Math.max(1, Math.ceil(ranked.length / rankPageSize));
  const safeRankPage = Math.min(rankPage, totalRankPages);

  React.useEffect(() => {
    if (rankPage > totalRankPages) setRankPage(totalRankPages);
  }, [rankPage, totalRankPages]);

  const paginatedRanked = ranked.slice(
    (safeRankPage - 1) * rankPageSize,
    safeRankPage * rankPageSize
  );

  const rankStart = ranked.length === 0 ? 0 : (safeRankPage - 1) * rankPageSize + 1;
  const rankEnd = Math.min(safeRankPage * rankPageSize, ranked.length);

  if (!jobId) {
    return (
      <AppShell title="Job not found" subtitle="Invalid job ID">
        <div className="card p-8 text-center">
          <Link href="/jobs" className="text-accent font-medium text-[14px]">
            Back to jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  if (jobLoading) {
    return (
      <AppShell title="Loading…" subtitle="Fetching job details">
        <JobCardsSkeleton count={1} />
        <div className="mt-4">
          <TabPanelSkeleton />
        </div>
      </AppShell>
    );
  }

  if (jobError || !job) {
    return (
      <AppShell title="Job not found" subtitle="Could not load this requisition">
        <div className="card p-8 text-center">
          <p className="text-critical text-[14px] font-medium mb-3">
            This job could not be found or you don&apos;t have access.
          </p>
          <Link href="/jobs" className="text-accent font-medium text-[14px]">
            ← Back to jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  const rankingBusy = rankLoading || rankFetching || rerank.isPending;

  return (
    <AppShell
      title={job.title}
      subtitle={
        overview
          ? `${overview.candidate_count} in pool · ${overview.days_open}d open · ${ranked.length} ranked`
          : ranking?.cached
          ? "Cached ranking"
          : "AI-ranked candidate analysis"
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => rerank.mutate()}
            disabled={rankingBusy}
          >
            <RefreshCw
              size={15}
              className={rankingBusy ? "animate-spin" : undefined}
            />
            {rerank.isPending ? "Re-ranking…" : "Re-rank"}
          </button>
          <Link href="/jobs/new" className="btn btn--primary btn--sm">
            <Sparkles size={15} /> New job
          </Link>
        </div>
      }
    >
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-4"
      >
        <ArrowLeft size={15} /> All jobs
      </Link>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {overview && (
          <span
            className={`badge ${statusTone[overview.status] ?? "badge--info"} badge--dot`}
          >
            {overview.status}
          </span>
        )}
        {ranking?.cached && (
          <span className="badge badge--neutral">Cached result</span>
        )}
        {overview && (
          <>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Users size={14} className="text-ink-faint" />
              <span className="tnum font-semibold text-ink-secondary">
                {overview.candidate_count}
              </span>{" "}
              in pool
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <Clock size={14} className="text-ink-faint" />
              {overview.days_open}d open
            </span>
          </>
        )}
      </div>

      {/* Pipeline funnel */}
      {overview && (
        <div className="card p-4 mb-4">
          <span className="h-eyebrow">Pipeline funnel</span>
          <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-subtle">
            {[
              { v: overview.stages.applied, c: FUNNEL_STAGE_COLORS.Applied },
              { v: overview.stages.screened, c: FUNNEL_STAGE_COLORS.Screened },
              { v: overview.stages.interview, c: FUNNEL_STAGE_COLORS.Interview },
              { v: overview.stages.offer, c: FUNNEL_STAGE_COLORS.Offer },
            ].map((s, i) => {
              const total =
                overview.stages.applied +
                overview.stages.screened +
                overview.stages.interview +
                overview.stages.offer;
              return (
                <div
                  key={i}
                  style={{
                    width: total > 0 ? `${(s.v / total) * 100}%` : "0%",
                    background: s.c,
                  }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
            {(
              [
                ["Applied", overview.stages.applied, FUNNEL_STAGE_COLORS.Applied],
                ["Screened", overview.stages.screened, FUNNEL_STAGE_COLORS.Screened],
                ["Interview", overview.stages.interview, FUNNEL_STAGE_COLORS.Interview],
                ["Offer", overview.stages.offer, FUNNEL_STAGE_COLORS.Offer],
              ] as const
            ).map(([label, count, color]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                {label}
                <span className="font-semibold text-ink-secondary tnum">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="seg mb-5 overflow-x-auto max-w-full">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`tab-btn ${activeTab === id ? "is-active" : ""}`}
          >
            <Icon size={14} />
            {label}
            {id === "rankings" && ranked.length > 0 && (
              <span className="badge badge--neutral text-[10px] ml-0.5">
                {ranked.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Ranking loading / error */}
      {rankError && (
        <div className="card p-6 mb-4 border-critical/20 bg-critical/5">
          <p className="text-critical text-[14px] font-medium">
            Could not load ranking analysis.
          </p>
          <p className="text-ink-muted text-[13px] mt-1">
            {(rankErr as Error)?.message ??
              "Ensure the backend is running and candidates are seeded."}
          </p>
          <button
            type="button"
            className="btn btn--secondary btn--sm mt-3"
            onClick={() => rerank.mutate()}
          >
            Retry ranking
          </button>
        </div>
      )}

      {rankLoading && !ranking && (
        <div className="mb-4">
          <RankingLoader />
        </div>
      )}

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <AgentPipeline active={rankingBusy} />

          {job.description && (
            <div className="card p-5">
              <span className="h-eyebrow">Job description</span>
              <p className="text-[14px] text-ink-secondary leading-relaxed mt-3 whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          )}

          {blueprint && <HiringBlueprintCard blueprint={blueprint} />}

          {ranked.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="h-eyebrow">Top candidates</span>
                <button
                  type="button"
                  onClick={() => setTab("rankings")}
                  className="text-[13px] text-accent font-medium hover:text-accent-hover"
                >
                  View all {ranked.length} →
                </button>
              </div>
              <RankedList candidates={ranked.slice(0, 5)} />
            </div>
          )}
        </div>
      )}

      {activeTab === "rankings" && ranked.length > 0 && (
        <div>
          <p className="text-[12.5px] text-ink-muted mb-3">
            Showing{" "}
            <span className="font-semibold text-ink tnum">
              {rankStart}–{rankEnd}
            </span>{" "}
            of <span className="tnum">{ranked.length}</span> ranked candidates
            {ranking?.cached && (
              <span className="text-ink-faint"> · from cache</span>
            )}
          </p>

          <RankedList candidates={paginatedRanked} />

          {ranked.length > rankPageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 card px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] text-ink-muted">
                <span>Rows per page</span>
                <select
                  value={rankPageSize}
                  onChange={(e) => {
                    setRankPageSize(Number(e.target.value));
                    setRankPage(1);
                  }}
                  className="h-8 px-2 rounded-lg border border-line bg-surface text-[13px] outline-none focus:border-accent"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setRankPage((p) => Math.max(1, p - 1))}
                  disabled={safeRankPage <= 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[12.5px] text-ink-muted tnum px-2">
                  Page {safeRankPage} of {totalRankPages}
                </span>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() =>
                    setRankPage((p) => Math.min(totalRankPages, p + 1))
                  }
                  disabled={safeRankPage >= totalRankPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "rankings" && !rankLoading && ranked.length === 0 && (
        <div className="card p-10 text-center text-ink-muted text-[14px]">
          No ranked candidates yet. Try re-ranking once candidates are seeded.
        </div>
      )}

      {activeTab === "chat" && (
        <ChatInterface jobId={jobId} />
      )}

      {activeTab === "bias" && (
        <BiasReportCard jobId={jobId} />
      )}

      {activeTab === "whatif" && blueprint && (
        <WhatIfPlayground jobId={jobId} originalBlueprint={blueprint} />
      )}

      {activeTab === "whatif" && !blueprint && (
        <div className="card p-8 text-center text-ink-muted text-[14px]">
          Run ranking first to generate a hiring blueprint for what-if analysis.
        </div>
      )}

      {activeTab === "radar" && ranked.length > 0 && blueprint && (
        <CandidateRadar
          ranked={ranked}
          jobSkills={[
            ...blueprint.hard_skills,
            ...blueprint.domain_keywords,
          ]}
        />
      )}

      {activeTab === "radar" && ranked.length === 0 && !rankLoading && (
        <div className="card p-8 text-center text-ink-muted text-[14px]">
          Rank candidates first to see the talent radar map.
        </div>
      )}
    </AppShell>
  );
}