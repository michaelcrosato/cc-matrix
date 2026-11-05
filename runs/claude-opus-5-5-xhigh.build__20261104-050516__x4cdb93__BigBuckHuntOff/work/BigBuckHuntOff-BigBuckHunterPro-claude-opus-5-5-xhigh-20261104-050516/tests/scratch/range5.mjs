import { load } from '../lib/load.mjs';
const L = load({}), X = L.game.debug.internals, D = L.game.debug; L.step(1);
X.startHunt({ mode: 'range', hunt: 'range', seed: 3 }); L.step(.6); const H = X.G.hunt; D.bot(true, { skill: 'expert', cheat: true });
for (let t = 0; t < 22; t += 1) L.step(1);
const B = H.bonus, T = B.targets.find(T => T.alive), p = H.players[0];
console.log('target', T.kind, Math.round(T.x / 16), Math.round(T.y / 16), (T.z / 16).toFixed(1), 'cam', Math.round(H.cam.x / 16), Math.round(H.cam.y / 16), (H.cam.z / 16).toFixed(1));
const zs = T.zones(T); for (const z of zs) { const q = H.lens.project(z.a[0], z.a[1], z.a[2]); const ray = H.lens.ray(q[0], q[1]); const tt = z.b ? X.rayCapsule(ray, ray, z.a, z.b, z.r) : X.raySphere(ray, ray, z.a, z.r); const R = X.resolveRay(H, ray, { maxT: tt }); console.log(z.id, 'screen', q[0].toFixed(1), q[1].toFixed(1), 't', tt && tt.toFixed(0), 'world says', R.kind, R.t.toFixed(0), R.prop && R.prop.id); }
console.log('reticle', p.rx.toFixed(1), p.ry.toFixed(1), 'aim', p.aimPoint().map(v => v.toFixed(1)), 'scope', p.scope.up);
