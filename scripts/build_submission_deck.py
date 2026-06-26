#!/usr/bin/env python3
"""Build Redrob Idea Submission deck (11 slides) for team Schadn."""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_PPTX = ROOT / "docs" / "Schadn_Redrob_Submission.pptx"

# Teal Trust palette
NAVY = RGBColor(0x06, 0x5A, 0x82)
TEAL = RGBColor(0x02, 0x80, 0x90)
MINT = RGBColor(0x02, 0xC3, 0x9A)
SLATE = RGBColor(0x36, 0x45, 0x4F)
INK = RGBColor(0x21, 0x21, 0x21)
MUTED = RGBColor(0x5A, 0x5A, 0x5A)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT = RGBColor(0xF4, 0xF7, 0xFA)
ACCENT_BG = RGBColor(0xE8, 0xF4, 0xF8)


def _blank_slide(prs: Presentation):
    layout = prs.slide_layouts[6]  # blank
    return prs.slides.add_slide(layout)


def _rect(slide, left, top, width, height, fill: RGBColor):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    return shape


def _textbox(slide, left, top, width, height, text, *, size=14, bold=False, color=INK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    return box


def _bullets(slide, left, top, width, height, title, items, *, title_size=20, body_size=13, title_color=NAVY):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(title_size)
    p.font.bold = True
    p.font.color.rgb = title_color
    p.space_after = Pt(10)
    for item in items:
        bp = tf.add_paragraph()
        bp.text = item
        bp.level = 0
        bp.font.size = Pt(body_size)
        bp.font.color.rgb = INK
        bp.space_after = Pt(6)
    return box


def _header_bar(slide, title: str, subtitle: str = ""):
    _rect(slide, Inches(0), Inches(0), Inches(10), Inches(0.95), NAVY)
    _textbox(slide, Inches(0.55), Inches(0.18), Inches(8.8), Inches(0.45), title, size=26, bold=True, color=WHITE)
    if subtitle:
        _textbox(slide, Inches(0.55), Inches(0.58), Inches(8.8), Inches(0.3), subtitle, size=11, color=RGBColor(0xCA, 0xDC, 0xFC))


def slide_cover(prs: Presentation):
    slide = _blank_slide(prs)
    _rect(slide, Inches(0), Inches(0), Inches(10), Inches(5.625), NAVY)
    _rect(slide, Inches(0), Inches(4.55), Inches(10), Inches(1.075), TEAL)
    _textbox(slide, Inches(0.7), Inches(0.9), Inches(8.6), Inches(0.5), "INDIA RUNS · DATA & AI CHALLENGE", size=14, color=MINT)
    _textbox(slide, Inches(0.7), Inches(1.45), Inches(8.6), Inches(1.0), "Intelligent Candidate Discovery\n& Ranking", size=36, bold=True, color=WHITE)
    _textbox(slide, Inches(0.7), Inches(2.65), Inches(8.6), Inches(0.5), "Hybrid offline ranker — semantic fit, trap-aware, production-scale", size=15, color=RGBColor(0xCA, 0xDC, 0xFC))
    _rect(slide, Inches(0.7), Inches(3.35), Inches(8.6), Inches(0.95), RGBColor(0x04, 0x6B, 0x8A))
    _textbox(slide, Inches(0.95), Inches(3.5), Inches(3.8), Inches(0.7),
             "Team Name\nSchadn", size=14, bold=True, color=WHITE)
    _textbox(slide, Inches(4.2), Inches(3.5), Inches(4.8), Inches(0.7),
             "Team Leader\nRahul Kumar Singh", size=14, bold=True, color=WHITE)
    _textbox(slide, Inches(0.7), Inches(4.72), Inches(8.6), Inches(0.45),
             "Problem Statement: Build an AI system that ranks 100K candidates the way a recruiter would —\n"
             "understanding role fit from career context, skills, and behavioral signals, not keyword matching.",
             size=11, color=WHITE)


def slide_solution(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Solution Overview", "What we built and why it beats keyword ATS")
    _rect(slide, Inches(0.55), Inches(1.15), Inches(4.35), Inches(4.1), LIGHT)
    _bullets(slide, Inches(0.75), Inches(1.3), Inches(4.0), Inches(3.8), "Proposed Solution", [
        "RecruitGPT X offline ranker: scores 100,000 candidates on CPU in ~49–60 seconds.",
        "Acts as an AI recruiter — reads title, career narrative, IR skills, availability, and engagement.",
        "Outputs a top-100 shortlist with calibrated scores and 2-sentence grounded reasoning per row.",
        "Pre-computed MiniLM bi-encoder + hybrid heuristics — no LLM calls at rank time.",
    ])
    _rect(slide, Inches(5.1), Inches(1.15), Inches(4.35), Inches(4.1), ACCENT_BG)
    _bullets(slide, Inches(5.3), Inches(1.3), Inches(4.0), Inches(3.8), "Differentiation vs Traditional ATS", [
        "Keyword ATS: string match → misses semantic fit, ranks honeypot profiles high.",
        "Our ranker: career semantics + structural honeypot traps + template-blurb dedup.",
        "Availability gate: not open-to-work cannot reach top-10.",
        "Explainable: every rank cites real profile facts — no hallucinated employers or skills.",
        "Production constraint: CPU-only, offline — scales to 200K+ without per-candidate API cost.",
    ])


def slide_jd(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "JD Understanding & Candidate Signals", "Parsed from job_description.docx → jd_config.py")
    _bullets(slide, Inches(0.55), Inches(1.15), Inches(4.5), Inches(4.2), "Key JD Requirements", [
        "Role: Senior AI Engineer — retrieval, ranking, embeddings, vector DBs in production.",
        "Experience: 5–9 years ideal; penalize thin tenure and over-senior outliers.",
        "Location: India-based; Pune/Noida preferred in scoring.",
        "Production language: shipped systems, not research-only or framework demos.",
        "Behavioral modifier from redrob_signals_doc: response rate, recruiter saves, engagement.",
    ])
    _bullets(slide, Inches(5.2), Inches(1.15), Inches(4.3), Inches(4.2), "Candidate Signals We Evaluate", [
        "Title alignment: Rec Sys Engineer, Search Engineer, Senior ML/NLP Engineer.",
        "Core IR skills: FAISS, Pinecone, Elasticsearch, OpenSearch, Weaviate, retrieval pipelines.",
        "Career semantic text: production stories in role descriptions (not keyword stuffing).",
        "Skill trust: endorsements, months-used, verified badges — noise skills penalized.",
        "Availability: open_to_work, notice period (≤30d boosted, 90–120d penalized).",
        "Engagement: profile views, recruiter saves, interview completion rate.",
        "Trap signals: weak title + inflated AI skills, impossible tenure, recycled blurbs.",
    ])


def slide_methodology(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Ranking Methodology", "Hybrid v6 scorer — retrieve, score, rank, explain")
    _bullets(slide, Inches(0.55), Inches(1.1), Inches(4.4), Inches(2.0), "Pipeline Steps", [
        "1. Load candidates.jsonl → build CandidateIndex (title, skills, career, signals).",
        "2. Score each candidate with weighted hybrid components + modifiers.",
        "3. Apply honeypot penalty, availability gate, notice modifier, blurb dedup.",
        "4. Calibrate raw scores → sort descending → assign ranks 1–100.",
        "5. Generate grounded 2-sentence reasoning from score components (no LLM).",
    ], body_size=12)
    _rect(slide, Inches(0.55), Inches(3.2), Inches(4.4), Inches(2.0), LIGHT)
    _bullets(slide, Inches(0.7), Inches(3.35), Inches(4.1), Inches(1.8), "Models & Algorithms", [
        "Bi-encoder: all-MiniLM-L6-v2 (committed embeddings.fp16.npz, 100K vectors).",
        "TF-IDF JD overlap for lexical alignment with parsed JD.",
        "Heuristic modifiers: consulting penalty, research-only cap, FAANG-current note.",
        "Cross-encoder: OFF (RANKER_USE_CROSS_ENCODER=0) for reproducibility.",
    ], title_size=16, body_size=11)
    _rect(slide, Inches(5.1), Inches(1.1), Inches(4.35), Inches(4.1), ACCENT_BG)
    _textbox(slide, Inches(5.3), Inches(1.25), Inches(4.0), Inches(0.35), "v6 Signal Weights (DEFAULT_WEIGHTS)", size=16, bold=True, color=NAVY)
    weights = [
        ("Title alignment", "20%"),
        ("Core IR skills", "18%"),
        ("Career semantic", "14%"),
        ("Production pedigree", "12%"),
        ("Availability", "12%"),
        ("Redrob assessments", "8%"),
        ("JD TF-IDF overlap", "6%"),
        ("Experience band", "5%"),
        ("Engagement signals", "5%"),
        ("Location fit", "3%"),
    ]
    y = 1.65
    for label, pct in weights:
        _textbox(slide, Inches(5.35), Inches(y), Inches(2.8), Inches(0.22), label, size=11, color=INK)
        _textbox(slide, Inches(8.2), Inches(y), Inches(0.9), Inches(0.22), pct, size=11, bold=True, color=TEAL, align=PP_ALIGN.RIGHT)
        _rect(slide, Inches(5.35), Inches(y + 0.2), Inches(3.75), Inches(0.06), RGBColor(0xD0, 0xE8, 0xEE))
        bar_w = float(pct.strip("%")) / 20.0 * 3.75
        if bar_w > 0:
            _rect(slide, Inches(5.35), Inches(y + 0.2), Inches(bar_w), Inches(0.06), TEAL)
        y += 0.36


def slide_explainability(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Explainability & Data Validation", "Grounded reasoning + trap defense")
    _bullets(slide, Inches(0.55), Inches(1.15), Inches(4.4), Inches(4.0), "How Rankings Are Explained", [
        "reasoning column: 2 sentences per candidate in submission.csv.",
        "Sentence 1: specific facts — title, employer, years, location, named IR skills.",
        "Sentence 2: JD connection + honest concerns (notice period, thin IR depth, big-tech risk).",
        "Built from score components — never from an LLM → no hallucinated skills or employers.",
        "Stage 4 mock review: 10/10 sampled rows pass all 6 quality checks.",
        "100% unique reasoning strings; no empty or copy-paste templates.",
    ], body_size=12)
    _bullets(slide, Inches(5.1), Inches(1.15), Inches(4.35), Inches(4.0), "Handling Bad or Suspicious Profiles", [
        "Structural honeypots: impossible tenure vs company founding date, expert skills at 0 months.",
        "Title-skill mismatch: HR Manager / Accountant with inflated AI skill lists → heavy demotion.",
        "Template-blurb penalty: recycled career descriptions shared across thousands of profiles.",
        "Noise skills penalized: HTML, Tailwind, generic frameworks without IR depth.",
        "Availability hard gate: open_to_work=false capped out of top-10.",
        "Result: 0 structural honeypots in our top-100 submission (0% vs 10% disqualify threshold).",
    ], body_size=12)


def slide_workflow(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "End-to-End Workflow", "JD input → ranked CSV output")
    steps = [
        ("1", "JD Parse", "job_description.docx\n→ jd_config.py + jd_embedding"),
        ("2", "Index", "candidates.jsonl (100K)\n→ CandidateIndex"),
        ("3", "Embed", "Precomputed MiniLM\nembeddings.fp16.npz"),
        ("4", "Score", "Hybrid v6 + modifiers\nper candidate"),
        ("5", "Rank", "Sort + tie-break\n(candidate_id asc)"),
        ("6", "Export", "submission.csv\ntop-100 + reasoning"),
    ]
    x = 0.45
    for num, title, body in steps:
        _rect(slide, Inches(x), Inches(1.35), Inches(1.45), Inches(2.6), LIGHT)
        _rect(slide, Inches(x), Inches(1.35), Inches(1.45), Inches(0.55), TEAL)
        _textbox(slide, Inches(x), Inches(1.42), Inches(1.45), Inches(0.4), f"Step {num}", size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        _textbox(slide, Inches(x + 0.1), Inches(2.0), Inches(1.25), Inches(0.4), title, size=13, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
        _textbox(slide, Inches(x + 0.08), Inches(2.45), Inches(1.3), Inches(1.3), body, size=10, color=MUTED, align=PP_ALIGN.CENTER)
        if x < 8.0:
            _textbox(slide, Inches(x + 1.48), Inches(2.35), Inches(0.25), Inches(0.3), "→", size=18, bold=True, color=TEAL, align=PP_ALIGN.CENTER)
        x += 1.58
    _rect(slide, Inches(0.55), Inches(4.35), Inches(8.9), Inches(0.85), ACCENT_BG)
    _textbox(slide, Inches(0.75), Inches(4.5), Inches(8.5), Inches(0.6),
             "Reproduce: ./scripts/reproduce_ranking.sh  ·  python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv\n"
             "Byte-verified: scripts/verify_submission_artifact.py confirms submission.csv matches fresh rank.py output.",
             size=11, color=INK)


def slide_architecture(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "System Architecture", "Submission ranker (graded) vs demo platform (optional)")
    _rect(slide, Inches(0.55), Inches(1.15), Inches(8.9), Inches(2.35), LIGHT)
    _textbox(slide, Inches(0.75), Inches(1.25), Inches(8.5), Inches(0.3), "GRADED PATH — produces submission.csv", size=14, bold=True, color=NAVY)
    layers = [
        ("rank.py", 0.75),
        ("redrob_ranker.py", 2.1),
        ("features.py", 3.85),
        ("embeddings.py", 5.35),
        ("honeypot.py", 6.7),
        ("availability.py", 7.95),
    ]
    for name, x in layers:
        _rect(slide, Inches(x), Inches(1.75), Inches(1.15), Inches(0.55), TEAL)
        _textbox(slide, Inches(x), Inches(1.85), Inches(1.15), Inches(0.4), name, size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    _textbox(slide, Inches(0.75), Inches(2.45), Inches(8.5), Inches(0.9),
             "+ career_blurb.py (template dedup)  ·  assessment.py (IR skill tests)  ·  rerank.py (CE off)\n"
             "Input: candidates.jsonl + embeddings.fp16.npz  →  Output: submission.csv (100 rows)",
             size=10, color=MUTED)
    _rect(slide, Inches(0.55), Inches(3.7), Inches(8.9), Inches(1.55), ACCENT_BG)
    _textbox(slide, Inches(0.75), Inches(3.82), Inches(8.5), Inches(0.3), "DEMO PATH — recruiter UI (not graded)", size=14, bold=True, color=NAVY)
    _textbox(slide, Inches(0.75), Inches(4.2), Inches(8.5), Inches(0.9),
             "frontend/ (Next.js 14)  →  backend/ (FastAPI + LangGraph 7-agent pipeline)  →  explainability, chat, analytics\n"
             "Uses top-100 import from submission.csv for dashboard — does NOT produce the graded artifact.",
             size=11, color=INK)


def slide_results(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Results & Performance", "Top picks, validation, compute compliance")
    tops = [
        ("#1", "CAND_0002025", "0.9900", "Senior AI Engineer @ Apple"),
        ("#2", "CAND_0046064", "0.9324", "Senior NLP Engineer @ Salesforce"),
        ("#3", "CAND_0010685", "0.8659", "NLP Engineer @ Rephrase.ai"),
        ("#4", "CAND_0055905", "0.8510", "Sr ML Engineer @ Flipkart"),
        ("#5", "CAND_0018499", "0.8041", "Sr ML Engineer @ Zomato"),
    ]
    _rect(slide, Inches(0.55), Inches(1.15), Inches(4.5), Inches(2.5), LIGHT)
    _textbox(slide, Inches(0.75), Inches(1.25), Inches(4.2), Inches(0.3), "Top-5 Ranked Candidates", size=15, bold=True, color=NAVY)
    y = 1.6
    for rank, cid, score, role in tops:
        _textbox(slide, Inches(0.75), Inches(y), Inches(0.45), Inches(0.25), rank, size=11, bold=True, color=TEAL)
        _textbox(slide, Inches(1.15), Inches(y), Inches(3.8), Inches(0.25), f"{cid}  ·  {score}  ·  {role}", size=10, color=INK)
        y += 0.38
    _bullets(slide, Inches(5.1), Inches(1.15), Inches(4.35), Inches(2.5), "Validation Results", [
        "100 rows · ranks 1–100 unique · scores monotonic · 0 honeypots.",
        "All 100 candidate_ids verified in official candidates.jsonl.",
        "Byte-reproducible artifact (verify_submission_artifact.py: PASS).",
        "Reasoning: 100% unique, Stage 4 mock 10/10 rows pass.",
    ], body_size=11)
    _rect(slide, Inches(0.55), Inches(3.85), Inches(8.9), Inches(1.35), ACCENT_BG)
    _textbox(slide, Inches(0.75), Inches(3.95), Inches(2.8), Inches(0.55), "~49–60s", size=28, bold=True, color=NAVY)
    _textbox(slide, Inches(0.75), Inches(4.5), Inches(2.8), Inches(0.3), "on 100K candidates", size=11, color=MUTED)
    _textbox(slide, Inches(3.5), Inches(3.95), Inches(2.5), Inches(0.55), "CPU only", size=28, bold=True, color=TEAL)
    _textbox(slide, Inches(3.5), Inches(4.5), Inches(2.5), Inches(0.3), "no GPU · no network", size=11, color=MUTED)
    _textbox(slide, Inches(6.2), Inches(3.95), Inches(2.5), Inches(0.55), "16 GB", size=28, bold=True, color=NAVY)
    _textbox(slide, Inches(6.2), Inches(4.5), Inches(2.5), Inches(0.3), "RAM limit met", size=11, color=MUTED)
    _textbox(slide, Inches(0.75), Inches(4.85), Inches(8.5), Inches(0.35),
             "Well under 5-minute wall-clock limit · embeddings bundle ~68MB fp16 · Docker reproduction supported",
             size=10, color=MUTED)


def slide_tech(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Technologies Used", "Chosen for reproducibility, scale, and spec compliance")
    _bullets(slide, Inches(0.55), Inches(1.15), Inches(4.4), Inches(4.0), "Submission Ranker (Graded)", [
        "Python 3.11 · NumPy · PyYAML — minimal deps, no torch at rank time.",
        "all-MiniLM-L6-v2 bi-encoder — precomputed, committed as embeddings.fp16.npz.",
        "TF-IDF + lexical matchers for JD overlap and skill phrase detection.",
        "Docker: docker-compose.ranker.yml for Stage 3 sandbox reproduction.",
        "pytest: challenge/test_ranker.py (31 tests passing).",
        "AI dev tools: Cursor + Grok (architecture/review only — no candidate data to LLMs).",
    ], body_size=11)
    _bullets(slide, Inches(5.1), Inches(1.15), Inches(4.35), Inches(4.0), "Demo Platform (Optional)", [
        "Next.js 14 + Tailwind — recruiter dashboard, analytics, candidate actions.",
        "FastAPI + LangGraph — 7-agent pipeline for interactive ranking explanations.",
        "PostgreSQL / SQLite — workspace data; top-100 import from submission.csv.",
        "HuggingFace Spaces — sandbox for sample ranking (≤100 candidates).",
        "Vercel + Render — live product demo at recruitgpt-x.vercel.app.",
    ], body_size=11)


def slide_assets(prs: Presentation):
    slide = _blank_slide(prs)
    _header_bar(slide, "Submission Assets", "Everything judges need to reproduce and review")
    assets = [
        ("GitHub Repository", "https://github.com/rahulx2001/recruitgpt-x", "Full source + README + reproduce script"),
        ("Ranked CSV", "submission.csv (top-100)", "candidate_id, rank, score, reasoning"),
        ("HF Sandbox", "huggingface.co/spaces/rahulsinghx2001/recruitgpt-ranker", "Sample ranking on ≤100 candidates, CPU"),
        ("Live Demo", "recruitgpt-x.vercel.app", "Recruiter UI — dashboard, analytics, AI chat"),
        ("Reproduce", "./scripts/reproduce_ranking.sh", "Single command → byte-verified submission.csv"),
        ("Metadata", "submission_metadata.yaml", "Team Schadn · Rahul Kumar Singh · compute + AI declaration"),
    ]
    y = 1.2
    for title, url, note in assets:
        _rect(slide, Inches(0.55), Inches(y), Inches(8.9), Inches(0.62), LIGHT if y % 1.2 < 0.7 else ACCENT_BG)
        _textbox(slide, Inches(0.75), Inches(y + 0.06), Inches(2.2), Inches(0.25), title, size=12, bold=True, color=NAVY)
        _textbox(slide, Inches(2.95), Inches(y + 0.06), Inches(4.5), Inches(0.25), url, size=10, color=TEAL)
        _textbox(slide, Inches(0.75), Inches(y + 0.3), Inches(8.3), Inches(0.25), note, size=9, color=MUTED)
        y += 0.68
    _textbox(slide, Inches(0.55), Inches(5.15), Inches(8.9), Inches(0.35),
             "Contact: rahulsinghx2001@gmail.com · +91-8539816642 · Team Schadn · Rahul Kumar Singh",
             size=10, color=MUTED, align=PP_ALIGN.CENTER)


def slide_closing(prs: Presentation):
    slide = _blank_slide(prs)
    _rect(slide, Inches(0), Inches(0), Inches(10), Inches(5.625), NAVY)
    _textbox(slide, Inches(0.7), Inches(1.8), Inches(8.6), Inches(0.8), "Thank You", size=40, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    _textbox(slide, Inches(0.7), Inches(2.8), Inches(8.6), Inches(0.5),
             "Schadn · Rahul Kumar Singh\nRecruitGPT X — Ranking candidates like a great recruiter, not a keyword filter.",
             size=16, color=RGBColor(0xCA, 0xDC, 0xFC), align=PP_ALIGN.CENTER)
    _textbox(slide, Inches(0.7), Inches(3.8), Inches(8.6), Inches(0.4),
             "github.com/rahulx2001/recruitgpt-x",
             size=13, color=MINT, align=PP_ALIGN.CENTER)


def main():
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(5.625)

    slide_cover(prs)
    slide_solution(prs)
    slide_jd(prs)
    slide_methodology(prs)
    slide_explainability(prs)
    slide_workflow(prs)
    slide_architecture(prs)
    slide_results(prs)
    slide_tech(prs)
    slide_assets(prs)
    slide_closing(prs)

    OUT_PPTX.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUT_PPTX))
    print(f"Wrote {OUT_PPTX} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    main()