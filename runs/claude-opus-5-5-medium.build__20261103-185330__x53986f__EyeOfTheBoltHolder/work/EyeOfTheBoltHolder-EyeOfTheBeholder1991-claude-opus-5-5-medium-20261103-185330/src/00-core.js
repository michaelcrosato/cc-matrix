/* EYE OF THE BOLT-HOLDER: core. The namespace B, constants, the seeded random streams, tuning (the Dev sliders),
 * direction maths and small helpers. Everything in src/ is concatenated into one async function by tools/build.mjs. */
const E = My3D2dge;
const B = { VERSION: '1.0.0', BUILD: '2026-11-03' };
if (typeof window !== 'undefined') window.B = B;
const C = 32, EYE = 25, PI = Math.PI;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], WAYS = ['N', 'E', 'S', 'W'], FACE = { N: 0, E: 1, S: 2, W: 3 };
const YAW = d => -PI / 2 + d * PI / 2, mid = c => c * C + C / 2, key = (x, y) => x + ',' + y;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
B.C = C; B.EYE = EYE; B.DX = DX; B.DY = DY;

/* ---- seeded random streams (mulberry32), their states kept in the sim state so saves and replays are exact ---- */
function m32(st, s) { let t = (st[s] = (st[s] + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
B.rng = (s = 'combat') => m32(B.S.rng, s);
B.ri = (a, b, s) => a + Math.floor(B.rng(s) * (b - a + 1));
B.pick = (list, s) => list[Math.floor(B.rng(s) * list.length)];
/** dice: '2d6+1' or [n, sides, plus]; rolled on a stream */
B.dice = (d, s = 'combat') => {
  if (typeof d === 'number') return d;
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(d); if (!m) return 0;
  let t = +(m[3] || 0); for (let i = 0; i < +m[1]; i++) t += B.ri(1, +m[2], s); return t;
};
B.diceMax = d => { const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(d); return m ? +m[1] * +m[2] + +(m[3] || 0) : d; };
B.diceAvg = d => { const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(d); return m ? +m[1] * (+m[2] + 1) / 2 + +(m[3] || 0) : d; };
B.seedRng = seed => { const st = {}; let h = (seed >>> 0) || 1; for (const s of ['combat', 'ai', 'loot', 'world']) { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) + 0x9e3779b9 | 0; st[s] = h; } return st; };

/* ---- tuning: every number marked ★ in the plan; the Dev sliders change these live ---- */
B.TUNE = [
  // [key, label, page, min, max, step, default]
  ['partyDmg', 'Party damage ×', 'Combat', .25, 4, .05, 1], ['partyHit', 'Party to-hit', 'Combat', -5, 10, 1, 0],
  ['cooldown', 'Attack cooldown ×', 'Combat', .25, 3, .05, 1], ['spellPower', 'Spell power ×', 'Combat', .25, 4, .05, 1],
  ['monHp', 'Monster HP ×', 'Monsters', .25, 4, .05, 1], ['monDmg', 'Monster damage ×', 'Monsters', .25, 4, .05, 1],
  ['monInt', 'Monster interval ×', 'Monsters', .25, 3, .05, 1], ['sight', 'Sight (cells)', 'Monsters', 1, 10, 1, 5],
  ['windup', 'Wind-up (s)', 'Monsters', .1, 1.5, .05, .5], ['reengage', 'Re-engage delay (s)', 'Monsters', 0, 2, .05, .6],
  ['bossHp', 'Boss HP ×', 'Monsters', .25, 4, .05, 1], ['loot', 'Loot chance ×', 'Monsters', 0, 3, .1, 1],
  ['stepT', 'Step time (s)', 'Exploration', .05, .6, .01, .28], ['turnT', 'Turn time (s)', 'Exploration', .05, .5, .01, .2],
  ['throwRange', 'Throw range', 'Exploration', 1, 8, 1, 4], ['trapDmg', 'Trap damage ×', 'Exploration', 0, 4, .1, 1],
  ['buttonWin', 'Button window (s)', 'Exploration', 2, 15, .5, 6],
  ['hunger', 'Hunger rate ×', 'Survival', 0, 5, .1, 1], ['restHeal', 'Rest heal ×', 'Survival', 0, 5, .1, 1],
  ['restInt', 'Rest interruption %', 'Survival', 0, 50, 1, 4], ['xp', 'XP gain ×', 'Survival', 0, 5, .1, 1],
  ['menuTime', 'Time in menus', 'Survival', 0, 1, .05, .25]
];
B.T = {}; B.TDEF = {};
for (const [k, , , , , , d] of B.TUNE) B.T[k] = B.TDEF[k] = d;
B.resetTune = () => Object.assign(B.T, B.TDEF);
B.CHEATS = { god: false, infiniteSpells: false, noCooldowns: false, noHunger: false, oneHit: false, noclip: false, reveal: false, secrets: false, freeze: false };
B.DIFF = { easy: { dmg: .7, hp: .8, hunger: .5, rest: 1 }, normal: { dmg: 1, hp: 1, hunger: 1, rest: 1 }, hard: { dmg: 1.3, hp: 1.25, hunger: 1, rest: 2 } };
B.diff = () => B.DIFF[(B.S && B.S.diff) || 'normal'] || B.DIFF.normal;

/* ---- helpers ---- */
B.mod = v => v <= 5 ? -2 : v <= 8 ? -1 : v <= 12 ? 0 : v <= 15 ? 1 : v <= 17 ? 2 : 3;
B.relDir = (dir, rel) => (dir + { f: 0, r: 1, b: 2, l: 3 }[rel]) % 4;
/** the side of the party a cell is on, relative to the facing: 'front' | 'right' | 'back' | 'left' (or 'front' in the cell) */
B.sideOf = (cx, cy, dir, x, y) => {
  const dx = x - cx, dy = y - cy; if (!dx && !dy) return 'front';
  const d = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  return ['front', 'right', 'back', 'left'][(d - dir + 4) % 4];
};
B.dirTo = (ax, ay, bx, by) => Math.abs(bx - ax) >= Math.abs(by - ay) ? (bx > ax ? 1 : 3) : (by > ay ? 2 : 0);
B.manh = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
B.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
B.fmtTime = s => { const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, '0') + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
B.uid = () => (B.S.nextUid = (B.S.nextUid || 1) + 1);
B.store = {
  get(k, d) { try { const v = typeof localStorage !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};
/** a stable hash of the sim state (FNV-1a over a key-sorted JSON, events left out) */
B.stable = v => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
  if (Array.isArray(v)) return '[' + v.map(B.stable).join(',') + ']';
  return '{' + Object.keys(v).filter(k => k !== 'events' && v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + B.stable(v[k])).join(',') + '}';
};
B.hashStr = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
B.hash = () => B.hashStr(B.stable(B.S));
