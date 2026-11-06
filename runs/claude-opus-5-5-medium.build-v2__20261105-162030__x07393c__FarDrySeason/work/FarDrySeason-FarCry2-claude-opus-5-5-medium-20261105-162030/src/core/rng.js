// Randomness for sessions outside the hub. In the game itself everything comes from ctx.random.fork(name).
/** A tiny seeded generator for sessions outside the hub. */
export const rngOf = (seed, label) => { let h = seed >>> 0; for (const c of String(label)) h = (Math.imul(h ^ c.charCodeAt(0), 16777619)) >>> 0; return () => { h = (h + 0x6d2b79f5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
