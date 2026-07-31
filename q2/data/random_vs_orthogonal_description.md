# random_vs_orthogonal — Data Description

## Experiment

**Script:** `ft_res/analysis/plot_ft_random_vs_orthogonal_16demo_bins.py`

This dataset compares two finetuning (FT) task-set selection strategies at fixed
total demo budgets (16 and 32 demos), across two pretrain checkpoints:

| Strategy | Description |
|---|---|
| **Random coverage** | B tasks drawn at random from the full 64-task L5 set; 5 independent task-set samples (s0–s4) per `(ckpt, n_demos)` cell |
| **Orthogonal** | Fixed Orthogonal-16 task set (16 tasks constructed to maximise coverage); single run per `(ckpt, n_demos)` cell |

For 16-demo cells: random uses B=16 tasks × 1 demo each; orthogonal uses 16 tasks × 1 demo each.
For 32-demo cells: random uses B=32 tasks × 1 demo each; orthogonal uses 16 tasks × 2 demos each
(same total demo budget, different task coverage).

## Pretrain checkpoints

| ckpt key | Description |
|---|---|
| `diag_B4` | Pretrained on 4-task `diag_B4` subset |
| `diag_03` | Pretrained on 6-task `diag_03` subset |

## Metrics

| metric key | Description |
|---|---|
| `all` | Total success rate over all 64 eval tasks |
| `ft_train` | ID: success on the FT training tasks |
| `ft_heldout` | OOD: success on eval tasks NOT in the FT training set |

## File: `random_vs_orthogonal_summary.csv`

One row per `(ckpt, n_demos, kind, source, metric)` combination.

| Column | Description |
|---|---|
| `ckpt` | Pretrain checkpoint key (`diag_B4`, `diag_03`) |
| `n_demos` | Total finetuning demo budget (16 or 32) |
| `kind` | Task-set strategy (`random` or `orthogonal`) |
| `source` | Sample identifier (`random_s0`–`random_s4` or `orthogonal`) |
| `metric` | Metric slice (`all`, `ft_train`, `ft_heldout`) |
| `n_tasks` | Number of tasks in the evaluated set |
| `n_seeds` | Number of training seeds in this run |
| `rate` | Success rate (%) |
| `se` | Standard error across seeds (%) |

All rate values are in **percent (0–100)**.
