"use client";

import * as React from "react";
import { Calendar, User, ClipboardList } from "lucide-react";
import { CandidateAvatar } from "@/components/app/Atoms";
import { DrawerShell } from "@/components/app/DrawerShell";
import { parseWhen, type InterviewRecord } from "@/lib/interviewUtils";
import type { Recommendation } from "@/lib/mock";

const RECOMMENDATIONS: Recommendation[] = [
  "Strong Hire",
  "Hire",
  "Lean Hire",
  "Hold",
];

const CRITERIA = [
  { key: "technical", label: "Technical depth" },
  { key: "communication", label: "Communication" },
  { key: "culture", label: "Culture fit" },
] as const;

type CriteriaKey = (typeof CRITERIA)[number]["key"];

export type FeedbackSubmission = {
  recommendation: Recommendation;
  ratings: Record<CriteriaKey, number>;
  strengths: string;
  concerns: string;
  notes: string;
};

export function FeedbackDrawer({
  interview,
  onClose,
  onSubmit,
}: {
  interview: InterviewRecord;
  onClose: () => void;
  onSubmit: (payload: FeedbackSubmission) => void;
}) {
  const { primary, secondary } = parseWhen(interview.when);
  const [recommendation, setRecommendation] =
    React.useState<Recommendation>("Hire");
  const [ratings, setRatings] = React.useState<Record<CriteriaKey, number>>({
    technical: 4,
    communication: 4,
    culture: 4,
  });
  const [strengths, setStrengths] = React.useState("");
  const [concerns, setConcerns] = React.useState(
    interview.concern ? `Watch: ${interview.concern}` : ""
  );
  const [notes, setNotes] = React.useState("");

  const setRating = (key: CriteriaKey, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ recommendation, ratings, strengths, concerns, notes });
  };

  return (
    <DrawerShell
      title="Interview feedback"
      subtitle={`${interview.round} · submit scorecard`}
      ariaLabel="Interview feedback form"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary flex-1"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="interview-feedback-form"
            className="btn btn--primary flex-1"
          >
            Submit scorecard
          </button>
        </>
      }
    >
      <form
        id="interview-feedback-form"
        className="feedback-form"
        onSubmit={handleSubmit}
      >
        <div className="scorecard-hero">
          <CandidateAvatar name={interview.candidate} size={48} />
          <div className="min-w-0">
            <h3 className="scorecard-hero__title">{interview.candidate}</h3>
            <p className="scorecard-hero__sub">{interview.role}</p>
            <p className="scorecard-hero__loc">
              <Calendar size={12} />
              {secondary ? `${secondary} · ` : ""}
              {primary}
            </p>
          </div>
        </div>

        <div className="feedback-form__meta">
          <span className="feedback-form__meta-item">
            <ClipboardList size={13} />
            {interview.round}
          </span>
          <span className="feedback-form__meta-item">
            <User size={13} />
            {interview.interviewer}
          </span>
          {interview.rank ? (
            <span className="feedback-form__meta-item tnum">
              Rank #{interview.rank}
            </span>
          ) : null}
        </div>

        <div className="feedback-form__section">
          <label className="feedback-form__label">Overall recommendation</label>
          <div className="feedback-form__recs" role="radiogroup" aria-label="Recommendation">
            {RECOMMENDATIONS.map((rec) => (
              <button
                key={rec}
                type="button"
                role="radio"
                aria-checked={recommendation === rec}
                className={`feedback-form__rec${
                  recommendation === rec ? " is-active" : ""
                }`}
                onClick={() => setRecommendation(rec)}
              >
                {rec}
              </button>
            ))}
          </div>
        </div>

        <div className="feedback-form__section">
          <label className="feedback-form__label">Competency ratings</label>
          <div className="feedback-form__ratings">
            {CRITERIA.map(({ key, label }) => (
              <div key={key} className="feedback-form__rating">
                <div className="feedback-form__rating-head">
                  <span>{label}</span>
                  <span className="tnum">{ratings[key]}/5</span>
                </div>
                <div className="feedback-form__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`feedback-form__star${
                        n <= ratings[key] ? " is-on" : ""
                      }`}
                      aria-label={`${label}: ${n} of 5`}
                      onClick={() => setRating(key, n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="feedback-form__section">
          <label className="feedback-form__label" htmlFor="feedback-strengths">
            Key strengths
          </label>
          <textarea
            id="feedback-strengths"
            className="field feedback-form__textarea"
            rows={2}
            placeholder="What stood out positively in the interview?"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
          />
        </div>

        <div className="feedback-form__section">
          <label className="feedback-form__label" htmlFor="feedback-concerns">
            Concerns or gaps
          </label>
          <textarea
            id="feedback-concerns"
            className="field feedback-form__textarea"
            rows={2}
            placeholder="Any risks, gaps, or follow-up areas?"
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
          />
        </div>

        <div className="feedback-form__section">
          <label className="feedback-form__label" htmlFor="feedback-notes">
            Summary notes
          </label>
          <textarea
            id="feedback-notes"
            className="field feedback-form__textarea"
            rows={3}
            placeholder="Brief write-up for the hiring team…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </DrawerShell>
  );
}