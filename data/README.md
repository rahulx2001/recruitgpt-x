# Challenge dataset

| File | In git? | Notes |
|---|---|---|
| `sample_candidates.json` | Yes | Quick self-test (`python rank.py --self-test`) |
| `job_description.docx` | Yes | Parsed into `challenge/jd_config.py` |
| `candidates.jsonl` | **No** (465MB) | Copy from the official challenge bundle |

```bash
cp "/path/to/India_runs_data_and_ai_challenge/candidates.jsonl" ./data/candidates.jsonl
python rank.py --candidates ./data/candidates.jsonl --out ./submission.csv
```