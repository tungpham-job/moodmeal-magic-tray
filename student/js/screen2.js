/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Hiện MỌI món trong thực đơn hôm nay (BGH thiết lập) để bé cuộn xuống
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
  if (xp) xp.textContent = '✅ Hôm nay em đã đánh giá món này rồi';

  const val = Number(entry.score);
  renderFasBars(i, f.history, val);
  document.getElementById(`fasChart-${i}`).classList.add('show');
  document.getElementById(`fasNote-${i}`).textContent   = fasNote(f.history, val);
  document.getElementById(`fasStatus-${i}`).textContent = val === 0
    ? '✅ Em chọn Chưa thử (không tính lượt thử) — Mỗi món chỉ đánh giá 1 lần mỗi ngày, mai em thử tiếp nhé!'
    : `✅ FAS lần ${entry.attempt}: ${val}/4 — Mỗi món chỉ đánh giá 1 lần mỗi ngày, mai em thử tiếp nhé!`;
}

/* ── Vẽ danh sách ─────────────────────────────── */
function foodBlockHtml(f, i, total) {
  const badge = f.history.length ? `Lần thử thứ ${f.nextAttempt} của nhóm` : 'Lần thử đầu tiên của nhóm!';
  const tag   = f.item.isNew ? 'Món mới hôm nay' : 'Hôm nay có trong thực đơn';
  const faces = [[4, '❤️', 'Rất thích'], [3, '🙂', 'Có thể ăn'], [2, '😐', 'Chưa quen'], [1, '🙁', 'Không thích'], [0, '🚫', 'Chưa thử']]
    .map(([v, e, l], k) => `<button type="button" class="emoji-btn${v === 0 ? ' not-tried' : ''}" role="radio" aria-checked="false" aria-label="${l}, ${v} điểm" tabindex="${k === 0 ? 0 : -1}" data-val="${v}" onclick="pickEmoji(${i}, this)" onkeydown="emojiKey(event, ${i})"><span class="e-tick" aria-hidden="true">✓</span><span class="e-icon" aria-hidden="true">${e}</span><span class="e-label">${l}</span></button>`)
    .join('');
  const divider = i > 0 ? 'border-top:6px solid #F0F2F5;margin-top:10px;padding-top:2px;' : '';

  return `
  <div class="food-block" id="food-${i}" style="${divider}">
    ${total > 1 ? `<div class="section-label">Món ${i + 1} / ${total}</div>` : ''}
    <div class="food-card" style="margin-top:${total > 1 ? 2 : 10}px">
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

    <div class="fas-chart" id="fasChart-${i}">
      <div class="fas-chart-title">📈 Hành trình khám phá nhóm ${escHtml(f.groupName)}</div>
      <div class="fas-bars" id="fasBars-${i}" style="height:auto;min-height:56px"></div>
      <div class="fas-track-label">
        <span>FAS: 1.0 (Không thích)</span>
        <span>FAS: 4.0 (Rất thích)</span>
      </div>
      <div id="fasNote-${i}" style="margin-top:8px;font-size:10px;color:#1E8449;font-weight:600"></div>
    </div>

    <div class="gap2"></div>
    <div style="text-align:center;padding:4px 12px 8px;font-size:10px;color:#aaa" id="fasStatus-${i}">
      FAS lần này sẽ được ghi tự động sau khi xác nhận
    </div>
  </div>`;
}

function renderFoods() {
  const list = document.getElementById('foodList');

  if (!FOODS.length) {                         // hôm nay BGH chưa lập thực đơn
    document.getElementById('evalSummary').textContent = '';
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

  list.innerHTML = FOODS.map((f, i) => foodBlockHtml(f, i, FOODS.length)).join('');
  FOODS.forEach((f, i) => { if (f.todayEntry) restoreDone(i, f.todayEntry); });
  updateSummary();
}

function updateSummary() {
  const done = FOODS.filter(f => f.done).length;
  const el = document.getElementById('evalSummary');
  el.textContent = done === FOODS.length
    ? `🎉 Đã đánh giá xong ${FOODS.length} món hôm nay!`
    : `Hôm nay có ${FOODS.length} món · đã đánh giá ${done}/${FOODS.length}`;
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
    place:     'school',
    attempt:   score >= 1 ? tried.length + 1 : null,
    score,
    rating,
    tryAgain:  f.tryAgain,
    timestamp: new Date().toISOString(),
  };
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

/* Biểu đồ hành trình: tối đa 3 lần thử gần nhất của món này + lần hôm nay */
function renderFasBars(i, prev, val) {
  const bars = prev.slice(-3).map((e, k, arr) => ({ label: `Lần ${e.attempt}`, val: Number(e.score), cur: false }));
  bars.push({ label: 'Hôm nay', val, cur: true });
  document.getElementById(`fasBars-${i}`).innerHTML = bars.map(b => `
    <div class="fas-bar-wrap">
      <div class="fas-bar-val">${b.val.toFixed(1)}</div>
      <div class="fas-bar${b.cur ? ' current' : ''}" style="height:${Math.max(4, Math.round((b.val / 4) * 36))}px"></div>
      <div class="fas-bar-label">${b.label}</div>
    </div>`).join('');
}

/* Ghi chú theo lịch sử của bé với món này */
function fasNote(prev, val) {
  if (val === 0) return 'Em chưa thử món này, không sao! Khi nào sẵn sàng em thử nhé 🌱';
  if (!prev.length) return `Lần đầu thử nhóm này! FAS ${val.toFixed(1)}/4 🌱`;
  const last  = Number(prev[prev.length - 1].score);
  const first = Number(prev[0].score);
  const delta = Math.round((val - last) * 10) / 10;
  if (delta > 0) {
    const fag = Math.round((val - first) * 10) / 10;
    return `Tuyệt! FAS tăng từ ${last.toFixed(1)} → ${val.toFixed(1)} (+${delta.toFixed(1)}) 🎉 FAG tổng: +${fag.toFixed(1)}`;
  }
  if (delta === 0) return `OK! FAS giữ nguyên ở ${val.toFixed(1)} · Thử lại lần sau nhé 💪`;
  return `FAS giảm nhẹ (${last.toFixed(1)} → ${val.toFixed(1)}) · Không sao, thử lần sau sẽ khác! 🌱`;
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

  renderFasBars(i, prev, data.val);

  const toast = document.getElementById(`toast-${i}`);
  toast.textContent = data.val === 0
    ? `⭐ +${xpRes ? xpRes.awarded : 0} XP! Em chọn Chưa thử 🌱`
    : `⭐ +${xpRes ? xpRes.awarded : 0} XP! FAS lần này: ${data.val}/4 🌱`;
  if (f.tryAgain) toast.textContent += ' · TRY AGAIN đã đặt!';
  if (xpRes && xpRes.leveledUp) toast.textContent += ' ' + levelUpText(xpRes);
  toast.classList.add('show');
  const live = document.getElementById(`live-${i}`);
  if (live) live.textContent = toast.textContent;

  document.getElementById(`fasChart-${i}`).classList.add('show');
  document.getElementById(`fasNote-${i}`).textContent   = fasNote(prev, data.val);
  document.getElementById(`fasStatus-${i}`).textContent = data.val === 0
    ? '✅ Đã ghi nhận: Chưa thử (không tính lượt thử)'
    : `✅ FAS lần ${entry ? entry.attempt : f.nextAttempt}: ${data.val}/4 — Đã ghi nhận!`;

  updateSummary();

  const chart = document.getElementById(`fasChart-${i}`);
  setTimeout(() => { if (chart.scrollIntoView) chart.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 300);
}

initFoods();
