"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  MessageSquare,
  GitBranch,
  Radar,
  Search,
  Menu,
  X,
} from "lucide-react";
import { PillButton } from "@/components/marketing/PillButton";

const APP_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/whatif", label: "What-If", icon: GitBranch },
  { href: "/radar", label: "Radar", icon: Radar },
];

const MARKETING_LINKS = [
  { href: "/#hero", label: "Home", id: "hero" },
  { href: "/#how-it-works", label: "How It Works", id: "how-it-works" },
  { href: "/#agents", label: "Agents", id: "agents" },
  { href: "/#security", label: "Security", id: "security" },
  { href: "/#demo", label: "Demo", id: "demo" },
];

const SECTION_IDS = MARKETING_LINKS.map((l) => l.id);

export function Navbar({ marketing = false }: { marketing?: boolean }) {
  const path = usePathname();
  const isHome = path === "/";
  const showMarketing = marketing || isHome;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    if (!showMarketing) return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showMarketing]);

  useEffect(() => {
    if (!showMarketing) return;
    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [showMarketing]);

  if (showMarketing) {
    return (
      <header className={cn("lp-nav lp-nav--marketing", scrolled && "lp-nav--scrolled")}>
        <Link href="/" className="lp-logo">
          RecruitGPT X
        </Link>

        <nav className="lp-nav-pill" aria-label="Main">
          {MARKETING_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={activeSection === item.id ? "is-active" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <PillButton href="/dashboard" variant="primary">
              Launch Demo
            </PillButton>
          </div>
          <button
            type="button"
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-ink-muted hover:bg-bg-elevated transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="lp-nav-mobile"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {MARKETING_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={activeSection === item.id ? "is-active" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <PillButton href="/dashboard" variant="primary">
                Launch Demo
              </PillButton>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 glass h-16 border-b border-bg-border">
      <div className="container h-full flex items-center gap-4 px-6">
        <Link href="/" className="font-bold text-sm text-ink shrink-0">
          RecruitGPT X
        </Link>
        <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
          {APP_NAV.map((item) => {
            const active = path?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                  active ? "bg-bg-elevated text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href="/jobs/new"
          className="ml-auto nex-pill nex-pill--dark text-sm"
          style={{ padding: "8px 6px 8px 16px" }}
        >
          New Job
          <span className="nex-pill__icon" style={{ width: 28, height: 28, marginLeft: 8 }}>
            <Briefcase className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </header>
  );
}