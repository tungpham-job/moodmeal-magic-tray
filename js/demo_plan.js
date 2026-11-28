/* ═══════════════════════════════════════════════════════════
   demo_plan.js — KỊCH BẢN DEMO của Phạm Bảo Trúc + bộ sinh dữ liệu demo dùng chung

   Nạp trên MỌI trang, ngay sau seed.js (trước utils.js/auth.js) để máy mở lần đầu ở trang nào cũng có kịch bản.
   • mmSetDemoPlan() — gọi bởi mmSeedAll() sau mmSetDefaultData() + mmSetDemoData() (máy mới hoặc đặt lại), chỉ khi DEMO_MODE bật.
       1. Lịch sử 4 tuần của Bảo Trúc: thực đơn 4 tuần trước (mã m-big-…) + nhật ký FAS sinh theo "kiểu bé" (hạt giống cố định).
       2. Một yêu cầu "Muốn" đang chờ ba mẹ xác nhận (đăng nhập phụ huynh Bảo Trúc là xác nhận được ngay).
       3. XP sát mốc lên Level cao nhất (cách mốc một lượt đánh giá) + ghi "Level đã thấy" để hoạt ảnh tiến hóa chiếu khi lên Level.
       4. Thực đơn hôm nay: chưa có lượt đánh giá nào của Trúc, có món MỚI và 1 món Rau.
   • Bộ sinh (mmRng, mmBigPastMenu, mmBigStudent…) cũng được js/demo_big.js dùng cho 149 bạn từ CSV.
   Mọi giá trị sinh ra có hạt giống cố định → đặt lại nhiều lần ra cùng bộ dữ liệu.
   ═══════════════════════════════════════════════════════════ */

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

const MM_PLAN_STUDENT_ID = 'phambaotruc';
const MM_PLAN_XP_GAP = 10;     // XP còn thiếu để lên Level: đúng một lượt "Đánh giá emoji" (+10)

/* Thiết lập kịch bản demo cho Phạm Bảo Trúc (ghi đè an toàn: chạy lại cho ra cùng kết quả). */
function mmSetDemoPlan() {
  const K = MM_KEYS;
  try {
    const accounts = store.get(K.ACCOUNTS, []);
    const truc = accounts.find(a => a.id === MM_PLAN_STUDENT_ID);
    if (!truc) return;
    const real = new (window.MM_RealDate || Date)();
    const today = toLocalDateStr(real);
    const monday = new Date(real.getFullYear(), real.getMonth(), real.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    /* 1. Lịch sử 4 tuần: thực đơn quá khứ (nếu chưa có) + FAS của Trúc */
    let menu = store.get(K.MENU, []);
    if (!menu.some(m => String(m.id).indexOf('m-big-') === 0)) menu = menu.concat(mmBigPastMenu(monday));
    const from = toLocalDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * MM_BIG_WEEKS_BACK));
    const histMenu = menu.filter(m => m.date < today && m.date >= from && m.ingredientId && m.groupId)
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const rows = mmBigStudent([truc.id, truc.name, truc.className, truc.pass, 'binh'], histMenu).rows;

    /* 2. Yêu cầu "Muốn" đang chờ ba mẹ: món đầu của ngày có thực đơn gần nhất trước hôm nay, Trúc "Chưa thử" và muốn thử lại ở nhà */
    let requests = store.get(K.HOME_REQUESTS, []).filter(r => r.id !== 'rq-demo-truc');
    const lastDate = histMenu.length ? histMenu[histMenu.length - 1].date : null;
    const dish = lastDate ? histMenu.find(m => m.date === lastDate) : null;
    if (dish) {
      const idx = rows.findIndex(r => r.timestamp.slice(0, 10) === dish.date && r.foodId === dish.ingredientId);
      if (idx >= 0) rows.splice(idx, 1);
      const ing = MM_DEFAULT_INGREDIENT_LIST.find(x => x.id === dish.ingredientId);
      const at = new Date(dish.date + 'T12:20:00');
      rows.push({ studentId: truc.id, foodId: dish.ingredientId, foodName: ing ? ing.name : dish.name, dishName: dish.name, groupId: dish.groupId,
        place: 'school', attempt: null, score: 0, rating: 0, tryAgain: true, notTried: true, timestamp: dish.date + 'T12:20:00' });
      requests.push({ id: 'rq-demo-truc', studentId: truc.id, groupId: dish.groupId, foodId: dish.ingredientId, dishName: dish.name,
        icon: (ing && ing.icon) || '🍽️', createdAt: at.toISOString(),
        expiresAt: new Date(at.getFullYear(), at.getMonth(), at.getDate() + MM_REQ_EXPIRE_DAYS, 23, 59, 59, 999).toISOString(),
        status: 'pending', respondedAt: null, ratedAt: null });
    }

    /* 3. XP sát mốc lên Level cao nhất + ghi Level đã thấy (để hoạt ảnh tiến hóa chiếu khi lên Level) */
    const cfg = store.get(K.XP_CONFIG, DEFAULT_XP_CONFIG);
    const levels = (cfg.levels || DEFAULT_XP_CONFIG.levels).slice().sort((a, b) => a.level - b.level);
    if (levels.length > 1) {
      truc.xp = Math.max(0, levels[levels.length - 1].xpFrom - MM_PLAN_XP_GAP);
      let li = 0; levels.forEach((l, i) => { if (truc.xp >= l.xpFrom) li = i; });
      const cs = store.get(K.CHAR_STATE, {}); cs[truc.id] = { seenLevelIdx: li }; store.set(K.CHAR_STATE, cs);
    }

    /* 4. Thực đơn hôm nay: có món MỚI (nếu chưa có thì đánh dấu món Rau) */
    const td = menu.filter(m => m.date === today);
    if (td.length && !td.some(m => m.isNew)) (td.find(m => m.groupId === 'g-rau') || td[0]).isNew = true;

    /* Ghi: FAS của Trúc thay hoàn toàn (không đụng của bạn khác), sắp theo thời gian */
    const fas = store.get(K.FAS_LOG, []).filter(r => r.studentId !== truc.id).concat(rows)
      .sort((a, b) => a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0);
    store.set(K.MENU, menu); store.set(K.FAS_LOG, fas); store.set(K.HOME_REQUESTS, requests); store.set(K.ACCOUNTS, accounts);
  } catch (e) {
    console.warn('Không thiết lập được kịch bản demo', e);
  }
}
