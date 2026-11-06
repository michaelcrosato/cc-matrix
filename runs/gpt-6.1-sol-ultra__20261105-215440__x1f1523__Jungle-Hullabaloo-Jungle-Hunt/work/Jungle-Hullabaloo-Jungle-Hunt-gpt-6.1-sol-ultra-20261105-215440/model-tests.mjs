import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';

import { JungleGame, DEFAULTS } from './game.js';
const originalWarn = console.warn;
console.warn = (...args) => { if (!String(args[0]).includes('deprecated parameters')) originalWarn(...args); };
await JungleGame.init();
console.warn = originalWarn;

let passed = 0, failed = 0;
const test = async (name, fn) => {
  const games = [];
  const create = (stage = 0, count = 1) => {
    const game = new JungleGame(); games.push(game); game.start(count);
    if (stage) game.build(stage, count);
    return game;
  };
  try { await fn(create); passed++; }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  finally { games.forEach(game => game.world?.free()); }
};
const tick = (game, count, inputs = []) => { for (let i = 0; i < count; i++) game.step(1 / 60, typeof inputs === 'function' ? inputs(i) : inputs); };
const close = (actual, expected, tolerance = 0.1) => assert(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

await test('Rapier version and actual rigid body world', create => {
  assert.match(RAPIER.version(), /^0\.19\.3/);
  const game = create(); assert(game.world instanceof RAPIER.World); assert(game.players[0].body.isDynamic());
});
await test('grounded jump rises and lands through Rapier', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 45);
  const player = game.players[0], start = player.y;
  game.step(1 / 60, [{ jump: true }]); tick(game, 15);
  assert(player.y > start + 1.5, `jump rose only ${player.y - start}`);
  tick(game, 100); close(player.y, game.ground(player.x), 0.2); assert.equal(game.stats.jumps, 1);
});
await test('jump uses an input edge rather than held auto jump', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 45); tick(game, 150, [{ jump: true }]);
  assert.equal(game.stats.jumps, 1);
});
await test('natural first vine catch and ballistic transfer', create => {
  const game = create(); game.god = true;
  game.step(1 / 60, [{ x: 1, jump: true }]);
  for (let i = 0; i < 240 && game.players[0].attached < 0; i++) game.step(1 / 60, [{ x: 1 }]);
  const player = game.players[0]; assert.equal(player.attached, 0, `first catch: x ${player.x} y ${player.y}`);
  tick(game, 1, [{ x: 1 }]); tick(game, 1, [{ x: 1, jump: true }]);
  assert.equal(player.attached, -1); assert(player.body.linvel().y > 0);
  for (let i = 0; i < 180 && player.attached < 0; i++) game.step(1 / 60, [{ x: 1 }]);
  assert.equal(player.attached, 1, `transfer ended on ${player.attached} at x ${player.x}`);
  assert(game.stats.grabs >= 2);
});
await test('canopy entry supports different first jump timings', create => {
  for (const wait of [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]) {
    const game = create(); tick(game, Math.round(wait * 60));
    tick(game, 1, [{ x: 1, jump: true }]);
    for (let i = 0; i < 240 && game.players[0].attached < 0; i++) game.step(1 / 60, [{ x: 1 }]);
    assert(game.stats.grabs > 0, `entry failed after idle ${wait}: x=${game.players[0].x} y=${game.players[0].y}`);
  }
});
await test('river surface replenishes limited air', create => {
  const game = create(1); const player = game.players[0]; game.teleport(player, 8, 2.5); player.air = 2;
  tick(game, 60); assert(player.air >= 10, `air ${player.air}`); assert(player.air <= game.config.air);
});
await test('submerged movement consumes air and drowning costs a life', create => {
  const game = create(1); const player = game.players[0]; game.teleport(player, 8, -3); player.air = 0.01; player.invuln = 0;
  const lives = game.lives; game.step(1 / 60);
  assert.equal(game.lives, lives - 1); close(player.air, game.config.air); assert(player.y > 1.5); assert.equal(game.stats.hits, 1);
});
await test('river swim responds in both axes without gravity', create => {
  const game = create(1); const player = game.players[0]; game.teleport(player, 8, -3);
  tick(game, 20, [{ x: 1, y: 1 }]); assert(player.x > 9.5); assert(player.y > -1.5); close(player.body.gravityScale(), 0);
});
await test('closed crocodile jaws can be swatted', create => {
  const game = create(1); game.time = 2; tick(game, 1);
  const croc = game.enemies[0], player = game.players[0]; assert.equal(croc.open, false);
  game.teleport(player, croc.x, croc.y - 0.8); const before = game.score;
  game.step(1 / 60, [{ action: true }]); assert.equal(croc.dead, true); assert(game.score >= before + 250); assert.equal(game.stats.swats, 1);
});
await test('held river swat repeats for touch assistance', create => {
  const game = create(1); game.build(1); game.god = true; tick(game, 65, [{ action: true }]); assert(game.stats.swats >= 3);
});
await test('open jaws resist swats and damage explorer', create => {
  const game = create(1); game.time = 0.6; tick(game, 1);
  const croc = game.enemies[0], player = game.players[0]; assert.equal(croc.open, true);
  game.teleport(player, croc.x, croc.y - 0.8); player.invuln = 0;
  game.step(1 / 60, [{ action: true }]); assert.equal(croc.dead, false); assert.equal(game.lives, 4);
});
await test('hit invulnerability prevents repeated life loss', create => {
  const game = create(1); const player = game.players[0]; player.invuln = 0;
  assert.equal(game.hurt(player), true); assert.equal(game.hurt(player), false); assert.equal(game.lives, 4);
});
await test('boulders alternate small and high bouncing geometry', create => {
  const game = create(2); game.spawnTimer = 999; game.spawnRock(); game.spawnRock();
  const [small, large] = game.enemies; assert.equal(small.large, false); assert.equal(large.large, true); assert(small.r < large.r);
  const start = small.body.translation(); tick(game, 30);
  assert(small.x < start.x - 1, `rock did not roll left: ${small.x}`); assert(large.body.isDynamic()); assert(large.y > small.y + 1);
});
await test('duck is slower and counted once per press', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 40);
  const player = game.players[0], start = player.x;
  tick(game, 30, [{ x: 1, duck: true }]); assert.equal(game.stats.ducks, 1); assert.equal(player.anim, 'duck');
  close(player.x - start, game.config.speed * 0.4 / 2, 0.3);
  tick(game, 1); tick(game, 1, [{ duck: true }]); assert.equal(game.stats.ducks, 2);
});
await test('high bouncer clears a ducking explorer', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 40); game.spawnRock(); game.spawnRock();
  const player = game.players[0], large = game.enemies[1]; player.invuln = 0;
  large.body.setTranslation({ x: player.x, y: player.y + 2.6, z: 0 }, true);
  game.step(1 / 60, [{ duck: true }]); assert.equal(game.lives, 5);
});
await test('small boulder collision hurts explorer', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 40); game.spawnRock();
  const player = game.players[0], rock = game.enemies[0]; player.invuln = 0;
  rock.body.setTranslation({ x: player.x, y: player.y + 0.8, z: 0 }, true);
  game.step(1 / 60); assert.equal(game.lives, 4);
});
await test('bell interaction requires proximity and each action edge', create => {
  const game = create(3); const player = game.players[0];
  game.step(1 / 60, [{ action: true }]); assert.deepEqual(game.bells, [false, false]);
  game.teleport(player, 37, 0); tick(game, 1); tick(game, 1, [{ action: true }]); assert.deepEqual(game.bells, [true, false]);
  game.teleport(player, 66, 0); tick(game, 1); tick(game, 1, [{ action: true }]); assert.deepEqual(game.bells, [true, true]);
});
await test('rescue requires both bells and final interaction', create => {
  const game = create(3); const player = game.players[0]; game.teleport(player, 94, 0);
  tick(game, 1, [{ action: true }]); assert.equal(game.mode, 'playing');
  game.bells = [true, true]; tick(game, 1); tick(game, 1, [{ action: true }]); assert.equal(game.mode, 'won'); assert.equal(game.rescued, true);
});
await test('two explorer cooperative count and independent movement', create => {
  const game = create(2, 2); game.spawnTimer = 999; tick(game, 40);
  const [first, second] = game.players, x1 = first.x, x2 = second.x;
  tick(game, 20, [{ x: 1 }, { x: -1 }]); assert(first.x > x1 + 1); assert(second.x < x2 - 1); assert.notEqual(first.body.handle, second.body.handle);
});
await test('stage transition preserves cooperative player count', create => {
  const game = create(0, 2); game.teleport(game.players[0], 104, 0); tick(game, 130);
  assert.equal(game.stage, 1); assert.equal(game.players.length, 2); assert.equal(game.stats.stages, 1);
});
await test('full four stage autopilot playthrough progresses and wins', create => {
  const game = create(); game.auto = true; game.god = true; const visited = new Set();
  for (let i = 0; i < 60 * 240 && game.mode === 'playing'; i++) { game.step(1 / 60); visited.add(game.stage); }
  assert.equal(game.mode, 'won', `stage ${game.stage}, x ${game.players[0].x}, y ${game.players[0].y}, attached ${game.players[0].attached}, time ${game.elapsed}`);
  assert.deepEqual([...visited].sort(), [0, 1, 2, 3]); assert.equal(game.stats.stages, 4); assert(game.stats.grabs > 2); assert(game.stats.swats > 0); assert(game.score > 4000);
});
await test('attract replay can complete all mechanics and chapters', create => {
  const game = create(); game.start(1, true); const visited = new Set();
  for (let i = 0; i < 60 * 240 && game.mode === 'attract'; i++) { game.step(1 / 60); visited.add(game.stage); }
  assert.equal(game.mode, 'won', `attract stuck in ${game.stage} at ${game.players[0].x}`); assert.equal(visited.size, 4); assert.equal(game.lives, 5);
});
await test('cooperative simultaneous rescue awards completion once', create => {
  const game = create(3, 2); game.bells = [true, true];
  for (const player of game.players) game.teleport(player, 94, 0);
  tick(game, 1, [{ action: true }, { action: true }]);
  assert.equal(game.mode, 'won'); assert.equal(game.stats.stages, 1); assert(game.score < 2000, `duplicated victory score ${game.score}`);
});
await test('lives exhausted enters game over', create => {
  const game = create(2); const player = game.players[0]; game.lives = 1; player.invuln = 0; game.hurt(player);
  assert.equal(game.mode, 'gameover'); assert.equal(game.lives, 0);
});
await test('restart resets progress and stage state', create => {
  const game = create(3, 2); game.score = 9000; game.lives = 1; game.bells = [true, true]; game.stats.hits = 17; game.start(1);
  assert.equal(game.stage, 0); assert.equal(game.players.length, 1); assert.equal(game.score, 0); assert.equal(game.lives, 5); assert.deepEqual(game.bells, [false, false]); assert.equal(game.stats.hits, 0); assert.equal(game.elapsed, 0); assert.equal(game.mode, 'playing');
});
await test('live jump speed gravity and air variables affect simulation', create => {
  const game = create(2); game.spawnTimer = 999; tick(game, 40); game.config.jump = 17; game.config.speed = 12; game.config.gravity = 15;
  game.step(1 / 60, [{ x: 1, jump: true }]); assert(game.players[0].body.linvel().y > DEFAULTS.jump); close(game.players[0].body.linvel().x, 12, 0.1); close(game.world.gravity.y, -15);
  game.config.air = 30; game.build(1); assert.equal(game.players[0].air, 30);
});
await test('snapshot omits Rapier handles and is serializable', create => {
  const game = create(2); game.spawnRock(); const snap = game.snapshot(); assert(!('body' in snap.players[0])); assert(!('body' in snap.enemies[0])); assert(JSON.stringify(snap).length > 100);
});
console.log(`${passed} passed, ${failed} failed (${passed + failed} tests)`);
process.exitCode = failed ? 1 : 0;
