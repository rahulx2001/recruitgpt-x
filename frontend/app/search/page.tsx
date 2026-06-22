"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search as SearchIcon,
  Sparkles,
  Loader2,
  MapPin,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { initials } from "@/lib/utils";

const SUGGESTIONS = [
  "ML engineer with PyTorch and AWS experience",
  "Strong SQL but no Power BI",
  "Startup experience, fast learner",
  "Senior data scientist with leadership",
  "Backend engineer with distributed systems",
  "Recent graduate with strong portfolio",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, error } = useQuery<SearchResult[]>({
    queryKey: ["search", submitted],
    queryFn: () => (submitted ? api.search(submitted, 12) : Promise.resolve([])),
    enabled: !!submitted,
  });

  function submit(q?: string) {
    const next = (q ?? query).trim();
    if (!next) return;
    setSubmitted(next);
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 mb-3">
              <SearchIcon className="h-3 w-3 text-brand-300" />
              <span className="text-[10px] font-medium text-brand-200 uppercase tracking-wider">
                Natural language search · powered by BGE embeddings
              </span>
            </div>
            <h1 className="text-3xl font-bold text-ink">
              Find candidates by meaning, not keywords
            </h1>
            <p className="text-ink-muted mt-2 max-w-2xl">
              Ask in plain English. Our semantic search indexes skills, projects,
              experience, and career signals to surface the right people —
              even when the words don&apos;t match exactly.
            </p>
          </div>

          <Card>
            <CardContent className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. strong in SQL but lacking Power BI"
                    className="w-full rounded-lg border border-bg-border bg-bg-elevated pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Search
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-ink-subtle uppercase tracking-wider mr-1 self-center">
                  Try:
                </span>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(s);
                      submit(s);
                    }}
                    disabled={isLoading}
                    className="rounded-full bg-bg-elevated border border-bg-border hover:border-brand-400/40 hover:bg-brand-500/5 px-3 py-1 text-[11px] text-ink-muted hover:text-ink transition-all disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="mt-6">
            {submitted && isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-ink-muted text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching {data === undefined ? "…" : "candidates"} semantically…
              </div>
            )}

            {error && (
              <Card>
                <CardContent className="py-12 text-center text-rose-300 text-sm space-y-2">
                  <p>
                    {error instanceof Error
                      ? error.message
                      : "Search request failed."}
                  </p>
                  <p className="text-ink-subtle text-xs">
                    API expects{" "}
                    <code className="font-mono text-[11px]">
                      {`{ "query": "...", "top_k": 12 }`}
                    </code>
                    . Ensure the backend is running on http://localhost:8000.
                  </p>
                </CardContent>
              </Card>
            )}

            {!isLoading && data && data.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-ink-subtle text-sm">
                  No candidates matched. Try a different query.
                </CardContent>
              </Card>
            )}

            {data && data.length > 0 && (
              <>
                <div className="text-xs text-ink-muted mb-3 flex items-center justify-between">
                  <span>
                    Found{" "}
                    <span className="text-ink font-semibold">
                      {data.length}
                    </span>{" "}
                    candidates matching{" "}
                    <span className="text-brand-300">&ldquo;{submitted}&rdquo;</span>
                  </span>
                  <span className="font-mono text-[10px] text-ink-subtle">
                    ranked by cosine similarity
                  </span>
                </div>

                <div className="space-y-3">
                  {data.map((r, i) => (
                    <motion.div
                      key={r.candidate.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="hover:border-brand-400/40 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center font-bold text-white text-sm">
                              {initials(r.candidate.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <Link
                                  href={`/candidates/${r.candidate.id}`}
                                  className="font-semibold text-ink hover:text-brand-300 transition-colors"
                                >
                                  {r.candidate.full_name}
                                </Link>
                                <Badge variant="brand">
                                  {r.candidate.years_experience}y
                                </Badge>
                                <span className="text-[10px] font-mono text-ink-subtle">
                                  sim {r.similarity.toFixed(3)}
                                </span>
                              </div>
                              <div className="text-xs text-ink-muted mb-2">
                                {r.candidate.headline ||
                                  r.candidate.current_role ||
                                  "—"}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-subtle">
                                {r.candidate.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {r.candidate.location}
                                  </span>
                                )}
                                {r.candidate.current_role && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {r.candidate.current_role}
                                  </span>
                                )}
                              </div>
                              {r.matched_aspects.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {r.matched_aspects.slice(0, 6).map((a, j) => (
                                    <Badge
                                      key={j}
                                      variant="default"
                                      className="text-[9px]"
                                    >
                                      {a}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Link
                              href={`/candidates/${r.candidate.id}`}
                              className="shrink-0 text-ink-subtle hover:text-brand-300 transition-colors"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {!submitted && (
              <Card className="mt-2">
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-8 w-8 text-brand-400 mx-auto mb-3" />
                  <div className="text-sm text-ink-muted">
                    Try a natural language query above to find candidates by
                    meaning.
                  </div>
                  <div className="text-[11px] text-ink-subtle mt-2 max-w-md mx-auto">
                    Examples: <em>&ldquo;data scientist with healthcare
                    background&rdquo;</em>, <em>&ldquo;strong communicator but
                    limited leadership&rdquo;</em>,{" "}
                    <em>&ldquo;recent graduate hungry to learn&rdquo;</em>.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
