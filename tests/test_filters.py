#!/usr/bin/env python3
"""Kiểm thử bộ lọc Quản lý tài khoản (Vai trò · Lớp · Level · Trạng thái), nút Làm mới bỏ lọc (Tài khoản, Báo cáo FAS) và thanh tab Thiết lập cố định.
Chạy:  python tests/test_filters.py
"""
import json, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
res = []

def check(name, ok, detail=''):
    res.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))

def ls(pg, k): return json.loads(pg.evaluate(f"localStorage.getItem('{k}')") or 'null')

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 1400, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(base + '/index.html'); pg.click('#btnResetBig'); pg.wait_for_timeout(2500)
    pg.fill('#username', 'admin'); pg.fill('#password', 'admin2026'); pg.click('#btnSubmit'); pg.wait_for_timeout(1500)
    vis = lambda: pg.locator('#accountsTbody tr:visible').count()
    acc = ls(pg, 'mm_accounts')

    print('A. Bộ lọc tài khoản')
    xs = pg.evaluate("['accFilterRole','accFilterClass','accFilterLevel','accFilterStatus','accSearch'].map(i=>document.getElementById(i).getBoundingClientRect())")
    ys = {round(r['y']) for r in xs}
    check('thứ tự trái→phải: Vai trò, Lớp, Level, Trạng thái, Tìm kiếm', all(xs[i]['x'] < xs[i + 1]['x'] for i in range(4)) or len(ys) > 1, [round(r['x']) for r in xs])
    check('có 4 combobox với giá trị mặc định "Tất cả"', pg.evaluate("['accFilterRole','accFilterClass','accFilterLevel','accFilterStatus'].every(i=>document.getElementById(i).value==='')"))
    check('ô Level liệt kê đúng các level cấu hình', pg.locator('#accFilterLevel option').all_inner_texts()[1:] == ['Level 1 · Người mới', 'Level 2 · Người khám phá', 'Level 3 · Nhà thám hiểm', 'Level 4 · Đại sứ dinh dưỡng'], pg.locator('#accFilterLevel option').all_inner_texts())
    pg.select_option('#accFilterRole', 'student'); pg.wait_for_timeout(150)
    check('Vai trò = Học sinh: 150 dòng', vis() == 150, vis())
    pg.select_option('#accFilterRole', 'parent'); pg.wait_for_timeout(150)
    check('Vai trò = Phụ huynh: 1 dòng', vis() == 1)
    pg.select_option('#accFilterRole', 'admin'); pg.wait_for_timeout(150)
    check('Vai trò = BGH: 1 dòng', vis() == 1)
    pg.select_option('#accFilterRole', 'student')
    pg.select_option('#accFilterClass', '5A11'); pg.wait_for_timeout(150)
    check('Học sinh + lớp 5A11: 30 dòng', vis() == 30, vis())
    # level
    lv = {a['id']: a for a in acc}
    levels = pg.evaluate("Object.fromEntries([...document.querySelectorAll('#accountsTbody tr')].map(r=>[r.dataset.id,r.dataset.level]))")
    want = sum(1 for a in acc if a['role'] == 'student' and a.get('className') == '5A11' and levels[a['id']] == '4')
    pg.select_option('#accFilterLevel', '4'); pg.wait_for_timeout(150)
    check('+ Level 4: đúng số học sinh 5A11 đang ở Level 4', vis() == want and want > 0, (vis(), want))
    check('mọi dòng còn lại hiện Level 4', all('Level 4' in t for t in pg.locator('#accountsTbody tr:visible').all_inner_texts()))
    # trạng thái: khóa 1 bạn
    pg.select_option('#accFilterLevel', ''); pg.select_option('#accFilterClass', ''); pg.select_option('#accFilterRole', '')
    pg.locator('#accountsTbody tr[data-id="hs-3a2-01"] button[title="Khóa"]').click(); pg.wait_for_timeout(300)
    check('khóa 1 tài khoản: bộ lọc vẫn giữ nguyên lựa chọn (đang "Tất cả")', vis() == 152)
    pg.select_option('#accFilterStatus', 'locked'); pg.wait_for_timeout(150)
    check('Trạng thái = Tạm khóa: đúng 1 dòng (hs-3a2-01)', vis() == 1 and 'hs-3a2-01' in pg.inner_text('#accountsTbody tr:visible'))
    pg.select_option('#accFilterStatus', 'active'); pg.wait_for_timeout(150)
    check('Trạng thái = Hoạt động: 151 dòng', vis() == 151, vis())
    check('Thanh số lượng vẫn là toàn trường khi lọc', 'Tổng 152' in ' '.join(pg.inner_text('#accCounts').split()))

    print('B. Làm mới bỏ lọc')
    pg.select_option('#accFilterRole', 'student'); pg.select_option('#accFilterClass', '4A5'); pg.select_option('#accFilterLevel', '3'); pg.fill('#accSearch', 'an'); pg.wait_for_timeout(150)
    pg.click('#module-accounts button:has-text("Làm mới")'); pg.wait_for_timeout(400)
    check('Tài khoản: Làm mới đưa 4 combobox về "Tất cả" và xóa ô tìm kiếm', pg.evaluate("['accFilterRole','accFilterClass','accFilterLevel','accFilterStatus','accSearch'].every(i=>document.getElementById(i).value==='')") and vis() == 152, vis())
    pg.click('[data-module=report]'); pg.wait_for_timeout(1500)
    pg.select_option('#filterClass', '4A5'); pg.wait_for_timeout(400)
    pg.select_option('#filterFood', index=2); pg.select_option('#filterPlace', 'school'); pg.wait_for_timeout(400)
    n_f = pg.locator('#fasTableBody tr').count()
    pg.click('#module-report button:has-text("Làm mới")'); pg.wait_for_timeout(1500)
    check('Báo cáo FAS: Làm mới đưa Lớp / Học sinh / Nhóm / Nơi về giá trị ban đầu', pg.evaluate("['filterClass','filterStudent','filterFood','filterPlace'].every(i=>document.getElementById(i).value==='')") and pg.locator('#fasTableBody tr').count() > n_f, n_f)

    print('C. Thiết lập: thanh tab cố định')
    pg.click('[data-module=settings]'); pg.wait_for_timeout(600)
    pg.click('button.tab-btn[data-tab=menu]'); pg.mouse.move(700, 600)
    # nội dung đủ dài: mở tab Nguyên liệu (dài) rồi cuộn
    pg.click('button.tab-btn[data-tab=ingredients]'); pg.wait_for_timeout(500)
    pg.mouse.wheel(0, 900); pg.wait_for_timeout(400)
    hb = pg.evaluate("Math.round(document.querySelector('.main-header').getBoundingClientRect().bottom)")
    tb = pg.evaluate("Math.round(document.querySelector('#module-settings > .tab-bar').getBoundingClientRect().top)")
    sy = pg.evaluate("scrollY")
    check('cuộn xuống: tiêu đề trang và thanh tab vẫn ghim ở đầu', sy > 200 and tb == hb, (sy, hb, tb))
    check('không lỗi JS', not errs, errs[:3])

def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); run(b, f'http://127.0.0.1:{port}'); b.close()
    finally:
        srv.terminate()
    failed = res.count(False)
    print(f'\nTổng: {len(res)} bước, {failed} lỗi')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()
