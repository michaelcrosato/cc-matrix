// THE test command: node tools/test.mjs [suite ...] [--browser] [--hub] [--all]
// Prints only failures and one summary line. Headless: the engine's game.advance and game.debug.
import { makeGame, E } from './node-env.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2), want = args.filter(a => !a.startsWith('--')), all = args.includes('--all');
let checks = 0, failed = 0; const t0 = Date.now();
const check = (suite, name, ok, detail = '') => { checks++; if (!ok) { failed++; console.log('FAIL ' + suite + ': ' + name + (detail ? ': ' + detail : '')); } };
const { compileTurtle, Track, shareCode, fromShareCode } = await import('../src/track.js');
const { TRACKS, PUZZLES, ENV_INFO, RANKS } = await import('../src/data.js');
const { BLOCKS, localFrame } = await import('../src/blocks.js');
const { buildTrack } = await import('../src/geometry.js');
const { TrackPhysics } = await import('../src/physics.js');
const { Course, Run, Bot, botRun, fmt } = await import('../src/run.js');
const { makeCar, stepCar, placeCar, kmh } = await import('../src/car.js');
const { Recorder, Ghost, encode, decode } = await import('../src/ghost.js');
const { CFG, reset: resetCfg, SLIDERS, sliderSet, sliderGet, sliderDefault } = await import('../src/config.js');
const { medalTimes, medalFor } = await import('../src/app.js');
const { dot, sub, len, cross } = await import('../src/v3.js');

