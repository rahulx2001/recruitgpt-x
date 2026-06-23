"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  Plus,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

import { InterviewRow } from "@/components/app/InterviewRow";
import { FeedbackDueCard } from "@/components/app/FeedbackDueCard";
import { InterviewCalendar } from "@/components/app/InterviewCalendar";
import { useCandidatePool } from "@/lib/useCandidatePool";
import {
  toCalendarInterviews,
  formatRescheduledWhen,
} from "@/lib/interviewCalendar";

const CandidateDrawer = dynamic(
  () =>
    import("@/components/app/CandidateDrawer").then((m) => m.CandidateDrawer),
  { ssr: false }
);
const ResumeDrawer = dynamic(
  () => import("@/components/app/ResumeDrawer").then((m) => m.ResumeDrawer),
  { ssr: false }
);
const FeedbackDrawer = dynamic(
  () =>
    import("@/components/app/FeedbackDrawer").then((m) => m.FeedbackDrawer),
  { ssr: false }
);
import { useWorkspaceInterviews } from "@/lib/useWorkspaceInterviews";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";
import { useWorkspaceAnalytics } from "@/lib/useWorkspaceAnalytics";
import {
  matchesView,
  sortInterviews,
  type InterviewRecord,
} from "@/lib/interviewUtils";

const VIEWS = ["Today", "Week", "Month"] as const;
type View = (typeof VIEWS)[number];
type ListFilter = "all" | "feedback" | "calendar";
type DrawerKind = "resume" | "scorecard" | "feedback" | null;

function InterviewsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="metrics-row metrics-row--4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi">
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="panel p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense fallback={<InterviewsSkeleton />}>
      <InterviewsView />
    </Suspense>
  );
}

