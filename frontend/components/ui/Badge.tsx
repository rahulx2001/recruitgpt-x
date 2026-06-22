import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-bg-elevated text-ink-muted border border-bg-border",
        brand: "bg-accent-yellow/30 text-ink border border-bg-border",
        cyan: "bg-sky-50 text-sky-700 border border-sky-200",
        violet: "bg-violet-50 text-violet-700 border border-violet-200",
        amber: "bg-amber-50 text-amber-700 border border-amber-200",
        emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        rose: "bg-rose-50 text-rose-700 border border-rose-200",
        outline: "border border-bg-border text-ink-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}