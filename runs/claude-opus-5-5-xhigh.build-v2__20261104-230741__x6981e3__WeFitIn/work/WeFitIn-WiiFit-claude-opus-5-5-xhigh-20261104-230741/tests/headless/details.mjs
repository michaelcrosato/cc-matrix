// The plan's rules, one by one, for what bots playing whole activities can't pin down.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assert, boot, done, eq, near, test, App } from '../lib.mjs';
import { installPad, stubPad } from './_people.mjs';
import { T, resetTunables } from '../../src/core/tunables.js';
import { HEADER, PIER } from '../../src/data/games.js';
import { SLACK } from '../../src/data/slackline.js';
import { JOG } from '../../src/data/jog.js';
import { STAND_TIMELINE } from '../../src/data/longstand.js';
import { STAND_SONG } from '../../src/audio/songs.js';
import { HammockScreen } from '../../src/scenes/hub.js';
import { sanitize, wrap, charsIn } from '../../src/ui/font.js';
import { layout } from '../../src/ui/layout.js';
import { AboutScreen } from '../../src/ui/screens/about.js';
import { NameEntryScreen } from '../../src/ui/screens/mainmenu.js';
import { REPORT_LINES } from '../../src/data/lines.js';

installPad();
const h = await boot({ scene: 'title' });
const { engine } = h;
const look = { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' };
function guest(day = 3, extra = {}) { const s = App.store.create(0, 'Kim', { ...look }); Object.assign(s, { phase: 'day', day, heardBeat: 7, introHeard: true }, extra); return s; }
const startPlay = async (id, args = {}) => { await h.go('activity', { id, mode: 'dropin', noPractice: true, ...args }); h.press('Enter'); h.step(60 * 3 + 2); eq(App.scene.phase, 'play', id); return App.scene; };

// ---- House rules ------------------------------------------------------------------------------
function allFiles(dir) { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? allFiles(p) : [p]; }); }
await test('source rules: no Math.random, no performance.now, no new PointLight, no second three.js', () => {
  for (const f of allFiles('src')) {
    if (f.endsWith('credits-text.js')) continue;
    const s = readFileSync(f, 'utf8');
    for (const bad of [/Math\.random/, /performance\.now/, /new PointLight/, /new THREE\.PointLight/, /from 'three'/, /cdn\./i]) assert(!bad.test(s), `${f}: ${bad}`);
  }
});
await test('the title lives in one constant', () => {
  for (const f of allFiles('src')) {
    if (f.endsWith('title.js') || f.endsWith('credits-text.js')) continue;
    assert(!readFileSync(f, 'utf8').includes("'We Fit In'"), `${f} hard-codes the title`);
  }
});
await test('designer numbers live in src/data', () => {
  eq(HEADER.flight, 1.4); eq(HEADER.speed, 4.5); eq(PIER.runup, 5); eq(SLACK.length, 30); eq(JOG.wait, 12);
});

// ---- The body reads the Dot, in a real run ------------------------------------------------------
await test('Holding Still: in a real run, the body follows the Dot', async () => {
  const s = await startPlay('tree');
  App.dev.autopilot = 'average';
  const lane = s.playerLane;
  const head = new App.THREE.Vector3();
  const xs = [], hs = [];
  for (let i = 0; i < 60 * 24; i++) {
    h.step(1);
    lane.avatar.head.getWorldPosition(head);
    xs.push(lane.dot.x); hs.push(head.x - lane.x);
  }
  App.dev.autopilot = null;
  const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
  const mx = mean(xs), mh = mean(hs);
  let c = 0, vx = 0, vh = 0;
  for (let i = 0; i < xs.length; i++) { c += (xs[i] - mx) * (hs[i] - mh); vx += (xs[i] - mx) ** 2; vh += (hs[i] - mh) ** 2; }
  const r = c / Math.sqrt(vx * vh);
  // Screen-left is character-right on a front-facing avatar, so the sign says it leans the same way you see.
  assert(Math.abs(r) > 0.85, `correlation of head and Dot: ${r}`);
  assert(Math.sqrt(vx / xs.length) > 0.05, 'the Dot actually moved');
  assert(Math.sqrt(vh / hs.length) > 0.01, 'the head actually moved');
  assert(r > 0, `head moves the same way as the Dot on screen: ${r}`);
});
await test('Holding Still: far outside the ring it teeters, then recovers', async () => {
  const s = await startPlay('tree');
  const lane = s.playerLane;
  for (let i = 0; i < 20; i++) { lane.dot.x = 1.1; lane.dot.vx = 0; h.step(1); }
  eq(lane.avatar.current.getClip().name, 'Teeter');
  for (let i = 0; i < 20; i++) { lane.dot.x = 0; lane.dot.vx = 0; h.step(1); }
  eq(lane.avatar.current.getClip().name, 'Tree');
});
await test('Holding Still: settle 4 s unscored, hold, release 2 s; breath calms the Dot', async () => {
  const s = await startPlay('warrior');
  const ev = s.event;
  eq(ev.settle, 4); eq(ev.hold, 30); eq(ev.release, 2); eq(ev.duration, 36);
  const lane = s.playerLane;
  h.step(60 * 3);
  eq(lane.state.n, 0, 'settling is not scored');
  h.step(60 * 2);
  assert(lane.state.n > 0, 'the hold is scored');
  lane.state.s = 1; lane.inp.breath = ev.wantIn(s.eventT);
  ev.stepLane(App.ctx, lane, lane.inp, 1 / 60, s.eventT, false);
  near(lane.m.noise, App.noiseScale() * (1.25 - T.breathBonus * lane.state.s), 0.02, 'noise follows the breath');
});

