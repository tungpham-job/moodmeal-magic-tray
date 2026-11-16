# MOODMEAL MAGIC TRAY v3

Magic Minds · STEMPETITION 2027

Game web giúp học sinh khám phá món ăn mới qua thực đơn bữa trưa của trường: học sinh đánh giá món bằng emoji (điểm FAS), thiết kế khay cơm gửi cho ba mẹ nấu ở nhà; phụ huynh theo dõi tiến trình của con; Ban giám hiệu (BGH) cấu hình thực đơn, XP, danh hiệu và xem báo cáo.

Công nghệ: HTML + CSS + JavaScript thuần, dữ liệu demo lưu trong `localStorage` của trình duyệt (chưa có backend; Google Sheets là Bước 5 trong `MoodMeal_v3_Spec.md`).

## Chạy thử

Mở trang bằng một máy chủ tĩnh (không mở trực tiếp bằng `file://`):

```
python -m http.server 8000
```

rồi vào <http://localhost:8000/>. Bản chạy thật: GitHub Pages (chỉ chứa phần frontend).

## Tài khoản demo

| Vai trò | ID | Mật khẩu |
|---------|----|----------|
| Ban giám hiệu | `admin` | `admin2026` |
| Học sinh | `phambaotruc` · `nguyenminhan` · `tranthanhkhoa` | `hs001` · `hs002` · `hs003` |
| Phụ huynh | `phbaotruc` · `phminhan` · `phthanhkhoa` | `ph001` · `ph002` · `ph003` |

Đây là tài khoản mẫu cho demo; không dùng mật khẩu này với dữ liệu thật.

## Dữ liệu mẫu và đặt lại

- Mọi dữ liệu mặc định/mẫu nằm trong **`js/seed.js`** (tài khoản, XP, danh hiệu, tiêu chí, nguyên liệu, thực đơn, nhật ký mẫu). Muốn thêm dữ liệu mẫu: sửa file này.
- **Thứ tự nạp script bắt buộc trên mọi trang: `config.js` → `seed.js` → `utils.js` → `store.js` → `auth.js`** (thiếu một file, trình duyệt báo lỗi trong Console).
- Đổi **cấu trúc** dữ liệu: tăng `MM_SCHEMA_VERSION` trong `seed.js` và thêm hàm nâng cấp vào `MM_MIGRATIONS`; dữ liệu cũ trong trình duyệt tự được nâng cấp khi mở trang.
- Lần đầu mở web trên một trình duyệt, dữ liệu mẫu tự được tạo (thực đơn có thêm món "Trứng chiên" cho ngày hôm nay).
- Trang đăng nhập có nút **"↻ Đặt lại dữ liệu demo"** (xóa dữ liệu thử nghiệm, đưa "Ngày hôm nay" về ngày thật, tạo lại dữ liệu mẫu) và ô **"Ngày hôm nay"** để giả lập ngày khi demo.

## Cấu trúc thư mục

```
index.html            trang đăng nhập (điểm vào)
css/                  base.css (dùng chung) · student.css · school.css · parent.css
js/
  config.js           cờ MM_CONFIG.DEMO_MODE (true = bản demo; false = bản chạy thật)
  seed.js             dữ liệu mặc định + mẫu, phiên bản dữ liệu, hàm mmSeedAll()
  utils.js            escHtml(), toLocalDateStr(), normFood()
  store.js            MM_KEYS (tên khóa) + store / sessionStore (đọc ghi localStorage / sessionStorage)
  auth.js             đăng nhập, session, bảo vệ trang
  xp.js               sổ XP và Level (Học sinh + Phụ huynh)
  badges.js           danh hiệu (BGH + Phụ huynh)
student/              giao diện Học sinh (index + screen1–3, js/)
parent/               giao diện Phụ huynh
school/               giao diện Ban giám hiệu
tools/bump_version.py đổi chuỗi ?v= của mọi css/js (xem bên dưới)
tests/smoke_test.py   kiểm thử khói bằng Playwright
MoodMeal_v3_Spec.md   đặc tả chi tiết (nằm trong Project STEMPETITION 2027 trên claude.ai)
```

## Quy tắc khi sửa code

- Đọc/ghi dữ liệu chỉ qua `store` / `sessionStore` và tên khóa `MM_KEYS.*` (`js/store.js`); không gọi `localStorage` hay viết thẳng chuỗi `'mm_...'`.
- Chuỗi người dùng nhập (tên khay, tên món, tên học sinh, ghi chú…) khi đưa vào `innerHTML` hoặc template string **phải bọc `escHtml()`**.
- Ngày dùng `toLocalDateStr()`, không dùng `toISOString()` để lấy ngày.
- Sau khi sửa file `.css`/`.js`, chạy `python tools/bump_version.py` để trình duyệt (GitHub Pages) tải bản mới, rồi bấm Ctrl+F5 khi kiểm tra.

## Bản chạy thật (chưa có backend)

Đổi `DEMO_MODE` thành `false` trong `js/config.js`: tắt đồng hồ demo, ẩn khối tài khoản thử nghiệm ở trang đăng nhập, và dữ liệu khởi tạo chỉ gồm mặc định hệ thống + tài khoản `admin` (BGH tự tạo tài khoản học sinh, phụ huynh).

## Kiểm thử

```
pip install playwright
playwright install chromium
python tests/smoke_test.py
```

Script tự bật máy chủ tĩnh ở một cổng trống, chạy qua 3 vai trò và in kết quả từng bước (thoát với mã 1 nếu có bước lỗi). Việc kiểm tra trên điện thoại/trình duyệt thật vẫn cần làm thủ công.
