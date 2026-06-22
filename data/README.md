# Challenge dataset

**Single source of truth:** the official India Runs bundle on your machine:

```
/Users/rahulkumarsinghj/Downloads/[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge
```

Everything in `data/` is a **symlink** to that folder — not a separate copy.

## Sync (run after cloning or if paths change)

```bash
./scripts/sync_challenge_data.sh
```

Override the bundle location:

```bash
export CHALLENGE_DATA_ROOT="/path/to/India_runs_data_and_ai_challenge"
./scripts/sync_challenge_data.sh
```

## Official files used

| File | Purpose |
|------|---------|
| `candidates.jsonl` | Full 100K pool — `rank.py`, embeddings, eval |
| `sample_candidates.json` | Self-test + hand-label eval |
| `job_description.docx` | JD source (parsed in `challenge/jd_config.py`) |
| `candidate_schema.json` | Schema reference |
| `sample_submission.csv` | Format reference |
| `validate_submission.py` | Official CSV validator |
| `submission_metadata_template.yaml` | Portal metadata template |

## Rank + submit

```bash
./scripts/sync_challenge_data.sh
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
```

Generated outputs (`submission.csv`, `embeddings/`, `eval_report.json`) stay in the repo; **inputs** always come from the official bundle.