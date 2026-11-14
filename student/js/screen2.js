/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Hiện MỌI món trong thực đơn hôm nay (BGH thiết lập) để bé cuộn xuống
   và đánh giá từng món. Mỗi món có phần đánh giá, TRY AGAIN, nút xác nhận
   và biểu đồ riêng.  (cần js/today.js load trước file này)
═══════════════════════════════════════════ */

/* Điểm FAS theo mức emoji: ❤️ 4 · 🙂 3 · 😐 2 · 🙁 1 */
const emojiMap = {
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
      const n = normFood(item.name);
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    })
    .map(item => {
      const canon   = canonicalFood(item.name);
      const history = session ? foodHistory(session.userId, canon.name) : [];
      const nextAttempt = (history.length ? Math.max(...history.map(h => h.attempt)) : 0) + 1;
      return {
        item, id: canon.id, name: canon.name, group: item.group, planet: item.planet,
        history, nextAttempt, selected: null, tryAgain: false, done: false,
      };
    });

  renderFoods();
}

/* ── Vẽ danh sách ─────────────────────────────── */
function foodBlockHtml(f, i, total) {
  const badge = f.history.length ? `Lần thử thứ ${f.nextAttempt}` : 'Lần thử đầu tiên!';
  const tag   = f.item.isNew ? 'Món mới hôm nay' : 'Hôm nay có trong thực đơn';
  const faces = [[4, '❤️', 'Rất thích'], [3, '🙂', 'Có thể ăn'], [2, '😐', 'Chưa quen'], [1, '🙁', 'Không thích']]
    .map(([v, e, l]) => `<button class="emoji-btn" data-val="${v}" onclick="pickEmoji(${i}, this)"><span class="e-icon">${e}</span><span class="e-label">${l}</span></button>`)
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
        <div class="food-group">${escHtml(f.group)} · ${tag}</div>
        <div class="food-xp">${f.history.length
          ? `⭐ +${xpAmount('emoji_rate')} XP khi đánh giá`
          : `⭐ +${xpAmount('first_try') + xpAmount('emoji_rate')} XP khi thử và đánh giá`}</div>
      </div>
    </div>

    <div class="emoji-label">Sau khi thử, em cảm thấy thế nào?</div>
    <div class="emoji-row">${faces}</div>

    <div class="gap"></div>

    <button class="btn btn-secondary" id="tryAgainBtn-${i}" onclick="toggleTryAgain(${i})" style="margin-bottom:6px">
      <span>⭐</span> Muốn thử lại lần sau (TRY AGAIN)
    </button>

    <button class="confirm-btn" id="confirmBtn-${i}" onclick="confirmEval(${i})" disabled>
      ✓ Xác nhận đánh giá
    </button>

    <div class="toast" id="toast-${i}"></div>

    <div class="fas-chart" id="fasChart-${i}">
      <div class="fas-chart-title">📈 Hành trình khám phá ${escHtml(f.item.name)}</div>
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
   attempt = lần lớn nhất đã có của học sinh + món này (so khớp theo tên) + 1.
   `score` là điểm FAS (❤️ 4 · 🙂 3 · 😐 2 · 🙁 1); `rating` giữ mức emoji
   gốc (1–4); `planet` là hành tinh của món để tính tiến trình khám phá. */
function writeFasLog(f, rating, score) {
  const session = auth.getSession();
  if (!session || !f) return null;

  const log = readJson('mm_fas_log', []);
  const attempts = log
    .filter(r => r.studentId === session.userId && normFood(r.foodName) === normFood(f.name))
    .map(r => r.attempt);

  const entry = {
    studentId: session.userId,
    foodId:    f.id,
    foodName:  f.name,
    planet:    f.planet,
    attempt:   (attempts.length ? Math.max(...attempts) : 0) + 1,
    score,
    rating,
    tryAgain:  f.tryAgain,
    timestamp: new Date().toISOString(),
  };

  try {
    log.push(entry);
    localStorage.setItem('mm_fas_log', JSON.stringify(log));
  } catch (e) {
    console.warn('Could not write mm_fas_log', e);
    return null;
  }
  return entry;
}

/* ── Tương tác theo từng món (i = vị trí trong FOODS) ── */
function pickEmoji(i, btn) {
  const f = FOODS[i];
  if (!f || f.done) return;
  document.querySelectorAll(`#food-${i} .emoji-btn`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  f.selected = parseInt(btn.dataset.val);
  document.getElementById(`confirmBtn-${i}`).disabled = false;
}

function toggleTryAgain(i) {
  const f = FOODS[i];
  if (!f || f.done) return;
  f.tryAgain = !f.tryAgain;
  const btn = document.getElementById(`tryAgainBtn-${i}`);
  if (f.tryAgain) {
    btn.innerHTML = '<span>✅</span> Đã đặt nhắc nhở thử lại!';
    btn.classList.add('done');
  } else {
    btn.innerHTML = '<span>⭐</span> Muốn thử lại lần sau (TRY AGAIN)';
    btn.classList.remove('done');
  }
}

/* Biểu đồ hành trình: tối đa 3 lần thử gần nhất của món này + lần hôm nay */
function renderFasBars(i, prev, val) {
  const bars = prev.slice(-3).map(e => ({ label: `Lần ${e.attempt}`, val: Number(e.score), cur: false }));
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
  if (!prev.length) return `Lần đầu thử món này! FAS ${val.toFixed(1)}/4 🌱`;
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
  if (!f || f.done || !f.selected) return;

  const data  = emojiMap[f.selected];
  const prev  = f.history;                     // các lần thử trước hôm nay
  const entry = writeFasLog(f, f.selected, data.val);
  f.done = true;

  /* Cộng XP theo bảng của BGH: thử món lần đầu, đánh giá emoji, TRY AGAIN */
  const session = auth.getSession();
  let xpRes = null;
  if (session && entry) {
    const ref  = `${f.id}#${entry.attempt}`;
    const list = [];
    if (!prev.length) list.push(['first_try', f.id]);
    list.push(['emoji_rate', ref]);
    if (f.tryAgain) list.push(['try_again', ref]);
    xpRes = awardXpBatch(session.userId, list);
    refreshXpDisplay(session.userId, session.name);
  }

  const btn = document.getElementById(`confirmBtn-${i}`);
  btn.disabled    = true;
  btn.textContent = '✅ Đã ghi nhận!';
  document.querySelectorAll(`#food-${i} .emoji-btn`).forEach(b => { b.disabled = true; });
  document.getElementById(`tryAgainBtn-${i}`).disabled = true;

  renderFasBars(i, prev, data.val);

  const toast = document.getElementById(`toast-${i}`);
  toast.textContent = `⭐ +${xpRes ? xpRes.awarded : 0} XP! FAS lần này: ${data.val}/4 🌱`;
  if (f.tryAgain) toast.textContent += ' · TRY AGAIN đã đặt!';
  if (xpRes && xpRes.leveledUp) toast.textContent += ' ' + levelUpText(xpRes);
  toast.classList.add('show');

  document.getElementById(`fasChart-${i}`).classList.add('show');
  document.getElementById(`fasNote-${i}`).textContent   = fasNote(prev, data.val);
  document.getElementById(`fasStatus-${i}`).textContent =
    `✅ FAS lần ${entry ? entry.attempt : f.nextAttempt}: ${data.val}/4 — Đã ghi nhận!`;

  updateSummary();

  const chart = document.getElementById(`fasChart-${i}`);
  setTimeout(() => { if (chart.scrollIntoView) chart.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 300);
}

initFoods();
