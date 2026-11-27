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

/* ═══════════════════════════════════════════════
   Yêu cầu thử lại ở nhà  (mm_home_requests)
   {id, studentId, groupId, foodId, dishName, icon, createdAt, expiresAt,
    status: pending | cooked | declined | expired | rated, respondedAt, ratedAt}
   - pending : học sinh bấm "Muốn" ở trường, chờ ba mẹ
   - cooked  : ba mẹ xác nhận con đã ăn ở nhà tối nay (con +20 XP), con được đánh giá đến hết ngày hôm sau
   - declined: ba mẹ bấm "Chưa nấu được"
   - expired : quá 7 ngày chưa trả lời, hoặc đã xác nhận nhưng con không đánh giá kịp (không XP đánh giá)
   - rated   : con đã đánh giá ở nhà
   Quy tắc tạo: mỗi nhóm chỉ một yêu cầu đang mở (pending/cooked); tối đa 2 yêu cầu mỗi học sinh mỗi ngày.
═══════════════════════════════════════════════ */
const MM_REQ_EXPIRE_DAYS = 7;
const MM_REQ_MAX_PER_DAY = 2;

function mmReqAll() { return store.get(MM_KEYS.HOME_REQUESTS, []); }

/* Hạn đánh giá ở nhà: hết ngày hôm sau ngày ba mẹ xác nhận (23:59:59.999 giờ local) */
function mmReqRateDeadline(req) {
  const d = new Date(req.respondedAt);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 23, 59, 59, 999);
}

/* Chuyển yêu cầu quá hạn sang expired; trả về danh sách mới nhất */
function mmReqSweep() {
  const list = mmReqAll();
  const now = new Date();
  let changed = false;
  list.forEach(r => {
    if (r.status === 'pending' && new Date(r.expiresAt) < now) { r.status = 'expired'; changed = true; }
    else if (r.status === 'cooked' && r.respondedAt && mmReqRateDeadline(r) < now) { r.status = 'expired'; changed = true; }
  });
  if (changed) store.set(MM_KEYS.HOME_REQUESTS, list);
  return list;
}

/* Tạo yêu cầu. Trả về {ok:true, req} hoặc {ok:false, reason:'dup'|'limit'|'error', message} */
function mmReqCreate(studentId, o) {
  const list = mmReqSweep();
  const open = list.some(r => r.studentId === studentId && r.groupId === o.groupId && (r.status === 'pending' || r.status === 'cooked'));
  if (open) return { ok: false, reason: 'dup', message: 'Em đã hẹn nhóm này rồi' };
  const today = toLocalDateStr(new Date());
  const n = list.filter(r => r.studentId === studentId && toLocalDateStr(new Date(r.createdAt)) === today).length;
  if (n >= MM_REQ_MAX_PER_DAY) return { ok: false, reason: 'limit', message: 'Hôm nay em đã hẹn đủ ' + MM_REQ_MAX_PER_DAY + ' món' };
  const now = new Date();
  const req = {
    id: 'rq' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    studentId, groupId: o.groupId, foodId: o.foodId, dishName: o.dishName, icon: o.icon || '🍽️',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + MM_REQ_EXPIRE_DAYS, 23, 59, 59, 999).toISOString(),
    status: 'pending', respondedAt: null, ratedAt: null,
  };
  list.push(req);
  if (!store.set(MM_KEYS.HOME_REQUESTS, list)) return { ok: false, reason: 'error', message: 'Chưa lưu được yêu cầu' };
  return { ok: true, req };
}

/* Ba mẹ trả lời: 'cooked' (con đã ăn ở nhà tối nay) hoặc 'declined' (chưa nấu được). Trả về yêu cầu đã cập nhật hoặc null */
function mmReqRespond(id, status) {
  const list = mmReqSweep();
  const r = list.find(x => x.id === id);
  if (!r || r.status !== 'pending' || (status !== 'cooked' && status !== 'declined')) return null;
  r.status = status;
  r.respondedAt = new Date().toISOString();
  return store.set(MM_KEYS.HOME_REQUESTS, list) ? r : null;
}

/* Con đánh giá xong ở nhà */
function mmReqMarkRated(id) {
  const list = mmReqAll();
  const r = list.find(x => x.id === id);
  if (!r) return null;
  r.status = 'rated';
  r.ratedAt = new Date().toISOString();
  return store.set(MM_KEYS.HOME_REQUESTS, list) ? r : null;
}
