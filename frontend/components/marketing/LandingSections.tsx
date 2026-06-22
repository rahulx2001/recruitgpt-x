"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  BarChart3,
  Shield,
  Eye,
  Brain,
  Search,
  ShieldCheck,
  Lock,
  ScrollText,
  UserCheck,
  Scale,
  MessageSquare,
  GitBranch,
  FileSearch,
  type LucideIcon,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "./Reveal";
import { PillButton } from "./PillButton";

const PIPELINE_STEPS = [
  {
    step: "Step 1",
    title: "Paste Job Description",
    label: "Parse:",
    items: ["Skills", "Seniority", "Expectations"],
    icon: FileText,
  },
  {
    step: "Step 2",
    title: "Agent Evaluation",
    label: "Analyze:",
    items: ["Resume", "GitHub", "Experience", "Learning trajectory"],
    icon: Users,
  },
  {
    step: "Step 3",
    title: "Rank Candidates",
    label: "Generate:",
    items: ["Score", "Explanation", "Bias audit", "Recommendations"],
    icon: BarChart3,
  },
];

const AGENTS: {
  name: string;
  desc: string;
  featured?: boolean;
  icon: LucideIcon;
}[] = [
  { name: "Resume Agent", desc: "Extracts experience and qualifications.", icon: FileText },
  { name: "Skills Agent", desc: "Matches technical capabilities.", icon: Search },
  { name: "Trajectory Agent", desc: "Analyzes growth patterns.", icon: BarChart3 },
  { name: "GitHub Agent", desc: "Evaluates public projects.", icon: FileSearch },
  { name: "Bias Audit Agent", desc: "Ensures fair evaluation across every signal.", featured: true, icon: Scale },
  { name: "Culture Agent", desc: "Measures team alignment.", icon: Users },
  { name: "Interview Agent", desc: "Predicts interview performance.", icon: MessageSquare },
];

const PERFORMANCE_FEATURES = [
  { title: "Explainable Rankings", text: "Every score is traceable to agent reasoning.", icon: Eye },
  { title: "Multi-Agent Reasoning", text: "Multiple perspectives before any decision.", icon: Brain },
  { title: "Semantic Matching", text: "Meaning over keywords, every time.", icon: Search },
  { title: "Bias Detection", text: "Transparent, auditable, and automatic.", icon: ShieldCheck },
];

const SECURITY_FEATURES: { label: string; icon: LucideIcon }[] = [
  { label: "Role-Based Access", icon: Lock },
  { label: "Audit Trails", icon: ScrollText },
  { label: "Candidate Privacy", icon: UserCheck },
  { label: "Compliance Controls", icon: Shield },
  { label: "Semantic Search", icon: Search },
  { label: "Recruiter AI Chat", icon: MessageSquare },
  { label: "What-if Analysis", icon: GitBranch },
  { label: "Bias Audit", icon: Scale },
];

