"use client";

import * as React from "react";
import Link from "next/link";

const links = [
  { href: "#product", label: "Product" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#search", label: "Search" },
  { href: "#analytics", label: "Analytics" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container flex items-center h-[68px] gap-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-medium text-[15px] text-ink"
        >
          <span className="sidebar__mark" style={{ width: 28, height: 28 }}>
            R
          </span>
          RecruitGPT X
        </Link>
        <nav className="site-nav__links hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="site-nav__link px-3 py-2 text-[15px] text-ink hover:text-ash transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          <Link href="/dashboard" className="btn btn--primary btn--sm">
            Try live demo
          </Link>
        </div>
      </div>
    </header>
  );
}