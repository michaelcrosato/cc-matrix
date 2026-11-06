// The numbers in the plan's activity sections, measured on the running game, one by one.
import { assert, boot, done, eq, near, test, App } from '../lib.mjs';
import { T, resetTunables } from '../../src/core/tunables.js';
import { HEADER, PIER } from '../../src/data/games.js';
import { JOG } from '../../src/data/jog.js';
import { SLACK } from '../../src/data/slackline.js';
import { ACTIVITIES } from '../../src/data/activities.js';

const h = await boot({ scene: 'title' });
const { engine } = h;
const start = async (id, args = {}) => { await h.go('activity', { id, mode: 'dropin', noPractice: true, ...args }); h.press('Enter'); h.step(60 * 3 + 2); eq(App.scene.phase, 'play', `${id} is playing`); return App.scene; };
const finish = async (s, what) => { await h.until(() => s.resultsShown, { every: 30, max: 60 * 200, what }); App.dev.autopilot = null; App.stack.clear(); };
const round = (v) => Math.round(v * 10) / 10;
const log = (...a) => { if (process.env.SHOW_FIGURES) console.error('FIGURE', ...a); };

// ---- Island Jog -------------------------------------------------------------------------------
await test('Jog: about 220 m, about 75 s at target pace, on a closed Catmull-Rom curve', async () => {
  const s = await start('jog');
  log('jog length', round(s.length), 'at target', round(s.length / JOG.speed));
  assert(s.length >= 215 && s.length <= 225, `length ${s.length}`);
  eq(JOG.speed, 3, 'target speed');
  assert(s.curve.isCatmullRomCurve3 && s.curve.closed, 'closed Catmull-Rom');
  App.stack.clear();
});
await test('Jog: a good runner finishes in about 75 s, in band, with Coach alongside', async () => {
  const s = await start('jog');
  App.dev.autopilot = 'good';
  let widest = 0, gapMax = 0;
  await h.until(() => { widest = Math.max(widest, Math.abs(s.x)); gapMax = Math.max(gapMax, s.coachDist - s.dist); return s.resultsShown; }, { every: 6, max: 60 * 200, what: 'jog good' });
  App.dev.autopilot = null;
  const r = s.lastResult;
  log('jog good: seconds', round(s.time), 'score', r.score, 'stars', r.stars, 'cups', s.cupsGot, 'in band', round(s.inBandT), 'coach gap', round(gapMax));
  assert(s.dist >= s.length, 'finished');
  assert(s.time >= 70 && s.time <= 82, `time ${s.time}`);
  assert(widest <= 1.5 + 1e-9, `strayed ${widest}`);
  assert(gapMax <= JOG.wait + 0.2, `coach ${gapMax}`);
  App.stack.clear();
});
await test('Jog: band 2.4 to 3.6; same side twice stumbles .5 s; over the band 2 s is a Stitch at half speed for 3 s', async () => {
  const s = await start('jog');
  eq(s.bandLow, 2.4); eq(s.bandHigh, 3.6);
  const press = (code) => { engine.input.setKey(code, true); h.step(1); engine.input.setKey(code, false); };
  press('KeyF'); h.step(1); press('KeyF'); h.step(1);
  near(s.stumbleT, JOG.stumble - 2 / 60, 2 / 60, 'stumble');
  eq(JOG.stumble, 0.5);
  s.stumbleT = 0;
  s.cadence = 3.7; s.overT = 1.99; s.lastFoot = 'L'; s.stepEnergy = 0;
  h.step(2);
  assert(s.stitchT > 0, 'stitch');
  near(s.stitchT, 3, 0.1, '3 s');
  eq(JOG.stitchSpeed, 0.5);
  App.stack.clear();
});
await test('Jog: score is 70 x pace% + 30 x cups%, finished or not; stars 55/75/90', async () => {
  const s = await start('jog');
  eq(ACTIVITIES.jog.stars.join(), '55,75,90');
  const nominal = (s.length / JOG.speed) * 0.92;
  s.inBandT = nominal / 2; s.cupsGot = 9; s.dist = 10;
  eq(s.result().score, 50, 'half and half, not finished');
  s.inBandT = nominal; s.cupsGot = 18;
  eq(s.result().score, 100);
  eq(JOG.cups, 18);
  App.stack.clear();
});

