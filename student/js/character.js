/* ═══════════════════════════════════════════
   character.js — Nhân vật đồng hành ở Trang chủ học sinh
   - Nhân vật do BGH gán ở Danh sách tài khoản (học sinh không tự chọn); chưa gán thì hiện lời nhắn
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
    /* Level tăng từ lần mở trước → chiếu hoạt ảnh tiến hóa một lần. Chưa có ghi nhận (BGH vừa gán) → hiện thẳng, không chiếu. */
    const state = mmCharState(sid);
    if (!state || state.seenLevelIdx > idx) { mmCharSaveState(sid, { seenLevelIdx: idx }); return; }
    if (state.seenLevelIdx < idx) {
      const from = state.seenLevelIdx;
      mmCharSaveState(sid, { seenLevelIdx: idx });
      setTimeout(() => playEvolution(ch, from, idx), 500);
    }
  }

  /* BGH chưa gán nhân vật cho học sinh này */
  function renderEmpty() {
    host.innerHTML = `
      <div class="pet-card pet-empty" id="petCard">
        <div style="font-size:44px;line-height:1.3">🥚</div>
        <div class="pet-name">Chưa có bạn đồng hành</div>
        <div class="pet-next">Nhờ thầy cô chọn bạn đồng hành cho em nhé!</div>
      </div>`;
  }

  const ch = mmCharOf(sid);
  if (ch) renderCard(ch); else renderEmpty();
})();
