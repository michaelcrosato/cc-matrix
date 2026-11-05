// Utilities: yards and world units, angles, intercepts, picks, line banks.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF;
const YD = 16;
const u = FF.u = {
  YD,
  yd: n => n * YD,
  toYd: w => w / YD,
  clamp: E.clamp, lerp: E.lerp,
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  dist2: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),
  ang: (a, b) => Math.atan2(b.y - a.y, b.x - a.x),
  angDiff: (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },
  norm(x, y) { const l = Math.hypot(x, y); return l > 1e-6 ? [x / l, y / l] : [0, 0]; },
  /** the point on segment a-b nearest p, and its distance */
  segDist(p, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, t = E.clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y); },
  /** when can a chaser at c with speed s reach a target at p moving with v? the smallest t (step .05, up to max), or null */
  intercept(c, s, p, vx, vy, max = 3) {
    for (let t = 0; t <= max; t += .05) { const x = p.x + vx * t, y = p.y + vy * t; if (Math.hypot(x - c.x, y - c.y) <= s * t + 6) return { t, x, y }; }
    return null;
  },
  gauss(R = FF.r) { let a = 0; for (let i = 0; i < 6; i++) a += R(); return (a - 3) / Math.sqrt(.5); },
  pickW(items, weight, R = FF.r) { let tot = 0; for (const it of items) tot += Math.max(0, weight(it)); let x = R() * tot; for (const it of items) { x -= Math.max(0, weight(it)); if (x <= 0) return it; } return items[items.length - 1]; },
  pick: (list, R = FF.r) => list[Math.floor(R() * list.length) % list.length],
  mmss: s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
  ord: n => n + (n === 1 ? 'ST' : n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH'),
  hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; },
  /** a line bank that never repeats one of its last `keep` lines */
  bank(lines, keep = 8) { const recent = []; return R => { const pool = lines.filter(l => !recent.includes(l)); const l = u.pick(pool.length ? pool : lines, R || FF.rf); recent.push(l); if (recent.length > Math.min(keep, lines.length - 1)) recent.shift(); return l; }; },
  fill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m); },
  ease: E.ease,
  approach: (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d)
};
})();
