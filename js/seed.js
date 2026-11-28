/* ═══════════════════════════════════════════════════════════════
   seed.js — NGUỒN DUY NHẤT của dữ liệu mặc định và dữ liệu mẫu (demo)

   Thứ tự nạp script trên MỌI trang (bắt buộc):
     config.js → seed.js → utils.js → store.js → auth.js
   (seed.js chỉ khai báo dữ liệu và hàm; mmSeedAll() được auth.js gọi sau khi store.js sẵn sàng.)

   Quy ước:
   • File này chỉ CHỨA dữ liệu và hàm ghi dữ liệu. Các file khác không tự định nghĩa lại
     bất kỳ giá trị mặc định nào; khi cần đọc thì lấy từ localStorage, và dùng DEFAULT_*
     làm giá trị dự phòng.
   • Khi chạy thật, BGH sửa cấu hình thì giá trị mới nằm trong localStorage; seed chỉ được
     ghi khi khóa chưa tồn tại (lần mở đầu) hoặc khi bấm "Đặt lại dữ liệu demo".
   • Muốn thêm dữ liệu mẫu mới: thêm hằng số ở đây + một dòng trong mmSeedPlan() bên dưới.
   • Đổi CẤU TRÚC dữ liệu: tăng MM_SCHEMA_VERSION và thêm hàm nâng cấp vào MM_MIGRATIONS.
   • Cờ MM_CONFIG.DEMO_MODE (js/config.js): false → chỉ tạo mặc định hệ thống + tài khoản admin.

   PHẦN A — Mặc định hệ thống (cấu hình ban đầu)
   PHẦN B — Dữ liệu mẫu cho demo
   PHẦN C — Hàm khởi tạo mmSeedAll()
═══════════════════════════════════════════════════════════════ */

/* ═════════════ PHẦN A — MẶC ĐỊNH HỆ THỐNG ═════════════ */

/* ── Seed: XP config ─────────────────────────── */
const DEFAULT_XP_CONFIG = {
  levels: [
    { level: 1, name: 'Người mới',          xpFrom: 0,   xpTo: 99 },
    { level: 2, name: 'Người khám phá',      xpFrom: 100, xpTo: 299 },
    { level: 3, name: 'Nhà thám hiểm',       xpFrom: 300, xpTo: 599 },
    { level: 4, name: 'Đại sứ dinh dưỡng',   xpFrom: 600, xpTo: 9999 },
  ],
  actions: [
    { id: 'first_try',       label: 'Thử lần đầu của nhóm thực phẩm', xp: 15 },
    { id: 'emoji_rate',      label: 'Đánh giá emoji',                 xp: 10 },
    { id: 'parent_confirm',  label: 'Ba mẹ nấu món thử lại',          xp: 20 },
  ]
};

/* ── Seed: Badges ────────────────────────────── */
const DEFAULT_BADGES = [
  { id: 'b01', icon: '🌱', name: 'Người mới',     desc: 'Đăng nhập lần đầu',                    auto: true,  active: true },
  { id: 'b02', icon: '🥬', name: 'Bạn Rau',       desc: 'FAS nhóm Rau ≥ 3.0',                  auto: true,  active: true },
  { id: 'b03', icon: '🥦', name: 'Người xanh',    desc: 'Thử ≥ 3 nguyên liệu nhóm Rau',        auto: true,  active: true },
  { id: 'b05', icon: '⭐', name: 'Sao dinh dưỡng', desc: 'FAG tổng ≥ 5.0',                     auto: false, active: true },
];

/* ── Seed: Nhóm thực phẩm (mỗi nhóm = 1 hành tinh) ───────────
   FAS / FAG được tính THEO NHÓM: các nguyên liệu cùng nhóm là một đối tượng.
   BGH thêm/sửa/ẩn ở Thiết lập → Nguyên liệu; nhóm đang có nguyên liệu thì không xóa được. */
