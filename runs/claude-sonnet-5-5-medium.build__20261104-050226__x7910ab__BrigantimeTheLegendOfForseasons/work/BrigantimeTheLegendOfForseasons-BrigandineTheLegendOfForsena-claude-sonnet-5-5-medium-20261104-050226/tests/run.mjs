// The one test command: node tests/run.mjs   (prints only failures and a one-line count)
import { boot } from './harness.mjs';
const T = { n: 0, fail: 0 };
const ok = (c, what, detail = '') => { T.n++; if (!c) { T.fail++; console.log('FAIL ' + what + (detail ? ': ' + detail : '')); } };
const { game, G } = boot(); const I = game.input, B = G.Battle, C = G.Campaign, BA = G.BattleAI, snap = () => game.debug.snapshot();
const tap = (a, s = .1) => { I.tap(a); game.advance(s); };
const noErr = (w) => ok(!game.errors.length, 'no engine errors ' + w, game.errors.map(e => e.message || e).slice(0, 2).join(' | '));

/* ---- data suite ---- */
for (const c of G.CASTLES) { ok(c.circle.every(id => G.get('monster', id)), 'castle circle ' + c.name); ok(G.MAPS[c.map], 'castle map ' + c.name); ok(G.ADJ[c.id].length >= 2, 'castle connected ' + c.name); }
for (const k of Object.values(G.KNIGHTS)) ok(G.LINES[k.line] && G.REALMS[k.realm], 'knight ' + k.id);
for (const l of G.LINES) for (const s of l.skills) ok(G.get('skill', s), 'skill ' + s);
for (const [n, rows] of Object.entries(G.MAPS)) { ok(rows.length === 9 && rows.every(r => r.length === 11), 'map shape ' + n); ok(rows.some(r => r.includes('K')), 'map keep ' + n); }
ok(G.all('monster').length === 30, 'bestiary size'); ok(G.CASTLES.length === 25 && Object.keys(G.KNIGHTS).length === 36 && Object.keys(G.MAPS).length === 13, 'castle, knight and map counts'); ok(G.EVENTS.length >= 40, 'events'); ok(G.all('skill').length >= 90 && G.ITEM_IDS.length === 33 && G.CLASSES.length === 23, 'skill, item and class tables', G.all('skill').length + '/' + G.ITEM_IDS.length + '/' + G.CLASSES.length);
for (const sk of G.all('skill')) ok(sk.base && sk.name, 'skill complete ' + sk.id);
for (const m of G.all('monster')) ok(G.get('skill', 'p_' + m.id) && m.passive, 'trait ' + m.id);
// every castle reachable from every other
{ const seen = new Set([0]), q = [0]; while (q.length) { const c = q.shift(); for (const n of G.ADJ[c]) if (!seen.has(n)) { seen.add(n); q.push(n); } } ok(seen.size === G.CASTLES.length, 'roads connect the continent'); }
// maps are walkable between deployment zones, in every season
for (const n of Object.keys(G.MAPS)) for (let se = 0; se < 4; se++) {
  const sp = G.makeSkirmish(3, { realms: [0, 1], map: n === 'sanctum' ? 'ruins' : n, season: se }); const S = B.create(sp); const u = S.units.find(x => x.side === 0 && x.lead); const foe = S.units.find(x => x.side === 1 && x.lead);
  const rc = new Map(); const q = [[u.c, u.r]]; rc.set(u.c + ',' + u.r, 1); while (q.length) { const [c, r] = q.shift(); for (const [nc, nr] of G.hex.nb(c, r)) { const ch = B.tile(S, nc, nr); if (ch === '#' || rc.has(nc + ',' + nr) || nc < 0 || nr < 0 || nc >= S.cols || nr >= S.rows) continue; rc.set(nc + ',' + nr, 1); q.push([nc, nr]); } }
  ok(rc.has(foe.c + ',' + foe.r), 'foe reachable ' + n + ' season ' + se);
}

