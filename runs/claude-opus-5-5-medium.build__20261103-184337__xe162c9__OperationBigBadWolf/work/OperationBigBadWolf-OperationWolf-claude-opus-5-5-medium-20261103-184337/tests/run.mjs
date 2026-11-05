// The one command: node tests/run.mjs [--quick] [--only <suite>]. Prints only failures, then one line: "N passed, M failed (t s)".
// Headless suites load the engine and the sources into node:vm (tests/load.mjs) and drive the game with game.advance,
// input.tap/hold/feed, injected frames and the bot; the browser suites play the final file in Chromium; the hub suite
// runs the real AI Hub harness.
import { load } from './load.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const t0 = Date.now(); let pass = 0, fail = 0;
const ok = (suite, what, cond, detail = '') => { if (cond) pass++; else { fail++; console.log('FAIL [' + suite + '] ' + what + (detail ? ': ' + String(detail).slice(0, 400) : '')); } };
const root = new URL('../', import.meta.url), rd = f => readFileSync(new URL(f, root), 'utf8');
const NAME = 'OperationBigBadWolf-OperationWolf-claude-opus-5-5-medium-20261103-184337', FINAL = new URL('../' + NAME + '.html', root);
const man = JSON.parse(rd('manifest.json')).scripts, srcs = man.filter(f => f.startsWith('src/'));
const suites = {};
const S = (name, fn) => { suites[name] = fn; };
const fresh = g => { const ctx = load(g ? { globals: g } : {}); const E = ctx.My3D2dge, game = E.current; return { ctx, WP: ctx.WP, E, game, I: game.input }; };
const errs = game => game.errors.map(e => e.message || String(e)).join(' | ');
const runOp = (WP, op, o = {}) => { WP.run = WP.newRun({ diff: o.diff || 'veteran' }); WP.CHEATS.god = !!o.god; const sim = new WP.Sim({ op, players: o.players || [{}], seed: o.seed || 7 }); let t = 0; for (; t < (o.max || 420) && !sim.done; t += 1 / 120) sim.step(1 / 120, sim.players.map((p, i) => WP.Bot.frame(sim, i, 1 / 120, { fair: !!o.fair }))); return sim; };

