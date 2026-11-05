import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + '#hunt/hollow/1'); await p.waitForTimeout(3000);
const url = await p.evaluate(async () => {
  const g = My3D2dge.current, E = My3D2dge, X = g.debug.internals, H = g.debug.hunt(); for (let i = 0; i < 40 && !(H.seg && H.seg.kind === 'site'); i++) await new Promise(r => setTimeout(r, 100));
  const a = H.site.spawn('buck', { at: [-20, 30], orders: [['hold']], hidden: false, points: 9 }); a.appear(); a.orders = [['graze', { secs: 99 }]]; a.nextOrder(); { const L0 = H.lens; a.heading = Math.atan2(a.y - L0.y, a.x - L0.x) + 120 * Math.PI / 180; a.faceTo = a.heading; a.rig.facing = a.heading; }
  for (const o of H.actors) if (o !== a) o.state = 'gone'; for (const pr of H.world.props) pr.hide = true;
  await new Promise(r => setTimeout(r, 500)); H.setupLens(); const L = H.lens, W = H.W, Ht = H.H;
  const it = a.item(), q = L.project(it.x, it.y, it.z), k = q[2] * it.scale, dx = it.x - L.x, dy = it.y - L.y, yaw = -Math.atan2(dy, dx) * 180 / Math.PI - 90, pit = Math.atan2(L.z - it.z - it.box[1] * .45, Math.hypot(dx, dy)) * 180 / Math.PI;
  const view = E.vistaView(k, yaw, Math.max(0, pit)), cv = document.createElement('canvas'); cv.width = W; cv.height = Ht; const cg = cv.getContext('2d', { willReadFrequently: true });
  const ant = a.rig.antlers; a.rig.antlers = null; a.rig.draw(cg, Math.round(q[0]), Math.round(q[1]), view); a.rig.antlers = ant;
  const img = cg.getImageData(0, 0, W, Ht), d = img.data;
  const inM = (x, y) => x >= 0 && y >= 0 && x < W && y < Ht && d[(y * W + x) * 4 + 3] >= 100;
  const orig = new Uint8ClampedArray(d); const m0 = (x, y) => x >= 0 && y >= 0 && x < W && y < Ht && orig[(y * W + x) * 4 + 3] >= 100;
  for (let y = 0; y < Ht; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (!m0(x, y)) { let near = false; for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (m0(x + ox, y + oy)) near = true; if (near) { const ray = L.ray(x + .5, y + .5), R = X.resolveRay(H, ray); if (R.actor === a) { d[i] = 80; d[i + 1] = 140; d[i + 2] = 255; d[i + 3] = 255; } } continue; } const ray = L.ray(x + .5, y + .5), R = X.resolveRay(H, ray); if (R.actor === a) { d[i] = 60; d[i + 1] = 200; d[i + 2] = 60; } else { d[i] = 255; d[i + 1] = 0; d[i + 2] = 0; } d[i + 3] = 255; }
  // the zones' outlines
  cg.putImageData(img, 0, 0);
  const x0 = Math.max(0, Math.round(q[0]) - 70), y0 = Math.max(0, Math.round(q[1]) - 90), c2 = document.createElement('canvas'); c2.width = 140 * 4; c2.height = 100 * 4; const g2 = c2.getContext('2d'); g2.imageSmoothingEnabled = false; g2.fillStyle = '#123'; g2.fillRect(0, 0, c2.width, c2.height); g2.drawImage(cv, x0, y0, 140, 100, 0, 0, 560, 400);
  const legs = a.rig.legPts.map(lp => { const dz = (v) => [Math.round(q[0]) + view.ax * v[0] + view.ay * v[1], Math.round(q[1]) + view.bx * v[0] + view.by * v[1] + view.bz * v[2]].map(n => n.toFixed(1)).join(','); const S2 = X.T('animalScale'); const zz = v => { const P = L.project(a.rig.x + v[0] * S2, a.rig.y + v[1] * S2, a.rig.z + v[2] * S2); return P[0].toFixed(1) + ',' + P[1].toFixed(1); }; return 'knee drawn ' + dz(lp.knee) + ' zone ' + zz(lp.knee) + ' | hoof drawn ' + dz(lp.hoof) + ' zone ' + zz(lp.hoof); });
  const lp = a.rig.legPts[2], S2 = X.T('animalScale'), wpt = v => [a.rig.x + v[0] * S2, a.rig.y + v[1] * S2, a.rig.z + v[2] * S2], mid = wpt([(lp.knee[0] + lp.fet[0]) / 2, (lp.knee[1] + lp.fet[1]) / 2, (lp.knee[2] + lp.fet[2]) / 2]), mq = L.project(mid[0], mid[1], mid[2]), ray = L.ray(mq[0], mq[1]);
  const zs = a.zones().filter(z => z.id === 'leg'), res = zs.map(z => [z.r.toFixed(2), X.rayCapsule(ray, ray, z.a, z.b, z.r + 1)]), R = X.resolveRay(H, ray);
  const Dd = (a.x - ray.x) * H.lens.Fx + (a.y - ray.y) * H.lens.Fy, padd = .7 * Math.max(1, Dd) / H.lens.f, sz2 = X.T('animalScale'), rad2 = Math.max(a.rig.length || 8, a.rig.height || 8) * .75 * sz2 + 8, cz2 = a.z + (a.rig.height || 8) * .5 * sz2;
  legs.push('D ' + Dd.toFixed(1) + ' pad ' + padd.toFixed(3) + ' bsph ' + X.raySphere(ray, ray, [a.x, a.y, cz2], rad2) + ' zones ' + JSON.stringify(X.rayZones(ray, ray, a.zones(), padd)));
  { const hf = H.world.hf, tw = hf.rayHit(ray, ray, 2600 * X.M, true), tg = hf.rayHit(ray, ray, 2600 * X.M, false), hp = [ray.x + ray.dx * tw, ray.y + ray.dy * tw]; legs.push('tw ' + tw + ' tg ' + tg + ' waterAt ' + (hf.waterAt ? hf.waterAt(a.x, a.y) : '?') + ' hAt ' + H.world.height(a.x, a.y) + ' a.z ' + a.z + ' hitpt ' + hp.map(v => v.toFixed(1)) + ' a ' + a.x.toFixed(1) + ',' + a.y.toFixed(1)); }
  legs.push('mid ray -> ' + (R.actor === a ? 'HIT ' + R.zone : R.kind) + ' caps: ' + JSON.stringify(res.slice(8, 12)));
  return c2.toDataURL() + '#' + JSON.stringify(legs);
});
const fs = await import('node:fs'); const [u, legs] = url.split('#'); console.log(legs); fs.writeFileSync('tests/out/pick-debug.png', Buffer.from(u.split(',')[1], 'base64')); await b.close();