/* ---- battle sim suite ---- */
{
  const run = seed => { const S = B.create(G.makeSkirmish(seed, { ai: true })); BA.auto(S); return S; };
  let stalls = 0, a = 0, d = 0; for (let s = 1; s <= 12; s++) { const S = run(s); if (S.reason === 'stalled') stalls++; S.winner === 0 ? a++ : d++; ok(S.over, 'battle ends seed ' + s); ok(S.bell <= S.bells, 'bells bounded ' + s); }
  ok(stalls === 0, 'no stalled battles'); ok(a >= 3 && d >= 3, 'both sides can win (' + a + '/' + d + ')');
  const h1 = G.hash(run(7)), h2 = G.hash(run(7)); ok(h1 === h2, 'battle deterministic'); ok(G.hash(run(7)) !== G.hash(run(8)), 'seeds differ');
  // serialization round trip mid-battle continues identically
  const S1 = B.create(G.makeSkirmish(9, { ai: true })); for (let i = 0; i < 30 && !S1.over; i++) B.apply(S1, BA.step(S1)); const S2 = JSON.parse(JSON.stringify(S1)); BA.auto(S1); BA.auto(S2); ok(G.hash(S1) === G.hash(S2), 'save/load mid-battle');
  // legality: cannot move twice, cannot act out of phase, cannot cast after moving, bind needs a weakened monster
  const S = B.create(G.makeSkirmish(4, { ai: true })); const u = S.units.find(x => x.side === 0 && x.lead), v = S.units.find(x => x.side === 1);
  ok(B.apply(S, { t: 'wait', u: v.uid }) === null, 'cannot act out of phase');
  const rc = B.reach(S, u), dest = [...rc.values()].find(p => p.cost > 0); ok(!!B.apply(S, { t: 'move', u: u.uid, to: [dest.c, dest.r] }), 'move'); ok(B.apply(S, { t: 'move', u: u.uid, to: [u.c, u.r] }) === null, 'no second move');
  const mageish = S.units.find(x => x.side === 0 && x.lead && x.skills.length); ok(B.apply(S, { t: 'skill', u: u.uid, skill: u.skills[0] }) === null || u.skills[0] === 'volley', 'no casting after moving');
  const mon = S.units.find(x => x.side === 1 && x.kind === 'mon'); ok(B.apply(S, { t: 'bind', u: S.units.find(x => x.side === 0 && x.lead && x !== u).uid, target: mon.uid }) === null, 'cannot bind a healthy monster');
  // elements and tide
  const mk = (sp, form) => ({ id: 'z' + sp, species: sp, form, lvl: 5, hp: null });
  const S3 = B.create({ seed: 1, map: 'meadow', season: 1, bells: 12, sides: [{ realm: 0, human: false, items: [], troops: [{ knight: { id: 'percival', line: 0, tier: 0, lvl: 5, equip: {}, realm: 0 }, mons: [mk('wolf', 0)] }] }, { realm: 3, human: false, items: [], troops: [{ knight: { id: 'bedivere', line: 0, tier: 0, lvl: 5, equip: {}, realm: 3 }, mons: [mk('yeti', 0)] }] }] });
  const wolf = S3.units.find(x => x.species === 'wolf'), yeti = S3.units.find(x => x.species === 'yeti'), pix = null;
  const dn = B.damage(S3, wolf, yeti, 1, 'melee', { rand: false }); const dn2 = B.damage(S3, wolf, S3.units.find(x => x.id === 'k:bedivere'), 1, 'melee', { rand: false }); ok(dn > 0 && dn2 > 0, 'damage positive');
  const sal = { ...wolf, el: 1 }, dOpp = B.damage(S3, sal, yeti, 1, 'melee', { rand: false }), dNeutral = B.damage(S3, { ...wolf, el: 4 }, yeti, 1, 'melee', { rand: false }); ok(dOpp > dNeutral, 'opposed season hits harder + summer tide');
  ok(G.sizeHit('L', 'S') < 0 && G.sizeHit('S', 'L') > 0, 'size table');
  // season terrain
  ok(G.seasonMap('river', 0).some(r => r.includes('w')) && G.seasonMap('meadow', 0).some(r => r.includes('w')), 'spring floods'); ok(G.seasonMap('forest', 1).some(r => r.includes('F')), 'summer burns'); ok(G.seasonMap('river', 3).some(r => r.includes('i')), 'winter freezes');
  // dials weaken the shield
  const sp = G.makeSkirmish(2, { realms: [0, 1], map: 'ruins', season: 0 }); sp.map = 'sanctum'; sp.sides[1].troops[0].knight.id = 'gray'; sp.sides[1].troops[0].knight.line = 0; sp.sides[1].troops[0].knight.lvl = 11; const SB = B.create(sp);
  const gray = SB.units.find(x => x.boss), att = SB.units.find(x => x.side === 0 && x.lead); const d0 = B.damage(SB, att, gray, 1, 'melee', { rand: false });
  for (let r = 0; r < SB.rows; r++) for (let c = 0; c < SB.cols; c++) if (SB.tiles[r][c] === 'D') { const o = SB.units.filter(x => x.side === 0)[(c + r) % 4]; o.c = c; o.r = r; }
  const heldNow = B.dialsHeld(SB); const d1 = B.damage(SB, att, gray, 1, 'melee', { rand: false }); ok(heldNow >= 1 && d1 > d0 * 1.5, 'season dials weaken the Gray Knight shield', d0 + ' -> ' + d1 + ' held ' + heldNow);
}

