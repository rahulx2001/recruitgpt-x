"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AgentPipeline } from "@/components/AgentPipeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/Score";
import { api } from "@/lib/api";
import {
  Briefcase,
  Users,
  Sparkles,
  ArrowRight,
  Zap,
  MessageSquare,
  Target,
  Activity,
  Search,
  Radar,
  GitBranch,
  ShieldCheck,
  TrendingUp,
  Plus,
  Clock,
  CheckCircle2,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    href: "/search",
    icon: Search,
    title: "NL Search",
    desc: "SQL strong, Power BI weak",
    color: "#22d3ee",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    title: "AI Chat",
    desc: "Ask about the shortlist",
    color: "#a855f7",
  },
  {
    href: "/whatif",
    icon: GitBranch,
    title: "What-If",
    desc: "Drop requirements live",
    color: "#f59e0b",
  },
  {
    href: "/radar",
    icon: Radar,
    title: "Radar",
    desc: "Skill-space clusters",
    color: "#ec4899",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
  });
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: api.listCandidates,
  });

  const firstJob = jobs[0];

  const { data: ranking, isLoading: rankingLoading } = useQuery({
    queryKey: ["ranking", firstJob?.id],
    queryFn: () => api.rankJob(firstJob!.id),
    enabled: !!firstJob?.id,
    staleTime: 5 * 60_000,
  });

  const topThree = ranking?.ranked_candidates?.slice(0, 3) ?? [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header band */}
        <div className="relative border-b border-bg-border overflow-hidden bg-bg-surface">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,76,255,0.06), transparent)" }} />
          <div className="container mx-auto px-6 py-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="cyan">
                      <Sparkles className="h-3 w-3" aria-hidden /> Live platform
                    </Badge>
                    {ranking?.cached && (
                      <Badge variant="emerald">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> Cached ranking
                      </Badge>
                    )}
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2 tracking-tight">
                    {getGreeting()}, Recruiter
                  </h1>
                  <p className="text-ink-muted max-w-xl">
                    Your 7-agent intelligence pipeline is ready.{" "}
                    <span className="text-ink font-medium">
                      {candidates.length} candidates
                    </span>{" "}
                    across{" "}
                    <span className="text-ink font-medium">{jobs.length} jobs</span>{" "}
                    — semantic, behavioral, and trajectory signals included.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href="/jobs/new"
                    className="btn btn--violet"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    New Job
                  </Link>
                  <Link
                    href={firstJob ? `/jobs/${firstJob.id}` : "/jobs/new"}
                    className="btn btn--ghost"
                  >
                    {firstJob ? "View Ranking" : "Get Started"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          {/* Stats bento row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Briefcase} label="Active jobs" value={jobs.length} color="#4a55f5" delay={0} />
            <StatCard icon={Users} label="Candidates" value={candidates.length} color="#a855f7" delay={0.05} />
            <StatCard icon={Activity} label="AI agents" value={7} color="#10b981" delay={0.1} />
            <StatCard
              icon={Target}
              label="Top hireability"
              value={
                topThree[0]
                  ? `${Math.round(topThree[0].hireability_score * 100)}%`
                  : "—"
              }
              color="#f59e0b"
              delay={0.15}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left column */}
            <div className="xl:col-span-8 space-y-6">
              <AgentPipeline active />

              {/* Primary CTA + quick actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href={firstJob ? `/jobs/${firstJob.id}` : "/jobs/new"} className="block">
                  <div className="bento-card h-full rounded-2xl border border-brand-200 bg-brand-50/50 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-11 w-11 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-brand-600" aria-hidden />
                      </div>
                      <Badge variant="brand">Primary</Badge>
                    </div>
                    <h2 className="font-display text-lg font-semibold text-ink mb-1">
                      {firstJob ? firstJob.title : "Create your first job"}
                    </h2>
                    <p className="text-sm text-ink-muted mb-4">
                      {firstJob
                        ? "Run the full ranking pipeline with explainability, bias audit, and radar."
                        : "Paste a job description and let 7 agents build your shortlist."}
                    </p>
                    <span className="text-sm font-semibold text-brand-600 inline-flex items-center gap-1">
                      {firstJob ? "Open job workspace" : "Create job"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>

                <div className="rounded-2xl border border-bg-border bg-bg-surface p-5 shadow-sm">
                  <h3 className="font-display text-sm font-semibold text-ink mb-3">
                    Quick actions
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.href} href={a.href}>
                          <div className="bento-card rounded-xl border border-bg-border bg-bg p-3 h-full hover:bg-bg-elevated">
                            <span style={{ color: a.color }}>
                              <Icon className="h-4 w-4 mb-2" aria-hidden />
                            </span>
                            <div className="text-xs font-semibold text-ink">{a.title}</div>
                            <div className="text-[10px] text-ink-subtle mt-0.5 line-clamp-1">
                              {a.desc}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Jobs list */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display">Your jobs</CardTitle>
                  <Link
                    href="/jobs"
                    className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 skeleton rounded-xl" />
                      ))}
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-10">
                      <Briefcase className="h-8 w-8 text-ink-subtle mx-auto mb-3" aria-hidden />
                      <p className="text-sm text-ink-muted mb-4">No jobs yet</p>
                      <Link
                        href="/jobs/new"
                        className="text-sm text-brand-600 font-medium hover:underline"
                      >
                        Create your first job →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map((j) => (
                        <Link
                          key={j.id}
                          href={`/jobs/${j.id}`}
                          className="flex items-center justify-between p-4 rounded-xl border border-bg-border hover:border-brand-300 hover:bg-brand-50 transition-all group"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
                              <Briefcase className="h-4 w-4 text-brand-600" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink truncate">
                                {j.title}
                              </div>
                              <div className="text-[11px] text-ink-subtle flex items-center gap-2 mt-0.5">
                                <Clock className="h-3 w-3" aria-hidden />
                                {new Date(j.created_at).toLocaleDateString()}
                                <span>·</span>
                                {j.blueprint?.seniority || "Parsing…"}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-ink-subtle group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0" aria-hidden />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="xl:col-span-4 space-y-6">
              {/* Top candidates */}
              <Card className="overflow-hidden border-brand-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-accent-violet" aria-hidden />
                      Top shortlist
                    </CardTitle>
                    {firstJob && (
                      <Link href={`/jobs/${firstJob.id}`} className="text-[10px] text-brand-600 hover:underline">
                        See all
                      </Link>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-subtle mt-1">
                    {firstJob ? firstJob.title : "Create a job to see rankings"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rankingLoading ? (
                    <>
                      <div className="h-20 skeleton rounded-xl" />
                      <div className="h-20 skeleton rounded-xl" />
                    </>
                  ) : topThree.length === 0 ? (
                    <p className="text-xs text-ink-subtle text-center py-6">
                      No ranking data yet
                    </p>
                  ) : (
                    topThree.map((rc, i) => (
                      <motion.div
                        key={rc.candidate_id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Link
                          href={`/candidates/${rc.candidate_id}`}
                          className="flex items-center gap-3 p-3 rounded-xl border border-bg-border bg-bg hover:border-brand-300 hover:bg-brand-50 transition-all group"
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              i === 0
                                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black"
                                : "bg-bg-border text-ink-muted"
                            }`}
                          >
                            #{rc.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ink truncate group-hover:text-brand-600 transition-colors">
                              {rc.candidate_name}
                            </div>
                            <div className="text-[10px] text-ink-subtle mt-0.5">
                              Semantic {Math.round(rc.sub_scores.semantic * 100)}% · Skills{" "}
                              {Math.round(rc.sub_scores.skill_match * 100)}%
                            </div>
                          </div>
                          <ScoreRing value={rc.hireability_score} size={40} stroke={3} />
                        </Link>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Platform health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent-emerald" aria-hidden />
                    Platform status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusRow label="Multi-agent pipeline" ok />
                  <StatusRow label="Vector search index" ok />
                  <StatusRow label="Ranking cache" ok={!!ranking?.cached || !!ranking} />
                  <StatusRow label="Bias audit" ok />
                  <div className="pt-3 border-t border-bg-border">
                    <p className="text-[11px] text-ink-subtle leading-relaxed">
                      Powered by LangGraph · MiniMax M3 · BGE-Large · Qdrant
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Wow feature highlight */}
              <div className="rounded-2xl border border-bg-border bg-brand-50/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-400" aria-hidden />
                  <span className="text-xs font-semibold text-ink">Demo tip</span>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed mb-4">
                  Try asking the AI chat:{" "}
                  <em className="text-brand-600 not-italic">
                    &ldquo;Why is Rahul ranked above Amit?&rdquo;
                  </em>
                </p>
                <Link
                  href="/chat"
                  className="text-xs font-semibold text-brand-600 inline-flex items-center gap-1 hover:underline"
                >
                  Open AI Chat <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bento-card rounded-xl border border-bg-border bg-bg-surface p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider text-ink-subtle font-medium">
          {label}
        </span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <div className="text-3xl font-display font-bold text-ink">{value}</div>
    </motion.div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted text-xs">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-[11px] font-medium ${
          ok ? "text-accent-emerald" : "text-ink-subtle"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-accent-emerald" : "bg-ink-subtle"}`}
          aria-hidden
        />
        {ok ? "Operational" : "Pending"}
      </span>
    </div>
  );
}