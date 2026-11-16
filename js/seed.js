/* ═══════════════════════════════════════════════════════════════
   seed.js — NGUỒN DUY NHẤT của dữ liệu mặc định và dữ liệu mẫu (demo)

   Nạp ĐẦU TIÊN trên mọi trang, TRƯỚC js/auth.js:
     <script src="…/js/seed.js"></script>
     <script src="…/js/auth.js"></script>

   Quy ước:
   • File này chỉ CHỨA dữ liệu và hàm ghi dữ liệu. Các file khác không tự định nghĩa lại
     bất kỳ giá trị mặc định nào; khi cần đọc thì lấy từ localStorage, và dùng DEFAULT_*
     làm giá trị dự phòng.
   • Khi chạy thật, BGH sửa cấu hình thì giá trị mới nằm trong localStorage; seed chỉ được
     ghi khi khóa chưa tồn tại (lần mở đầu) hoặc khi bấm "Đặt lại dữ liệu demo".
   • Muốn thêm dữ liệu mẫu mới: thêm hằng số ở đây + một dòng trong MM_SEEDS bên dưới.

   PHẦN A — Mặc định hệ thống (cấu hình ban đầu)
   PHẦN B — Dữ liệu mẫu cho demo
   PHẦN C — Hàm khởi tạo mmSeedAll()
═══════════════════════════════════════════════════════════════ */

/* ═════════════ PHẦN A — MẶC ĐỊNH HỆ THỐNG ═════════════ */

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

/* ── Seed: Nguyên liệu ───────────────────────────
   id cố định, dùng làm foodId của nhật ký FAS (nối các lần thử của cùng một nguyên liệu) */
const DEFAULT_INGREDIENTS = [
  { id:'com-trang',  name:'Cơm trắng',      icon:'🍚', group:'Tinh bột', planet:'Đạm',     active:true },
  { id:'thit-heo',   name:'Thịt heo',       icon:'🥩', group:'Đạm',      planet:'Đạm',     active:true },
  { id:'trung',      name:'Trứng',          icon:'🥚', group:'Đạm',      planet:'Đạm',     active:true },
  { id:'ca',         name:'Cá',             icon:'🐟', group:'Đạm',      planet:'Đạm',     active:true },
  { id:'rau-muong',  name:'Rau muống',      icon:'🥬', group:'Rau củ',   planet:'Rau củ',  active:true },
  { id:'ca-rot',     name:'Cà rốt',         icon:'🥕', group:'Rau củ',   planet:'Rau củ',  active:true },
  { id:'ca-chua',    name:'Cà chua',        icon:'🍅', group:'Canh',     planet:'Rau củ',  active:true },
  { id:'bau',        name:'Bầu',            icon:'🥒', group:'Canh',     planet:'Rau củ',  active:true },
  { id:'bong-cai',   name:'Bông cải xanh',  icon:'🥦', group:'Rau củ',   planet:'Xanh lá', active:true },
];

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
  { id:'m04', date:'2026-10-20', name:'Canh chua',         ingredientId:'ca-chua',   group:'Canh',     planet:'Rau củ', isNew: false },
  { id:'m05', date:'2026-10-21', name:'Cơm trắng',         ingredientId:'com-trang', group:'Tinh bột', planet:'Đạm',    isNew: false },
  { id:'m06', date:'2026-10-21', name:'Cá kho tộ',         ingredientId:'ca',        group:'Đạm',      planet:'Đạm',    isNew: false },
  { id:'m07', date:'2026-10-21', name:'Bông cải xanh xào', ingredientId:'bong-cai',  group:'Rau củ',   planet:'Xanh lá',isNew: true  },
  { id:'m08', date:'2026-10-21', name:'Canh bầu',          ingredientId:'bau',       group:'Canh',     planet:'Rau củ', isNew: true  },
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

/* ═════════════ PHẦN C — KHỞI TẠO ═════════════ */

/* Khóa localStorage → hàm trả về giá trị mẫu (hàm, để lấy "hôm nay" tại thời điểm ghi) */
const MM_SEEDS = [
  ['mm_accounts',         () => SEED_ACCOUNTS],
  ['mm_xp_config',        () => DEFAULT_XP_CONFIG],
  ['mm_badges',           () => DEFAULT_BADGES],
  ['mm_grading_criteria', () => DEFAULT_CRITERIA],
  ['mm_fas_log',          () => DEFAULT_FAS_LOG],
  ['mm_tray_log',         () => DEFAULT_TRAY_LOG],
];

/* HÀM DUY NHẤT thiết lập dữ liệu mặc định/mẫu.
   • mmSeedAll()              — chỉ ghi khóa còn THIẾU (gọi từ js/auth.js trên mọi trang).
   • mmSeedAll({force:true})  — ghi lại TẤT CẢ (nút "Đặt lại dữ liệu demo").
   Nguyên liệu và thực đơn đi cặp: thiếu một trong hai thì ghi lại cả hai,
   kèm món "Trứng chiên" cho hôm nay. */
function mmSeedAll(opts) {
  const force = !!(opts && opts.force);
  const missing = key => !localStorage.getItem(key);
  const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  try {
    MM_SEEDS.forEach(([key, make]) => { if (force || missing(key)) put(key, make()); });
    if (force || missing('mm_ingredients') || missing('mm_daily_menu')) {
      put('mm_ingredients', DEFAULT_INGREDIENTS);
      put('mm_daily_menu', mmDemoMenuWithToday());
    }
  } catch (e) {
    console.warn('Không ghi được dữ liệu mẫu vào localStorage', e);
  }
}
