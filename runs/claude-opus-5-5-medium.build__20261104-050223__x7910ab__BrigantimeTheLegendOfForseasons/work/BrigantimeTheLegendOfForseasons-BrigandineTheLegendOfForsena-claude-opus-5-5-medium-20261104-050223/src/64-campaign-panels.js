/* ---- MUSTER AND MARCH PANELS: castle actions, Organize, Summon, Move, Quest, Equip, Promote, the Realm book, the
 * command menu and March declarations. Each: { id, update(dt) -> 'close' | null, draw(r) } ---- */
const PANEL_W = 300;
const apply = cmd => { const r = G.run.sim.apply(cmd); if (!r.ok) { G.sfx('ui_error'); G.ui.toast(r.why, 1.6); } return r; };
const frame = (r, title, w = PANEL_W, h = 170, o = {}) => { const x = Math.round(r.W / 2 - w / 2), y = Math.round(Math.max(36, r.H / 2 - h / 2 - 6)); r.overlay(g => G.ui.panel(g, x, y, w, h, title, o)); return [x, y]; };
const kvCache = {};
const knightVis = id => kvCache[id] || (kvCache[id] = G.art.visual({ kind: 'knight', id }));
const monVis = (sp, tier) => kvCache[sp + tier] || (kvCache[sp + tier] = G.art.visual({ kind: 'monster', sp, tier }));
G.warmPortraits = () => { for (const r of G.PLAYABLE) knightVis(G.get('realm', r).ruler); };
const bars = (g, x, y, st, max = 120) => { [['HP', st.hp, '#5ad86a', 300], ['ATK', st.atk, '#ff8a5a', max], ['DEF', st.def, '#8ab0ff', max], ['INT', st.int, '#c08aff', max], ['AGI', st.agi, '#ffe070', max]].forEach(([n, v, c, m], i) => G.ui.statBar(g, x, y + i * 10, n, v, m, c)); };
// the castle's actions (own castle, Muster)
CP.castle = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], c = G.get('castle', cid);
  const items = () => { const ks = cs.knights.filter(k => sim.kn(k).realm === realm), hasRes = cs.reserve.length > 0;
    return [{ label: 'Organize', id: 'organize', disabled: !ks.length, why: 'No knights here' }, { label: 'Summon', id: 'summon', disabled: cs.stilled, why: 'Stilled', right: (3 - cs.summons) + ' left' }, { label: 'Move', id: 'move', disabled: !ks.some(k => sim.canAct(k) && !sim.kn(k).moved), why: 'No knight can move' },
      { label: 'Quest', id: 'quest', disabled: !ks.some(k => sim.canAct(k) && !sim.kn(k).ruler && !sim.kn(k).moved), why: 'No knight can quest' }, { label: 'Equip & items', id: 'equip', disabled: !ks.length, why: 'No knights here' }, { label: 'Promote', id: 'promote', disabled: !(ks.length || hasRes), why: 'Nobody here' }]; };
  const list = new G.ui.List(items());
  const o = { id: 'castle' };
  o.update = dt => { list.set(items()); const r = list.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { const id = list.cur.id; scene.panel = CP[id](realm, cid, scene); if (!G.run.sim.state.tipsSeen) G.run.sim.state.tipsSeen = {}; } return null; };
  o.draw = r => { const [x, y] = frame(r, c.name.toUpperCase(), 180, 120); r.overlay(g => { list.draw(g, x + 6, y + 20, 168); if (list.whyLine) G.ui.text(g, list.whyLine, x + 90, y + 108, '#ffb0a0', { align: 'center', font: 'tiny' }); }); G.ui.prompts(r, [['confirm', 'Open'], ['cancel', 'Back']]); };
  return o;
};
CP.castleInfo = cid => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], c = G.get('castle', cid), o = { id: 'castleInfo' };
  o.update = dt => { const I = G.game.input; if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { G.sfx('ui_cancel'); return 'close'; } return null; };
  o.draw = r => { const [x, y] = frame(r, c.name.toUpperCase() + ' • ' + G.get('realm', cs.owner).short, 280, 40 + Math.min(6, cs.knights.length) * 12); r.overlay(g => { cs.knights.slice(0, 6).forEach((kid, i) => { const k = sim.kn(kid); G.ui.text(g, KN(kid).name.slice(0, 26), x + 10, y + 21 + i * 12, '#ffffff'); G.ui.text(g, 'Lv' + k.lvl + '  ' + k.troop.length + ' beasts  power ' + Math.round(sim.troopPower(kid)), x + 270, y + 21 + i * 12, '#c8c0d8', { align: 'right', font: 'tiny' }); }); if (!cs.knights.length) G.ui.text(g, 'No knights. The gates stand open.', x + 10, y + 22, '#e8c8a0'); }); G.ui.prompts(r, [['cancel', 'Back']]); };
  return o;
};
// Organize: knights | the selected troop | the reserve; ✕ binds or unbinds, □ the formation, L1/R1 the knight
CP.organize = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, cs = S.castles[cid], o = { id: 'organize' };
  const ks = () => cs.knights.filter(k => sim.kn(k).realm === realm && !sim.kn(k).quest);
  let col = 0; const kl = new G.ui.List([], { max: 6 }), tl = new G.ui.List([], { max: 6 }), rl = new G.ui.List([], { max: 6 });
  const refresh = () => { kl.set(ks().map(k => ({ label: KN(k).short, id: k, right: sim.bondUsed(k) + '/' + sim.bondMax(k) }))); const k = kl.cur && kl.cur.id; tl.set(k ? sim.kn(k).troop.map(u => ({ label: MN(sim.mon(u)), id: u, right: 'Lv' + sim.mon(u).lvl })) : []); rl.set(cs.reserve.map(u => ({ label: MN(sim.mon(u)), id: u, right: 'Lv' + sim.mon(u).lvl + ' mana ' + G.get('monster', sim.mon(u).sp).rank }))); if (!tl.items.length && col === 1) col = 0; if (!rl.items.length && col === 2) col = kl.items.length ? 0 : 0; };
  refresh();
  o.update = dt => {
    const I = G.game.input; refresh();
    if (I.pressed('prev') || I.pressed('next')) { kl.move(I.pressed('next') ? 1 : -1); refresh(); }
    if (I.pressed('command') && kl.cur) { const k = sim.kn(kl.cur.id), f = ['vanguard', 'shield', 'column']; apply({ t: 'formation', realm, knight: k.id, formation: f[(f.indexOf(k.formation) + 1) % 3] }); G.sfx('ui_move'); }
    const L = [kl, tl, rl][col], r = L.update(dt);
    if (r === 'left') { col = Math.max(0, col - 1); G.sfx('ui_move'); } else if (r === 'right') { col = Math.min(2, col + 1); if (col === 1 && !tl.items.length) col = 2; G.sfx('ui_move'); }
    else if (r === 'back') { if (col > 0) col = 0; else return 'close'; }
    else if (r === 'pick') {
      if (col === 0) col = rl.items.length ? 2 : 1;
      else if (col === 1 && tl.cur) { apply({ t: 'unbind', realm, knight: kl.cur.id, uid: tl.cur.id }); }
      else if (col === 2 && rl.cur && kl.cur) { const ok = apply({ t: 'bind', realm, knight: kl.cur.id, uid: rl.cur.id }); if (ok.ok) G.sfx('buff'); }
    }
    for (const [i, Lx] of [kl, tl, rl].entries()) if (Lx !== L && Lx.hit(I.clicked())) col = i;
    return null;
  };
  o.draw = r => {
    const [x, y] = frame(r, 'ORGANIZE • ' + G.get('castle', cid).name.toUpperCase(), 360, 170);
    r.overlay(g => {
      const heads = ['KNIGHTS', 'TROOP', 'RESERVE'];
      heads.forEach((h, i) => G.ui.text(g, h, x + 10 + i * 118, y + 20, i === col ? '#ffe070' : '#a8a0c0'));
      kl.draw(g, x + 6, y + 31, 112, { noFocus: col !== 0 }); tl.draw(g, x + 122, y + 31, 112, { noFocus: col !== 1 }); rl.draw(g, x + 238, y + 31, 116, { noFocus: col !== 2 });
      if (kl.cur) { const k = sim.kn(kl.cur.id); G.ui.text(g, 'Bond ' + sim.bondUsed(k.id) + '/' + sim.bondMax(k.id) + '  •  Formation: ' + G.cap(k.formation) + '  •  ' + k.troop.length + '/6', x + 10, y + 154, '#e8c8a0'); try { knightVis(k.id).portrait(g, x + 326, y + 130, 28); } catch (e) { /* no portrait */ } }
      const cur = [kl, tl, rl][col].cur; if (col > 0 && cur) { const m = sim.mon(cur.id), st = G.monsterStats(m.sp, m.tier, m.lvl); G.ui.text(g, G.get('monster', m.sp).sizes[m.tier - 1] + ' ' + G.SEASON_NAME[G.get('monster', m.sp).elem] + '  HP ' + m.hp + '/' + st.hp + '  ATK ' + st.atk, x + 10, y + 142, '#c8c0d8', { font: 'tiny' }); }
    });
    G.ui.prompts(r, [['confirm', col === 1 ? 'Unbind' : col === 2 ? 'Bind' : 'Choose'], ['command', 'Formation'], ['next', 'Knight'], ['cancel', 'Back']]);
  };
  return o;
};
// Summon: the circle's species with costs, a live rig on the circle, a card of bars
CP.summon = (realm, cid, scene) => {
  const sim = G.run.sim, o = { id: 'summon' }, list = new G.ui.List([], { max: 6 }); let fx = 0, lastSp = null, vis = null;
  const refresh = () => list.set(sim.summonable(cid).map(s => ({ label: G.get('monster', s.sp).names[0], id: s.sp, cost: s.cost, right: 'mana ' + s.cost, disabled: !s.ok, why: s.why })));
  refresh();
  o.update = dt => { refresh(); fx = Math.max(0, fx - dt); if (vis) vis.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .6 + Math.sin(G.game.real) * .3 }); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const res = apply({ t: 'summon', realm, castle: cid, sp: list.cur.id }); if (res.ok) { fx = 1.2; G.sting('summon'); G.sfx('summon_rise'); G.cry(list.cur.id); G.ui.toast(G.get('monster', list.cur.id).names[0] + ' answers the circle. It waits in the reserve.', 2.5); } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'SUMMON • ' + G.get('castle', cid).name.toUpperCase(), 340, 170), sp = list.cur && list.cur.id;
    if (sp !== lastSp) { lastSp = sp; vis = sp ? G.art.visual({ kind: 'monster', sp, tier: 1 }) : null; }
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 120);
      const cx = x + 180, cy = y + 120, t = G.game.real;
      for (let i = 0; i < 24; i++) { const a = t * .8 + i / 24 * Math.PI * 2; px.dot(g, cx + Math.cos(a) * 30, cy + Math.sin(a) * 10, i % 2 ? '#d8c070' : '#7ac8ff'); }
      if (fx > 0) px.blend(g, fx * .6, 'add', () => px.rect(g, cx - 10, cy - 70, 20, 70, '#fff0b0'));
      if (vis) vis.draw(g, cx, cy, E.charView(E.VIEWS.brawler));
      if (sp) { const m = G.get('monster', sp), st = G.monsterStats(sp, 1, 5); G.ui.text(g, m.names.join(' > '), x + 220, y + 22, '#ffe8a8', { font: 'tiny' }); G.art.seasonIcon(g, m.elem, x + 226, y + 38, 3); G.ui.text(g, G.SEASON_NAME[m.elem] + ' • size ' + m.sizes[0] + ' • rank ' + m.rank, x + 234, y + 34, '#c8c0d8', { font: 'tiny' }); bars(g, x + 222, y + 48, st, 40); G.ui.text(g, 'Upkeep ' + m.upkeep + ' a season', x + 222, y + 102, '#a8d8ff', { font: 'tiny' }); G.ui.text(g, 'Skills: ' + m.skills.flat().map(s => G.get('skill', s).name).slice(0, 3).join(', '), x + 222, y + 112, '#c8c0d8', { font: 'tiny' }); }
      G.ui.text(g, 'Mana ' + G.run.sim.state.realms[realm].mana, x + 10, y + 154, '#a8d8ff');
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 170, y + 154, '#ffb0a0', { align: 'center' });
    });
    G.ui.prompts(r, [['confirm', list.cur && !list.cur.disabled ? 'Summon (-' + list.cur.cost + ' mana)' : 'Summon'], ['cancel', 'Back']]);
  };
  return o;
};
// Move: pick a knight, then an adjacent castle of yours
CP.move = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'move' }; let step = 0, kid = null;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => ({ label: KN(k).short, id: k, right: 'Lv' + sim.kn(k).lvl, disabled: !sim.canAct(k) || sim.kn(k).moved, why: sim.kn(k).wounded ? 'Wounded' : sim.kn(k).moved ? 'Moved already' : 'Cannot move' })));
  const dl = new G.ui.List((G.adj[cid] || []).filter(n => sim.owner(n) === realm).map(n => ({ label: G.get('castle', n).name, id: n, disabled: S.castles[n].stilled || S.castles[n].knights.length >= 6, why: S.castles[n].stilled ? 'Stilled' : 'Full' })));
  o.update = dt => { if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { if (!dl.items.length) { G.ui.toast('No castle of yours beside this one.', 2); return null; } kid = kl.cur.id; step = 1; } }
    else { const r = dl.update(dt); if (dl.cur) scene.focus = dl.cur.id; if (r === 'back') { step = 0; scene.focus = cid; } if (r === 'pick') { const res = apply({ t: 'move', realm, knight: kid, to: dl.cur.id }); if (res.ok) { G.sfx('march_drums'); G.ui.toast(KN(kid).short + ' rides to ' + dl.cur.label + '.', 2); scene.focus = dl.cur.id; return 'close'; } } }
    return null; };
  o.draw = r => { const [x, y] = frame(r, step === 0 ? 'MOVE • WHO RIDES?' : 'MOVE ' + KN(kid).short.toUpperCase() + ' TO', 200, 120); r.overlay(g => { (step === 0 ? kl : dl).draw(g, x + 6, y + 20, 188); }); G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// Quest: pick a knight, then a site card with the odds
CP.quest = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'quest' }; let step = 0, kid = null, sl = null;
  const away = sim.knightsOf(realm).filter(k => k.quest).length;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => { const K = sim.kn(k); return { label: KN(k).short, id: k, right: G.get('class', K.cls).name, disabled: K.ruler || !sim.canAct(k) || K.moved || away >= 2, why: K.ruler ? 'Rulers stay home' : away >= 2 ? 'Two knights are away already' : K.moved ? 'Moved this Muster' : 'Cannot quest' }; }));
  o.update = dt => { if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { kid = kl.cur.id; sl = new G.ui.List(sim.questSites(kid).map(s => ({ label: G.get('site', s).name, id: s, right: G.get('site', s).away + ' season' + (G.get('site', s).away > 1 ? 's' : '') }))); step = 1; } }
    else { const r = sl.update(dt); if (r === 'back') step = 0; if (r === 'pick') { const res = apply({ t: 'quest', realm, knight: kid, site: sl.cur.id }); if (res.ok) { G.sfx('ui_confirm'); G.ui.toast(KN(kid).short + ' sets out for ' + sl.cur.label + '.', 2.5); return 'close'; } } }
    return null; };
  o.draw = r => { const [x, y] = frame(r, step === 0 ? 'QUEST • WHO GOES?' : 'QUEST • WHERE?', 320, 150);
    r.overlay(g => { if (step === 0) { kl.draw(g, x + 6, y + 20, 200); G.ui.wrapText(g, 'A questing knight leaves with the troop for a season or two. What they find is told on return.', x + 210, y + 22, 100, '#c8c0d8', 9); return; }
      sl.draw(g, x + 6, y + 20, 170); const s = sl.cur && sl.cur.id; if (!s) return; const w = sim.questOdds(kid, s), tot = Object.values(w).reduce((a, b) => a + b, 0);
      Object.entries(w).forEach(([k2, v], i) => { G.ui.text(g, G.cap(k2), x + 186, y + 22 + i * 11, '#e8e0f0', { font: 'tiny' }); G.ui.bar(g, x + 230, y + 24 + i * 11, 70, v, tot, k2 === 'mishap' ? '#ff6a5a' : '#ffd060'); });
      G.ui.text(g, 'Focus: ' + G.cap(G.get('site', s).focus), x + 186, y + 92, '#a8d8ff', { font: 'tiny' }); G.ui.text(g, 'Risk: ' + (w.mishap / tot > .12 ? 'high' : w.mishap / tot > .07 ? 'some' : 'low'), x + 186, y + 102, '#ffb0a0', { font: 'tiny' }); });
    G.ui.prompts(r, [['confirm', step ? 'Send' : 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// Equip: a knight, its 3 slots, the realm's stores (with stat changes ▲ ▼), consumables usable here
CP.equip = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, R = S.realms[realm], o = { id: 'equip' }; let step = 0, kid = null, slot = null;
  const kl = new G.ui.List(S.castles[cid].knights.filter(k => sim.kn(k).realm === realm).map(k => ({ label: KN(k).short, id: k, right: G.get('class', sim.kn(k).cls).name })));
  let sl = null, il = null;
  const slots = () => ['weapon', 'armor', 'accessory'].map(s => ({ label: G.cap(s) + ': ' + (sim.kn(kid).equip[s] ? G.get('item', sim.kn(kid).equip[s]).name : '-'), id: s })).concat([{ label: 'Use an item', id: 'use' }]);
  const items = () => { const seen = {}, out = []; for (const id of R.items) { const it = G.get('item', id); if (slot === 'use' ? it.slot !== 'consumable' : (it.slot !== slot || !G.canEquip(id, sim.kn(kid).cls))) continue; if (seen[id]) { seen[id].n++; seen[id].right = '×' + seen[id].n; continue; } seen[id] = { label: it.name, id, n: 1, right: '×1', desc: it.desc }; out.push(seen[id]); } if (slot !== 'use' && sim.kn(kid).equip[slot]) out.unshift({ label: 'Remove', id: '_remove' }); return out; };
  o.update = dt => {
    if (step === 0) { const r = kl.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { kid = kl.cur.id; sl = new G.ui.List(slots()); step = 1; } }
    else if (step === 1) { sl.set(slots()); const r = sl.update(dt); if (r === 'back') step = 0; if (r === 'pick') { slot = sl.cur.id; il = new G.ui.List(items(), { max: 6 }); if (!il.items.length) G.ui.toast(slot === 'use' ? 'No items to use.' : 'Nothing in the stores fits.', 1.6); else step = 2; } }
    else { il.set(items()); const r = il.update(dt); if (r === 'back' || !il.items.length) step = 1;
      if (r === 'pick') { const id = il.cur.id; if (id === '_remove') apply({ t: 'unequip', realm, knight: kid, slot }); else if (slot === 'use') { if (apply({ t: 'use', realm, item: id, knight: kid }).ok) G.sfx('heal'); } else if (apply({ t: 'equip', realm, knight: kid, item: id }).ok) G.sfx('buff'); step = 1; } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'EQUIP' + (kid ? ' • ' + KN(kid).short.toUpperCase() : ''), 330, 170);
    r.overlay(g => {
      if (step === 0) { kl.draw(g, x + 6, y + 20, 200); if (kl.cur) try { knightVis(kl.cur.id).portrait(g, x + 240, y + 30, 64); } catch (e) { /* no portrait */ } return; }
      const k = sim.kn(kid), kv = G.knightView(k); try { knightVis(kid).portrait(g, x + 250, y + 20, 64); } catch (e) { /* no portrait */ }
      bars(g, x + 214, y + 92, Object.assign({}, kv.st), 80);
      if (step === 1) sl.draw(g, x + 6, y + 20, 200);
      else { il.draw(g, x + 6, y + 20, 200); const cur = il.cur; if (cur && cur.id !== '_remove') { const it = G.get('item', cur.id); G.ui.wrapText(g, it.desc, x + 10, y + 132, 190, '#e8e0f0', 9); if (slot !== 'use') { const old = k.equip[slot] ? G.get('item', k.equip[slot]).mods : {}; let tx = x + 10; for (const s of ['atk', 'def', 'int', 'agi', 'mov', 'bond', 'ward', 'mp']) { const d = (it.mods[s] || 0) - (old[s] || 0); if (!d) continue; const t = s.toUpperCase() + (d > 0 ? ' +' + d : ' -' + (-d)); G.ui.text(g, t, tx, y + 152, d > 0 ? '#7ad860' : '#ff7a5a'); tx += E.font.width(t) + 8; } } } }
    });
    G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  };
  return o;
};
// Promote: monsters that may take their next form, knights that may change class; before -> after
CP.promote = (realm, cid, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'promote' }; let flash = 0;
  const entries = () => { const out = []; for (const k of S.castles[cid].knights) { const K = sim.kn(k); if (K.realm !== realm) continue; const p = sim.canClassChange(K); out.push({ label: KN(k).short + ': ' + G.get('class', K.cls).name + (p.to ? ' > ' + G.get('class', p.to).name : ''), id: 'k:' + k, disabled: !p.ok, why: p.why }); for (const u of K.troop) { const m = sim.mon(u), q = sim.canPromote(m); out.push({ label: MN(m) + (m.tier < 3 ? ' > ' + G.get('monster', m.sp).names[m.tier] : ''), id: 'm:' + u, right: 'Lv' + m.lvl, disabled: !q.ok, why: q.why }); } } for (const u of S.castles[cid].reserve) { const m = sim.mon(u), q = sim.canPromote(m); out.push({ label: MN(m) + (m.tier < 3 ? ' > ' + G.get('monster', m.sp).names[m.tier] : ''), id: 'm:' + u, right: 'Lv' + m.lvl, disabled: !q.ok, why: q.why }); } return out; };
  const list = new G.ui.List(entries(), { max: 7 }); let a = null, b = null, last = null;
  o.update = dt => { list.set(entries()); flash = Math.max(0, flash - dt); if (a) a.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .7 }); if (b) b.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI * .7 }); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const [t, id] = list.cur.id.split(':'); const res = t === 'k' ? apply({ t: 'classChange', realm, knight: id }) : apply({ t: 'promote', realm, uid: id }); if (res.ok) { flash = 1; last = null; G.sting('promote'); G.game.flash('#ffffff', .2, .5); G.ui.toast(t === 'k' ? KN(id).short + ' takes a new class!' : 'A new form!', 2); } }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, 'PROMOTE', 340, 170), cur = list.cur;
    if (cur && cur.id !== last) { last = cur.id; const [t, id] = cur.id.split(':'); if (t === 'm') { const m = sim.mon(id); a = G.art.visual({ kind: 'monster', sp: m.sp, tier: m.tier }); b = m.tier < 3 ? G.art.visual({ kind: 'monster', sp: m.sp, tier: m.tier + 1 }) : null; } else { a = knightVis(id); b = null; } }
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 200);
      const v = E.charView(E.VIEWS.brawler); if (a) a.draw(g, x + 240, y + 100, v); if (b) { G.ui.text(g, '>', x + 270, y + 80, '#ffe070'); b.draw(g, x + 305, y + 100, v); }
      if (cur && cur.id.startsWith('m:')) { const m = sim.mon(cur.id.slice(2)), s1 = G.monsterStats(m.sp, m.tier, m.lvl), s2 = m.tier < 3 ? G.monsterStats(m.sp, m.tier + 1, m.lvl) : s1; G.ui.text(g, 'HP ' + s1.hp + (s2 !== s1 ? ' > ' + s2.hp : '') + '  ATK ' + s1.atk + (s2 !== s1 ? ' > ' + s2.atk : ''), x + 214, y + 112, '#e8e0f0', { font: 'tiny' }); }
      if (flash > 0) px.blend(g, flash * .5, 'add', () => px.rect(g, x, y, 340, 170, '#ffffff'));
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 110, y + 156, '#ffb0a0', { align: 'center', font: 'tiny' });
    });
    G.ui.prompts(r, [['confirm', 'Promote'], ['cancel', 'Back']]);
  };
  return o;
};
// the command menu (□): the Realm book, saving, ending the phase
CP.commands = (realm, phase, scene) => {
  const list = new G.ui.List([{ label: 'Realm', id: 'realm' }, { label: 'Chronicle', id: 'chron' }, { label: 'Objectives', id: 'obj' }, { label: phase === 'muster' ? 'End Muster' : 'End March', id: 'end' }].concat(phase === 'muster' && !G.hubActive ? [{ label: 'Save', id: 'save' }] : []));
  const o = { id: 'commands' };
  o.update = dt => { const r = list.update(dt); if (r === 'back') return 'close'; if (r === 'pick') { const id = list.cur.id; if (id === 'end') { scene.panel = null; scene.endPhase(realm, phase); } else if (id === 'save') { G.game.saves.canSave = true; G.game.saves.show('save'); scene.panel = null; } else scene.panel = CP.realm(realm, { realm: 0, chron: 3, obj: 4 }[id]); } return null; };
  o.draw = r => { const [x, y] = frame(r, 'COMMANDS', 160, 96); r.overlay(g => list.draw(g, x + 6, y + 20, 148)); G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]); };
  return o;
};
// the Realm book: tabs Knights, Monsters, Items, Chronicle, Objectives
CP.realm = (realm, tab = 0) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'realm' }, tabs = ['Knights', 'Monsters', 'Items', 'Chronicle', 'Objectives'];
  const build = () => {
    if (tab === 0) return sim.knightsOf(realm).map(k => ({ label: KN(k.id).short + ' • ' + G.get('class', k.cls).name, right: 'Lv' + k.lvl + (k.quest ? ' away' : k.wounded ? ' hurt' : ' ' + (k.castle ? G.get('castle', k.castle).name.slice(0, 10) : '')), id: k.id }));
    if (tab === 1) return sim.realmMonsters(realm).map(m => ({ label: MN(m), right: 'Lv' + m.lvl + ' HP' + m.hp }));
    if (tab === 2) { const c = {}; for (const i of S.realms[realm].items) c[i] = (c[i] || 0) + 1; return Object.entries(c).map(([i, n]) => ({ label: G.get('item', i).name, right: '×' + n, desc: G.get('item', i).desc })); }
    if (tab === 3) return S.chronicle.slice(-40).reverse().map(c => ({ label: G.SEASON_NAME[c.season].slice(0, 3) + ' Y' + c.year + ': ' + c.text.slice(0, 52) }));
    return [{ label: 'Defeat the Gray Knight in the Clockwork Sanctum.' }, { label: 'Take Meridian first: its Sanctum opens to its holder.' }, { label: S.candle === null ? 'The Hour-Candle is not yet lit.' : 'The Hour-Candle: ' + S.candle + ' season(s) left.' }, { label: 'Hold at least one castle.' }, { label: 'Difficulty: ' + G.cap(S.difficulty) }, { label: 'Castles held: ' + sim.castlesOf(realm).length + ' / 25' }];
  };
  const list = new G.ui.List(build(), { max: 9 });
  o.update = dt => { const I = G.game.input; if (I.pressed('prev') || I.pressed('next')) { tab = (tab + (I.pressed('next') ? 1 : -1) + tabs.length) % tabs.length; list.set(build()); list.i = 0; list.scroll = 0; G.sfx('ui_move'); } const r = list.update(dt); if (r === 'left') { tab = (tab + 4) % 5; list.set(build()); list.i = 0; } if (r === 'right') { tab = (tab + 1) % 5; list.set(build()); list.i = 0; } if (r === 'back') return 'close'; return null; };
  o.draw = r => { const [x, y] = frame(r, G.get('realm', realm).name.toUpperCase(), 380, 160); r.overlay(g => { tabs.forEach((t, i) => { const tx = x + 8 + i * 74; if (i === tab) px.rect(g, tx - 2, y + 17, 70, 11, '#3a3a7a'); G.ui.text(g, t, tx + 33, y + 19, i === tab ? '#ffe070' : '#a8a0c0', { align: 'center' }); }); list.draw(g, x + 6, y + 32, 368); const c = list.cur; if (c && c.desc) G.ui.text(g, c.desc, x + 190, y + 148, '#c8c0d8', { align: 'center', font: 'tiny' }); }); G.ui.prompts(r, [['next', 'Tab'], ['cancel', 'Back']]); };
  return o;
};
// March: choose up to 3 troops from castles beside the target, then Declare (or call a march off)
CP.march = (realm, target, scene) => {
  const sim = G.run.sim, S = sim.state, o = { id: 'march' }, picked = new Set();
  const sanctum = target === 'sanctum', tname = sanctum ? 'the Clockwork Sanctum' : G.get('castle', target).name;
  const existing = S.marches.find(m => m.realm === realm && m.target === target);
  if (!sanctum && !(G.adj[target] || []).some(n => sim.owner(n) === realm)) { const p = CP.castleInfo(target); G.ui.toast('None of your castles stands beside ' + tname + '.', 2); return p; }
  if (sanctum && !S.flags.sanctumOpen) { G.ui.toast('The Sanctum is sealed.', 2); return CP.castleInfo('meridian'); }
  const cands = () => { const out = []; for (const c of sanctum ? ['meridian', ...G.adj.meridian] : G.adj[target]) { if (sim.owner(c) !== realm) continue; for (const k of S.castles[c].knights) { const K = sim.kn(k); if (K.realm !== realm) continue; out.push({ label: (picked.has(k) ? '[X] ' : '[ ] ') + KN(k).short, id: k, right: Math.round(sim.troopPower(k)) + ' • ' + G.get('castle', c).name.slice(0, 9), disabled: !sim.canAct(k) || (K.marched && !picked.has(k)), why: K.wounded ? 'Wounded' : K.marched ? 'Marching elsewhere' : 'Cannot march' }); } } return out; };
  const list = new G.ui.List([]);
  const refresh = () => list.set(existing ? [{ label: 'Call off this march', id: '_cancel', color: '#ffb0a0' }] : cands().concat([{ label: 'Declare the march', id: '_go', disabled: !picked.size, why: 'Choose 1 to 3 troops' }]));
  refresh();
  o.update = dt => { refresh(); const r = list.update(dt); if (r === 'back') return 'close';
    if (r === 'pick') { const id = list.cur.id;
      if (id === '_cancel') { apply({ t: 'cancel', realm, target }); return 'close'; }
      if (id === '_go') { const res = apply({ t: 'declare', realm, target, knights: [...picked] }); if (res.ok) { G.sfx('march_drums'); G.ui.toast(G.get('realm', realm).short + ' will march on ' + tname + '.', 2); return 'close'; } return null; }
      if (picked.has(id)) picked.delete(id); else if (picked.size < 3) picked.add(id); else G.ui.toast('Three troops at most.', 1.4); }
    return null; };
  o.draw = r => {
    const [x, y] = frame(r, (existing ? 'MARCHING ON ' : 'MARCH ON ') + tname.toUpperCase(), 330, 160);
    r.overlay(g => {
      list.draw(g, x + 6, y + 20, 200);
      if (!sanctum) { const def = G.CampaignAI.defense(sim, target), pow = [...picked].reduce((a, k) => a + sim.troopPower(k), 0), c = G.get('castle', target); G.ui.text(g, G.get('realm', sim.owner(target)).short, x + 214, y + 22, G.realmColor(sim.owner(target))); G.ui.text(g, 'Defense ' + Math.round(def), x + 214, y + 34, '#ffc8a0'); G.ui.text(g, 'Yours ' + Math.round(pow), x + 214, y + 46, '#a8ffc0'); G.ui.bar(g, x + 214, y + 60, 100, pow, Math.max(pow, def) || 1, '#5ad86a'); G.ui.bar(g, x + 214, y + 68, 100, def, Math.max(pow, def) || 1, '#ff6a5a'); G.ui.text(g, G.get('map', c.map).name, x + 214, y + 80, '#c8c0d8', { font: 'tiny' }); G.ui.text(g, G.SEASON_NAME[sim.season()] + ' field', x + 214, y + 90, G.SEASON_COLOR[sim.season()], { font: 'tiny' }); }
      else G.ui.wrapText(g, 'The Gray Knight waits below the Great Clock. Light the four Season Dials to break his Timeless guard.', x + 214, y + 22, 106, '#e8d8a8', 9);
      if (list.whyLine) G.ui.text(g, list.whyLine, x + 110, y + 148, '#ffb0a0', { align: 'center', font: 'tiny' });
    });
    G.ui.prompts(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  };
  return o;
};
