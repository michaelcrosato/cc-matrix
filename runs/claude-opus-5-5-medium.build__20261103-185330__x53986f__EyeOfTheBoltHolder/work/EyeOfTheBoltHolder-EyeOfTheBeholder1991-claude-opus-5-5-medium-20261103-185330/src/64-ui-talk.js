/* DIALOGUE: the sim's open story drawn at the bottom: the speaker's live portrait (its mouth moving as it speaks), the
 * name in brass, the line typing with its babble voice; ✕ finishes the line, then turns the page; choices are a list. */
B.Talk = {
  k: null, shown: 0, plan: null, pi: 0, t: 0, focus: 0, auto: 0,
  line() { const T = B.S && B.S.talk; if (!T) return null; if (T.stage === 'choice') { const st = B.STORIES[T.id]; return st.lines[st.lines.length - 1]; } return T.lines[T.i]; },
  update(dt, game, autoAdvance) {
    const T = B.S.talk; if (!T) { this.k = null; return; }
    const ln = this.line(), k = T.id + ':' + T.stage + ':' + T.i;
    if (k !== this.k) { this.k = k; this.shown = T.stage === 'choice' ? 999 : 0; this.t = 0; this.pi = 0; this.focus = 0; this.auto = 0; const sp = B.SPEAKERS[ln[0]]; this.plan = T.stage === 'choice' ? [] : B.babble.plan(ln[1], B.VOICES[sp.voice] || B.VOICES.narrator); }
    const len = ln[1].length; this.t += dt; this.shown = Math.min(len, this.shown + dt * 50);
    while (this.plan && this.pi < this.plan.length && this.plan[this.pi].t <= this.t && this.shown < len) { B.babble.syl(game, this.plan[this.pi], B.VOICES[B.SPEAKERS[ln[0]].voice]); this.pi++; }
    const I = game.input, st = B.STORIES[T.id];
    if (autoAdvance) { if (this.shown >= len) { this.auto += dt; if (this.auto > 1.6) { if (T.stage === 'choice') B.Play.cmd({ c: 'talk', op: 'choose', i: 0 }); else B.Play.cmd({ c: 'talk', op: 'next' }); } } return; }
    if (T.stage === 'choice') {
      const n = st.choices.length;
      if (I.repeat('up', .35, .1)) { this.focus = (this.focus + n - 1) % n; game.audio.sfx('uiMove'); }
      if (I.repeat('down', .35, .1)) { this.focus = (this.focus + 1) % n; game.audio.sfx('uiMove'); }
      const p = I.pointer(), rects = this.choiceRects(B.UI.W, B.UI.H, n);
      if (p && B.device(game) === 'mouse') rects.forEach((r, i) => { if (p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]) this.focus = i; });
      const cl = I.clicked(); let pick = -1;
      if (cl) rects.forEach((r, i) => { if (cl[0] >= r[0] && cl[0] < r[0] + r[2] && cl[1] >= r[1] && cl[1] < r[1] + r[3]) pick = i; });
      if (I.pressed('confirm') || I.pressed('use')) pick = this.focus;
      if (pick >= 0) { game.audio.sfx('uiConfirm'); B.Play.cmd({ c: 'talk', op: 'choose', i: pick }); }
      return;
    }
    if (I.pressed('confirm') || I.pressed('use') || I.pressed('cancel') || I.clicked() || I.pressed('strike')) {
      if (this.shown < len) this.shown = len; else B.Play.cmd({ c: 'talk', op: 'next' });
    }
  },
  choiceRects(W, H, n) { const out = []; for (let i = 0; i < n; i++) out.push([W / 2 - 80, H - 94 - (n - i) * 15, 160, 13]); return out; },
  draw(g, r, game) {
    const T = B.S && B.S.talk; if (!T) return;
    const ln = this.line(), sp = B.SPEAKERS[ln[0]], W = r.W, H = r.H, bh = 58, by = H - bh - 4;
    B.panel(g, 6, by, W - 12, bh);
    let tx = 14;
    const rig = sp.rig ? B.speakerRig(ln[0]) : null;
    if (rig) { rig.update(1 / 60, { x: 0, y: 0, expr: this.shown < ln[1].length && Math.floor(B.UI.t * 10) % 2 ? 'shout' : null }); px.rect(g, 11, by + 5, 44, 44, '#14100c'); rig.drawPortrait(g, 12, by + 6, 42, { zoom: 2.2, turn: .3, bg: sp.ghost ? '#1a2a3a' : '#2a2218' }); if (sp.shut) { px.rect(g, 26, by + 22, 6, 1, '#2a2a3a'); px.rect(g, 35, by + 22, 6, 1, '#2a2a3a'); } tx = 62; }
    else if (ln[0] === 'eye') { px.rect(g, 11, by + 5, 44, 44, '#100806'); px.disc(g, 33, by + 27, 16, '#e8e0c8'); px.disc(g, 33, by + 27, 8, '#e8a030'); px.disc(g, 33, by + 27, 3 + Math.sin(B.UI.t * 3), '#100806'); tx = 62; }
    else if (ln[0] === 'snick') { tx = 14; }
    if (sp.name) B.text(g, sp.name.toUpperCase(), tx, by + 5, B.COL.focus);
    const txt = ln[1].slice(0, Math.floor(this.shown)), lines = B.wrap(txt, W - tx - 20);
    lines.slice(0, 4).forEach((l, i) => B.text(g, l, tx, by + (sp.name ? 16 : 8) + i * 10, ln[0] === 'narrator' ? '#e8dcc0' : B.COL.text));
    if (T.stage === 'choice') {
      const st = B.STORIES[T.id], rects = this.choiceRects(W, H, st.choices.length);
      st.choices.forEach((c, i) => { const [x, y, w, h] = rects[i]; B.panel(g, x, y, w, h, { rivets: false, alpha: .95 }); B.text(g, c.label, x + w / 2, y + 3, i === this.focus ? B.COL.focus : B.COL.text, { align: 'center' }); if (i === this.focus) B.focusFrame(g, x, y, w, h, B.UI.t); });
    } else if (this.shown >= ln[1].length && Math.floor(B.UI.t * 3) % 2) B.glyph(g, game, 'confirm', W - 14 - B.glyphW(game, 'confirm'), by + bh - 14);
  }
};
