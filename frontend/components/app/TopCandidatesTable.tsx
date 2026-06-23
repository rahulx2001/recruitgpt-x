"use client";

import Link from "next/link";
import { CandidateAvatar, StageBadge } from "@/components/app/Atoms";
import { RiskBadgeList } from "@/components/app/RiskBadge";
import { CandidateActionButtons } from "@/components/app/CandidateActionButtons";
import type { PipelineStage } from "@/lib/mock";

export type TopCandidateRow = {
  candidate_id: string;
  name: string;
  rank: number;
  score: number;
  stage: string;
  top_signal: string;
  concern?: string;
};

export function TopCandidatesTable({
  rows,
  emptyMessage,
  showActions = false,
}: {
  rows: TopCandidateRow[];
  emptyMessage?: string;
  showActions?: boolean;
}) {
  if (!rows.length) {
    return (
      <p className="panel__body text-[13px] text-ink-muted">
        {emptyMessage ?? "No ranked candidates yet — import your challenge pool to get started."}
      </p>
    );
  }

  const compareWith = rows[0]?.candidate_id;

  return (
    <div className={`dash-top-table ${showActions ? "dash-top-table--actions" : ""}`}>
      <div className="dash-top-table__head">
        <span>#</span>
        <span>Candidate</span>
        <span>Match</span>
        <span>Stage</span>
        <span>Signal / Risk</span>
        {showActions ? <span>Actions</span> : <span aria-hidden />}
      </div>
      {rows.map((c) => (
        <div key={c.candidate_id} className="dash-top-table__row">
          <Link
            href={`/candidates?highlight=${c.candidate_id}`}
            className="dash-top-table__main"
          >
            <span className="tnum text-ink-muted font-medium">#{c.rank}</span>
            <span className="flex items-center gap-2.5 min-w-0">
              <CandidateAvatar name={c.name} size={28} />
              <span className="font-medium text-ink truncate">{c.name}</span>
            </span>
            <span className="tnum font-semibold text-ink">{c.score}</span>
            <StageBadge value={c.stage as PipelineStage} />
            <span className="min-w-0">
              {c.concern ? (
                <RiskBadgeList concern={c.concern} topSignal={c.top_signal} />
              ) : (
                <span className="text-[11.5px] text-ink-muted truncate block">
                  {c.top_signal}
                </span>
              )}
            </span>
          </Link>
          {showActions ? (
            <CandidateActionButtons
              candidateId={c.candidate_id}
              compareWith={compareWith !== c.candidate_id ? compareWith : undefined}
              compact
            />
          ) : (
            <Link
              href={`/candidates?highlight=${c.candidate_id}`}
              className="dash-top-table__arrow text-ink-faint"
              aria-label={`Open ${c.name}`}
            >
              →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}