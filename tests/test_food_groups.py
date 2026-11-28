#!/usr/bin/env python3
"""Kiểm thử nhóm thực phẩm (Giai đoạn A): FAS/FAG theo nhóm, nút 🚫 Chưa thử, giao diện Học sinh và BGH.

Chạy:  python tests/test_food_groups.py     (cần: pip install playwright && playwright install chromium)
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

def student_part(browser, base):
    ctx1 = browser.new_context(viewport={'width': 430, 'height': 900}); add_legacy(ctx1)
    page = ctx1.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    ls = lambda k: json.loads(page.evaluate(f"localStorage.getItem('{k}')") or 'null')
    print('A. Học sinh')
    page.goto(base + '/student/index.html'); page.wait_for_timeout(500)
    check('schema = 6, có 9 nhóm', ls('mm_schema_version') == 6 and len(ls('mm_food_groups') or []) == 9)
    page.goto(base + '/index.html'); page.fill('#username', 'phambaotruc'); page.fill('#password', 'hs001'); page.click('#btnSubmit'); page.wait_for_timeout(700)
    page.goto(base + '/student/screen1.html'); page.wait_for_timeout(500)
    check('9 hành tinh (mỗi nhóm một hành tinh)', page.locator('.planet-card').count() == 9)
    check('hành tinh Rau đã mở khóa', 'unlocked' in (page.locator('.planet-card').nth(5).get_attribute('class') or ''))
    page.locator('.planet-card').nth(5).click(); page.wait_for_timeout(200)
    txt = page.inner_text('#popupContent')
    check('popup liệt kê đủ 5 nguyên liệu nhóm Rau', all(x in txt for x in ['Rau muống', 'Bông cải xanh', 'Rau dền', 'Rau lang', 'Bắp cải']))
    check('nguyên liệu chưa thử: tên mờ + ghi "Chưa thử"', txt.count('Chưa thử') >= 3 and page.locator('#popupContent .popup-item[style*="opacity"]').count() >= 3)
    page.goto(base + '/student/screen2.html'); page.wait_for_timeout(600)
    check('danh sách món: mọi thân món đóng sẵn khi mở tab (chưa hiện emoji, nút)', page.locator('.it').count() >= 2 and page.locator('.it-body:visible').count() == 0 and page.locator('.emoji-btn:visible').count() == 0 and page.locator('#confirmBtn-0').is_hidden())
    check('mỗi dòng món hiện tên, nhóm và "Chưa đánh giá"', 'Trứng chiên' in page.inner_text('#hd-0') and 'Nhóm Trứng' in page.inner_text('#hd-0') and 'Chưa đánh giá' in page.inner_text('#st-0'))
    page.click('#hd-0'); page.wait_for_timeout(250)
    check('bấm một món: nội dung mở ngay bên dưới (emoji, Thử lại, Xác nhận)', page.locator('#body-0').is_visible() and page.locator('#food-0 .emoji-btn:visible').count() == 5 and page.locator('#confirmBtn-0').is_visible())
    check('vùng đánh giá gọn: không lặp tên món/nhóm của dòng đầu, cao ≤ 345px', page.locator('#body-0 .food-name').count() == 0 and page.locator('#body-0 .food-group').count() == 0 and page.evaluate("()=>document.getElementById('body-0').getBoundingClientRect().height") <= 345)
    page.click('#hd-1'); page.wait_for_timeout(250)
    check('chỉ mở một món một lúc: mở món 2 thì món 1 đóng', page.locator('#body-1').is_visible() and page.locator('#body-0').is_hidden() and page.locator('.it-body:visible').count() == 1)
    page.click('#hd-1'); page.wait_for_timeout(250)
    check('bấm lại món đang mở thì đóng', page.locator('.it-body:visible').count() == 0)
    page.click('#hd-0'); page.wait_for_timeout(250)
    btns = page.locator('#food-0 .emoji-btn')
    check('5 nút emoji, nút cuối là 🚫 Chưa thử', btns.count() == 5 and '🚫' in btns.nth(4).inner_text() and 'Chưa thử' in btns.nth(4).inner_text())
    check('không còn nhãn XP ở "Thử lại lần sau?"', page.locator('.ta-xp').count() == 0)
    check('chưa chọn gì: lời nhắc ẩn', not page.locator('#skipNote-0').is_visible())
    COL = "()=>getComputedStyle(document.getElementById('skipNote-0')).color"
    exp = [
        (0, 'Wow! Bạn tìm được món ăn yêu thích rồi! Tuyệt vời quá! 🌟', 'rgb(27, 94, 32)', 'Rất thích → xanh lá đậm'),
        (1, 'Giỏi quá! Bạn đã cho món ăn này một cơ hội rồi đấy. Nhóm chất này rất cần thiết cho cơ thể mỗi ngày. Hãy thử thêm nữa nhé! 🌟', 'rgb(27, 94, 32)', 'Có thể ăn → xanh lá đậm'),
        (2, 'Biết đâu lần tới bạn sẽ thích món này hơn thì sao nhỉ. Hãy tiếp tục thử để cơ thể đầy đủ dưỡng chất hằng ngày bạn nhé! 🌟', 'rgb(163, 95, 0)', 'Chưa quen → vàng nghệ đậm'),
        (3, 'Không sao đâu! Mỗi người có một khẩu vị riêng mà. Nhưng đừng bỏ cuộc, bạn hãy thử lại lần tới nhé! 🌟', 'rgb(163, 95, 0)', 'Không thích → vàng nghệ đậm'),
    ]
    for k, txt, col, name in exp:
        btns.nth(k).click()
        n = page.locator('#skipNote-0')
        check('lời nhắc ' + name, n.is_visible() and n.inner_text().strip() == txt and page.evaluate(COL) == col and page.evaluate("()=>getComputedStyle(document.getElementById('skipNote-0')).fontWeight") in ('700', 'bold'), n.inner_text() if n.is_visible() else '')
    btns.nth(4).click()
    note = page.locator('#skipNote-0')
    nt = note.inner_text() if note.is_visible() else ''
    check('chọn Chưa thử: lời nhắc đỏ đúng nội dung (món + nhóm)', 'hôm nay bạn đã bỏ qua món Trứng chiên!' in nt and 'thử lại nhóm Trứng vào buổi tối tại nhà, cho cơ thể có đủ dinh dưỡng nhé! 🌟' in nt, nt)
    check('lời nhắc đỏ nằm dưới hàng emoji', page.evaluate("()=>{const n=document.getElementById('skipNote-0'),r=document.querySelector('#food-0 .emoji-row');return getComputedStyle(n).color==='rgb(198, 40, 40)'&&n.getBoundingClientRect().top>=r.getBoundingClientRect().bottom}"))
    btns.nth(3).click()
    check('đổi sang emoji khác: lời nhắc đổi theo (không còn chữ đỏ)', page.evaluate(COL) == 'rgb(163, 95, 0)' and 'bỏ qua món' not in page.locator('#skipNote-0').inner_text())
    xp0 = len(ls('mm_xp_log') or [])
    btns.nth(4).click(); page.locator('#food-0 .ta-btn').nth(0).click(); page.click('#confirmBtn-0'); page.wait_for_timeout(400)
    check('xác nhận xong: dòng đầu chuyển "✔ Đã đánh giá" kèm 🚫 Chưa thử', 'Đã đánh giá' in page.inner_text('#st-0') and 'Chưa thử' in page.inner_text('#st-0') and 'done' in (page.locator('#food-0').get_attribute('class') or ''))
    page.wait_for_timeout(3200)
    check('thông báo XP còn hiện sau 3 giây (chưa đóng)', page.locator('#body-0').is_visible())
    page.wait_for_timeout(2000)
    check('sau 5 giây món tự đóng lại', page.locator('#body-0').is_hidden())
    last = ls('mm_fas_log')[-1]
    check('"Chưa thử": ghi FAS 0, attempt null, notTried, place school, có groupId',
          last['score'] == 0 and last['attempt'] is None and last.get('notTried') and last['place'] == 'school' and last['groupId'] == 'g-trung', last)
    check('"Chưa thử" vẫn lưu tryAgain (bấm Muốn)', last['tryAgain'] is True)
    acts = [x['actionId'] for x in (ls('mm_xp_log') or [])[xp0:]]
    check('"Chưa thử" chỉ nhận emoji_rate (không first_try, không try_again)', acts == ['emoji_rate'], acts)
    page.reload(); page.wait_for_timeout(600)
    check('tải lại: món đã đánh giá hiện "✔ Đã đánh giá" kèm Chưa thử, vẫn đóng', page.locator('.it.done').count() >= 1 and 'Đã đánh giá' in page.inner_text('.it.done >> nth=0') and 'Chưa thử' in page.inner_text('.it.done >> nth=0') and page.locator('.it-body:visible').count() == 0)
    page.click('.it.done >> nth=0 >> .it-hd'); page.wait_for_timeout(250)
    check('bấm món đã đánh giá: xem lại cảm xúc, khóa, không có nút xác nhận', page.locator('.it.done.open .emoji-btn.selected').count() == 1 and page.locator('.it.done.open .emoji-btn:disabled').count() == 5 and page.locator('.it.done.open .it-lock').is_visible() and page.locator('.it.done.open .confirm-btn').is_hidden())
    page.goto(base + '/student/screen1.html'); page.wait_for_timeout(400)
    check('"Chưa thử" không mở khóa hành tinh Trứng', 'unlocked' not in (page.locator('.planet-card').nth(3).get_attribute('class') or ''))
    r = page.evaluate("""()=>{const L=JSON.parse(localStorage.getItem('mm_fas_log')),w=mmGroupRows(L,'phambaotruc','g-rau');return [mmFasChainText(w),mmGroupFag(w),mmGroupFas(w)]}""")
    check('nhóm Rau của Bảo Trúc: chuỗi 1 → 2 → 2 → 3, FAG +2, FAS 3', r == ['1 → 2 → 2 → 3', 2, 3], r)
    check('không lỗi JS (Học sinh)', not errs, errs)

    # Đánh giá thật lần đầu của nhóm Trứng: ngày khác để vượt khóa "mỗi ngày một lần"
    ctx2 = browser.new_context(viewport={'width': 430, 'height': 900}); add_legacy(ctx2)
    page2 = ctx2.new_page()
    page2.goto(base + '/index.html'); page2.fill('#username', 'phambaotruc'); page2.fill('#password', 'hs001'); page2.click('#btnSubmit'); page2.wait_for_timeout(700)
    page2.goto(base + '/student/screen2.html'); page2.wait_for_timeout(600)
    page2.click('#hd-0'); page2.wait_for_timeout(250)
    page2.locator('#food-0 .emoji-btn').nth(0).click(); page2.click('#confirmBtn-0'); page2.wait_for_timeout(400)
    ls2 = lambda k: json.loads(page2.evaluate(f"localStorage.getItem('{k}')") or 'null')
    last = ls2('mm_fas_log')[-1]
    check('đánh giá thật lần đầu của nhóm: attempt 1, FAS 4', last['attempt'] == 1 and last['score'] == 4, last)
    acts = [x['actionId'] for x in ls2('mm_xp_log')[-2:]]
    check('nhận first_try + emoji_rate', acts == ['first_try', 'emoji_rate'], acts)
    page2.goto(base + '/student/screen1.html'); page2.wait_for_timeout(400)
    check('hành tinh Trứng mở khóa (1/3)', 'unlocked' in (page2.locator('.planet-card').nth(3).get_attribute('class') or '') and '1 / 3' in page2.locator('.planet-card').nth(3).inner_text())

def admin_part(browser, base):
    ctx = browser.new_context(viewport={'width': 1300, 'height': 900}); add_legacy(ctx)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    page.on('dialog', lambda d: d.accept())
    ls = lambda k: json.loads(page.evaluate(f"localStorage.getItem('{k}')") or 'null')
    print('B. Ban giám hiệu')
    page.goto(base + '/index.html'); page.fill('#username', 'admin'); page.fill('#password', 'admin2026'); page.click('#btnSubmit'); page.wait_for_timeout(800)
    page.click('[data-module=settings]'); page.wait_for_timeout(300)
    page.click('[data-tab=ingredients]'); page.wait_for_timeout(300)
    check('thẻ Nhóm thực phẩm có 9 nhóm', page.locator('#foodGroupsBox tbody tr').count() == 9)
    check('đã bỏ Bảng dinh dưỡng và Công thức điểm khỏi tab Nguyên liệu', page.locator('#nutritionTable').count() == 0 and page.locator('#scoreFormulaBox').count() == 0)
    check('nguyên liệu hiện theo nhóm', 'Nhóm Rau' in page.inner_text('#ingredientsList') and 'Rau dền' in page.inner_text('#ingredientsList'))
    page.click('text=+ Thêm nhóm'); page.fill('#grpName', 'Sữa'); page.click('#modalGroup .btn-primary'); page.wait_for_timeout(300)
    check('thêm nhóm mới', page.locator('#foodGroupsBox tbody tr').count() == 10)
    page.locator('#foodGroupsBox tbody tr').last.locator('button[title="Xóa nhóm"]').click(); page.wait_for_timeout(300)
    check('xóa nhóm trống được; nhóm đang có nguyên liệu không có nút xóa', page.locator('#foodGroupsBox tbody tr').count() == 9 and page.locator('#foodGroupsBox button[title="Xóa nhóm"]').count() == 0)
    page.click('text=+ Thêm nguyên liệu'); page.wait_for_timeout(200)
    check('form nguyên liệu chỉ còn Nhóm, Tên, Icon (9 nhóm)', page.locator('#ingGroup option').count() == 9 and page.locator('#ingCarbs,#ingPlanet,#ingUnlocked,#ingFromTable').count() == 0)
    page.fill('#ingName', 'Sữa tươi'); page.select_option('#ingGroup', 'g-trai-cay'); page.click('#modalIngredient .btn-primary'); page.wait_for_timeout(300)
    st = [g for g in ls('mm_ingredients') if g['name'] == 'Sữa tươi'][0]
    check('lưu nguyên liệu có groupId, không có Carbs/planet', st['groupId'] == 'g-trai-cay' and 'carbs' not in st and 'planet' not in st, st)
    page.click('[data-tab=menu]'); page.wait_for_timeout(300)
    page.locator('.add-menu-btn').first.click(); page.wait_for_timeout(200)
    check('form thực đơn: chọn Nhóm thực phẩm (9 nhóm)', page.locator('#menuGroup option').count() == 9)
    page.select_option('#menuGroup', 'g-hai-san'); page.wait_for_timeout(200)
    txt = page.inner_text('#menuIngredientPick')
    check('chọn nhóm Hải sản → Cá, Tôm, Mực, Cua', all(x in txt for x in ['Cá', 'Tôm', 'Mực', 'Cua']))
    page.locator('#menuIngredientPick button:has-text("Tôm")').click(); page.fill('#menuName', 'Tôm rim'); page.click('text=Thêm vào thực đơn'); page.wait_for_timeout(300)
    m = [x for x in ls('mm_daily_menu') if x['name'] == 'Tôm rim'][0]
    check('món mới có groupId nhóm Hải sản, không còn planet', m['groupId'] == 'g-hai-san' and 'planet' not in m, m)
    page.click('[data-module=report]'); page.wait_for_timeout(500)
    t = page.inner_text('#fasTableBody')
    row = page.locator('#fasTableBody tr:has-text("Phạm Bảo Trúc")').first
    scores = row.locator('.fas-step b').all_inner_texts()
    dates = [x.replace('\n', ' ') for x in row.locator('.fas-step small').all_inner_texts()]
    check('báo cáo: chuỗi 1 → 2 → 2 → 3 và FAG +2, mỗi điểm có ngày giờ nhỏ bên dưới', scores == ['1', '2', '2', '3'] and dates[0] == '07/10 12:00' and dates[3] == '21/10 12:00' and '+2' in t, (scores, dates))
    check('rê chuột vào điểm: hiện đủ ngày giờ + nơi thử', row.locator('.fas-step').first.get_attribute('title') == '07/10/2026 12:00 · Trường', row.locator('.fas-step').first.get_attribute('title'))
    ws = page.evaluate("()=>[...document.querySelectorAll('.fas-table th')].map(t=>t.getBoundingClientRect().width)")
    check('cột Chuỗi lượt thử rộng nhất; Lớp/Nhóm/FAG/Trường/Nhà/TRY AGAIN hẹp', ws[3] == max(ws) and all(w <= 90 for w in ws[1:3] + ws[4:]), ws)
    page.evaluate("""()=>{const L=JSON.parse(localStorage.getItem('mm_fas_log'));
      L.push({studentId:'tranthanhkhoa',foodId:'cua',foodName:'Cua',groupId:'g-hai-san',place:'school',attempt:null,score:0,rating:0,tryAgain:true,notTried:true,timestamp:'2026-11-01T12:00:00'});
      L.push({studentId:'tranthanhkhoa',foodId:'ca',foodName:'Cá',groupId:'g-hai-san',place:'home',attempt:1,score:2,rating:2,tryAgain:false,timestamp:'2026-11-02T12:00:00'});
      L.push({studentId:'tranthanhkhoa',foodId:'tom',foodName:'Tôm',groupId:'g-hai-san',place:'school',attempt:2,score:3,rating:3,tryAgain:false,timestamp:'2026-11-03T12:00:00'});
      localStorage.setItem('mm_fas_log',JSON.stringify(L))}""")
    page.click('[onclick="refreshTab(\'report\')"]'); page.wait_for_timeout(400)
    check('chuỗi có "Chưa thử": 0 → 2 → 3, FAG +1 (không tính lượt 0)', page.locator('#fasTableBody tr:has-text("Hải sản") .fas-chain').first.locator('.fas-step b').all_inner_texts() == ['0', '2', '3'])
    page.select_option('#filterPlace', 'home'); page.wait_for_timeout(200)
    check('lọc Nơi thử = Nhà: còn 1 dòng', page.locator('#fasTableBody tr').count() == 1)
    page.select_option('#filterPlace', ''); page.select_option('#filterFood', 'g-cu'); page.wait_for_timeout(200)
    check('lọc nhóm Củ: dòng của Minh An', page.locator('#fasTableBody tr').count() == 1 and 'Minh An' in page.inner_text('#fasTableBody'))
    with page.expect_download() as dl:
        page.click('text=📥 Xuất CSV')
    csv = open(dl.value.path(), encoding='utf-8-sig').read()
    check('CSV có cột Nơi thử và dòng "Nhà", ô được đặt trong dấu nháy', 'Nơi thử' in csv and '"Nhà"' in csv)
    page.click('[data-module=settings]'); page.click('[data-tab=badges]'); page.wait_for_timeout(300)
    check('huy hiệu Bạn Rau theo nhóm', 'Bạn Rau' in page.inner_text('#tab-badges'))
    check('không lỗi JS (BGH)', not errs, errs)

def main():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    base = f'http://127.0.0.1:{port}'
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            student_part(b, base); admin_part(b, base)
            b.close()
    finally:
        srv.terminate()
    failed = res.count(False)
    print(f'\nTổng: {len(res)} bước, {failed} lỗi')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()
