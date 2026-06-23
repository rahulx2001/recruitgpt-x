#!/usr/bin/env python3
"""Mock Stage 4 manual review — scores 10 sampled reasoning rows (§3.4)."""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from challenge.data_paths import challenge_file

_BANNED_TEMPLATE = "career history describes shipped retrieval/ranking work in plain language"
_JD_TERMS = (
    "retrieval",
    "ranking",
    "embedding",
    "semantic",
    "search",
    "vector",
    "ir ",
    "founding",
    "jd fit",
    "mandate",
)


def _load_candidates(path: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                row = json.loads(line)
                out[row["candidate_id"]] = row
    return out


def _profile_text(raw: dict) -> str:
    parts: list[str] = []
    prof = raw.get("profile", {})
    for k in ("current_title", "current_company", "location"):
        if prof.get(k):
            parts.append(str(prof[k]))
    if prof.get("years_of_experience") is not None:
        parts.append(f"{prof['years_of_experience']} years")
    for sk in raw.get("skills", []):
        parts.append(str(sk.get("name", "")))
    for role in raw.get("career_history", []):
        parts.append(str(role.get("title", "")))
        parts.append(str(role.get("company", "")))
        parts.append(str(role.get("description", ""))[:200])
    return " ".join(parts).lower()


def score_row(row: dict, raw: dict) -> dict[str, bool]:
    reason = (row.get("reasoning") or "").strip()
    rank = int(row["rank"])
    profile = _profile_text(raw)

    has_specifics = bool(
        re.search(r"\d+\.?\d*y", reason)
        or re.search(r"@|based", reason)
        or re.search(r"skills|ir |notice|open_to_work|response", reason, re.I)
    )
    has_jd = any(term in reason.lower() for term in _JD_TERMS)
    has_concerns = bool(re.search(r"concern|flag|gap|risk|watch|notice|thin|marginal|cutoff", reason, re.I))
    no_hallucination = True
    for token in re.findall(r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*", reason):
        if len(token) < 4:
            continue
        if token.lower() in {"concerns", "flags", "rank", "score", "career", "note", "evidence"}:
            continue
    no_template = _BANNED_TEMPLATE not in reason
    rank_tone_ok = True
    if rank >= 85:
        rank_tone_ok = bool(re.search(r"marginal|cutoff|weaker|lower|gap|thin|limited", reason, re.I))
    if rank <= 10 and re.search(r"marginal jd fit|near cutoff", reason, re.I):
        rank_tone_ok = False

    return {
        "specific_facts": has_specifics,
        "jd_connection": has_jd,
        "honest_concerns": has_concerns or rank <= 10,
        "no_template": no_template,
        "rank_consistency": rank_tone_ok,
        "non_empty": bool(reason),
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Mock Stage 4 reasoning review")
    p.add_argument("submission", type=Path, nargs="?", default=ROOT / "submission.csv")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--sample", type=int, default=10)
    args = p.parse_args()

    candidates_path = challenge_file("candidates.jsonl")
    if not args.submission.exists():
        print(f"ERROR: {args.submission} not found", file=sys.stderr)
        return 1
    if not candidates_path.exists():
        print(f"ERROR: {candidates_path} not found", file=sys.stderr)
        return 1

    pool = _load_candidates(candidates_path)
    rows: list[dict[str, str]] = []
    with open(args.submission, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    rng = random.Random(args.seed)
    sample = rng.sample(rows, min(args.sample, len(rows)))

    checks = [
        "specific_facts",
        "jd_connection",
        "honest_concerns",
        "no_template",
        "rank_consistency",
        "non_empty",
    ]
    totals = {c: 0 for c in checks}
    failures: list[str] = []

    print(f"Stage 4 mock review — {len(sample)} rows (seed={args.seed})\n")
    for row in sample:
        cid = row["candidate_id"]
        raw = pool.get(cid)
        if raw is None:
            failures.append(f"{cid}: missing from candidates.jsonl")
            continue
        scores = score_row(row, raw)
        passed = sum(scores.values())
        print(f"rank {row['rank']:>3} {cid}  {passed}/{len(checks)} checks")
        for c in checks:
            if scores[c]:
                totals[c] += 1
            else:
                failures.append(f"rank {row['rank']} {cid}: failed {c}")
        print(f"  preview: {row['reasoning'][:140]}…\n")

    n = len(sample)
    print("Aggregate:")
    for c in checks:
        print(f"  {c}: {totals[c]}/{n}")

    if failures:
        print("\nFailures:")
        for f in failures[:20]:
            print(f"  - {f}")

    all_pass = all(totals[c] == n for c in checks)
    print("\nRESULT:", "PASS" if all_pass else "NEEDS ATTENTION")
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())