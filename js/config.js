/* ═══════════════════════════════════════════════
   config.js — Cấu hình chạy của ứng dụng
   Nạp ĐẦU TIÊN trên mọi trang (trước seed.js).

   MM_CONFIG.DEMO_MODE
     true  (mặc định) — bản demo: có dữ liệu mẫu (học sinh, phụ huynh, nhật ký, Trứng chiên),
                         đồng hồ demo ("Ngày hôm nay"), khối thử nghiệm và nút Đặt lại ở trang đăng nhập.
     false — bản chạy thật (trước khi có backend): không cài đồng hồ demo, ẩn khối thử nghiệm,
             chỉ tạo mặc định hệ thống + tài khoản admin.
   (Cấu hình AI AI_PROXY_URL / AI_ENABLED của Giai đoạn E sẽ thêm vào đây.)
═══════════════════════════════════════════════ */
const MM_CONFIG = {
  DEMO_MODE: true,
};
