# Challenge data (judge-supplied)

The official `candidates.jsonl` (~465 MB) is **not committed** to this repo.
Judges and reproducers must supply it locally.

## Resolution order

1. **CLI:** `python rank.py --candidates /path/to/candidates.jsonl`
2. **Environment:** `export CHALLENGE_DATA_ROOT=/path/to/official/challenge/folder`
3. **Sync script:** `./scripts/sync_challenge_data.sh` (symlinks into `./data/`)

Default path: `./data/candidates.jsonl`

## Synthetic proxy labels

`data/synthetic_proxy_labels.json` is **auto-generated** by `scripts/build_synthetic_proxy_labels.py`.
**This dataset is automatically generated and is not human-labeled ground truth.**
Excludes `submission.csv` top-100 (no self-grading).

Locked artifact hash: `data/SUBMISSION_ARTIFACT.sha256`