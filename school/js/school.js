/* ═══════════════════════════════════════════════
   school.js — MOODMEAL MAGIC TRAY v3
   Giao diện BGH: 3 module
   ① Tài khoản  ② Thiết lập  ③ Báo cáo FAS
═══════════════════════════════════════════════ */

/* ── Storage keys ───────────────────────────── */
const KEY = {
  ACCOUNTS:  MM_KEYS.ACCOUNTS,
  MENU:      MM_KEYS.MENU,
  INGREDIENTS: MM_KEYS.INGREDIENTS,
  FOOD_GROUPS: MM_KEYS.FOOD_GROUPS,
  XP_CONFIG: MM_KEYS.XP_CONFIG,
  BADGES:    MM_KEYS.BADGES,
  FAS_LOG:   MM_KEYS.FAS_LOG,
};

/* ── Seed data helpers ───────────────────────── */
function loadKey(key, fallback) { return store.get(key, fallback); }
function saveKey(key, data)     { store.set(key, data); }

/* Dữ liệu mặc định / mẫu (DEFAULT_*) nằm ở js/seed.js; hàm mmSeedAll() ghi vào localStorage khi chưa có. */

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
    settings:  { title: '⚙️ Thiết lập',          sub: 'Thực đơn · Nguyên liệu · XP & Level · Danh hiệu · Nhân vật' },
    report:    { title: '📊 Báo cáo FAS',         sub: 'Hành trình chấp nhận thực phẩm của từng học sinh' },
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
  };
  if (renderers[name]) renderers[name]();
}

/* ══════════════════════════════════════════════
   MODULE ① — TÀI KHOẢN
══════════════════════════════════════════════ */
/* ── Lớp của học sinh (chỉ dùng ở giao diện BGH) ──
   Lớp gõ tự do; chuẩn hóa: bỏ khoảng trắng, viết hoa ("4a9" → "4A9") để lọc không bị lệch. */
function normClass(v) { return String(v == null ? '' : v).trim().replace(/\s+/g, '').toUpperCase(); }
function classOf(acc) { return normClass(acc && acc.className); }
/* Danh sách lớp đang có (xếp theo số trước chữ), từ các tài khoản học sinh */
function classListOf(accounts) {
  const set = new Set();
  accounts.filter(a => a.role === 'student').forEach(a => { const c = classOf(a); if (c) set.add(c); });
  return [...set].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
}
/* Đổ danh sách lớp vào ô chọn lọc; giữ lựa chọn cũ nếu còn. "__none" = học sinh chưa có lớp */
function fillClassFilter(selId, accounts) {
  const sel = document.getElementById(selId); if (!sel) return;
  const keep = sel.value, students = accounts.filter(a => a.role === 'student');
  const list = classListOf(accounts);
  sel.innerHTML = '<option value="">— Tất cả lớp —</option>' + list.map(c => `<option value="${escHtml(c)}">Lớp ${escHtml(c)}</option>`).join('') +
    (students.some(a => !classOf(a)) ? '<option value="__none">Chưa có lớp</option>' : '');
  sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
}
function fillClassDatalist(accounts) {
  const dl = document.getElementById('accClassList');
  if (dl) dl.innerHTML = classListOf(accounts).map(c => `<option value="${escHtml(c)}"></option>`).join('');
}

