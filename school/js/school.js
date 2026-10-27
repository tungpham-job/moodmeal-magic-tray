/* ═══════════════════════════════════════════════
   school.js — MOODMEAL MAGIC TRAY v3
   Giao diện BGH: 4 module
   ① Tài khoản  ② Thiết lập  ③ Báo cáo FAS  ④ Đề xuất
═══════════════════════════════════════════════ */

/* ── Storage keys ───────────────────────────── */
const KEY = {
  ACCOUNTS:  'mm_accounts',
  MENU:      'mm_daily_menu',
  XP_CONFIG: 'mm_xp_config',
  BADGES:    'mm_badges',
  CRITERIA:  'mm_grading_criteria',
  FAS_LOG:   'mm_fas_log',
  TRAY_LOG:  'mm_tray_log',
};

/* ── Seed data helpers ───────────────────────── */
function loadKey(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function saveKey(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ── Seed: XP config ─────────────────────────── */
const DEFAULT_XP_CONFIG = {
  levels: [
    { level: 1, name: 'Người mới',          xpFrom: 0,   xpTo: 99,  unlock: 5  },
    { level: 2, name: 'Người khám phá',      xpFrom: 100, xpTo: 299, unlock: 15 },
    { level: 3, name: 'Nhà thám hiểm',       xpFrom: 300, xpTo: 599, unlock: 30 },
    { level: 4, name: 'Đại sứ dinh dưỡng',   xpFrom: 600, xpTo: 9999,unlock: 99 },
  ],
  actions: [
    { id: 'first_try',       label: 'Thử món lần đầu',          xp: 15 },
    { id: 'emoji_rate',      label: 'Đánh giá emoji',            xp: 5  },
    { id: 'try_again',       label: 'Bấm TRY AGAIN',            xp: 3  },
    { id: 'send_tray',       label: 'Gửi khay cơm cho ba mẹ',   xp: 10 },
    { id: 'parent_confirm',  label: 'Ba mẹ xác nhận đã nấu',    xp: 20 },
  ]
};

/* ── Seed: Badges ────────────────────────────── */
const DEFAULT_BADGES = [
  { id: 'b01', icon: '🌱', name: 'Người mới',     desc: 'Đăng nhập lần đầu',                    auto: true,  active: true },
  { id: 'b02', icon: '🥕', name: 'Bạn Rau củ',    desc: 'FAS rau củ ≥ 3.0',                    auto: true,  active: true },
  { id: 'b03', icon: '🥦', name: 'Người xanh',    desc: 'Thử ≥ 3 loại rau xanh',               auto: true,  active: true },
  { id: 'b04', icon: '👨‍🍳', name: 'Đại bếp nhí',  desc: 'Khay cơm được PH xác nhận ≥ 5 lần', auto: false, active: true },
  { id: 'b05', icon: '⭐', name: 'Sao dinh dưỡng', desc: 'FAG tổng ≥ 5.0',                     auto: false, active: true },
];

/* ── Seed: Grading criteria ──────────────────── */
const DEFAULT_CRITERIA = [
  {
    id: 'c01',
    name: 'Tuần 3 — Ưu tiên rau xanh',
    weekStart: '2026-10-21',
    weekEnd:   '2026-10-25',
    items: [
      { label: 'Có rau xanh trong khay',       max: 3 },
      { label: 'Cân bằng đủ 4 nhóm thực phẩm', max: 4 },
      { label: 'Tên khay cơm sáng tạo',        max: 2 },
      { label: 'Ba mẹ đã xác nhận nấu ở nhà',  max: 1 },
    ]
  }
];

/* ── Seed: FAS log (demo) ────────────────────── */
const DEFAULT_FAS_LOG = [
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:1, score:2.0, tryAgain:true,  timestamp:'2026-10-07T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:2, score:2.3, tryAgain:true,  timestamp:'2026-10-09T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:3, score:2.6, tryAgain:true,  timestamp:'2026-10-14T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:4, score:3.0, tryAgain:false, timestamp:'2026-10-21T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:1, score:1.5, tryAgain:true,  timestamp:'2026-10-08T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:2, score:2.0, tryAgain:true,  timestamp:'2026-10-15T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:3, score:2.5, tryAgain:false, timestamp:'2026-10-22T12:00:00' },
  { studentId:'tranthanhkhoa', foodId:'rau-muong', foodName:'Rau muống',   attempt:1, score:3.2, tryAgain:false, timestamp:'2026-10-10T12:00:00' },
  { studentId:'tranthanhkhoa', foodId:'rau-muong', foodName:'Rau muống',   attempt:2, score:3.5, tryAgain:false, timestamp:'2026-10-17T12:00:00' },
];

/* ── Seed: Tray log (demo) ───────────────────── */
const DEFAULT_TRAY_LOG = [
  {
    id: 't01', studentId: 'phambaotruc', studentName: 'Phạm Bảo Trúc',
    trayName: 'Cầu vồng dinh dưỡng',
    tray: [
      { group:'tinBot', icon:'🍚', name:'Cơm trắng' },
      { group:'dam',    icon:'🥩', name:'Thịt kho'  },
      { group:'rauCu',  icon:'🥦', name:'Bông cải'  },
      { group:'canh',   icon:'🍲', name:'Canh chua' },
    ],
    nutritionScore: 87,
    sentAt: '2026-10-21T11:45:00',
    parentConfirmed: true, confirmedAt: '2026-10-21T19:20:00',
    schoolScore: null, schoolNote: ''
  },
  {
    id: 't02', studentId: 'nguyenminhan', studentName: 'Nguyễn Minh An',
    trayName: 'Bữa trưa siêu nhân',
    tray: [
      { group:'tinBot', icon:'🍞', name:'Bánh mì' },
      { group:'dam',    icon:'🐟', name:'Cá hấp'  },
      { group:'rauCu',  icon:'🥕', name:'Cà rốt'  },
    ],
    nutritionScore: 65,
    sentAt: '2026-10-22T12:01:00',
    parentConfirmed: false, confirmedAt: null,
    schoolScore: null, schoolNote: ''
  },
  {
    id: 't03', studentId: 'tranthanhkhoa', studentName: 'Trần Thanh Khoa',
    trayName: 'Hành tinh xanh của em',
    tray: [
      { group:'tinBot', icon:'🍚', name:'Cơm trắng' },
      { group:'dam',    icon:'🥚', name:'Trứng'     },
      { group:'rauCu',  icon:'🥕', name:'Cà rốt'   },
      { group:'canh',   icon:'🥬', name:'Canh rau'  },
    ],
    nutritionScore: 80,
    sentAt: '2026-10-22T11:50:00',
    parentConfirmed: null, confirmedAt: null,
    schoolScore: null, schoolNote: ''
  },
];

/* ── Seed: Daily menu ────────────────────────── */
const DEFAULT_MENU = [
  { id:'m01', date:'2026-10-20', name:'Cơm trắng',        group:'Tinh bột', planet:'Đạm',    isNew: false },
  { id:'m02', date:'2026-10-20', name:'Thịt kho trứng',   group:'Đạm',      planet:'Đạm',    isNew: false },
  { id:'m03', date:'2026-10-20', name:'Rau muống xào tỏi',group:'Rau củ',   planet:'Rau củ', isNew: false },
  { id:'m04', date:'2026-10-20', name:'Canh chua',         group:'Canh',     planet:'Rau củ', isNew: false },
  { id:'m05', date:'2026-10-21', name:'Cơm trắng',         group:'Tinh bột', planet:'Đạm',    isNew: false },
  { id:'m06', date:'2026-10-21', name:'Cá kho tộ',         group:'Đạm',      planet:'Đạm',    isNew: false },
  { id:'m07', date:'2026-10-21', name:'Bông cải xanh xào', group:'Rau củ',   planet:'Xanh lá',isNew: true  },
  { id:'m08', date:'2026-10-21', name:'Canh bầu',          group:'Canh',     planet:'Rau củ', isNew: true  },
];

/* ── Init all seed data ──────────────────────── */
(function initAllSeed() {
  if (!localStorage.getItem(KEY.XP_CONFIG)) saveKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  if (!localStorage.getItem(KEY.BADGES))    saveKey(KEY.BADGES,    DEFAULT_BADGES);
  if (!localStorage.getItem(KEY.CRITERIA))  saveKey(KEY.CRITERIA,  DEFAULT_CRITERIA);
  if (!localStorage.getItem(KEY.FAS_LOG))   saveKey(KEY.FAS_LOG,   DEFAULT_FAS_LOG);
  if (!localStorage.getItem(KEY.TRAY_LOG))  saveKey(KEY.TRAY_LOG,  DEFAULT_TRAY_LOG);
  if (!localStorage.getItem(KEY.MENU))      saveKey(KEY.MENU,      DEFAULT_MENU);
})();

/* ══════════════════════════════════════════════
   SESSION & INIT
══════════════════════════════════════════════ */
let SESSION = null;

document.addEventListener('DOMContentLoaded', () => {
  SESSION = auth.check('admin');
  if (!SESSION) return;

  // Hiện tên user trên sidebar
  document.getElementById('sidebarUserName').textContent = SESSION.name;

  // Active module mặc định
  switchModule('accounts');
});

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
function switchModule(name) {
  // Cập nhật nav links
  document.querySelectorAll('.nav-link[data-module]').forEach(el => {
    el.classList.toggle('active', el.dataset.module === name);
  });

  // Cập nhật panels
  document.querySelectorAll('.module-panel').forEach(el => {
    el.classList.toggle('active', el.id === 'module-' + name);
  });

  // Cập nhật header title
  const titles = {
    accounts:  { title: '👤 Quản lý Tài khoản', sub: 'Thêm, sửa, xóa, phân quyền tài khoản học sinh và phụ huynh' },
    settings:  { title: '⚙️ Thiết lập',          sub: 'Thực đơn · XP & Level · Danh hiệu · Tiêu chí chấm đề xuất' },
    report:    { title: '📊 Báo cáo FAS',         sub: 'Hành trình chấp nhận thực phẩm của từng học sinh' },
    proposals: { title: '🍱 Đề xuất Thực đơn',    sub: 'Khay cơm học sinh gửi ba mẹ — chấm điểm cuối tuần' },
  };

  const t = titles[name];
  if (t) {
    document.getElementById('mainTitle').textContent = t.title;
    document.getElementById('mainSub').textContent   = t.sub;
  }

  // Render module tương ứng
  const renderers = {
    accounts:  renderAccounts,
    settings:  renderSettings,
    report:    renderReport,
    proposals: renderProposals,
  };
  if (renderers[name]) renderers[name]();
}

/* ══════════════════════════════════════════════
   MODULE ① — TÀI KHOẢN
══════════════════════════════════════════════ */
function renderAccounts() {
  const accounts = auth.getAccounts();
  const tbody = document.getElementById('accountsTbody');

  tbody.innerHTML = accounts.map(acc => {
    const linked = accounts.find(a => a.id === acc.linkedId);
    const roleBadge = { admin: 'badge-blue', student: 'badge-green', parent: 'badge-purple' }[acc.role] || 'badge-grey';
    const statusBadge = acc.locked ? 'badge-red' : 'badge-green';
    const statusText  = acc.locked ? '🔒 Tạm khóa' : '✅ Hoạt động';

    return `
      <tr data-id="${acc.id}">
        <td><code style="font-size:12px">${acc.id}</code></td>
        <td><strong>${acc.name}</strong></td>
        <td><span class="badge ${roleBadge}">${roleLabel(acc.role)}</span></td>
        <td>${linked ? linked.name : '<span style="color:#aaa">—</span>'}</td>
        <td><span class="badge ${statusBadge}" style="font-size:10px">${statusText}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-secondary btn-icon" title="Sửa" onclick="openEditAccount('${acc.id}')">✏️</button>
            <button class="btn btn-sm btn-ghost btn-icon"    title="${acc.locked ? 'Mở khóa' : 'Khóa'}" onclick="toggleLock('${acc.id}')">${acc.locked ? '🔒' : '🔓'}</button>
            <button class="btn btn-sm btn-danger btn-icon"   title="Xóa" onclick="confirmDelete('${acc.id}')">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function roleLabel(role) {
  return { admin: '🏫 BGH', student: '🧒 Học sinh', parent: '👨 Phụ huynh' }[role] || role;
}

/* Mở modal thêm tài khoản */
function openAddAccount() {
  document.getElementById('modalAccountTitle').textContent = 'Thêm tài khoản';
  document.getElementById('accFormId').value   = '';
  document.getElementById('accFormName').value = '';
  document.getElementById('accFormPass').value = '';
  document.getElementById('accFormRole').value = 'student';
  document.getElementById('accFormId').readOnly = false;
  document.getElementById('accEditId').value = '';
  renderLinkedSelect('student');
  openModal('modalAccount');
}

/* Mở modal sửa */
function openEditAccount(id) {
  const accounts = auth.getAccounts();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  document.getElementById('modalAccountTitle').textContent = 'Sửa tài khoản';
  document.getElementById('accEditId').value   = acc.id;
  document.getElementById('accFormId').value   = acc.id;
  document.getElementById('accFormId').readOnly = true;
  document.getElementById('accFormName').value = acc.name;
  document.getElementById('accFormPass').value = acc.pass;
  document.getElementById('accFormRole').value = acc.role;
  renderLinkedSelect(acc.role, acc.linkedId);
  openModal('modalAccount');
}

function renderLinkedSelect(role, selectedId = '') {
  const wrap = document.getElementById('linkedWrap');
  const sel  = document.getElementById('accFormLinked');
  const accounts = auth.getAccounts();

  if (role === 'admin') { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  const targetRole = role === 'student' ? 'parent' : 'student';
  const label = role === 'student' ? 'Phụ huynh liên kết' : 'Học sinh liên kết';
  document.getElementById('linkedLabel').textContent = label;

  const options = accounts.filter(a => a.role === targetRole);
  sel.innerHTML = `<option value="">— Chưa liên kết —</option>` +
    options.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name} (${a.id})</option>`).join('');
}

document.addEventListener('change', e => {
  if (e.target.id === 'accFormRole') renderLinkedSelect(e.target.value);
});

function saveAccount() {
  const editId = document.getElementById('accEditId').value;
  const id     = document.getElementById('accFormId').value.trim();
  const name   = document.getElementById('accFormName').value.trim();
  const pass   = document.getElementById('accFormPass').value.trim();
  const role   = document.getElementById('accFormRole').value;
  const linked = document.getElementById('accFormLinked')?.value || null;

  if (!id || !name || !pass) { showToast('Vui lòng điền đầy đủ thông tin!', 'error'); return; }

  const accounts = auth.getAccounts();

  if (editId) {
    // Sửa
    const idx = accounts.findIndex(a => a.id === editId);
    if (idx === -1) return;
    accounts[idx] = { ...accounts[idx], name, pass, role, linkedId: linked || null };
    // Cập nhật liên kết phía đối diện
    updateLinkedId(accounts, editId, linked);
  } else {
    // Thêm mới
    if (accounts.find(a => a.id === id)) { showToast('ID đã tồn tại!', 'error'); return; }
    const newAcc = { id, pass, role, name, linkedId: linked || null, avatar: '🧒', locked: false };
    accounts.push(newAcc);
    updateLinkedId(accounts, id, linked);
  }

  auth.saveAccounts(accounts);
  closeModal('modalAccount');
  renderAccounts();
  showToast(editId ? 'Đã cập nhật tài khoản!' : 'Đã thêm tài khoản mới!');
}

function updateLinkedId(accounts, myId, linkedId) {
  if (!linkedId) return;
  const target = accounts.find(a => a.id === linkedId);
  if (target) target.linkedId = myId;
}

function toggleLock(id) {
  const accounts = auth.getAccounts();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  if (acc.id === 'admin') { showToast('Không thể khóa tài khoản admin!', 'error'); return; }
  acc.locked = !acc.locked;
  auth.saveAccounts(accounts);
  renderAccounts();
  showToast(acc.locked ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
}

function confirmDelete(id) {
  if (id === 'admin') { showToast('Không thể xóa tài khoản admin!', 'error'); return; }
  if (!confirm(`Xóa tài khoản "${id}"? Thao tác này không thể hoàn tác.`)) return;
  const accounts = auth.getAccounts().filter(a => a.id !== id);
  // Hủy liên kết phía đối diện
  accounts.forEach(a => { if (a.linkedId === id) a.linkedId = null; });
  auth.saveAccounts(accounts);
  renderAccounts();
  showToast('Đã xóa tài khoản.');
}

/* Import CSV */
function importCSV() {
  const raw = document.getElementById('csvPaste').value.trim();
  if (!raw) { showToast('Chưa có dữ liệu CSV!', 'error'); return; }
  const lines = raw.split('\n').filter(l => l.trim());
  const accounts = auth.getAccounts();
  let added = 0;

  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) return;
    const [id, name, pass] = parts;
    if (!id || !name || !pass) return;
    if (accounts.find(a => a.id === id)) return; // bỏ qua trùng
    accounts.push({ id, name, pass, role: 'student', linkedId: null, avatar: '🧒', locked: false });
    added++;
  });

  auth.saveAccounts(accounts);
  document.getElementById('csvPaste').value = '';
  closeModal('modalImport');
  renderAccounts();
  showToast(`Đã import ${added} tài khoản mới!`);
}

