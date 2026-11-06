import assert from 'node:assert/strict';
import { Game, DEFAULTS, initPhysics } from './game.js';

let passed = 0;
let failed = 0;
const originalWarn = console.warn;
console.warn = (...args) => {
  if (!String(args[0]).includes('deprecated parameters for the initialization function')) originalWarn(...args);
};
await initPhysics();
console.warn = originalWarn;

function run(name, test) {
  const game = new Game();
  try { test(game); passed++; }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  finally { game.dispose(); }
}
const tick = (game, seconds, inputs = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.update(1 / 60, inputs);
};
const isolated = game => {
  game.start();
  game.spawnClock = 100000;
  game.state.remaining = 100000;
};
const addMeteor = (game, x, y, vx = 0, vy = 0) => {
  const meteor = { id: game.serial++, x, y, r: 0.6, kind: 'rock' };
  game.state.meteors.push(meteor);
  game.body(meteor, 'meteor', meteor.r, vx, vy);
  return meteor;
};

run('fresh run clears state and supports four seats', game => {
  game.start(4, [7, 8, 9, 10]);
  assert.equal(game.state.phase, 'defense');
  assert.deepEqual(game.state.players.map(player => player.id), [7, 8, 9, 10]);
  assert.equal(game.state.hull, 6);
  assert.equal(game.state.charge, 100);
  assert.equal(game.state.players.length, 4);
});

run('input snaps defensive fire to the dominant cardinal direction', game => {
  isolated(game);
  game.update(1 / 60, { 0: { aimX: -0.8, aimY: 0.3, fire: true } });
  assert.equal(game.state.players[0].aimX, -1);
  assert.equal(game.state.players[0].aimY, 0);
  assert.equal(game.state.shots.length, 1);
  assert.ok(game.state.shots[0].vx < 0);
  assert.equal(game.state.shots[0].vy, 0);
});

run('Rapier collision destroys meteor and bullet and awards score', game => {
  isolated(game);
  addMeteor(game, 0, 5);
  game.shoot(game.state.players[0]);
  tick(game, 0.25);
  assert.equal(game.state.meteors.length, 0);
  assert.equal(game.state.shots.length, 0);
  assert.equal(game.state.kills, 1);
  assert.equal(game.state.score, 110);
});

run('Rapier meteor collision removes one hull point', game => {
  isolated(game);
  addMeteor(game, 0, 3.5, 0, -5);
  tick(game, 0.5);
  assert.equal(game.state.hull, 5);
  assert.equal(game.state.meteors.length, 0);
});

run('damage cooldown prevents repeated contact damage', game => {
  isolated(game);
  game.damage();
  game.damage();
  assert.equal(game.state.hull, 5);
  tick(game, 0.9);
  game.damage();
  assert.equal(game.state.hull, 4);
});

run('live invincibility and attract protect hull', game => {
  isolated(game);
  game.config.invincible = true;
  game.damage(100);
  assert.equal(game.state.hull, 6);
  game.config.invincible = false;
  game.state.attract = true;
  game.damage(100);
  assert.equal(game.state.hull, 6);
});

run('pulse clears nearby threats, preserves distant threats, and spends charge', game => {
  isolated(game);
  addMeteor(game, 0, 6);
  addMeteor(game, 12, 0);
  game.pulse(game.state.players[0]);
  assert.equal(game.state.meteors.length, 1);
  assert.equal(game.state.meteors[0].x, 12);
  assert.equal(game.state.kills, 1);
  assert.equal(game.state.charge, 62);
  assert.equal(game.state.players[0].shield, 0.9);
  game.state.charge = 20;
  game.pulse(game.state.players[0]);
  assert.equal(game.state.charge, 20);
  assert.equal(game.state.meteors.length, 1);
});

run('charge regenerates and clamps at its maximum', game => {
  isolated(game);
  game.state.charge = 98;
  tick(game, 1);
  assert.equal(game.state.charge, 100);
});

run('rescue lifts two creatures, enforces capacity, and delivers at the ark', game => {
  game.start();
  game.beginRescue();
  game.state.enemies = [];
  const player = game.state.players[0];
  const beam = { 0: { fire: true } };
  for (let i = 0; i < 2; i++) {
    player.x = game.state.critters[i].x;
    player.y = -3.6;
    tick(game, 1.3, beam);
  }
  assert.equal(player.cargo.length, 2);
  player.x = game.state.critters[2].x;
  tick(game, 1.3, beam);
  assert.equal(player.cargo.length, 2);
  assert.equal(game.state.critters[2].status, 'ground');
  player.x = 0;
  player.y = 5.8;
  tick(game, 1 / 60);
  assert.equal(player.cargo.length, 0);
  assert.equal(game.state.rescued, 2);
  assert.equal(game.state.totalRescued, 2);
  assert.equal(player.rescues, 2);
  assert.equal(game.state.score, 1000);
  assert.equal(game.state.critters.filter(creature => creature.status === 'delivered').length, 2);
});

run('interrupted beam progress decays', game => {
  game.start();
  game.beginRescue();
  game.state.enemies = [];
  const player = game.state.players[0];
  player.x = game.state.critters[0].x;
  player.y = -3.6;
  tick(game, 0.5, { 0: { fire: true } });
  assert.ok(game.state.critters[0].lift > 0.4);
  tick(game, 1);
  assert.equal(game.state.critters[0].lift, 0);
  assert.equal(player.cargo.length, 0);
});

