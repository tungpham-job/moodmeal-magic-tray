/* ═══════════════════════════════════════════════
   parent.js — MOODMEAL MAGIC TRAY v3
   Giao diện Phụ huynh
   ① Tiến trình con  ② Gợi ý nấu ăn  ③ Lịch sử
═══════════════════════════════════════════════ */

/* ── Storage helpers ─────────────────────────── */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ── Session & linked student ────────────────── */
let SESSION   = null;
let STUDENT   = null; // account object của con
let TRAY_ITEM = null; // khay cơm mới nhất chưa xác nhận

document.addEventListener('DOMContentLoaded', () => {
  SESSION = auth.check('parent');
  if (!SESSION) return;

  // Tìm account học sinh được liên kết
  const accounts = auth.getAccounts();
  STUDENT = accounts.find(a => a.id === SESSION.linkedId) || null;

  // Render app bar
  document.getElementById('parentName').textContent  = SESSION.name;
  document.getElementById('childName').textContent   = STUDENT ? STUDENT.name : '—';

  // Render 3 section
  renderSection1();
  renderSection2();
  renderSection3();
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
   Lịch hành trình FAS (thay combobox chọn món)
   - Mỗi lần đánh giá so với lần thử trước của chính món đó:
     up (tăng) · down (giảm) · same (giữ nguyên / thử lần đầu)
   - Ngày: tăng → xanh lá ▲, giảm → cam ▼, có cả hai → vàng ▲▼, còn lại → xanh dương •
══════════════════════════════════════════════ */
let FAS_DAYS     = {};    // { 'YYYY-MM-DD': [{ foodName, score, attempt, trend }] }
let FAS_MONTH    = null;  // ngày 1 của tháng đang xem
let FAS_SEL_DATE = null;
let FAS_SEL_FOOD = null;

const FAS_TREND_MARK = { up: '▲', down: '▼', mixed: '▲▼', same: '•' };

function buildFasDays() {
  const myLog = load('mm_fas_log', []).filter(r => r.studentId === STUDENT?.id);
  const byFood = {};
  myLog.forEach(r => { (byFood[r.foodName] = byFood[r.foodName] || []).push(r); });

  const days = {};
  Object.values(byFood).forEach(list => {
    list.sort((a, b) => a.attempt - b.attempt);
    list.forEach((r, i) => {
      const prev  = i > 0 ? list[i - 1].score : null;
      const trend = prev === null || Math.abs(r.score - prev) < 0.001 ? 'same'
                  : (r.score > prev ? 'up' : 'down');
      const date  = toLocalDateStr(new Date(r.timestamp));
      (days[date] = days[date] || []).push({ foodName: r.foodName, score: r.score, attempt: r.attempt, trend });
    });
  });
  // Mỗi món chỉ giữ lần đánh giá cuối cùng trong ngày
  Object.keys(days).forEach(d => {
    const last = {};
    days[d].forEach(e => { if (!last[e.foodName] || e.attempt > last[e.foodName].attempt) last[e.foodName] = e; });
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
  const dates = Object.keys(FAS_DAYS).sort();
  FAS_SEL_DATE = dates.length ? dates[dates.length - 1] : null;
  FAS_SEL_FOOD = FAS_SEL_DATE ? FAS_DAYS[FAS_SEL_DATE][0].foodName : null;
  const base = FAS_SEL_DATE ? new Date(FAS_SEL_DATE + 'T00:00:00') : new Date();
  FAS_MONTH = new Date(base.getFullYear(), base.getMonth(), 1);
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
  FAS_SEL_FOOD = FAS_DAYS[date][0].foodName;
  renderFasCalendar();
  renderFasDay();
}

function selectFasFood(i) {
  const items = FAS_DAYS[FAS_SEL_DATE] || [];
  if (!items[i]) return;
  FAS_SEL_FOOD = items[i].foodName;
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
      ? `<button class="${cls}" onclick="selectFasDate('${date}')" title="${items.length} món đã đánh giá">
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
    box.innerHTML = '<div class="fas-day-empty">Con chưa đánh giá món nào. Hành trình sẽ hiện ở đây 🌱</div>';
    document.getElementById('fasBarsParent').innerHTML = '';
    document.getElementById('fasFagNote').style.display = 'none';
    return;
  }
  const dn = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const d  = new Date(FAS_SEL_DATE + 'T00:00:00');
  box.innerHTML = `
    <div class="fas-day-title">${dn[d.getDay()]}, ${formatYmd(FAS_SEL_DATE)} · ${items.length} món</div>
    <div class="fas-day-chips">
      ${items.map((e, i) => `
        <button class="fas-food-chip ${e.trend} ${e.foodName === FAS_SEL_FOOD ? 'active' : ''}" onclick="selectFasFood(${i})">
          <span class="fas-food-mark">${FAS_TREND_MARK[e.trend]}</span>${e.foodName}
        </button>`).join('')}
    </div>`;
  const sel = items.find(e => e.foodName === FAS_SEL_FOOD) || items[0];
  renderFasChart(sel.foodName, sel.attempt);
}

/* Level, thanh XP và danh hiệu của con (đọc XP thật theo bảng của BGH) */
function renderChildCard() {
  if (!STUDENT) return;
  const info = getLevelInfo(getStudentXp(STUDENT.id));
  document.getElementById('childLevelCard').textContent = `⭐ Level ${info.level} · ${info.name}`;
  document.getElementById('childXpLabel').textContent   = info.label;
  document.getElementById('childXpFill').style.width    = info.pct + '%';
  document.getElementById('childNextLevel').textContent = info.nextLevel ? `Level ${info.nextLevel} →` : '';
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
           title="${b.name}: ${b.desc}${dateStr ? ' · ' + dateStr : ''}">
        <span class="b-icon">${b.icon}</span>
        <span class="b-name">${b.name}</span>
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
  const keys = ['mm_xp_log', 'mm_xp_config', 'mm_badges_log', 'mm_badges', 'mm_fas_log', 'mm_accounts'];
  if (e.key !== null && keys.indexOf(e.key) === -1) return;
  if (!STUDENT) return;
  if (e.key === null || e.key === 'mm_accounts') refreshStudentInfo();
  renderChildCard();
});

/* uptoAttempt: chỉ tính các lần thử đến lần này (lần của ngày được chọn) */
function renderFasChart(foodName, uptoAttempt) {
  const fasLog = load('mm_fas_log', []);
  const entries = fasLog
    .filter(r => r.studentId === STUDENT?.id && r.foodName === foodName)
    .filter(r => uptoAttempt == null || r.attempt <= uptoAttempt)
    .sort((a, b) => a.attempt - b.attempt);

  const bars    = document.getElementById('fasBarsParent');
  const fagNote = document.getElementById('fasFagNote');

  // Build 4 slots — hiện 4 lần thử gần nhất (nếu > 4 lần thì trượt cửa sổ)
  const shown = entries.slice(-4);
  const base  = shown.length ? shown[0].attempt : 1;
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
  if (entries.length >= 2) {
    const fag = (entries[entries.length - 1].score - entries[0].score).toFixed(1);
    const arrow = fag >= 0 ? '📈' : '📉';
    fagNote.textContent = `${arrow} FAS ${fag >= 0 ? 'tăng' : 'giảm'} ${Math.abs(fag)} qua ${entries.length} lần thử`;
    fagNote.style.display = 'block';
  } else {
    fagNote.style.display = entries.length === 1 ? 'block' : 'none';
    if (entries.length === 1) fagNote.textContent = '🌱 Mới thử lần đầu! Tiếp tục khám phá nhé!';
  }
}

/* ══════════════════════════════════════════════
   SECTION ② — Gợi ý nấu ăn hôm nay
══════════════════════════════════════════════ */
function renderSection2() {
  const trayLog = load('mm_tray_log', []);

  // Lấy khay mới nhất của con, chưa xác nhận (parentConfirmed === null)
  const myTrays = trayLog
    .filter(t => t.studentId === STUDENT?.id)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const pending = myTrays.find(t => t.parentConfirmed === null);
  TRAY_ITEM = pending || null;

  const wrap = document.getElementById('trayPreviewWrap');

  if (!TRAY_ITEM) {
    // Kiểm tra có khay đã xác nhận hôm nay không
    const today     = toLocalDateStr(new Date());
    const confirmed = myTrays.find(t =>
      t.parentConfirmed === true &&
      t.confirmedAt && toLocalDateStr(new Date(t.confirmedAt)) === today
    );

    if (confirmed) {
      wrap.innerHTML = `
        <div class="no-tray-placeholder">
          ✅ Ba mẹ đã xác nhận khay cơm hôm nay!<br>
          <span style="font-size:12px;color:#aaa">"${confirmed.trayName}"</span>
        </div>`;
    } else {
      wrap.innerHTML = `
        <div class="no-tray-placeholder">
          🌱 Con chưa gửi khay cơm hôm nay.<br>
          <span style="font-size:12px;color:#aaa">Nhắc con thiết kế khay sau bữa trưa nhé!</span>
        </div>`;
    }
    // Ẩn nút confirm
    document.getElementById('confirmActions').style.display = 'none';
    return;
  }

  // Render tray preview
  const icons = TRAY_ITEM.tray.map(x => x.icon).join('');
  const itemsHTML = TRAY_ITEM.tray.map(x => `
    <div class="tray-item-chip">
      <span class="tray-item-icon">${x.icon}</span>
      <div>
        <div class="tray-item-name">${x.name}</div>
        <div class="tray-item-group">${groupLabel(x.group)}</div>
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="tray-name-display">${TRAY_ITEM.trayName} ${icons}</div>
    <div class="tray-items-row">${itemsHTML}</div>
    <div class="tray-meta">
      <span class="tray-score">⭐ ${TRAY_ITEM.nutritionScore}/100 điểm dinh dưỡng</span>
      <span class="tray-sent-time">Con gửi lúc ${formatTime(TRAY_ITEM.sentAt)}</span>
    </div>`;

  document.getElementById('confirmActions').style.display = 'flex';
}

function groupLabel(g) {
  return { tinBot: 'Tinh bột', dam: 'Đạm', rauCu: 'Rau củ', canh: 'Canh' }[g] || g;
}

/* Bấm xác nhận đã nấu */
function confirmCooked() {
  if (!TRAY_ITEM) return;
  const now = new Date().toISOString();
  updateTrayLog(TRAY_ITEM.id, { parentConfirmed: true, confirmedAt: now });

  // Cộng XP "Ba mẹ xác nhận đã nấu" cho con theo bảng của BGH (mỗi khay chỉ cộng một lần)
  const xpRes  = STUDENT ? awardXp(STUDENT.id, 'parent_confirm', TRAY_ITEM.id) : null;
  const gained = xpRes ? xpRes.awarded : 0;
  const lvText = xpRes && xpRes.leveledUp ? ` Con lên Level ${xpRes.after.level}!` : '';
  renderChildCard();   // cập nhật ngay thẻ XP / Level của con

  // UI
  const btnYes = document.getElementById('btnConfirmYes');
  const btnNo  = document.getElementById('btnConfirmNo');
  const result = document.getElementById('confirmResult');
  btnYes.disabled = true;
  btnNo.disabled  = true;
  btnYes.textContent = `✅ Đã xác nhận lúc ${formatClock(now)}`;
  result.textContent = `🎉 Con nhận +${gained} XP!${lvText} Cảm ơn ba mẹ đã ủng hộ con khám phá ẩm thực!`;
  result.className   = 'confirm-result show yes';

  showToast(`✅ Đã xác nhận! Con nhận +${gained} XP 🌱${lvText}`);
  // Refresh timeline
  setTimeout(renderSection3, 400);
}

/* Bấm chưa nấu được */
function notCooked() {
  if (!TRAY_ITEM) return;
  updateTrayLog(TRAY_ITEM.id, { parentConfirmed: false });

  const btnYes = document.getElementById('btnConfirmYes');
  const btnNo  = document.getElementById('btnConfirmNo');
  const result = document.getElementById('confirmResult');
  btnYes.disabled = true;
  btnNo.disabled  = true;
  btnNo.textContent = '✗ Tối nay chưa nấu được';
  result.textContent = 'Hẹn lần sau nhé! 🌱 Con sẽ tiếp tục gửi gợi ý.';
  result.className   = 'confirm-result show no';

  showToast('Đã ghi nhận. Hẹn lần sau! 🌱');
  setTimeout(renderSection3, 400);
}

/* Cập nhật tray_log theo id */
function updateTrayLog(id, patch) {
  const log = load('mm_tray_log', []);
  const idx = log.findIndex(t => t.id === id);
  if (idx === -1) return;
  log[idx] = { ...log[idx], ...patch };
  save('mm_tray_log', log);
}

/* ══════════════════════════════════════════════
   SECTION ③ — Lịch sử xác nhận
══════════════════════════════════════════════ */
function renderSection3() {
  const trayLog = load('mm_tray_log', []);
  const myTrays = trayLog
    .filter(t => t.studentId === STUDENT?.id && t.sentAt)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 14); // 2 tuần ~ tối đa 14 bữa

  const timeline = document.getElementById('historyTimeline');

  if (!myTrays.length) {
    timeline.innerHTML = `<div class="timeline-empty">📭 Chưa có lịch sử khay cơm</div>`;
    return;
  }

  timeline.innerHTML = myTrays.map(t => {
    const icons = t.tray ? t.tray.map(x => x.icon).join('') : '—';
    let statusClass, statusText, dotClass;

    if (t.parentConfirmed === true) {
      dotClass    = 'confirmed';
      statusClass = 'yes';
      statusText  = `✅ Ba mẹ xác nhận đã nấu lúc ${formatTime(t.confirmedAt)}`;
    } else if (t.parentConfirmed === false) {
      dotClass    = 'declined';
      statusClass = 'no';
      statusText  = '✗ Tối đó chưa nấu được';
    } else {
      dotClass    = 'pending';
      statusClass = 'pending';
      statusText  = '⏳ Chờ ba mẹ xác nhận';
    }

    return `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-content">
          <div class="timeline-date">${formatDateFull(t.sentAt)}</div>
          <div class="timeline-tray-name">"${t.trayName}"</div>
          <div class="timeline-icons">${icons}</div>
          <div class="timeline-status ${statusClass}">${statusText}</div>
        </div>
      </div>`;
  }).join('');
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
