/* ═══════════════════════════════════════════
   screen1.js — Hành tinh Thực phẩm
   Planet popup logic
═══════════════════════════════════════════ */

const popupData = {
  rauCu: {
    title: '🥕 Hành tinh Rau củ — Đã mở khóa!',
    items: [
      { icon: '🥕', name: 'Cà rốt',    fas: 'FAS: 3.2 ⭐' },
      { icon: '🥬', name: 'Rau muống', fas: 'FAS: 3.8 ⭐' },
      { icon: '🍅', name: 'Cà chua',   fas: 'FAS: 2.5 ⭐' },
      { icon: '❓', name: '?? Món 4',  fas: 'Chưa khám phá' },
      { icon: '❓', name: '?? Món 5',  fas: 'Chưa khám phá' },
    ],
  },
  dam: {
    title: '🍗 Hành tinh Đạm — Đã mở khóa!',
    items: [
      { icon: '🍗', name: 'Thịt gà',  fas: 'FAS: 3.9 ⭐' },
      { icon: '🥚', name: 'Trứng kho', fas: 'FAS: 3.5 ⭐' },
      { icon: '🐟', name: 'Cá kho',   fas: 'FAS: 3.1 ⭐' },
      { icon: '🥩', name: 'Thịt heo', fas: 'FAS: 3.7 ⭐' },
      { icon: '❓', name: '?? Món 5',  fas: 'Chưa khám phá' },
    ],
  },
  xanhLa: {
    title: '🥦 Hành tinh Xanh lá — Đang mở khóa!',
    items: [
      { icon: '🥦', name: 'Bông cải xanh', fas: '→ Thử hôm nay để mở khóa!' },
      { icon: '🔒', name: 'Món 2', fas: 'Chưa mở' },
      { icon: '🔒', name: 'Món 3', fas: 'Chưa mở' },
      { icon: '🔒', name: 'Món 4', fas: 'Chưa mở' },
      { icon: '🔒', name: 'Món 5', fas: 'Chưa mở' },
    ],
  },
  trangMieng: {
    title: '🍎 Hành tinh Trái cây — Chưa mở',
    items: [
      { icon: '🔒', name: 'Cần hoàn thành Xanh lá trước', fas: 'Hành tinh bị khóa' },
    ],
  },
};

function showPopup(key) {
  const d = popupData[key];
  document.getElementById('popupTitle').textContent = d.title;
  document.getElementById('popupContent').innerHTML = d.items
    .map(
      (it) =>
        `<div class="popup-item">
          <span class="pi-icon">${it.icon}</span>
          <span>${it.name}</span>
          <span style="margin-left:auto;font-size:10px;color:#888">${it.fas}</span>
        </div>`
    )
    .join('');
  document.getElementById('popup').classList.add('show');
}

function closePopup(e) {
  if (!e || e.target === document.getElementById('popup')) {
    document.getElementById('popup').classList.remove('show');
  }
}
