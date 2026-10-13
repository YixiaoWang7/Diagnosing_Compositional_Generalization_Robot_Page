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
  const nav = document.querySelector('.section-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')].map((link) => ({
    link,
    target: document.getElementById(link.hash.slice(1)),
  })).filter(({ target }) => target);
  if (!links.length) return;

  const scroller = nav.querySelector('.nav-links');
  let active;
  let pending = false;
  let resized = false;
  function update() {
    pending = false;
    let current = links[0];
    const offset = nav.offsetHeight + 24 + 2; // Allow fractional anchor-scroll rounding.
    links.forEach((entry) => {
      if (entry.target.getBoundingClientRect().top <= offset) current = entry;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = links[links.length - 1];
    }
    if (current === active && !resized) return;
    resized = false;
    active = current;
    links.forEach(({ link }) => {
      if (link === active.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (scroller) {
      const container = scroller.getBoundingClientRect();
      const link = active.link.getBoundingClientRect();
      if (link.left < container.left) scroller.scrollLeft += link.left - container.left;
      else if (link.right > container.right) scroller.scrollLeft += link.right - container.right;
    }
  }
  function scheduleUpdate(event) {
    if (event?.type === 'resize') resized = true;
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  ['load', 'pageshow', 'hashchange', 'resize'].forEach((event) => {
    window.addEventListener(event, scheduleUpdate);
  });
  scheduleUpdate();
})();

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
