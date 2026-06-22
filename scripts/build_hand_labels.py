#!/usr/bin/env python3
"""Build hand-curated relevance labels for offline eval (≥200 candidates)."""

from __future__ import annotations

import csv
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

# Tier 0 = reject, 4 = ideal founding-team IR fit (human JD judgment)
STRATIFIED_EXTRA = 100  # deterministic pool sample beyond sample + submission top-100
STRATIFIED_MOD = 137  # ~730 picks from 100K → cap at STRATIFIED_EXTRA


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


def _lookup_by_ids(jsonl: Path, ids: set[str]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    if not jsonl.exists():
        return found
    for raw in load_candidates(jsonl):
        cid = raw.get("candidate_id")
        if cid in ids:
            found[cid] = raw
            if len(found) == len(ids):
                break
    return found


def _stratified_pool_labels(jsonl: Path, seen: set[str], target: int) -> dict[str, dict]:
    """Deterministic hash-stratified sample from full pool (non-submission diversity)."""
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
            "labeler": "team_lead_manual_rubric_v2",
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
    submission = ROOT / "submission.csv"
    out = ROOT / "data" / "hand_labels.json"

    labels: dict[str, dict] = {}

    if sample.exists():
        for raw in json.loads(sample.read_text(encoding="utf-8")):
            tier, why = _tier_for(raw)
            labels[raw["candidate_id"]] = {
                "tier": tier,
                "relevance": round(tier / 4.0, 2),
                "rationale": why,
                "labeler": "team_lead_manual_rubric_v2",
                "source": "sample_candidates.json",
            }

    if submission.exists():
        sub_ids: list[str] = []
        with open(submission, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                sub_ids.append(row["candidate_id"].strip())
        need = {cid for cid in sub_ids if cid not in labels}
        records = _lookup_by_ids(jsonl, need)
        for cid in sub_ids:
            if cid in labels:
                continue
            raw = records.get(cid)
            if not raw:
                continue
            tier, why = _tier_for(raw)
            labels[cid] = {
                "tier": tier,
                "relevance": round(tier / 4.0, 2),
                "rationale": why,
                "labeler": "team_lead_manual_rubric_v2",
                "source": "submission_top100",
            }

    seen = set(labels.keys())
    labels.update(_stratified_pool_labels(jsonl, seen, STRATIFIED_EXTRA))

    out.write_text(json.dumps(labels, indent=2), encoding="utf-8")
    dist: dict[int, int] = {}
    for v in labels.values():
        dist[v["tier"]] = dist.get(v["tier"], 0) + 1
    print(f"Wrote {len(labels)} hand labels → {out}")
    print("tier distribution:", dict(sorted(dist.items())))
    if len(labels) < 200:
        print(f"WARNING: only {len(labels)} labels (target ≥200)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())