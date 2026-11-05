/* AHEAD OR ALIVE: Xtreme Beach Volleyball.
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 * 00-core: namespace, rng streams, event bus, tuning, overlays, helpers. */
const { px, clamp, lerp, approach, TAU } = E;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
G.hub = HUB;
G.TITLE = 'AHEAD OR ALIVE';
G.STRAP = 'XTREME BEACH VOLLEYBALL';
G.TAGLINE = 'Stay ahead. Stay alive. Stay tanned.';
G.DATE = '2026-11-04 01:17:20';

/* ---- random streams: gameplay never calls Math.random ---- */
G.seedOf = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G._streams = {};
G.reseed = (name, seed) => { G._streams[name] = E.rng(seed >>> 0); };
G.rng = name => {
  if (HUB && HUB.seeded === false && name === 'match' && HUB.rng) { return G._streams[name] || (G._streams[name] = HUB.rng('match')); }
  return G._streams[name] || (G._streams[name] = E.rng(G.seedOf('aoa:' + name)));
};
G.rand = (name = 'cosmetic') => G.rng(name)();
G.rrange = (a, b, name = 'cosmetic') => a + (b - a) * G.rng(name)();
G.rpick = (list, name = 'cosmetic') => list[Math.floor(G.rng(name)() * list.length) % list.length];
G.rchance = (p, name = 'cosmetic') => G.rng(name)() < p;

