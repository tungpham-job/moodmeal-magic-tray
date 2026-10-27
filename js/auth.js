/* ═══════════════════════════════════════════════
   auth.js — MOODMEAL MAGIC TRAY v3
   Session management · Route protection · Seed data
   Load trên MỌI trang (trừ login.html).
   Cách dùng:
     const session = auth.check('student'); // redirect nếu sai role
     auth.logout();                         // xóa session → login
═══════════════════════════════════════════════ */

/* ── 1. Seed accounts (Demo) ─────────────────── */
/*
   Production: thay bằng API call đến api.gs
   Demo: dữ liệu lưu localStorage key "mm_accounts"
   Schema mỗi account:
   {
     id:       string   — mã đăng nhập
     pass:     string   — mật khẩu (plain text cho demo)
     role:     'admin' | 'student' | 'parent'
     name:     string   — tên hiển thị
     linkedId: string | null — student↔parent link
     avatar:   string   — emoji đại diện
   }
*/
const SEED_ACCOUNTS = [
  {
    id: 'admin',
    pass: 'admin2026',
    role: 'admin',
    name: 'Ban Giám Hiệu',
    linkedId: null,
    avatar: '🏫'
  },
  {
    id: 'phambaotruc',
    pass: 'hs001',
    role: 'student',
    name: 'Phạm Bảo Trúc',
    linkedId: 'phbaotruc',
    avatar: '🧒'
  },
  {
    id: 'nguyenminhan',
    pass: 'hs002',
    role: 'student',
    name: 'Nguyễn Minh An',
    linkedId: 'phminhan',
    avatar: '🧒'
  },
  {
    id: 'tranthanhkhoa',
    pass: 'hs003',
    role: 'student',
    name: 'Trần Thanh Khoa',
    linkedId: 'phthanhkhoa',
    avatar: '🧒'
  },
  {
    id: 'phbaotruc',
    pass: 'ph001',
    role: 'parent',
    name: 'Phụ huynh Bảo Trúc',
    linkedId: 'phambaotruc',
    avatar: '👩'
  },
  {
    id: 'phminhan',
    pass: 'ph002',
    role: 'parent',
    name: 'Phụ huynh Minh An',
    linkedId: 'nguyenminhan',
    avatar: '👨'
  },
  {
    id: 'phthanhkhoa',
    pass: 'ph003',
    role: 'parent',
    name: 'Phụ huynh Thanh Khoa',
    linkedId: 'tranthanhkhoa',
    avatar: '👩'
  }
];

const STORAGE_KEY_ACCOUNTS = 'mm_accounts';
const STORAGE_KEY_SESSION  = 'mm_session';

/* ── 2. Khởi tạo seed vào localStorage ───────── */
(function initSeed() {
  if (!localStorage.getItem(STORAGE_KEY_ACCOUNTS)) {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
  }
})();

/* ── 3. Đối tượng auth (public API) ─────────── */
const auth = {

  /* Lấy session hiện tại (hoặc null) */
  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY_SESSION));
    } catch {
      return null;
    }
  },

  /* Lấy danh sách accounts từ localStorage */
  getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_ACCOUNTS)) || SEED_ACCOUNTS;
    } catch {
      return SEED_ACCOUNTS;
    }
  },

  /* Lưu danh sách accounts (dùng cho School khi CRUD) */
  saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
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

    if (requiredRole && session.role !== requiredRole) {
      this._redirectToLogin();
      return null;
    }

    return session;
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

    const session = {
      role:     user.role,
      userId:   user.id,
      name:     user.name,
      avatar:   user.avatar,
      linkedId: user.linkedId
    };

    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

    const redirectMap = {
      admin:   'school/index.html',
      student: 'student/index.html',
      parent:  'parent/index.html'
    };

    return { ok: true, redirect: redirectMap[user.role] };
  },

  /* logout — xóa session → về trang đăng nhập */
  logout() {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    this._redirectToLogin();
  },

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