function renderAccounts() {
  const accounts = auth.getAccounts();
  const tbody = document.getElementById('accountsTbody');

  // Tự cấp danh hiệu "Tự động" cho học sinh đã đủ điều kiện
  accounts.filter(a => a.role === 'student').forEach(a => evaluateAutoBadges(a.id));

  tbody.innerHTML = accounts.map(acc => {
    const linked = accounts.find(a => a.id === acc.linkedId);
    const roleBadge = { admin: 'badge-blue', student: 'badge-green', parent: 'badge-purple' }[acc.role] || 'badge-grey';
    const statusBadge = acc.locked ? 'badge-red' : 'badge-green';
    const statusText  = acc.locked ? '🔒 Tạm khóa' : '✅ Hoạt động';

    // XP / Level / Danh hiệu: chỉ có với học sinh, tính trực tiếp từ dữ liệu hiện tại
    let statCells = '<td style="color:#aaa">—</td><td style="color:#aaa">—</td><td style="color:#aaa">—</td><td style="color:#aaa">—</td>';
    if (acc.role === 'student') {
      const info   = getLevelInfo(getStudentXp(acc.id));
      const earned = getEarnedBadges(acc.id);
      const icons  = earned.length
        ? earned.map(b => `<span title="${escHtml(b.def.name)}${b.awardedDate ? ' · ' + b.awardedDate : ''}" style="font-size:18px;margin-right:2px">${b.def.icon}</span>`).join('')
        : '<span style="color:#aaa">—</span>';
      const ch = acc.characterId ? mmCharById(acc.characterId) : null;
      statCells = `
        <td><strong>${info.xp}</strong> <span style="color:#888;font-size:11px">XP</span></td>
        <td><span class="badge badge-blue">Level ${info.level} · ${escHtml(info.name)}</span></td>
        <td>${ch ? escHtml(ch.name) : '<span style="color:#aaa">Chưa chọn</span>'}</td>
        <td>${icons}</td>`;
    }

    return `
      <tr data-id="${escHtml(acc.id)}" data-role="${escHtml(acc.role)}" data-class="${escHtml(classOf(acc))}">
        <td><code style="font-size:12px">${escHtml(acc.id)}</code></td>
        <td><strong>${escHtml(acc.name)}</strong></td>
        <td>${acc.role !== 'student' ? '<span style="color:#aaa">—</span>' : classOf(acc) ? escHtml(classOf(acc)) : '<span style="color:#aaa">Chưa có lớp</span>'}</td>
        <td><span class="badge ${roleBadge}">${roleLabel(acc.role)}</span></td>
        <td>${linked ? escHtml(linked.name) : '<span style="color:#aaa">—</span>'}</td>
        ${statCells}
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
  fillClassFilter('accFilterClass', accounts);
  if (typeof filterAccountsTable === 'function') filterAccountsTable();
}

function roleLabel(role) {
  return { admin: 'BGH', student: 'Học sinh', parent: 'Phụ huynh' }[role] || role;
}

/* ── Phần XP / Level / Danh hiệu trong form (chỉ học sinh) ── */
function sortedLevels() {
  return getXpConfig().levels.slice().sort((a, b) => a.xpFrom - b.xpFrom);
}

function fillLevelSelect() {
  document.getElementById('accFormLevel').innerHTML = sortedLevels().map((l, i) =>
    `<option value="${i}" data-from="${l.xpFrom}">Level ${l.level} · ${escHtml(l.name)} (từ ${l.xpFrom} XP)</option>`).join('');
}

/* Đổi XP → Level tự khớp bảng "Cấu hình Level" */
function syncLevelFromXp() {
  const xp = parseInt(document.getElementById('accFormXp').value, 10);
  if (isNaN(xp)) return;
  let idx = 0;
  sortedLevels().forEach((l, i) => { if (xp >= l.xpFrom) idx = i; });
  document.getElementById('accFormLevel').value = String(idx);
}

/* Chọn Level → XP đặt về mốc thấp nhất của level đó */
function syncXpFromLevel() {
  const opt = document.getElementById('accFormLevel').selectedOptions[0];
  if (opt) document.getElementById('accFormXp').value = opt.dataset.from;
}

function renderBadgeChecks(studentId) {
  if (studentId) evaluateAutoBadges(studentId);
  const have = studentId ? getEarnedBadges(studentId).map(e => e.def.id) : [];
  document.getElementById('accFormBadges').innerHTML = getBadgeDefs().filter(d => d.active).map(d => `
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
      <input type="checkbox" class="accBadgeChk" value="${escHtml(d.id)}" ${have.indexOf(d.id) !== -1 ? 'checked' : ''}>
      <span>${d.icon} ${escHtml(d.name)}</span>
      <span style="font-size:11px;color:#888">· ${d.auto ? 'tự động' : 'duyệt tay'}</span>
    </label>`).join('');
}

/* Ô chọn nhân vật: nhân vật đang bật + nhân vật đã gán (kể cả khi đang tắt) */
function renderCharSelect(studentId) {
  const acc = studentId ? auth.getAccounts().find(a => a.id === studentId) : null;
  const cur = acc && acc.characterId ? acc.characterId : '';
  const list = mmCharAll(true).filter(c => c.active !== false || c.id === cur);
  document.getElementById('accFormChar').innerHTML = '<option value="">— Chưa chọn —</option>' +
    list.map(c => `<option value="${escHtml(c.id)}"${c.id === cur ? ' selected' : ''}>${escHtml(c.name)}${c.active === false ? ' (đang tắt)' : ''}</option>`).join('');
}

function toggleStudentStats(role, studentId) {
  const wrap = document.getElementById('studentStatsWrap');
  wrap.style.display = role === 'student' ? 'block' : 'none';
  document.getElementById('classWrap').style.display = role === 'student' ? 'block' : 'none';   // ô Lớp nằm cạnh "Phụ huynh liên kết"
  if (role !== 'student') return;
  fillLevelSelect();
  const xpEl = document.getElementById('accFormXp');
  if (xpEl.value === '') xpEl.value = studentId ? getStudentXp(studentId) : 0;
  syncLevelFromXp();
  renderCharSelect(studentId);
  renderBadgeChecks(studentId);
}

/* Mở modal thêm tài khoản */
function openAddAccount() {
  document.getElementById('modalAccountTitle').textContent = 'Thêm tài khoản';
  document.getElementById('accFormId').value   = '';
  document.getElementById('accFormName').value = '';
  document.getElementById('accFormPass').value = '';
  document.getElementById('accFormRole').value = 'student';
  document.getElementById('accFormRole').disabled = false;
  document.getElementById('accFormId').readOnly = false;
  document.getElementById('accEditId').value = '';
  document.getElementById('accFormXp').value = '0';
  document.getElementById('accFormClass').value = '';
  fillClassDatalist(auth.getAccounts());
  renderLinkedSelect('student');
  toggleStudentStats('student', null);
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
  document.getElementById('accFormRole').disabled = acc.id === 'admin';   // không đổi vai trò tài khoản admin
  document.getElementById('accFormXp').value = acc.role === 'student' ? getStudentXp(acc.id) : '';
  document.getElementById('accFormClass').value = classOf(acc);
  fillClassDatalist(accounts);
  renderLinkedSelect(acc.role, acc.linkedId);
  toggleStudentStats(acc.role, acc.id);
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
    options.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${escHtml(a.name)} (${escHtml(a.id)})</option>`).join('');
}

document.addEventListener('change', e => {
  if (e.target.id === 'accFormRole') {
    renderLinkedSelect(e.target.value);
    toggleStudentStats(e.target.value, document.getElementById('accEditId').value || null);
  }
});

/* ID đăng nhập: chữ không dấu, số, . _ - (được dùng trong thuộc tính HTML nên không cho ký tự đặc biệt) */
const ID_PATTERN = /^[A-Za-z0-9._-]{1,30}$/;

function saveAccount() {
  const editId = document.getElementById('accEditId').value;
  const id     = document.getElementById('accFormId').value.trim();
  const name   = document.getElementById('accFormName').value.trim();
  const pass   = document.getElementById('accFormPass').value.trim();
  const role   = document.getElementById('accFormRole').value;
  const linked = document.getElementById('accFormLinked')?.value || null;

  if (!id || !name || !pass) { showToast('Vui lòng điền đầy đủ thông tin!', 'error'); return; }
  if (!editId && !ID_PATTERN.test(id)) { showToast('ID chỉ gồm chữ không dấu, số, dấu . _ - (tối đa 30 ký tự)!', 'error'); return; }

  const isStudent = role === 'student';
  const clsVal = isStudent ? normClass(document.getElementById('accFormClass').value) : '';
  if (isStudent && !editId && !clsVal) { showToast('Vui lòng nhập Lớp của học sinh mới!', 'error'); return; }
  let xpVal = null;
  if (isStudent) {
    xpVal = parseInt(document.getElementById('accFormXp').value, 10);
    if (isNaN(xpVal) || xpVal < 0) { showToast('XP phải là số từ 0 trở lên!', 'error'); return; }
  }

  const accounts = auth.getAccounts();
  let nameChanged = false;
  const charVal = isStudent ? (document.getElementById('accFormChar').value || null) : null;
  let charChanged = false;

  if (editId) {
    // Sửa
    const idx = accounts.findIndex(a => a.id === editId);
    if (idx === -1) return;
    nameChanged = accounts[idx].name !== name;
    const currentXp = isStudent ? getStudentXp(editId) : null;
    accounts[idx] = { ...accounts[idx], name, pass, role, linkedId: linked || null };
    // BGH đặt tổng XP: giữ sổ XP, chỉnh XP nền cho khớp
    if (isStudent && xpVal !== currentXp) accounts[idx].xp = xpBaseForTotal(editId, xpVal);
    // Cập nhật liên kết hai phía
    updateLinkedId(accounts, editId, linked);
  } else {
    // Thêm mới
    if (accounts.find(a => a.id === id)) { showToast('ID đã tồn tại!', 'error'); return; }
    const newAcc = { id, pass, role, name, linkedId: linked || null, avatar: '🧒', locked: false };
    if (isStudent) newAcc.xp = xpVal;          // học sinh mới bắt đầu từ XP BGH nhập (mặc định 0)
    accounts.push(newAcc);
    updateLinkedId(accounts, id, linked);
  }

  /* Nhân vật đồng hành lưu cùng tài khoản; đổi/gán mới thì hiện thẳng hình của Level hiện tại (không chiếu hoạt ảnh lên cấp) */
  const savedAcc = accounts.find(a => a.id === (editId || id));
  if (savedAcc) {
    if (clsVal) savedAcc.className = clsVal; else delete savedAcc.className;   // lớp chỉ có ở học sinh
    const prevChar = savedAcc.characterId || null;
    if (isStudent) { if (charVal) savedAcc.characterId = charVal; else delete savedAcc.characterId; }
    else delete savedAcc.characterId;
    charChanged = isStudent && prevChar !== charVal;
  }

  auth.saveAccounts(accounts);
  if (charChanged) mmCharMarkSeen(editId || id);

  if (isStudent) {
    const wanted = [...document.querySelectorAll('.accBadgeChk:checked')].map(c => c.value);
    setStudentBadges(id, wanted);
  }

  closeModal('modalAccount');
  renderAccounts();
  showToast(editId ? 'Đã cập nhật tài khoản!' : 'Đã thêm tài khoản mới!');
}

/* Liên kết phụ huynh ↔ học sinh hai chiều: gỡ liên kết cũ, đặt liên kết mới */
function updateLinkedId(accounts, myId, linkedId) {
  accounts.forEach(a => {
    if (a.id !== myId && a.linkedId === myId && a.id !== linkedId) a.linkedId = null;
  });
  if (!linkedId) return;
  const target = accounts.find(a => a.id === linkedId);
  if (!target) return;
  if (target.linkedId && target.linkedId !== myId) {
    const old = accounts.find(a => a.id === target.linkedId);
    if (old && old.linkedId === target.id) old.linkedId = null;
  }
  target.linkedId = myId;
}

function toggleLock(id) {
  const accounts = auth.getAccounts();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  if (acc.id === 'admin') { showToast('Không thể khóa tài khoản admin!', 'error'); return; }
  acc.locked = !acc.locked;
  auth.saveAccounts(accounts);
  renderAccounts();
  showToast(acc.locked ? 'Đã khóa tài khoản. Phiên đang đăng nhập của tài khoản này sẽ bị đăng xuất.' : 'Đã mở khóa tài khoản.');
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
  let added = 0, noClass = 0;

  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) return;
    const [id, name, pass] = parts;
    if (!id || !name || !pass) return;
    if (!ID_PATTERN.test(id)) return;            // bỏ qua ID có ký tự không hợp lệ
    if (accounts.find(a => a.id === id)) return; // bỏ qua trùng
    const cls = normClass(parts[3]);
    if (!cls) { noClass++; return; }             // lớp bắt buộc
    accounts.push({ id, name, pass, role: 'student', linkedId: null, avatar: '🧒', locked: false, xp: 0, className: cls });
    added++;
  });

  auth.saveAccounts(accounts);
  document.getElementById('csvPaste').value = '';
  closeModal('modalImport');
  renderAccounts();
  showToast(`Đã import ${added} tài khoản mới!` + (noClass ? ` Bỏ qua ${noClass} dòng thiếu lớp.` : ''), noClass && !added ? 'error' : undefined);
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
    ingredients: renderIngredientsTab,
    xp:       renderXPTab,
    badges:   renderBadgesTab,
    characters: renderCharactersTab,
  };
  if (renders[tab]) renders[tab]();
}