/* ---- event bus ---- */
G.bus = (() => {
  const h = {};
  return {
    on(ev, fn) { (h[ev] || (h[ev] = [])).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { if (h[ev]) h[ev] = h[ev].filter(f => f !== fn); },
    emit(ev, a, b) { for (const f of (h[ev] || []).slice()) { try { f(a, b); } catch (e) { if (G.game) G.game.fail('bus:' + ev, e); } } }
  };
})();

/* ---- tuning: every slider (live; read every step) ---- */
G.TUNING = [
  { key: 'moveSpeed', label: 'Run speed', group: 'Players', def: 92, min: 40, max: 180, step: 2, unit: '' },
  { key: 'diveSpeed', label: 'Dive speed', group: 'Players', def: 150, min: 60, max: 280, step: 5, unit: '' },
  { key: 'reach', label: 'Reach radius', group: 'Players', def: 15, min: 8, max: 30, step: .5, unit: '' },
  { key: 'jumpVel', label: 'Jump power', group: 'Players', def: 150, min: 80, max: 260, step: 5, unit: '' },
  { key: 'timingWindow', label: 'Timing window (s)', group: 'Timing', def: .16, min: .05, max: .4, step: .01, unit: 's' },
  { key: 'perfectWindow', label: 'Perfect window (s)', group: 'Timing', def: .045, min: .015, max: .15, step: .005, unit: 's' },
  { key: 'gravity', label: 'Ball gravity', group: 'Ball', def: 260, min: 120, max: 520, step: 10, unit: '' },
  { key: 'ballDrag', label: 'Ball air drag', group: 'Ball', def: .05, min: 0, max: .4, step: .01, unit: '' },
  { key: 'serveSpeed', label: 'Serve power', group: 'Ball', def: 1, min: .6, max: 1.6, step: .05, unit: 'x' },
  { key: 'spikePower', label: 'Spike power', group: 'Ball', def: 1, min: .6, max: 1.8, step: .05, unit: 'x' },
  { key: 'netHeight', label: 'Net height', group: 'Court', def: 27, min: 16, max: 44, step: 1, unit: '' },
  { key: 'pointsToWin', label: 'Points to win', group: 'Rules', def: 7, min: 3, max: 21, step: 1, unit: '' },
  { key: 'aiSkill', label: 'CPU skill', group: 'AI', def: .55, min: 0, max: 1, step: .05, unit: '' },
  { key: 'aiSpeed', label: 'CPU run speed', group: 'AI', def: 1, min: .5, max: 1.5, step: .05, unit: 'x' },
  { key: 'aiReaction', label: 'CPU reaction (s)', group: 'AI', def: .18, min: 0, max: .6, step: .02, unit: 's' },
  { key: 'chemistry', label: 'Partner chemistry bonus', group: 'AI', def: 1, min: 0, max: 2, step: .1, unit: 'x' },
  { key: 'timeScale', label: 'Game speed', group: 'World', def: 1, min: .3, max: 2, step: .05, unit: 'x' },
  { key: 'moneyMul', label: 'Prize money', group: 'World', def: 1, min: .2, max: 5, step: .1, unit: 'x' },
  { key: 'affinityMul', label: 'Friendship gain', group: 'World', def: 1, min: .2, max: 4, step: .1, unit: 'x' },
  { key: 'crowd', label: 'Crowd size', group: 'World', def: 1, min: 0, max: 2, step: .1, unit: 'x' }
];
G.DEFAULTS = {}; G.TUNING.forEach(t => { G.DEFAULTS[t.key] = t.def; });
G.T = Object.assign({}, G.DEFAULTS);
G.resetTuning = () => { Object.assign(G.T, G.DEFAULTS); try { E.store.set('aoa-dev-tuning', {}); } catch (e) { /* storage blocked */ } };
G.saveTuning = () => { try { E.store.set('aoa-dev-tuning', G.T); } catch (e) { /* storage blocked */ } };
try { const o = E.store.get('aoa-dev-tuning', {}); for (const k in o) if (k in G.DEFAULTS && typeof o[k] === 'number') G.T[k] = o[k]; } catch (e) { /* storage blocked */ }

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
G.pad2 = n => (n < 10 ? '0' : '') + n;
G.fmtTime = s => Math.floor(s / 60) + ':' + G.pad2(Math.floor(s % 60));
G.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ---- overlay stack (dev panel, photo mode, toasts, notices) ---- */
G.overlays = [];
G.overlay = {
  push(o) { G.overlays.push(o); if (o.enter) o.enter(); return o; },
  pop(o) { const i = G.overlays.indexOf(o); if (i >= 0) { G.overlays.splice(i, 1); if (o.exit) o.exit(); } },
  update(dt) { let took = false; for (const o of G.overlays.slice()) { if (o.update && o.update(dt)) took = true; } return took; },
  draw(r) { for (const o of G.overlays) if (o.draw) o.draw(r); },
  has(name) { return G.overlays.some(o => o.name === name); }
};
// toasts
G.toasts = [];
G.toast = (text, color = '#ffe08a', time = 2.4) => { G.toasts.push({ text, color, t: time, max: time }); if (G.toasts.length > 4) G.toasts.shift(); };
G.updateToasts = dt => { for (const t of G.toasts) t.t -= dt; G.toasts = G.toasts.filter(t => t.t > 0); };
G.drawToasts = r => {
  let y = 14; if (G.hubCardActive) return;
  for (const t of G.toasts) {
    const a = Math.min(1, t.t * 3, (t.max - t.t) * 6);
    r.overlay(g => {
      const w = E.font.width(t.text) + 14; const x = Math.round(r.W / 2 - w / 2);
      E.ui.box(g, x, y, w, 14, { bg: ['#1b4a5a', '#0d2a36'], border: '#ffd36a', alpha: Math.max(.2, a) });
      E.font.text(g, t.text, Math.round(r.W / 2), y + 4, t.color, { align: 'center', shadow: '#000', outline: false });
    });
    y += 16;
  }
};
G.wrapScene = scene => {
  const u = scene.update, d = scene.draw;
  scene.update = function (dt) {
    if (G.hub) { try { const gp = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(Boolean); if (gp.some(x => x.buttons[8] && x.buttons[8].pressed)) { G.game.input.suppress('start'); G.game.input.suppress('pause'); } } catch (e) { /* no pads */ } }   // AI Hub rule: Create + Options belongs to the hub
    if (G.attract && G.attractExitCheck && G.attractExitCheck(dt)) return;
    G.updateToasts(dt); const took = G.overlay.update(dt); if (took && !G.devRunning) return; if (u) u.call(this, dt);
  };
  scene.draw = function (r) { if (d) d.call(this, r); G.drawToasts(r); G.overlay.draw(r); if (G.attract && G.drawAttract) G.drawAttract(r); };
  return scene;
};

G.clone = o => JSON.parse(JSON.stringify(o));
G.shade = (hex, k) => E.shade ? E.shade(hex, k) : hex;
G.scenes = {};