// ---- Reps -------------------------------------------------------------------------------------
await test('Reps: announced 10, runs 12, and Coach says Last one, Last one, I lied', async () => {
  const s = await startPlay('squats');
  const said = [];
  const orig = App.say.bind(App);
  App.say = (who, text) => { said.push(`${who}:${text}`); orig(who, text); };
  App.dev.autopilot = 'good';
  await h.until(() => s.phase === 'outro', { every: 10, max: 60 * 60 });
  App.dev.autopilot = null;
  App.say = orig;
  eq(s.event.announced, 10); eq(s.event.total, 12);
  const lines = said.filter((l) => l.startsWith('coach:')).map((l) => l.slice(6));
  eq(lines.join('|'), 'Last one.|Last one.|I lied. This is the last one.');
});
await test('Reps: quality bands and the curve', async () => {
  const s = await startPlay('squats');
  const lane = s.playerLane, st = lane.state;
  st.err = 0.05; st.n = 1; s.event.closeRep(lane);
  eq(st.grade, 'Perfect');
  st.err = 0.2; st.n = 1; s.event.closeRep(lane);
  eq(st.grade, 'Good');
  st.err = 0.4; st.n = 1; s.event.closeRep(lane);
  eq(st.grade, 'Wobbly');
});

// ---- Hoop -------------------------------------------------------------------------------------
await test('Hoop: the count does not cost you the hoop; you start with it up and nothing said', async () => {
  App.bark.who = null;
  const s = await startPlay('hoop');
  const st = s.playerLane.state;
  eq(st.down, 0, 'not dropped');
  near(st.lift, 0.5, 0.02, 'lift as it began');
  eq(st.score, 0);
});
await test('Hoop: in band lifts, out of band sinks, wrong way sinks faster, at 0 it drops for 1.5 s', async () => {
  const s = await startPlay('hoop');
  const lane = s.playerLane, st = lane.state, ev = s.event;
  const dt = 1 / 60;
  const circle = (rate, frames) => { const inp = lane.inp; for (let i = 0; i < frames; i++) { st.a += rate * Math.PI * 2 * dt; inp.x = Math.cos(st.a); inp.y = Math.sin(st.a); ev.stepLane(App.ctx, lane, inp, dt, 2, true); } };
  st.lift = 0.3;
  circle(1.5, 120);
  assert(st.inBand, 'band');
  assert(st.lift > 0.8, `lift ${st.lift}`);
  const sc = st.score;
  assert(sc > 0.8, 'turns in band score');
  st.lift = 0.5;
  circle(0.3, 60);
  assert(st.lift < 0.5 && !st.inBand, 'too slow sinks');
  st.lift = 0.5;
  circle(-1.5, 60);
  assert(st.lift < 0.26, `wrong way sinks at .5/s: ${st.lift}`);
  st.lift = 0.001; st.down = 0; st.hoops = 3;
  circle(0.1, 2);
  assert(st.down > 1.4, 'dropped');
  eq(st.hoops, 1, 'all extra hoops fall too');
  eq(ev.dirAt(1), 1); eq(ev.dirAt(30), -1); eq(ev.dirAt(55), 0);
});
await test('Hoop: a flick in the last .4 s catches, up to 4, each +.5', async () => {
  const s = await startPlay('hoop');
  const lane = s.playerLane, st = lane.state, ev = s.event;
  const th = ev.throws[0];
  ev.stepThrows(lane, { x: th.side, y: 0 }, th.t - 1);
  eq(st.hoops, 1, 'too early');
  ev.stepThrows(lane, { x: -th.side, y: 0 }, th.t - 0.2);
  eq(st.hoops, 1, 'wrong side');
  ev.stepThrows(lane, { x: th.side, y: 0 }, th.t - 0.2);
  eq(st.hoops, 2, 'caught');
  st.hoops = 4;
  ev.throws.push({ t: 200, side: 1 }); st.throwI = ev.throws.length - 1;
  ev.stepThrows(lane, { x: 1, y: 0 }, 199.9);
  eq(st.hoops, 4, 'never past 4');
});

// ---- Step -------------------------------------------------------------------------------------
await test('Step: windows Perfect 55, Good 100, OK 140 ms, off-beat breaks the combo, accuracy formula', async () => {
  const s = await startPlay('step');
  const lane = s.playerLane, ev = s.event, st = lane.state;
  const n = (foot, from) => ev.notes.findIndex((x, i) => i >= from && x.foot === foot);
  let i = n('L', 0);
  ev.press(lane, 'L', ev.notes[i].t + 0.05);
  eq(st.P, 1, 'perfect');
  i = n('R', i + 1);
  ev.press(lane, 'R', ev.notes[i].t - 0.09);
  eq(st.G, 1, 'good');
  i = n('L', i + 1);
  ev.press(lane, 'L', ev.notes[i].t + 0.13);
  eq(st.O, 1, 'ok');
  eq(st.combo, 3);
  ev.press(lane, 'L', ev.notes[n('L', i + 1)].t + 0.3);
  eq(st.combo, 0, 'too far off');
  near(ev.scoreOf(lane), (100 * (1 + 0.7 + 0.4)) / ev.notes.length, 1e-9, 'accuracy');
  eq(ev.chart.length, 32);
  near(ev.duration, (60 / 104) * 4 * 32 + 1, 1e-9, '74 s');
});

