"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { funnelColor } from "@/lib/funnelColors";
import type { PipelineStage } from "@/lib/mock";

type FunnelStage = { stage: string; count: number; color?: string };
type Conversion = { from_stage: string; to_stage: string; rate: number };

const EMPTY_COPY: Record<string, string> = {
  Offer: "No candidates have reached offer stage yet.",
  Hired: "No hires recorded in this cycle yet.",
};

function funnelHref(stage: PipelineStage): string {
  return `/candidates?stage=${encodeURIComponent(stage)}`;
}

export function PipelineFunnelVertical({
  funnel,
  stageConversion,
  hireRate,
}: {
  funnel: FunnelStage[];
  stageConversion: Conversion[];
  hireRate: string;
}) {
  const router = useRouter();

  const conversionAfter = (stage: string) => {
    const c = stageConversion.find((x) => x.from_stage === stage);
    return c ? c.rate : null;
  };

  return (
    <div className="funnel-vertical">
      <div className="funnel-vertical__meta">
        <span className="funnel-vertical__rate tnum">{hireRate}</span>
        <span className="funnel-vertical__rate-label">end-to-end hire rate</span>
        <Link href="/analytics#funnel" className="text-action text-[12px] ml-auto">
          View analytics →
        </Link>
      </div>
      {funnel.map((s, i) => {
        const conv = conversionAfter(s.stage);
        const emptyNote = s.count === 0 ? EMPTY_COPY[s.stage] : null;
        return (
          <div key={s.stage} className="funnel-vertical__block">
            <button
              type="button"
              className="funnel-vertical__stage"
              onClick={() => router.push(funnelHref(s.stage as PipelineStage))}
            >
              <span
                className="funnel-vertical__dot"
                style={{ background: funnelColor(s.stage, i) }}
              />
              <span className="funnel-vertical__label">{s.stage}</span>
              <span className="funnel-vertical__count tnum">
                {s.count.toLocaleString()}
              </span>
            </button>
            {emptyNote ? (
              <p className="funnel-vertical__empty">{emptyNote}</p>
            ) : null}
            {conv != null && i < funnel.length - 1 ? (
              <div className="funnel-vertical__conv">
                <span className="funnel-vertical__arrow">↓</span>
                <span className="tnum">{conv}% conversion</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}