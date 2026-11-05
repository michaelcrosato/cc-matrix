import { load } from '../lib.mjs';
export async function run(check) {
  const { K } = load({ seed: 3 }), B = K.Ball, env = { g: 160, pitchBounce: .55, gb: 1, k: .55, slope: 0 };
  let worst = 0; const r = K.RNG; r.seed(4);
  for (let i = 0; i < 50; i++) {
    const rel = { x: (r.play() - .5) * 16, y: 300, z: 34 }, tx = (r.play() - .5) * 40, ty = 30 + r.play() * 200, v = 150 + r.play() * 300, sol = B.solve(rel, tx, ty, v, env);
    const b = Object.assign(B.make(), rel, sol, { phase: 'delivery' }); for (let k = 0; k < 800 && !b.pitched; k++) B.step(b, 1 / 120, env);
    worst = Math.max(worst, Math.hypot(b.pitchAt[0] - tx, b.pitchAt[1] - ty));
  }
  check('50 solved deliveries without swing pitch within 1 unit of the target', worst < 1, worst);
  const land = swing => { const rel = { x: 0, y: 300, z: 34 }, sol = B.solve(rel, 0, 90, 360, env), b = Object.assign(B.make(), rel, sol, { phase: 'delivery', swingA: -swing * 60 }); for (let k = 0; k < 800 && !b.pitched; k++) B.step(b, 1 / 120, env); return b.pitchAt[0]; };
  check('an outswinger to a right-hander lands on the off side (-x)', land(1) < -1, land(1));
  check('an inswinger lands on the leg side (+x)', land(-1) > 1, land(-1));
  const turn = (() => { const rel = { x: 0, y: 300, z: 34 }, sol = B.solve(rel, 0, 90, 220, env), b = Object.assign(B.make(), rel, sol, { phase: 'delivery', turn: -9 * Math.PI / 180, grip: .16 }); for (let k = 0; k < 900 && b.y > 20; k++) B.step(b, 1 / 120, env); return b.x; })();
  check('a leg break pitched on middle turns toward -x for a right-hander', turn < -2, turn);
  const rel = { x: 0, y: 300, z: 34 }, sol = B.solve(rel, 3, 80, 380, env), b = Object.assign(B.make(), rel, sol, { phase: 'delivery', swingA: 40, wobble: .3 }), pred = B.predict(b, 3, env, 1);
  let maxd = 0; const c = B.copy(b); for (let i = 0; i < pred.length; i++) { B.step(c, 1 / 120, env); maxd = Math.max(maxd, Math.hypot(c.x - pred[i].x, c.y - pred[i].y, c.z - pred[i].z)); }
  check('the predictor matches the stepped simulation within 0.01 units over 3 s', maxd < .01, maxd);
  const roll = Object.assign(B.make(), { phase: 'hit', vx: 300, vy: 0, vz: 0, z: 0, rolling: true }); let t = 0; while (t < 30 && (roll.vx || roll.vy)) { B.step(roll, 1 / 120, env); t += 1 / 120; }
  check('rolling balls stop', roll.vx === 0 && roll.vy === 0, t);
  const drop = Object.assign(B.make(), { phase: 'hit', z: 50, carried: true }); const peaks = []; let up = false, last = 50;
  for (let i = 0; i < 1200; i++) { B.step(drop, 1 / 120, env); if (drop.vz > 0) up = true; if (up && drop.vz <= 0) { peaks.push(drop.z); up = false; } last = drop.z; }
  check('a ball dropped from z = 50 bounces lower each time', peaks.length >= 2 && peaks.every((p, i) => i === 0 ? p < 50 : p < peaks[i - 1]), peaks.map(p => p.toFixed(1)).join(','));
  void last;
}
