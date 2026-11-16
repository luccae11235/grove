/* Share only the content height with the review gallery; standalone files work too. */
(() => {
  if (window.parent === window) return;
  const main = document.querySelector('main');
  if (!main) return;
  const report = () => window.parent.postMessage({ type: 'aflora-visual-height', height: Math.ceil(main.getBoundingClientRect().height + 4) }, '*');
  new ResizeObserver(report).observe(main);
  window.addEventListener('load', report);
  report();
})();
