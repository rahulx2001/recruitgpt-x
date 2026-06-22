"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileText, User, Calendar, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Atoms";
import { useWorkspaceInterviews } from "@/lib/useWorkspaceInterviews";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";

const tone: Record<string, string> = {
  Scheduled: "badge--accent",
  "Awaiting feedback": "badge--warning",
  Completed: "badge--positive",
};

const groups = ["Scheduled", "Awaiting feedback", "Completed"] as const;
const VIEWS = ["Today", "Week", "Month"] as const;
type View = (typeof VIEWS)[number];

function candidateHref(candidateId: string) {
  const params = new URLSearchParams({ highlight: candidateId });
  return `/candidates?${params.toString()}`;
}

function matchesView(when: string, view: View): boolean {
  if (view === "Today") return when.startsWith("Today");
  if (view === "Week")
    return (
      when.startsWith("Today") ||
      when.startsWith("Tomorrow") ||
      when.includes("Mon") ||
      when.includes("Tue") ||
      when.includes("Wed") ||
      when.includes("Thu") ||
      when.includes("Fri")
    );
  return true;
}

export default function InterviewsPage() {
  const router = useRouter();
  const { data: stats } = useWorkspaceStats();
  const { data: interviews = [], isLoading, isError } = useWorkspaceInterviews();
  const [view, setView] = React.useState<View>("Today");
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const active = interviews.filter(
    (i) => !cancelledIds.has(i.id) && matchesView(i.when, view)
  );

  const scheduled = interviews.filter(
    (i) => i.status === "Scheduled" && !cancelledIds.has(i.id)
  ).length;
  const pending = interviews.filter(
    (i) => i.status === "Awaiting feedback"
  ).length;

  const subtitle = stats
    ? `${scheduled} scheduled across all roles · ${stats.scorecards_pending ?? pending} need scorecards`
    : isLoading
    ? "Loading interview pipeline…"
    : `${scheduled} scheduled · ${pending} need scorecards`;

  return (
    <AppShell
      title="Interviews"
      subtitle={subtitle}
      actions={
        <div className="flex items-center gap-1 p-1 rounded-lg bg-subtle border border-line">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 h-8 rounded-md text-[13px] font-medium transition-colors ${
                view === v
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Calendar size={14} className="inline mr-1.5 -mt-0.5" />
              {v}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && (
        <div className="card p-12 text-center text-ink-muted text-[14px]">
          Loading interviews from challenge candidates…
        </div>
      )}

      {isError && (
        <div className="card p-8 text-center">
          <p className="text-critical text-[14px] font-medium">
            Could not load interviews from API.
          </p>
          <p className="text-ink-faint text-[12px] mt-3">
            Ensure the backend is running on :8000 with imported candidates.
          </p>
        </div>
      )}

      {!isLoading && !isError && active.length === 0 && (
        <div className="card p-12 text-center text-ink-muted text-[14px]">
          No interviews in this view.{" "}
          <button
            type="button"
            className="text-accent font-medium"
            onClick={() => setView("Month")}
          >
            Show all
          </button>
        </div>
      )}

      {!isLoading && !isError && active.length > 0 && (
        <div className="space-y-7 max-w-4xl">
          {groups.map((g) => {
            const items = active.filter((i) => i.status === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[13px] font-semibold text-ink tracking-tight">
                    {g}
                  </h2>
                  <span className="badge badge--neutral">{items.length}</span>
                </div>
                <div className="card divide-y divide-line overflow-hidden">
                  {items.map((i) => (
                    <div
                      key={i.id}
                      className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-3.5 hover:bg-subtle transition-colors"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-4 flex-1 min-w-[200px] text-left"
                        onClick={() => router.push(candidateHref(i.candidate_id))}
                      >
                        <Avatar
                          name={i.candidate}
                          color={i.candidate_color}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold text-ink">
                            {i.candidate}
                          </div>
                          <div className="text-[12.5px] text-ink-muted truncate">
                            {i.round} · {i.role}
                          </div>
                        </div>
                      </button>
                      <div className="hidden sm:flex items-center gap-2 text-[12.5px] text-ink-muted">
                        <Avatar name={i.interviewer} color="#475569" size={22} />
                        {i.interviewer}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-secondary whitespace-nowrap">
                        <Clock size={13} className="text-ink-faint" />
                        {i.when}
                      </span>
                      <span className={`badge ${tone[i.status]}`}>{i.status}</span>
                      {i.status === "Scheduled" ? (
                        <>
                          <Link
                            href={candidateHref(i.candidate_id)}
                            className="btn btn--secondary btn--sm"
                          >
                            <User size={14} /> View profile
                          </Link>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setToast(`Reschedule request sent for ${i.candidate}`)
                            }
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className="h-8 w-8 grid place-items-center rounded-md border border-line text-ink-faint hover:text-critical hover:border-critical/30 transition-colors"
                            aria-label={`Cancel interview with ${i.candidate}`}
                            onClick={() => {
                              setCancelledIds((prev) => new Set(prev).add(i.id));
                              setToast(`Cancelled interview with ${i.candidate}`);
                            }}
                          >
                            <X size={15} />
                          </button>
                        </>
                      ) : i.status === "Awaiting feedback" ? (
                        <Link
                          href={candidateHref(i.candidate_id)}
                          className="btn btn--primary btn--sm"
                        >
                          <FileText size={14} /> Scorecard
                        </Link>
                      ) : (
                        <Link
                          href={candidateHref(i.candidate_id)}
                          className="badge badge--positive badge--dot hover:opacity-80 transition-opacity"
                        >
                          {i.recommendation || "Completed"}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="toast"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}