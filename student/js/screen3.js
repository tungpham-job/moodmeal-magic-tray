/* ═══════════════════════════════════════════════
   screen3.js — Thiết kế Khay cơm (Student)
   v3: bỏ sendProposal (gửi bếp trưởng)
       chỉ giữ shareFamily (gửi ba mẹ)
       ghi tray_log vào localStorage
═══════════════════════════════════════════════ */

/* ── State ───────────────────────────────────── */
let trayScore = 65;

const cellOccupant = { tinBot: null, dam: null, rauCu: null, canh: null };
const trayFilled   = { tinBot: true, dam: true, rauCu: false, canh: false };

const groupLabels = {
  tinBot: 'Tinh bột',
  dam:    'Đạm',
  rauCu:  'Rau củ',
  canh:   'Canh',
};

const defaultCellScore = { tinBot: 35, dam: 30 };

const scoreThresholds = [
  { min: 90, hint: '🌟 Tuyệt vời! Khay dinh dưỡng hoàn hảo!',     color: '#1E8449' },
  { min: 80, hint: '✅ Gần hoàn hảo! Thêm canh sẽ đạt 90+ điểm',  color: '#2874A6' },
  { min: 70, hint: '👍 Khá tốt! Còn thiếu một nhóm thực phẩm',     color: '#7D3C98' },
  { min:  0, hint: '💡 Thêm rau củ và canh để tăng điểm!',         color: '#E67E22' },
];

/* ── Nutrition tags ──────────────────────────── */
function updateNutritionTags() {
  document.getElementById('nutritionTags').innerHTML =
    Object.entries(trayFilled)
      .map(([g, ok]) =>
        `<span class="n-tag ${ok ? 'n-ok' : 'n-miss'}">${ok ? '✓' : '✗'} ${groupLabels[g]}</span>`)
      .join('');
}

/* ── Score bar ───────────────────────────────── */
function updateScore() {
  trayScore = Math.min(Math.max(trayScore, 0), 100);
  document.getElementById('scoreVal').textContent  = Math.round(trayScore) + ' / 100';
  document.getElementById('scoreFill').style.width = trayScore + '%';
  const t    = scoreThresholds.find(t => trayScore >= t.min);
  const hint = document.getElementById('scoreHint');
  hint.textContent = t.hint;
  hint.style.color = t.color;
}

/* ── Ingredient highlight ────────────────────── */
function highlightGroup(g) {
  document.querySelectorAll('#ingRow .ing-btn').forEach(b => {
    if (b.classList.contains('used')) return;
    b.classList.toggle('highlighted', b.dataset.group === g);
  });
}

function clearHighlight() {
  document.querySelectorAll('#ingRow .ing-btn').forEach(b => b.classList.remove('highlighted'));
}

/* ── Cell click → show suggestion ───────────── */
function cellClick(g) {
  highlightGroup(g);
}

/* ── Remove cell → restore ingredient ───────── */
function removeCell(event, group) {
  event.stopPropagation();
  const cell = document.getElementById('cell-' + group);
  if (!cell || !cell.classList.contains('filled')) return;

  const occupant = cellOccupant[group];
  if (occupant) {
    trayScore -= parseInt(occupant.dataset.score);
    occupant.classList.remove('used', 'highlighted');
    cellOccupant[group] = null;
  } else {
    trayScore -= defaultCellScore[group] || 0;
  }

  cell.classList.remove('filled');
  cell.innerHTML = `<div class="cell-plus">+</div><div class="cell-label">${groupLabels[group]}</div>`;
  trayFilled[group] = false;

  updateScore();
  updateNutritionTags();
  highlightGroup(group);
}

/* ── Add ingredient ──────────────────────────── */
function addIng(btn) {
  const group = btn.dataset.group;
  const cell  = document.getElementById('cell-' + group);

  if (!cell || cell.classList.contains('filled')) {
    highlightGroup(group);
    return;
  }

  fillCell(cell, group, btn);
}

function fillCell(cell, group, btn) {
  const icon = btn.dataset.icon;
  const name = btn.dataset.name;
  const pts  = parseInt(btn.dataset.score);

  cell.classList.add('filled');
  cell.innerHTML = `
    <div class="cell-icon">${icon}</div>
    <div class="cell-label">${name}</div>
    <div class="cell-group">${groupLabels[group]}</div>
    <button class="cell-remove" onclick="removeCell(event,'${group}')">✕</button>
  `;

  btn.classList.add('used');
  btn.classList.remove('highlighted');
  cellOccupant[group] = btn;
  trayFilled[group]   = true;
  trayScore           = Math.min(trayScore + pts, 100);

  updateScore();
  updateNutritionTags();
  clearHighlight();
}

/* ── Build tray snapshot ─────────────────────── */
function buildTrayData() {
  const cells = ['tinBot', 'dam', 'rauCu', 'canh'];
  return cells
    .filter(g => trayFilled[g])
    .map(g => {
      const occupant = cellOccupant[g];
      return {
        group: g,
        icon:  occupant ? occupant.dataset.icon : (g === 'tinBot' ? '🍚' : '🥩'),
        name:  occupant ? occupant.dataset.name : (g === 'tinBot' ? 'Cơm trắng' : 'Thịt kho'),
      };
    });
}

/* ── Write to tray_log ───────────────────────── */
function writeTrayLog(trayName) {
  const KEY = 'mm_tray_log';
  const session = auth.getSession();
  const accounts = auth.getAccounts();
  const acc = accounts.find(a => a.id === session?.userId);

  const entry = {
    id:              't' + Date.now(),
    studentId:       session?.userId || 'unknown',
    studentName:     acc?.name || session?.name || 'Học sinh',
    trayName:        trayName || 'Khay cơm của em',
    tray:            buildTrayData(),
    nutritionScore:  Math.round(trayScore),
    sentAt:          new Date().toISOString(),
    parentConfirmed: null,
    confirmedAt:     null,
    schoolScore:     null,
    schoolNote:      '',
  };

  try {
    const log = JSON.parse(localStorage.getItem(KEY)) || [];
    log.push(entry);
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch (e) {
    console.warn('Could not write tray_log', e);
  }

  return entry;
}

/* ── Share with family (only action in v3) ───── */
function shareFamily() {
  const name    = document.getElementById('trayName').value.trim() || 'Khay cơm của em';
  const btn     = document.getElementById('familyBtn');
  const sentBox = document.getElementById('sentBox');

  writeTrayLog(name);

  document.getElementById('sentTitle').textContent = '🏠 Đã gửi cho ba mẹ!';
  document.getElementById('sentSub').textContent   =
    `Ba mẹ nhận gợi ý nấu "${name}" tối nay · +10 XP 🌱`;
  sentBox.classList.add('show');

  btn.disabled    = true;
  btn.textContent = '✅ Đã gửi cho ba mẹ!';

  document.querySelector('.screen-content')
    .scrollTo({ top: 9999, behavior: 'smooth' });
}

/* ── Init ────────────────────────────────────── */
updateNutritionTags();
updateScore();
highlightGroup('rauCu'); // gợi ý nhóm trống đầu tiên
