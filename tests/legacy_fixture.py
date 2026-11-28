"""Dữ liệu mẫu CŨ cho test (không còn trong seed gốc): 4 dòng FAS Bông cải xanh của Bảo Trúc + học sinh mẫu cũ + thực đơn hôm nay có "Trứng chiên" (Nguyễn Minh An 4A9, Trần Thanh Khoa 3A4) — không còn trong dữ liệu gốc (js/seed.js).
Các bộ test cần thêm học sinh thì gọi add_legacy(ctx) ngay sau khi tạo context: sau khi trang tải xong (seed đã chạy),
đoạn script thêm 2 bé + phụ huynh + FAS cũ vào localStorage một lần duy nhất (cờ mm_legacy_fx)."""

SCRIPT = """
window.addEventListener('load', function () {
  try {
    if (localStorage.getItem('mm_legacy_fx') || !localStorage.getItem('mm_accounts')) return;
    var acc = JSON.parse(localStorage.getItem('mm_accounts'));
    acc.push(
      {id:'nguyenminhan', pass:'hs002', role:'student', name:'Nguyễn Minh An', linkedId:'phminhan', avatar:'🧒', className:'4A9'},
      {id:'tranthanhkhoa', pass:'hs003', role:'student', name:'Trần Thanh Khoa', linkedId:'phthanhkhoa', avatar:'🧒', className:'3A4'},
      {id:'phminhan', pass:'ph002', role:'parent', name:'Phụ huynh Minh An', linkedId:'nguyenminhan', avatar:'👩'},
      {id:'phthanhkhoa', pass:'ph003', role:'parent', name:'Phụ huynh Thanh Khoa', linkedId:'tranthanhkhoa', avatar:'👩'});
    /* gỡ kịch bản demo mới của Bảo Trúc (mmSetDemoPlan), trả về trạng thái demo cũ: XP 605, FAS 4 dòng, không yêu cầu chờ, không lịch sử 4 tuần */
    acc.forEach(function (a) { if (a.id === 'phambaotruc') a.xp = 605; });
    localStorage.removeItem('mm_home_requests');
    var cst = JSON.parse(localStorage.getItem('mm_char_state') || '{}'); delete cst.phambaotruc; localStorage.setItem('mm_char_state', JSON.stringify(cst));
    var fas = JSON.parse(localStorage.getItem('mm_fas_log') || '[]').filter(function (f) { return f.studentId !== 'phambaotruc'; });
    var r = function (s, f, g, n, a, sc, t, ts) { return {studentId:s, foodId:f, groupId:g, place:'school', foodName:n, attempt:a, score:sc, rating:sc, tryAgain:t, timestamp:ts}; };
    fas.push(
      r('nguyenminhan','ca-rot','g-cu','Cà rốt',1,1,true,'2026-10-08T12:00:00'),
      r('nguyenminhan','ca-rot','g-cu','Cà rốt',2,2,true,'2026-10-15T12:00:00'),
      r('nguyenminhan','ca-rot','g-cu','Cà rốt',3,2,false,'2026-10-22T12:00:00'),
      r('tranthanhkhoa','rau-muong','g-rau','Rau muống',1,3,false,'2026-10-10T12:00:00'),
      r('tranthanhkhoa','rau-muong','g-rau','Rau muống',2,4,false,'2026-10-17T12:00:00'),
      r('phambaotruc','bong-cai','g-rau','Bông cải xanh',1,1,true,'2026-10-07T12:00:00'),
      r('phambaotruc','bong-cai','g-rau','Bông cải xanh',2,2,true,'2026-10-09T12:00:00'),
      r('phambaotruc','bong-cai','g-rau','Bông cải xanh',3,2,true,'2026-10-14T12:00:00'),
      r('phambaotruc','bong-cai','g-rau','Bông cải xanh',4,3,false,'2026-10-21T12:00:00'));
    fas.sort(function (a, b) { return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0; });
    localStorage.setItem('mm_accounts', JSON.stringify(acc));
    localStorage.setItem('mm_fas_log', JSON.stringify(fas));
    /* thực đơn hôm nay như bộ demo cũ: "Trứng chiên" (MỚI) đứng đầu + 2 món (có 1 món Rau) */
    var menu = JSON.parse(localStorage.getItem('mm_daily_menu') || '[]').filter(function (m) { return String(m.id).indexOf('m-big-') !== 0; });
    var today = toLocalDateStr(new (window.MM_RealDate || Date)());
    var td = menu.filter(function (m) { return m.date === today; });
    var rest = menu.filter(function (m) { return m.date !== today; });
    var rau = td.find(function (m) { return m.groupId === 'g-rau'; });
    var other = td.find(function (m) { return m !== rau && m.groupId !== 'g-trung'; });
    rest.push({id:'m-fx-trung', date:today, name:'Trứng chiên', ingredientId:'trung', groupId:'g-trung', icon:'🥚', isNew:true});
    [other, rau].forEach(function (m) { if (m) rest.push(m); });
    localStorage.setItem('mm_daily_menu', JSON.stringify(rest));
    localStorage.setItem('mm_legacy_fx', '1');
  } catch (e) {}
});
"""

def add_legacy(ctx):
    ctx.add_init_script(SCRIPT)
