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

export function dashboardUserFirstName(fullName: string | undefined): string {
  if (!fullName?.trim()) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
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
  return out;
}

export function resolveRecruitingHealth(
  analytics: WorkspaceAnalyticsPayload | null | undefined
): RecruitingHealth | null {
  return analytics?.recruiting_health ?? null;
}