/* BIG BUCK HUNT-OFF — core: constants, RNG streams, tuning, event bus, records, glyphs, input helpers.
   CORE LOOP: spot the bucks, shoot clean, pump, never shoot a doe; bag them before they're gone, then read your shots
   in x-ray and climb the standings. */
(() => {
const E = My3D2dge;
const BB = globalThis.BB = { E, VERSION: '1.0' };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
BB.clamp = clamp; BB.lerp = lerp;

/* ---------- seeded RNG streams (gameplay never draws from the unseeded generator) ---------- */
function mulberry(seed) {
  let s = seed >>> 0;
  const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.seed = seed; return f;
}
BB.rng = mulberry;
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
BB.hashStr = hashStr;
BB.RNG = {
  runSeed: 4141,
  streams: {},
  stream(name) { return this.streams[name] || (this.streams[name] = mulberry(hashStr(name) ^ this.runSeed)); },
  reseed(seed) { this.runSeed = seed >>> 0; this.streams = {}; },
  /* cosmetic stream: drawing from it never shifts gameplay */
  fx() { return this.stream('fx'); }
};
BB.rand = (a, b, name = 'spawn') => a + (b - a) * BB.RNG.stream(name)();
BB.fxr = (a = 0, b = 1) => a + (b - a) * BB.RNG.stream('fx')();
BB.pickFrom = (list, name = 'spawn') => list[Math.floor(BB.RNG.stream(name)() * list.length) % list.length];

/* value noise used by terrain, fog and clouds */
function hash2(ix, iy, seed) { let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise2(x, y, seed = 1) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
BB.noise2 = noise2; BB.hash2 = hash2;

/* ---------- tuning (the dev sliders, Appendix A of the plan) ---------- */
const TUNING_DEFS = [
  ['animalSpeed', 'Animal speed', 1, .25, 2, .05], ['spook', 'Gunshot fear', 1, 0, 2, .05], ['doeShare', 'Does and fawns', 1, 0, 2, .1],
  ['siteTime', 'Site time x', 1, .3, 3, .1], ['reticleSpeed', 'Reticle speed', 330, 150, 900, 10], ['assist', 'Aim assist friction', .65, 0, 1, .05],
  ['rounds', 'Rounds in tube', 5, 1, 10, 1], ['rackTime', 'Pump time', .22, 0, .6, .02], ['reloadTime', 'Reload time', 1.25, .2, 3, .05],
  ['scopeMag', 'Scope zoom', 3.5, 1.5, 6, .1], ['sway', 'Scope sway', 2.6, 0, 6, .1], ['breath', 'Hold breath (s)', 3, 1, 6, .25],
  ['calls', 'Calls per site', 2, 0, 5, 1], ['callFreeze', 'Call freeze (s)', 1.4, 0, 4, .1], ['distanceSlope', 'Metres per +1 dist x', 75, 25, 200, 5],
  ['heartMult', 'Heart shot x', 2, .5, 4, .1], ['headMult', 'Head shot x', 1.8, .5, 4, .1], ['lungMult', 'Lung shot x', 1.6, .5, 4, .1],
  ['runningMult', 'Running shot x', 1.25, 1, 2, .05], ['antlerBoost', 'Antler size', 1.15, 1, 2, .05], ['animalScale', 'Animal size', 1.6, .8, 2.4, .05],
  ['fog', 'Fog', 1, 0, 2, .1], ['timeOfDay', 'Time of day', 0, -1, 1, .1], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
BB.TUNING_DEFS = TUNING_DEFS;
BB.T = {};
BB.dev = { god: false, infinite: false, freeze: false, slow: false, overlays: { zones: false, labels: false, fps: false }, open: false, page: 0, freecam: false };
function resetTuning() { for (const d of TUNING_DEFS) BB.T[d[0]] = d[2]; }
resetTuning();
BB.resetTuning = () => { resetTuning(); saveTuning(); };
function saveTuning() { try { E.store.set('bbho.tuning', BB.T); } catch (e) { /* storage blocked */ } }
BB.saveTuning = saveTuning;
BB.loadTuning = () => { const t = E.store.get('bbho.tuning', null); if (t) for (const d of TUNING_DEFS) if (typeof t[d[0]] === 'number') BB.T[d[0]] = clamp(t[d[0]], d[3], d[4]); };

/* ---------- event bus ---------- */
const handlers = {};
BB.bus = {
  on(n, f) { (handlers[n] || (handlers[n] = [])).push(f); return () => { handlers[n] = handlers[n].filter(h => h !== f); }; },
  emit(n, d) { const l = handlers[n]; if (l) for (const f of l.slice()) { try { f(d); } catch (e) { if (BB.game) BB.game.fail('event ' + n, e); } } },
  clear() { for (const k in handlers) delete handlers[k]; }
};

/* ---------- records (saves) ---------- */
const REC_KEY = 'bbho.records';
BB.defaultRecords = () => ({ stars: {}, best: {}, mounts: {}, plaques: {}, range: false, champion: false, tables: {}, hunts: 0, shots: 0, kills: 0, tutorial: {} });
BB.records = BB.defaultRecords();
BB.loadRecords = () => { const r = E.store.get(REC_KEY, null); if (r && typeof r === 'object') BB.records = Object.assign(BB.defaultRecords(), r); };
BB.saveRecords = () => { try { E.store.set(REC_KEY, BB.records); } catch (e) { /* ignore */ } };
BB.resetRecords = () => { BB.records = BB.defaultRecords(); BB.saveRecords(); };
BB.addScore = (table, name, score) => {
  const t = BB.records.tables[table] || (BB.records.tables[table] = []);
  t.push({ name, score }); t.sort((a, b) => b.score - a.score); t.length = Math.min(t.length, 8); BB.saveRecords();
  return t.findIndex(e => e.name === name && e.score === score);
};
BB.tablePlaces = (table, score) => { const t = BB.records.tables[table] || []; return t.filter(e => e.score > score).length; };

/* ---------- players' seat colours (AI Hub) and reticle shapes ---------- */
BB.COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
BB.SHAPES = ['circle', 'diamond', 'brackets', 'triangle'];
BB.COLOR_NAMES = ['RED', 'BLUE', 'GREEN', 'GOLD'];

/* ---------- ui text helpers ---------- */
BB.txt = (g, s, x, y, c = '#fff', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
BB.tw = (s, o) => E.font.width(s, o || {});
BB.fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---------- glyphs: what to show for an action, by the device used last ---------- */
const PS = { cross: ['✕', '#7aa7ff'], circle: ['○', '#ff7a7a'], square: ['□', '#ff9ad0'], triangle: ['△', '#7ae0a8'] };
const XB = { cross: ['A', '#6fd07a'], circle: ['B', '#ff6a6a'], square: ['X', '#6aa0ff'], triangle: ['Y', '#ffd24a'] };
const ACTIONS = {
  confirm: { pad: 'cross', key: 'Enter', mouse: 'Click' },
  cancel: { pad: 'circle', key: 'Esc', mouse: 'Esc' },
  fire: { pad: 'R2', key: 'Space', mouse: 'Click' },
  pump: { pad: 'square', key: 'R', mouse: 'R / Wheel' },
  scope: { pad: 'L2', key: 'Q', mouse: 'Right click' },
  breath: { pad: 'L1', key: 'Shift', mouse: 'Shift' },
  call: { pad: 'triangle', key: 'E', mouse: 'E' },
  start: { pad: 'Options', key: 'Enter', mouse: 'Click' },
  pause: { pad: 'Options', key: 'Esc', mouse: 'Esc' },
  move: { pad: 'L stick', key: 'WASD', mouse: 'Mouse' },
  aim: { pad: 'L stick', key: 'WASD', mouse: 'Mouse' },
  join: { pad: 'Options', key: 'Enter', mouse: 'Click' },
  tab: { pad: 'D-pad', key: '← →', mouse: 'Click' },
  next: { pad: 'R1', key: 'Tab', mouse: 'Tab' }
};
BB.ACTIONS = ACTIONS;
BB.device = () => { const g = BB.game; if (!g) return 'keyboard'; const d = g.input.lastDevice; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : d === 'touch' ? 'key' : 'key'; };
BB.xbox = () => !!(BB.game && BB.game.settings && BB.game.settings.glyphs === 'Xbox');
/* label for an action under the current device, e.g. ✕ / A / Enter */
BB.glyphLabel = (act, dev) => {
  const a = ACTIONS[act] || { pad: act, key: act, mouse: act }; dev = dev || BB.device();
  if (dev === 'pad') {
    const p = a.pad; const m = BB.xbox() ? XB : PS;
    if (m[p]) return m[p][0];
    if (BB.xbox()) return ({ R2: 'RT', L2: 'LT', L1: 'LB', R1: 'RB', 'L1 R1': 'LB RB', Options: 'Menu' })[p] || p;
    return p;
  }
  return dev === 'mouse' ? a.mouse : a.key;
};
/* draws a small button glyph and returns its width */
BB.glyph = (g, act, x, y, dev) => {
  dev = dev || BB.device(); const lab = BB.glyphLabel(act, dev); const a = ACTIONS[act] || {};
  const m = BB.xbox() ? XB : PS; const col = dev === 'pad' && m[a.pad] ? m[a.pad][1] : '#e8e4ff';
  const w = Math.max(11, BB.tw(lab) + 6);
  if (dev === 'pad') {
    const r = 6; E.px.disc(g, x + 6, y + 5, r, '#10131f'); E.px.disc(g, x + 6, y + 5, r - 1, '#242a44');
    if (m[a.pad]) { drawPadSym(g, a.pad, x + 6, y + 5, col); return 13; }
    E.px.rect(g, x, y, w, 11, '#10131f'); E.px.rect(g, x + 1, y + 1, w - 2, 9, '#2c3354'); BB.txt(g, lab, x + 3, y + 2, '#fff', { shadow: false }); return w;
  }
  E.px.rect(g, x, y, w, 11, '#0b0d16'); E.px.rect(g, x + 1, y + 1, w - 2, 8, '#d9d6ea'); E.px.rect(g, x + 1, y + 9, w - 2, 1, '#8b86a8');
  BB.txt(g, lab, x + 3, y + 2, '#1a1730', { shadow: false });
  return w;
};
function drawPadSym(g, sym, cx, cy, col) {
  if (BB.xbox()) { const t = XB[sym][0]; BB.txt(g, t, cx - BB.tw(t) / 2 + .5, cy - 3, col, { shadow: false }); return; }
  const px = E.px;
  if (sym === 'cross') { px.line(g, cx - 3, cy - 3, cx + 3, cy + 3, col, 1); px.line(g, cx - 3, cy + 3, cx + 3, cy - 3, col, 1); }
  else if (sym === 'circle') { for (let a = 0; a < 16; a++) px.dot(g, Math.round(cx + Math.cos(a / 16 * 6.283) * 3.4), Math.round(cy + Math.sin(a / 16 * 6.283) * 3.4), col); }
  else if (sym === 'square') { px.line(g, cx - 3, cy - 3, cx + 3, cy - 3, col, 1); px.line(g, cx + 3, cy - 3, cx + 3, cy + 3, col, 1); px.line(g, cx + 3, cy + 3, cx - 3, cy + 3, col, 1); px.line(g, cx - 3, cy + 3, cx - 3, cy - 3, col, 1); }
  else { px.line(g, cx, cy - 4, cx + 4, cy + 3, col, 1); px.line(g, cx + 4, cy + 3, cx - 4, cy + 3, col, 1); px.line(g, cx - 4, cy + 3, cx, cy - 4, col, 1); }
}
/* a prompt row: [glyph] LABEL  [glyph] LABEL ... centred or left aligned; items: [[action, label], ...] */
BB.prompts = (g, items, x, y, align = 'center', dev) => {
  let total = 0; const parts = items.map(([a, l]) => { const gw = Math.max(13, BB.tw(BB.glyphLabel(a, dev)) + 7); const w = gw + 3 + BB.tw(l); total += w + 10; return [a, l, gw, w]; });
  total -= 10; let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (const [a, l, gw, w] of parts) { BB.glyph(g, a, Math.round(cx), y, dev); BB.txt(g, l, cx + gw + 3, y + 2, '#e8e4ff'); cx += w + 10; }
};

/* ---------- audio helper: sfx on an offset (valley echoes) ---------- */
BB.sfx = (name, o) => { const a = BB.game && BB.game.audio; if (a && !BB.muteSfx) try { a.sfx(name, o); } catch (e) { /* audio blocked */ } };
BB.sfxLater = (name, delay, o) => { if (BB.game) BB.game.after(delay, () => BB.sfx(name, o)); };
})();
