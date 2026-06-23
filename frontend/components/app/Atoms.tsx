import * as React from "react";
import Link from "next/link";
import { Check, type LucideIcon } from "lucide-react";
import { initials } from "@/lib/utils";
import type { Candidate, Recommendation, PipelineStage } from "@/lib/mock";

const CANDIDATE_AVATAR_PALETTE = [
  { bg: "#EEF2FF", ink: "#4F46E5" },
  { bg: "#FEF3E2", ink: "#B45309" },
  { bg: "#E8F5EC", ink: "#2D7A4F" },
  { bg: "#FDECEA", ink: "#C0392B" },
  { bg: "#F2F0FF", ink: "#6D28D9" },
  { bg: "#E6F4FF", ink: "#0369A1" },
] as const;

function candidateAvatarTone(name: string) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % CANDIDATE_AVATAR_PALETTE.length;
  return CANDIDATE_AVATAR_PALETTE[i]!;
}

export function Avatar({
  name,
  color,
  size = 32,
  src,
}: {
  name: string;
  color: string;
  size?: number;
  src?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="avatar ring-2 ring-white/80 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="avatar ring-2 ring-white/80"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function CandidateAvatar({
  name,
  size = 38,
}: {
  name: string;
  size?: number;
}) {
  const tone = candidateAvatarTone(name);
  return (
    <span
      className="avatar shrink-0 font-medium"
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.ink,
        fontSize: size * 0.36,
      }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

const recMap: Record<Recommendation, string> = {
  "Strong Hire": "badge--positive",
  Hire: "badge--info",
  "Lean Hire": "badge--warning",
  Hold: "badge--neutral",
};

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return <span className={`badge ${recMap[value]} badge--dot`}>{value}</span>;
}

const stageMap: Record<PipelineStage, string> = {
  Applied: "badge--neutral",
  Screened: "badge--info",
  Interview: "badge--accent",
  Offer: "badge--warning",
  Hired: "badge--positive",
};

export function StageBadge({ value }: { value: PipelineStage }) {
  return <span className={`badge ${stageMap[value]}`}>{value}</span>;
}

export function ScoreMeter({
  value,
  label,
  accent = "var(--ink)",
}: {
  value: number;
  label?: string;
  accent?: string;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">
            {label}
          </span>
          <span className="text-[11px] font-semibold text-ink tnum">{value}%</span>
        </div>
      )}
      <div className="meter">
        <div
          className="meter__fill"
          style={{ width: `${value}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function matchScoreTone(value: number): string {
  if (value >= 90) return "var(--ink)";
  if (value >= 80) return "var(--cool)";
  if (value >= 70) return "var(--warning)";
  return "var(--ink-muted)";
}

export function MatchScore({ value, size = 44 }: { value: number; size?: number }) {
  const tone = matchScoreTone(value);
  return (
    <div
      className="relative grid place-items-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="19" fill="none" stroke="var(--line)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r="19"
          fill="none"
          stroke={tone}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 119.4} 119.4`}
        />
      </svg>
      <span
        className="absolute font-semibold tnum"
        style={{ fontSize: size * 0.28, color: tone }}
      >
        {value}
      </span>
    </div>
  );
}

function KpiBody({
  label,
  value,
  delta,
  hint,
  positive = true,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  positive?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <>
      <div className="kpi__head">
        <div className="kpi__label">{label}</div>
        {Icon ? (
          <span className="kpi__icon" aria-hidden>
            <Icon size={15} strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div className="kpi__value">{value}</div>
      {delta ? (
        <div className={`kpi__delta ${positive ? "" : "is-negative"}`}>
          {positive ? "↑" : "↓"} {delta}
        </div>
      ) : hint ? (
        <div className="kpi__hint">{hint}</div>
      ) : null}
    </>
  );
}

export function Kpi({
  label,
  value,
  delta,
  hint,
  positive = true,
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  positive?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className="kpi">
      <KpiBody
        label={label}
        value={value}
        delta={delta}
        hint={hint}
        positive={positive}
        icon={icon}
      />
    </div>
  );
}

export function KpiLink({
  href,
  label,
  value,
  delta,
  hint,
  positive,
  icon,
  definition,
}: {
  href: string;
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  positive?: boolean;
  icon?: LucideIcon;
  definition?: string;
}) {
  const trendUp = positive ?? true;
  return (
    <Link href={href} className="kpi kpi--link kpi--tall" title={definition}>
      <KpiBody
        label={label}
        value={value}
        delta={delta}
        hint={hint}
        positive={trendUp}
        icon={icon}
      />
    </Link>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="panel__title">{title}</h2>
        {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function FeaturedCandidate({
  candidate,
  href,
}: {
  candidate: Candidate;
  href: string;
}) {
  return (
    <Link href={href} className="block transition-colors hover:bg-subtle/40">
      <div className="spotlight__hero border-b border-line">
        <div className="flex items-start gap-4">
          <MatchScore value={candidate.matchScore} size={52} />
          <CandidateAvatar name={candidate.name} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold text-ink tracking-tight">
                {candidate.name}
              </span>
              <RecommendationBadge value={candidate.recommendation} />
              <StageBadge value={candidate.stage} />
            </div>
            <p className="text-[12.5px] text-ink-muted mt-0.5 truncate">
              {candidate.title} · {candidate.company}
            </p>
          </div>
        </div>
        <div className="spotlight__metrics">
          <ScoreMeter label="Skills" value={candidate.skillsMatch} />
          <ScoreMeter label="Experience" value={candidate.experienceMatch} />
          <ScoreMeter label="GitHub" value={candidate.githubMatch} />
        </div>
      </div>
      {candidate.reasons.length > 0 && (
        <div className="spotlight__reasons">
          {candidate.reasons.slice(0, 3).map((r) => (
            <div key={r} className="spotlight__reason">
              <Check size={13} className="text-positive shrink-0 mt-0.5" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

export function RankedCandidateRow({
  rank,
  candidate,
  href,
}: {
  rank: number;
  candidate: Candidate;
  href: string;
}) {
  return (
    <Link href={href} className="rank-row">
      <span className="rank-row__num tnum">{rank}</span>
      <CandidateAvatar name={candidate.name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-ink truncate">
          {candidate.name}
        </div>
        <div className="text-[12px] text-ink-muted truncate">
          {candidate.title} · {candidate.company}
        </div>
      </div>
      <div className="w-14 meter hidden sm:block">
        <div
          className="meter__fill"
          style={{
            width: `${candidate.matchScore}%`,
            background: "var(--ink)",
            opacity: 0.65,
          }}
        />
      </div>
      <span className="rank-row__score tnum">{candidate.matchScore}</span>
    </Link>
  );
}