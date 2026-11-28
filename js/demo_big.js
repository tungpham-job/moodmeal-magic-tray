/* ════════════════════════════════════════════════════════════
   Dữ liệu demo CẢ KHỐI (150 học sinh) — chỉ trang đăng nhập dùng.
   Nút "Đặt lại + dữ liệu cả khối" gọi mmSetDemoBigData() SAU mmSeedAll({force:true}) (= mặc định + demo cơ bản).
   Nguồn: demo/students.csv được ĐỌC TRỰC TIẾP khi bấm nút (mmBigLoadData, bằng fetch) → cần mở qua máy chủ web (không mở file://).
   Ngày tính theo TUẦN HIỆN TẠI của máy: thực đơn 4 tuần trước + các ngày đã qua của tuần này.
   Điểm FAS sinh theo "kiểu bé" bằng số ngẫu nhiên cố định hạt giống → mỗi lần đặt lại ra cùng một bộ dữ liệu.
   ════════════════════════════════════════════════════════════ */

/* Số ngẫu nhiên có hạt giống (mulberry32) + băm chuỗi */
function mmRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MM_BIG_WEEKS_BACK = 4;          // số tuần ĐẦY ĐỦ trước tuần hiện tại
const MM_BIG_TRUC_ID = 'phambaotruc';   // tài khoản demo có sẵn trong seed: sinh FAS nhưng giữ XP
const MM_BIG_PER_DAY = 3;             // món mỗi ngày
const MM_BIG_GAP = 2;                 // một nhóm chỉ lặp lại sau ≥ 2 ngày
const MM_BIG_COOK = {                 // cách nấu để tên món tự nhiên hơn (nhóm → các kiểu)
  'g-thit': ['kho', 'xào', 'nướng'], 'g-hai-san': ['hấp', 'rim', 'chiên'], 'g-trung': ['chiên', 'luộc', 'ốp la'],
  'g-dau': ['hầm', 'sốt cà', 'kho'], 'g-rau': ['xào tỏi', 'luộc', 'nấu canh'], 'g-cu': ['xào', 'luộc', 'hầm'],
  'g-rau-qua': ['xào', 'luộc', 'nấu canh'], 'g-trai-cay': ['tráng miệng'], 'g-tinh-bot': [''],
};

/* Thực đơn T2–T6 của 4 tuần trước (xếp như nút "Xếp thực đơn tự động": 3 nhóm khác nhau/ngày, nhóm lặp lại sau ≥ 2 ngày) */
function mmBigPastMenu(monday) {
  const rnd = mmRng('menu-2027');
  const groups = mmFoodGroups().filter(g => g.active !== false).map(g => g.id);
  const ings = MM_DEFAULT_INGREDIENT_LIST;
  const lastDay = {}, seenIng = new Set(), out = [];
  let dayNo = 0;
  for (let w = -MM_BIG_WEEKS_BACK; w <= -1; w++) {
    for (let d = 0; d < 5; d++, dayNo++) {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + d);
      const date = toLocalDateStr(day);
      const cand = groups.filter(g => lastDay[g] === undefined || dayNo - lastDay[g] >= MM_BIG_GAP)
        .sort((a, b) => ((lastDay[a] === undefined ? -99 : lastDay[a]) - (lastDay[b] === undefined ? -99 : lastDay[b])) || rnd() - 0.5);
      cand.slice(0, MM_BIG_PER_DAY).forEach((g, i) => {
        const pool = ings.filter(x => MM_INGREDIENT_GROUP[x.id] === g);
        const fresh = pool.filter(x => !seenIng.has(x.id));
        const list = fresh.length ? fresh : pool;
        const ing = list[Math.floor(rnd() * list.length)];
        const cooks = MM_BIG_COOK[g] || [''];
        const how = cooks[Math.floor(rnd() * cooks.length)];
        const name = how ? (ing.name + ' ' + how) : ing.name;
        out.push({ id: 'm-big-' + date + '-' + i, date, name: name.charAt(0).toUpperCase() + name.slice(1),
          ingredientId: ing.id, groupId: g, icon: ing.icon, isNew: !seenIng.has(ing.id) });
        seenIng.add(ing.id);
        lastDay[g] = dayNo;
      });
    }
  }
  return out;
}

