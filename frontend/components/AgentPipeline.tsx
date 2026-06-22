"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  FileSearch,
  User,
  Activity,
  TrendingUp,
  Sparkles,
  Award,
  MessageSquareQuote,
  Check,
} from "lucide-react";

const AGENTS = [
  { id: 1, name: "Job Understanding", icon: FileSearch, color: "#5e4cff" },
  { id: 2, name: "Candidate Intelligence", icon: User, color: "#5e4cff" },
  { id: 3, name: "Behavioral Intelligence", icon: Activity, color: "#16a34a" },
  { id: 4, name: "Career Trajectory", icon: TrendingUp, color: "#d97706" },
  { id: 5, name: "Semantic Matching", icon: Sparkles, color: "#5e4cff" },
  { id: 6, name: "Ranking", icon: Award, color: "#5e4cff" },
  { id: 7, name: "Explainability", icon: MessageSquareQuote, color: "#5e4cff" },
];

export function AgentPipeline({ active = true }: { active?: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (AGENTS.length + 1)), 700);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div className="rounded-xl border border-bg-border bg-bg-surface p-5 md:p-6">
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h3 className="text-sm font-display font-semibold text-ink">Multi-Agent Pipeline</h3>
          <p className="text-xs text-ink-subtle mt-0.5">7 specialized AI agents working in concert</p>
        </div>
        <span className="text-[10px] font-mono text-ink-subtle uppercase">{active ? "Running" : "Idle"}</span>
      </div>

      <div className="hidden lg:grid grid-cols-7 gap-2 relative mb-4">
        <div className="absolute top-7 left-7 right-7 h-px bg-bg-border" />
        <div
          className="absolute top-7 left-7 h-px bg-brand transition-all duration-500"
          style={{ width: `calc(${(step / AGENTS.length) * 100}% - 56px)` }}
        />
        {AGENTS.map((a, i) => (
          <AgentNode key={a.id} agent={a} reached={i < step} current={i === step - 1} />
        ))}
      </div>

      <div className="lg:hidden overflow-x-auto pb-1">
        <div className="flex gap-3 min-w-max">
          {AGENTS.map((a, i) => (
            <AgentNode key={a.id} agent={a} reached={i < step} current={i === step - 1} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentNode({
  agent: a,
  reached,
  current,
  compact,
}: {
  agent: (typeof AGENTS)[number];
  reached: boolean;
  current: boolean;
  compact?: boolean;
}) {
  const Icon = a.icon;
  return (
    <div className={cn("flex flex-col items-center gap-2 relative z-10", compact && "w-16")}>
      <div
        className={cn(
          "rounded-lg border flex items-center justify-center transition-colors duration-150",
          compact ? "h-11 w-11" : "h-14 w-14",
          reached ? "border-emerald-300 bg-emerald-50 text-emerald-700" : current ? "border-brand-200 bg-brand-50 text-brand" : "border-bg-border bg-bg-elevated text-ink-subtle",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {reached && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent-emerald flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>
      <span className="text-[10px] font-mono text-ink-subtle">#{a.id}</span>
    </div>
  );
}