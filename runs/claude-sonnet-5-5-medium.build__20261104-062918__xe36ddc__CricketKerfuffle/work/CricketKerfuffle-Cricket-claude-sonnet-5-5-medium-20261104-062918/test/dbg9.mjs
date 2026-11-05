import { G } from './sim.mjs';
const { newBall, stepBall, solveDelivery, T, DELIVERIES } = G;
for (const type of ['pace', 'swing', 'spin']) for (const ty of [380, 410, 440, 480, 520]) {
  const d = DELIVERIES[type], b = newBall(); b.phase = 'delivery'; b.groundBounce = 1; b.x = 448; b.y = 642; b.z = 36;
  const s = solveDelivery(448, 642, 36, 448, ty, d.sp); Object.assign(b, { vx: s.vx, vy: s.vy, vz: s.vz, bounceMul: d.bounce * (ty > 500 ? 1.9 : 1) * (ty < 392 ? .9 : 1) });
  let zPlane = null, zStump = null, k = 0; while (b.y > 320 && k++ < 3000) { stepBall(b, 1 / 120); if (zPlane === null && b.y <= 364) zPlane = b.z; if (zStump === null && b.y <= 330) zStump = b.z; }
  console.log(type, ty, 'z@bat', zPlane && zPlane.toFixed(1), 'z@stumps', zStump && zStump.toFixed(1));
}
