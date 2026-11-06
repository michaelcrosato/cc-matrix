// Builds the circuit from a `tr` record (sim.buildTrack): road bands, kerbs, lines, skirts, barriers, boards.  Plan section 8 / recipe C5.
import { THREE, toonMaterial, PALETTE, createNoise } from '../../pixel-engine.js';
const { BufferGeometry, Float32BufferAttribute, Mesh, Color, Group } = THREE;
const col = (name) => new Color(PALETTE[name] ?? name);
const mix = (a, b, t) => col(a).lerp(col(b), t);

class Soup { // triangles with per-triangle colour, no shared vertices
  constructor() { this.pos = []; this.col = []; }
  tri(a, b, c, color, both = false) { for (const v of [a, b, c]) this.pos.push(v[0], v[1], v[2]); for (let k = 0; k < 3; k++) this.col.push(color.r, color.g, color.b); if (both) this.tri(a, c, b, color); }
  quad(a, b, c, d, color, both = false) { this.tri(a, b, c, color, both); this.tri(a, c, d, color, both); }
  mesh(opts = {}) {
    const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(this.pos, 3)); g.setAttribute('color', new Float32BufferAttribute(this.col, 3)); g.computeVertexNormals();
    const m = new Mesh(g, toonMaterial(0xffffff, { vertexColors: true })); m.receiveShadow = opts.receive ?? true; m.castShadow = opts.cast ?? false; m.frustumCulled = false; return m;
  }
}
const THEMES = {
  kestrel: { ground: ['green', 'lime'], rock: 'teal', wall: ['white', 'slate'], road: ['slate', '#4a5568'], barrier: 'armco' },
  cedar: { ground: ['green', 'teal'], rock: 'slate', wall: ['slate', 'mist'], road: ['slate', '#4a5568'], barrier: 'armco' },
  harbour: { ground: ['night', 'slate'], rock: 'night', wall: ['mist', 'red'], road: ['#3f4658', '#2e3446'], barrier: 'concrete' },
  saltline: { ground: ['white', 'mist'], rock: 'mist', wall: ['white', 'red'], road: ['slate', '#4a5568'], barrier: 'tyres' },
  redclay: { ground: ['orange', 'sand'], rock: 'red', wall: ['sand', 'orange'], road: ['orange', '#c8602a'], barrier: 'fence' },
  proving: { ground: ['sand', 'mist'], rock: 'sand', wall: ['white', 'slate'], road: ['slate', '#4a5568'], barrier: 'cones' },
};
export const trackTheme = (id) => THEMES[id] ?? THEMES.kestrel;

