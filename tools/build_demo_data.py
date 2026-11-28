#!/usr/bin/env python3
"""Đổi CSV demo thành js/demo_data.js (để trang web nạp bằng thẻ script — chạy được cả khi mở file trực tiếp).

    python tools/build_demo_data.py

Nguồn:
  demo/students.csv    id, họ_tên, lớp, mật_khẩu, kiểu (de | binh | ken)
  demo/fas_manual.csv  (tùy chọn) ghi đè điểm FAS của một bạn: id, tuần (-4…0 so với tuần hiện tại),
                       thứ (2–6), nguyên_liệu (id nguyên liệu, vd bong-cai), điểm (0–4)
Sau khi chạy: bấm "Đặt lại + dữ liệu cả khối" ở trang đăng nhập để nạp lại.
"""
import csv, json, sys, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(name, required):
    p = ROOT / 'demo' / name
    if not p.exists():
        if required: sys.exit(f'Thiếu file {p}')
        return []
    with p.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

students, seen, errs = [], set(), []
for i, r in enumerate(read('students.csv', True), start=2):
    sid, name, cls, pw, kieu = (r.get(k, '').strip() for k in ['id', 'họ_tên', 'lớp', 'mật_khẩu', 'kiểu'])
    kieu = kieu.lower()
    if not (sid and name and cls and pw): errs.append(f'students.csv dòng {i}: thiếu id/họ_tên/lớp/mật_khẩu'); continue
    if sid in seen: errs.append(f'students.csv dòng {i}: id "{sid}" bị trùng'); continue
    if kieu not in ('de', 'binh', 'ken'): errs.append(f'students.csv dòng {i}: kiểu phải là de, binh hoặc ken (đang là "{kieu}")'); continue
    seen.add(sid)
    students.append([sid, name, cls.replace(' ', '').upper(), pw, kieu])

manual = []
for i, r in enumerate(read('fas_manual.csv', False), start=2):
    try:
        sid = r['id'].strip(); w = int(r['tuần']); d = int(r['thứ']); ing = r['nguyên_liệu'].strip(); sc = int(r['điểm'])
        assert sid in seen and -4 <= w <= 0 and 2 <= d <= 6 and ing and 0 <= sc <= 4
    except Exception:
        errs.append(f'fas_manual.csv dòng {i}: dữ liệu không hợp lệ (id phải có trong students.csv, tuần -4…0, thứ 2–6, điểm 0–4)'); continue
    manual.append([sid, w, d, ing, sc])

if errs:
    print('\n'.join(errs)); sys.exit(1)

out = ROOT / 'js' / 'demo_data.js'
out.write_text(
    '/* TỰ SINH bởi tools/build_demo_data.py từ demo/*.csv — đừng sửa tay, hãy sửa CSV rồi chạy lại. */\n'
    '/* [id, họ tên, lớp, mật khẩu, kiểu] */\n'
    'const MM_DEMO_STUDENTS = ' + json.dumps(students, ensure_ascii=False, separators=(',', ':')) + ';\n'
    '/* [id, tuần, thứ, nguyên liệu, điểm] */\n'
    'const MM_DEMO_OVERRIDES = ' + json.dumps(manual, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(f'Đã tạo {out}: {len(students)} học sinh, {len(manual)} dòng ghi đè')
