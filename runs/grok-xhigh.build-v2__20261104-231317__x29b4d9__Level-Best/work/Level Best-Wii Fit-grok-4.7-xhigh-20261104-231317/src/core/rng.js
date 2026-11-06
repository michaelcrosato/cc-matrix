/** The only randomness in the game. Gameplay draws go through rng(label). */

const streams = new Map();
let baseSeed = 0x1a2b3c4d;
let session = false;

export function setSessionMode(on) {
  session = !!on;
  streams.clear();
}

export function resetRng(seed = 0x1a2b3c4d) {
  baseSeed = seed >>> 0;
  streams.clear();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashLabel(label) {
  let h = 2166136261;
  const s = String(label);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ baseSeed) >>> 0;
}

function generatorFor(label) {
  let g = streams.get(label);
  if (g) return g;
  if (session && globalThis.AIHub && typeof globalThis.AIHub.rng === 'function') {
    g = globalThis.AIHub.rng(label);
  } else {
    g = mulberry32(hashLabel(label));
  }
  streams.set(label, g);
  return g;
}

/** Next number in [0, 1) for this label. The same label repeats the same stream. */
export function rng(label) {
  return generatorFor(label)();
}

/** A private cosmetic stream. Not for rules. */
export function cosmetic(label = 'cosmetic') {
  return generatorFor('cosmetic:' + label)();
}

export function range(label, min, max) {
  return min + rng(label) * (max - min);
}

export function pick(label, list) {
  return list[Math.floor(rng(label) * list.length) % list.length];
}

export function chance(label, p) {
  return rng(label) < p;
}
