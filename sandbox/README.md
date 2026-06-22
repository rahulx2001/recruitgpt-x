# HuggingFace Spaces Sandbox

Deploy this folder as a Gradio Space so judges can re-run the ranker on `sample_candidates.json`.

## Quick deploy

1. Create a new HF Space (SDK: Gradio, hardware: CPU basic).
2. Upload repo files: `sandbox/app.py`, `rank.py`, `challenge/`, `data/sample_candidates.json`.
3. Set `app_file` to `app.py` or copy `app.py` to Space root.
4. Update `submission_metadata.yaml` → `sandbox_link` with your Space URL.

## Local test

```bash
pip install gradio
python sandbox/app.py
```