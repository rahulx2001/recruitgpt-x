"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Search,
  Bookmark,
  CalendarClock,
  Sparkles,
  BarChart3,
  Settings,
  Command,
  Bell,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Atoms";
import { Dropdown, DropdownItem } from "./Dropdown";
import {
  ShellOverlays,
  defaultQuickFindItems,
} from "./ShellOverlays";
import { useWorkspaceStats } from "@/lib/useWorkspaceStats";

const navBase = [
  { group: "Workspace", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase, countKey: "jobs" as const },
    { href: "/candidates", label: "Candidates", icon: Users, countKey: "candidates" as const },
    { href: "/search", label: "Search", icon: Search },
  ]},
  { group: "Hiring", items: [
    { href: "/shortlists", label: "Shortlists", icon: Bookmark },
    { href: "/interviews", label: "Interviews", icon: CalendarClock, countKey: "interviews" as const },
    { href: "/ai", label: "AI Recruiter", icon: Sparkles },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ]},
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: stats } = useWorkspaceStats();
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [topbarScrolled, setTopbarScrolled] = React.useState(false);
  const mainRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setTopbarScrolled(el.scrollTop > 8);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const nav = navBase.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (!("countKey" in item) || !item.countKey) {
        return item;
      }
      const n = stats?.[item.countKey];
      return {
        ...item,
        count: n != null ? n.toLocaleString() : "—",
      };
    }),
  }));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen(true);
        setNotifOpen(false);
      }
      if (e.key === "Escape") {
        setQuickOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell">
      <ShellOverlays
        quickFindItems={defaultQuickFindItems}
        quickOpen={quickOpen}
        onQuickOpenChange={setQuickOpen}
        notifOpen={notifOpen}
        onNotifOpenChange={setNotifOpen}
      />
      <aside className="sidebar">
        <Link href="/" className="sidebar__brand">
          <span className="sidebar__mark">R</span>
          RecruitGPT&nbsp;X
        </Link>

        <button
          type="button"
          className="btn btn--secondary btn--sm w-full justify-start mt-1 mb-1"
          onClick={() => {
            setNotifOpen(false);
            setQuickOpen(true);
          }}
          aria-label="Quick find (Cmd+K)"
        >
          <Search size={15} className="text-ink-faint" />
          <span className="text-ink-muted font-normal">Quick find</span>
          <kbd className="ml-auto text-2xs text-ink-faint border border-line rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <Command size={10} /> K
          </kbd>
        </button>

        <nav className="flex-1 overflow-y-auto -mx-1 px-1">
          {nav.map((section) => (
            <div key={section.group}>
              <div className="sidebar__group">{section.group}</div>
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? "is-active" : ""}`}
                  >
                    <Icon size={17} strokeWidth={2} className="text-ink-faint" />
                    {item.label}
                    {"count" in item && item.count ? (
                      <span className="nav-item__count">{item.count}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-3 border-t border-line">
          <Link href="/settings" className="nav-item">
            <Settings size={17} className="text-ink-faint" />
            Settings
          </Link>
          <Dropdown
            align="left"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2.5 px-2.5 py-2 mt-1 w-full rounded-lg hover:bg-subtle transition-colors text-left"
                aria-label="Open profile menu"
                aria-haspopup="menu"
              >
                <Avatar name="Jordan Lee" color="#4F46E5" size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink truncate">
                    Jordan Lee
                  </div>
                  <div className="text-2xs text-ink-faint truncate">
                    Head of Talent
                  </div>
                </div>
              </button>
            }
          >
            <DropdownItem onClick={() => router.push("/settings?section=profile")}>
              Profile
            </DropdownItem>
            <DropdownItem onClick={() => router.push("/settings?section=workspace")}>
              Workspace
            </DropdownItem>
            <DropdownItem onClick={() => router.push("/settings?section=preferences")}>
              Preferences
            </DropdownItem>
            <DropdownItem
              destructive
              onClick={() => setToast("Signed out (demo)")}
            >
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </aside>

      <div className="main" ref={mainRef}>
        <header className={`topbar ${topbarScrolled ? "is-scrolled" : ""}`}>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold text-ink tracking-tight leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[12.5px] text-ink-muted truncate leading-tight">
                {subtitle}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <button
              type="button"
              className="btn btn--ghost btn--sm px-2.5 relative"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              onClick={() => {
                setQuickOpen(false);
                setNotifOpen((v) => !v);
              }}
            >
              <Bell size={17} />
              <span className="notif-dot" aria-hidden />
            </button>
          </div>
        </header>
        <div
          className={`content${
            pathname === "/dashboard" || pathname === "/analytics"
              ? " content--wide"
              : ""
          }`}
        >
          {children}
        </div>
      </div>

      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}

export { Plus };
