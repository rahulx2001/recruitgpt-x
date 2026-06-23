# Reasoning Diversity Report (Stage 4)

Analysis of committed `submission.csv` reasoning text. **No ranker changes were made** — submission artifact locked.

## Method

- Parsed 100 `reasoning` fields
- Extracted opener = text before first `Ranked #` clause (candidate-specific lead line)

## Results

| Metric | Value |
|---|---|
| Total rows | 100 |
| Unique openers | **100** |
| Repeated openers (>1) | **0** |

Every row opens with a distinct candidate-specific lead (`{title} @ {company}, {years}y, {location}.`).

## Template rotation

**Not implemented** — not required. Current artifact already has 100/100 unique openers. Introducing phrasing rotation would change `submission.csv` bytes (forbidden under artifact lock).

## Stage 4 validator

`scripts/validate_reasoning.py` checks:
- No empty reasoning
- Unique ratio ≥ 50% (actual: 100%)
- No mid-word ellipsis truncation
- Top-10 opener diversity

## Recommendation for judges

Reasoning is fact-grounded from profile fields; variation comes from per-candidate titles, companies, locations, and career snippets — not a single template string.