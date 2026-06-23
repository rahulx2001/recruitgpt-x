"use client";

import { Video, FileText, ClipboardList, Clock, X } from "lucide-react";
import { Avatar, CandidateAvatar } from "@/components/app/Atoms";
import { RiskBadgeList } from "@/components/app/RiskBadge";
import {
  parseWhen,
  startsSoonLabel,
  type InterviewRecord,
} from "@/lib/interviewUtils";

const STATUS_BADGE: Record<InterviewRecord["status"], string> = {
  Scheduled: "badge--accent",
  "Awaiting feedback": "badge--warning",
  Completed: "badge--positive",
};

const SCORECARD_BADGE: Record<string, string> = {
  "Feedback Due": "badge--warning",
  Overdue: "badge--critical",
  Pending: "badge--neutral",
  Submitted: "badge--positive",
};

function interviewerColor(name: string): string {
  const palette = ["#4F46E5", "#0E9F6E", "#2563EB", "#7C3AED", "#B45309"];
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[i % palette.length]!;
}

export function InterviewRow({
  interview,
  onReschedule,
  onCancel,
  onOpenResume,
  onOpenScorecard,
  onCompleteFeedback,
}: {
  interview: InterviewRecord;
  onReschedule: () => void;
  onCancel: () => void;
  onOpenResume: () => void;
  onOpenScorecard: () => void;
  onCompleteFeedback: () => void;
}) {
  const { primary, secondary } = parseWhen(interview.when);
  const soon = startsSoonLabel(interview);
  const scorecardStatus =
    interview.scorecard_status ||
    (interview.status === "Awaiting feedback"
      ? "Feedback Due"
      : interview.status === "Completed"
      ? "Submitted"
      : "Pending");

  return (
    <article className="interview-row">
      <div className="interview-row__body">
        <CandidateAvatar name={interview.candidate} size={32} />
        <div className="interview-row__main min-w-0">
          <div className="interview-row__line1">
            <span className="interview-row__name">{interview.candidate}</span>
            <span className="interview-row__sep">·</span>
            <span className="interview-row__role truncate">{interview.role}</span>
          </div>
          <div className="interview-row__context">
            {interview.rank ? (
              <span className="interview-row__chip tnum">Rank #{interview.rank}</span>
            ) : null}
            {interview.match_score != null ? (
              <span className="interview-row__chip tnum">
                {interview.match_score} Match
              </span>
            ) : null}
            {interview.concern ? (
              <RiskBadgeList concern={interview.concern} />
            ) : null}
          </div>
          <div className="interview-row__line3">
            <span>{interview.round}</span>
            <span className="interview-row__sep">·</span>
            <span className="inline-flex items-center gap-1">
              <Avatar
                name={interview.interviewer}
                color={interviewerColor(interview.interviewer)}
                size={16}
              />
              {interview.interviewer}
            </span>
            <span className="interview-row__sep">·</span>
            <span className="tnum">
              {secondary ? `${secondary} · ` : ""}
              {primary}
            </span>
          </div>
        </div>

        <div className="interview-row__aside">
          {soon ? (
            <span className="interview-row__soon" role="status">
              {soon}
            </span>
          ) : null}
          <span className={`badge ${STATUS_BADGE[interview.status]}`}>
            {interview.status}
          </span>
          <span
            className={`badge badge--dot ${
              SCORECARD_BADGE[scorecardStatus] ?? "badge--neutral"
            }`}
          >
            {scorecardStatus}
          </span>
        </div>
      </div>

      <div className="interview-row__actions">
        {interview.status === "Scheduled" && interview.meeting_url ? (
          <a
            href={interview.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="interview-row__btn interview-row__btn--primary"
          >
            <Video size={13} /> Join Meet
          </a>
        ) : null}
        <button
          type="button"
          className="interview-row__btn"
          onClick={onOpenResume}
        >
          <FileText size={13} /> Open Resume
        </button>
        <button
          type="button"
          className="interview-row__btn"
          onClick={onOpenScorecard}
        >
          <ClipboardList size={13} /> Open Scorecard
        </button>
        {interview.status === "Scheduled" ? (
          <>
            <button
              type="button"
              className="interview-row__btn interview-row__btn--ghost"
              onClick={onReschedule}
            >
              <Clock size={13} /> Reschedule
            </button>
            <button
              type="button"
              className="interview-row__btn interview-row__btn--ghost interview-row__btn--danger"
              aria-label={`Cancel interview with ${interview.candidate}`}
              onClick={onCancel}
            >
              <X size={13} /> Cancel
            </button>
          </>
        ) : interview.status === "Awaiting feedback" ? (
          <button
            type="button"
            className="interview-row__btn interview-row__btn--primary"
            onClick={onCompleteFeedback}
          >
            <ClipboardList size={13} /> Complete feedback
          </button>
        ) : (
          <span className="interview-row__rec badge badge--positive badge--dot">
            {interview.recommendation || "Completed"}
          </span>
        )}
      </div>
    </article>
  );
}