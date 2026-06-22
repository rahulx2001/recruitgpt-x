import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  size = 64,
  stroke = 5,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const dash = c * pct;
  const color =
    pct >= 0.75
      ? "#10b981"
      : pct >= 0.55
        ? "#22d3ee"
        : pct >= 0.4
          ? "#f59e0b"
          : "#f43f5e";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-sm font-semibold" style={{ color }}>
            {(pct * 100).toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ScoreBar({
  value,
  className,
  color,
  height = 6,
  max = 1,
}: {
  value: number;
  className?: string;
  color?: string;
  height?: number;
  /** Max value for normalization. Default 1 (already 0-1). */
  max?: number;
}) {
  const ratio =
    max === 1
      ? Math.max(0, Math.min(1, value))
      : Math.max(0, Math.min(1, value / max));
  const c =
    color ||
    (ratio >= 0.75
      ? "#10b981"
      : ratio >= 0.55
        ? "#22d3ee"
        : ratio >= 0.4
          ? "#f59e0b"
          : "#f43f5e");
  return (
    <div
      className={cn(
        "w-full rounded-full overflow-hidden bg-bg-elevated",
        className,
      )}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${ratio * 100}%`, backgroundColor: c }}
      />
    </div>
  );
}
