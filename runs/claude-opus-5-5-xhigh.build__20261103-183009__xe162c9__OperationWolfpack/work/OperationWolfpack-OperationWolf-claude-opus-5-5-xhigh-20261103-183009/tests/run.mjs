// npm test: every suite; prints only failures, then one line "N passed, M failed (T s)".
// --quick: headless suites only (no browser, no harness). --only <suite>: one suite.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load, ROOT, manifest } from './lib.mjs';
import { playthrough } from './playthrough.mjs';
import { hubMock } from './hub-mock.mjs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let passed = 0, failed = 0; const t0 = Date.now();
const S = {};
const suite = (name, fn) => { S[name] = fn; };
const ok = (name, what, cond, detail = '') => { if (cond) passed++; else { failed++; console.log(`FAIL [${name}] ${what}${detail ? ': ' + String(detail).slice(0, 300) : ''}`); } };
const dt = 1 / 120;
const mkSim = (WP, op, o = {}) => { WP.Flow.newRun({ diff: o.diff || 'VETERAN' }); const sim = new WP.Sim(Object.assign({ stage: op, seed: o.seed || 3, players: o.players || [{ pid: 0 }], run: WP.Flow.run, cheats: o.cheats || {} }, o.sim || {})); return sim; };
const clearRange = (sim) => { sim.ents.forEach(e => { if (e.type !== 'target') e.gone = true; }); sim.ents = sim.ents.filter(e => !e.gone); sim.stage = Object.assign({}, sim.stage, { step: () => {} }); sim.beats.forEach(b => b.fired = b.cleared = true); };
const run = (sim, secs, frame) => { const out = []; for (let i = 0; i < secs * 120; i++) { sim.step(dt, { 0: typeof frame === 'function' ? frame(i) : frame || { x: 240, y: 120 } }); out.push(...sim.drain()); } return out; };
const aimAt = (sim, e, part = 'body') => { sim.buildShapes(); const s = sim.shapes.find(q => q.e === e && q.part === part); return s ? WP_.Hit.center(s) : null; };
let WP_ = null;
// ---------------------------------------------------------------- core
suite('core', () => {
  const { WP } = load(); WP_ = WP;
  const hashRun = () => { const sim = mkSim(WP, 'op1', { seed: 9 }); const bot = WP.Bot.make({ seed: 4 }); for (let i = 0; i < 120 * 60; i++) sim.step(dt, { 0: WP.Bot.frame(bot, sim, sim.players[0], dt) }); return WP.hash(JSON.stringify(sim.snapshot())); };
  ok('core', 'the same seed and frames give the same game (60 s of bot play)', hashRun() === hashRun());
  const files = manifest.src.map(f => [f, readFileSync(join(ROOT, f), 'utf8')]);
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"])\/\/.*$/gm, '$1');
  ok('core', 'no Math.random in src', files.every(([, s]) => !/Math\.random/.test(strip(s))), files.filter(([, s]) => /Math\.random/.test(strip(s))).map(f => f[0]).join(','));
  ok('core', 'no TODO, FIXME, placeholder or lorem in src', files.every(([, s]) => !/\bTODO\b|\bFIXME\b|placeholder|lorem ipsum/i.test(s)), files.filter(([, s]) => /\bTODO\b|\bFIXME\b|placeholder|lorem ipsum/i.test(s)).map(f => f[0]).join(','));
  const empty = []; const walk = (o, p) => { if (typeof o === 'string') { if (!o.trim()) empty.push(p); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], p + '.' + k); };
  walk(Object.assign({}, WP.TEXT, { about: WP.TEXT.about.map(pg => ({ title: pg.title, lines: pg.lines.map(l => l[1]) })) }), 'TEXT'); ok('core', 'no empty WP.TEXT value', !empty.length, empty.join(','));
  ok('core', 'six operations and six bosses', WP.OPS.every(o => WP.STAGE[o] && (WP.STAGE[o].boss || o === 'op6')) && ['bigEar', 'crocodile', 'warthog', 'ironHog', 'tusk', 'hyenaOne'].every(b => WP.BOSS_DEF[b]));
});
// ---------------------------------------------------------------- projection and hit shapes
suite('proj', () => {
  const { WP, E } = load(); WP_ = WP;
  const V = new WP.View3D(); V.begin({ x: 100, y: WP.Y0, h: 28, angle: -Math.PI / 2, pitch: 6, fov: 60 });
  let worst = 0; for (const [x, D] of [[80, 60], [140, 200], [40, 400], [300, 800]]) { const p = V.project(x, WP.Y0 - D, 0), f = V.toFloor(p[0], p[1]); worst = Math.max(worst, Math.hypot(f[0] - x, f[1] - (WP.Y0 - D))); }
  ok('proj', 'project and toFloor round trip', worst < .05, worst);
  const p = V.project(100 + V.halfWidth(300), WP.Y0 - 300, 0); ok('proj', 'halfWidth reaches the screen edge', Math.abs(p[0] - WP.W) < 1, p[0]);
  // a rig's hit shapes against its calibrated drawn height, at 4 depths and 3 poses
  for (const D of [60, 200, 400, 800]) for (const pose of [null, 'kneel', 'crouch']) {
    const e = { id: 1, type: 'rifleman', x: 100, y: WP.Y0 - D, z: 0, pose, dead: false }, out = [];
    WP.BEH['shapes:infantry']({}, e, out, V);
    const pr = V.project(100, WP.Y0 - D, 0), H = WP.Hit.rigH(WP.TYPES.rifleman, e) * V.q(pr[2]), head = out.find(s => s.part === 'head');
    ok('proj', 'the head sits in the top 15% of the drawn rig (depth ' + D + ', ' + (pose || 'stand') + ')', head && pr[1] - head.cy > H * .8 && pr[1] - head.cy < H, head && (pr[1] - head.cy) / H);
  }
});
// ---------------------------------------------------------------- input
suite('input', () => {
  const { WP, game } = load(); WP_ = WP; const I = game.input;
  game.settings.set('glyphs', 'playstation'); ok('input', 'R2 for fire on a DualSense', I.label('fire', 'gamepad') === 'R2', I.label('fire', 'gamepad'));
  ok('input', '□ for reload, ✕ to confirm', I.label('reload', 'gamepad') === '□' && I.label('confirm', 'gamepad') === '✕');
  game.settings.set('symbols', 'xbox'); ok('input', 'RT with Xbox symbols (Settings > Button symbols)', I.label('fire', 'gamepad') === 'RT', I.label('fire', 'gamepad'));
  game.settings.set('symbols', 'playstation');
  ok('input', 'Left click for fire after mouse use', I.label('fire', 'mouse') === 'Left click', I.label('fire', 'mouse'));
  ok('input', 'Space for fire on the keyboard', I.label('fire', 'keyboard') === 'Space');
  const sim = mkSim(WP, 'range'); clearRange(sim);
  WP.Input.reset(); const before = WP.Input.local(game, sim, I, 0, 0, dt).x;
  I.press('KeyD'); for (let i = 0; i < 60; i++) WP.Input.local(game, sim, I, 0, 0, dt); I.release('KeyD');
  ok('input', 'keys move the crosshair (WASD)', WP.Input.cross[0].x > before + 100, WP.Input.cross[0].x - before);
  WP.Input.reset(); I.padMove = [1, 0]; for (let i = 0; i < 60; i++) WP.Input.local(game, sim, I, 0, 0, dt); I.padMove = [0, 0];
  ok('input', 'a stick moves the crosshair', WP.Input.cross[0].x > WP.W * .42 + 150, WP.Input.cross[0].x);
  I.feed('move', 100, 80); I.aimSource = 'mouse'; game.advance(dt); const f = WP.Input.local(game, sim, I, 0, 0, dt);
  ok('input', 'the mouse aims absolutely', Math.abs(f.x - 100) < 1.5 && Math.abs(f.y - 80) < 1.5, f.x + ',' + f.y);
  // snap to the threat
  I.aimSource = 'pad'; WP.Input.reset(); const e = sim.spawn('rifleman', { lx: 120, dz: 150, beh: 'stand', cycles: 9 }); run(sim, 1.2);
  sim.buildShapes(); I.tap('snap'); game.advance(dt); for (let i = 0; i < 20; i++) WP.Input.local(game, sim, I, 0, 0, dt);
  const c = WP.Hit.center(sim.shapes.find(s => s.e === e && s.part !== 'legs')); ok('input', 'snap goes to the telegraphing enemy', Math.hypot(WP.Input.cross[0].x - c[0], WP.Input.cross[0].y - c[1]) < 25, [WP.Input.cross[0].x, WP.Input.cross[0].y, c]);
});
// ---------------------------------------------------------------- weapon
suite('weapon', () => {
  const { WP } = load(); WP_ = WP;
  let sim = mkSim(WP, 'range'); clearRange(sim); const p = sim.players[0];
  const evs = run(sim, 1, { x: 240, y: 20, fire: true });
  ok('weapon', '11 rounds in a second of held fire', evs.filter(e => e.k === 'shot').length === 11, evs.filter(e => e.k === 'shot').length);
  ok('weapon', 'the magazine counts down', p.mag === 19, p.mag);
  ok('weapon', 'bloom stays within its maximum', p.bloom <= WP.T.bloomMax + 1e-9);
  run(sim, 19 / 11 + .02, { x: 240, y: 20, fire: true }); ok('weapon', 'the magazine runs dry', p.mag === 0, p.mag);
  run(sim, .2, { x: 240, y: 20 }); ok('weapon', 'auto-reload .12 s after running dry', p.reloadT > 0, p.reloadT);
  run(sim, .75, { x: 240, y: 20 }); ok('weapon', 'the reload takes 1.0 s', p.reloadT > 0 && p.mag === 0, p.reloadT);
  run(sim, .2, { x: 240, y: 20 }); ok('weapon', 'the reload loads a full magazine', p.mag === 30 && p.spares.length === 4, p.mag + ' / ' + p.spares.length);
  run(sim, .5, { x: 240, y: 20, fire: true }); const left = p.mag; run(sim, dt, { x: 240, y: 20, reload: 1 }); run(sim, 1.2, { x: 240, y: 20 });
  ok('weapon', 'a part-used magazine goes back into the pouch', p.spares.includes(left), left + ' in ' + p.spares);
  p.mag = 0; p.spares = []; const ev2 = run(sim, .3, { x: 240, y: 20, fire: true });
  ok('weapon', 'firing on empty clicks', ev2.some(e => e.k === 'dryClick'));
  sim = mkSim(WP, 'range'); clearRange(sim); const q = sim.players[0]; q.fury = 10; const ev3 = run(sim, 1, { x: 240, y: 20, fire: true });
  ok('weapon', 'FURY doubles the rate and uses no ammo', ev3.filter(e => e.k === 'shot').length === 22 && q.mag === 30, ev3.filter(e => e.k === 'shot').length + ' shots, mag ' + q.mag);
});
// ---------------------------------------------------------------- hits
suite('hit', () => {
  const { WP } = load(); WP_ = WP;
  const sim = mkSim(WP, 'range'); clearRange(sim); WP.T.spreadBase = 0; const bm = WP.T.bloomMax; WP.T.bloomMax = 0;
  const r = sim.spawn('rifleman', { lx: 0, dz: 120, beh: 'stand', cycles: 9 }); run(sim, .1);
  const h = aimAt(sim, r, 'head'); const ev = run(sim, dt * 2, { x: h[0], y: h[1], fire: true });
  ok('hit', 'a head shot kills a rifleman, part head', ev.some(e => e.k === 'kill' && e.part === 'head'), JSON.stringify(ev.filter(e => e.k === 'kill')));
  const b = sim.spawn('brute', { lx: 40, dz: 120, beh: 'stand', cycles: 9 }); run(sim, .1);
  const bh = aimAt(sim, b, 'head'); run(sim, 1 / 11 * 1.5, { x: bh[0], y: bh[1], fire: true });
  ok('hit', 'a BRUTE dies to 2 head shots (x4)', b.dead, b.hp);
  const b2 = sim.spawn('brute', { lx: -40, dz: 120, beh: 'stand', cycles: 9 }); run(sim, .1);
  const bb = aimAt(sim, b2, 'body'); run(sim, 1 / 11 * 2.5, { x: bb[0], y: bb[1], fire: true });
  ok('hit', 'a BRUTE survives 3 body shots (8 HP)', !b2.dead && b2.hp <= 5.01, b2.hp);
  // cover blocks: a pop-up behind sandbags, shot at the sandbags
  const sb = sim.addProp(['sandbags', 'sbT', 0, 90]); const pu = sim.spawn('rifleman', { beh: 'popup', cover: 'sbT', cycles: 9 }); run(sim, 1);
  sim.buildShapes(); const cs = sim.shapes.find(s => s.e === sb), c = WP.Hit.center(cs); const ev2 = run(sim, dt, { x: c[0], y: c[1] + 2, fire: true });
  ok('hit', 'cover stops the bullet', ev2.some(e => e.k === 'shot' && e.what === 'cover') && !pu.dead);
  // a projectile shot out of the air
  const w = sim.view.toWorld(0, 160); const pj = WP.Proj.launch(sim, { x: w[0], y: w[1], z: 0, id: 0 }, 'rocket', 0, [w[0], w[1], 30]); run(sim, .2);
  sim.buildShapes(); const ps = sim.shapes.find(s => s.e === pj); const pc = WP.Hit.center(ps); const ev3 = run(sim, dt, { x: pc[0], y: pc[1], fire: true });
  ok('hit', 'a rocket is shot down (an intercept)', ev3.some(e => e.k === 'intercept') && sim.players[0].intercepts === 1);
  // a pickup goes to the shooter
  const pk = WP.Supply.drop(sim, w[0] + 90, w[1] + 40, 20, 'gren'); run(sim, 1.5); sim.buildShapes(); const pks = sim.shapes.find(s => s.e === pk); const g0 = sim.players[0].grenades;
  if (pks) { const kc = WP.Hit.center(pks); run(sim, dt * 2, { x: kc[0], y: kc[1], fire: true }); }
  ok('hit', 'a shot pickup goes to the shooter', sim.players[0].grenades === g0 + 1, g0 + ' -> ' + sim.players[0].grenades);
  const fresh = mkSim(WP, 'range'); clearRange(fresh); const ev4 = run(fresh, dt * 2, { x: 40, y: 226, fire: true }); ok('hit', 'a miss puffs dust on the floor', ev4.some(e => e.k === 'shot' && e.what === 'floor'));
  WP.T.spreadBase = 1.5; WP.T.bloomMax = bm;
});
// ---------------------------------------------------------------- grenades
suite('grenade', () => {
  const { WP } = load(); WP_ = WP;
  const sim = mkSim(WP, 'range'); clearRange(sim);
  const a = sim.spawn('rifleman', { lx: 0, dz: 150, beh: 'stand', cycles: 9 }), far = sim.spawn('rifleman', { lx: 120, dz: 150, beh: 'stand', cycles: 9 }), j = sim.spawn('jeep', { lx: -30, dz: 160, beh: 'truck' });
  const v = sim.spawn('villager', { lx: 20, dz: 160 }); v.speed = 0; v.mvx = v.mvy = 0;
  run(sim, .05); const g0 = sim.players[0].grenades; const at = aimAt(sim, a, 'legs');
  run(sim, dt, { x: at[0], y: at[1], grenade: 1 }); run(sim, 1.5);
  ok('grenade', 'a throw uses a grenade', sim.players[0].grenades === g0 - 1);
  ok('grenade', 'the blast kills inside its radius', a.dead); ok('grenade', 'and spares outside it', !far.dead);
  ok('grenade', 'vehicles take the damage', j.hp < j.maxHp, j.hp); ok('grenade', 'a civilian inside is hurt (a penalty)', v.wounded && sim.players[0].civHits === 1);
  const b1 = sim.addProp(['barrel', 'x1', sim.cam.x + 60, 140]), b2 = sim.addProp(['barrel', 'x2', sim.cam.x + 100, 140]);
  WP.propHit(sim, b1, 99, sim.players[0]); run(sim, .5); ok('grenade', 'red barrels chain', b2.dead);
});
// ---------------------------------------------------------------- enemies
suite('enemies', () => {
  const { WP } = load(); WP_ = WP;
  for (const t of ['rifleman', 'grenadier', 'knife', 'brute', 'rpg', 'sniper', 'mortar', 'para']) {
    const sim = mkSim(WP, 'range'); clearRange(sim);
    const e = sim.spawn(t, t === 'para' ? { lx: 0, dz: 140, z: 30 } : t === 'mortar' ? { lx: 0, dz: 300 } : { lx: 0, dz: t === 'knife' ? 80 : 160, beh: t === 'sniper' ? 'snipe' : 'stand', cycles: 9 });
    const ev = run(sim, 14);
    ok('enemies', t + ' attacks an idle player', sim.players[0].damage > 0, sim.players[0].damage);
    ok('enemies', t + ' telegraphs or throws first', ev.some(x => x.k === 'telegraph' || x.k === 'proj'));
    if (!e.dead) { sim.kill(e, 0, 'body'); }
    ok('enemies', t + ' counts toward the soldier quota', WP.TYPES[t].quota === 'soldier');
  }
  // the officer: a whistle calls 3 riflemen (2 after COMMS DOWN)
  for (const perk of [false, true]) {
    const sim = mkSim(WP, 'range'); clearRange(sim); if (perk) sim.perks.commsDown = true;
    sim.spawn('officer', { lx: 0, dz: 160, beh: 'officer', noWalk: true }); const ev = run(sim, 4);
    ok('enemies', 'a finished whistle calls ' + (perk ? 2 : 3), ev.filter(x => x.k === 'spawn' && x.type === 'rifleman').length === (perk ? 2 : 3), ev.filter(x => x.k === 'spawn' && x.type === 'rifleman').length);
  }
  { const sim = mkSim(WP, 'range'); clearRange(sim); const o = sim.spawn('officer', { lx: 0, dz: 160, beh: 'officer', noWalk: true }); run(sim, 1); sim.kill(o, 0, 'body'); const ev = run(sim, 3); ok('enemies', 'killing the officer during the whistle cancels it', !ev.some(x => x.k === 'spawn' && x.type === 'rifleman')); }
  { const sim = mkSim(WP, 'range'); clearRange(sim); const p = sim.spawn('para', { lx: 0, dz: 150, z: 60 }); run(sim, .1); sim.buildShapes(); const ch = sim.shapes.find(s => s.e === p && s.part === 'chute'); const c = WP.Hit.center(ch); WP.T.spreadBase = 0; run(sim, dt, { x: c[0], y: c[1], fire: true }); WP.T.spreadBase = 1.5; run(sim, 3); ok('enemies', 'a shot chute drops the paratrooper to his death', p.dead && p.dieHow === 'fall'); }
  { const sim = mkSim(WP, 'range'); clearRange(sim); const j = sim.spawn('jeep', { lx: 0, dz: 200, beh: 'truck' }); run(sim, .2); const g = j.parts.find(q => q.kind === 'gunner'); WP.vehicleHit(sim, j, 'gunner', g, 1, sim.players[0]); const n0 = sim.players[0].damage; run(sim, 6); ok('enemies', 'a jeep without its gunner stops firing', sim.players[0].damage === n0); sim.kill(j, 0, 'hull'); sim.buildShapes(); ok('enemies', 'a destroyed vehicle leaves a wreck that is cover', sim.shapes.some(s => s.e === j && s.cover)); }
  { const sim = mkSim(WP, 'range'); clearRange(sim); const h = sim.spawn('heli', { lx: 0, dz: 600, z: 70, beh: 'heli' }); run(sim, 12); ok('enemies', 'the VULTURE hovers in and attacks', sim.players[0].damage > 0 && !h.gone, sim.players[0].damage); }
});
// ---------------------------------------------------------------- friendlies
suite('friendlies', () => {
  const { WP } = load(); WP_ = WP;
  const sim = mkSim(WP, 'range'); clearRange(sim); const p = sim.players[0]; p.score = 5000; p.streak = 9; p.streakT = 4;
  const v = sim.spawn('villager', { lx: 0, dz: 120 }); run(sim, .05);
  WP.civHit(sim, v, p, 'shot');
  ok('friendlies', 'a civilian hit: +8 damage, -1000, the streak reset', p.damage === WP.T.civilianDamage && p.score === 4000 && p.streak === 0, p.damage + ' ' + p.score + ' ' + p.streak);
  const h = sim.spawn('hostage', { lx: 60, dz: 150, goal: sim.view.toWorld(-200, 150) }); h.from = [h.x, h.y];
  const c = sim.spawn('rifleman', { lx: 90, dz: 150, beh: 'chase', target: h.id }); for (let i = 0; i < 120 * 8 && !h.grabbedBy && !h.lost; i++) run(sim, dt);
  ok('friendlies', 'a chaser grabs a hostage', !!h.grabbedBy || h.lost);
  if (h.grabbedBy && !h.lost) { sim.kill(c, 0, 'body'); run(sim, .1); ok('friendlies', 'shooting the captor frees the hostage', !h.grabbedBy); run(sim, 12); ok('friendlies', 'a freed hostage reaches the goal: rescued', h.saved && sim.hostages.saved === 1); } else ok('friendlies', 'the grab can be broken', false, 'lost too fast');
  const h2 = sim.spawn('hostage', { lx: 60, dz: 150, goal: sim.view.toWorld(-200, 150) }); for (let i = 0; i < 3; i++) WP.hostageHit(sim, h2, null, 1);
  ok('friendlies', 'a hostage at 0 HP is lost', h2.lost && sim.hostages.lost >= 1);
  const g = sim.spawn('goat', { lx: 0, dz: 130, carry: 'mag' }); run(sim, .05); WP.animalHit(sim, g, p); run(sim, .1);
  ok('friendlies', 'an animal drops what it carries and bolts, never dies', g.bolt && !g.dead && sim.ents.some(e => e.type === 'pickup' && e.ptype === 'mag'));
});
// ---------------------------------------------------------------- pickups and the supply director
suite('pickups', () => {
  const { WP } = load(); WP_ = WP;
  const sim = mkSim(WP, 'range'); clearRange(sim); const p = sim.players[0];
  const fx = { mag: () => p.spares.length, crate: () => p.spares.length, gren: () => p.grenades, gbox: () => p.grenades, intel: () => p.score, fang: () => p.score };
  for (const k of ['mag', 'crate', 'gren', 'gbox', 'intel', 'fang']) { const e = WP.Supply.drop(sim, 0, 0, 10, k); const b = fx[k](); WP.collect(sim, e, p); ok('pickups', k + ' does its job', fx[k]() > b, b + ' -> ' + fx[k]()); }
  p.damage = 50; WP.collect(sim, WP.Supply.drop(sim, 0, 0, 10, 'ration'), p); ok('pickups', 'a RATION repairs 15', p.damage === 35);
  WP.collect(sim, WP.Supply.drop(sim, 0, 0, 10, 'medkit'), p); ok('pickups', 'a MEDKIT repairs 35', p.damage === 0);
  WP.collect(sim, WP.Supply.drop(sim, 0, 0, 10, 'fury'), p); ok('pickups', 'FURY lasts 10 s', p.fury === 10);
  WP.collect(sim, WP.Supply.drop(sim, 0, 0, 10, 'flare'), p); ok('pickups', 'a FLARE lights the scene for 12 s', sim.flare === 12);
  const d = WP.Supply.drop(sim, sim.cam.x, WP.Y0 - 120, 10, 'mag'); run(sim, 6.2); ok('pickups', 'a pickup expires after 6 s', d.gone);
  // need-weighted drops: low ammo -> more magazines
  const count = low => { const s2 = mkSim(WP, 'range'); clearRange(s2); if (low) { s2.players[0].spares = []; s2.players[0].mag = 5; } let m = 0; for (let i = 0; i < 400; i++) if (WP.Supply.pick(s2) === 'mag') m++; return m; };
  ok('pickups', 'the supply director favours magazines when ammo is low', count(true) > count(false) * 1.3, count(true) + ' vs ' + count(false));
  // the DRY rule by difficulty
  for (const [diff, want] of [['ARCADE', 'down'], ['VETERAN', 'drop'], ['RECRUIT', 'refill']]) {
    const s3 = mkSim(WP, 'range', { diff }); clearRange(s3); const q = s3.players[0]; q.mag = 0; q.spares = []; q.grenades = 0; const ev = run(s3, 5);
    const got = q.down ? 'down' : ev.some(e => e.k === 'refill') ? 'refill' : ev.some(e => e.k === 'resupply') ? 'drop' : 'none';
    ok('pickups', 'running dry on ' + diff + ': ' + want, got === want || (want === 'refill' && ev.some(e => e.k === 'refill')), got);
  }
});
// ---------------------------------------------------------------- bosses
suite('bosses', () => {
  const { WP } = load(); WP_ = WP;
  for (const [op, id] of [['op1', 'bigEar'], ['op2', 'crocodile'], ['op3', 'warthog'], ['op4', 'ironHog'], ['op5', 'tusk'], ['op6b', 'hyenaOne']]) {
    WP.Flow.newRun({}); const st = WP.STAGE[op], bh = st.holds.find(h => h.until === 'boss');
    const sim = new WP.Sim({ stage: op, seed: 5, players: [{ pid: 0 }], run: WP.Flow.run, cheats: { god: true, ammo: true }, d: bh ? bh.d - 1 : 0 });
    for (const k in sim.quotas) sim.quotas[k] = 0; for (const e of sim.ents) if (WP.TYPES[e.type].kind !== 'prop') e.gone = true;
    if (!sim.boss) WP.Bosses.start(sim, id); sim.beats.forEach(b => { b.fired = b.cleared = true; });
    const b = sim.boss; run(sim, 4);
    // an armored part takes no damage
    const fut = b.parts.find(q => q.phase > b.phase); if (fut) { const hp = fut.hp; WP.Bosses.hit(sim, b, { e: b, pp: fut, part: fut.name }, 5, sim.players[0]); ok('bosses', id + ': a later phase\'s part is armored', fut.hp === hp); }
    const bot = WP.Bot.make({ seed: 2 }); const phases = new Set([b.phase]); let t = 0;
    for (; t < 240 && sim.state !== 'clear'; t += dt) { sim.step(dt, { 0: WP.Bot.frame(bot, sim, sim.players[0], dt) }); phases.add(b.phase); sim.drain(); }
    ok('bosses', id + ': every phase is passed and it is defeated', sim.bossDone && phases.size >= 2, 'phases ' + [...phases] + ' t ' + t.toFixed(0));
    ok('bosses', id + ': its defeat clears the operation', sim.state === 'clear', sim.state);
  }
});
// ---------------------------------------------------------------- stages
suite('stages', () => {
  const { WP } = load(); WP_ = WP;
  for (const op of WP.OPS) {
    const sim = mkSim(WP, op, { seed: 11, cheats: { god: true, ammo: true } }), bot = WP.Bot.make({ seed: 3 });
    let t = 0, swap = false; for (; t < 600 && sim.state !== 'clear'; t += dt) { sim.step(dt, { 0: WP.Bot.frame(bot, sim, sim.players[0], dt) }); if (sim.drain().some(e => e.k === 'stageSwap')) swap = true; }
    const s = sim.snapshot();
    ok('stages', op + ' clears with the bot', s.state === 'clear', s.state + ' at d ' + s.d);
    ok('stages', op + ': every beat fired', s.beatsFired === s.beats, s.beatsFired + '/' + s.beats);
    ok('stages', op + ': the quotas reached 0', Object.values(s.quotas).every(q => q === 0), JSON.stringify(s.quotas));
    ok('stages', op + ' takes 2 to 5 minutes', t > 100 && t < 330, t.toFixed(0));
    if (op === 'op6') ok('stages', 'op6 cuts to the takeoff (part B)', swap);
  }
  // the reinforcement loop when the quota is short at the end
  const sim = mkSim(WP, 'op1', { seed: 4, cheats: { god: true } }); sim.d = 2699; sim.quotas.vehicle = 2; sim.beats.forEach(b => { b.fired = b.cleared = true; }); for (const h of sim.stage.holds) if (h.d < 2700) sim.holdsDone.add(h.d);
  const ev = run(sim, 12); ok('stages', 'the reinforcement loop spawns the missing vehicles', ev.filter(e => e.k === 'spawn' && e.type === 'jeep').length >= 1, ev.filter(e => e.k === 'spawn').map(e => e.type).join(','));
});
// ---------------------------------------------------------------- perks
suite('perks', () => {
  const { WP } = load(); WP_ = WP;
  WP.Flow.newRun({}); const base = new WP.Sim({ stage: 'op2', seed: 1, run: WP.Flow.run }).quotaMax.soldier;
  WP.Flow.run.perks.commsDown = true; const less = new WP.Sim({ stage: 'op2', seed: 1, run: WP.Flow.run }).quotaMax.soldier;
  ok('perks', 'COMMS DOWN: quotas x.8 in later ops', less === Math.round(28 * .8) && base === 28, base + ' -> ' + less);
  WP.Flow.newRun({}); const sim = new WP.Sim({ stage: 'op5', seed: 1, run: WP.Flow.run }); WP.Flow.run.hostagesFreed = 3;
  const s6 = new WP.Sim({ stage: 'op6', seed: 1, run: WP.Flow.run }); ok('perks', 'HOSTAGES FREED: n hostages come to op 6', s6.hostages.n === 3, s6.hostages.n); void sim;
});
// ---------------------------------------------------------------- flow, continue, endings, cutscenes, loop 2, mission select
suite('flow', () => {
  const r = playthrough({ fair: false });
  for (const f of r.fails) ok('flow', 'god-bot playthrough: ' + f.split(':')[0], false, f);
  if (!r.fails.length) ok('flow', 'god-bot playthrough on VETERAN reaches the ending and the title', true);
  const { WP, game } = load(); WP_ = WP; game.advance(.3);
  ok('flow', 'Mission Select is locked before a clear', game.scene.menu.items.find(i => i.id === 'select').disabled);
  WP.Store.cleared('op1'); game.go('about'); game.advance(.3); game.go('title'); game.advance(.3); ok('flow', 'Mission Select unlocks after a clear', !game.scene.menu.items.find(i => i.id === 'select').disabled);
  for (const n of [0, 1, 2, 3, 4, 5]) { WP.Flow.newRun({}); WP.Flow.run.hostagesSaved = n; game.go('ending', { n }); game.advance(.5); const lines = game.scene.lines.join(' '); ok('flow', 'ending ' + n, game.sceneName === 'ending' && lines.length > 10 && (n >= 5 ? /PERFECT/.test(lines) : n >= 3 ? /ACCOMPLISHED/.test(lines) : n >= 1 ? /OVER/.test(lines) : /FAILED/.test(lines)), lines); }
  // continue restores the op-start state
  WP.Flow.newRun({}); game.go('play', { op: 'op1', noCard: true }); game.advance(.5); const sim = WP.Flow.sim; const st = JSON.stringify(WP.Flow.run.opStart.op1.loadouts[0]);
  sim.players[0].mag = 3; sim.players[0].score = 4321; sim.downPlayer(sim.players[0], 'test'); game.advance(3);
  ok('flow', 'all players down -> continue', game.sceneName === 'continue', game.sceneName);
  game.input.tap('confirm'); game.advance(1); const p = WP.Flow.sim.players[0];
  ok('flow', 'a continue restarts the op with damage 0, the score kept, the ammo it began with', game.sceneName === 'play' && p.damage === 0 && p.score === 4321 && p.mag === 30 && WP.Flow.run.continues === 1, st + ' / ' + JSON.stringify(WP.Players.loadout(p)));
  // loop 2 raises the multipliers
  WP.Flow.newRun({ loop: 2 }); const s2 = new WP.Sim({ stage: 'op1', seed: 1, run: WP.Flow.run }); ok('flow', 'loop 2 is harder', s2.accK > 1 && s2.quotaMax.soldier > 36, s2.accK + ' ' + s2.quotaMax.soldier);
  // cutscenes: each runs to its end, and holding confirm skips it
  for (const id of ['briefing', 'interrogation', 'aftermath', 'takeoff']) {
    WP.Flow.newRun({}); game.go('cutscene', { id, next: 'map' }); game.advance(.7); let t = 0; while (game.sceneName === 'cutscene' && t < 120) { game.advance(.5); t += .5; }
    ok('flow', 'cutscene ' + id + ' runs to its end', game.sceneName === 'map', t);
    game.go('cutscene', { id, next: 'map' }); game.advance(.7); game.input.hold('confirm', true); game.advance(1.3); game.input.hold('confirm', false); game.advance(.7);
    ok('flow', 'cutscene ' + id + ' is skipped by holding confirm', game.sceneName === 'map', game.sceneName);
  }
  ok('flow', 'no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
});
suite('playthrough', () => {
  const r = playthrough({ fair: true, seed: 5 });
  for (const f of r.fails) ok('playthrough', 'fair bot on RECRUIT, no cheats: ' + f.split(':')[0], false, f);
  if (!r.fails.length) ok('playthrough', 'the fair bot finishes the whole game on RECRUIT with 3+ hostages', true);
});
// ---------------------------------------------------------------- local co-op
suite('coop', () => {
  const { WP, game } = load(); WP_ = WP;
  WP.Flow.newRun({});
  const sim = new WP.Sim({ stage: 'op1', seed: 2, players: [{ pid: 0 }, { pid: 1 }], run: WP.Flow.run });
  ok('coop', 'quotas scale with players (x1.3 for 2)', sim.quotaMax.soldier === Math.round(36 * 1.3), sim.quotaMax.soldier);
  const [a, b] = sim.players; sim.hurtPlayer(a, 20); ok('coop', 'each player has their own damage', a.damage === 20 && b.damage === 0);
  WP.T.spreadBase = 0; WP.T.bloomMax = 0; clearRange(sim); run(sim, .1);
  const f = (i) => ({ 0: { x: 240, y: 20, fire: true }, 1: { x: 240, y: 20 } });
  for (let i = 0; i < 60; i++) sim.step(dt, f(i)); ok('coop', 'and their own ammo', a.mag < 30 && b.mag === 30, a.mag + ' ' + b.mag);
  const pk = WP.Supply.drop(sim, sim.cam.x, WP.Y0 - 130, 10, 'gren'); run(sim, 1.6); sim.buildShapes(); const s = sim.shapes.find(q => q.e === pk), c = WP.Hit.center(s); const gb = b.grenades;
  for (let i = 0; i < 3; i++) sim.step(dt, { 0: { x: 10, y: 10 }, 1: { x: c[0], y: c[1], fire: true } });
  ok('coop', 'a pickup goes to the one who shot it', b.grenades === gb + 1 && a.grenades === 4, a.grenades + ' ' + b.grenades);
  WP.T.spreadBase = 1.5; WP.T.bloomMax = 7;
  sim.downPlayer(a, 'test'); ok('coop', 'one player down does not end the op', sim.state !== 'fail'); sim.downPlayer(b, 'test'); ok('coop', 'everyone down -> fail (continue)', sim.state === 'fail');
  // DOWN, then back at the next op with 50
  WP.Flow.run.loadouts = { 0: { damage: 100, mag: 30, spares: [30], grenades: 1, score: 10, down: true } };
  game.go('play', { op: 'op2', noCard: true, players: [{ pid: 0 }] }); game.advance(.3); ok('coop', 'a downed player is back at the next op with 50', WP.Flow.sim.players[0].damage === 50 && !WP.Flow.sim.players[0].down);
  const inp = game.addPlayer && game.addPlayer({ pad: 1 }); ok('coop', 'game.addPlayer gives a second local player', !!inp && game.players.length === 2);
});
// ---------------------------------------------------------------- attract mode
suite('attract', () => {
  const { WP, game } = load(); WP_ = WP; game.advance(.5);
  game.advance(9); ok('attract', 'no demo before 10 s', game.sceneName === 'title');
  game.advance(1.6); ok('attract', 'the demo starts after 10 s idle', game.sceneName === 'play' && WP.ctx.demo, game.sceneName);
  let civ = 0, kills = 0, ops = new Set(), scores = false, t = 0;
  while (t < 170) { game.advance(.5); t += .5; const s = WP.Flow.sim; if (game.sceneName === 'play' && s) { ops.add(s.stage.id); } if (game.sceneName === 'attractScores') scores = true; }
  void civ; void kills;
  ok('attract', 'the playlist shows every operation', ['op1', 'op2', 'op3', 'op4', 'op5'].every(o => ops.has(o)) && (ops.has('op6') || ops.has('op6b')), [...ops].join(','));
  ok('attract', 'then the high-score table', scores);
  // the bot hits no civilian or hostage: run the playlist with a counter
  const L = load(); L.game.advance(10.6); let bad = 0;
  for (let i = 0; i < 240; i++) { L.game.advance(.5); const s = L.WP.Flow.sim; if (s) for (const p of s.players) bad = Math.max(bad, p.civHits); }
  ok('attract', 'the demo bot hits no civilian or hostage', bad === 0, bad);
  L.game.input.tap('confirm'); L.game.advance(.5); ok('attract', 'any input returns to the title', L.game.sceneName === 'title' || L.game.sceneName === 'attractScores' && false, L.game.sceneName);
  ok('attract', 'no errors', !game.errors.length && !L.game.errors.length, [...game.errors, ...L.game.errors].map(e => e.message).slice(0, 2).join(' | '));
});
// ---------------------------------------------------------------- touch-only devices
suite('touch', () => {
  const mm = q => ({ matches: q.includes('coarse') }), listeners = {};
  const L = load({ window: { matchMedia: mm, navigator: { maxTouchPoints: 5, getGamepads: () => [] }, addEventListener: (k, f) => { (listeners[k] = listeners[k] || []).push(f); } } });
  const { WP, game } = L; game.advance(.5);
  ok('touch', 'a touch-only device shows the notice', WP.Touch.on);
  game.input.feed('down', 240, 120, { touch: true }); game.input.feed('up', 240, 120, { touch: true }); game.advance(.5);
  ok('touch', 'taps do not start a game', game.sceneName === 'title');
  game.advance(11); ok('touch', 'the attract mode runs', game.sceneName === 'play' && WP.ctx.demo, game.sceneName);
  for (const f of listeners.keydown || []) f({ code: 'KeyA' }); ok('touch', 'a key press leaves touch-only mode', !WP.Touch.on);
});
// ---------------------------------------------------------------- dev mode
suite('dev', () => {
  const { WP, game } = load(); WP_ = WP; game.advance(.5);
  const items = game.o.menu.items(); ok('dev', 'the pause menu has DEV MODE', items.some(i => /Dev mode/i.test(i[0])));
  const spawnsAt = k => { game.settings.set('t_spawnDensity', k); WP.Flow.newRun({}); const s = new WP.Sim({ stage: 'op1', seed: 1, run: WP.Flow.run, d: 299 }); for (let i = 0; i < 120 * 4; i++) s.step(dt, {}); return s.drain().filter(e => e.k === 'spawn' && e.type === 'rifleman').length; };
  const one = spawnsAt(1), two = spawnsAt(2); ok('dev', 'spawn density 2 doubles a beat\'s spawns', two === one * 2, one + ' -> ' + two);
  const timeTo = k => { game.settings.set('t_railSpeed', k); WP.Flow.newRun({}); const s = new WP.Sim({ stage: 'op1', seed: 1, run: WP.Flow.run }); let t = 0; while (s.d < 300 && t < 99) { s.step(dt, {}); t += dt; } return t; };
  const t1 = timeTo(1), t2 = timeTo(2); ok('dev', 'rail speed changes the time to reach a beat', t2 < t1 * .6, t1.toFixed(1) + ' -> ' + t2.toFixed(1));
  game.settings.set('t_fireRate', 20); game.settings.reset('Dev'); ok('dev', 'RESET TO DEFAULTS restores every slider', WP.tuneChanged().length === 0 && WP.T.fireRate === 11 && WP.T.railSpeed === 1 && WP.T.spawnDensity === 1, WP.tuneChanged());
  WP.Dev.jump(game, 'op3', 'b10'); game.advance(1.5); ok('dev', 'JUMP reaches the right op and beat', WP.Flow.sim.stage.id === 'op3' && WP.Flow.sim.beats.filter(b => b.fired).length >= 10, WP.Flow.sim.stage.id + ' ' + WP.Flow.sim.snapshot().beat);
  game.settings.set('devGod', true); const s = WP.Flow.sim; s.hurtPlayer(s.players[0], 50); ok('dev', 'God mode holds', s.players[0].damage === 0); game.settings.set('devGod', false);
  game.settings.set('devAmmo', true); s.players[0].mag = 1; s.step(dt, { 0: { x: 240, y: 20, fire: true } }); s.step(dt, { 0: { x: 240, y: 20, fire: true } }); const sh0 = s.players[0].shots; for (let i = 0; i < 120; i++) s.step(dt, { 0: { x: 240, y: 20, fire: true } }); ok("dev", "Infinite ammo holds", s.players[0].mag === 1 && s.players[0].shots > sh0 + 8, s.players[0].mag); game.settings.set('devAmmo', false);
  const id = game.debug.spawn('brute', { lx: 0, dz: 150 }); ok('dev', 'spawning a type works', !!s.byId(id));
  ok('dev', 'no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
});
// ---------------------------------------------------------------- AI Hub (mock)
suite('hub', async () => {
  for (const o of [{ players: 3 }, { players: 2, server: true }]) { const f = await hubMock(o); for (const x of f) ok('hub', JSON.stringify(o) + ' ' + x, false); if (!f.length) ok('hub', JSON.stringify(o) + ' mock session', true); }
});
// ---------------------------------------------------------------- the bundle and the exit interview
suite('bundle', () => {
  const NAME = 'OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009.html', file = join(ROOT, '..', NAME);
  ok('bundle', 'the single file exists with its exact name', existsSync(file));
  if (!existsSync(file)) return;
  const html = readFileSync(file, 'utf8'), session = readFileSync(join(ROOT, 'hub/session.js'), 'utf8');
  const m = /^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/i.exec(html);
  ok('bundle', 'session.js is the first script, right after <meta charset>, byte for byte', m && m[1] === session);
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="shared-world"', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) ok('bundle', 'meta ' + t.split('"')[0], html.includes('name="' + t));
  const game = manifest.src.map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n');
  for (const bad of ['WebSocket', 'RTCPeerConnection', 'fetch(', 'XMLHttpRequest', 'alert(', 'confirm(', 'prompt(', 'window.open']) ok('bundle', 'no ' + bad + ' in the game\'s code', !game.includes(bad));
  ok('bundle', '<title> is the game\'s', html.includes('<title>Operation Wolfpack</title>'));
  const ei = join(ROOT, '..', 'exit-interview.json'); let j = null; try { j = JSON.parse(readFileSync(ei, 'utf8')); } catch (e) { /* missing or bad */ }
  ok('bundle', 'exit-interview.json parses', !!j);
  if (j) {
    const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    ok('bundle', 'exit interview: every sourceInformation field', keys.every(k => typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].trim()), keys.filter(k => !(j.sourceInformation[k] || '').trim()));
    ok('bundle', 'exit interview: 4 testing, 6 engine, 4 prompt answers', j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4 && [...j.testingFeedback, ...j.engineFeedback, ...j.promptFeedback].every(s => typeof s === 'string' && s.trim()));
    const a = j.aiHub; ok('bundle', 'exit interview: aiHub fields', a && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => typeof a[k] === 'string' && a[k].trim()) && typeof a.series === 'string' && Array.isArray(a.tags) && a.tags.length >= 3 && a.tags.length <= 6);
  }
});
// ---------------------------------------------------------------- the browser (the final file over file://)
suite('browser', async () => {
  const { chromium } = await import('playwright'); const { pathToFileURL } = await import('node:url');
  const NAME = 'OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009.html', url = pathToFileURL(join(ROOT, '..', NAME)).href;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const [hash, scene, wait] of [['', 'title', 2500], ['#op1', 'play', 4000], ['#op2', 'play', 4000], ['#op3', 'play', 4000], ['#op4', 'play', 4000], ['#op5', 'play', 4000], ['#op6', 'play', 4000], ['#op6/b', 'play', 4000], ['#ending/5', 'ending', 3000], ['#about', 'about', 2000], ['#cut/interrogation', 'cutscene', 2000], ['#map', 'map', 2000], ['#range', 'play', 3000]]) {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } }), errs = [];
      page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(url + hash); await page.waitForTimeout(wait);
      const s = await page.evaluate(() => { const g = My3D2dge.current; const c = document.getElementById('screen'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 400) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++; return { scene: g.sceneName, errors: g.errors.length, lit }; });
      ok('browser', (hash || 'title') + ' loads into ' + scene, s.scene === scene, s.scene);
      ok('browser', (hash || 'title') + ' draws and has no errors', s.lit > 50 && !errs.length && !s.errors, s.lit + ' ' + errs.slice(0, 2).join(' | '));
      if (!hash) { await page.waitForTimeout(9000); const a = await page.evaluate(() => My3D2dge.current.sceneName); ok('browser', 'attract mode after 10 s idle', a === 'play', a); await page.mouse.move(300, 300); await page.mouse.move(310, 320); await page.waitForTimeout(700); const b = await page.evaluate(() => My3D2dge.current.sceneName); ok('browser', 'a mouse move ends the attract mode', b === 'title', b); }
      await page.close();
    }
  } finally { await browser.close(); }
});
suite('harness', async () => {
  const { runHarness } = await import('./hub-harness.mjs');
  const r = await runHarness(); for (let i = 0; i < r.passed; i++) passed++; failed += r.failed;
});
// ----------------------------------------------------------------
const order = ['core', 'proj', 'input', 'weapon', 'hit', 'grenade', 'enemies', 'friendlies', 'pickups', 'bosses', 'stages', 'perks', 'coop', 'dev', 'touch', 'attract', 'flow', 'playthrough', 'hub', 'bundle', 'browser', 'harness'];
for (const name of order) {
  if (only && name !== only) continue;
  if (quick && (name === 'browser' || name === 'harness')) continue;
  try { await S[name](); } catch (e) { failed++; console.log(`FAIL [${name}] threw: ${String(e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
}
console.log(`${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
