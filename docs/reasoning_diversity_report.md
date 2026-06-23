# Reasoning Diversity Report (Stage 4)

Analysis of committed `submission.csv` after `a0ca1bd` reasoning diversification pass.  
**Ranking locked** — only `reasoning` column changed; `candidate_id`, `rank`, `score` identical.

## Method

- Parsed 100 `reasoning` fields
- Measured full-string uniqueness and repeated 6-grams in judge prose (excludes quoted career excerpts)
- Banned-template check for legacy phrase

## Results

| Metric | Before (`fbd08ea`) | After (`a0ca1bd`) |
|---|---|---|
| Banned template phrase | 89/100 | **0/100** |
| Unique full reasoning strings | 100/100 | **100/100** |
| Peak repeated 6-gram (core prose) | 89/100 | **8/100** |
| `validate_reasoning.py` | shallow PASS | **strict PASS** |

## Variant engine

Deterministic rotation via `sha256(candidate_id + tag)`:

- 20+ career strength phrasings
- 15+ concern phrasings (shuffled order per candidate)
- 8 rank intro formats, 4 lead formats, 8 layout templates
- Rank-tier tone for ranks 85+ (marginal) and 90+ (cutoff)

## Stage 4 validator

`scripts/validate_reasoning.py` checks:

- No empty reasoning
- Unique ratio ≥ 50% (actual: 100%)
- Banned legacy template phrase absent
- No 6-gram repeated in >8/100 core-prose rows
- No mid-word ellipsis truncation
- Top-10 opener diversity

Mock judge sampling: `python scripts/mock_stage4_review.py submission.csv`

## Artifact

Hash: `ec7ff84f4efe438ee4d5846951dd6e2020782fba3607a6f099e38068f14fb49e` (`data/SUBMISSION_ARTIFACT.sha256`)