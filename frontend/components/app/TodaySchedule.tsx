"use client";

import Link from "next/link";
import { Avatar, SectionHeader } from "@/components/app/Atoms";

type Interview = {
  id: string;
  candidate: string;
  candidate_color: string;
  round: string;
  interviewer: string;
  when: string;
  status: string;
};

export function TodaySchedule({
  todayInterviews,
  awaitingFeedback,
  scorecardsPending,
}: {
  todayInterviews: Interview[];
  awaitingFeedback: Interview[];
  scorecardsPending: number;
}) {
  const badgeCount = todayInterviews.length + Math.min(awaitingFeedback.length, 3);

  return (
    <div className="panel h-full">
      <div className="panel__head">
        <SectionHeader
          title="Today's schedule"
          subtitle={
            badgeCount > 0
              ? `${todayInterviews.length} interview${todayInterviews.length === 1 ? "" : "s"} · ${scorecardsPending} scorecard${scorecardsPending === 1 ? "" : "s"} pending`
              : "Nothing scheduled today"
          }
          action={
            <Link href="/interviews?filter=calendar" className="text-action">
              Open calendar →
            </Link>
          }
        />
      </div>
      <div className="panel__body panel__body--list space-y-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint px-2 mb-2">
            Interviews today
          </p>
          {todayInterviews.length > 0 ? (
            <div className="panel__list">
              {todayInterviews.slice(0, 3).map((i) => (
                <Link key={i.id} href="/interviews?filter=today" className="feed-item">
                  <Avatar name={i.candidate} color={i.candidate_color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink truncate">
                      {i.candidate}
                    </div>
                    <div className="text-[11.5px] text-ink-muted truncate">
                      {i.round} · {i.interviewer}
                    </div>
                  </div>
                  <time className="text-[11.5px] font-medium text-ink-secondary whitespace-nowrap">
                    {i.when.replace("Today · ", "")}
                  </time>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-muted px-2 py-1">
              No interviews today —{" "}
              <Link href="/interviews?filter=calendar" className="text-action">
                view calendar
              </Link>
            </p>
          )}
        </div>

        {(awaitingFeedback.length > 0 || scorecardsPending > 0) && (
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint px-2 mb-2">
              Scorecards pending
            </p>
            <div className="panel__list">
              {awaitingFeedback.slice(0, 3).map((i) => (
                <Link key={i.id} href="/interviews?filter=today" className="feed-item">
                  <Avatar name={i.candidate} color={i.candidate_color} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink truncate">
                      {i.candidate}
                    </div>
                    <div className="text-[11.5px] text-ink-muted truncate">
                      {i.round} · Awaiting feedback
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              href="/interviews?filter=feedback"
              className="text-action text-[12px] px-2 mt-2 inline-block"
            >
              Complete feedback →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}