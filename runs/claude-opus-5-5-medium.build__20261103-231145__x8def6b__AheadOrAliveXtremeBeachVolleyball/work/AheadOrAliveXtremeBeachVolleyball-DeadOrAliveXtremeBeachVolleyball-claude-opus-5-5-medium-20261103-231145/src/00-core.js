/* AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 * 00-core: the G namespace, random streams, the event bus, the overlay stack, the scene wrapper, small helpers. */
const { px, clamp, lerp } = E;
G.VERSION = '1.0.0';
G.SCENES = {};
G.TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';

/* ---- random streams: gameplay never calls Math.random. world (schedules, moods, weather, stock), match (AI rolls,
 * net cords), casino, cosmetic (crowd, particles, voices: never affects state) ---- */
G._streams = {};
G.seed = (name, seed) => { G._streams[name] = E.rng((seed >>> 0) || 1); };
G.rng = name => { if (!G._streams[name]) G.seed(name, G.hash(name) ^ 0x9e3779b9); return G._streams[name](); };
G.rint = (name, a, b) => a + Math.floor(G.rng(name) * (b - a + 1));
G.rpick = (name, list) => list[Math.floor(G.rng(name) * list.length)];
G.rshuffle = (name, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(G.rng(name) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/* ---- event bus ---- */
G.bus = { h: {}, on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { this.h[ev] = (this.h[ev] || []).filter(f => f !== fn); },
  emit(ev, data) { for (const f of (this.h[ev] || []).slice()) { try { f(data); } catch (e) { G.game && G.game.fail('bus ' + ev, e); } } } };

/* ---- overlays: a stack over every scene (dev panel, photo mode, notices). The top one that wants input takes it ---- */
G.overlay = {
  list: [],
  push(o) { this.list.push(o); if (o.open) o.open(); return o; },
  remove(o) { const i = this.list.indexOf(o); if (i >= 0) { this.list.splice(i, 1); if (o.close) o.close(); } },
  top() { return this.list[this.list.length - 1]; },
  has(kind) { return this.list.some(o => o.kind === kind); },
  update(dt) { let took = false; for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; if (o.update && o.update(dt, !took) && o.modal !== false) took = true; } return took; },
  draw(r) { for (const o of this.list) if (o.draw) o.draw(r); }
};
/** every scene runs through this: overlays first (they can take the input), then the scene; overlays drawn on top */
G.wrapScene = (name, s) => {
  const u = s.update, d = s.draw;
  s.update = function (dt) {
    G.realDt = dt; for (const n of G.notices) n.t += 1 / 120;
    if (G.attract && G.attract.watch) G.attract.watch(G.unscaledDt || dt);
    if (G.overlay.update(G.unscaledDt || dt)) { if (G.stepOnce > 0 && u) { G.stepOnce--; u.call(this, 1 / 120); } return; }
    if (u) u.call(this, dt);
  };
  s.draw = function (r) { if (d) d.call(this, r); G.overlay.draw(r); if (G.drawNotices) G.drawNotices(r); };
  s.name = name;
  return s;
};

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toLocaleString('en-US');
G.fmt = n => Math.round(n).toLocaleString('en-US');
G.ease = E.ease;
G.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
G.wrapText = (s, w) => E.font.wrap(s, w);
G.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
G.store = { get: (k, d) => E.store.get(k, d), set: (k, v) => { try { E.store.set(k, v); } catch (e) { /* storage blocked */ } } };
G.inHub = () => !!(window.AIHub && window.AIHub.active);
/** notices: short lines at the top of the screen (the game's toasts, drawn on the canvas) */
G.notices = [];
G.toast = (title, text = '', sec = 3) => { G.notices.push({ title, text, t: 0, sec }); if (G.notices.length > 3) G.notices.shift(); };
