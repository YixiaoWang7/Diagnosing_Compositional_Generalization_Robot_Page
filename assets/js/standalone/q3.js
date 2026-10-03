'use strict';

const CONDITIONS = [
  {
    label: 'Cov4', pairs: 4,
    oodSuccess: { mean: 1.2500, se: 1.0486 },
    oodViol:    { mean: 36.1738, se: 1.7874 },
    meterSub: 'Only 4 of 12 relation cases appear. Most stay OOD.',
  },
  {
    label: 'Cov6', pairs: 6,
    oodSuccess: { mean: 7.2222, se: 1.3784 },
    oodViol:    { mean: 24.3764, se: 2.9536 },
    meterSub: '6 of 12 relation cases appear under the same 12-task budget.',
  },
  {
    label: 'Cov9', pairs: 9,
    oodSuccess: { mean: 16.1111, se: 0.2778 },
    oodViol:    { mean: 17.3240, se: 1.4607 },
    meterSub: '9 of 12 relation cases appear. OOD relational errors keep falling.',
  },
  {
    label: 'Cov12', pairs: 12,
    oodSuccess: { mean: 18.4722, se: 2.7039 },
    oodViol:    { mean: 15.6946, se: 4.5910 },
    meterSub: 'All 12 relation cases appear at least once (orthogonal design).',
  },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const OBJECTS = ['milk', 'cross', 'cyl.', 'cube'];
const CONTAINERS = ['bin', 'mug', 'plate'];
const EXAMPLE = { r: 0, c: 1 }; // milk × mug

// Fixed, spread-out reveal order (schematic — not the true experimental identity).
// Chosen so cells light up across rows/columns rather than row-by-row.
const REVEAL_ORDER = [
  [0, 0], [2, 1], [1, 2], [3, 0],
  [0, 2], [2, 0], [1, 1], [3, 2],
  [0, 1], [2, 2], [1, 0], [3, 1],
];
const revealIndex = (r, c) => REVEAL_ORDER.findIndex(([rr, cc]) => rr === r && cc === c);

// Lattice
const lattice = document.getElementById('lattice');
const latticeCells = [];
for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 3; c++) {
    const cell = document.createElement('div');
    const isEx = r === EXAMPLE.r && c === EXAMPLE.c;
    cell.className = 'lcell' + (isEx ? ' example' : '');
    cell.dataset.reveal = revealIndex(r, c);
    cell.title = `(o₁=${OBJECTS[r]}, c₂=${CONTAINERS[c]})`;
    lattice.appendChild(cell);
    latticeCells.push(cell);
  }
}

// Budget strip
const budgetStrip = document.getElementById('budgetStrip');
for (let i = 0; i < 12; i++) {
  const d = document.createElement('div');
  d.className = 'btask';
  budgetStrip.appendChild(d);
}

let currentIdx = 3;

function setCoverage(idx) {
  currentIdx = idx;
  const d = CONDITIONS[idx];
  document.getElementById('meterFill').style.width = (d.pairs / 12 * 100) + '%';
  document.getElementById('meterValue').textContent = d.pairs + ' / 12';
  document.getElementById('meterSub').textContent = d.meterSub;
  document.getElementById('latticeCount').textContent = d.pairs;
  document.getElementById('budgetNote').textContent =
    d.pairs < 12
      ? `Always 12 tasks. With only ${d.pairs} pairs, each seen pair gets denser demos — more cases stay OOD.`
      : 'Always 12 tasks. All 12 relation cases appear; demos are spread across the full dependent pair set.';
  latticeCells.forEach((cell) => {
    cell.classList.toggle('on', Number(cell.dataset.reveal) < d.pairs);
  });
  document.querySelectorAll('.cov-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.idx) === idx);
  });
}

// Combined chart
function setupCombinedChart() {
  const canvas = document.getElementById('chartCombined');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10) return { draw() {} };
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width, H = rect.height;
  const pad = { top: 22, right: 56, bottom: 42, left: 48 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const success = CONDITIONS.map((d) => d.oodSuccess);
  const viol = CONDITIONS.map((d) => d.oodViol);
  const yMax = 40; // shared axis: covers 36.2 + SE
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
    ctx.fillStyle = 'rgba(31,78,158,0.10)';
    ctx.fillRect(hx - bandW / 2, pad.top, bandW, plotH);

    // Grid
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.8;
    for (let y = 0; y <= yMax; y += 10) {
      ctx.beginPath();
      ctx.moveTo(pad.left, yToPixel(y));
      ctx.lineTo(W - pad.right, yToPixel(y));
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(W - pad.right, pad.top + plotH);
    ctx.stroke();

    // Y labels
    ctx.fillStyle = '#444';
    ctx.font = '11px system-ui';
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
        ctx.fillStyle = i === hi ? '#1F4E9E' : '#444';
        ctx.font = i === hi ? 'bold 11px system-ui' : '11px system-ui';
        ctx.fillText(CONDITIONS[i].label, px, pad.top + plotH + 8);
        ctx.strokeStyle = '#2b2b2b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, pad.top + plotH);
        ctx.lineTo(px, pad.top + plotH + 3);
        ctx.stroke();
      }
    }

    // Axis titles
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Dependent-pair coverage', pad.left + plotW / 2, H - 6);
    ctx.save();
    ctx.translate(13, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Rate (%)', 0, 0);
    ctx.restore();

    const succPts = buildPts(success, t);
    const violPts = buildPts(viol, t);
    drawSeries(succPts, '#2E7D32', 'rgba(46,125,50,0.12)', xToPixel, yToPixel);
    drawSeries(violPts, '#C5582D', 'rgba(197,88,45,0.12)', xToPixel, yToPixel);

    // Endpoint / tip labels
    const tipS = succPts[succPts.length - 1];
    const tipV = violPts[violPts.length - 1];
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    if (tipS) {
      ctx.fillStyle = '#2E7D32';
      ctx.fillText(tipS.mean.toFixed(1) + '%', xToPixel(tipS.x) + 8, yToPixel(tipS.mean) - 4);
    }
    if (tipV) {
      ctx.fillStyle = '#C5582D';
      ctx.fillText(tipV.mean.toFixed(1) + '%', xToPixel(tipV.x) + 8, yToPixel(tipV.mean) + 12);
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

document.querySelectorAll('.cov-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    stopAnim();
    played = true;
    renderAt(Number(btn.dataset.idx));
  });
});

let animating = false;
let played = false;
let rafId = null;
let startTime = null;
const DURATION = reduceMotion ? 1 : 5200;
const embedded = window.parent !== window;
if (embedded) {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
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
  if (forceComplete || reduceMotion) {
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

window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'cg-play') return;
  startAnim(!!event.data.reduceMotion);
});

window.addEventListener('resize', () => {
  chart = setupCombinedChart();
  renderAt(currentIdx);
});

// Idle at start when embedded; play on parent signal. Standalone: autoplay.
if (embedded) {
  renderAt(0);
} else {
  startAnim(false);
}
