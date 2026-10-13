1. Full Tuple Coverage is not necessary

2. Only one demonstrations per different instruction can solve large ood problem. skills are already inside the model parameters. just instruction not aligned. 

3. for dependent instructions, full coverage is required.

## Website evidence update (2026-10-04)

The numbered notes above are early research notes. The website uses the more
qualified interpretation below: relevant dependency coverage matters; full tuple
coverage is not generally required, and pairwise coverage is not a universal
guarantee.

Sources checked: the 19-page `corl_2026_cg.pdf` and the one-page author response
supplied alongside it in the workspace's `cg_paper` directory. The author-response
experiments are labeled separately from the main Q1–Q3 website figures. The
modularity revision additionally checks `cg/rebuttal/data.md`,
`cg/rebuttal/plot_violation_comparison.py`, and the website's original 48-task
summary CSV; no comparison values are estimated from images. Further Findings now
reproduces the paper's comparison with stage-wise modular policies (Section 5.4,
Figure 9). The other author-response findings remain below as a research record,
not a list of currently displayed homepage panels.

| Evidence reviewed | Source | Reported evidence and interpretation |
| --- | --- | --- |
| Stage-wise modularity | Author response Q2 and Q9; paper §4.1; `cg/rebuttal/data.md` | Independent PPP: OOD 72.3 ± 2.7%, 81.0 ± 2.6%, 83.3 ± 1.1%, 77.7 ± 3.2% at B=4/8/16/24 with an oracle stage indicator. Source data identifies these as mean ± **SD**, three seeds. Displayed in Further Findings panel (a) as mean ± SD, as in Figure 9a, next to the Q1 full-instruction curve and the orthogonal-16 point. |
| Dependency violations | Rebuttal per-seed `violation/placed` table and plotting dictionary; `q3/48tasks/data/l4_2s_no_cont0_summary.csv` | The comparison plots active-instruction-only and full-instruction policies using conditional same-container violations, mean ± **SEM**. Cov16 OOD: 24.50 ± 0.90% (2 seeds) versus 13.7223 ± 1.2791% (5 seeds). Full training is a separate ID reference: 24.37 ± 0.54% (3 seeds) versus 12.0276 ± 0.8424% (5 seeds). Full has no held-out tasks. Displayed in Further Findings panel (b) as Cov16 ID, Cov16 OOD, and Full ID, matching the paper's Figure 9b, with the active-instruction bars as SD over seeds (24.1 ± 0.6, 24.5 ± 1.3, 24.4 ± 0.9); Cov6–Cov12 are not shown. |
| Longer tasks | Author response Q3 | Separate four-stage, 144-task experiment: strength 2 uses 18 tasks (1/8); strength 3 uses 48 (1/3) and has similar ID/OOD success. Task budget changes too, so this does not isolate coverage strength. No success rates were digitized from the plot. |
| Evaluation controls | Author response Q1 | Total demonstration budget fixed across training-set sizes, sampled uniformly over selected tasks. Seeds vary sampling and initialization. Separate 2S-PP trial check: 5/10/15/30 trials give OOD 15.00/15.70/16.30/15.89%. The response does not specify the 36- or 48-task variant. |
| Partial-input ablation | Author response Q6 | Separate pick-and-place experiment, five seeds: 71.05 ± 5.00% with object and container versus 49.95 ± 1.14% with object only. The error convention is unspecified. This is not the full 2S-PP success rate. |
| Human demonstrations | Author response Q7 | Three choices for each of three factors, 30 demonstrations per task, B=9 orthogonal training: 11.67% ID and 12.96% OOD. Preliminary, with low absolute success. The homepage does not claim real-world transfer or use the response's chance comparison. |
| VLA scope | Paper §6, p. 8 | Main experiments train policies from scratch atop a frozen vision encoder. Large pretrained VLA evaluation remains future work. |

### Existing-result clarifications

- Q1 random-coverage statistics are means and SEM across three task-set means,
  each averaging three training seeds. Fixed B=4, full B=64, and Orthogonal-16
  report SEM across seeds. B=4 does have uncertainty; see `q1/data/description.md`.
- The full B=64 "OOD" export duplicates ID, since no tasks remain held out.
  The homepage labels 78.6% as the full-training ID reference. This chart export
  and the viewer's per-experiment export are separate snapshots; their numbers
  have not been overwritten to force agreement.
- Q2 is Pick–Place–Press. B=4 and B=6 pretraining sets are diagonal; B=8 is
  random coverage. The 0.4% → 54.7% headline uses the B=4 split relative to
  pretraining. Full-set finetuning supplies one demonstration for each of all
  64 instructions, including the pretraining-held-out slice.
- Homepage Q3 remains the 48-task, five-seed experiment. Standalone Q3 remains
  the 36-task experiment. The four-stage result is a separate experiment.
- The Q3 board counts distinct legal first-placement cases, not demonstration
  trajectories. The constraint leaves multiple valid first destinations.

### Presentation choices

Further Findings reproduces the paper's comparison with stage-wise modular
policies (Section 4.1, Section 5.4, Figure 9). It states the information
difference between the two policy classes in one line each and draws a two-panel
canvas figure in `assets/js/home/findings.js`, with the key point in each panel
title and in-plot labels. Panel (a) plots OOD success against B on Pick–Place–Press
for the oracle-stage modular policy and for the full-instruction policy with random
and orthogonal task sets. Panel (b) plots the wrong-container rate at the first
placement in the 48-task dependent two-stage task for Cov16 (ID and OOD) and Full
(ID). Error bars reproduce Figure 9: SD over seeds for the active-instruction series
and SEM for the full-instruction series, as the caption states. The values come from
the paper's Figure 9 source folder (`cgfiles/gt`). The earlier information-flow diagram, the
Cov6–Cov12 violation bars, and the truncated-axis chart were removed. The plotted
values and their sources are listed in `assets/data/modularity_comparison.csv` and
`assets/data/modularity_comparison.md`.

The comparison isolates constraint handling. At Cov16, OOD task success is 39.3%
for the modular policy (two seeds) versus 31.4% for the full-instruction policy
(five seeds); the homepage no longer states this. No statistical-significance claim is
made. The author response itself, reviewer correspondence, and the flow-loss
checkpoint table are omitted from the homepage.

The task cube now uses a generated classic-script copy of the unmodified JSON
export and the same Three.js r128 library bundled locally. This avoids `file://`
JSON-fetch restrictions and dependence on the renderer CDN. The integrity checker
requires the browser script to match the canonical JSON exactly, including order.
