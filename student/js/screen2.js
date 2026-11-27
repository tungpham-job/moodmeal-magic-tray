/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Hiện MỌI món trong thực đơn hôm nay (BGH thiết lập); món đã đánh giá thu gọn 1 dòng, món chưa đánh giá hiện đầy đủ
   và đánh giá từng món. Mỗi món có phần đánh giá, TRY AGAIN, nút xác nhận
   và biểu đồ riêng.  (cần js/today.js load trước file này)
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

}

/* ── Vẽ danh sách ─────────────────────────────── */
function foodBlockHtml(f, i, pos) {
  const badge = f.history.length ? `Lần thử thứ ${f.nextAttempt} của nhóm` : 'Lần thử đầu tiên của nhóm!';
  const tag   = f.home ? 'Bữa tối ở nhà 🏠' : (f.item.isNew ? 'Món mới hôm nay' : 'Hôm nay có trong thực đơn');
  const faces = [[4, '❤️', 'Rất thích'], [3, '🙂', 'Có thể ăn'], [2, '😐', 'Chưa quen'], [1, '🙁', 'Không thích'], [0, '🚫', 'Chưa thử']]
    .map(([v, e, l], k) => `<button type="button" class="emoji-btn${v === 0 ? ' not-tried' : ''}" role="radio" aria-checked="false" aria-label="${l}, ${v} điểm" tabindex="${k === 0 ? 0 : -1}" data-val="${v}" onclick="pickEmoji(${i}, this)" onkeydown="emojiKey(event, ${i})"><span class="e-tick" aria-hidden="true">✓</span><span class="e-icon" aria-hidden="true">${e}</span><span class="e-label">${l}</span></button>`)
    .join('');
  const divider = !pos.first ? 'border-top:6px solid #F0F2F5;margin-top:10px;padding-top:2px;' : '';

  return `
  <div class="food-block" id="food-${i}" style="${divider}">
    ${pos.schoolFirst ? '<div class="section-label school-label" id="schoolLabel">🏫 Bữa trưa ở trường</div>' : ''}
    ${f.home ? `<div class="section-label home-label" id="homeLabel-${i}">🏠 Bữa tối ở nhà</div>
      <div class="home-note">Bạn đã thử món chưa? Đánh giá trước cuối ${escHtml(dayLabel(f.deadline))} nhé!</div>`
      : (f.schoolTotal > 1 ? `<div class="section-label">Món ${f.seq} / ${f.schoolTotal}</div>` : '')}
    <div class="food-card${f.home ? ' home-card' : ''}" style="margin-top:${f.home || f.schoolTotal > 1 ? 2 : 10}px">
      <div class="food-img">
        <span style="font-size:56px">${escHtml(foodIcon(f.item))}</span>
        <div class="food-badge">${badge}</div>
      </div>
      <div class="food-info">
        <div class="food-name">${escHtml(f.item.name)}</div>
        <div class="food-group">Nhóm ${escHtml(f.groupName)} · ${tag}</div>
        <div class="food-xp">${f.history.length
          ? `⭐ +${xpAmount('emoji_rate')} XP khi đánh giá`
          : `⭐ +${xpAmount('first_try') + xpAmount('emoji_rate')} XP khi thử và đánh giá`}</div>
      </div>
    </div>

    <div class="emoji-label" id="emojiQ-${i}">Sau khi thử, em cảm thấy thế nào?</div>
    <div class="emoji-row" role="radiogroup" aria-labelledby="emojiQ-${i}">${faces}</div>

    <div class="skip-note" id="skipNote-${i}" role="alert" hidden>
      Bạn ơi, hôm nay bạn đã bỏ qua món ${escHtml(f.item.name)}!<br>
      Hãy chọn "Muốn" để thử lại nhóm ${escHtml(f.groupName)} vào buổi tối tại nhà để cơ thể được đủ dinh dưỡng của 1 ngày nhé.
    </div>

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

    <div class="toast" id="toast-${i}"></div>
    <div class="sr-only" id="live-${i}" role="status" aria-live="polite"></div>

    <div class="gap2"></div>
  </div>`;
}

/* Dòng thu gọn của món đã đánh giá hôm nay */
function doneRowHtml(f) {
  const e = f.todayEntry;
  const lv = e.rating != null ? e.rating : e.score;
  const face = { 4: ['❤️', 'Rất thích'], 3: ['🙂', 'Có thể ăn'], 2: ['😐', 'Chưa quen'], 1: ['🙁', 'Không thích'], 0: ['🚫', 'Chưa thử'] }[lv] || ['', ''];
  return `
  <div class="done-row">
    <span class="d-icon">${escHtml(foodIcon(f.item))}</span>
    <div class="d-main">
      <div class="d-name">${escHtml(f.item.name)}</div>
      <div class="d-group">Nhóm ${escHtml(f.groupName)}${f.home ? ' · Bữa tối ở nhà 🏠' : ''}</div>
    </div>
    <div class="d-res"><b>✔ Đã đánh giá</b><span>${face[0]} ${face[1]}</span></div>
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

  /* Món đã đánh giá thu gọn thành 1 dòng (kèm cảm xúc đã chọn) và xếp lên trên;
     món chưa đánh giá hiện đầy đủ ngay bên dưới. Chỉ thu gọn khi tải màn hình: món vừa xác nhận
     trong lần mở này vẫn giữ nguyên thẻ để bé thấy kết quả. */
  const doneIdx = [], pendIdx = [];
  FOODS.forEach((f, i) => (f.todayEntry ? doneIdx : pendIdx).push(i));
  doneIdx.forEach(i => { const f = FOODS[i]; f.done = true; f.selected = f.todayEntry.rating != null ? f.todayEntry.rating : f.todayEntry.score; f.tryAgain = !!f.todayEntry.tryAgain; });
  const firstSchool = pendIdx.find(i => !FOODS[i].home);
  let html = doneIdx.map(i => doneRowHtml(FOODS[i])).join('');
  if (doneIdx.length && pendIdx.length) html += '<div class="pending-label">MÓN CHƯA ĐÁNH GIÁ</div>';
  html += pendIdx.map((i, k) => foodBlockHtml(FOODS[i], i, { first: k === 0, schoolFirst: i === firstSchool && !doneIdx.length })).join('');
  list.innerHTML = html;
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
function pickEmoji(i, btn) {
  const f = FOODS[i];
  if (!f || f.done) return;
  setEmojiSelected(i, btn);
  f.selected = parseInt(btn.dataset.val);
  document.getElementById(`skipNote-${i}`).hidden = f.selected !== 0;
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

  updateSummary();

  setTimeout(() => { if (toast.scrollIntoView) toast.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 300);
}

initFoods();
