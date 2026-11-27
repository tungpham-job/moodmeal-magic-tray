/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Hiện MỌI món trong thực đơn hôm nay (BGH thiết lập) dạng danh sách gọn (đã đánh giá lẫn chưa đánh giá). Bấm vào một món
   thì nội dung mở ngay bên dưới (emoji cảm xúc, TRY AGAIN, nút xác nhận); chỉ mở một món một lúc, mở tab thì đóng hết.
   Món đã đánh giá: hiện ✔ Đã đánh giá + cảm xúc, bấm vào xem lại nhưng khóa.  (cần js/today.js load trước file này)
═══════════════════════════════════════════ */

/* Điểm FAS theo mức emoji: ❤️ 4 · 🙂 3 · 😐 2 · 🙁 1 · 🚫 Chưa thử 0
   (0 = chưa thử: lưu và hiện trong chuỗi lượt thử, nhưng không tính là lượt thử và không tính vào FAG) */
const emojiMap = {
  0: { val: 0 },
  4: { val: 4.0 },
  3: { val: 3.0 },
  2: { val: 2.0 },
  1: { val: 1.0 },
};

/* Danh sách món hôm nay; mỗi phần tử giữ trạng thái đánh giá của riêng món đó */
let FOODS = [];

function initFoods() {
  const session = auth.getSession();
  const seen = {};

  FOODS = getTodayMenu()
    .filter(item => {                         // bỏ món trùng tên trong cùng một ngày
      const n = foodKeyOf(item);
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    })
    .map(item => {
      const canon = canonicalFoodOf(item);
      const all   = session ? foodHistoryOf(session.userId, item) : [];   // mọi lượt của NHÓM (trường + nhà)
      /* Đã đánh giá nguyên liệu này hôm nay ở trường → giữ kết quả, khóa không cho đánh giá lại */
      const todayEntry = all.find(r => isToday(r.timestamp) && isSchoolRow(r) &&
        (r.foodId === canon.id || normFood(r.foodName) === normFood(canon.name))) || null;
      /* history = các lượt THỬ thật (điểm 1–4) của nhóm trước lượt này */
      const tried = mmTriedRows(all);
      const history = todayEntry ? tried.filter(r => String(r.timestamp) < String(todayEntry.timestamp)) : tried;
      const nextAttempt = history.length + 1;
      const gid = groupIdOfItem(item);
      const grp = mmGroupById(gid);
      return {
        item, id: canon.id, name: canon.name, groupId: gid, groupName: grp ? grp.name : (item.group || ''),
        history, nextAttempt, selected: null, tryAgain: false, done: false, todayEntry,
      };
    });
  FOODS.forEach((f, k) => { f.seq = k + 1; f.schoolTotal = FOODS.length; });

  /* "Bữa tối ở nhà": yêu cầu ba mẹ đã xác nhận, còn trong hạn đánh giá (hoặc vừa đánh giá hôm nay) — đứng đầu danh sách */
  const homeFoods = session ? mmReqSweep()
    .filter(r => r.studentId === session.userId &&
      (r.status === 'cooked' || (r.status === 'rated' && r.ratedAt && isToday(r.ratedAt))))
    .map(r => {
      const item = { name: r.dishName, icon: r.icon, ingredientId: r.foodId, groupId: r.groupId };
      const ing  = getIngredient(r.foodId);
      const grp  = mmGroupById(r.groupId);
      const all  = foodHistoryOf(session.userId, item);
      const todayEntry = r.status === 'rated' ? (all.find(x => x.reqId === r.id) || null) : null;
      const tried = mmTriedRows(all);
      const history = todayEntry ? tried.filter(x => String(x.timestamp) < String(todayEntry.timestamp)) : tried;
      return {
        item, id: r.foodId, name: ing ? ing.name : r.dishName, groupId: r.groupId, groupName: grp ? grp.name : '',
        history, nextAttempt: history.length + 1, selected: null, tryAgain: false, done: false, todayEntry,
        home: true, reqId: r.id, deadline: mmReqRateDeadline(r),
      };
    }) : [];
  FOODS = homeFoods.concat(FOODS);

  renderFoods();
}

