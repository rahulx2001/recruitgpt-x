"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";

export function PriorityBanner({
  severity,
  message,
  href,
  ctaLabel,
}: {
  severity: string;
  message: string;
  href: string;
  ctaLabel?: string;
}) {
  const isCritical = severity === "critical";
  const isHigh = severity === "high";

  return (
    <div
      className={`priority-banner priority-banner--${severity}`}
      role={isCritical ? "alert" : "status"}
    >
      <span className="priority-banner__icon" aria-hidden>
        {isCritical || isHigh ? (
          <AlertTriangle size={18} />
        ) : (
          <Info size={18} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="priority-banner__label">Priority</p>
        <p className="priority-banner__message">{message}</p>
      </div>
      <Link href={href} className="btn btn--primary btn--sm shrink-0">
        {ctaLabel ?? "Review"} <ArrowRight size={13} />
      </Link>
    </div>
  );
}