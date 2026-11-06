import assert from 'node:assert/strict';
import { CoastGame, DEFAULTS, EVENTS, groundHeight } from './model.js';

const DT = 1 / 60;
let passed = 0;
let failed = 0;
const failures = [];
const idle = () => ({ x: 0, y: 0, primary: false, pressed: false, trick: false, brake: false });
const game = new CoastGame();
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => { if (!String(args[0]).includes('deprecated parameters for the initialization function')) warnings.push(args.join(' ')); };
try { await game.init(); } finally { console.warn = originalWarn; }

function test(name, run) {
  try { run(); passed++; } catch (error) { failed++; failures.push(`FAIL ${name}: ${error.message}`); }
}
function start(event, opts = {}) {
  game.tune = { ...DEFAULTS };
  game.start(event, { tour: false, ...opts });
  game.begin();
  assert.equal(game.state.phase, 'play');
}
function checkFinite() {
  const s = game.state;
  for (const name of ['x', 'y', 'z', 'score', 'time', 'air', 'combo']) assert.ok(Number.isFinite(s[name]), `${name} became nonfinite`);
  for (const body of [game.body, game.bag, game.disc]) {
    if (!body) continue;
    for (const v of [body.translation(), body.linvel()]) for (const axis of ['x', 'y', 'z']) assert.ok(Number.isFinite(v[axis]), `physics ${axis} became nonfinite`);
  }
}
function playBot(event, observe = () => {}) {
  start(event);
  const before = { ...game.stats };
  let frames = 0;
  while (game.state.phase === 'play' && frames++ < 70 * 60) {
    game.step(game.botInput(), DT);
    checkFinite();
    observe(game.state);
  }
  assert.equal(game.state.phase, 'result', `${EVENTS[event].short} did not complete`);
  assert.ok(game.state.score >= EVENTS[event].medals[0], `${EVENTS[event].short} bot earned no medal`);
  assert.equal(game.state.results[0][event].score, Math.round(game.state.score));
  assert.equal(game.state.results[0][event].medal, game.medal());
  assert.deepEqual(game.tune, DEFAULTS, 'baseline run used tuning cheats');
  return Object.fromEntries(Object.keys(game.stats).map(key => [key, game.stats[key] - before[key]]));
}

test('six unique events have usable medal progression', () => {
  assert.equal(EVENTS.length, 6);
  assert.equal(new Set(EVENTS.map(e => e.short)).size, 6);
  for (const e of EVENTS) assert.ok(e.medals[0] > 0 && e.medals[1] > e.medals[0] && e.medals[2] > e.medals[1]);
  assert.equal(warnings.length, 0, warnings.join('; '));
});

test('half-pipe bot pumps, launches, tricks and lands through a complete event', () => {
  const stats = playBot(0);
  assert.ok(stats.jumps >= 3);
  assert.ok(stats.landings >= 3);
  assert.ok(game.state.tricks.length >= 1);
});

test('footbag bot kicks through a complete event while the athlete stays above court', () => {
  const stats = playBot(1, s => assert.ok(s.y >= -0.1 && s.y < 0.2, `athlete fell through court: ${s.y}`));
  assert.ok(stats.kicks >= 10);
  assert.ok(game.state.tricks.includes('Sole spin'));
});

test('surfing bot carves the pocket and lands aerials through a complete event', () => {
  let tubeFrames = 0;
  const stats = playBot(2, s => { if (s.inTube) tubeFrames++; });
  assert.ok(tubeFrames >= 120, 'never spent two seconds in the tube');
  assert.ok(stats.jumps >= 2);
  assert.ok(stats.landings >= 2);
  assert.ok(game.state.tricks.includes('Peachy cutback'));
});

test('roller skating bot jumps obstacles and collects coins through a complete event', () => {
  const stats = playBot(3);
  assert.ok(stats.jumps >= 5);
  assert.ok(stats.landings >= 5);
  assert.ok(stats.coins >= 5);
  assert.ok(game.state.x > 300);
});