// ---- Slackline --------------------------------------------------------------------------------
await test('Slackline: walking is 1.1 m/s at any push past .3, and none below it', async () => {
  const s = await start('slackline');
  const inp = s.inp;
  const realRead = s.readPlayer.bind(s);
  let y = 0.4;
  s.readPlayer = () => { inp.x = 0; inp.y = y; return inp; };
  const z0 = s.z;
  h.step(60);
  near(s.z - z0, 1.1, 0.04, 'at .4');
  const z1 = s.z; y = 1;
  h.step(60);
  near(s.z - z1, 1.1, 0.04, 'at 1');
  const z2 = s.z; y = 0.29;
  h.step(60);
  eq(s.z, z2, 'below .3 you stand');
  s.readPlayer = realRead;
  eq(SLACK.length, 30); eq(SLACK.limit, 75); eq(SLACK.fallAt, 1); eq(SLACK.gustEvery, 6); eq(SLACK.gustSeconds, 1); eq(SLACK.gustWarn, 1.5);
  eq(SLACK.checkpoints.join(), '0,10,20'); eq(SLACK.kevinOn, 18); eq(SLACK.kevinOff, 24); eq(SLACK.fallSeconds, 1.2); eq(SLACK.noise, 1.25); eq(SLACK.standInst, 1.2); eq(T.slackWalkInst, 2.6); eq(T.gustForce, 1.6);
  App.stack.clear();
});

// ---- Coconut Header ---------------------------------------------------------------------------
await test('Header: 4.5 m/s x lean; lands after 1.4 s; 1.3 s between throws falling to .7 s; 60 s; stars 150/400/800', async () => {
  const s = await start('header');
  const ev = s.event, me = s.playerLane;
  eq(HEADER.speed, 4.5); eq(HEADER.flight, 1.4); eq(ev.duration, 60);
  eq(ACTIVITIES.header.stars.join(), '150,400,800');
  near(ev.gap(0), 1.3, 1e-9, 'first');
  near(ev.gap(60), 0.7, 1e-9, 'last');
  const p0 = me.state.pos;
  me.inp.x = 0.5;
  ev.stepLane(App.ctx, me, me.inp, 1, 0.001, false);
  near(me.state.pos - p0, 2, 2 + 1e-9); // clamped to the strip
  me.state.pos = 0;
  ev.stepLane(App.ctx, me, me.inp, 0.1, 0.001, false);
  near(me.state.pos, 0.225, 1e-9, '4.5 x .5 x .1');
  App.stack.clear();
});
await test('Header: 70% coconuts, 25% flip-flops, 5% pineapples, and every throw lands where it should', async () => {
  const s = await start('header');
  const ev = s.event;
  const count = { coconut: 0, flip: 0, pineapple: 0 };
  // Many games' worth of throws, from the game's own generator.
  ev.waves.length = 0;
  for (let t = 0, n = 0; n < 4000; n++) { ev.next = 0; ev.tick(App.ctx, 0, t = (n % 500) / 10); }
  for (const w of ev.waves) { count[w.type]++; assert(Math.abs(w.at) <= 1, 'on the strip'); eq(round(w.t1 - w.t0), 1.4); }
  const n = ev.waves.length;
  log('header shares', count, 'of', n);
  assert(n > 3000, `throws ${n}`);
  near(count.coconut / n, 0.7, 0.03, 'coconuts');
  near(count.flip / n, 0.25, 0.03, 'flip-flops');
  near(count.pineapple / n, 0.05, 0.015, 'pineapples');
  ev.waves.length = 0; ev.next = 999;
  App.stack.clear();
});
await test('Header: a flip-flop to the head is a .6 s daze with stars circling it', async () => {
  const s = await start('header');
  const ev = s.event, me = s.playerLane;
  ev.waves.length = 0; ev.next = 999;
  for (const l of s.lanes) eq(l.stars.length, 3, 'three stars on every lane');
  assert(me.stars.every((m) => !m.visible), 'none yet');
  ev.onHit(App.ctx, me, { type: 'flip', at: 0, t0: 0, t1: 1 }, true);
  h.step(2);
  assert(me.stars.every((m) => m.visible), 'stars out');
  const a = me.stars[0].position.clone();
  const pos = new App.THREE.Vector3();
  me.avatar.root.getWorldPosition(pos);
  near(Math.hypot(a.x - pos.x, a.z - pos.z), 0.36, 0.01, 'round the head');
  assert(a.y > 1.7, `above the shoulders, ${a.y}`);
  h.step(6);
  assert(me.stars[0].position.distanceTo(a) > 0.05, 'circling');
  h.step(40);
  assert(me.stars.every((m) => !m.visible), 'gone with the daze');
  App.stack.clear();
});