// ---- Header -----------------------------------------------------------------------------------
await test('Header solo: you on the centre mat with 2 m either way; June and Marguerite on their own mats with .8, really playing', async () => {
  const s = await startPlay('header');
  const ev = s.event;
  eq(s.lanes.length, 3, 'three lanes');
  const me = s.playerLane, others = s.lanes.filter((l) => !l.isPlayer);
  eq(me.x, 0, 'centre'); eq(s.lanes.indexOf(me), 1, 'between them');
  eq(others.map((l) => l.who).sort().join(), 'june,marguerite', 'Dennis is at the catapult');
  for (const l of others) {
    eq(l.driver.kind, 'bot');
    eq(ev.rangeOf(l), 0.8);
    assert(l.mat, 'own mat');
    assert(Math.abs(l.x) - 0.8 > 2, 'your strip does not run through their lane');
    assert(l.z < me.z - 1, 'they stand back');
    near(l.avatar.root.position.z, l.z, 1e-6);
  }
  engine.input.setKey('KeyD', true); App.device.last = 'keyboard';
  h.step(90);
  engine.input.setKey('KeyD', false);
  near(me.state.pos, 2, 1e-6, 'all the way along the sand');
  h.step(60 * 20);
  for (const l of others) assert(l.state.heads > 0, `${l.who} heads some`);
  const w = ev.waves[0];
  near(ev.landsAt(me, w), w.at * 2, 1e-9);
  near(ev.landsAt(others[0], w), w.at * 0.8, 1e-9);
  const r = s.result();
  eq(r.classmates.map((c) => c.who).sort().join(), 'june,marguerite', 'on the results');
  for (const c of r.classmates) assert(c.score > 0, `${c.who} scored`);
  App.stack.clear();
});
await test('Header: tiers at 5, 10, 20; flip-flop -10, combo lost, .6 s daze; pineapple +30; hitstop on a header', async () => {
  const s = await startPlay('header');
  const lane = s.playerLane, ev = s.event, st = lane.state;
  const hit = (type) => ev.onHit(App.ctx, lane, { type, at: 0, t0: 0, t1: 1 }, true);
  eq(ev.rangeOf(lane), 2, 'solo lane');
  hit('coconut'); eq(st.score, 10);
  st.combo = 5; const a = st.score; hit('coconut'); eq(st.score - a, 20, 'x2');
  st.combo = 10; const b = st.score; hit('coconut'); eq(st.score - b, 30, 'x3');
  st.combo = 20; const c = st.score; hit('coconut'); eq(st.score - c, 40, 'x4');
  const d = st.score; hit('pineapple'); eq(st.score - d, 30);
  const e = st.score; const combo = st.combo; assert(combo > 0); hit('flip'); eq(st.score - e, -10); eq(st.combo, 0); near(st.daze, 0.6, 1e-9);
  const pos = st.pos;
  lane.inp.x = 1;
  ev.stepLane(App.ctx, lane, lane.inp, 1 / 60, 3, true);
  eq(st.pos, pos, 'dazed means no moving');
  st.daze = 0;
  ev.stepLane(App.ctx, lane, lane.inp, 1 / 60, 3, true);
  near(st.pos - pos, 4.5 / 60, 1e-9, '4.5 m/s');
  near(ev.gap(0), 1.3, 1e-9); near(ev.gap(60), 0.7, 1e-9);
});

// ---- Slackline --------------------------------------------------------------------------------
await test('Slackline: stars, checkpoints, gusts, Kevin 18 to 24 m', async () => {
  const s = await startPlay('slackline');
  const res = (z, falls, time) => { s.z = z; s.falls = falls; s.time = time; return s.result(); };
  eq(res(30, 0, 30).stars, 3); eq(res(30, 1, 30).stars, 2); eq(res(30, 0, 33).stars, 2); eq(res(30, 2, 30).stars, 1); eq(res(30, 0, 50).stars, 1); eq(res(20, 0, 75).stars, 0);
  eq(res(30, 1, 37).score, 1000 - 60 - 8 * 10);
  s.time = 0; s.falls = 0; s.z = 12; s.lastCheckpoint = 10; s.dot.x = 1.05; s.dot.vx = 0;
  h.step(2);
  assert(s.fallT > 0, 'falls past 1');
  eq(s.falls, 1);
  h.step(60 * 4);
  eq(engine.timeScale, 1, 'slow motion ends');
  near(s.z, 10, 0.5, 'back at the checkpoint');
  s.z = 18.5; s.kevinOn = false; s.gust = null; s.nextGustAt = 99; s.dot.reset();
  App.dev.autopilot = 'expert';
  h.step(5);
  assert(s.kevinOn, 'Kevin lands at 18 m');
  assert(Math.abs(s.m.bx) > 0.3, 'and adds a bias');
  s.z = 24.1;
  h.step(5);
  eq(s.kevinOn, false, 'gone by 24 m');
  s.nextGustAt = s.z; s.gust = null;
  h.step(2);
  assert(s.gust, 'a gust comes');
  near(s.gust.warn, SLACK.gustWarn, 0.1, 'telegraphed 1.5 s');
  App.dev.autopilot = null;
});

// ---- Jog --------------------------------------------------------------------------------------
await test('Jog: same foot stumbles, too fast gets a stitch, Coach waits at 12 m, score formula', async () => {
  const s = await startPlay('jog');
  const step = (code) => { engine.input.setKey(code, true); h.step(1); engine.input.setKey(code, false); };
  step('KeyF'); h.step(5); step('KeyF');
  assert(s.stumbleT > 0, 'same side twice');
  s.stumbleT = 0;
  let foot = 'KeyJ';
  for (let i = 0; i < 80; i++) { step(foot); foot = foot === 'KeyJ' ? 'KeyF' : 'KeyJ'; h.step(5); } // 10 steps a second
  assert(s.stitchT > 0 || s.overT > 0, `stitch ${s.stitchT} over ${s.overT} cad ${s.cadence}`);
  s.dist = 0; s.coachDist = 12.5; s.cadence = 0; s.speed = 0;
  const c = s.coachDist;
  h.step(30);
  near(s.coachDist, c, 0.01, 'she waits, unimpressed');
  s.time = 80; s.dist = s.length; s.inBandT = s.length / JOG.speed; s.cupsGot = JOG.cups;
  eq(s.result().score, 100);
  s.inBandT = 0; s.cupsGot = 9;
  eq(s.result().score, 15);
});