function InterviewsView() {
  const searchParams = useSearchParams();
  const { data: stats } = useWorkspaceStats();
  const { data: analytics } = useWorkspaceAnalytics();
  const { data: interviews = [], isLoading, isError } = useWorkspaceInterviews();
  const { getUi, getApi, getRank, poolAvgs, poolSize } = useCandidatePool();
  const [view, setView] = React.useState<View>("Today");
  const [drawer, setDrawer] = React.useState<{
    kind: DrawerKind;
    candidateId: string;
    interviewId: string;
  }>({ kind: null, candidateId: "", interviewId: "" });
  const [submittedFeedback, setSubmittedFeedback] = React.useState<
    Map<string, { recommendation: string }>
  >(() => new Map());
  const [rescheduleOverrides, setRescheduleOverrides] = React.useState<
    Map<string, { date: Date; when: string }>
  >(() => new Map());
  const [listFilter, setListFilter] = React.useState<ListFilter>("all");
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [toast, setToast] = React.useState<string | null>(null);
  const feedbackRef = React.useRef<HTMLDivElement>(null);
  const queueRef = React.useRef<HTMLDivElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  const scrollToQueue = () => {
    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToCalendar = () => {
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToFeedback = () => {
    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  React.useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter === "feedback") {
      setListFilter("feedback");
      window.setTimeout(scrollToFeedback, 100);
    } else if (filter === "calendar") {
      setListFilter("calendar");
      window.setTimeout(scrollToCalendar, 100);
    } else if (filter === "today") {
      setView("Today");
      setListFilter("all");
      window.setTimeout(scrollToQueue, 100);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const enrichedInterviews = React.useMemo(() => {
    const topMap = new Map(
      (analytics?.top_candidates ?? []).map((c) => [c.candidate_id, c])
    );
    const soonOffsets = [15, 20, 45, 90];
    return (interviews as InterviewRecord[]).map((row, idx) => {
      const top = topMap.get(row.candidate_id);
      const rank = row.rank ?? top?.rank ?? idx + 1;
      const enriched: InterviewRecord = {
        ...row,
        rank,
        match_score: row.match_score ?? top?.score,
        concern: row.concern || top?.concern || "",
        pipeline_stage: row.pipeline_stage || top?.stage,
        starts_in_minutes:
          row.starts_in_minutes ??
          (row.status === "Scheduled" && row.when.startsWith("Today")
            ? soonOffsets[rank % soonOffsets.length]
            : null),
        meeting_url:
          row.meeting_url ||
          (row.status === "Scheduled"
            ? `https://meet.google.com/lookup/${row.candidate_id.slice(-8).toLowerCase()}`
            : ""),
        scorecard_status:
          row.scorecard_status ||
          (row.status === "Awaiting feedback"
            ? "Feedback Due"
            : row.status === "Completed"
            ? "Submitted"
            : "Pending"),
      };
      return enriched;
    });
  }, [interviews, analytics]);

  const displayInterviews = React.useMemo(() => {
    return enrichedInterviews.map((row) => {
      let next = { ...row };
      const rescheduled = rescheduleOverrides.get(row.id);
      if (rescheduled) {
        next = { ...next, when: rescheduled.when };
      }
      const submitted = submittedFeedback.get(row.id);
      if (submitted) {
        next = {
          ...next,
          status: "Completed" as const,
          recommendation: submitted.recommendation,
          scorecard_status: "Submitted",
        };
      }
      return next;
    });
  }, [enrichedInterviews, submittedFeedback, rescheduleOverrides]);

  const calendarInterviews = React.useMemo(
    () =>
      toCalendarInterviews(
        displayInterviews.filter((i) => !cancelledIds.has(i.id)),
        rescheduleOverrides
      ),
    [displayInterviews, cancelledIds, rescheduleOverrides]
  );

  const active = React.useMemo(() => {
    const base = displayInterviews.filter((i) => !cancelledIds.has(i.id));
    if (listFilter === "feedback") {
      return sortInterviews(
        base.filter((i) => i.status === "Awaiting feedback")
      );
    }
    return sortInterviews(base.filter((i) => matchesView(i.when, view)));
  }, [displayInterviews, cancelledIds, view, listFilter]);

  const todayInterviews = React.useMemo(() => {
    const base = displayInterviews.filter((i) => !cancelledIds.has(i.id));
    return sortInterviews(base.filter((i) => matchesView(i.when, "Today")));
  }, [displayInterviews, cancelledIds]);

  const scheduledTotal = displayInterviews.filter(
    (i) => i.status === "Scheduled" && !cancelledIds.has(i.id)
  ).length;
  const pendingScorecards = displayInterviews.filter(
    (i) => i.status === "Awaiting feedback"
  ).length;
  const completedCount = displayInterviews.filter(
    (i) => i.status === "Completed"
  ).length;
  const soonCount = todayInterviews.filter(
    (i) =>
      i.status === "Scheduled" &&
      i.starts_in_minutes != null &&
      i.starts_in_minutes <= 60
  ).length;

  const subtitle = isLoading
    ? "Loading interview pipeline…"
    : `${scheduledTotal} scheduled · ${pendingScorecards} scorecards due`;

  const showFeedbackBanner = pendingScorecards > 0 && listFilter === "all";

  const openDrawer = (kind: Exclude<DrawerKind, null>, candidateId: string) => {
    const ui = getUi(candidateId);
    if (!ui) {
      setToast("Candidate profile is still loading — try again in a moment.");
      return;
    }
    if (kind === "resume" && !getApi(candidateId)) {
      setToast("Resume data unavailable for this candidate.");
      return;
    }
    setDrawer({ kind, candidateId, interviewId: "" });
  };

  const openFeedbackDrawer = (interview: InterviewRecord) => {
    if (!interview?.id) {
      setToast("Interview not found — refresh and try again.");
      return;
    }
    setDrawer({
      kind: "feedback",
      candidateId: interview.candidate_id,
      interviewId: interview.id,
    });
  };

  const closeDrawer = () =>
    setDrawer({ kind: null, candidateId: "", interviewId: "" });

  const drawerUi = drawer.candidateId ? getUi(drawer.candidateId) : undefined;
  const drawerApi = drawer.candidateId ? getApi(drawer.candidateId) : undefined;
  const feedbackInterview = drawer.interviewId
    ? displayInterviews.find((i) => i.id === drawer.interviewId)
    : undefined;

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
                aria-selected={listFilter === "all" && view === v}
                className={`seg-btn ${
                  listFilter === "all" && view === v ? "is-active" : ""
                }`}
                onClick={() => {
                  setView(v);
                  setListFilter("all");
                }}
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
        <div className="interviews-page space-y-4">
          <div className="metrics-row metrics-row--4">
            <button
              type="button"
              className={`kpi kpi--link${
                listFilter === "all" && view === "Month" ? " is-active" : ""
              }`}
              onClick={() => {
                setView("Month");
                setListFilter("all");
                scrollToQueue();
              }}
            >
              <div className="kpi__head">
                <div className="kpi__label">Scheduled</div>
                <span className="kpi__icon" aria-hidden>
                  <CalendarClock size={15} strokeWidth={2} />
                </span>
              </div>
              <div className="kpi__value">{scheduledTotal}</div>
              <div className="kpi__hint">
                {soonCount > 0 ? `${soonCount} starting soon · View →` : "this month · View →"}
              </div>
            </button>
            <button
              type="button"
              className={`kpi kpi--link${
                listFilter === "feedback" ? " is-active" : ""
              }`}
              onClick={() => {
                setListFilter("feedback");
                window.setTimeout(scrollToFeedback, 50);
              }}
            >
              <div className="kpi__head">
                <div className="kpi__label">Scorecards due</div>
                <span className="kpi__icon" aria-hidden>
                  <FileText size={15} strokeWidth={2} />
                </span>
              </div>
              <div className="kpi__value">{pendingScorecards}</div>
              <div className="kpi__hint">awaiting feedback · View →</div>
            </button>
            <button
              type="button"
              className={`kpi kpi--link${
                listFilter === "all" && view === "Today" ? " is-active" : ""
              }`}
              onClick={() => {
                setView("Today");
                setListFilter("all");
                scrollToQueue();
              }}
            >
              <div className="kpi__head">
                <div className="kpi__label">In today</div>
                <span className="kpi__icon" aria-hidden>
                  <Clock size={15} strokeWidth={2} />
                </span>
              </div>
              <div className="kpi__value">{todayInterviews.length}</div>
              <div className="kpi__hint">today&apos;s interviews · View →</div>
            </button>
            <button
              type="button"
              className={`kpi kpi--link${
                listFilter === "calendar" ? " is-active" : ""
              }`}
              onClick={() => {
                setListFilter("calendar");
                scrollToCalendar();
              }}
            >
              <div className="kpi__head">
                <div className="kpi__label">Calendar</div>
                <span className="kpi__icon" aria-hidden>
                  <CalendarDays size={15} strokeWidth={2} />
                </span>
              </div>
              <div className="kpi__value">{calendarInterviews.length}</div>
              <div className="kpi__hint">Google Workspace · View →</div>
            </button>
          </div>

          {showFeedbackBanner && (
            <button
              type="button"
              id="feedback-pending"
              className="interviews-feedback-banner"
              onClick={() => {
                setListFilter("feedback");
                window.setTimeout(scrollToFeedback, 50);
              }}
            >
              <div className="interviews-feedback-banner__left">
                <ClipboardList size={16} className="text-warning shrink-0" />
                <span>
                  <strong className="text-ink tnum">{pendingScorecards}</strong>{" "}
                  Feedback Pending
                </span>
              </div>
              <span className="interviews-feedback-banner__action">
                View <ChevronRight size={14} />
              </span>
            </button>
          )}

          {listFilter === "feedback" && (
            <div className="interviews-filter-bar">
              <span className="text-[13px] text-ink-secondary">
                Showing scorecards awaiting feedback
              </span>
              <button
                type="button"
                className="text-action text-[12px]"
                onClick={() => setListFilter("all")}
              >
                Show all interviews
              </button>
            </div>
          )}

          {listFilter === "calendar" && (
            <div className="interviews-filter-bar">
              <span className="text-[13px] text-ink-secondary">
                Shared calendar — HR, interviewers & candidates
              </span>
              <button
                type="button"
                className="text-action text-[12px]"
                onClick={() => setListFilter("all")}
              >
                Show interview list
              </button>
            </div>
          )}

          {listFilter === "calendar" ? (
            <div ref={calendarRef}>
              <InterviewCalendar
                interviews={calendarInterviews}
                onReschedule={(id, date) => {
                  const when = formatRescheduledWhen(date);
                  setRescheduleOverrides((prev) => {
                    const next = new Map(prev);
                    next.set(id, { date, when });
                    return next;
                  });
                  const row = displayInterviews.find((i) => i.id === id);
                  setToast(
                    row
                      ? `Rescheduled ${row.candidate} to ${when}`
                      : "Interview rescheduled"
                  );
                }}
              />
            </div>
          ) : active.length === 0 ? (
            <div className="panel text-center py-12 max-w-lg mx-auto">
              <p className="text-[14px] font-medium text-ink">
                {listFilter === "feedback"
                  ? "No pending scorecards in this view"
                  : "No interviews in this view"}
              </p>
              <p className="text-[13px] text-ink-muted mt-1.5">
                {listFilter === "feedback"
                  ? "All scorecards are submitted — nothing left to review."
                  : "Try a wider date range or schedule a new interview."}
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm mt-4"
                onClick={() => {
                  if (listFilter === "feedback") {
                    setListFilter("all");
                  } else {
                    setListFilter("all");
                    setView("Month");
                  }
                }}
              >
                {listFilter === "feedback"
                  ? "Show all interviews"
                  : "Show all this month"}
              </button>
            </div>
          ) : listFilter === "feedback" ? (
            <div ref={feedbackRef} className="feedback-due-section">
              <div className="feedback-due-section__head">
                <div>
                  <h2 className="panel__title">Feedback due</h2>
                  <p className="panel__subtitle">
                    {active.length} scorecard{active.length === 1 ? "" : "s"} awaiting
                    your review
                  </p>
                </div>
              </div>
              <div className="feedback-due-grid">
                {active.map((i) => (
                  <FeedbackDueCard
                    key={i.id}
                    interview={i}
                    onOpenResume={() => openDrawer("resume", i.candidate_id)}
                    onOpenScorecard={() => openDrawer("scorecard", i.candidate_id)}
                    onCompleteFeedback={() => openFeedbackDrawer(i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              ref={queueRef}
              className="panel panel--flush interviews-list-panel"
            >
              <div className="panel__head panel__head--inline">
                <div>
                  <h2 className="panel__title">Interview queue</h2>
                  <p className="panel__subtitle">
                    {active.length} interview{active.length === 1 ? "" : "s"} · compact
                    workflow view
                  </p>
                </div>
                <span className="badge badge--neutral tnum">{active.length}</span>
              </div>
              <div className="interviews-list">
                {active.map((i) => (
                  <InterviewRow
                    key={i.id}
                    interview={i}
                    onOpenResume={() => openDrawer("resume", i.candidate_id)}
                    onOpenScorecard={() => openDrawer("scorecard", i.candidate_id)}
                    onCompleteFeedback={() => openFeedbackDrawer(i)}
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
          )}

          {!isLoading &&
            completedCount > 0 &&
            view !== "Month" &&
            listFilter === "all" && (
            <p className="text-[12px] text-ink-faint max-w-xl">
              {completedCount} completed interview
              {completedCount === 1 ? "" : "s"} may be hidden in &ldquo;{view}&rdquo;
              view. Switch to Month to see full history.
            </p>
          )}
        </div>
      )}

      {drawer.kind === "resume" && drawerUi && drawerApi ? (
        <ResumeDrawer ui={drawerUi} api={drawerApi} onClose={closeDrawer} />
      ) : null}

      {drawer.kind === "scorecard" && drawerUi ? (
        <CandidateDrawer
          candidate={drawerUi}
          rank={getRank(drawer.candidateId)}
          poolSize={poolSize}
          poolAvgs={poolAvgs}
          onClose={closeDrawer}
          readonly
        />
      ) : null}

      {drawer.kind === "feedback" && feedbackInterview ? (
        <FeedbackDrawer
          interview={feedbackInterview}
          onClose={closeDrawer}
          onSubmit={(payload) => {
            setSubmittedFeedback((prev) => {
              const next = new Map(prev);
              next.set(feedbackInterview.id, {
                recommendation: payload.recommendation,
              });
              return next;
            });
            closeDrawer();
            setToast(
              `Scorecard submitted for ${feedbackInterview.candidate} · ${payload.recommendation}`
            );
          }}
        />
      ) : null}

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </AppShell>
  );
}