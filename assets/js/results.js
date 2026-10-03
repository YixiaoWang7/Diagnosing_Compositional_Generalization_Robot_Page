'use strict';

// Load the viewer's dataset before initializing controls or WebGL.
(async function () {
  const viewport = document.getElementById('viewport');
  const status = document.getElementById('viewer-status');
  const controls = document.querySelectorAll('#topbar button, #topbar select, .show-all-btn');
  try {
    const response = await fetch(viewport.dataset.resultsSrc);
    if (!response.ok) throw new Error('Results request failed: ' + response.status);
    const data = await response.json();
    initResults(data);
    controls.forEach((control) => { control.disabled = false; });
    status.hidden = true;
  } catch (error) {
    status.textContent = 'Results could not be loaded. Please reload the page.';
    status.setAttribute('role', 'alert');
    console.error(error);
  }
})();

function initResults(DATA) {
  const OBJECTS     = DATA.meta.objects;
  const RECS        = DATA.meta.receptacles;
  const COLORS      = DATA.meta.colors;
  const EXP_KEYS    = Object.keys(DATA.experiments);

  // ── three.js setup ───────────────────────────────────────────────────────────
  const vp  = document.getElementById('viewport');
  const cvs = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xeef1f6, 1);

  // ── cube geometry ────────────────────────────────────────────────────────────
  // Declared before the camera because fitCam() reads EDGE on first resize().
  // PITCH is the centre-to-centre spacing of the blocks; with the block size S (see the
  // blocks section) the visible gap between neighbours is PITCH - S, so raising PITCH alone
  // spreads the cube out without changing how big each block reads. EDGE trails PITCH so
  // the axis labels stay just outside the outermost blocks.
  const PITCH = 1.70;
  const POS = [-1.5, -.5, .5, 1.5].map((k) => k * PITCH);
  const EDGE = 1.5 * PITCH + 1.35;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 200);
  // camR is derived from the cube's extent in fitCam() rather than hand-tuned, so changing
  // PITCH (below) reframes the view automatically instead of cropping it.
  let camR = 18, camT = -0.55, camP = 0.45;
  let userZoomed = false;

  // The axis labels hang off the negative side of each axis only, so the content is not
  // centred on the origin. Aim a little that way, or the labelled corner clips.
  const AIM = -0.55;

  function setCam() {
    camera.position.set(
      AIM + camR * Math.sin(camT) * Math.cos(camP),
      AIM + camR * Math.sin(camP),
      AIM + camR * Math.cos(camT) * Math.cos(camP));
    camera.lookAt(AIM, AIM, AIM);
  }
  setCam();

  // Distance at which the whole labelled cube fits, honouring BOTH axes: for a perspective
  // camera the horizontal field of view is the vertical one scaled by the aspect ratio, so a
  // narrow viewport needs a larger radius than the vertical fit alone would suggest.
  function fitCam() {
    if (userZoomed) return;
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    // Half-extent of the content, including the axis labels sitting out at EDGE.
    const half = (EDGE + 0.9) * Math.SQRT2;
    camR = Math.max(half / Math.tan(vFov / 2), half / Math.tan(hFov / 2));
    setCam();
  }

  function resize() {
    const w = vp.clientWidth, h = vp.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    fitCam();
  }
  resize();
  window.addEventListener('resize', resize);

  // Lighting is deliberately flat: mostly ambient with a weak directional, so a block's
  // colour comes from its data value rather than from which way its faces happen to point.
  // Turning the directional light up makes the darker faces read as a different series.
  scene.add(new THREE.AmbientLight(0xffffff, .88));
  const sun = new THREE.DirectionalLight(0xffffff, .28);
  sun.position.set(7, 10, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaab4d0, .12);
  fill.position.set(-5, -5, -7); scene.add(fill);

  // ── axis labels ──────────────────────────────────────────────────────────────
  function makeLabel(text, pos, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = color || '#33415c';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .7 }));
    sp.scale.set(2.2, .55, 1);
    sp.position.copy(pos);
    scene.add(sp);
    return sp;
  }

  OBJECTS.forEach((o, i) => makeLabel(o, new THREE.Vector3(POS[i], -EDGE, -EDGE)));
  RECS.forEach((r, i) => makeLabel(r.replace('_',' '), new THREE.Vector3(-EDGE, POS[i], -EDGE)));
  COLORS.forEach((c, i) => makeLabel(c, new THREE.Vector3(-EDGE, -EDGE, POS[i])));
  makeLabel('Object (X)', new THREE.Vector3(0, -EDGE - .7, -EDGE), '#2c3a52');
  makeLabel('Receptacle (Y)', new THREE.Vector3(-EDGE, 0, -EDGE - .7), '#2c3a52');
  makeLabel('Button (Z)', new THREE.Vector3(-EDGE - .9, -EDGE, 0), '#2c3a52');

  // ── blocks ───────────────────────────────────────────────────────────────────
  const S   = .86;
  const GEO = new THREE.BoxGeometry(S, S, S);
  const EGEO= new THREE.EdgesGeometry(GEO);

  // Per-series hue, saturation, and lightness ramp [light@0%, light@100%].
  // The two series have to stay tellable apart when hundreds of translucent blocks overlap,
  // so they are separated on lightness as well as hue: held-out is a distinctly LIGHTER
  // orange than the trained blue is a blue. Keep the ranges from overlapping.
  const ID_HUE  = [.578, .36, .70, .46];
  const OOD_HUE = [.072, .70, .82, .63];

  // Text-weight versions of the two series colours. The block ramps above are deliberately
  // pale so hundreds of translucent cubes stay legible, which is too light to read as type —
  // these are the same hues taken darker, for labels and numbers in the sidebar/tooltip.
  const SERIES_ID_TEXT  = '#3f6b91';
  const SERIES_OOD_TEXT = '#b9702f';
  const MISS_COL= 0xc7ccd6;

  // Fixed pseudo-rate (0–100) fed into the OOD color function for each pair bin.
  // Encodes the bin as a lightness level: 0_pair=darkest … 3_pair=brightest.
  // Train cells use the ID color with their actual success rate.
  const PAIR_PSEUDO_RATE = { '3_pair': 100, '2_pair': 65, '1_pair': 35, '0_pair': 5 };

  let colorMode = 'id_ood';

  const blocks = [];
  const meshMap = new Map();

  function hslToHex(h, s, l) {
    const c = new THREE.Color(); c.setHSL(h, s, l); return c.getHex();
  }

  function cellColor(isId, rate) {
    if (rate === null || rate === undefined) return MISS_COL;
    const t = rate / 100;
    const h = isId ? ID_HUE : OOD_HUE;
    // h[2] is the 0% lightness, h[3] the 100% lightness — higher success reads darker.
    return hslToHex(h[0], h[1], h[2] + (h[3] - h[2]) * t);
  }

  function cellColorByPairs(pairOverlap, rate) {
    if (rate === null || rate === undefined) return MISS_COL;
    if (pairOverlap === 'train') return cellColor(true, rate);
    const pseudo = PAIR_PSEUDO_RATE[pairOverlap] ?? 50;
    return cellColor(false, pseudo);
  }

  function getBlockColor(cell) {
    return colorMode === 'pairs'
      ? cellColorByPairs(cell.pair_overlap, cell.mean_success)
      : cellColor(cell.is_id, cell.mean_success);
  }

  // Opacity is FLAT within a series — it deliberately does not encode the success rate.
  // Success is already carried by lightness in cellColor(); when opacity varied with it too,
  // the same series rendered from pale wash to deep navy and read as two different colours.
  // The only difference between the series is that held-out blocks outnumber trained ones by
  // roughly 3:1, so they sit slightly more transparent to keep the blue set visible.
  function cellOpacity(rate, isId) {
    if (rate === null || rate === undefined) return .10;
    return isId ? .78 : .50;
  }

  function pairLabel(cell) {
    if (cell.pair_overlap === 'train') return 'all 3 (this exact task was trained on)';
    if (cell.pair_overlap === '1_pair') return '1 seen pair';
    if (cell.pair_overlap) return cell.pair_overlap.replace('_pair', ' seen pairs');
    return 'n/a';
  }

  function buildBlocks(cells) {
    blocks.forEach(b => { scene.remove(b.mesh); scene.remove(b.lines); b.mesh.material.dispose(); b.lines.material.dispose(); });
    blocks.length = 0; meshMap.clear();

    cells.forEach(c => {
      const [xi, yi, zi] = c.coords;
      const col = getBlockColor(c);
      const op  = cellOpacity(c.mean_success, c.is_id);

      // MeshLambertMaterial, not Phong: specular highlights on a few hundred overlapping
      // translucent cubes read as noise, and they hit the orange series hardest (its faces are
      // lighter, so a highlight blows out to near-white and the block loses its colour).
      // Flat diffuse shading keeps every face's hue legible.
      const mesh = new THREE.Mesh(GEO, new THREE.MeshLambertMaterial({
        color: col, transparent: true, opacity: op,
        side: THREE.DoubleSide, depthWrite: false,
      }));
      mesh.position.set(POS[xi], POS[yi], POS[zi]);
      mesh.renderOrder = 1;

      const edgeCol = c.mean_success != null ? col : 0x99a3b3;
      const lines = new THREE.LineSegments(EGEO, new THREE.LineBasicMaterial({
        color: edgeCol, transparent: true, opacity: Math.min(.85, op + .2),
      }));
      lines.position.copy(mesh.position);
      lines.renderOrder = 2;

      scene.add(mesh); scene.add(lines);
      const blk = { mesh, lines, cell: c, baseCol: col, baseOp: op };
      blocks.push(blk);
      meshMap.set(mesh.uuid, blk);
    });
  }

  // ── layer visibility ─────────────────────────────────────────────────────────
  const layerVis = { x: [true,true,true,true], y: [true,true,true,true], z: [true,true,true,true] };

  function updateVis() {
    blocks.forEach(b => {
      const [xi,yi,zi] = b.cell.coords;
      const vis = layerVis.x[xi] && layerVis.y[yi] && layerVis.z[zi];
      let show = vis;
      if (curFilter === 'id'  && !b.cell.is_id) show = false;
      if (curFilter === 'ood' &&  b.cell.is_id) show = false;
      b.mesh.visible  = show;
      b.lines.visible = show;
    });
  }

  function rebuildBlocks() {
    buildBlocks(DATA.experiments[curExp].cells);
    updateVis();
  }

  function setColorMode(m) {
    colorMode = m;
    document.querySelectorAll('[data-cmode]').forEach(b =>
      b.classList.toggle('active', b.dataset.cmode === m));
    rebuildBlocks();
    renderLegend();
  }

  function buildLayerUI() {
    const box = document.getElementById('layers');
    box.innerHTML = '';
    ['x','y','z'].forEach(axis => {
      const labels = axis === 'x' ? OBJECTS : axis === 'y' ? RECS : COLORS;
      const row = document.createElement('div'); row.className = 'layer-row';
      const lbl = document.createElement('span'); lbl.className = 'layer-axis-label';
      lbl.textContent = axis.toUpperCase();
      row.appendChild(lbl);
      const dots = document.createElement('div'); dots.className = 'layer-dots';
      labels.forEach((name, i) => {
        const d = document.createElement('div'); d.className = 'ldot';
        d.title = `${axis.toUpperCase()}=${i} (${name})`;
        d.textContent = i;
        d.addEventListener('click', () => {
          layerVis[axis][i] = !layerVis[axis][i];
          d.classList.toggle('hidden', !layerVis[axis][i]);
          updateVis();
        });
        dots.appendChild(d);
      });
      row.appendChild(dots);
      box.appendChild(row);
    });
  }
  buildLayerUI();

  function showAllLayers() {
    ['x','y','z'].forEach(a => layerVis[a].fill(true));
    document.querySelectorAll('.ldot').forEach(d => d.classList.remove('hidden'));
    updateVis();
  }

  // ── filter ────────────────────────────────────────────────────────────────────
  let curFilter = 'all';
  function setFilter(f) {
    curFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
    updateVis();
  }

  // ── experiment switching ─────────────────────────────────────────────────────
  let curExp = EXP_KEYS[0];

  function renderLegend() {
    const legBox = document.getElementById('legend-box');
    legBox.innerHTML = '';
    function addLeg(col, label) {
      const r = document.createElement('div'); r.className = 'legend-row';
      const sw = document.createElement('div'); sw.className = 'legend-swatch';
      sw.style.background = '#' + col.toString(16).padStart(6, '0');
      const t = document.createElement('span'); t.textContent = label;
      r.appendChild(sw); r.appendChild(t); legBox.appendChild(r);
    }
    if (colorMode === 'pairs') {
      addLeg(cellColor(true, 75),    'Trained on this task');
      addLeg(cellColor(false, 100),  'Held out — all 3 pairs seen');
      addLeg(cellColor(false, 65),   'Held out — 2 pairs seen');
      addLeg(cellColor(false, 35),   'Held out — 1 pair seen');
      addLeg(cellColor(false, 5),    'Held out — no pair seen');
      addLeg(MISS_COL, 'Not evaluated');
    } else {
      addLeg(cellColor(true,  100), 'Trained — 100% success');
      addLeg(cellColor(true,   50), 'Trained — 50%');
      addLeg(cellColor(true,    0), 'Trained — 0%');
      addLeg(cellColor(false, 100), 'Held out — 100% success');
      addLeg(cellColor(false,  50), 'Held out — 50%');
      addLeg(cellColor(false,   0), 'Held out — 0%');
      addLeg(MISS_COL, 'Not evaluated');
    }
  }

  function renderSidebar() {
    const exp = DATA.experiments[curExp];

    const statsBox = document.getElementById('stats');
    statsBox.innerHTML = '';
    function addStat(val, lbl, sub, color) {
      const d = document.createElement('div'); d.className = 'stat-box';
      d.innerHTML = '<div class="stat-val" style="color:' + (color||'#4a7396') + '">' + val + '</div>'
        + '<div class="stat-lbl">' + lbl + '</div>'
        + (sub ? '<div class="stat-sub">' + sub + '</div>' : '');
      statsBox.appendChild(d);
    }
    addStat(exp.n_train, 'Trained on', 'of 64 tasks');
    addStat(exp.id_rate != null ? exp.id_rate + '%' : 'n/a', 'Trained tasks',
      exp.id_episodes + ' rollouts', SERIES_ID_TEXT);
    addStat(exp.ood_rate != null ? exp.ood_rate + '%' : 'n/a', 'Held-out tasks',
      exp.ood_episodes > 0 ? exp.ood_episodes + ' rollouts' : 'not evaluated', SERIES_OOD_TEXT);

    renderLegend();

    const pairBox = document.getElementById('pair-box');
    pairBox.innerHTML = '';
    const pairLabels = { train: 'Trained on', '3_pair': 'Held out, 3 pairs seen', '2_pair': 'Held out, 2 pairs seen', '1_pair': 'Held out, 1 pair seen', '0_pair': 'Held out, no pair seen' };
    for (const [k, lab] of Object.entries(pairLabels)) {
      const p = exp.pair_overlap[k];
      if (!p) continue;
      const r = document.createElement('div'); r.className = 'pair-row';
      r.innerHTML = '<span class="pair-label">' + lab + ' (' + p.episodes + ' rollouts)</span><span class="pair-val">' + p.pc_success + '%</span>';
      pairBox.appendChild(r);
    }

    function fillFactor(id, dim) {
      const el = document.getElementById(id); el.innerHTML = '';
      const rates = exp.factor_rates[dim];
      for (const [name, val] of Object.entries(rates)) {
        const c = document.createElement('div'); c.className = 'factor-cell';
        const bg = val != null ? 'rgba(74,115,150,' + (.05 + val / 100 * .18) + ')' : 'transparent';
        c.style.background = bg;
        c.innerHTML = '<span class="fc-name">' + name.replace('_',' ') + '</span><span class="fc-val">' + (val != null ? val + '%' : '—') + '</span>';
        el.appendChild(c);
      }
    }
    fillFactor('factor-obj', 'object');
    fillFactor('factor-rec', 'receptacle');
    fillFactor('factor-col', 'color');
  }

  function switchExp(key) {
    curExp = key;
    const sel = document.getElementById('exp-select');
    if (sel && sel.value !== key) sel.value = key;
    rebuildBlocks();
    renderSidebar();
  }

  // build experiment dropdown grouped by budget B
  const expSel = document.getElementById('exp-select');
  const budgetMap = {};
  EXP_KEYS.forEach(k => {
    const b = DATA.experiments[k].n_train;
    if (!budgetMap[b]) budgetMap[b] = [];
    budgetMap[b].push(k);
  });
  Object.keys(budgetMap).sort((a, b) => +a - +b).forEach(b => {
    const og = document.createElement('optgroup');
    og.label = 'B = ' + b;
    budgetMap[b].forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = DATA.experiments[k].label;
      og.appendChild(opt);
    });
    expSel.appendChild(og);
  });
  expSel.addEventListener('change', () => switchExp(expSel.value));

  switchExp(EXP_KEYS[0]);

  // ── tooltip ──────────────────────────────────────────────────────────────────
  const ttEl = document.getElementById('tooltip');
  const RC   = new THREE.Raycaster();
  const NDC  = new THREE.Vector2();

  function rayHit(ex, ey) {
    const r = cvs.getBoundingClientRect();
    NDC.x =  ((ex - r.left) / r.width) * 2 - 1;
    NDC.y = -((ey - r.top) / r.height) * 2 + 1;
    RC.setFromCamera(NDC, camera);
    const vis = blocks.filter(b => b.mesh.visible).map(b => b.mesh);
    const hits = RC.intersectObjects(vis);
    return hits.length ? meshMap.get(hits[0].object.uuid) : null;
  }

  let hovBlk = null;
  function setHover(b) {
    if (b === hovBlk) return;
    if (hovBlk) {
      hovBlk.lines.material.color.setHex(hovBlk.baseCol);
      // must match the edge opacity used in buildBlocks, or un-hovering leaves it brighter
      hovBlk.lines.material.opacity = Math.min(.85, hovBlk.baseOp + .2);
    }
    hovBlk = b;
    if (b) { b.lines.material.color.setHex(0x111418); b.lines.material.opacity = 1; }
  }

  function showTooltip(blk, ex, ey) {
    if (!blk) { ttEl.style.display = 'none'; setHover(null); return; }
    setHover(blk);
    const c = blk.cell;
    const idLabel = c.is_id
      ? '<span class="tt-id" style="color:' + SERIES_ID_TEXT + '">Trained on this task</span>'
      : '<span class="tt-id" style="color:' + SERIES_OOD_TEXT + '">Held out &mdash; never trained on</span>';
    const rateStr = c.mean_success != null ? c.mean_success.toFixed(1) + '%' : 'not evaluated';
    const sdStr   = c.sd != null && c.n_seeds > 1 ? ' (sd ' + c.sd.toFixed(1) + ')' : '';
    const seedStr = c.n_seeds > 0 ? c.n_seeds + ' seed' + (c.n_seeds > 1 ? 's' : '') : 'no data';
    const perSeed = c.per_seed && c.per_seed.length ? c.per_seed.map(v => v.toFixed(0) + '%').join(', ') : '';
    const barW = c.mean_success != null ? Math.max(2, c.mean_success) : 0;
    const barCol = colorMode === 'pairs'
      ? '#' + cellColorByPairs(c.pair_overlap, c.mean_success).toString(16).padStart(6, '0')
      : (c.is_id ? SERIES_ID_TEXT : SERIES_OOD_TEXT);

    ttEl.innerHTML = '<div class="tt-task">' + c.task.replace(/_/g, ' ') + '</div>'
      + '<div>' + idLabel + '</div>'
      + '<div><span class="tt-label">Seen pairs:</span> ' + pairLabel(c) + '</div>'
      + '<div><span class="tt-label">Training tasks sharing a pair:</span> ' + c.support_sum
        + ' (object+receptacle ' + c.n_or + ', object+button ' + c.n_oc
        + ', receptacle+button ' + c.n_rc + ')</div>'
      + '<div><span class="tt-label">Success:</span> ' + rateStr + sdStr + '</div>'
      + '<div><span class="tt-label">Seeds:</span> ' + seedStr + '</div>'
      + (perSeed ? '<div><span class="tt-label">Each seed:</span> ' + perSeed + '</div>' : '')
      + '<div class="tt-bar" style="width:' + barW + '%;background:' + barCol + '"></div>';

    const rect = cvs.getBoundingClientRect();
    let tx = ex - rect.left + 16, ty = ey - rect.top + 16;
    if (tx + 310 > rect.width) tx = ex - rect.left - 320;
    if (ty + 180 > rect.height) ty = ey - rect.top - 180;
    ttEl.style.left = tx + 'px'; ttEl.style.top = ty + 'px';
    ttEl.style.display = 'block';
  }

  // ── interaction ──────────────────────────────────────────────────────────────
  let dragging = false, ox = 0, oy = 0, dist = 0;

  cvs.addEventListener('mousedown', e => { dragging = true; ox = e.clientX; oy = e.clientY; dist = 0; });
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - ox, dy = e.clientY - oy;
    if (dragging) {
      dist += Math.abs(dx) + Math.abs(dy);
      camT -= dx * .011; camP += dy * .011;
      camP = Math.max(-1.3, Math.min(1.3, camP));
      setCam();
      ttEl.style.display = 'none';
    } else {
      showTooltip(rayHit(e.clientX, e.clientY), e.clientX, e.clientY);
    }
    ox = e.clientX; oy = e.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  cvs.addEventListener('mouseleave', () => { dragging = false; setHover(null); ttEl.style.display = 'none'; });
  cvs.addEventListener('wheel', e => {
    userZoomed = true;  // stop resize() from snapping back to the fitted distance
    camR = Math.max(6, Math.min(46, camR + e.deltaY * .016));
    setCam(); e.preventDefault();
  }, { passive: false });

  let ltx = 0, lty = 0;
  cvs.addEventListener('touchstart', e => { ltx = e.touches[0].clientX; lty = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
  cvs.addEventListener('touchmove', e => {
    camT -= (e.touches[0].clientX - ltx) * .011;
    camP += (e.touches[0].clientY - lty) * .011;
    camP = Math.max(-1.3, Math.min(1.3, camP));
    ltx = e.touches[0].clientX; lty = e.touches[0].clientY;
    setCam(); e.preventDefault();
  }, { passive: false });

  (function render() { requestAnimationFrame(render); renderer.render(scene, camera); })();

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.filter));
  });
  document.querySelectorAll('[data-cmode]').forEach((button) => {
    button.addEventListener('click', () => setColorMode(button.dataset.cmode));
  });
  document.querySelector('.show-all-btn').addEventListener('click', showAllLayers);
}
