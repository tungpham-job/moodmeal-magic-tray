/* ═══════════════════════════════════════════
   screen3.js — Thiết kế Khay cơm
   Tray cell management, ingredient highlight,
   score & nutrition tag logic
═══════════════════════════════════════════ */

/* ── State ── */
let trayScore = 65;

const cellOccupant = { tinBot: null, dam: null, rauCu: null, canh: null };
const trayFilled   = { tinBot: true, dam: true, rauCu: false, canh: false };

const groupLabels = {
  tinBot: 'Tinh bột',
  dam:    'Đạm',
  rauCu:  'Rau củ',
  canh:   'Canh',
};

// Score subtracted when removing a default pre-filled cell
// (cells that had no button occupant on page load)
const defaultCellScore = { tinBot: 35, dam: 30 };

const scoreThresholds = [
  { min: 90, hint: '🌟 Tuyệt vời! Khay dinh dưỡng hoàn hảo!',          color: '#1E8449' },
  { min: 80, hint: '✅ Gần hoàn hảo! Thêm canh sẽ đạt 90+ điểm',       color: '#2874A6' },
  { min: 70, hint: '👍 Khá tốt! Còn thiếu một nhóm thực phẩm',          color: '#7D3C98' },
  { min:  0, hint: '💡 Thêm rau củ và canh để tăng điểm!',              color: '#E67E22' },
];

/* ── Nutrition tags ── */
function updateNutritionTags() {
  document.getElementById('nutritionTags').innerHTML = Object.entries(trayFilled)
    .map(([g, ok]) => `<span class="n-tag ${ok ? 'n-ok' : 'n-miss'}">${ok ? '✓' : '✗'} ${groupLabels[g]}</span>`)
    .join('');
}

/* ── Score bar ── */
function updateScore() {
  trayScore = Math.min(Math.max(trayScore, 0), 100);
  document.getElementById('scoreVal').textContent  = Math.round(trayScore) + ' / 100';
  document.getElementById('scoreFill').style.width = trayScore + '%';
  const t    = scoreThresholds.find((t) => trayScore >= t.min);
  const hint = document.getElementById('scoreHint');
  hint.textContent = t.hint;
  hint.style.color = t.color;
}

/* ── Ingredient highlight ── */
function highlightGroup(g) {
  document.querySelectorAll('#ingRow .ing-btn').forEach((b) => {
    if (b.classList.contains('used')) return;
    b.classList.toggle('highlighted', b.dataset.group === g);
  });
}

function clearHighlight() {
  document.querySelectorAll('#ingRow .ing-btn').forEach((b) => b.classList.remove('highlighted'));
}

/* ── Cell click (show suggestion) ── */
function cellClick(g) {
  highlightGroup(g);
}

/* ── Remove cell → restore ingredient button ── */
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

/* ── Add ingredient to tray ── */
function addIng(btn) {
  const group = btn.dataset.group;
  const cell  = document.getElementById('cell-' + group);

  // Ô đúng nhóm đang filled → highlight để nhắc xóa trước
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

/* ── Send proposal ── */
function sendProposal() {
  const name = document.getElementById('trayName').value.trim() || 'Khay cơm của em';
  document.getElementById('sentTitle').textContent = `✅ Đã gửi "${name}"!`;
  document.getElementById('sentSub').textContent   = 'Bếp trưởng sẽ nhận vào sáng thứ Hai 7:00 · +20 XP 🌱';
  document.getElementById('sentBox').classList.add('show');
  document.getElementById('sendBtn').disabled    = true;
  document.getElementById('sendBtn').textContent = '✅ Đã gửi cho bếp trưởng!';
  document.querySelector('.screen-content').scrollTo({ top: 9999, behavior: 'smooth' });
}

/* ── Share with family ── */
function shareFamily() {
  const name = document.getElementById('trayName').value.trim() || 'Khay cơm của em';
  document.getElementById('sentTitle').textContent = '🏠 Đã gửi cho ba mẹ!';
  document.getElementById('sentSub').textContent   = `Ba mẹ nhận gợi ý nấu "${name}" tối nay · +10 XP 🌱`;
  document.getElementById('sentBox').classList.add('show');
  document.getElementById('familyBtn').disabled    = true;
  document.getElementById('familyBtn').textContent = '✅ Đã gửi cho ba mẹ!';
  document.querySelector('.screen-content').scrollTo({ top: 9999, behavior: 'smooth' });
}

/* ── Init ── */
updateNutritionTags();
updateScore();
// Auto-highlight first empty group on load
highlightGroup('rauCu');
