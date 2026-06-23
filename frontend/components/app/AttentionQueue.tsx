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
import type { TopCandidateRow } from "./TopCandidatesTable";
import type { PipelineStage, Recommendation } from "@/lib/mock";

type Interview = {
  id: string;
  candidate: string;
  candidate_color: string;
  round: string;
  when: string;
  status: string;
  role: string;
};

export type AttentionItem = {
  id: string;
  rank?: number;
  name: string;
  subtitle: string;
  detail?: string;
  recommendation?: Recommendation;
  stage?: PipelineStage;
  href: string;
  actionLabel: string;
  priority: number;
};

function scoreToRecommendation(score: number): Recommendation {
  if (score >= 88) return "Strong Hire";
  if (score >= 75) return "Hire";
  if (score >= 60) return "Lean Hire";
  return "Hold";
}

export function buildAttentionQueue(
  topCandidates: TopCandidateRow[],
  interviews: Interview[]
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const c of topCandidates) {
    const rec = scoreToRecommendation(c.score);
    if (
      rec === "Strong Hire" &&
      (c.stage === "Applied" || c.stage === "Screened")
    ) {
      items.push({
        id: `strong-${c.candidate_id}`,
        rank: c.rank,
        name: c.name,
        subtitle: c.top_signal,
        detail: c.concern,
        recommendation: rec,
        stage: c.stage as PipelineStage,
        href: `/candidates?highlight=${c.candidate_id}`,
        actionLabel: "Move to interview",
        priority: 1,
      });
    }
  }

  for (const i of interviews.filter((x) => x.when.startsWith("Today"))) {
    items.push({
      id: `today-${i.id}`,
      name: i.candidate,
      subtitle: `${i.round} · ${i.role}`,
      stage: "Interview",
      href: "/interviews?filter=today",
      actionLabel: "View schedule",
      priority: 2,
    });
  }

  for (const i of interviews.filter((x) => x.status === "Awaiting feedback")) {
    items.push({
      id: `feedback-${i.id}`,
      name: i.candidate,
      subtitle: `${i.round} · feedback due`,
      href: "/interviews?filter=feedback",
      actionLabel: "Submit scorecard",
      priority: 3,
    });
  }

  for (const c of topCandidates) {
    if (c.concern && !items.some((x) => x.id.includes(c.candidate_id))) {
      items.push({
        id: `concern-${c.candidate_id}`,
        rank: c.rank,
        name: c.name,
        subtitle: c.concern,
        stage: c.stage as PipelineStage,
        href: `/candidates?highlight=${c.candidate_id}`,
        actionLabel: "Review",
        priority: 4,
      });
    }
  }

  for (const c of topCandidates) {
    if (c.rank <= 10 && c.stage === "Applied") {
      items.push({
        id: `contact-${c.candidate_id}`,
        rank: c.rank,
        name: c.name,
        subtitle: "Top-10 · not yet in pipeline",
        recommendation: scoreToRecommendation(c.score),
        stage: "Applied",
        href: `/candidates?highlight=${c.candidate_id}`,
        actionLabel: "Add to shortlist",
        priority: 5,
      });
    }
  }

  return items
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);
}

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
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
                    <RecommendationBadge value={item.recommendation} />
                  ) : null}
                  {item.stage ? <StageBadge value={item.stage} /> : null}
                </div>
                <p className="text-[11.5px] text-ink-muted truncate mt-0.5">
                  {item.detail ? (
                    <RiskBadgeList concern={item.detail} />
                  ) : (
                    item.subtitle
                  )}
                </p>
              </div>
              <span className="attention-queue__action">{item.actionLabel} →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}