const DEFAULT_FOOD_GROUPS = [
  { id:'g-tinh-bot', name:'Tinh bột', icon:'🍚', order:1, active:true },
  { id:'g-thit',     name:'Thịt',     icon:'🥩', order:2, active:true },
  { id:'g-hai-san',  name:'Hải sản',  icon:'🐟', order:3, active:true },
  { id:'g-trung',    name:'Trứng',    icon:'🥚', order:4, active:true },
  { id:'g-dau',      name:'Đậu',      icon:'🫘', order:5, active:true },
  { id:'g-rau',      name:'Rau',      icon:'🥬', order:6, active:true },
  { id:'g-cu',       name:'Củ',       icon:'🥕', order:7, active:true },
  { id:'g-rau-qua',  name:'Rau quả',  icon:'🍆', order:8, active:true },
  { id:'g-trai-cay', name:'Trái cây', icon:'🍌', order:9, active:true },
];

/* Nhóm của từng nguyên liệu mặc định (nguyên liệu BGH tự thêm sau sẽ chọn nhóm trong biểu mẫu). */
const MM_INGREDIENT_GROUP = {
  'com-trang':'g-tinh-bot', 'bun':'g-tinh-bot', 'pho':'g-tinh-bot', 'mi':'g-tinh-bot', 'banh-mi':'g-tinh-bot',
  'thit-heo':'g-thit', 'thit-ga':'g-thit', 'thit-bo':'g-thit',
  'ca':'g-hai-san', 'tom':'g-hai-san', 'muc':'g-hai-san', 'cua':'g-hai-san',
  'trung':'g-trung', 'trung-vit':'g-trung', 'trung-cut':'g-trung',
  'dau-hu':'g-dau', 'dau-xanh':'g-dau', 'dau-den':'g-dau',
  'rau-den':'g-rau', 'rau-lang':'g-rau', 'rau-muong':'g-rau', 'bap-cai':'g-rau', 'bong-cai':'g-rau',
  'khoai-lang':'g-cu', 'khoai-tay':'g-cu', 'ca-rot':'g-cu',
  'bi':'g-rau-qua', 'bau':'g-rau-qua', 'ca-tim':'g-rau-qua', 'ca-chua':'g-rau-qua',
  'chuoi':'g-trai-cay', 'cam':'g-trai-cay', 'tao':'g-trai-cay', 'dua-hau':'g-trai-cay',
};

/* Nguyên liệu mặc định, theo thứ tự nhóm. `id` cố định, dùng làm foodId của nhật ký FAS. */
const MM_DEFAULT_INGREDIENT_LIST = [
  { id:'com-trang', name:'Cơm trắng',     icon:'🍚' }, { id:'bun',        name:'Bún',          icon:'🍜' },
  { id:'pho',       name:'Phở',           icon:'🍜' }, { id:'mi',         name:'Mì',           icon:'🍝' },
  { id:'banh-mi',   name:'Bánh mì',       icon:'🥖' },
  { id:'thit-heo',  name:'Thịt heo',      icon:'🥩' }, { id:'thit-ga',    name:'Thịt gà',      icon:'🍗' },
  { id:'thit-bo',   name:'Thịt bò',       icon:'🥩' },
  { id:'ca',        name:'Cá',            icon:'🐟' }, { id:'tom',        name:'Tôm',          icon:'🦐' },
  { id:'muc',       name:'Mực',           icon:'🦑' }, { id:'cua',        name:'Cua',          icon:'🦀' },
  { id:'trung',     name:'Trứng',         icon:'🥚' }, { id:'trung-vit',  name:'Trứng vịt',    icon:'🥚' },
  { id:'trung-cut', name:'Trứng cút',     icon:'🥚' },
  { id:'dau-hu',    name:'Đậu hũ',        icon:'🫘' }, { id:'dau-xanh',   name:'Đậu xanh',     icon:'🫘' },
  { id:'dau-den',   name:'Đậu đen',       icon:'🫘' },
  { id:'rau-den',   name:'Rau dền',       icon:'🥬' }, { id:'rau-lang',   name:'Rau lang',     icon:'🥬' },
  { id:'rau-muong', name:'Rau muống',     icon:'🥬' }, { id:'bap-cai',    name:'Bắp cải',      icon:'🥬' },
  { id:'bong-cai',  name:'Bông cải xanh', icon:'🥦' },
  { id:'khoai-lang',name:'Khoai lang',    icon:'🍠' }, { id:'khoai-tay',  name:'Khoai tây',    icon:'🥔' },
  { id:'ca-rot',    name:'Cà rốt',        icon:'🥕' },
  { id:'bi',        name:'Bí',            icon:'🎃' }, { id:'bau',        name:'Bầu',          icon:'🥒' },
  { id:'ca-tim',    name:'Cà tím',        icon:'🍆' }, { id:'ca-chua',    name:'Cà chua',      icon:'🍅' },
  { id:'chuoi',     name:'Chuối',         icon:'🍌' }, { id:'cam',        name:'Cam',          icon:'🍊' },
  { id:'tao',       name:'Táo',           icon:'🍎' }, { id:'dua-hau',    name:'Dưa hấu',      icon:'🍉' },
].map(x => ({ id:x.id, name:x.name, icon:x.icon, groupId:MM_INGREDIENT_GROUP[x.id], active:true }));

