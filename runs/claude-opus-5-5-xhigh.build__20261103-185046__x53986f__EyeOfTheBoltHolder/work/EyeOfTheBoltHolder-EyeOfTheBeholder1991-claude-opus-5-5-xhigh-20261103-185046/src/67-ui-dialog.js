/* =====================================================================================
 * 67-ui-dialog: the dialogue box. The speaker's live portrait (its mouth moving as it types), the name in brass, three
 * lines a page, the babble voice letter by letter; ✕ finishes the line, then turns the page; ○ hurries; choices are a list.
 * The sim holds the conversation (S.talk); cutscenes feed the same box their own lines.
 * ===================================================================================== */
const TalkBox = {
  key: null, who: null, pages: [], page: 0, shown: 0, ci: 0, rigs: new Map(), speed: 50,
  rigFor(who) {
    if (this.rigs.has(who)) return this.rigs.get(who);
    const look = (B.NPCS[who] && B.NPCS[who].look) || (B.PEOPLE[who] && B.PEOPLE[who].look) || null;
    const r = look ? B.rigOf(look) : null; if (r) r.facing = PI / 2; this.rigs.set(who, r); return r;
  },
  set(who, text, k) {
    if (this.key === k) return; this.key = k; this.who = who; this.page = 0; this.shown = 0; this.ci = 0;
    const lines = E.font.wrap(text, Math.min(330, UI.W - 70)); this.pages = []; for (let i = 0; i < lines.length; i += 3) this.pages.push(lines.slice(i, i + 3).join('\n'));
    if (!this.pages.length) this.pages = [''];
    Voices._typed = ''; Voices._who = null;
  },
  get text() { return this.pages[this.page] || ''; },
  get typing() { return this.shown < this.text.length; },
  /** step it: returns 'next' when the player wants the next line, a number for a choice, or null */
  update(dt, choices) {
    const I = game.input, rig = this.rigFor(this.who);
    if (rig) { rig._talk = this.typing; rig.update(dt, { x: 0, y: 0, expr: null }); }
    if (this.typing) { this.shown = Math.min(this.text.length, this.shown + dt * this.speed); const prof = this.who && S && S.party.members.find(m => m.id === this.who) ? Voices.memberProfile(S.party.members.find(m => m.id === this.who)) : Voices.profile(this.who); Voices.typing(prof, this.text.slice(0, Math.floor(this.shown)).replace(/\n/g, ' ')); }
    const last = this.page >= this.pages.length - 1, click = I.clicked();
    if (choices && last && !this.typing) {
      if (I.repeat('up', .3, .1)) { this.ci = (this.ci + choices.length - 1) % choices.length; Sound.sfx('uiMove'); }
      if (I.repeat('down', .3, .1)) { this.ci = (this.ci + 1) % choices.length; Sound.sfx('uiMove'); }
      const pt = I.pointer && I.pointer(); if (pt && this._cr) this._cr.forEach((r2, i) => { if (pt[0] >= r2[0] && pt[0] < r2[0] + r2[2] && pt[1] >= r2[1] && pt[1] < r2[1] + r2[3] && I.lastDevice === 'mouse') this.ci = i; });
      if (click && this._cr) { const i = this._cr.findIndex(r2 => click[0] >= r2[0] && click[0] < r2[0] + r2[2] && click[1] >= r2[1] && click[1] < r2[1] + r2[3]); if (i >= 0) { Sound.sfx('uiConfirm'); return i; } }
      if (I.pressed('confirm')) { Sound.sfx('uiConfirm'); return this.ci; }
      return null;
    }
    if (I.pressed('confirm') || click || I.pressed('use')) {
      if (this.typing) this.shown = this.text.length;
      else if (!last) { this.page++; this.shown = 0; }
      else if (!choices) return 'next';
    }
    if (I.pressed('cancel')) { if (this.typing) this.shown = this.text.length; else if (!last) { this.page++; this.shown = 0; } else if (!choices) return 'next'; }
    return null;
  },
  draw(g, r, choices, o = {}) {
    const W = r.W, H = r.H, bw = Math.min(400, W - 12), bh = 52, x = Math.round(W / 2 - bw / 2), y = o.y !== undefined ? o.y : H - 50 - bh - 10;
    panel(g, x, y, bw, bh, { alpha: .95 });
    const rig = this.rigFor(this.who), P = B.PEOPLE[this.who] || {}, nm = (B.NPCS[this.who] && B.NPCS[this.who].full) || P.name || '';
    let tx = x + 8;
    if (rig) { g.save(); if (P.ghost) g.globalAlpha = .7; rig.drawPortrait(g, x + 6, y + 6, 40, { zoom: 2.8, turn: .4, bg: P.ghost ? '#1a2a3a' : '#2a2218', border: '#8a6a3a' }); g.restore(); tx = x + 54; }
    else if (this.who === 'narrator') { px.rect(g, x + 8, y + 10, 32, 32, '#2a2218'); E.font.title(g, 'H', x + 24, y + 16, { scale: 2, align: 'center', colors: ['#fff6d8', '#ffd36a', '#c8923a'] }); tx = x + 54; }
    if (nm) TXT(g, nm, tx, y + 5, COL.focus);
    const shown = this.text.slice(0, Math.floor(this.shown)).split('\n');
    shown.forEach((l, i) => TXT(g, l, tx, y + (nm ? 17 : 9) + i * 11, this.who === 'narrator' ? '#e8dcc0' : COL.text));
    if (!this.typing && (this.page < this.pages.length - 1 || !choices) && Math.floor(game.real * 2) % 2) TXT(g, '▸', x + bw - 12, y + bh - 12, COL.focus);
    this._cr = null;
    if (choices && this.page >= this.pages.length - 1 && !this.typing) {
      const cw = Math.max(...choices.map(c => TW(c))) + 24, ch = choices.length * 14 + 8, cx = x + bw - cw - 4, cy = y - ch - 4;
      panel(g, cx, cy, cw, ch); this._cr = [];
      choices.forEach((c, i) => { const ry = cy + 5 + i * 14; this._cr.push([cx, ry - 1, cw, 13]); if (i === this.ci) { px.rect(g, cx + 3, ry - 1, cw - 6, 12, '#3a2e18'); TXT(g, '▸', cx + 6, ry + 1, COL.focus); } TXT(g, c, cx + 14, ry + 1, i === this.ci ? COL.focus : COL.text); });
    }
    if (!o.noPrompts) prompts(g, choices && !this.typing && this.page >= this.pages.length - 1 ? [['ud', 'Choose'], ['confirm', 'Answer']] : [['confirm', 'Next'], ['cancel', 'Hurry']], x + bw - 4, y + bh + 3, { align: 'right' });
  }
};
B.TalkBox = TalkBox;
/** the play scene's conversation: the sim's current line, answered by commands */
const PlayTalk = {
  update(dt) {
    const T = S.talk; if (!T) { TalkBox.key = null; return false; }
    if (T.line) TalkBox.set(T.line.who, T.line.text, T.node + ':' + T.i);
    const r = TalkBox.update(dt, T.choices);
    if (r === 'next') B.cmd({ c: 'talk', op: 'next' }); else if (typeof r === 'number') B.cmd({ c: 'talk', op: 'choose', i: r });
    return true;
  },
  draw(g, r) { if (S.talk && S.talk.line) TalkBox.draw(g, r, S.talk.choices); }
};
B.PlayTalk = PlayTalk;
