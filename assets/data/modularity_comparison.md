# Stage-wise modular comparison: data provenance

[`modularity_comparison.csv`](modularity_comparison.csv) holds every value plotted in the
Further Findings figure, which reproduces Figure 9 of the paper (Section 5.4, *Comparison
with stage-wise modular policies*). The same values are hard-coded in
`assets/js/home/findings.js`; keep the two in sync. All rates are percentages. `err` is the
half-width of the plotted error bar and `err_kind` names its convention: `sd` is the sample
standard deviation over seeds, `sem` the standard error of the mean over the replicates named
in `replicate_kind`. The mixed convention follows Figure 9 as published.

## Primary sources

The values come from the paper's Figure 9 source folder (`cgfiles/gt`, outside this checkout):

- `data.md`: the active-instruction (modular) results, reported as mean ± SD over seeds.
- `l5_b_vs_ood_success.csv`: the full-instruction OOD success rates versus B, mean ± SEM.
- `l4_2s_no_cont0_48_tasks_report.md`: the 48-task two-stage results, mean ± SEM over five seeds.
- `plot_policy_comparison.py`: the script that renders Figure 9 from the files above.

## Policies

- **active-instruction-gt-stage**: the stage-wise modular policy of paper Section 4.1. A
  ground-truth stage indicator selects the active stage, and the policy receives only the
  current instruction component.
- **full-instruction**: the end-to-end policy conditioned on the full instruction, used in
  Q1–Q3. In panel (a), `-random` denotes B randomly drawn training tasks and `-orthogonal`
  the orthogonal 16-task set.

## Panel (a): Pick–Place–Press, 64 tasks

`success_rate` is the OOD success rate on tasks not seen in training.

- Active instruction: one task set per B, three seeds (s11/s22/s33); mean ± SD. The per-seed
  rates are listed in the `l5_gt_indicator` OOD table of `cg/rebuttal/data.md`.
- Full instruction (random): identical to the `ood` rows of `q1/data/success_vs_b.csv` at
  B = 4, 8, 16, 24. For B ≥ 8, three task sets × three seeds with SEM across task-set means;
  B = 4 is the fixed diagonal set with SEM across three seeds. Figure 9a also scatters the
  per-task-set means; the website omits them.
- Full instruction (orthogonal): identical to the `ood` row of `q1/data/success_vs_b_ortho.csv`.

## Panel (b): 48-task dependent two-stage Pick-and-Place

`wrong_container_rate` is `100 × same-container violations / first-object placements`,
computed per seed and then averaged. It is `violation/placed` in the source tables and
`pc_same_container_given_place_obj0` in the Q3 export. Lower is better. Cov16 covers all 16
dependent (o1, c2) pairs and keeps held-out tasks; Full trains on all 48 tasks and has no
held-out tasks.

- Active instruction: the `cov16` and `full` rows of the table in `data.md`; mean ± SD over
  two seeds (Cov16) and three seeds (Full). Checked against the per-seed `violation/placed`
  table under `l4_2s_infer_cont0_gt_indicator` in `cg/rebuttal/data.md`.
- Full instruction: the `id` and `ood` rows for `pc_same_container_given_place_obj0` in
  `q3/48tasks/data/l4_2s_no_cont0_summary.csv` (condition `orthogonal` is labeled Cov16);
  mean ± SEM over five seeds, as in the 48-task report.

No values were estimated from images, and no statistical-significance claim is made.
