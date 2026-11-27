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

/* Tìm số liệu dinh dưỡng cho từng ô của một khay đã gửi (tray_log): theo ingredientId, khay cũ không có thì theo tên.
   Trả về { found: [{group, portion, carbs, protein, fat}], missing: [tên ô chưa có số liệu] }. */
function mmTrayResolve(t) {
  const table = store.get(MM_KEYS.NUTRITION, DEFAULT_NUTRITION_TABLE);
  const ings  = store.get(MM_KEYS.INGREDIENTS, DEFAULT_INGREDIENTS);
  const norm = x => String(x || '').trim().toLowerCase();
  const found = [], missing = [];
  ((t && t.tray) || []).forEach(it => {
    const src = (it.ingredientId && (table.find(r => r.id === it.ingredientId) || ings.find(r => r.id === it.ingredientId)))
      || table.find(r => norm(r.name) === norm(it.name)) || ings.find(r => norm(r.name) === norm(it.name));
    if (src && [src.portion, src.carbs, src.protein, src.fat].every(v => typeof v === 'number')) found.push({ group: it.group, portion: src.portion, carbs: src.carbs, protein: src.protein, fat: src.fat });
    else missing.push(it.name);
  });
  return { found, missing };
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

/* ═══════ Nhóm thực phẩm và FAS / FAG theo nhóm ═══════ */

/* Danh sách nhóm thực phẩm (đang dùng), theo thứ tự hiển thị. includeInactive=true → lấy cả nhóm đã ẩn. */
function mmFoodGroups(includeInactive) {
  const list = store.get(MM_KEYS.FOOD_GROUPS, DEFAULT_FOOD_GROUPS);
  return list.filter(g => includeInactive || g.active !== false)
             .slice().sort((a, b) => (a.order || 0) - (b.order || 0));
}
function mmGroupById(id) {
  return mmFoodGroups(true).find(g => g.id === id) || null;
}

/* Các lượt đánh giá của MỘT học sinh trong MỘT nhóm, xếp theo thời gian (gồm cả lượt "Chưa thử" điểm 0, để hiện trong chuỗi). */
function mmGroupRows(log, studentId, groupId) {
  return log.filter(r => r.studentId === studentId && r.groupId === groupId)
            .slice().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

/* Chỉ các lượt THỬ thật (điểm 1–4): "Chưa thử" (điểm 0) không phải lượt thử của nhóm. */
function mmTriedRows(rows) { return rows.filter(r => r.score >= 1 && r.score <= 4); }

/* FAS hiện tại của nhóm = điểm lượt thử thật gần nhất; chưa có lượt thật → null. */
function mmGroupFas(rows) { const t = mmTriedRows(rows); return t.length ? t[t.length - 1].score : null; }

/* FAG của nhóm = FAS lượt thật cuối − FAS lượt thật đầu (cả trường và nhà); dưới 2 lượt thật → null. */
function mmGroupFag(rows) {
  const t = mmTriedRows(rows);
  return t.length >= 2 ? t[t.length - 1].score - t[0].score : null;
}

/* Chuỗi hiển thị, ví dụ "0 → 2 → 3" (điểm 0 = "Chưa thử"). */
function mmFasChainText(rows) { return rows.map(r => r.score).join(' → '); }

/* Đánh số lại lượt thử THEO NHÓM của từng học sinh (sửa trực tiếp mảng log):
   lượt thật (điểm 1–4) đánh số 1, 2, 3… theo thời gian; "Chưa thử" (điểm 0) có attempt = null.
   Dòng chưa có groupId (dữ liệu cũ không gán được nhóm) giữ nguyên. */
function mmRenumberFasLog(log) {
  const chains = {};
  log.forEach(r => {
    if (!r.groupId) return;
    if (r.score === 0) { r.attempt = null; return; }
    if (!(r.score >= 1)) return;
    (chains[r.studentId + '|' + r.groupId] = chains[r.studentId + '|' + r.groupId] || []).push(r);
  });
  Object.keys(chains).forEach(k => {
    chains[k].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    chains[k].forEach((r, i) => { r.attempt = i + 1; });
  });
  return log;
}
