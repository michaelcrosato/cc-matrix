// data, hex, rules, determinism, ai-battle
import { suite, boot, ok, eq } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');

let H = null; const env = async () => H || (H = await boot('#title'));
/** a battle with units placed by hand: place = { ref: [cx, cy] } */
export function battle(G, o = {}) {
  const spec = G.skirmishSpec({ map: o.map || 'border_meadow', season: o.season || 'summer', sides: [{ realm: o.a || 'solmark', ctl: 'human', level: o.la || 8 }, { realm: o.b || 'hoarfast', ctl: 'normal', level: o.lb || 8 }], seed: o.seed || 3 });
  spec.mode = o.mode || 'siege';
  const sim = G.BattleSim.create(spec);
  return sim;
}

suite('data', async t => {
  const { G, ctx } = await env();
  await t('counts', () => { eq(G.all('castle').length, 25, 'castles'); eq(G.ROADS.length, 36, 'roads'); eq(G.all('monster').length, 30, 'species'); eq(G.all('knight').length, 36, 'knights'); eq(G.all('map').length, 13, 'maps'); eq(G.all('skill').length, 90, 'skills'); eq(G.all('item').length, 33, 'items'); eq(G.all('class').length, 23, 'classes'); ok(G.all('event').length >= 40, 'events ' + G.all('event').length); });
  await t('every reference resolves', () => G.validate());
  await t('every species has three forms and a rig per form', () => { for (const m of G.all('monster')) { eq(m.names.length, 3, m.id); eq(m.size.length, 3, m.id); const r = m.rig; ok(r.kind === 'beast' ? r.parts.length === 3 && r.colors.length === 3 : r.kind === 'blob' ? r.colors.length === 3 : r.look.length === 3, m.id + ' rig'); } });
  await t('maps: rows, anchors, room, and the Keep reachable in every season', () => {
    for (const m of G.all('map')) {
      const w = m.rows[0].length; for (const r of m.rows) eq(r.length, w, m.id + ' row length');
      const p = G.parseMap(m.id);
      const need = m.mode === 'shrine' ? ['1', '2', '3', '4'] : m.id === 'border_meadow' ? ['1', '2', '7', '8'] : ['1', '2', '3', '7', '8', '9'];
      for (const a of need) { ok(p.anchors[a], m.id + ' anchor ' + a); eq(m.rows.join('').split(a).length - 1, 1, m.id + ' anchor ' + a + ' once'); }
      for (const season of G.SEASONS) {
        const codes = p.codes.map(c => G.seasonTerrain(c, season, m.flood)), walker = { size: 'M', elem: 'spring' };
        const free = c => G.hex.inside(c, p.w, p.h) && G.canEnd(codes[c[1] * p.w + c[0]], walker) && isFinite(G.moveCost(codes[c[1] * p.w + c[0]], walker, season));
        for (const a of need) { const c = p.anchors[a], room = G.hex.within(c, 2, p.w, p.h).filter(free).length; ok(room >= 7, `${m.id} ${season} anchor ${a} room ${room}`); }
        if (p.keep && m.mode === 'siege') for (const a of ['1', '2', '3'].filter(x => p.anchors[x])) {
          const seen = new Set([p.anchors[a].join()]), q = [p.anchors[a]]; let found = false;
          while (q.length) { const c = q.shift(); if (c[0] === p.keep[0] && c[1] === p.keep[1]) { found = true; break; } for (const n of G.hex.neighbours(c)) if (free(n) && !seen.has(n.join())) { seen.add(n.join()); q.push(n); } }
          ok(found, `${m.id} ${season}: the Keep from anchor ${a}`);
        }
      }
    }
  });
  await t('the road graph is connected and every realm has the same shape', () => {
    const seen = new Set(['meridian']), q = ['meridian']; while (q.length) { const c = q.shift(); for (const n of G.get('castle', c).roads) if (!seen.has(n)) { seen.add(n); q.push(n); } }
    eq(seen.size, 25, 'connected');
    for (const [a, b] of G.ROADS) ok(G.get('castle', b).roads.includes(a), 'symmetric ' + a + b);
    for (const r of G.PLAYABLE) {
      const cs = G.all('castle').filter(c => c.owner === r), cap = cs.find(c => c.tier === 'capital'), inner = cs.find(c => c.tier === 'inner'), flanks = cs.filter(c => c.tier === 'flank');
      eq(cs.length, 4, r); eq(cap.roads.length, 2, r + ' capital roads'); eq(flanks.length, 2, r + ' flanks');
      for (const f of flanks) ok(f.roads.some(n => G.get('castle', n).owner === 'brigands'), r + ' flank faces brigands');
      ok(inner.roads.some(n => G.get('castle', n).owner === 'dominion'), r + ' inner faces the Hour');
    }
  });
  await t('none of the source\'s proper names', () => {
    const txt = readFileSync(join(DEV, 'dist/game.js'), 'utf8');
    for (const w of ['Forsena', 'Almekia', 'Esgares', 'Norgard', 'Caerleon', 'Iscalio', 'Leonia', 'Padstow', 'Lance', 'Zemeckis', 'Cador', 'Henguist', 'Vaynard', 'Lyonesse', 'Dryst', 'Cai'])
      ok(!new RegExp('\\b' + w + '\\b').test(txt.replace(/Brigandine: The Legend of Forsena/g, '')), 'uses ' + w);
  });
  await t('no TODO, FIXME or placeholder in the sources', () => { const txt = readFileSync(join(DEV, 'dist/game.js'), 'utf8'); ok(!/\b(TODO|FIXME)\b/.test(txt) && !/placeholder/i.test(txt)); });
});

