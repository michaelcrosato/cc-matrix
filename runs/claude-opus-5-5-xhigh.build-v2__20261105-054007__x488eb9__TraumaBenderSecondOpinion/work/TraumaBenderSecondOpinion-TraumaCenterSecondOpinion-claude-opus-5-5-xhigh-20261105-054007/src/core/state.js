// Registries, geometry and the seeded RNG the sim uses. No draw, audio or DOM anywhere under src/core.
(() => {
const G = (window.GAME ||= {});

const TOOLS = G.TOOLS = ['forceps', 'scalpel', 'suture', 'salve', 'syringe', 'cautery', 'suction', 'sonar'];   // clockwise from north
G.TOOL_NAMES = { forceps: 'Forceps', scalpel: 'Scalpel', suture: 'Suture', salve: 'Salve', syringe: 'Syringe', cautery: 'Cautery', suction: 'Suction', sonar: 'Sonar' };
G.OBJ = {}; G.CASES = {}; G.CASE_ORDER = []; G.ACTIONS = {};
/** defObject(type, spec): a thing on the table. spec: hazard (vitals/s while open), accept(o, tool, S) -> verb or null,
 *  point(o, S, tool) -> [x, y] to aim at, reach, init, step(o, S, wdt, dt), hold, release, dose, burnNeed, burned, slashed, bot */
G.defObject = (type, spec) => { G.OBJ[type] = Object.assign({ type }, spec); return G.OBJ[type]; };
/** defCase(spec): an operation as data (CONTENT.md) */
G.defCase = spec => { G.CASES[spec.id] = spec; if (!spec.hidden) G.CASE_ORDER.push(spec.id); return spec; };
/** defAction(name, fn(S, step)): what a phase script can do */
G.defAction = (name, fn) => { G.ACTIONS[name] = fn; };

const U = G.U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  /** the sim's random numbers: an integer in S, so a rewind and a replay give the same ones */
  rnd(S) { S.rng = (S.rng + 0x6D2B79F5) | 0; let t = Math.imul(S.rng ^ (S.rng >>> 15), 1 | S.rng); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
  range: (S, a, b) => a + U.rnd(S) * (b - a),
  /** distance from point p to segment ab, and how far along it */
  seg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? U.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0, cx = ax + dx * t, cy = ay + dy * t; return { d: Math.hypot(px - cx, py - cy), t, x: cx, y: cy }; },
  polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; },
  /** the point at arc length s, and the unit tangent there */
  polyAt(pts, s) { let left = Math.max(0, s); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (left <= l || i === pts.length - 1) { const t = l ? Math.min(1, left / l) : 0, k = l || 1; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / k, ty: (b[1] - a[1]) / k }; } left -= l; } const p = pts[pts.length - 1]; return { x: p[0], y: p[1], tx: 1, ty: 0 }; },
  /** the nearest point on the polyline with arc length in [s0, s1] */
  polyNear(pts, x, y, s0 = 0, s1 = 1e9) { let run = 0, best = null; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); const lo = run, hi = run + l; if (hi >= s0 && lo <= s1) { const q = U.seg(x, y, a[0], a[1], b[0], b[1]), s = U.clamp(lo + q.t * l, s0, s1), p = s === lo + q.t * l ? q : (() => { const t = l ? (s - lo) / l : 0, cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t; return { x: cx, y: cy, d: Math.hypot(x - cx, y - cy) }; })(); if (!best || p.d < best.d) best = { d: p.d, s, x: p.x, y: p.y }; } run = hi; } return best || { d: Math.hypot(x - pts[0][0], y - pts[0][1]), s: 0, x: pts[0][0], y: pts[0][1] }; },
  inCavity(x, y, m = 0) { const C = G.CAV; return ((x - C.x) / (C.rx - m)) ** 2 + ((y - C.y) / (C.ry - m)) ** 2 < 1; },
  /** the beat's shape, from its phase 0..1: a sharp double pulse */
  beatShape(p) { return p < .1 ? 1 - p / .1 * .35 : p < .2 ? .65 * (1 - (p - .1) / .1) : p < .3 ? (p - .2) / .1 * .5 : p < .42 ? .5 * (1 - (p - .3) / .12) : 0; },
  /** a stable hash of JSON-safe data, for tests and the dev panel */
  hash(v) { const s = JSON.stringify(v); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); },
  /** a polyline through control points, smoothed (for guides and vessels) */
  curve(ctrl, step = 8) { if (ctrl.length < 3) return ctrl.map(p => [p[0], p[1]]); const out = []; for (let i = 0; i < ctrl.length - 1; i++) { const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)], n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step)); for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)]); } } const e = ctrl[ctrl.length - 1]; out.push([e[0], e[1]]); return out; },
  /** a closed ring as a polyline */
  ring(x, y, rx, ry, n = 24, a0 = -Math.PI / 2) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return p; },
  /** a spiral, for the Last Note */
  spiral(x, y, r0, r1, turns, n = 80) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t; p.push([x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r]); } return p; },
};

/** rewind and checkpoint data that must never live in S itself: S stays JSON-safe, and a snapshot does not hold snapshots */
const AUX = new WeakMap();
G.aux = S => { let a = AUX.get(S); if (!a) AUX.set(S, a = { hist: [], ghosts: null, reverse: null, cp: null, preForced: null, snapT: 0 }); return a; };
})();