/* Mốc thời gian có thuộc ngày hôm nay (giờ local) không */
function isToday(ts) {
  return toLocalDateStr(new Date(ts)) === toLocalDateStr(new Date());
}

/* Dòng nhật ký ghi ở trường (dòng cũ chưa có place coi là ở trường) */
function isSchoolRow(r) { return !r.place || r.place === 'school'; }

/* Lần đánh giá hôm nay của học sinh với món f (đọc lại từ nhật ký) */
function findTodayEntry(f) {
  const session = auth.getSession();
  if (!session) return null;
  if (f.home) return readJson(MM_KEYS.FAS_LOG, []).find(r => r.studentId === session.userId && r.reqId === f.reqId) || null;
  return readJson(MM_KEYS.FAS_LOG, []).find(r =>
    r.studentId === session.userId && isToday(r.timestamp) && isSchoolRow(r) &&
    (r.foodId === f.id || normFood(r.foodName) === normFood(f.name))) || null;
}

/* Khôi phục giao diện "đã đánh giá hôm nay": khóa emoji, TRY AGAIN, nút xác nhận */
function restoreDone(i, entry) {
  const f = FOODS[i];
  f.done      = true;
  f.todayEntry = entry;
  f.selected  = entry.rating != null ? entry.rating : entry.score;
  f.tryAgain  = !!entry.tryAgain;

  const sel = document.querySelector(`#food-${i} .emoji-btn[data-val="${f.selected}"]`);
  if (sel) setEmojiSelected(i, sel);
  document.querySelectorAll(`#food-${i} .emoji-btn`).forEach(b => { b.disabled = true; });

  setTryAgainUi(i, f.tryAgain ? 1 : 0);
  document.querySelectorAll(`#food-${i} .ta-btn`).forEach(b => { b.disabled = true; });

  const btn = document.getElementById(`confirmBtn-${i}`);
  btn.disabled    = true;
  btn.textContent = '✅ Đã ghi nhận!';

  const bd = document.querySelector(`#food-${i} .food-badge`);
  if (bd) bd.textContent = Number(entry.score) === 0 ? 'Chưa thử hôm nay'
    : (f.history.length ? `Lần thử thứ ${entry.attempt} của nhóm` : 'Lần thử đầu tiên của nhóm!');

  const xp = document.querySelector(`#food-${i} .food-xp`);
  if (xp) xp.textContent = f.home ? '✅ Em đã đánh giá bữa tối ở nhà rồi' : '✅ Hôm nay em đã đánh giá món này rồi';

  markDoneUi(i);
}

/* Dòng đầu của món chuyển sang "✔ Đã đánh giá" + cảm xúc; thân món khóa (không đánh giá lại) */
function markDoneUi(i) {
  const f = FOODS[i];
  const box = document.getElementById(`food-${i}`), st = document.getElementById(`st-${i}`), q = document.getElementById(`emojiQ-${i}`);
  if (box) box.classList.add('done');
  if (st) st.innerHTML = statusHtml(f);
  if (q) q.textContent = 'Em đã đánh giá món này:';
}

/* Chữ trạng thái ở dòng đầu mỗi món */
const FACE_OF = { 4: ['❤️', 'Rất thích'], 3: ['🙂', 'Có thể ăn'], 2: ['😐', 'Chưa quen'], 1: ['🙁', 'Không thích'], 0: ['🚫', 'Chưa thử'] };
function statusHtml(f) {
  if (!f.done) return '<span class="it-pend">Chưa đánh giá</span>';
  const e = f.todayEntry;
  const lv = f.selected != null ? f.selected : (e ? (e.rating != null ? e.rating : e.score) : null);
  const face = FACE_OF[lv] || ['', ''];
  return `<span class="it-done"><b>✔ Đã đánh giá</b><small>${face[0]} ${face[1]}</small></span>`;
}