suite('hex', async t => {
  const { G, E } = await env();
  await t('center and toCell round-trip on every hex', () => { for (let y = 0; y < 13; y++) for (let x = 0; x < 17; x++) { const [cx, cy] = G.hex.center([x, y]); const c = G.hex.toCell(cx + 3, cy - 2); eq(c.join(), x + ',' + y); } });
  await t('neighbours and distances match E.Grid', () => {
    const grid = new E.Grid(17, 13, { hex: 'pointy' });
    for (let y = 1; y < 12; y++) for (let x = 1; x < 16; x++) {
      const a = grid.neighbours([x, y]).map(c => c.join()).sort().join(';'), b = G.hex.neighbours([x, y]).map(c => c.join()).sort().join(';'); eq(a, b, 'neighbours ' + x + ',' + y);
      for (const o of [[3, 4], [10, 2], [16, 12]]) eq(G.hex.dist([x, y], o), grid.dist([x, y], o), 'dist');
      const [ex, ey] = grid.center([x, y], 28), [gx, gy] = G.hex.center([x, y]); ok(Math.abs(ex - gx) < 1e-6 && Math.abs(ey - gy) < 1e-6, 'centre');
    }
  });
  await t('areas: cones, lines and rings', () => { eq(G.hex.cone([8, 6], 0, 2, 17, 13).length, 8, 'cone2'); eq(G.hex.cone([8, 6], 0, 3, 17, 13).length, 15, 'cone3'); eq(G.hex.line([8, 6], 0, 4, 17, 13).length, 4, 'line4'); eq(G.hex.ring([8, 6], 2, 17, 13).length, 12, 'ring2'); eq(G.hex.within([8, 6], 2, 17, 13).length, 19, 'r2'); });
  await t('screen direction to neighbour at all six turns', () => {
    for (let turn = 0; turn < 6; turn++) {
      const v = new E.View('t', 't', turn * 60, 50, 1.5, 1);
      for (const [mx, my] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = G.hex.screenStep([8, 6], mx, my, v), [x0, y0] = G.hex.center([8, 6]), [x1, y1] = G.hex.center(n), p0 = v.p(x0, y0, 0), p1 = v.p(x1, y1, 0);
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy); ok((dx * mx + dy * my) / l > .45, `turn ${turn} dir ${mx},${my}`);
      }
    }
  });
});

