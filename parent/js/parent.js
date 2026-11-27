/* ═══════════════════════════════════════════════
   parent.js — MOODMEAL MAGIC TRAY v3
   Giao diện Phụ huynh
   ① Tiến trình con  ② Yêu cầu thử món của con
═══════════════════════════════════════════════ */

/* ── Storage helpers ─────────────────────────── */
function load(key, fallback) { return store.get(key, fallback); }
function save(key, data)     { store.set(key, data); }

/* ── Session & linked student ────────────────── */
let SESSION   = null;
let STUDENT   = null; // account object của con

document.addEventListener('DOMContentLoaded', () => {
  SESSION = auth.check('parent');
  if (!SESSION) return;

  // Tìm account học sinh được liên kết
  const accounts = auth.getAccounts();
  STUDENT = accounts.find(a => a.id === SESSION.linkedId) || null;

  // Render app bar
  document.getElementById('parentName').textContent  = SESSION.name;
  document.getElementById('childName').textContent   = STUDENT ? STUDENT.name : '—';

  // Render các section
  renderSection1();
  startChildDate();
});

/* ══════════════════════════════════════════════
   SECTION ① — Tiến trình của con
══════════════════════════════════════════════ */
function renderSection1() {
  if (!STUDENT) {
    document.getElementById('sec1').innerHTML =
      `<div class="empty-state">
         <div class="empty-state-icon">👶</div>
         <div class="empty-state-text">Chưa liên kết tài khoản học sinh.<br>Liên hệ nhà trường để được hỗ trợ.</div>
       </div>`;
    return;
  }

  // Character card header
  document.getElementById('childAvatar').textContent = STUDENT.avatar || '🧒';
  document.getElementById('childNameCard').textContent  = STUDENT.name;
  // Level, XP và danh hiệu: đọc dữ liệu thật của con
  renderChildCard();

  // Hành trình FAS: lịch tháng, mặc định tháng + ngày đánh giá gần nhất
  initFasCalendar();
}

/* ══════════════════════════════════════════════
   Lịch hành trình FAS (theo NHÓM thực phẩm)
   - Mỗi lượt thử thật so với lượt thử thật trước đó của chính nhóm đó (cả trường và nhà):
     up (tăng) · down (giảm) · same (giữ nguyên / thử lần đầu / Chưa thử)
   - Ngày: tăng → xanh lá ▲, giảm → cam ▼, có cả hai → vàng ▲▼, còn lại → xanh dương •
══════════════════════════════════════════════ */
let FAS_DAYS     = {};    // { 'YYYY-MM-DD': [{ key, label, score, attempt, ts, trend }] }
let FAS_MONTH    = null;  // ngày 1 của tháng đang xem
let FAS_SEL_DATE = null;
let FAS_SEL_FOOD = null;  // khóa nhóm đang chọn trong ngày

const FAS_TREND_MARK = { up: '▲', down: '▼', mixed: '▲▼', same: '•' };

function buildFasDays() {
  const myLog = load(MM_KEYS.FAS_LOG, []).filter(r => r.studentId === STUDENT?.id);
  const byGroup = {};
  myLog.forEach(r => { const k = r.groupId || r.foodId || r.foodName; (byGroup[k] = byGroup[k] || []).push(r); });

  const days = {};
  Object.entries(byGroup).forEach(([key, list]) => {
    list.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    const grp = mmGroupById(key);
    const label = grp ? `${grp.icon} ${grp.name}` : (list[0].foodName || key);
    let prev = null;                                   // điểm của lượt thử thật gần nhất trước đó
    list.forEach(r => {
      const tried = r.score >= 1;
      const trend = !tried || prev === null || Math.abs(r.score - prev) < 0.001 ? 'same'
                  : (r.score > prev ? 'up' : 'down');
      if (tried) prev = r.score;
      const date  = toLocalDateStr(new Date(r.timestamp));
      (days[date] = days[date] || []).push({ key, label, score: r.score, attempt: r.attempt, ts: r.timestamp, trend });
    });
  });
  // Mỗi nhóm chỉ giữ lượt đánh giá cuối cùng trong ngày
  Object.keys(days).forEach(d => {
    const last = {};
    days[d].forEach(e => { if (!last[e.key] || String(e.ts) > String(last[e.key].ts)) last[e.key] = e; });
    days[d] = Object.values(last);
  });
  return days;
}

