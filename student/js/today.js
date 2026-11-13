/* ═══════════════════════════════════════════════
   today.js — Dữ liệu "hôm nay" dùng chung (Học sinh)
   - Món mục tiêu hôm nay: lấy từ thực đơn do BGH thiết lập
   - Lịch sử FAS của bé theo từng món
   - Trạng thái các hành tinh tính từ dữ liệu của bé
   Load SAU js/auth.js (cần toLocalDateStr).
═══════════════════════════════════════════════ */

/* Bốn hành tinh (tên trùng với ô "Hành tinh" trong form thực đơn của BGH) */
const PLANETS = [
  { key: 'rauCu',   name: 'Rau củ',   icon: '🥕', total: 5, bar: '#1E8449', text: '#1E8449' },
  { key: 'dam',     name: 'Đạm',      icon: '🍗', total: 5, bar: '#1F618D', text: '#1F618D' },
  { key: 'xanhLa',  name: 'Xanh lá',  icon: '🥦', total: 5, bar: '#F0C040', text: '#B8860B' },
  { key: 'traiCay', name: 'Trái cây', icon: '🍎', total: 4, bar: '#BDC3C7', text: '#BDC3C7' },
];

const GROUP_ICON = { 'Tinh bột': '🍚', 'Đạm': '🥩', 'Rau củ': '🥦', 'Canh': '🍲' };

/* Hành tinh của một số món trong dữ liệu mẫu (dùng khi dòng FAS cũ chưa ghi
   hành tinh và tên món không có trong thực đơn). Khóa đã bỏ dấu, viết thường. */
const FOOD_PLANET_SAMPLE = {
  'ca rot': 'Rau củ', 'rau muong': 'Rau củ', 'ca chua': 'Rau củ',
  'bong cai xanh': 'Xanh lá', 'bong cai': 'Xanh lá',
  'thit ga': 'Đạm', 'trung kho': 'Đạm', 'ca kho': 'Đạm', 'thit heo': 'Đạm',
};

/* ── Tiện ích ─────────────────────────────────── */
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch (e) { return fallback; }
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Chuẩn hóa tên món để so khớp: bỏ dấu, viết thường, gọn khoảng trắng */
function normFood(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function slugFood(s) {
  return normFood(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* ── Thực đơn hôm nay ─────────────────────────── */
function getTodayMenu() {
  const today = toLocalDateStr(new Date());
  return readJson('mm_daily_menu', []).filter(m => m.date === today);
}

/* Món mục tiêu: món MỚI đầu tiên của hôm nay; không có thì món đầu tiên */
function getTodayTarget() {
  const menu = getTodayMenu();
  return menu.find(m => m.isNew) || menu[0] || null;
}

/* Icon BGH chọn cho món; không có thì dùng icon theo nhóm */
function foodIcon(item) {
  return (item && item.icon) || GROUP_ICON[item && item.group] || '🍽️';
}

/* ── Lịch sử FAS ──────────────────────────────── */
/* Các lần thử của một học sinh với một món (so khớp theo tên), theo thứ tự lần thử */
function foodHistory(studentId, name) {
  const n = normFood(name);
  return readJson('mm_fas_log', [])
    .filter(r => r.studentId === studentId && normFood(r.foodName) === n)
    .sort((a, b) => a.attempt - b.attempt);
}

/* Mã và tên chuẩn của món: dùng lại mã/tên đã có trong nhật ký FAS để các màn
   (Phụ huynh, Báo cáo BGH) gom đúng một món; chưa có thì tạo mới từ tên. */
function canonicalFood(name) {
  const n = normFood(name);
  const hit = readJson('mm_fas_log', []).find(r => normFood(r.foodName) === n);
  return hit ? { id: hit.foodId, name: hit.foodName }
             : { id: slugFood(name), name: String(name).trim() };
}

/* Hành tinh của một món (theo tên): thực đơn BGH trước, rồi bảng dữ liệu mẫu */
function planetOfName(name) {
  const n = normFood(name);
  const fromMenu = readJson('mm_daily_menu', [])
    .filter(m => m.planet && normFood(m.name) === n)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return (fromMenu && fromMenu.planet) || FOOD_PLANET_SAMPLE[n] || null;
}

/* Các món bé đã thử (mỗi món một dòng), kèm hành tinh và lần thử gần nhất */
function studentFoods(studentId) {
  const byName = {};
  readJson('mm_fas_log', []).filter(r => r.studentId === studentId).forEach(r => {
    const n = normFood(r.foodName);
    const o = byName[n] || (byName[n] = { name: r.foodName, planet: null, latest: r });
    if (r.attempt >= o.latest.attempt) o.latest = r;
    if (r.planet) o.planet = r.planet;
  });
  return Object.keys(byName).map(n => {
    const o = byName[n];
    if (!o.planet) o.planet = planetOfName(o.name);
    return o;
  });
}

/* ── Trạng thái hành tinh ──────────────────────────
   unlocked : bé đã thử ít nhất 1 món thuộc hành tinh
   unlocking: chưa thử món nào, nhưng món mục tiêu hôm nay thuộc hành tinh này
   locked   : còn lại */
function getPlanetStates(studentId) {
  const target = getTodayTarget();
  const foods = studentFoods(studentId);
  return PLANETS.map(p => {
    const tried = foods.filter(f => f.planet === p.name);
    const explored = tried.length;
    const state = explored > 0 ? 'unlocked'
                : (target && target.planet === p.name ? 'unlocking' : 'locked');
    return Object.assign({}, p, { tried, explored, state });
  });
}
