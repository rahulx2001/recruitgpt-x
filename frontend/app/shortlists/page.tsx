"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  Users,
  Layers,
  TrendingUp,
  Search,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar, CandidateAvatar, Kpi } from "@/components/app/Atoms";
import {
  useWorkspaceShortlists,
  useWorkspaceSearchMeta,
} from "@/lib/useWorkspaceBundle";

type Shortlist = {
  id: string;
  name: string;
  job: string;
  owner: string;
  owner_color: string;
  members: Array<{
    candidate_id: string;
    name: string;
    avatar_color: string;
    match_score: number;
  }>;
};

function tierIndex(id: string): number {
  if (id.includes("top10")) return 1;
  if (id.includes("11-25")) return 2;
  return 3;
}

function avgScore(members: Shortlist["members"]): number {
  if (!members.length) return 0;
  return Math.round(
    members.reduce((sum, m) => sum + m.match_score, 0) / members.length
  );
}

function ShortlistTierCard({
  list,
  tier,
  onOpen,
}: {
  list: Shortlist;
  tier: number;
  onOpen: () => void;
}) {
  const avg = avgScore(list.members);
  const preview = list.members.slice(0, 3);
  const remaining = Math.max(0, list.members.length - preview.length);

  return (
    <button type="button" className="shortlist-card" onClick={onOpen}>
      <div className="shortlist-card__head">
        <span
          className={`shortlist-card__tier${tier === 1 ? " shortlist-card__tier--1" : tier === 2 ? " shortlist-card__tier--2" : ""}`}
          aria-hidden
        >
          {tier}
        </span>
        <div className="min-w-0 flex-1">
          <div className="shortlist-card__title">{list.name}</div>
          <div className="shortlist-card__job">{list.job}</div>
        </div>
        <span className="badge badge--neutral tnum shrink-0">
          {list.members.length}
        </span>
      </div>

      <div className="shortlist-card__body">
        <div className="shortlist-card__score-row">
          <div className="shortlist-card__score-track">
            <div
              className="shortlist-card__score-fill"
              style={{ width: `${avg}%` }}
            />
          </div>
          <span className="shortlist-card__score-label">
            <strong>{avg}%</strong> avg
          </span>
        </div>

        {preview.map((m) => (
          <div key={m.candidate_id} className="shortlist-card__member">
            <CandidateAvatar name={m.name} size={28} />
            <span className="shortlist-card__member-name">{m.name}</span>
            <span className="shortlist-card__member-score">{m.match_score}</span>
          </div>
        ))}
        {remaining > 0 && (
          <p className="shortlist-card__more">+{remaining} more in this tier</p>
        )}
      </div>

      <div className="shortlist-card__foot">
        <span className="shortlist-card__owner">
          <Avatar name={list.owner} color={list.owner_color} size={22} />
          <span>{list.owner}</span>
        </span>
        <span className="text-action font-medium text-ink pointer-events-none">
          Open <ArrowRight size={13} />
        </span>
      </div>
    </button>
  );
}

function ShortlistsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="metrics-row metrics-row--3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="kpi">
            <div className="skeleton h-3 w-20 mb-3" />
            <div className="skeleton h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="shortlist-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel p-5 space-y-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-2 w-full rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShortlistsPage() {
  const router = useRouter();
  const { data: lists = [], isLoading } = useWorkspaceShortlists();
  const { data: searchMeta } = useWorkspaceSearchMeta();

  const openShortlist = React.useCallback(
    (id: string, highlight: string) => {
      const params = new URLSearchParams({ shortlist: id });
      if (highlight) params.set("highlight", highlight);
      router.push(`/candidates?${params.toString()}`);
    },
    [router]
  );

  const totalCandidates = lists.reduce((n, l) => n + l.members.length, 0);
  const topTierAvg =
    lists.length > 0 ? avgScore(lists[0].members) : 0;

  return (
    <AppShell
      title="Shortlists"
      subtitle="Curated rank tiers from your top-100 challenge pool"
      actions={
        <>
          <Link href="/candidates" className="btn btn--secondary btn--sm">
            <Users size={15} /> All candidates
          </Link>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => window.alert("Create shortlist (demo)")}
          >
            <Plus size={15} /> New shortlist
          </button>
        </>
      }
    >
      {isLoading ? (
        <ShortlistsSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="metrics-row metrics-row--3">
            <Kpi
              label="Active shortlists"
              value={String(lists.length)}
              hint="rank tiers"
              icon={Layers}
            />
            <Kpi
              label="Candidates curated"
              value={totalCandidates.toLocaleString()}
              hint="across all tiers"
              icon={Users}
            />
            <Kpi
              label="Top tier avg match"
              value={topTierAvg > 0 ? `${topTierAvg}%` : "—"}
              hint="interview-ready pool"
              icon={TrendingUp}
            />
          </div>

          {lists.length > 0 ? (
            <div className="shortlist-grid">
              {lists.map((l) => (
                <ShortlistTierCard
                  key={l.id}
                  list={l}
                  tier={tierIndex(l.id)}
                  onOpen={() =>
                    openShortlist(l.id, l.members[0]?.candidate_id ?? "")
                  }
                />
              ))}
            </div>
          ) : (
            <div className="panel panel__body text-center py-12">
              <p className="text-[14px] font-medium text-ink">No shortlists yet</p>
              <p className="text-[13px] text-ink-muted mt-1">
                Import challenge candidates to generate rank tiers.
              </p>
            </div>
          )}

          {searchMeta && searchMeta.saved.length > 0 && (
            <div className="panel max-w-2xl">
              <div className="panel__head">
                <div>
                  <h2 className="panel__title">Saved searches</h2>
                  <p className="panel__subtitle">
                    Quick filters synced with your workspace
                  </p>
                </div>
                <Link href="/search" className="text-action">
                  <Search size={13} /> Search
                </Link>
              </div>
              <div className="panel__body panel__body--list">
                <div className="panel__list">
                  {searchMeta.saved.map((s) => (
                    <Link
                      key={s.name}
                      href={`/search?q=${encodeURIComponent(s.query)}`}
                      className="saved-search-row"
                    >
                      <span className="saved-search-row__check" aria-hidden>
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                      <span className="saved-search-row__name">{s.name}</span>
                      <span className="saved-search-row__count">
                        {s.count} matches
                      </span>
                      <span className="saved-search-row__meta">{s.owner}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}