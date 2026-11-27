/* ═══════════════════════════════════════════════
   badges.js — Danh hiệu của học sinh (dùng chung BGH + Phụ huynh)

   - Danh sách danh hiệu do BGH thiết lập: mm_badges
   - Danh hiệu mỗi em đã đạt: mm_badges_log  {studentId, badgeId, awardedDate,
     source: 'auto' | 'admin', revoked?: true}
   - Danh hiệu "Tự động" có điều kiện kiểm tra được thì hệ thống tự cấp
     (b01 đăng nhập, b02 FAS nhóm Rau, b03 số nguyên liệu nhóm Rau). Danh hiệu khác do BGH cấp tay.
   - BGH có thể cấp thêm hoặc thu hồi; danh hiệu đã bị thu hồi sẽ không tự cấp lại.
   Load SAU js/seed.js, js/utils.js, js/store.js và js/auth.js.
═══════════════════════════════════════════════ */

const BADGE_LOG_KEY = MM_KEYS.BADGES_LOG;

/* Danh hiệu mặc định (DEFAULT_BADGES): xem js/seed.js */

/* Điều kiện tự động theo mã danh hiệu */
const BADGE_RULES = { b01: 'first_login', b02: 'rau_group_fas', b03: 'rau_group_ingredients' };

/* Nhóm thực phẩm dùng cho điều kiện của b02 và b03 */
const BADGE_RAU_GROUP = 'g-rau';

function bdRead(key, fallback) { return store.get(key, fallback); }

function getBadgeDefs() {
  const d = bdRead(MM_KEYS.BADGES, null);
  return Array.isArray(d) && d.length ? d : DEFAULT_BADGES;
}

function getBadgeLog() { return bdRead(BADGE_LOG_KEY, []); }

function saveBadgeLog(log) {
  store.set(BADGE_LOG_KEY, log);
}

/* Danh hiệu đang có của học sinh (chỉ danh hiệu còn hoạt động), theo thứ tự danh sách */
function getEarnedBadges(studentId) {
  const log = getBadgeLog();
  const out = [];
  getBadgeDefs().forEach(def => {
    if (!def.active) return;
    const e = log.find(x => x.studentId === studentId && x.badgeId === def.id);
    if (e && !e.revoked) out.push({ def, awardedDate: e.awardedDate, source: e.source });
  });
  return out;
}

function badgeRuleMet(rule, studentId) {
  if (rule === 'first_login') {
    const acc = bdRead(MM_KEYS.ACCOUNTS, []).find(a => a.id === studentId);
    return !!(acc && acc.firstLoginAt)
      || bdRead(MM_KEYS.FAS_LOG, []).some(r => r.studentId === studentId)
      || bdRead(MM_KEYS.XP_LOG, []).some(r => r.studentId === studentId);
  }
  /* Chỉ tính các lượt THỬ thật (điểm 1–4); "Chưa thử" (điểm 0) không tính */
  const tried = mmTriedRows(mmGroupRows(bdRead(MM_KEYS.FAS_LOG, []), studentId, BADGE_RAU_GROUP));
  if (rule === 'rau_group_fas') return tried.length > 0 && Number(tried[tried.length - 1].score) >= 3.0;
  if (rule === 'rau_group_ingredients') return new Set(tried.map(r => r.foodId)).size >= 3;
  return false;
}

/* Tự cấp các danh hiệu "Tự động" mà bé đã đủ điều kiện (trừ danh hiệu BGH đã thu hồi) */
function evaluateAutoBadges(studentId) {
  const log = getBadgeLog();
  let changed = false;
  getBadgeDefs().filter(d => d.active && d.auto && BADGE_RULES[d.id]).forEach(d => {
    if (log.some(e => e.studentId === studentId && e.badgeId === d.id)) return;
    if (badgeRuleMet(BADGE_RULES[d.id], studentId)) {
      log.push({ studentId, badgeId: d.id, awardedDate: toLocalDateStr(new Date()), source: 'auto' });
      changed = true;
    }
  });
  if (changed) saveBadgeLog(log);
  return changed;
}

/* BGH đặt danh sách danh hiệu của học sinh: cấp thêm hoặc thu hồi cho khớp wantedIds */
function setStudentBadges(studentId, wantedIds) {
  const log = getBadgeLog();
  const today = toLocalDateStr(new Date());
  getBadgeDefs().filter(d => d.active).forEach(d => {
    const e = log.find(x => x.studentId === studentId && x.badgeId === d.id);
    const want = wantedIds.indexOf(d.id) !== -1;
    const has = !!e && !e.revoked;
    if (want && !has) {
      if (e) { e.revoked = false; e.source = 'admin'; e.awardedDate = today; }
      else log.push({ studentId, badgeId: d.id, awardedDate: today, source: 'admin' });
    } else if (!want && has) {
      e.revoked = true; e.source = 'admin';
    }
  });
  saveBadgeLog(log);
}
