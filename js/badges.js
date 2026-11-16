/* ═══════════════════════════════════════════════
   badges.js — Danh hiệu của học sinh (dùng chung BGH + Phụ huynh)

   - Danh sách danh hiệu do BGH thiết lập: mm_badges
   - Danh hiệu mỗi em đã đạt: mm_badges_log  {studentId, badgeId, awardedDate,
     source: 'auto' | 'admin', revoked?: true}
   - Danh hiệu "Tự động" có điều kiện kiểm tra được thì hệ thống tự cấp
     (b01, b02, b03). Danh hiệu khác do BGH cấp tay.
   - BGH có thể cấp thêm hoặc thu hồi; danh hiệu đã bị thu hồi sẽ không tự cấp lại.
   Load SAU js/seed.js, js/utils.js, js/store.js và js/auth.js.
═══════════════════════════════════════════════ */

const BADGE_LOG_KEY = MM_KEYS.BADGES_LOG;

/* Danh hiệu mặc định (DEFAULT_BADGES): xem js/seed.js */

/* Điều kiện tự động theo mã danh hiệu */
const BADGE_RULES = { b01: 'first_login', b02: 'rau_cu_fas', b03: 'xanh_la_foods' };

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

/* Món bé đã thử: mỗi món một dòng, kèm hành tinh và điểm FAS gần nhất */
function bdFoodStats(studentId) {
  const menu = bdRead(MM_KEYS.MENU, []);
  const byName = {};
  bdRead(MM_KEYS.FAS_LOG, []).filter(r => r.studentId === studentId).forEach(r => {
    const n = r.foodId || normFood(r.foodName);
    const o = byName[n] || (byName[n] = { latest: r, planet: null });
    if (r.attempt >= o.latest.attempt) o.latest = r;
    if (r.planet) o.planet = r.planet;
  });
  return Object.keys(byName).map(n => {
    const o = byName[n];
    if (!o.planet) {
      const nm = normFood(o.latest.foodName);
      const m = menu.find(x => x.planet && (x.ingredientId === o.latest.foodId || normFood(x.name) === nm));
      o.planet = (m && m.planet) || LEGACY_FOOD_PLANET[nm] || null;
    }
    return o;
  });
}

function badgeRuleMet(rule, studentId) {
  if (rule === 'first_login') {
    const acc = bdRead(MM_KEYS.ACCOUNTS, []).find(a => a.id === studentId);
    return !!(acc && acc.firstLoginAt)
      || bdRead(MM_KEYS.FAS_LOG, []).some(r => r.studentId === studentId)
      || bdRead(MM_KEYS.XP_LOG, []).some(r => r.studentId === studentId);
  }
  const foods = bdFoodStats(studentId);
  if (rule === 'rau_cu_fas') {
    const f = foods.filter(x => x.planet === 'Rau củ');
    return f.length > 0 && f.reduce((s, x) => s + Number(x.latest.score), 0) / f.length >= 3.0;
  }
  if (rule === 'xanh_la_foods') return foods.filter(x => x.planet === 'Xanh lá').length >= 3;
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
