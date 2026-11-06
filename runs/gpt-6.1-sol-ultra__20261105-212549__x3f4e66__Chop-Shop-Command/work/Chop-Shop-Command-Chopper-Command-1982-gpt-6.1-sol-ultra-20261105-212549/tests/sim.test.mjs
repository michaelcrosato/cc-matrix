import assert from 'node:assert/strict';
import { Game, initPhysics, defaults, wrap, delta } from '../sim.js';

let checks = 0;
let failures = 0;
const DT = 1 / 60;
const worlds = new Set();
let physicsVersion;
// Rapier 0.19.3 emits a known package-internal init deprecation warning.
const warn = console.warn;
console.warn = (...args) => {
  if (!String(args[0]).includes('deprecated parameters for the initialization function')) warn(...args);
};
try { physicsVersion = await initPhysics(); } finally { console.warn = warn; }
function fixture(count = 1, attract = false) {
  const events = [];
  const game = new Game((type, detail) => events.push({ name: type, ...detail }));
  events.length = 0;
  game.reset(count, attract);
  game.spawnTimer = 9999;
  worlds.add(game);
  return { game, events };
}
function advance(game, seconds, inputs = []) {
  const frames = Math.ceil(seconds / DT);
  for (let i = 0; i < frames && game.mode === 'play'; i++) game.step(DT, inputs);
}
function missile(game, x, y, vx = 0, vy = -18) {
  const b = game.entity('bullet', {
    x, y, vx, vy, kind: 'missile', owner: 'enemy', ttl: 10, split: false,
  }, .38, .38);
  game.bullets.push(b);
  return b;
}
async function check(name, fn) {
  checks++;
  try { await fn(); } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    for (const game of worlds) { game.world.free(); game.queue.free(); }
    worlds.clear();
  }
}
await check('requested native Rapier physics version loads', () => {
  assert.equal(physicsVersion, '0.19.3');
});
await check('battlefield wraps continuously during flight', () => {
  assert.equal(wrap(111), -109);
  assert.equal(delta(-109, 109), 2);
  const { game } = fixture();
  const p = game.players[0];
  game.position(p, 109, 22);
  advance(game, 2, [{ x: 1 }]);
  assert.ok(p.x < -50 && p.x >= -110, `wrapped x=${p.x}`);
  assert.ok(p.alive);
});
await check('flight obeys upper and lower limits', () => {
  const { game } = fixture();
  const p = game.players[0];
  advance(game, 3, [{ y: 1 }]);
  assert.ok(p.y <= 39 && p.y >= 38.9);
  advance(game, 5, [{ y: -1 }]);
  assert.ok(p.y >= 5 && p.y <= 5.1);
});
for (const [type, points] of [['heli', 100], ['jet', 200]]) {
  await check(`real laser collisions destroy a ${type} and award its score`, () => {
    const { game } = fixture();
    const p = game.players[0];
    const e = game.spawnEnemy(type);
    game.position(e, 16, p.y);
    e.fire = 9999;
    game.cfg.enemySpeed = 0;
    advance(game, 1, [{ fire: true, aimX: 1, aimY: 0, manualAim: true }]);
    assert.ok(e.dead, `${type} hull=${e.hp}`);
    assert.equal(game.kills, 1);
    assert.equal(game.score, points);
    assert.ok(game.hits >= e.maxHp && game.shots >= e.maxHp);
  });
}
await check('enemy missiles split into two persistent warheads', () => {
  const { game, events } = fixture();
  const e = game.spawnEnemy('heli');
  game.position(e, 60, 35);
  game.enemyShot(e);
  const original = game.bullets[0];
  game.destroy(e);
  advance(game, .8);
  assert.ok(original.dead);
  const children = game.bullets.filter(b => b.kind === 'split');
  assert.equal(children.length, 2);
  assert.ok(children.every(b => b.owner === 'enemy' && !b.dead));
  assert.notEqual(children[0].vy, children[1].vy);
  assert.equal(events.filter(e => e.name === 'split').length, 1);
});
await check('lasers cannot shoot down enemy missiles', () => {
  const { game } = fixture();
  const b = missile(game, 12, 22, 0, 0);
  advance(game, .3, [{ fire: true, aimX: 1, aimY: 0, manualAim: true }]);
  assert.ok(!b.dead && game.bullets.includes(b));
  assert.equal(game.hits, 0);
});
await check('a descending missile damages a moving convoy truck', () => {
  const { game } = fixture();
  const t = game.trucks[0];
  missile(game, t.x, 7);
  advance(game, .5);
  assert.equal(t.hp, 1);
  assert.equal(game.lost, 0);
});
await check('shield pulse clears nearby missiles and protects the convoy temporarily', () => {
  const { game } = fixture();
  const p = game.players[0];
  const near = missile(game, 5, 22, 0, 0);
  const far = missile(game, 80, 22, 0, 0);
  assert.equal(game.activatePulse(p), true);
  assert.ok(near.dead && !far.dead);
  assert.equal(game.activatePulse(p), false);
  const t = game.trucks[0];
  missile(game, t.x, 7);
  advance(game, .5);
  assert.equal(t.hp, 2);
  advance(game, 4);
  missile(game, t.x, 7);
  advance(game, .5);
  assert.equal(t.hp, 1);
  assert.equal(game.convoyShield, 0);
});
await check('a lethal hit spends one reserve, then no reserves ends the run', () => {
  const { game } = fixture();
  const p = game.players[0];
  p.hp = 1; p.invuln = 0;
  missile(game, p.x, p.y + 4);
  advance(game, .4);
  assert.equal(game.reserves, 2);
  assert.equal(p.hp, 3);
  assert.equal(p.alive, true);
  assert.ok(p.invuln > 0);
  game.reserves = 0; p.hp = 1; p.invuln = 0;
  missile(game, p.x, p.y + 4);
  advance(game, .4);
  assert.equal(game.result?.won, false);
  assert.equal(p.alive, false);
});
await check('loss of the final convoy truck ends the run', () => {
  const { game } = fixture();
  for (const t of game.trucks) game.damage(t, 2);
  assert.equal(game.lost, 12);
  assert.equal(game.result?.trucks, 0);
  assert.equal(game.result?.won, false);
  assert.equal(game.mode, 'result');
});
await check('two co-op pilots accept independent controls and share the battlefield', () => {
  const { game } = fixture(2);
  advance(game, 1, [{ x: -1, fire: true }, { x: 1, fire: true }]);
  const [p1, p2] = game.players;
  assert.ok(p1.x < -10 && p2.x > 15);
  assert.ok(p1.alive && p2.alive && p1.hp === 3 && p2.hp === 3);
  assert.ok(game.shots >= 12);
  assert.equal(game.reserves, 3);
  assert.equal(game.trucks.filter(t => !t.dead).length, 12);
});
await check('enemy fire and helicopter pursuit target the surviving co-op pilot', () => {
  const { game } = fixture(2);
  const [fallen, survivor] = game.players;
  game.position(fallen, -8, 25);
  game.position(survivor, 45, 15);
  game.reserves = 0;
  fallen.invuln = 0;
  game.damage(fallen, 3);
  assert.equal(fallen.alive, false);
  assert.equal(game.mode, 'play');
  const enemy = game.spawnEnemy('heli');
  game.position(enemy, 0, 25);
  enemy.dir = -1;
  enemy.fire = 9999;
  game.time = 3; // Enemy fire is aimed at pilots during this part of its cycle.
  game.enemyShot(enemy);
  const shot = game.bullets.at(-1);
  assert.ok(shot && shot.vx > 0 && shot.vy < 0, 'missile is not aimed toward the living pilot');
  const dx = delta(survivor.x, enemy.x), dy = survivor.y - enemy.y;
  assert.ok(Math.abs(dx * shot.vy - dy * shot.vx) < 1e-6, 'missile direction misses the living pilot');
  game.step(DT);
  assert.equal(enemy.dir, 1, 'helicopter pursues the dead pilot');
  assert.ok(survivor.alive);
});
await check('co-op camera keeps pilots together when boosting apart, including across the world seam', () => {
  for (const seam of [false, true]) {
    const { game } = fixture(2);
    const [left, right] = game.players;
    if (seam) {
      game.position(left, 105, 22);
      game.position(right, -105, 17);
      game.cameraX = 108;
    }
    for (let frame = 0; frame < 8 * 60; frame++) {
      game.step(DT, [{ x: -1, boost: true }, { x: 1, boost: true }]);
      assert.ok(Math.abs(delta(left.x, right.x)) <= 78 + 1e-6, `pilots separated by ${Math.abs(delta(left.x, right.x))}`);
    }
    assert.ok(Math.abs(delta(left.x, game.cameraX)) <= 39.1, 'left pilot left the shared view');
    assert.ok(Math.abs(delta(right.x, game.cameraX)) <= 39.1, 'right pilot left the shared view');
    assert.ok(left.alive && right.alive);
  }
});
await check('collecting a repair restores pilot and convoy hull through a real contact', () => {
  const { game } = fixture();
  const p = game.players[0];
  p.hp = 2; game.trucks[0].hp = 1;
  const pickup = game.entity('pickup', {
    x: p.x + 2, y: p.y, type: 'repair', age: 0, ttl: 20,
  }, 1.3, 1.3);
  game.pickups.push(pickup);
  advance(game, .1);
  assert.ok(pickup.dead);
  assert.equal(p.hp, 3);
  assert.equal(game.trucks[0].hp, 2);
  assert.equal(game.score, 50);
});
await check('balance variables apply immediately', () => {
  const { game } = fixture();
  assert.equal(game.cfg.fireRate, defaults.fireRate);
  game.cfg.damage = 2;
  const t = game.trucks[0];
  missile(game, t.x, 7);
  advance(game, .5);
  assert.ok(t.dead);
  assert.equal(game.lost, 1);
  game.cfg.speed = 40;
  advance(game, 1, [{ x: 1 }]);
  assert.ok(game.players[0].vx > 39);
});
await check('score milestones award a reserve and respect the six-reserve cap', () => {
  const { game } = fixture();
  game.score = 9900;
  const enemy = game.spawnEnemy('heli');
  game.position(enemy, 16, 22);
  enemy.hp = 1; enemy.fire = 9999;
  game.cfg.enemySpeed = 0;
  advance(game, .5, [{ fire: true, aimX: 1, aimY: 0, manualAim: true }]);
  assert.equal(game.score, 10000);
  assert.equal(game.reserves, 4);
  game.score = 19900; game.reserves = 6;
  const next = game.spawnEnemy('heli');
  game.position(next, 16, 22);
  next.hp = 1; next.fire = 9999;
  advance(game, .5, [{ fire: true, aimX: 1, aimY: 0, manualAim: true }]);
  assert.equal(game.reserves, 6);
});
await check('convoy bonuses also award reserves when crossing a score milestone', () => {
  const { game } = fixture();
  game.score = 9900;
  game.spawned = 12;
  game.step(DT);
  assert.equal(game.score, 11100);
  assert.equal(game.reserves, 4);
});
await check('AI completes all three waves and the command airship with real laser physics', () => {
  const { game, events } = fixture(1, true);
  game.spawnTimer = 1;
  game.cfg.damage = 1;
  game.dev.god = true;
  game.dev.convoySafe = true;
  const start = performance.now();
  advance(game, 180);
  assert.equal(game.result?.won, true, `time=${game.time.toFixed(1)}, wave=${game.wave}, kills=${game.kills}, enemies=${JSON.stringify(game.enemies.map(e => ({type:e.type,hp:e.hp,x:e.x,y:e.y})))}`);
  assert.equal(game.wave, 3);
  assert.equal(game.kills, 37);
  assert.equal(game.result.trucks, 12);
  assert.ok(game.hits >= 37 && game.shots >= game.hits);
  assert.ok(game.score >= 15000);
  assert.equal(events.filter(e => e.name === 'wave').length, 3);
  assert.equal(events.filter(e => e.name === 'clear').length, 2);
  assert.equal(events.filter(e => e.name === 'boss').length, 1);
  assert.equal(events.filter(e => e.name === 'victory').length, 1);
  assert.ok(events.some(e => e.name === 'split'));
  assert.ok(events.some(e => e.name === 'pulse'));
  assert.ok(events.some(e => e.name === 'pickup'), 'AI demonstration must collect supplies');
  assert.ok(performance.now() - start < 30000, 'scripted campaign took over 30 real seconds');
});
console.log(`${checks} simulation checks, ${failures} failures`);
if (failures) process.exitCode = 1;
