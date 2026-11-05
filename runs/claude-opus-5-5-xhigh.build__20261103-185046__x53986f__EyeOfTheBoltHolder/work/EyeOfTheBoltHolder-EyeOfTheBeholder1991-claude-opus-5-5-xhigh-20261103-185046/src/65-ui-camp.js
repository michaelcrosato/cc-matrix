/* =====================================================================================
 * 65-ui-camp: Camp. The view darkens round a small fire; ten tiles: Rest, Memorize, Pray, Scribe, Formation, Eat, Save
 * Game, Load Game, Settings, Leave Camp; each opens its page here
 * ===================================================================================== */
const CAMP_TILES = [['rest', 'Rest'], ['mem', 'Memorize'], ['pray', 'Pray'], ['scribe', 'Scribe'], ['form', 'Formation'], ['eat', 'Eat'], ['save', 'Save Game'], ['load', 'Load Game'], ['settings', 'Settings'], ['leave', 'Leave Camp']];
SCREENS.camp = {
  page: 'menu', focus: 'c0', m: 0, swapA: null, ate: null, msg: null,
  open() { this.page = 'menu'; this.focus = 'c0'; this.swapA = null; this.ate = null; this.msg = null; Sound.music('camp'); },
  close() { B.cmd({ c: 'camp', op: 'close' }); Sound.floorSong(); },
  casters(kind) { return S.party.members.map((m, i) => i).filter(i => { const m = MEM(i); return m.state !== 'dead' && (kind === 'mem' ? m.cls === 'M' : m.cls === 'C' || (m.cls === 'P' && m.lvl >= 3)); }); },
  layout(W, H) {
    const out = [];
    if (this.page === 'menu') {
      const tw = Math.min(76, Math.floor((W - 30) / 5)), th = 30, x0 = Math.round(W / 2 - (tw * 5 + 16) / 2), y0 = Math.round(H / 2 - 48);
      CAMP_TILES.forEach(([id, label], i) => {
        const dis = (id === 'mem' && !this.casters('mem').length) || (id === 'pray' && !this.casters('pray').length) || (id === 'scribe' && !this.scrolls().length) || ((id === 'save' || id === 'load') && !B.canSaveHere());
        out.push({ id: 'c' + i, x: x0 + (i % 5) * (tw + 4), y: y0 + Math.floor(i / 5) * (th + 4), w: tw, h: th, label, disabled: dis, act: () => this.tile(id) });
      });
    } else if (this.page === 'mem' || this.page === 'pray') {
      const m = MEM(this.m), known = B.knownSpells(m), c = B.slotCount(m), x0 = 14, y0 = 40, cw = Math.floor((W - 40) / 2);
      known.forEach((id, i) => out.push({ id: 'k' + i, x: x0, y: y0 + 12 + i * 12, w: cw, h: 11, act: () => { B.cmd({ c: 'camp', op: 'mem', m: this.m, spell: id }); }, spell: id, disabled: m.mem[B.SP(id).lvl].length >= c[B.SP(id).lvl - 1] }));
      let y = y0 + 12;
      for (let L = 1; L <= 3; L++) { if (!c[L - 1]) continue; y += 12; for (let i = 0; i < c[L - 1]; i++) { out.push({ id: 's' + L + '_' + i, x: x0 + cw + 12, y, w: cw - 12, h: 11, slotL: L, slotI: i, act: () => { if (m.mem[L][i]) B.cmd({ c: 'camp', op: 'forget', m: this.m, lvl: L, i }); } }); y += 12; } }
    } else if (this.page === 'scribe') {
      this.scrolls().forEach((s, i) => out.push({ id: 'sc' + i, x: 20, y: 52 + i * 14, w: W - 40, h: 13, act: () => { B.cmd({ c: 'camp', op: 'scribe', m: s.mage, from: s.from, slot: s.slot }); }, sc: s }));
    } else if (this.page === 'form') {
      const cw = 70, ch = 40, x0 = Math.round(W / 2 - cw - 4), y0 = 50;
      for (let p = 0; p < 6; p++) out.push({ id: 'f' + p, x: x0 + (p % 2) * (cw + 8), y: y0 + Math.floor(p / 2) * (ch + 6), w: cw, h: ch, place: p, act: () => { if (this.swapA === null) this.swapA = p; else { B.cmd({ c: 'camp', op: 'swap', a: this.swapA, b: p }); this.swapA = null; } } });
    }
    return out;
  },
  scrolls() {
    const out = [], mages = S.party.members.map((m, i) => i).filter(i => MEM(i).cls === 'M' && MEM(i).state !== 'dead');
    for (const mi of mages) S.party.members.forEach((o, fi) => o.pack.forEach((it, si) => { if (it && IT(it.id).kind === 'scroll' && IT(it.id).spell && B.SP(IT(it.id).spell).arc && !MEM(mi).book.includes(IT(it.id).spell)) out.push({ mage: mi, from: fi, slot: si, it }); }));
    return out;
  },
  tile(id) {
    if (id === 'rest') { B.cmd({ c: 'camp', op: 'rest' }); this.page = 'rest'; }
    else if (id === 'mem' || id === 'pray') { const cs = this.casters(id); this.m = cs[0]; this.page = id; this.focus = 'k0'; }
    else if (id === 'scribe') { this.page = 'scribe'; this.focus = 'sc0'; }
    else if (id === 'form') { this.page = 'form'; this.focus = 'f0'; this.swapA = null; }
    else if (id === 'eat') { const e = B.cmd({ c: 'camp', op: 'eat' }).find(q => q.t === 'ate'); this.ate = e ? e.list : []; this.page = 'eat'; }
    else if (id === 'save') { game.saves.show('save', () => UI.toast = { text: B.TXT.m_saved, t: 0 }); }
    else if (id === 'load') { game.saves.show('load'); }
    else if (id === 'settings') game.menu('settings');
    else if (id === 'leave') UI.close();
  },
  update(dt) {
    const I = game.input;
    if (!S.camp) { if (UI.is('camp')) { UI.stack.pop(); Sound.floorSong(); game.input.consumeAll(); } return; }
    if (this.page === 'rest') { if (I.pressed('cancel') || I.clicked()) B.cmd({ c: 'camp', op: 'stop' }); if (!S.camp.rest) { this.page = 'menu'; this.focus = 'c0'; } return; }
    if (this.page === 'eat') { if (I.pressed('confirm') || I.pressed('cancel') || I.clicked()) { this.page = 'menu'; this.focus = 'c5'; } return; }
    if (I.pressed('cancel')) { if (this.page === 'menu') UI.close(); else if (this.swapA !== null) this.swapA = null; else { this.page = 'menu'; this.focus = 'c0'; Sound.sfx('uiBack'); } return; }
    if ((this.page === 'mem' || this.page === 'pray') && (I.pressed('mL') || I.pressed('mR'))) { const cs = this.casters(this.page); const k = cs.indexOf(this.m); this.m = cs[(k + (I.pressed('mR') ? 1 : cs.length - 1)) % cs.length]; Sound.sfx('uiTab'); }
    const r = Focus.step(this.layout(UI.W, UI.H), this.focus, { tri: () => { if (this.page === 'mem' || this.page === 'pray') UI.toast = { text: 'The same as before, after the next rest.', t: 0 }; } }); this.focus = r.id;
  },
  draw(g, r) {
    const W = r.W, H = r.H;
    g.save(); g.globalAlpha = .7; px.rect(g, 0, 0, W, H, '#080402'); g.restore();
    // the campfire
    const fx = W / 2, fy = H - 64, fl = Math.sin(game.real * 9) * 1.5;
    px.rect(g, fx - 12, fy + 6, 24, 3, '#5a3a22'); px.disc(g, fx, fy, 6 + fl, '#e0602a'); px.disc(g, fx, fy - 2, 4 + fl * .5, '#ffb04a'); px.disc(g, fx, fy - 4, 2, '#fff2a0');
    E.font.title(g, 'CAMP', W / 2, 10, { scale: 2, align: 'center', colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'], depthColor: '#2a1a08' });
    const list = this.layout(W, H);
    if (this.page === 'menu') {
      for (const w of list) { panel(g, w.x, w.y, w.w, w.h, { rivets: false, bg: w.disabled ? ['#141210', '#0a0908'] : COL.bg }); TXT(g, w.label, w.x + w.w / 2 - TW(w.label) / 2, w.y + 11, w.disabled ? '#5a5040' : COL.text); }
      Focus.draw(g, list, this.focus);
      prompts(g, [['confirm', 'Choose'], ['cancel', 'Leave camp']], W - 8, H - 64, { align: 'right' });
      if (B.isSafe(S.party.cx, S.party.cy)) TXT(g, 'A safe place. No one will disturb your rest.', 8, 40, '#a8d8a8');
    } else if (this.page === 'rest') {
      const R = S.camp.rest, h = R ? R.h : 8; panel(g, W / 2 - 80, H / 2 - 40, 160, 44);
      TXT(g, 'Resting...', W / 2 - TW('Resting...') / 2, H / 2 - 32, '#ffe6b0'); TXT(g, 'Hour ' + h + ' of 8', W / 2 - TW('Hour ' + h + ' of 8') / 2, H / 2 - 20, COL.text);
      E.ui.bar(g, W / 2 - 60, H / 2 - 8, 120, 4, h / 8, '#c8a040');
      prompts(g, [['cancel', 'Stop']], W / 2, H / 2 + 8, { align: 'center' });
    } else if (this.page === 'mem' || this.page === 'pray') {
      const m = MEM(this.m), c = B.slotCount(m);
      panel(g, 6, 30, W - 12, H - 94);
      TXT(g, m.name + (this.page === 'mem' ? ': the spellbook' : ': prayers'), 14, 36, '#ffe6b0'); if (this.casters(this.page).length > 1 && devOf() !== 'mouse') { glyph(g, 'mL', W - 60, 34); glyph(g, 'mR', W - 40, 34); }
      const cw = Math.floor((W - 40) / 2); let lastL = 0; TXT(g, 'Slots', 14 + cw + 12, 40, COL.dim);
      for (const w of list) {
        if (w.spell) { const sp = B.SP(w.spell); TXT(g, 'L' + sp.lvl + ' ' + sp.name, w.x + 2, w.y + 2, w.disabled ? '#6a6050' : COL.text); }
        else { if (w.slotL !== lastL) { TXT(g, 'Level ' + w.slotL, w.x, w.y - 11, COL.slot); lastL = w.slotL; } const id = m.mem[w.slotL][w.slotI]; px.rect(g, w.x, w.y, w.w, w.h, '#14100c'); TXT(g, id ? B.SP(id).name + (m.spent[w.slotL][w.slotI] ? '  (after rest)' : '') : '- empty -', w.x + 3, w.y + 2, id ? (m.spent[w.slotL][w.slotI] ? COL.dim : '#a8c8ff') : '#5a5040'); }
      }
      const fw = list.find(w => w.id === this.focus); if (fw && fw.spell) { const ls = E.font.wrap(B.SP(fw.spell).desc, W - 30); ls.slice(0, 2).forEach((l, i) => TXT(g, l, 14, H - 86 + i * 10 - 10, '#c8bca0')); }
      Focus.draw(g, list, this.focus);
      prompts(g, [['confirm', fw && fw.spell ? 'Prepare' : 'Clear'], ['mTri', 'Same as before'], ['cancel', 'Back']], W - 8, H - 62, { align: 'right' });
    } else if (this.page === 'scribe') {
      panel(g, 6, 30, W - 12, H - 94); TXT(g, 'Scribe a scroll into a spellbook', 14, 36, '#ffe6b0');
      if (!list.length) TXT(g, 'No scrolls to scribe.', 20, 54, COL.dim);
      for (const w of list) { icon(g, w.sc.it.id, w.x, w.y); TXT(g, IT(w.sc.it.id).name + '  →  ' + MEM(w.sc.mage).name, w.x + 16, w.y + 2, COL.text); }
      Focus.draw(g, list, this.focus); prompts(g, [['confirm', 'Scribe'], ['cancel', 'Back']], W - 8, H - 62, { align: 'right' });
    } else if (this.page === 'form') {
      panel(g, W / 2 - 110, 30, 220, 150); TXT(g, 'Formation: choose two places to swap', W / 2 - TW('Formation: choose two places to swap') / 2, 36, '#ffe6b0');
      for (const w of list) {
        const mi = S.party.form[w.place], m = mi >= 0 ? MEM(mi) : null;
        panel(g, w.x, w.y, w.w, w.h, { rivets: false, border: this.swapA === w.place ? COL.focus : '#6a5a3a' });
        TXT(g, ['FRONT', 'FRONT', 'MID', 'MID', 'BACK', 'BACK'][w.place], w.x + 3, w.y + 2, '#6a5e48', { font: 'tiny' });
        if (m) { UI.rig(m).drawPortrait(g, w.x + 4, w.y + 9, 26, { zoom: 2.2, turn: .4, frame: false, tint: m.state !== 'ok' ? '#606060' : undefined }); TXT(g, m.name.slice(0, 7), w.x + 32, w.y + 16, COL.text); }
      }
      Focus.draw(g, list, this.focus); prompts(g, [['confirm', this.swapA === null ? 'Pick' : 'Swap'], ['cancel', 'Back']], W - 8, H - 62, { align: 'right' });
    } else if (this.page === 'eat') {
      const lines = this.ate && this.ate.length ? this.ate : ['No one is hungry enough, or there is nothing to eat.'];
      panel(g, W / 2 - 120, H / 2 - 50, 240, 30 + lines.length * 11);
      TXT(g, 'The party eats', W / 2 - TW('The party eats') / 2, H / 2 - 44, '#ffe6b0'); lines.forEach((l, i) => TXT(g, l, W / 2 - 110, H / 2 - 30 + i * 11, COL.text));
      prompts(g, [['confirm', 'OK']], W / 2, H / 2 - 12 + lines.length * 11, { align: 'center' });
    }
  }
};
B.canSaveHere = () => S && S.mode === 'campaign' && !(B.Hub && B.Hub.active) && !S.transit && !S.talk && !S.moment && !S.over && !B.enemiesNear(6);
