#!/usr/bin/env python3
"""Tạo demo/students.csv (danh sách học sinh demo) — chạy MỘT lần, sau đó sửa CSV bằng Excel tùy ý.

    python tools/make_demo_students.py

5 lớp × 30 bạn (3A2, 4A5, 4A6, 5A11, 5A12). Lớp 5A12 đã có Phạm Bảo Trúc (tài khoản mẫu) nên chỉ tạo thêm 29 bạn.
Cột "kiểu" quyết định cách chương trình sinh điểm FAS: de (dễ ăn) · binh (bình thường) · ken (kén ăn).
Tên là tên giả, ghép ngẫu nhiên (cố định hạt giống nên chạy lại ra cùng kết quả).
"""
import csv, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLASSES = ['3A2', '4A5', '4A6', '5A11', '5A12']
PER_CLASS = 30
HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
LOT_NAM = ['Minh', 'Quốc', 'Gia', 'Anh', 'Đức', 'Hoàng', 'Thanh', 'Nhật', 'Bảo', 'Tuấn']
LOT_NU = ['Ngọc', 'Thùy', 'Bảo', 'Khánh', 'Mai', 'Thanh', 'Gia', 'Phương', 'Hà', 'Diệu']
TEN_NAM = ['An', 'Bảo', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Hùng', 'Huy', 'Khang', 'Khoa', 'Long', 'Minh', 'Nam', 'Nhân', 'Phúc', 'Quân', 'Sơn', 'Thái', 'Thành', 'Tín', 'Trí', 'Trung', 'Tuấn', 'Việt', 'Vinh']
TEN_NU = ['An', 'Anh', 'Châu', 'Chi', 'Diệp', 'Hân', 'Hương', 'Khuê', 'Lan', 'Linh', 'My', 'Ngân', 'Nhi', 'Như', 'Oanh', 'Phương', 'Quyên', 'Thảo', 'Trang', 'Trúc', 'Uyên', 'Vy', 'Yến', 'Xuân']

rnd = random.Random(2027)
used = {'Phạm Bảo Trúc'}
rows = []
for cls in CLASSES:
    start = 2 if cls == '5A12' else 1                    # số thứ tự 01 của 5A12 là Bảo Trúc
    for n in range(start, PER_CLASS + 1):
        while True:
            nam = rnd.random() < 0.5
            name = f"{rnd.choice(HO)} {rnd.choice(LOT_NAM if nam else LOT_NU)} {rnd.choice(TEN_NAM if nam else TEN_NU)}"
            if name not in used:
                used.add(name); break
        kieu = rnd.choices(['de', 'binh', 'ken'], weights=[30, 45, 25])[0]
        rows.append((f"hs-{cls.lower()}-{n:02d}", name, cls, 'hs2026', kieu))

out = ROOT / 'demo' / 'students.csv'
out.parent.mkdir(exist_ok=True)
with out.open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['id', 'họ_tên', 'lớp', 'mật_khẩu', 'kiểu'])
    w.writerows(rows)
print(f'Đã tạo {out} ({len(rows)} học sinh)')
