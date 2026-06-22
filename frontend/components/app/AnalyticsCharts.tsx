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
} from "recharts";
import { FUNNEL_COLOR_SEQUENCE, funnelColor } from "@/lib/funnelColors";

const axis = { fontSize: 11, fill: "#9AA0A6" };
const grid = "#ECEDEF";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #ECEDEF",
  boxShadow: "0 12px 40px -12px rgba(12,13,15,0.18)",
  fontSize: 12,
};

const FUNNEL_COLORS = [...FUNNEL_COLOR_SEQUENCE];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="mb-1">
        <h3 className="text-[14px] font-semibold text-ink tracking-tight">
          {title}
        </h3>
        {subtitle && <p className="text-[12.5px] text-ink-muted">{subtitle}</p>}
      </div>
      <div className="h-[200px] mt-4">{children}</div>
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ChartCard
        title="Time to hire"
        subtitle="Estimated days from ranker score progression"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.time_to_hire}
            margin={{ left: -20, right: 8, top: 4 }}
          >
            <defs>
              <linearGradient id="tth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="days"
              stroke="#4F46E5"
              strokeWidth={2.5}
              fill="url(#tth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Candidate conversion funnel"
        subtitle="Live pipeline from your top 100 candidates"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.conversion_funnel}
            margin={{ left: -20, right: 8, top: 4 }}
          >
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="stage"
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={axis} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F6F7F8" }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.conversion_funnel.map((row, i) => (
                <Cell
                  key={row.stage}
                  fill={funnelColor(row.stage, i)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Match score by rank tier"
        subtitle="Avg. ranker score across challenge buckets"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.source_quality}
            layout="vertical"
            margin={{ left: 40, right: 16, top: 4 }}
          >
            <CartesianGrid stroke={grid} horizontal={false} />
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
              tick={{ ...axis, fontSize: 11.5 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F6F7F8" }} />
            <Bar
              dataKey="quality"
              radius={[0, 6, 6, 0]}
              fill="#4F46E5"
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Offer acceptance & candidate quality"
        subtitle="Trend as higher-ranked candidates enter the pool"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.trends}
            margin={{ left: -20, right: 8, top: 4 }}
          >
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="month"
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={axis}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              dataKey="rate"
              name="Offer acceptance"
              stroke="#0E9F6E"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              dataKey="score"
              name="Candidate quality"
              stroke="#4F46E5"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}