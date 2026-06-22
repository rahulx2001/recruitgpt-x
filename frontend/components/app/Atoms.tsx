import * as React from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { initials } from "@/lib/utils";
import {
  resolveCandidateGender,
  type CandidateGender,
} from "@/lib/gender";
import type { Recommendation, PipelineStage } from "@/lib/mock";

function FemaleSilhouette({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="7.5" r="3.25" />
      <path d="M12 11.2c-2.8 0-5 1.9-5.4 4.5L6 20h2.2l.6-3.2h5.4l.6 3.2H17l-.6-4.3c-.4-2.6-2.6-4.5-5.4-4.5z" />
    </svg>
  );
}

function MaleSilhouette({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="7.5" r="3.25" />
      <path d="M7.5 20c0-2.9 2-5 4.5-5s4.5 2.1 4.5 5h-2c0-1.7-1.1-3-2.5-3s-2.5 1.3-2.5 3h-2z" />
      <path d="M9.5 12.5h5v1.8c-.8-.4-1.7-.6-2.5-.6s-1.7.2-2.5.6v-1.8z" />
    </svg>
  );
}

const genderStyles: Record<
  CandidateGender,
  { bg: string; color: string }
> = {
  female: { bg: "var(--accent-soft)", color: "var(--accent)" },
  male: { bg: "var(--sky-wash)", color: "var(--cool)" },
};

export function Avatar({
  name,
  color,
  size = 32,
}: {
  name: string;
  color: string;
  size?: number;
}) {
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
  gender,
  size = 38,
}: {
  name: string;
  gender?: string | null;
  size?: number;
}) {
  const resolved = resolveCandidateGender(name, gender);
  const iconSize = Math.round(size * 0.48);
  const tone = resolved ? genderStyles[resolved] : null;

  return (
    <span
      className="avatar ring-2 ring-white/80 grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background: tone?.bg ?? "var(--subtle)",
        color: tone?.color ?? "var(--ink-muted)",
      }}
      title={name}
      aria-label={`${name}${resolved ? ` (${resolved})` : ""}`}
    >
      {resolved === "female" ? (
        <FemaleSilhouette size={iconSize} />
      ) : resolved === "male" ? (
        <MaleSilhouette size={iconSize} />
      ) : (
        <UserRound size={iconSize} strokeWidth={2} />
      )}
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
  accent = "#5d2a1a",
}: {
  value: number;
  label?: string;
  accent?: string;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12.5px] text-ink-muted">{label}</span>
          <span className="text-[12.5px] font-semibold text-ink tnum">
            {value}%
          </span>
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

export function MatchScore({ value, size = 44 }: { value: number; size?: number }) {
  const tone =
    value >= 90 ? "#5d2a1a" : value >= 80 ? "#5b8def" : value >= 70 ? "#b45309" : "#777b86";
  return (
    <div
      className="relative grid place-items-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r="19" fill="none" stroke="#e8e8ea" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="19"
          fill="none"
          stroke={tone}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * 119.4} 119.4`}
        />
      </svg>
      <span
        className="absolute font-semibold tnum"
        style={{ fontSize: size * 0.3, color: tone }}
      >
        {value}
      </span>
    </div>
  );
}

export function Kpi({
  label,
  value,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="kpi group">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value transition-transform duration-200 group-hover:scale-[1.02] origin-left">
        {value}
      </div>
      {delta && (
        <div
          className="kpi__delta"
          style={{ color: positive ? "var(--positive)" : "var(--critical)" }}
        >
          {positive ? "▲" : "▼"} {delta}
        </div>
      )}
    </div>
  );
}

export function KpiLink({
  href,
  label,
  value,
  delta,
  positive = true,
}: {
  href: string;
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <Link href={href} className="kpi kpi--link group">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value transition-transform duration-200 group-hover:scale-[1.02] origin-left">
        {value}
      </div>
      {delta && (
        <div
          className="kpi__delta"
          style={{ color: positive ? "var(--positive)" : "var(--critical)" }}
        >
          {positive ? "▲" : "▼"} {delta}
        </div>
      )}
    </Link>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-ink tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
