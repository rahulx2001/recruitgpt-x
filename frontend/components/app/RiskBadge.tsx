import { parseRiskBadges, type RiskBadgeData } from "@/lib/riskBadges";

const toneClass: Record<RiskBadgeData["tone"], string> = {
  critical: "risk-badge--critical",
  warning: "risk-badge--warning",
  info: "risk-badge--info",
  neutral: "risk-badge--neutral",
};

const toneDot: Record<RiskBadgeData["tone"], string> = {
  critical: "🔴",
  warning: "🟠",
  info: "🔵",
  neutral: "🟡",
};

export function RiskBadge({ badge }: { badge: RiskBadgeData }) {
  return (
    <span className={`risk-badge ${toneClass[badge.tone]}`}>
      <span aria-hidden>{toneDot[badge.tone]}</span>
      {badge.label}
    </span>
  );
}

export function RiskBadgeList({
  concern,
  topSignal,
}: {
  concern?: string;
  topSignal?: string;
}) {
  const badges = parseRiskBadges(concern, topSignal);
  if (!badges.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <RiskBadge key={b.label} badge={b} />
      ))}
    </span>
  );
}