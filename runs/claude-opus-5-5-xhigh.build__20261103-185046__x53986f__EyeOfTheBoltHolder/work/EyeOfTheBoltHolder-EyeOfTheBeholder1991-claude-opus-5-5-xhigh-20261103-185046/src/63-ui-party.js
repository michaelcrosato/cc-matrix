/* =====================================================================================
 * 63-ui-party: the Party screen. Member tabs (L1 R1), the paperdoll's ten slots round a live portrait, the backpack of
 * twelve, the focused item's details, the stats line; ✕ takes or places with the Hand, □ uses, △ drops the Hand, R2 the
 * Sheet (stats, abilities, spells, Dismiss for NPCs). The mouse hovers, clicks, drags and drops.
 * ===================================================================================== */
const DOLL = [['head', 'Head'], ['neck', 'Neck'], ['body', 'Body'], ['arms', 'Arms'], ['main', 'Main'], ['off', 'Off'], ['ring1', 'Ring'], ['ring2', 'Ring'], ['feet', 'Feet'], ['quiver', 'Quiver']];
function itemLines(it) {
  const d = IT(it.id), out = [];
  const kind = { weapon: d.thrown && !d.stack ? 'Weapon, thrown' : d.stack ? 'Thrown' : 'Weapon', missile: 'Missile weapon', ammo: 'Ammunition', armor: 'Armour', shield: 'Shield', head: 'Head', neck: 'Neck', arms: 'Arms', ring: 'Ring', feet: 'Feet', food: 'Food', potion: 'Potion',
    scroll: 'Scroll', wand: 'Wand', key: 'Key', ward: 'Ward', gear: 'Gear', note: 'Writing', junk: 'Heavy', tool: 'Tool', symbol: 'Holy symbol', book: 'Spellbook', coin: 'Coin' }[d.kind] || d.kind;
  out.push([kind + (d.two ? ', two hands' : '') + (d.reach ? ', reach' : ''), COL.dim]);
  if (d.dmg) out.push(['Damage ' + d.dmg[0] + 'd' + d.dmg[1] + (d.dmg[2] ? '+' + d.dmg[2] : '') + (it.rust ? ' (rusted -' + it.rust * 2 + ')' : '') + '  Speed ' + d.speed + 's', COL.text]);
  if (d.def) out.push(['Defense +' + d.def + (it.corrode ? ' (corroded -' + it.corrode + ')' : ''), COL.text]);
  if (d.food) out.push(['Food +' + d.food, COL.text]);
  if (d.heal) out.push(['Heals ' + d.heal[0] + 'd' + d.heal[1] + '+' + d.heal[2], COL.text]);
  if (it.ch !== undefined) out.push(['Charges ' + it.ch, COL.text]);
  if (d.ammo) out.push(['Uses ' + IT(d.ammo).name, COL.text]);
  if (d.cls && d.cls !== 'FPRCMT') out.push([d.cls.split('').map(c => B.CLASSES[c].name).join(', '), '#a8c8a8']);
  return out;
}
B.itemLines = itemLines;
SCREENS.party = {
  m: 0, focus: 'p0', sheet: false, from: null, drag: null, confirm: false, scroll: 0,
  open(d) { this.m = d.m !== undefined ? d.m : S.party.sel; this.sheet = false; this.focus = 'p0'; this.from = null; this.drag = null; this.confirm = false; },
  close() { this.returnHand(); },
  /** a carried item goes back where it came from, else into a pack */
  returnHand() { const P = S.party; if (!P.hand) return; const f = this.from; if (f && !B.getSlot(MEM(f.m), f.slot) && B.fits(MEM(f.m), f.slot, P.hand) === true) B.cmd({ c: 'inv', op: 'place', m: f.m, slot: f.slot }); this.from = null; },
  layout(W, H) {
    const P = S.party, out = [], m = MEM(this.m);
    // member tabs
    const n = P.members.length, tw = 26, tx0 = Math.round(W / 2 - (n * (tw + 3)) / 2);
    P.members.forEach((mm, i) => out.push({ id: 't' + i, x: tx0 + i * (tw + 3), y: 4, w: tw, h: 26, act: () => { this.m = i; Sound.sfx('uiTab'); }, tip: mm.name, tab: i }));
    const cs = Math.max(18, Math.min(22, Math.floor((W - 20) / 15))), top = 40;
    if (this.sheet) {
      out.push({ id: 'sheetBack', x: 8, y: H - 22, w: 60, h: 14, act: () => { this.sheet = false; }, label: 'Items' });
      if (m.npc) out.push({ id: 'dismiss', x: W - 90, y: H - 40, w: 80, h: 14, act: () => { this.confirm = true; }, label: 'Dismiss' });
      return out;
    }
    // the paperdoll: slots in two columns round the portrait, and a row under it
    const dx = 8, cols = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]], pw = 44;
    cols.forEach((list, ci) => list.forEach((k, ri) => { const [s, label] = DOLL[k]; out.push({ id: 's' + s, slot: s, label, x: dx + ci * (cs + pw + 8), y: top + ri * (cs + 4), w: cs, h: cs }); }));
    this.doll = { x: dx + cs + 4, y: top + 8, w: pw, h: pw };
    // the backpack 4 x 3
    const bx = dx + cs * 2 + pw + 20, by = top + 6;
    for (let i = 0; i < 12; i++) out.push({ id: 'p' + i, slot: i, x: bx + (i % 4) * (cs + 3), y: by + Math.floor(i / 4) * (cs + 3), w: cs, h: cs });
    this.packBox = { x: bx - 4, y: by - 14, w: 4 * (cs + 3) + 5, h: 3 * (cs + 3) + 18 };
    this.details = { x: bx + 4 * (cs + 3) + 6, y: top - 4, w: W - (bx + 4 * (cs + 3) + 6) - 6, h: H - top - 58 };
    out.push({ id: 'sheet', x: this.packBox.x, y: by + 3 * (cs + 3) + 6, w: 60, h: 14, act: () => { this.sheet = true; }, label: 'Sheet' });
    for (const w of out) if (w.slot !== undefined) { w.act = () => this.slotAct(w.slot); w.alt = () => this.slotUse(w.slot); }
    return out;
  },
  slotAct(slot) {
    const P = S.party, m = MEM(this.m), cur = B.getSlot(m, slot);
    if (!P.hand) { if (cur) { this.from = { m: this.m, slot }; B.cmd({ c: 'inv', op: 'take', m: this.m, slot }); } return; }
    B.cmd({ c: 'inv', op: 'place', m: this.m, slot });
    if (!S.party.hand) this.from = null; else this.from = { m: this.m, slot };
  },
  slotUse(slot) { const m = MEM(this.m), it = B.getSlot(m, slot); if (!it) return; B.cmd({ c: 'useItem', m: this.m, slot }); Sound.sfx('uiConfirm'); },
  update(dt) {
    const I = game.input, W = UI.W, H = UI.H, P = S.party;
    if (this.m >= P.members.length) this.m = 0;
    if (this.confirm) {
      if (I.pressed('confirm')) { const mm = MEM(this.m); this.confirm = false; B.cmd({ c: 'dismiss', m: this.m }); this.m = 0; this.sheet = false; UI.toast = { text: mm.name + ' goes home.', t: 0 }; }
      else if (I.pressed('cancel')) this.confirm = false;
      const ck = I.clicked(); if (ck) { if (ck[1] > H / 2 + 6 && ck[1] < H / 2 + 22) { if (ck[0] < W / 2) { B.cmd({ c: 'dismiss', m: this.m }); this.m = 0; this.sheet = false; } this.confirm = false; } }
      return;
    }
    if (I.pressed('cancel')) { if (P.hand && this.from) { this.returnHand(); return; } UI.close(); return; }
    if (I.pressed('party')) { UI.close(); return; }
    if (I.pressed('mL')) { this.m = (this.m + P.members.length - 1) % P.members.length; Sound.sfx('uiTab'); }
    if (I.pressed('mR')) { this.m = (this.m + 1) % P.members.length; Sound.sfx('uiTab'); }
    if (I.pressed('mR2')) { this.sheet = !this.sheet; Sound.sfx('uiTab'); }
    if (I.pressed('journal')) { UI.close(); UI.open('journal'); return; }
    const list = this.layout(W, H);
    // the mouse: press on an item carries it; release over a slot places it
    const pt = I.pointer && I.pointer(), down = I.held.has('Mouse0');
    const under = pt && list.find(w => w.slot !== undefined && pt[0] >= w.x && pt[0] < w.x + w.w && pt[1] >= w.y && pt[1] < w.y + w.h);
    if (down && !this._down) { this._down = true; if (under && !P.hand && B.getSlot(MEM(this.m), under.slot)) { this.slotAct(under.slot); this.drag = under.slot; } else this.drag = null; }
    if (!down && this._down) { this._down = false; if (under && P.hand && under.slot !== this.drag) this.slotAct(under.slot); this.drag = null; }
    const r = Focus.step(list.filter(w => w.slot === undefined || !pt || game.input.lastDevice !== 'mouse' ? true : true), this.focus, { noClickSlots: true, tri: () => { if (P.hand) { B.cmd({ c: 'inv', op: 'drop', m: this.m }); this.from = null; } } });
    this.focus = r.id;
    if (game.input.lastDevice === 'mouse' && r.cur && r.cur.slot !== undefined && I.clicked()) { /* (slots act on press and release above) */ }
  },
  draw(g, r) {
    const W = r.W, H = r.H, P = S.party, m = MEM(this.m); if (!m) return;
    g.save(); g.globalAlpha = .72; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    const list = this.layout(W, H);
    // tabs
    for (const w of list.filter(q => q.tab !== undefined)) { const mm = P.members[w.tab]; panel(g, w.x, w.y, w.w, w.h, { border: w.tab === this.m ? COL.focus : '#6a5a3a', rivets: false }); if (mm.state === 'dead') drawSkull(g, w.x + 13, w.y + 13); else UI.rig(mm).drawPortrait(g, w.x + 3, w.y + 3, 20, { zoom: 2, turn: .4, bg: '#2a2218', frame: false, tint: mm.state === 'down' ? '#606060' : undefined }); }
    if (devOf() !== 'mouse') { const t0 = list.find(q => q.tab === 0), tl = list.filter(q => q.tab !== undefined).pop(); if (t0) glyph(g, 'mL', t0.x - 16, 11); if (tl) glyph(g, 'mR', tl.x + tl.w + 4, 11); }
    if (this.sheet) { this.drawSheet(g, r, m, list); }
    else {
      // the paperdoll
      const dl = this.doll; panel(g, dl.x - 2, dl.y - 2, dl.w + 4, dl.h + 24, { rivets: false });
      UI.rig(m).drawPortrait(g, dl.x, dl.y, dl.w, { zoom: 2.2, turn: .3, bg: '#2a2218', frame: false, tint: m.state === 'down' ? '#606060' : undefined, upright: true });
      for (const w of list.filter(q => typeof q.slot === 'string' || typeof q.slot === 'number')) {
        const it = B.getSlot(m, w.slot), two = w.slot === 'off' && m.slots.main && IT(m.slots.main.id).two;
        px.rect(g, w.x, w.y, w.w, w.h, '#0a0908'); px.rect(g, w.x + 1, w.y + 1, w.w - 2, w.h - 2, typeof w.slot === 'number' ? '#2a2420' : '#2e2618');
        if (it) icon(g, it.id, w.x + w.w / 2 - 6, w.y + w.h / 2 - 6); else if (two) TXT(g, '2H', w.x + 4, w.y + 6, '#6a5a40', { font: 'tiny' }); else if (w.label) TXT(g, w.label, w.x + 2, w.y + w.h - 7, '#5a4e3c', { font: 'tiny' });
        if (it && it.n > 1) TXT(g, it.n, w.x + w.w - TW(String(it.n), { font: 'tiny' }) - 1, w.y + w.h - 6, '#ffffff', { font: 'tiny' });
      }
      const pb = this.packBox; TXT(g, 'Backpack', pb.x + 4, pb.y + 4, COL.dim);
      const sh = list.find(q => q.id === 'sheet'); panel(g, sh.x, sh.y, sh.w, sh.h, { rivets: false }); TXT(g, 'Sheet', sh.x + 6, sh.y + 3, COL.text); if (devOf() !== 'mouse') glyph(g, 'mR2', sh.x + sh.w + 3, sh.y + 1);
      // details of the focused item (or the Hand's)
      const fw = list.find(q => q.id === this.focus), it = P.hand || (fw && fw.slot !== undefined ? B.getSlot(m, fw.slot) : null), D = this.details;
      panel(g, D.x, D.y, D.w, D.h, { rivets: true });
      if (it) {
        icon(g, it.id, D.x + 6, D.y + 6, 2); const nm = B.itemName(it);
        const nl = E.font.wrap(nm, D.w - 40); nl.slice(0, 2).forEach((l, i) => TXT(g, l, D.x + 34, D.y + 6 + i * 10, '#ffe6b0'));
        let y = D.y + 34; for (const [l, c] of itemLines(it)) { for (const ln of E.font.wrap(l, D.w - 12)) { TXT(g, ln, D.x + 6, y, c); y += 10; } }
        y += 3; for (const ln of E.font.wrap(IT(it.id).desc || '', D.w - 12)) { if (y > D.y + D.h - 10) break; TXT(g, ln, D.x + 6, y, '#c8bca0'); y += 10; }
        if (P.hand) TXT(g, 'In the Hand', D.x + D.w - TW('In the Hand') - 6, D.y + D.h - 12, COL.focus);
      } else TXT(g, 'Nothing here.', D.x + 6, D.y + 8, COL.dim);
      Focus.draw(g, list, this.focus);
      if (P.hand && game.input.lastDevice === 'mouse') { const pt = game.input.pointer(); if (pt) icon(g, P.hand.id, pt[0] - 6, pt[1] - 6, 2); }
      else if (P.hand) { const fw2 = list.find(q => q.id === this.focus); if (fw2) icon(g, P.hand.id, fw2.x + fw2.w - 6, fw2.y - 6); }
    }
    // the stats line and prompts
    const line = 'HP ' + m.hp + '/' + m.max + '   Defense ' + B.memberDef(m) + '   XP ' + Math.floor(m.xp) + (m.lvl < 8 ? '/' + B.XP_AT[m.lvl] : '') + '   Food ' + Math.round(m.food) + '%';
    panel(g, 4, H - 50, W - 8, 26, { rivets: false, alpha: .94 }); TXT(g, m.full + ', ' + B.RACES[m.race].name + ' ' + B.CLASSES[m.cls].name + ', level ' + m.lvl, 10, H - 46, '#ffe6b0'); TXT(g, line, 10, H - 35, COL.text);
    const ps = this.sheet ? [['mR2', 'Items'], ['cancel', 'Back']] : P.hand ? [['confirm', 'Place'], ['mTri', 'Drop'], ['cancel', this.from ? 'Put back' : 'Back']] : [['confirm', 'Take'], ['mAlt', 'Use'], ['mR2', 'Sheet'], ['cancel', 'Back']];
    prompts(g, ps, W - 8, H - 16, { align: 'right' });
    if (this.confirm) { panel(g, W / 2 - 100, H / 2 - 24, 200, 52); TXT(g, 'Send ' + m.name + ' home for good?', W / 2 - TW('Send ' + m.name + ' home for good?') / 2, H / 2 - 14, '#ffe6b0'); prompts(g, [['confirm', 'Dismiss'], ['cancel', 'Keep']], W / 2, H / 2 + 8, { align: 'center' }); }
  },
  drawSheet(g, r, m, list) {
    const W = r.W, H = r.H, x0 = 10, y0 = 46;
    panel(g, 6, 40, W - 12, H - 84);
    const st = ['str', 'dex', 'con', 'int', 'wis'], NM = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS' };
    st.forEach((k, i) => { const v = B.effStat(m, k), md = B.statMod(v); TXT(g, NM[k], x0 + 4, y0 + 4 + i * 12, COL.dim); TXT(g, v, x0 + 34, y0 + 4 + i * 12, COL.text); TXT(g, (md >= 0 ? '+' : '') + md, x0 + 54, y0 + 4 + i * 12, md > 0 ? COL.good : md < 0 ? COL.bad : COL.dim); });
    let y = y0 + 4; const x1 = x0 + 84, wcol = Math.floor((W - x1 - 20) / 2);
    const abil = [B.CLASSES[m.cls].about, B.RACES[m.race].trait, 'To-hit +' + B.toHitBase(m) + ' from class and level.'];
    if (m.cls === 'P') abil.push('Lay on Hands: ' + (m.layOnHands ? 'ready' : 'used') + '.'); if (m.cls === 'T') abil.push('Lockpicks: picks simple locks and disarms traps.');
    for (const a of abil) for (const ln of E.font.wrap(a, wcol)) { TXT(g, ln, x1, y, '#d8ccb8'); y += 10; }
    const known = B.knownSpells(m); let y2 = y0 + 4; const x2 = x1 + wcol + 10;
    if (known.length) {
      TXT(g, m.cls === 'M' ? 'Spellbook' : 'Prayers', x2, y2, '#ffe6b0'); y2 += 12;
      const rs = B.readySpells(m);
      for (const id of known) { if (y2 > H - 60) break; TXT(g, B.SP(id).name + (rs[id] ? '  ×' + rs[id] : ''), x2, y2, rs[id] ? COL.text : COL.dim); y2 += 10; }
    } else TXT(g, 'No spells.', x2, y2, COL.dim);
    const sc = B.slotCount(m); if (sc.some(Boolean)) TXT(g, 'Slots: ' + sc.map((n, i) => 'L' + (i + 1) + ' ' + n).filter((s, i) => sc[i]).join('  '), x0 + 4, y0 + 70, COL.slot);
    for (const w of list.filter(q => q.label && (q.id === 'dismiss' || q.id === 'sheetBack'))) { panel(g, w.x, w.y, w.w, w.h, { rivets: false, border: w.id === 'dismiss' ? '#c86a4a' : COL.border }); TXT(g, w.label, w.x + 6, w.y + 3, COL.text); }
    Focus.draw(g, list, this.focus);
  }
};
