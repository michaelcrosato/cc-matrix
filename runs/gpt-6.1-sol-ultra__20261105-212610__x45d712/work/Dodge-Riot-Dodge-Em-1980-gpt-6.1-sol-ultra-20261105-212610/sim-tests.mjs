import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import R from './rapier.mjs';

const source = await readFile(new URL('./sim.js', import.meta.url), 'utf8');
const {RiotSimulation, trackPoint, carPoint, curveCache} = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport {RiotSimulation, trackPoint, carPoint, curveCache};').toString('base64'));
const originalWarn = console.warn;
console.warn = (...args) => { if (!String(args[0]).includes('deprecated')) originalWarn(...args); };
await R.init();
console.warn = originalWarn;
let passed = 0, failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const start = (count = 1, attract = false) => {
  const events = [];
  const s = new RiotSimulation(R, (name, data) => events.push({name, data}));
  s.start(count, attract);
  s.eventsForTest = events;
  return s;
};
const run = (s, seconds, input = []) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) s.tick(1 / 60, typeof input === 'function' ? input(s) : input);
};
const forceRunning = s => {s.phase = 'running'; return s;};
const syncPose = car => { const point = carPoint(car); car.body.setTranslation({x:point.x, y:0, z:point.z}, true); };

test('closed lanes have continuous finite positions and expected spacing', () => {
  for (let l = 0; l < 4; l++) {
    assert.deepEqual(trackPoint(l, 0), trackPoint(l, 1));
    for (let n = 0; n < 100; n++) {
      const a = trackPoint(l, n / 100), b = trackPoint(l, (n + 1) / 100);
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z));
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) <= curveCache[l].total / 100 + 0.01);
    }
  }
});
test('round setup has 96 fare dots, four lives, and one rival', () => {
  const s = start();
  assert.equal(s.dots.length, 96); assert.equal(s.lives, 4); assert.equal(s.enemies.length, 1);
  assert.equal(s.phase, 'countdown'); assert.equal(s.players.length, 1);
  s.world.free();
});
test('countdown advances into running without moving cars', () => {
  const s = start(); const progress = s.players[0].progress;
  run(s, 2); assert.equal(s.phase, 'countdown'); assert.equal(s.players[0].progress, progress);
  run(s, 0.5); assert.equal(s.phase, 'running');
  s.world.free();
});
test('Rapier sensors collect real dots once and score them', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0]; p.progress = 0; p.lane = 3; syncPose(p);
  s.tick(1 / 60); assert.equal(s.stats.dots, 1); assert.equal(s.score, 10);
  run(s, 0.2); assert.equal(s.stats.dots, 1); assert.equal(s.score, 10);
  assert.equal(s.eventsForTest.filter(e => e.name === 'dot').length, 1);
  s.world.free();
});
test('Rapier detects an actual rival collision and applies invulnerability', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0], e = s.enemies[0]; p.invuln = 0; e.lane = p.lane; e.progress = p.progress; syncPose(e);
  s.tick(1 / 60); assert.equal(s.lives, 3); assert.equal(s.stats.hits, 1); assert.ok(p.invuln > 3);
  run(s, 0.5); assert.equal(s.lives, 3);
  s.world.free();
});
test('depleting shared lives ends the run', () => {
  const s = forceRunning(start()); s.lives = 1; s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0], e = s.enemies[0]; p.invuln = 0; e.lane = p.lane; e.progress = p.progress; syncPose(e);
  s.tick(1 / 60); assert.equal(s.phase, 'lost'); assert.equal(s.lives, 0);
  const u = p.progress; run(s, 1); assert.equal(p.progress, u);
  assert.ok(s.eventsForTest.some(e => e.name === 'lose'));
  s.world.free();
});
test('a queued lane change persists until a crossing or boundary cancellation', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0]; p.progress = 0.125;
  s.requestLane(p, -1); s.tick(1 / 60); assert.equal(p.lane, 3); assert.equal(p.queued, -1);
  run(s, 31); assert.equal(p.queued, -1); assert.equal(p.lane, 3);
  s.requestLane(p, 1); assert.equal(p.queued, 0); assert.equal(p.lane, 3);
  p.progress = 0.25; s.requestLane(p, -1); s.tick(1 / 60);
  assert.equal(p.lane, 2); assert.equal(p.queued, 0); assert.ok(p.change); run(s, 0.3); assert.equal(p.change, null);
  s.world.free();
});
test('lane boundaries never allow out-of-range car positions', () => {
  const s = forceRunning(start()); s.config.speed = 0;
  const p = s.players[0]; p.progress = 0;
  s.requestLane(p, 1); s.tick(1 / 60); assert.equal(p.lane, 3);
  p.lane = 0; s.requestLane(p, -1); s.tick(1 / 60); assert.equal(p.lane, 0);
  assert.ok(Number.isFinite(carPoint(p).x));
  s.world.free();
});
test('boost consumes charge and gives one grace window per activation', () => {
  const s = forceRunning(start()); const p = s.players[0];
  run(s, 0.5, [{boost: true}]); assert.ok(p.charge < 100); assert.ok(s.stats.boosts === 1);
  const charge = p.charge; run(s, 0.3, [{}]); assert.ok(p.charge > charge);
  s.tick(1 / 60, [{boost: true}]); assert.equal(s.stats.boosts, 2); assert.ok(p.boostGrace > 0);
  s.world.free();
});
test('braking reduces displacement', () => {
  const a = forceRunning(start()), b = forceRunning(start());
  run(a, 0.5); run(b, 0.5, [{brake:true}]);
  assert.ok(a.players[0].progress > b.players[0].progress);
  a.world.free(); b.world.free();
});
test('holding an empty boost cannot continually renew collision immunity', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0], e = s.enemies[0]; p.invuln = 0; p.charge = 2;
  e.lane = p.lane; e.progress = p.progress; syncPose(e);
  run(s, 5, [{boost:true}]);
  assert.ok(s.stats.hits > 0, `no damage after 5s overlapping a rival with empty boost; ${s.stats.boosts} boost activations`);
  s.world.free();
});
test('low-charge boost taps cannot manufacture grace and twelve charge allows activation', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0; s.config.recharge = 0;
  const p = s.players[0]; p.charge = 2;
  for (let n = 0; n < 20; n++) {
    s.tick(1 / 60, [{boost:true}]);
    assert.equal(p.boosting, false); assert.equal(p.boostGrace, 0); assert.equal(s.stats.boosts, 0);
    s.tick(1 / 60, [{boost:false}]);
  }
  p.charge = 11.99; s.tick(1 / 60, [{boost:true}]); assert.equal(p.boosting, false);
  s.tick(1 / 60, [{boost:false}]); p.charge = 12; s.tick(1 / 60, [{boost:true}]);
  assert.equal(p.boosting, true); assert.equal(s.stats.boosts, 1); assert.ok(p.boostGrace > 0.45);
  s.world.free();
});
test('holding below activation charge cannot bypass the twelve-charge minimum', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0; s.config.recharge = 0;
  const p = s.players[0]; p.charge = 2;
  run(s, 0.1, [{boost:true}]);
  assert.equal(p.boosting, false); assert.equal(p.charge, 2); assert.equal(s.stats.boosts, 0);
  s.world.free();
});
test('shield pickup grants five seconds of collision protection', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0;
  const p = s.players[0]; p.lane = 0; p.progress = 0.25; p.invuln = 0; syncPose(p);
  s.tick(1 / 60); assert.equal(p.invuln, 5); assert.ok(s.eventsForTest.some(e => e.name === 'shield'));
  s.world.free();
});
test('invincible dev toggle prevents collision damage', () => {
  const s = forceRunning(start()); s.config.speed = 0; s.config.trafficSpeed = 0; s.config.invincible = true;
  const p = s.players[0], e = s.enemies[0]; p.invuln = 0; e.lane = p.lane; e.progress = p.progress; syncPose(e);
  run(s, 0.2); assert.equal(s.lives, 4); assert.equal(s.stats.hits, 0);
  s.world.free();
});
test('two players collect together while retaining individual boost charge', () => {
  const s = forceRunning(start(2)); s.config.speed = 0; s.config.trafficSpeed = 0;
  s.players[0].lane = 3; s.players[0].progress = 0;
  s.players[1].lane = 2; s.players[1].progress = 0;
  s.players.forEach(syncPose);
  run(s, 0.1, [{boost: true}, {}]); assert.equal(s.stats.dots, 2);
  assert.ok(s.players[0].charge < s.players[1].charge); assert.equal(s.players.length, 2);
  s.world.free();
});
test('clear transitions all three rounds and reaches a terminal win', () => {
  const s = start();
  for (let n = 1; n <= 3; n++) {
    assert.equal(s.round, n); assert.equal(s.enemies.length, n);
    s.collectAll(); assert.equal(s.phase, 'clear'); run(s, 3.3);
  }
  assert.equal(s.phase, 'won'); assert.equal(s.stats.dots, 288);
  assert.ok(s.eventsForTest.some(e => e.name === 'win'));
  s.world.free();
});
test('solo attract AI genuinely sweeps all lanes and completes three rounds', () => {
  const s = start(1, true);
  for (let i = 0; i < 600 * 60 && s.phase !== 'won'; i++) s.tick(1 / 60);
  assert.equal(s.phase, 'won', `attract stuck on round ${s.round}, ${s.dots.filter(d => !d.collected).length} dots after ${s.time.toFixed(1)}s`);
  assert.equal(s.stats.dots, 288); assert.equal(s.stats.hits, 0); assert.ok(s.stats.boosts > 0);
  s.world.free();
});
test('two-player attract AI finishes its shared three-round run', () => {
  const s = start(2, true);
  for (let i = 0; i < 600 * 60 && s.phase !== 'won'; i++) s.tick(1 / 60);
  assert.equal(s.phase, 'won', `co-op attract stuck on round ${s.round}, ${s.dots.filter(d => !d.collected).length} dots`);
  assert.equal(s.stats.dots, 288); assert.equal(s.lives, 4);
  s.world.free();
});
test('host snapshot survives JSON transport and applies to a new world', () => {
  const a = start(2, true); run(a, 8);
  const snapshot = JSON.parse(JSON.stringify(a.snapshot()));
  const b = new RiotSimulation(R); b.apply(snapshot);
  assert.equal(b.players.length, 2); assert.equal(b.phase, snapshot.phase);
  assert.equal(b.score, a.score); assert.deepEqual(b.snapshot().dots, a.snapshot().dots);
  assert.equal(b.players[0].progress, a.players[0].progress);
  a.world.free(); b.world.free();
});
test('a new run resets all scoring and terminal state', () => {
  const s = start(); s.score = 99999; s.phase = 'lost'; s.round = 3; s.stats.hits = 99;
  s.start(2); assert.equal(s.phase, 'countdown'); assert.equal(s.score, 0); assert.equal(s.round, 1);
  assert.equal(s.stats.hits, 0); assert.equal(s.players.length, 2); assert.equal(s.lives, 4);
  s.world.free();
});

for (const [name, fn] of tests) {
  try { await fn(); passed++; }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(`${passed + failed} simulation checks: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