/* Mở / đóng thân một món. Chỉ mở một món một lúc. */
function setOpen(i, on) {
  const body = document.getElementById(`body-${i}`), hd = document.getElementById(`hd-${i}`), box = document.getElementById(`food-${i}`);
  if (!body) return;
  body.hidden = !on;
  if (hd) hd.setAttribute('aria-expanded', on ? 'true' : 'false');
  if (box) box.classList.toggle('open', on);
}
function toggleFood(i) {
  const body = document.getElementById(`body-${i}`);
  if (!body) return;
  const wasOpen = !body.hidden;
  FOODS.forEach((_, k) => setOpen(k, false));
  if (!wasOpen) {
    setOpen(i, true);
    const box = document.getElementById(`food-${i}`);
    if (box && box.scrollIntoView) setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
}

/* ── Vẽ danh sách ─────────────────────────────── */
function foodBlockHtml(f, i) {
  const badge = f.history.length ? `🔁 Lần thử thứ ${f.nextAttempt}` : '🌟 Lần thử đầu của nhóm';
  const faces = [[4, '❤️', 'Rất thích'], [3, '🙂', 'Có thể ăn'], [2, '😐', 'Chưa quen'], [1, '🙁', 'Không thích'], [0, '🚫', 'Chưa thử']]
    .map(([v, e, l], k) => `<button type="button" class="emoji-btn${v === 0 ? ' not-tried' : ''}" role="radio" aria-checked="false" aria-label="${l}, ${v} điểm" tabindex="${k === 0 ? 0 : -1}" data-val="${v}" onclick="pickEmoji(${i}, this)" onkeydown="emojiKey(event, ${i})"><span class="e-tick" aria-hidden="true">✓</span><span class="e-icon" aria-hidden="true">${e}</span><span class="e-label">${l}</span></button>`)
    .join('');

  return `
  <div class="it${f.done ? ' done' : ''}" id="food-${i}">
    <button type="button" class="it-hd" id="hd-${i}" aria-expanded="false" aria-controls="body-${i}" onclick="toggleFood(${i})">
      <span class="it-ic" aria-hidden="true">${escHtml(foodIcon(f.item))}</span>
      <span class="it-nm">${escHtml(f.item.name)}<small>Nhóm ${escHtml(f.groupName)}${f.home ? ' · Bữa tối ở nhà 🏠' : ''}</small></span>
      <span class="it-st" id="st-${i}">${statusHtml(f)}</span><span class="it-chev" aria-hidden="true">▼</span>
    </button>
    <div class="it-body" id="body-${i}" hidden>
    ${f.home ? `<div class="home-note">Bạn đã thử món chưa? Đánh giá trước cuối ${escHtml(dayLabel(f.deadline))} nhé!</div>` : ''}
    <div class="food-bar${f.home ? ' home-card' : ''}">
      <span class="food-badge">${badge}</span>
      <span class="food-xp">${f.history.length
        ? `⭐ +${xpAmount('emoji_rate')} XP`
        : `⭐ +${xpAmount('first_try') + xpAmount('emoji_rate')} XP`}</span>
    </div>

    <div class="emoji-label" id="emojiQ-${i}">Sau khi thử, em cảm thấy thế nào?</div>
    <div class="emoji-row" role="radiogroup" aria-labelledby="emojiQ-${i}">${faces}</div>

    <div class="skip-note" id="skipNote-${i}" role="status" aria-live="polite" hidden></div>

    <div class="gap"></div>

    <div class="ta-card" id="taCard-${i}">
      <div class="ta-head">
        <div class="ta-q" id="taQ-${i}">Thử lại lần sau?</div>
      </div>
      <div class="ta-row" role="radiogroup" aria-labelledby="taQ-${i}">
        <button type="button" class="ta-btn" role="radio" aria-checked="false" aria-label="Muốn thử lại lần sau" tabindex="0" data-val="1" onclick="pickTryAgain(${i}, this)" onkeydown="tryAgainKey(event, ${i})">Muốn</button>
        <button type="button" class="ta-btn" role="radio" aria-checked="false" aria-label="Để sau, chưa thử lại" tabindex="-1" data-val="0" onclick="pickTryAgain(${i}, this)" onkeydown="tryAgainKey(event, ${i})">Để sau</button>
      </div>
    </div>

    <button class="confirm-btn" id="confirmBtn-${i}" onclick="confirmEval(${i})" disabled>
      ✓ Xác nhận đánh giá
    </button>

    <div class="it-lock">🔒 Đã xác nhận, không đánh giá lại</div>

    <div class="toast" id="toast-${i}"></div>
    <div class="sr-only" id="live-${i}" role="status" aria-live="polite"></div>

    <div class="gap2"></div>
    </div>
  </div>`;
}

function renderFoods() {
  const list = document.getElementById('foodList');

  if (!FOODS.length) {                         // hôm nay BGH chưa lập thực đơn
    document.getElementById('evalSummary').innerHTML = '';
    list.innerHTML = `
      <div class="food-card">
        <div class="food-img"><span style="font-size:56px">🍽️</span></div>
        <div class="food-info">
          <div class="food-name">Hôm nay chưa có món để thử</div>
          <div class="food-group">BGH sẽ cập nhật thực đơn sớm!</div>
        </div>
      </div>`;
    return;
  }

  /* Danh sách gọn: mọi món (đã/chưa đánh giá) là một dòng, đóng sẵn; bấm vào mới mở nội dung bên dưới.
     Bữa tối ở nhà đứng đầu, rồi đến bữa trưa ở trường (giữ thứ tự thực đơn). */
  const homeIdx = [], schoolIdx = [];
  FOODS.forEach((f, i) => {
    if (f.todayEntry) { f.done = true; f.selected = f.todayEntry.rating != null ? f.todayEntry.rating : f.todayEntry.score; f.tryAgain = !!f.todayEntry.tryAgain; }
    (f.home ? homeIdx : schoolIdx).push(i);
  });
  let html = '';
  if (homeIdx.length)   html += '<div class="section-label home-label" id="homeLabel">🏠 Bữa tối ở nhà</div>' + homeIdx.map(i => foodBlockHtml(FOODS[i], i)).join('');
  if (schoolIdx.length) html += '<div class="section-label school-label" id="schoolLabel">🏫 Bữa trưa ở trường</div>' + schoolIdx.map(i => foodBlockHtml(FOODS[i], i)).join('');
  list.innerHTML = html;
  FOODS.forEach((f, i) => { if (f.todayEntry) restoreDone(i, f.todayEntry); });   // khóa giao diện các món đã đánh giá
  updateSummary();
}

/* Nhãn hạn đánh giá: "hôm nay" hoặc "ngày mai" (hết ngày) */
function dayLabel(d) { return toLocalDateStr(d) === toLocalDateStr(new Date()) ? 'hôm nay' : 'ngày mai'; }

function updateSummary() {
  const school = FOODS.filter(f => !f.home);
  const home   = FOODS.filter(f => f.home && !f.done).length;
  const done = school.filter(f => f.done).length;
  const el = document.getElementById('evalSummary');
  let t = !school.length ? '' : done === school.length
    ? `🎉 Đã đánh giá xong ${school.length} món hôm nay!`
    : `Hôm nay có ${school.length} món · đã đánh giá ${done}/${school.length}`;
  if (home) t += (t ? ' · ' : '') + `🏠 ${home} món ở nhà chờ em đánh giá`;
  el.innerHTML = t ? `<div class="es-label">${escHtml(t)}</div>` : '';
}

/* ── Ghi 1 dòng vào mm_fas_log ─────────────────
   FAS tính THEO NHÓM: attempt = số lượt thử thật (điểm 1–4) đã có của học sinh trong nhóm + 1.
   "Chưa thử" (điểm 0) được lưu nhưng không phải lượt thử: attempt = null, notTried = true.
   `score` là điểm FAS (❤️ 4 · 🙂 3 · 😐 2 · 🙁 1 · 🚫 0); `rating` giữ mức emoji gốc;
   `place` là nơi thử ('school' ở trường, 'home' ở nhà). */
function writeFasLog(f, rating, score) {
  const session = auth.getSession();
  if (!session || !f) return null;

  const log = readJson(MM_KEYS.FAS_LOG, []);
  const tried = f.groupId ? mmTriedRows(mmGroupRows(log, session.userId, f.groupId)) : [];

  const entry = {
    studentId: session.userId,
    foodId:    f.id,
    foodName:  f.name,
    dishName:  f.item.name,
    groupId:   f.groupId,
    place:     f.home ? 'home' : 'school',
    attempt:   score >= 1 ? tried.length + 1 : null,
    score,
    rating,
    tryAgain:  f.tryAgain,
    timestamp: new Date().toISOString(),
  };
  if (f.home) entry.reqId = f.reqId;
  if (score === 0) entry.notTried = true;

  log.push(entry);
  if (!store.set(MM_KEYS.FAS_LOG, log)) return null;
  return entry;
}

/* ── Tương tác theo từng món (i = vị trí trong FOODS) ── */
/* Lời nhắc dưới hàng emoji theo mức chọn: 4-3 xanh lá đậm, 2-1 vàng nghệ đậm, 0 (Chưa thử) đỏ */
function emojiNoteOf(v, f) {
  switch (v) {
    case 4: return ['good', 'Wow! Bạn tìm được món ăn yêu thích rồi! Tuyệt vời quá! 🌟'];
    case 3: return ['good', 'Giỏi quá! Bạn đã cho món ăn này một cơ hội rồi đấy. Nhóm chất này rất cần thiết cho cơ thể mỗi ngày. Hãy thử thêm nữa nhé! 🌟'];
    case 2: return ['warn', 'Biết đâu lần tới bạn sẽ thích món này hơn thì sao nhỉ. Hãy tiếp tục thử để cơ thể đầy đủ dưỡng chất hằng ngày bạn nhé! 🌟'];
    case 1: return ['warn', 'Không sao đâu! Mỗi người có một khẩu vị riêng mà. Nhưng đừng bỏ cuộc, bạn hãy thử lại lần tới nhé! 🌟'];
    default: return ['bad', `Bạn ơi, hôm nay bạn đã bỏ qua món ${escHtml(f.item.name)}!<br>Hãy chọn "Muốn" để thử lại nhóm ${escHtml(f.groupName)} vào buổi tối tại nhà, cho cơ thể có đủ dinh dưỡng nhé! 🌟`];
  }
}
function showEmojiNote(i, f) {
  const box = document.getElementById(`skipNote-${i}`);
  if (!box) return;
  const [tone, html] = emojiNoteOf(f.selected, f);
  box.className = 'skip-note tone-' + tone;
  box.innerHTML = html;
  box.hidden = false;
}

function pickEmoji(i, btn) {
  const f = FOODS[i];
  if (!f || f.done) return;
  setEmojiSelected(i, btn);
  f.selected = parseInt(btn.dataset.val);
  showEmojiNote(i, f);
  document.getElementById(`confirmBtn-${i}`).disabled = false;
}

/* Đánh dấu một nút emoji là đã chọn (giao diện + trợ năng: aria-checked, tab dừng đúng nút) */
function setEmojiSelected(i, btn) {
  document.querySelectorAll(`#food-${i} .emoji-btn`).forEach(b => {
    const on = b === btn;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  });
}

/* Bàn phím cho nhóm radio: phím mũi tên đổi lựa chọn, Space/Enter chọn nút đang focus */
function emojiKey(ev, i) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(ev.key in keys)) return;
  ev.preventDefault();
  const btns = [...document.querySelectorAll(`#food-${i} .emoji-btn:not(:disabled)`)];
  const next = btns[(btns.indexOf(ev.currentTarget) + keys[ev.key] + btns.length) % btns.length];
  if (!next) return;
  next.focus();
  pickEmoji(i, next);
}

