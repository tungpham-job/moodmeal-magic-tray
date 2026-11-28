/* ═══════════════════════════════════════════════
   auth.js — MOODMEAL MAGIC TRAY v3
   Session management · Route protection · Seed data
   Load trên MỌI trang (trừ login.html), SAU config.js, seed.js, utils.js, store.js.
   Cách dùng:
     const session = auth.check('student'); // redirect nếu sai role
     auth.logout();                         // xóa session → login
═══════════════════════════════════════════════ */

/* ── 0. Đồng hồ demo ─────────────────────────────
   Trang đăng nhập cho phép chọn "Ngày hôm nay" để test (khóa mm_demo_date = YYYY-MM-DD).
   Khi có khóa này, `new Date()` / `Date.now()` trả về NGÀY ĐÃ CHỌN + GIỜ PHÚT THẬT của máy,
   nên mọi trang (BGH, Học sinh, Phụ huynh) chạy như thể hôm nay là ngày đó.
   Phải nằm đầu file này (auth.js được nạp trước các script khác).
   Ngày thật vẫn lấy được bằng `new MM_RealDate()`. */
(function installDemoClock() {
  const RealDate = window.Date;
  window.MM_RealDate = RealDate;
  let ds = null;
  if (typeof MM_CONFIG !== 'undefined' && MM_CONFIG.DEMO_MODE === false) return;   // bản chạy thật: không giả lập ngày
  try { ds = store.getRaw(MM_KEYS.DEMO_DATE); } catch (e) { return; }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ds || '');
  if (!m) return;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];

  function nowMs() {
    const r = new RealDate();
    return new RealDate(y, mo, d, r.getHours(), r.getMinutes(), r.getSeconds(), r.getMilliseconds()).getTime();
  }
  function DemoDate(...args) {
    if (!(this instanceof DemoDate)) return new RealDate(nowMs()).toString();
    return args.length === 0 ? new RealDate(nowMs()) : new RealDate(...args);
  }
  DemoDate.prototype = RealDate.prototype;
  DemoDate.now   = nowMs;
  DemoDate.parse = RealDate.parse;
  DemoDate.UTC   = RealDate.UTC;
  window.Date = DemoDate;
})();

/* ── 1. Tài khoản mẫu: xem DEFAULT_ACCOUNTS trong js/seed.js (nạp TRƯỚC file này) ── */
const STORAGE_KEY_ACCOUNTS = MM_KEYS.ACCOUNTS;
const STORAGE_KEY_SESSION  = MM_KEYS.SESSION;
const STORAGE_KEY_FLASH    = MM_KEYS.FLASH;   // thông báo hiện ở trang đăng nhập sau khi bị đăng xuất

/* ── 2. Khởi tạo dữ liệu mặc định/mẫu vào localStorage (chỉ khóa còn thiếu) ─────
   Hàm mmSeedAll() nằm trong js/seed.js; auth.js có mặt trên mọi trang nên đây là
   điểm khởi tạo DUY NHẤT. */
if (typeof mmSeedAll === 'function') mmSeedAll();
else console.error('Thiếu js/seed.js: hãy nạp seed.js TRƯỚC auth.js trên trang này.');

/* escHtml(), toLocalDateStr(): xem js/utils.js (nạp TRƯỚC file này) */

