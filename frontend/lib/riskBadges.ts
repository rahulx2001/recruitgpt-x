export type RiskTone = "critical" | "warning" | "info" | "neutral";

export type RiskBadgeData = {
  label: string;
  tone: RiskTone;
};

export function parseRiskBadges(
  concern?: string,
  topSignal?: string
): RiskBadgeData[] {
  const text = `${concern ?? ""} ${topSignal ?? ""}`.toLowerCase();
  const badges: RiskBadgeData[] = [];

  if (/90[- ]?day|90d/.test(text)) {
    badges.push({ label: "90D Notice", tone: "warning" });
  } else if (/60[- ]?day|60d/.test(text)) {
    badges.push({ label: "60D Notice", tone: "warning" });
  }
  if (
    /missing|gap|no .*ir\b|information retrieval|faiss|pinecone|weaviate/.test(
      text
    ) &&
    !/ir \/ retrieval/.test(text)
  ) {
    badges.push({ label: "Missing IR Stack", tone: "critical" });
  }
  if (/open to work.*no|not open to work|not actively looking/.test(text)) {
    badges.push({ label: "Open To Work = No", tone: "warning" });
  }
  if (/big tech|faang|google|meta|amazon/.test(text)) {
    badges.push({ label: "Big Tech Risk", tone: "info" });
  }
  if (!badges.length && concern) {
    const short = concern.length > 28 ? `${concern.slice(0, 25)}…` : concern;
    badges.push({ label: short, tone: "warning" });
  }
  return badges.slice(0, 2);
}