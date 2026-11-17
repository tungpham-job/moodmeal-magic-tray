/* ═══════════════════════════════════════════════
   screen3.js — Thiết kế Khay cơm (Student)
   v3.1: 4 ô Tinh bột · Đạm · Rau củ · Trái cây
         nguyên liệu lấy từ danh mục BGH (bé đã thử hoặc "Mở khóa sẵn")
         điểm khay theo cân bằng năng lượng (mmTrayScore trong utils.js)
         chỉ giữ shareFamily (gửi ba mẹ), ghi tray_log vào localStorage
═══════════════════════════════════════════════ */

const TRAY_CODES = ['tinBot', 'dam', 'rauCu', 'traiCay'];
const groupLabels = { tinBot: 'Tinh bột', dam: 'Đạm', rauCu: 'Rau củ', traiCay: 'Trái cây' };
const GROUP_TO_CODE = { 'Tinh bột': 'tinBot', 'Đạm': 'dam', 'Rau củ': 'rauCu', 'Trái cây': 'traiCay' };
const MACRO_LABEL = { carbs: 'Tinh bột', protein: 'Đạm', fat: 'Béo' };
const MACRO_COLOR = { carbs: '#F59E0B', protein: '#8B5CF6', fat: '#EF4444' };

/* ── State ───────────────────────────────────── */
let trayScore = 0;
let activeTab = 'tinBot';
const trayItems = { tinBot: null, dam: null, rauCu: null, traiCay: null };   // nguyên liệu đang ở từng ô
let ingList = [];                                                            // [{ing, code, unlocked}]

/* ── Nguyên liệu: danh mục BGH, mở khi bé đã thử (có FAS) hoặc "Mở khóa sẵn" ── */
function loadIngredients() {
  const session = auth.getSession();
  const fas = store.get(MM_KEYS.FAS_LOG, []).filter(r => session && r.studentId === session.userId);
  const ids = new Set(fas.map(r => r.foodId));
  const names = new Set(fas.map(r => normFood(r.foodName || '')));
  ingList = store.get(MM_KEYS.INGREDIENTS, DEFAULT_INGREDIENTS)
    .filter(g => g.active !== false && GROUP_TO_CODE[g.group])
    .map(g => ({
      ing: g,
      code: GROUP_TO_CODE[g.group],
      unlocked: !!g.alwaysUnlocked || ids.has(g.id) || names.has(normFood(g.name)),
    }));
}

function findIng(id) { return ingList.find(x => x.ing.id === id); }
function firstEmptyCode() { return TRAY_CODES.find(c => !trayItems[c]); }

/* ── Vẽ 4 ô khay ─────────────────────────────── */
function renderSlots() {
  document.getElementById('trayGrid').innerHTML = TRAY_CODES.map(c => {
    const it = trayItems[c];
    const act = c === activeTab ? ' active' : '';
    if (!it) {
      return `<div class="tray-cell${act}" id="cell-${c}" onclick="cellClick('${c}')">
        <div class="cell-plus">+</div><div class="cell-label">${groupLabels[c]}</div></div>`;
    }
    return `<div class="tray-cell filled${act}" id="cell-${c}" onclick="cellClick('${c}')">
      <div class="cell-icon">${escHtml(it.icon)}</div>
      <div class="cell-label">${escHtml(it.name)}</div>
      <div class="cell-group">${groupLabels[c]}</div>
      <button class="cell-remove" aria-label="Bỏ ${escHtml(it.name)}" onclick="removeCell(event,'${c}')">✕</button>
    </div>`;
  }).join('');
}

/* ── Vẽ tab nhóm và danh sách nguyên liệu ────── */
function renderIngredients() {
  document.getElementById('ingTabs').innerHTML = TRAY_CODES.map(c =>
    `<button type="button" class="ing-tab${c === activeTab ? ' on' : ''}" onclick="setTab('${c}')">${groupLabels[c]}${trayItems[c] ? ' ✓' : ''}</button>`
  ).join('');

  const rows = ingList.filter(x => x.code === activeTab);
  document.getElementById('ingGrid').innerHTML = rows.length ? rows.map(x => {
    const g = x.ing, sc = mmIngredientScore(g);
    if (!x.unlocked) {
      return `<div class="ing-item locked" title="Thử món này ở màn Thử món để mở khóa">
        <span class="ii-icon">🔒</span><div><b>${escHtml(g.name)}</b><small>Thử để mở khóa</small></div></div>`;
    }
    const sel = trayItems[x.code] && trayItems[x.code].id === g.id;
    return `<button type="button" class="ing-item${sel ? ' sel' : ''}" data-id="${escHtml(g.id)}" onclick="addIng(this.dataset.id)">
      <span class="ii-icon">${escHtml(g.icon)}</span>
      <div><b>${escHtml(g.name)}</b><small>${escHtml(String(g.portion))} g${sc === null ? '' : ' · ' + sc + '/10'}${sel ? ' · đã chọn' : ''}</small></div></button>`;
  }).join('') : '<div class="ing-empty">Nhóm này chưa có nguyên liệu. Nhờ nhà trường thêm nhé.</div>';
}

