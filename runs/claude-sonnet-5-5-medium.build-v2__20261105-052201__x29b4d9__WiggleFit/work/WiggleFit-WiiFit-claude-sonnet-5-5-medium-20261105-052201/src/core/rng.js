// The only file allowed to touch randomness.
let seed = 12345;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const streams = new Map();
export function setSeed(s) { seed = s >>> 0; streams.clear(); }
export function rng(label) {
  const A = typeof window !== 'undefined' && window.AIHub;
  if (A && A.active && A.rng) { if (!streams.has('hub:' + label)) streams.set('hub:' + label, A.rng(label)); return streams.get('hub:' + label); }
  if (!streams.has(label)) streams.set(label, mulberry32(hashStr(label) ^ seed));
  return streams.get(label);
}
// fresh stream, repeatable per (label, n)
export function fresh(label, n = 0) { const A = typeof window !== 'undefined' && window.AIHub; if (A && A.active && A.rng) return A.rng(label + ':' + n); return mulberry32(hashStr(label) ^ seed ^ (n * 7919)); }
const cosm = mulberry32(777);
export function cosmetic() { return cosm(); }
export const seedFromClock = () => (Date.now() & 0xffffff);
export function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
export function range(r, a, b) { return a + (b - a) * r(); }
export function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
export function osRandom() { return (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint32Array(1))[0] : 1; }
