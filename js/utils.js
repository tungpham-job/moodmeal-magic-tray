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

/* Công thức tính điểm khay: đọc từ BGH (mm_score_formula), thiếu hoặc sai → mặc định DEFAULT_SCORE_FORMULA. */
function mmScoreFormula() {
  const d = DEFAULT_SCORE_FORMULA;
  let f = null;
  try { f = (typeof store !== 'undefined' && typeof MM_KEYS !== 'undefined') ? store.get(MM_KEYS.SCORE_FORMULA, null) : null; } catch (e) { f = null; }
  const num = v => typeof v === 'number' && isFinite(v);
  const range = r => Array.isArray(r) && num(r[0]) && num(r[1]) && r[0] >= 0 && r[1] <= 100 && r[0] <= r[1];
  if (!f || !f.targets || !['carbs', 'protein', 'fat'].every(k => range(f.targets[k])) ||
      !num(f.tolerance) || f.tolerance <= 0 || !num(f.groupPts) || f.groupPts < 0 || !num(f.macroPts) || f.macroPts < 0 ||
      4 * f.groupPts + 3 * f.macroPts <= 0) return d;
  return f;
}

/* Điểm khay cơm 0–100 theo cân bằng năng lượng.
   items: [{group, portion, carbs, protein, fat}] (carbs/protein/fat: g trên 100 g, portion: g).
   Theo công thức của BGH (mmScoreFormula): mỗi nhóm có mặt được groupPts (tối đa 4 nhóm); mỗi chất (Carbs, Đạm, Béo)
   tối đa macroPts, đạt đủ khi % năng lượng nằm trong khoảng khuyến nghị, lệch ra ngoài thì trừ dần, về 0 khi lệch tolerance điểm phần trăm.
   Tổng quy về thang 100 (mặc định: 25 điểm đủ nhóm + 75 điểm cân bằng, mỗi chất 25).
   Kết quả kèm groupsMax, balanceMax, macroMax (điểm tối đa của từng phần trên thang 100). */
function mmTrayPct(items) {
  const g = { carbs: 0, protein: 0, fat: 0 };
  items.forEach(i => {
    const k = (Number(i.portion) || 0) / 100;
    g.carbs += (Number(i.carbs) || 0) * k; g.protein += (Number(i.protein) || 0) * k; g.fat += (Number(i.fat) || 0) * k;
  });
  const en = { carbs: 4 * g.carbs, protein: 4 * g.protein, fat: 9 * g.fat };
  const kcal = en.carbs + en.protein + en.fat;
  return { kcal, en, pct: kcal > 0 ? { carbs: 100 * en.carbs / kcal, protein: 100 * en.protein / kcal, fat: 100 * en.fat / kcal } : null };
}
function mmTrayScore(items) {
  const F = mmScoreFormula();
  const max = 4 * F.groupPts + 3 * F.macroPts, sc = 100 / max;
  const groups = new Set(items.map(i => i.group)).size;
  const groupsRaw = Math.min(groups, 4) * F.groupPts;
  const base = mmTrayPct(items);
  const res = { groups, groupsPts: Math.round(groupsRaw * sc), pct: null, parts: null, worst: null, kcal: base.kcal,
                groupsMax: Math.round(4 * F.groupPts * sc), macroMax: F.macroPts * sc };
  res.balanceMax = 100 - res.groupsMax;
  let bal = 0;
  if (base.pct) {
    res.pct = base.pct; res.parts = {}; let worstDev = 0;
    ['carbs', 'protein', 'fat'].forEach(k => {
      const p = base.pct[k], lo = F.targets[k][0], hi = F.targets[k][1];
      const dev = p < lo ? lo - p : (p > hi ? p - hi : 0);
      res.parts[k] = F.macroPts * Math.max(0, 1 - dev / F.tolerance) * sc;
      bal += res.parts[k];
      if (dev > worstDev) { worstDev = dev; res.worst = { key: k, dir: p < lo ? 'low' : 'high' }; }
    });
  }
  res.total = Math.max(0, Math.min(100, Math.round(groupsRaw * sc + bal)));
  res.balancePts = res.total - res.groupsPts;
  return res;
}
