"use client";

import * as React from "react";
import Link from "next/link";

import { PipelineFunnelVertical } from "@/components/app/PipelineFunnelVertical";
import { RiskBadgeList } from "@/components/app/RiskBadge";
import { CandidateActionButtons } from "@/components/app/CandidateActionButtons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from "recharts";
import type { WorkspaceAnalyticsPayload } from "@/lib/analyticsTypes";
import { FUNNEL_STAGE_COLORS } from "@/lib/funnelColors";

const INK = "#17191c";
const COOL = "#5b8def";
const POSITIVE = "#2d7a4f";
const AMBER = "#c2780c";
const MUTED = "#a3a6af";

const REC_COLORS: Record<string, string> = {
  "Strong Hire": POSITIVE,
  Hire: COOL,
  "Lean Hire": AMBER,
  Hold: MUTED,
};

const axis = { fontSize: 11, fill: "#777b86", fontWeight: 500 };
const grid = "rgba(163, 166, 175, 0.2)";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(163, 166, 175, 0.28)",
  boxShadow: "0 8px 24px -8px rgba(23, 25, 28, 0.18)",
  fontSize: 12,
  padding: "8px 11px",
  background: "#ffffff",
};

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: TooltipProps<number, string> & { suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      {label ? (
        <p className="text-[10.5px] font-medium text-ink-muted mb-1">{label}</p>
      ) : null}
      {payload.map((p) => (
        <p
          key={String(p.dataKey)}
          className="text-[12.5px] font-semibold text-ink flex items-center justify-between gap-5"
        >
          <span style={{ color: p.color }}>{p.name ?? p.dataKey}</span>
          <span className="tnum">
            {p.value}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  metric,
  metricHint,
  badge,
  children,
  footer,
  tall,
  compact,
  className = "",
}: {
  title: string;
  subtitle?: string;
  metric?: string;
  metricHint?: string;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tall?: boolean;
  /** Shorter chart area for simple bar charts */
  compact?: boolean;
  className?: string;
}) {
  const chartHeight = tall ? "h-[228px]" : compact ? "h-[172px]" : "h-[208px]";
  return (
    <div className={`chart-card ${className}`}>
      <div className="chart-card__head">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="panel__title">{title}</h3>
            {badge ? (
              <span className="badge badge--neutral text-[10px]">{badge}</span>
            ) : null}
          </div>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {metric ? (
          <div className="text-right shrink-0">
            <div className="chart-card__metric">{metric}</div>
            {metricHint ? (
              <p className="text-[10.5px] text-ink-faint mt-0.5">{metricHint}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`${chartHeight} mt-3 shrink-0`}>{children}</div>
      {footer}
    </div>
  );
}

function scoreBinRange(bin: string): [number, number] {
  const map: Record<string, [number, number]> = {
    "0–60": [0, 60],
    "60–70": [60, 70],
    "70–80": [70, 80],
    "80–90": [80, 90],
    "90–100": [90, 101],
  };
  return map[bin] ?? [0, 100];
}

export function AnalyticsCharts({ data }: { data: WorkspaceAnalyticsPayload }) {
  const stats = data.score_stats ?? {};
  const interviews = data.interviews_summary;
  const [selectedBin, setSelectedBin] = React.useState<string | null>(null);

  const applied = data.conversion_funnel.find((s) => s.stage === "Applied")?.count ?? 0;
  const hired = data.conversion_funnel.find((s) => s.stage === "Hired")?.count ?? 0;
  const hireRate =
    applied > 0 ? `${((hired / applied) * 100).toFixed(1)}%` : "0%";

  const binCandidates = React.useMemo(() => {
    if (!selectedBin) return [];
    const [lo, hi] = scoreBinRange(selectedBin);
    return data.rank_scatter
      .filter((p) => p.score >= lo && p.score < hi)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 8);
  }, [data.rank_scatter, selectedBin]);

  const compareWith = data.top_candidates[0]?.candidate_id;

  return (
    <div className="analytics-bento space-y-3.5">
      <div className="analytics-bento__row analytics-bento__row--2">
        <ChartCard
          title="Pipeline funnel"
          subtitle="Bottleneck view — volume and step conversion"
          metric={String(applied)}
          metricHint="applied"
          className="chart-card--funnel"
        >
          <PipelineFunnelVertical
            funnel={data.conversion_funnel}
            stageConversion={data.stage_conversion}
            hireRate={hireRate}
          />
        </ChartCard>

        <ChartCard
          title="Score distribution"
          subtitle="Click a bucket to see who’s in it"
          metric={stats.median != null ? `${stats.median}` : "—"}
          metricHint={`median · P90 ${stats.p90 ?? "—"}`}
          compact
          footer={
            selectedBin ? (
              <div className="histogram-drilldown">
                <div className="histogram-drilldown__head">
                  <span className="text-[12px] font-semibold text-ink">
                    {selectedBin} bucket
                  </span>
                  <button
                    type="button"
                    className="text-action text-[11.5px]"
                    onClick={() => setSelectedBin(null)}
                  >
                    Clear
                  </button>
                </div>
                {binCandidates.length ? (
                  <ul className="histogram-drilldown__list">
                    {binCandidates.map((c) => (
                      <li key={c.candidate_id}>
                        <Link
                          href={`/candidates?highlight=${c.candidate_id}`}
                          className="histogram-drilldown__row"
                        >
                          <span className="font-medium text-ink truncate">{c.name}</span>
                          <span className="text-[11px] text-ink-muted tnum">
                            #{c.rank} · {c.score}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-ink-muted">
                    No candidates in this score range.
                  </p>
                )}
              </div>
            ) : null
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.score_histogram}
              margin={{ left: -8, right: 8, top: 4, bottom: 4 }}
              onClick={(state) => {
                const bin = state?.activeLabel;
                if (typeof bin === "string") {
                  setSelectedBin((prev) => (prev === bin ? null : bin));
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="bin" tick={axis} axisLine={false} tickLine={false} dy={4} />
              <YAxis
                tick={axis}
                axisLine={false}
                tickLine={false}
                width={32}
                domain={[0, "dataMax + 2"]}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {data.score_histogram.map((row) => (
                  <Cell
                    key={row.bin}
                    fill={selectedBin === row.bin ? COOL : INK}
                    opacity={selectedBin && selectedBin !== row.bin ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 — Recommendation · Velocity · Rank buckets */}
      <div className="analytics-bento__row analytics-bento__row--3">
        <ChartCard
          title="Recommendation mix"
          subtitle="Ranker tier breakdown — not ATS acceptance"
          metric={`${data.recommendation_mix[0]?.count ?? 0}`}
          metricHint="strong hires"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.recommendation_mix}
              layout="vertical"
              margin={{ left: 4, right: 12, top: 2, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, "dataMax + 2"]}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tier"
                tick={{ ...axis, fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                width={88}
              />
              <Tooltip content={<ChartTooltip suffix=" candidates" />} />
              <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} barSize={14}>
                {data.recommendation_mix.map((row) => (
                  <Cell key={row.tier} fill={REC_COLORS[row.tier] ?? MUTED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Stage velocity"
          subtitle="Modeled median days in stage"
          badge="Modeled"
          metric={`${data.stage_velocity.find((s) => s.stage === "Interview")?.median_days ?? "—"}d`}
          metricHint="interview stage"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.stage_velocity}
              layout="vertical"
              margin={{ left: 4, right: 12, top: 2, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, "dataMax + 2"]}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ ...axis, fontSize: 10.5 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<ChartTooltip suffix=" days" />} />
              <Bar dataKey="median_days" name="Median days" fill={COOL} radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Score by rank bucket"
          subtitle="Tier separation from offline ranker"
          metric={
            data.rank_buckets[0]
              ? `${data.rank_buckets[0].avg_score}%`
              : "—"
          }
          metricHint={data.rank_buckets[0]?.bucket}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.rank_buckets}
              layout="vertical"
              margin={{ left: 4, right: 12, top: 2, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ ...axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload as (typeof data.rank_buckets)[0];
                  return (
                    <div style={tooltipStyle}>
                      <p className="text-[12px] font-semibold text-ink">{p.bucket}</p>
                      <p className="text-[11px] text-ink-muted mt-1">
                        Avg {p.avg_score}% · {p.count} candidates
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Strong hire {p.strong_hire_pct}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avg_score" name="Avg score" fill={COOL} radius={[0, 6, 6, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4 — Signal coverage */}
      {data.signal_coverage.length > 0 && (
        <ChartCard
          title="Skills coverage analysis"
          subtitle="Keyword signals parsed from ranker reasoning"
          metric={`${data.signal_coverage[0]?.top10_pct ?? 0}%`}
          metricHint="top signal in top-10"
          className="analytics-bento__full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.signal_coverage}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 2, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="signal"
                tick={{ ...axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={160}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload as (typeof data.signal_coverage)[0];
                  return (
                    <div style={tooltipStyle}>
                      <p className="text-[11.5px] font-semibold text-ink">{p.signal}</p>
                      <p className="text-[11px] text-ink-muted mt-1">
                        Top-10: {p.top10_pct}% · Pool: {p.pool_pct}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="top10_pct" name="Top-10 %" fill={POSITIVE} radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="pool_pct" name="Pool %" fill={MUTED} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Jobs pipeline */}
      {data.jobs_pipeline.length > 0 && (
        <div className="panel analytics-bento__full">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Pipeline by job</h2>
              <p className="panel__subtitle">
                Stage mix per open requisition
              </p>
            </div>
          </div>
          <div className="panel__body panel__body--list">
            <div className="analytics-jobs-table">
              {data.jobs_pipeline.map((job) => {
                const total =
                  job.applied + job.screened + job.interview + job.offer;
                const segs = [
                  { v: job.applied, c: FUNNEL_STAGE_COLORS.Applied, label: "Applied" },
                  { v: job.screened, c: FUNNEL_STAGE_COLORS.Screened, label: "Screened" },
                  { v: job.interview, c: FUNNEL_STAGE_COLORS.Interview, label: "Interview" },
                  { v: job.offer, c: FUNNEL_STAGE_COLORS.Offer, label: "Offer" },
                ];
                return (
                  <div key={job.job_id} className="analytics-jobs-row">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-ink truncate">
                        {job.title}
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-subtle mt-2 max-w-xs">
                        {segs.map((s) => (
                          <div
                            key={s.label}
                            style={{
                              width: total > 0 ? `${(s.v / total) * 100}%` : "0%",
                              background: s.c,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="badge badge--neutral tnum shrink-0">
                      {job.strong_hires} strong
                    </span>
                    <span className="text-[12px] text-ink-muted tnum shrink-0 w-14 text-right">
                      {job.days_open}d open
                    </span>
                    <Link
                      href={`/jobs/${job.job_id}`}
                      className="text-action text-[12px] font-medium shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top 10 table */}
      {data.top_candidates.length > 0 && (
        <div className="panel analytics-bento__full">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Top finalists</h2>
              <p className="panel__subtitle">Action rows — open, schedule, or compare</p>
            </div>
            <Link href="/candidates" className="text-action text-[12px]">
              All candidates →
            </Link>
          </div>
          <div className="analytics-top-table analytics-top-table--actions">
            <div className="analytics-top-table__head">
              <span>Candidate</span>
              <span>Rank</span>
              <span>Score</span>
              <span>Stage</span>
              <span>Risk / signal</span>
              <span>Actions</span>
            </div>
            {data.top_candidates.map((c) => (
              <div key={c.candidate_id} className="analytics-top-table__row">
                <Link
                  href={`/candidates?highlight=${c.candidate_id}`}
                  className="analytics-top-table__main"
                >
                  <span className="font-medium text-ink truncate">{c.name}</span>
                  <span className="tnum text-ink-muted">#{c.rank}</span>
                  <span className="tnum font-semibold">{c.score}</span>
                  <span className="text-[11px] text-ink-muted uppercase tracking-wide">
                    {c.stage}
                  </span>
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
                <CandidateActionButtons
                  candidateId={c.candidate_id}
                  compareWith={
                    compareWith !== c.candidate_id ? compareWith : undefined
                  }
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational row */}
      <div className="analytics-bento__row analytics-bento__row--3">
        <div className="chart-card">
          <h3 className="panel__title">Interview pipeline</h3>
          <p className="panel__subtitle">Operational load this cycle</p>
          <div className="analytics-ops-grid mt-4">
            <div>
              <div className="analytics-ops__value">{interviews?.scheduled ?? 0}</div>
              <div className="analytics-ops__label">Scheduled</div>
            </div>
            <div>
              <div className="analytics-ops__value">{interviews?.awaiting_feedback ?? 0}</div>
              <div className="analytics-ops__label">Awaiting feedback</div>
            </div>
            <div>
              <div className="analytics-ops__value">{interviews?.completed ?? 0}</div>
              <div className="analytics-ops__label">Completed</div>
            </div>
            <div>
              <div className="analytics-ops__value">{interviews?.pass_rate ?? 0}%</div>
              <div className="analytics-ops__label">Pass rate</div>
            </div>
          </div>
          <Link href="/interviews" className="text-action text-[12px] mt-4 inline-block">
            Open interviews →
          </Link>
        </div>

        <div className="chart-card">
          <h3 className="panel__title">Data sync</h3>
          <p className="panel__subtitle">DB ↔ submission.csv health</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-muted">Status</span>
              <span
                className={`badge ${data.sync?.ok ? "badge--positive" : "badge--warning"}`}
              >
                {data.sync?.ok ? "Synced" : "Gap"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-muted">Matched</span>
              <span className="font-semibold text-ink tnum">
                {data.sync?.matched_rankings ?? 0}/{data.sync?.db_candidates ?? 0}
              </span>
            </div>
            <p className="text-[11.5px] text-ink-faint leading-snug pt-1">
              {data.sync?.message ?? "—"}
            </p>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="panel__title">AI ranking health</h3>
          <p className="panel__subtitle">Offline challenge ranker sync</p>
          <div className="mt-4 space-y-2 text-[12.5px] text-ink-secondary">
            <p>
              <span className="text-ink-faint">Pool:</span> {data.pool_label}
            </p>
            <p>
              <span className="text-ink-faint">Candidates:</span>{" "}
              {data.candidate_count.toLocaleString()}
            </p>
            <p>
              <span className="text-ink-faint">Score spread σ:</span>{" "}
              {stats.std_dev ?? "—"}
            </p>
            <p className="text-[11px] text-ink-faint pt-1">
              Modeled velocity & proxy rates are labeled — not ATS events.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}