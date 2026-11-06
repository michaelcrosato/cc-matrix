import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';

// Import the exact browser source regardless of the project's package.json module type.
const source = await fs.readFile(new URL('./simulation.js', import.meta.url), 'utf8');
const { ChaseGame, CASES, DEFAULTS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const originalWarn = console.warn;
const startupWarnings = [];
console.warn = (...args) => startupWarnings.push(args.map(String).join(' '));
await RAPIER.init();
console.warn = originalWarn;
let total = 0, failures = 0;
const fixtures = [];
const DT = 1 / 120;
const near = (actual, expected, tolerance = .12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} must be within ${tolerance} of ${expected}`);
function fixture({ clean = true, coop = false, frozen = true } = {}) {
  const events = [];
  const game = new ChaseGame(RAPIER, { onEvent: (type, data) => events.push({ type, ...data }) });
  game.start({ coop });
  game.freezeCrook = frozen;
  if (clean) {
    for (const h of game.hazards) game.world.removeRigidBody(h.body);
    for (const b of game.pickups) game.world.removeRigidBody(b.body);
    game.hazards.length = 0;
    game.pickups.length = 0;
    game.crook.floor = 2; game.crook.y = 10; game.crook.x = 22;
  }
  fixtures.push(game);
  return { game, events };
}
function advance(game, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) {
    const inputs = typeof input === 'function' ? input(game) : Array.isArray(input) ? input : [input];
    game.update(DT, inputs);
  }
}
function test(name, run) {
  total++;
  try { run(); }
  catch (error) { failures++; console.log(`FAIL ${name}: ${error.message}`); }
  finally { while (fixtures.length) fixtures.pop().world?.free(); }
}

test('Rapier initializes and reports the exact requested version', () => {
  assert.equal(RAPIER.version(), '0.19.3');
  const unexpected = startupWarnings.filter(x => !x.includes('using deprecated parameters for the initialization function'));
  assert.deepEqual(unexpected, []);
});
test('new pursuit creates three solid floors, route, hazards and loot', () => {
  const { game } = fixture({ clean: false });
  assert.equal(game.mode, 'playing');
  assert.equal(game.caseIndex, 0);
  assert.equal(game.time, 105);
  assert.equal(game.players.length, 1);
  assert.equal(game.hazards.length, CASES[0].hazards);
  assert.equal(game.pickups.length, 9);
  assert.equal(game.crook.floor, 1);
  assert.equal(game.world.gravity.y, -DEFAULTS.gravity);
});
test('ordinary movement traverses at configured speed and respects both mall walls', () => {
  const { game } = fixture();
  advance(game, 2, { move: 1 });
  near(game.players[0].x, -21 + DEFAULTS.speed * 2, .25);
  advance(game, 10, { move: 1 });
  near(game.players[0].x, 24, .01);
  advance(game, 10, { move: -1 });
  near(game.players[0].x, -24, .01);
  assert.equal(game.mode, 'playing');
});
test('jump rises, falls and lands on its original floor without held-button retriggers', () => {
  const { game } = fixture();
  advance(game, .12);
  const baseline = game.players[0].y;
  let peak = baseline;
  advance(game, 1.2, () => { peak = Math.max(peak, game.players[0].y); return [{ jump: true }]; });
  assert.ok(peak - baseline > 1.4, `jump height ${peak - baseline}`);
  near(game.players[0].y, baseline, .07);
  assert.equal(game.players[0].floor, 0);
  assert.equal(game.metrics.jumps, 1);
  assert.equal(game.players[0].ground, true);
});
test('ducking changes the Rapier capsule and evades a low-flying toy plane', () => {
  const { game } = fixture();
  game.teleport(0, 0, 0);
  game.addHazard('plane', 0, 0, 0);
  advance(game, .2, { duck: true });
  assert.equal(game.metrics.hits, 0);
  assert.equal(game.players[0].duck, true);
  assert.equal(game.metrics.ducks, 1);
});
test('the same toy plane collides with a standing player', () => {
  const { game, events } = fixture();
  game.teleport(0, 0, 0);
  game.addHazard('plane', 0, 0, 0);
  advance(game, .1);
  assert.equal(game.metrics.hits, 1);
  assert.ok(events.some(x => x.type === 'hit' && x.kind === 'plane'));
});
test('a timed jump clears luggage without a collision penalty', () => {
  const { game } = fixture();
  game.teleport(0, 0, -2.3);
  game.addHazard('case', 0, 0, 0);
  advance(game, .7, { move: 1, jump: true });
  assert.equal(game.metrics.hits, 0);
  assert.ok(game.players[0].x > 1.5);
});
test('a hazard subtracts time once during invulnerability and can hit again afterward', () => {
  const { game } = fixture();
  game.teleport(0, 0, 0);
  game.addHazard('cart', 0, 0, 0);
  advance(game, .1);
  assert.equal(game.metrics.hits, 1);
  near(game.time, 105 - DEFAULTS.penalty - .1, .015);
  advance(game, 1.75);
  game.teleport(0, 0, 0);
  advance(game, .05);
  assert.equal(game.metrics.hits, 2);
});
test('loot is collected by physical overlap exactly once and grants score and time', () => {
  const { game, events } = fixture();
  game.teleport(0, 0, 0);
  game.addPickup(0, 0);
  advance(game, .1);
  assert.equal(game.loot, 1);
  assert.equal(game.totalLoot, 1);
  assert.equal(game.score, 100);
  near(game.time, 107 - .1, .015);
  advance(game, .1);
  assert.equal(game.metrics.pickups, 1);
  assert.equal(events.filter(x => x.type === 'pickup').length, 1);
});
test('the lift transports a real physics body up and back down', () => {
  const { game } = fixture();
  game.teleport(0, 0, 0);
  game.update(DT, [{ interact: true }]);
  assert.equal(game.players[0].transition?.kind, 'elevator');
  advance(game, 1.8);
  assert.equal(game.players[0].floor, 1);
  near(game.players[0].y, 5, .1);
  game.update(DT, [{ interact: true, downUse: true }]);
  advance(game, 1.8);
  assert.equal(game.players[0].floor, 0);
  near(game.players[0].y, 0, .1);
  assert.equal(game.metrics.rides, 2);
});
test('escalator rides follow their endpoints in both directions', () => {
  const { game } = fixture();
  game.teleport(0, 0, -20);
  assert.equal(game.context(game.players[0])?.kind, 'escalator');
  game.update(DT, [{ interact: true }]);
  advance(game, 1.5);
  assert.equal(game.players[0].floor, 1);
  near(game.players[0].x, -14, .15);
  game.update(DT, [{ interact: true, downUse: true }]);
  advance(game, 1.5);
  assert.equal(game.players[0].floor, 0);
  near(game.players[0].x, -20, .15);
});
test('sprint bursts accelerate movement and obey their cooldown', () => {
  const { game } = fixture();
  game.update(DT, [{ move: 1, dash: true }]);
  advance(game, .5, { move: 1 });
  assert.ok(game.players[0].x > -16.2);
  assert.equal(game.metrics.bursts, 1);
  game.update(DT, [{ move: 1, dash: true }]);
  assert.equal(game.metrics.bursts, 1);
  advance(game, 4);
  game.update(DT, [{ dash: true }]);
  assert.equal(game.metrics.bursts, 2);
});
test('pause freezes the timer and simulation, then resume continues', () => {
  const { game } = fixture();
  advance(game, .1, { move: 1 });
  game.pause();
  const old = game.snapshot();
  advance(game, 2, { move: 1 });
  assert.equal(game.time, old.time);
  assert.equal(game.players[0].x, old.players[0].x);
  assert.equal(game.metrics.steps, old.metrics.steps);
  game.resume();
  advance(game, .1, { move: 1 });
  assert.ok(game.time < old.time);
  assert.ok(game.players[0].x > old.players[0].x);
});
test('contact captures the crook once, awards a case bonus and advances all three cases', () => {
  const { game } = fixture();
  for (let index = 0; index < 3; index++) {
    assert.equal(game.caseIndex, index);
    game.freezeCrook = true;
    game.teleport(0, game.crook.floor, game.crook.x);
    game.update(DT, [{}]);
    assert.equal(game.mode, 'caseclear');
    assert.equal(game.metrics.catches, index + 1);
    const score = game.score;
    game.catchCrook();
    assert.equal(game.score, score);
    game.nextCase();
  }
  assert.equal(game.mode, 'won');
  assert.ok(game.score > 4500);
});
test('countdown expiration cleanly ends the pursuit', () => {
  const { game, events } = fixture();
  game.time = .005;
  game.update(DT, [{}]);
  assert.equal(game.mode, 'lost');
  assert.equal(game.time, 0);
  assert.ok(events.some(x => x.type === 'lose' && x.reason === 'time'));
});
test('a burglar left unchallenged on the roof eventually escapes', () => {
  const { game, events } = fixture({ frozen: false });
  game.crook.floor = 2; game.crook.y = 10; game.crook.routeTimer = 40; game.crook.escape = 17.999;
  game.update(DT, [{}]);
  assert.equal(game.mode, 'lost');
  assert.ok(events.some(x => x.type === 'lose' && x.reason === 'escape'));
});
test('two local players have independent movement and share their recovered loot', () => {
  const { game } = fixture({ coop: true });
  assert.equal(game.players.length, 2);
  advance(game, .3, [{ move: 1 }, { move: -1 }]);
  assert.ok(game.players[0].x > -20);
  assert.ok(game.players[1].x < -20);
  game.teleport(1, 0, 4);
  game.addPickup(0, 4);
  advance(game, .1, [{}, {}]);
  assert.equal(game.totalLoot, 1);
  assert.equal(game.score, 100);
  game.teleport(1, game.crook.floor, game.crook.x);
  game.update(DT, [{}, {}]);
  assert.equal(game.mode, 'caseclear');
});
test('live balance settings apply and reset to the documented defaults', () => {
  const { game } = fixture();
  game.config.gravity = 12;
  game.config.speed = 9;
  game.update(DT, [{ move: 1 }]);
  assert.equal(game.world.gravity.y, -12);
  assert.ok(game.players[0].body.linvel().x > 8.9);
  game.resetConfig();
  assert.deepEqual(game.config, { ...DEFAULTS });
  assert.equal(game.world.gravity.y, -DEFAULTS.gravity);
});
test('a complete normal three-case AI playthrough uses movement and transport to win', () => {
  const { game } = fixture({ clean: false, frozen: false });
  for (let i = 0; i < 120 * 200 && game.mode !== 'won' && game.mode !== 'lost'; i++) {
    if (game.mode === 'caseclear') game.nextCase();
    else game.update(DT, game.players.map(p => game.aiInput(p)));
  }
  assert.equal(game.mode, 'won', `playthrough ended: ${JSON.stringify(game.snapshot())}`);
  assert.equal(game.metrics.catches, 3);
  assert.ok(game.metrics.rides >= 2);
  assert.ok(game.metrics.bursts >= 1);
  assert.ok(game.metrics.jumps >= 1 || game.metrics.ducks >= 1);
});

test('new shifts reset attract and previous-shift statistics', () => {
  const { game } = fixture();
  game.metrics.catches = 9;
  game.metrics.hits = 12;
  game.metrics.jumps = 25;
  game.start({attract: false});
  assert.equal(game.metrics.catches, 0);
  assert.equal(game.metrics.hits, 0);
  assert.equal(game.metrics.jumps, 0);
  assert.equal(game.score, 0);
  assert.equal(game.caseIndex, 0);
});
test('departed partners remain inactive across case loads and cannot lose time', () => {
  const { game } = fixture({coop:true});
  game.deactivatePlayer(1);
  assert.equal(game.players[1].active, false);
  assert.equal(game.players[1].body.isEnabled(), false);
  const before=game.metrics.hits;
  advance(game, .5, [{}, {move:1,jump:true}]);
  assert.equal(game.metrics.hits,before);
  game.loadCase(1);
  assert.equal(game.players[1].active, false);
  assert.equal(game.players[1].body.isEnabled(), false);
});
console.log(`${total} simulation checks, ${failures} failures`);
if (failures) process.exitCode = 1;
