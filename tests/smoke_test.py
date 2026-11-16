#!/usr/bin/env python3
"""Kiểm thử khói MOODMEAL MAGIC TRAY bằng Playwright (chạy trên trình duyệt Chromium mô phỏng).

Cài đặt một lần:   pip install playwright && playwright install chromium
Chạy:              python tests/smoke_test.py
Thoát mã 0 nếu mọi bước đạt, mã 1 nếu có bước lỗi.

Script tự bật máy chủ tĩnh ở một cổng trống, dùng trình duyệt mới (dữ liệu sạch)
và KHÔNG đụng vào dữ liệu trình duyệt thật của bạn.
"""
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
XSS_NAME = '<img src=x onerror="window.__xss=1">'      # 36 ký tự, vừa maxlength 40

results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    port = free_port()
    base = f'http://127.0.0.1:{port}'
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            run(browser, base)
            browser.close()
    finally:
        server.terminate()
    failed = results.count(False)
    print(f'\nTổng: {len(results)} bước, {failed} lỗi')
    sys.exit(1 if failed else 0)


def run(browser, base):
    page = browser.new_context().new_page()
    problems = []
    page.on('pageerror', lambda e: problems.append(f'{page.url} · {e}'))
    page.on('console', lambda m: m.type == 'error' and problems.append(f'{page.url} · console: {m.text}'))
    page.on('requestfailed', lambda r: problems.append(f'{r.url} · tải thất bại'))
    page.on('response', lambda r: r.status >= 400 and problems.append(f'{r.url} · HTTP {r.status}'))
    page.on('dialog', lambda d: d.accept())

    def ls(key):
        return json.loads(page.evaluate(f"localStorage.getItem('{key}')") or 'null')

    def login(uid, pw):
        page.goto(base + '/index.html')
        page.evaluate('sessionStorage.clear()')
        page.reload()
        page.fill('#username', uid)
        page.fill('#password', pw)
        page.click('#btnSubmit')
        page.wait_for_url(lambda u: not u.endswith('/index.html') or '/student/' in u or '/school/' in u or '/parent/' in u)
        page.wait_for_timeout(500)
        return page.url.replace(base, '')

    print('1. Máy mới: dữ liệu mẫu tự được tạo')
    page.goto(base + '/student/index.html')          # chưa đăng nhập, chưa qua trang chủ
    page.wait_for_timeout(500)
    keys = ['mm_accounts', 'mm_xp_config', 'mm_badges', 'mm_grading_criteria', 'mm_fas_log',
            'mm_tray_log', 'mm_ingredients', 'mm_daily_menu']
    check('đủ 8 khóa dữ liệu mẫu', all(ls(k) for k in keys), [k for k in keys if not ls(k)])
    menu = ls('mm_daily_menu') or []
    check('có đúng 1 món "Trứng chiên" (hôm nay)', sum(m['name'] == 'Trứng chiên' for m in menu) == 1)
    check('chưa đăng nhập thì về trang đăng nhập', page.url.endswith('/index.html'), page.url)
    check('ghi số phiên bản dữ liệu mm_schema_version = 1', ls('mm_schema_version') == 1, ls('mm_schema_version'))

    print('2. Đăng nhập 3 vai trò')
    check('học sinh → student/index.html', login('phambaotruc', 'hs001') == '/student/index.html')
    page.goto(base + '/index.html'); page.evaluate('sessionStorage.clear()'); page.reload()
    page.fill('#username', 'phambaotruc'); page.fill('#password', 'sai-mat-khau'); page.click('#btnSubmit')
    page.wait_for_timeout(500)
    check('sai mật khẩu vẫn ở trang đăng nhập', page.url.endswith('/index.html'), page.url)

    print('3. Học sinh: xem thực đơn và đánh giá món')
    login('phambaotruc', 'hs001')
    check('trang chủ có "Trứng chiên"', page.locator('text=Trứng chiên').count() > 0)
    for s in ('screen1', 'screen2', 'screen3'):
        page.goto(f'{base}/student/{s}.html'); page.wait_for_timeout(400)
    page.goto(base + '/student/screen2.html'); page.wait_for_timeout(600)
    page.locator('#food-0 .emoji-btn').nth(3).click()
    page.click('#confirmBtn-0'); page.wait_for_timeout(700)
    fas = [r for r in ls('mm_fas_log') if r['studentId'] == 'phambaotruc' and r['foodId'] == 'trung']
    check('ghi 1 dòng FAS cho Trứng', len(fas) == 1, len(fas))
    acts = sorted(r['actionId'] for r in (ls('mm_xp_log') or []))
    check('cộng XP first_try + emoji_rate', acts == ['emoji_rate', 'first_try'], acts)
    page.reload(); page.wait_for_timeout(600)
    locked = page.evaluate("[...document.querySelectorAll('#food-0 .emoji-btn')].every(b => b.disabled)")
    check('tải lại: món đã đánh giá hôm nay bị khóa (1 lần/ngày)', locked)

    print('4. Học sinh: gửi khay (tên khay chứa mã HTML độc)')
    page.goto(base + '/student/screen3.html'); page.wait_for_timeout(500)
    maxlen = page.get_attribute('#trayName', 'maxlength')
    check('ô tên khay giới hạn 40 ký tự', maxlen == '40', maxlen)
    page.click('.ing-btn[data-name="Bông cải"]'); page.click('.ing-btn[data-name="Canh chua"]')
    page.fill('#trayName', XSS_NAME)
    page.click('#familyBtn'); page.wait_for_timeout(700)
    trays = [t for t in ls('mm_tray_log') if t['studentId'] == 'phambaotruc' and t['trayName'] == XSS_NAME]
    check('khay được ghi vào mm_tray_log', len(trays) == 1, len(trays))
    page.reload(); page.wait_for_timeout(500)
    check('tải lại: nút gửi khay bị khóa (1 khay/ngày)', page.evaluate("document.getElementById('familyBtn').disabled"))
    check('không có script chạy ở trang Học sinh', page.evaluate('window.__xss') is None)

    print('5. Phụ huynh: hiển thị an toàn và xác nhận 1 lần')
    check('phụ huynh → parent/index.html', login('phbaotruc', 'ph001') == '/parent/index.html')
    page.wait_for_timeout(600)
    check('tên khay hiện dạng chữ, không chạy mã', page.evaluate('window.__xss') is None and page.locator('img[src="x"]').count() == 0)
    check('tên khay hiển thị nguyên văn', XSS_NAME in page.inner_text('body'))
    page.click('#btnConfirmYes'); page.wait_for_timeout(700)
    pc = [r for r in (ls('mm_xp_log') or []) if r['actionId'] == 'parent_confirm']
    check('con nhận XP parent_confirm', len(pc) == 1, len(pc))
    page.evaluate('confirmCooked()'); page.wait_for_timeout(300)
    pc = [r for r in (ls('mm_xp_log') or []) if r['actionId'] == 'parent_confirm']
    check('xác nhận lần 2 không cộng thêm XP', len(pc) == 1, len(pc))

    print('6. Ban giám hiệu')
    check('admin → school/index.html', login('admin', 'admin2026') == '/school/index.html')
    for mod in ('accounts', 'settings', 'report', 'proposals'):
        page.click(f'button[data-module={mod}]'); page.wait_for_timeout(300)
    check('Đề xuất thực đơn: tên khay hiện dạng chữ', page.evaluate('window.__xss') is None and page.locator('img[src="x"]').count() == 0)
    page.click('button[data-module=settings]')
    for tab in ('menu', 'ingredients', 'xp', 'badges', 'criteria'):
        page.click(f'button[data-tab={tab}]'); page.wait_for_timeout(200)
    page.click('button[data-tab=menu]')
    check('lịch thực đơn tuần có chip "Trứng chiên"', page.locator('.menu-chip:has-text("Trứng chiên")').count() == 1)
    cfg = ls('mm_xp_config'); cfg['actions'][0]['xp'] = 77
    page.evaluate("c => localStorage.setItem('mm_xp_config', JSON.stringify(c))", cfg)
    page.reload(); page.wait_for_timeout(400)
    check('cấu hình BGH đã sửa không bị seed ghi đè', ls('mm_xp_config')['actions'][0]['xp'] == 77)

    print('7. Đặt lại dữ liệu demo')
    page.goto(base + '/index.html'); page.evaluate('sessionStorage.clear()'); page.reload()
    page.evaluate("localStorage.setItem('mm_demo_date', '2026-12-25')"); page.reload()
    page.click('#btnReset'); page.wait_for_timeout(1500)
    menu = ls('mm_daily_menu') or []
    check('cấu hình về mặc định', ls('mm_xp_config')['actions'][0]['xp'] == 15)
    check('ngày giả lập bị xóa', ls('mm_demo_date') is None)
    check('sổ XP và danh hiệu đã xóa', ls('mm_xp_log') is None and ls('mm_badges_log') is None)
    check('có đúng 1 "Trứng chiên" và đủ 7 tài khoản',
          sum(m['name'] == 'Trứng chiên' for m in menu) == 1 and len(ls('mm_accounts')) == 7)

    print('8. Lớp dữ liệu và phiên bản dữ liệu')
    login('phambaotruc', 'hs001')
    before = len(problems)
    page.evaluate("localStorage.setItem('mm_fas_log', '{{khong-phai-json')")
    page.evaluate("localStorage.setItem('mm_tray_log', 'null')")
    for s_ in ('index', 'screen1', 'screen2', 'screen3'):
        page.goto(f'{base}/student/{s_}.html'); page.wait_for_timeout(400)
    check('khóa hỏng JSON không làm sập trang Học sinh', len(problems) == before, problems[before:][:3])
    page.goto(base + '/index.html'); page.evaluate('sessionStorage.clear()'); page.reload()
    page.click('#btnReset'); page.wait_for_timeout(1200)
    cfg = ls('mm_xp_config'); cfg['actions'][0]['xp'] = 88
    page.evaluate("c => localStorage.setItem('mm_xp_config', JSON.stringify(c))", cfg)
    page.evaluate("localStorage.removeItem('mm_schema_version')")           # dữ liệu cũ chưa có số phiên bản
    page.reload(); page.wait_for_timeout(400)
    check('dữ liệu cũ không có phiên bản: ghi v1, không đổi dữ liệu',
          ls('mm_schema_version') == 1 and ls('mm_xp_config')['actions'][0]['xp'] == 88)
    page.evaluate("localStorage.setItem('mm_schema_version', '99')")
    page.evaluate("localStorage.removeItem('mm_badges')")
    page.reload(); page.wait_for_timeout(400)
    check('dữ liệu mới hơn code (v99): không bị ghi đè hay seed lại',
          ls('mm_schema_version') == 99 and ls('mm_badges') is None)
    page.click('#btnReset'); page.wait_for_timeout(1200)
    check('Đặt lại đưa phiên bản về v1', ls('mm_schema_version') == 1)

    print('9. DEMO_MODE = false (bản chạy thật)')
    ctx2 = browser.new_context()
    p2 = ctx2.new_page()
    p2.on('pageerror', lambda e: problems.append(f'[demo off] {e}'))
    p2.route('**/js/config.js*', lambda r: r.fulfill(content_type='application/javascript',
                                                      body='const MM_CONFIG = { DEMO_MODE: false };'))
    p2.goto(base + '/index.html'); p2.wait_for_timeout(500)
    ls2 = lambda k: json.loads(p2.evaluate(f"localStorage.getItem('{k}')") or 'null')
    check('ẩn khối tài khoản thử nghiệm / ngày hôm nay / Đặt lại', p2.locator('.demo-info').count() == 0)
    accs = ls2('mm_accounts') or []
    check('chỉ có tài khoản admin', [a['role'] for a in accs] == ['admin'], [a['role'] for a in accs])
    check('không có nhật ký, khay, tiêu chí, thực đơn mẫu',
          all(ls2(k) == [] for k in ('mm_fas_log', 'mm_tray_log', 'mm_grading_criteria', 'mm_daily_menu')))
    check('vẫn có mặc định hệ thống (XP, danh hiệu, nguyên liệu)',
          bool(ls2('mm_xp_config')) and bool(ls2('mm_badges')) and bool(ls2('mm_ingredients')))
    p2.evaluate("localStorage.setItem('mm_demo_date', '2026-12-25')"); p2.reload(); p2.wait_for_timeout(300)
    same = p2.evaluate("toLocalDateStr(new Date()) === toLocalDateStr(new MM_RealDate())")
    check('bỏ qua ngày giả lập (đồng hồ demo tắt)', same)
    p2.fill('#username', 'admin'); p2.fill('#password', 'admin2026'); p2.click('#btnSubmit'); p2.wait_for_timeout(1000)
    check('admin vẫn đăng nhập được', p2.url.endswith('/school/index.html'), p2.url)
    ctx2.close()

    print('10. Lỗi trình duyệt trong cả phiên')
    check('không có lỗi JS / 404 / console error', not problems, problems[:5])


if __name__ == '__main__':
    main()
