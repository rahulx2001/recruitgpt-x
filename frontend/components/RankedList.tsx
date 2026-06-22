"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, Github, Linkedin, ExternalLink, Award, Sparkles, Target, Brain } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { ScoreBar, ScoreRing } from "./ui/Score";
import { ExplainabilityPanel } from "./ExplainabilityPanel";
import { initials, cn } from "@/lib/utils";
import type { RankedCandidate } from "@/lib/types";

export function CandidateRow({
  rc,
  isSelected,
  onSelect,
  index,
}: {
  rc: RankedCandidate;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Card
        className={cn(
          "p-5 transition-all hover:border-brand-200 cursor-pointer",
          isSelected && "border-brand-200 bg-brand-50 shadow-card"
        )}
        onClick={onSelect}
      >
        <div className="flex items-start gap-4">
          {/* Rank badge */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm",
                rc.rank === 1 && "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/30",
                rc.rank === 2 && "bg-gradient-to-br from-slate-300 to-slate-500 text-black shadow-lg shadow-slate-400/30",
                rc.rank === 3 && "bg-gradient-to-br from-orange-400 to-orange-700 text-white shadow-lg shadow-orange-500/30",
                rc.rank > 3 && "bg-bg-elevated text-ink-muted border border-bg-border"
              )}
            >
              #{rc.rank}
            </div>
          </div>

          {/* Avatar */}
          <div className="relative h-12 w-12 rounded-full bg-brand flex items-center justify-center font-semibold text-white shrink-0">
            {initials(rc.candidate_name)}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-ink truncate">{rc.candidate_name}</h4>
                  {rc.trajectory?.trajectory_type === "accelerating" && (
                    <Badge variant="emerald" className="text-[10px]">↑ Accelerating</Badge>
                  )}
                  {rc.behavioral && rc.behavioral.composite >= 0.75 && (
                    <Badge variant="cyan" className="text-[10px]">
                      <Sparkles className="h-2.5 w-2.5" /> High signal
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5 truncate">{rc.explanation.summary}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-subtle">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {rc.sub_scores.skill_match >= 0.7 ? "Strong" : rc.sub_scores.skill_match >= 0.4 ? "Partial" : "Weak"} skill match
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {rc.sub_scores.semantic >= 0.8 ? "Excellent" : rc.sub_scores.semantic >= 0.6 ? "Good" : "Fair"} semantic fit
                  </span>
                  {rc.behavioral && (
                    <span>
                      Behavioral {Math.round(rc.behavioral.composite * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Hireability score */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ScoreRing value={rc.hireability_score} size={56} stroke={4} />
                <div className="text-[9px] uppercase tracking-wider text-ink-subtle">Hireability</div>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <SubScore label="Skills" value={rc.sub_scores.skill_match} />
              <SubScore label="Projects" value={rc.sub_scores.project_relevance} />
              <SubScore label="Career" value={rc.sub_scores.career_growth} />
              <SubScore label="Semantic" value={rc.sub_scores.semantic} />
            </div>
          </div>
        </div>

        {/* Expanded explainability */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 pt-5 border-t border-bg-border"
          >
            <ExplainabilityPanel rc={rc} />
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-wider text-ink-subtle">{label}</span>
        <span className="text-[10px] font-mono text-ink-muted">{Math.round(value * 100)}%</span>
      </div>
      <ScoreBar value={value} height={4} />
    </div>
  );
}

export function RankedList({ candidates }: { candidates: RankedCandidate[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    candidates[0]?.candidate_id ?? null
  );

  return (
    <div className="space-y-3">
      {candidates.map((rc, i) => (
        <CandidateRow
          key={rc.candidate_id}
          rc={rc}
          isSelected={selectedId === rc.candidate_id}
          onSelect={() =>
            setSelectedId(selectedId === rc.candidate_id ? null : rc.candidate_id)
          }
          index={i}
        />
      ))}
    </div>
  );
}