const DEFAULT_INGREDIENTS = MM_DEFAULT_INGREDIENT_LIST;

/* Nguyên liệu bổ sung của schema v4 (migration v4 thêm vào dữ liệu cũ nếu còn thiếu). */
const MM_EXTRA_INGREDIENTS = MM_DEFAULT_INGREDIENT_LIST.filter(x =>
  ['com-trang','thit-heo','trung','ca','rau-muong','ca-rot','ca-chua','bau','bong-cai','chuoi'].indexOf(x.id) < 0);

/* ═════════════ PHẦN B — DỮ LIỆU MẪU (DEMO) ═════════════ */

/* ── Seed: Tài khoản mẫu (Demo) ──────────────── */
/*
   Production: thay bằng API call đến api.gs
   Demo: dữ liệu lưu localStorage key "mm_accounts"
   Schema mỗi account:
   {
     id:       string   — mã đăng nhập
     pass:     string   — mật khẩu (plain text cho demo)
     role:     'admin' | 'student' | 'parent'
     name:     string   — tên hiển thị
     linkedId: string | null — student↔parent link
     avatar:   string   — emoji đại diện
   }
*/
const SEED_ACCOUNTS = [
  {
    id: 'admin',
    pass: 'admin2026',
    role: 'admin',
    name: 'Ban Giám Hiệu',
    linkedId: null,
    avatar: '🏫'
  },
  {
    id: 'phambaotruc',
    pass: 'hs001',
    role: 'student',
    name: 'Phạm Bảo Trúc',
    linkedId: 'phbaotruc',
    avatar: '🧒',
    characterId: 'gao',
    className: '5A12',
    xp: 605
  },
  {
    id: 'phbaotruc',
    pass: 'ph001',
    role: 'parent',
    name: 'Phụ huynh Bảo Trúc',
    linkedId: 'phambaotruc',
    avatar: '👩'
  },
];

/* XP nền của học sinh mẫu: các lần cộng XP sau này cộng dồn lên số này */
const DEFAULT_XP_BASE = 185;

/* ── Seed: Daily menu ────────────────────────── */
const DEFAULT_MENU = [
  { id:'m01', date:'2026-10-20', name:'Cơm trắng',        ingredientId:'com-trang', groupId:'g-tinh-bot', isNew: false },
  { id:'m02', date:'2026-10-20', name:'Thịt kho trứng',   ingredientId:'thit-heo', groupId:'g-thit', isNew: false },
  { id:'m03', date:'2026-10-20', name:'Rau muống xào tỏi',ingredientId:'rau-muong', groupId:'g-rau', isNew: false },
  { id:'m04', date:'2026-10-20', name:'Canh chua',         ingredientId:'ca-chua', groupId:'g-rau-qua', isNew: false },
  { id:'m05', date:'2026-10-21', name:'Cơm trắng',         ingredientId:'com-trang', groupId:'g-tinh-bot', isNew: false },
  { id:'m06', date:'2026-10-21', name:'Cá kho tộ',         ingredientId:'ca', groupId:'g-hai-san', isNew: false },
  { id:'m07', date:'2026-10-21', name:'Bông cải xanh xào', ingredientId:'bong-cai', groupId:'g-rau', isNew: true  },
  { id:'m08', date:'2026-10-21', name:'Canh bầu',          ingredientId:'bau', groupId:'g-rau-qua', isNew: true  },
];

