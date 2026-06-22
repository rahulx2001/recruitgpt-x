import { Check, Sparkles } from "lucide-react";
import { Avatar, MatchScore } from "@/components/app/Atoms";

const ranked = [
  {
    rank: 1,
    name: "Sarah Chen",
    title: "Senior ML Engineer · Stripe",
    color: "#5e6ad2",
    score: 96,
    skills: 98,
    exp: 95,
    github: 93,
    rec: "Strong Hire",
    reasons: [
      "Built production ML ranking systems",
      "AWS certified · MLOps depth",
      "Led a team of 6 engineers",
    ],
  },
  {
    rank: 2,
    name: "Rahul Singh",
    title: "ML Engineer · Razorpay",
    color: "#27a644",
    score: 91,
  },
  {
    rank: 3,
    name: "Alex Kim",
    title: "Applied Scientist · Netflix",
    color: "#5e6ad2",
    score: 88,
  },
];

export function HeroDashboard() {
  return (
    <div className="window">
      <div className="window__bar">
        <span className="window__dot" />
        <span className="window__dot" />
        <span className="window__dot" />
        <span className="ml-3 text-[12px] text-ink-muted font-510 font-mono tracking-tight">
          SR-ML-ENG · 100 candidates ranked
        </span>
        <span className="ml-auto badge badge--accent">
          <Sparkles size={11} /> Live ranking
        </span>
      </div>

      <div className="p-4 bg-canvas">
        <div className="card p-4 bg-subtle">
          <div className="flex items-start gap-3.5">
            <MatchScore value={ranked[0].score} size={52} />
            <Avatar name={ranked[0].name} color={ranked[0].color} size={46} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-510 text-ink">
                  {ranked[0].name}
                </span>
                <span className="badge badge--positive badge--dot">
                  {ranked[0].rec}
                </span>
              </div>
              <p className="text-[12.5px] text-ink-muted">{ranked[0].title}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { l: "Skills", v: ranked[0].skills },
              { l: "Experience", v: ranked[0].exp },
              { l: "GitHub", v: ranked[0].github },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11.5px] text-ink-muted">{m.l}</span>
                  <span className="text-[11.5px] font-510 text-ink tnum">
                    {m.v}%
                  </span>
                </div>
                <div className="meter">
                  <div
                    className="meter__fill"
                    style={{ width: `${m.v}%`, background: "#5e6ad2" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-line space-y-1.5">
            {ranked[0].reasons!.map((r) => (
              <div
                key={r}
                className="flex items-center gap-2 text-[12.5px] text-ink-secondary"
              >
                <Check size={14} className="text-positive flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2.5 space-y-2">
          {ranked.slice(1).map((c) => (
            <div
              key={c.rank}
              className="card p-3 flex items-center gap-3 bg-obsidian"
            >
              <span className="text-[13px] font-510 text-ink-muted w-4 tnum font-mono">
                {c.rank}
              </span>
              <Avatar name={c.name} color={c.color} size={34} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-510 text-ink">{c.name}</div>
                <div className="text-[12px] text-ink-muted truncate">
                  {c.title}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 meter hidden sm:block">
                  <div
                    className="meter__fill"
                    style={{ width: `${c.score}%`, background: c.color }}
                  />
                </div>
                <span className="text-[14px] font-510 text-ink tnum w-7 text-right">
                  {c.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}