const FOOTER_LINKS = {
  Platform: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Candidates", href: "/candidates" },
    { label: "Jobs", href: "/jobs" },
    { label: "Search", href: "/search" },
  ],
  Resources: [
    { label: "Architecture", href: "/#agents" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Demo", href: "/#demo" },
    { label: "API Docs", href: "/dashboard" },
  ],
  Company: [
    { label: "About", href: "/" },
    { label: "Blog", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Contact", href: "/" },
  ],
  Legal: [
    { label: "Privacy", href: "/" },
    { label: "Terms", href: "/" },
    { label: "Security", href: "/#security" },
    { label: "Compliance", href: "/#security" },
  ],
  Social: [
    { label: "GitHub", href: "/" },
    { label: "Twitter", href: "/" },
    { label: "LinkedIn", href: "/" },
  ],
};

export function PipelineSection() {
  return (
    <section className="lp-section lp-section--compact" id="how-it-works">
      <div className="lp-section__inner">
        <Reveal>
          <div className="lp-section__intro lp-section__intro--center">
            <span className="lp-section__badge">How It Works</span>
            <h2 className="lp-section__title">Inside The Pipeline</h2>
            <p className="lp-section__desc lp-section__desc--tight lp-section__desc--center">
              Our recruiting engine transforms unstructured candidate information
              into explainable hiring decisions.
            </p>
          </div>
        </Reveal>

        <Stagger className="lp-pipeline-grid" stagger={0.1} delay={0.05}>
          {PIPELINE_STEPS.map((s, index) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.title}>
                <article className="lp-pipeline-card">
                  <div className="lp-pipeline-card__top">
                    <div className="lp-pipeline-card__icon">
                      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                    </div>
                    <span className="lp-pipeline-card__step">{s.step}</span>
                  </div>
                  <h3 className="lp-pipeline-card__title">{s.title}</h3>
                  <div className="lp-pipeline-card__label">{s.label}</div>
                  <ul className="lp-pipeline-card__list">
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {index < PIPELINE_STEPS.length - 1 && (
                    <span className="lp-pipeline-card__arrow" aria-hidden>→</span>
                  )}
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export function AgentsSection() {
  return (
    <section className="lp-section lp-section--alt" id="agents">
      <div className="lp-section__inner">
        <Reveal>
          <div className="lp-section__header-row">
            <div>
              <span className="lp-section__badge">AI Architecture</span>
              <h2 className="lp-section__title lp-section__title--flush">
                Seven Agents.
                <br />
                One Decision.
              </h2>
            </div>
            <p className="lp-section__desc lp-section__desc--flush">
              Specialized agents evaluate candidates from multiple angles before
              a unified ranking is produced — observable and auditable at every step.
            </p>
          </div>
        </Reveal>

        <Stagger className="lp-agents-grid" stagger={0.07} delay={0.05}>
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            return (
              <StaggerItem key={agent.name}>
                <article
                  className={`lp-agent-card ${agent.featured ? "lp-agent-card--featured" : ""}`}
                >
                  <div className="lp-agent-card__icon">
                    <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </div>
                  <h3 className="lp-agent-card__name">{agent.name}</h3>
                  <p className="lp-agent-card__desc">{agent.desc}</p>
                  {agent.featured && (
                    <div className="lp-agent-card__bar">
                      <span>Fair Evaluation</span>
                    </div>
                  )}
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export function PerformanceSection() {
  return (
    <section className="lp-section" id="performance">
      <div className="lp-section__inner">
        <div className="lp-performance">
          <Reveal direction="left">
            <span className="lp-section__badge">Why RecruitGPT X</span>
            <h2 className="lp-section__title">
              Built For Consistent
              <br />
              Hiring Performance
            </h2>
            <p className="lp-section__desc lp-section__desc--flush">
              Institutional-grade intelligence designed for teams that need
              defensible, repeatable hiring outcomes.
            </p>
          </Reveal>

          <Stagger className="lp-feature-grid" stagger={0.08} delay={0.1}>
            {PERFORMANCE_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <StaggerItem key={f.title}>
                  <article className="lp-feature-tile">
                    <div className="lp-feature-tile__icon">
                      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </div>
                    <h3 className="lp-feature-tile__title">{f.title}</h3>
                    <p className="lp-feature-tile__text">{f.text}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

export function SecuritySection() {
  return (
    <section className="lp-section lp-section--alt" id="security">
      <div className="lp-section__inner">
        <Reveal>
          <div className="lp-section__intro">
            <span className="lp-section__badge">Enterprise Ready</span>
            <h2 className="lp-section__title">
              Security Built Into
              <br />
              Every Layer
            </h2>
            <p className="lp-section__desc lp-section__desc--tight">
              Enterprise-grade controls ensure every hiring decision is defensible,
              private, and compliant.
            </p>
          </div>
        </Reveal>

        <Stagger className="lp-security-grid" stagger={0.05} delay={0.08}>
          {SECURITY_FEATURES.map(({ label, icon: Icon }) => (
            <StaggerItem key={label}>
              <div className="lp-security-card">
                <div className="lp-security-card__icon">
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </div>
                <span className="lp-security-card__label">{label}</span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="lp-section lp-section--cta">
      <div className="lp-section__inner">
        <Reveal>
          <div className="lp-cta-box">
            <h2 className="lp-section__title lp-section__title--center">
              Ready To Hire Smarter?
            </h2>
            <p className="lp-section__desc lp-section__desc--center">
              Watch multiple AI agents evaluate candidates and generate transparent
              hiring decisions in real time.
            </p>
            <div className="lp-cta__actions">
              <PillButton href="/dashboard" variant="primary">
                Launch Demo
              </PillButton>
              <PillButton href="/#agents" variant="secondary">
                Explore Architecture
              </PillButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__top">
        <div className="lp-footer__brand-block">
          <span className="lp-footer__brand">RecruitGPT X</span>
          <p className="lp-footer__tagline">
            Multi-agent recruiting intelligence for modern hiring teams.
          </p>
        </div>
      </div>
      <div className="lp-footer__grid">
        {Object.entries(FOOTER_LINKS).map(([title, links]) => (
          <div key={title} className="lp-footer__col">
            <h4>{title}</h4>
            {links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="lp-footer__bottom">
        <span>© 2026 RecruitGPT X. All rights reserved.</span>
        <span className="lp-footer__stack">Next.js · FastAPI · LangGraph · Qdrant</span>
      </div>
    </footer>
  );
}