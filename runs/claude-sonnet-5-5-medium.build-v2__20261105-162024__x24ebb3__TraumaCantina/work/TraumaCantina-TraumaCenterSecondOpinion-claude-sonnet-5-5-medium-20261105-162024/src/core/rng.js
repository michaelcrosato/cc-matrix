// Seeded generator whose whole state is one number (plain data).
export const rnd = (o) => { // o = any object holding `rs` (uint32)
  let t = (o.rs = (o.rs + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const rr = (o, a, b) => a + (b - a) * rnd(o);
export const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