/* Hồ sơ "kiểu bé": điểm gốc, xác suất "Chưa thử", xác suất bỏ qua món */
const MM_BIG_TYPE = {
  de:   { base: 2.8, none: 0.03 },
  binh: { base: 2.1, none: 0.08 },
  ken:  { base: 1.4, none: 0.20 },
};
/* Độ "khó" của từng nhóm với trẻ (cộng vào điểm gốc) */
const MM_BIG_GROUP_BIAS = {
  'g-tinh-bot': 0.3, 'g-thit': 0.2, 'g-hai-san': 0, 'g-trung': 0.1, 'g-dau': -0.2,
  'g-rau': -0.5, 'g-cu': -0.3, 'g-rau-qua': -0.3, 'g-trai-cay': 0.4,
};

function mmBigGauss(rnd) { return (rnd() + rnd() + rnd() - 1.5) * 1.15; }   // gần chuẩn, độ lệch ≈ 1

/* Sinh nhật ký FAS + XP cho 1 học sinh; trả về {rows, xp} */
function mmBigStudent(stu, menu) {
  const [id, , , , kieu] = stu;
  const t = MM_BIG_TYPE[kieu] || MM_BIG_TYPE.binh;
  const rnd = mmRng('fas-' + id);
  const offset = (rnd() - 0.5) * 0.8;                 // mỗi bé lệch nhẹ so với kiểu chung
  const groupAff = {};
  Object.keys(MM_BIG_GROUP_BIAS).forEach(g => { groupAff[g] = MM_BIG_GROUP_BIAS[g] + (rnd() - 0.5) * 0.8; });
  const triedCount = {}, rows = [];
  let xp = 0, absentDate = null;

  menu.forEach((m, idx) => {
    if (m.date !== absentDate && (idx === 0 || m.date !== menu[idx - 1].date)) absentDate = rnd() < 0.15 ? m.date : null;   // vắng cả ngày
    if (m.date === absentDate) return;
    if (rnd() < 0.2) return;                                              // không đánh giá món này
    const g = m.groupId, k = triedCount[g] || 0;
    let score;
    if (rnd() < t.none) score = 0;
    else {
      const mu = t.base + offset + groupAff[g] + 0.2 * Math.min(k, 5);
      score = Math.max(1, Math.min(4, Math.round(mu + mmBigGauss(rnd) * 0.7)));
    }
    const ing = MM_DEFAULT_INGREDIENT_LIST.find(x => x.id === m.ingredientId);
    const min = 5 + Math.floor(rnd() * 40);
    const row = {
      studentId: id, foodId: m.ingredientId, foodName: ing ? ing.name : m.name, dishName: m.name, groupId: g, place: 'school',
      attempt: score >= 1 ? k + 1 : null, score, rating: score, tryAgain: score <= 2 ? rnd() < 0.7 : false,
      timestamp: m.date + 'T12:' + ('0' + min).slice(-2) + ':00',
    };
    if (score === 0) row.notTried = true;
    if (score >= 1) { if (k === 0) xp += 15; triedCount[g] = k + 1; }
    xp += 10;                                                            // emoji_rate (kể cả "Chưa thử")
    rows.push(row);
  });
  return { rows, xp };
}

/* Đọc CSV (hỗ trợ BOM, dấu ngoặc kép, dấu phẩy trong ô) → mảng các dòng */
function mmParseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

