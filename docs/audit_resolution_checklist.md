# Audit Resolution Checklist

Maps each finding from the Final Independent Audit to current repo state (`HEAD` after hardening).

| # | Audit finding | Status | Evidence |
|---|---|---|---|
| 1 | Stage-3 byte reproducibility | ✅ RESOLVED | `verify_submission_artifact.py` PASS; hash `6bf83241…` in `data/SUBMISSION_ARTIFACT.sha256` |
| 2 | CE drift / old 3/10 artifact | ✅ RESOLVED | `RANKER_USE_CROSS_ENCODER=0` default; CE in metadata as experimental only |
| 3 | Fake "hand labels" / team_lead_manual | ✅ RESOLVED | `synthetic_proxy_labels.json`; labelers `rule_based_proxy_v1` / `heuristic_relevance_proxy_v1` |
| 4 | Self-grading submission top-100 | ✅ RESOLVED | `build_synthetic_proxy_labels.py` excludes submission.csv IDs |
| 5 | Metadata CE overclaim | ✅ RESOLVED | `submission_metadata.yaml` Implemented vs Experimental sections |
| 6 | Hardcoded Downloads in data_paths | ✅ RESOLVED | Defaults to `./data/` only; portable error messages |
| 7 | Verify false-fail on BLAS | ✅ RESOLVED | Secondary PASS: ranking identical, score bytes differ |
| 8 | numpy unpinned | ✅ RESOLVED | `numpy>=2.3.5,<2.5.0` in `requirements-ranker.txt` |
| 9 | HONEYPOT_REFERENCE_DATE hardcoded | ✅ RESOLVED | `config/defaults.py` + `HONEYPOT_REFERENCE_DATE` env |
| 10 | Eval circularity undisclosed | ✅ RESOLVED | `docs/evaluation_limitations.md`, `evaluation_honesty_statement.md` |
| 11 | No judge FAQ | ✅ RESOLVED | `docs/judge_faq.md` (10+ answers) |
| 12 | Reasoning templated | ✅ RESOLVED | 100/100 unique openers — `docs/reasoning_diversity_report.md` |
| 13 | Precompute network unclear | ✅ RESOLVED | `docs/precompute_policy.md`, metadata note |
| 14 | sync_challenge_data Downloads | ✅ ACCEPTABLE | Downloads is dev convenience fallback only; judges use `CHALLENGE_DATA_ROOT` |
| 15 | Title weight 0.24 vs JD | ⚠️ DOCUMENTED | Not changed (artifact lock); defended in `judge_faq.md` Q13–14 |
| 16 | No human-labeled eval set | ⚠️ HONEST | Disclosed in `evaluation_honesty_statement.md` — we do not claim human labels |
| 17 | Behavioral twin tests | ✅ RESOLVED | `test_behavioral_twin_breaks_tie`, `test_keyword_stuffer_far_from_top` |
| 18 | submission.csv unchanged | ✅ LOCKED | BASELINE_HASH verified after every change |

## Cannot fix without changing ranking (intentionally locked)

- Title weight 0.24
- Feature engineering / model weights
- `submission.csv` content

## Remaining honest risks (disclosed to judges)

1. Synthetic proxy labels correlate with ranker rubric (circular) — labeled as proxy, not GT
2. Cross-machine score-byte drift possible — verify accepts identical ordering
3. Judge must supply `candidates.jsonl` (~465 MB, not in repo)