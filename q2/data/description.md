# ft_success_vs_demos — Data Description

## Experiment

**Script:** `ft_res/analysis/plot_ft_success_vs_demos.py`

This dataset tracks finetuning (FT) success rates as a function of the number of
demonstration examples provided, for an L5 transformer policy finetuned from
pretrained checkpoints.

## Pretrain families

| pretrain key | pretrain_id | Description |
|---|---|---|
| `diag03` | `diag_03` | Pretrained on 6-task `diag_03` subset |
| `diagB4` | `diag_B4` | Pretrained on 4-task `diag_B4` subset |
| `scratch` | — | No pretraining; full-set training from scratch (if present) |

## FT groups

| group key | task_set_id | Description |
|---|---|---|
| `full` | `full` | FT on the full 64-task L5 set |
| `orth` | `orthogonal` | FT on the Orthogonal-16 task set (16 tasks) |
| `pretrain (no FT)` | — | Baseline evaluation with the pretrained checkpoint, no FT |

## Metrics

ID/OOD slices are defined **relative to each pretrain's own training task set**:

| Column prefix | Description |
|---|---|
| `all_*` | Total success rate over all 64 eval tasks |
| `id_*` | In-distribution: eval tasks that were in the pretrain training set |
| `ood_*` | Out-of-distribution: eval tasks NOT in the pretrain training set |

## File: `ft_success_vs_demos.csv`

One row per `(pretrain, group, n_demos)` cell.

| Column | Description |
|---|---|
| `pretrain` | Pretrain family key (`diag_03`, `diag_B4`, `scratch`, `scratch_vs_<pretrain>`) |
| `n_id_tasks` | Number of ID tasks for this pretrain |
| `group` | FT group key (`full`, `orth`, `pretrain (no FT)`, `scratch_full`) |
| `ft_task_set_size` | Number of tasks in the FT training set |
| `n_demos` | Total number of finetuning demos |
| `demos_per_task` | Average demos per FT task (`n_demos / ft_task_set_size`) |
| `n_seeds` | Number of training seeds pooled |
| `{all,id,ood}_rate` | Pooled success rate (%) |
| `{all,id,ood}_ci_lo/hi` | Wilson 95% confidence interval bounds (%) |
| `{all,id,ood}_se` | Standard error across seeds (%) |

`scratch_vs_<pretrain>` rows re-aggregate scratch summaries using each pretrain's
ID/OOD task split so the scratch OOD curve is directly comparable to the FT OOD curve.

All rate values are in **percent (0–100)**.
