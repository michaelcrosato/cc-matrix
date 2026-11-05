/* Eye of the Bolt-Holder: core namespace, rng, tuning. Plain script (no import/export) so Node's vm can run it too. */
const B = {}; B.scenes = {};
B.VERSION = '1.0.0'; B.BUILD = '2026-11-03';
B.DX = [0, 1, 0, -1]; B.DY = [-1, 0, 1, 0]; B.DIRS = ['N', 'E', 'S', 'W'];
B.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
/** mulberry32: a 32-bit state in, a number in [0,1) out; the state lives in the save */
B.rng = (S, stream) => { let a = (S.rng[stream] = (S.rng[stream] + 0x6D2B79F5) | 0); let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
B.int = (S, stream, n) => Math.floor(B.rng(S, stream) * n);
B.dice = (S, stream, n, d, add = 0) => { let s = add; for (let i = 0; i < n; i++) s += 1 + B.int(S, stream, d); return s; };
B.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
B.hash = S => { const o = Object.assign({}, S); delete o.events; return B.hashStr(JSON.stringify(o)); };
B.pick = (S, stream, arr) => arr[B.int(S, stream, arr.length)];
B.mod = v => v <= 5 ? -2 : v <= 8 ? -1 : v <= 12 ? 0 : v <= 15 ? 1 : v <= 17 ? 2 : 3;
B.cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/** TUNING: defaults, ranges and groups. Dev Mode edits B.T live; the values persist in 'boltholder.dev'. */
B.TUNE = [
  ['Combat', 'dmg', 'Party damage ×', 1, .25, 4, .05], ['Combat', 'hit', 'Party to-hit', 0, -5, 10, 1],
  ['Combat', 'cool', 'Attack cooldown ×', 1, .25, 3, .05], ['Combat', 'spell', 'Spell power ×', 1, .25, 4, .05],
  ['Monsters', 'mhp', 'Monster HP ×', 1, .25, 4, .05], ['Monsters', 'mdmg', 'Monster damage ×', 1, .25, 4, .05],
  ['Monsters', 'mint', 'Monster interval ×', 1, .25, 3, .05], ['Monsters', 'sight', 'Sight (cells)', 5, 1, 10, 1],
  ['Monsters', 'wind', 'Wind-up (s)', .5, .1, 1.5, .05], ['Monsters', 'reeng', 'Re-engage delay (s)', .6, 0, 2, .05],
  ['Monsters', 'bhp', 'Boss HP ×', 1, .25, 4, .05], ['Monsters', 'loot', 'Loot chance ×', 1, 0, 3, .1],
  ['Exploration', 'step', 'Step time (s)', .28, .05, .6, .01], ['Exploration', 'turn', 'Turn time (s)', .2, .05, .5, .01],
  ['Exploration', 'throw', 'Throw range', 4, 1, 8, 1], ['Exploration', 'trap', 'Trap damage ×', 1, 0, 4, .1], ['Exploration', 'btn', 'Button window (s)', 6, 2, 15, 1],
  ['Survival', 'hunger', 'Hunger rate ×', 1, 0, 5, .1], ['Survival', 'rest', 'Rest heal ×', 1, 0, 5, .1], ['Survival', 'wander', 'Rest interruption %', 4, 0, 50, 1],
  ['Survival', 'xp', 'XP gain ×', 1, 0, 5, .1], ['Survival', 'menus', 'Time in menus', .25, 0, 1, .05]
];
B.T = {}; B.TD = {}; for (const t of B.TUNE) { B.T[t[1]] = t[3]; B.TD[t[1]] = t[3]; }
B.CHEATS = { god: false, spells: false, nocool: false, nohunger: false, onehit: false, noclip: false, reveal: false, secrets: false, freeze: false };
B.cheatNames = { god: 'God mode', spells: 'Infinite spells', nocool: 'No cooldowns', nohunger: 'No hunger', onehit: 'One-hit kills', noclip: 'Noclip', reveal: 'Reveal map', secrets: 'Show secrets', freeze: 'Freeze monsters' };
