"""Build temporal skill history from profile signals."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Iterable, List, Optional

from app.models.schemas import (
    CandidateProfile,
    Project,
    SkillHistoryEntry,
    SkillProficiency,
    WorkExperience,
)

_YEAR_RE = re.compile(r"\b(20\d{2})\b")


def _parse_year(value: Optional[str], fallback: int) -> int:
    if not value:
        return fallback
    m = _YEAR_RE.search(value)
    return int(m.group(1)) if m else fallback


def _dedupe(entries: Iterable[SkillHistoryEntry]) -> List[SkillHistoryEntry]:
    seen: set[tuple[str, int]] = set()
    out: List[SkillHistoryEntry] = []
    for e in sorted(entries, key=lambda x: (x.skill_name.lower(), x.year)):
        key = (e.skill_name.lower(), e.year)
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def build_skill_history(
    *,
    skills: List[SkillProficiency],
    experiences: List[WorkExperience],
    projects: List[Project],
    certifications: List[str],
    reference_year: Optional[int] = None,
) -> List[SkillHistoryEntry]:
    """Derive year-over-year skill adoption from experiences, projects, and certs."""
    now_year = reference_year or datetime.now(timezone.utc).year
    entries: List[SkillHistoryEntry] = []

    for skill in skills:
        adopt_year = max(2015, now_year - int(round(skill.years or 0)))
        entries.append(
            SkillHistoryEntry(
                skill_name=skill.name,
                year=adopt_year,
                proficiency=max(1, min(5, skill.proficiency - 1)),
                source="inferred",
                context="Estimated from total years of experience",
            )
        )
        if skill.years >= 2:
            entries.append(
                SkillHistoryEntry(
                    skill_name=skill.name,
                    year=min(now_year, adopt_year + max(1, int(skill.years // 2))),
                    proficiency=skill.proficiency,
                    source="inferred",
                    context="Mid-career proficiency milestone",
                )
            )

    for exp in experiences:
        year = _parse_year(exp.start_date, now_year - 3)
        blob = f"{exp.role} {exp.description or ''}".lower()
        for skill in skills:
            if skill.name.lower() in blob:
                entries.append(
                    SkillHistoryEntry(
                        skill_name=skill.name,
                        year=year,
                        proficiency=max(2, skill.proficiency - 1),
                        source="experience",
                        context=f"{exp.role} @ {exp.company}",
                    )
                )

    for proj in projects:
        year = now_year - 1
        for tech in proj.technologies or []:
            entries.append(
                SkillHistoryEntry(
                    skill_name=tech,
                    year=year,
                    proficiency=3,
                    source="project",
                    context=proj.name,
                )
            )

    for cert in certifications:
        years = [int(m.group(1)) for m in _YEAR_RE.finditer(cert)]
        year = years[-1] if years else now_year - 1
        skill_hint = cert.split("(")[0].split("-")[0].strip()
        if skill_hint:
            entries.append(
                SkillHistoryEntry(
                    skill_name=skill_hint[:80],
                    year=year,
                    proficiency=4,
                    source="certification",
                    context=cert,
                )
            )

    return _dedupe(entries)


def build_skill_history_from_profile(profile: CandidateProfile) -> List[SkillHistoryEntry]:
    if profile.skill_history:
        return profile.skill_history
    return build_skill_history(
        skills=profile.skills,
        experiences=profile.experiences,
        projects=profile.projects,
        certifications=profile.certifications,
    )


def skill_evolution_narrative(history: List[SkillHistoryEntry]) -> List[str]:
    """Convert temporal records into recruiter-facing evolution strings."""
    if not history:
        return []
    by_skill: dict[str, list[SkillHistoryEntry]] = {}
    for h in history:
        by_skill.setdefault(h.skill_name.lower(), []).append(h)

    lines: List[str] = []
    for _skill, events in sorted(by_skill.items(), key=lambda kv: kv[1][0].year):
        events = sorted(events, key=lambda e: e.year)
        if len(events) == 1:
            e = events[0]
            lines.append(
                f"{e.year}: adopted {e.skill_name} ({e.source}, prof {e.proficiency})"
            )
        else:
            first, last = events[0], events[-1]
            lines.append(
                f"{first.skill_name}: {first.year} (prof {first.proficiency}) → "
                f"{last.year} (prof {last.proficiency}) via {last.source}"
            )
    return lines[:8]