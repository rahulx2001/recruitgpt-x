"""Canonical paths to the official India Runs challenge dataset."""

from __future__ import annotations

import os
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]

# Official bundle (user Downloads). Override with CHALLENGE_DATA_ROOT.
_DEFAULT_OFFICIAL = Path(
    "/Users/rahulkumarsinghj/Downloads/"
    "[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge"
)

OFFICIAL_FILES = (
    "candidates.jsonl",
    "sample_candidates.json",
    "job_description.docx",
    "candidate_schema.json",
    "redrob_signals_doc.docx",
    "submission_spec.docx",
    "sample_submission.csv",
    "submission_metadata_template.yaml",
    "README.docx",
    "validate_submission.py",
)


def official_challenge_root() -> Path:
    """Directory containing the published challenge files."""
    override = os.environ.get("CHALLENGE_DATA_ROOT", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    return _DEFAULT_OFFICIAL


def challenge_file(name: str) -> Path:
    """Resolve a challenge file — official bundle first, then synced data/ symlink."""
    official = official_challenge_root() / name
    if official.is_file():
        return official
    synced = _REPO_ROOT / "data" / name
    if synced.is_file() or synced.is_symlink():
        return synced.resolve()
    return official


def repo_data_dir() -> Path:
    return _REPO_ROOT / "data"


def ensure_challenge_data_synced() -> list[str]:
    """Return list of missing official files (empty = all present)."""
    root = official_challenge_root()
    missing = []
    for name in OFFICIAL_FILES:
        if not (root / name).is_file():
            missing.append(name)
    return missing