// ---- Pier Jump --------------------------------------------------------------------------------
await test('Pier: distance is speed x (.8 + .6p) x (.6 + .4 ring) x 2.14; stars 18/28/38; three attempts', async () => {
  const s = await start('pier');
  eq(ACTIVITIES.pier.stars.join(), '18,28,38');
  eq(PIER.attempts, 3); eq(T.pierBoost, 2.14);
  s.speed = 14; s.power = 1;
  near(s.distanceNow(1), 14 * 1.4 * 1 * 2.14, 1e-9);
  s.speed = 6; s.power = 0;
  near(s.distanceNow(0), 6 * 0.8 * 0.6 * 2.14, 1e-9);
  App.stack.clear();
});
await test('Pier: tuck zone builds 6 to 14 m/s in the 5 s run-up, a press at the lip scores 1 - |dt|/.25, none before it counts', async () => {
  const s = await start('pier');
  eq(PIER.runup, 5); eq(PIER.speedLow, 6); eq(PIER.speedHigh, 14); eq(PIER.tuck.join(), '-0.8,-0.4');
  const inp = s.inp;
  let confirm = false, y = -0.6;
  s.readPlayer = () => { inp.x = 0; inp.y = y; inp.confirm = confirm; return inp; };
  s.dot.y = -0.6; s.dot.vy = 0;
  // Hold the tuck by hand: the Dot sits in the zone while the speed builds.
  while (s.st < 4.5) { s.dot.y = -0.6; s.dot.vy = 0; h.step(1); }
  near(s.speed, 14, 0.01, 'tuck to top speed');
  assert(s.stage2 === 'runup', 'still running');
  // Too early: nothing happens.
  confirm = true; h.step(1); confirm = false;
  eq(s.stage2, 'runup', 'pressing halfway down the pier does nothing');
  while (s.st < 4.9) h.step(1);
  const pressedAt = s.st + 1 / 60;
  confirm = true; h.step(1); confirm = false;
  eq(s.stage2, 'flight', 'pressed at the lip');
  near(s.power, 1 - Math.abs(pressedAt - 5) / 0.25, 0.08, 'power');
  assert(s.flight >= 3 && s.flight <= 4, `flight ${s.flight}`);
  App.stack.clear();
});
await test('Pier: flight has inst 3 and ring .45; a press in the last .5 s is a cannonball; the splash is hitstop .1 and .25 time for .8 s', async () => {
  const s = await start('pier');
  eq(PIER.inst, 3); eq(PIER.ring, 0.45); eq(PIER.cannonWindow, 0.5);
  const inp = s.inp;
  let confirm = false;
  s.readPlayer = () => { inp.x = 0; inp.y = 0; inp.confirm = confirm; return inp; };
  s.st = 4.95; h.step(1);
  confirm = true; h.step(1); confirm = false;
  eq(s.stage2, 'flight');
  s.st = 0.2;
  confirm = true; h.step(1); confirm = false;
  eq(s.cannon, false, 'too early for a cannonball');
  s.st = s.flight - 0.4;
  confirm = true; h.step(1); confirm = false;
  eq(s.cannon, true, 'cannonball');
  let stops = 0;
  const realStop = engine.hitstop.bind(engine);
  engine.hitstop = (v) => { stops = v; realStop(v); };
  while (s.stage2 === 'flight') h.step(1);
  engine.hitstop = realStop;
  eq(stops, 0.1, 'hitstop');
  eq(engine.timeScale, 0.25, 'slow');
  assert(s.judges.every((j) => j.shown), 'judges react');
  App.stack.clear();
  await h.go('title', {});
  engine.timeScale = 1;
});
for (const [skill, low, high] of [['sloppy', 0, 28], ['average', 18, 45], ['good', 28, 50], ['expert', 28, 50]]) {
  await test(`Pier, ${skill} bot: best distance in the right stars (${low} to ${high} m)`, async () => {
    const s = await start('pier');
    App.dev.autopilot = skill;
    await finish(s, `pier ${skill}`);
    log(`pier ${skill}: best`, round(s.best), 'attempts', s.results.map((r) => round(r.distance)).join(' '), 'stars', s.lastResult.stars);
    assert(s.best >= low && s.best <= high, `best ${s.best}`);
  });
}

