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

/* ── Seed: Bảng dinh dưỡng chuẩn ────────────────
   Danh sách để BGH CHỌN khi thêm nguyên liệu (sửa lại được; lưu ở mm_nutrition_table).
   Nhóm dinh dưỡng: Tinh bột · Đạm · Rau củ · Trái cây (canh là món, không phải nhóm).
   carbs / protein / fat: gam trên 100 g; portion: khẩu phần chuẩn một ô khay (gam).
   ref: true = số liệu THAM KHẢO (nguồn thứ cấp, đã làm tròn), cần đối chiếu
   "Bảng thành phần thực phẩm Việt Nam" của Viện Dinh dưỡng trước khi dùng cho nghiên cứu. */
const DEFAULT_NUTRITION_TABLE = [
  { id:'com-trang', group:'Tinh bột', name:'Cơm trắng',     icon:'🍚', planet:'Đạm',      portion:100, carbs:28,  protein:2.7, fat:0.3, ref:true },
  { id:'thit-heo',  group:'Đạm',      name:'Thịt heo',      icon:'🥩', planet:'Đạm',      portion:50,  carbs:0,   protein:21,  fat:6,   ref:true },
  { id:'trung',     group:'Đạm',      name:'Trứng',         icon:'🥚', planet:'Đạm',      portion:50,  carbs:1,   protein:13,  fat:11,  ref:true },
  { id:'ca',        group:'Đạm',      name:'Cá',            icon:'🐟', planet:'Đạm',      portion:50,  carbs:0,   protein:18,  fat:5.5, ref:true },
  { id:'rau-muong', group:'Rau củ',   name:'Rau muống',     icon:'🥬', planet:'Rau củ',   portion:80,  carbs:3.5, protein:3,   fat:0,   ref:true },
  { id:'ca-rot',    group:'Rau củ',   name:'Cà rốt',        icon:'🥕', planet:'Rau củ',   portion:80,  carbs:10,  protein:1,   fat:0,   ref:true },
  { id:'ca-chua',   group:'Rau củ',   name:'Cà chua',       icon:'🍅', planet:'Rau củ',   portion:80,  carbs:3,   protein:1,   fat:0,   ref:true },
  { id:'bau',       group:'Rau củ',   name:'Bầu',           icon:'🥒', planet:'Rau củ',   portion:80,  carbs:4,   protein:1,   fat:0,   ref:true },
  { id:'bong-cai',  group:'Rau củ',   name:'Bông cải xanh', icon:'🥦', planet:'Xanh lá',  portion:80,  carbs:5,   protein:2,   fat:0,   ref:true },
  { id:'chuoi',     group:'Trái cây', name:'Chuối',         icon:'🍌', planet:'Trái cây', portion:80,  carbs:23,  protein:1,   fat:0,   ref:true },
  { id:'cam',       group:'Trái cây', name:'Cam',           icon:'🍊', planet:'Trái cây', portion:80,  carbs:12,  protein:1,   fat:0,   ref:true },
  { id:'tao',       group:'Trái cây', name:'Táo',           icon:'🍎', planet:'Trái cây', portion:80,  carbs:14,  protein:0,   fat:0,   ref:true },
];

/* ── Seed: Nguyên liệu ───────────────────────────
   id cố định, dùng làm foodId của nhật ký FAS (nối các lần thử của cùng một nguyên liệu).
   Số liệu dinh dưỡng được SAO từ bảng chuẩn (sửa riêng từng nguyên liệu được).
   alwaysUnlocked: có sẵn cho mọi bé ("Mở khóa sẵn"); còn lại mở khi bé đã thử (có FAS). */
const MM_DEFAULT_UNLOCKED = ['com-trang', 'thit-heo', 'rau-muong', 'chuoi'];
const MM_DEFAULT_INGREDIENT_IDS = ['com-trang', 'thit-heo', 'trung', 'ca', 'rau-muong', 'ca-rot', 'ca-chua', 'bau', 'bong-cai', 'chuoi'];
function mmIngredientFromTable(t, unlocked) {
  return { id:t.id, name:t.name, icon:t.icon, group:t.group, planet:t.planet,
           portion:t.portion, carbs:t.carbs, protein:t.protein, fat:t.fat,
           alwaysUnlocked: !!unlocked, active:true };
}
const DEFAULT_INGREDIENTS = DEFAULT_NUTRITION_TABLE
  .filter(t => MM_DEFAULT_INGREDIENT_IDS.indexOf(t.id) >= 0)
  .map(t => mmIngredientFromTable(t, MM_DEFAULT_UNLOCKED.indexOf(t.id) >= 0));

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
    avatar: '🧒'
  },
  {
    id: 'nguyenminhan',
    pass: 'hs002',
    role: 'student',
    name: 'Nguyễn Minh An',
    linkedId: 'phminhan',
    avatar: '🧒'
  },
  {
    id: 'tranthanhkhoa',
    pass: 'hs003',
    role: 'student',
    name: 'Trần Thanh Khoa',
    linkedId: 'phthanhkhoa',
    avatar: '🧒'
  },
  {
    id: 'phbaotruc',
    pass: 'ph001',
    role: 'parent',
    name: 'Phụ huynh Bảo Trúc',
    linkedId: 'phambaotruc',
    avatar: '👩'
  },
  {
    id: 'phminhan',
    pass: 'ph002',
    role: 'parent',
    name: 'Phụ huynh Minh An',
    linkedId: 'nguyenminhan',
    avatar: '👨'
  },
  {
    id: 'phthanhkhoa',
    pass: 'ph003',
    role: 'parent',
    name: 'Phụ huynh Thanh Khoa',
    linkedId: 'tranthanhkhoa',
    avatar: '👩'
  }
];

