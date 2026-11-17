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

/* Điểm dinh dưỡng của MỘT nguyên liệu (0–10), tính từ Carbs / Protein / Fat (g/100 g).
   Năng lượng: 4 kcal/g Carbs, 4 kcal/g Protein, 9 kcal/g Fat.
   Điểm = 10 × tỷ lệ năng lượng đến từ chất chính của nhóm:
     Tinh bột → Carbs · Đạm → Protein · Rau củ và Trái cây → Carbs + Protein (ít béo).
   Chỉ là quy ước đơn giản cho trò chơi, không phải chuẩn y khoa. Thiếu số liệu → null. */
function mmIngredientScore(g) {
  if (!g || [g.carbs, g.protein, g.fat].some(v => typeof v !== 'number' || isNaN(v))) return null;
  const c = 4 * g.carbs, p = 4 * g.protein, f = 9 * g.fat;
  const total = c + p + f;
  if (total <= 0) return null;
  const main = g.group === 'Tinh bột' ? c : g.group === 'Đạm' ? p : c + p;
  return Math.round(10 * main / total);
}