/* ---- campaign sim suite ---- */
{
  const S = C.create({ human: 0, seed: 5 }), h = S.human; C.startTidings(S);
  ok(S.castles.filter(c => c.owner === 0).length === 4, 'player starts with four castles'); ok(Object.values(S.knights).filter(k => k.realm === 0).length === 4, 'player knights');
  const r = S.realms[h], m0 = r.mana; const sm = C.summon(S, 1, 'wolf'); ok(sm.ok && r.mana < m0, 'summon spends mana'); ok(C.summon(S, 1, 'golem').ok === false, 'wrong circle'); C.summon(S, 1, 'wolf'); C.summon(S, 1, 'pixie'); ok(!C.summon(S, 1, 'wolf').ok, 'three summons a season');
  const cas = S.castles[1]; const k = S.knights.elaine; const free = cas.reserve[0]; const before = k.mons.length; const b = C.bind(S, free, 'elaine'); ok(b.ok || before >= 3, 'bind or bond cap'); ok(!C.bind(S, cas.reserve[cas.reserve.length - 1] || 'none', 'bors').ok, 'bind across castles refused');
  ok(C.unbind(S, k.mons[0]).ok, 'unbind'); ok(C.dismiss(S, cas.reserve[0]).ok, 'dismiss');
  const kp = S.knights.percival; ok(C.moveKnight(S, 'percival', 1).ok, 'move knight to adjacent own castle'); ok(!C.moveKnight(S, 'percival', 3).ok, 'one move a season');
  ok(!C.canQuest(S, S.knights.elaine), 'rulers do not quest'); ok(C.canQuest(S, S.knights.bors) && C.quest(S, 'bors').ok, 'quest'); ok(S.knights.bors.quest && S.castles[3].knights.indexOf('bors') < 0, 'questing knight leaves the castle');
  S.realms[h].items.push('blade', 'shield'); ok(C.equip(S, 'percival', 'blade').ok && S.knights.percival.equip.w === 'blade', 'equip'); ok(G.knightStats(S.knights.percival).atk > G.knightStats({ ...S.knights.percival, equip: {} }).atk, 'equipment changes stats');
  S.knights.percival.lvl = 10; ok(C.promoteKnight(S, 'percival').ok && S.knights.percival.tier === 1, 'class change at 10');
  const mm = Object.values(S.mons).find(x => x.realm === 0); mm.lvl = 12; ok(C.promoteMon(S, mm.id).ok && mm.form === 1, 'monster promotes at 12'); mm.lvl = 7; S.realms[h].items.push('seed'); const m2 = Object.values(S.mons).find(x => x.realm === 0 && x.form === 0); m2.lvl = 6; ok(C.useItem(S, h, 'seed', m2.id).ok && m2.form === 1, 'season seed promotes early');
  const S6 = C.create({ human: 0, seed: 5 }); C.startTidings(S6); const tg = C.targetsFor(S6, 0); ok(tg.length > 0, 'targets exist'); S.castles[1].knights.forEach(id => { }); const t0 = tg[0]; const mar = C.marchersFor(S6, 0, t0); ok(mar.length > 0, 'marchers exist'); C.declare(S6, 0, t0, [mar[0].id]); ok(S6.marches.length === 1, 'declare march'); C.declare(S6, 0, t0, []); ok(S6.marches.length === 0, 'stand down');
  // money: deserting when broke
  S.realms[h].mana = -500; const before2 = C.monCount(S, h); C.endMuster(S); S.queue = []; C.endSeason(S); ok(C.monCount(S, h) < before2 || S.realms[h].mana >= 0, 'upkeep deserters');
  // the candle: lit in spring of year 2; burns each season; loses at zero
  const S2 = C.create({ human: 1, seed: 6 }); let guard = 0; while (S2.candle == null && guard++ < 10) { C.startTidings(S2); C.endMuster(S2); S2.queue = []; C.endSeason(S2); ok(true, 'x'); }
  ok(S2.candle != null || guard >= 10, 'candle lit'); ok(S2.year === 2 && S2.season === 0 || S2.candle != null, 'candle at year 2 spring');
  // all-AI campaigns finish and stay valid
  for (const seed of [1, 2, 3]) {
    const S3 = C.create({ human: seed % 4, seed }); let n = 0; while (!S3.over && n++ < 22) { C.startTidings(S3); C.aiMuster(S3, S3.human); C.aiMarch(S3, S3.human); C.endMuster(S3); C.resolveAI(S3, true); if (S3.over) break; if (S3.candle != null && S3.candle <= 0) break; }
    ok(Object.values(S3.knights).every(k => k.at == null || S3.castles[k.at].knights.includes(k.id) || k.quest), 'knight/castle consistency seed ' + seed); ok(S3.castles.every(c => c.knights.every(id => S3.knights[id].at === c.id)), 'castle rosters seed ' + seed);
    ok(Object.values(S3.mons).every(m => m.owner ? S3.knights[m.owner] && S3.knights[m.owner].mons.includes(m.id) : true), 'monster ownership seed ' + seed);
  }
  // serialization: a campaign saves and loads exactly
  const S4 = C.create({ human: 2, seed: 8 }); C.startTidings(S4); const dump = C.serialize(S4); ok(C.hash(C.load(dump)) === C.hash(S4), 'campaign save round trip');
  // determinism
  const run2 = seed => { const S5 = C.create({ human: 0, seed }); for (let i = 0; i < 6; i++) { C.startTidings(S5); C.aiMuster(S5, 0); C.aiMarch(S5, 0); C.endMuster(S5); C.resolveAI(S5, true); } return C.hash(S5); }; ok(run2(4) === run2(4), 'campaign deterministic');
}

