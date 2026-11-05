import { load } from '../lib/load.mjs';
export default function (t) {
  const { G } = load({ noBoot: false });
  const B = G.Ball, C = G.C;
  // closed form against a stepped integration
  const L = B.make(0, [260, 230, 20], [120, 10, 90], { k: .12, g: 330 });
  let p = [260, 230, 20], v = [120, 10, 90], worst = 0;
  for (let i = 1; i <= 360; i++) { const dt = 1 / 120; for (let s = 0; s < 4; s++) { const h = dt / 4, f = (pp, vv) => [vv, [-.12 * vv[0], -.12 * vv[1], -.12 * vv[2] - 330]], ad = (a, b, k) => a.map((x, i) => x + b[i] * k); const [k1p, k1v] = f(p, v), [k2p, k2v] = f(ad(p, k1p, h / 2), ad(v, k1v, h / 2)), [k3p, k3v] = f(ad(p, k2p, h / 2), ad(v, k2v, h / 2)), [k4p, k4v] = f(ad(p, k3p, h), ad(v, k3v, h)); p = p.map((x, i) => x + h / 6 * (k1p[i] + 2 * k2p[i] + 2 * k3p[i] + k4p[i])); v = v.map((x, i) => x + h / 6 * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i])); }; const q = B.at(L, i * dt); worst = Math.max(worst, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])); }
  t.ok('closed form matches integration within .01 over 3 s', worst < .01, worst.toFixed(4));
  for (const T of [.6, 1, 1.4]) { const from = [250, 200, 30], to = [420, 270, 0], vv = B.aim(from, to, T), L2 = B.make(0, from, vv), q = B.at(L2, T); t.ok('aim lands within .5 at T=' + T, Math.hypot(q[0] - to[0], q[1] - to[1], q[2] - to[2]) < .5); }
  const L3 = B.make(0, [300, 240, 18], B.aim([300, 240, 18], [330, 240, 40], 1.05)), th = B.timeAtHeight(L3, 40);
  t.ok('timeAtHeight finds the descent', Math.abs(th - 1.05) < .01, th);
  const mk = (z, y = C.CY) => { const from = [300, y, z], to = [400, y, 0]; return B.make(0, from, [200, 0, 0], { k: .0001, g: 0.0001 }); };
  const at = (z, y) => { const L4 = B.make(0, [300, y === undefined ? C.CY : y, z], [200, 0, 0], { k: .0001, g: .001 }); return B.netClass(L4); };
  t.ok('clear over the net', at(60) === 'clear'); t.ok('the tape', at(C.NET_H) === 'tape'); t.ok('into the net', at(20) === 'net'); t.ok('outside the antenna', at(60, C.Y0 - 10) === 'antenna');
  void mk;
  const landAt = x => { const L5 = B.make(0, [x, C.CY, 40], [0, 0, 0]); return L5.landIn; };
  t.ok('on the line is in', landAt(C.X1 + C.BALL_R - .01)); t.ok('just past the line is out', !landAt(C.X1 + C.BALL_R + .5));
}