// ---- Pier -------------------------------------------------------------------------------------
await test('Pier: distance formula, lip power, three attempts, stars on the best', async () => {
  const s = await startPlay('pier');
  s.speed = 14; s.power = 1;
  near(s.distanceNow(1), 14 * 1.4 * 1 * T.pierBoost, 1e-9);
  s.speed = 10; s.power = 0.5;
  near(s.distanceNow(0.5), 10 * 1.1 * 0.8 * T.pierBoost, 1e-9);
  s.st = 5.1;
  s.speed = 10;
  s.jump(App.ctx);
  near(s.power, 1 - 0.1 / 0.25, 1e-6, 'power from the timing');
  eq(s.stage2, 'flight');
  h.step(60 * 6);
  eq(s.results.length, 1, 'one attempt counted');
  App.dev.autopilot = 'good';
  await h.until(() => s.resultsShown, { every: 20, max: 60 * 60 });
  App.dev.autopilot = null;
  eq(s.attempt, PIER.attempts);
  eq(s.results.length, 3);
  const best = Math.max(...s.results.map((r) => r.distance));
  near(s.lastResult.score, Math.round(best * 10) / 10, 1e-9);
});

// ---- Tray -------------------------------------------------------------------------------------
await test('Tray: gravity tilts and is restored on leaving; colliders stay flat; correct +10, wrong -3, drop -1', async () => {
  const s = await startPlay('tray', { board: 0 });
  const w = App.ctx.physics.world;
  engine.input.setKey('KeyD', true);
  h.step(60);
  engine.input.setKey('KeyD', false);
  assert(w.gravity.x > 1, `gravity x ${w.gravity.x}`);
  const g = Math.hypot(w.gravity.x, w.gravity.y, w.gravity.z);
  near(g, T.trayGravity, 0.01, 'magnitude is the tunable');
  const v = s.vits.find((x) => !x.done);
  const right = s.cups.find((c) => c.color === v.color);
  const before = s.score;
  s.scoreVit(App.ctx, v, right, true);
  eq(s.score - before, 10);
  const v2 = s.vits.find((x) => !x.done);
  const wrong = s.cups.find((c) => c.color !== v2.color);
  s.wrongVit(App.ctx, v2, wrong, true);
  eq(s.score - before, 7);
  s.dropVit(App.ctx, v2, true);
  eq(s.score - before, 6);
  eq(v2.wait, 3, 'respawns after 3 s');
  await h.go('title', {});
  eq(App.ctx.physics.world.gravity.y, -24, 'restored');
});

await test('Tray: all eight are on the board from the start, each with its own start cell, and the same on every board', async () => {
  for (let board = 0; board < 3; board++) {
    const s = await startPlay('tray', { board });
    eq(s.vits.length, 8, 'eight vitamins');
    assert(s.starts.length >= 8, `start cells ${s.starts.length}`);
    for (const v of s.vits) { assert(v.body.isEnabled(), 'live'); assert(v.mesh.visible, 'seen'); assert(!v.done && v.wait === 0, 'waiting for nothing'); }
    const colours = new Set(s.vits.map((v) => v.color)).size;
    assert(colours >= 2 && colours <= 3, `colours ${colours}`);
  }
});
await test('Tray: a rolling vitamin turns about its own middle, so it never swings through the tray', async () => {
  const s = await startPlay('tray', { board: 0 });
  const { Box3, Vector3, Quaternion, Euler } = App.THREE;
  const v = s.vits[0];
  const q = new Quaternion();
  const centreOf = () => { s.tilt.updateMatrixWorld(true); return s.tilt.worldToLocal(new Box3().setFromObject(v.mesh).getCenter(new Vector3())); };
  s.visual();
  const level = centreOf();
  for (const a of [[Math.PI, 0, 0], [Math.PI / 2, 0, 0], [0, 0, Math.PI / 2], [1, 2, 3]]) {
    q.setFromEuler(new Euler(...a));
    v.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    s.visual();
    const c = centreOf();
    near(c.y, level.y, 0.03, `height at ${a}`);
    near(c.x, level.x, 0.03, `x at ${a}`);
    near(c.z, level.z, 0.03, `z at ${a}`);
  }
  App.stack.clear();
});
await test('Tray: at full tilt, every way, the tray stays above the sand and the vitamins stay on its floor', async () => {
  const s = await startPlay('tray', { board: 0 });
  const { Box3 } = App.THREE;
  const sandTop = new Box3().setFromObject(s.set.sand).max.y;
  const maxT = (T.trayMaxTilt * Math.PI) / 180;
  s.visual();
  s.tilt.updateMatrixWorld(true);
  const floorTop = 0.01;
  const pill = new Box3().setFromObject(s.vits[0].mesh);
  near(s.tilt.worldToLocal(pill.min.clone()).y, floorTop, 0.03, 'the pill rests on the floor');
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    s.tiltX = sx * maxT; s.tiltZ = sz * maxT;
    s.visual();
    s.tilt.updateMatrixWorld(true);
    const low = new Box3().setFromObject(s.tilt).min.y;
    assert(low > sandTop, `tilt ${sx},${sz}: lowest point ${low}, sand ${sandTop}`);
  }
  s.tiltX = s.tiltZ = 0;
  App.stack.clear();
});
await test('Tray: each cup is an untagged cylinder trigger, and the trigger is what scores', async () => {
  const s = await startPlay('tray', { board: 0 });
  for (const c of s.cups) { assert(c.trigger.def.cylinder, 'a cylinder'); eq(c.trigger.options.tag, undefined, 'untagged'); }
  const put = (v, c, vx = 0) => { v.body.setTranslation({ x: c.x, y: 0.17, z: c.z }, true); v.body.setLinvel({ x: vx, y: 0, z: 0 }, true); };
  const v = s.vits[0], right = s.cups.find((c) => c.color === v.color);
  const start = s.score;
  put(v, right);
  h.step(2);
  assert(v.done, 'in the right cup');
  eq(s.score - start, 10, '+10');
  // Into the wrong one: -3, once, and it goes back to the start.
  const v2 = s.vits.find((x) => !x.done), wrong = s.cups.find((c) => c.color !== v2.color);
  const b2 = s.score;
  put(v2, wrong);
  h.step(4);
  eq(s.score - b2, -3, 'counted once');
  assert(Math.hypot(v2.body.translation().x - wrong.x, v2.body.translation().z - wrong.z) > 1, 'back at the start');
  // Too fast to drop in: it goes straight over.
  const v3 = s.vits.find((x) => !x.done && x !== v2), r3 = s.cups.find((c) => c.color === v3.color);
  const c3 = s.correct;
  put(v3, r3, 6);
  h.step(1);
  eq(s.correct, c3, 'too fast');
  App.stack.clear();
});

