"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Award,
  Radar as RadarIcon,
  MessageSquare,
  GitBranch,
  Briefcase,
  Activity,
  Users,
  Target,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Score";
import { AgentPipeline } from "@/components/AgentPipeline";
import { HiringBlueprintCard } from "@/components/HiringBlueprintCard";
import { RankedList } from "@/components/RankedList";
import { BiasReportCard } from "@/components/BiasReportCard";
import { ChatInterface } from "@/components/ChatInterface";
import { WhatIfPlayground } from "@/components/WhatIfPlayground";
import { CandidateRadar } from "@/components/CandidateRadar";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "ranking" | "radar" | "chat" | "whatif";

const TABS: {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "ranking", label: "Ranking", icon: Award },
  { id: "radar", label: "Radar", icon: RadarIcon },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "whatif", label: "What-If", icon: GitBranch },
];

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tab, setTab] = useState<Tab>("ranking");
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    enabled: !!id,
  });

  const {
    data: ranking,
    isLoading: rankLoading,
    error: rankError,
    refetch: refetchRank,
    isFetching: rankFetching,
  } = useQuery({
    queryKey: ["ranking", id],
    queryFn: () => api.rankJob(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  if (jobLoading) {
    return (
      <div className="app-page">
        <Navbar />
        <div className="app-shell flex items-center justify-center py-24 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading job...
        </div>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="app-page">
        <Navbar />
        <div className="app-shell app-content">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-rose-600 text-sm">
                Couldn&apos;t load this job. Make sure the backend is running.
              </div>
              <div className="text-[11px] text-ink-subtle mt-2 font-mono">
                {jobError instanceof Error ? jobError.message : ""}
              </div>
              <Link href="/jobs" className="inline-block mt-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const topCandidate = ranking?.ranked_candidates?.[0];
  const allSkills = Array.from(
    new Set([
      ...(job.blueprint?.hard_skills ?? []),
      ...(job.blueprint?.domain_keywords ?? []),
    ]),
  );

  return (
    <div className="app-page">
      <Navbar />

      <div className="app-shell">
        {/* Header */}
        <div className="app-hero-band">
          <div className="app-hero-band__inner">
            <Link href="/jobs" className="app-back">
              <ArrowLeft className="h-3.5 w-3.5" /> All jobs
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
              <div className="min-w-0 flex-1">
                <div className="app-badges">
                  <Badge variant="brand">
                    <Briefcase className="h-3 w-3" /> Job
                  </Badge>
                  {job.blueprint && (
                    <Badge variant="cyan">
                      <Sparkles className="h-3 w-3" /> Blueprint ready
                    </Badge>
                  )}
                  {ranking && (
                    <Badge variant="emerald">
                      <Activity className="h-3 w-3" /> Ranked
                    </Badge>
                  )}
                </div>
                <h1 className="app-title">{job.title}</h1>
                <p className="app-desc line-clamp-3">{job.description}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start"
                onClick={async () => {
                  refetchJob();
                  const fresh = await api.rankJob(id, true);
                  queryClient.setQueryData(["ranking", id], fresh);
                }}
                disabled={rankFetching}
              >
                <RefreshCcw
                  className={cn("h-3.5 w-3.5", rankFetching && "animate-spin")}
                />
                Re-run pipeline
              </Button>
            </div>
          </div>
        </div>

        <div className="app-content">
          {/* Pipeline */}
          <div className="mb-6">
            <AgentPipeline active={rankFetching || rankLoading} />
          </div>

          {/* KPIs */}
          <div className="app-kpi-grid">
            <KpiCard
              icon={Users}
              label="Candidates"
              value={ranking?.ranked_candidates.length ?? 0}
              color="#111111"
            />
            <KpiCard
              icon={Award}
              label="Top score"
              value={
                topCandidate
                  ? `${Math.round(topCandidate.hireability_score * 100)}%`
                  : "—"
              }
              color="#16a34a"
            />
            <KpiCard
              icon={Target}
              label="Skills matched"
              value={
                topCandidate
                  ? `${
                      topCandidate.intelligence?.skills?.filter((s) =>
                        job.blueprint?.hard_skills?.includes(s),
                      ).length ?? 0
                    }/${job.blueprint?.hard_skills?.length ?? 0}`
                  : "—"
              }
              color="#0891b2"
            />
            <KpiCard
              icon={Sparkles}
              label="Semantic fit"
              value={
                topCandidate
                  ? `${Math.round(topCandidate.sub_scores.semantic * 100)}%`
                  : "—"
              }
              color="#d97706"
            />
          </div>

          {/* Tabs */}
          <div className="app-tabs" role="tablist">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn("app-tab", active && "is-active")}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab panels */}
          <AnimatePresence mode="wait">
            {tab === "ranking" && (
              <motion.div
                key="ranking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="app-grid-3"
              >
                <div className="app-sidebar">
                  {job.blueprint && (
                    <HiringBlueprintCard blueprint={job.blueprint} />
                  )}
                  <BiasReportCard jobId={id} />

                  {topCandidate && (
                    <div className="app-top-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="app-top-card__rank">#1</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">
                            Top candidate
                          </div>
                          <div className="font-semibold text-ink truncate">
                            {topCandidate.candidate_name}
                          </div>
                        </div>
                        <ScoreRing
                          value={topCandidate.hireability_score}
                          size={52}
                          stroke={4}
                          className="shrink-0"
                        />
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed border-l-2 border-brand-200 pl-3 m-0">
                        {topCandidate.explanation.summary}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 min-w-0">
                  {rankLoading && (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 skeleton rounded-xl" />
                      ))}
                    </div>
                  )}

                  {rankError && (
                    <Card className="border-rose-200 bg-rose-50">
                      <CardContent className="py-6 text-rose-700 text-sm">
                        Ranking failed.{" "}
                        <span className="text-ink-muted">
                          {rankError instanceof Error ? rankError.message : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-3"
                          onClick={() => refetchRank()}
                        >
                          Retry
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {ranking && (
                    <>
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="text-lg font-semibold text-ink m-0">
                            Ranked Shortlist
                          </h2>
                          <p className="text-xs text-ink-muted mt-1 mb-0">
                            {ranking.ranked_candidates.length} candidates
                            evaluated · Click to expand reasoning
                          </p>
                        </div>
                        <Badge variant="violet">7-agent pipeline</Badge>
                      </div>
                      <RankedList candidates={ranking.ranked_candidates} />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {tab === "radar" && (
              <motion.div
                key="radar"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {rankLoading ? (
                  <div className="h-[560px] skeleton rounded-xl" />
                ) : ranking ? (
                  <Card>
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
                        <div>
                          <h2 className="text-lg font-semibold text-ink flex items-center gap-2 m-0">
                            <RadarIcon className="h-5 w-5 text-accent-cyan" />
                            Candidate Radar
                          </h2>
                          <p className="text-xs text-ink-muted mt-1 mb-0">
                            Distance from job = inverse semantic fit · Size =
                            hireability
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
                            Job at center
                          </div>
                          <div className="text-xs text-ink truncate max-w-[180px]">
                            {job.title}
                          </div>
                        </div>
                      </div>
                      <CandidateRadar
                        ranked={ranking.ranked_candidates}
                        jobSkills={allSkills}
                      />
                    </CardContent>
                  </Card>
                ) : null}

                {ranking && (
                  <Card>
                    <CardContent className="py-5">
                      <h3 className="text-sm font-semibold text-ink mb-3 mt-0">
                        Top 5 by Hireability
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {ranking.ranked_candidates.slice(0, 5).map((rc) => (
                          <div
                            key={rc.candidate_id}
                            className="rounded-xl border border-bg-border bg-bg-elevated/60 p-3 text-center"
                          >
                            <ScoreRing
                              value={rc.hireability_score}
                              size={48}
                              stroke={3}
                            />
                            <div className="text-xs font-medium text-ink mt-2 truncate">
                              {rc.candidate_name}
                            </div>
                            <div className="text-[10px] text-ink-subtle mt-0.5">
                              Rank #{rc.rank}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {tab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <ChatInterface jobId={id} />
              </motion.div>
            )}

            {tab === "whatif" && (
              <motion.div
                key="whatif"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {job.blueprint ? (
                  <WhatIfPlayground
                    jobId={id}
                    originalBlueprint={job.blueprint}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-ink-muted text-sm">
                      Generate a hiring blueprint first to use the What-If
                      playground.
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="app-kpi">
      <span className="app-kpi__icon" style={{ color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="app-kpi__label">{label}</div>
      <div className="app-kpi__value">{value}</div>
    </div>
  );
}