function dayTrend(items) {
  const up = items.some(e => e.trend === 'up'), down = items.some(e => e.trend === 'down');
  return up && down ? 'mixed' : up ? 'up' : down ? 'down' : 'same';
}

function initFasCalendar() {
  FAS_DAYS = buildFasDays();
  // Luôn mở đúng tháng hiện tại; chọn sẵn ngày đánh giá gần nhất TRONG tháng này (nếu có)
  const now = new Date();
  FAS_MONTH = new Date(now.getFullYear(), now.getMonth(), 1);
  const prefix = toLocalDateStr(FAS_MONTH).slice(0, 7);          // 'YYYY-MM'
  const dates  = Object.keys(FAS_DAYS).filter(d => d.slice(0, 7) === prefix).sort();
  FAS_SEL_DATE = dates.length ? dates[dates.length - 1] : null;
  FAS_SEL_FOOD = FAS_SEL_DATE ? FAS_DAYS[FAS_SEL_DATE][0].key : null;
  renderFasCalendar();
  renderFasDay();
}

function shiftFasMonth(dir) {
  FAS_MONTH = new Date(FAS_MONTH.getFullYear(), FAS_MONTH.getMonth() + dir, 1);
  renderFasCalendar();
}

function selectFasDate(date) {
  if (!FAS_DAYS[date]) return;
  FAS_SEL_DATE = date;
  FAS_SEL_FOOD = FAS_DAYS[date][0].key;
  renderFasCalendar();
  renderFasDay();
}

function selectFasFood(i) {
  const items = FAS_DAYS[FAS_SEL_DATE] || [];
  if (!items[i]) return;
  FAS_SEL_FOOD = items[i].key;
  renderFasDay();
}

function renderFasCalendar() {
  const y = FAS_MONTH.getFullYear(), m = FAS_MONTH.getMonth();
  const offset   = (new Date(y, m, 1).getDay() + 6) % 7;   // T2 = 0
  const nDays    = new Date(y, m + 1, 0).getDate();
  const todayStr = toLocalDateStr(new Date());

  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="fas-cal-cell blank"></div>';
  for (let d = 1; d <= nDays; d++) {
    const date  = toLocalDateStr(new Date(y, m, d));
    const items = FAS_DAYS[date];
    const trend = items ? dayTrend(items) : '';
    const cls   = ['fas-cal-cell', items ? 'has ' + trend : '', date === todayStr ? 'today' : '',
                   date === FAS_SEL_DATE ? 'sel' : ''].join(' ');
    cells += items
      ? `<button class="${cls}" onclick="selectFasDate('${date}')" title="${items.length} nhóm đã đánh giá">
           <span class="fas-cal-num">${d}</span><span class="fas-cal-mark">${FAS_TREND_MARK[trend]}</span></button>`
      : `<div class="${cls}"><span class="fas-cal-num">${d}</span></div>`;
  }

  document.getElementById('fasCal').innerHTML = `
    <div class="fas-cal-head">
      <span class="fas-cal-title">📅 Hành trình thử món</span>
      <div class="fas-cal-nav">
        <button class="fas-cal-btn" onclick="shiftFasMonth(-1)" aria-label="Tháng trước">◀</button>
        <span class="fas-cal-month">Tháng ${m + 1}/${y}</span>
        <button class="fas-cal-btn" onclick="shiftFasMonth(1)" aria-label="Tháng sau">▶</button>
      </div>
    </div>
    <div class="fas-cal-grid">
      ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(n => `<div class="fas-cal-wd">${n}</div>`).join('')}
      ${cells}
    </div>
    <div class="fas-cal-legend">
      <span><i class="lg up"></i>FAS tăng</span><span><i class="lg down"></i>FAS giảm</span><span><i class="lg mixed"></i>Có tăng, có giảm</span>
      <span><i class="lg same"></i>Lần đầu / giữ nguyên</span>
    </div>`;
}

