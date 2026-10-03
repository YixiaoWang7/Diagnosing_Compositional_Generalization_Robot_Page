(function () {
  const root = document.getElementById('q1');
  if (!root) return;
  const C = window.ResearchSite.colors;
  const A = window.ResearchSite.alpha;

  // Orthogonal-16 (q1/data/success_vs_b_ortho.csv, 3 seeds). Same B as a random-16, but the
  // 16 are chosen so every pair of factors is covered exactly once — plotted as a star to
  // mark it as a designed set rather than another point on the random curve.
  // Only the held-out rate is drawn; `id` is kept as the record of what the CSV reports.
  const dataOrtho = {
    b: 16,
    id:  { mean: 80.4167, sem: 1.8162 },
    ood: { mean: 78.1944, sem: 0.6944 },
  };

  // satB is where held-out success stops improving; the shaded region past it carries the
  // "no need for every combination" claim.
  const dataL5 = {
    satB: 16,
    satTitle: 'plateau from B = 16',
    satNote: 'a quarter of the 64',
    ortho: dataOrtho,
    bValues: [4, 6, 7, 8, 10, 12, 16, 20, 24, 64],
    id:  { mean: [83.3333,84.6296,83.3333,83.6111,84.3333,80.6481,81.8750,81.6667,81.3426,78.6458],
           sem:  [5.8333,3.0316,2.1473,1.7067,2.4037,1.2143,1.7347,1.4175,2.8252,1.3985] },
    ood: { mean: [0.3889,6.2261,25.4191,32.4206,51.2346,64.3803,73.7731,75.9848,76.1944,78.6458],
           sem:  [0.2422,0.5187,5.1743,1.0197,12.4504,6.7294,2.8656,3.0795,1.3345,1.3985] },
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  function setupChart(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return null;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;

    // left leaves room for the tick labels *and* the rotated axis title beside them;
    // right fits the trailing "NN.N%" value label drawn 8px past the frontier point;
    // top clears the single-row in-canvas legend drawn along the top-left
    const pad = { top: 40, right: 52, bottom: 48, left: 64 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const B = data.bValues;
    const N = B.length;
    const maxB = B[N - 1];
    // Animation "stops": start at the first data point's B, then pass through the rest.
    const stops = [...B];
    const segCount = stops.length - 1;
    const yMin = 0, yMax = 100;

    // Map global progress g∈[0,1] to a continuous x frontier for this chart.
    function curXAt(g) {
      const localP = Math.max(0, Math.min(g, 1)) * segCount;
      const seg = Math.min(Math.floor(localP), segCount - 1);
      const frac = localP - seg;
      return lerp(stops[seg], stops[seg + 1], frac);
    }

    // Interpolate a series' value along the data polyline at arbitrary x.
    function valueAt(series, x) {
      if (x <= B[0]) return { mean: series.mean[0], sem: series.sem[0] };
      if (x >= maxB) return { mean: series.mean[N - 1], sem: series.sem[N - 1] };
      for (let i = 0; i < N - 1; i++) {
        if (x >= B[i] && x <= B[i + 1]) {
          const t = (x - B[i]) / (B[i + 1] - B[i]);
          return { mean: lerp(series.mean[i], series.mean[i + 1], t),
                   sem: lerp(series.sem[i], series.sem[i + 1], t) };
        }
      }
      return { mean: series.mean[N - 1], sem: series.sem[N - 1] };
    }

    function draw(curX) {
      const xMin = B[0];
      const axisMax = Math.max(curX, xMin);
      const xSpan = Math.max(axisMax - xMin, 1e-6);
      const xToPixel = (x) => pad.left + ((x - xMin) / xSpan) * plotW;
      const yToPixel = (y) => pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

      ctx.clearRect(0, 0, W, H);

      // ── Saturation region ──
      // Shade B >= satB once the reveal has reached it, so the "no more gains past here"
      // claim is made by the figure itself rather than only in prose. Charts with no satB
      // (PP) skip this entirely.
      const satB = data.satB;
      const satVisible = satB != null && curX > satB;
      if (satVisible) {
        const sx = xToPixel(satB);
        const sRight = W - pad.right;
        ctx.fillStyle = A(C.blue, 0.07);
        ctx.fillRect(sx, pad.top, sRight - sx, plotH);
        ctx.strokeStyle = A(C.blue, 0.45);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, pad.top);
        ctx.lineTo(sx, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Horizontal grid (y axis full 0–100 from the start)
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 0.8;
      for (let y = 0; y <= 100; y += 20) {
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
      for (let y = 0; y <= 100; y += 20) {
        ctx.fillText(y + '%', pad.left - 8, yToPixel(y));
      }

      // X labels: each revealed B value, skipping ones that would overlap.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = C.label;
      let lastLabelX = -Infinity;
      const drawXLabel = (val) => {
        const px = xToPixel(val);
        if (px - lastLabelX < 24) return;
        lastLabelX = px;
        ctx.fillText(val, px, pad.top + plotH + 8);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, pad.top + plotH);
        ctx.lineTo(px, pad.top + plotH + 4);
        ctx.stroke();
      };
      for (let i = 0; i < N; i++) {
        if (B[i] <= curX + 1e-6) drawXLabel(B[i]);
      }

      // Axis titles — reset the baseline first; the x-label loop above left it 'top',
      // which pushed this text past the bottom edge of the canvas.
      ctx.fillStyle = C.text;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('B (number of training tasks)', pad.left + plotW / 2, H - 6);
      ctx.save();
      ctx.translate(13, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'middle';
      ctx.fillText('Success rate (%)', 0, 0);
      ctx.restore();

      if (curX < B[0]) return; // nothing to draw yet, axis is still growing

      // Build the revealed polyline points (real data points + moving frontier).
      function buildPoints(series) {
        const pts = [];
        for (let i = 0; i < N; i++) {
          if (B[i] <= curX + 1e-6) {
            pts.push({ x: B[i], mean: series.mean[i], sem: series.sem[i], real: true });
          }
        }
        if (curX < maxB) {
          const v = valueAt(series, curX);
          pts.push({ x: curX, mean: v.mean, sem: v.sem, real: false });
        }
        return pts;
      }

      function drawCurve(series, color, fillColor) {
        const pts = buildPoints(series);
        if (pts.length === 0) return;

        // SEM band
        ctx.beginPath();
        pts.forEach((p, i) => {
          const px = xToPixel(p.x);
          const py = yToPixel(Math.min(100, p.mean + p.sem));
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        for (let i = pts.length - 1; i >= 0; i--) {
          const px = xToPixel(pts[i].x);
          const py = yToPixel(Math.max(0, pts[i].mean - pts[i].sem));
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        pts.forEach((p, i) => {
          const px = xToPixel(p.x);
          const py = yToPixel(p.mean);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Markers at real data points only
        pts.forEach((p) => {
          if (!p.real) return;
          const px = xToPixel(p.x), py = yToPixel(p.mean);
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        return pts[pts.length - 1];
      }

      const idTip = drawCurve(data.id, C.id, A(C.id, 0.12));
      const oodTip = drawCurve(data.ood, C.ood, A(C.ood, 0.12));

      // Frontier value annotations
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      if (idTip) {
        ctx.fillStyle = C.id;
        ctx.fillText(idTip.mean.toFixed(1) + '%', xToPixel(idTip.x) + 8, yToPixel(idTip.mean) - 2);
      }
      if (oodTip) {
        ctx.fillStyle = C.ood;
        ctx.fillText(oodTip.mean.toFixed(1) + '%', xToPixel(oodTip.x) + 8, yToPixel(oodTip.mean) + 12);
      }

      // ── Orthogonal-16 star ──
      // Held-out rate only, and only once the reveal has finished (curX has reached the last
      // B) — it lands as the closing beat of the animation rather than mid-climb. The star
      // is drawn last so nothing overdraws it; no text label, the legend names it.
      const ortho = data.ortho;
      if (ortho && curX >= maxB - 1e-6) {
        const ox = xToPixel(ortho.b);
        const oy = yToPixel(ortho.ood.mean);
        const hi = yToPixel(Math.min(100, ortho.ood.mean + ortho.ood.sem));
        const lo = yToPixel(Math.max(0, ortho.ood.mean - ortho.ood.sem));

        // Error bar
        ctx.strokeStyle = A(C.ood, 0.75);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ox, hi);
        ctx.lineTo(ox, lo);
        ctx.stroke();

        drawStar(ox, oy, 11, 5.2, C.ood);
      }

      // ── Saturation caption, inside the shaded region ──
      if (satVisible) {
        const sx = xToPixel(satB);
        const cx = (sx + (W - pad.right)) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = C.blue;
        ctx.font = '700 11.5px Inter, system-ui, sans-serif';
        ctx.fillText(data.satTitle, cx, pad.top + 16);
        ctx.fillStyle = C.label;
        ctx.font = '10.5px Inter, system-ui, sans-serif';
        ctx.fillText(data.satNote, cx, pad.top + 31);
      }

      drawLegend();
    }

    // Five-pointed star, white-outlined to read against the curve it sits on.
    function drawStar(cx, cy, rOuter, rInner, color) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // ── In-canvas legend ──
    // Sits above the plot area (pad.top is sized for it) so the figure is self-describing
    // when it is read on its own, without a separate HTML legend to drift out of sync.
    function drawLegend() {
      // Single row, terse labels — the footnote below the figure carries the definitions.
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const y = 18;
      let x = pad.left;

      [{ color: C.id, label: 'Seen' }, { color: C.ood, label: 'Held out' }].forEach((it) => {
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(x + 5, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.label;
        ctx.fillText(it.label, x + 15, y);
        x += 15 + ctx.measureText(it.label).width + 18;
      });

      if (data.ortho) {
        drawStar(x + 6, y, 6.5, 3.1, C.ood);
        ctx.fillStyle = C.label;
        ctx.fillText('orthogonal 16', x + 17, y);
        x += 17 + ctx.measureText('orthogonal 16').width + 18;
      }

      ctx.fillStyle = A(C.ood, 0.22);
      ctx.fillRect(x, y - 4, 14, 8);
      ctx.fillStyle = C.label;
      ctx.fillText('±1 s.e.', x + 20, y);
    }

    return { draw, curXAt, maxB };
  }

  // ─── Orthogonal-16 structure ─────────────────────────────────────────────────
  // The real Orthogonal-16 training set. Built from the rule that generates it:
  // button = object XOR receptacle, over 4 values each. That is what makes every pair of
  // columns hit all 16 combinations exactly once — do not hand-edit the rows.
  const O_OBJ = ['cross', 'cube', 'cylinder', 'milk'];
  const O_REC = ['bin', 'mug', 'plate', 'mug-nh'];
  const O_BTN = ['red', 'green', 'blue', 'yellow'];
  // One hue per factor, four lightness steps per hue — so a column reads as four values
  // repeated four times each.
  const O_RAMPS = [
    ['#1B5E20', '#2E7D32', '#4C9A50', '#7CBA80'], // object   (green)
    ['#14356B', '#1F4E9E', '#3D6FBF', '#7A9AD6'], // receptacle (blue)
    ['#8E3B18', '#C5582D', '#DC8055', '#EBAE91'], // button   (orange)
  ];

  const orthoRows = [];
  for (let o = 0; o < 4; o++) {
    for (let r = 0; r < 4; r++) {
      orthoRows.push([o, r, o ^ r]);
    }
  }

  const orthoGrid = root.querySelector('#orthoGrid');
  const orthoCells = [];
  if (orthoGrid) {
    const head = document.createElement('div');
    head.className = 'ortho-head';
    ['object', 'receptacle', 'button'].forEach((t) => {
      const h = document.createElement('div');
      h.textContent = t;
      head.appendChild(h);
    });
    orthoGrid.parentNode.insertBefore(head, orthoGrid);

    const NAMES = [O_OBJ, O_REC, O_BTN];
    orthoRows.forEach((row) => {
      row.forEach((v, f) => {
        const d = document.createElement('div');
        d.className = 'ocell';
        d.style.background = O_RAMPS[f][v];
        d.textContent = NAMES[f][v];
        orthoGrid.appendChild(d);
        orthoCells.push(d);
      });
    });
  }

  // Reveal the 16 rows over the first 55% of the animation, so the structure is complete
  // while the curve is still climbing toward B = 16.
  function renderOrtho(g) {
    const shown = Math.round(Math.max(0, Math.min(g / 0.55, 1)) * orthoRows.length);
    orthoCells.forEach((cell, i) => {
      cell.classList.toggle('on', Math.floor(i / 3) < shown);
    });
  }

  const canvasL5 = root.querySelector('#chartL5');
  let chartL5 = null;
  // Progress of the reveal, kept here so resize can redraw at the current frame now that
  // there is no slider holding that state.
  let progress = 0;

  function render(g) {
    progress = g;
    renderOrtho(g);
    if (!chartL5) return;
    chartL5.draw(chartL5.curXAt(g));
  }

  function init() {
    chartL5 = setupChart(canvasL5, dataL5);
  }

  init();
  render(0);

  const DURATION = 7000;
  let animating = false;
  let played = false;
  let rafId = null;
  let startTime = null;

  function frame(ts) {
    if (startTime === null) startTime = ts;
    let g = (ts - startTime) / DURATION;
    if (g >= 1) g = 1;
    render(g);
    if (g < 1 && animating) {
      rafId = requestAnimationFrame(frame);
    } else {
      animating = false;
    }
  }

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
      render(1);
      return;
    }
    stopAnim();
    animating = true;
    startTime = null;
    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', () => {
    init();
    render(progress);
  });

  window.ResearchSite.figures.push({ watch: root.querySelector('.charts-container'), play: startAnim });
})();