/* XP nền của học sinh mẫu: các lần cộng XP sau này cộng dồn lên số này */
const DEFAULT_XP_BASE = 185;

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

/* ── Seed: Daily menu ────────────────────────── */
const DEFAULT_MENU = [
  { id:'m01', date:'2026-10-20', name:'Cơm trắng',        ingredientId:'com-trang', group:'Tinh bột', planet:'Đạm',    isNew: false },
  { id:'m02', date:'2026-10-20', name:'Thịt kho trứng',   ingredientId:'thit-heo',  group:'Đạm',      planet:'Đạm',    isNew: false },
  { id:'m03', date:'2026-10-20', name:'Rau muống xào tỏi',ingredientId:'rau-muong', group:'Rau củ',   planet:'Rau củ', isNew: false },
  { id:'m04', date:'2026-10-20', name:'Canh chua',         ingredientId:'ca-chua',   group:'Rau củ',  planet:'Rau củ', isNew: false },
  { id:'m05', date:'2026-10-21', name:'Cơm trắng',         ingredientId:'com-trang', group:'Tinh bột', planet:'Đạm',    isNew: false },
  { id:'m06', date:'2026-10-21', name:'Cá kho tộ',         ingredientId:'ca',        group:'Đạm',      planet:'Đạm',    isNew: false },
  { id:'m07', date:'2026-10-21', name:'Bông cải xanh xào', ingredientId:'bong-cai',  group:'Rau củ',   planet:'Xanh lá',isNew: true  },
  { id:'m08', date:'2026-10-21', name:'Canh bầu',          ingredientId:'bau',       group:'Rau củ',  planet:'Rau củ', isNew: true  },
];

/* Thực đơn mẫu + món demo "Trứng chiên" cho ngày hôm nay.
   Dùng ngày thật của máy: đặt lại cũng đưa ngày giả lập về ngày thật. */
function mmDemoMenuWithToday() {
  const today = toLocalDateStr(new (window.MM_RealDate || Date)());
  return DEFAULT_MENU.concat([
    { id: 'm-demo-trung-chien', date: today, name: 'Trứng chiên', ingredientId: 'trung',
      icon: '🥚', group: 'Đạm', planet: 'Đạm', isNew: true },
  ]);
}

/* ── Seed: FAS log (demo) ────────────────────── */
const DEFAULT_FAS_LOG = [
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:1, score:1, rating:1, tryAgain:true,  timestamp:'2026-10-07T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:2, score:2, rating:2, tryAgain:true,  timestamp:'2026-10-09T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:3, score:2, rating:2, tryAgain:true,  timestamp:'2026-10-14T12:00:00' },
  { studentId:'phambaotruc', foodId:'bong-cai', foodName:'Bông cải xanh', attempt:4, score:3, rating:3, tryAgain:false, timestamp:'2026-10-21T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:1, score:1, rating:1, tryAgain:true,  timestamp:'2026-10-08T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:2, score:2, rating:2, tryAgain:true,  timestamp:'2026-10-15T12:00:00' },
  { studentId:'nguyenminhan', foodId:'ca-rot',   foodName:'Cà rốt',        attempt:3, score:2, rating:2, tryAgain:false, timestamp:'2026-10-22T12:00:00' },
  { studentId:'tranthanhkhoa', foodId:'rau-muong', foodName:'Rau muống',   attempt:1, score:3, rating:3, tryAgain:false, timestamp:'2026-10-10T12:00:00' },
  { studentId:'tranthanhkhoa', foodId:'rau-muong', foodName:'Rau muống',   attempt:2, score:4, rating:4, tryAgain:false, timestamp:'2026-10-17T12:00:00' },
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
      { group:'traiCay', icon:'🍌', name:'Chuối', ingredientId:'chuoi' },
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
      { group:'traiCay', icon:'🍌', name:'Chuối', ingredientId:'chuoi' },
    ],
    nutritionScore: 80,
    sentAt: '2026-10-22T11:50:00',
    parentConfirmed: null, confirmedAt: null,
    schoolScore: null, schoolNote: ''
  },
];

