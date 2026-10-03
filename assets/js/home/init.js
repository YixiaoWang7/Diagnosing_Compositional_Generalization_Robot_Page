// Citation controls work independently of the optional experiment sections.
document.querySelectorAll('.copy-btn').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.nextElementSibling.textContent);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    } catch {
      button.textContent = 'Select citation to copy';
    }
  });
});

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const figures = window.ResearchSite.figures.filter((f) => f.watch);

  // Reduced motion or no observer support: jump straight to the final frame.
  if (reduceMotion || typeof IntersectionObserver === 'undefined') {
    figures.forEach((f) => f.play(true));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const fig = figures.find((f) => f.watch === entry.target);
      if (fig) fig.play(false);
    });
  }, { threshold: 0.35 });

  figures.forEach((f) => obs.observe(f.watch));
})();
