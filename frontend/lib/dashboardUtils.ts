import type {
  RecruitingHealth,
  WorkspaceAnalyticsPayload,
} from "./analyticsTypes";

export function dashboardGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function dashboardDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function syncPillLabel(
  synced: boolean,
  matched: number,
  total: number
): { text: string; tone: "ok" | "warn" } {
  if (synced && matched === total) {
    return { text: `Rankings synced · ${matched}/${total}`, tone: "ok" };
  }
  return { text: `${matched}/${total} matched · Re-sync`, tone: "warn" };
}

type ActivityItem = {
  id: string;
  actor: string;
  actor_color: string;
  action: string;
  target: string;
  context: string;
  time: string;
  href: string;
};

const HUMAN_ACTIONS = new Set([
  "scheduled interview with",
  "shortlisted",
  "sent an offer to",
  "left a scorecard for",
  "moved",
]);

export function filterDashboardActivity(items: ActivityItem[]): ActivityItem[] {
  const scored = items.map((a) => {
    const human = [...HUMAN_ACTIONS].some((k) => a.action.toLowerCase().includes(k));
    const system = a.actor === "RecruitGPT" || a.actor === "Pipeline";
    return { item: a, score: human ? 2 : system ? 0 : 1 };
  });
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: ActivityItem[] = [];
  for (const { item } of scored) {
    const key = `${item.action}:${item.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 4) break;
  }
  return out.length ? out : items.slice(0, 4);
}

export function resolveRecruitingHealth(
  analytics: WorkspaceAnalyticsPayload | null | undefined
): RecruitingHealth | null {
  if (analytics?.recruiting_health) return analytics.recruiting_health;
  if (!analytics) return null;

  const alerts: RecruitingHealth["alerts"] = [];
  const screened =
    analytics.conversion_funnel.find((s) => s.stage === "Screened")?.count ?? 0;
  const strongInsight = analytics.insights.find((i) =>
    i.message.toLowerCase().includes("strong hire")
  );
  const strongCount = strongInsight
    ? parseInt(strongInsight.message, 10) || screened
    : screened;

  if (strongCount > 0) {
    alerts.push({
      kind: "warn",
      message: `${strongCount} candidates need review`,
      href: "/candidates?stage=Screened",
    });
  }
  const awaiting = analytics.interviews_summary?.awaiting_feedback ?? 0;
  if (awaiting > 0) {
    alerts.push({
      kind: "warn",
      message: `${awaiting} scorecards overdue`,
      href: "/interviews?filter=feedback",
    });
  }
  const unmatched = Math.max(
    0,
    (analytics.sync?.db_candidates ?? analytics.candidate_count) -
      (analytics.sync?.matched_rankings ?? analytics.candidate_count)
  );
  if (unmatched > 0) {
    alerts.push({
      kind: "warn",
      message: `${unmatched} candidates unmatched`,
      href: "/settings",
    });
  }
  if (!alerts.length) {
    alerts.push({
      kind: "ok",
      message: "Pipeline healthy — review top 10 candidates",
      href: "/candidates",
    });
  }

  return {
    title: "Recruiting health",
    alerts,
    cta_label: "Review candidates",
    cta_href: "/candidates",
  };
}