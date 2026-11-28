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
    fas = ls(pg, 'mm_fas_log')
    check('nhật ký FAS chỉ của Bảo Trúc (kịch bản demo), không có học sinh khác', len(fas) > 20 and {r['studentId'] for r in fas} == {'phambaotruc'}, len(fas))
    dm = [m for m in menu if m['id'].startswith('m-demo-')]
    days = sorted({m['date'] for m in dm})
    check('thực đơn demo: 10 ngày (tuần này + tuần sau), mỗi ngày 3 món, không có "Trứng chiên"', len(days) == 10 and all(sum(1 for m in dm if m['date'] == d) == 3 for d in days) and not any(m['name'] == 'Trứng chiên' for m in dm), days)
    check('thứ Tư 02/12: hôm nay có đúng 3 món, 1 món Rau', sum(1 for m in menu if m['date'] == '2026-12-02') == 3 and sum(1 for m in menu if m['date'] == '2026-12-02' and m['groupId'] == 'g-rau') == 1)

    print('B. Cuối tuần: hôm nay tự có 3 món (lấy của thứ Hai)')
    pg, errs = page_at(browser, base, '2026-11-28T09:00:00')       # thứ Bảy
    menu = ls(pg, 'mm_daily_menu'); today = [m for m in menu if m['date'] == '2026-11-28']
    mon = [m['name'] for m in menu if m['date'] == '2026-11-23' and m['id'].startswith('m-demo-')]
    check('thứ Bảy 28/11: hôm nay có đúng 3 món, có 1 món Rau, cùng tên với món thứ Hai', len(today) == 3 and sum(1 for m in today if m['groupId'] == 'g-rau') == 1 and [m['name'] for m in today] == mon, today)
    check('thực đơn demo: 10 ngày T2–T6 + hôm nay (11 ngày)', len({m['date'] for m in menu if m['id'].startswith('m-demo-')}) == 11)

    print('C. Tách riêng hai hàm')
    pg.evaluate("mmSetDefaultData({force:true})")
    acc = ls(pg, 'mm_accounts')
    check('mmSetDefaultData(force): chỉ còn admin, thực đơn rỗng, FAS rỗng, vẫn có nguyên liệu', [a['id'] for a in acc] == ['admin'] and ls(pg, 'mm_daily_menu') == [] and ls(pg, 'mm_fas_log') == [] and len(ls(pg, 'mm_ingredients')) >= 10, [a['id'] for a in acc])
    pg.evaluate("localStorage.setItem('mm_demo_date','2026-10-01')")
    pg.evaluate("mmSetDemoData()")
    acc = ls(pg, 'mm_accounts')
    check('mmSetDemoData: thêm Bảo Trúc (5A12, XP do kịch bản đặt)  + phụ huynh, thực đơn demo', [a['id'] for a in acc] == ['admin', 'phambaotruc', 'phbaotruc'] and acc[1]['className'] == '5A12' and 'xp' not in acc[1] and len(ls(pg, 'mm_daily_menu')) == 33)
    check('mmSetDemoData: đưa "Ngày hôm nay" về ngày thật (xóa mm_demo_date)', pg.evaluate("localStorage.getItem('mm_demo_date')") is None)
    pg.evaluate("localStorage.setItem('mm_daily_menu', JSON.stringify([{id:'mx',date:'2026-11-23',name:'Món BGH nhập',ingredientId:'com-trang',groupId:'g-tinh-bot'}]))")
    pg.evaluate("mmSetDemoData()")
    mm = ls(pg, 'mm_daily_menu')
    check('mmSetDemoData không ghi đè thực đơn BGH đã nhập (thực đơn không rỗng)', len(mm) == 1 and mm[0]['id'] == 'mx', mm)
    pg.evaluate("localStorage.setItem('mm_daily_menu','[]')")
    pg.evaluate("mmSetDemoData()")
    check('thực đơn rỗng thì mmSetDemoData nạp thực đơn demo', len(ls(pg, 'mm_daily_menu')) == 33)
    check('gọi lại mmSetDemoData không nhân đôi tài khoản', len(ls(pg, 'mm_accounts')) == 3)

    print('E. Set Demo Plan: kịch bản của Phạm Bảo Trúc')
    pg, errs = page_at(browser, base, '2026-12-02T09:00:00')       # thứ Tư; máy mới mở lần đầu
    fas = ls(pg, 'mm_fas_log'); menu = ls(pg, 'mm_daily_menu'); acc = {a['id']: a for a in ls(pg, 'mm_accounts')}
    check('máy mới: Trúc có lịch sử FAS 4 tuần (trước hôm nay, nhiều nhóm), thực đơn quá khứ 60 món', len(fas) > 20 and all(r['timestamp'][:10] < '2026-12-02' and r['timestamp'][:10] >= '2026-11-02' for r in fas) and len({r['groupId'] for r in fas}) >= 5 and sum(1 for m in menu if m['id'].startswith('m-big-')) == 60, len(fas))
    reqs = ls(pg, 'mm_home_requests') or []
    r0 = reqs[0] if reqs else {}
    scripted = [r for r in fas if r['foodId'] == r0.get('foodId') and r['timestamp'][:10] == r0.get('createdAt', '')[:10] and r.get('notTried')]
    check('có đúng 1 yêu cầu "Muốn" đang chờ ba mẹ của Trúc, kèm dòng FAS "Chưa thử" cùng món', len(reqs) == 1 and r0['status'] == 'pending' and r0['studentId'] == 'phambaotruc' and len(scripted) == 1, reqs)
    check('XP sát mốc: 590 (cách mốc Level 4 đúng một lượt đánh giá +10), Level đã thấy = Level 3', acc['phambaotruc']['xp'] == 590 and ls(pg, 'mm_char_state')['phambaotruc']['seenLevelIdx'] == 2, (acc['phambaotruc'].get('xp'), ls(pg, 'mm_char_state')))
    td = [m for m in menu if m['date'] == '2026-12-02']
    check('hôm nay: 3 món, có món MỚI, có 1 món Rau, Trúc chưa đánh giá món nào', len(td) == 3 and any(m['isNew'] for m in td) and sum(1 for m in td if m['groupId'] == 'g-rau') == 1 and not any(r['timestamp'][:10] >= '2026-12-02' for r in fas))
    n_fas, n_menu = len(fas), len(menu)
    pg.evaluate("mmSetDemoPlan()")
    check('chạy lại mmSetDemoPlan không nhân đôi (FAS, thực đơn, yêu cầu)', len(ls(pg, 'mm_fas_log')) == n_fas and len(ls(pg, 'mm_daily_menu')) == n_menu and len(ls(pg, 'mm_home_requests')) == 1)
    # phụ huynh xác nhận ngay → +20 XP → Trúc lên Level 4
    pg.fill('#username', 'phbaotruc'); pg.fill('#password', 'ph001'); pg.click('#btnSubmit'); pg.wait_for_timeout(800)
    check('đăng nhập phụ huynh: thấy ngay yêu cầu chờ xác nhận', pg.locator('#requestsBox .req-card').count() == 1, pg.url)
    pg.locator('#requestsBox .btn-confirm-yes').first.click(); pg.wait_for_timeout(400)
    xl = ls(pg, 'mm_xp_log') or []
    check('xác nhận → con nhận +20 XP (590 → 610, qua mốc Level 4)', len(xl) == 1 and xl[0]['xp'] == 20 and xl[0]['studentId'] == 'phambaotruc')
    pg.goto(base + '/index.html'); pg.evaluate("sessionStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.fill('#username', 'phambaotruc'); pg.fill('#password', 'hs001'); pg.click('#btnSubmit'); pg.wait_for_timeout(1500)
    check('học sinh mở Trang chủ: chiếu hoạt ảnh "Lên Level 4"', 'show' in (pg.locator('#petLvUp').get_attribute('class') or '') and 'Lên Level 4' in pg.inner_text('#petLvUp'), pg.url)

    print('D. DEMO_MODE = false: chỉ dữ liệu mặc định')
    pg, errs = page_at(browser, base, None, demo=False)
    acc = ls(pg, 'mm_accounts')
    check('chỉ có admin, thực đơn và FAS rỗng, không có yêu cầu nào, vẫn có cấu hình mặc định', [a['id'] for a in acc] == ['admin'] and ls(pg, 'mm_daily_menu') == [] and ls(pg, 'mm_fas_log') == [] and not ls(pg, 'mm_home_requests') and bool(ls(pg, 'mm_xp_config')) and bool(ls(pg, 'mm_food_groups')))
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
