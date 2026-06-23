"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  User,
  CalendarDays,
} from "lucide-react";
import { CandidateAvatar } from "@/components/app/Atoms";
import { GoogleCalendarConnect } from "@/components/app/GoogleCalendarConnect";
import {
  conflictsWithBusy,
  formatBlockRange,
  useCalendarStatus,
  useInterviewerFreeBusy,
} from "@/lib/useGoogleCalendar";
import {
  addMonths,
  countOnDay,
  format,
  getMonthGrid,
  interviewsOnDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
  type CalendarInterview,
} from "@/lib/interviewCalendar";

const STATUS_DOT: Record<string, string> = {
  Scheduled: "is-scheduled",
  "Awaiting feedback": "is-feedback",
  Completed: "is-done",
};

export function InterviewCalendar({
  interviews,
  onReschedule,
  onSelectInterview,
}: {
  interviews: CalendarInterview[];
  onReschedule: (id: string, date: Date) => void;
  onSelectInterview?: (interview: CalendarInterview) => void;
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = React.useState(() => new Date());
  const [interviewerFilter, setInterviewerFilter] = React.useState("all");
  const [rescheduleId, setRescheduleId] = React.useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("09:00");
  const [gcalDemoConnected, setGcalDemoConnected] = React.useState(false);

  const interviewers = React.useMemo(
    () => [...new Set(interviews.map((i) => i.interviewer))].sort(),
    [interviews]
  );

  const { data: calStatus } = useCalendarStatus();
  const gcalActive = calStatus?.connected || gcalDemoConnected;
  const freeBusyInterviewer =
    interviewerFilter !== "all" ? interviewerFilter : interviewers[0] ?? "";
  const { data: freeBusy } = useInterviewerFreeBusy(
    freeBusyInterviewer,
    selectedDay,
    gcalActive && !!freeBusyInterviewer
  );

  const filtered = React.useMemo(() => {
    if (interviewerFilter === "all") return interviews;
    return interviews.filter((i) => i.interviewer === interviewerFilter);
  }, [interviews, interviewerFilter]);

  const monthDays = React.useMemo(() => getMonthGrid(month), [month]);
  const dayInterviews = React.useMemo(
    () => interviewsOnDay(filtered, selectedDay),
    [filtered, selectedDay]
  );

  const openReschedule = (interview: CalendarInterview) => {
    setRescheduleId(interview.id);
    setRescheduleDate(format(interview.calendarDate, "yyyy-MM-dd"));
    setRescheduleTime(format(interview.calendarDate, "HH:mm"));
  };

  const rescheduleConflict = React.useMemo(() => {
    if (!rescheduleDate || !freeBusy?.blocks.length) return null;
    const [y, m, d] = rescheduleDate.split("-").map(Number);
    const [hh, mm] = rescheduleTime.split(":").map(Number);
    const proposed = new Date(y!, m! - 1, d!, hh, mm);
    return conflictsWithBusy(proposed, 60, freeBusy.blocks);
  }, [rescheduleDate, rescheduleTime, freeBusy]);

  const saveReschedule = () => {
    if (!rescheduleId || !rescheduleDate) return;
    const [y, m, d] = rescheduleDate.split("-").map(Number);
    const [hh, mm] = rescheduleTime.split(":").map(Number);
    const next = new Date(y!, m! - 1, d!, hh, mm);
    onReschedule(rescheduleId, next);
    setRescheduleId(null);
    setSelectedDay(next);
    setMonth(startOfMonth(next));
  };

  return (
    <div className="interview-calendar">
      <GoogleCalendarConnect onConnect={() => setGcalDemoConnected(true)} />

      <div className="interview-calendar__toolbar">
        <div className="interview-calendar__nav">
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Previous month"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="interview-calendar__month">{format(month, "MMMM yyyy")}</h2>
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const today = new Date();
              setMonth(startOfMonth(today));
              setSelectedDay(today);
            }}
          >
            Today
          </button>
        </div>

        <label className="interview-calendar__filter">
          <User size={14} />
          <select
            className="interview-calendar__select"
            value={interviewerFilter}
            onChange={(e) => setInterviewerFilter(e.target.value)}
            aria-label="Filter by interviewer"
          >
            <option value="all">All interviewers</option>
            {interviewers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="interview-calendar__layout">
        <div className="interview-calendar__grid-wrap panel panel--flush">
          <div className="interview-calendar__weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="interview-calendar__weekday">
                {d}
              </span>
            ))}
          </div>
          <div className="interview-calendar__grid" role="grid" aria-label="Interview calendar">
            {monthDays.map((day) => {
              const count = countOnDay(filtered, day);
              const inMonth = isSameMonth(day, month);
              const selected = isSameDay(day, selectedDay);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  className={`interview-calendar__day${
                    !inMonth ? " is-outside" : ""
                  }${selected ? " is-selected" : ""}${today ? " is-today" : ""}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="interview-calendar__day-num">{format(day, "d")}</span>
                  {count > 0 ? (
                    <span className="interview-calendar__day-dots" aria-hidden>
                      {interviewsOnDay(filtered, day)
                        .slice(0, 3)
                        .map((iv) => (
                          <span
                            key={iv.id}
                            className={`interview-calendar__dot ${
                              STATUS_DOT[iv.status] ?? ""
                            }`}
                          />
                        ))}
                    </span>
                  ) : null}
                  {count > 0 ? (
                    <span className="interview-calendar__day-count tnum">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="interview-calendar__legend">
            <span>
              <i className="interview-calendar__dot is-scheduled" /> Scheduled
            </span>
            <span>
              <i className="interview-calendar__dot is-feedback" /> Feedback due
            </span>
            <span>
              <i className="interview-calendar__dot is-done" /> Completed
            </span>
            {gcalActive ? (
              <span>
                <i className="interview-calendar__dot is-busy" /> Blocked (Google)
              </span>
            ) : null}
          </div>
        </div>

        <aside className="interview-calendar__agenda panel">
          <div className="panel__head panel__head--inline">
            <div>
              <h3 className="panel__title">{format(selectedDay, "EEEE, MMM d")}</h3>
              <p className="panel__subtitle">
                {dayInterviews.length} interview
                {dayInterviews.length === 1 ? "" : "s"}
                {interviewerFilter !== "all" ? ` · ${interviewerFilter}` : ""}
              </p>
            </div>
            <CalendarDays size={18} className="text-ink-faint" />
          </div>

          <div className="interview-calendar__agenda-body">
            {gcalActive && freeBusy && freeBusy.blocks.length > 0 ? (
              <div className="interview-calendar__busy-section">
                <p className="interview-calendar__busy-label">
                  Blocked on Google Calendar
                  {interviewerFilter === "all" ? ` · ${freeBusy.interviewer}` : ""}
                </p>
                {freeBusy.blocks.map((block) => (
                  <div key={block.start} className="interview-calendar__busy-block">
                    <span className="interview-calendar__busy-time tnum">
                      {formatBlockRange(block.start, block.end)}
                    </span>
                    <span className="interview-calendar__busy-title">{block.label}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {dayInterviews.length === 0 ? (
              <p className="interview-calendar__empty">
                No interviews on this day.
                {interviewerFilter !== "all"
                  ? " Try clearing the interviewer filter."
                  : " Pick another date or schedule a new slot."}
              </p>
            ) : (
              dayInterviews.map((iv) => (
                <article key={iv.id} className="interview-calendar__event">
                  <div className="interview-calendar__event-time tnum">
                    {iv.calendarTime}
                  </div>
                  <div className="interview-calendar__event-body">
                    <div className="interview-calendar__event-head">
                      <CandidateAvatar name={iv.candidate} size={32} />
                      <div className="min-w-0">
                        <div className="interview-calendar__event-name">
                          {iv.candidate}
                        </div>
                        <div className="interview-calendar__event-role truncate">
                          {iv.role}
                        </div>
                      </div>
                      <span
                        className={`badge ${
                          iv.status === "Scheduled"
                            ? "badge--accent"
                            : iv.status === "Awaiting feedback"
                            ? "badge--warning"
                            : "badge--positive"
                        }`}
                      >
                        {iv.status === "Awaiting feedback" ? "Feedback" : iv.status}
                      </span>
                    </div>
                    <p className="interview-calendar__event-meta">
                      {iv.round} · {iv.interviewer}
                    </p>
                    <div className="interview-calendar__event-actions">
                      {iv.status === "Scheduled" && iv.meeting_url ? (
                        <a
                          href={iv.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="interview-row__btn interview-row__btn--primary"
                        >
                          <Video size={13} /> Join Meet
                        </a>
                      ) : null}
                      {iv.status === "Scheduled" ? (
                        <button
                          type="button"
                          className="interview-row__btn"
                          onClick={() => openReschedule(iv)}
                        >
                          <Clock size={13} /> Reschedule
                        </button>
                      ) : null}
                      {onSelectInterview ? (
                        <button
                          type="button"
                          className="interview-row__btn"
                          onClick={() => onSelectInterview(iv)}
                        >
                          View details
                        </button>
                      ) : null}
                    </div>

                    {rescheduleId === iv.id ? (
                      <div className="interview-calendar__reschedule">
                        <p className="interview-calendar__reschedule-label">
                          HR — set new date & time
                        </p>
                        <div className="interview-calendar__reschedule-fields">
                          <input
                            type="date"
                            className="field"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                          />
                          <input
                            type="time"
                            className="field"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                          />
                        </div>
                        {rescheduleConflict ? (
                          <p className="interview-calendar__conflict" role="alert">
                            Conflicts with Google Calendar: {rescheduleConflict.label} (
                            {formatBlockRange(
                              rescheduleConflict.start,
                              rescheduleConflict.end
                            )}
                            ). Pick another slot.
                          </p>
                        ) : null}
                        <div className="interview-calendar__reschedule-actions">
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={!!rescheduleConflict}
                            onClick={saveReschedule}
                          >
                            Save slot
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setRescheduleId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

