/* ═══════════════════════════════════════════════
   utils.js — Tiện ích dùng chung (không phụ thuộc file nào khác)
   Nạp sau config.js/seed.js, trước store.js và auth.js.
═══════════════════════════════════════════════ */

/* Thoát ký tự HTML.
   BẮT BUỘC dùng khi chèn chuỗi do người dùng nhập (tên khay, tên món, tên học sinh,
   ghi chú…) vào innerHTML / template string. */
function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Ngày dạng YYYY-MM-DD theo giờ LOCAL.
   Dùng thay cho toISOString().split('T')[0] (trả về ngày UTC,
   bị lệch 1 ngày ở UTC+7 khi giờ local < 07:00). */
function toLocalDateStr(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* Chuẩn hóa tên món để so khớp: bỏ dấu, viết thường, gọn khoảng trắng */
function normFood(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
