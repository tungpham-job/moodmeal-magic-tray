/* ═══════════════════════════════════════════════
   today.js — Dữ liệu "hôm nay" dùng chung (Học sinh)
   - Món mục tiêu hôm nay: lấy từ thực đơn do BGH thiết lập
   - Lịch sử FAS của bé THEO NHÓM thực phẩm (mỗi nhóm = 1 hành tinh)
   - Trạng thái các hành tinh tính từ dữ liệu của bé
   Load SAU js/auth.js (cần toLocalDateStr).
═══════════════════════════════════════════════ */

/* Màu thanh tiến trình của các hành tinh (xoay vòng theo thứ tự nhóm) */
const PLANET_COLORS = [
  { bar: '#E0A030', text: '#A0700F' }, { bar: '#C0504D', text: '#9B2C2A' }, { bar: '#1F618D', text: '#1F618D' },
  { bar: '#D4AC0D', text: '#9A7D0A' }, { bar: '#8E6E53', text: '#6E5340' }, { bar: '#1E8449', text: '#1E8449' },
  { bar: '#E67E22', text: '#B35F10' }, { bar: '#7D3C98', text: '#7D3C98' }, { bar: '#E74C3C', text: '#C0392B' },
];

/* ── Tiện ích ─────────────────────────────────── */
function readJson(key, fallback) { return store.get(key, fallback); }

/* Chuẩn hóa tên món để so khớp: bỏ dấu, viết thường, gọn khoảng trắng */
function slugFood(s) {
  return normFood(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ── Thực đơn hôm nay ─────────────────────────── */
function getTodayMenu() {
  const today = toLocalDateStr(new Date());
  return readJson(MM_KEYS.MENU, []).filter(m => m.date === today);
}

/* Món mục tiêu: món MỚI đầu tiên của hôm nay; không có thì món đầu tiên */
function getTodayTarget() {
  const menu = getTodayMenu();
  return menu.find(m => m.isNew) || menu[0] || null;
}

/* Icon BGH chọn cho món; không có thì dùng icon theo nhóm */
function foodIcon(item) {
  if (item && item.icon) return item.icon;
  const ing = item && item.ingredientId ? getIngredient(item.ingredientId) : null;
  if (ing && ing.icon) return ing.icon;
  const g = mmGroupById(groupIdOfItem(item));
  return (g && g.icon) || '🍽️';
}

/* Nhóm thực phẩm của một món trong thực đơn: ghi trên món; thiếu thì lấy theo nguyên liệu */
function groupIdOfItem(item) {
  if (!item) return null;
  if (item.groupId) return item.groupId;
  const ing = item.ingredientId ? getIngredient(item.ingredientId) : null;
  return (ing && ing.groupId) || null;
}

/* ── Nguyên liệu (danh mục do BGH quản lý) ─────────
   Mỗi món trong thực đơn gắn với một nguyên liệu chính (item.ingredientId).
   FAS được theo dõi theo nguyên liệu, nên tên món mỗi ngày có khác cũng nối đúng. */
function getIngredient(id) {
  return readJson(MM_KEYS.INGREDIENTS, []).find(g => g.id === id) || null;
}

/* Khóa theo dõi FAS của một món trong thực đơn: id nguyên liệu; món cũ chưa có thì dùng tên */
function foodKeyOf(item) {
  return (item && item.ingredientId) || normFood(item && item.name);
}

/* Mã + tên chuẩn của món theo nguyên liệu; món cũ (không có nguyên liệu) dùng canonicalFood */
function canonicalFoodOf(item) {
  if (item && item.ingredientId) {
    const g = getIngredient(item.ingredientId);
    return { id: item.ingredientId, name: g ? g.name : item.name };
  }
  return canonicalFood(item.name);
}

/* Mã và tên chuẩn của món cũ (không có nguyên liệu): dùng lại mã/tên trong nhật ký FAS, chưa có thì tạo từ tên. */
function canonicalFood(name) {
  const n = normFood(name);
  const hit = readJson(MM_KEYS.FAS_LOG, []).find(r => normFood(r.foodName) === n);
  return hit ? { id: hit.foodId, name: hit.foodName }
             : { id: slugFood(name), name: String(name).trim() };
}

/* ── Lịch sử FAS THEO NHÓM ────────────────────────
   Các lượt đánh giá của học sinh trong nhóm của món (cả trường và nhà), theo thời gian.
   Lượt "Chưa thử" (điểm 0) có trong danh sách nhưng không tính là lượt thử (xem mmTriedRows). */
function foodHistoryOf(studentId, item) {
  const gid = groupIdOfItem(item);
  if (!gid) return [];
  return mmGroupRows(readJson(MM_KEYS.FAS_LOG, []), studentId, gid);
}

/* ── Trạng thái hành tinh (mỗi nhóm thực phẩm = 1 hành tinh) ──
   unlocked : bé đã thử ít nhất 1 nguyên liệu của nhóm (điểm 1–4)
   unlocking: chưa thử nguyên liệu nào, nhưng món mục tiêu hôm nay thuộc nhóm này
   locked   : còn lại
   ingredients: tất cả nguyên liệu đang dùng của nhóm; đã thử thì có FAS gần nhất, chưa thử thì tried = false. */
function getPlanetStates(studentId) {
  const target  = getTodayTarget();
  const targetG = groupIdOfItem(target);
  const log  = readJson(MM_KEYS.FAS_LOG, []);
  const ings = readJson(MM_KEYS.INGREDIENTS, []).filter(g => g.active !== false);
  return mmFoodGroups().map((g, i) => {
    const rows = mmTriedRows(mmGroupRows(log, studentId, g.id));
    const ingredients = ings.filter(x => x.groupId === g.id).map(x => {
      const mine = rows.filter(r => r.foodId === x.id);
      return { id: x.id, name: x.name, icon: x.icon || g.icon, tried: mine.length > 0,
               fas: mine.length ? mine[mine.length - 1].score : null };
    });
    const explored = ingredients.filter(x => x.tried).length;
    const state = explored > 0 ? 'unlocked' : (targetG === g.id ? 'unlocking' : 'locked');
    const col = PLANET_COLORS[i % PLANET_COLORS.length];
    return { key: g.id, name: g.name, icon: g.icon, total: ingredients.length, bar: col.bar, text: col.text,
             ingredients, explored, state };
  });
}