/* Đọc và kiểm tra demo/students.csv. Trả về {students, source}; ném lỗi nêu rõ dòng sai. */
async function mmBigLoadData() {
  let studentsTxt;
  try {
    const r = await fetch('demo/students.csv', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    studentsTxt = await r.text();
  } catch (e) {
    throw new Error('Không đọc được demo/students.csv (' + e.message + ').\nHãy mở trang qua máy chủ web (http://…), không mở file trực tiếp (file://).');
  }
  const errs = [], students = [], seen = new Set();
  mmParseCsv(studentsTxt).slice(1).forEach((c, i) => {
    const [id, name, cls, pw, kieu] = [0, 1, 2, 3, 4].map(k => (c[k] || '').trim());
    const line = 'students.csv dòng ' + (i + 2);
    if (!(id && name && cls && pw)) { errs.push(line + ': thiếu id / họ_tên / lớp / mật_khẩu'); return; }
    if (seen.has(id)) { errs.push(line + ': id "' + id + '" bị trùng'); return; }
    if (['de', 'binh', 'ken'].indexOf(kieu.toLowerCase()) < 0) { errs.push(line + ': kiểu phải là de, binh hoặc ken (đang là "' + kieu + '")'); return; }
    seen.add(id);
    students.push([id, name, cls.replace(/\s+/g, '').toUpperCase(), pw, kieu.toLowerCase()]);
  });
  if (!students.length) errs.push('students.csv không có học sinh nào');
  if (errs.length) throw new Error(errs.slice(0, 8).join('\n') + (errs.length > 8 ? '\n… và ' + (errs.length - 8) + ' lỗi khác' : ''));
  return { students, source: 'demo/students.csv' };
}

/* Ghi dữ liệu cả khối vào localStorage (sau mmSeedAll({force:true}) = mmSetDefaultData + mmSetDemoData). Trả về thống kê hoặc ném lỗi. */
function mmSetDemoBigData(data) {
  const STUDENTS = data.students;
  const K = MM_KEYS;
  const real = new (window.MM_RealDate || Date)();
  const monday = new Date(real.getFullYear(), real.getMonth(), real.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const today = toLocalDateStr(real);

  /* Thực đơn: giữ thực đơn demo hiện có (tuần này/tuần sau), thêm 4 tuần trước */
  const past = mmBigPastMenu(monday);
  const menu = store.get(K.MENU, []).concat(past);
  const histMenu = menu.filter(m => m.date < today && m.date >= toLocalDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * MM_BIG_WEEKS_BACK)))
    .filter(m => m.ingredientId && m.groupId)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  /* Tài khoản: giữ nguyên dữ liệu do mmSeedAll tạo (admin, Bảo Trúc, phụ huynh) rồi thêm học sinh từ CSV.
     Bảo Trúc (XP 605 cố định trong seed) cũng được sinh lịch sử FAS 4–5 tuần như các bạn khác (kiểu bé "binh"). */
  const accounts = store.get(K.ACCOUNTS, []);
  let fas = store.get(K.FAS_LOG, []);
  const avatars = ['🧒', '👦', '👧'];
  let nRows = 0;
  const truc = accounts.find(a => a.id === MM_BIG_TRUC_ID);
  if (truc) { const r0 = mmBigStudent([truc.id, truc.name, truc.className, truc.pass, 'binh'], histMenu); fas = fas.concat(r0.rows); nRows += r0.rows.length; }
  STUDENTS.forEach((stu, i) => {
    const [id, name, cls, pass] = stu;
    const res = mmBigStudent(stu, histMenu);
    accounts.push({ id, pass, role: 'student', name, linkedId: null, avatar: avatars[i % 3], className: cls, xp: res.xp });
    fas = fas.concat(res.rows);
    nRows += res.rows.length;
  });
  fas.sort((a, b) => a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0);

  if (!store.set(K.MENU, menu) || !store.set(K.ACCOUNTS, accounts) || !store.set(K.FAS_LOG, fas))
    throw new Error('Trình duyệt hết dung lượng localStorage — giảm số học sinh hoặc số tuần.');
  return { students: STUDENTS.length, source: data.source, menuDays: new Set(past.map(m => m.date)).size, fasRows: nRows,
    chars: JSON.stringify(fas).length + JSON.stringify(accounts).length + JSON.stringify(menu).length };
}
