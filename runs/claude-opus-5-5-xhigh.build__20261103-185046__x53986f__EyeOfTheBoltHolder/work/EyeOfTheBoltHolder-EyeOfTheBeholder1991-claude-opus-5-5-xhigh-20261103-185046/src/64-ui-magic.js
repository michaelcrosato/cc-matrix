/* =====================================================================================
 * 64-ui-magic: the Cast menu (opened by a caster's book or symbol hand): level tabs, the ready spells with their counts,
 * a description and the target; ✕ casts, or (a member spell) moves a highlight across the cards to pick who
 * ===================================================================================== */
SCREENS.cast = {
  m: 0, lvl: 1, focus: 'r0', pick: null, pi: 0,
  open(d) { this.m = d.m; this.pick = null; const m = MEM(this.m); const rs = B.readySpells(m); this.lvl = [1, 2, 3].find(L => Object.keys(rs).some(id => B.SP(id).lvl === L)) || 1; this.focus = 'r0'; },
  rows(m) {
    const rs = B.readySpells(m), out = [];
    for (const id of B.knownSpells(m).filter(s => B.SP(s).lvl === this.lvl)) out.push({ id, n: rs[id] || 0 });
    if (m.cls === 'P' && this.lvl === 1) out.push({ id: 'layOnHands', n: m.layOnHands ? 1 : 0, special: true });
    return out;
  },
  layout(W, H) {
    const m = MEM(this.m), pw = Math.min(280, W - 20), ph = 150, x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2 - 24);
    this.box = { x, y, w: pw, h: ph };
    const out = [];
    [1, 2, 3].forEach((L, i) => out.push({ id: 'L' + L, x: x + 8 + i * 34, y: y + 6, w: 30, h: 14, act: () => { this.lvl = L; this.focus = 'r0'; }, label: 'L' + L, noFrame: L === this.lvl }));
    this.rows(m).forEach((rw, i) => out.push({ id: 'r' + i, x: x + 8, y: y + 26 + i * 14, w: pw / 2 - 8, h: 13, act: () => this.cast(rw), row: rw, disabled: !rw.n }));
    return out;
  },
  cast(rw) {
    if (!rw.n) { Sound.sfx('uiError'); return; }
    const sp = rw.special ? { target: 'member' } : B.SP(rw.id);
    if (sp.target === 'member' || sp.target === 'dead') { this.pick = rw; const ms = S.party.members; this.pi = Math.max(0, ms.findIndex(x => sp.target === 'dead' ? x.state === 'dead' : x.state !== 'dead' && x.hp < x.max)); return; }
    B.cmd({ c: 'cast', m: this.m, spell: rw.id }); UI.close();
  },
  update(dt) {
    const I = game.input, m = MEM(this.m);
    if (!m || !B.canCast(m) && !(m && m.cls === 'P')) { UI.close(); return; }
    if (this.pick) {
      const n = S.party.members.length, places = [0, 1, 2, 3, 4, 5].filter(p => S.party.form[p] >= 0).map(p => S.party.form[p]);
      let k = places.indexOf(this.pi); if (k < 0) k = 0;
      if (I.repeat('left', .35, .1)) { k = (k + places.length - 1) % places.length; Sound.sfx('uiMove'); }
      if (I.repeat('right', .35, .1)) { k = (k + 1) % places.length; Sound.sfx('uiMove'); }
      this.pi = places[k];
      const ck = I.clicked(), hitC = ck && UI.cards().find(c => ck[0] >= c.x && ck[0] < c.x + c.w && ck[1] >= c.y && ck[1] < c.y + c.h);
      if (hitC) { B.cmd({ c: 'cast', m: this.m, spell: this.pick.id, target: hitC.mi }); UI.close(); return; }
      const pt = I.pointer && I.pointer(); if (pt && I.lastDevice === 'mouse') { const c = UI.cards().find(c => pt[0] >= c.x && pt[0] < c.x + c.w && pt[1] >= c.y && pt[1] < c.y + c.h); if (c) this.pi = c.mi; }
      if (I.pressed('confirm')) { B.cmd({ c: 'cast', m: this.m, spell: this.pick.id, target: this.pi }); UI.close(); return; }
      if (I.pressed('cancel')) { this.pick = null; Sound.sfx('uiBack'); }
      return;
    }
    if (I.pressed('cancel')) { UI.close(); return; }
    if (I.pressed('mL')) { this.lvl = Math.max(1, this.lvl - 1); this.focus = 'r0'; Sound.sfx('uiTab'); }
    if (I.pressed('mR')) { this.lvl = Math.min(3, this.lvl + 1); this.focus = 'r0'; Sound.sfx('uiTab'); }
    const r = Focus.step(this.layout(UI.W, UI.H), this.focus); this.focus = r.id;
  },
  draw(g, r) {
    const m = MEM(this.m); if (!m) return; const list = this.layout(r.W, r.H), b = this.box;
    panel(g, b.x, b.y, b.w, b.h);
    TXT(g, m.name + (m.cls === 'M' ? ' casts' : ' prays'), b.x + b.w - TW(m.name + ' prays') - 10, b.y + 8, '#ffe6b0');
    for (const w of list) {
      if (w.label) { panel(g, w.x, w.y, w.w, w.h, { rivets: false, border: w.noFrame ? COL.focus : '#6a5a3a', bg: w.noFrame ? ['#3a2e18', '#1a140a'] : COL.bg }); TXT(g, w.label, w.x + 8, w.y + 3, w.noFrame ? COL.focus : COL.dim); continue; }
      const rw = w.row, name = rw.special ? 'Lay on Hands' : B.SP(rw.id).name;
      TXT(g, name + (rw.n ? '  ×' + rw.n : ''), w.x + 3, w.y + 3, rw.n ? COL.text : '#6a6050');
    }
    if (!list.some(w => w.row)) TXT(g, 'No spells of this level.', b.x + 10, b.y + 30, COL.dim);
    if (devOf() !== 'mouse') { glyph(g, 'mL', b.x + 112, b.y + 7); glyph(g, 'mR', b.x + 112 + badgeW(badgeOf('mL')) + 4, b.y + 7); }
    const fw = list.find(w => w.id === this.focus); if (!this.pick) Focus.draw(g, list, this.focus);
    const rw = this.pick || (fw && fw.row);
    if (rw) {
      const sp = rw.special ? { desc: 'Heal twice your level, once each rest.', target: 'member' } : B.SP(rw.id), dx = b.x + b.w / 2 + 4; let y = b.y + 28;
      for (const ln of E.font.wrap(sp.desc, b.w / 2 - 14)) { TXT(g, ln, dx, y, '#d8ccb8'); y += 10; }
      TXT(g, 'Target: ' + { front: 'the cell ahead', line: 'down the corridor', member: 'one of the party', dead: 'a fallen friend', party: 'everyone', door: 'the door ahead' }[sp.target], dx, y + 6, COL.dim);
    }
    if (this.pick) {
      const c = UI.cards().find(c => c.mi === this.pi); if (c) { focusFrame(g, c.x, c.y, c.w, c.h); TXT(g, '▸', c.x + c.w / 2 - 2, c.y - 10, COL.focus); }
      prompts(g, [['lr', 'Choose'], ['confirm', 'Cast'], ['cancel', 'Back']], r.W / 2, b.y + b.h + 4, { align: 'center' });
    } else prompts(g, [['confirm', 'Cast'], ['cancel', 'Back']], b.x + b.w - 8, b.y + b.h - 14, { align: 'right' });
    if (!B.canCast(m) || m.cool.main > 0) TXT(g, m.cool.main > 0 ? 'Hands busy: ' + m.cool.main.toFixed(1) + 's' : 'Needs a book or symbol in hand', b.x + 10, b.y + b.h - 14, COL.bad);
  }
};
