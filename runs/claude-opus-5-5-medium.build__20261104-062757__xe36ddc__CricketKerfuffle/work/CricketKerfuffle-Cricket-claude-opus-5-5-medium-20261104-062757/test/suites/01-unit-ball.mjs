// 5.1: ball physics and the predictor
export default ({ boot, suite }) => {
  const s = suite(), { D } = boot();
  const env = { bounce: 1, turn: 1, seam: 1, outfield: 1 };
  const R = D.E.rng(11); let worst = 0;
  for (let k = 0; k < 50; k++) {
    const tx = (R() * 2 - 1) * 20, ty = 30 + R() * 180, kmh = 80 + R() * 70, b = D.newBall(), sol = D.solveDelivery(8, 300, 34, tx, ty, D.kmhToU(kmh));
    Object.assign(b, { x: 8, y: 300, z: 34, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'delivery' });
    for (let t = 0; t < 4 && !b.pitched; t += 1 / 120) D.stepBall(b, 1 / 120, env);
    worst = Math.max(worst, Math.hypot(b.pitchX - tx, b.pitchY - ty));
  }
  s.ok('50 solved deliveries pitch within 1 unit of the target', worst < 1, 'worst ' + worst.toFixed(2));
  const land = (swingX, turnRad, until = 'pitch') => { const b = D.newBall(), sol = D.solveDelivery(8, 300, 34, 0, 80, D.kmhToU(130)); Object.assign(b, { x: 8, y: 300, z: 34, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'delivery', swingX, turnRad }); for (let t = 0; t < 4; t += 1 / 120) { D.stepBall(b, 1 / 120, env); if (until === 'pitch' ? b.pitched : b.y < 10) break; } return b; };
  const plain = land(0, 0);
  s.ok('an outswinger to a right-hander lands on the off side (-x)', land(-90, 0).pitchX < plain.pitchX - 1);
  s.ok('an inswinger lands on the leg side (+x)', land(90, 0).pitchX > plain.pitchX + 1);
  const turnB = land(0, -9 * Math.PI / 180, 'bat'), noTurn = land(0, 0, 'bat');
  s.ok('a leg break turns toward -x for a right-hander', turnB.x < noTurn.x - 3, [turnB.x, noTurn.x]);
  const b = D.newBall(); Object.assign(b, { x: 0, y: 100, z: 20, vx: 120, vy: -200, vz: 140, phase: 'hit' });
  const pr = D.predict(b, 3, env); const c = Object.assign(D.newBall(), b); let t = 0, maxd = 0, k = 1;
  while (t < 2.99 && k < pr.length) { D.stepBall(c, 1 / 120, env); t += 1 / 120; const q = pr[k++]; maxd = Math.max(maxd, Math.hypot(q.x - c.x, q.y - c.y, q.z - c.z)); }
  s.ok('the predictor matches the stepped simulation within 0.01 units over 3 s', maxd < .01, maxd);
  const r = D.newBall(); Object.assign(r, { x: 0, y: 0, z: 0, vx: 300, vy: 0, vz: 0, phase: 'rolling', rollK: .55 });
  for (let i = 0; i < 120 * 30; i++) D.stepBall(r, 1 / 120, env);
  s.ok('a rolling ball stops', r.stopped && r.vx === 0, r.vx);
  const d = D.newBall(); Object.assign(d, { x: 0, y: 500, z: 50, vx: 0, vy: 0, vz: 0, phase: 'hit' }); const peaks = []; let up = false, top = 0;
  for (let i = 0; i < 120 * 6; i++) { D.stepBall(d, 1 / 120, env); if (d.vz > 0) { up = true; top = Math.max(top, d.z); } else if (up) { peaks.push(top); up = false; top = 0; } }
  s.ok('a ball dropped from z 50 bounces lower each time', peaks.length >= 1 && peaks.every((p, i) => i === 0 ? p < 50 : p < peaks[i - 1]), peaks);
};
