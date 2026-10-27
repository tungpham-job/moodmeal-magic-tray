/* ═══════════════════════════════════════════
   nav.js — Shared navigation helper
   Highlights the correct bottom-nav item
   based on the current page filename.
═══════════════════════════════════════════ */

(function () {
  const page = location.pathname.split('/').pop() || 'index.html';

  const map = {
    'index.html':   0,
    'screen1.html': 1,
    'screen2.html': 2,
    'screen3.html': 3,
  };

  const idx = map[page] ?? -1;
  if (idx === -1) return;

  const items = document.querySelectorAll('.bottom-nav .nav-item');
  items.forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
})();
