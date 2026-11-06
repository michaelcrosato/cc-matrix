// Pure seeded randomness for day-based world generation: the same seed, day and label always
// give the same numbers, whatever the frame rate. Presentation uses ctx.random forks instead.
export function hash32(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export class Stream {
  constructor(seed) { this.s = typeof seed === 'number' ? seed >>> 0 : hash32(seed); }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p) { return this.next() < p; }
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
  shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  weighted(entries, weight = (e) => e.weight ?? 1) {
    let total = 0;
    for (const e of entries) total += weight(e);
    let r = this.next() * total;
    for (const e of entries) { r -= weight(e); if (r <= 0) return e; }
    return entries[entries.length - 1];
  }
}
export const dayStream = (world, label, day = world.clock.day) => new Stream(`${world.seed}:${day}:${label}`);
