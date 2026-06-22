#!/usr/bin/env python3
"""Build hand-curated relevance labels for sample_candidates.json (Stage-5 eval)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.honeypot import is_structural_honeypot
from challenge.jd_config import STRONG_TITLES, WEAK_TITLES
from challenge.text_match import norm_text

# Tier 0 = reject, 4 = ideal founding-team IR fit (human JD judgment on sample set)


def _tier_for(raw: dict) -> tuple[int, str]:
    cid = raw["candidate_id"]
    profile = raw.get("profile", {})
    title = norm_text(profile.get("current_title", ""))
    summary = norm_text(profile.get("summary", ""))
    history = raw.get("career_history", [])
    career = norm_text(" ".join(h.get("description", "") for h in history))

    if is_structural_honeypot(raw):
        return 0, "structural honeypot / impossible profile"

    if any(w in title for w in WEAK_TITLES):
        return 0, "non-ML weak title (JD disqualifier)"

    ir_career = any(
        k in career
        for k in (
            "retrieval",
            "ranking",
            "recommendation",
            "embedding",
            "vector search",
            "semantic search",
            "learning to rank",
            "hybrid search",
        )
    )
    strong_title = any(s in title for s in STRONG_TITLES) or "recommendation" in title

    if strong_title and ir_career and "production" in career:
        return 4, "strong IR title + shipped retrieval/ranking narrative"
    if strong_title and ir_career:
        return 3, "strong IR alignment, lighter production proof"
    if ir_career and ("engineer" in title or "scientist" in title):
        return 2, "partial IR career signal"
    if "machine learning" in summary or "data pipeline" in career:
        return 1, "adjacent ML/data, weak IR depth"
    return 0, f"low JD fit ({cid})"


def main() -> int:
    sample = ROOT / "data" / "sample_candidates.json"
    out = ROOT / "data" / "hand_labels.json"
    rows = json.loads(sample.read_text(encoding="utf-8"))
    labels = {}
    for raw in rows:
        tier, why = _tier_for(raw)
        labels[raw["candidate_id"]] = {
            "tier": tier,
            "relevance": round(tier / 4.0, 2),
            "rationale": why,
            "labeler": "team_lead_manual_rubric_v1",
        }
    out.write_text(json.dumps(labels, indent=2), encoding="utf-8")
    dist = {}
    for v in labels.values():
        dist[v["tier"]] = dist.get(v["tier"], 0) + 1
    print(f"Wrote {len(labels)} hand labels → {out}")
    print("tier distribution:", dict(sorted(dist.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())