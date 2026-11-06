export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Small stateless seeded generator (keeps gameplay rolls independent of frame counts). */
export function rngOf(seed) {
  let a = hash(seed);
  const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, range: (x, y) => x + next() * (y - x), int: (x, y) => x + Math.floor(next() * (y - x + 1)), chance: (p) => next() < p, pick: (l) => l[Math.floor(next() * l.length)],
    shuffle: (l) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; },
    weighted: (l, w) => { let t = 0; for (const x of l) t += Math.max(0, w(x)); let r = next() * t; for (const x of l) { r -= Math.max(0, w(x)); if (r <= 0 && w(x) > 0) return x; } return l[l.length - 1]; } };
}
export const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;
export const angleDelta = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
export function fmtTime(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return `${h % 12 || 12}:${pad2(m)} ${h < 12 ? 'AM' : 'PM'}`; }
