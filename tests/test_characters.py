#!/usr/bin/env python3
"""Kiểm thử nhân vật đồng hành: chọn lần đầu, tiến hóa khi lên Level, BGH thiết lập nhân vật.

Chạy:  python tests/test_characters.py     (cần: pip install playwright && playwright install chromium)
Thoát mã 0 nếu mọi bước đạt, mã 1 nếu có bước lỗi. Dùng trình duyệt mới, không đụng dữ liệu trình duyệt thật.
"""
import base64, json, socket, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
res = []

def check(name, ok, detail=''):
    res.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))

def login(ctx, base, user, pw, w=430):
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(base + '/index.html'); pg.fill('#username', user); pg.fill('#password', pw); pg.click('#btnSubmit'); pg.wait_for_timeout(700)
    return pg, errs

def ls(pg, k): return json.loads(pg.evaluate(f"localStorage.getItem('{k}')") or 'null')

def add_xp(pg, sid, n):
    pg.evaluate("([sid,n])=>{for(let i=0;i<n;i++) awardXp(sid,'parent_confirm','t'+Date.now()+'-'+i+'-'+Math.random())}", [sid, n])

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 430, 'height': 900})
    st, errs = login(ctx, base, 'phambaotruc', 'hs001')
    st.goto(base + '/student/index.html'); st.wait_for_timeout(700)

    print('A. Học sinh: Trang chủ và chọn nhân vật lần đầu')
    check('mục "Chọn session hôm nay" đã bỏ', st.locator('.nav-cards').count() == 0 and 'Chọn session' not in st.inner_text('body'))
    check('lần đầu: hiện màn chọn nhân vật với 9 bạn', st.locator('.char-chooser').count() == 1 and st.locator('.char-opt').count() == 9)
    check('nút chọn bị khóa khi chưa chọn', st.locator('#charOk').is_disabled())
    st.locator('.char-opt[data-id="la"]').click()
    check('chọn xong: nút mở, ô được đánh dấu', not st.locator('#charOk').is_disabled() and st.locator('.char-opt.picked').count() == 1)
    st.click('#charOk'); st.wait_for_timeout(300)
    state = ls(st, 'mm_char_state')['phambaotruc']
    check('lưu nhân vật đã chọn + Level đã thấy (Level 2 → chỉ số 1)', state == {'charId': 'la', 'seenLevelIdx': 1}, state)
    check('màn chọn biến mất, hiện thẻ nhân vật đúng tên hình dạng Lá Nhí', st.locator('.char-chooser').count() == 0 and st.inner_text('#petName') == 'Lá Nhí')
    check('thẻ ghi dòng nhân vật, Level và XP còn thiếu', 'Dòng Lá · Level 2 · Người khám phá' in st.inner_text('.pet-line') and 'Còn 115 XP để tiến hóa thành' in st.inner_text('#petNext') and 'Cây Khỏe' in st.inner_text('#petNext'), st.inner_text('#petNext'))
    check('không còn nút "Đổi nhân vật"', 'Đổi nhân vật' not in st.inner_text('body'))
    order = st.evaluate("()=>{const t=s=>document.querySelector(s).getBoundingClientRect().top;return t('.home-hero')<t('#petCard')&&t('#petCard')<t('#missionBanner')}")
    check('thẻ nhân vật nằm dưới thông tin học sinh, trên "Mục tiêu hôm nay"', order)
    st.reload(); st.wait_for_timeout(600)
    check('tải lại: không hỏi chọn lại, vẫn có thẻ', st.locator('.char-chooser').count() == 0 and st.locator('#petCard').count() == 1)
    check('hoạt ảnh chờ theo cấu hình Level 2 (Lơ lửng)', 'anim-float' in (st.locator('#petStage').get_attribute('class') or ''))

    print('B. Lên Level → tiến hóa')
    add_xp(st, 'phambaotruc', 6)                       # 185 + 120 = 305 XP → Level 3
    st.reload(); st.wait_for_timeout(900)
    check('lên Level 3: hiện chữ "Lên Level 3" và hiệu ứng chớp sáng', 'Lên Level 3' in st.inner_text('#petLvUp') and 'show' in (st.locator('#petLvUp').get_attribute('class') or ''))
    st.wait_for_timeout(1500)
    check('sau hoạt ảnh: đổi sang hình Cây Khỏe, hoạt ảnh Lắc lư', st.inner_text('#petName') == 'Cây Khỏe' and 'anim-sway' in (st.locator('#petStage').get_attribute('class') or ''))
    check('Level đã thấy cập nhật (chỉ số 2)', ls(st, 'mm_char_state')['phambaotruc']['seenLevelIdx'] == 2)
    st.reload(); st.wait_for_timeout(1000)
    check('tải lại: không chiếu lại hoạt ảnh lên cấp', 'show' not in (st.locator('#petLvUp').get_attribute('class') or ''))
    check('không có nút "Xem tiến hóa"; thẻ hiện đúng nhân vật đã chọn ở Level hiện tại', st.locator('#petReplay').count() == 0 and 'Xem tiến hóa' not in st.inner_text('body') and st.inner_text('#petName') == 'Cây Khỏe' and 'Dòng Lá · Level 3' in st.inner_text('.pet-line'))
    add_xp(st, 'phambaotruc', 16)                      # +320 → 625 XP → Level 4
    st.reload(); st.wait_for_timeout(2800)
    check('Level 4: Đại Thụ Xanh, thẻ vàng, hoạt ảnh hào quang', st.inner_text('#petName') == 'Đại Thụ Xanh' and 'max' in (st.locator('#petCard').get_attribute('class') or '') and 'anim-epic' in (st.locator('#petStage').get_attribute('class') or ''))
    check('Level 4 có hào quang và hạt bay quanh (SVG)', st.locator('#petArt svg animateTransform').count() >= 2)
    check('Level cao nhất: ghi "Đã tiến hóa cao nhất"', 'cao nhất' in st.inner_text('#petNext'))
    check('không lỗi JS (Học sinh)', not errs, errs)

    print('C. BGH: thiết lập nhân vật')
    ad, errs_a = login(ctx, base, 'admin', 'admin2026')
    ad.click('[data-module=settings]'); ad.wait_for_timeout(300)
    ad.click('[data-tab=characters]'); ad.wait_for_timeout(400)
    check('danh sách có 9 nhân vật, bảng có 4 Level', ad.locator('#charList .char-item').count() == 9 and ad.locator('#charEditor .char-lv tbody tr').count() == 4)
    check('nhân vật Lá đã có học sinh dùng: không có nút Xóa', ad.locator('#charEditor button:has-text("Xóa")').count() == 0 and 'đang dùng' in ad.inner_text('#charList .char-item[data-id="la"]'))
    ad.fill('#stName-3', 'Đại Thụ Vàng'); ad.select_option('#stAnim-0', 'sway'); ad.select_option('#stEff-1', 'none')
    ad.locator('#charList .char-item[data-id="may"]').click(); ad.wait_for_timeout(200)
    ad.click('#charEditor button:has-text("Tắt nhân vật")'); ad.wait_for_timeout(200)
    ad.click('button:has-text("+ Thêm nhân vật")'); ad.wait_for_timeout(300)
    check('thêm nhân vật mới: có 10 mục, hiện ô chọn màu', ad.locator('#charList .char-item').count() == 10 and ad.locator('#charColor').count() == 1)
    ad.fill('#charName', 'Rồng Đỏ'); ad.fill('#charDesc', 'Bạn nhỏ thử thách')
    big = Path(tempfile.gettempdir()) / 'big.png'; big.write_bytes(b'\x89PNG' + b'0' * (320 * 1024))
    ad.set_input_files('#stFile-0', str(big)); ad.wait_for_timeout(300)
    check('ảnh quá 300 KB bị từ chối', ad.locator('.toast.error').count() >= 1 and 'quá lớn' in ad.inner_text('#toastContainer'))
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    ok = Path(tempfile.gettempdir()) / 'ok.png'; ok.write_bytes(png)
    ad.set_input_files('#stFile-0', str(ok)); ad.wait_for_timeout(400)
    check('tải ảnh hợp lệ: hình xem trước đổi sang ảnh', ad.locator('#charEditor tbody tr:nth-child(1) img.char-img').count() == 1)
    ad.click('#btnSaveChars'); ad.wait_for_timeout(300)
    saved = ls(ad, 'mm_characters') or []
    byid = {c['id']: c for c in saved}
    check('lưu: 10 nhân vật, Mây tắt, tên hình dạng/hoạt ảnh/hiệu ứng đã sửa',
          len(saved) == 10 and byid['may']['active'] is False and byid['la']['stages'][3]['name'] == 'Đại Thụ Vàng' and byid['la']['stages'][0]['anim'] == 'sway' and byid['la']['stages'][1]['effect'] == 'none')
    cu = [c for c in saved if c['name'] == 'Rồng Đỏ']
    check('nhân vật mới lưu mô tả và ảnh tải lên', len(cu) == 1 and cu[0]['desc'] == 'Bạn nhỏ thử thách' and (cu[0]['stages'][0]['image'] or '').startswith('data:image/png'))
    st.reload(); st.wait_for_timeout(2800)
    check('học sinh thấy tên hình dạng mới sau khi BGH sửa', st.inner_text('#petName') == 'Đại Thụ Vàng', st.inner_text('#petName'))

    ctx2 = browser.new_context(viewport={'width': 430, 'height': 900})
    s2, errs2 = login(ctx2, base, 'nguyenminhan', 'hs002')
    # localStorage khác ngữ cảnh: nạp dữ liệu BGH đã lưu sang ngữ cảnh mới
    s2.evaluate("d=>localStorage.setItem('mm_characters', d)", json.dumps(saved))
    s2.goto(base + '/student/index.html'); s2.wait_for_timeout(700)
    names = s2.locator('.char-opt b').all_inner_texts()
    check('học sinh khác thấy 9 nhân vật đang bật (không có Mây, có Rồng Đỏ)', len(names) == 9 and 'Mây' not in names and 'Rồng Đỏ' in names, names)
    check('nhân vật tự thêm có ảnh hiện ở màn chọn', s2.locator('.char-opt[data-id="%s"] img.char-img' % cu[0]['id']).count() == 1)
    s2.locator('.char-opt[data-id="%s"]' % cu[0]['id']).click(); s2.click('#charOk'); s2.wait_for_timeout(300)
    check('chọn nhân vật tự thêm: thẻ hiện tên hình dạng', s2.locator('#petCard').count() == 1 and s2.inner_text('#petName'))
    check('không lỗi JS (học sinh 2)', not errs2, errs2)

    ad.reload(); ad.wait_for_timeout(400)
    ad.click('[data-module=settings]'); ad.click('[data-tab=characters]'); ad.wait_for_timeout(300)
    check('BGH mở lại: dữ liệu đã lưu còn nguyên (10 nhân vật)', ad.locator('#charList .char-item').count() == 10)
    ad.locator('#charList .char-item', has_text='Rồng Đỏ').click(); ad.wait_for_timeout(200)
    check('nhân vật tự thêm chưa có học sinh dùng: có nút Xóa', ad.locator('#charEditor button:has-text("Xóa")').count() == 1)
    ad.on('dialog', lambda d: d.accept())
    cid = cu[0]['id']
    st_all = ls(ad, 'mm_char_state'); st_all['nguyenminhan'] = {'charId': cid, 'seenLevelIdx': 1}
    ad.evaluate("d=>localStorage.setItem('mm_char_state', d)", json.dumps(st_all))
    ad.click('button:has-text("Khôi phục mặc định")'); ad.wait_for_timeout(300)
    check('khôi phục mặc định bị chặn khi học sinh đang dùng nhân vật tự thêm', ls(ad, 'mm_characters') is not None and 'chưa thể khôi phục' in ad.inner_text('#toastContainer'))
    st_all.pop('nguyenminhan'); ad.evaluate("d=>localStorage.setItem('mm_char_state', d)", json.dumps(st_all))
    ad.locator('#charList .char-item', has_text='Rồng Đỏ').click(); ad.wait_for_timeout(200)
    ad.click('#charEditor button:has-text("Xóa")'); ad.wait_for_timeout(300)
    check('xóa nhân vật chưa ai dùng: còn 9 mục trong bản nháp', ad.locator('#charList .char-item').count() == 9)
    ad.click('button:has-text("Khôi phục mặc định")'); ad.wait_for_timeout(300)
    check('khôi phục mặc định: xóa bản đã lưu, 9 nhân vật gốc đều bật', ls(ad, 'mm_characters') is None and ad.locator('#charList .char-item .badge-green').count() == 9)
    check('không lỗi JS (BGH)', not errs_a, errs_a)

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
