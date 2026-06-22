"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function PillButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "dark" | "light";
}) {
  const resolved =
    variant === "dark" ? "primary" : variant === "light" ? "secondary" : variant;

  return (
    <Link href={href} className={`lp-btn lp-btn--${resolved}`}>
      {children}
      <span className="lp-btn__icon" aria-hidden>
        <ArrowUpRight className="h-4 w-4 lp-btn__arrow" strokeWidth={2.5} />
      </span>
    </Link>
  );
}