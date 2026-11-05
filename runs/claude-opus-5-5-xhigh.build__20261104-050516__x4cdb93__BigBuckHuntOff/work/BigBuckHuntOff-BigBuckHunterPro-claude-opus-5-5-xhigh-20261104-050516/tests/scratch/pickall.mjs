// every animal in the pick check, zoomed: green = drawn and hit, red = drawn and missed, blue = 1-3 px outside and hit
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + '#hunt/hollow/1'); await p.waitForTimeout(3000);
const url = await p.evaluate(async () => {
  const g = My3D2dge.current, E = My3D2dge, X = g.debug.internals, H = g.debug.hunt(); for (let i = 0; i < 40 && !(H.seg && H.seg.kind === 'site'); i++) await new Promise(r => setTimeout(r, 100));
  const S = H.site; for (const [bb, d, kind] of [[-20, 30, 'buck'], [8, 40, 'doe'], [22, 26, 'buck'], [-6, 50, 'buck']]) { const a = S.spawn(kind, { at: [bb, d], orders: [['hold']], hidden: false, points: 9 }); a.appear(); a.orders = [['graze', { secs: 99 }]]; a.nextOrder(); }
  await new Promise(r => setTimeout(r, 600)); H.setupLens(); const L = H.lens, W = H.W, Ht = H.H; for (const pr of H.world.props) pr.hide = true;
  const out = document.createElement('canvas'); out.width = 560 * 3; out.height = 400 * 2; const go = out.getContext('2d'); go.imageSmoothingEnabled = false; go.fillStyle = '#123'; go.fillRect(0, 0, out.width, out.height);
  let n = 0; const notes = [];
  for (const a of H.actors) {
    if (a.cat !== 'animal' || !a.alive) continue;
    const others = H.actors.filter(o => o !== a && o.alive); for (const o of others) { o._s = o.state; o.state = 'gone'; }
    const it = a.item(), q = L.project(it.x, it.y, it.z); if (!q) { notes.push("NOPROJ " + a.kind + " a " + [a.x, a.y, a.z].map(Math.round) + " rig " + [a.rig.x, a.rig.y, a.rig.z].map(Math.round) + " state " + a.state); for (const o of others) o.state = o._s; continue; } const k = q[2] * it.scale, dx = it.x - L.x, dy = it.y - L.y, yaw = -Math.atan2(dy, dx) * 180 / Math.PI - 90, pit = Math.atan2(L.z - it.z - it.box[1] * .45, Math.hypot(dx, dy)) * 180 / Math.PI;
    const view = E.vistaExactView(E.vistaView(k, yaw, Math.max(0, pit)), L, { sx: q[0], sy: q[1], D: q[3] }, k, it), cv = document.createElement('canvas'); cv.width = W; cv.height = Ht; const cg = cv.getContext('2d', { willReadFrequently: true });
    const ant = a.rig.antlers; a.rig.antlers = null; a.rig.draw(cg, q[0], q[1], view);
    const V = H.world.vista, T0 = V.target(W, Ht, 'p0'), T1 = V.target(W, Ht, 'p1'); V.render(T0, L, []); V.render(T1, L, [it]); a.rig.antlers = ant;
    const wy = V._wadeY(it), img = cg.getImageData(0, 0, W, Ht), d = img.data, o0 = new Uint8ClampedArray(d);
    const m0 = (x, y) => x >= 0 && y >= 0 && x < W && y < Ht && o0[(y * W + x) * 4 + 3] > 100 && y !== wy && T0.buf[y * W + x] !== T1.buf[y * W + x];
    let ins = 0, hit = 0, terr = 0; const kinds = {};
    for (let y = Math.max(0, Math.round(q[1]) - 90); y < Math.min(Ht, Math.round(q[1]) + 10); y++) for (let x = Math.max(0, Math.round(q[0]) - 70); x < Math.min(W, Math.round(q[0]) + 70); x++) {
      const i = (y * W + x) * 4, ray = L.ray(x + .5, y + .5);
      if (!m0(x, y)) { let near = false; for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (m0(x + ox, y + oy)) near = true; d[i + 3] = 0; if (near) { const R = X.resolveRay(H, ray); if (R.actor === a) { d[i] = 80; d[i + 1] = 140; d[i + 2] = 255; d[i + 3] = 255; } } continue; }
      const tg = H.world.hf.rayHit(ray, ray, q[3] * .98); if (tg !== null) { terr++; d[i] = 120; d[i + 1] = 120; d[i + 2] = 120; d[i + 3] = 255; continue; }
      const R = X.resolveRay(H, ray); ins++; if (R.actor === a) { hit++; d[i] = 60; d[i + 1] = 200; d[i + 2] = 60; } else { d[i] = 255; d[i + 1] = 0; d[i + 2] = 0; kinds[R.kind] = (kinds[R.kind] || 0) + 1; if (R.kind === 'ground' && notes.length < 0) { const Dr = (a.x - ray.x) * L.Fx + (a.y - ray.y) * L.Fy, zh = X.rayZones(ray, ray, a.zones(), .7 * Dr / L.f); let best = 1e9, bz = null; for (const z of a.zones()) { if (z.kind === 'ell') continue; const A = L.project(...z.a), B = L.project(...(z.b || z.a)); const vx = B[0] - A[0], vy = B[1] - A[1], l2 = vx * vx + vy * vy, u = l2 ? Math.max(0, Math.min(1, ((x + .5 - A[0]) * vx + (y + .5 - A[1]) * vy) / l2)) : 0, dd = Math.hypot(A[0] + vx * u - x - .5, A[1] + vy * u - y - .5) - z.r * A[2]; if (dd < best) { best = dd; bz = z.id + ' r' + (z.r * A[2]).toFixed(2) + 'px u' + u.toFixed(2); } }
      notes.push('px ' + x + ',' + y + ' gap ' + best.toFixed(2) + 'px ' + bz + ' zones ' + JSON.stringify(zh.map(h => h.id))); } } d[i + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    const x0 = Math.round(q[0]) - 70, y0 = Math.round(q[1]) - 90, tx = (n % 3) * 560, ty = Math.floor(n / 3) * 400; go.drawImage(cv, x0, y0, 140, 100, tx, ty, 560, 400);
    go.lineWidth = 1; for (const z of a.zones()) { if (z.kind === 'ell') continue; const A = L.project(...(z.a)), B = L.project(...(z.b || z.a)); if (!A || !B) continue; go.strokeStyle = z.id === 'leg' ? '#ffff00' : '#ff00ff'; go.beginPath(); go.moveTo(tx + (A[0] - x0) * 4, ty + (A[1] - y0) * 4); go.lineTo(tx + (B[0] - x0) * 4, ty + (B[1] - y0) * 4); go.stroke(); }
    { const S2 = X.T('animalScale'); let worst = 0, wl = ''; for (const lp of a.rig.legPts) for (const nm of ['top', 'mid', 'knee', 'fet', 'hoof']) { const v = lp[nm], dr = [q[0] + view.ax * v[0] + view.ay * v[1], q[1] + view.bx * v[0] + view.by * v[1] + view.bz * v[2]], P = L.project(a.rig.x + v[0] * S2, a.rig.y + v[1] * S2, a.rig.z + v[2] * S2), e2 = Math.hypot(dr[0] - P[0], dr[1] - P[1]); if (e2 > worst) { worst = e2; wl = nm + ' drawn ' + dr.map(n => n.toFixed(1)) + ' zone ' + P[0].toFixed(1) + ',' + P[1].toFixed(1); } } notes.push('  worst leg pt ' + worst.toFixed(2) + 'px ' + wl + ' rigxyz ' + [a.rig.x - a.x, a.rig.y - a.y, a.rig.z - a.z].map(n => n.toFixed(2)) + ' k ' + k.toFixed(3) + ' view ' + JSON.stringify(view)); }
    notes.push(a.kind + ' d' + Math.round(q[3] / 16) + ' ' + hit + '/' + ins + ' terr ' + terr + ' miss ' + JSON.stringify(kinds) + ' wade ' + it.wade + ' state ' + a.state); n++;
    for (const o of others) o.state = o._s;
  }
  return out.toDataURL() + '#' + JSON.stringify(notes);
});
const fs = await import('node:fs'); const [u, notes] = url.split('#'); console.log(notes); fs.writeFileSync('tests/out/pick-all.png', Buffer.from(u.split(',')[1], 'base64')); await b.close();
