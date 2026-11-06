// Each track's look and landmarks, built from primitives and the library. Returns things that move.
import { buildModel, mergeStaticMeshes, THREE, toonMaterial, PALETTE, WaterSurface, WAVES_CALM, Boids, clothGrid, SoftMesh, Precipitation } from '../../pixel-engine.js';
import { CATALOG } from '../models/props.js';
import { pointAt, groundHeight } from './trackmesh.js';
import { PIT_WIDTH } from '../sim/race.js';
const { Group, Mesh, BoxGeometry, Vector3 } = THREE;
const P = PALETTE;
function makeRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export class Dresser {
  constructor(ctx, T, hub = false) { this.ctx = ctx; this.T = T; this.tr = T.tr; this.statics = []; this.dyn = []; this.rand = makeRand(T.id.length * 977 + 13); this.hub = hub; this.crowds = []; this.stands = []; }
  model(id, x, y, z, yaw = 0, o = {}) { const b = buildModel(id, { catalog: CATALOG, ...o }); const m = b.object; m.position.set(x, y, z); m.rotation.y = yaw; m.updateMatrixWorld(true); return m; }
  put(id, x, y, z, yaw = 0, o = {}) { const m = this.model(id, x, y, z, yaw, o); this.statics.push(m); return m; }
  /** Place by track position: t > 0 on the driver's right, turned to face the road. */
  side(id, s, t, o = {}) {
    const tr = this.tr, q = pointAt(tr, s, t), side = Math.sign(t) || 1, d = Math.abs(t) - tr.width[q.i] / 2, y = o.y ?? groundHeight(this.T, this.T.id, q.i, side, Math.max(0, d)) + (o.lift ?? 0);
    const yaw = q.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (o.turn ?? 0);
    return this.put(id, q.x, y, q.z, yaw, o.build ?? {});
  }
  scatter(id, n, tMin, tMax, o = {}) {
    const tr = this.tr, grid = this.T.grid; let placed = 0;
    for (let k = 0; k < n * 3 && placed < n; k++) {
      const s = this.rand() * tr.length, side = this.rand() < 0.5 ? -1 : 1, d = tMin + this.rand() * (tMax - tMin), i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, wall = (side > 0 ? tr.wallR : tr.wallL)[i], t = hw + Math.max(d, wall + 2.5);
      if (this.T.reach && t - hw > this.T.reach[side > 0 ? 1 : 0][i] + (o.beyond ?? 80)) continue;
      const q = pointAt(tr, s, side * t);
      if (grid.near(q.x, q.z, 30) < (o.clear ?? 7)) continue;
      const y = groundHeight(this.T, this.T.id, q.i, side, t - hw);
      this.put(id, q.x, y, q.z, this.rand() * 6.28, { seed: k, ...(o.build ? o.build(k, this.rand) : {}) }); placed++;
    }
  }
  stand(s, side, o = {}) { const tr = this.tr, i = Math.round((((s % tr.length) + tr.length) % tr.length) / tr.ds) % tr.N, hw = tr.width[i] / 2, wall = (side > 0 ? tr.wallR : tr.wallL)[i], t = side * (hw + wall + (o.gap ?? 9)), y0 = o.y ?? tr.y[i] - t * Math.sin(tr.bank[i]); this.side(o.id ?? 'grandstand', s, t, { y: y0 - 0.2 }); this.crowd(s, t, side, o.w ?? 36, o.rows ?? 5, y0, o.stepZ ?? 1.9, o.stepY ?? 1.3); }
  /** Stand-ins for spectators: small coloured boxes on terrace rows, in groups that bob (the CrowdCheer loop). */
  crowd(s, t, side, width, rows, y0, stepZ, stepY) {
    const tr = this.tr, q = pointAt(tr, s, t), yaw = q.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2), r = this.rand, cols = ['red', 'blue', 'sand', 'white', 'lime', 'orange', 'plum', 'sky'];
    for (let g = 0; g < 3; g++) {
      const parts = [], grp = new Group();
      for (let a = 0; a < rows; a++) for (let b = 0; b < width * 0.7; b++) { if (r() > 0.25 || (a + b) % 3 !== g) continue; const m = new Mesh(new BoxGeometry(0.42, 0.75, 0.3), toonMaterial(P[cols[Math.floor(r() * cols.length)]])); m.position.set(-width / 2 + b / 0.7 + r() * 0.6, 2.7 + a * stepY, 4.4 - a * stepZ); m.updateMatrix(); parts.push(m); }
      grp.position.set(q.x, y0 - 0.2, q.z); grp.rotation.y = yaw; grp.add(...mergeStaticMeshes(parts)); this.ctx.scene.add(grp); this.crowds.push({ grp, y: y0 - 0.2, ph: g * 2.1 });
    }
    this.stands.push({ x: q.x, y: y0, z: q.z });
  }
  flag(x, y, z, c = P.red, w = 2.6, h = 1.6) {
    const body = clothGrid({ width: w, height: h, cols: 9, rows: 6, origin: [x, y, z], pin: 'left', across: [1, 0, 0] }), mesh = new SoftMesh(body, toonMaterial(c)); mesh.castShadow = false; this.ctx.scene.add(mesh);
    this.dyn.push((dt, t) => { body.wind[0] = 7 + Math.sin(t * 1.3 + x) * 3; body.wind[2] = Math.sin(t * 2.1 + z) * 3; body.step(Math.min(dt, 1 / 30)); mesh.sync(); });
    return mesh;
  }
  finish() { if (this.statics.length) { for (const m of this.statics) m.updateMatrixWorld(true); this.ctx.scene.add(...mergeStaticMeshes(this.statics)); this.statics = []; } }
  update(dt, t) { for (const f of this.dyn) f(dt, t); for (const c of this.crowds) c.grp.position.y = c.y + Math.max(0, Math.sin(t * 5 + c.ph)) * 0.14; }
}
const pitSide = (d, s, o = {}) => { const tr = d.tr, i = Math.round((((s % tr.length) + tr.length) % tr.length) / tr.ds) % tr.N, hw = tr.width[i] / 2, t = hw + PIT_WIDTH + 2 + 7; return d.side('pit-building', s, t, { y: tr.y[i] - t * Math.sin(tr.bank[i]) - 0.1, ...o }); };
const gantry = (d, s = 0) => { const tr = d.tr, q = pointAt(tr, s, 0), w = tr.width[q.i] + 4; d.put('gantry', q.x, q.y, q.z, q.yaw, { params: { w: Math.min(30, w) } }); const drop = (Math.min(30, w) / 2) * Math.abs(Math.sin(tr.bank[q.i])); if (drop > 0.2) { const sd = tr.bank[q.i] > 0 ? 1 : -1, e = pointAt(tr, s, sd * Math.min(15, w / 2)), leg = new Mesh(new BoxGeometry(0.5, drop + 0.4, 0.5), toonMaterial(P.slate)); leg.position.set(e.x, q.y - drop / 2, e.z); d.statics.push(leg); } return { ...q, w }; }; // the low side of a banked road gets a longer leg
function kestrel(d) {
  const tr = d.tr; pitSide(d, 0); gantry(d);
  d.stand(-60, -1); d.stand(-110, -1); d.stand(0, -1); d.stand(70, -1);
  d.stand(tr.cornerS[6], 1, { gap: 12 });
  const hill = pointAt(tr, tr.cornerS[9], 90), hy = groundHeight(d.T, 'kestrel', hill.i, 1, 80) + 2;
  d.put('windmill', hill.x, hy - 1, hill.z, 0);
  const sails = d.model('windmill-sails', hill.x, hy + 13, hill.z + 4.2); d.ctx.scene.add(sails); d.dyn.push((dt) => (sails.rotation.z += dt * 0.6));
  const ch = pointAt(tr, tr.cornerS[3], -70); d.put('church', ch.x, groundHeight(d.T, 'kestrel', ch.i, -1, 60) - 0.5, ch.z, 0.7);
  d.scatter('oak', 150, 6, 110, { build: (k, r) => ({ params: { h: 3 + r() * 2 } }), clear: 7 }); d.scatter('birch', 50, 10, 100); d.scatter('haystack', 40, 12, 60); d.scatter('fence', 70, 5, 12, { build: () => ({ params: { length: 8 } }), clear: 3 });
  for (let n = 0; n < 8; n++) { const s = tr.cornerS[n * 2 % tr.cornerS.length]; const side = n % 2 ? 1 : -1, hw = 7, q = pointAt(tr, s + 30, side * (hw + tr.wallL[0] + 2)); d.put('marshal-post', q.x, q.y, q.z, q.yaw); d.flag(q.x + 1.1, q.y + 5.4, q.z, n % 2 ? P.orange : P.lime, 1.4, 0.9); d.put('flag-pole', q.x + 1.1, q.y, q.z); }
  const flock = new Boids(26, { bounds: { min: [hill.x - 80, 30, hill.z - 80], max: [hill.x + 80, 62, hill.z + 80] }, view: 14, space: 5, maxSpeed: 12, minSpeed: 6, seed: 3 }); const geo = new BoxGeometry(0.9, 0.2, 0.45), mat = toonMaterial(P.ink), birds = []; for (let i = 0; i < flock.count; i++) { const m = new Mesh(geo, mat); d.ctx.scene.add(m); birds.push(m); } d.dyn.push((dt) => { flock.step(Math.min(dt, 1 / 30)); birds.forEach((m, i) => m.position.set(flock.pos[i * 3], flock.pos[i * 3 + 1], flock.pos[i * 3 + 2])); });
}
function cedar(d) {
  const tr = d.tr; gantry(d); d.stand(40, 1, { gap: 8 });
  d.scatter('pine', 900, 5, 130, { build: (k, r) => ({ params: { h: 3.2 + r() * 1.8 }, palette: {} }), clear: 5.5 }); d.scatter('snowy-pine', 90, 40, 130); d.scatter('boulders', 90, 4, 40, { clear: 4 }); d.scatter('rock', 40, 4, 20, { clear: 4 });
  // the tunnel on the rise after C6
  const s0 = tr.cornerS[6] + 40, tun = { from: s0 + 90, to: s0 + 170 };
  for (let s = tun.from; s < tun.to; s += 8) { const q = pointAt(tr, s, 0); if (Math.abs(tr.kappa[q.i]) > 0.02) continue; d.put('tunnel-arch', q.x, q.y, q.z, q.yaw, { params: { w: Math.min(30, tr.width[q.i] + (tr.wallL[q.i]) * 2 + 1) } }); }
  d.T.tunnel = tun;
  const v = pointAt(tr, tr.cornerS[11] + 60, 0); d.put('viaduct', v.x, v.y - 3, v.z, v.yaw + 0.1);
  const h = pointAt(tr, tr.cornerS[2], 26); d.put('hut', h.x, groundHeight(d.T, 'cedar', h.i, 1, 20), h.z, 0.4);
  for (let k = 0; k < 3; k++) d.hikers.push({ s: tr.cornerS[2], t: 18 + k * 2.2 });
  // the waterfall
  const wf = pointAt(tr, tr.cornerS[8], 34), wy = groundHeight(d.T, 'cedar', wf.i, 1, 26);
  const cliff = new Mesh(new BoxGeometry(14, 26, 8), toonMaterial(P.slate)); cliff.position.set(wf.x, wy + 11, wf.z - 8); cliff.castShadow = true; d.statics.push(cliff);
  const fall = new Mesh(new BoxGeometry(5, 24, 0.5), toonMaterial(P.cyan)); fall.position.set(wf.x, wy + 12, wf.z - 3.8); d.statics.push(fall);
  const water = new WaterSurface({ size: [26, 18], at: [wf.x, wy + 0.3, wf.z + 6], waves: WAVES_CALM, segments: [13, 9] }); d.ctx.scene.add(water); let tp = 0;
  d.dyn.push((dt, t) => { water.update(t); tp -= dt; if (tp < 0) { tp = 0.08; d.ctx.particles.burst('waterfall', [wf.x, wy + 22, wf.z - 3.4]); d.ctx.particles.burst('foam', [wf.x, wy + 0.6, wf.z - 2.5]); } });
  let mp = 0; d.dyn.push((dt) => { mp -= dt; if (mp < 0 && d.focus) { mp = 0.5; d.ctx.particles.burst('mist', [d.focus.x, d.focus.y + 3, d.focus.z]); } });
}
function harbour(d) {
  const tr = d.tr, r = d.rand; pitSide(d, 0, { build: { palette: { wall: 'mist', band: 'cyan' } } }); gantry(d);
  d.stand(-40, -1, { gap: 5, y: tr.y[0] }); d.stand(90, -1, { gap: 5, y: tr.y[0] });
  // lamps with baked pools: every 64 m on alternating sides
  for (let s = 8, k = 0; s < tr.length; s += 64, k++) { const side = k % 2 ? 1 : -1, i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, wall = (side > 0 ? tr.wallR : tr.wallL)[i], q = pointAt(tr, s, side * (hw + wall + 0.5)); d.put('lamp-post', q.x, q.y, q.z, q.yaw + (side > 0 ? 1.57 : -1.57), {}); }
  // city blocks both sides, close
  for (let k = 0; k < 150; k++) {
    const s = r() * tr.length, side = r() < 0.5 ? -1 : 1, i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, depth = 18 + r() * 60, t = hw + 11 + depth * 0.5, q = pointAt(tr, s, side * t), w = 12 + r() * 20, dd = 12 + r() * 14, h = 8 + r() * 42;
    if (d.T.grid.near(q.x, q.z, 40) < Math.max(w, dd) * 0.72 + 4) continue;
    if (q.z < -15) continue; // the water front
    d.put('city-block', q.x, 0 - 0.2, q.z, q.yaw, { params: { w, h, d: dd }, seed: k });
  }
  // neon signs in the game's own words, near the road
  const signs = ['neon-kobo', 'neon-umami', 'neon-hotel', 'neon-zipp']; for (let k = 0; k < 18; k++) { const s = (k + 0.5) * tr.length / 18, side = k % 2 ? 1 : -1, i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, wall = (side > 0 ? tr.wallR : tr.wallL)[i], q = pointAt(tr, s, side * (hw + wall + 4)); if (T0(tr, i) || (d.T.pit && (i * tr.ds - d.T.pit.inS + tr.length) % tr.length < d.T.pit.span && side > 0)) continue; d.put(signs[k % 4], q.x, q.y + 3.2, q.z, q.yaw + (side > 0 ? -1.57 : 1.57)); const pole = new Mesh(new BoxGeometry(0.3, 3.2, 0.3), toonMaterial(P.ink)); pole.position.set(q.x, q.y + 1.6, q.z); d.statics.push(pole); }
  // water along the front straight
  const water = new WaterSurface({ size: [1600, 300], at: [60, -2.2, -175], waves: WAVES_CALM, segments: [60, 12], deep: P.navy, shallow: P.night, foam: P.sky }); d.ctx.scene.add(water); d.dyn.push((dt, t) => water.update(t));
  // cranes and containers along the quay
  for (const [x, z] of [[-200, -18], [120, -16], [360, -18]]) d.put('crane', x, -0.2, z - 8, 0);
  for (let k = 0; k < 12; k++) d.put('containers', -260 + k * 58, -0.2, -14 - (k % 3) * 2, 0);
  // the Ferris wheel, turning in the distance
  const w = { x: 760, z: 120 }; d.put('wheel-frame', w.x, -0.2, w.z, 1.2); const ring = d.model('wheel-ring', w.x, 31, w.z, 1.2); d.ctx.scene.add(ring); const spin = new Group(); void spin; d.dyn.push((dt) => (ring.rotation.z += dt * 0.12));
  d.fireworks = true;
}
const T0 = (tr, i) => Math.abs(tr.kappa[i]) > 0.03;
function saltline(d) {
  const tr = d.tr; pitSide(d, 0); gantry(d);
  for (const s of [-180, -120, -60, 0, 60, 120, 180]) d.stand(s, -1, { gap: 7 });
  const q = pointAt(tr, 40, 80); d.put('flag-tower', q.x, -0.2, q.z); d.flag(q.x + 0.2, 45, q.z, P.red, 7, 4);
  const blimp = d.model('blimp', 0, 110, 400); d.ctx.scene.add(blimp); blimp.traverse((m) => { if (m.isMesh) m.castShadow = false; }); d.dyn.push((dt, t) => { const a = t * 0.05; blimp.position.set(Math.cos(a) * 760, 110, 420 + Math.sin(a) * 760); blimp.rotation.y = -a; });
  const r = d.rand; for (let k = 0; k < 14; k++) { const a = r() * 6.28, R = 1100 + r() * 800; d.put('mesa', Math.cos(a) * R, -6, 400 + Math.sin(a) * R, r() * 6, { params: { h: 40 + r() * 90 } }); }
  const devils = [[-900, 900], [1000, 1300], [300, -500]]; let tp = 0; d.dyn.push((dt, t) => { tp -= dt; if (tp < 0) { tp = 0.12; devils.forEach(([x, z], i) => d.ctx.particles.burst('devil', [x + Math.sin(t * 0.3 + i) * 120, 2, z + Math.cos(t * 0.21 + i) * 120], { count: 3 })); } });
  for (let n = 0; n < 40; n++) { const s = n * tr.length / 40, side = n % 2 ? 1 : -1, i = Math.round(s / tr.ds) % tr.N, hw = tr.width[i] / 2, qq = pointAt(tr, s, side * (hw + 4.5)); if (d.T.pit && side > 0 && (i * tr.ds - d.T.pit.inS + tr.length) % tr.length < d.T.pit.span) continue; d.put('flag-pole', qq.x, qq.y, qq.z); }
}
function redclay(d) {
  const tr = d.tr; gantry(d, 0);
  d.scatter('cactus', 110, 3, 16, { clear: 4, beyond: 120 }); d.scatter('boulders', 110, 3, 40, { clear: 3.5, beyond: 120, build: () => ({ palette: {} }) });
  const w = pointAt(tr, tr.cornerS[4] + 30, 30); d.put('water-tower', w.x, groundHeight(d.T, 'redclay', w.i, 1, 24), w.z);
  for (const s of [tr.cornerS[1], tr.cornerS[6], tr.cornerS[9], 30]) { const i = Math.round(((s % tr.length) + tr.length) % tr.length / tr.ds) % tr.N, side = Math.sign(tr.kappa[i]) || 1; d.stand(s, -side, { id: 'wood-stand', gap: 4, y: groundHeight(d.T, 'redclay', i, -side, 7) + 0.1, w: 12, rows: 3, stepZ: 1.6, stepY: 1 }); }
  for (const [cs] of tr.def.crests) { for (const off of [-130, -70]) { const q = pointAt(tr, cs + off, -(tr.width[0] / 2 + 3)); d.side('warn-board', cs + off, -(4.5 + 3)); void q; } }
  tr.def.corners.forEach((c, n) => { if (c[2] > 22) return; const q = tr.cornerS[n] - 60, i = Math.round(((q + tr.length) % tr.length) / tr.ds) % tr.N, side = -Math.sign(tr.kappa[Math.round(tr.cornerS[n] / tr.ds) % tr.N] || 1); void i; d.side('warn-board', q, side * 7.5); });
}
function proving(d) {
  const tr = d.tr; gantry(d, 0);
  const t = pointAt(tr, -40, -34); d.put('control-tower', t.x, -0.2, t.z); d.put('van', t.x + 16, -0.2, t.z + 6, 1.2);
  for (const [s, off] of [[-180, -60], [40, -60], [240, -66]]) { const q = pointAt(tr, s, off); d.put('hangar', q.x, -0.2, q.z, q.yaw + Math.PI); }
  d.scatter('crate', 14, 20, 60); d.scatter('barrel', 24, 20, 60); d.scatter('bench', 8, 20, 40);
  const sock = pointAt(tr, 30, -28); d.put('flag-pole', sock.x, -0.2, sock.z); d.flag(sock.x, 5.8, sock.z, P.orange, 3, 0.8);
  // painted boxes and cones lying around the apron
  for (let k = 0; k < 18; k++) { const q = pointAt(tr, -260 + k * 46, -24 - (k % 3) * 5), c = new Mesh(new BoxGeometry(0.4, 0.7, 0.4), toonMaterial(P.orange)); c.position.set(q.x, q.y + 0.35, q.z); d.statics.push(c); }
}
export function dressTrack(ctx, T, hub = false) {
  const d = new Dresser(ctx, T, hub); d.hikers = [];
  ({ kestrel, cedar, harbour, saltline, redclay, proving })[T.id](d);
  d.finish();
  return d;
}
/** Baked lamp pools for the Harbour: brightness per road sample. */
export function lampPools(tr) { const a = new Float32Array(tr.N); for (let s = 8; s < tr.length; s += 64) { const i0 = Math.round(s / tr.ds); for (let k = -3; k <= 3; k++) { const i = (i0 + k + tr.N) % tr.N; a[i] = Math.max(a[i], 1 - Math.abs(k) / 4); } } return a; }
void Vector3; void Precipitation;
