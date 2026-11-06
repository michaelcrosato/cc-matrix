// Track dressing: props from the library plus our own landmarks. Plan section 8. All placement is deterministic.
import { THREE, buildModel, toonMaterial, PALETTE, mergeStaticMeshes, setLookLayer, WaterSurface, WAVES_CALM, Boids } from '../../pixel-engine.js';
import { rng } from '../sim/race.js';
import { App } from '../app.js';
const { Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry } = THREE;
const box = (w, h, d, c, x, y, z, glow = false) => { const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[c])); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = false; if (glow) m.userData.glow = true; return m; };
export class Props {
  constructor() { this.cache = new Map(); this.sources = []; this.live = new Group(); }
  place(id, x, y, z, o = {}) {
    const key = id + JSON.stringify(o.params ?? {}) + JSON.stringify(o.palette ?? {}) + (o.seed ?? 0); let b = this.cache.get(key);
    if (!b) { try { b = buildModel(id, { params: o.params, palette: o.palette, seed: o.seed ?? 1 }); } catch (e) { return null; } this.cache.set(key, b); }
    const g = b.object.clone(true); g.position.set(x, y, z); g.rotation.y = o.rot ?? 0; if (o.scale) g.scale.setScalar(o.scale); g.updateMatrixWorld(true); this.sources.push(g); return g;
  }
  add(m) { m.updateMatrixWorld(true); this.sources.push(m); }
  flush(scene) { scene.add(...mergeStaticMeshes(this.sources)); this.sources = []; }
}
export function dressTrack(ctx, id, tr, mesh, world) {
  const P = new Props(), R = rng(11 + id.length * 7), { skirtY, reach } = mesh.userData, N = tr.N, L = tr.length;
  const side = (i, s, d) => { const k = i % N, h = tr.width[k] / 2, wd = s > 0 ? tr.wallR[k] : tr.wallL[k], t = s * (h + wd + d); return [tr.x[k] - tr.tz[k] * t, skirtY(k, s, d), tr.z[k] + tr.tx[k] * t]; };
  const scatter = (models, count, dMin, dMax, opts = {}) => { for (let n = 0; n < count; n++) { const i = Math.floor(R() * N), s = R() < 0.5 ? -1 : 1, d = dMin + R() * (dMax - dMin); if (d > reach[i] - 4 && d > 8) continue; const p = side(i, s, d), id2 = models[Math.floor(R() * models.length)]; P.place(id2, p[0], p[1] - 0.05, p[2], { rot: R() * 6.28, seed: 1 + Math.floor(R() * 3), palette: opts.palette, scale: opts.scale ? opts.scale[0] + R() * (opts.scale[1] - opts.scale[0]) : 1 }); } };
  const crowd = (x, y, z, w, d, rows, rotY) => { const g = new Group(); const cols = ['red', 'sand', 'blue', 'white', 'lime', 'orange']; for (let r = 0; r < rows; r++) for (let k = 0; k < Math.floor(w / 0.9); k++) if (R() < 0.8) g.add(box(0.5, 0.7, 0.4, cols[Math.floor(R() * cols.length)], -w / 2 + k * 0.9, 1.0 + r * 0.8, r * 0.9)); g.position.set(x, y, z); g.rotation.y = rotY; g.updateMatrixWorld(true); P.sources.push(g); };
  const stand = (i, s, w, rows, c = 'slate') => { const p = side(i, s, id === 'saltline' ? 30 : 6), k = i % N, yaw = Math.atan2(tr.tx[k], tr.tz[k]); const g = new Group(); for (let r = 0; r < rows; r++) g.add(box(w, 0.8, 2, c, 0, 0.4 + r * 0.8, r * 1.6 + 1)); g.add(box(w + 1, 0.3, rows * 1.8 + 1, 'mist', 0, rows * 0.8 + 2.4, rows * 0.8)); for (const sx of [-1, 1]) g.add(box(0.3, rows * 0.8 + 2.4, 0.3, 'ink', sx * (w / 2), (rows * 0.8 + 2.4) / 2, 0.2)); g.position.set(p[0], p[1], p[2]); g.rotation.y = yaw + (s > 0 ? Math.PI / 2 : -Math.PI / 2); g.updateMatrixWorld(true); P.sources.push(g); const cp = new Group(); crowd(p[0], p[1], p[2], w - 1, 1, rows, g.rotation.y); };
  const gantry = () => { const k = 0, h = tr.width[k] / 2, yaw = Math.atan2(tr.tx[k], tr.tz[k]); const g = new Group(); g.add(box(0.5, 6.5, 0.5, 'slate', -h - 0.6, 3.25, 0), box(0.5, 6.5, 0.5, 'slate', h + 0.6, 3.25, 0), box(h * 2 + 2, 1.1, 0.7, 'ink', 0, 6.3, 0)); g.position.set(tr.x[k], tr.y[k], tr.z[k]); g.rotation.y = yaw; g.updateMatrixWorld(true); P.sources.push(g);
    // lamps: five red lights (separately addressable, so they are not merged)
    const lamps = new Group(); lamps.position.copy(g.position); lamps.rotation.y = yaw; world.scene.add(lamps); world.gantry = []; for (let q = 0; q < 5; q++) { const m = new Mesh(new BoxGeometry(0.7, 0.7, 0.2), toonMaterial(PALETTE.ink)); m.position.set(-h * 0.6 + (q * h * 1.2) / 4, 6.3, -0.4); lamps.add(m); world.gantry.push(m); } };
  gantry();
  const pit = tr.def.pit; if (pit) { const si = Math.round(((pit.in + L) % L) / tr.ds), se = Math.round(((pit.out + L) % L) / tr.ds), span = (se - si + N) % N; const k0 = si; // pit lane surface and boxes
    const lane = new Group(); for (let n = 0; n < span; n += 2) { const k = (si + n) % N, h = tr.width[k] / 2; const m = box(7, 0.06, tr.ds * 2.02, 'mist', 0, 0, 0); const t = h + 5.5, yaw = Math.atan2(tr.tx[k], tr.tz[k]); m.position.set(tr.x[k] - tr.tz[k] * t, tr.y[k] - t * Math.sin(tr.bank[k]) - 0.02, tr.z[k] + tr.tx[k] * t); m.rotation.y = yaw; m.castShadow = false; m.receiveShadow = true; P.add(m); }
    for (let n = 8; n < span - 8; n += 12) { const k = (si + n) % N, h = tr.width[k] / 2, t = h + 12; const yaw = Math.atan2(tr.tx[k], tr.tz[k]); const b = box(8, 4, 9, n % 24 ? 'sand' : 'mist', 0, 2, 0); b.position.set(tr.x[k] - tr.tz[k] * t, tr.y[k], tr.z[k] + tr.tx[k] * t); b.rotation.y = yaw; P.add(b); const rf = box(8.4, 0.3, 9.4, 'red', 0, 4.1, 0); rf.position.copy(b.position); rf.position.y += 2; rf.rotation.y = yaw; P.add(rf); } }
  const lampPosts = (every, colour = 'sand', both = true) => { for (let i = 0; i < N; i += every) for (const s of both ? [-1, 1] : [1]) { const p = side(i, s, 2.5); P.place('lamp-post', p[0], p[1], p[2], { rot: Math.atan2(tr.tx[i], tr.tz[i]) }); } };
  const hill = (x, z, r, h, c) => { const m = new Mesh(new ConeGeometry(r, h, 7), toonMaterial(PALETTE[c])); m.position.set(x, world.groundY + h / 2 - 2, z); m.rotation.y = R() * 3; return m; };
  const cx = (Math.min(...tr.x) + Math.max(...tr.x)) / 2, cz = (Math.min(...tr.z) + Math.max(...tr.z)) / 2;
  const horizon = (cols, n, r0, hMin, hMax) => { for (let q = 0; q < n; q++) { const a = (q / n) * 6.283 + R() * 0.2, r = r0 + R() * 500, h = hMin + R() * (hMax - hMin); const m = hill(cx + Math.cos(a) * r, cz + Math.sin(a) * r, h * 1.6 + 120, h, cols[q % cols.length]); m.castShadow = false; P.add(m); } };
  world.animated = [];
  switch (id) {
    case 'kestrel': {
      scatter(['oak', 'oak', 'birch'], 220, 14, 90); scatter(['haystack'], 30, 6, 14); scatter(['fence'], 90, 2, 5, {});
      stand(Math.round(N * 0.02), -1, 60, 5, 'slate'); stand(Math.round(N * 0.98), -1, 50, 4, 'mist');
      { const p = side(Math.round(N * 0.45), 1, 70), g = new Group(); g.add(box(5, 9, 5, 'white', 0, 4.5, 0)); g.add(box(5.6, 1, 5.6, 'red', 0, 9.5, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); const bl = new Group(); for (const a of [0, 1.57, 3.14, 4.71]) { const b = box(0.4, 12, 0.2, 'sand', 0, 6, 0); b.rotation.z = a; b.position.set(0, 0, 0); const holder = new Group(); holder.add(b); b.position.y = 0; b.geometry.translate(0, 6, 0); holder.rotation.z = a; bl.add(holder); } bl.position.set(p[0], p[1] + 8, p[2] - 3.2); world.scene.add(bl); world.animated.push((t) => { bl.rotation.z = t * 0.6; }); }
      { const p = side(Math.round(N * 0.2), -1, 60), g = new Group(); g.add(box(7, 5, 10, 'white', 0, 2.5, 0), box(7.4, 1, 10.4, 'red', 0, 5.4, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); }
      horizon(['green', 'teal'], 14, 1500, 60, 180); break; }
    case 'cedar': {
      scatter(['pine', 'pine', 'pine', 'snowy-pine'], 700, 8, 100, { scale: [0.9, 1.9] }); scatter(['boulders', 'rock'], 80, 4, 30, { scale: [1, 3] });
      { const i = Math.round(tr.cornerS[6] / tr.ds) + 30; const p = [tr.x[i], tr.y[i], tr.z[i]], yaw = Math.atan2(tr.tx[i], tr.tz[i]), g = new Group(); const w = tr.width[i] / 2 + 3; g.add(box(1.5, 7.5, 40, 'slate', -w, 3.75, 0), box(1.5, 7.5, 40, 'slate', w, 3.75, 0), box(w * 2 + 3, 1.6, 40, 'slate', 0, 7.5, 0)); g.position.set(p[0], p[1], p[2]); g.rotation.y = yaw; g.updateMatrixWorld(true); P.sources.push(g); world.tunnel = { i, len: 40 }; for (let q = -16; q <= 16; q += 8) ctx.lights.request({ position: [p[0] + tr.tx[i] * q, p[1] + 6, p[2] + tr.tz[i] * q], color: 0xffd080, intensity: 4, radius: 12, priority: 2 }); }
      { const i = Math.round(tr.cornerS[2] / tr.ds), p = side(i, 1, 30); for (let q = -2; q <= 2; q++) { const b = box(2, 1.2, 60, 'red', p[0] + q * 0, p[1] + 14, p[2]); b.position.set(p[0] + q * 6, p[1] + 14, p[2]); P.add(b); const c1 = box(1.2, 14, 1.2, 'red', p[0] + q * 6, p[1] + 7, p[2] - 25); P.add(c1); const c2 = box(1.2, 14, 1.2, 'red', p[0] + q * 6, p[1] + 7, p[2] + 25); P.add(c2); } }
      { const i = Math.round(tr.cornerS[8] / tr.ds), p = side(i, -1, 20); const g = new Group(); g.add(box(4, 2.6, 3.4, 'orange', 0, 1.3, 0), box(4.6, 0.6, 4, 'red', 0, 2.8, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); }
      horizon(['slate', 'teal', 'mist'], 16, 1700, 120, 320); break; }
    case 'harbour': {
      lampPosts(6); const cols = ['night', 'slate', 'navy', 'plum']; for (let n = 0; n < 160; n++) { const i = Math.floor(R() * N), s = R() < 0.5 ? -1 : 1, d = 14 + R() * 70; if (d > reach[i] - 2 && d > 22) continue; const p = side(i, s, d), w = 8 + R() * 12, h = 10 + R() * 40, g = new Group(); g.add(box(w, h, w, cols[n % 4], 0, h / 2, 0)); for (let q = 0; q < 16; q++) { const wy = 2 + R() * (h - 3), wx = (R() - 0.5) * (w - 2); const win = box(1, 1.2, 0.1, R() < 0.5 ? 'sand' : 'cyan', wx, wy, w / 2 + 0.06, true); g.add(win); } g.position.set(p[0], p[1], p[2]); g.rotation.y = Math.round(R() * 4) * 1.5708; g.updateMatrixWorld(true); P.sources.push(g); }
      for (let n = 0; n < 16; n++) { const i = Math.floor(R() * N), p = side(i, R() < 0.5 ? -1 : 1, 8 + R() * 16); P.place('crate', p[0], p[1], p[2], { rot: R() * 3, scale: 2 + R() * 2 }); } scatter(['barrel'], 40, 4, 12, { scale: [1, 1.6] });
      { const p = [cx - 400, world.groundY, cz + 520]; const wheel = new Group(); const ring = new Mesh(new THREE.TorusGeometry(26, 0.9, 6, 20), toonMaterial(PALETTE.sand)); wheel.add(ring); for (let q = 0; q < 8; q++) { const sp = box(0.5, 52, 0.5, 'mist', 0, 0, 0); sp.rotation.z = (q * Math.PI) / 8; wheel.add(sp); } for (let q = 0; q < 12; q++) { const a = (q / 12) * 6.283; wheel.add(box(2.4, 2.4, 2.4, ['red', 'cyan', 'sand'][q % 3], Math.cos(a) * 26, Math.sin(a) * 26, 0, true)); } wheel.position.set(p[0], 30, p[2]); wheel.rotation.y = 0.6; world.scene.add(wheel); P.add(box(1.4, 30, 1.4, 'slate', p[0], 15, p[2])); world.animated.push((t) => { wheel.children.forEach((c) => c.rotation && 0); ring.rotation.z = t * 0.1; }); }
      { const w = new WaterSurface({ size: [900, 700], at: [cx + 100, world.groundY + 0.6, cz - 550], waves: WAVES_CALM }); world.scene.add(w); world.animated.push((t) => w.update(t)); }
      for (let n = 0; n < 6; n++) { const a = R() * 6.28, p = [cx + Math.cos(a) * 600, world.groundY, cz + Math.sin(a) * 600]; P.add(box(2, 60 + R() * 20, 2, 'red', p[0], 30, p[2])); P.add(box(50, 1.5, 2, 'red', p[0] + 20, 62, p[2])); }
      for (let q = 0; q < 14; q++) { const a = (q / 14) * 6.28, r = 1500 + R() * 200; P.add(box(30 + R() * 30, 40 + R() * 100, 30, ['night', 'navy'][q % 2], cx + Math.cos(a) * r, 40, cz + Math.sin(a) * r)); } break; }
    case 'saltline': {
      stand(Math.round(N * 0.01), -1, 120, 8, 'mist'); { const p = side(Math.round(N * 0.5), -1, 25), g = new Group(); g.add(box(1.5, 36, 1.5, 'slate', 0, 18, 0), box(8, 4, 0.5, 'red', 4, 34, 0), box(8, 2, 0.5, 'white', 4, 30, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); }
      horizon(['orange', 'sand', 'red'], 12, 1700, 60, 200);
      { const blimp = new Group(); const body = new Mesh(new SphereGeometry(1, 10, 8), toonMaterial(PALETTE.white)); body.scale.set(5, 4, 14); blimp.add(body); const fin = box(0.4, 7, 5, 'red', 0, 0, -13); blimp.add(fin, box(5, 0.4, 5, 'red', 0, 0, -13)); blimp.add(box(3, 2, 6, 'slate', 0, -4.5, 0)); world.scene.add(blimp); world.animated.push((t) => { const a = t * 0.05; blimp.position.set(cx + Math.cos(a) * 700, 90, cz + Math.sin(a) * 600); blimp.rotation.y = -a; }); }
      break; }
    case 'redclay': {
      scatter(['cactus', 'cactus'], 120, 8, 60); scatter(['boulders'], 60, 6, 40, { scale: [1, 3] });
      { const p = side(Math.round(N * 0.3), 1, 30), g = new Group(); g.add(box(1, 12, 1, 'plum', -3, 6, -3), box(1, 12, 1, 'plum', 3, 6, -3), box(1, 12, 1, 'plum', -3, 6, 3), box(1, 12, 1, 'plum', 3, 6, 3), box(9, 5, 9, 'red', 0, 14.5, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); }
      stand(Math.round(N * 0.12), 1, 30, 3, 'orange'); stand(Math.round(N * 0.6), -1, 24, 3, 'orange');
      for (const [cs] of tr.def.crests) { const i = Math.round(cs / tr.ds); for (const d of [60, 40]) { const p = side(((i - Math.round(d / tr.ds)) + N) % N, 1, 1.5); const b = box(0.2, 2, 2.4, 'red', p[0], p[1] + 1.5, p[2]); b.rotation.y = Math.atan2(tr.tx[i], tr.tz[i]) + 1.5708; P.add(b); } }
      for (let q = 0; q < 40; q++) { const i = Math.floor(R() * N), s = R() < 0.5 ? -1 : 1, d = 12 + R() * 24, p = side(i, s, d); const h = 18 + R() * 30; P.add(box(8 + R() * 10, h, 8 + R() * 10, ['red', 'orange', 'plum'][q % 3], p[0], p[1] + h / 2 - 3, p[2])); }
      horizon(['red', 'orange'], 14, 1500, 90, 220); break; }
    case 'proving': {
      { const p = [tr.x[Math.round(N * 0.02)] + 25, tr.y[0], tr.z[Math.round(N * 0.02)] - 40]; const g = new Group(); g.add(box(8, 24, 8, 'white', 0, 12, 0), box(12, 5, 12, 'slate', 0, 25, 0), box(13, 0.6, 13, 'red', 0, 28, 0)); g.position.set(p[0], p[1], p[2]); g.updateMatrixWorld(true); P.sources.push(g); world.tower = p; }
      for (let q = 0; q < 4; q++) { const i = Math.round(N * (0.1 + q * 0.12)), p = side(i, -1, 40); const g = new Group(); g.add(box(40, 10, 24, 'mist', 0, 5, 0), box(40, 1.2, 24, 'slate', 0, 10.4, 0)); g.position.set(p[0], p[1], p[2]); g.rotation.y = Math.atan2(tr.tx[i], tr.tz[i]); g.updateMatrixWorld(true); P.sources.push(g); }
      scatter(['barrel', 'crate'], 20, 3, 20, { scale: [1, 1.5] }); horizon(['sand', 'green'], 10, 1500, 20, 80); break; }
  }
  P.flush(world.scene);
  // flocks of birds (Kestrel) via Boids
  if (id === 'kestrel' || id === 'cedar') { try { const bd = new Boids(14, { bounds: { min: [cx - 300, 40, cz - 200], max: [cx + 300, 90, cz + 200] } }); const bm = new Group(); const ms = []; for (let q = 0; q < 14; q++) { const m = box(0.8, 0.15, 0.4, 'ink', 0, 0, 0); bm.add(m); ms.push(m); } world.scene.add(bm); world.animated.push((t, dt) => { bd.step(Math.min(dt, 0.05)); ms.forEach((m, q) => m.position.set(bd.pos[q * 3], bd.pos[q * 3 + 1], bd.pos[q * 3 + 2])); }); } catch {} }
}
