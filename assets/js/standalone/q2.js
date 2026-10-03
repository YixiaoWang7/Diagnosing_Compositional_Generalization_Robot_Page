// ─── Data ───────────────────────────────────────────────────────────────────
const groups = [
  { label: 'B = 4', before: 0.39, after: 54.67, delta: 54.28 },
  { label: 'B = 6', before: 16.55, after: 57.70, delta: 41.15 },
  { label: 'B = 8*', before: 28.04, after: 68.33, delta: 40.30 },
];

// ─── Colors ─────────────────────────────────────────────────────────────────
const COLOR_BEFORE = '#bbb';
const COLOR_AFTER = '#1F4E9E';
const COLOR_ARROW = '#C5582D';

// ─── Canvas Setup ───────────────────────────────────────────────────────────
let canvas, ctx, W, H;
const pad = { top: 30, right: 30, bottom: 55, left: 60 };
let plotW, plotH;

function initCanvas() {
  canvas = document.getElementById('chart');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  W = rect.width;
  H = rect.height;
  plotW = W - pad.left - pad.right;
  plotH = H - pad.top - pad.bottom;
}

function yToPixel(val) {
  return pad.top + plotH - (val / 100) * plotH;
}

// ─── Drawing helpers ────────────────────────────────────────────────────────
function drawAxesAndGrid() {
  // Grid lines
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 0.8;
  for (let y = 0; y <= 100; y += 20) {
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
  for (let y = 0; y <= 100; y += 20) {
    ctx.fillText(y + '%', pad.left - 8, yToPixel(y));
  }

  // Y axis title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('OOD Success Rate (%)', 0, 0);
  ctx.restore();

  // X axis title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Pretraining tasks (B)', pad.left + plotW / 2, H - 8);
}

function getBarGeometry() {
  const nGroups = groups.length;
  const groupWidth = plotW / nGroups;
  const barWidth = Math.min(groupWidth * 0.28, 50);
  const gap = barWidth * 0.35;
  const result = [];
  for (let i = 0; i < nGroups; i++) {
    const cx = pad.left + groupWidth * (i + 0.5);
    result.push({
      beforeX: cx - barWidth - gap / 2,
      afterX: cx + gap / 2,
      barWidth,
      cx,
    });
  }
  return result;
}

function drawBar(x, barWidth, value, maxVal, color, progress) {
  const h = (value / 100) * plotH * progress;
  const y = pad.top + plotH - h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, barWidth, h, [4, 4, 0, 0]);
  ctx.fill();
  return y;
}

function drawValueLabel(x, barWidth, y, value, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(value.toFixed(1) + '%', x + barWidth / 2, y - 5);
  ctx.globalAlpha = 1;
}

function drawArrow(x, yFrom, yTo, delta, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  const arrowX = x;
  ctx.strokeStyle = COLOR_ARROW;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(arrowX, yFrom - 2);
  ctx.lineTo(arrowX, yTo + 10);
  ctx.stroke();

  // Arrowhead
  ctx.fillStyle = COLOR_ARROW;
  ctx.beginPath();
  ctx.moveTo(arrowX, yTo + 2);
  ctx.lineTo(arrowX - 5, yTo + 12);
  ctx.lineTo(arrowX + 5, yTo + 12);
  ctx.closePath();
  ctx.fill();

  // Delta label (to the left of the arrow)
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLOR_ARROW;
  const midY = (yFrom + yTo) / 2;
  ctx.fillText('+' + delta.toFixed(1), arrowX - 8, midY);

  ctx.globalAlpha = 1;
}

// ─── Animation state ────────────────────────────────────────────────────────
let animProgress = 0; // 0 to 3 (0=nothing, 1=before bars done, 2=after bars done, 3=arrows done)
let animRunning = false;
let animStart = null;
const PHASE_DURATION = 700; // ms per phase

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawAxesAndGrid();

  const geo = getBarGeometry();
  const beforeProgress = Math.min(1, Math.max(0, animProgress));
  const afterProgress = Math.min(1, Math.max(0, animProgress - 1));
  const arrowAlpha = Math.min(1, Math.max(0, animProgress - 2));

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const { beforeX, afterX, barWidth, cx } = geo[i];

    // X-axis group label
    ctx.fillStyle = '#333';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(g.label, cx, pad.top + plotH + 10);

    // Before bar
    if (beforeProgress > 0) {
      const yBefore = drawBar(beforeX, barWidth, g.before, 100, COLOR_BEFORE, easeOut(beforeProgress));
      if (beforeProgress >= 1) {
        drawValueLabel(beforeX, barWidth, yBefore, g.before, '#666', Math.min(1, (animProgress - 0.8) * 5));
      }
    }

    // After bar
    if (afterProgress > 0) {
      const yAfter = drawBar(afterX, barWidth, g.after, 100, COLOR_AFTER, easeOut(afterProgress));
      if (afterProgress >= 1) {
        drawValueLabel(afterX, barWidth, yAfter, g.after, '#1F4E9E', Math.min(1, (animProgress - 1.8) * 5));
      }
    }

    // Arrow between bars
    if (arrowAlpha > 0) {
      const yFrom = yToPixel(g.before);
      const yTo = yToPixel(g.after);
      const arrowMidX = beforeX + barWidth + (afterX - beforeX - barWidth) / 2;
      drawArrow(arrowMidX, yFrom, yTo, g.delta, easeOut(arrowAlpha));
    }
  }
}

function animateFrame(timestamp) {
  if (!animRunning) return;
  if (!animStart) animStart = timestamp;
  const elapsed = timestamp - animStart;
  const totalDuration = PHASE_DURATION * 3;
  animProgress = Math.min(3, (elapsed / totalDuration) * 3);
  draw();
  if (elapsed < totalDuration) {
    requestAnimationFrame(animateFrame);
  } else {
    animProgress = 3;
    animRunning = false;
    draw();
  }
}

function startAnimation(forceComplete) {
  if (played && !forceComplete) return;
  played = true;
  if (forceComplete || reduceMotion) {
    animRunning = false;
    animProgress = 3;
    animStart = null;
    draw();
    return;
  }
  animProgress = 0;
  animStart = null;
  animRunning = true;
  requestAnimationFrame(animateFrame);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const embedded = window.parent !== window;
let played = false;
if (embedded) {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

function init() {
  initCanvas();
  draw();
}

window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'cg-play') return;
  startAnimation(!!event.data.reduceMotion);
});

window.addEventListener('resize', () => {
  const wasComplete = animProgress >= 3;
  initCanvas();
  if (wasComplete) {
    animProgress = 3;
  }
  draw();
});

init();
if (!embedded) {
  setTimeout(() => startAnimation(false), 400);
}
