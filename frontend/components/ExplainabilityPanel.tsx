"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { CheckCircle2, AlertCircle, Lightbulb, MessageSquareQuote, Brain, TrendingUp } from "lucide-react";
import { ScoreBar } from "./ui/Score";
import type { RankedCandidate } from "@/lib/types";

export function ExplainabilityPanel({ rc }: { rc: RankedCandidate }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-lg bg-bg-elevated/60 p-4 border border-bg-border">
        <div className="flex items-start gap-2 mb-2">
          <Brain className="h-4 w-4 text-brand-400 mt-0.5" />
          <div className="text-xs font-semibold text-ink uppercase tracking-wider">
            Agent 7 — Explanation
          </div>
        </div>
        <p className="text-sm text-ink leading-relaxed">{rc.explanation.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Strengths */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {rc.explanation.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-ink">
                <span className="text-emerald-400 mt-0.5">+</span>
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Risks / Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {rc.explanation.weaknesses.length > 0 ? (
              rc.explanation.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-ink">
                  <span className="text-amber-400 mt-0.5">−</span>
                  <span>{w}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-ink-subtle italic">No critical gaps identified.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Behavioral & Trajectory */}
      {(rc.behavioral || rc.trajectory) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rc.behavioral && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-accent-cyan" />
                  Behavioral Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <BehaviorRow label="Growth" value={rc.behavioral.growth_score} />
                <BehaviorRow label="Consistency" value={rc.behavioral.consistency_score} />
                <BehaviorRow label="Learning" value={rc.behavioral.learning_score} />
                <BehaviorRow label="Initiative" value={rc.behavioral.initiative_score} />
                {rc.behavioral.reasoning && (
                  <p className="text-[11px] text-ink-muted mt-2 italic">{rc.behavioral.reasoning}</p>
                )}
              </CardContent>
            </Card>
          )}
          {rc.trajectory && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-accent-amber" />
                  Career Trajectory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="amber">{rc.trajectory.trajectory_type}</Badge>
                  <span className="text-[11px] text-ink-muted">
                    Future potential: {Math.round(rc.trajectory.future_potential * 100)}%
                  </span>
                </div>
                <BehaviorRow label="Growth velocity" value={rc.trajectory.growth_velocity} />
                <BehaviorRow label="Adaptability" value={rc.trajectory.adaptability} />
                <BehaviorRow label="Future potential" value={rc.trajectory.future_potential} />
                {rc.trajectory.timeline_summary && (
                  <p className="text-[10px] text-ink-subtle mt-2 font-mono">{rc.trajectory.timeline_summary}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Interview focus + talking points */}
      {(rc.explanation.interview_focus_areas.length > 0 || rc.explanation.hiring_manager_talking_points.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rc.explanation.interview_focus_areas.length > 0 && (
            <div className="rounded-lg border border-bg-border bg-bg-elevated/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-ink">Interview Focus Areas</span>
              </div>
              <ul className="space-y-1">
                {rc.explanation.interview_focus_areas.map((a, i) => (
                  <li key={i} className="text-xs text-ink-muted pl-3 border-l border-amber-500/30">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rc.explanation.hiring_manager_talking_points.length > 0 && (
            <div className="rounded-lg border border-bg-border bg-bg-elevated/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquareQuote className="h-3.5 w-3.5 text-brand-400" />
                <span className="text-xs font-semibold text-ink">Talking Points</span>
              </div>
              <ul className="space-y-1">
                {rc.explanation.hiring_manager_talking_points.map((a, i) => (
                  <li key={i} className="text-xs text-ink-muted pl-3 border-l border-brand-500/30">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BehaviorRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-ink-muted">{label}</span>
        <span className="text-[10px] font-mono text-ink">{Math.round(value * 100)}%</span>
      </div>
      <ScoreBar value={value} height={3} />
    </div>
  );
}
