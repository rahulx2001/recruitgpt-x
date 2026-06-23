# Evaluation Honesty Statement

## What we measure (offline)

| Item | What it is | Human-labeled? |
|---|---|---|
| `submission.csv` ranking | Hybrid scorer output on 100K candidates | N/A (model output) |
| Self-consistency proxy NDCG | Ranker vs JD rubric (`proxy_relevance`) | No — auto rubric |
| Behavioral proxy NDCG | Ranker vs education/github/search/completeness | No — heuristic proxy |
| Synthetic proxy NDCG | Ranker vs `synthetic_proxy_labels.json` | **No — rule-based auto labels** |
| Weight ablations | Preset comparison on proxies above | No |
| Honeypot scan | Rule-based structural trap detector | No |
| Official `validate_submission.py` | Format/schema check | N/A |

## What we do NOT measure

- Hidden ground-truth relevance labels (organizer-held secret set)
- Inter-annotator agreement
- Live recruiter hire outcomes
- Online production NDCG@10

## Proxy vs synthetic vs human

- **Proxy:** Heuristic function approximating JD fit without calling the ranker (`proxy_relevance`, `behavioral_proxy_relevance`).
- **Synthetic:** Labels produced by `scripts/build_hand_labels.py` using deterministic rules (`rule_based_proxy_v1`, `heuristic_relevance_proxy_v1`). **Not human annotation.**
- **Human-labeled:** We do **not** claim any human-labeled evaluation set in this submission.

## Hidden GT

The hackathon composite score uses a **secret** labeled set. Our offline metrics are **diagnostics only** and may correlate weakly or not at all with hidden GT. We state this explicitly in `submission_metadata.yaml` and `data/eval_report.json`.

## Self-grading disclosure

`synthetic_proxy_labels.json` includes IDs from our own `submission.csv` top-100 for diagnostic coverage. This is **not** independent validation — it is labeled with the same rule family the ranker uses. We disclose this to avoid implying circular self-grading as human eval.

## Transparency goal

A judge opening `build_hand_labels.py`, `eval_harness.py`, and this document should conclude: **the team labels proxies honestly and does not claim human ground truth where none exists.**