/* Tab 1 — Thực đơn
   Hai chế độ xem: Theo tuần (1 tuần T2–CN) và Theo tháng (lịch 7 cột).
   Mặc định luôn là Theo tuần khi mở trang (không lưu lựa chọn). */
let menuView   = 'week';      // 'week' | 'month'
let menuAnchor = new Date();  // một ngày bất kỳ trong tuần/tháng đang xem

function renderMenuTab() {
  const menu     = loadKey(KEY.MENU, DEFAULT_MENU);
  const grid     = document.getElementById('weekGrid');
  const todayStr = toLocalDateStr(new Date());
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  const dm = d => `${d.getDate()}/${d.getMonth() + 1}`;

  function chipsOf(date) {
    return menu.filter(m => m.date === date).map(m => `
        <div class="menu-chip" title="Nhóm: ${escHtml(menuGroupName(m))}">
          <span class="menu-chip-icon">${escHtml(m.icon || groupIcon(m.groupId || m.group))}</span>
          <span class="menu-chip-name">${escHtml(m.name)}</span>
          ${m.isNew ? '<span class="menu-chip-new">MỚI</span>' : ''}
          <button class="btn btn-ghost btn-icon" style="padding:0;font-size:11px" onclick="deleteMenuItem('${m.id}')">✕</button>
        </div>`).join('');
  }

  const days = getMenuDays(menuView, menuAnchor);
  let title, body;

  if (menuView === 'week') {
    const first = days[0].d, last = days[6].d;
    title = `Tuần ${dm(first)} – ${dm(last)}/${last.getFullYear()}`;
    const heads = days.map(({ d, date }) =>
      `<div class="cal-band-cell ${date === todayStr ? 'today' : ''} ${isWeekend(d) ? 'weekend' : ''}">${dayNames[d.getDay()]} ${dm(d)}</div>`).join('');
    const cols = days.map(({ d, date }) => `
        <div class="week-col">
          ${chipsOf(date)}
          <button class="add-menu-btn" onclick="openAddMenu('${date}')">+ Thêm món</button>
        </div>`).join('');
    body = `<div class="cal-band">${heads}</div><div class="week-grid week-grid-7">${cols}</div>`;
  } else {
    title = `Tháng ${menuAnchor.getMonth() + 1}/${menuAnchor.getFullYear()}`;
    const heads = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((n, i) =>
      `<div class="cal-band-cell ${i >= 5 ? 'weekend' : ''}">${n}</div>`).join('');
    const cells = days.map(({ d, date, inMonth }) => `
        <div class="month-cell ${inMonth ? '' : 'out'} ${date === todayStr ? 'today' : ''}">
          <div class="month-cell-head">
            <span class="month-cell-date ${isWeekend(d) ? 'weekend' : ''}">${d.getDate()}</span>
            <button class="month-add-btn" onclick="openAddMenu('${date}')" title="Thêm món ngày ${dm(d)}">+</button>
          </div>
          ${chipsOf(date)}
        </div>`).join('');
    body = `<div class="month-wrap"><div class="cal-band">${heads}</div><div class="month-grid">${cells}</div></div>`;
  }

  const unit = menuView === 'week' ? 'Tuần' : 'Tháng';
  grid.innerHTML = `
    <div class="menu-view-bar">
      <div class="view-toggle">
        <button class="view-toggle-btn ${menuView === 'week'  ? 'active' : ''}" onclick="setMenuView('week')">📅 Theo tuần</button>
        <button class="view-toggle-btn ${menuView === 'month' ? 'active' : ''}" onclick="setMenuView('month')">🗓️ Theo tháng</button>
      </div>
      <div class="menu-view-nav">
        <button class="btn btn-secondary btn-sm" onclick="shiftMenuView(-1)" title="${unit} trước">◀</button>
        <span class="menu-view-title">${title}</span>
        <button class="btn btn-secondary btn-sm" onclick="shiftMenuView(1)" title="${unit} sau">▶</button>
        <button class="btn btn-ghost btn-sm" onclick="menuGoToday()">Hôm nay</button>
      </div>
    </div>
    ${body}`;
}

function setMenuView(view) {
  menuView = view;
  renderMenuTab();
}

function shiftMenuView(dir) {
  const a = menuAnchor;
  menuAnchor = menuView === 'week'
    ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * dir)
    : new Date(a.getFullYear(), a.getMonth() + dir, 1);
  renderMenuTab();
}

function menuGoToday() {
  menuAnchor = new Date();
  renderMenuTab();
}

/* Icon của nhóm thực phẩm theo mã nhóm; dữ liệu cũ ghi tên nhóm dinh dưỡng thì dùng bảng dự phòng */
function groupIcon(group) {
  const g = mmGroupById(group);
  if (g) return g.icon;
  return { 'Tinh bột': '🍚', 'Đạm': '🥩', 'Rau củ': '🥦', 'Trái cây': '🍎' }[group] || '🍽️';
}

/* Tên nhóm thực phẩm của một món trong thực đơn (món cũ chưa có groupId → tên nhóm dinh dưỡng cũ) */
function menuGroupName(m) {
  const g = mmGroupById(m.groupId || (loadKey(KEY.INGREDIENTS, []).find(x => x.id === m.ingredientId) || {}).groupId);
  return g ? g.name : (m.group || '—');
}

/* Tạo date string dạng YYYY-MM-DD theo LOCAL time (tránh lệch UTC+7) */
/* Danh sách ngày cần hiển thị (tuần bắt đầu Thứ Hai, gồm cả T7 và CN)
   - week : 7 ngày T2–CN của tuần chứa `anchor`
   - month: các tuần trọn vẹn phủ tháng chứa `anchor` (ngày ngoài tháng có inMonth = false) */
function getMenuDays(view, anchor) {
  const y = anchor.getFullYear(), m = anchor.getMonth();
  const monOffset = d => (d.getDay() + 6) % 7;   // T2 = 0 … CN = 6
  let start, count;

  if (view === 'week') {
    start = new Date(y, m, anchor.getDate() - monOffset(anchor));
    count = 7;
  } else {
    const first = new Date(y, m, 1);
    const last  = new Date(y, m + 1, 0);
    start = new Date(y, m, 1 - monOffset(first));
    count = monOffset(first) + last.getDate() + (6 - monOffset(last));
  }

  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ d, date: toLocalDateStr(d), inMonth: d.getMonth() === m });   // ← dùng local, không dùng UTC
  }
  return days;
}


function saveMenuItem() {
  const date   = document.getElementById('menuDate').value;
  const name   = document.getElementById('menuName').value.trim();
  const icon   = document.getElementById('menuIcon').value.trim();
  const isNew  = document.getElementById('menuIsNew').checked;

  const ingId = document.getElementById('menuIngredient').value;
  const ing   = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).find(g => g.id === ingId);
  if (!ing)  { showToast('Vui lòng chọn nguyên liệu chính!', 'error'); return; }
  if (!name) { showToast('Vui lòng nhập tên món!', 'error'); return; }

  const menu = loadKey(KEY.MENU, []);
  menu.push({ id: 'm' + Date.now(), date, name, ingredientId: ing.id, groupId: ing.groupId || null, icon: icon || ing.icon || groupIcon(ing.groupId), isNew });
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
  const picker = renderIconPanel('iconPickerPanel', 'pickIcon');
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
  document.getElementById('menuIngredient').value = '';
  document.getElementById('menuIconDisplay').textContent = '🍽️';
  document.getElementById('iconPickerPanel').style.display = 'none';
  fillGroupSelect('menuGroup');
  renderMenuIngredientPick();
  openModal('modalMenu');
}

