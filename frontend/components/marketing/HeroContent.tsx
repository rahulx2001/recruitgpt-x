"use client";

import { PillButton } from "./PillButton";

const STATS = [
  { value: "7", label: "AI agents" },
  { value: "12", label: "Demo candidates" },
  { value: "74%", label: "Top match score" },
];

export function HeroContent() {
  return (
    <div className="lp-hero__copy">
      <div className="lp-hero-animate lp-hero-animate--1 lp-badge">
        <span className="lp-badge__dot" aria-hidden />
        AI Next-Generation Recruitment Platform
      </div>
      <h1 className="lp-hero-animate lp-hero-animate--2 lp-headline">
        Where Your Hiring
        <br />
        Gets Smarter
      </h1>
      <p className="lp-hero-animate lp-hero-animate--3 lp-subtitle">
        Paste a job description and let our multi-agent recruiting system identify,
        evaluate, and rank candidates using semantic intelligence rather than keyword matching.
      </p>
      <div className="lp-hero-animate lp-hero-animate--4 lp-hero__actions">
        <PillButton href="/dashboard" variant="primary">
          Launch Demo
        </PillButton>
        <PillButton href="/#agents" variant="secondary">
          View Architecture
        </PillButton>
      </div>
      <div className="lp-hero-animate lp-hero-animate--5 lp-hero__stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="lp-hero__stat">
            <span className="lp-hero__stat-value">{stat.value}</span>
            <span className="lp-hero__stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}