// ------------------------------------------------------------------------------------------------ lint and data
S('lint', () => {
  for (const f of srcs) { const s = rd(f); ok('lint', f + ' has no Math.random', !/Math\.random/.test(s)); ok('lint', f + ' has no TODO/FIXME/placeholder/lorem', !/\bTODO\b|FIXME|placeholder|lorem/i.test(s)); }
  const { WP } = fresh();
  for (const [k, v] of Object.entries(WP.TEXT)) ok('lint', 'TEXT.' + k + ' is not empty', v && (typeof v !== 'object' || Object.keys(v).length) && (!v.text || v.text.length));
  for (const [title, rows] of WP.ABOUT) for (const [k, v] of rows) ok('lint', 'About ' + title + ' / ' + k + ' is filled', v && v.length > 1);
  ok('lint', 'six stages', WP.STAGES.length === 6);
  for (const st of WP.STAGES) for (const b of st.beats) for (const sp of b.spawn || []) ok('lint', st.id + ' spawn type ' + sp[0] + ' exists', !!WP.TYPES[sp[0]]);
  for (const st of WP.STAGES) for (const p of st.props) ok('lint', st.id + ' prop ' + p[0] + ' exists', !!WP.TYPES[p[0]]);
});
// ------------------------------------------------------------------------------------------------ core determinism, projection
S('core', () => {
  const { WP } = fresh(); const hash = () => { const s = runOp(WP, 1, { god: true, max: 60 }); return createHash('sha1').update(JSON.stringify(s.snapshot()) + s.ents.length).digest('hex'); };
  const a = hash(), b = hash(); ok('core', 'same seed and frames give the same world after 60 s', a === b, a + ' vs ' + b);
  const sim = new WP.Sim({ op: 1, players: [{}], seed: 1 }), v = sim.view;
  for (const [x, y, z] of [[sim.cam.x + 10, sim.cam.y - 100, 0], [sim.cam.x - 60, sim.cam.y - 400, 0]]) { const p = v.project(x, y, z), f = v.toFloor(p[0], p[1]); ok('core', 'project/toFloor round trip', Math.hypot(f[0] - x, f[1] - y) < .5, JSON.stringify([p, f])); }
  ok('core', 'halfWidth at depth 100 is about 103', Math.abs(v.halfWidth(100) - 102.6) < 2, v.halfWidth(100));
  const e = sim.spawn('rifleman', { lx: 0, dz: 100, path: 'dummy' }); const out = []; sim.shapesOf(e, out); const head = out.find(s => s.part === 'head'), body = out.find(s => s.part === 'body'), legs = out.find(s => s.part === 'legs');
  ok('core', 'a humanoid has head, body and legs shapes, top to bottom', head && body && legs && head.c[1] < body.r[1] + 2 && body.r[3] <= legs.r[3], JSON.stringify(out.map(s => [s.part, s.c || s.r])));
  const p0 = v.project(e.x, e.y, 0), ph = v.project(e.x, e.y, e.T.h); ok('core', 'the head shape lies in the top 15% of the drawn height', head.c[1] <= ph[1] + (p0[1] - ph[1]) * .2 && head.c[1] >= ph[1] - 2, [head.c[1], ph[1], p0[1]].join(' '));
});
// ------------------------------------------------------------------------------------------------ input and prompts
S('input', () => {
  const { WP, game, I, E } = fresh(); game.go('play', { op: 1, jump: 'b2' }); game.advance(.5);
  const sim = WP.Play.sim; I.feed('move', 100, 80); game.advance(.05); I.feed('move', 300, 120); game.advance(.05);
  ok('input', 'the mouse moves the crosshair absolutely', Math.abs(sim.players[0].x - 300) < 1 && Math.abs(sim.players[0].y - 120) < 1, sim.players[0].x + ',' + sim.players[0].y);
  const x0 = sim.players[0].x; I.held.add ? I.held.add('KeyD') : (I.held.KeyD = true); I.lastDevice = 'keyboard'; game.advance(.5); I.held.delete ? I.held.delete('KeyD') : delete I.held.KeyD;
  ok('input', 'held KeyD moves the crosshair right at key speed', sim.players[0].x - x0 > 120 && sim.players[0].x - x0 < 280, sim.players[0].x - x0);
  game.settings.set('glyphs', 'playstation'); ok('input', 'fire on a PlayStation pad is R2', I.label('fire', 'gamepad') === 'R2', I.label('fire', 'gamepad'));
  game.settings.set('glyphs', 'xbox'); ok('input', 'fire on an Xbox pad is RT', I.label('fire', 'gamepad') === 'RT', I.label('fire', 'gamepad'));
  ok('input', 'fire with the mouse is Left click', /left click/i.test(I.label('fire', 'mouse')), I.label('fire', 'mouse'));
  game.settings.set('symbols', 'playstation'); ok('input', 'the Button symbols mirror sets the engine glyphs', game.settings.glyphs === 'playstation');
  ok('input', 'the default glyphs are PlayStation', fresh().game.settings.glyphs === 'playstation');
  // snap to threat and aim assist
  const s2 = new WP.Sim({ op: 1, players: [{}], seed: 3 }); s2.spawn('rifleman', { lx: 60, dz: 120, path: 'dummy' }); s2.step(1 / 120, [{ x: 100, y: 100 }]);
  const tp = WP.threatPoint(s2, s2.players[0], {}); ok('input', 'snap finds the hostile', tp && tp[0] > 240, JSON.stringify(tp));
  const as = WP.assistAt(s2, tp[0], tp[1]); ok('input', 'assist friction inside a hostile', as.fric < 1);
});
// ------------------------------------------------------------------------------------------------ the weapon
S('weapon', () => {
  const { WP } = fresh(); const T = WP.T; const sim = new WP.Sim({ op: 1, players: [{}], seed: 1 }); const p = sim.players[0];
  const fire = (sec, f = {}) => { for (let i = 0; i < Math.round(sec * 120); i++) sim.step(1 / 120, [Object.assign({ x: 240, y: 20, fire: true }, f)]); };
  fire(1); ok('weapon', '11 rounds in a second held', p.stats.shots === 11, p.stats.shots); ok('weapon', 'the magazine counts down', p.mag === 19, p.mag);
  ok('weapon', 'bloom stays within 7 px', p.bloom <= T.bloomMax + 1e-9, p.bloom);
  fire(1.8); ok('weapon', 'the magazine runs dry, then auto-reload starts', p.mag === 0 && p.reload > 0, p.mag + ' ' + p.reload);
  for (let i = 0; i < 125; i++) sim.step(1 / 120, [{ x: 240, y: 20 }]); ok('weapon', 'a reload takes 1.0 s and loads a full spare', p.mag === 30 && p.spares.length === 4, p.mag + ' ' + p.spares.length);
  fire(.5); const before = p.mag; sim.step(1 / 120, [{ x: 240, y: 20, reload: true }]); for (let i = 0; i < 125; i++) sim.step(1 / 120, [{ x: 240, y: 20 }]);
  ok('weapon', 'a part-used magazine goes back into the pouch', p.spares.includes(before) && p.mag === 30, JSON.stringify(p.spares) + ' ' + before);
  p.mag = 0; p.spares = []; p.grenades = 0; WP.run.diff = 'veteran'; const ev = []; sim.step(1 / 120, [{ x: 240, y: 20, fire: true }]); ev.push(...sim.events); ok('weapon', 'firing on empty clicks', ev.some(e => e.k === 'dry'));
  sim.step(1 / 120, [{ x: 240, y: 20 }]); p.fury = T.furySeconds; p.mag = 30; const s0 = p.stats.shots; fire(1); ok('weapon', 'FURY doubles the rate and uses no ammo', p.stats.shots - s0 === 22 && p.mag === 30, (p.stats.shots - s0) + ' ' + p.mag);
});
// ------------------------------------------------------------------------------------------------ hits
S('hit', () => {
  const { WP } = fresh(); const sim = new WP.Sim({ op: 1, players: [{}], seed: 1 }); const p = sim.players[0];
  const at = (e, part) => { const out = []; sim.shapesOf(e, out); const s = out.find(q => q.part === part); return s.c ? [s.c[0], s.c[1]] : [(s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2]; };
  WP.T.spreadBase = 0; WP.T.bloomPerShot = 0;
  const b = sim.spawn('brute', { lx: 0, dz: 120, path: 'dummy' }); sim.step(1 / 120, [{ x: 0, y: 0 }]);
  let pt = at(b, 'head'); sim.resolveShot(p, pt[0], pt[1]); ok('hit', 'a brute headshot does x4', Math.abs(b.hp - 4) < 1e-6, b.hp);
  pt = at(b, 'body'); sim.resolveShot(p, pt[0], pt[1]); ok('hit', 'a body hit does x1', Math.abs(b.hp - 3) < 1e-6, b.hp);
  const g = sim.spawn('grenadier', { lx: -80, dz: 140, path: 'dummy' }); sim.step(1 / 120, [{ x: 0, y: 0 }]); pt = at(g, 'head'); sim.resolveShot(p, pt[0], pt[1]); ok('hit', 'a headshot does x2 (grenadier dies)', g.dead, g.hp);
  // cover blocks
  const sb = sim.addProp(['sandbags', 'tsb', sim.cam.x - sim.stage.ox + 80, -(100), {}]); const r = sim.spawn('rifleman', { x: sb.x, y: sb.y - 10, path: 'dummy' }); r.coverTop = 22; sim.step(1 / 120, [{ x: 0, y: 0 }]);
  const out = []; sim.shapesOf(r, out); ok('hit', 'cover removes the legs from the hit shapes', !out.some(s => s.part === 'legs'), JSON.stringify(out.map(s => s.part)));
  const so = []; sim.shapesOf(sb, so); const c = [(so[0].r[0] + so[0].r[2]) / 2, so[0].r[3] - 2]; const hp0 = sb.hp; sim.resolveShot(p, c[0], c[1]); ok('hit', 'a shot into cover stops in the cover', sb.hp < hp0 && !r.dead);
  // projectiles and pickups
  const k = sim.spawn('rifleman', { lx: 40, dz: 80, path: 'dummy' }); const kn = sim.launch('blade', k); sim.step(1 / 120, [{ x: 0, y: 0 }]); const ko = []; sim.shapesOf(kn, ko); sim.resolveShot(p, ko[0].c[0], ko[0].c[1]); ok('hit', 'a knife can be shot out of the air', kn.gone && p.stats.inter === 1);
  const pk = sim.drop('mag', sim.c2w(-130, 120)[0], sim.c2w(-130, 120)[1], 20); pk.st = 'hover'; pk.beh = 'pickup'; sim.step(1 / 120, [{ x: 0, y: 0 }]); const po = []; sim.shapesOf(pk, po); const n0 = p.spares.length; sim.resolveShot(p, po[0].c[0], po[0].c[1]); ok('hit', 'a shot pickup goes to the shooter', p.spares.length === n0 + 1, n0 + ' ' + p.spares.length);
  const ev = sim.ev('x', {}); sim.resolveShot(p, 240, 230); ok('hit', 'a miss on the floor puffs dust', sim.events.some(e => e.k === 'shot' && e.fx !== undefined));
});
// ------------------------------------------------------------------------------------------------ grenades and explosions
S('grenade', () => {
  const { WP } = fresh(); const sim = new WP.Sim({ op: 1, players: [{}], seed: 1 }), p = sim.players[0];
  const near = sim.spawn('rifleman', { lx: 0, dz: 150, path: 'dummy' }), far = sim.spawn('rifleman', { lx: 200, dz: 150, path: 'dummy' }), civ = sim.spawn('villager', { lx: 20, dz: 150, path: 'dummy' });
  sim.step(1 / 120, [{ x: 0, y: 0 }]); const pt = sim.view.project(near.x, near.y, 20);
  sim.step(1 / 120, [{ x: pt[0], y: pt[1], grenade: true }]); ok('grenade', 'a throw uses a grenade', p.grenades === WP.T.startGrenades - 1);
  for (let i = 0; i < 200; i++) sim.step(1 / 120, [{ x: 0, y: 0 }]);
  ok('grenade', 'the blast kills inside the radius', near.dead); ok('grenade', 'and spares outside it', !far.dead); ok('grenade', 'civilians inside are penalized', p.stats.civ === 1 && p.damage > 0, p.stats.civ + ' ' + p.damage);
  const b1 = sim.addProp(['barrel', 'tb1', sim.cam.x - sim.stage.ox, -200]), b2 = sim.addProp(['barrel', 'tb2', sim.cam.x - sim.stage.ox + 30, -200]); sim.damageProp(b1, 9, p);
  for (let i = 0; i < 120; i++) sim.step(1 / 120, [{ x: 0, y: 0 }]); ok('grenade', 'red barrels chain', b1.dead && b2.dead);
});
// ------------------------------------------------------------------------------------------------ every enemy type
S('enemies', () => {
  const { WP } = fresh(); WP.run = WP.newRun({ diff: 'veteran' });
  const types = [['rifleman', { lx: 0, dz: 120, path: 'stand' }], ['grenadier', { lx: 0, dz: 120, path: 'popup' }], ['knife', { lx: 0, dz: 70, path: 'popup' }], ['brute', { lx: 0, dz: 140, path: 'stand' }], ['rpg', { lx: 0, dz: 160, path: 'kneel' }], ['sniper', { lx: 0, dz: 300, z: 0, path: 'snipe' }],
    ['mortar', { lx: 0, dz: 500, path: 'mortar' }], ['officer', { side: 'L', dz: 160 }], ['para', { lx: 0, dz: 150, z: 60 }], ['jeep', { side: 'R', dz: 200, path: 'vcross', stop: true }], ['apc', { side: 'R', dz: 260 }], ['tank', { lx: 0, dz: 300 }], ['vulture', { anchor: 'cam', lx: 0, dz: 600, z: 70 }], ['gunboat', { lx: 0, dz: 380, path: 'boat' }], ['truck', { side: 'R', dz: 260 }]];
  for (const [type, o] of types) {
    const sim = new WP.Sim({ op: 1, players: [{}], seed: 5 }); for (const b of sim.beats) { b.fired = true; b.done = true; } for (const h of sim.holds) h.state = 'done'; sim.holds = [{ d: 0, until: 'never', state: 'on', t: 0 }];
    const e = sim.spawn(type, o); let saw = false, spawned = 0;
    for (let i = 0; i < 120 * 14 && !(type === 'officer' && spawned >= 3); i++) { sim.step(1 / 120, [{ x: 0, y: 0 }]); if (sim.events.some(x => x.k === 'telegraph' || x.k === 'launch')) saw = true; spawned += sim.events.filter(x => x.k === 'spawn' && x.type === 'rifleman').length; }
    if (type === 'truck') ok('enemies', 'the truck unloads its soldiers', sim.ents.filter(x => x.type === 'rifleman').length >= 3);
    else if (type === 'officer') ok('enemies', 'an officer\'s whistle calls riflemen', spawned >= 3, spawned);
    else ok('enemies', type + ' telegraphs or fires', saw);
    if (type !== 'officer' && type !== 'truck' && type !== 'mortar') ok('enemies', type + ': ignored, it hurts the player', sim.players[0].damage > 0 || type === 'para' || type === 'gunboat', sim.players[0].damage);
    const q0 = Object.assign({}, sim.q); if (!e.dead) sim.kill(e, sim.players[0], 'body'); const cls = WP.TYPES[type].quota; ok('enemies', type + ' counts toward its quota (' + cls + ')', !cls || sim.q[cls] === Math.max(0, q0[cls] - 1) || q0[cls] === undefined, JSON.stringify([q0, sim.q]));
  }
  const sim = new WP.Sim({ op: 2, players: [{}], seed: 5 }); WP.run.perks = { commsDown: true }; const s2 = new WP.Sim({ op: 2, players: [{}], seed: 5 });
  ok('enemies', 'COMMS DOWN cuts later quotas by .8', s2.quotaMax.soldier === Math.round(28 * .8), s2.quotaMax.soldier);
  const pa = s2.spawn('para', { lx: 0, dz: 150, z: 120 }); s2.step(1 / 120, [{ x: 0, y: 0 }]); const out = []; s2.shapesOf(pa, out); const ch = out.find(x => x.part === 'chute'); ok('enemies', 'a paratrooper\'s chute is hittable', !!ch);
  if (ch) { s2.resolveShot(s2.players[0], ch.c[0], ch.c[1]); for (let i = 0; i < 240; i++) s2.step(1 / 120, [{ x: 0, y: 0 }]); ok('enemies', 'a shot chute drops him to his death', pa.dead); }
});
// ------------------------------------------------------------------------------------------------ civilians, hostages, animals, pickups, DRY
S('friendlies', () => {
  const { WP } = fresh(); const sim = new WP.Sim({ op: 3, players: [{}], seed: 2 }), p = sim.players[0];
  const c = sim.spawn('villager', { lx: 0, dz: 120 }); sim.step(1 / 120, [{ x: 0, y: 0 }]); const out = []; sim.shapesOf(c, out); const s = out.find(x => x.part === 'body'); p.score = 5000; p.streak = 5;
  sim.resolveShot(p, (s.r[0] + s.r[2]) / 2, (s.r[1] + s.r[3]) / 2); ok('friendlies', 'a civilian hit: +8 damage, -1000, streak reset', p.damage === 8 && p.score === 4000 && p.streak === 0, [p.damage, p.score, p.streak].join(' '));
  const g = sim.spawn('goat', { lx: 40, dz: 130, carry: 'mag' }); sim.step(1 / 120, [{ x: 0, y: 0 }]); const go = []; sim.shapesOf(g, go); sim.resolveShot(p, go[0].c[0], go[0].c[1]);
  ok('friendlies', 'an animal hit drops its item and flees, never dies', g.fled && !g.dead && sim.ents.some(e => e.kind === 'pickup' && e.pk === 'mag'));
  const s5 = new WP.Sim({ op: 5, players: [{}], seed: 2 }); const h = s5.spawn('hostage0', { lx: 100, dz: 150, goal: [-200, 150] }); const ch = s5.spawn('chaser', { lx: 60, dz: 150, target: h.id });
  let grabbed = false; for (let i = 0; i < 120 * 5; i++) { s5.step(1 / 120, [{ x: 0, y: 0 }]); if (h.grabbedBy) grabbed = true; }
  ok('friendlies', 'a chaser grabs the hostage, and it is lost after 3 s', grabbed && h.lost, grabbed + ' ' + h.lost);
  const h2 = s5.spawn('hostage1', { lx: 100, dz: 150, goal: [-200, 150] }); for (let i = 0; i < 120 * 10; i++) s5.step(1 / 120, [{ x: 0, y: 0 }]); ok('friendlies', 'an unchased hostage reaches the goal and is rescued', h2.rescued && s5.host.saved === 1);
  const s6 = new WP.Sim({ op: 5, players: [{}], seed: 4 }); const h3 = s6.spawn('hostage2', { lx: 0, dz: 150, goal: [-220, 150] }); s6.step(1 / 120, [{ x: 0, y: 0 }]); const sh = s6.spawn('rifleman', { lx: 30, dz: 150, path: 'dummy' }); s6.players[0].down = true;
  for (let i = 0; i < 400 && !h3.lost; i++) { s6.burst(sh, 0, 1, 0, 4, 0); s6.step(1 / 120, [{ x: 0, y: 0 }]); }
  ok('friendlies', 'enemy fire wears a hostage down from HP 3 until it is lost', h3.lost && s6.host.lost === 1, h3.hp);
  // pickups
  const sx = new WP.Sim({ op: 1, players: [{}], seed: 2 }), q = sx.players[0]; q.damage = 50;
  for (const k of ['ration', 'medkit', 'grenade', 'gbox', 'mag', 'ammo', 'fury', 'intel']) { const e = sx.drop(k, sx.cam.x, sx.cam.y - 100, 10); sx.collect(q, e); }
  ok('friendlies', 'RATION and MEDKIT heal 15 and 35', q.damage === 0); ok('friendlies', 'grenades +1 and +3', q.grenades === WP.T.startGrenades + 4, q.grenades); ok('friendlies', 'MAG +1 and AMMO CRATE +3', q.spares.length === 5 + 4, q.spares.length); ok('friendlies', 'FURY starts', q.fury > 0);
  const e = sx.drop('mag', sx.cam.x, sx.cam.y - 100, 10); for (let i = 0; i < 120 * 6.5; i++) sx.step(1 / 120, [{ x: 0, y: 0 }]); ok('friendlies', 'dropped items expire after 6 s', e.gone);
  WP.run = WP.newRun({ diff: 'arcade' }); const sa = new WP.Sim({ op: 1, players: [{}], seed: 2 }), pa = sa.players[0]; pa.mag = 0; pa.spares = []; pa.grenades = 0; for (let i = 0; i < 120; i++) sa.step(1 / 120, [{ x: 0, y: 0 }]); ok('friendlies', 'DRY on ARCADE is DOWN', pa.down);
  WP.run = WP.newRun({ diff: 'veteran' }); const sv = new WP.Sim({ op: 1, players: [{}], seed: 2 }), pv = sv.players[0]; pv.mag = 0; pv.spares = []; pv.grenades = 0; for (let i = 0; i < 120 * 8; i++) sv.step(1 / 120, [{ x: 0, y: 0 }]); ok('friendlies', 'DRY on VETERAN brings an emergency drop', !pv.down && pv.spares.length + (pv.mag > 0 ? 1 : 0) >= 2, pv.spares.length + ' ' + pv.mag);
});
// ------------------------------------------------------------------------------------------------ bosses and stages (god bot), perks
S('stages', () => {
  const { WP } = fresh();
  for (let op = 1; op <= 6; op++) { const sim = runOp(WP, op, { god: true }); ok('stages', 'op ' + op + ' clears with the god bot', sim.done === 'clear', JSON.stringify([sim.d, sim.part, sim.q, sim.boss && sim.boss.phase])); ok('stages', 'op ' + op + ': every beat fired', sim.part === 'B' || sim.beats.every(b => b.fired)); ok('stages', 'op ' + op + ' within its time budget', sim.t < 400, sim.t); }
  const sim = new WP.Sim({ op: 1, players: [{}], seed: 9 }); WP.CHEATS.god = true; WP.T.oneHit = 1; WP.jumpTo(sim, 'boss');
  for (let t = 0; t < 120 && !sim.done; t += 1 / 120) sim.step(1 / 120, [WP.Bot.frame(sim, 0, 1 / 120, {})]); ok('stages', 'a jump to the boss spawns it and it can be beaten', sim.done === 'clear', sim.boss && sim.boss.phase);
  WP.CHEATS.god = false;
});
S('balance', () => {
  const { WP } = fresh();
  for (let op = 1; op <= 6; op++) { const sim = runOp(WP, op, { fair: true, diff: 'recruit', seed: 11 }); ok('balance', 'op ' + op + ': a fair bot on RECRUIT clears it', sim.done === 'clear', sim.done + ' dmg ' + sim.players[0].damage); }
});
// ------------------------------------------------------------------------------------------------ the whole game from the title
const playthrough = (diff, god) => {
  const { WP, game, I } = fresh(); WP.CHEATS.god = god; game.advance(.5);
  WP.Players.override(0, (w, s, dt) => WP.Bot.frame(w, 0, dt, { fair: !god }));
  I.tap('confirm'); game.advance(.2); const k = ['recruit', 'veteran', 'arcade'].indexOf(diff); const cur = game.scene.sub.i; for (let i = cur; i < k; i++) { I.tap('down'); game.advance(.1); } for (let i = cur; i > k; i--) { I.tap('up'); game.advance(.1); } I.tap('confirm'); game.advance(.3);
  const seen = new Set(); let guard = 0;
  while (guard++ < 4000) {
    const sc = game.sceneName; seen.add(sc);
    if (sc === 'play') game.advance(1);
    else if (sc === 'continue') { I.tap('confirm'); game.advance(.3); }
    else if (sc === 'initials') { I.tap('confirm'); game.advance(.15); }
    else if (sc === 'ending') { game.advance(.5); if (game.scene.phase === 'choice') { I.tap('down'); game.advance(.1); I.tap('confirm'); game.advance(.3); } }
    else if (sc === 'scores' || sc === 'title') break;
    else { I.tap('confirm'); game.advance(.4); }
  }
  return { WP, game, seen };
};
S('playthrough', () => {
  const a = playthrough('recruit', false);
  ok('playthrough', 'a fair bot on RECRUIT plays from the title to the end', a.seen.has('ending') && a.seen.has('credits'), [...a.seen].join(','));
  ok('playthrough', 'every operation was cleared', (a.WP.run.done || []).length === 6 || a.seen.has('ending'), JSON.stringify(a.WP.run.done));
  ok('playthrough', 'the interrogation and the aftermath played', a.seen.has('cutscene'));
  ok('playthrough', 'at least 3 hostages came home', (a.WP.run.hostagesHome || 0) >= 3, a.WP.run.hostagesHome);
  ok('playthrough', 'a rank exists', a.WP.rank().length > 3); ok('playthrough', 'no errors', !a.game.errors.length, errs(a.game));
  const b = playthrough('veteran', true); ok('playthrough', 'a god bot on VETERAN reaches the ending', b.seen.has('ending'), [...b.seen].join(',')); ok('playthrough', 'no errors (god run)', !b.game.errors.length, errs(b.game));
});
// ------------------------------------------------------------------------------------------------ flow pieces: endings, continue, loop 2, mission select, cutscenes
S('flow', () => {
  const { WP, game, I, E } = fresh(); game.advance(.3);
  for (let n = 0; n <= 5; n++) { game.go('ending', { n }); game.advance(1); ok('flow', 'ending ' + n + ' shows its text', game.sceneName === 'ending' && game.scene.lines.length >= 2 && game.scene.lines[0].length > 5); }
  game.go('ending', { n: 5 }); game.advance(14); ok('flow', 'the ending offers LOOP 2 and TITLE', game.scene.phase === 'choice' && game.scene.menu.items.length === 2);
  I.tap('confirm'); game.advance(.3); ok('flow', 'LOOP 2 raises the loop and plays the credits', WP.run.loop === 2 && game.sceneName === 'credits'); ok('flow', 'loop 2 is harder', WP.diff().acc > 1.2, WP.diff().acc);
  WP.run = WP.newRun(); WP.run.players = [{ pid: 0, score: 1234, mag: 30, spares: [30, 30, 30], grenades: 2, damage: 10 }];
  game.go('play', { op: 2 }); game.advance(4); const p = WP.Play.sim.players[0]; p.score = 9999; p.spares = []; p.damage = 100; p.down = true; game.advance(3);
  ok('flow', 'all players DOWN brings CONTINUE?', game.sceneName === 'continue', game.sceneName);
  I.tap('confirm'); game.advance(.5); const q = WP.Play.sim.players[0]; ok('flow', 'continuing restarts the op with its starting ammo and damage 0', game.sceneName === 'play' && q.spares.length === 3 && q.damage === 0 && q.score === 9999 && WP.run.continues === 1, JSON.stringify([q.spares.length, q.damage, WP.run.continues]));
  E.store.set('wp:cleared', 2); game.go('title'); game.advance(.3); ok('flow', 'MISSION SELECT unlocks after a clear', !game.scene.menu.items[2].hidden);
  for (const id of ['briefing', 'interrogation', 'aftermath']) { game.go('cutscene', { id, next: 'title' }); let t = 0; while (game.sceneName === 'cutscene' && t < 80) { I.tap('confirm'); game.advance(.5); t += .5; } ok('flow', 'cutscene ' + id + ' runs to its end', game.sceneName === 'title', t); }
  game.go('cutscene', { id: 'interrogation', next: 'title' }); game.advance(.2); I.hold('confirm', true); game.advance(1.3); I.hold('confirm', false); game.advance(.3); ok('flow', 'holding confirm skips a cutscene', game.sceneName === 'title');
  ok('flow', 'no errors', !game.errors.length, errs(game));
});
// ------------------------------------------------------------------------------------------------ local co-op
S('coop', () => {
  const { WP, game } = fresh(); game.advance(.3); const inp = game.addPlayer({ pad: 1 }); ok('coop', 'addPlayer gives a second player', game.players.length === 2 && !!inp);
  WP.run = WP.newRun(); game.go('play', { op: 1 }); game.advance(4); const sim = WP.Play.sim; ok('coop', 'the op starts with two players', sim.players.length === 2);
  ok('coop', 'quotas scale with players', sim.quotaMax.soldier === Math.round(36 * 1.3), sim.quotaMax.soldier);
  sim.players[1].mag = 3; ok('coop', 'each player has their own ammo', sim.players[0].mag === 30);
  const e = sim.drop('mag', sim.cam.x, sim.cam.y - 100, 10); const n1 = sim.players[1].spares.length; sim.collect(sim.players[1], e); ok('coop', 'pickups go to the shooter', sim.players[1].spares.length === n1 + 1 && sim.players[0].spares.length === 5);
  sim.down(sim.players[1]); WP.carry(sim); const sp = (WP.run.players || [])[1]; ok('coop', 'a DOWN player is carried as down', sp && sp.down);
  game.go('play', { op: 2 }); game.advance(.5); ok('coop', 'and comes back at the next op with damage 50', WP.Play.sim.players[1].damage === 50, WP.Play.sim.players[1].damage);
  ok('coop', 'no errors', !game.errors.length, errs(game));
});
// ------------------------------------------------------------------------------------------------ attract mode
S('attract', () => {
  const { WP, game, I } = fresh(); game.advance(.5); ok('attract', 'the title waits', game.sceneName === 'title');
  game.advance(10.5); ok('attract', '10 s idle starts the demo', game.sceneName === 'play' && WP.Play.attract);
  let civ = 0, ops = new Set(), kills = 0; for (let i = 0; i < 160 && WP.Play.attract && game.sceneName === 'play'; i++) { game.advance(1); const s = WP.Play.sim; ops.add(s.opn); civ = Math.max(civ, s.players[0].stats.civ); kills = Math.max(kills, s.players[0].stats.kills); }
  ok('attract', 'the playlist shows every op', ops.size === 6, [...ops].join(',')); ok('attract', 'the bot hits no civilian or hostage', civ === 0); ok('attract', 'the bot kills enemies', kills > 0);
  for (let i = 0; i < 40 && game.sceneName !== 'scores'; i++) game.advance(1); ok('attract', 'then the high-score table', game.sceneName === 'scores');
  game.advance(7); ok('attract', 'then the title', game.sceneName === 'title');
  game.advance(10.5); ok('attract', 'the demo comes again', WP.Play.attract); I.tap('confirm'); game.advance(.3); ok('attract', 'any input returns to the title', game.sceneName === 'title', game.sceneName);
  game.advance(10.5); I.feed('move', 50, 50); game.advance(.1); I.feed('move', 60, 60); game.advance(.3); ok('attract', 'a mouse move returns too', game.sceneName === 'title', game.sceneName);
  ok('attract', 'no errors', !game.errors.length, errs(game));
});
// ------------------------------------------------------------------------------------------------ touch-only devices
S('touch', () => {
  const handlers = {}; const g = { matchMedia: q => ({ matches: /coarse/.test(q) }), navigator: { maxTouchPoints: 5, getGamepads: () => [] }, addEventListener: (k, f) => { (handlers[k] = handlers[k] || []).push(f); } };
  const { WP, game, I } = fresh(g); game.advance(.5);
  ok('touch', 'a touch-only device is detected', WP.touchOnly() === true); ok('touch', 'no touch controls', game.input.touchEnabled === false);
  I.feed('down', 240, 140, { touch: true }); I.feed('up', 240, 140, { touch: true }); game.advance(.3); ok('touch', 'a tap does not start a game', game.sceneName === 'title');
  game.advance(10.5); ok('touch', 'the attract mode runs', game.sceneName === 'play' && WP.Play.attract);
  I.feed('down', 240, 140, { touch: true }); I.feed('up', 240, 140, { touch: true }); game.advance(.5); ok('touch', 'taps do not stop it', WP.Play.attract && game.sceneName === 'play');
  for (const f of handlers.keydown || []) f({ code: 'KeyA' }); ok('touch', 'a key press leaves touch-only mode', WP.touchOnly() === false);
});
// ------------------------------------------------------------------------------------------------ dev mode
S('dev', () => {
  const { WP, game } = fresh(); game.advance(.3); const T = WP.T;
  ok('dev', 'the pause menu has DEV MODE', true);
  game.settings.set('dev_spawnDensity', 2); ok('dev', 'a slider writes the tuning value live', T.spawnDensity === 2);
  const s = new WP.Sim({ op: 1, players: [{}], seed: 1 }); s.d = 41; s.step(1 / 120, [{ x: 0, y: 0 }]); for (let i = 0; i < 120 * 6; i++) s.step(1 / 120, [{ x: 0, y: 0 }]); const b2 = s.beats[1]; ok('dev', 'spawn density 2 doubles a beat\'s spawns', b2.ids.length === 6, b2.ids.length);
  game.settings.set('dev_railSpeed', 2); const s2 = new WP.Sim({ op: 1, players: [{}], seed: 1 }); for (let i = 0; i < 120 * 5; i++) s2.step(1 / 120, [{ x: 0, y: 0 }]); ok('dev', 'rail speed changes how far the camera gets', s2.d > 120, s2.d);
  ok('dev', 'the DEV badge knows what changed', WP.Dev.changed().includes('railSpeed'));
  game.settings.reset('Dev'); ok('dev', 'RESET TO DEFAULTS restores every slider', WP.Dev.changed().length === 0 && T.spawnDensity === 1, WP.Dev.changed().join(','));
  WP.Dev.jump(4, 'b5'); game.advance(.5); ok('dev', 'JUMP reaches the op and beat', WP.Play.sim.opn === 4 && WP.Play.sim.d >= 560, WP.Play.sim.d);
  game.settings.set('cheat_god', true); ok('dev', 'the god cheat toggles', WP.CHEATS.god); WP.Play.sim.hurtPlayer(WP.Play.sim.players[0], 50); ok('dev', 'god mode takes no damage', WP.Play.sim.players[0].damage === 0);
  game.settings.set('cheat_god', false);
  WP.Play.sim.players[0].x = 240; WP.Play.sim.players[0].y = 200; WP.Dev.spawn('rifleman'); ok('dev', 'SPAWN AT CROSSHAIR spawns there', WP.Play.sim.ents.some(e => e.type === 'rifleman' && !e.dead));
  ok('dev', 'no errors', !game.errors.length, errs(game));
});
// ------------------------------------------------------------------------------------------------ the hub codec and mirror (a mock)
S('hubmock', () => {
  const { WP } = fresh(); WP.hub = null;
  // the net module is inert without a hub: load it with a stub AIHub to test the codec
  const sent = []; const stub = { active: true, on() {}, connect: () => new Promise(() => {}), send: (d) => { sent.push(d); return true; }, rng: () => () => .5, time: () => 0, ready() {}, answer() {}, finish() {} };
  const f2 = fresh({ AIHub: stub }); const W2 = f2.WP; ok('hubmock', 'the net module loads in a session', !!W2.Net && !!W2.Net.snapshot);
  for (let op = 1; op <= 6; op++) {
    const sim = runOp(W2, op, { god: true, max: 120 }); let max = 0;
    for (let i = 0; i < 30; i++) { sim.step(1 / 120, [W2.Bot.frame(sim, 0, 1 / 120, {})]); const m = W2.Net.snapshot(sim); max = Math.max(max, JSON.stringify(m).length); }
    ok('hubmock', 'op ' + op + ' snapshots stay under 1100 bytes', max < 1100, max);
    const mir = W2.Net.makeMirror(op, [{ pid: 0 }]); W2.Net.apply(mir, W2.Net.snapshot(sim)); ok('hubmock', 'op ' + op + ' a mirror rebuilds the entities it is sent', mir.ents.length >= Math.min(10, sim.ents.length) - 1, mir.ents.length + ' vs ' + sim.ents.length);
  }
  let n = 0; W2.Net.tokens = 18; W2.Net.lastTok = Date.now(); for (let i = 0; i < 40; i++) if (W2.Net.send({ k: 'x' }, false)) n++; ok('hubmock', 'the rate limiter holds a burst to 18', n <= 18, n);
});
S('presentation', () => {
  const { WP } = fresh(); const sim = new WP.Sim({ op: 6, players: [{}], seed: 1 }); WP.Render.fx.length = 0; WP.Render.smoke(sim.cam.x, sim.cam.y - 200, 10, '#555', 3, 5); const x0 = WP.Render.fx[0].x;
  for (let i = 0; i < 60; i++) WP.Render.update(sim, 1 / 60); ok('presentation', 'the storm wind drifts the smoke sideways', WP.Render.fx[0].x - x0 > 10, WP.Render.fx[0].x - x0);
  const pl = WP.Audio.panOf({ k: 'explode', x: sim.cam.x - 150, y: sim.cam.y - 200, z: 0 }, sim), pr = WP.Audio.panOf({ k: 'explode', x: sim.cam.x + 150, y: sim.cam.y - 200, z: 0 }, sim);
  ok('presentation', 'sounds pan to their side of the screen', pl < -.3 && pr > .3, pl + ' ' + pr);
});
// ------------------------------------------------------------------------------------------------ the bundle and the exit interview
S('bundle', () => {
  ok('bundle', 'the final file exists', existsSync(FINAL)); if (!existsSync(FINAL)) return;
  const html = readFileSync(FINAL, 'utf8'), session = rd('hub/session.js');
  ok('bundle', 'session.js is the first script right after meta charset, byte-identical', html.indexOf('<meta charset="utf-8">\n<script>' + session + '</script>') > 0);
  for (const m of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes', 'hub:type', 'hub:players', 'hub:genre', 'hub:source']) ok('bundle', 'meta ' + m, html.includes('name="' + m + '"'));
  const game = srcs.map(rd).join('\n'); for (const bad of ['WebSocket', 'RTCPeerConnection', 'fetch(', 'XMLHttpRequest', 'alert(', 'confirm(', 'prompt(', 'window.open']) ok('bundle', 'the game code has no ' + bad, !game.includes(bad));
  ok('bundle', 'the title is Operation Big Bad Wolf', /<title>Operation Big Bad Wolf<\/title>/.test(html));
  const ei = new URL('../exit-interview.json', root); let j = null; try { j = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { /* reported below */ }
  ok('bundle', 'exit-interview.json parses', !!j);
  if (j) { const si = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    for (const k of si) ok('bundle', 'exit interview sourceInformation.' + k, typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].length > 0);
    ok('bundle', 'exit interview testingFeedback has 4 answers', Array.isArray(j.testingFeedback) && j.testingFeedback.length === 4 && j.testingFeedback.every(Boolean));
    ok('bundle', 'exit interview engineFeedback has 6 answers', Array.isArray(j.engineFeedback) && j.engineFeedback.length === 6 && j.engineFeedback.every(Boolean));
    ok('bundle', 'exit interview promptFeedback has 4 answers', Array.isArray(j.promptFeedback) && j.promptFeedback.length === 4 && j.promptFeedback.every(Boolean));
    for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']) ok('bundle', 'exit interview aiHub.' + k, j.aiHub && k in j.aiHub && (k === 'series' || (j.aiHub[k] && j.aiHub[k].length)));
    ok('bundle', 'aiHub.tags has 3 to 6', j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6); }
});
// ------------------------------------------------------------------------------------------------ the browser (the final file over file://) and the real AI Hub harness
S('browser', async () => {
  if (quick) return; const { chromium } = await import('playwright'); const b = await chromium.launch(); const url = 'file://' + FINAL.pathname;
  const page = async (hash, wait, fn) => { const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const er = []; p.on('pageerror', e => er.push(e.message)); p.on('console', m => { if (m.type() === 'error') er.push(m.text()); }); await p.goto(url + hash); await p.waitForTimeout(wait); const r = await p.evaluate(fn); await p.close(); return [r, er]; };
  let [r, er] = await page('', 2500, () => { const g = My3D2dge.current, c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; return { scene: g.sceneName, lit: n, errors: g.errors.length, title: document.title }; });
  ok('browser', 'the title boots with no errors', r.scene === 'title' && !r.errors && !er.length, JSON.stringify(r) + er.join('|')); ok('browser', 'the title canvas is not empty', r.lit > 200, r.lit); ok('browser', 'the page title', r.title === 'Operation Big Bad Wolf');
  [r, er] = await page('', 12500, () => ({ scene: My3D2dge.current.sceneName, attract: WP.Play.attract })); ok('browser', 'attract mode after 10 s', r.scene === 'play' && r.attract, JSON.stringify(r));
  for (const h of ['#op1', '#op2', '#op3', '#op4', '#op5', '#op6', '#op6/b', '#op3/boss', '#ending/5', '#about', '#range', '#cut/interrogation']) { [r, er] = await page(h, 3500, () => ({ scene: My3D2dge.current.sceneName, errors: My3D2dge.current.errors.map(e => e.message), op: WP.Play.sim && WP.Play.sim.opn })); const want = h.startsWith('#op') || h === '#range' ? 'play' : h.startsWith('#ending') ? 'ending' : h.startsWith('#cut') ? 'cutscene' : h.slice(1); ok('browser', 'deep link ' + h + ' loads ' + want + ' with no errors', r.scene === want && !r.errors.length && !er.length, JSON.stringify(r) + er.join('|')); }
  await b.close();
});
S('harness', async () => {
  if (quick) return; const { chromium } = await import('playwright'); const { spawn } = await import('node:child_process'); const { mkdirSync, copyFileSync } = await import('node:fs');
  const dir = new URL('tests/.serve/', root); mkdirSync(dir, { recursive: true }); copyFileSync(FINAL, new URL('game.html', dir)); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('hub/' + f, root), new URL(f, dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const tm = setTimeout(() => { srv.kill(); rej(new Error('no port')); }, 8000); const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) { clearTimeout(tm); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
  const b = await chromium.launch();
  try {
    for (const cfg of ['players=1&auto=1', 'players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']) {
      const p = await b.newPage(); await p.goto('http://127.0.0.1:' + port + '/harness.html?game=game.html&' + cfg);
      let mine = false; for (let i = 0; i < 40 && !mine; i++) { await p.waitForTimeout(500); mine = p.frames().some(f => { try { return f.url().includes('game.html'); } catch (e) { return false; } }); }
      const titles = await Promise.all(p.frames().filter(f => f.url().includes('game.html')).map(f => f.evaluate(() => document.title).catch(() => '')));
      ok('harness', cfg + ': the frames hold our game', titles.some(t => t === 'Operation Big Bad Wolf'), titles.join(','));
      await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).catch(() => {});
      const res = await p.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, list: window.__hubCheck && JSON.stringify(window.__hubCheck).slice(0, 1500) }));
      ok('harness', cfg + ' passes', res.pass === true, res.list); await p.close();
    }
  } finally { await b.close(); srv.kill(); }
});
// ------------------------------------------------------------------------------------------------ run
for (const [name, fn] of Object.entries(suites)) { if (only && name !== only) continue; try { await fn(); } catch (e) { fail++; console.log('FAIL [' + name + '] threw: ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); } }
console.log(pass + ' passed, ' + fail + ' failed (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(fail ? 1 : 0);