await test('Jog: the island is cut away as you pass, so you are never hidden behind it for long', async () => {
  const s = await startPlay('jog');
  App.dev.autopilot = 'good';
  const { Raycaster, Vector3 } = App.THREE;
  const ray = new Raycaster(), part = new Vector3(), cam = new Vector3(), dir = new Vector3();
  const mine = (o) => { for (let p = o; p; p = p.parent) if (p === s.avatar.root) return true; return false; };
  let samples = 0, hidden = 0, run = 0, longest = 0;
  while (s.phase === 'play' && !s.resultsShown) {
    h.step(6);
    samples++;
    const camera = App.ctx.camera.camera;
    ray.camera = camera;
    camera.getWorldPosition(cam);
    s.avatar.root.getWorldPosition(part);
    let blocked = 0;
    for (const y of [0.9, 0.6]) {
      part.y += y;
      dir.copy(part).sub(cam);
      ray.far = dir.length() - 0.3;
      ray.set(cam, dir.normalize());
      const meshes = [];
      App.ctx.scene.traverseVisible((o) => { if (o.isMesh && !o.isSkinnedMesh && !mine(o)) meshes.push(o); });
      if (ray.intersectObjects(meshes, false).length) blocked++;
    }
    if (blocked === 2) { hidden++; run++; longest = Math.max(longest, run); } else run = 0;
  }
  App.dev.autopilot = null;
  assert(samples > 300, `only ${samples} samples`);
  assert(hidden / samples < 0.02, `hidden ${hidden}/${samples}`);
  assert(longest * 0.1 <= 0.5, `hidden for ${longest * 0.1} s at a stretch`);
  // Off again once you've gone by: nothing stays cut.
  s.dist = 0; s.applyCuts();
  const away = s.cuts.filter((c) => !c.at.some((d) => d <= 5));
  assert(away.length && away.every((c) => c.prop.visible), 'props you are not passing are back');
  App.stack.clear();
});

// ---- The Long Stand ---------------------------------------------------------------------------
await test('Long Stand: every timeline row lands on time, the swell at t = 75', async () => {
  const s = await startPlay('stand');
  App.dev.autopilot = 'good';
  const at = async (t) => { await h.until(() => s.time >= t, { every: 2, max: 60 * 100, what: `t ${t}` }); };
  await at(1); near(s.ring, 0.4, 1e-9);
  await at(11); eq(s.bias, 0.1); assert(s.kevinPerched, 'Kevin on your head');
  await at(31); near(s.ring, 0.34, 1e-9);
  await at(36); eq(s.raining, true); near(s.noise, 1.2, 1e-9);
  await at(46); eq(s.clapT >= 0, true);
  await at(51); near(s.ring, 0.28, 1e-9);
  await at(56); assert(s.juneT > 0, 'June drifts across the dial');
  await at(76); eq(s.raining, false); near(s.ring, 0.24, 1e-9); near(s.noise, 1, 1e-9);
  await at(86); eq(s.bias, 0); eq(s.kevinPerched, false);
  await h.until(() => s.phase === 'outro' || s.resultsShown, { every: 2, max: 60 * 10 });
  App.dev.autopilot = null;
  eq(STAND_TIMELINE[STAND_TIMELINE.length - 1].t, 90);
  // 48 BPM, 16 steps, 4 steps a beat: 5 s a bar, so the swell is at bar 15.
  near((60 / STAND_SONG.bpm) * 4, 5, 1e-9);
  eq(STAND_SONG.order.indexOf('swellA'), 15);
});
await test('Long Stand: the music starts with the standing, not before', async () => {
  await h.go('activity', { id: 'stand', mode: 'dropin', noPractice: true });
  eq(engine.audio.playing, '', 'silent during the intro');
  h.press('Enter');
  h.step(60 * 3 + 3);
  eq(engine.audio.playing, 'stand');
  await h.go('title', {});
});

