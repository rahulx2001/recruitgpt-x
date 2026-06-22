"""
HuggingFace Spaces sandbox for RecruitGPT X offline ranker.

Runs on sample_candidates.json (no 100K upload required).
Deploy: copy this folder to HF Space with rank.py, challenge/, data/sample_candidates.json
"""

from __future__ import annotations

import json
import sys
import tempfile
import time
from pathlib import Path

import gradio as gr

ROOT = Path(__file__).resolve().parents[1]
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
        return "", "ERROR: data/sample_candidates.json not found in Space."

    jsonl = _sample_jsonl_path()
    t0 = time.perf_counter()
    top = rank_candidates(jsonl, top_k=min(max(top_k, 1), 100))
    elapsed = time.perf_counter() - t0

    out = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8")
    write_submission(top, Path(out.name))
    out.close()

    lines = Path(out.name).read_text(encoding="utf-8").strip().splitlines()
    preview = "\n".join(lines[: min(len(lines), top_k + 1)])
    meta = (
        f"Ranked {len(top)} candidates from sample_candidates.json in {elapsed:.2f}s\n"
        f"CPU-only · no network · reproduce: python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv"
    )
    return preview, meta


with gr.Blocks(title="RecruitGPT X Ranker") as demo:
    gr.Markdown(
        "# RecruitGPT X — Offline Candidate Ranker\n"
        "Hackathon sandbox: runs the same `challenge/redrob_ranker.py` on the official sample set."
    )
    top_k = gr.Slider(5, 50, value=20, step=1, label="Top K")
    run_btn = gr.Button("Rank sample candidates", variant="primary")
    csv_out = gr.Textbox(label="Submission preview (CSV)", lines=22)
    meta_out = gr.Textbox(label="Run info", lines=3)
    run_btn.click(run_ranker, inputs=[top_k], outputs=[csv_out, meta_out])

if __name__ == "__main__":
    demo.launch()