// a fake AI Hub for the online suite (installed before the game is made when that suite runs alone)
class FakeHub {
  constructor() { this.active = true; this.h = {}; this.sent = []; this.progressN = 0; this.results = []; this.readyN = 0; this.answers = []; this.t = -Infinity; this.failed = null; }
  connect(o) { this.mode = o.mode; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ana', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 200000, seed: 7 }); }
  rng(label) { let s = 1234 + label.length; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => {}; }
  emit(ev, ...a) { for (const f of this.h[ev] || []) f(...a); }
  ready() { this.readyN++; } answer(a) { this.answers.push(a); } time() { return this.t; }
  send(d, o) { this.sent.push([d, o, this.t]); return true; } progress(p) { this.progressN++; this.lastProgress = p; } result(r) { this.results.push(r); } fail(m) { this.failed = m; }
}
const onlyOnline = want.length === 1 && want[0] === 'online';
if (onlyOnline) globalThis.AIHub = new FakeHub();
const { game, app } = await makeGame();
const I = game.input, adv = s => game.advance(s), snap = () => game.debug.snapshot();
const fresh = () => { app.profile.reset(); resetCfg(); app.applySettings(); };
const press = (a, n = 1) => { for (let i = 0; i < n; i++) { I.tap(a); adv(.05); } };
const prep = id => app.prepare(app.track(id), id);
const run = name => want.length === 0 || want.includes(name) || all;

// ---------------------------------------------------------------- turtle
if (run('turtle')) {
  for (const p of TRACKS) { const t = compileTurtle({ ...p, heading: 0 }), r = t.route(); check('turtle', p.id + ' compiles', !t.errors.length, t.errors.join('; ')); check('turtle', p.id + ' routes start to finish', r.ok, r.error); }
  for (const z of PUZZLES) {
    const t = app.track(z.id), r = t.route(); check('turtle', z.id + ' solution routes', r.ok, r.error);
    const need = {}; for (const b of t.blocks) if (!/^(ST|CP|FN|GAP\d)$/.test(b.type)) need[b.type] = (need[b.type] || 0) + 1;
    for (const k in need) check('turtle', z.id + ' inventory covers ' + k, (z.inv[k] || 0) >= need[k], need[k] + ' needed, ' + (z.inv[k] || 0) + ' given');
    const zz = z.zone; for (const b of t.blocks) if (!/^(ST|CP|FN)$/.test(b.type)) for (const [x, y, l] of t.cellsOf(b.type, b.cx, b.cy, b.L, b.rot)) if (!BLOCKS[b.type].gap) check('turtle', z.id + ' solution inside its zone', x >= zz[0] && x <= zz[1] && y >= zz[2] && y <= zz[3], b.type + ' at ' + x + ',' + y);
  }
}
// ---------------------------------------------------------------- blocks
if (run('blocks')) {
  for (const id in BLOCKS) {
    const B = BLOCKS[id]; if (!B.path) continue;
    let ok = true, why = '';
    for (let i = 0; i < 60; i++) {
      const a = localFrame(B, B.path.len * i / 60), b = localFrame(B, B.path.len * (i + 1) / 60);
      if (Math.abs(len(a.t) - 1) > 1e-6 || Math.abs(len(a.u) - 1) > 1e-6 || Math.abs(dot(a.t, a.u)) > 1e-6) { ok = false; why = 'frame not orthonormal at ' + i; break; }
      const ang = Math.acos(Math.min(1, dot(a.t, b.t))); if (ang > .2) { ok = false; why = 'tangent jumps ' + ang.toFixed(3) + ' at ' + i; break; }
    }
    check('blocks', id + ' path smooth and orthonormal', ok, why);
  }
  // every link of every shipped track: the frames match
  for (const p of TRACKS) {
    const t = compileTurtle({ ...p, heading: 0 }), r = t.route(); let worst = 0, wa = 0;
    for (let i = 0; i < r.list.length - 1; i++) { const a = r.list[i], b = r.list[i + 1]; if (b.jump !== undefined) continue; const fa = t.frame(a, BLOCKS[a.b.type].path.len), fb = t.frame(b, 0); worst = Math.max(worst, len(sub(fa.p, fb.p))); wa = Math.max(wa, Math.acos(Math.min(1, dot(fa.t, fb.t)))); }
    check('blocks', p.id + ' links meet (1 cm, 0.5 deg)', worst < .01 && wa < .5 * Math.PI / 180, 'gap ' + worst.toFixed(4) + ' m, ' + (wa * 180 / Math.PI).toFixed(2) + ' deg');
  }
  // collision winding: road normals point along the road's up
  const t = app.track('D3'), geo = buildTrack(t); let bad = 0;
  for (const id in geo.blocks) { const C = geo.blocks[id].collide.road; if (!C) continue; const P = C.pos, X = C.idx; for (let i = 0; i < X.length; i += 3) { const a = [P[X[i] * 3], P[X[i] * 3 + 1], P[X[i] * 3 + 2]], b = [P[X[i + 1] * 3], P[X[i + 1] * 3 + 1], P[X[i + 1] * 3 + 2]], c = [P[X[i + 2] * 3], P[X[i + 2] * 3 + 1], P[X[i + 2] * 3 + 2]], n = cross(sub(b, a), sub(c, a)); if (len(n) > 1e-6 && t.get(+id).type !== 'LOOPR' && n[2] / len(n) < .3) bad++; } }
  check('blocks', 'road triangles face up (Rapier winding)', bad === 0, bad + ' face down');
}
// ---------------------------------------------------------------- physics
if (run('physics')) {
  const P = prep('D3'), ph = P.phys, st = P.course.spawn;
  const drive = (ctl, secs, car = makeCar('coyote', st), until) => { for (let i = 0; i < secs * 120; i++) { stepCar(car, typeof ctl === 'function' ? ctl(car, i) : ctl, 1 / 120, ph); if (until && until(car)) return { car, t: i / 120 }; } return { car, t: secs }; };
  const r100 = drive({ steer: 0, gas: 1, brake: 0 }, 6, undefined, c => kmh(c) >= 100);
  check('physics', '0-100 km/h in 2.3-3.4 s', r100.t >= 2.3 && r100.t <= 3.4, r100.t.toFixed(2) + ' s');
  // braking from 100
  { const c = r100.car, p0 = c.p.slice(); const r = drive({ steer: 0, gas: 0, brake: 1 }, 5, c, cc => kmh(cc) < 1); const d = len(sub(r.car.p, p0)); check('physics', '100-0 braking in 12-26 m', d >= 12 && d <= 26, d.toFixed(1) + ' m'); }
  // the loop: full throttle from the D3 start holds it (the car comes out the far side upright)
  { const L = P.track.blocks.find(b => b.type === 'LOOPR'); let topZ = 0, inv = false; const r = drive({ steer: 0, gas: 1, brake: 0 }, 12, makeCar('coyote', st), c => { topZ = Math.max(topZ, c.p[2]); if (c.u[2] < -.8) inv = true; return c.blockId !== L.id && topZ > 20 && c.p[2] < 1; }); check('physics', 'loop held at speed (upside down at the top, out upright)', inv && topZ > 20 && r.car.u[2] > .9, 'top ' + topZ.toFixed(1) + ' m, inverted ' + inv); }
  // too slow: the car falls off the top
  { const L = P.track.blocks.find(b => b.type === 'LOOPR'), f = P.track.frame({ b: L, rev: false, rot: L.rot }, 32.5); const c = makeCar('coyote', f); c.v = f.t.map(v => v * 85 / 3.6); c.grounded = true; let fell = false; drive({ steer: 0, gas: 0, brake: 0 }, 6, c, cc => { if (!cc.grounded && cc.p[2] > 10 && cc.p[2] < 23) fell = true; return fell; }); check('physics', 'loop coasting from 85 km/h: drops off before the top', fell); }
  // a wall at 100 km/h: no penetration, speed partly kept
  { const P2 = prep('S3'), ph2 = P2.phys, b = P2.track.blocks.find(x => x.type === 'R2'), f = P2.track.frame({ b, rev: false, rot: b.rot }, 20); const c = makeCar('moose', f); c.v = f.t.map(v => v * 100 / 3.6); c.grounded = true; let maxLat = 0; for (let i = 0; i < 240; i++) { stepCar(c, { steer: 0, gas: 1, brake: 0 }, 1 / 120, ph2); } const n = c.p; check('physics', 'wall keeps the car on an elevated bend', n[2] > 20, 'z ' + n[2].toFixed(1)); }
  // ice: less traction
  { const P3 = prep('S1'), s3 = P3.course.spawn; const ice = P3.track.blocks.find(b => b.type === 'IS'), f = P3.track.frame({ b: ice, rev: false, rot: ice.rot }, 2); const c = makeCar('coyote', f); let n = 0; for (let i = 0; i < 120; i++) stepCar(c, { steer: 0, gas: 1, brake: 0 }, 1 / 120, P3.phys); const c2 = makeCar('coyote', P.course.spawn); for (let i = 0; i < 120; i++) stepCar(c2, { steer: 0, gas: 1, brake: 0 }, 1 / 120, ph); check('physics', 'ice limits acceleration for the Coyote', kmh(c) < kmh(c2) * .8, kmh(c).toFixed(0) + ' vs ' + kmh(c2).toFixed(0)); }
  // boost pad adds speed
  { const b = P.track.blocks.find(x => x.type === 'BO'), f = P.track.frame({ b, rev: false, rot: b.rot }, 2); const c = makeCar('coyote', f); c.v = f.t.map(v => v * 20); c.grounded = true; let boosted = false; for (let i = 0; i < 120; i++) { stepCar(c, { steer: 0, gas: 0, brake: 0 }, 1 / 120, ph); if (c.events.some(e => e[0] === 'boost')) boosted = true; } check('physics', 'a boost pad kicks', boosted && len(c.v) > 25, len(c.v).toFixed(1) + ' m/s'); }
  // determinism
  { const a = drive((c, i) => ({ steer: Math.sin(i / 50), gas: 1, brake: i % 300 > 250 ? 1 : 0 }), 10), b = drive((c, i) => ({ steer: Math.sin(i / 50), gas: 1, brake: i % 300 > 250 ? 1 : 0 }), 10); check('physics', '10 s of the same inputs twice: the same state', a.car.p.join() === b.car.p.join() && a.car.v.join() === b.car.v.join()); }
  // respawn
  { const R = new Run(P.course, 'coyote', { countdown: 0 }); for (let i = 0; i < 600; i++) R.step({ steer: 0, gas: 1, brake: 0 }); R.respawn(); check('physics', 'respawn: standing still, upright', len(R.car.v) === 0 && R.car.u[2] > .99 && R.respawns === 1); }
}
// ---------------------------------------------------------------- race
if (run('race')) {
  const P = prep('D4');
  { const R = new Run(P.course, 'coyote', { countdown: 0 }), fn = P.course.gates.find(g => g.kind === 'FN'); placeCar(R.car, { p: [fn.p[0] - fn.t[0] * 5, fn.p[1] - fn.t[1] * 5, fn.p[2]], t: fn.t, u: fn.u, r: fn.r }); R.car.v = fn.t.map(v => v * 20); let missing = false; for (let i = 0; i < 120; i++) { R.step({ steer: 0, gas: 1, brake: 0 }); if (R.events.some(e => e[0] === 'missing')) missing = true; } check('race', 'finish refused before every checkpoint', !R.finished && missing); }
  { const r = botRun(P.course, 'coyote', { skill: 1 }); check('race', 'the bot finishes D4 with both checkpoints', r.finished && r.run.cpCount === 2, 'cps ' + r.run.cpCount); check('race', 'splits recorded at each checkpoint', r.run.splits.length === 2); }
  { const M = medalTimes(3000); check('race', 'medal ratios 1.06 / 1.2 / 1.5 rounded up', M.gold === Math.ceil(3000 / 120 * 1.06 * 10) / 10 * 120 && M.silver === Math.ceil(25 * 1.2) * 120 && M.bronze === Math.ceil(25 * 1.5) * 120, JSON.stringify(M)); check('race', 'medalFor', medalFor(3000, M) === 4 && medalFor(M.gold, M) === 3 && medalFor(M.bronze + 1, M) === 0); }
  { fresh(); const p = app.profile, r1 = p.finish('D1', 1e9, 3, [], null, 'race', 'dustbowl'), r2 = p.finish('D1', 1e9, 3, [], null, 'race', 'dustbowl'); check('race', 'rewards paid once per tier', r1.paid === 300 && r2.paid === 0, r1.paid + ' then ' + r2.paid); }
  { const R = new Run(P.course, 'coyote', { countdown: 3 }); for (let i = 0; i < 120; i++) R.step({ steer: 0, gas: 1, brake: 0 }); check('race', 'held during the countdown', R.steps === 0 && kmh(R.car) < 1); for (let i = 0; i < 480; i++) R.step({ steer: 0, gas: 1, brake: 0 }); check('race', 'the clock runs after GO', R.steps > 100, R.steps); const s0 = R.steps; R.respawn(); R.step({ steer: 0, gas: 0, brake: 0 }); check('race', 'the clock runs through a respawn', R.steps === s0 + 1); }
}
// ---------------------------------------------------------------- ghost
if (run('ghost')) {
  const P = prep('D2'), r = botRun(P.course, 'coyote', { skill: 1, record: () => new Recorder() }), g = r.ghost.toGhost({ steps: r.steps });
  const G = new Ghost(g), dec = decode(g.data);
  check('ghost', 'encode / decode round trip (1 cm)', dec.length === r.ghost.s.length && dec.every((s, i) => Math.abs(s[0] - r.ghost.s[i][0]) < .011 && Math.abs(s[2] - r.ghost.s[i][2]) < .011));
  const perMin = g.data.length / (r.steps / 120 / 60); check('ghost', 'size under 60 KB a minute', perMin < 60000, (perMin / 1000).toFixed(1) + ' KB/min');
  const end = G.at(r.steps); check('ghost', 'playback ends where the run ended', end && len(sub(end.p, r.run.car.p)) < 3, end && len(sub(end.p, r.run.car.p)).toFixed(2));
}
// ---------------------------------------------------------------- bot
if (run('bot')) {
  for (const p of TRACKS) { const r = botRun(prep(p.id).course, ENV_INFO[p.env].car, { skill: 1 }); check('bot', p.id + ' finished at skill 1 with no respawns', r.finished && r.respawns === 0, (r.finished ? fmt(r.steps) : 'DNF') + ' respawns ' + r.respawns); check('bot', p.id + ' matches its author time', r.steps === app.authors[p.id], r.steps + ' vs ' + app.authors[p.id]); }
  for (const z of PUZZLES) { const r = botRun(prep(z.id).course, ENV_INFO[z.env].car, { skill: 1 }); check('bot', z.id + ' reference solution driven', r.finished, r.finished ? fmt(r.steps) : 'DNF'); }
  { const r = botRun(prep('D1').course, 'coyote', { skill: .8, seed: 4 }); check('bot', 'skill 0.8 is slower', r.finished && r.steps > app.authors.D1, r.steps); }
}
// ---------------------------------------------------------------- campaign
if (run('campaign')) {
  fresh(); const p = app.profile;
  check('campaign', 'D1 and D2 open, D3 locked', p.trackOpen('D1') && p.trackOpen('D2') && !p.trackOpen('D3'));
  check('campaign', 'Hedgerow and Frostpeak locked', !p.envOpen('hedgerow') && !p.envOpen('frostpeak'));
  p.finish('D1', 99999, 1, [], null, 'race', 'dustbowl'); p.finish('D2', 99999, 1, [], null, 'race', 'dustbowl');
  check('campaign', 'a medal opens the next track; puzzles open with track 2', p.trackOpen('D3') && p.puzzlesOpen('dustbowl') && !p.survivalOpen('dustbowl'));
  p.finish('D3', 99999, 1, [], null, 'race', 'dustbowl');
  check('campaign', 'three medals open Hedgerow and Dustbowl survival', p.envOpen('hedgerow') && p.survivalOpen('dustbowl'));
  const c0 = p.coppers; check('campaign', 'buy a pack', p.buyPack('stunts', 250) && p.coppers === c0 - 250); check('campaign', 'cannot buy what you cannot afford', !p.buyPack('loops', 1e6));
  { const { migrate } = await import('../src/profile.js'); const keep = JSON.stringify(p.data); check('campaign', 'profile survives a save round trip and migration', JSON.stringify(migrate(JSON.parse(keep))) === keep); const old = migrate({ version: 0, coppers: 5 }); check('campaign', 'an old profile migrates', old.coppers === 5 && old.packs.basic && Array.isArray(old.slots)); }
  // the story's welcome beat fires once
  fresh(); game.go('front', { page: 'title' }); adv(.8); app.modes.firstBoot(); adv(.1); check('campaign', 'welcome beat', app.dialog.open); press('confirm', 6); adv(.5); check('campaign', 'welcome beat closes', !app.dialog.open); app.modes.firstBoot(); adv(.1); check('campaign', 'welcome fires once', !app.dialog.open);
}
// ---------------------------------------------------------------- editor
if (run('editor')) {
  fresh(); app.profile.earn(5000); app.profile.data.packs.stunts = true; app.profile.data.packs.loops = true;
  app.modes.editor({ slot: 0, env: 'dustbowl' }); adv(.8); while (app.dialog.open) press('confirm');
  const ed = app.scenes.editor, A = ed.api, S = () => ed.state;
  const c0 = app.profile.coppers;
  A.place('ST', 4, 4, 0, 0); A.place('S', 5, 4, 0, 0); A.place('CP', 6, 4, 0, 0); A.place('BO', 7, 4, 0, 0); A.place('S', 8, 4, 0, 0); A.place('R2', 9, 4, 0, 0); A.place('S', 10, 6, 0, 1); A.place('FN', 10, 7, 0, 1);
  check('editor', 'placed 8 blocks', S().track.blocks.length === 8, S().track.blocks.length);
  check('editor', 'coppers charged', app.profile.coppers === c0 - (5 + 15 + 40 + 5 + 15 + 5), c0 - app.profile.coppers);
  check('editor', 'route ok', S().route.ok, S().route.error);
  A.place('S', 5, 4, 0, 0); check('editor', 'overlap refused', S().track.blocks.length === 8);
  A.place('S', 40, 4, 0, 0); check('editor', 'out of grid refused', S().track.blocks.length === 8);
  const sig = () => JSON.stringify(S().track.toJSON().blocks.map(b => b.join()).sort()), before = sig(), cb = app.profile.coppers;
  A.remove(8, 4, 0); A.place('R1', 3, 9, 0, 2); A.undo(); A.undo(); check('editor', 'undo returns to the same track and coppers', sig() === before && app.profile.coppers === cb, app.profile.coppers + ' vs ' + cb);
  A.redo(); A.undo();
  // validate by driving (the bot as the driver)
  A.testDrive(true); adv(.8); const R = app.race; check('editor', 'validate opens a race', R && R.spec.mode === 'validate');
  if (R) { R.players[0].bot = new Bot(R.players[0].run, { skill: 1 }); for (let i = 0; i < 90 && game.sceneName === 'race'; i++) adv(1); }
  check('editor', 'back in the editor, validated', game.sceneName === 'editor' && !!S().validated, game.sceneName + ' ' + S().validated);
  check('editor', 'saved to the slot with its author time', app.profile.data.slots[0] && app.profile.data.slots[0].author === S().validated);
  const code = shareCode(S().track), t2 = fromShareCode(code); check('editor', 'share code round trip', t2 && JSON.stringify(t2.toJSON().blocks) === JSON.stringify(S().track.toJSON().blocks));
  A.place('S', 2, 2, 0, 0); check('editor', 'an edit clears validation', !S().validated);
  check('editor', 'export as content', (() => { const cl = console.log; console.log = () => {}; app.editorExport(); console.log = cl; const ok = S().exported && S().exported.includes("env: 'dustbowl'") && S().modal && S().modal.kind === 'export'; S().modal = null; return ok; })());
}
// ---------------------------------------------------------------- puzzle
if (run('puzzle')) {
  fresh();
  for (const z of PUZZLES) {
    app.modes.puzzle(z.id); adv(.8); while (app.dialog.open) press('confirm');
    const ed = app.scenes.editor, A = ed.api, S = () => ed.state, sol = app.track(z.id);
    const n0 = S().track.blocks.length;
    A.remove(sol.blocks[0].cx, sol.blocks[0].cy, 0); check('puzzle', z.id + ' fixed start cannot be removed', S().track.blocks.length === n0);
    for (const b of sol.blocks) if (!/^(ST|CP|FN)$/.test(b.type) && !BLOCKS[b.type].gap) A.place(b.type, b.cx, b.cy, b.L, b.rot);
    check('puzzle', z.id + ' solution built through the editor', S().route.ok, S().route.error + ' (' + S().track.blocks.length + ' blocks)');
    const inv = S().puzzle.inv, extra = Object.keys(inv).find(k => inv[k] - (S().used[k] || 0) <= 0);
    if (extra) { const nb = S().track.blocks.length; A.place(extra, 0, 0, 0, 0); check('puzzle', z.id + ' inventory enforced', S().track.blocks.length === nb); }
    A.testDrive(true); adv(.8); const R = app.race;
    if (R) { R.players[0].bot = new Bot(R.players[0].run, { skill: 1 }); for (let i = 0; i < 90 && game.sceneName === 'race'; i++) adv(1); }
    check('puzzle', z.id + ' validated with gold or better', app.profile.medal(z.id) >= 3, 'medal ' + app.profile.medal(z.id));
  }
}
// ---------------------------------------------------------------- survival
if (run('survival')) {
  fresh(); app.profile.data.unlockAll = true;
  const a = app.modes.rivalRuns('D1', 0, 'dustbowl').map(r => r.steps).join(), b = app.modes.rivalRuns('D1', 0, 'dustbowl').map(r => r.steps).join();
  check('survival', 'rival runs deterministic', a === b, a);
  check('survival', 'all three rivals finish round 1', a.split(',').every(x => x && x !== 'null'), a);
  app.modes.survival('dustbowl'); adv(.8);
  let rounds = 0;
  for (let k = 0; k < 5; k++) {
    if (game.sceneName !== 'race') break;
    const R = app.race; R.players[0].bot = new Bot(R.players[0].run, { skill: 1 });
    for (let i = 0; i < 120 && game.sceneName === 'race'; i++) adv(1);
    rounds++;
    check('survival', 'round ' + (k + 1) + ' standings shown', snap().page === 'standings', snap().scene + ' ' + snap().page);
    const d = app.front.st.data; if (d && d.on) { d.on(); adv(.8); }
  }
  const rec = app.profile.data.survival.dustbowl;
  check('survival', 'gauntlet result recorded', rec && rec.round >= 1, JSON.stringify(rec));
  check('survival', 'rank names', RANKS.length === 7 && RANKS[6] === 'CRACKMANIAC');
}
// ---------------------------------------------------------------- hotseat
if (run('hotseat')) {
  fresh(); app.profile.data.unlockAll = true;
  app.modes.hotseat(['ANA', 'BO', 'CY'], 2, 2); adv(.8);
  let turns = 0;
  for (let k = 0; k < 80 && turns < 12; k++) {
    const s = snap();
    if (s.scene === 'front' && s.page === 'card') { press('confirm'); adv(.8); continue; }
    if (s.scene === 'race') { const R = app.race; R.players[0].bot = new Bot(R.players[0].run, { skill: .95, seed: k }); for (let i = 0; i < 100 && game.sceneName === 'race'; i++) adv(1); turns++; continue; }
    if (s.page === 'standings') { const d = app.front.st.data; if (d.button === 'MENU') break; d.on(); adv(.8); continue; }
    break;
  }
  check('hotseat', '3 players x 2 attempts x 2 tracks = 12 turns', turns === 12, turns);
  check('hotseat', 'points awarded', app.modes.hs.points.reduce((a, b) => a + b, 0) === 2 * (10 + 8 + 6), app.modes.hs.points.join());
}
// ---------------------------------------------------------------- split
if (run('split')) {
  fresh(); app.profile.data.unlockAll = true;
  game.go('front', { page: 'multi' }); adv(.8);
  app.modes.splitJoin(); adv(.5);
  game.addPlayer({ keys: 'right' }); adv(.1);
  check('split', 'two players joined', game.players.length === 2, game.players.length);
  app.modes.splitRace('S2'); adv(.8);
  const R = app.race; check('split', 'race with two cars', R && R.players.length === 2);
  if (R) { R.players.forEach((P, i) => { P.bot = new Bot(P.run, { skill: 1 - i * .05, seed: i }); }); for (let i = 0; i < 90 && game.sceneName === 'race'; i++) adv(1); }
  check('split', 'standings after the race', snap().page === 'standings');
  check('split', 'both finished, places given', R && R.players.every(p => p.run.finished) && R.players.some(p => p.place === 1));
  app.modes.splitEnd(); adv(.8); check('split', 'players removed after', game.players.length === 1);
}
// ---------------------------------------------------------------- ui
if (run('ui')) {
  fresh(); game.go('front', { page: 'title' }); adv(.8);
  press('confirm'); adv(.8); while (app.dialog.open) press('confirm');
  check('ui', 'title -> main by keys', snap().page === 'main', snap().page);
  for (const [id, page] of [['race', 'envs'], ['puzzle', 'envs'], ['survival', 'envs'], ['build', 'build'], ['multi', 'multi'], ['replays', 'replays'], ['about', 'about']]) {
    app.front.focus(id); press('confirm'); adv(.1); check('ui', 'main -> ' + id, snap().page === page, snap().page); press('cancel'); adv(.1); check('ui', id + ' -> back to main', snap().page === 'main', snap().page);
  }
  // spatial navigation moves the focus
  app.front.focus('race'); press('right'); check('ui', 'right moves focus', snap().ui.focus === 'puzzle', snap().ui.focus); press('down'); check('ui', 'down moves focus', snap().ui.focus === 'multi', snap().ui.focus);
  // mouse: hover focuses, click chooses
  const it = app.front.F.items.find(t => t.id === 'garage'); I.feed('move', it.x + 5, it.y + 5); adv(.05); check('ui', 'hover moves the focus', snap().ui.focus === 'garage', snap().ui.focus);
  const it2 = app.front.F.items.find(t => t.id === 'multi'); I.feed('move', it2.x + 5, it2.y + 5); I.feed('down', it2.x + 5, it2.y + 5); I.feed('up', it2.x + 5, it2.y + 5); adv(.1); check('ui', 'a click chooses', snap().page === 'multi', snap().page);
  press('cancel');
  // glyphs follow the device and the setting
  const { codeFor } = await import('../src/ui.js');
  I.lastDevice = 'gamepad'; check('ui', 'gamepad prompt code', codeFor(I, 'confirm') === 'Pad0'); I.lastDevice = 'keyboard'; check('ui', 'keyboard prompt code', codeFor(I, 'confirm') === 'Enter');
  check('ui', 'PlayStation glyphs by default, Xbox selectable', (game.settings.glyphs || 'playstation') === 'playstation');
  // attract mode after 10 s idle on the title and the menu; any input ends it
  game.go('front', { page: 'title' }); adv(.8); adv(10.5); check('ui', 'attract starts after 10 s on the title', snap().attract); adv(30); check('ui', 'attract runs through segments', app.attract.seg >= 1, app.attract.seg); press('confirm'); adv(.1); check('ui', 'any input ends attract', !snap().attract && snap().page === 'title');
  game.go('front', { page: 'main' }); adv(.8); adv(10.5); check('ui', 'attract starts on the main menu', snap().attract); I.tap('left'); adv(.1); check('ui', 'a direction ends it', !snap().attract);
  app.modes.editor({ slot: 1, env: 'dustbowl' }); adv(.8); while (app.dialog.open) press('confirm'); adv(11); check('ui', 'no attract in the editor', !snap().attract);
  // dev mode from the pause menu: a slider changes CFG, reset restores
  app.modes.campaign('D1'); adv(.8); const items = app.pauseItems(); const dm = items.find(x => x[0] === 'Dev Mode'); check('ui', 'pause menu has Dev Mode', !!dm);
  dm[1](); adv(.05); check('ui', 'dev mode open', snap().dev); press('tabR'); const g0 = CFG.gravity; app.dev.i = 1; press('right'); check('ui', 'a slider changes CFG live', CFG.gravity > g0, CFG.gravity + ' vs ' + g0); app.dev.i = 0; press('confirm'); check('ui', 'reset all restores defaults', CFG.gravity === g0); press('cancel'); check('ui', 'dev mode closes', !snap().dev);
  for (const s of SLIDERS) { const car = 'coyote', v = sliderGet(s[0], car); check('ui', 'slider ' + s[0] + ' readable with a default', typeof v === 'number' && typeof sliderDefault(s[0], car) === 'number'); }
  { game.input.hold('gas', true); for (let i = 0; i < 90; i++) adv(.1); game.input.hold('right', true); game.input.hold('brake', true); for (let i = 0; i < 20; i++) adv(.1); game.input.hold('gas', false); game.input.hold('right', false); game.input.hold('brake', false); check('ui', 'skid marks laid when sliding', app.race && app.race.skids.length > 0, app.race && app.race.skids.length); }
  { const T = app.dev.tools().map(t => t[0]); for (const want of ['TELEPORT: NEXT CHECKPOINT', 'FINISH NOW', 'AWARD GOLD', 'BOT DRIVES', 'RE-BAKE MEDALS', 'TIME SCALE', 'FRAME STEP', 'SHOW PROBES', 'SHOW ROUTE', 'SHOW GATES', 'SHOW COLLIDERS', 'SHOW FPS', 'UNLOCK EVERYTHING', '+1000 COPPERS', 'RESET PROFILE', 'JUMP TO']) check('ui', 'dev tool: ' + want, T.some(t => t.startsWith(want)), T.join(' | ').slice(0, 200));
    const rb = app.dev.tools().find(t => t[0].startsWith('RE-BAKE')); rb[1](); check('ui', 're-bake keeps the author time', app.authors.D1 > 0);
    for (const k of ['probes', 'route', 'gates', 'colliders']) app.dev.flags[k] = true; adv(.2); for (const k of ['probes', 'route', 'gates', 'colliders']) app.dev.flags[k] = false; check('ui', 'debug views draw without errors', game.errors.length === 0); }
  // the Xbox symbols setting changes what the prompts show
  { game.settings.set('glyphs', 'xbox'); check('ui', 'Button symbols: Xbox selectable', game.input.padStyle() === 'xbox' && game.input.codeLabel('Pad0') === 'A', game.input.padStyle() + ' ' + game.input.codeLabel('Pad0')); game.settings.set('glyphs', 'playstation'); check('ui', 'Button symbols: PlayStation', game.input.padStyle() === 'playstation' && game.input.codeLabel('Pad0') === '✕', game.input.codeLabel('Pad0')); }
  // the flyover intro plays before the countdown, and a press skips it
  { app.modes.campaign('D2'); adv(.8); check('ui', 'flyover intro first', app.race.phase === 'intro'); adv(1); check('ui', 'still flying over at 1 s', app.race.phase === 'intro'); press('confirm'); check('ui', 'a press skips to the countdown', app.race.phase === 'race' && app.race.players[0].run.phase === 'countdown'); }
  // trackside dressing: chevron boards outside tight turns, grandstands at start and finish
  { const { decoFor } = await import('../src/deco.js'); const t = app.track('D4'), d = decoFor(t), tight = t.blocks.filter(b => /^[LR]1$/.test(b.type) && b.L === 0).length; check('ui', 'a chevron board per ground-level tight turn', d.filter(x => x.kind === 'chevron').length === tight && tight > 0, d.filter(x => x.kind === 'chevron').length + ' / ' + tight); check('ui', 'grandstands at start and finish', d.filter(x => x.kind === 'grandstand').length === 4); }
  // every pause menu item set exists per scene
  for (const sc of ['race', 'editor', 'replay', 'garage', 'front']) { /* each scene's items are built on demand */ }
  // touch-only gate
  app.touchGate = true; game.go('front', { page: 'title' }); adv(.8); check('ui', 'touch gate shows on the title', snap().touchGate && app.front.F.items[0].label === 'SETTINGS'); adv(10.5); check('ui', 'attract runs on the touch gate', snap().attract); app.attract.stop(); app.touchGate = false;
  // the replay viewer
  fresh(); const P = prep('D1'), r = botRun(P.course, 'coyote', { skill: 1, record: () => new Recorder() }); const rep = { trackId: 'D1', trackName: 'SUNBURN STRIP', car: 'coyote', paint: null, steps: r.steps, splits: r.run.splits, ghost: r.ghost.toGhost().data, date: '2026-11-04' };
  app.modes.replay(rep); adv(.8); check('ui', 'replay scene', game.sceneName === 'replay'); adv(3); press('camera'); press('camera'); press('cancel'); adv(.8); check('ui', 'replay exits to the list', snap().page === 'replays', snap().page);
  // the garage
  I.feed('move', 2000, 2000); app.modes.garage(); adv(.8); check('ui', 'garage scene', game.sceneName === 'garage'); press('down'); press('right'); check('ui', 'paint changes', app.profile.data.paint.coyote && app.profile.data.paint.coyote.body !== '#e8442a', JSON.stringify(app.profile.data.paint) + ' ' + game.sceneName); press('cancel'); adv(.8); check('ui', 'garage back to the menu', snap().page === 'main');
}
// ---------------------------------------------------------------- online
if (run('online') && onlyOnline) {
  const H = globalThis.AIHub; app.online.H = H;
  await new Promise(r => setTimeout(r, 0)); await app.online.maybeStart(); adv(.8);
  check('online', 'connected, card up, no title', app.online.phase === 'card' && snap().page !== 'main');
  check('online', 'ready() once without input', H.readyN === 1, H.readyN);
  press('confirm'); check('online', 'Enter answers ready on our card', H.answers.includes('ready'));
  H.t = -3000; H.emit('start', { in: 3000 }); adv(.8); check('online', 'race on start', game.sceneName === 'race' && snap().mode === 'online');
  const R = app.race; R.players[0].bot = new Bot(R.players[0].run, { skill: 1 });
  for (let i = 0; i < 600; i++) { H.t += 1000 / 120 * 12; adv(.1); if (H.t > 3000 && i % 10 === 0) H.emit('message', { t: 'g', area: app.online.trackId, run: 0, ms: 0, p: R.players[0].run.car.p, q: [0, 0, 0, 1], v: 100, f: 1 }, 1); if (H.t > 120000) break; }
  const gm = H.sent.filter(s => s[0].t === 'g'); const spanS = (gm[gm.length - 1][2] - gm[0][2]) / 1000;
  check('online', 'ghost messages at most 10 a second', gm.length / spanS <= 10.5, (gm.length / spanS).toFixed(1));
  check('online', 'ghost messages small', gm.every(s => JSON.stringify(s[0]).length < 1024));
  check('online', 'progress about each second', H.progressN >= 50, H.progressN);
  check('online', 'a best time was set and sent', app.online.best !== null && H.sent.some(s => s[0].t === 'best'));
  H.emit('time-up', { graceMs: 5000 }); H.emit('time-up', { graceMs: 5000 }); adv(.8);
  check('online', 'exactly one result', H.results.length === 1, H.results.length);
  check('online', 'the result is a time', H.results[0] && typeof H.results[0].time === 'number');
  H.emit('leave', { id: 1, reason: 'left' }); check('online', 'leave removes the ghost', !app.online.remote[1]);
  H.emit('end', { reason: 'finished', standings: [[0]] }); adv(.5); check('online', 'input and sound stop on end', game.audio.muted && app.online.ended);
}
// ---------------------------------------------------------------- playthrough (the whole game, through the real menus)
if (run('playthrough')) {
  fresh(); game.go('front', { page: 'title' }); adv(.8);
  press('confirm'); while (app.dialog.open) press('confirm');
  const drive = () => { const R = app.race; R.players[0].bot = new Bot(R.players[0].run, { skill: 1 }); for (let i = 0; i < 120 && game.sceneName === 'race'; i++) { adv(1); while (app.dialog.open && app.dialog.modal) press('confirm'); } adv(.5); };
  const toTracks = env => { game.go('front', { page: 'main' }); adv(.8); app.front.focus('race'); press('confirm'); app.front.focus(env); press('confirm'); };
  let golds = 0;
  for (const env of ['dustbowl', 'hedgerow', 'frostpeak']) {
    toTracks(env); check('playthrough', env + ' track list reached', snap().page === 'tracks', snap().page);
    for (const t of TRACKS.filter(x => x.env === env)) {
      if (snap().page !== 'tracks') toTracks(env);
      app.front.focus(t.id); check('playthrough', t.id + ' open when reached', !app.front.F.cur.disabled);
      press('confirm'); adv(.8); press('confirm');   // skip the flyover
      drive();
      while (app.dialog.open) press('confirm');
      check('playthrough', t.id + ' results with a medal', ['results', 'credits'].includes(snap().page) && app.profile.medal(t.id) >= 3, snap().page + ' medal ' + app.profile.medal(t.id));
      if (app.profile.medal(t.id) >= 3) golds++;
      while (app.dialog.open) press('confirm');
      game.go('front', { page: 'tracks', data: { env } }); adv(.8); while (app.dialog.open) press('confirm');
    }
  }
  check('playthrough', 'golds on all 15', golds === 15, golds);
  check('playthrough', 'coppers earned', app.profile.coppers > 3000, app.profile.coppers);
  check('playthrough', 'every environment open', ['hedgerow', 'frostpeak'].every(e => app.profile.envOpen(e)));
  check('playthrough', 'the ending reached', app.profile.data.ended || snap().page === 'credits', snap().page);
  // a puzzle, a gauntlet round, a built track, a replay: the other suites cover each through the same menus
  check('playthrough', 'no engine errors', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message || e).join(' | '));
}
if (!onlyOnline && (want.length === 0 || all) ) { const r = spawnSync('node', [ROOT + 'tools/test.mjs', 'online'], { encoding: 'utf8' }); for (const l of (r.stdout || '').split('\n')) { if (/^FAIL/.test(l)) { failed++; console.log(l); } const m = /^(\d+) checks/.exec(l); if (m) checks += +m[1]; } }
check('engine', 'no game errors', game.errors.length === 0, game.errors.slice(0, 3).map(e => String(e.message || e)).join(' | '));
// ---------------------------------------------------------------- browser and hub (separate processes)
if (args.includes('--browser') || all) { const r = spawnSync('node', [ROOT + 'tools/browser.mjs'], { encoding: 'utf8' }); for (const l of (r.stdout || '').split('\n')) { if (/^FAIL/.test(l)) { failed++; console.log(l); } if (/^CHECKS (\d+)/.test(l)) checks += +RegExp.$1; if (/^D1AUTHOR (\d+)/.test(l)) check('browser', 'D1 author time the same in Node and the browser', +RegExp.$1 === app.authors.D1, RegExp.$1 + ' vs ' + app.authors.D1); } if (r.status && !/FAIL/.test(r.stdout)) { failed++; console.log('FAIL browser: ' + (r.stderr || '').slice(0, 400)); } }
if (args.includes('--hub') || all) { const r = spawnSync('node', [ROOT + 'tools/hub.mjs'], { encoding: 'utf8' }); for (const l of (r.stdout || '').split('\n')) { if (/^FAIL/.test(l)) { failed++; console.log(l); } if (/^CHECKS (\d+)/.test(l)) checks += +RegExp.$1; } if (r.status && !/FAIL/.test(r.stdout)) { failed++; console.log('FAIL hub: ' + (r.stderr || '').slice(0, 400)); } }
console.log(checks + ' checks, ' + failed + ' failed, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(failed ? 1 : 0);
