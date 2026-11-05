/* KARATE CHAMPON: a point-sparring karate game inspired by Karate Champ (1984).
 * CORE LOOP: Read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land
 * theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the
 * match. Win to earn a belt and the next stage, with a bonus stage after every second win.
 * Built on my-3D2dge (v0.85.2, extended: engine/CHANGES.md). All content is data (KC.DATA); every system reads KC.TUNE
 * live so the dev panel's sliders apply at once. */
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const KC = {}; if (typeof window !== 'undefined') window.KC = KC;
KC.VERSION = '1.0.0';
const HUB = typeof AIHub !== 'undefined' ? AIHub : null, SESSION = !!(HUB && HUB.active);
KC.SESSION = SESSION;

/* ---- TUNING: the live variables (dev panel sliders) ---- */
KC.TUNE_SPEC = [
  ['gameSpeed', 'GAME SPEED', .25, 2, .05, 1], ['techSpeed', 'TECHNIQUE SPEED', .5, 1.5, .05, 1], ['walk', 'WALK SPEED', 40, 120, 2, 72],
  ['jump', 'JUMP POWER', 250, 450, 5, 360], ['gravity', 'GRAVITY', 700, 1400, 10, 1100], ['hitstop', 'HIT-STOP (S)', 0, .3, .01, .10],
  ['fullAt', 'FULL POINT AT', 300, 1000, 50, 600], ['counterMul', 'COUNTER X', 1, 3, .1, 2], ['reachScale', 'REACH X', .7, 1.4, .05, 1],
  ['blockWindow', 'BLOCK FRAMES', 6, 30, 1, 14], ['clock', 'ROUND CLOCK (S)', 10, 99, 1, 30], ['pointsToWin', 'POINTS TO WIN', 1, 5, .5, 2],
  ['roundsToWin', 'ROUNDS TO WIN', 1, 3, 1, 2], ['cpuLevel', 'CPU LEVEL (0=AUTO)', 0, 10, 1, 0], ['cpuReact', 'CPU REACTION X', .5, 2, .05, 1],
  ['cpuAggression', 'CPU AGGRESSION (-1=AUTO)', -1, 1, .05, -1], ['refPace', 'REFEREE PACE X', .5, 2, .05, 1], ['potSpeed', 'POT SPEED X', .5, 2, .05, 1],
  ['bullSpeed', 'BULL SPEED X', .5, 2, .05, 1], ['kiSpeed', 'KI GAUGE SPEED X', .5, 2, .05, 1], ['sessionTarget', 'ONLINE BOUT WINS', 1, 10, 1, 5]
];
KC.TUNE_DEFAULTS = {}; for (const s of KC.TUNE_SPEC) KC.TUNE_DEFAULTS[s[0]] = s[5];
const TUNE = KC.TUNE = Object.assign({}, KC.TUNE_DEFAULTS);
KC.tuneChanged = () => KC.TUNE_SPEC.some(s => Math.abs(TUNE[s[0]] - s[5]) > 1e-9);
// dev toggles (KC.Dev): read live by the systems
const DEV = KC.DEVT = { boxes: false, frames: false, inputs: false, thoughts: false, invincible: false, p2: 'cpu', infTime: false, freezeCpu: false,
  slowmo: false, frameStep: false, fps: false, muteVoices: false, skipCut: false, unlocked: false, enabled: false };

