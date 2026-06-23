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
import { funnelColor } from "@/lib/funnelColors";

const INK = "#17191c";
const COOL = "#5b8def";
const POSITIVE = "#2d7a4f";
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
      <p className="text-[10.5px] font-medium text-ink-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
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
          <h3 className="panel__title">{title}</h3>
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
      <div className={`${tall ? "h-[228px]" : "h-[208px]"} mt-3`}>{children}</div>
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
  kpis?: Array<{ label: string; value: string; delta: string }>;
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  const latestTth = data.time_to_hire[data.time_to_hire.length - 1]?.days;
  const topSource = [...data.source_quality].sort((a, b) => b.quality - a.quality)[0];
  const latestTrend = data.trends[data.trends.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
      <ChartCard
        title="Time to hire"
        subtitle="Days from application to offer"
        metric={latestTth != null ? `${latestTth}d` : "—"}
        metricHint="current"
        legend={[{ label: "Days", color: INK }]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.time_to_hire}
            margin={{ left: -14, right: 8, top: 6, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INK} stopOpacity={0.12} />
                <stop offset="100%" stopColor={INK} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={axis}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip suffix=" days" />} />
            <Area
              type="monotone"
              dataKey="days"
              name="Days"
              stroke={INK}
              strokeWidth={2}
              fill="url(#tth)"
              dot={false}
              activeDot={{ r: 4, fill: INK, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Pipeline conversion"
        subtitle="Stage volume across challenge pool"
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
            margin={{ left: -14, right: 8, top: 6, bottom: 0 }}
          >
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="stage"
              tick={axis}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(244, 244, 245, 0.9)" }} />
            <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.conversion_funnel.map((row, i) => (
                <Cell key={row.stage} fill={funnelColor(row.stage, i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Match score by tier"
        subtitle="Average ranker score per bucket"
        metric={topSource ? `${topSource.quality}%` : "—"}
        metricHint={topSource ? topSource.source : undefined}
        legend={[{ label: "Match score", color: COOL }]}
        tall
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.source_quality}
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
              dataKey="source"
              tick={{ ...axis, fontSize: 10.5 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: "rgba(244, 244, 245, 0.9)" }} />
            <Bar
              dataKey="quality"
              name="Score"
              radius={[0, 6, 6, 0]}
              fill={COOL}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Quality & acceptance"
        subtitle="Offer rate vs. candidate quality"
        metric={latestTrend ? `${latestTrend.rate}%` : "—"}
        metricHint="acceptance"
        legend={[
          { label: "Acceptance", color: POSITIVE },
          { label: "Quality", color: COOL },
        ]}
        tall
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.trends}
            margin={{ left: -14, right: 8, top: 6, bottom: 0 }}
          >
            <CartesianGrid stroke={grid} vertical={false} strokeDasharray="3 3" />
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
              width={32}
            />
            <Tooltip content={<ChartTooltip suffix="%" />} />
            <Line
              dataKey="rate"
              name="Acceptance"
              stroke={POSITIVE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3.5, fill: POSITIVE, stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              dataKey="score"
              name="Quality"
              stroke={COOL}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3.5, fill: COOL, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}