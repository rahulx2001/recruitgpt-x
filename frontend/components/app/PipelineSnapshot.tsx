"use client";

import { SectionHeader } from "@/components/app/Atoms";
import { PipelineFunnelVertical } from "@/components/app/PipelineFunnelVertical";

type FunnelStage = { stage: string; count: number; color?: string };
type Conversion = { from_stage: string; to_stage: string; rate: number };

export function PipelineSnapshot({
  funnel,
  stageConversion,
  hireRate,
}: {
  funnel: FunnelStage[];
  stageConversion: Conversion[];
  hireRate: string;
}) {
  return (
    <div className="panel h-full">
      <div className="panel__head panel__head--inline">
        <SectionHeader
          title="Pipeline snapshot"
          subtitle="Stage volume + conversion"
        />
      </div>
      <div className="panel__body panel__body--tight">
        <PipelineFunnelVertical
          funnel={funnel}
          stageConversion={stageConversion}
          hireRate={hireRate}
        />
      </div>
    </div>
  );
}