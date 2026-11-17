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

/* Điểm khay cơm 0–100 theo cân bằng năng lượng.
   items: [{group, portion, carbs, protein, fat}] (carbs/protein/fat: g trên 100 g, portion: g).
   25 điểm = đủ 4 nhóm (6,25 mỗi nhóm); 75 điểm = cân bằng năng lượng, mỗi chất (Carbs, Đạm, Béo) tối đa 25,
   đạt đủ khi nằm trong khoảng khuyến nghị, lệch ra ngoài thì trừ dần, về 0 khi lệch MM_TRAY_TOLERANCE điểm phần trăm.
   Khoảng khuyến nghị là giá trị mặc định, chưa đối chiếu nguồn chính thức. */
const MM_TRAY_TARGETS = { carbs: [55, 65], protein: [13, 20], fat: [20, 30] };
const MM_TRAY_TOLERANCE = 15;
function mmTrayScore(items) {
  const groups = new Set(items.map(i => i.group)).size;
  const groupsRaw = Math.min(groups, 4) * 6.25;
  const g = { carbs: 0, protein: 0, fat: 0 };
  items.forEach(i => {
    const k = (Number(i.portion) || 0) / 100;
    g.carbs += (Number(i.carbs) || 0) * k; g.protein += (Number(i.protein) || 0) * k; g.fat += (Number(i.fat) || 0) * k;
  });
  const en = { carbs: 4 * g.carbs, protein: 4 * g.protein, fat: 9 * g.fat };
  const kcal = en.carbs + en.protein + en.fat;
  const res = { groups, groupsPts: Math.round(groupsRaw), pct: null, parts: null, worst: null, kcal };
  let bal = 0;
  if (kcal > 0) {
    res.pct = {}; res.parts = {}; let worstDev = 0;
    Object.keys(MM_TRAY_TARGETS).forEach(k => {
      const p = 100 * en[k] / kcal, lo = MM_TRAY_TARGETS[k][0], hi = MM_TRAY_TARGETS[k][1];
      const dev = p < lo ? lo - p : (p > hi ? p - hi : 0);
      res.pct[k] = p;
      res.parts[k] = 25 * Math.max(0, 1 - dev / MM_TRAY_TOLERANCE);
      bal += res.parts[k];
      if (dev > worstDev) { worstDev = dev; res.worst = { key: k, dir: p < lo ? 'low' : 'high' }; }
    });
  }
  res.total = Math.max(0, Math.min(100, Math.round(groupsRaw + bal)));
  res.balancePts = res.total - res.groupsPts;
  return res;
}