/* ══════════════════════════════════════════════
   MODULE ② — THIẾT LẬP
══════════════════════════════════════════════ */
function renderSettings() {
  switchSettingsTab('menu');
}

function switchSettingsTab(tab) {
  document.querySelectorAll('#module-settings .tab-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.querySelectorAll('#module-settings .tab-panel').forEach(el => {
    el.classList.toggle('active', el.id === 'tab-' + tab);
  });

  const renders = {
    menu:     renderMenuTab,
    xp:       renderXPTab,
    badges:   renderBadgesTab,
    criteria: renderCriteriaTab,
  };
  if (renders[tab]) renders[tab]();
}

/* Tab 1 — Thực đơn */
function renderMenuTab() {
  const menu     = loadKey(KEY.MENU, DEFAULT_MENU);
  const weekDays = getWeekDays();
  const grid     = document.getElementById('weekGrid');

  // Tách 2 tuần
  const week1 = weekDays.slice(0, 5);
  const week2 = weekDays.slice(5, 10);

  function renderWeek(days, weekLabel) {
    const cols = days.map(({ date, label, isToday }) => {
      const dayItems = menu.filter(m => m.date === date);
      const chips = dayItems.map(m => `
        <div class="menu-chip" title="Nhóm: ${m.group} · Hành tinh: ${m.planet}">
          <span class="menu-chip-icon">${m.icon || groupIcon(m.group)}</span>
          <span class="menu-chip-name">${m.name}</span>
          ${m.isNew ? '<span class="menu-chip-new">MỚI</span>' : ''}
          <button class="btn btn-ghost btn-icon" style="padding:0;font-size:11px" onclick="deleteMenuItem('${m.id}')">✕</button>
        </div>`).join('');
      return `
        <div class="week-col">
          <div class="week-col-header ${isToday ? 'today' : ''}">${label}</div>
          ${chips}
          <button class="add-menu-btn" onclick="openAddMenu('${date}')">+ Thêm món</button>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;
                    letter-spacing:0.5px;margin-bottom:8px;padding:0 2px">${weekLabel}</div>
        <div class="week-grid">${cols}</div>
      </div>`;
  }

  grid.innerHTML =
    renderWeek(week1, '📅 Tuần này') +
    renderWeek(week2, '📅 Tuần sau');
}

function groupIcon(group) {
  return { 'Tinh bột': '🍚', 'Đạm': '🥩', 'Rau củ': '🥦', 'Canh': '🍲' }[group] || '🍽️';
}

/* Tạo date string dạng YYYY-MM-DD theo LOCAL time (tránh lệch UTC+7) */
function toLocalDateStr(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekDays() {
  const today    = new Date();
  const todayStr = toLocalDateStr(today);

  // Thứ Hai của tuần hiện tại (local)
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const days = [];

  for (let i = 0; i < 10; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + (i < 5 ? i : i + 2)); // bỏ T7+CN giữa 2 tuần
    const dateStr = toLocalDateStr(d);               // ← dùng local, không dùng UTC
    days.push({
      date:          dateStr,
      label:         `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
      isToday:       dateStr === todayStr,
      isFirstOfWeek: i === 0 || i === 5,
    });
  }
  return days;
}


function saveMenuItem() {
  const date   = document.getElementById('menuDate').value;
  const name   = document.getElementById('menuName').value.trim();
  const icon   = document.getElementById('menuIcon').value.trim();
  const group  = document.getElementById('menuGroup').value;
  const planet = document.getElementById('menuPlanet').value;
  const isNew  = document.getElementById('menuIsNew').checked;

  if (!name) { showToast('Vui lòng nhập tên món!', 'error'); return; }

  const menu = loadKey(KEY.MENU, []);
  menu.push({ id: 'm' + Date.now(), date, name, icon: icon || groupIcon(group), group, planet, isNew });
  saveKey(KEY.MENU, menu);
  closeModal('modalMenu');
  renderMenuTab();
  showToast('Đã thêm món vào thực đơn!');
}

/* Danh sách icon gợi ý cho picker */
const FOOD_ICONS = [
  '🍚','🍞','🥐','🍜','🍝','🥗','🌽',
  '🥩','🍗','🐟','🦐','🥚','🧆','🥓',
  '🥦','🥕','🍅','🧅','🥬','🌿','🫛',
  '🍲','🥘','🫕','🍵','🍶','🧆','🥣',
];

function openIconPicker() {
  const picker = document.getElementById('iconPickerPanel');
  const isOpen = picker.style.display !== 'none';
  picker.style.display = isOpen ? 'none' : 'grid';
}

function pickIcon(icon) {
  document.getElementById('menuIcon').value = icon;
  document.getElementById('menuIconDisplay').textContent = icon;
  document.getElementById('iconPickerPanel').style.display = 'none';
}

function openAddMenu(date) {
  document.getElementById('menuDate').value = date;
  document.getElementById('menuName').value = '';
  document.getElementById('menuIcon').value = '';
  document.getElementById('menuIconDisplay').textContent = '🍽️';
  document.getElementById('iconPickerPanel').style.display = 'none';
  openModal('modalMenu');
}

function deleteMenuItem(id) {
  const menu = loadKey(KEY.MENU, []).filter(m => m.id !== id);
  saveKey(KEY.MENU, menu);
  renderMenuTab();
}

/* Tab 2 — XP & Level */
function renderXPTab() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);

  // Bảng levels
  document.getElementById('xpLevelsBody').innerHTML = cfg.levels.map((lv, i) => `
    <tr>
      <td>${lv.level}</td>
      <td><input class="inline-input" style="width:150px" value="${lv.name}"
          onchange="updateLevel(${i},'name',this.value)"></td>
      <td><input class="inline-input" type="number" value="${lv.xpFrom}"
          onchange="updateLevel(${i},'xpFrom',+this.value)"></td>
      <td><input class="inline-input" type="number" value="${lv.xpTo}"
          onchange="updateLevel(${i},'xpTo',+this.value)"></td>
      <td><input class="inline-input" type="number" value="${lv.unlock}"
          onchange="updateLevel(${i},'unlock',+this.value)"></td>
    </tr>`).join('');

  // Bảng actions
  document.getElementById('xpActionsBody').innerHTML = cfg.actions.map((ac, i) => `
    <tr>
      <td>${ac.label}</td>
      <td>
        <input class="inline-input" type="number" value="${ac.xp}"
          onchange="updateAction(${i},'xp',+this.value)">
        <span style="font-size:12px;color:#888"> XP</span>
      </td>
    </tr>`).join('');
}

function updateLevel(idx, field, val) {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  cfg.levels[idx][field] = val;
  saveKey(KEY.XP_CONFIG, cfg);
  showToast('Đã lưu!');
}

function updateAction(idx, field, val) {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  cfg.actions[idx][field] = val;
  saveKey(KEY.XP_CONFIG, cfg);
  showToast('Đã lưu!');
}

/* Tab 3 — Danh hiệu */
function renderBadgesTab() {
  const badges = loadKey(KEY.BADGES, DEFAULT_BADGES);

  document.getElementById('badgesList').innerHTML = badges.map((b, i) => `
    <tr>
      <td style="font-size:20px">${b.icon}</td>
      <td><strong>${b.name}</strong><div style="font-size:11px;color:#888">${b.desc}</div></td>
      <td>${b.auto
        ? '<span class="badge badge-green">✓ Tự động</span>'
        : '<span class="badge badge-orange">✗ Duyệt tay</span>'}</td>
      <td><span class="badge ${b.active ? 'badge-green' : 'badge-grey'}">${b.active ? 'Đang dùng' : 'Vô hiệu'}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary btn-icon" onclick="openEditBadge(${i})">✏️</button>
          <button class="btn btn-sm btn-ghost btn-icon" title="${b.active ? 'Vô hiệu hoá' : 'Kích hoạt'}" onclick="toggleBadge(${i})">${b.active ? '✅' : '🚫'}</button>
        </div>
      </td>
    </tr>`).join('');

  // Danh sách chờ duyệt (giả lập)
  renderBadgePending();
}

function renderBadgePending() {
  const pending = [
    { student: 'Phạm Bảo Trúc', badge: '👨‍🍳 Đại bếp nhí', reason: 'Khay cơm được PH xác nhận 5 lần' },
    { student: 'Nguyễn Minh An', badge: '⭐ Sao dinh dưỡng', reason: 'FAG tổng đạt 5.2' },
  ];

  document.getElementById('badgePendingList').innerHTML = pending.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Không có yêu cầu nào</td></tr>'
    : pending.map((p, i) => `
        <tr>
          <td>${p.student}</td>
          <td>${p.badge}</td>
          <td style="font-size:12px;color:#888">${p.reason}</td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-primary" onclick="approveBadge(${i})">✅ Duyệt</button>
              <button class="btn btn-sm btn-danger"  onclick="rejectBadge(${i})">✗ Từ chối</button>
            </div>
          </td>
        </tr>`).join('');
}

function openAddBadge() {
  document.getElementById('badgeEditIdx').value = '';
  document.getElementById('badgeIcon').value  = '';
  document.getElementById('badgeName').value  = '';
  document.getElementById('badgeDesc').value  = '';
  document.getElementById('badgeAuto').value  = 'true';
  document.getElementById('modalBadgeTitle').textContent = 'Thêm danh hiệu';
  openModal('modalBadge');
}

function openEditBadge(idx) {
  const badges = loadKey(KEY.BADGES, DEFAULT_BADGES);
  const b = badges[idx];
  document.getElementById('badgeEditIdx').value = idx;
  document.getElementById('badgeIcon').value  = b.icon;
  document.getElementById('badgeName').value  = b.name;
  document.getElementById('badgeDesc').value  = b.desc;
  document.getElementById('badgeAuto').value  = b.auto ? 'true' : 'false';
  document.getElementById('modalBadgeTitle').textContent = 'Sửa danh hiệu';
  openModal('modalBadge');
}

function saveBadge() {
  const idx  = document.getElementById('badgeEditIdx').value;
  const icon = document.getElementById('badgeIcon').value.trim();
  const name = document.getElementById('badgeName').value.trim();
  const desc = document.getElementById('badgeDesc').value.trim();
  const auto = document.getElementById('badgeAuto').value === 'true';

  if (!icon || !name) { showToast('Vui lòng nhập icon và tên!', 'error'); return; }

  const badges = loadKey(KEY.BADGES, DEFAULT_BADGES);
  if (idx !== '') {
    badges[+idx] = { ...badges[+idx], icon, name, desc, auto };
  } else {
    badges.push({ id: 'b' + Date.now(), icon, name, desc, auto, active: true });
  }
  saveKey(KEY.BADGES, badges);
  closeModal('modalBadge');
  renderBadgesTab();
  showToast('Đã lưu danh hiệu!');
}

function toggleBadge(idx) {
  const badges = loadKey(KEY.BADGES, DEFAULT_BADGES);
  badges[idx].active = !badges[idx].active;
  saveKey(KEY.BADGES, badges);
  renderBadgesTab();
}

function approveBadge(idx) { showToast('Đã duyệt cấp danh hiệu! 🎉'); renderBadgePending(); }
function rejectBadge(idx)  { showToast('Đã từ chối.'); renderBadgePending(); }

/* Tab 4 — Tiêu chí chấm đề xuất */
function renderCriteriaTab() {
  const list = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);

  document.getElementById('criteriaList').innerHTML = list.map((c, i) => {
    const total = c.items.reduce((s, it) => s + it.max, 0);
    const rows = c.items.map(it => `
      <tr>
        <td>${it.label}</td>
        <td style="text-align:center">${it.max}</td>
      </tr>`).join('');

    return `
      <div class="content-card" style="margin-bottom:12px">
        <div class="content-card-header">
          <div>
            <div class="content-card-title">${c.name}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">${c.weekStart} → ${c.weekEnd} · Tổng: ${total} điểm</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="openEditCriteria(${i})">✏️ Sửa</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCriteria(${i})">🗑️</button>
          </div>
        </div>
        <div class="content-card-body" style="padding:0">
          <table class="data-table">
            <thead><tr><th>Tiêu chí</th><th style="text-align:center">Điểm tối đa</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('') || '<div style="color:#aaa;text-align:center;padding:32px">Chưa có bộ tiêu chí nào</div>';
}

function openAddCriteria() {
  document.getElementById('criteriaEditIdx').value = '';
  document.getElementById('criteriaSetName').value  = '';
  document.getElementById('criteriaWeekStart').value = '';
  document.getElementById('criteriaWeekEnd').value   = '';
  document.getElementById('criteriaItemsBody').innerHTML = '';
  addCriteriaItem();
  document.getElementById('modalCriteriaTitle').textContent = 'Tạo bộ tiêu chí mới';
  openModal('modalCriteria');
}

function openEditCriteria(idx) {
  const list = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);
  const c = list[idx];
  document.getElementById('criteriaEditIdx').value    = idx;
  document.getElementById('criteriaSetName').value    = c.name;
  document.getElementById('criteriaWeekStart').value  = c.weekStart;
  document.getElementById('criteriaWeekEnd').value    = c.weekEnd;
  const tbody = document.getElementById('criteriaItemsBody');
  tbody.innerHTML = '';
  c.items.forEach(it => addCriteriaItem(it.label, it.max));
  document.getElementById('modalCriteriaTitle').textContent = 'Sửa bộ tiêu chí';
  openModal('modalCriteria');
}

function addCriteriaItem(label = '', max = 5) {
  const tbody = document.getElementById('criteriaItemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="form-control" placeholder="Tên tiêu chí..." value="${label}" style="padding:6px 10px;font-size:13px"></td>
    <td><input class="inline-input" type="number" min="1" max="20" value="${max}"></td>
    <td><button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function saveCriteria() {
  const idx   = document.getElementById('criteriaEditIdx').value;
  const name  = document.getElementById('criteriaSetName').value.trim();
  const start = document.getElementById('criteriaWeekStart').value;
  const end   = document.getElementById('criteriaWeekEnd').value;

  if (!name || !start || !end) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }

  const rows = document.querySelectorAll('#criteriaItemsBody tr');
  const items = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const label = inputs[0].value.trim();
    const max   = +inputs[1].value;
    if (label) items.push({ label, max });
  });

  if (!items.length) { showToast('Cần ít nhất 1 tiêu chí!', 'error'); return; }

  const list = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);
  const entry = { id: 'c' + Date.now(), name, weekStart: start, weekEnd: end, items };

  if (idx !== '') { list[+idx] = entry; }
  else            { list.push(entry); }

  saveKey(KEY.CRITERIA, list);
  closeModal('modalCriteria');
  renderCriteriaTab();
  showToast('Đã lưu bộ tiêu chí!');
}

function deleteCriteria(idx) {
  if (!confirm('Xóa bộ tiêu chí này?')) return;
  const list = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);
  list.splice(idx, 1);
  saveKey(KEY.CRITERIA, list);
  renderCriteriaTab();
  showToast('Đã xóa.');
}

/* ══════════════════════════════════════════════
   MODULE ③ — BÁO CÁO FAS
══════════════════════════════════════════════ */
function renderReport() {
  const fasLog  = loadKey(KEY.FAS_LOG, DEFAULT_FAS_LOG);
  const accounts = auth.getAccounts().filter(a => a.role === 'student');

  // Stats cards
  renderFasStats(fasLog, accounts);

  // Populate filters
  const studentSel = document.getElementById('filterStudent');
  studentSel.innerHTML = '<option value="">— Tất cả học sinh —</option>' +
    accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  const foods = [...new Set(fasLog.map(f => f.foodName))];
  const foodSel = document.getElementById('filterFood');
  foodSel.innerHTML = '<option value="">— Tất cả món —</option>' +
    foods.map(f => `<option value="${f}">${f}</option>`).join('');

  renderFasTable(fasLog, accounts, '', '');
}

function renderFasStats(fasLog, accounts) {
  // FAS trung bình gần nhất mỗi học sinh × món
  const latestMap = {};
  fasLog.forEach(r => {
    const k = r.studentId + '_' + r.foodId;
    if (!latestMap[k] || r.attempt > latestMap[k].attempt) latestMap[k] = r;
  });

  const latests = Object.values(latestMap);
  const avgFas  = latests.length ? (latests.reduce((s, r) => s + r.score, 0) / latests.length).toFixed(2) : '—';
  const tryRate = fasLog.length ? Math.round((fasLog.filter(r => r.tryAgain).length / fasLog.length) * 100) : 0;

  // FAG per student
  const fagMap = {};
  fasLog.forEach(r => {
    if (!fagMap[r.studentId]) fagMap[r.studentId] = [];
    fagMap[r.studentId].push(r.score);
  });

  const fagByStudent = Object.entries(fagMap).map(([id, scores]) => {
    const fag = scores.length > 1 ? scores[scores.length-1] - scores[0] : 0;
    const acc = accounts.find(a => a.id === id);
    return { name: acc?.name || id, fag: +fag.toFixed(2) };
  }).sort((a, b) => b.fag - a.fag);

  document.getElementById('statAvgFas').textContent = avgFas;
  document.getElementById('statTryRate').textContent = tryRate + '%';
  document.getElementById('statTop3').innerHTML = fagByStudent.slice(0, 3)
    .map(s => `<div style="font-size:12px">🏆 ${s.name} <strong>+${s.fag}</strong></div>`).join('') || '—';
  document.getElementById('statBottom3').innerHTML = fagByStudent.slice(-3).reverse()
    .map(s => `<div style="font-size:12px">📌 ${s.name} <strong>${s.fag >= 0 ? '+' : ''}${s.fag}</strong></div>`).join('') || '—';
}

function applyReportFilter() {
  const fasLog   = loadKey(KEY.FAS_LOG, DEFAULT_FAS_LOG);
  const accounts = auth.getAccounts().filter(a => a.role === 'student');
  const stuFilter  = document.getElementById('filterStudent').value;
  const foodFilter = document.getElementById('filterFood').value;
  renderFasTable(fasLog, accounts, stuFilter, foodFilter);
}

function renderFasTable(fasLog, accounts, stuFilter, foodFilter) {
  // Group by student + food
  const groups = {};
  fasLog.forEach(r => {
    if (stuFilter  && r.studentId !== stuFilter)  return;
    if (foodFilter && r.foodName  !== foodFilter)  return;
    const k = r.studentId + '_' + r.foodId;
    if (!groups[k]) groups[k] = { studentId: r.studentId, foodName: r.foodName, attempts: [] };
    groups[k].attempts.push(r);
  });

  const rows = Object.values(groups).map(g => {
    g.attempts.sort((a, b) => a.attempt - b.attempt);
    const acc = accounts.find(a => a.id === g.studentId);
    const scores = Array.from({ length: 4 }, (_, i) => g.attempts[i]?.score ?? '—');
    const fag  = g.attempts.length > 1
      ? (+(g.attempts[g.attempts.length-1].score - g.attempts[0].score)).toFixed(2)
      : '—';
    const tryCount = g.attempts.filter(a => a.tryAgain).length;
    const fagColor = fag !== '—' && +fag > 0 ? 'color:var(--success)' : fag !== '—' && +fag < 0 ? 'color:var(--error)' : '';

    return `
      <tr>
        <td><strong>${acc?.name || g.studentId}</strong></td>
        <td>${g.foodName}</td>
        ${scores.map(s => `<td style="text-align:center">${s !== '—' ? `<strong>${s}</strong>` : '<span style="color:#ccc">—</span>'}</td>`).join('')}
        <td style="text-align:center;font-weight:700;${fagColor}">${fag !== '—' ? (fag > 0 ? '+' : '') + fag : '—'}</td>
        <td style="text-align:center">${tryCount}/${g.attempts.length}</td>
      </tr>`;
  });

  document.getElementById('fasTableBody').innerHTML = rows.length
    ? rows.join('')
    : '<tr><td colspan="9" style="text-align:center;color:#aaa;padding:24px">Không có dữ liệu</td></tr>';
}

function exportCSV() {
  const fasLog = loadKey(KEY.FAS_LOG, DEFAULT_FAS_LOG);
  const accounts = auth.getAccounts();
  const header = 'Học sinh,Món ăn,Lần thử,FAS,TRY AGAIN,Thời gian';
  const rows = fasLog.map(r => {
    const acc = accounts.find(a => a.id === r.studentId);
    return [acc?.name || r.studentId, r.foodName, r.attempt, r.score, r.tryAgain ? 'Có' : 'Không', r.timestamp].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'fas_report.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════
   MODULE ④ — ĐỀ XUẤT THỰC ĐƠN
══════════════════════════════════════════════ */
function renderProposals() {
  const trays    = loadKey(KEY.TRAY_LOG, DEFAULT_TRAY_LOG);
  const criteria = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);

  // Criteria selector
  const sel = document.getElementById('criteriaSelector');
  sel.innerHTML = '<option value="">— Chọn bộ tiêu chí —</option>' +
    criteria.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');

  renderProposalTable(trays);
}

function renderProposalTable(trays) {
  const tbody = document.getElementById('proposalsTbody');

  tbody.innerHTML = trays.map((t, i) => {
    const icons = t.tray.map(item => item.icon).join('');
    let confirmCell;
    if (t.parentConfirmed === true) {
      const time = t.confirmedAt ? formatTime(t.confirmedAt) : '';
      confirmCell = `<span class="badge badge-green">✓ ${time}</span>`;
    } else if (t.parentConfirmed === false) {
      confirmCell = `<span class="badge badge-red">✗ Không nấu được</span>`;
    } else {
      confirmCell = `<span class="badge badge-orange">⏳ Chưa xác nhận</span>`;
    }

    return `
      <tr>
        <td><input type="checkbox" class="tray-check" data-idx="${i}"></td>
        <td><strong>${t.studentName}</strong></td>
        <td style="font-size:13px">${t.trayName}</td>
        <td style="font-size:18px;letter-spacing:2px" title="${t.tray.map(x=>x.name).join(' · ')}">${icons}</td>
        <td style="font-size:11px;color:#888">${formatTime(t.sentAt)}</td>
        <td>${confirmCell}</td>
        <td>
          ${t.schoolScore !== null
            ? `<span class="badge badge-blue">${t.schoolScore} điểm</span>`
            : '<span style="color:#aaa;font-size:12px">Chưa chấm</span>'}
        </td>
        <td style="font-size:12px;color:#888">${t.schoolNote || '—'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openGradePanel(${i})">
            ${t.schoolScore !== null ? '✏️ Sửa' : '📝 Chấm'}
          </button>
        </td>
      </tr>`;
  }).join('');
}

function openGradePanel(idx) {
  const trays    = loadKey(KEY.TRAY_LOG, DEFAULT_TRAY_LOG);
  const criteria = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);
  const t = trays[idx];

  // Chọn bộ tiêu chí đang active
  const selIdx = document.getElementById('criteriaSelector').value;
  const crit   = selIdx !== '' ? criteria[+selIdx] : null;

  document.getElementById('gradeStudentName').textContent = `${t.studentName} — "${t.trayName}"`;
  document.getElementById('gradeTrayIcons').textContent   = t.tray.map(x => x.icon).join(' ');
  document.getElementById('gradeIdx').value = idx;

  const body = document.getElementById('gradeCriteriaBody');

  if (!crit) {
    body.innerHTML = `
      <div style="color:#888;font-size:13px;padding:8px 0">
        Chưa chọn bộ tiêu chí. Hãy chọn ở dropdown phía trên.
      </div>
      <div class="criteria-row" style="margin-top:12px">
        <span class="criteria-name">Điểm tự nhập</span>
        <input class="inline-input" type="number" id="manualScore" min="0" max="100"
          value="${t.schoolScore ?? ''}">
        <span class="criteria-max">/ 100</span>
      </div>`;
  } else {
    const savedScores = t._criteriaScores || {};
    body.innerHTML = crit.items.map((item, i) => {
      const saved = savedScores[i] ?? 0;
      const btns  = Array.from({ length: item.max + 1 }, (_, v) => `
        <button class="score-btn ${saved === v ? 'active' : ''}"
          onclick="setScore(this,${i},${v})" data-crit="${i}" data-val="${v}">${v}</button>`).join('');
      return `
        <div class="criteria-row">
          <span class="criteria-name">${item.label}</span>
          <div class="score-btn-group">${btns}</div>
          <span class="criteria-max">/ ${item.max}</span>
        </div>`;
    }).join('');
  }

  updateGradeTotal(t, crit);
  document.getElementById('gradeNote').value = t.schoolNote || '';
  openModal('modalGrade');
}

function setScore(btn, critIdx, val) {
  // Highlight nút trong nhóm
  btn.closest('.score-btn-group').querySelectorAll('.score-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateGradeTotal();
}

function updateGradeTotal() {
  const btns   = document.querySelectorAll('#gradeCriteriaBody .score-btn.active');
  let total = 0;
  btns.forEach(b => { total += +b.dataset.val; });
  const manual = document.getElementById('manualScore');
  if (manual) total = +manual.value || 0;
  document.getElementById('gradeTotalScore').textContent = total;
}

function saveGrade() {
  const idx      = +document.getElementById('gradeIdx').value;
  const trays    = loadKey(KEY.TRAY_LOG, DEFAULT_TRAY_LOG);
  const criteria = loadKey(KEY.CRITERIA, DEFAULT_CRITERIA);
  const selIdx   = document.getElementById('criteriaSelector').value;
  const note     = document.getElementById('gradeNote').value.trim();

  let score = 0;
  const manual = document.getElementById('manualScore');
  if (manual) {
    score = +manual.value || 0;
  } else {
    document.querySelectorAll('#gradeCriteriaBody .score-btn.active').forEach(b => { score += +b.dataset.val; });
  }

  // Lưu điểm từng tiêu chí
  const scores = {};
  document.querySelectorAll('#gradeCriteriaBody .score-btn.active').forEach(b => {
    scores[+b.dataset.crit] = +b.dataset.val;
  });

  trays[idx].schoolScore = score;
  trays[idx].schoolNote  = note;
  trays[idx]._criteriaScores = scores;
  saveKey(KEY.TRAY_LOG, trays);

  closeModal('modalGrade');
  renderProposalTable(trays);
  showToast(`Đã lưu điểm ${score} cho ${trays[idx].studentName}!`);
}

/* Chấm hàng loạt */
function batchGrade() {
  const checked = document.querySelectorAll('.tray-check:checked');
  if (!checked.length) { showToast('Chưa chọn học sinh nào!', 'error'); return; }
  const score = +document.getElementById('batchScore').value;
  const note  = document.getElementById('batchNote').value.trim();
  if (isNaN(score)) { showToast('Điểm không hợp lệ!', 'error'); return; }

  const trays = loadKey(KEY.TRAY_LOG, DEFAULT_TRAY_LOG);
  checked.forEach(cb => {
    const i = +cb.dataset.idx;
    trays[i].schoolScore = score;
    trays[i].schoolNote  = note || trays[i].schoolNote;
  });
  saveKey(KEY.TRAY_LOG, trays);
  closeModal('modalBatch');
  renderProposalTable(trays);
  showToast(`Đã chấm ${checked.length} học sinh · ${score} điểm.`);
}

/* ══════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Click ngoài modal để đóng
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