/* ---- UTIL ---- */
const U = KC.U = {
  rng: seed => E.rng(seed >>> 0 || 1),
  hash: s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; },
  steps: f => Math.max(1, Math.round(f * 2)),                         // 60 fps frames -> 120 Hz steps
  pad: (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, '0'),
  // names from the hub drawn in the pixel font: uppercased, unsupported characters as ?, 10 long at most
  name: s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .!?'\-]/g, '?').slice(0, 10) || '?',
  lerpAng: (a, b, k) => a + E.angDiff(a, b) * k,
  ease: k => k * k * (3 - 2 * k)
};
const FIX = s => String(s).replace(/·/g, '•').replace(/[—–]/g, '-').replace(/…/g, '...');
const T = (g, s, x, y, c, o) => E.font.text(g, FIX(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const TW = (s, o) => E.font.width(FIX(s), o || {});
KC.T = T; KC.TW = TW;
const BIG = { scale: 2 };
const TITLE_COLS = ['#fff6d0', '#ffd060', '#e8782a'];
KC.title = (g, s, x, y, scale = 3, colors = TITLE_COLS, o = {}) => E.font.title(g, FIX(s), Math.round(x), Math.round(y), Object.assign({ scale, colors, align: 'center', depth: Math.max(1, scale - 1) }, o));
const box = (g, x, y, w, h, o) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#1c1830', '#0c0a18'], border: '#e8d8a8' }, o));
KC.box = box;

/* ---- GLYPHS: controller badges, keycaps, stick and mouse icons drawn in pixels (the 5x7 font has no ✕ ○ □ △) ---- */
const PS = { 0: ['✕', '#7aa7ff'], 1: ['○', '#ff6a6a'], 2: ['□', '#ff8ad8'], 3: ['△', '#5ad8a0'] };
const XB = { 0: ['A', '#5ad86a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a9aff'], 3: ['Y', '#f0d040'] };
function drawPsSym(g, i, cx, cy, s, c) {   // a PlayStation symbol drawn as lines
  const r = Math.max(2, Math.round(s * .3));
  if (i === 0) { px.line(g, cx - r, cy - r, cx + r, cy + r, c, s > 12 ? 2 : 1); px.line(g, cx + r, cy - r, cx - r, cy + r, c, s > 12 ? 2 : 1); }
  else if (i === 1) { px.disc(g, cx, cy, r + 1, c); px.disc(g, cx, cy, r - (s > 12 ? 1 : 0), '#16141e'); }
  else if (i === 2) { px.rect(g, cx - r, cy - r, r * 2 + 1, r * 2 + 1, c); px.rect(g, cx - r + 1, cy - r + 1, r * 2 - 1, r * 2 - 1, '#16141e'); }
  else { px.line(g, cx, cy - r - 1, cx - r - 1, cy + r, c); px.line(g, cx, cy - r - 1, cx + r + 1, cy + r, c); px.line(g, cx - r - 1, cy + r, cx + r + 1, cy + r, c); }
}
const ARROW = { u: '↑', d: '↓', l: '←', r: '→', n: '•' };
/** draw one glyph at (x, y) (top left), size s (its height); returns its width. code: 'pad0'..'pad3' (face buttons, PS or
 *  Xbox by the setting), 'L:u' / 'R:r' (a stick and a direction), 'key:I' (a keycap), 'mouse:0' / 'mouse:2', 'btn:L1' */
KC.glyph = (g, x, y, code, s = 11) => {
  x = Math.round(x); y = Math.round(y);
  const [kind, v] = code.split(':');
  if (kind.startsWith('pad')) {
    const i = +kind.slice(3), xbox = KC.padFamily() === 'xbox', [sym, c] = (xbox ? XB : PS)[i];
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#16141e'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, '#2c2838');
    if (xbox) T(g, sym, x + s / 2 - TW(sym) / 2 + .5, y + s / 2 - 3, c, { shadow: null });
    else drawPsSym(g, i, Math.round(x + s / 2), Math.round(y + s / 2), s, c);
    return s;
  }
  if (kind === 'L' || kind === 'R') {
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#16141e'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, '#3a3650');
    const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0], n: [0, 0] }[v] || [0, 0], k = s * .22;
    px.disc(g, x + s / 2 + d[0] * k, y + s / 2 + d[1] * k, Math.max(2, s / 2 - 3), '#8a86a8');
    T(g, kind, x + s / 2 - 2 + d[0] * k, y + s / 2 - 3 + d[1] * k, '#fff', { shadow: null, font: s < 12 ? 'tiny' : undefined });
    if (v && v !== 'n') T(g, ARROW[v], x + s + 1, y + s / 2 - 3, '#ffd060');
    return s + (v && v !== 'n' ? 8 : 0);
  }
  if (kind === 'key') {
    const w = Math.max(s, TW(v) + 6);
    px.rect(g, x, y + 1, w, s, '#5a5468'); px.rect(g, x, y, w, s - 1, '#e8e4f0'); px.rect(g, x + 1, y + 1, w - 2, s - 3, '#d0ccdc');
    T(g, v, x + w / 2 - TW(v) / 2, y + s / 2 - 4, '#1a1624', { shadow: null });
    return w;
  }
  if (kind === 'mouse') {
    const w = Math.round(s * .75);
    px.rect(g, x, y, w, s, '#e8e4f0'); px.rect(g, x + 1, y + 1, w - 2, s - 2, '#c8c4d4');
    px.rect(g, v === '2' ? x + w / 2 : x + 1, y + 1, w / 2 - 1, s * .45, '#ff8a4a'); px.rect(g, x + w / 2, y, 1, s * .45, '#5a5468');
    return w;
  }
  if (kind === 'btn') {
    const w = TW(v) + 6; px.rect(g, x, y, w, s, '#16141e'); px.rect(g, x + 1, y + 1, w - 2, s - 2, '#3a3650'); T(g, v, x + 3, y + s / 2 - 4, '#fff', { shadow: null }); return w;
  }
  return 0;
};
KC.padFamily = () => (game.settings.glyphs === 'xbox' ? 'xbox' : game.settings.glyphs === 'playstation' ? 'playstation' : game.input.padStyle() === 'xbox' ? 'xbox' : 'playstation');
// the device prompts follow: the last used ('gamepad' | 'keyboard' | 'mouse')
KC.dev = (inp = game.input) => inp.lastDevice === 'gamepad' ? 'pad' : inp.lastDevice === 'mouse' ? 'mouse' : 'key';
/** a row of glyph codes and words: [['pad0', 'SELECT'], ['pad1', 'BACK']] centred at y; returns nothing */
KC.promptRow = (g, items, cx, y, s = 11) => {
  const parts = items.filter(Boolean), widths = parts.map(([c, w]) => glyphW(c, s) + 3 + TW(w) + 10), total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  parts.forEach(([c, w], i) => { const gw = KC.glyph(g, x, y, c, s); T(g, w, x + gw + 3, y + s / 2 - 4, '#f4ecd8'); x += widths[i]; });
};
function glyphW(c, s) { const [k, v] = c.split(':'); return k === 'key' ? Math.max(s, TW(v) + 6) : k === 'mouse' ? Math.round(s * .75) : k === 'btn' ? TW(v) + 6 : (k === 'L' || k === 'R') && v && v !== 'n' ? s + 8 : s; }
KC.glyphW = glyphW;
// confirm / back glyphs by device
KC.ok = () => KC.dev() === 'pad' ? 'pad0' : KC.dev() === 'mouse' ? 'mouse:0' : 'key:ENTER';
KC.back = () => KC.dev() === 'pad' ? 'pad1' : KC.dev() === 'mouse' ? 'mouse:2' : 'key:ESC';
KC.startG = () => KC.dev() === 'pad' ? 'btn:OPTIONS' : 'key:ENTER';
KC.bar = (g, items) => { const W = g.canvas ? g.canvas.width : game.W; px.blend(g, .6, 'normal', () => px.rect(g, 0, game.H - 18, game.W, 18, '#08060e')); KC.promptRow(g, items, game.W / 2, game.H - 15); };

