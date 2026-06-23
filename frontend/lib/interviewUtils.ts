export type InterviewStatus = "Scheduled" | "Awaiting feedback" | "Completed";

export type InterviewRecord = {
  id: string;
  candidate_id: string;
  candidate: string;
  candidate_color: string;
  role: string;
  round: string;
  interviewer: string;
  when: string;
  status: InterviewStatus;
  recommendation: string;
  rank?: number;
  match_score?: number;
  pipeline_stage?: string;
  concern?: string;
  starts_in_minutes?: number | null;
  meeting_url?: string;
  scorecard_status?: string;
};

export function candidateHref(candidateId: string, scorecard = false) {
  const params = new URLSearchParams({ highlight: candidateId });
  if (scorecard) params.set("scorecard", "1");
  return `/candidates?${params.toString()}`;
}

export function parseWhen(when: string): { primary: string; secondary: string } {
  const parts = when.split(" · ");
  if (parts.length >= 2) {
    return {
      primary: parts[parts.length - 1]!,
      secondary: parts.slice(0, -1).join(" · "),
    };
  }
  return { primary: when, secondary: "" };
}

export function startsSoonLabel(
  interview: InterviewRecord
): string | null {
  const mins = interview.starts_in_minutes;
  if (
    interview.status !== "Scheduled" ||
    mins == null ||
    mins <= 0 ||
    mins > 120
  ) {
    return null;
  }
  if (mins < 60) return `Starts in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `Starts in ${hours}h`;
  return `Starts in ${hours}h ${rem}m`;
}

export function matchesView(when: string, view: "Today" | "Week" | "Month"): boolean {
  if (view === "Today") return when.startsWith("Today");
  if (view === "Week") {
    return (
      when.startsWith("Today") ||
      when.startsWith("Tomorrow") ||
      /Mon|Tue|Wed|Thu|Fri/.test(when)
    );
  }
  return true;
}

export function sortInterviews(rows: InterviewRecord[]): InterviewRecord[] {
  const order: Record<InterviewStatus, number> = {
    Scheduled: 0,
    "Awaiting feedback": 1,
    Completed: 2,
  };
  return [...rows].sort((a, b) => {
    const sa = order[a.status] - order[b.status];
    if (sa !== 0) return sa;
    if (a.status === "Scheduled") {
      return (a.starts_in_minutes ?? 9999) - (b.starts_in_minutes ?? 9999);
    }
    return (a.rank ?? 999) - (b.rank ?? 999);
  });
}