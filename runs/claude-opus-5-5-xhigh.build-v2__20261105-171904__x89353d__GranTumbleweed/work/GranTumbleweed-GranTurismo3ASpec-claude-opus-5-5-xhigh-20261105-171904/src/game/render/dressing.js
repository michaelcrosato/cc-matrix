// Every circuit's own look and landmarks: the world around the road, with the things that move.
import { Boids, buildModel, clothGrid, mergeStaticMeshes, PALETTE, setLookLayer, SoftMesh, THREE, toonMaterial, WaterSurface, WAVES_CALM, WAVES_CHOPPY } from '../../pixel-engine.js';
import { GeoBatch, mix, rgb, seeded, shade } from './geo.js';
import { blockText } from './blocktext.js';
import { containerDef, haybaleDef } from '../models/props.js';
import { PIT_WIDTH, trackPoint } from '../sim/race.js';
const { BoxGeometry, ConeGeometry, Group, InstancedMesh, Matrix4, Mesh, Object3D } = THREE;
const fix = (i, N) => ((i % N) + N) % N;
class Dress {
  constructor(ctx, tr, mesh, hour) { this.ctx = ctx; this.tr = tr; this.mesh = mesh; this.hour = hour; this.b = new GeoBatch(); this.glow = new GeoBatch(); this.flat = new GeoBatch(); this.group = new Group(); this.statics = []; this.movers = []; this.fixed = []; this.r = seeded(tr.N + tr.id.length * 13); this.crowd = [new GeoBatch(), new GeoBatch(), new GeoBatch()]; this.tunnel = null; }
  at(s, side, dist) { // a point dist metres beyond the barrier on this side, on the terrain
    const tr = this.tr, i = fix(Math.round(s / tr.ds), tr.N), wall = side > 0 ? tr.wallR[i] : tr.wallL[i], off = tr.width[i] / 2 + wall + dist, x = tr.x[i] - tr.tz[i] * off * side, z = tr.z[i] + tr.tx[i] * off * side;
    return { x, y: this.mesh.terrainAt(i, side, wall + dist - 1.5), z, yaw: Math.atan2(tr.tx[i], tr.tz[i]), i, tx: tr.tx[i], tz: tr.tz[i], off };
  }
  place(id, x, y, z, yaw = 0, o = {}) { const m = buildModel(id, o).object.clone(true); m.position.set(x, y, z); m.rotation.y = yaw; m.updateMatrixWorld(true); this.statics.push(m); return m; }
  mover(fn) { this.movers.push(fn); }
  add(o) { this.group.add(o); return o; }
  // A stand of benches with the crowd in three bobbing batches. Runs along the road, away from the side given.
  grandstand(p, len, rows, side, { roof = true, wood = false, colour = 'slate' } = {}) {
    const b = this.b, tx = p.tx, tz = p.tz, rx = -tz * side, rz = tx * side, r = this.r, yaw = p.yaw + Math.PI / 2, base = wood ? 'orange' : colour, seat = wood ? mix('orange', 'plum', 0.3) : mix('slate', 'mist', 0.3), tall = rows * 0.8 + 3;
    for (let k = 0; k < rows; k++) {
      const d = 1 + k * 1.1, y = p.y + 0.3 + k * 0.8;
      b.box(p.x + rx * d, p.y, p.z + rz * d, len, y - p.y + 0.3, 1.1, k % 2 ? base : seat, yaw);
      for (let c = 0; c < len / 0.9; c++) { if (r() < 0.2) continue; const a = -len / 2 + 0.5 + c * 0.9, X = p.x + rx * d + tx * a, Z = p.z + rz * d + tz * a, col = r.pick(['red', 'white', 'sky', 'sand', 'orange', 'lime', 'plum', 'mist', 'blue']); this.crowd[c % 3].box(X, y + 0.25, Z, 0.5, 0.75, 0.42, col, yaw); this.crowd[c % 3].box(X, y + 1.0, Z, 0.3, 0.26, 0.3, 'sand', yaw); }
    }
    if (roof) {
      const d = rows * 1.1 + 0.8;
      for (const a of [-len / 2, 0, len / 2]) b.box(p.x + rx * d + tx * a, p.y, p.z + rz * d + tz * a, 0.5, tall + 2, 0.5, 'night', yaw);
      b.box(p.x + rx * (d / 2 + 0.5) + tx * 0, p.y + tall + 2, p.z + rz * (d / 2 + 0.5), len + 2, 0.4, d + 2, 'white', yaw);
      b.box(p.x + rx * (d + 0.2), p.y, p.z + rz * (d + 0.2), len, tall + 2, 0.4, mix('slate', 'night', 0.4), yaw);
    }
  }
  // The pit building and lane furniture along the start straight, on the driver's right.
  pits(style = 'white') {
    const tr = this.tr, b = this.b, g = this.glow; if (!tr.pit) return;
    const n = Math.floor((tr.pit.out - tr.pit.in - 80) / 16), halfW = tr.width[0] / 2, t = halfW + PIT_WIDTH + 2.5 + 6;
    for (let k = 0; k < n; k++) {
      const s = tr.pit.in + 40 + k * 16 + 8, pt = trackPoint(tr, s, t), col = style === 'white' ? 'white' : mix('mist', 'slate', 0.4);
      b.box(pt.x, pt.y, pt.z, 15.6, 5.5, 10, col, pt.yaw + Math.PI / 2, 'slate');
      const front = trackPoint(tr, s, t - 5.05);
      b.box(front.x, front.y, front.z, 11, 3.8, 0.1, 'ink', pt.yaw + Math.PI / 2);
      b.box(front.x, front.y + 4.1, front.z, 13, 0.9, 0.12, k % 2 ? 'red' : 'navy', pt.yaw + Math.PI / 2);
      if (k % 2 === 0) g.box(front.x, front.y + 3.2, front.z, 9, 0.2, 0.14, 'white', pt.yaw + Math.PI / 2);
    }
    const roofS = (tr.pit.in + tr.pit.out) / 2, rf = trackPoint(tr, roofS, t - 3);
    b.box(rf.x, rf.y + 5.5, rf.z, (tr.pit.out - tr.pit.in - 80) + 4, 0.5, 18, 'mist', rf.yaw + Math.PI / 2);
    // The gantry over the start line, with five lights that the race scene switches on.
    const c = trackPoint(tr, 3, 0), w = tr.width[0] / 2 + 3;
    const l = trackPoint(tr, 3, -w), r = trackPoint(tr, 3, w);
    b.box(l.x, l.y, l.z, 0.6, 7.5, 0.6, 'slate', c.yaw); b.box(r.x, r.y, r.z, 0.6, 7.5, 0.6, 'slate', c.yaw);
    b.beam([l.x, l.y + 7, l.z], [r.x, r.y + 7, r.z], 0.5, 1.3, 'night');
  }
  gantry() { // always built: pits() draws the structure on tracks with pits, this does it elsewhere
    const tr = this.tr, c = trackPoint(tr, 3, 0), w = tr.width[0] / 2 + 3, l = trackPoint(tr, 3, -w), r = trackPoint(tr, 3, w);
    if (!tr.pit) { this.b.box(l.x, l.y, l.z, 0.6, 7.5, 0.6, 'slate', c.yaw); this.b.box(r.x, r.y, r.z, 0.6, 7.5, 0.6, 'slate', c.yaw); this.b.beam([l.x, l.y + 7, l.z], [r.x, r.y + 7, r.z], 0.5, 1.3, 'night'); }
    const lamps = [];
    for (let k = 0; k < 5; k++) { const pt = trackPoint(tr, 2.6, (k - 2) * 1.9), off = new Mesh(new BoxGeometry(1.1, 0.9, 0.2), toonMaterial(PALETTE.ink)); off.position.set(pt.x, pt.y + 7.3, pt.z); off.rotation.y = pt.yaw; const red = new Mesh(new BoxGeometry(1.1, 0.9, 0.24), toonMaterial(PALETTE.red)); red.material = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0xff3020) }); red.position.copy(off.position); red.rotation.y = pt.yaw; red.visible = false; const green = new Mesh(new BoxGeometry(1.1, 0.9, 0.24), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0x60f060) })); green.position.copy(off.position); green.rotation.y = pt.yaw; green.visible = false; this.group.add(off, red, green); lamps.push({ red, green }); }
    return lamps;
  }
  flag(x, y, z, colour, yawDir = [1, 0, 0]) { // A cloth flag on a pole; the wind moves it
    this.b.box(x, y, z, 0.12, 4.4, 0.12, 'slate');
    const cloth = clothGrid({ width: 2.2, height: 1.2, cols: 9, rows: 6, origin: [x, y + 4.3, z], across: yawDir, pin: 'left' });
    cloth.wind = [yawDir[0] * 6, 0.5, yawDir[2] * 6 + 1]; cloth.gust = 0.8; cloth.drag = 0.5;
    const m = new SoftMesh(cloth, toonMaterial(PALETTE[colour]), { doubleSided: true }); m.castShadow = false; this.add(m);
    this.fixed.push((dt) => cloth.step(dt)); this.mover(() => m.sync());
    return m;
  }
  marshal(s, side, colour) { const p = this.at(s, side, 2.5); this.b.box(p.x, p.y, p.z, 1.6, 1.0, 1.6, 'white', p.yaw, 'orange'); this.b.box(p.x, p.y + 1, p.z, 0.4, 1.3, 0.3, 'orange', p.yaw); this.flag(p.x + 0.6, p.y + 1, p.z, colour, [p.tx, 0, p.tz]); }
  oak(x, y, z, seed = 1, h = 4) { const r = this.r, b = this.b, H = h * (0.8 + r() * 0.5); b.cone(x, y, z, 0.42 * H / 4, H * 0.5, 6, mix('plum', 'red', 0.3), 0.3 * H / 4); b.ball(x, y + H * 0.72, z, H * 0.5, seed % 2 ? 'green' : mix('green', 'teal', 0.3), 7, 0.9); b.ball(x + 0.8, y + H * 0.9, z + 0.5, H * 0.3, mix('green', 'lime', 0.5), 6, 0.8); }
  pine(x, y, z, h = 9) { const r = this.r, b = this.b, H = h * (0.75 + r() * 0.6), col = r() > 0.5 ? 'teal' : mix('teal', 'green', 0.45), dark = mix(col, 'navy', 0.25); b.cone(x, y, z, H * 0.07, H * 0.3, 5, 'plum', H * 0.05); b.cone(x, y + H * 0.2, z, H * 0.3, H * 0.42, 7, dark); b.cone(x, y + H * 0.45, z, H * 0.24, H * 0.36, 7, col); b.cone(x, y + H * 0.68, z, H * 0.15, H * 0.32, 6, mix(col, 'lime', 0.15)); }
  cactus(x, y, z, h = 3) { const b = this.b; b.box(x, y, z, 0.45, h, 0.45, 'green', 0, mix('green', 'lime', 0.4)); b.box(x + 0.5, y + h * 0.45, z, 0.6, 0.3, 0.3, 'green'); b.box(x + 0.7, y + h * 0.45, z, 0.3, h * 0.3, 0.3, 'teal'); b.box(x - 0.45, y + h * 0.6, z, 0.5, 0.3, 0.3, 'green'); b.box(x - 0.6, y + h * 0.6, z, 0.28, h * 0.22, 0.28, 'teal'); }
  scatter(count, fn, { minD = 4, maxD = 120, sides = [-1, 1], r = 1 } = {}) {
    const tr = this.tr, f = this.mesh.field, rnd = this.r; let placed = 0, guard = 0;
    while (placed < count && guard++ < count * 8) { const i = Math.floor(rnd() * tr.N), side = sides[Math.floor(rnd() * sides.length)], d = minD + rnd() * rnd() * (maxD - minD), wall = side > 0 ? tr.wallR[i] : tr.wallL[i], off = tr.width[i] / 2 + wall + d, x = tr.x[i] - tr.tz[i] * off * side, z = tr.z[i] + tr.tx[i] * off * side; if (!f.clear(x, z, r)) continue; fn(x, this.mesh.terrainAt(i, side, wall + d - 1.5), z, i, side, d); placed++; }
  }
  finish() {
    const g = this.group;
    if (this.statics.length) g.add(...mergeStaticMeshes(this.statics, { castShadow: true, receiveShadow: false }));
    g.add(this.b.mesh({ cast: true, receive: false }));
    if (this.glow.triangles) g.add(this.glow.mesh({ glow: true }));
    if (this.flat.triangles) g.add(this.flat.mesh({ receive: true }));
    this.crowdMeshes = this.crowd.filter((c) => c.triangles).map((c) => { const m = c.mesh({ receive: false }); setLookLayer(m, 'actors'); g.add(m); return m; });
    if (this.crowdMeshes.length) this.mover((dt, t, cheer) => { this.crowdMeshes.forEach((m, k) => { const a = cheer ? 0.35 : 0.06; m.position.y = Math.max(0, Math.sin(t * (cheer ? 9 : 2.6) + k * 2.1)) * a; }); });
  }
}
const DRESS = {
  kestrel(d) {
    const { tr, b } = d, r = d.r, start = tr.pit;
    d.pits('white');
    d.grandstand(d.at(0, -1, 3), 90, 8, -1);
    d.grandstand(d.at(tr.cornerS[0] - 60, -1, 3), 40, 5, -1, { roof: false });
    d.grandstand(d.at(tr.cornerS[6], -1, 4), 34, 5, -1, { roof: false, colour: 'teal' });
    void start;
    // The windmill on the hill, seen from most of the lap.
    const hill = { x: 330, y: 0, z: 370 }, H = 6; hill.y = d.mesh.groundY;
    b.cone(hill.x, hill.y, hill.z, 26, 18, 9, mix('green', 'lime', 0.25), 8);
    b.cone(hill.x, hill.y + 18, hill.z, 4.2, 15, 8, 'white', 2.6); b.cone(hill.x, hill.y + 33, hill.z, 3, 3.4, 8, 'red');
    const mill = d.add(new Group()); mill.position.set(hill.x, hill.y + 30, hill.z - 3); setLookLayer(mill, 'environment');
    const blade = new GeoBatch(); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); for (let q = 0; q < 2; q++) { const L = 11; blade.box(s * L * 0.5, c * L * 0.5 - 0.1 + 0, 0, 0.8 + q * 1.2, 0.15, 0.1, q ? 'white' : 'slate'); const M = new Matrix4(); void M; } }
    const bladeMesh = new Group(); for (let k = 0; k < 4; k++) { const arm = new Mesh(new BoxGeometry(1.8, 11, 0.12), toonMaterial(PALETTE.white)); arm.position.y = 5.5; const p = new Group(); p.rotation.z = (k / 4) * Math.PI * 2; p.add(arm); bladeMesh.add(p); } mill.add(bladeMesh); void blade;
    d.mover((dt) => { bladeMesh.rotation.z += dt * 0.5; });
    void H;
    // A tiny church.
    const ch = d.at(tr.cornerS[9], 1, 34);
    b.box(ch.x, ch.y, ch.z, 7, 4.5, 13, 'white', 0.5, 'plum'); b.box(ch.x - 3, ch.y, ch.z + 6, 3.2, 10, 3.2, 'white', 0.5, 'slate'); b.cone(ch.x - 3, ch.y + 10, ch.z + 6, 2.4, 5, 4, 'plum');
    // White fences along the outside of the back of the park.
    for (let i = 0; i < tr.N; i += 2) { const s = i * tr.ds; if (i % 40 > 26) continue; const a = d.at(s, -1, 1.5), c = d.at(s + tr.ds * 2, -1, 1.5); b.box(a.x, a.y, a.z, 0.14, 1.1, 0.14, 'white'); b.beam([a.x, a.y + 0.45, a.z], [c.x, c.y + 0.45, c.z], 0.06, 0.1, 'white'); b.beam([a.x, a.y + 0.9, a.z], [c.x, c.y + 0.9, c.z], 0.06, 0.1, 'white'); }
    // Oaks, hay bales, marshals.
    d.scatter(240, (x, y, z, i) => d.oak(x, y, z, i, 5.2), { minD: 6, maxD: 110, r: 3 });
    d.scatter(30, (x, y, z) => d.place(haybaleDef, x, y, z, r() * 3), { minD: 2, maxD: 26, r: 1 });
    d.scatter(10, (x, y, z) => d.place('haystack', x, y, z, r() * 3), { minD: 8, maxD: 40, r: 2 });
    d.scatter(12, (x, y, z) => d.place('birch', x, y, z, r() * 3), { minD: 6, maxD: 50, r: 3 });
    [1, 4, 7, 10, 12].forEach((k, n) => d.marshal(tr.cornerS[k], n % 2 ? 1 : -1, n % 2 ? 'orange' : 'sand'));
    // A kestrel flock over the park.
    const flock = new Boids(26, { bounds: { min: [100, 34, 200], max: [560, 72, 620] }, maxSpeed: 16, minSpeed: 9, view: 12, space: 5, seed: 7 });
    const birds = new InstancedMesh(new ConeGeometry(0.5, 1.3, 3).rotateX(Math.PI / 2), toonMaterial(PALETTE.plum), 26), dummy = new Object3D(); birds.frustumCulled = false; d.add(birds);
    d.mover((dt) => { flock.step(Math.min(dt, 0.05)); for (let k = 0; k < 26; k++) { dummy.position.set(flock.pos[k * 3], flock.pos[k * 3 + 1], flock.pos[k * 3 + 2]); dummy.rotation.y = Math.atan2(flock.vel[k * 3], flock.vel[k * 3 + 2]); dummy.scale.set(1.4, 0.6, 1); dummy.updateMatrix(); birds.setMatrixAt(k, dummy.matrix); } birds.instanceMatrix.needsUpdate = true; });
  },
  cedar(d) {
    const { tr, b } = d, r = d.r;
    d.grandstand(d.at(tr.length - 90, 1, 3), 34, 4, 1, { roof: true, wood: true });
    // Pines by the thousand.
    d.scatter(1500, (x, y, z) => d.pine(x, y, z, 13), { minD: 3, maxD: 118, r: 2.5 });
    // Rock cuts: boulders beside the road on the mountain's side.
    d.scatter(120, (x, y, z) => { b.ball(x, y + 1.2, z, 2.2 + r() * 2.2, r() > 0.5 ? 'slate' : mix('slate', 'mist', 0.3), 5, 0.8); }, { minD: 1, maxD: 18, r: 2.5 });
    // The tunnel on the rise after C6: a box arch with lamps; the sky darkens while inside.
    const s0 = tr.cornerS[6] + 60, s1 = s0 + 130, rock = mix('slate', 'night', 0.3), g = d.glow;
    d.tunnel = [s0, s1];
    for (let s = s0; s < s1; s += 4) {
      const w = tr.width[fix(Math.round(s / tr.ds), tr.N)] / 2 + 2.5, a = trackPoint(tr, s, -w), c = trackPoint(tr, s, w), a2 = trackPoint(tr, s + 4, -w), c2 = trackPoint(tr, s + 4, w), h = 6.2;
      for (const [p, q] of [[a, a2], [c2, c]]) { const dark = shade(rock, 0.65); b.quad([p.x, p.y, p.z], [p.x, p.y + h, p.z], [q.x, q.y + h, q.z], [q.x, q.y, q.z], dark); b.quad([q.x, q.y, q.z], [q.x, q.y + h, q.z], [p.x, p.y + h, p.z], [p.x, p.y, p.z], dark); }
      b.quad([a.x, a.y + h, a.z], [c.x, c.y + h, c.z], [c2.x, c2.y + h, c2.z], [a2.x, a2.y + h, a2.z], rock); b.quad([a2.x, a2.y + h, a2.z], [c2.x, c2.y + h, c2.z], [c.x, c.y + h, c.z], [a.x, a.y + h, a.z], shade(rock, 0.5));
      // Rock heaped over the top.
      b.box((a.x + c.x) / 2, a.y + h, (a.z + c.z) / 2, w * 2 + 8, 4 + r() * 2.5, 4.4, mix('teal', 'slate', 0.55), a.yaw);
      if (Math.round(s) % 16 < 4) { const m = trackPoint(tr, s, 0); g.box(m.x, m.y + h - 0.25, m.z, 2.2, 0.18, 0.5, 'sand', m.yaw); }
    }
    for (const s of [s0, s1]) { const m = trackPoint(tr, s, 0), w = tr.width[fix(Math.round(s / tr.ds), tr.N)] / 2 + 4; b.box(m.x, m.y + 6.2, m.z, w * 2 + 3, 1.2, 1, 'mist', m.yaw); const l = trackPoint(tr, s, -w), c = trackPoint(tr, s, w); b.box(l.x, l.y, l.z, 3.2, 7, 1.4, 'mist', m.yaw); b.box(c.x, c.y, c.z, 3.2, 7, 1.4, 'mist', m.yaw); }
    // A red steel viaduct overhead.
    const vs = tr.cornerS[11] + 40, v = trackPoint(tr, vs, 0), vy = v.y + 12, nx = -v.tz, nz = v.tx;
    for (let k = -8; k <= 8; k++) { const px = v.x + nx * k * 14, pz = v.z + nz * k * 14; b.box(px, vy, pz, 15, 1.1, 3.4, 'red', Math.atan2(nx, nz) + Math.PI / 2); if (k !== 0 && Math.abs(k) !== 1) { b.box(px, d.mesh.groundY, pz, 1.1, vy - d.mesh.groundY, 1.1, 'red'); } for (const q of [-1, 1]) b.box(px, vy + 1.1, pz + q * 1.5 * 0, 14, 1.4, 0.3, mix('red', 'plum', 0.3), Math.atan2(nx, nz) + Math.PI / 2); }
    // A waterfall: a rock face, water below, particles falling.
    const wp = d.at(tr.cornerS[3], -1, 20);
    b.box(wp.x, wp.y, wp.z, 26, 24, 8, mix('slate', 'night', 0.25), wp.yaw + Math.PI / 2, mix('teal', 'slate', 0.4));
    b.box(wp.x, wp.y + 1, wp.z, 5, 22, 8.3, 'cyan', wp.yaw + Math.PI / 2);
    const water = d.add(new WaterSurface({ size: [26, 18], at: [wp.x - wp.tz * -10, wp.y + 0.4, wp.z + wp.tx * -10], waves: WAVES_CHOPPY, deep: PALETTE.teal, shallow: PALETTE.cyan, foam: PALETTE.white, segments: [26, 18] }));
    d.mover((dt, t) => water.update(t));
    d.mover((dt, t, _, ctx) => { if (Math.floor(t * 12) !== Math.floor((t - dt) * 12)) ctx.particles.burst('waterfall', [wp.x, wp.y + 21, wp.z]); });
    // A hut and two hikers.
    const hut = d.at(tr.cornerS[1], 1, 12);
    b.box(hut.x, hut.y, hut.z, 5, 2.8, 4, 'orange', 0.3); b.cone(hut.x, hut.y + 2.8, hut.z, 4, 2.2, 4, 'plum', 0, 0.3 + Math.PI / 4);
    for (const q of [0, 1]) { b.box(hut.x + 5 + q * 2, hut.y, hut.z + 3, 0.5, 1.2, 0.3, q ? 'blue' : 'red'); b.box(hut.x + 5 + q * 2, hut.y + 1.2, hut.z + 3, 0.34, 0.3, 0.3, 'sand'); b.box(hut.x + 5 + q * 2, hut.y + 0.6, hut.z + 2.8, 0.4, 0.55, 0.26, 'sand'); }
    d.place('bench', hut.x + 4, hut.y, hut.z - 3, 0.3); d.place('signpost', hut.x - 4, hut.y, hut.z + 3, 0.6);
    // Thin mist.
    d.mover((dt, t, _, ctx, focus) => { if (Math.floor(t * 4) !== Math.floor((t - dt) * 4) && focus) ctx.particles.burst('mist', [focus.x + (r() - 0.5) * 80, focus.y + 2 + r() * 8, focus.z + (r() - 0.5) * 80]); });
  },
  harbour(d) {
    const { tr, b } = d, r = d.r, g = d.glow, night = d.night;
    d.pits('grey');
    d.grandstand(d.at(40, -1, 2), 70, 7, -1);
    // City blocks with lit windows on both sides, and invented neon.
    const words = ['HOTEL FENN', 'OIL BAR', 'NOODLES', 'KAMINARI', 'TSUBAME', 'BENNO', 'VESPUCCI', 'SOAP', 'DANCING', 'CAFE LINE', 'HALCYON', 'BRANDT', 'TYRES 24H', 'LOW OIL'], neon = ['cyan', 'red', 'lime', 'sand', 'sky', 'orange'];
    for (let i = 0; i < tr.N; i += 7) for (const side of [-1, 1]) {
      const s = i * tr.ds; if (tr.pit && side === 1 && (s < tr.pit.out + 10 || s > tr.length + tr.pit.in - 10)) continue;
      if (side === -1 && (s < 330 || s > tr.length - 330)) continue;
      const dist = 7 + r() * 5, p = d.at(s, side, dist), W = 16 + r() * 10, D = 12 + r() * 8, H = 12 + r() * 30, rx = -p.tz * side, rz = p.tx * side, cx = p.x + rx * (D / 2), cz = p.z + rz * (D / 2);
      if (!d.mesh.field.clear(cx, cz, D / 2 + 1)) continue;
      const wall = mix('night', r() > 0.5 ? 'navy' : 'plum', 0.3 + r() * 0.3);
      b.box(cx, p.y, cz, W, H, D, wall, p.yaw + Math.PI / 2, shade(wall, 0.8));
      // Windows on the road face.
      const fx = p.x - rx * 0.02, fz = p.z - rz * 0.02;
      for (let y = 2; y < H - 2; y += 2.4) for (let a = -W / 2 + 1.2; a < W / 2 - 1; a += 2.4) { if (r() < 0.42) continue; const col = r() > 0.75 ? 'orange' : r() > 0.1 ? 'sand' : 'cyan'; (night > 0.3 ? g : b).box(fx + p.tx * a, p.y + y, fz + p.tz * a, 1.2, 1.2, 0.1, night > 0.3 ? col : 'slate', p.yaw + Math.PI / 2); }
      if (r() < 0.42) { const w = r.pick(words), col = r.pick(neon), px = 0.55, len = w.length * 4 * px, y = p.y + 3 + r() * Math.max(1, H - 9); const dirx = -p.tx * side, dirz = -p.tz * side; blockText(g, w, [fx - rx * 0.3 - dirx * len / 2, y, fz - rz * 0.3 - dirz * len / 2], dirx, dirz, px, col, 0.12); }
    }
    // The sea on the driver's left of the front straight, with cranes and containers.
    const mx = (Math.min(...tr.x) + Math.max(...tr.x)) / 2, seaZ = -260, water = d.add(new WaterSurface({ size: [1800, 460], at: [mx, d.mesh.groundY + 2.2, seaZ], waves: WAVES_CALM, deep: PALETTE.navy, shallow: PALETTE.blue, foam: PALETTE.sky, segments: [60, 20], foamAt: 2 }));
    d.mover((dt, t) => water.update(t));
    const quay = -48; b.box(mx, d.mesh.groundY, quay + 12, 1800, 3, 26, mix('slate', 'night', 0.55), 0, mix('mist', 'slate', 0.5));
    for (let k = 0; k < 4; k++) {
      const x = -200 + k * 180, z = quay + 4, y = d.mesh.groundY + 3, col = k % 2 ? 'orange' : 'red';
      for (const q of [-5, 5]) for (const w of [-4, 4]) b.box(x + q, y, z + w, 0.9, 22, 0.9, col);
      b.box(x, y + 22, z, 12, 1.3, 12, col); b.box(x, y + 25, z - 22, 2, 1.1, 66, col); b.box(x, y + 23.2, z + 4, 6, 3, 4, 'white'); g.box(x, y + 26.1, z - 50, 0.5, 0.5, 0.5, 'red'); b.beam([x, y + 29.6, z], [x, y + 26, z - 40], 0.2, 0.2, 'slate'); b.box(x, y + 29, z, 0.8, 1, 0.8, col); b.box(x, y + 16, z - 26, 3, 0.7, 7, 'slate'); b.box(x, y + 13.5, z - 26, 6, 2.5, 2.5, r.pick(['teal', 'red', 'sand']));
    }
    for (let k = 0; k < 70; k++) { const x = -420 + r() * 1000, z = quay + 12 + r() * 16 - 8, n = 1 + Math.floor(r() * 4); for (let q = 0; q < n; q++) b.box(x, d.mesh.groundY + 3 + q * 2.6, z, 12, 2.6, 2.5, r.pick(['red', 'teal', 'blue', 'orange', 'sand', 'slate'])); }
    for (let k = 0; k < 8; k++) d.place(containerDef, -300 + k * 90, d.mesh.groundY + 3, quay + 22, Math.PI / 2);
    for (let k = 0; k < 14; k++) d.place(k % 2 ? 'crate' : 'barrel', -360 + k * 60 + r() * 12, d.mesh.groundY + 3, quay + 6 + r() * 4, r() * 3);
    // A ferry at anchor.
    b.box(mx + 130, d.mesh.groundY + 2, seaZ - 90, 70, 6, 16, 'white', 0.2, 'mist'); b.box(mx + 130, d.mesh.groundY + 8, seaZ - 90, 44, 5, 12, 'red', 0.2); for (let k = -5; k <= 5; k++) g.box(mx + 130 + k * 3.9, d.mesh.groundY + 9.8, seaZ - 83.5 - k * 0.8, 1.4, 1, 0.3, 'sand', 0.2);
    // A Ferris wheel turning in the distance.
    const fw = d.add(new Group()); fw.position.set(760, d.mesh.groundY + 46, 300); const R = 40, wheel = new Group(); fw.add(wheel);
    const ring = new GeoBatch(); for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283, a2 = ((k + 1) / 24) * 6.283, P = [Math.sin(a) * R, Math.cos(a) * R, 0], Q = [Math.sin(a2) * R, Math.cos(a2) * R, 0]; ring.beam([P[0], P[1], 0], [Q[0], Q[1], 0], 1.2, 0.8, k % 2 ? 'cyan' : 'red'); ring.box(P[0], P[1] - 3, 0, 3.2, 3, 2.4, k % 3 === 0 ? 'sand' : k % 3 === 1 ? 'lime' : 'orange'); ring.beam([0, 0, 0], P, 0.4, 0.4, 'mist'); }
    wheel.add(ring.mesh({ glow: true })); d.mover((dt) => { wheel.rotation.z += dt * 0.11; });
    b.beam([fw.position.x - 28, d.mesh.groundY, 300], [fw.position.x, d.mesh.groundY + 46, 300], 1.6, 1.6, 'slate'); b.beam([fw.position.x + 28, d.mesh.groundY, 300], [fw.position.x, d.mesh.groundY + 46, 300], 1.6, 1.6, 'slate');
    // Street lamps. Their light is baked into the road.
    for (const i of d.mesh.lampIdx ?? []) { const side = i % 16 === 0 ? 1 : -1, p = d.at(i * tr.ds, side, -0.3), rx = p.tz * side, rz = -p.tx * side; b.box(p.x, p.y, p.z, 0.2, 7, 0.2, 'slate'); b.beam([p.x, p.y + 7, p.z], [p.x + rx * 2.6, p.y + 7, p.z + rz * 2.6], 0.14, 0.14, 'slate'); g.box(p.x + rx * 2.6, p.y + 6.6, p.z + rz * 2.6, 1, 0.3, 0.5, 'sand', p.yaw); }
    if (night < 0.3) { /* the windows above are unlit at dusk's start; the lamps stay */ }
  },
  saltline(d) {
    const { tr, b } = d, r = d.r;
    d.pits('white');
    d.grandstand(d.at(0, -1, 4), 150, 16, -1);
    d.grandstand(d.at(-300, -1, 6), 60, 9, -1, { roof: false });
    d.grandstand(d.at(tr.cornerS[1], -1, 6), 80, 10, -1, { roof: false, colour: 'plum' });
    // A flag tower in the infield.
    const c = { x: 0, z: 370, y: d.mesh.groundY }; b.box(c.x, c.y, c.z, 6, 30, 6, 'white', 0, 'red'); b.box(c.x, c.y + 30, c.z, 9, 4, 9, 'night', 0, 'white'); d.flag(c.x, c.y + 34, c.z, 'red', [1, 0, 0]);
    blockText(d.b, 'SALTLINE', [c.x - 110, c.y + 3, c.z - 70], 1, 0, 6, 'red', 1.2);
    // Mesas on the horizon, closer than the sky's ring.
    for (let k = 0; k < 20; k++) { const a = r() * 6.283, R = 1000 + r() * 800, x = Math.sin(a) * R, z = 370 + Math.cos(a) * R, w = 90 + r() * 150, h = 40 + r() * 80, col = mix('plum', 'red', r() * 0.4); b.cone(x, c.y, z, w, h, 7, col, w * (0.55 + r() * 0.2), a); }
    // A blimp circling.
    const blimp = d.add(new Group()), bb = new GeoBatch(); bb.ball(0, 0, 0, 13, 'sand', 9, 0.55); bb.box(0, -8.5, 2, 2.4, 1.6, 7, 'night'); bb.box(0, -1, -14, 0.5, 8, 5, 'red'); bb.box(0, -1, -14, 8, 0.5, 5, 'red'); blimp.add(bb.mesh({ cast: true, receive: false })); const bs = new GeoBatch(); blockText(bs, 'TSUBAME', [-11.4, -1.3, 0], 1, 0, 0.82, 'red', 28); blimp.add(bs.mesh({ receive: false })); blimp.scale.setScalar(1.3);
    d.mover((dt, t) => { const a = t * 0.05, R = 560; blimp.position.set(Math.sin(a) * R, d.mesh.groundY + 95, 370 + Math.cos(a) * R); blimp.rotation.y = a + Math.PI / 2; });
    // Dust devils at distance.
    const dev = [[900, 900], [-1000, 200], [260, -600]]; d.mover((dt, t, _, ctx) => { if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) { const q = dev[Math.floor(t * 8) % 3]; ctx.particles.burst('dustDevil', [q[0] + Math.sin(t * 0.3) * 40, d.mesh.groundY + 1, q[1] + Math.cos(t * 0.3) * 40]); } });
    // Painted lines on the salt, as far as you can see.
    for (let k = 0; k < 40; k++) { const a = r() * 6.283, R = 200 + r() * 900; b.box(Math.sin(a) * R, d.mesh.groundY - 0.03, 370 + Math.cos(a) * R, 40 + r() * 80, 0.1, 1.2, mix('white', 'sand', 0.5), a); }
  },
  redclay(d) {
    const { tr, b } = d, r = d.r;
    // A rusted water tower, wooden stands, cacti, arrows and warning boards before crests.
    const w = d.at(tr.cornerS[5], 1, 15); for (const q of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) b.box(w.x + q[0], w.y, w.z + q[1], 0.4, 11, 0.4, mix('orange', 'plum', 0.3)); b.cone(w.x, w.y + 11, w.z, 4, 5, 9, mix('red', 'orange', 0.4), 4); b.cone(w.x, w.y + 16, w.z, 4.2, 1.6, 9, mix('plum', 'red', 0.3)); b.beam([w.x - 2.5, w.y + 3, w.z - 2.5], [w.x + 2.5, w.y + 3, w.z - 2.5], 0.2, 0.2, 'plum');
    for (const c of [1, 4, 8, 10]) d.grandstand(d.at(tr.cornerS[c], -Math.sign(tr.kappa[fix(Math.round(tr.cornerS[c] / tr.ds), tr.N)] || 1), 2.5), 18, 3, -Math.sign(tr.kappa[fix(Math.round(tr.cornerS[c] / tr.ds), tr.N)] || 1), { roof: false, wood: true });
    d.scatter(150, (x, y, z) => d.cactus(x, y, z, 2 + r() * 2.4), { minD: 2, maxD: 42, r: 1 });
    d.scatter(70, (x, y, z) => b.ball(x, y + 0.8, z, 1.1 + r() * 1.5, r() > 0.5 ? mix('red', 'orange', 0.5) : mix('plum', 'red', 0.5), 5, 0.75), { minD: 2, maxD: 30, r: 1 });
    for (const [cs, half] of tr.def.crests ?? []) {
      for (const m of [150, 90, 40]) for (const side of [-1, 1]) { const p = d.at(cs - half - m, side, 0.5); b.box(p.x, p.y, p.z, 0.15, 1.8, 0.15, 'plum'); b.box(p.x, p.y + 1.3, p.z, 1.5, 1, 0.12, 'sand', p.yaw); b.beam([p.x - 0.4 * p.tz, p.y + 1.45, p.z + 0.4 * p.tx], [p.x + 0.4 * p.tz, p.y + 1.45, p.z - 0.4 * p.tx], 0.14, 0.45, 'ink'); }
    }
    tr.cornerS.forEach((cs, k) => { const i = fix(Math.round(cs / tr.ds), tr.N); if (Math.abs(tr.kappa[i]) < 1 / 34) return; const side = tr.kappa[i] > 0 ? -1 : 1; for (const m of [80, 45]) { const p = d.at(cs - m, side, 0.6), dir = side === -1 ? 1 : -1, ax = -p.tz * dir, az = p.tx * dir; b.box(p.x, p.y, p.z, 0.15, 1.6, 0.15, 'plum'); b.box(p.x, p.y + 1.1, p.z, 1.8, 0.9, 0.12, 'white', p.yaw); b.beam([p.x - ax * 0.6, p.y + 1.45, p.z - az * 0.6], [p.x + ax * 0.6, p.y + 1.45, p.z + az * 0.6], 0.16, 0.2, 'red'); } void k; });
    // Dust hangs in the air.
    d.mover((dt, t, _, ctx, focus) => { if (Math.floor(t * 3) !== Math.floor((t - dt) * 3) && focus) ctx.particles.burst('dirtDust', [focus.x + (r() - 0.5) * 70, focus.y + 1 + r() * 5, focus.z + (r() - 0.5) * 70], { count: 1 }); });
  },
  proving(d) {
    const { tr, b } = d, r = d.r, g = d.glow, y0 = d.mesh.groundY;
    // Control tower (the Licence Centre), hangars, painted boxes, cones, a windsock, the examiner's van.
    const t = d.at(120, -1, 16);
    b.box(t.x, t.y, t.z, 8, 16, 8, 'white', 0, 'slate'); b.box(t.x, t.y + 16, t.z, 12, 4, 12, 'navy', 0, 'mist'); g.box(t.x, t.y + 17.5, t.z - 6.05, 11, 1.8, 0.1, 'cyan'); b.box(t.x, t.y + 20, t.z, 13, 0.5, 13, 'mist'); b.box(t.x, t.y + 20.5, t.z, 0.4, 5, 0.4, 'slate');
    blockText(b, 'LICENCE', [t.x + 13.5, t.y + 8, t.z + 4.1], -1, 0, 1, 'red', 0.3);
    for (let k = 0; k < 5; k++) { const h = d.at(300 + k * 56, -1, 30), W = 40, D = 26, H = 13; b.box(h.x, h.y, h.z, W, H, D, k % 2 ? mix('mist', 'slate', 0.3) : mix('slate', 'mist', 0.2), 0, 'slate'); b.box(h.x, h.y + H - 0.2, h.z, W + 1, 0.4, D + 1, 'white'); b.box(h.x, h.y, h.z + D / 2 + 0.05, W - 6, H - 3, 0.1, 'night'); }
    // A retired airliner's tail, as old airfields have.
    const j = d.at(740, -1, 40); b.box(j.x, j.y + 3, j.z, 5, 4.5, 40, 'white', 0.3); b.box(j.x, j.y + 6, j.z - 16, 0.6, 8, 8, 'red', 0.3); b.box(j.x, j.y + 4, j.z + 2, 34, 0.6, 7, 'mist', 0.3);
    // Painted boxes and cones on the apron.
    for (const s of [120, 200, 280, 400, 520]) for (const side of [-1, 1]) { const p = d.at(s, side, -9); b.box(p.x, y0 + 0.03 + Math.max(p.y - y0, 0) * 0, p.z, 6, 0.04, 6, 'sand', p.yaw); }
    d.scatter(60, (x, y, z) => { b.cone(x, y, z, 0.28, 0.75, 5, 'orange'); b.box(x, y, z, 0.6, 0.06, 0.6, 'orange'); }, { minD: -12, maxD: 4, r: -14 });
    // Windsock on a pole, by cloth.
    const w = d.at(60, 1, 8); b.box(w.x, w.y, w.z, 0.2, 8, 0.2, 'white');
    const sock = clothGrid({ width: 3.4, height: 0.9, cols: 10, rows: 4, origin: [w.x, w.y + 8, w.z], across: [1, 0, 0.3], pin: 'left' }); sock.wind = [9, 0.6, 2]; sock.gust = 0.9; sock.drag = 0.6; const sm = new SoftMesh(sock, toonMaterial(PALETTE.orange), { doubleSided: true }); sm.castShadow = false; d.add(sm); d.fixed.push((dt) => sock.step(dt)); d.mover(() => sm.sync());
    // The examiner's van, beside the tower.
    const v = { x: t.x + 12, y: t.y, z: t.z + 8 }; b.box(v.x, v.y + 0.4, v.z, 2, 2, 4.6, 'white', 0.4, 'mist'); b.box(v.x, v.y + 0.3, v.z, 2.1, 0.5, 4.7, 'navy', 0.4); g.box(v.x - 0.2, v.y + 2.4, v.z, 0.8, 0.2, 0.3, 'orange', 0.4); for (const q of [-1, 1]) for (const e of [-1, 1]) b.box(v.x + q * 1, v.y, v.z + e * 1.5, 0.3, 0.6, 0.6, 'ink', 0.4);
    d.scatter(70, (x, y, z) => d.oak(x, y, z, 2, 4.5), { minD: 24, maxD: 110, r: 4 });
    void r;
  },
};
export function buildDressing(ctx, tr, mesh, hour, night) {
  const d = new Dress(ctx, tr, mesh, hour); d.night = night;
  DRESS[tr.id]?.(d);
  const lamps = d.gantry();
  d.finish();
  return { group: d.group, update: (dt, t, cheer, focus) => { for (const fn of d.movers) fn(dt, t, cheer, ctx, focus); }, fixedUpdate: (dt) => { for (const fn of d.fixed) fn(dt); }, lamps, tunnel: d.tunnel };
}
void rgb;