/* Danh sách nguyên liệu theo nhóm thực phẩm đang chọn trong form thêm món */
function renderMenuIngredientPick() {
  const group  = document.getElementById('menuGroup').value;
  const selId  = document.getElementById('menuIngredient').value;
  const list   = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS)
    .filter(g => g.active !== false && g.groupId === group);
  if (selId && !list.some(g => g.id === selId)) document.getElementById('menuIngredient').value = '';
  const box = document.getElementById('menuIngredientPick');
  if (!list.length) {
    const gn = (mmGroupById(group) || {}).name || '';
    box.innerHTML = `<span style="font-size:12px;color:var(--text-muted)">Chưa có nguyên liệu thuộc nhóm "${escHtml(gn)}" — hãy thêm ở tab Nguyên liệu.</span>`;
    return;
  }
  const cur = document.getElementById('menuIngredient').value;
  box.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px">' + list.map(g => `
    <button type="button" class="btn btn-sm ${g.id === cur ? 'btn-primary' : 'btn-secondary'}"
      title="${escHtml(g.name)}" onclick="pickMenuIngredient('${g.id}')">${g.icon} ${escHtml(g.name)}${g.id === cur ? ' ✓' : ''}</button>`).join('') + '</div>';
}

function pickMenuIngredient(id) {
  const g = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).find(x => x.id === id);
  if (!g) return;
  document.getElementById('menuIngredient').value = id;
  document.getElementById('menuIcon').value = g.icon;
  document.getElementById('menuIconDisplay').textContent = g.icon;
  renderMenuIngredientPick();
}

function deleteMenuItem(id) {
  const menu = loadKey(KEY.MENU, []).filter(m => m.id !== id);
  saveKey(KEY.MENU, menu);
  renderMenuTab();
}

/* Tab — Nguyên liệu
   Danh mục nguyên liệu do BGH quản lý (thỉnh thoảng, không hằng ngày).
   `id` của nguyên liệu là foodId của nhật ký FAS. */
// DANH SÁCH ICON CHUNG cho 3 form: Thêm món thực đơn, Thêm/Sửa nguyên liệu, Thêm/Sửa nhóm thực phẩm.
// Muốn thêm/bớt icon: chỉ sửa ở đây, cả 3 form đổi theo.
const MM_ICON_GROUPS = [
  { name: 'Tinh bột', icon: '🍚', list: ['🍚','🍙','🍘','🍞','🥖','🥐','🥯','🥨','🍜','🍝','🌽','🥔','🍠','🫓','🥞','🧇','🌾','🥣',
                                         '🍛','🍱','🥟','🥠','🍡','🌮','🌯','🥪','🍔','🍕','🌭','🍽️',
                                         '🥧','🍪','🍰','🍧','🍨'] },
  { name: 'Đạm',      icon: '🥩', list: ['🥩','🍗','🍖','🥓','🦐','🦑','🦞','🦀','🐟','🍣','🍤','🥚','🍳','🧆','🫘','🥜','🌰','🧀','🥛','🍢'] },
  { name: 'Rau củ',   icon: '🥦', list: ['🥦','🥕','🍅','🥬','🥒','🌶️','🫑','🧅','🧄','🍆','🥑','🍄','🌿','🫛','🥗','🎃','🌱','🫒',
                                         '🍲','🥘','🍵'] },
  { name: 'Trái cây', icon: '🍎', list: ['🍎','🍏','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝'] },
];

/* Vẽ bảng icon chia nhóm vào panel (chỉ vẽ lần đầu); pickFn là tên hàm xử lý khi chọn icon */
function renderIconPanel(panelId, pickFn) {
  const panel = document.getElementById(panelId);
  if (panel.innerHTML.trim()) return panel;
  panel.innerHTML = MM_ICON_GROUPS.map(g =>
    `<div style="grid-column:1/-1;font-size:10px;font-weight:600;color:var(--text-muted);margin:4px 0 2px">${g.icon} ${g.name}</div>` +
    g.list.map(ic => `<button type="button" class="icon-opt" onclick="${pickFn}('${ic}')">${ic}</button>`).join('')).join('');
  return panel;
}

/* ── Nhóm thực phẩm (mỗi nhóm = 1 hành tinh) ── */
/* Điền danh sách nhóm đang dùng vào một ô chọn; giữ lựa chọn cũ nếu còn, thêm nhóm đang sửa dù đã ẩn */
function fillGroupSelect(selectId, keepId) {
  const sel = document.getElementById(selectId);
  const cur = keepId || sel.value;
  const list = mmFoodGroups().filter(g => g.active !== false || g.id === keepId);
  sel.innerHTML = list.map(g => `<option value="${escHtml(g.id)}">${escHtml(g.icon)} ${escHtml(g.name)}</option>`).join('');
  if (cur && list.some(g => g.id === cur)) sel.value = cur;
}

function groupIngredientCount(id) {
  return loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).filter(g => g.groupId === id).length;
}

function renderFoodGroupsCard() {
  const box = document.getElementById('foodGroupsBox');
  const groups = mmFoodGroups(true);
  box.innerHTML = `<div class="content-card" style="margin-bottom:16px;overflow:hidden">
    <div class="content-card-header"><span class="content-card-title">🪐 Nhóm thực phẩm (mỗi nhóm là một hành tinh)</span></div>
    <div style="overflow-x:auto"><table class="data-table"><thead><tr>
      <th>Biểu tượng</th><th>Nhóm</th><th style="text-align:center">Số nguyên liệu</th><th style="text-align:center">Đang dùng</th><th></th>
    </tr></thead><tbody>` + (groups.map(g => {
      const n = groupIngredientCount(g.id);
      const del = n ? `<button class="btn btn-sm btn-ghost btn-icon" title="${g.active === false ? 'Dùng lại' : 'Ẩn nhóm (nhóm đang có nguyên liệu nên không xóa được)'}" onclick="toggleGroup('${escHtml(g.id)}')">${g.active === false ? '✅' : '🚫'}</button>`
                      : `<button class="btn btn-sm btn-ghost btn-icon" title="Xóa nhóm" onclick="deleteGroup('${escHtml(g.id)}')">🗑</button>`;
      return `<tr style="${g.active === false ? 'opacity:.5' : ''}"><td style="font-size:20px">${escHtml(g.icon)}</td><td><strong>${escHtml(g.name)}</strong></td>
        <td style="text-align:center">${n}</td><td style="text-align:center">${g.active === false ? '—' : '✓'}</td>
        <td style="text-align:right"><button class="btn btn-sm btn-ghost btn-icon" title="Sửa" onclick="openEditGroup('${escHtml(g.id)}')">✏️</button>${del}</td></tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:16px">Chưa có nhóm. Bấm "+ Thêm nhóm".</td></tr>') +
    `</tbody></table></div></div>`;
}

function toggleGrpIconPanel() {
  const panel = renderIconPanel('grpIconPanel', 'pickGrpIcon');
  panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
}
function pickGrpIcon(ic) {
  document.getElementById('grpIcon').value = ic;
  document.getElementById('grpIconDisplay').textContent = ic;
  document.getElementById('grpIconPanel').style.display = 'none';
}

function openAddGroup() {
  document.getElementById('modalGroupTitle').textContent = '+ Thêm nhóm thực phẩm';
  document.getElementById('grpEditId').value = '';
  document.getElementById('grpName').value = '';
  document.getElementById('grpIcon').value = '';
  document.getElementById('grpIconDisplay').textContent = '🍽️';
  document.getElementById('grpIconPanel').style.display = 'none';
  openModal('modalGroup');
}

function openEditGroup(id) {
  const g = mmGroupById(id);
  if (!g) return;
  document.getElementById('modalGroupTitle').textContent = 'Sửa nhóm thực phẩm';
  document.getElementById('grpEditId').value = id;
  document.getElementById('grpName').value = g.name;
  document.getElementById('grpIcon').value = g.icon;
  document.getElementById('grpIconDisplay').textContent = g.icon || '🍽️';
  document.getElementById('grpIconPanel').style.display = 'none';
  openModal('modalGroup');
}

