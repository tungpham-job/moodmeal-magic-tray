/* ════════════════════════════════════════════════════════════
   Dữ liệu demo CẢ KHỐI (150 học sinh) — chỉ trang đăng nhập dùng. Bộ sinh dữ liệu và kịch bản Bảo Trúc: js/demo_plan.js (nạp trước file này).
   Nút "Đặt lại + dữ liệu cả khối" gọi mmSetDemoBigData() SAU mmSeedAll({force:true}) (= mặc định + demo cơ bản).
   Nguồn: demo/students.csv được ĐỌC TRỰC TIẾP khi bấm nút (mmBigLoadData, bằng fetch) → cần mở qua máy chủ web (không mở file://).
   Ngày tính theo TUẦN HIỆN TẠI của máy: thực đơn 4 tuần trước + các ngày đã qua của tuần này.
   Điểm FAS sinh theo "kiểu bé" bằng số ngẫu nhiên cố định hạt giống → mỗi lần đặt lại ra cùng một bộ dữ liệu.
   ════════════════════════════════════════════════════════════ */

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
  const reserved = DEFAULT_ACCOUNTS.concat(DEMO_ACCOUNTS).map(a => a.id);   // id đã dùng bởi tài khoản mặc định/demo
  const errs = [], students = [], seen = new Set();
  mmParseCsv(studentsTxt).slice(1).forEach((c, i) => {
    const [id, name, cls, pw, kieu] = [0, 1, 2, 3, 4].map(k => (c[k] || '').trim());
    const line = 'students.csv dòng ' + (i + 2);
    if (!(id && name && cls && pw)) { errs.push(line + ': thiếu id / họ_tên / lớp / mật_khẩu'); return; }
    if (seen.has(id)) { errs.push(line + ': id "' + id + '" bị trùng'); return; }
    if (reserved.indexOf(id) >= 0) { errs.push(line + ': id "' + id + '" trùng tài khoản có sẵn (admin, Bảo Trúc, phụ huynh)'); return; }
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

  /* Thực đơn: giữ thực đơn demo hiện có (tuần này/tuần sau + 4 tuần trước do mmSetDemoPlan) */
  let menu = store.get(K.MENU, []);
  if (!menu.some(m => String(m.id).indexOf('m-big-') === 0)) menu = menu.concat(mmBigPastMenu(monday));   // mmSetDemoPlan đã thêm sẵn thì không thêm lần nữa
  const past = menu.filter(m => String(m.id).indexOf('m-big-') === 0);
  const histMenu = menu.filter(m => m.date < today && m.date >= toLocalDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * MM_BIG_WEEKS_BACK)))
    .filter(m => m.ingredientId && m.groupId)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

  /* Tài khoản: giữ nguyên dữ liệu do mmSeedAll tạo (admin, Bảo Trúc, phụ huynh) rồi thêm học sinh từ CSV.
     Bảo Trúc đã có lịch sử FAS + kịch bản từ mmSetDemoPlan. */
  const accounts = store.get(K.ACCOUNTS, []);
  let fas = store.get(K.FAS_LOG, []);
  const avatars = ['🧒', '👦', '👧'];
  let nRows = 0;
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