run('rescue sentries damage player and grant contact protection', game => {
  game.start();
  game.beginRescue();
  game.state.players[0].x = 0;
  game.state.players[0].y = -2.4;
  game.update(1 / 60);
  assert.equal(game.state.hull, 5);
  assert.ok(game.state.players[0].shield > 1);
  game.update(1 / 60);
  assert.equal(game.state.hull, 5);
});

run('rescue dash spends charge and increases travel distance', game => {
  game.start();
  game.beginRescue();
  game.state.enemies = [];
  const player = game.state.players[0];
  player.x = 0;
  player.y = 0;
  game.update(1 / 60, { 0: { x: 1, pulse: true } });
  assert.equal(game.state.charge, 78);
  assert.ok(player.x > 6.2 / 60);
  assert.ok(player.shield > 0);
});

run('timeout harms hull and provides a rescue extension', game => {
  game.start();
  game.beginRescue();
  game.state.enemies = [];
  game.state.remaining = 0.001;
  game.update(1 / 60);
  assert.equal(game.state.hull, 4);
  assert.equal(game.state.remaining, DEFAULTS.rescueTime * 0.5);
  assert.equal(game.state.phase, 'rescue');
});

run('all worlds transition through rescue then final storm and victory', game => {
  game.start();
  for (let world = 0; world < 3; world++) {
    assert.equal(game.state.world, world);
    assert.equal(game.state.phase, 'defense');
    game.advance();
    assert.equal(game.state.phase, 'warp');
    game.advance();
    assert.equal(game.state.phase, 'rescue');
    game.state.rescued = 4;
    game.advance();
    assert.equal(game.state.phase, 'warp');
    game.advance();
  }
  assert.equal(game.state.finalDefense, true);
  assert.equal(game.state.phase, 'defense');
  assert.equal(game.state.remaining, 30);
  game.advance();
  assert.equal(game.state.phase, 'victory');
  assert.equal(game.finished, true);
  assert.equal(game.state.ended, true);
});

run('failure ends once and retry fully resets the run', game => {
  game.start();
  let endings = 0;
  game.onFinish = () => endings++;
  game.damage(100);
  game.end(false);
  assert.equal(game.state.phase, 'gameover');
  assert.equal(endings, 1);
  game.start();
  assert.equal(game.state.phase, 'defense');
  assert.equal(game.state.hull, 6);
  assert.equal(game.state.score, 0);
  assert.equal(game.finished, false);
  assert.equal(game.state.ended, false);
  assert.equal(game.state.time, 0);
});

run('live balance settings affect movement, beam power, and meteor speed', game => {
  game.start();
  game.config.meteorSpeed = 2;
  const meteor = game.spawnMeteor(0);
  assert.ok(Math.abs(Math.hypot(meteor.vx, meteor.vy) - 5.4) < 0.00001);
  game.beginRescue();
  game.state.enemies = [];
  const player = game.state.players[0];
  player.x = game.state.critters[0].x;
  player.y = -3.6;
  game.config.beamPower = 3;
  tick(game, 0.5, { 0: { fire: true } });
  assert.equal(player.cargo.length, 1);
  player.x = 0;
  game.config.pilotSpeed = 2;
  game.update(1 / 60, { 0: { x: 1 } });
  assert.ok(Math.abs(player.x - 12.4 / 60) < 0.00001);
});

run('full attract AI playthrough rescues every creature and wins on defaults', game => {
  game.start(1, null, true);
  const phases = new Set();
  const worlds = new Set();
  for (let frame = 0; frame < 60 * 600 && !game.finished; frame++) {
    game.update(1 / 60);
    phases.add(game.state.phase);
    worlds.add(game.state.world);
  }
  assert.equal(game.state.phase, 'victory', `phase=${game.state.phase}, world=${game.state.world}, rescued=${game.state.totalRescued}, time=${game.state.time.toFixed(1)}`);
  assert.equal(game.state.totalRescued, 12);
  assert.deepEqual([...worlds], [0, 1, 2]);
  for (const phase of ['defense', 'warp', 'rescue', 'victory']) assert.ok(phases.has(phase));
  assert.equal(game.state.hull, 6);
  assert.ok(game.state.kills > 0);
  assert.ok(game.state.score >= 6000);
});

run('four-player AI playthrough has independent cargo and shared victory', game => {
  game.start(4, null, true);
  for (let frame = 0; frame < 60 * 600 && !game.finished; frame++) game.update(1 / 60);
  assert.equal(game.state.phase, 'victory');
  assert.equal(game.state.totalRescued, 12);
  assert.equal(game.state.players.reduce((total, player) => total + player.rescues, 0), 12);
  assert.ok(game.state.players.filter(player => player.rescues > 0).length >= 2);
});

run('snapshots serialize without sharing mutable game objects', game => {
  game.start();
  const snapshot = game.snapshot();
  snapshot.players[0].x = 99;
  assert.notEqual(game.state.players[0].x, 99);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

run('disconnected pilots cannot fire, fly or take sentry damage', game => {
  isolated(game);
  const p=game.state.players[0];p.active=false;
  tick(game,.3,{0:{fire:true,pulse:true,x:1,y:1}});
  assert.equal(game.state.shots.length,0);
  game.beginRescue();p.x=0;p.y=-2.4;
  const x=p.x,y=p.y,hull=game.state.hull;
  tick(game,.1,{0:{fire:true,pulse:true,x:1,y:1}});
  assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(p.beam,false);assert.equal(game.state.hull,hull);
});

console.log(`${passed + failed} simulation checks: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
