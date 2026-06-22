---
title: RecruitGPT X Ranker
emoji: 🎯
colorFrom: indigo
colorTo: cyan
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
---

# RecruitGPT X — Offline Ranker Sandbox

Hackathon **§10.5** hosted environment. Runs the same `challenge/redrob_ranker.py` on the official `sample_candidates.json` (no 100K upload required).

## Local prep

From repo root:

```bash
./scripts/prepare_hf_space.sh
```

This copies `rank.py`, `challenge/`, and sample data into `sandbox/` for a self-contained Space.

## Deploy to HuggingFace

1. Create a new **Gradio** Space on [huggingface.co/new-space](https://huggingface.co/new-space).
2. Upload the contents of `sandbox/` (after running `prepare_hf_space.sh`).
3. Copy the Space URL into `submission_metadata.yaml` → `sandbox_link`.

## Full reproduction (100K)

```bash
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
```

Or Docker (CPU, no network):

```bash
docker compose -f docker-compose.ranker.yml build
docker compose -f docker-compose.ranker.yml run --rm ranker
```