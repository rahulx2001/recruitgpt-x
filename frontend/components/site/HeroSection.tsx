"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Avatar, MatchScore } from "@/components/app/Atoms";
import { useMounted } from "@/lib/useMounted";

const REGIONS = [
  ["Europe", "42"],
  ["North America", "28"],
  ["Asia", "18"],
  ["Other", "12"],
];

const BARS = [42, 68, 55, 82, 61, 74, 48];

const FLOAT = [
  { y: [0, -12, 0, 8, 0], x: [0, 5, 0, -4, 0], d: 7.2 },
  { y: [0, -9, 0, 10, 0], x: [0, -6, 0, 3, 0], d: 8.4 },
  { y: [0, -11, 0, 6, 0], x: [0, 4, 0, -5, 0], d: 6.8 },
  { y: [0, -8, 0, 9, 0], x: [0, -3, 0, 6, 0], d: 9.1 },
  { y: [0, -7, 0, 7, 0], x: [0, 2, 0, -2, 0], d: 7.8 },
];

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);
  return value;
}

function HeroCard({
  className,
  index,
  parallaxX,
  parallaxY,
  factor,
  children,
  reduceMotion,
}: {
  className: string;
  index: number;
  parallaxX: ReturnType<typeof useSpring>;
  parallaxY: ReturnType<typeof useSpring>;
  factor: number;
  children: React.ReactNode;
  reduceMotion: boolean | null;
}) {
  const f = FLOAT[index] ?? FLOAT[0];
  const x = useTransform(parallaxX, (v) => v * factor);
  const y = useTransform(parallaxY, (v) => v * factor);

  return (
    <motion.div
      className={`hero-card ${className}`}
      initial={false}
      style={{ x, y }}
    >
      <motion.div
        className="hero-card__inner"
        animate={
          reduceMotion
            ? undefined
            : { y: f.y, x: f.x }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: f.d, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  const mounted = useMounted();
  const sectionRef = React.useRef<HTMLElement>(null);
  const chartsRef = React.useRef<HTMLDivElement>(null);
  const chartsInView = useInView(chartsRef, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  const motionOn = mounted && !reduceMotion;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 55, damping: 22, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 55, damping: 22, mass: 0.6 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const ranked = useCountUp(100, chartsInView);
  const acceptance = useCountUp(73, chartsInView, 1600);

  const onMove = React.useCallback(
    (e: React.MouseEvent) => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mouseX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      mouseY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    },
    [mouseX, mouseY]
  );

  const onLeave = React.useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={sectionRef}
      className="hero section--flush"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        className="hero__glow"
        aria-hidden
        style={{ scale: reduceMotion ? 1 : glowScale }}
      />
      <motion.div
        className="hero__stage container"
        style={{ y: reduceMotion ? 0 : scrollY, opacity: scrollOpacity }}
        ref={chartsRef}
      >
        <div className="hero__center">
          <h1 className="h-display text-[clamp(44px,6.5vw,80px)] text-ink">
            Hire better candidates in minutes, not weeks
          </h1>
          <p className="text-[18px] text-ash leading-[1.35] mt-6 max-w-xl mx-auto">
            RecruitGPT analyzes resumes, projects, skills, experience and hiring
            signals to rank every candidate — with transparent reasoning your hiring
            managers actually trust.
          </p>
          <div className="hero__cta">
            <Link href="/dashboard" className="btn btn--primary btn--lg">
              Try live demo <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" className="btn btn--link btn--lg">
              Book a demo
            </Link>
          </div>
        </div>

        <HeroCard
          className="hero-card--tl"
          index={0}
          parallaxX={springX}
          parallaxY={springY}
          factor={16}
          reduceMotion={reduceMotion}
        >
          <div className="text-[13px] text-graphite font-450">Candidates ranked</div>
          <div className="text-[36px] font-480 text-ink tnum mt-1 leading-none">
            {ranked.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[12px] text-positive font-450">
            <TrendingUp size={12} />
            <span>+12% vs last week</span>
          </div>
          <div className="flex items-end gap-1.5 h-14 mt-4">
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                className="hero-bar flex-1 rounded-md bg-cool"
                initial={{ height: 0 }}
                animate={{ height: chartsInView ? `${h}%` : 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.3 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {REGIONS.map(([name, pct], i) => (
              <motion.div
                key={name}
                className="flex justify-between text-[12px]"
                initial={false}
                animate={motionOn && chartsInView ? { x: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <span className="text-graphite">{name}</span>
                <span className="font-480 text-ink tnum">{pct}</span>
              </motion.div>
            ))}
          </div>
        </HeroCard>

        <HeroCard
          className="hero-card--tr"
          index={1}
          parallaxX={springX}
          parallaxY={springY}
          factor={20}
          reduceMotion={reduceMotion}
        >
          <div className="text-[13px] font-450 text-ink mb-2">Offer acceptance</div>
          <div className="relative w-24 h-24 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f2" strokeWidth="10" />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#5d2a1a"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{
                  strokeDashoffset: chartsInView ? 251.2 * 0.25 : 251.2,
                }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[15px] font-480 text-ink">
              75%
            </span>
          </div>
          <div className="text-center text-[22px] font-480 text-ink tnum mt-2">
            {acceptance}%
          </div>
          <div className="text-center text-[11px] text-positive font-450 mt-1">
            ↑ 5.5% vs last week
          </div>
        </HeroCard>

        <HeroCard
          className="hero-card--bl"
          index={2}
          parallaxX={springX}
          parallaxY={springY}
          factor={14}
          reduceMotion={reduceMotion}
        >
          <div className="flex items-center gap-2 mb-2">
            <Avatar name="Jordan Lee" color="#d3e3fc" size={24} />
            <span className="text-[13px] font-450 text-ink">Pipeline velocity</span>
          </div>
          <svg viewBox="0 0 120 48" className="w-full h-12">
            <motion.polyline
              fill="none"
              stroke="#5d2a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,38 24,34 48,28 72,20 96,14 120,8"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{
                pathLength: chartsInView ? 1 : 0,
                opacity: chartsInView ? 1 : 0.4,
              }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            />
          </svg>
          <div className="text-[28px] font-480 text-ink tnum mt-2">26d</div>
          <div className="text-[12px] text-graphite">avg. time to hire</div>
        </HeroCard>

        <HeroCard
          className="hero-card--bc"
          index={3}
          parallaxX={springX}
          parallaxY={springY}
          factor={12}
          reduceMotion={reduceMotion}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-cool shrink-0" />
            <div className="hero-type text-[14px] text-graphite min-h-[22px] flex-1">
              {chartsInView ? (
                <Typewriter
                  text="Find ML engineers with production deployment experience"
                  startDelay={600}
                />
              ) : (
                <span className="opacity-40">Ask anything…</span>
              )}
            </div>
            <motion.button
              type="button"
              className="hero-send shrink-0"
              aria-label="Send"
              animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </HeroCard>

        <HeroCard
          className="hero-card--br"
          index={4}
          parallaxX={springX}
          parallaxY={springY}
          factor={18}
          reduceMotion={reduceMotion}
        >
          <div className="flex items-start gap-3">
            <MatchScore value={96} size={44} />
            <Avatar name="Sarah Chen" color="#fbe1d1" size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-480 text-ink">Sarah Chen</div>
              <div className="text-[12px] text-graphite">Senior ML Engineer</div>
              <span className="badge badge--positive badge--dot mt-1.5">
                Strong Hire
              </span>
            </div>
          </div>
        </HeroCard>
      </motion.div>
    </section>
  );
}

function Typewriter({ text, startDelay }: { text: string; startDelay: number }) {
  const [len, setLen] = React.useState(0);
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setLen(i);
        if (i >= text.length && interval) clearInterval(interval);
      }, 32);
    }, startDelay);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, startDelay]);
  return (
    <span>
      {text.slice(0, len)}
      <span className="hero-cursor" aria-hidden />
    </span>
  );
}