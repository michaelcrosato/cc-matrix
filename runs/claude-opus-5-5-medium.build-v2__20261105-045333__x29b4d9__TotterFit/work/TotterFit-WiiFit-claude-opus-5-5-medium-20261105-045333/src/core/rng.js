// The only file allowed to touch randomness.
const streams = new Map();
function hashLabel(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let baseSeed = 12345;
export function setSeed(s) { baseSeed = s >>> 0; streams.clear(); }
export function freshSeed() { return (Date.now() ^ (performance.now() * 1000)) >>> 0; }
/** A gameplay stream. In a session it comes from the hub so all copies agree. */
export function rng(label) {
  const hub = globalThis.AIHub;
  if (hub && hub.active && hub.rng) { try { return hub.rng(label); } catch { /* falls through before connect */ } }
  if (!streams.has(label)) streams.set(label, mulberry32(baseSeed ^ hashLabel(label)));
  return streams.get(label);
}
/** A repeatable stream that doesn't advance a shared one: same label+n gives same numbers. */
export function seeded(label, n = 0) { return mulberry32((baseSeed + n * 7919) ^ hashLabel(label)); }
const cos = mulberry32(freshSeed());
/** Looks only. Never affects the game. */
export const cosmetic = () => cos();
export const cosRange = (a, b) => a + (b - a) * cos();
export const pick = (arr, r = cos) => arr[Math.floor(r() * arr.length) % arr.length];
export const range = (r, a, b) => a + (b - a) * r();
