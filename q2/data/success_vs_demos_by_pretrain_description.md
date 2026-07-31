# success_vs_demos_by_pretrain — Data Description

## Experiment

**Script:** `ft_res/analysis/plot_success_vs_demos_by_pretrain.py`

This dataset compares finetuning success rates at demo budgets {0, 64, 128} across
four pretrain checkpoints that differ in the number of pretraining tasks (B).
All curves use the same FT setup: full 64-task L5 set as the FT training set.
Slices are defined relative to each checkpoint's own pretraining task set.

## Pretrain checkpoints (one curve each, ordered by B)

| pretrain_key | label | B | Description |
|---|---|---|---|
| `diag_B4` | B=4 | 4 | Pretrained on `diag_B4` (4 tasks); single-seed baseline |
| `diag_03` | B=6 | 6 | Pretrained on `diag_03` (6 tasks); single-seed baseline |
| `random_coverage` | B=8 | 8 | Pretrained on `random_coverage_s0_B8` (8 tasks); single-seed baseline |
| `orthogonal` | B=16 (orthogonal) | 16 | Pretrained on Orthogonal-16 set (16 tasks); single-seed baseline |

The baseline point (n_demos=0) uses a single seed from the pretrain checkpoint.
FT points (n_demos=64, 128) pool over all available training seeds.

## Metrics

Slices are defined relative to each checkpoint's own pretraining task set:

| Column prefix | Description |
|---|---|
| `all_*` | Total success rate over all 64 eval tasks |
| `id_*` | In-distribution: eval tasks that were in this checkpoint's pretraining set |
| `ood_*` | Out-of-distribution: eval tasks NOT in this checkpoint's pretraining set |

## File: `success_vs_demos_by_pretrain.csv`

One row per `(pretrain_key, n_demos)` cell.

| Column | Description |
|---|---|
| `pretrain_key` | Checkpoint identifier |
| `label` | Display label (e.g. `B=4`) |
| `n_id_tasks` | Number of ID tasks for this checkpoint |
| `n_demos` | Number of finetuning demos (0 = no FT, pre-train baseline) |
| `{all,id,ood}_rate` | Pooled success rate (%) |
| `{all,id,ood}_se` | Standard error across seeds (%) |
| `n_seeds` | Number of seeds used |

All rate values are in **percent (0–100)**.