// ---- Holding Still ----------------------------------------------------------------------------
for (const [id, want] of [['heron', 0.12], ['fold', 0.18]]) {
  await test(`Holding Still, ${id}: the twist is a slow bias of +-${want} on x; the ring stays where it is`, async () => {
    const s = await start(id);
    const ev = s.event, me = s.playerLane;
    let top = 0, signs = new Set();
    for (let i = 0; i < 60 * 20; i++) {
      h.step(1);
      eq(ev.ringX, 0, 'the ring does not move');
      const b = ev.biasX ?? 0;
      top = Math.max(top, Math.abs(b));
      if (Math.abs(b) > 0.02) signs.add(Math.sign(b));
      near(me.m.bx, b * T.dotAuthority, 1e-9, 'a push on the Dot');
    }
    log(`${id} bias`, round(top * 100) / 100);
    assert(top <= want + 1e-9 && top > want * 0.8, `peak ${top}`);
    assert(signs.size === 2, 'both ways');
    App.stack.clear();
  });
}
// ---- The island --------------------------------------------------------------------------------
await test('island: every place where the plan puts it; the volcano and the hills stand in the way of your feet, not your eyes', async () => {
  App.store.create(0, 'Figures', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  Object.assign(App.slot, { phase: 'day', day: 3, heardBeat: 7, introHeard: true });
  await h.go('hub', {});
  const { STATIONS } = await import('../../src/data/stations.js');
  const want = { terrace: [0, 3], pavilion: [-11, 3], shed: [11, 3], beach: [12, -10], lagoon: [-12, -10], gate: [0, 11], jar: [4, -4], locker: [-4, -4], hall: [0, -8], hammock: [14, 10] };
  for (const [id, at] of Object.entries(want)) eq(STATIONS[id].at.join(), at.join(), id);
  const { physics, scene, camera } = App.ctx;
  const propAt = (name) => { let found = null; scene.traverse((o) => { if (!found && o.name?.startsWith(`${name}:`)) { let p = o; while (p.parent !== scene) p = p.parent; found = p; } }); return found; };
  const volcano = propAt('kettlebell-volcano'), hill = propAt('foam-roller-hill');
  near(volcano.position.x, -15, 0.01); near(volcano.position.z, -14, 0.01);
  near(hill.position.x, 15, 0.01); near(hill.position.z, -14, 0.01);
  eq(volcano.scale.x, 1, 'the volcano at the size it was modelled');
  eq(hill.scale.x, 1, 'the hills at the size they were modelled');
  // The Lagoon's own props stand clear of the volcano's base, which is 7 m round its centre.
  for (const name of ['catapult', 'pier']) {
    const p = propAt(name).position;
    assert(Math.hypot(p.x + 15, p.z + 14) > 7, `${name} is inside the volcano`);
  }
  // Solid: dropping onto them from above lands on them, not on the ground.
  const v3 = (x, y, z) => new App.THREE.Vector3(x, y, z);
  const onVolcano = physics.castRay(v3(-15, 30, -14), v3(0, -1, 0), 60);
  assert(onVolcano && onVolcano.point.y > 1, `volcano top ${onVolcano?.point.y}`);
  const onHill = physics.castRay(v3(15, 30, -14), v3(0, -1, 0), 60);
  assert(onHill && onHill.point.y > 0.5, `hill top ${onHill?.point.y}`);
  // Neither hides a station: the camera looks past each station to reach them.
  const dir = camera.camera.getWorldDirection(v3(0, 0, 0));
  assert(dir.x < 0 && dir.z < 0, 'the camera looks toward -x, -z');
  App.stack.clear();
});
for (const id of ['lagoon', 'beach']) {
  await test(`island: click ${id} from the plaza; you walk there and its menu opens, landmark or no landmark`, async () => {
    App.store.create(0, 'Walk', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
    Object.assign(App.slot, { phase: 'day', day: 3, heardBeat: 7, introHeard: true });
    await h.go('hub', {});
    const s = App.scene;
    s.hero.teleport([0, 0.1, -1]);
    h.step(150);
    s.barkT = 99;
    s.autoEnter = id;
    const { STATIONS } = await import('../../src/data/stations.js');
    s.walkTarget = { x: STATIONS[id].at[0], z: STATIONS[id].at[1] };
    App.device.last = 'mouse';
    await h.until(() => App.stack.top?.name === 'station', { every: 5, max: 60 * 20, what: `walks to ${id}` });
    eq(App.stack.top.id, id);
    App.stack.clear();
  });
}

// ---- A day --------------------------------------------------------------------------------------
async function timed(id, readSeconds) {
  await h.go(id, {});
  let frames = 0, wait = 0;
  while (App.scene.id === id && frames < 60 * 180) {
    h.step(1); frames++;
    await new Promise((r) => setImmediate(r));
    const top = App.stack.top;
    wait = !top || top.name !== 'dialogue' || top.complete ? wait + 1 : 0;
    // The test runs itself, and a person watches the Report's numbers until they move on.
    const watching = App.scene.phase === 'test' || App.scene.phase === 'count';
    if (wait > 60 * readSeconds && !watching) { h.press('Enter'); frames += 2; wait = 0; }
  }
  return frames / 60;
}
await test('a day, at a reading pace of 3 s a line: Morning Weigh-In about 45 s, Evening Report about 20 s', async () => {
  App.store.create(0, 'Pace', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  const slot = App.slot;
  const ins = [], reps = [];
  for (const day of [2, 3, 4]) {
    Object.assign(slot, { phase: 'morning', day, heardBeat: 7, introHeard: true });
    App.dev.autopilot = 'good';
    ins.push(await timed('weighin', 3));
    App.dev.autopilot = null;
    Object.assign(slot, { phase: 'evening', day });
    reps.push(await timed('report', 3));
  }
  log('weigh-in', ins.map(round).join(' '), 'report', reps.map(round).join(' '));
  const mean = (a) => a.reduce((m, v) => m + v, 0) / a.length;
  assert(mean(ins) >= 36 && mean(ins) <= 54, `weigh-in ${ins.join(' ')}`);
  assert(mean(reps) >= 16 && mean(reps) <= 24, `report ${reps.join(' ')}`);
});
await test('Report: the numbers count up, and Next skips the wait', async () => {
  App.store.create(0, 'Skip', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' });
  Object.assign(App.slot, { phase: 'evening', day: 2, heardBeat: 7, introHeard: true, todayDrips: 20 });
  await h.go('report', {});
  eq(App.scene.phase, 'count');
  h.step(60);
  eq(App.scene.phase, 'count', 'still counting');
  h.press('Enter');
  eq(App.scene.phase, 'talk', 'skipped');
  App.stack.clear();
});
await test('no game errors in any of that', () => { resetTunables(); eq(h.errors().length, 0, h.errors().join(' | ')); });
done();
