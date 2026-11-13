/* ═══════════════════════════════════════════
   screen1.js — Hành tinh Thực phẩm
   Banner mục tiêu, 4 hành tinh, tiến trình và popup
   đều tính từ thực đơn BGH + dữ liệu FAS của bé
   (cần js/today.js load trước file này)
═══════════════════════════════════════════ */

let PLANET_STATES = [];

function starsFor(explored, total) {
  const n = Math.max(1, Math.min(5, Math.round((explored / total) * 5)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/* Banner "Mục tiêu hôm nay": icon và câu chữ theo món mục tiêu */
function renderMission() {
  const target = getTodayTarget();
  const iconEl = document.getElementById('s1MissionIcon');
  const subEl  = document.getElementById('s1MissionSub');

  if (!target) {
    iconEl.textContent = '🎯';
    subEl.textContent  = 'Hôm nay chưa có thực đơn. BGH sẽ cập nhật sớm! 🌱';
    return;
  }

  iconEl.textContent = foodIcon(target);
  const p = PLANET_STATES.find(x => x.name === target.planet);
  let tail = '';
  if (p && p.state === 'unlocking') tail = ` · Mở khóa Hành tinh ${p.name}!`;
  else if (p)                       tail = ` · Khám phá thêm Hành tinh ${p.name}!`;
  subEl.textContent = `Thử "${target.name}" hôm nay → +15 XP${tail} 🌱`;
}

/* Lưới 4 hành tinh */
function renderPlanets() {
  document.getElementById('planetGrid').innerHTML = PLANET_STATES.map(p => {
    const click = `onclick="showPopup('${p.key}')"`;
    if (p.state === 'unlocked') {
      return `
        <div class="planet-card unlocked" ${click}>
          <div class="planet-badge">✓ Đã mở</div>
          <div class="planet-icon">${p.icon}</div>
          <div class="planet-name">Hành tinh ${p.name}</div>
          <div class="planet-stars">${starsFor(p.explored, p.total)}</div>
          <div class="planet-status">${p.explored} / ${p.total} đã khám phá</div>
        </div>`;
    }
    if (p.state === 'unlocking') {
      return `
        <div class="planet-card unlocking" ${click}>
          <div class="planet-icon">${p.icon}</div>
          <div class="planet-name">Hành tinh ${p.name}</div>
          <div class="planet-stars" style="color:#B8860B">⚡ Đang mở!</div>
          <div class="planet-status">Thử hôm nay để mở khóa</div>
        </div>`;
    }
    return `
      <div class="planet-card locked" ${click}>
        <div class="planet-icon">${p.icon}</div>
        <div class="planet-name">Hành tinh ${p.name}</div>
        <div class="planet-stars" style="color:#BDC3C7">☆☆☆☆☆</div>
        <div class="planet-status">🔒 Chưa mở khóa</div>
      </div>`;
  }).join('');
}

/* Thanh tiến trình tổng thể */
function renderProgress() {
  document.getElementById('planetProgressRows').innerHTML = PLANET_STATES.map((p, i) => {
    const locked = p.state === 'locked';
    const pct = p.explored > 0 ? Math.min(100, Math.round((p.explored / p.total) * 100))
              : (p.state === 'unlocking' ? 5 : 0);
    const margin = i < PLANET_STATES.length - 1 ? 'margin-bottom:5px' : '';
    return `
      <div style="display:flex;gap:6px;align-items:center;${margin}">
        <span style="font-size:10px;color:${locked ? '#ccc' : '#666'};width:80px">${p.name}</span>
        <div style="flex:1;height:5px;background:#E8ECF0;border-radius:3px"><div style="width:${pct}%;height:5px;background:${p.bar};border-radius:3px"></div></div>
        <span style="font-size:10px;color:${p.text};width:30px;text-align:right">${p.explored}/${p.total}</span>
      </div>`;
  }).join('');
}

function renderScreen1() {
  const session = auth.getSession();
  PLANET_STATES = getPlanetStates(session ? session.userId : '');
  renderMission();
  renderPlanets();
  renderProgress();
}

/* Popup theo hành tinh */
function showPopup(key) {
  const p = PLANET_STATES.find(x => x.key === key);
  if (!p) return;
  const target = getTodayTarget();
  let title, items = [];

  if (p.state === 'unlocked') {
    title = `${p.icon} Hành tinh ${p.name} — Đã mở khóa!`;
    p.tried.forEach(f => items.push({ icon: p.icon, name: f.name, fas: `FAS: ${Number(f.latest.score).toFixed(1)} ⭐` }));
    if (target && target.planet === p.name &&
        !p.tried.some(f => normFood(f.name) === normFood(target.name))) {
      items.unshift({ icon: foodIcon(target), name: target.name, fas: '→ Thử hôm nay!' });
    }
    while (items.length < p.total) items.push({ icon: '❓', name: 'Món chưa khám phá', fas: 'Chưa khám phá' });
  } else if (p.state === 'unlocking') {
    title = `${p.icon} Hành tinh ${p.name} — Đang mở khóa!`;
    items.push({ icon: foodIcon(target), name: target.name, fas: '→ Thử hôm nay để mở khóa!' });
    for (let i = 1; i < p.total; i++) items.push({ icon: '🔒', name: 'Món chưa mở', fas: 'Chưa mở' });
  } else {
    title = `${p.icon} Hành tinh ${p.name} — Chưa mở`;
    items.push({ icon: '🔒', name: 'Thử một món thuộc hành tinh này để mở khóa', fas: 'Hành tinh bị khóa' });
  }

  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupContent').innerHTML = items.map(it => `
    <div class="popup-item">
      <span class="pi-icon">${escHtml(it.icon)}</span>
      <span>${escHtml(it.name)}</span>
      <span style="margin-left:auto;font-size:10px;color:#888">${escHtml(it.fas)}</span>
    </div>`).join('');
  document.getElementById('popup').classList.add('show');
}

function closePopup(e) {
  if (!e || e.target === document.getElementById('popup')) {
    document.getElementById('popup').classList.remove('show');
  }
}
