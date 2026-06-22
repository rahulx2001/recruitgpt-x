"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Download,
  Check,
  X,
  Github,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  CandidateAvatar,
  MatchScore,
  RecommendationBadge,
  StageBadge,
  ScoreMeter,
} from "@/components/app/Atoms";
import { CandidatesLoadingShell } from "@/components/app/LoadingStates";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mapApiCandidates } from "@/lib/candidateAdapter";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";
import { useWorkspaceShortlists } from "@/lib/useWorkspaceBundle";
import {
  type Candidate,
  type PipelineStage,
  type Recommendation,
} from "@/lib/mock";

const filters = ["All", "Strong Hire", "Interview", "Offer", "New"] as const;
type TabFilter = (typeof filters)[number];

const RECOMMENDATIONS: Recommendation[] = [
  "Strong Hire",
  "Hire",
  "Lean Hire",
  "Hold",
];

type PanelFilters = {
  stage: PipelineStage | "";
  recommendation: Recommendation | "";
  minMatch: number;
};

const defaultPanelFilters: PanelFilters = {
  stage: "",
  recommendation: "",
  minMatch: 0,
};

function matchesTab(c: Candidate, tab: TabFilter): boolean {
  if (tab === "Strong Hire") return c.recommendation === "Strong Hire";
  if (tab === "Interview") return c.stage === "Interview";
  if (tab === "Offer") return c.stage === "Offer";
  if (tab === "New") return c.appliedDaysAgo <= 3;
  return true;
}

function matchesPanel(c: Candidate, panel: PanelFilters): boolean {
  if (panel.stage && c.stage !== panel.stage) return false;
  if (panel.recommendation && c.recommendation !== panel.recommendation) {
    return false;
  }
  if (panel.minMatch > 0 && c.matchScore < panel.minMatch) return false;
  return true;
}

const STAGE_ORDER: PipelineStage[] = [
  "Applied",
  "Screened",
  "Interview",
  "Offer",
  "Hired",
];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

function nextStage(current: PipelineStage): PipelineStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export default function CandidatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center text-ink-muted text-sm">
          Loading candidates…
        </div>
      }
    >
      <CandidatesView />
    </Suspense>
  );
}

function CandidatesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage") as PipelineStage | null;
  const highlightId = searchParams.get("highlight");
  const shortlistId = searchParams.get("shortlist");
  const { data: stats } = useWorkspaceStats();
  const { data: shortlists = [] } = useWorkspaceShortlists();
  const activeShortlist = shortlists.find((s) => s.id === shortlistId);
  const shortlistIds = React.useMemo(
    () => new Set(activeShortlist?.members.map((m) => m.candidate_id) ?? []),
    [activeShortlist]
  );

  const {
    data: apiCandidates,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api.listCandidates(),
  });
  const { data: rankings = [] } = useQuery({
    queryKey: ["challenge-rankings"],
    queryFn: () => api.challengeRankings(),
  });

  const mappedFromApi = React.useMemo(
    () => (apiCandidates ? mapApiCandidates(apiCandidates, rankings) : []),
    [apiCandidates, rankings]
  );

  const [tabFilter, setTabFilter] = React.useState<TabFilter>("All");
  const [panelFilters, setPanelFilters] =
    React.useState<PanelFilters>(defaultPanelFilters);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Candidate | null>(null);
  const [pool, setPool] = React.useState<Candidate[]>([]);

  React.useEffect(() => {
    if (mappedFromApi.length > 0) {
      setPool(mappedFromApi);
    }
  }, [mappedFromApi]);
  const [rejectedIds, setRejectedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [toast, setToast] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    if (stageParam && STAGE_ORDER.includes(stageParam)) {
      setPanelFilters((p) => ({ ...p, stage: stageParam }));
      setTabFilter("All");
      setPanelOpen(true);
    }
  }, [stageParam]);

  const selectTab = (f: TabFilter) => {
    setTabFilter(f);
    setPanelFilters(defaultPanelFilters);
    setPanelOpen(false);
    setPage(1);
    if (stageParam || highlightId) {
      const params = new URLSearchParams();
      if (shortlistId) params.set("shortlist", shortlistId);
      const qs = params.toString();
      router.replace(qs ? `/candidates?${qs}` : "/candidates", { scroll: false });
    }
  };

  React.useEffect(() => {
    setPage(1);
  }, [query, panelFilters.stage, panelFilters.recommendation, panelFilters.minMatch]);

  const activePanelCount = [
    panelFilters.stage,
    panelFilters.recommendation,
    panelFilters.minMatch > 0,
  ].filter(Boolean).length;

  React.useEffect(() => {
    if (!highlightId) return;
    const match = pool.find((c) => c.id === highlightId);
    if (match) setSelected(match);
  }, [highlightId, pool]);

  const advanceCandidate = React.useCallback((c: Candidate) => {
    const next = nextStage(c.stage);
    if (!next) {
      setToast(`${c.name} is already at ${c.stage}`);
      return;
    }
    setActingId(c.id);
    setPool((prev) =>
      prev.map((row) => (row.id === c.id ? { ...row, stage: next } : row))
    );
    setSelected((prev) =>
      prev?.id === c.id ? { ...prev, stage: next } : prev
    );
    setToast(`Advanced ${c.name} → ${next}`);
    window.setTimeout(() => setActingId(null), 400);
  }, []);

  const rejectCandidate = React.useCallback((c: Candidate) => {
    setActingId(c.id);
    setRejectedIds((prev) => new Set(prev).add(c.id));
    setSelected((prev) => (prev?.id === c.id ? null : prev));
    setToast(`Removed ${c.name} from pipeline`);
    window.setTimeout(() => setActingId(null), 400);
  }, []);

  const activeCount = pool.filter((c) => !rejectedIds.has(c.id)).length;

  const basePool = pool
    .filter((c) => !rejectedIds.has(c.id))
    .filter((c) =>
      shortlistIds.size > 0 ? shortlistIds.has(c.id) : true
    );

  const exportCsv = React.useCallback(() => {
    const header = [
      "Name",
      "Title",
      "Company",
      "Match",
      "Stage",
      "Recommendation",
      "Experience",
    ];
    const esc = (v: string | number) =>
      `"${String(v).replace(/"/g, '""')}"`;
    const dataRows = basePool
      .filter((c) => matchesTab(c, tabFilter))
      .filter((c) => matchesPanel(c, panelFilters))
      .filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase())) ||
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.company.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => b.matchScore - a.matchScore);
    const lines = dataRows.map((c) =>
      [
        c.name,
        c.title,
        c.company,
        c.matchScore,
        c.stage,
        c.recommendation,
        c.experienceYears,
      ]
        .map(esc)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${dataRows.length} candidates to CSV`);
  }, [basePool, tabFilter, panelFilters, query]);

  const rows = basePool
    .filter((c) => matchesTab(c, tabFilter))
    .filter((c) => matchesPanel(c, panelFilters))
    .filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase())) ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.company.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => b.matchScore - a.matchScore);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, rows.length);
  const paginatedRows = rows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  if (isLoading) {
    return (
      <AppShell title="Candidates" subtitle="Loading challenge candidates…">
        <CandidatesLoadingShell />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Candidates" subtitle="Backend unavailable">
        <div className="card p-8 text-center">
          <p className="text-critical text-[14px] font-medium">
            Could not load candidates from API.
          </p>
          <p className="text-ink-muted text-[13px] mt-2">
            {(error as Error)?.message ?? "Is the backend running on :8000?"}
          </p>
          <p className="text-ink-faint text-[12px] mt-4">
            Run: ./scripts/import-challenge-candidates.sh then refresh.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Candidates"
      subtitle={
        activeShortlist
          ? `Shortlist: ${activeShortlist.name} · ${basePool.length} members`
          : `${activeCount} active · ${stats?.candidates ?? activeCount} in challenge pool · ${rejectedIds.size} removed`
      }
      actions={
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={exportCsv}
        >
          <Download size={15} /> Export
        </button>
      }
    >
      {activeShortlist && (
        <div className="card p-3 mb-3 flex items-center justify-between gap-3 bg-accent-soft/40 border-accent/20">
          <p className="text-[13px] text-ink-secondary">
            Viewing shortlist{" "}
            <span className="font-semibold text-ink">
              {activeShortlist.name}
            </span>{" "}
            for {activeShortlist.job}
          </p>
          <Link
            href="/candidates"
            className="text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            Clear filter
          </Link>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="seg">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => selectTab(f)}
              className={`seg-btn ${tabFilter === f ? "is-active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, or title…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-[14px] outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft transition"
          />
        </div>
        <button
          type="button"
          className={`btn btn--secondary btn--sm ${
            panelOpen || activePanelCount > 0 ? "border-accent/40 text-accent" : ""
          }`}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <SlidersHorizontal size={15} /> Filters
          {activePanelCount > 0 && (
            <span className="badge badge--accent ml-1">{activePanelCount}</span>
          )}
        </button>
      </div>

      <p className="text-[12.5px] text-ink-muted mb-3">
        {rows.length === 0 ? (
          <>No candidates match this view</>
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold text-ink tnum">
              {pageStart}–{pageEnd}
            </span>{" "}
            of <span className="tnum">{rows.length}</span> filtered
            <span className="text-ink-faint">
              {" "}
              ({basePool.length} total)
            </span>
          </>
        )}
        {tabFilter !== "All" && (
          <span>
            {" "}
            · tab: <span className="font-medium text-ink">{tabFilter}</span>
          </span>
        )}
      </p>

      {panelOpen && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-muted uppercase tracking-wide">
                Stage
              </span>
              <select
                value={panelFilters.stage}
                onChange={(e) =>
                  setPanelFilters((p) => ({
                    ...p,
                    stage: e.target.value as PipelineStage | "",
                  }))
                }
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-line bg-surface text-[14px] outline-none focus:border-accent"
              >
                <option value="">Any stage</option>
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-muted uppercase tracking-wide">
                Recommendation
              </span>
              <select
                value={panelFilters.recommendation}
                onChange={(e) =>
                  setPanelFilters((p) => ({
                    ...p,
                    recommendation: e.target.value as Recommendation | "",
                  }))
                }
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-line bg-surface text-[14px] outline-none focus:border-accent"
              >
                <option value="">Any recommendation</option>
                {RECOMMENDATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-muted uppercase tracking-wide">
                Min match score
              </span>
              <select
                value={panelFilters.minMatch}
                onChange={(e) =>
                  setPanelFilters((p) => ({
                    ...p,
                    minMatch: Number(e.target.value),
                  }))
                }
                className="mt-1.5 w-full h-9 px-3 rounded-lg border border-line bg-surface text-[14px] outline-none focus:border-accent"
              >
                <option value={0}>Any score</option>
                <option value={90}>90+</option>
                <option value={80}>80+</option>
                <option value={70}>70+</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="btn btn--primary btn--sm flex-1"
                onClick={() => setPanelOpen(false)}
              >
                Apply
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setPanelFilters(defaultPanelFilters);
                  setToast("Filters cleared");
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {(panelFilters.stage ||
        panelFilters.recommendation ||
        panelFilters.minMatch > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {panelFilters.stage && (
            <button
              type="button"
              className="badge badge--accent"
              onClick={() =>
                setPanelFilters((p) => ({ ...p, stage: "" }))
              }
            >
              Stage: {panelFilters.stage} ×
            </button>
          )}
          {panelFilters.recommendation && (
            <button
              type="button"
              className="badge badge--accent"
              onClick={() =>
                setPanelFilters((p) => ({ ...p, recommendation: "" }))
              }
            >
              {panelFilters.recommendation} ×
            </button>
          )}
          {panelFilters.minMatch > 0 && (
            <button
              type="button"
              className="badge badge--accent"
              onClick={() =>
                setPanelFilters((p) => ({ ...p, minMatch: 0 }))
              }
            >
              Match ≥ {panelFilters.minMatch} ×
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Match</th>
                <th>Skills</th>
                <th>Exp.</th>
                <th>GitHub</th>
                <th>Stage</th>
                <th>Recommendation</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-ink-muted">
                    No candidates match this view.
                    {rejectedIds.size > 0 && (
                      <button
                        type="button"
                        className="block mx-auto mt-2 text-accent hover:text-accent-hover text-[13px] font-medium"
                        onClick={() => setRejectedIds(new Set())}
                      >
                        Restore {rejectedIds.size} removed
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {paginatedRows.map((c) => (
                <tr
                  key={c.id}
                  className={`is-clickable ${
                    selected?.id === c.id ? "is-selected" : ""
                  } ${actingId === c.id ? "bg-accent-soft/40" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <CandidateAvatar name={c.name} gender={c.gender} size={36} />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-ink">
                          {c.name}
                        </div>
                        <div className="text-[12.5px] text-ink-muted truncate">
                          {c.title} · {c.company}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[15px] font-semibold tnum"
                        style={{
                          color:
                            c.matchScore >= 90
                              ? "#0E9F6E"
                              : c.matchScore >= 80
                              ? "#4F46E5"
                              : "#C2780C",
                        }}
                      >
                        {c.matchScore}
                      </span>
                      <div className="w-12 meter">
                        <div
                          className="meter__fill"
                          style={{
                            width: `${c.matchScore}%`,
                            background:
                              c.matchScore >= 90
                                ? "#0E9F6E"
                                : c.matchScore >= 80
                                ? "#4F46E5"
                                : "#C2780C",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {c.skills.slice(0, 3).map((s) => (
                        <span key={s} className="badge badge--neutral">
                          {s}
                        </span>
                      ))}
                      {c.skills.length > 3 && (
                        <span className="badge badge--neutral">
                          +{c.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="tnum text-ink-secondary">{c.experienceYears}y</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 tnum text-ink-secondary">
                      <Github size={14} className="text-ink-faint" />
                      {c.githubScore}
                    </span>
                  </td>
                  <td>
                    <StageBadge value={c.stage} />
                  </td>
                  <td>
                    <RecommendationBadge value={c.recommendation} />
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="h-8 w-8 grid place-items-center rounded-md border border-line text-positive hover:bg-positive/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          advanceCandidate(c);
                        }}
                        disabled={c.stage === "Hired" || actingId === c.id}
                        aria-label={
                          c.stage === "Hired"
                            ? `${c.name} already hired`
                            : `Advance ${c.name} to next stage`
                        }
                        title={
                          c.stage === "Hired"
                            ? "Already hired"
                            : `Advance to ${nextStage(c.stage) ?? "next stage"}`
                        }
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        className="h-8 w-8 grid place-items-center rounded-md border border-line text-ink-faint hover:bg-critical/5 hover:text-critical hover:border-critical/30 disabled:opacity-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectCandidate(c);
                        }}
                        disabled={actingId === c.id}
                        aria-label={`Remove ${c.name} from pipeline`}
                        title="Remove from pipeline"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line bg-subtle/50">
            <div className="flex items-center gap-2 text-[13px] text-ink-muted">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-line bg-surface text-[13px] outline-none focus:border-accent"
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="pager">
              <button
                type="button"
                className="pager__btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => {
                  if (totalPages <= 7) return true;
                  if (n === 1 || n === totalPages) return true;
                  return Math.abs(n - safePage) <= 1;
                })
                .reduce<(number | "gap")[]>((acc, n, idx, arr) => {
                  if (idx > 0) {
                    const prev = arr[idx - 1];
                    if (n - prev > 1) acc.push("gap");
                  }
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "gap" ? (
                    <span
                      key={`gap-${idx}`}
                      className="px-1 text-ink-faint text-[13px]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`pager__btn ${item === safePage ? "is-active" : ""}`}
                      aria-label={`Page ${item}`}
                      aria-current={item === safePage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                className="pager__btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <span className="text-[12.5px] text-ink-muted tnum w-full sm:w-auto text-center sm:text-right">
              Page {safePage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Scorecard drawer */}
      {selected && (
        <CandidateDrawer
          candidate={selected}
          onClose={() => setSelected(null)}
          onAdvance={() => advanceCandidate(selected)}
          onReject={() => rejectCandidate(selected)}
        />
      )}

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

function CandidateDrawer({
  candidate: c,
  onClose,
  onAdvance,
  onReject,
}: {
  candidate: Candidate;
  onClose: () => void;
  onAdvance: () => void;
  onReject: () => void;
}) {
  const advanceLabel =
    c.stage === "Hired"
      ? "Already hired"
      : c.stage === "Offer"
      ? "Mark as hired"
      : c.stage === "Interview"
      ? "Advance to offer"
      : c.stage === "Screened"
      ? "Advance to interview"
      : "Advance to screened";
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="overlay-backdrop"
        aria-label="Close scorecard"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-surface border-l border-line h-full overflow-y-auto animate-fade-up shadow-float">
        <div className="sticky top-0 bg-surface/90 backdrop-blur border-b border-line px-6 py-4 flex items-center justify-between">
          <span className="h-eyebrow">Candidate scorecard</span>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-md hover:bg-subtle text-ink-muted"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4">
            <CandidateAvatar name={c.name} gender={c.gender} size={56} />
            <div className="min-w-0">
              <h3 className="text-[19px] font-semibold text-ink tracking-tight">
                {c.name}
              </h3>
              <p className="text-[13px] text-ink-muted">{c.title}</p>
              <p className="text-[12.5px] text-ink-faint inline-flex items-center gap-1 mt-0.5">
                <MapPin size={12} /> {c.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <MatchScore value={c.matchScore} size={56} />
            <div>
              <RecommendationBadge value={c.recommendation} />
              <p className="text-[12.5px] text-ink-muted mt-1.5">
                {c.experienceYears}y experience · Growth {c.trajectory.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            <ScoreMeter label="Skills match" value={c.skillsMatch} accent="#4F46E5" />
            <ScoreMeter
              label="Experience match"
              value={c.experienceMatch}
              accent="#4F46E5"
            />
            <ScoreMeter label="GitHub signal" value={c.githubMatch} accent="#4F46E5" />
          </div>

          <div className="mt-6">
            <span className="h-eyebrow">Skills</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.skills.map((s) => (
                <span key={s} className="badge badge--neutral">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 card p-4 bg-accent-soft/50 border-accent/20">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={15} className="text-accent" />
              <span className="text-[13px] font-semibold text-ink">
                Why this ranking
              </span>
            </div>
            <ul className="space-y-2">
              {c.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-[13px] text-ink-secondary">
                  <Check size={15} className="text-positive mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
            {c.concern && (
              <div className="flex gap-2 text-[13px] text-ink-secondary mt-2.5 pt-2.5 border-t border-accent/15">
                <span className="text-warning font-semibold flex-shrink-0">
                  Watch:
                </span>
                {c.concern}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              className="btn btn--primary flex-1"
              disabled={c.stage === "Hired"}
              onClick={onAdvance}
            >
              {advanceLabel}
            </button>
            <button
              type="button"
              className="btn btn--secondary text-critical border-critical/20 hover:bg-critical/5"
              onClick={onReject}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
