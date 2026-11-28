#!/usr/bin/env python3
"""Kiểm thử tách dữ liệu: mmSetDefaultData (mặc định hệ thống) và mmSetDemoData (demo), máy mới, DEMO_MODE=false, thực đơn hôm nay.
Chạy:  python tests/test_seed_split.py
"""
import json, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
res = []

def check(name, ok, detail=''):
    res.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))

def page_at(browser, base, iso, demo=True):
    ctx = browser.new_context(viewport={'width': 1200, 'height': 800})
    if iso: ctx.clock.install(time=iso)
    if not demo:
        ctx.route('**/js/config.js*', lambda r: r.fulfill(status=200, content_type='application/javascript',
                  body=(ROOT / 'js' / 'config.js').read_text(encoding='utf-8').replace('DEMO_MODE: true', 'DEMO_MODE: false')))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(base + '/index.html'); pg.wait_for_timeout(500)
    return pg, errs

ls = lambda pg, k: json.loads(pg.evaluate(f"localStorage.getItem('{k}')") or 'null')

def run(browser, base):
    print('A. Máy mới (DEMO_MODE bật): có cả mặc định lẫn demo cơ bản')
    pg, errs = page_at(browser, base, '2026-12-02T09:00:00')       # thứ Tư
    acc = ls(pg, 'mm_accounts'); menu = ls(pg, 'mm_daily_menu')
    check('tài khoản: admin + Bảo Trúc + phụ huynh', [a['id'] for a in acc] == ['admin', 'phambaotruc', 'phbaotruc'], [a['id'] for a in acc])
    check('có cấu hình mặc định (XP, nhóm thực phẩm, huy hiệu, nguyên liệu)', all(ls(pg, k) for k in ['mm_xp_config', 'mm_food_groups', 'mm_badges', 'mm_ingredients']))
    check('nhật ký FAS rỗng', ls(pg, 'mm_fas_log') == [])
    days = sorted({m['date'] for m in menu})
    check('thực đơn demo: 10 ngày (tuần này + tuần sau), mỗi ngày 3 món, không có "Trứng chiên"', len(days) == 10 and all(sum(1 for m in menu if m['date'] == d) == 3 for d in days) and not any(m['name'] == 'Trứng chiên' for m in menu), days)
    check('thứ Tư 02/12: hôm nay có đúng 3 món, 1 món Rau', sum(1 for m in menu if m['date'] == '2026-12-02') == 3 and sum(1 for m in menu if m['date'] == '2026-12-02' and m['groupId'] == 'g-rau') == 1)

    print('B. Cuối tuần: hôm nay tự có 3 món (lấy của thứ Hai)')
    pg, errs = page_at(browser, base, '2026-11-28T09:00:00')       # thứ Bảy
    menu = ls(pg, 'mm_daily_menu'); today = [m for m in menu if m['date'] == '2026-11-28']
    mon = [m['name'] for m in menu if m['date'] == '2026-11-23']
    check('thứ Bảy 28/11: hôm nay có đúng 3 món, có 1 món Rau, cùng tên với món thứ Hai', len(today) == 3 and sum(1 for m in today if m['groupId'] == 'g-rau') == 1 and [m['name'] for m in today] == mon, today)
    check('thực đơn 10 ngày T2–T6 vẫn đủ + hôm nay (11 ngày)', len({m['date'] for m in menu}) == 11)

    print('C. Tách riêng hai hàm')
    pg.evaluate("mmSetDefaultData({force:true})")
    acc = ls(pg, 'mm_accounts')
    check('mmSetDefaultData(force): chỉ còn admin, thực đơn rỗng, FAS rỗng, vẫn có nguyên liệu', [a['id'] for a in acc] == ['admin'] and ls(pg, 'mm_daily_menu') == [] and ls(pg, 'mm_fas_log') == [] and len(ls(pg, 'mm_ingredients')) >= 10, [a['id'] for a in acc])
    pg.evaluate("localStorage.setItem('mm_demo_date','2026-10-01')")
    pg.evaluate("mmSetDemoData()")
    acc = ls(pg, 'mm_accounts')
    check('mmSetDemoData: thêm Bảo Trúc (XP 605, 5A12) + phụ huynh, thực đơn demo', [a['id'] for a in acc] == ['admin', 'phambaotruc', 'phbaotruc'] and acc[1]['xp'] == 605 and acc[1]['className'] == '5A12' and len(ls(pg, 'mm_daily_menu')) >= 30)
    check('mmSetDemoData: đưa "Ngày hôm nay" về ngày thật (xóa mm_demo_date)', pg.evaluate("localStorage.getItem('mm_demo_date')") is None)
    pg.evaluate("mmSetDemoData()")
    check('gọi lại mmSetDemoData không nhân đôi tài khoản', len(ls(pg, 'mm_accounts')) == 3)

    print('D. DEMO_MODE = false: chỉ dữ liệu mặc định')
    pg, errs = page_at(browser, base, None, demo=False)
    acc = ls(pg, 'mm_accounts')
    check('chỉ có admin, thực đơn và FAS rỗng, vẫn có cấu hình mặc định', [a['id'] for a in acc] == ['admin'] and ls(pg, 'mm_daily_menu') == [] and ls(pg, 'mm_fas_log') == [] and bool(ls(pg, 'mm_xp_config')) and bool(ls(pg, 'mm_food_groups')))
    check('không lỗi JS khi tải trang', not errs, errs)

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
