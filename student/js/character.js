/* ═══════════════════════════════════════════
   character.js — Nhân vật đồng hành ở Trang chủ học sinh
   - Nhân vật do BGH gán ở Danh sách tài khoản; chưa gán thì học sinh tự chọn một lần (màn chọn + popup Xác nhận),
     chọn xong lưu vào account.characterId; sau đó học sinh có thể bấm "Đổi nhân vật" (hiện 9 bạn theo Level hiện tại) hoặc BGH đổi
   - Thẻ nhân vật dưới thông tin học sinh: hoạt ảnh theo Level, XP còn thiếu để tiến hóa
   - Lên Level (hiện ra khi mở Trang chủ): chiếu hoạt ảnh tiến hóa từ hình cũ sang hình mới
   Cần: js/characters.js, js/xp.js, js/auth.js
═══════════════════════════════════════════ */
(function () {
  const session = auth.getSession();
  if (!session || session.role !== 'student') return;
  const sid = session.userId;
  const host = document.getElementById('petHost');
  if (!host) return;

  const curIdx = () => mmCharLevelIdx(getLevelInfo(getStudentXp(sid)).level);

  /* Dòng chữ XP còn thiếu để tiến hóa */
  function nextLine(ch, idx) {
    const info = getLevelInfo(getStudentXp(sid));
    const levels = mmCharLevels();
    if (idx >= levels.length - 1 || info.nextFrom == null) return 'Đã tiến hóa cao nhất! 🌟';
    const nxt = mmCharStage(ch, idx + 1);
    return `Còn ${Math.max(0, info.nextFrom - info.xp)} XP để tiến hóa thành <b>${escHtml(nxt.name || ch.name)}</b>`;
  }

  function stageAnim(ch, idx) {
    const st = mmCharStage(ch, idx);
    return 'anim-' + (MM_CHAR_ANIMS.some(a => a.id === st.anim) ? st.anim : 'bounce');
  }

  function cardHtml(ch, idx) {
    const info = getLevelInfo(getStudentXp(sid));
    const st = mmCharStage(ch, idx);
    return `
      <div class="pet-card${idx >= mmCharLevels().length - 1 ? ' max' : ''}" id="petCard">
        <div class="pet-stage ${stageAnim(ch, idx)}" id="petStage"><div class="pet-ground"></div>
          <div class="char-art" id="petArt">${mmCharArt(ch, idx)}</div></div>
        <div class="pet-name" id="petName">${escHtml(st.name || ch.name)}</div>
        <div class="pet-line">Dòng ${escHtml(ch.name)} · Level ${info.level} · ${escHtml(info.name)}</div>
        <div class="pet-next" id="petNext">${nextLine(ch, idx)}</div>
        <div class="levelup-text" id="petLvUp"></div>
        ${mmCharAll(false).some(c => c.id !== ch.id) ? '<button type="button" class="pet-chg" id="petChg">Đổi nhân vật</button>' : ''}
      </div>`;
  }

  /* Chiếu hoạt ảnh tiến hóa: hình cũ → chớp sáng → hình mới (nếu hiệu ứng của hình mới là "flash") */
  function playEvolution(ch, fromIdx, toIdx) {
    const stage = document.getElementById('petStage'), art = document.getElementById('petArt');
    const up = document.getElementById('petLvUp'), card = document.getElementById('petCard');
    if (!stage || !art) return;
    const st = mmCharStage(ch, toIdx);
    const swap = () => {
      art.innerHTML = mmCharArt(ch, toIdx);
      stage.className = 'pet-stage ' + stageAnim(ch, toIdx);
      document.getElementById('petName').textContent = st.name || ch.name;
      document.getElementById('petNext').innerHTML = nextLine(ch, toIdx);
      card.classList.toggle('max', toIdx >= mmCharLevels().length - 1);
    };
    if (st.effect === 'none') { swap(); return; }
    art.innerHTML = mmCharArt(ch, fromIdx);
    stage.className = 'pet-stage evolving ' + stageAnim(ch, fromIdx);
    setTimeout(() => { swap(); stage.classList.add('evolving'); }, 700);
    setTimeout(() => stage.classList.remove('evolving'), 1900);
    up.textContent = `🎉 Lên Level ${getLevelInfo(getStudentXp(sid)).level}!`;
    up.classList.remove('show'); void up.offsetWidth; up.classList.add('show');
  }

  function renderCard(ch) {
    const idx = curIdx();
    host.innerHTML = cardHtml(ch, idx);
    const chg = document.getElementById('petChg');
    if (chg) chg.addEventListener('click', () => {
      const list = mmCharAll(true);                            /* gồm cả bạn bị tắt (hiện khóa 🔒); bạn đang đồng hành không bị khóa */
      if (!list.some(c => c.id === ch.id)) list.push(ch);
      showChooser(list, ch);
    });
    /* Level tăng từ lần mở trước → chiếu hoạt ảnh tiến hóa một lần. Chưa có ghi nhận (BGH vừa gán) → hiện thẳng, không chiếu. */
    const state = mmCharState(sid);
    if (!state || state.seenLevelIdx > idx) { mmCharSaveState(sid, { seenLevelIdx: idx }); return; }
    if (state.seenLevelIdx < idx) {
      const from = state.seenLevelIdx;
      mmCharSaveState(sid, { seenLevelIdx: idx });
      setTimeout(() => playEvolution(ch, from, idx), 500);
    }
  }

  /* Chưa có nhân vật nào để chọn (BGH tắt hết) */
  function renderEmpty() {
    host.innerHTML = `
      <div class="pet-card pet-empty" id="petCard">
        <div style="font-size:44px;line-height:1.3">🥚</div>
        <div class="pet-name">Chưa có bạn đồng hành</div>
        <div class="pet-next">Nhờ thầy cô chọn bạn đồng hành cho em nhé!</div>
      </div>`;
  }

  /* Chưa có nhân vật: màn chọn bạn đồng hành (hiện phủ Trang chủ). Chọn xong → popup Xác nhận → lưu account.characterId */
  /* cur = nhân vật đang dùng → chế độ ĐỔI: hiện hình theo Level hiện tại, có nhãn "Đang đồng hành", nút quay lại */
  function showChooser(list, cur) {
    const frame = document.querySelector('.phone-frame');
    if (!frame) { renderEmpty(); return; }
    let picked = null;
    const change = !!cur, aIdx = change ? curIdx() : 0, info = getLevelInfo(getStudentXp(sid));
    const nm = c => change ? (mmCharStage(c, aIdx).name || c.name) : c.name;
    /* Nhân vật BGH đã tắt vẫn hiện nhưng khóa 🔒 (trừ bạn đang đồng hành) */
    const isLocked = c => c.active === false && !(change && c.id === cur.id);
    const lockedN = list.filter(isLocked).length, openCount = list.length - lockedN;
    const noteHtml = () => !lockedN
      ? (change ? '' : `<div class="cp-note">Có ${list.length} bạn đồng hành để chọn. Em chọn một bạn nhé!</div>`)
      : !openCount
        ? '<div class="cp-note">🔒 Các bạn đồng hành đang tạm khóa, em quay lại sau nhé!</div>'
        : change ? `<div class="cp-note" style="margin-top:6px">🔒 ${lockedN} bạn đang tạm khóa, chưa chọn được</div>`
                 : `<div class="cp-note">Có ${openCount} bạn đồng hành để chọn · ${lockedN} bạn đang <b>🔒 tạm khóa</b>. Em chọn một bạn nhé!</div>`;
    const ov = document.createElement('div');
    ov.className = 'char-pick'; ov.id = 'charPick';
    ov.innerHTML = `
      <div class="cp-hero"><div class="cp-t">${change ? '🥚 Đổi bạn đồng hành' : '🥚 Chọn bạn đồng hành!'}</div>
        <div class="cp-s">${change ? 'Đây là các bạn ở cấp của em. Chọn một bạn để cùng em khám phá nhé!' : 'Bạn này sẽ cùng em khám phá thực phẩm và lớn lên mỗi lần em lên cấp'}</div>
        ${change ? `<span class="cp-lv">Level ${info.level} · ${escHtml(info.name)}</span>` : ''}</div>
      <div class="cp-body">
        <div class="cp-grid">${list.map(c => `
          <div class="cp-opt${change && c.id === cur.id ? ' cur' : ''}${isLocked(c) ? ' locked' : ''}" data-id="${escHtml(c.id)}">${isLocked(c) ? '<i class="cp-lock">🔒</i>' : ''}<div class="char-art">${mmCharArt(c, aIdx)}</div>
            <b>${escHtml(nm(c))}</b>${change ? `<small>Dòng ${escHtml(c.name)}</small>` : ''}${change && c.id === cur.id ? '<em>Đang đồng hành</em>' : isLocked(c) ? '<em class="cp-lk">Tạm khóa</em>' : `<span>${escHtml(c.desc || '')}</span>`}</div>`).join('')}</div>
        ${noteHtml()}
        ${change || !openCount ? '<button type="button" class="cp-cancel" id="cpCancel">← Quay lại Trang chủ</button>' : ''}
      </div>
      </div>
      <div class="cp-toast" id="cpToast" style="display:none"></div>
      <div class="cp-dim" id="cpDim"></div>
      <div class="cp-sheet" id="cpSheet">
        <div class="cp-sheet-av char-art" id="cpAv"></div>
        <div class="cp-sheet-t" id="cpSheetT"></div>
        <div class="cp-sheet-d">${change ? 'Bạn mới giữ nguyên Level của em.<br>Em vẫn đổi lại được sau này.' : 'Chọn xong, em vẫn đổi lại được bằng nút "Đổi nhân vật" ở Trang chủ.'}</div>
        <div class="cp-sheet-btns"><button class="cp-back" id="cpBack">Chọn lại</button><button class="cp-ok" id="cpOk">✓ Xác nhận</button></div>
      </div>`;
    frame.appendChild(ov);
    const dim = ov.querySelector('#cpDim'), sheet = ov.querySelector('#cpSheet');
    const openSheet = on => { dim.classList.toggle('show', on); sheet.classList.toggle('show', on); };
    let toastTimer = null;
    ov.querySelectorAll('.cp-opt').forEach(o => o.addEventListener('click', () => {
      if (o.classList.contains('locked')) {          /* bạn bị khóa: không chọn được, báo nhẹ 3 giây */
        const c = list.find(x => x.id === o.dataset.id), t = ov.querySelector('#cpToast');
        t.innerHTML = '🔒 Bạn ' + escHtml(c ? c.name : '') + ' đang tạm khóa.<br>Em chọn một bạn khác nhé!';
        t.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
        return;
      }
      if (change && o.dataset.id === cur.id) return;           /* bạn đang đồng hành: không có gì để đổi */
      /* bấm vào nhân vật → hiện luôn hộp xác nhận (không cần nút "Chọn bạn này") */
      picked = o.dataset.id;
      ov.querySelectorAll('.cp-opt').forEach(x => x.classList.toggle('picked', x === o));
      const c = list.find(x => x.id === picked); if (!c) return;
      ov.querySelector('#cpAv').innerHTML = mmCharArt(c, aIdx);
      ov.querySelector('#cpSheetT').textContent = change ? `Đổi sang ${nm(c)} nhé?` : `Chọn bạn ${c.name} nhé?`;
      openSheet(true);
    }));
    const unpick = () => { picked = null; ov.querySelectorAll('.cp-opt').forEach(x => x.classList.remove('picked')); };
    ov.querySelector('#cpBack').addEventListener('click', () => { openSheet(false); unpick(); });
    const cancel = ov.querySelector('#cpCancel'); if (cancel) cancel.addEventListener('click', () => { ov.remove(); if (!change) renderEmpty(); });
    dim.addEventListener('click', () => { openSheet(false); unpick(); });
    ov.querySelector('#cpOk').addEventListener('click', () => {
      const c = list.find(x => x.id === picked); if (!c) return;
      const accs = store.get(MM_KEYS.ACCOUNTS, []), acc = accs.find(a => a.id === sid);
      if (!acc) return;
      acc.characterId = c.id;
      store.set(MM_KEYS.ACCOUNTS, accs);
      mmCharMarkSeen(sid);          /* hiện thẳng hình của Level hiện tại, không chiếu hoạt ảnh tiến hóa */
      ov.remove();
      renderCard(c);
    });
  }

  const ch = mmCharOf(sid);
  if (ch) renderCard(ch);
  else { const list = mmCharAll(true); if (list.length) showChooser(list); else renderEmpty(); }
})();
