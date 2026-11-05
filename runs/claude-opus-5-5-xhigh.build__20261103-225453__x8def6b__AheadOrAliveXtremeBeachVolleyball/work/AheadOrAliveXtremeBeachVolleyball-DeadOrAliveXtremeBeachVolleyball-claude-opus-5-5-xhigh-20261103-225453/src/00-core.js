/* AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 *
 * 00-core: the G namespace, constants, random streams, the event bus, overlays, the scene wrapper and small helpers.
 * Every src file is plain code that adds to G (the build wraps them all in one IIFE with E = My3D2dge). */
const { px, clamp, lerp, approach, TAU } = E;
G.E = E;
G.TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';
G.VERSION = '1.0.0';
G.hub = !!(window.AIHub && window.AIHub.active);
G.scenes = {};   // every scene, registered by its module; 99-main starts them

/* ---- the court, in world units (one tile = 16) ---- */
G.C = {
  TILE: 16, MAP_W: 44, MAP_H: 28,
  X0: 224, X1: 480, NET_X: 352, Y0: 176, Y1: 304, CY: 240,
  NET_H: 44, NET_LO: 28, ANT_H: 62, BALL_R: 3.5
};

/* ---- random streams: gameplay never calls Math.random ----
 * world: schedules, moods, weather, stock (seeded per save); match: AI rolls and net cords (per match); casino;
 * cosmetic: crowd, particles, voices (never changes state) */
G.streams = {};
G.seed = (name, seed) => { G.streams[name] = E.rng((seed >>> 0) || 1); G.streams[name].seed = seed >>> 0; return G.streams[name]; };
G.rng = name => G.streams[name] || G.seed(name, G.hashStr(name));
G.rand = (name, a = 0, b = 1) => a + (b - a) * G.rng(name)();
G.randInt = (name, a, b) => a + Math.floor(G.rng(name)() * (b - a + 1));
G.pick = (name, list) => list[Math.floor(G.rng(name)() * list.length) % list.length];
G.chance = (name, p) => G.rng(name)() < p;
G.shuffle = (name, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(G.rng(name)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.hashStr = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G.weighted = (name, entries) => {   // entries: [[value, weight], ...]
  let tot = 0; for (const e of entries) tot += Math.max(0, e[1]);
  if (tot <= 0) return entries[0] && entries[0][0];
  let r = G.rng(name)() * tot;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r < 0) return e[0]; }
  return entries[entries.length - 1][0];
};

/* ---- the event bus: point, touch, fault, matchEnd, gift, affinity, purchase, slotEnd, dayEnd, photo, story ---- */
G.bus = {
  map: {},
  on(ev, fn) { (this.map[ev] || (this.map[ev] = [])).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.map[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data) { const l = this.map[ev]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { G.game && G.game.fail('event ' + ev, e); } } }
};

/* ---- overlays: the dev panel, photo mode, toasts, the touch-only notice and the attract watcher sit over scenes.
 * Each is { id, update(dt) -> true when it took the input, draw(r), modal } ---- */
G.overlay = {
  list: [],
  push(o) { if (!this.list.includes(o)) this.list.push(o); return o; },
  remove(o) { const i = this.list.indexOf(o); if (i >= 0) this.list.splice(i, 1); },
  has(id) { return this.list.some(o => o.id === id); },
  get(id) { return this.list.find(o => o.id === id); },
  update(dt) {
    let took = false;
    for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; if (o && o.update && o.update(dt, took)) took = true; }
    return took;
  },
  draw(r) { for (const o of this.list.slice()) if (o.draw) o.draw(r); }
};

/** every scene goes through this: overlays first (they may take the input), then the scene; overlays draw last */
G.wrapScene = (name, sc) => {
  const up = sc.update, dr = sc.draw, en = sc.enter;
  sc.name = name;
  sc.enter = function (d) {   // overlays that belong to a scene (photo mode, How to Play over a pause) end with it
    for (const o of G.overlay.list.slice()) if (o.sceneBound) { G.overlay.remove(o); G.game.timeScale = 1; G._inputStack.length = 0; }
    if (en) return en.call(this, d);
  };
  sc.update = function (dt) {
    G.sceneTime = (G.sceneTime || 0) + dt;
    if (G.devPadCheck) G.devPadCheck();
    if (G.overlay.update(G.realDt || dt)) return;
    if (up) up.call(this, dt);
  };
  sc.draw = function (r) {
    G.lastR = r;
    if (dr) dr.call(this, r);
    G.overlay.draw(r);
  };
  return sc;
};

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toLocaleString('en-US');
G.fmtChips = n => Math.round(n).toLocaleString('en-US') + ' chips';
G.clamp = clamp; G.lerp = lerp;
G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
G.ease = E.ease;
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.upper = s => String(s).toUpperCase();
/** a value that eases toward a target for counting animations */
G.counter = (v = 0) => ({ v, shown: v, step(dt, k = 6) { this.shown = Math.abs(this.v - this.shown) < 1 ? this.v : this.shown + (this.v - this.shown) * Math.min(1, dt * k); return this.shown; } });
/** text that fits a width: shortened with an ellipsis */
G.fit = (s, w, o) => { s = String(s); if (E.font.width(s, o) <= w) return s; while (s.length > 1 && E.font.width(s + '…', o) > w) s = s.slice(0, -1); return s + '…'; };
/** the real seconds since the last step (overlays run on real time while the game is frozen) */
G.realDt = 1 / 120;
G.now = () => (G.game ? G.game.time : 0);
G.log = [];   // short history of notable events, for tests and the dev panel
G.note = (s) => { G.log.push(s); if (G.log.length > 60) G.log.shift(); };
