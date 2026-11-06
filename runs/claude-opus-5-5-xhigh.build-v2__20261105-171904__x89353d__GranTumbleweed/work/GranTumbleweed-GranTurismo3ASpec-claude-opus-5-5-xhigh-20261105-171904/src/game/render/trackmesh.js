// Builds the circuit from the sim's track record: road bands, kerbs, lines, skirts of terrain, barriers and boards.
import { THREE } from '../../pixel-engine.js';
import { GeoBatch, mix, noise2, seeded, shade } from './geo.js';
import { PIT_WIDTH } from '../sim/race.js';
const { Group } = THREE;
export const THEMES = {
  kestrel: { road: mix('night', 'slate', 0.2), road2: mix('night', 'slate', 0.34), ground: 'green', ramp: ['green', mix('green', 'lime', 0.35), mix('green', 'teal', 0.5), 'green', mix('green', 'sand', 0.2)], barrier: 'armco', hill: 12, fence: 'white', far: ['teal', mix('teal', 'navy', 0.5)] },
  cedar: { road: mix('night', 'slate', 0.15), road2: mix('night', 'slate', 0.28), ground: 'teal', ramp: [mix('teal', 'green', 0.4), 'teal', mix('teal', 'navy', 0.25), mix('slate', 'teal', 0.5), mix('green', 'teal', 0.6)], barrier: 'armco', hill: 26, rise: 1, far: ['navy', mix('navy', 'slate', 0.4)] },
  harbour: { road: mix('night', 'ink', 0.25), road2: mix('night', 'ink', 0.05), ground: 'night', ramp: ['night', mix('night', 'slate', 0.25), mix('night', 'ink', 0.4)], barrier: 'concrete', hill: 0, flat: true, far: ['ink', mix('ink', 'navy', 0.6)] },
  saltline: { road: mix('night', 'slate', 0.1), road2: mix('night', 'slate', 0.24), ground: 'white', ramp: ['white', mix('white', 'mist', 0.35), mix('white', 'sand', 0.3), mix('white', 'mist', 0.6)], barrier: 'catch', hill: 0.5, flat: true, far: ['plum', mix('plum', 'red', 0.45)] },
  redclay: { road: mix('orange', 'plum', 0.3), road2: mix('orange', 'plum', 0.42), ground: 'orange', ramp: ['orange', mix('orange', 'red', 0.5), mix('orange', 'sand', 0.35), mix('red', 'plum', 0.4), 'red'], barrier: 'tyres', hill: 6, canyon: true, far: ['plum', mix('red', 'plum', 0.5)] },
  proving: { road: mix('night', 'slate', 0.3), road2: mix('night', 'slate', 0.42), ground: mix('slate', 'green', 0.3), ramp: [mix('slate', 'green', 0.3), mix('slate', 'green', 0.45), 'slate', mix('slate', 'mist', 0.4)], barrier: 'none', hill: 1, flat: true, far: ['teal', mix('slate', 'navy', 0.5)] },
};
const P = (tr, k, t, lift = 0) => { const i = k % tr.N; return [tr.x[i] - tr.tz[i] * t, tr.y[i] + lift - t * Math.sin(tr.bank[i]), tr.z[i] + tr.tx[i] * t]; };
// A strip of the road from offset fn from() to fn to(), one quad per sample, colours unshared.
export function ribbon(b, tr, from, to, lift, colourAt, range = null) {
  const up = from(10) < to(10);
  const each = (i) => {
    const col = colourAt(i); if (col === null) return;
    const hA = tr.width[i % tr.N] / 2, hD = tr.width[(i + 1) % tr.N] / 2, a = P(tr, i, from(hA), lift), e0 = P(tr, i, to(hA), lift), d = P(tr, i + 1, from(hD), lift), f = P(tr, i + 1, to(hD), lift);
    if (up) { b.tri(a, e0, d, col); b.tri(e0, f, d, col); } else { b.tri(a, d, e0, col); b.tri(e0, d, f, col); }
  };
  if (range) for (const i of range) each(i); else for (let i = 0; i < tr.N; i++) each(i);
}
// A hash of track samples, so a skirt can stop before it reaches another part of the circuit and props can stay off the road.
export class TrackField {
  constructor(tr, cell = 40) { this.tr = tr; this.cell = cell; this.map = new Map(); for (let i = 0; i < tr.N; i += 2) { const k = this.key(tr.x[i], tr.z[i]); let a = this.map.get(k); if (!a) this.map.set(k, (a = [])); a.push(i); } }
  key(x, z) { return `${Math.floor(x / this.cell)}:${Math.floor(z / this.cell)}`; }
  // Distance from (x, z) to the nearest road centre within reach.
  nearest(x, z, reach = 160) {
    const c = this.cell, n = Math.ceil(reach / c), cx = Math.floor(x / c), cz = Math.floor(z / c), tr = this.tr; let best = Infinity, bi = -1;
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const l = this.map.get(`${cx + a}:${cz + b}`); if (!l) continue; for (const i of l) { const d = (x - tr.x[i]) ** 2 + (z - tr.z[i]) ** 2; if (d < best) { best = d; bi = i; } } }
    return { d: Math.sqrt(best), i: bi };
  }
  clear(x, z, r = 0) { const { d, i } = this.nearest(x, z, 60 + r); if (i < 0) return true; const tr = this.tr; return d > tr.width[i] / 2 + Math.max(tr.wallL[i], tr.wallR[i]) + 2 + r; }
}
export function roadColourFns(tr, theme, opts = {}) {
  const lamps = opts.lamps ?? null;
  return (i) => {
    const base = i % 4 < 2 ? theme.road : theme.road2;
    if (lamps) { const k = lamps[i % tr.N]; if (k > 0) return mix(base, 'sand', k * 0.5); }
    return base;
  };
}
export function buildTrackMesh(tr, line, opts = {}) {
  const { lamps = null, speeds = null, night = false } = opts;
  const theme = THEMES[tr.id], group = new Group(), road = new GeoBatch(), land = new GeoBatch(), rails = new GeoBatch(), n2 = noise2(tr.id.length * 7 + 3), rnd = seeded(tr.N), field = new TrackField(tr), dirt = tr.surface === 'dirt';
  // ---- road ----
  const roadCol = roadColourFns(tr, theme, { lamps });
  ribbon(road, tr, (h) => -h, (h) => h, 0, roadCol);
  // Rubber: a darker strip on the racing line where the speed profile falls.
  if (speeds && !dirt) { const dark = shade(theme.road, 0.72); for (let i = 0; i < tr.N; i++) { if (speeds[(i + 1) % tr.N] < speeds[i] - 0.05) { const o = line.off[i], o2 = line.off[(i + 1) % tr.N]; road.tri(P(tr, i, o - 0.8, 0.012), P(tr, i, o + 0.8, 0.012), P(tr, i + 1, o2 - 0.8, 0.012), dark); road.tri(P(tr, i, o + 0.8, 0.012), P(tr, i + 1, o2 + 0.8, 0.012), P(tr, i + 1, o2 - 0.8, 0.012), dark); } } }
  // Kerbs on the inside of corners, red and white every 4 m; edge lines; centre dashes on the pit straight.
  const kerbHere = (i, s) => Math.abs(tr.kappa[i]) > 1 / 240 && Math.sign(tr.kappa[i]) === s;
  if (!dirt) {
    for (const s of [-1, 1]) {
      ribbon(road, tr, (h) => s * h, (h) => s * (h + 1.6), 0.02, (i) => {
        const near = [-4, -2, 0, 2, 4, 6].some((o) => kerbHere((i + o + tr.N) % tr.N, s));
        return near ? (i % 2 ? 'red' : 'white') : mix(theme.ground === 'night' ? 'night' : theme.road2, 'mist', 0.1);
      });
      ribbon(road, tr, (h) => s * (h - 0.55), (h) => s * (h - 0.3), 0.03, () => 'white');
    }
    const straight = (i) => { const d = i * tr.ds; return tr.pit && (d < tr.pit.out || d > tr.length + tr.pit.in); };
    ribbon(road, tr, () => -0.15, () => 0.15, 0.03, (i) => (i % 4 === 0 && straight(i) ? 'white' : null));
  } else {
    for (const s of [-1, 1]) ribbon(road, tr, (h) => s * h, (h) => s * (h + 1.6), 0.01, (i) => (i % 3 ? mix('orange', 'sand', 0.25) : mix('orange', 'plum', 0.15)));
    ribbon(road, tr, () => -2.6, () => -1.9, 0.015, () => mix(theme.road, 'ink', 0.25)); ribbon(road, tr, () => 1.9, () => 2.6, 0.015, () => mix(theme.road, 'ink', 0.25));
  }
  // Start line: chequered, and a grid of painted boxes.
  { const cols = 10, k0 = 0, w = tr.width[k0], len = 2.4; for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) { const tx = tr.tx[k0], tz = tr.tz[k0], t0 = -w / 2 + (c * w) / cols, t1 = t0 + w / cols, s0 = r * len / 2, s1 = s0 + len / 2, Q = (t, s) => [tr.x[k0] - tz * t + tx * s, tr.y[k0] + 0.04 - t * Math.sin(tr.bank[k0]), tr.z[k0] + tx * t + tz * s]; const col = (r + c) % 2 ? 'white' : 'ink'; road.tri(Q(t0, s0), Q(t1, s0), Q(t0, s1), col); road.tri(Q(t1, s0), Q(t1, s1), Q(t0, s1), col); } }
  for (let row = 0; row < 4; row++) for (const side of [-1, 1]) { const S = tr.length - 12 - row * 9, i = Math.round(S / tr.ds) % tr.N, tx = tr.tx[i], tz = tr.tz[i], Q = (t, s) => [tr.x[i] - tz * t + tx * s, tr.y[i] + 0.04, tr.z[i] + tx * t + tz * s], t0 = side * 2.6 - 1.2, t1 = side * 2.6 + 1.2; road.tri(Q(t0, 0), Q(t1, 0), Q(t0, 0.3), 'white'); road.tri(Q(t1, 0), Q(t1, 0.3), Q(t0, 0.3), 'white'); }
  // Pit lane: an apron along the driver's right, with the entry line and the boxes.
  if (tr.pit) {
    const isPit = (i) => { let d = i * tr.ds; if (d > tr.length / 2) d -= tr.length; return d >= (tr.pit.lead ?? tr.pit.in) && d <= tr.pit.out; };
    const apron = mix('slate', 'night', 0.4);
    ribbon(road, tr, (h) => h + 1.6, (h) => h + PIT_WIDTH + 2, 0.015, (i) => (isPit(i) ? apron : null));
    ribbon(road, tr, (h) => h + 1.6, (h) => h + 1.9, 0.03, (i) => (isPit(i) && i % 3 !== 0 ? 'white' : null));
    ribbon(road, tr, (h) => h - 3, (h) => h + 1.6, 0.05, (i) => { let d = i * tr.ds; if (d > tr.length / 2) d -= tr.length; return Math.abs(d - tr.pit.in) < 5 && (i % 2 === 0) ? 'sand' : null; });
    ribbon(road, tr, (h) => h + 5, (h) => h + 7.4, 0.03, (i) => { let d = i * tr.ds; if (d > tr.length / 2) d -= tr.length; return Math.abs(d - tr.pit.box) < 56 && Math.round(d / 4) % 3 === 0 ? 'sand' : null; });
  }
  // ---- terrain skirts ----
  const groundY = Math.min(...tr.y) - 3, cols = [0, 3, 8, 16, 30, 55, 85, 120], ramp = theme.ramp;
  const heightAt = (i, side, d, baseY) => {
    const x = tr.x[i], z = tr.z[i], nv = n2(x * 0.012 + side * 3, z * 0.012), k = Math.min(1, d / 60);
    if (theme.flat) return baseY + (groundY - baseY) * Math.min(1, d / 18) + (theme.hill ?? 0) * nv * k;
    let h = baseY + (groundY - baseY) * k * k * (3 - 2 * k) + (theme.hill ?? 6) * (nv - 0.25) * k * 1.4;
    if (theme.rise) { const up = n2(x * 0.006, z * 0.006 + side) - 0.42; if (up > 0) h += up * 110 * Math.min(1, d / 40); }
    if (theme.canyon) { const wall = n2(x * 0.008 + 9, z * 0.008 + side * 4), rise = Math.max(0, Math.min(1, (d - 16) / 28)); h += rise * rise * (20 + wall * 34) * (0.55 + 0.45 * n2(x * 0.03, z * 0.03)); }
    return h;
  };
  const step = 2, maxReach = cols[cols.length - 1];
  const lim = { [-1]: new Float32Array(tr.N), 1: new Float32Array(tr.N) };
  for (let i = 0; i < tr.N; i += step) for (const side of [-1, 1]) {
    const half = tr.width[i] / 2, rx = -tr.tz[i] * side, rz = tr.tx[i] * side; let reach = maxReach;
    for (let d = 10; d <= maxReach; d += 10) { const px = tr.x[i] + rx * (half + d), pz = tr.z[i] + rz * (half + d), { d: near } = field.nearest(px, pz, Math.min(120, d + 40)); if (near < (half + d) * 0.9 - 4) { reach = Math.max(4, (d - 10) * 0.95); break; } }
    lim[side][i] = reach;
  }
  for (const side of [-1, 1]) {
    // Smooth the reach a little, so the skirt's edge doesn't saw back and forth.
    const r = lim[side], rs = new Float32Array(tr.N);
    for (let i = 0; i < tr.N; i += step) { let m = Infinity; for (let o = -6; o <= 6; o += step) m = Math.min(m, r[(i + o + tr.N * 2) % tr.N - ((i + o + tr.N * 2) % tr.N) % step] || m); rs[i] = m; }
    for (let i = 0; i < tr.N; i += step) {
      const j = (i + step) % tr.N;
      for (let c = 0; c < cols.length - 1; c++) {
        const d0 = Math.min(cols[c], rs[i]), d1 = Math.min(cols[c + 1], rs[i]), d2 = Math.min(cols[c], rs[j]), d3 = Math.min(cols[c + 1], rs[j]);
        if (d1 <= d0 + 0.01 && d3 <= d2 + 0.01) continue;
        const pt = (k, d) => { const h = tr.width[k] / 2 + 1.5 + d, y = heightAt(k, side, d, tr.y[k] - (h * side) * Math.sin(tr.bank[k])); return [tr.x[k] - tr.tz[k] * h * side, y - (d === 0 ? 0.03 : 0), tr.z[k] + tr.tx[k] * h * side]; };
        const a = pt(i, d0), b = pt(i, d1), e = pt(j, d2), f = pt(j, d3), nv = n2(a[0] * 0.03, a[2] * 0.03), col = ramp[Math.floor((nv * 1.6 + (c % 2) * 0.12 + rnd() * 0.08) * ramp.length) % ramp.length];
        const flip = side > 0;
        if (flip) { land.tri(a, b, e, col); land.tri(b, f, e, col); } else { land.tri(a, e, b, col); land.tri(b, e, f, col); }
      }
    }
  }
  // The flat ground under everything.
  { const S = 7000, y = groundY - 0.05, cx = (Math.min(...tr.x) + Math.max(...tr.x)) / 2, cz = (Math.min(...tr.z) + Math.max(...tr.z)) / 2; const c = mix(theme.ground, ramp[1] ?? theme.ground, 0.3); land.quad([cx - S, y, cz - S], [cx - S, y, cz + S], [cx + S, y, cz + S], [cx + S, y, cz - S], c); }
  // ---- barriers ----
  const wallPoint = (k, side, up = 0) => { const off = side > 0 ? tr.wallR[k] : tr.wallL[k], t = side * (tr.width[k] / 2 + off + 1.1); return [tr.x[k] - tr.tz[k] * t, tr.y[k] + up - t * Math.sin(tr.bank[k]), tr.z[k] + tr.tx[k] * t]; };
  if (theme.barrier !== 'none') for (const side of [-1, 1]) for (let i = 0; i < tr.N; i++) {
    const j = (i + 1) % tr.N, hard = Math.abs(tr.kappa[i]) > 1 / 70, a = wallPoint(i, side), b = wallPoint(j, side);
    const paint = hard && i % 4 < 2;
    if (theme.barrier === 'armco') { const col = paint ? (i % 2 ? 'red' : 'white') : 'mist', u = (v, y) => [v[0], v[1] + y, v[2]]; rails.quad(u(a, 0.35), u(b, 0.35), u(b, 0.85), u(a, 0.85), col); rails.quad(u(b, 0.35), u(a, 0.35), u(a, 0.85), u(b, 0.85), col); if (i % 2 === 0) rails.box(a[0], a[1], a[2], 0.18, 0.9, 0.18, 'slate'); }
    else if (theme.barrier === 'concrete') { const col = paint ? (i % 2 ? 'red' : 'white') : mix('mist', 'slate', 0.45), u = (v, y) => [v[0], v[1] + y, v[2]]; rails.quad(u(a, 0), u(b, 0), u(b, 1.1), u(a, 1.1), col); rails.quad(u(b, 0), u(a, 0), u(a, 1.1), u(b, 1.1), col); rails.quad(u(a, 1.1), u(b, 1.1), [b[0] + side * tr.tz[i] * 0.3 * -1, b[1] + 1.1, b[2] + side * tr.tx[i] * 0.3], [a[0] + side * tr.tz[i] * 0.3 * -1, a[1] + 1.1, a[2] + side * tr.tx[i] * 0.3], 'white'); }
    else if (theme.barrier === 'catch') { const u = (v, y) => [v[0], v[1] + y, v[2]], col = paint ? 'red' : 'mist'; rails.quad(u(a, 0), u(b, 0), u(b, 0.9), u(a, 0.9), col); rails.quad(u(b, 0), u(a, 0), u(a, 0.9), u(b, 0.9), col); if (i % 3 === 0) rails.box(a[0], a[1], a[2], 0.14, 3.4, 0.14, 'slate'); rails.beam([a[0], a[1] + 3.3, a[2]], [b[0], b[1] + 3.3, b[2]], 0.08, 0.08, 'slate'); rails.beam([a[0], a[1] + 2.1, a[2]], [b[0], b[1] + 2.1, b[2]], 0.05, 0.05, 'slate'); }
    else if (theme.barrier === 'tyres') { if (hard || i % 3 === 0) { const col = paint ? (i % 2 ? 'red' : 'white') : 'ink'; rails.cone(a[0], a[1], a[2], 0.42, 0.45, 6, col, 0.42); rails.cone(a[0], a[1] + 0.45, a[2], 0.42, 0.42, 6, 'ink', 0.42); } }
  }
  // ---- braking boards at 300, 200, 100 m before major corners ----
  tr.cornerS.forEach((cs, ci) => {
    const k = Math.round(cs / tr.ds) % tr.N;
    if (Math.abs(tr.kappa[k]) < 1 / 90) return;
    const side = tr.kappa[k] > 0 ? -1 : 1; // the board on the outside
    for (const m of [300, 200, 100]) {
      const b = (k - Math.round(m / tr.ds) + tr.N) % tr.N, a = wallPoint(b, side), tall = 1.3 + m / 300;
      if (!field.clear(a[0], a[2], -14 + 6)) continue;
      const tx = tr.tx[b], tz = tr.tz[b];
      rails.box(a[0], a[1], a[2], 0.16, tall, 0.16, 'slate');
      rails.box(a[0], a[1] + tall - 0.3, a[2], 1.4, 0.8, 0.12, 'white', Math.atan2(tx, tz));
      for (let q = 0; q < m / 100; q++) rails.box(a[0] - tz * 0 + (q - (m / 100 - 1) / 2) * 0.38 * tz, a[1] + tall - 0.1, a[2] - (q - (m / 100 - 1) / 2) * 0.38 * tx, 0.22, 0.36, 0.14, 'red', Math.atan2(tx, tz));
    }
    void ci;
  });
  group.add(road.mesh({ receive: true }), land.mesh({ receive: !night }), rails.mesh({ receive: false }));
  const terrainAt = (i, side, d) => {
    const k = ((i % tr.N) + tr.N) % tr.N, q = k - (k % step), reach = lim[side][q] || maxReach;
    if (d > reach) return groundY;
    const H = tr.width[k] / 2 + 1.5 + Math.max(0, d);
    return heightAt(k, side, Math.max(0, d), tr.y[k] - H * side * Math.sin(tr.bank[k]));
  };
  return { group, field, groundY, theme, terrainAt, lampIdx: opts.lampIdx ?? null };
}
// The driving line: dashes along the racing line, red where the speed profile says brake.
export function buildDrivingLine(tr, line, speeds) {
  const b = new GeoBatch();
  for (let i = 0; i < tr.N; i += 2) {
    if (i % 4 >= 2) continue;
    const j = (i + 2) % tr.N, braking = speeds[(i + 3) % tr.N] < speeds[i] - 0.12, col = braking ? 'red' : 'lime';
    const a = P(tr, i, line.off[i] - 0.22, 0.06), c = P(tr, i, line.off[i] + 0.22, 0.06), d = P(tr, j, line.off[j] - 0.22, 0.06), e = P(tr, j, line.off[j] + 0.22, 0.06);
    b.tri(a, c, d, col); b.tri(c, e, d, col);
  }
  const m = b.mesh({ glow: true, receive: false });
  return m;
}