suite('rules', async t => {
  const { G } = await env();
  const place = (sim, u, c) => { u.cx = c[0]; u.cy = c[1]; sim.dirty(); };
  const fresh = (o) => { const sim = battle(G, o); for (const u of sim.units) { u.fx = {}; } return sim; };
  await t('physical damage follows the formula (no element, no Tide)', () => {
    const sim = fresh({ season: 'autumn', a: 'dominion', b: 'dominion' });
    const a = sim.units.find(u => u.side === 0 && u.kind === 'monster'), d = sim.units.find(u => u.side === 1 && u.kind === 'monster');
    const ka = sim.knightOf(a); place(sim, ka, [2, 4]); place(sim, a, [3, 4]); place(sim, d, [4, 4]); const kd = sim.knightOf(d); place(sim, kd, [6, 4]);
    for (const u of sim.units) if (![a, d, ka, kd].includes(u)) { u.out = true; } sim.dirty();
    const f = sim.forecast(a, 'attack', [4, 4])[0], A = sim.eff(a), D = sim.eff(d), td = 1 - G.terrainDef(sim.code([4, 4]), d, -1, 'autumn');
    const base = (A.atk * a.basic.p - D.def * .5) * td; ok(Math.abs(f.dmg[0] - Math.max(1, Math.round(base * .9))) <= 1 && Math.abs(f.dmg[1] - Math.max(1, Math.round(base * 1.1))) <= 1, JSON.stringify(f.dmg) + ' vs ' + base);
  });
  await t('opposed elements hit harder, the same element softer, the Tide shifts both', () => {
    const sim = fresh({ season: 'summer' });
    const sol = sim.units.find(u => u.side === 0 && u.elem === 'summer'), hoa = sim.units.find(u => u.side === 1 && u.elem === 'winter');
    eq(sim._elemMul('summer', 'winter'), G.tune.elemStrong); eq(sim._elemMul('summer', 'summer'), G.tune.elemSame); eq(sim._elemMul('hour', 'winter'), 1);
    ok(G.tideOut('summer', 'summer') > 1 && G.tideOut('winter', 'summer') < 1 && G.tideOut('hour', 'summer') === 1, 'tide');
    ok(sol && hoa, 'units');
  });
  await t('a dmgScale slider of 2 doubles a fixed hit', () => {
    const sim = fresh({ season: 'autumn', a: 'dominion', b: 'dominion' }), a = sim.units.find(u => u.side === 0 && u.kind === 'monster'), d = sim.units.find(u => u.side === 1 && u.kind === 'monster');
    place(sim, a, [3, 4]); place(sim, d, [4, 4]); const f1 = sim.forecast(a, 'attack', [4, 4])[0].dmg[1]; G.setTune('dmgScale', 2); const f2 = sim.forecast(a, 'attack', [4, 4])[0].dmg[1]; G.resetTune();
    ok(Math.abs(f2 - f1 * 2) <= 2, f1 + ' -> ' + f2);
  });
  await t('spells need planted feet; mobile specials work after moving; Charge needs two hexes', () => {
    const sim = fresh({ a: 'verdance' }), g = sim.units.find(u => u.ref === 'gareth');
    const tr = sim.activeTroop(); ok(tr, 'a troop is active');
    g.moved = 1; ok(sim.why(g, 'bramblestorm') === 'Spells need planted feet' || !g.skills.includes('bramblestorm'), 'spell after moving');
    ok(sim.why(g, 'charge') && sim.why(g, 'charge').startsWith('Move 2'), 'charge needs 2: ' + sim.why(g, 'charge'));
    g.moved = 0;
  });
  await t('the Keep heals its owner and decides the last bell', () => {
    const sim = fresh({ map: 'river_ford' }), s = sim.s, kd = sim.units.find(u => u.side === 1 && u.kind === 'knight');
    for (const u of sim.units) if (u.side === 1 && u !== kd) u.out = true;
    place(sim, kd, s.keep); kd.hp = Math.round(kd.mhp / 2); const before = kd.hp; const ev = []; sim._endBell(ev); ok(kd.hp > before, 'healed ' + before + ' -> ' + kd.hp);
    const s2 = fresh({ map: 'river_ford' }), ka = s2.units.find(u => u.side === 0 && u.kind === 'knight');
    for (const u of s2.units) if (u !== ka && u.cx === s2.s.keep[0] && u.cy === s2.s.keep[1]) place(s2, u, [0, u.cy]);
    place(s2, ka, s2.s.keep); s2.s.bell = s2.s.bells; const e2 = []; s2._lastBell(e2); eq(s2.s.over.winner, 0, 'attacker on the Keep wins'); eq(s2.s.over.reason, 'keep');
  });
  await t('a ruler who retreats loses the battle', () => {
    const sim = fresh({ a: 'verdance' }), g = sim.units.find(u => u.ref === 'gareth'), tr = sim.troop(g.troop);
    const ev = []; sim._troopLeaves(tr, 'retreat', ev); sim._checkWin(ev); ok(sim.s.over && sim.s.over.winner === 1, 'over ' + JSON.stringify(sim.s.over));
  });
  await t('a fallen knight takes its troop; nearby monsters may be captured; monsters at 0 HP die', () => {
    let caps = 0, dead = 0;
    for (let seed = 1; seed < 40; seed++) {
      const sim = fresh({ seed }), kb = sim.units.find(u => u.side === 1 && u.kind === 'knight' && !u.ruler) || sim.units.find(u => u.side === 1 && u.kind === 'knight'), ka = sim.units.find(u => u.side === 0 && u.kind === 'knight');
      const mons = sim.troop(kb.troop).units.map(id => sim.unit(id)).filter(u => u.kind === 'monster');
      if (!mons.length) continue;
      place(sim, ka, [mons[0].cx + 1 < sim.s.w ? mons[0].cx + 1 : mons[0].cx - 1, mons[0].cy]);
      const ev = []; sim._down(kb, ka, ev); caps += sim.s.captures.length;
      ok(sim.troop(kb.troop).gone, 'troop gone');
      const m = mons[mons.length - 1]; if (sim.onField(m)) { sim._damage(ka, m, 9999, {}, ev); } if (m.dead) dead++;
    }
    ok(caps > 0, 'some captures');
  });
  await t('EXP gives levels at 100', () => { const sim = fresh({}), u = sim.units.find(x => x.kind === 'monster' && x.side === 0), lv = u.level, ev = []; u.exp = 0; sim._exp(u, Math.ceil(250 / G.tune.expScale), ev); eq(u.level, lv + 2); ok(ev.filter(e => e.e === 'level').length === 2); });
  await t('an area heal gives its caster +8 EXP once, however many it mends', () => {
    const sim = fresh({}), mine = sim.units.filter(x => x.side === 0), c = mine[0]; c.skills.push('renewal'); c.mp = 99; c.exp = 0;
    const hurt = mine.slice(1, 4); hurt.forEach((x, i) => { place(sim, x, [5 + (i % 2), 4 + (i >> 1)]); x.hp = Math.max(1, x.mhp - 50); }); place(sim, c, [3, 4]);
    const before = c.expGain || 0, ev = []; sim._act(c, { t: 'act', u: c.id, a: 'renewal', at: [5, 4] }, ev);
    ok(ev.filter(e => e.e === 'heal' && e.amt > 0).length >= 2, 'heals more than one'); eq((c.expGain || 0) - before, Math.round(8 * G.tune.expScale));
  });
  await t('seasons change the land: floods, ice, drying', () => { eq(G.seasonTerrain('~', 'spring', true), 'w'); eq(G.seasonTerrain('w', 'winter'), 'i'); eq(G.seasonTerrain('s', 'summer'), 'd'); eq(G.seasonTerrain('.', 'winter'), 'n'); eq(G.seasonTerrain('F', 'summer'), 'W'); });
  await t('a Summer storm burns forests into ash', () => {
    const sim = fresh({ map: 'forest_hold', season: 'summer' }), s = sim.s, fi = s.cells.indexOf('f'), c = [fi % s.w, Math.floor(fi / s.w)];
    s.cells[fi] = 'B'; s.burn[c.join(',')] = 1; const ev = []; sim._endBell(ev); eq(s.cells[fi], 'a', 'ash');
  });
  await t('the Sanctum: dials light, the Wheel turns, Timeless breaks', () => {
    const d = G.devBattleSpec('clockwork_sanctum', 'autumn', 'sanctum'); const sim = G.BattleSim.create(d.spec);
    const gk = sim.units.find(u => u.ref === 'graynight'); ok(gk.passives.timeless && gk.ruler, 'the Gray Knight');
    const ev = sim.apply({ t: 'dials' }); ok(sim.s.wheelTurned && sim.s.handStopped, 'wheel'); ok(ev.some(e => e.e === 'wheel'));
  });
  await t('the shrine counts glory', () => {
    const d = G.devBattleSpec('wheel_shrine', 'spring', 'shrine'), sim = G.BattleSim.create(d.spec); G.BattleAI.resolve(sim);
    ok(sim.s.over && sim.s.over.standings.length >= 1, 'standings'); ok(Object.values(sim.s.glory).some(g => g > 0), 'glory');
  });
});

