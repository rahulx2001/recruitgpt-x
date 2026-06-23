"use client";

import Link from "next/link";
import {
  Check,
  Github,
  MapPin,
  Briefcase,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";
import {
  CandidateAvatar,
  MatchScore,
  RecommendationBadge,
  StageBadge,
} from "@/components/app/Atoms";
import { DrawerShell } from "@/components/app/DrawerShell";
import type { Candidate, PipelineStage } from "@/lib/mock";
import type { PoolAvgs } from "@/lib/useCandidatePool";

const PIPELINE_STEPS: PipelineStage[] = [
  "Applied",
  "Screened",
  "Interview",
  "Offer",
  "Hired",
];

function deltaLabel(value: number, avg: number): { text: string; up: boolean } {
  const d = value - avg;
  if (d > 2) return { text: `+${d} vs pool avg`, up: true };
  if (d < -2) return { text: `${d} vs pool avg`, up: false };
  return { text: "Near pool average", up: false };
}

export function CandidateDrawer({
  candidate: c,
  rank,
  poolSize,
  poolAvgs,
  onClose,
  onAdvance,
  onReject,
  readonly = false,
}: {
  candidate: Candidate;
  rank: number;
  poolSize: number;
  poolAvgs: PoolAvgs;
  onClose: () => void;
  onAdvance?: () => void;
  onReject?: () => void;
  readonly?: boolean;
}) {
  const advanceLabel =
    c.stage === "Hired"
      ? "Already hired"
      : c.stage === "Offer"
      ? "Mark as hired"
      : c.stage === "Interview"
      ? "Advance to offer"
      : c.stage === "Screened"
      ? "Advance to interview"
      : "Advance to screened";

  const percentile =
    rank > 0 && poolSize > 0
      ? Math.max(1, Math.round(((poolSize - rank + 1) / poolSize) * 100))
      : null;
  const stageIdx = PIPELINE_STEPS.indexOf(c.stage);
  const signals = [
    { name: "Skills", value: c.skillsMatch, avg: poolAvgs.skills },
    { name: "Experience", value: c.experienceMatch, avg: poolAvgs.experience },
    { name: "GitHub", value: c.githubMatch, avg: poolAvgs.github },
    { name: "Overall", value: c.matchScore, avg: poolAvgs.match },
  ];

  const footer = readonly ? (
    <button type="button" className="btn btn--secondary flex-1" onClick={onClose}>
      Close
    </button>
  ) : (
    <>
      <button
        type="button"
        className="btn btn--primary flex-1"
        disabled={c.stage === "Hired"}
        onClick={onAdvance}
      >
        {advanceLabel}
      </button>
      <button
        type="button"
        className="btn btn--secondary text-critical"
        onClick={onReject}
      >
        Remove
      </button>
    </>
  );

  return (
    <DrawerShell
      title="Candidate scorecard"
      subtitle="Ranker reasoning & fit signals"
      ariaLabel="Candidate scorecard"
      onClose={onClose}
      footer={footer}
    >
      <div className="scorecard-hero">
        <CandidateAvatar name={c.name} size={52} />
        <div className="min-w-0">
          <h3 className="scorecard-hero__title">{c.name}</h3>
          <p className="scorecard-hero__sub">
            {c.title}
            {c.company && c.company !== "—" ? ` @ ${c.company}` : ""}
          </p>
          <p className="scorecard-hero__loc">
            <MapPin size={12} /> {c.location}
          </p>
        </div>
      </div>

      <div className="scorecard-score-row">
        <MatchScore value={c.matchScore} size={52} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RecommendationBadge value={c.recommendation} />
            <StageBadge value={c.stage} />
          </div>
          <p className="text-[12px] text-ink-muted mt-2">
            {c.experienceYears}y experience · Growth {c.trajectory.toLowerCase()}
          </p>
          <p className="text-[11.5px] text-ink-faint mt-1 inline-flex items-center gap-1">
            <Github size={12} /> GitHub signal {c.githubScore}
          </p>
        </div>
      </div>

      <div className="scorecard-stats">
        <div className="scorecard-stat">
          <div className="scorecard-stat__label">Challenge rank</div>
          <div className="scorecard-stat__value">{rank > 0 ? `#${rank}` : "—"}</div>
          <div className="scorecard-stat__hint">
            of {poolSize.toLocaleString()} candidates
          </div>
        </div>
        <div className="scorecard-stat">
          <div className="scorecard-stat__label">Percentile</div>
          <div className="scorecard-stat__value">
            {percentile != null ? `Top ${percentile}%` : "—"}
          </div>
          <div className="scorecard-stat__hint">vs challenge pool</div>
        </div>
        <div className="scorecard-stat">
          <div className="scorecard-stat__label">Applied</div>
          <div className="scorecard-stat__value">{c.appliedDaysAgo}d ago</div>
          <div className="scorecard-stat__hint">in active pipeline</div>
        </div>
        <div className="scorecard-stat">
          <div className="scorecard-stat__label">Target role</div>
          <div className="scorecard-stat__value text-[13px] leading-snug">{c.job}</div>
          <div className="scorecard-stat__hint">ranker calibration</div>
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Pipeline stage</div>
        <div className="scorecard-pipeline__track">
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step}
              className={`scorecard-pipeline__dot${
                i < stageIdx ? " is-done" : i === stageIdx ? " is-current" : ""
              }`}
            />
          ))}
        </div>
        <div className="scorecard-pipeline">
          {PIPELINE_STEPS.map((step, i) => (
            <span
              key={step}
              className={`scorecard-pipeline__step${
                i < stageIdx ? " is-done" : i === stageIdx ? " is-current" : ""
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Fit signals vs pool</div>
        <div className="scorecard-signals">
          {signals.map((s) => {
            const d = deltaLabel(s.value, s.avg);
            return (
              <div key={s.name} className="scorecard-signal">
                <div className="scorecard-signal__row">
                  <span className="scorecard-signal__name">{s.name}</span>
                  <span className="scorecard-signal__value">{s.value}</span>
                </div>
                <div
                  className={`scorecard-signal__delta${d.up ? " is-up" : " is-down"}`}
                >
                  {d.text}
                </div>
                <div className="meter mt-2">
                  <div
                    className="meter__fill"
                    style={{ width: `${s.value}%`, background: "var(--ink)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-faint mt-2 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <TrendingUp size={11} /> Trajectory: {c.trajectory}
          </span>
          <span className="inline-flex items-center gap-1">
            <Target size={11} /> Pool avg: {poolAvgs.match}
          </span>
          <span className="inline-flex items-center gap-1">
            <Briefcase size={11} /> {c.company}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} /> {c.skills.length} skills indexed
          </span>
        </p>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Skills</div>
        <div className="scorecard-skills">
          {c.skills.map((s) => (
            <span key={s} className="badge badge--neutral">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Why this ranking</div>
        <div className="scorecard-reasoning">
          {c.reasons.map((r) => (
            <div key={r} className="scorecard-reasoning__item">
              <Check size={13} className="text-positive shrink-0 mt-0.5" />
              <span>{r}</span>
            </div>
          ))}
          {c.concern ? (
            <div className="scorecard-reasoning__concern">
              <span className="text-warning font-semibold">Watch: </span>
              {c.concern}
            </div>
          ) : null}
        </div>
      </div>

      {readonly ? (
        <p className="text-[12px] text-ink-muted mt-4">
          <Link
            href={`/candidates?highlight=${c.id}`}
            className="text-action font-medium"
          >
            Open full candidate profile →
          </Link>
        </p>
      ) : null}
    </DrawerShell>
  );
}