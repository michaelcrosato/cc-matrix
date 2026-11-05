/* =====================================================================================
 * EYE OF THE BOLT-HOLDER: a real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks.
 * 00-core: the namespace B, constants, the seeded random streams, the tuning table (Dev Mode's sliders), events.
 * The sim (20-31) is pure and deterministic: it reads B.S and commands, writes B.S and events, and never touches the
 * 3D world, the page, sound or the global random generator.
 * ===================================================================================== */
const E = My3D2dge, { clamp, lerp } = E;
const W3 = E.World3D || null;
const B = {};
globalThis.BOLT = B;
B.VERSION = '1.0.0';
B.BUILD = '2026-11-03';
B.TITLE = 'Eye of the Bolt-Holder';
B.TAGLINE = 'A thousand locks. One eye.';

/* ---- grid conventions: dir 0 N, 1 E, 2 S, 3 W; a cell is 32 units; the eye at 25 ---- */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], FACE = ['N', 'E', 'S', 'W'], CELL = 32, EYE = 25, PI = Math.PI, TAU = PI * 2;
const FACE_DIR = { N: 0, E: 1, S: 2, W: 3 };
const YAW = d => -PI / 2 + d * PI / 2;
const mid = c => c * CELL + CELL / 2;
const key = (x, y) => x + ',' + y;
B.DX = DX; B.DY = DY; B.FACE = FACE; B.CELL = CELL; B.EYE = EYE; B.YAW = YAW; B.mid = mid;

/* ---- the state: one object, also the save (B.S). Its random streams are 32-bit mulberry32 states ---- */
let S = null;
B.setState = s => { S = s; B.S = s; };
const mulberry = a => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return [a, ((t ^ (t >>> 14)) >>> 0) / 4294967296]; };
/** the next number in [0, 1) of one stream of the state: combat, ai, loot, world */
const rnd = (stream = 'combat') => { const [a, v] = mulberry(S.rng[stream] >>> 0); S.rng[stream] = a; return v; };
const rint = (a, b, st) => a + Math.floor(rnd(st) * (b - a + 1));
const dice = (n, d, b = 0, st = 'combat') => { let t = b; for (let i = 0; i < n; i++) t += 1 + Math.floor(rnd(st) * d); return t; };
const pickR = (list, st) => list[Math.floor(rnd(st) * list.length)];
B.rnd = rnd; B.dice = dice; B.rint = rint;
/** a stream seed from a number and a label (FNV) */
B.seedOf = (seed, label) => { let h = 2166136261 ^ (seed >>> 0); for (const ch of label) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---- events: what the sim says happened this step (the presenter, sound and the HUD read them) ---- */
const ev = (t, o = {}) => { o.t = t; S.events.push(o); return o; };
B.ev = ev;

/* ---- the tuning table: every number Dev Mode exposes, with its default and range (B.T holds the live values) ---- */
B.TUNE = [
  // tab, key, label, default, min, max, step
  ['Combat', 'partyDmg', 'Party damage ×', 1, .25, 4, .05],
  ['Combat', 'partyHit', 'Party to-hit', 0, -5, 10, 1],
  ['Combat', 'atkCool', 'Attack cooldown ×', 1, .25, 3, .05],
  ['Combat', 'spellPower', 'Spell power ×', 1, .25, 4, .05],
  ['Monsters', 'monHP', 'Monster HP ×', 1, .25, 4, .05],
  ['Monsters', 'monDmg', 'Monster damage ×', 1, .25, 4, .05],
  ['Monsters', 'monInt', 'Monster interval ×', 1, .25, 3, .05],
  ['Monsters', 'sight', 'Sight (cells)', 5, 1, 10, 1],
  ['Monsters', 'windup', 'Wind-up (s)', .5, .1, 1.5, .05],
  ['Monsters', 'reengage', 'Re-engage delay (s)', .6, 0, 2, .05],
  ['Monsters', 'bossHP', 'Boss HP ×', 1, .25, 4, .05],
  ['Monsters', 'loot', 'Loot chance ×', 1, 0, 3, .05],
  ['Exploration', 'stepT', 'Step time (s)', .28, .05, .6, .01],
  ['Exploration', 'turnT', 'Turn time (s)', .2, .05, .5, .01],
  ['Exploration', 'throwRange', 'Throw range (cells)', 4, 1, 8, 1],
  ['Exploration', 'trapDmg', 'Trap damage ×', 1, 0, 4, .05],
  ['Exploration', 'buttonWin', 'Button window (s)', 6, 2, 15, .5],
  ['Survival', 'hunger', 'Hunger rate ×', 1, 0, 5, .05],
  ['Survival', 'restHeal', 'Rest heal ×', 1, 0, 5, .05],
  ['Survival', 'restInt', 'Rest interruption %', 4, 0, 50, 1],
  ['Survival', 'xp', 'XP gain ×', 1, 0, 5, .05],
  ['Survival', 'menuTime', 'Time in menus', .25, 0, 1, .05]
];
B.T = {};
B.tuneDefaults = () => { for (const [, k, , d] of B.TUNE) B.T[k] = d; };
B.tuneDefaults();
B.tuneSpec = k => B.TUNE.find(t => t[1] === k);
/** the cheats (Dev Mode, the attract mode): off by default, never saved with a game */
B.CHEATS = { god: false, infiniteSpells: false, noCooldowns: false, noHunger: false, oneHit: false, noclip: false, reveal: false, secrets: false, freeze: false };
/** the difficulty's multipliers on top of the tuning */
B.DIFF = {
  easy: { monDmg: .7, monHP: .8, hunger: .5, restInt: 1 },
  normal: { monDmg: 1, monHP: 1, hunger: 1, restInt: 1 },
  hard: { monDmg: 1.3, monHP: 1.25, hunger: 1, restInt: 2 }
};
B.diff = () => B.DIFF[(S && S.diff) || 'normal'] || B.DIFF.normal;
/** the step and turn times the Step animation setting picks (Smooth uses the sliders) */
B.stepMode = 'smooth';
B.stepTimes = () => B.stepMode === 'instant' ? [0, 0] : B.stepMode === 'quick' ? [.16, .12] : [B.T.stepT, B.T.turnT];
/** game settings the sim reads (set by the shell from game.settings) */
B.opt = { hints: true, levelUp: 'now', bob: true };
