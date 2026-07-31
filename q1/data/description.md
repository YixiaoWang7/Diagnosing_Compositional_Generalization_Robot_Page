# success_vs_b — Data Description

## Experiment

**Script:** `BvsOODSR/analysis/plot_success_vs_b.py`

This dataset captures how robot task success rates change as a function of **B**,
the number of distinct training task types included in the training set. The
experiment uses an L5 transformer policy (`cg_l5`, cross-attention, no masking,
L8 architecture).

Three coverage conditions are evaluated:

| Condition | Description |
|-----------|-------------|
| **Random coverage** | B tasks drawn at random; 3 independent task-set samples (s0/s1/s2) × 3 training seeds each |
| **Diag (B=4)** | Fixed diagnostic task set of 4 tasks; single task set × 3 seeds |
| **Full (B=64)** | All 64 tasks used for training; single task set × 3 seeds. OOD metric unavailable — in-dist rate is used as a proxy |
| **Orthogonal (B=16)** | Specially constructed orthogonal task set of 16 tasks; single task set × multiple seeds |

Three success-rate metrics are reported for each condition:

| Metric key | Description |
|------------|-------------|
| `total` | Overall success rate across all evaluation episodes |
| `id` | In-distribution success rate (test tasks seen during training) |
| `ood` | Out-of-distribution success rate (test tasks not seen during training) |

## Aggregation

For conditions with **3 task-set samples** (random coverage, B ≤ 24):
1. Per task set: average success rates across the 3 training seeds → task-set mean.
2. Across task sets: mean ± SEM of the 3 task-set means.

For conditions with **1 task set** (diag, full, orthogonal):
- Mean ± SEM computed directly across training seeds.

## Files

| File | Rows | Key columns | Notes |
|------|------|-------------|-------|
| `success_vs_b.csv` | 1 row per (B, metric) | `b, metric, mean, sem, std, ci_lo, ci_hi, n_task_sets, n_runs, replicate_kind, n_replicates` | Aggregated values; directly drives the plotted lines and error bars |
| `success_vs_b_task_sets.csv` | 1 row per (B, metric, task_set) | `b, metric, task_set, mean_rate, n_seeds` | Per-task-set means; plotted as faint scatter dots |
| `success_vs_b_runs.csv` | 1 row per (B, metric, task_set, seed) | `b, metric, task_set, seed, rate` | Raw per-seed success rates |
| `success_vs_b_ortho.csv` | 1 row per metric | `b, metric, mean, sem, std, ci_lo, ci_hi, n_runs` | Orthogonal condition summary; plotted as star markers |

All rate/mean values are in **percent (0–100)**.
