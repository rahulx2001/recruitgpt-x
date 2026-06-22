"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Sparkles, Briefcase, GraduationCap, Users, TrendingUp } from "lucide-react";
import type { HiringBlueprint } from "@/lib/types";

export function HiringBlueprintCard({ blueprint }: { blueprint: HiringBlueprint }) {
  return (
    <Card className="overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-cyan" />
            Hiring Blueprint
          </CardTitle>
          <Badge variant="cyan">Agent 1 output</Badge>
        </div>
        <p className="text-xs text-ink-muted">
          Structured interpretation of the job description.
        </p>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Seniority" value={blueprint.seniority} icon={TrendingUp} />
          <Stat label="Industry" value={blueprint.industry} icon={Briefcase} />
          <Stat label="Min Years" value={String(blueprint.years_experience_min)} icon={GraduationCap} />
          <Stat label="Leadership" value={blueprint.leadership_requirement} icon={Users} />
        </div>

        <Section title="Hard Skills" badges={blueprint.hard_skills} variant="brand" />
        <Section title="Soft Skills" badges={blueprint.soft_skills} variant="violet" />
        <Section title="Domain Keywords" badges={blueprint.domain_keywords} variant="cyan" />

        {blueprint.hidden_requirements.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg bg-amber-50 border border-amber-200 p-3"
          >
            <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
              🔍 Hidden Requirements
              <span className="text-[10px] font-normal text-ink-subtle">
                (inferred, not stated)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {blueprint.hidden_requirements.map((r, i) => (
                <Badge key={i} variant="amber" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {blueprint.growth_expectation && (
          <div className="text-xs text-ink-muted italic border-l-2 border-brand-500/40 pl-3">
            Growth trajectory: <span className="text-ink">{blueprint.growth_expectation}</span>
          </div>
        )}

        {blueprint.reasoning && (
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer text-ink-subtle hover:text-ink">
              Agent reasoning
            </summary>
            <p className="mt-2 leading-relaxed">{blueprint.reasoning}</p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-elevated/40 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-ink-subtle" />
        <span className="text-[10px] uppercase tracking-wider text-ink-subtle">{label}</span>
      </div>
      <div className="text-sm font-semibold text-ink truncate">{value || "—"}</div>
    </div>
  );
}

function Section({
  title,
  badges,
  variant,
}: {
  title: string;
  badges: string[];
  variant: "brand" | "violet" | "cyan" | "amber" | "emerald";
}) {
  if (badges.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-1.5">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b, i) => (
          <Badge key={i} variant={variant} className="text-[11px]">
            {b}
          </Badge>
        ))}
      </div>
    </div>
  );
}
