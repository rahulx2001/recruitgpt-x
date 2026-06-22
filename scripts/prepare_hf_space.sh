#!/usr/bin/env bash
# Bundle sandbox/ with everything needed for a HuggingFace Gradio Space push.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SB="$ROOT/sandbox"

echo "==> Preparing HF Space bundle in sandbox/"

cp "$ROOT/rank.py" "$SB/rank.py"
rm -rf "$SB/challenge" "$SB/data"
cp -R "$ROOT/challenge" "$SB/challenge"
mkdir -p "$SB/data"
cp "$ROOT/data/sample_candidates.json" "$SB/data/sample_candidates.json"
cp "$ROOT/scripts/validate_submission.py" "$SB/validate_submission.py"

# Flat layout for HF (app.py imports from same directory)
cat > "$SB/app.py" << 'PYEOF'
"""HuggingFace Spaces — RecruitGPT X offline ranker (sample set)."""
from __future__ import annotations

import json
import sys
import tempfile
import time
from pathlib import Path

import gradio as gr

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from challenge.redrob_ranker import rank_candidates, write_submission

SAMPLE = ROOT / "data" / "sample_candidates.json"


def _sample_jsonl_path() -> Path:
    data = json.loads(SAMPLE.read_text(encoding="utf-8"))
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False, encoding="utf-8")
    for row in data:
        tmp.write(json.dumps(row) + "\n")
    tmp.close()
    return Path(tmp.name)


def run_ranker(top_k: int = 20) -> tuple[str, str]:
    if not SAMPLE.exists():
        return "", "ERROR: data/sample_candidates.json not found."
    jsonl = _sample_jsonl_path()
    t0 = time.perf_counter()
    top = rank_candidates(jsonl, top_k=min(max(int(top_k), 1), 100))
    elapsed = time.perf_counter() - t0
    out = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8")
    write_submission(top, Path(out.name))
    out.close()
    lines = Path(out.name).read_text(encoding="utf-8").strip().splitlines()
    preview = "\n".join(lines[: min(len(lines), int(top_k) + 1)])
    meta = (
        f"Ranked {len(top)} candidates in {elapsed:.2f}s (CPU, no network)\n"
        f"Full reproduce: python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv"
    )
    return preview, meta


with gr.Blocks(title="RecruitGPT X Ranker") as demo:
    gr.Markdown("# RecruitGPT X — Offline Candidate Ranker")
    top_k = gr.Slider(5, 50, value=20, step=1, label="Top K")
    run_btn = gr.Button("Rank sample candidates", variant="primary")
    csv_out = gr.Textbox(label="Submission preview (CSV)", lines=22)
    meta_out = gr.Textbox(label="Run info", lines=3)
    run_btn.click(run_ranker, inputs=[top_k], outputs=[csv_out, meta_out])

demo.launch()
PYEOF

echo "==> Done. Deploy sandbox/ to HF Space:"
echo "    cd sandbox && huggingface-cli upload recruitgpt-ranker . --repo-type=space"
echo "    (or create Space on huggingface.co and push sandbox/ contents)"