/* Hành tinh của các món mẫu cũ (khóa đã bỏ dấu), dùng khi dòng FAS/thực đơn chưa ghi hành tinh.
   Dự phòng cho dữ liệu cũ; dùng chung cho student/js/today.js và js/badges.js. */
const LEGACY_FOOD_PLANET = {
  'ca rot': 'Rau củ', 'rau muong': 'Rau củ', 'ca chua': 'Rau củ',
  'bong cai xanh': 'Xanh lá', 'bong cai': 'Xanh lá',
  'thit ga': 'Đạm', 'trung kho': 'Đạm', 'ca kho': 'Đạm', 'thit heo': 'Đạm',
};

/* ═════════════ PHẦN C — KHỞI TẠO ═════════════ */

/* Phiên bản cấu trúc dữ liệu trong localStorage (khóa mm_schema_version).
   v1 = thực đơn có ingredientId, FAS có foodId + thang 4/3/2/1.
   v2 = nhóm dinh dưỡng đổi thành Tinh bột · Đạm · Rau củ · Trái cây (bỏ "Canh"),
        nguyên liệu có khẩu phần + Carbs/Protein/Fat + alwaysUnlocked, thêm bảng chuẩn
        mm_nutrition_table, bỏ cột "NL mở khóa" của Level.
   v3 = khay đã gửi: ô nhóm cũ 'canh' đổi thành ô Trái cây 🍌 Chuối (mã nhóm khay: tinBot · dam · rauCu · traiCay).
   Dữ liệu cũ chưa có số phiên bản được coi là v0; các hàm nâng cấp chạy lần lượt tới bản hiện tại.
   Muốn đổi cấu trúc: tăng số này và thêm MM_MIGRATIONS[n] = function () {…}
   — hàm nâng dữ liệu từ bản n-1 lên bản n. */
const MM_SCHEMA_VERSION = 3;
const MM_MIGRATIONS = {
  2: function () {
    const K = MM_KEYS;
    const byId = {};
    DEFAULT_NUTRITION_TABLE.forEach(t => { byId[t.id] = t; });

    const ings = store.get(K.INGREDIENTS, null);
    if (Array.isArray(ings)) {
      ings.forEach(g => {
        if (g.group === 'Canh') g.group = 'Rau củ';
        const t = byId[g.id];
        if (t && g.carbs === undefined) {
          g.portion = t.portion; g.carbs = t.carbs; g.protein = t.protein; g.fat = t.fat;
        }
        if (g.alwaysUnlocked === undefined) g.alwaysUnlocked = MM_DEFAULT_UNLOCKED.indexOf(g.id) >= 0;
      });
      if (!ings.some(g => g.id === 'chuoi')) ings.push(mmIngredientFromTable(byId['chuoi'], true));
      store.set(K.INGREDIENTS, ings);
    }

    const menu = store.get(K.MENU, null);
    if (Array.isArray(menu)) {
      menu.forEach(m => { if (m.group === 'Canh') m.group = 'Rau củ'; });
      store.set(K.MENU, menu);
    }

    const cfg = store.get(K.XP_CONFIG, null);
    if (cfg && Array.isArray(cfg.levels)) {
      cfg.levels.forEach(l => { delete l.unlock; });
      store.set(K.XP_CONFIG, cfg);
    }
  },
  3: function () {
    const log = store.get(MM_KEYS.TRAY_LOG, null);
    if (!Array.isArray(log)) return;
    log.forEach(t => {
      if (!Array.isArray(t.tray) || !t.tray.some(x => x.group === 'canh')) return;
      const hasFruit = t.tray.some(x => x.group === 'traiCay');
      t.tray = t.tray.filter(x => x.group !== 'canh');
      if (!hasFruit) t.tray.push({ group: 'traiCay', icon: '🍌', name: 'Chuối', ingredientId: 'chuoi' });
    });
    store.set(MM_KEYS.TRAY_LOG, log);
  },
};

/* Kế hoạch dữ liệu khởi tạo: [khóa, hàm trả về giá trị].
   DEMO_MODE = false → chỉ phần mặc định hệ thống + tài khoản admin, danh sách còn lại để trống. */
function mmSeedPlan() {
  const K = MM_KEYS;
  const demo = !(typeof MM_CONFIG !== 'undefined' && MM_CONFIG.DEMO_MODE === false);
  return [
    [K.XP_CONFIG,   () => DEFAULT_XP_CONFIG],
    [K.NUTRITION,   () => DEFAULT_NUTRITION_TABLE],
    [K.BADGES,      () => DEFAULT_BADGES],
    [K.ACCOUNTS,    () => (demo ? SEED_ACCOUNTS : SEED_ACCOUNTS.filter(a => a.role === 'admin'))],
    [K.CRITERIA,    () => (demo ? DEFAULT_CRITERIA : [])],
    [K.FAS_LOG,     () => (demo ? DEFAULT_FAS_LOG : [])],
    [K.TRAY_LOG,    () => (demo ? DEFAULT_TRAY_LOG : [])],
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
