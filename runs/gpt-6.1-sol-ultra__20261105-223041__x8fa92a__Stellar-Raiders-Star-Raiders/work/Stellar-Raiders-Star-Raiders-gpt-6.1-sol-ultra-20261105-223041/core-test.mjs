import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';

const originalWarn = console.warn;
console.warn = (...args) => { if (!String(args[0]).includes('deprecated parameters')) originalWarn(...args); };
await RAPIER.init();
console.warn = originalWarn;
// Also works before package.json switches to ESM during development.
const source = (await readFile(new URL('./core.js', import.meta.url), 'utf8')).replace("'@dimforge/rapier3d-compat'", JSON.stringify(import.meta.resolve('@dimforge/rapier3d-compat')));
const { Campaign, DEFAULTS, dist } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let passed = 0, failed = 0;
const dt = 1 / 60;
const close = (a, b, tolerance = 0.001) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const tick = (game, seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, typeof input === 'function' ? input(game) : input); };
const free = game => { game.events.free(); game.world.free(); };
async function test(name, fn) {
  const log = [];
  let game;
  try { game = new Campaign((type, data) => log.push({ type, data })); await fn(game, log); passed++; }
  catch (error) { failed++; console.log(`FAIL ${name}: ${error.message}`); }
  finally { if (game) free(game); }
}
function launch(game) {
  game.launch();
}
function aim(game, target = game.target) {
  if (!target || target.dead) return { yaw: 0, pitch: 0 };
  const p = game.position, q = target.body.translation();
  const d = dist(p, q) || 1;
  const yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
  const pitch = Math.asin((q.y - p.y) / d);
  const error = Math.atan2(Math.sin(yaw - game.yaw), Math.cos(yaw - game.yaw));
  return { yaw: Math.max(-1, Math.min(1, error * 4)), pitch: Math.max(-1, Math.min(1, (pitch - game.pitch) * 4)) };
}
function transit(game, sector, input = {}) {
  assert.equal(game.beginJump(sector), true, 'jump must initiate');
  let frames = 0;
  while (game.jump && frames++ < 310) game.update(dt, input);
  assert.equal(game.jump, null, 'jump must complete');
  assert.equal(game.sector, sector);
}

