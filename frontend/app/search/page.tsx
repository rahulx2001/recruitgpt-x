"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Bookmark,
  CornerDownLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { CandidateAvatar, RecommendationBadge } from "@/components/app/Atoms";
import { api } from "@/lib/api";
import { mapSearchResults, parseRedrobId } from "@/lib/candidateAdapter";
import { useWorkspaceSearchMeta } from "@/lib/useWorkspaceBundle";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <SearchView />
    </Suspense>
  );
}

function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = React.useState(initialQ);
  const [submitted, setSubmitted] = React.useState(initialQ);

  React.useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setSubmitted(q);
  }, [searchParams]);

  const { data: meta } = useWorkspaceSearchMeta();
  const { data: rankings = [] } = useQuery({
    queryKey: ["challenge-rankings"],
    queryFn: () => api.challengeRankings(),
  });

  const { data: rawResults = [], isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.search(submitted, 10),
    enabled: Boolean(submitted.trim()),
  });

  const results = React.useMemo(
    () => mapSearchResults(rawResults, rankings),
    [rawResults, rankings]
  );

  const run = (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);
    setSubmitted(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    const path = params.toString() ? `/search?${params}` : "/search";
    router.replace(path, { scroll: false });
  };

  return (
    <AppShell
      title="Search"
      subtitle="Search your challenge candidate pool via the backend ranker index"
    >
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) run(query);
          }}
          className="relative"
        >
          <Sparkles
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-accent"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. ML engineers with production deployment experience…"
            className="w-full h-14 pl-12 pr-28 rounded-xl border border-line-strong bg-surface text-[15px] shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft transition"
          />
          <button
            type="submit"
            className="btn btn--primary btn--sm absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            Search <CornerDownLeft size={14} />
          </button>
        </form>

        {!submitted ? (
          <div className="mt-8 space-y-8">
            <div>
              <span className="h-eyebrow">Suggested searches</span>
              <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
                {(meta?.suggested ?? []).map((s) => (
                  <button
                    key={s}
                    onClick={() => run(s)}
                    className="card card--hover text-left p-3.5 flex items-start gap-3 group"
                  >
                    <Search
                      size={16}
                      className="text-ink-faint mt-0.5 group-hover:text-accent transition-colors"
                    />
                    <span className="text-[13.5px] text-ink-secondary leading-snug">
                      {s}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <span className="h-eyebrow">Recent</span>
                <div className="mt-3 space-y-1">
                  {(meta?.recent ?? []).map((s) => (
                    <button
                      key={s}
                      onClick={() => run(s)}
                      className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-lg hover:bg-subtle text-[13.5px] text-ink-secondary"
                    >
                      <Clock size={14} className="text-ink-faint flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="h-eyebrow">Saved searches</span>
                <div className="mt-3 space-y-1">
                  {(meta?.saved ?? []).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => run(s.query)}
                      className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-lg hover:bg-subtle"
                    >
                      <Bookmark size={14} className="text-ink-faint flex-shrink-0" />
                      <span className="text-[13.5px] text-ink-secondary truncate flex-1">
                        {s.name}
                      </span>
                      <span className="text-[12px] text-ink-faint tnum">
                        {s.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-7">
            <div className="card p-4 bg-accent-soft/50 border-accent/20 flex items-start gap-3 mb-5">
              <Sparkles size={16} className="text-accent mt-0.5" />
              <p className="text-[13.5px] text-ink-secondary leading-relaxed">
                {isFetching ? (
                  "Searching challenge pool…"
                ) : (
                  <>
                    Found{" "}
                    <span className="font-semibold text-ink">
                      {results.length} matches
                    </span>{" "}
                    for &ldquo;{submitted}&rdquo; from your imported candidates.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2.5">
              {results.map((c) => {
                const highlight =
                  c.id ||
                  (rawResults.find((r) => r.candidate.full_name === c.name)
                    ? parseRedrobId(
                        rawResults.find((r) => r.candidate.full_name === c.name)!
                          .candidate
                      )
                    : "");
                return (
                  <div
                    key={c.id + c.name}
                    className="card card--hover p-4 flex items-center gap-4"
                  >
                    <span
                      className="text-[17px] font-semibold tnum w-9 text-center"
                      style={{
                        color: c.matchScore >= 90 ? "#0E9F6E" : "#4F46E5",
                      }}
                    >
                      {c.matchScore}
                    </span>
                    <CandidateAvatar name={c.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-ink">
                          {c.name}
                        </span>
                        <RecommendationBadge value={c.recommendation} />
                      </div>
                      <p className="text-[12.5px] text-ink-muted truncate">
                        {c.title} · {c.company} · {c.experienceYears}y
                      </p>
                      <p className="text-[12.5px] text-ink-secondary mt-1 truncate">
                        <span className="text-accent font-medium">Match:</span>{" "}
                        {c.reasons[0]}
                      </p>
                    </div>
                    <Link
                      href={`/candidates?highlight=${highlight}`}
                      className="btn btn--secondary btn--sm"
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
              {!isFetching && results.length === 0 && (
                <p className="text-center text-ink-muted py-8 text-[14px]">
                  No matches — try a broader query.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}