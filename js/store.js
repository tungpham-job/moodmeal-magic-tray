/* ═══════════════════════════════════════════════
   store.js — Lớp truy cập dữ liệu DUY NHẤT (localStorage / sessionStorage)

   - MM_KEYS: tên mọi khóa dữ liệu. Không viết thẳng chuỗi 'mm_...' ở nơi khác.
   - store      → localStorage  (dữ liệu dùng chung giữa các tab/vai trò)
   - sessionStore → sessionStorage (phiên đăng nhập, thông báo một lần)
   Mọi hàm đọc đều an toàn: dữ liệu hỏng hoặc thiếu thì trả về giá trị dự phòng,
   không làm sập trang. Hàm ghi trả về true/false (false khi đầy bộ nhớ hoặc bị chặn).

   Khi chuyển sang backend (Google Sheets), chỉ cần thay phần bên trong file này.
   Nạp sau seed.js/utils.js, trước auth.js.
═══════════════════════════════════════════════ */

const MM_KEYS = {
  // localStorage
  ACCOUNTS:    'mm_accounts',
  MENU:        'mm_daily_menu',
  INGREDIENTS: 'mm_ingredients',
  NUTRITION:   'mm_nutrition_table',  // bảng dinh dưỡng chuẩn để BGH chọn nguyên liệu
  SCORE_FORMULA: 'mm_score_formula',  // công thức tính điểm cân bằng năng lượng của khay
  XP_CONFIG:   'mm_xp_config',
  BADGES:      'mm_badges',
  CRITERIA:    'mm_grading_criteria',
  FAS_LOG:     'mm_fas_log',
  TRAY_LOG:    'mm_tray_log',
  XP_LOG:      'mm_xp_log',
  BADGES_LOG:  'mm_badges_log',
  DEMO_DATE:   'mm_demo_date',        // chuỗi YYYY-MM-DD (không phải JSON)
  SCHEMA:      'mm_schema_version',   // số nguyên
  // sessionStorage
  SESSION:     'mm_session',
  FLASH:       'mm_flash',            // chuỗi (không phải JSON)
};

function mmMakeStore(area) {
  const w = () => (area === 'session' ? window.sessionStorage : window.localStorage);
  return {
    /* Đọc JSON; thiếu hoặc hỏng → fallback */
    get(key, fallback) {
      try {
        const v = JSON.parse(w().getItem(key));
        return v === null || v === undefined ? fallback : v;
      } catch (e) { return fallback; }
    },
    /* Ghi JSON; trả về true nếu ghi được */
    set(key, value) {
      try { w().setItem(key, JSON.stringify(value)); return true; }
      catch (e) { console.warn('Không ghi được ' + key, e); return false; }
    },
    /* Chuỗi thô (không JSON), cho các khóa DEMO_DATE, FLASH */
    getRaw(key) { try { return w().getItem(key); } catch (e) { return null; } },
    setRaw(key, str) {
      try { w().setItem(key, String(str)); return true; }
      catch (e) { console.warn('Không ghi được ' + key, e); return false; }
    },
    has(key) { try { return w().getItem(key) !== null; } catch (e) { return false; } },
    remove(key) { try { w().removeItem(key); } catch (e) { /* bỏ qua */ } },
  };
}

const store        = mmMakeStore('local');
const sessionStore = mmMakeStore('session');
