import { Sparkles, TrendingUp } from "lucide-react";
import { Avatar, MatchScore } from "@/components/app/Atoms";

const top = {
  name: "Sarah Chen",
  title: "Senior ML Engineer",
  color: "#d3e3fc",
  score: 96,
};

export function HeroFloatingCards() {
  return (
    <div className="hero__floats">
      {/* Top-left: KPI stat */}
      <div className="hero-card hero-card--tl card p-5">
        <div className="text-[13px] text-graphite font-450">Candidates ranked</div>
        <div className="text-[32px] font-480 text-ink tnum mt-1 leading-none">100</div>
        <div className="flex items-center gap-1 mt-2 text-[12px] text-positive font-450">
          <TrendingUp size={12} />
          <span>+12% this week</span>
        </div>
      </div>

      {/* Top-right: warm chart card */}
      <div className="hero-card hero-card--tr card card--warm p-5">
        <div className="text-[13px] font-450 text-ink mb-3">Offer acceptance</div>
        <svg viewBox="0 0 80 40" className="w-full h-10">
          <polyline
            fill="none"
            stroke="#5d2a1a"
            strokeWidth="2.5"
            strokeLinecap="round"
            points="0,32 16,28 32,22 48,18 64,12 80,8"
          />
        </svg>
        <div className="text-[22px] font-480 text-ink tnum mt-1">73%</div>
      </div>

      {/* Bottom-left: cool search card */}
      <div className="hero-card hero-card--bl card card--cool p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-cool" />
          <span className="text-[13px] font-450 text-ink">Semantic search</span>
        </div>
        <div className="field text-[14px] text-graphite py-2.5">
          ML engineers with production experience…
        </div>
      </div>

      {/* Bottom-right: ranking card */}
      <div className="hero-card hero-card--br card p-5">
        <div className="flex items-start gap-3">
          <MatchScore value={top.score} size={48} />
          <Avatar name={top.name} color={top.color} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-480 text-ink">{top.name}</div>
            <div className="text-[12px] text-graphite">{top.title}</div>
            <span className="badge badge--positive badge--dot mt-2">
              Strong Hire
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-dove/40">
          {[
            ["Skills", 98],
            ["Exp", 95],
            ["GitHub", 93],
          ].map(([l, v]) => (
            <div key={l as string}>
              <div className="text-[11px] text-graphite">{l}</div>
              <div className="text-[14px] font-480 text-ink tnum">{v}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}