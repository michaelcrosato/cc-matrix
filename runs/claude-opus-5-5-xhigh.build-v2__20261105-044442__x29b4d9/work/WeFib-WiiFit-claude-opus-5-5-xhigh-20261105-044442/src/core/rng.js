// The only file allowed to touch randomness. Gameplay uses rng(label), looks use cos().
const hub = () => (typeof window !== 'undefined' && window.AIHub && window.AIHub.active && window.AIHub.rng) ? window.AIHub : null;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashLabel(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

let baseSeed = 20261105;
const streams = new Map();
let sessionStreams = false;

export function setSeed(n) { baseSeed = n >>> 0; streams.clear(); }
export function useSessionStreams(on) { sessionStreams = on; streams.clear(); }

/** A named stream of numbers in [0, 1). Same label, same numbers, in a session on every copy. */
export function rng(label) {
  let s = streams.get(label);
  if (!s) {
    const h = sessionStreams ? hub() : null;
    s = h ? h.rng(label) : mulberry32((baseSeed ^ hashLabel(label)) >>> 0);
    streams.set(label, s);
  }
  return s;
}

const cosmetic = mulberry32(90210);
/** Private stream for looks: never affects a result. */
export const cos = (a = 0, b = 1) => a + (b - a) * cosmetic();
export const cosPick = (arr) => arr[Math.floor(cosmetic() * arr.length) % arr.length];
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