/* Thực đơn demo cho tuần này và tuần sau (thứ Hai–thứ Sáu, theo ngày thật của máy):
   mỗi ngày 3 món thuộc 3 nhóm khác nhau, trong đó luôn có 1 món nhóm Rau (để thử chấm điểm FAS); món có cờ `n` là món "MỚI" của ngày đó.
   Nhóm lấy từ nguyên liệu (MM_INGREDIENT_GROUP). 10 ngày = 2 tuần × 5 ngày. */
const MM_DEMO_WEEKS = [
  [ // Thứ Hai
    ['Thịt kho tàu','thit-heo'], ['Canh rau dền','rau-den','n'], ['Chuối tráng miệng','chuoi'] ],
  [ // Thứ Ba
    ['Cá kho tộ','ca'], ['Rau muống xào tỏi','rau-muong'], ['Đậu hũ sốt cà','dau-hu','n'] ],
  [ // Thứ Tư
    ['Tôm rim','tom','n'], ['Bắp cải luộc','bap-cai'], ['Canh bầu','bau'] ],
  [ // Thứ Năm
    ['Gà rang gừng','thit-ga'], ['Bông cải xanh xào','bong-cai','n'], ['Cam tráng miệng','cam'] ],
  [ // Thứ Sáu
    ['Cơm trắng','com-trang'], ['Rau lang xào','rau-lang','n'], ['Trứng ốp la','trung'] ],
  [ // Tuần sau: Thứ Hai
    ['Bún thịt nướng','bun'], ['Thịt bò xào hành','thit-bo','n'], ['Rau muống luộc','rau-muong'] ],
  [ // Thứ Ba
    ['Mực xào','muc','n'], ['Rau lang luộc','rau-lang'], ['Chè đậu xanh','dau-xanh'] ],
  [ // Thứ Tư
    ['Cơm trắng','com-trang'], ['Trứng cút kho','trung-cut','n'], ['Bắp cải xào','bap-cai'] ],
  [ // Thứ Năm
    ['Bánh mì ốp la phô mai','banh-mi'], ['Bông cải xanh hấp','bong-cai','n'], ['Táo tráng miệng','tao'] ],
  [ // Thứ Sáu
    ['Mì xào rau củ','mi'], ['Đậu đen hầm','dau-den','n'], ['Rau dền luộc','rau-den'] ],
];

/* Thực đơn mẫu + thực đơn demo 2 tuần + món "Trứng chiên" (món MỚI) cho ngày hôm nay.
   Dùng ngày thật của máy: đặt lại cũng đưa ngày giả lập về ngày thật. Hôm nay luôn có đúng
   3 món (có 1 món Rau): "Trứng chiên" + 2 món khác nhóm (lấy từ thực đơn của hôm nay, ngày cuối tuần lấy của thứ Hai). */
function mmDemoMenuWithToday() {
  const realNow = new (window.MM_RealDate || Date)();
  const today = toLocalDateStr(realNow);
  const ing = id => MM_DEFAULT_INGREDIENT_LIST.find(x => x.id === id);
  const mk = (date, d, i) => {
    const x = ing(d[1]);
    return { id: 'm-demo-' + date + '-' + i, date, name: d[0], ingredientId: x.id, groupId: x.groupId, icon: x.icon, isNew: d[2] === 'n' };
  };
  /* thứ Hai của tuần này */
  const mon = new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate());
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const out = DEFAULT_MENU.slice();
  MM_DEMO_WEEKS.forEach((dishes, k) => {
    const day = new Date(mon); day.setDate(mon.getDate() + Math.floor(k / 5) * 7 + (k % 5));
    const date = toLocalDateStr(day);
    if (date === today) return;                       // hôm nay xử lý riêng bên dưới
    dishes.forEach((d, i) => out.push(mk(date, d, i)));
  });
  const idx = (realNow.getDay() + 6) % 7;               // 0 = thứ Hai … 6 = Chủ nhật
  const noEgg = MM_DEMO_WEEKS[idx < 5 ? idx : 0].filter(d => MM_INGREDIENT_GROUP[d[1]] !== 'g-trung');
  const base = noEgg.slice(0, 2);
  if (!base.some(d => MM_INGREDIENT_GROUP[d[1]] === 'g-rau')) base[1] = noEgg.find(d => MM_INGREDIENT_GROUP[d[1]] === 'g-rau');   // luôn có 1 món Rau
  /* "Trứng chiên" (món MỚI) đứng đầu danh sách của hôm nay, rồi 2 món nền không "MỚI" */
  out.push({ id: 'm-demo-trung-chien', date: today, name: 'Trứng chiên', ingredientId: 'trung', groupId: 'g-trung',
    icon: '🥚', isNew: true });
  base.forEach((d, i) => out.push(mk(today, [d[0], d[1]], i)));
  return out;
}

