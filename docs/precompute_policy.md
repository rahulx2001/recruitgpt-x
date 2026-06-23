# Precompute Policy (Spec Compliance)

## What is precomputed

| Artifact | When | Network | On-the-clock? |
|---|---|---|---|
| `data/embeddings/embeddings.fp16.npz` | One-time before submission | **Yes** (MiniLM download) | **No** — off-the-clock setup |
| `data/embeddings/meta.json` | Same run | Yes | No |

Recorded in `meta.json`: `elapsed_seconds: 624.89`, `model_revision: 1110a243…`.

## What runs at ranking time (on-the-clock)

- `rank.py` with `RANKER_USE_CROSS_ENCODER=0`
- Loads committed `.npz` only — **no network**
- ~48s on 100K CPU

## Judge reproduction

1. Clone repo (`.npz` is committed, 71 MB)
2. Mount `candidates.jsonl` via `--candidates` or `CHALLENGE_DATA_ROOT`
3. `./scripts/reproduce_ranking.sh`

Precompute is **not** required if committed `.npz` is present.

## Docker note

`docker compose build` may use network for `pip install` (numpy only). Ranking container uses `network_mode: none`.