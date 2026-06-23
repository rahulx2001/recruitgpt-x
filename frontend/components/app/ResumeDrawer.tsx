"use client";

import Link from "next/link";
import { MapPin, Briefcase, GraduationCap, ExternalLink } from "lucide-react";
import { CandidateAvatar } from "@/components/app/Atoms";
import { DrawerShell } from "@/components/app/DrawerShell";
import type { Candidate as UiCandidate } from "@/lib/mock";
import type { Candidate as ApiCandidate } from "@/lib/types";

function formatResumeExcerpt(text: string, max = 2400): string {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}

export function ResumeDrawer({
  ui,
  api,
  onClose,
}: {
  ui: UiCandidate;
  api: ApiCandidate;
  onClose: () => void;
}) {
  const experiences = api.experiences ?? [];
  const summary =
    api.headline?.trim() ||
    ui.title ||
    experiences[0]?.role ||
    "Experienced professional";

  return (
    <DrawerShell
      title="Resume"
      subtitle="Quick prep view — stay on interviews"
      ariaLabel="Candidate resume"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--secondary flex-1" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="scorecard-hero">
        <CandidateAvatar name={ui.name} size={52} />
        <div className="min-w-0">
          <h3 className="scorecard-hero__title">{ui.name}</h3>
          <p className="scorecard-hero__sub">
            {ui.title}
            {ui.company && ui.company !== "—" ? ` @ ${ui.company}` : ""}
          </p>
          <p className="scorecard-hero__loc">
            <MapPin size={12} /> {ui.location}
          </p>
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Summary</div>
        <p className="text-[13.5px] text-ink-secondary leading-relaxed">{summary}</p>
        <p className="text-[12px] text-ink-muted mt-2">
          {ui.experienceYears} years experience · {ui.skills.length} skills on file
        </p>
      </div>

      {experiences.length > 0 ? (
        <div className="scorecard-section">
          <div className="scorecard-section__label">Experience</div>
          <div className="resume-timeline">
            {experiences.slice(0, 5).map((exp) => (
              <div key={`${exp.company}-${exp.role}`} className="resume-timeline__item">
                <div className="resume-timeline__title">{exp.role}</div>
                <div className="resume-timeline__meta">
                  <Briefcase size={12} />
                  {exp.company}
                  {exp.is_current ? " · Current" : ""}
                </div>
                {exp.description ? (
                  <p className="resume-timeline__desc">{exp.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {api.school ? (
        <div className="scorecard-section">
          <div className="scorecard-section__label">Education</div>
          <p className="text-[13px] text-ink-secondary inline-flex items-center gap-1.5">
            <GraduationCap size={14} className="text-ink-faint" />
            {api.school}
          </p>
        </div>
      ) : null}

      <div className="scorecard-section">
        <div className="scorecard-section__label">Skills</div>
        <div className="scorecard-skills">
          {ui.skills.map((s) => (
            <span key={s} className="badge badge--neutral">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="scorecard-section">
        <div className="scorecard-section__label">Resume text</div>
        <pre className="resume-excerpt">{formatResumeExcerpt(api.resume_text)}</pre>
      </div>

      <div className="flex flex-wrap gap-3 mt-2">
        {api.linkedin_url ? (
          <a
            href={api.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-action text-[12px] inline-flex items-center gap-1"
          >
            LinkedIn <ExternalLink size={12} />
          </a>
        ) : null}
        {api.github_url ? (
          <a
            href={api.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-action text-[12px] inline-flex items-center gap-1"
          >
            GitHub <ExternalLink size={12} />
          </a>
        ) : null}
        <Link
          href={`/candidates?highlight=${ui.id}`}
          className="text-action text-[12px] inline-flex items-center gap-1"
        >
          Full profile <ExternalLink size={12} />
        </Link>
      </div>
    </DrawerShell>
  );
}