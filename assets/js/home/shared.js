window.ResearchSite = (function () {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();

  function alpha(hex, a) {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  const colors = {
    id: v('--series-id') || '#2E7D32',
    ood: v('--series-ood') || '#C5582D',
    blue: v('--series-blue') || '#1F4E9E',
    before: v('--series-before') || '#b0b7c3',
    grid: v('--series-grid') || '#e6e9ef',
    axis: v('--series-axis') || '#3a4453',
    text: v('--text') || '#1f2733',
    label: v('--text-muted') || '#5a6577',
  };

  return { colors: colors, alpha: alpha, figures: [] };
})();