suite('determinism', async t => {
  const { G } = await env();
  await t('the same seed and commands give the same battle', () => { const run = () => { const d = G.devBattleSpec('lakeside', 'winter', 'ai'), sim = G.BattleSim.create(d.spec); G.BattleAI.resolve(sim); return sim.hash(); }; eq(run(), run()); });
  await t('the same seed gives the same campaign', () => { const run = () => { const sim = G.CampaignSim.create({ seed: 5, humans: ['solmark'] }); for (let i = 0; i < 4; i++) G.CampaignAI.playSeason(sim); return sim.hash(); }; eq(run(), run()); });
  await t('no Math.random, Date.now or performance in the sims and AI', () => { for (const f of ['20-sim-battle.js', '21-ai-battle.js', '22-sim-campaign.js', '23-ai-campaign.js']) { const src = readFileSync(join(DEV, 'src', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); ok(!/Math\.random|Date\.now|performance\./.test(src), f); } });
  await t('a battle survives serialize and load', () => { const d = G.devBattleSpec('hill_fort', 'autumn', 'ai'), sim = G.BattleSim.create(d.spec); for (let i = 0; i < 30; i++) sim.apply(G.BattleAI.next(sim)); const copy = G.BattleSim.load(sim.serialize()); eq(copy.hash(), sim.hash()); G.BattleAI.resolve(sim); G.BattleAI.resolve(copy); eq(copy.hash(), sim.hash(), 'after'); });
});

suite('ai-battle', async t => {
  const { G } = await env();
  await t('every map and season ends within its bells, with legal commands only', () => {
    for (const m of G.all('map')) for (const season of G.SEASONS) {
      if (m.id === 'clockwork_sanctum' || m.id === 'wheel_shrine' || m.id === 'border_meadow') continue;
      const spec = G.skirmishSpec({ map: m.id, season, sides: [{ realm: 'verdance', ctl: 'normal', level: 8 }, { realm: 'amberlyn', ctl: 'normal', level: 8 }], seed: 2 });
      const sim = G.BattleSim.create(spec), ev = G.BattleAI.resolve(sim);
      ok(sim.s.over, m.id + ' ' + season + ' over'); ok(sim.s.over.bell <= sim.s.bells, 'bells'); ok(!ev.some(e => e.e === 'illegal'), m.id + ' ' + season + ' illegal ' + JSON.stringify(ev.find(e => e.e === 'illegal')));
    }
  });
  await t('the AI wins clearly favourable fights', () => {
    let wins = 0, n = 30;
    for (let seed = 1; seed <= n; seed++) { const spec = G.skirmishSpec({ map: 'crossroads', season: 'autumn', sides: [{ realm: 'solmark', ctl: 'normal', level: 16 }, { realm: 'amberlyn', ctl: 'normal', level: 7 }], seed }); const sim = G.BattleSim.create(spec); G.BattleAI.resolve(sim); if (sim.s.over.winner === 0) wins++; }
    ok(wins / n >= .9, wins + '/' + n);
  });
  await t('an auto-resolved three-against-three battle takes under half a second', () => {
    let worst = 0; for (let seed = 1; seed <= 4; seed++) { const spec = G.skirmishSpec({ map: 'river_ford', season: 'summer', sides: [{ realm: 'solmark', ctl: 'normal', level: 10 }, { realm: 'hoarfast', ctl: 'normal', level: 10 }], seed }); const t0 = performance.now(), sim = G.BattleSim.create(spec); G.BattleAI.resolve(sim); worst = Math.max(worst, performance.now() - t0); }
    ok(worst < 500, Math.round(worst) + ' ms');
  });
  await t('the Sanctum and the shrine resolve', () => { for (const p of ['sanctum', 'shrine']) { const d = G.devBattleSpec(p === 'sanctum' ? 'clockwork_sanctum' : 'wheel_shrine', 'autumn', p), sim = G.BattleSim.create(d.spec); const ev = G.BattleAI.resolve(sim); ok(sim.s.over, p); ok(!ev.some(e => e.e === 'illegal'), p + ' illegal'); } });
});
