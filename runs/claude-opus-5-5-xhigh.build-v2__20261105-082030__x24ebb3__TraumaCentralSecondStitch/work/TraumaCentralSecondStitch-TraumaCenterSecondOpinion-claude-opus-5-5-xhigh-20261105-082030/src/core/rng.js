// Seeded generator. State is one integer, so it survives structuredClone with the sim.
export function nextRandom(holder) {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rrange = (holder, a, b) => a + nextRandom(holder) * (b - a);
export const rint = (holder, a, b) => Math.floor(rrange(holder, a, b + 1));
export const rpick = (holder, list) => list[Math.floor(nextRandom(holder) * list.length)];
export function hashText(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
