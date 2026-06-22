"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Clock, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Dropdown, DropdownItem } from "@/components/app/Dropdown";
import { EmptyState, JobCardsSkeleton } from "@/components/app/LoadingStates";
import { useWorkspaceJobsOverview } from "@/lib/useWorkspaceBundle";
import { api } from "@/lib/api";
import { FUNNEL_STAGE_COLORS } from "@/lib/funnelColors";

const statusTone: Record<string, string> = {
  Open: "badge--info",
  Interviewing: "badge--accent",
  "Offer stage": "badge--warning",
};

export default function JobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading, isError } = useWorkspaceJobsOverview();
  const totalCandidates = jobs[0]?.candidate_count ?? 0;
  const [pausedIds, setPausedIds] = React.useState<Set<string>>(() => new Set());
  const [archivedIds, setArchivedIds] = React.useState<Set<string>>(() => new Set());
  const [toast, setToast] = React.useState<string | null>(null);

  const duplicate = useMutation({
    mutationFn: (job: (typeof jobs)[0]) =>
      api.createJob({
        title: `${job.title} (Copy)`,
        description: `Duplicate of ${job.title}. Challenge pool role with ${job.candidate_count} ranked candidates.`,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-jobs-overview"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setToast(`Duplicated → ${created.title}`);
      router.push(`/jobs/${created.id}`);
    },
    onError: (e) => setToast((e as Error).message || "Duplicate failed"),
  });

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const visibleJobs = jobs.filter((j) => !archivedIds.has(j.id));

  return (
    <AppShell
      title="Jobs"
      subtitle={
        isLoading
          ? "Loading requisitions…"
          : `${visibleJobs.length} open requisitions · ${totalCandidates} candidates in challenge pool`
      }
      actions={
        <Link href="/jobs/new" className="btn btn--primary btn--sm">
          <Plus size={15} /> New job
        </Link>
      }
    >
      {isError && (
        <div className="card p-8 text-center text-critical text-[14px]">
          Could not load jobs from API.
        </div>
      )}

      {isLoading && <JobCardsSkeleton />}

      {!isLoading && !isError && visibleJobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          description="Create your first requisition to start ranking candidates."
          action={
            <Link href="/jobs/new" className="btn btn--primary btn--sm">
              <Plus size={15} /> Create job
            </Link>
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleJobs.map((j) => {
          const total =
            j.stages.applied +
            j.stages.screened +
            j.stages.interview +
            j.stages.offer;
          const segs = [
            { v: j.stages.applied, c: FUNNEL_STAGE_COLORS.Applied, label: "Applied" },
            { v: j.stages.screened, c: FUNNEL_STAGE_COLORS.Screened, label: "Screened" },
            { v: j.stages.interview, c: FUNNEL_STAGE_COLORS.Interview, label: "Interview" },
            { v: j.stages.offer, c: FUNNEL_STAGE_COLORS.Offer, label: "Offer" },
          ];
          const isPaused = pausedIds.has(j.id);

          return (
            <div
              key={j.id}
              className={`card card--hover p-5 ${isPaused ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/jobs/${j.id}`} className="flex-1 min-w-0 block">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-[16px] font-semibold text-ink tracking-tight">
                      {j.title}
                    </h3>
                    <span
                      className={`badge ${statusTone[isPaused ? "Open" : j.status] ?? "badge--info"} badge--dot`}
                    >
                      {isPaused ? "Paused" : j.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-muted mt-1">
                    Challenge pool · {j.candidate_count} ranked candidates
                  </p>
                </Link>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      className="h-8 w-8 grid place-items-center rounded-md text-ink-faint hover:bg-subtle hover:text-ink transition-colors shrink-0"
                      aria-label={`Actions for ${j.title}`}
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  }
                >
                  <DropdownItem onClick={() => router.push(`/jobs/${j.id}`)}>
                    Edit
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      if (!duplicate.isPending) duplicate.mutate(j);
                    }}
                  >
                    {duplicate.isPending ? "Duplicating…" : "Duplicate"}
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      setPausedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(j.id)) next.delete(j.id);
                        else next.add(j.id);
                        return next;
                      });
                      setToast(
                        isPaused
                          ? `Resumed ${j.title}`
                          : `Paused ${j.title}`
                      );
                    }}
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </DropdownItem>
                  <DropdownItem
                    destructive
                    onClick={() => {
                      setArchivedIds((prev) => new Set(prev).add(j.id));
                      setToast(`Archived ${j.title}`);
                    }}
                  >
                    Archive
                  </DropdownItem>
                </Dropdown>
              </div>

              <Link href={`/jobs/${j.id}`} className="block mt-5">
                <div className="flex h-2 rounded-full overflow-hidden bg-subtle">
                  {segs.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        width: total > 0 ? `${(s.v / total) * 100}%` : "0%",
                        background: s.c,
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                  {segs.map((s) => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: s.c }}
                      />
                      {s.label}
                      <span className="font-semibold text-ink-secondary tnum">
                        {s.v}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary">
                      <Users size={14} className="text-ink-faint" />
                      <span className="font-semibold tnum">
                        {j.candidate_count}
                      </span>
                      in pool
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <Clock size={14} className="text-ink-faint" />
                      {j.days_open}d open
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </AppShell>
  );
}