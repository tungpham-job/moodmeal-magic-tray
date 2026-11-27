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
