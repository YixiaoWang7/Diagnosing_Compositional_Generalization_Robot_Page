(function () {
  const root = document.getElementById('further-findings');
  if (!root) return;
  const C = window.ResearchSite.colors;
  const A = window.ResearchSite.alpha;

  const ACTIVE = C.blue; // stage-wise modular policy with the ground-truth stage indicator
  const FULL = C.ood;    // end-to-end full-instruction policy
  const FONT = 'Inter, system-ui, sans-serif';

  // Values mirror assets/data/modularity_comparison.csv; keep both in sync.

  // (a) Pick–Place–Press, 64 tasks: OOD success (%) against the number of training tasks B,
  // as plotted in Figure 9a of the paper. Active instruction: one task set per B, err = SD
  // over 3 seeds. Full instruction (random): the Q1 data, err = SEM across 3 task-set means
  // (B = 4 is the fixed diagonal set, SEM over 3 seeds). Orthogonal 16: one task set, 3 seeds.
  const ppp = {
    b: [4, 8, 16, 24],
    active: { mean: [72.3, 81.0, 83.3, 77.7], err: [2.7, 2.6, 1.1, 3.2] },
    full:   { mean: [0.3889, 32.4206, 73.7731, 76.1944], err: [0.2422, 1.0197, 2.8656, 1.3345] },
    ortho:  { b: 16, mean: 78.1944, err: 0.6944 },
  };

  // (b) 48-task dependent 2S-PP: wrong-container rate (%) at the first placement, among
  // episodes in which the first object was placed, as plotted in Figure 9b. Active
  // instruction: err = SD over seeds (2 for Cov16, 3 for Full). Full instruction: err = SEM
  // over 5 seeds.
  const twoStage = {
    yMax: 40,
    separatorAfter: 1, // Cov16 groups left of the divider, full-task training right of it
    groups: [
      { label: ['Cov16', 'ID'],  active: { mean: 24.1, err: 0.6 }, full: { mean: 10.0786, err: 1.3877 } },
      { label: ['Cov16', 'OOD'], active: { mean: 24.5, err: 1.3 }, full: { mean: 13.7223, err: 1.2791 } },
      { label: ['Full', 'ID'],   active: { mean: 24.4, err: 0.9 }, full: { mean: 12.0276, err: 0.8424 } },
    ],
  };

  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return null;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, W: rect.width, H: rect.height };
  }

  function marker(ctx, shape, x, y, r, color) {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (shape === 'diamond') {
      const d = r * 1.2;
      ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y);
      ctx.closePath();
    } else if (shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r * 1.7 : r * 0.8;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = x + rr * Math.cos(a), py = y + rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.rect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  function errorBar(ctx, x, yLo, yHi, color, cap) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, yLo); ctx.lineTo(x, yHi);
    ctx.moveTo(x - cap, yLo); ctx.lineTo(x + cap, yLo);
    ctx.moveTo(x - cap, yHi); ctx.lineTo(x + cap, yHi);
    ctx.stroke();
  }

  // Legend rows above the plot area; wraps onto a second row in a narrow panel.
  function legend(ctx, items, x0, xMax, y0) {
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let x = x0, y = y0;
    items.forEach((it) => {
      const w = 16 + ctx.measureText(it.label).width;
      if (x > x0 && x + w > xMax) { x = x0; y += 16; }
      marker(ctx, it.shape, x + 5, y, 4.5, it.color);
      ctx.fillStyle = C.label;
      ctx.fillText(it.label, x + 16, y);
      x += w + 18;
    });
  }

  function frame(ctx, pad, W, H, yMax, yStep, yTitle, xTitle) {
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;
    const yToPx = (v) => pad.top + plotH - (v / yMax) * plotH;

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 0.8;
    for (let v = 0; v <= yMax; v += yStep) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yToPx(v));
      ctx.lineTo(W - pad.right, yToPx(v));
      ctx.stroke();
    }

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(W - pad.right, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = C.label;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= yMax; v += yStep) ctx.fillText(v, pad.left - 7, yToPx(v));

    ctx.fillStyle = C.text;
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(13, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yTitle, 0, 0);
    ctx.restore();
    if (xTitle) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(xTitle, pad.left + plotW / 2, H - 6);
    }
    return { plotW: plotW, plotH: plotH, yToPx: yToPx };
  }

  function drawPPP(canvas) {
    const s = setup(canvas);
    if (!s) return;
    const ctx = s.ctx, W = s.W, H = s.H;
    const pad = { top: 46, right: 16, bottom: 42, left: 50 };
    ctx.clearRect(0, 0, W, H);
    const f = frame(ctx, pad, W, H, 100, 20, 'OOD success rate (%)', 'B (number of training tasks)');

    const xMin = 2, xMax = 26;
    const xToPx = (b) => pad.left + ((b - xMin) / (xMax - xMin)) * f.plotW;

    ctx.fillStyle = C.label;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ppp.b.forEach((b) => {
      const px = xToPx(b);
      ctx.fillText(b, px, pad.top + f.plotH + 7);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, pad.top + f.plotH);
      ctx.lineTo(px, pad.top + f.plotH + 4);
      ctx.stroke();
    });

    function series(data, color, shape) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ppp.b.forEach((b, i) => {
        const px = xToPx(b), py = f.yToPx(data.mean[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ppp.b.forEach((b, i) => {
        const lo = Math.max(0, data.mean[i] - data.err[i]);
        const hi = Math.min(100, data.mean[i] + data.err[i]);
        errorBar(ctx, xToPx(b), f.yToPx(lo), f.yToPx(hi), color, 3.5);
      });
      ppp.b.forEach((b, i) => marker(ctx, shape, xToPx(b), f.yToPx(data.mean[i]), 4.5, color));
    }
    series(ppp.full, FULL, 'diamond');
    series(ppp.active, ACTIVE, 'circle');

    const o = ppp.ortho;
    errorBar(ctx, xToPx(o.b), f.yToPx(o.mean - o.err), f.yToPx(o.mean + o.err), FULL, 3.5);
    marker(ctx, 'star', xToPx(o.b), f.yToPx(o.mean), 5.5, FULL);

    // Key point: under sparse coverage the oracle-stage policy already generalizes.
    const x4 = xToPx(ppp.b[0]);
    const yA = f.yToPx(ppp.active.mean[0]), yF = f.yToPx(ppp.full.mean[0]);
    ctx.font = '700 11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ACTIVE;
    ctx.fillText(ppp.active.mean[0].toFixed(1) + '%', x4 + 9, yA + 14);
    ctx.fillStyle = FULL;
    ctx.fillText(ppp.full.mean[0].toFixed(1) + '%', x4 + 9, yF - 10);

    legend(ctx, [
      { shape: 'circle', color: ACTIVE, label: 'Stage-wise modular' },
      { shape: 'diamond', color: FULL, label: 'Full instruction' },
      { shape: 'star', color: FULL, label: 'Full (orthogonal 16)' },
    ], pad.left, W - pad.right, 14);
  }

  function draw2S(canvas) {
    const s = setup(canvas);
    if (!s) return;
    const ctx = s.ctx, W = s.W, H = s.H;
    const pad = { top: 46, right: 16, bottom: 46, left: 50 };
    ctx.clearRect(0, 0, W, H);
    const f = frame(ctx, pad, W, H, twoStage.yMax, 10, 'Wrong-container rate (%)', null);

    const n = twoStage.groups.length;
    const gw = f.plotW / n;
    const bw = Math.min(gw * 0.3, 46);
    const gap = 6;
    const base = pad.top + f.plotH;

    twoStage.groups.forEach((g, i) => {
      const cx = pad.left + gw * (i + 0.5);
      const bars = [
        { x: cx - gap / 2 - bw, d: g.active, color: ACTIVE },
        { x: cx + gap / 2, d: g.full, color: FULL },
      ];
      bars.forEach((b) => {
        const top = f.yToPx(b.d.mean);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(b.x, top, bw, base - top, [3, 3, 0, 0]);
        else ctx.rect(b.x, top, bw, base - top);
        ctx.fill();
        const hi = f.yToPx(b.d.mean + b.d.err);
        const lo = f.yToPx(b.d.mean - b.d.err);
        errorBar(ctx, b.x + bw / 2, lo, hi, C.axis, 4);
        ctx.fillStyle = b.color;
        ctx.font = '700 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(b.d.mean.toFixed(1), b.x + bw / 2, hi - 4);
      });
      ctx.fillStyle = C.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(g.label[0], cx, base + 8);
      ctx.fillStyle = C.label;
      ctx.font = '11px ' + FONT;
      ctx.fillText(g.label[1], cx, base + 23);
    });

    // Key point: without c2, the modular policy's error does not drop with more coverage.
    const first = pad.left + gw * 0.5 - gap / 2 - bw;
    const last = pad.left + gw * (n - 0.5) - gap / 2;
    const yb = f.yToPx(30.5);
    ctx.strokeStyle = ACTIVE;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(first, yb + 5); ctx.lineTo(first, yb); ctx.lineTo(last + bw, yb); ctx.lineTo(last + bw, yb + 5);
    ctx.stroke();
    ctx.fillStyle = ACTIVE;
    ctx.font = '600 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('c\u2082 not visible: \u224824% at any coverage', (first + last + bw) / 2, yb - 4);

    // Divider between the Cov16 conditions and full-task training.
    const dx = pad.left + gw * (twoStage.separatorAfter + 1);
    ctx.strokeStyle = A(C.axis, 0.3);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(dx, pad.top + 4);
    ctx.lineTo(dx, base);
    ctx.stroke();
    ctx.setLineDash([]);

    legend(ctx, [
      { shape: 'square', color: ACTIVE, label: 'Stage-wise modular' },
      { shape: 'square', color: FULL, label: 'Full instruction' },
    ], pad.left, W - pad.right, 14);
  }

  const canvasPPP = root.querySelector('#chartModularPPP');
  const canvas2S = root.querySelector('#chartModular2S');
  function drawAll() {
    if (canvasPPP) drawPPP(canvasPPP);
    if (canvas2S) draw2S(canvas2S);
  }

  drawAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
  window.addEventListener('resize', drawAll);
})();