/* ── Seed: FAS log (demo) ────────────────────── */
const DEFAULT_FAS_LOG = [
  { studentId:'phambaotruc', foodId:'bong-cai', groupId:'g-rau', place:'school', foodName:'Bông cải xanh', attempt:1, score:1, rating:1, tryAgain:true,  timestamp:'2026-10-07T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', groupId:'g-rau', place:'school', foodName:'Bông cải xanh', attempt:2, score:2, rating:2, tryAgain:true,  timestamp:'2026-10-09T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', groupId:'g-rau', place:'school', foodName:'Bông cải xanh', attempt:3, score:2, rating:2, tryAgain:true,  timestamp:'2026-10-14T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', groupId:'g-rau', place:'school', foodName:'Bông cải xanh', attempt:4, score:3, rating:3, tryAgain:false, timestamp:'2026-10-21T12:00:00' },
];

/* ═════════════ PHẦN C — KHỞI TẠO ═════════════ */

/* Phiên bản cấu trúc dữ liệu trong localStorage (khóa mm_schema_version).
   v1 = thực đơn có ingredientId, FAS có foodId + thang 4/3/2/1.
   v2 = nhóm dinh dưỡng đổi thành Tinh bột · Đạm · Rau củ · Trái cây (bỏ "Canh"),
        nguyên liệu có khẩu phần + Carbs/Protein/Fat + alwaysUnlocked, thêm bảng chuẩn
        mm_nutrition_table, bỏ cột "NL mở khóa" của Level.
   v3 = khay đã gửi: ô nhóm cũ 'canh' đổi thành ô Trái cây 🍌 Chuối (chức năng khay đã bỏ ở v5).
   v4 = nhóm thực phẩm (mm_food_groups): nguyên liệu và thực đơn có groupId; nhật ký FAS có groupId + place ('school'|'home'),
        lượt thử (attempt) đánh số lại THEO NHÓM của từng học sinh (lượt cũ giữ ở legacyAttempt); điểm 0 = "Chưa thử" (attempt = null).
   v5 = bỏ khay cơm: xóa mm_tray_log, mm_nutrition_table, mm_score_formula, mm_grading_criteria; bỏ các trường dinh dưỡng và hành tinh
        cũ của nguyên liệu/thực đơn/FAS; XP bỏ try_again và send_tray; bỏ huy hiệu b04.
   Dữ liệu cũ chưa có số phiên bản được coi là v0; các hàm nâng cấp chạy lần lượt tới bản hiện tại.
   Muốn đổi cấu trúc: tăng số này và thêm MM_MIGRATIONS[n] = function () {…}
   — hàm nâng dữ liệu từ bản n-1 lên bản n. */
