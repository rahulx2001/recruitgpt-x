"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "./ui/Badge";
import type { RankedCandidate } from "@/lib/types";

interface CandidateRadarProps {
  ranked: RankedCandidate[];
  jobSkills: string[];
}

const CLUSTER_THEMES = [
  { id: 0, label: "ML / AI", color: "#8b5cf6" },
  { id: 1, label: "Data / SQL", color: "#22d3ee" },
  { id: 2, label: "Backend / Infra", color: "#10b981" },
  { id: 3, label: "Generalist", color: "#f59e0b" },
] as const;

interface SimNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rank: number;
  hireability: number;
  skillMatch: number;
  semantic: number;
  radius: number;
  fixed: boolean;
  cluster: number;
}

function inferCluster(rc: RankedCandidate, jobSkills: string[]): number {
  const intel = rc.intelligence;
  const skills = [
    ...(intel?.skills ?? []),
    ...(intel?.technologies ?? []),
  ].map((s) => s.toLowerCase());
  const job = jobSkills.map((s) => s.toLowerCase());
  const ml = ["pytorch", "tensorflow", "ml", "machine", "nlp", "llm", "transformer"];
  const data = ["sql", "spark", "etl", "power bi", "tableau", "analytics", "pandas"];
  const backend = ["kubernetes", "docker", "aws", "java", "go", "api", "microservice"];
  const score = (keys: string[]) =>
    skills.filter((s) => keys.some((k) => s.includes(k))).length +
    job.filter((s) => keys.some((k) => s.includes(k))).length;
  const scores = [score(ml), score(data), score(backend)];
  const best = scores.indexOf(Math.max(...scores));
  return scores[best] > 0 ? best : 3;
}

function convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: typeof points[0], a: typeof points[0], b: typeof points[0]) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof points = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: typeof points = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function similarity(a: RankedCandidate, b: RankedCandidate): number {
  const dims = (rc: RankedCandidate) => [
    rc.sub_scores.skill_match,
    rc.sub_scores.semantic,
    rc.sub_scores.career_growth,
    rc.sub_scores.behavioral,
    rc.hireability_score,
  ];
  const va = dims(a);
  const vb = dims(b);
  const dot = va.reduce((s, v, i) => s + v * vb[i], 0);
  const na = Math.sqrt(va.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(vb.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

function buildSimNodes(
  ranked: RankedCandidate[],
  jobSkills: string[],
  cx: number,
  cy: number,
  maxR: number,
): SimNode[] {
  const job: SimNode = {
    id: "job",
    name: "JOB",
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    rank: 0,
    hireability: 1,
    skillMatch: 1,
    semantic: 1,
    radius: 10,
    fixed: true,
    cluster: -1,
  };

  const candidates = ranked.map((rc, i) => {
    const cluster = inferCluster(rc, jobSkills);
    const clusterAngle = (cluster / CLUSTER_THEMES.length) * Math.PI * 2 - Math.PI / 2;
    const jitter = (i % 4) * 0.15;
    const dist = maxR * (0.42 + jitter);
    return {
      id: rc.candidate_id,
      name: rc.candidate_name,
      x: cx + Math.cos(clusterAngle + i * 0.4) * dist,
      y: cy + Math.sin(clusterAngle + i * 0.4) * dist,
      vx: 0,
      vy: 0,
      rank: rc.rank,
      hireability: rc.hireability_score,
      skillMatch: rc.sub_scores.skill_match,
      semantic: rc.sub_scores.semantic,
      radius: 6 + rc.hireability_score * 12,
      fixed: false,
      cluster,
    };
  });

  return [job, ...candidates];
}

function runForceSimulation(
  nodes: SimNode[],
  ranked: RankedCandidate[],
  cx: number,
  cy: number,
  maxR: number,
  iterations = 120,
): SimNode[] {
  const sims = nodes.map((n) => ({ ...n }));
  const springs: Array<{ i: number; j: number; strength: number }> = [];

  for (let i = 1; i < sims.length; i++) {
    springs.push({ i: 0, j: i, strength: 0.04 + sims[i].semantic * 0.06 });
  }
  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const sim = similarity(ranked[i], ranked[j]);
      if (sim >= 0.55) {
        springs.push({ i: i + 1, j: j + 1, strength: (sim - 0.45) * 0.14 });
      }
    }
  }

  for (let step = 0; step < iterations; step++) {
    const damp = 0.82 - step / iterations * 0.35;

    for (let i = 1; i < sims.length; i++) {
      for (let j = i + 1; j < sims.length; j++) {
        const dx = sims[j].x - sims[i].x;
        const dy = sims[j].y - sims[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const repulse = (8000 / (dist * dist)) * 0.15;
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        sims[i].vx -= fx;
        sims[i].vy -= fy;
        sims[j].vx += fx;
        sims[j].vy += fy;
      }
    }

    for (const { i, j, strength } of springs) {
      const dx = sims[j].x - sims[i].x;
      const dy = sims[j].y - sims[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const target = i === 0 ? maxR * (1 - sims[j].semantic) * 0.85 : 48 + strength * 80;
      const force = (dist - target) * strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!sims[i].fixed) {
        sims[i].vx += fx;
        sims[i].vy += fy;
      }
      if (!sims[j].fixed) {
        sims[j].vx -= fx;
        sims[j].vy -= fy;
      }
    }

    for (let i = 1; i < sims.length; i++) {
      const dx = cx - sims[i].x;
      const dy = cy - sims[i].y;
      sims[i].vx += dx * 0.002;
      sims[i].vy += dy * 0.002;
    }

    for (const n of sims) {
      if (n.fixed) continue;
      n.vx *= damp;
      n.vy *= damp;
      n.x += n.vx;
      n.y += n.vy;
      const dx = n.x - cx;
      const dy = n.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR * 1.05) {
        const scale = (maxR * 1.05) / dist;
        n.x = cx + dx * scale;
        n.y = cy + dy * scale;
      }
    }
  }

  return sims;
}

export function CandidateRadar({ ranked, jobSkills }: CandidateRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const layoutKey = useMemo(
    () => ranked.map((r) => `${r.candidate_id}:${r.hireability_score}`).join("|"),
    [ranked],
  );

  const relayout = useCallback(
    (w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.38;
      const initial = buildSimNodes(ranked, jobSkills, cx, cy, maxR);
      nodesRef.current = runForceSimulation(initial, ranked, cx, cy, maxR);
    },
    [ranked, jobSkills],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = Math.min(560, Math.max(420, rect.width * 0.6));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.38;
    const nodes = nodesRef.current;
    if (!nodes.length) return;

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxR / 4) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    const job = nodes[0];
    const pulse = 6 + Math.sin(Date.now() / 400) * 2;
    ctx.fillStyle = "rgba(74,85,245,0.18)";
    ctx.beginPath();
    ctx.arc(job.x, job.y, pulse + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a55f5";
    ctx.beginPath();
    ctx.arc(job.x, job.y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px Inter, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("JOB", job.x, job.y + pulse + 18);

    ctx.fillStyle = "rgba(156,160,179,0.9)";
    ctx.font = "9px JetBrains Mono, monospace";
    jobSkills.slice(0, 8).forEach((skill, i) => {
      const angle = (i / Math.max(1, jobSkills.length)) * Math.PI * 2 - Math.PI / 2;
      ctx.fillText(
        skill.toUpperCase(),
        cx + Math.cos(angle) * (maxR + 16),
        cy + Math.sin(angle) * (maxR + 16),
      );
    });

    CLUSTER_THEMES.forEach((theme) => {
      const members = nodes.slice(1).filter((n) => n.cluster === theme.id);
      if (members.length < 2) return;
      const hull = convexHull(members.map((m) => ({ x: m.x, y: m.y })));
      if (hull.length < 3) return;
      ctx.fillStyle = theme.color + "12";
      ctx.strokeStyle = theme.color + "44";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      hull.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      const cxC = hull.reduce((s, p) => s + p.x, 0) / hull.length;
      const cyC = hull.reduce((s, p) => s + p.y, 0) / hull.length;
      ctx.fillStyle = theme.color + "cc";
      ctx.font = "bold 9px Inter, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(theme.label, cxC, cyC - 8);
    });

    const edges: Array<[number, number, number]> = [];
    for (let i = 0; i < ranked.length; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        const sim = similarity(ranked[i], ranked[j]);
        if (sim >= 0.55) edges.push([i + 1, j + 1, sim]);
      }
    }
    edges.sort((a, b) => b[2] - a[2]);
    edges.slice(0, 18).forEach(([i, j, sim]) => {
      const ni = nodes[i];
      const nj = nodes[j];
      const hot = hovered === i - 1 || hovered === j - 1 || selected === i - 1 || selected === j - 1;
      ctx.strokeStyle = hot
        ? `rgba(34,211,238,${0.35 + sim * 0.45})`
        : `rgba(34,211,238,${0.12 + sim * 0.28})`;
      ctx.lineWidth = hot ? 2 + sim * 2 : 0.8 + sim * 2.2;
      ctx.beginPath();
      ctx.moveTo(ni.x, ni.y);
      ctx.lineTo(nj.x, nj.y);
      ctx.stroke();
    });

    nodes.slice(1, 6).forEach((n, idx) => {
      const hot = hovered === idx || selected === idx;
      ctx.strokeStyle = hot ? "rgba(74,85,245,0.5)" : "rgba(74,85,245,0.12)";
      ctx.lineWidth = hot ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(job.x, job.y);
      ctx.stroke();
    });

    nodes.slice(1).forEach((n, idx) => {
      const hot = hovered === idx || selected === idx;
      const clusterColor = CLUSTER_THEMES[n.cluster]?.color ?? "#22d3ee";
      const color =
        n.rank === 1
          ? "#fbbf24"
          : n.rank === 2
            ? "#94a3b8"
            : n.rank === 3
              ? "#fb923c"
              : clusterColor;
      const r = hot ? n.radius * 1.3 : n.radius;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2);
      grad.addColorStop(0, color + (hot ? "99" : "55"));
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (hot) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(232,233,243,0.92)";
      ctx.font = hot ? "bold 11px Inter, system-ui" : "10px Inter, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${n.rank}. ${n.name.split(" ")[0]}`, n.x, n.y + r + 14);
    });
  }, [ranked, jobSkills, hovered, selected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const w = rect.width || 640;
    const h = Math.min(560, Math.max(420, w * 0.6));
    relayout(w, h);
    draw();
  }, [layoutKey, relayout, draw]);

  useEffect(() => {
    const id = setInterval(draw, 80);
    const ro = new ResizeObserver(() => {
      const container = containerRef.current;
      if (!container) return;
      const w = container.getBoundingClientRect().width;
      const h = Math.min(560, Math.max(420, w * 0.6));
      relayout(w, h);
      draw();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      clearInterval(id);
      ro.disconnect();
    };
  }, [draw, relayout]);

  const handlePointer = (clientX: number, clientY: number, select = false) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let hit: number | null = null;
    nodesRef.current.slice(1).forEach((n, i) => {
      const dx = x - n.x;
      const dy = y - n.y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 8) hit = i;
    });
    setHovered(hit);
    if (select && hit !== null) setSelected(hit);
    if (hit !== null) {
      const n = nodesRef.current[hit + 1];
      setTooltip({
        x: clientX - container.getBoundingClientRect().left,
        y: clientY - container.getBoundingClientRect().top,
        text: `${n.name} · #${n.rank} · ${CLUSTER_THEMES[n.cluster]?.label ?? "Cluster"} · ${(n.hireability * 100).toFixed(0)}% fit · sim edges show peer similarity`,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="cursor-grab rounded-xl active:cursor-grabbing"
        onMouseMove={(e) => handlePointer(e.clientX, e.clientY)}
        onMouseLeave={() => {
          setHovered(null);
          setTooltip(null);
        }}
        onClick={(e) => handlePointer(e.clientX, e.clientY, true)}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-white/10 bg-surface-elevated/95 px-3 py-2 text-xs text-ink shadow-lg backdrop-blur"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.text}
        </div>
      )}
      {selected !== null && ranked[selected] && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="brand">Selected: {ranked[selected].candidate_name}</Badge>
          <Badge variant="outline">Rank #{ranked[selected].rank}</Badge>
          <Badge variant="outline">Force-directed skill cluster graph</Badge>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-3 text-[10px]">
        {CLUSTER_THEMES.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            <span className="text-ink-subtle">{c.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-cyan-400/70" />
          <span className="text-ink-subtle">Similarity edge (≥55%)</span>
        </div>
      </div>
    </div>
  );
}