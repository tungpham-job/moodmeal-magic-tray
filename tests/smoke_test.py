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
    accept_dialog = lambda d: d.accept()
    page.on('dialog', accept_dialog)

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
    check('ghi số phiên bản dữ liệu mm_schema_version = 2', ls('mm_schema_version') == 2, ls('mm_schema_version'))

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
    radios = page.locator('#food-0 [role=radiogroup][aria-labelledby=emojiQ-0] [role=radio]')
    check('nút emoji: nhóm radiogroup có nhãn + 4 nút radio', page.locator('#food-0 [role=radiogroup][aria-labelledby=emojiQ-0]').count() == 1 and radios.count() == 4)
    labels = [radios.nth(k).get_attribute('aria-label') or '' for k in range(4)]
    check('mỗi nút có aria-label "tên, n điểm"', all(l.endswith(' điểm') for l in labels) and labels[0].startswith('Rất thích'), labels)
    check('ban đầu không nút nào được chọn (aria-checked)', page.locator('#food-0 [aria-checked=true]').count() == 0)
    style = page.evaluate("""() => { const b = document.querySelectorAll('#food-0 .emoji-btn');
      const c = getComputedStyle(b[0]), l = getComputedStyle(b[0].querySelector('.e-label'));
      return {w: c.borderTopWidth, col: c.borderTopColor, lab: l.fontSize, min: parseFloat(c.minHeight)}; }""")
    check('nút chưa chọn: viền 2px #E8ECF0, nhãn 11px, cao ≥ 64px',
          style['w'] == '2px' and style['col'] == 'rgb(232, 236, 240)' and style['lab'] == '11px' and style['min'] >= 64, style)
    radios.nth(1).focus(); page.keyboard.press('ArrowRight')
    check('phím mũi tên đổi lựa chọn (radio)', radios.nth(2).get_attribute('aria-checked') == 'true' and radios.nth(1).get_attribute('aria-checked') == 'false')
    page.wait_for_timeout(350)                       # chờ hiệu ứng chuyển màu 0,15s kết thúc
    sel = page.evaluate("""() => { const b = document.querySelector('#food-0 .emoji-btn.selected');
      const c = getComputedStyle(b); return {w: c.borderTopWidth, bg: c.backgroundColor, tick: getComputedStyle(b.querySelector('.e-tick')).display}; }""")
    check('nút đã chọn: viền 3px, nền xanh #D5F5E3, hiện dấu ✓',
          sel['w'] == '3px' and sel['bg'] == 'rgb(213, 245, 227)' and sel['tick'] == 'block', sel)
    ta = page.locator('#food-0 [role=radiogroup][aria-labelledby=taQ-0] [role=radio]')
    check('hỏi "thử lại": nhóm radiogroup có nhãn + 2 nút Muốn / Để sau', ta.count() == 2 and (ta.nth(0).inner_text(), ta.nth(1).inner_text()) == ('Muốn', 'Để sau'))
    check('hỏi "thử lại": có nhãn +3 XP (đọc từ bảng BGH)', '+3 XP' in page.inner_text('#taCard-0'), page.inner_text('#taCard-0'))
    dim = page.evaluate("""() => { const b = document.querySelector('#taCard-0 .ta-btn').getBoundingClientRect();
      const c = document.querySelector('#confirmBtn-0'); const cr = c.getBoundingClientRect();
      return {w: Math.round(b.width), h: Math.round(b.height), ch: Math.round(cr.height), cf: getComputedStyle(c).fontSize,
              q: document.getElementById('taQ-0').innerText}; }""")
    check('khối "thử lại": một hàng, nút 70×36px, câu hỏi "Thử lại lần sau?"', dim['w'] == 70 and dim['h'] == 36 and dim['q'] == 'Thử lại lần sau?', dim)
    nb = page.evaluate("getComputedStyle(document.getElementById('taCard-0')).borderTopWidth")
    check('khối "thử lại": không còn khung viền xám', nb == '0px', nb)
    check('nút "Xác nhận đánh giá": cao 45px, chữ 15px', dim['ch'] == 45 and dim['cf'] == '15px', dim)
    one_row = page.evaluate("(() => { const q = document.getElementById('taQ-0').getBoundingClientRect(), b = document.querySelector('#taCard-0 .ta-btn').getBoundingClientRect(); return q.top < b.bottom && q.bottom > b.top && document.getElementById('taCard-0').getBoundingClientRect().height < 50; })()")
    centered = page.evaluate("(() => { const c = document.getElementById('taCard-0').getBoundingClientRect(), q = document.getElementById('taQ-0').getBoundingClientRect(), bs = document.querySelectorAll('#taCard-0 .ta-btn'), r = bs[bs.length - 1].getBoundingClientRect(); return {left: Math.round(q.left - c.left), right: Math.round(c.right - r.right), gap: Math.round(bs[0].getBoundingClientRect().left - document.querySelector('#taCard-0 .ta-xp').getBoundingClientRect().right)}; })()")
    check('khối "thử lại": nội dung và 2 nút canh giữa, nằm gần nhau', abs(centered['left'] - centered['right']) <= 2 and centered['gap'] <= 16, centered)
    check('khối "thử lại" gọn (cao dưới 50px, câu hỏi và nút cùng hàng)', one_row)
    check('hỏi "thử lại": ban đầu chưa chọn gì', page.locator('#taCard-0 [aria-checked=true]').count() == 0)
    ta.nth(0).click(); page.wait_for_timeout(350)
    tas = page.evaluate("""() => { const b = document.querySelector('#taCard-0 .ta-btn.selected'); const c = getComputedStyle(b);
      return {txt: b.innerText, w: c.borderTopWidth, bg: c.backgroundColor}; }""")
    check('chọn "Muốn": viền 3px, nền xanh #D5F5E3', tas['txt'] == 'Muốn' and tas['w'] == '3px' and tas['bg'] == 'rgb(213, 245, 227)', tas)
    ta.nth(0).click()
    check('bấm lại nút đã chọn: bỏ chọn', page.locator('#taCard-0 [aria-checked=true]').count() == 0)
    ta.nth(0).focus(); page.keyboard.press('ArrowRight')
    check('phím mũi tên chọn "Để sau"', ta.nth(1).get_attribute('aria-checked') == 'true' and ta.nth(0).get_attribute('aria-checked') == 'false')
    ta.nth(0).click()
    page.locator('#food-0 .emoji-btn').nth(3).click()
    page.click('#confirmBtn-0'); page.wait_for_timeout(700)
    fas = [r for r in ls('mm_fas_log') if r['studentId'] == 'phambaotruc' and r['foodId'] == 'trung']
    check('ghi 1 dòng FAS cho Trứng', len(fas) == 1, len(fas))
    check('FAS ghi tryAgain = true khi chọn "Muốn"', len(fas) == 1 and fas[0].get('tryAgain') is True)
    acts = sorted(r['actionId'] for r in (ls('mm_xp_log') or []))
    check('cộng XP first_try + emoji_rate + try_again', acts == ['emoji_rate', 'first_try', 'try_again'], acts)
    check('thông báo kết quả được đọc qua vùng aria-live', len(page.inner_text('#live-0') if page.locator('#live-0').count() else '') > 0)
    page.reload(); page.wait_for_timeout(600)
    locked = page.evaluate("[...document.querySelectorAll('#food-0 .emoji-btn')].every(b => b.disabled)")
    check('tải lại: món đã đánh giá hôm nay bị khóa (1 lần/ngày)', locked)
    ta_locked = page.evaluate("[...document.querySelectorAll('#food-0 .ta-btn')].every(b => b.disabled)")
    ta_on = page.evaluate("document.querySelector('#taCard-0 .ta-btn.selected')?.innerText")
    check('tải lại: khối "thử lại" bị khóa và hiện "Muốn"', ta_locked and ta_on == 'Muốn', ta_on)

    page.goto(base + '/student/screen1.html'); page.wait_for_timeout(500)
    icons = {}
    for pn in ('Đạm', 'Xanh lá'):
        page.evaluate("n => showPopup(PLANET_STATES.find(p => p.name === n).key)", pn)
        icons[pn] = page.locator('#popupContent .popup-item .pi-icon').first.inner_text()
    check('popup hành tinh: món đã thử dùng icon nguyên liệu (Trứng 🥚, Bông cải xanh 🥦)', icons == {'Đạm': '🥚', 'Xanh lá': '🥦'}, icons)

    print('4. Học sinh: gửi khay (tên khay chứa mã HTML độc)')
    page.goto(base + '/student/screen3.html'); page.wait_for_timeout(500)
    maxlen = page.get_attribute('#trayName', 'maxlength')
    check('ô tên khay giới hạn 40 ký tự', maxlen == '40', maxlen)
    fb = page.evaluate("(() => { const b = document.getElementById('familyBtn'); return {h: Math.round(b.getBoundingClientRect().height), f: getComputedStyle(b).fontSize}; })()")
    check('nút "Gửi cho ba mẹ nấu tối nay": cao 45px, chữ 15px', fb['h'] == 45 and fb['f'] == '15px', fb)
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
    ings = ls('mm_ingredients') or []
    check('nguyên liệu: chỉ 4 nhóm, không còn "Canh"',
          {g['group'] for g in ings} <= {'Tinh bột', 'Đạm', 'Rau củ', 'Trái cây'}
          and all(m['group'] != 'Canh' for m in (ls('mm_daily_menu') or [])))
    check('nguyên liệu có khẩu phần + Carbs/Protein/Fat; mở khóa sẵn = Cơm trắng, Thịt heo, Rau muống, Chuối',
          all(isinstance(g.get('carbs'), (int, float)) and g.get('portion') for g in ings)
          and sorted(g['name'] for g in ings if g.get('alwaysUnlocked')) == ['Chuối', 'Cơm trắng', 'Rau muống', 'Thịt heo'])
    check('bảng dinh dưỡng chuẩn mm_nutrition_table có ≥ 12 dòng', len(ls('mm_nutrition_table') or []) >= 12)
    page.click('button[data-tab=ingredients]'); page.wait_for_timeout(200)
    check('tab Nguyên liệu có bảng chuẩn; Trứng = 3 điểm',
          page.locator('#nutritionTable tr:has-text("Trứng") td:nth-child(7) b').inner_text() == '3')
    page.evaluate('openAddIngredient()'); page.wait_for_timeout(150)
    opts = page.eval_on_selector_all('#ingFromTable option', 'o => o.map(x => x.value)')
    check('danh sách "chọn từ bảng chuẩn" không hiện nguyên liệu đã có', 'com-trang' not in opts and 'cam' in opts, opts)
    page.select_option('#ingFromTable', 'cam'); page.wait_for_timeout(100)
    check('chọn "Cam" từ bảng chuẩn: tự điền tên, nhóm và số liệu',
          page.input_value('#ingName') == 'Cam' and page.input_value('#ingGroup') == 'Trái cây'
          and page.input_value('#ingCarbs') == '12' and page.input_value('#ingPortion') == '80')
    page.click('#modalIngredient .btn-primary'); page.wait_for_timeout(200)
    cam = next((g for g in (ls('mm_ingredients') or []) if g['name'] == 'Cam'), None)
    check('lưu nguyên liệu Cam: có số liệu, chưa mở khóa sẵn',
          bool(cam) and cam['carbs'] == 12 and cam['portion'] == 80 and not cam['alwaysUnlocked'], cam)
    page.evaluate('openAddIngredient()'); page.wait_for_timeout(100)
    page.fill('#ingName', 'cam'); page.fill('#ingPortion', '80'); page.fill('#ingCarbs', '12'); page.fill('#ingProtein', '1'); page.fill('#ingFat', '0')
    msgs = []
    page.remove_listener('dialog', accept_dialog)
    page.once('dialog', lambda d: (msgs.append(d.message), d.dismiss()))
    page.click('#modalIngredient .btn-primary'); page.wait_for_timeout(200)
    check('trùng tên: có cảnh báo, chọn Hủy thì không ghi thêm',
          len(msgs) == 1 and sum(g['name'].lower() == 'cam' for g in ls('mm_ingredients')) == 1, msgs)
    page.on('dialog', accept_dialog)
    page.click('#modalIngredient .btn-primary'); page.wait_for_timeout(200)
    check('trùng tên: xác nhận thì vẫn ghi nguyên liệu',
          sum(g['name'].lower() == 'cam' for g in ls('mm_ingredients')) == 2)
    page.evaluate("deleteNutri('com-trang')"); page.wait_for_timeout(150)
    check('xóa dòng bảng chuẩn', all(t['id'] != 'com-trang' for t in ls('mm_nutrition_table')))
    page.evaluate('resetNutritionTable()'); page.wait_for_timeout(150)
    check('Khôi phục mặc định: bảng chuẩn đủ lại', any(t['id'] == 'com-trang' for t in ls('mm_nutrition_table')))
    page.click('button[data-tab=xp]'); page.wait_for_timeout(150)
    check('bảng Level không còn cột "NL mở khóa"', page.locator('#tab-xp th:has-text("NL mở khóa")').count() == 0)
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
    check('dữ liệu cũ không có phiên bản: nâng lên v2, giữ nguyên cấu hình BGH',
          ls('mm_schema_version') == 2 and ls('mm_xp_config')['actions'][0]['xp'] == 88)
    ings = ls('mm_ingredients')                                                # mô phỏng dữ liệu v1
    for g in ings:
        g['group'] = 'Canh' if g['name'] == 'Rau muống' else g['group']
        for k in ('carbs', 'protein', 'fat', 'portion', 'alwaysUnlocked'): g.pop(k, None)
    page.evaluate("v => localStorage.setItem('mm_ingredients', JSON.stringify(v))", ings)
    page.evaluate("localStorage.removeItem('mm_nutrition_table')")
    page.evaluate("localStorage.setItem('mm_schema_version', '1')")
    page.reload(); page.wait_for_timeout(400)
    ings = ls('mm_ingredients')
    check('nâng v1 → v2: Canh → Rau củ, bổ sung số liệu, mở khóa sẵn, có bảng chuẩn',
          ls('mm_schema_version') == 2 and all(g['group'] != 'Canh' for g in ings)
          and all(isinstance(g.get('carbs'), (int, float)) for g in ings)
          and sorted(g['name'] for g in ings if g.get('alwaysUnlocked')) == ['Chuối', 'Cơm trắng', 'Rau muống', 'Thịt heo']
          and len(ls('mm_nutrition_table') or []) >= 12)
    page.evaluate("localStorage.setItem('mm_schema_version', '99')")
    page.evaluate("localStorage.removeItem('mm_badges')")
    page.reload(); page.wait_for_timeout(400)
    check('dữ liệu mới hơn code (v99): không bị ghi đè hay seed lại',
          ls('mm_schema_version') == 99 and ls('mm_badges') is None)
    page.click('#btnReset'); page.wait_for_timeout(1200)
    check('Đặt lại đưa phiên bản về v2', ls('mm_schema_version') == 2)

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
          bool(ls2('mm_xp_config')) and bool(ls2('mm_badges')) and bool(ls2('mm_ingredients'))
          and len(ls2('mm_nutrition_table') or []) >= 12)
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
