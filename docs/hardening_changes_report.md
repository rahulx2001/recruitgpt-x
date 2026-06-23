# Final Hardening Pass — Change Report

**BASELINE_HASH:** `6bf83241786385aac643fb0641b6d7d76a29ebc46aebcf9c26cae917ce0f6388`  
**POST-HARDENING_HASH:** `6bf83241786385aac643fb0641b6d7d76a29ebc46aebcf9c26cae917ce0f6388`  
**Ranking unchanged:** YES (byte-identical)

---

## Files changed

| File | Issue(s) | Change |
|---|---|---|
| `scripts/build_hand_labels.py` | #1 | Renamed labelers to `rule_based_proxy_v1` / `heuristic_relevance_proxy_v1`; output `synthetic_proxy_labels.json`; provenance disclaimer |
| `data/synthetic_proxy_labels.json` | #1 | Regenerated with honest provenance block |
| `data/hand_labels.json` | #1 | **Removed** (misleading legacy name) |
| `challenge/eval_harness.py` | #1, #2 | `synthetic_proxy_eval`, `weight_ablation_on_synthetic_proxy`, metric classifications, honest notes |
| `data/eval_report.json` | #1, #2 | Regenerated with new field names |
| `scripts/run_eval.py` | #1, #2 | Updated print labels (synthetic proxy, not "hand labels") |
| `submission_metadata.yaml` | #3 | Separated Implemented vs Experimental components; CE explicitly OFF for artifact |
| `challenge/data_paths.py` | #4 | `candidates_not_found_help()` — portable resolution order |
| `rank.py` | #4 | Uses portable error message |
| `scripts/verify_submission_artifact.py` | #5 | Secondary PASS: ranking identical, score bytes differ |
| `challenge/rerank.py` | #6 | Expanded CE disabled documentation |
| `requirements-ranker.txt` | #6 | CE/torch explicitly excluded from submission path |
| `config/defaults.py` | #7 | **New** — `HONEYPOT_REFERENCE_DATE` with env override |
| `config/__init__.py` | #7 | **New** |
| `challenge/honeypot.py` | #7 | Imports reference date from config |
| `docs/reasoning_diversity_report.md` | #8 | **New** — 100/100 unique openers; no ranker change |
| `docs/evaluation_limitations.md` | #2 | **New** — metric table with leakage/limits |
| `docs/evaluation_honesty_statement.md` | #9 | **New** |
| `docs/judge_faq.md` | #10 | **New** — 10 evidence-backed answers |
| `docs/hardening_changes_report.md` | Final | **New** — this file |
| `docs/EVALUATION.md` | #1, #2 | Disclaimer link at top |
| `data/README.md` | #1, #4 | Portable paths; synthetic label disclaimer |
| `README.md` | #1–#6 | Eval disclaimer, CE off, doc links, reproduce commands |

**Not changed (artifact lock):** `submission.csv`, `challenge/redrob_ranker.py` weights/features, ranking logic.

---

## Final validation

| Check | Status |
|---|---|
| Reproducibility | ✅ `verify_submission_artifact.py` PASS (byte-identical) |
| Offline | ✅ CE off; numpy-only submission path |
| Determinism | ✅ Hash unchanged after all edits |
| Metadata Accuracy | ✅ CE separated as experimental; synthetic labels disclosed |
| Evaluation Transparency | ✅ New limitations + honesty docs; renamed fields |
| Compliance | ✅ Network-off path documented; precompute boundary stated |
| Judge Defensibility | ✅ `judge_faq.md` + honest provenance |

---

## Remaining risks (disclosed)

1. **Cross-machine score bytes** — numpy/BLAS may change `score` column formatting; verify script now PASSes on identical ordering.
2. **Synthetic proxy circularity** — still correlated with ranker rubric; now honestly labeled, not hidden.
3. **Judge must supply `candidates.jsonl`** — expected; documented in `data/README.md`.
4. **Title weight 0.24** — JD tension remains; documented in `judge_faq.md` (not changed per artifact lock).
5. **Reasoning template rotation** — not needed (100/100 unique openers); no code change to preserve artifact.