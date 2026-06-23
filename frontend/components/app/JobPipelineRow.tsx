"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FUNNEL_STAGE_COLORS } from "@/lib/funnelColors";

export function JobPipelineRow({
  id,
  title,
  status,
  daysOpen,
  stages,
  strongHires,
  candidateCount,
}: {
  id: string;
  title: string;
  status: string;
  daysOpen: number;
  stages: { applied: number; screened: number; interview: number; offer: number };
  strongHires?: number;
  candidateCount: number;
}) {
  const total =
    stages.applied + stages.screened + stages.interview + stages.offer;
  const segs = [
    { v: stages.applied, c: FUNNEL_STAGE_COLORS.Applied, label: "Applied" },
    { v: stages.screened, c: FUNNEL_STAGE_COLORS.Screened, label: "Screened" },
    { v: stages.interview, c: FUNNEL_STAGE_COLORS.Interview, label: "Interview" },
    { v: stages.offer, c: FUNNEL_STAGE_COLORS.Offer, label: "Offer" },
  ];

  return (
    <Link href={`/jobs/${id}`} className="job-pipeline-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-semibold text-ink truncate">
            {title}
          </span>
          <span className="badge badge--neutral text-[10.5px]">
            {status} · {daysOpen}d
          </span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-subtle mt-2.5 max-w-md">
          {segs.map((s) => (
            <div
              key={s.label}
              title={`${s.label}: ${s.v}`}
              style={{
                width: total > 0 ? `${(s.v / total) * 100}%` : "0%",
                background: s.c,
                minWidth: s.v > 0 ? 4 : 0,
              }}
            />
          ))}
        </div>
        <p className="text-[11.5px] text-ink-muted mt-2">
          {candidateCount} candidates
          {strongHires != null ? ` · ${strongHires} strong hires` : ""}
          {stages.interview > 0 ? ` · ${stages.interview} in interview` : ""}
        </p>
      </div>
      <span className="text-action text-[12px] font-medium shrink-0 inline-flex items-center gap-1">
        View job <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}