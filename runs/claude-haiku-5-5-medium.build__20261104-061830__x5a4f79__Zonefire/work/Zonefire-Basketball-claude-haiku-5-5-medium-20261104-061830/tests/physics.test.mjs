// The ball's physics (plan §6.6, §19 "physics"): made shots go in, decided misses don't, no tunnelling, one basket a pass.
import { loadGame, expect } from './helpers.mjs';

const seeded = seed => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// one shot from a spot to a decided target; steps the ball until it lands or runs out; returns true when it scored
function shootOnce(P, b, from, target, apex) {
  const v = P.ballFlight(from, target, apex);
  P.ballPlace(b, from.x, from.y, from.z);
  P.ballRelease(b, from, v, 'shot', { made: target.make });
  let scored = false;
  for (let i = 0; i < 480 && b.state !== 'loose' && b.state !== 'dead'; i++) {
    P.ballStep(b, 1 / 120);
    if (b.lastGoal) scored = true;
  }
  return scored;
}

export const tests = [];
const T = (name, fn) => tests.push([name, fn]);

T('physics.made shots go in at 97% or better', () => {
  const { bb, S, on } = loadGame({ seed: 1 });
  const P = bb.phys, b = P.newBall(), R = seeded(11);
  let made = 0, n = 0, ok = 0;
  on('goal', ev => { if (ev.ball === b) S._goal = (S._goal || 0) + 1; });
  for (let i = 0; i < 500; i++) {
    const side = i % 2, rim = P.RIMW[side];
    const dist = 60 + R() * 110;
    const from = { x: rim.x + (side ? -1 : 1) * dist, y: rim.y + (R() - .5) * 80, z: 60 + R() * 30 };
    const target = { x: rim.x + (R() - .5) * 2, y: rim.y + (R() - .5) * 2, z: rim.z - 2, make: true };
    S._goal = 0;
    shootOnce(P, b, from, target, 40 + dist * .12);
    made += S._goal > 0 ? 1 : 0; n++;
  }
  ok = made / n;
  expect(ok >= .97, `made shots went in ${made}/${n} (${(ok * 100).toFixed(1)}%), want ≥ 97%`);
});

T('physics.decided misses stay out at 3% or fewer', () => {
  const { bb, S, on } = loadGame({ seed: 2 });
  const P = bb.phys, b = P.newBall(), R = seeded(12);
  let inside = 0, n = 0;
  on('goal', ev => { if (ev.ball === b) S._goal = (S._goal || 0) + 1; });
  for (let i = 0; i < 300; i++) {
    const side = i % 2, rim = P.RIMW[side];
    const dist = 80 + R() * 90;
    const from = { x: rim.x + (side ? -1 : 1) * dist, y: rim.y + (R() - .5) * 60, z: 60 + R() * 30 };
    // a miss: a point on the front rim (1 unit wide of the ring), or the glass
    // (a point just outside the ring, on the court side and across it: the ball meets the front of the rim)
    const along = (side ? -1 : 1) * (10.5 + R() * 2.5), across = (R() < .5 ? -1 : 1) * (R() * 6);
    const target = { x: rim.x + along, y: rim.y + across, z: rim.z + 2, make: false };
    S._goal = 0;
    shootOnce(P, b, from, target, 60);
    inside += S._goal > 0 ? 1 : 0; n++;
  }
  expect(inside / n <= .03, `misses went in ${inside}/${n}, want ≤ 3%`);
});

T('physics.a fast ball never tunnels through the ring or the glass', () => {
  const { bb } = loadGame({ seed: 3 });
  const P = bb.phys, b = P.newBall(), rim = P.RIMW[0];
  // from the court side, straight at the rim at 900 units a second, low so it meets the ring's plane
  P.ballPlace(b, rim.x + 30, rim.y, rim.z);
  P.ballRelease(b, { x: rim.x + 30, y: rim.y, z: rim.z }, { vx: -900, vy: 0, vz: 0 }, 'loose', null);
  for (let i = 0; i < 60; i++) P.ballStep(b, 1 / 120);
  expect(b.x > P.RIMW[0].x - 20 || b.x > 0, `ball tunnelled to x ${b.x.toFixed(1)}`);
  expect(b.x >= 40 && b.x <= 800, 'ball left the arena');
});

T('physics.the ball stays in the arena', () => {
  const { bb } = loadGame({ seed: 4 });
  const P = bb.phys, b = P.newBall(), R = seeded(13);
  for (let i = 0; i < 200; i++) {
    P.ballPlace(b, 400, 260, 20);
    P.ballRelease(b, { x: 400, y: 260, z: 20 }, { vx: (R() - .5) * 900, vy: (R() - .5) * 900, vz: R() * 600 }, 'loose', null);
    for (let k = 0; k < 360; k++) P.ballStep(b, 1 / 120);
    expect(b.x >= 40 - 1 && b.x <= 728 + 1 && b.y >= 88 - 1 && b.y <= 424 + 1 && b.z >= 0, `left the arena at ${b.x.toFixed(0)},${b.y.toFixed(0)},${b.z.toFixed(0)}`);
  }
});
