// Dragon Quilt Builders: core. The DQ namespace, constants, hashing, seeded streams, the event bus, tuning, the play
// context. Every later module is an IIFE that adds to DQ and reads only what earlier files defined.
(() => {
const E = My3D2dge;
const DQ = globalThis.DQ = globalThis.DQ || {};
DQ.E = E;
DQ.VERSION = '1.0.0';
DQ.T = 16;                 // one block = 16 world units
DQ.SEED = 20261103;        // the story world's seed
DQ.TEST = (typeof DQ_TEST !== 'undefined' && DQ_TEST) || {};
DQ.HUB = typeof AIHub !== 'undefined' && AIHub && AIHub.active ? AIHub : null;   // in an AI Hub session

/** a 32-bit hash of integers */
DQ.hash = function () {
  let h = 0x811c9dc5;
  for (let i = 0; i < arguments.length; i++) { h ^= arguments[i] | 0; h = Math.imul(h, 0x01000193); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; }
  return h >>> 0;
};
/** a 32-bit hash of a string */
DQ.hashStr = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 13; return h >>> 0; };
/** 0..1 from integers */
DQ.h01 = function () { return DQ.hash.apply(null, arguments) / 4294967296; };
/** a named seeded stream: DQ.rng('combat') -> () => 0..1 */
DQ.rng = (label, seed = DQ.SEED) => E.rng((seed ^ DQ.hashStr(label)) | 0);
DQ.clamp = E.clamp; DQ.lerp = E.lerp;
DQ.cell = v => Math.floor(v / 16);

/** the event bus: on(name, fn) -> off(), emit(name, payload) */
class Events {
  constructor() { this.m = new Map(); this.log = null; }
  on(n, f) { let a = this.m.get(n); if (!a) this.m.set(n, a = []); a.push(f); return () => { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); }; }
  emit(n, p) {
    if (this.log) this.log.push([n, p]);
    const a = this.m.get(n); if (!a) return;
    for (const f of a.slice()) { try { f(p); } catch (e) { DQ.fail('event ' + n, e); } }
  }
  clear() { this.m.clear(); }
}
DQ.Events = Events;
DQ.SCENES = DQ.SCENES || {};

DQ.sfx = (name, o) => { if (DQ.AudioX) DQ.AudioX.sfx(name, o); };
DQ.fail = (where, e) => { const g = DQ.game; if (g && g.fail) g.fail(where, e); else console.error(where, e); };

/** font-safe text: ASCII plus the font's extra glyphs; anything else becomes '?' */
DQ.SAFE = /[^\x20-\x7e♥★←→↑↓•×♪▸©\n]/g;
DQ.safe = s => String(s == null ? '' : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(DQ.SAFE, '?');

/** storage under our own keys (in a hub session, nothing is kept: the hub gives empty storage anyway) */
DQ.store = {
  get(k, f) { return DQ.HUB ? f : E.store.get('dqb-' + k, f); },
  set(k, v) { return DQ.HUB ? false : E.store.set('dqb-' + k, v); }
};

/** tuning: live values every system reads each time (dev sliders); DQ.TUNING_DEFS comes later (09b) */
DQ.tuning = {
  v: {}, loaded: false,
  def(k) { const d = (DQ.TUNING_DEFS || []).find(t => t.key === k); return d ? d.def : undefined; },
  get(k) { if (!this.loaded) this.load(); const v = this.v[k]; return v === undefined ? this.def(k) : v; },
  set(k, v) { this.v[k] = v; this.save(); },
  reset(k) { if (k) delete this.v[k]; else this.v = {}; this.save(); },
  load() { this.loaded = true; const s = DQ.store.get('tuning', null); this.v = s && typeof s === 'object' ? s : {}; },
  save() { if (!DQ.TEST.headless) DQ.store.set('tuning', this.v); },
  all() { const o = {}; for (const d of DQ.TUNING_DEFS || []) o[d.key] = this.get(d.key); return o; }
};
DQ.tune = k => DQ.tuning.get(k);

/** dev flags (cheats, overlays); a context can carry its own (attract mode) */
DQ.devFlags = () => ({ god: false, creative: false, fly: false, instantBreak: false, noHunger: false, oneHit: false, freezeTime: false, invisible: false,
  showRooms: false, showNav: false, showAggro: false, showCollision: false, showLights: false, showCut: false, showGhosts: false, perf: false, cutaway: 'auto', timeScale: 1 });

/** the play context: one per play session (story, attract, Bee). Systems take it in their constructor */
DQ.newCtx = (game, mode, o = {}) => ({ game, mode, events: new Events(), dev: Object.assign(DQ.devFlags(), o.dev || {}), seed: o.seed === undefined ? DQ.SEED : o.seed,
  world: null, builder: null, builders: [], town: null, quests: null, npcs: null, monsters: null, objects: null, rooms: null, nav: null, drops: null, clock: null, hud: null,
  stats: { placed: 0, broken: 0, crafted: 0, rooms: 0, killed: 0, cheer: 0, time: 0 }, flags: {}, cheats: o.cheats || {}, net: null, modal: null, cut: null });

/** small helpers */
DQ.d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
DQ.fmtTime = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
DQ.plural = (n, w) => n + ' ' + w + (n === 1 ? '' : (w.endsWith('s') ? '' : 's'));
DQ.shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
DQ.wrapText = (s, w, o) => E.font.wrap(DQ.safe(s), w, o);
})();
