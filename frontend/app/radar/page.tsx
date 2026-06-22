"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Score";
import { CandidateRadar } from "@/components/CandidateRadar";
import { JobPicker } from "@/components/JobSelector";
import {
  Radar as RadarIcon,
  Sparkles,
  RefreshCcw,
  Loader2,
  Target,
  Activity,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { initials } from "@/lib/utils";

export default function RadarPage() {
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["ranking", jobId],
    queryFn: () => api.rankJob(jobId!),
    enabled: !!jobId,
    staleTime: 5 * 60_000,
  });

  const { data: job } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId!),
    enabled: !!jobId,
  });

  const allSkills = Array.from(
    new Set([
      ...(job?.blueprint?.hard_skills ?? []),
      ...(job?.blueprint?.domain_keywords ?? []),
    ])
  );

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan">
              <RadarIcon className="h-3 w-3" /> Visualization
            </Badge>
            <Badge variant="violet">
              <Sparkles className="h-3 w-3" /> Semantic space
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-ink mb-1">Candidate Radar</h1>
          <p className="text-sm text-ink-muted max-w-3xl">
            Force-directed similarity graph with skill clusters, convex hull
            boundaries, and cyan edges showing peer similarity strength.
          </p>
        </div>

        {!jobId ? (
          <JobPicker selectedId={jobId} onSelect={setJobId} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  {job?.title ?? "Loading..."}
                </h2>
                <p className="text-[11px] text-ink-muted">
                  {ranking?.ranked_candidates.length ?? 0} candidates plotted
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setJobId(null)}>
                <RefreshCcw className="h-3.5 w-3.5" /> Switch job
              </Button>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="py-12 flex items-center justify-center gap-2 text-ink-muted text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Computing semantic space…
                </CardContent>
              </Card>
            ) : ranking ? (
              <>
                {/* The radar */}
                <Card>
                  <CardContent className="py-5">
                    <CandidateRadar
                      ranked={ranking.ranked_candidates}
                      jobSkills={allSkills}
                    />
                  </CardContent>
                </Card>

                {/* Top 5 cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {ranking.ranked_candidates.slice(0, 5).map((rc) => (
                    <Card key={rc.candidate_id} className="hover:border-brand-400/40 transition-all">
                      <CardContent className="py-4 text-center">
                        <div className="flex justify-center mb-2">
                          <ScoreRing value={rc.hireability_score} size={56} stroke={4} />
                        </div>
                        <div className="h-10 w-10 mx-auto rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center font-semibold text-white text-xs mb-2">
                          {initials(rc.candidate_name)}
                        </div>
                        <div className="font-semibold text-sm text-ink truncate">
                          {rc.candidate_name}
                        </div>
                        <div className="text-[10px] text-ink-subtle mt-0.5">
                          Rank #{rc.rank}
                        </div>
                        <div className="mt-3 pt-3 border-t border-bg-border/50 grid grid-cols-2 gap-1 text-[10px]">
                          <div>
                            <div className="text-ink-subtle">Skills</div>
                            <div className="font-mono text-ink">
                              {Math.round(rc.sub_scores.skill_match * 100)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-ink-subtle">Semantic</div>
                            <div className="font-mono text-ink">
                              {Math.round(rc.sub_scores.semantic * 100)}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Cluster summary */}
                <Card>
                  <CardContent className="py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-brand-400" />
                      <h3 className="text-sm font-semibold text-ink">
                        Shortlist Clusters
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Cluster
                        title="Top tier"
                        icon={Target}
                        color="amber"
                        desc="Strong fit across most signals"
                        candidates={ranking.ranked_candidates.filter(
                          (c) => c.hireability_score >= 0.7
                        )}
                      />
                      <Cluster
                        title="Mid tier"
                        icon={Activity}
                        color="cyan"
                        desc="Solid on some signals, gaps on others"
                        candidates={ranking.ranked_candidates.filter(
                          (c) => c.hireability_score >= 0.5 && c.hireability_score < 0.7
                        )}
                      />
                      <Cluster
                        title="Stretch"
                        icon={Sparkles}
                        color="violet"
                        desc="Could surprise with the right setup"
                        candidates={ranking.ranked_candidates.filter(
                          (c) => c.hireability_score < 0.5
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}

function Cluster({
  title,
  icon: Icon,
  color,
  desc,
  candidates,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "amber" | "cyan" | "violet";
  desc: string;
  candidates: { candidate_name: string; hireability_score: number; candidate_id: string }[];
}) {
  const accent =
    color === "amber"
      ? "border-accent-amber/30 bg-accent-amber/5"
      : color === "cyan"
      ? "border-accent-cyan/30 bg-accent-cyan/5"
      : "border-accent-violet/30 bg-accent-violet/5";

  return (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold text-ink">{title}</span>
        <Badge variant={color} className="text-[9px] ml-auto">
          {candidates.length}
        </Badge>
      </div>
      <p className="text-[10px] text-ink-muted mb-2 italic">{desc}</p>
      <div className="space-y-1">
        {candidates.slice(0, 4).map((c) => (
          <div
            key={c.candidate_id}
            className="flex items-center justify-between text-[11px]"
          >
            <span className="text-ink truncate">{c.candidate_name}</span>
            <span className="font-mono text-ink-subtle">
              {Math.round(c.hireability_score * 100)}%
            </span>
          </div>
        ))}
        {candidates.length > 4 && (
          <div className="text-[10px] text-ink-subtle italic pt-1">
            +{candidates.length - 4} more
          </div>
        )}
        {candidates.length === 0 && (
          <div className="text-[10px] text-ink-subtle italic">No candidates</div>
        )}
      </div>
    </div>
  );
}
