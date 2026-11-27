#!/usr/bin/env python3
"""Kiểm thử Giai đoạn C: luồng "Muốn" ở trường → yêu cầu ba mẹ nấu ở nhà → đánh giá ở nhà.

Chạy:  python tests/test_home_requests.py     (cần: pip install playwright && playwright install chromium)
Thoát mã 0 nếu mọi bước đạt, mã 1 nếu có bước lỗi. Dùng trình duyệt mới, không đụng dữ liệu trình duyệt thật.
"""
import json, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
res = []

def check(name, ok, detail=''):
    res.append(bool(ok))
    print(('  [ĐẠT] ' if ok else '  [LỖI] ') + name + (f'  → {detail}' if detail and not ok else ''))

def login(ctx, base, user, pw):
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(base + '/index.html'); pg.fill('#username', user); pg.fill('#password', pw); pg.click('#btnSubmit'); pg.wait_for_timeout(700)
    return pg, errs

def run(browser, base):
    ctx = browser.new_context(viewport={'width': 430, 'height': 900})
    st, errs_s = login(ctx, base, 'phambaotruc', 'hs001')
    ls = lambda k: json.loads(st.evaluate(f"localStorage.getItem('{k}')") or 'null')
    st.goto(base + '/student/screen2.html'); st.wait_for_timeout(600)

    print('A. Học sinh: bấm "Muốn" ở trường')
    st.locator('#food-0 .emoji-btn').nth(4).click()                       # 🚫 Chưa thử
    st.locator('#food-0 .ta-btn').nth(0).click(); st.click('#confirmBtn-0'); st.wait_for_timeout(400)
    reqs = ls('mm_home_requests') or []
    r0 = reqs[0] if reqs else {}
    check('tạo 1 yêu cầu pending, đúng nhóm/món/học sinh',
          len(reqs) == 1 and r0.get('status') == 'pending' and r0.get('groupId') == 'g-trung' and r0.get('dishName') == 'Trứng chiên' and r0.get('studentId') == 'phambaotruc', reqs)
    days = (time.mktime(time.strptime(r0['expiresAt'][:10], '%Y-%m-%d')) - time.mktime(time.strptime(r0['createdAt'][:10], '%Y-%m-%d'))) / 86400 if r0 else 0
    check('hết hạn sau 7 ngày', abs(days) in (7, 6, 8) and r0.get('respondedAt') is None and r0.get('ratedAt') is None, r0)
    check('toast báo đã hẹn ba mẹ', 'Đã hẹn ba mẹ nấu ở nhà' in st.inner_text('#toast-0'), st.inner_text('#toast-0'))
    check('FAS vẫn ghi tryAgain khi chọn Muốn', ls('mm_fas_log')[-1]['tryAgain'] is True)
    dup = st.evaluate("mmReqCreate('phambaotruc',{groupId:'g-trung',foodId:'trung',dishName:'Trứng',icon:'🥚'})")
    check('cùng nhóm đã hẹn: "Em đã hẹn nhóm này rồi"', dup['ok'] is False and dup['message'] == 'Em đã hẹn nhóm này rồi', dup)
    ok2 = st.evaluate("mmReqCreate('phambaotruc',{groupId:'g-rau',foodId:'rau-muong',dishName:'Rau muống xào',icon:'🥬'})")
    lim = st.evaluate("mmReqCreate('phambaotruc',{groupId:'g-thit',foodId:'thit-heo',dishName:'Thịt kho',icon:'🍖'})")
    check('yêu cầu thứ 2 trong ngày được tạo', ok2['ok'] is True, ok2)
    check('yêu cầu thứ 3: "Hôm nay em đã hẹn đủ 2 món"', lim['ok'] is False and lim['message'] == 'Hôm nay em đã hẹn đủ 2 món', lim)
    check('chưa có thẻ "Bữa tối ở nhà" khi ba mẹ chưa xác nhận', st.locator('.home-card').count() == 0)

    print('B. Phụ huynh')
    pa, errs_p = login(ctx, base, 'phbaotruc', 'ph001')
    pa.wait_for_timeout(300)
    check('danh sách có 2 yêu cầu đang chờ', pa.locator('#requestsBox .req-card').count() == 2)
    rid_trung, rid_rau = r0['id'], ok2['req']['id']
    xp0 = len(ls('mm_xp_log') or [])
    pa.locator(f'#req-{rid_trung} .btn-confirm-yes').click(); pa.wait_for_timeout(300)
    pa.locator(f'#req-{rid_rau} .btn-confirm-no').click(); pa.wait_for_timeout(300)
    byid = {r['id']: r for r in ls('mm_home_requests')}
    check('"Con đã ăn ở nhà tối nay" → cooked, có respondedAt', byid[rid_trung]['status'] == 'cooked' and byid[rid_trung]['respondedAt'])
    check('"Chưa nấu được" → declined', byid[rid_rau]['status'] == 'declined')
    xl = (ls('mm_xp_log') or [])[xp0:]
    check('con nhận +20 XP parent_confirm, refId = mã yêu cầu', len(xl) == 1 and xl[0]['actionId'] == 'parent_confirm' and xl[0]['xp'] == 20 and xl[0]['refId'] == rid_trung and xl[0]['studentId'] == 'phambaotruc', xl)
    check('hết yêu cầu chờ; lịch sử có 2 dòng', pa.locator('#requestsBox .req-card').count() == 0 and pa.locator('#requestsHistory .req-row').count() == 2)
    ht = pa.inner_text('#requestsHistory')
    check('lịch sử ghi "Chờ con đánh giá" và "Chưa nấu được"', 'Chờ con đánh giá' in ht and 'Chưa nấu được' in ht, ht)
    again = pa.evaluate(f"mmReqRespond('{rid_trung}','cooked')")
    xl2 = (ls('mm_xp_log') or [])[xp0:]
    check('xác nhận lần 2 bị từ chối, không cộng XP lần nữa', again is None and len(xl2) == 1)

    print('C. Học sinh: đánh giá ở nhà')
    st.goto(base + '/student/screen2.html'); st.wait_for_timeout(600)
    check('có thẻ "Bữa tối ở nhà" đứng đầu', st.locator('.home-card').count() == 1 and st.locator('#food-0 .home-card').count() == 1 and 'Bữa tối ở nhà' in st.inner_text('#food-0'))
    check('tóm tắt nhắc món ở nhà chờ đánh giá', 'ở nhà chờ em đánh giá' in st.inner_text('#evalSummary').lower(), st.inner_text('#evalSummary'))
    sl = st.locator('#schoolLabel')
    check('thẻ "🏫 Bữa trưa ở trường" đứng đầu danh sách món trưa, sau thẻ ở nhà',
          sl.count() == 1 and 'bữa trưa ở trường' in sl.inner_text().lower() and st.evaluate("()=>{const l=document.getElementById('schoolLabel').getBoundingClientRect().top,h=document.querySelector('.home-card').getBoundingClientRect().top,f=document.querySelector('#food-1 .food-card').getBoundingClientRect().top;return h<l&&l<f}"))
    check('yêu cầu declined không có thẻ', st.locator('.home-card').count() == 1)
    xp1 = len(ls('mm_xp_log') or [])
    st.locator('#food-0 .emoji-btn').nth(1).click(); st.click('#confirmBtn-0'); st.wait_for_timeout(400)   # 🙂 = 3
    last = ls('mm_fas_log')[-1]
    check('ghi FAS place=home, có reqId, attempt 1 (nhóm chưa thử thật lần nào), điểm 3',
          last['place'] == 'home' and last['reqId'] == rid_trung and last['attempt'] == 1 and last['score'] == 3 and last['groupId'] == 'g-trung', last)
    acts = [x['actionId'] for x in (ls('mm_xp_log') or [])[xp1:]]
    check('đánh giá ở nhà nhận first_try + emoji_rate', acts == ['first_try', 'emoji_rate'], acts)
    check('yêu cầu chuyển sang rated, có ratedAt', {r['id']: r for r in ls('mm_home_requests')}[rid_trung]['status'] == 'rated' and {r['id']: r for r in ls('mm_home_requests')}[rid_trung]['ratedAt'])
    st.reload(); st.wait_for_timeout(600)
    check('tải lại: thẻ ở nhà đã khóa (đã đánh giá)', st.locator('#food-0 .emoji-btn:disabled').count() == 5 and '✅' in st.inner_text('#confirmBtn-0'))
    check('đánh giá ở trường (Chưa thử) hôm nay vẫn khóa riêng', st.locator('#food-1 .emoji-btn:disabled').count() == 5)
    chain = st.evaluate("()=>{const L=JSON.parse(localStorage.getItem('mm_fas_log')),w=mmGroupRows(L,'phambaotruc','g-trung');return mmFasChainText(w)}")
    check('chuỗi nhóm Trứng: 0 → 3 (trường rồi nhà)', chain == '0 → 3', chain)
    st.goto(base + '/student/screen1.html'); st.wait_for_timeout(400)
    check('đánh giá ở nhà mở khóa hành tinh Trứng', 'unlocked' in (st.locator('.planet-card').nth(3).get_attribute('class') or ''))

    print('D. Hết hạn')
    out = st.evaluate("""()=>{
      const day=86400000, now=Date.now(), iso=t=>new Date(t).toISOString();
      const mk=(id,status,created,expires,resp)=>({id,studentId:'phambaotruc',groupId:'g-cu',foodId:'ca-rot',dishName:'Cà rốt',icon:'🥕',createdAt:iso(created),expiresAt:iso(expires),status,respondedAt:resp?iso(resp):null,ratedAt:null});
      const list=[
        mk('t-old','pending',now-9*day,now-2*day,null),
        mk('t-fresh','pending',now-1*day,now+6*day,null),
        mk('t-lapsed','cooked',now-5*day,now+2*day,now-3*day),
        mk('t-ok','cooked',now-2*day,now+5*day,now-2000)
      ];
      localStorage.setItem('mm_home_requests',JSON.stringify(list));
      const r=mmReqSweep(); const o={}; r.forEach(x=>o[x.id]=x.status); return o;}""")
    check('pending quá 7 ngày → expired; còn hạn giữ pending', out['t-old'] == 'expired' and out['t-fresh'] == 'pending', out)
    check('cooked quá hạn đánh giá (hết ngày hôm sau) → expired, cooked vừa xác nhận giữ nguyên', out['t-lapsed'] == 'expired' and out['t-ok'] == 'cooked', out)
    st.goto(base + '/student/screen2.html'); st.wait_for_timeout(500)
    check('chỉ yêu cầu còn hạn có thẻ ở nhà', st.locator('.home-card').count() == 1)
    pa.reload(); pa.wait_for_timeout(400)
    check('phụ huynh thấy 1 yêu cầu chờ, lịch sử có "Quá hạn đánh giá"', pa.locator('#requestsBox .req-card').count() == 1 and 'Quá hạn đánh giá' in pa.inner_text('#requestsHistory') and 'Hết hạn' in pa.inner_text('#requestsHistory'))
    check('không lỗi JS (Học sinh, Phụ huynh)', not errs_s and not errs_p, errs_s + errs_p)

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
