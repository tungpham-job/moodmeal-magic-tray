MOODMEAL MAGIC TRAY v3
Magic Minds · STEMPETITION 2027
Cập nhật: 10/2026
═══════════════════════════════════════════════

CẤU TRÚC THƯ MỤC
─────────────────────────────────────────────
moodmeal-magic-tray/
│
├── index.html                ← Trang đăng nhập (entry point)
│                               Mở trình duyệt vào thư mục này
│                               sẽ tự load trang đăng nhập
│
├── css/
│   ├── base.css              ← CSS variables, reset, typography
│   │                           Dùng chung cho cả 3 giao diện
│   ├── school.css            ← Layout desktop sidebar (BGH)
│   ├── student.css           ← Phone frame + game UI (Học sinh)
│   └── parent.css            ← Phone frame + card layout (Phụ huynh)
│
├── js/
│   └── auth.js               ← Đăng nhập, session, route protection
│                               Seed tài khoản demo vào localStorage
│
├── school/
│   ├── index.html            ← Giao diện Ban Giám Hiệu
│   └── js/
│       └── school.js         ← Logic 4 module:
│                               ① Tài khoản (CRUD, import CSV)
│                               ② Thiết lập (Thực đơn / XP & Level
│                                  / Danh hiệu / Tiêu chí chấm)
│                               ③ Báo cáo FAS
│                               ④ Đề xuất thực đơn + chấm điểm
│
├── student/
│   ├── index.html            ← Trang chủ học sinh
│   ├── screen1.html          ← Bản đồ Hành tinh
│   ├── screen2.html          ← Thử món & Đánh giá (FAS)
│   ├── screen3.html          ← Thiết kế Khay cơm → Gửi ba mẹ
│   └── js/
│       ├── nav.js            ← Highlight bottom nav theo URL
│       ├── screen1.js        ← Planet popup logic
│       ├── screen2.js        ← Emoji rating + FAS chart
│       └── screen3.js        ← Tray design, highlight, tray_log
│
└── parent/
    ├── index.html            ← Giao diện Phụ huynh (1 màn)
    └── js/
        └── parent.js         ← Logic 3 section:
                                ① Tiến trình con (XP, badge, FAS)
                                ② Gợi ý nấu ăn + xác nhận
                                ③ Lịch sử xác nhận (timeline)

═══════════════════════════════════════════════
TÀI KHOẢN DEMO (localStorage seed)
─────────────────────────────────────────────
  Ban Giám Hiệu : admin        / admin2026
  Học sinh      : phambaotruc  / hs001
  Học sinh      : nguyenminhan / hs002
  Học sinh      : tranthanhkhoa/ hs003
  Phụ huynh     : phbaotruc    / ph001
  Phụ huynh     : phminhan     / ph002
  Phụ huynh     : phthanhkhoa  / ph003

═══════════════════════════════════════════════
LUỒNG DỮ LIỆU (localStorage keys)
─────────────────────────────────────────────
  mm_accounts       Danh sách tài khoản
  mm_daily_menu     Thực đơn theo ngày (BGH thiết lập)
  mm_fas_log        Lịch sử đánh giá FAS của học sinh
  mm_tray_log       Khay cơm học sinh gửi ba mẹ
  mm_badges         Danh sách danh hiệu
  mm_xp_config      Cấu hình XP & Level
  mm_grading_criteria Bộ tiêu chí chấm đề xuất
  mm_session        Session đăng nhập (sessionStorage)

═══════════════════════════════════════════════
LUỒNG SỬ DỤNG
─────────────────────────────────────────────
  1. BGH đăng nhập → Thiết lập thực đơn tuần
  2. Học sinh đăng nhập → Xem thực đơn (screen1)
                        → Thử món & đánh giá FAS (screen2)
                        → Thiết kế khay cơm → Gửi ba mẹ (screen3)
  3. Phụ huynh đăng nhập → Nhận gợi ý nấu ăn
                          → Xác nhận "Con đã ăn ở nhà"
  4. BGH → Đề xuất thực đơn → Xem xác nhận PH → Chấm điểm


