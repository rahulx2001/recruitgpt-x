"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

const CANDIDATES = [
  { rank: 1, name: "Ananya Iyer", score: "74%", semantic: "88%", github: "92%" },
  { rank: 2, name: "Meera Joshi", score: "73%", semantic: "85%", github: "88%" },
  { rank: 3, name: "Priya Sharma", score: "72%", semantic: "84%", github: "86%" },
  { rank: 4, name: "Rahul Kumar", score: "71%", semantic: "82%", github: "90%" },
];

const AGENTS = [
  "Resume Agent",
  "Skills Agent",
  "Trajectory Agent",
  "GitHub Agent",
  "Bias Audit Agent",
];

const TABS = ["Rankings", "Explain", "Audit"] as const;

export function DemoPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Rankings");
  const [activeAgent, setActiveAgent] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setActiveAgent((i) => (i + 1) % AGENTS.length);
    }, 2200);
    return () => clearInterval(id);
  }, [reduceMotion]);

  return (
    <section className="lp-section lp-section--demo" id="demo">
      <div className="lp-section__inner">
        <Reveal>
          <div className="lp-section__intro lp-section__intro--center">
            <span className="lp-section__badge">Live Product</span>
            <h2 className="lp-section__title">Interactive Demo Preview</h2>
            <p className="lp-section__desc lp-section__desc--tight lp-section__desc--center">
              Real candidate rankings, agent decisions, and explainable scores —
              the same interface you&apos;ll use in the dashboard.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="lp-demo">
            <div className="lp-demo-window">
              <div className="lp-demo-chrome">
                <span className="lp-demo-dot lp-demo-dot--red" />
                <span className="lp-demo-dot lp-demo-dot--yellow" />
                <span className="lp-demo-dot lp-demo-dot--green" />
                <span className="lp-demo-url">recruitgpt-x.app/dashboard</span>
                <div className="lp-demo-tabs">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`lp-demo-tab ${tab === t ? "lp-demo-tab--active" : ""}`}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lp-demo-body">
                <div className="lp-demo-main">
                  <div className="lp-demo-kpis">
                    {[
                      { label: "Candidates", value: "12" },
                      { label: "Top Score", value: "74%" },
                      { label: "Semantic Fit", value: "88%" },
                      { label: "Agents Active", value: "7" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="lp-demo-kpi">
                        <div className="lp-demo-kpi__label">{kpi.label}</div>
                        <div className="lp-demo-kpi__value">{kpi.value}</div>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "Rankings" && (
                      <motion.div
                        key="rankings"
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="lp-demo-table-title">
                          Senior ML Engineer — Ranked Shortlist
                        </div>
                        <div className="lp-demo-table">
                          <div className="lp-demo-table__head">
                            <span>Candidate</span>
                            <span>Hireability</span>
                            <span>Semantic</span>
                            <span>GitHub</span>
                          </div>
                          {CANDIDATES.map((c, i) => (
                            <div
                              key={c.name}
                              className={`lp-demo-table__row ${i === 0 ? "lp-demo-table__row--highlight" : ""}`}
                            >
                              <span className="flex items-center">
                                <span className="lp-demo-rank">{c.rank}</span>
                                {c.name}
                              </span>
                              <span className="lp-demo-score">{c.score}</span>
                              <span className="text-ink-muted">{c.semantic}</span>
                              <span className="text-ink-muted">{c.github}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {tab === "Explain" && (
                      <motion.div
                        key="explain"
                        className="lp-demo-explain-panel"
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="lp-demo-explain-query">
                          Why is Ananya ranked above Rahul?
                        </p>
                        <div className="lp-demo-explain lp-demo-explain--code">
                          <span className="text-ink font-medium">Semantic fit:</span> Ananya 88% vs Rahul 82%
                          <br />
                          <span className="text-ink font-medium">Trajectory:</span> +22% skill velocity (18 mo)
                          <br />
                          <span className="text-ink font-medium">Gap:</span> Rahul weaker on MLOps deployment signals
                        </div>
                      </motion.div>
                    )}

                    {tab === "Audit" && (
                      <motion.div
                        key="audit"
                        className="lp-demo-explain-panel"
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="lp-demo-audit-grid">
                          {[
                            { label: "Gender", status: "Balanced", ok: true },
                            { label: "Ethnicity", status: "No skew", ok: true },
                            { label: "School tier", status: "Monitored", ok: true },
                            { label: "Location", status: "Neutral", ok: true },
                          ].map((item) => (
                            <div key={item.label} className="lp-demo-audit-item">
                              <span>{item.label}</span>
                              <span className={item.ok ? "lp-demo-audit-ok" : ""}>{item.status}</span>
                            </div>
                          ))}
                        </div>
                        <p className="lp-demo-explain mt-3">
                          Audit trail <span className="font-mono text-xs">#RCA-7A3F</span> — all scores traceable.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="lp-demo-sidebar">
                  <div className="lp-demo-panel__title">Agent Pipeline</div>
                  {AGENTS.map((name, i) => (
                    <div
                      key={name}
                      className={`lp-demo-agent ${i === activeAgent ? "lp-demo-agent--active" : ""}`}
                    >
                      {i === activeAgent && <span className="lp-demo-agent__dot" />}
                      {name}
                      {i === activeAgent && (
                        <span className="lp-demo-agent__status">running</span>
                      )}
                    </div>
                  ))}

                  <div className="lp-demo-panel__title lp-demo-panel__title--spaced">
                    Top Recommendation
                  </div>
                  <div className="lp-demo-explain">
                    <strong>Ananya Iyer</strong> — strongest production ML alignment.
                    Interview focus: system design, model monitoring.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}