// ---- The island: pad, keys, mouse -------------------------------------------------------------
await test('hub: pad Cross interacts by a prompt and jumps away from one; Triangle waves; Square sits', async () => {
  guest();
  await h.go('hub', {});
  const s = App.scene;
  s.stand('pavilion');
  h.step(2);
  stubPad.buttons[0].pressed = true; h.step(2); stubPad.buttons[0].pressed = false; h.step(2);
  eq(App.stack.top?.name, 'station', 'Cross interacts');
  App.stack.clear();
  s.hero.teleport([-5, 0.1, 9]);
  h.step(40); // land first
  eq(s.nearest, null);
  const jumps = s.hero.stats.jumps;
  stubPad.buttons[0].pressed = true; h.step(2); stubPad.buttons[0].pressed = false; h.step(20);
  assert(s.hero.stats.jumps > jumps, 'Cross jumps');
  h.step(60);
  s.barkT = 0; App.bark.who = null;
  stubPad.buttons[3].pressed = true; h.step(2); stubPad.buttons[3].pressed = false; h.step(5);
  assert(App.bark.who === 'ounce', 'a wave gets noted');
  await h.until(() => s.hero.state === 'idle', { every: 5, max: 60 * 6, what: 'the wave to finish' });
  stubPad.buttons[2].pressed = true; h.step(2); stubPad.buttons[2].pressed = false; h.step(40);
  assert(/sit/i.test(s.hero.anim) || /sit/i.test(s.hero.state), `sits: ${s.hero.anim}`);
});
await test('hub: the stick walks; keyboard V and B wave and sit; the HUD shows day, Drips and prescription', async () => {
  guest();
  await h.go('hub', {});
  const s = App.scene;
  s.hero.teleport([-5, 0.1, 9]);
  h.step(3);
  const x0 = s.feet.x, z0 = s.feet.z;
  stubPad.axes[0] = 1;
  h.step(30);
  stubPad.axes[0] = 0;
  assert(Math.hypot(s.feet.x - x0, s.feet.z - z0) > 1, 'walked');
  layout.record = true;
  h.step(2);
  for (const name of ['day', 'drips', 'prescription']) assert(layout.rects.some((r) => r.name === name), name);
  layout.record = false;
  h.step(60);
  s.barkT = 0; App.bark.who = null;
  engine.input.setKey('KeyV', true); h.step(2); engine.input.setKey('KeyV', false); h.step(2);
  eq(App.bark.who, 'ounce', 'V waves');
});
function pointAtWorld(x, z) {
  const v = new App.THREE.Vector3(x, 0, z).project(App.ctx.camera.camera);
  engine.input.setPointer(v.x, v.y, false);
}
await test('hub: hover names a station; clicking the ground walks; clicking a station walks there and enters', async () => {
  guest();
  await h.go('hub', {});
  const s = App.scene;
  s.hero.teleport([2, 0.1, 6]);
  h.step(5);
  s.barkT = 99;
  // Hover the Sweat Jar.
  engine.input.setPointer(0.1, 0.1, false); h.step(1);
  App.device.last = 'mouse';
  pointAtWorld(4, -4);
  h.step(2);
  App.device.last = 'mouse';
  h.step(1);
  eq(s.hoverStation, 'jar', 'hover');
  // Click the ground: it walks.
  pointAtWorld(5, 7);
  h.step(2);
  const before = s.feet.clone();
  engine.input.setButtons(1); h.step(1); engine.input.setButtons(0); h.step(1);
  assert(s.walkTarget, 'a walk target');
  h.step(60);
  assert(before.distanceTo(s.feet) > 1, 'it walked');
  // Keys cancel the walk.
  engine.input.setKey('KeyA', true); h.step(2); engine.input.setKey('KeyA', false);
  eq(s.walkTarget, null, 'keys take over');
  // Click a station: it walks over and opens the menu.
  s.hero.teleport([5, 0.1, 3]);
  h.step(150); // let the camera catch up: the pointer is aimed through it
  App.device.last = 'mouse';
  pointAtWorld(11, 3);
  h.step(2);
  App.device.last = 'mouse';
  h.step(1);
  eq(s.hoverStation, 'shed');
  engine.input.setButtons(1); h.step(1); engine.input.setButtons(0);
  await h.until(() => App.stack.top?.name === 'station', { every: 5, max: 60 * 12, what: 'walks to the shed' });
  eq(App.stack.top.id, 'shed');
  App.stack.clear();
});
await test('hub: the pointer is camera.rayAt then castRay: it lands on what it hits, and neither the invisible walls nor you stop it', async () => {
  guest();
  await h.go('hub', {});
  const s = App.scene, { physics } = App.ctx;
  s.hero.teleport([2, 0.1, 6]);
  h.step(150);
  s.barkT = 99;
  const at = (x, z) => { pointAtWorld(x, z); h.step(1); return s.groundAtPointer(App.ctx); };
  const ground = at(5, 7);
  assert(ground && ground.y < 0.2, `on the ground, y ${ground?.y}`);
  near(ground.x, 5, 0.4); near(ground.z, 7, 0.4);
  const shed = at(11, 1.6);
  assert(shed && shed.y > 0.3, `on the shed, y ${shed?.y}`);
  // Under the hero's own feet: the ray goes through.
  const f = s.feet;
  const me = at(f.x, f.z);
  assert(me && me.y < 0.2, `through you, y ${me?.y}`);
  // All round the edge: some rays would stop at an invisible wall if they were let.
  let stopped = 0;
  for (let i = 0; i < 40; i++) {
    const a2 = (i / 40) * Math.PI * 2;
    const p = at(Math.cos(a2) * 16, Math.sin(a2) * 15);
    const raw = physics.castRay(s.rayO, s.rayD, 200);
    if (!raw || !physics.hasTag(raw.collider, 'invisibleWall')) continue;
    stopped++;
    assert(!p || p.y < raw.point.y, 'the wall did not stop the pointer');
  }
  assert(stopped > 0, 'no ray met a wall, so this proves nothing');
});
await test('hub: Ounce hops after you, and barks at most every 6 s', async () => {
  guest();
  await h.go('hub', {});
  const s = App.scene;
  s.hero.teleport([-8, 0.1, 8]);
  s.ounce.root.position.set(4, 0.06, 4);
  h.step(60 * 6);
  const d = Math.hypot(s.ounce.root.position.x - s.feet.x, s.ounce.root.position.z - s.feet.z);
  assert(d < 3, `still ${d} away`);
  const times = [];
  const orig = App.say.bind(App);
  App.say = (who, text) => { if (who === 'ounce') times.push(App.frame); orig(who, text); };
  for (let i = 0; i < 60 * 40; i += 30) h.step(30);
  App.say = orig;
  for (let i = 1; i < times.length; i++) assert(times[i] - times[i - 1] >= 60 * 6 - 1, `barks ${(times[i] - times[i - 1]) / 60}s apart`);
});

