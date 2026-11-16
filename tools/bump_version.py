#!/usr/bin/env python3
"""Đổi chuỗi ?v= của MỌI css/js nội bộ trong các file .html về cùng một giá trị.

Dùng sau khi sửa css/js để trình duyệt (GitHub Pages) tải bản mới:
    python tools/bump_version.py            # dùng ngày giờ hiện tại (YYYYMMDDHHMM)
    python tools/bump_version.py 20261116d  # hoặc tự đặt chuỗi

Chỉ đụng vào thẻ <script src> và <link href> trỏ tới file .js/.css cục bộ
(bỏ qua đường dẫn http/https), không sửa gì khác.
"""
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
stamp = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime('%Y%m%d%H%M')

# src="..."/href="..." trỏ tới .js/.css cục bộ, kèm ?v=... (nếu có)
PATTERN = re.compile(r'''((?:src|href)=["'])((?!https?:|//)[^"'?#]+\.(?:js|css))(?:\?v=[^"']*)?(["'])''')

changed = 0
for html in sorted(ROOT.rglob('*.html')):
    if any(part in ('node_modules', '.git', 'Claude outputs') for part in html.parts):
        continue
    text = html.read_text(encoding='utf-8')
    new = PATTERN.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={stamp}{m.group(3)}', text)
    if new != text:
        html.write_text(new, encoding='utf-8')
        changed += 1
        print('cập nhật', html.relative_to(ROOT))
print(f'Xong: {changed} file, v={stamp}')
