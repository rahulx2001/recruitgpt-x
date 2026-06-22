"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, RefreshCcw, Sparkles, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { api } from "@/lib/api";
import { Input } from "./ui/Input";
import { RankedList } from "./RankedList";
import type { HiringBlueprint, RankingResult } from "@/lib/types";

export function WhatIfPlayground({
  jobId,
  originalBlueprint,
}: {
  jobId: string;
  originalBlueprint: HiringBlueprint;
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [seniority, setSeniority] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [result, setResult] = useState<RankingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleSkills = originalBlueprint.hard_skills.filter((s) => !removed.includes(s));

  function toggleSkill(skill: string) {
    setRemoved((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
    setResult(null);
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    if (!added.includes(newSkill.trim())) {
      setAdded((prev) => [...prev, newSkill.trim()]);
      setRemoved((prev) => prev.filter((s) => s !== newSkill.trim()));
    }
    setNewSkill("");
    setResult(null);
  }

  async function runWhatIf() {
    setLoading(true);
    setError(null);
    try {
      const r = await api.whatIf(jobId, {
        removed_skills: removed,
        added_skills: added,
        seniority_override: seniority,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "What-if failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRemoved([]);
    setAdded([]);
    setSeniority(null);
    setResult(null);
  }

  const hasChanges = removed.length > 0 || added.length > 0 || seniority;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            What-If Playground
          </CardTitle>
          <p className="text-xs text-ink-muted">
            Modify requirements and see how rankings shift in real time.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Required skills */}
          <div>
            <div className="text-xs font-semibold text-ink mb-2">
              Required Skills{" "}
              <span className="text-ink-subtle font-normal">
                ({visibleSkills.length}/{originalBlueprint.hard_skills.length + added.length} active)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {originalBlueprint.hard_skills.map((skill) => {
                const removedFlag = removed.includes(skill);
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-all ${
                      removedFlag
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300 line-through"
                        : "bg-brand-500/10 border-brand-500/30 text-brand-300 hover:bg-brand-500/20"
                    }`}
                  >
                    {skill}
                    {removedFlag ? (
                      <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    ) : (
                      <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
              {added.map((skill) => (
                <button
                  key={skill}
                  onClick={() => {
                    setAdded((prev) => prev.filter((s) => s !== skill));
                    setResult(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                >
                  + {skill}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add new required skill..."
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={addSkill}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Seniority */}
          <div>
            <div className="text-xs font-semibold text-ink mb-2">Seniority</div>
            <div className="flex flex-wrap gap-1.5">
              {["Intern", "Junior", "Mid", "Senior", "Staff", "Principal"].map((level) => {
                const current = (seniority ?? originalBlueprint.seniority) === level;
                return (
                  <button
                    key={level}
                    onClick={() =>
                      setSeniority(seniority === level ? null : level)
                    }
                    className={`rounded-full px-3 py-1 text-xs border transition-all ${
                      current
                        ? "bg-brand-500/20 border-brand-400 text-brand-200"
                        : "bg-bg-elevated border-bg-border text-ink-muted hover:border-brand-400/40"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-bg-border">
            <div className="text-xs text-ink-muted">
              {removed.length > 0 && <Badge variant="rose" className="mr-1">-{removed.length} removed</Badge>}
              {added.length > 0 && <Badge variant="emerald" className="mr-1">+{added.length} added</Badge>}
              {seniority && <Badge variant="brand" className="mr-1">{seniority}</Badge>}
              {!hasChanges && <span>No changes yet</span>}
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
              <Button onClick={runWhatIf} disabled={loading || !hasChanges} size="sm">
                <Sparkles className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Re-ranking..." : "Run What-If"}
              </Button>
            </div>
          </div>
          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">What-If Result</h3>
                <p className="text-xs text-ink-muted">Rankings re-computed with modified requirements</p>
              </div>
              <Badge variant="brand">Modified</Badge>
            </div>
            <RankedList candidates={result.ranked_candidates} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
