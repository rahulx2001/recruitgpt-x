"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowRight,
  Users,
  Briefcase,
  TrendingUp,
  Search,
  Check,
  MapPin,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, CandidateAvatar, Kpi } from "@/components/app/Atoms";
import {
  useWorkspaceShortlists,
  useWorkspaceSearchMeta,
} from "@/lib/useWorkspaceBundle";
import { api } from "@/lib/api";

type Shortlist = {
  id: string;
  job_id: string;
  name: string;
  job: string;
  owner: string;
  owner_color: string;
  department: string;
  location: string;
  status: string;
  strong_hire_count: number;
  interview_count: number;
  members: Array<{
    candidate_id: string;
    name: string;
    avatar_color: string;
    match_score: number;
    title: string;
    stage: string;
    recommendation: string;
  }>;
};

function avgScore(members: Shortlist["members"]): number {
  if (!members.length) return 0;
  return Math.round(
    members.reduce((sum, m) => sum + m.match_score, 0) / members.length
  );
}

function statusTone(status: string): string {
  if (status === "Interviewing") return "badge--info";
  if (status === "Offer stage") return "badge--positive";
  return "badge--neutral";
}

function ShortlistRoleCard({
  list,
  onOpen,
  onRemove,
  removing,
}: {
  list: Shortlist;
  onOpen: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const avg = avgScore(list.members);
  const preview = list.members.slice(0, 3);
  const remaining = Math.max(0, list.members.length - preview.length);

  return (
    <article className={`shortlist-card${removing ? " is-removing" : ""}`}>
      <div className="shortlist-card__head">
        <span className="shortlist-card__role-icon" aria-hidden>
          <Briefcase size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="shortlist-card__title">{list.job}</div>
            <span className={`badge ${statusTone(list.status)} shrink-0`}>
              {list.status}
            </span>
          </div>
          <div className="shortlist-card__job">
            {list.department}
            <span className="mx-1.5 text-ink-faint">·</span>
            <MapPin size={11} className="inline -mt-px mr-0.5" />
            {list.location}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="shortlist-card__remove"
            aria-label={`Delete ${list.job} and remove shortlist`}
            disabled={removing}
            onClick={onRemove}
          >
            <Trash2 size={14} />
          </button>
          <span className="badge badge--neutral tnum">
            {list.members.length}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="shortlist-card__main"
        onClick={onOpen}
        disabled={removing}
      >
        <div className="shortlist-card__body">
          <div className="shortlist-card__meta-row">
            <span className="shortlist-card__meta-pill">
              <Sparkles size={11} />
              {list.strong_hire_count} strong hire
              {list.strong_hire_count === 1 ? "" : "s"}
            </span>
            <span className="shortlist-card__meta-pill">
              {list.interview_count} in interview
            </span>
          </div>

          {list.members.length > 0 ? (
            <>
              <div className="shortlist-card__score-row">
                <div className="shortlist-card__score-track">
                  <div
                    className="shortlist-card__score-fill"
                    style={{ width: `${avg}%` }}
                  />
                </div>
                <span className="shortlist-card__score-label">
                  <strong>{avg}%</strong> avg match
                </span>
              </div>

              {preview.map((m) => (
                <div key={m.candidate_id} className="shortlist-card__member">
                  <CandidateAvatar name={m.name} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="shortlist-card__member-name">{m.name}</div>
                    <div className="shortlist-card__member-title">{m.title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="shortlist-card__member-score">
                      {m.match_score}
                    </div>
                    <div className="shortlist-card__member-stage">{m.stage}</div>
                  </div>
                </div>
              ))}
              {remaining > 0 && (
                <p className="shortlist-card__more">
                  +{remaining} more for this role
                </p>
              )}
            </>
          ) : (
            <p className="shortlist-card__empty">
              No finalists yet — open the job and run ranking to populate this
              shortlist.
            </p>
          )}
        </div>

        <div className="shortlist-card__foot">
          <span className="shortlist-card__owner">
            <Avatar name={list.owner} color={list.owner_color} size={22} />
            <span>{list.owner}</span>
          </span>
          <span className="text-action font-medium text-ink pointer-events-none">
            View role <ArrowRight size={13} />
          </span>
        </div>
      </button>
    </article>
  );
}

function ShortlistsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="metrics-row metrics-row--3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="kpi">
            <div className="skeleton h-3 w-20 mb-3" />
            <div className="skeleton h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="shortlist-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel p-5 space-y-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-2 w-full rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShortlistsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: lists = [], isLoading } = useWorkspaceShortlists();
  const { data: searchMeta } = useWorkspaceSearchMeta();
  const [toast, setToast] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const removeJob = useMutation({
    mutationFn: (jobId: string) => api.deleteJob(jobId),
    onMutate: (jobId) => setRemovingId(jobId),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-shortlists"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-jobs-overview"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-search-meta"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setToast("Job deleted — shortlist removed");
      setRemovingId(null);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("shortlist") === `shortlist-${jobId}`) {
          router.replace("/shortlists");
        }
      }
    },
    onError: (e) => {
      setToast((e as Error).message || "Could not delete job");
      setRemovingId(null);
    },
  });

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const openShortlist = React.useCallback(
    (id: string, highlight: string) => {
      const params = new URLSearchParams({ shortlist: id });
      if (highlight) params.set("highlight", highlight);
      router.push(`/candidates?${params.toString()}`);
    },
    [router]
  );

  const totalCandidates = lists.reduce((n, l) => n + l.members.length, 0);
  const strongHires = lists.reduce((n, l) => n + l.strong_hire_count, 0);
  const roleCount = lists.length;

  return (
    <AppShell
      title="Shortlists"
      subtitle="One finalist card per job — created automatically when you add a requisition"
      actions={
        <>
          <Link href="/candidates" className="btn btn--secondary btn--sm">
            <Users size={15} /> All candidates
          </Link>
          <Link href="/jobs/new" className="btn btn--primary btn--sm">
            <Plus size={15} /> New job
          </Link>
        </>
      }
    >
      {isLoading ? (
        <ShortlistsSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="metrics-row metrics-row--3">
            <Kpi
              label="Jobs with shortlists"
              value={String(roleCount)}
              hint="synced with requisitions"
              icon={Briefcase}
            />
            <Kpi
              label="Finalists curated"
              value={totalCandidates.toLocaleString()}
              hint="across all roles"
              icon={Users}
            />
            <Kpi
              label="Strong hire signals"
              value={strongHires > 0 ? String(strongHires) : "—"}
              hint="ranker confidence ≥ 88%"
              icon={TrendingUp}
            />
          </div>

          {lists.length > 0 ? (
            <div className="shortlist-grid">
              {lists.map((l) => (
                <ShortlistRoleCard
                  key={l.id}
                  list={l}
                  removing={removingId === l.job_id}
                  onOpen={() =>
                    openShortlist(l.id, l.members[0]?.candidate_id ?? "")
                  }
                  onRemove={() => {
                    if (
                      window.confirm(
                        `Delete "${l.job}"? This removes the job and its shortlist card.`
                      )
                    ) {
                      removeJob.mutate(l.job_id);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="panel panel__body text-center py-12">
              <p className="text-[14px] font-medium text-ink">No shortlists yet</p>
              <p className="text-[13px] text-ink-muted mt-1">
                Create a job to auto-generate a role shortlist card.
              </p>
              <Link href="/jobs/new" className="btn btn--primary btn--sm mt-4">
                <Plus size={15} /> Create job
              </Link>
            </div>
          )}

          {searchMeta && searchMeta.saved.length > 0 && (
            <div className="panel">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Saved role searches</h2>
                  <p className="panel__subtitle">
                    Quick filters synced with your workspace requisitions
                  </p>
                </div>
                <Link href="/search" className="text-action">
                  <Search size={13} /> Search
                </Link>
              </div>
              <div className="panel__body panel__body--list">
                <div className="panel__list">
                  {searchMeta.saved.map((s) => (
                    <Link
                      key={s.name}
                      href={`/search?q=${encodeURIComponent(s.query)}`}
                      className="saved-search-row"
                    >
                      <span className="saved-search-row__check" aria-hidden>
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                      <span className="saved-search-row__name">{s.name}</span>
                      <span className="saved-search-row__count">
                        {s.count} matches
                      </span>
                      <span className="saved-search-row__meta">{s.owner}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </AppShell>
  );
}