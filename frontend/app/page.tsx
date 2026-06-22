import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  Search,
  FileText,
  Briefcase,
  Upload,
  ListChecks,
  CalendarClock,
  CircleCheck,
} from "lucide-react";
import { SiteNav } from "@/components/site/SiteNav";
import { Reveal } from "@/components/site/Reveal";
import { HeroSection } from "@/components/site/HeroSection";
import { PlatformCards } from "@/components/site/PlatformCards";
import { Avatar } from "@/components/app/Atoms";
import {
  stat,
  suggestedSearches,
  candidates,
  timeToHire,
} from "@/lib/mock";

export default function HomePage() {
  return (
    <div className="site">
      <SiteNav />

      <HeroSection />

      {/* ───────── Trust logos ───────── */}
      <section className="section--alt">
        <div className="logo-strip">
          {["Stripe", "Razorpay", "Netflix", "Flipkart", "Swiggy", "PhonePe"].map(
            (name) => (
              <span key={name} className="logo-strip__item">
                {name}
              </span>
            )
          )}
        </div>
        <div className="container pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              [stat.candidatesRanked, "Candidates ranked"],
              [stat.recruiters, "Recruiters onboard"],
              [stat.screeningReduction, "Screening time reduction"],
              [stat.offerAcceptance, "Offer acceptance rate"],
            ].map(([v, l], i) => (
              <Reveal key={l} delay={i * 60}>
                <div className="text-center">
                  <div className="h-display text-[clamp(30px,4vw,44px)] text-ink tnum">
                    {v}
                  </div>
                  <div className="text-[13.5px] text-ink-muted mt-1">{l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PlatformCards />

      {/* ───────── How it works ───────── */}
      <section className="section" id="product">
        <div className="container">
          <SectionLead
            eyebrow="How it works"
            title="From open role to confident hire"
            sub="One connected workflow — no spreadsheets, no manual screening, no guesswork."
          />
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-12">
            {[
              { icon: Briefcase, label: "Create job", note: "Describe the role" },
              { icon: Upload, label: "Add candidates", note: "Import or source" },
              { icon: Sparkles, label: "AI screening", note: "Ranked instantly" },
              { icon: ListChecks, label: "Shortlist", note: "Review reasoning" },
              { icon: CalendarClock, label: "Interview", note: "Schedule & score" },
              { icon: CircleCheck, label: "Hire", note: "Decide with data" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.label} delay={i * 60}>
                  <div className="card card--hover p-4 h-full relative bg-subtle">
                    <div className="h-10 w-10 rounded-xl bg-apricot grid place-items-center mb-3">
                      <Icon size={17} className="text-rust" />
                    </div>
                    <div className="text-[14px] font-510 text-ink">{s.label}</div>
                    <div className="text-[12.5px] text-ink-muted mt-0.5">
                      {s.note}
                    </div>
                    <span className="absolute top-3 right-3 text-[12px] font-510 text-ink-muted tnum font-mono">
                      0{i + 1}
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Candidate intelligence ───────── */}
      <section className="section" id="intelligence">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <Reveal>
              <div>
                <SectionLead
                  align="left"
                  eyebrow="Candidate intelligence"
                  title="Understand every candidate at a glance"
                  sub="Skills, experience, growth trajectory and engagement — distilled into one transparent score with the reasoning behind it."
                />
                <div className="mt-7 space-y-3">
                  {[
                    "Match scoring across skills, experience and signals",
                    "Plain-language reasoning for every ranking",
                    "Honest concerns surfaced, not hidden",
                    "Hidden gems found even without exact keywords",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <Check size={17} className="text-positive flex-shrink-0" />
                      <span className="text-[14.5px] text-ink-secondary">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <CandidateCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Semantic search ───────── */}
      <section className="section section--alt" id="search">
        <div className="container">
          <SectionLead
            eyebrow="Search"
            title="Find anyone in plain language"
            sub="Describe who you need. RecruitGPT understands intent — not just keywords — and returns ranked candidates instantly."
          />
          <Reveal delay={80}>
            <div className="window max-w-3xl mx-auto mt-12">
              <div className="p-4 border-b border-line">
                <div className="relative">
                  <Sparkles
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rust"
                  />
                  <div className="w-full h-11 pl-11 pr-4 rounded-md field text-[14px] flex items-center">
                    Find ML engineers with production deployment experience
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {suggestedSearches.slice(1, 4).map((s) => (
                    <span key={s} className="badge badge--neutral">
                      {s.length > 44 ? s.slice(0, 44) + "…" : s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-canvas space-y-2">
                {candidates.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="card p-3 flex items-center gap-3"
                  >
                    <span
                      className="text-[15px] font-480 tnum w-8 text-center"
                      style={{ color: c.matchScore >= 90 ? "#5d2a1a" : "#5b8def" }}
                    >
                      {c.matchScore}
                    </span>
                    <Avatar name={c.name} color={c.avatarColor} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-ink">
                        {c.name}
                      </div>
                      <div className="text-[12px] text-ink-muted truncate">
                        {c.reasons[0]}
                      </div>
                    </div>
                    <span className="badge badge--positive hidden sm:inline-flex">
                      {c.recommendation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── AI recruiter ───────── */}
      <section className="section">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <Reveal delay={100} className="lg:order-2">
              <AiPreview />
            </Reveal>
            <Reveal className="lg:order-1">
              <div>
                <SectionLead
                  align="left"
                  eyebrow="AI recruiter"
                  title="Ask anything about your pipeline"
                  sub="Get answers grounded in your real candidates — with citations and reasoning, so every recommendation is auditable."
                />
                <div className="mt-7 space-y-3">
                  {[
                    "Who is the strongest candidate for this role?",
                    "Why is Sarah ranked above Rahul?",
                    "Which candidates have leadership experience?",
                  ].map((q) => (
                    <div
                      key={q}
                      className="card p-3.5 text-[14px] text-ink-secondary flex items-center gap-3"
                    >
                      <Search size={15} className="text-ink-faint" />
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Hiring analytics ───────── */}
      <section className="section" id="analytics">
        <div className="container">
          <SectionLead
            eyebrow="Analytics"
            title="Hiring performance, in focus"
            sub="Executive-ready dashboards for time-to-hire, conversion, source quality and candidate quality trends."
          />
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            <Reveal>
              <div className="card p-5">
                <div className="text-[13px] text-ink-muted">Time to hire</div>
                <div className="h-display text-[30px] text-ink mt-1 tnum">26d</div>
                <div className="flex items-end gap-1.5 h-16 mt-4">
                  {timeToHire.map((t, i) => (
                    <div
                      key={t.month}
                      className="flex-1 rounded-xl bg-cool"
                      style={{
                        height: `${(t.days / 41) * 100}%`,
                        opacity: 0.3 + (i / timeToHire.length) * 0.7,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="card p-5">
                <div className="text-[13px] text-ink-muted">Conversion funnel</div>
                <div className="h-display text-[30px] text-ink mt-1 tnum">2.5%</div>
                <div className="space-y-1.5 mt-4">
                  {[100, 50, 14, 4, 2.5].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full"
                      style={{
                        width: `${w}%`,
                        background: ["#17191c", "#777b86", "#5b8def", "#5d2a1a", "#5d2a1a"][i],
                      }}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="card p-5">
                <div className="text-[13px] text-ink-muted">Offer acceptance</div>
                <div className="h-display text-[30px] text-ink mt-1 tnum">73%</div>
                <svg viewBox="0 0 120 60" className="w-full h-16 mt-4">
                  <polyline
                    fill="none"
                    stroke="#5d2a1a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    points="0,44 24,40 48,36 72,30 96,22 120,14"
                  />
                </svg>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className="text-center mt-8">
              <Link href="/analytics" className="btn btn--secondary">
                Explore analytics <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="card px-8 py-16 text-center bg-surface">
              <h2 className="h-display text-[clamp(44px,4vw,64px)]">
                Ready to build better teams?
              </h2>
              <p className="text-[17px] text-ink-secondary mt-4 max-w-xl mx-auto leading-[1.6]">
                Start ranking candidates in minutes. No credit card, no setup —
                just your next great hire.
              </p>
              <div className="hero__cta mt-8">
                <Link href="/dashboard" className="btn btn--primary btn--lg">
                  Try RecruitGPT <ArrowRight size={17} />
                </Link>
                <Link href="/dashboard" className="btn btn--link btn--lg">
                  Book a demo
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-line">
        <div className="container py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="sidebar__mark" style={{ width: 24, height: 24 }}>
              R
            </span>
            <span className="text-[14px] font-semibold text-ink">RecruitGPT X</span>
          </div>
          <p className="text-[12.5px] text-ink-muted">
            © 2026 RecruitGPT X · The intelligent recruiting platform
          </p>
          <div className="flex items-center gap-5 text-[12.5px] text-ink-muted">
            <a href="#product" className="hover:text-ink">Product</a>
            <a href="#analytics" className="hover:text-ink">Analytics</a>
            <Link href="/dashboard" className="hover:text-ink">Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionLead({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : ""}>
      <Reveal>
        <span className="h-eyebrow">{eyebrow}</span>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="h-display text-[clamp(44px,4vw,64px)] text-ink mt-3">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={120}>
          <p
            className={`text-[16px] text-ink-secondary leading-relaxed mt-4 ${
              align === "center" ? "" : "max-w-lg"
            }`}
          >
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}

function CandidateCard() {
  const c = candidates[0];
  return (
    <div className="window p-0">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar name={c.name} color={c.avatarColor} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-ink">{c.name}</span>
              <span className="badge badge--positive badge--dot">
                {c.recommendation}
              </span>
            </div>
            <p className="text-[13px] text-ink-muted">
              {c.title} · {c.company}
            </p>
          </div>
          <div className="text-right">
            <div className="h-display text-[30px] text-ink tnum leading-none">
              {c.matchScore}
            </div>
            <div className="text-[11px] text-ink-muted">match</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
          {[
            ["Experience", `${c.experienceYears}y`],
            ["GitHub score", `${c.githubScore}`],
            ["Trajectory", c.trajectory],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="text-[11.5px] text-ink-muted">{l}</div>
              <div className="text-[15px] font-semibold text-ink mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="text-[11.5px] text-ink-muted mb-2">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {c.skills.map((s) => (
              <span key={s} className="badge badge--neutral">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AiPreview() {
  return (
    <div className="window">
      <div className="window__bar">
        <Sparkles size={14} className="text-accent" />
        <span className="text-[12.5px] font-medium text-ink">AI Recruiter</span>
      </div>
      <div className="p-4 bg-canvas space-y-3">
        <div className="flex justify-end">
          <div className="bg-sky text-ink rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] max-w-[80%]">
            Why is Sarah ranked above Rahul?
          </div>
        </div>
        <div className="flex gap-2.5">
          <span
            className="avatar flex-shrink-0"
            style={{ width: 30, height: 30, background: "#d3e3fc" }}
          >
            <Sparkles size={13} />
          </span>
          <div className="space-y-2 max-w-[85%]">
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              Sarah leads on production scale and team leadership, with a 98% skills
              match vs Rahul&apos;s 92%. Rahul edges ahead on open-source activity,
              but the role weights shipped production systems more heavily.
            </p>
            <div className="card card--warm p-3 flex items-center gap-2.5">
              <FileText size={14} className="text-rust" />
              <span className="text-[13px] font-480 text-ink">Sarah Chen</span>
              <span className="text-[12px] text-graphite ml-auto tnum">
                Skills 98% · Exp 95%
              </span>
            </div>
            <div className="card card--cool p-3 flex items-center gap-2.5">
              <FileText size={14} className="text-cool" />
              <span className="text-[13px] font-480 text-ink">Rahul Singh</span>
              <span className="text-[12px] text-graphite ml-auto tnum">
                Skills 92% · Exp 90%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