/* Chọn "Muốn" (1) / "Để sau" (0); bấm lại nút đang chọn thì bỏ chọn (về chưa chọn) */
function pickTryAgain(i, btn) {
  const f = FOODS[i];
  if (!f || f.done) return;
  const already = btn.getAttribute('aria-checked') === 'true';
  const val = already ? null : parseInt(btn.dataset.val);
  setTryAgainUi(i, val);
  f.tryAgain = val === 1;
}

/* val: 1 = Muốn, 0 = Để sau, null = chưa chọn (giao diện + aria-checked + tab dừng đúng nút) */
function setTryAgainUi(i, val) {
  const btns = [...document.querySelectorAll(`#food-${i} .ta-btn`)];
  btns.forEach((b, k) => {
    const on = val !== null && parseInt(b.dataset.val) === val;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = val === null ? (k === 0 ? 0 : -1) : (on ? 0 : -1);
  });
}

/* Bàn phím cho nhóm radio "Muốn / Để sau": phím mũi tên đổi lựa chọn */
function tryAgainKey(ev, i) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(ev.key in keys)) return;
  ev.preventDefault();
  const f = FOODS[i];
  if (!f || f.done) return;
  const btns = [...document.querySelectorAll(`#food-${i} .ta-btn:not(:disabled)`)];
  const next = btns[(btns.indexOf(ev.currentTarget) + keys[ev.key] + btns.length) % btns.length];
  if (!next) return;
  next.focus();
  setTryAgainUi(i, parseInt(next.dataset.val));
  f.tryAgain = parseInt(next.dataset.val) === 1;
}

