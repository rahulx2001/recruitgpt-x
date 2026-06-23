"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Clock,
  FileText,
  Plus,
  ArrowRight,
  X,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, CandidateAvatar, Kpi } from "@/components/app/Atoms";
import { useWorkspaceInterviews } from "@/lib/useWorkspaceInterviews";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";

type Interview = {
  id: string;
  candidate_id: string;
  candidate: string;
  candidate_color: string;
  role: string;
  round: string;
  interviewer: string;
  when: string;
  status: "Scheduled" | "Awaiting feedback" | "Completed";
  recommendation: string;
};

const STATUS_BADGE: Record<Interview["status"], string> = {
  Scheduled: "badge--accent",
  "Awaiting feedback": "badge--warning",
  Completed: "badge--positive",
};

const GROUPS = ["Scheduled", "Awaiting feedback", "Completed"] as const;
const VIEWS = ["Today", "Week", "Month"] as const;
type View = (typeof VIEWS)[number];

const INTERVIEWER_COLORS = [
  "#4F46E5",
  "#0E9F6E",
  "#2563EB",
  "#7C3AED",
  "#B45309",
];

function interviewerColor(name: string): string {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return INTERVIEWER_COLORS[i % INTERVIEWER_COLORS.length]!;
}

function candidateHref(candidateId: string) {
  return `/candidates?${new URLSearchParams({ highlight: candidateId }).toString()}`;
}

function matchesView(when: string, view: View): boolean {
  if (view === "Today") return when.startsWith("Today");
  if (view === "Week") {
    return (
      when.startsWith("Today") ||
      when.startsWith("Tomorrow") ||
      /Mon|Tue|Wed|Thu|Fri/.test(when)
    );
  }
  return true;
}

function parseWhen(when: string): { primary: string; secondary: string } {
  const parts = when.split(" · ");
  if (parts.length >= 2) {
    return { primary: parts[parts.length - 1]!, secondary: parts.slice(0, -1).join(" · ") };
  }
  return { primary: when, secondary: "" };
}