export function buildTrackMesh(tr, id, { night = 0 } = {}) {
  const T = trackTheme(id), group = new Group(), N = tr.N, noise = createNoise(7 + id.length);
  const P = (i, t, lift = 0) => { const k = ((i % N) + N) % N; return [tr.x[k] - tr.tz[k] * t, tr.y[k] + lift - t * Math.sin(tr.bank[k]), tr.z[k] + tr.tx[k] * t]; };
  const dirt = tr.surface === 'dirt';
  const road = new Soup(), kerb = new Soup(), lines = new Soup(), ground = new Soup(), wallS = new Soup(), boards = new Soup();
  const roadA = col(T.road[0]), roadB = col(T.road[1]);
  const band = (S, i, t0, t1, lift, color) => { const a = P(i, t0, lift), b = P(i, t1, lift), c = P(i + 1, t1, lift), d = P(i + 1, t0, lift); if (t0 < t1) S.quad(a, b, c, d, color, true); else S.quad(a, d, c, b, color, true); };
  // corner flags: kerb on the inside of corners
  const kerbSide = (i) => { const k = tr.kappa[i % N]; return Math.abs(k) > 0.004 ? Math.sign(k) : 0; };
  for (let i = 0; i < N; i++) {
    const h = tr.width[i] / 2, shade = (i % 4 < 2) ? roadA : roadB;
    band(road, i, -h, h, 0, shade);
    if (!dirt) {
      band(lines, i, -h + 0.25, -h + 0.5, 0.03, col('white')); band(lines, i, h - 0.5, h - 0.25, 0.03, col('white'));
      if (tr.def.pit && i % 6 < 3 && (i < 70 || i > N - 70)) band(lines, i, -0.1, 0.1, 0.03, col('white'));
    } else if (i % 5 < 2) band(lines, i, -0.35, 0.35, 0.02, mix(T.road[0], 'night', 0.25)); // wheel ruts
    const ks = kerbSide(i);
    for (const s of [-1, 1]) {
      const inner = ks === s || ks === -s && false; if (!inner && !(Math.abs(tr.kappa[i]) > 0.012 && ks === -s)) continue;
      band(kerb, i, s * h, s * (h + 1.6), 0.02, i % 2 ? col('red') : col('white'));
    }
  }
  // start line: chequer in 2 rows of 6 on the first samples
  const sl = new Soup(); for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 12; c2++) { const h = tr.width[0] / 2, t0 = -h + (c2 * 2 * h) / 12, t1 = t0 + (2 * h) / 12, i = r * 0.5; const a = P(0, t0, 0.04), b = P(0, t1, 0.04), c3 = P(1, t1, 0.04), d = P(1, t0, 0.04); const mid = (p, q, f) => p.map((v, k) => v + (q[k] - v) * f); const a2 = mid(a, d, i), d2 = mid(a, d, i + 0.5), b2 = mid(b, c3, i), c4 = mid(b, c3, i + 0.5); sl.quad(a2, b2, c4, d2, (c2 + r) % 2 ? col('white') : col('ink'), true); }
  // skirts and ground: flat runoff to the barrier, then embankment to a ground plane
  let minY = Infinity; for (let i = 0; i < N; i++) minY = Math.min(minY, tr.y[i]);
  const groundY = id === 'cedar' ? minY - 6 : minY - 1.2, reach = new Float64Array(N).fill(110);
  for (let i = 0; i < N; i += 2) for (let j = 0; j < N; j += 3) { const dd = Math.hypot(tr.x[i] - tr.x[j], tr.z[i] - tr.z[j]); const sep = Math.min(Math.abs(i - j), N - Math.abs(i - j)) * tr.ds; if (sep > 120 && dd < 260) reach[i] = Math.min(reach[i], Math.max(18, dd * 0.38)); }
  const cols = [0, 1, 4, 10, 24, 50, 90]; // distance beyond the barrier
  const gcol = (i, d, side) => { const n = noise.fbm2(tr.x[i % N] * 0.03 + side, tr.z[i % N] * 0.03); const t = Math.max(0, Math.min(1, 0.5 + n * 0.9)); return mix(T.ground[0], T.ground[1], t).lerp(col(T.rock), Math.min(0.7, d / 140)); };
  for (const s of [-1, 1]) for (let i = 0; i < N; i++) {
    const h = tr.width[i] / 2, wallD = s > 0 ? tr.wallR[i] : tr.wallL[i], R = Math.min(reach[i % N], 110), edge = P(i, s * (h + wallD)), edge2 = P(i + 1, s * (h + wallD));
    const pts = (ii) => { const o = [P(ii, s * (h + 0.0), -0.04), P(ii, s * (h + wallD), -0.04)]; const kk = ii % N, hh = tr.width[kk] / 2, wd = s > 0 ? tr.wallR[kk] : tr.wallL[kk], base = P(ii, s * (hh + wd), -0.04); for (let k = 1; k < cols.length; k++) { const d = Math.min(cols[k], R), u = d / R, f = Math.pow(Math.max(0, 1 - u), 1.5), y = groundY + (base[1] - groundY) * f * 0.9 + noise.fbm2(tr.x[kk] * 0.05 + k, tr.z[kk] * 0.05) * 1.6 * u; const t = s * (hh + wd + d); const bx = tr.x[kk] - tr.tz[kk] * t, bz = tr.z[kk] + tr.tx[kk] * t; o.push([bx, Math.min(y, base[1] - 0.05 - u * 0.2) , bz]); } return o; };
    const A = pts(i), B = pts(i + 1);
    for (let k = 0; k < A.length - 1; k++) { const c = gcol(i, cols[Math.min(k, cols.length - 1)], s); const q = [A[k], A[k + 1], B[k + 1], B[k]]; if (s > 0) ground.quad(q[0], q[3], q[2], q[1], c, true); else ground.quad(q[0], q[1], q[2], q[3], c, true); }
    // barrier
    const [wc1, wc2] = T.wall, hard = Math.abs(tr.kappa[i % N]) > 0.01, wcol = (Math.floor(i / 3) % 2) ? col(wc1) : (hard ? col('red') : col(wc2));
    const a0 = P(i, s * (h + wallD)), a1 = P(i + 1, s * (h + wallD)); const top = (p, hh) => [p[0], p[1] + hh, p[2]];
    const bh = T.barrier === 'concrete' ? 1.1 : T.barrier === 'tyres' ? 0.9 : T.barrier === 'fence' ? 0.8 : T.barrier === 'cones' ? 0.25 : 0.8;
    wallS.quad(a0, a1, top(a1, bh), top(a0, bh), wcol, true);
    if (T.barrier !== 'cones') wallS.quad(top(a0, bh), top(a1, bh), top(a1, bh + 0.0), top(a0, bh), wcol, true);
    if (T.barrier === 'tyres' && i % 2 === 0) { const q = P(i, s * (h + wallD + 0.5)); wallS.quad(a0, a1, top(a1, 0.5), top(a0, 0.5), col('ink'), true); }
  }
  // braking boards 300/200/100 m before each major corner
  for (let ci = 0; ci < tr.cornerS.length; ci++) { const k = Math.abs(tr.kappa[Math.round(tr.cornerS[ci] / tr.ds) % N]); if (k < 0.008) continue; for (const d of [300, 200, 100]) { const idx = Math.round((tr.cornerS[ci] - d) / tr.ds + N) % N, sgn = Math.sign(tr.kappa[Math.round(tr.cornerS[ci] / tr.ds) % N]) || 1, h = tr.width[idx] / 2; const p0 = P(idx, -sgn * (h + 2.2)), p1 = P(idx, -sgn * (h + 3)); const b = (d / 100) | 0; const w = col(d === 100 ? 'red' : 'white'); boards.quad([p0[0], p0[1] + 1, p0[2]], [p1[0], p1[1] + 1, p1[2]], [p1[0], p1[1] + 2.6, p1[2]], [p0[0], p0[1] + 2.6, p0[2]], w, true); boards.quad([p0[0], p0[1], p0[2]], [p1[0], p1[1], p1[2]], [p1[0], p1[1] + 1.1, p1[2]], [p0[0], p0[1] + 1.1, p0[2]], col('slate'), true); for (let k = 0; k < b; k++) { const q = P(idx, -sgn * (h + 2.3 + k * 0.28), 0); boards.quad([q[0], q[1] + 1.4, q[2]], [q[0], q[1] + 2.3, q[2]], [q[0] + 0.1, q[1] + 2.3, q[2]], [q[0] + 0.1, q[1] + 1.4, q[2]], col('ink'), true); } } }
  const meshes = [road, kerb, lines, sl, ground, wallS, boards].map((s) => s.mesh({ receive: s !== boards }));
  for (const m of meshes) group.add(m);
  // a very large flat ground plane beyond the skirts
  const gp = new Soup(); const cx = (Math.min(...tr.x) + Math.max(...tr.x)) / 2, cz = (Math.min(...tr.z) + Math.max(...tr.z)) / 2, S = 6000; gp.quad([cx - S, groundY - 0.3, cz - S], [cx - S, groundY - 0.3, cz + S], [cx + S, groundY - 0.3, cz + S], [cx + S, groundY - 0.3, cz - S], col(T.ground[0]).lerp(col(T.rock), 0.35), true); group.add(gp.mesh());
  const skirtY = (kk, s, d) => { kk = ((kk % N) + N) % N; const hh = tr.width[kk] / 2, wd = s > 0 ? tr.wallR[kk] : tr.wallL[kk], base = P(kk, s * (hh + wd), -0.04), R = Math.min(reach[kk], 110); let k = 1; while (k < cols.length - 1 && cols[k] < d) k++; const dd = Math.min(Math.max(d, 0), R), u = dd / R, f = Math.pow(Math.max(0, 1 - u), 1.5), y = groundY + (base[1] - groundY) * f * 0.9 + noise.fbm2(tr.x[kk] * 0.05 + k, tr.z[kk] * 0.05) * 1.6 * u; return Math.min(y, base[1] - 0.05 - u * 0.2); };
  group.userData = { groundY, skirtY, reach, P };
  return group;
}

