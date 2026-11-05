// OPERATION BIG BAD WOLF: core namespace, constants, tuning, difficulty, seeded streams, small utilities.
(() => {
const E = My3D2dge;
const WP = globalThis.WP = {};
WP.VERSION = '1.0.0';
WP.W = 480; WP.H = 270; WP.PLAY_H = 234;
WP.SEAT = ['#4aa8ff', '#ff5a4a', '#5ad06a', '#ffd040'];
WP.SEAT_NAMES = ['LOBO', 'FANG', 'TUNDRA', 'MOONSHINE'];
WP.STAGES = [];
WP.TYPES = {};
WP.clamp = E.clamp;
WP.lerp = (a, b, t) => a + (b - a) * t;
WP.hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';
// a small hash of a string (seeds voices, picks variations without touching the sim's streams)
WP.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// seeded streams: E.rng(seed) gives () => [0, 1)
WP.streams = seed => ({ sim: E.rng(seed >>> 0), loot: E.rng((seed * 7 + 13) >>> 0), ai: E.rng((seed * 31 + 7) >>> 0) });
WP.fxr = E.rng(12345);   // cosmetic stream (presentation only)

// ---------------------------------------------------------------------------------------------- tuning (section 11.1)
WP.TUNING_SPEC = [
  ['fireRate', 'Fire rate (rounds/s)', 11, 4, 24, 1],
  ['magSize', 'Magazine size', 30, 10, 60, 1],
  ['reloadTime', 'Reload time (s)', 1.0, .2, 3, .1],
  ['bulletDmg', 'Bullet damage', 1, .5, 4, .25],
  ['bloomMax', 'Max spread (px)', 7, 0, 20, 1],
  ['startMags', 'Starting magazines', 6, 1, 15, 1],
  ['startGrenades', 'Starting grenades', 4, 0, 9, 1],
  ['grenadeRadius', 'Grenade radius', 52, 20, 140, 2],
  ['grenadeDmg', 'Grenade damage', 12, 2, 40, 1],
  ['assist', 'Aim assist strength', .6, 0, 1, .05],
  ['padSpeed', 'Pad crosshair speed (px/s)', 520, 150, 1000, 10],
  ['enemyHp', 'Enemy HP x', 1, .25, 4, .05],
  ['enemyAccuracy', 'Enemy accuracy x', 1, 0, 2, .05],
  ['telegraph', 'Telegraph time x', 1, .3, 2.5, .05],
  ['enemyDamage', 'Enemy damage x', 1, 0, 3, .05],
  ['spawnDensity', 'Spawn density x', 1, .25, 2.5, .05],
  ['projectileSpeed', 'Projectile speed x', 1, .5, 2, .05],
  ['railSpeed', 'Rail speed x', 1, .25, 3, .05],
  ['quota', 'Quotas x', 1, .25, 2, .05],
  ['dropChance', 'Drop chance x', 1, 0, 3, .05],
  ['civilianDamage', 'Civilian hit damage', 8, 0, 30, 1],
  ['clearHeal', 'Stage-clear heal', 10, 0, 100, 1],
  ['timeScale', 'Game speed', 1, .1, 2, .05]
];
WP.T = {};
WP.TDEF = {};
for (const [k, , v] of WP.TUNING_SPEC) { WP.T[k] = v; WP.TDEF[k] = v; }
// fixed rules that are not sliders
Object.assign(WP.T, { spreadBase: 1.5, bloomPerShot: .8, bloomRecover: 18, maxMags: 9, maxGrenades: 9, furySeconds: 10, grenadeRange: 420 });
WP.CHEATS = { god: false, ammo: false, grenades: false, oneHit: false, holdFire: false, autopilot: false, hitShapes: false, paths: false, perf: false };

WP.DIFF = {
  recruit: { name: 'RECRUIT', acc: .6, tele: 1.35, dmg: .7, drop: 1.4, quota: .85, assist: .15, dry: 'refill' },
  veteran: { name: 'VETERAN', acc: 1, tele: 1, dmg: 1, drop: 1, quota: 1, assist: 0, dry: 'drop' },
  arcade: { name: 'ARCADE', acc: 1.25, tele: .85, dmg: 1.2, drop: .8, quota: 1.1, assist: -1, dry: 'down' }
};
// the run: difficulty, loop, perks, hostages carried, continues
WP.newRun = (o = {}) => ({ diff: o.diff || 'veteran', loop: 1, perks: {}, hostages: 5, hostagesFreed: null, continues: 0, done: [], scores: {}, mission: !!o.mission, startOp: o.op || 1 });
WP.run = WP.newRun();
WP.diff = () => {
  const d = Object.assign({}, WP.DIFF[WP.run.diff] || WP.DIFF.veteran);
  if (WP.run.loop > 1) { const a = WP.DIFF.arcade; d.acc *= a.acc * 1.15; d.tele *= a.tele / 1.15; d.dmg *= a.dmg * 1.15; d.quota *= a.quota; }
  return d;
};

// ---------------------------------------------------------------------------------------------- a small event bus
WP.bus = { fns: {}, on(k, f) { (this.fns[k] = this.fns[k] || []).push(f); }, emit(k, a) { for (const f of this.fns[k] || []) f(a); } };

// ---------------------------------------------------------------------------------------------- geometry
WP.inRect = (p, r) => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3];
WP.d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
WP.fmt = (n, w = 6) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
// the hub, when the page runs inside an AI Hub session
WP.hub = typeof AIHub !== 'undefined' && AIHub && AIHub.active ? AIHub : null;
})();