function confirmEval(i) {
  const f = FOODS[i];
  if (!f || f.done || f.selected === null) return;

  /* Đã có đánh giá hôm nay (vd mở ở tab khác) → không ghi thêm, chỉ hiện kết quả đã có */
  const existing = findTodayEntry(f);
  if (existing) {
    f.history = f.history.filter(r => String(r.timestamp) < String(existing.timestamp));
    restoreDone(i, existing);
    updateSummary();
    return;
  }

  const data  = emojiMap[f.selected];
  const prev  = f.history;                     // các lần thử trước hôm nay
  const entry = writeFasLog(f, f.selected, data.val);
  f.done = true;
  if (f.home && entry) mmReqMarkRated(f.reqId);

  /* Cộng XP theo bảng của BGH: thử lần đầu của nhóm (chỉ khi đã thử thật), đánh giá emoji (kể cả "Chưa thử").
     Bấm "Muốn" không cộng XP. */
  const session = auth.getSession();
  let xpRes = null;
  if (session && entry) {
    const ref  = `${f.id}#${entry.timestamp}`;
    const list = [];
    if (data.val >= 1 && !prev.length) list.push(['first_try', f.groupId || f.id]);
    list.push(['emoji_rate', ref]);
    xpRes = awardXpBatch(session.userId, list);
    refreshXpDisplay(session.userId, session.name);
  }

  const btn = document.getElementById(`confirmBtn-${i}`);
  btn.disabled    = true;
  btn.textContent = '✅ Đã ghi nhận!';
  document.querySelectorAll(`#food-${i} .emoji-btn`).forEach(b => { b.disabled = true; });
  document.querySelectorAll(`#food-${i} .ta-btn`).forEach(b => { b.disabled = true; });

  const toast = document.getElementById(`toast-${i}`);
  toast.textContent = data.val === 0
    ? `⭐ +${xpRes ? xpRes.awarded : 0} XP! Em chọn Chưa thử 🌱`
    : `⭐ +${xpRes ? xpRes.awarded : 0} XP! Em đã ghi nhận món này 🌱`;
  if (f.tryAgain && entry) {
    /* "Muốn": luôn ghi tryAgain vào FAS; đồng thời hẹn ba mẹ nấu ở nhà (mỗi nhóm một yêu cầu, tối đa 2 món/ngày) */
    const rq = f.groupId ? mmReqCreate(session.userId, { groupId: f.groupId, foodId: f.id, dishName: f.item.name, icon: foodIcon(f.item) })
                         : { ok: false, message: '' };
    toast.textContent += rq.ok ? ' · 🏠 Đã hẹn ba mẹ nấu ở nhà tối nay!' : (rq.message ? ' · ' + rq.message : '');
  }
  if (xpRes && xpRes.leveledUp) toast.textContent += ' ' + levelUpText(xpRes);
  toast.classList.add('show');
  const live = document.getElementById(`live-${i}`);
  if (live) live.textContent = toast.textContent;

  markDoneUi(i);
  updateSummary();
  setTimeout(() => setOpen(i, false), 5000);       // cho em đọc thông báo XP rồi tự đóng món

  setTimeout(() => { if (toast.scrollIntoView) toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 300);
}

initFoods();
