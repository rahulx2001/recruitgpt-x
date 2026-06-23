"use client";

import * as React from "react";
import { Briefcase, Users, Loader2, type LucideIcon } from "lucide-react";

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={`grid gap-4 ${count === 6 ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-6" : "grid-cols-2 lg:grid-cols-4"}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi kpi--tall">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-9 w-16 mt-3" />
          <div className="skeleton h-3 w-20 mt-3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex gap-4">
        {[120, 80, 60, 70, 50].map((w, i) => (
          <div key={i} className="skeleton h-3" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-line/40 last:border-0"
        >
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-40" />
            <div className="skeleton h-3 w-56" />
          </div>
          <div className="skeleton h-8 w-8 rounded-full shrink-0" />
          <div className="skeleton h-6 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function JobCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-3.5 w-56" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="skeleton h-2 w-full rounded-full mt-5" />
          <div className="flex gap-3 mt-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TabPanelSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton h-5 w-40" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="skeleton h-4 w-4/6" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    </div>
  );
}

export function RankingLoader() {
  return (
    <div className="card p-10 text-center">
      <Loader2 size={28} className="mx-auto text-accent animate-spin mb-4" />
      <p className="text-[14px] font-semibold text-ink">
        Running 7-agent ranking pipeline…
      </p>
      <p className="text-[13px] text-ink-muted mt-1.5 max-w-sm mx-auto">
        Parsing JD, scoring candidates, and generating explanations
      </p>
      <div className="flex justify-center gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton h-2 w-16 rounded-full"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Briefcase,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card empty-state">
      <div className="empty-state__icon">
        <Icon size={22} />
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="text-[13px] text-ink-muted max-w-sm">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function CandidatesLoadingShell() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="seg">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-16 rounded-md mx-0.5" />
          ))}
        </div>
        <div className="skeleton h-9 flex-1 max-w-sm rounded-lg" />
      </div>
      <TableSkeleton rows={10} />
    </>
  );
}

export function DashboardLoadingShell() {
  return (
    <div className="bento bento--dash gap-4">
      <div className="bento__span-12">
        <div className="skeleton h-[72px] w-full rounded-xl" />
      </div>
      <div className="bento__span-12">
        <KpiGridSkeleton count={6} />
      </div>
      <div className="bento__span-8">
        <div className="panel p-5 space-y-3 min-h-[280px]">
          <div className="skeleton h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bento__span-4">
        <div className="panel p-5 space-y-3 min-h-[280px]">
          <div className="skeleton h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-2.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bento__span-7">
        <TableSkeleton rows={6} />
      </div>
      <div className="bento__span-5">
        <div className="panel p-5 space-y-2 min-h-[240px]">
          <div className="skeleton h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="bento__span-12">
        <JobCardsSkeleton count={3} />
      </div>
    </div>
  );
}

export { Users };