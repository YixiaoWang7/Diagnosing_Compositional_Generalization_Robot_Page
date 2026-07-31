# l4_2s_no_cont0 — Data Description

## Experiment

**Script:** `l4_2s_no_cont0/analysis/plot_l4_2s_no_cont0_results.py`

This dataset evaluates an L4 two-stage policy on a task where `cont0` (the
first-stage container) is **not** provided to the policy and must be inferred.
The policy must:
1. Pick `obj0` and place it in any valid container ≠ `cont1`.
2. Pick `obj1` and place it into the instructed `cont1`.

The key diagnostic is whether the policy avoids placing `obj0` into `cont1`
(the "same-container violation").

## Conditions

Training coverage conditions (x-axis in all plots):

| condition | label | Description |
|---|---|---|
| `cov4` | Cov4 | Trained with 4 obj0-cont1 coverage combinations |
| `cov6` | Cov6 | Trained with 6 obj0-cont1 coverage combinations |
| `cov9` | Cov9 | Trained with 9 obj0-cont1 coverage combinations |
| `cov12` | Cov12 | Trained with 12 obj0-cont1 coverage combinations |
| `orthogonal` | Cov16 | Trained with orthogonal 16-task set |
| `full` | Full | Trained with full task set (no OOD split; ID values used as reference) |

## Splits

| split | Description |
|---|---|
| `all` | All evaluation episodes pooled |
| `id` | In-distribution episodes (obj0-cont1 pairs seen during training) |
| `ood` | Out-of-distribution episodes (obj0-cont1 pairs not seen during training) |

Note: `full` condition has no genuine OOD split — its ID values are reused as the OOD/reference baseline.

## Files

### `l4_2s_no_cont0_summary.csv`
Aggregated mean ± SE per `(condition, split, metric)`. One row per unique combination.

| Column | Description |
|---|---|
| `condition` | Condition key |
| `condition_label` | Display label |
| `split` | Evaluation split (`all`, `id`, `ood`) |
| `metric` | Metric key (see below) |
| `mean` | Mean value across seeds (%) |
| `se` | Standard error across seeds (%) |
| `n_seeds` | Number of training seeds |
| `n_episodes` | Total episodes across seeds |

### `l4_2s_no_cont0_runs.csv`
Raw per-seed, per-split values. One row per `(condition, seed, split)`.

| Column | Description |
|---|---|
| `condition` / `condition_label` | Condition identifier |
| `seed` | Training seed |
| `split` | Evaluation split |
| `n_episodes` | Episode count |
| `pc_success` | Final task success rate (%) |
| `pc_place_obj0` | Rate at which obj0 was placed anywhere (%) |
| `pc_place_obj0_correct` | Rate at which obj0 was placed legally (≠ cont1) (%) |
| `pc_same_container_violation` | Rate of same-container (obj0 → cont1) violations (%) |
| `pc_same_container_given_place_obj0` | Conditional violation rate given obj0 was placed (%) |
| `pc_obj0_legal_given_place_obj0` | Conditional legal placement rate given obj0 was placed (%) |
| `pc_pick_obj0` / `pc_pick_obj1` | Pick success rates (%) |
| `pc_place_obj1_correct` | Obj1 placed into cont1 (%) |
| `pc_stage0_success` / `pc_stage1_success` | Per-stage success rates (%) |

### `l4_2s_no_cont0_failure_analysis.csv`
Outcome breakdown per `(condition, seed, split)`. Each row is one outcome category.

| Column | Description |
|---|---|
| `category` | Outcome category key |
| `category_label` | Human-readable label |
| `rate` | Episode share for this outcome (%) |

Outcome categories (mutually exclusive, sum to ~100%):

| category | Description |
|---|---|
| `pc_no_obj0_place` | Obj0 was never placed |
| `pc_same_container_violation` | Obj0 placed into cont1 (the wrong container) |
| `pc_other_illegal_obj0_place` | Obj0 placed illegally but not into cont1 |
| `pc_legal_obj0_but_later_fail` | Obj0 placed legally, but stage 2 failed |
| `pc_success` | Full task success |

All rate values are in **percent (0–100)**.
