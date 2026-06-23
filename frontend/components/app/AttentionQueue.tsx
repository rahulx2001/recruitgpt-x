"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CandidateAvatar,
  RecommendationBadge,
  StageBadge,
  SectionHeader,
} from "@/components/app/Atoms";
import { RiskBadgeList } from "@/components/app/RiskBadge";
import type { AttentionQueueItem } from "@/lib/analyticsTypes";
import type { Recommendation, PipelineStage } from "@/lib/mock";

export type { AttentionQueueItem };

export function AttentionQueue({ items }: { items: AttentionQueueItem[] }) {
  return (
    <div className="panel panel--flush h-full">
      <div className="panel__head">
        <SectionHeader
          title="Needs attention"
          subtitle="Your action inbox for today"
          action={
            <Link href="/candidates" className="text-action">
              Inbox <ArrowRight size={13} />
            </Link>
          }
        />
      </div>
      {items.length === 0 ? (
        <p className="panel__body text-[13px] text-ink-muted">
          Nothing urgent — pipeline looks healthy. Review top ranked candidates below.
        </p>
      ) : (
        <div className="attention-queue">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="attention-queue__row">
              {item.rank != null ? (
                <span className="attention-queue__rank tnum">#{item.rank}</span>
              ) : (
                <span className="attention-queue__rank attention-queue__rank--dot" />
              )}
              <CandidateAvatar name={item.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-ink truncate">
                    {item.name}
                  </span>
                  {item.recommendation ? (
                    <RecommendationBadge value={item.recommendation as Recommendation} />
                  ) : null}
                  {item.stage ? (
                    <StageBadge value={item.stage as PipelineStage} />
                  ) : null}
                </div>
                <p className="text-[11.5px] text-ink-muted truncate mt-0.5">
                  {item.detail ? (
                    <RiskBadgeList concern={item.detail} />
                  ) : (
                    item.subtitle
                  )}
                </p>
              </div>
              <span className="attention-queue__action">{item.action_label} →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}