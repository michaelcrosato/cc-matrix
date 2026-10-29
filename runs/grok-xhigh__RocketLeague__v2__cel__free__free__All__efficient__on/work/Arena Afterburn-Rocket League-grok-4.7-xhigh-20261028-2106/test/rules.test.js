import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENA, BALL, CAR, MATCH } from '../src/constants.js';
import { carAxes } from '../src/math3.js';
import { createMatch, onGoal, stepMatch } from '../src/match.js';
import { createBall, resolveBallArena, stepBall } from '../src/ball.js';
import { applyBoostPad, createCar, resolveCarContact, stepCar } from '../src/vehicle.js';
import { createWorld, stepWorld } from '../src/world.js';

function carAt(extra = {}) {
  const car = createCar({
    id: 'c',
    team: 'blue',
    name: 'VESPER',
    human: true,
    pos: { x: 0, y: CAR.half.y, z: 0 },
    yaw: 0,
  });
  Object.assign(car, extra);
  if (extra.pos) car.pos = { ...extra.pos };
  if (extra.vel) car.vel = { ...extra.vel };
  if (extra.spawn) car.spawn = { ...extra.spawn };
  return car;
}

test('a goal increments only the scoring side and the match returns to kickoff', () => {
  const world = createWorld({ mode: '1v1', duration: 90, humans: 1 });
  world.match.phase = 'playing';
  world.match.countdown = 0;
  world.match.banner = '';
  world.ball.pos.x = 0;
  world.ball.pos.y = 1.4;
  world.ball.pos.z = ARENA.length / 2 + 1.2;
  world.ball.vel.x = 0;
  world.ball.vel.y = 0;
  world.ball.vel.z = 2;
  stepWorld(world, {}, 1 / 60);
  assert.equal(world.match.score.blue, 1);
  assert.equal(world.match.score.orange, 0);
  assert.equal(world.match.phase, 'goal');
  stepWorld(world, {}, MATCH.goalPause + 0.05);
  assert.equal(world.match.phase, 'kickoff');
  assert.equal(world.match.score.blue, 1);
  assert.equal(world.match.score.orange, 0);
  assert.ok(Math.abs(world.ball.pos.x) < 0.01);
  assert.ok(Math.abs(world.ball.pos.z) < 0.01);
  assert.ok(Math.abs(world.ball.pos.y - BALL.radius) < 0.05);
});

test('regulation expiry with a leader ends the match and a tie enters overtime', () => {
  const lead = createMatch(30);
  lead.phase = 'playing';
  lead.clock = 0.02;
  lead.score.blue = 2;
  lead.score.orange = 1;
  stepMatch(lead, 0.05);
  assert.equal(lead.phase, 'ended');
  assert.equal(lead.winner, 'blue');
  assert.equal(lead.score.orange, 1);

  const tied = createMatch(30);
  tied.phase = 'playing';
  tied.clock = 0.02;
  tied.score.blue = 1;
  tied.score.orange = 1;
  stepMatch(tied, 0.05);
  assert.equal(tied.phase, 'overtime');
  assert.equal(tied.overtime, true);
  assert.equal(tied.clock, 0);
});

test('the next overtime goal ends the match', () => {
  const match = createMatch(30);
  match.phase = 'overtime';
  match.overtime = true;
  match.countdown = 0;
  match.score.blue = 1;
  match.score.orange = 1;
  onGoal(match, 'orange');
  assert.equal(match.phase, 'ended');
  assert.equal(match.winner, 'orange');
  assert.equal(match.score.orange, 2);
  assert.equal(match.score.blue, 1);
});

test('boost drains, a small pad is a partial refill, and a big pad fills the tank', () => {
  const car = carAt({ boost: 50, driveState: 'ground' });
  stepCar(car, { throttle: 1, boost: true }, 0.3, { surfaceNormal: { x: 0, y: 1, z: 0 } });
  assert.ok(car.boost < 50 - 5, `boost should drain, got ${car.boost}`);
  assert.ok(car.boost > 50 - 33.3 * 0.3 - 0.2);

  const partial = carAt({ boost: 10 });
  applyBoostPad(partial, 'small');
  assert.equal(partial.boost, 22);
  applyBoostPad(partial, 'small');
  assert.equal(partial.boost, 34);

  const capped = carAt({ boost: 95 });
  applyBoostPad(capped, 'small');
  assert.equal(capped.boost, 100);

  const big = carAt({ boost: 3 });
  applyBoostPad(big, 'big');
  assert.equal(big.boost, 100);
});

test('a jump then a directional dodge spends the dodge', () => {
  const car = carAt();
  const ground = { surfaceNormal: { x: 0, y: 1, z: 0 } };
  const air = { surfaceNormal: null };
  stepCar(car, { jump: true }, 0.05, ground);
  assert.equal(car.canDodge, true);
  assert.equal(car.driveState, 'air');
  assert.equal(car.didJump, true);
  stepCar(car, { jump: false }, 0.05, air);
  assert.equal(car.canDodge, true);
  stepCar(car, { jump: true, steer: 1 }, 0.05, air);
  assert.equal(car.canDodge, false);
  assert.equal(car.didDodge, true);
  assert.ok(car.vel.x > 1, `dodge should add +X speed, got ${car.vel.x}`);
  const spent = car.vel.x;
  stepCar(car, { jump: false }, 0.05, air);
  stepCar(car, { jump: true, steer: -1 }, 0.05, air);
  assert.equal(car.canDodge, false);
  assert.ok(car.vel.x > spent - 0.5);
});

