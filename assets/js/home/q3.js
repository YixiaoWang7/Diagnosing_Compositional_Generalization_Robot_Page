(function () {
  'use strict';

  const root = document.getElementById('q3');
  if (!root) return;
  const C = window.ResearchSite.colors;
  const A = window.ResearchSite.alpha;

  // 48-task Dependent 2S-PP (l4_2s_no_cont0, q3/48tasks/data). OOD split, 5 seeds each.
  // oodViol is pc_same_container_given_place_obj0: how often the first object went into the
  // reserved container c2, among the episodes where it was actually placed somewhere. It is
  // kept here as provenance but is no longer plotted — the chart shows oodSuccess alone.
  // "full" is deliberately absent: its ood rows are copies of its id rows with n_episodes = 0,
  // so plotting it beside these would compare a 48-task-trained ID number against real OOD.
  const CONDITIONS = [
    {
      label: 'Cov6', combos: 6,
      oodSuccess: { mean: 9.1875, se: 2.2500 },
      oodViol:    { mean: 21.4046, se: 2.1235 },
    },
    {
      label: 'Cov9', combos: 9,
      oodSuccess: { mean: 18.8750, se: 3.0182 },
      oodViol:    { mean: 20.8218, se: 4.7917 },
    },
    {
      label: 'Cov12', combos: 12,
      oodSuccess: { mean: 25.8750, se: 4.7259 },
      oodViol:    { mean: 12.3154, se: 2.2070 },
    },
    {
      label: 'Cov16', combos: 16,
      oodSuccess: { mean: 31.4375, se: 3.8540 },
      oodViol:    { mean: 13.7216, se: 1.2788 },
    },
  ];

  // A task is an (o1, o2, c2) triple: 4 first objects x 3 second objects x 4 instructed
  // containers = 48 tasks. Coverage is over the 16 (o1, c2) combinations, each spanning the
  // 3 choices of o2. c1 is NOT part of the task identity -- it is within-task variation, and
  // for every combination in training the dataset contains ALL c1 != c2 trajectories. So the
  // c1 != c2 rule is always demonstrated; what varies is for which combinations.
  const N_COMBOS = 16;
  const C1_PER_COMBO = 3;

  const lerp = (a, b, t) => a + (b - a) * t;
  const OBJECTS = ['cube', 'cross', 'cylinder', 'milk'];
  // ── Load-bearing: the column order and the within-cell slot order are THE SAME array.
  // That is what puts every forbidden slot (c1 = c2) on a diagonal staircase across the
  // board. Reorder either one and the central visual argument silently disappears while
  // the figure still looks perfectly fine. ──
  const C1_POOL = ['plate', 'mug', 'mug-no-handle', 'bin'];
  const SHORT = { 'plate': 'plate', 'mug': 'mug', 'mug-no-handle': 'mug-nh', 'bin': 'bin' };
  const EXAMPLE = { r: 0, c: 0 }; // cube × plate — the case shown in the figure above

  // Illustrative: the logs record how many combinations were trained, never which. Spread
  // out so cells light up across rows and columns rather than row-by-row, and so the
  // EXAMPLE cell (cube × plate) stays held out until coverage is complete. Note the SLOT
  // fills are exact -- only the choice of which cells are covered is illustrative.
  const REVEAL_ORDER = [
    [2, 1], [1, 3], [3, 0], [0, 2],
    [2, 3], [1, 0], [3, 2], [0, 1],
    [1, 2], [3, 3], [2, 0], [0, 3],
    [1, 1], [3, 1], [2, 2], [0, 0],
  ];
  const revealIndex = (r, c) => REVEAL_ORDER.findIndex(([rr, cc]) => rr === r && cc === c);

  // A covered combination demonstrates every legal c1, so which slots fill is EXACT:
  // all of them except c1 = c2. Nothing to allocate and nothing illustrative here.
  function legalSlots(c) {
    const c2 = C1_POOL[c];
    return C1_POOL.map((x, i) => i).filter((i) => C1_POOL[i] !== c2);
  }

  function need(sel) {
    const el = root.querySelector(sel);
    if (!el) console.error('Q3: missing element ' + sel);
    return el;
  }

  // ── Board ──
  const board = need('#board');
  const boardCells = [];
  board.appendChild(document.createElement('div')); // corner spacer
  C1_POOL.forEach((name) => {
    const lab = document.createElement('div');
    lab.className = 'blab';
    lab.textContent = SHORT[name];
    board.appendChild(lab);
  });
  for (let r = 0; r < 4; r++) {
    const olab = document.createElement('div');
    olab.className = 'olab';
    olab.textContent = OBJECTS[r];
    board.appendChild(olab);
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'bcell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.dataset.reveal = revealIndex(r, c);
      const c2 = C1_POOL[c];
      cell.setAttribute('aria-label',
        OBJECTS[r] + ' first, ' + c2 + ' reserved for the second object');
      C1_POOL.forEach((c1) => {
        const slot = document.createElement('span');
        slot.className = 'bslot' + (c1 === c2 ? ' forbidden' : '');
        cell.appendChild(slot);
      });
      cell.addEventListener('click', () => selectCell(r, c));
      board.appendChild(cell);
      boardCells.push(cell);
    }
  }

  const cntCombos = need('#cntCombos');
  const cntC1 = need('#cntC1');
  const expInstr = need('#expInstr');
  const cslots = need('#cslots');
  const expNote = need('#expNote');
  const covButtons = root.querySelectorAll('.cov-btn');

  let currentIdx = 3;
  let sel = { r: EXAMPLE.r, c: EXAMPLE.c };

  // The expansion: the selected cell redrawn once, large enough to read.
  function renderExpansion() {
    const o1 = OBJECTS[sel.r];
    const c2 = C1_POOL[sel.c];
    expInstr.innerHTML =
      '&ldquo;put the <span class="slotname o1">' + o1 + '</span> away, then put the second ' +
      'object in the <span class="slotname c2">' + c2 + '</span>&rdquo;';
    cslots.textContent = '';
    C1_POOL.forEach((c1) => {
      const isRes = c1 === c2;
      const d = document.createElement('div');
      d.className = 'cslot ' + (isRes ? 'reserved' : 'legal');
      d.innerHTML =
        '<div class="cs-name">' + c1 + '</div>' +
        '<div class="cs-mark">' + (isRes ? '&times;' : '&check;') + '</div>' +
        '<div class="cs-sub">' + (isRes ? 'reserved<br>c<sub>2</sub>' : 'legal<br>c<sub>1</sub>') + '</div>';
      cslots.appendChild(d);
    });
    expNote.innerHTML =
      'The <strong>' + c2 + '</strong> is reserved for the second object, so putting the ' + o1 +
      ' there is a <strong>violation</strong>.';
  }

  function selectCell(r, c) {
    sel = { r: r, c: c };
    boardCells.forEach((cell) => {
      cell.classList.toggle('sel',
        Number(cell.dataset.r) === r && Number(cell.dataset.c) === c);
    });
    renderExpansion();
  }

  function setCoverage(idx) {
    currentIdx = idx;
    const d = CONDITIONS[idx];
    cntCombos.textContent = d.combos + ' / ' + N_COMBOS;
    cntC1.textContent = d.combos * C1_PER_COMBO;
    boardCells.forEach((cell) => {
      const on = Number(cell.dataset.reveal) < d.combos;
      cell.classList.toggle('covered', on);
      const c = Number(cell.dataset.c);
      const shown = on ? legalSlots(c) : [];
      Array.prototype.forEach.call(cell.children, (slot, i) => {
        slot.classList.toggle('shown', shown.indexOf(i) !== -1);
      });
    });
    covButtons.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.idx) === idx);
    });
  }

  selectCell(EXAMPLE.r, EXAMPLE.c);

  // Combined chart
  function setupCombinedChart() {
    const canvas = root.querySelector('#chartCombined');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return { draw() {} };
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    // left fits the tick labels plus the rotated axis title beside them
    const pad = { top: 22, right: 56, bottom: 42, left: 58 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const success = CONDITIONS.map((d) => d.oodSuccess);
    const yMax = 40; // covers the Cov16 tip, 31.4 + SE
    const N = CONDITIONS.length;
    const segCount = N - 1;

    function valueAt(series, t) {
      if (t <= 0) return series[0];
      if (t >= segCount) return series[N - 1];
      const i = Math.floor(t);
      const f = t - i;
      return {
        mean: lerp(series[i].mean, series[i + 1].mean, f),
        se: lerp(series[i].se, series[i + 1].se, f),
      };
    }

    function buildPts(series, t) {
      const pts = [];
      for (let i = 0; i < N; i++) {
        if (i <= t + 1e-6) pts.push({ x: i, mean: series[i].mean, se: series[i].se, real: true });
      }
      if (t < segCount && Math.abs(t - Math.round(t)) > 1e-4) {
        const v = valueAt(series, t);
        pts.push({ x: t, mean: v.mean, se: v.se, real: false });
      }
      if (!pts.length) pts.push({ x: 0, mean: series[0].mean, se: series[0].se, real: true });
      return pts;
    }

    function drawSeries(pts, color, fillColor, xToPixel, yToPixel) {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const px = xToPixel(p.x);
        const py = yToPixel(Math.min(yMax, p.mean + p.se));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      for (let i = pts.length - 1; i >= 0; i--) {
        ctx.lineTo(xToPixel(pts[i].x), yToPixel(Math.max(0, pts[i].mean - pts[i].se)));
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      pts.forEach((p, i) => {
        const px = xToPixel(p.x), py = yToPixel(p.mean);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();

      pts.forEach((p) => {
        if (!p.real) return;
        const px = xToPixel(p.x), py = yToPixel(p.mean);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(px, yToPixel(Math.min(yMax, p.mean + p.se)));
        ctx.lineTo(px, yToPixel(Math.max(0, p.mean - p.se)));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
    }

    function draw(t, highlightIdx) {
      const xToPixel = (x) => pad.left + (x / segCount) * plotW;
      const yToPixel = (y) => pad.top + plotH - (y / yMax) * plotH;
      ctx.clearRect(0, 0, W, H);

      // Selected coverage highlight band
      const hi = Math.round(Math.min(Math.max(highlightIdx, 0), 3));
      const hx = xToPixel(hi);
      const bandW = plotW / segCount * 0.55;
      ctx.fillStyle = A(C.blue, 0.10);
      ctx.fillRect(hx - bandW / 2, pad.top, bandW, plotH);

      // Grid
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.8;
      for (let y = 0; y <= yMax; y += 10) {
        ctx.beginPath();
        ctx.moveTo(pad.left, yToPixel(y));
        ctx.lineTo(W - pad.right, yToPixel(y));
        ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pad.left, pad.top);
      ctx.lineTo(pad.left, pad.top + plotH);
      ctx.lineTo(W - pad.right, pad.top + plotH);
      ctx.stroke();

      // Y labels
      ctx.fillStyle = C.label;
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = 0; y <= yMax; y += 10) {
        ctx.fillText(y + '%', pad.left - 7, yToPixel(y));
      }

      // X labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let i = 0; i < N; i++) {
        if (i <= t + 1e-6) {
          const px = xToPixel(i);
          ctx.fillStyle = i === hi ? C.blue : C.label;
          ctx.font = (i === hi ? '700 ' : '') + '11px Inter, system-ui, sans-serif';
          ctx.fillText(CONDITIONS[i].label, px, pad.top + plotH + 8);
          ctx.strokeStyle = C.axis;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, pad.top + plotH);
          ctx.lineTo(px, pad.top + plotH + 3);
          ctx.stroke();
        }
      }

      // Axis titles — the x-label loop above leaves textBaseline at 'top'
      ctx.fillStyle = C.text;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('(o\u2081, c\u2082) combinations covered \u2014 of 16, at B = 16 throughout',
                   pad.left + plotW / 2, H - 6);
      ctx.save();
      ctx.translate(13, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'middle';
      ctx.fillText('Task success (%)', 0, 0);
      ctx.restore();

      const succPts = buildPts(success, t);
      drawSeries(succPts, C.id, A(C.id, 0.12), xToPixel, yToPixel);

      // Endpoint / tip label
      const tipS = succPts[succPts.length - 1];
      if (tipS) {
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = C.id;
        ctx.fillText(tipS.mean.toFixed(1) + '%', xToPixel(tipS.x) + 8, yToPixel(tipS.mean) - 4);
      }
    }

    return { draw, segCount };
  }

  let chart = null;

  function renderAt(t) {
    if (!chart) chart = setupCombinedChart();
    const idx = Math.round(Math.min(Math.max(t, 0), 3));
    setCoverage(idx);
    chart.draw(t, idx);
  }

  let animating = false;
  let played = false;
  let rafId = null;
  let startTime = null;
  const DURATION = 5200;

  function stopAnim() {
    animating = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    startTime = null;
  }

  function startAnim(forceComplete) {
    if (played && !forceComplete) return;
    played = true;
    if (forceComplete) {
      stopAnim();
      renderAt(3);
      return;
    }
    stopAnim();
    animating = true;
    startTime = null;
    rafId = requestAnimationFrame(function frame(ts) {
      if (startTime === null) startTime = ts;
      let g = (ts - startTime) / DURATION;
      if (g >= 1) g = 1;
      renderAt(lerp(0, 3, g));
      if (g < 1 && animating) rafId = requestAnimationFrame(frame);
      else animating = false;
    });
  }

  // Clicking a condition draws the WHOLE curve and highlights that point, rather than
  // truncating the line at it. Once the reader is picking conditions they are comparing
  // across them, and the board beside it already carries the "what was trained" state.
  covButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      stopAnim();
      played = true;
      const idx = Number(btn.dataset.idx);
      if (!chart) chart = setupCombinedChart();
      setCoverage(idx);
      chart.draw(chart.segCount, idx);
    });
  });

  window.addEventListener('resize', () => {
    chart = setupCombinedChart();
    if (played) {
      setCoverage(currentIdx);
      chart.draw(chart.segCount, currentIdx);
    } else {
      renderAt(currentIdx);
    }
  });

  renderAt(0);

  window.ResearchSite.figures.push({ watch: root.querySelector('#q3Result'), play: startAnim });
})();