// ---- The day's end ----------------------------------------------------------------------------
await test('hammock: with nothing done it asks; "Stay up" stays, "End the day" ends; never a block', async () => {
  const slot = guest(2);
  await h.go('hub', {});
  const s = App.scene;
  s.stand('hammock');
  h.step(2);
  h.press('Enter');
  eq(App.stack.top?.name, 'hammock');
  assert(App.stack.top instanceof HammockScreen);
  App.stack.top.menu.focus = 0;
  h.press('Enter');
  eq(App.stack.open, false, 'stayed up');
  eq(slot.phase, 'day');
  s.stand('hammock');
  h.step(2);
  h.press('Enter');
  App.stack.top.menu.focus = 1;
  h.press('Enter');
  await h.settle();
  eq(App.scene.id, 'report');
  eq(slot.phase, 'report');
});
await test('hammock: leaving with the prescription open is a guilt-trip, then the day ends anyway', async () => {
  const slot = guest(4);
  slot.todayDone = [{ id: 'tree', stars: 1, score: 50 }];
  await h.go('hub', {});
  App.scene.stand('hammock');
  h.step(2);
  h.press('Enter');
  eq(App.stack.top?.name, 'dialogue');
  assert(App.stack.top.lines[0].text.includes('not finished'), App.stack.top.lines[0].text);
  while (App.stack.open) { h.press('Enter'); h.step(5); }
  await h.settle();
  eq(App.scene.id, 'report');
});
await test('Report: a classmate you beat reacts, once', async () => {
  const slot = guest(3);
  slot.todayDone = [{ id: 'tree', stars: 2, score: 80, beat: ['dennis', 'june'] }];
  await h.go('report', {});
  const s = App.scene;
  const line = s.lines[0];
  assert(line === REPORT_LINES.beatJune || line === REPORT_LINES.beatDennis, line);
  await h.go('report', {});
  assert(App.scene.lines[0] !== line, 'each only once');
});
await test('Report: dusk, the concern, and on to the next morning', async () => {
  const slot = guest(3);
  slot.phase = 'report';
  await h.go('report', {});
  h.step(30);
  h.press('Enter');
  const concern = App.stack.top.lines[App.stack.top.lines.length - 1].text;
  assert(/concern/i.test(concern), concern);
  while (App.stack.open) { h.press('Enter'); h.step(5); }
  h.step(2);
  h.press('Enter');
  await h.settle();
  eq(App.scene.id, 'weighin');
  eq(slot.day, 4);
});
await test('hard versions: a Difficulty row from day 6, and hard rings are smaller', async () => {
  const { StationScreen } = await import('../../src/scenes/hub.js');
  guest(5);
  await h.go('hub', {});
  eq(new StationScreen('pavilion', App.scene).menu.items.some((i) => i.id === 'hard'), false, 'not on day 5');
  App.slot.day = 6;
  const st = new StationScreen('pavilion', App.scene);
  const row = st.menu.items.find((i) => i.id === 'hard');
  assert(row, 'on day 6');
  row.action();
  eq(st.hard, true);
  await h.go('activity', { id: 'tree', mode: 'week', hard: true, noPractice: true });
  near(App.scene.event.ringBase, 0.32, 1e-9);
  App.store.resetAll();
});

// ---- Menus and text ---------------------------------------------------------------------------
await test('name entry: 8 characters at most, the grid works from a pad, Done goes on', async () => {
  await h.go('title', {});
  const n = new NameEntryScreen(0);
  App.stack.push(n);
  h.step(1);
  App.device.last = 'pad';
  for (let i = 0; i < 11; i++) { stubPad.buttons[0].pressed = true; h.step(2); stubPad.buttons[0].pressed = false; h.step(2); }
  eq(n.text, 'AAAAAAAA', '8 at most');
  stubPad.buttons[3].pressed = true; h.step(2); stubPad.buttons[3].pressed = false; h.step(2);
  eq(n.text.length, 7, 'Triangle deletes');
  stubPad.buttons[13].pressed = true; h.step(2); stubPad.buttons[13].pressed = false; h.step(2);
  eq(n.cy, 1, 'd-pad moves');
  App.stack.clear();
});
await test('dialogue: Cross completes, then advances; holding skips fast', async () => {
  const { DialogueScreen } = await import('../../src/ui/dialogue.js');
  await h.go('title', {});
  let finished = false;
  const d = new DialogueScreen(['ounce: Thank you. I have written that down.', 'coach: Good. Again. That was also good. Again.'], { onDone: () => { finished = true; } });
  App.stack.push(d);
  h.step(5);
  assert(d.shown < d.text.length, 'typing');
  h.press('Enter');
  eq(d.complete, true, 'first press completes');
  eq(d.i, 0);
  h.press('Enter');
  eq(d.i, 1, 'second advances');
  engine.input.setKey('Enter', true);
  h.step(60 * 5);
  engine.input.setKey('Enter', false);
  eq(finished, true, 'holding runs it out');
  eq(App.stack.open, false);
});
await test('names with anything in them are drawn safely', () => {
  eq(sanitize('Zoë <b>'), 'Zo? <b>');
  assert(wrap('x'.repeat(200), charsIn(100)).every((l) => l.length <= charsIn(100)), 'long words break');
});