function renderFasDay() {
  const box   = document.getElementById('fasDay');
  const items = FAS_SEL_DATE ? FAS_DAYS[FAS_SEL_DATE] : null;
  if (!items) {
    box.innerHTML = Object.keys(FAS_DAYS).length
      ? '<div class="fas-day-empty">Bấm vào ngày có đánh dấu màu để xem hành trình 🌱</div>'
      : '<div class="fas-day-empty">Con chưa đánh giá món nào. Hành trình sẽ hiện ở đây 🌱</div>';
    document.getElementById('fasBarsParent').innerHTML = '';
    document.getElementById('fasFagNote').style.display = 'none';
    return;
  }
  const dn = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const d  = new Date(FAS_SEL_DATE + 'T00:00:00');
  box.innerHTML = `
    <div class="fas-day-title">${dn[d.getDay()]}, ${formatYmd(FAS_SEL_DATE)} · ${items.length} nhóm</div>
    <div class="fas-day-chips">
      ${items.map((e, i) => `
        <button class="fas-food-chip ${e.trend} ${e.key === FAS_SEL_FOOD ? 'active' : ''}" onclick="selectFasFood(${i})">
          <span class="fas-food-mark">${FAS_TREND_MARK[e.trend]}</span>${escHtml(e.label)}
        </button>`).join('')}
    </div>`;
  const sel = items.find(e => e.key === FAS_SEL_FOOD) || items[0];
  renderFasChart(sel.key, sel.ts);
}

