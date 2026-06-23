# Evaluation Limitations — Offline Ranker

These metrics estimate **internal consistency** and **heuristic alignment**. They are **not** estimates of hidden ground-truth NDCG@10 (the official composite score uses a secret label set).

> **Disclaimer:** Synthetic proxy labels in `data/synthetic_proxy_labels.json` are automatically generated and are **not human-labeled ground truth**.

---

## Metric classification table

| Metric block | Classification | Inputs | Leakage risk | Intended use | Limitations |
|---|---|---|---|---|---|
| `metrics_self_consistency_proxy` | **Self-consistency proxy** | Title tiers, IR skill phrases, production language, career keywords, experience band (via `proxy_relevance`) | **High (circular)** — uses the same JD rubric family the ranker optimizes | Sanity check that ranker ordering is consistent with its own rubric | Not predictive of hidden GT; can look strong while overfitting rubric |
| `metrics_behavioral_independent_proxy` | **Behavioral proxy** | Education tier, `github_activity_score`, `search_appearance_30d`, `profile_completeness_score` only | **Low** — excludes ranker features (`saved_by_recruiters_30d`, `open_to_work`, `recruiter_response_rate`, etc.) | Weak external signal check | Heuristic, near-saturated on holdout; weak correlation to JD fit |
| `synthetic_proxy_eval` | **Synthetic relevance proxy** | Auto-generated tiers from `scripts/build_hand_labels.py` (title/keyword/honeypot rules) | **High (circular + self-grading)** — rules overlap ranker features; includes submission top-100 | Diagnostic ablation on rule-based tiers | **Not human labels**; do not cite as validation against hidden GT |
| `weight_ablation_on_behavioral_proxy` | **Behavioral proxy ablation** | Same as behavioral proxy, across weight presets | Low for behavioral features; ablation target is weak proxy | Compare weight presets on non-ranker signals | Does not justify weights vs hidden GT |
| `weight_ablation_on_synthetic_proxy` | **Synthetic proxy ablation** | Same as synthetic proxy labels | High (circular) | Internal weight comparison only | Misleading if presented as human eval |

---

## What these metrics are NOT

- Not hidden ground-truth NDCG@10, MAP, or MRR
- Not inter-annotator agreement on human labels
- Not online A/B test results
- Not proof of top-1% placement

## Honest composite expectation

Per `data/eval_report.json` note: expect real hidden-GT composite roughly **0.60–0.68** given proxy saturation and rubric mismatch risk.

## Regenerating reports

```bash
python scripts/build_hand_labels.py   # synthetic proxy labels (NOT human)
python scripts/run_eval.py --candidates ./data/candidates.jsonl
```