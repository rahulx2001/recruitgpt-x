"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Briefcase,
  Github,
  Linkedin,
  Award,
  Sparkles,
  Filter,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { Candidate } from "@/lib/types";

export default function CandidatesPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: api.listCandidates,
  });

  const locations = Array.from(
    new Set(candidates.map((c) => c.location).filter(Boolean) as string[])
  ).sort();

  const filtered = candidates.filter((c) => {
    if (locationFilter && c.location !== locationFilter) return false;
    if (levelFilter) {
      const yrs = c.years_experience ?? 0;
      if (levelFilter === "Junior" && yrs >= 3) return false;
      if (levelFilter === "Mid" && (yrs < 3 || yrs >= 6)) return false;
      if (levelFilter === "Senior" && (yrs < 6 || yrs >= 10)) return false;
      if (levelFilter === "Staff+" && yrs < 10) return false;
    }
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const hay = [
        c.full_name,
        c.headline,
        c.current_role,
        c.location,
        c.resume_text,
        ...(c.skills?.map((s) => s.name) ?? []),
        ...(c.certifications ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="violet">
                <Users className="h-3 w-3" /> Talent pool
              </Badge>
              <span className="text-xs text-ink-subtle font-mono">
                {filtered.length}/{candidates.length} candidates
              </span>
            </div>
            <h1 className="text-3xl font-bold text-ink mb-1">Candidates</h1>
            <p className="text-sm text-ink-muted">
              Browse, filter, and inspect AI-analyzed candidate profiles.
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
            <Input
              placeholder="Search by name, skill, role, location…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={locationFilter ?? ""}
              onChange={(e) => setLocationFilter(e.target.value || null)}
              className="w-full h-10 rounded-lg border border-bg-border bg-bg-surface px-3 text-sm text-ink focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={levelFilter ?? ""}
              onChange={(e) => setLevelFilter(e.target.value || null)}
              className="w-full h-10 rounded-lg border border-bg-border bg-bg-surface px-3 text-sm text-ink focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/30"
            >
              <option value="">All levels</option>
              <option value="Junior">Junior (0-2y)</option>
              <option value="Mid">Mid (3-5y)</option>
              <option value="Senior">Senior (6-9y)</option>
              <option value="Staff+">Staff+ (10y+)</option>
            </select>
          </div>
        </div>

        {/* Results grid */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 skeleton rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <Card className="border-dashed">
            <div className="py-16 text-center">
              <Filter className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
              <div className="text-sm text-ink-muted">
                No candidates match your filters.
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery("");
                  setLocationFilter(null);
                  setLevelFilter(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <CandidateCard key={c.id} candidate={c} index={i} />
          ))}
        </div>
      </main>
    </>
  );
}

function CandidateCard({
  candidate,
  index,
}: {
  candidate: Candidate;
  index: number;
}) {
  const topSkills = (candidate.skills ?? [])
    .slice()
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 4);
  const years = candidate.years_experience ?? 0;
  const level =
    years >= 10 ? "Staff+" : years >= 6 ? "Senior" : years >= 3 ? "Mid" : "Junior";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
    >
      <Link href={`/candidates/${candidate.id}`}>
        <Card className="p-5 h-full hover:border-brand-400/40 hover:scale-[1.01] transition-all cursor-pointer group">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center font-semibold text-white shadow-lg shadow-brand-500/20">
              {initials(candidate.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink truncate">
                  {candidate.full_name}
                </h3>
                <Badge variant="brand" className="text-[9px]">
                  {level}
                </Badge>
              </div>
              <p className="text-xs text-ink-muted truncate">
                {candidate.headline || candidate.current_role || "—"}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-subtle">
                {candidate.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {candidate.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="h-2.5 w-2.5" /> {years}y
                </span>
              </div>
            </div>
          </div>

          {/* Top skills */}
          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {topSkills.map((s, i) => (
                <Badge key={i} variant="default" className="text-[10px]">
                  {s.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-bg-border/50">
            <div className="flex items-center gap-2 text-[10px] text-ink-subtle">
              {candidate.github_url && (
                <Github className="h-3 w-3 hover:text-ink transition-colors" />
              )}
              {candidate.linkedin_url && (
                <Linkedin className="h-3 w-3 hover:text-ink transition-colors" />
              )}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <span className="flex items-center gap-1">
                  <Award className="h-2.5 w-2.5" /> {candidate.certifications.length}
                </span>
              )}
            </div>
            <div className="text-[10px] text-brand-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              View profile <Sparkles className="h-3 w-3" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
