#!/usr/bin/env python3
"""Kiểm thử "Thêm thực đơn theo tuần" + "Sửa món trong thực đơn" (BGH).
Chạy:  python tests/test_week_menu.py
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
    pg.goto(base + '/index.html'); pg.fill('#username', 'admin'); pg.fill('#password', 'admin2026'); pg.click('#btnSubmit'); pg.wait_for_timeout(800)
    pg.evaluate("localStorage.setItem('mm_daily_menu','[]')"); pg.reload(); pg.wait_for_timeout(800)

    pg.click('[data-module=settings]'); pg.wait_for_timeout(400)
    print('A. Nút và cửa sổ')
    check('nút đổi tên "+ Thêm thực đơn theo tuần"', 'Thêm thực đơn theo tuần' in pg.inner_text('#tab-menu') and 'Thêm món hôm nay' not in pg.inner_text('#tab-menu'))
    pg.click('button:has-text("Thêm thực đơn theo tuần")'); pg.wait_for_timeout(200)
    check('mở cửa sổ có 7 hàng ngày + 2 combobox + nút xếp tự động', pg.locator('#modalWeekMenu.show').count() == 1 and pg.locator('.wm-row').count() == 7 and pg.locator('#wmPerDay').count() == 1 and pg.locator('#wmGap').count() == 1 and pg.locator('button:has-text("Xếp thực đơn tự động")').count() == 1)
    check('mặc định 3 món/ngày, cách 2 ngày', pg.input_value('#wmPerDay') == '3' and pg.input_value('#wmGap') == '2')

    print('B. Xếp tự động')
    pg.click('button:has-text("Xếp thực đơn tự động")'); pg.wait_for_timeout(300)
    d = pg.evaluate("wmDraft")
    wd = [m for m in d if m['date'] in [x['date'] for x in getDays(pg)[:5]]]
    check('T2–T6 mỗi ngày đủ 3 món (15 món)', len(d) == 15 and all(sum(1 for m in d if m['date'] == x['date']) == 3 for x in getDays(pg)[:5]), len(d))
    check('T7, CN không bị xếp', all(m['date'] not in [x['date'] for x in getDays(pg)[5:]] for m in d))
    check('mỗi ngày 3 nhóm khác nhau', all(len({m['groupId'] for m in d if m['date'] == x['date']}) == 3 for x in getDays(pg)[:5]))
    ok = True
    for a in d:
        for b in d:
            if a is not b and a['groupId'] == b['groupId']:
                dn = abs(pg.evaluate(f"wmDayNum('{a['date']}')-wmDayNum('{b['date']}')"))
                if dn < 2: ok = False
    check('cùng nhóm luôn cách ≥ 2 ngày', ok)
    check('tên món = tên nguyên liệu, không có món MỚI, không cảnh báo', all(not m['isNew'] and m['name'] for m in d) and pg.locator('.wm-chip.warn').count() == 0 and pg.locator('.wm-chip.auto').count() == 15)
    check('chưa lưu thì kho chưa đổi', ls(pg, 'mm_daily_menu') == [])

    print('C. Món có sẵn được giữ, chỉ lấp chỗ trống')
    pg.locator('.wm-chip b').first.click(); pg.wait_for_timeout(150)
    check('xóa 1 món → 14 món', len(pg.evaluate("wmDraft")) == 14)
    keep = {m['id'] for m in pg.evaluate("wmDraft")}
    pg.click('button:has-text("Xếp thực đơn tự động")'); pg.wait_for_timeout(300)
    d2 = pg.evaluate("wmDraft")
    check('xếp lại: đủ 15, 14 món cũ giữ nguyên', len(d2) == 15 and keep <= {m['id'] for m in d2})

    print('D. Quy tắc quá chặt')
    pg.select_option('#wmPerDay', '6'); pg.select_option('#wmGap', '4'); pg.wait_for_timeout(200)
    check('hiện cảnh báo không xếp đủ', 'chỉ xếp được' in pg.inner_text('.wm-feas'), pg.inner_text('.wm-feas'))
    pg.select_option('#wmPerDay', '3'); pg.select_option('#wmGap', '2'); pg.wait_for_timeout(200)

    print('E. Chọn món / sửa món trong cửa sổ tuần')
    pg.locator('.wm-row').nth(5).locator('button:has-text("Chọn món")').click(); pg.wait_for_timeout(200)
    t = pg.inner_text('#modalMenu .modal-title')
    check('"+ Chọn món" mở cửa sổ thêm món, ngày T7 được điền sẵn', 'Thêm món vào thực đơn' in t and pg.input_value('#menuDate') == getDays(pg)[5]['date'])
    pg.click('#menuIngredientPick button >> nth=0'); pg.fill('#menuName', 'Cơm chiên'); pg.click('#modalMenu .modal-footer .btn-primary'); pg.wait_for_timeout(250)
    check('món thêm vào bản nháp (T7), cửa sổ tuần vẫn mở', pg.locator('#modalWeekMenu.show').count() == 1 and pg.locator('.wm-row').nth(5).locator('.wm-chip').count() == 1 and ls(pg, 'mm_daily_menu') == [])
    pg.locator('.wm-row').nth(0).locator('.wm-chip').first.click(); pg.wait_for_timeout(200)
    check('bấm món mở "Sửa món trong thực đơn", nút "Lưu thay đổi", dữ liệu điền sẵn', 'Sửa món trong thực đơn' in pg.inner_text('#modalMenu .modal-title') and pg.inner_text('#modalMenu .modal-footer .btn-primary') == 'Lưu thay đổi' and pg.input_value('#menuName') != '' and pg.input_value('#menuIngredient') != '')
    pg.fill('#menuName', 'Món đã sửa'); pg.check('#menuIsNew'); pg.click('#modalMenu .modal-footer .btn-primary'); pg.wait_for_timeout(250)
    check('sửa tên + MỚI hiện đúng, không nhân đôi món', 'Món đã sửa' in pg.inner_text('.wm-row >> nth=0') and pg.locator('.wm-row').nth(0).locator('.wm-chip em').count() == 1 and len(pg.evaluate("wmDraft")) == 16)

    print('E2. Xóa tất cả trong tuần')
    msgs = []
    def h(d): msgs.append(d.message); d.dismiss()
    pg.once('dialog', h); pg.click('#wmClear'); pg.wait_for_timeout(200)
    check('hiện popup xác nhận, bấm Hủy thì không xóa', len(msgs) == 1 and 'tất cả' in msgs[0] and len(pg.evaluate("wmDraft")) == 16, msgs)
    pg.once('dialog', lambda d: d.accept()); pg.click('#wmClear'); pg.wait_for_timeout(250)
    check('đồng ý: xóa hết món của tuần (T2–CN), bản nháp tuần khác không đổi', pg.locator('.wm-chip').count() == 0 and len(pg.evaluate("wmDraft")) == 0 and ls(pg, 'mm_daily_menu') == [])
    pg.click('button:has-text("Xếp thực đơn tự động")'); pg.wait_for_timeout(250)
    check('xếp lại được sau khi xóa (15 món)', len(pg.evaluate("wmDraft")) == 15)
    pg.locator('.wm-row').nth(5).locator('button:has-text("Chọn món")').click(); pg.click('#menuIngredientPick button >> nth=0'); pg.fill('#menuName', 'Cơm chiên'); pg.click('#modalMenu .modal-footer .btn-primary'); pg.wait_for_timeout(250)

    print('F. Đổi tuần và lưu')
    pg.locator('.wm-weeknav button').nth(1).click(); pg.wait_for_timeout(200)
    check('tuần sau trống, bản nháp giữ nguyên', pg.locator('.wm-chip').count() == 0 and len(pg.evaluate("wmDraft")) == 16)
    pg.locator('.wm-weeknav button').nth(0).click(); pg.wait_for_timeout(200)
    pg.click('button:has-text("Lưu thực đơn tuần")'); pg.wait_for_timeout(300)
    st = ls(pg, 'mm_daily_menu')
    check('lưu: 16 món vào kho, không còn cờ auto, cửa sổ đóng', len(st) == 16 and all('auto' not in m for m in st) and pg.locator('#modalWeekMenu.show').count() == 0)
    check('lịch tuần hiện món', pg.locator('#weekGrid .menu-chip').count() == 16, pg.locator('#weekGrid .menu-chip').count())

    print('G. Sửa món từ lịch chính')
    pg.locator('#weekGrid .menu-chip').first.click(); pg.wait_for_timeout(200)
    check('bấm món trên lịch mở cửa sổ Sửa', 'Sửa món trong thực đơn' in pg.inner_text('#modalMenu .modal-title'))
    pg.fill('#menuName', 'Tên mới'); pg.click('#modalMenu .modal-footer .btn-primary'); pg.wait_for_timeout(250)
    st = ls(pg, 'mm_daily_menu')
    check('lưu vào kho, vẫn 16 món', len(st) == 16 and any(m['name'] == 'Tên mới' for m in st))
    pg.locator('#weekGrid .menu-chip button').first.click(); pg.wait_for_timeout(200)
    check('nút ✕ vẫn xóa món (không mở cửa sổ sửa)', len(ls(pg, 'mm_daily_menu')) == 15 and pg.locator('#modalMenu.show').count() == 0)
    pg.locator('#weekGrid .add-menu-btn').first.click(); pg.wait_for_timeout(200)
    check('"+ Thêm món" lẻ trở lại chế độ thêm', 'Thêm món vào thực đơn' in pg.inner_text('#modalMenu .modal-title') and pg.input_value('#menuName') == '')
    check('không lỗi JS', not errs, errs)

def getDays(pg):
    return pg.evaluate("getMenuDays('week', wmAnchor).map(x=>({date:x.date}))")

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