function InterviewCard({
  interview,
  onReschedule,
  onCancel,
}: {
  interview: Interview;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const { primary, secondary } = parseWhen(interview.when);

  return (
    <article className="interview-card">
      <div className="interview-card__main">
        <button
          type="button"
          className="interview-card__candidate"
          onClick={() => router.push(candidateHref(interview.candidate_id))}
        >
          <CandidateAvatar name={interview.candidate} size={40} />
          <div className="min-w-0">
            <div className="interview-card__name">{interview.candidate}</div>
            <div className="interview-card__role">{interview.role}</div>
            <div className="interview-card__round">{interview.round}</div>
          </div>
        </button>

        <div className="interview-card__meta">
          <span className={`badge ${STATUS_BADGE[interview.status]}`}>
            {interview.status}
          </span>
          <div className="text-right">
            <div className="interview-card__time">{primary}</div>
            {secondary ? (
              <div className="interview-card__time-sub">{secondary}</div>
            ) : null}
          </div>
          <span className="interview-card__interviewer">
            <Avatar
              name={interview.interviewer}
              color={interviewerColor(interview.interviewer)}
              size={20}
            />
            {interview.interviewer}
          </span>
        </div>
      </div>

      <div className="interview-card__foot">
        {interview.status === "Scheduled" ? (
          <>
            <button type="button" className="text-action" onClick={onReschedule}>
              <Clock size={13} /> Reschedule
            </button>
            <div className="interview-card__actions">
              <button
                type="button"
                className="text-action text-ink-faint hover:text-critical"
                aria-label={`Cancel interview with ${interview.candidate}`}
                onClick={onCancel}
              >
                <X size={14} />
              </button>
              <Link
                href={candidateHref(interview.candidate_id)}
                className="btn btn--secondary btn--sm"
              >
                View profile <ArrowRight size={14} />
              </Link>
            </div>
          </>
        ) : interview.status === "Awaiting feedback" ? (
          <>
            <span className="text-[12px] text-ink-muted inline-flex items-center gap-1.5">
              <ClipboardList size={13} className="text-ink-faint" />
              Scorecard due
            </span>
            <Link
              href={candidateHref(interview.candidate_id)}
              className="btn btn--primary btn--sm interview-card__actions"
            >
              <FileText size={14} /> Complete scorecard
            </Link>
          </>
        ) : (
          <>
            <span className="text-[12px] text-ink-muted">Interview completed</span>
            <Link
              href={candidateHref(interview.candidate_id)}
              className={`badge ${STATUS_BADGE.Completed} badge--dot interview-card__actions`}
            >
              {interview.recommendation || "Completed"}
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

function InterviewsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="metrics-row metrics-row--3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="kpi">
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="interview-layout">
        <div className="panel p-5 space-y-3">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-28 w-full rounded-xl" />
          <div className="skeleton h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
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

  const scheduledTotal = interviews.filter(
    (i) => i.status === "Scheduled" && !cancelledIds.has(i.id)
  ).length;
  const pendingScorecards = interviews.filter(
    (i) => i.status === "Awaiting feedback"
  ).length;
  const completedCount = interviews.filter((i) => i.status === "Completed").length;

  const subtitle = stats
    ? `${scheduledTotal} scheduled across all roles · ${stats.scorecards_pending ?? pendingScorecards} need scorecards`
    : isLoading
    ? "Loading interview pipeline…"
    : `${scheduledTotal} scheduled · ${pendingScorecards} need scorecards`;

  return (
    <AppShell
      title="Interviews"
      subtitle={subtitle}
      actions={
        <>
          <div className="seg" role="tablist" aria-label="Interview period">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`seg-btn ${view === v ? "is-active" : ""}`}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => window.alert("Schedule interview (demo)")}
          >
            <Plus size={15} /> Schedule
          </button>
        </>
      }
    >
      {isLoading ? (
        <InterviewsSkeleton />
      ) : isError ? (
        <div className="panel max-w-lg mx-auto text-center py-10">
          <p className="text-[14px] font-medium text-critical">
            Could not load interviews
          </p>
          <p className="text-[12.5px] text-ink-muted mt-2">
            Ensure the backend is running on :8000 with imported candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="metrics-row metrics-row--3">
            <Kpi
              label="Scheduled"
              value={String(scheduledTotal)}
              hint="across all roles"
              icon={CalendarClock}
            />
            <Kpi
              label="Scorecards due"
              value={String(pendingScorecards)}
              hint="awaiting feedback"
              icon={FileText}
            />
            <Kpi
              label={`In ${view.toLowerCase()}`}
              value={String(active.length)}
              hint="matching filter"
              icon={Clock}
            />
          </div>

          {active.length === 0 ? (
            <div className="panel text-center py-14 max-w-lg">
              <p className="text-[14px] font-medium text-ink">
                No interviews in this view
              </p>
              <p className="text-[13px] text-ink-muted mt-1.5">
                Try a wider date range or schedule a new interview.
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm mt-4"
                onClick={() => setView("Month")}
              >
                Show all this month
              </button>
            </div>
          ) : (
            <div className="interview-layout">
              {GROUPS.map((group) => {
                const items = active.filter((i) => i.status === group);
                if (!items.length) return null;
                return (
                  <section key={group} className="interview-group">
                    <div className="panel">
                      <div className="panel__head">
                        <div>
                          <h2 className="panel__title">{group}</h2>
                          <p className="panel__subtitle">
                            {group === "Scheduled"
                              ? "Upcoming conversations with ranked candidates"
                              : group === "Awaiting feedback"
                              ? "Interviews pending interviewer scorecards"
                              : "Recently completed with recommendations"}
                          </p>
                        </div>
                        <span className="badge badge--neutral tnum">
                          {items.length}
                        </span>
                      </div>
                      <div className="panel__body panel__body--tight">
                        <div className="interview-stack">
                          {items.map((i) => (
                            <InterviewCard
                              key={i.id}
                              interview={i}
                              onReschedule={() =>
                                setToast(`Reschedule request sent for ${i.candidate}`)
                              }
                              onCancel={() => {
                                setCancelledIds((prev) => new Set(prev).add(i.id));
                                setToast(`Cancelled interview with ${i.candidate}`);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {!isLoading && completedCount > 0 && view !== "Month" && (
            <p className="text-[12px] text-ink-faint max-w-xl">
              {completedCount} completed interview
              {completedCount === 1 ? "" : "s"} not shown in &ldquo;{view}&rdquo;
              view. Switch to Month to see full history.
            </p>
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