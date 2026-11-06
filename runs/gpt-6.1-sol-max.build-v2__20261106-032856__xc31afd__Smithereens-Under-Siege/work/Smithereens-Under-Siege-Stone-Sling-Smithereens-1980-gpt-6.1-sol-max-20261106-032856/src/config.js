export const TITLE = 'Smithereens Under Siege';
export const VERSION = 1;
export const DT = 1 / 120;
export const ARENA = {
  width: 960,
  ground: 36,
  water: 16,
  launch: [245, 715],
  crew: [208, 752],
  angle: (50 * Math.PI) / 180,
};
export const STONES = [
  {
    id: 0,
    name: 'Roundstone',
    short: 'ROUND',
    role: 'Pinpoint hits • quickest reload',
    color: '#d3e4e8',
    damage: 38,
    radius: 3.5,
    reload: 0.9,
  },
  {
    id: 1,
    name: 'Masonry stone',
    short: 'MASONRY',
    role: 'Break supports • heavy damage',
    color: '#e7b976',
    damage: 79,
    radius: 5.5,
    reload: 1.55,
  },
  {
    id: 2,
    name: 'Split stone',
    short: 'SPLIT',
    role: 'Three fragments • broad coverage',
    color: '#c3a4f5',
    damage: 28,
    radius: 3,
    reload: 2.1,
  },
];
export const DEFAULTS = {
  chargeTime: 1.4,
  speed: 530,
  gravity: 260,
  roundReload: 0.9,
  heavyReload: 1.55,
  splitReload: 2.1,
  damage: 1,
  healthScale: 1,
  crewDisable: 1.8,
  launcherDisable: 2.6,
  protection: 1.25,
  aiError: 1,
  aiReaction: 1,
  assist: 0.35,
};
export const TUNING = [
  ['chargeTime', 'Charge to full (s)', 0.5, 2.5, 0.05],
  ['speed', 'Launch speed (u/s)', 450, 650, 5],
  ['gravity', 'Gravity (u/s²)', 190, 340, 5],
  ['roundReload', 'Round reload (s)', 0.3, 2, 0.05],
  ['heavyReload', 'Masonry reload (s)', 0.5, 3, 0.05],
  ['splitReload', 'Split reload (s)', 0.5, 4, 0.05],
  ['damage', 'Damage multiplier', 0.3, 3, 0.1],
  ['healthScale', 'Block health multiplier', 0.5, 3, 0.1],
  ['crewDisable', 'Crew retreat (s)', 0.5, 4, 0.1],
  ['launcherDisable', 'Launcher repair (s)', 0.5, 5, 0.1],
  ['protection', 'Return protection (s)', 0.5, 3, 0.05],
  ['aiError', 'AI range error', 0, 3, 0.1],
  ['aiReaction', 'AI reaction multiplier', 0.25, 3, 0.05],
  ['assist', 'Timing assist', 0, 1, 0.05],
];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const tickOf = (s) => Math.round(s / DT);
export function tuning(input = {}) {
  const out = { ...DEFAULTS };
  for (const [k, , lo, hi] of TUNING)
    if (Number.isFinite(input[k])) out[k] = clamp(input[k], lo, hi);
  return out;
}
export function rngStep(w) {
  let a = (w.rng = (w.rng + 0x6d2b79f5) >>> 0);
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
