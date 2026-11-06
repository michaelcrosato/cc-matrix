import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { JungleGame, DEFAULTS, CHAPTERS } from '../game.js';

// The compat package's generated WASM loader emits this known warning itself.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (!String(args[0]).startsWith('using deprecated parameters for the initialization function')) originalWarn(...args);
};
await RAPIER.init();
console.warn = originalWarn;

let cases = 0, failures = 0;
const DT = 1 / 60;
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual}, expected ${expected} ± ${tolerance}`);
function test(name, run) {
  cases++;
  let game;
  const events = [];
  try {
    game = new JungleGame(RAPIER, (type, data) => events.push({ type, ...data }));
    run(game, events);
  } catch (error) {
    failures++;
    console.error(`FAIL simulation ${name}: ${error.message}`);
  } finally {
    if (game?.world) game.world.free();
  }
}
function ticks(game, count, input = {}) {
  for (let i = 0; i < count; i++) game.step(DT, { 1: typeof input === 'function' ? input(i) : input });
}
function clearHazards(game) {
  for (const enemy of game.enemies) if (enemy.body) game.world.removeRigidBody(enemy.body);
  game.enemies = [];
  game.boulders = [];
  game.lastSpawn = Infinity;
}
function ground(game, stage = 3) {
  game.setup(stage);
  clearHazards(game);
  ticks(game, 45);
  return game.players[0];
}
function finiteState(game) {
  for (const p of game.players) for (const key of ['x', 'y', 'vx', 'vy', 'oxygen', 'health', 'theta', 'omega']) assert.ok(Number.isFinite(p[key]), `non-finite player ${key}`);
}

test('real Rapier capsule settles on rescue floor', game => {
  const p = ground(game);
  assert.ok(p.onGround);
  near(p.y, 1, 0.06, 'feet');
  near(p.body.translation().y, p.y + 0.9, 0.001, 'capsule centre');
});

test('sloped floor matches design height', game => {
  const p = ground(game, 2);
  near(p.y, game.floor(p.x), 0.06, 'slope contact');
  ticks(game, 120, { x: 1 });
  assert.ok(p.x > 16);
  near(p.y, game.floor(p.x), 0.09, 'moving slope contact');
});

test('keyboard-style directional intent accelerates and stops', game => {
  const p = ground(game);
  const start = p.x;
  ticks(game, 60, { x: 1 });
  assert.ok(p.x > start + 6, 'right movement did not advance');
  ticks(game, 50, {});
  assert.ok(Math.abs(p.vx) < 0.01, `release did not brake: ${p.vx}`);
});

test('jump has an arc and returns to Rapier ground', game => {
  const p = ground(game);
  const startY = p.y;
  game.step(DT, { 1: { jump: true } });
  let apex = p.y;
  for (let i = 0; i < 120; i++) { game.step(DT, {}); apex = Math.max(apex, p.y); }
  assert.ok(apex > startY + 2.3, `jump too low: ${apex - startY}`);
  assert.ok(p.onGround);
  near(p.y, startY, 0.06, 'landing');
  assert.equal(game.statistics.jumps, 1);
});

test('duck changes traversal speed and records a duck once', game => {
  const p = ground(game);
  ticks(game, 60, { x: 1, duck: true });
  near(p.vx, DEFAULTS.moveSpeed * 0.4, 0.02, 'duck speed');
  assert.equal(game.statistics.ducks, 1);
  assert.ok(p.duck);
});

test('vine auto-catch and release preserve momentum', (game, events) => {
  ticks(game, 12, { x: 1 });
  const p = game.players[0];
  assert.ok(p.swinging >= 0, 'nearby vine was not caught');
  ticks(game, 20, { x: 1 });
  game.step(DT, { 1: { x: 1, jump: true } });
  assert.equal(p.swinging, -1);
  assert.ok(p.vy >= 2.3, 'release did not launch upwards');
  assert.ok(events.some(event => event.type === 'grab'));
  assert.ok(events.some(event => event.type === 'release'));
  finiteState(game);
});

test('missed vine causes damage and a recoverable checkpoint', game => {
  const p = game.players[0];
  p.lastVine = 2;
  game.teleport(p, 33, -6);
  game.step(DT, {});
  assert.equal(p.health, 2);
  assert.equal(p.swinging, 2);
  assert.ok(p.y > -5, 'checkpoint did not recover the player');
  assert.ok(!game.pending);
});

test('physical canopy route clears without the attract teleport', game => {
  let frames = 0;
  while (!game.pending && frames++ < 60 * 50) {
    const p = game.players[0];
    game.step(DT, { 1: { x: 1, jump: p.swinging >= 0 ? p.theta > 0.44 && p.omega > 0.12 : p.onGround } });
  }
  assert.ok(game.players[0].finished, 'scripted vine route did not clear');
  assert.ok(game.statistics.grabs >= 4);
  assert.ok(game.statistics.jumps >= 4);
  assert.equal(game.auto, false);
});

test('river movement uses two axes and clamps water bounds', game => {
  game.setup(1);
  clearHazards(game);
  const p = game.players[0];
  ticks(game, 60, { x: 1, y: -1 });
  assert.ok(p.x > 9 && p.y < 2, `swimming did not move both axes: ${p.x}, ${p.y}`);
  ticks(game, 240, { y: -1 });
  assert.ok(p.y >= 0.099 && p.y <= 0.3);
  ticks(game, 240, { y: 1 });
  near(p.y, 6.1, 0.001, 'surface cap');
});

test('oxygen drains underwater and replenishes at surface', game => {
  game.setup(1);
  clearHazards(game);
  const p = game.players[0];
  game.teleport(p, 4, 2);
  ticks(game, 180);
  near(p.oxygen, DEFAULTS.oxygen - 3, 0.04, 'underwater oxygen');
  game.teleport(p, 4, 6);
  ticks(game, 90);
  near(p.oxygen, DEFAULTS.oxygen, 0.001, 'surface recovery');
});

test('air pickup refills oxygen', game => {
  game.setup(1);
  clearHazards(game);
  const p = game.players[0], air = game.pickups.find(pickup => pickup.type === 'air');
  p.oxygen = 2;
  game.teleport(p, air.x, air.y - 1);
  game.step(DT, {});
  assert.ok(air.taken);
  near(p.oxygen, DEFAULTS.oxygen, 0.001, 'air bubble');
});

test('running out of air hurts and rescues the swimmer to the surface', game => {
  game.setup(1);
  clearHazards(game);
  const p = game.players[0];
  game.teleport(p, 4, 2);
  p.oxygen = 0.001;
  game.step(DT, {});
  assert.equal(p.health, 2);
  near(p.y, 6, 0.01, 'drowning recovery surface');
  assert.ok(p.oxygen >= 5);
});

test('knife stuns a crocodile and prevents the nip', game => {
  game.setup(1);
  const p = game.players[0];
  game.teleport(p, 4, 2);
  const enemy = game.enemies[0];
  game.enemies = [enemy];
  enemy.baseX = 5;
  enemy.baseY = 2.9;
  enemy.phase = 0;
  game.step(DT, { 1: { action: true } });
  assert.ok(enemy.stun > 3.9);
  assert.equal(p.health, 3);
  assert.equal(game.statistics.stuns, 1);
});

test('crocodile contact hurts once during invulnerability', game => {
  game.setup(1);
  const p = game.players[0];
  game.teleport(p, 4, 2);
  const enemy = game.enemies[0];
  game.enemies = [enemy];
  enemy.baseX = 4;
  enemy.baseY = 2.9;
  enemy.phase = 0;
  ticks(game, 30);
  assert.equal(p.health, 2);
  assert.ok(p.hit > 0);
});

test('low boulder hits a standing runner', game => {
  const p = ground(game, 2);
  game.spawnBoulder(p.x, 0);
  game.step(DT, {});
  assert.equal(p.health, 2);
});

test('a real jump clears a low boulder', game => {
  const p = ground(game, 2);
  game.step(DT, { 1: { jump: true } });
  ticks(game, 25);
  assert.ok(p.y > game.floor(p.x) + 2.4);
  game.spawnBoulder(p.x + 0.1, 0);
  game.step(DT, {});
  assert.equal(p.health, 3);
});

test('high boulder hits a standing runner', game => {
  const p = ground(game, 2);
  game.spawnBoulder(p.x, 1);
  game.step(DT, {});
  assert.equal(p.health, 2, 'high boulders must require ducking');
});

test('duck safely clears a high boulder', game => {
  const p = ground(game, 2);
  game.spawnBoulder(p.x, 1);
  game.step(DT, { 1: { duck: true } });
  assert.equal(p.health, 3);
  assert.ok(p.duck);
});

test('bell requires action and can only ring once', game => {
  game.setup(3);
  clearHazards(game);
  const p = game.players[0], bell = game.pickups.find(pickup => pickup.type === 'bell');
  game.teleport(p, bell.x, 1);
  game.step(DT, {});
  assert.equal(game.bells, 0);
  ticks(game, 20, { action: true });
  assert.equal(game.bells, 1);
  assert.equal(game.statistics.bells, 1);
});

test('final exit requires all three Sunbells', game => {
  game.setup(3);
  clearHazards(game);
  const p = game.players[0];
  game.teleport(p, CHAPTERS[3].length, 1);
  game.step(DT, {});
  assert.ok(!game.pending && !p.finished, 'exit opened before the bells');
  for (const bell of game.pickups.filter(pickup => pickup.type === 'bell')) {
    game.teleport(p, bell.x, 1);
    game.step(DT, { 1: { action: true } });
  }
  assert.equal(game.bells, 3);
  game.teleport(p, CHAPTERS[3].length, 1);
  game.step(DT, {});
  assert.ok(game.pending && p.finished);
  game.next();
  assert.ok(game.won);
});

test('cooperative players have independent movement', game => {
  game.setup(1);
  clearHazards(game);
  game.setCoop(true);
  for (let i = 0; i < 60; i++) game.step(DT, { 1: { x: 1 }, 2: { x: -1 } });
  assert.ok(game.players[0].x > 9);
  assert.ok(game.players[1].x < 0);
  assert.equal(game.players.length, 2);
});

test('cooperative river catch-up keeps both scouts in view', (game, events) => {
  game.setup(1);
  clearHazards(game);
  game.setCoop(true);
  const [lead, lag] = game.players;
  game.teleport(lead, 60, 6);
  game.teleport(lag, 4, 6);
  game.step(DT, {});
  assert.ok(Math.abs(lead.x - lag.x) <= 25, 'catch-up left scouts offscreen');
  assert.ok(lag.x >= 55 && lag.y >= 5.3, 'river catch-up did not surface behind leader');
  assert.ok(events.some(event => event.type === 'revive' && event.id === lag.id));
  finiteState(game);
});

test('cooperative canopy catch-up attaches to a valid checkpoint vine', game => {
  game.setCoop(true);
  const [lead, lag] = game.players;
  lead.lastVine = 4;
  game.teleport(lead, 50, 3.5);
  game.teleport(lag, 4, 3);
  game.step(DT, {});
  assert.equal(lag.lastVine, 4);
  assert.equal(lag.swinging, 4);
  assert.ok(game.vines[lag.swinging], 'catch-up attached to a missing vine');
  assert.ok(Math.abs(lead.x - lag.x) <= 25);
  game.step(DT, {});
  assert.ok(lag.y > -1, 'catch-up dropped the lagging scout');
  finiteState(game);
});

test('cooperative lethal hit revives beside the partner', game => {
  game.setup(3);
  clearHazards(game);
  game.setCoop(true);
  const p = game.players[0], partner = game.players[1];
  p.health = 1;
  game.teleport(partner, 20, 1);
  game.damage(p, 'test');
  assert.equal(p.health, 3);
  near(p.x, 18, 0.01, 'co-op revive');
  assert.ok(!game.pending);
});

test('simultaneous co-op chapter goals emit one clear', (game, events) => {
  game.setup(1);
  clearHazards(game);
  game.setCoop(true);
  for (const p of game.players) game.teleport(p, 86.7, 6);
  game.step(DT, {});
  assert.equal(events.filter(event => event.type === 'stageClear').length, 1);
  assert.equal(game.statistics.stages, 1);
});

test('snapshot round-trip preserves gameplay state', game => {
  game.setup(1);
  game.setCoop(true);
  ticks(game, 60, { x: 1, y: -1 });
  const snapshot = JSON.parse(JSON.stringify(game.snapshot()));
  const other = new JungleGame(RAPIER);
  try {
    other.applySnapshot(snapshot);
    assert.equal(other.stage, snapshot.stage);
    assert.equal(other.players.length, 2);
    near(other.players[0].x, snapshot.players[0].x, 0.0001, 'network player x');
    near(other.players[0].body.translation().y, snapshot.players[0].y + 0.9, 0.0001, 'network capsule');
    assert.equal(other.score, snapshot.score);
  } finally { other.world.free(); }
});

test('live balance settings affect the next movement', game => {
  const p = ground(game);
  game.tuning.moveSpeed = DEFAULTS.moveSpeed * 1.5;
  ticks(game, 60, { x: 1 });
  near(p.vx, DEFAULTS.moveSpeed * 1.5, 0.02, 'live speed tuning');
});

test('full attract route shows all chapters and every action family', (game, events) => {
  game.auto = true;
  let frames = 0;
  const cleared = [];
  while (!game.won && frames++ < 60 * 160) {
    game.step(DT, {});
    finiteState(game);
    if (game.pending) {
      assert.ok(game.players[0].finished, 'attract route lost instead of clearing');
      cleared.push(game.stage);
      // Advance after the step completes, exactly as the transition UI does.
      game.next();
    }
  }
  assert.ok(game.won, 'attract route did not finish in 160 seconds');
  assert.deepEqual(cleared, [0, 1, 2, 3]);
  assert.equal(game.statistics.stages, 4);
  assert.equal(game.statistics.bells, 3);
  for (const key of ['jumps', 'grabs', 'stuns', 'ducks']) assert.ok(game.statistics[key] > 0, `attract never demonstrated ${key}`);
  assert.ok(game.fruit > 0 && game.score > 5000);
  assert.ok(events.some(event => event.type === 'win'));
});

test('attract loop can restart with a clean score', game => {
  game.auto = true;
  game.score = 8888;
  game.fruit = 12;
  game.statistics.stages = 4;
  game.won = true;
  game.restart();
  assert.equal(game.stage, 0);
  assert.equal(game.score, 0);
  assert.equal(game.fruit, 0);
  assert.equal(game.statistics.stages, 0);
  assert.ok(!game.pending && !game.won);
});

console.log(`Simulation: ${cases} checks, ${failures} failures.`);
if (failures) process.exitCode = 1;