const MM_SCHEMA_VERSION = 6;
const MM_MIGRATIONS = {
  /* v2 và v3 (nhóm dinh dưỡng cũ, khay đã gửi) đã bỏ cùng chức năng khay cơm: dữ liệu cũ đi thẳng qua v4 và v5. */
  2: function () {},
  3: function () {},
  4: function () {
    const K = MM_KEYS;
    if (!store.has(K.FOOD_GROUPS)) store.set(K.FOOD_GROUPS, DEFAULT_FOOD_GROUPS);

    const bd = store.get(K.BADGES, null);
    if (Array.isArray(bd)) {
      bd.forEach(x => {
        if (x.id === 'b02') Object.assign(x, { icon: '🥬', name: 'Bạn Rau', desc: 'FAS nhóm Rau ≥ 3.0' });
        if (x.id === 'b03') Object.assign(x, { desc: 'Thử ≥ 3 nguyên liệu nhóm Rau' });
      });
      store.set(K.BADGES, bd);
    }

    const LEGACY_GROUP = { 'Tinh bột': 'g-tinh-bot', 'Trái cây': 'g-trai-cay' };
    let ings = store.get(K.INGREDIENTS, null);
    if (Array.isArray(ings)) {
      ings.forEach(g => {
        if (!g.groupId) g.groupId = MM_INGREDIENT_GROUP[g.id] || LEGACY_GROUP[g.group] || null;
      });
      MM_EXTRA_INGREDIENTS.forEach(x => { if (!ings.some(g => g.id === x.id)) ings.push(Object.assign({}, x)); });
      store.set(K.INGREDIENTS, ings);
    } else ings = [];
    const groupOfIng = id => { const g = ings.find(x => x.id === id); return (g && g.groupId) || MM_INGREDIENT_GROUP[id] || null; };

    const menu = store.get(K.MENU, null);
    if (Array.isArray(menu)) {
      menu.forEach(m => { if (!m.groupId) m.groupId = groupOfIng(m.ingredientId); });
      store.set(K.MENU, menu);
    }

    const log = store.get(K.FAS_LOG, null);
    if (Array.isArray(log)) {
      log.forEach(r => {
        if (!r.groupId) r.groupId = groupOfIng(r.foodId);
        if (!r.place) r.place = 'school';
        if (r.legacyAttempt === undefined) r.legacyAttempt = r.attempt;
      });
      const chains = {};
      log.forEach(r => {
        if (!r.groupId || !(r.score >= 1)) return;
        (chains[r.studentId + '|' + r.groupId] = chains[r.studentId + '|' + r.groupId] || []).push(r);
      });
      Object.keys(chains).forEach(k => {
        chains[k].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
        chains[k].forEach((r, i) => { r.attempt = i + 1; });
      });
      log.forEach(r => { if (r.groupId && r.score === 0) r.attempt = null; });
      store.set(K.FAS_LOG, log);
    }
  },
  5: function () {
    const K = MM_KEYS;
    // Bỏ khay cơm, bảng dinh dưỡng, công thức điểm, tiêu chí chấm
    ['mm_nutrition_table', 'mm_score_formula', 'mm_tray_log', 'mm_grading_criteria'].forEach(k => store.remove(k));

    const ings = store.get(K.INGREDIENTS, null);
    if (Array.isArray(ings)) {
      ings.forEach(g => { ['group', 'planet', 'portion', 'carbs', 'protein', 'fat', 'alwaysUnlocked'].forEach(f => { delete g[f]; }); });
      store.set(K.INGREDIENTS, ings);
    }
    const menu = store.get(K.MENU, null);
    if (Array.isArray(menu)) {
      menu.forEach(m => { delete m.group; delete m.planet; });
      store.set(K.MENU, menu);
    }
    const log = store.get(K.FAS_LOG, null);
    if (Array.isArray(log)) {
      log.forEach(r => { delete r.planet; });
      store.set(K.FAS_LOG, log);
    }
    // XP: bỏ hành động try_again và send_tray; đổi tên hành động còn lại (sổ XP cũ giữ nguyên)
    const cfg = store.get(K.XP_CONFIG, null);
    if (cfg && Array.isArray(cfg.actions)) {
      cfg.actions = cfg.actions.filter(a => a.id !== 'try_again' && a.id !== 'send_tray');
      cfg.actions.forEach(a => {
        if (a.id === 'first_try') a.label = 'Thử lần đầu của nhóm thực phẩm';
        if (a.id === 'parent_confirm') a.label = 'Ba mẹ nấu món thử lại';
      });
      store.set(K.XP_CONFIG, cfg);
    }
    // Huy hiệu b04 (Đại bếp nhí) gắn với khay cơm → bỏ
    const bd = store.get(K.BADGES, null);
    if (Array.isArray(bd)) store.set(K.BADGES, bd.filter(x => x.id !== 'b04'));
  },
  /* v6 = nhân vật đồng hành do BGH gán ở Danh sách tài khoản (account.characterId); nhân vật học sinh đã tự chọn trước đó được chuyển sang tài khoản */
  6: function () {
    const K = MM_KEYS;
    const state = store.get(K.CHAR_STATE, null);
    if (!state || typeof state !== 'object') return;
    const accs = store.get(K.ACCOUNTS, null);
    if (Array.isArray(accs)) {
      accs.forEach(a => { if (a.role === 'student' && !a.characterId && state[a.id] && state[a.id].charId) a.characterId = state[a.id].charId; });
      store.set(K.ACCOUNTS, accs);
    }
    Object.keys(state).forEach(id => { if (state[id]) delete state[id].charId; });
    store.set(K.CHAR_STATE, state);
  },
};

