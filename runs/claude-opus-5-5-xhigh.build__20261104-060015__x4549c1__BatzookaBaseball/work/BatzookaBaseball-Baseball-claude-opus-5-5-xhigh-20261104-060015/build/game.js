/* Batzooka Baseball: the game (built from src/ by tools/build.mjs) */
(() => {
'use strict';
const E = My3D2dge;

/* ===== src/00-core.js ===== */
/* =============================================================================
 * BATZOOKA BASEBALL  00-core: the namespace, registries, event bus, RNG streams,
 * live tuning (TUNE + TUNE_META), units and the ballpark geometry helpers.
 * Every other file adds to BZ; none reaches into another file's locals.
 * ========================================================================== */
const { px, clamp, lerp, TAU } = E;
const BZ = (typeof window !== 'undefined' && window) ? (window.BZ = {}) : {};
BZ.E = E;
BZ.version = '1.0.0';
BZ.cosmetic = true;          // false in headless sims: rigs, particles and sounds are skipped
BZ.headless = false;
BZ.scenes = {};

/* ---- registries: content is data ---- */
const REG = {};
BZ.def = (kind, id, spec) => { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; };
BZ.get = (kind, id) => (REG[kind] || {})[id];
BZ.all = kind => Object.values(REG[kind] || {});
BZ.ids = kind => Object.keys(REG[kind] || {});

/* ---- the event bus (with a ring buffer of the last 200 events for dev mode and tests) ---- */
BZ.bus = {
  h: {}, ring: [], n: 0,
  on(ev, fn) { (this.h[ev] || (this.h[ev] = [])).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.h[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data = {}) {
    this.n++; this.ring.push({ ev, t: BZ.game ? +BZ.game.time.toFixed(2) : 0, data }); if (this.ring.length > 200) this.ring.shift();
    for (const fn of (this.h[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus ' + ev, e); else throw e; } }
    for (const fn of (this.h['*'] || []).slice()) { try { fn(data, ev); } catch (e) { if (BZ.game) BZ.game.fail('bus *', e); } }
  },
  last(ev) { for (let i = this.ring.length - 1; i >= 0; i--) if (this.ring[i].ev === ev) return this.ring[i]; return null; },
  count(ev) { return this.ring.filter(r => r.ev === ev).length; }
};

/* ---- RNG streams: gameplay only from rng.play (seeded per match), cosmetics from rng.fx, the Derby deal from rng.deal ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(99), deal: E.rng(5) };
BZ.seed = (s) => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.deal = E.rng(((s * 7919) >>> 0) || 5); };
BZ.R = () => BZ.rng.play();                         // 0..1 gameplay
BZ.Rr = (a, b) => a + (b - a) * BZ.rng.play();
BZ.Rn = (sd = 1) => { const u = Math.max(1e-9, BZ.rng.play()), v = BZ.rng.play(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v) * sd; };   // normal
BZ.F = () => BZ.rng.fx();                           // 0..1 cosmetic
BZ.Fr = (a, b) => a + (b - a) * BZ.rng.fx();
BZ.pickF = l => l[Math.floor(BZ.rng.fx() * l.length) % l.length];
BZ.pickP = l => l[Math.floor(BZ.rng.play() * l.length) % l.length];

/* ---- live tuning: every balance number lives in TUNE, described in TUNE_META (dev sliders) ---- */
BZ.TUNE_META = [
  // group, key, label, default, min, max, step
  ['Pitching', 'pitchSpeed', 'Pitch speed', 1, .5, 2, .05],
  ['Pitching', 'pitchBreak', 'Pitch break', 1, 0, 2.5, .05],
  ['Pitching', 'aftertouch', 'Aftertouch', 1, 0, 3, .1],
  ['Pitching', 'releaseWindow', 'Release window', 1, .3, 3, .05],
  ['Pitching', 'staminaDrain', 'Stamina drain', 1, 0, 3, .1],
  ['Batting', 'swingTiming', 'Swing timing window', 1, .3, 3, .05],
  ['Batting', 'sweetSpot', 'Sweet spot size', 1, .4, 2.5, .05],
  ['Batting', 'exitVelocity', 'Exit velocity', 1, .5, 2, .05],
  ['Batting', 'launchSpread', 'Launch spread', 1, 0, 2, .05],
  ['Ball', 'gravity', 'Gravity', 1, .3, 2.5, .05],
  ['Ball', 'drag', 'Air drag', .05, 0, .3, .01],
  ['Ball', 'bounce', 'Bounce', 1, .3, 1.5, .05],
  ['Ball', 'rollFriction', 'Roll friction', 1, .3, 3, .05],
  ['Ball', 'wind', 'Wind', 1, 0, 3, .1],
  ['Players', 'runSpeed', 'Runner speed', 1, .5, 2, .05],
  ['Players', 'fielderSpeed', 'Fielder speed', 1, .5, 2, .05],
  ['Players', 'throwSpeed', 'Throw speed', 1, .5, 2, .05],
  ['Players', 'catchRadius', 'Catch reach', 1, .5, 2.5, .05],
  ['Players', 'turboPower', 'Turbo power', 1, 0, 2, .05],
  ['Players', 'turboDrain', 'Turbo drain', 1, 0, 3, .1],
  ['Over the top', 'meterGain', 'Meter gain', 1, 0, 5, .1],
  ['Over the top', 'batzookaPower', 'Batzooka power', 1.6, 1, 3, .05],
  ['Over the top', 'rhubarbChance', 'Rhubarb chance', .4, 0, 1, .05],
  ['Over the top', 'hazardRate', 'Hazard rate', 1, 0, 4, .1],
  ['CPU', 'cpuBat', 'CPU batting', 1, 0, 2, .05],
  ['CPU', 'cpuPitch', 'CPU pitching', 1, 0, 2, .05],
  ['CPU', 'cpuField', 'CPU fielding', 1, 0, 2, .05],
  ['CPU', 'cpuRun', 'CPU running', 1, 0, 2, .05],
  ['Camera', 'plateDist', 'Plate Cam distance', 84, 40, 140, 1],
  ['Camera', 'plateHeight', 'Plate Cam height', 44, 16, 90, 1],
  ['Camera', 'plateFov', 'Plate Cam field of view', 44, 30, 80, 1],
  ['Camera', 'fieldZoom', 'Field Cam zoom', 1, .4, 2, .05],
  ['Camera', 'heightSquash', 'High-ball squash', .45, .2, 1, .05],
  ['Game', 'gameSpeed', 'Game speed', 1, .25, 2, .05]
];
BZ.TUNE_DEFAULTS = {};
for (const [, k, , d] of BZ.TUNE_META) BZ.TUNE_DEFAULTS[k] = d;
BZ.TUNE = Object.assign({}, BZ.TUNE_DEFAULTS);
const TUNE = BZ.TUNE;
BZ.resetTune = (group) => { for (const [g, k, , d] of BZ.TUNE_META) if (!group || g === group) TUNE[k] = d; BZ.saveTune && BZ.saveTune(); };
BZ.tuneMeta = k => BZ.TUNE_META.find(m => m[1] === k);

/* ---- units: 16 U a tile; feet and mph for display ---- */
BZ.feet = u => Math.round(u * .32);
BZ.mph = v => Math.round(v * .26);
BZ.ang = (a) => { a %= TAU; return a < -Math.PI ? a + TAU : a > Math.PI ? a - TAU : a; };
BZ.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
BZ.ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
BZ.fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
BZ.factor = s => 1 + .03 * ((s === undefined ? 5 : s) - 5);    // a 1-10 stat -> 0.88..1.15
BZ.hash = (str) => { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

/* ---- ballpark geometry (offsets from home plate H; north = -y is center field; +x is first base) ---- */
BZ.GEO = {
  plate: [0, -6], first: [212, -212], second: [0, -424], third: [-212, -212], rubber: [0, -205], mound: [0, -200],
  boxR: [-18, -4], boxL: [18, -4], catcher: [0, 16], umpire: [0, 30], deckL: [-78, -21], deckR: [78, -21],
  zoneHalfW: 6, zoneLo: 9, zoneHi: 25, ballR: 1.6, releaseZ: 26, releaseY: -198,
  infield: 470, backstop: 110, foulWall: 70
};
BZ.FIELD_POS = {   // fielders' default spots, by position id
  P: [0, -200], C: [0, 16], '1B': [225, -275], '2B': [105, -395], SS: [-105, -395], '3B': [-225, -275], LF: [-420, -760], CF: [0, -900], RF: [420, -760]
};
BZ.POS_ORDER = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
BZ.POS_NUM = { P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9 };

/** spray angle of an offset from home (radians, 0 = straight-away center, + toward right field) */
BZ.theta = (dx, dy) => Math.atan2(dx, -dy);
/** a park's fence distance at spray angle th (Catmull-Rom through the 5 control distances) */
BZ.fenceR = (park, th) => {
  const c = park.fence, deg = clamp(th * 180 / Math.PI, -45, 45), u = (deg + 45) / 22.5, i = Math.min(3, Math.floor(u)), t = u - i;
  const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(4, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
/** the fence height at spray angle th */
BZ.fenceH = (park, th) => {
  const deg = th * 180 / Math.PI;
  for (const s of park.fenceSections || []) if (deg >= s.from && deg <= s.to) return s.h;
  return park.fenceH || 40;
};
/** the angle where the fence meets the foul wall (just past the pole) */
BZ.fenceSpan = (park) => {
  if (park._span) return park._span;
  let best = 45;
  for (let d = 45; d < 60; d += .05) { const th = d * Math.PI / 180, R = BZ.fenceR(park, th); if (R * Math.sin(th - Math.PI / 4) >= BZ.GEO.foulWall) { best = d; break; } }
  return (park._span = best * Math.PI / 180);
};
/** is an offset point (from H) inside the playing field (fair + foul ground inside the walls)? and how far in */
BZ.inField = (park, dx, dy) => {
  const r = Math.hypot(dx, dy), th = BZ.theta(dx, dy), span = BZ.fenceSpan(park);
  if (Math.abs(th) <= span && dy < 0) { if (r > BZ.fenceR(park, th)) return false; }
  // foul walls: 70 U outside the foul lines (perpendicular distance), and the backstop arc behind home
  const outL = (-dx + dy) / Math.SQRT2, outR = (dx + dy) / Math.SQRT2;   // + outside the left / right foul line
  if (outL > BZ.GEO.foulWall || outR > BZ.GEO.foulWall) return false;
  if (outL > 0 && outR > 0 && r > BZ.GEO.backstop) return false;          // behind home: the backstop arc
  return true;
};
BZ.outL = (dx, dy) => (-dx + dy) / Math.SQRT2;
BZ.outR = (dx, dy) => (dx + dy) / Math.SQRT2;
/** fair territory test for a ground point (offset from H): within 45 degrees of center, ahead of home */
BZ.fair = (dx, dy) => { const th = BZ.theta(dx, dy); return dy < 0 && Math.abs(th) <= Math.PI / 4 + 1e-6; };

/* ---- a tiny deterministic hash noise for drawing ---- */
BZ.n2 = (x, y) => E.hash2 ? E.hash2(Math.floor(x), Math.floor(y)) : ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;

/* ---- small helpers used everywhere ---- */
BZ.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
BZ.moveTo = (o, tx, ty, sp, dt) => {   // move a point toward a target at speed: returns true when it arrives
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy), st = sp * dt;
  if (d <= st || d < .01) { o.vx = d > .01 ? dx / dt : 0; o.vy = d > .01 ? dy / dt : 0; o.x = tx; o.y = ty; return true; }
  o.vx = dx / d * sp; o.vy = dy / d * sp; o.x += o.vx * dt; o.y += o.vy * dt; o.facing = Math.atan2(dy, dx); return false;
};
BZ.later = [];   // simple frame timers that survive game.after's scene clearing within a scene: [t, fn]
BZ.wait = (s, fn) => BZ.later.push([s, fn]);
BZ.tickLater = (dt) => { for (let i = BZ.later.length - 1; i >= 0; i--) { const w = BZ.later[i]; w[0] -= dt; if (w[0] <= 0) { BZ.later.splice(i, 1); try { w[1](); } catch (e) { BZ.game.fail('later', e); } } } };
BZ.clearLater = () => { BZ.later.length = 0; };

/* ===== src/01-input.js ===== */
/* =============================================================================
 * 01-input: the positional action preset, device tracking, the glyph icon renderer,
 * the prompt builder, mouse helpers (wheel), idle detection and touch-only mode.
 * Actions are named by the button's position: the same button swings, pitches a
 * heater, throws home or punches, by context.
 * ========================================================================== */
BZ.KEYS = {
  // the 8 face and shoulder buttons first: half-keyboard players get these on their 8 keys, in order
  south: ['Space', 'KeyK', 'Mouse0', 'Pad0'],
  east: ['KeyL', 'Pad1'],
  west: ['KeyJ', 'Mouse2', 'Pad2'],
  north: ['KeyI', 'Pad3'],
  l1: ['KeyQ', 'Tab', 'Pad4'],
  r1: ['KeyE', 'Pad5'],
  l2: ['ShiftLeft', 'ShiftRight', 'Pad6'],
  r2: ['KeyC', 'ControlLeft', 'Pad7'],
  view: ['KeyV', 'Pad11'],
  create: ['Pad8'],
  num1: ['Digit1', 'Numpad1'], num2: ['Digit2', 'Numpad2'], num3: ['Digit3', 'Numpad3'], num4: ['Digit4', 'Numpad4'], num5: ['Digit5', 'Numpad5'],
  pinDown: ['BracketLeft'], pinUp: ['BracketRight'], pinNext: ['Backslash'], more: ['KeyM'],
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyK', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
BZ.ACTION_NAMES = {   // the Controls screen's names (positional: what each does depends on the moment)
  south: 'Swing / Heater / Throw home', east: 'Breaking ball / Throw to 1B', west: 'Power swing / Off-speed / Throw to 3B',
  north: 'Bunt / Signature pitch / Throw to 2B', l1: 'Steal / Pickoff / Switch fielder', r1: 'BATZOOKA / Super / Jump',
  l2: 'Turbo', r2: 'Dive', view: 'Field camera', create: false, num1: 'Pick 1 (pitch / 1B)', num2: 'Pick 2 (pitch / 2B)',
  num3: 'Pick 3 (pitch / 3B)', num4: 'Pick 4 (pitch / home)', num5: 'Pick 5 (super pitch)', pinDown: false, pinUp: false, pinNext: false, more: false
};
BZ.BASE_BTN = { 1: 'east', 2: 'north', 3: 'west', 4: 'south' };   // a face button picks a base by its position
BZ.BTN_BASE = { east: 1, north: 2, west: 3, south: 4 };
BZ.NUM_BASE = { num1: 1, num2: 2, num3: 3, num4: 4 };

/* ---- device and idle tracking ---- */
BZ.idle = 0;                 // seconds since the last input of any kind (attract mode)
BZ.inputSeen = false;
BZ.wheel = 0;                // mouse wheel notches since the last step (+1 down, -1 up)
BZ._wheelAcc = 0;
BZ.touchOnly = false;
BZ.anyInput = (game) => {
  for (const I of game.players) {
    if (I.anyPressed()) return true;
    const m = I.move(); if (Math.hypot(m[0], m[1]) > .3) return true;
  }
  if (BZ._mouseMoved) return true;
  if (BZ.wheel) return true;
  if (BZ._rawKey) return true;
  return false;
};
BZ.inputTick = (game, dt) => {
  BZ.wheel = BZ._wheelAcc; BZ._wheelAcc = 0;
  const I = game.input, m = I.pointer && I.pointer();
  BZ._mouseMoved = false;
  if (m) { if (BZ._lastPtr && Math.hypot(m[0] - BZ._lastPtr[0], m[1] - BZ._lastPtr[1]) > 4) BZ._mouseMoved = true; BZ._lastPtr = m; }
  if (BZ.anyInput(game)) { BZ.idle = 0; BZ.inputSeen = true; } else BZ.idle += dt;
  BZ._rawKey = false;
};
BZ.installDom = (game) => {
  if (typeof window === 'undefined' || !window.document || game.headless) return;
  const cv = game.screen.canvas;
  if (cv) cv.addEventListener('wheel', e => { if (BZ.wheelOwned) { e.preventDefault(); BZ._wheelAcc += e.deltaY > 0 ? 1 : -1; } BZ._rawKey = true; }, { passive: false });
  window.addEventListener('keydown', () => { BZ._rawKey = true; if (BZ.touchOnly) { BZ.touchOnly = false; game.input.touchEnabled = false; } }, true);
  window.addEventListener('pointerdown', () => { BZ._rawKey = true; }, true);
  window.addEventListener('gamepadconnected', () => { BZ._rawKey = true; if (BZ.touchOnly) BZ.touchOnly = false; });
  try {
    const mm = q => window.matchMedia && window.matchMedia(q).matches;
    BZ.touchOnly = !!(mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && navigator.maxTouchPoints > 0);
  } catch (e) { BZ.touchOnly = false; }
  if (/#touch\b/.test(location.hash)) BZ.touchOnly = true;
  game.input.touchEnabled = false;   // no touch controls: a controller or keyboard is required
};

/** the device a player last used: 'gamepad' | 'keyboard' | 'mouse' | 'touch' */
BZ.devc = (I) => (I || BZ.game.input).lastDevice || 'keyboard';
/** the glyph family for pads: 'playstation' (default) or 'xbox' */
BZ.family = () => (BZ.game.settings && BZ.game.settings.glyphs === 'xbox') ? 'xbox' : 'playstation';

/* ---- the glyph icon renderer: draws the icon for an action on the player's device ---- */
const PS_COL = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#f08ad8', '△': '#4fe0b0' };
const XB_COL = { A: '#6cc04a', B: '#e8584a', X: '#4a8ef0', Y: '#f4c430' };
const PS_FROM_POS = ['✕', '○', '□', '△'];
const XB_FROM_POS = ['A', 'B', 'X', 'Y'];
const PAD_NAMES = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['Create', 'View'], 9: ['Options', 'Menu'], 10: ['L3', 'LS'], 11: ['R3', 'RS'] };
/** the code to show for an action on a device (after rebinding) */
BZ.codeFor = (I, a, device) => {
  const m = I.map[a]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  const isPad = c => /^Pad\d+$/.test(c);
  const pads = real.filter(isPad), keys = real.filter(c => !isPad(c));
  if (device === 'gamepad') return pads[0] || keys[0] || null;
  if (device === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
};
/** a glyph descriptor for an action: { kind: 'face'|'pill'|'key'|'mouse'|'dpad'|'stick', text, color, side } */
BZ.glyphOf = (I, a, device) => {
  device = device || BZ.devc(I);
  if (a === 'move') return device === 'gamepad' ? { kind: 'stick', text: 'L' } : device === 'mouse' ? { kind: 'mouse', side: 'move' } : { kind: 'key', text: 'WASD' };
  if (a === 'wheel') return { kind: 'mouse', side: 'wheel' };
  const code = BZ.codeFor(I, a, device === 'touch' ? 'keyboard' : device); if (!code) return { kind: 'key', text: '?' };
  const pm = /^Pad(\d+)$/.exec(code);
  if (pm) {
    const n = +pm[1], fam = BZ.family();
    if (n <= 3) return fam === 'xbox' ? { kind: 'face', text: XB_FROM_POS[n], color: XB_COL[XB_FROM_POS[n]], fam } : { kind: 'face', text: PS_FROM_POS[n], color: PS_COL[PS_FROM_POS[n]], fam };
    if (n >= 12 && n <= 15) return { kind: 'dpad', dir: n - 12 };
    const nm = PAD_NAMES[n]; return { kind: n === 10 || n === 11 ? 'stick' : 'pill', text: nm ? nm[fam === 'xbox' ? 1 : 0] : 'P' + n };
  }
  if (code === 'Mouse0') return { kind: 'mouse', side: 'L' };
  if (code === 'Mouse2') return { kind: 'mouse', side: 'R' };
  if (code === 'Mouse1') return { kind: 'mouse', side: 'M' };
  return { kind: 'key', text: I.codeLabel(code) };
};
/** draw a glyph icon at (x, y) (top-left), height s; returns its width */
BZ.drawGlyph = (g, gl, x, y, s = 11, dim = false) => {
  x = Math.round(x); y = Math.round(y);
  const al = dim ? .45 : 1;
  const wrap = f => { if (dim) px.blend(g, al, 'normal', f); else f(); };
  let w = s;
  if (gl.kind === 'face') {
    const r = s / 2;
    wrap(() => {
      px.disc(g, x + r, y + r, r, '#0c0e16'); px.disc(g, x + r, y + r, r - 1, '#1b1d26'); px.disc(g, x + r - .5, y + r - 1.5, r - 2.5, '#262a38');
      if (gl.fam === 'xbox') E.font.text(g, gl.text, x + r + .5, y + r - 3, gl.color, { align: 'center' });
      else {
        const c = gl.color, cx = x + r, cy = y + r, k = Math.max(2, Math.round(r * .5));
        if (gl.text === '✕') { px.line(g, cx - k, cy - k, cx + k, cy + k, c, 2); px.line(g, cx - k, cy + k, cx + k, cy - k, c, 2); }
        else if (gl.text === '○') { px.disc(g, cx, cy, k + .5, c); px.disc(g, cx, cy, Math.max(.5, k - 1.2), '#1b1d26'); }
        else if (gl.text === '□') { px.rect(g, cx - k, cy - k, k * 2 + 1, k * 2 + 1, c); px.rect(g, cx - k + 1.5, cy - k + 1.5, k * 2 - 2, k * 2 - 2, '#1b1d26'); }
        else { px.poly(g, [[cx, cy - k - 1], [cx + k + 1, cy + k], [cx - k - 1, cy + k]], c); px.poly(g, [[cx, cy - k + 2], [cx + k - 1.5, cy + k - 1.2], [cx - k + 1.5, cy + k - 1.2]], '#1b1d26'); }
      }
    });
  } else if (gl.kind === 'pill' || gl.kind === 'stick') {
    const tw = E.font.width(gl.text); w = Math.max(s, tw + 8);
    wrap(() => {
      E.ui.box(g, x, y, w, s, { bg: ['#3a3f52', '#1b1d26'], border: '#9aa3c0' });
      if (gl.kind === 'stick') px.disc(g, x + w / 2, y + s / 2, s / 2 - 1.5, '#2a2e3c');
      E.font.text(g, gl.text, x + w / 2 + .5, y + s / 2 - 3, '#ffffff', { align: 'center' });
    });
  } else if (gl.kind === 'dpad') {
    const c = x + s / 2, m = y + s / 2, a = s / 2, b = Math.max(2, s / 6);
    wrap(() => {
      px.rect(g, c - b, y, b * 2, s, '#1b1d26'); px.rect(g, x, m - b, s, b * 2, '#1b1d26');
      px.rect(g, c - b + 1, y + 1, b * 2 - 2, s - 2, '#4a5068'); px.rect(g, x + 1, m - b + 1, s - 2, b * 2 - 2, '#4a5068');
      const d = gl.dir; const lit = '#ffd84a';
      if (d === 0) px.rect(g, c - b + 1, y + 1, b * 2 - 2, a - b, lit); else if (d === 1) px.rect(g, c - b + 1, m + b - 1, b * 2 - 2, a - b, lit);
      else if (d === 2) px.rect(g, x + 1, m - b + 1, a - b, b * 2 - 2, lit); else px.rect(g, c + b - 1, m - b + 1, a - b, b * 2 - 2, lit);
    });
  } else if (gl.kind === 'mouse') {
    const mw = Math.round(s * .78); w = mw;
    wrap(() => {
      px.rect(g, x + 1, y, mw - 2, s, '#e8ecf4'); px.rect(g, x, y + 2, mw, s - 4, '#e8ecf4');
      px.rect(g, x + 1, y + 1, mw - 2, s - 2, '#c9cfdc');
      const half = Math.floor(mw / 2), top = Math.round(s * .45);
      if (gl.side === 'L') px.rect(g, x + 1, y + 1, half - 1, top, '#ff7a3a');
      if (gl.side === 'R') px.rect(g, x + half + 1, y + 1, mw - half - 2, top, '#ff7a3a');
      px.line(g, x + half, y + 1, x + half, y + top, '#5a6070');
      px.rect(g, x + half - 1, y + 2, 2, 3, gl.side === 'wheel' || gl.side === 'M' ? '#ff7a3a' : '#5a6070');
      if (gl.side === 'move') { px.rect(g, x + 1, y + top, mw - 2, 1, '#5a6070'); }
    });
  } else {
    const tw = E.font.width(gl.text); w = Math.max(s, tw + 7);
    wrap(() => {
      px.rect(g, x, y + 1, w, s - 1, '#6a7088'); px.rect(g, x, y, w, s - 2, '#f2f4f8'); px.rect(g, x + 1, y + 1, w - 2, s - 4, '#dfe3ec');
      E.font.text(g, gl.text, x + w / 2 + .5, y + Math.round((s - 2) / 2) - 3, '#1b1d26', { align: 'center' });
    });
  }
  return w;
};
/** draw an action's glyph for a player at (x, y); returns the width */
BZ.glyph = (g, I, a, x, y, s = 11, dim = false, device) => BZ.drawGlyph(g, BZ.glyphOf(I || BZ.game.input, a, device), x, y, s, dim);
/** a row of prompts [[action, verb, enabled, why], ...] drawn left to right (align 'left' | 'center' | 'right'); returns width */
BZ.drawPrompts = (g, I, list, x, y, o = {}) => {
  const s = o.size || 11, gap = o.gap || 10, items = list.filter(Boolean);
  const widths = items.map(([a, verb, en, why]) => {
    const gw = Array.isArray(a) ? a.reduce((t, b) => t + BZ.glyphW(I, b, s) + 2, -2) : BZ.glyphW(I, a, s);
    return gw + 4 + E.font.width(en === false && why ? verb + ' (' + why + ')' : verb, { scale: 1 });
  });
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  if (o.panel !== false && items.length) E.ui.box(g, Math.round(cx - 6), Math.round(y - 4), Math.round(total + 12), s + 8, { bg: ['#141826', '#0a0c14'], border: '#3a4060', alpha: .82 });
  items.forEach(([a, verb, en, why], i) => {
    const dim = en === false;
    let gx = cx;
    for (const b of (Array.isArray(a) ? a : [a])) gx += BZ.glyph(g, I, b, gx, y, s, dim) + 2;
    E.font.text(g, dim && why ? verb + ' (' + why + ')' : verb, gx + 2, y + Math.round(s / 2) - 4, dim ? '#7a8098' : '#ffffff', { shadow: '#000' });
    cx += widths[i] + gap;
  });
  return total;
};
BZ.glyphW = (I, a, s = 11) => {
  const gl = BZ.glyphOf(I || BZ.game.input, a);
  if (gl.kind === 'pill' || gl.kind === 'stick') return Math.max(s, E.font.width(gl.text) + 8);
  if (gl.kind === 'key') return Math.max(s, E.font.width(gl.text) + 7);
  if (gl.kind === 'mouse') return Math.round(s * .78);
  return s;
};
/** a menu legend at the bottom of a screen: [[action, verb], ...] */
BZ.legend = (g, r, list, I) => BZ.drawPrompts(g, I || BZ.game.input, list.map(([a, v]) => [a, v, true]), r.W / 2, r.H - 22, { align: 'center' });

/* ---- reading a player's buttons, by context ---- */
/** which base a press picks right now: a face button by position, or a number key; 0 = none */
BZ.basePressed = (I) => {
  for (const b of ['east', 'north', 'west', 'south']) if (I.pressed(b)) return BZ.BTN_BASE[b];
  for (const n of ['num1', 'num2', 'num3', 'num4']) if (I.pressed(n)) return BZ.NUM_BASE[n];
  return 0;
};
BZ.baseHeld = (I) => {
  for (const b of ['east', 'north', 'west', 'south']) if (I.down(b)) return BZ.BTN_BASE[b];
  for (const n of ['num1', 'num2', 'num3', 'num4']) if (I.down(n)) return BZ.NUM_BASE[n];
  return 0;
};
BZ.baseReleased = (I, b) => {
  const btn = BZ.BASE_BTN[b], num = 'num' + b;
  return (btn && I.released(btn)) || I.released(num);
};
/** is the pointer (mouse) over a rectangle (screen pixels)? */
BZ.hover = (I, x, y, w, h) => { const p = I.pointer && I.pointer(); return !!(p && I.lastDevice === 'mouse' && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h); };
BZ.clickIn = (I, x, y, w, h) => { const c = I.clicked && I.clicked(); return !!(c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h); };

/* ===== src/02-audio.js ===== */
/* =============================================================================
 * 02-audio: every sound in code. Sound effects (audio.define), the crowd, the
 * music director (a song per scene, named layers, stings) and BABBLE: the
 * Animalese / Simlish-style gibberish voices every character speaks with.
 * ========================================================================== */
BZ.SFX = {
  tink: [{ wave: 'square', freq: 1800, to: 1400, dur: .06, vol: .22 }, { wave: 'noise', freq: 5000, dur: .04, vol: .12, filter: 'highpass' }],
  crack: [{ wave: 'noise', freq: 2600, to: 900, dur: .09, vol: .55 }, { wave: 'square', freq: 900, to: 300, dur: .08, vol: .22 }, { wave: 'triangle', freq: 220, to: 90, dur: .12, vol: .3 }],
  krakoom: [{ wave: 'noise', freq: 1600, to: 200, dur: .5, vol: .7 }, { wave: 'sine', freq: 120, to: 30, dur: .6, vol: .7 }, { wave: 'square', freq: 1200, to: 2400, dur: .25, vol: .14, delay: .05 }, { wave: 'triangle', freq: 660, dur: .5, vol: .12, delay: .1, vib: [12, .02] }],
  fizzle: [{ wave: 'noise', freq: 3000, to: 400, dur: .7, vol: .3 }, { wave: 'saw', freq: 300, to: 80, dur: .6, vol: .12 }],
  mitt: [{ wave: 'noise', freq: 900, to: 300, dur: .07, vol: .5 }, { wave: 'sine', freq: 180, to: 80, dur: .08, vol: .45 }],
  glove: [{ wave: 'noise', freq: 1300, to: 600, dur: .05, vol: .35 }, { wave: 'sine', freq: 260, to: 140, dur: .05, vol: .25 }],
  pitchWhoosh: [{ wave: 'noise', freq: 900, to: 3200, dur: .32, vol: .2 }],
  foultip: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 2200, dur: .03, vol: .1 }],
  dirtThud: [{ wave: 'noise', freq: 500, to: 200, dur: .09, vol: .35 }],
  bounce: [{ wave: 'sine', freq: 260, to: 120, dur: .06, vol: .25 }, { wave: 'noise', freq: 700, dur: .04, vol: .12 }],
  clang: [{ wave: 'square', freq: 520, to: 480, dur: .25, vol: .16 }, { wave: 'triangle', freq: 1040, dur: .3, vol: .12 }, { wave: 'noise', freq: 1200, dur: .08, vol: .25 }],
  thudWall: [{ wave: 'sine', freq: 140, to: 60, dur: .14, vol: .5 }, { wave: 'noise', freq: 400, dur: .08, vol: .3 }],
  ping: [{ wave: 'triangle', freq: 1760, dur: .4, vol: .2 }, { wave: 'sine', freq: 2640, dur: .3, vol: .12 }],
  cheer: [{ wave: 'noise', freq: 1400, to: 2200, dur: 1.3, vol: .32 }, { wave: 'noise', freq: 900, to: 1500, dur: 1.1, vol: .22, delay: .1 }],
  bigCheer: [{ wave: 'noise', freq: 1200, to: 2600, dur: 2.4, vol: .42 }, { wave: 'noise', freq: 800, to: 1700, dur: 2, vol: .3, delay: .15 }, { wave: 'noise', freq: 2400, to: 3200, dur: 1.6, vol: .12, delay: .3, filter: 'highpass' }],
  groan: [{ wave: 'noise', freq: 900, to: 380, dur: 1.1, vol: .3 }, { wave: 'saw', freq: 200, to: 120, dur: .9, vol: .05 }],
  oooh: [{ wave: 'noise', freq: 600, to: 1300, dur: .5, vol: .25 }, { wave: 'noise', freq: 1300, to: 500, dur: .7, vol: .25, delay: .45 }],
  boo: [{ wave: 'noise', freq: 420, to: 300, dur: 1.2, vol: .25 }, { wave: 'saw', freq: 140, to: 110, dur: 1, vol: .05 }],
  gasp: [{ wave: 'noise', freq: 2400, to: 1200, dur: .3, vol: .22, filter: 'highpass' }],
  murmur: [{ wave: 'noise', freq: 700, to: 800, dur: .7, vol: .06 }],
  step: [{ wave: 'noise', freq: 600, dur: .03, vol: .1 }],
  slide: [{ wave: 'noise', freq: 1600, to: 500, dur: .45, vol: .32 }],
  dive: [{ wave: 'noise', freq: 800, to: 300, dur: .25, vol: .35 }, { wave: 'sine', freq: 150, to: 60, dur: .12, vol: .3, delay: .2 }],
  climb: [{ wave: 'noise', freq: 2000, dur: .06, vol: .18 }, { wave: 'noise', freq: 2200, dur: .06, vol: .18, delay: .1 }, { wave: 'noise', freq: 1900, dur: .06, vol: .18, delay: .2 }],
  throwWhoosh: [{ wave: 'noise', freq: 1200, to: 2600, dur: .2, vol: .2 }],
  crash: [{ wave: 'noise', freq: 1200, to: 200, dur: .5, vol: .6 }, { wave: 'sine', freq: 110, to: 40, dur: .4, vol: .5 }, { wave: 'square', freq: 300, to: 100, dur: .2, vol: .12 }],
  firework: [{ wave: 'sine', freq: 90, to: 30, dur: .5, vol: .45 }, { wave: 'noise', freq: 3000, to: 6000, dur: .8, vol: .16, delay: .1, filter: 'highpass' }],
  launch: [{ wave: 'noise', freq: 2000, to: 6000, dur: .45, vol: .14 }],
  charge: [{ wave: 'saw', freq: 110, to: 880, dur: .7, vol: .14 }, { wave: 'noise', freq: 600, to: 3000, dur: .7, vol: .14 }],
  rocket: [{ wave: 'noise', freq: 900, to: 400, dur: .8, vol: .3 }, { wave: 'saw', freq: 70, dur: .8, vol: .12 }],
  gull: [{ wave: 'square', freq: 1500, to: 900, dur: .14, vol: .14 }, { wave: 'square', freq: 1600, to: 1000, dur: .16, vol: .14, delay: .18 }],
  lava: [{ wave: 'sine', freq: 55, to: 40, dur: 1.4, vol: .5, vib: [7, .2] }, { wave: 'noise', freq: 300, dur: 1.2, vol: .25 }],
  erupt: [{ wave: 'noise', freq: 600, to: 150, dur: 1, vol: .6 }, { wave: 'sine', freq: 80, to: 30, dur: .9, vol: .6 }],
  meteor: [{ wave: 'noise', freq: 4000, to: 400, dur: .9, vol: .3 }, { wave: 'sine', freq: 90, to: 30, dur: .5, vol: .4, delay: .8 }],
  ghost: [{ wave: 'sine', freq: 500, to: 300, dur: .9, vol: .18, vib: [5, .06] }, { wave: 'triangle', freq: 750, to: 450, dur: .8, vol: .08, vib: [6, .05] }],
  drone: [{ wave: 'saw', freq: 140, dur: .5, vol: .06, vib: [30, .03] }],
  horn: [{ wave: 'saw', freq: 98, dur: 1.2, vol: .22 }, { wave: 'square', freq: 147, dur: 1.2, vol: .12 }],
  splash: [{ wave: 'noise', freq: 1200, to: 300, dur: .6, vol: .4 }],
  ding: [{ wave: 'triangle', freq: 1320, dur: .25, vol: .25 }, { wave: 'triangle', freq: 1760, dur: .35, vol: .2, delay: .08 }],
  turbo: [{ wave: 'noise', freq: 800, to: 2200, dur: .25, vol: .14 }],
  select: [{ wave: 'square', freq: 660, dur: .04, vol: .14 }],
  confirm: [{ wave: 'square', freq: 660, dur: .05, vol: .16 }, { wave: 'square', freq: 990, dur: .08, vol: .16, delay: .05 }],
  cancel: [{ wave: 'square', freq: 440, to: 300, dur: .08, vol: .14 }],
  bonk: [{ wave: 'sine', freq: 500, to: 180, dur: .12, vol: .4 }, { wave: 'noise', freq: 900, dur: .05, vol: .2 }],
  slideWhistle: [{ wave: 'sine', freq: 500, to: 1400, dur: .35, vol: .2 }, { wave: 'sine', freq: 1400, to: 400, dur: .35, vol: .2, delay: .35 }],
  pow: [{ wave: 'noise', freq: 1400, to: 300, dur: .15, vol: .5 }, { wave: 'square', freq: 200, to: 80, dur: .1, vol: .2 }],
  pok: [{ wave: 'square', freq: 900, to: 1600, dur: .05, vol: .2 }, { wave: 'noise', freq: 3000, dur: .03, vol: .14 }],
  zap: [{ wave: 'saw', freq: 1600, to: 200, dur: .2, vol: .18 }, { wave: 'noise', freq: 5000, dur: .1, vol: .12, filter: 'highpass' }],
  laserPitch: [{ wave: 'square', freq: 2400, to: 300, dur: .5, vol: .16 }],
  scream: [{ wave: 'saw', freq: 900, to: 1500, dur: .6, vol: .12, vib: [9, .08] }, { wave: 'sine', freq: 1200, to: 2000, dur: .5, vol: .1, vib: [11, .06] }],
  wave: [{ wave: 'noise', freq: 500, to: 1500, dur: .8, vol: .3 }],
  sizzle: [{ wave: 'noise', freq: 4000, to: 2000, dur: .6, vol: .2, filter: 'highpass' }],
  whistle: [{ wave: 'sine', freq: 2600, dur: .12, vol: .25, vib: [40, .03] }, { wave: 'sine', freq: 2600, dur: .4, vol: .25, delay: .16, vib: [40, .03] }],
  popcorn: [{ wave: 'square', freq: 1200, to: 2000, dur: .04, vol: .14 }, { wave: 'square', freq: 1400, to: 2300, dur: .04, vol: .14, delay: .07 }, { wave: 'square', freq: 1100, to: 1900, dur: .04, vol: .14, delay: .15 }],
  organStab: [{ wave: 'square', freq: 'C5', dur: .18, vol: .12, vib: [6, .01] }, { wave: 'triangle', freq: 'C4', dur: .18, vol: .14 }, { wave: 'square', freq: 'E5', dur: .18, vol: .1 }, { wave: 'square', freq: 'G5', dur: .18, vol: .1 }],
  coin: [{ wave: 'square', freq: 990, dur: .05, vol: .16 }, { wave: 'square', freq: 1320, dur: .12, vol: .16, delay: .05 }],
  explode: 'explode'
};
BZ.sfx = (name, o) => {
  const A = BZ.game && BZ.game.audio; if (!A || !BZ.cosmetic) return;
  if (BZ.hubActive) o = Object.assign({ vary: 0 }, o);   // a session's card draws no numbers from Math.random
  try { A.sfx(BZ.SFX[name] && typeof BZ.SFX[name] !== 'string' ? name : (BZ.SFX[name] || name), o); } catch (e) { /* sound is best-effort */ }
};
BZ.defineSounds = (game) => { for (const k in BZ.SFX) if (typeof BZ.SFX[k] !== 'string') game.audio.define(k, BZ.SFX[k]); };

/* ---- BABBLE: gibberish voices, one syllable a letter ---- */
BZ.VOICES = {
  hap: { wave: 'pulse', base: 190, rate: 20, range: 7 },
  lou: { wave: 'square', base: 120, rate: 15, vib: [6, .02], range: 5 },
  gloria: { wave: 'triangle', base: 150, rate: 9, echo: true, range: 4 },
  barb: { wave: 'square', base: 260, rate: 14, hold: true, range: 6 },
  dot: { wave: 'pulse12', base: 300, rate: 22, range: 7 },
  ike: { wave: 'triangle', base: 170, rate: 12, vib: [5, .04], range: 6 },
  mortimer: { wave: 'saw', base: 140, rate: 16, range: 6 },
  enforcer: { wave: 'saw', base: 90, rate: 18, robot: true, range: 0 },
  skeleton: { wave: 'triangle', base: 220, rate: 18, clack: true, range: 7 },
  brine: { wave: 'pulse', base: 200, rate: 17, range: 7 },
  iggy: { wave: 'square', base: 230, rate: 22, range: 8 },
  cosmo: { wave: 'sine', base: 210, rate: 15, vib: [7, .03], range: 6 },
  kid: { wave: 'pulse12', base: 260, rate: 20, range: 8 },
  crowdguy: { wave: 'square', base: 170, rate: 16, range: 6 },
  vendor: { wave: 'pulse', base: 230, rate: 14, range: 9 }
};
const VOWEL = { a: 0, e: 4, i: 7, o: 2, u: -3, y: 5 };
BZ.babble = {
  /** speak text in a voice: one note a letter (deterministic); returns the seconds it takes */
  say(text, voiceId = 'hap', o = {}) {
    const v = BZ.VOICES[voiceId] || BZ.VOICES.hap, vol = (BZ.game && BZ.game.settings && BZ.game.settings.voices !== undefined ? BZ.game.settings.voices : .8) * (o.vol || 1);
    const list = this.voices(text, v, vol, o);
    if (BZ.game && BZ.cosmetic && vol > 0 && list.length) { try { BZ.game.audio.sfx(list, { vary: 0 }); } catch (e) { /* best effort */ } }
    BZ.babble.last = { text, voice: voiceId, notes: list.length };
    return list.length ? list[list.length - 1].delay + .1 : 0;
  },
  /** the notes for a line, without playing them (tests read this) */
  voices(text, v, vol = .8, o = {}) {
    const out = []; let t = 0, lift = 0, word = '', i = 0;
    const s = String(text).replace(/\{[^}]*\}/g, '').slice(0, o.max || 90);
    const words = s.split(/(\s+)/);
    for (const w of words) {
      const caps = /[A-Z]{2,}/.test(w) && w === w.toUpperCase();
      for (const ch of w) {
        const c = ch.toLowerCase();
        if (/\s/.test(c)) { t += .04; continue; }
        if (c === '.' || c === ',' || c === ';' || c === ':') { t += c === ',' ? .1 : .16; continue; }
        if (c === '!') { t += .12; lift = 4; continue; }
        if (c === '?') { t += .12; continue; }
        if (!/[a-z0-9]/.test(c)) continue;
        const isV = c in VOWEL, h = BZ.hash(c + voiceIdKey(v)) % 7 - 3;
        let semi = isV ? VOWEL[c] : h, contour = Math.sin((i + word.length) * .9) * (v.range || 5) * .35;
        if (v.robot) { semi = [0, 4, 7][i % 3]; contour = 0; }
        if (lift > 0) { semi += 3; lift--; }
        const q = s.trim().endsWith('?') && i > s.length - 6 ? 4 : 0;
        const f = v.base * Math.pow(2, (semi + contour + q) / 12), dur = (1 / v.rate) * (isV ? 1.3 : .8) * (caps ? 1.35 : 1) * (v.hold && isV ? 1.6 : 1);
        out.push({ wave: v.wave, freq: f, to: f * 1.06, dur, vol: vol * .2 * (caps ? 1.3 : 1), vib: v.vib || (v.hold && isV ? [7, .03] : undefined), delay: t });
        if (v.echo) out.push({ wave: v.wave, freq: f, to: f * 1.06, dur, vol: vol * .08, delay: t + .12 });
        if ('szx'.includes(c)) out.push({ wave: 'noise', freq: 6000, dur: .01, vol: vol * .08, delay: t, filter: 'highpass' });
        if (v.clack && i % 3 === 0) out.push({ wave: 'noise', freq: 2500, dur: .02, vol: vol * .12, delay: t });
        t += dur; i++;
      }
      word = w;
    }
    return out;
  }
};
function voiceIdKey(v) { return String(v.base); }

/* ---- music: original songs in the engine's notation (bpm, steps a beat, tracks of tokens) ---- */
const ORGAN = (notes, vol = .1, name) => [
  { name: name ? name : 'organ', wave: 'square', vol, notes, vib: [5.5, .012] },
  { name: name ? name + '2' : 'organ2', wave: 'triangle', vol: vol * 1.2, notes, octave: -1 }
];
BZ.SONGS = {
  title: { bpm: 140, steps: 4, tracks: [
    ...ORGAN('C5 - E5 - G5 - C6 - - - G5 - A5 - G5 - | F5 - A5 - C6 - A5 - G5 - - - E5 - D5 - | C5 - E5 - G5 - C6 - - - D6 - C6 - B5 - | A5 - G5 - F5 - E5 - D5 - - - C5 - - -', .1),
    { wave: 'saw', vol: .1, notes: 'C3 . C3 C3 G2 . G2 . F2 . F2 F2 G2 . G2 . | F2 . F2 F2 C3 . C3 . G2 . G2 G2 D3 . D3 . | C3 . C3 C3 G2 . G2 . F2 . F2 F2 G2 . G2 . | F2 . F2 . G2 . G2 . C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .16, notes: 'k . h . s . h k k . h . s . h h | k . h . s . h k k . h . s . s s' } ] },
  menu: { bpm: 100, steps: 4, tracks: [
    ...ORGAN('E5 - . G5 - . A5 - G5 - . E5 - . D5 - | C5 - . E5 - . G5 - - - . . . . . . | E5 - . G5 - . A5 - C6 - . A5 - . G5 - | E5 - D5 - C5 - - - . . . . . . . .', .08),
    { wave: 'triangle', vol: .16, notes: 'C3 . . G2 . . C3 . E3 . . G2 . . C3 . | F2 . . C3 . . F2 . G2 . . D3 . . G2 .' },
    { wave: 'drums', vol: .1, notes: 'k . . h . . s . k . . h . . s . ' } ] },
  tourmap: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'G4 - B4 - D5 - B4 - C5 - E5 - G5 - E5 - | D5 - - - B4 - G4 - A4 - - - - - . . | G4 - B4 - D5 - B4 - C5 - E5 - G5 - A5 - | G5 - F#5 - E5 - D5 - G4 - - - - - . .' },
    { wave: 'triangle', vol: .17, notes: 'G2 . B2 . D3 . B2 . C3 . E3 . G3 . E3 . | D3 . F#3 . A3 . F#3 . D3 . A2 . D3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k k h . s . h .' } ] },
  rally: { bpm: 132, steps: 4, loop: false, tracks: [
    ...ORGAN('G4 - C5 - E5 - G5 - - - E5 - G5 - - - - - - - - - . . . . . . . .', .12) ] },
  derby: { bpm: 160, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'E5 E5 . E5 . D5 E5 . G5 . E5 . D5 C5 . . | A4 A4 . A4 . G4 A4 . C5 . A4 . G4 E4 . . | E5 E5 . E5 . D5 E5 . G5 . A5 . G5 E5 . . | D5 . C5 . B4 . A4 . E5 - - - - - . .' },
    { wave: 'square', vol: .1, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2', octave: 0 },
    { wave: 'drums', vol: .17, notes: 'k h s h k k s h k h s h k s s s' } ] },
  rhubarb: { bpm: 180, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'C5 . C#5 . C5 . C#5 . E5 . D#5 . E5 . G5 . | C5 . C#5 . C5 . C#5 . A#4 . A4 . G#4 . G4 .' },
    { wave: 'saw', vol: .1, notes: 'C2 C3 C2 C3 C2 C3 C2 C3 | G#1 G#2 G#1 G#2 G1 G2 G1 G2' },
    { wave: 'drums', vol: .18, notes: 'k s k s k s k s k s k s k s s s' } ] },
  training: { bpm: 112, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - . . | E5 . C5 . D5 . B4 . C5 - - - . . . . ' },
    { wave: 'triangle', vol: .16, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . G2 . G2 . B2 . C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . k . h h s . h .' } ] },
  ending: { bpm: 120, steps: 4, tracks: [
    ...ORGAN('C5 - - - E5 - - - G5 - - - C6 - - - | A5 - - - F5 - - - G5 - - - - - - - | E5 - - - G5 - - - C6 - - - E6 - - - | D6 - - - B5 - - - C6 - - - - - - -', .1),
    { wave: 'saw', vol: .09, notes: 'C3 . C3 . C3 . C3 . E3 . E3 . E3 . E3 . | F3 . F3 . F3 . F3 . G3 . G3 . G3 . G3 .' },
    { wave: 'drums', vol: .13, notes: 'k . h . s . h . k . h . s . h h' } ] },
  hubcard: { bpm: 120, steps: 4, tracks: [
    ...ORGAN('C5 - E5 - G5 - - - A5 - G5 - E5 - - - | F5 - E5 - D5 - - - G4 - - - - - - -', .07),
    { wave: 'triangle', vol: .12, notes: 'C3 . . . G2 . . . F2 . . . G2 . . .' } ] },
  // one in-game loop per park: layers named base, hype (the meter full), drums (runners in scoring position)
  kernel: { bpm: 116, steps: 4, tracks: [
    ...ORGAN('G4 - C5 - D5 - E5 - - - D5 - C5 - - - | A4 - D5 - E5 - F5 - - - E5 - D5 - - - | G4 - C5 - D5 - E5 - - - G5 - A5 - G5 - | F5 - E5 - D5 - B4 - C5 - - - - - . .', .08, 'base'),
    { name: 'bass', wave: 'triangle', vol: .15, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . C3 . E3 . | F2 . G2 . C3 . . .' },
    { name: 'hype', wave: 'pulse', vol: .08, on: false, notes: 'C6 . G5 . E5 . G5 . C6 . G5 . E5 . G5 .' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h . s . h . k k h . s . h h' } ] },
  barnacle: { bpm: 108, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .09, notes: 'D5 - A4 D5 - F5 | E5 - A4 C#5 - E5 | D5 - A4 D5 - F5 | A5 - G5 F5 E5 D5 | C5 - G4 C5 - E5 | D5 - A4 D5 - - ', vib: [5, .01] },
    { name: 'bass', wave: 'triangle', vol: .16, notes: 'D3 . A2 D3 . A2 | A2 . E2 A2 . E2 | D3 . A2 D3 . A2 | F2 . C3 G2 . A2 | C3 . G2 C3 . G2 | D3 . A2 D3 . .' },
    { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'A5 . F5 . D5 . | E5 . C#5 . A4 .' },
    { name: 'drums', wave: 'drums', vol: .11, on: false, notes: 'k . h s . h' } ] },
  caldera: { bpm: 126, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .08, notes: 'E4 . E4 G4 . E4 A4 . G4 . E4 . D4 . E4 . | E4 . E4 G4 . E4 B4 . A4 . G4 . A4 . B4 .' },
    { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . G2 A2 | E2 E2 . E2 D2 . D2 B1' },
    { name: 'hype', wave: 'square', vol: .07, on: false, notes: 'E5 . G5 . B5 . G5 . E5 . G5 . A5 . B5 .' },
    { name: 'drums', wave: 'drums', vol: .15, on: true, notes: 'k . t . s . t k k . t . s . t t' } ] },
  tranquility: { bpm: 100, steps: 4, tracks: [
    { name: 'base', wave: 'sine', vol: .1, notes: 'C5 E5 G5 B5 C6 B5 G5 E5 | A4 C5 E5 G5 A5 G5 E5 C5 | F4 A4 C5 E5 F5 E5 C5 A4 | G4 B4 D5 F5 G5 F5 D5 B4', vib: [6, .01] },
    { name: 'bass', wave: 'triangle', vol: .14, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -' },
    { name: 'hype', wave: 'pulse12', vol: .06, on: false, notes: 'G5 . C6 . E6 . C6 . G5 . C6 . E6 . G6 .' },
    { name: 'drums', wave: 'drums', vol: .09, on: false, notes: 'k . . h . . s . . h . . k . h .' } ] },
  boneyard: { bpm: 96, steps: 4, tracks: [
    ...ORGAN('A4 - - C5 - - E5 - D#5 - - - E5 - - - | F5 - - E5 - - D5 - C5 - - - B4 - - - | A4 - - C5 - - E5 - A5 - - - G#5 - - - | F5 - E5 - D5 - C5 - B4 - - - A4 - - -', .07, 'base'),
    { name: 'theremin', wave: 'sine', vol: .07, notes: 'E6 - - - - - - - D#6 - - - - - - - | C6 - - - - - - - B5 - - - - - - -', vib: [6, .03] },
    { name: 'hype', wave: 'square', vol: .06, on: false, notes: 'A5 . E5 . A5 . E5 . G#5 . E5 . G#5 . E5 .' },
    { name: 'drums', wave: 'drums', vol: .1, on: false, notes: 'k . . . s . . . k . k . s . . .' } ] },
  megadome: { bpm: 118, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'A4 - - - C5 - - - E5 - - - G5 - - - | F5 - - - E5 - - - D5 - - - E5 - - -', vib: [4, .006] },
    { name: 'bass', wave: 'square', vol: .1, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2' },
    { name: 'arp', wave: 'pulse12', vol: .06, notes: 'A5 C6 E6 C6 A5 C6 E6 C6 | F5 A5 C6 A5 G5 B5 D6 B5' },
    { name: 'hype', wave: 'pulse', vol: .06, on: false, notes: 'E6 . E6 . D6 . E6 . G6 . E6 . D6 . C6 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: true, notes: 'k . h . s . h . k . h k s . h o' } ] },
  // stings
  homerun: { bpm: 150, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - - - . .' }, { wave: 'triangle', vol: .16, notes: 'C4 - - - G3 - - - C4 - - - - - . .' },
    { wave: 'drums', vol: .16, notes: 'k . s . k . s . c . . . . . . .' } ] },
  strikeout: { bpm: 150, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .12, notes: 'G5 . G5 . D5 - - - G4 - - - . . . .' }, { wave: 'drums', vol: .14, notes: 's . s . k . . . c . . . . . . .' } ] },
  ignite: { bpm: 160, steps: 4, loop: false, tracks: [
    { wave: 'saw', vol: .1, notes: 'C4 D4 E4 F#4 G#4 A#4 C5 - - - . . . . . .' }, { wave: 'drums', vol: .16, notes: 'k k k k s s s s c . . . . . . .' } ] },
  inning: { bpm: 132, steps: 4, loop: false, tracks: [
    ...ORGAN('C5 . E5 . G5 . E5 . C6 - - - . . . .', .1) ] },
  victory: { bpm: 140, steps: 4, loop: false, tracks: [
    ...ORGAN('G4 . C5 . E5 . G5 - - E5 G5 - - - - - | A5 . G5 . E5 . C6 - - - - - - - . .', .11),
    { wave: 'drums', vol: .14, notes: 'k . s . k . s . k k s . c . . . | k . s . k k s s c . . . . . . .' } ] },
  defeat: { bpm: 90, steps: 4, loop: false, tracks: [
    ...ORGAN('E5 - - - D#5 - - - D5 - - - C#5 - - - - - - - . . . .', .09) ] },
  show: { bpm: 140, steps: 4, loop: false, tracks: [
    ...ORGAN('C5 C5 . C5 . A4 C5 . F5 - . E5 - . C5 - | D5 . E5 . C5 - - - . . . . . . . .', .1),
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h .' } ] }
};
BZ.music = (name, o = {}) => {
  const A = BZ.game && BZ.game.audio; if (!A) return;
  BZ.musicName = name;
  if (!name) { A.music(null); return; }
  const song = BZ.SONGS[name]; if (!song) return;
  try { A.music(song, Object.assign({ fade: .6 }, o)); } catch (e) { BZ.game.fail('music', e); }
};
BZ.sting = (name, o = {}) => { const A = BZ.game && BZ.game.audio; if (!A || !BZ.SONGS[name] || !BZ.cosmetic) return; try { A.sting(BZ.SONGS[name], Object.assign({ at: 'now', duck: .35 }, o)); } catch (e) { /* best effort */ } };
BZ.layer = (name, vol, fade = .8) => {
  const A = BZ.game && BZ.game.audio, S = BZ.SONGS[BZ.musicName]; if (!A || !A.song || !S || !S.tracks.some(t => t.name === name)) return;
  try { A.layer(name, vol, fade); } catch (e) { /* the song may not have it */ }
};

/* ===== src/03-rigs.js ===== */
/* =============================================================================
 * 03-rigs: the rig factory (team uniform + a player's own looks + the job's kit),
 * the baseball motions (swing, power swing, bunt, windup and pitch, throws, tags,
 * dives, slides, umpire calls, celebrations) built on the engine's attack specs and
 * poses, the two-handed bat grip, and the Batzooka overdraw.
 * Rigs are cosmetic: gameplay never reads a joint.
 * ========================================================================== */
BZ.MOTION = {
  // the contact swing: wind-up to the plate plane in 0.10 s (contact at the middle of 'active')
  swing: { rel: true, hand: 'both', a0: 2.3, a1: -2.5, z0: -1.5, z1: -3.5, reach: 6.5, lunge: 2.2, twist: 2.2, lean: .25, hold: .35, blade: 1 },
  power: { rel: true, hand: 'both', a0: 2.6, a1: -2.8, z0: -1, z1: -4, reach: 7, lunge: 3, twist: 2.8, lean: .35, hold: .4, blade: 1, crouch: .3 },
  bunt: { rel: true, hand: 'both', a0: .05, a1: .05, z0: 3.5, z1: 3.5, reach: 5.5, lunge: .5, crouch: .5 },
  throwArm: { rel: true, a0: 1.8, a1: -.6, z0: 3, z1: 0, reach: 6, lunge: 2.4, lean: .6, twist: 1.6, hold: .2 },
  pitchKick: 'knee',
  tag: { rel: true, hand: 'L', a0: .9, a1: -.4, z0: -8, z1: -9, reach: 7, lunge: 1.5, crouch: .6, lean: .4 },
  safe: { rel: true, hand: 'both', a0: .3, a1: 1.6, z0: 0, z1: 0, reach: 6, hold: .7 },
  punchOut: { rel: true, a0: .2, a1: -1.2, z0: 2, z1: 1, reach: 6, lunge: 1.2, twist: 1.2, hold: .8 },
  fistPump: 'uppercut'
};
BZ.atk = (spec, phase, u) => ({ spec: typeof spec === 'string' ? E.MOVES[spec] : spec, phase, u: clamp(u, 0, 1) });
/** an attack state for a timed motion: t seconds since it began, w wind, a active, r recover */
BZ.motionAt = (spec, t, w, a, r) => {
  if (t < 0) return null;
  if (t < w) return BZ.atk(spec, 'wind', t / w);
  if (t < w + a) return BZ.atk(spec, 'active', (t - w) / a);
  if (t < w + a + r) return BZ.atk(spec, 'recover', (t - w - a) / r);
  return null;
};

/** dress a Humanoid for a player in a job: 'bat' | 'run' | 'field' | 'catch' | 'pitch' | 'bench' | 'fight' | 'ump' */
BZ.makeRig = (pl, team, job) => {
  const T = team || {}, U = T.uniform || {}, L = pl.look || {};
  const lefty = (pl.bt || 'R/R').split('/')[job === 'bat' ? 0 : 1] === 'L';
  const colors = Object.assign({
    skin: L.skin || '#e0a878', hair: L.hairColor || '#3b2a2f', cloth: U.jersey || '#f4ecd8', pants: U.pants || U.jersey || '#f4ecd8',
    boot: U.socks || '#1e2a5a', belt: U.trim || '#1e2a5a', trim: U.trim || '#1e2a5a', glove: U.gloves || '#f0f0f0',
    mitt: L.mitt || '#8a5228', bat: U.bat || '#c89a5a', plate: U.dark || U.trim || '#1e2a5a', metal: U.metal || '#c8d0e0', eye: '#1a1320'
  }, L.colors || {});
  if (L.build === 'skeleton') colors.bone = U.bone || '#e8e0c8';
  const capC = U.cap || U.trim || '#1e2a5a';
  const o = {
    size: L.size || 1.25, build: L.build || 'heroic', hair: L.hair || 'short', outfit: 'shirt', sleeves: 'short', weapon: null, colors,
    hunch: L.hunch || 0, eyeGlow: L.eyeGlow || null, face: L.face
  };
  if (job === 'bat') Object.assign(o, { weapon: 'bat', hat: { style: 'batting', color: U.helmet || capC, flap: lefty ? 1 : -1 } });
  else if (job === 'run') Object.assign(o, { hat: { style: 'batting', color: U.helmet || capC, flap: lefty ? 1 : -1 } });
  else if (job === 'catch') Object.assign(o, { hat: { style: 'mask', color: U.helmet || capC }, armor: true, mitt: 'catcher', mittHand: lefty ? 'R' : 'L' });
  else if (job === 'field' || job === 'pitch') Object.assign(o, { hat: L.hat ? L.hat : { style: U.hatStyle || 'cap', color: capC }, mitt: pl.pos === '1B' ? 'first' : 'fielder', mittHand: lefty ? 'R' : 'L' });
  else if (job === 'bench' || job === 'fight') Object.assign(o, { hat: L.hat ? L.hat : { style: U.hatStyle || 'cap', color: capC } });
  else if (job === 'ump') Object.assign(o, { outfit: 'coat', sleeves: 'long', hat: { style: 'mask', color: '#1a2238' }, colors: Object.assign(colors, { cloth: '#1a2238', coat: '#1a2238', pants: '#5a6070', boot: '#1a1a1a', belt: '#1a1a1a' }) });
  if (L.outfit) o.outfit = L.outfit;
  if (L.hatOverride) o.hat = L.hatOverride;
  if (U.hatStyle === 'visor' && (job === 'field' || job === 'pitch' || job === 'bench')) o.hat = { style: 'visor', color: capC, tint: U.visor || '#5a7ac8' };
  const rig = new E.Humanoid(o);
  rig.lefty = lefty; rig.job = job;
  if (job === 'bat') BZ.gripBoth(rig);
  return rig;
};
/** the left hand holds the bat's handle below the right in the stance (attacks with hand 'both' grip on their own) */
BZ.gripBoth = (rig) => {
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    if (this._noGrip || !this.o.weapon || (this._lastAtk && this._lastAtk.spec && this._lastAtk.spec.hand === 'both')) return;
    const J = this.J, o = this.o, bd = J.bladeDir; if (!bd || !J.handR) return;
    const tgt = [J.handR[0] - bd[0] * 2.3, J.handR[1] - bd[1] * 2.3, J.handR[2] - bd[2] * 2.3];
    try { const r = E.ik3(J.shL, tgt, o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = r[0]; J.handL = r[1]; } catch (e) { /* keep the pose */ }
  };
};
/** update a rig with a state (skipped when cosmetics are off) */
BZ.rigUpdate = (rig, dt, s) => { if (!rig || !BZ.cosmetic) return; rig._lastAtk = s.attack || null; rig.update(dt, s); };

/* ---- the rig cache: one rig per player and job ---- */
BZ.rigCache = new Map();
BZ.rigFor = (pl, job) => {
  if (!pl) return null;
  const key = pl.id + ':' + job + ':' + (pl.team || '');
  let rg = BZ.rigCache.get(key);
  if (!rg) { rg = BZ.makeRig(pl, BZ.get('teams', pl.team), job); BZ.rigCache.set(key, rg); }
  return rg;
};
BZ.umpireRig = () => BZ.rigCache.get('ump') || (BZ.rigCache.set('ump', BZ.makeRig({ id: 'ump', look: { skin: '#c8906a', hair: 'short', size: 1.25, build: 'bulky' } }, null, 'ump')), BZ.rigCache.get('ump'));

/* ---- the Batzooka overdraw: glowing barrel, nozzle and fins over the bat while it is armed ---- */
BZ.drawBatzooka = (g, rig, project, k, t, colors) => {
  const J = rig.J; if (!J.handR || !J.bladeDir) return;
  const bd = J.bladeDir, at = d => { const w = rig.worldOffset([J.handR[0] + bd[0] * d, J.handR[1] + bd[1] * d, J.handR[2] + bd[2] * d]); return project(rig.x + w[0], rig.y + w[1], rig.z + w[2]); };
  const a = at(4), b = at(12.5), c = at(14.5); if (!a || !b || !c) return;
  const col = colors || ['#ff7a1a', '#ffd040', '#fff6c0'];
  const rr = Math.max(1, k * 1.15);
  px.line(g, a[0], a[1], b[0], b[1], '#3a3a48', Math.max(2, Math.round(rr * 2.1)));
  px.line(g, a[0], a[1], b[0], b[1], col[0], Math.max(1, Math.round(rr * 1.3)));
  px.line(g, a[0] - .5, a[1] - .5, b[0] - .5, b[1] - .5, col[1], 1);
  // fins near the handle, a nozzle ring at the barrel's end
  const f = at(5.5), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * rr * 2, ny = dx / L * rr * 2;
  if (f) { px.poly(g, [[f[0], f[1]], [f[0] + nx - dx / L * rr * 2, f[1] + ny - dy / L * rr * 2], [f[0] - dx / L * rr * 3, f[1] - dy / L * rr * 3]], '#d83a2a'); px.poly(g, [[f[0], f[1]], [f[0] - nx - dx / L * rr * 2, f[1] - ny - dy / L * rr * 2], [f[0] - dx / L * rr * 3, f[1] - dy / L * rr * 3]], '#d83a2a'); }
  px.disc(g, c[0], c[1], Math.max(1.5, rr * 1.4), '#3a3a48'); px.disc(g, c[0], c[1], Math.max(1, rr * .9), col[1]);
  const fl = Math.max(1, rr * (1.2 + .5 * Math.sin(t * 40)));
  px.blend(g, .8, 'add', () => { px.disc(g, c[0] + dx / L * fl, c[1] + dy / L * fl, fl, col[0]); px.disc(g, c[0] + dx / L * fl * 1.5, c[1] + dy / L * fl * 1.5, fl * .6, col[2]); });
};

/* ---- Blob mascots, gulls, drones ---- */
BZ.makeBlob = (spec) => new E.Blob(Object.assign({ R: 7 }, spec));

/* ===== src/04-shapes.js ===== */
/* =============================================================================
 * 04-shapes: ballpark objects as engine shape data (E.SHAPES): drawn in every
 * view and facing with the house shading. Units: 16 = one tile; written facing
 * south (+y). Checked with node tools/asset-sheet.mjs.
 * ========================================================================== */
BZ.SHAPE_DEFS = {
  bz_base: { about: 'canvas base pillow', tags: 'baseball', mats: { b: '#f4f4f0 cloth' }, parts: [['box','b',[0,0,0],[9,9,2.5]]] },
  bz_rubber: { about: 'pitching rubber', tags: 'baseball', mats: { w: '#f4f4f0' }, parts: [['box','w',[0,0,0],[10,2.5,1.2]]] },
  bz_foulpole: { about: 'foul pole with a screen', tags: 'baseball', mats: { y: '#f2d23a metal' }, parts: [['cyl','y',[0,0,0],1.6,150], ['box','y',[2.5,0,60],[4,.6,86]]] },
  bz_bench: { about: 'dugout bench', tags: 'baseball', mats: { w: 'planks', m: 'iron' }, parts: [['box','w',[0,0,6],[40,7,2]], ['row',4,[12,0,0],['box','m',[0,0,0],[1.5,6,6]]]] },
  bz_batrack: { about: 'bat rack with bats', tags: 'baseball', mats: { w: 'oak', b: '#c89a5a' }, parts: [['box','w',[0,0,0],[18,4,14]], ['row',6,[2.6,0,0],['cyl','b',[0,-1,8],.8,12]]] },
  bz_helmetrack: { about: 'helmet rack', tags: 'baseball', mats: { w: 'oak', h: '#1e2a5a glaze' }, parts: [['box','w',[0,0,0],[16,5,12]], ['row',3,[5,0,0],['ball','h',[0,-1,14],2.6,{sz:.8}]]] },
  bz_cooler: { about: 'orange water cooler', tags: 'baseball', mats: { o: '#f08a1a glaze', w: '#f4f4f4' }, parts: [['cyl','o',[0,0,0],4.5,10], ['cyl','w',[0,0,10],4.6,1.5], ['box','w',[0,4.6,3],[1.4,1.4,1.4]]] },
  bz_rosin: { about: 'rosin bag', tags: 'baseball', mats: { c: '#e8e0d0 cloth' }, parts: [['ball','c',[0,0,1],1.6,{sz:.6}]] },
  bz_lighttower: { about: 'stadium light tower', tags: 'baseball light', mats: { m: 'steel', l: '#fffbe0 none glow=1' }, lights: [[0,0,190,'#fff4d8',260]],
    parts: [['cyl','m',[0,0,0],3,170,{r2:2}], ['box','m',[0,0,168],[34,4,26]], ['row',4,[8,0,0],['row',3,[0,0,8],['box','l',[0,2.3,172],[6,1,5]]]]] },
  bz_scoreboard: { about: 'scoreboard on legs', tags: 'baseball', mats: { b: '#1a2a1a', f: '#3a3a3a', m: 'iron' }, parts: [['mirror','x',['box','m',[20,0,0],[3,3,40]]], ['box','f',[0,0,40],[64,6,34]], ['box','b',[0,3.2,44],[58,.5,26]]] },
  bz_jumbotron: { about: 'video board on a frame', tags: 'baseball', mats: { b: '#101828', f: '#2a2a3a', m: 'steel' }, parts: [['mirror','x',['box','m',[30,0,0],[4,4,50]]], ['box','f',[0,0,50],[96,8,56]], ['box','b',[0,4.2,54],[88,.5,46]]] },
  bz_lscreen: { about: 'batting practice L-screen', tags: 'baseball', mats: { m: 'iron', n: '#3a3a3a' }, parts: [['box','m',[0,0,0],[24,1.2,24]], ['box','n',[-6,.8,12],[11,.4,22]]] },
  bz_cage: { about: 'batting cage net', tags: 'baseball', mats: { n: '#2a2a2a', m: 'iron' }, parts: [['mirror','x',['box','n',[18,0,0],[1,60,30]]], ['box','n',[0,-30,0],[36,1,30]], ['box','m',[0,0,30],[38,62,1]]] },
  bz_pitchomatic: { about: 'the Pitch-O-Matic 3000 pitching machine', tags: 'baseball robot', mats: { r: '#d83a2a metal', m: 'steel', w: '#2a2a2a', g: '#ffd040 none glow=1' },
    parts: [['box','m',[0,0,0],[16,14,6]], ['cyl','r',[0,0,6],5,10], ['ball','r',[0,0,18],6], ['cyl','w',[0,4,18],2.6,7,{sq:1}], ['box','g',[0,6,22],[6,1,2]], ['mirror','x',['cyl','w',[7,5,0],2.5,3]]] },
  bz_dugout: { about: 'dugout roof and back wall', tags: 'baseball', mats: { r: '#2a3a5a metal', w: 'brick', b: 'planks' }, parts: [['box','w',[0,-10,0],[120,4,22]], ['box','r',[0,-4,22],[124,16,2]], ['box','b',[0,-5,0],[110,6,7]]] },
  // Kernel Field
  bz_cornstalk: { about: 'tall corn stalk', tags: 'farm', mats: { s: '#7a9a2a foliage', c: '#f2d23a' }, parts: [['cyl','s',[0,0,0],1,26,{r2:.5}], ['ball','s',[2,0,14],3,{sz:.4}], ['ball','s',[-2,0,20],3,{sz:.4}], ['cyl','c',[1.5,0,16],1,5,{r2:.6}]] },
  bz_silo: { about: 'red farm silo with a dome', tags: 'farm', mats: { r: '#b83a2a planks', d: '#c8c8d0 metal' }, parts: [['cyl','r',[0,0,0],30,150], ['ball','d',[0,0,150],30,{sz:.6}]] },
  bz_haybale: { about: 'round hay bale', tags: 'farm', mats: { h: 'straw' }, parts: [['cyl','h',[0,0,0],9,10]] },
  bz_barnboard: { about: 'red barn scoreboard', tags: 'farm baseball', mats: { r: '#a83a2a planks', w: '#f4f0e8', b: '#1a2a1a', s: 'shingle' }, parts: [['box','r',[0,0,0],[120,20,70]], ['prism','s',[0,0,70],[[-64,0],[64,0],[0,30]],24,{axis:'y'}], ['box','b',[0,10.5,20],[96,.6,38]], ['box','w',[0,10.6,60],[100,.4,4]]] },
  bz_windmill: { about: 'farm windmill', tags: 'farm', mats: { m: 'iron', b: '#d8d8d8 metal', t: '#b83a2a' }, parts: [['cyl','m',[0,0,0],8,90,{r2:2,seg:4}], ['ring',8,9,['box','b',[0,2,96],[3,1,16],{rot:[0,0,0]}]], ['box','t',[0,-8,96],[1,14,6]]] },
  bz_windsock: { about: 'windsock on a pole', tags: 'baseball', mats: { m: 'iron', s: '#ff7a1a cloth' }, parts: [['cyl','m',[0,0,0],1,50], ['cyl','s',[0,6,50],2.4,1,{r2:1.2}], ['box','s',[0,7,50],[3,12,3]]] },
  // Barnacle Bay
  bz_lighthouse: { about: 'striped lighthouse', tags: 'coast', mats: { w: '#f4f4f4', r: '#d83a2a', g: '#fff4a0 none glow=1', m: 'iron' }, lights: [[0,0,170,'#fff4a0',200]],
    parts: [['cyl','w',[0,0,0],22,160,{r2:14}], ['cyl','r',[0,0,30],20.8,16,{r2:20.1}], ['cyl','r',[0,0,78],18.4,16,{r2:17.7}], ['cyl','r',[0,0,126],16,16,{r2:15.3}], ['cyl','g',[0,0,160],10,14], ['cyl','m',[0,0,174],13,8,{r2:0}]] },
  bz_boat: { about: 'small fishing boat', tags: 'coast', mats: { h: '#f4f4f0 planks', r: '#d83a2a', m: 'oak', s: '#f0e8d0 cloth' }, parts: [['prism','h',[0,0,0],[[-6,0],[6,0],[9,7],[-9,7]],34,{axis:'y'}], ['box','r',[0,0,6],[18,36,1.5]], ['cyl','m',[0,0,7],1,34], ['prism','s',[0,0,12],[[0,0],[0,26],[14,0]],1,{axis:'y'}]] },
  bz_buoy: { about: 'red and white buoy', tags: 'coast', mats: { r: '#d83a2a', w: '#f4f4f4' }, parts: [['cyl','r',[0,0,0],4,6,{r2:3}], ['cyl','w',[0,0,6],3,4,{r2:2}], ['ball','r',[0,0,11],2]] },
  bz_piling: { about: 'pier piling', tags: 'coast', mats: { w: 'walnut' }, parts: [['cyl','w',[0,0,0],3,22]] },
  bz_trap: { about: 'lobster trap', tags: 'coast', mats: { w: 'crate' }, parts: [['box','w',[0,0,0],[14,10,8]]] },
  // Caldera
  bz_basalt: { about: 'basalt column cluster', tags: 'volcano', mats: { b: '#2a2a30 stones size=4' }, parts: [['cyl','b',[0,0,0],7,40,{seg:6}], ['cyl','b',[9,4,0],6,28,{seg:6}], ['cyl','b',[-8,5,0],6,22,{seg:6}]] },
  bz_vent: { about: 'lava vent cone', tags: 'volcano', mats: { r: '#3a2a24 rock', l: '#ff7a1a none glow=1' }, lights: [[0,0,20,'#ff7a1a',120]], parts: [['cyl','r',[0,0,0],24,16,{r2:8}], ['cyl','l',[0,0,15.5],7,1]] },
  bz_warnsign: { about: 'warning sign', tags: 'volcano', mats: { m: 'iron', y: '#f2d23a' }, parts: [['cyl','m',[0,0,0],1,24], ['prism','y',[0,0,22],[[-8,0],[8,0],[0,13]],1,{axis:'y'}]] },
  bz_volcano: { about: 'smoking volcano', tags: 'volcano', mats: { r: '#3a1e18 rock', l: '#ff5a0a none glow=1' }, lights: [[0,0,240,'#ff5a0a',300]], parts: [['cyl','r',[0,0,0],180,220,{r2:40}], ['cyl','l',[0,0,219],34,2]] },
  // Tranquility
  bz_habitat: { about: 'moon habitat module', tags: 'space', mats: { w: '#e0e4ec metal', g: '#8ac8ff none glow=1' }, parts: [['cyl','w',[0,0,0],30,40,{sq:.7}], ['ball','w',[0,0,40],30,{sz:.5}], ['row',3,[16,0,0],['box','g',[0,21,24],[6,1,6]]]] },
  bz_antenna: { about: 'radio antenna mast', tags: 'space', mats: { m: 'steel', r: '#ff3a3a none glow=1' }, lights: [[0,0,82,'#ff3a3a',40]], parts: [['cyl','m',[0,0,0],2,80,{r2:.6,seg:4}], ['ball','r',[0,0,82],1.8]] },
  bz_dish: { about: 'satellite dish', tags: 'space', mats: { m: 'steel', d: '#f0f0f4 metal' }, parts: [['cyl','m',[0,0,0],3,30], ['lathe','d',[0,0,26],[[0,0],[10,4],[22,14],[21,15],[0,2]]]] },
  bz_rover: { about: 'moon rover', tags: 'space', mats: { b: '#d8d8e0 metal', w: '#2a2a30', g: '#ffd040' }, parts: [['box','b',[0,0,6],[22,14,6]], ['mirror','xy',['cyl','w',[10,7,0],4,3,{sq:1}]], ['cyl','b',[-6,0,12],1,10], ['box','g',[-6,0,22],[6,1,4]]] },
  bz_crater: { about: 'small crater rim', tags: 'space', mats: { r: '#8a8a94 rock' }, parts: [['lathe','r',[0,0,0],[[22,0],[18,4],[14,1],[0,1]]]] },
  // Boneyard
  bz_tomb1: { about: 'rounded tombstone', tags: 'graveyard', mats: { s: '#8a8a92 stones size=3' }, parts: [['box','s',[0,0,0],[12,4,14]], ['cyl','s',[0,0,14],6,4,{sq:.33}]] },
  bz_tomb2: { about: 'cross tombstone', tags: 'graveyard', mats: { s: '#9a9aa2 stone' }, parts: [['box','s',[0,0,0],[4,4,22]], ['box','s',[0,0,13],[14,4,4]]] },
  bz_tomb3: { about: 'leaning slab tombstone', tags: 'graveyard', mats: { s: '#6a6a74 stone' }, parts: [['box','s',[0,0,0],[10,3,16],{rot:[0,8,0]}]] },
  bz_crypt: { about: 'stone crypt with a peaked roof', tags: 'graveyard', mats: { s: 'granite', r: 'slate', d: '#1a1a20' }, parts: [['box','s',[0,0,0],[44,40,34]], ['prism','r',[0,0,34],[[-26,0],[26,0],[0,16]],44,{axis:'y'}], ['box','d',[0,20.2,0],[12,.5,22]]] },
  bz_deadtree: { about: 'dead twisted tree', tags: 'graveyard', mats: { b: '#3a3028 bark' }, parts: [['cyl','b',[0,0,0],4,46,{r2:1.5}], ['box','b',[6,0,32],[14,2,2],{rot:[0,-30,0]}], ['box','b',[-6,0,38],[12,2,2],{rot:[0,30,0]}]] },
  bz_pumpkin: { about: 'jack-o-lantern', tags: 'graveyard', mats: { o: '#f07a1a', g: '#ffd040 none glow=1', s: '#3a6a2a' }, lights: [[0,0,6,'#ffa040',50]], parts: [['ball','o',[0,0,5],5.5,{sz:.8}], ['box','g',[0,5,5],[5,.5,2]], ['cyl','s',[0,0,9],.8,2.5]] },
  // MegaDome
  bz_holoboard: { about: 'neon holo-billboard', tags: 'city', mats: { m: 'steel', c: '#2de2e6 none glow=1', p: '#ff3ab8 none glow=1' }, parts: [['mirror','x',['box','m',[30,0,0],[3,3,70]]], ['box','m',[0,0,70],[80,4,40]], ['box','c',[0,2.2,74],[72,.5,3]], ['box','p',[0,2.2,104],[72,.5,3]]] },
  bz_luxurybox: { about: 'luxury box with tinted glass', tags: 'city', mats: { w: '#3a3a4a metal', g: '#ffd880 none glow=1', r: '#e01e3c' }, lights: [[0,0,90,'#ffd880',90]], parts: [['box','w',[0,0,0],[90,30,70]], ['box','w',[0,0,70],[96,34,26]], ['box','g',[0,17.2,74],[84,.5,16]], ['box','r',[0,17.4,92],[90,.5,3]]] },
  bz_megatron: { about: 'the MEGA-TRON video board', tags: 'city', mats: { m: 'steel', f: '#1a1a24', r: '#e01e3c metal', c: '#2de2e6 none glow=1' }, lights: [[0,0,140,'#2de2e6',200]],
    parts: [['mirror','x',['box','m',[60,0,0],[8,8,90]]], ['box','f',[0,0,90],[180,12,100]], ['box','r',[0,0,190],[186,14,8]], ['box','c',[0,6.4,92],[176,.5,3]]] },
  bz_drone: { about: 'security drone', tags: 'city robot', mats: { b: '#c8d0dc metal', r: '#e01e3c none glow=1', m: 'steel' }, parts: [['ball','b',[0,0,4],5,{sz:.6}], ['mirror','xy',['cyl','m',[7,7,5],3,.6]], ['ball','r',[0,4,4],1.5]] }
};
BZ.installShapes = () => { if (!E.SHAPES) return; for (const k in BZ.SHAPE_DEFS) E.SHAPES[k] = BZ.SHAPE_DEFS[k]; };

/* ===== src/05-park.js ===== */
/* =============================================================================
 * 05-park: the park builder. From a park def it makes the world: home plate's
 * position, the fence function, the baked field texture (grass mowing, dirt,
 * chalk, the warning track, the ground beyond), the TileMap of stands (the
 * Broadcast Cam's walls), props and lights, the Mode 7 view and the sky, plus
 * the drawing of the fence, poles, bases, backstop and crowd in both cameras.
 * ========================================================================== */
const ATAB = 2048;
BZ.Park = class Park {
  constructor(id) {
    const d = BZ.get('parks', id) || BZ.get('parks', 'kernel');
    this.id = d.id; this.def = d; this.name = d.name;
    this.fence = d.fence; this.fenceH = d.fenceH || 40; this.fenceSections = d.fenceSections || [];
    this.gravityMul = d.gravityMul || 1; this.evMul = d.evMul || 1; this.jumpMul = d.jumpMul || 1; this.bounceMul = d.bounceMul || 1; this.depth = d.depth || 0;
    const maxR = Math.max(...this.fence);
    const halfW = Math.ceil((maxR * .78 + 180) / 16) * 16, north = Math.ceil((maxR + 230) / 16) * 16, south = 224;
    this.Wu = halfW * 2; this.Hu = north + south;
    this.H = { x: halfW, y: north };
    // the fence radius and height tables over the spray angle
    this.Rtab = new Float32Array(ATAB); this.Htab = new Float32Array(ATAB);
    for (let i = 0; i < ATAB; i++) { const th = -Math.PI + (i + .5) / ATAB * TAU; this.Rtab[i] = BZ.fenceR(this, th); this.Htab[i] = BZ.fenceH(this, th); }
    this.span = BZ.fenceSpan(this);
    this.wind = { x: 0, y: 0 };
    this.fenceSegs = []; this.standCells = []; this.props = []; this.lightList = []; this.targets = [];
    this.buildFenceSegs();
    this.buildMap();
    this.buildProps();
    this.built = true;
  }
  R(th) { let i = Math.floor((th + Math.PI) / TAU * ATAB); i = ((i % ATAB) + ATAB) % ATAB; return this.Rtab[i]; }
  Hf(th) { let i = Math.floor((th + Math.PI) / TAU * ATAB); i = ((i % ATAB) + ATAB) % ATAB; return this.Htab[i]; }
  at(dx, dy) { return [this.H.x + dx, this.H.y + dy]; }
  off(x, y) { return [x - this.H.x, y - this.H.y]; }
  base(i) { const b = [[0, 0], BZ.GEO.first, BZ.GEO.second, BZ.GEO.third, [0, 0]][i]; return { x: this.H.x + b[0], y: this.H.y + b[1] }; }
  inField(x, y) { return BZ.inField(this, x - this.H.x, y - this.H.y); }
  /** distance beyond the playing field's edge (negative inside), at a world point */
  beyond(x, y) {
    const dx = x - this.H.x, dy = y - this.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
    const oL = BZ.outL(dx, dy) - BZ.GEO.foulWall, oR = BZ.outR(dx, dy) - BZ.GEO.foulWall;
    let b = Math.max(oL, oR);
    if (Math.abs(th) <= this.span && dy < 0) b = Math.max(b, r - this.R(th));
    if (BZ.outL(dx, dy) > 0 && BZ.outR(dx, dy) > 0) b = Math.max(b, r - BZ.GEO.backstop);
    return b;
  }
  buildFenceSegs() {
    const n = Math.ceil(this.span * 2 / (1.25 * Math.PI / 180));
    for (let i = 0; i < n; i++) {
      const t0 = -this.span + i / n * this.span * 2, t1 = -this.span + (i + 1) / n * this.span * 2, tm = (t0 + t1) / 2;
      const r0 = this.R(t0), r1 = this.R(t1), h = this.Hf(tm);
      this.fenceSegs.push({ t0, t1, x0: this.H.x + Math.sin(t0) * r0, y0: this.H.y - Math.cos(t0) * r0, x1: this.H.x + Math.sin(t1) * r1, y1: this.H.y - Math.cos(t1) * r1, h, mx: this.H.x + Math.sin(tm) * (r0 + r1) / 2, my: this.H.y - Math.cos(tm) * (r0 + r1) / 2 });
    }
    // the foul walls: from where the fence meets them in toward home, and the backstop arc
    this.foulSegs = [];
    for (const side of [-1, 1]) {
      const span = this.span, Rend = this.R(side * span), ex = Math.sin(side * span) * Rend, ey = -Math.cos(side * span) * Rend;
      // the wall line: 70 outside the foul line; it runs from (ex, ey) toward home until 110 from H
      const ux = side * Math.SQRT1_2, uy = -Math.SQRT1_2, nx = side * Math.SQRT1_2, ny = Math.SQRT1_2;   // along the line, and outward
      const sEnd = ex * ux + ey * uy, sStart = Math.sqrt(Math.max(0, BZ.GEO.backstop * BZ.GEO.backstop - BZ.GEO.foulWall * BZ.GEO.foulWall));
      const N = Math.ceil((sEnd - sStart) / 48);
      for (let k = 0; k < N; k++) {
        const s0 = sStart + (sEnd - sStart) * k / N, s1 = sStart + (sEnd - sStart) * (k + 1) / N;
        const p0 = [ux * s0 + nx * BZ.GEO.foulWall, uy * s0 + ny * BZ.GEO.foulWall], p1 = [ux * s1 + nx * BZ.GEO.foulWall, uy * s1 + ny * BZ.GEO.foulWall];
        this.foulSegs.push({ x0: this.H.x + p0[0], y0: this.H.y + p0[1], x1: this.H.x + p1[0], y1: this.H.y + p1[1], h: 16, side });
      }
    }
    this.backSegs = [];   // the backstop: the arc behind home, from the left foul wall's end round to the right's
    for (let k = 0; k < 12; k++) {
      const th0 = Math.PI - (Math.PI / 4 + .35) + (Math.PI / 2 + .7) * k / 12, th1 = Math.PI - (Math.PI / 4 + .35) + (Math.PI / 2 + .7) * (k + 1) / 12;
      this.backSegs.push({ x0: this.H.x + Math.sin(th0) * 110, y0: this.H.y - Math.cos(th0) * 110, x1: this.H.x + Math.sin(th1) * 110, y1: this.H.y - Math.cos(th1) * 110, h: 50 });
    }
  }
  /** does a park have stands in the outfield at spray angle th? */
  outfieldStands(th) {
    const deg = th * 180 / Math.PI, a = this.def.standArc || { kernel: [-55, -14], barnacle: [-55, 8], caldera: [-55, -38, 38, 55], tranquility: [-55, 55], boneyard: [-55, -36, 36, 55], megadome: [-55, 55] }[this.id] || [-55, 55];
    for (let i = 0; i < a.length; i += 2) if (deg >= a[i] && deg <= a[i + 1]) return true;
    return false;
  }
  buildMap() {
    const T = 16, cw = Math.ceil(this.Wu / T), ch = Math.ceil(this.Hu / T), cells = new Array(cw * ch).fill(0), floor = new Array(cw * ch).fill('grass');
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const x = cx * T + 8, y = cy * T + 8, dx = x - this.H.x, dy = y - this.H.y, b = this.beyond(x, y);
      if (b <= 4) continue;
      const th = BZ.theta(dx, dy), behind = BZ.outL(dx, dy) > 0 && BZ.outR(dx, dy) > 0;
      const inOut = Math.abs(th) <= this.span && dy < 0 && BZ.outL(dx, dy) <= BZ.GEO.foulWall && BZ.outR(dx, dy) <= BZ.GEO.foulWall;
      if (inOut && !this.outfieldStands(th)) { floor[cy * cw + cx] = 'out'; continue; }
      if (b > 76) { floor[cy * cw + cx] = 'out'; continue; }
      const tier = clamp(Math.floor((b - 4) / 18), 0, 3);
      cells[cy * cw + cx] = (behind && dy > -20 ? 5 : 1) + tier;
      this.standCells.push({ cx, cy, x, y, tier, behind: behind && dy > -20 });
    }
    const d = this.def, top = d.standTop || '#a0a0a0', side = d.standColor || '#6a6a6a', face = d.standFace || 'stone';
    const types = {};
    for (let t = 0; t < 4; t++) {
      types[1 + t] = { h: 52 + t * 12, top, side, face, roof: 'plain' };
      types[5 + t] = { h: 40 + t * 10, top, side, face, roof: 'plain', cut: true, cutH: 4 + t * 3 };
    }
    this.cw = cw; this.ch = ch;
    this.cells = cells; this.floorTags = floor; this.types = types;
    if (!BZ.cosmetic) return;
    this.bakeTexture();
    const P = this;
    this.map = new E.TileMap({ w: cw, h: ch, cells, floor, types, ao: 4, outside: d.beyondColor ? d.beyondColor[0] : '#2a3a2a',
      floorTex: (x, y) => P.texAt(x, y) });
    this.map.shimmer = false;
  }
  texAt(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    if (X < 0 || Y < 0 || X >= this.Wu || Y >= this.Hu) return [40, 50, 40];
    const i = (Y * this.Wu + X) * 4, d = this.tex; return [d[i], d[i + 1], d[i + 2]];
  }
  /** bake the field: one texel a world unit */
  bakeTexture() {
    const W = this.Wu, H = this.Hu, d = this.def, tex = new Uint8ClampedArray(W * H * 4), hex = E.hex;
    const g0 = hex(d.grass[0]), g1 = hex(d.grass[1]), dirt = hex(d.dirt), track = hex(d.track), chalk = [242, 240, 232], b0 = hex(d.beyondColor[0]), b1 = hex(d.beyondColor[1]);
    const mound = E.hex(E.shade(d.dirt, .08)), foulG = [Math.round(g0[0] * .94), Math.round(g0[1] * .94), Math.round(g0[2] * .94)];
    const Hx = this.H.x, Hy = this.H.y, span = this.span, mow = d.mow, beyondK = d.beyond, h2 = E.hash2 || ((a, b) => BZ.n2(a, b));
    const Rtab = this.Rtab;
    const set = (i, c, k) => { tex[i] = clamp(c[0] + k, 0, 255); tex[i + 1] = clamp(c[1] + k, 0, 255); tex[i + 2] = clamp(c[2] + k, 0, 255); tex[i + 3] = 255; };
    for (let py = 0; py < H; py++) {
      const dy = py + .5 - Hy;
      for (let pxx = 0; pxx < W; pxx++) {
        const i = (py * W + pxx) * 4, dx = pxx + .5 - Hx, r = Math.hypot(dx, dy);
        const grain = ((h2(pxx, py) * 1000) % 1) * 10 - 5;
        const oL = (-dx + dy) * Math.SQRT1_2, oR = (dx + dy) * Math.SQRT1_2;
        let th = 0, Rf = 1e9;
        if (dy < 0) { th = Math.atan2(dx, -dy); Rf = Rtab[Math.floor((th + Math.PI) / TAU * ATAB) % ATAB]; }
        const behind = oL > 0 && oR > 0;
        const fieldOut = oL > 70 || oR > 70 || (behind && r > 110) || (dy < 0 && Math.abs(th) <= span && r > Rf);
        if (fieldOut) {   // the ground beyond the fence and the stands' floor
          let c = b0, k = grain;
          if (beyondK === 'corn') { const row = Math.floor((pxx + Math.sin(py * .05) * 3) / 7) & 1; c = row ? b0 : b1; k += h2(pxx >> 1, py >> 2) * 24 - 12; if (h2(pxx >> 2, py >> 2) > .93) c = [220, 196, 70]; }
          else if (beyondK === 'water') { const w = Math.sin(pxx * .09 + Math.sin(py * .05) * 2) + Math.sin(py * .13); c = w > 1.4 ? [180, 220, 240] : w > .6 ? b1 : b0; }
          else if (beyondK === 'lava') { const n = E.noise2 ? E.noise2(pxx * .02, py * .02) : h2(pxx >> 3, py >> 3); c = n > .62 ? [255, 210, 80] : n > .5 ? b0 : [58, 30, 24]; k = n > .5 ? 0 : grain; }
          else if (beyondK === 'regolith') { const cx2 = Math.floor(pxx / 90), cy2 = Math.floor(py / 90), hh = h2(cx2, cy2), ccx = (cx2 + .5) * 90 + (hh - .5) * 40, ccy = (cy2 + .5) * 90, rr = Math.hypot(pxx - ccx, py - ccy), cr = 10 + hh * 22; c = rr < cr * .8 ? [100, 100, 110] : rr < cr ? [170, 170, 178] : (h2(pxx >> 2, py >> 2) > .5 ? b0 : b1); }
          else if (beyondK === 'graves') { c = h2(pxx >> 4, py >> 4) > .6 ? b1 : b0; k += h2(pxx >> 1, py >> 1) * 14 - 7; }
          else if (beyondK === 'concourse') { c = (pxx % 64 < 2 || py % 64 < 2) ? [45, 226, 230] : (h2(pxx >> 5, py >> 5) > .5 ? b0 : b1); k = 0; }
          set(i, c, k); continue;
        }
        // inside the walls
        let c, k = grain;
        const p = (dx - dy) * Math.SQRT1_2, q = (-dy - dx) * Math.SQRT1_2;   // diamond coords: home (0,0), 1B (300,0), 3B (0,300), 2B (300,300)
        const fair = dy < 0 && Math.abs(th) <= Math.PI / 4;
        // grass with the park's mowing pattern
        let alt = 0;
        if (mow === 'stripes') alt = Math.floor((dx + 2000) / 44) & 1;
        else if (mow === 'checker') alt = (Math.floor((dx + 2000) / 56) + Math.floor((dy + 2000) / 56)) & 1;
        else if (mow === 'diamonds') alt = (Math.floor((p + 2000) / 50) + Math.floor((q + 2000) / 50)) & 1;
        else if (mow === 'astro') alt = (Math.floor((dx + 2000) / 80) & 1);
        else if (mow === 'neon') alt = Math.floor((dy + 2000) / 60) & 1;
        c = fair || dy < -100 ? (alt ? g1 : g0) : foulG;
        if (mow === 'neon' && (Math.abs(((dy + 2000) % 120) - 60) < 1 || Math.abs(((dx + 2000) % 120) - 60) < 1)) { c = [40, 200, 210]; k = 0; }
        // the warning track (outfield, and along the foul walls and the backstop)
        if ((dy < 0 && Math.abs(th) <= span && r > Rf - 46) || oL > 56 || oR > 56 || (behind && r > 96)) c = track;
        // infield dirt: inside r 470 within 50 degrees, but not the infield grass square
        if (r < 470 && dy < 0 && Math.abs(th) < 50 * Math.PI / 180) { if (!(p > 24 && p < 276 && q > 24 && q < 276)) c = dirt; }
        if (r < 46) c = dirt;
        const mr = Math.hypot(dx, dy + 200); if (mr < 27) c = mound;
        // chalk: foul lines, boxes, the plate, the rubber, the on-deck circles
        const sL = (-dx - dy) * Math.SQRT1_2, sR = (dx - dy) * Math.SQRT1_2;
        if ((Math.abs(oL) < 1.1 && sL > 4 && sL < Rf + 60) || (Math.abs(oR) < 1.1 && sR > 4 && sR < Rf + 60)) { c = chalk; k = grain * .3; }
        for (const bx of [-18, 18]) { const ax = Math.abs(dx - bx), ay = Math.abs(dy + 4); if ((ax < 7 && ax > 5.8 && ay < 11) || (ay < 11 && ay > 9.8 && ax < 7)) { c = chalk; k = 0; } }
        if (dy > 6 && dy < 40 && ((Math.abs(Math.abs(dx) - 11) < .6) || (Math.abs(dy - 40) < .6 && Math.abs(dx) < 11))) { c = chalk; k = 0; }
        if (dy >= -6 && dy <= 6 && Math.abs(dx) <= 6 - Math.max(0, dy)) { c = [250, 250, 246]; k = 0; }
        if (Math.abs(dx) < 5 && Math.abs(dy + 205) < 1.2) { c = [250, 250, 246]; k = 0; }
        for (const sx of [-78, 78]) { const rr = Math.hypot(dx - sx, dy + 21); if (rr < 9) { c = rr > 7.8 ? chalk : [Math.round(dirt[0] * .8), Math.round(dirt[1] * .8), Math.round(dirt[2] * .8)]; k = 0; } }
        set(i, c, k);
      }
    }
    this.tex = tex;
    // the Mode 7 floor: the same texels on a canvas
    try {
      const cv = E.mkCanvas(W, H), g = cv.getContext('2d'), img = g.createImageData(W, H);
      img.data.set(tex); g.putImageData(img, 0, 0); this.canvas = cv;
    } catch (e) { this.canvas = null; }
  }
  buildProps() {
    const P = this, H = this.H, d = this.def, add = (id, dx, dy, facing = Math.PI / 2, o = {}) => this.props.push(Object.assign({ id, x: H.x + dx, y: H.y + dy, z: 0, facing }, o));
    const polar = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r];
    // foul poles, dugouts, benches and gear
    for (const s of [-1, 1]) {
      const R = this.R(s * Math.PI / 4); add('bz_foulpole', Math.sin(s * Math.PI / 4) * (R + 2), -Math.cos(s * Math.PI / 4) * (R + 2), Math.PI / 2, { pole: true });
      const along = 170, wx = s * along * Math.SQRT1_2 + s * Math.SQRT1_2 * (BZ.GEO.foulWall + 10), wy = -along * Math.SQRT1_2 + Math.SQRT1_2 * (BZ.GEO.foulWall + 10);
      add('bz_dugout', wx, wy, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4);
      const bx = s * 140 * Math.SQRT1_2 + s * Math.SQRT1_2 * 52, by = -140 * Math.SQRT1_2 + Math.SQRT1_2 * 52;
      add('bz_cooler', bx, by); add('bz_batrack', bx + s * 22, by - 22, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4); add('bz_helmetrack', bx + s * 44, by - 44, s < 0 ? -Math.PI / 4 : -Math.PI * 3 / 4);
    }
    add('bz_rosin', 12, -194);
    // light towers behind the stands
    const tw = d.towers || 0, maxR = Math.max(...this.fence);
    if (tw) for (const deg of [-62, -28, 28, 62].slice(0, tw)) { const [x, y] = polar(deg, Math.abs(deg) > 45 ? maxR * .78 : this.R(deg * Math.PI / 180) + 110); add('bz_lighttower', x, y, Math.atan2(-y, -x), { tower: true }); }
    // the scoreboard or jumbotron in center-right, behind the fence
    const sbR = this.R(.35) + 70; const [sx, sy] = polar(20, sbR);
    if (d.props.includes('megatron')) { const [mx, my] = polar(0, this.R(0) + 80); add('bz_megatron', mx, my, Math.PI / 2, { megatron: true, target: 'megatron' }); }
    else if (d.props.includes('barnboard')) add('bz_barnboard', sx, sy, Math.PI / 2 + .3, { board: true });
    else add('bz_jumbotron', sx, sy, Math.PI / 2 + .3, { board: true });
    // the park's own pieces
    const rnd = E.rng(BZ.hash(this.id));
    if (this.id === 'kernel') {
      const [x, y] = polar(32, this.R(32 * Math.PI / 180) + 130); add('bz_silo', x, y, Math.PI / 2, { silo: true, target: 'silo' });
      const [wx, wy] = polar(-28, this.R(-.5) + 140); add('bz_windmill', wx, wy);
      for (let i = 0; i < 70; i++) { const deg = -10 + rnd() * 60, rr = this.R(deg * Math.PI / 180) + 30 + rnd() * 160; const [cx, cy] = polar(deg, rr); if (Math.hypot(cx - x, cy - y) > 50) add('bz_cornstalk', cx, cy, rnd() * TAU, { sway: true }); }
      for (let i = 0; i < 4; i++) { const [hx, hy] = polar(-40 + i * 6, this.R(-.7) + 40 + rnd() * 30); add('bz_haybale', hx, hy, rnd() * TAU); }
      const [kx, ky] = polar(-46, this.R(-.8) + 30); add('bz_windsock', kx, ky, 0, { windsock: true });
    } else if (this.id === 'barnacle') {
      const [lx, ly] = polar(-38, this.R(-38 * Math.PI / 180) + 170); add('bz_lighthouse', lx, ly);
      for (let i = 0; i < 4; i++) { const [bx, by] = polar(20 + i * 7, this.R(.5) + 120 + rnd() * 90); add('bz_boat', bx, by, rnd() * TAU, { bob: true }); }
      for (let i = 0; i < 5; i++) { const [bx, by] = polar(14 + i * 6, this.R(.4) + 50); add('bz_buoy', bx, by, 0, { bob: true }); }
      for (let i = 0; i < 6; i++) { const [px2, py2] = polar(42, this.R(.7) + 30 + i * 22); add('bz_piling', px2, py2); }
      add('bz_trap', ...polar(-30, this.R(-.5) + 90));
    } else if (this.id === 'caldera') {
      add('bz_volcano', ...polar(-8, maxR + 160), Math.PI / 2, { far: true });
      for (const deg of [-22, 22]) add('bz_vent', ...polar(deg, 820), Math.PI / 2, { vent: true });
      for (let i = 0; i < 14; i++) add('bz_basalt', ...polar(-50 + i * 7.5, this.R((-50 + i * 7.5) * Math.PI / 180) + 40 + rnd() * 40), rnd() * TAU);
      for (const deg of [-30, 30]) add('bz_warnsign', ...polar(deg, 780), Math.PI / 2);
    } else if (this.id === 'tranquility') {
      for (const deg of [-35, 0, 30]) add('bz_habitat', ...polar(deg, this.R(deg * Math.PI / 180) + 170), Math.PI / 2);
      for (const deg of [-18, 15, 40]) add('bz_antenna', ...polar(deg, this.R(deg * Math.PI / 180) + 110));
      add('bz_dish', ...polar(-45, this.R(-.8) + 120), Math.PI / 2 + .4); add('bz_rover', ...polar(8, this.R(.1) + 90), rnd() * TAU);
    } else if (this.id === 'boneyard') {
      for (let i = 0; i < 60; i++) { const deg = -40 + rnd() * 80, rr = this.R(deg * Math.PI / 180) + 26 + rnd() * 150; add(['bz_tomb1', 'bz_tomb2', 'bz_tomb3'][i % 3], ...polar(deg, rr), Math.PI / 2 + (rnd() - .5) * .6); }
      add('bz_crypt', ...polar(-12, this.R(-.2) + 150), Math.PI / 2); add('bz_crypt', ...polar(25, this.R(.45) + 140), Math.PI / 2);
      for (let i = 0; i < 7; i++) add('bz_deadtree', ...polar(-45 + i * 15, this.R((-45 + i * 15) * Math.PI / 180) + 120 + rnd() * 60), rnd() * TAU);
      for (let i = 0; i < 8; i++) add('bz_pumpkin', ...polar(-44 + i * 12, this.R((-44 + i * 12) * Math.PI / 180) + 20), Math.PI / 2, { glow: true });
    } else if (this.id === 'megadome') {
      for (const deg of [-35, 35]) add('bz_holoboard', ...polar(deg, this.R(deg * Math.PI / 180) + 120), Math.PI / 2 + (deg < 0 ? .4 : -.4));
      add('bz_luxurybox', ...polar(-25, this.R(-.45) + 150), Math.PI / 2 + .3, { luxury: true });
    }
    // light sources for night parks
    for (const pr of this.props) {
      if (pr.tower) this.lightList.push([pr.x, pr.y, 180, 520, .55, d.lightTint || '#fff4d8']);
      if (pr.vent) this.lightList.push([pr.x, pr.y, 20, 160, .7, '#ff7a1a']);
      if (pr.glow) this.lightList.push([pr.x, pr.y, 8, 50, .6, '#ffa040']);
      if (pr.id === 'bz_lighthouse') this.lightList.push([pr.x, pr.y, 170, 160, .6, '#fff4a0']);
      if (pr.megatron) this.lightList.push([pr.x, pr.y, 140, 300, .6, '#2de2e6']);
    }
    if (this.id === 'caldera') for (let i = 0; i < 12; i++) { const deg = -48 + i * 8.7; const [x, y] = polar(deg, this.R(deg * Math.PI / 180) + 30); this.lightList.push([H.x + x, H.y + y, 10, 140, .5, '#ff6a1a']); }
    if (this.id === 'megadome') for (let i = 0; i < 10; i++) { const deg = -45 + i * 10; const [x, y] = polar(deg, this.R(deg * Math.PI / 180) - 10); this.lightList.push([H.x + x, H.y + y, 30, 160, .45, i % 2 ? '#ff3ab8' : '#2de2e6']); }
    void P;
  }
  /** set the wind for a game: direction and strength from the gameplay stream (open-air parks) */
  rollWind() {
    if (!this.def.wind) { this.wind = { x: 0, y: 0, mph: 0 }; return; }
    const a = this.def.windDir !== undefined ? this.def.windDir + BZ.Rr(-.4, .4) : BZ.Rr(-Math.PI, Math.PI), s = BZ.Rr(0, 12);
    this.wind = { x: Math.cos(a) * s, y: Math.sin(a) * s, mph: Math.round(s * 1.4), a };
  }

  /* ---- drawing: the Broadcast Cam (a ground view over the TileMap) ---- */
  drawBroadcast(r, t, hype) {
    const d = this.def, P = this;
    if (this.map) { this.map.drawFloor(r); this.map.queueWalls(r); }
    const pad = d.pad || '#2a5a3a', top = d.padTop || '#f2c230', pt = E.tones(pad);
    const quad = (a, b, h, col, colTop, alpha) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      r.queue(mx, my, 0, g => {
        const p0 = r.w(a[0], a[1], 0), p1 = r.w(b[0], b[1], 0), p2 = r.w(b[0], b[1], h), p3 = r.w(a[0], a[1], h);
        const f = () => { px.poly(g, [p0, p1, p2, p3], col); if (colTop) px.line(g, p3[0], p3[1], p2[0], p2[1], colTop, 2); };
        if (alpha) px.blend(g, alpha, 'normal', f); else f();
      }, { bias: -2 });
    };
    for (const s of this.fenceSegs) {
      if (d.ironFence) { quad([s.x0, s.y0], [s.x1, s.y1], s.h, '#1a1820', top, .55); continue; }
      quad([s.x0, s.y0], [s.x1, s.y1], s.h, pt.base, top);
    }
    // distance markers on the fence
    for (const [deg, lab] of [[-45, 0], [0, 0], [45, 0]]) {
      const th = deg * Math.PI / 180 * .97, R = this.R(th), x = this.H.x + Math.sin(th) * (R - 1), y = this.H.y - Math.cos(th) * (R - 1), ft = BZ.feet(this.R(deg * Math.PI / 180));
      void lab; r.queue(x, y, 0, g => { const p = r.w(x, y, this.Hf(th) * .55); E.font.text(g, String(ft), p[0], p[1] - 3, '#ffffff', { align: 'center', shadow: '#000' }); }, { bias: 2 });
    }
    for (const s of this.foulSegs) quad([s.x0, s.y0], [s.x1, s.y1], s.h, pt.sh, top);
    for (const s of this.backSegs) quad([s.x0, s.y0], [s.x1, s.y1], s.h, '#20242c', null, .3);
    // bases
    for (let i = 1; i <= 3; i++) { const b = this.base(i); r.shape('bz_base', b.x, b.y, 0, { facing: Math.PI / 4 }); }
    r.shape('bz_rubber', this.H.x, this.H.y - 205, 0, { facing: Math.PI / 2 });
    // props
    for (const pr of this.props) {
      if (pr.sway) { r.shape(pr.id, pr.x, pr.y, 0, { facing: pr.facing + Math.sin(t * 1.6 + pr.x * .01) * .08 }); continue; }
      if (pr.bob) { r.shape(pr.id, pr.x, pr.y, Math.sin(t * 1.4 + pr.x) * 1.5, { facing: pr.facing + Math.sin(t * .7 + pr.y) * .1 }); continue; }
      if (pr.hidden) continue;
      r.shape(pr.id, pr.x, pr.y, 0, { facing: pr.facing, light: true });
      if (pr.board || pr.megatron) this.queueBoardScreen(r, pr, t);
    }
    // the crowd on the stand tops
    this.drawCrowd(r, t, hype);
    // lights for the night
    if (r.game.lights.enabled) for (const L of this.lightList) r.game.lights.add(L[0], L[1], L[2], L[3], L[4], { color: L[5] });
  }
  queueBoardScreen(r, pr, t) {
    const w = pr.megatron ? 88 : pr.id === 'bz_barnboard' ? 48 : 44, z0 = pr.megatron ? 96 : pr.id === 'bz_barnboard' ? 22 : 56, h = pr.megatron ? 90 : pr.id === 'bz_barnboard' ? 36 : 42;
    const c = Math.cos(pr.facing), s = Math.sin(pr.facing), off = (pr.megatron ? 6.6 : 4.6);
    const ax = pr.x + c * off - s * w, ay = pr.y + s * off + c * w, bx = pr.x + c * off + s * w, by = pr.y + s * off - c * w;
    r.queue(pr.x + c * off, pr.y + s * off, 0, g => {
      const p0 = r.w(ax, ay, z0), p1 = r.w(bx, by, z0), p2 = r.w(bx, by, z0 + h), p3 = r.w(ax, ay, z0 + h);
      BZ.drawBoardScreen && BZ.drawBoardScreen(g, [p0, p1, p2, p3], t, pr);
    }, { bias: 3, emissive: true });
  }
  drawCrowd(r, t, hype) {
    const cols = this.def.crowd || ['#ffffff'], T = 16, h2 = E.hash2;
    const wave = BZ.crowdWave || null, jump = BZ.crowdJump || 0;
    for (const c of this.standCells) {
      const tp = this.types[this.cells[c.cy * this.cw + c.cx]], z = c.behind ? (r.view.pitchDeg > 40 ? (tp.cutH || 6) : tp.h) : tp.h;
      r.queue(c.x, c.y, z, g => {
        for (let k = 0; k < 3; k++) {
          const hh = h2(c.cx * 3 + k, c.cy * 7), x = c.x - 6 + k * 6 + (hh - .5) * 3, y = c.y + (hh - .5) * 8;
          let bob = Math.max(0, Math.sin(t * (2 + hype * 4) + hh * 9)) * (1 + hype * 3);
          if (wave !== null) { const a = Math.atan2(c.x - this.H.x, -(c.y - this.H.y)); const dd = Math.abs(BZ.ang(a - wave)); if (dd < .25) bob += 7 * (1 - dd / .25); }
          if (jump > 0) bob += jump * 6 * (.5 + hh);
          const p = r.w(x, y, z + bob);
          const col = cols[Math.floor(hh * 97) % cols.length], skin = SKINS[Math.floor(hh * 31) % SKINS.length];
          const s = Math.max(1, Math.round((r.view.scale || 1) * 2.2));
          px.rect(g, p[0] - s, p[1] - s * 2, s * 2, s * 2, col);
          px.rect(g, p[0] - Math.max(1, s >> 1), p[1] - s * 3, Math.max(1, s), Math.max(1, s), skin);
        }
      }, { bias: 1 });
    }
  }

  /* ---- drawing: the Plate Cam (Mode 7 billboards for walls, stands, crowd and props) ---- */
  feedMode7(m7, t, hype) {
    const d = this.def, pad = d.pad || '#2a5a3a', top = d.padTop || '#f2c230', pt = E.tones(pad), cols = d.crowd || ['#ffffff'];
    const proj = (x, y, z) => m7.project(x, y, z);
    const quadM = (ax, ay, bx, by, z0a, z1a, z0b, z1b, col, line, alpha, crowd) => {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      m7.add(mx, my, 0, g => {
        const p0 = proj(ax, ay, z0a), p1 = proj(bx, by, z0b), p2 = proj(bx, by, z1b), p3 = proj(ax, ay, z1a); if (!p0 || !p1 || !p2 || !p3) return;
        const f = () => { px.poly(g, [p0, p1, p2, p3], col); if (line) px.line(g, p3[0], p3[1], p2[0], p2[1], line, Math.max(1, Math.round(p0[2] * 1.5))); };
        if (alpha) px.blend(g, alpha, 'normal', f); else f();
        if (crowd) {   // the crowd: rows of little people on the stand's face
          const rows = 5, n = Math.max(2, Math.round(Math.abs(p1[0] - p0[0]) / 2.2));
          for (let rr = 0; rr < rows; rr++) for (let k = 0; k < n; k++) {
            const u = (k + .5) / n, v = (rr + .5) / rows, hh = E.hash2(Math.round(mx) * 13 + k, rr + Math.round(my));
            const bx2 = p0[0] + (p1[0] - p0[0]) * u, by2 = p0[1] + (p1[1] - p0[1]) * u, tx = p3[0] + (p2[0] - p3[0]) * u, ty = p3[1] + (p2[1] - p3[1]) * u;
            const bob = Math.max(0, Math.sin(t * (2 + hype * 4) + hh * 9)) * (hype > .7 ? 1.5 : .5) + (BZ.crowdJump || 0) * 2;
            const x = bx2 + (tx - bx2) * v, y = by2 + (ty - by2) * v - bob;
            px.rect(g, x, y - 1, 1, 2, cols[Math.floor(hh * 97) % cols.length]);
          }
        }
      });
    };
    for (const s of this.fenceSegs) {
      quadM(s.x0, s.y0, s.x1, s.y1, 0, s.h, 0, s.h, d.ironFence ? '#1a1820' : pt.base, top, d.ironFence ? .7 : 0);
      if (this.outfieldStands((s.t0 + s.t1) / 2)) {
        const r0 = this.R(s.t0), r1 = this.R(s.t1), k0 = (r0 + 8) / r0, k1 = (r1 + 8) / r1, e0 = (r0 + 76) / r0, e1 = (r1 + 76) / r1;
        const hx = this.H.x, hy = this.H.y;
        quadM(hx + (s.x0 - hx) * k0, hy + (s.y0 - hy) * k0, hx + (s.x1 - hx) * k1, hy + (s.y1 - hy) * k1, 0, s.h + 14, 0, s.h + 14, d.standColor || '#555', null, 0, false);
        quadM(hx + (s.x0 - hx) * e0, hy + (s.y0 - hy) * e0, hx + (s.x1 - hx) * e1, hy + (s.y1 - hy) * e1, s.h + 14, 96, s.h + 14, 96, E.shade(d.standColor || '#555', -.2), d.standTop, 0, true);
      }
    }
    // foul stands, along the foul walls
    for (const s of this.foulSegs) {
      quadM(s.x0, s.y0, s.x1, s.y1, 0, s.h, 0, s.h, pt.sh, top);
      const ox = s.side * Math.SQRT1_2 * 70, oy = Math.SQRT1_2 * 70;
      quadM(s.x0 + ox, s.y0 + oy, s.x1 + ox, s.y1 + oy, 18, 90, 18, 90, E.shade(d.standColor || '#555', -.2), d.standTop, 0, true);
    }
    // poles, towers, the board and the park's pieces
    for (const pr of this.props) {
      if (pr.id === 'bz_cornstalk' || pr.id === 'bz_buoy' || pr.id === 'bz_piling' || pr.id === 'bz_tomb3' || pr.id === 'bz_rosin') continue;
      if (pr.y > this.H.y + 40) continue;
      if (pr.id === 'bz_dugout' || pr.id === 'bz_cooler' || pr.id === 'bz_batrack' || pr.id === 'bz_helmetrack') continue;
      m7.shape(pr.id, pr.x, pr.y, pr.bob ? Math.sin(t * 1.4 + pr.x) * 1.5 : 0, { facing: pr.facing });
    }
    // bases and the rubber
    for (let i = 1; i <= 3; i++) {
      const b = this.base(i);
      m7.add(b.x, b.y, 0, (g, sx, sy, k) => { const w = Math.max(1.5, 5 * k); px.poly(g, [[sx - w, sy], [sx, sy - w * .35], [sx + w, sy], [sx, sy + w * .35]], '#f4f4f0'); });
    }
    // the corn rows past the fence as a band of stalks (cheap at distance)
    if (this.id === 'kernel') for (const pr of this.props) if (pr.id === 'bz_cornstalk') m7.add(pr.x, pr.y, 0, (g, sx, sy, k) => { const h = 26 * k, w = Math.max(1, 2 * k); px.rect(g, sx - w / 2, sy - h, w, h, '#6a8a2a'); px.rect(g, sx - w, sy - h * .7, w * 2, Math.max(1, h * .12), '#8aa83a'); });
  }
};

/** build (and cache) a park */
BZ.parkCache = {};
BZ.park = (id) => BZ.parkCache[id] || (BZ.parkCache[id] = new BZ.Park(id));
/** the sky of a park as a Backdrop (cached) */
BZ.backdropCache = {};
BZ.backdrop = (id) => {
  if (BZ.backdropCache[id]) return BZ.backdropCache[id];
  const d = BZ.get('parks', id); let bd = null;
  try { bd = new E.Backdrop(d.backdrop); } catch (e) { bd = new E.Backdrop('day'); }
  return (BZ.backdropCache[id] = bd);
};
/** a Mode 7 view over a park (cached) */
BZ.m7Cache = {};
BZ.mode7 = (id) => {
  if (BZ.m7Cache[id]) return BZ.m7Cache[id];
  const P = BZ.park(id), d = P.def;
  const m7 = new E.Mode7({ floor: P.canvas || P.map, outside: d.beyondColor ? d.beyondColor[0] : '#2a3a2a', sky: BZ.backdrop(id), far: 3200 });
  return (BZ.m7Cache[id] = m7);
};

/* ===== src/10-rules.js ===== */
/* =============================================================================
 * 10-rules: the rules engine, pure logic over the match state BZ.M: the count,
 * outs, runs (with the third-out rule), half-innings, the game's end (walk-offs,
 * skipping the last bottom half, extra innings with the Bonus Runner, SUDDEN
 * BOOM, the mercy rule), the line score and box stats.
 * House rules (what you can't do): no balks, no infield fly rule, no appeals, no
 * interference or obstruction, no check swings, no dropped third strikes, no
 * intentional walks, no substitutions but a pitching change, no arguing.
 * ========================================================================== */
BZ.HOUSE_RULES = ['No balks', 'No infield fly rule', 'No appeals', 'No interference or obstruction calls', 'No check swings: every swing counts',
  'No dropped third strikes', 'No intentional walks', 'Only one substitution: a pitching change', 'No arguing with the umpire (believe us, we tried)'];

BZ.newTeamState = (teamId, side) => {
  const T = BZ.get('teams', teamId);
  return {
    id: teamId, def: T, side, lineup: T.lineup.slice(), order: 0, pitcher: T.ace, bullpen: T.reliever ? [T.reliever] : [],
    runs: 0, hits: 0, errors: 0, meter: 0, turbo: 100, line: [], stamina: {}, humans: [], afterburn: 0, batzookaArmed: false,
    shortCircuit: 0, used: {}
  };
};
BZ.statFor = (M, p) => M.stats[p.id] || (M.stats[p.id] = { name: p.name, team: p.team, AB: 0, H: 0, '2B': 0, '3B': 0, HR: 0, RBI: 0, BB: 0, K: 0, SB: 0, R: 0, IP: 0, PK: 0, PBB: 0, pitches: 0, outsP: 0, catches: 0, dives: 0, robbed: 0, longest: 0 });
BZ.offense = M => M.teams[M.half === 'top' ? 0 : 1];
BZ.defense = M => M.teams[M.half === 'top' ? 1 : 0];
BZ.leadBy = (M) => M.teams[1].runs - M.teams[0].runs;

BZ.rules = {
  /** a called or swinging strike */
  strike(M, how) {
    M.strikes++;
    BZ.statFor(M, M.pitcher).pitches++;
    if (M.strikes >= 3) { this.strikeout(M, how); return 'K'; }
    BZ.bus.emit('call', { kind: 'strike', how });
    return 'S';
  },
  ball(M) {
    M.balls++;
    BZ.statFor(M, M.pitcher).pitches++;
    if (M.balls >= 4) { this.walk(M); return 'BB'; }
    BZ.bus.emit('call', { kind: 'ball' });
    return 'B';
  },
  foul(M, bunt) {
    BZ.statFor(M, M.pitcher).pitches++;
    if (bunt && M.strikes >= 2) { M.strikes = 3; this.strikeout(M, 'bunt'); return 'K'; }
    if (M.strikes < 2) M.strikes++;
    BZ.bus.emit('call', { kind: 'foul' });
    return 'F';
  },
  strikeout(M, how) {
    BZ.statFor(M, M.batter).AB++; BZ.statFor(M, M.batter).K++; BZ.statFor(M, M.pitcher).PK++;
    BZ.bus.emit('call', { kind: 'strike', how, three: true });
    BZ.bus.emit('strikeout', { batter: M.batter, pitcher: M.pitcher, how });
    this.out(M, 'k', M.batter);
    this.nextBatter(M);
  },
  /** ball four or a hit batter: the batter takes first, forced runners move up */
  walk(M, hbp) {
    BZ.statFor(M, M.batter).BB++; if (!hbp) BZ.statFor(M, M.pitcher).PBB++;
    const moved = this.forceAdvance(M, M.batter);
    BZ.bus.emit(hbp ? 'hbp' : 'walk', { batter: M.batter, pitcher: M.pitcher, scored: moved });
    this.nextBatter(M);
  },
  /** put a new runner on first and push forced runners along (walks, HBP); returns runs scored */
  forceAdvance(M, batter) {
    let runs = 0;
    const B = M.bases; // [1B, 2B, 3B] player or null
    if (B[0]) { if (B[1]) { if (B[2]) { this.score(M, B[2], batter); runs++; } B[2] = B[1]; } B[1] = B[0]; }
    B[0] = batter;
    return runs;
  },
  /** a run scores (rbi credited to the batter when given) */
  score(M, runner, rbiTo) {
    const O = BZ.offense(M); O.runs++; if (M.play && !M.play.done) M.play.runs.push({ id: runner.id, t: M.clock });
    BZ.statFor(M, runner).R++; if (rbiTo) BZ.statFor(M, rbiTo).RBI++;
    const inn = M.inning - 1; O.line[inn] = (O.line[inn] || 0) + 1;
    BZ.bus.emit('run', { runner, team: O.id, score: [M.teams[0].runs, M.teams[1].runs] });
    this.checkLead(M);
    if (this.walkoffNow(M)) { M.walkoff = true; BZ.bus.emit('walkoff', { team: O.id, runner }); }
  },
  /** take a run back (the third-out rule: a force out or the batter-runner out before first ends the inning with no runs) */
  unscore(M, n) {
    const O = BZ.offense(M); const inn = M.inning - 1;
    for (let i = 0; i < n; i++) { O.runs--; O.line[inn] = Math.max(0, (O.line[inn] || 0) - 1); }
    M.walkoff = false;
  },
  checkLead(M) {
    const lead = Math.sign(M.teams[1].runs - M.teams[0].runs);
    if (M._lead !== undefined && lead !== M._lead && lead !== 0) BZ.bus.emit('leadChange', { lead });
    M._lead = lead;
  },
  walkoffNow(M) { return M.half === 'bottom' && M.inning >= M.innings && M.teams[1].runs > M.teams[0].runs; },
  out(M, how, who) {
    M.outs++;
    const D = BZ.defense(M); BZ.statFor(M, D.pitcher).outsP++;
    BZ.bus.emit('out', { how, who, outs: M.outs });
    if (M.play && !M.play.done) M.play.outs.push({ how, id: who && who.id, t: M.clock });
  },
  nextBatter(M) {
    const O = BZ.offense(M); O.order = (O.order + 1) % O.lineup.length;
    M.balls = 0; M.strikes = 0; M.batterUp = true;
  },
  batterNow(M) { const O = BZ.offense(M); return O.lineup[O.order]; },
  /** after the half ends: is the game over? returns null (play on) or { winner: 0 | 1, why } */
  gameOverAfterHalf(M) {
    const a = M.teams[0].runs, h = M.teams[1].runs, n = M.innings;
    // mercy: a 10-run lead after 2 full innings (home leading after the top of the 3rd counts too)
    if (M.mercy && M.inning >= 2 && Math.abs(a - h) >= 10 && (M.half === 'bottom' || (M.half === 'top' && h - a >= 10))) return { winner: a > h ? 0 : 1, why: 'mercy' };
    if (M.half === 'top' && M.inning >= n && h > a) return { winner: 1, why: 'skip' };          // home leads after the top of the last: no bottom half
    if (M.half === 'bottom' && M.inning >= n && a !== h) return { winner: a > h ? 0 : 1, why: 'final' };
    if (M.half === 'bottom' && M.inning >= n + 3 && a === h) return { winner: -1, why: 'boom' };   // SUDDEN BOOM: a home run duel decides it
    return null;
  },
  /** the next half-inning: flip sides, the Bonus Runner in extra innings */
  nextHalf(M) {
    const prev = M.half;
    if (M.half === 'top') M.half = 'bottom'; else { M.half = 'top'; M.inning++; }
    M.outs = 0; M.balls = 0; M.strikes = 0; M.bases = [null, null, null];
    const O = BZ.offense(M); O.line[M.inning - 1] = O.line[M.inning - 1] || 0;
    if (M.inning > M.innings) {   // extra innings: the batter who made the last out of the last inning starts on second
      const last = O.lineup[(O.order + O.lineup.length - 1) % O.lineup.length];
      M.bases[1] = last; M.bonusRunner = true;
    } else M.bonusRunner = false;
    BZ.bus.emit('halfStart', { inning: M.inning, half: M.half, prev });
  },
  /** stats line for the box: AVG etc. */
  avg(s) { return s.AB ? (s.H / s.AB).toFixed(3).replace(/^0/, '') : '.000'; }
};

/* ===== src/11-pitch.js ===== */
/* =============================================================================
 * 11-pitch: the pitch catalog, the delivery (pick, aim, the release ring,
 * aftertouch), the exact parametric flight (the plate crossing is known at
 * release), calls at the zone, stamina and wild pitches.
 * Coordinates are offsets from home plate: x across (+ toward 1B), y along
 * (- toward the mound), z up. The strike zone plane is y = -6.
 * ========================================================================== */
const PLATE_Y = -6, REL_Y = -198, HEATER = 340;
const wob = (u, T, ph, amp) => amp * (Math.sin(TAU * 3 * u * T + ph) * .7 + Math.sin(TAU * 1.7 * u * T + ph * 2.3) * .3);
BZ.PITCHES = {
  heater: { name: 'Heater', short: 'HEATER', speed: 1, bx: 0, bz: 1.5, k: 1, sag: 1.5, kind: 'heater', cost: 1.2, trail: 'lines' },
  curve: { name: 'Curve', short: 'CURVE', speed: .74, bx: 7, bz: -10, k: 2.2, sag: 9, kind: 'breaking', cost: 1.6 },
  slider: { name: 'Slider', short: 'SLIDER', speed: .86, bx: 9, bz: -3, k: 2, sag: 4, kind: 'breaking', cost: 1.6 },
  changeup: { name: 'Changeup', short: 'CHANGE', speed: .66, bx: -3, bz: -6, k: 1.6, sag: 8, kind: 'offspeed', cost: 1 },
  sinker: { name: 'Sinker', short: 'SINKER', speed: .92, bx: -4, bz: -6, k: 1.8, sag: 3, kind: 'offspeed', cost: 1 },
  knuckler: { name: 'Knuckleball', short: 'KNUCKLE', speed: .6, bx: 0, bz: -3, k: 1, sag: 9, kind: 'offspeed', cost: 1, wobble: 4 },
  // signatures
  butterfly: { name: 'Butterfly Knuckler', short: 'BUTTERFLY', speed: .58, bx: 0, bz: -3, k: 1, sag: 10, kind: 'signature', cost: 2.2, wobble: 6.4, trail: 'flutter' },
  kernelcannon: { name: 'Kernel Cannon', short: 'CANNON', speed: 1.15, bx: 0, bz: 2, k: 1, sag: 1, kind: 'signature', cost: 2.2, trail: 'lines' },
  riptide: { name: 'Riptide Curve', short: 'RIPTIDE', speed: .76, bx: 6, bz: -8, k: 2, sag: 8, kind: 'signature', cost: 2.2, special: (u) => [Math.sin(u * TAU) * 4 * (1 - u * .5), Math.sin(u * TAU * 1.5) * 1.5], trail: 'bubbles' },
  magmasinker: { name: 'Magma Sinker', short: 'MAGMA SINKER', speed: .9, bx: -3, bz: -10, k: 3.2, sag: 2, kind: 'signature', cost: 2.2, trail: 'embers' },
  zerog: { name: 'Zero-G Floater', short: 'ZERO-G', speed: .62, bx: 0, bz: 0, k: 1, sag: 2, kind: 'signature', cost: 2.2, special: (u) => [0, 6 * Math.sin(Math.min(1, u / .7) * Math.PI / 2) - 18 * Math.pow(Math.max(0, (u - .7) / .3), 2)], trail: 'sparkle' },
  phantomfork: { name: 'Phantom Forkball', short: 'PHANTOM FORK', speed: .84, bx: 0, bz: -8, k: 3.5, sag: 2, kind: 'signature', cost: 2.2, vis: u => u < .35 || u > .8, trail: 'ghost' },
  gigavolt: { name: 'Gigavolt Heater', short: 'GIGAVOLT', speed: 1.25, bx: 0, bz: 1, k: 1, sag: 1, kind: 'signature', cost: 2.2, special: (u) => [Math.sign(Math.sin(u * Math.PI * 7)) * 2 * Math.min(1, u * 4), 0], trail: 'zap' },
  // team supers (R1 at pitch select with a full meter)
  cornpopper: { name: 'Corn Popper', short: 'CORN POPPER', speed: 1.1, bx: 0, bz: 0, k: 1, sag: 3, kind: 'super', cost: 5, pops: [.3, .55, .8], trail: 'popcorn' },
  tidalwave: { name: 'Tidal Wave', short: 'TIDAL WAVE', speed: 1.2, bx: 0, bz: 0, k: 1, sag: 0, kind: 'super', cost: 5, special: (u) => [0, 10 * Math.sin(Math.min(1, u / .75) * Math.PI) * (u < .75 ? 1 : 0)], trail: 'wave' },
  meteorheater: { name: 'Meteor Heater', short: 'METEOR HEATER', speed: 1.35, bx: 0, bz: 1, k: 1, sag: 1, kind: 'super', cost: 5, trail: 'fire' },
  blackhole: { name: 'Black Hole Ball', short: 'BLACK HOLE', speed: 1.2, bx: 2, bz: -4, k: 2, sag: 3, kind: 'super', cost: 5, tiny: true, pull: true, trail: 'swirl' },
  banshee: { name: 'Banshee Ball', short: 'BANSHEE BALL', speed: 1.25, bx: 0, bz: -3, k: 2, sag: 2, kind: 'super', cost: 5, vis: u => u > .85, trail: 'ghost', scream: true },
  overclock: { name: 'Overclock Laser', short: 'OVERCLOCK LASER', speed: 1.5, bx: 0, bz: 0, k: 1, sag: 0, kind: 'super', cost: 5, needGood: true, trail: 'laser' },
  // the Derby's pitching machine
  machine: { name: 'Pitch-O-Matic', short: 'MACHINE', speed: .8, bx: 0, bz: 0, k: 1.5, sag: 5, kind: 'heater', cost: 0 }
};
BZ.PITCH_SLOTS = ['south', 'east', 'west', 'north'];        // heater, breaking, off-speed, signature; R1 the team super
BZ.repertoire = (p) => p.pitches || ['heater', 'slider', 'changeup', 'heater'];
BZ.staminaOf = (M, p) => { const v = M.teamOf(p).stamina[p.id]; return v === undefined ? 100 : v; };

BZ.Pitch = class Pitch {
  /** o: { type, pitcher, target: [x, z], q (release quality 0..1), lefty, speedMul, brkMul, rand (gameplay rng), golden, noMiss } */
  constructor(M, o) {
    const def = BZ.PITCHES[o.type] || BZ.PITCHES.heater, p = o.pitcher || {};
    this.type = o.type; this.def = def; this.pitcher = p; this.q = clamp(o.q === undefined ? .3 : o.q, 0, 1); this.golden = !!o.golden;
    const st = o.stamina === undefined ? 100 : o.stamina, tired = st < 15 ? 2 : st < 40 ? 1 : 0;
    const vel = p.vel !== undefined ? BZ.factor(p.vel) : 1, brk = p.brk !== undefined ? BZ.factor(p.brk) : 1;
    this.speed = HEATER * def.speed * vel * (1 + .08 * this.q) * [1, .92, .85][tired] * TUNE.pitchSpeed * (o.speedMul || 1);
    this.T = (PLATE_Y - REL_Y) / this.speed;   // seconds from release to the plate
    const side = o.lefty ? -1 : 1;             // a lefty's break mirrors
    this.side = side;
    this.x0 = side * -4; this.y0 = REL_Y; this.z0 = BZ.GEO.releaseZ * ((p.look && p.look.size) || 1.25) / 1.25;
    const bk = TUNE.pitchBreak * (1 + .2 * this.q) * brk * (o.brkMul || 1);
    this.bx = def.bx * bk * side; this.bz = def.bz * bk; this.k = def.k || 1; this.sag = def.sag || 0;
    const R = o.rand || BZ.R;
    const missR = o.noMiss ? 0 : lerp(5, .5, this.q) * [1, 1.4, 2][tired] * (o.missMul || 1), ma = R() * TAU, mr = Math.sqrt(R()) * missR;
    this.aim = { x: o.target[0] + Math.cos(ma) * mr, z: o.target[1] + Math.sin(ma) * mr };
    this.target = { x: o.target[0], z: o.target[1] };
    this.phase = R() * TAU;
    this.pops = def.pops ? def.pops.map(u => ({ u, dx: (R() - .5) * 6, dz: (R() - .5) * 6 })) : null;
    this.after = { x: 0, z: 0 }; this.afterUsed = false;
    this.t = 0; this.done = false;
    this.calcEnd();
  }
  calcEnd() {
    // the base line ends where, once the break and the special path are added, the ball crosses at the aim
    const sp = this.def.special ? this.def.special(1, this) : [0, 0];
    this.ex = this.aim.x - this.bx - sp[0] - this.popSum('dx', 1) - this.wob(1, 0);
    this.ez = this.aim.z - this.bz - sp[1] - this.popSum('dz', 1) - this.wob(1, 1);
  }
  popSum(key, u) { if (!this.pops) return 0; let s = 0; for (const p of this.pops) if (u >= p.u) s += p[key]; return s; }
  wob(u, axis) { const a = this.def.wobble; if (!a) return 0; return wob(u, this.T, this.phase + axis * 1.3, a * (axis ? .5 : 1)) * Math.min(1, u * 3); }
  /** the ball's position (offset from home) at u = t / T (u > 1: on into the catcher's mitt) */
  pos(u) {
    if (u > 1) { const c = this.pos(1), k = Math.min(1, (u - 1) / .12); return { x: c.x, y: PLATE_Y + 22 * k, z: c.z + (13 - c.z) * k * .3 }; }
    const sp = this.def.special ? this.def.special(u, this) : [0, 0], bu = Math.pow(u, this.k);
    const x = lerp(this.x0, this.ex, u) + this.bx * bu + sp[0] + this.popSum('dx', u) + this.wob(u, 0) + this.after.x * Math.min(1, u / .4 + .25);
    const y = lerp(this.y0, PLATE_Y, u);
    const z = lerp(this.z0, this.ez, u) + this.sag * 4 * u * (1 - u) + this.bz * bu + sp[1] + this.popSum('dz', u) + this.wob(u, 1) + this.after.z * Math.min(1, u / .4 + .25);
    return { x, y, z };
  }
  get u() { return this.t / this.T; }
  /** where it crosses the plate plane */
  cross() { return this.pos(1); }
  visible(u) { return !this.def.vis || this.def.vis(u); }
  /** aftertouch: the stick bends the ball during the first 40% of the flight */
  steer(sx, sz, dt) {
    if (this.u > .4 || (!sx && !sz)) return;
    const brk = this.pitcher.brk !== undefined ? BZ.factor(this.pitcher.brk) : 1, lim = TUNE.aftertouch * brk;
    const rate = 14 * lim;
    this.after.x = clamp(this.after.x + sx * rate * dt, -4 * lim, 4 * lim);
    this.after.z = clamp(this.after.z + sz * rate * dt, -3 * lim, 3 * lim);
    this.afterUsed = true;
  }
  step(dt) { this.t += dt; }
};
/** is a crossing point in the batter's zone (the ball's radius counts)? */
BZ.inZone = (x, z, size = 1.25) => {
  const k = size / 1.25, r = BZ.GEO.ballR;
  return Math.abs(x) <= BZ.GEO.zoneHalfW + r && z >= BZ.GEO.zoneLo * k - r && z <= BZ.GEO.zoneHi * k + r;
};
/** does a crossing hit the batter? (righties stand on the third-base side: x < 0) */
BZ.hitsBatter = (x, z, lefty) => z > 3 && z < 31 && (lefty ? x > 14 : x < -14);
/** release quality from the press timing error (seconds) */
BZ.releaseQ = (err) => {
  const a = Math.abs(err), perfect = .04 * TUNE.releaseWindow, zero = .2 * TUNE.releaseWindow;
  if (a <= perfect) return 1;
  return clamp(1 - (a - perfect) / (zero - perfect), 0, 1);
};
BZ.WINDUP = .9; BZ.RING = .45;

/* ===== src/12-bat.js ===== */
/* =============================================================================
 * 12-bat: the sweet-spot reticle, the swings (contact, power, BATZOOKA, bunt)
 * and the contact model: timing error and aim offset -> spray, launch and exit
 * speed. The result comes straight from timing and aim, so it is readable.
 * ========================================================================== */
BZ.SWINGS = {
  contact: { delay: .10, r: 4.2, ev: 720, add: 0 },
  power: { delay: .14, r: 2.8, ev: 860, add: 6 },
  batzooka: { delay: .16, r: 6.3, ev: 780, add: 0, zooka: true },
  bunt: { delay: 0, r: 6, ev: 160, add: 0, bunt: true }
};
/** the batting assists by difficulty for a human batter: { sweet, window } multipliers */
BZ.assistFor = (M, side) => {
  const human = M.teams[side].humans.length > 0, lv = M.difficulty || 'pro';
  if (!human) return { sweet: 1, window: 1 };
  const base = { rookie: [1.25, 1.25], pro: [1, 1], allstar: [1, 1], batzooka: [.9, .9] }[lv] || [1, 1];
  const set = BZ.game && BZ.game.settings ? BZ.game.settings.batAssist : 'off';
  return { sweet: base[0] * (set === 'big' ? 1.25 : 1), window: base[1] * (set === 'big' ? 1.1 : 1) };
};
BZ.swingWindow = (assist) => .09 * TUNE.swingTiming * (assist ? assist.window : 1);
/** the reticle's radius for a swing type and batter */
BZ.reticleR = (type, batter, assist) => (BZ.SWINGS[type] || BZ.SWINGS.contact).r * BZ.factor(batter.con) * TUNE.sweetSpot * (assist ? assist.sweet : 1);

/**
 * the contact model. sw: { type, e (s, + late), rx, rz (reticle center at contact) }, ball: { x, z } (the crossing),
 * pitch speed (U/s), batter, park, lefty. Returns { kind: 'miss' | 'foultip' | 'dribble' | 'contact', grade, ... }
 */
BZ.contact = (sw, ball, pitchSpeed, batter, park, lefty, assist, o = {}) => {
  const S = BZ.SWINGS[sw.type] || BZ.SWINGS.contact, win = BZ.swingWindow(assist);
  const r = BZ.reticleR(sw.type, batter, assist) * (o.rMul || 1);
  const e = sw.e, ae = Math.abs(e);
  // vertical offset costs less than sideways: aiming a touch under the ball lofts it without killing it
  const dx = ball.x - sw.rx, dz = ball.z - sw.rz, d = Math.hypot(dx, dz * .65), dn = d / r;
  const out = { e, d, dn, r, window: win, ms: Math.round(e * 1000) };
  out.grade = ae <= .022 * TUNE.swingTiming * (assist ? assist.window : 1) ? 'PERFECT' : ae <= .05 * TUNE.swingTiming * (assist ? assist.window : 1) ? 'GOOD' : 'OK';
  if (ae > win || dn > 1.6) { out.kind = 'miss'; return out; }
  if (o.needGood && out.grade === 'OK') { out.kind = 'foultip'; return out; }
  if (dn > 1) { out.kind = (o.rand || BZ.R)() < .3 ? 'dribble' : 'foultip'; }
  else out.kind = 'contact';
  const timing = 1 - Math.pow(ae / win, 1.5), Q = out.kind === 'contact' ? (1 - Math.min(dn, 1)) * timing : .08;
  const rnd = o.rand || BZ.R;
  let theta = (lefty ? -1 : 1) * (e / win) * 48 + (dx / r) * 10 + (rnd() - .5) * 8;   // degrees, + toward right field
  let phi = 12 - (-(dz) / r) * 35 * TUNE.launchSpread + S.add;                          // swinging above the ball (reticle high) drives it down
  if (out.kind === 'dribble') { phi = -15 + rnd() * 10; theta = theta * .6 + (rnd() - .5) * 40; }
  if (S.zooka) phi = clamp(phi, 28, 38);
  const pow = BZ.factor(batter.pow), evMax = S.zooka ? S.ev * TUNE.batzookaPower : S.ev;
  let EV = lerp(280, evMax, Math.pow(Math.max(0, Q), .92)) * pow * (.9 + .1 * pitchSpeed / 340) * TUNE.exitVelocity * (park ? park.evMul : 1) * (o.evMul || 1);
  if (out.kind === 'dribble') EV = 120 + rnd() * 90;
  Object.assign(out, { Q, theta, phi, EV, spin: (lefty ? -1 : 1) * Math.sign(e) * Math.min(1, ae / win) * 110 });
  const t = theta * Math.PI / 180, p = phi * Math.PI / 180;
  out.v = [EV * Math.cos(p) * Math.sin(t), -EV * Math.cos(p) * Math.cos(t), EV * Math.sin(p)];
  out.feedback = out.grade === 'PERFECT' ? 'PERFECT!' : (e < 0 ? 'EARLY ' : 'LATE ') + Math.abs(out.ms) + ' MS';
  out.feedback2 = dz < -r * .45 ? 'TOPPED' : dz > r * .45 ? 'UNDER IT' : '';
  return out;
};
/** a bunt: the ball crosses within the bunt radius of the reticle -> a soft roller */
BZ.buntContact = (ball, rx, rz, batter, park, rand = BZ.R) => {
  const r = BZ.SWINGS.bunt.r * BZ.factor(batter.con) * TUNE.sweetSpot, dx = ball.x - rx, dz = ball.z - rz, d = Math.hypot(dx, dz);
  if (d > r) return { kind: 'miss', d, r };
  const theta = (dx / r) * 34 + (rand() - .5) * 16, phi = -6 + (dz / r) * 10 + rand() * 4, EV = 150 + rand() * 50;
  const t = theta * Math.PI / 180, p = phi * Math.PI / 180;
  return { kind: 'contact', bunt: true, theta, phi, EV, Q: .2, spin: 0, grade: 'BUNT', ms: 0, v: [EV * Math.cos(p) * Math.sin(t), -EV * Math.cos(p) * Math.cos(t), EV * Math.sin(p)], feedback: 'BUNT!' };
};

/* ===== src/13-ball.js ===== */
/* =============================================================================
 * 13-ball: batted and thrown ball physics at 120 Hz: gravity, drag, sidespin,
 * wind, bounces and rolls by surface, the fence (home run, ground-rule double,
 * off the wall), the foul poles, foul walls and backstop, fair and foul, and the
 * forward prediction the fielders, the landing marker and the cameras use.
 * Ball positions are world coordinates; the park turns them into offsets.
 * ========================================================================== */
BZ.newBall = () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mode: 'none', holder: null, bounced: 0, touched: false, fair: 'pending', spin: 0, boost: 0, version: 0, rolling: false, t: 0, trail: [], invisible: false, thrown: null, noAir: false, dead: false });
BZ.surfaceAt = (park, x, y) => {
  const dx = x - park.H.x, dy = y - park.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
  if (park.def.beyond === 'regolith' && r > 470) return 'regolith';
  if (r < 46) return 'dirt';
  if (dy < 0 && Math.abs(th) <= park.span && r > park.R(th) - 46) return 'track';
  if (r < 470 && dy < 0 && Math.abs(th) < .873) { const p = (dx - dy) * Math.SQRT1_2, q = (-dy - dx) * Math.SQRT1_2; if (!(p > 24 && p < 276 && q > 24 && q < 276)) return 'dirt'; }
  return 'grass';
};
const BOUNCE = { grass: .42, dirt: .5, track: .45, regolith: .55 }, SLIDE = { grass: .82, dirt: .9, track: .86, regolith: .88 }, ROLL = { grass: 185, dirt: 150, track: 170, regolith: 120 };
BZ.gravity = (park) => 520 * (park ? park.gravityMul : 1) * TUNE.gravity;
BZ.displayZ = (z) => z < 40 ? z : 40 + (z - 40) * TUNE.heightSquash;

/**
 * one physics step for a ball in flight or rolling (modes 'batted', 'thrown', 'loose'). Returns a list of events:
 * 'land' (the first touch of the ground), 'bounce', 'fence', 'hr', 'pole', 'grd', 'dead' (out of play), 'stop'
 */
BZ.ballStep = (b, park, dt, o = {}) => {
  const ev = [], H = park.H;
  const g = BZ.gravity(park);
  if (b.z > 0 || b.vz > 0) {
    b.vz -= g * dt;
    if (!b.noAir) {
      const dr = TUNE.drag * dt; b.vx -= b.vx * dr; b.vy -= b.vy * dr; b.vz -= b.vz * dr;
      const hs = Math.hypot(b.vx, b.vy);
      if (b.spin && hs > 1) { b.vx += -b.vy / hs * b.spin * dt; b.vy += b.vx / hs * b.spin * dt; }
      const wk = clamp((b.z - 60) / 100, 0, 1) * TUNE.wind;
      if (wk > 0 && park.wind) { b.vx += park.wind.x * wk * dt; b.vy += park.wind.y * wk * dt; }
      if (b.boost > 0) { const s = Math.hypot(b.vx, b.vy, b.vz) || 1; b.vx += b.vx / s * 900 * dt; b.vy += b.vy / s * 900 * dt; b.vz += b.vz / s * 900 * dt; b.boost -= dt; }
    }
  }
  const px0 = b.x, py0 = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  // the ground
  if (b.z <= 0) {
    b.z = 0;
    const surf = BZ.surfaceAt(park, b.x, b.y);
    if (b.vz < -25) {
      if (!b.bounced) ev.push('land');
      b.bounced++; ev.push('bounce');
      b.vz = -b.vz * (BOUNCE[surf] || .45) * TUNE.bounce * (park.bounceMul || 1);
      b.vx *= SLIDE[surf] || .85; b.vy *= SLIDE[surf] || .85;
      b.rolling = false;
    } else {
      if (!b.bounced) { ev.push('land'); b.bounced++; }
      b.vz = 0; b.rolling = true;
      const s = Math.hypot(b.vx, b.vy), dec = (ROLL[surf] || 220) * TUNE.rollFriction * dt;
      if (s <= dec) { if (s > 0) ev.push('stop'); b.vx = 0; b.vy = 0; }
      else { b.vx -= b.vx / s * dec; b.vy -= b.vy / s * dec; }
    }
  }
  // walls: the fence, foul walls, the backstop, the poles
  const dx = b.x - H.x, dy = b.y - H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy), span = park.span;
  if (dy < 0 && Math.abs(th) <= span) {
    const R = park.R(th), Hf = park.Hf(th);
    if (r > R - BZ.GEO.ballR) {
      const fairAngle = Math.abs(th) <= Math.PI / 4 + .002;
      if (b.z >= Hf) {
        if (b.mode === 'batted' && fairAngle && b.fair !== 'foul' && !b.touched) { ev.push(b.bounced ? 'grd' : 'hr'); }
        else ev.push('dead');
      } else {
        // off the wall: the radial part reverses (x .35), the tangential part (x .8)
        const nx = dx / r, ny = dy / r, vr = b.vx * nx + b.vy * ny;
        if (vr > 0) { const tx = b.vx - vr * nx, ty = b.vy - vr * ny; b.vx = tx * .8 - vr * nx * .35; b.vy = ty * .8 - vr * ny * .35; b.vz *= .6; ev.push('fence'); }
        const k = (R - BZ.GEO.ballR - .5) / r; b.x = H.x + dx * k; b.y = H.y + dy * k;
      }
    }
  }
  // poles at +-45 degrees, 150 tall
  for (const s of [-1, 1]) {
    const R = park.R(s * Math.PI / 4), pxp = H.x + Math.sin(s * Math.PI / 4) * (R + 2), pyp = H.y - Math.cos(s * Math.PI / 4) * (R + 2);
    if (b.mode === 'batted' && !b.bounced && b.z < 150 && Math.hypot(b.x - pxp, b.y - pyp) < 3 + BZ.GEO.ballR) ev.push('pole');
  }
  const oL = BZ.outL(dx, dy), oR = BZ.outR(dx, dy), W = BZ.GEO.foulWall - BZ.GEO.ballR;
  if (oL > W || oR > W) {
    if (b.z >= 16) ev.push('dead');
    else {
      const nx = oL > W ? -Math.SQRT1_2 : Math.SQRT1_2, ny = Math.SQRT1_2, vn = b.vx * nx + b.vy * ny;
      if (vn > 0) { b.vx -= vn * nx * 1.4; b.vy -= vn * ny * 1.4; ev.push('wall'); }
      b.x = px0; b.y = py0;
    }
  }
  if (oL > 0 && oR > 0 && r > BZ.GEO.backstop - BZ.GEO.ballR) {
    if (b.z >= 50) ev.push('dead');
    else { const nx = dx / r, ny = dy / r, vr = b.vx * nx + b.vy * ny; if (vr > 0) { b.vx -= vr * nx * 1.4; b.vy -= vr * ny * 1.4; ev.push('wall'); } b.x = px0; b.y = py0; }
  }
  if (o.trail && BZ.cosmetic) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 18) b.trail.shift(); }
  return ev;
};
/** fair or foul, by where the ball is (a ground point) */
BZ.isFairPoint = (park, x, y) => BZ.fair(x - park.H.x, y - park.H.y);
/** past the bags? (first and third are about 300 U from home) */
BZ.pastBags = (park, x, y) => Math.hypot(x - park.H.x, y - park.H.y) > 300 || (y - park.H.y) < -300;

/**
 * forward prediction with the same integrator and no randomness: samples every 1/30 s for up to secs, the first
 * landing, home runs and the ball's stop. { samples: [{ t, x, y, z, vz }], land: { t, x, y }, hr, stop: { t, x, y }, outOfPlay }
 */
BZ.predict = (ball, park, secs = 7) => {
  const b = Object.assign({}, ball, { trail: [] }), dt = 1 / 120, out = { samples: [], land: null, hr: false, grd: false, stop: null, dead: false, apex: b.z, clear: 0 };
  let t = 0;
  for (let i = 0; i < secs * 120; i++) {
    const ev = BZ.ballStep(b, park, dt);
    t += dt;
    if (b.z > out.apex) out.apex = b.z;
    if (i % 4 === 3) out.samples.push({ t, x: b.x, y: b.y, z: b.z, vz: b.vz, rolling: b.rolling });
    if (ev.includes('land') && !out.land) out.land = { t, x: b.x, y: b.y };
    if (ev.includes('hr') || ev.includes('pole')) { out.hr = true; out.hrT = t; out.hrAt = { x: b.x, y: b.y, z: b.z }; break; }
    if (ev.includes('grd')) { out.grd = true; break; }
    if (ev.includes('dead')) { out.dead = true; out.deadT = t; break; }
    if (b.rolling && Math.hypot(b.vx, b.vy) < 1) { out.stop = { t, x: b.x, y: b.y }; break; }
  }
  if (!out.stop) out.stop = { t, x: b.x, y: b.y };
  out.end = { x: b.x, y: b.y, z: b.z };
  return out;
};
/** how far past the fence a home run would carry (for the Moonshot Cam): the flight continued to the ground with no walls */
BZ.carry = (ball, park) => {
  const b = Object.assign({}, ball), dt = 1 / 120, g = BZ.gravity(park);
  for (let i = 0; i < 1200; i++) {
    b.vz -= g * dt; const dr = TUNE.drag * dt; b.vx -= b.vx * dr; b.vy -= b.vy * dr; b.vz -= b.vz * dr;
    if (b.boost > 0) { const s = Math.hypot(b.vx, b.vy, b.vz) || 1; b.vx += b.vx / s * 900 * dt; b.vy += b.vy / s * 900 * dt; b.vz += b.vz / s * 900 * dt; b.boost -= dt; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.z <= 0) break;
  }
  return { x: b.x, y: b.y, dist: Math.hypot(b.x - park.H.x, b.y - park.H.y) };
};
/** set a ball on a throw from a point to a point: E.arc with the throw's flight time */
BZ.throwBall = (b, park, from, to, speed) => {
  const d = Math.hypot(to.x - from.x, to.y - from.y), time = Math.max(.12, d / speed);
  const a = E.arc({ x: from.x, y: from.y, z: from.z }, { x: to.x, y: to.y, z: to.z }, BZ.gravity(park), { time });
  Object.assign(b, { x: from.x, y: from.y, z: from.z, vx: a.vx, vy: a.vy, vz: a.vz, mode: 'thrown', holder: null, noAir: true, rolling: false, spin: 0, boost: 0 });
  b.version++; b.thrownT = time;
  return time;
};

/* ===== src/14-play.js ===== */
/* =============================================================================
 * 14-play: the live ball. Fielders (assignment at contact by earliest intercept,
 * cover roles, chase, catch, dive, jump, wall climb, throws, cutoffs, forces,
 * tags, rundowns) and baserunners (forces, tag-ups, halfway on flies, the time
 * race, orders, steals, slides, the bowl-over), outs, runs and the third-out
 * rule, and when a play is over. Pure simulation: no drawing here.
 * ========================================================================== */
const FSPD = 116, RSPD = 152, THROW = 500;
BZ.makeFielder = (M, pl, pos) => {
  const p = M.park, d = BZ.FIELD_POS[pos], deep = (pos === 'LF' || pos === 'CF' || pos === 'RF') ? (p.depth || 0) : 0;
  const hx = p.H.x + d[0] * (1 + deep / 900), hy = p.H.y + d[1] - deep * (pos === 'CF' ? 1 : .8);
  return { pos, player: pl, x: hx, y: hy, z: 0, vx: 0, vy: 0, vz: 0, facing: Math.PI / 2, home: { x: hx, y: hy }, state: 'set', tx: hx, ty: hy, role: 'idle', has: false, react: 0, stT: 0, tried: -1, human: null, turbo: false, throwT: 0, climbH: 0, dives: 0 };
};
BZ.fielderSpeed = (M, f) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .04 * (M.upgrades.cleats || 0) : 1;
  return FSPD * BZ.factor(f.player.spd) * TUNE.fielderSpeed * (f.turbo ? 1.35 * TUNE.turboPower + (1 - TUNE.turboPower) : 1) * up * (f.human ? 1 : 1);
};
BZ.throwSpeed = (M, f, power = .8) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .05 * (M.upgrades.arms || 0) : 1;
  return THROW * BZ.factor(f.player.arm) * (.85 + .35 * power) * TUNE.throwSpeed * up;
};
/** a throw's speed over a distance: long throws arc and lose pace (a Laser Arm never does) */
BZ.throwPace = (M, f, d, power = .8, laser = false) => laser ? 1400 : BZ.throwSpeed(M, f, power) * (d > 400 ? Math.pow(400 / d, .25) : 1);
BZ.catchReach = (M, f) => {
  const T = M.teamOf(f.player), up = M.upgrades && M.upgradeTeam === T.side ? (M.upgrades.gloves || 0) : 0;
  return 9 * BZ.factor(f.player.glv) * TUNE.catchRadius + up;
};
BZ.runSpeed = (M, r) => {
  const T = BZ.offense(M), up = M.upgrades && M.upgradeTeam === T.side ? 1 + .04 * (M.upgrades.cleats || 0) : 1;
  return RSPD * BZ.factor(r.player.spd) * TUNE.runSpeed * (r.turbo ? 1 + .25 * TUNE.turboPower : 1) * (T.afterburn > 0 ? 1.8 : 1) * up * (r.slideBoost ? 1.1 : 1);
};
/** a runner's world position from his progress p along the basepaths (0 home, 1 first, ... 4 home) */
BZ.runnerPos = (M, p) => {
  const P = M.park, i = clamp(Math.floor(p), 0, 3), f = clamp(p - i, 0, 1), a = P.base(i), b = P.base(i + 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
};

BZ.play = {
  /** start a live play from the bases (kind: 'batted' | 'steal' | 'wild' | 'pickoff') */
  begin(M, kind, o = {}) {
    const P = M.park;
    M.play = { kind, t: 0, runs: [], outs: [], caughtFly: false, error: false, settleT: 0, done: false, deadReason: null, version: -1, pred: null, chaser: null, touchedBy: null, hit: o.hit || null, batterOut: false, hrPending: false, lastMove: 0, contact: o.contact || null, startOuts: M.outs, bowl: false };
    M.runners = [];
    for (let i = 2; i >= 0; i--) if (M.bases[i]) {
      const lead = (M.leads && M.leads[i + 1]) || 0, rn = { player: M.bases[i], p: i + 1 + lead, base: i + 1, start: i + 1, goal: i + 1, state: 'base', forced: false, mustTag: 0, isBatter: false, turbo: false, slide: 0, orderT: 0, steal: !!(M.steals && M.steals[i + 1]) };
      M.runners.push(rn);
    }
    if (kind === 'batted') {
      M.runners.push({ player: M.batter, p: 0, base: 0, start: 0, goal: 1, state: 'run', forced: true, mustTag: 0, isBatter: true, turbo: false, slide: 0, delay: .35, orderT: 0 });
      this.computeForces(M);
    }
    for (const f of M.fielders) { f.react = this.reaction(M, f); f.tried = -1; f.state = f.state === 'set' ? 'set' : f.state; f.climbH = 0; f.z = 0; f.vz = 0; }
    M.ball.version++;
  },
  reaction(M, f) {
    if (f.human || M.cheatFreeze) return 0;
    const lv = M.teams[BZ.defense(M).side].humans.length ? 'pro' : (M.cpuLevel || M.difficulty || 'pro');
    const base = { rookie: .34, pro: .25, allstar: .19, batzooka: .14 }[lv] || .25, of = ['LF', 'CF', 'RF'].includes(f.pos) ? .18 : 0;
    return (base + of) / Math.max(.3, TUNE.cpuField);
  },
  /** forced runners: a chain from the batter */
  computeForces(M) {
    const occ = b => M.runners.find(r => r.state !== 'out' && r.state !== 'scored' && r.start === b);
    // the batter-runner forces first; a runner on b is forced when every base below him is taken
    let f = true;
    for (let b = 1; b <= 3; b++) { const r = occ(b); if (!r) f = false; else r.forced = f; }
    const batter = M.runners.find(r => r.isBatter); if (batter) batter.forced = true;
    if (!batter) for (const r of M.runners) r.forced = false;
  },
  liveRunners(M) { return M.runners.filter(r => r.state !== 'out' && r.state !== 'scored'); },

  /* ---------------- the ball and the fielders ---------------- */
  replan(M) {
    const b = M.ball, P = M.park;
    if (b.mode === 'held' || b.mode === 'dead' || b.mode === 'none') { M.play.pred = null; return; }
    M.play.pred = BZ.predict(b, P, 7); M.play.version = b.version;
    this.assign(M);
  },
  /** who chases (the earliest intercept) and who covers what */
  assign(M) {
    const pred = M.play.pred, P = M.park, b = M.ball, D = M.fielders; if (!pred) return;
    const thrown = b.mode === 'thrown';
    let best = null, bestT = 1e9, bestPt = null;
    for (const f of D) {
      if (f.state === 'down') continue;
      const sp = BZ.fielderSpeed(M, f) * 1.0, rx = f.react;
      let got = null;
      for (const s of pred.samples) {
        if (s.z > (f.pos === 'C' ? 30 : 34) && !(s.vz < 0 && s.z < 80 && P.jumpMul > 1.5)) continue;
        if (!BZ.inField(P, s.x - P.H.x, s.y - P.H.y) && P.beyond(s.x, s.y) > 0) continue;
        const d = Math.max(0, Math.hypot(s.x - f.x, s.y - f.y) - BZ.catchReach(M, f) * .8);
        if (rx + d / sp <= s.t) { got = s; break; }
      }
      const tt = got ? got.t : (pred.stop.t + Math.hypot(pred.stop.x - f.x, pred.stop.y - f.y) / sp);
      const pt = got || pred.stop;
      if (thrown) continue;
      if (tt < bestT) { bestT = tt; best = f; bestPt = pt; }
    }
    if (thrown) return;   // a throw keeps the receivers as they are
    // a ball heading over the fence: the outfielder nearest the wall point climbs for it
    M.play.robPoint = null;
    if (pred.hr && pred.hrAt) {
      const hz = pred.hrAt.z, th = BZ.theta(pred.hrAt.x - P.H.x, pred.hrAt.y - P.H.y), Hf = P.Hf(th);
      if (hz < Hf + 26 + (M.offenseHaunt ? 0 : 0) + (BZ.defense(M).id === 'haunts' ? 40 : 0)) {
        let nf = null, nd = 1e9; for (const f of D) { if (!['LF', 'CF', 'RF'].includes(f.pos)) continue; const d = Math.hypot(f.x - pred.hrAt.x, f.y - pred.hrAt.y); if (d < nd) { nd = d; nf = f; } }
        if (nf && nd / BZ.fielderSpeed(M, nf) + nf.react < pred.hrT + .1) { best = nf; bestPt = { x: pred.hrAt.x, y: pred.hrAt.y, t: pred.hrT }; M.play.robPoint = { x: pred.hrAt.x, y: pred.hrAt.y, z: hz, t: pred.hrT, f: nf }; }
      }
    }
    M.play.chaser = best;
    if (best && bestPt) { best.role = 'chase'; best.tx = bestPt.x; best.ty = bestPt.y; best.catchAt = bestPt; }
    // cover roles
    const to = pred.land || pred.stop, side = (to.x - P.H.x) < 0 ? 'left' : 'right', deep = Math.hypot(to.x - P.H.x, to.y - P.H.y) > 520;
    const get = pos => D.find(f => f.pos === pos);
    const cover = (pos, base) => { const f = get(pos); if (!f || f === best || f.has) return false; const bp = P.base(base); f.role = 'cover'; f.coverBase = base; f.tx = bp.x + (base === 1 ? -6 : base === 3 ? 6 : 0); f.ty = bp.y + (base === 2 ? 6 : 0); return true; };
    for (const f of D) if (f !== best && !f.has) { f.role = 'idle'; f.coverBase = 0; f.tx = f.home.x; f.ty = f.home.y; }
    if (!cover('1B', 1)) cover('P', 1);
    if (side === 'left') { if (!cover('2B', 2)) cover('SS', 2); } else { if (!cover('SS', 2)) cover('2B', 2); }
    if (!cover('3B', 3)) cover('SS', 3);
    if (!cover('C', 4)) cover('P', 4);
    if (deep) {   // the cutoff man goes out halfway to the ball
      const cf = get(side === 'left' ? 'SS' : '2B');
      if (cf && cf !== best && cf.role !== 'cover') { cf.role = 'cutoff'; cf.tx = P.H.x + (to.x - P.H.x) * .55; cf.ty = P.H.y + (to.y - P.H.y) * .55; }
      else if (cf && cf.role === 'cover' && cf.coverBase === 2) { const o2 = get(side === 'left' ? '2B' : 'SS'); if (o2 && o2 !== best && o2.role !== 'chase') { o2.role = 'cutoff'; o2.tx = P.H.x + (to.x - P.H.x) * .55; o2.ty = P.H.y + (to.y - P.H.y) * .55; } }
      const p = get('P'); if (p && p !== best && p.role === 'idle') { p.role = 'backup'; p.tx = P.H.x + (side === 'left' ? -60 : 0); p.ty = P.H.y + (side === 'left' ? -150 : 30); }
    }
    // the nearest outfielder backs up the chaser
    if (best && ['LF', 'CF', 'RF'].includes(best.pos)) { const nb = D.filter(f => ['LF', 'CF', 'RF'].includes(f.pos) && f !== best).sort((a, b2) => Math.hypot(a.x - best.tx, a.y - best.ty) - Math.hypot(b2.x - best.tx, b2.y - best.ty))[0]; if (nb) { nb.role = 'backup'; nb.tx = best.tx + (best.tx - P.H.x) * .08 + (nb.x - best.tx) * .3; nb.ty = best.ty + (best.ty - P.H.y) * .08; } }
  },
  /** the fielder's base cover point */
  basePt(M, b) { const p = M.park.base(b); return { x: p.x, y: p.y }; },
  holder(M) { return M.fielders.find(f => f.has) || null; },
  /** give the ball to a fielder */
  give(M, f, how) {
    const b = M.ball;
    for (const o of M.fielders) o.has = false;
    f.has = true; b.mode = 'held'; b.holder = f; b.vx = b.vy = b.vz = 0; b.spin = 0; b.boost = 0; b.version++;
    f.state = f.state === 'dive' ? 'prone' : f.state === 'climb' || f.state === 'jump' ? f.state : 'hold';
    f.holdT = 0; f.decideT = f.human ? 0 : (how === 'ground' && ['LF', 'CF', 'RF'].includes(f.pos) ? .38 : how === 'ground' ? .07 : .2); f.throwT = 0; f.throwTo = 0;
    M.play.pred = null;
    BZ.bus.emit('fielded', { pos: f.pos, how });
  },
  /** a catch attempt (once per ball version per fielder) */
  tryCatch(M, f) {
    const b = M.ball, P = M.park;
    if (f.has || f.state === 'down' || f.state === 'prone' && !f.has) return false;
    const reach = BZ.catchReach(M, f) + (f.state === 'dive' ? 9 : 0), d = Math.hypot(b.x - f.x, b.y - f.y);
    let top = f.state === 'dive' ? 14 : 34 + f.z;
    if (f.state === 'climb') top = f.z + 34;
    if (f.pos === 'C' && b.mode !== 'batted') top = 40;
    if (d > reach || b.z > top || b.z < f.z - 6) return false;
    if (f.tried === b.version) return false;
    f.tried = b.version;
    const speed = Math.hypot(b.vx, b.vy, b.vz), human = !!f.human;
    let p = .992 + .004 * (f.player.glv - 5) - (speed > 600 ? clamp((speed - 600) / 600 * .06 + .03, .03, .08) : 0) - (f.state === 'dive' ? .04 : 0);
    if (!human) p -= ({ rookie: .02, pro: .008, allstar: .004, batzooka: .002 }[M.cpuLevel || 'pro'] || .008) / Math.max(.3, TUNE.cpuField);
    if (b.mode === 'thrown') p = .995;
    if (M.cheats && M.cheats.surehands && (human || M.attract)) p = 1;
    const T = M.teamOf(f.player); if (M.upgrades && M.upgradeTeam === T.side) p += .02 * (M.upgrades.gloves || 0);
    p = clamp(p, .5, .995);
    const wasFly = b.mode === 'batted' && !b.bounced, wall = f.state === 'climb', dive = f.state === 'dive';
    if (BZ.R() < p) {
      // fair or foul when a fielder first touches a pending ball
      if (b.mode === 'batted' && b.fair === 'pending' && !wasFly) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.mode === 'batted' && !wasFly && b.fair === 'foul') { this.foulBall(M, 'touched'); return true; }
      b.touched = true;
      this.give(M, f, wasFly ? 'fly' : 'ground');
      if (wasFly) {
        M.play.caughtFly = true;
        BZ.statFor(M, f.player).catches++;
        if (dive) BZ.statFor(M, f.player).dives++;
        if (wall) BZ.statFor(M, f.player).robbed++;
        BZ.bus.emit('catch', { fly: true, dive, wall, pos: f.pos, player: f.player, robbed: wall && M.play.robPoint });
        this.flyOut(M, f);
      } else if (dive) BZ.bus.emit('catch', { fly: false, dive: true, pos: f.pos, player: f.player });
      else if (b.mode !== 'thrown') BZ.bus.emit('catch', { fly: false, pos: f.pos });
      return true;
    }
    // an error: the ball pops loose
    const a = BZ.R() * TAU;
    b.vx = Math.cos(a) * 60; b.vy = Math.sin(a) * 60; b.vz = 80; b.z = Math.max(b.z, 4); b.touched = true;
    if (b.mode === 'batted' && b.fair === 'pending') b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
    b.mode = 'loose'; b.version++; b.bounced = Math.max(1, b.bounced);
    M.play.error = true; BZ.defense(M).errors++;
    BZ.bus.emit('drop', { pos: f.pos, player: f.player });
    BZ.bus.emit('error', { pos: f.pos });
    return false;
  },
  flyOut(M, f) {
    const bat = M.runners.find(r => r.isBatter);
    if (bat) { bat.state = 'out'; M.play.batterOut = true; }
    BZ.statFor(M, M.batter).AB++;
    BZ.rules.out(M, 'fly', M.batter);
    // runners must go back and touch before advancing; no one is forced any more
    for (const r of this.liveRunners(M)) { r.forced = false; if (r.p > r.start + .001) { r.mustTag = r.start; r.goal = r.start; } }
    if (M.outs >= 3) this.thirdOut(M, 'fly', bat);
  },
  foulBall(M, why) {
    M.play.done = true; M.play.deadReason = 'foul'; M.ball.mode = 'dead'; M.ball.fair = 'foul';
    M.play.foul = why || true;
  },
  thirdOut(M, how, runner) {
    // the third-out rule: no runs on a force out, or when the batter-runner is out before reaching first
    const batterBefore = runner && runner.isBatter && runner.base < 1;
    if (how === 'force' || how === 'fly' || batterBefore) { if (M.play.runs.length) { BZ.rules.unscore(M, M.play.runs.length); for (const r of M.runners) if (r.state === 'scored') r.state = 'cancel'; M.play.runs = []; } }
    M.play.done = true; M.play.deadReason = 'third';
  },
  /** a runner is out */
  runnerOut(M, r, how, f) {
    r.state = 'out';
    if (r.isBatter && r.base < 1) { BZ.statFor(M, M.batter).AB++; M.play.batterOut = true; }
    BZ.rules.out(M, how, r.player);
    BZ.bus.emit('runnerOut', { how, runner: r.player, pos: f && f.pos, base: Math.round(r.goal) });
    if (M.play.outs.length >= 2 && !M.play.dpSaid) { M.play.dpSaid = true; BZ.bus.emit('doublePlay', { triple: M.play.outs.length >= 3 }); }
    // a force out of a trailing runner takes the force off the runners ahead? (no: forces hold while the batter-runner is alive)
    if (r.isBatter) for (const o of this.liveRunners(M)) o.forced = false;
    if (M.outs >= 3) this.thirdOut(M, how, r);
  },

  /* ---------------- the step ---------------- */
  update(M, dt) {
    const pl = M.play, b = M.ball, P = M.park;
    if (!pl || pl.done) return;
    pl.t += dt;
    if (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose') {
      if (pl.version !== b.version) this.replan(M);
      const carried = BZ.hazard && BZ.hazard.preBall && BZ.hazard.preBall(M, b, dt);   // a gull carrying the ball, say
      const ev = carried ? [] : BZ.ballStep(b, P, dt, { trail: true });
      if (BZ.hazard && BZ.hazard.onBall) BZ.hazard.onBall(M, b, dt, ev);
      this.ballEvents(M, ev);
      if (pl.done) return;
    }
    this.fielders(M, dt);
    if (pl.done) return;
    BZ.runners.update(M, dt);
    if (pl.done) return;
    this.checkOuts(M);
    if (pl.done) return;
    this.checkOver(M, dt);
  },
  ballEvents(M, ev) {
    const b = M.ball, P = M.park, pl = M.play;
    if (!ev.length) return;
    if (ev.includes('pole') || ev.includes('hr')) { if (b.mode === 'batted' && !b.touched && b.fair !== 'foul') { this.homeRun(M, ev.includes('pole')); return; } }
    if (ev.includes('grd') && b.mode === 'batted' && b.fair !== 'foul') { this.groundRule(M); return; }
    if (ev.includes('dead')) {
      if (b.mode === 'batted' && (b.fair === 'pending' || b.fair === 'foul')) { this.foulBall(M, 'out of play'); return; }
      // a fair ball or a throw out of play: two bases from where the runners started (simplified: the ball is dead)
      pl.done = true; pl.deadReason = 'outOfPlay'; b.mode = 'dead';
      for (const r of this.liveRunners(M)) { r.goal = Math.min(4, Math.max(Math.ceil(r.p - .001), r.start + (r.isBatter ? 2 : 1))); r.p = r.goal; r.base = r.goal; if (r.goal >= 4) this.scoreRunner(M, r); else r.state = 'base'; }
      BZ.bus.emit('deadBall', {});
      return;
    }
    if (b.mode === 'thrown' && (ev.includes('land') || ev.includes('bounce') || ev.includes('stop') || ev.includes('wall') || ev.includes('fence'))) { b.mode = 'loose'; b.version++; b.fair = 'fair'; }
    if (ev.includes('land') && b.mode === 'batted') {
      if (b.fair === 'pending' && BZ.pastBags(P, b.x, b.y)) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.fair === 'foul' && !b.touched) { this.foulBall(M, 'landed foul'); return; }
      BZ.bus.emit('land', { x: b.x, y: b.y, fair: b.fair });
      // a fly that drops: forced runners must go now
      for (const r of this.liveRunners(M)) r.landSeen = true;
    }
    if (ev.includes('fence')) { BZ.bus.emit('fenceHit', { x: b.x, y: b.y }); if (b.fair === 'pending') b.fair = 'fair'; }
    if (ev.includes('wall') && b.mode === 'batted' && b.fair === 'pending') { this.foulBall(M, 'wall'); return; }
    if (b.mode === 'batted' && b.fair === 'pending' && b.bounced) {
      if (BZ.pastBags(P, b.x, b.y)) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      else if (ev.includes('stop')) b.fair = BZ.isFairPoint(P, b.x, b.y) ? 'fair' : 'foul';
      if (b.fair === 'foul') { this.foulBall(M, 'rolled foul'); return; }
    }
    if (ev.includes('bounce') || ev.includes('fence') || ev.includes('wall')) b.version++;
    if (ev.includes('stop')) b.version++;
  },
  homeRun(M, pole) {
    const b = M.ball, P = M.park, pl = M.play;
    const dist = BZ.carry(b, P).dist;
    pl.done = true; pl.deadReason = 'hr'; pl.hr = { dist: BZ.feet(dist), pole, batzooka: !!(pl.contact && pl.contact.zooka), x: b.x, y: b.y, z: b.z };
    b.mode = 'dead';
    // everyone scores
    const rbiTo = M.batter, list = this.liveRunners(M).sort((a, c) => c.p - a.p);
    for (const r of list) { r.goal = 4; r.trot = true; this.scoreRunner(M, r, rbiTo); }
    const s = BZ.statFor(M, M.batter); s.AB++; s.H++; s.HR++; s.longest = Math.max(s.longest, BZ.feet(dist));
    BZ.offense(M).hits++;
    BZ.bus.emit('homer', { batter: M.batter, dist: BZ.feet(dist), pole, batzooka: pl.hr.batzooka, x: b.x, y: b.y, runs: list.length });
  },
  groundRule(M) {
    const pl = M.play; pl.done = true; pl.deadReason = 'grd'; M.ball.mode = 'dead';
    for (const r of this.liveRunners(M)) { const to = Math.min(4, r.start + 2); r.goal = to; r.p = to; r.base = to; if (to >= 4) this.scoreRunner(M, r, M.batter); else r.state = 'base'; }
    const s = BZ.statFor(M, M.batter); s.AB++; s.H++; s['2B']++; BZ.offense(M).hits++;
    pl.hitCredited = 2;
    BZ.bus.emit('groundRuleDouble', { batter: M.batter });
  },
  scoreRunner(M, r, rbiTo) {
    if (r.state === 'scored') return;
    r.state = 'scored'; r.p = 4;
    BZ.rules.score(M, r.player, rbiTo === undefined ? (M.play.error ? null : M.batter) : rbiTo);
  },

  /* ---------------- fielders ---------------- */
  fielders(M, dt) {
    const b = M.ball, P = M.park, pl = M.play;
    for (const f of M.fielders) {
      f.stT += dt;
      if (M.cheats.freezeAI && !f.human) { f.vx = f.vy = 0; if (!f.has && (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose')) this.tryCatch(M, f); if (pl.done) return; continue; }
      if (f.react > 0) { f.react -= dt; f.vx = f.vy = 0; continue; }
      // vertical: jumps and climbs
      if (f.state === 'jump') { f.vz -= 700 * dt; f.z += f.vz * dt; if (f.z <= 0) { f.z = 0; f.vz = 0; f.state = f.has ? 'hold' : 'run'; } }
      if (f.state === 'climb') { if (f.stT < .45) f.z = Math.min(f.climbH, f.z + 140 * dt); else { f.z = Math.max(0, f.z - 120 * dt); if (f.z <= 0) f.state = f.has ? 'hold' : 'run'; } }
      if (f.state === 'dive') { const sp = 22 / .35; f.x += Math.cos(f.facing) * sp * dt; f.y += Math.sin(f.facing) * sp * dt; if (f.stT > .35) { f.state = 'prone'; f.stT = 0; } }
      if (f.state === 'prone') { if (f.stT > .6) { f.state = f.has ? 'hold' : 'run'; f.stT = 0; } }
      if (f.state === 'down') { if (f.stT > 1.2) { f.state = 'run'; } continue; }
      // catching
      if (!f.has && (b.mode === 'batted' || b.mode === 'thrown' || b.mode === 'loose')) {
        if (this.tryCatch(M, f) && pl.done) return;
        if (pl.done) return;
      }
      if (f.state === 'dive' || f.state === 'prone' || f.state === 'climb') { this.clampToField(M, f); continue; }
      if (f.has) { this.holderStep(M, f, dt); this.clampToField(M, f); if (f.has) { b.x = f.x; b.y = f.y; b.z = 18 + f.z; } continue; }
      // moving: humans by the stick (and the assist), the CPU to its target
      let tx = f.tx, ty = f.ty;
      if (f.role === 'chase' && (b.mode === 'loose' || (b.mode === 'batted' && b.bounced))) {
        // a ball on the ground: coming this way, step into its path (its closest approach); going away, run it down
        const vs2 = b.vx * b.vx + b.vy * b.vy, rx = f.x - b.x, ry = f.y - b.y, ts = vs2 > 1 ? (rx * b.vx + ry * b.vy) / vs2 : 0;
        if (ts > .05) { tx = b.x + b.vx * ts; ty = b.y + b.vy * ts; }
        else { const lead = .2; tx = b.x + b.vx * lead; ty = b.y + b.vy * lead; }
      }
      if (f.role === 'chase' && pl.robPoint && pl.robPoint.f === f) { tx = pl.robPoint.x; ty = pl.robPoint.y; }
      if (f.human) { const done = BZ.ctl.fielderMove(M, f, dt, tx, ty); if (done) { this.clampToField(M, f); continue; } }
      if (f.role === 'cover' || f.role === 'chase' || f.role === 'cutoff' || f.role === 'backup' || f.role === 'idle') {
        f.turbo = !f.human && f.role === 'chase' && Math.hypot(tx - f.x, ty - f.y) > 120 && BZ.defense(M).turbo > 20;
        if (f.turbo) BZ.defense(M).turbo = Math.max(0, BZ.defense(M).turbo - 40 * TUNE.turboDrain * dt);
        const arrived = BZ.moveTo(f, tx, ty, BZ.fielderSpeed(M, f), dt);
        f.state = arrived ? 'set' : 'run';
        if (arrived && f.role === 'chase' && b.mode !== 'held') f.facing = Math.atan2(b.y - f.y, b.x - f.x);
      }
      // the CPU's athletic moves: the wall climb, the dive, the jump
      if (!f.human && f.role === 'chase') this.cpuMoves(M, f);
      this.clampToField(M, f);
    }
  },
  cpuMoves(M, f) {
    const b = M.ball, P = M.park, pl = M.play;
    if (b.mode !== 'batted' || f.state !== 'run' && f.state !== 'set') return;
    // the climb: near the wall, a ball coming down over it
    if (pl.robPoint && pl.robPoint.f === f && !f.climbed) {
      const d = Math.hypot(f.x - pl.robPoint.x, f.y - pl.robPoint.y), tleft = pl.robPoint.t - pl.t;
      if (d < 20 && tleft < .5) this.climb(M, f);
      return;
    }
    // the dive: only when the ball will pass by out of reach (its closest approach), but within a lunge
    const vs = Math.hypot(b.vx, b.vy), reach = BZ.catchReach(M, f);
    if (b.z < 18 && !f.dives && vs > 60) {
      const rx = b.x - f.x, ry = b.y - f.y, ts = -(rx * b.vx + ry * b.vy) / (vs * vs);
      if (ts > 0 && ts < .35) { const cx = rx + b.vx * ts, cy = ry + b.vy * ts, dmin = Math.hypot(cx, cy); if (dmin > reach * .95 && dmin < reach + 20) this.dive(M, f, Math.atan2(cy, cx)); }
    }
    // the jump: a line drive going over the glove (flat, not a fly coming down)
    if (b.z > 30 && b.z < 64 && !f.jumped && f.z === 0 && Math.abs(b.vz) < vs * .45) {
      const rx = b.x - f.x, ry = b.y - f.y, ts = -(rx * b.vx + ry * b.vy) / Math.max(1, vs * vs);
      if (ts > 0 && ts < .25 && Math.hypot(rx + b.vx * ts, ry + b.vy * ts) < reach && b.z + b.vz * ts > 34) this.jump(M, f);
    }
  },
  dive(M, f, dir) { if (f.state === 'dive' || f.state === 'prone') return; f.state = 'dive'; f.stT = 0; f.facing = dir; f.dives++; BZ.bus.emit('dive', { pos: f.pos }); },
  jump(M, f) { if (f.z > 0) return; f.state = 'jump'; f.vz = 260 * M.park.jumpMul; f.jumped = true; BZ.bus.emit('jump', { pos: f.pos }); },
  climb(M, f) {
    const P = M.park, th = BZ.theta(f.x - P.H.x, f.y - P.H.y), Hf = P.Hf(th);
    f.state = 'climb'; f.stT = 0; f.climbed = true; f.climbH = Hf + (BZ.defense(M).id === 'haunts' ? 40 : 0) + (P.jumpMul > 1.5 ? 30 : 0);
    f.facing = Math.atan2(-(f.y - P.H.y), -(f.x - P.H.x)) + Math.PI;
    BZ.bus.emit('climb', { pos: f.pos });
  },
  clampToField(M, f) {
    const P = M.park, dx = f.x - P.H.x, dy = f.y - P.H.y, r = Math.hypot(dx, dy), th = BZ.theta(dx, dy);
    if (dy < 0 && Math.abs(th) <= P.span) { const R = P.R(th) - 5; if (r > R && !(M.cheats && M.cheats.noclip)) { f.x = P.H.x + dx / r * R; f.y = P.H.y + dy / r * R; } }
    const oL = BZ.outL(dx, dy), oR = BZ.outR(dx, dy);
    if (oL > 66) { f.x += Math.SQRT1_2 * (oL - 66); f.y -= Math.SQRT1_2 * (oL - 66); }
    if (oR > 66) { f.x -= Math.SQRT1_2 * (oR - 66); f.y -= Math.SQRT1_2 * (oR - 66); }
    const dx2 = f.x - P.H.x, dy2 = f.y - P.H.y, r2 = Math.hypot(dx2, dy2);
    if (BZ.outL(dx2, dy2) > 0 && BZ.outR(dx2, dy2) > 0 && r2 > 104) { f.x = P.H.x + dx2 / r2 * 104; f.y = P.H.y + dy2 / r2 * 104; }
  },
  /** the fielder with the ball: the CPU decides; a human throws with the base buttons */
  holderStep(M, f, dt) {
    const pl = M.play;
    f.holdT += dt;
    if (f.throwT > 0) {   // winding up a throw
      f.throwT -= dt;
      if (f.throwT <= 0) this.release(M, f);
      return;
    }
    if (f.human && !(BZ.game.settings.fielding === 'auto' && !f.humanOverride)) { BZ.ctl.holder(M, f, dt); return; }
    f.decideT -= dt; if (f.decideT > 0) return;
    f.decideT = .15;
    const act = BZ.ai.holderDecision(M, f);
    if (!act) return;
    if (act.kind === 'throw') this.startThrow(M, f, act.base, act.power || .8, act.laser, act.to);
    else if (act.kind === 'run') { f.runTo = act; BZ.moveTo(f, act.x, act.y, BZ.fielderSpeed(M, f), dt * 1.5); f.state = 'run'; }
    void pl;
  },
  /** start a throw to a base (1..4) or to a fielder (o.to) */
  startThrow(M, f, base, power = .8, laser = false, to = null) {
    if (f.throwT > 0 || !f.has) return;
    f.throwBase = base; f.throwPower = power; f.throwLaser = laser; f.throwTarget = to;
    f.throwT = M.fast ? .05 : ['LF', 'CF', 'RF'].includes(f.pos) ? .24 : .17; f.state = 'throw'; f.stT = 0;
    const tgt = to || this.basePt(M, base); f.facing = Math.atan2(tgt.y - f.y, tgt.x - f.x);
    if (laser) { const T = BZ.defense(M); T.meter = Math.max(0, T.meter - 50); BZ.bus.emit('super', { kind: 'laser', pos: f.pos }); }
  },
  release(M, f) {
    const b = M.ball, P = M.park, base = f.throwBase, power = f.throwPower;
    let to = f.throwTarget ? { x: f.throwTarget.x, y: f.throwTarget.y } : this.basePt(M, base);
    const rec = f.throwTarget || this.receiverFor(M, base, f);
    // a throw to a base goes to the bag: the receiver gets there (a throw to a fielder leads him)
    if (f.throwTarget && rec && (rec.vx || rec.vy)) { const tt = Math.hypot(to.x - f.x, to.y - f.y) / (f.throwLaser ? 1400 : BZ.throwSpeed(M, f, power)); to = { x: to.x + rec.vx * tt, y: to.y + rec.vy * tt }; }
    let wild = false;
    if (!f.throwLaser && power > .85) { const pw = (power - .85) * .8 + (f.player.arm < 5 ? .05 : 0); if (BZ.R() < pw) wild = true; }
    if (wild) { const a = BZ.R() * TAU, d = 30 + BZ.R() * 30; to = { x: to.x + Math.cos(a) * d, y: to.y + Math.sin(a) * d }; M.play.wildThrow = true; BZ.defense(M).errors++; BZ.bus.emit('throwError', { pos: f.pos }); M.play.error = true; }
    const sp = BZ.throwPace(M, f, Math.hypot(to.x - f.x, to.y - f.y), power, f.throwLaser);
    f.has = false; f.state = 'set'; f.stT = 0;
    BZ.throwBall(b, P, { x: f.x, y: f.y, z: 24 }, { x: to.x, y: to.y, z: 22 }, sp);
    b.thrownBy = f; b.throwBase = base; b.laser = !!f.throwLaser; f.tried = b.version;
    M.play.lastThrow = { base, from: f.pos, at: M.play.t, eta: M.play.t + Math.hypot(to.x - f.x, to.y - f.y) / sp };
    if (rec) { rec.role = 'cover'; rec.coverBase = base || 0; if (!f.throwTarget) { const bp = this.basePt(M, base); rec.tx = bp.x; rec.ty = bp.y; } }
    BZ.bus.emit('throw', { from: f.pos, base, laser: !!f.throwLaser, wild });
  },
  /** the fielder who takes a throw at a base: whoever covers it, else the nearest */
  receiverFor(M, base, not) {
    const bp = this.basePt(M, base);
    let best = M.fielders.find(f => f !== not && f.role === 'cover' && f.coverBase === base);
    if (!best) { let bd = 1e9; for (const f of M.fielders) { if (f === not) continue; const d = Math.hypot(f.x - bp.x, f.y - bp.y); if (d < bd) { bd = d; best = f; } } }
    return best;
  },

  /* ---------------- outs on the bases ---------------- */
  checkOuts(M) {
    const h = this.holder(M), P = M.park, pl = M.play;
    if (!h) return;
    for (const r of this.liveRunners(M)) {
      if (r.state === 'out' || r.state === 'scored' || r.delay > 0) continue;
      // a force: the fielder with the ball on the base before the forced runner gets there
      if (r.forced) {
        const fb = r.start + 1, bp = P.base(fb);
        if (r.p < fb - .001 && Math.hypot(h.x - bp.x, h.y - bp.y) < 8) { this.runnerOut(M, r, 'force', h); if (pl.done) return; continue; }
      }
      // doubled off: back to the base he must touch before the throw gets there
      if (r.mustTag && r.p > r.mustTag + .001) {
        const bp = P.base(r.mustTag);
        if (Math.hypot(h.x - bp.x, h.y - bp.y) < 8 && M.ball.mode === 'held') { this.runnerOut(M, r, 'doubled', h); if (pl.done) return; continue; }
      }
      // a tag: a runner off his base within reach of the ball
      const onBase = Math.abs(r.p - Math.round(r.p)) < .02 && !(r.isBatter && r.p < .5);
      const rp = BZ.runnerPos(M, r.p);
      if (!onBase && Math.hypot(h.x - rp.x, h.y - rp.y) < 10) {
        // the bowl-over at home: a runner on turbo against the catcher
        if (r.p > 3.85 && h.pos === 'C' && r.turbo && !r.bowled) {
          r.bowled = true; pl.bowl = true;
          const rr = r.player.pow + 1 + Math.floor(BZ.R() * 6), cr = h.player.pow + 1 + Math.floor(BZ.R() * 6) + 1;
          BZ.bus.emit('bowlOver', { runner: r.player, catcher: h.player, won: rr > cr });
          if (rr > cr) { h.state = 'down'; h.stT = 0; h.has = false; const b = M.ball; b.mode = 'loose'; b.x = h.x; b.y = h.y; b.z = 10; b.vx = (BZ.R() - .5) * 120; b.vy = 60 + BZ.R() * 40; b.vz = 90; b.version++; M.play.error = true; r.p = 4; this.scoreRunner(M, r); continue; }
          this.runnerOut(M, r, 'tag', h); if (pl.done) return; continue;
        }
        this.runnerOut(M, r, 'tag', h); h.tagT = .3; BZ.bus.emit('tag', { pos: h.pos }); if (pl.done) return;
      }
    }
  },
  /** is the play over? (the ball held in the infield with no runner moving for 0.6 s, or held long with nothing doing) */
  checkOver(M, dt) {
    const pl = M.play, b = M.ball, P = M.park;
    if (pl.done) return;
    const live = this.liveRunners(M);
    const moving = live.some(r => r.state === 'run' || Math.abs(r.p - Math.round(r.p)) > .02 || r.delay > 0);
    const h = this.holder(M);
    if (b.mode === 'held' && h && h.throwT <= 0) {
      const inf = Math.hypot(h.x - P.H.x, h.y - P.H.y) < 470;
      if (!moving) pl.settleT += dt; else pl.settleT = 0;
      if ((inf && pl.settleT >= .6) || pl.settleT >= 2.2) { this.finish(M); return; }
    } else pl.settleT = 0;
    if (pl.t > 25) {   // the safety net: everyone to the nearest base
      for (const r of live) { const nb = clamp(Math.round(r.p), r.isBatter ? 1 : r.base, 4); r.p = nb; r.base = nb; r.goal = nb; if (nb >= 4) this.scoreRunner(M, r); else r.state = 'base'; }
      this.finish(M, 'timeout');
    }
  },
  finish(M, why) { M.play.done = true; M.play.deadReason = M.play.deadReason || why || 'settled'; }
};

/* =============================================================================
 * baserunners
 * ========================================================================== */
BZ.runners = {
  update(M, dt) {
    const pl = M.play, P = M.park, O = BZ.offense(M);
    if (O.afterburn > 0) O.afterburn -= dt;
    const live = BZ.play.liveRunners(M).sort((a, b) => b.p - a.p);
    for (let i = 0; i < live.length; i++) {
      const r = live[i];
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.orderT = Math.max(0, r.orderT - dt);
      // decide (the CPU, or the auto baserunning for a human side; orders win for a moment)
      r.decideT = (r.decideT || 0) - dt;
      if (r.decideT <= 0 && r.orderT <= 0) { r.decideT = .1; BZ.ai.runnerDecide(M, r, live); }
      // never pass the runner ahead
      const ahead = live[i - 1];
      if (ahead && ahead.state !== 'scored') { const cap = ahead.goal - 1; if (r.goal > cap) r.goal = Math.max(r.isBatter ? 1 : r.start, cap); }
      if (r.forced) r.goal = Math.max(r.goal, r.start + 1);
      // move along the basepaths
      const dir = Math.sign(r.goal - r.p);
      r.runT = dir !== 0 ? (r.runT || 0) + dt : 0;                     // from a standstill a runner needs a moment to reach full speed
      const sp = BZ.runSpeed(M, r) / 300 * (dir > 0 ? Math.min(1, r.isBatter && r.p < 1 ? .4 + r.runT * .66 : .55 + r.runT) : .85);   // out of the box a batter needs most of a second to reach full speed
      if (dir !== 0) {
        r.state = 'run';
        r.turbo = (r.turboHeld || (!r.human && BZ.ai.runnerTurbo(M, r))) && O.turbo > 0;
        if (r.turbo) O.turbo = Math.max(0, O.turbo - 40 * TUNE.turboDrain * dt);
        const before = r.p;
        r.p += dir * sp * dt;
        if ((dir > 0 && r.p >= r.goal) || (dir < 0 && r.p <= r.goal)) r.p = r.goal;
        // touching a base
        const fb = Math.floor(before + 1e-6), fa = Math.floor(r.p + 1e-6);
        if (dir > 0 && fa > fb) this.touch(M, r, fa);
        if (dir < 0 && Math.ceil(r.p - 1e-6) < Math.ceil(before - 1e-6)) this.touch(M, r, Math.ceil(r.p - 1e-6));
        if (r.state === 'scored' || r.state === 'out') continue;
        if (r.tagged && M.play.caughtFly && dir > 0 && !r.tagSaid) { r.tagSaid = true; BZ.bus.emit('tagUp', { runner: r.player }); }
        // the slide: near a base on a close play
        const nb = dir > 0 ? Math.ceil(r.p - 1e-6) : Math.floor(r.p + 1e-6), dist = Math.abs(nb - r.p) * 300;
        if (!r.slide && dist < 28 && dist > 2 && Math.round(r.goal) === nb && BZ.play.holder(M) && nb < 4 + 1) { const h = BZ.play.holder(M), bp = P.base(nb); if (Math.hypot(h.x - bp.x, h.y - bp.y) < 80) { r.slide = .45; BZ.bus.emit('slide', { runner: r.player, headfirst: !!r.headfirst }); } }
      } else if (Math.abs(r.p - Math.round(r.p)) < .001) { r.state = r.p >= 4 ? 'scored' : 'base'; r.turbo = false; }
      else { r.state = 'lead'; r.turbo = false; }
      if (r.slide > 0) r.slide -= dt;
    }
  },
  touch(M, r, base) {
    if (base > r.base) r.base = base;
    if (r.mustTag && base === r.mustTag) { r.mustTag = 0; r.tagged = true; BZ.bus.emit('tagUp', { runner: r.player }); }
    if (base >= 4 && r.p >= 4) {
      // a run, unless a fly is still in the air and the runner left early (he goes back)
      const b = M.ball;
      if (b.mode === 'batted' && !b.bounced && !b.touched && M.outs < 2 && !r.isBatter) { r.p = 3.98; r.goal = 3; return; }
      BZ.play.scoreRunner(M, r);
      return;
    }
    if (base === 1 && r.isBatter) BZ.bus.emit('safeFirst', { runner: r.player });
    if (r.steal && base === r.start + 1) { r.steal = false; r.stoleBase = true; }
  },
  /** put the runners back on the bases once the play is over */
  settle(M) {
    const B = [null, null, null], P = M.play;
    for (const r of M.runners) {
      if (r.state === 'out' || r.state === 'scored' || r.state === 'cancel') continue;
      let b = clamp(Math.round(r.p), 0, 3);
      if (r.isBatter && b < 1) b = 1;
      if (b >= 1 && !B[b - 1]) B[b - 1] = r.player;
      else { for (let k = b; k <= 3; k++) if (!B[k - 1]) { B[k - 1] = r.player; break; } }
      if (r.stoleBase) { BZ.statFor(M, r.player).SB++; BZ.bus.emit('steal', { ok: true, runner: r.player }); }
    }
    M.bases = B;
    void P;
  }
};

/* ===== src/16-supers.js ===== */
/* =============================================================================
 * 16-supers: the Batzooka meter (the crowd's roar, one per team), its gains, the
 * Comeback Boost, and the supers: BATZOOKA! (the batter), the team super pitch,
 * Laser Arm (a fielder) and Afterburners (the runners). Turbo refills here too.
 * ========================================================================== */
BZ.GAINS = { contact: [6, 15], single: 10, xbh: 15, homer: 25, strikeout: 12, bigCatch: 20, doublePlay: 15, steal: 10, headfirst: 5, rhubarb: 50, target: 20 };
BZ.supers = {
  gain(M, side, amt, why) {
    if (side === undefined || side === null || !M || M.mode === 'derby') return;
    const T = M.teams[side]; if (!T) return;
    if (M.cheats && M.cheats.infMeter && (T.humans.length || M.attract)) { T.meter = 100; return; }
    const trailing = (side === 0 ? M.teams[1].runs - M.teams[0].runs : M.teams[0].runs - M.teams[1].runs) >= 3;
    const comeback = trailing && (!BZ.game || !BZ.game.settings || BZ.game.settings.comeback !== false) ? 1.5 : 1;
    const hype = M.upgrades && M.upgradeTeam === side ? 1 + .1 * (M.upgrades.hype || 0) : 1;
    const before = T.meter;
    T.meter = clamp(T.meter + amt * TUNE.meterGain * comeback * hype, 0, 100);
    if (before < 100 && T.meter >= 100) BZ.bus.emit('meterFull', { side, team: T.id });
    BZ.bus.emit('meter', { side, value: T.meter, why });
  },
  install(M) {
    const off = () => BZ.offense(M).side, def = () => BZ.defense(M).side, on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    on('contact', d => this.gain(M, off(), lerp(BZ.GAINS.contact[0], BZ.GAINS.contact[1], clamp(d.Q || 0, 0, 1)), 'contact'));
    on('hit', d => this.gain(M, off(), d.bases >= 2 ? BZ.GAINS.xbh : BZ.GAINS.single, 'hit'));
    on('homer', () => this.gain(M, off(), BZ.GAINS.homer, 'homer'));
    on('strikeout', () => this.gain(M, def(), BZ.GAINS.strikeout, 'strikeout'));
    on('catch', d => { if (d.fly && (d.dive || d.wall)) this.gain(M, def(), BZ.GAINS.bigCatch, 'catch'); });
    on('doublePlay', () => this.gain(M, def(), BZ.GAINS.doublePlay, 'dp'));
    on('steal', d => { if (d.ok) this.gain(M, off(), BZ.GAINS.steal, 'steal'); });
    on('headfirst', () => this.gain(M, off(), BZ.GAINS.headfirst, 'headfirst'));
    on('target', () => this.gain(M, off(), BZ.GAINS.target, 'target'));
  },
  /** arm the Batzooka (the next swing) */
  arm(M, side) {
    const T = M.teams[side]; if (T.meter < 100 || T.batzookaArmed) return false;
    T.batzookaArmed = true; BZ.bus.emit('batzookaArmed', { side }); BZ.sfx('charge'); BZ.sting('ignite');
    return true;
  },
  /** spend the armed Batzooka (on any swing) */
  spend(M, side) { const T = M.teams[side]; if (!T.batzookaArmed) return false; T.batzookaArmed = false; T.meter = 0; return true; },
  /** turbo refills between pitches */
  pitchTick(M) { for (const T of M.teams) T.turbo = Math.min(100, T.turbo + 15); },
  turboTick(M, dt) { for (const T of M.teams) { if (!M.play || M.phase !== 'inPlay') T.turbo = Math.min(100, T.turbo + 10 * dt); if (M.cheats.infTurbo && T.humans.length) T.turbo = 100; if (M.cheats.infMeter && T.humans.length) T.meter = 100; } },
  hype(M) { const O = M && M.teams ? Math.max(M.teams[0].meter, M.teams[1].meter) : 0; return clamp(O / 100, 0, 1); }
};

/* ===== src/17-rhubarb.js ===== */
/* =============================================================================
 * 17-rhubarb: the bench-clearing brawl, a 12-second slapstick scrum around home
 * plate built on the engine's beat-'em-up tools (E.Combo, E.Attack, knockback).
 * Each human controls one fighter: ✕ punch combo, □ shove, △ grab and toss,
 * ○ dodge. Three hits knock a fighter down (dizzy stars, then up again). The
 * side with more knockdowns gets +50 meter. Cartoon only: bonks, POW, no blood.
 * ========================================================================== */
BZ.rhubarb = {
  start(M, why, o = {}) {
    const P = M.park, H = P.H, R = BZ.rng.fx;
    const pick = (T, n, first) => { const l = [first].concat(T.lineup.filter(p => p !== first)).filter(Boolean); return l.slice(0, n); };
    const O = BZ.offense(M), D = BZ.defense(M);
    const sides = o.crew ? [[M.batter], o.crew] : [pick(O, 6, M.batter), pick(D, 6, D.pitcher)];
    const F = [];
    sides.forEach((list, s) => list.forEach((pl, i) => {
      const a = (s ? -1 : 1) * (.4 + i * .35), r0 = 60 + i * 12;
      const f = { side: s, pl, x: H.x + (s ? 1 : -1) * (20 + i * 14), y: H.y - 40 - i * 10, vx: 0, vy: 0, facing: s ? Math.PI : 0, hits: 0, down: 0, knocks: 0, cool: 0, wind: 0, rig: BZ.rigFor(pl, 'fight'), combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }), bash: new E.Attack('bash'), toss: new E.Attack('throw'), dodge: 0, human: null, aiT: R() * .5, sx: 0, sy: 0 };
      void a; void r0;
      // the dugouts pour out: they start at the dugouts and run in
      f.x = H.x + (s ? 1 : -1) * (150 + i * 10); f.y = H.y - 120 - i * 8;
      F.push(f);
    }));
    const offI = o.human || BZ.ctl.who(M, O.side, 'bat'), defI = BZ.ctl.who(M, D.side, 'pitch');
    if (offI) F[0].human = offI;
    if (defI && !o.crew) { const pf = F.find(f => f.side === 1 && f.pl === D.pitcher) || F.find(f => f.side === 1); if (pf) pf.human = defI; }
    M.rhubarb = { t: 0, dur: o.dur || 12, F, why, score: [0, 0], ended: false, endT: 0, punches: 0, shoves: 0, tosses: 0, training: !!o.crew };
    this.prev = M.phase;
    M.phase = 'rhubarb'; M.phaseT = 0;
    BZ.bus.emit('rhubarbStart', { why });
    BZ.hud.stamp('RHUBARB!', { prio: 3, scale: 4, dur: 2 });
    BZ.talk.say('rhubarb_start', {}, 3);
    BZ.music('rhubarb');
  },
  update(M, dt) {
    const R = M.rhubarb, F = R.F;
    R.t += dt;
    if (R.ended) { R.endT += dt; for (const f of F) { f.vx *= .9; f.vy *= .9; BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, vx: 0, vy: 0, facing: f.facing, pose: f.down > 0 ? 'down' : 'hips' }); } if (R.endT > 2.4) this.finish(M); return; }
    for (const f of F) {
      f.cool = Math.max(0, f.cool - dt); f.dodge = Math.max(0, f.dodge - dt);
      if (f.down > 0) { f.down -= dt; f.vx = f.vy = 0; BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, facing: f.facing, down: Math.min(1, f.down) }); continue; }
      const foes = F.filter(o => o.side !== f.side && o.down <= 0);
      const near = foes.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      let mx = 0, my = 0, punch = false, shove = false, grab = false, dodge = false;
      if (f.human) {
        const I = f.human, m = I.move(), d = BZ.game.view.screenDirToGround ? BZ.game.view.screenDirToGround(m[0], m[1]) : m;
        mx = d[0]; my = d[1]; punch = I.pressed('south'); shove = I.pressed('west'); grab = I.pressed('north'); dodge = I.pressed('east');
        if (Math.hypot(mx, my) > .2) f.facing = Math.atan2(my, mx); else if (near) f.facing = Math.atan2(near.y - f.y, near.x - f.x);
      } else if (near) {
        const dx = near.x - f.x, dy = near.y - f.y, d = Math.hypot(dx, dy);
        f.facing = Math.atan2(dy, dx);
        if (d > 13) { mx = dx / d; my = dy / d; }
        f.aiT -= dt;
        if (d < 15 && f.aiT <= 0) { f.wind += dt; if (f.wind > .25) { f.wind = 0; f.aiT = .45 + BZ.F() * .6; const r = BZ.F(); if (r < .65) punch = true; else if (r < .85) shove = true; else grab = true; } }
      }
      const sp = f.dodge > 0 ? 190 : 85;
      if (dodge && f.cool <= 0) { f.dodge = .25; f.cool = .5; BZ.sfx('turbo'); }
      f.vx = mx * sp; f.vy = my * sp; f.x += f.vx * dt; f.y += f.vy * dt;
      if (punch && f.combo.press()) { R.punches += f.human ? 1 : 0; BZ.sfx('swing'); }
      if (shove && f.bash.start()) { R.shoves += f.human ? 1 : 0; }
      if (grab && near && Math.hypot(near.x - f.x, near.y - f.y) < 14 && f.toss.start()) { R.tosses += f.human ? 1 : 0; this.hit(M, f, near, 3, 260, 'toss'); BZ.sfx('slideWhistle'); }
      f.combo.update(dt); f.bash.update(dt); f.toss.update(dt);
      const inReach = o => Math.hypot(o.x - f.x, o.y - f.y) < 16 && Math.abs(BZ.ang(Math.atan2(o.y - f.y, o.x - f.x) - f.facing)) < 1.2 && o.dodge <= 0 && o.down <= 0;
      f.combo.hits(foes, inReach, o => this.hit(M, f, o, 1, 60, 'punch'));
      f.bash.hits(foes, inReach, o => this.hit(M, f, o, 1, 160, 'shove'));
      BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: f.facing, attack: f.combo.state || f.bash.state || f.toss.state, stance: 'guard', expr: 'angry' });
      // stay near home plate
      const H = M.park.H, dx = f.x - H.x, dy = f.y - (H.y - 50), d = Math.hypot(dx, dy); if (d > 110) { f.x = H.x + dx / d * 110; f.y = H.y - 50 + dy / d * 110; }
    }
    if (R.t >= R.dur) this.end(M);
  },
  hit(M, a, o, dmg, push, how) {
    const R = M.rhubarb;
    o.hits += dmg; const d = Math.hypot(o.x - a.x, o.y - a.y) || 1;
    o.x += (o.x - a.x) / d * push * .08; o.y += (o.y - a.y) / d * push * .08;
    BZ.sfx(how === 'toss' ? 'crash' : 'bonk');
    if (BZ.cosmetic) { BZ.game.particles.text(o.x, o.y, 30, ['POW!', 'BONK!', 'WHAM!', 'BOP!'][Math.floor(BZ.F() * 4)], '#ffd040', { scale: 1, bounce: true }); BZ.game.particles.impact && BZ.game.particles.impact(o.x, o.y, 20, 1, '#ffffff'); }
    if (a.human) a.human.rumble(.4, .1);
    if (o.hits >= 3) { o.hits = 0; o.down = 2; o.rig.kick(-1); R.score[a.side]++; a.knocks++; BZ.bus.emit('knockdown', { side: a.side }); }
  },
  end(M) {
    const R = M.rhubarb; R.ended = true; R.endT = 0;
    BZ.sfx('whistle');
    BZ.hud.stamp('BREAK IT UP!', { prio: 3, scale: 3, dur: 2 });
    BZ.talk.show('barb', 'Break it up! Everybody back in your dugouts before I eject the volcano!', 3);
  },
  finish(M) {
    const R = M.rhubarb, O = BZ.offense(M), D = BZ.defense(M);
    const [a, b] = R.score;
    if (!R.training) {
      if (a > b) BZ.supers.gain(M, O.side, BZ.GAINS.rhubarb, 'rhubarb'); else if (b > a) BZ.supers.gain(M, D.side, BZ.GAINS.rhubarb, 'rhubarb'); else { BZ.supers.gain(M, O.side, 20, 'rhubarb'); BZ.supers.gain(M, D.side, 20, 'rhubarb'); }
    }
    BZ.bus.emit('rhubarbEnd', { score: R.score, punches: R.punches, shoves: R.shoves, tosses: R.tosses });
    BZ.talk.say('rhubarb_end', {}, 2);
    M.rhubarb = null;
    BZ.music(M.park.def.music);
    if (R.training) { M.phase = 'training'; M.phaseT = 0; return; }
    // back to baseball: the batter is already on first for the hit-by-pitch
    M.phase = 'atBat'; M.phaseT = 0; M.ab.sub = 'settle'; M.ab.t = 0; M.ab.next = 'batter';
  },
  draw(r, M, t) {
    const R = M.rhubarb; if (!R) return;
    const humans = R.F.filter(f => f.human);
    // AI-only fights far from a human become cartoon fight clouds
    const inCloud = new Set();
    for (const f of R.F) { if (f.human || f.down > 0) continue; const foe = R.F.find(o => o.side !== f.side && !o.human && o.down <= 0 && Math.hypot(o.x - f.x, o.y - f.y) < 16); if (foe && humans.every(h => Math.hypot(h.x - f.x, h.y - f.y) > 50)) { inCloud.add(f); inCloud.add(foe); } }
    for (const f of R.F) {
      if (inCloud.has(f)) continue;
      r.shadow(f.x, f.y, 6, .4);
      r.actor(f.x, f.y, 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { outline: f.human ? E.PLAYER_COLORS[(f.human.player - 1) % 4] : undefined });
      if (f.down > 0) r.queue(f.x, f.y, 20, g => { const q = r.w(f.x, f.y, 14); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; E.font.text(g, '★', q[0] + Math.cos(a) * 8, q[1] + Math.sin(a) * 3, '#ffd040'); } }, { bias: 5 });
      if (f.human) BZ.hud.playerArrow(r, f, f.human.player);
    }
    const done = new Set();
    for (const f of inCloud) {
      if (done.has(f)) continue; done.add(f);
      r.queue(f.x, f.y, 10, g => {
        const q = r.w(f.x, f.y, 12), k = Math.max(1, r.view.scale * (r.game.zoom || 1));
        for (let i = 0; i < 7; i++) { const a = t * 9 + i, rr = 9 * k + Math.sin(t * 13 + i) * 2; px.disc(g, q[0] + Math.cos(a) * rr * .8, q[1] + Math.sin(a) * rr * .5, 6 * k, i % 2 ? '#e8e0d0' : '#c8c0b0'); }
        if (Math.floor(t * 8) % 3 === 0) E.font.text(g, ['POW', 'BAM', 'ZOK'][Math.floor(t * 3) % 3], q[0] + 10 * k, q[1] - 10 * k, '#ffd040', { shadow: '#000' });
        px.disc(g, q[0] + Math.cos(t * 17) * 12 * k, q[1] + Math.sin(t * 11) * 6 * k, 2 * k, '#f1c7a0');
      }, { bias: 3 });
    }
  },
  hud(g, r, M) {
    const R = M.rhubarb; if (!R) return;
    E.font.title(g, 'RHUBARB!', r.W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'] });
    E.font.text(g, BZ.offense(M).def.abbr + ' ' + R.score[0] + '  -  ' + R.score[1] + ' ' + (R.training ? 'CREW' : BZ.defense(M).def.abbr), r.W / 2, 34, '#ffffff', { align: 'center', shadow: '#000', scale: 1 });
    E.ui.bar(g, r.W / 2 - 50, 46, 100, 4, 1 - R.t / R.dur, '#ffd040');
    for (const f of R.F) if (f.human) BZ.drawPrompts(g, f.human, [['south', 'PUNCH'], ['west', 'SHOVE'], ['north', 'TOSS'], ['east', 'DODGE']], r.W / 2, r.H - 26, { align: 'center' });
  }
};

/* ===== src/18-hazards.js ===== */
/* =============================================================================
 * 18-hazards: each park's hazard or feature, a plug-in { init, update, preBall,
 * onBall, onHomer, draw, drawM7 }. Always telegraphed (a sound, a stamp, smoke)
 * and introduced by a radio line the first time. Rates x TUNE.hazardRate.
 * ========================================================================== */
BZ.HAZARDS = {};
BZ.hazards = {
  init(M) {
    const h = BZ.HAZARDS[M.park.def.hazard];
    BZ.hazard = h ? Object.create(h) : null;
    if (BZ.hazard && BZ.hazard.init) BZ.hazard.init(M);
    // homers check the park's targets
    M.unsub.push(BZ.bus.on('homer', d => { if (BZ.hazard && BZ.hazard.onHomer) BZ.hazard.onHomer(M, d); }));
  },
  /** the dev trigger: the hazard now */
  now(M) { if (BZ.hazard && BZ.hazard.trigger) BZ.hazard.trigger(M); }
};
const pathOfCarry = (M) => { const b = M.ball, P = M.park, g = BZ.gravity(P), o = Object.assign({}, b), pts = []; for (let i = 0; i < 600; i++) { const dt = 1 / 120; o.vz -= g * dt; o.vx -= o.vx * TUNE.drag * dt; o.vy -= o.vy * TUNE.drag * dt; if (o.boost > 0) { const s = Math.hypot(o.vx, o.vy, o.vz) || 1; o.vx += o.vx / s * 900 * dt; o.vy += o.vy / s * 900 * dt; o.vz += o.vz / s * 900 * dt; o.boost -= dt; } o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; if (i % 3 === 0) pts.push([o.x, o.y, o.z]); if (o.z < 0) break; } return pts; };

/* Kernel Field: the Silo Shot */
BZ.HAZARDS.silo = {
  init(M) { this.silo = M.park.props.find(p => p.silo); this.popT = 0; },
  onHomer(M, d) {
    if (!this.silo) return;
    const pts = pathOfCarry(M), s = this.silo;
    if (pts.some(p => Math.hypot(p[0] - s.x, p[1] - s.y) < 40 && p[2] < 175)) {
      this.popT = 3;
      BZ.bus.emit('hazard', { kind: 'silo', stamp: 'SILO SHOT!' }); BZ.bus.emit('target', { kind: 'silo', fb: 300 });
      M.bonusFB = (M.bonusFB || 0) + 300; BZ.sfx('popcorn'); BZ.sfx('explode');
    }
  },
  trigger(M) { this.popT = 3; BZ.sfx('popcorn'); BZ.bus.emit('hazard', { kind: 'silo', stamp: 'SILO SHOT!' }); },
  update(M, dt) {
    if (this.popT > 0) { this.popT -= dt; if (BZ.cosmetic && this.silo) for (let i = 0; i < 3; i++) BZ.game.particles.add({ kind: 'bit', x: this.silo.x + BZ.Fr(-30, 30), y: this.silo.y + BZ.Fr(-30, 30), z: 150 + BZ.Fr(0, 40), vx: BZ.Fr(-90, 90), vy: BZ.Fr(-90, 90), vz: BZ.Fr(40, 200), life: 1.6, color: BZ.F() < .5 ? '#fff6d0' : '#f4d070' }); }
  }
};
/* Barnacle Bay: Gull Patrol and the Splash Zone */
BZ.HAZARDS.gulls = {
  init(M) {
    const H = M.park.H; this.gulls = [0, 1, 2].map(i => ({ a: i * 2.1, r: 260 + i * 90, cx: H.x + (i - 1) * 140, cy: H.y - 620 - i * 60, z: 220 + i * 25, x: 0, y: 0, blob: BZ.cosmetic ? BZ.makeBlob({ R: 4, wings: true, colors: { dk: '#a8b0b8', base: '#f4f6f8', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a1a', pupil: '#000' } }) : null }));
    this.carry = null; this.tried = new Set(); this.cawT = 3;
  },
  update(M, dt) {
    for (const g of this.gulls) { g.a += dt * .45 * TUNE.hazardRate; g.x = g.cx + Math.cos(g.a) * g.r; g.y = g.cy + Math.sin(g.a) * g.r * .6; if (g.blob) g.blob.update(dt, { flap: 1 }); }
    this.cawT -= dt; if (this.cawT <= 0) { this.cawT = 5 + BZ.F() * 6; BZ.sfx('gull', { vol: .5 }); }
  },
  /** a gull carrying the ball: it flies 60-140 U, then lets go from z 150 */
  preBall(M, b, dt) {
    const c = this.carry; if (!c) return false;
    c.t += dt; const k = Math.min(1, c.t / c.dur);
    b.x = c.x0 + (c.x1 - c.x0) * k; b.y = c.y0 + (c.y1 - c.y0) * k; b.z = lerp(c.z0, 150, k); b.vx = (c.x1 - c.x0) / c.dur; b.vy = (c.y1 - c.y0) / c.dur; b.vz = 0;
    c.g.x = b.x; c.g.y = b.y; c.g.z = b.z + 4;
    if (k >= 1) { this.carry = null; b.vx *= .3; b.vy *= .3; b.version++; BZ.sfx('gull'); }
    return true;
  },
  onBall(M, b, dt) {
    if (b.mode !== 'batted' || b.bounced || b.touched || this.carry || b.z < 180) return;
    for (const g of this.gulls) {
      const key = b.version + ':' + this.gulls.indexOf(g);
      if (this.tried.has(key) || Math.hypot(b.x - g.x, b.y - g.y, b.z - g.z) > 60) continue;
      this.tried.add(key);
      if (BZ.R() < .25 * TUNE.hazardRate) {
        const a = BZ.R() * TAU, d = 60 + BZ.R() * 80;
        this.carry = { g, t: 0, dur: 1.1, x0: b.x, y0: b.y, z0: b.z, x1: b.x + Math.cos(a) * d, y1: b.y + Math.sin(a) * d };
        BZ.bus.emit('hazard', { kind: 'gulls', stamp: 'GULL SNATCH!' }); BZ.sfx('gull');
        return;
      }
    }
  },
  onHomer(M, d) { const th = BZ.theta(d.x - M.park.H.x, d.y - M.park.H.y); if (th > .25) { BZ.sfx('splash'); BZ.sfx('horn'); BZ.hud.toast('SPLASH! INTO THE BAY!'); } },
  trigger(M) { const b = M.ball; if (b.mode === 'batted') { const g = this.gulls[0]; g.x = b.x; g.y = b.y; g.z = b.z; } BZ.sfx('gull'); BZ.bus.emit('hazard', { kind: 'gulls', stamp: 'GULL PATROL!' }); },
  draw(r, M) { for (const g of this.gulls) if (g.blob) { r.shadow(g.x, g.y, 4, .2); r.actor(g.x, g.y, BZ.displayZ(g.z || 220), (gg, ox, oy) => g.blob.draw(gg, ox, oy, r.view)); } },
  drawM7(m7, M) { for (const g of this.gulls) m7.add(g.x, g.y, g.z || 220, (gg, sx, sy, k) => { const s = Math.max(1, 5 * k), f = Math.sin(BZ.game.time * 14) * s * .6; px.line(gg, sx - s, sy - f, sx, sy, '#ffffff'); px.line(gg, sx, sy, sx + s, sy - f, '#ffffff'); }); }
};
/* Caldera Field: the Lava Vents */
BZ.HAZARDS.vents = {
  init(M) { this.vents = M.park.props.filter(p => p.vent).map(p => ({ x: p.x, y: p.y })); this.t = 18; this.state = 'idle'; this.st = 0; },
  update(M, dt) {
    this.t -= dt * TUNE.hazardRate;
    if (this.state === 'idle' && this.t <= 3) { this.state = 'rumble'; BZ.sfx('lava'); BZ.hud.toast('THE GROUND IS RUMBLING...'); }
    if (this.state === 'rumble' && this.t <= 0) { this.state = 'erupt'; this.st = 2.2; BZ.sfx('erupt'); BZ.game.shake(3); BZ.bus.emit('hazard', { kind: 'vents', stamp: 'ERUPTION!' }); }
    if (this.state === 'erupt') { this.st -= dt; if (this.st <= 0) { this.state = 'idle'; this.t = 25; } }
    if (BZ.cosmetic) for (const v of this.vents) {
      if (this.state !== 'idle' && BZ.F() < .5) BZ.game.particles.smoke(v.x + BZ.Fr(-10, 10), v.y + BZ.Fr(-10, 10), 16, 1, { size: 1.4, color: '#5a4a4a' });
      if (this.state === 'erupt' && BZ.F() < .7) BZ.game.particles.add({ kind: 'fire', x: v.x + BZ.Fr(-8, 8), y: v.y + BZ.Fr(-8, 8), z: 16, vz: BZ.Fr(100, 260), vx: BZ.Fr(-30, 30), vy: BZ.Fr(-30, 30), life: 1 });
    }
    // a human fielder caught on an erupting vent gets knocked back
    if (this.state === 'erupt' && M.phase === 'inPlay') for (const f of M.fielders) for (const v of this.vents) { const d = Math.hypot(f.x - v.x, f.y - v.y); if (d < 30 && d > .1) { f.x += (f.x - v.x) / d * 120 * dt; f.y += (f.y - v.y) / d * 120 * dt; } }
  },
  onBall(M, b) {
    if (this.state !== 'erupt' || b.mode === 'held') return;
    for (const v of this.vents) if (Math.hypot(b.x - v.x, b.y - v.y) < 30 && b.z < 40 && !b.vented) { b.vented = true; b.vz = 600; b.vx += (BZ.R() - .5) * 240; b.vy += (BZ.R() - .5) * 240; b.z = Math.max(b.z, 10); b.version++; BZ.sfx('erupt'); BZ.bus.emit('hazard', { kind: 'vents', stamp: 'LAUNCHED!' }); }
  },
  trigger(M) { this.state = 'rumble'; this.t = 1.2; BZ.sfx('lava'); },
  drawM7(m7) { if (this.state === 'erupt') for (const v of this.vents) m7.add(v.x, v.y, 0, (g, sx, sy, k) => px.blend(g, .8, 'add', () => { for (let i = 0; i < 4; i++) px.disc(g, sx + (BZ.F() - .5) * 8 * k, sy - (10 + i * 14) * k, (6 - i) * k + 1, i < 2 ? '#ffd040' : '#ff5a1a'); })); }
};
/* Tranquility Dome: Meteor Showers (low gravity lives in the park def) */
BZ.HAZARDS.meteors = {
  init(M) { this.t = 30; this.craters = []; this.streaks = []; this.half = M.inning + M.half; },
  update(M, dt) {
    if (this.half !== M.inning + M.half) { this.half = M.inning + M.half; this.craters = []; }
    this.t -= dt * TUNE.hazardRate;
    if (this.t <= 1.5 && !this.warned) { this.warned = true; BZ.hud.toast('METEOR SHOWER INCOMING!'); BZ.sfx('meteor'); }
    if (this.t <= 0) { this.t = 40; this.warned = false; this.shower(M); }
    for (const s of this.streaks) s.t += dt; this.streaks = this.streaks.filter(s => s.t < .9);
  },
  shower(M) {
    const P = M.park, H = P.H, R = BZ.rng.play;
    for (let i = 0; i < 3; i++) {
      const th = (R() - .5) * 1.3, r = 520 + R() * (P.R(th) - 600), x = H.x + Math.sin(th) * r, y = H.y - Math.cos(th) * r;
      this.craters.push({ x, y, r: 22 }); this.streaks.push({ x, y, t: 0 });
      if (BZ.cosmetic) BZ.wait(.7 + i * .2, () => { BZ.game.particles.explosion(x, y, 0, .8, { shake: 2 }); });
    }
    BZ.sfx('meteor'); BZ.bus.emit('hazard', { kind: 'meteors', stamp: 'METEOR SHOWER!' });
  },
  onBall(M, b) {
    if (!b.rolling || b.mode === 'held') return;
    for (const c of this.craters) if (Math.hypot(b.x - c.x, b.y - c.y) < c.r && b.craterV !== b.version) { b.craterV = b.version; const a = (BZ.R() < .5 ? -1 : 1) * .7, ca = Math.cos(a), sa = Math.sin(a), vx = b.vx; b.vx = vx * ca - b.vy * sa; b.vy = vx * sa + b.vy * ca; b.version++; b.craterV = b.version; }
  },
  trigger(M) { this.t = .01; },
  draw(r) { for (const c of this.craters) r.decal(g => { r.groundRing(c.x, c.y, c.r, '#5a5a64'); r.groundRing(c.x, c.y, c.r * .7, '#3a3a44'); }); for (const s of this.streaks) r.queue(s.x, s.y, 0, g => { const k = s.t / .7, a = r.w(s.x - 300 * (1 - k), s.y - 200 * (1 - k), 600 * (1 - k)), b2 = r.w(s.x - 280 * (1 - k) + 20, s.y - 190 * (1 - k), 560 * (1 - k)); if (k < 1) px.line(g, a[0], a[1], b2[0], b2[1], '#ffd8a0', 2); }, { emissive: true }); },
  drawM7(m7) { for (const c of this.craters) m7.add(c.x, c.y, 0, (g, sx, sy, k) => px.ell(g, sx, sy, c.r * k, c.r * k * .25, '#4a4a54')); }
};
/* Boneyard Ballpark: Phantom Fog (fly balls vanish above 120 U); the Haunts' Ghost Gloves live in the climb */
BZ.HAZARDS.phantom = {
  init(M) { this.said = false; },
  onBall(M, b) {
    const inv = b.mode === 'batted' && !b.bounced && b.z > 120;
    if (inv && !b.invisible && !this.said) { this.said = true; BZ.bus.emit('hazard', { kind: 'phantom', stamp: 'PHANTOM FOG!' }); BZ.sfx('ghost'); }
    else if (inv && !b.invisible && BZ.F() < .3) BZ.sfx('ghost', { vol: .5 });
    b.invisible = inv;
  },
  trigger(M) { BZ.bus.emit('hazard', { kind: 'phantom', stamp: 'PHANTOM FOG!' }); BZ.sfx('ghost'); },
  update(M, dt) { if (BZ.cosmetic && BZ.F() < .1) { const H = M.park.H; BZ.game.particles.smoke(H.x + BZ.Fr(-500, 500), H.y - BZ.Fr(300, 900), 60, 1, { size: 2, color: '#8a9aa8' }); } }
};
/* MegaMax MegaDome: Defense Drones and the MEGA-TRON */
BZ.HAZARDS.drones = {
  init(M) {
    const H = M.park.H;
    this.drones = [0, 1, 2].map(i => ({ alive: true, path: new E.Path([[H.x - 380 + i * 60, H.y - 600 - i * 90, 160 + i * 40], [H.x + 360 - i * 60, H.y - 640 - i * 70, 200], [H.x + 200, H.y - 900 + i * 40, 240 - i * 30], [H.x - 260, H.y - 860, 180]], { closed: true, smooth: 'catmull' }), d: i * 400, x: 0, y: 0, z: 0, boom: 0 }));
    this.hum = 2;
  },
  update(M, dt) {
    for (const d of this.drones) { if (!d.alive) { d.boom = Math.max(0, d.boom - dt); continue; } d.d += dt * 140 * TUNE.hazardRate; const p = d.path.at(d.d); d.x = p.x; d.y = p.y; d.z = p.z; }
    this.hum -= dt; if (this.hum <= 0) { this.hum = 3; BZ.sfx('drone', { vol: .4 }); }
  },
  onBall(M, b) {
    if (b.mode !== 'batted' || b.bounced) return;
    for (const d of this.drones) {
      if (!d.alive || Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z) > 16) continue;
      if (b.boost > 0 || (M.lastBatted && M.lastBatted.zooka)) { d.alive = false; d.boom = 1; if (BZ.cosmetic) BZ.game.particles.explosion(d.x, d.y, d.z, 1.2, { shake: 3 }); BZ.bus.emit('target', { kind: 'drone', fb: 150 }); M.bonusFB = (M.bonusFB || 0) + 150; BZ.talk.say('drone_down', {}, 3); BZ.hud.stamp('DRONE DOWN!', { prio: 3 }); if (M.derby) M.derby.bonus(150, 'DRONE'); }
      else { b.vx *= -.4; b.vy *= -.5; b.vz = Math.abs(b.vz) * .3; b.version++; BZ.sfx('clang'); BZ.bus.emit('hazard', { kind: 'drones', stamp: 'DEFLECTED!' }); }
    }
  },
  onHomer(M) {
    const mt = M.park.props.find(p => p.megatron); if (!mt) return;
    const pts = pathOfCarry(M);
    if (pts.some(p => Math.abs(p[0] - mt.x) < 92 && Math.abs(p[1] - mt.y) < 16 && p[2] > 90 && p[2] < 192)) {
      BZ.bus.emit('target', { kind: 'megatron', fb: 300 }); M.bonusFB = (M.bonusFB || 0) + 300; BZ.talk.say('megatron', {}, 3); BZ.hud.stamp('MEGA-TRON HIT!', { prio: 3 });
      if (BZ.cosmetic) for (let i = 0; i < 4; i++) BZ.wait(i * .2, () => BZ.game.particles.sparks(mt.x + BZ.Fr(-80, 80), mt.y, 140 + BZ.Fr(-40, 40), 30, Math.PI / 2));
      if (M.derby) M.derby.bonus(300, 'MEGA-TRON');
      M.megatronHit = true;
    }
  },
  trigger(M) { for (const d of this.drones) if (!d.alive) { d.alive = true; } BZ.bus.emit('hazard', { kind: 'drones', stamp: 'DRONES DEPLOYED!' }); },
  draw(r) { for (const d of this.drones) if (d.alive) { r.shadow(d.x, d.y, 6, .2); r.shape('bz_drone', d.x, d.y, BZ.displayZ(d.z), { facing: BZ.game.time * 2 }); r.game.lights.enabled && r.game.lights.add(d.x, d.y, d.z, 50, .5, { color: '#e01e3c' }); } },
  drawM7(m7) { for (const d of this.drones) if (d.alive) m7.shape('bz_drone', d.x, d.y, d.z, { facing: BZ.game.time * 2 }); }
};

/* ===== src/19-ctl.js ===== */
/* =============================================================================
 * 19-ctl: the human controls in the live play. Which player does which job
 * (one human does everything; with two on a side the captain bats and pitches
 * and the co-captain runs and fields), the controlled fielder (switch, run,
 * jump, climb, dive, turbo, throw with power, the Laser Arm, click a base), and
 * the runners' orders (advance, back, one runner, turbo, Afterburners, the
 * headfirst dive; mouse clicks on bases).
 * ========================================================================== */
BZ.ctl = {
  /** the input that does a duty for a side ('bat' | 'pitch' | 'run' | 'field'), or null for the CPU */
  who(M, side, duty) {
    const H = M.teams[side].humans; if (!H.length) return null;
    if (H.length === 1 || duty === 'bat' || duty === 'pitch') return H[0].input;
    return H[1].input;
  },
  /** the controlled fielder for a human defense */
  pick(M) {
    const D = BZ.defense(M), I = this.who(M, D.side, 'field');
    for (const f of M.fielders) f.human = null;
    if (!I) return;
    let f = M.ctlF && M.fielders.includes(M.ctlF) ? M.ctlF : null;
    if (!f || (M.play && M.play.chaser && f !== M.play.chaser && !f.has && !M.ctlLocked)) f = (M.play && M.play.chaser) || f || M.fielders.find(o => o.pos === 'P');
    const h = BZ.play.holder(M); if (h) f = h;
    M.ctlF = f; f.human = I;
  },
  switchFielder(M) {
    const b = M.ball, list = M.fielders.filter(f => f !== M.ctlF && f.state !== 'down').sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
    if (list[0]) { if (M.ctlF) M.ctlF.human = null; M.ctlF = list[0]; M.ctlLocked = true; BZ.sfx('select'); }
  },
  /** the live-play step for every human: defense and offense */
  step(M, dt) {
    const D = BZ.defense(M), O = BZ.offense(M), P = M.park;
    // ---- defense ----
    const FI = this.who(M, D.side, 'field');
    if (FI) {
      if (FI.pressed('l1') && !BZ.play.holder(M)) this.switchFielder(M);
      this.pick(M);
      const f = M.ctlF;
      if (f && !f.has) {
        f.turbo = FI.down('l2') && D.turbo > 0;
        if (f.turbo) { D.turbo = Math.max(0, D.turbo - 40 * TUNE.turboDrain * dt); }
        if (FI.pressed('r1')) {
          const th = BZ.theta(f.x - P.H.x, f.y - P.H.y), r = Math.hypot(f.x - P.H.x, f.y - P.H.y);
          if (f.y < P.H.y && Math.abs(th) <= P.span && P.R(th) - r < 22) BZ.play.climb(M, f); else BZ.play.jump(M, f);
        }
        if (FI.pressed('r2')) BZ.play.dive(M, f, f.facing);
      }
    }
    // ---- offense: the runners' orders ----
    const RI = this.who(M, O.side, 'run');
    if (RI && M.play && M.play.kind) {
      const live = BZ.play.liveRunners(M);
      for (const r of live) { r.human = true; r.turboHeld = RI.down('l2'); }
      const held = BZ.baseHeld(RI);
      if (RI.pressed('r1') && RI.down('l2') && O.meter >= 50 && O.afterburn <= 0) { O.meter -= 50; O.afterburn = 3; BZ.bus.emit('super', { kind: 'afterburners' }); }
      else if (RI.pressed('r1')) this.order(M, live, held, +1);
      if (RI.pressed('l1')) this.order(M, live, held, -1);
      // the headfirst dive near a base
      if (RI.pressed('south')) for (const r of live) { const d = Math.abs(Math.round(r.goal) - r.p) * 300; if (r.state === 'run' && d < 40 && d > 4 && !r.headfirst) { r.headfirst = true; r.slideBoost = true; BZ.bus.emit('headfirst', { runner: r.player }); } }
      // the mouse: left-click a base sends the runner who can reach it, right-click brings him back
      if (RI.lastDevice === 'mouse' && BZ.game.mouseGround) {
        const g = BZ.game.mouseGround(), btn0 = RI.pressed('south') && RI.held && RI.held.has && RI.held.has('Mouse0'), btn2 = RI.pressed('west') && RI.held && RI.held.has && RI.held.has('Mouse2');
        if (g && (btn0 || btn2)) {
          for (let b = 1; b <= 4; b++) { const bp = P.base(b); if (Math.hypot(g[0] - bp.x, g[1] - bp.y) < 26) {
            if (btn0) { const r = live.filter(q => q.p < b).sort((a, c) => c.p - a.p)[0]; if (r) { r.goal = b; r.orderT = 2; } }
            else { const r = live.find(q => Math.round(q.goal) === b || (q.p > b - 1 && q.p <= b)); if (r) { r.goal = Math.max(r.isBatter ? 1 : r.base - 0, b - 1); r.orderT = 2; } }
          } }
        }
      }
    }
  },
  order(M, live, base, dir) {
    let list = live;
    if (base) list = live.filter(r => dir > 0 ? Math.ceil(r.p - 1e-6) === base || Math.floor(r.p + 1e-6) + 1 === base : Math.round(r.goal) === base || Math.ceil(r.p - 1e-6) === base);
    for (const r of list) {
      if (dir > 0) r.goal = Math.min(4, Math.floor(r.p + 1e-6) + 1);
      else { if (r.forced) continue; r.goal = Math.max(r.isBatter ? 1 : 1, Math.floor(r.p - 1e-6)); if (r.goal < 1) r.goal = 1; }
      r.orderT = 1.6;
    }
    if (list.length) BZ.bus.emit('order', { dir, n: list.length });
  },
  /** a human-controlled fielder's movement; returns true when the human (or the manual setting) moved it */
  fielderMove(M, f, dt, tx, ty) {
    const I = f.human, mv = I.move(), mode = (BZ.game.settings && BZ.game.settings.fielding) || 'assisted';
    if (Math.hypot(mv[0], mv[1]) > .2) {
      const d = BZ.game.view.screenDirToGround ? BZ.game.view.screenDirToGround(mv[0], mv[1]) : [mv[0], mv[1]], sp = BZ.fielderSpeed(M, f) * Math.min(1, Math.hypot(mv[0], mv[1]));
      f.vx = d[0] * sp; f.vy = d[1] * sp; f.x += f.vx * dt; f.y += f.vy * dt; f.facing = Math.atan2(d[1], d[0]); f.state = 'run'; f.humanOverride = true;
      return true;
    }
    if (mode === 'manual') { f.vx = f.vy = 0; f.state = 'set'; return true; }
    return false;
  },
  /** a human fielder holding the ball: run with it, charge and throw with a base button, or click a base */
  holder(M, f, dt) {
    const I = f.human, P = M.park, D = BZ.defense(M);
    const mv = I.move();
    if (Math.hypot(mv[0], mv[1]) > .2) {
      const d = BZ.game.view.screenDirToGround(mv[0], mv[1]), sp = BZ.fielderSpeed(M, f) * (I.down('l2') && D.turbo > 0 ? 1.35 : 1);
      if (I.down('l2')) D.turbo = Math.max(0, D.turbo - 40 * TUNE.turboDrain * dt);
      f.vx = d[0] * sp; f.vy = d[1] * sp; f.x += f.vx * dt; f.y += f.vy * dt; f.facing = Math.atan2(d[1], d[0]); f.state = 'run';
    } else if (f.botRun) { if (BZ.moveTo(f, f.botRun.x, f.botRun.y, BZ.fielderSpeed(M, f), dt)) f.botRun = null; }
    else { f.vx = f.vy = 0; if (f.state === 'run') f.state = 'hold'; }
    // charge a throw while a base button is held; let go to throw
    if (!f.charge) {
      const b = BZ.basePressed(I);
      if (b) {
        // a base clicked with the mouse throws at once
        const click = I.lastDevice === 'mouse' && I.held && I.held.has && (I.held.has('Mouse0') || I.held.has('Mouse2'));
        if (!click) f.charge = { base: b, t: 0, laser: I.down('r1') && D.meter >= 50 };
      }
      if (I.lastDevice === 'mouse' && BZ.game.mouseGround && (I.pressed('south') || I.pressed('west')) && I.held && I.held.has && (I.held.has('Mouse0') || I.held.has('Mouse2'))) {
        const g = BZ.game.mouseGround();
        if (g) for (let k = 1; k <= 4; k++) { const bp = P.base(k); if (Math.hypot(g[0] - bp.x, g[1] - bp.y) < 26) { BZ.play.startThrow(M, f, k, .8, I.down('r1') && D.meter >= 50); return; } }
        // a stray click never throws: the mouse buttons are the widget's this step
        if (I.suppressCode) { I.suppressCode('Mouse0'); I.suppressCode('Mouse2'); }
        f.charge = null;
      }
    } else {
      f.charge.t += dt;
      if (I.down('r1') && D.meter >= 50) f.charge.laser = true;
      if (BZ.baseReleased(I, f.charge.base) || f.charge.t > 1.2) {
        const power = Math.min(1, f.charge.t / .6);
        BZ.play.startThrow(M, f, f.charge.base, f.charge.laser ? 1 : power, f.charge.laser);
        f.charge = null;
      }
    }
  }
};

/* ===== src/20-ai.js ===== */
/* =============================================================================
 * 20-ai: the CPU by difficulty (ROOKIE, PRO, ALL-STAR, BATZOOKA): the pitcher,
 * the batter, the fielder with the ball, the baserunners; and THE BOT, which
 * turns these brains' choices into a player's inputs (tests, the scripted
 * playthrough and the attract mode play the real game through the real controls).
 * ========================================================================== */
BZ.LEVELS = {
  rookie: { name: 'ROOKIE', swingSd: .06, aimSd: 3.6, disc: .52, relQ: .5, after: 0, react: .34, pitchMul: .85 },
  pro: { name: 'PRO', swingSd: .042, aimSd: 2.6, disc: .68, relQ: .68, after: .3, react: .25, pitchMul: 1 },
  allstar: { name: 'ALL-STAR', swingSd: .03, aimSd: 1.8, disc: .78, relQ: .8, after: .6, react: .19, pitchMul: 1.07 },
  batzooka: { name: 'BATZOOKA', swingSd: .02, aimSd: 1.2, disc: .86, relQ: .9, after: .9, react: .14, pitchMul: 1.15 }
};
BZ.LEVEL_IDS = ['rookie', 'pro', 'allstar', 'batzooka'];
BZ.ai = {
  lv(M, side) { const T = M.teams[side]; return BZ.LEVELS[(T && T.level) || M.cpuLevel || 'pro'] || BZ.LEVELS.pro; },
  /* ---- the pitcher ---- */
  choosePitch(M, side) {
    const L = this.lv(M, side), T = M.teams[side], p = T.pitcher, rep = BZ.repertoire(p), b = M.batter, R = BZ.R;
    const ahead = M.strikes > M.balls, behind = M.balls > M.strikes + 1 || M.balls === 3;
    let slot;
    if (T.meter >= 100 && M.strikes === 2 && !M.fast) slot = 'r1';
    else {
      const r = R();
      if (behind) slot = r < .65 ? 'south' : r < .8 ? 'west' : r < .92 ? 'east' : 'north';
      else if (ahead) slot = r < .3 ? 'south' : r < .6 ? 'east' : r < .8 ? 'west' : 'north';
      else slot = r < .45 ? 'south' : r < .65 ? 'east' : r < .85 ? 'west' : 'north';
    }
    const type = slot === 'r1' ? T.def.superPitch : rep[BZ.PITCH_SLOTS.indexOf(slot)];
    const k = ((b.look && b.look.size) || 1.25) / 1.25, lo = BZ.GEO.zoneLo * k, hi = BZ.GEO.zoneHi * k;
    // targets: corners and edges, out of the zone to chase when ahead
    let tx, tz;
    const inZ = behind ? R() < .62 : ahead ? R() < .26 : R() < .43;
    if (inZ) { tx = (R() - .5) * 2 * 5 * (.5 + .5 * L.disc); tz = lerp(lo + 1.5, hi - 1.5, R()); }
    else { const s = R() < .5 ? -1 : 1; tx = s * (9 + R() * 2.5); tz = lerp(lo - 4, hi + 3, R()); if (R() < .4) { tx = (R() - .5) * 8; tz = R() < .6 ? lo - 4 - R() * 3 : hi + 3 + R() * 2; } }
    const sd = L.aimSd / Math.max(.3, TUNE.cpuPitch) * .5;
    tx += BZ.Rn(sd); tz += BZ.Rn(sd);
    const q = clamp(L.relQ * Math.min(1.3, TUNE.cpuPitch) + BZ.Rn(.15), 0, 1);
    return { slot, type, target: [tx, tz], q, after: R() < L.after ? [(R() - .5) * 2, (R() - .5) * 2] : null };
  },
  /* ---- the batter: decide at release whether to swing, and how ---- */
  batterPlan(M, side, pitch) {
    const L = this.lv(M, side), T = M.teams[side], b = M.batter, R = BZ.R;
    const c = pitch.cross(), size = (b.look && b.look.size) || 1.25;
    const inZ = BZ.inZone(c.x, c.z, size), skill = Math.max(.25, TUNE.cpuBat);
    const disc = clamp(L.disc * (M.strikes === 2 ? .8 : 1), 0, .97);
    let swing = inZ ? R() < (M.strikes === 2 ? .92 : M.balls === 3 ? .7 : .8) : R() > disc;
    if (pitch.def.vis && R() < .25) swing = !swing;   // a vanishing pitch fools the CPU too
    if (M.cheats && M.cheats.autoBatter === 'take') swing = false;
    if (M.cheats && M.cheats.perfectCPU) swing = true;
    let type = 'contact';
    if ((M.balls === 2 && M.strikes === 0) || (M.balls === 3 && M.strikes === 1) || (b.pow >= 8 && R() < .3)) type = 'power';
    let zooka = false;
    if (T.meter >= 100 && !T.batzookaArmed && (M.bases.some(Boolean) || (M.inning >= M.innings && BZ.leadBy(M) * (side ? 1 : -1) < 0) || R() < .4)) zooka = true;
    let bunt = M.bases[0] && !M.bases[1] && M.outs === 0 && b.pow <= 5 && R() < .18 && M.strikes < 2;
    if (M.fast && M.mode !== 'attract') bunt = bunt && R() < .5;
    // deception: breaking and off-speed pitches (and supers) fool the eye and the timing, more with a good release
    const kind = pitch.def.kind, dec = (kind === 'heater' ? .1 : kind === 'breaking' ? .55 : kind === 'offspeed' ? .65 : kind === 'signature' ? .85 : 1.2) * (.5 + .7 * pitch.q) * (pitch.afterUsed ? 1.2 : 1);
    const aim = L.aimSd / skill * .8 * (1 + .9 * dec), e = BZ.Rn(L.swingSd / skill * (1 + 1 * dec)) - (pitch.def.speed < .8 ? dec * .025 : 0);
    return { swing: swing || bunt, type: bunt ? 'bunt' : type, zooka, e, rx: c.x + BZ.Rn(aim), rz: c.z + BZ.Rn(aim), bunt };
  },
  /* ---- steals, at pitch select ---- */
  steals(M, side) {
    const out = {}, R = BZ.R, D = BZ.defense(M), C = M.fielders.find(f => f.pos === 'C');
    for (let b = 1; b <= 2; b++) {
      const rn = M.bases[b - 1]; if (!rn || M.bases[b]) continue;
      if (M.outs === 2 && M.strikes === 2) continue;
      const p = (rn.spd >= 7 ? .1 + (rn.spd - 7) * .07 : .02) * (C ? 1.3 - .06 * C.player.arm : 1) * TUNE.cpuRun * (b === 2 ? .5 : 1);
      if (R() < p) out[b] = true;
    }
    void D; return out;
  },
  /* ---- the fielder holding the ball ---- */
  holderDecision(M, f) {
    const P = M.park, live = BZ.play.liveRunners(M), sp = BZ.throwSpeed(M, f, .8), fsp = BZ.fielderSpeed(M, f);
    const cand = [];
    for (const r of live) {
      if (r.delay > 0) continue;
      const tgt = Math.round(r.goal), onBase = Math.abs(r.p - Math.round(r.p)) < .02 && Math.round(r.p) === tgt;
      if (onBase && !r.mustTag) continue;
      const base = r.mustTag && r.p > r.mustTag + .02 ? r.mustTag : (r.goal > r.p ? Math.ceil(r.p - 1e-6) : Math.floor(r.p + 1e-6));
      if (base < 1 || base > 4) continue;
      const bp = P.base(base), rsp = BZ.runSpeed(M, r) / 300, tR = Math.abs(base - r.p) / rsp;
      const force = (r.forced && base === r.start + 1) || (r.mustTag && base === r.mustTag);
      const dSelf = Math.hypot(f.x - bp.x, f.y - bp.y);
      const rec = BZ.play.receiverFor(M, base, f), tRec = rec ? Math.hypot(rec.x - bp.x, rec.y - bp.y) / BZ.fielderSpeed(M, rec) : 9;
      const tThrow = (['LF', 'CF', 'RF'].includes(f.pos) ? .24 : .17) + dSelf / BZ.throwPace(M, f, dSelf), tRun = dSelf / fsp;
      const value = base * 10 + (force ? 5 : 0);
      if ((force || !onBase) && tRun + .05 < tR && dSelf < 70) cand.push({ kind: 'run', base, x: bp.x, y: bp.y, value: value + 3, margin: tR - tRun });
      else if (Math.max(tThrow, tRec) + .08 < tR || (force && Math.max(tThrow, tRec) < tR + .02)) cand.push({ kind: 'throw', base, value, margin: tR - tThrow });
      // a runner caught between bases: run him down
      const rp = BZ.runnerPos(M, r.p), dr = Math.hypot(rp.x - f.x, rp.y - f.y);
      if (!onBase && !force && dr < 70) cand.push({ kind: 'run', x: rp.x, y: rp.y, value: value + 1, chase: r });
    }
    if (cand.length) {
      cand.sort((a, b) => b.value - a.value);
      const c = cand[0];
      if (c.kind === 'throw' && BZ.defense(M).meter >= 50 && !M.fast && Math.hypot(f.x - P.base(c.base).x, f.y - P.base(c.base).y) > 300 && c.margin < .4 && BZ.R() < .5) c.laser = true;
      return c;
    }
    // nothing to get: bring the ball in
    const r0 = Math.hypot(f.x - P.H.x, f.y - P.H.y);
    if (r0 > 520) {
      const lead = live.filter(r => !r.isBatter || r.p > 0).sort((a, b) => b.p - a.p)[0];
      const base = lead ? clamp(Math.floor(lead.p + 1e-6) + 1, 2, 4) : 2, bp = P.base(base), d = Math.hypot(f.x - bp.x, f.y - bp.y);
      const cut = M.fielders.find(o => o.role === 'cutoff' && o !== f);
      if (cut && d > 520 && Math.hypot(cut.x - f.x, cut.y - f.y) > 120) return { kind: 'throw', base: 0, to: cut };
      return { kind: 'throw', base };
    }
    // hold it; a pitcher walks it back to the mound, others toss it in once everyone is set
    if (f.pos !== 'P' && live.every(r => Math.abs(r.p - Math.round(r.p)) < .02) && f.holdT > .8) { const p = M.fielders.find(o => o.pos === 'P'); if (p && p !== f && Math.hypot(p.x - f.x, p.y - f.y) > 30) return { kind: 'throw', base: 0, to: p, power: .5 }; }
    return null;
  },
  /** when the ball gets to base b (seconds from now) */
  ballETA(M, base) {
    const P = M.park, bp = P.base(base), b = M.ball, h = BZ.play.holder(M), pl = M.play;
    if (h) {
      const rec = BZ.play.receiverFor(M, base, h), tRec = rec ? Math.hypot(rec.x - bp.x, rec.y - bp.y) / BZ.fielderSpeed(M, rec) : 1;
      const of = ['LF', 'CF', 'RF'].includes(h.pos), d = Math.hypot(h.x - bp.x, h.y - bp.y), tt = (h.throwT > 0 ? h.throwT : (of ? .24 : .17) + Math.max(0, h.decideT || 0)) + d / BZ.throwPace(M, h, d);
      return Math.max(Math.min(tt, d / BZ.fielderSpeed(M, h)), d < 10 ? 0 : tRec * .8);
    }
    if (b.mode === 'thrown') { const lt = pl.lastThrow, rem = lt ? Math.max(0, lt.eta - pl.t) : .3; return lt && lt.base === base ? rem : rem + .4 + Math.hypot(b.x - bp.x, b.y - bp.y) / 500; }
    // the ball is loose or in the air: the chaser gets it, then throws
    const c = pl.chaser; let tGet = 1.5, gx = b.x, gy = b.y;
    if (c) { const cp = c.catchAt || { x: c.tx, y: c.ty }; tGet = Math.max(Math.hypot(cp.x - c.x, cp.y - c.y) / BZ.fielderSpeed(M, c), pl.pred && pl.pred.land && !b.bounced ? Math.max(0, pl.pred.land.t - (pl.t - (pl.predT0 || 0))) : 0); gx = cp.x; gy = cp.y; }
    const far = Math.hypot(gx - M.park.H.x, gy - M.park.H.y) > 470;
    return tGet + (far ? .65 : .4) + Math.hypot(gx - bp.x, gy - bp.y) / 500;
  },
  runnerDecide(M, r, live) {
    if (r.human && r.orderT > 0) return;
    const b = M.ball, pl = M.play, P = M.park, rsp = BZ.runSpeed(M, r) / 300, cpu = Math.max(.3, TUNE.cpuRun);
    const humanSide = BZ.offense(M).humans.length > 0;
    if (humanSide && BZ.game && BZ.game.settings && BZ.game.settings.baserunning === 'manual' && !r.isBatter && !r.forced && !M.attract) {
      if (r.mustTag) r.goal = r.mustTag;
      return;
    }
    if (r.mustTag) { r.goal = r.mustTag; return; }
    const outs = M.outs;
    const fly = b.mode === 'batted' && !b.bounced && !b.touched;
    if (fly && pl.kind === 'batted') {
      if (r.isBatter) { r.goal = Math.max(r.goal, 1); return; }
      if (outs >= 2) { r.goal = Math.min(4, Math.max(r.goal, Math.floor(r.p + 1e-6) + 1)); return; }
      const land = pl.pred && pl.pred.land, deep = land && Math.hypot(land.x - P.H.x, land.y - P.H.y) > 560;
      if (r.start === 3 && deep) { r.goal = 3; return; }   // stay to tag
      r.goal = r.forced ? r.start + .55 : r.start + .45;
      return;
    }
    if (pl.caughtFly && !r.tagged && r.p <= r.start + .001) r.tagged = true;
    // the time race: to the next base, or (rounding a base at speed) to the one after it
    if (r.forced && r.goal < r.start + 1) r.goal = r.start + 1;
    const at = Math.floor(r.p + 1e-6), frac = r.p - at;
    if (r.goal >= at + 1 && frac > .45 && frac < .78) return;   // past halfway and going: committed
    const rounding = r.goal >= at + 1 && frac > .78 && at + 2 <= 4;
    const nb = rounding ? at + 2 : Math.min(4, at + 1);
    const margin = (r.tagged && pl.caughtFly ? .02 : .2) / cpu;
    const tR = (nb - r.p) / rsp, tB = this.ballETA(M, nb);
    if (tR + margin < tB) { r.goal = Math.max(r.goal, nb); return; }
    if (rounding) { r.goal = at + 1; return; }                                   // stop at the base ahead
    if (r.isBatter && r.p < 1) { r.goal = Math.max(r.goal, 1); return; }
    if (frac < .02) { r.goal = (r.forced && at < r.start + 1) ? r.start + 1 : at; return; }   // on a base: hold
    // caught between bases: on, or back?
    if (r.forced && at < r.start + 1) { r.goal = r.start + 1; return; }
    const back = at, tBack = frac / rsp, tBallBack = this.ballETA(M, Math.max(1, back));
    if (back < r.base || back < 1) { r.goal = at + 1; return; }
    // a runner on his way turns back only when clearly beaten; one heading back goes on only when clearly safe
    const going = r.goal > r.p;
    r.goal = going ? (tR - tB > .15 && tBack < tBallBack ? back : at + 1) : (tR + margin < tB ? at + 1 : back);
  },
  runnerTurbo(M, r) { return Math.abs(r.goal - r.p) > .05 && BZ.offense(M).turbo > 25 && (r.p - Math.floor(r.p)) > .55 && r.goal > r.p && !!BZ.play.holder(M); },   // the back half of a close race
  /* ---- the CPU's own swing: scheduled at release ---- */
  cpuSwingSchedule(M, side, pitch) {
    const plan = this.batterPlan(M, side, pitch), S = BZ.SWINGS[plan.type] || BZ.SWINGS.contact;
    if (!plan.swing) return null;
    return { plan, pressAt: pitch.T - S.delay + plan.e };
  }
};

/* =============================================================================
 * THE BOT: plays a side through its player's inputs
 * ========================================================================== */
BZ.bot = {
  sides: {},   // side -> { level, cheats }
  on(side, o = {}) { this.sides[side] = Object.assign({ level: 'batzooka', perfect: false }, o); },
  off(side) { delete this.sides[side]; },
  active(side) { return !!this.sides[side]; },
  held: new Set(),
  hold(I, a, on = true) { const k = I.player + ':' + a; if (on) { if (!this.held.has(k)) { I.hold(a, true); this.held.add(k); } } else if (this.held.has(k)) { I.hold(a, false); this.held.delete(k); } },
  releaseAll(I) { for (const k of [...this.held]) { const [p, a] = k.split(':'); if (+p === I.player) { I.hold(a, false); this.held.delete(k); } } },
  steer(I, dx, dz, dead = .6) {
    this.hold(I, 'right', dx > dead); this.hold(I, 'left', dx < -dead);
    this.hold(I, 'up', dz > dead); this.hold(I, 'down', dz < -dead);
  },
  /** each step, before the match updates: press and hold the bot side's buttons */
  update(M, dt) {
    for (const side of [0, 1]) {
      const B = this.sides[side]; if (!B) continue;
      const T = M.teams[side], I = T.humans[0] && T.humans[0].input; if (!I) continue;
      const off = BZ.offense(M) === T;
      if (M.phase === 'atBat') this.atBat(M, T, I, off, B, dt);
      else if (M.phase === 'inPlay') { this.releaseDirs(I); this.inPlay(M, T, I, off, B, dt); }
      else { this.releaseAll(I); if (M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'pregame' || M.phase === 'halfStart') { if (BZ.F() < .1) I.tap('south'); } }
    }
  },
  releaseDirs(I) { for (const a of ['up', 'down', 'left', 'right']) this.hold(I, a, false); },
  atBat(M, T, I, off, B, dt) {
    const S = M.ab;
    if (!S) return;
    if (off) {
      // batting: plan at release, steer the reticle to the planned point, press at the planned time
      if (S.sub === 'flight' && S.pitch && !S.botPlan) {
        const plan = BZ.ai.batterPlan(M, T.side, S.pitch); plan.e = BZ.Rn(BZ.LEVELS[B.level].swingSd);
        if (B.perfect) { const c = S.pitch.cross(); plan.e = 0; plan.swing = BZ.inZone(c.x, c.z, (M.batter.look && M.batter.look.size) || 1.25); plan.rx = c.x; plan.rz = c.z - .8; plan.type = 'power'; plan.bunt = false; }
        if (B.take) plan.swing = false;
        S.botPlan = plan; S.botPressAt = plan.swing ? S.pitch.T - (BZ.SWINGS[plan.type] || BZ.SWINGS.contact).delay + plan.e : 99;
        if (plan.zooka && T.meter >= 100 && !T.batzookaArmed) I.tap('r1');
      }
      if (S.sub === 'select' || S.sub === 'windup') { const ret = M.reticle; this.steer(I, -ret.x * .3, (17 - ret.z) * .3, .9); }
      if (S.botPlan) {
        const p = S.botPlan, ret = M.reticle; this.steer(I, p.rx - ret.x, p.rz - ret.z, .7);
        if (p.swing && !S.swing && S.pitch.t >= S.botPressAt) {
          if (p.type === 'bunt') this.hold(I, 'north', true);
          else I.tap(p.type === 'power' ? 'west' : 'south');
        }
      }
    } else {
      // pitching: pick, aim, release on the ring
      if (S.sub === 'select' && !S.botPick && S.t > .35) {
        const ch = BZ.ai.choosePitch(M, T.side); S.botPick = ch;
        if (B.strikes) ch.target = [(BZ.R() - .5) * 6, 17];
        I.tap(ch.slot === 'r1' ? 'r1' : ch.slot);
      }
      if (S.sub === 'windup' && S.botPick) {
        const tg = S.botPick.target, mk = M.marker; this.steer(I, tg[0] - mk.x, tg[1] - mk.z, .6);
        const ringAt = S.windT - BZ.RING * 0 + .0, err = (1 - BZ.LEVELS[B.level].relQ) * .12;
        if (!S.released && !S.botRel && S.t >= S.windT + err * (BZ.R() - .5)) { S.botRel = true; I.tap(S.slot === 'r1' ? 'r1' : S.slot); }
        void ringAt;
      }
      if (S.sub === 'flight') this.releaseDirs(I);
    }
  },
  inPlay(M, T, I, off, B) {
    if (off) return;   // the bot's runners run on auto baserunning
    const h = BZ.play.holder(M);
    if (!h || !h.human || h.throwT > 0) { if (this.throwHeld) { this.hold(I, this.throwHeld, false); this.throwHeld = null; } return; }
    if (this.throwHeld) { this.botHoldT = (this.botHoldT || 0) + 1 / 120; if (this.botHoldT > .42) { this.hold(I, this.throwHeld, false); this.throwHeld = null; } return; }
    const act = BZ.ai.holderDecision(M, h);
    if (act && act.kind === 'throw' && act.base >= 1) { this.throwHeld = BZ.BASE_BTN[act.base]; this.botHoldT = 0; this.hold(I, this.throwHeld, true); }
    else if (act && act.kind === 'run') { h.botRun = act; }
  }
};

/* ===== src/21-cams.js ===== */
/* =============================================================================
 * 21-cams: what the player sees. Each step the match becomes a FRAME (a plain
 * snapshot: ball, fielders, runners, batter); rigs animate from frames; the
 * Plate Cam (Mode 7 from behind the catcher), the Broadcast Cam (a ground view
 * over the park's TileMap), the Moonshot Cam (a Mode 7 chase of a home run) and
 * the Replay Cam (recorded frames replayed at half speed in the isometric view)
 * all draw frames. Camera framing, cut-ins and the pointer-to-zone mapping too.
 * ========================================================================== */
BZ.VIEWS = {};
BZ.makeViews = () => {
  BZ.VIEWS.broadcast = E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 52, 1, 1);
  BZ.VIEWS.high = E.VIEWS.high = new E.View('high', 'High', 0, 70, 1, 1);
  BZ.VIEWS.iso = E.VIEWS.iso;
};
BZ.fieldView = () => { const s = BZ.game.settings && BZ.game.settings.fieldCam; return s === 'high' ? 'high' : s === 'iso' ? 'iso' : 'broadcast'; };
const ZOOMS = [.5, .62, .78, 1];

BZ.cams = {
  mode: 'plate', shake: 0, zoomI: 3, focus: { x: 0, y: 0, z: 0 }, replay: null, ring: [], ringT: 0, cut: 0, moon: null,
  /** the frame: everything drawing needs, from the match */
  frame(M) {
    const P = M.park, b = M.ball, S = M.ab, H = P.H;
    const fr = { t: M.clock, ball: { x: b.x, y: b.y, z: b.z, mode: b.mode, inv: b.invisible, zooka: b.boost > 0 || (M.lastBatted && M.lastBatted.zooka && b.mode === 'batted'), laser: b.laser && b.mode === 'thrown', trail: b.trail ? b.trail.slice(-12) : [] }, fielders: [], runners: [], batter: null, phase: M.phase, sub: S && S.sub };
    for (const f of M.fielders) fr.fielders.push({ id: f.player.id, job: f.pos === 'C' ? 'catch' : f.pos === 'P' ? 'pitch' : 'field', pos: f.pos, x: f.x, y: f.y, z: f.z, vx: f.vx || 0, vy: f.vy || 0, facing: f.facing, state: f.state, has: f.has, throwT: f.throwT, human: f.human ? f.human.player : 0, charge: f.charge ? f.charge.t : 0, tag: f.tagT > 0 });
    if (M.phase === 'inPlay' || M.phase === 'playOver' || (M.runners && M.runners.length && M.phase !== 'atBat')) {
      for (const r of M.runners) { if (r.state === 'out' || r.state === 'scored' || r.state === 'cancel') continue; const p = BZ.runnerPos(M, r.p), q = BZ.runnerPos(M, Math.min(4, r.p + .01)); fr.runners.push({ id: r.player.id, x: p.x, y: p.y, facing: Math.atan2(q.y - p.y, q.x - p.x) + (r.goal < r.p ? Math.PI : 0), moving: r.state === 'run', slide: r.slide > 0, head: r.headfirst, turbo: r.turbo, fire: BZ.offense(M).afterburn > 0, human: r.human }); }
    }
    // runners standing on base between pitches
    if (M.phase === 'atBat') for (let i = 0; i < 3; i++) if (M.bases[i]) { const bp = P.base(i + 1), lead = (M.leads[i + 1] ? 24 : 12), nx = P.base(i + 2); const dx = nx.x - bp.x, dy = nx.y - bp.y, d = Math.hypot(dx, dy); fr.runners.push({ id: M.bases[i].id, x: bp.x + dx / d * lead, y: bp.y + dy / d * lead, facing: Math.atan2(H.y - bp.y, H.x - bp.x), moving: false, lead: true }); }
    if (M.phase === 'atBat' || M.phase === 'pregame' || M.phase === 'halfStart') {
      const lefty = (M.batter.bt || 'R/R')[0] === 'L';
      fr.batter = { id: M.batter.id, x: H.x + (lefty ? 18 : -18), y: H.y - 4, facing: lefty ? Math.PI : 0, lefty, swing: S && S.swing ? { type: S.swing.type, t: S.pitch ? S.pitch.t - S.swing.t0 : 0 } : null, bunt: S && S.bunting, zooka: BZ.offense(M).batzookaArmed };
    }
    if (S && S.pitch && (S.sub === 'flight' || S.sub === 'settle')) { const u = S.pitch.u, p = S.pitch.pos(Math.min(u, 1.12)); fr.pitch = { x: H.x + p.x, y: H.y + p.y, z: p.z, u, vis: S.pitch.visible(u), type: S.type, def: S.pitch.def, speed: S.pitch.speed, t: S.pitch.t }; }
    fr.windup = S && S.sub === 'windup' ? { u: S.t / S.windT, t: S.t, windT: S.windT } : null;
    fr.released = S && S.sub === 'flight' ? S.t : -1;
    return fr;
  },
  /** record the last 8 s of frames (60 Hz) for replays */
  record(M, fr, dt) { this.ringT += dt; if (this.ringT < 1 / 60) return; this.ringT = 0; this.ring.push(fr); if (this.ring.length > 480) this.ring.shift(); },
  startReplay(M, seconds = 5) {
    if (!this.ring.length) return false;
    const n = Math.min(this.ring.length, Math.round(seconds * 60));
    this.replay = { frames: this.ring.slice(-n), i: 0, acc: 0 };
    BZ.bus.emit('replay', {});
    return true;
  },
  /* ---- rigs follow frames ---- */
  animate(M, fr, dt) {
    if (!BZ.cosmetic) return;
    const t = fr.t;
    for (const f of fr.fielders) {
      const pl = BZ.get('players', f.id); if (!pl) continue;
      const rig = BZ.rigFor(pl, f.job);
      const s = { x: f.x, y: f.y, z: f.z, vx: f.vx, vy: f.vy, facing: f.facing };
      if (f.pos === 'C' && (fr.phase === 'atBat' || fr.phase === 'halfStart')) { s.pose = 'crouch'; s.vx = s.vy = 0; s.facing = -Math.PI / 2; }
      if (f.pos === 'P' && fr.phase === 'atBat') {
        s.facing = Math.PI / 2;
        if (fr.windup) { const u = fr.windup.u; s.attack = u < .58 ? BZ.atk('knee', 'wind', u / .58) : BZ.atk('throw', 'wind', (u - .58) / .42); }
        else if (fr.released >= 0) s.attack = BZ.motionAt('throw', fr.released, 0, .08, .35);
      }
      if (f.state === 'dive' || f.state === 'prone') { s.down = .75; s.facing = f.facing + Math.PI; }
      if (f.state === 'jump') s.air = true;
      if (f.state === 'climb') { s.climb = true; s.vz = 60; }
      if (f.state === 'down') { s.pose = 'down'; }
      if (f.state === 'throw') s.attack = BZ.atk('throw', 'wind', clamp(1 - f.throwT / .22, 0, 1));
      if (f.tag) s.attack = BZ.atk(BZ.MOTION.tag, 'active', .5);
      if (f.charge) s.attack = BZ.atk('throw', 'wind', Math.min(1, f.charge / .6) * .8);
      if (f.state === 'celebrate') s.pose = 'cheer';
      if (f.state === 'sad') { s.pose = 'kneel'; s.expr = 'wince'; }
      BZ.rigUpdate(rig, dt, s);
    }
    for (const r of fr.runners) {
      const pl = BZ.get('players', r.id); if (!pl) continue;
      const rig = BZ.rigFor(pl, 'run');
      const s = { x: r.x, y: r.y, z: 0, facing: r.facing, vx: r.moving ? Math.cos(r.facing) * 140 : 0, vy: r.moving ? Math.sin(r.facing) * 140 : 0, sprint: r.turbo };
      if (r.slide) { s.down = .7; if (r.head) s.facing = r.facing + Math.PI; }
      if (r.cheer) s.pose = 'cheer';
      BZ.rigUpdate(rig, dt, s);
    }
    if (fr.batter) {
      const pl = BZ.get('players', fr.batter.id), rig = BZ.rigFor(pl, 'bat'), B = fr.batter;
      const s = { x: B.x, y: B.y, z: 0, facing: B.facing, vx: 0, vy: 0 };
      if (B.swing) { const S = BZ.SWINGS[B.swing.type] || BZ.SWINGS.contact, spec = B.swing.type === 'contact' ? BZ.MOTION.swing : BZ.MOTION.power; s.attack = BZ.motionAt(spec, B.swing.t, Math.max(.02, S.delay - .04), .08, .32); }
      else if (B.bunt) s.attack = BZ.atk(BZ.MOTION.bunt, 'active', .5);
      else { rig.sqV += Math.sin(t * 5 + (pl.num || 1)) * .004; }
      BZ.rigUpdate(rig, dt, s);
    }
    const ump = BZ.umpireRig(), H = M.park.H;
    BZ.rigUpdate(ump, dt, { x: H.x, y: H.y + 30, z: 0, facing: -Math.PI / 2, pose: fr.phase === 'atBat' ? 'crouch' : null, attack: M.umpCall ? BZ.motionAt(M.umpCall.spec, M.umpCall.t, .12, .1, .6) : null, expr: M.umpCall && M.umpCall.t < .8 ? 'shout' : null });
    if (M.umpCall) { M.umpCall.t += dt; if (M.umpCall.t > 1) M.umpCall = null; }
  },
  /* ---- the pointer on the strike-zone plane (Mode 7's projection, inverse-interpolated) ---- */
  pointerToZone(p) {
    const M = BZ.M, m7 = M && BZ.mode7(M.parkId); if (!M || !m7 || this.mode !== 'plate' || !BZ.game.r) return null;
    const H = M.park.H, y = H.y - 6, a = m7.project(H.x, y, 0), b = m7.project(H.x + 1, y, 0), c = m7.project(H.x, y, 1);
    if (!a || !b || !c) return null;
    const sx = p[0] * (BZ.game.r.W / BZ.game.r.W), x = (sx - a[0]) / (b[0] - a[0]), z = (p[1] - a[1]) / (c[1] - a[1]);
    return [x, z];
  },
  plateCam(M) {
    const P = M.park, H = P.H, lefty = M.batter && (M.batter.bt || 'R/R')[0] === 'L', side = lefty ? -4 : 4, close = BZ.game.settings && BZ.game.settings.plateCam === 'close';
    return { x: H.x + side, y: H.y + (close ? 60 : TUNE.plateDist), h: close ? 36 : TUNE.plateHeight, angle: -Math.PI / 2, pitch: 9, fov: close ? 40 : TUNE.plateFov };
  },
  /* ---- the camera each step ---- */
  update(M, dt) {
    const g = BZ.game;
    this.shake = Math.max(0, this.shake - dt);
    if (this.replay) return;
    if (this.moon) { this.moon.t += dt; return; }
    const want = (M.phase === 'atBat' || M.phase === 'pregame' && false) ? 'plate' : (M.phase === 'inPlay' || M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'between' || M.phase === 'halfStart' || M.phase === 'rhubarb' || M.phase === 'final' || M.phase === 'pregame' || M.phase === 'boom') ? 'field' : 'plate';
    if (want !== this.mode) { this.mode = want; this.cut = .3; if (want === 'field') { this.zoomI = 3; g.cam.snap = true; } }
    this.cut = Math.max(0, this.cut - dt);
    if (this.mode === 'field') this.frameField(M, dt);
  },
  frameField(M, dt) {
    const g = BZ.game, P = M.park, H = P.H, b = M.ball, pts = [];
    if (M.phase === 'inPlay' || M.phase === 'playOver') {
      if (b.mode !== 'none') pts.push({ x: b.x, y: b.y, z: BZ.displayZ(b.z) });
      const pr = M.play && M.play.pred; if (pr && pr.land && b.mode === 'batted' && !b.bounced) pts.push({ x: pr.land.x, y: pr.land.y, z: 0 });
      const h = BZ.play.holder(M);
      if (h) { pts.push(h); const lt = M.play.lastThrow; if (h.throwBase) pts.push(P.base(h.throwBase)); }
      else if (M.play && M.play.chaser) pts.push(M.play.chaser);
      const lead = M.runners.filter(r => r.state === 'run').sort((a, c) => c.p - a.p)[0]; if (lead && pts.length < 3) pts.push(BZ.runnerPos(M, lead.p));
      if (!pts.length) pts.push({ x: H.x, y: H.y - 200, z: 0 });
    } else if (M.phase === 'rhubarb') { pts.push({ x: H.x - 60, y: H.y - 40 }, { x: H.x + 60, y: H.y + 10 }); }
    else if (M.phase === 'between' && BZ.crowd && BZ.crowd.showFocus) pts.push(...BZ.crowd.showFocus(M));
    else { pts.push({ x: H.x - 230, y: H.y - 470 }, { x: H.x + 230, y: H.y + 10 }); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zm = 0;
    for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y - (p.z || 0) * .8); y1 = Math.max(y1, p.y); zm = Math.max(zm, p.z || 0); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = (x1 - x0) + 120, h = (y1 - y0) * .8 + 110;
    const r = g.r, W = r ? r.W : 427, Hh = r ? r.H : 240;
    const need = Math.min(W / w, Hh / h) / TUNE.fieldZoom;
    // discrete zoom levels with hysteresis (each level's floor is baked once)
    let zi = this.zoomI;
    while (zi > 0 && ZOOMS[zi] > need * 1.02) zi--;
    while (zi < ZOOMS.length - 1 && ZOOMS[zi + 1] < need * .82) zi++;
    if (zi !== this.zoomI) { this.zoomI = zi; }
    const z = clamp(ZOOMS[this.zoomI] * TUNE.fieldZoom, .5, 2.5);
    if (Math.abs(g.zoom - z) > .001) g.setZoom(z);
    this.focus.x += (cx - this.focus.x) * Math.min(1, dt * 7); this.focus.y += (cy - this.focus.y) * Math.min(1, dt * 7);
    if (this.cut > .25) { this.focus.x = cx; this.focus.y = cy; }
    g.focus(this.focus.x, this.focus.y, 0);
    g.cam.smooth = .12;
  },
  /** the Moonshot Cam: a Mode 7 chase of a home run in slow motion, then the landing */
  startMoonshot(M, then) {
    if (M.fast || !BZ.cosmetic) { then && then(); return; }
    const b = M.ball, v = Math.hypot(b.vx, b.vy) || 1;
    this.moon = { t: 0, x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, boost: b.boost, angle: Math.atan2(b.vy, b.vx), then, landed: false };
    BZ.game.timeScale = .45 * TUNE.gameSpeed;
    BZ.bus.emit('cinematic', { kind: 'moonshot' });
    void v;
  },
  moonStep(M, dt) {
    const m = this.moon; if (!m) return;
    const g = BZ.gravity(M.park), sd = dt;
    if (!m.landed) {
      m.vz -= g * sd; const dr = TUNE.drag * sd; m.vx -= m.vx * dr; m.vy -= m.vy * dr;
      if (m.boost > 0) { const s = Math.hypot(m.vx, m.vy, m.vz) || 1; m.vx += m.vx / s * 900 * sd; m.vy += m.vy / s * 900 * sd; m.vz += m.vz / s * 900 * sd; m.boost -= sd; }
      m.x += m.vx * sd; m.y += m.vy * sd; m.z += m.vz * sd;
      if (BZ.cosmetic && BZ.F() < .5) BZ.game.particles.add({ kind: m.boost > 0 ? 'fire' : 'smoke', x: m.x, y: m.y, z: m.z, life: .6 });
      if (m.z <= 0 || m.t > 3.4) { m.landed = true; m.lt = m.t; BZ.bus.emit('moonLand', { x: m.x, y: m.y }); BZ.game.timeScale = TUNE.gameSpeed; }
    }
    if (m.landed && m.t - m.lt > 1.3) { const cb = m.then; this.moon = null; BZ.game.timeScale = TUNE.gameSpeed; if (cb) cb(); }
  },

  /* ---- drawing: the Plate Cam ---- */
  drawPlate(r, M, fr) {
    const P = M.park, m7 = BZ.mode7(M.parkId), t = r.game.time, hype = BZ.supers.hype(M);
    m7.cam = this.plateCam(M);
    if (this.shake > 0) { m7.cam.x += (BZ.F() - .5) * 2; m7.cam.h += (BZ.F() - .5) * 2; }
    P.feedMode7(m7, t, hype);
    if (BZ.hazard && BZ.hazard.drawM7) BZ.hazard.drawM7(m7, M, t);
    // players: fielders (the catcher in front), runners leading off, the batter
    for (const f of fr.fielders) {
      const pl = BZ.get('players', f.id), rig = BZ.rigFor(pl, f.job); if (!rig) continue;
      // the catcher: drawn smaller and lower than true perspective (as classic baseball games do) so the zone stays clear
      if (f.pos === 'P' && M.derby) { m7.shape('bz_pitchomatic', f.x, f.y, 0, { facing: Math.PI / 2, size: 1.4 }); continue; }   // the Derby's Pitch-O-Matic 3000
      if (f.pos === 'C') { m7.add(f.x, f.y, 0, (g, sx, sy, k) => { const kk = k * .5, H0 = BZ.cams.zoneBottomY || sy; px.blend(g, .9, 'normal', () => rig.draw(g, Math.round(sx), Math.round(Math.max(sy, H0 + 20 * kk * 1.25 + 4)), m7.view(kk))); }); continue; }
      m7.rig(rig, f.x, f.y, f.z);
      m7.add(f.x, f.y, -.5, (g, sx, sy, k) => { px.blend(g, .3, 'multiply', () => px.ell(g, sx, sy, Math.max(1, 6 * k), Math.max(1, 2 * k), '#000')); });
    }
    for (const rn of fr.runners) { const rig = BZ.rigFor(BZ.get('players', rn.id), 'run'); if (rig) m7.rig(rig, rn.x, rn.y, 0); }
    if (fr.batter) {
      const B = fr.batter, rig = BZ.rigFor(BZ.get('players', B.id), 'bat');
      m7.rig(rig, B.x, B.y, 0);
      if (B.zooka) { const T = BZ.offense(M).def; m7.add(B.x, B.y + 1, 0, (g, sx, sy, k) => BZ.drawBatzooka(g, rig, (x, y, z) => m7.project(x, y, z), k, t, T.zookaColors)); }
    }
    // the pitch
    if (fr.pitch && fr.pitch.vis) {
      const p = fr.pitch;
      m7.add(p.x, p.y, 0, (g, sx, sy, k) => {
        const q = m7.project(p.x, p.y, p.z); if (!q) return;
        const rad = Math.max(1.2, 1.6 * q[2] * (p.def.tiny ? .45 : 1));
        BZ.drawPitchTrail(g, m7, p, q, rad, t, M);
        px.ell(g, q[0], sy, Math.max(1, rad), Math.max(.5, rad * .35), '#00000060');
        px.disc(g, q[0], q[1], rad, p.def.tiny ? '#1a0a2a' : '#f8f8f4'); if (rad > 2.5) { px.dot(g, q[0] - rad * .3, q[1] - rad * .3, '#ffffff'); px.line(g, q[0] - rad * .5, q[1] + rad * .2, q[0] + rad * .4, q[1] - rad * .3, '#d83a2a'); }
        if (M.golden || (M.derby && M.derby.golden)) px.blend(g, .6, 'add', () => px.disc(g, q[0], q[1], rad + 1, '#ffd040'));
      });
    } else if (fr.pitch && !fr.pitch.vis) {
      const p = fr.pitch; m7.add(p.x, p.y, 0, (g, sx, sy, k) => { const q = m7.project(p.x, p.y, p.z); if (q && BZ.F() < .4) px.blend(g, .25, 'add', () => px.disc(g, q[0], q[1], 1.6 * q[2], '#a0ffe0')); });
    }
    // the ball in the pitcher's glove / the umpire is not drawn here (he'd fill the screen)
    m7.draw(r, m7.cam);
    { const zb = m7.project(P.H.x, P.H.y - 6, BZ.GEO.zoneLo); this.zoneBottomY = zb ? zb[1] : null; }
    BZ.hud && BZ.hud.plateOverlay(r, M, fr, m7);
  },
  /* ---- drawing: the Broadcast Cam (and replays) ---- */
  drawField(r, M, fr) {
    const P = M.park, t = r.game.time, hype = BZ.supers.hype(M), H = P.H;
    const bd = BZ.backdrop(M.parkId);
    if (bd && r.view.pitchDeg < 60) { /* the sky past the far stands (a ground view's floor runs to the edges) */ }
    P.drawBroadcast(r, t, hype);
    if (BZ.hazard && BZ.hazard.draw) BZ.hazard.draw(r, M, t);
    if (BZ.crowd) BZ.crowd.drawField(r, M, t);
    // players
    const actor = (rig, x, y, z, o) => r.actor(x, y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), o);
    for (const f of fr.fielders) {
      if (f.pos === 'P' && M.derby) { r.shape('bz_pitchomatic', f.x, f.y, 0, { facing: Math.PI / 2, scale: 1.4 }); continue; }
      const rig = BZ.rigFor(BZ.get('players', f.id), f.job); if (!rig) continue;
      r.shadow(f.x, f.y, 6, .4);
      actor(rig, f.x, f.y, f.z, { outline: f.human ? E.PLAYER_COLORS[(f.human - 1) % 4] : undefined, xray: !!f.human });
      if (f.human) BZ.hud && BZ.hud.playerArrow(r, f, f.human);
      if (f.has && f.charge) BZ.hud && BZ.hud.throwMeter(r, f);
    }
    for (const rn of fr.runners) {
      const rig = BZ.rigFor(BZ.get('players', rn.id), 'run'); if (!rig) continue;
      r.shadow(rn.x, rn.y, 6, .4);
      actor(rig, rn.x, rn.y, 0);
      if (rn.fire && rn.moving && BZ.F() < .5) r.game.particles.add({ kind: 'fire', x: rn.x, y: rn.y, z: 2, life: .35 });
      if ((rn.slide || rn.turbo) && rn.moving && BZ.F() < .4) r.game.particles.dust(rn.x, rn.y, 1, 1);
    }
    if (fr.batter) { const rig = BZ.rigFor(BZ.get('players', fr.batter.id), 'bat'); r.shadow(fr.batter.x, fr.batter.y, 6, .4); actor(rig, fr.batter.x, fr.batter.y, 0); }
    const ump = BZ.umpireRig(); r.shadow(H.x, H.y + 30, 6, .4); actor(ump, H.x, H.y + 30, 0);
    // the ball, its shadow, its trail and the landing marker
    const b = fr.ball;
    if (b.mode !== 'none' && b.mode !== 'held' && b.mode !== 'pitch') {
      const dz = BZ.displayZ(b.z);
      r.shadow(b.x, b.y, 2.4, .5);
      if (!b.inv) {
        if (b.trail && b.trail.length > 2 && (b.zooka || b.laser || Math.hypot(M.ball.vx, M.ball.vy) > 500)) r.queue(b.x, b.y, dz, g => { let prev = null; b.trail.forEach((p, i) => { const q = r.w(p[0], p[1], BZ.displayZ(p[2])); if (prev) px.line(g, prev[0], prev[1], q[0], q[1], b.laser ? '#ff3a3a' : b.zooka ? (i % 2 ? '#ffd040' : '#ff6a1a') : '#ffffff80', b.zooka ? 2 : 1); prev = q; }); }, { emissive: b.zooka || b.laser });
        r.queue(b.x, b.y, dz, g => { const q = r.w(b.x, b.y, dz), s = Math.max(1.5, 2.2 * (r.view.scale || 1) * (r.game.zoom || 1)); px.disc(g, q[0], q[1], s, '#ffffff'); px.dot(g, q[0] - 1, q[1] - 1, '#ffffff'); px.dot(g, q[0], q[1] + 1, '#c83a2a'); }, { bias: 4 });
      }
      const pr = M.play && M.play.pred;
      if (pr && pr.land && M.ball.mode === 'batted' && !M.ball.bounced && fr === this.live) {
        const lx = pr.land.x, ly = pr.land.y, pulse = 1 + .25 * Math.sin(t * 10);
        r.decal(g => { r.groundRing(lx, ly, 9 * pulse, '#ffd040'); const a = r.w(lx - 5, ly - 5, 0), c = r.w(lx + 5, ly + 5, 0), d = r.w(lx + 5, ly - 5, 0), e = r.w(lx - 5, ly + 5, 0); px.line(g, a[0], a[1], c[0], c[1], '#ff5a1a', 2); px.line(g, d[0], d[1], e[0], e[1], '#ff5a1a', 2); });
      }
    }
    if (BZ.hud && fr === this.live) BZ.hud.fieldOverlay(r, M, fr);
  },
  /** draw the Moonshot Cam */
  drawMoon(r, M) {
    const m = this.moon, m7 = BZ.mode7(M.parkId), P = M.park, t = r.game.time;
    const cam = { x: m.x - Math.cos(m.angle) * 70, y: m.y - Math.sin(m.angle) * 70, h: Math.max(20, m.z + 14), angle: m.angle, pitch: 14, fov: 60 };
    if (m.landed) { cam.x = m.x - Math.cos(m.angle) * 140; cam.y = m.y - Math.sin(m.angle) * 140; cam.h = 70; cam.pitch = 16; }
    P.feedMode7(m7, t, 1);
    m7.add(m.x, m.y, 0, (g, sx, sy, k) => {
      const q = m7.project(m.x, m.y, m.z); if (!q) return;
      const rad = Math.max(2, 1.6 * q[2]);
      px.blend(g, .7, 'add', () => { px.disc(g, q[0], q[1] + rad * 1.6, rad * 1.4, '#ff8a2a'); px.disc(g, q[0], q[1] + rad * 3, rad, '#ffd040'); });
      px.disc(g, q[0], q[1], rad, '#ffffff'); px.dot(g, q[0], q[1], '#d83a2a');
      px.ell(g, sx, sy, rad, rad * .35, '#00000050');
    });
    m7.draw(r, cam);
  }
};
/** pitch trails: speed lines, fire, a wave, a swirl, a laser, popcorn, a ghost shimmer */
BZ.drawPitchTrail = (g, m7, p, q, rad, t, M) => {
  const tr = p.def.trail; if (!tr || !BZ.cosmetic) return;
  const S = M.ab && M.ab.pitch; if (!S) return;
  const back = (du) => { const u = Math.max(0, p.u - du), pp = S.pos(u); return m7.project(M.park.H.x + pp.x, M.park.H.y + pp.y, pp.z); };
  if (tr === 'lines') { for (let i = 1; i <= 3; i++) { const b = back(i * .05); if (b) px.line(g, b[0], b[1], q[0], q[1], '#ffffff', 1); } }
  else if (tr === 'fire' || tr === 'embers') px.blend(g, .85, 'add', () => { for (let i = 1; i <= 6; i++) { const b = back(i * .025); if (b) px.disc(g, b[0] + (BZ.F() - .5) * 2, b[1] + (BZ.F() - .5) * 2, rad * (1.4 - i * .18), i < 3 ? '#ffd040' : '#ff5a1a'); } });
  else if (tr === 'laser' || tr === 'zap') { const b = back(.3); if (b) px.blend(g, .9, 'add', () => { px.line(g, b[0], b[1], q[0], q[1], tr === 'laser' ? '#ff2a4a' : '#7af0ff', Math.max(1, Math.round(rad))); px.line(g, b[0], b[1], q[0], q[1], '#ffffff', 1); }); }
  else if (tr === 'wave') px.blend(g, .5, 'normal', () => { const b = back(.25); if (b) px.poly(g, [[b[0] - rad * 3, b[1] + rad * 4], [q[0] - rad * 2, q[1] + rad * 2], [q[0] + rad * 2, q[1] + rad * 2], [b[0] + rad * 3, b[1] + rad * 4]], '#3ac8e8'); });
  else if (tr === 'swirl') px.blend(g, .6, 'normal', () => { for (let i = 0; i < 6; i++) { const a = t * 12 + i; px.dot(g, q[0] + Math.cos(a) * rad * 3, q[1] + Math.sin(a) * rad * 3, '#6a2aa8'); } });
  else if (tr === 'popcorn') { for (const pop of S.pops || []) if (p.u > pop.u && p.u < pop.u + .12) px.disc(g, q[0] + 3, q[1] - 3, rad * 1.3, '#fff4c0'); }
  else if (tr === 'ghost' || tr === 'flutter' || tr === 'sparkle' || tr === 'bubbles') px.blend(g, .4, 'add', () => { const b = back(.06); if (b) px.disc(g, b[0], b[1], rad, tr === 'ghost' ? '#a0ffe0' : tr === 'bubbles' ? '#a0e8ff' : '#fff0a0'); });
};

/* ===== src/22-hud.js ===== */
/* =============================================================================
 * 22-hud: the 10-foot HUD. The scorebug (score, inning, outs, the count, a mini
 * diamond), the meters (BATZOOKA gauge, turbo, wind), the player card, the
 * context prompts in the glyphs of the device used last, call stamps, pitch info,
 * the pitch-select diamond, the Plate Cam overlays (zone, reticle, target marker,
 * release ring, crossing dot, timing feedback), throw targets and the radar.
 * Big, bold, few things at once; nothing important in color alone.
 * ========================================================================== */
const SAFE = 12;
BZ.hud = {
  stamps: [], toasts: [], feedback: null, info: null,
  stamp(text, o = {}) {
    if (!BZ.cosmetic) return;
    this.stamps = this.stamps.filter(s => s.prio > (o.prio || 1));
    this.stamps.push({ text, t: 0, dur: o.dur || 1.4, colors: o.colors || ['#fff6c0', '#ffb030', '#d8501a'], scale: o.scale || 3, prio: o.prio || 1, sub: o.sub });
  },
  toast(text, dur = 2.2) { this.toasts.push({ text, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); },
  step(dt) {
    for (const s of this.stamps) s.t += dt; this.stamps = this.stamps.filter(s => s.t < s.dur);
    for (const s of this.toasts) s.t += dt; this.toasts = this.toasts.filter(s => s.t < s.dur);
    if (this.feedback) { this.feedback.t += dt; if (this.feedback.t > 1.4) this.feedback = null; }
    if (this.info) { this.info.t += dt; if (this.info.t > 2.2) this.info = null; }
  },
  clear() { this.stamps = []; this.toasts = []; this.feedback = null; this.info = null; },
  hidden(M) { return M.cinematic || BZ.cams.replay || BZ.cams.moon || (BZ.talk && BZ.talk.cutscene); },
  /* ---- the whole HUD over the match ---- */
  draw(r, M, fr) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!this.hidden(M) && !M.derby) {
        this.scorebug(g, M);
        this.meters(g, r, M);
        if (M.phase === 'atBat' || M.phase === 'inPlay') this.playerCard(g, r, M);
        this.prompts(g, r, M);
        if (BZ.cams.mode === 'field' && (M.phase === 'inPlay' || M.phase === 'playOver')) this.radar(g, r, M);
        if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select') this.pitchSelect(g, r, M);
        if (M.phase === 'halfEnd' || M.phase === 'final') this.lineScore(g, r, M);
        if (M.phase === 'halfStart' || M.phase === 'pregame') this.inningCard(g, r, M);
        if (M.phase === 'boom' && M.boom) this.boomCard(g, r, M);
      }
      if (BZ.cams.replay) { const k = Math.floor(r.game.real * 3) % 2; E.font.title(g, 'REPLAY', SAFE + 6, SAFE + 4, { scale: 2, colors: ['#ffffff', '#ff5a5a'] }); if (k) px.disc(g, SAFE + 2, SAFE + 9, 3, '#ff2a2a'); BZ.legend(g, r, [['south', 'SKIP']], this.mainInput(M)); }
      this.drawStamps(g, r);
      this.drawToasts(g, r);
      if (this.info && !this.hidden(M)) { const s = this.info; E.font.text(g, s.text, SAFE + 2, SAFE + 52, s.color || '#ffffff', { shadow: '#000', scale: 1 }); }
      if (this.feedback && !this.hidden(M)) { const f = this.feedback; E.font.text(g, f.text, W / 2, H * .62, f.color, { align: 'center', shadow: '#000', scale: 2 }); if (f.sub) E.font.text(g, f.sub, W / 2, H * .62 + 18, '#ffd040', { align: 'center', shadow: '#000' }); }
      if (BZ.dev && BZ.dev.drawPins) BZ.dev.drawPins(g, r);
    });
  },
  mainInput(M) { for (const T of M.teams) if (T.humans.length) return T.humans[0].input; return BZ.game.input; },
  scorebug(g, M) {
    const x = SAFE, y = SAFE, A = M.teams[0], Hm = M.teams[1], off = BZ.offense(M);
    E.ui.box(g, x, y, 118, 46, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .9 });
    const row = (T, yy, bat) => {
      px.rect(g, x + 4, yy, 4, 12, T.def.colors[0]); px.rect(g, x + 8, yy, 2, 12, T.def.colors[1]);
      E.font.text(g, T.def.abbr, x + 13, yy + 2, '#ffffff', { shadow: '#000' });
      if (bat) E.font.text(g, '▸', x + 33, yy + 2, '#ffd040');
      E.font.text(g, String(T.runs), x + 58, yy - 1, '#ffffff', { scale: 2, align: 'right', shadow: '#000' });
    };
    row(A, y + 5, off === A); row(Hm, y + 25, off === Hm);
    // inning, outs, count, mini diamond
    const ix = x + 66;
    E.font.text(g, (M.half === 'top' ? '▲' : '▼') + M.inning, ix, y + 5, '#ffd040', { shadow: '#000' });
    for (let i = 0; i < 2; i++) { px.disc(g, ix + 3 + i * 8, y + 19, 2.6, '#202638'); if (M.outs > i) px.disc(g, ix + 3 + i * 8, y + 19, 2.2, '#ff5a3a'); }
    E.font.text(g, 'B', ix, y + 28, '#9ab0ff'); for (let i = 0; i < 3; i++) { px.disc(g, ix + 9 + i * 6, y + 31, 2, i < M.balls ? '#5aff8a' : '#2a3048'); }
    E.font.text(g, 'S', ix, y + 37, '#9ab0ff'); for (let i = 0; i < 2; i++) { px.disc(g, ix + 9 + i * 6, y + 40, 2, i < M.strikes ? '#ff5a3a' : '#2a3048'); }
    const dx = x + 104, dy = y + 22, b = M.bases;
    const base = (bx, by, on) => { px.poly(g, [[bx, by - 4], [bx + 4, by], [bx, by + 4], [bx - 4, by]], on ? '#ffd040' : '#3a4060'); if (!on) px.poly(g, [[bx, by - 2], [bx + 2, by], [bx, by + 2], [bx - 2, by]], '#1a2040'); };
    base(dx + 7, dy, b[0]); base(dx, dy - 7, b[1]); base(dx - 7, dy, b[2]);
  },
  meters(g, r, M) {
    const ca = r.game.cornerArea && r.game.cornerArea(), right = ca && ca.y0 < 60 ? ca.x0 - 6 : r.W - SAFE;
    const off = BZ.offense(M), def = BZ.defense(M), T = M.phase === 'atBat' || M.phase === 'inPlay' ? off : off;
    const w = 108, x = right - w, y = SAFE;
    E.ui.box(g, x, y, w, 40, { bg: ['#2a1a10', '#120a06'], border: '#a86a2a', alpha: .9 });
    // the bat-shaped BATZOOKA gauge
    const full = T.meter >= 100, k = T.meter / 100, blink = full && Math.floor(r.game.real * 6) % 2;
    E.font.text(g, full ? 'BATZOOKA READY!' : 'BATZOOKA', x + 5, y + 4, blink ? '#ffffff' : '#ffd040', { shadow: '#000' });
    const bx = x + 5, by = y + 15, bw = w - 10;
    px.rect(g, bx, by + 2, 14, 4, '#3a2a1a'); px.poly(g, [[bx + 14, by + 2], [bx + bw, by - 1], [bx + bw, by + 8], [bx + 14, by + 6]], '#3a2a1a');
    const fw = Math.round(bw * k);
    if (fw > 0) { px.rect(g, bx, by + 3, Math.min(14, fw), 2, '#ff8a2a'); if (fw > 14) px.poly(g, [[bx + 14, by + 3], [bx + fw, by + 3 - (fw - 14) / (bw - 14) * 3], [bx + fw, by + 6 + (fw - 14) / (bw - 14) * 2], [bx + 14, by + 5]], full ? (blink ? '#fff4a0' : '#ffb020') : '#ff7a1a'); }
    E.font.text(g, Math.floor(T.meter) + '%', x + w - 5, y + 4, '#ffffff', { align: 'right', shadow: '#000' });
    // turbo and wind
    E.font.text(g, 'TURBO', x + 5, y + 27, '#9ae0ff', { shadow: '#000' });
    E.ui.bar(g, x + 36, y + 29, 30, 4, (M.phase === 'inPlay' && BZ.ctl.who(M, def.side, 'field') ? def : off).turbo / 100, '#4ac8ff');
    const wd = M.park.wind;
    if (wd && wd.mph) { const a = Math.atan2(wd.y, wd.x), cx = x + 80, cy = y + 31; px.line(g, cx - Math.cos(a) * 5, cy - Math.sin(a) * 4, cx + Math.cos(a) * 5, cy + Math.sin(a) * 4, '#ffffff', 1); px.disc(g, cx + Math.cos(a) * 5, cy + Math.sin(a) * 4, 1.5, '#ffd040'); E.font.text(g, wd.mph + 'mph', x + w - 4, y + 27, '#ffffff', { align: 'right' }); }
    else E.font.text(g, M.park.def.wind ? 'CALM' : 'NO WIND', x + w - 4, y + 27, '#8a90a8', { align: 'right' });
  },
  playerCard(g, r, M) {
    const x = SAFE, y = r.H - SAFE - 46, pl = M.phase === 'atBat' ? M.batter : M.batter, D = BZ.defense(M);
    const rig = BZ.rigFor(pl, 'bench');
    E.ui.box(g, x, y, 128, 44, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .9 });
    if (rig && BZ.cosmetic) rig.drawPortrait(g, x + 4, y + 4, 36, { zoom: 2.6, frame: false });
    E.font.text(g, pl.name.replace(/".*?" /, '').toUpperCase().slice(0, 16), x + 44, y + 5, '#ffffff', { shadow: '#000' });
    const s = M.stats[pl.id] || { AB: 0, H: 0, HR: 0 };
    E.font.text(g, '#' + pl.num + ' ' + pl.pos + '  ' + (pl.bt || 'R/R'), x + 44, y + 16, '#9ab0ff');
    E.font.text(g, s.H + '-' + s.AB + (s.HR ? '  ' + s.HR + ' HR' : ''), x + 44, y + 27, '#ffd040');
    // the pitcher's stamina under it
    const st = BZ.staminaOf(M, D.pitcher);
    E.font.text(g, 'P ' + D.pitcher.short, x + 2, y - 10, '#ffffff', { shadow: '#000' });
    E.ui.bar(g, x + 56, y - 8, 60, 4, st / 100, st < 15 ? '#ff3a3a' : st < 40 ? '#ffb030' : '#5aff8a');
  },
  /* ---- prompts: icon + verb for this moment, per player at their side of the screen ---- */
  prompts(g, r, M) {
    const list = [];
    for (const T of M.teams) for (const h of T.humans) {
      const I = h.input, ctx = this.context(M, T, h);
      if (ctx.length) list.push([I, ctx]);
    }
    list.forEach(([I, ctx], i) => {
      const y = r.H - SAFE - 14 - Math.floor(i / 2) * 22, right = i % 2 === 1;
      if (list.length === 1) BZ.drawPrompts(g, I, ctx, r.W / 2 + 40, y, { align: 'center' });
      else BZ.drawPrompts(g, I, ctx, right ? r.W - SAFE : SAFE + 136, y, { align: right ? 'right' : 'left' });
      if (list.length > 1) E.font.text(g, 'P' + I.player, right ? r.W - SAFE : SAFE + 136, y - 11, E.PLAYER_COLORS[(I.player - 1) % 4], { align: right ? 'right' : 'left', shadow: '#000' });
    });
  },
  /** the prompt list for a human in this moment */
  context(M, T, h) {
    const off = BZ.offense(M) === T, I = h.input, S = M.ab, out = [];
    const duty = d => BZ.ctl.who(M, T.side, d) === I;
    const pct = Math.floor(T.meter);
    if (M.phase === 'atBat' && S) {
      if (off && duty('bat')) {
        if (S.sub === 'walkup') return [['south', 'READY']];
        out.push(['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['north', 'BUNT']);
        out.push(T.batzookaArmed ? ['r1', 'ARMED!', true] : ['r1', 'BATZOOKA', T.meter >= 100, pct + '%']);
        if (S.sub === 'select' && M.bases.some(Boolean) && duty('run')) out.push([['l1', 'num2'], 'STEAL']);
      } else if (off && duty('run') && S.sub === 'select' && M.bases.some(Boolean)) { out.push([['l1', 'num2'], 'STEAL'], ['r1', 'LEAD OFF']); }
      if (!off && duty('pitch')) {
        if (S.sub === 'select') { /* the pitch diamond shows these */ if (M.bases.some(Boolean)) out.push([['l1', 'num1'], 'PICKOFF']); }
        else if (S.sub === 'windup') out.push(['move', 'AIM'], [S.slot === 'r1' ? 'r1' : S.slot, 'RELEASE ON THE RING']);
        else if (S.sub === 'flight' && S.pitch && S.pitch.u < .4) out.push(['move', 'AFTERTOUCH']);
      }
      return out;
    }
    if (M.phase === 'inPlay' && M.play) {
      if (!off && duty('field')) {
        const f = M.ctlF;
        if (f && f.has) { out.push(['east', '1B'], ['north', '2B'], ['west', '3B'], ['south', 'HOME']); out.push(['r1', 'LASER', T.meter >= 50, pct + '%']); }
        else { out.push(['move', 'RUN'], ['l2', 'TURBO'], ['r1', 'JUMP'], ['r2', 'DIVE'], ['l1', 'SWITCH']); }
      }
      if (off && duty('run') && M.play.kind) {
        out.push(['r1', 'GO'], ['l1', 'BACK'], ['l2', 'TURBO']);
        out.push([['r1', 'l2'], 'AFTERBURN', T.meter >= 50, pct + '%']);
      }
      return out;
    }
    if (M.phase === 'playOver' || M.phase === 'halfEnd' || M.phase === 'halfStart' || M.phase === 'pregame' || M.phase === 'between') return [['south', 'CONTINUE']];
    return out;
  },
  /** the pitch-select diamond: four pitch names around the face-button icons, plus R1 SUPER */
  pitchSelect(g, r, M) {
    const D = BZ.defense(M), I = BZ.ctl.who(M, D.side, 'pitch'); if (!I) return;
    const lefty = (M.batter.bt || 'R/R')[0] === 'L', rep = BZ.repertoire(D.pitcher), cx = lefty ? SAFE + 74 : r.W - SAFE - 74, cy = r.H - SAFE - 104, mouse = I.lastDevice === 'mouse', keys = I.lastDevice === 'keyboard';
    E.ui.box(g, cx - 72, cy - 44, 144, 104, { bg: ['#1a1030', '#0a0614'], border: '#8a6ad8', alpha: .9 });
    E.font.text(g, 'PITCH', cx, cy - 40, '#ffd040', { align: 'center', shadow: '#000' });
    const pos = { north: [0, -20], east: [38, 0], south: [0, 20], west: [-38, 0] };
    BZ.PITCH_SLOTS.forEach((sl, i) => {
      const [dx, dy] = pos[sl], p = BZ.PITCHES[rep[i]], sel = mouse && (M.ab.pick || 0) === i;
      const act = mouse || keys ? 'num' + (i + 1) : sl, gw = BZ.glyphW(I, act, 11);
      if (sel) E.ui.box(g, cx + dx - 34, cy + dy - 3, 68, 17, { bg: '#4a2a8a', border: '#ffd040' });
      BZ.glyph(g, I, act, cx + dx - gw / 2, cy + dy - 1, 11, false, mouse ? 'keyboard' : undefined);
      E.font.text(g, p.short, cx + dx, cy + dy + 11, sel ? '#ffffff' : '#d8d0ff', { align: 'center', shadow: '#000' });
    });
    const sup = BZ.PITCHES[D.def.superPitch], ok = D.meter >= 100, sel5 = mouse && M.ab.pick === 4;
    if (sel5) E.ui.box(g, cx - 66, cy + 36, 132, 16, { bg: '#4a2a8a', border: '#ffd040' });
    const gw = BZ.glyph(g, I, keys || mouse ? 'num5' : 'r1', cx - 64, cy + 39, 11, !ok, mouse ? 'keyboard' : undefined);
    E.font.text(g, sup.short + (ok ? '' : ' ' + Math.floor(D.meter) + '%'), cx - 60 + gw, cy + 41, ok ? '#ffd040' : '#7a7090', { shadow: '#000' });
    if (mouse) E.font.text(g, 'wheel: pick  click: throw', cx, cy + 56, '#8a8aa8', { align: 'center' });
    E.ui.bar(g, cx - 60, cy - 30, 120, 3, BZ.staminaOf(M, D.pitcher) / 100, '#5aff8a');
  },
  inningCard(g, r, M) {
    const t = M.phaseT, a = Math.min(1, t * 4);
    const txt = M.phase === 'pregame' ? 'PLAY BALL!' : (M.half === 'top' ? 'TOP ' : 'BOTTOM ') + BZ.ord(M.inning);
    const cy = r.H * .42;
    E.font.title(g, txt, r.W / 2, cy - (1 - a) * 30, { scale: 3, align: 'center', colors: ['#ffffff', '#ffd040', '#ff7a1a'], depth: 2 });
    if (M.phase === 'pregame') E.font.text(g, M.teams[0].def.name.toUpperCase() + '  AT  ' + M.teams[1].def.name.toUpperCase(), r.W / 2, cy + 30, '#ffffff', { align: 'center', shadow: '#000' });
    else { const O = BZ.offense(M); E.font.text(g, O.def.name.toUpperCase() + ' AT BAT', r.W / 2, cy + 30, '#ffffff', { align: 'center', shadow: '#000' }); }
    if (M.bonusRunner && M.phase === 'halfStart') E.font.text(g, 'BONUS RUNNER ON SECOND', r.W / 2, cy + 42, '#ffd040', { align: 'center', shadow: '#000' });
    E.font.text(g, M.park.name.toUpperCase(), r.W / 2, cy + 54, '#9ab0ff', { align: 'center', shadow: '#000' });
  },
  lineScore(g, r, M) {
    const n = Math.max(M.innings, M.inning), cw = 14, w = 96 + n * cw, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .58);
    E.ui.box(g, x, y, w, 46, { bg: ['#1a2040', '#0a0e1c'], border: '#5a6a9a', alpha: .92 });
    for (let i = 0; i < n; i++) E.font.text(g, String(i + 1), x + 44 + i * cw, y + 4, '#9ab0ff', { align: 'center' });
    E.font.text(g, 'R', x + 52 + n * cw, y + 4, '#ffd040', { align: 'center' }); E.font.text(g, 'H', x + 66 + n * cw, y + 4, '#ffd040', { align: 'center' }); E.font.text(g, 'E', x + 80 + n * cw, y + 4, '#ffd040', { align: 'center' });
    M.teams.forEach((T, k) => {
      const yy = y + 17 + k * 13;
      E.font.text(g, T.def.abbr, x + 6, yy, '#ffffff');
      for (let i = 0; i < n; i++) { const v = T.line[i]; E.font.text(g, v === undefined ? '-' : String(v), x + 44 + i * cw, yy, '#ffffff', { align: 'center' }); }
      E.font.text(g, String(T.runs), x + 52 + n * cw, yy, '#ffffff', { align: 'center' }); E.font.text(g, String(T.hits), x + 66 + n * cw, yy, '#ffffff', { align: 'center' }); E.font.text(g, String(T.errors), x + 80 + n * cw, yy, '#ffffff', { align: 'center' });
    });
    if (M.phase === 'halfEnd') E.font.title(g, M.outs >= 3 ? 'SIDE RETIRED' : 'END OF HALF', r.W / 2, y - 26, { scale: 2, align: 'center', colors: ['#ffffff', '#9ab0ff'] });
  },
  boomCard(g, r, M) {
    const B = M.boom;
    E.font.title(g, 'SUDDEN BOOM!', r.W / 2, 60, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
    M.teams.forEach((T, k) => E.font.text(g, T.def.abbr + '  ' + B.slugger[k].short + '  ' + B.feet[k] + ' FT  (' + B.swings[k] + '/' + B.max + ')', r.W / 2, 100 + k * 16, '#ffffff', { align: 'center', shadow: '#000', scale: 1 }));
    if (B.last) E.font.text(g, B.last.feet ? B.last.feet + ' FEET!' : 'NO DINGER', r.W / 2, 140, B.last.feet ? '#ffd040' : '#9ab0ff', { align: 'center', shadow: '#000', scale: 2 });
  },
  drawStamps(g, r) {
    for (const s of this.stamps) {
      const k = Math.min(1, s.t * 7), out = s.t > s.dur - .2 ? (s.dur - s.t) / .2 : 1, sc = s.scale;
      const jig = s.t < .25 ? Math.round((BZ.F() - .5) * 4) : 0;
      if (out <= 0) continue;
      const y = Math.round(r.H * .2 + (1 - k) * -20) + jig;
      E.font.title(g, s.text, r.W / 2 + jig, y, { scale: sc, align: 'center', colors: s.colors, depth: 3, depthColor: '#2a0e04' });
      if (s.sub) E.font.text(g, s.sub, r.W / 2, y + sc * 9 + 6, '#ffffff', { align: 'center', shadow: '#000' });
    }
  },
  drawToasts(g, r) {
    this.toasts.forEach((s, i) => { const y = 64 + i * 16, w = E.font.width(s.text) + 16; E.ui.box(g, Math.round(r.W / 2 - w / 2), y, w, 14, { bg: ['#3a2a60', '#1a1030'], border: '#ffd040', alpha: .9 }); E.font.text(g, s.text, r.W / 2, y + 3, '#ffffff', { align: 'center' }); });
  },
  /* ---- the Plate Cam overlays ---- */
  plateOverlay(r, M, fr, m7) {
    const H = M.park.H, S = M.ab, y = H.y - 6, pr = (x, z) => m7.project(H.x + x, y, z);
    const zoneSet = (BZ.game.settings && BZ.game.settings.zone) || 'always';
    const k = ((M.batter.look && M.batter.look.size) || 1.25) / 1.25, lo = BZ.GEO.zoneLo * k, hi = BZ.GEO.zoneHi * k, hw = BZ.GEO.zoneHalfW;
    const humanBat = BZ.ctl.who(M, BZ.offense(M).side, 'bat'), humanPitch = BZ.ctl.who(M, BZ.defense(M).side, 'pitch');
    r.overlay(g => {
      if (this.hidden(M)) return;
      const showZone = zoneSet === 'always' || (zoneSet === 'pitch' && S && S.sub === 'flight') || (M.cheats && M.cheats.showZone);
      if (showZone && S) {
        const a = pr(-hw, lo), b = pr(hw, lo), c = pr(hw, hi), d = pr(-hw, hi);
        if (a && c) px.blend(g, .55, 'normal', () => {
          for (let i = 0; i <= 3; i++) { const t = i / 3, p0 = pr(-hw + 2 * hw * t, lo), p1 = pr(-hw + 2 * hw * t, hi), q0 = pr(-hw, lo + (hi - lo) * t), q1 = pr(hw, lo + (hi - lo) * t); px.line(g, p0[0], p0[1], p1[0], p1[1], i === 0 || i === 3 ? '#ffffff' : '#c8d8ff', 1); px.line(g, q0[0], q0[1], q1[0], q1[1], i === 0 || i === 3 ? '#ffffff' : '#c8d8ff', 1); }
        });
        void b; void d;
      }
      if (!S) return;
      // the batter's reticle (a human's)
      if (humanBat && (S.sub === 'select' || S.sub === 'windup' || S.sub === 'flight')) {
        const T = BZ.offense(M), type = T.batzookaArmed ? 'batzooka' : 'contact', rr = BZ.reticleR(type, M.batter, BZ.assistFor(M, T.side)), c = pr(M.reticle.x, M.reticle.z), e = pr(M.reticle.x + rr, M.reticle.z);
        if (c && e) {
          const rad = Math.abs(e[0] - c[0]), col = type === 'batzooka' ? '#ff7a1a' : '#ffe24a';
          if (type === 'batzooka') px.blend(g, .7, 'add', () => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + r.game.time * 4; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad, 2, i % 2 ? '#ffd040' : '#ff5a1a'); } });
          this.ring(g, c[0], c[1], rad, col); this.ring(g, c[0], c[1], rad * 1.6, '#ffffff40');
          const pw = BZ.reticleR('power', M.batter, BZ.assistFor(M, T.side)) / BZ.reticleR(type, M.batter, BZ.assistFor(M, T.side)) * rad; this.ring(g, c[0], c[1], pw, '#ff5a3a90');
          px.disc(g, c[0], c[1], 1.5, col);
        }
      }
      // the pitcher's target marker and the release ring
      if (humanPitch && S.sub === 'windup') {
        const c = pr(M.marker.x, M.marker.z), e = pr(M.marker.x + 2.2, M.marker.z);
        if (c && e) {
          const rad = Math.max(3, Math.abs(e[0] - c[0]));
          this.ring(g, c[0], c[1], rad, '#5affd0'); px.line(g, c[0] - rad - 3, c[1], c[0] + rad + 3, c[1], '#5affd0'); px.line(g, c[0], c[1] - rad - 3, c[0], c[1] + rad + 3, '#5affd0');
          const left = S.windT - S.t;
          if (left < BZ.RING + .2) { const k2 = clamp(left / BZ.RING, 0, 1), rr = rad + k2 * 26, close = Math.abs(left) < .04 * TUNE.releaseWindow; this.ring(g, c[0], c[1], rr, close ? '#ffffff' : '#ffd040'); if (k2 < .15) this.ring(g, c[0], c[1], rr + 1, '#ffffff'); }
        }
      }
      // where the last pitch crossed
      if (S.sub === 'settle' && S.cross && S.t < 1.5) { const c = pr(S.cross.x, S.cross.z); if (c) { px.disc(g, c[0], c[1], 3, S.result === 'ball' ? '#5aff8a' : '#ff5a3a'); px.disc(g, c[0], c[1], 1.5, '#ffffff'); } }
      // the dev timing bar and the predicted path
      if (M.cheats && M.cheats.showPath && S.pitch && S.sub === 'flight') { let prev = null; for (let u = 0; u <= 1.001; u += .05) { const p = S.pitch.pos(u), q = m7.project(H.x + p.x, H.y + p.y, p.z); if (prev && q) px.line(g, prev[0], prev[1], q[0], q[1], '#ff5aff'); prev = q; } const c = S.pitch.cross(), q = pr(c.x, c.z); if (q) this.ring(g, q[0], q[1], 4, '#ff5aff'); this.timingBar(g, r, M); }
    });
  },
  ring(g, x, y, rad, col) { const n = Math.max(12, Math.round(rad * 2)); for (let i = 0; i < n; i++) { const a = i / n * TAU; px.dot(g, Math.round(x + Math.cos(a) * rad), Math.round(y + Math.sin(a) * rad), col); } },
  timingBar(g, r, M) {
    const S = M.ab, pt = S.pitch, x = r.W / 2 - 80, y = r.H - 60, w = 160;
    E.ui.box(g, x - 4, y - 4, w + 8, 16, { bg: '#0a0a14', border: '#5a5a7a', alpha: .9 });
    const win = BZ.swingWindow(BZ.assistFor(M, BZ.offense(M).side)), span = .5, now = pt.t, T = pt.T, sx = tt => x + w / 2 + (tt - T) / span * w;
    px.rect(g, sx(T - win), y, sx(T + win) - sx(T - win), 8, '#2a5a2a'); px.rect(g, sx(T - .05), y, sx(T + .05) - sx(T - .05), 8, '#4a9a4a'); px.rect(g, sx(T - .022), y, sx(T + .022) - sx(T - .022), 8, '#8aff8a');
    px.rect(g, clamp(sx(now + BZ.SWINGS.contact.delay), x, x + w), y - 2, 1, 12, '#ffffff');
  },
  /* ---- the Broadcast Cam overlays ---- */
  fieldOverlay(r, M, fr) {
    if (this.hidden(M)) return;
    const h = BZ.play.holder(M), D = BZ.defense(M), I = BZ.ctl.who(M, D.side, 'field');
    if (M.cheats.showTargets) for (const f of M.fielders) r.decal(g => { const a = r.w(f.x, f.y, 0), c = r.w(f.tx, f.ty, 0); px.line(g, a[0], a[1], c[0], c[1], f.role === 'chase' ? '#ff5aff' : '#5affd0'); });
    if (M.cheats.showRadii) for (const f of M.fielders) r.decal(() => r.groundRing(f.x, f.y, BZ.catchReach(M, f), '#ffffff'));
    // throw targets: each base with its button while a human's fielder holds the ball
    if (h && h.human && M.phase === 'inPlay') {
      const g0 = BZ.game.mouseGround && h.human.lastDevice === 'mouse' ? BZ.game.mouseGround() : null;
      for (let b = 1; b <= 4; b++) {
        const bp = M.park.base(b), hov = g0 && Math.hypot(g0[0] - bp.x, g0[1] - bp.y) < 26;
        r.decal(() => r.groundRing(bp.x, bp.y, hov ? 18 : 13, hov ? '#ffffff' : '#ffd040'));
        r.queue(bp.x, bp.y, 0, g => { const q = r.w(bp.x, bp.y, 26); BZ.glyph(g, h.human, BZ.BASE_BTN[b], q[0] - 6, q[1] - 6, 12, false, h.human.lastDevice === 'mouse' ? 'gamepad' : undefined); }, { bias: 20 });
      }
    }
    void I; void fr;
  },
  playerArrow(r, f, pn) {
    r.queue(f.x, f.y, 44 + f.z, g => { const q = r.w(f.x, f.y, 40 + f.z), c = E.PLAYER_COLORS[(pn - 1) % 4], b = Math.sin(r.game.time * 8) * 1.5; px.poly(g, [[q[0] - 4, q[1] - 6 + b], [q[0] + 4, q[1] - 6 + b], [q[0], q[1] + b]], c); px.line(g, q[0] - 4, q[1] - 7 + b, q[0] + 4, q[1] - 7 + b, '#ffffff'); }, { bias: 30 });
  },
  throwMeter(r, f) {
    r.queue(f.x, f.y, 50, g => { const q = r.w(f.x, f.y, 46), k = Math.min(1, f.charge / .6); E.ui.bar(g, q[0] - 10, q[1] - 12, 20, 3, k, k > .85 ? '#ff3a3a' : '#ffd040'); }, { bias: 31 });
  },
  radar(g, r, M) {
    const P = M.park, s = .052, ca = r.game.cornerArea && r.game.cornerArea(), right = ca && ca.y0 < 60 ? ca.x0 - 6 : r.W - SAFE;
    const cx = right - 40, cy = SAFE + 112, H = P.H, to = (x, y) => [cx + (x - H.x) * s, cy + (y - H.y) * s];
    E.ui.box(g, cx - 40, cy - 66, 80, 72, { bg: '#0a1a0a', border: '#3a6a3a', alpha: .8 });
    const segs = P.fenceSegs; for (let i = 0; i < segs.length; i += 3) { const a = to(segs[i].x0, segs[i].y0); px.dot(g, a[0], a[1], '#5a9a5a'); }
    for (let b = 0; b < 4; b++) { const p = P.base(b), q = to(p.x, p.y); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#ffffff'); }
    for (const f of M.fielders) { const q = to(f.x, f.y); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, f.human ? E.PLAYER_COLORS[(f.human.player - 1) % 4] : BZ.defense(M).def.colors[0]); }
    for (const rn of M.runners) { if (rn.state === 'out' || rn.state === 'scored') continue; const p = BZ.runnerPos(M, rn.p), q = to(p.x, p.y); px.poly(g, [[q[0], q[1] - 2], [q[0] + 2, q[1] + 1], [q[0] - 2, q[1] + 1]], BZ.offense(M).def.colors[1] || '#ffd040'); }
    const b = M.ball, q = to(b.x, b.y); px.disc(g, q[0], q[1], 1.5, '#ffffff');
  }
};

/* ===== src/23-talk.js ===== */
/* =============================================================================
 * 23-talk: the commentary director (it listens to the bus and picks a line by
 * tag: priorities, a rate limit, no repeats within 20, variables; Hap calls it,
 * Lou reacts), the radio box with live portraits, the PA (Gloria Vox), the
 * umpire's calls (stamps and her voice), and the cutscene runner (BZ.cut) with
 * its talk boxes, ✕ to advance and a hold of ○ to skip. All speech is babble;
 * the text is always on screen.
 * ========================================================================== */
BZ.talk = {
  box: null, queue: [], lastT: -9, recent: [], cutscene: null, typing: 0,
  reset() { this.box = null; this.queue = []; this.lastT = -9; this.cutscene = null; },
  setting() { return (BZ.game && BZ.game.settings && BZ.game.settings.commentary) || 'on'; },
  /** say a line from a tag's pool (prio 1 routine, 2 outs/hits/steals, 3 big plays) */
  say(tag, vars = {}, prio = 1) {
    const pool = BZ.LINES[tag]; if (!pool || !BZ.M) return;
    const set = this.setting(); if (set === 'off' || (set === 'big' && prio < 3)) return;
    const now = BZ.game.real;
    if (this.box && this.box.prio > prio && now - this.box.t0 < 2.4) return;
    if (now - this.lastT < 2.5 && (!this.box || prio <= this.box.prio)) return;
    let pick = null;
    for (let tries = 0; tries < 8; tries++) { const c = BZ.pickF(pool); const key = tag + ':' + pool.indexOf(c); if (!this.recent.includes(key) || tries === 7) { pick = c; this.recent.push(key); if (this.recent.length > 20) this.recent.shift(); break; } }
    const who = Array.isArray(pick) ? pick[0] : 'hap', text = this.fill(Array.isArray(pick) ? pick[1] : pick, vars);
    this.show(who, text, prio);
    // on the biggest plays Hap calls it and Lou reacts
    if (prio >= 3 && who === 'hap') { const lou = pool.filter(l => Array.isArray(l) && l[0] === 'lou'); if (lou.length) this.queue.push([BZ.pickF(lou)[1], vars]); }
  },
  fill(t, v) {
    const M = BZ.M, O = M ? BZ.offense(M) : null;
    const base = { batter: M && M.batter ? M.batter.name.replace(/".*?" /, '') : '', pitcher: M && M.pitcher ? M.pitcher.name.replace(/".*?" /, '') : '', team: O ? O.def.nick.charAt(0) + O.def.nick.slice(1).toLowerCase() : '', park: M ? M.park.name : '', score: M ? M.teams[0].def.abbr + ' ' + M.teams[0].runs + ', ' + M.teams[1].def.abbr + ' ' + M.teams[1].runs : '' };
    return t.replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : base[k] !== undefined ? base[k] : m);
  },
  show(who, text, prio = 1, o = {}) {
    this.box = { who, text, prio, t0: BZ.game.real, t: 0, dur: Math.max(2.4, text.length * .055), name: BZ.nameOf(who) };
    this.lastT = BZ.game.real;
    BZ.babble.say(text, BZ.voiceOf(who), { max: 90 });
    void o;
  },
  step(dt) {
    if (this.box) { this.box.t += dt; if (this.box.t > this.box.dur) { this.box = null; if (this.queue.length) { const [t, v] = this.queue.shift(); this.show('lou', this.fill(t, v), 2); } } }
    if (this.cutscene) this.cutStep(dt);
  },
  /** the radio box: non-modal, bottom left above the player card */
  drawRadio(g, r) {
    const b = this.box; if (!b || this.cutscene) return;
    const w = Math.min(r.W - 150, 230), x = 12, y = r.H - 106, a = Math.min(1, b.t * 6, (b.dur - b.t) * 4);
    if (a <= 0) return;
    px.blend(g, .86 * a, 'normal', () => E.ui.box(g, x, y, w, 36, { bg: ['#202a48', '#0c1020'], border: '#7a8ac8' }));
    const rig = BZ.portraitRig(b.who); if (rig && BZ.cosmetic) { rig._talk = b.t < b.text.length / 20; rig.drawPortrait(g, x + 4, y + 4, 32, { zoom: 2.4, frame: false }); rig._talk = false; }
    E.font.text(g, b.name, x + 40, y + 4, '#ffd040', { shadow: '#000' });
    const shown = b.text.slice(0, Math.floor(b.t * 40)), lines = E.font.wrap(shown, w - 46);
    const ls = lines.length > 2 ? lines.slice(lines.length - 2) : lines; ls.forEach((l, i) => E.font.text(g, l, x + 40, y + 14 + i * 10, '#ffffff', { shadow: '#000' }));
  },
  /** the PA: "Now batting... number seven... DOT... DYNAMITE... DELGADO!" */
  pa(batter) {
    if (!BZ.cosmetic || this.setting() === 'off') return;
    const parts = batter.name.toUpperCase().replace(/"/g, '').split(' ');
    const text = 'Now batting... number ' + batter.num + '... ' + parts.join('... ') + '!';
    BZ.babble.say(text, 'gloria', { max: 90, vol: .8 });
    BZ.hud.info = { text: '#' + batter.num + '  ' + batter.name.toUpperCase(), t: 0, color: '#ffd040' };
  },
  ump(kind) {
    const text = BZ.UMP[kind] || kind;
    if (BZ.cosmetic) BZ.babble.say(text, 'barb', { vol: 1 });
    const M = BZ.M; if (M) M.umpCall = { spec: kind === 'strike' || kind === 'three' || kind === 'out' ? BZ.MOTION.punchOut : kind === 'safe' ? BZ.MOTION.safe : 'jab', t: 0 };
  },
  /* ---- the cutscene runner: BZ.cut(steps, done) ---- */
  cut(steps, done, o = {}) {
    this.cutscene = { steps: steps.slice(), i: -1, t: 0, wait: 0, line: null, done, skipT: 0, actors: o.actors || {}, cam: o.cam || null, bg: o.bg || null };
    this.box = null;
    this.next();
  },
  next() {
    const C = this.cutscene; if (!C) return;
    C.i++; C.line = null; C.wait = 0;
    while (C.i < C.steps.length) {
      const s = C.steps[C.i], k = s[0];
      if (k === 'say') { C.line = { who: s[1], text: s[2], t: 0 }; BZ.babble.say(s[2], BZ.voiceOf(s[1]), { max: 120 }); return; }
      if (k === 'wait') { C.wait = s[1]; return; }
      if (k === 'sfx') BZ.sfx(s[1]);
      else if (k === 'music') BZ.music(s[1]);
      else if (k === 'pose') { const a = C.actors[s[1]]; if (a) { a.pose = s[2]; a.expr = s[3] || null; } }
      else if (k === 'walk') { const a = C.actors[s[1]]; if (a) { a.tx = s[2]; a.ty = s[3]; } }
      else if (k === 'face') { const a = C.actors[s[1]]; if (a) a.facing = s[2]; }
      else if (k === 'cam') { C.cam = { x: s[1], y: s[2], zoom: s[3] }; }
      else if (k === 'fx') { if (BZ.cosmetic) { const P = BZ.game.particles; if (s[1] === 'boom') P.explosion(s[2], s[3], 20, 1.2, { shake: 0 }); else if (s[1] === 'confetti') BZ.crowd && BZ.crowd.confetti(s[2], s[3]); else if (s[1] === 'sparks') P.sparks(s[2], s[3], 40, 20); else P.smoke(s[2], s[3], 10, 6); } }
      else if (k === 'call') { try { s[1](); } catch (e) { BZ.game.fail('cut call', e); } }
      C.i++;
    }
    this.endCut();
  },
  endCut() { const C = this.cutscene; if (!C) return; this.cutscene = null; if (C.done) C.done(); },
  cutStep(dt) {
    const C = this.cutscene, I = BZ.game.input, P = BZ.game.players || [I];
    C.t += dt;
    // hold ○ (or Escape-free cancel) for a second to skip the scene
    if (P.some(q => q.down('east'))) { C.skipT += dt; if (C.skipT > 1) { C.steps = []; this.endCut(); return; } } else C.skipT = 0;
    for (const a of Object.values(C.actors)) if (a.tx !== undefined) { if (BZ.moveTo(a, a.tx, a.ty, 70, dt)) { a.tx = undefined; a.vx = a.vy = 0; } }
    if (C.line) {
      C.line.t += dt;
      const full = C.line.t * 40 >= C.line.text.length;
      if (P.some(q => q.pressed('south') || q.pressed('confirm')) || (BZ.M && BZ.M.attract && C.line.t > 1.4) || (BZ.autoCut && C.line.t > .05)) { if (full || BZ.autoCut) this.next(); else C.line.t = 99; }
    } else if (C.wait > 0) { C.wait -= dt; if (C.wait <= 0) this.next(); }
  },
  drawCut(g, r) {
    const C = this.cutscene; if (!C) return;
    if (C.line) {
      const L = C.line, w = Math.min(r.W - 24, 420), x = Math.round(r.W / 2 - w / 2), y = r.H - 74;
      E.ui.box(g, x, y, w, 58, { bg: ['#202a48', '#0c1020'], border: '#ffd040' });
      const rig = BZ.portraitRig(L.who); if (rig && BZ.cosmetic) { rig._talk = L.t * 40 < L.text.length; rig.drawPortrait(g, x + 6, y + 6, 46, { zoom: 3, frame: true, bg: '#1a2050' }); rig._talk = false; }
      E.font.text(g, BZ.nameOf(L.who), x + 60, y + 6, '#ffd040', { shadow: '#000' });
      const lines = E.font.wrap(L.text.slice(0, Math.floor(L.t * 40)), w - 70);
      lines.slice(0, 3).forEach((l, i) => E.font.text(g, l, x + 60, y + 18 + i * 11, '#ffffff', { shadow: '#000' }));
      const I = BZ.game.input;
      BZ.drawPrompts(g, I, [['south', 'NEXT'], ['east', C.skipT > 0 ? 'SKIP ' + Math.round(C.skipT * 100) + '%' : 'HOLD TO SKIP']], x + w - 4, y + 60, { align: 'right', size: 9, panel: false });
      if (C.skipT > 0) BZ.hud.ring(g, x + w - 30, y + 64, 7, '#ffd040');
    }
  },
  /* ---- the director: bus events -> lines, stamps, the umpire, the PA ---- */
  install(M) {
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    const H = BZ.hud;
    on('batterUp', d => { if (!M.fast && !M.attract) this.pa(d.batter); else if (M.attract) BZ.hud.info = { text: '#' + d.batter.num + '  ' + d.batter.name.toUpperCase(), t: 0, color: '#ffd040' }; });
    on('playBall', () => { this.say('play_ball', {}, 2); this.ump('play'); H.stamp('PLAY BALL!', { prio: 2 }); });
    on('call', d => {
      if (d.kind === 'strike') { if (d.three) { this.ump('three'); H.stamp(d.how === 'looking' ? 'STEE-RIKE THREE!' : 'STRUCK OUT!', { prio: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); } else { this.ump('strike'); H.stamp('STEE-RIKE!', { colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); this.say(d.how === 'swinging' ? 'strike_swinging' : 'strike_called'); } }
      else if (d.kind === 'ball') { this.ump('ball'); H.stamp('BALL', { scale: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); this.say('ball'); }
      else if (d.kind === 'foul') { this.ump('foul'); H.stamp('FOUL BALL', { scale: 2, colors: ['#ffffff', '#ffe08a', '#c8901a'] }); this.say('foul'); }
    });
    on('release', d => { H.feedback = null; H.info = { text: (BZ.PITCHES[M.ab.type] || {}).short + '  ' + d.speed + ' MPH' + (d.slot === 'r1' ? '!!' : ''), t: 0, color: d.slot === 'r1' ? '#ff7a1a' : '#ffffff' }; if (d.perfect && BZ.ctl.who(M, BZ.defense(M).side, 'pitch')) H.feedback = { text: 'PERFECT RELEASE!', color: '#5affd0', t: 0 }; });
    on('swing', d => { const fb = (BZ.game.settings && BZ.game.settings.timing !== false) || M.difficulty === 'rookie' || M.mode === 'training'; if (fb && BZ.ctl.who(M, BZ.offense(M).side, 'bat')) H.feedback = { text: d.kind === 'miss' ? (Math.abs(d.ms) > 300 ? 'NO CONTACT' : (d.ms < 0 ? 'EARLY ' : 'LATE ') + Math.abs(d.ms) + ' MS') : d.feedback, sub: d.feedback2, color: d.grade === 'PERFECT' ? '#5affd0' : d.grade === 'GOOD' ? '#ffd040' : '#ffffff', t: 0 }; });
    on('strikeout', () => this.say('strikeout', {}, 2));
    on('walk', () => { this.ump('four'); H.stamp('BALL FOUR', { prio: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); this.say('walk', {}, 2); });
    on('hbp', () => { H.stamp('HIT BY PITCH!', { prio: 2 }); this.say('hbp', {}, 2); });
    on('hit', d => {
      if (d.dead) return;
      const tag = d.bases === 1 ? 'single' : d.bases === 2 ? 'double' : d.bases === 3 ? 'triple' : 'inside';
      H.stamp(['', 'BASE HIT!', 'DOUBLE!', 'TRIPLE!', 'INSIDE THE PARK!'][d.bases], { prio: 2, colors: ['#ffffff', '#9ae0ff', '#2a7ad8'] });
      this.say(tag, {}, d.bases >= 3 ? 3 : 2);
    });
    on('homer', d => {
      const slam = d.runs >= 4;
      H.stamp(d.batzooka ? 'BATZOOKA!!!' : slam ? 'GRAND SLAM!' : 'HOME RUN!', { prio: 3, scale: 4, dur: 2.4, sub: d.dist + ' FEET' + (d.pole ? '  OFF THE POLE!' : '') });
      this.say(d.batzooka ? 'batzooka_hit' : slam ? 'grandslam' : 'homer', { dist: d.dist }, 3);
    });
    on('groundRuleDouble', () => { H.stamp('GROUND-RULE DOUBLE', { prio: 2, scale: 2 }); this.say('double', {}, 2); });
    on('batzookaArmed', () => { H.stamp('BATZOOKA ARMED!', { prio: 2, colors: ['#fff6c0', '#ff9a2a', '#c8301a'] }); });
    on('meterFull', d => { if (M.mode !== 'derby') { this.say('batzooka_ready', {}, 2); H.toast(M.teams[d.side].def.nick + ': BATZOOKA READY!'); } });
    on('batzookaFizzle', () => { H.stamp('FIZZLE!', { prio: 3, colors: ['#e0e0e0', '#8a8a8a', '#4a4a4a'] }); this.say('batzooka_fizzle', {}, 3); BZ.sfx('fizzle'); });
    on('super', d => { if (d.kind === 'pitch') { H.stamp(BZ.PITCHES[d.type].short + '!', { prio: 3, colors: ['#fff6c0', '#ff6aff', '#7a1ad8'] }); this.say('super_pitch', {}, 3); } else if (d.kind === 'laser') { H.stamp('LASER ARM!', { prio: 3, colors: ['#ffffff', '#ff5a5a', '#c81a1a'] }); this.say('laser', {}, 3); } else if (d.kind === 'afterburners') { H.stamp('AFTERBURNERS!', { prio: 3 }); this.say('afterburners', {}, 3); } });
    on('catch', d => { if (d.fly && d.wall) { H.stamp('ROBBED!', { prio: 3, scale: 4, colors: ['#ffffff', '#ffd040', '#c8501a'] }); this.say('robbery', {}, 3); } else if (d.dive && d.fly) { H.stamp('WHAT A GRAB!', { prio: 3 }); this.say('catch_dive', {}, 3); } else if (d.fly) { this.say('fly_out', {}, 1); } });
    on('out', d => { if (d.how === 'fly' || d.how === 'force' || d.how === 'tag' || d.how === 'doubled') { this.ump('out'); if (d.how !== 'fly' || true) H.stamp('YER OUT!', { prio: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); } });
    on('runnerOut', d => { if (d.how === 'force' && d.base === 1) this.say('ground_out', {}, 1); if (M.play && M.play.kind === 'steal') this.say('caught_stealing', {}, 2); if (M.play && M.play.kind === 'pickoff') this.say('pickoff', {}, 2); });
    on('safeFirst', () => { if (M.play && M.play.outs.length === 0) { /* the hit stamp comes at the end of the play */ } });
    on('doublePlay', d => { H.stamp(d.triple ? 'TRIPLE PLAY!' : 'DOUBLE PLAY!', { prio: 3 }); this.say(d.triple ? 'triple_play' : 'double_play', {}, 3); });
    on('error', () => { H.stamp('ERROR!', { prio: 2, scale: 2, colors: ['#ffffff', '#ffb0b0', '#a81a1a'] }); this.say('error', {}, 2); });
    on('steal', d => { if (d.ok) { H.stamp('STOLEN BASE!', { prio: 2 }); this.say('steal_safe', {}, 2); } });
    on('bowlOver', d => { H.stamp('COLLISION!', { prio: 3, scale: 4 }); this.say('bowl_over', {}, 3); });
    on('tagUp', () => this.say('tag_up', {}, 2));
    on('wildPitch', () => { H.stamp('WILD PITCH!', { prio: 2, scale: 2 }); this.say('wild_pitch', {}, 2); });
    on('walkoff', () => { H.stamp('WALK-OFF!', { prio: 3, scale: 4, dur: 3 }); this.say('walkoff', {}, 3); });
    on('leadChange', () => this.say('lead_change', {}, 2));
    on('halfEnd', () => this.say('side_retired', {}, 1));
    on('rallyCap', () => { H.stamp('RALLY CAP!', { prio: 3, scale: 4 }); this.say('rally_cap', {}, 3); });
    on('foulTip', () => { this.ump('foul'); H.stamp('FOUL TIP', { scale: 2, colors: ['#ffffff', '#ffe08a', '#c8901a'] }); });
    on('gameEnd', d => { if (d.winner >= 0) this.say('game_win', { team: M.teams[d.winner].def.nick.charAt(0) + M.teams[d.winner].def.nick.slice(1).toLowerCase() }, 3); });
    on('suddenBoom', () => { H.stamp('SUDDEN BOOM!', { prio: 3, scale: 4, dur: 2.5, sub: 'A HOME RUN DUEL DECIDES IT' }); });
    on('hazard', d => { if (!M.hazardFirst[d.kind]) { M.hazardFirst[d.kind] = true; } this.say('hazard_' + d.kind, {}, 3); if (d.stamp) H.stamp(d.stamp, { prio: 3 }); });
  }
};

/* ===== src/24-crowd.js ===== */
/* =============================================================================
 * 24-crowd: ballpark life. The crowd reacts by side (cheers, groans, the jump),
 * sways with the meter, does THE WAVE above 70; the jumbotron shows the batter,
 * MAKE SOME NOISE, the replay; the home mascot dances on the beat; fireworks at
 * night parks and confetti cannons by day; vendors shout; and the between-innings
 * shows: the Mascot Race, Dance Cam, the T-Shirt Cannon, the Grounds Crew Shuffle.
 * ========================================================================== */
BZ.crowdWave = null; BZ.crowdJump = 0;
BZ.crowd = {
  show: null, murmurT: 0, vendorT: 4, waveT: 0, boardMsg: null, boardT: 0, fx: [], mascots: null,
  install(M) {
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    this.show = null; this.fx = []; this.boardMsg = null; this.mascots = null;
    const homeSide = () => BZ.offense(M).side === 1;
    on('contact', d => { BZ.sfx(d.zooka ? 'krakoom' : d.Q > .55 ? 'crack' : 'tink', { vol: .9 }); if (BZ.cosmetic) { const b = M.ball; BZ.game.particles.sparks(b.x, b.y, b.z, d.zooka ? 30 : 8 + Math.round(d.Q * 12), Math.atan2(b.vy, b.vx)); if (d.Q > .6 || d.zooka) BZ.game.flash('#ffffff', .06, d.zooka ? 1 : .5); BZ.cams.shake = .15; BZ.game.freeze(d.zooka ? .12 : .06); for (const T of M.teams) for (const h of T.humans) h.input.rumble(clamp(.3 + d.Q, 0, 1) * (d.zooka ? 1 : .6), .15); } });
    on('homer', d => { this.react(M, homeSide(), 'big'); BZ.sting('homerun'); this.boardMsg = d.batzooka ? 'BATZOOKA!!!' : 'HOME RUN!'; this.boardT = 4; this.celebrate(M, d.x, d.y); });
    on('hit', d => { if (!d.dead) { this.react(M, homeSide(), d.bases >= 2 ? 'big' : 'cheer'); this.boardMsg = d.bases >= 2 ? 'TWO-BAGGER!' : 'BASE HIT!'; this.boardT = 2; } });
    on('strikeout', () => { this.react(M, !homeSide(), 'cheer'); BZ.sting('strikeout'); this.boardMsg = 'K!'; this.boardT = 2; });
    on('catch', d => { if (d.fly && (d.dive || d.wall)) { this.react(M, !homeSide(), 'big'); this.boardMsg = d.wall ? 'ROBBED!' : 'WHAT A CATCH!'; this.boardT = 3; } else if (d.fly) BZ.sfx('glove'); });
    on('fielded', () => BZ.sfx('glove'));
    on('throw', d => { BZ.sfx(d.laser ? 'zap' : 'throwWhoosh'); });
    on('error', () => { this.react(M, homeSide(), 'oooh'); });
    on('doublePlay', () => this.react(M, !homeSide(), 'big'));
    on('bowlOver', () => { BZ.sfx('crash'); this.react(M, true, 'oooh'); if (BZ.cosmetic) { const H = M.park.H; BZ.game.particles.dust(H.x, H.y, 30, 1.5); BZ.game.shake(4); } });
    on('meterFull', () => { BZ.sfx('ding'); this.boardMsg = 'MAKE SOME NOISE!'; this.boardT = 3; });
    on('meter', d => { const hype = BZ.supers.hype(M); BZ.layer('hype', hype >= 1 ? 1 : 0, 1); });
    on('walkoff', () => { this.react(M, true, 'big'); BZ.sting('victory'); });
    on('gameEnd', d => { if (BZ.cosmetic) { const H = M.park.H; for (let i = 0; i < 6; i++) BZ.wait(i * .35, () => this.firework(M, H.x + BZ.Fr(-400, 400), H.y - BZ.Fr(500, 900))); } });
    on('dive', () => BZ.sfx('dive'));
    on('climb', () => BZ.sfx('climb'));
    on('slide', () => { BZ.sfx('slide'); });
    on('land', d => { BZ.sfx('bounce', { vol: .5 }); if (BZ.cosmetic) BZ.game.particles.dust(d.x, d.y, 4, .8); });
    on('fenceHit', () => BZ.sfx(M.park.def.ironFence ? 'clang' : 'thudWall'));
    on('foul', () => this.react(M, true, 'groan-soft'));
    on('release', d => { BZ.sfx('pitchWhoosh', { pitch: d.speed / 90 }); if (M.ab && BZ.PITCHES[M.ab.type] && BZ.PITCHES[M.ab.type].scream) BZ.sfx('scream'); if (M.ab && M.ab.type === 'overclock') BZ.sfx('laserPitch'); });
    on('pitchCross', d => { BZ.sfx(d.call === 'ball' && d.z < 4 ? 'dirtThud' : 'mitt'); });
    on('halfStart', () => BZ.sting('inning'));
    on('leadChange', () => BZ.sfx('organStab'));
    on('batterUp', () => { if (BZ.F() < .3) BZ.sfx('organStab', { vol: .6 }); });
  },
  /** the crowd reacts: home (true) or away fans, how */
  react(M, home, how) {
    if (how === 'big') { BZ.sfx('bigCheer'); BZ.crowdJump = 1.2; }
    else if (how === 'cheer') { BZ.sfx('cheer'); BZ.crowdJump = .6; }
    else if (how === 'oooh') BZ.sfx('oooh');
    else if (how === 'groan-soft') { if (BZ.F() < .5) BZ.sfx('groan', { vol: .4 }); }
    if (!home && (how === 'big' || how === 'cheer') && BZ.F() < .5) BZ.sfx('groan', { vol: .5 });
  },
  celebrate(M, x, y) {
    if (!BZ.cosmetic) return;
    const night = M.park.def.night;
    for (let i = 0; i < 5; i++) BZ.wait(i * .3 + .2, () => night ? this.firework(M, x + BZ.Fr(-200, 200), y + BZ.Fr(-150, 100)) : this.confetti(x + BZ.Fr(-120, 120), y + BZ.Fr(-80, 80)));
  },
  firework(M, x, y) {
    BZ.sfx('firework');
    const cols = ['#ff5a5a', '#ffd040', '#5affd0', '#ff7aff', '#7ab0ff'], c = BZ.pickF(cols), P = BZ.game.particles;
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; P.add({ kind: 'spark', x, y, z: 220 + BZ.Fr(-20, 20), vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, vz: BZ.Fr(-40, 60), life: 1.1, color: c }); }
    P.add({ kind: 'glint', x, y, z: 220, life: .3, color: '#ffffff' });
  },
  confetti(x, y) {
    const P = BZ.game.particles, cols = ['#ff5a5a', '#ffd040', '#5affd0', '#ff7aff', '#7ab0ff', '#ffffff'];
    BZ.sfx('pow', { vol: .5 });
    for (let i = 0; i < 30; i++) P.add({ kind: 'bit', x, y, z: 40, vx: BZ.Fr(-80, 80), vy: BZ.Fr(-80, 80), vz: BZ.Fr(120, 260), life: 2, color: BZ.pickF(cols) });
  },
  step(M, dt) {
    BZ.crowdJump = Math.max(0, BZ.crowdJump - dt * 1.5);
    const hype = BZ.supers.hype(M);
    // the wave above 70
    if (hype > .7 && M.phase !== 'between') { this.waveT += dt; BZ.crowdWave = ((this.waveT * 1.4) % (Math.PI * 2)) - Math.PI; } else { this.waveT = 0; BZ.crowdWave = null; }
    if (this.boardT > 0) this.boardT -= dt;
    // the murmur, the vendors
    this.murmurT -= dt; if (this.murmurT <= 0) { this.murmurT = .7; BZ.sfx('murmur', { vol: .4 + hype * .8 }); }
    this.vendorT -= dt; if (this.vendorT <= 0 && !M.fast) { this.vendorT = 9 + BZ.Fr(0, 9); this.vendor(M); }
    if (this.show) this.showStep(M, dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.life);
    if (!this.mascots && BZ.cosmetic) this.makeMascots(M);
    if (this.mascots) for (const m of this.mascots) { m.blob.update(dt, { squash: m.squash || 0, walk: m.walk || 0, flap: m.wings ? 1 : 0 }); m.squash *= .9; }
  },
  vendor(M) {
    const line = BZ.pickF(BZ.LINES.vendor), s = BZ.pickF(M.park.standCells || []);
    if (!s) return;
    this.fx.push({ kind: 'text', text: line, x: s.x, y: s.y, z: 90, t: 0, life: 2 });
    BZ.babble.say(line, 'vendor', { vol: .5 });
  },
  makeMascots(M) {
    const T = M.teams[1].def, mk = (spec, x, y) => ({ blob: BZ.makeBlob(Object.assign({}, spec, { colors: spec.colors })), x, y, z: 22, squash: 0, wings: spec.wings, ghost: spec.ghost });
    const P = M.park, s = Math.SQRT1_2, along = 170, H = P.H;
    this.mascots = [mk(T.mascot, H.x + along * s + s * 82, H.y - along * s + s * 82)];
    if (BZ.game.audio && BZ.game.audio.onBeat && !this._beat) this._beat = BZ.game.audio.onBeat(() => { if (this.mascots) for (const m of this.mascots) { m.squash = -.35; m.blob.kick(.6); } });
  },
  drawField(r, M, t) {
    if (this.mascots) for (const m of this.mascots) { if (m.race) continue; r.actor(m.x, m.y, m.z, (g, ox, oy) => { if (m.ghost) px.blend(g, .7, 'normal', () => m.blob.draw(g, ox, oy, r.view)); else m.blob.draw(g, ox, oy, r.view); }); }
    for (const f of this.fx) {
      if (f.kind === 'text') r.queue(f.x, f.y, f.z, g => { const q = r.w(f.x, f.y, f.z + f.t * 10); E.font.text(g, f.text, q[0], q[1], '#ffffff', { align: 'center', shadow: '#000' }); }, { bias: 10 });
      if (f.kind === 'shirt') r.queue(f.x, f.y, 0, g => { const u = f.t / f.life, x = f.x + (f.tx - f.x) * u, y = f.y + (f.ty - f.y) * u, z = 30 + Math.sin(u * Math.PI) * 140, q = r.w(x, y, z); px.rect(g, q[0] - 3, q[1] - 2, 6, 4, f.color); px.rect(g, q[0] - 4, q[1] - 2, 8, 2, f.color); }, { bias: 10 });
    }
    if (this.show) this.drawShow(r, M, t);
  },
  /* ---- the between-innings shows ---- */
  startShow(M) {
    const kinds = ['race', 'dance', 'shirts', 'crew'], kind = kinds[M.shows++ % kinds.length], P = M.park, H = P.H;
    this.show = { kind, t: 0, dur: 4.6 };
    BZ.sting('show');
    BZ.talk.say('between', {}, 2);
    if (kind === 'race') {
      const cols = [M.teams[1].def.mascot, M.teams[0].def.mascot, { R: 7, colors: { dk: '#7a5a1a', base: '#f4c840', lt: '#fff0a0', spec: '#ffffff', eye: '#2a1a0a', pupil: '#000' }, feet: true }];
      this.show.racers = cols.map((c, i) => ({ blob: BZ.makeBlob(Object.assign({}, c)), lane: i, u: 0, sp: .17 + BZ.F() * .05, trip: i === Math.floor(BZ.F() * 3) ? .3 + BZ.F() * .4 : 9, down: 0 }));
      BZ.hud.stamp('MASCOT RACE!', { prio: 2, scale: 3 });
    } else if (kind === 'dance') { BZ.hud.stamp('DANCE CAM!', { prio: 2 }); this.boardMsg = 'DANCE CAM'; this.boardT = 4.5; }
    else if (kind === 'shirts') { BZ.hud.stamp('T-SHIRT CANNON!', { prio: 2 }); this.show.fired = 0; }
    else { BZ.hud.stamp('GROUNDS CREW SHUFFLE!', { prio: 2, scale: 2 }); this.show.crew = [0, 1, 2, 3].map(i => ({ x: H.x - 90 + i * 60, y: H.y - 330, rig: BZ.makeRig({ id: 'crew' + i, look: { build: 'heroic', size: 1.2, skin: SKINS[i * 2 % SKINS.length], hair: 'short' } }, { uniform: { jersey: '#2a6a3a', pants: '#e8d8b0', cap: '#2a6a3a' } }, 'bench') })); }
  },
  showStep(M, dt) {
    const S = this.show; S.t += dt;
    if (S.kind === 'race') for (const r of S.racers) { if (r.down > 0) { r.down -= dt; continue; } r.u = Math.min(1, r.u + r.sp * dt); if (r.u > r.trip) { r.trip = 9; r.down = 1; BZ.sfx('slideWhistle'); } r.blob.update(dt, { walk: 1, squash: Math.sin(S.t * 12 + r.lane) * .2 }); }
    if (S.kind === 'shirts' && S.t > .5 + S.fired * .5 && S.fired < 6) {
      S.fired++; BZ.sfx('pow');
      const P = M.park, s = BZ.pickF(P.standCells.filter(c => c.behind === false) || P.standCells); const H = P.H;
      if (s) this.fx.push({ kind: 'shirt', x: H.x, y: H.y - 60, tx: s.x, ty: s.y, t: 0, life: 1.3, color: BZ.pickF(M.teams[1].def.colors) });
    }
    if (S.kind === 'crew') for (const c of S.crew) BZ.rigUpdate(c.rig, dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2, attack: E.move(['jab', 'cross', 'hook', 'uppercut'][Math.floor(S.t * 2 + c.x) % 4], (S.t * 2) % 1, 'active'), expr: 'smile' });
  },
  showDone(M) { return !this.show || this.show.t >= this.show.dur; },
  endShow(M) { this.show = null; },
  showFocus(M) { const H = M.park.H, S = this.show; if (!S) return [{ x: H.x, y: H.y - 300 }]; if (S.kind === 'race') { const R = M.park.R(-.6); return [{ x: H.x - 380, y: H.y - R * .7 }, { x: H.x + 380, y: H.y - R * .7 }]; } if (S.kind === 'crew') return [{ x: H.x - 140, y: H.y - 380 }, { x: H.x + 140, y: H.y - 280 }]; return [{ x: H.x - 200, y: H.y - 200 }, { x: H.x + 200, y: H.y + 40 }]; },
  drawShow(r, M, t) {
    const S = this.show, P = M.park, H = P.H;
    if (S.kind === 'race') for (const rc of S.racers) {
      const th = -.75 + rc.u * 1.5, R = P.R(th) - 26 - rc.lane * 12, x = H.x + Math.sin(th) * R, y = H.y - Math.cos(th) * R;
      r.shadow(x, y, 7, .4);
      r.actor(x, y, rc.down > 0 ? 0 : 0, (g, ox, oy) => rc.blob.draw(g, ox, oy, r.view));
      if (rc.down > 0) r.queue(x, y, 30, g => { const q = r.w(x, y, 26); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; E.font.text(g, '★', q[0] + Math.cos(a) * 7, q[1] + Math.sin(a) * 3, '#ffd040'); } }, { bias: 5 });
    }
    if (S.kind === 'crew') for (const c of S.crew) { r.shadow(c.x, c.y, 6, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
  }
};
/** the jumbotron or scoreboard screen, drawn on its face's projected quad */
BZ.drawBoardScreen = (g, q, t, pr) => {
  const M = BZ.M, C = BZ.crowd;
  const [p0, p1, p2, p3] = q, x0 = Math.min(p0[0], p3[0]), x1 = Math.max(p1[0], p2[0]), y0 = Math.min(p2[1], p3[1]), y1 = Math.max(p0[1], p1[1]);
  px.poly(g, q, pr.id === 'bz_barnboard' ? '#0e1a0e' : '#06080e');
  const w = x1 - x0, h = y1 - y0; if (w < 6 || h < 4) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (!M) { E.font.text(g, 'BATZOOKA', cx, cy - 3, '#ffd040', { align: 'center' }); return; }
  // bulbs on the barn board, a message or the batter on a video board
  if (C && C.boardT > 0 && C.boardMsg) {
    const blink = Math.floor(t * 6) % 2; E.font.text(g, C.boardMsg, cx, cy - 3, blink ? '#ffd040' : '#ff7a1a', { align: 'center', scale: w > 120 ? 2 : 1 });
    if (C.show && C.show.kind === 'dance') { const k = Math.sin(t * 9); px.disc(g, cx + k * 6, cy + 6, 3, '#f1c7a0'); px.rect(g, cx - 3 + k * 6, cy + 9, 6, 6, '#d83a2a'); }
    return;
  }
  if (h > 16 && M.batter && pr.megatron !== false) {
    const rig = BZ.rigFor(M.batter, 'bench');
    if (rig && BZ.cosmetic && h > 26) rig.drawPortrait(g, Math.round(x0 + 3), Math.round(y0 + 2), Math.round(Math.min(h - 4, 40)), { zoom: 2, frame: false });
    E.font.text(g, M.batter.short, x0 + Math.min(h - 4, 40) + 6, cy - 6, '#ffffff');
    E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].runs + '  ' + M.teams[1].def.abbr + ' ' + M.teams[1].runs, x0 + Math.min(h - 4, 40) + 6, cy + 3, '#ffd040');
  } else E.font.text(g, M.teams[0].runs + ' - ' + M.teams[1].runs, cx, cy - 3, '#ffd040', { align: 'center' });
};

/* ===== src/30-match.js ===== */
/* =============================================================================
 * 30-match: a ballgame. BZ.newMatch builds the state BZ.M; BZ.matchStep runs it
 * in exact steps (pregame -> halfStart -> atBat [walkup, select, windup, flight,
 * settle] -> inPlay -> playOver -> ... -> halfEnd -> between -> ... -> final),
 * with side states for cinematics, the Rhubarb and SUDDEN BOOM. The simulation
 * runs only here; drawing only reads it. A whole game runs headless.
 * ========================================================================== */
BZ.newMatch = (o = {}) => {
  const parkId = o.park || 'kernel', P = BZ.park(parkId);
  BZ.seed(o.seed !== undefined ? o.seed : (Date.now() & 0xffffff));
  const M = {
    mode: o.mode || 'exhibition', parkId, park: P, teams: [BZ.newTeamState(o.away || 'krakens', 0), BZ.newTeamState(o.home || 'comets', 1)],
    inning: 1, half: 'top', outs: 0, balls: 0, strikes: 0, bases: [null, null, null], innings: o.innings || 3,
    difficulty: o.difficulty || 'pro', cpuLevel: o.cpuLevel || o.difficulty || 'pro', mercy: o.mercy !== false,
    phase: 'pregame', phaseT: 0, clock: 0, fielders: [], runners: [], ball: BZ.newBall(), batter: null, pitcher: null,
    reticle: { x: 0, z: 17, vx: 0, vz: 0 }, marker: { x: 0, z: 17 }, ab: null, play: null, stats: {}, unsub: [], cheats: Object.assign({}, o.cheats || {}),
    fast: !!o.fast, attract: !!o.attract, seed: o.seed, tourStop: o.tourStop, upgrades: o.upgrades || null, upgradeTeam: o.upgradeTeam === undefined ? -1 : o.upgradeTeam,
    leads: {}, steals: {}, events: [], walkoff: false, result: null, boss: o.boss || null, script: o.script || null, cams: { mode: 'plate' }, log: [], lastContact: null, pitchCount: 0, playCount: 0,
    hazardFirst: {}, rallyCap: false, shows: 0, bonusRunner: false
  };
  M.teamOf = (p) => M.teams[0].lineup.includes(p) || M.teams[0].pitcher === p || M.teams[0].bullpen.includes(p) || (p && p.team === M.teams[0].id) ? M.teams[0] : M.teams[1];
  for (const s of [0, 1]) {
    const H = (o.humans && o.humans[s]) || [];
    M.teams[s].humans = H.map((inp, i) => ({ input: inp, role: i ? 'cocaptain' : 'captain' }));
    if (o.levels && o.levels[s]) M.teams[s].level = o.levels[s];
  }
  if (o.meters) { M.teams[0].meter = o.meters[0] || 0; M.teams[1].meter = o.meters[1] || 0; }
  P.rollWind();
  BZ.M = M;
  BZ.supers.install(M);
  BZ.match.setupDefense(M);
  M.batter = BZ.rules.batterNow(M); M.pitcher = BZ.defense(M).pitcher;
  if (BZ.hazards) BZ.hazards.init(M);
  M.unsub.push(BZ.bus.on('*', (d, ev) => { M.events.push(ev); if (M.events.length > 400) M.events.shift(); }));
  BZ.bus.emit('matchStart', { away: M.teams[0].id, home: M.teams[1].id, park: parkId });
  return M;
};
BZ.endMatch = (M) => { if (!M) return; for (const u of M.unsub) u(); M.unsub = []; if (BZ.hazard && BZ.hazard.end) BZ.hazard.end(M); };

BZ.match = {
  setupDefense(M) {
    const D = BZ.defense(M), P = M.park;
    const pos = {}; for (const p of D.lineup) pos[p.pos] = p; pos.P = D.pitcher;
    M.fielders = BZ.POS_ORDER.map(k => BZ.makeFielder(M, pos[k] || D.lineup[0], k));
    M.pitcher = D.pitcher;
    void P;
  },
  phase(M, ph) { M.phase = ph; M.phaseT = 0; BZ.bus.emit('phase', { phase: ph }); },
  /* ---- the at-bat ---- */
  newAtBat(M) {
    // the CPU calls the bullpen when its pitcher is gassed; a human sees the toast and uses Pitching change
    const D0 = BZ.defense(M);
    if (BZ.staminaOf(M, D0.pitcher) < 20 && D0.bullpen.length) {
      if (!D0.humans.length && !M.lesson) { const rp = D0.bullpen.shift(); D0.pitcher = rp; BZ.bus.emit('pitchingChange', { pitcher: rp }); BZ.hud.toast && BZ.hud.toast('NOW PITCHING: ' + rp.name.toUpperCase()); this.setupDefense(M); }
      else if (!M.bullpenSaid) { M.bullpenSaid = true; BZ.hud.toast && BZ.hud.toast('BULLPEN\'S READY: PITCHING CHANGE IN THE PAUSE MENU'); }
    }
    M.batter = BZ.rules.batterNow(M); M.pitcher = BZ.defense(M).pitcher;
    M.ab = { sub: 'walkup', t: 0, swing: null, pitch: null }; M.batterUp = false;
    M.leads = {}; M.steals = {};
    M.reticle.x = 0; M.reticle.z = 17;
    for (const f of M.fielders) { f.has = false; f.state = 'set'; f.z = 0; f.vz = 0; f.role = 'idle'; f.climbed = false; f.jumped = false; f.dives = 0; f.human = null; f.humanOverride = false; f.charge = null; f.botRun = null; f.throwT = 0; }
    M.ctlF = null; M.ctlLocked = false;
    M.ball.mode = 'none'; M.ball.trail = [];
    this.phase(M, 'atBat');
    BZ.bus.emit('batterUp', { batter: M.batter, team: BZ.offense(M).id, order: BZ.offense(M).order });
  },
  nextPitch(M) {
    M.ab.sub = 'select'; M.ab.t = 0; M.ab.swing = null; M.ab.pitch = null; M.ab.released = false; M.ab.contactDone = false; M.ab.botPlan = null; M.ab.botPick = null; M.ab.botRel = false; M.ab.cpu = null; M.ab.result = null; M.ab.bunting = false; M.ab.pick = null;
    M.leads = {}; M.steals = {};
    M.ball.mode = 'none';
    BZ.supers.pitchTick(M);
    BZ.bus.emit('pitchSelect', {});
  },
  atBat(M, dt) {
    const S = M.ab, D = BZ.defense(M), O = BZ.offense(M), PI = BZ.ctl.who(M, D.side, 'pitch'), BI = BZ.ctl.who(M, O.side, 'bat'), RI = BZ.ctl.who(M, O.side, 'run');
    S.t += dt;
    // fielders drift back to their spots between pitches
    for (const f of M.fielders) { BZ.moveTo(f, f.home.x, f.home.y, M.fast ? 1e5 : 120, dt); if (Math.hypot(f.x - f.home.x, f.y - f.home.y) < 1) f.facing = Math.atan2(M.park.H.y - f.y, M.park.H.x - f.x); }
    if (S.sub === 'walkup') { if (S.t >= (M.fast ? 0 : .9) || (BI && BI.pressed('south') && S.t > .2)) this.nextPitch(M); return; }
    // the batter's reticle: the stick or WASD moves it, the mouse places it
    if (BI) this.reticleInput(M, BI, dt);
    if (S.sub === 'select') {
      // offense: the Batzooka, the extra lead, a steal
      if (BI && BI.pressed('r1') && !(RI !== BI && RI && RI.down('l1'))) { if (O.meter >= 100 && !O.batzookaArmed) BZ.supers.arm(M, O.side); else if (!O.batzookaArmed) this.extraLead(M); }
      if (RI && RI !== BI && RI.pressed('r1')) this.extraLead(M);
      if (RI && RI.down('l1')) { const b = BZ.basePressed(RI); if (b && b >= 2 && b <= 4 && M.bases[b - 2] && (b === 4 || !M.bases[b - 1])) { M.steals[b - 1] = true; BZ.bus.emit('stealCall', { base: b }); BZ.sfx('select'); } }
      // defense: pick a pitch (or a pickoff)
      if (PI) {
        if (PI.down('l1')) { const b = BZ.basePressed(PI); if (b && b <= 3 && M.bases[b - 1]) { this.pickoff(M, b); return; } }
        if (BZ.wheel) { S.pick = ((S.pick || 0) + BZ.wheel + 50) % 5; BZ.sfx('select'); }
        let slot = null;
        if (PI.lastDevice === 'mouse') { if (PI.pressed('south')) slot = (S.pick || 0) < 4 ? BZ.PITCH_SLOTS[S.pick || 0] : 'r1'; }
        else for (const sl of ['south', 'east', 'west', 'north']) if (PI.pressed(sl)) slot = sl;
        if (PI.pressed('r1')) slot = 'r1';
        ['num1', 'num2', 'num3', 'num4', 'num5'].forEach((n, i) => { if (PI.pressed(n)) slot = i < 4 ? BZ.PITCH_SLOTS[i] : 'r1'; });
        if (slot === 'r1' && D.meter < 100) { slot = null; BZ.sfx('cancel'); }
        if (slot) this.beginWindup(M, slot, null);
      } else {
        const wait = M.fast ? 0 : (M.attract ? .6 : .9);
        if (S.t > wait) {
          const ch = M.forcePitch ? Object.assign({ slot: 'south', q: 1 }, M.forcePitch) : BZ.ai.choosePitch(M, D.side);
          if (M.forcePitch) { ch.type = M.forcePitch.type; ch.target = M.forcePitch.target || [0, 17]; M.forcePitch = null; }
          if (!O.humans.length && !M.fast) Object.assign(M.steals, BZ.ai.steals(M, O.side));
          this.beginWindup(M, ch.slot, ch);
        }
      }
      return;
    }
    if (S.sub === 'windup') {
      // the target marker: the stick, WASD or mouse moves it over the zone plane
      if (PI) this.markerInput(M, PI, dt);
      const relT = S.windT;
      if (PI && !S.released) {
        const again = S.slot === 'r1' ? PI.pressed('r1') : (PI.pressed(S.slot) || (PI.lastDevice === 'mouse' && PI.pressed('south')));
        const numAgain = ['num1', 'num2', 'num3', 'num4', 'num5'].some((n, i) => PI.pressed(n) && (i < 4 ? BZ.PITCH_SLOTS[i] : 'r1') === S.slot);
        if ((again || numAgain) && S.t > relT - BZ.RING - .15) this.release(M, BZ.releaseQ(S.t - relT));
        else if (S.t > relT + .2) this.release(M, .3);
      } else if (!PI && !S.released && S.t >= relT) this.release(M, S.cpu ? S.cpu.q : .6);
      return;
    }
    if (S.sub === 'flight') this.flight(M, dt, PI, BI);
  },
  extraLead(M) { for (let b = 1; b <= 3; b++) if (M.bases[b - 1]) M.leads[b] = .08; BZ.bus.emit('lead', {}); },
  reticleInput(M, I, dt) {
    const R = M.reticle, mv = I.move();
    const ptr = I.lastDevice === 'mouse' && I.pointer && I.pointer() && BZ.cams && BZ.cams.pointerToZone ? BZ.cams.pointerToZone(I.pointer()) : null;
    if (ptr) { R.x = ptr[0]; R.z = ptr[1]; }
    else {
      const tx = mv[0], tz = -mv[1];
      R.vx = BZ.approach(R.vx, tx * 80, 600 * dt); R.vz = BZ.approach(R.vz, tz * 80, 600 * dt);
      R.x += R.vx * dt; R.z += R.vz * dt;
    }
    const k = ((M.batter.look && M.batter.look.size) || 1.25) / 1.25;
    R.x = clamp(R.x, -BZ.GEO.zoneHalfW - 6, BZ.GEO.zoneHalfW + 6); R.z = clamp(R.z, BZ.GEO.zoneLo * k - 6, BZ.GEO.zoneHi * k + 6);
  },
  markerInput(M, I, dt) {
    const K = M.marker, mv = I.move();
    const ptr = I.lastDevice === 'mouse' && I.pointer && I.pointer() && BZ.cams && BZ.cams.pointerToZone ? BZ.cams.pointerToZone(I.pointer()) : null;
    if (ptr) { K.x = ptr[0]; K.z = ptr[1]; }
    else { K.x += mv[0] * 34 * dt; K.z -= mv[1] * 34 * dt; }
    if (BZ.game.settings && BZ.game.settings.pitchAssist === 'auto' && !ptr && Math.hypot(mv[0], mv[1]) < .1) { K.x = lerp(K.x, 0, dt * 1.5); K.z = lerp(K.z, 17, dt * 1.5); }
    K.x = clamp(K.x, -BZ.GEO.zoneHalfW - 8, BZ.GEO.zoneHalfW + 8); K.z = clamp(K.z, BZ.GEO.zoneLo - 8, BZ.GEO.zoneHi + 8);
  },
  beginWindup(M, slot, cpu) {
    const S = M.ab, D = BZ.defense(M), p = D.pitcher;
    const type = cpu && cpu.type ? cpu.type : slot === 'r1' ? D.def.superPitch : BZ.repertoire(p)[BZ.PITCH_SLOTS.indexOf(slot)];
    S.slot = slot; S.type = type; S.cpu = cpu; S.sub = 'windup'; S.t = 0;
    const tempo = M.fast ? .3 : (BZ.WINDUP * (1.1 - .02 * (p.vel || 5)) * (D.shortCircuit > 0 ? 1.2 : 1));
    S.windT = tempo; S.ringStart = Math.max(0, tempo - BZ.RING);
    if (cpu) { M.marker.x = cpu.target[0]; M.marker.z = cpu.target[1]; }
    else { M.marker.x = 0; M.marker.z = 17; }
    if (slot === 'r1') { D.meter = 0; BZ.bus.emit('super', { kind: 'pitch', type, side: D.side }); }
    BZ.bus.emit('windup', { type, slot });
  },
  release(M, q) {
    const S = M.ab, D = BZ.defense(M), O = BZ.offense(M), p = D.pitcher;
    S.released = true; S.q = q; S.sub = 'flight'; S.t = 0;
    const st = BZ.staminaOf(M, p), def = BZ.PITCHES[S.type] || BZ.PITCHES.heater;
    D.stamina[p.id] = Math.max(0, st - def.cost * TUNE.staminaDrain);
    let speedMul = 1;
    if (!D.humans.length || M.attract) speedMul *= BZ.LEVELS[M.cpuLevel] ? BZ.LEVELS[M.cpuLevel].pitchMul : 1;
    if (S.slot === 'r1' && !def.speed) speedMul *= 1.35;
    if (M.boss && D.id === 'mechanicals') speedMul *= 1 + .05 * (M.inning - 1);
    if (D.shortCircuit > 0) speedMul *= .85;
    if (M.lessonSpeed) speedMul *= M.lessonSpeed;
    if (M.upgrades && M.upgradeTeam === D.side) speedMul *= 1 + .03 * (M.upgrades.arms || 0);
    const target = [M.marker.x, M.marker.z];
    const strikeCheat = M.cheats.allStrikes && (D.humans.length || M.attract);
    S.pitch = new BZ.Pitch(M, { type: S.type, pitcher: p, target: strikeCheat ? [clamp(target[0], -4, 4), clamp(target[1], 12, 22)] : target, q, lefty: (p.bt || 'R/R').split('/')[1] === 'L', speedMul, stamina: st, noMiss: strikeCheat });
    M.pitchCount++;
    BZ.bus.emit('release', { type: S.type, q, speed: BZ.mph(S.pitch.speed), slot: S.slot, perfect: q >= .999 });
    if (q >= .999 && D.humans.length) BZ.bus.emit('perfectRelease', {});
    // the CPU batter's plan; runners break on a steal
    if (!O.humans.length) S.cpuSwing = BZ.ai.cpuSwingSchedule(M, O.side, S.pitch);
    else S.cpuSwing = null;
    if (S.cpuSwing && S.cpuSwing.plan.zooka && O.meter >= 100) BZ.supers.arm(M, O.side);
    if (M.forceContact) S.forceContact = M.forceContact, M.forceContact = null;
    if (S.cpu && S.cpu.after) S.cpuAfter = S.cpu.after;
    M.ball.mode = 'pitch';
  },
  flight(M, dt, PI, BI) {
    const S = M.ab, pt = S.pitch, O = BZ.offense(M), D = BZ.defense(M);
    // aftertouch: the pitcher's stick bends the ball during the first 40% of the flight
    if (PI) { const mv = PI.move(); if (Math.hypot(mv[0], mv[1]) > .25 && pt.u < .4) { if (!pt.afterUsed) { D.stamina[D.pitcher.id] = Math.max(0, BZ.staminaOf(M, D.pitcher) - .5); BZ.bus.emit('aftertouch', {}); } pt.steer(mv[0], -mv[1], dt); } }
    else if (S.cpuAfter && pt.u < .4) pt.steer(S.cpuAfter[0], S.cpuAfter[1], dt);
    // the black hole pulls a nearby reticle
    if (pt.def.pull) { const c = pt.pos(pt.u); const dx = c.x - M.reticle.x, dz = c.z - M.reticle.z, d = Math.hypot(dx, dz); if (d < 10 && d > .1) { M.reticle.x += dx / d * 3 * dt * 3; M.reticle.z += dz / d * 3 * dt * 3; } }
    pt.step(dt);
    // the batter: a human's buttons, or the CPU's scheduled press
    const assist = BZ.assistFor(M, O.side);
    if (BI && !S.swing && !S.contactDone) {
      let type = null;
      if (BI.pressed('r1') && O.meter >= 100 && !O.batzookaArmed) BZ.supers.arm(M, O.side);
      if (BI.pressed('south') && !(BI.lastDevice === 'mouse' && BI.held && BI.held.has && BI.held.has('Mouse2'))) type = 'contact';
      if (BI.pressed('west')) type = 'power';
      if (type) S.swing = { type: O.batzookaArmed ? 'batzooka' : type, t0: pt.t, human: true };
      S.bunting = BI.down('north');
    } else if (!BI && S.cpuSwing && !S.swing && pt.t >= S.cpuSwing.pressAt) {
      const pl = S.cpuSwing.plan;
      if (pl.type === 'bunt') S.bunting = true;
      else S.swing = { type: O.batzookaArmed ? 'batzooka' : pl.type, t0: pt.t, cpu: pl };
    }
    if (S.swing && !S.swing.done) {
      const sw = S.swing, Sd = BZ.SWINGS[sw.type] || BZ.SWINGS.contact, impact = sw.t0 + Sd.delay;
      if (pt.t >= impact) { sw.done = true; this.evaluateSwing(M, sw, impact - pt.T, assist); if (M.phase !== 'atBat') return; }
    }
    if (S.bunting && !S.swing && pt.t >= pt.T && !S.buntDone) {
      S.buntDone = true;
      const c = pt.cross(), res = BZ.buntContact(c, M.reticle.x, M.reticle.z, M.batter, M.park);
      if (res.kind === 'contact') { this.contact(M, res, c); return; }
      S.buntMiss = true;
    }
    // the pitch settles in the catcher's mitt
    const win = BZ.swingWindow(assist);
    if (pt.t >= pt.T + Math.max(.1, win + .02) && !S.contactDone) this.settlePitch(M);
  },
  evaluateSwing(M, sw, e, assist) {
    const S = M.ab, pt = S.pitch, O = BZ.offense(M), c = pt.cross(), lefty = (M.batter.bt || 'R/R')[0] === 'L';
    const ball = { x: c.x, z: c.z };
    const zooka = sw.type === 'batzooka';
    if (zooka) BZ.supers.spend(M, O.side);
    sw.e = e; sw.rx = sw.cpu ? sw.cpu.rx : M.reticle.x; sw.rz = sw.cpu ? sw.cpu.rz : M.reticle.z;
    if (M.cheats.perfect && (O.humans.length || M.attract) || S.forceContact === 'perfect') { sw.e = 0; sw.rx = c.x; sw.rz = c.z + (sw.type === 'power' || zooka ? -.6 : 0); }
    if (S.forceContact && typeof S.forceContact === 'object') { sw.e = (S.forceContact.timingMs || 0) / 1000; sw.rx = c.x - (S.forceContact.dx || 0); sw.rz = c.z - (S.forceContact.dz || 0); }
    if (S.forceContact === 'miss') sw.e = 1;
    const lumber = M.upgrades && M.upgradeTeam === O.side ? 1 + .05 * (M.upgrades.lumber || 0) : 1;
    let res = BZ.contact(sw, ball, pt.speed, M.batter, M.park, lefty, assist, { needGood: pt.def.needGood, evMul: (M.evMul || 1) * lumber });
    if (M.scriptHit && res.kind !== 'miss') res = M.scriptHit(res, sw) || res;
    res.zooka = zooka; res.type = sw.type;
    M.lastContact = { timingMs: res.ms, dx: +(ball.x - sw.rx).toFixed(2), dz: +(ball.z - sw.rz).toFixed(2), Q: res.Q !== undefined ? +res.Q.toFixed(3) : 0, EV: res.EV ? Math.round(res.EV) : 0, launch: res.phi ? +res.phi.toFixed(1) : 0, spray: res.theta ? +res.theta.toFixed(1) : 0, kind: res.kind, grade: res.grade };
    BZ.bus.emit('swing', { type: sw.type, kind: res.kind, grade: res.grade, ms: res.ms, feedback: res.feedback, feedback2: res.feedback2 });
    if (res.kind === 'miss') {
      S.whiff = true;
      if (zooka) BZ.bus.emit('batzookaFizzle', { batter: M.batter });
      BZ.bus.emit('miss', { ms: res.ms });
      return;
    }
    if (res.kind === 'foultip') { S.contactDone = true; S.result = 'foultip'; BZ.bus.emit('foulTip', {}); this.afterPitch(M, () => BZ.rules.foul(M, false)); return; }
    this.contact(M, res, c);
  },
  contact(M, res, c) {
    const S = M.ab, P = M.park, b = M.ball, pt = S.pitch;
    S.contactDone = true;
    Object.assign(b, BZ.newBall(), { x: P.H.x + c.x, y: P.H.y - 6, z: Math.max(2, c.z), vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted', spin: res.spin || 0, boost: res.zooka ? .5 : 0, version: 1 });
    if (M.cheats.homer || S.forceContact === 'homer') { const th = (res.theta || 0) * Math.PI / 180 * .5, sp = 900; b.vx = Math.sin(th) * sp * .8; b.vy = -Math.cos(th) * sp * .8; b.vz = sp * .6; b.boost = res.zooka ? .5 : 0; M.cheats.homer = false; }
    M.lastBatted = { theta: res.theta, phi: res.phi, EV: res.EV, Q: res.Q, zooka: !!res.zooka, bunt: !!res.bunt };
    BZ.bus.emit('contact', { Q: res.Q || 0, EV: res.EV, zooka: !!res.zooka, bunt: !!res.bunt, grade: res.grade, batter: M.batter, theta: res.theta, phi: res.phi, foulTip: false });
    if (res.zooka) BZ.bus.emit('batzookaHit', { batter: M.batter });
    BZ.play.begin(M, 'batted', { contact: res });
    M.play.predT0 = 0;
    BZ.play.replan(M);
    M.play.contactPred = M.play.pred;
    // runners stealing get their head start
    for (const r of M.runners) if (r.steal) r.p = Math.min(r.start + .3, r.p + .25);
    this.phase(M, 'inPlay');
    void pt;
  },
  /** the pitch reaches the catcher with no contact: the call, or a wild pitch, a steal throw */
  settlePitch(M) {
    const S = M.ab, pt = S.pitch, c = pt.cross(), D = BZ.defense(M), O = BZ.offense(M), lefty = (M.batter.bt || 'R/R')[0] === 'L';
    S.contactDone = true;
    const size = (M.batter.look && M.batter.look.size) || 1.25;
    const swung = S.whiff || (S.buntMiss && S.bunting);
    let call;
    if (swung) call = 'swingStrike';
    else if (BZ.hitsBatter(c.x, c.z, lefty)) call = 'hbp';
    else call = BZ.inZone(c.x, c.z, size) ? 'strike' : 'ball';
    S.result = call; S.cross = c;
    BZ.bus.emit('pitchCross', { x: c.x, z: c.z, call, type: S.type, speed: BZ.mph(pt.speed) });
    if (call === 'hbp') {
      const hard = pt.speed >= .9 * 340;
      const rh = BZ.game && BZ.game.settings ? BZ.game.settings.rhubarbs !== false : true;
      BZ.statFor(M, D.pitcher).pitches++;
      if (!M.cheats.noRhubarb && ((hard && rh && BZ.R() < TUNE.rhubarbChance && !M.fast) || (M.script && M.script.rhubarbOnHbp))) { if (M.script) M.script.rhubarbOnHbp = false; M.pendingRhubarb = true; }
      this.afterPitch(M, () => { BZ.rules.walk(M, true); });
      return;
    }
    // a wild pitch or passed ball: outside the catcher's reach
    const wild = Math.abs(c.x) > 16 || c.z < 2 || c.z > 34;
    const C = M.fielders.find(f => f.pos === 'C');
    const anyOn = M.bases.some(Boolean);
    if (wild && anyOn && BZ.R() < .35 * (1 - (C ? C.player.glv : 5) / 10)) {
      const after = call === 'swingStrike' ? () => BZ.rules.strike(M, 'swinging') : call === 'strike' ? () => BZ.rules.strike(M, 'looking') : () => BZ.rules.ball(M);
      const res = after(); if (M.outs >= 3 || res === 'K' && M.outs >= 3) { this.endOfPlay(M); return; }
      if (res === 'BB' || res === 'K') { this.afterPitch(M, () => {}); return; }
      BZ.play.begin(M, 'wild');
      const P = M.park, b = M.ball; Object.assign(b, { x: P.H.x + c.x, y: P.H.y + 10, z: 6, vx: c.x * 4, vy: 160, vz: 30, mode: 'loose', version: b.version + 1, bounced: 1, fair: 'fair', touched: true });
      BZ.bus.emit('wildPitch', {});
      this.phase(M, 'inPlay');
      return;
    }
    const steal = Object.keys(M.steals).length > 0;
    this.afterPitch(M, () => {
      const r = call === 'swingStrike' ? BZ.rules.strike(M, 'swinging') : call === 'strike' ? BZ.rules.strike(M, 'looking') : BZ.rules.ball(M);
      return r;
    }, steal);
  },
  /** apply a pitch's outcome to the count, then the next pitch, the next batter, a steal play or the end of the half */
  afterPitch(M, apply, steal) {
    const res = apply();
    M.playCount++;
    if (M.pendingRhubarb && BZ.rhubarb) { M.pendingRhubarb = false; BZ.rhubarb.start(M, 'hbp'); return; }
    if (M.outs >= 3) { this.endOfPlay(M); return; }
    if (steal && res !== 'BB' && res !== 'K' && !M.walkoff) {
      // the steal: the catcher has the ball, the runners are running
      BZ.play.begin(M, 'steal');
      const C = M.fielders.find(f => f.pos === 'C');
      for (const r of M.runners) if (r.steal) { r.p = r.start + .62; r.goal = r.start + 1; r.state = 'run'; }
      BZ.play.give(M, C, 'pitch'); C.decideT = .05;
      this.phase(M, 'inPlay');
      return;
    }
    if (M.walkoff) { this.final(M); return; }
    M.ab.sub = 'settle'; M.ab.t = 0; M.ab.next = (res === 'BB' || res === 'K' || M.batterUp) ? 'batter' : 'pitch';
    M.batterUp = false;
    M.ball.mode = 'held';
  },
  pickoff(M, base) {
    BZ.play.begin(M, 'pickoff');
    const P = M.fielders.find(f => f.pos === 'P'), cov = { 1: '1B', 2: 'SS', 3: '3B' }[base], rec = M.fielders.find(f => f.pos === cov);
    const bp = M.park.base(base); if (rec) { rec.x = bp.x + (base === 1 ? 4 : 0); rec.y = bp.y + 6; rec.role = 'cover'; rec.coverBase = base; rec.tx = bp.x; rec.ty = bp.y; }
    const r = M.runners.find(q => q.start === base); if (r) { r.p = base + (M.leads[base] ? .08 : .04); r.goal = base; }
    BZ.play.give(M, P, 'pitch'); BZ.play.startThrow(M, P, base, .9);
    BZ.bus.emit('pickoff', { base });
    this.phase(M, 'inPlay');
  },
  /* ---- the live play ---- */
  inPlay(M, dt) {
    if (M.cinematic) return;
    BZ.ctl.step(M, dt);
    BZ.play.update(M, dt);
    if (M.play.done) this.resolvePlay(M);
  },
  resolvePlay(M) {
    const pl = M.play, O = BZ.offense(M);
    if (pl.deadReason === 'foul') {
      M.runners = []; M.ball.mode = 'dead';
      const bunt = M.lastBatted && M.lastBatted.bunt;
      BZ.bus.emit('foul', { bunt });
      this.afterPitch(M, () => BZ.rules.foul(M, bunt));
      if (M.phase === 'inPlay') this.phase(M, 'atBat');
      return;
    }
    const batterRunner = M.runners.find(r => r.isBatter);
    let hitBases = 0;
    if (pl.kind === 'batted') {
      if (pl.deadReason === 'hr') hitBases = 4;
      else if (pl.deadReason === 'grd') hitBases = 2;
      else if (batterRunner && batterRunner.state !== 'out') {
        const reached = clamp(Math.round(batterRunner.p), 1, 4);
        const fc = pl.outs.length > 0 && !pl.caughtFly;
        if (pl.error && !pl.wildThrow) { BZ.statFor(M, M.batter).AB++; BZ.bus.emit('reachedOnError', {}); }
        else if (fc) { BZ.statFor(M, M.batter).AB++; BZ.bus.emit('fieldersChoice', {}); }
        else {
          hitBases = Math.min(3, reached);
          if (batterRunner.state === 'scored') hitBases = 4;
          const s = BZ.statFor(M, M.batter); s.AB++; s.H++; if (hitBases === 2) s['2B']++; if (hitBases === 3) s['3B']++; if (hitBases === 4) { s.HR++; pl.insideParker = true; }
          O.hits++;
        }
      }
      if (hitBases && pl.deadReason !== 'hr' && pl.deadReason !== 'grd') BZ.bus.emit('hit', { bases: hitBases, batter: M.batter, inside: !!pl.insideParker });
      else if (pl.deadReason === 'hr' || pl.deadReason === 'grd') BZ.bus.emit('hit', { bases: hitBases, batter: M.batter, dead: true });
    }
    if (pl.kind === 'steal') for (const r of M.runners) if (r.stoleBase === undefined && r.steal !== undefined && r.state === 'out') BZ.bus.emit('steal', { ok: false, runner: r.player });
    BZ.runners.settle(M);
    if (pl.kind === 'batted') BZ.rules.nextBatter(M);
    BZ.bus.emit('playEnd', { kind: pl.kind, reason: pl.deadReason, outs: pl.outs.length, runs: pl.runs.length, hit: hitBases, error: pl.error });
    this.endOfPlay(M);
  },
  endOfPlay(M) {
    M.ball.mode = M.ball.mode === 'dead' ? 'dead' : 'held';
    if (M.walkoff) { this.final(M); return; }
    if (M.outs >= 3) { this.halfOver(M); return; }
    this.phase(M, 'playOver');
  },
  halfOver(M) {
    M.runners = []; M.bases = [null, null, null];
    BZ.bus.emit('halfEnd', { inning: M.inning, half: M.half, score: [M.teams[0].runs, M.teams[1].runs] });
    this.phase(M, 'halfEnd');
  },
  afterHalf(M) {
    const over = BZ.rules.gameOverAfterHalf(M);
    if (over && over.why === 'boom') { this.startBoom(M); return; }
    if (over) { M.endWhy = over.why; this.final(M); return; }
    // the boss's short circuit wears off, the Rally Cap
    for (const T of M.teams) if (T.shortCircuit > 0) T.shortCircuit--;
    BZ.rules.nextHalf(M);
    this.setupDefense(M);
    if (M.boss && M.half === 'top' && M.inning >= M.innings && BZ.leadBy(M) > 0 && M.teams[0].id === 'comets' && !M.rallyCap) { M.rallyCap = true; M.teams[0].meter = 100; BZ.bus.emit('rallyCap', {}); }
    this.phase(M, 'halfStart');
  },
  final(M) {
    const a = M.teams[0].runs, h = M.teams[1].runs;
    M.result = { winner: M.boomWinner !== undefined ? M.boomWinner : a > h ? 0 : h > a ? 1 : -1, score: [a, h], why: M.endWhy || (M.walkoff ? 'walkoff' : 'final') };
    BZ.bus.emit('gameEnd', M.result);
    this.phase(M, 'final');
  },
  /* ---- SUDDEN BOOM: the home run duel after 3 extra innings ---- */
  startBoom(M) {
    const pick = T => T.lineup.slice().sort((x, y) => y.pow - x.pow)[0];
    M.boom = { round: 0, side: 0, swings: [0, 0], feet: [0, 0], slugger: [pick(M.teams[0]), pick(M.teams[1])], max: 5, t: 0 };
    BZ.bus.emit('suddenBoom', {});
    this.phase(M, 'boom');
  },
  boom(M, dt) {
    const B = M.boom; B.t += dt;
    if (B.t < (M.fast ? 0 : 1.2)) return;
    B.t = 0;
    const side = B.side, sl = B.slugger[side], T = M.teams[side], R = BZ.R, L = BZ.ai.lv(M, side);
    // a machine pitch and a swing: the CPU's or the human's quality comes from the same model at the slugger's level
    const pitch = new BZ.Pitch(M, { type: 'machine', pitcher: { vel: 5, brk: 3 }, target: [(R() - .5) * 6, 15 + R() * 6], q: 1, rand: R });
    const c = pitch.cross(), human = T.humans.length > 0;
    const e = BZ.Rn(human ? .03 : L.swingSd), sw = { type: 'power', e, rx: c.x + BZ.Rn(1.2), rz: c.z + BZ.Rn(1.2) };
    const res = BZ.contact(sw, c, pitch.speed, sl, M.park, (sl.bt || 'R')[0] === 'L', BZ.assistFor(M, side));
    let feet = 0, carry = 0;
    if (res.kind === 'contact') {
      const b = Object.assign(BZ.newBall(), { x: M.park.H.x + c.x, y: M.park.H.y - 6, z: c.z, vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted' });
      const pr = BZ.predict(b, M.park, 8); carry = BZ.feet(BZ.carry(b, M.park).dist); if (pr.hr) feet = carry;
    }
    B.feet[side] += feet; B.carry = B.carry || [0, 0]; B.carry[side] += carry; B.swings[side]++; B.last = { side, feet };
    BZ.bus.emit('boomSwing', { side, feet, slugger: sl });
    B.side = 1 - side;
    if (B.swings[0] >= B.max && B.swings[1] >= B.max) {
      // the most home-run feet wins; a tie goes on one swing each, and after three more the longest total carry decides
      const tie = B.feet[0] === B.feet[1], decide = !tie || B.max >= 8;
      if (decide) { M.boomWinner = !tie ? (B.feet[0] > B.feet[1] ? 0 : 1) : (B.carry[0] >= B.carry[1] ? 0 : 1); M.endWhy = 'boom'; M.teams[M.boomWinner].runs++; this.final(M); }
      else B.max++;
    }
  },
  /* ---- the step ---- */
  step(M, dt) {
    if (!M) return;
    M.clock += dt; M.phaseT += dt;
    BZ.supers.turboTick(M, dt);
    if (BZ.hazard && BZ.hazard.update) BZ.hazard.update(M, dt);
    if (M.cinematic) { M.cinematic.t += dt; if (M.cinematic.update) M.cinematic.update(M, dt); if (M.cinematic && M.cinematic.done) { const cb = M.cinematic.then; M.cinematic = null; if (cb) cb(); } return; }
    const ph = M.phase, skip = M.fast ? 0 : 1, anyA = BZ.match.anyAdvance(M);
    if (ph === 'pregame') { if (M.phaseT > 2.4 * skip || (anyA && M.phaseT > .4)) { BZ.bus.emit('playBall', {}); this.phase(M, 'halfStart'); } return; }
    if (ph === 'halfStart') { if (M.phaseT > 1.6 * skip || (anyA && M.phaseT > .3)) this.newAtBat(M); return; }
    if (ph === 'atBat') {
      if (M.ab.sub === 'settle') { M.ab.t += dt; if (M.ab.t > (M.fast ? 0 : .9)) { if (M.ab.next === 'batter') this.newAtBat(M); else this.nextPitch(M); } return; }
      this.atBat(M, dt); return;
    }
    if (ph === 'inPlay') { this.inPlay(M, dt); return; }
    if (ph === 'playOver') {
      const wait = M.play && (M.play.deadReason === 'hr') ? 2.2 : 1.3;
      if (M.phaseT > wait * skip || (anyA && M.phaseT > .35)) {
        if (M.play && M.play.kind !== 'batted' && M.ab) { this.phase(M, 'atBat'); this.nextPitch(M); }   // a steal, a wild pitch or a pickoff: the same at-bat goes on
        else this.newAtBat(M);
      }
      return;
    }
    if (ph === 'halfEnd') {
      if (M.phaseT > 2.4 * skip || (anyA && M.phaseT > .4)) {
        const over = BZ.rules.gameOverAfterHalf(M);
        if (!over && !M.fast && BZ.crowd && BZ.crowd.startShow && !M.attract && !(M.half === 'top' && false)) { this.phase(M, 'between'); BZ.crowd.startShow(M); }
        else this.afterHalf(M);
      }
      return;
    }
    if (ph === 'between') { if ((BZ.crowd && BZ.crowd.showDone(M)) || M.phaseT > 6 || (anyA && M.phaseT > .4)) { if (BZ.crowd) BZ.crowd.endShow(M); this.afterHalf(M); } return; }
    if (ph === 'rhubarb') { if (BZ.rhubarb) BZ.rhubarb.update(M, dt); return; }
    if (ph === 'boom') { this.boom(M, dt); return; }
    if (ph === 'final') return;
  },
  /** any human pressed ✕ / Enter / click to hurry a card along */
  anyAdvance(M) { for (const T of M.teams) for (const h of T.humans) if (h.input.pressed('south') || h.input.pressed('confirm')) return true; return false; }
};
BZ.matchStep = (M, dt) => BZ.match.step(M, dt);

/** run a whole CPU-vs-CPU game headless (balance sims, tests); returns the match */
BZ.simGame = (o = {}) => {
  const M = BZ.newMatch(Object.assign({ fast: true, innings: 9 }, o));
  let guard = 0;
  while (M.phase !== 'final' && guard++ < 2400 * 120) { BZ.match.step(M, 1 / 120); }
  BZ.endMatch(M);
  return M;
};

/* ===== src/31-derby.js ===== */
/* =============================================================================
 * 31-derby: the BATZOOKA DERBY. 1-4 players take turns (hot seat) against the
 * Pitch-O-Matic 3000: each round is 2:00 or 10 outs. Any swing that isn't a home
 * run is an out, and so is a taken strike; taken balls are free. Score: home-run
 * feet plus targets (the blimp +500, the MEGA-TRON +300, drones +150, the
 * batter's-eye bullseye +200); every 5th pitch is a Golden Ball worth x2; three
 * homers in a row fill the meter for one Batzooka swing. Moonshot Leaders table.
 * The AI Hub round (40-hub) and the attract mode run the same Derby.
 * ========================================================================== */
BZ.Derby = class Derby {
  constructor(o = {}) {
    this.o = o; this.parkId = o.park || 'kernel';
    this.M = BZ.newMatch({ mode: 'derby', park: this.parkId, away: 'comets', home: this.parkId === 'megadome' ? 'mechanicals' : (BZ.get('parks', this.parkId).team || 'krakens'), innings: 1, seed: o.seed || 1, fast: false, attract: !!o.attract });
    const M = this.M; M.derby = this; M.phase = 'atBat';
    this.deal = o.deal || BZ.rng.deal;
    this.players = (o.players || [{ name: 'P1', input: BZ.game.input }]).map((p, i) => Object.assign({ score: 0, hrs: 0, outs: 0, longest: 0, streak: 0, meter: 0, time: o.limit || 120, pitches: 0, done: false, color: p.color || E.PLAYER_COLORS[i % 4], batter: p.batter || BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][i % 4]] }, p));
    this.cur = 0; this.state = 'intro'; this.t = 0; this.pitchN = 0; this.last = null; this.flash = null;
    this.length = o.length || 'time';
    this.blimp = { x: 0, y: 0, z: 300, a: 0 };
    this.ghosts = {};   // id -> { name, color, swingT, comets: [] }
    this.clock = o.clock || null;   // a function giving the round's time left (the hub's)
    M.batter = this.players[0].batter;
    this.setBatter();
  }
  get P() { return this.players[this.cur]; }
  setBatter() { const M = this.M; M.batter = this.P.batter; M.teams[0].meter = this.P.meter; M.teams[0].batzookaArmed = false; M.reticle.x = 0; M.reticle.z = 17; M.ab = { sub: 'select', t: 0 }; }
  bonus(fb, label) { const s = fb * (this.golden ? 2 : 1); this.P.score += s; this.flash = { text: '+' + s + ' ' + label, t: 0 }; BZ.sfx('coin'); }
  update(dt, I) {
    const M = this.M, S = M.ab, P = this.P; this.t += dt;
    if (this.flash) { this.flash.t += dt; if (this.flash.t > 1.6) this.flash = null; }
    this.blimp.a += dt * .05; const H = M.park.H; this.blimp.x = H.x + Math.sin(this.blimp.a) * 520; this.blimp.y = H.y - M.park.R(0) - 160 + Math.cos(this.blimp.a * 1.3) * 80;
    for (const g of Object.values(this.ghosts)) { g.swingT = Math.max(0, g.swingT - dt); for (const c of g.comets) { BZ.ballStep(c, M.park, dt); c.life -= dt; } g.comets = g.comets.filter(c => c.life > 0 && c.z >= 0); }
    if (this.state === 'over') return;
    if (this.state === 'intro') { if (this.t > (this.o.attract || this.o.hub ? .4 : 1.6) || (I && I.pressed('south') && this.t > .3)) { this.state = 'pitch'; this.newPitch(); } return; }
    // the clock runs while this player bats
    if (this.length === 'time' || this.o.hub) { P.time -= dt; if (this.clock) P.time = this.clock(); }
    if ((P.time <= 0 && (this.length === 'time' || this.o.hub)) || (P.outs >= 10 && (this.length === 'outs' && !this.o.hub || this.o.hub))) { if (this.state !== 'flight') return this.endTurn(); }
    if (this.state === 'pitch') {
      if (I) BZ.match.reticleInput(M, I, dt);
      S.t += dt;
      if (S.sub === 'select' && S.t > (this.o.attract ? .5 : .9)) { S.sub = 'windup'; S.t = 0; S.windT = .6; }
      else if (S.sub === 'windup') { if (S.t >= S.windT) this.release(); }
      else if (S.sub === 'flight') this.flight(dt, I);
      else if (S.sub === 'settle') { if (S.t > .7) this.newPitch(); }
      if (I && (S.sub === 'select' || S.sub === 'windup') && I.pressed('r1') && P.meter >= 100 && !M.teams[0].batzookaArmed) { M.teams[0].batzookaArmed = true; BZ.sfx('charge'); BZ.hud.stamp('BATZOOKA ARMED!', { prio: 2 }); }
    } else if (this.state === 'flight') this.ballFlight(dt);
  }
  newPitch() { const M = this.M; M.phase = 'atBat'; this.state = 'pitch'; M.ab = { sub: 'select', t: 0, swing: null }; M.ball.mode = 'none'; this.pitchN++; this.golden = this.pitchN % 5 === 0; BZ.bus.emit('derbyPitch', { n: this.pitchN, golden: this.golden }); }
  release() {
    const M = this.M, S = M.ab, R = this.deal;
    const inZ = R() < .8, tx = inZ ? (R() - .5) * 9 : (R() < .5 ? -1 : 1) * (8 + R() * 3), tz = inZ ? 11 + R() * 12 : (R() < .5 ? 6 : 28);
    S.type = 'machine'; S.pitch = new BZ.Pitch(M, { type: 'machine', pitcher: { vel: 5, brk: 4, look: { size: 1.25 } }, target: [tx, tz], q: .9, rand: R, noMiss: true });
    S.pitch.bx = (R() - .5) * 4; S.pitch.bz = (R() - .5) * 4; S.pitch.calcEnd();
    S.sub = 'flight'; S.t = 0; S.released = true; M.ball.mode = 'pitch';
    BZ.sfx('pitchWhoosh'); if (this.golden) BZ.sfx('ding');
    M.golden = this.golden;
    // the bot's plan
    if (!this.P.input) { const plan = BZ.ai.batterPlan(M, 0, S.pitch), c = S.pitch.cross(); plan.swing = BZ.inZone(c.x, c.z) || R() < .1; plan.type = 'power'; plan.e = BZ.Rn(this.P.botSd || .025); plan.rx = c.x + BZ.Rn(.5); plan.rz = c.z - 1.3 + BZ.Rn(.6); S.botPlan = plan; }   // a slugger aims just under the ball to lift it
    BZ.bus.emit('release', { type: 'machine', speed: BZ.mph(S.pitch.speed), q: .9, slot: 'south' });
  }
  flight(dt, I) {
    const M = this.M, S = M.ab, pt = S.pitch, P = this.P;
    pt.step(dt);
    if (I && !S.swing) { if (I.pressed('south')) S.swing = { type: 'contact', t0: pt.t }; if (I.pressed('west')) S.swing = { type: 'power', t0: pt.t }; if (S.swing && M.teams[0].batzookaArmed) S.swing.type = 'batzooka'; }
    if (!I && S.botPlan && S.botPlan.swing && !S.swing) { M.reticle.x += (S.botPlan.rx - M.reticle.x) * Math.min(1, dt * 14); M.reticle.z += (S.botPlan.rz - M.reticle.z) * Math.min(1, dt * 14); if (pt.t >= pt.T - BZ.SWINGS.power.delay + S.botPlan.e) S.swing = { type: M.teams[0].batzookaArmed || (P.meter >= 100 && (M.teams[0].batzookaArmed = true)) ? 'batzooka' : 'power', t0: pt.t }; }
    if (S.swing && !S.swing.done) {
      const sw = S.swing, Sd = BZ.SWINGS[sw.type], imp = sw.t0 + Sd.delay;
      if (pt.t >= imp) {
        sw.done = true; const c = pt.cross(), zooka = sw.type === 'batzooka';
        if (zooka) { M.teams[0].batzookaArmed = false; P.meter = 0; M.teams[0].meter = 0; }
        const res = BZ.contact({ type: sw.type, e: imp - pt.T, rx: (S.botPlan && !I) ? S.botPlan.rx : M.reticle.x, rz: (S.botPlan && !I) ? S.botPlan.rz : M.reticle.z }, c, pt.speed, P.batter, M.park, (P.batter.bt || 'R')[0] === 'L', I ? BZ.assistFor(M, 0) : { sweet: 1, window: 1 }, { evMul: 1.12 });   // the Derby's balls are livelier
        if (this.o.attract && res.kind !== 'contact') { /* the demo always connects */ Object.assign(res, BZ.contact({ type: 'power', e: 0, rx: c.x, rz: c.z - .5 }, c, pt.speed, P.batter, M.park, false)); }
        BZ.bus.emit('swing', { type: sw.type, kind: res.kind, grade: res.grade, ms: res.ms, feedback: res.feedback, feedback2: res.feedback2 });
        if (res.kind === 'contact' || res.kind === 'dribble') { this.hit(res, c, zooka); return; }
        this.out(res.kind === 'miss' ? 'WHIFF' : 'FOUL', zooka);
        S.sub = 'settle'; S.t = 0; S.contactDone = true;
        return;
      }
    }
    if (pt.t >= pt.T + .12 && !S.swing) {
      const c = pt.cross(), inZ = BZ.inZone(c.x, c.z);
      BZ.sfx('mitt');
      if (inZ) this.out('STRIKE'); else { BZ.hud.stamp('BALL', { scale: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); }
      S.sub = 'settle'; S.t = 0; S.cross = c; S.result = inZ ? 'strike' : 'ball';
    }
  }
  hit(res, c, zooka) {
    const M = this.M, b = M.ball, P = M.park;
    Object.assign(b, BZ.newBall(), { x: P.H.x + c.x, y: P.H.y - 6, z: c.z, vx: res.v[0], vy: res.v[1], vz: res.v[2], mode: 'batted', boost: zooka ? .5 : 0, spin: res.spin || 0, version: 1 });
    M.lastBatted = { zooka };
    BZ.sfx(zooka ? 'krakoom' : res.Q > .5 ? 'crack' : 'tink');
    if (BZ.cosmetic) { BZ.game.particles.sparks(b.x, b.y, b.z, 12, Math.atan2(b.vy, b.vx)); BZ.game.freeze(.05); }
    this.state = 'flight'; M.phase = 'inPlay'; M.play = { t: 0, pred: BZ.predict(b, P, 7), chaser: null, outs: [], runs: [] }; M.runners = [];
    this.flightT = 0;
    BZ.bus.emit('derbyHit', { v: res.v, zooka, p: [c.x, c.z] });
    this.sendGhost({ t: 'hit', n: this.pitchN, p: [b.x - P.H.x, b.y - P.H.y, b.z], v: [b.vx, b.vy, b.vz], spin: b.spin, bz: zooka ? 1 : 0 });
  }
  ballFlight(dt) {
    const M = this.M, b = M.ball, P = M.park; this.flightT += dt;
    const ev = BZ.ballStep(b, P, dt, { trail: true });
    if (BZ.hazard && BZ.hazard.onBall) BZ.hazard.onBall(M, b, dt, ev);
    // the blimp and the bullseye
    if (!b.bounced && Math.hypot(b.x - this.blimp.x, b.y - this.blimp.y, b.z - this.blimp.z) < 46 && !this.blimpHit) { this.blimpHit = true; this.bonus(500, 'BLIMP!'); BZ.hud.stamp('BLIMP SHOT!', { prio: 3 }); }
    if (ev.includes('hr') || ev.includes('pole')) {
      const dist = BZ.feet(BZ.carry(b, P).dist), th = BZ.theta(b.x - P.H.x, b.y - P.H.y), mul = this.golden ? 2 : 1, Pl = this.P;
      Pl.score += dist * mul; Pl.hrs++; Pl.streak++; Pl.longest = Math.max(Pl.longest, dist);
      if (Math.abs(th) < .05) this.bonus(200, 'BULLSEYE');
      BZ.hud.stamp(M.lastBatted.zooka ? 'BATZOOKA!!!' : 'HOME RUN!', { prio: 3, scale: 4, sub: dist + ' FEET' + (this.golden ? '  x2 GOLDEN!' : '') });
      BZ.bus.emit('homer', { dist, x: b.x, y: b.y, batzooka: M.lastBatted.zooka, derby: true, runs: 1, batter: Pl.batter });
      if (Pl.streak >= 3 && Pl.meter < 100 && !M.lastBatted.zooka) { Pl.meter = 100; Pl.streak = 0; M.teams[0].meter = 100; BZ.hud.toast('THREE IN A ROW: BATZOOKA READY!'); BZ.sfx('ding'); }
      this.last = { dist, hr: true };
      this.endFlight();
      return;
    }
    if (ev.includes('dead') || ev.includes('grd') || (b.bounced && (b.rolling || this.flightT > 2.5)) || this.flightT > 7) { this.out(b.fair === 'foul' || !BZ.isFairPoint(P, b.x, b.y) ? 'FOUL' : 'IN THE PARK'); this.endFlight(); }
  }
  endFlight() { const M = this.M; this.state = 'pitch'; M.ab.sub = 'settle'; M.ab.t = 0; M.ab.contactDone = true; M.phase = 'atBat'; M.ball.mode = 'dead'; this.blimpHit = false; }
  out(why, zooka) {
    const P = this.P; P.outs++; P.streak = 0; this.last = { out: why };
    BZ.hud.stamp(zooka ? 'FIZZLE!' : 'OUT ' + P.outs, { scale: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'], sub: why });
    BZ.bus.emit('derbyOut', { outs: P.outs, why });
    if (zooka) { BZ.sfx('fizzle'); }
  }
  endTurn() {
    const P = this.P; P.done = true;
    BZ.bus.emit('derbyTurnEnd', { player: this.cur, score: P.score });
    const next = this.players.findIndex(p => !p.done);
    if (next < 0) { this.state = 'over'; BZ.bus.emit('derbyEnd', { scores: this.players.map(p => p.score) }); return; }
    this.cur = next; this.setBatter(); this.state = 'intro'; this.t = 0; this.M.phase = 'atBat';
  }
  sendGhost(msg) { if (this.o.send) this.o.send(msg); }
  /** a ghost's batted ball, simulated locally with the same physics (cosmetic) */
  ghostHit(id, msg) {
    const g = this.ghosts[id]; if (!g) return; const P = this.M.park;
    g.swingT = .4;
    g.comets.push(Object.assign(BZ.newBall(), { x: P.H.x + msg.p[0], y: P.H.y + msg.p[1], z: msg.p[2], vx: msg.v[0], vy: msg.v[1], vz: msg.v[2], mode: 'batted', spin: msg.spin || 0, boost: msg.bz ? .5 : 0, life: 6, color: g.color }));
  }
  /* ---- drawing ---- */
  draw(r) {
    const M = this.M, fr = BZ.cams.frame(M);
    BZ.cams.animate(M, fr, 1 / 60);
    if (this.state === 'flight' || (M.ab && M.ab.sub === 'settle' && M.ball.mode === 'dead' && this.last && this.last.hr && M.ab.t < .4)) { BZ.cams.mode = 'field'; BZ.cams.frameField(M, 1 / 60); BZ.cams.drawField(r, M, fr); }
    else { BZ.cams.mode = 'plate'; BZ.cams.drawPlate(r, M, fr); this.drawGhostsM7(r); }
    if (this.state === 'flight') this.drawComets(r);
    r.overlay(g => this.hud(g, r));
  }
  drawGhostsM7(r) {
    // ghosts in the on-deck circles: translucent holograms that swing when their players swing
    const M = this.M, H = M.park.H, m7 = BZ.mode7(M.parkId);
    let k = 0;
    for (const [id, gh] of Object.entries(this.ghosts)) {
      const pos = [[-78, -21], [78, -21], [-120, -40]][k++ % 3], x = H.x + pos[0], y = H.y + pos[1];
      const q = m7.project(x, y, 0), q2 = m7.project(x, y, 34); if (!q || !q2) continue;
      r.overlay(g => px.blend(g, .45, 'add', () => { const hh = q[1] - q2[1]; px.rect(g, q[0] - hh * .12, q2[1], hh * .24, hh, gh.color); px.disc(g, q[0], q2[1], hh * .12, gh.color); if (gh.swingT > 0) px.line(g, q[0], q2[1] + hh * .3, q[0] + hh * .5 * Math.cos(gh.swingT * 12), q2[1] + hh * .3 - hh * .2, '#ffffff'); E.font.text(g, gh.name, q[0], q2[1] - 10, '#ffffff', { align: 'center' }); }));
      for (const c of gh.comets) { const p = m7.project(c.x, c.y, c.z); if (p) r.overlay(g => px.blend(g, .7, 'add', () => { px.disc(g, p[0], p[1], 3, gh.color); px.disc(g, p[0], p[1] + 4, 2, '#ffffff'); })); }
    }
  }
  drawComets(r) { for (const gh of Object.values(this.ghosts)) for (const c of gh.comets) r.queue(c.x, c.y, BZ.displayZ(c.z), g => { const q = r.w(c.x, c.y, BZ.displayZ(c.z)); px.blend(g, .8, 'add', () => { px.disc(g, q[0], q[1], 3, gh.color); px.line(g, q[0], q[1], q[0] - c.vx * .02, q[1] + c.vz * .02, gh.color, 2); }); }, { emissive: true }); }
  hud(g, r) {
    const P = this.P, y = 10, x = 12;
    E.ui.box(g, x, y, 150, 46, { bg: ['#1a2040', '#0a0e1c'], border: P.color, alpha: .92 });
    E.font.text(g, (this.o.title || 'BATZOOKA DERBY') + (this.players.length > 1 ? '  ' + P.name : ''), x + 6, y + 4, '#ffd040', { shadow: '#000' });
    E.font.text(g, BZ.fmt(P.score) + ' FT', x + 6, y + 15, '#ffffff', { scale: 2, shadow: '#000' });
    const tl = Math.max(0, P.time), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60);
    E.font.text(g, (this.length === 'time' || this.o.hub ? mm + ':' + String(ss).padStart(2, '0') + '  ' : '') + 'OUTS ' + P.outs + '/10  HR ' + P.hrs, x + 6, y + 34, '#a8b8e8');
    // the meter (three in a row) and the Golden Ball
    E.ui.bar(g, x + 100, y + 6, 44, 4, P.meter / 100, P.meter >= 100 ? '#ffd040' : '#ff7a1a');
    for (let i = 0; i < 3; i++) px.disc(g, x + 104 + i * 8, y + 17, 2.5, i < P.streak ? '#ffd040' : '#3a3a5a');
    if (this.golden && this.state === 'pitch') E.font.title(g, 'GOLDEN BALL x2', r.W / 2, 50, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffd040', '#c89010'] });
    if (this.flash) E.font.text(g, this.flash.text, r.W / 2, 70, '#ffd040', { align: 'center', scale: 2, shadow: '#000' });
    if (this.state === 'intro') { E.font.title(g, P.name + ' UP!', r.W / 2, r.H * .3, { scale: 3, align: 'center', colors: ['#ffffff', P.color] }); E.font.text(g, P.batter.name.toUpperCase(), r.W / 2, r.H * .3 + 30, '#ffffff', { align: 'center', shadow: '#000' }); }
    // the standings of the others
    const others = this.players.filter((p, i) => i !== this.cur);
    others.forEach((p, i) => E.font.text(g, p.name + ' ' + BZ.fmt(p.score), r.W - 12, 64 + i * 11, p.color, { align: 'right', shadow: '#000' }));
    if (P.input && this.state !== 'over') BZ.drawPrompts(g, P.input, [['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA', P.meter >= 100, P.streak + '/3']], r.W / 2, r.H - 26, { align: 'center' });
  }
};

/* ---- the Derby setup: 1-4 players (hot seat), the park, the length ---- */
BZ.scenes.derbySetup = {
  enter() {
    const g = BZ.game; this.t = 0; this.n = 1; BZ.idle = 0;
    const unlocked = BZ.tour.unlocked();
    this.parks = BZ.PARK_ORDER.filter(id => !BZ.get('parks', id).locked || unlocked.all); this.park = 0;
    this.menu = new BZ.CardMenu([{ label: 'PLAYERS', id: 'n' }, { label: 'PARK', id: 'park' }, { label: 'LENGTH', id: 'len' }, { label: 'PLAY BALL!', id: 'go' }, { label: 'LEADERS', id: 'leaders' }], { leftRight: true });
    this.len = g.settings.derbyLength || 'time';
    BZ.music('derby');
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.leaders) { if (BZ.anyInput(g) && this.t > .3) { this.leaders = false; g.input.consumeAll(); } return; }
    const it = this.menu.items;
    it[0].value = '◂ ' + this.n + ' ▸'; it[1].value = '◂ ' + BZ.get('parks', this.parks[this.park]).name.toUpperCase() + ' ▸'; it[2].value = '◂ ' + (this.len === 'time' ? '2:00' : '10 OUTS') + ' ▸';
    const res = this.menu.update(dt);
    if (res && res.lr) { const id = it[res.i].id; if (id === 'n') this.n = clamp(this.n + res.lr, 1, 4); if (id === 'park') this.park = (this.park + res.lr + this.parks.length) % this.parks.length; if (id === 'len') { this.len = this.len === 'time' ? 'outs' : 'time'; g.settings.set('derbyLength', this.len); } BZ.sfx('select'); }
    if (res && res.pick !== undefined) {
      const id = it[res.pick].id;
      if (id === 'go') g.go('derby', { players: this.n, park: this.parks[this.park], length: this.len });
      else if (id === 'leaders') { this.leaders = true; this.t = 0; }
      else if (id === 'n') this.n = this.n % 4 + 1; else if (id === 'park') this.park = (this.park + 1) % this.parks.length; else if (id === 'len') this.len = this.len === 'time' ? 'outs' : 'time';
    }
    if (res && res.cancel) g.go('title');
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a0a24', '#2a1a48', '#4a1a2a']);
    r.overlay(g => {
      E.font.title(g, 'BATZOOKA DERBY', r.W / 2, 10, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      E.font.text(g, 'Hit the most home-run feet. Every 5th pitch is a Golden Ball.', r.W / 2, 42, '#a8b8e8', { align: 'center' });
      if (this.leaders) { BZ.drawLeaders(g, r, 60); return; }
      this.menu.draw(g, r, r.W / 2, 62, { w: 260, h: 22, scale: 1 });
      BZ.legend(g, r, [['left', 'CHANGE'], ['south', 'SELECT'], ['east', 'BACK']]);
    });
  }
};
BZ.drawLeaders = (g, r, y) => {
  const T = BZ.arcade.table('derby'), w = 200, x = Math.round(r.W / 2 - w / 2);
  E.ui.box(g, x, y, w, 14 + Math.max(1, T.length) * 12, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
  E.font.text(g, 'MOONSHOT LEADERS', r.W / 2, y + 3, '#ffd040', { align: 'center' });
  if (!T.length) E.font.text(g, 'NO MOONSHOTS YET', r.W / 2, y + 16, '#a8b8e8', { align: 'center' });
  T.slice(0, 10).forEach((e, i) => { E.font.text(g, (i + 1) + '. ' + e.name, x + 10, y + 16 + i * 12, '#ffffff'); E.font.text(g, BZ.fmt(e.score) + ' FT', x + w - 10, y + 16 + i * 12, '#ffd040', { align: 'right' }); });
};
BZ.scenes.derby = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter(data) {
    const g = BZ.game; this.data = data || { players: 1 }; BZ.hud.clear(); BZ.clearLater();
    const n = this.data.players || 1, players = [];
    for (let i = 0; i < n; i++) players.push({ name: 'P' + (i + 1), input: this.data.bots ? null : (g.players[i] || g.input), botSd: .02 });
    this.D = new BZ.Derby({ park: this.data.park || 'kernel', players, length: this.data.length || g.settings.derbyLength || 'time', seed: this.data.seed || (Date.now() & 0xffff), limit: 120 });
    BZ.M = this.D.M; BZ.talk.reset(); BZ.talk.install(this.D.M); BZ.crowd.install(this.D.M);
    const pd = this.D.M.park.def; g.lights.enabled = !!pd.night; g.lights.ambient = pd.ambient; g.weather = null;
    BZ.music('derby'); BZ.wheelOwned = true; this.over = 0; this.entering = false;
    if (this.data.attract) { BZ.hud.stamp('PLAY ONLINE IN AI HUB', { prio: 2, scale: 2, dur: 3 }); this.D.ghosts = { a: { name: 'ACE', color: BZ.SEAT_COLORS[1], swingT: 0, comets: [], score: 0 }, b: { name: 'ZOOM', color: BZ.SEAT_COLORS[2], swingT: 0, comets: [], score: 0 }, c: { name: 'RIO', color: BZ.SEAT_COLORS[3], swingT: 0, comets: [], score: 0 } }; this.ghostT = 0; }
    Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null });
    g.setView(BZ.VIEWS.broadcast);
  },
  exit() { BZ.endMatch(this.D && this.D.M); BZ.wheelOwned = false; },
  update(dt) {
    const g = BZ.game, D = this.D; BZ.inputTick(g, dt);
    if (BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    if (D.state === 'over') {
      this.over += dt;
      if (this.entering) { BZ.arcade.update(dt); return; }
      if (this.over > 1.5 && !this.data.bots) {
        // initials for the Moonshot Leaders, best score first
        const best = D.players.slice().sort((a, b) => b.score - a.score)[0];
        if (BZ.arcade.qualifies(best.score, 'derby') && !this.asked) { this.asked = true; this.entering = true; BZ.arcade.enter(best.score, 'derby', () => { this.entering = false; g.go('derbySetup'); }); return; }
        if (BZ.anyInput(g) || this.over > 6) g.go('derbySetup');
      }
      if (this.data.bots && this.over > 2) { if (this.data.onDone) this.data.onDone(D); else g.go('derbySetup'); }
      return;
    }
    if (this.data.attract && BZ.attract.check(g)) return;
    D.update(dt, D.P.input);
    BZ.hud.step(dt); BZ.talk.step(dt); BZ.crowd.step(D.M, dt); BZ.tickLater(dt);
    if (this.data.attract) { BZ.attract.step && (BZ.attract.segT += dt); this.ghostT += dt; if (this.ghostT > 1.6) { this.ghostT = 0; const ids = Object.keys(D.ghosts), id = ids[Math.floor(BZ.F() * ids.length)], R = BZ.F; D.ghostHit(id, { p: [0, -6, 18], v: [(R() - .5) * 500, -760 - R() * 200, 520 + R() * 120], spin: 0, bz: R() < .3 }); D.ghosts[id].score += 400 + Math.floor(R() * 60); } if (BZ.attract.segT > 16) BZ.attract.next(); }
  },
  draw(r) {
    const D = this.D;
    D.draw(r);
    BZ.hud.draw(r, D.M, null);
    r.overlay(g => {
      if (D.state === 'over') {
        E.ui.box(g, r.W / 2 - 110, r.H * .22, 220, 30 + D.players.length * 14, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
        E.font.title(g, 'DERBY OVER', r.W / 2, r.H * .22 + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
        D.players.slice().sort((a, b) => b.score - a.score).forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + BZ.fmt(p.score) + ' FT   ' + p.hrs + ' HR   LONG ' + p.longest, r.W / 2, r.H * .22 + 28 + i * 14, p.color, { align: 'center', shadow: '#000' }));
        if (this.entering) BZ.arcade.draw(r);
      }
      if (this.data.attract) BZ.attract.overlay(g, r);
    });
  }
};

/* ===== src/32-training.js ===== */
/* =============================================================================
 * 32-training: SPRING TRAINING with Grandpa Ike. Eight lessons, each a drill in
 * the real match engine with a goal on screen, prompts in the player's own
 * glyphs, slow motion on the first pitches of lessons 1-2, and LESSON PASSED!
 * Then the House Rules card: what you can't do. Each lesson can be replayed.
 * A lesson is data: its intro, its goal counters and a few hooks.
 * ========================================================================== */
const IKE = 'ike';
BZ.LESSONS = [
  { id: 'bp', title: 'BATTING PRACTICE', intro: ['Easy heaters, kid. Move the ring onto the ball and swing as it gets to the plate.', 'Early pulls it, late pushes it. Three fair balls and we\'ll call it a lesson.'],
    goals: [['fair', 3, 'FAIR BALLS']], side: 'bat', slow: 2,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 6, 13 + BZ.R() * 7], q: .1 }), speed: .72,
    on: { playEnd: (L, d) => { if (d.kind === 'batted' && d.reason !== 'foul') L.add('fair'); } } },
  { id: 'power', title: 'POWER AND BUNTS', intro: ['Meatballs! The power swing has a small spot and a big bang. Put one over the fence.', 'Then square around: hold to bunt it fair. Let go to pull the bat back.'],
    goals: [['hr', 1, 'POWER HOME RUN'], ['bunt', 1, 'FAIR BUNT']], side: 'bat', slow: 2, ev: 1.18,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 3, 15 + BZ.R() * 4], q: 0 }), speed: .75,
    on: { homer: L => L.add('hr'), playEnd: (L, d, M) => { if (d.kind === 'batted' && d.reason !== 'foul' && M.lastBatted && M.lastBatted.bunt) L.add('bunt'); } } },
  { id: 'zone', title: 'READING THE ZONE', intro: ['A smart hitter waits for a good one. The grid is the zone; the ball has to cross it.', 'Take two balls, then hit two strikes. Curves love to sneak off the edge.'],
    goals: [['balls', 2, 'BALLS TAKEN'], ['strikes', 2, 'STRIKES HIT']], side: 'bat',
    pitch: () => { const ball = BZ.R() < .5; return { type: BZ.R() < .4 ? 'curve' : 'heater', target: ball ? [(BZ.R() < .5 ? -1 : 1) * (10 + BZ.R() * 2), 10 + BZ.R() * 12] : [(BZ.R() - .5) * 7, 12 + BZ.R() * 9], q: .5 }; }, speed: .85,
    on: { call: (L, d) => { if (d.kind === 'ball') L.add('balls'); }, contact: (L, d, M) => { const c = M.ab && M.ab.pitch && M.ab.pitch.cross(); if (c && BZ.inZone(c.x, c.z)) L.add('strikes'); } } },
  { id: 'mound', title: 'ON THE MOUND', intro: ['Your turn on the bump. Pick a pitch with its button, aim the target, then press again as the ring closes.', 'Bend it early with the stick. Three strikes with three different pitches, one PERFECT release, one bend.'],
    goals: [['types', 3, 'STRIKES, 3 PITCH TYPES'], ['perfect', 1, 'PERFECT RELEASE'], ['after', 1, 'AFTERTOUCH']], side: 'pitch',
    on: { call: (L, d, M) => { if (d.kind === 'strike' && M.ab) { L.types = L.types || new Set(); L.types.add(M.ab.type); L.set('types', L.types.size); } }, perfectRelease: L => L.add('perfect'), aftertouch: L => L.add('after') } },
  { id: 'field', title: 'LEATHER AND LASERS', intro: ['I\'ll hit you some flies and grounders. The ring on the grass is where a fly comes down.', 'Catch two flies, throw a grounder to first in time, and turn a double play.'],
    goals: [['fly', 2, 'FLY CATCHES'], ['first', 1, 'OUT AT FIRST'], ['dp', 1, 'DOUBLE PLAY']], side: 'field', fungo: true,
    on: { catch: (L, d) => { if (d.fly) L.add('fly'); }, runnerOut: (L, d) => { if (d.how === 'force' && d.base === 1) L.add('first'); }, doublePlay: L => L.add('dp') } },
  { id: 'wheels', title: 'WHEELS', intro: ['Baserunning! I\'ll do the hitting. R1 sends everybody, L1 brings them back, L2 is turbo.', 'Advance on a hit, tag up on a fly, steal second, use turbo, and slide in safe.'],
    goals: [['adv', 1, 'ADVANCE ON A HIT'], ['tag', 1, 'TAG UP'], ['steal', 1, 'STEAL SECOND'], ['turbo', 1, 'USE TURBO'], ['slide', 1, 'SLIDE IN SAFE']], side: 'run', speed: .8,
    pitch: () => ({ type: 'heater', target: [0, 16], q: .2 }),
    on: { hit: L => L.add('adv'), tagUp: L => L.add('tag'), steal: (L, d) => { if (d.ok) L.add('steal'); }, slide: L => L.add('slide') } },
  { id: 'zooka', title: 'BATZOOKA!', intro: ['The crowd\'s roaring, so your grandma\'s bat is hot. R1 arms it; then swing.', 'Hit a Batzooka home run, then on defense throw your super pitch and a Laser Arm throw.'],
    goals: [['zhr', 1, 'BATZOOKA HOME RUN'], ['sp', 1, 'SUPER PITCH'], ['laser', 1, 'LASER ARM THROW']], side: 'both', ev: 1.1,
    pitch: () => ({ type: 'heater', target: [(BZ.R() - .5) * 4, 15 + BZ.R() * 4], q: 0 }), speed: .8,
    on: { homer: (L, d) => { if (d.batzooka) L.add('zhr'); }, super: (L, d, M) => { if (d.kind === 'pitch' && M.teams[d.side] && M.teams[d.side].humans.length) L.add('sp'); if (d.kind === 'laser') L.add('laser'); } } },
  { id: 'rhubarb', title: 'RHUBARB 101', intro: ['Sometimes the benches empty. It\'s all slapstick: nobody gets hurt.', '✕ punches, □ shoves, △ grabs and tosses, ○ dodges. Land five punches, a shove and a toss on the grounds crew.'],
    goals: [['punch', 5, 'PUNCHES'], ['shove', 1, 'SHOVE'], ['toss', 1, 'TOSS']], side: 'rhubarb' }
];
BZ.training = {
  /** start a lesson in the match scene */
  start(i) {
    const L = BZ.LESSONS[i], g = BZ.game, I = g.input;
    const humans = L.side === 'pitch' || L.side === 'field' ? { 0: [], 1: [I] } : { 0: [I], 1: [] };
    const data = { mode: 'training', away: L.side === 'pitch' || L.side === 'field' ? 'crew' : 'comets', home: L.side === 'pitch' || L.side === 'field' ? 'comets' : 'crew', park: 'kernel', innings: 99, difficulty: 'rookie', cpuLevel: 'rookie', humans, seed: 11 + i, mercy: false, lesson: i,
      onInstall: M => this.install(M, i), onStep: (M, dt) => this.step(M, dt), onFinal: () => BZ.game.go('lessonList') };
    if (L.side === 'run') data.bots = { 0: { level: 'allstar', perfect: false } };
    BZ.startMatch(data);
  },
  install(M, i) {
    const L = BZ.LESSONS[i], st = { i, def: L, prog: {}, passed: false, t: 0, pitches: 0, intro: true };
    st.add = k => { st.prog[k] = (st.prog[k] || 0) + 1; this.check(M); };
    st.set = (k, v) => { st.prog[k] = v; this.check(M); };
    M.lesson = st;
    if (L.ev) M.evMul = L.ev;
    if (L.speed) M.lessonSpeed = L.speed;
    M.cheats.noRhubarb = true;
    for (const [ev, fn] of Object.entries(L.on || {})) M.unsub.push(BZ.bus.on(ev, d => { if (M.lesson && !M.lesson.passed) fn(M.lesson, d, M); }));
    // Grandpa Ike pitches batting practice (a pitcher of the Comets' for the drill)
    if (L.side === 'bat' || L.side === 'run' || L.side === 'both') { const ike = BZ.get('players', 'comets-grandpa-ike-kowalski'); M.teams[1].pitcher = ike; BZ.match.setupDefense(M); }
    if (L.id === 'zooka') { M.teams[0].meter = 100; }
    if (L.id === 'rhubarb') {
      const crew = BZ.get('teams', 'crew').lineup.slice(0, 5);
      M.phase = 'training';
      BZ.wait(.1, () => BZ.rhubarb.start(M, 'training', { crew, human: BZ.game.input, dur: 999 }));
    }
    M.unsub.push(BZ.bus.on('rhubarbEnd', () => {}));
    const intro = L.intro.map(t => ['say', IKE, t]);
    BZ.talk.cut(intro.concat([['call', () => { st.intro = false; }]]), null);
    BZ.music('training');
  },
  check(M) {
    const st = M.lesson; if (st.passed) return;
    if (st.def.goals.every(([k, n]) => (st.prog[k] || 0) >= n)) {
      st.passed = true; st.passT = 0;
      BZ.hud.stamp('LESSON PASSED!', { prio: 3, scale: 4, dur: 3, colors: ['#ffffff', '#8affb0', '#1a8a4a'] });
      BZ.sting('victory');
      BZ.bus.emit('lesson', { id: st.def.id, passed: true });
      if (BZ.tour) BZ.tour.lessonDone(st.def.id);
    }
  },
  step(M, dt) {
    const st = M.lesson; if (!st) return;
    st.t += dt;
    const L = st.def;
    if (st.passed) { st.passT += dt; if (st.passT > 3 || (st.passT > 1 && BZ.match.anyAdvance(M))) { if (M.rhubarb) M.rhubarb = null; BZ.game.go('lessonList', { done: st.def.id }); } return; }
    // practice never ends: outs and runners are reset between plays
    if (M.phase === 'playOver' || M.phase === 'halfEnd') { M.outs = Math.min(M.outs, 2); if (M.phase === 'halfEnd') { M.phase = 'playOver'; M.outs = 0; } }
    if (M.outs >= 3) M.outs = 0;
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'walkup') { M.outs = 0; if (L.side === 'bat' || L.side === 'pitch') M.bases = [null, null, null]; }
    // slow motion on the first pitches of lessons 1-2
    if (L.slow && !BZ.cams.moon) BZ.game.timeScale = st.pitches < L.slow && M.phase === 'atBat' ? .6 : TUNE.gameSpeed;
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t < dt * 1.5) st.pitches++;
    if (L.pitch && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.forcePitch) M.forcePitch = L.pitch();
    if (L.id === 'zooka') {
      // bat first: the meter is always full; once the homer is in, the Comets take the field
      if (!st.prog.zhr) { M.teams[0].meter = 100; }
      else if (!st.swapped && (M.phase === 'atBat' || M.phase === 'playOver')) { st.swapped = true; const I = BZ.game.input; M.teams[0].humans = []; M.teams[1].humans = [{ input: I, role: 'captain' }]; M.teams[1].id = 'comets'; M.half = 'top'; M.outs = 0; M.bases = [null, null, null]; const away = M.teams[0]; M.teams[0] = M.teams[1]; M.teams[1] = away; M.teams[0].side = 0; M.teams[1].side = 1; BZ.match.setupDefense(M); BZ.match.newAtBat(M); BZ.hud.toast('NOW ON DEFENSE: THROW YOUR SUPER PITCH'); }
      if (st.swapped) { const D = BZ.defense(M); D.meter = Math.max(D.meter, 100); M.forcePitch = null; if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select') M.forceContact = 'perfect'; M.cheats.perfectCPU = true; }
    }
    if (L.id === 'wheels') this.wheels(M, st);
    if (L.fungo && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t > .6) this.fungo(M, st);
    if (L.id === 'rhubarb' && M.rhubarb) { const R = M.rhubarb; st.prog.punch = R.punches; st.prog.shove = R.shoves; st.prog.toss = R.tosses; this.check(M); if (st.passed) { R.dur = R.t + .1; } }
    if (L.id === 'rhubarb' && !M.rhubarb && !st.passed && st.t > 1) BZ.rhubarb.start(M, 'training', { crew: BZ.get('teams', 'crew').lineup.slice(0, 5), human: BZ.game.input, dur: 999 });
    // turbo use counts for Wheels
    if (L.id === 'wheels' && M.phase === 'inPlay' && M.runners.some(r => r.turbo && r.turboHeld)) st.add('turbo');
  },
  /** Ike's fungo bat: a fly, a grounder, or a double-play ball with a runner on first */
  fungo(M, st) {
    const P = M.park, H = P.H, k = st.fungoN = (st.fungoN || 0) + 1;
    const needDP = (st.prog.fly || 0) >= 2 && (st.prog.first || 0) >= 1, fly = !needDP && (st.prog.fly || 0) < 2 && k % 2 === 1;
    if (needDP) M.bases = [BZ.get('teams', 'crew').lineup[2], null, null]; else M.bases = [null, null, null];
    const th = fly ? (BZ.R() - .5) * 50 : needDP ? -18 + BZ.R() * 8 : (BZ.R() - .5) * 40, ph = fly ? 38 : -8, ev = fly ? 560 : 330;
    const t = th * Math.PI / 180, p = ph * Math.PI / 180;
    BZ.sfx('crack');
    BZ.match.contact(M, { v: [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)], Q: .5, EV: ev, theta: th, phi: ph, spin: 0, grade: 'OK' }, { x: 0, z: 18 });
    void H;
  },
  wheels(M, st) {
    // set up the situation for the next skill: a runner on first to steal, on third to tag, or a hit to advance on
    if (M.phase !== 'atBat' || !M.ab || M.ab.sub !== 'walkup') return;
    const R = BZ.get('teams', 'comets').lineup[1], p = st.prog;
    if (!p.steal) { M.bases = [R, null, null]; M.scriptHit = null; BZ.bot.sides[0] && (BZ.bot.sides[0].take = true); BZ.hud.toast('STEAL SECOND: HOLD L1 AND PRESS △ (OR Q + 2)'); }
    else if (!p.tag) { M.bases = [null, null, R]; BZ.bot.sides[0].take = false; M.scriptHit = res => { const th = 0, ph = 36, ev = 640, t = th, pp = ph * Math.PI / 180; res.v = [0, -ev * Math.cos(pp), ev * Math.sin(pp)]; res.kind = 'contact'; void t; return res; }; BZ.hud.toast('TAG UP: WAIT FOR THE CATCH, THEN R1'); }
    else { M.bases = [R, null, null]; BZ.bot.sides[0].take = false; M.scriptHit = res => { const ph = 8 * Math.PI / 180, th = 22 * Math.PI / 180, ev = 600; res.v = [ev * Math.cos(ph) * Math.sin(th), -ev * Math.cos(ph) * Math.cos(th), ev * Math.sin(ph)]; res.kind = 'contact'; return res; }; BZ.hud.toast('A HIT: R1 TO RUN, L2 FOR TURBO, ✕ TO DIVE IN'); }
  },
  hud(g, r, M) {
    const st = M.lesson; if (!st || BZ.talk.cutscene) return;
    const L = st.def, w = 150, x = r.W - w - 12, y = 58;
    E.ui.box(g, x, y, w, 16 + L.goals.length * 12, { bg: ['#1a3a1a', '#0a1a0a'], border: '#8aff8a', alpha: .9 });
    E.font.text(g, 'LESSON ' + (st.i + 1) + ': ' + L.title, x + 5, y + 4, '#ffd040');
    L.goals.forEach(([k, n, label], i) => { const v = Math.min(n, st.prog[k] || 0), done = v >= n; E.font.text(g, (done ? '✓ ' : '') + v + ' / ' + n + ' ' + label, x + 5, y + 16 + i * 12, done ? '#8aff8a' : '#ffffff'); });
  }
};
BZ.scenes.lessonList = {
  enter(data) {
    this.t = 0; BZ.idle = 0;
    const done = BZ.tour.trainingDone();
    this.menu = new BZ.CardMenu(BZ.LESSONS.map((L, i) => ({ label: (i + 1) + '. ' + L.title, sub: done.includes(L.id) ? 'PASSED ✓' : 'NEW', id: i })).concat([{ label: 'HOUSE RULES', sub: 'WHAT YOU CAN\'T DO', id: 'rules' }]), { cols: 3, start: data && data.done ? Math.min(8, BZ.LESSONS.findIndex(L => L.id === data.done) + 1) : 0 });
    BZ.music('training'); this.rules = false;
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.rules) { if ((g.input.pressed('cancel') || g.input.pressed('east') || g.input.pressed('south') || g.input.pressed('confirm')) && this.t > .3) { this.rules = false; g.input.consumeAll(); } return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) { const id = this.menu.items[res.pick].id; if (id === 'rules') { this.rules = true; this.t = 0; } else BZ.training.start(id); }
    if (res && res.cancel) g.go(BZ.tour.returnTo || 'title');
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1a10', '#1a3a20', '#3a3a1a']);
    r.overlay(g => {
      E.font.title(g, 'SPRING TRAINING', r.W / 2, 8, { scale: 3, align: 'center', colors: ['#ffffff', '#b0ffb0', '#3a9a3a'], depth: 2 });
      const ike = BZ.castRig('ike'); if (ike && BZ.cosmetic) ike.drawPortrait(g, 12, 6, 36, { zoom: 2.6 });
      if (this.rules) {
        const w = Math.min(r.W - 30, 320), x = Math.round(r.W / 2 - w / 2);
        E.ui.box(g, x, 46, w, 30 + BZ.HOUSE_RULES.length * 13, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' });
        E.font.text(g, 'HOUSE RULES: WHAT YOU CAN\'T DO', r.W / 2, 52, '#ffd040', { align: 'center' });
        BZ.HOUSE_RULES.forEach((t, i) => E.font.text(g, '• ' + t, x + 12, 68 + i * 13, '#ffffff'));
        BZ.legend(g, r, [['south', 'GOT IT']]);
        return;
      }
      this.menu.draw(g, r, r.W / 2, 50, { w: Math.min(140, (r.W - 30) / 3), h: 40, scale: 1, gap: 6 });
      BZ.legend(g, r, [['south', 'START'], ['east', 'BACK']]);
    });
  }
};

/* ===== src/33-tour.js ===== */
/* =============================================================================
 * 33-tour: the TOUR. Save data (three slots and an autosave), Fan Bucks, the
 * clubhouse upgrades, unlocks, the Tour Map (a county map, a bus on a dotted road
 * between six pins: Play next stop, Clubhouse, Save, Title), the story scenes,
 * the games, rewards, the RAIN CHECK, the MegaDome boss, the ending and credits.
 * ========================================================================== */
BZ.tour = {
  data: null, returnTo: null,
  blank() { return { v: 1, tour: { stop: 0, beaten: [], wins: 0, losses: 0, started: false, done: false }, fb: 0, upgrades: { lumber: 0, gloves: 0, cleats: 0, arms: 0, hype: 0 }, rewards: [], unlocked: { all: false }, training: { done: [] }, derbyBest: 0 }; },
  /** what lives across slots: training and unlocks (E.store), merged with the loaded Tour */
  meta() { return E.store.get('bz:meta', null) || this._meta || { training: [], all: false }; },
  setMeta(m) { this._meta = m; E.store.set('bz:meta', m); },   // (kept in memory too: blocked storage plays on for the visit)
  d() { return this.data || (this.data = this.blank()); },
  unlocked() { const m = this.meta(); return { all: !!(m.all || m.megadome || this.d().unlocked.all) }; },
  unlockAll() { const m = this.meta(); m.all = true; this.setMeta(m); this.d().unlocked.all = true; },
  addFB(n) { this.d().fb += Math.round(n); },
  lessonDone(id) { const m = this.meta(); if (!m.training.includes(id)) m.training.push(id); this.setMeta(m); const d = this.d(); if (!d.training.done.includes(id)) d.training.done.push(id); try { BZ.game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  trainingDone() { return [...new Set(this.meta().training.concat(this.d().training.done))]; },
  newTour() { this.data = this.blank(); this.data.tour.started = true; this.data.unlocked.all = this.meta().all; this.data.training.done = this.meta().training.slice(); },
  install(game) {
    const S = game.saves;
    S.write = () => { const d = this.d(), st = BZ.STOPS[Math.min(d.tour.stop + 1, 5)]; return { data: JSON.parse(JSON.stringify(d)), place: d.tour.done ? 'TOUR COMPLETE' : 'NEXT: ' + st.title, level: d.tour.stop }; };
    S.read = sv => { this.data = Object.assign(this.blank(), sv.data); };
  },
  continueLatest() { const S = BZ.game.saves, sv = S.latest(); if (sv && S.load(sv.slot)) BZ.game.go('tourMap'); else BZ.game.go('tourMenu'); },
  save(slot) { try { return BZ.game.saves.save(slot); } catch (e) { return false; } },
  /** play the next stop: its pregame scene, then the game */
  playNext() {
    const d = this.d(), i = d.tour.stop + 1, st = BZ.STOPS[i]; if (!st) return;
    BZ.game.go('story', { steps: BZ.STORY[st.id].pre, park: st.park, then: () => this.startGame(i) });
  },
  startGame(i) {
    const g = BZ.game, d = this.d(), st = BZ.STOPS[i], quick = g.settings.tourLength === 'quick';
    const data = { mode: 'tour', tourStop: i, away: 'comets', home: st.rival, park: st.park, innings: quick ? 1 : 3, difficulty: g.settings.difficulty || 'pro', cpuLevel: g.settings.difficulty || 'pro', humans: { 0: [g.input], 1: [] }, seed: 1000 + i * 17 + d.tour.losses, upgrades: d.upgrades, upgradeTeam: 0, boss: st.boss ? { id: st.rival } : null, mercy: g.settings.mercy !== false,
      script: st.scriptRhubarb && g.settings.rhubarbs !== false ? { rhubarbOnHbp: true, forceHbpInning: quick ? 1 : 2 } : null,
      onStep: (M) => this.gameStep(M), next: M => this.after(M, i) };
    if (this.botTour) data.bots = { 0: Object.assign({ level: 'batzooka', perfect: true }, this.botTour) };
    if (this.botTour) data.cpuLevel = 'rookie';
    BZ.startMatch(data);
  },
  /** the Tour's scripted moments inside a game */
  gameStep(M) {
    if (M.script && M.script.forceHbpInning && M.inning >= M.script.forceHbpInning && M.half === 'bottom' && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.script.hbpDone && BZ.defense(M).id === 'eruptors') {
      M.script.hbpDone = true; const lefty = (M.batter.bt || 'R')[0] === 'L'; M.forcePitch = { type: 'heater', target: [lefty ? 16 : -16, 18], q: 1, slot: 'south' };
    }
    if (M.script && M.script.forceHbpInning && M.inning >= M.script.forceHbpInning && M.half === 'top' && M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && !M.script.hbpDone && BZ.defense(M).id === 'eruptors') {
      M.script.hbpDone = true; const lefty = (M.batter.bt || 'R')[0] === 'L'; M.forcePitch = { type: 'heater', target: [lefty ? 16 : -16, 18], q: 1, slot: 'south' };
    }
  },
  after(M, i) {
    const d = this.d(), st = BZ.STOPS[i], won = M.result.winner === 0;
    if (won) {
      d.tour.stop = i; d.tour.wins++; if (!d.tour.beaten.includes(st.rival)) d.tour.beaten.push(st.rival);
      if (st.reward) { const [up, name] = st.reward; d.upgrades[up] = Math.min(3, d.upgrades[up] + 1); d.rewards.push(name); }
      if (i === 4) d.unlocked.all = d.unlocked.all;   // the MegaDome opens at the final
      if (st.boss) { d.tour.done = true; this.unlockAll(); }
      if (i >= 4) { const m = this.meta(); m.megadome = true; this.setMeta(m); }
      try { BZ.game.saves.autosave(); } catch (e) { /* blocked storage plays on */ }
      BZ.bus.emit('tourStop', { stop: i, won: true });
      BZ.game.go('story', { steps: BZ.STORY[st.id].win, park: st.park, reward: st.reward, then: () => st.boss ? BZ.game.go('credits', { ending: true }) : BZ.game.go('tourMap', { arrived: i }) });
    } else {
      d.tour.losses++;
      BZ.bus.emit('tourStop', { stop: i, won: false });
      try { BZ.game.saves.autosave(); } catch (e) { /* blocked */ }
      BZ.game.go('story', { steps: BZ.STORY[st.id].loss, park: st.park, then: () => BZ.game.go('tourMap', { rainCheck: i }) });
    }
  }
};

/* ---- the Tour menu: Continue, New, Load ---- */
BZ.scenes.tourMenu = {
  enter() {
    const S = BZ.game.saves, any = S.any;
    this.t = 0; BZ.idle = 0;
    this.menu = new BZ.CardMenu([{ label: 'CONTINUE', id: 'cont', disabled: !any, why: 'NO SAVE YET' }, { label: 'NEW TOUR', id: 'new' }, { label: 'LOAD', id: 'load', disabled: !any, why: 'NO SAVE YET' }], { start: any ? 0 : 1 });
    this.loading = null; BZ.music('tourmap');
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    if (this.loading) {
      const res = this.loading.update(dt);
      if (res && res.cancel) this.loading = null;
      if (res && res.pick !== undefined) { const it = this.loading.items[res.pick]; if (!it.disabled && g.saves.load(it.slot)) g.go('tourMap'); }
      return;
    }
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('title');
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'cont') BZ.tour.continueLatest();
      else if (id === 'new') { BZ.tour.newTour(); g.go('story', { steps: BZ.STORY.prologue, park: 'kernel', then: () => g.go('tourMap', { offerTraining: true }) }); }
      else if (id === 'load') { const L = g.saves.list(); this.loading = new BZ.CardMenu(L.map(s => ({ label: s.slot === 'auto' ? 'AUTOSAVE' : 'SLOT ' + (s.slot + 1), sub: s.empty ? 'EMPTY' : (s.place || '') + '  ' + Math.round((s.time || 0) / 60) + ' MIN', disabled: s.empty || s.damaged, slot: s.slot }))); }
    }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1424', '#2a2a48', '#4a3a2a']);
    r.overlay(g => {
      E.font.title(g, 'THE KABOOM CUP TOUR', r.W / 2, 12, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'] });
      E.font.text(g, 'Save Kernel Field from the parking lot. Five road games and a boss.', r.W / 2, 34, '#a8b8e8', { align: 'center' });
      (this.loading || this.menu).draw(g, r, r.W / 2, 56, { w: 230, h: this.loading ? 28 : 24, scale: this.loading ? 1 : 2 });
      BZ.legend(g, r, [['south', 'SELECT'], ['east', 'BACK']]);
    });
  }
};

/* ---- the Tour Map ---- */
BZ.scenes.tourMap = {
  enter(data) {
    const d = BZ.tour.d(); this.data = data || {}; this.t = 0; BZ.idle = 0;
    this.busU = data && data.arrived !== undefined ? Math.max(0, data.arrived - 1) : d.tour.stop; this.target = d.tour.stop;
    const next = BZ.STOPS[d.tour.stop + 1];
    this.menu = new BZ.CardMenu([
      { label: d.tour.done ? 'TOUR COMPLETE!' : this.data.rainCheck !== undefined ? 'RETRY: ' + next.title : 'PLAY: ' + (next ? next.title : ''), id: 'play', disabled: !!d.tour.done },
      { label: 'CLUBHOUSE', id: 'club', sub: BZ.fmt(d.fb) + ' FAN BUCKS' }, { label: 'SAVE', id: 'save' }, { label: 'SPRING TRAINING', id: 'train' }, { label: 'TITLE', id: 'title' }
    ]);
    this.offer = this.data.offerTraining ? new BZ.CardMenu([{ label: 'PLAY', id: 'yes' }, { label: 'SKIP', id: 'no' }], { cols: 2 }) : null;
    this.saving = null; this.note = this.data.rainCheck !== undefined ? 'RAIN CHECK! Same stop, any time.' : '';
    BZ.music('tourmap');
    BZ.tour.returnTo = 'tourMap';
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.busU += (this.target - this.busU) * Math.min(1, dt * 1.2);
    if (this.offer) { const res = this.offer.update(dt); if (res && (res.cancel || res.pick !== undefined)) { const yes = res.pick !== undefined && this.offer.items[res.pick].id === 'yes'; this.offer = null; if (yes) g.go('lessonList'); } return; }
    if (this.saving) { const res = this.saving.update(dt); if (res && res.cancel) this.saving = null; if (res && res.pick !== undefined) { const ok = BZ.tour.save(this.saving.items[res.pick].slot); this.saving = null; BZ.hud.toast(ok ? 'SAVED' : 'SAVE FAILED'); this.note = ok ? 'Saved.' : 'Storage is blocked: the Tour lasts this visit.'; } return; }
    BZ.hud.step(dt);
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('title');
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'play') BZ.tour.playNext();
      else if (id === 'club') g.go('clubhouse');
      else if (id === 'save') { const L = g.saves.list().filter(s => s.slot !== 'auto'); this.saving = new BZ.CardMenu(L.map(s => ({ label: 'SLOT ' + (s.slot + 1), sub: s.empty ? 'EMPTY' : s.place, slot: s.slot }))); }
      else if (id === 'train') g.go('lessonList');
      else if (id === 'title') g.go('title');
    }
  },
  draw(r) {
    const d = BZ.tour.d(), W = r.W, H = r.H;
    r.sky(['#2a5a2a', '#3a6a2a', '#4a7a3a']);
    r.overlay(g => {
      // the county: fields, a river, the road
      for (let i = 0; i < 24; i++) { const x = (i * 71) % W, y = (i * 43) % H; px.blend(g, .25, 'normal', () => px.rect(g, x, y, 40 + i % 5 * 9, 26, i % 3 ? '#5a8a3a' : '#c8b060')); }
      px.blend(g, .7, 'normal', () => { for (let x = 0; x < W; x += 2) px.rect(g, x, H * .2 + Math.sin(x * .03) * 10, 2, 5, '#3a7ab8'); });
      const mw = W - Math.min(190, W * .45) - 20, pts = BZ.STOPS.map(s => [16 + s.map[0] * (mw - 30), 30 + s.map[1] * (H - 80)]);
      for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let k = 0; k < 20; k++) { const u = k / 20; if (k % 2) px.rect(g, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 3, 2, '#f0e0b0'); } }
      BZ.STOPS.forEach((s, i) => {
        const [x, y] = pts[i], beaten = i === 0 || i <= d.tour.stop, next = i === d.tour.stop + 1;
        px.disc(g, x, y, next ? 7 + Math.sin(this.t * 6) : 6, beaten ? '#ffd040' : next ? '#ff5a3a' : '#5a5a6a'); px.disc(g, x, y, 3, '#ffffff');
        E.font.text(g, s.title, x, y + 9, beaten ? '#ffffff' : '#c8c8d8', { align: 'center', shadow: '#000' });
        E.font.text(g, i ? s.sub : 'HOME', x, y + 18, '#ffd8a0', { align: 'center', shadow: '#000' });
      });
      // the bus
      const u = clamp(this.busU, 0, pts.length - 1), i0 = Math.floor(u), f = u - i0, a = pts[i0], b = pts[Math.min(i0 + 1, pts.length - 1)], bx = a[0] + (b[0] - a[0]) * f, by = a[1] + (b[1] - a[1]) * f - 10 + Math.sin(this.t * 8) * 1;
      px.rect(g, bx - 10, by - 6, 20, 9, '#f2c230'); px.rect(g, bx - 9, by - 5, 6, 3, '#9ad8ff'); px.rect(g, bx - 2, by - 5, 6, 3, '#9ad8ff'); px.disc(g, bx - 6, by + 3, 2, '#1a1a1a'); px.disc(g, bx + 6, by + 3, 2, '#1a1a1a'); E.font.text(g, 'COMETS', bx, by - 13, '#1e2a5a', { align: 'center' });
      // the panel
      const pw = Math.min(190, W * .45);
      this.menu.draw(g, r, W - pw / 2 - 10, 14, { w: pw - 10, h: 22, scale: 1 });
      E.font.text(g, 'WINS ' + d.tour.wins + '  LOSSES ' + d.tour.losses + '  FB ' + BZ.fmt(d.fb), 12, 10, '#ffffff', { shadow: '#000' });
      if (d.rewards.length) E.font.text(g, 'GEAR: ' + d.rewards.join(', '), 12, 22, '#ffd040', { shadow: '#000' });
      if (this.note) E.font.text(g, this.note, 12, H - 44, '#ffd040', { shadow: '#000' });
      if (this.offer) { E.ui.box(g, W / 2 - 120, H / 2 - 40, 240, 80, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' }); E.font.text(g, 'Learn the ropes with Grandpa Ike?', W / 2, H / 2 - 30, '#ffffff', { align: 'center' }); this.offer.draw(g, r, W / 2, H / 2 - 6, { w: 100, h: 24 }); }
      if (this.saving) { E.ui.box(g, W / 2 - 120, 30, 240, 120, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' }); this.saving.draw(g, r, W / 2, 44, { w: 210, h: 26, scale: 1 }); }
      BZ.hud.drawToasts(g, r);
      BZ.legend(g, r, [['south', 'SELECT'], ['east', 'TITLE']]);
    });
  }
};

/* ---- the clubhouse: five upgrade cards ---- */
BZ.scenes.clubhouse = {
  enter() { this.t = 0; this.menu = new BZ.CardMenu(BZ.UPGRADES.map(u => ({ label: u.name, id: u.id }))); this.say = 'Spend your Fan Bucks wisely, kid.'; BZ.music('menu'); },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    const d = BZ.tour.d();
    this.menu.items.forEach((it, i) => { const u = BZ.UPGRADES[i], tier = d.upgrades[u.id]; it.sub = tier >= 3 ? 'MAXED' : 'TIER ' + (tier + 1) + ': ' + u.costs[tier] + ' FB'; it.value = '●'.repeat(tier) + '○'.repeat(3 - tier); });
    const res = this.menu.update(dt);
    if (res && res.cancel) g.go('tourMap');
    if (res && res.pick !== undefined) {
      const u = BZ.UPGRADES[res.pick], tier = d.upgrades[u.id];
      if (tier >= 3) { this.say = 'That one\'s as good as it gets.'; BZ.sfx('cancel'); }
      else if (d.fb < u.costs[tier]) { this.say = 'Need ' + (u.costs[tier] - d.fb) + ' more Fan Bucks for that.'; BZ.sfx('cancel'); }
      else { d.fb -= u.costs[tier]; d.upgrades[u.id]++; this.say = u.ike; BZ.sfx('coin'); BZ.babble.say(u.ike, 'ike'); BZ.bus.emit('purchase', { id: u.id, tier: d.upgrades[u.id] }); try { g.saves.autosave(); } catch (e) { /* blocked */ } }
    }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#1a1008', '#3a2414', '#5a3a1a']);
    const d = BZ.tour.d();
    r.overlay(g => {
      E.font.title(g, 'CLUBHOUSE', r.W / 2, 8, { scale: 3, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      E.font.text(g, BZ.fmt(d.fb) + ' FAN BUCKS', r.W / 2, 38, '#ffd040', { align: 'center', scale: 1 });
      const sel = BZ.UPGRADES[this.menu.i];
      this.menu.draw(g, r, r.W / 2, 52, { w: 230, h: 26, scale: 1 });
      E.font.text(g, sel.what, r.W / 2, r.H - 66, '#a8ffb0', { align: 'center' });
      const ike = BZ.castRig('ike'); if (ike && BZ.cosmetic) ike.drawPortrait(g, 12, r.H - 76, 34, { zoom: 2.4 });
      E.font.wrap(this.say, r.W - 80).slice(0, 2).forEach((l, i) => E.font.text(g, l, 52, r.H - 70 + i * 10, '#ffffff'));
      BZ.legend(g, r, [['south', 'BUY'], ['east', 'BACK']]);
    });
  }
};

/* ---- a story scene: the cast at the park in the Broadcast Cam, with talk boxes ---- */
BZ.scenes.story = {
  view: 'broadcast', camera: { zoom: false },
  enter(data) {
    const g = BZ.game; this.data = data; this.t = 0; BZ.clearLater();
    this.P = BZ.park(data.park || 'kernel'); const H = this.P.H, pd = this.P.def;
    g.setView(BZ.VIEWS.broadcast); g.setZoom(1); g.lights.enabled = !!pd.night || pd.ambient < .9; g.lights.ambient = Math.max(.55, pd.ambient); g.weather = null;
    // who is in the scene: everyone who speaks, lined up near home plate
    const who = [...new Set(data.steps.filter(s => s[0] === 'say').map(s => s[1]))].filter(w => w !== 'hap' && w !== 'lou' && w !== 'gloria');
    this.actors = {};
    who.forEach((w, i) => { const rig = BZ.portraitRig(w); if (rig) this.actors[w] = { rig, x: H.x - 60 + i * 34, y: H.y - 90 - (i % 2) * 14, facing: Math.PI / 2, pose: null }; });
    BZ.talk.cut(data.steps, () => { this.done = true; }, { actors: this.actors });
    this.done = false;
    g.focus(H.x, H.y - 90, 0); g.cam.snap = true;
    if (data.reward) BZ.wait(.5, () => BZ.hud.toast('REWARD: ' + data.reward[1] + ' (' + data.reward[2] + ')', 4));
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    BZ.talk.step(dt); BZ.hud.step(dt); BZ.tickLater(dt);
    for (const [w, a] of Object.entries(this.actors)) { const speaking = BZ.talk.cutscene && BZ.talk.cutscene.line && BZ.talk.cutscene.line.who === w; BZ.rigUpdate(a.rig, dt, { x: a.x, y: a.y, z: 0, facing: speaking ? Math.PI / 2 : Math.PI / 2 + (a.x < this.P.H.x ? -.4 : .4), pose: a.pose || (speaking ? null : 'hips'), expr: speaking ? 'shout' : null }); }
    if (this.done) { this.done = false; const cb = this.data.then; if (cb) cb(); else g.go('title'); }
  },
  draw(r) {
    this.P.drawBroadcast(r, r.game.time, .3);
    for (const a of Object.values(this.actors)) { r.shadow(a.x, a.y, 6, .4); r.actor(a.x, a.y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    r.overlay(g => { BZ.talk.drawCut(g, r); BZ.hud.drawToasts(g, r); const st = BZ.STOPS.find(s => s.park === this.P.id); if (st) E.font.title(g, st.title, r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ffffff', '#ffd040'] }); });
  }
};

/* ---- the credits roll, over a blooper reel ---- */
BZ.scenes.credits = {
  view: 'broadcast', camera: { zoom: false },
  enter(data) {
    const g = BZ.game; this.t = 0; this.data = data || {};
    this.P = BZ.park('kernel'); const H = this.P.H;
    g.setView(BZ.VIEWS.broadcast); g.setZoom(.78); g.lights.enabled = true; g.lights.ambient = .6;
    const C = BZ.get('teams', 'comets').players;
    this.cast = C.slice(0, 7).map((p, i) => ({ rig: BZ.rigFor(p, 'bench'), x: H.x - 150 + i * 50, y: H.y - 260 + (i % 2) * 30, ph: i * .9 }));
    this.mascot = BZ.makeBlob(BZ.get('teams', 'comets').mascot);
    this.lines = BZ.CREDITS();
    BZ.music('ending');
    g.focus(H.x, H.y - 250, 0); g.cam.snap = true;
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.cast.forEach((c, i) => { const k = (this.t + c.ph) % 4; const s = { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 }; if (i === 0) s.pose = k < 2 ? 'cheer' : null; else if (i % 3 === 1) s.down = k > 2.5 && k < 3.4 ? 1 : 0; else if (i % 3 === 2) s.attack = E.move('cross', k % 1); else s.pose = 'wave'; BZ.rigUpdate(c.rig, dt, s); });
    this.mascot.update(dt, { walk: 1, squash: Math.sin(this.t * 9) * .3 });
    const end = this.lines.length * 12 + (g.r ? g.r.H : 240) + 40;
    if (this.t * 22 > end || (BZ.anyInput(g) && this.t > 2)) g.go('title');
  },
  draw(r) {
    this.P.drawBroadcast(r, r.game.time, .8);
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
    const H = this.P.H, mx = H.x - 200 + (this.t * 40) % 400; r.actor(mx, H.y - 200, 0, (g, ox, oy) => this.mascot.draw(g, ox, oy, r.view));
    r.overlay(g => {
      px.blend(g, .5, 'multiply', () => px.rect(g, r.W / 2 - 130, 0, 260, r.H, '#101020'));
      const y0 = r.H - this.t * 22;
      this.lines.forEach((l, i) => { const y = y0 + i * 12; if (y > -10 && y < r.H) E.font.text(g, l, r.W / 2, y, /^[A-Z0-9 ,.:!?'\-]+$/.test(l) && l.length < 40 ? '#ffd040' : '#ffffff', { align: 'center', shadow: '#000' }); });
      if (this.data.ending) E.font.text(g, 'THE END?  Exhibition: everything unlocked.', r.W / 2, r.H - 14, '#8affb0', { align: 'center', shadow: '#000' });
    });
  }
};

/* ===== src/34-menus.js ===== */
/* =============================================================================
 * 34-menus: the 10-foot front end. The CardMenu widget (big cards, at most 7,
 * the focus obvious: it grows, glows and bobs; the stick, D-pad, keys and the
 * mouse's hover and click all work), our settings, the pause items, the title
 * (with the touch-only card), results, the Playbook, About/Credits, the gallery.
 * ========================================================================== */
BZ.CardMenu = class CardMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.t = 0; this.rects = []; this.ripple = 0; this.cols = o.cols || 1; while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++; }
  /** returns { pick: index } | { cancel: true } | null */
  update(dt, players) {
    this.t += dt; this.ripple = Math.max(0, this.ripple - dt);
    const P = players || BZ.game.players, n = this.items.length;
    const move = d => { let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled || this.o.allowDisabled) break; } if (j !== this.i) { this.i = j; BZ.sfx('select'); } };
    for (const I of P) {
      if (I.repeat('down')) move(this.cols > 1 ? this.cols : 1); if (I.repeat('up')) move(this.cols > 1 ? -this.cols : -1);
      if (this.cols > 1) { if (I.repeat('right')) move(1); if (I.repeat('left')) move(-1); }
      else if (this.o.leftRight) { if (I.repeat('right')) { this.lr = 1; return { lr: 1, i: this.i }; } if (I.repeat('left')) { this.lr = -1; return { lr: -1, i: this.i }; } }
      if (I.pressed('confirm') || I.pressed('south') && !(I.held && I.held.has && I.held.has('Mouse0'))) { const it = this.items[this.i]; if (it && !it.disabled) { BZ.sfx('confirm'); this.ripple = .3; I.consumeAll && I.consumeAll(); return { pick: this.i, input: I }; } BZ.sfx('cancel'); }
      if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); I.consumeAll && I.consumeAll(); return { cancel: true, input: I }; }
    }
    // the mouse: hover moves the focus, a click picks (not on a touch-only device)
    const I = BZ.game.input;
    if (!BZ.touchOnly && I.lastDevice === 'mouse') {
      const p = I.pointer && I.pointer();
      if (p) this.rects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && this.i !== k && !this.items[k].disabled) { this.i = k; BZ.sfx('select'); } });
      const c = I.clicked && I.clicked();
      if (c) for (let k = 0; k < this.rects.length; k++) { const rc = this.rects[k]; if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3] && !this.items[k].disabled) { this.i = k; BZ.sfx('confirm'); I.consumeAll(); return { pick: k, input: I, mouse: true }; } }
    }
    return null;
  }
  /** draw as a column of cards centred at x from y (or a grid with cols) */
  draw(g, r, x, y, o = {}) {
    const w = o.w || 170, h = o.h || 22, gap = o.gap || 5, sc = o.scale || 2, n = this.items.length, cols = this.cols;
    this.rects = [];
    const cw = cols > 1 ? w : w, totalW = cols * cw + (cols - 1) * gap;
    for (let k = 0; k < n; k++) {
      const it = this.items[k], col = k % cols, row = Math.floor(k / cols), sel = k === this.i;
      const bob = sel ? Math.sin(this.t * 5) * 1 : 0, grow = sel ? 1.08 : 1, ww = Math.round(cw * grow), hh = Math.round(h * grow);
      const cx = x - totalW / 2 + col * (cw + gap) + cw / 2, cy = y + row * (h + gap) + h / 2 + bob;
      const rx = Math.round(cx - ww / 2), ry = Math.round(cy - hh / 2);
      this.rects.push([rx, ry, ww, hh]);
      E.ui.box(g, rx, ry, ww, hh, { bg: sel ? ['#ffb030', '#c8501a'] : it.disabled ? ['#2a2a34', '#1a1a20'] : ['#2a3460', '#141a34'], border: sel ? '#fff6c0' : '#5a6aa0', alpha: o.alpha || .95 });
      if (sel && this.ripple > 0) px.blend(g, this.ripple * 2, 'add', () => px.rect(g, rx, ry, ww, hh, '#ffffff'));
      const label = it.label + (it.value !== undefined ? '  ' + it.value : '');
      E.font.text(g, label, cx, cy - (it.sub ? 7 : 3.5) * (sc > 1 ? 1.6 : 1) + (sc > 1 ? -2 : 0), it.disabled ? '#6a6a7a' : sel ? '#1a0a00' : '#ffffff', { align: 'center', scale: sc, shadow: sel ? null : '#000' });
      if (it.sub) E.font.text(g, it.disabled && it.why ? it.why : it.sub, cx, cy + 5, it.disabled ? '#7a7a8a' : sel ? '#3a1a00' : '#a8b8e8', { align: 'center' });
      if (it.icon) it.icon(g, rx + 4, ry + 3, hh - 6, sel);
    }
    return { w: totalW, h: Math.ceil(n / cols) * (h + gap) };
  }
};
/** a dark gradient backdrop with drifting stars and a ballpark glow, for menus */
BZ.menuBg = (r, t, tint = ['#0a0c24', '#2a1a48', '#5a2a3a']) => {
  r.sky(tint);
  r.overlay(g => { for (let i = 0; i < 40; i++) { const x = (i * 97.3 + t * (4 + i % 5)) % r.W, y = (i * 53.7) % (r.H * .6); px.dot(g, x, y, i % 7 ? '#ffffff60' : '#ffd04080'); } });
};
BZ.title = (g, r, y, sc = 4) => {
  E.font.title(g, 'BATZOOKA', r.W / 2, y, { scale: sc, align: 'center', colors: ['#fff6c0', '#ffb030', '#e0501a'], depth: 3, depthColor: '#3a0a04' });
  E.font.title(g, 'BASEBALL', r.W / 2, y + sc * 9 + 4, { scale: Math.max(2, sc - 1), align: 'center', colors: ['#ffffff', '#9ac8ff', '#3a6ad8'], depth: 2, depthColor: '#0a1a3a' });
};

/* ---- settings (ours, beside the engine's own) ---- */
BZ.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'pro', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['batzooka', 'Batzooka']], group: 'Game' },
  { key: 'innings', label: 'Exhibition innings', type: 'select', value: 3, options: [[1, '1'], [3, '3'], [5, '5'], [9, '9']], group: 'Game' },
  { key: 'tourLength', label: 'Tour game length', type: 'select', value: 'standard', options: [['standard', 'Standard (3 innings)'], ['quick', 'Quick (1 inning)']], group: 'Game' },
  { key: 'mercy', label: 'Mercy rule (10 runs after 2)', type: 'toggle', value: true, group: 'Game' },
  { key: 'comeback', label: 'Comeback Boost', type: 'toggle', value: true, group: 'Game' },
  { key: 'rhubarbs', label: 'Rhubarbs', type: 'toggle', value: true, group: 'Game' },
  { key: 'derbyLength', label: 'Derby length', type: 'select', value: 'time', options: [['time', '2:00'], ['outs', '10 outs']], group: 'Game' },
  { key: 'batAssist', label: 'Batting assist', type: 'select', value: 'hints', options: [['off', 'Off'], ['hints', 'Timing hints'], ['big', 'Big sweet spot']], group: 'Game' },
  { key: 'pitchAssist', label: 'Pitching assist', type: 'select', value: 'off', options: [['off', 'Off'], ['auto', 'Auto-aim']], group: 'Game' },
  { key: 'fielding', label: 'Fielding', type: 'select', value: 'assisted', options: [['manual', 'Manual'], ['assisted', 'Assisted'], ['auto', 'Auto']], group: 'Game' },
  { key: 'baserunning', label: 'Baserunning', type: 'select', value: 'auto', options: [['manual', 'Manual'], ['auto', 'Auto']], group: 'Game' },
  { key: 'keepTune', label: 'Keep dev tuning between visits', type: 'toggle', value: false, group: 'Game' },
  { key: 'timing', label: 'Timing feedback', type: 'toggle', value: true, group: 'Display' },
  { key: 'zone', label: 'Strike zone', type: 'select', value: 'always', options: [['always', 'Always'], ['pitch', 'During the pitch'], ['off', 'Off']], group: 'Display' },
  { key: 'plateCam', label: 'Plate Cam', type: 'select', value: 'classic', options: [['classic', 'Classic'], ['close', 'Close']], group: 'Display' },
  { key: 'fieldCam', label: 'Field camera', type: 'select', value: 'broadcast', options: [['broadcast', 'Broadcast'], ['high', 'High'], ['iso', 'Isometric']], group: 'Display' },
  { key: 'replays', label: 'Replays', type: 'select', value: 'big', options: [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], group: 'Display' },
  { key: 'commentary', label: 'Commentary', type: 'select', value: 'on', options: [['on', 'On'], ['big', 'Big plays only'], ['off', 'Off']], group: 'Sound' },
  { key: 'voices', label: 'Voices', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' }
];
BZ.pauseItems = () => {
  const g = BZ.game, M = BZ.M, scene = g.sceneName, inMatch = scene === 'match' && M, hub = BZ.hubActive;
  const items = [['Playbook', () => { g.resume(); BZ.playbook.open(); }]];
  if (inMatch && !hub && BZ.defense(M).humans.length && M.phase === 'atBat' && BZ.defense(M).bullpen.length) items.push(['Pitching change', () => { const D = BZ.defense(M); const r = D.bullpen.shift(); if (r) { D.bullpen.push(D.pitcher); D.pitcher = r; M.pitcher = r; BZ.match.setupDefense(M); BZ.hud.toast('NOW PITCHING: ' + r.name.toUpperCase()); } g.resume(); }]);
  if (!hub && ['match', 'derby', 'lesson'].includes(scene)) items.push(['Restart', () => { g.resume(); BZ.restart(); }]);
  if (!hub) items.push(['Dev mode', () => { g.resume(); BZ.dev.open(); }]);
  return items;
};
BZ.restart = () => { const g = BZ.game, s = g.sceneName; if (s === 'match') g.go('match', Object.assign({}, BZ.matchData, { seed: (BZ.matchData.seed || 1) + 1 })); else g.go(s, g.scene && g.scene.data); };

/* ---- the title ---- */
BZ.scenes.title = {
  view: 'broadcast', camera: { zoom: false },
  enter() {
    const g = BZ.game;
    this.t = 0; BZ.idle = 0; BZ.M = null;
    const saves = g.saves, hasSave = !!(saves && saves.any && !BZ.hubActive);
    this.sub = null;
    this.menu = new BZ.CardMenu([
      { label: 'CONTINUE', id: 'continue', disabled: !hasSave, why: 'NO SAVE YET' }, { label: 'TOUR', id: 'tour' },
      { label: 'EXHIBITION', id: 'exhibition' }, { label: 'DERBY', id: 'derby' },
      { label: 'TRAINING', id: 'training' }, { label: 'OPTIONS', id: 'options' }, { label: 'ABOUT', id: 'about' }
    ], { start: hasSave ? 0 : 1, cols: 2 });
    this.P = BZ.park('kernel');
    g.setView(BZ.VIEWS.broadcast); g.setZoom(.78); g.lights.enabled = true; g.lights.ambient = .62; g.lights.tint = '#ffb070'; g.weather = null;
    this.dot = BZ.rigFor(BZ.get('players', 'comets-dot-dynamite-delgado'), 'bat');
    BZ.music('title');
    BZ.wheelOwned = false;
    BZ.bus.emit('scene', { scene: 'title' });
  },
  update(dt) {
    const g = BZ.game; this.t += dt;
    BZ.inputTick(g, dt);
    const H = this.P.H;
    g.focus(H.x + Math.sin(this.t * .07) * 220, H.y - 330 + Math.cos(this.t * .05) * 120, 0);
    BZ.rigUpdate(this.dot, dt, { x: H.x - 18, y: H.y - 4, z: 0, facing: Math.PI / 2 + .4, expr: 'smile' });
    if (BZ.F() < .2 && BZ.cosmetic) g.particles.add({ kind: 'glint', x: H.x + BZ.Fr(-500, 500), y: H.y - BZ.Fr(100, 900), z: BZ.Fr(10, 60), life: 1.2, color: '#ffe080' });
    BZ.tickLater(dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    // touch-only: only the Settings button answers taps
    if (BZ.touchOnly) {
      const c = g.input.clicked && g.input.clicked(); const b = this.setBtn;
      if (c && b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]) g.menu('settings');
      return;
    }
    if (this.sub) { const res = this.sub.update(dt); if (res && res.cancel) this.sub = null; else if (res && res.pick !== undefined) { const id = this.sub.items[res.pick].id; this.sub = null; if (id === 'settings') g.menu('settings'); else if (id === 'controls') g.menu('controls'); else if (id === 'playbook') BZ.playbook.open(); } return; }
    if (BZ.playbook.on) { BZ.playbook.update(dt); return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'continue') BZ.tour.continueLatest();
      else if (id === 'tour') g.go('tourMenu');
      else if (id === 'exhibition') g.go('teamSelect');
      else if (id === 'derby') g.go('derbySetup');
      else if (id === 'training') g.go('lessonList');
      else if (id === 'options') this.sub = new BZ.CardMenu([{ label: 'SETTINGS', id: 'settings' }, { label: 'CONTROLS', id: 'controls' }, { label: 'PLAYBOOK', id: 'playbook' }]);
      else if (id === 'about') g.go('about');
    }
  },
  draw(r) {
    const t = this.t, P = this.P;
    P.drawBroadcast(r, r.game.time, .25);
    const H = P.H; r.shadow(H.x - 18, H.y - 4, 6, .4); r.actor(H.x - 18, H.y - 4, 0, (g, ox, oy) => this.dot.draw(g, ox, oy, r.view));
    r.queue(H.x - 18, H.y - 4, 0, g => BZ.drawBatzooka(g, this.dot, (x, y, z) => { const q = r.w(x, y, z); return [q[0], q[1], 1]; }, 1.4 * r.game.zoom, t, ['#ff7a1a', '#ffd040', '#fff6c0']), { bias: 2, emissive: true });
    r.game.lights.add(H.x, H.y - 200, 120, 700, .5, { color: '#ffd8a0' });
    r.overlay(g => {
      px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a2048'));
      const ly = Math.max(8, r.H * .05), big = r.H > 300 && r.W > 480;
      BZ.title(g, r, ly, big ? 4 : 3);
      // a rocket trail sweeping under the logo
      const k = (t * .5) % 1.4, ty = ly + (big ? 70 : 54); if (k < 1) px.blend(g, .8, 'add', () => { for (let i = 0; i < 14; i++) { const x = r.W * (k - i * .012), y = ty - i * .5; px.disc(g, x, y, 3 - i * .18, i < 4 ? '#fff6c0' : '#ff7a1a'); } });
      if (BZ.touchOnly) { this.touchCard(g, r); return; }
      const top = ty + 8;
      if (this.sub) this.sub.draw(g, r, r.W / 2, top + 10, { w: 170, h: 22 });
      else if (BZ.playbook.on) BZ.playbook.draw(g, r);
      else this.menu.draw(g, r, r.W / 2, top, { w: Math.min(140, (r.W - 30) / 2), h: 20, gap: 4 });
      E.font.text(g, E.versionLabel ? 'my-3D2dge ' + E.versionLabel() + '  ·  game ' + BZ.version : BZ.version, 6, r.H - 10, '#8a8aa8');
      if (!this.sub && !BZ.playbook.on) BZ.legend(g, r, [['south', 'SELECT'], ['east', 'BACK']]);
    });
  },
  touchCard(g, r) {
    const w = Math.min(r.W - 30, 280), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .42);
    E.ui.box(g, x, y, w, 108, { bg: ['#2a3460', '#141a34'], border: '#ffd040' });
    // a controller and a keyboard
    const cx = r.W / 2;
    px.rect(g, cx - 64, y + 14, 44, 20, '#3a3f52'); px.disc(g, cx - 64, y + 26, 10, '#3a3f52'); px.disc(g, cx - 20, y + 26, 10, '#3a3f52'); px.disc(g, cx - 54, y + 22, 3, '#9aa3c0'); px.disc(g, cx - 30, y + 22, 2, '#7aa7ff'); px.disc(g, cx - 26, y + 26, 2, '#ff6b6b');
    px.rect(g, cx + 10, y + 14, 52, 22, '#d8dce8'); for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) px.rect(g, cx + 13 + j * 7, y + 17 + i * 5, 5, 3, '#6a7088');
    E.font.text(g, 'Controller or keyboard required', cx, y + 46, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
    E.font.text(g, 'Connect one to play. The demo runs on its own.', cx, y + 58, '#a8b8e8', { align: 'center' });
    const bw = 110, bx = Math.round(cx - bw / 2), by = y + 72; this.setBtn = [bx, by, bw, 26];
    E.ui.box(g, bx, by, bw, 26, { bg: ['#ffb030', '#c8501a'], border: '#fff6c0' }); E.font.text(g, 'SETTINGS', cx, by + 7, '#1a0a00', { align: 'center', scale: 2 });
  }
};

/* ---- the Playbook: one page a context, a picture and 3-5 icon + verb lines for the device in use ---- */
BZ.PLAYBOOK = [
  { title: 'BATTING', pose: 'bat', lines: [['move', 'Aim the sweet spot (the mouse places it)'], ['south', 'Contact swing: big sweet spot'], ['west', 'Power swing: small spot, big hits'], ['north', 'Hold to bunt, let go to pull back'], ['r1', 'BATZOOKA when the meter is full']], tip: 'Swing early to pull it, late to go the other way. Aim high for grounders, low for flies.' },
  { title: 'PITCHING', pose: 'pitch', lines: [['south', 'Heater   ○ breaking   □ off-speed'], ['north', 'Signature pitch   R1: team super'], ['move', 'Aim the target during the windup'], ['south', 'Press again as the ring closes'], ['move', 'Bend the ball early in flight']], tip: 'Mouse: the wheel picks a pitch, click throws, click again on the ring. Keys 1-5 pick too.' },
  { title: 'FIELDING', pose: 'field', lines: [['move', 'Run (assisted: you chase on your own)'], ['east', '1B  △ 2B  □ 3B  ✕ HOME: hold to power up'], ['r1', 'Jump, or climb the wall to rob a homer'], ['r2', 'Dive'], ['l1', 'Switch fielder   L2: turbo']], tip: 'Click a base to throw there. Over 85% power a throw can sail wild.' },
  { title: 'RUNNING', pose: 'run', lines: [['r1', 'Everybody go'], ['l1', 'Everybody back'], ['l2', 'Turbo'], ['south', 'Headfirst dive near a base'], [['l1', 'num2'], 'Before the pitch: steal']], tip: 'Hold a base button with R1 or L1 to send just that runner. Click a base to send, right-click to bring back.' },
  { title: 'SUPERS', pose: 'zooka', lines: [['r1', 'BATZOOKA! (100%): a rocket-powered swing'], ['r1', 'Super pitch at the pitch select (100%)'], [['r1', 'east'], 'LASER ARM throw (50%)'], [['r1', 'l2'], 'AFTERBURNERS while running (50%)']], tip: 'The crowd fills the meter: hits, homers, strikeouts, great catches, steals and rhubarbs.' },
  { title: 'RHUBARB', pose: 'fight', lines: [['move', 'Move'], ['south', 'Punch combo'], ['west', 'Shove'], ['north', 'Grab and toss'], ['east', 'Dodge']], tip: 'Twelve seconds of slapstick. Most knockdowns wins +50 meter. Nobody gets hurt.' },
  { title: 'HOUSE RULES', pose: null, lines: [], rules: true, tip: 'What you can\'t do in this ballpark:' }
];
BZ.playbook = {
  on: false, i: 0, t: 0,
  open() { this.on = true; this.i = 0; this.t = 0; this.rig = null; BZ.game.input.consumeAll(); },
  update(dt) {
    this.t += dt;
    const P = BZ.game.players;
    for (const I of P) {
      if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % BZ.PLAYBOOK.length; BZ.sfx('select'); }
      if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + BZ.PLAYBOOK.length - 1) % BZ.PLAYBOOK.length; BZ.sfx('select'); }
      if (I.pressed('cancel') || I.pressed('east')) { this.on = false; I.consumeAll(); BZ.sfx('cancel'); return; }
    }
    const c = BZ.game.input.clicked && BZ.game.input.clicked();
    if (c && !BZ.touchOnly) { if (c[0] > BZ.game.r.W * .7) this.i = (this.i + 1) % BZ.PLAYBOOK.length; else if (c[0] < BZ.game.r.W * .3) this.i = (this.i + BZ.PLAYBOOK.length - 1) % BZ.PLAYBOOK.length; }
    const pg = BZ.PLAYBOOK[this.i];
    if (pg.pose) {
      const job = pg.pose === 'bat' || pg.pose === 'zooka' ? 'bat' : pg.pose === 'pitch' ? 'pitch' : pg.pose === 'field' ? 'field' : pg.pose === 'fight' ? 'fight' : 'run';
      this.rig = BZ.rigFor(BZ.get('players', 'comets-dot-dynamite-delgado'), job);
      const u = (this.t % 1.6) / 1.6, s = { x: 0, y: 0, z: 0, facing: Math.PI / 2 + .6 };
      if (pg.pose === 'bat' || pg.pose === 'zooka') s.attack = u < .5 ? null : BZ.motionAt(BZ.MOTION.swing, (u - .5) * 1.6, .06, .08, .3);
      else if (pg.pose === 'pitch') s.attack = u < .4 ? BZ.atk('knee', 'wind', u / .4) : BZ.motionAt('throw', (u - .4) * 1.6, .1, .08, .4);
      else if (pg.pose === 'field') s.attack = BZ.motionAt('throw', u * 1.6, .25, .08, .4);
      else if (pg.pose === 'fight') { s.attack = E.move(['jab', 'cross', 'hook'][Math.floor(this.t * 2) % 3], (this.t * 2) % 1); s.stance = 'guard'; }
      else s.run = 1;
      BZ.rigUpdate(this.rig, 1 / 60, s);
    }
  },
  draw(g, r) {
    const pg = BZ.PLAYBOOK[this.i], I = BZ.game.input, w = Math.min(r.W - 24, 400), h = Math.min(r.H - 40, 190), x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
    E.ui.box(g, x, y, w, h, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040' });
    E.font.title(g, 'PLAYBOOK: ' + pg.title, r.W / 2, y + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
    E.font.text(g, (this.i + 1) + ' / ' + BZ.PLAYBOOK.length, x + w - 8, y + 8, '#8a90b8', { align: 'right' });
    if (this.rig && BZ.cosmetic) { const v = BZ._pbView || (BZ._pbView = new E.View('pb', 'pb', 0, 20, 2.4, 1)); this.rig.draw(g, x + 46, y + h - 30, v); }
    let ly = y + 32;
    if (pg.rules) for (const ru of BZ.HOUSE_RULES) { E.font.text(g, '• ' + ru, x + 16, ly, '#ffffff'); ly += 13; }
    for (const [a, verb] of pg.lines) { BZ.drawPrompts(g, I, [[a, verb, true]], x + 100, ly, { panel: false, size: 12 }); ly += 22; }
    const lines = E.font.wrap(pg.tip, w - 30); lines.forEach((l, i) => E.font.text(g, l, r.W / 2, y + h - 26 + i * 10, '#a8b8e8', { align: 'center' }));
    BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['east', 'BACK']]);
  }
};

/* ---- results ---- */
BZ.scenes.results = {
  enter(data) {
    const M = data.M, d = data.data || {}; this.M = M; this.d = d; this.t = 0;
    const human = M.teams.findIndex(T => T.humans.length), won = M.result.winner === human;
    this.fb = human >= 0 ? (won ? 500 : 150) + (M.bonusFB || 0) + 50 * Object.values(M.stats).filter(s => s.team === M.teams[human].id).reduce((a, s) => a + s.HR, 0) + (won && M.teams[1 - human].runs === 0 ? 200 : 0) : 0;
    this.shown = 0;
    // the game's three stars
    const score = s => s.H * 2 + s.HR * 5 + s.RBI * 2 + s.SB + s.PK * 1.5 + s.catches * .5 + s.dives * 2 + s.robbed * 5 - s.K * .5;
    this.stars = Object.entries(M.stats).map(([id, s]) => ({ id, s, v: score(s) })).sort((a, b) => b.v - a.v).slice(0, 3);
    this.menu = new BZ.CardMenu([{ label: 'CONTINUE', id: 'continue' }, { label: 'REPLAY', id: 'replay', disabled: !BZ.cams.ring.length }, { label: 'REMATCH', id: 'rematch', disabled: !!d.tourStop }], { cols: 3 });
    if (d.onResults) d.onResults(M, this);
    BZ.music('menu');
    BZ.game.setView(BZ.VIEWS.broadcast);
    if (this.fb && BZ.tour) BZ.tour.addFB(this.fb);
    BZ.bus.emit('scene', { scene: 'results' });
  },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    this.shown = Math.min(this.fb, this.shown + Math.max(1, this.fb) * dt * 1.2);
    if (this.replay) { const R = this.replay; R.acc += dt * 30; R.i = Math.floor(R.acc); if (R.i >= R.frames.length - 1 || (BZ.anyInput(g) && R.acc > 15)) { this.replay = null; g.setView(BZ.VIEWS.broadcast); } else { BZ.cams.animate(this.M, R.frames[R.i], dt * .5); const b = R.frames[R.i].ball; g.focus(b.x || this.M.park.H.x, b.y || this.M.park.H.y - 200, 0); } return; }
    const res = this.menu.update(dt);
    if (res && res.pick !== undefined) {
      const id = this.menu.items[res.pick].id;
      if (id === 'continue') { if (this.d.next) this.d.next(this.M); else g.go(this.d.mode === 'exhibition' ? 'teamSelect' : 'title'); }
      else if (id === 'replay') { this.replay = { frames: BZ.cams.ring.slice(-300), acc: 0, i: 0 }; g.setView('iso'); g.setZoom(.62); }
      else if (id === 'rematch') BZ.startMatch(Object.assign({}, this.d, { seed: (this.d.seed || 1) + 7 }));
    }
  },
  draw(r) {
    const M = this.M;
    if (this.replay) { BZ.cams.drawField(r, M, this.replay.frames[Math.min(this.replay.i, this.replay.frames.length - 1)]); r.overlay(g => { E.font.title(g, 'HIGHLIGHT', 14, 14, { scale: 2, colors: ['#ffffff', '#ff5a5a'] }); BZ.legend(g, r, [['south', 'BACK']]); }); return; }
    BZ.menuBg(r, this.t);
    r.overlay(g => {
      const A = M.teams[0], H = M.teams[1], w = M.result.winner;
      E.font.title(g, 'FINAL', r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ffffff', '#9ac8ff'] });
      E.font.text(g, A.def.abbr, r.W / 2 - 60, 34, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, H.def.abbr, r.W / 2 + 60, 34, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      E.font.title(g, A.runs + ' - ' + H.runs, r.W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'], depth: 2 });
      if (w >= 0) E.font.text(g, M.teams[w].def.name.toUpperCase() + ' WIN' + (M.result.why === 'boom' ? ' THE SUDDEN BOOM!' : M.result.why === 'mercy' ? ' (MERCY RULE)' : M.result.why === 'walkoff' ? ' ON A WALK-OFF!' : '!'), r.W / 2, 68, '#ffd040', { align: 'center', shadow: '#000' });
      E.font.text(g, 'R ' + A.runs + '  H ' + A.hits + '  E ' + A.errors + '      R ' + H.runs + '  H ' + H.hits + '  E ' + H.errors, r.W / 2, 80, '#a8b8e8', { align: 'center' });
      // three stars
      const cw = Math.min(118, (r.W - 30) / 3);
      this.stars.forEach((st, i) => {
        const x = Math.round(r.W / 2 - cw * 1.5 + i * cw + 3), y = 94, pl = BZ.get('players', st.id);
        E.ui.box(g, x, y, cw - 6, 62, { bg: ['#2a3460', '#141a34'], border: '#ffd040' });
        E.font.text(g, '★'.repeat(3 - i), x + (cw - 6) / 2, y + 3, '#ffd040', { align: 'center' });
        if (pl && BZ.cosmetic) BZ.rigFor(pl, 'bench').drawPortrait(g, x + 4, y + 14, 28, { zoom: 2.4, frame: false });
        E.font.text(g, pl ? pl.short : '', x + 36, y + 16, '#ffffff');
        const s = st.s, line = s.HR ? s.HR + ' HR ' + s.RBI + ' RBI' : s.PK ? s.PK + ' K' : s.H ? s.H + ' HITS' : s.catches ? s.catches + ' CATCHES' : 'HUSTLE';
        E.font.text(g, line, x + 36, y + 28, '#a8ffb0');
      });
      if (this.fb) E.font.text(g, '+' + Math.floor(this.shown) + ' FAN BUCKS', r.W / 2, 164, '#ffd040', { align: 'center', scale: 2, shadow: '#000' });
      this.menu.draw(g, r, r.W / 2, r.H - 52, { w: 104, h: 20, scale: 1 });
      BZ.legend(g, r, [['south', 'SELECT']]);
    });
  }
};

/* ---- About / Credits: pages turned by L1 / R1, left / right or clicks; up and down scroll ---- */
BZ.scenes.about = {
  enter() { this.i = 0; this.scroll = 0; this.t = 0; BZ.music('menu'); BZ.idle = 0; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && !BZ.hubActive) { BZ.attract.start(); return; }
    const pages = BZ.ABOUT_PAGES();
    for (const I of g.players) {
      if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % pages.length; this.scroll = 0; BZ.sfx('select'); }
      if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + pages.length - 1) % pages.length; this.scroll = 0; BZ.sfx('select'); }
      if (I.repeat('down')) this.scroll++; if (I.repeat('up')) this.scroll = Math.max(0, this.scroll - 1);
      if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); g.go('title'); return; }
    }
    const c = g.input.clicked && g.input.clicked();
    if (c && !BZ.touchOnly && g.r) { if (c[0] > g.r.W * .66) { this.i = (this.i + 1) % pages.length; this.scroll = 0; } else if (c[0] < g.r.W * .33) { this.i = (this.i + pages.length - 1) % pages.length; this.scroll = 0; } }
  },
  draw(r) {
    BZ.menuBg(r, this.t, ['#0a1424', '#1a2a48', '#2a1a3a']);
    const pages = BZ.ABOUT_PAGES(), pg = pages[this.i];
    r.overlay(g => {
      const w = Math.min(r.W - 20, 560), x = Math.round(r.W / 2 - w / 2), y = 8, h = r.H - 40;
      E.ui.box(g, x, y, w, h, { bg: ['#1a2448', '#0a0e20'], border: '#ffd040', alpha: .95 });
      E.font.title(g, pg.title, r.W / 2, y + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      E.font.text(g, (this.i + 1) + '/' + pages.length, x + w - 8, y + 8, '#8a90b8', { align: 'right' });
      if (pg.logo) BZ.title(g, r, y + 28, 3);
      const lines = []; for (const l of pg.lines) { for (const wl of E.font.wrap(l, w - 24)) lines.push(wl); }
      const per = Math.floor((h - (pg.logo ? 104 : 38)) / 10), top = y + (pg.logo ? 98 : 30);
      this.scroll = Math.min(this.scroll, Math.max(0, lines.length - per));
      lines.slice(this.scroll, this.scroll + per).forEach((l, i) => { const head = /^[A-Z][A-Za-z &/]+:/.exec(l); E.font.text(g, l, x + 12, top + i * 10, head ? '#ffffff' : '#d8e0ff'); if (head) E.font.text(g, head[0], x + 12, top + i * 10, '#ffd040'); });
      if (lines.length > per) E.font.text(g, (this.scroll + per < lines.length ? '↓ more' : '') + (this.scroll ? '  ↑' : ''), x + w - 10, y + h - 12, '#8a90b8', { align: 'right' });
      BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['down', 'SCROLL'], ['east', 'BACK']]);
    });
  }
};

/* ---- the animation gallery (from dev mode's WARP): every new motion in turn ---- */
BZ.GALLERY = [
  ['CONTACT SWING', 'bat', t => ({ attack: BZ.motionAt(BZ.MOTION.swing, t % 1.2 - .3, .06, .08, .32) })],
  ['POWER SWING', 'bat', t => ({ attack: BZ.motionAt(BZ.MOTION.power, t % 1.2 - .3, .1, .08, .32) })],
  ['BUNT', 'bat', t => ({ attack: t % 1.6 > .4 ? BZ.atk(BZ.MOTION.bunt, 'active', .5) : null })],
  ['WINDUP AND PITCH', 'pitch', t => { const u = t % 1.6; return { attack: u < .5 ? BZ.atk('knee', 'wind', u / .5) : u < .9 ? BZ.atk('throw', 'wind', (u - .5) / .4) : BZ.motionAt('throw', u - .9, 0, .08, .4) }; }],
  ['FIELDER THROW', 'field', t => ({ attack: BZ.motionAt('throw', t % 1.2 - .2, .22, .08, .4) })],
  ['TAG', 'field', t => ({ attack: BZ.motionAt(BZ.MOTION.tag, t % 1.2 - .2, .12, .1, .3) })],
  ['DIVE', 'field', t => ({ down: Math.min(.75, (t % 1.6) * 2) })],
  ['FEET-FIRST SLIDE', 'run', t => ({ down: Math.min(.7, (t % 1.6) * 2), vx: 60 })],
  ['WALL CLIMB', 'field', t => ({ climb: true, vz: 60 })],
  ['JUMP', 'field', t => ({ air: (t % 1.2) < .6 })],
  ['UMPIRE: STRIKE', 'ump', t => ({ attack: BZ.motionAt(BZ.MOTION.punchOut, t % 1.4 - .2, .12, .1, .6), expr: 'shout' })],
  ['UMPIRE: SAFE', 'ump', t => ({ attack: BZ.motionAt(BZ.MOTION.safe, t % 1.4 - .2, .12, .1, .6) })],
  ['CELEBRATION', 'bench', t => ({ pose: 'cheer', expr: 'smile' })],
  ['DEJECTION', 'bench', t => ({ pose: 'kneel', expr: 'wince' })],
  ['RHUBARB PUNCHES', 'fight', t => ({ attack: E.move(['jab', 'cross', 'hook'][Math.floor(t * 2) % 3], (t * 2) % 1), stance: 'guard', expr: 'angry' })]
];
BZ.scenes.gallery = {
  pausable: true, view: 'broadcast', camera: { zoom: false },
  enter() { this.t = 0; this.i = 0; this.slow = false; this.P = BZ.park('kernel'); BZ.game.setView(BZ.VIEWS.broadcast); BZ.game.setZoom(2); BZ.game.lights.enabled = false; BZ.music('training'); },
  update(dt) {
    const g = BZ.game, I = g.input; BZ.inputTick(g, dt);
    if (BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    const sp = this.slow ? .25 : 1; this.t += dt * sp;
    if (I.pressed('right') || I.pressed('r1')) { this.i = (this.i + 1) % BZ.GALLERY.length; this.t = 0; }
    if (I.pressed('left') || I.pressed('l1')) { this.i = (this.i + BZ.GALLERY.length - 1) % BZ.GALLERY.length; this.t = 0; }
    if (I.pressed('south')) this.slow = !this.slow;
    if (I.pressed('east')) { g.go('title'); return; }
    if (this.t > 4.8 && !this.hold) { this.i = (this.i + 1) % BZ.GALLERY.length; this.t = 0; }
    const H = this.P.H, [, job, fn] = BZ.GALLERY[this.i];
    const pl = BZ.get('players', 'comets-dot-dynamite-delgado');
    this.rig = job === 'ump' ? BZ.umpireRig() : BZ.rigFor(pl, job);
    const s = Object.assign({ x: H.x, y: H.y - 100, z: 0, facing: Math.PI * .65 }, fn(this.t));
    BZ.rigUpdate(this.rig, dt * sp, s);
    this.rig2 = BZ.rigFor(BZ.get('players', 'comets-moose-magnusson'), job === 'ump' ? 'bench' : job);
    BZ.rigUpdate(this.rig2, dt * sp, Object.assign({}, s, { x: H.x + 40, facing: Math.PI * .35 }));
    g.focus(H.x + 20, H.y - 100, 14);
  },
  draw(r) {
    const H = this.P.H;
    this.P.drawBroadcast(r, r.game.time, 0);
    r.shadow(H.x, H.y - 100, 6, .4); r.actor(H.x, H.y - 100, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.shadow(H.x + 40, H.y - 100, 6, .4); r.actor(H.x + 40, H.y - 100, 0, (g, ox, oy) => this.rig2.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'ANIMATION GALLERY', r.W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      E.font.text(g, (this.i + 1) + '/' + BZ.GALLERY.length + '  ' + BZ.GALLERY[this.i][0] + (this.slow ? '  (SLOW)' : ''), r.W / 2, 30, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
      BZ.legend(g, r, [['left', 'PREV'], ['right', 'NEXT'], ['south', 'SLOW'], ['east', 'TITLE']]);
    });
    if (BZ.dev.isOpen()) BZ.dev.draw(r);
  }
};

/* ===== src/35-attract.js ===== */
/* =============================================================================
 * 35-attract: the attract mode. After 10 s with no input on the title or a top
 * menu, a looping highlight reel PLAYED BY THE REAL GAME starts: the CPU on both
 * sides, cheats on (forced pitches and contact, infinite meter), each segment
 * with a time limit so it moves on by itself. DEMO PLAY and PRESS ANY BUTTON
 * (the device used last; TOUCH TO RETURN on touch-only), a caption card between
 * segments. Any input goes back to the title. Never in an AI Hub session.
 * ========================================================================== */
const hitV = (thDeg, phDeg, ev) => { const t = thDeg * Math.PI / 180, p = phDeg * Math.PI / 180; return [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)]; };
const script = (list) => (res) => { const s = list.shift(); if (!s) return res; if (s === 'miss') { res.kind = 'miss'; return res; } res.kind = 'contact'; res.v = hitV(s[0], s[1], s[2]); res.Q = .8; res.EV = s[2]; if (s[3]) res.zooka = true; return res; };
BZ.ATTRACT = [
  { caption: 'PLAY BALL!', park: 'kernel', away: 'krakens', home: 'comets', dur: 20,
    setup(M) { M.scriptHit = script([[-62, 20, 420], [14, 9, 620]]); M.forcePitchList = [{ type: 'heater', target: [2, 16] }, { type: 'curve', target: [-3, 14] }, { type: 'heater', target: [0, 17] }]; M.takeFirst = 1; } },
  { caption: 'SUPER PITCHES', park: 'caldera', away: 'comets', home: 'eruptors', dur: 16,
    setup(M) { M.strikes = 2; M.teams[1].meter = 100; M.forcePitchList = [{ slot: 'r1', type: 'meteorheater', target: [0, 17] }, { type: 'heater', target: [0, 17] }]; M.forceMissFirst = true; M.scriptHit = script([[-22, 40, 520]]); BZ.wait(3.5, () => { if (BZ.hazard && BZ.hazard.trigger) { BZ.hazard.state = 'rumble'; BZ.hazard.t = .5; } }); } },
  { caption: 'LEATHER AND LASERS', park: 'barnacle', away: 'comets', home: 'krakens', dur: 20,
    setup(M) { M.bases = [null, BZ.get('teams', 'comets').lineup[1], null]; M.teams[1].meter = 100; M.cheats.surehands = true; M.scriptHit = script([[26, 14, 560], [18, 8, 600]]); M.forcePitchList = [{ type: 'heater', target: [0, 17] }, { type: 'heater', target: [0, 17] }]; BZ.wait(1, () => BZ.hazard && BZ.hazard.trigger && BZ.hazard.trigger(M)); } },
  { caption: 'WHEELS', park: 'kernel', away: 'comets', home: 'haunts', dur: 13,
    setup(M) { M.bases = [BZ.get('teams', 'comets').lineup[1], null, null]; M.forcePitchList = [{ type: 'changeup', target: [9, 22] }, { type: 'heater', target: [0, 17] }]; M.takeFirst = 2; M.attractSteal = true; M.scriptHit = script([[-8, 6, 640]]); } },
  { caption: 'BATZOOKA!', park: 'megadome', away: 'comets', home: 'mechanicals', dur: 22,
    setup(M) { M.teams[0].meter = 100; M.forcePitchList = [{ type: 'heater', target: [0, 17] }]; M.scriptHit = script([[0, 30, 1300, true]]); M.armZooka = true; } },
  { caption: 'RHUBARB!', park: 'caldera', away: 'comets', home: 'eruptors', dur: 18,
    setup(M) { M.forcePitchList = [{ type: 'heater', target: [-16, 18], q: 1 }]; M.script = { rhubarbOnHbp: true }; } },
  { caption: 'SIX WILD PARKS', park: 'tranquility', away: 'comets', home: 'meteors', dur: 15,
    setup(M) { M.forcePitchList = [{ type: 'heater', target: [0, 17] }]; M.scriptHit = script([[4, 36, 880]]); BZ.wait(2.5, () => BZ.hazard && BZ.hazard.trigger && BZ.hazard.trigger(M)); } },
  { caption: 'SIX WILD PARKS', park: 'boneyard', away: 'comets', home: 'haunts', dur: 15,
    setup(M) { M.strikes = 1; M.teams[1].meter = 100; M.forcePitchList = [{ slot: 'r1', type: 'banshee', target: [0, 15] }, { type: 'heater', target: [0, 17] }]; M.forceMissFirst = true; M.scriptHit = script([[-10, 38, 760]]); } },
  { caption: '1-4 PLAYERS  ·  PLAY ONLINE IN AI HUB', derby: true, park: 'megadome', dur: 16 },
  { caption: 'MOONSHOT LEADERS', leaders: true, dur: 9 }
];
BZ.attract = {
  on: false, seg: 0, t: 0, card: 0,
  start() {
    if (BZ.hubActive) return;
    this.on = true; this.seg = 0; this.loops = (this.loops || 0); BZ.idle = 0;
    BZ.bus.emit('attract', { on: true });
    this.run();
  },
  stop() {
    if (!this.on) return;
    this.on = false; BZ.idle = 0;
    BZ.game.timeScale = TUNE.gameSpeed;
    for (const I of BZ.game.players) I.consumeAll();
    BZ.bus.emit('attract', { on: false });
    BZ.game.go('title', null, { fade: .2 });
  },
  run() {
    const S = BZ.ATTRACT[this.seg % BZ.ATTRACT.length], g = BZ.game;
    this.t = 0; this.card = 2.2; this.segT = 0;
    BZ.bus.emit('attractSegment', { i: this.seg % BZ.ATTRACT.length, caption: S.caption });
    if (S.leaders) { g.go('attractCard', { caption: S.caption }, { fade: .2 }); return; }
    if (S.derby) { g.go('derby', { players: 1, park: S.park, bots: true, attract: true, onDone: () => this.next() }, { fade: .2 }); return; }
    BZ.startMatch({ mode: 'attract', attract: true, away: S.away, home: S.home, park: S.park, innings: 9, difficulty: 'allstar', cpuLevel: 'allstar', humans: { 0: [], 1: [] }, seed: 77 + this.seg, mercy: false,
      cheats: { infMeter: false, surehands: false }, onInstall: M => { S.setup(M); M.attract = true; this.M = M; }, onStep: (M, dt) => this.step(M, dt, S), onFinal: () => this.next() }, { fade: .2 });
  },
  next() { if (!this.on) return; this.seg++; if (this.seg % BZ.ATTRACT.length === 0) this.loops = (this.loops || 0) + 1; this.run(); },
  /** each step of a demo match: feed the forced pitches, the steal, the Batzooka; move on at the time limit */
  step(M, dt, S) {
    this.segT += dt; this.card = Math.max(0, this.card - dt);
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t < dt * 1.5) {
      const fp = M.forcePitchList && M.forcePitchList.shift(); if (fp) M.forcePitch = Object.assign({ q: .9 }, fp);
      if (M.takeFirst) { M.cheats.autoBatter = 'take'; M.takeFirst--; } else M.cheats.autoBatter = null;
      if (M.forceMissFirst) { M.forceContact = 'miss'; M.forceMissFirst = false; }
      if (M.attractSteal && M.bases[0]) { M.steals[1] = true; M.attractSteal = false; }
      if (M.armZooka) { M.teams[0].meter = 100; BZ.supers.arm(M, 0); M.armZooka = false; }
    }
    if (M.phase === 'inPlay') for (const r of M.runners) if (Math.abs(Math.round(r.goal) - r.p) * 300 < 38 && r.state === 'run' && r.steal) r.headfirst = true;
    // the segment's time limit (a home run's cinematic gets to finish)
    if (this.segT > S.dur && !M.cinematic && !BZ.cams.moon && !BZ.cams.replay && !BZ.talk.cutscene) this.next();
  },
  /** any input returns to the title (checked by the scenes the reel runs in) */
  check(game) { if (this.on && BZ.anyInput(game) && this.segT > .25) { this.stop(); return true; } return false; },
  overlay(g, r) {
    if (!this.on) return;
    const S = BZ.ATTRACT[this.seg % BZ.ATTRACT.length];
    E.ui.box(g, 8, r.H - 42, 96, 16, { bg: ['#3a0a0a', '#1a0404'], border: '#ff5a5a', alpha: .9 });
    E.font.text(g, 'DEMO PLAY', 56, r.H - 38, '#ffffff', { align: 'center' });
    const blink = Math.floor(BZ.game.real * 2) % 2;
    if (blink) {
      if (BZ.touchOnly) E.font.text(g, 'TOUCH TO RETURN', r.W / 2, r.H - 20, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      else { const I = BZ.game.input, dev = I.lastDevice; BZ.drawPrompts(g, I, [[dev === 'mouse' ? 'south' : dev === 'gamepad' ? 'south' : 'confirm', 'PRESS ANY BUTTON', true]], r.W / 2, r.H - 22, { align: 'center' }); }
    }
    if (this.card > 0) {
      const a = Math.min(1, this.card * 2, (2.2 - this.card) * 4);
      px.blend(g, .85 * a, 'normal', () => E.ui.box(g, r.W / 2 - 140, r.H * .38, 280, 34, { bg: ['#2a1a48', '#120a24'], border: '#ffd040' }));
      if (a > .5) E.font.title(g, S.caption, r.W / 2, r.H * .38 + 9, { scale: S.caption.length > 20 ? 1 : 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
    }
  }
};
/** the attract mode's own card scene: the Moonshot Leaders table, then the logo and PRESS START */
BZ.scenes.attractCard = {
  enter(d) { this.t = 0; this.d = d; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    BZ.attract.segT = this.t;
    if (BZ.attract.check(g)) return;
    if (this.t > 9) BZ.attract.next();
  },
  draw(r) {
    BZ.menuBg(r, this.t);
    r.overlay(g => {
      if (this.t < 5.5) BZ.drawLeaders(g, r, 30);
      else { BZ.title(g, r, r.H * .25, 4); if (Math.floor(this.t * 2) % 2) E.font.text(g, 'PRESS START', r.W / 2, r.H * .7, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); }
      BZ.attract.overlay(g, r);
    });
  }
};

/* ===== src/36-dev.js ===== */
/* =============================================================================
 * 36-dev: DEV MODE, from the pause menu. A big 10-foot panel over the frozen
 * game with six tabs: TUNE (every BZ.TUNE value as a live slider by group, reset
 * all or a group, keep between visits, pin up to 3), SITUATION, CHEATS,
 * TRIGGERS, WARP and INFO (live numbers, frame step, copy snapshot).
 * L1 / R1 (Q / E) change tabs; up / down move; left / right change a value (hold
 * to speed up); ✕ toggles or runs; △ resets a slider or pins it; ○ closes.
 * The mouse hovers, clicks and drags sliders.
 * ========================================================================== */
BZ.DEV_TABS = ['TUNE', 'SITUATION', 'CHEATS', 'TRIGGERS', 'WARP', 'INFO'];
BZ.dev = {
  on: false, tab: 0, i: 0, scroll: 0, hold: 0, pins: [], pinI: 0, sit: null, msg: '', msgT: 0, step1: false,
  isOpen() { return this.on; },
  open() { this.on = true; this.i = 0; this.scroll = 0; this.sit = null; BZ.game.input.consumeAll(); BZ.bus.emit('dev', { open: true }); },
  close() { if (!this.on) return; this.on = false; BZ.game.input.consumeAll(); BZ.saveTune(); BZ.bus.emit('dev', { open: false }); },
  say(t) { this.msg = t; this.msgT = 2.5; },
  /** the rows of the current tab: { label, value(), left(d), act(), reset(), pin() } */
  rows() {
    const M = BZ.M, g = BZ.game, tab = BZ.DEV_TABS[this.tab], rows = [];
    if (tab === 'TUNE') {
      rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { BZ.resetTune(); this.say('Every value is back to its default.'); } });
      rows.push({ label: 'Keep tuning between visits', value: () => g.settings.keepTune ? 'ON' : 'OFF', act: () => { g.settings.set('keepTune', !g.settings.keepTune); BZ.saveTune(); } });
      let grp = null;
      for (const m of BZ.TUNE_META) {
        const [group, key, label, def, min, max, step] = m;
        if (group !== grp) { grp = group; rows.push({ label: '— ' + group.toUpperCase() + ' —  (✕ resets the group)', head: true, act: () => { BZ.resetTune(group); this.say(group + ' reset.'); } }); }
        rows.push({ label, key, slider: [min, max, step, def], value: () => +TUNE[key].toFixed(3), left: d => { TUNE[key] = clamp(+(TUNE[key] + d * step).toFixed(4), min, max); }, reset: () => { TUNE[key] = def; }, pin: () => { const k = this.pins.indexOf(key); if (k >= 0) this.pins.splice(k, 1); else if (this.pins.length < 3) this.pins.push(key); else this.say('Three pins at most.'); } });
      }
      return rows;
    }
    if (tab === 'SITUATION') {
      if (!M) return [{ label: 'Start a match first (WARP).' }];
      const s = this.sit || (this.sit = { inning: M.inning, half: M.half, outs: M.outs, balls: M.balls, strikes: M.strikes, a: M.teams[0].runs, h: M.teams[1].runs, b1: !!M.bases[0], b2: !!M.bases[1], b3: !!M.bases[2], bat: BZ.offense(M).order, st: Math.round(BZ.staminaOf(M, BZ.defense(M).pitcher)), m0: Math.round(M.teams[0].meter), m1: Math.round(M.teams[1].meter), park: BZ.PARK_ORDER.indexOf(M.parkId), wind: M.park.wind.mph || 0 });
      const num = (label, k, min, max) => ({ label, value: () => s[k], left: d => { s[k] = clamp(s[k] + d, min, max); } });
      const tog = (label, k) => ({ label, value: () => s[k] ? 'ON' : 'OFF', act: () => { s[k] = !s[k]; }, left: () => { s[k] = !s[k]; } });
      rows.push(num('Inning', 'inning', 1, 12), { label: 'Half', value: () => s.half.toUpperCase(), act: () => { s.half = s.half === 'top' ? 'bottom' : 'top'; }, left: () => { s.half = s.half === 'top' ? 'bottom' : 'top'; } },
        num('Outs', 'outs', 0, 2), num('Balls', 'balls', 0, 3), num('Strikes', 'strikes', 0, 2), num('Away runs', 'a', 0, 30), num('Home runs', 'h', 0, 30),
        tog('Runner on first', 'b1'), tog('Runner on second', 'b2'), tog('Runner on third', 'b3'), num('Batter (order)', 'bat', 0, 8), num('Pitcher stamina', 'st', 0, 100),
        num('Away meter', 'm0', 0, 100), num('Home meter', 'm1', 0, 100), { label: 'Park (applies to a new match)', value: () => BZ.get('parks', BZ.PARK_ORDER[s.park]).name, left: d => { s.park = (s.park + d + 6) % 6; } }, num('Wind mph', 'wind', 0, 16),
        { label: 'APPLY', act: () => { this.applySituation(s); } });
      return rows;
    }
    if (tab === 'CHEATS') {
      const c = M ? M.cheats : {};
      const t = (label, k) => ({ label, value: () => c[k] ? 'ON' : 'OFF', act: () => { if (M) c[k] = !c[k]; }, left: () => { if (M) c[k] = !c[k]; } });
      return [t('Perfect contact always', 'perfect'), t('Every pitch a strike', 'allStrikes'), t('Infinite meter', 'infMeter'), t('Infinite turbo', 'infTurbo'), t('Fielders ignore walls (no clip)', 'noclip'), t('The CPU plays my side (autoplay)', 'autoplay'), t('Slow motion x0.25', 'slowmo'), t('Freeze the AI', 'freezeAI'), t('Show the zone always', 'showZone'), t('Show pitch path and timing bar', 'showPath'), t('Show landing markers and AI targets', 'showTargets'), t('Show catch radii', 'showRadii'), t('Sure hands (no errors)', 'surehands')];
    }
    if (tab === 'TRIGGERS') {
      const need = f => () => { if (!M) return this.say('Start a match first.'); f(); this.close(); };
      return [
        { label: 'Force the next pitch: heater, middle', act: need(() => { M.forcePitch = { type: 'heater', target: [0, 17], q: 1 }; }) },
        { label: 'Force the next pitch: curve, low away', act: need(() => { M.forcePitch = { type: 'curve', target: [5, 10], q: 1 }; }) },
        { label: 'Force a home run on the next contact', act: need(() => { M.cheats.homer = true; }) },
        { label: 'Hazard now', act: need(() => BZ.hazards.now(M)) },
        { label: 'Meteor shower (Tranquility)', act: need(() => { if (BZ.hazard && BZ.hazard.shower) BZ.hazard.shower(M); else this.say('Only at Tranquility Dome.'); }) },
        { label: 'Rhubarb!', act: need(() => { if (M.phase === 'atBat' && M.ab) BZ.rhubarb.start(M, 'dev'); }) },
        { label: 'Batzooka cinematic', act: need(() => { BZ.offense(M).meter = 100; BZ.supers.arm(M, BZ.offense(M).side); M.cheats.homer = true; M.forcePitch = { type: 'heater', target: [0, 17], q: 1 }; M.forceContact = 'perfect'; }) },
        { label: 'Replay the last play', act: need(() => { M.cinematic = { kind: 'replay', t: 0, done: false }; BZ.cams.startReplay(M, 6); }) },
        { label: 'End the half-inning', act: need(() => { M.outs = 3; BZ.match.halfOver(M); }) },
        { label: 'Walk-off now', act: need(() => { M.half = 'bottom'; M.inning = Math.max(M.inning, M.innings); M.teams[1].runs = M.teams[0].runs + 1; M.walkoff = true; BZ.bus.emit('walkoff', { team: M.teams[1].id }); BZ.match.final(M); }) },
        { label: 'Win the game', act: need(() => { const s = M.teams.findIndex(T => T.humans.length); const w = s < 0 ? 0 : s; M.teams[w].runs = M.teams[1 - w].runs + 1; BZ.match.final(M); }) },
        { label: 'Lose the game', act: need(() => { const s = M.teams.findIndex(T => T.humans.length); const w = s < 0 ? 1 : 1 - s; M.teams[w].runs = M.teams[1 - w].runs + 1; BZ.match.final(M); }) }
      ];
    }
    if (tab === 'WARP') {
      const go = (scene, data) => () => { this.close(); BZ.attract.on = false; g.go(scene, data); };
      const rows2 = [{ label: 'Title', act: go('title') }, { label: 'Attract mode', act: () => { this.close(); BZ.attract.start(); } }, { label: 'Animation gallery', act: go('gallery') }, { label: 'AI Hub card (mocked)', act: () => { this.close(); BZ.hub.mockCard(); } }, { label: 'Credits', act: go('credits', { ending: false }) }];
      BZ.STOPS.slice(1).forEach((st, i) => { rows2.push({ label: 'Tour: ' + st.title + ' pregame', act: () => { this.close(); BZ.tour.d().tour.stop = i; BZ.tour.d().tour.started = true; BZ.tour.playNext(); } }); rows2.push({ label: 'Tour: ' + st.title + ' game', act: () => { this.close(); BZ.tour.d().tour.stop = i; BZ.tour.startGame(i + 1); } }); rows2.push({ label: 'Tour: ' + st.title + ' postgame (win)', act: () => { this.close(); g.go('story', { steps: BZ.STORY[st.id].win, park: st.park, then: () => g.go('tourMap') }); } }); });
      BZ.LESSONS.forEach((L, i) => rows2.push({ label: 'Lesson ' + (i + 1) + ': ' + L.title, act: () => { this.close(); BZ.training.start(i); } }));
      rows2.push({ label: 'Derby (1 player)', act: go('derby', { players: 1, park: 'kernel' }) });
      BZ.PARK_ORDER.forEach(p => rows2.push({ label: 'Exhibition at ' + BZ.get('parks', p).name, act: () => { this.close(); BZ.startMatch({ mode: 'exhibition', park: p, away: 'krakens', home: BZ.get('parks', p).team === 'krakens' ? 'comets' : BZ.get('parks', p).team, innings: 3, humans: { 0: [], 1: [g.input] }, seed: 9 }); } }));
      rows2.push({ label: 'Unlock everything', act: () => { BZ.tour.unlockAll(); this.say('Everything is unlocked.'); } }, { label: '+5,000 Fan Bucks', act: () => { BZ.tour.addFB(5000); this.say('+5,000 FB.'); } }, { label: 'Reset the save (slots, training, unlocks)', act: () => { BZ.tour.data = BZ.tour.blank(); BZ.tour.setMeta({ training: [], all: false }); try { for (const s of g.saves.list()) g.saves.erase(s.slot); } catch (e) { /* blocked */ } this.say('Save reset.'); } });
      return rows2;
    }
    // INFO
    const b = M ? M.ball : null, lc = M && M.lastContact;
    return [
      { label: 'FPS ' + g.fps + '   scene ' + g.sceneName + (M ? '   phase ' + M.phase + (M.ab ? '/' + M.ab.sub : '') : '') },
      { label: b ? 'Ball ' + b.mode + '  x' + Math.round(b.x - M.park.H.x) + ' y' + Math.round(b.y - M.park.H.y) + ' z' + Math.round(b.z) + '  v' + Math.round(b.vx) + ',' + Math.round(b.vy) + ',' + Math.round(b.vz) : 'No match' },
      { label: lc ? 'Last contact: ' + lc.kind + ' ' + lc.grade + '  timing ' + lc.timingMs + 'ms  dx ' + lc.dx + ' dz ' + lc.dz + '  Q ' + lc.Q + '  EV ' + lc.EV + '  launch ' + lc.launch + '  spray ' + lc.spray : 'No contact yet' },
      { label: 'Seed ' + (M ? M.seed : '-') + '   device ' + g.input.lastDevice + '   glyphs ' + BZ.family() },
      { label: 'Events: ' + BZ.bus.ring.slice(-8).map(e => e.ev).join(' ') },
      { label: 'Engine ' + (E.versionLabel ? E.versionLabel() : E.version) + '   game ' + BZ.version },
      { label: 'FRAME STEP (one 1/120 s step)', act: () => { this.step1 = true; } },
      { label: 'COPY SNAPSHOT (JSON to the clipboard)', act: () => { const s = JSON.stringify(BZ.debug.snapshot()); try { navigator.clipboard.writeText(s); this.say('Snapshot copied.'); } catch (e) { this.say('Clipboard blocked: snapshot in the console.'); } try { console.log(s); } catch (e) { /* no console */ } } }
    ];
  },
  applySituation(s) {
    const M = BZ.M; if (!M) return;
    M.inning = s.inning; M.half = s.half; M.outs = s.outs; M.balls = s.balls; M.strikes = s.strikes; M.teams[0].runs = s.a; M.teams[1].runs = s.h;
    const O = BZ.offense(M); O.order = s.bat % O.lineup.length;
    const pick = k => O.lineup[(O.order + 9 - k) % O.lineup.length];
    M.bases = [s.b1 ? pick(1) : null, s.b2 ? pick(2) : null, s.b3 ? pick(3) : null];
    BZ.match.setupDefense(M); const D = BZ.defense(M); D.stamina[D.pitcher.id] = s.st;
    M.teams[0].meter = s.m0; M.teams[1].meter = s.m1;
    if (M.park.def.wind) M.park.wind = { x: s.wind, y: 0, mph: Math.round(s.wind * 1.4) };
    M.runners = []; M.play = null; M.cinematic = null; BZ.cams.replay = null; BZ.cams.moon = null;
    BZ.match.newAtBat(M); M.balls = s.balls; M.strikes = s.strikes;
    this.say('Situation applied.'); this.close();
  },
  update(dt) {
    const g = BZ.game, P = g.players, rows = this.rows();
    this.msgT = Math.max(0, this.msgT - dt);
    const I = P[0];
    if (I.pressed('r1') || I.pressed('right') && false) { this.tab = (this.tab + 1) % BZ.DEV_TABS.length; this.i = 0; this.scroll = 0; this.sit = null; }
    if (I.pressed('l1')) { this.tab = (this.tab + BZ.DEV_TABS.length - 1) % BZ.DEV_TABS.length; this.i = 0; this.scroll = 0; this.sit = null; }
    if (I.repeat('down', .25, .06)) this.i = Math.min(rows.length - 1, this.i + 1);
    if (I.repeat('up', .25, .06)) this.i = Math.max(0, this.i - 1);
    const row = rows[this.i];
    if (row) {
      const lr = I.down('right') ? 1 : I.down('left') ? -1 : 0;
      if (lr) { this.hold += dt; if (I.pressed('right') || I.pressed('left') || (this.hold > .3 && Math.floor(this.hold * (this.hold > 1.2 ? 30 : 10)) !== Math.floor((this.hold - dt) * (this.hold > 1.2 ? 30 : 10)))) { if (row.left) row.left(lr * (this.hold > 1.2 ? 4 : 1)); } } else this.hold = 0;
      if (I.pressed('south') || I.pressed('confirm')) { if (row.act) row.act(); else if (row.left) row.left(1); BZ.sfx('confirm'); }
      if (I.pressed('north')) { if (row.reset && !I.down('l2')) { row.reset(); this.say(row.label + ' reset.'); } if (row.pin && I.down('l2')) row.pin(); else if (row.pin && !row.reset) row.pin(); }
      if (I.pressed('west') && row.pin) row.pin();
    }
    if (I.pressed('east') || I.pressed('cancel')) { this.close(); return; }
    // the mouse: hover moves, click acts, drag a slider
    if (I.lastDevice === 'mouse' && this.rects) {
      const p = I.pointer(), c = I.clicked();
      this.rects.forEach(([x, y, w, h, k]) => { if (p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) this.i = k; });
      const r0 = rows[this.i];
      if (p && I.down('south') && r0 && r0.slider && this.slider && p[1] >= this.slider[1] - 3 && p[1] <= this.slider[1] + 9 && this.slider[4] === this.i) { const [x, , w] = this.slider, [min, max, step] = r0.slider, u = clamp((p[0] - x) / w, 0, 1); TUNE[r0.key] = clamp(Math.round((min + u * (max - min)) / step) * step, min, max); }
      else if (c && r0 && r0.act) r0.act();
      for (let k = 0; k < BZ.DEV_TABS.length; k++) { const tr = this.tabRects && this.tabRects[k]; if (c && tr && c[0] >= tr[0] && c[0] < tr[0] + tr[2] && c[1] >= tr[1] && c[1] < tr[1] + tr[3]) { this.tab = k; this.i = 0; this.scroll = 0; } }
    }
    if (this.step1 && BZ.M) { this.step1 = false; BZ.match.step(BZ.M, 1 / 120); }
  },
  /** pinned sliders while playing: Create + D-pad (keyboard [ ] adjust, \ picks the next pin) */
  pinInput(dt) {
    if (!this.pins.length) return;
    const I = BZ.game.input, key = this.pins[this.pinI % this.pins.length], m = BZ.tuneMeta(key); if (!m) return;
    const create = I.down('create');
    if (I.pressed('pinNext') || (create && I.pressed('down'))) this.pinI = (this.pinI + 1) % this.pins.length;
    if (I.repeat('pinUp') || (create && I.repeat('right'))) TUNE[key] = clamp(+(TUNE[key] + m[6]).toFixed(4), m[4], m[5]);
    if (I.repeat('pinDown') || (create && I.repeat('left'))) TUNE[key] = clamp(+(TUNE[key] - m[6]).toFixed(4), m[4], m[5]);
    if (create) { I.suppress && I.suppress('left'); I.suppress && I.suppress('right'); }
  },
  drawPins(g, r) {
    if (!this.pins.length || this.on) return;
    const w = 90 * this.pins.length, x = Math.round(r.W / 2 - w / 2);
    E.ui.box(g, x, 2, w, 12, { bg: '#0a0a14', border: '#5affd0', alpha: .8 });
    this.pins.forEach((k, i) => { const m = BZ.tuneMeta(k); E.font.text(g, (i === this.pinI % this.pins.length ? '▸' : '') + m[2].slice(0, 10) + ' ' + (+TUNE[k].toFixed(2)), x + 4 + i * 90, 4, i === this.pinI % this.pins.length ? '#5affd0' : '#ffffff'); });
  },
  draw(r) {
    const rows = this.rows();
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(W - 16, 600), x = Math.round(W / 2 - w / 2), y = 6, h = H - 12;
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#000000'));
      E.ui.box(g, x, y, w, h, { bg: ['#101830', '#05080f'], border: '#5affd0', alpha: .97 });
      E.font.title(g, 'DEV MODE', x + 8, y + 5, { scale: 2, colors: ['#ffffff', '#5affd0'] });
      // tabs
      this.tabRects = [];
      let tx = x + 104;
      BZ.DEV_TABS.forEach((t, k) => { const tw = E.font.width(t) + 10; E.ui.box(g, tx, y + 6, tw, 14, { bg: k === this.tab ? ['#5affd0', '#1a8a6a'] : ['#2a3460', '#141a34'], border: '#5a6aa0' }); E.font.text(g, t, tx + 5, y + 9, k === this.tab ? '#001a10' : '#ffffff'); this.tabRects.push([tx, y + 6, tw, 14]); tx += tw + 3; });
      const top = y + 28, rh = 13, per = Math.floor((h - 60) / rh);
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + per) this.scroll = this.i - per + 1;
      this.rects = [];
      rows.slice(this.scroll, this.scroll + per).forEach((row, k) => {
        const idx = this.scroll + k, yy = top + k * rh, sel = idx === this.i;
        if (sel) E.ui.box(g, x + 4, yy - 2, w - 8, rh, { bg: '#2a4a6a', border: '#5affd0' });
        this.rects.push([x + 4, yy - 2, w - 8, rh, idx]);
        E.font.text(g, (row.key && this.pins.includes(row.key) ? '• ' : '') + row.label, x + 10, yy, row.head ? '#ffd040' : '#ffffff');
        if (row.slider) {
          const [min, max, , def] = row.slider, v = TUNE[row.key], sx = x + w * .55, sw = w * .3, u = (v - min) / (max - min), du = (def - min) / (max - min);
          px.rect(g, sx, yy + 3, sw, 2, '#3a4a6a'); px.rect(g, sx + du * sw, yy + 1, 1, 6, '#8a8aa8'); px.rect(g, sx, yy + 3, Math.round(sw * u), 2, v === def ? '#5affd0' : '#ffd040'); px.disc(g, sx + sw * u, yy + 4, 3, sel ? '#ffffff' : '#c8d0e0');
          E.font.text(g, String(row.value()), x + w - 10, yy, v === def ? '#a8b8e8' : '#ffd040', { align: 'right' });
          if (sel) this.slider = [sx, yy + 1, sw, 0, idx];
        } else if (row.value) E.font.text(g, String(row.value()), x + w - 10, yy, '#5affd0', { align: 'right' });
      });
      if (this.msgT > 0) E.font.text(g, this.msg, W / 2, y + h - 30, '#ffd040', { align: 'center' });
      const I = BZ.game.input;
      BZ.drawPrompts(g, I, [['l1', 'TAB'], ['r1', 'TAB'], ['left', 'CHANGE'], ['south', 'TOGGLE'], ['north', 'RESET'], ['west', 'PIN'], ['east', 'CLOSE']], W / 2, y + h - 16, { align: 'center', size: 10 });
    });
  }
};
BZ.saveTune = () => { try { const g = BZ.game; if (g && g.settings && g.settings.keepTune) E.store.set('bz:tune', BZ.TUNE); else E.store.set('bz:tune', null); } catch (e) { /* storage blocked */ } };
BZ.loadTune = () => { try { const t = E.store.get('bz:tune', null); if (t && BZ.game.settings.keepTune) for (const k in t) if (k in BZ.TUNE_DEFAULTS) TUNE[k] = t[k]; } catch (e) { /* storage blocked */ } };

/* ===== src/37-scene-match.js ===== */
/* =============================================================================
 * 37-scene-match: the match scene. It runs the simulation (30-match) in exact
 * steps, then the cosmetics: frames, rigs, cameras, the HUD, commentary, the
 * crowd; the Moonshot Cam and the home-run trot, replays, the boss's short
 * circuit, the Tour's scripted moments, and the hand-off to the results.
 * ========================================================================== */

BZ.matchData = null;
BZ.startMatch = (data, o = {}) => { BZ.matchData = data; BZ.game.go('match', data, o); };
BZ.scenes.match = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter(data) {
    const g = BZ.game, d = data || BZ.matchData || {};
    BZ.clearLater(); BZ.hud.clear(); BZ.talk.reset();
    Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null, ring: [], zoomI: 3, cut: 0 });
    BZ.bot.sides = {};
    const M = BZ.newMatch(d);
    this.M = M; this.data = d; this.finalT = 0; this.trot = null;
    BZ.talk.install(M); BZ.crowd.install(M);
    for (const [side, o] of Object.entries(d.bots || {})) BZ.bot.on(+side, o);
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    on('homer', ev => {
      const D = BZ.defense(M);
      if (M.boss && D.id === 'mechanicals' && D.pitcher.id === D.def.ace.id) { D.shortCircuit = 2; BZ.bus.emit('shortCircuit', {}); BZ.talk.say('short_circuit', {}, 3); }
      if (M.fast) return;
      M.cinematic = { kind: 'moonshot', t: 0, done: false };
      const runners = M.runners.filter(r => r.state === 'scored').map(r => ({ id: r.player.id, p: r.start, batter: r.isBatter }));
      BZ.cams.startMoonshot(M, () => { this.startTrot(M, runners); });
    });
    on('cinematicDone', () => {});
    on('playEnd', ev => { if (M.fast) return; const big = M.play && (M.play.bowl || M.play.outs.length >= 2 || (M.play.dpSaid) || M.events.slice(-30).some(e => e === 'catch' && false)); this.maybeReplay(M, big || this.bigCatch); this.bigCatch = false; });
    on('catch', ev => { if (ev.fly && (ev.dive || ev.wall)) this.bigCatch = true; });
    on('rhubarbStart', () => {});
    on('gameEnd', ev => { this.finalT = 0; const hw = ev.winner === 1; BZ.sting(ev.winner >= 0 && M.teams[ev.winner].humans.length ? 'victory' : M.teams.some(T => T.humans.length) ? 'defeat' : 'victory'); void hw; });
    if (d.onInstall) d.onInstall(M);
    // the park: light, weather, music
    const P = M.park, pd = P.def;
    g.lights.enabled = !!pd.night || pd.ambient < .9; g.lights.ambient = pd.ambient || .8; if (pd.lightTint) g.lights.tint = pd.lightTint;
    g.weather = pd.weather && BZ.cosmetic && !(g.settings && g.settings.motion) ? Object.assign({}, pd.weather) : null;
    BZ.music(pd.music);
    g.setView(BZ.VIEWS[BZ.fieldView()] || 'broadcast'); g.setZoom(1);
    BZ.wheelOwned = true;
    BZ.cams.focus = { x: P.H.x, y: P.H.y - 200, z: 0 }; g.focus(P.H.x, P.H.y - 200, 0); g.cam.snap = true;
    if (BZ.dev) BZ.dev.close && BZ.dev.close();
    BZ.bus.emit('scene', { scene: 'match', mode: M.mode });
  },
  exit() { BZ.endMatch(this.M); BZ.wheelOwned = false; BZ.game.weather = null; BZ.game.timeScale = TUNE.gameSpeed; BZ.cams.replay = null; BZ.cams.moon = null; for (const s in BZ.bot.sides) { const T = this.M && this.M.teams[s]; if (T && T.humans[0]) BZ.bot.releaseAll(T.humans[0].input); } },
  back() { return false; },
  maybeReplay(M, big) {
    const set = (BZ.game.settings && BZ.game.settings.replays) || 'big';
    if (set === 'off' || (set === 'big' && !big) || M.attract || M.mode === 'derby') return;
    M.cinematic = { kind: 'replay', t: 0, done: false };
    BZ.cams.startReplay(M, 4.5);
  },
  startTrot(M, runners) {
    // the batter jogs the bases at double speed, high-fiving the coaches (skippable)
    this.trot = { t: 0, runners: runners.length ? runners : [{ id: M.batter.id, p: 0, batter: true }] };
    BZ.cams.mode = 'field'; BZ.cams.cut = .3; BZ.cams.zoomI = 1;
  },
  trotStep(M, dt) {
    const T = this.trot; T.t += dt;
    let all = true;
    for (const r of T.runners) { r.p = Math.min(4, r.p + dt * 146 * 2 / 300); if (r.p < 4) all = false; }
    const skip = BZ.match.anyAdvance(M) && T.t > .3;
    if (all || skip || T.t > 6) { this.trot = null; if (M.cinematic) M.cinematic.done = true; const big = (M.lastBatted && M.lastBatted.zooka) || (M.play && M.play.hr && M.play.hr.dist > 420); if (big) this.maybeReplay(M, true); }
  },
  update(dt) {
    const g = BZ.game, M = this.M;
    if (!M) return;
    BZ.inputTick(g, dt);
    if (M.attract && BZ.attract.check(g)) return;
    if (BZ.dev && BZ.dev.isOpen()) { BZ.dev.update(dt); return; }
    if (BZ.dev) BZ.dev.pinInput(dt);
    if (M.cheats.slowmo) g.timeScale = .25 * TUNE.gameSpeed; else if (!BZ.cams.moon) g.timeScale = TUNE.gameSpeed;
    if (M.cheats.autoplay) for (const T of M.teams) if (T.humans.length && !BZ.bot.active(T.side)) BZ.bot.on(T.side, { level: 'allstar' });
    if (BZ.talk.cutscene) { BZ.talk.step(dt); this.cosmetics(M, dt, true); return; }
    // the replay: frames at half speed; ✕ skips
    if (BZ.cams.replay) {
      const R = BZ.cams.replay; R.acc += dt * .5 * 60; R.i = Math.floor(R.acc);
      if (R.i >= R.frames.length - 1 || (BZ.match.anyAdvance(M) && R.acc > 10)) { BZ.cams.replay = null; if (M.cinematic) M.cinematic.done = true; g.setView(BZ.VIEWS[BZ.fieldView()]); }
      else { const fr = R.frames[R.i]; BZ.cams.animate(M, fr, dt * .5); }
      this.cosmetics(M, dt, true); return;
    }
    if (BZ.cams.moon) {
      BZ.cams.moonStep(M, dt);
      if (BZ.match.anyAdvance(M) && BZ.cams.moon && BZ.cams.moon.t > .4) { const cb = BZ.cams.moon.then; BZ.cams.moon = null; g.timeScale = TUNE.gameSpeed; if (cb) cb(); }
      this.cosmetics(M, dt, true); return;
    }
    if (this.trot) { this.trotStep(M, dt); this.cosmetics(M, dt, false); return; }
    BZ.bot.update(M, dt);
    BZ.match.step(M, dt);
    if (M.cinematic && M.cinematic.done) M.cinematic = null;
    if (M.phase === 'final') {
      this.finalT += dt;
      if (this.finalT > (M.attract ? 1.5 : 3.2) || (BZ.match.anyAdvance(M) && this.finalT > .8)) { if (this.data.onFinal) this.data.onFinal(M); else BZ.game.go('results', { M, data: this.data }); return; }
    }
    if (this.data.onStep) this.data.onStep(M, dt);
    this.cosmetics(M, dt, false);
  },
  cosmetics(M, dt, paused) {
    const fr = BZ.cams.frame(M);
    if (this.trot) for (const r of this.trot.runners) { const p = BZ.runnerPos(M, r.p), q = BZ.runnerPos(M, Math.min(4, r.p + .02)); fr.runners.push({ id: r.id, x: p.x, y: p.y, facing: Math.atan2(q.y - p.y, q.x - p.x), moving: r.p < 4, cheer: r.p >= 4 }); }
    if (!paused) BZ.cams.record(M, fr, dt);
    if (!BZ.cams.replay) BZ.cams.animate(M, fr, dt);
    BZ.cams.live = fr; this.fr = fr;
    BZ.cams.update(M, dt);
    if (BZ.cams.mode === 'field' && !BZ.cams.replay && !BZ.cams.moon && this.trot) { const r0 = this.trot.runners.find(r => r.batter) || this.trot.runners[0]; if (r0) { const p = BZ.runnerPos(M, r0.p); BZ.game.focus(p.x, p.y, 0); } }
    if (BZ.cams.replay && BZ.game.view.id !== 'iso') { BZ.game.setView('iso'); BZ.game.setZoom(.62); }
    if (BZ.cams.replay) { const R = BZ.cams.replay, f = R.frames[Math.min(R.i, R.frames.length - 1)], b = f.ball; BZ.game.focus(b.mode === 'none' || b.mode === 'held' ? M.park.H.x : b.x, b.mode === 'none' || b.mode === 'held' ? M.park.H.y - 200 : b.y, 0); }
    BZ.hud.step(dt); BZ.talk.step(dt); BZ.crowd.step(M, dt); BZ.tickLater(dt);
  },
  draw(r) {
    const M = this.M; if (!M) return;
    const fr = this.fr || BZ.cams.frame(M);
    if (BZ.cams.replay) { const R = BZ.cams.replay; BZ.cams.drawField(r, M, R.frames[Math.min(R.i, R.frames.length - 1)]); }
    else if (BZ.cams.moon) BZ.cams.drawMoon(r, M);
    else if (BZ.cams.mode === 'plate' && M.phase === 'atBat') BZ.cams.drawPlate(r, M, fr);
    else BZ.cams.drawField(r, M, fr);
    if (M.phase === 'rhubarb' && M.rhubarb && !BZ.cams.replay) BZ.rhubarb.draw(r, M, r.game.time);
    BZ.hud.draw(r, M, fr);
    r.overlay(g => {
      BZ.talk.drawRadio(g, r); BZ.talk.drawCut(g, r);
      if (M.phase === 'rhubarb' && M.rhubarb) BZ.rhubarb.hud(g, r, M);
      if (M.lesson) BZ.training.hud(g, r, M);
      if (M.phase === 'final' && M.result) {
        const w = M.result.winner, T = w >= 0 ? M.teams[w] : null;
        E.font.title(g, 'FINAL', r.W / 2, r.H * .3, { scale: 4, align: 'center', colors: ['#ffffff', '#ffd040', '#ff7a1a'], depth: 3 });
        if (T) E.font.text(g, T.def.name.toUpperCase() + ' WIN!', r.W / 2, r.H * .3 + 40, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      }
      if (M.attract && BZ.attract) BZ.attract.overlay(g, r);
    });
    if (BZ.dev && BZ.dev.isOpen()) BZ.dev.draw(r);
  }
};

/* ===== src/38-teamselect.js ===== */
/* =============================================================================
 * 38-teamselect: Exhibition setup. Two big team cards (away left, home right)
 * with the captain's rig turning, three stat stars and the park; rows for the
 * park, innings and difficulty; and the join row: Start on a free pad (or 2 on
 * the keyboard) joins, each player moves their card to a side (left away, right
 * home, middle CPU-only... a side with no humans is the CPU).
 * ========================================================================== */
BZ.scenes.teamSelect = {
  enter() {
    const g = BZ.game, unlocked = BZ.tour ? BZ.tour.unlocked() : { teams: [], parks: [] };
    this.teams = BZ.ids('teams').filter(id => !BZ.get('teams', id).hidden && (!BZ.get('teams', id).boss || unlocked.all));
    this.parks = BZ.PARK_ORDER.filter(id => !BZ.get('parks', id).locked || unlocked.all);
    this.away = this.teams.indexOf('krakens'); this.home = this.teams.indexOf('comets');
    this.park = 0; this.inn = [1, 3, 5, 9].indexOf(g.settings.innings || 3); if (this.inn < 0) this.inn = 1;
    this.diff = BZ.LEVEL_IDS.indexOf(g.settings.difficulty || 'pro');
    this.row = 0; this.t = 0;
    this.slots = [{ input: g.input, side: 0 }];   // players: their input and side (0 away, 1 home)
    g.allowJoin({ max: 4, onJoin: (inp) => { this.slots.push({ input: inp, side: this.slots.length % 2 }); BZ.sfx('coin'); } });
    BZ.music('menu'); BZ.idle = 0;
  },
  exit() { BZ.game.allowJoin(false); },
  rows() { return ['away', 'home', 'park', 'innings', 'difficulty', 'players', 'play']; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    if (BZ.idle > 10 && this.slots.length === 1 && !BZ.hubActive) { BZ.attract.start(); return; }
    const I = g.input, rows = this.rows();
    // each joined player moves their own card with left / right; player 1 runs the menu
    for (const s of this.slots.slice(1)) { if (s.input.pressed('left')) { s.side = 0; BZ.sfx('select'); } if (s.input.pressed('right')) { s.side = 1; BZ.sfx('select'); } if (s.input.pressed('cancel')) { g.removePlayer(s.input); this.slots = this.slots.filter(q => q !== s); BZ.sfx('cancel'); } }
    if (I.repeat('down')) { this.row = (this.row + 1) % rows.length; BZ.sfx('select'); }
    if (I.repeat('up')) { this.row = (this.row + rows.length - 1) % rows.length; BZ.sfx('select'); }
    const lr = I.repeat('right') ? 1 : I.repeat('left') ? -1 : 0, r = rows[this.row];
    if (lr) {
      BZ.sfx('select');
      if (r === 'away') this.away = (this.away + lr + this.teams.length) % this.teams.length;
      if (r === 'home') this.home = (this.home + lr + this.teams.length) % this.teams.length;
      if (r === 'park') this.park = (this.park + lr + this.parks.length) % this.parks.length;
      if (r === 'innings') this.inn = (this.inn + lr + 4) % 4;
      if (r === 'difficulty') this.diff = (this.diff + lr + 4) % 4;
      if (r === 'players') this.slots[0].side = lr > 0 ? 1 : 0;
    }
    // the mouse: hover picks the row, click on the arrows changes it, click PLAY plays
    if (I.lastDevice === 'mouse' && this.rects && !BZ.touchOnly) {
      const p = I.pointer(), c = I.clicked();
      this.rects.forEach((rc, k) => { if (p && p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.row = k; });
      if (c) this.rects.forEach((rc, k) => { if (c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]) { if (rows[k] === 'play') this.play(); else { const dir = c[0] > rc[0] + rc[2] / 2 ? 1 : -1; this.row = k; this.click = dir; } } });
      if (this.click) { const d = this.click; this.click = 0; const rr = rows[this.row]; if (rr === 'away') this.away = (this.away + d + this.teams.length) % this.teams.length; if (rr === 'home') this.home = (this.home + d + this.teams.length) % this.teams.length; if (rr === 'park') this.park = (this.park + d + this.parks.length) % this.parks.length; if (rr === 'innings') this.inn = (this.inn + d + 4) % 4; if (rr === 'difficulty') this.diff = (this.diff + d + 4) % 4; if (rr === 'players') this.slots[0].side = d > 0 ? 1 : 0; }
    }
    if ((I.pressed('confirm') || I.pressed('south')) && !(I.held && I.held.has && I.held.has('Mouse0'))) { if (r === 'play' || I.pressed('start')) this.play(); else { this.row = rows.length - 1; BZ.sfx('select'); } }
    if (I.pressed('start') && r !== 'play') this.play();
    if (I.pressed('cancel') || I.pressed('east')) { BZ.sfx('cancel'); g.go('title'); }
  },
  play() {
    const g = BZ.game, humans = { 0: [], 1: [] };
    for (const s of this.slots) humans[s.side].push(s.input);
    g.settings.set('innings', [1, 3, 5, 9][this.inn]); g.settings.set('difficulty', BZ.LEVEL_IDS[this.diff]);
    const data = { mode: 'exhibition', away: this.teams[this.away], home: this.teams[this.home], park: this.parks[this.park], innings: [1, 3, 5, 9][this.inn], difficulty: BZ.LEVEL_IDS[this.diff], cpuLevel: BZ.LEVEL_IDS[this.diff], humans, seed: (Date.now() & 0xfffff), mercy: g.settings.mercy !== false };
    BZ.sfx('confirm');
    BZ.startMatch(data);
  },
  draw(r) {
    BZ.menuBg(r, this.t);
    const g0 = BZ.game, rows = this.rows();
    r.overlay(g => {
      E.font.title(g, 'EXHIBITION', r.W / 2, 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
      const cw = Math.min(150, (r.W - 30) / 2), cy = 24, ch = 78;
      [this.away, this.home].forEach((ti, side) => {
        const T = BZ.get('teams', this.teams[ti]), x = Math.round(r.W / 2 + (side ? 6 : -6 - cw)), sel = this.row === side;
        E.ui.box(g, x, cy, cw, ch, { bg: [T.colors[0], E.shade(T.colors[0], -.5)], border: sel ? '#fff6c0' : '#5a6aa0' });
        E.font.text(g, side ? 'HOME' : 'AWAY', x + 6, cy + 4, '#ffffff', { shadow: '#000' });
        E.font.text(g, T.nick, x + cw / 2, cy + 16, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
        E.font.text(g, T.city.toUpperCase(), x + cw / 2, cy + 31, '#e0e8ff', { align: 'center', shadow: '#000' });
        const rig = BZ.rigFor(T.captain, 'bench'); if (rig && BZ.cosmetic) { rig.facing = this.t * 1.5; rig.drawPortrait(g, x + 6, cy + 42, 32, { zoom: 1.8, turn: Math.sin(this.t) * .8, frame: true }); }
        ['POWER', 'SPEED', 'PITCH'].forEach((s, k) => { E.font.text(g, s, x + 46, cy + 43 + k * 10, '#ffffff', { shadow: '#000' }); E.font.text(g, '★'.repeat(T.stars[k]) + '·'.repeat(5 - T.stars[k]), x + 86, cy + 43 + k * 10, '#ffd040', { shadow: '#000' }); });
        if (sel) { E.font.text(g, '◂', x - 7, cy + ch / 2, '#fff6c0'); E.font.text(g, '▸', x + cw + 3, cy + ch / 2, '#fff6c0'); }
      });
      this.rects = [[r.W / 2 - 6 - cw, cy, cw, ch], [r.W / 2 + 6, cy, cw, ch]];
      const opts = [['PARK', BZ.get('parks', this.parks[this.park]).name.toUpperCase()], ['INNINGS', String([1, 3, 5, 9][this.inn])], ['DIFFICULTY', BZ.LEVELS[BZ.LEVEL_IDS[this.diff]].name]];
      let y = cy + ch + 5;
      opts.forEach(([k, v], i) => { const sel = this.row === i + 2, w = 220, x = Math.round(r.W / 2 - w / 2); E.ui.box(g, x, y, w, 16, { bg: sel ? ['#ffb030', '#c8501a'] : ['#2a3460', '#141a34'], border: sel ? '#fff6c0' : '#5a6aa0' }); E.font.text(g, k, x + 6, y + 4, sel ? '#1a0a00' : '#a8b8e8'); E.font.text(g, '◂ ' + v + ' ▸', x + w - 6, y + 4, sel ? '#1a0a00' : '#ffffff', { align: 'right' }); this.rects.push([x, y, w, 16]); y += 18; });
      // the players: a card each in their color, on their side
      const sel = this.row === 5, w = 152, x = Math.round(r.W / 2 - 110);
      E.ui.box(g, x, y, w, 24, { bg: sel ? ['#3a2a60', '#1a1030'] : ['#1a2040', '#0a0e1c'], border: sel ? '#fff6c0' : '#5a6aa0' }); this.rects.push([x, y, w, 24]);
      E.font.text(g, 'AWAY', x + 6, y + 8, '#a8b8e8'); E.font.text(g, 'HOME', x + w - 6, y + 8, '#a8b8e8', { align: 'right' });
      this.slots.forEach((s, k) => { const sx = s.side ? x + w / 2 + 12 + (k >> 1) * 22 : x + w / 2 - 34 - (k >> 1) * 22; E.ui.box(g, sx, y + 4, 20, 16, { bg: E.PLAYER_COLORS[(s.input.player - 1) % 4], border: '#ffffff' }); E.font.text(g, 'P' + s.input.player, sx + 10, y + 8, '#ffffff', { align: 'center', shadow: '#000' }); });
      const ps = this.row === 6, bx = Math.round(r.W / 2 + 46); E.ui.box(g, bx, y, 64, 24, { bg: ps ? ['#ffb030', '#c8501a'] : ['#2a6a3a', '#143a1a'], border: '#fff6c0' }); E.font.text(g, 'PLAY BALL!', bx + 32, y + 8, ps ? '#1a0a00' : '#ffffff', { align: 'center' }); this.rects.push([bx, y, 64, 24]);
      y += 27; E.font.text(g, 'More players: Start on a controller, or 2 on the keyboard', r.W / 2, y, '#8a90b8', { align: 'center' });
      BZ.legend(g, r, [['up', 'ROW'], ['left', 'CHANGE'], ['south', 'PLAY'], ['east', 'BACK']]);
      void g0; void rows;
    });
  }
};

/* ===== src/40-hub.js ===== */
/* =============================================================================
 * 40-hub: AI Hub sessions (Session Protocol v1, client 1.4.0): an online Derby
 * round in GHOST mode for 1-4 players. Everyone bats against the same pitch
 * sequence (AIHub.rng('pitches')) and sees the others as ghosts: holograms in the
 * on-deck circles that swing when they swing, and comets in their seat colors
 * where their home runs fly. Ghosts never change your round.
 * In a session: no title, menus or prompts before the round; our own card; ready()
 * with no key press; the round on the hub's clock; progress every second; one
 * result; time-up reports at once; at the end no input, no sound, ROUND OVER.
 * ========================================================================== */
BZ.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
BZ.hubActive = false;
BZ.hub = {
  H: null, info: null, phase: 'none', card: null, answered: null, reported: false, ended: false, sentT: 0, progT: 0, msgs: 0, mock: false,
  /** at boot: is this page in a session? */
  detect() { const H = typeof AIHub !== 'undefined' ? AIHub : (typeof window !== 'undefined' ? window.AIHub : null); BZ.hubActive = !!(H && H.active); this.H = H; return BZ.hubActive; },
  /** connect, build the round, ready() once, then show the card */
  async begin() {
    const H = this.H, g = BZ.game;
    this.phase = 'loading';
    let info = null;
    try { info = await H.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { BZ.hubActive = false; g.o.menu.quit = 'title'; g.go('title'); return; }
    this.info = info;
    H.on('card', c => { this.card = c; });
    H.on('start', () => { this.phase = 'countdown'; BZ.sfx('ding', { vary: 0 }); });
    H.on('message', (d, from) => this.message(d, from));
    H.on('leave', d => { if (this.D && this.D.ghosts[d.id]) delete this.D.ghosts[d.id]; });
    H.on('time-up', () => this.report());
    H.on('end', d => this.end(d));
    // the round: the MegaDome at night, the pitches from the shared stream
    const deal = H.rng('pitches'), park = H.rng('park');
    void park;
    const me = info.me, players = info.players || [], mine = players.find(p => p.id === me) || { id: me, name: 'YOU', color: BZ.SEAT_COLORS[0] };
    this.me = mine;
    this.D = new BZ.Derby({ park: 'megadome', hub: true, deal, title: 'ONLINE DERBY', players: [{ name: String(mine.name || 'YOU').slice(0, 12).toUpperCase(), input: g.input, color: mine.color || BZ.SEAT_COLORS[0], batter: BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][(me | 0) % 4]] }], seed: info.seed || 1, clock: () => this.clockLeft() / 1000, send: m => this.send(m, true) });
    for (const p of players) if (p.id !== me) this.D.ghosts[p.id] = { name: String(p.name || 'P' + (p.id + 1)).slice(0, 10).toUpperCase(), color: p.color || BZ.SEAT_COLORS[p.id % 4], swingT: 0, comets: [], score: 0, outs: 0 };
    BZ.M = this.D.M;
    H.ready();
    this.phase = 'card';
    g.go('hubDerby', null, { fade: 0 });
  },
  limit() { const L = this.info && this.info.limitMs; return L ? Math.min(120000, L - 5000) : 120000; },
  clockLeft() { const t = this.H.time(); return Math.max(0, this.limit() - (isFinite(t) ? Math.max(0, t) : 0)); },
  send(data, reliable) { if (this.ended || !this.H || !this.H.send) return; try { this.H.send(data, { reliable }); this.msgs++; } catch (e) { /* dropped */ } },
  message(d, from) {
    if (!this.D || this.ended || !d || typeof d !== 'object') return;
    const gh = this.D.ghosts[from]; if (!gh) return;   // unknown ids are ignored
    if (d.t === 'g') { gh.score = d.sc | 0; gh.outs = d.o | 0; if (d.s) gh.swingT = .3; }
    else if (d.t === 'hit') this.D.ghostHit(from, d);
    else if (d.t === 'done') { gh.score = d.score | 0; gh.done = true; }
  },
  stats() { const P = this.D.P; return { score: P.score, hrs: P.hrs, outs: P.outs, longest: P.longest }; },
  progress() { const s = this.stats(); try { this.H.progress({ score: s.score, label: BZ.fmt(s.score) + ' ft · ' + s.hrs + ' HR · ' + s.outs + ' outs' }); } catch (e) { /* hub gone */ } },
  report() {
    if (this.reported || !this.D) return;
    this.reported = true;
    const s = this.stats();
    try { this.H.result({ score: s.score, stats: { 'Home runs': s.hrs, Longest: s.longest + ' ft', Outs: s.outs }, awards: s.longest ? [{ title: 'Moonshot', detail: s.longest + ' ft' }] : [] }); } catch (e) { /* hub gone */ }
    this.send({ t: 'done', score: s.score }, true);
  },
  end(d) {
    this.ended = true; this.phase = 'over'; this.endInfo = d || {};
    try { BZ.game.audio.music(null); BZ.game.audio.mute(true); } catch (e) { /* no sound */ }
  },
  /** the dev warp and the tests: a mock hub that answers like the real one, offline */
  mockCard() {
    const t0 = { v: 0 }, handlers = {};
    const mock = { active: true, mock: true, seeded: true, connect: async () => ({ me: 0, players: [{ id: 0, name: 'YOU', color: BZ.SEAT_COLORS[0] }, { id: 1, name: 'GHOST', color: BZ.SEAT_COLORS[1] }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 60000, seed: 7 }), ready() { mock.isReady = true; }, answer(a) { mock.answer = a; }, on(e, f) { handlers[e] = f; }, emit(e, ...a) { if (handlers[e]) handlers[e](...a); }, time: () => t0.v, rng: label => E.rng(BZ.hash(label)), progress(p) { mock.lastProgress = p; mock.progressN = (mock.progressN || 0) + 1; }, result(r) { mock.results = (mock.results || 0) + 1; mock.lastResult = r; }, send(d) { mock.sent = (mock.sent || 0) + 1; } };
    t0.v = -Infinity; mock.clock = t0;
    this.H = mock; this.mock = true; BZ.hubActive = true; BZ.game.o.menu.quit = false;
    this.reported = false; this.ended = false;
    return this.begin().then(() => mock);
  }
};
/** the hub scene: the card, the countdown, the round, the end */
BZ.scenes.hubDerby = {
  pausable: true, view: 'broadcast', camera: { zoom: false, wheel: false },
  enter() { this.t = 0; BZ.hud.clear(); BZ.talk.reset(); BZ.music('hubcard'); BZ.wheelOwned = true; const pd = BZ.get('parks', 'megadome'); BZ.game.lights.enabled = true; BZ.game.lights.ambient = pd.ambient; BZ.game.weather = null; Object.assign(BZ.cams, { mode: 'plate', replay: null, moon: null }); },
  back() { return true; },   // the back gesture is the hub's
  update(dt) {
    const g = BZ.game, h = BZ.hub, I = g.input, D = h.D; this.t += dt;
    if (!D) return;
    if (h.ended) return;   // no input, nothing sent
    if (I.pressed('options') && !I.down('create')) g.pause();
    if (h.phase === 'card') {
      // the card: Ready (✕, Enter, click READY) and More time (△, M, click MORE TIME)
      const c = I.clicked && I.clicked();
      const hit = (b) => c && b && c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3];
      if (I.pressed('confirm') || I.pressed('south') || hit(this.readyBtn)) { h.H.answer('ready'); h.answered = 'ready'; BZ.sfx('confirm', { vary: 0 }); }
      if (I.pressed('north') || I.pressed('more') || hit(this.moreBtn)) { h.H.answer('more'); h.answered = h.answered === 'more' ? null : 'more'; BZ.sfx('select', { vary: 0 }); }
      return;
    }
    const tm = h.H.time();
    if (h.phase === 'countdown') { if (tm >= 0) { h.phase = 'play'; BZ.music('derby'); D.state = 'pitch'; D.newPitch(); } return; }
    if (h.phase === 'play') {
      D.update(dt, I);
      BZ.hud.step(dt); BZ.crowd.step(D.M, dt); BZ.tickLater(dt);
      // the ghost of this player, 10 times a second
      h.sentT += dt; if (h.sentT >= .1) { h.sentT = 0; const S = D.M.ab; h.send({ t: 'g', area: 'derby', s: S && S.swing ? 1 : 0, rx: +D.M.reticle.x.toFixed(1), rz: +D.M.reticle.z.toFixed(1), sc: D.P.score, o: D.P.outs }, false); }
      h.progT += dt; if (h.progT >= 1) { h.progT = 0; h.progress(); }
      if (D.state === 'over' || h.clockLeft() <= 0 || D.P.outs >= 10) { if (D.state !== 'over') D.state = 'over'; h.progress(); h.report(); h.phase = 'done'; }
    }
  },
  draw(r) {
    const h = BZ.hub, D = h.D; if (!D) { BZ.menuBg(r, this.t); return; }
    if (h.phase === 'card' || h.phase === 'loading') { this.drawCard(r); return; }
    D.draw(r);
    BZ.hud.draw(r, D.M, null);
    r.overlay(g => {
      if (h.phase === 'countdown') { const left = Math.ceil(-h.H.time() / 1000); E.font.title(g, left > 0 ? String(left) : 'GO!', r.W / 2, r.H * .35, { scale: 6, align: 'center', colors: ['#ffffff', '#ffd040', '#ff5a1a'], depth: 3 }); }
      // the standings, the ghosts' scores beside ours
      const list = [{ name: D.P.name, score: D.P.score, color: D.P.color }].concat(Object.values(D.ghosts).map(gh => ({ name: gh.name, score: gh.score, color: gh.color }))).sort((a, b) => b.score - a.score);
      list.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + ' ' + BZ.fmt(p.score), r.W - 12, 62 + i * 11, p.color, { align: 'right', shadow: '#000' }));
      if (h.phase === 'done' || h.phase === 'over') {
        E.ui.box(g, r.W / 2 - 110, r.H * .26, 220, 40 + list.length * 13, { bg: ['#1a1030', '#0a0614'], border: '#ffd040' });
        E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .26 + 6, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
        list.forEach((p, i) => E.font.text(g, (i + 1) + '. ' + p.name + '   ' + BZ.fmt(p.score) + ' FT', r.W / 2, r.H * .26 + 28 + i * 13, p.color, { align: 'center', shadow: '#000' }));
      }
    });
  },
  /** our own card: the game's look, the players lined up as batters in their seat colors */
  drawCard(r) {
    const h = BZ.hub, c = h.card || {}, g0 = BZ.game, I = g0.input, info = h.info || { players: [] };
    r.sky(['#05040e', '#1a1040', '#3a1a48']);
    r.overlay(g => {
      BZ.title(g, r, 8, r.W > 380 ? 3 : 2);
      E.font.text(g, 'BATZOOKA DERBY  ·  ONLINE', r.W / 2, 64, '#ffd040', { align: 'center', scale: 1, shadow: '#000' });
      const ps = info.players || [], n = Math.max(1, ps.length), cw = Math.min(70, (r.W - 30) / n);
      ps.forEach((p, i) => {
        const x = Math.round(r.W / 2 - cw * n / 2 + i * cw), y = 78, col = p.color || BZ.SEAT_COLORS[i % 4], ready = (c.ready || []).includes(p.id);
        E.ui.box(g, x + 2, y, cw - 4, 62, { bg: [col, E.shade(col, -.5)], border: ready ? '#ffffff' : '#3a3a5a' });
        const rig = BZ.rigFor(BZ.get('teams', 'comets').lineup[[0, 3, 7, 4][i % 4]], 'bat'); if (rig && BZ.cosmetic) rig.drawPortrait(g, x + cw / 2 - 16, y + 4, 32, { zoom: 2.2, frame: false });
        E.font.text(g, String(p.name || 'P' + (i + 1)).slice(0, 9).toUpperCase(), x + cw / 2, y + 40, '#ffffff', { align: 'center', shadow: '#000' });
        E.font.text(g, ready ? '✓ READY' : '...', x + cw / 2, y + 51, ready ? '#ffffff' : '#c8c8d8', { align: 'center' });
      });
      E.font.text(g, 'How to win: hit the most home-run feet in 2:00', r.W / 2, 148, '#ffffff', { align: 'center', shadow: '#000' });
      BZ.drawPrompts(g, I, [['move', 'AIM'], ['south', 'SWING'], ['west', 'POWER'], ['r1', 'BATZOOKA (3 HR IN A ROW)']], r.W / 2, 162, { align: 'center', size: 10 });
      const status = c.starting ? 'Starting...' : c.paused ? 'Waiting for more time...' : c.left != null ? 'Starts in ' + Math.ceil(c.left / 1000) + 's' : 'Get ready';
      E.font.text(g, status, r.W / 2, 182, '#ffd040', { align: 'center', scale: 1, shadow: '#000' });
      if (c.asked || h.answered === 'more') E.font.text(g, 'You asked for more time', r.W / 2, 194, '#a8b8e8', { align: 'center' });
      const bw = 96, by = r.H - 40;
      this.readyBtn = [r.W / 2 - bw - 6, by, bw, 22]; this.moreBtn = [r.W / 2 + 6, by, bw, 22];
      E.ui.box(g, ...this.readyBtn, { bg: h.answered === 'ready' ? ['#5aff8a', '#1a8a3a'] : ['#ffb030', '#c8501a'], border: '#fff6c0' });
      const g1 = BZ.glyph(g, I, 'south', this.readyBtn[0] + 5, by + 5, 11); E.font.text(g, 'READY', this.readyBtn[0] + 9 + g1, by + 7, '#1a0a00');
      E.ui.box(g, ...this.moreBtn, { bg: ['#2a3460', '#141a34'], border: '#5a6aa0' });
      const g2 = BZ.glyph(g, I, 'north', this.moreBtn[0] + 5, by + 5, 11); E.font.text(g, 'MORE TIME', this.moreBtn[0] + 9 + g2, by + 7, '#ffffff');
    });
  }
};

/* ===== src/50-teams.js ===== */
/* =============================================================================
 * 50-teams: the six teams, their rosters, looks, uniforms, aces, signature
 * pitches and team supers. Adding a team is one BZ.def('teams', ...) entry.
 * Stats run 1-10 (5 is average). Batters: pow con spd arm glv. Pitchers add
 * vel ctl brk sta. bt is "bats/throws".
 * ========================================================================== */
const SKINS = ['#f1c7a0', '#e0a878', '#c68a5a', '#a86a42', '#8a5232', '#6a3e26', '#f4d2b4'];
const HAIRS = ['#2a1e1a', '#4a3020', '#7a4a2a', '#c89048', '#e8c870', '#1a1a1a', '#9a2a1a', '#d8d8d8'];
const HSTYLE = ['short', 'spiky', 'short', 'ponytail', 'long', 'short', 'bald', 'spiky'];
/** build a roster from names, with stats from a team profile (seeded, so it is the same every time) */
function roster(teamId, list, prof) {
  const r = E.rng(BZ.hash(teamId));
  return list.map(([pos, name, bt, stats, look], i) => {
    const s = stats || {};
    const rnd = (b) => clamp(Math.round(b + (r() - .5) * 4), 2, 10);
    const p = {
      id: teamId + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), team: teamId, name, short: name.replace(/".*?"\s*/, '').split(' ').pop().toUpperCase(),
      pos, bt: bt || 'R/R', num: s.num || (1 + Math.floor(r() * 49)),
      pow: s.pow !== undefined ? s.pow : rnd(prof.pow), con: s.con !== undefined ? s.con : rnd(prof.con), spd: s.spd !== undefined ? s.spd : rnd(prof.spd),
      arm: s.arm !== undefined ? s.arm : rnd(prof.arm), glv: s.glv !== undefined ? s.glv : rnd(prof.glv),
      look: Object.assign({ skin: SKINS[Math.floor(r() * SKINS.length)], hairColor: HAIRS[Math.floor(r() * HAIRS.length)], hair: HSTYLE[Math.floor(r() * HSTYLE.length)], size: 1.18 + r() * .14, build: r() < .25 ? 'bulky' : 'heroic' }, prof.look || {}, look || {})
    };
    if (pos === 'P' || pos === 'RP') Object.assign(p, { vel: s.vel || rnd(prof.vel || 6), ctl: s.ctl || rnd(prof.ctl || 6), brk: s.brk || rnd(prof.brk || 6), sta: s.sta || rnd(prof.sta || 6), pitches: s.pitches, pow: s.pow !== undefined ? s.pow : 3, con: s.con !== undefined ? s.con : 3 });
    if (s.voice) p.voice = s.voice;
    if (s.captain) p.captain = true;
    return p;
  });
}
function team(id, o) {
  const players = roster(id, o.list, o.prof);
  const t = BZ.def('teams', id, Object.assign({}, o, { players }));
  t.lineup = players.filter(p => p.pos !== 'RP');                  // batting order, as listed (pitcher last)
  t.ace = players.find(p => p.pos === 'P');
  t.reliever = players.find(p => p.pos === 'RP');
  t.captain = players.find(p => p.captain) || t.ace;
  for (const p of players) BZ.def('players', p.id, p);
  return t;
}

team('comets', {
  name: 'Kernel Falls Comets', nick: 'COMETS', abbr: 'COM', home: 'kernel', city: 'Kernel Falls',
  uniform: { jersey: '#f4ecd8', pants: '#f4ecd8', trim: '#1e2a5a', cap: '#1e2a5a', helmet: '#1e2a5a', socks: '#f2c230', dark: '#1e2a5a', bat: '#c89a5a' },
  colors: ['#1e2a5a', '#f2c230'], mascot: { name: 'Popcorn Pete', R: 8, colors: { dk: '#c8b070', base: '#fff4d0', lt: '#ffffff', spec: '#fff8e0', eye: '#2a1e1a', pupil: '#000000' }, feet: true, mouth: true },
  superPitch: 'cornpopper', zooka: 'BATZOOKA', zookaColors: ['#ff7a1a', '#ffd040', '#fff6c0'], voice: 'dot', stars: [4, 4, 3],
  prof: { pow: 6, con: 7, spd: 6, arm: 6, glv: 7 },
  list: [
    ['CF', 'Dot "Dynamite" Delgado', 'R/R', { pow: 9, con: 8, spd: 7, arm: 7, glv: 7, num: 7, captain: true, voice: 'dot' }, { build: 'heroic', hair: 'ponytail', skin: '#a86a42', hairColor: '#2a1a12', size: 1.28, expr: 'smile' }],
    ['SS', 'Pep Porter', 'L/R', { pow: 4, con: 8, spd: 9, arm: 7, glv: 9, num: 2 }, { build: 'chibi', hair: 'spiky', skin: '#f1c7a0', hairColor: '#c86a2a', size: 1.2 }],
    ['2B', 'Pip Porter', 'R/R', { pow: 4, con: 7, spd: 9, arm: 6, glv: 8, num: 3 }, { build: 'chibi', hair: 'spiky', skin: '#f1c7a0', hairColor: '#c86a2a', size: 1.2 }],
    ['1B', 'Moose Magnusson', 'L/L', { pow: 9, con: 5, spd: 3, arm: 5, glv: 6, num: 44 }, { build: 'bulky', hair: 'ponytail', skin: '#f4d2b4', hairColor: '#e8c870', size: 1.36 }],
    ['3B', 'Sunny Sato', 'R/R', { pow: 6, con: 7, spd: 6, arm: 8, glv: 8, num: 5 }, { hair: 'short', skin: '#e0b088', hairColor: '#1a1a1a', expr: 'smile' }],
    ['C', 'Rosa "Radar" Reyes', 'R/R', { pow: 6, con: 6, spd: 4, arm: 9, glv: 8, num: 12 }, { hair: 'ponytail', skin: '#c68a5a', hairColor: '#2a1e1a' }],
    ['LF', 'Lefty Luna', 'L/L', { pow: 5, con: 8, spd: 8, arm: 6, glv: 7, num: 21 }, { hair: 'long', skin: '#a86a42', hairColor: '#1a1a1a' }],
    ['RF', 'Hank "Hambone" Hollis', 'R/R', { pow: 8, con: 5, spd: 5, arm: 9, glv: 6, num: 33 }, { build: 'bulky', hair: 'short', skin: '#e0a878', hairColor: '#7a4a2a', size: 1.32 }],
    ['P', 'Grandpa Ike Kowalski', 'R/R', { vel: 4, ctl: 8, brk: 9, sta: 6, pow: 2, con: 4, spd: 2, arm: 6, glv: 6, num: 62, voice: 'ike', pitches: ['heater', 'curve', 'knuckler', 'butterfly'] }, { hunch: .3, hair: 'bald', hairColor: '#e8e8e8', skin: '#f1c7a0', build: 'heroic', size: 1.22 }],
    ['RP', 'Kid Kernel', 'R/R', { vel: 9, ctl: 5, brk: 5, sta: 4, num: 99, voice: 'kid', pitches: ['heater', 'slider', 'changeup', 'kernelcannon'] }, { build: 'chibi', hair: 'spiky', hairColor: '#e8c870', size: 1.18 }]
  ]
});
team('krakens', {
  name: 'Harbor City Krakens', nick: 'KRAKENS', abbr: 'HCK', home: 'barnacle', city: 'Harbor City',
  uniform: { jersey: '#1f8a8a', pants: '#e8d8b0', trim: '#ff7a5c', cap: '#1f8a8a', helmet: '#156a6a', socks: '#f4f4f4', dark: '#0e4a4a', bat: '#9a6a3a' },
  colors: ['#1f8a8a', '#ff7a5c'], mascot: { name: 'Squidge', R: 8, colors: { dk: '#4a2a7a', base: '#8a5ac8', lt: '#b890f0', spec: '#e8d8ff', eye: '#fff', pupil: '#1a1a1a' }, mouth: true, feet: true },
  superPitch: 'tidalwave', zooka: 'KRAKENZOOKA', zookaColors: ['#3ac8c8', '#a0fff0', '#ffffff'], voice: 'brine', stars: [3, 4, 4],
  prof: { pow: 5, con: 6, spd: 6, arm: 7, glv: 6 },
  list: [
    ['CF', 'Dash Seaborne', 'L/L'], ['SS', 'Wade Waters', 'R/R'], ['1B', 'Coral Quinn', 'L/L'], ['RF', 'Hook Hardy', 'R/R'], ['3B', 'Gil Gruber', 'R/R'],
    ['C', '"Barnacle" Barney Finn', 'R/R'], ['LF', 'Shelly Shoals', 'L/L'], ['2B', 'Skip Marlin', 'R/R'],
    ['P', 'Captain Bettina Brine', 'R/L', { vel: 7, ctl: 7, brk: 8, sta: 7, captain: true, voice: 'brine', pitches: ['heater', 'curve', 'changeup', 'riptide'] }, { hair: 'long', hairColor: '#e8c870', skin: '#e0a878', build: 'heroic', size: 1.27, hat: { style: 'pointed', color: '#1a3a4a' } }],
    ['RP', 'Rip Tidewell', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'riptide'] }]
  ]
});
team('eruptors', {
  name: 'Magma City Eruptors', nick: 'ERUPTORS', abbr: 'MCE', home: 'caldera', city: 'Magma City',
  uniform: { jersey: '#2b2b30', pants: '#2b2b30', trim: '#ff6a1a', cap: '#ff6a1a', helmet: '#2b2b30', socks: '#ffd040', dark: '#141418', bat: '#3a2a20' },
  colors: ['#ff6a1a', '#ffd040'], mascot: { name: 'Sparky', R: 8, colors: { dk: '#a83a0a', base: '#ff7a1a', lt: '#ffc040', spec: '#fff0a0', eye: '#2a0a00', pupil: '#000' }, horns: true, feet: true },
  superPitch: 'meteorheater', zooka: 'LAVAZOOKA', zookaColors: ['#ff3a0a', '#ffa020', '#fff0a0'], voice: 'iggy', stars: [5, 3, 4],
  prof: { pow: 7, con: 5, spd: 5, arm: 7, glv: 5, look: { build: 'bulky' } },
  list: [
    ['SS', 'Ashley Pyre', 'R/R'], ['2B', 'Cinder Ellis', 'L/R'], ['3B', '"Hot Corner" Hector Flores', 'R/R'], ['1B', 'Magnus Holt', 'L/L'], ['RF', 'Sol Vulcan', 'R/R'],
    ['LF', 'Ember Okafor', 'R/R'], ['C', 'Basalt Bruno', 'R/R'], ['CF', 'Flint Rocha', 'L/L'],
    ['P', 'Iggy "The Igniter" Blaze', 'R/R', { vel: 9, ctl: 6, brk: 7, sta: 7, captain: true, voice: 'iggy', pitches: ['heater', 'slider', 'sinker', 'magmasinker'] }, { hair: 'spiky', hairColor: '#ff4a1a', skin: '#c68a5a', build: 'heroic', size: 1.3, expr: 'angry' }],
    ['RP', 'Scorch McGee', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'magmasinker'] }]
  ]
});
team('meteors', {
  name: 'Moonbase Meteors', nick: 'METEORS', abbr: 'MBM', home: 'tranquility', city: 'Moonbase One',
  uniform: { jersey: '#c8d0e0', pants: '#c8d0e0', trim: '#6a4cff', cap: '#6a4cff', helmet: '#6a4cff', socks: '#ffffff', dark: '#3a2a8a', bat: '#d8d8e8', hatStyle: 'visor', visor: '#6a8aff' },
  colors: ['#6a4cff', '#c8d0e0'], mascot: { name: 'Moonpie', R: 8, colors: { dk: '#6a6a78', base: '#b8b8c4', lt: '#e0e0ea', spec: '#ffffff', eye: '#1a1a2a', pupil: '#000' }, face: 'front' },
  superPitch: 'blackhole', zooka: 'LUNAZOOKA', zookaColors: ['#8a6aff', '#c0b0ff', '#ffffff'], voice: 'cosmo', stars: [4, 4, 4],
  prof: { pow: 6, con: 6, spd: 6, arm: 6, glv: 7 },
  list: [
    ['CF', 'Halley Brooks', 'L/L'], ['2B', 'Stella Petrov', 'R/R'], ['3B', 'Rocket Rhodes', 'R/R'], ['1B', 'Nova Nakamura', 'L/L'], ['RF', 'Gus Gravitas', 'R/R'],
    ['SS', 'Quasar Diaz', 'R/R'], ['LF', 'Astra Bell', 'L/L'], ['C', 'Orbit Okoye', 'R/R'],
    ['P', 'Commander Cosmo Vega', 'L/L', { vel: 6, ctl: 8, brk: 9, sta: 8, captain: true, voice: 'cosmo', pitches: ['heater', 'curve', 'changeup', 'zerog'] }, { hair: 'short', hairColor: '#d8d8d8', skin: '#8a5232', build: 'heroic', size: 1.28 }],
    ['RP', 'Pulsar Penn', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'zerog'] }]
  ]
});
team('haunts', {
  name: 'Hollowmoor Haunts', nick: 'HAUNTS', abbr: 'HMH', home: 'boneyard', city: 'Hollowmoor',
  uniform: { jersey: '#e8e0c8', pants: '#1a1630', trim: '#7dffb0', cap: '#1a1630', helmet: '#1a1630', socks: '#7dffb0', dark: '#1a1630', bat: '#5a4a3a', bone: '#e8e0c8' },
  colors: ['#1a1630', '#7dffb0'], mascot: { name: 'Boo', R: 8, colors: { dk: '#a8b8c0', base: '#f0f4f8', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a2a', pupil: '#000' }, face: 'front', mouth: true, ghost: true },
  superPitch: 'banshee', zooka: 'GHOULZOOKA', zookaColors: ['#4affa0', '#c0ffd8', '#ffffff'], voice: 'skeleton', stars: [4, 3, 5],
  prof: { pow: 6, con: 6, spd: 5, arm: 6, glv: 7, look: { build: 'skeleton', size: 1.24, eyeGlow: '#7dffb0' } },
  list: [
    ['SS', 'Skelly Kelly', 'R/R'], ['CF', 'Wisp O\'Hara', 'L/L'], ['1B', 'Boney Malone', 'L/L'], ['3B', 'Ezekiel Tomb', 'R/R'], ['RF', 'Digger Doyle', 'R/R'],
    ['2B', 'Wailin\' Winnie', 'R/R'], ['LF', 'Shade Murphy', 'L/L'], ['C', 'Mort Graves', 'R/R'],
    ['P', 'Count Rattlebones', 'R/R', { vel: 7, ctl: 8, brk: 9, sta: 9, captain: true, voice: 'skeleton', pitches: ['heater', 'curve', 'changeup', 'phantomfork'] }, { build: 'skeleton', size: 1.3, eyeGlow: '#ff5a40', hatOverride: { style: 'tophat', color: '#1a1630', band: '#7dffb0' } }],
    ['RP', 'Spook Hennessy', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'phantomfork'] }]
  ]
});
team('mechanicals', {
  name: 'MegaMax Mechanicals', nick: 'MECHANICALS', abbr: 'MMX', home: 'megadome', city: 'MegaMax Corp', boss: true,
  uniform: { jersey: '#b8c0cc', pants: '#b8c0cc', trim: '#e01e3c', cap: '#e01e3c', helmet: '#e01e3c', socks: '#2de2e6', dark: '#5a6070', bat: '#8a94a8', hatStyle: 'helmet' },
  colors: ['#e01e3c', '#2de2e6'], mascot: { name: 'Mr. Synergy', R: 8, colors: { dk: '#7a8494', base: '#c8d0dc', lt: '#f0f4f8', spec: '#ffffff', eye: '#2de2e6', pupil: '#0a3a3a' }, wings: true, face: 'front' },
  superPitch: 'overclock', zooka: 'MEGAZOOKA 9000', zookaColors: ['#e01e3c', '#2de2e6', '#ffffff'], voice: 'enforcer', stars: [5, 4, 5],
  prof: { pow: 7, con: 6, spd: 5, arm: 8, glv: 7, look: { skin: '#9aa4b4', hair: 'bald', hairColor: '#5a6070', eyeGlow: '#2de2e6', colors: { skin: '#9aa4b4' } } },
  list: [
    ['CF', 'Byte', 'R/R'], ['SS', 'Sprocket', 'R/R'], ['1B', 'Forklift', 'L/L', null, { build: 'bulky' }], ['3B', 'Torque', 'R/R', null, { build: 'bulky' }], ['RF', 'Piston', 'R/R'],
    ['LF', 'Router', 'L/L'], ['2B', 'Servo', 'R/R'], ['C', 'Backstop-X', 'R/R', null, { build: 'bulky' }],
    ['P', 'ENFORCER-9000', 'R/R', { vel: 10, ctl: 8, brk: 6, sta: 10, captain: true, voice: 'enforcer', pitches: ['heater', 'slider', 'sinker', 'gigavolt'] }, { build: 'bulky', size: 2.0, eyeGlow: '#ff2a2a', skin: '#8a94a8', hair: 'bald', colors: { skin: '#8a94a8' } }],
    ['RP', 'Spare Part', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'gigavolt'] }]
  ]
});

team('crew', {
  name: 'Kernel Field Grounds Crew', nick: 'CREW', abbr: 'GRD', home: 'kernel', city: 'Kernel Falls', hidden: true,
  uniform: { jersey: '#2a6a3a', pants: '#e8d8b0', trim: '#f2c230', cap: '#2a6a3a', helmet: '#2a6a3a', socks: '#2a6a3a', dark: '#1a3a1a', bat: '#b08050' },
  colors: ['#2a6a3a', '#f2c230'], mascot: { name: 'Rakey', R: 7, colors: { dk: '#3a5a1a', base: '#7ab040', lt: '#b0e070', spec: '#ffffff', eye: '#1a1a1a', pupil: '#000' }, feet: true },
  superPitch: 'cornpopper', zooka: 'RAKEZOOKA', zookaColors: ['#7ab040', '#d0ff90', '#ffffff'], voice: 'crowdguy', stars: [2, 3, 2],
  prof: { pow: 4, con: 5, spd: 5, arm: 5, glv: 5 },
  list: [['CF', 'Rusty Rake', 'R/R'], ['SS', 'Mo Mower', 'R/R'], ['1B', 'Chalky Chen', 'L/L'], ['3B', 'Tarp Tavares', 'R/R'], ['RF', 'Hose Hopkins', 'R/R'], ['LF', 'Sod Sullivan', 'L/L'], ['2B', 'Dusty Dale', 'R/R'], ['C', 'Bucket Barnes', 'R/R'],
    ['P', 'Lefty Loam', 'L/L', { vel: 4, ctl: 7, brk: 4, sta: 8, pitches: ['heater', 'curve', 'changeup', 'knuckler'] }], ['RP', 'Spigot Smith', 'R/R', { pitches: ['heater', 'slider', 'changeup', 'knuckler'] }]]
});

/* ---- non-players: the announcers, the umpire, the villain (for portraits and cutscenes) ---- */
BZ.CAST = {
  hap: { name: 'HAP HARRIGAN', voice: 'hap', look: { build: 'heroic', hair: 'short', skin: '#f1c7a0', hairColor: '#7a4a2a', size: 1.25, hatOverride: { style: 'band', color: '#2a2a3a' } }, uniform: { jersey: '#7a2a2a', pants: '#3a3a4a', trim: '#e8c870' } },
  lou: { name: 'BIG LOU BOMBECK', voice: 'lou', look: { build: 'bulky', hair: 'bald', skin: '#c68a5a', hairColor: '#1a1a1a', size: 1.32 }, uniform: { jersey: '#2a4a8a', pants: '#3a3a4a', trim: '#f2c230' } },
  gloria: { name: 'GLORIA VOX', voice: 'gloria', look: { build: 'heroic', hair: 'long', skin: '#e0a878', hairColor: '#c83a6a', size: 1.24 }, uniform: { jersey: '#8a3aa8', pants: '#3a2a4a', trim: '#f0f0f0' } },
  barb: { name: 'UMPIRE BARB', voice: 'barb', look: { build: 'bulky', hair: 'short', skin: '#c8906a', hairColor: '#3a2a20', size: 1.28, outfit: 'coat', hatOverride: { style: 'cap', color: '#1a2238' } }, uniform: { jersey: '#1a2238', pants: '#5a6070', trim: '#1a2238' } },
  mortimer: { name: 'MORTIMER MEGAMAX', voice: 'mortimer', look: { build: 'heroic', hair: 'short', skin: '#f4d2b4', hairColor: '#8a8a8a', size: 1.28, outfit: 'coat', hatOverride: { style: 'tophat', color: '#1a1a24', band: '#e8c040' } }, uniform: { jersey: '#2a2a34', pants: '#2a2a34', trim: '#e8c040' } },
  ike: { player: 'comets-grandpa-ike-kowalski' }, dot: { player: 'comets-dot-dynamite-delgado' }
};
BZ.castRig = (id) => {
  const c = BZ.CAST[id]; if (!c) return null;
  if (c.player) return BZ.rigFor(BZ.get('players', c.player), 'bench');
  const key = 'cast:' + id;
  let rg = BZ.rigCache.get(key);
  if (!rg) { rg = BZ.makeRig({ id: key, look: c.look }, { uniform: c.uniform }, 'bench'); BZ.rigCache.set(key, rg); }
  return rg;
};
BZ.voiceOf = (who) => {
  if (BZ.CAST[who] && BZ.CAST[who].voice) return BZ.CAST[who].voice;
  if (BZ.CAST[who] && BZ.CAST[who].player) { const p = BZ.get('players', BZ.CAST[who].player); return p && p.voice || 'hap'; }
  const p = BZ.get('players', who); if (p) return p.voice || (BZ.get('teams', p.team) || {}).voice || 'crowdguy';
  return 'hap';
};
BZ.nameOf = (who) => {
  if (BZ.CAST[who] && BZ.CAST[who].name) return BZ.CAST[who].name;
  if (BZ.CAST[who] && BZ.CAST[who].player) { const p = BZ.get('players', BZ.CAST[who].player); return p.name.toUpperCase(); }
  const p = BZ.get('players', who); if (p) return p.name.toUpperCase();
  return String(who).toUpperCase();
};
BZ.portraitRig = (who) => BZ.CAST[who] ? BZ.castRig(who) : (BZ.get('players', who) ? BZ.rigFor(BZ.get('players', who), 'bench') : null);

/* ===== src/51-parks.js ===== */
/* =============================================================================
 * 51-parks: the six ballparks. Fence distances (LF, LC, CF, RC, RF) in world
 * units, the sky (an E.Backdrop spec), the light, the ground beyond the fence,
 * per-park physics, props and the hazard plug-in id.
 * ========================================================================== */
BZ.def('parks', 'kernel', {
  name: 'Kernel Field', team: 'comets', city: 'Kernel Falls', time: 'dusk', music: 'kernel', hazard: 'silo', wind: true,
  fence: [980, 1080, 1180, 1060, 950], fenceH: 40, pad: '#2a6a3a', padTop: '#f2c230',
  backdrop: { sky: ['#2a3a7a', '#c86a5a', '#f4b060'], sun: { x: .78, y: .55, r: 18, color: '#ffd080' },
    layers: [{ kind: 'clouds', color: '#f0a080', y: .25, parallax: .05 }, { kind: 'hills', color: '#4a5a3a', y: .62, height: .18, parallax: .1 }, { kind: 'forest', color: '#2f4a2a', y: .72, height: .1, parallax: .2 }] },
  grass: ['#4a9a3a', '#3f8a33'], mow: 'stripes', dirt: '#b07a4a', track: '#9a6a40', beyond: 'corn', beyondColor: ['#6a8a2a', '#8aa83a'],
  ambient: .8, lightTint: '#ffd8a0', standFace: 'plank', standColor: '#8a5a3a', standTop: '#c8a070', crowd: ['#f4ecd8', '#1e2a5a', '#f2c230', '#c83a2a'],
  props: ['silo', 'barnboard', 'windmill', 'cornrows'], weather: { kind: 'leaves', amount: .25, wind: .3 }, towers: 4, night: false
});
BZ.def('parks', 'barnacle', {
  name: 'Barnacle Bay Park', team: 'krakens', city: 'Harbor City', time: 'noon', music: 'barnacle', hazard: 'gulls', wind: true, windDir: -2.4,
  fence: [1000, 1100, 1150, 1000, 900], fenceH: 40, fenceSections: [{ from: 20, to: 50, h: 30 }], pad: '#1f6a8a', padTop: '#ff7a5c',
  backdrop: 'ocean', grass: ['#5aaa48', '#4c9a3e'], mow: 'checker', dirt: '#c8a070', track: '#b08858', beyond: 'water', beyondColor: ['#2a7ab0', '#3a8ac8'],
  ambient: 1, lightTint: '#ffffff', standFace: 'plank', standColor: '#3a7a8a', standTop: '#a8d0d8', crowd: ['#1f8a8a', '#ff7a5c', '#f4f4f4', '#e8d8b0'],
  props: ['lighthouse', 'boats', 'pier'], weather: null, towers: 0, night: false
});
BZ.def('parks', 'caldera', {
  name: 'Caldera Field', team: 'eruptors', city: 'Magma City', time: 'dusk', music: 'caldera', hazard: 'vents', wind: true,
  fence: [920, 1060, 1200, 1100, 1000], fenceH: 50, pad: '#2a2a30', padTop: '#ff6a1a',
  backdrop: { sky: ['#1a0808', '#6a1a10', '#c84a1a'], sun: { x: .3, y: .5, r: 26, color: '#ff8a3a' },
    layers: [{ kind: 'mountains', color: '#3a1a14', y: .5, height: .35, parallax: .08, seed: 4 }, { kind: 'fog', color: '#8a3a1a', y: .62, height: .1, parallax: .15 }, { kind: 'mountains', color: '#24100c', y: .7, height: .14, parallax: .2, seed: 9 }] },
  grass: ['#5a7a2a', '#4e6c24'], mow: 'stripes', dirt: '#6a4a3a', track: '#3a2a24', beyond: 'lava', beyondColor: ['#ff5a0a', '#ffb020'],
  ambient: .6, lightTint: '#ffb080', standFace: 'stone', standColor: '#3a3238', standTop: '#5a4a48', crowd: ['#ff6a1a', '#2b2b30', '#ffd040', '#e8e8e8'],
  props: ['volcano', 'basalt', 'vents'], weather: { kind: 'ash', amount: .45, wind: .2 }, towers: 4, night: true
});
BZ.def('parks', 'tranquility', {
  name: 'Tranquility Dome', team: 'meteors', city: 'Moonbase One', time: 'lunar night', music: 'tranquility', hazard: 'meteors', wind: false,
  fence: [1350, 1450, 1550, 1450, 1350], fenceH: 60, pad: '#3a3a5a', padTop: '#8a6aff',
  backdrop: { sky: ['#000008', '#05051a', '#10103a'], stars: true, moon: { x: .7, y: .25, r: 30, color: '#4a8ad8' },
    layers: [{ kind: 'mountains', color: '#3a3a44', y: .66, height: .16, parallax: .08, seed: 2 }, { kind: 'hills', color: '#55555f', y: .74, height: .08, parallax: .15 }] },
  grass: ['#3aa86a', '#34985e'], mow: 'astro', dirt: '#8a8a94', track: '#6a6a74', beyond: 'regolith', beyondColor: ['#7a7a84', '#8e8e98'],
  ambient: .6, lightTint: '#c8d8ff', standFace: 'stone', standColor: '#5a5a6a', standTop: '#9a9aaa', crowd: ['#c8d0e0', '#6a4cff', '#ffffff', '#4a4a5a'],
  props: ['habitat', 'antenna', 'rover', 'dish'], weather: null, towers: 4, night: true,
  gravityMul: .55, evMul: .8, jumpMul: 2, depth: 200, domeRibs: true
});
BZ.def('parks', 'boneyard', {
  name: 'Boneyard Ballpark', team: 'haunts', city: 'Hollowmoor', time: 'midnight', music: 'boneyard', hazard: 'phantom', wind: true,
  fence: [1000, 1080, 1120, 1080, 1000], fenceH: 36, pad: '#2a2830', padTop: '#7dffb0', ironFence: true,
  backdrop: { sky: ['#05040e', '#141430', '#2a2a50'], stars: true, moon: { x: .25, y: .22, r: 22, color: '#f0f0d8' },
    layers: [{ kind: 'forest', color: '#14141e', y: .62, height: .16, parallax: .08, seed: 5 }, { kind: 'fog', color: '#5a6a7a', y: .66, height: .1, parallax: .12 }, { kind: 'castle', color: '#0c0c14', y: .7, height: .2, parallax: .18 }] },
  grass: ['#4a6a3a', '#425e34'], mow: 'diamonds', dirt: '#5a4a40', track: '#3a3028', beyond: 'graves', beyondColor: ['#2a3a2a', '#34442e'],
  ambient: .45, lightTint: '#a8ffd0', standFace: 'stone', standColor: '#3a3440', standTop: '#5a5460', crowd: ['#e8e0c8', '#1a1630', '#7dffb0', '#8a8aa0'],
  props: ['tombstones', 'crypt', 'deadtrees', 'pumpkins'], weather: { kind: 'leaves', amount: .35, wind: .5 }, towers: 4, night: true
});
BZ.def('parks', 'megadome', {
  name: 'MegaMax MegaDome', team: 'mechanicals', city: 'MegaMax Corp', time: 'neon night', music: 'megadome', hazard: 'drones', wind: false, locked: true,
  fence: [1000, 1060, 1100, 1060, 1000], fenceH: 40, fenceSections: [{ from: -50, to: -20, h: 90 }], pad: '#1a1a2a', padTop: '#2de2e6',
  backdrop: 'city-night', grass: ['#2a8a5a', '#24804f'], mow: 'neon', dirt: '#4a4a5a', track: '#2a2a3a', beyond: 'concourse', beyondColor: ['#14142a', '#1c1c34'],
  ambient: .55, lightTint: '#ff80e0', standFace: 'stone', standColor: '#2a2a3a', standTop: '#5a5a7a', crowd: ['#e01e3c', '#2de2e6', '#b8c0cc', '#ffffff'],
  props: ['megatron', 'billboards', 'luxurybox', 'drones'], weather: null, towers: 4, night: true, bounceMul: 1.1, domeRibs: true
});
BZ.PARK_ORDER = ['kernel', 'barnacle', 'caldera', 'tranquility', 'boneyard', 'megadome'];

/* ===== src/52-story.js ===== */
/* =============================================================================
 * 52-story: the Tour's story, as data. Kernel Field is about to become a parking
 * lot; Mortimer Megamax bets the deed on the Kaboom Cup. Each stop: a pregame
 * scene, its game (a rival, a hazard), a postgame scene for a win or a loss.
 * Steps: ['say', who, text] (who: a cast id or a player id), ['wait', s],
 * ['sfx', name], ['pose', actor, pose, expr], ['fx', kind, x, y], ['call', fn].
 * ========================================================================== */
const P_ = id => 'comets-' + id;
BZ.STOPS = [
  { id: 'home', park: 'kernel', title: 'KERNEL FIELD', sub: 'HOME OF THE COMETS', map: [.14, .78] },
  { id: 'barnacle', park: 'barnacle', rival: 'krakens', title: 'BARNACLE BAY PARK', sub: 'VS THE KRAKENS', map: [.3, .52], reward: ['lumber', 'BARNACLE GRIP TAPE', 'Lumber +1'] },
  { id: 'caldera', park: 'caldera', rival: 'eruptors', title: 'CALDERA FIELD', sub: 'VS THE ERUPTORS', map: [.48, .74], reward: ['cleats', 'MAGMA CLEATS', 'Jet Cleats +1'], scriptRhubarb: true },
  { id: 'tranquility', park: 'tranquility', rival: 'meteors', title: 'TRANQUILITY DOME', sub: 'VS THE METEORS', map: [.62, .4], reward: ['gloves', 'ZERO-G GLOVES', 'Glue Gloves +1'] },
  { id: 'boneyard', park: 'boneyard', rival: 'haunts', title: 'BONEYARD BALLPARK', sub: 'VS THE HAUNTS', map: [.76, .68], reward: ['hype', 'PHANTOM PINE TAR', 'Hype Machine +1'] },
  { id: 'megadome', park: 'megadome', rival: 'mechanicals', title: 'MEGAMAX MEGADOME', sub: 'THE KABOOM CUP FINAL', map: [.88, .3], boss: true }
];
BZ.STORY = {
  prologue: [
    ['music', 'menu'],
    ['say', 'hap', 'Good evening, baseball fans, from Kernel Field, where the corn is high and the stakes are higher!'],
    ['sfx', 'horn'],
    ['say', 'mortimer', 'Enjoy your little cornfield, Comets. Monday it\'s a parking lot. Premium spaces only.'],
    ['say', P_('dot-dynamite-delgado'), 'Over my dead batting glove.'],
    ['say', 'mortimer', 'Win the Kaboom Cup and I\'ll tear up the deed. Lose, and I pave the park AND hang that bat in my lobby.'],
    ['sfx', 'confirm'],
    ['say', 'ike', 'Your grandma\'s BATZOOKA. Hickory, duct tape and a surplus bottle rocket. Summer of \'62.'],
    ['say', P_('dot-dynamite-delgado'), 'What does it do?'],
    ['say', 'ike', 'Nothin\'. Till the crowd gets loud. Then it does EVERYTHING.'],
    ['sfx', 'charge'],
    ['say', 'lou', 'Folks, I haven\'t seen a bat that dangerous since I swung at my own shadow in \'79!']
  ],
  barnacle: {
    pre: [['music', 'barnacle'], ['say', 'krakens-captain-bettina-brine', 'Ahoy, corn-pickers! The tide\'s coming in, and it\'s bringing a whole ocean of hurt!'], ['say', P_('dot-dynamite-delgado'), 'We brought sunscreen.'], ['say', 'lou', 'Watch the gulls, folks. They\'ve got better hands than my old infield.']],
    win: [['say', 'krakens-captain-bettina-brine', 'Blast it all. Take this. Barnacle Grip Tape. Sticks to anything, except a lead.']],
    loss: [['say', 'krakens-captain-bettina-brine', 'Back to the shallow end, landlubbers!']]
  },
  caldera: {
    pre: [['music', 'caldera'], ['say', 'eruptors-iggy-the-igniter-blaze', 'Hope you packed sunscreen. SPF one million.'], ['say', 'ike', 'Don\'t stand on anything that\'s glowing.']],
    win: [['say', 'eruptors-iggy-the-igniter-blaze', 'You\'ve got fire, Delgado. Here. Magma Cleats. They\'re only a little bit on fire.']],
    loss: [['say', 'eruptors-iggy-the-igniter-blaze', 'Too hot to handle? Come back when you\'re fireproof!']]
  },
  tranquility: {
    pre: [['music', 'tranquility'], ['say', 'meteors-commander-cosmo-vega', 'Welcome to the Moon, Comets. Up here every pop fly is a field trip.'], ['say', P_('hank-hambone-hollis'), 'Is there a snack bar on the Moon?'], ['say', 'lou', 'Gravity took the day off, folks. Somebody tell the baseball.']],
    win: [['say', 'meteors-commander-cosmo-vega', 'Mission accomplished, for you. Zero-G Gloves. They catch whatever gravity drops.']],
    loss: [['say', 'meteors-commander-cosmo-vega', 'Houston, you have a problem. Try again, earthlings.']]
  },
  boneyard: {
    pre: [['music', 'boneyard'], ['say', 'haunts-count-rattlebones', 'We\'ve been dying to play you. Literally. Since 1887.'], ['say', P_('pip-porter'), 'I\'m not scared.'], ['say', P_('pep-porter'), 'You\'re holding my hand.'], ['say', P_('pip-porter'), 'You\'re holding MINE.']],
    win: [['say', 'haunts-count-rattlebones', 'A fine game, mortals. Phantom Pine Tar. It makes the crowd scream louder.']],
    loss: [['say', 'haunts-count-rattlebones', 'Rest in pieces, Comets. Visit again soon. We\'ll be here. Forever.']]
  },
  megadome: {
    pre: [['music', 'megadome'], ['say', 'mortimer', 'Meet my ace. Ninety thousand horsepower. Zero feelings. ENFORCER-9000!'], ['say', 'mechanicals-enforcer-9000', 'PREPARE. TO. BE. STRUCK. OUT.'], ['say', P_('dot-dynamite-delgado'), 'Then let\'s give him some feelings.'], ['say', 'ike', 'Swing when they roar, kid.']],
    win: [['sfx', 'explode'], ['say', 'hap', 'The last moonshot hits the MEGA-TRON! It\'s raining sparks!'], ['say', 'mortimer', 'My jumbotron! My deed! My... reputation!'], ['sfx', 'firework'], ['say', 'hap', 'The deed flutters into the Batzooka\'s backblast and burns to confetti!'], ['say', P_('dot-dynamite-delgado'), 'Kernel Field stays. Same time next season?'], ['say', 'mechanicals-enforcer-9000', '...I. LIKE. BASEBALL.']],
    loss: [['say', 'mortimer', 'Pave it! Pave it all!']]
  }
};
BZ.UPGRADES = [
  { id: 'lumber', name: 'LUMBER', what: 'Exit speed +5% a tier', costs: [400, 800, 1400], ike: 'Ash, hickory and a little secret. Swing it like you mean it.' },
  { id: 'gloves', name: 'GLUE GLOVES', what: 'Catch reach +1 and sure hands a tier', costs: [300, 700, 1200], ike: 'Sticky as Grandma\'s caramel corn. Mind your fingers.' },
  { id: 'cleats', name: 'JET CLEATS', what: 'Run and field speed +4% a tier', costs: [300, 700, 1200], ike: 'Faster feet! Don\'t outrun the base, now.' },
  { id: 'arms', name: 'CANNON ARMS', what: 'Throws +5%, pitch speed +3% a tier', costs: [400, 800, 1400], ike: 'Long toss every morning. And these. Mostly these.' },
  { id: 'hype', name: 'HYPE MACHINE', what: 'Meter gain +10% a tier', costs: [500, 1000, 1600], ike: 'Louder crowd, hotter bat. That\'s science. Probably.' }
];

/* ===== src/54-lines.js ===== */
/* =============================================================================
 * 54-lines: the commentary line pools. Old-time radio play-by-play turned up to
 * arcade volume: short, present tense, one image a line, baseball slang, warm
 * hyperbole, running gags (Lou's 1979, the vendor who sells out, the mascot's
 * luck). Never mean, no real players, no real quotes. Under 90 characters.
 * A line is text (Hap calls it) or ['lou', text]. Variables: {batter} {pitcher}
 * {team} {dist} {mph} {park} {score}.
 * ========================================================================== */
BZ.LINES = {
  strike_called: ['Strike, right on the black. You could hang a picture on that one.', 'Called strike! The bat never left the shoulder.', 'Painted on the corner. That is fine art, folks.', ['lou', 'He watched it like it was a parade going by.'], 'Strike! {batter} looks at it and keeps looking.', 'Strike called. That one tiptoed right over the plate.', ['lou', 'That pitch said excuse me, and he let it by.'], 'Over the plate for a strike. No swing, no ring.', 'Strike! Right down Main Street with the top down.', 'Called strike on the inside edge. Barb liked that one.'],
  strike_swinging: ['Swing and a miss! He swung so hard he unscrewed himself from the box!', 'Whiff! That breeze cooled off the first three rows.', ['lou', 'He missed it by a zip code. I know that feeling.'], 'Swung through it! {pitcher} just made that ball disappear.', 'Big cut, no contact. The bat is still looking for it.', 'Swing and a miss on the {mph} mile-an-hour heater!', ['lou', 'You can\'t hit what you can\'t find, folks.'], 'He took a mighty rip at the summer air!', 'Missed it! That ball ducked under the bat like a cat under a porch.', 'Swinging strike! {batter} spun around like a weathervane.'],
  ball: ['Ball, low. That one was dragging its feet.', 'Outside, ball. Close enough to wave at.', 'Ball. That pitch wandered off like a kid at the county fair.', ['lou', 'Not even close. That one needed a map.'], 'High, ball. Somebody tell that pitch where the zone lives.', 'Ball, in the dirt. The catcher picks it like a daisy.', 'Ball. {batter} doesn\'t bite.', 'Missed inside. {batter} leans back like a lawn chair.', ['lou', 'That ball took the scenic route.'], 'Ball! The count leans the hitter\'s way.'],
  foul: ['Fouled back! Duck, Lou!', ['lou', 'I\'ve been ducking since \'79.'], 'Foul ball, into the seats. Somebody bring a glove next time.', 'Just foul! The chalk flew, but it\'s a souvenir.', 'Fouled off. He stays alive.', 'Foul, down the line. Close, but no cigar and no corn dog.', 'Off the bat and into the stands. A free baseball for row twelve!', ['lou', 'That fan caught it in his nachos. Bravo.'], 'Fouled straight back. He was right on it.', 'Foul tip, and the battle goes on!'],
  strikeout: ['Strike three! Back to the dugout to think about what he\'s done.', 'Sat him down! {pitcher} is dealing!', 'Strike three called! He brought a bat and forgot to use it.', ['lou', 'That\'s a K, folks. A big, beautiful K.'], 'Struck him out! Ring up another one for {pitcher}!', 'Three strikes, he\'s out. Grab some pine, meat!', 'Strikeout! The crowd hollers, the organ toots!', ['lou', 'He\'ll be thinking about that one all the way home.']],
  walk: ['Ball four. Take your base, and take a sandwich while you\'re at it.', 'A free pass for {batter}.', 'Walked him. Four balls, no fuss.', ['lou', 'Can\'t hit what isn\'t there. Smart cookie.'], 'Ball four! {batter} strolls to first like it\'s Sunday.', 'That\'s a walk. {pitcher} lost the strike zone in the couch cushions.'],
  hbp: ['Oof! Plunked him! {batter} takes his base the hard way.', 'Hit by the pitch! That one\'s going to leave a stitch mark.', ['lou', 'Rub some dirt on it, kid. Works every time.'], 'He wears one! First base, with a bruise for a souvenir.', 'Chin music, and the band played a wrong note!', 'Hit batsman! The benches are stirring...'],
  single: ['Seeing-eye single through the right side! That ball had a map and a flashlight.', 'Base hit! {batter} is aboard!', 'A blooper falls in! A Texas leaguer for {batter}!', 'Ground ball, through the hole! Base hit!', ['lou', 'A single\'s a single. Ask anybody who\'s on first.'], 'Line drive, base hit! Frozen rope to the outfield!', 'Worm-burner up the middle and into center field!', 'Punched through the infield! {batter} singles!', 'Soft liner, falls in! The fielders traded looks.', 'Base hit! Right where they ain\'t!'],
  double: ['Into the gap! {batter} is digging for second like there\'s buried treasure!', 'Off the wall! Stand-up double!', 'Two-bagger! {batter} slides in ahead of the throw!', ['lou', 'Wheels like a pickup truck going downhill!'], 'Lined into the corner! That\'s a double!', 'Rattling around in the corner! {batter} cruises into second!'],
  triple: ['Off the wall, he\'s rounding second, he\'s going for three! He\'s SAFE!', 'A triple! {batter} is running like his pants are on fire!', ['lou', 'I hit a triple once. In 1979. It was a bunt.'], 'Three bases! The rarest bird in baseball just landed!', 'Triple! He\'s standing on third with dirt on his grin!', 'All the way to third! What a hustle!'],
  homer: ['Swung on and BELTED! Deep! Way back! That ball has left the zip code!', '{dist} feet! They\'ll need a passport to bring that one back!', 'GOODBYE, BASEBALL! {batter} with a tater!', ['lou', 'I hit one like that in 1979. Well, I watched one.'], 'That\'s a dinger! Touch \'em all, {batter}!', 'Moonshot! That baseball is applying for a pilot\'s license!', 'Way back... way back... GONE! A home run for the {team}!', 'He launched it! The fireworks guy is earning his money tonight!'],
  grandslam: ['GRAND SLAM! Ducks on the pond and he cleared the whole pond!', 'Bases loaded, bases CLEARED! A grand slam!', ['lou', 'Four runs with one swing. That\'s my kind of math!'], 'Grand salami, extra cheese! What a swing!', 'A grand slam! The scoreboard just ran out of breath!', 'All four come home! Grand slam for {batter}!'],
  inside: ['Inside-the-park home run! He beat the ball home!', 'Around the bases and SAFE at home! An inside-the-parker!', ['lou', 'Now THAT is running. My knees hurt watching it.'], 'Never left the yard, but he did! Inside-the-park homer!', 'He circled the bases like a comet! Inside-the-park!', 'Wheels! An inside-the-park home run!'],
  batzooka_ready: ['The crowd is ROARING! You know what that means... it\'s BATZOOKA TIME!', 'Listen to that noise! The Batzooka is warming up!', ['lou', 'Grandma Delgado\'s bat is humming, folks. Stand back.'], 'Meter\'s full! The crowd just lit the fuse!', 'The Batzooka is ready, and so is the fire department!', 'Here it comes! The crowd wants rockets!'],
  batzooka_hit: ['KA-BLAMMO! That\'s not a home run, that\'s a space program!', 'BATZOOKA! The ball is in orbit and the bat is on fire!', ['lou', 'In 1979 we didn\'t have rockets. We had spit and hope.'], 'Rocket-powered! That ball is outrunning the sound of the crack!', 'BOOM! Somebody call NASA, we found their baseball!', 'The Batzooka fires and the night sky lights up!'],
  batzooka_fizzle: ['Fizzle! That\'s the loudest nothing I\'ve ever heard.', 'The Batzooka goes pfft! Smoke and no fire!', ['lou', 'That bat needs a nap, and so do I.'], 'Swing and a miss with the rocket bat! All smoke, no dinger!', 'Fizzled out! The crowd groans like a screen door.', 'Kaboom... kaput. The Batzooka misfires!'],
  super_pitch: ['{pitcher} just threw a pitch that\'s probably illegal in three states!', 'A super pitch! The ball is doing things physics never signed off on!', ['lou', 'They didn\'t throw pitches like that in 1979. Or ever.'], 'What in the world was THAT? A super pitch from {pitcher}!', 'That pitch had a mind of its own and a bad attitude!', 'The crowd gasps! {pitcher} unloads the special!'],
  catch_dive: ['Laid out like a welcome mat! What a grab!', 'DIVING CATCH! He left his feet and his worries behind!', ['lou', 'That\'s grass in his teeth and glory in his glove!'], 'Full extension! Caught it!', 'He sells out and comes up with it! Spectacular!', 'Superman would ask for his cape back! What a catch!'],
  robbery: ['He climbed the wall and STOLE it! Call the sheriff!', 'ROBBED! That home run just got repossessed!', ['lou', 'He took that one right out of the souvenir shop!'], 'Over the fence and back again! A home run robbery!', 'He went up the wall like a squirrel up a tree and took it away!', 'Highway robbery at the warning track!'],
  error: ['Clank! You could hear that one in the next county.', 'An error! The ball squirts loose!', ['lou', 'Happens to the best of us. Happened to me twice a game.'], 'Booted it! The glove had a hole in it, apparently.', 'Dropped! A rare goof on that play.', 'The ball pops out of the glove like toast!'],
  double_play: ['Two for the price of one! Around the horn and back for a nap!', 'DOUBLE PLAY! Turned it like a page in a book!', ['lou', 'Pretty as a picture. Twice.'], 'Six to four to three! The pitcher\'s best friend!', 'Double play! That inning just got a whole lot shorter!', 'Tag, toss, out, out! Twin killing!'],
  triple_play: ['TRIPLE PLAY! That\'s rarer than a quiet night at Kernel Field!', 'Three outs on one ball! Somebody pinch me!', ['lou', 'I\'ve seen one triple play. It was this one.'], 'A TRIPLE PLAY! The whole inning in one breath!', 'Triple play! Frame that and hang it in the clubhouse!', 'One, two, three! The rarest play in baseball!'],
  steal_safe: ['He\'s stealing! ...SAFE! Lock up your valuables, folks.', 'Stolen base! The catcher\'s throw was a postcard, he\'s a telegram.', ['lou', 'That boy could steal the paint off a fence.'], 'Swiped it! Safe by a whisker!', 'Off and running... SAFE! Another bag in the bank!', 'Stolen base! The legs are doing the talking tonight!'],
  caught_stealing: ['He\'s going... and he\'s OUT! The cannon wins this time!', 'Caught stealing! What a throw by the catcher!', ['lou', 'You don\'t run on that arm. I learned that the hard way.'], 'Gunned down! Right on the bag!', 'Thrown out at second! A perfect peg!', 'Nailed him! No stealing on this catcher\'s watch!'],
  bowl_over: ['COLLISION AT THE PLATE! Somebody check the catcher\'s warranty!', 'He barrels into the catcher! Dust everywhere!', ['lou', 'OOF! I felt that one in my good knee!'], 'Freight train meets the plate! What a crash!', 'Bowled him over! The catcher\'s seeing tweety birds!', 'Home plate collision! Both of them are cartoons now!'],
  rhubarb_start: ['Here come the benches! It\'s a rhubarb, folks, a genuine dust-up!', 'The benches are emptying! Somebody fetch a referee!', ['lou', 'Uh-oh. Grab your hat, grab your popcorn.'], 'Rhubarb! Everybody\'s in it and nobody knows why!', 'It\'s a donnybrook at the dish! Dust is flying!', 'The dugouts empty like a school at three o\'clock!'],
  rhubarb_end: ['Barb\'s breaking it up. Everybody\'s dusting off, and everybody\'s going home dirty.', 'Order restored! Mostly. Somebody lost a shoe.', ['lou', 'Nobody\'s hurt. Just their pride and a few caps.'], 'The dust settles and the game goes on!', 'Barb blows the whistle and the players shuffle back. Play on!', 'And that\'s that. Back to baseball, the gentle game.'],
  walkoff: ['WALK-OFF! The {team} win it! Pile on, pile on!', 'Ballgame! A walk-off for the {team}!', ['lou', 'Go home, folks, go home happy!'], 'It\'s over! The {team} walk it off!', 'The home crowd erupts! Walk-off winner!', 'Game, set, sandwich! Walk-off for the {team}!'],
  lead_change: ['And just like that, we\'ve got ourselves a brand-new ballgame!', 'The lead changes hands! {score}!', ['lou', 'This game\'s got more twists than a pretzel.'], 'Flip the scoreboard! New leader!', 'The {team} take the lead! {score}!', 'Turnaround! Somebody tell the organist!'],
  fly_out: ['Can of corn. Easy out.', 'Fly ball, and it\'s caught.', ['lou', 'Routine as a Tuesday.'], 'Lazy fly ball, squeezed for the out.', 'High fly... and it\'s in the glove.', 'Popped up, caught. One down.'],
  ground_out: ['Grounder, scooped and fired. Out at first.', 'Routine roller, out at first.', ['lou', 'Bread and butter, folks.'], 'Chopped to the infield, thrown out.', 'Ground ball, the throw beats him.', 'Out at first by a step!'],
  tag_up: ['He tags and goes! Here comes the throw...', 'Tagging up! He\'s racing the ball!', ['lou', 'Patience pays. Then legs pay.'], 'He waited for the catch and he\'s off!', 'Sacrifice fly territory! He\'s tagging!', 'Tags from third! It\'s a race to the plate!'],
  wild_pitch: ['Wild pitch! The ball skips to the backstop!', 'That one got away! Runners moving!', ['lou', 'The catcher needs a butterfly net for that one.'], 'In the dirt and past the catcher!', 'Wild pitch! Everybody move up!', 'Bounced and gone! The runners take off!'],
  pickoff: ['A throw over... got him! Picked off!', 'Picked off! Caught leaning!', ['lou', 'Never lean on a pitcher with a quick move.'], 'He snaps a throw to the bag and nails him!', 'Pickoff! The runner wandered too far from home sweet home.', 'Caught napping! Pickoff!'],
  laser: ['LASER ARM! That throw left a sunburn on the infield!', 'A frozen rope from the outfield! Laser Arm!', ['lou', 'That arm should be registered as a weapon.'], 'Zap! The Laser Arm fires a strike!', 'The ball sizzles in on a laser!', 'Laser throw! Right on the bag!'],
  afterburners: ['AFTERBURNERS! The runners are leaving scorch marks!', 'They hit the afterburners! Fire on the basepaths!', ['lou', 'Somebody get the hose! Those shoes are smoking!'], 'Afterburners lit! Look at them go!', 'Whoosh! Turbo cleats engaged!', 'The basepaths are on fire! Literally!'],
  between: ['Time for the Mascot Race! My money\'s on the popcorn.', 'Between innings, and the T-shirt cannon is locked and loaded!', ['lou', 'The vendor just sold out of hot dogs again. Every night.'], 'Grounds crew is out, dragging the infield and dancing!', 'Dance Cam! Show us your moves, Kernel Falls!', 'Stretch your legs, folks, and stretch your lungs!'],
  play_ball: ['Good evening, baseball fans, and welcome to {park}!', 'It\'s a beautiful night for baseball at {park}!', ['lou', 'Lou Bombeck here, and I brought my lucky 1979 sandwich.'], 'Here we go! First pitch coming up at {park}!', 'Batter up, folks! The {team} take the field!', 'The organ\'s warmed up, the hot dogs are hot. Let\'s play ball!'],
  side_retired: ['That\'ll do it for the half inning.', 'Three up, three down? Close enough!', ['lou', 'Time to switch sides and stretch.'], 'And the side is retired.', 'That\'s three outs. Grab a lemonade, folks.', 'End of the half. Organ, take it away!'],
  game_win: ['That\'s the ballgame! The {team} win it!', 'Final out! The {team} take this one!', ['lou', 'A win\'s a win. Like I always said in 1979.'], 'Shake hands, line up, it\'s over! {team} win!', 'And that\'s a wrap at {park}! {team} victory!', 'Ballgame! What a night for the {team}!'],
  rally_cap: ['Krakens, Eruptors, Meteors, even the Haunts! They\'re ALL chanting for the Comets!', 'Rally caps on! The whole stadium wants a comeback!', ['lou', 'I haven\'t heard a crowd like this since... ever!'], 'The rally caps are inside out and the meter is FULL!', 'Every rival in the house is cheering for Kernel Field!', 'RALLY CAP! The crowd lit the Batzooka for them!'],
  short_circuit: ['He\'s smoking! I mean really smoking! Somebody unplug that fella!', 'Sparks from the mound! ENFORCER-9000 is short-circuiting!', ['lou', 'Have you tried turning him off and on again?'], 'That home run blew a fuse in the big robot!', 'ENFORCER-9000 is stuttering! Error, error!', 'The ace is on the fritz!'],
  // the parks' hazards
  hazard_silo: ['It hits the silo! POPCORN! It\'s raining popcorn on Kernel Field!', 'Off the silo and the corn goes POP!', ['lou', 'Free popcorn! The vendor is going to be so upset.'], 'The silo pops like a kettle at the county fair!', 'Kernel Field\'s silo explodes in butter and glory!', 'Popcorn storm in right field!'],
  hazard_gulls: ['A seagull just stole a fly ball! Is that legal? Barb says it\'s... in play!', 'The gulls are hungry tonight and that baseball looks like a french fry!', ['lou', 'Those gulls have better hands than my old infield.'], 'Gull Patrol strikes again! The ball takes a ride!', 'A seagull snatches it! The outfielder is filing a complaint!', 'Up, up and away! The gull drops it like a hot potato!'],
  hazard_vents: ['The ground just sneezed lava, and the baseball went with it!', 'Eruption! The vent fires the ball into the sky!', ['lou', 'Don\'t stand on anything that\'s glowing. Words to live by.'], 'Lava vent! The ball goes up like a firework!', 'KABOOM from the outfield! The vent is erupting!', 'The volcano wants in on the game!'],
  hazard_meteors: ['Meteor shower in left field! The grounds crew is going to need a bigger rake!', 'Incoming! Meteors are cratering the outfield!', ['lou', 'No air, no wind, no excuses. Just rocks from space.'], 'Look out! A meteor shower on the moon!', 'The outfield just got a lot bumpier!', 'Shooting stars, landing hard! New craters in the grass!'],
  hazard_phantom: ['Where\'d it go?! The ball just turned into a rumor!', 'The Phantom Fog swallows the baseball!', ['lou', 'I can\'t see it. Can you see it? Nobody can see it!'], 'Spooky! The ball vanished in the fog!', 'Now you see it, now you... still don\'t!', 'The ghost ball rides the fog!'],
  hazard_drones: ['A drone gets in the way! The ball ricochets!', 'MegaMax security drones on patrol, and one just got a souvenir!', ['lou', 'In my day the only drones were the commercials.'], 'Off the drone! Corporate interference!', 'The drone takes one for the company!', 'Clang! The drone deflects it!'],
  drone_down: ['The Batzooka blasts a drone out of the sky!', 'Drone down! Kaboom over center field!', ['lou', 'That\'s coming out of somebody\'s budget.'], 'One less drone in the MegaDome!', 'Scrap metal raining over the outfield!', 'BOOM! The drone is history!'],
  megatron: ['It hits the MEGA-TRON! Sparks everywhere!', 'Off the giant screen! Mortimer is not amused!', ['lou', 'That\'s gonna leave a pixel.'], 'Bullseye on the MEGA-TRON!', 'The big board flickers! Direct hit!', 'MEGA-TRON hit! The jumbotron shows a frowny face!'],
  vendor: ['PEANUTS!', 'GET YER DOGS!', 'COLD LEMONADE!', 'POPCORN HERE!', 'CRACKER JACKS!', 'SOLD OUT AGAIN!']
};
BZ.UMP = { strike: 'STEE-RIIIKE!', ball: 'BALL!', out: 'YER OUT!', safe: 'SAFE!', fair: 'FAIR BALL!', foul: 'FOUL!', play: 'PLAY BALL!', time: 'TIME!', four: 'BALL FOUR!', three: 'STEE-RIIIKE THREE!' };

/* ===== src/57-about.js ===== */
/* =============================================================================
 * 57-about: the About/Credits pages (About, Source Information, Testing Feedback,
 * Engine Feedback, Prompt Feedback, Credits) and the credits roll's lines. The
 * same text is in the build's final reply and in exit-interview.json.
 * ========================================================================== */
BZ.INFO = {
  source: [
    'Date: 2026-11-04 06:00:15',
    'Source: Baseball (the sport), in the over-the-top arcade style.',
    'Plan: PLAN.md',
    'Genre and Perspective: Arcade sports (baseball) with a slapstick brawler mini-game (the Rhubarb) and a story Tour with light upgrades. Plate Cam: a Mode 7 view from behind the catcher for every pitch and swing; Broadcast Cam: a three-quarter ground view (pitch 52) of the park for fielding and running; Moonshot Cam: a Mode 7 chase of home runs; Replay Cam: the isometric view at half speed.',
    'Tech: my-3D2dge v0.85.2 handoff engine (the full engine; its Mode 7 and arcade modules in use), with small changes (a bat weapon, mitts, four baseball hats, the PS face-button glyphs in the font, PlayStation symbols by default). Plain JavaScript, no libraries, bundled into one HTML file by a Node build script. AI Hub Session client 1.4.0. Tests: Node 24 (vm, headless engine) and Playwright 1.63.0 with Chromium.',
    'Art Direction: The engine\'s native look: HD Humanoid rigs drawn as pixel art at res ps1 with expand, textured TileMap ballparks with baked mowing patterns, lit night games, particles. 40 new shape assets (bases, foul poles, light towers, scoreboards, the silo, a lighthouse, lava vents, habitats, tombstones, drones, the MEGA-TRON) and code-drawn sprites (the ball, reticles, glyph icons, the Batzooka).',
    'Animation: The engine\'s procedural rig system: new attack specs and poses for the contact and power swings, bunt, windup and pitch, throws, tags, dives, slides, wall climbs, umpire calls, celebrations and Rhubarb combos; a two-handed bat grip by IK. No motion-capture clips (the procedural fallback was used for every motion).',
    'Audio: All in code with the engine\'s chip synth: 20 original songs and stings in the engine\'s notation (ballpark organ, surf rock, synthwave), about 60 sound effects, and Animalese-style babble voices for 15 characters (one syllable a letter, per-voice wave, pitch and rate). No audio files.',
    'Online: AI Hub Session Protocol v1, ghost mode, 1-4 players: an online Derby round on a shared pitch sequence with ghost batters and home-run comets; client 1.4.0 pasted unmodified.',
    'Testing: Allowed: headless tools and scripts that play the game and read its state (game.advance, game.debug), a scripted playthrough, screenshots only for the look, no subagents or workflows to review. Used: one command (node tests/run.mjs) with about 160 checks: headless suites, seeded CPU-vs-CPU balance sims, the whole-game playthrough, browser checks (the engine\'s check tool, drawn games in every park, the attract reel) and the AI Hub harness.',
    'Research: Read the engine handoff (README, API card, index lookups, asset card, mode7, arcade and Humanoid source) and the AI Hub protocol README and harness. No web research beyond those sources.',
    'Environment: Claude Code CLI (headless); Linux; browser unknown',
    'Model: Anthropic, claude-opus-5-5, reasoning effort xhigh',
    'Usage: session time about 2 hours (06:00 to about 08:00); API cost and token counts unknown'
  ],
  testing: [
    'How many issues did testing catch? About 30 during the build: headless sims, scenario tests, the playthrough, browser checks and screenshots each found some.',
    'How many would be considered critical issues / game breaking? 9: CPU batters swinging at the human\'s reticle (no offense), a SUDDEN BOOM tie loop that never ended, a crash on a strikeout before any play, throws that sailed past their receiver into stuck plays, two engine patches that broke the engine\'s parsing or flow, a syntax error in the Derby, a name clash that crashed the title, and a scene reading the renderer in update.',
    'What was the most helpful test you ran? The seeded CPU-vs-CPU nine-inning sims with an event tally (runs, AVG, K%, HR%, errors, timeouts): they found the reticle bug, the stuck plays and the missing doubles, and steered every balance change.',
    'What was the least helpful test you ran? The check tool cycling the engine\'s stock views (iso, top-down, side) on a game that uses its own Broadcast and Mode 7 cameras: those frames say little about this game.'
  ],
  engine: [
    'What did you like most about the engine? Exact fixed steps that run headless: whole nine-inning games simulate in Node in a second, with the same code that draws in the browser, and Mode 7 gave the Plate Cam almost for free.',
    'Did you get stuck or guess wrong? Yes: a TileMap floor re-bakes at every new zoom, so a smoothly zooming camera stalled until zoom went to four steps; Mode 7 draws no TileMap walls, so the fence and stands needed billboards; E.store does not persist in Node; pressed() is only true inside a step.',
    'What was the most important thing you had to build yourself? The baseball simulation: the parametric pitch flight, the timing-and-aim contact model, batted-ball physics with the fence, poles and fair or foul, and fielders and runners with forces, tags, tag-ups, cutoffs and the third-out rule.',
    'What was the hardest part about using the engine? Keeping one look across two cameras: the Mode 7 Plate Cam and the TileMap Broadcast Cam needed separate builds of the same fence, stands, crowd and props.',
    'What did you change in the engine, and why? A bat weapon, fielders\' and catchers\' mitts, four hats (batting helmet, catcher\'s mask, space visor, top hat), the PlayStation symbols and a few marks in the font, and PlayStation as the default button symbols with an Xbox option. All for baseball and the controller-first prompts.',
    'If you could change one thing about the engine, what would it be? Cache the baked floor independently of zoom (or re-scale one bake), and let Mode 7 draw a TileMap\'s walls, so one level serves both cameras.'
  ],
  prompt: [
    'What did you like most about this prompt? A complete, decided plan beside a short contract: the plan settled every design question, and TASK.md said exactly what done means.',
    'What was confusing? PLAN.md names its files and folder with another run\'s id (max-20261103-174819); TASK.md\'s names win, but every path in the plan had to be translated. Usage asks for cost and tokens that a session cannot see.',
    'What was the hardest thing to do? Breadth at quality: a full baseball simulation balanced by sims, plus a Tour, eight lessons, a Derby, the attract reel, dev mode, four local players and the AI Hub round, all in one build.',
    'What would you change in this prompt? Resolve the plan\'s names to this run before handing it over, and let the plan rank its features so a build can go deep on the core first and add the rest in order.'
  ]
};
BZ.ABOUT_PAGES = () => [
  { title: 'ABOUT', logo: true, lines: ['An original over-the-top arcade baseball game. Pitch fireballs, swing a rocket-powered bat, rob homers off the wall, empty the benches in slapstick dust clouds, and save Kernel Field on a barnstorming tour.', 'Version ' + BZ.version + '  ·  engine ' + (E.versionLabel ? E.versionLabel() : E.version), 'Controls: stick/WASD/mouse aim · ✕/Space/click swing · □/J/right-click power · △/I bunt · R1/E Batzooka · Options/Esc pause.', 'Modes: Tour, Exhibition (1-4 players), Batzooka Derby, Spring Training. Online: AI Hub Derby rounds.'] },
  { title: 'SOURCE INFORMATION', lines: BZ.INFO.source },
  { title: 'TESTING FEEDBACK', lines: BZ.INFO.testing },
  { title: 'ENGINE FEEDBACK', lines: BZ.INFO.engine },
  { title: 'PROMPT FEEDBACK', lines: BZ.INFO.prompt },
  { title: 'CREDITS', lines: ['Design, code, art, music and writing: Claude (Anthropic, claude-opus-5-5, reasoning effort xhigh), built from PLAN.md.', 'Engine: my-3D2dge v0.85.2 (MIT License), github.com/michaelcrosato/my-3d2dge.', 'Online: AI Hub Session client 1.4.0 (michaelcrosato/ai-hub).', 'Motion: procedural (the engine\'s rig system). Asset sets: none beyond the engine\'s core library.', 'All teams, players, parks and lines are original. No real players, teams or quotes.', 'Thanks for playing!'] }
];
BZ.CREDITS = () => ['BATZOOKA BASEBALL', '', 'THE KABOOM CUP IS HOME', '', 'DESIGN, CODE, ART, MUSIC, WRITING', 'Claude (Anthropic, claude-opus-5-5, xhigh)', '', 'ENGINE', 'my-3D2dge v0.85.2 (MIT)', '', 'ONLINE', 'AI Hub Session client 1.4.0', '', 'STARRING', 'Dot "Dynamite" Delgado', 'Grandpa Ike Kowalski', 'Pep and Pip Porter', 'Moose Magnusson', 'Sunny Sato', 'Rosa "Radar" Reyes', 'Lefty Luna', 'Hank "Hambone" Hollis', 'Kid Kernel', '', 'THE RIVALS', 'Captain Bettina Brine', 'Iggy "The Igniter" Blaze', 'Commander Cosmo Vega', 'Count Rattlebones', 'ENFORCER-9000', '', 'IN THE BOOTH', 'Hap Harrigan', 'Big Lou Bombeck', 'Gloria Vox', 'Umpire Barb Hammersmith', '', 'AND', 'Mortimer Megamax, as himself', 'Popcorn Pete, as the mascot', '', 'NO BASEBALLS WERE HARMED.', 'A FEW JUMBOTRONS WERE.', '', 'THANKS FOR PLAYING!'];

/* ===== src/90-start.js ===== */
/* =============================================================================
 * 90-start: the game object, our settings and pause items, the boot steps (parks,
 * floors, skies, rigs, sounds), the scenes table, deep links (#title #attract
 * #match/<park> #derby #training/<n> #tour/<stop> #about #gallery #hubcard
 * #touch), the AI Hub start, and game.debug: the one handle tests, dev mode and
 * the attract director use.
 * ========================================================================== */
BZ.makeViews();
BZ.hub.detect();
if (BZ.hubActive) { BZ.KEYS.pause = ['Escape', 'KeyP']; BZ.KEYS.start = ['Enter', 'NumpadEnter']; }
BZ.KEYS.options = ['Pad9'];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#05060c', input: BZ.KEYS,
  menu: { items: () => BZ.pauseItems(), settings: BZ.SETTINGS, controls: BZ.ACTION_NAMES, quit: BZ.hubActive ? false : 'title', saves: { slots: 3, version: 1 } } });
BZ.game = game;
BZ.headless = !!game.headless;
BZ.cosmetic = !game.headless;
BZ.installShapes();
BZ.defineSounds(game);
BZ.tour.install(game);
BZ.arcade = new E.Arcade(game, { id: 'batzooka', hud: false, scores: 6 });
BZ.installDom(game);
BZ.loadTune();
if (BZ.hubActive) game.o.menu.quit = false;
// in a session the hub owns Create + Options; any input clears the touch-only card
BZ.sfxVaryZero = false;

/* ---- boot: heavy setup in steps behind the boot screen ---- */
const BOOT = [
  ['Building six ballparks', () => { for (const id of BZ.PARK_ORDER) BZ.park(id); }],
  ['Painting skies and Mode 7 floors', () => { if (!BZ.cosmetic) return; for (const id of BZ.PARK_ORDER) { BZ.backdrop(id); BZ.mode7(id); } }],
  ['Dressing the teams', () => { if (!BZ.cosmetic) return; for (const T of BZ.all('teams')) for (const p of T.players) for (const job of ['bat', 'run', 'field', 'pitch', 'catch', 'bench', 'fight']) BZ.rigFor(p, job); BZ.umpireRig(); for (const k of Object.keys(BZ.CAST)) BZ.castRig(k); }],
  ['Tuning the ballpark organ', () => { BZ.defineSounds(game); }]
];

/* ---- deep links ---- */
BZ.deepLink = () => {
  const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, ''), [k, a] = h.split('/');
  if (BZ.hubActive) return null;
  if (k === 'attract') { BZ.attract.start(); return true; }
  if (k === 'match') { BZ.startMatch({ mode: 'exhibition', park: a || 'kernel', away: 'krakens', home: (BZ.get('parks', a || 'kernel') || {}).team || 'comets', innings: 3, humans: { 0: [], 1: [game.input] }, seed: 5 }); return true; }
  if (k === 'derby') { game.go('derby', { players: 1, park: a || 'kernel' }); return true; }
  if (k === 'training') { BZ.training.start(clamp((+a || 1) - 1, 0, 7)); return true; }
  if (k === 'tour') { BZ.tour.newTour(); const i = clamp(+a || 1, 1, 5); BZ.tour.d().tour.stop = i - 1; BZ.tour.playNext(); return true; }
  if (k === 'about') { game.go('about'); return true; }
  if (k === 'sim') { BZ.startMatch({ mode: 'exhibition', park: a || 'kernel', away: 'eruptors', home: (BZ.get('parks', a || 'kernel') || {}).team || 'comets', innings: 9, humans: { 0: [], 1: [] }, seed: 21, cpuLevel: 'allstar' }); return true; }
  if (k === 'gallery') { game.go('gallery'); return true; }
  if (k === 'hubcard') { BZ.hub.mockCard(); return true; }
  return null;
};
BZ.scenes.boot = {
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt;
    if (this.t < .02) return;
    if (BZ.hubActive && !BZ.hub.mock) { if (BZ.hub.phase === 'none') BZ.hub.begin(); return; }
    if (!BZ.deepLink()) game.go('title', null, { fade: .3 });
  },
  draw(r) { r.sky(['#05040e', '#1a1040']); r.overlay(g => { if (BZ.hubActive) E.font.text(g, 'Joining the round...', r.W / 2, r.H / 2, '#ffffff', { align: 'center', scale: 1 }); }); }
};

/* ---- game.debug: tests, dev mode and the attract director ---- */
BZ.debug = game.debug = {
  snapshot() {
    const M = BZ.M, b = M && M.ball, P = M && M.park;
    return {
      scene: game.sceneName, phase: M ? M.phase : null, sub: M && M.ab ? M.ab.sub : null, inning: M && M.inning, half: M && M.half, outs: M && M.outs, balls: M && M.balls, strikes: M && M.strikes,
      score: M ? [M.teams[0].runs, M.teams[1].runs] : null, bases: M ? M.bases.map(p => p && p.id) : null, batter: M && M.batter && M.batter.id, pitcher: M && M.pitcher && M.pitcher.id,
      ball: b ? { x: Math.round(b.x - P.H.x), y: Math.round(b.y - P.H.y), z: Math.round(b.z), vx: Math.round(b.vx), vy: Math.round(b.vy), vz: Math.round(b.vz), mode: b.mode } : null,
      lastContact: M && M.lastContact, meters: M ? [Math.round(M.teams[0].meter), Math.round(M.teams[1].meter)] : null, turbo: M ? [Math.round(M.teams[0].turbo), Math.round(M.teams[1].turbo)] : null,
      fielders: M ? M.fielders.map(f => ({ pos: f.pos, x: Math.round(f.x - P.H.x), y: Math.round(f.y - P.H.y), state: f.state })) : [],
      runners: M ? M.runners.map(r => ({ id: r.player.id, base: r.base, target: r.goal, p: +r.p.toFixed(2), state: r.state })) : [],
      cam: BZ.cams.replay ? 'replay' : BZ.cams.moon ? 'moonshot' : BZ.cams.mode === 'field' ? 'broadcast' : 'plate', result: M && M.result,
      tour: { stop: BZ.tour.d().tour.stop, fb: BZ.tour.d().fb, done: BZ.tour.d().tour.done }, attract: { on: BZ.attract.on, segment: BZ.attract.seg },
      hub: { active: BZ.hubActive, phase: BZ.hub.phase, score: BZ.hub.D ? BZ.hub.D.P.score : 0, sent: BZ.hub.msgs, reported: BZ.hub.reported }, dev: { open: BZ.dev.on, tab: BZ.DEV_TABS[BZ.dev.tab] },
      touchOnly: BZ.touchOnly, device: game.input.lastDevice, glyphs: BZ.family(), lesson: M && M.lesson ? { id: M.lesson.def.id, prog: M.lesson.prog, passed: M.lesson.passed } : null,
      derby: BZ.M && BZ.M.derby ? { state: BZ.M.derby.state, scores: BZ.M.derby.players.map(p => p.score), outs: BZ.M.derby.players.map(p => p.outs) } : null, errors: game.errors.length
    };
  },
  /** place a situation at once */
  setup(o = {}) {
    const M = BZ.M; if (!M) return;
    for (const k of ['inning', 'half', 'outs', 'balls', 'strikes']) if (o[k] !== undefined) M[k] = o[k];
    if (o.score) { M.teams[0].runs = o.score[0]; M.teams[1].runs = o.score[1]; }
    if (o.bases) { const O = BZ.offense(M); M.bases = o.bases.map((on, i) => on ? (typeof on === 'object' ? on : O.lineup[(O.order + 5 + i) % 9]) : null); }
    if (o.meters) { M.teams[0].meter = o.meters[0]; M.teams[1].meter = o.meters[1]; }
    if (o.turbo) { M.teams[0].turbo = o.turbo[0]; M.teams[1].turbo = o.turbo[1]; }
    if (o.seed !== undefined) BZ.seed(o.seed);
    if (o.batterIdx !== undefined) BZ.offense(M).order = o.batterIdx;
    BZ.match.setupDefense(M);
  },
  /** force outcomes: { nextPitch: { type, x, z, q }, contact: 'perfect' | 'miss' | { timingMs, dx, dz }, hazard: 'now', rhubarb: true, homer: true } */
  force(o = {}) {
    const M = BZ.M; if (!M) return;
    if (o.nextPitch) M.forcePitch = { type: o.nextPitch.type || 'heater', target: [o.nextPitch.x || 0, o.nextPitch.z || 17], q: o.nextPitch.q === undefined ? 1 : o.nextPitch.q, slot: o.nextPitch.slot };
    if (o.contact) M.forceContact = o.contact;
    if (o.hazard) BZ.hazards.now(M);
    if (o.rhubarb && M.ab) BZ.rhubarb.start(M, 'debug');
    if (o.homer) M.cheats.homer = true;
  },
  get tune() { return BZ.TUNE; }, resetTune: () => BZ.resetTune(),
  get events() { return BZ.bus.ring; },
  bot: { on: (side, o) => BZ.bot.on(side, o), off: side => BZ.bot.off(side) },
  step(n = 1) { for (let i = 0; i < n; i++) game.advance(1 / 120); },
  skip() { const M = BZ.M; if (M && M.cinematic) M.cinematic.done = true; BZ.cams.replay = null; if (BZ.cams.moon) { const cb = BZ.cams.moon.then; BZ.cams.moon = null; game.timeScale = TUNE.gameSpeed; if (cb) cb(); } if (BZ.talk.cutscene) BZ.talk.endCut(); },
  warp(scene, data) { BZ.attract.on = false; game.go(scene, data, { fade: 0 }); },
  hubMock() { return BZ.hub.mockCard(); }
};

game.start({ scenes: BZ.scenes, scene: 'boot', boot: { title: 'BATZOOKA BASEBALL', steps: BOOT } });

})();
