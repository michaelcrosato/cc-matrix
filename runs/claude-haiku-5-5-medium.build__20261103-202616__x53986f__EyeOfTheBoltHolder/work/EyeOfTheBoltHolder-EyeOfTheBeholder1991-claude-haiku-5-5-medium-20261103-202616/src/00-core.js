/* ===== EYE OF THE BOLT-HOLDER · 00 core =====
 * The namespace, the seeded random streams, dice, the tuning (defaults and ranges for the Dev Mode sliders) and the
 * state hash. Everything in src/ is one script; the sim files (20-31) never touch the world, the DOM, audio or
 * Math.random (the lint suite checks it). */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** moves v toward t by at most s (the step of an ease) */
const approach = (v, t, s) => v < t ? Math.min(t, v + s) : Math.max(t, v - s);
const B = { TITLE: 'Eye of the Bolt-Holder', VERSION: '1.0.0', BUILT: '2026-11-03 20:26:16', DT: 1 / 120 };

/* ---- seeded streams (mulberry32): each one's state is a plain number in the save ---- */
B.STREAMS = ['combat', 'ai', 'loot', 'world'];
B.nextU32 = s => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return { s, v: ((t ^ (t >>> 14)) >>> 0) / 4294967296 }; };
B.seedStreams = seed => { const o = {}; B.STREAMS.forEach((k, i) => { o[k] = ((seed >>> 0) ^ Math.imul(i + 1, 0x9E3779B9)) >>> 0; }); return o; };
/** a float in [0, 1) from a stream of the state S (S.rng[stream] advances) */
B.rnd = (S, stream) => { const n = B.nextU32(S.rng[stream]); S.rng[stream] = n.s; return n.v; };
B.rint = (S, stream, n) => Math.floor(B.rnd(S, stream) * n);
/** dice: '2d6+1' -> [n, sides, plus], rolled on a stream */
B.parseDice = s => { const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(s) || [0, 0, 1, 0]; return [+m[1], +m[2], +(m[3] || 0)]; };
B.roll = (S, stream, d) => { const [n, sides, p] = typeof d === 'string' ? B.parseDice(d) : d; let t = p; for (let i = 0; i < n; i++) t += 1 + B.rint(S, stream, sides); return t; };
B.diceMax = d => { const [n, s, p] = typeof d === 'string' ? B.parseDice(d) : d; return n * s + p; };
B.diceStr = d => typeof d === 'string' ? d : `${d[0]}d${d[1]}${d[2] ? (d[2] > 0 ? '+' : '') + d[2] : ''}`;

/* ---- tuning: the live values the sim reads (B.T), each with its default and range (Dev Mode's sliders) ---- */
B.TUNING = [
  { key: 'partyDmg', group: 'Combat', label: 'Party damage', def: 1, min: .25, max: 4, step: .25, mul: true },
  { key: 'partyHit', group: 'Combat', label: 'Party to-hit', def: 0, min: -5, max: 10, step: 1 },
  { key: 'attackCd', group: 'Combat', label: 'Attack cooldown', def: 1, min: .25, max: 3, step: .25, mul: true },
  { key: 'spellPow', group: 'Combat', label: 'Spell power', def: 1, min: .25, max: 4, step: .25, mul: true },
  { key: 'monHp', group: 'Monsters', label: 'Monster HP', def: 1, min: .25, max: 4, step: .25, mul: true },
  { key: 'monDmg', group: 'Monsters', label: 'Monster damage', def: 1, min: .25, max: 4, step: .25, mul: true },
  { key: 'monInt', group: 'Monsters', label: 'Monster interval', def: 1, min: .25, max: 3, step: .25, mul: true },
  { key: 'sight', group: 'Monsters', label: 'Sight (cells)', def: 5, min: 1, max: 10, step: 1 },
  { key: 'windup', group: 'Monsters', label: 'Wind-up (s)', def: .5, min: .1, max: 1.5, step: .1 },
  { key: 'reengage', group: 'Monsters', label: 'Re-engage delay (s)', def: .6, min: 0, max: 2, step: .1 },
  { key: 'bossHp', group: 'Monsters', label: 'Boss HP', def: 1, min: .25, max: 4, step: .25, mul: true },
  { key: 'loot', group: 'Monsters', label: 'Loot chance', def: 1, min: 0, max: 3, step: .25, mul: true },
  { key: 'stepT', group: 'Exploration', label: 'Step time (s)', def: .28, min: .05, max: .6, step: .01 },
  { key: 'turnT', group: 'Exploration', label: 'Turn time (s)', def: .2, min: .05, max: .5, step: .01 },
  { key: 'throwRange', group: 'Exploration', label: 'Throw range', def: 4, min: 1, max: 8, step: 1 },
  { key: 'trapDmg', group: 'Exploration', label: 'Trap damage', def: 1, min: 0, max: 4, step: .25, mul: true },
  { key: 'buttonWin', group: 'Exploration', label: 'Button window (s)', def: 6, min: 2, max: 15, step: 1 },
  { key: 'hunger', group: 'Survival', label: 'Hunger rate', def: 1, min: 0, max: 5, step: .25, mul: true },
  { key: 'restHeal', group: 'Survival', label: 'Rest heal', def: 1, min: 0, max: 5, step: .25, mul: true },
  { key: 'rest', group: 'Survival', label: 'Rest interruption %', def: 4, min: 0, max: 50, step: 1 },
  { key: 'xp', group: 'Survival', label: 'XP gain', def: 1, min: 0, max: 5, step: .25, mul: true },
  { key: 'menuTime', group: 'Survival', label: 'Time in menus', def: .25, min: 0, max: 1, step: .25 }
];
B.TUNE_DEFAULTS = Object.fromEntries(B.TUNING.map(t => [t.key, t.def]));
B.T = Object.assign({}, B.TUNE_DEFAULTS);
B.resetTuning = () => { Object.assign(B.T, B.TUNE_DEFAULTS); };
/** the difficulty multipliers on top of the tuning */
B.DIFF = { Easy: { monDmg: .7, monHp: .8, hunger: .5, rest: 1 }, Normal: { monDmg: 1, monHp: 1, hunger: 1, rest: 1 }, Hard: { monDmg: 1.3, monHp: 1.25, hunger: 1, rest: 2 } };

/* ---- the state hash: 32-bit FNV-1a of a stable JSON, without events or view-only keys ---- */
B.stable = v => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(B.stable).join(',') + ']';
  return '{' + Object.keys(v).filter(k => k !== 'events' && v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + B.stable(v[k])).join(',') + '}';
};
B.hash = v => { const s = B.stable(v); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, '0'); };
