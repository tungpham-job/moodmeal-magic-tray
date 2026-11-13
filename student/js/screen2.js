/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Món đánh giá = món mục tiêu hôm nay từ thực đơn BGH
   (cần js/today.js load trước file này)
═══════════════════════════════════════════ */

/* Giá trị FAS hiển thị cho bé theo mức emoji (khớp dữ liệu mẫu) */
const emojiMap = {
  4: { val: 3.0 },
  3: { val: 2.8 },
  2: { val: 2.6 },
  1: { val: 2.4 },
};

let selected  = null;
let tryAgain  = false;

/* Món đang đánh giá: lấy từ thực đơn hôm nay (null nếu hôm nay chưa có món) */
let CURRENT_FOOD = null;

function initFood() {
  const target  = getTodayTarget();
  const session = auth.getSession();

  if (!target) { renderNoFood(); return; }

  const canon   = canonicalFood(target.name);
  const history = session ? foodHistory(session.userId, canon.name) : [];
  const nextAttempt = (history.length ? Math.max(...history.map(h => h.attempt)) : 0) + 1;

  CURRENT_FOOD = {
    id: canon.id, name: canon.name, group: target.group, planet: target.planet,
    history, nextAttempt,
  };

  document.getElementById('foodIcon').textContent  = foodIcon(target);
  document.getElementById('foodBadge').textContent = history.length ? `Lần thử thứ ${nextAttempt}` : 'Lần thử đầu tiên!';
  document.getElementById('foodName').textContent  = target.name;
  document.getElementById('foodGroup').textContent = `${target.group} · Hôm nay có trong thực đơn`;
  document.getElementById('fasChartTitle').textContent = `📈 Hành trình khám phá ${target.name}`;
}

/* Hôm nay BGH chưa lập thực đơn: không có món để đánh giá */
function renderNoFood() {
  document.getElementById('foodIcon').textContent  = '🍽️';
  document.getElementById('foodBadge').style.display = 'none';
  document.getElementById('foodName').textContent  = 'Hôm nay chưa có món để thử';
  document.getElementById('foodGroup').textContent = 'BGH sẽ cập nhật thực đơn sớm!';
  document.getElementById('foodXp').style.display  = 'none';
  document.querySelectorAll('.emoji-btn').forEach(b => { b.disabled = true; b.style.opacity = 0.5; });
  const ta = document.getElementById('tryAgainBtn');
  ta.disabled = true; ta.style.opacity = 0.5;
}

/* Ghi 1 dòng vào mm_fas_log: số lần thử (attempt) = lần lớn nhất đã có của
   học sinh + món này (so khớp theo tên), cộng 1. `score` là giá trị FAS hiển
   thị cho bé (khớp dữ liệu mẫu); `rating` giữ nguyên mức emoji gốc (1–4);
   `planet` là hành tinh của món để tính tiến trình khám phá. */
function writeFasLog(rating, score) {
  const session = auth.getSession();
  if (!session || !CURRENT_FOOD) return null;

  const log = readJson('mm_fas_log', []);
  const attempts = log
    .filter(r => r.studentId === session.userId && normFood(r.foodName) === normFood(CURRENT_FOOD.name))
    .map(r => r.attempt);

  const entry = {
    studentId: session.userId,
    foodId:    CURRENT_FOOD.id,
    foodName:  CURRENT_FOOD.name,
    planet:    CURRENT_FOOD.planet,
    attempt:   (attempts.length ? Math.max(...attempts) : 0) + 1,
    score,
    rating,
    tryAgain,
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

/* Hiển thị giờ thật */
(function setDate() {
  const now  = new Date();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('dateDisplay').textContent =
    `${days[now.getDay()]}, ${dd}/${mm}/${now.getFullYear()} · ${hh}:${min}`;
})();

function pickEmoji(btn) {
  if (!CURRENT_FOOD) return;
  document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selected = parseInt(btn.dataset.val);
  document.getElementById('confirmBtn').disabled = false;
}

function toggleTryAgain() {
  if (!CURRENT_FOOD) return;
  tryAgain = !tryAgain;
  const btn = document.getElementById('tryAgainBtn');
  if (tryAgain) {
    btn.innerHTML = '<span>✅</span> Đã đặt nhắc nhở thử lại!';
    btn.classList.add('done');
  } else {
    btn.innerHTML = '<span>⭐</span> Muốn thử lại lần sau (TRY AGAIN)';
    btn.classList.remove('done');
  }
}

/* Biểu đồ hành trình: tối đa 3 lần thử gần nhất của món này + lần hôm nay */
function renderFasBars(prev, val) {
  const bars = prev.slice(-3).map(e => ({ label: `Lần ${e.attempt}`, val: Number(e.score), cur: false }));
  bars.push({ label: 'Hôm nay', val, cur: true });
  document.getElementById('fasBars').innerHTML = bars.map(b => `
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

function confirmEval() {
  if (!selected || !CURRENT_FOOD) return;
  const data  = emojiMap[selected];
  const prev  = CURRENT_FOOD.history;          // các lần thử trước hôm nay
  const entry = writeFasLog(selected, data.val);

  const btn = document.getElementById('confirmBtn');
  btn.disabled    = true;
  btn.textContent = '✅ Đã ghi nhận!';

  renderFasBars(prev, data.val);

  const toast = document.getElementById('toast');
  toast.textContent = `⭐ +15 XP! FAS lần này: ${data.val}/4 🌱`;
  if (tryAgain) toast.textContent += ' · TRY AGAIN đã đặt!';
  toast.classList.add('show');

  document.getElementById('fasChart').classList.add('show');
  document.getElementById('fasNote').textContent   = fasNote(prev, data.val);
  document.getElementById('fasStatus').textContent =
    `✅ FAS lần ${entry ? entry.attempt : CURRENT_FOOD.nextAttempt}: ${data.val}/4 — Đã ghi nhận!`;

  setTimeout(() => {
    document.querySelector('.screen-content').scrollTo({ top: 9999, behavior: 'smooth' });
  }, 300);
}

initFood();