function setMsg(t) { document.getElementById('trayMsg').textContent = t || ''; }

/* ── Điểm khay ───────────────────────────────── */
function trayScoreItems() {
  return TRAY_CODES.filter(c => trayItems[c]).map(c => Object.assign({}, trayItems[c], { group: c }));
}

function scoreHintText(r) {
  const missing = TRAY_CODES.filter(c => !trayItems[c]);
  if (missing.length === 4) return '💡 Chọn nguyên liệu để xếp khay nhé!';
  if (missing.length) return `💡 Thêm ${groupLabels[missing[0]]} để đủ 4 nhóm nhé!`;
  if (!r.worst) return '🌟 Tuyệt vời! Khay cân bằng hoàn hảo!';
  const m = r.worst;
  const msg = {
    carbs:   { low: 'Khay hơi ít tinh bột, thử thêm món tinh bột nhé.', high: 'Khay hơi nhiều tinh bột, thử thêm rau củ hoặc đạm nhé.' },
    protein: { low: 'Khay hơi ít đạm, thử đổi nguyên liệu đạm nhé.',    high: 'Khay hơi nhiều đạm, thử thêm rau củ hoặc trái cây nhé.' },
    fat:     { low: 'Khay hơi ít chất béo. Thử nguyên liệu đạm như cá hoặc trứng nhé.', high: 'Khay hơi nhiều chất béo, chọn nguyên liệu ít béo hơn nhé.' },
  }[m.key][m.dir];
  return (r.total >= 90 ? '🌟 ' : '💡 ') + msg;
}

