# Judge FAQ — Evidence-Backed Answers

## 1. Why is title weight high (0.24)?

The JD asks for a **Senior AI Engineer** founding role. Title weight captures **role evidence** (e.g., "Recommendation Systems Engineer") not seniority alone. Career semantic + bi-encoder catch plain-language Tier-5 profiles. Weight chosen via ablation on behavioral proxy; title_heavy preset matches current defaults. **Evidence:** `challenge/jd_config.py` STRONG_TITLES, `DEFAULT_WEIGHTS` in `redrob_ranker.py`, ablation in `data/eval_report.json`.

## 2. Why do embeddings matter?

Committed `embeddings.fp16.npz` (100K×384, MiniLM-L6-v2@1110a243) blends 70% bi-encoder cosine + 30% lexical in `semantic_score`. Removing embeddings changes top-10 positional order (measured: 3/10 without `.npz` vs 10/10 set). **Evidence:** `challenge/embeddings.py`, `data/embeddings/meta.json`, reproduce script no-embeddings check.

## 3. Why is the cross-encoder OFF?

Prior audit proved CE-on artifacts were **not reproducible** (3/10 top-10 drift). CE requires network/HF cache, violates spec network-off, and is environment-dependent. Submission uses `RANKER_USE_CROSS_ENCODER=0`. **Evidence:** `rerank.py`, `requirements-ranker.txt` (torch commented out), byte-identical verify at `6bf83241…`.

## 4. Why are metrics "proxies"?

We do not have hidden GT. Proxies measure internal consistency (JD rubric) or weak external signals (education/github). Synthetic labels are **auto-generated rules**, not human annotation. **Evidence:** `docs/evaluation_limitations.md`, `scripts/build_hand_labels.py` disclaimer.

## 5. Why no hidden GT claims?

Organizer holds secret labels. We report offline diagnostics only and expect composite ~0.60–0.68. **Evidence:** `submission_metadata.yaml`, `eval_report.json` note field.

## 6. Why offline?

Spec requires network OFF during ranking. Default path: numpy + committed fp16 embeddings, no downloads. **Evidence:** Docker `network_mode: none`, `has_network_during_ranking: false` in metadata.

## 7. Why deterministic?

No RNG in rank path; ties broken by `candidate_id`. Two fresh runs → identical SHA256. **Evidence:** `verify_submission_artifact.py` PASS on `6bf83241…`.

## 8. Why CPU only?

100K candidates in ~48s on Apple Silicon CPU; matrix ~71 MB fp16. No GPU in submission path. **Evidence:** `submission_metadata.yaml` compute section, measured runtime.

## 9. Why is precompute allowed?

Spec permits precomputed features. Bi-encoder embeddings computed once off-the-clock (`meta.json elapsed_seconds: 624.9`). Ranking itself uses committed `.npz` only. **Evidence:** `scripts/precompute_embeddings.py`, `data/embeddings/meta.json`.

## 10. Why is ranking reproducible?

`submission.csv` is byte-identical to `RANKER_USE_CROSS_ENCODER=0 python rank.py` on this commit. Verify script enforces hash match; secondary mode accepts identical ordering if score bytes differ across numpy builds. **Evidence:** `./scripts/reproduce_ranking.sh`, `scripts/verify_submission_artifact.py`.