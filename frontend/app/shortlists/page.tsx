"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Avatar } from "@/components/app/Atoms";
import {
  useWorkspaceShortlists,
  useWorkspaceSearchMeta,
} from "@/lib/useWorkspaceBundle";

export default function ShortlistsPage() {
  const router = useRouter();
  const { data: lists = [], isLoading } = useWorkspaceShortlists();
  const { data: searchMeta } = useWorkspaceSearchMeta();

  const openShortlist = (id: string, highlight: string) => {
    const params = new URLSearchParams({ shortlist: id });
    if (highlight) params.set("highlight", highlight);
    router.push(`/candidates?${params.toString()}`);
  };

  return (
    <AppShell
      title="Shortlists"
      subtitle="Curated collections from your top-100 challenge rankings"
    >
      {isLoading && (
        <div className="card p-12 text-center text-ink-muted">Loading shortlists…</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {lists.map((l) => (
          <div
            key={l.id}
            className="card card--hover p-5 flex flex-col cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() =>
              openShortlist(l.id, l.members[0]?.candidate_id ?? "")
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openShortlist(l.id, l.members[0]?.candidate_id ?? "");
              }
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bookmark size={16} className="text-accent" />
              <span className="badge badge--neutral">{l.job}</span>
            </div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight mt-1.5">
              {l.name}
            </h3>

            <div className="flex items-center mt-4 mb-1">
              {l.members.slice(0, 5).map((m, idx) => (
                <span
                  key={m.candidate_id}
                  style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }}
                  className="ring-2 ring-surface rounded-full"
                >
                  <Avatar name={m.name} color={m.avatar_color} size={32} />
                </span>
              ))}
              <span className="ml-2 text-[13px] text-ink-muted">
                {l.members.length} candidates
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-muted">
                <Avatar name={l.owner} color={l.owner_color} size={22} />
                {l.owner}
              </span>
              <Link
                href={`/candidates?shortlist=${l.id}&highlight=${l.members[0]?.candidate_id ?? ""}`}
                className="text-[13px] font-medium text-accent hover:text-accent-hover inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Open <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {searchMeta && searchMeta.saved.length > 0 && (
        <>
          <h2 className="text-[13px] font-semibold text-ink tracking-tight mt-8 mb-3">
            Saved searches
          </h2>
          <div className="card divide-y divide-line overflow-hidden max-w-2xl">
            {searchMeta.saved.map((s) => (
              <Link
                key={s.name}
                href={`/search?q=${encodeURIComponent(s.query)}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-subtle transition-colors"
              >
                <Bookmark size={15} className="text-ink-faint" />
                <span className="text-[14px] font-medium text-ink flex-1">
                  {s.name}
                </span>
                <span className="text-[12.5px] text-ink-muted tnum">
                  {s.count} matches
                </span>
                <span className="text-[12.5px] text-ink-faint">· {s.owner}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}