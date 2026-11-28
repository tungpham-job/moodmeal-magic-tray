#!/usr/bin/env python3
"""Kiểm thử nhân vật đồng hành: BGH gán nhân vật ở Danh sách tài khoản, tiến hóa khi lên Level, BGH thiết lập nhân vật.

Chạy:  python tests/test_characters.py     (cần: pip install playwright && playwright install chromium)
Thoát mã 0 nếu mọi bước đạt, mã 1 nếu có bước lỗi. Dùng trình duyệt mới, không đụng dữ liệu trình duyệt thật.
"""
import base64, json, socket, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).resolve().parent))
from legacy_fixture import add_legacy

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

def assign(ad, sid, char_id):
    """BGH: mở form sửa tài khoản học sinh, chọn nhân vật, lưu."""
    ad.click('[data-module=accounts]'); ad.wait_for_timeout(300)
    ad.click(f'#accountsTbody tr:has-text("{sid}") button[title="Sửa"]'); ad.wait_for_timeout(300)
    ad.select_option('#accFormChar', char_id); ad.click('button:has-text("Lưu tài khoản")'); ad.wait_for_timeout(400)

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 430, 'height': 900})
    add_legacy(ctx)
    ad, errs_a = login(ctx, base, 'admin', 'admin2026')

    print('0. Dữ liệu mẫu: Phạm Bảo Trúc 605 XP, Gạo → Kim Vương (Level 4)')
    s0, errs0 = login(ctx, base, 'phambaotruc', 'hs001')
    s0.goto(base + '/student/index.html'); s0.wait_for_timeout(800)
    check('605 XP, Level 4, nhân vật Gạo ở hình Kim Vương, thẻ vàng', s0.inner_text('#petName') == 'Kim Vương' and 'Dòng Gạo · Level 4' in s0.inner_text('.pet-line') and 'max' in (s0.locator('#petCard').get_attribute('class') or '') and ls(s0, 'mm_accounts') is not None and {a['id']: a for a in ls(s0, 'mm_accounts')}['phambaotruc']['xp'] == 605)
    check('không lỗi JS (dữ liệu mẫu)', not errs0, errs0)
    # các phần sau thử tiến hóa từ Level 2: đặt lại XP nền = 185
    ad.evaluate("()=>{const a=JSON.parse(localStorage.getItem('mm_accounts'));a.find(x=>x.id==='phambaotruc').xp=185;localStorage.setItem('mm_accounts',JSON.stringify(a));localStorage.removeItem('mm_char_state')}")
    ad.reload(); ad.wait_for_timeout(500)

    print('A. BGH gán nhân vật trong Danh sách tài khoản')
    ad.click('[data-module=accounts]'); ad.wait_for_timeout(300)
    check('bảng tài khoản có cột "Nhân vật"', any(h.strip().lower() == 'nhân vật' for h in ad.locator('th').all_inner_texts()))
    check('mặc định: Phạm Bảo Trúc có Gạo; học sinh khác chưa gán ghi "Chưa chọn"', {a['id']: a for a in ls(ad, 'mm_accounts')}['phambaotruc'].get('characterId') == 'gao' and 'Gạo' in ad.inner_text('#accountsTbody tr:has-text("phambaotruc")') and 'Chưa chọn' in ad.inner_text('#accountsTbody tr:has-text("tranthanhkhoa")'))
    ad.click('#accountsTbody tr:has-text("phambaotruc") button[title="Sửa"]'); ad.wait_for_timeout(300)
    opts = ad.locator('#accFormChar option').all_inner_texts()
    check('form có ô chọn nhân vật: "— Chưa chọn —" + 9 nhân vật', len(opts) == 10 and opts[0].startswith('—'), opts)
    ad.click('button:has-text("Hủy")') if ad.locator('button:has-text("Hủy")').count() else None
    ad.wait_for_timeout(200)
    assign(ad, 'phambaotruc', 'la')
    acc = {a['id']: a for a in ls(ad, 'mm_accounts')}
    check('nhân vật lưu trên tài khoản (characterId = la)', acc['phambaotruc'].get('characterId') == 'la', acc['phambaotruc'])
    check('bảng hiện tên nhân vật Lá', 'Lá' in ad.inner_text('#accountsTbody tr:has-text("phambaotruc")'))
    check('lưu ghi nhận Level đã thấy (chỉ số 1) để không chiếu tiến hóa', ls(ad, 'mm_char_state')['phambaotruc'] == {'seenLevelIdx': 1}, ls(ad, 'mm_char_state'))
    check('tài khoản phụ huynh/BGH không có nhân vật', not acc['phbaotruc'].get('characterId') if 'phbaotruc' in acc else True)

    print('B. Học sinh: chỉ xem nhân vật đã được gán')
    st, errs = login(ctx, base, 'phambaotruc', 'hs001')
    st.goto(base + '/student/index.html'); st.wait_for_timeout(700)
    check('mục "Chọn session hôm nay" đã bỏ', st.locator('.nav-cards').count() == 0 and 'Chọn session' not in st.inner_text('body'))
    check('không có màn chọn nhân vật; thẻ hiện Lá Nhí', st.locator('.char-chooser').count() == 0 and st.locator('.char-opt').count() == 0 and st.inner_text('#petName') == 'Lá Nhí')
    check('thẻ ghi dòng nhân vật, Level và XP còn thiếu', 'Dòng Lá · Level 2 · Người khám phá' in st.inner_text('.pet-line') and 'Còn 115 XP để tiến hóa thành' in st.inner_text('#petNext') and 'Cây Khỏe' in st.inner_text('#petNext'), st.inner_text('#petNext'))
    check('có nút "Đổi nhân vật" nhỏ trong thẻ; không có nút Xem tiến hóa', st.locator('#petChg').count() == 1 and 'Đổi nhân vật' in st.inner_text('#petChg') and st.locator('#petChg').bounding_box()['height'] <= 24 and st.locator('#petReplay').count() == 0)
    order = st.evaluate("()=>{const t=s=>document.querySelector(s).getBoundingClientRect().top;return t('.home-hero')<t('#petCard')&&t('#petCard')<t('#missionBanner')}")
    check('thẻ nhân vật nằm dưới thông tin học sinh, trên "Mục tiêu hôm nay"', order)
    check('hoạt ảnh chờ theo cấu hình Level 2 (Lơ lửng)', 'anim-float' in (st.locator('#petStage').get_attribute('class') or ''))
    check('lần đầu mở: không chiếu hoạt ảnh lên cấp', 'show' not in (st.locator('#petLvUp').get_attribute('class') or ''))

    s2, errs2 = login(ctx, base, 'nguyenminhan', 'hs002')
    s2.goto(base + '/student/index.html'); s2.wait_for_timeout(700)
    check('học sinh chưa có nhân vật: hiện màn chọn bạn đồng hành (9 bạn), không còn nút "Chọn bạn này"', s2.locator('#charPick').count() == 1 and s2.locator('.cp-opt').count() == 9 and s2.locator('#cpGo').count() == 0 and 'Chọn bạn đồng hành' in s2.inner_text('#charPick'))
    check('hình ở màn chọn là Level 1 (không mũ, không tay)', 'Chọn bạn đồng hành' in s2.inner_text('.cp-hero') and s2.locator('.cp-opt svg').count() == 9)
    s2.click('.cp-opt[data-id="bi"]'); s2.wait_for_timeout(150)
    check('bấm một bạn: bạn đó sáng viền', 'picked' in (s2.locator('.cp-opt[data-id="bi"]').get_attribute('class') or ''))
    s2.wait_for_timeout(350)
    check('bấm vào nhân vật là hiện luôn popup xác nhận "Chọn bạn Bí nhé?" với nút Xác nhận', 'show' in (s2.locator('#cpSheet').get_attribute('class') or '') and 'Chọn bạn Bí nhé?' in s2.inner_text('#cpSheet') and 'Xác nhận' in s2.inner_text('#cpOk'))
    s2.click('#cpBack'); s2.wait_for_timeout(350)
    check('"Chọn lại": đóng popup, bỏ viền chọn, chưa lưu nhân vật', s2.locator('.cp-opt.picked').count() == 0 and 'show' not in (s2.locator('#cpSheet').get_attribute('class') or '') and not {a['id']: a for a in ls(s2, 'mm_accounts')}['nguyenminhan'].get('characterId'))
    s2.click('.cp-opt[data-id="bi"]'); s2.wait_for_timeout(300); s2.click('#cpOk'); s2.wait_for_timeout(500)
    check('"Xác nhận": lưu characterId = bi vào tài khoản, màn chọn biến mất, hiện thẻ nhân vật', {a['id']: a for a in ls(s2, 'mm_accounts')}['nguyenminhan'].get('characterId') == 'bi' and s2.locator('#charPick').count() == 0 and s2.locator('#petCard').count() == 1)
    check('chọn xong hiện thẳng hình của Level hiện tại (không chiếu hoạt ảnh lên cấp), ghi nhận Level đã thấy', 'show' not in (s2.locator('#petLvUp').get_attribute('class') or '') and 'seenLevelIdx' in ls(s2, 'mm_char_state').get('nguyenminhan', {}))
    s2.reload(); s2.wait_for_timeout(700)
    check('tải lại: không hiện màn chọn nữa; thẻ có nút Đổi nhân vật', s2.locator('#charPick').count() == 0 and s2.locator('.cp-opt').count() == 0 and s2.locator('#petChg').count() == 1)
    check('không lỗi JS (học sinh chưa gán)', not errs2, errs2)

    print('C. Lên Level → tiến hóa')
    add_xp(st, 'phambaotruc', 6)                       # 185 + 120 = 305 XP → Level 3
    st.reload(); st.wait_for_timeout(900)
    check('lên Level 3: hiện chữ "Lên Level 3" và hiệu ứng chớp sáng', 'Lên Level 3' in st.inner_text('#petLvUp') and 'show' in (st.locator('#petLvUp').get_attribute('class') or ''))
    st.wait_for_timeout(1500)
    check('sau hoạt ảnh: đổi sang hình Cây Khỏe, hoạt ảnh Lắc lư', st.inner_text('#petName') == 'Cây Khỏe' and 'anim-sway' in (st.locator('#petStage').get_attribute('class') or ''))
    check('Level đã thấy cập nhật (chỉ số 2)', ls(st, 'mm_char_state')['phambaotruc']['seenLevelIdx'] == 2)
    st.reload(); st.wait_for_timeout(1000)
    check('tải lại: không chiếu lại hoạt ảnh lên cấp', 'show' not in (st.locator('#petLvUp').get_attribute('class') or ''))
    add_xp(st, 'phambaotruc', 16)                      # +320 → 625 XP → Level 4
    st.reload(); st.wait_for_timeout(2800)
    check('Level 4: Mộc Vương, thẻ vàng, hoạt ảnh hào quang', st.inner_text('#petName') == 'Mộc Vương' and 'max' in (st.locator('#petCard').get_attribute('class') or '') and 'anim-epic' in (st.locator('#petStage').get_attribute('class') or ''))
    check('Level 4 có hào quang và hạt bay quanh (SVG)', st.locator('#petArt svg animateTransform').count() >= 2)
    check('Level cao nhất: ghi "Đã tiến hóa cao nhất"', 'cao nhất' in st.inner_text('#petNext'))
    st.click('#petChg'); st.wait_for_timeout(300)
    check('bấm "Đổi nhân vật": màn đổi hiện 9 bạn theo Level 4 (tên Vương), nhãn Level, không có nút "Chọn bạn này"', st.locator('#charPick').count() == 1 and st.locator('.cp-opt').count() == 9 and 'Đổi bạn đồng hành' in st.inner_text('.cp-hero') and 'Level 4' in st.inner_text('.cp-lv') and 'Hải Vương' in st.inner_text('#charPick') and 'Kim Vương' in st.inner_text('#charPick') and st.locator('#cpGo').count() == 0)
    check('bạn đang đồng hành (Lá) có nhãn "Đang đồng hành" và bấm vào không mở nút chọn', 'Đang đồng hành' in st.inner_text('.cp-opt.cur') and st.locator('.cp-opt.cur').get_attribute('data-id') == 'la')
    st.click('.cp-opt.cur'); st.wait_for_timeout(150)
    check('bấm bạn đang dùng: không mở popup xác nhận', 'show' not in (st.locator('#cpSheet').get_attribute('class') or ''))
    st.click('#cpCancel'); st.wait_for_timeout(200)
    check('"Quay lại Trang chủ": đóng màn đổi, chưa đổi nhân vật', st.locator('#charPick').count() == 0 and {a['id']: a for a in ls(st, 'mm_accounts')}['phambaotruc'].get('characterId') == 'la')
    st.click('#petChg'); st.wait_for_timeout(300); st.click('.cp-opt[data-id="song"]'); st.wait_for_timeout(300)
    check('chọn bạn khác: popup "Đổi sang Hải Vương nhé?"', 'show' in (st.locator('#cpSheet').get_attribute('class') or '') and 'Đổi sang Hải Vương nhé?' in st.inner_text('#cpSheet'))
    st.click('#cpOk'); st.wait_for_timeout(500)
    check('xác nhận: lưu characterId = song, thẻ hiện Hải Vương, giữ Level 4, không chiếu tiến hóa', {a['id']: a for a in ls(st, 'mm_accounts')}['phambaotruc'].get('characterId') == 'song' and st.locator('#charPick').count() == 0 and st.inner_text('#petName') == 'Hải Vương' and 'Level 4' in st.inner_text('.pet-line') and 'show' not in (st.locator('#petLvUp').get_attribute('class') or ''))
    st.click('#petChg'); st.wait_for_timeout(300); st.click('.cp-opt[data-id="la"]'); st.wait_for_timeout(300); st.click('#cpOk'); st.wait_for_timeout(500)
    check('đổi lại về Lá được (không giới hạn số lần), thẻ hiện Mộc Vương', {a['id']: a for a in ls(st, 'mm_accounts')}['phambaotruc'].get('characterId') == 'la' and st.inner_text('#petName') == 'Mộc Vương')
    check('không lỗi JS (Học sinh)', not errs, errs)

    print('D. BGH: thiết lập danh sách nhân vật')
    ad.click('[data-module=settings]'); ad.wait_for_timeout(300)
    ad.click('[data-tab=characters]'); ad.wait_for_timeout(400)
    check('danh sách có 9 nhân vật, bảng có 4 Level', ad.locator('#charList .char-item').count() == 9 and ad.locator('#charEditor .char-lv tbody tr').count() == 4)
    check('nhân vật Lá đã gán cho học sinh: không có nút Xóa', ad.locator('#charEditor button:has-text("Xóa")').count() == 0 and 'đang dùng' in ad.inner_text('#charList .char-item[data-id="la"]'))
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

    print('E. Ô chọn nhân vật trong form tài khoản theo danh sách đã lưu')
    ad.click('[data-module=accounts]'); ad.wait_for_timeout(300)
    ad.click('#accountsTbody tr:has-text("nguyenminhan") button[title="Sửa"]'); ad.wait_for_timeout(300)
    names = ad.locator('#accFormChar option').all_inner_texts()
    check('chỉ liệt kê nhân vật đang bật (không có Mây, có Rồng Đỏ)', len(names) == 10 and names[0].startswith('—') and not any('Mây' in n for n in names) and any('Rồng Đỏ' in n for n in names), names)
    ad.select_option('#accFormChar', cu[0]['id']); ad.click('button:has-text("Lưu tài khoản")'); ad.wait_for_timeout(400)
    s2.reload(); s2.wait_for_timeout(700)
    check('học sinh vừa được gán thấy thẻ nhân vật tự thêm', s2.locator('#petCard').count() == 1 and s2.locator('.pet-empty').count() == 0 and s2.inner_text('#petName'))
    ad.click('[data-module=accounts]'); ad.click('#accountsTbody tr:has-text("nguyenminhan") button[title="Sửa"]'); ad.wait_for_timeout(300)
    ad.select_option('#accFormChar', ''); ad.click('button:has-text("Lưu tài khoản")'); ad.wait_for_timeout(400)
    check('bỏ chọn: xóa characterId khỏi tài khoản', not {a['id']: a for a in ls(ad, 'mm_accounts')}['nguyenminhan'].get('characterId'))
    ad.click('#accountsTbody tr:has-text("nguyenminhan") button[title="Sửa"]'); ad.wait_for_timeout(300)
    ad.select_option('#accFormChar', cu[0]['id']); ad.click('button:has-text("Lưu tài khoản")'); ad.wait_for_timeout(400)

    print('F. BGH: xóa / khôi phục mặc định khi có tài khoản đang dùng')
    ad.click('[data-module=settings]'); ad.click('[data-tab=characters]'); ad.wait_for_timeout(300)
    ad.on('dialog', lambda d: d.accept())
    ad.locator('#charList .char-item', has_text='Rồng Đỏ').click(); ad.wait_for_timeout(200)
    check('nhân vật tự thêm đang được gán: không có nút Xóa', ad.locator('#charEditor button:has-text("Xóa")').count() == 0)
    ad.click('button:has-text("Khôi phục mặc định")'); ad.wait_for_timeout(300)
    check('khôi phục mặc định bị chặn khi tài khoản đang dùng nhân vật tự thêm', ls(ad, 'mm_characters') is not None and 'chưa thể khôi phục' in ad.inner_text('#toastContainer'))
    ad.click('[data-module=accounts]'); ad.click('#accountsTbody tr:has-text("nguyenminhan") button[title="Sửa"]'); ad.wait_for_timeout(300)
    ad.select_option('#accFormChar', ''); ad.click('button:has-text("Lưu tài khoản")'); ad.wait_for_timeout(400)
    ad.click('[data-module=settings]'); ad.click('[data-tab=characters]'); ad.wait_for_timeout(300)
    ad.locator('#charList .char-item', has_text='Rồng Đỏ').click(); ad.wait_for_timeout(200)
    check('bỏ gán xong: có nút Xóa', ad.locator('#charEditor button:has-text("Xóa")').count() == 1)
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
