/* ═══════════════════════════════════════════
   character.js — Nhân vật đồng hành ở Trang chủ học sinh
   - Lần đầu đăng nhập: màn chọn nhân vật (chỉ các nhân vật BGH đang bật)
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
    /* Level tăng từ lần mở trước → chiếu hoạt ảnh tiến hóa một lần */
    const state = mmCharState(sid);
    if (state && state.seenLevelIdx < idx) {
      const from = state.seenLevelIdx;
      mmCharSaveState(sid, { charId: ch.id, seenLevelIdx: idx });
      setTimeout(() => playEvolution(ch, from, idx), 500);
    }
  }

  /* Màn chọn nhân vật lần đầu */
  function showChooser() {
    const list = mmCharAll(false);
    if (!list.length) return;                           // BGH chưa bật nhân vật nào → không hiện
    let picked = null;
    const ov = document.createElement('div');
    ov.className = 'char-chooser';
    ov.innerHTML = `
      <div class="char-chooser-head"><h2>🥚 Chọn bạn đồng hành!</h2>
        <p>Bạn này sẽ cùng em khám phá thực phẩm và lớn lên mỗi lần em lên cấp</p></div>
      <div class="char-chooser-body"><div class="char-grid">${list.map(c => `
        <button type="button" class="char-opt" data-id="${escHtml(c.id)}">
          <div class="char-art">${mmCharArt(c, 0)}</div><b>${escHtml(c.name)}</b><span>${escHtml(c.desc || '')}</span>
        </button>`).join('')}</div></div>
      <div class="char-chooser-foot">
        <button type="button" class="char-chooser-btn" id="charOk" disabled>✓ Chọn bạn này</button>
        <div class="char-chooser-note">Em chỉ chọn một lần. Bạn đồng hành sẽ lớn lên khi em lên Level.</div>
      </div>`;
    document.querySelector('.phone-frame').appendChild(ov);
    ov.querySelectorAll('.char-opt').forEach(b => b.onclick = () => {
      picked = b.dataset.id;
      ov.querySelectorAll('.char-opt').forEach(x => x.classList.toggle('picked', x === b));
      ov.querySelector('#charOk').disabled = false;
    });
    ov.querySelector('#charOk').onclick = () => {
      if (!picked || !mmCharChoose(sid, picked, curIdx())) return;
      ov.remove();
      renderCard(mmCharById(picked));
    };
  }

  const state = mmCharState(sid);
  const ch = state ? mmCharById(state.charId) : null;
  if (ch) renderCard(ch); else showChooser();
})();
