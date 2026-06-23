"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Rocket, Blocks, Hand } from "lucide-react";

const cards = [
  {
    title: "Built on real data",
    body: "No more mock dashboards. RecruitGPT ranks your actual challenge candidates with governed scoring that powers every hiring decision.",
    warm: true,
    Icon: Blocks,
    iconAnim: { y: [0, -6, 0], rotate: [0, 2, 0] },
  },
  {
    title: "Powered by AI",
    body: "Semantic search, transparent reasoning, and an AI recruiter that answers pipeline questions with citations — not guesses.",
    warm: false,
    Icon: Hand,
    iconAnim: { y: [0, -4, 2, 0], x: [0, 3, -2, 0] },
  },
  {
    title: "Designed for teams",
    body: "Recruiters move faster. Hiring managers trust the rankings. Your whole team builds a stronger, fairer hiring culture.",
    warm: false,
    Icon: Rocket,
    iconAnim: { y: [0, -14, -4, 0], rotate: [0, -4, 2, 0] },
  },
];

export function PlatformCards() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="section section--alt" id="platform">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="h-eyebrow">Platform</span>
          <h2 className="h-display text-[clamp(40px,4.5vw,64px)] text-ink mt-3">
            A new kind of recruiting platform
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => {
            const Icon = c.Icon;
            return (
              <motion.article
                key={c.title}
                className={`platform-card ${c.warm ? "platform-card--warm" : ""}`}
                initial={false}
                whileInView={reduceMotion ? undefined : { y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.75,
                  delay: i * 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
              >
                <motion.div
                  className="platform-card__art"
                  animate={reduceMotion ? undefined : c.iconAnim}
                  transition={{
                    duration: 5 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Icon
                    size={c.warm ? 72 : 56}
                    strokeWidth={1.25}
                    className="text-ink"
                  />
                </motion.div>
                <p className="text-[15px] text-ash leading-[1.5] mt-6">{c.body}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}