/* ── 3. Đối tượng auth (public API) ─────────── */
const auth = {

  /* Lấy session hiện tại (hoặc null) */
  getSession() {
    return sessionStore.get(STORAGE_KEY_SESSION, null);
  },

  /* Lấy danh sách accounts từ localStorage */
  getAccounts() {
    return store.get(STORAGE_KEY_ACCOUNTS, DEFAULT_ACCOUNTS);
  },

  /* Lưu danh sách accounts (dùng cho School khi CRUD) */
  saveAccounts(accounts) {
    store.set(STORAGE_KEY_ACCOUNTS, accounts);
  },

  /*
   * check(requiredRole)
   * Gọi ở đầu mỗi trang được bảo vệ.
   * - Không có session      → redirect ../login.html
   * - Sai role              → redirect ../login.html
   * - Đúng                  → trả về session object
   * requiredRole: 'admin' | 'student' | 'parent' | null (bỏ qua role check)
   */
  check(requiredRole = null) {
    const session = this.getSession();

    if (!session) {
      this._redirectToLogin();
      return null;
    }

    // Đối chiếu với tài khoản hiện tại: bị khóa, bị xóa hoặc đổi vai trò → kết thúc phiên;
    // đổi tên, ảnh đại diện, liên kết → cập nhật vào phiên.
    const state = this._validate(session);
    if (!state.ok) {
      this._endSession(state.reason);
      return null;
    }
    this._sig = state.sig;

    if (requiredRole && state.session.role !== requiredRole) {
      this._redirectToLogin();
      return null;
    }

    return state.session;
  },

  /*
   * login(id, pass)
   * Kiểm tra credentials, lưu session, trả về {ok, redirect, error}
   * Dùng trong login.html
   */
  login(id, pass) {
    const accounts = this.getAccounts();
    const user = accounts.find(
      a => a.id.toLowerCase() === id.toLowerCase() && a.pass === pass
    );

    if (!user) {
      return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
    }

    if (user.locked) {
      return { ok: false, error: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Ban Giám Hiệu.' };
    }

    // Ghi lần đăng nhập đầu tiên của học sinh (dùng cho danh hiệu "Người mới")
    if (user.role === 'student' && !user.firstLoginAt) {
      user.firstLoginAt = new Date().toISOString();
      this.saveAccounts(accounts);
    }

    const session = {
      role:     user.role,
      userId:   user.id,
      name:     user.name,
      avatar:   user.avatar,
      linkedId: user.linkedId
    };

    sessionStore.set(STORAGE_KEY_SESSION, session);

    const redirectMap = {
      admin:   'school/index.html',
      student: 'student/index.html',
      parent:  'parent/index.html'
    };

    return { ok: true, redirect: redirectMap[user.role] };
  },

  /* logout — xóa session → về trang đăng nhập */
  logout() {
    sessionStore.remove(STORAGE_KEY_SESSION);
    this._redirectToLogin();
  },

  /* Đối chiếu phiên với tài khoản hiện tại trong danh sách tài khoản */
  _validate(session) {
    const acc = this.getAccounts().find(a => a.id === session.userId);
    if (!acc) {
      return { ok: false, reason: 'Tài khoản không còn tồn tại. Vui lòng liên hệ Ban Giám Hiệu.' };
    }
    if (acc.locked) {
      return { ok: false, reason: 'Tài khoản đã bị tạm khóa. Vui lòng liên hệ Ban Giám Hiệu.' };
    }
    if (acc.role !== session.role) {
      return { ok: false, reason: 'Thông tin tài khoản đã được thay đổi. Vui lòng đăng nhập lại.' };
    }
    const fresh = { role: acc.role, userId: acc.id, name: acc.name, avatar: acc.avatar, linkedId: acc.linkedId };
    if (JSON.stringify(fresh) !== JSON.stringify(session)) {
      sessionStore.set(STORAGE_KEY_SESSION, fresh);
    }
    return { ok: true, session: fresh, sig: JSON.stringify([acc.name, acc.avatar, acc.linkedId, acc.xp]) };
  },

  /* Kết thúc phiên (kèm lý do hiện ở trang đăng nhập) */
  _endSession(reason) {
    sessionStore.remove(STORAGE_KEY_SESSION);
    if (reason) sessionStore.setRaw(STORAGE_KEY_FLASH, reason);
    if (document.body && document.body.classList.contains('page-login')) return;
    this._redirectToLogin();
  },

  /* Theo dõi thay đổi tài khoản từ tab khác (vd BGH khóa, sửa thông tin) */
  _watch() {
    const session = this.getSession();
    if (!session || !this._sig) return;       // chỉ theo dõi trang đã qua auth.check
    const state = this._validate(session);
    if (!state.ok) { this._endSession(state.reason); return; }
    if (state.sig !== this._sig) this._reload();
  },

  _reload() { window.location.reload(); },

  /* Xác định đường dẫn index.html (login) từ thư mục hiện tại.
   * Cấu trúc cố định:
   *   root/index.html         ← trang đăng nhập
   *   root/js/auth.js
   *   root/school/index.html  → prefix = ../
   *   root/student/*.html     → prefix = ../
   *   root/parent/index.html  → prefix = ../
   * Tất cả trang trong subfolder cần đúng 1 cấp lên để về root.
   */
  _redirectToLogin() {
    const path     = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    // segments.length >= 2: đang trong subfolder → cần ../
    // segments.length <= 1: đang ở root → không cần prefix
    const prefix = segments.length >= 2 ? '../' : '';
    window.location.href = prefix + 'index.html';
  }

};

/* Khi BGH khóa, xóa hoặc sửa tài khoản ở tab khác: áp dụng ngay cho tab đang đăng nhập */
window.addEventListener('storage', e => {
  if (e.key === null || e.key === STORAGE_KEY_ACCOUNTS) auth._watch();
});
window.addEventListener('focus', () => auth._watch());