function saveGroup() {
  const editId = document.getElementById('grpEditId').value;
  const name   = document.getElementById('grpName').value.trim();
  const icon   = document.getElementById('grpIcon').value || '🍽️';
  if (!name) { showToast('Vui lòng nhập tên nhóm!', 'error'); return; }
  const list = mmFoodGroups(true);
  const norm = t => normFood(t);
  if (list.some(g => g.id !== editId && norm(g.name) === norm(name))) { showToast('Đã có nhóm tên này.', 'error'); return; }
  if (editId) {
    const g = list.find(x => x.id === editId);
    if (!g) return;
    Object.assign(g, { name, icon });
  } else {
    let id = 'g-' + (makeIngredientId(name, []) || 'nhom'), n = 2;
    while (list.some(g => g.id === id)) id = 'g-' + makeIngredientId(name, []) + '-' + (n++);
    list.push({ id, name, icon, order: Math.max(0, ...list.map(g => g.order || 0)) + 1, active: true });
  }
  saveKey(KEY.FOOD_GROUPS, list);
  closeModal('modalGroup');
  renderIngredientsTab();
  showToast('Đã lưu nhóm!');
}

function toggleGroup(id) {
  const list = mmFoodGroups(true);
  const g = list.find(x => x.id === id);
  if (!g) return;
  g.active = g.active === false;
  saveKey(KEY.FOOD_GROUPS, list);
  renderIngredientsTab();
}

function deleteGroup(id) {
  if (groupIngredientCount(id)) { showToast('Nhóm đang có nguyên liệu, chỉ có thể ẩn.', 'error'); return; }
  const g = mmGroupById(id);
  if (!g || !confirm(`Xóa nhóm "${g.name}"?`)) return;
  saveKey(KEY.FOOD_GROUPS, mmFoodGroups(true).filter(x => x.id !== id));
  renderIngredientsTab();
  showToast('Đã xóa nhóm');
}

function ingredientInUse(id) {
  return loadKey(KEY.MENU, []).some(m => m.ingredientId === id)
      || loadKey(KEY.FAS_LOG, []).some(r => r.foodId === id);
}

function renderIngredientsTab() {
  renderFoodGroupsCard();
  const list = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS);
  const box  = document.getElementById('ingredientsList');
  if (!list.length) {
    box.innerHTML = '<div class="content-card"><div style="padding:24px;text-align:center;color:#888">Chưa có nguyên liệu. Bấm "+ Thêm nguyên liệu".</div></div>';
    return;
  }
  const groups = mmFoodGroups(true);
  const orphans = list.filter(g => !groups.some(x => x.id === g.groupId));
  box.innerHTML = '<div class="content-card" style="overflow:hidden">' + groups.map(gr => {
    const items = list.filter(g => g.groupId === gr.id);
    if (!items.length) return '';
    return `<div style="padding:8px 16px;background:#F3F6F8;font-size:12px;font-weight:700;color:var(--text-muted)">${escHtml(gr.icon)} Nhóm ${escHtml(gr.name)}${gr.active === false ? ' (ẩn)' : ''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px 12px">${items.map(ingChipHtml).join('')}</div>`;
  }).join('') + (orphans.length
    ? `<div style="padding:8px 16px;background:#FFF8E6;font-size:12px;font-weight:700;color:#B7791F">⚠️ Chưa có nhóm — bấm ✏️ để chọn nhóm</div>
       <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px 12px">${orphans.map(ingChipHtml).join('')}</div>` : '') + '</div>';
}

function ingChipHtml(g) {
  const used = ingredientInUse(g.id);
  const off  = g.active === false;
  const del  = used
    ? `<button class="btn btn-sm btn-ghost btn-icon" title="${off ? 'Dùng lại' : 'Ngừng dùng (đã có trong thực đơn/FAS nên không xóa được)'}" onclick="toggleIngredient('${g.id}')">${off ? '✅' : '🚫'}</button>`
    : `<button class="btn btn-sm btn-ghost btn-icon" title="Xóa" onclick="deleteIngredient('${g.id}')">🗑</button>`;
  return `<span style="display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border);border-radius:10px;padding:2px 4px 2px 10px;font-size:12px;${off ? 'opacity:.5' : ''}">
    ${g.icon} ${escHtml(g.name)}${off ? ' <em style="font-size:10px">(ngừng dùng)</em>' : ''}
    <button class="btn btn-sm btn-ghost btn-icon" title="Sửa" onclick="openEditIngredient('${g.id}')">✏️</button>${del}</span>`;
}

function toggleIngIconPanel() {
  const panel = renderIconPanel('ingIconPanel', 'pickIngIcon');
  panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
}

function pickIngIcon(ic) {
  document.getElementById('ingIcon').value = ic;
  document.getElementById('ingIconDisplay').textContent = ic;
  document.getElementById('ingIconPanel').style.display = 'none';
}

function setIngFields(o) {
  fillGroupSelect('ingGroup', o.groupId);
  document.getElementById('ingName').value    = o.name || '';
  document.getElementById('ingIcon').value    = o.icon || '';
  document.getElementById('ingIconDisplay').textContent = o.icon || '🍽️';
}

function openAddIngredient() {
  document.getElementById('modalIngredientTitle').textContent = '+ Thêm nguyên liệu';
  document.getElementById('ingEditId').value = '';
  setIngFields({});
  document.getElementById('ingIconPanel').style.display = 'none';
  document.getElementById('ingEditWarn').style.display = 'none';
  openModal('modalIngredient');
}

function openEditIngredient(id) {
  const g = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).find(x => x.id === id);
  if (!g) return;
  document.getElementById('modalIngredientTitle').textContent = 'Sửa nguyên liệu';
  document.getElementById('ingEditId').value = id;
  setIngFields(g);
  document.getElementById('ingIconPanel').style.display = 'none';
  document.getElementById('ingEditWarn').style.display = ingredientInUse(id) ? 'block' : 'none';
  openModal('modalIngredient');
}

function makeIngredientId(name, list) {
  const base = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'nl';
  let id = base, n = 2;
  while (list.some(g => g.id === id)) id = base + '-' + (n++);
  return id;
}

function saveIngredient() {
  const editId = document.getElementById('ingEditId').value;
  const name   = document.getElementById('ingName').value.trim();
  const groupId = document.getElementById('ingGroup').value;
  const icon   = document.getElementById('ingIcon').value || groupIcon(groupId);
  if (!name) { showToast('Vui lòng nhập tên nguyên liệu!', 'error'); return; }
  if (!groupId) { showToast('Vui lòng chọn nhóm thực phẩm!', 'error'); return; }

  const list = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS);
  const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
  if (list.some(g => g.id !== editId && norm(g.name) === norm(name))) {
    if (!confirm(`Đã có nguyên liệu tên "${name}". Vẫn lưu thêm một nguyên liệu trùng tên?`)) return;
  }

  if (editId) {
    const g = list.find(x => x.id === editId);
    if (!g) return;
    const changed = g.name !== name || g.groupId !== groupId;
    Object.assign(g, { name, groupId, icon });
    saveKey(KEY.INGREDIENTS, list);
    if (changed) {
      // Đồng bộ nhóm/tên vào thực đơn và nhật ký FAS (nối theo id, không mất lịch sử; lượt thử tính theo nhóm mới)
      const menu = loadKey(KEY.MENU, []);
      menu.forEach(m => { if (m.ingredientId === editId) m.groupId = groupId; });
      saveKey(KEY.MENU, menu);
      const fas = loadKey(KEY.FAS_LOG, []);
      fas.forEach(r => { if (r.foodId === editId) { r.foodName = name; r.groupId = groupId; } });
      mmRenumberFasLog(fas);
      saveKey(KEY.FAS_LOG, fas);
    }
  } else {
    const id = makeIngredientId(name, list);
    list.push({ id, name, icon, groupId, active: true });
    saveKey(KEY.INGREDIENTS, list);
  }
  closeModal('modalIngredient');
  renderIngredientsTab();
  showToast('Đã lưu nguyên liệu!');
}

