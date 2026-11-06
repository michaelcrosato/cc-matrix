// The sim's small helpers: seeded numbers in S, geometry on polylines, deep copy, presentation events. No draw, audio or DOM.
(() => {
const G = (window.GAME ||= {});
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hyp = Math.hypot;
function rnd(S) { S.rng = (S.rng + 0x6d2b79f5) >>> 0; let t = Math.imul(S.rng ^ (S.rng >>> 15), S.rng | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const clone = o => { if (o === null || typeof o !== 'object') return o; if (Array.isArray(o)) { const a = new Array(o.length); for (let i = 0; i < o.length; i++) a[i] = clone(o[i]); return a; } const r = {}; for (const k in o) r[k] = clone(o[k]); return r; };
const ev = (S, ...e) => { S.ev.push(e); };
// Polylines: arrays of [x, y]
function polyLen(pts) { let n = 0; for (let i = 1; i < pts.length; i++) n += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return n; }
function polyAt(pts, d) { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = hyp(b[0] - a[0], b[1] - a[1]); if (d <= l || i === pts.length - 1) { const t = l ? clamp(d / l, 0, 1) : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; } d -= l; } return [pts[0][0], pts[0][1], 0]; }
// nearest point to (x, y) on the part of the line between arc lengths from and to: [arc, distance]
function polyNearest(pts, x, y, from = 0, to = Infinity) { let s = 0, bestD = Infinity, bestS = from; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = hyp(dx, dy); if (l > 0 && s + l >= from && s <= to) { let t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (l * l), 0, 1); const lo = (from - s) / l, hi = (to - s) / l; t = clamp(t, Math.max(0, lo), Math.min(1, hi)); const d = hyp(a[0] + dx * t - x, a[1] + dy * t - y); if (d < bestD) { bestD = d; bestS = s + l * t; } } s += l; } return [bestS, bestD]; }
const segDist = (ax, ay, bx, by, x, y) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; const t = l2 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0; return hyp(ax + dx * t - x, ay + dy * t - y); };
const circlePts = (cx, cy, rx, ry = rx, n = 24, a0 = -Math.PI / 2) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + i / n * 6.2832; p.push([Math.round((cx + Math.cos(a) * rx) * 10) / 10, Math.round((cy + Math.sin(a) * ry) * 10) / 10]); } return p; };
const spiralPts = (cx, cy, r0, r1, turns, n = 80) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * 6.2832 - 1.57, r = r0 + (r1 - r0) * t; p.push([Math.round((cx + Math.cos(a) * r * 1.5) * 10) / 10, Math.round((cy + Math.sin(a) * r) * 10) / 10]); } return p; };
const inCavity = (x, y, k = 1) => ((x - G.CAV.x) / (G.CAV.rx * k)) ** 2 + ((y - G.CAV.y) / (G.CAV.ry * k)) ** 2 < 1;
Object.assign(G, { clamp, rnd, clone, ev, polyLen, polyAt, polyNearest, segDist, circlePts, spiralPts, inCavity });
})();
