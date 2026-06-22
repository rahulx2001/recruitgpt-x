"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { Sparkles, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HiringBlueprint } from "@/lib/types";

const SAMPLE_JD = `Senior Machine Learning Engineer

We are looking for a Senior ML Engineer to join our FinTech platform team. You will design, build, and deploy ML systems that power real-time fraud detection, credit risk modeling, and personalized financial recommendations.

Responsibilities:
- Build and maintain production ML pipelines (training, deployment, monitoring)
- Collaborate with data engineering and product teams
- Mentor junior engineers and contribute to architecture decisions
- Push for fast iteration in a startup-paced environment

Required:
- 5+ years of experience with Python and PyTorch or TensorFlow
- Strong SQL and data engineering fundamentals
- Experience deploying ML models to production at scale
- AWS or GCP cloud experience
- Excellent communication skills

Nice to have:
- Experience in FinTech, fraud detection, or risk modeling
- Open-source contributions
- Startup or scale-up background
- Leadership of small teams

This is a fast-track-to-Staff role with significant growth opportunity.`;

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Senior Machine Learning Engineer");
  const [description, setDescription] = useState(SAMPLE_JD);
  const [blueprint, setBlueprint] = useState<HiringBlueprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parseBlueprint() {
    setLoading(true);
    setError(null);
    try {
      const bp = await api.parseJD(title, description);
      setBlueprint(bp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  async function createAndRank() {
    setCreating(true);
    setError(null);
    try {
      const job = await api.createJob({ title, description, blueprint: blueprint ?? undefined });
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setCreating(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink mb-2">Create New Job</h1>
          <p className="text-ink-muted">
            Paste a job description. Agent 1 will extract a structured hiring blueprint.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-ink-muted">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior ML Engineer"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={parseBlueprint} disabled={loading || !description} variant="outline">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Parsing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" /> Analyze with Agent 1
                      </>
                    )}
                  </Button>
                  <Button onClick={createAndRank} disabled={creating || !description}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        Create & Rank <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <AnimatePresence mode="wait">
              {blueprint ? (
                <motion.div
                  key="blueprint"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-accent-cyan" />
                          Hiring Blueprint
                        </CardTitle>
                        <Badge variant="cyan">Agent 1 output</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Row label="Seniority" value={blueprint.seniority} />
                      <Row label="Industry" value={blueprint.industry} />
                      <Row label="Min Years" value={String(blueprint.years_experience_min)} />
                      <Row label="Leadership" value={blueprint.leadership_requirement} />
                      <Row label="Communication" value={blueprint.communication_requirement} />

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">
                          Hard Skills
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {blueprint.hard_skills.map((s, i) => (
                            <Badge key={i} variant="brand">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">
                          Hidden Requirements
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {blueprint.hidden_requirements.map((s, i) => (
                            <Badge key={i} variant="amber">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-1">
                          Domain Keywords
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {blueprint.domain_keywords.map((s, i) => (
                            <Badge key={i} variant="cyan">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      {blueprint.growth_expectation && (
                        <div className="text-xs text-ink-muted italic border-l-2 border-brand-500/40 pl-3">
                          {blueprint.growth_expectation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-dashed border-bg-border bg-bg-surface/20 p-12 text-center"
                >
                  <Sparkles className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
                  <div className="text-sm text-ink-muted">
                    Click <strong className="text-ink">Analyze with Agent 1</strong> to extract a hiring blueprint.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-bg-border/50 pb-2">
      <span className="text-[10px] uppercase tracking-wider text-ink-subtle">{label}</span>
      <span className="text-sm font-medium text-ink truncate ml-2">{value || "—"}</span>
    </div>
  );
}
