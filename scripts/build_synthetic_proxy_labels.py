#!/usr/bin/env python3
"""Build rule-based synthetic relevance labels for offline eval (≥200 candidates).

DISCLAIMER: This dataset is automatically generated and is NOT human-labeled ground truth.
Labels use heuristic JD-tier rules that overlap ranker feature families — diagnostics only.

Intentionally excludes submission.csv top-100 to avoid circular self-grading.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.honeypot import is_structural_honeypot
from challenge.jd_config import STRONG_TITLES, WEAK_TITLES
from challenge.redrob_ranker import load_candidates
from challenge.text_match import norm_text

LABELER_RULE_BASED = "rule_based_proxy_v1"
LABELER_HEURISTIC = "heuristic_relevance_proxy_v1"
LABEL_METHOD = "synthetic_proxy_labels_v1"
PROVENANCE_DISCLAIMER = (
    "This dataset is automatically generated and is not human-labeled ground truth."
)

# Tier 0 = reject, 4 = ideal founding-team IR fit (heuristic JD rules)
STRATIFIED_EXTRA = 200  # pool sample (no submission top-100 — avoids self-grading)
STRATIFIED_MOD = 137


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


def _stratified_pool_labels(jsonl: Path, seen: set[str], target: int) -> dict[str, dict]:
    """Deterministic hash-stratified sample from full pool."""
    out: dict[str, dict] = {}
    if not jsonl.exists() or target <= 0:
        return out
    for raw in load_candidates(jsonl):
        cid = raw.get("candidate_id", "")
        if not cid or cid in seen:
            continue
        h = int(hashlib.sha256(cid.encode()).hexdigest()[:8], 16)
        if h % STRATIFIED_MOD != 0:
            continue
        tier, why = _tier_for(raw)
        out[cid] = {
            "tier": tier,
            "relevance": round(tier / 4.0, 2),
            "rationale": why,
            "labeler": LABELER_RULE_BASED,
            "source": "stratified_pool_hash",
        }
        seen.add(cid)
        if len(out) >= target:
            break
    return out


def main() -> int:
    from challenge.data_paths import challenge_file

    sample = challenge_file("sample_candidates.json")
    jsonl = challenge_file("candidates.jsonl")
    out = ROOT / "data" / "synthetic_proxy_labels.json"
    legacy = ROOT / "data" / "hand_labels.json"

    labels: dict[str, dict] = {}

    if sample.exists():
        for raw in json.loads(sample.read_text(encoding="utf-8")):
            tier, why = _tier_for(raw)
            labels[raw["candidate_id"]] = {
                "tier": tier,
                "relevance": round(tier / 4.0, 2),
                "rationale": why,
                "labeler": LABELER_HEURISTIC,
                "source": "sample_candidates.json",
            }

    # NOTE: submission top-100 deliberately excluded (audit: no self-grading).

    seen = set(labels.keys())
    labels.update(_stratified_pool_labels(jsonl, seen, STRATIFIED_EXTRA))

    payload = {
        "_provenance": {
            "label_method": LABEL_METHOD,
            "disclaimer": PROVENANCE_DISCLAIMER,
            "generator": "scripts/build_synthetic_proxy_labels.py",
            "excludes_submission_top100": True,
            "n_labels": len(labels),
        },
        "labels": labels,
    }
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    legacy.unlink(missing_ok=True)

    dist: dict[int, int] = {}
    for v in labels.values():
        dist[v["tier"]] = dist.get(v["tier"], 0) + 1
    print(f"Wrote {len(labels)} synthetic proxy labels → {out}")
    print(f"Disclaimer: {PROVENANCE_DISCLAIMER}")
    print("tier distribution:", dict(sorted(dist.items())))
    if len(labels) < 200:
        print(f"WARNING: only {len(labels)} labels (target ≥200)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())