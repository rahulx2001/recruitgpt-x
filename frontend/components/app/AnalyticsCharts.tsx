"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from "recharts";
import { FUNNEL_COLOR_SEQUENCE, funnelColor } from "@/lib/funnelColors";

const ACCENT = "#5d2a1a";
const COOL = "#5b8def";
const POSITIVE = "#2d7a4f";
const axis = { fontSize: 11, fill: "#777b86", fontWeight: 500 };
const grid = "rgba(163, 166, 175, 0.28)";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(163, 166, 175, 0.35)",
  boxShadow: "0 16px 40px -12px rgba(23, 25, 28, 0.22)",
  fontSize: 12,
  padding: "10px 12px",
  background: "rgba(255, 255, 255, 0.96)",
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
      <p className="text-[11px] font-medium text-ink-muted mb-1.5">{label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className="text-[13px] font-semibold text-ink flex items-center justify-between gap-6"
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
  legend,
  children,
  tall,
}: {
  title: string;
  subtitle?: string;
  metric?: string;
  metricHint?: string;
  legend?: Array<{ label: string; color: string }>;
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[12.5px] text-ink-muted mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {metric ? (
          <div className="text-right shrink-0">
            <div className="chart-card__metric">{metric}</div>
            {metricHint ? (
              <p className="text-[11px] text-ink-muted mt-0.5">{metricHint}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`${tall ? "h-[240px]" : "h-[220px]"} mt-4`}>{children}</div>
      {legend && legend.length > 0 ? (
        <div className="chart-card__legend">
          {legend.map((item) => (
            <span key={item.label} className="legend-item">
              <span
                className="legend-item__dot"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type AnalyticsData = {
  time_to_hire: Array<{ month: string; days: number }>;
  conversion_funnel: Array<{ stage: string; count: number; color?: string }>;
  source_quality: Array<{ source: string; quality: number; hires: number }>;
  trends: Array<{ month: string; rate: number; score: number }>;
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  const latestTth = data.time_to_hire[data.time_to_hire.length - 1]?.days;
  const topSource = [...data.source_quality].sort((a, b) => b.quality - a.quality)[0];
  const latestTrend = data.trends[data.trends.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ChartCard
        title="Time to hire"
        subtitle="Days from application to offer — ranker-calibrated trend"
        metric={latestTth != null ? `${latestTth}d` : "—"}
        metricHint="current month"
        legend={[{ label: "Days to hire", color: ACCENT }]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.time_to_hire}
            margin={{ left: -16, right: 12, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="month"
              tick={axis}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip suffix=" days" />} />
            <Area
              type="monotone"
              dataKey="days"
              name="Days to hire"
              stroke={ACCENT}
              strokeWidth={2.5}
              fill="url(#tth)"
              dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ACCENT, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Pipeline conversion"
        subtitle="Stage volume across your top-100 challenge candidates"
        metric={
          data.conversion_funnel[0]?.count != null
            ? data.conversion_funnel[0].count.toLocaleString()
            : "—"
        }
        metricHint="applied"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.conversion_funnel}
            margin={{ left: -16, right: 12, top: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="stage"
              tick={axis}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(247, 247, 248, 0.8)" }} />
            <Bar dataKey="count" name="Candidates" radius={[8, 8, 2, 2]} maxBarSize={48}>
              {data.conversion_funnel.map((row, i) => (
                <Cell key={row.stage} fill={funnelColor(row.stage, i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Match score by tier"
        subtitle="Average ranker score across challenge rank buckets"
        metric={topSource ? `${topSource.quality}%` : "—"}
        metricHint={topSource ? `best: ${topSource.source}` : undefined}
        legend={[{ label: "Avg. match score", color: COOL }]}
        tall
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.source_quality}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 0 }}
          >
            <CartesianGrid stroke={grid} horizontal={false} strokeDasharray="4 4" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="source"
              tick={{ ...axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={108}
            />
            <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: "rgba(247, 247, 248, 0.8)" }} />
            <Bar
              dataKey="quality"
              name="Match score"
              radius={[0, 8, 8, 0]}
              fill={COOL}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Quality & acceptance"
        subtitle="Offer acceptance rate vs. candidate quality index"
        metric={latestTrend ? `${latestTrend.rate}%` : "—"}
        metricHint="offer acceptance"
        legend={[
          { label: "Offer acceptance", color: POSITIVE },
          { label: "Candidate quality", color: COOL },
        ]}
        tall
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.trends}
            margin={{ left: -16, right: 12, top: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="month"
              tick={axis}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              domain={[0, 100]}
              tick={axis}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<ChartTooltip suffix="%" />} />
            <Line
              dataKey="rate"
              name="Offer acceptance"
              stroke={POSITIVE}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: POSITIVE, stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              dataKey="score"
              name="Candidate quality"
              stroke={COOL}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: COOL, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}