/* Ngày giờ hiện tại dưới thanh XP của con (cập nhật mỗi 30 giây) */
function startChildDate() {
  const el = document.getElementById('childDate');
  if (!el) return;
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const pad  = n => String(n).padStart(2, '0');
  const showNow = () => {
    const d = new Date();
    el.textContent =
      `${days[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  showNow();
  setInterval(showNow, 30000);
}

/* Level, thanh XP và danh hiệu của con (đọc XP thật theo bảng của BGH) */
function renderChildCard() {
  if (!STUDENT) return;
  const info = getLevelInfo(getStudentXp(STUDENT.id));
  document.getElementById('childLevelCard').textContent = `⭐ Level ${info.level} · ${info.name}`;
  document.getElementById('childXpLabel').textContent   = info.label;
  document.getElementById('childXpFill').style.width    = info.pct + '%';
  renderBadges();
}

function formatYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function renderBadges() {
  if (!STUDENT) return;
  evaluateAutoBadges(STUDENT.id);               // tự cấp danh hiệu "Tự động" đã đủ điều kiện
  const earned = {};
  getEarnedBadges(STUDENT.id).forEach(e => { earned[e.def.id] = e; });

  document.getElementById('badgesGrid').innerHTML = getBadgeDefs().filter(b => b.active).map(b => {
    const e = earned[b.id];
    const dateStr = e ? formatYmd(e.awardedDate) : '';
    return `
      <div class="badge-chip ${e ? 'earned' : 'locked'}"
           title="${escHtml(b.name)}: ${escHtml(b.desc)}${dateStr ? ' · ' + dateStr : ''}">
        <span class="b-icon">${escHtml(b.icon)}</span>
        <span class="b-name">${escHtml(b.name)}</span>
        ${dateStr ? `<span class="b-date">${dateStr}</span>` : ''}
      </div>`;
  }).join('');
}

/* Tên và ảnh đại diện của con (BGH có thể đổi) */
function refreshStudentInfo() {
  if (!SESSION) return;
  const acc = auth.getAccounts().find(a => a.id === SESSION.linkedId);
  if (!acc) return;
  STUDENT = acc;
  document.getElementById('childName').textContent      = acc.name;
  document.getElementById('childNameCard').textContent  = acc.name;
  document.getElementById('childAvatar').textContent    = acc.avatar || '🧒';
}

/* XP, danh hiệu hoặc thông tin của con đổi ở tab khác (học sinh, BGH) → cập nhật ngay */
window.addEventListener('storage', e => {
  const keys = [MM_KEYS.XP_LOG, MM_KEYS.XP_CONFIG, MM_KEYS.BADGES_LOG, MM_KEYS.BADGES, MM_KEYS.FAS_LOG, MM_KEYS.ACCOUNTS];
  if (e.key !== null && keys.indexOf(e.key) === -1) return;
  if (!STUDENT) return;
  if (e.key === null || e.key === MM_KEYS.ACCOUNTS) refreshStudentInfo();
  renderChildCard();
});

/* key: nhóm thực phẩm (mã nhóm; dòng cũ chưa có nhóm thì mã nguyên liệu); uptoTs: chỉ tính các lượt đến mốc thời gian này */
function renderFasChart(key, uptoTs) {
  const fasLog = load(MM_KEYS.FAS_LOG, []);
  const rows = fasLog
    .filter(r => r.studentId === STUDENT?.id && (r.groupId || r.foodId || r.foodName) === key)
    .filter(r => uptoTs == null || String(r.timestamp) <= String(uptoTs))
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const entries = mmTriedRows(rows);                    // chỉ lượt thử thật (điểm 1–4); "Chưa thử" không tính

  const bars    = document.getElementById('fasBarsParent');
  const fagNote = document.getElementById('fasFagNote');

  // 4 ô — hiện 4 lượt thử gần nhất của nhóm (nếu > 4 lượt thì trượt cửa sổ)
  const shown = entries.slice(-4);
  const base  = entries.length - shown.length + 1;
  const slots = Array.from({ length: 4 }, (_, i) => shown[i] ?? null);
  bars.innerHTML = slots.map((e, i) => {
    const val = e ? e.score : null;
    const pct = val ? (val / 4) * 100 : 0;
    const isCurrent = i === shown.length - 1 && e !== null;
    return `
      <div class="fas-bar-wrap-p">
        <div class="fas-bar-val-p">${val !== null ? val.toFixed(1) : '—'}</div>
        <div class="fas-bar-p ${isCurrent ? 'current' : ''} ${!val ? 'empty' : ''}"
             style="height:${pct}%"></div>
        <div class="fas-bar-lbl-p">Lần ${base + i}</div>
      </div>`;
  }).join('');

  // FAG note
  fagNote.style.display = 'block';
  if (entries.length >= 2) {
    const fag = (entries[entries.length - 1].score - entries[0].score).toFixed(1);
    const arrow = fag >= 0 ? '📈' : '📉';
    fagNote.textContent = `${arrow} FAS ${fag >= 0 ? 'tăng' : 'giảm'} ${Math.abs(fag)} qua ${entries.length} lần thử`;
  } else {
    fagNote.textContent = entries.length === 1 ? '🌱 Mới thử lần đầu! Tiếp tục khám phá nhé!'
                                               : '🌱 Con chưa thử nhóm này. Khi sẵn sàng con sẽ thử nhé!';
  }
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */
function formatTime(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  const dd   = String(d.getDate()).padStart(2,'0');
  const mm   = String(d.getMonth()+1).padStart(2,'0');
  const hh   = String(d.getHours()).padStart(2,'0');
  const min  = String(d.getMinutes()).padStart(2,'0');
  return `${days[d.getDay()]} ${dd}/${mm} ${hh}:${min}`;
}

function formatClock(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDateFull(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
  return `📅 ${days[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function showToast(msg) {
  const t = document.getElementById('pToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
