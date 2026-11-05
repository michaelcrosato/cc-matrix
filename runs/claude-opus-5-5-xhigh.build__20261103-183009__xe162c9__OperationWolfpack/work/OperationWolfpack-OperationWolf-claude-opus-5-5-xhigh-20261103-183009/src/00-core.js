// OPERATION WOLFPACK: core namespace, constants, small helpers, seeded streams, tuning, difficulty.
// Every src file adds to globalThis.WP. The Sim (entities, rules) never touches the DOM, audio, rigs or Math.random.
(() => {
const E = My3D2dge;
const WP = globalThis.WP = globalThis.WP || {};
WP.VERSION = '1.0.0';
WP.TITLE = 'Operation Wolfpack';
WP.W = 480; WP.H = 270; WP.PLAY_H = 234;          // the buffer; the playfield above the HUD bar
WP.Y0 = 4000;                                      // world y of a sideways rail (depth ahead = Y0 - y)
WP.FOCAL = 135 / Math.tan(30 * Math.PI / 180);     // focal length at fov 60 on a 270-high buffer
WP.SEATS = ['#4a8aff', '#ff4a4a', '#4ad860', '#ffd040'];   // local seat colors (E.PLAYER_COLORS)
WP.HUB_SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
WP.CALLSIGNS = ['LOBO', 'FANG', 'TUNDRA', 'MOONSHINE'];
WP.headless = typeof document === 'undefined';
WP.time = 0;                                       // presentation time (floor ripples, blinking)
WP.Flow = WP.Flow || {};                           // the campaign flow (95-scenes.js)

// ---------- helpers ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
WP.clamp = clamp; WP.lerp = lerp;
WP.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
WP.dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
WP.smooth = t => t * t * (3 - 2 * t);
WP.approach = (v, to, d) => v < to ? Math.min(to, v + d) : Math.max(to, v - d);
WP.pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
WP.fmt = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
WP.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
WP.fill = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
WP.ascii = (s, fb) => (typeof s === 'string' && /^[\x20-\x7e]{1,12}$/.test(s)) ? s.toUpperCase() : fb;

// ---------- seeded streams (sim, loot, ai, fx) ----------
WP.Streams = class {
  constructor(seed) { this.reseed(seed); }
  reseed(seed) {
    this.seed = seed >>> 0;
    this.sim = E.rng(this.seed ^ 0x9e3779b9); this.loot = E.rng(this.seed ^ 0x85ebca6b);
    this.ai = E.rng(this.seed ^ 0xc2b2ae35); this.fx = E.rng(this.seed ^ 0x27d4eb2f);
  }
};
WP.fxr = E.rng(1234567);   // presentation-only randomness (particles, jitter): never read by the Sim
WP.rnd = (R, a, b) => a + (b - a) * R();
WP.pick = (R, list) => list[Math.floor(R() * list.length) % list.length];

// ---------- event bus (presentation listens) ----------
WP.bus = { fns: {}, on(k, f) { (this.fns[k] = this.fns[k] || []).push(f); }, emit(k, a) { for (const f of this.fns[k] || []) f(a); } };

// ---------- tuning (section 11.1): live values in WP.T ----------
WP.TUNING_SPEC = [
  ['fireRate', 'Fire rate (rounds/s)', 11, 4, 24, 1],
  ['magSize', 'Magazine size', 30, 10, 60, 1],
  ['reloadTime', 'Reload time (s)', 1.0, .2, 3, .1],
  ['bulletDmg', 'Bullet damage', 1, .5, 4, .25],
  ['bloomMax', 'Max spread (px)', 7, 0, 20, .5],
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
WP.TUNING_DEFAULTS = {};
for (const [k, , v] of WP.TUNING_SPEC) { WP.T[k] = v; WP.TUNING_DEFAULTS[k] = v; }
// fixed (not sliders)
Object.assign(WP.T, { spreadBase: 1.5, bloomPerShot: .8, bloomRecover: 18, maxMags: 9, maxGrenades: 9, grenadeRange: 420 });
WP.tuneChanged = () => WP.TUNING_SPEC.filter(([k, , v]) => Math.abs(WP.T[k] - v) > 1e-9).map(s => s[0]);

// ---------- difficulty (7.16) ----------
WP.DIFFS = {
  RECRUIT: { acc: .6, tele: 1.35, dmg: .7, drop: 1.4, quota: .85, assist: .15, magnet: true, dry: 'refill' },
  VETERAN: { acc: 1, tele: 1, dmg: 1, drop: 1, quota: 1, assist: 0, magnet: true, dry: 'drop' },
  ARCADE: { acc: 1.25, tele: .85, dmg: 1.2, drop: .8, quota: 1.1, assist: 0, magnet: false, dry: 'down' }
};
WP.ASSISTS = { Off: 0, Low: .35, Medium: .6, High: .85 };

// ---------- the run (campaign state across operations) ----------
WP.newRun = (o = {}) => ({
  diff: o.diff || 'VETERAN', loop: o.loop || 1, continues: 0, perks: {}, hostagesFreed: o.hostages === undefined ? 5 : o.hostages,
  hostagesSaved: 0, opsDone: [], select: !!o.select, players: null, stats: { shots: 0, hits: 0 }, demo: !!o.demo, hub: !!o.hub
});
})();
