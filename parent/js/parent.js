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
  document.getElementById('childLevelCard').textContent = '⭐ Level 2 · Người khám phá';
  // XP (hardcode demo — sẽ lấy từ Sheets ở Bước 5)
  document.getElementById('childXpLabel').textContent = '185 / 300 XP';
  document.getElementById('childXpFill').style.width  = '62%';

  // Badges
  renderBadges();

  // FAS chart: populate dropdown
  const fasLog  = load('mm_fas_log', []);
  const myLog   = fasLog.filter(r => r.studentId === STUDENT.id);
  const foods   = [...new Set(myLog.map(r => r.foodName))];
  const sel     = document.getElementById('fasFood');
  sel.innerHTML = foods.length
    ? foods.map(f => `<option value="${f}">${f}</option>`).join('')
    : '<option value="">Chưa có dữ liệu</option>';

  if (foods.length) renderFasChart(foods[0]);
}

function renderBadges() {
  const badges    = load('mm_badges', []);
  const badgesLog = load('mm_badges_log', []); // {studentId, badgeId, awardedDate}
  const myBadges  = badgesLog.filter(b => b.studentId === STUDENT?.id).map(b => b.badgeId);

  // Demo: coi badge b01, b02 là đã đạt
  const demoEarned = ['b01', 'b02'];

  document.getElementById('badgesGrid').innerHTML = badges.map(b => {
    const earned = myBadges.includes(b.id) || demoEarned.includes(b.id);
    const dateStr = earned ? '21/10/2026' : '';
    return `
      <div class="badge-chip ${earned ? 'earned' : 'locked'}"
           title="${b.name}: ${b.desc}${dateStr ? ' · ' + dateStr : ''}">
        <span class="b-icon">${b.icon}</span>
        <span class="b-name">${b.name}</span>
        ${dateStr ? `<span class="b-date">${dateStr}</span>` : ''}
      </div>`;
  }).join('');
}

function renderFasChart(foodName) {
  const fasLog = load('mm_fas_log', []);
  const entries = fasLog
    .filter(r => r.studentId === STUDENT?.id && r.foodName === foodName)
    .sort((a, b) => a.attempt - b.attempt);

  const bars    = document.getElementById('fasBarsParent');
  const fagNote = document.getElementById('fasFagNote');

  // Build 4 slots
  const slots = Array.from({ length: 4 }, (_, i) => entries[i] ?? null);
  bars.innerHTML = slots.map((e, i) => {
    const val = e ? e.score : null;
    const pct = val ? (val / 4) * 100 : 0;
    const isCurrent = i === entries.length - 1 && e !== null;
    return `
      <div class="fas-bar-wrap-p">
        <div class="fas-bar-val-p">${val !== null ? val.toFixed(1) : '—'}</div>
        <div class="fas-bar-p ${isCurrent ? 'current' : ''} ${!val ? 'empty' : ''}"
             style="height:${pct}%"></div>
        <div class="fas-bar-lbl-p">Lần ${i + 1}</div>
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
    const today     = new Date().toISOString().split('T')[0];
    const confirmed = myTrays.find(t =>
      t.parentConfirmed === true &&
      t.confirmedAt?.startsWith(today)
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

  // UI
  const btnYes = document.getElementById('btnConfirmYes');
  const btnNo  = document.getElementById('btnConfirmNo');
  const result = document.getElementById('confirmResult');
  btnYes.disabled = true;
  btnNo.disabled  = true;
  btnYes.textContent = `✅ Đã xác nhận lúc ${formatClock(now)}`;
  result.textContent = '🎉 Con nhận +20 XP! Cảm ơn ba mẹ đã ủng hộ con khám phá ẩm thực!';
  result.className   = 'confirm-result show yes';

  showToast('✅ Đã xác nhận! Con nhận +20 XP 🌱');
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
