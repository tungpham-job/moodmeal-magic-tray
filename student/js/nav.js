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

  /* Ngày giờ hiện tại ở tiêu đề (phần tử #dateDisplay), cập nhật mỗi 30 giây */
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const pad  = n => String(n).padStart(2, '0');
    const showNow = () => {
      const d = new Date();
      dateEl.textContent =
        `${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    showNow();
    setInterval(showNow, 30000);
  }

  const items = document.querySelectorAll('.bottom-nav .nav-item');
  items.forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
})();