// Skid marks: a ring buffer of dark quads.
export class Skids {
  constructor(max = 1500) { this.max = max; this.n = 0; this.pos = new Float32Array(max * 18); const g = new BufferGeometry(); this.attr = new Float32BufferAttribute(this.pos, 3); this.attr.setUsage?.(THREE.DynamicDrawUsage); g.setAttribute('position', this.attr); g.setDrawRange(0, 0); this.mesh = new Mesh(g, toonMaterial(PALETTE.ink)); this.mesh.frustumCulled = false; this.last = new Map(); }
  add(key, x, y, z, yaw, wdt = 0.22) {
    const l = this.last.get(key); this.last.set(key, [x, y, z]); if (!l) return; const dx = x - l[0], dz = z - l[2]; if (dx * dx + dz * dz > 25) return; const nl = Math.hypot(dx, dz) || 1, px = (-dz / nl) * wdt, pz = (dx / nl) * wdt, o = (this.n % this.max) * 18, p = this.pos, yy = y + 0.05;
    const v = [l[0] - px, yy, l[2] - pz, l[0] + px, yy, l[2] + pz, x + px, yy, z + pz, l[0] - px, yy, l[2] - pz, x + px, yy, z + pz, x - px, yy, z - pz]; for (let k = 0; k < 18; k++) p[o + k] = v[k]; this.n++;
    this.attr.needsUpdate = true; this.mesh.geometry.setDrawRange(0, Math.min(this.n, this.max) * 6);
  }
  lift(key) { this.last.delete(key); }
}