function updateScore() {
  const r = mmTrayScore(trayScoreItems());
  trayScore = r.total;
  const stars = Math.round(r.total / 20);
  document.getElementById('scoreStars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  document.getElementById('scoreVal').textContent = r.total + ' / 100';
  document.getElementById('scoreHint').textContent = scoreHintText(r);

  const bar = document.getElementById('macroBar'), leg = document.getElementById('macroLegend');
  if (r.pct) {
    bar.innerHTML = Object.keys(MACRO_LABEL).map(k =>
      `<span style="width:${r.pct[k].toFixed(1)}%;background:${MACRO_COLOR[k]}"></span>`).join('');
    leg.innerHTML = Object.keys(MACRO_LABEL).map(k =>
      `<span>${MACRO_LABEL[k]} ${Math.round(r.pct[k])}%</span>`).join('');
  } else {
    bar.innerHTML = ''; leg.innerHTML = '<span>Chưa có nguyên liệu</span>';
  }

  const why = [`Đủ 4 nhóm: +${r.groupsPts} / 25`, `Cân bằng năng lượng: +${r.balancePts} / 75`];
  if (r.pct) Object.keys(MACRO_LABEL).forEach(k =>
    why.push(`${MACRO_LABEL[k]} ${Math.round(r.pct[k])}% · nên ${MM_TRAY_TARGETS[k][0]}–${MM_TRAY_TARGETS[k][1]}% · +${Math.round(r.parts[k])} / 25`));
  document.getElementById('whyBox').innerHTML = why.map(escHtml).join('<br>');
}

function toggleWhy() {
  const box = document.getElementById('whyBox');
  const on = box.classList.toggle('show');
  const btn = document.getElementById('whyBtn');
  btn.textContent = on ? 'Ẩn ‹' : 'Xem vì sao ›';
  btn.setAttribute('aria-expanded', on ? 'true' : 'false');
}

function refreshAll() { renderSlots(); renderIngredients(); updateScore(); }

/* ── Tương tác ───────────────────────────────── */
function setTab(c) { activeTab = c; setMsg(''); renderSlots(); renderIngredients(); }
function cellClick(c) { setTab(c); }

function removeCell(event, code) {
  event.stopPropagation();
  trayItems[code] = null;
  activeTab = code;
  setMsg('');
  refreshAll();
}

function addIng(id) {
  const x = findIng(id);
  if (!x || !x.unlocked) return;
  const cur = trayItems[x.code];
  if (cur && cur.id === x.ing.id) {          // bấm lại nguyên liệu đang chọn → bỏ ra
    trayItems[x.code] = null; setMsg(''); refreshAll(); return;
  }
  if (cur) {                                  // ô nhóm này đã có nguyên liệu khác → nhắc bỏ trước
    setMsg(`Ô ${groupLabels[x.code]} đã có ${cur.name}. Bấm ✕ trên ô (hoặc bấm lại ${cur.name}) để bỏ trước nhé.`);
    return;
  }
  trayItems[x.code] = x.ing;
  setMsg('');
  activeTab = firstEmptyCode() || activeTab;
  refreshAll();
}

/* ── Build tray snapshot ─────────────────────── */
function buildTrayData() {
  return TRAY_CODES.filter(c => trayItems[c]).map(c => ({
    group: c, icon: trayItems[c].icon, name: trayItems[c].name, ingredientId: trayItems[c].id,
  }));
}

/* ── Write to tray_log ───────────────────────── */
function writeTrayLog(trayName) {
  const KEY = MM_KEYS.TRAY_LOG;
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

  const log = store.get(KEY, []);
  log.push(entry);
  store.set(KEY, log);

  return entry;
}

/* ── Mỗi ngày chỉ gửi 1 khay cơm ────────────── */
function trayToday() {
  const session = auth.getSession();
  if (!session) return null;
  const today = toLocalDateStr(new Date());
  return store.get(MM_KEYS.TRAY_LOG, []).find(t =>
    t.studentId === session.userId && t.sentAt && toLocalDateStr(new Date(t.sentAt)) === today) || null;
}

function lockTrayIfSentToday() {
  const t = trayToday();
  if (!t) return false;
  const btn = document.getElementById('familyBtn');
  btn.disabled    = true;
  btn.textContent = '✅ Hôm nay em đã gửi khay cơm';
  document.getElementById('sentTitle').textContent = '🏠 Hôm nay em đã gửi khay cơm rồi!';
  document.getElementById('sentSub').textContent   =
    `Khay "${t.trayName}" đã gửi cho ba mẹ · Mỗi ngày chỉ gửi 1 khay, mai em thiết kế khay mới nhé 🌱`;
  document.getElementById('sentBox').classList.add('show');
  return true;
}

/* ── Share with family (only action in v3) ───── */
function shareFamily() {
  if (lockTrayIfSentToday()) return;     // đã gửi hôm nay → không gửi thêm
  const name    = document.getElementById('trayName').value.trim() || 'Khay cơm của em';
  const btn     = document.getElementById('familyBtn');
  const sentBox = document.getElementById('sentBox');

  const entry   = writeTrayLog(name);
  const session = auth.getSession();

  /* Cộng XP "Gửi khay cơm cho ba mẹ" theo bảng của BGH */
  const xpRes = session ? awardXp(session.userId, 'send_tray', entry.id) : null;
  if (session) refreshXpDisplay(session.userId, session.name);
  const gained = xpRes ? xpRes.awarded : 0;

  document.getElementById('sentTitle').textContent = '🏠 Đã gửi cho ba mẹ!';
  document.getElementById('sentSub').textContent   =
    `Ba mẹ nhận gợi ý nấu "${name}" tối nay` + (gained ? ` · +${gained} XP 🌱` : '') +
    (xpRes && xpRes.leveledUp ? ' ' + levelUpText(xpRes) : '');
  sentBox.classList.add('show');

  btn.disabled    = true;
  btn.textContent = '✅ Đã gửi cho ba mẹ!';

  document.querySelector('.screen-content')
    .scrollTo({ top: 9999, behavior: 'smooth' });
}

/* ── Init ────────────────────────────────────── */
loadIngredients();
// Khay mặc định: mỗi nhóm điền sẵn một nguyên liệu "mở khóa sẵn" (nếu có)
TRAY_CODES.forEach(c => {
  const x = ingList.find(i => i.code === c && i.ing.alwaysUnlocked && i.unlocked);
  if (x) trayItems[c] = x.ing;
});
activeTab = firstEmptyCode() || 'tinBot';
refreshAll();
lockTrayIfSentToday();   // hôm nay đã gửi khay → khóa nút gửi