function toggleIngredient(id) {
  const list = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS);
  const g = list.find(x => x.id === id);
  if (!g) return;
  g.active = g.active === false;
  saveKey(KEY.INGREDIENTS, list);
  renderIngredientsTab();
}

function deleteIngredient(id) {
  if (ingredientInUse(id)) { showToast('Nguyên liệu đã dùng, chỉ có thể ngừng dùng.', 'error'); return; }
  const g = loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).find(x => x.id === id);
  if (!g || !confirm(`Xóa nguyên liệu "${g.name}"?`)) return;
  saveKey(KEY.INGREDIENTS, loadKey(KEY.INGREDIENTS, DEFAULT_INGREDIENTS).filter(x => x.id !== id));
  renderIngredientsTab();
  showToast('Đã xóa nguyên liệu');
}

/* Tab 2 — XP & Level */
function renderXPTab() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);

  // Bảng levels (chỉ xem)
  document.getElementById('xpLevelsBody').innerHTML = cfg.levels.map(lv => `
    <tr>
      <td>${lv.level}</td>
      <td>${escHtml(lv.name)}</td>
      <td>${lv.xpFrom}</td>
      <td>${lv.xpTo}</td>
    </tr>`).join('');

  // Bảng actions (chỉ xem)
  document.getElementById('xpActionsBody').innerHTML = cfg.actions.map(ac => `
    <tr>
      <td>${escHtml(ac.label)}</td>
      <td>${ac.xp} <span style="font-size:12px;color:#888">XP</span></td>
    </tr>`).join('');
}

function openEditLevels() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  document.getElementById('xpLevelsEditBody').innerHTML = cfg.levels.map((lv, i) => `
    <tr>
      <td>${lv.level}</td>
      <td><input class="inline-input" style="width:150px" data-f="name" data-i="${i}" value="${escHtml(lv.name)}"></td>
      <td><input class="inline-input" type="number" data-f="xpFrom" data-i="${i}" value="${lv.xpFrom}"></td>
      <td><input class="inline-input" type="number" data-f="xpTo" data-i="${i}" value="${lv.xpTo}"></td>
    </tr>`).join('');
  openModal('modalXpLevels');
}

function saveLevels() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  document.querySelectorAll('#xpLevelsEditBody input').forEach(inp => {
    const lv = cfg.levels[+inp.dataset.i];
    lv[inp.dataset.f] = inp.dataset.f === 'name' ? inp.value : +inp.value;
  });
  saveKey(KEY.XP_CONFIG, cfg);
  closeModal('modalXpLevels');
  renderXPTab();
  showToast('Đã lưu!');
}

function openEditActions() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  document.getElementById('xpActionsEditBody').innerHTML = cfg.actions.map((ac, i) => `
    <tr>
      <td>${escHtml(ac.label)}</td>
      <td>
        <input class="inline-input" type="number" data-i="${i}" value="${ac.xp}">
        <span style="font-size:12px;color:#888"> XP</span>
      </td>
    </tr>`).join('');
  openModal('modalXpActions');
}

function saveActions() {
  const cfg = loadKey(KEY.XP_CONFIG, DEFAULT_XP_CONFIG);
  document.querySelectorAll('#xpActionsEditBody input').forEach(inp => {
    cfg.actions[+inp.dataset.i].xp = +inp.value;
  });
  saveKey(KEY.XP_CONFIG, cfg);
  closeModal('modalXpActions');
  renderXPTab();
  showToast('Đã lưu!');
}

