// Dragon Quilt Builders: core namespace, seeded streams, event bus, tuning, small helpers.
(() => {
const E = My3D2dge;
const DQ = globalThis.DQ = globalThis.DQ || {};
DQ.E = E;
DQ.T = 16;                       // one block = 16 world units
DQ.SEED = 20261103;
DQ.TITLE = 'Dragon Quilt Builders';
DQ.VERSION = '1.0.0';

// ---- hashing and seeded streams (never Math.random in game logic) ----
DQ.hashStr = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
DQ.hash3 = (x, y, z) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
DQ.hash2 = E.hash2;
const streams = new Map();
// a named stream: DQ.rng('combat')() -> [0, 1). reset with DQ.rngReset(seed)
DQ.rng = label => { let s = streams.get(label); if (!s) { s = E.rng((DQ.seed ^ DQ.hashStr(label)) | 0); streams.set(label, s); } return s; };
DQ.rngReset = seed => { DQ.seed = seed === undefined ? DQ.SEED : seed; streams.clear(); };
DQ.rngReset();
DQ.rr = (label, a, b) => a + DQ.rng(label)() * (b - a);
DQ.ri = (label, a, b) => Math.floor(DQ.rr(label, a, b + 1));
DQ.pick = (label, list) => list[Math.floor(DQ.rng(label)() * list.length) % list.length];
// cosmetic randomness (particles, sway): its own stream, never touches logic
DQ.fx = E.rng(77);

// ---- event bus ----
class Events {
  constructor() { this.h = new Map(); this.log = []; }
  on(name, fn) { let a = this.h.get(name); if (!a) this.h.set(name, a = []); a.push(fn); return () => { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }; }
  emit(name, p) {
    const a = this.h.get(name); if (this.trace) this.log.push([name, p]);
    if (a) for (const fn of a.slice()) { try { fn(p); } catch (e) { DQ.fail('event ' + name, e); } }
    const any = this.h.get('*'); if (any) for (const fn of any.slice()) fn(name, p);
  }
  clear() { this.h.clear(); }
}
DQ.Events = Events;
DQ.events = new Events();

DQ.fail = (where, e) => { const g = E.current; if (g && g.fail) g.fail(where, e); else console.error(where, e); };

// ---- tuning: live values the dev sliders change (gameplay reads DQ.tuning.get(key) every time) ----
DQ.TUNING_DEFS = [
  ['walk', 'Walk speed', 40, 140, 1, 78],
  ['sprint', 'Sprint multiplier', 1, 2.5, .05, 1.45],
  ['jump', 'Jump velocity', 150, 320, 5, 215],
  ['gravity', 'Gravity', 400, 1400, 10, 800],
  ['reach', 'Reach (blocks)', 2, 8, .5, 4.5],
  ['builderAtk', 'Builder attack x', .25, 4, .05, 1],
  ['blockDmg', 'Block damage x', .25, 5, .05, 1],
  ['maxHpBase', 'Max HP base', 10, 200, 5, 40],
  ['belly', 'Belly drain x', 0, 4, .05, 1],
  ['monsterHp', 'Monster HP x', .25, 4, .05, 1],
  ['monsterDmg', 'Monster damage x', 0, 4, .05, 1],
  ['monsterSpeed', 'Monster speed x', .5, 2, .05, 1],
  ['aggro', 'Aggro radius (blocks)', 2, 20, .5, 8],
  ['maxMonsters', 'Max monsters', 0, 40, 1, 10],
  ['spawnNight', 'Spawn interval night (s)', 1, 30, .5, 5],
  ['dayMinutes', 'Day length (min)', 2, 60, .5, 12],
  ['cheer', 'Cheer x', .25, 5, .05, 1],
  ['dropRate', 'Drop rate x', 0, 5, .05, 1],
  ['siegeSize', 'Siege wave size x', .25, 3, .05, 1],
  ['helperRate', 'Helper build rate (blocks/min)', 0, 60, 1, 6],
  ['ballistaReload', 'Ballista reload (s)', .5, 6, .1, 2.5],
  ['tangleWindow', 'Tangle window (s)', 2, 20, .5, 8]
];
class Tuning {
  constructor() { this.v = {}; this.reset(); }
  def(k) { return DQ.TUNING_DEFS.find(d => d[0] === k); }
  get(k) { const v = this.v[k]; if (v === undefined) { const d = this.def(k); return d ? d[5] : 0; } return v; }
  set(k, v) { const d = this.def(k); if (!d) return; this.v[k] = E.clamp(Math.round(v / d[4]) * d[4], d[2], d[3]); this.v[k] = +this.v[k].toFixed(4); this.save(); }
  reset(k) { if (k) { const d = this.def(k); if (d) this.v[k] = d[5]; } else for (const d of DQ.TUNING_DEFS) this.v[d[0]] = d[5]; this.save(); }
  isDefault(k) { const d = this.def(k); return d && this.v[k] === d[5]; }
  save() { if (this.persist) E.store.set('dqb-tuning', this.v); }
  load() { const s = E.store.get('dqb-tuning', null); if (s && typeof s === 'object') for (const d of DQ.TUNING_DEFS) if (typeof s[d[0]] === 'number') this.v[d[0]] = E.clamp(s[d[0]], d[2], d[3]); }
}
DQ.Tuning = Tuning;
DQ.tuning = new Tuning();

// ---- dev flags (cheats and overlays; saved under dqb-dev) ----
DQ.dev = { god: false, creative: false, fly: false, instantBreak: false, noHunger: false, oneHit: false, freezeTime: false, invisible: false,
  showRooms: false, showNav: false, showAggro: false, showCollide: false, showLights: false, showPattern: false, perf: false, cutaway: 'auto', timeScale: 1 };
DQ.devSave = () => { if (!DQ.inHub) E.store.set('dqb-dev', DQ.dev); };
DQ.devLoad = () => { const s = E.store.get('dqb-dev', null); if (s && typeof s === 'object') for (const k in DQ.dev) if (typeof s[k] === typeof DQ.dev[k]) DQ.dev[k] = s[k]; };

// ---- small helpers ----
DQ.clamp = E.clamp; DQ.lerp = E.lerp;
DQ.cell = v => Math.floor(v / DQ.T);
DQ.center = c => c * DQ.T + DQ.T / 2;
DQ.dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
DQ.dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
DQ.fmtTime = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), ss = s % 60; return m + ':' + String(ss).padStart(2, '0'); };
DQ.fmtHour = h => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
DQ.count = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
DQ.title = s => s.charAt(0).toUpperCase() + s.slice(1);
// strings shown in the pixel font may only use ASCII plus the font's extra glyphs
DQ.FONT_OK = /^[\x20-\x7e♥★←→↑↓•×♪▸©\n]*$/;
DQ.safeName = s => Array.from(String(s || '')).map(ch => /[\x20-\x7e]/.test(ch) ? ch : '?').join('').slice(0, 14);

// ---- the per-session context factory ----
DQ.newCtx = (game, mode) => {
  const ctx = { game, mode: mode || 'story', events: new Events(), tuning: DQ.tuning, flags: {}, stats: { blocksPlaced: 0, blocksBroken: 0, crafted: 0, rooms: 0, kills: 0, cheerEarned: 0, playTime: 0 },
    world: null, builder: null, builders: [], town: null, quests: null, npcs: null, monsters: null, objects: null, rooms: null, clock: null, siege: null, bosses: null, hud: null, ui: null, drops: null, combat: null, net: null };
  return ctx;
};
})();
