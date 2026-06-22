"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Briefcase, ArrowRight, Loader2 } from "lucide-react";

/**
 * Auto-redirect helper: if the user lands on a standalone page
 * (chat/whatif/radar) with no job selected, push them to the first job.
 *
 * Use as:
 *   <JobSelectorGuard>{children}</JobSelectorGuard>
 */
export function JobSelectorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
  });

  // No redirect — children always render; standalone pages manage their own
  // job picker via <JobPicker />.
  useEffect(() => {
    // Reserved hook for future analytics/tracking. No-op.
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Inline picker that lists jobs and lets the user choose one to scope the page.
 * Uses query-string so URLs are shareable. Pure client-side; works without backend.
 */
export function JobPicker({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-ink-muted text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs...
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Briefcase className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
          <div className="text-sm text-ink-muted mb-4">No jobs yet.</div>
          <a href="/jobs/new">
            <span className="text-xs text-brand-300 hover:underline">
              Create your first job →
            </span>
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-brand-400" />
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">
            Choose a job to scope this view
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => onSelect(j.id)}
              className={`group text-left rounded-lg border p-3 transition-all hover:scale-[1.01] ${
                selectedId === j.id
                  ? "border-brand-400/60 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                  : "border-bg-border bg-bg-elevated/40 hover:border-brand-400/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-ink truncate">
                    {j.title}
                  </div>
                  <div className="text-[10px] text-ink-subtle mt-0.5 truncate">
                    {j.blueprint?.seniority || "—"} ·{" "}
                    {j.blueprint?.hard_skills?.slice(0, 3).join(", ") || "—"}
                  </div>
                </div>
                <ArrowRight
                  className={`h-4 w-4 shrink-0 mt-0.5 transition-all ${
                    selectedId === j.id
                      ? "text-brand-400 translate-x-0"
                      : "text-ink-subtle group-hover:text-brand-400 group-hover:translate-x-1"
                  }`}
                />
              </div>
              {j.blueprint && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {j.blueprint.hard_skills?.slice(0, 4).map((s, i) => (
                    <Badge key={i} variant="default" className="text-[9px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