test('BMX bot rides terrain, jumps and collects coins through a complete event', () => {
  const stats = playBot(4, s => assert.ok(s.y >= groundHeight(s.x) - 0.3, 'bike tunneled through terrain'));
  assert.ok(stats.jumps >= 5);
  assert.ok(stats.landings >= 5);
  assert.ok(stats.coins >= 5);
  assert.ok(game.state.x > 300);
});

test('flying disc bot charges and catches all three throws before the timer', () => {
  const phases = new Set();
  const attempts = new Set();
  const stats = playBot(5, s => { phases.add(s.discPhase); attempts.add(s.attempt); });
  assert.equal(stats.catches, 3);
  assert.deepEqual([...attempts], [1, 2, 3]);
  assert.ok(phases.has('charge') && phases.has('flight') && phases.has('rest'));
  assert.ok(game.state.time > 0);
});

test('low-rate distance scoring accumulates at both 30Hz and 60Hz', () => {
  start(3);
  for (let i = 0; i < 60; i++) game.add(7 / 60);
  assert.equal(game.state.score, 7);
  start(3);
  for (let i = 0; i < 30; i++) game.add(7 / 30);
  assert.equal(game.state.score, 7);
});

test('driving into a boardwalk hazard causes a physics collision and bail', () => {
  start(3);
  const before = game.stats.bails;
  for (let frames = 0; game.state.x < 16 && frames < 300; frames++) game.step(idle(), DT);
  assert.ok(game.stats.bails > before);
  assert.ok(game.obstacles[0].hit);
});

test('timing a hop clears the first boardwalk hazard', () => {
  start(3);
  const before = { ...game.stats };
  let jumped = false;
  for (let frames = 0; game.state.x < 16 && frames < 300; frames++) {
    const input = idle();
    if (!jumped && game.state.x > 8.7) { input.pressed = true; input.primary = true; jumped = true; }
    game.step(input, DT);
  }
  assert.ok(jumped);
  assert.equal(game.stats.jumps - before.jumps, 1);
  assert.equal(game.stats.bails - before.bails, 0);
  assert.equal(game.obstacles[0].hit, false);
});

test('holding a trick into touchdown causes an early bail', () => {
  start(3);
  const before = game.stats.bails;
  for (let frame = 0; frame < 74; frame++) game.step({ ...idle(), pressed: frame === 0, primary: frame === 0, trick: true }, DT);
  assert.ok(game.stats.bails > before, 'unsafe touchdown was rewarded');
  assert.equal(game.state.combo, 1);
});

test('new turns clear a previous athlete’s bail recovery', () => {
  start(0, { tour: true, players: 2 });
  game.bail();
  assert.ok(game.state.bailTime > 0);
  game.finish();
  game.next();
  assert.equal(game.state.player, 1);
  assert.equal(game.state.bailTime, 0);
  assert.equal(game.state.bails, 0);
});

test('a two-player tour completes all twelve turns and reaches the podium', () => {
  start(0, { tour: true, players: 2 });
  const turns = [];
  let frames = 0;
  while (game.state.phase !== 'podium' && frames < 60 * 70 * 12) {
    if (game.state.phase === 'brief') game.begin();
    if (game.state.phase === 'play') { game.step(game.botInput(), DT); frames++; if (!(frames % 30)) checkFinite(); }
    else if (game.state.phase === 'result') { turns.push(`${game.state.event}:${game.state.player}`); game.next(); }
    else if (game.state.phase !== 'podium') throw new Error(`unexpected tour phase ${game.state.phase}`);
  }
  assert.equal(game.state.phase, 'podium');
  assert.equal(turns.length, 12);
  assert.equal(new Set(turns).size, 12);
  for (const scores of game.state.results) {
    assert.equal(scores.length, 6);
    for (const result of scores) assert.ok(result.score > 0 && result.medal > 0);
  }
});

if (game.queue) game.queue.free();
if (game.world) game.world.free();
for (const failure of failures) console.error(failure);
console.log(`${passed} passed, ${failed} failed (${passed + failed} model tests)`);
if (failed) process.exitCode = 1;
