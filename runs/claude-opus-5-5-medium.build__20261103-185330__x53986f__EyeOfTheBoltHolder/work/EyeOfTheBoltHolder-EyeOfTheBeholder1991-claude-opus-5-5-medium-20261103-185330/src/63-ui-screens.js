/* SCREENS: the overlays of play, each { layout(W, H, s) -> widgets, draw(g, r, game, ws, s), act(res, s, game) }:
 * Party (paperdoll, backpack, details, sheet), Cast, Camp (rest, memorize, pray, scribe, formation, eat), Map, Journal,
 * Reader, Confirm. Dialogue is drawn by B.Talk. Few big things per screen; every screen shows its prompts. */
B.SCREENS = {};
const scrPanel = (g, W, H, title, s) => { g.save(); g.globalAlpha = .55; px.rect(g, 0, 0, W, H, '#05040a'); g.restore(); B.panel(g, 6, 6, W - 12, H - 12); if (title) B.text(g, title, 14, 11, B.COL.focus); };
const backRow = (g, game, W, H, list) => B.prompts(g, game, list.concat([['cancel', 'Back']]), W - 14, H - 20, 'right');
const PD_SLOTS = [['head', 0, 0], ['neck', 0, 1], ['body', 0, 2], ['arms', 0, 3], ['main', 0, 4], ['ring1', 1, 0], ['ring2', 1, 1], ['feet', 1, 2], ['quiver', 1, 3], ['off', 1, 4]];
B.SCREENS.party = {
  menuTime: true,
  layout(W, H, s) {
    const P = B.S.party, ws = [], narrow = W < 420;
    P.members.forEach((m, i) => ws.push({ id: 'tab' + i, kind: 'tab', i, x: 14 + i * 30, y: 24, w: 26, h: 26 }));
    const sz = 18, px0 = 40, py0 = 58;
    for (const [slot, col, row] of PD_SLOTS) ws.push({ id: 's_' + slot, kind: 'slot', ref: { slot }, x: px0 + col * 78, y: py0 + row * 22, w: sz, h: sz });
    const bx = 172, by = 58, bs = 22;
    for (let i = 0; i < 12; i++) ws.push({ id: 'p' + i, kind: 'slot', ref: { pack: i }, x: bx + (i % 4) * bs, y: by + Math.floor(i / 4) * bs, w: bs - 2, h: bs - 2 });
    ws.push({ id: 'sheet', kind: 'btn', x: bx, y: by + 3 * bs + 6, w: 44, h: 14, label: s.sheet ? 'Items' : 'Sheet' });
    if (P.members[s.m] && P.members[s.m].npc) ws.push({ id: 'dismiss', kind: 'btn', x: bx + 48, y: by + 3 * bs + 6, w: 40, h: 14, label: 'Dismiss' });
    if (P.members[s.m] && P.members[s.m].cls === 'P' && P.members[s.m].loh) ws.push({ id: 'loh', kind: 'btn', x: bx, y: by + 3 * bs + 24, w: 88, h: 14, label: 'Lay on Hands' });
    s.detail = narrow ? { x: 14, y: 172, w: W - 28, h: H - 210 } : { x: 266, y: 28, w: W - 280, h: H - 66 };
    return ws;
  },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, P = B.S.party, m = P.members[s.m] || P.members[0], t = B.UI.t;
    scrPanel(g, W, H, 'PARTY', s);
    for (const w of ws) {
      if (w.kind === 'tab') { const mm = P.members[w.i]; px.rect(g, w.x, w.y, w.w, w.h, '#14100c'); B.memberRig(mm).drawPortrait(g, w.x + 1, w.y + 1, w.w - 2, { zoom: 2.4, turn: .3, bg: '#2a2218', tint: mm.state === 'ok' ? undefined : '#707070' }); if (w.i === s.m) { px.rect(g, w.x, w.y + w.h + 1, w.w, 2, B.COL.focus); } }
      else if (w.kind === 'slot') {
        const it = w.ref.slot ? m.slots[w.ref.slot] : m.pack[w.ref.pack], locked = w.ref.slot === 'off' && B.handLocked(m, 'off');
        px.rect(g, w.x, w.y, w.w, w.h, '#0e0c0a'); px.rect(g, w.x + 1, w.y + 1, w.w - 2, w.h - 2, locked ? '#2a2420' : '#2a2620');
        if (it && !locked) B.drawIcon(g, it, w.x + Math.floor((w.w - 12) / 2), w.y + Math.floor((w.h - 12) / 2));
        if (w.ref.slot) B.text(g, B.SLOT_NAMES[w.ref.slot].split(' ')[0], w.x + (PD_SLOTS.find(p => p[0] === w.ref.slot)[1] ? w.w + 3 : -3), w.y + 5, '#8a7a5a', { font: 'tiny', align: PD_SLOTS.find(p => p[0] === w.ref.slot)[1] ? 'left' : 'right' });
      } else if (w.kind === 'btn') { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1 }); B.text(g, w.label, w.x + w.w / 2, w.y + 4, B.COL.text, { align: 'center' }); }
      if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
    }
    // the paperdoll's portrait between the two columns of slots
    B.memberRig(m).drawPortrait(g, 63, 62, 50, { zoom: 2, turn: .4, bg: '#1a1612', tint: m.state === 'ok' ? undefined : '#707070' });
    B.text(g, B.cut(m.name, 60), 88, 116, B.COL.focus, { align: 'center' });
    B.text(g, B.CLASSES[m.cls].name, 88, 126, B.COL.dim, { align: 'center', font: 'tiny' });
    // details: the focused item, or the sheet
    const D = s.detail; B.panel(g, D.x, D.y, D.w, D.h, { alpha: .6, rivets: false });
    const fw = ws.find(w => w.id === s.focus), it = fw && fw.kind === 'slot' ? (fw.ref.slot ? m.slots[fw.ref.slot] : m.pack[fw.ref.pack]) : null;
    if (s.sheet) B.SCREENS.party.sheet(g, D, m);
    else if (it) {
      const d = B.def(it); B.drawIcon(g, it, D.x + 4, D.y + 4, 2);
      B.text(g, B.cut(B.itemName(it), D.w - 36), D.x + 32, D.y + 6, B.COL.focus);
      B.text(g, B.cut(B.itemLine(d, it), D.w - 36), D.x + 32, D.y + 16, B.COL.dim, { font: 'tiny' });
      let y = D.y + 34; for (const l of B.itemStats(d, it)) { B.text(g, B.cut(l, D.w - 8), D.x + 4, y, '#d8c8a8'); y += 10; }
      for (const l of B.wrap(d.desc, D.w - 8)) { if (y > D.y + D.h - 10) break; B.text(g, l, D.x + 4, y, B.COL.text); y += 10; }
      if (it.ch !== undefined) B.text(g, 'Charges: ' + it.ch, D.x + 4, y, '#8ae0ff');
    } else if (fw && fw.kind === 'tab') { const mm = P.members[fw.i]; B.text(g, mm.name + ', level ' + mm.lvl, D.x + 4, D.y + 6, B.COL.focus); B.text(g, B.RACES[mm.race].name + ' ' + B.CLASSES[mm.cls].name, D.x + 4, D.y + 16, B.COL.dim); }
    else B.text(g, fw && fw.kind === 'slot' ? 'Empty.' : '', D.x + 4, D.y + 6, B.COL.dim);
    // the summary line
    const xpN = B.XP_LEVELS[m.lvl] || m.xp;
    B.text(g, 'HP ' + m.hp + '/' + m.max + '  Def ' + B.defense(m) + '  Lv ' + m.lvl + '  XP ' + Math.floor(m.xp) + '/' + xpN + '  Food ' + Math.round(m.food) + '%', 14, H - 34, B.COL.text);
    if (P.hand) { B.drawIcon(g, P.hand, W - 120, 10); B.text(g, B.cut('Hand: ' + B.itemName(P.hand), 100), W - 104, 13, B.COL.focus); }
    backRow(g, game, W, H, [['confirm', P.hand ? 'Place' : 'Take'], ['alt', 'Use'], ['alt2', 'Drop'], ['tabR', 'Member']]);
  },
  sheet(g, D, m) {
    let y = D.y + 4; const L = (s, c = B.COL.text, o) => { if (y < D.y + D.h - 8) B.text(g, B.cut(s, D.w - 8), D.x + 4, y, c, o); y += 9; };
    L(m.name + ', level ' + m.lvl + ' ' + B.CLASSES[m.cls].name, B.COL.focus);
    L(['str', 'dex', 'con', 'int', 'wis'].map(k => k.toUpperCase() + ' ' + B.stat(m, k) + (B.mod(B.stat(m, k)) ? '(' + (B.mod(B.stat(m, k)) > 0 ? '+' : '') + B.mod(B.stat(m, k)) + ')' : '')).join(' '), '#d8c8a8', { font: 'tiny' });
    L('To hit +' + B.toHitBonus(m) + '   Defense ' + B.defense(m));
    L(B.CLASSES[m.cls].desc, B.COL.dim, { font: 'tiny' }); L(B.RACES[m.race].trait, B.COL.dim, { font: 'tiny' });
    const k = B.casterKind(m);
    if (k) { L(k === 'M' ? 'Spellbook:' : 'Prayers:', B.COL.focus); const known = B.knownSpells(m); for (let i = 0; i < known.length; i += 2) L(known.slice(i, i + 2).map(s => B.SPELLS[s].name).join(', '), '#8ab8ff', { font: 'tiny' }); }
    if (m.npc) L('Joined on the way down.', B.COL.dim, { font: 'tiny' });
  },
  act(res, s, game) {
    const P = B.S.party, w = res.w;
    if (res.act === 'tabL' || res.act === 'tabR') { s.m = (s.m + (res.act === 'tabR' ? 1 : P.members.length - 1)) % P.members.length; game.audio.sfx('uiTab'); return; }
    if (res.act === 'back') { if (P.hand) { B.Play.cmd({ c: 'inv', m: s.m, op: 'stow' }); if (P.hand) B.Play.cmd({ c: 'use' }); return; } return B.Play.closeScreen(); }
    if (!w) return;
    if (w.kind === 'tab' && res.act === 'ok') { s.m = w.i; return; }
    if (w.id === 'sheet') { s.sheet = !s.sheet; return; }
    if (w.id === 'dismiss') return B.Play.openScreen('confirm', { text: 'Dismiss ' + P.members[s.m].name + '? They will go home for good.', yes: () => { B.Play.cmd({ c: 'dismiss', m: s.m }); B.Play.closeScreen(); }, back: 'party', bm: s.m });
    if (w.id === 'loh') { const t = P.members.filter(x => x.state !== 'dead').sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (t) B.Play.cmd({ c: 'loh', m: s.m, target: P.members.indexOf(t) }); return; }
    if (w.kind !== 'slot') return;
    if (res.act === 'ok') B.Play.cmd({ c: 'inv', m: s.m, op: P.hand ? 'place' : 'take', ref: w.ref });
    else if (res.act === 'alt') B.Play.cmd({ c: 'inv', m: s.m, op: 'use', ref: w.ref });
    else if (res.act === 'alt2') B.Play.cmd({ c: 'inv', m: s.m, op: 'drop', ref: w.ref });
  }
};
B.itemLine = (d, it) => ({ weapon: d.two ? 'Two-handed weapon' : 'Weapon', missile: 'Missile weapon', ammo: 'Ammunition', body: 'Body armour', shield: 'Shield', head: 'Headgear', neck: 'Amulet', arms: 'Bracers', ring: 'Ring', feet: 'Boots', food: 'Food', potion: 'Potion', scroll: 'Scroll', wand: 'Wand', tool: 'Tool', symbol: 'Holy symbol', book: 'Spellbook', key: 'Key', ward: 'A Ward of the Undergate', gear: 'Clock gear', note: 'Writing', junk: 'Heavy thing', coin: 'Coin' }[d.kind] || d.kind);
B.itemStats = (d, it) => {
  const out = [], cls = d.cls && d.cls !== 'FPRCMT' ? ' (' + d.cls.split('').map(c => B.CLASSES[c].name[0]).join('') + ')' : '';
  if (d.dmg) out.push('Damage ' + d.dmg + (it.rust ? ' -' + it.rust : '') + '   Speed ' + d.speed + 's' + (d.hit ? '   +' + d.hit + ' hit' : ''));
  if (d.reach) out.push('Reaches from the second row.'); if (d.throw) out.push('Can be thrown.'); if (d.ammo) out.push('Fires ' + B.ITEMS[d.ammo].name.toLowerCase() + '.');
  if (d.def !== undefined) out.push('Defense +' + d.def + cls);
  if (d.food) out.push('Food +' + d.food); if (d.heal) out.push('Heals ' + d.heal); if (d.spell) out.push(B.SPELLS[d.spell].name + ': ' + B.SPELLS[d.spell].desc);
  return out.slice(0, 3);
};
/* ---- CAST: a caster's spells by level, then a target ---- */
B.SCREENS.cast = {
  menuTime: true,
  layout(W, H, s) {
    const m = B.S.party.members[s.m], ws = [], pw = Math.min(280, W - 20), x0 = Math.round((W - pw) / 2), y0 = Math.round(H / 2 - 92);
    s.box = { x: x0, y: y0, w: pw, h: 150 };
    if (s.pick) { B.HUD.cards(W, H).forEach(c => ws.push({ id: 'c' + c.mi, kind: 'card', mi: c.mi, x: c.x, y: c.y, w: c.w, h: c.h })); return ws; }
    for (let l = 1; l <= 3; l++) ws.push({ id: 'L' + l, kind: 'lvl', l, x: x0 + 8 + (l - 1) * 34, y: y0 + 18, w: 30, h: 13 });
    const ready = B.readySpells(m), list = [...new Set(m.mem.map(e => e.s))].filter(sp => B.SPELLS[sp].lvl === s.lvl);
    list.forEach((sp, i) => ws.push({ id: 'sp_' + sp, kind: 'spell', sp, n: ready[sp] || 0, x: x0 + 8, y: y0 + 38 + i * 14, w: pw / 2 - 12, h: 12 }));
    return ws;
  },
  draw(g, r, game, ws, s) {
    const m = B.S.party.members[s.m], b = s.box, t = B.UI.t;
    if (s.pick) { B.panel(g, r.W / 2 - 90, r.H / 2 - 30, 180, 22); B.text(g, 'Cast ' + B.SPELLS[s.pick].name + ' on whom?', r.W / 2, r.H / 2 - 24, B.COL.focus, { align: 'center' }); for (const w of ws) if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t); B.prompts(g, game, [['confirm', 'Cast'], ['cancel', 'Back']], r.W / 2, r.H / 2 + 2, 'center'); return; }
    B.panel(g, b.x, b.y, b.w, b.h); B.text(g, m.name + (B.casterKind(m) === 'M' ? ' casts' : ' prays'), b.x + 8, b.y + 5, B.COL.focus);
    for (const w of ws) {
      if (w.kind === 'lvl') { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1, border: w.l === s.lvl ? B.COL.focus : '#6a5a3a' }); B.text(g, 'L' + w.l, w.x + w.w / 2, w.y + 3, w.l === s.lvl ? B.COL.focus : B.COL.dim, { align: 'center' }); }
      else { B.text(g, B.SPELLS[w.sp].name + ' ×' + w.n, w.x + 2, w.y + 2, w.n ? '#8ab8ff' : '#5a5a6a'); }
      if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
    }
    if (!ws.some(w => w.kind === 'spell')) B.text(g, 'No spells of this level are memorized.', b.x + 8, b.y + 40, B.COL.dim);
    const fw = ws.find(w => w.id === s.focus);
    if (fw && fw.kind === 'spell') { const sp = B.SPELLS[fw.sp]; let y = b.y + 38; for (const l of B.wrap(sp.desc, b.w / 2 - 8)) { B.text(g, l, b.x + b.w / 2 + 4, y, B.COL.text); y += 10; } B.text(g, 'Target: ' + { line: 'down the line', front: 'in front', member: 'a companion', party: 'everyone', door: 'the door ahead', dead: 'the fallen' }[sp.target], b.x + b.w / 2 + 4, y + 4, B.COL.dim, { font: 'tiny' }); }
    B.prompts(g, game, [['confirm', 'Cast'], ['tabR', 'Level'], ['cancel', 'Back']], b.x + b.w - 8, b.y + b.h - 14, 'right');
  },
  act(res, s, game) {
    if (s.pick) { if (res.act === 'back') { s.pick = null; return; } if (res.act === 'ok' && res.w && res.w.kind === 'card') { B.Play.cmd({ c: 'cast', m: s.m, spell: s.pick, target: res.w.mi }); B.Play.closeScreen(); } return; }
    if (res.act === 'back') return B.Play.closeScreen();
    if (res.act === 'tabL' || res.act === 'tabR') { s.lvl = (s.lvl + (res.act === 'tabR' ? 0 : 1)) % 3 + 1; return; }
    const w = res.w; if (!w) return;
    if (w.kind === 'lvl' && res.act === 'ok') { s.lvl = w.l; return; }
    if (w.kind === 'spell' && res.act === 'ok') {
      if (!w.n) { game.audio.sfx('uiError'); return; }
      const tg = B.SPELLS[w.sp].target;
      if (tg === 'member' || tg === 'dead') { s.pick = w.sp; s.focus = 'c' + s.m; return; }
      B.Play.cmd({ c: 'cast', m: s.m, spell: w.sp }); B.Play.closeScreen();
    }
  }
};
/* ---- CAMP: ten tiles; Rest counts the hours; Memorize and Pray fill slots; Scribe, Formation, Eat ---- */
const CAMP_TILES = [['rest', 'Rest'], ['memorize', 'Memorize'], ['pray', 'Pray'], ['scribe', 'Scribe'], ['formation', 'Formation'], ['eat', 'Eat'], ['save', 'Save Game'], ['load', 'Load Game'], ['settings', 'Settings'], ['leave', 'Leave Camp']];
B.SCREENS.camp = {
  layout(W, H, s) {
    const ws = [], S = B.S, P = S.party;
    if (s.sub === 'rest') return ws;
    if (s.sub === 'memorize' || s.sub === 'pray') {
      const casters = P.members.map((m, i) => [m, i]).filter(([m]) => m.state === 'ok' && (s.sub === 'memorize' ? B.casterKind(m) === 'M' : B.casterKind(m) === 'C'));
      casters.forEach(([m, i], k) => ws.push({ id: 'who' + i, kind: 'who', mi: i, x: 14 + k * 30, y: 24, w: 26, h: 26 }));
      if (!casters.some(([, i]) => i === s.mi)) s.mi = casters.length ? casters[0][1] : -1;
      const m = P.members[s.mi]; if (!m) return ws;
      B.knownSpells(m).sort((a, b) => B.SPELLS[a].lvl - B.SPELLS[b].lvl).forEach((sp, k) => ws.push({ id: 'k_' + sp, kind: 'known', sp, x: 14, y: 58 + k * 13, w: 130, h: 12 }));
      let k = 0; for (let l = 1; l <= 3; l++) { const n = B.slotCount(m, l), list = m.mem.map((e, i) => [e, i]).filter(([e]) => B.SPELLS[e.s].lvl === l); for (let j = 0; j < n; j++) { const ent = list[j]; ws.push({ id: 'slot' + l + '_' + j, kind: 'mslot', l, ent: ent ? ent[0] : null, idx: ent ? ent[1] : -1, x: 160, y: 58 + k * 13, w: 120, h: 12 }); k++; } }
      return ws;
    }
    if (s.sub === 'scribe') { const m = P.members[s.mi]; if (m) B.scribable(m).forEach((f, k) => ws.push({ id: 'sc' + k, kind: 'scroll', i: k, f, x: 14, y: 40 + k * 14, w: 200, h: 12 })); return ws; }
    if (s.sub === 'formation') { for (let k = 0; k < 6; k++) ws.push({ id: 'pl' + k, kind: 'place', k, x: Math.round(W / 2 - 70 + (k % 2) * 74), y: 40 + Math.floor(k / 2) * 50, w: 66, h: 44 }); return ws; }
    if (s.sub === 'eat') return [{ id: 'ok', kind: 'ok', x: W / 2 - 30, y: H - 60, w: 60, h: 14 }];
    const tw = Math.min(76, Math.floor((W - 40) / 5)), x0 = Math.round((W - tw * 5 - 16) / 2);
    CAMP_TILES.forEach(([id, label], i) => ws.push({ id, kind: 'tile', label, x: x0 + (i % 5) * (tw + 4), y: Math.round(H / 2 - 50 + Math.floor(i / 5) * 46), w: tw, h: 40, skip: (id === 'memorize' && !P.members.some(m => B.casterKind(m) === 'M')) || (id === 'pray' && !P.members.some(m => B.casterKind(m) === 'C')) || (id === 'scribe' && !P.members.some(m => m.cls === 'M')) }));
    return ws;
  },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, S = B.S, P = S.party, t = B.UI.t;
    g.save(); g.globalAlpha = .45; px.rect(g, 0, 0, W, H, '#140a04'); g.restore();
    const fire = Math.sin(t * 9) * .5 + .5; g.save(); g.globalAlpha = .18 + fire * .06; px.rect(g, 0, H * .55, W, H * .45, '#ff8a3a'); g.restore();
    if (s.sub === 'rest') {
      const R = S.camp && S.camp.rest; B.panel(g, W / 2 - 80, 40, 160, 46);
      B.text(g, R ? 'Resting... hour ' + R.hours : 'Rested.', W / 2, 48, B.COL.focus, { align: 'center' });
      if (R) E.ui.bar(g, W / 2 - 60, 62, 120, 5, R.hours / 8, '#c8a040');
      B.prompts(g, game, [['cancel', R ? 'Stop' : 'Done']], W / 2, 72, 'center');
      return;
    }
    B.panel(g, 6, 6, W - 12, H - 70); B.text(g, 'CAMP' + (s.sub ? ': ' + B.cap(s.sub) : ''), 14, 11, B.COL.focus);
    if (!s.sub) {
      for (const w of ws) { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: w.skip ? .4 : 1 }); B.campIcon(g, w.id, w.x + w.w / 2, w.y + 13, w.skip); B.text(g, w.label, w.x + w.w / 2, w.y + w.h - 11, w.skip ? '#6a5a4a' : B.COL.text, { align: 'center' }); if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t); }
      B.text(g, B.safeCell(P.cx, P.cy) ? 'A safe place. No one will disturb your rest.' : B.FS().wanderers > 0 ? 'Rest here, and something may find you.' : 'The halls nearby are quiet now.', W / 2, Math.round(H / 2 - 50) - 16, B.COL.dim, { align: 'center' });
    } else if (s.sub === 'memorize' || s.sub === 'pray') {
      const m = P.members[s.mi];
      if (!m) B.text(g, 'No one here can ' + (s.sub === 'pray' ? 'pray.' : 'memorize spells.'), 14, 40, B.COL.dim);
      for (const w of ws) {
        if (w.kind === 'who') { const mm = P.members[w.mi]; B.memberRig(mm).drawPortrait(g, w.x, w.y, w.w, { zoom: 2.4, bg: '#2a2218' }); if (w.mi === s.mi) px.rect(g, w.x, w.y + w.h + 1, w.w, 2, B.COL.focus); }
        else if (w.kind === 'known') B.text(g, 'L' + B.SPELLS[w.sp].lvl + ' ' + B.SPELLS[w.sp].name, w.x + 2, w.y + 2, '#8ab8ff');
        else if (w.kind === 'mslot') { px.rect(g, w.x, w.y, w.w, w.h, '#14100c'); B.text(g, 'L' + w.l + ' ' + (w.ent ? B.SPELLS[w.ent.s].name + (w.ent.ready ? '' : ' (after rest)') : '— empty —'), w.x + 3, w.y + 2, w.ent ? (w.ent.ready ? B.COL.text : '#a89878') : '#5a5040'); }
        if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
      }
      if (m) { B.text(g, 'Known', 14, 48, B.COL.dim, { font: 'tiny' }); B.text(g, 'Slots', 160, 48, B.COL.dim, { font: 'tiny' }); const fw = ws.find(w => w.id === s.focus); if (fw && (fw.kind === 'known' || (fw.kind === 'mslot' && fw.ent))) { const sp = B.SPELLS[fw.sp || fw.ent.s]; let y = 58; for (const l of B.wrap(sp.desc, W - 310)) { B.text(g, l, 290, y, B.COL.text); y += 10; } } }
      B.prompts(g, game, [['confirm', 'Choose'], ['alt2', 'Same as before'], ['cancel', 'Back']], W - 14, H - 80, 'right');
    } else if (s.sub === 'scribe') {
      if (!ws.length) B.text(g, 'No scrolls to scribe.', 14, 40, B.COL.dim);
      for (const w of ws) { B.drawIcon(g, w.f.it, w.x, w.y); B.text(g, B.itemName(w.f.it) + '  (' + w.f.m.name + ')', w.x + 16, w.y + 2, B.COL.text); if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t); }
      B.prompts(g, game, [['confirm', 'Scribe'], ['cancel', 'Back']], W - 14, H - 80, 'right');
    } else if (s.sub === 'formation') {
      for (const w of ws) {
        const mi = P.formation[w.k], m = P.members[mi]; B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1, border: s.swapA === w.k ? '#4ae070' : B.COL.border });
        if (m) { B.memberRig(m).drawPortrait(g, w.x + 3, w.y + 3, 26, { zoom: 2.4, bg: '#2a2218' }); B.text(g, B.cut(m.name, w.w - 34), w.x + 32, w.y + 6, B.COL.text); B.text(g, ['Front', 'Front', 'Middle', 'Middle', 'Back', 'Back'][w.k], w.x + 32, w.y + 18, B.COL.dim, { font: 'tiny' }); }
        else B.text(g, 'empty', w.x + w.w / 2, w.y + 18, '#5a5040', { align: 'center' });
        if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
      }
      B.text(g, 'The front row strikes; the middle needs reach; the back throws, shoots and casts.', W / 2, 192, B.COL.dim, { align: 'center', font: 'tiny' });
      B.prompts(g, game, [['confirm', s.swapA === undefined ? 'Pick' : 'Swap'], ['cancel', 'Back']], W - 14, H - 80, 'right');
    } else if (s.sub === 'eat') {
      let y = 40; for (const l of s.lines || []) { B.text(g, l, 14, y, B.COL.text); y += 11; }
      for (const w of ws) { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1 }); B.text(g, 'OK', w.x + w.w / 2, w.y + 4, B.COL.text, { align: 'center' }); if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t); }
    }
    if (!s.sub) B.prompts(g, game, [['confirm', 'Choose'], ['cancel', 'Leave']], W - 14, H - 80, 'right');
  },
  act(res, s, game) {
    const S = B.S, P = S.party, w = res.w;
    if (s.sub === 'rest') { if (res.act === 'back' || res.act === 'ok') { if (S.camp && S.camp.rest) B.Play.cmd({ c: 'camp', op: 'stopRest' }); else s.sub = null; } return; }
    if (res.act === 'back') { if (s.sub) { s.sub = null; s.swapA = undefined; return; } return B.Play.closeScreen(); }
    if (s.sub === 'memorize' || s.sub === 'pray') {
      if (!w) return;
      if (w.kind === 'who' && res.act === 'ok') { s.mi = w.mi; return; }
      if (res.act === 'alt2') { game.audio.sfx('uiConfirm'); return; }   // the slots already keep what was chosen before
      if (w.kind === 'known' && res.act === 'ok') { if (!B.Play.cmd({ c: 'memorize', m: s.mi, op: 'add', spell: w.sp })) game.audio.sfx('uiError'); else game.audio.sfx('uiConfirm'); }
      if (w.kind === 'mslot' && res.act === 'ok' && w.ent) B.Play.cmd({ c: 'memorize', m: s.mi, op: 'remove', i: w.idx });
      return;
    }
    if (s.sub === 'scribe') { if (w && res.act === 'ok') B.Play.cmd({ c: 'scribe', m: s.mi, i: w.i }); return; }
    if (s.sub === 'formation') { if (!w || res.act !== 'ok') return; if (s.swapA === undefined) s.swapA = w.k; else { B.Play.cmd({ c: 'formation', a: s.swapA, b: w.k }); s.swapA = undefined; } return; }
    if (s.sub === 'eat') { if (res.act === 'ok') s.sub = null; return; }
    if (!w || res.act !== 'ok' || w.skip) return;
    switch (w.id) {
      case 'rest': if (B.Play.cmd({ c: 'camp', op: 'rest' })) s.sub = 'rest'; break;
      case 'memorize': case 'pray': s.sub = w.id; s.mi = -1; s.focus = null; break;
      case 'scribe': s.sub = 'scribe'; s.mi = P.members.findIndex(m => m.cls === 'M' && m.state === 'ok'); break;
      case 'formation': s.sub = 'formation'; break;
      case 'eat': { const before = S.log.length; B.Play.cmd({ c: 'camp', op: 'eat' }); s.lines = S.log.slice(before).map(l => l.text); s.sub = 'eat'; break; }
      case 'save': if (B.game.saves && !B.game.saves.show('save')) B.Play.quickSave(); break;
      case 'load': if (B.game.saves) B.game.saves.show('load'); break;
      case 'settings': B.game.menu('settings'); break;
      case 'leave': B.Play.closeScreen(); break;
    }
  }
};
B.campIcon = (g, id, x, y, dim) => {
  const c = dim ? '#5a5040' : B.COL.focus, it = { rest: 'ration', memorize: 'book', pray: 'symbol', scribe: 'scroll', formation: 'shield', eat: 'ration', save: 'note', load: 'book', settings: 'gear', leave: 'key' }[id];
  if (it === 'gear') B.drawIcon(g, { id: 'tumblerGear' }, x - 6, y - 6); else if (it) B.drawIcon(g, { id: { ration: id === 'rest' ? 'ironRation' : 'ration', book: 'spellbook', symbol: 'holySymbol', scroll: 'scroll_sparkDart', shield: 'woodenShield', note: 'tornPage', key: 'ironKey' }[it] }, x - 6, y - 6);
  if (id === 'rest') { px.rect(g, x - 8, y + 5, 16, 2, c); }
};
/* ---- MAP: the explored cells of a floor on parchment ---- */
B.SCREENS.map = {
  menuTime: true,
  layout(W, H, s) { return [{ id: 'map', x: 0, y: 0, w: W, h: H, skip: false }]; },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, S = B.S, fid = s.fid || S.floor, F = B.FLOORS[fid], FS = S.floors[fid], mw = F.map[0].length, mh = F.map.length;
    g.save(); g.globalAlpha = .6; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    const cs = Math.max(6, Math.min(10, Math.floor(Math.min((W - 30) / mw, (H - 70) / mh)))), mapW = mw * cs, mapH = mh * cs;
    const x0 = Math.round((W - mapW) / 2) + (s.panX || 0), y0 = 30 + (s.panY || 0);
    B.panel(g, x0 - 8, y0 - 22, mapW + 16, mapH + 44, { bg: ['#d8c8a0', '#b8a478'], border: '#6a4a1a' });
    B.text(g, F.name.toUpperCase(), x0 + mapW / 2, y0 - 16, '#3a2a14', { align: 'center', shadow: false });
    const reveal = B.CHEATS.reveal, seen = (x, y) => reveal || FS.seen[key(x, y)];
    const near = (x, y) => [0, 1, 2, 3].some(d => seen(x + DX[d], y + DY[d]) && F.map[y + DY[d]] && F.map[y + DY[d]][x + DX[d]] !== '#');
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const c = F.map[y][x], X = x0 + x * cs, Y = y0 + y * cs;
      if (c === '#' || (c === 'H' && !(FS.secrets && Object.values(FS.secrets).some(sc => sc.open > .9) && B.R.F[fid] && B.R.F[fid].secretAt[key(x, y)] && FS.secrets[B.R.F[fid].secretAt[key(x, y)]].open > .9))) { if (near(x, y)) px.rect(g, X, Y, cs, cs, '#5a4428'); continue; }
      if (!seen(x, y)) continue;
      px.rect(g, X, Y, cs, cs, '#e8dcb8'); px.rect(g, X, Y, cs, 1, '#d0c098'); px.rect(g, X, Y, 1, cs, '#d0c098');
      const d = B.R.F[fid] && B.R.F[fid].doorAt[key(x, y)];
      if (d) { const st = FS.doors[d]; px.rect(g, X + 1, Y + cs / 2 - 1, cs - 2, 2, st.open > .5 ? '#a08050' : st.locked ? '#c83a2a' : '#6a4a1a'); }
      if (c === '<' || c === '>') { B.text(g, c === '<' ? '^' : 'v', X + cs / 2, Y + 1, '#2a6a3a', { align: 'center', shadow: false, font: 'tiny' }); }
      if (c === 'P' && (FS.plates && Object.values(FS.plates).some(p => p.done))) px.rect(g, X + 2, Y + 2, cs - 4, cs - 4, '#a89060');
      if (c === 'O' || (c === 'o' && FS.pits && Object.values(FS.pits).some(p => p.open))) { const pit = B.pitIn(fid, x, y); if (pit && (pit.p.open || reveal)) px.rect(g, X + 2, Y + 2, cs - 4, cs - 4, pit.p.bridged ? '#8a7a5a' : '#1a1410'); }
      if (c === '^' && FS.loops && Object.keys(FS.loops).length) px.rect(g, X + 3, Y + 3, cs - 6, cs - 6, '#6a8ac8');
    }
    for (const [fid2, kind, x, y, face] of (F.features || []).map(f => [fid, f[1], f[2], f[3], f[4]])) {
      if (!seen(x, y)) continue; const d = FACE[face], X = x0 + x * cs + cs / 2 + DX[d] * (cs / 2 - 1), Y = y0 + y * cs + cs / 2 + DY[d] * (cs / 2 - 1);
      const col = { inscription: '#3a2a8a', alcove: '#8a5a1a', lever: '#2a6a2a', button: '#2a6a2a', catch: '#2a6a2a', candle: '#3a2a8a', greatLock: '#2a8aa8', gearNiche: '#8a6a1a', clockFace: '#8a6a1a' }[kind];
      if (col) px.rect(g, Math.round(X - 1), Math.round(Y - 1), 2, 2, col);
    }
    if (fid === S.floor) {
      const P = S.party, X = x0 + P.cx * cs + cs / 2, Y = y0 + P.cy * cs + cs / 2;
      px.disc(g, X, Y, Math.max(2, cs / 3), '#c8201a'); px.line(g, X, Y, X + DX[P.dir] * cs * .6, Y + DY[P.dir] * cs * .6, '#c8201a');
      const tracker = P.members.some(m => m.cls === 'R' && m.state === 'ok');
      for (const m of FS.mons) if (m.hp > 0 && (reveal || (tracker && B.manh(m.cx, m.cy, P.cx, P.cy) <= 4))) px.rect(g, x0 + m.cx * cs + cs / 2 - 1, y0 + m.cy * cs + cs / 2 - 1, 3, 3, '#e04a2a');
    }
    if (B.DevMode && B.DevMode.flags.wires && fid === S.floor) for (const w of F.wires || []) { const src = (w.when.lever && B.R.F[fid].featById[w.when.lever]) || (w.when.plate && F.plates[w.when.plate]); const dst = w.do.find(a => a[0] === 'open' || a[0] === 'toggle'); if (src && dst && F.doors[dst[1]]) { const a = src.at || [src.x, src.y], b = F.doors[dst[1]].at; px.line(g, x0 + a[0] * cs + cs / 2, y0 + a[1] * cs + cs / 2, x0 + b[0] * cs + cs / 2, y0 + b[1] * cs + cs / 2, '#e04ae0'); } }
    B.text(g, B.cut('Red bar: locked door  Green: lever  Blue: words  Red dot: you', mapW + 8), x0 + mapW / 2, y0 + mapH + 6, '#5a4428', { align: 'center', font: 'tiny', shadow: false });
    B.prompts(g, game, [['tabR', 'Floor'], ['alt2', 'Journal'], ['cancel', 'Back']], W - 10, H - 16, 'right');
  },
  act(res, s, game) {
    const fl = Object.keys(B.S.floors).filter(f => B.S.floors[f].visited || f === B.S.floor);
    if (res.act === 'back') return B.Play.closeScreen();
    if (res.act === 'tabR' || res.act === 'tabL') { const i = fl.indexOf(s.fid || B.S.floor); s.fid = fl[(i + (res.act === 'tabR' ? 1 : fl.length - 1)) % fl.length]; s.panX = s.panY = 0; }
    if (res.act === 'alt2') B.Play.openScreen('journal', {});
  },
  edge(s, d) { s.panX = (s.panX || 0) - DX[d] * 20; s.panY = (s.panY || 0) - DY[d] * 20; }
};
/* ---- JOURNAL: quests, notes, deeds, log ---- */
B.SCREENS.journal = {
  menuTime: true,
  layout(W, H, s) {
    const ws = ['Quests', 'Notes', 'Deeds', 'Log'].map((t, i) => ({ id: 'tab' + i, kind: 'tab', i, label: t, x: 14 + i * 56, y: 24, w: 52, h: 14 }));
    if (s.tab === 1) B.S.notes.forEach((n, i) => { if (i < 12) ws.push({ id: 'n' + i, kind: 'note', note: n, x: 14, y: 46 + i * 13, w: W - 28, h: 12 }); });
    return ws;
  },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, S = B.S, t = B.UI.t; scrPanel(g, W, H, 'JOURNAL', s);
    for (const w of ws) {
      if (w.kind === 'tab') { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1, border: w.i === s.tab ? B.COL.focus : '#6a5a3a' }); B.text(g, w.label, w.x + w.w / 2, w.y + 4, w.i === s.tab ? B.COL.focus : B.COL.dim, { align: 'center' }); }
      else B.text(g, B.cut(B.noteTitle(w.note), w.w - 4), w.x + 2, w.y + 2, '#e8d8a8');
      if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, t);
    }
    let y = 46; const L = (txt, c = B.COL.text) => { for (const l of B.wrap(txt, W - 32)) { if (y > H - 34) return; B.text(g, l, 16, y, c); y += 10; } y += 3; };
    if (s.tab === 0) for (const [k, v] of Object.entries(S.quests)) L('• ' + v, k === 'main' ? B.COL.focus : B.COL.text);
    if (s.tab === 1 && !S.notes.length) L('Nothing read yet.', B.COL.dim);
    if (s.tab === 2) { const n = Object.keys(S.special).length; L('Hidden deeds done: ' + n + ' of 3', B.COL.focus); L('Secrets found: ' + S.stats.secrets + ' of 3'); if (S.special.sq1) L('The Rat Shrine received its crown.'); if (S.special.sq2) L('The Great Clock tells the hour again.'); if (S.special.sq3) L('Six candles burned white in the Lidless Chapel.'); }
    if (s.tab === 3) for (const l of S.log.slice(-16)) L(l.text, l.color || B.COL.text);
    B.prompts(g, game, [['confirm', s.tab === 1 ? 'Read' : 'Tab'], ['tabR', 'Next tab'], ['cancel', 'Back']], W - 14, H - 20, 'right');
  },
  act(res, s, game) {
    if (res.act === 'back') return B.Play.closeScreen();
    if (res.act === 'tabR' || res.act === 'tabL') { s.tab = (s.tab + (res.act === 'tabR' ? 1 : 3)) % 4; return; }
    const w = res.w; if (!w || res.act !== 'ok') return;
    if (w.kind === 'tab') s.tab = w.i; else if (w.kind === 'note') B.Play.openScreen('reader', { note: w.note, back: 'journal' });
  }
};
B.noteTitle = n => { if (n.startsWith('note:')) return B.NOTES[n.slice(5)].title; const [fid, id] = n.split(':'), f = B.FLOORS[fid] && (B.FLOORS[fid].features || []).find(x => x[0] === id); return f ? f[5].text.slice(0, 40) + (f[5].text.length > 40 ? '...' : '') : n; };
B.noteText = n => { if (n.startsWith('note:')) return B.NOTES[n.slice(5)].text; const [fid, id] = n.split(':'), f = (B.FLOORS[fid].features || []).find(x => x[0] === id); return f ? f[5].text : ''; };
/* ---- READER: a parchment page ---- */
B.SCREENS.reader = {
  menuTime: true,
  layout(W, H) { return [{ id: 'page', x: 0, y: 0, w: W, h: H }]; },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H, pw = Math.min(300, W - 30), x0 = Math.round((W - pw) / 2);
    g.save(); g.globalAlpha = .6; px.rect(g, 0, 0, W, H, '#05040a'); g.restore();
    B.panel(g, x0, 20, pw, H - 50, { bg: ['#e8dcb8', '#c8b488'], border: '#6a4a1a' });
    const title = B.noteTitle(s.note); B.text(g, title, W / 2, 30, '#3a2a14', { align: 'center', shadow: false });
    const lines = B.wrap(B.noteText(s.note), pw - 24), per = Math.floor((H - 100) / 11), page = s.page || 0;
    lines.slice(page * per, page * per + per).forEach((l, i) => B.text(g, l, x0 + 12, 48 + i * 11, '#2a1a0a', { shadow: false }));
    if (lines.length > per) B.text(g, (page + 1) + ' / ' + Math.ceil(lines.length / per), W / 2, H - 44, '#5a4428', { align: 'center', shadow: false });
    B.prompts(g, game, [['cancel', 'Close']], W - 14, H - 20, 'right');
  },
  act(res, s) { if (res.act === 'back' || res.act === 'ok') return s.back ? B.Play.openScreen(s.back, {}) : B.Play.closeScreen(); },
  edge(s, d) { if (d === 1 || d === 2) s.page = (s.page || 0) + 1; if ((d === 3 || d === 0) && s.page) s.page--; }
};
/* ---- CONFIRM ---- */
B.SCREENS.confirm = {
  layout(W, H) { return [{ id: 'yes', x: W / 2 - 64, y: H / 2 + 6, w: 60, h: 16 }, { id: 'no', x: W / 2 + 4, y: H / 2 + 6, w: 60, h: 16 }]; },
  draw(g, r, game, ws, s) {
    const W = r.W, H = r.H; B.panel(g, W / 2 - 110, H / 2 - 34, 220, 64);
    B.wrap(s.text, 200).forEach((l, i) => B.text(g, l, W / 2, H / 2 - 26 + i * 10, B.COL.text, { align: 'center' }));
    for (const w of ws) { B.panel(g, w.x, w.y, w.w, w.h, { rivets: false, alpha: 1 }); B.text(g, w.id === 'yes' ? 'Yes' : 'No', w.x + w.w / 2, w.y + 5, B.COL.text, { align: 'center' }); if (w.id === s.focus) B.focusFrame(g, w.x, w.y, w.w, w.h, B.UI.t); }
  },
  act(res, s) { if (res.act === 'back' || (res.act === 'ok' && res.w && res.w.id === 'no')) return s.back ? B.Play.openScreen(s.back, { m: s.bm || 0 }) : B.Play.closeScreen(); if (res.act === 'ok' && res.w && res.w.id === 'yes') s.yes(); }
};
