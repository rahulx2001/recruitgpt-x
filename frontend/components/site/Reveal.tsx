"use client";

/**
 * Visible by default — no opacity:0 SSR trap.
 * Subtle scroll slide when motion is allowed.
 */
import { motion, useReducedMotion } from "framer-motion";
import { useMounted } from "@/lib/useMounted";

export function Reveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right";
}) {
  const mounted = useMounted();
  const reduceMotion = useReducedMotion();

  if (!mounted || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const fromY = direction === "up" ? 14 : 0;
  const fromX = direction === "left" ? -14 : direction === "right" ? 14 : 0;

  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={{ x: 0, y: 0 }}
      viewport={{ once: true, margin: "-48px", amount: 0.12 }}
      transition={{
        duration: 0.5,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ transform: `translate(${fromX}px, ${fromY}px)` }}
    >
      {children}
    </motion.div>
  );
}