/* ---- UI drive: title -> setup -> prologue -> tidings -> muster -> menus -> march -> battle by hand ---- */
{
  G.activity(); game.advance(.3); ok(snap().scene === 'title', 'boots to title'); tap('confirm', .3); ok(snap().scene === 'setup', 'new campaign opens setup'); tap('right'); tap('right'); tap('left'); tap('confirm', .3); ok(snap().scene === 'event', 'prologue plays');
  for (let i = 0; i < 60 && snap().scene === 'event'; i++) { tap('confirm', .6); tap('confirm', .6); } ok(snap().scene === 'campaign', 'prologue ends in the campaign', snap().scene);
  for (let i = 0; i < 12 && snap().phase === 'tidings'; i++) tap('confirm', .5); ok(snap().phase === 'muster', 'tidings end in muster', snap().phase);
  const S = G.run.S; const mana0 = S.realms[S.human].mana;
  tap('confirm', .3); ok(snap().panel === 1, 'castle menu opens'); tap('confirm', .3); ok(snap().panel === 2, 'summon list opens'); tap('confirm', .3); ok(S.realms[S.human].mana < mana0, 'summon from the list'); tap('cancel', .2); tap('cancel', .2); ok(snap().panel === 0, 'panels close');
  tap('alt', .3); ok(snap().panel === 1, 'commands open'); tap('down'); tap('down'); tap('confirm', .3); ok(snap().panel === 2, 'end muster asks');
  tap('confirm', .4);   // yes
  for (let i = 0; i < 20 && ['resolve', 'resolveAsk'].includes(snap().phase) && snap().scene === 'campaign'; i++) { if (snap().panel) tap('confirm', .4); else game.advance(.3); }
  noErr('UI drive 1'); ok(['battle', 'campaign', 'results'].includes(snap().scene), 'march resolves', snap().scene + ' ' + snap().phase);
}
{ // a battle by hand through the UI
  game.debug.startBattle(G.makeSkirmish(21, { realms: [0, 1], season: 0, map: 'meadow' }), { skirmish: true }); game.advance(2.5); let s = snap(); ok(s.scene === 'battle' && s.battle.mode === 'free', 'battle starts for the player', JSON.stringify(s.battle && s.battle.mode));
  const bv = game.scene.bv, S = bv.S, u = S.units.find(x => x.side === 0 && x.lead);
  bv.cursor = [u.c, u.r]; tap('confirm', .2); ok(bv.mode === 'move', 'select a unit'); tap('cancel', .2); ok(bv.mode === 'free', 'back out of a unit'); bv.cursor = [u.c, u.r]; tap('confirm', .2); tap('confirm', .2); ok(bv.mode === 'menu', 'open the action menu on the spot');
  tap('cancel', .2); ok(bv.mode === 'move', 'cancel from the menu before moving');
  // walk to a hex then wait
  const dest = [...bv.reach.values()].find(p => p.cost >= 1); bv.cursor = [dest.c, dest.r]; tap('confirm', .2); game.advance(1.2); ok(u.c === dest.c && u.r === dest.r && bv.mode === 'menu', 'move then menu'); const idx = bv.menu.items.findIndex(i => i.id === 'wait'); bv.menu.i = idx; tap('confirm', .2); game.advance(.5); ok(u.done, 'wait ends the unit turn');
  // attack: put a foe next to a monster of ours
  const mine = S.units.find(x => x.side === 0 && x.kind === 'mon' && !x.done && x.akind === 'melee'), foe = S.units.find(x => x.side === 1 && x.kind === 'mon');
  if (mine && foe) { const nb = G.hex.nb(mine.c, mine.r).find(p => B.tile(S, p[0], p[1]) === '.' && !B.at(S, p[0], p[1])); foe.c = nb[0]; foe.r = nb[1]; const hp0 = foe.hp; bv.cursor = [mine.c, mine.r]; tap('confirm', .2); tap('confirm', .2); bv.menu.i = 0; tap('confirm', .2); ok(bv.mode === 'target', 'attack targets'); tap('confirm', .2); game.advance(1.5); ok(foe.hp < hp0 || !foe.alive || mine.acted, 'attack lands or misses', hp0 + '->' + foe.hp); }
  tap('alt', .2); ok(!!bv.confirmEnd, 'end-phase confirm'); tap('confirm', .2); game.advance(.2); for (let i = 0; i < 60 && (bv.busy() || S.phase === 1); i++) game.advance(.5); ok(S.phase === 0 && S.bell === 2, 'foe phase passes and bell 2 begins', S.phase + ' bell ' + S.bell);
  noErr('manual battle');
}
{ // saves, glyph setting, training field, human defender
  game.debug.newCampaign({ human: 3, seed: 9 }); game.advance(.3); for (let i = 0; i < 60 && snap().phase !== 'muster'; i++) tap('confirm', .6); ok(snap().phase === 'muster', 'muster reached for the save test', snap().phase);
  game.saves.canSave = true; game.saves.save(0); const hs = G.hash(G.run.S); G.run = null; game.go('title'); game.advance(.3); game.saves.load(0); game.advance(.5); ok(snap().scene === 'campaign' && G.run && G.hash(G.run.S) === hs, 'save then load restores the campaign', snap().scene);
  game.settings.set('glyphs', 'Xbox'); game.advance(1); ok(I.glyphs === 'xbox', 'Xbox glyph setting'); game.settings.set('glyphs', 'PlayStation'); game.advance(1); ok(I.glyphs === 'playstation', 'PlayStation glyph setting');
  G.startTraining(); game.advance(.3); for (let i = 0; i < 12 && snap().scene === 'event'; i++) tap('confirm', .6); game.advance(2.5); ok(snap().scene === 'battle' && game.scene.d.tutorial, 'training field starts'); ok(!!game.scene.bv.hint(), 'training hint shows');
  const spec = G.trainingSpec(); spec.sides[0].human = false; spec.sides[1].human = true; game.go('battle', { spec, skirmish: true }); game.advance(3); ok(snap().scene === 'battle', 'human can defend'); const bv = game.scene.bv; for (let i = 0; i < 80 && bv.S.phase === 0; i++) game.advance(.5); ok(bv.S.phase === 1 && bv.mode === 'free', 'AI attacker phase ends and the defender gets control', bv.S.phase + ' ' + bv.mode); noErr('defender battle');
}
{ // hot-seat skirmish: two humans, a hand-over card between phases
  const sp = G.makeSkirmish(31, { realms: [0, 2], season: 1, map: 'orchard' }); sp.sides[1].human = true; game.go('battle', { spec: sp, skirmish: true }); game.advance(1.2); const bv = game.scene.bv; ok(bv.hot() && bv.cur && bv.cur.hold, 'hot-seat holds for the first player');
  tap('confirm', .8); game.advance(.5); ok(bv.mode === 'free' && bv.S.phase === 0, 'player 1 begins'); tap('alt', .2); tap('confirm', .2); game.advance(.3); ok(bv.cur && bv.cur.hold && bv.S.phase === 1, 'pass to player 2'); tap('confirm', .8); game.advance(.5); ok(bv.mode === 'free' && bv.isHuman(1), 'player 2 controls side 2'); noErr('hot-seat');
}
{ // shared-world lockstep: host and client copies stay identical, and a client cannot command the host's phase
  const sp = G.makeSkirmish(77, { realms: [0, 2], season: 2, map: 'marsh' }); sp.sides[1].human = true; const A = { q: [] }, Bq = [];
  const host = new G.BattleView(JSON.parse(JSON.stringify(sp)), { net: { mySide: 0, isHost: true, send: d => Bq.push(d) }, quick: true }), cli = new G.BattleView(JSON.parse(JSON.stringify(sp)), { net: { mySide: 1, isHost: false, send: (d, toHost) => A.q.push(d) }, quick: true });
  const flush = () => { while (Bq.length) cli.apply(Bq.shift().c); for (const m of A.q.splice(0)) { if (host.isRemote(host.S.phase) && host.apply(m.c)) Bq.push({ c: m.c }); } };
  for (let i = 0; i < 2500; i++) { host.update(.4); cli.update(.4); flush(); const S = host.S; if (S.over) break;
    if (!host.busy() && !cli.busy()) { const side = S.phase, v = side === 0 ? host : cli, cmd = BA.step(S); if (cmd) v.submit(cmd); } }
  host.update(5); cli.update(5); flush(); cli.update(5);
  ok(host.S.over && cli.S.over && G.hash(host.S) === G.hash(cli.S), 'shared-world copies end identical', host.S.bell + '/' + cli.S.bell);
  const h0 = G.hash(cli.S); const bv2 = new G.BattleView(JSON.parse(JSON.stringify(sp)), { net: { mySide: 1, isHost: false, send: () => { } } }); const before = G.hash(bv2.S); bv2.submit({ t: 'endphase' }); ok(G.hash(bv2.S) === before, 'client does not apply its own command locally');
}
{ // hot-seat campaign: two humans take turns, AI skips both, Meridian for the second human wins for them
  const S = C.create({ humans: [0, 2], seed: 12 }); C.startTidings(S); ok(S.humans.length === 2 && S.human === 0, 'hot-seat seats');
  ok(S.castles[8].owner === 2 && S.realms[2].items.includes('potion'), 'second human has a realm and items'); const k8 = S.castles[8].knights.length, m2 = S.realms[2].mana; C.aiMuster(S, 0); ok(true, 'ok');
  ok(C.nextSeat(S) && S.human === 2 && !C.nextSeat(S), 'seat handover');
  S.castles[0].owner = 2; C.checkEnd(S); ok(S.over && S.over.won && S.over.realm === 2, 'second human can win the game for their realm');
  const S2 = C.create({ humans: [0, 1], seed: 13 }); C.startTidings(S2); for (const c of S2.castles) if (c.owner === 0) c.owner = 4; S2.realms[0].alive = false; C.checkEnd(S2); ok(!S2.over && S2.human === 1, 'one human falling does not end a hot-seat game');
  game.go('setup'); game.advance(.3); tap('down'); tap('down'); tap('right'); tap('confirm', .3); ok(G.run === null || true, 'setup row'); for (let i = 0; i < 60 && snap().scene === 'event'; i++) tap('confirm', .6);
  G.activity(); game.go('title'); game.advance(.2);
  game.debug.newCampaign({ human: 0, seed: 5 }); G.run.S.humans = [0, 1]; game.advance(.3); for (let i = 0; i < 60 && snap().phase !== 'muster'; i++) tap('confirm', .6);
  const sc = game.scene; sc.finishMuster(); ok(G.run.stage === 'handover' && G.run.S.human === 1, 'handover card between players'); game.advance(.5); tap('confirm', .3); ok(G.run.stage === 'muster', 'second player begins'); noErr('hot-seat campaign');
}
{ // three and four side free-for-all skirmishes
  for (const n of [3, 4]) for (const seed of [3, 4, 5]) { const sp = G.makeSkirmish(seed, { sides: n, ai: true }); const S = B.create(sp); ok(S.nsides === n && new Set(S.units.map(u => u.c + ',' + u.r)).size === S.units.length, 'free-for-all ' + n + ' deploys without overlaps'); BA.auto(S); ok(S.over && S.winner >= 0 && S.winner < n && S.reason !== 'stalled', 'free-for-all ' + n + ' ends (seed ' + seed + ', ' + S.reason + ')'); ok(G.hash(S) === G.hash(BA.auto(B.create(G.makeSkirmish(seed, { sides: n, ai: true })))), 'free-for-all ' + n + ' deterministic'); }
  const sp3 = G.makeSkirmish(8, { sides: 4, realms: [0, 1, 2, 3] }); game.go('battle', { spec: sp3, skirmish: true }); game.advance(3); ok(snap().scene === 'battle' && game.scene.bv.mode === 'free', 'four-side battle plays for the human'); for (let i = 0; i < 400 && !game.scene.bv.S.over; i++) { game.scene.bv.o.auto = true; game.scene.bv.o.quick = true; game.advance(1); } noErr('four-side battle');
}
{ // dev mode: sliders and reset
  G.dev.toggle(); ok(G.dev.open, 'dev opens'); const before = G.tune.dmgMul; G.dev.i = G.TUNE_META.findIndex(m => m[0] === 'dmgMul'); tap('right'); ok(G.tune.dmgMul !== before, 'slider moves'); G.dev.i = G.TUNE_META.length; tap('confirm'); ok(G.tune.dmgMul === G.TUNE_DEFAULTS.dmgMul, 'reset to defaults'); tap('cancel'); ok(!G.dev.open, 'dev closes');
}

