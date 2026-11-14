/* ═══════════════════════════════════════════════
   xp.js — Sổ XP và Level (dùng chung Học sinh + Phụ huynh)

   - Số XP và Level lấy theo cấu hình của BGH (localStorage mm_xp_config):
     bảng "XP theo hành động" và bảng "Cấu hình Level".
   - Mỗi lần cộng XP được ghi vào sổ mm_xp_log (kèm refId để không cộng trùng).
   - XP của học sinh = XP hiện có (account.xp, mặc định 185 như dữ liệu mẫu)
                       + tổng XP trong sổ.
   Load SAU js/auth.js.
═══════════════════════════════════════════════ */

const XP_LOG_KEY      = 'mm_xp_log';
const XP_BASE_DEFAULT = 185;   // XP hiện có của học sinh mẫu, các lần cộng sẽ cộng dồn lên số này

/* Dùng khi BGH chưa mở trang Thiết lập (chưa có mm_xp_config); trùng mặc định bên BGH */
const XP_CONFIG_DEFAULT = {
  levels: [
    { level: 1, name: 'Người mới',        xpFrom: 0,   xpTo: 99,   unlock: 5  },
    { level: 2, name: 'Người khám phá',   xpFrom: 100, xpTo: 299,  unlock: 15 },
    { level: 3, name: 'Nhà thám hiểm',    xpFrom: 300, xpTo: 599,  unlock: 30 },
    { level: 4, name: 'Đại sứ dinh dưỡng', xpFrom: 600, xpTo: 9999, unlock: 99 },
  ],
  actions: [
    { id: 'first_try',      label: 'Thử món lần đầu',        xp: 15 },
    { id: 'emoji_rate',     label: 'Đánh giá emoji',         xp: 5  },
    { id: 'try_again',      label: 'Bấm TRY AGAIN',          xp: 3  },
    { id: 'send_tray',      label: 'Gửi khay cơm cho ba mẹ', xp: 10 },
    { id: 'parent_confirm', label: 'Ba mẹ xác nhận đã nấu',  xp: 20 },
  ],
};

function xpRead(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (e) { return fallback; }
}

/* ── Cấu hình của BGH ─────────────────────────── */
function getXpConfig() {
  const c = xpRead('mm_xp_config', null);
  return {
    levels:  c && Array.isArray(c.levels)  && c.levels.length  ? c.levels  : XP_CONFIG_DEFAULT.levels,
    actions: c && Array.isArray(c.actions) && c.actions.length ? c.actions : XP_CONFIG_DEFAULT.actions,
  };
}

/* Số XP của một hành động theo bảng "XP theo hành động" */
function xpAmount(actionId) {
  const a = getXpConfig().actions.find(x => x.id === actionId);
  const v = a ? Number(a.xp) : 0;
  return isFinite(v) ? v : 0;
}

/* ── XP của học sinh ──────────────────────────── */
function getXpBase(studentId) {
  const acc = xpRead('mm_accounts', []).find(a => a.id === studentId);
  return acc && typeof acc.xp === 'number' ? acc.xp : XP_BASE_DEFAULT;
}

/* Tổng XP đã cộng trong sổ cho học sinh */
function getXpLedgerSum(studentId) {
  return xpRead(XP_LOG_KEY, [])
    .filter(r => r.studentId === studentId)
    .reduce((sum, r) => sum + (Number(r.xp) || 0), 0);
}

function getStudentXp(studentId) {
  return getXpBase(studentId) + getXpLedgerSum(studentId);
}

/* BGH đặt tổng XP = total: giữ nguyên sổ XP, chỉ chỉnh XP nền (account.xp) cho khớp */
function xpBaseForTotal(studentId, total) {
  return total - getXpLedgerSum(studentId);
}

/* Level theo bảng "Cấu hình Level": level cao nhất có xpFrom ≤ XP.
   Mốc lên level kế tiếp = xpFrom của level đó (vd "185 / 300 XP"). */
function getLevelInfo(xp) {
  const levels = getXpConfig().levels.slice().sort((a, b) => a.xpFrom - b.xpFrom);
  let cur = levels[0];
  levels.forEach(l => { if (xp >= l.xpFrom) cur = l; });
  const next = levels.find(l => l.xpFrom > cur.xpFrom) || null;
  return {
    level:     cur.level,
    name:      cur.name,
    xp:        xp,
    nextLevel: next ? next.level : null,
    nextName:  next ? next.name : null,
    nextFrom:  next ? next.xpFrom : null,
    pct:       next ? Math.max(0, Math.min(100, Math.round((xp / next.xpFrom) * 100))) : 100,
    label:     next ? `${xp} / ${next.xpFrom} XP` : `${xp} XP (cao nhất)`,
  };
}

/* ── Cộng XP ─────────────────────────────────────
   list = [[actionId, refId], ...]. Mỗi cặp (học sinh, hành động, refId) chỉ được
   cộng một lần. Trả về {awarded, before, after, leveledUp}. */
function awardXpBatch(studentId, list) {
  const before = getLevelInfo(getStudentXp(studentId));
  const log = xpRead(XP_LOG_KEY, []);
  let awarded = 0;

  list.forEach(([actionId, refId]) => {
    const amount = xpAmount(actionId);
    if (!amount) return;
    if (refId && log.some(r => r.studentId === studentId && r.actionId === actionId && r.refId === refId)) return;
    log.push({ studentId, actionId, xp: amount, refId: refId || null, timestamp: new Date().toISOString() });
    awarded += amount;
  });

  if (awarded) {
    try { localStorage.setItem(XP_LOG_KEY, JSON.stringify(log)); }
    catch (e) { console.warn('Could not write mm_xp_log', e); awarded = 0; }
  }

  const after = getLevelInfo(getStudentXp(studentId));
  return { awarded, before, after, leveledUp: after.level > before.level };
}

function awardXp(studentId, actionId, refId) {
  return awardXpBatch(studentId, [[actionId, refId]]);
}

function levelUpText(res) {
  return res && res.leveledUp ? `🎉 Lên Level ${res.after.level} · ${res.after.name}!` : '';
}

/* ── Hiển thị trên các màn Học sinh ───────────── */
function refreshXpDisplay(studentId, name) {
  const info = getLevelInfo(getStudentXp(studentId));
  const text = `${name} · Level ${info.level}`;
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  ['s1Header', 's2Header', 's3Header'].forEach(id => set(id, text));   // "Tên · Level N"
  set('xpLabel', info.label);   // chỉ "x / mốc XP" (tên và level đã có ở dòng trên / khối avatar)
  set('heroLevel', `⭐ Level ${info.level} · ${info.name}`);
  document.querySelectorAll('.xp-fill').forEach(el => { el.style.width = info.pct + '%'; });
  return info;
}

/* Đọc lại XP mới nhất cho học sinh đang đăng nhập (an toàn với trang không có thanh XP) */
function refreshXpFromSession() {
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem('mm_session')); } catch (err) {}
  if (session && session.role === 'student') refreshXpDisplay(session.userId, session.name);
}

/* Tab khác (phụ huynh, BGH) đổi XP hoặc bảng cấu hình → cập nhật ngay trên màn Học sinh */
window.addEventListener('storage', e => {
  if (['mm_xp_log', 'mm_xp_config', 'mm_accounts'].indexOf(e.key) === -1) return;
  refreshXpFromSession();
});

/* Quay lại trang bằng nút Back (trang lấy từ bộ nhớ đệm) hoặc quay lại tab → đọc lại XP */
window.addEventListener('pageshow', refreshXpFromSession);
window.addEventListener('focus', refreshXpFromSession);
