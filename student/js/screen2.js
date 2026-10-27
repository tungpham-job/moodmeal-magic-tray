/* ═══════════════════════════════════════════
   screen2.js — Thử món & Đánh giá
   Emoji rating + FAS chart logic
═══════════════════════════════════════════ */

const emojiMap = {
  4: { val: 3.0, note: 'Tuyệt! FAS tăng từ 2.6 → 3.0 (+0.4) 🎉 FAG tổng: +1.0' },
  3: { val: 2.8, note: 'Tốt! FAS tăng từ 2.6 → 2.8 (+0.2) 👍' },
  2: { val: 2.6, note: 'OK! FAS giữ nguyên ở 2.6 · Thử lại lần sau nhé 💪' },
  1: { val: 2.4, note: 'FAS giảm nhẹ · Không sao, thử lần sau sẽ khác! 🌱' },
};

let selected  = null;
let tryAgain  = false;

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
  document.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selected = parseInt(btn.dataset.val);
  document.getElementById('confirmBtn').disabled = false;
}

function toggleTryAgain() {
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

function confirmEval() {
  if (!selected) return;
  const data = emojiMap[selected];

  const btn = document.getElementById('confirmBtn');
  btn.disabled    = true;
  btn.textContent = '✅ Đã ghi nhận!';

  const pct = (data.val / 4) * 100;
  document.getElementById('currentBar').style.height = pct + '%';
  document.getElementById('currentVal').textContent  = data.val.toFixed(1);

  const toast = document.getElementById('toast');
  toast.textContent = `⭐ +15 XP! FAS lần này: ${data.val}/4 🌱`;
  if (tryAgain) toast.textContent += ' · TRY AGAIN đã đặt!';
  toast.classList.add('show');

  document.getElementById('fasChart').classList.add('show');
  document.getElementById('fasNote').textContent   = data.note;
  document.getElementById('fasStatus').textContent =
    `✅ FAS lần 4: ${data.val}/4 — Đã ghi nhận!`;

  setTimeout(() => {
    document.querySelector('.screen-content').scrollTo({ top: 9999, behavior: 'smooth' });
  }, 300);
}
