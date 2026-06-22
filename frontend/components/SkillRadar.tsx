"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { RankedCandidate } from "@/lib/types";

export function SkillRadar({
  rc,
  size = 320,
}: {
  rc: RankedCandidate;
  size?: number;
}) {
  const data = [
    { axis: "Skills", value: rc.sub_scores.skill_match * 100 },
    { axis: "Projects", value: rc.sub_scores.project_relevance * 100 },
    { axis: "Career", value: rc.sub_scores.career_growth * 100 },
    { axis: "Behavioral", value: rc.sub_scores.behavioral * 100 },
    { axis: "Learning", value: rc.sub_scores.learning * 100 },
    { axis: "Communication", value: rc.sub_scores.communication * 100 },
    { axis: "Semantic", value: rc.sub_scores.semantic * 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "#9ca0b3", fontSize: 10 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#6b6f86", fontSize: 9 }}
          stroke="rgba(255,255,255,0.05)"
        />
        <Radar
          name={rc.candidate_name}
          dataKey="value"
          stroke="#4a55f5"
          fill="#4a55f5"
          fillOpacity={0.4}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
