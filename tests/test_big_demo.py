#!/usr/bin/env python3
"""Kiểm thử "Đặt lại + dữ liệu cả khối (150 bạn)": số học sinh, lớp, thực đơn 4 tuần, nhật ký FAS đúng quy tắc, dung lượng, lặp lại được, nút Đặt lại thường vẫn nhẹ.
Chạy:  python tests/test_big_demo.py
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
    msgs = []
    pg.on('dialog', lambda d: (msgs.append(d.message), d.accept()))
    pg.goto(base + '/index.html'); pg.wait_for_timeout(500)

    print('A. Chỉ còn một nút "Đặt lại dữ liệu demo"')
    check('trang đăng nhập có đúng 1 nút đặt lại, tên "↻ Đặt lại dữ liệu demo", không có nút "cả khối"', pg.locator('.btn-reset').count() == 1 and pg.locator('#btnResetBig').count() == 0 and pg.evaluate("document.getElementById('btnReset').textContent.trim()") == '↻ Đặt lại dữ liệu demo')
    body = pg.inner_text('body')
    check('đã bỏ 2 câu ghi chú dưới nút', 'Xóa dữ liệu thử nghiệm và về ngày thật' not in body and 'Thêm 149 bạn' not in body)
    pg.click('#btnReset')
    try:
        pg.wait_for_function("()=>{const b=document.getElementById('btnReset');return b&&b.textContent.indexOf('Đã đặt lại dữ liệu')>=0}", timeout=4000); okTxt = True
    except Exception: okTxt = False
    check('chạy xong nút đổi thành "✅ Đã đặt lại dữ liệu"', okTxt)
    pg.wait_for_timeout(2500)

    print('B. Dữ liệu sau khi đặt lại (150 bạn)')
    pg.click('#btnReset'); pg.wait_for_timeout(2500)
    acc = ls(pg, 'mm_accounts'); fas = ls(pg, 'mm_fas_log'); menu = ls(pg, 'mm_daily_menu')
    stu = [a for a in acc if a['role'] == 'student']
    check('tổng 150 học sinh = Bảo Trúc + 149 bạn', len(stu) == 150, len(stu))
    from collections import Counter
    cc = Counter(a['className'] for a in stu)
    check('5 lớp, mỗi lớp 30 bạn (5A12 gồm Bảo Trúc)', dict(cc) == {'3A2': 30, '4A5': 30, '4A6': 30, '5A11': 30, '5A12': 30}, dict(cc))
    check('giữ admin, Bảo Trúc (5A12, xp 605) và phụ huynh; không có Minh An/Thanh Khoa (seed gốc đã bỏ)', {'admin', 'phambaotruc', 'phbaotruc'} <= {a['id'] for a in acc} and next(a for a in acc if a['id'] == 'phambaotruc')['xp'] == 605 and not any(a['id'] in ('nguyenminhan', 'tranthanhkhoa', 'phminhan', 'phthanhkhoa') for a in acc), [a['id'] for a in acc if a['role'] != 'student'])
    check('bé mới không có phụ huynh, có xp', all(a['linkedId'] is None and isinstance(a['xp'], int) for a in stu if a['id'].startswith('hs-')))
    # thực đơn
    today = pg.evaluate("toLocalDateStr(new (window.MM_RealDate||Date)())")
    past = sorted({m['date'] for m in menu if m['id'].startswith('m-big-')})
    check('thực đơn 4 tuần trước: 20 ngày × 3 món', len(past) == 20 and sum(1 for m in menu if m['id'].startswith('m-big-')) == 60, len(past))
    bad = False
    for d in past:
        gs = [m['groupId'] for m in menu if m['date'] == d]
        if len(gs) != 3 or len(set(gs)) != 3: bad = True
    check('mỗi ngày 3 nhóm khác nhau', not bad)
    check('thực đơn hôm nay vẫn có "Trứng chiên" (món MỚI)', any(m['date'] == today and m['name'] == 'Trứng chiên' and m['isNew'] for m in menu))
    # FAS
    mine = list(fas)   # gồm cả Bảo Trúc (seed gốc không còn FAS riêng)
    check('có nhật ký FAS cho cả 150 bạn (gồm Bảo Trúc, sinh theo tuần như các bạn khác)', len({r['studentId'] for r in mine}) == 150 and sum(1 for r in mine if r['studentId'] == 'phambaotruc') > 20 and 4000 < len(mine) < 9500, len(mine))
    check('mọi lượt đều trước hôm nay, trong 5 tuần gần nhất', all(r['timestamp'][:10] < today for r in mine))
    ok = True; seq = {}
    for r in sorted(mine, key=lambda r: r['timestamp']):
        k = (r['studentId'], r['groupId'])
        if r['score'] >= 1:
            seq[k] = seq.get(k, 0) + 1
            if r['attempt'] != seq[k]: ok = False
        elif r['attempt'] is not None or not r.get('notTried'): ok = False
    check('lượt thử đánh số theo nhóm của từng bé; "Chưa thử" attempt=null + notTried', ok)
    sc = Counter(r['score'] for r in mine)
    check('đủ cả 5 mức điểm 0–4', set(sc) == {0, 1, 2, 3, 4}, dict(sc))
    ids = {a['id'] for a in stu}
    check('mọi dòng FAS thuộc học sinh có thật', all(r['studentId'] in ids for r in fas))
    size = pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('mm_')===0).reduce((s,k)=>s+k.length+localStorage.getItem(k).length,0)")
    print(f'      (dung lượng localStorage ≈ {size/1e6:.2f} triệu ký tự; giới hạn ~5 triệu)')
    check('dung lượng dưới 2,5 triệu ký tự', size < 2_500_000, size)
    # lặp lại được
    snap = json.dumps(fas, sort_keys=True)
    pg.click('#btnReset'); pg.wait_for_timeout(2500)
    check('đặt lại lần 2 ra đúng cùng dữ liệu', json.dumps(ls(pg, 'mm_fas_log'), sort_keys=True) == snap)

    print('B2. Đọc CSV trực tiếp (không cần build)')
    csv_txt = (ROOT / 'demo' / 'students.csv').read_text(encoding='utf-8-sig')
    pg.route('**/demo/students.csv', lambda r: r.fulfill(status=200, content_type='text/csv; charset=utf-8', body=csv_txt + 'hs-test-01,"Trần, Thử Nghiệm",5A11,abc123,ken\n'))
    pg.click('#btnReset'); pg.wait_for_timeout(2500)
    acc2 = ls(pg, 'mm_accounts')
    t1 = next((a for a in acc2 if a['id'] == 'hs-test-01'), None)
    check('sửa CSV (thêm 1 bạn, tên có dấu phẩy) → nạp đúng, không cần chạy build', t1 and t1['name'] == 'Trần, Thử Nghiệm' and t1['pass'] == 'abc123' and len([a for a in acc2 if a['role'] == 'student']) == 151, t1)
    pg.unroute('**/demo/students.csv')
    pg.route('**/demo/students.csv', lambda r: r.fulfill(status=200, content_type='text/csv; charset=utf-8', body=csv_txt + 'hs-loi-01,Bạn Lỗi,5A11,x,khongco\n'))
    before = pg.evaluate("localStorage.getItem('mm_accounts')"); msgs.clear()
    pg.click('#btnReset'); pg.wait_for_timeout(1200)
    check('CSV sai: báo rõ dòng lỗi và KHÔNG xóa dữ liệu hiện có', any('students.csv dòng 151' in m and 'kiểu' in m for m in msgs) and pg.evaluate("localStorage.getItem('mm_accounts')") == before, msgs)
    pg.unroute('**/demo/students.csv')
    pg.route('**/demo/students.csv', lambda r: r.abort())
    before = pg.evaluate("localStorage.getItem('mm_accounts')"); msgs.clear(); pg.click('#btnReset'); pg.wait_for_timeout(1500)
    check('không đọc được CSV (mở file trực tiếp): báo cần máy chủ web và KHÔNG xóa dữ liệu hiện có', any('máy chủ web' in m for m in msgs) and pg.evaluate("localStorage.getItem('mm_accounts')") == before, msgs)
    pg.unroute('**/demo/students.csv')
    pg.click('#btnReset'); pg.wait_for_timeout(2500)

    print('C. Dùng thử ở các giao diện')
    pg.fill('#username', 'admin'); pg.fill('#password', 'admin2026'); pg.click('#btnSubmit'); pg.wait_for_timeout(1200)
    pg.click('[data-module=accounts]'); pg.wait_for_timeout(800)
    check('Danh sách tài khoản: lọc lớp có đúng 5 lớp', pg.locator('#accFilterClass option').all_inner_texts() == ['— Tất cả lớp —', 'Lớp 3A2', 'Lớp 4A5', 'Lớp 4A6', 'Lớp 5A11', 'Lớp 5A12'], pg.locator('#accFilterClass option').all_inner_texts())
    txt = pg.inner_text('#accCounts').replace('\n', ' ')
    check('thanh số lượng: Admin 1 · Học sinh 150 / 5 lớp · Phụ huynh 1 / 1 lớp · Tổng 152', all(s in ' '.join(txt.split()) for s in ['Admin 1', 'Học sinh 150 / 5 lớp', 'Phụ huynh 1 / 1 lớp', 'Tổng 152 tài khoản']), txt)
    pg.select_option('#accFilterClass', '4A5'); pg.wait_for_timeout(200)
    check('lọc lớp không làm đổi số liệu toàn trường', 'Học sinh 150 / 5 lớp' in ' '.join(pg.inner_text('#accCounts').split()))
    pg.select_option('#accFilterClass', ''); pg.wait_for_timeout(200)
    pg.mouse.move(700, 600); pg.mouse.wheel(0, 1200); pg.wait_for_timeout(400)
    tops = pg.evaluate("(()=>{const q=s=>Math.round(document.querySelector('#module-accounts '+s).getBoundingClientRect().top);return [q('.sticky-tools'),q('.sticky-card .content-card-header'),q('.sticky-card th'),Math.round(document.querySelector('.main-header').getBoundingClientRect().bottom)]})()")
    check('Tài khoản: cuộn xuống vẫn cố định thanh nút, đầu thẻ lọc, hàng tiêu đề bảng ngay dưới tiêu đề trang', tops[0] == tops[3] and tops[1] > tops[0] and tops[1] < tops[2] < 300 and pg.evaluate("scrollY") > 300, tops)
    pg.click('[data-module=report]'); pg.wait_for_timeout(1500)
    check('chuyển module: trang về đầu', pg.evaluate("scrollY") == 0)
    pg.mouse.wheel(0, 1500); pg.wait_for_timeout(400)
    tops = pg.evaluate("(()=>{const q=s=>Math.round(document.querySelector('#module-report '+s).getBoundingClientRect().top);return [q('.sticky-tools'),q('.stats-row'),q('.sticky-card .content-card-header'),q('.sticky-card th')]})()")
    check('Báo cáo FAS: cuộn xuống vẫn cố định nút Làm mới + 4 ô thống kê + bộ lọc + hàng tiêu đề', 0 < tops[0] < 100 and tops[1] < 200 and tops[2] < 320 and tops[3] < 400 and pg.evaluate("scrollY") > 500, tops)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(200)
    n = pg.locator('#fasTableBody tr').count()
    check('Báo cáo FAS hiện dữ liệu của nhiều bạn', n > 100, n)
    pg.select_option('#filterClass', '4A5'); pg.wait_for_timeout(600)
    check('lọc lớp 4A5: chỉ còn bạn lớp 4A5', 0 < pg.locator('#fasTableBody tr').count() < n)
    pg.goto(base + '/index.html'); pg.evaluate("sessionStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.fill('#username', 'hs-5a11-01'); pg.fill('#password', 'hs2026'); pg.click('#btnSubmit'); pg.wait_for_timeout(1500)
    check('bé mới đăng nhập được vào Trang chủ học sinh', '/student/' in pg.url, pg.url)
    errs = [e for e in errs if 'ERR_FAILED' not in e]   # lỗi mạng cố ý ở bước chặn CSV
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
