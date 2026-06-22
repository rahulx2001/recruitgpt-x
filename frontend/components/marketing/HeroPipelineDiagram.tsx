"use client";

import {
  FileText,
  Code2,
  TrendingUp,
  Github,
  Heart,
  MessageSquare,
  Shield,
  Briefcase,
} from "lucide-react";

const AGENTS = [
  { name: "Resume", icon: FileText },
  { name: "Skills", icon: Code2 },
  { name: "Trajectory", icon: TrendingUp },
  { name: "GitHub", icon: Github },
  { name: "Bias", icon: Shield, active: true },
  { name: "Culture", icon: Heart },
  { name: "Interview", icon: MessageSquare },
];

const RANKINGS = [
  { name: "Ananya Iyer", score: 96, width: "96%" },
  { name: "Priya Sharma", score: 92, width: "92%" },
  { name: "Rahul Kumar", score: 88, width: "88%" },
];

export function HeroPipelineDiagram() {
  return (
    <div className="pipeline-frame lp-hero-animate lp-hero-animate--3" aria-hidden>
      <div className="pipeline-frame__chrome">
        <span className="pipeline-frame__status">
          <span className="pipeline-frame__status-dot" />
          Pipeline live
        </span>
        <span className="pipeline-frame__meta">LangGraph · 7 agents</span>
      </div>

      <div className="pipeline-diagram">
        <div className="pipeline-diagram__card pipeline-diagram__card--input">
          <div className="pipeline-diagram__label">Input</div>
          <div className="pipeline-diagram__jd-header">
            <span className="pipeline-diagram__jd-icon">
              <Briefcase className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <div>
              <div className="pipeline-diagram__jd-title">Senior ML Engineer</div>
              <div className="pipeline-diagram__jd-sub">Full-time · Remote OK</div>
            </div>
          </div>
          <div className="pipeline-diagram__jd-lines">
            <div className="pipeline-diagram__jd-line" />
            <div className="pipeline-diagram__jd-line pipeline-diagram__jd-line--med" />
            <div className="pipeline-diagram__jd-line pipeline-diagram__jd-line--short" />
          </div>
          <div className="pipeline-diagram__tags">
            <span>PyTorch</span>
            <span>MLOps</span>
            <span>5+ yrs</span>
          </div>
        </div>

        <div className="pipeline-flow" aria-hidden>
          <div className="pipeline-flow__line" />
          <div className="pipeline-flow__dot" />
        </div>

        <div className="pipeline-diagram__agents-block">
          <div className="pipeline-diagram__label pipeline-diagram__label--center">
            7 Specialized Agents
          </div>
          <div className="pipeline-diagram__agents">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className={`pipeline-diagram__agent ${agent.active ? "pipeline-diagram__agent--active" : ""}`}
                >
                  <div className="pipeline-diagram__agent-icon">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </div>
                  <span>{agent.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pipeline-flow" aria-hidden>
          <div className="pipeline-flow__line" />
          <div className="pipeline-flow__dot pipeline-flow__dot--delay" />
        </div>

        <div className="pipeline-diagram__card pipeline-diagram__card--output">
          <div className="pipeline-diagram__output-head">
            <div className="pipeline-diagram__label">Candidate Ranking</div>
            <span className="pipeline-diagram__output-meta">Explainable</span>
          </div>
          {RANKINGS.map((r, i) => (
            <div key={r.name} className="pipeline-diagram__rank-row">
              <span className="pipeline-diagram__rank-idx">{i + 1}</span>
              <span className="pipeline-diagram__rank-name">{r.name}</span>
              <div className="pipeline-diagram__rank-bar-wrap">
                <div
                  className={`pipeline-diagram__rank-bar pipeline-diagram__rank-bar--animate ${i === 0 ? "pipeline-diagram__rank-bar--lead" : ""}`}
                  style={{ "--bar-width": r.width } as React.CSSProperties}
                />
              </div>
              <span className="pipeline-diagram__rank-pct">{r.score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}