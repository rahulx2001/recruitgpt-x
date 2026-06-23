"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import type { RecruitingHealth } from "@/lib/analyticsTypes";

export function RecruitingHealthSummary({
  health,
}: {
  health: RecruitingHealth | null | undefined;
}) {
  if (!health?.alerts?.length) return null;

  return (
    <section className="recruiting-health" aria-labelledby="recruiting-health-title">
      <div className="recruiting-health__head">
        <h2 id="recruiting-health-title" className="recruiting-health__title">
          {health.title}
        </h2>
        <Link href={health.cta_href} className="btn btn--primary btn--sm">
          {health.cta_label}
          <ChevronRight size={14} />
        </Link>
      </div>
      <ul className="recruiting-health__list">
        {health.alerts.map((alert) => (
          <li key={alert.message}>
            {alert.href ? (
              <Link href={alert.href} className="recruiting-health__item">
                <RecruitingHealthIcon kind={alert.kind} />
                <span>{alert.message}</span>
              </Link>
            ) : (
              <div className="recruiting-health__item">
                <RecruitingHealthIcon kind={alert.kind} />
                <span>{alert.message}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecruitingHealthIcon({ kind }: { kind: string }) {
  if (kind === "ok") {
    return <CheckCircle2 size={15} className="recruiting-health__icon recruiting-health__icon--ok" />;
  }
  return (
    <AlertTriangle
      size={15}
      className="recruiting-health__icon recruiting-health__icon--warn"
    />
  );
}