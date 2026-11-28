#!/usr/bin/env python3
"""Kiểm thử nhân vật bị BGH tắt hiện khóa 🔒 ở màn Chọn/Đổi bạn đồng hành + BGH không xóa được 9 nhân vật mặc định.
Chạy:  python tests/test_char_locked.py
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

def login(ctx, base, user, pw, errs):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(base + '/index.html'); pg.fill('#username', user); pg.fill('#password', pw); pg.click('#btnSubmit'); pg.wait_for_timeout(1200)
    return pg

def set_active(pg, ids_off):
    """Tắt các nhân vật trong localStorage như BGH bấm 'Tắt nhân vật' rồi Lưu."""
    pg.evaluate("""(off)=>{const all=mmCharAll(true).map(c=>Object.assign({},c,{active:!off.includes(c.id)}));localStorage.setItem(MM_KEYS.CHARACTERS,JSON.stringify(all));}""", ids_off)

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 500, 'height': 900}); errs = []
    add_legacy(ctx)
    ctx.new_page().goto(base + '/index.html')
    ad = login(ctx, base, 'admin', 'admin2026', errs)
    ad.set_viewport_size({'width': 1400, 'height': 900})

    print('A. BGH: không xóa nhân vật mặc định')
    ad.click('[data-module=settings]'); ad.click('button.tab-btn[data-tab=characters]'); ad.wait_for_timeout(500)
    ids = ad.evaluate("[...document.querySelectorAll('#charList .char-item')].map(e=>e.dataset.id)")
    ok = True
    for i in range(len(ids)):
        ad.locator('#charList .char-item').nth(i).click(); ad.wait_for_timeout(120)
        if ad.locator('#charEditor button:has-text("Xóa")').count() != 0: ok = False
    check('cả 9 nhân vật mặc định: không có nút Xóa', ok and len(ids) == 9, ids)
    ad.evaluate("deleteCharacter(0)"); ad.wait_for_timeout(200)
    check('gọi xóa trực tiếp cũng bị chặn, danh sách vẫn đủ 9', ad.locator('#charList .char-item').count() == 9 and 'mặc định' in ad.inner_text('#toastContainer'), ad.inner_text('#toastContainer'))
    check('chú thích BGH cập nhật: bị tắt vẫn hiện dạng khóa 🔒; 9 mặc định không xóa được', 'dạng khóa' in ad.inner_text('#tab-characters') and '9 nhân vật mặc định không xóa được' in ad.inner_text('#tab-characters'))

    print('B. Học sinh chưa chọn: Nắng và Bí bị tắt')
    set_active(ad, ['nang', 'bi'])
    st = login(ctx, base, 'tranthanhkhoa', 'hs003', errs)
    st.goto(base + '/student/index.html'); st.wait_for_timeout(800)
    check('lưới vẫn đủ 9 bạn; 2 bạn khóa 🔒 có nhãn "Tạm khóa"', st.locator('.cp-opt').count() == 9 and st.locator('.cp-opt.locked').count() == 2 and st.locator('.cp-opt.locked .cp-lock').count() == 2 and st.locator('.cp-opt.locked em.cp-lk').count() == 2)
    check('2 bạn khóa đúng là Nắng và Bí', {st.locator('.cp-opt.locked').nth(i).get_attribute('data-id') for i in range(2)} == {'nang', 'bi'})
    check('dòng đếm: 7 bạn chọn được · 2 bạn tạm khóa', 'Có 7 bạn' in st.inner_text('.cp-note') and '2 bạn đang' in st.inner_text('.cp-note') and 'tạm khóa' in st.inner_text('.cp-note'), st.inner_text('.cp-note'))
    st.click('.cp-opt[data-id="nang"]'); st.wait_for_timeout(200)
    check('bấm bạn khóa: không chọn được (không viền chọn, không mở popup), hiện thông báo', 'show' not in (st.locator('#cpSheet').get_attribute('class') or '') and st.locator('.cp-opt.picked').count() == 0 and 'Nắng đang tạm khóa' in st.inner_text('#cpToast') and st.locator('#cpToast').is_visible())
    st.click('.cp-opt[data-id="la"]'); st.wait_for_timeout(150)
    check('vẫn chọn được bạn không khóa: bấm là hiện popup xác nhận', 'show' in (st.locator('#cpSheet').get_attribute('class') or '') and st.locator('.cp-opt.picked').get_attribute('data-id') == 'la')
    st.wait_for_timeout(3100)
    check('thông báo tự tắt sau ~3 giây', not st.locator('#cpToast').is_visible())
    st.click('#cpOk'); st.wait_for_timeout(500)
    check('chọn xong: lưu characterId = la', {a['id']: a for a in ls(st, 'mm_accounts')}['tranthanhkhoa'].get('characterId') == 'la')

    print('C. Màn Đổi: bạn bị khóa hiện khóa; bạn đang đồng hành bị tắt vẫn là "Đang đồng hành"')
    st.click('#petChg'); st.wait_for_timeout(400)
    check('màn Đổi: 9 bạn, 2 khóa, ghi chú số bạn khóa, có nút quay lại', st.locator('.cp-opt').count() == 9 and st.locator('.cp-opt.locked').count() == 2 and '2 bạn đang tạm khóa' in st.inner_text('#charPick') and st.locator('#cpCancel').count() == 1)
    st.click('#cpCancel'); st.wait_for_timeout(200)
    set_active(st, ['nang', 'bi', 'la'])        # tắt luôn bạn đang dùng (Lá)
    st.reload(); st.wait_for_timeout(800)
    check('bạn đang dùng bị tắt: vẫn hiện trên Trang chủ', 'Lá' in st.inner_text('#petName') or 'Lá' in st.inner_text('.pet-line'))
    st.click('#petChg'); st.wait_for_timeout(400)
    check('màn Đổi: bạn đang dùng (Lá, đã tắt) là "Đang đồng hành", KHÔNG khóa; 2 bạn khóa còn lại', st.locator('.cp-opt.cur').get_attribute('data-id') == 'la' and 'locked' not in (st.locator('.cp-opt.cur').get_attribute('class') or '') and st.locator('.cp-opt.locked').count() == 2)
    st.click('#cpCancel')

    print('D. BGH tắt hết nhân vật')
    set_active(st, [c for c in ['la','song','nang','may','cu','dau','gao','bi','lua']])
    s3 = login(ctx, base, 'nguyenminhan', 'hs002', errs)
    s3.goto(base + '/student/index.html'); s3.wait_for_timeout(800)
    check('toàn ô khóa, không có nút chọn, dòng "quay lại sau nhé", có nút Quay lại', s3.locator('.cp-opt').count() == 9 and s3.locator('.cp-opt.locked').count() == 9 and s3.locator('#cpGo').count() == 0 and 'quay lại sau nhé' in s3.inner_text('.cp-note') and s3.locator('#cpCancel').count() == 1)
    s3.click('#cpCancel'); s3.wait_for_timeout(300)
    check('quay lại: Trang chủ dùng được (hiện "Chưa có bạn đồng hành"), không kẹt màn chọn', s3.locator('#charPick').count() == 0 and 'Chưa có bạn đồng hành' in s3.inner_text('#petCard'))
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
