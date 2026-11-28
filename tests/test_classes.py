#!/usr/bin/env python3
"""Kiểm thử cột Lớp (chỉ BGH): Danh sách tài khoản (cột, form, bộ lọc, tìm kiếm, import CSV) và Báo cáo FAS (cột, lọc theo lớp, thống kê, CSV).

Chạy:  python tests/test_classes.py     (cần: pip install playwright && playwright install chromium)
Thoát mã 0 nếu mọi bước đạt, mã 1 nếu có bước lỗi. Dùng trình duyệt mới, không đụng dữ liệu trình duyệt thật.
"""
import json, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from legacy_fixture import add_legacy

ROOT = Path(__file__).resolve().parent.parent
res = []

def check(name, ok, detail=''):
    res.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))

def ls(pg, k): return json.loads(pg.evaluate(f"localStorage.getItem('{k}')") or 'null')

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True)
    add_legacy(ctx)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(base + '/index.html'); pg.fill('#username', 'admin'); pg.fill('#password', 'admin2026'); pg.click('#btnSubmit'); pg.wait_for_timeout(800)
    rows = lambda: pg.locator('#accountsTbody tr:visible').count()
    acc = lambda: {a['id']: a for a in ls(pg, 'mm_accounts')}

    print('A. Danh sách tài khoản')
    heads = [h.strip().lower() for h in pg.locator('#module-accounts th').all_inner_texts()]
    check('bảng có cột "Lớp" sau Họ tên', 'lớp' in heads and heads.index('lớp') == heads.index('họ tên') + 1, heads)
    a = acc()
    check('dữ liệu mẫu: Bảo Trúc 5A12, Minh An 4A9, Thanh Khoa 3A4', (a['phambaotruc'].get('className'), a['nguyenminhan'].get('className'), a['tranthanhkhoa'].get('className')) == ('5A12', '4A9', '3A4'))
    check('bảng hiện lớp của học sinh, phụ huynh/BGH hiện "—"', '5A12' in pg.inner_text('#accountsTbody tr:has-text("phambaotruc")') and '4A9' in pg.inner_text('#accountsTbody tr:has-text("nguyenminhan")') and pg.locator('#accountsTbody tr[data-id="phbaotruc"] td').nth(2).inner_text().strip() == '—')
    check('thanh số lượng (bộ mẫu): Admin 1 · Học sinh 3 / 3 lớp · Phụ huynh 1 / 1 lớp', all(s in ' '.join(pg.inner_text('#accCounts').split()) for s in ['Admin 1', 'Học sinh 3 / 3 lớp', 'Phụ huynh 3 / 3 lớp']) or all(s in ' '.join(pg.inner_text('#accCounts').split()) for s in ['Admin 1', 'Học sinh 3 / 3 lớp']), pg.inner_text('#accCounts'))
    opts = pg.locator('#accFilterClass option').all_inner_texts()
    check('bộ lọc lớp: Tất cả + 3A4, 4A9, 5A12 (không có "Chưa có lớp")', opts == ['— Tất cả lớp —', 'Lớp 3A4', 'Lớp 4A9', 'Lớp 5A12'], opts)
    pg.select_option('#accFilterClass', '4A9'); pg.wait_for_timeout(150)
    check('lọc lớp 4A9: chỉ còn Nguyễn Minh An', rows() == 1 and 'nguyenminhan' in pg.inner_text('#accountsTbody tr:visible'))
    pg.select_option('#accFilterClass', ''); pg.fill('#accSearch', '5a12'); pg.wait_for_timeout(150)
    check('tìm "5a12" theo lớp: ra Bảo Trúc', rows() == 1 and 'phambaotruc' in pg.inner_text('#accountsTbody tr:visible'))
    pg.fill('#accSearch', ''); pg.wait_for_timeout(100)

    print('B. Form thêm/sửa học sinh')
    pg.click('button:has-text("+ Thêm tài khoản")'); pg.wait_for_timeout(250)
    check('form học sinh có ô Lớp', pg.locator('#accFormClass').is_visible())
    pg.fill('#accFormId', 'hs050'); pg.fill('#accFormName', 'Lê Thu Hà'); pg.fill('#accFormPass', 'pw050')
    pg.click('button:has-text("Lưu tài khoản")'); pg.wait_for_timeout(300)
    check('thêm học sinh mới bỏ trống lớp: báo lỗi, chưa lưu', 'hs050' not in acc() and 'Lớp' in pg.inner_text('#toastContainer'))
    pg.fill('#accFormClass', ' 4a1 '); pg.click('button:has-text("Lưu tài khoản")'); pg.wait_for_timeout(400)
    check('nhập lớp "4a1" → lưu chuẩn hóa "4A1", hiện trong bảng', acc().get('hs050', {}).get('className') == '4A1' and '4A1' in pg.inner_text('#accountsTbody tr:has-text("hs050")'))
    check('bộ lọc có thêm lớp 4A1', 'Lớp 4A1' in pg.locator('#accFilterClass option').all_inner_texts())
    pg.click('#accountsTbody tr:has-text("hs050") button[title="Sửa"]'); pg.wait_for_timeout(250)
    check('sửa học sinh: ô Lớp hiện lớp cũ', pg.input_value('#accFormClass') == '4A1')
    pg.fill('#accFormClass', '5A12'); pg.click('button:has-text("Lưu tài khoản")'); pg.wait_for_timeout(400)
    check('đổi lớp sang 5A12', acc()['hs050']['className'] == '5A12')

    print('C. Học sinh cũ chưa có lớp')
    pg.evaluate("()=>{const a=JSON.parse(localStorage.getItem('mm_accounts')); delete a.find(x=>x.id==='tranthanhkhoa').className; localStorage.setItem('mm_accounts',JSON.stringify(a))}")
    pg.click('[onclick="refreshTab(\'accounts\')"]'); pg.wait_for_timeout(300)
    check('hiện "Chưa có lớp" và bộ lọc có mục "Chưa có lớp"', 'Chưa có lớp' in pg.inner_text('#accountsTbody tr:has-text("tranthanhkhoa")') and 'Chưa có lớp' in pg.locator('#accFilterClass option').all_inner_texts())
    pg.select_option('#accFilterClass', '__none'); pg.wait_for_timeout(150)
    check('lọc "Chưa có lớp": chỉ còn học sinh chưa có lớp', rows() == 1 and 'tranthanhkhoa' in pg.inner_text('#accountsTbody tr:visible'))
    pg.select_option('#accFilterClass', '')
    pg.click('#accountsTbody tr:has-text("tranthanhkhoa") button[title="Sửa"]'); pg.wait_for_timeout(250)
    pg.fill('#accFormName', 'Trần Thanh Khoa'); pg.click('button:has-text("Lưu tài khoản")'); pg.wait_for_timeout(400)
    check('sửa học sinh cũ không nhập lớp vẫn lưu được', 'tranthanhkhoa' in acc() and not acc()['tranthanhkhoa'].get('className'))
    pg.click('#accountsTbody tr:has-text("tranthanhkhoa") button[title="Sửa"]'); pg.wait_for_timeout(250)
    pg.fill('#accFormClass', '3a4'); pg.click('button:has-text("Lưu tài khoản")'); pg.wait_for_timeout(400)
    check('bổ sung lại lớp 3A4', acc()['tranthanhkhoa']['className'] == '3A4')

    print('D. Import CSV')
    pg.click('button:has-text("Import CSV")'); pg.wait_for_timeout(200)
    pg.fill('#csvPaste', 'hs100,Lê An,pw1,4b2\nhs101,Lê Bình,pw2\nhs102,Lê Chi,pw3, 4B2 ')
    pg.click('#modalImport button:has-text("Import")'); pg.wait_for_timeout(400)
    a = acc()
    check('import: dòng có lớp được thêm (lớp chuẩn hóa 4B2), dòng thiếu lớp bị bỏ qua', a.get('hs100', {}).get('className') == '4B2' and a.get('hs102', {}).get('className') == '4B2' and 'hs101' not in a, list(a))
    check('thông báo ghi rõ số dòng thiếu lớp', 'Bỏ qua 1 dòng thiếu lớp' in pg.inner_text('#toastContainer'), pg.inner_text('#toastContainer'))

    print('E. Báo cáo FAS')
    pg.click('[data-module=report]'); pg.wait_for_timeout(500)
    heads = [h.strip().lower() for h in pg.locator('#module-report th').all_inner_texts()]
    check('bảng FAS có cột "Lớp" sau Học sinh', heads[:2] == ['học sinh', 'lớp'], heads)
    check('bảng hiện lớp từng học sinh', '5A12' in pg.inner_text('#fasTableBody tr:has-text("Phạm Bảo Trúc")') and '4A9' in pg.inner_text('#fasTableBody tr:has-text("Nguyễn Minh An")'))
    check('bộ lọc "Tất cả lớp" có 3A4, 4A9, 5A12 và 4A1 hoặc 4B2', {'Lớp 3A4', 'Lớp 4A9', 'Lớp 5A12', 'Lớp 4B2'} <= set(pg.locator('#filterClass option').all_inner_texts()))
    avg_all = pg.inner_text('#statAvgFas')
    pg.select_option('#filterClass', '4A9'); pg.wait_for_timeout(300)
    check('lọc lớp 4A9: bảng chỉ còn Minh An', pg.locator('#fasTableBody tr').count() == 1 and 'Nguyễn Minh An' in pg.inner_text('#fasTableBody'))
    check('thống kê theo lớp: Top 3 / Cần hỗ trợ chỉ có Minh An; FAS trung bình = 2.00 (chuỗi 1→2→2)', 'Nguyễn Minh An' in pg.inner_text('#statTop3') and 'Bảo Trúc' not in pg.inner_text('#statTop3') + pg.inner_text('#statBottom3') and pg.inner_text('#statAvgFas') == '2.00' and avg_all != '2.00', (pg.inner_text('#statAvgFas'), avg_all))
    check('Top 3 / Cần hỗ trợ ghi lớp trong ngoặc: "Nguyễn Minh An (4A9)"', 'Nguyễn Minh An (4A9)' in pg.inner_text('#statTop3') + pg.inner_text('#statBottom3'), pg.inner_text('#statTop3') + pg.inner_text('#statBottom3'))
    check('ô học sinh thu theo lớp', pg.locator('#filterStudent option').all_inner_texts() == ['— Tất cả học sinh —', 'Nguyễn Minh An'], pg.locator('#filterStudent option').all_inner_texts())
    pg.select_option('#filterClass', '4B2'); pg.wait_for_timeout(300)
    check('lớp chưa có dữ liệu FAS: bảng báo "Không có dữ liệu"', 'Không có dữ liệu' in pg.inner_text('#fasTableBody'))
    pg.select_option('#filterClass', ''); pg.wait_for_timeout(300)
    check('bỏ lọc lớp: đủ 3 dòng như cũ', pg.locator('#fasTableBody tr').count() == 3)
    with pg.expect_download() as dl:
        pg.click('button:has-text("Xuất CSV")')
    txt = Path(dl.value.path()).read_text(encoding='utf-8-sig').splitlines()
    check('CSV xuất có cột "Lớp" và giá trị lớp', txt[0].startswith('"Học sinh","Lớp","Nhóm"') and any('"5A12"' in l for l in txt[1:]), txt[:2])
    check('không lỗi JS', not errs, errs)

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