/* Kế hoạch dữ liệu khởi tạo: [khóa, hàm trả về giá trị].
   DEMO_MODE = false → chỉ phần mặc định hệ thống + tài khoản admin, danh sách còn lại để trống. */
function mmSeedPlan() {
  const K = MM_KEYS;
  const demo = !(typeof MM_CONFIG !== 'undefined' && MM_CONFIG.DEMO_MODE === false);
  return [
    [K.XP_CONFIG,   () => DEFAULT_XP_CONFIG],
    [K.FOOD_GROUPS, () => DEFAULT_FOOD_GROUPS],
    [K.BADGES,      () => DEFAULT_BADGES],
    [K.ACCOUNTS,    () => (demo ? SEED_ACCOUNTS : SEED_ACCOUNTS.filter(a => a.role === 'admin'))],
    [K.FAS_LOG,     () => (demo ? DEFAULT_FAS_LOG : [])],
  ];
}

/* HÀM DUY NHẤT thiết lập dữ liệu mặc định/mẫu (gọi từ js/auth.js trên mọi trang).
   • mmSeedAll()              — ghi các khóa còn THIẾU, rồi nâng cấp cấu trúc nếu cần.
   • mmSeedAll({force:true})  — ghi lại TẤT CẢ (nút "Đặt lại dữ liệu demo").
   Nguyên liệu và thực đơn đi cặp: thiếu một trong hai thì ghi lại cả hai
   (demo: kèm món "Trứng chiên" cho hôm nay). */
function mmSeedAll(opts) {
  const force = !!(opts && opts.force);
  const K = MM_KEYS;
  const demo = !(typeof MM_CONFIG !== 'undefined' && MM_CONFIG.DEMO_MODE === false);
  try {
    const stored = store.get(K.SCHEMA, null);
    if (!force && typeof stored === 'number' && stored > MM_SCHEMA_VERSION) {
      console.warn('Dữ liệu trong trình duyệt mới hơn code (v' + stored + ' > v' + MM_SCHEMA_VERSION +
                   '): không thay đổi. Hãy tải lại trang bằng Ctrl+F5.');
      return;
    }
    const plan = mmSeedPlan();
    const hadData = plan.some(([key]) => store.has(key)) || store.has(K.MENU) || store.has(K.INGREDIENTS);

    plan.forEach(([key, make]) => { if (force || !store.has(key)) store.set(key, make()); });
    if (force || !store.has(K.INGREDIENTS) || !store.has(K.MENU)) {
      store.set(K.INGREDIENTS, DEFAULT_INGREDIENTS);
      store.set(K.MENU, demo ? mmDemoMenuWithToday() : []);
    }

    // Nâng cấp cấu trúc: máy mới/đặt lại đã ở bản hiện tại; dữ liệu cũ chưa có số phiên bản = v0
    let ver = (typeof stored === 'number' && !force) ? stored : (hadData && !force ? 0 : MM_SCHEMA_VERSION);
    for (let v = ver + 1; v <= MM_SCHEMA_VERSION; v++) {
      if (typeof MM_MIGRATIONS[v] === 'function') MM_MIGRATIONS[v]();
    }
    store.set(K.SCHEMA, MM_SCHEMA_VERSION);
  } catch (e) {
    console.warn('Không khởi tạo được dữ liệu mẫu', e);
  }
}
