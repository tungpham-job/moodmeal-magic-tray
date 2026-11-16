/* ═══════════════════════════════════════════════
   seed.js — Dữ liệu mẫu (mặc định) dùng chung
   Nạp SAU js/auth.js (cần toLocalDateStr) và TRƯỚC school.js.
   Hiện chứa: nguyên liệu và thực đơn mẫu.
   Nút "Đặt lại dữ liệu demo" ở trang đăng nhập ghi thẳng các dữ liệu này,
   kèm món "Trứng chiên" cho NGÀY HÔM NAY (xem mmDemoMenuWithToday).
═══════════════════════════════════════════════ */

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

/* Thực đơn mẫu + món demo "Trứng chiên" cho ngày hôm nay (dùng khi đặt lại dữ liệu demo).
   Dùng ngày thật của máy: đặt lại cũng đưa ngày giả lập về ngày thật. */
function mmDemoMenuWithToday() {
  const today = toLocalDateStr(new (window.MM_RealDate || Date)());
  return DEFAULT_MENU.concat([
    { id: 'm-demo-trung-chien', date: today, name: 'Trứng chiên', ingredientId: 'trung',
      icon: '🥚', group: 'Đạm', planet: 'Đạm', isNew: true },
  ]);
}

/* Hàm DUY NHẤT thiết lập dữ liệu mẫu (nguyên liệu + thực đơn kèm Trứng chiên hôm nay).
   Được gọi bởi: nút "Đặt lại dữ liệu demo" và lần mở trang Đăng nhập đầu tiên (chưa có dữ liệu). */
function mmSetupDemoData() {
  localStorage.setItem('mm_ingredients', JSON.stringify(DEFAULT_INGREDIENTS));
  localStorage.setItem('mm_daily_menu', JSON.stringify(mmDemoMenuWithToday()));
}

/* Lần đầu mở web: thiếu nguyên liệu hoặc thực đơn → thiết lập như khi đặt lại */
function mmSetupDemoDataIfMissing() {
  if (!localStorage.getItem('mm_ingredients') || !localStorage.getItem('mm_daily_menu')) mmSetupDemoData();
}
