import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + '#hunt/hollow/1'); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const g = My3D2dge.current, E = My3D2dge, X = g.debug.internals, H = g.debug.hunt(); for (let i = 0; i < 40 && !(H.seg && H.seg.kind === 'site'); i++) await new Promise(r => setTimeout(r, 100));
  const a = H.site.spawn('buck', { at: [0, 30], orders: [['hold']], hidden: false, points: 9 }); a.appear(); a.orders = [['graze', { secs: 99 }]]; a.nextOrder();
  await new Promise(r => setTimeout(r, 400)); H.setupLens(); const L = H.lens;
  const it = a.item(), q = L.project(it.x, it.y, it.z), k = q[2] * it.scale, dx = it.x - L.x, dy = it.y - L.y, yaw = -Math.atan2(dy, dx) * 180 / Math.PI - 90, pit = Math.atan2(L.z - it.z - it.box[1] * .45, Math.hypot(dx, dy)) * 180 / Math.PI;
  const view = E.vistaView(k, yaw, Math.max(0, pit)), cv = document.createElement('canvas'); cv.width = H.W; cv.height = H.H; const cg = cv.getContext('2d', { willReadFrequently: true });
  a.rig.draw(cg, Math.round(q[0]), Math.round(q[1]), view); const d = cg.getImageData(0, 0, H.W, H.H).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < H.H; y++) for (let x = 0; x < H.W; x++) if (d[(y * H.W + x) * 4 + 3] > 100) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const z = a.zones(), hz = z.find(v => v.id === 'heart'), hq = L.project(hz.a[0], hz.a[1], hz.a[2]);
  let zx0 = 1e9, zx1 = -1e9, zy0 = 1e9, zy1 = -1e9; for (const v of z) for (const P of [v.a, v.b].filter(Boolean)) { const qq = L.project(P[0], P[1], P[2]); zx0 = Math.min(zx0, qq[0]); zx1 = Math.max(zx1, qq[0]); zy0 = Math.min(zy0, qq[1]); zy1 = Math.max(zy1, qq[1]); }

  const T2 = g.debug.internals.T('animalScale'); const jw = a.rig.J.withers, jq2 = L.project(a.rig.x + jw[0] * T2, a.rig.y + jw[1] * T2, a.rig.z + jw[2] * T2); const vw = [Math.round(q[0]) + view.ax * jw[0] + view.ay * jw[1], Math.round(q[1]) + view.bx * jw[0] + view.by * jw[1] + view.bz * jw[2]];
  const odd = []; for (const v of z) for (const P of [v.a, v.b].filter(Boolean)) { const qq = L.project(P[0], P[1], P[2]); if (qq[0] < 480) odd.push(v.id + ':' + v.kind + ':' + Math.round(qq[0])); } const legs = a.rig.legPts.map(lp => ['top', 'mid', 'knee', 'fet', 'hoof'].map(k => lp[k].map(Math.round).join(',')).join(' | '));
  return { odd, legs, withersZone: jq2.slice(0, 2).map(Math.round), withersDrawn: vw.map(Math.round), zbox: [zx0, zy0, zx1, zy1].map(Math.round), root: q.slice(0, 2).map(Math.round), k: k.toFixed(2), mask: [x0, y0, x1, y1], heart: hq.slice(0, 2).map(Math.round), rigXY: [a.rig.x - a.x, a.rig.y - a.y, a.rig.z - a.z], W: H.W, H: H.H, cam: [L.x, L.y, L.z].map(Math.round), actor: [a.x, a.y, a.z].map(Math.round) };
});
console.log(JSON.stringify(r)); await b.close();