// ---- CREDITS.md, all of it --------------------------------------------------------------------
await test('CREDITS.md: every word is on the page, and scrolling reaches the very end', async () => {
  await h.go('title', {});
  const a = new AboutScreen();
  App.stack.push(a);
  a.i = a.pages.findIndex((p) => p.title === 'CREDITS.md');
  h.step(2);
  const { hud } = engine;
  const lines = a.layout(hud, a.pages[a.i]).lines.map((l) => l.s);
  // Compared without whitespace: long ids break across lines when they wrap, and that's all wrapping may change.
  const squeeze = (s) => s.replace(/\s+/g, '');
  const file = squeeze(sanitize(readFileSync('CREDITS.md', 'utf8')));
  const shown = squeeze(lines.join(''));
  assert(file.length > 30000, 'the real file');
  if (shown !== file) { let i = 0; while (shown[i] === file[i]) i++; throw new Error(`differs at ${i}: "${shown.slice(i, i + 40)}" vs "${file.slice(i, i + 40)}"`); }
  // Scroll it all with the wheel, recording what is actually drawn.
  layout.record = true;
  const drawn = [];
  h.step(1);
  const seen = () => layout.rects.filter((r) => r.name === 'about-text').map((r) => r.text);
  let guard = 0;
  let prev = -1;
  while (a.scroll !== prev && guard++ < 2000) {
    prev = a.scroll;
    if (a.scroll % 3 === 0) drawn.push(...seen());
    engine.input.addPointer(0, 0, 1);
    h.step(1);
  }
  drawn.push(...seen());
  layout.record = false;
  eq(a.scroll, a.lineCount - a.visible, 'reached the end');
  const lastLine = lines.filter(Boolean).pop();
  assert(drawn.includes(lastLine), `last line drawn: ${lastLine}`);
  const unique = new Set(drawn);
  const missing = lines.filter((l) => l && !unique.has(l));
  eq(missing.length, 0, `lines never drawn: ${missing.slice(0, 2).join(' / ')}`);
  App.stack.clear();
});

// ---- Settings persist -------------------------------------------------------------------------
await test('settings survive a reload; Reset puts everything back, music at 10%', async () => {
  const { Store } = await import('../../src/core/save.js');
  App.settings.music = 0.4; App.settings.glyphs = 'xbox'; App.settings.gentle = true;
  App.saveSettings();
  const again = new Store(App.store.storage);
  eq(again.settings.music, 0.4); eq(again.settings.glyphs, 'xbox'); eq(again.settings.gentle, true);
  const { SettingsScreen } = await import('../../src/ui/screens/settings.js');
  const s = new SettingsScreen();
  App.stack.push(s);
  s.tabs.set(3);
  s.menu.items.find((i) => i.id === 'reset').action();
  eq(App.settings.music, 0.1); eq(App.settings.glyphs, 'ps'); eq(App.settings.gentle, false);
  near(engine.audio.volume.music, 0.1, 1e-6);
  App.stack.clear();
  resetTunables();
});
await test('menus page at 8 rows: Dev Balance is 8 sliders, then its 3 buttons; down, up and the wheel all turn the page', async () => {
  const { DevScreen } = await import('../../src/ui/screens/dev.js');
  App.stack.clear();
  const dev = new DevScreen();
  App.stack.push(dev);
  const m = dev.menu;
  h.step(2);
  eq(m.items.length, 11, 'Balance: 8 sliders and 3 buttons');
  eq(m.pageCount, 2);
  eq(m.rects.length, 8, 'first page');
  for (let i = 0; i < 8; i++) h.press('ArrowDown');
  eq(m.focus, 8); eq(m.top, 8, 'turned the page');
  h.step(1);
  eq(m.rects.length, 3, 'just the buttons');
  eq(m.rects.map((r) => m.items[r.i].id).join(), 'resetTab,resetAll,export');
  h.press('ArrowUp');
  eq(m.top, 0, 'and back');
  const beforeTab = dev.tabs.i;
  engine.input.addPointer(0, 0, 1);
  h.step(2);
  eq(m.top, 8, 'the wheel turns the page');
  eq(m.focus, 8);
  eq(dev.tabs.i, beforeTab, 'not the tab');
  // No tab of Dev Tools shows more than 8.
  for (let i = 0; i < dev.tabs.labels.length; i++) {
    dev.tabs.i = i; dev.refresh();
    for (let k = 0; k < m.pageCount; k++) { m.focus = k * 8; h.step(1); assert(m.rects.length <= 8, `${dev.tabs.current} page ${k}: ${m.rects.length} rows`); }
  }
  App.stack.clear();
});
await test('no game errors in any of that', () => eq(h.errors().length, 0, h.errors().join(' | ')));
done();
