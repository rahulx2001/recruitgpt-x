/** Warm rust gradient — matches Steep / RecruitGPT accent palette */
export const FUNNEL_STAGE_COLORS: Record<string, string> = {
  Applied: "#5d2a1a",
  Screened: "#6b3826",
  Interview: "#7d4832",
  Offer: "#915640",
  Hired: "#a6654e",
};

export const FUNNEL_COLOR_SEQUENCE = [
  FUNNEL_STAGE_COLORS.Applied,
  FUNNEL_STAGE_COLORS.Screened,
  FUNNEL_STAGE_COLORS.Interview,
  FUNNEL_STAGE_COLORS.Offer,
  FUNNEL_STAGE_COLORS.Hired,
] as const;

export function funnelColor(stage: string, index?: number): string {
  return (
    FUNNEL_STAGE_COLORS[stage] ??
    FUNNEL_COLOR_SEQUENCE[index ?? 0] ??
    "#5d2a1a"
  );
}