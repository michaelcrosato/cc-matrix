// Small seeded generator whose whole state is one number, so it survives structuredClone in sim state.
export function nextRandom(holder) {
  holder.rng = (holder.rng + 0x6d2b79f5) | 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rangeOf = (h, a, b) => a + nextRandom(h) * (b - a);
export const pickOf = (h, list) => list[Math.floor(nextRandom(h) * list.length)];
export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