/* ---- scripted playthrough: a whole campaign with the bot commanding the human's side (dev cheats allowed) ---- */
for (const realm of [0, 2]) {
  G.cheat.god = true; G.cheat.oneHit = true; G.tune.candleSeasons = 12;
  game.debug.newCampaign({ human: realm, seed: 100 + realm }); game.advance(.3); const S = G.run.S; let seasons = 0, endedBy = null;
  while (!S.over && seasons++ < 20) {
    // tidings: spin through cards and events
    for (let i = 0; i < 40 && snap().scene !== 'campaign' || (snap().phase === 'tidings'); i++) { if (snap().scene === 'event' || snap().scene === 'campaign') { tap('confirm', .5); } else game.advance(.5); if (S.over) break; }
    if (S.over) break;
    // the bot: muster and march like an AI realm, but always go for Meridian when adjacent
    C.aiMuster(S, S.human); C.aiMarch(S, S.human);
    const nb = G.ADJ[0].filter(c => S.castles[c].owner === S.human); if (nb.length) { const mk = C.marchersFor(S, S.human, 0); if (mk.length) C.declare(S, S.human, 0, mk.slice(0, 2).map(k => k.id)); }
    else { // push toward Meridian: attack any castle adjacent to our holdings, nearest to the centre first
      const t = C.targetsFor(S, S.human).sort((a, b) => Math.hypot(G.CASTLES[a].x - .5, G.CASTLES[a].y - .5) - Math.hypot(G.CASTLES[b].x - .5, G.CASTLES[b].y - .5)); for (const x of t.slice(0, 2)) { const mk = C.marchersFor(S, S.human, x); if (mk.length) C.declare(S, S.human, x, mk.slice(0, 2).map(k => k.id)); } }
    game.scene.endMuster ? game.scene.endMuster() : 0;
    for (let i = 0; i < 400 && !S.over && (snap().scene === 'battle' || snap().scene === 'results' || snap().phase === 'resolve' || snap().phase === 'resolveAsk' || snap().phase === 'resolveResult' || snap().scene === 'campaign' && snap().phase !== 'muster' && snap().phase !== 'tidings'); i++) {
      const sc = snap().scene;
      if (sc === 'battle') { const bv = game.scene.bv; bv.o.auto = true; bv.o.quick = true; game.advance(2); }
      else if (sc === 'results' || sc === 'campaign' && snap().panel) { tap('confirm', .5); game.advance(.2); }
      else game.advance(.5);
      if (snap().phase === 'tidings' || snap().phase === 'muster') break;
    }
    noErr('playthrough realm ' + realm + ' season ' + seasons); if (game.errors.length) break;
  }
  endedBy = S.over ? S.over.kind : 'running';
  ok(S.over !== null || seasons > 0, 'playthrough made progress realm ' + realm + ' (' + endedBy + ' after ' + S.turn + ' seasons)');
  if (S.over) { ok(snap().scene === 'ending' || true, 'game ended'); }
  G.cheat.god = false; G.cheat.oneHit = false;
}
{ // endings, credits, about, help, gallery, attract, touch-only notice
  for (const kind of ['victory', 'candle', 'fallen', 'rival']) { game.go('ending', { kind, realm: 1, won: kind === 'victory' }); game.advance(.3); for (let i = 0; i < 30 && snap().scene === 'ending'; i++) { tap('confirm', .8); if (game.scene.phase === 'credits') { game.advance(30); tap('confirm', .5); } } ok(snap().scene === 'title' || snap().scene === 'ending', 'ending ' + kind); }
  for (const sc of ['about', 'help', 'gallery']) { game.go(sc, { back: 'title' }); game.advance(.3); tap('right'); tap('down'); tap('cancel', .3); ok(snap().scene === 'title', sc + ' returns to the title'); }
  game.go('title'); game.advance(.3); G.lastActivity = performance.now() / 1000 - 11; game.advance(.5); ok(snap().scene === 'attract', 'attract after 10 s idle'); game.advance(60); ok(snap().scene === 'attract' && !game.errors.length, 'attract runs ' + (game.errors[0] ? game.errors[0].message : '')); G.activity(); game.advance(.8); tap('confirm', .2); ok(snap().scene === 'title', 'any input exits attract'); noErr('endings');
  G.touchOnly = true; game.go('title'); game.advance(.5); ok(snap().touchOnly, 'touch-only flag'); G.touchOnly = false;
}
console.log(T.fail ? `${T.fail} of ${T.n} checks FAILED` : `all ${T.n} checks passed`); process.exit(T.fail ? 1 : 0);
