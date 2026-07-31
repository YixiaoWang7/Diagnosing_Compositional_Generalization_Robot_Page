# l4_1s_success_vs_b — Data Description

## Experiment

**Script:** `BvsOODSR/analysis/plot_l4_1s_success_vs_b.py`

This dataset captures how robot task success rates change as a function of **B**,
the number of distinct training task types, for the **l4_1s** setting. The policy
uses an L6 transformer (`l4_1s`, cross-attention, no masking, L6 architecture).

Three training conditions are evaluated:

| Condition | B value | Description |
|-----------|---------|-------------|
| **random** | 1–N | B tasks drawn at random; 3 independent task-set samples × 3 training seeds each |
| **S** | 7 | Fixed "S" subset of 7 tasks; single task set × 3 training seeds |
| **full** | 16 | All 16 available tasks; single task set × 3 training seeds. OOD metric unavailable — in-dist rate is used as a proxy |

Three success-rate metrics are reported for each condition:

| Metric key | Description |
|------------|-------------|
| `total` | Overall success rate across all evaluation episodes |
| `id` | In-distribution success rate (test tasks seen during training) |
| `ood` | Out-of-distribution success rate (test tasks not seen during training) |

## Aggregation

For **random** condition with 3 task-set samples:
1. Per task set: average success rates across the 3 training seeds → task-set mean.
2. Across task sets: mean ± SEM of the 3 task-set means.

For **S** and **full** conditions (single task set):
- Mean ± SEM computed directly across training seeds.

## Files

| File | Rows | Key columns | Notes |
|------|------|-------------|-------|
| `l4_1s_success_vs_b.csv` | 1 row per (B, condition, metric) | `b, condition, metric, mean, sem, std, ci_lo, ci_hi, n_task_sets, n_runs, replicate_kind, n_replicates` | Aggregated values; directly drives plotted lines and error bars |
| `l4_1s_success_vs_b_task_sets.csv` | 1 row per (B, condition, metric, task_set) | `b, condition, metric, task_set, mean_rate, n_seeds` | Per-task-set means; plotted as faint scatter dots |
| `l4_1s_success_vs_b_runs.csv` | 1 row per (B, condition, metric, task_set, seed) | `b, condition, metric, task_set, seed, rate` | Raw per-seed success rates |

All rate/mean values are in **percent (0–100)**.
