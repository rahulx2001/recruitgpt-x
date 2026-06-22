#!/usr/bin/env python3
"""Build hackathon approach PDF (submission deliverable)."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "RecruitGPT_X_Approach.pdf"

NAVY = colors.HexColor("#1E2761")
TEAL = colors.HexColor("#02C39A")
CHARCOAL = colors.HexColor("#36454F")


def _slide_story(title: str, bullets: list[str], styles) -> list:
    story = []
    story.append(Paragraph(title, styles["SlideTitle"]))
    story.append(Spacer(1, 0.15 * inch))
    for b in bullets:
        story.append(Paragraph(f"• {b}", styles["Bullet"]))
    story.append(Spacer(1, 0.35 * inch))
    return story


def build() -> Path:
    page = landscape((10 * inch, 5.625 * inch))
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=page,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.4 * inch,
    )

    base = getSampleStyleSheet()
    styles = {
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontSize=36,
            textColor=NAVY,
            spaceAfter=12,
        ),
        "CoverSub": ParagraphStyle(
            "CoverSub",
            parent=base["Normal"],
            fontSize=16,
            textColor=CHARCOAL,
            spaceAfter=8,
        ),
        "SlideTitle": ParagraphStyle(
            "SlideTitle",
            parent=base["Heading1"],
            fontSize=24,
            textColor=NAVY,
            spaceAfter=6,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=12,
            textColor=CHARCOAL,
            leading=16,
            leftIndent=12,
            spaceAfter=4,
        ),
        "Footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontSize=10,
            textColor=TEAL,
        ),
    }

    story = []
    story.append(Paragraph("RecruitGPT X", styles["CoverTitle"]))
    story.append(
        Paragraph(
            "Ranking candidates like a great recruiter — not a keyword filter",
            styles["CoverSub"],
        )
    )
    story.append(
        Paragraph(
            "India Runs Data &amp; AI Challenge · Redrob Senior AI Engineer",
            styles["Footer"],
        )
    )
    story.append(Spacer(1, 0.4 * inch))

    slides = [
        (
            "The Problem",
            [
                "Recruiters review hundreds of profiles but keyword filters miss real fit.",
                "Honeypot profiles stuff AI skills into unrelated titles (HR Manager, Accountant).",
                "Behavioral signals — response rate, GitHub, recruiter saves — are ignored by ATS.",
            ],
        ),
        (
            "What the Role Needs",
            [
                "Parsed job_description.docx into jd_config.py: embeddings, retrieval, ranking, vector DBs.",
                "5–9 years experience, India location, production deployment language.",
                "Redrob behavioral modifier from redrob_signals_doc.",
            ],
        ),
        (
            "Hybrid Offline Ranker",
            [
                "Weighted: title 32%, skills 28%, production 18%, experience 12%, location 10%.",
                "Modifiers: consulting-only penalty, behavioral boost (capped), honeypot trap.",
                "CPU-only, no network — 100K candidates in ~7 seconds.",
            ],
        ),
        (
            "Honeypot Defense",
            [
                "Weak titles capped; noise skills (HTML, Tailwind) penalized.",
                "Unrelated title + inflated AI skills → 0.25× demotion.",
                "Zero honeypot titles in our top-100 shortlist.",
            ],
        ),
        (
            "Results",
            [
                "#1 CAND_0002025 — Senior AI Engineer, 7 core IR skills, 0.80 response rate.",
                "#2 CAND_0071974 — Senior AI Engineer, 8 core IR skills.",
                "Reproduce: python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv",
            ],
        ),
        (
            "Live Platform (RecruitGPT X)",
            [
                "Next.js + FastAPI + LangGraph 7-agent pipeline for interactive recruiting.",
                "Semantic matching, explainability, bias audit, Candidate Radar, skill evolution.",
                "Same philosophy as offline ranker: understand fit, explain every rank.",
            ],
        ),
    ]

    for title, bullets in slides:
        story.extend(_slide_story(title, bullets, styles))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story)
    return OUT


if __name__ == "__main__":
    print(f"Wrote {build()}")