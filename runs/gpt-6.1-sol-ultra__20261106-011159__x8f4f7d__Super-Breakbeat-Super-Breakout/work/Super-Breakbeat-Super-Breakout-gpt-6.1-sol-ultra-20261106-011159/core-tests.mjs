import assert from 'node:assert/strict';
import { GameCore, initPhysics, DEFAULTS, STAGES } from './core.js';

const savedWarn = console.warn;
console.warn = (...args) => {
  if (!String(args[0]).includes('deprecated parameters for the initialization')) savedWarn(...args);
};
await initPhysics();
console.warn = savedWarn;
let count = 0;
let failures = 0;
const cores = new Set();
function fresh(stage = 0, options = {}) {
  const core = new GameCore();
  cores.add(core);
  core.start({ stage, ...options });
  return core;
}
function run(core, seconds, input = {}) {
  for (let tick = 0; tick < Math.ceil(seconds * 120); tick++) core.update(1 / 120, input);
}
function test(name, fn) {
  count++;
  try { fn(); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  finally { for (const core of cores) core.dispose(); cores.clear(); }
}
function place(ball, x, y, vx, vy) {
  ball.body.setTranslation({ x, y }, true);
  ball.body.setLinvel({ x: vx, y: vy }, true);
}

test('all four distinct sectors are configured', () => {
  assert.deepEqual(STAGES.map(s => s.mode), ['classic', 'double', 'cavity', 'progressive']);
});
test('fresh expedition begins with five serves', () => {
  const g = fresh();
  assert.equal(g.state, 'serve');
  assert.equal(g.lives, 5);
  assert.equal(g.bricks.filter(b => b.alive).length, 60);
  assert.equal(g.hasUpper(), false);
});
test('launch creates one moving physics ball and cannot double serve', () => {
  const g = fresh();
  assert.equal(g.launch(), true);
  assert.equal(g.state, 'playing');
  assert.equal(g.balls.length, 1);
  assert(g.balls[0].body.linvel().y > 0);
  assert.equal(g.launch(), false);
  assert.equal(g.balls.length, 1);
});
test('normal ball collision destroys a brick and awards score and charge', () => {
  const g = fresh(); g.launch();
  const brick = g.bricks.at(-1);
  place(g.balls[0], brick.x, brick.y - .7, 0, DEFAULTS.ballSpeed);
  run(g, .14);
  assert.equal(brick.alive, false);
  assert.equal(g.stats.bricks, 1);
  assert(g.score > 0); assert(g.charge > 0);
});
test('a removed brick cannot score twice', () => {
  const g = fresh();
  const brick = g.bricks[0];
  g.killBrick(brick); const score = g.score;
  g.killBrick(brick);
  assert.equal(g.score, score); assert.equal(g.stats.bricks, 1);
});
test('left paddle contact aims left and returns upward', () => {
  const g = fresh(); g.launch();
  place(g.balls[0], -.68, -5.15, 0, -DEFAULTS.ballSpeed);
  run(g, .12, { x: 0 });
  assert(g.balls[0].body.linvel().x < -2);
  assert(g.balls[0].body.linvel().y > 0);
  assert.equal(g.stats.returns, 1);
});
test('right paddle contact aims right and returns upward', () => {
  const g = fresh(); g.launch();
  place(g.balls[0], .68, -5.15, 0, -DEFAULTS.ballSpeed);
  run(g, .12, { x: 0 });
  assert(g.balls[0].body.linvel().x > 2);
  assert(g.balls[0].body.linvel().y > 0);
});
test('paddle movement respects speed and arena boundaries', () => {
  const g = fresh();
  run(g, 1 / 120, { x: 100 });
  assert(g.paddles[0] <= DEFAULTS.paddleSpeed / 120 + 1e-8);
  run(g, 1, { x: 100 });
  assert(g.paddles[0] <= 6 - g.width() / 2);
});
test('roof contact shrinks paddle and signals the event', () => {
  const g = fresh(); g.launch();
  const original = g.width();
  place(g.balls[0], 0, 6.45, 0, 8);
  run(g, .15);
  assert.equal(g.shrunk, true); assert(g.width() < original);
  assert.equal(g.stats.roof, 1);
  assert(g.drain().some(e => e.type === 'roof'));
});
test('classic sector has no invisible upper paddle collisions', () => {
  const g = fresh(); g.launch();
  place(g.balls[0], 0, -5.15, 0, 7.8);
  run(g, .13, { x: 0 });
  assert.equal(g.stats.returns, 0);
  assert(g.balls[0].body.translation().y > -4.3);
});
test('double sector supplies two paddles and two live balls', () => {
  const g = fresh(1); g.launch();
  assert.equal(g.hasUpper(), true);
  assert.equal(g.paddleColliders[1].isEnabled(), true);
  assert.equal(g.balls.filter(b => !b.captive).length, 2);
});
test('one lost multiball does not consume a serve', () => {
  const g = fresh(1); g.launch();
  place(g.balls[0], 0, -8, 0, -8);
  run(g, .02);
  assert.equal(g.balls.length, 1); assert.equal(g.lives, 5);
  assert.equal(g.state, 'playing');
});
test('cavity echoes remain trapped without a launched signal', () => {
  const g = fresh(2);
  run(g, 8);
  assert.equal(g.balls.length, 2);
  assert(g.balls.every(b => b.captive));
  assert.equal(g.stats.bricks, 0);
  assert.equal(g.stats.rescues, 0);
  assert.equal(g.score, 0);
  assert.equal(g.state, 'serve');
});
test('opening a cavity permits its captive ball to escape and join play', () => {
  const g = fresh(2); g.launch();
  const ball = g.balls.find(b => b.captive && b.body.translation().x < 0);
  for (const brick of g.bricks.filter(b => b.col === 1 || b.col === 2)) {
    brick.alive = false; g.hitMap.delete(brick.collider.handle); g.world.removeCollider(brick.collider, true);
  }
  place(ball, -3.48, 4.22, 0, -4.1);
  run(g, .45);
  assert.equal(ball.captive, false);
  assert(g.stats.rescues >= 1);
  assert(g.drain().some(e => e.type === 'rescue'));
});
test('pulse requires full charge then expands paddle and reverses danger', () => {
  const g = fresh(); g.launch();
  assert.equal(g.pulse(), false);
  place(g.balls[0], 3, -2, 2, -6);
  g.charge = 1; const before = g.width();
  assert.equal(g.pulse(), true);
  assert.equal(g.charge, 0); assert.equal(g.stats.pulses, 1);
  assert(g.width() > before); assert(g.balls[0].body.linvel().y > 0);
  assert.equal(g.pulse(), false);
});
test('pulse expires and restores normal paddle dimensions', () => {
  const g = fresh(); g.launch(); g.charge = 1; g.pulse();
  for (const ball of [...g.balls]) g.removeBall(ball);
  g.state = 'serve'; run(g, 2.3);
  assert.equal(g.width(), DEFAULTS.paddleWidth);
});
test('last-ball loss consumes exactly one serve and restores paddle', () => {
  const g = fresh(); g.launch(); g.shrunk = true; g.updatePaddleShape();
  place(g.balls[0], 0, -8, 0, -8); run(g, .02);
  assert.equal(g.lives, 4); assert.equal(g.state, 'serve');
  assert.equal(g.shrunk, false); assert.equal(g.width(), DEFAULTS.paddleWidth);
  run(g, .1); assert.equal(g.lives, 4);
});
test('five missed serves end the expedition', () => {
  const g = fresh();
  for (let i = 0; i < 5; i++) {
    g.launch();
    for (const ball of g.balls) place(ball, 0, -8, 0, -8);
    run(g, .02);
  }
  assert.equal(g.lives, 0); assert.equal(g.state, 'lost');
  assert(g.drain().some(e => e.type === 'lost'));
});
test('infinite mode preserves lives after a miss', () => {
  const g = fresh(); g.infinite = true; g.launch();
  place(g.balls[0], 0, -8, 0, -8); run(g, .02);
  assert.equal(g.lives, 5); assert.equal(g.state, 'serve');
});
test('progressive sector advances collider and visible brick together', () => {
  const g = fresh(3); g.launch();
  const brick = g.bricks[0], before = brick.y;
  run(g, .25);
  assert(brick.y < before); assert(g.descended > 0);
  assert(Math.abs(brick.collider.translation().y - brick.y) < .00001);
});
test('descending wall reaching the danger line ends normal play', () => {
  const g = fresh(3); g.launch();
  const brick = g.bricks.at(-1);
  brick.y = -3.849; brick.collider.setTranslation({ x: brick.x, y: brick.y });
  run(g, .02);
  assert.equal(g.state, 'lost');
  assert(g.drain().some(e => e.type === 'lost' && e.reason));
});
test('co-op enables independently driven upper paddle in classic sector', () => {
  const g = fresh(0, { coop: true });
  assert.equal(g.hasUpper(), true);
  run(g, .4, { x: -3, x2: 3 });
  assert(g.paddles[0] < -2.9); assert(g.paddles[1] > 2.9);
});
test('live tuning changes launch speed and paddle collider width', () => {
  const g = fresh();
  g.tuning.ballSpeed = 11; g.tuning.paddleWidth = 3;
  g.updatePaddleShape(); g.launch();
  assert.equal(g.width(), 3);
  assert(Math.abs(Math.hypot(...Object.values(g.balls[0].body.linvel())) - 11) < .02);
});
test('fixed stepping is deterministic across 60 Hz and 120 Hz frames', () => {
  const a = fresh(), b = fresh(); a.launch(); b.launch();
  for (let i = 0; i < 120; i++) a.update(1 / 60, { x: 1 });
  for (let i = 0; i < 240; i++) b.update(1 / 120, { x: 1 });
  assert.deepEqual(a.snapshot().balls, b.snapshot().balls);
  assert.deepEqual(a.snapshot().paddles, b.snapshot().paddles);
  assert.equal(a.score, b.score);
});
test('large suspended frame cannot advance an unbounded simulation', () => {
  const g = fresh(); const before = g.time;
  g.update(100, {});
  assert(g.time - before < .09);
});
test('natural AI playthrough clears every campaign sector and rescues both echoes', () => {
  const g = fresh(); g.autoplay = true; g.infinite = true;
  const cleared = [];
  for (let tick = 0; tick < 120 * 600 && g.state !== 'won'; tick++) {
    g.update(1 / 120, {});
    if (g.charge >= 1) g.pulse();
    if (tick % 120 === 0) {
      assert(g.balls.every(ball => {
        const p = ball.body.translation(), v = ball.body.linvel();
        return [p.x, p.y, v.x, v.y].every(Number.isFinite);
      }));
    }
    if (g.state === 'cleared') { cleared.push(g.stage); g.advance(); }
  }
  assert.equal(g.state, 'won', `stalled in sector ${g.stage} with ${g.bricks.filter(b => b.alive).length} bricks`);
  assert.deepEqual(cleared, [0, 1, 2, 3]);
  assert.equal(g.stats.completed, 4);
  assert.equal(g.stats.bricks, 272);
  assert.equal(g.stats.rescues, 2);
  assert(g.stats.returns > 40); assert(g.stats.roof > 0); assert(g.stats.pulses > 0);
  assert(g.score > 10000);
});
console.log(`${count - failures}/${count} core tests passed${failures ? `; ${failures} failed` : ''}`);
if (failures) process.exitCode = 1;
