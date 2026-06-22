"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Github,
  Linkedin,
  ExternalLink,
  MapPin,
  Briefcase,
  Award,
  GraduationCap,
  Calendar,
  Sparkles,
  TrendingUp,
  Code2,
  Target,
  Brain,
  Activity,
  Loader2,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ui/Score";
import { api } from "@/lib/api";
import { initials, cn } from "@/lib/utils";

export default function CandidateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const {
    data: candidate,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => api.getCandidate(id),
    enabled: !!id,
  });

  const { data: prediction, isLoading: predicting } = useQuery({
    queryKey: ["potential", id],
    queryFn: () => api.predictPotential(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-6 py-12 flex items-center justify-center text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading candidate…
        </main>
      </>
    );
  }

  if (error || !candidate) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-rose-300 text-sm">
                Couldn't load this candidate.
              </div>
              <Link href="/candidates" className="inline-block mt-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to candidates
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const years = candidate.years_experience ?? 0;
  const level =
    years >= 10
      ? "Staff+"
      : years >= 6
        ? "Senior"
        : years >= 3
          ? "Mid"
          : "Junior";
  const topSkills = (candidate.skills ?? [])
    .slice()
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 8);

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <Link
          href="/candidates"
          className="text-xs text-ink-muted hover:text-brand-300 inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> All candidates
        </Link>

        {/* Profile header */}
        <Card className="overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <CardContent className="relative py-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-brand-500/30">
                {initials(candidate.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-bold text-ink">
                    {candidate.full_name}
                  </h1>
                  <Badge variant="brand">{level}</Badge>
                  <Badge variant="violet">
                    <Sparkles className="h-3 w-3" /> AI-analyzed
                  </Badge>
                </div>
                <p className="text-sm text-ink-muted mb-3">
                  {candidate.headline || candidate.current_role || "—"}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                  {candidate.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {candidate.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {years} years experience
                  </span>
                  {candidate.school && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> {candidate.school}
                    </span>
                  )}
                  {candidate.email && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      ✉ {candidate.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {candidate.github_url && (
                    <a
                      href={candidate.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-brand-300 hover:underline flex items-center gap-1"
                    >
                      <Github className="h-3 w-3" /> GitHub
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {candidate.linkedin_url && (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-brand-300 hover:underline flex items-center gap-1"
                    >
                      <Linkedin className="h-3 w-3" /> LinkedIn
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {candidate.portfolio_url && (
                    <a
                      href={candidate.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-brand-300 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left: Skills, Experience, Projects */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-brand-400" /> Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topSkills.length > 0 ? (
                  <div className="space-y-3">
                    {topSkills.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-ink font-medium">
                            {s.name}
                          </span>
                          <span className="text-[11px] text-ink-subtle font-mono">
                            {s.proficiency}/5 · {s.years}y
                          </span>
                        </div>
                        <ScoreBar value={s.proficiency} height={4} max={5} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-ink-subtle italic">
                    No structured skill data. See resume for details.
                  </div>
                )}
                {candidate.certifications &&
                  candidate.certifications.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-bg-border">
                      <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1">
                        <Award className="h-3 w-3" /> Certifications
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.certifications.map((c, i) => (
                          <Badge
                            key={i}
                            variant="emerald"
                            className="text-[10px]"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Skill Evolution Timeline */}
            {candidate.skill_history && candidate.skill_history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-brand-400" /> Skill Evolution Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-bg-border" />
                    {candidate.skill_history
                      .slice()
                      .sort((a, b) => b.year - a.year)
                      .map((h, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[18px] top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-4 ring-bg" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-ink">
                              {h.skill_name}
                            </span>
                            <span className="text-[10px] text-ink-subtle font-mono">
                              {h.year} · Prof {h.proficiency}/5
                            </span>
                          </div>
                          <div className="text-[10px] text-ink-muted mt-0.5">
                            Source: <span className="capitalize">{h.source}</span>
                            {h.context && ` (${h.context})`}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work experience */}
            {candidate.experiences && candidate.experiences.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-accent-cyan" /> Work
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-5 space-y-5">
                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-bg-border" />
                    {candidate.experiences.map((exp, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                      >
                        <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet ring-4 ring-bg" />
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="font-semibold text-sm text-ink">
                              {exp.role}
                            </div>
                            <div className="text-xs text-ink-muted">
                              {exp.company}
                            </div>
                          </div>
                          {exp.is_current && (
                            <Badge variant="emerald" className="text-[9px]">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-subtle font-mono flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {exp.start_date ?? "—"} → {exp.end_date ?? "Present"}
                        </div>
                        {exp.description && (
                          <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Projects */}
            {candidate.projects && candidate.projects.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code2 className="h-4 w-4 text-accent-violet" /> Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.projects.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border border-bg-border bg-bg-elevated/40 p-4 hover:border-brand-400/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-ink">
                          {p.name}
                        </h4>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink-subtle hover:text-brand-400"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed mb-2">
                        {p.description}
                      </p>
                      {p.impact && (
                        <div className="text-[11px] text-emerald-300 italic mb-2">
                          💡 {p.impact}
                        </div>
                      )}
                      {p.technologies && p.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.technologies.map((t, j) => (
                            <Badge
                              key={j}
                              variant="brand"
                              className="text-[9px]"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: AI insights + future potential */}
          <div className="space-y-6">
            {/* Future potential — the wow feature */}
            <Card className="overflow-hidden border-accent-violet/30">
              <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
              <CardHeader className="relative pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-accent-violet" />
                    Future Potential
                  </CardTitle>
                  <Badge variant="violet">
                    <Sparkles className="h-3 w-3" /> Agent 4
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  Predicted career trajectory based on growth signals.
                </p>
              </CardHeader>
              <CardContent className="relative">
                {predicting ? (
                  <div className="space-y-2">
                    <div className="h-4 skeleton rounded w-3/4" />
                    <div className="h-4 skeleton rounded w-1/2" />
                    <div className="h-12 skeleton rounded mt-3" />
                  </div>
                ) : prediction ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <LevelCol
                        label="Now"
                        level={prediction.current_level}
                        accent="brand"
                      />
                      <LevelCol
                        label="+2 yrs"
                        level={prediction.predicted_level_2y}
                        accent="violet"
                      />
                      <LevelCol
                        label="+5 yrs"
                        level={prediction.predicted_level_5y}
                        accent="cyan"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-ink-subtle">
                          Confidence
                        </span>
                        <span className="text-[11px] font-mono text-ink">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                      <ScoreBar value={prediction.confidence} />
                    </div>

                    {prediction.reasoning && (
                      <div className="rounded-lg bg-bg-elevated/60 p-3 border border-bg-border">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Brain className="h-3 w-3 text-brand-400" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                            Reasoning
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          {prediction.reasoning}
                        </p>
                      </div>
                    )}

                    {prediction.growth_signals &&
                      prediction.growth_signals.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-1.5 flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Growth signals
                          </div>
                          <div className="space-y-1">
                            {prediction.growth_signals.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] text-ink"
                              >
                                <span className="text-accent-emerald mt-0.5">
                                  ↑
                                </span>
                                <span className="text-ink-muted">{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-xs text-ink-subtle italic">
                    Prediction unavailable.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resume */}
            {candidate.resume_text && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-ink-muted" /> Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-[11px] text-ink-muted leading-relaxed whitespace-pre-wrap font-sans max-h-[400px] overflow-y-auto">
                    {candidate.resume_text}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function LevelCol({
  label,
  level,
  accent,
}: {
  label: string;
  level: string;
  accent: "brand" | "violet" | "cyan";
}) {
  const accentClass =
    accent === "brand"
      ? "border-brand-500/30 bg-brand-500/10 text-brand-300"
      : accent === "violet"
        ? "border-accent-violet/30 bg-accent-violet/10 text-accent-violet"
        : "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan";

  return (
    <div className={cn("rounded-lg border p-3", accentClass)}>
      <div className="text-[9px] uppercase tracking-wider text-ink-subtle mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink truncate">{level}</div>
    </div>
  );
}

// Inline minimal FileText icon since it's not imported above
function FileText({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
