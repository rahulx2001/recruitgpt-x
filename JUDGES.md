# Judges — start here (60 seconds)

## What gets scored

| Graded | Not graded |
|--------|------------|
| `python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv` | `backend/` + `frontend/` web demo |
| `challenge/redrob_ranker.py` (offline hybrid ranker) | LangGraph live ranking API |
| `submission.csv` | Dashboard UI polish |

**The web app is a product demo only.** It does not produce the submission artifact.

## Reproduce (Stage 3)

```bash
./scripts/reproduce_ranking.sh
```

Requirements: `data/candidates.jsonl` (official bundle) + committed `data/embeddings/embeddings.fp16.npz`.

- CPU only, no network at rank time (`RANKER_USE_CROSS_ENCODER=0`)
- ~60s on 100K candidates (includes template-blurb index pass)
- Byte-reproducible: `python scripts/verify_submission_artifact.py`

## Validate format

```bash
python validate_submission.py submission.csv
python scripts/check_honeypots.py submission.csv
python scripts/mock_stage4_review.py submission.csv
```

## Sandbox

HuggingFace Space (sample ranking): see `submission_metadata.yaml` → `sandbox_link`

## Key design choices (v6)

1. **Template-blurb penalty** — demotes recycled career descriptions shared across thousands of profiles
2. **Availability hard gate** — `open_to_work=false` capped out of top-10
3. **Notice period modifier** — 90–120 day notice penalized; ≤30 day boosted
4. **Cross-encoder OFF** — reproducibility and spec compliance (see `docs/judge_faq.md`)

## Docs map

| File | Purpose |
|------|---------|
| `docs/judge_faq.md` | Evidence-backed FAQ |
| `docs/evaluation_honesty_statement.md` | What we do/don't measure |
| `submission_metadata.yaml` | Team metadata for portal |
| `docs/ARCHITECTURE.md` | System overview |

## AI disclosure

Grok + Cursor used for engineering assistance. **No candidate rows sent to LLMs during ranking.** See `submission_metadata.yaml`.