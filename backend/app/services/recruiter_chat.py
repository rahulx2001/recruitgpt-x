"""Data-grounded recruiter chat — answers from live rankings when LLM is unavailable."""

from __future__ import annotations

import re
from typing import List

from app.models.schemas import HiringBlueprint, RankedCandidate


def _fmt_candidate(rc: RankedCandidate, *, detail: bool = True) -> str:
    s = rc.sub_scores
    head = (
        f"#{rc.rank} {rc.candidate_name} "
        f"(hireability {rc.hireability_score:.2f}, "
        f"skill {s.skill_match:.0%}, semantic {s.semantic:.0%}, "
        f"growth {s.career_growth:.0%})"
    )
    if not detail:
        return head
    summary = (rc.explanation.summary or "").strip()
    if summary:
        return f"{head}. {summary}"
    return head


def _compare_pair(a: RankedCandidate, b: RankedCandidate) -> str:
    higher, lower = (a, b) if a.rank < b.rank else (b, a)
    sa, sb = higher.sub_scores, lower.sub_scores
    reasons: list[str] = []
    if sa.skill_match > sb.skill_match:
        reasons.append(
            f"stronger skill match ({sa.skill_match:.0%} vs {sb.skill_match:.0%})"
        )
    if sa.semantic > sb.semantic:
        reasons.append(
            f"better semantic fit ({sa.semantic:.0%} vs {sb.semantic:.0%})"
        )
    if sa.career_growth > sb.career_growth:
        reasons.append(
            f"faster career trajectory ({sa.career_growth:.0%} vs {sb.career_growth:.0%})"
        )
    if sa.behavioral > sb.behavioral:
        reasons.append(
            f"richer behavioral signals ({sa.behavioral:.0%} vs {sb.behavioral:.0%})"
        )
    if not reasons:
        reasons.append(
            f"higher composite score ({higher.hireability_score:.2f} vs "
            f"{lower.hireability_score:.2f})"
        )
    return (
        f"{higher.candidate_name} ranks #{higher.rank} vs {lower.candidate_name} "
        f"at #{lower.rank}. The pipeline favors {higher.candidate_name} because of "
        f"{', '.join(reasons)}."
    )


def _extract_top_n(message: str, default: int = 3) -> int:
    m = re.search(r"top\s+(\d+)", message, re.I)
    if m:
        return max(1, min(10, int(m.group(1))))
    if "top three" in message.lower():
        return 3
    return default


def _mentioned(
    message: str, ranked: List[RankedCandidate]
) -> List[RankedCandidate]:
    msg = message.lower()
    found: list[RankedCandidate] = []
    seen: set = set()
    for rc in ranked:
        full = rc.candidate_name.lower()
        tokens = [full, full.split()[0]] if full else []
        if any(t and len(t) > 2 and t in msg for t in tokens):
            if rc.candidate_id not in seen:
                seen.add(rc.candidate_id)
                found.append(rc)
    return found


def data_grounded_chat_response(
    blueprint: HiringBlueprint,
    ranked: List[RankedCandidate],
    message: str,
) -> str:
    """Produce a recruiter-style answer using only ranked candidate evidence."""
    if not ranked:
        return (
            "No ranked candidates are loaded for this job yet. "
            "Run ranking from the job page first."
        )

    msg = message.lower().strip()
    mentioned = _mentioned(message, ranked)

    if len(mentioned) >= 2:
        return _compare_pair(mentioned[0], mentioned[1])

    if len(mentioned) == 1:
        rc = mentioned[0]
        strengths = rc.explanation.strengths[:3]
        strength_txt = (
            "; ".join(strengths)
            if strengths
            else _fmt_candidate(rc, detail=False)
        )
        return (
            f"{rc.candidate_name} is ranked #{rc.rank} with hireability "
            f"{rc.hireability_score:.2f}. {strength_txt}"
        )

    if re.search(r"rank\s*#?\s*1|#\s*1\b|first\s+rank|rank\s+one", msg):
        rc = ranked[0]
        strengths = rc.explanation.strengths[:4]
        bullets = (
            "\n".join(f"• {s}" for s in strengths)
            if strengths
            else f"• {_fmt_candidate(rc)}"
        )
        return (
            f"Rank #1 is {rc.candidate_name} (score {rc.hireability_score:.2f}) "
            f"for this {blueprint.seniority} {blueprint.industry} role.\n"
            f"Key strengths:\n{bullets}"
        )

    if any(
        k in msg
        for k in (
            "top ",
            "top 3",
            "top three",
            "who are the best",
            "best candidates",
            "shortlist",
        )
    ):
        n = _extract_top_n(message)
        picks = ranked[:n]
        lines = [_fmt_candidate(rc) for rc in picks]
        return (
            f"Top {len(picks)} candidates in your pool of {len(ranked)} ranked profiles:\n"
            + "\n".join(f"{i + 1}. {line}" for i, line in enumerate(lines))
        )

    if any(
        k in msg
        for k in (
            "advance",
            "interview",
            "screen",
            "screened",
            "move forward",
            "who should we",
            "recommend",
        )
    ):
        # Advance top band with strong skill + semantic signals
        picks = []
        for rc in ranked[:15]:
            s = rc.sub_scores
            if s.skill_match >= 0.55 and s.semantic >= 0.5:
                picks.append(rc)
            if len(picks) >= 5:
                break
        if not picks:
            picks = ranked[:3]
        names = ", ".join(rc.candidate_name for rc in picks[:5])
        detail = "\n".join(
            f"• {rc.candidate_name} (#{rc.rank}): "
            f"{(rc.explanation.summary or _fmt_candidate(rc, detail=False))[:160]}"
            for rc in picks[:5]
        )
        return (
            f"For this {blueprint.seniority} role, I'd advance {names} to the "
            f"next interview stage based on skill match, semantic JD fit, and "
            f"career growth signals:\n{detail}"
        )

    if any(k in msg for k in ("trajectory", "growth", "career path", "promotion")):
        best = max(ranked[:20], key=lambda r: r.sub_scores.career_growth)
        return (
            f"{best.candidate_name} shows the strongest career trajectory in the "
            f"top 20 (growth score {best.sub_scores.career_growth:.0%}, "
            f"rank #{best.rank}). {_fmt_candidate(best)}"
        )

    if any(k in msg for k in ("hidden gem", "sleeper", "underrated", "non-iit")):
        # Mid-band high semantic, not top 3
        pool = [r for r in ranked[3:25] if r.sub_scores.semantic >= 0.55]
        if not pool:
            pool = ranked[3:6]
        gem = max(pool, key=lambda r: r.sub_scores.semantic)
        return (
            f"Hidden gem: {gem.candidate_name} at rank #{gem.rank} — "
            f"semantic fit {gem.sub_scores.semantic:.0%} with strong JD alignment "
            f"despite not being in the top 3. {gem.explanation.summary or ''}"
        ).strip()

    if "compare" in msg and "top" in msg:
        return "\n".join(
            _fmt_candidate(rc) for rc in ranked[:3]
        )

    # Default: summarize top 5 with varied framing from question hash
    top5 = ranked[:5]
    lead = top5[0]
    others = ", ".join(rc.candidate_name for rc in top5[1:4])
    return (
        f"For your question about this {blueprint.seniority} shortlist: "
        f"{lead.candidate_name} leads at #{lead.rank} "
        f"(score {lead.hireability_score:.2f}). "
        f"Next strongest: {others}. "
        f"Ask me to compare two people by name, explain rank #1, or who to advance."
    )