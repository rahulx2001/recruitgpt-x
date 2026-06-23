"use client";

import Link from "next/link";

export function CandidateActionButtons({
  candidateId,
  compareWith,
  compact,
}: {
  candidateId: string;
  compareWith?: string;
  compact?: boolean;
}) {
  const compareHref = compareWith
    ? `/candidates?highlight=${candidateId}&compare=${compareWith}`
    : `/candidates?highlight=${candidateId}`;

  return (
    <div
      className={`candidate-actions ${compact ? "candidate-actions--compact" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Link
        href={`/candidates?highlight=${candidateId}`}
        className="candidate-actions__btn"
      >
        Open
      </Link>
      <Link
        href="/interviews?filter=today"
        className="candidate-actions__btn"
      >
        Schedule
      </Link>
      <Link href={compareHref} className="candidate-actions__btn">
        Compare
      </Link>
    </div>
  );
}