"use client";

import { FileText, ClipboardList, Calendar } from "lucide-react";
import { CandidateAvatar } from "@/components/app/Atoms";
import { RiskBadgeList } from "@/components/app/RiskBadge";
import { parseWhen, type InterviewRecord } from "@/lib/interviewUtils";

export function FeedbackDueCard({
  interview,
  onOpenResume,
  onOpenScorecard,
  onCompleteFeedback,
}: {
  interview: InterviewRecord;
  onOpenResume: () => void;
  onOpenScorecard: () => void;
  onCompleteFeedback: () => void;
}) {
  const { primary, secondary } = parseWhen(interview.when);
  const isOverdue = interview.scorecard_status === "Overdue";

  return (
    <article className="feedback-due-card">
      <div className="feedback-due-card__head">
        <CandidateAvatar name={interview.candidate} size={44} />
        <div className="feedback-due-card__identity min-w-0">
          <h3 className="feedback-due-card__name">{interview.candidate}</h3>
          <p className="feedback-due-card__role">{interview.role}</p>
        </div>
        {isOverdue ? (
          <span className="badge badge--critical badge--dot feedback-due-card__status">
            Overdue
          </span>
        ) : (
          <span className="badge badge--warning feedback-due-card__status">
            Due
          </span>
        )}
      </div>

      <div className="feedback-due-card__meta">
        <span>{interview.round}</span>
        <span className="feedback-due-card__dot" aria-hidden>
          ·
        </span>
        <span>{interview.interviewer}</span>
        <span className="feedback-due-card__dot" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar size={12} />
          {secondary ? `${secondary} · ` : ""}
          {primary}
        </span>
      </div>

      {(interview.rank != null || interview.match_score != null || interview.concern) && (
        <div className="feedback-due-card__signals">
          {interview.rank != null ? (
            <span className="feedback-due-card__signal tnum">Rank #{interview.rank}</span>
          ) : null}
          {interview.match_score != null ? (
            <span className="feedback-due-card__signal tnum">
              {interview.match_score} match
            </span>
          ) : null}
          {interview.concern ? (
            <RiskBadgeList concern={interview.concern} />
          ) : null}
        </div>
      )}

      <button
        type="button"
        className="btn btn--primary feedback-due-card__cta"
        onClick={onCompleteFeedback}
      >
        <ClipboardList size={15} />
        Complete feedback
      </button>

      <div className="feedback-due-card__links">
        <button type="button" className="feedback-due-card__link" onClick={onOpenResume}>
          <FileText size={13} />
          Resume
        </button>
        <button
          type="button"
          className="feedback-due-card__link"
          onClick={onOpenScorecard}
        >
          <ClipboardList size={13} />
          Candidate scorecard
        </button>
      </div>
    </article>
  );
}