test('boost on a nose-up aerial adds upward velocity', () => {
  const car = carAt({
    pos: { x: 0, y: 8, z: 0 },
    pitch: 0.8,
    boost: 80,
    driveState: 'air',
  });
  car.vel.y = 0;
  stepCar(car, { boost: true }, 0.2, { surfaceNormal: null });
  assert.ok(car.vel.y > 0.5, `expected upward speed, got ${car.vel.y}`);
  assert.ok(car.boost < 80);
});

test('wall contact keeps a driving state and throttle still accelerates', () => {
  const car = carAt({ pos: { x: 10, y: 6, z: 0 }, yaw: 0 });
  car.vel.z = 0;
  stepCar(car, { throttle: 1 }, 0.4, { surfaceNormal: { x: -1, y: 0, z: 0 } });
  assert.equal(car.driveState, 'wall');
  assert.equal(car.driving, true);
  assert.ok(car.vel.z < -1, `wall drive should move along -Z, got ${car.vel.z}`);
});

test('supersonic contact demolishes the other car and that car respawns', () => {
  const a = carAt({ id: 'a', pos: { x: 0, y: 1, z: 0 } });
  const b = carAt({
    id: 'b',
    team: 'orange',
    pos: { x: 1.2, y: 1, z: 0 },
    spawn: { x: 4, y: CAR.half.y, z: 8 },
    spawnYaw: 0.4,
  });
  a.supersonic = true;
  b.supersonic = false;
  const victims = resolveCarContact(a, b);
  assert.ok(victims && victims.includes(b));
  assert.equal(b.demolished, true);
  assert.ok(b.respawnTimer > 0);
  assert.equal(a.demolished, false);
  stepCar(b, {}, CAR.demoRespawn + 0.05, { surfaceNormal: null });
  assert.equal(b.demolished, false);
  assert.equal(b.pos.x, b.spawn.x);
  assert.equal(b.pos.y, b.spawn.y);
  assert.equal(b.pos.z, b.spawn.z);
  assert.equal(b.yaw, b.spawnYaw);
  assert.equal(b.boost, CAR.boostStart);
});

test('the ball stays inside the arena after a wall hit and a ceiling hit', () => {
  const side = createBall();
  side.pos.x = ARENA.width / 2 - BALL.radius - 0.05;
  side.pos.y = 5;
  side.pos.z = 0;
  side.vel.x = 25;
  side.vel.y = 0;
  side.vel.z = 0;
  stepBall(side, 0.1);
  assert.ok(side.pos.x <= ARENA.width / 2 - BALL.radius + 1e-6);
  assert.ok(side.pos.x >= -ARENA.width / 2 + BALL.radius - 1e-6);
  assert.ok(side.vel.x < 0);

  const ceil = createBall();
  ceil.pos.x = 0;
  ceil.pos.y = ARENA.height - BALL.radius - 0.05;
  ceil.pos.z = 0;
  ceil.vel.y = 30;
  stepBall(ceil, 0.1);
  assert.ok(ceil.pos.y <= ARENA.height - BALL.radius + 1e-6);
  assert.ok(ceil.pos.y >= BALL.radius - 1e-6);
  assert.ok(ceil.vel.y < 0);

  const direct = createBall();
  direct.pos.x = ARENA.width / 2 + 4;
  direct.pos.y = ARENA.height + 4;
  direct.pos.z = 0;
  direct.vel.x = 10;
  direct.vel.y = 10;
  resolveBallArena(direct);
  assert.ok(direct.pos.x <= ARENA.width / 2 - BALL.radius + 1e-6);
  assert.ok(direct.pos.y <= ARENA.height - BALL.radius + 1e-6);
});

test('throttle at yaw 0 moves along -Z and a blue kickoff car faces +Z', () => {
  const car = carAt({ yaw: 0 });
  for (let i = 0; i < 20; i += 1) {
    stepCar(car, { throttle: 1 }, 1 / 60, { surfaceNormal: { x: 0, y: 1, z: 0 } });
  }
  const axes = carAxes(car.yaw, car.pitch, car.roll);
  assert.ok(axes.forward.z < -0.9);
  assert.ok(car.vel.z < -1);
  assert.ok(car.pos.z < 0);

  const world = createWorld({ mode: '1v1', humans: 1 });
  const blue = world.cars[0];
  const orange = world.cars[1];
  const blueFwd = carAxes(blue.yaw, 0, 0).forward;
  const orangeFwd = carAxes(orange.yaw, 0, 0).forward;
  assert.ok(blueFwd.z > 0.9);
  assert.ok(orangeFwd.z < -0.9);
  assert.equal(blue.team, 'blue');
  assert.equal(orange.human, false);
});
