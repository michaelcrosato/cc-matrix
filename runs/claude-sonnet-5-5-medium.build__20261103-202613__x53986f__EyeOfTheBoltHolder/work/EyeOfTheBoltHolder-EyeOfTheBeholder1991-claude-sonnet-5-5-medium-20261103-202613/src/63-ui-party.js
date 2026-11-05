/* PARTY SCREEN: tabs, paperdoll, backpack, details, sheet. */
(() => {
  const SLOTS = [['head', 'Head', 0, 0], ['neck', 'Neck', 0, 1], ['body', 'Body', 0, 2], ['arms', 'Arms', 0, 3], ['feet', 'Feet', 0, 4], ['main', 'Main', 1, 0], ['off', 'Off', 1, 1], ['ring1', 'Ring', 1, 2], ['ring2', 'Ring', 1, 3], ['quiver', 'Quiver', 1, 4]];
  const typeLine = (it) => ({ weapon: it.missile ? 'Missile weapon' : it.reach ? 'Reach weapon' : it.cat === 'thrown' ? 'Thrown weapon' : 'Melee weapon', armor: 'Armour', shield: 'Shield', helm: 'Helm', bracers: 'Bracers', ring: 'Ring', boots: 'Boots', neck: 'Charm', ammo: 'Ammunition', food: 'Food', potion: 'Potion', scroll: 'Scroll', wand: 'Wand', key: 'Key', misc: 'Odd thing', tool: 'Tool', book: 'Spellbook', symbol: 'Holy symbol', note: 'Note' }[it.t] || '');
  UI.itemInfo = (ref) => {
    const it = B.ITEMS[ref.id], L = [typeLine(it)]; if (it.dmg) L.push('Damage ' + it.dmg[0] + 'd' + it.dmg[1] + (ref.rust ? ' (rusted -' + ref.rust + ')' : '') + '   Speed ' + it.spd.toFixed(2) + 's'); if (it.def) L.push('Defense +' + it.def); if (ref.n) L.push('Count ' + ref.n); if (ref.charges != null) L.push('Charges ' + ref.charges); if (it.food) L.push('Feeds ' + it.food);
    if (it.spell) L.push(B.SPELLS[it.spell].n); if (it.two) L.push('Two-handed'); return { name: it.n, lines: L, desc: it.d };
  };
  UI.screens.party = {
    pause: false,
    enter() { this.F = new UI.Focus(); this.m = B.S.party.selected; this.sheet = false; this.confirmDismiss = false; this.msg = ''; this.F.id = 'p:0'; },
    exit() { const p = B.S.party; if (p.hand) { B.stowHand(); } },
    loc(id) { const m = this.m; if (id.startsWith('s:')) return { k: 'slot', m, s: id.slice(2) }; if (id.startsWith('p:')) return { k: 'pack', m, i: +id.slice(2) }; return null; },
    layout(r) {
      const F = this.F, p = B.S.party, n = p.members.length; F.begin(); const L = this.L = {}; const x0 = Math.round((r.W - 330) / 2) + 2; L.x0 = x0;
      for (let i = 0; i < n; i++) F.add('t:' + i, x0 + 4 + i * 34, 6, 30, 30);
      const py = 52; for (const [id, nm, col, row] of SLOTS) F.add('s:' + id, x0 + 6 + col * 72, py + row * 24, 22, 22, { nb: {} });
      for (let i = 0; i < 12; i++) F.add('p:' + i, x0 + 112 + (i % 4) * 25, py + Math.floor(i / 4) * 25, 23, 23);
      F.add('b:sheet', x0 + 112, py + 80, 48, 12); F.add('b:ability', x0 + 112, py + 94, 98, 12, { skip: !(p.members[this.m] && B.abilityOf(p.members[this.m])) }); F.add('b:dismiss', x0 + 164, py + 80, 46, 12, { skip: !p.members[this.m] || !p.members[this.m].npc });
    },
    update(dt) {
      const S = B.S, p = S.party, inp = UI.game.input, r = UI.game.r || { W: UI.game.W, H: UI.game.H };
      if (this.m >= p.members.length) this.m = 0; this.layout(r); const F = this.F;
      if (inp.pressed('tabL') && !inp.pressed('alt')) { this.m = (this.m + p.members.length - 1) % p.members.length; p.selected = this.m; UI.sfx('ui_tab'); } if (inp.pressed('tabR')) { this.m = (this.m + 1) % p.members.length; p.selected = this.m; UI.sfx('ui_tab'); }
      if (inp.pressed('altC') && UI.last() !== 'mouse') this.sheet = !this.sheet;
      if (this.confirmDismiss) { if (inp.pressed('confirm')) { inp.consume('confirm'); B.dismiss(this.m); this.confirmDismiss = false; this.m = 0; } if (inp.pressed('cancel')) { inp.consume('cancel'); this.confirmDismiss = false; } return; }
      let res = F.run(); if (!res && inp.pressed('strike') && UI.last() === 'mouse' && F.items[F.cur]) res = { act: 'altB', item: F.items[F.cur] }; if (!res) { if (inp.pressed('party') || inp.pressed('cancel')) { UI.close(); } return; }
      const id = res.item && res.item.id;
      if (res.act === 'back') { if (p.hand) { B.stowHand(); UI.sfx('ui_back'); } else UI.close(); return; }
      if (!id) { if (res.act === 'clickAway' && p.hand) B.stowHand(); return; }
      if (id.startsWith('t:')) { if (res.act === 'confirm' || res.act === 'click') { const i = +id.slice(2); if (p.hand && false) { } this.m = i; p.selected = i; } return; }
      if (id === 'b:ability') { B.cmdAbility(this.m); return; } if (id === 'b:sheet') { this.sheet = !this.sheet; return; } if (id === 'b:dismiss') { this.confirmDismiss = true; return; }
      const loc = this.loc(id); if (!loc) return;
      if (res.act === 'confirm' || res.act === 'click') { if (!B.invClick(loc)) UI.sfx('ui_err'); }
      else if (res.act === 'altB') { B.useLoc(loc); } else if (res.act === 'alt') { if (B.getLoc(loc)) B.invDrop(loc); }
    },
    draw(g, r) {
      const S = B.S, p = S.party, m = p.members[this.m], E = My3D2dge, P = UI.PAL, F = this.F; if (!m) return; UI.veil(g, r, .7); const L = this.L; if (!L) return;
      UI.panel(g, L.x0 - 2, 2, 334, r.H - 4);
      p.members.forEach((mm, i) => { const q = F.items[F.index('t:' + i)]; if (!q) return; if (!mm.rig) mm.rig = B.rigFor(mm); g.fillStyle = i === this.m ? '#4a3a1a' : '#1a1612'; g.fillRect(q.x - 1, q.y - 1, q.w + 2, q.h + 2); mm.rig.drawPortrait(g, q.x, q.y, 28, { zoom: 2.2, turn: .4, bg: '#2a2438', tint: mm.state !== 'ok' ? '#707070' : undefined }); if (F.cur === F.index('t:' + i)) { g.strokeStyle = P.focus; g.strokeRect(q.x - .5, q.y - .5, q.w + 1, q.h + 1); } });
      UI.text(g, m.name + ' - ' + B.RACES[m.race].n + ' ' + B.CLASSES[m.cls].n, L.x0 + 4, 40, P.focus);
      // paperdoll
      if (!m.rig) m.rig = B.rigFor(m); m.rig.drawPortrait(g, L.x0 + 30, 52, 44, { zoom: 3.4, turn: .5, bg: '#2a2438', tint: m.state !== 'ok' ? '#707070' : undefined }); UI.beard(g, m, L.x0 + 30, 52, 44);
      for (const [id, nm, col, row] of SLOTS) { const q = F.items[F.index('s:' + id)], ref = m.slots[id], sel = F.cur === F.index('s:' + id); g.fillStyle = '#0e0c0a'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = sel ? P.focus : '#5a4a2a'; g.strokeRect(q.x + .5, q.y + .5, q.w - 1, q.h - 1); if (ref) UI.icon(g, ref.id, q.x + 5, q.y + 5, 12); else UI.text(g, nm.slice(0, 4), q.x + 2, q.y + 8, '#4a4030', { font: 'tiny' }); if (ref && ref.n > 1) UI.text(g, String(ref.n), q.x + 2, q.y + 15, '#fff', { font: 'tiny' }); }
      for (let i = 0; i < 12; i++) { const q = F.items[F.index('p:' + i)], ref = m.pack[i], sel = F.cur === F.index('p:' + i); g.fillStyle = '#0e0c0a'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = sel ? P.focus : '#5a4a2a'; g.strokeRect(q.x + .5, q.y + .5, q.w - 1, q.h - 1); if (ref) { UI.icon(g, ref.id, q.x + 5, q.y + 5, 12); if (ref.n > 1) UI.text(g, String(ref.n), q.x + 2, q.y + 16, '#fff', { font: 'tiny' }); } }
      { const q = F.items[F.index('b:ability')], mm = m, ab = B.abilityOf(mm); if (q && !q.skip && ab) { const sel = F.cur === F.index('b:ability'); UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); UI.text(g, ab.n + ' (' + (mm.lay > 0 ? 'ready' : 'used') + ')', q.x + q.w / 2, q.y + 2, sel ? P.focus : P.text, { align: 'center', font: 'tiny' }); } }
      for (const id of ['sheet', 'dismiss']) { const q = F.items[F.index('b:' + id)]; if (!q || q.skip) continue; const sel = F.cur === F.index('b:' + id); UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); UI.text(g, id === 'sheet' ? (this.sheet ? 'Items' : 'Sheet') : 'Dismiss', q.x + q.w / 2, q.y + 2, sel ? P.focus : P.text, { align: 'center', font: 'tiny' }); }
      // details
      const dx = L.x0 + 214, dw = 330 - 218 + L.x0 - L.x0; let focusId = F.items[F.cur] && F.items[F.cur].id, ref = null, lab = null; const loc = focusId && this.loc(focusId); if (loc) ref = B.getLoc(loc);
      const bx = dx, bw = 112; UI.panel(g, bx, 40, bw, 120);
      if (this.sheet) { let y = 44; for (const k of ['str', 'dex', 'con', 'int', 'wis']) { UI.text(g, k.toUpperCase() + ' ' + m.stats[k] + '  (' + (B.mod(m.stats[k]) >= 0 ? '+' : '') + B.mod(m.stats[k]) + ')', bx + 6, y, P.text); y += 9; } UI.text(g, B.CLASSES[m.cls].note, bx + 6, y + 2, P.dim, { font: 'tiny' }); UI.wrap(B.CLASSES[m.cls].note, bw - 10).forEach((l, i) => UI.text(g, l, bx + 6, y + 4 + i * 8, P.dim, { font: 'normal' })); y += 36; UI.text(g, B.RACES[m.race].trait, bx + 6, y, P.dim); const kn = B.known(m); if (kn.length) { y += 14; UI.text(g, 'Spells: ' + kn.map(k => B.SPELLS[k].n).slice(0, 6).join(', '), bx + 6, y, '#8ab0ff'); } }
      else if (ref) { const info = UI.itemInfo(ref); UI.icon(g, ref.id, bx + 6, 45, 24); UI.text(g, info.name, bx + 34, 47, P.focus); let y = 60; for (const l of info.lines) { UI.text(g, l, bx + 6, y, '#c8c0b0', { font: 'normal' }); y += 9; } for (const l of UI.wrap(info.desc, bw - 10)) { UI.text(g, l, bx + 6, y + 2, P.dim); y += 9; } }
      else UI.text(g, 'Empty.', bx + 8, 50, P.dim);
      // bottom stats
      const xp = m.lvl >= 8 ? 'max' : Math.floor(m.xp) + '/' + B.XPT[m.lvl + 1];
      UI.text(g, 'HP ' + m.hp + '/' + m.max + '   Defense ' + B.defense(m) + '   Lv ' + m.lvl + ' ' + B.CLASSES[m.cls].n + '   XP ' + xp + '   Food ' + m.food + '%', L.x0 + 4, 166, P.text);
      if (this.confirmDismiss) { UI.panel(g, L.x0 + 90, 90, 160, 36, { focus: true }); UI.text(g, 'Dismiss ' + m.name + ' for good?', L.x0 + 170, 96, P.text, { align: 'center' }); UI.prompts(g, [['confirm', 'Yes'], ['cancel', 'No']], L.x0 + 170, 110, { center: true }); }
      if (p.hand) { const hp = UI.game.input.pointer && UI.game.input.pointer(); const q = F.items[F.cur]; const hx = UI.last() === 'mouse' && hp ? hp[0] + 4 : q ? q.x + 14 : 100, hy = UI.last() === 'mouse' && hp ? hp[1] + 4 : q ? q.y + 14 : 100; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(hx - 1, hy - 1, 14, 14); UI.icon(g, p.hand.id, hx, hy, 12); UI.text(g, 'Holding ' + B.ITEMS[p.hand.id].n, L.x0 + 4, 176, '#ffe090'); }
      UI.prompts(g, [['confirm', p.hand ? 'Place' : 'Take'], ['altB', 'Use'], ['alt', 'Drop'], ['altC', 'Sheet'], ['tabL', 'Prev'], ['tabR', 'Next'], ['cancel', 'Back']].slice(0, UI.last() === 'gamepad' ? 7 : 7), r.W - L.x0 + 4, r.H - 16, { right: true });
      if (UI.last() === 'mouse') UI.text(g, 'Right-click an item to use it', L.x0 + 4, r.H - 14, P.dim, { font: 'tiny' });
    }
  };
})();
