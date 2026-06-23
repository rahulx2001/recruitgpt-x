"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useWorkspaceActivity } from "@/lib/useWorkspaceBundle";

export type QuickFindItem = {
  label: string;
  href: string;
  hint?: string;
  group: string;
};

type ShellOverlaysProps = {
  quickFindItems: QuickFindItem[];
  quickOpen: boolean;
  onQuickOpenChange: (open: boolean) => void;
  notifOpen: boolean;
  onNotifOpenChange: (open: boolean) => void;
};

export function ShellOverlays({
  quickFindItems,
  quickOpen,
  onQuickOpenChange,
  notifOpen,
  onNotifOpenChange,
}: ShellOverlaysProps) {
  const router = useRouter();
  const { data: liveActivity = [] } = useWorkspaceActivity();
  const notifications = liveActivity;
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (quickOpen) {
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [quickOpen]);

  const filtered = quickFindItems.filter(
    (item) =>
      !query ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.group.toLowerCase().includes(query.toLowerCase())
  );

  const groups = [...new Set(filtered.map((i) => i.group))];

  const go = (href: string) => {
    onQuickOpenChange(false);
    onNotifOpenChange(false);
    router.push(href);
  };

  return (
    <>
      {quickOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
          <button
            type="button"
            className="overlay-backdrop"
            aria-label="Close quick find"
            onClick={() => onQuickOpenChange(false)}
          />
          <div
            role="dialog"
            aria-label="Quick find"
            className="relative w-full max-w-lg bg-surface border border-line rounded-xl shadow-float overflow-hidden animate-fade-up"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <Search size={16} className="text-ink-faint shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages and actions…"
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-faint"
                onKeyDown={(e) => {
                  if (e.key === "Escape") onQuickOpenChange(false);
                  if (e.key === "Enter" && filtered[0]) go(filtered[0].href);
                }}
              />
              <button
                type="button"
                className="h-7 w-7 grid place-items-center rounded-md hover:bg-subtle text-ink-muted"
                onClick={() => onQuickOpenChange(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-2">
              {groups.length === 0 && (
                <p className="px-4 py-6 text-[13px] text-ink-muted text-center">
                  No matches for &ldquo;{query}&rdquo;
                </p>
              )}
              {groups.map((group) => (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {group}
                  </div>
                  {filtered
                    .filter((i) => i.group === group)
                    .map((item) => (
                      <button
                        key={item.href + item.label}
                        type="button"
                        className="flex items-center justify-between gap-3 mx-2 w-[calc(100%-16px)] px-3 py-2.5 text-left rounded-lg hover:bg-subtle transition-colors"
                        onClick={() => go(item.href)}
                      >
                        <span className="text-[14px] font-medium text-ink">
                          {item.label}
                        </span>
                        {item.hint && (
                          <span className="text-[12px] text-ink-faint">
                            {item.hint}
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {notifOpen && (
        <div className="fixed inset-0 z-[65]">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close notifications"
            onClick={() => onNotifOpenChange(false)}
          />
          <div className="absolute right-6 top-[52px] w-[340px] max-w-[calc(100vw-32px)] bg-surface border border-line rounded-xl shadow-float overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-[14px] font-semibold text-ink">
                Notifications
              </span>
              <button
                type="button"
                className="text-[12px] font-medium text-accent hover:text-accent-hover"
                onClick={() => {
                  onNotifOpenChange(false);
                  router.push("/dashboard");
                }}
              >
                View all
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto divide-y divide-line">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-[13px] text-ink-muted">
                  No notifications yet.
                </p>
              ) : null}
              {notifications.slice(0, 8).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-subtle transition-colors"
                  onClick={() => {
                    onNotifOpenChange(false);
                    router.push(
                      "href" in a && a.href ? a.href : "/dashboard"
                    );
                  }}
                >
                  <p className="text-[13px] text-ink-secondary leading-snug">
                    <span className="font-semibold text-ink">{a.actor}</span>{" "}
                    {a.action}{" "}
                    <span className="font-semibold text-ink">{a.target}</span>
                  </p>
                  <p className="text-[12px] text-ink-faint mt-0.5">{a.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const defaultQuickFindItems: QuickFindItem[] = [
  { group: "Navigate", label: "Dashboard", href: "/dashboard" },
  { group: "Navigate", label: "Jobs", href: "/jobs" },
  { group: "Navigate", label: "Candidates", href: "/candidates" },
  { group: "Navigate", label: "Search", href: "/search" },
  { group: "Navigate", label: "Shortlists", href: "/shortlists" },
  { group: "Navigate", label: "Interviews", href: "/interviews" },
  { group: "Navigate", label: "AI Recruiter", href: "/ai" },
  { group: "Navigate", label: "Analytics", href: "/analytics" },
  { group: "Navigate", label: "Settings", href: "/settings" },
  { group: "Actions", label: "New job", href: "/jobs/new", hint: "Create" },
  { group: "Actions", label: "Ask RecruitGPT", href: "/ai", hint: "AI" },
];