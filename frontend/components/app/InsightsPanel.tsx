"use client";

import Link from "next/link";
import type { WorkspaceAnalyticsPayload } from "@/lib/analyticsTypes";

function severityClass(severity: string): string {
  if (severity === "critical") return "analytics-insight--critical";
  if (severity === "high") return "analytics-insight--high";
  if (severity === "medium") return "analytics-insight--medium";
  return "analytics-insight--low";
}

export function InsightsPanel({
  insights,
  compact,
}: {
  insights: WorkspaceAnalyticsPayload["insights"];
  compact?: boolean;
}) {
  if (!insights.length) return null;

  return (
    <div className={`panel ${compact ? "" : "analytics-bento__full"}`}>
      <div className="panel__head">
        <div>
          <h2 className="panel__title">Insights & actions</h2>
          <p className="panel__subtitle">What requires your attention right now</p>
        </div>
      </div>
      <div className="panel__body panel__body--list">
        <div className="analytics-insights">
          {insights.map((insight, i) => (
            <Link
              key={`${insight.message}-${i}`}
              href={insight.href}
              className={`analytics-insight ${severityClass(insight.severity)}`}
            >
              <span className="analytics-insight__severity">{insight.severity}</span>
              <span className="analytics-insight__message">{insight.message}</span>
              <span className="analytics-insight__action">Review →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}