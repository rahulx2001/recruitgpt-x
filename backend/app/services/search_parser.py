"""Parse natural-language recruiter queries into structured filters."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Set


@dataclass
class ParsedSearchQuery:
    """Structured interpretation of a NL search string."""

    original: str
    semantic_query: str
    required_skills: List[str] = field(default_factory=list)
    excluded_skills: List[str] = field(default_factory=list)
    themes: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)


_SKILL_ALIASES = {
    "power bi": "Power BI",
    "powerbi": "Power BI",
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "sql": "SQL",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "tf": "TensorFlow",
    "aws": "AWS",
    "gcp": "Google Cloud",
    "azure": "Azure",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "python": "Python",
    "react": "React",
    "react native": "React Native",
    "reactnative": "React Native",
    "react.js": "React",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "java": "Java",
    "golang": "Go",
    "go": "Go",
    "rust": "Rust",
    "spark": "Apache Spark",
    "airflow": "Airflow",
    "kafka": "Kafka",
    "llm": "LLM",
    "nlp": "NLP",
    "cv": "Computer Vision",
    "computer vision": "Computer Vision",
    "data engineering": "Data Engineering",
    "data science": "Data Science",
}

_LOCATION_ALIASES = {
    "usa": "United States",
    "us": "United States",
    "united states": "United States",
    "america": "United States",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "london": "London",
    "india": "India",
    "bangalore": "Bangalore",
    "bengaluru": "Bangalore",
    "san francisco": "San Francisco",
    "sf": "San Francisco",
    "bay area": "San Francisco Bay Area",
    "new york": "New York",
    "nyc": "New York",
    "remote": "Remote",
    "europe": "Europe",
    "canada": "Canada",
    "singapore": "Singapore",
    "australia": "Australia",
}

_THEME_PATTERNS = [
    (r"\bstartup\b", "startup experience"),
    (r"\bscale[- ]?up\b", "scale-up experience"),
    (r"\bfintech\b", "FinTech"),
    (r"\bhealthcare\b", "healthcare"),
    (r"\bleader(?:ship)?\b", "leadership"),
    (r"\bfuture leader\b", "future leader"),
    (r"\bdistributed systems\b", "distributed systems"),
    (r"\bfast learner\b", "fast learner"),
    (r"\bopen source\b", "open source"),
    (r"\bproduction\b", "production systems"),
    (r"\bremote\b", "remote work"),
]


def _normalize_skill(token: str) -> str:
    key = token.strip().lower()
    return _SKILL_ALIASES.get(key, token.strip().title())


def _extract_clause_skills(clause: str) -> List[str]:
    """Pull skill tokens from a clause, splitting on commas and 'and'."""
    clause = re.sub(r"\b(and|or|but)\b", ",", clause, flags=re.I)
    parts = [p.strip() for p in clause.split(",") if p.strip()]
    skills: List[str] = []
    for part in parts:
        part = re.sub(
            r"^(strong in|good at|skilled in|expert in|experience with|with|developers? in)\s+",
            "",
            part,
            flags=re.I,
        )
        part = re.sub(
            r"^(no|without|lacking|weak in|missing)\s+",
            "",
            part,
            flags=re.I,
        )
        if part:
            skills.append(_normalize_skill(part))
    return skills


def _extract_locations(query_lower: str) -> List[str]:
    locations: List[str] = []
    for m in re.finditer(
        r"(?:in|from|based in|located in)\s+([a-z][a-z .\-]+?)(?:\s+with|\s+who|\s*$|,)",
        query_lower,
    ):
        token = m.group(1).strip()
        locations.append(_LOCATION_ALIASES.get(token, token.title()))
    for alias, canonical in sorted(_LOCATION_ALIASES.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{re.escape(alias)}\b", query_lower):
            locations.append(canonical)
    return locations


def parse_nl_query(query: str) -> ParsedSearchQuery:
    """Interpret queries like 'React Native developers in USA' or 'SQL strong but lacking Power BI'."""
    original = (query or "").strip()
    required: List[str] = []
    excluded: List[str] = []
    themes: List[str] = []
    locations = _extract_locations(original.lower())

    q_lower = original.lower()

    for pattern, theme in _THEME_PATTERNS:
        if re.search(pattern, q_lower):
            themes.append(theme)

    for m in re.finditer(
        r"(?:strong in|good at|skilled in|expert in|solid|proficient in)\s+([a-z0-9 .+/\-]+?)(?:\s+but|\s+and|\s*,|$)",
        q_lower,
        re.I,
    ):
        required.extend(_extract_clause_skills(m.group(1)))

    for m in re.finditer(
        r"(?:lacking|without|no|weak in|missing|not)\s+([a-z0-9 .+/\-]+?)(?:\s+but|\s+and|\s*,|$)",
        q_lower,
        re.I,
    ):
        excluded.extend(_extract_clause_skills(m.group(1)))

    # Multi-word skills first (longest alias match)
    if not required and not excluded:
        for alias, canonical in sorted(_SKILL_ALIASES.items(), key=lambda x: -len(x[0])):
            if re.search(rf"\b{re.escape(alias)}\b", q_lower):
                if re.search(
                    rf"(?:no|without|lacking|weak|missing|not)\s+{re.escape(alias)}",
                    q_lower,
                ):
                    excluded.append(canonical)
                else:
                    required.append(canonical)

    def _dedupe(items: List[str]) -> List[str]:
        seen: Set[str] = set()
        out: List[str] = []
        for item in items:
            key = item.lower()
            if key not in seen:
                seen.add(key)
                out.append(item)
        return out

    return ParsedSearchQuery(
        original=original,
        semantic_query=original,
        required_skills=_dedupe(required),
        excluded_skills=_dedupe(excluded),
        themes=_dedupe(themes),
        locations=_dedupe(locations),
    )


def candidate_skill_set(candidate) -> Set[str]:
    """Lowercase skill names from a candidate profile."""
    names = [s.name.lower() for s in (candidate.skills or [])]
    resume = (candidate.resume_text or "").lower()
    headline = (candidate.headline or "").lower()
    blob = " ".join(names) + " " + resume + " " + headline
    found: Set[str] = set(names)
    for alias, canonical in _SKILL_ALIASES.items():
        if alias in blob:
            found.add(canonical.lower())
    return found


def apply_structured_filters(
    similarity: float,
    candidate,
    parsed: ParsedSearchQuery,
) -> tuple[float, List[str]]:
    """Adjust vector similarity with explicit skill/theme/location filters."""
    skills = candidate_skill_set(candidate)
    matched: List[str] = []
    score = similarity

    for skill in parsed.required_skills:
        if skill.lower() in skills:
            score += 0.12
            matched.append(skill)

    for skill in parsed.excluded_skills:
        if skill.lower() in skills:
            score -= 0.25
        else:
            matched.append(f"no {skill}")

    blob = (
        (candidate.resume_text or "")
        + " "
        + (candidate.headline or "")
        + " "
        + (candidate.current_role or "")
        + " "
        + (candidate.location or "")
    ).lower()

    for theme in parsed.themes:
        if theme.split()[0] in blob or theme in blob:
            score += 0.08
            matched.append(theme)

    for loc in parsed.locations:
        if loc.lower() in blob or any(part in blob for part in loc.lower().split()):
            score += 0.1
            matched.append(loc)

    return round(min(1.0, max(-1.0, score)), 3), matched