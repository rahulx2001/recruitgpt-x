"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WhatIfPlayground } from "@/components/WhatIfPlayground";
import { JobPicker } from "@/components/JobSelector";
import { GitBranch, Sparkles, Zap, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";

export default function WhatIfPage() {
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: !!jobId,
  });

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="amber">
              <GitBranch className="h-3 w-3" /> What-If
            </Badge>
            <Badge variant="cyan">
              <Sparkles className="h-3 w-3" /> Live re-ranking
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-ink mb-1">
            What-If Playground
          </h1>
          <p className="text-sm text-ink-muted max-w-3xl">
            Modify requirements and watch rankings shift in real time. Drop a skill,
            add a new one, or change seniority — the 7-agent pipeline re-runs against
            your new hiring blueprint.
          </p>
        </div>

        {/* Three-step explainer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[11px] font-mono flex items-center justify-center">
                  1
                </div>
                <span className="text-xs font-semibold text-ink">Modify blueprint</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Toggle required skills, add new ones, or change seniority.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[11px] font-mono flex items-center justify-center">
                  2
                </div>
                <span className="text-xs font-semibold text-ink">Re-run pipeline</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                The 7-agent stack re-evaluates every candidate under the new rules.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[11px] font-mono flex items-center justify-center">
                  3
                </div>
                <span className="text-xs font-semibold text-ink">Compare rankings</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                See which candidates rise, fall, or get pushed out of the shortlist.
              </p>
            </CardContent>
          </Card>
        </div>

        {!jobId ? (
          <JobPicker selectedId={jobId} onSelect={setJobId} />
        ) : job?.blueprint ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">{job.title}</h2>
                <p className="text-[11px] text-ink-muted">
                  Base blueprint loaded — modify below to re-rank.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJobId(null)}
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Switch job
              </Button>
            </div>
            <WhatIfPlayground jobId={jobId} originalBlueprint={job.blueprint} />
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
              <div className="text-sm text-ink-muted">
                This job doesn't have a blueprint yet.
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