await test('real Rapier launch and initial mission', (game, log) => {
  assert.equal(RAPIER.version(), '0.19.3');
  launch(game);
  assert.equal(game.running, true);
  assert.equal(game.sector, 11);
  assert.equal(game.remaining, 13);
  assert.equal(game.enemies.length, 3);
  assert.equal(game.world.bodies.len(), 4);
  assert.ok(log.some(e => e.type === 'message'));
});
await test('player physics movement and steering', game => {
  launch(game); game.tuning.enemyRate = 0;
  const before = { ...game.position };
  tick(game, 1);
  assert.ok(game.position.z < before.z - 30, 'forward thrust must move the real rigid body');
  tick(game, 0.5, { yaw: 1, pitch: 0.5, thrust: 1, strafe: 1 });
  assert.ok(game.yaw > .7 && game.pitch > .35);
  assert.ok(game.throttle > .49);
  assert.ok(game.position.x > 0, 'strafe must affect rigid-body motion');
});
await test('live balance controls affect turn, damage and energy', game => {
  launch(game); game.tuning.enemyRate = 0; game.tuning.turnSpeed = 2.5;
  tick(game, 0.4, { yaw: 1 }); close(game.yaw, 1);
  game.tuning.weaponDamage = 91; game.tuning.energyDrain = 2;
  assert.equal(game.fire(), true);
  assert.equal(game.bullets.at(-1).damage, 91);
  close(game.energy, 100 - .64);
  assert.deepEqual(Object.keys(game.debug().tuning).sort(), Object.keys(DEFAULTS).sort());
});
await test('shield absorption, hull damage, and recharge', game => {
  launch(game); game.tuning.enemyRate = 0;
  game.damage(30); close(game.shield, 70); close(game.hull, 100); close(game.energy, 97.3);
  game.toggleShield(); game.damage(20); close(game.hull, 80); close(game.shield, 70);
  game.toggleShield(); tick(game, 4);
  assert.ok(game.shield > 70, 'shield should recharge after damage delay');
  game.shield = 5; game.damage(10); close(game.shield, 0); close(game.hull, 75);
});
await test('weapon cooldown, heat, and energy gates', game => {
  launch(game); game.tuning.enemyRate = 0;
  assert.equal(game.fire(), true); assert.equal(game.fire(), false); assert.equal(game.shots, 1);
  tick(game, .15); assert.equal(game.fire(), true);
  game.cooldown = 0; game.heat = 95; assert.equal(game.fire(), false);
  game.heat = 0; game.energy = 0; assert.equal(game.fire(), false);
});
await test('target cycling and forward aim assist', game => {
  launch(game);
  const first = game.target; game.cycleTarget(); assert.notEqual(game.target, first);
  const q = game.target.body.translation(), p = game.position;
  game.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
  game.pitch = Math.asin((q.y - p.y) / dist(q, p));
  assert.equal(game.aimTarget(), game.target);
  game.yaw += Math.PI; assert.notEqual(game.aimTarget(), game.target);
});
await test('pilot steering and real laser collisions kill enemies', (game, log) => {
  launch(game); game.god = true; game.throttle = 0;
  for (let i = 0; i < 2400 && game.kills < 1; i++) game.update(dt, { ...aim(game), fire: true });
  assert.ok(game.kills >= 1, 'pilot must score an actual laser kill');
  assert.ok(game.hits >= 3 && game.score >= 200);
  assert.equal(game.remaining, 13 - game.kills);
  assert.ok(log.some(e => e.type === 'explosion'));
});
await test('homing missile steers, impacts, and consumes supply', game => {
  launch(game); game.god = false; game.tuning.enemyRate = 0; game.throttle = 0;
  const target = game.target;
  assert.equal(game.missile(), true); assert.equal(game.missiles, 5);
  const missile = game.bullets.find(b => b.missile);
  game.update(dt);
  const p = missile.body.translation(), q = target.body.translation(), v = missile.body.linvel();
  const alignment = ((q.x-p.x)*v.x+(q.y-p.y)*v.y+(q.z-p.z)*v.z)/(dist(p,q)*Math.hypot(v.x,v.y,v.z));
  assert.ok(alignment > .99, 'homing velocity must point toward target');
  tick(game, 3);
  assert.ok(target.dead, 'missile must destroy a scout with a real collision');
  assert.ok(game.kills >= 1);
});
await test('hyperspace cost, clean alignment, and sector population', game => {
  launch(game); const cost = game.jumpCost(7), before = game.energy;
  transit(game, 7);
  close(game.energy, before - cost); assert.equal(game.jumps, 1); assert.equal(game.score, 120);
  assert.equal(game.enemies.length, 3); assert.equal(game.sectors[7].visited, true);
  assert.equal(game.world.bodies.len(), 4, 'prior sector bodies must be removed');
});
await test('rough transit and insufficient energy', game => {
  launch(game); transit(game, 3, { yaw: 1 }); assert.equal(game.score, 0);
  game.energy = 0; assert.equal(game.beginJump(4), false); assert.equal(game.jump, null);
  assert.equal(game.beginJump(3), false, 'current-sector jump rejected');
});
await test('starbase approach, docking resupply, and departure', game => {
  launch(game); game.enterSector(16); game.throttle = 0;
  game.player.setTranslation({ x: 0, y: 0, z: -350 }, true);
  game.hull = 40; game.shield = 20; game.energy = 30; game.missiles = 0;
  tick(game, 3.2);
  assert.equal(game.docked, true); assert.equal(game.docks, 1);
  close(game.hull, 100); close(game.shield, 100); close(game.energy, 100); assert.equal(game.missiles, 6);
  assert.equal(game.score, 250);
  game.update(dt, { thrust: 1 }); assert.equal(game.docked, false);
  assert.ok(game.position.x >= 89, 'departure clears the docking volume');
});
await test('docking holds against strafe and releases after starbase loss', game => {
  launch(game); game.enterSector(16); game.throttle = 0;
  game.player.setTranslation({ x: 0, y: 0, z: -350 }, true);
  tick(game, 3.2); assert.equal(game.docked, true);
  const dockedPosition = { ...game.position };
  tick(game, 2, { strafe: 1 });
  assert.equal(game.docked, true);
  close(dist(game.position, dockedPosition), 0);
  const base = game.base; base.health = .0001;
  tick(game, .05);
  assert.equal(base.health, 0); assert.equal(game.docked, false);
  assert.equal(game.running, true, 'the other starbase keeps the patrol active');
  assert.ok(game.position.z < dockedPosition.z, 'normal forward physics resumes after base loss');
});
await test('repeat service repairs without farming score and new patrol resets credit', game => {
  launch(game);
  const serviceAt = sector => {
    game.enterSector(sector); game.throttle = 0;
    game.player.setTranslation({ x: 0, y: 0, z: -350 }, true);
    game.hull = 60; game.energy = 20; game.missiles = 0;
    tick(game, 3.2);
    assert.equal(game.docked, true); close(game.hull, 100); close(game.energy, 100);
    assert.equal(game.missiles, 6);
  };
  serviceAt(16); assert.equal(game.score, 250);
  game.update(dt, { thrust: 1 }); assert.equal(game.docked, false);
  serviceAt(16); assert.equal(game.score, 250, 'same starbase must not award repeat-service points');
  assert.equal(game.docks, 2);
  serviceAt(9); assert.equal(game.score, 500, 'a different starbase awards its first-service credit');
  launch(game); serviceAt(16); assert.equal(game.score, 250, 'new patrol restores first-service eligibility');
});
await test('starbase threat advances and eliminated bombers reduce pressure', game => {
  launch(game); game.enterSector(16); game.throttle = 0;
  tick(game, 1); const firstLoss = 100 - game.bases[0].health;
  game.roster[3] = []; const health = game.bases[0].health; tick(game, 1);
  const secondLoss = health - game.bases[0].health;
  close(firstLoss, .07); close(secondLoss, .025); assert.ok(secondLoss < firstLoss);
});
await test('destroyed starbase stays lost after sector-clear reward', game => {
  launch(game); game.tuning.enemyRate = 0;
  const lostBase = game.bases[0], survivingBase = game.bases[1];
  lostBase.health = .0001; survivingBase.health = 60;
  game.update(dt);
  assert.equal(lostBase.health, 0); assert.equal(game.aliveBases, 1);
  assert.equal(game.lost, false, 'one surviving starbase keeps the campaign active');
  const survivingHealth = survivingBase.health;
  for (const enemy of [...game.enemies]) game.kill(enemy);
  assert.equal(game.roster[11].length, 0, 'sector-clear reward must have occurred');
  assert.equal(lostBase.health, 0, 'sector-clear repair must never revive a destroyed starbase');
  assert.equal(game.aliveBases, 1);
  close(survivingBase.health, survivingHealth + 10);
  assert.equal(game.running, true);
});
await test('hull and starbase loss paths report exactly once', (game, log) => {
  launch(game); game.shields = false; game.damage(100); game.damage(100);
  assert.equal(game.lost, true); assert.equal(game.running, false);
  assert.equal(log.filter(e => e.type === 'finish').length, 1);
  launch(game); game.bases.forEach(b => b.health = .0001); game.update(dt);
  assert.equal(game.lost, true); assert.equal(game.aliveBases, 0);
});
await test('complete four-sector playthrough with actual weapons', (game, log) => {
  launch(game); game.god = true; game.throttle = 0;
  for (const sector of [11, 7, 3, 4]) {
    if (game.sector !== sector) transit(game, sector);
    let frames = 0;
    while (game.enemies.length && game.running && frames++ < 7200) {
      if (!game.target || game.target.dead) game.cycleTarget();
      const steering = aim(game);
      if (Math.abs(steering.yaw) < .2 && Math.abs(steering.pitch) < .2) game.missile();
      game.update(dt, { ...steering, fire: true });
    }
    assert.equal(game.enemies.length, 0, `sector ${sector} must be cleared by pilot`);
  }
  assert.equal(game.won, true); assert.equal(game.lost, false); assert.equal(game.running, false);
  assert.equal(game.kills, 13); assert.equal(game.remaining, 0); assert.equal(game.jumps, 3);
  assert.ok(game.hits >= 13 && game.score > 7000);
  assert.equal(log.filter(e => e.type === 'finish').length, 1);
});
console.log(`${passed + failed} core checks: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