/* ---- MENU: a 10-foot menu (scale-2 text, a pulsing bar, ▸ cursor, hold to repeat; hover moves the focus, click picks) ---- */
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.t = 0; this.rects = []; this.scale = o.scale || 2; }
  get sel() { return this.items[this.i]; }
  _ok(i) { const it = this.items[i]; return it && !it.disabled && !it.hidden; }
  move(d) { const n = this.items.length; for (let k = 1; k <= n; k++) { const j = (this.i + d * k + n * 4) % n; if (this._ok(j)) { this.i = j; game.audio.sfx('menuMove'); if (this.o.onMove) this.o.onMove(this.i); KC.Attract.poke(); return; } } }
  update(dt, inputs = game.players) {
    this.t += dt; if (!this._ok(this.i)) this.move(1);
    for (const I of inputs) {
      if (I.repeat('up', .35, .09)) this.move(-1); else if (I.repeat('down', .35, .09)) this.move(1);
      const it = this.items[this.i];
      if (it && it.adjust) { if (I.repeat('left', .35, .09)) { it.adjust(-1); game.audio.sfx('menuMove'); } else if (I.repeat('right', .35, .09)) { it.adjust(1); game.audio.sfx('menuMove'); } }
      if (I.pressed('confirm')) { I.consume && I.consume('confirm'); return this.pick(); }
      if (I.pressed('cancel') && this.o.onCancel) { game.audio.sfx('menuBack'); this.o.onCancel(); return true; }
    }
    const I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (p && (this._lp === undefined || this._lp[0] !== p[0] || this._lp[1] !== p[1])) { this._lp = p.slice(); const k = this.hit(p); if (k >= 0 && k !== this.i && this._ok(k)) { this.i = k; game.audio.sfx('menuMove'); if (this.o.onMove) this.o.onMove(k); } }
    if (c) { const k = this.hit(c); if (k >= 0 && this._ok(k)) { this.i = k; return this.pick(); } }
    return false;
  }
  hit(p) { return this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) return false; game.audio.sfx('menuOk'); KC.Attract.poke(); if (it.fn) it.fn(); else if (this.o.onPick) this.o.onPick(this.i, it); return true; }
  draw(g, cx, y, o = {}) {
    const sc = o.scale || this.scale, lh = o.lh || sc * 9 + 6, vis = this.items.filter(it => !it.hidden);
    const w = o.w || Math.max(...vis.map(it => TW(this.label(it), { scale: sc }))) + 40;
    if (o.box !== false) box(g, cx - w / 2 - 6, y - 8, w + 12, vis.length * lh + 12, { alpha: o.alpha === undefined ? .85 : o.alpha });
    this.rects = []; let row = 0;
    this.items.forEach((it, i) => {
      if (it.hidden) { this.rects[i] = null; return; }
      const yy = y + row++ * lh, on = i === this.i, lab = this.label(it);
      this.rects[i] = [cx - w / 2, yy - 3, w, lh];
      if (on) { const pulse = .35 + .2 * Math.sin(this.t * 6); px.blend(g, pulse, 'add', () => px.rect(g, cx - w / 2, yy - 3, w, lh - 2, '#e8a040')); T(g, '▸', cx - w / 2 + 4 + Math.round(Math.sin(this.t * 8)), yy, '#ffe08a', { scale: sc }); }
      T(g, lab, cx - TW(lab, { scale: sc }) / 2, yy, it.disabled ? '#6a6488' : on ? '#fff6d0' : '#d8d0e8', { scale: sc });
    });
  }
  label(it) { return typeof it.label === 'function' ? it.label() : it.label; }
}
KC.Menu = Menu;
