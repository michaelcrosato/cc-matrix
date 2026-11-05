import { load } from '../lib/load.mjs';
export default async t => {
  const { G } = load(); const B = G.Ball;
  const L = B.make(0, [200, 190, 20], [120, 10, 160]);
  // closed form against a stepped integration
  let p = [200, 190, 20], v = [120, 10, 160], worst = 0; const k = L.k, g = L.g, dt = 1 / 20000;
  for (let i = 1; i <= 3 * 20000; i++) { v = [v[0] - k * v[0] * dt, v[1] - k * v[1] * dt, v[2] - (k * v[2] + g) * dt]; p = [p[0] + v[0] * dt, p[1] + v[1] * dt, p[2] + v[2] * dt]; if (i % 2000 === 0) { const q = B.at(L, i * dt); worst = Math.max(worst, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])); } }
  t('closed form matches integration', worst < .2, worst);
  const from = [250, 180, 18], to = [330, 210, 40], vv = B.aim(from, to, 1.05), L2 = B.make(0, from, vv), q = B.at(L2, 1.05);
  t('aim reaches its target', Math.hypot(q[0] - to[0], q[1] - to[1], q[2] - to[2]) < .5);
  const th = B.timeAtHeight(L2, 40); t('timeAtHeight on the way down', th !== null && Math.abs(B.at(L2, th)[2] - 40) < .05 && th > B.apexTau(L2));
  const C = G.COURT;
  const clear = B.make(0, [300, C.CY, 60], B.aim([300, C.CY, 60], [420, C.CY, 3.5], 1)); t('a high ball clears the net', B.netCheck(clear).kind === 'clear');
  const low = B.make(0, [300, C.CY, 20], [200, 0, 10]); t('a low ball hits the net', B.netCheck(low).kind === 'net');
  const wide = B.make(0, [300, C.CY + 80, 60], [150, 0, 60]); t('outside the antennae', B.netCheck(wide).kind === 'outside');
  t('on the line is in', B.inCourt([C.X0 - 3, C.CY, 0]) && !B.inCourt([C.X0 - 5, C.CY, 0]));
};