/* Tab 3 — Danh hiệu */
function renderBadgesTab() {
  const badges = loadKey(KEY.BADGES, DEFAULT_BADGES);

  document.getElementById('badgesList').innerHTML = badges.map((b, i) => `
    <tr>
      <td style="font-size:20px">${escHtml(b.icon)}</td>
      <td><strong>${escHtml(b.name)}</strong><div style="font-size:11px;color:#888">${escHtml(b.desc)}</div></td>
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

/* Tab 5 — Nhân vật (bản nháp: chỉnh trong CHAR_DRAFT, bấm "Lưu nhân vật" mới ghi) */
let CHAR_DRAFT = null, CHAR_SEL = 0;

function charDraft() {
  if (!CHAR_DRAFT) CHAR_DRAFT = JSON.parse(JSON.stringify(mmCharAll(true)));
  const n = mmCharLevels().length;
  CHAR_DRAFT.forEach(c => {                       // đủ một hình dạng cho mỗi Level
    while (c.stages.length < n) {
      const last = c.stages[c.stages.length - 1] || { anim: 'bounce', effect: 'flash' };
      c.stages.push({ name: 'Hình dạng ' + (c.stages.length + 1), image: null, anim: last.anim, effect: 'flash' });
    }
  });
  if (CHAR_SEL >= CHAR_DRAFT.length) CHAR_SEL = Math.max(0, CHAR_DRAFT.length - 1);
  return CHAR_DRAFT;
}

function renderCharactersTab() { renderCharList(); renderCharEditor(); }

function renderCharList() {
  const list = charDraft(), use = mmCharUsage();
  document.getElementById('charList').innerHTML = list.map((c, i) => `
    <div class="char-item${i === CHAR_SEL ? ' on' : ''}" data-id="${escHtml(c.id)}" onclick="selectCharacter(${i})">
      <div class="char-art">${mmCharArt(c, Math.min(1, c.stages.length - 1))}</div>
      <div><b>${escHtml(c.name)}</b><small>${escHtml(c.stages.map(s => s.name).join(' → '))}</small>
        ${use[c.id] ? `<small>${use[c.id]} học sinh đang dùng</small>` : ''}</div>
      <span class="badge ${c.active !== false ? 'badge-green' : 'badge-grey'}">${c.active !== false ? 'Bật' : 'Tắt'}</span>
    </div>`).join('') || '<div style="color:#aaa;font-size:12px">Chưa có nhân vật nào.</div>';
}

function renderCharEditor() {
  const list = charDraft(), c = list[CHAR_SEL], box = document.getElementById('charEditor');
  if (!c) { box.innerHTML = '<div class="char-edit-body" style="color:#aaa">Chọn hoặc thêm một nhân vật.</div>'; return; }
  const levels = mmCharLevels(), use = mmCharUsage()[c.id] || 0, lib = !!MM_CHAR_BUILTIN.find(s => s.id === c.id);
  const opts = (arr, v) => arr.map(a => `<option value="${a.id}"${a.id === v ? ' selected' : ''}>${escHtml(a.label)}</option>`).join('');
  box.innerHTML = `
    <div class="content-card-header"><span class="content-card-title">Chỉnh sửa: ${escHtml(c.name)}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" onclick="toggleCharacter(${CHAR_SEL})">${c.active !== false ? '🚫 Tắt nhân vật' : '✅ Bật nhân vật'}</button>
        ${use || list.length < 2 ? '' : `<button class="btn btn-sm btn-danger" onclick="deleteCharacter(${CHAR_SEL})">🗑️ Xóa</button>`}
      </div></div>
    <div class="char-edit-body">
      <div class="char-fields">
        <div><label>Tên dòng nhân vật *</label><input class="form-control" id="charName" style="min-width:150px" maxlength="20" value="${escHtml(c.name)}" oninput="charSet('name', this.value)"></div>
        <div><label>Mô tả ngắn (hiện ở màn chọn)</label><input class="form-control" id="charDesc" style="min-width:260px" maxlength="40" value="${escHtml(c.desc || '')}" oninput="charSet('desc', this.value)"></div>
        ${lib ? '' : `<div><label>Màu (khi chưa có ảnh)</label><input type="color" id="charColor" value="${escHtml(c.color || '#90A4AE')}" oninput="charSet('color', this.value)" style="height:38px;width:60px;border:1px solid #CFD8DC;border-radius:8px;background:#fff"></div>`}
      </div>
      <b style="font-size:13px">Hình và hoạt ảnh theo Level</b>
      <table class="char-lv"><thead><tr><th>Level</th><th>Tên hình dạng</th><th>Hình</th><th>Hoạt ảnh chờ</th><th>Hiệu ứng khi lên cấp</th></tr></thead><tbody>
      ${levels.map((l, i) => { const st = c.stages[i]; return `<tr>
        <td><b>${l.level}</b><div style="font-size:11px;color:#888">${escHtml(l.name)}</div></td>
        <td><input type="text" id="stName-${i}" style="width:130px" maxlength="20" value="${escHtml(st.name)}" oninput="charStageSet(${i}, 'name', this.value)"></td>
        <td style="white-space:nowrap"><div class="char-art">${mmCharArt(c, i)}</div>
          <button type="button" class="char-lnk" onclick="charStageSet(${i}, 'image', null, true)">${lib ? 'Hình vẽ sẵn' : 'Bỏ ảnh'}</button>
          <label class="char-lnk" style="margin:0">Tải ảnh<input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" style="display:none" id="stFile-${i}" onchange="charUpload(${i}, this)"></label></td>
        <td><select id="stAnim-${i}" onchange="charStageSet(${i}, 'anim', this.value)">${opts(MM_CHAR_ANIMS, st.anim)}</select></td>
        <td><select id="stEff-${i}" onchange="charStageSet(${i}, 'effect', this.value)">${opts(MM_CHAR_EFFECTS, st.effect)}</select></td></tr>`; }).join('')}
      </tbody></table>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Ảnh tải lên: PNG, SVG, WebP hoặc JPG, nền trong suốt, tối đa 300 KB. "${lib ? 'Hình vẽ sẵn' : 'Bỏ ảnh'}" đưa hình về dạng ${lib ? 'vẽ sẵn của dòng này' : 'mặc định (tô màu bên trên)'}.</div>
    </div>`;
}

function selectCharacter(i) { CHAR_SEL = i; renderCharactersTab(); }

function charSet(field, val) {
  const c = charDraft()[CHAR_SEL]; if (!c) return;
  c[field] = val;
  renderCharList();
  if (field === 'color') renderCharEditor();
}

function charStageSet(i, field, val, rerender) {
  const c = charDraft()[CHAR_SEL]; if (!c || !c.stages[i]) return;
  c.stages[i][field] = val;
  renderCharList();
  if (rerender || field === 'image') renderCharEditor();
}

function charUpload(i, input) {
  const f = input.files && input.files[0]; if (!f) return;
  if (!/^image\/(png|svg\+xml|webp|jpeg)$/.test(f.type)) { showToast('Chỉ nhận ảnh PNG, SVG, WebP hoặc JPG.', 'error'); input.value = ''; return; }
  if (f.size > MM_CHAR_MAX_IMG) { showToast('Ảnh quá lớn (tối đa 300 KB).', 'error'); input.value = ''; return; }
  const rd = new FileReader();
  rd.onload = () => charStageSet(i, 'image', String(rd.result), true);
  rd.readAsDataURL(f);
}

function addCharacter() {
  const list = charDraft(), n = mmCharLevels().length;
  list.push({
    id: 'c' + Date.now().toString(36), name: 'Nhân vật mới', desc: 'Bạn đồng hành mới', color: '#90A4AE', builtin: false, active: true,
    stages: Array.from({ length: n }, (_, i) => ({ name: 'Hình dạng ' + (i + 1), image: null, anim: MM_CHAR_DEFAULT_ANIMS[Math.min(i, 3)], effect: i === 0 ? 'none' : 'flash' })),
  });
  CHAR_SEL = list.length - 1;
  renderCharactersTab();
}

function toggleCharacter(i) {
  const c = charDraft()[i]; if (!c) return;
  c.active = c.active === false;
  renderCharactersTab();
}

function deleteCharacter(i) {
  const list = charDraft(), c = list[i]; if (!c) return;
  if ((mmCharUsage()[c.id] || 0) > 0) { showToast('Đã có học sinh dùng nhân vật này, không xóa được.', 'error'); return; }
  if (list.length < 2) { showToast('Cần giữ lại ít nhất một nhân vật.', 'error'); return; }
  if (!confirm('Xóa nhân vật "' + c.name + '"?')) return;
  list.splice(i, 1);
  CHAR_SEL = Math.max(0, i - 1);
  renderCharactersTab();
}

function saveCharacters() {
  const list = charDraft();
  if (list.some(c => !String(c.name || '').trim())) { showToast('Mỗi nhân vật cần có tên.', 'error'); return; }
  if (!list.some(c => c.active !== false)) { showToast('Cần bật ít nhất một nhân vật.', 'error'); return; }
  list.forEach(c => {
    c.name = c.name.trim(); c.desc = String(c.desc || '').trim();
    c.stages.forEach((s, i) => { s.name = String(s.name || '').trim() || c.name; });
  });
  if (!store.set(MM_KEYS.CHARACTERS, list)) { showToast('Không lưu được (bộ nhớ đầy). Thử ảnh nhỏ hơn.', 'error'); return; }
  CHAR_DRAFT = JSON.parse(JSON.stringify(list));
  renderCharactersTab();
  showToast('Đã lưu nhân vật!');
}

function resetCharacters() {
  const defIds = MM_CHAR_BUILTIN.map(s => s.id), use = mmCharUsage();
  if (Object.keys(use).some(id => defIds.indexOf(id) < 0)) { showToast('Có học sinh đang dùng nhân vật tự thêm, chưa thể khôi phục mặc định.', 'error'); return; }
  if (!confirm('Khôi phục 9 nhân vật mặc định? Các chỉnh sửa và nhân vật tự thêm sẽ mất.')) return;
  store.remove(MM_KEYS.CHARACTERS);
  CHAR_DRAFT = null; CHAR_SEL = 0;
  renderCharactersTab();
  showToast('Đã khôi phục nhân vật mặc định.');
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
  fillClassFilter('filterClass', accounts);
  fillReportStudentSelect(accounts);

  const foodSel = document.getElementById('filterFood');
  foodSel.innerHTML = '<option value="">— Tất cả nhóm —</option>' +
    mmFoodGroups(true).map(g => `<option value="${escHtml(g.id)}">${escHtml(g.icon)} ${escHtml(g.name)}</option>`).join('');
  document.getElementById('filterPlace').value = '';

  applyReportFilter();
}

/* Ô chọn học sinh của báo cáo: thu theo lớp đang chọn */
function fillReportStudentSelect(students) {
  const sel = document.getElementById('filterStudent'), cls = document.getElementById('filterClass').value;
  const keep = sel.value;
  sel.innerHTML = '<option value="">— Tất cả học sinh —</option>' +
    students.filter(a => reportClassMatch(a, cls)).map(a => `<option value="${escHtml(a.id)}">${escHtml(a.name)}</option>`).join('');
  sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
}
function reportClassMatch(acc, cls) { return !cls || (cls === '__none' ? !classOf(acc) : classOf(acc) === cls); }
function onReportClassChange() {
  fillReportStudentSelect(auth.getAccounts().filter(a => a.role === 'student'));
  applyReportFilter();
}

/* Các dòng nhật ký gom theo (học sinh, nhóm thực phẩm), mỗi nhóm xếp theo thời gian.
   Dòng cũ chưa gán được nhóm gom riêng theo nguyên liệu để không bị mất khỏi báo cáo. */
function fasChainsOf(fasLog) {
  const chains = {};
  fasLog.forEach(r => {
    const k = r.groupId ? r.studentId + '|' + r.groupId : r.studentId + '|x|' + (r.foodId || r.foodName);
    if (!chains[k]) chains[k] = { studentId: r.studentId, groupId: r.groupId || null, foodName: r.foodName, rows: [] };
    chains[k].rows.push(r);
  });
  Object.values(chains).forEach(c => c.rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))));
  return Object.values(chains);
}

function renderFasStats(fasLog, accounts) {
  const chains = fasChainsOf(fasLog.filter(r => r.groupId));

  // FAS trung bình: điểm lượt thử thật gần nhất của mỗi học sinh × nhóm ("Chưa thử" không tính)
  const latests = chains.map(c => mmGroupFas(c.rows)).filter(v => v !== null);
  const avgFas  = latests.length ? (latests.reduce((s, v) => s + v, 0) / latests.length).toFixed(2) : '—';
  const tryRate = fasLog.length ? Math.round((fasLog.filter(r => r.tryAgain).length / fasLog.length) * 100) : 0;

  // FAG của mỗi học sinh = tổng FAG của các nhóm (mỗi nhóm: FAS lượt thật cuối − lượt thật đầu, cả trường và nhà)
  const fagMap = {};
  chains.forEach(c => {
    if (!c.rows.some(r => r.score >= 1)) return;
    fagMap[c.studentId] = (fagMap[c.studentId] || 0) + (mmGroupFag(c.rows) || 0);
  });

  const fagByStudent = Object.entries(fagMap).map(([id, fag]) => {
    const acc = accounts.find(a => a.id === id);
    return { name: acc?.name || id, fag: +fag.toFixed(2) };
  }).sort((a, b) => b.fag - a.fag);

  document.getElementById('statAvgFas').textContent = avgFas;
  document.getElementById('statTryRate').textContent = tryRate + '%';
  document.getElementById('statTop3').innerHTML = fagByStudent.slice(0, 3)
    .map(s => `<div style="font-size:12px">🏆 ${escHtml(s.name)} <strong>+${s.fag}</strong></div>`).join('') || '—';
  document.getElementById('statBottom3').innerHTML = fagByStudent.slice(-3).reverse()
    .map(s => `<div style="font-size:12px">📌 ${escHtml(s.name)} <strong>${s.fag >= 0 ? '+' : ''}${s.fag}</strong></div>`).join('') || '—';
}

function applyReportFilter() {
  const fasLog   = loadKey(KEY.FAS_LOG, DEFAULT_FAS_LOG);
  const accounts = auth.getAccounts().filter(a => a.role === 'student');
  /* Lớp đang chọn: thống kê phía trên và bảng chi tiết chỉ tính học sinh của lớp đó */
  const cls = document.getElementById('filterClass').value;
  const ids = new Set(accounts.filter(a => reportClassMatch(a, cls)).map(a => a.id));
  const logC = cls ? fasLog.filter(r => ids.has(r.studentId)) : fasLog;
  renderFasStats(logC, accounts);
  renderFasTable(logC, accounts,
    document.getElementById('filterStudent').value,
    document.getElementById('filterFood').value,
    document.getElementById('filterPlace').value);
}

/* Một dòng bảng = một học sinh × một nhóm: chuỗi FAS các lượt (0 = Chưa thử), FAG, số lượt thử ở trường / ở nhà.
   Bộ lọc "Nơi thử" lọc các lượt trước khi tính chuỗi và FAG. */
/* Chuỗi FAS dạng khối: số điểm to, ngày (dd/mm) và giờ (hh:mm) nhỏ ngay dưới; rê chuột hiện đủ ngày giờ + nơi thử.
   Giờ hiển thị theo giờ của máy đang mở (giờ Việt Nam). */
function fasStampParts(ts) {
  const d = new Date(ts);
  if (!ts || isNaN(d)) return { d: '--/--', t: '--:--', full: '' };
  const z = n => String(n).padStart(2, '0');
  return { d: `${z(d.getDate())}/${z(d.getMonth() + 1)}`, t: `${z(d.getHours())}:${z(d.getMinutes())}`,
           full: `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}` };
}
function fasChainHtml(rows) {
  return '<div class="fas-chain">' + rows.map((r, k) => {
    const st = fasStampParts(r.timestamp);
    const place = r.place === 'home' ? 'Nhà' : 'Trường';
    return (k ? '<span class="fas-arr" aria-hidden="true">→</span>' : '') +
      `<div class="fas-step" title="${escHtml(st.full + ' · ' + place)}"><b>${escHtml(r.score)}</b><small>${st.d}<br>${st.t}</small></div>`;
  }).join('') + '</div>';
}

function renderFasTable(fasLog, accounts, stuFilter, groupFilter, placeFilter) {
  const placeOf = r => (r.place === 'home' ? 'home' : 'school');
  const rows = fasChainsOf(fasLog.filter(r => (!stuFilter || r.studentId === stuFilter) && (!placeFilter || placeOf(r) === placeFilter)))
    .filter(c => !groupFilter || c.groupId === groupFilter)
    .sort((a, b) => String(a.studentId).localeCompare(String(b.studentId)))
    .map(c => {
      const acc = accounts.find(a => a.id === c.studentId);
      const grp = c.groupId ? mmGroupById(c.groupId) : null;
      const label = grp ? `${escHtml(grp.icon)} ${escHtml(grp.name)}` : `<span style="color:var(--text-muted)">(chưa có nhóm) ${escHtml(c.foodName)}</span>`;
      const tried = mmTriedRows(c.rows);
      const fagN  = mmGroupFag(c.rows);
      const fagColor = fagN !== null && fagN > 0 ? 'color:var(--success)' : fagN !== null && fagN < 0 ? 'color:var(--error)' : '';
      const school = tried.filter(r => placeOf(r) === 'school').length;
      const home   = tried.filter(r => placeOf(r) === 'home').length;
      const tryCount = c.rows.filter(r => r.tryAgain).length;
      return `
      <tr>
        <td><strong>${escHtml(acc?.name || c.studentId)}</strong></td>
        <td style="white-space:nowrap">${classOf(acc) ? escHtml(classOf(acc)) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${label}</td>
        <td>${fasChainHtml(c.rows)}</td>
        <td style="text-align:center;font-weight:700;${fagColor}">${fagN !== null ? (fagN > 0 ? '+' : '') + fagN : '—'}</td>
        <td style="text-align:center">${school}</td>
        <td style="text-align:center">${home}</td>
        <td style="text-align:center">${tryCount}/${c.rows.length}</td>
      </tr>`;
    });

  document.getElementById('fasTableBody').innerHTML = rows.length
    ? rows.join('')
    : '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:24px">Không có dữ liệu</td></tr>';
}

/* Ô CSV: luôn đặt trong dấu nháy kép và nhân đôi dấu nháy bên trong */
function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function exportCSV() {
  const fasLog = loadKey(KEY.FAS_LOG, DEFAULT_FAS_LOG);
  const accounts = auth.getAccounts();
  const header = ['Học sinh', 'Lớp', 'Nhóm', 'Nguyên liệu', 'Món', 'Nơi thử', 'Lần thử của nhóm', 'FAS', 'TRY AGAIN', 'Thời gian'].map(csvCell).join(',');
  const rows = fasLog.map(r => {
    const acc = accounts.find(a => a.id === r.studentId);
    const grp = r.groupId ? mmGroupById(r.groupId) : null;
    return [acc?.name || r.studentId, classOf(acc), grp ? grp.name : '', r.foodName, r.dishName || '', r.place === 'home' ? 'Nhà' : 'Trường',
            r.attempt == null ? 'Chưa thử' : r.attempt, r.score, r.tryAgain ? 'Có' : 'Không', r.timestamp].map(csvCell).join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'fas_report.csv'; a.click();
  URL.revokeObjectURL(url);
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
/* Nút "↻ Làm mới": đọc lại dữ liệu từ localStorage và vẽ lại đúng tab/module đang xem */
function refreshTab(kind) {
  const fn = {
    accounts:  renderAccounts,
    menu:      renderMenuTab,
    ingredients: renderIngredientsTab,
    xp:        renderXPTab,
    badges:    renderBadgesTab,
    report:    renderReport,
  }[kind];
  if (!fn) return;
  fn();
  showToast('Đã làm mới');
}

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

/* XP, danh hiệu hoặc tài khoản đổi ở tab khác (học sinh, phụ huynh) → bảng tài khoản tự cập nhật */
window.addEventListener('storage', e => {
  const keys = [MM_KEYS.XP_LOG, MM_KEYS.XP_CONFIG, MM_KEYS.BADGES_LOG, MM_KEYS.BADGES, MM_KEYS.FAS_LOG, MM_KEYS.ACCOUNTS];
  if (e.key !== null && keys.indexOf(e.key) === -1) return;
  const panel = document.getElementById('module-accounts');
  if (panel && panel.classList.contains('active')) renderAccounts();
});
