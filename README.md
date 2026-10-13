# Diagnosing Compositional Generalization in Sequential Robot Tasks

Source for the [public project website](https://yixiaowang7.github.io/Diagnosing_Compositional_Generalization_Robot_Page/).
The site uses plain HTML, CSS, and JavaScript. GitHub Pages serves the files directly; there is no build step or package installation.

## Preview and check

From this repository:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000>. You can also open `index.html` directly: the results viewer's renderer and dataset load from local scripts, with no CDN or JSON fetch required.

```sh
python3 scripts/check_site.py
```

The checker validates local links, assets, fragment targets, and viewer data. If Node.js is installed, it also checks JavaScript syntax. Browser checks cover layout and interactions.

## File map

| Location | Purpose |
| --- | --- |
| `index.html` | Homepage content, authors, affiliation, venue badge, links, Code & Data resources, and citation |
| `corl_2026_cg.pdf` | Published paper, retained at its existing URL |
| `assets/css/site.css` | Homepage layout, theme variables, and scoped experiment styles |
| `assets/css/q1.css`, `q2.css`, `q3.css`, `results.css` | Standalone figure and viewer styles |
| `assets/js/home/` | Shared palette, optional Q1–Q3 figures, the Further Findings figure, section navigation, scroll animation, citation copying |
| `assets/js/standalone/` | Scripts for the standalone Q1–Q3 pages |
| `assets/js/results.js` | Pick–Place–Press viewer initialization and interactions |
| `assets/js/vendor/` | Existing Three.js r128 renderer, bundled locally with its MIT license |
| `assets/images/` | Paper figures, including the retained source variants |
| `assets/data/modularity_comparison.csv`, `.md` | Values plotted in the Further Findings figure and their provenance |
| `q1/`, `q2/`, `q3/` | Standalone pages, original CSV exports, and data descriptions |
| `results/` | Interactive viewer, original `data.json`, and generated browser script `data.js` |
| `docs/research-notes.md` | Original research notes and provenance for the website's additional findings |
| `scripts/` | Local integrity checks and viewer-data export |

The homepage Q3 uses the **48-task** experiment; standalone Q3 uses the **36-task** experiment. These are separate views with separate scripts. Q1 standalone includes both Pick-and-Place and Pick–Place–Press; the homepage emphasizes Pick–Place–Press.

## Editing this project

- Edit paper text and links in `index.html`. Theme colors are CSS custom properties near the top of `assets/css/site.css`.
- The homepage groups content into Overview, Generalization Framework, Experiments, Further Findings, Code & Data, and Citation. Code & Data lists the code repository, the `robot_envs` simulator, and the three Hugging Face datasets (`yixiiiiii/cg_l4_1s`, `cg_l5`, `cg_l4_2s`); keep it in sync with the code repository README. The BibTeX entry matches that README and cites the arXiv preprint (2607.29687). Its sticky navigation uses native anchors with an active-section indicator in `assets/js/home/init.js`; preserve the section IDs when editing.
- Further Findings reproduces the paper's comparison with stage-wise modular policies (Section 4.1, Section 5.4, Figure 9) with two one-line policy definitions and a two-panel canvas figure drawn by `assets/js/home/findings.js`. The key point of each panel is in its title and in-plot labels, without extra paragraphs. The plotted values are hard-coded in that script and exported in `assets/data/modularity_comparison.csv`; `assets/data/modularity_comparison.md` lists their sources. Keep the script, the CSV, and the canvas `aria-label` text in sync.
- Edit each homepage experiment in its corresponding `assets/js/home/q*.js`. Its CSS is scoped under `#q1`, `#q2`, or `#q3` in the homepage stylesheet.
- The small chart arrays are presentation snapshots of the CSV exports; changing a CSV does not automatically change the charts. Check the associated data descriptions, split, task budget, and seed counts when updating them.
- `results/data.json` contains the original viewer data: 53 experiments over 64 task identities. Keep its `meta` and `experiments` structure and key order when replacing an export; the first experiment is the initial selection.
- After changing that JSON, run `python3 scripts/export_viewer_data.py` to regenerate `results/data.js`. The checker detects a stale script. Commit both exports; no generation is needed to browse the site.
- The bundled renderer is the unchanged [Three.js r128 build](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) previously loaded from the CDN. Its license is in `assets/js/vendor/LICENSE.three.txt`.
- Replace the paper at its existing filename to preserve shared links. Put new figures in `assets/images/` and use relative paths.
- Keep the homepage scripts in this order: shared setup, Q1, Q2, Q3, Further Findings, initialization. Each figure skips initialization if its section has been removed.

`Pick_Place_Press_Full_Results.html` redirects older shared links to `results/index.html`. Existing Q1–Q3 and CSV URLs also remain available.

## Reuse for another research project

This repository is a reusable starting point for a paper website. The experiment visualizations are examples specific to this paper.

1. Copy the repository into a new project. If the owner enables GitHub's **Template repository** setting, **Use this template** creates the new repository from these files.
2. Replace the document title, heading, authors, affiliation, abstract, summary, citation, and publication links in `index.html`. Update this README's project name and public URL.
3. Replace the PDF and images with the new project's assets and update their links. The current PDF filename is retained only to preserve this site's published URL; a new project can use `paper.pdf`.
4. Keep, replace, or remove each experiment section. Remove unused figure script tags and standalone folders along with links to them. The shared theme, citation controls, and animation registry work with any number of registered figures, including zero.
5. Remove the task viewer, its data exports, renderer, and the legacy redirect if the new project does not need them. Its cube is specific to this paper's 4 × 4 × 4 task space.
6. Replace research notes and experiment datasets with your own. Search for this project's title, author names, repository name, and paper filename before publishing.
7. Run the checks and preview at desktop and mobile widths. Enable GitHub Pages for the new repository and verify its public URL. Relative asset paths support different repository names and URL prefixes.

The organization follows the plain static-site approach used by [Nerfies](https://github.com/nerfies/nerfies.github.io) and the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template).

## Publish

After checking the changes, commit and push to `main`. The existing GitHub Pages deployment publishes this repository. Verify the homepage, paper, standalone figures, and results viewer after deployment.

Local backups belong in `.local-backups/`; Git ignores that folder, `.DS_Store`, and `*.bak` files.
