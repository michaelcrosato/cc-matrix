/* SKILLER7 bundle — built 2026-11-04 11:08 from 47 files */
const __S7_BUILD__ = "2026-11-04 11:08";
(() => {
'use strict';

/* ===== src/00-core.js ===== */
/* SKILLER7 — core: the namespace, the event bus, registries, seeded random streams, units and small math.
 * Everything in src/ and content/ is concatenated into one classic script (tools/build.mjs) that defines globalThis.S7
 * and starts nothing; S7.start() (src/99-start.js) makes the game. The sim never touches three.js or the DOM. */
const E = My3D2dge;
const S7 = globalThis.S7 = globalThis.S7 || {};
S7.E = E;
S7.VERSION = '1.0.0';
S7.BUILD = typeof __S7_BUILD__ !== 'undefined' ? __S7_BUILD__ : 'dev';
const M = S7.M = 16;                         // world units per metre (one tile)
const TAU = Math.PI * 2;
const { clamp, lerp } = E;
const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';

/* ---- the event bus: the sim emits, audio, effects, the HUD and tutorials listen (they never change sim state) ---- */
S7.bus = {
  _h: {},
  on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return () => this.off(type, fn); },
  off(type, fn) { const l = this._h[type]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(type, data) { const l = this._h[type]; if (!l) return; for (const fn of l.slice()) { try { fn(data || {}); } catch (e) { if (S7.game) S7.game.fail('bus:' + type, e); else throw e; } } },
  clear() { this._h = {}; }
};

/* ---- registries: content is data (areas, personas, weapons, enemies, items, beats, songs, voices) ---- */
S7.AREAS = {}; S7.PERSONAS = {}; S7.WEAPONS = {}; S7.ENEMIES = {}; S7.ITEMS = {}; S7.BEATS = {}; S7.SONGS = {}; S7.VOICES = {};
S7.TALKS = {}; S7.PEOPLE = {};
S7.area = (id, def) => { def.id = id; S7.AREAS[id] = def; return def; };
S7.persona = (id, def) => { def.id = id; S7.PERSONAS[id] = def; return def; };
S7.weapon = (id, def) => { def.id = id; S7.WEAPONS[id] = def; return def; };
S7.enemy = (id, def) => { def.id = id; S7.ENEMIES[id] = def; return def; };
S7.item = (id, def) => { def.id = id; S7.ITEMS[id] = def; return def; };
S7.beat = (id, fn) => { S7.BEATS[id] = fn; return fn; };
S7.song = (id, def) => { S7.SONGS[id] = def; return def; };
S7.voice = (id, def) => { S7.VOICES[id] = def; return def; };
/** a conversation: a list of lines [speaker, text] or { card } / { choice } entries (content/story) */
S7.talk = (id, lines) => { S7.TALKS[id] = lines; return lines; };
S7.person = (id, def) => { def.id = id; S7.PEOPLE[id] = def; return def; };

/* ---- seeded random streams: the sim draws only from these (never Math.random), so a seed and inputs give one game ---- */
S7.RNG = {
  seed: 7,
  streams: {},
  reset(seed) { this.seed = seed >>> 0; this.streams = {}; },
  /** a named stream: S7.rng('spawn')() -> [0, 1) */
  get(name) {
    let s = this.streams[name];
    if (!s) { let h = 2166136261 ^ this.seed; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619); s = this.streams[name] = { n: 0, st: h >>> 0 }; }
    return s;
  },
  next(name) {   // mulberry32 on the stream's state
    const s = this.get(name); s.n++;
    let t = (s.st = (s.st + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  state() { const o = {}; for (const k in this.streams) o[k] = this.streams[k].st; return o; }
};
S7.rnd = name => S7.RNG.next(name);
S7.range = (name, a, b) => a + (b - a) * S7.RNG.next(name);
S7.pick = (name, list) => list[Math.floor(S7.RNG.next(name) * list.length) % list.length];

/* ---- math ---- */
const V = S7.V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dist2: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
  /** the unit direction of yaw (from +x toward +y) and pitch (up positive) */
  dir: (yaw, pitch) => [Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)],
  lerp3: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
};
/** the shortest signed angle from a to b */
S7.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
S7.wrapAng = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
/** a ray (origin o, unit dir d) against a sphere (centre c, radius r): the distance along the ray, or -1 */
S7.raySphere = (o, d, c, r) => {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return -1;
  const s = Math.sqrt(h), t0 = -b - s, t1 = -b + s;
  return t0 >= 0 ? t0 : t1 >= 0 ? 0 : -1;
};
/** a ray against a vertical capsule (feet at c, height h, radius r): the distance, or -1 */
S7.rayCapsule = (o, d, c, h, r) => {
  // nearest approach between the ray and the segment c..c+h (z), then a sphere test there
  let best = -1;
  const steps = Math.max(2, Math.ceil(h / r));
  for (let i = 0; i <= steps; i++) {
    const z = c[2] + r + (h - 2 * r) * (i / steps);
    const t = S7.raySphere(o, d, [c[0], c[1], z], r);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  return best;
};
/** distance from point p to segment a-b (3D) */
S7.segDist = (p, a, b) => {
  const ab = V.sub(b, a), t = clamp(V.dot(V.sub(p, a), ab) / (V.dot(ab, ab) || 1), 0, 1);
  return V.dist(p, V.add(a, V.mul(ab, t)));
};
S7.ease = { out: t => 1 - (1 - t) * (1 - t), inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, smooth: t => t * t * (3 - 2 * t) };
/** a stable 32-bit hash of numbers and strings (the sim hash) */
S7.hashOf = (list) => {
  let h = 2166136261;
  const mix = v => { h = Math.imul(h ^ (v & 0xffff), 16777619); h = Math.imul(h ^ (v >>> 16), 16777619); };
  for (const x of list) {
    if (typeof x === 'number') mix(Math.round(x * 64) | 0);
    else if (typeof x === 'string') for (let i = 0; i < x.length; i++) mix(x.charCodeAt(i));
    else if (typeof x === 'boolean') mix(x ? 1 : 2);
    else mix(0);
  }
  return (h >>> 0).toString(16);
};
/** format seconds as m:ss.t */
S7.fmtTime = (s, tenths = true) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + (tenths ? r.toFixed(1) : Math.floor(r)); };
/** a tile coordinate list [x, y, z?] (metres) to world units, z defaulting to null */
S7.tw = t => [t[0] * M, t[1] * M, t.length > 2 && t[2] !== null && t[2] !== undefined ? t[2] * M : null];
S7.storeGet = (k, d) => { try { if (typeof localStorage === 'undefined') return d; const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
S7.storeSet = (k, v) => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: kept for the visit */ } };
S7.HAS_DOM = HAS_DOM;
S7.THINGS3D = {}; S7.SPOT3D = {};


/* ===== src/02-tuning.js ===== */
/* TUNING: the gameplay variables the dev mode exposes as live sliders (Pause → Dev Mode → Tuning), with their defaults,
 * ranges and a reset. Values persist in localStorage 's7:dev' (never in an AI Hub session). The sim reads T.key. */
const TUNING = S7.TUNING = {
  walkSpeed:     { def: 85,   min: 40,  max: 200, step: 5,    label: 'Walk speed',            fmt: v => v + ' u/s' },
  skiTop:        { def: 190,  min: 100, max: 400, step: 10,   label: 'Ski top speed',         fmt: v => v + ' u/s' },
  padSensK:      { def: 1,    min: .5,  max: 2,   step: .05,  label: 'Aim sensitivity (pad)', fmt: v => v.toFixed(2) + '×' },
  assistK:       { def: 1,    min: 0,   max: 1,   step: .05,  label: 'Aim assist strength',   fmt: v => Math.round(v * 100) + '%' },
  enemySpeed:    { def: 1,    min: .3,  max: 2,   step: .05,  label: 'Enemy speed ×',         fmt: v => v.toFixed(2) },
  enemyHP:       { def: 1,    min: .2,  max: 3,   step: .05,  label: 'Enemy HP ×',            fmt: v => v.toFixed(2) },
  playerDamage:  { def: 1,    min: .2,  max: 3,   step: .05,  label: 'Player damage ×',       fmt: v => v.toFixed(2) },
  warmRadius:    { def: 1,    min: .5,  max: 2.5, step: .05,  label: 'Warm spot radius ×',    fmt: v => v.toFixed(2) },
  scanRadius:    { def: 40,   min: 10,  max: 80,  step: 1,    label: 'Scan radius',           fmt: v => v + ' m' },
  revealTime:    { def: 6,    min: 1,   max: 15,  step: .5,   label: 'Reveal time',           fmt: v => v.toFixed(1) + ' s' },
  spawnRate:     { def: 1,    min: .3,  max: 2,   step: .05,  label: 'Spawn rate ×',          fmt: v => v.toFixed(2) },
  explodeDamage: { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Explosion damage ×',    fmt: v => v.toFixed(2) },
  redDrop:       { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Red drop ×',            fmt: v => v.toFixed(2) },
  rimeDrop:      { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Rime drop ×',           fmt: v => v.toFixed(2) },
  healRate:      { def: 40,   min: 10,  max: 200, step: 5,    label: 'Heal rate',             fmt: v => v + ' HP/s' },
  timeScale:     { def: 1,    min: .1,  max: 2,   step: .05,  label: 'Time scale',            fmt: v => v.toFixed(2) + '×' },
  celBands:      { def: 3,    min: 2,   max: 8,   step: 1,    label: 'Cel bands',             fmt: v => String(v) },
  inkStrength:   { def: 1,    min: 0,   max: 1.5, step: .05,  label: 'Ink strength',          fmt: v => v.toFixed(2) },
  fogFar:        { def: 1,    min: .3,  max: 3,   step: .05,  label: 'Fog far ×',             fmt: v => v.toFixed(2) }
};
const T = S7.T = {};
const CHEATS = S7.CHEATS = {
  god:      { label: 'God mode' },
  infRed:   { label: 'Infinite Red' },
  oneHit:   { label: 'One-hit kills' },
  revealAll:{ label: 'Reveal all' },
  ghost:    { label: 'Ghost through gates' },
  allPersonas: { label: 'All personas' },
  showRails: { label: 'Show rails and nodes' },
  showHits: { label: 'Show hit volumes and warm spots' },
  showShots: { label: 'Show camera shots' },
  freeCam:  { label: 'Free camera' },
  hideHud:  { label: 'Hide HUD' },
  slowCrit: { label: 'Slow motion on crits' },
  showFps:  { label: 'Show FPS and sim hash' }
};
const CHEAT = S7.CHEAT = {};
S7.tuningReset = (keys) => { for (const k of keys || Object.keys(TUNING)) T[k] = TUNING[k].def; S7.tuningSave(); };
S7.cheatsReset = () => { for (const k in CHEATS) CHEAT[k] = false; S7.tuningSave(); };
S7.tuningSave = () => { if (S7.noPersist) return; S7.storeSet('s7:dev', { T, CHEAT }); };
S7.tuningLoad = () => {
  S7.tuningReset(); S7.cheatsReset();
  if (S7.noPersist) return;
  const d = S7.storeGet('s7:dev', null);
  if (d && d.T) for (const k in d.T) if (TUNING[k] && typeof d.T[k] === 'number') T[k] = clamp(d.T[k], TUNING[k].min, TUNING[k].max);
  if (d && d.CHEAT) for (const k in d.CHEAT) if (CHEATS[k]) CHEAT[k] = !!d.CHEAT[k];
};
S7.tuningReset(); S7.cheatsReset();

/* ---- difficulty (§7.25): the player's setting, changeable mid-game ---- */
const DIFF = S7.DIFF = {
  bunny:   { label: 'BUNNY HILL', line: 'Slower Whiteouts, softer blows, longer reveals.', dmg: .5, speed: .85, reveal: 1.5, red: 1.3, assist: 'high', avalanche: .85 },
  piste:   { label: 'PISTE', line: 'The mountain as it was meant to be skied.', dmg: 1, speed: 1, reveal: 1, red: 1, assist: 'low', avalanche: 1 },
  offpiste:{ label: 'OFF-PISTE', line: 'Faster, harder, darker. No assist.', dmg: 1.5, speed: 1.15, reveal: .7, red: .8, assist: 'off', avalanche: 1.1 }
};


/* ===== src/05-input.js ===== */
/* INPUT: the Skiller7 preset (every action rebindable on the standard Controls screen), the intent layer (devices →
 * intents; the bot makes the same intents), last-device tracking for prompts, the idle timer for attract mode, and the
 * touch-only check. Gamepad codes follow the standard mapping: Pad0 ✕/A, Pad1 ○/B, Pad2 □/X, Pad3 △/Y, Pad4 L1, Pad5 R1,
 * Pad6 L2, Pad7 R2, Pad8 Create/View, Pad9 Options/Menu, Pad12-15 the d-pad. */
const INPUT = S7.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  move: ['KeyW', 'ArrowUp', 'Pad0'],
  turn: ['KeyS', 'ArrowDown', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad3'],
  heal: ['KeyH', 'Pad2'],
  ring: ['Tab', 'Pad4'],
  skill: ['KeyQ', 'Pad5'],
  aim: ['Mouse2', 'Pad6'],
  fire: ['Mouse0', 'Pad7'],
  scan: ['Space', 'Mouse1', 'Pad4'],
  reload: ['KeyR', 'Pad2'],
  map: ['KeyM', 'Pad8'],
  pageL: ['KeyQ', 'Pad4'], pageR: ['KeyE', 'Pad5'],
  reset1: ['Backspace', 'Pad3'], resetPage: ['Delete', 'Pad2'],
  p1: ['Digit1', 'Numpad1'], p2: ['Digit2', 'Numpad2'], p3: ['Digit3', 'Numpad3'], p4: ['Digit4', 'Numpad4'], p5: ['Digit5', 'Numpad5'], p6: ['Digit6', 'Numpad6'], p7: ['Digit7', 'Numpad7'],
  d0: ['Digit0', 'Numpad0'], d8: ['Digit8', 'Numpad8'], d9: ['Digit9', 'Numpad9']
};
/** names on the Controls screen (false hides one from rebinding) */
S7.CONTROL_NAMES = {
  move: 'Move (hold) / tuck', turn: 'Quick turn / hockey stop', interact: 'Check / interact', heal: 'Drink Red (hold)',
  ring: 'Featherbed ring (hold)', skill: 'Skill', aim: 'Aim', fire: 'Fire', scan: 'Scan', reload: 'Reload', map: 'Map',
  pageL: false, pageR: false, reset1: false, resetPage: false, p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false, d0: false, d8: false, d9: false
};

/* ---- touch-only devices (§6.5): a coarse pointer, no fine one, touch points, no pad and no key yet ---- */
S7.touchOnly = () => {
  if (!HAS_DOM || typeof matchMedia !== 'function') return false;
  if (S7.Input && (S7.Input.sawKey || S7.Input.sawPad)) return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine && (navigator.maxTouchPoints || 0) > 0;
};

S7.Input = {
  sawKey: false, sawPad: false, idle: 0, lastReal: 0, wheel: 0, flickT: 0, flickArmed: true, aimToggled: false,
  /** hooked once at start: DOM listeners for the idle timer (wheel, mouse moves) and the "seen a key or pad" flags */
  init(game) {
    this.game = game;
    if (!HAS_DOM) return;
    this.wall = typeof performance !== 'undefined';   // in a page the idle timer is real time (a slow frame doesn't stretch it)
    this.lastAt = this.wall ? performance.now() : 0;
    const bump = () => { this.idle = 0; if (this.wall) this.lastAt = performance.now(); };
    addEventListener('keydown', e => { this.sawKey = true; bump(); if (S7.onAnyInput) S7.onAnyInput('key', e); }, true);
    addEventListener('pointerdown', e => { bump(); if (S7.onAnyInput) S7.onAnyInput(e.pointerType === 'touch' ? 'touch' : 'mouse', e); }, true);
    addEventListener('wheel', e => { bump(); this.wheel += Math.sign(e.deltaY); if (S7.onAnyInput) S7.onAnyInput('wheel', e); }, { passive: true, capture: true });
    let mx = null, my = null;
    addEventListener('mousemove', e => {
      if (mx !== null && Math.hypot(e.clientX - mx, e.clientY - my) > 6) { bump(); if (S7.onAnyInput) S7.onAnyInput('move', e); mx = e.clientX; my = e.clientY; }
      if (mx === null) { mx = e.clientX; my = e.clientY; }
    }, true);
    addEventListener('touchstart', e => { bump(); if (S7.onAnyInput) S7.onAnyInput('touch', e); }, { passive: true, capture: true });
    addEventListener('gamepadconnected', () => { this.sawPad = true; });
  },
  /** each step: the idle timer (any action, stick or pad button resets it) */
  tick(dt) {
    const I = this.game.input;
    if (this.wall) this.idle = (performance.now() - this.lastAt) / 1000; else this.idle += dt;
    const pm = I.padMove || [0, 0], pa = I.padAim;
    if (I.anyPressed() || Math.hypot(pm[0], pm[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3)) { this.idle = 0; if (this.wall) this.lastAt = performance.now(); if (I.lastDevice === 'gamepad') this.sawPad = true; }
    if (I.lastDevice === 'gamepad') this.sawPad = true;
  },
  reset() { this.idle = 0; if (this.wall) this.lastAt = performance.now(); },
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; },
  /** the device prompts follow: 'gamepad' or 'kbm' */
  family() { const d = this.game && this.game.input.lastDevice; return d === 'gamepad' ? 'gamepad' : 'kbm'; }
};

/** a prompt's label for an action on the device used last ('✕', 'A', 'W', 'Right click'...) */
S7.label = (act) => {
  const I = S7.game.input;
  if (I.lastDevice === 'touch') return I.label(act, 'keyboard');
  return I.label(act);
};

/** read the devices into this step's intents (play scene). mouseDelta comes from the presenter's pointer lock (3D
 *  camera capture) and is [0, 0] headless */
S7.readIntents = (game, ui) => {
  const I = game.input, pm = I.padMove || [0, 0], pa = I.padAim || null, st = S7.Input;
  const dev = I.lastDevice;
  const intents = {
    device: dev === 'gamepad' ? 'gamepad' : dev === 'mouse' ? 'mouse' : 'keyboard',
    move: I.down('move') || pm[1] < -.5,
    stick: [pm[0], pm[1]],
    turnP: I.pressed('turn'),
    leftP: I.pressed('left'), rightP: I.pressed('right'), upP: I.pressed('up'), downP: I.pressed('down'),
    interactP: I.pressed('interact'), interactD: I.down('interact'),
    healD: I.down('heal'),
    ringD: I.down('ring'), ringP: I.pressed('ring'), ringR: I.released('ring'),
    pick: null,
    skillP: I.pressed('skill'), skillD: I.down('skill'),
    aimD: I.down('aim'), aimP: I.pressed('aim'),
    fireD: I.down('fire'), fireP: I.pressed('fire'),
    scanP: I.pressed('scan'), reloadP: I.pressed('reload'), mapP: I.pressed('map'),
    confirmP: I.pressed('confirm'), cancelP: I.pressed('cancel'),
    lookStick: pa ? [pa[0], pa[1]] : [0, 0],
    mouse: S7.mouseDelta ? S7.mouseDelta() : [0, 0],
    pointer: I.pointer ? I.pointer() : null,
    clicked: I.clicked ? I.clicked() : null,
    branchPick: null, spotPick: null, ringPick: null
  };
  for (let k = 1; k <= 7; k++) if (I.pressed('p' + k)) intents.pick = k - 1;
  // a quick flick of the left stick down is a quick turn (§6.1)
  if (pm[1] > .85 && st.flickArmed) { if (st.flickT < .14) intents.turnP = true; st.flickArmed = false; }
  if (Math.hypot(pm[0], pm[1]) < .3) { st.flickArmed = true; st.flickT = 0; } else st.flickT += game.dt || 1 / 120;
  // the mouse in the world: hover/click on markers (filled by the HUD from its last projection)
  if (ui && ui.worldPick) ui.worldPick(intents);
  return intents;
};
/** the empty intents (cutscenes, the bot's base) */
S7.noIntents = () => ({ device: 'keyboard', move: false, stick: [0, 0], turnP: false, leftP: false, rightP: false, upP: false, downP: false, interactP: false, interactD: false, healD: false, ringD: false, ringP: false, ringR: false, pick: null, skillP: false, skillD: false, aimD: false, aimP: false, fireD: false, fireP: false, scanP: false, reloadP: false, mapP: false, confirmP: false, cancelP: false, lookStick: [0, 0], mouse: [0, 0], pointer: null, clicked: null, branchPick: null, spotPick: null, ringPick: null, lookAbs: null });


/* ===== src/10-level.js ===== */
/* LEVEL GRID: one source for both the 3D world and the sim. An indoor area is written as rectangles (rooms, raised
 * floors, stairs, pillars) that become World3D text rows and a legend; an outdoor area is a terrain height function.
 * The sim's LevelGrid answers floor heights, line of sight, rays (hitscan) and flow fields (Whiteouts' paths). */
const CHARS = '.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOQRSTUVWXYZ0123456789!$%&*+,-/:;<=>?[]^_{|}~';

/** build { rows, legend, cells } from an area's world spec (tiles and metres) */
S7.buildRows = (W) => {
  const w = W.w, h = W.h, cells = [];
  const wallH = (W.wallH || 4) * M;
  for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push({ k: 'wall', h: wallH }); cells.push(row); }
  const each = (r, fn) => { for (let y = Math.max(0, r[1]); y < Math.min(h, r[3]); y++) for (let x = Math.max(0, r[0]); x < Math.min(w, r[2]); x++) fn(cells[y][x], x, y); };
  for (const r of W.rooms || []) each(r, c => { c.k = 'floor'; c.h = (r[4] || 0) * M; c.tag = r[5] || null; });
  for (const r of W.walls || []) each(r, c => { c.k = 'wall'; c.h = (r[4] || W.wallH || 4) * M; });
  for (const r of W.raised || []) each(r, c => { c.k = 'floor'; c.h = r[4] * M; });
  for (const r of W.pits || []) each(r, c => { c.k = 'pit'; c.h = 0; });
  for (const p of W.pillars || []) { const c = cells[p[1]] && cells[p[1]][p[0]]; if (c) { c.k = 'pillar'; c.h = (p[2] || W.wallH || 4) * M; } }
  // stairs: [x0, y0, x1, y1, dir 'n'|'s'|'e'|'w', fromM, toM]: each tile row (or column) along dir rises an equal share
  for (const s of W.stairs || []) {
    const [x0, y0, x1, y1, dir, a, b] = s, n = dir === 'n' || dir === 's' ? y1 - y0 : x1 - x0;
    void n;
    each(s, (c) => { c.k = 'stairs'; c.dir = dir; c.from = a * M; c.h = b * M; c.box = [x0, y0, x1, y1]; });
  }
  // legend characters for each distinct spec
  const legend = {}, key2ch = {}, rows = [];
  let ci = 1;
  const keyOf = c => c.k + ':' + c.h + ':' + (c.dir || '') + ':' + (c.from || 0) + ':' + (c.box ? c.box.join(',') : '');
  for (let y = 0; y < h; y++) {
    let s = '';
    for (let x = 0; x < w; x++) {
      const c = cells[y][x], k = keyOf(c);
      let ch = key2ch[k];
      if (!ch) {
        if (c.k === 'floor' && c.h === 0) ch = '.';
        else { ch = CHARS[ci++]; if (!ch) throw new Error('level: too many distinct tiles'); }
        key2ch[k] = ch;
        legend[ch] = c.k === 'wall' ? { wall: c.h, cut: false, color: W.wallColor, top: W.wallTop, line: W.wallLine } : c.k === 'pillar' ? { pillar: c.h, color: W.pillarColor } : c.k === 'pit' ? { pit: true } : c.k === 'stairs' ? { stairs: c.dir, from: c.from, floor: c.h, color: W.stairColor } : { floor: c.h };
        if (c.k === 'floor' && c.h > 0) { if (W.raisedSide) legend[ch].side = W.raisedSide; if (W.raisedColor) legend[ch].color = W.raisedColor; }
        for (const k in legend[ch]) if (legend[ch][k] === undefined) delete legend[ch][k];
      }
      s += ch;
    }
    rows.push(s);
  }
  return { rows, legend, cells };
};

class LevelGrid {
  /** area: the area's definition (its world: { kind: 'level', ... } or { kind: 'terrain', height }) */
  constructor(area) {
    const W = area.world;
    this.kind = W.kind || 'level';
    this.blocks = (area.blocks || []).map(b => [b[0] * M, b[1] * M, b[2] * M, b[3] * M, b[4] * M, b[5] * M]);
    this.dynBlocks = [];   // gates that open remove theirs (id → box)
    if (this.kind === 'terrain') {
      this.height = W.height;
      this.size = W.size || 32768;
      this.w = Math.ceil(this.size / M); this.h = this.w;
    } else {
      const b = S7.buildRows(W);
      this.rows = b.rows; this.legend = b.legend; this.cells = b.cells;
      this.w = W.w; this.h = W.h;
    }
    this._flows = {};
  }
  cell(cx, cy) { if (this.kind === 'terrain') return null; return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h ? this.cells[cy][cx] : null; }
  /** the floor's height (units) at a point: stairs interpolate, walls count as their top */
  floorAt(x, y) {
    if (this.kind === 'terrain') return this.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M), c = this.cell(cx, cy);
    if (!c) return 0;
    if (c.k === 'stairs') {
      const [x0, y0, x1, y1] = c.box, fx = (x / M - x0) / (x1 - x0), fy = (y / M - y0) / (y1 - y0);
      const t = clamp(c.dir === 'n' ? 1 - fy : c.dir === 's' ? fy : c.dir === 'e' ? fx : 1 - fx, 0, 1);
      return c.from + (c.h - c.from) * t;
    }
    if (c.k === 'pit') return -200;
    return c.h;
  }
  walkable(cx, cy) { const c = this.cell(cx, cy); return !!c && (c.k === 'floor' || c.k === 'stairs'); }
  /** is the point inside something solid (a wall column, a pillar, below the floor, a block)? */
  solidAt(x, y, z) {
    if (this.kind === 'terrain') { if (z < this.height(x, y) - 1) return true; }
    else {
      const c = this.cell(Math.floor(x / M), Math.floor(y / M));
      if (!c) return z < 400;
      if ((c.k === 'wall' || c.k === 'pillar') && z < c.h) return true;
      if ((c.k === 'floor' || c.k === 'stairs') && z < this.floorAt(x, y) - 1) return true;
    }
    for (const b of this.blocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    for (const b of this.dynBlocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    return false;
  }
  /** march a ray: the distance to the first solid point within len, or Infinity */
  ray(o, d, len, step = 3) {
    for (let t = step; t <= len; t += step) {
      const x = o[0] + d[0] * t, y = o[1] + d[1] * t, z = o[2] + d[2] * t;
      if (this.solidAt(x, y, z)) {
        // refine
        let lo = t - step, hi = t;
        for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (this.solidAt(o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m)) hi = m; else lo = m; }
        return lo;
      }
    }
    return Infinity;
  }
  /** a clear line between two points? */
  los(a, b, step = 4) {
    const d = V.sub(b, a), L = V.len(d);
    if (L < 1) return true;
    if (this.kind === 'terrain') step = Math.max(step, L / 60);   // (a terrain's height is smooth: sixty samples are plenty)
    return this.ray(a, V.mul(d, 1 / L), L - 2, step) === Infinity;
  }
  /** a flow field toward tile (tx, ty) (indoor only): BFS distances, cached per target tile */
  flow(tx, ty) {
    if (this.kind === 'terrain') return null;
    tx = clamp(tx, 0, this.w - 1); ty = clamp(ty, 0, this.h - 1);
    const key = tx + ',' + ty;
    if (this._flows[key]) return this._flows[key];
    const W = this.w, H = this.h, dist = new Float32Array(W * H).fill(1e9), q = [];
    const blockedByDyn = (cx, cy) => { const x = (cx + .5) * M, y = (cy + .5) * M; for (const b of this.dynBlocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4]) return true; return false; };
    const ok = (cx, cy) => this.walkable(cx, cy) && !blockedByDyn(cx, cy);
    dist[ty * W + tx] = 0; q.push(tx, ty);
    let qi = 0;
    while (qi < q.length) {
      const x = q[qi++], y = q[qi++], d0 = dist[y * W + x];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!ok(nx, ny)) continue;
        if (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;   // no corner cutting
        const c0 = this.cells[y][x], c1 = this.cells[ny][nx];
        if (Math.abs((c1.h || 0) - (c0.h || 0)) > 18 && c1.k !== 'stairs' && c0.k !== 'stairs') continue;   // no climbing ledges
        const nd = d0 + (dx && dy ? 1.414 : 1);
        if (nd < dist[ny * W + nx]) { dist[ny * W + nx] = nd; q.push(nx, ny); }
      }
    }
    const f = { tx, ty, dist };
    const keys = Object.keys(this._flows); if (keys.length > 24) delete this._flows[keys[0]];
    this._flows[key] = f;
    return f;
  }
  /** the way to go from (x, y) along a flow field: a unit [dx, dy], or null (no path: go straight) */
  flowDir(f, x, y) {
    if (!f) return null;
    const W = this.w, cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= W || cy >= this.h) return null;
    let best = f.dist[cy * W + cx], bx = 0, by = 0;
    if (best >= 1e9) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= this.h) continue;
      const d = f.dist[ny * W + nx]; if (d < best) { best = d; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    // aim at the next tile's centre
    const tx = (cx + bx + .5) * M - x, ty = (cy + by + .5) * M - y, l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  }
  invalidateFlows() { this._flows = {}; }
}
S7.LevelGrid = LevelGrid;


/* ===== src/11-rails.js ===== */
/* RAILS: the rail graph of an area (nodes, edges with dense paths) and the walker that moves along it (§7.1).
 * A walk edge is two-way; ski, lift and jump edges go a → b. A node with two edges is passed through; three or more is a
 * junction where the walker stops and a branch is chosen; doors, exits, NPC stops and lifts stop it too. */
class RailPath {
  /** pts: [[x, y, z|null], ...] in units; zOf(x, y): the floor there; lerpZ: interpolate z between explicit points */
  constructor(pts, zOf, lerpZ) {
    // Catmull-Rom through the control points (2D), sampled every half metre; z from the floor or interpolated
    const P = pts, out = [];
    const ctrlLen = []; let acc = 0; ctrlLen.push(0);
    for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); ctrlLen.push(acc); }
    const zAtCtrl = i => P[i][2] !== null && P[i][2] !== undefined ? P[i][2] : zOf(P[i][0], P[i][1]);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const segL = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(1, Math.ceil(segL / 8));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = P.length > 2 ? cr(p0[0], p1[0], p2[0], p3[0]) : p1[0] + (p2[0] - p1[0]) * t;
        const y = P.length > 2 ? cr(p0[1], p1[1], p2[1], p3[1]) : p1[1] + (p2[1] - p1[1]) * t;
        let z;
        if (lerpZ) z = zAtCtrl(i) + (zAtCtrl(i + 1) - zAtCtrl(i)) * t;
        else z = (k === 0 && P[i][2] !== null && P[i][2] !== undefined) ? P[i][2] : zOf(x, y);
        out.push([x, y, z]);
      }
    }
    const last = P[P.length - 1]; out.push([last[0], last[1], zAtCtrl(P.length - 1)]);
    this.pts = out; this.cum = [0];
    for (let i = 1; i < out.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1], out[i][2] - out[i - 1][2]));
    this.length = this.cum[this.cum.length - 1];
  }
  _seg(s) {
    const c = this.cum; s = clamp(s, 0, this.length);
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    return [lo, hi, c[hi] > c[lo] ? (s - c[lo]) / (c[hi] - c[lo]) : 0];
  }
  /** { x, y, z, yaw, slope } at distance s */
  at(s) {
    const [i, j, t] = this._seg(s), a = this.pts[i], b = this.pts[j];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hl = Math.hypot(dx, dy) || 1e-6;
    return { x: a[0] + dx * t, y: a[1] + dy * t, z: a[2] + dz * t, yaw: Math.atan2(dy, dx), slope: dz / hl };
  }
}
S7.RailPath = RailPath;

class RailGraph {
  constructor(area, grid) {
    this.area = area; this.grid = grid;
    this.nodes = {}; this.edges = {}; this.adj = {};
    for (const id in area.nodes) {
      const n = area.nodes[id], t = S7.tw(n.t);
      const z = t[2] !== null ? t[2] : grid.floorAt(t[0], t[1]);
      this.nodes[id] = Object.assign({}, n, { id, x: t[0], y: t[1], z });
      this.adj[id] = [];
    }
    for (const e0 of area.edges) this.addEdge(e0);
  }
  addEdge(e0) {
    const e = Object.assign({ kind: 'walk' }, e0);
    e.id = e.id || (e.a + '-' + e.b);
    const A = this.nodes[e.a], B = this.nodes[e.b];
    if (!A || !B) throw new Error('rail ' + this.area.id + ': edge ' + e.id + ' has an unknown node');
    const pts = [[A.x, A.y, A.z]].concat((e.via || []).map(v => S7.tw(v)), [[B.x, B.y, B.z]]);
    const lift = e.kind === 'lift';
    e.path = new RailPath(pts, (x, y) => this.grid.floorAt(x, y), (lift && !e.ground) || e.kind === 'jump' || !!e.lerpZ);
    e.oneWay = e.oneWay !== undefined ? e.oneWay : e.kind !== 'walk' && e.kind !== 'stairs';
    e.length = e.path.length;
    if (e.length <= 0) throw new Error('rail ' + this.area.id + ': edge ' + e.id + ' has no length');
    this.edges[e.id] = e;
    this.adj[e.a].push(e.id); this.adj[e.b].push(e.id);
    return e;
  }
  removeEdge(id) { const e = this.edges[id]; if (!e) return; delete this.edges[id]; for (const n of [e.a, e.b]) this.adj[n] = this.adj[n].filter(x => x !== id); }
  /** the edges a walker standing on node id may take away from it: [{ edge, dir }] (dir +1 = a → b) */
  exits(id) {
    const out = [];
    for (const eid of this.adj[id] || []) {
      const e = this.edges[eid]; if (e.hidden) continue;
      if (e.a === id) out.push({ edge: e, dir: 1 });
      else if (!e.oneWay) out.push({ edge: e, dir: -1 });
    }
    return out;
  }
  /** the node a walker reaches at the end of edge e going dir */
  endNode(e, dir) { return dir > 0 ? e.b : e.a; }
  /** where a branch leaves node id: its yaw over the first 1.5 m */
  branchYaw(x, dir) {
    const e = x.edge, L = e.length, s0 = dir > 0 ? 0 : L, s1 = dir > 0 ? Math.min(L, 24) : Math.max(0, L - 24);
    const a = e.path.at(s0), b = e.path.at(s1);
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  /** the point at s on edge e */
  at(e, s) { return e.path.at(s); }
}
S7.RailGraph = RailGraph;


/* ===== src/12-camera.js ===== */
/* CAMERA DIRECTOR (§7.2): picks the shot that covers the walker's place on its edge and works out the pose. Shots cut
 * hard (Killer7's way) unless they ask for a blend. An edge's shots are authored in its cams, or generated: the edge is
 * cut into stretches and each gets a fixed corner shot, a dolly, a crane or a follow shot, picked by a seeded hash and
 * kept only if the camera stands in open space with a clear line to the hero all along its stretch. */
const LOOK_UP = 1.1 * M, EYE_H = 28;
S7.EYE_H = EYE_H;

/** a pose's basis: forward, right, up */
S7.basis = (yaw, pitch) => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return { f: [cy * cp, sy * cp, sp], r: [-sy, cy, 0], u: [-cy * sp, -sy * sp, cp] };
};
/** project a world point through a pose: [sx, sy] in 0..1 screen fractions (y down) and depth, or null behind */
S7.project = (pose, x, y, z, aspect) => {
  const B = S7.basis(pose.yaw, pose.pitch), d = [x - pose.x, y - pose.y, z - pose.z];
  const zc = V.dot(d, B.f); if (zc < 1) return null;
  const tv = Math.tan((pose.fov || 55) * Math.PI / 360), th = tv * aspect;
  return [(1 + V.dot(d, B.r) / (zc * th)) / 2, (1 - V.dot(d, B.u) / (zc * tv)) / 2, zc];
};
/** the world ray through a screen fraction (sx, sy) of a pose: { o, d } */
S7.unproject = (pose, sx, sy, aspect) => {
  const B = S7.basis(pose.yaw, pose.pitch), tv = Math.tan((pose.fov || 55) * Math.PI / 360), th = tv * aspect;
  const nx = (sx * 2 - 1) * th, ny = (1 - sy * 2) * tv;
  return { o: [pose.x, pose.y, pose.z], d: V.norm(V.add(V.add(B.f, V.mul(B.r, nx)), V.mul(B.u, ny))) };
};

class CameraDirector {
  constructor(sim) {
    this.sim = sim; this.cache = {}; this.shotId = null; this.pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 55 };
    this.prev = Object.assign({}, this.pose); this.override = null; this.aimK = 0; this.cutT = 0; this.follow = null; this.shake = 0;
  }
  reset() { this.cache = {}; this.shotId = null; this.override = null; this.follow = null; this.aimK = 0; }
  /** the shots for edge e walked in direction dir (authored, or generated and cached) */
  shots(e, dir) {
    const key = e.id + ':' + dir;
    if (this.cache[key]) return this.cache[key];
    let list = (dir < 0 && e.rcams) || e.cams;
    if (list) list = list.map((c, i) => this._author(e, dir, c, i));
    else list = this._generate(e, dir);
    this.cache[key] = list;
    return list;
  }
  _author(e, dir, c, i) {
    const s = Object.assign({ id: e.id + ':' + dir + ':' + i, s: [0, 1] }, c);
    if (s.at) s.at = S7.tw(s.at).map((v, k) => v === null ? (k === 2 ? 3 * M : 0) : v);
    if (s.at && s.at[2] !== null && c.at && c.at.length < 3) s.at[2] = this.sim.grid.floorAt(s.at[0], s.at[1]) + 3 * M;
    if (Array.isArray(s.look)) s.look = S7.tw(s.look);
    if (s.path) s.path = s.path.map(p => S7.tw(p));
    return s;
  }
  _hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; }
  _generate(e, dir) {
    const G = this.sim.grid, L = e.length, out = [];
    const terrain = G.kind === 'terrain', fast = e.kind === 'ski' || e.kind === 'lift' || e.kind === 'jump';
    const segLen = fast ? 22 * M : 7 * M, n = Math.max(1, Math.min(10, Math.round(L / segLen)));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, id = e.id + ':' + dir + ':' + i;
      const h = this._hash(id), side = h < .5 ? 1 : -1;
      const sAt = u => dir > 0 ? u * L : (1 - u) * L;
      const P = u => e.path.at(sAt(u));
      const mid = P((u0 + u1) / 2), fy = mid.yaw + (dir < 0 ? Math.PI : 0), fwd = [Math.cos(fy), Math.sin(fy)], perp = [-fwd[1], fwd[0]];
      const cands = [];
      const fixedAt = (back, sideD, up, fov) => ({ shot: 'fixed', at: [mid.x - fwd[0] * back + perp[0] * sideD * side, mid.y - fwd[1] * back + perp[1] * sideD * side, mid.z + up], look: 'hero', fov });
      if (fast) {
        cands.push({ shot: 'follow', back: 4.5, side: 1.2 * side, up: 2.2, ahead: 4, fov: 60, lag: .1 });
        if (h > .55) cands.unshift(fixedAt(-10 * M, 7 * M, 4 * M, 50));
      } else {
        const pick = Math.floor(h * 6), out = this.sim.areaDef && (this.sim.areaDef.outdoor || terrain) ? 1.7 : 1;
        const order = [
          () => fixedAt(-2 * M * out, 5.5 * M * out, 1.4 * M, 54),                    // low corner: the hero walks past, looming
          () => fixedAt(-1.5 * M * out, 7 * M * out, 4 * M, 46),                      // wide and high from the side: the hero small in the room
          () => fixedAt(-7 * M * out, 1.6 * M, 1.2 * M, 46),                          // low from the front: the hero walks at us
          () => ({ shot: 'dolly', off: [perp[0] * 5 * M * out * side, perp[1] * 5 * M * out * side, 1.8 * M], lead: .6 * M, fov: 52 }),
          () => ({ shot: 'crane', at: [mid.x + perp[0] * 4.5 * M * out * side, mid.y + perp[1] * 4.5 * M * out * side], zFrom: 4.5 * M, zTo: 1.6 * M, look: 'hero', fov: 54 }),
          () => fixedAt(5 * M * out, 2 * M, 3.2 * M, 52)                              // behind and above
        ];
        for (let k = 0; k < order.length; k++) cands.push(order[(pick + k) % order.length]());
        cands.push(fixedAt(-5 * M, 1.2 * M, 1.6 * M, 50), fixedAt(-1 * M, -4.5 * M, 2.2 * M, 54), fixedAt(4 * M, .8 * M, 2.6 * M, 56), fixedAt(-1.5 * M, 3.4 * M, 2.4 * M, 56), fixedAt(2.2 * M, .5 * M, 2.4 * M, 58));
        cands.push({ shot: 'follow', back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 });
      }
      let chosen = null;
      for (const c of cands) {
        if (c.shot === 'crane' && c.at) c.at = [c.at[0], c.at[1], null];
        if (this._valid(e, dir, c, u0, u1, P)) { chosen = c; break; }
      }
      if (!chosen) chosen = cands[cands.length - 1];
      out.push(Object.assign({ id, s: [u0, u1], gen: true }, chosen));
    }
    return out;
  }
  /** does a candidate shot stand in open space and see the hero's chest at 5 points of its stretch? */
  _valid(e, dir, c, u0, u1, P) {
    const G = this.sim.grid;
    for (let k = 0; k < 5; k++) {
      const u = u0 + (u1 - u0) * (k + .5) / 5, p = P(u), chest = [p.x, p.y, p.z + LOOK_UP];
      const cam = this._camPoint(c, p, (k + .5) / 5, e, dir);
      if (!cam) return false;
      if (G.solidAt(cam[0], cam[1], cam[2]) || G.solidAt(cam[0], cam[1], cam[2] - 8)) return false;
      if (G.kind !== 'terrain') {
        const cell = G.cell(Math.floor(cam[0] / M), Math.floor(cam[1] / M)); if (!cell || cell.k === 'wall' || cell.k === 'pillar' || cell.k === 'pit') return false;
        if (k === 0) for (let a = 0; a < 8; a++) { const q = [cam[0] + Math.cos(a * Math.PI / 4) * .8 * M, cam[1] + Math.sin(a * Math.PI / 4) * .8 * M]; if (G.solidAt(q[0], q[1], cam[2])) return false; }   // clear of walls and pillars
        if (cam[2] > this.ceiling()) return false;
      }
      if (!G.los(cam, chest, 3) || !G.los(cam, [p.x, p.y, p.z + 1.75 * M], 3)) return false;
      if (V.dist(cam, chest) < 1.2 * M) return false;
    }
    return true;
  }
  /** how high a camera may stand above the floor here: below the walls' tops (indoors there is no ceiling) */
  ceiling() { const A = this.sim.areaDef; return A && A.world && A.world.kind === 'level' ? (A.world.wallH || 4) * M - 6 : 1e9; }
  /** where a shot's camera stands for hero point p (u: 0..1 through the shot's stretch) */
  _camPoint(c, p, u, e, dir) {
    if (c.shot === 'fixed') return c.at;
    if (c.shot === 'dolly') {
      if (c.path) { const a = c.path[0], b = c.path[c.path.length - 1]; return V.lerp3(a, b, u).map((v, i) => i === 2 && (v === null || v === undefined) ? p.z + 2 * M : v); }
      return [p.x + c.off[0], p.y + c.off[1], p.z + c.off[2]];
    }
    if (c.shot === 'crane') return [c.at[0], c.at[1], this.sim.grid.floorAt(c.at[0], c.at[1]) + lerp(c.zFrom, c.zTo, u)];
    if (c.shot === 'follow') {
      const fy = p.yaw + (dir < 0 ? Math.PI : 0), f = [Math.cos(fy), Math.sin(fy)], r = [-f[1], f[0]];
      return [p.x - f[0] * c.back * M + r[0] * c.side * M, p.y - f[1] * c.back * M + r[1] * c.side * M, p.z + c.up * M];
    }
    return null;
  }
  /** this step's rail pose for the walker (hero feet h = { x, y, z, yaw }), the shot covering (e, s, dir) */
  railPose(e, s, dir, h, dt) {
    const shots = this.shots(e, dir), u = dir > 0 ? s / e.length : 1 - s / e.length;
    let sh = shots[shots.length - 1];
    for (const c of shots) if (u >= c.s[0] - 1e-6 && u <= c.s[1] + 1e-6) { sh = c; break; }
    const cut = sh.id !== this.shotId;
    if (cut) { this.shotId = sh.id; this.cutT = 0; this.follow = null; this.sim.emit && this.sim.emit('cut', { shot: sh.id }); }
    this.cutT += dt;
    const lu = (u - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]);
    return this._poseOf(sh, h, clamp(lu, 0, 1), e, dir, dt, cut);
  }
  _poseOf(sh, h, u, e, dir, dt, cut) {
    const chest = [h.x, h.y, h.z + (sh.lookUp !== undefined ? sh.lookUp * M : LOOK_UP)];
    let cam;
    if (sh.shot === 'follow') {
      const fy = h.yaw, f = [Math.cos(fy), Math.sin(fy)], r = [-f[1], f[0]];
      const want = [h.x - f[0] * sh.back * M + r[0] * (sh.side || 0) * M, h.y - f[1] * sh.back * M + r[1] * (sh.side || 0) * M, h.z + sh.up * M];
      if (!this.follow || cut) this.follow = want.slice();
      const k = 1 - Math.exp(-dt / Math.max(.01, sh.lag || .12));
      for (let i = 0; i < 3; i++) this.follow[i] += (want[i] - this.follow[i]) * k;
      cam = this.follow.slice();
      const G = this.sim.grid, fl = G.floorAt(cam[0], cam[1]) + 1.2 * M; if (cam[2] < fl) cam[2] = fl;
      // pull in along the line of sight when a wall gets between
      const d = V.sub(cam, chest), L = V.len(d), hit = G.ray(chest, V.mul(d, 1 / (L || 1)), L, 3);
      if (hit < L) cam = V.add(chest, V.mul(d, Math.max(.2, (hit - 6) / L)));
      const ah = sh.ahead ? sh.ahead * M : 0;
      const look = [h.x + f[0] * ah, h.y + f[1] * ah, chest[2]];
      return this._aim(cam, look, sh.fov);
    }
    cam = this._camPoint(sh, h, u, e, dir);
    const look = sh.look && sh.look !== 'hero' ? sh.look : chest;
    return this._aim(cam, look, sh.fov);
  }
  /** a camera point pulled in toward `from` until nothing solid stands between (area and boss cameras) */
  pullIn(from, cam) {
    const G = this.sim.grid, d = V.sub(cam, from), L = V.len(d); if (L < 1) return cam;
    const hit = G.ray(from, V.mul(d, 1 / L), L, 3);
    return hit < L ? V.add(from, V.mul(d, Math.max(.15, (hit - 8) / L))) : cam;
  }
  /** _aim with the camera pulled clear of walls first, looking from the hero's chest */
  aimSafe(h, cam, look, fov) { return this._aim(this.pullIn([h.x, h.y, h.z + 1.4 * M], cam), look, fov); }
  _aim(cam, look, fov) {
    const d = V.sub(look, cam), hz = Math.hypot(d[0], d[1]);
    return { x: cam[0], y: cam[1], z: cam[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], hz), roll: 0, fov: fov || 55 };
  }
  /** an override shot (beats, bosses): { at, look, fov } in units, or { orbit: { c, r, h, speed } } */
  poseOverride(o, t) {
    if (o.orbit) {
      const a = o.orbit.a0 + t * o.orbit.speed, c = o.orbit.c;
      return this._aim([c[0] + Math.cos(a) * o.orbit.r, c[1] + Math.sin(a) * o.orbit.r, c[2] + o.orbit.h], c, o.fov || 55);
    }
    if (o.pose) return Object.assign({ roll: 0, fov: 55 }, o.pose);
    const at = typeof o.at === 'function' ? o.at(t) : o.at, look = typeof o.look === 'function' ? o.look(t) : o.look;
    return this._aim(at, look, o.fov);
  }
}
S7.CameraDirector = CameraDirector;


/* ===== src/20-sim.js ===== */
/* SIM: all game state and rules, deterministic in fixed steps (1/120 s), with no three.js, DOM or presenter reads.
 * Its update order (§5.4): modes → walker → camera director → skills → weapons and projectiles → Whiteouts → scan and
 * reveals → combat → pickups → economy → bosses → triggers and waves → story and beats → results clock → events.
 * The other sim files (21-31, 33, 40, 50, 60) add their parts to Sim.prototype. */
const PERSONA_ORDER = S7.PERSONA_ORDER = ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid'];

class Sim {
  constructor(game, o = {}) {
    this.game = game; this.o = o;
    this.events = [];
    this.st = null;           // the saved state
    this.cam = new CameraDirector(this);
    this.areaDef = null; this.grid = null; this.rails = null;
    this.enemies = []; this.shots = []; this.projectiles = []; this.drops = []; this.fx = [];
    this.beats = []; this.talk = null; this.card = null; this.toasts = [];
    this.time = 0; this.uid = 1;
    this.aim = { on: false, yaw: 0, pitch: 0, recoil: 0, swayT: 0, scope: false, k: 0, toggled: false };
    this.scan = null; this.flare = null; this.echo = null; this.flash = null;
    this.ring = null; this.switching = null; this.prompt = null; this.near = null;
    this.junction = null; this.mode = 'rail';
    this.wave = {}; this.waveQ = [];
    this.tutorial = null; this.letterbox = 0;
    this.splashes = [];
  }
  emit(type, data) { S7.bus.emit(type, data); }
  /** drop everything that belongs to a moment (beats, talks, bosses, set pieces, aim) and keep the saved state */
  resetTransient() {
    Object.assign(this, { beats: [], talk: null, card: null, cutscene: false, letterbox: 0, camOverride: null, prompt: null, boss: null, bossNoSwitch: false, bossLockAim: false,
      mode: 'rail', switching: null, ring: null, lawine: null, gondola: null, toasts: [], splashes: [], uiRequest: null, resultsReady: null, creditsReady: false, epilogue: false,
      holdSpot: null, skiFork: null, skiForkAt: null, scan: null, flare: null, echo: null, flash: null, slowmo: null, tutorial: null, mags: {}, skipping: false, attractSlalomAt: 0 });
    if (this.aim) { this.aim.on = false; this.aim.k = 0; this.aim.scope = false; this.aim.toggled = false; this.aim.recoil = 0; }
    S7.interviewGun = false;
  }
  diff() { return DIFF[this.st ? this.st.difficulty : 'piste'] || DIFF.piste; }
  setting(k, d) { const s = this.game.settings; return s && s[k] !== undefined ? s[k] : d; }

  /* ---------------- new game, state ---------------- */
  freshState(difficulty = 'piste') {
    const roster = {};
    for (const id of PERSONA_ORDER) {
      const P = S7.PERSONAS[id];
      roster[id] = { hp: P.hp, stats: { power: 0, speed: 0, critical: 0, steady: 0 }, frozen: false, statue: null, unlocked: !!P.startUnlocked };
    }
    return {
      v: 1, difficulty, area: 'room7', node: 'bed', persona: 'ignaz', lastPersona: 'dagny', roster,
      red: 60, rime: 0, items: {}, pins: [], dossier: [], exposures: [], gates: {}, waves: {}, spots: {}, flags: {}, tut: {},
      results: { 0: this.freshResults(), 1: this.freshResults() }, target: 0, playtime: 0,
      room7Door: null, hintsBought: 0, freeHint: true, visited: {}, seenEdges: {}, ending: null
    };
  }
  freshResults() { return { time: 0, kills: 0, crits: 0, hits: 0, shots: 0, red: 0, frozen: 0, hints: 0, done: false }; }
  newGame(difficulty) {
    this.resetTransient();
    this.st = this.freshState(difficulty);
    this.enterArea('room7', 'bed', { silent: true });
    this.startBeat('cold_open');
  }
  /* ---------------- areas ---------------- */
  /** load an area: its grid, rails, cameras; place the walker on a node (facing along its first exit or `face`) */
  enterArea(id, nodeId, o = {}) {
    const A = S7.AREAS[id]; if (!A) throw new Error('unknown area ' + id);
    const from = this.st.area;
    this.areaDef = A; this.st.area = id;
    this.grid = new LevelGrid(A);
    this.rails = new RailGraph(A, this.grid);
    for (const gid in A.gates || {}) { const g = A.gates[gid]; if (g.hides && !this.gateOpen(gid)) for (const eid of [].concat(g.hides)) if (this.rails.edges[eid]) this.rails.edges[eid].hidden = true; }
    for (const gid in A.gates || {}) { const g = A.gates[gid]; if (g.block && !this.gateOpen(gid)) this.grid.dynBlocks.push(Object.assign(g.block.map(v => v * M), { gate: gid })); }
    this.cam.reset();
    this.enemies = []; this.projectiles = []; this.drops = []; this.wave = {}; this.waveQ = []; this.boss = null;
    this.spots = this.resolveSpots(A);
    const N = this.rails.nodes[nodeId] || this.rails.nodes[Object.keys(this.rails.nodes)[0]];
    const ex = this.rails.exits(N.id);
    let yaw = o.face !== undefined ? o.face : ex.length ? this.rails.branchYaw(ex[0], ex[0].dir) : 0;
    this.W = { edge: null, node: N.id, s: 0, dir: 1, v: 0, yaw, turnT: 0, turnFrom: yaw, lastEdge: null, air: null };
    this.st.node = N.id;
    this.mode = A.kind === 'room7' ? 'rail' : 'rail';
    this.junction = null; this.aimExit(true);
    this.st.visited[id] = true;
    this.heroUpdate(0);
    this.cam.shotId = null;
    this.atNode(N.id, true);
    if (!o.silent) this.emit('area', { from, to: id });
    if (A.onEnter && !o.noEnter) A.onEnter(this, o);
    for (const tr of A.triggers || []) if (tr.onEnter && this.trigOk(tr)) this.fireTrigger(tr);
    // the persistent state of frozen statues in this area
    if (!o.silent && A.kind !== 'room7' && !this.o.attract && !this.o.bot && !o.noSave) this.autosave('area');
  }
  resolveSpots(A) {
    const out = [];
    for (const s0 of A.spots || []) {
      const s = Object.assign({}, s0);
      if (s.node) { const n = this.rails.nodes[s.node]; s.x = n.x; s.y = n.y; s.z = n.z; }
      else if (s.edge) { const e = this.rails.edges[s.edge]; const p = e.path.at((s.s || .5) * e.length); s.x = p.x; s.y = p.y; s.z = p.z; }
      else if (s.at) { const t = S7.tw(s.at); s.x = t[0]; s.y = t[1]; s.z = t[2] !== null ? t[2] : this.grid.floorAt(t[0], t[1]); }
      if (s.atZ !== undefined) s.z = s.atZ * M;
      if (s.up) s.z += s.up * M;
      out.push(s);
    }
    return out;
  }
  spotKey(s) { return this.st.area + ':' + s.id; }
  spotUsed(s) { return !!this.st.spots[this.spotKey(s)]; }
  gateKey(gid) { return this.st.area + ':' + gid; }
  gateOpen(gid) { return !!this.st.gates[this.gateKey(gid)]; }

  /* ---------------- the hero's place ---------------- */
  heroUpdate(dt) {
    const W = this.W;
    let p;
    if (W.air) {   // a jump's arc
      const a = W.air, u = clamp(a.t / a.T, 0, 1), P0 = a.from, P1 = a.to;
      p = { x: lerp(P0[0], P1[0], u), y: lerp(P0[1], P1[1], u), z: lerp(P0[2], P1[2], u) + Math.sin(u * Math.PI) * a.apex, yaw: Math.atan2(P1[1] - P0[1], P1[0] - P0[0]) };
    } else if (W.edge) { const e = this.rails.edges[W.edge]; p = e.path.at(W.s); }
    else { const n = this.rails.nodes[W.node]; p = { x: n.x, y: n.y, z: n.z, yaw: W.yaw }; }
    // facing: the path's tangent times dir, a quick turn swings it through 180°
    if (W.edge && !W.air) { const e = this.rails.edges[W.edge]; const p2 = e.path.at(W.s); W.yaw = p2.yaw + (W.dir < 0 ? Math.PI : 0); }
    let face = W.yaw;
    if (W.turnT > 0) { W.turnT = Math.max(0, W.turnT - dt); const u = 1 - W.turnT / .22; face = W.turnFrom + S7.angDiff(W.turnFrom, W.yaw) * S7.ease.inOut(u); }
    this.hero = { x: p.x, y: p.y, z: p.z, yaw: face };
  }
  eye() { const h = this.hero; return [h.x, h.y, h.z + EYE_H]; }

  /* ---------------- the step ---------------- */
  update(dt, I) {
    const st = this.st; if (!st) return;
    this.events.length = 0;
    I = I || S7.noIntents();
    this.I = I;
    this.realDt = dt;
    // the Featherbed ring slows time; a switch freezes play for its 0.45 s
    const ts = (this.ring ? .15 : 1) * (CHEAT.slowCrit && this.critSlow > 0 ? .3 : 1) * (this.boss && this.boss.id === 'hansi' && this.boss.phase === 2 && this.aim.on ? .6 : 1);
    if (this.critSlow > 0) this.critSlow -= dt;
    const sdt = dt * ts;
    this.time += sdt;
    if (this.card) { this.updateCard(dt, I); this.runBeats(dt); return; }
    if (this.talk) { this.updateTalk(dt, I); this.runBeats(dt); this.updateToasts(dt); return; }
    if (this.prompt && this.prompt.choice) { this.updateChoice(dt, I); return; }
    const cut = this.cutscene;
    if (!cut && !this.o.noClock) { st.playtime += dt; if (this.areaDef.target !== undefined && !st.results[this.areaDef.target].done) st.results[this.areaDef.target].time += dt; }
    if (cut) { I = S7.noIntents(); this.I = I; }
    this.updateMode(sdt, dt, I);
    this.heroUpdate(sdt);
    this.updateSkills(sdt, I);
    this.updateWeapons(sdt, I);
    this.updateProjectiles(sdt);
    this.updateEnemies(sdt);
    this.updateReveals(sdt);
    this.updateDrops(sdt);
    this.updateEconomy(sdt, I);
    if (this.boss) this.updateBoss(sdt);
    this.updateWaves(sdt);
    if (this.areaDef.update) this.areaDef.update(this, sdt);
    this.updateNear(I);
    this.runBeats(sdt);
    this.updateToasts(dt);
    this.updateCamera(sdt);
    this.splashes = this.splashes.filter(s => (s.t += dt) < s.life);
  }
  updateToasts(dt) { for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter(t => t.t < (t.life || 2.6)); }
  toast(text, o = {}) { this.toasts.push(Object.assign({ text, t: 0, life: 2.6 }, o)); }
  splash(text, o = {}) { this.splashes.push(Object.assign({ text, t: 0, life: 1.1, big: true }, o)); this.emit('splash', { text }); }
  say(line, o = {}) { this.toasts.push(Object.assign({ text: line, t: 0, life: 2.8, line: true }, o)); }

  /* ---------------- modes ---------------- */
  updateMode(dt, rdt, I) {
    const st = this.st, P = this.personaDef();
    if (this.switching) { this.switching.t += rdt; if (this.switching.t >= .45) { this.switching = null; this.emit('switched', { to: st.persona }); this.bark('switch'); } return; }
    if (this.mode === 'frozen') { this.frozenT -= dt; if (this.frozenT <= 0) this.startRescue(); return; }
    if (this.mode === 'gameover') return;
    if (this.mode === 'interview') { this.updateInterview(dt, I); return; }
    // the Featherbed ring: hold to open (rail and lift modes), pick, release to switch; a tap swaps back
    if (this.updateRing(dt, rdt, I)) return;
    if (I.pick !== null && I.pick !== undefined && !this.aim.on && this.canSwitch()) { this.trySwitch(PERSONA_ORDER[I.pick]); }
    // aim: hold or toggle
    const toggle = this.setting('aimToggle', 'hold') === 'toggle';
    let wantAim = toggle ? (I.aimP ? !this.aim.toggled : this.aim.toggled) : I.aimD;
    if (toggle) this.aim.toggled = wantAim;
    if (this.bossLockAim) wantAim = true;
    const W = this.W, e = W.edge ? this.rails.edges[W.edge] : null;
    const skiing = e && e.kind === 'ski', lifting = e && e.kind === 'lift';
    const canAim = !W.air && (!skiing || W.v < 8 || e.aimOnTheMove) && this.mode !== 'cutscene';
    if (wantAim && canAim && !this.aim.on) this.aimEnter();
    else if ((!wantAim || !canAim) && this.aim.on && !this.bossLockAim) this.aimExit();
    if (this.aim.on) { this.updateAim(dt, I); if (!lifting && !(e && e.aimOnTheMove)) { W.v = 0; if (skiing) this.skiHold = true; } else this.walk(dt, I, true); return; }
    // map (the UI opens it), heal, interact
    this.healing = I.healD && !W.air && this.mode !== 'ski';
    if (I.interactP || I.spotPick) this.interact(I.spotPick);
    if (this.holdSpot) this.updateHold(dt, I);
    this.walk(dt, I, false);
  }
  canSwitch() { return !this.aim.on && !this.talk && !this.cutscene && !this.switching && this.mode !== 'frozen' && this.mode !== 'rescue' && !this.bossNoSwitch && !this.W.air; }

  /* ---------------- the walker (§7.1) ---------------- */
  walkSpeed() {
    const P = this.personaDef(), lv = this.stats().speed;
    let v = T.walkSpeed * (P.walk || 1) * (1 + .08 * lv);
    if (this.st.persona === 'dagny' && this.tucking) v *= 2;
    return v;
  }
  walk(dt, I, aiming) {
    const W = this.W, G = this.rails;
    if (W.air) { this.updateJump(dt); return; }
    if (!W.edge) { this.atNodeUpdate(dt, I); return; }
    const e = G.edges[W.edge];
    if (e.kind === 'ski') { this.ski(dt, I, e); return; }
    if (e.kind === 'lift') { W.v = e.speed || 120; this.advance(dt, e); return; }
    // walk / stairs
    if (I.turnP && !e.oneWay && !aiming) { this.quickTurn(); return; }
    const target = I.move && !aiming && !this.healing ? this.walkSpeed() * (e.kind === 'stairs' ? .85 : 1) : 0;
    const acc = target > W.v ? this.walkSpeed() / .18 : this.walkSpeed() / .12;
    W.v = E.approach(W.v, target, acc * dt);
    // slow down to stop exactly on a stopping node
    const endN = G.endNode(e, W.dir), left = W.dir > 0 ? e.length - W.s : W.s;
    if (this.stopsAt(endN, e) && left < 1.2 * M) W.v = Math.min(W.v, Math.max(14, this.walkSpeed() * left / (1.2 * M)));
    this.advance(dt, e);
  }
  quickTurn() {
    const W = this.W; W.turnFrom = W.yaw; W.dir *= -1; W.turnT = .22; W.v *= .3; this.emit('quickturn', {});
    this.tut('quickturn', true);
  }
  /** move along edge e; on reaching its end, arrive at the node (passing through if it doesn't stop us) */
  advance(dt, e) {
    const W = this.W;
    W.s += W.dir * W.v * dt;
    this.st.seenEdges[this.st.area + ':' + e.id] = 1;
    this.checkEdgeTriggers(e);
    if (W.s >= e.length || W.s <= 0) {
      const endN = this.rails.endNode(e, W.dir);
      W.s = W.dir > 0 ? e.length : 0;
      this.arrive(endN, e);
    }
  }
  /** does arriving at node id from edge e stop the walker? */
  stopsAt(id, e) {
    const n = this.rails.nodes[id]; if (!n) return true;
    if (n.kind && n.kind !== 'pass') return true;
    if (this.statueAtNode(id)) return true;
    const ex = this.rails.exits(id).filter(x => x.edge.id !== e.id);
    if (ex.length !== 1) return true;
    const nx = ex[0].edge;
    if (nx.kind === 'lift' || nx.kind === 'jump') return true;
    if (nx.gate && !this.gateOpen(nx.gate) && !CHEAT.ghost) return true;
    if (e.kind === 'ski' && nx.kind !== 'ski') return true;
    return false;
  }
  arrive(id, e) {
    const W = this.W, n = this.rails.nodes[id];
    const ex = this.rails.exits(id).filter(x => x.edge.id !== e.id);
    if (!this.stopsAt(id, e) && ex.length === 1) {
      const x = ex[0]; W.edge = x.edge.id; W.dir = x.dir; W.s = x.dir > 0 ? 0 : x.edge.length; W.lastEdge = e.id;
      this.atNode(id, false);
      return;
    }
    W.lastEdge = e.id; W.edge = null; W.node = id; W.v = 0; this.st.node = id;
    if (e.kind === 'ski' && ex.some(x => x.edge.kind === 'ski') && this.skiFork) { const f = this.skiFork; this.skiFork = null; W.edge = f.edge.id; W.dir = f.dir; W.s = 0; W.node = null; return; }
    this.atNode(id, true);
  }
  /** a node was reached (stopping or passing through): triggers, auto exits, junction setup */
  atNode(id, stopped) {
    const n = this.rails.nodes[id];
    for (const tr of this.areaDef.triggers || []) if (tr.node === id && this.trigOk(tr)) this.fireTrigger(tr);
    if (!stopped) return;
    if (n.kind === 'exit' && n.open && n.to && !this.blockedExit(n)) { this.useExit(n); return; }
    this.setupJunction(id);
  }
  blockedExit(n) { return n.needs && !this.meets(n.needs, true); }
  setupJunction(id) {
    const W = this.W, ex = this.rails.exits(id).filter(x => !x.edge.hidden);
    // the branch most straight ahead is highlighted first
    let best = 0, bd = 9;
    ex.forEach((x, i) => { const d = Math.abs(S7.angDiff(W.yaw, this.rails.branchYaw(x, x.dir))); if (d < bd) { bd = d; best = i; } });
    this.junction = { node: id, exits: ex, i: best, held: 0 };
    if (ex.length > 1) this.emit('junction', { node: id, options: ex.length });
  }
  atNodeUpdate(dt, I) {
    const W = this.W, J = this.junction;
    if (!J) { this.setupJunction(W.node); return; }
    W.v = 0;
    if (I.turnP) { W.turnFrom = W.yaw; W.yaw = S7.wrapAng(W.yaw + Math.PI); W.turnT = .22; this.emit('quickturn', {}); this.setupJunction(W.node); this.tut('quickturn', true); return; }
    if (!J.exits.length) return;
    // choose a branch: the stick by its screen angle, d-pad / arrows / A D cycle, the mouse hover (branchPick)
    const pose = this.cam.pose, aspect = this.game.W / this.game.H || 16 / 9;
    if (I.branchPick !== null && I.branchPick !== undefined && J.exits[I.branchPick]) J.i = I.branchPick;
    else if (I.device === 'gamepad' && Math.hypot(I.stick[0], I.stick[1]) > .5) {
      const sa = Math.atan2(I.stick[1], I.stick[0]);
      let bi = J.i, bd = 9;
      J.exits.forEach((x, i) => { const a = this.branchScreenAngle(x, pose, aspect); if (a === null) return; const d = Math.abs(S7.angDiff(sa, a)); if (d < bd) { bd = d; bi = i; } });
      J.i = bi;
    } else if (I.leftP || I.rightP) {
      const order = J.exits.map((x, i) => ({ i, a: this.branchScreenAngle(x, pose, aspect) })).sort((a, b) => Math.cos(a.a === null ? 0 : a.a) - Math.cos(b.a === null ? 0 : b.a));
      const k = order.findIndex(o => o.i === J.i);
      J.i = order[(k + (I.rightP ? 1 : order.length - 1)) % order.length].i;
      this.emit('tick', {});
    }
    // hold move (after a beat: the junction reads) or press it again, or click a marker, to take it
    J.t = (J.t || 0) + dt;
    if (!I.move) J.released = true;
    const go = (I.move && (J.released || J.t > .3 || this.o.bot || this.o.attract || J.exits.length < 2)) || (I.branchPick !== null && I.branchPick !== undefined && I.clicked);
    if (go) this.takeBranch(J.exits[J.i]);
  }
  /** a branch's direction on screen (radians, screen space: 0 right, π/2 down) under a camera pose */
  branchScreenAngle(x, pose, aspect) {
    const n = this.rails.nodes[this.W.node], yaw = this.rails.branchYaw(x, x.dir);
    const a = S7.project(pose, n.x, n.y, n.z + 8, aspect), b = S7.project(pose, n.x + Math.cos(yaw) * 24, n.y + Math.sin(yaw) * 24, n.z + 8, aspect);
    if (!a || !b) { const rel = S7.angDiff(pose.yaw, yaw); return -Math.PI / 2 + rel; }
    return Math.atan2((b[1] - a[1]) / aspect, b[0] - a[0]);
  }
  takeBranch(x) {
    const W = this.W, e = x.edge;
    if (!this.passGate(e)) return false;
    if (e.kind === 'lift') { if (!this.I.interactP && !this.I.move && !this.o.bot) return false; this.emit('lift', { edge: e.id }); }
    if (e.kind === 'jump' && !this.canJump(e)) { this.say('TOO FAR TO JUMP.', { who: this.st.persona }); this.emit('gate', { ok: false }); this.junction.held = 0; return false; }
    W.edge = e.id; W.dir = x.dir; W.s = x.dir > 0 ? 0 : e.length; W.node = null; this.junction = null;
    if (e.kind === 'jump') this.startJump(e);
    if (e.kind === 'ski') { W.v = Math.max(W.v, 30); this.skiHold = false; }
    this.tut('walk', true);
    return true;
  }
  /* ---- skiing (§7.1): downhill with drag; move tucks, turn is a hockey stop; forks picked on the move ---- */
  ski(dt, I, e) {
    const W = this.W, p = e.path.at(W.s), slope = -(p.slope || 0) * (W.dir > 0 ? 1 : -1);
    const dagny = this.st.persona === 'dagny';
    this.tucking = I.move || (dagny && I.skillD && this.st.red > 0);
    if (I.turnP && W.v > 10) { this.skiHold = true; this.emit('hockeystop', {}); }
    if (I.move && this.skiHold) { this.skiHold = false; W.v = Math.max(W.v, 20); }
    const top = T.skiTop * (dagny && this.tucking ? 260 / 190 : 1) * (this.echoRun ? 1.15 : 1);
    if (this.skiHold) W.v = E.approach(W.v, 0, 600 * dt);
    else {
      const k = this.tucking ? .0006 : I.move ? .0011 : .0019;
      W.v += (520 * Math.max(-.2, slope) - k * W.v * W.v - 6) * dt;
      if (this.tucking && dagny) W.v += 40 * dt;
      W.v = clamp(W.v, 18, top);
    }
    // a fork ahead: markers 2.5 s before it, picked on the move (stick, d-pad, A/D, a click); default: straightest
    const endN = this.rails.endNode(e, W.dir), left = e.length - W.s;
    const ex = this.rails.exits(endN).filter(x => x.edge.kind === 'ski' || x.edge.kind === 'jump');
    if (ex.length > 1 && left < W.v * 2.5) {
      if (!this.skiForkAt || this.skiForkAt.node !== endN) {
        let best = 0, bd = 9; ex.forEach((x, i) => { const d = Math.abs(S7.angDiff(p.yaw, this.rails.branchYaw(x, x.dir))); if (d < bd) { bd = d; best = i; } });
        this.skiForkAt = { node: endN, exits: ex, i: best };
      }
      const F = this.skiForkAt;
      if (I.branchPick !== null && I.branchPick !== undefined && F.exits[I.branchPick]) F.i = I.branchPick;
      if (I.leftP) F.i = (F.i + F.exits.length - 1) % F.exits.length;
      if (I.rightP) F.i = (F.i + 1) % F.exits.length;
      if (I.device === 'gamepad' && Math.abs(I.stick[0]) > .5) {
        const rel = F.exits.map((x, i) => ({ i, a: S7.angDiff(p.yaw, this.rails.branchYaw(x, x.dir)) })).sort((a, b) => a.a - b.a);
        F.i = I.stick[0] < 0 ? rel[0].i : rel[rel.length - 1].i;
      }
      this.skiFork = F.exits[F.i];
    } else this.skiForkAt = null;
    if (this.skiHold && W.v <= 0) return;
    W.s += W.v * dt;
    this.checkEdgeTriggers(e);
    if (W.s >= e.length) {
      W.s = e.length;
      const f = this.skiFork; this.skiFork = null; this.skiForkAt = null;
      if (f && ex.length > 1) {
        if (f.edge.kind === 'jump' && !this.canJump(f.edge)) { const alt = ex.find(x => x.edge.kind === 'ski'); if (alt) { this.say('TOO FAR TO JUMP.'); W.edge = alt.edge.id; W.s = 0; W.dir = 1; return; } }
        W.edge = f.edge.id; W.dir = 1; W.s = 0; this.atNode(endN, false);
        if (f.edge.kind === 'jump') this.startJump(f.edge);
        return;
      }
      const nx = ex.length === 1 ? ex[0] : null;
      if (nx && nx.edge.kind === 'ski') { W.edge = nx.edge.id; W.dir = 1; W.s = 0; this.atNode(endN, false); return; }
      if (nx && nx.edge.kind === 'jump' && this.canJump(nx.edge)) { W.edge = nx.edge.id; W.s = 0; this.atNode(endN, false); this.startJump(nx.edge); return; }
      this.tucking = false;
      this.arrive(endN, e);
    }
  }
  canJump(e) { return CHEAT.ghost || this.o.attract || (this.st.persona === 'dagny' && (this.tucking || this.I.skillD || this.W.v >= 150 || this.I.move)); }
  startJump(e) {
    const W = this.W, a = e.path.at(0), b = e.path.at(e.length);
    W.air = { t: 0, T: Math.max(.6, e.length / (e.speed || 420)), from: [a.x, a.y, a.z], to: [b.x, b.y, b.z], apex: (e.apex || 2.5) * M, edge: e.id };
    this.emit('jump', {}); this.tut('jump', true);
    if (e.slowmo) this.slowmo = { t: .6, k: .5 };
  }
  updateJump(dt) {
    const W = this.W, a = W.air; a.t += dt;
    if (a.t >= a.T) {
      const e = this.rails.edges[a.edge]; W.air = null; W.edge = e.id; W.s = e.length; W.dir = 1;
      this.emit('land', {});
      this.arrive(e.b, e);
      // continue downhill if the jump lands on a ski edge
      const ex = this.rails.exits(e.b).filter(x => x.edge.kind === 'ski');
      if (!W.edge && ex.length === 1) { W.edge = ex[0].edge.id; W.dir = 1; W.s = 0; W.node = null; this.junction = null; W.v = Math.max(W.v, 150); }
      const n = this.rails.nodes[e.b]; if (n && n.onLand) this.startBeat(n.onLand);
    }
  }

  /* ---------------- triggers and waves ---------------- */
  trigOk(tr) {
    if (this.o.echo) return false;
    const k = this.st.area + ':' + tr.id;
    if (tr.once !== false && this.st.flags['trig:' + k]) return false;
    if (tr.cond && !tr.cond(this)) return false;
    if (tr.flag && !this.st.flags[tr.flag]) return false;
    if (tr.notFlag && this.st.flags[tr.notFlag]) return false;
    return true;
  }
  fireTrigger(tr) {
    const k = this.st.area + ':' + tr.id;
    if (tr.once !== false) this.st.flags['trig:' + k] = 1;
    if (tr.wave) this.startWave(tr.wave);
    if (tr.beat) this.startBeat(tr.beat);
    if (tr.set) this.st.flags[tr.set] = 1;
    if (tr.tut) this.tut(tr.tut);
  }
  checkEdgeTriggers(e) {
    const W = this.W, u = W.s / e.length;
    for (const tr of this.areaDef.triggers || []) {
      if (tr.edge !== e.id) continue;
      const s = tr.s !== undefined ? tr.s : .5;
      if ((W.dir > 0 ? u >= s : u <= s) && this.trigOk(tr)) this.fireTrigger(tr);
    }
  }
  startWave(id) {
    const A = this.areaDef, w = A.waves && A.waves[id]; if (!w) return;
    const key = this.st.area + ':' + id;
    if (this.st.waves[key] === 'done' && !w.repeat) return;
    if (this.wave[id]) return;
    this.wave[id] = { id, t: 0, def: w, spawned: 0, list: [], queue: w.spawn.map(s => ({ type: s[0], at: s[1], delay: s[2] || 0, o: s[3] || {} })) };
    this.st.waves[key] = 'live';
    this.emit('wave', { id });
  }
  updateWaves(dt) {
    for (const id in this.wave) {
      const w = this.wave[id];
      w.t += dt * T.spawnRate;
      const alive = this.enemies.filter(e => e.alive && e.wave === id).length;
      for (const q of w.queue) {
        if (q.done || q.delay > w.t) continue;
        if (alive >= 10) break;
        q.done = true;
        const sp = this.areaDef.spawns[q.at];
        if (!sp) continue;
        this.spawnEnemy(q.type, sp, Object.assign({ wave: id }, q.o));
      }
      const pending = w.queue.some(q => !q.done);
      const live = this.enemies.some(e => e.alive && e.wave === id);
      const until = w.def.until || 'clear';
      if (!pending && (until === 'clear' ? !live : w.t >= until)) {
        delete this.wave[id];
        this.st.waves[this.st.area + ':' + id] = 'done';
        this.emit('waveclear', { id });
        if (w.def.onClear) this.startBeat(w.def.onClear);
        if (w.def.set) this.st.flags[w.def.set] = 1;
      }
    }
  }
  /** someone laughing nearby (within 40 m): Room 7 doors and exits stay shut */
  anyAlive(r = 40) { const h = this.hero; return this.enemies.some(e => e.alive && !e.passive && (!h || V.dist2([e.x, e.y], [h.x, h.y]) < r * M)); }

  /* ---------------- the camera ---------------- */
  updateCamera(dt) {
    const C = this.cam, W = this.W, h = this.hero;
    C.prev = C.pose;
    let pose;
    if (this.camOverride) { this.camOverride.t += dt; pose = C.poseOverride(this.camOverride, this.camOverride.t); if (this.camOverride.dur && this.camOverride.t >= this.camOverride.dur) this.camOverride = null; }
    else if (this.areaDef.camera && this.areaDef.camera(this, h)) pose = this.areaDef.camera(this, h);
    else if (W.edge || W.lastEdge) {
      const e = this.rails.edges[W.edge || W.lastEdge];
      if (e) {
        const s = W.edge ? W.s : (e.a === W.node ? 0 : e.length), dir = W.edge ? W.dir : (e.b === W.node ? 1 : -1);
        pose = C.railPose(e, s, dir, { x: h.x, y: h.y, z: h.z, yaw: W.air ? h.yaw : W.yaw }, dt);
      }
    }
    if (!pose) {   // standing on a node with no edge walked yet: a shot of the first exit's start, reversed
      const ex = this.rails.exits(W.node || this.st.node);
      if (ex.length) { const x = ex[0]; pose = C.railPose(x.edge, x.dir > 0 ? 0 : x.edge.length, x.dir, { x: h.x, y: h.y, z: h.z, yaw: W.yaw }, dt); }
      else pose = C._aim([h.x - 40, h.y - 40, h.z + 40], [h.x, h.y, h.z + 16], 55);
    }
    // aim: blend to the eye over 0.15 s
    const a = this.aim;
    a.k = E.approach(a.k, a.on ? 1 : 0, dt / .15);
    if (a.k > 0) {
      const ep = this.eye(), sway = this.swayOffset();
      const eyePose = { x: ep[0], y: ep[1], z: ep[2], yaw: a.yaw + sway[0], pitch: a.pitch + a.recoil + sway[1], roll: 0, fov: a.scope ? 18 : 62 };
      const k = S7.ease.inOut(a.k);
      if (k >= 1) pose = eyePose;
      else pose = { x: lerp(pose.x, eyePose.x, k), y: lerp(pose.y, eyePose.y, k), z: lerp(pose.z, eyePose.z, k), yaw: pose.yaw + S7.angDiff(pose.yaw, eyePose.yaw) * k, pitch: lerp(pose.pitch, eyePose.pitch, k), roll: 0, fov: lerp(pose.fov, eyePose.fov, k) };
    }
    C.pose = pose;
  }

  /* ---------------- persona helpers ---------------- */
  personaDef(id) { return S7.PERSONAS[id || this.st.persona]; }
  pstate(id) { return this.st.roster[id || this.st.persona]; }
  stats(id) { return this.pstate(id).stats; }
  maxHp(id) { return this.personaDef(id).hp; }
  weaponDef(id) { return S7.WEAPONS[this.personaDef(id).weapon]; }

  /* ---------------- tutorials (one-shot tips, cleared by doing the thing) ---------------- */
  tut(id, done) {
    const st = this.st; if (!st || this.o.attract) return;
    if (done) { if (this.tutorial && this.tutorial.id === id) this.tutorial = null; st.tut[id] = 2; return; }
    if (st.tut[id]) return;
    st.tut[id] = 1; this.tutorial = { id, t: 0 }; this.emit('tutorial', { id });
  }
}
S7.Sim = Sim;


/* ===== src/21-combat.js ===== */
/* COMBAT: aim mode (§7.3), weapons and shooting (§7.4), skills (§7.9), the scan and reveals (§7.5), damage, crits and
 * drops (§7.7), projectiles, healing (§7.11). */
const DEG = Math.PI / 180;
Object.assign(Sim.prototype, {
  /* ---------------- aim mode ---------------- */
  aimEnter() {
    const a = this.aim; a.on = true; a.yaw = this.W.yaw; a.pitch = clamp(a.pitch * .3, -.3, .3); a.scope = false; a.holdT = 0; a.reticle = null;
    this.healing = false; this.emit('aim', { on: true }); this.tut('aim', true);
    if (this.anyAlive() && !this.st.tut.scan) this.tut('scan');
  },
  aimExit(silent) {
    const a = this.aim; if (!a.on && !silent) return;
    a.on = false; a.scope = false; a.toggled = false;
    for (const d of this.drops) d.pull = true;   // drops fly to you when you leave aim mode
    if (!silent) this.emit('aim', { on: false });
  },
  /** look: the pad's curve, rates, acceleration and assist; the mouse in look or pointer mode */
  updateAim(dt, I) {
    const a = this.aim, st = this.st;
    const inv = this.game.input && this.game.input.invertAimY ? -1 : 1;
    const sens = this.setting('padSens', 1) * T.padSensK, scopeK = a.scope ? .3 : 1;
    let dyaw = 0, dpitch = 0;
    const ls = I.lookStick, mag = Math.hypot(ls[0], ls[1]);
    // the left stick aims at 60% when the right one is idle (§6.1)
    let sx = ls[0], sy = ls[1], m2 = mag;
    if (mag < .1 && I.device === 'gamepad' && Math.hypot(I.stick[0], I.stick[1]) > .2) { sx = I.stick[0] * .6; sy = I.stick[1] * .6; m2 = Math.hypot(sx, sy); }
    if (m2 > .05) {
      const k = Math.pow(Math.min(1, m2), 1.8) / m2;
      a.holdT = m2 > .9 ? a.holdT + dt : 0;
      const accel = 1 + .6 * clamp((a.holdT - .35) / .3, 0, 1);
      let ky = 1, kp = 1;
      const near = this.assistTarget();
      const assist = this.assistLevel();
      if (near && assist > 0) { const slow = assist >= 2 ? .4 : .55; if (near.ang < 3.5 * DEG) { ky = kp = 1 - (1 - slow) * T.assistK; } }
      dyaw += sx * k * 160 * DEG * dt * sens * accel * scopeK * ky;
      dpitch -= sy * k * 110 * DEG * dt * sens * accel * scopeK * kp * inv;
    } else a.holdT = 0;
    // magnetism toward a revealed warm spot within 5° (controller only)
    if (I.device === 'gamepad') {
      const near = this.assistTarget(), lv = this.assistLevel();
      if (near && lv > 0 && near.ang < 5 * DEG) {
        const pull = (lv >= 2 ? .25 : .12) * T.assistK * dt * 4;
        a.yaw += S7.angDiff(a.yaw, near.yaw) * pull; a.pitch += (near.pitch - a.pitch) * pull;
      }
    }
    // the mouse: look mode turns by pixels; pointer mode moves the reticle and pans at the edges
    const mouseMode = this.setting('mouseMode', 'look');
    const msens = this.setting('mouseSens', .12) * DEG * scopeK;
    if (mouseMode === 'pointer' && I.pointer && this.game.W) {
      const sx2 = I.pointer[0] / this.game.W, sy2 = I.pointer[1] / this.game.H;
      a.reticle = [clamp(sx2, 0, 1), clamp(sy2, 0, 1)];
      const ex = sx2 < .1 ? (sx2 - .1) / .1 : sx2 > .9 ? (sx2 - .9) / .1 : 0, ey = sy2 < .1 ? (sy2 - .1) / .1 : sy2 > .9 ? (sy2 - .9) / .1 : 0;
      dyaw += clamp(ex, -1, 1) * 120 * DEG * dt; dpitch -= clamp(ey, -1, 1) * 120 * DEG * dt;
    } else {
      a.reticle = null;
      dyaw += I.mouse[0] * msens; dpitch -= I.mouse[1] * msens * inv;
    }
    if (I.lookAbs) { a.yaw = I.lookAbs[0]; a.pitch = I.lookAbs[1]; dyaw = dpitch = 0; }   // the bot's and attract mode's aim
    a.yaw = S7.wrapAng(a.yaw + dyaw);
    a.pitch = clamp(a.pitch + dpitch, -70 * DEG, 70 * DEG);
    a.recoil = Math.max(0, a.recoil - 10 * DEG * dt);
    a.swayT += dt;
    if (st.persona === 'ignaz' && I.skillP) { a.scope = !a.scope; this.emit('scope', { on: a.scope }); this.tut('longlook', true); }
  },
  assistLevel() {
    if (this.I && this.I.device !== 'gamepad') return 0;
    const v = this.setting('aimAssist', 'default'), d = v === 'default' ? this.diff().assist : v;
    return d === 'high' ? 2 : d === 'low' ? 1 : 0;
  },
  /** the revealed warm spot nearest the aim within 5°: { yaw, pitch, ang } */
  assistTarget() {
    const a = this.aim, eye = this.eye(); let best = null;
    const consider = (p) => {
      const d = V.sub(p, eye), yaw = Math.atan2(d[1], d[0]), pitch = Math.atan2(d[2], Math.hypot(d[0], d[1]));
      const ang = Math.hypot(S7.angDiff(a.yaw, yaw) * Math.cos(a.pitch), pitch - a.pitch);
      if (ang < 5 * DEG && (!best || ang < best.ang) && this.grid.los(eye, p)) best = { yaw, pitch, ang };
    };
    for (const e of this.enemies) if (e.alive && this.isRevealed(e) && V.dist(this.eye(), this.warmPos(e)) < 30 * M) consider(this.warmPos(e));
    if (this.boss) for (const w of this.bossWarmSpots()) if (w.open) consider(w.p);
    for (const s of this.spots) if (s.target && !this.spotUsed(s)) consider([s.x, s.y, s.z]);
    return best;
  },
  swayOffset() {
    const a = this.aim, lv = this.stats().steady;
    let amp = Math.max(.1, .7 * (1 - .15 * lv)) * DEG;
    if (a.scope) amp *= .5;
    return [Math.sin(a.swayT * TAU * .6) * amp, Math.sin(a.swayT * TAU * .9 + 1) * amp * .7];
  },
  /** the aim's ray: the eye, along the reticle (centre or pointer), with sway and recoil */
  aimRay() {
    const a = this.aim, pose = this.cam.pose;
    if (a.reticle && this.game.W) { const r = S7.unproject(pose, a.reticle[0], a.reticle[1], this.game.W / this.game.H); return { o: this.eye(), d: r.d }; }
    const sw = this.swayOffset();
    return { o: this.eye(), d: V.dir(a.yaw + sw[0], a.pitch + a.recoil + sw[1]) };
  },

  /* ---------------- weapons ---------------- */
  mag(id) {
    id = id || this.st.persona;
    this.mags = this.mags || {};
    if (!this.mags[id]) { const W = this.weaponDef(id); this.mags[id] = { n: W.mag, reload: 0, cd: 0, heat: 0, alt: 0 }; }
    return this.mags[id];
  },
  updateWeapons(dt, I) {
    const W = this.weaponDef(), m = this.mag(), lv = this.stats().speed;
    m.cd = Math.max(0, m.cd - dt);
    for (const id in this.mags) { const o = this.mags[id]; if (o.reload > 0 && id !== this.st.persona) { o.reload -= dt; if (o.reload <= 0) { o.reload = 0; o.n = S7.WEAPONS[this.personaDef(id).weapon].mag; } } }
    if (W.heat) { m.heatCool = (m.heatCool || 0) + dt; if (m.heatCool > 1.2 && m.n < W.mag && m.reload <= 0) { m.n++; m.heatCool = 0; } }
    if (m.reload > 0) {
      m.reload -= dt;
      if (W.perShell) { m.shellT = (m.shellT || 0) + dt; if (m.shellT >= W.reload * (1 - .08 * lv)) { m.shellT = 0; m.n = Math.min(W.mag, m.n + 1); this.emit('shell', {}); if (m.n >= W.mag) m.reload = 0; else m.reload = 1; } if (I.fireP && m.n > 0) m.reload = 0; }
      else if (m.reload <= 0) { m.reload = 0; m.n = W.mag; this.emit('reloaded', {}); }
      if (m.reload > 0) return;
    }
    if (!this.aim.on) return;
    if (I.reloadP && m.n < W.mag && !W.heat) { this.startReload(); return; }
    const pull = W.auto ? I.fireD : I.fireP;
    if (pull && m.cd <= 0) {
      if (m.n <= 0) { if (W.heat) { this.emit('dryfire', {}); m.cd = .3; } else { this.emit('dryfire', {}); this.startReload(); } return; }
      this.fire(W, m);
    }
  },
  startReload() {
    const W = this.weaponDef(), m = this.mag(), lv = this.stats().speed;
    if (m.reload > 0) return;
    if (W.perShell) { m.reload = 1; m.shellT = 0; }
    else m.reload = W.reload * (1 - .08 * lv);
    this.emit('reload', { weapon: W.id, t: m.reload });
  },
  fire(W, m) {
    const P = this.st.persona;
    m.n--; m.cd = W.interval; m.alt = 1 - m.alt; m.heatCool = 0;
    if (W.heat && m.n <= 0) { m.reload = W.reload; this.emit('overheat', {}); }
    const ray = this.aimRay();   // the shot leaves before its own kick lifts the muzzle
    this.aim.recoil += W.recoil * DEG;
    const res = this.st.results[this.areaDef.target !== undefined ? this.areaDef.target : this.st.target];
    res.shots++;
    this.emit('shot', { persona: P, weapon: W.id, alt: m.alt, from: ray.o, dir: ray.d });
    if (W.kind === 'hitscan') this.hitscan(ray, W, W.dmg, W.spread * DEG, W.pierce || 0);
    else if (W.kind === 'pellets') { for (let i = 0; i < W.pellets; i++) this.hitscan(ray, W, W.dmg, W.spread * DEG, 0, true); }
    else if (W.kind === 'cone') this.coneBlast(ray, W);
    else if (W.kind === 'lob') this.lob(ray, W, false);
    if (m.n <= 0 && !W.heat) this.startReload();
  },
  /** a hitscan shot: the nearest of warm spots, bodies, shields, targets, projectiles and the level */
  hitscan(ray, W, dmg, spread, pierce, pellet) {
    let d = ray.d;
    if (spread > 0) {
      const a = S7.rnd('spread') * TAU, r = Math.sqrt(S7.rnd('spread')) * spread, B = S7.basis(Math.atan2(d[1], d[0]), Math.asin(clamp(d[2], -1, 1)));
      d = V.norm(V.add(d, V.add(V.mul(B.r, Math.cos(a) * Math.tan(r)), V.mul(B.u, Math.sin(a) * Math.tan(r)))));
    }
    const range = (W.range || 60) * M * (this.aim.scope ? 250 / 120 : 1);
    const wallT = this.grid.ray(ray.o, d, range * 2.5, 3);
    const hits = this.rayHits(ray.o, d, Math.min(wallT, range * 2.5));
    let pierced = 0;
    for (const h of hits) {
      const far = h.t > range;
      const k = (1 + .12 * this.stats().power) * (far ? .25 : 1);
      if (h.kind === 'warm' || h.kind === 'body') { this.hitEnemy(h.e, h.kind === 'warm', dmg * k, { dir: d, pellet, weapon: W.id, burn: W.burn }); if (W.knock && h.e.alive) this.knockEnemy(h.e, d, W.knock * .3); if (pierced++ >= pierce) return h; continue; }
      if (h.kind === 'shield') { this.emit('tink', { at: h.p }); if (W.knock) this.knockEnemy(h.e, d, W.knock); h.e.tinks = (h.e.tinks || 0) + 1; if (h.e.tinks === 4 && !this.st.flags.plowTip) { this.st.flags.plowTip = 1; this.say('The slab takes everything. Spin it: Rurik\'s buckshot or Kasimir\'s horn. Or wait for its back.', { who: 'ignaz', life: 4.5 }); } return h; }
      if (h.kind === 'proj') { this.destroyProjectile(h.pr, true); return h; }
      if (h.kind === 'boss') { this.hitBoss(h.w, dmg * k, d); return h; }
      if (h.kind === 'target') { this.hitTarget(h.s, W, h.p); return h; }
    }
    if (wallT < range * 2.5) { const p = V.add(ray.o, V.mul(d, wallT)); this.emit('impact', { at: p }); return { kind: 'wall', p }; }
    return null;
  },
  /** everything a ray crosses before maxT, nearest first */
  rayHits(o, d, maxT) {
    const out = [], wr = this.warmR();
    for (const e of this.enemies) {
      if (!e.alive || e.melting) continue;
      const ED = S7.ENEMIES[e.type], h = (ED.height || 34) * e.size, r = (ED.radius || 5) * e.size;
      const bt = S7.rayCapsule(o, d, [e.x, e.y, e.z], h, r);
      // a Plow's slab blocks shots from the front, warm spot and all
      if (bt >= 0 && bt < maxT && e.shield && !e.turned) { const f = [Math.cos(e.facing), Math.sin(e.facing)]; if (f[0] * -d[0] + f[1] * -d[1] > .2) { out.push({ kind: 'shield', e, t: bt, p: V.add(o, V.mul(d, bt)) }); continue; } }
      const wp = this.warmPos(e), wt = e.warmOpen === false ? -1 : S7.raySphere(o, d, wp, wr * (ED.warmK || 1));
      if (wt >= 0 && wt < maxT) { out.push({ kind: 'warm', e, t: Math.max(0, (bt >= 0 ? Math.min(bt, wt) : wt) - .01), p: V.add(o, V.mul(d, wt)) }); continue; }
      if (bt >= 0 && bt < maxT) out.push({ kind: 'body', e, t: bt, p: V.add(o, V.mul(d, bt)) });
    }
    for (const pr of this.projectiles) if (pr.hostile && pr.hp > 0) { const t = S7.raySphere(o, d, [pr.x, pr.y, pr.z], (pr.r || 4) + 2); if (t >= 0 && t < maxT) out.push({ kind: 'proj', pr, t }); }
    if (this.boss) {
      const bh = [];
      for (const w of this.bossWarmSpots()) { const t = S7.raySphere(o, d, w.p, w.r); if (t >= 0 && t < maxT) bh.push({ kind: 'boss', w, t, p: V.add(o, V.mul(d, t)) }); }
      // a warm spot set into a body wins over the body round it (as on a Whiteout)
      const warm = bh.filter(h => h.w.kind === 'warm' && h.w.open);
      if (warm.length) { const body = bh.find(h => h.w.kind === 'body'); for (const h of warm) { if (body) h.t = Math.min(h.t, body.t); out.push(h); } }
      else out.push(...bh);
    }
    for (const s of this.spots) if (s.target && !this.spotUsed(s)) { const t = S7.raySphere(o, d, [s.x, s.y, s.z], (s.r || .6) * M); if (t >= 0 && t < maxT) out.push({ kind: 'target', s, t, p: V.add(o, V.mul(d, t)) }); }
    out.sort((a, b) => a.t - b.t);
    return out;
  },
  warmR() { const lv = this.stats().critical; return 5 * (1 + .1 * lv) * (this.st.persona === 'mireille' ? 1.25 : 1) * T.warmRadius; },
  /** the Alphorn: a 25° cone, 18 m, everything in it */
  coneBlast(ray, W) {
    const o = ray.o, d = ray.d, R = W.range * M, cosA = Math.cos(W.cone / 2 * DEG);
    let n = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = [e.x, e.y, e.z + 18 * e.size], v = V.sub(c, o), L = V.len(v);
      if (L > R || V.dot(v, d) / (L || 1) < cosA || !this.grid.los(o, c)) continue;
      this.hitEnemy(e, false, W.dmg * (1 + .12 * this.stats().power), { dir: d, weapon: W.id, cone: true });
      this.knockEnemy(e, d, W.knock || 60); n++;
    }
    for (const pr of this.projectiles) if (pr.hostile) { const v = V.sub([pr.x, pr.y, pr.z], o), L = V.len(v); if (L < R && V.dot(v, d) / (L || 1) > cosA) this.destroyProjectile(pr, true); }
    if (this.boss) for (const w of this.bossWarmSpots()) { const v = V.sub(w.p, o), L = V.len(v); if (L < R && V.dot(v, d) / (L || 1) > cosA) this.hitBoss(w, W.dmg, d, true); }
    this.emit('blast', { from: o, dir: d, n });
  },
  /** the Avalauncher's shell (or Brigid's Control Charge): a lob that bursts on contact or after 2 s */
  lob(ray, W, charge) {
    const sp = charge ? 520 : 300;
    this.projectiles.push({ id: this.uid++, kind: charge ? 'charge' : 'shell', x: ray.o[0] + ray.d[0] * 8, y: ray.o[1] + ray.d[1] * 8, z: ray.o[2] + ray.d[2] * 8 - 3, vx: ray.d[0] * sp, vy: ray.d[1] * sp, vz: ray.d[2] * sp + 40, g: charge ? 240 : 300, life: charge ? 4 : 2, dmg: charge ? 90 : W.dmg, radius: (charge ? 5 : 2.5) * M, hostile: false, hp: 1, r: 3 });
  },
  explode(p, radius, dmg, o = {}) {
    this.emit('explode', { at: p, radius, kind: o.kind || 'shell' });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = [e.x, e.y, e.z + 16], d = V.dist(c, p);
      if (d < radius) { this.hitEnemy(e, false, dmg * (1 - d / radius * .5) * (1 + .12 * this.stats().power), { splash: true }); this.knockEnemy(e, V.norm(V.sub(c, p)), 80); if (e.shield) e.turnT = 1.2; }
    }
    if (this.boss) for (const w of this.bossWarmSpots()) if (V.dist(w.p, p) < radius + w.r) this.hitBoss(w, dmg * .5, null, true);
    if (o.charge) for (const s of this.spots) if ((s.kind === 'cornice' || s.kind === 'serac') && !this.spotUsed(s) && V.dist([s.x, s.y, s.z], p) < 3 * M + (s.r || 1) * M) this.solveSpot(s);
    // a player inside their own blast's edge is fine; a Giggler's contact blast hurts (hurtPlayer is called by enemies)
  },
  updateProjectiles(dt) {
    const eye = this.eye(), chest = [this.hero.x, this.hero.y, this.hero.z + 20];
    for (const p of this.projectiles) {
      if (p.hp <= 0) continue;
      p.life -= dt;
      p.vz -= (p.g || 0) * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (p.homing && p.hostile) { const d = V.norm(V.sub(chest, [p.x, p.y, p.z])); const sp = Math.hypot(p.vx, p.vy, p.vz); p.vx += (d[0] * sp - p.vx) * dt * p.homing; p.vy += (d[1] * sp - p.vy) * dt * p.homing; }
      const solid = this.grid.solidAt(nx, ny, nz);
      p.x = nx; p.y = ny; p.z = nz;
      if (!p.hostile) {
        // the player's shells: burst on an enemy, the level, the boss, or time out
        let hit = solid || p.life <= 0;
        if (!hit) for (const e of this.enemies) if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 8 * e.size && p.z > e.z && p.z < e.z + 34 * e.size) { hit = true; break; }
        if (!hit && this.boss) for (const w of this.bossWarmSpots()) if (V.dist(w.p, [p.x, p.y, p.z]) < w.r + 6) hit = true;
        if (!hit) for (const s of this.spots) if ((s.kind === 'cornice' || s.kind === 'serac') && V.dist([s.x, s.y, s.z], [p.x, p.y, p.z]) < (s.r || 1) * M + 6) hit = true;
        if (hit) { p.hp = 0; this.explode([p.x, p.y, p.z], p.radius, p.dmg, { charge: p.kind === 'charge', kind: p.kind }); }
        continue;
      }
      // hostile: snowballs, ice cubes, suitcases, medals
      if (V.dist([p.x, p.y, p.z], chest) < 12 || V.dist([p.x, p.y, p.z], eye) < 10) { p.hp = 0; this.hurtPlayer(p.dmg, [p.x, p.y, p.z], p.kind); this.emit('splat', { at: [p.x, p.y, p.z], kind: p.kind }); continue; }
      if (solid || p.life <= 0) {
        p.hp = 0; this.emit('splat', { at: [p.x, p.y, p.z], kind: p.kind });
        if (p.landDmg && V.dist2([p.x, p.y], chest) < 1.5 * M) this.hurtPlayer(p.landDmg, [p.x, p.y, p.z], p.kind);
        if (p.onLand) p.onLand(this, p);
      }
    }
    this.projectiles = this.projectiles.filter(p => p.hp > 0);
  },
  throwAt(from, kind, o = {}) {
    const chest = [this.hero.x, this.hero.y, this.hero.z + 20 + (o.aimUp || 0)], sp = o.speed || 220;
    const d = V.sub(chest, from), L = V.len(d), t = L / sp, g = o.g !== undefined ? o.g : 160;
    const pr = { id: this.uid++, kind, x: from[0], y: from[1], z: from[2], vx: d[0] / t, vy: d[1] / t, vz: d[2] / t + .5 * g * t, g, life: t + 1.5, dmg: o.dmg || 8, hostile: true, hp: o.hp || 1, r: o.r || 4, landDmg: o.landDmg, onLand: o.onLand, red: o.red || 0, homing: o.homing || 0, owner: o.owner };
    this.projectiles.push(pr);
    this.emit('throw', { kind, at: from });
    return pr;
  },
  destroyProjectile(p, byShot) {
    p.hp = 0; this.emit('shatter', { at: [p.x, p.y, p.z], kind: p.kind });
    if (byShot && p.red) this.dropLoot([p.x, p.y, p.z], p.red, 0);
  },

  /* ---------------- hits, crits, kills ---------------- */
  hitEnemy(e, warm, dmg, o = {}) {
    if (!e.alive) return;
    const ED = S7.ENEMIES[e.type];
    e.reveal = Math.max(e.reveal, 3); e.hurtT = .25;
    const res = this.curResults(); res.hits++;
    if (CHEAT.oneHit) warm = true;
    if (ED.onHit && ED.onHit(this, e, warm, dmg, o) === false) return;
    if (warm && !ED.noCrit) {
      e.hp = 0; this.kill(e, true);
      return;
    }
    e.hp -= dmg;
    if (o.burn) e.burn = 3;
    this.emit('hit', { target: e, part: warm ? 'warm' : 'body', dmg, at: [e.x, e.y, e.z + 18] });
    if (e.hp <= 0) this.kill(e, false);
  },
  kill(e, crit) {
    if (!e.alive) return;
    const ED = S7.ENEMIES[e.type];
    e.alive = false; e.melting = 0; e.crit = crit;
    const res = this.curResults(); res.kills++; if (crit) res.crits++;
    const lv = this.stats().critical;
    const red = Math.round((crit ? ED.red[1] : ED.red[0]) * this.diff().red * T.redDrop);
    let rime = crit ? Math.round((ED.rime || 1) * T.rimeDrop) + (lv >= 3 ? 1 : 0) : 0;
    this.dropLoot([e.x, e.y, e.z + 14], red, rime, V.dist2([e.x, e.y], [this.hero.x, this.hero.y]) < 10 * M);
    if (crit) {
      this.emit('crit', { enemy: e, at: this.warmPos(e) });
      this.splash('THAW.', { crit: true });
      this.game.freeze && this.game.freeze(.06);
      if (CHEAT.slowCrit) this.critSlow = .5;
      if (!this.st.flags.firstCrit) { this.st.flags.firstCrit = 1; this.tut('fire', true); }
      this.bark('crit');
    }
    this.emit('kill', { enemy: e, type: e.type, crit, at: [e.x, e.y, e.z] });
    if (ED.onKill) ED.onKill(this, e, crit);
    if (e.onKill) e.onKill(this, e, crit);
  },
  curResults() { return this.st.results[this.areaDef.target !== undefined ? this.areaDef.target : this.st.target]; },
  knockEnemy(e, d, k) { e.kx = (e.kx || 0) + d[0] * k; e.ky = (e.ky || 0) + d[1] * k; if (e.shield) { e.turnT = 1.2; } },
  dropLoot(p, red, rime, instant) {
    if (red > 0) this.drops.push({ kind: 'red', n: red, x: p[0], y: p[1], z: p[2], vz: 60, t: 0, pull: instant });
    if (rime > 0) this.drops.push({ kind: 'rime', n: rime, x: p[0], y: p[1], z: p[2] + 4, vz: 70, t: 0, pull: instant });
  },
  updateDrops(dt) {
    const h = this.hero, c = [h.x, h.y, h.z + 16];
    for (const d of this.drops) {
      d.t += dt;
      if (!d.pull && V.dist(c, [d.x, d.y, d.z]) < 4 * M && !this.aim.on) d.pull = true;
      if (d.pull && d.t > .25) {
        const v = V.sub(c, [d.x, d.y, d.z]), L = V.len(v), sp = 260 + d.t * 200;
        if (L < 8) { d.got = true; this.gain(d.kind, d.n, [d.x, d.y, d.z]); continue; }
        d.x += v[0] / L * sp * dt; d.y += v[1] / L * sp * dt; d.z += v[2] / L * sp * dt;
      } else { d.vz -= 200 * dt; d.z = Math.max(this.grid.floorAt(d.x, d.y) + 4, d.z + d.vz * dt); }
      if (d.t > 30) d.pull = true;
    }
    this.drops = this.drops.filter(d => !d.got);
  },
  gain(kind, n, at) {
    const st = this.st;
    if (kind === 'red') { st.red = Math.min(999, st.red + n); this.curResults().red += n; }
    else if (kind === 'rime') st.rime += n;
    this.emit('pickup', { kind, amount: n, at });
  },

  /* ---------------- the player's health ---------------- */
  hurtPlayer(dmg, from, kind) {
    if (CHEAT.god || this.o.attract || this.switching || this.areaDef.kind === 'room7' || this.mode === 'frozen' || this.cutscene) return;
    const ps = this.pstate();
    const d = Math.max(1, Math.round(dmg * this.diff().dmg * T.playerDamage));
    ps.hp = Math.max(0, ps.hp - d);
    this.emit('hurt', { persona: this.st.persona, dmg: d, from, kind });
    if (ps.hp > 0 && ps.hp < this.maxHp() * .3 && !this.lowBarked) { this.lowBarked = true; this.bark('low'); }
    if (ps.hp <= 0) this.freezePersona();
    else if (ps.hp < this.maxHp() * .7) this.tut('heal');
  },

  /* ---------------- reveals: scan, flare, echo, flash; tells ---------------- */
  isRevealed(e) { return CHEAT.revealAll || this.o.attract || e.reveal > 0 || e.alwaysVisible; },
  revealFor() { return (T.revealTime + .4 * this.stats().steady) * this.diff().reveal; },
  updateReveals(dt) {
    const sc = this.scan;
    if (sc) {
      sc.t += dt; const R = T.scanRadius * M * Math.min(1, sc.t / .6), c = sc.at;
      for (const e of this.enemies) if (e.alive && !sc.hit[e.id] && V.dist2(c, [e.x, e.y]) <= R) { sc.hit[e.id] = 1; e.reveal = Math.max(e.reveal, this.revealFor()); this.emit('reveal', { enemy: e, by: 'scan' }); }
      if (sc.t > .8) this.scan = null;
    }
    this.scanCd = Math.max(0, (this.scanCd || 0) - dt);
    for (const e of this.enemies) if (e.reveal > 0) e.reveal -= dt;
    if (this.flare) { this.flare.t -= dt; for (const e of this.enemies) if (e.alive && V.dist2([e.x, e.y], [this.flare.x, this.flare.y]) < 30 * M) e.reveal = Math.max(e.reveal, .3); if (this.flare.t <= 0) this.flare = null; }
    if (this.echo) { this.echo.t -= dt; if (this.echo.t <= 0) this.echo = null; }
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
  },
  doScan() {
    if (this.scanCd > 0) return;
    this.scanCd = 1.2;
    this.scan = { t: 0, at: [this.hero.x, this.hero.y, this.hero.z], hit: {} };
    this.emit('scan', { at: this.scan.at, radius: T.scanRadius * M });
    this.tut('scan', true);
  },

  /* ---------------- skills ---------------- */
  updateSkills(dt, I) {
    const st = this.st, id = st.persona, P = this.personaDef();
    this.skillCd = this.skillCd || {};
    for (const k in this.skillCd) this.skillCd[k] = Math.max(0, this.skillCd[k] - dt);
    if (this.mode === 'frozen' || this.switching) return;
    if (this.aim.on && I.scanP) this.doScan();
    // Dagny's tuck: hold, 2 Red a second, while moving or skiing
    this.tucking = id === 'dagny' && I.skillD && (I.move || (this.W.edge && this.rails.edges[this.W.edge].kind === 'ski')) && (st.red > 0 || CHEAT.infRed) || (this.tucking && this.W.edge && this.rails.edges[this.W.edge] && this.rails.edges[this.W.edge].kind === 'ski' && I.move);
    if (id === 'dagny' && I.skillD && this.tucking) this.spendRed(2 * dt, true);
    if (!I.skillP || id === 'ignaz' || id === 'dagny') return;
    const S = P.skill;
    if (S.aimOnly && !this.aim.on) { this.say(S.name.toUpperCase() + ': AIM FIRST.'); return; }
    if ((this.skillCd[id] || 0) > 0) { this.emit('dryfire', {}); return; }
    if (!this.spendRed(S.cost)) { this.emit('noRed', {}); this.toast('NOT ENOUGH RED'); return; }
    this.skillCd[id] = S.cooldown || 1;
    this.emit('skill', { persona: id, skill: S.id });
    this.tut('skill', true);
    const h = this.hero, c = [h.x, h.y, h.z];
    if (S.id === 'flare') { this.flare = { x: h.x, y: h.y, z: h.z + 6 * M, t: 8 }; for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 30 * M) e.reveal = Math.max(e.reveal, 8); }
    else if (S.id === 'makeitrain') { for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 12 * M && !S7.ENEMIES[e.type].boss) { e.kneel = 3; } }
    else if (S.id === 'echo') {
      this.echo = { t: 5, x: h.x, y: h.y };
      for (const e of this.enemies) if (e.alive && V.dist2(c, [e.x, e.y]) < 40 * M) { e.reveal = Math.max(e.reveal, 5); e.marked = 5; }
      for (const s of this.spots) {
        if (this.spotUsed(s)) continue;
        const d = V.dist2(c, [s.x, s.y]);
        if (s.kind === 'echowall' && d < 25 * M) this.solveSpot(s);
        if (s.kind === 'crystal' && d < 15 * M) this.solveSpot(s);
      }
      for (const pr of this.projectiles) if (pr.hostile && pr.kind === 'snowball' && V.dist2(c, [pr.x, pr.y]) < 15 * M) this.destroyProjectile(pr, true);
    }
    else if (S.id === 'flash') {
      const ray = this.aimRay(), cosA = Math.cos(35 / 2 * DEG);
      this.flash = { t: .35 };
      for (const e of this.enemies) {
        if (!e.alive) continue; const v = V.sub([e.x, e.y, e.z + 18], ray.o), L = V.len(v);
        if (L < 25 * M && V.dot(v, ray.d) / L > cosA && this.grid.los(ray.o, [e.x, e.y, e.z + 18])) { e.stun = 2.5; e.reveal = Math.max(e.reveal, this.revealFor()); }
      }
      for (const s of this.spots) if (s.kind === 'exposure' && !this.spotUsed(s)) { const v = V.sub([s.x, s.y, s.z], ray.o), L = V.len(v); if (L < 25 * M && V.dot(v, ray.d) / L > Math.cos(25 * DEG)) this.solveSpot(s); }
    }
    else if (S.id === 'charge') this.lob(this.aimRay(), this.weaponDef(), true);
  },
  spendRed(n, partial) {
    if (CHEAT.infRed || this.o.attract) return true;
    if (this.st.red < n && !partial) return false;
    this.st.red = Math.max(0, this.st.red - n);
    return true;
  },
  /** healing (§7.11): hold in rail mode, 40 HP a second, 1 Red each */
  updateEconomy(dt, I) {
    const ps = this.pstate(), max = this.maxHp();
    if (this.healing && ps.hp < max && (this.st.red > 0 || CHEAT.infRed)) {
      const want = Math.min(max - ps.hp, T.healRate * dt), take = CHEAT.infRed ? want : Math.min(want, this.st.red);
      ps.hp += take; if (!CHEAT.infRed) this.st.red -= take;
      this.healAcc = (this.healAcc || 0) + take;
      if (this.healAcc > 4) { this.emit('heal', { amount: this.healAcc }); this.healAcc = 0; }
      if (ps.hp >= max * .7) this.lowBarked = false;
      this.tut('heal', true);
    }
    if (CHEAT.infRed) this.st.red = Math.max(this.st.red, 999);
  }
});


/* ===== src/30-whiteouts.js ===== */
/* WHITEOUTS (§7.6): people the Föhn touched, laughing themselves invisible. Each type's numbers are in
 * content/enemies.js; their behaviours are here (ai: walker, runner, sled, thrower, twins, plow, inspector, bloom,
 * dancer, crawler). They walk flow fields indoors and straight lines on terrain, keep a metre apart, giggle up when
 * they reach you and burst. */
const WARM_SPOTS = { head: [.6, 0, 30], chest: [2.2, 0, 22], belly: [2.6, 0, 15.5], knee: [1.6, 1.8, 7.5], hand: [2.4, 5.4, 13], back: [-3.2, 0, 20], high: [0, 0, 44] };
const LAUGH_STYLES = ['giggle', 'cackle', 'chuckle', 'wheeze'];
Object.assign(Sim.prototype, {
  spawnEnemy(type, at, o = {}) {
    const ED = S7.ENEMIES[type]; if (!ED) throw new Error('unknown enemy ' + type);
    const p = Array.isArray(at) ? at : [at.x, at.y];
    const x = Array.isArray(at) ? p[0] * M : p[0], y = Array.isArray(at) ? p[1] * M : p[1];
    const size = (o.size || ED.size || 1) * (1 + (S7.rnd('spawn') - .5) * .16);
    const e = {
      id: this.uid++, type, x, y, z: this.grid.floorAt(x, y) + (o.z || 0), facing: Math.atan2(this.hero.y - y, this.hero.x - x), size,
      hp: (o.hp || ED.hp) * T.enemyHP, maxHp: (o.hp || ED.hp) * T.enemyHP, alive: true, reveal: o.reveal || 0, wave: o.wave || null, t: S7.rnd('spawn') * 3,
      speed: (ED.speed[0] + (ED.speed[1] - ED.speed[0]) * S7.rnd('spawn')) * this.diff().speed * T.enemySpeed * (o.speedK || 1),
      warm: o.warm || ED.warm || S7.pick('spawn', ['head', 'chest', 'belly', 'knee', 'hand']), warmSide: S7.rnd('spawn') < .5 ? -1 : 1,
      style: ED.laugh || LAUGH_STYLES[Math.floor(S7.rnd('laugh') * 4)], pitch: (S7.rnd('laugh') - .5) * 6, laughT: 1 + S7.rnd('laugh') * 3,
      tint: ['#f6f2f4', '#f2f6fa', '#f8f4ee', '#f0f6f2', '#f6f0f6'][Math.floor(S7.rnd('spawn') * 5)], kx: 0, ky: 0, giggle: 0,
      shield: !!ED.shield, turned: false, turnT: 0, cycle: 0, passive: !!ED.passive, warmOpen: true, spots: ED.spots ? ED.spots : 0,
      hat: ED.hats ? S7.pick('spawn', ED.hats) : null, vx: 0, vy: 0, data: o.data || {}
    };
    if (o.facing !== undefined) e.facing = o.facing;
    if (ED.init) ED.init(this, e, o);
    this.enemies.push(e);
    this.emit('spawn', { enemy: e });
    return e;
  },
  /** where an enemy's warm spot is this step (world units) */
  warmPos(e) {
    const ED = S7.ENEMIES[e.type];
    if (ED.warmAt) return ED.warmAt(this, e);
    const w = WARM_SPOTS[e.warm] || WARM_SPOTS.chest, f = e.facing + (e.turned ? Math.PI : 0), c = Math.cos(f), s = Math.sin(f), k = e.size;
    let lx = w[0], ly = w[1] * e.warmSide, lz = w[2];
    if (ED.ai === 'twins') { const a = this.time * 1.4 + e.id; lx = Math.cos(a) * 5.5; ly = Math.sin(a) * 5.5; lz = 19; }
    return [e.x + (lx * c - ly * s) * k, e.y + (lx * s + ly * c) * k, e.z + lz * k + (e.sinkZ || 0)];
  },
  updateEnemies(dt) {
    const h = this.hero, pc = [h.x, h.y, h.z];
    const G = this.grid, flow = G.kind === 'level' ? G.flow(Math.floor(h.x / M), Math.floor(h.y / M)) : null;
    const frozenPlay = this.switching || this.areaDef.kind === 'room7' || this.mode === 'frozen' || this.cutscene;
    for (const e of this.enemies) {
      const ED = S7.ENEMIES[e.type];
      if (!e.alive) {   // melting into red slush
        e.melting += dt; if (e.melting > .8) e.gone = true;
        continue;
      }
      e.t += dt;
      if (e.hurtT > 0) e.hurtT -= dt;
      if (e.burn > 0) { e.burn -= dt; e.hp -= 5 * dt; if (e.hp <= 0) { this.kill(e, false); continue; } }
      if (e.marked > 0) e.marked -= dt;
      // laughter: louder and quicker as it nears
      const dist = V.dist2([e.x, e.y], [h.x, h.y]);
      e.laughT -= dt;
      if (e.laughT <= 0 && !ED.silent) {
        e.laughT = (1.6 + S7.rnd('laugh') * 2.4) * clamp(dist / (25 * M), .35, 1.4);
        this.emit('laugh', { enemy: e, style: e.style, at: [e.x, e.y, e.z + 28 * e.size], pitch: e.pitch, loud: clamp(1 - dist / (60 * M), 0, 1) });
        e.laughPose = .5;
      }
      if (e.laughPose > 0) e.laughPose -= dt;
      if (e.kneel > 0) { e.kneel -= dt; continue; }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (frozenPlay && e.giggle > 0) continue;
      // knockback slides
      if (e.kx || e.ky) { this.moveEnemy(e, e.kx * dt, e.ky * dt); e.kx *= Math.pow(.02, dt); e.ky *= Math.pow(.02, dt); if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0; }
      // the giggle-up: 0.35 s of swelling, then the burst
      if (e.giggle > 0) {
        e.giggle += dt;
        if (e.giggle >= .35) { this.burst(e); }
        continue;
      }
      const ai = AI[ED.ai] || AI.walker;
      ai(this, e, ED, dt, flow, dist);
      if (ED.contact && !frozenPlay && dist < 1.5 * M * Math.max(1, e.size) && Math.abs(e.z - h.z) < 2.5 * M && this.mode !== 'frozen') { e.giggle = .001; this.emit('giggleup', { enemy: e }); }
    }
    // keep a metre apart
    const L = this.enemies;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (!a.alive || !b.alive || a.fixed || b.fixed) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = M * (a.size + b.size) * .5;
      if (d > 0 && d < min) { const p = (min - d) / 2 / d; this.moveEnemy(a, -dx * p, -dy * p); this.moveEnemy(b, dx * p, dy * p); }
    }
    this.enemies = this.enemies.filter(e => !e.gone);
  },
  /** move an enemy, sliding along walls; z follows the floor */
  moveEnemy(e, dx, dy) {
    const G = this.grid, ok = (x, y) => G.kind === 'terrain' ? true : G.walkable(Math.floor(x / M), Math.floor(y / M)) && Math.abs(G.floorAt(x, y) - e.z) < 20;
    if (ok(e.x + dx, e.y + dy)) { e.x += dx; e.y += dy; }
    else if (ok(e.x + dx, e.y)) e.x += dx;
    else if (ok(e.x, e.y + dy)) e.y += dy;
    if (!e.fly) e.z = G.floorAt(e.x, e.y) + (e.hover || 0);
  },
  /** walk toward the player along the flow field (indoors) or straight (outdoors) */
  chase(e, dt, flow, speed, wobble) {
    const h = this.hero; let d = this.grid.kind === 'level' ? this.grid.flowDir(flow, e.x, e.y) : null;
    if (!d) { const dx = h.x - e.x, dy = h.y - e.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; }
    if (wobble) { const s = Math.sin(e.t * wobble[1] * TAU) * wobble[0], px = -d[1], py = d[0]; d = [d[0] + px * s, d[1] + py * s]; const l = Math.hypot(d[0], d[1]) || 1; d = [d[0] / l, d[1] / l]; }
    e.vx = d[0] * speed; e.vy = d[1] * speed;
    this.moveEnemy(e, d[0] * speed * dt, d[1] * speed * dt);
    e.facing = Math.atan2(h.y - e.y, h.x - e.x) * .3 + Math.atan2(d[1], d[0]) * .7;
    e.facing = Math.atan2(Math.sin(e.facing), Math.cos(e.facing));
  },
  burst(e) {
    const ED = S7.ENEMIES[e.type], h = this.hero;
    e.alive = false; e.melting = 0; e.burst = true;
    const d = V.dist2([e.x, e.y], [h.x, h.y]);
    if (d < (ED.blast || 1.5) * M * 1.6 && !this.switching && this.areaDef.kind !== 'room7') this.hurtPlayer(ED.contact * T.explodeDamage, [e.x, e.y, e.z + 16], 'burst');
    this.emit('explode', { at: [e.x, e.y, e.z + 16], radius: (ED.blast || 1.5) * M, kind: 'burst', enemy: e });
    if (this.echoRun) this.echoRun.penalty(this, e);
  },
  killAllEnemies() { for (const e of this.enemies) if (e.alive && !S7.ENEMIES[e.type].boss) this.kill(e, true); }
});

/* ---- behaviours ---- */
const AI = S7.AI = {
  walker(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.25, .5]); },
  runner(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.55, .8]); },
  /** a Tobogganer: rides straight at you, quickly; downhill it speeds up */
  sled(sim, e, ED, dt) {
    const h = sim.hero, dx = h.x - e.x, dy = h.y - e.y, l = Math.hypot(dx, dy) || 1;
    if (!e.dir) e.dir = [dx / l, dy / l];
    e.dir = [e.dir[0] * .97 + dx / l * .03, e.dir[1] * .97 + dy / l * .03];
    const dl = Math.hypot(e.dir[0], e.dir[1]) || 1;
    sim.moveEnemy(e, e.dir[0] / dl * e.speed * dt, e.dir[1] / dl * e.speed * dt);
    e.facing = Math.atan2(e.dir[1], e.dir[0]);
  },
  /** a Snowballer: stands and throws every 2.6 s between 25 and 60 m (ice cubes indoors) */
  thrower(sim, e, ED, dt) {
    const h = sim.hero, d = V.dist2([e.x, e.y], [h.x, h.y]);
    e.facing = Math.atan2(h.y - e.y, h.x - e.x);
    e.throwT = (e.throwT === undefined ? 1 + S7.rnd('spawn') * 1.5 : e.throwT) - dt;
    if (e.throwT <= 0) {
      e.throwT = ED.every || 2.6;
      if (d < (ED.reach || 60) * M && sim.grid.los([e.x, e.y, e.z + 28], [h.x, h.y, h.z + 20])) {
        sim.throwAt([e.x, e.y, e.z + 30 * e.size], sim.grid.kind === 'terrain' || sim.areaDef.outdoor ? 'snowball' : 'icecube', { dmg: ED.throwDmg || 8, speed: 220, g: 120, red: 2 });
        e.throwPose = .4;
      }
    }
    if (e.throwPose > 0) e.throwPose -= dt;
    if (d < 6 * M && ED.flee) sim.moveEnemy(e, -(h.x - e.x) / d * 30 * dt, -(h.y - e.y) / d * 30 * dt);
  },
  twins(sim, e, ED, dt, flow) { sim.chase(e, dt, flow, e.speed, [.2, .4]); },
  /** a Plow: an ice slab in front; every 3.5 s it stops, laughs and turns its back for 1.2 s */
  plow(sim, e, ED, dt, flow) {
    e.cycle += dt;
    if (e.turnT > 0) { e.turnT -= dt; e.turned = true; if (e.turnT <= 0) { e.turned = false; e.cycle = 0; } return; }
    if (e.cycle > 3.5) { e.turnT = 1.2; e.cycle = 0; sim.emit('laugh', { enemy: e, style: 'cackle', at: [e.x, e.y, e.z + 30], pitch: -3, loud: 1 }); e.laughPose = 1.2; return; }
    sim.chase(e, dt, flow, e.speed, null);
    e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x);
  },
  /** an Inspector: never attacks; blinks between its three marks every 2.5 s; after 25 s it goes, and comes back */
  inspector(sim, e, ED, dt) {
    e.blinkT = (e.blinkT === undefined ? 2.5 : e.blinkT) - dt;
    e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x);
    const marks = e.data.marks || [];
    if (e.blinkT <= 0 && marks.length) {
      e.blinkT = 2.5; e.mi = ((e.mi || 0) + 1) % marks.length;
      const m = marks[e.mi]; sim.emit('blink', { from: [e.x, e.y, e.z], enemy: e }); e.x = m[0] * M; e.y = m[1] * M; e.z = sim.grid.floorAt(e.x, e.y); e.reveal = Math.max(e.reveal, .6);
    }
    if (e.t > 25 && !e.data.stay) { e.alive = false; e.gone = true; sim.emit('blink', { from: [e.x, e.y, e.z], enemy: e }); sim.say('The Inspector has stepped out.'); }
  },
  /** a Bloom: big, slow; a Giggler buds off every 4 s */
  bloom(sim, e, ED, dt, flow) {
    sim.chase(e, dt, flow, e.speed, [.1, .3]);
    e.budT = (e.budT === undefined ? 4 : e.budT) - dt;
    if (e.budT <= 0 && sim.enemies.filter(x => x.alive).length < 12) { e.budT = 4; const a = S7.rnd('spawn') * TAU; sim.spawnEnemy('giggler', [e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20], { reveal: 2, wave: e.wave }); sim.emit('bud', { at: [e.x, e.y, e.z] }); }
  },
  /** a dancing Giggler at the Jolly Four's ball: waltzes in a circle, closing in on the beat */
  dancer(sim, e, ED, dt, flow) {
    const h = sim.hero; e.ang = (e.ang === undefined ? Math.atan2(e.y - h.y, e.x - h.x) : e.ang) + dt * .9;
    const r = Math.max(1.2 * M, (e.r === undefined ? (e.r = V.dist2([e.x, e.y], [h.x, h.y])) : e.r) - dt * e.speed * .55);
    e.r = r;
    const tx = h.x + Math.cos(e.ang) * r, ty = h.y + Math.sin(e.ang) * r;
    sim.moveEnemy(e, (tx - e.x) * Math.min(1, dt * 4), (ty - e.y) * Math.min(1, dt * 4));
    e.facing = e.ang + Math.PI / 2;
  },
  /** a Cable Crawler: hand over hand along the gondola's cable toward the cabin, bursting on its roof */
  crawler(sim, e, ED, dt) {
    const c = sim.cabinPos ? sim.cabinPos() : [sim.hero.x, sim.hero.y, sim.hero.z + 50];
    const d = V.sub(c, [e.x, e.y, e.z]), L = V.len(d);
    if (L < 1.4 * M) { sim.burst(e); return; }
    e.x += d[0] / L * e.speed * dt; e.y += d[1] / L * e.speed * dt; e.z += d[2] / L * e.speed * dt;
    e.facing = Math.atan2(d[1], d[0]);
  },
  /** stands where it is (window climbers before they jump, frozen tableaux turned) */
  idle(sim, e) { e.facing = Math.atan2(sim.hero.y - e.y, sim.hero.x - e.x); }
};


/* ===== src/33-bosses.js ===== */
/* BOSSES (§11.8): Bellcaptain Augustin Grau (the service shaft, three phases, a hat that tips), Die Lustigen Vier (the
 * ballroom: each musician's warm spot shows only while their track sounds), Hansi Pulver (the Avalaugh, the slalom,
 * the interview). A boss's warm spots and body spheres come from bossWarmSpots(); its people are drawn by the
 * presenter from boss.actors; its machinery by S7.BOSS3D[id]. */
S7.BOSSES = {
  grau: { area: '00C', node: 's1', name: 'AUGUSTIN GRAU', phases: 3 },
  band: { area: '01B', node: 'br', name: 'DIE LUSTIGEN VIER', phases: 1 },
  hansi: { area: '01F', node: 'p3', name: 'HANSI PULVER', phases: 3 }
};
S7.BOSS_WARPS = [
  { id: 'grau', phase: 1, label: 'GRAU, PHASE 1' }, { id: 'grau', phase: 2, label: 'GRAU, PHASE 2' }, { id: 'grau', phase: 3, label: 'GRAU, PHASE 3' },
  { id: 'band', phase: 1, label: 'THE JOLLY FOUR' },
  { id: 'hansi', phase: 1, label: 'HANSI: THE AVALAUGH' }, { id: 'hansi', phase: 2, label: 'HANSI: THE SLALOM' }, { id: 'hansi', phase: 3, label: 'HANSI: THE INTERVIEW' }
];
const FLOORS = [6 * M, 12 * M, 18 * M], CAR = [8 * M, 3.7 * M];
/** a track's notes as "sounding" per step (a note, or a hold after one) */
S7.sounding = (notes) => { const toks = notes.split(/\s+/).filter(t => t && t !== '|'), out = []; let on = false; for (const t of toks) { if (t === '.') on = false; else if (t !== '-') on = true; out.push(on); } return out; };
const BAND = ['tuba', 'accordion', 'trumpet', 'snare'];
Object.assign(Sim.prototype, {
  startBoss(id, phase) {
    const D = S7.BOSSES[id];
    this.boss = { id, phase: phase || 0, t: 0, hp: 0, actors: [], hud: { name: D.name, k: 1 }, hits: 0 };
    this.bossNoSwitch = false; this.bossLockAim = false;
    BOSS[id].start(this, this.boss, phase || 0);
    if (phase) this.autosave('boss');
    this.emit('boss', { id, phase: phase || 0 });
  },
  updateBoss(dt) { const B = this.boss; B.t += dt; BOSS[B.id].update(this, B, dt); },
  bossWarmSpots() { const B = this.boss; return B && BOSS[B.id].spots ? BOSS[B.id].spots(this, B) : []; },
  hitBoss(w, dmg, dir, splash) {
    const B = this.boss; if (!B) return;
    if (!w.open) { this.emit('tink', { at: w.p }); if (w.deflect) this.splash(w.deflect, { at: w.p, small: true }); return; }
    const crit = w.kind === 'warm' && !splash;
    this.curResults().hits++;
    if (crit) { this.curResults().crits++; this.emit('crit', { at: w.p }); this.splash('CRITICAL BRAVO', { crit: true }); this.game.freeze && this.game.freeze(.08); }
    else this.emit('hit', { at: w.p, dmg });
    BOSS[B.id].hit(this, B, w, crit ? dmg * 3 : dmg, crit);
  },
  /** a target is eliminated: the results screen next, then the story */
  finishTarget(t) {
    this.st.results[t].done = true; this.st.flags['t0' + t + 'Done'] = 1;
    this.boss = null; this.bossNoSwitch = false; this.bossLockAim = false; this.mode = 'rail'; this.aimExit(true);
    this.emit('music', { song: 'stage' });
    this.resultsReady = t; if (t === 1) this.resultsReady = 1;
    if (this.o.bot || this.o.attract) this.resultsReady = t;
  },
  updateInterview(dt, I) { BOSS.hansi.interview(this, this.boss, dt, I); }
});

const BOSS = S7.BOSS = {
  /* ================= GRAU ================= */
  grau: {
    start(sim, B, phase) {
      B.car = { z: FLOORS[0], to: FLOORS[0], v: 0, door: 0 };
      B.cyc = 'move'; B.ct = 1.5; B.throws = 0; B.hatT = 0; B.php = 150; B.dingN = 0; B.dropT = 6;
      sim.bossNoSwitch = phase > 0;
      B.actors = [{ who: 'grau', x: CAR[0], y: CAR[1] + .5 * M, z: FLOORS[0], facing: Math.PI / 2, pose: null }];
      if (phase === 0) { sim.startBeat('grau_start'); B.phase = 0; }
      else { B.phase = phase; sim.emit('music', { song: 'shaft' }); }
      if (phase === 3) B.car.z = B.car.to = FLOORS[0];
    },
    spots(sim, B) {
      const a = B.actors[0], open = B.cyc === 'hat' && B.phase > 0, z = a.z;
      return [{ id: 'hat', kind: 'warm', p: [a.x, a.y + 4, z + 46], r: 8 * T.warmRadius, open, deflect: 'HE IS NOT TIPPING' }, { id: 'body', kind: 'body', p: [a.x, a.y, z + 22], r: 11, open, deflect: 'HE IS NOT TIPPING' }];
    },
    update(sim, B, dt) {
      const a = B.actors[0], C = B.car;
      sim.bossNoSwitch = B.phase > 0;
      // the car: moves between floors (phase 1), bounces in free fall (phase 2), carries Grau on its roof (phase 3)
      if (B.phase === 2) { C.v -= 900 * dt; C.z += C.v * dt; if (C.z < FLOORS[0]) { C.z = FLOORS[0]; C.v = Math.abs(C.v) * .55 + 120; sim.emit('sfx', { name: 'ding' }); sim.game.shake && sim.game.shake(2); } }
      else C.z = E.approach(C.z, C.to, 110 * dt);
      a.x = CAR[0]; a.y = CAR[1] + .5 * M; a.z = C.z + (B.phase === 3 ? 3.4 * M : 0);
      a.facing = Math.atan2(sim.hero.y - a.y, sim.hero.x - a.x);
      a.pose = B.cyc === 'hat' ? 'hips' : null; a.expr = 'smile';
      a.attack = B.throwPose > 0 ? E.move('throw', 1 - B.throwPose / .45) : B.phase === 3 && Math.floor(B.t * 2) % 2 ? E.move('cast', (B.t * 2) % 1) : null;
      if (B.throwPose > 0) B.throwPose -= dt;
      B.hud.k = (3 - Math.max(0, B.phase - 1) - (1 - B.php / 150)) / 3;
      B.hud.sub = B.phase === 0 ? '' : 'PHASE ' + B.phase + (B.cyc === 'hat' ? ' · HE TIPS HIS HAT' : '');
      if (B.phase === 0) return;
      B.ct -= dt;
      if (B.cyc === 'move') { if (B.ct <= 0 && Math.abs(C.z - C.to) < 2) { B.cyc = 'throw'; B.ct = .7; B.throws = 0; sim.emit('sfx', { name: 'ding' }); } }
      else if (B.cyc === 'throw') {
        if (B.ct <= 0) {
          B.ct = B.phase === 2 ? .85 : 1.05; B.throws++; B.throwPose = .45;
          const from = [a.x, a.y + 10, a.z + 30];
          const third = (B.throws % 3) === 0;
          sim.throwAt(from, 'suitcase', { dmg: 8, landDmg: 8, speed: 150, g: 260, red: 6, hp: 1, r: 8, onLand: third ? (s, p) => { s.spawnEnemy('giggler', [p.x, p.y], { reveal: 3 }); } : null });
          if (B.phase >= 2 && B.throws % 2 === 0) sim.throwAt([8 * M, 12.6 * M, 10 * M], 'suitcase', { dmg: 8, landDmg: 8, speed: 140, g: 260, red: 6, hp: 1, r: 8 });
          if (B.throws >= 3) { B.cyc = 'hat'; B.ct = B.phase === 3 ? 1.2 : 1.5; sim.emit('hattip', {}); }
        }
      } else if (B.cyc === 'hat') {
        if (B.ct <= 0) { B.cyc = 'move'; B.ct = B.phase === 2 ? 1.2 : 2.2; const i = FLOORS.indexOf(C.to); if (B.phase === 1) C.to = FLOORS[(i + 1 + Math.floor(S7.rnd('fx') * 2)) % 3]; if (B.phase === 2) C.v = 300; sim.emit('sfx', { name: 'ding' }); }
      }
      if (B.phase === 3) { B.dropT -= dt; if (B.dropT <= 0) { B.dropT = 8; for (const sp of ['top1', 'top2'].slice(0, sim.enemies.filter(e => e.alive).length < 2 ? 2 : 1)) sim.spawnEnemy('giggler', sim.areaDef.spawns[sp], { reveal: 2.5, speedK: .8 }); sim.emit('laugh', { at: [8 * M, 8 * M, 300], style: 'cackle', pitch: 0, loud: 1 }); } }
    },
    hit(sim, B, w, dmg, crit) {
      if (B.phase === 0 || B.dead) return;
      B.php -= dmg;
      if (crit || B.php <= 0) {
        B.php = 150;
        sim.killAllEnemies(); sim.projectiles = sim.projectiles.filter(p => !p.hostile);
        if (B.phase >= 3) { B.phase = 4; sim.emit('boss', { id: 'grau', phase: 4 }); sim.say('Ding...', { who: 'grau' }); sim.startBeat('t00_end'); sim.boss.dead = true; return; }
        B.phase++; B.cyc = 'move'; B.ct = 2; B.car.v = B.phase === 2 ? 400 : 0;
        if (B.phase === 2) { sim.say('The cable! Mind the luggage!', { who: 'grau' }); sim.emit('sfx', { name: 'collapse' }); sim.game.audio && sim.game.audio.tempo && sim.game.audio.tempo(150); }
        if (B.phase === 3) { B.car.to = FLOORS[0]; sim.say('Ding. Ding. DING.', { who: 'grau' }); sim.game.audio && sim.game.audio.tempo && sim.game.audio.tempo(170); }
        sim.emit('boss', { id: 'grau', phase: B.phase }); sim.autosave('boss');
      }
    }
  },
  /* ================= THE JOLLY FOUR ================= */
  band: {
    start(sim, B, phase) {
      const A = sim.areaDef, at = A.bandAt;
      B.phase = 1; B.alive = { tuba: true, accordion: true, trumpet: true, snare: true }; B.dmg = { tuba: 0, accordion: 0, trumpet: 0, snare: 0 };
      B.bpm = 112; B.stepF = 0; B.lastBar = -1; B.sound = {}; const song = S7.SONGS.band;
      for (const tr of song.tracks) B.sound[tr.name] = S7.sounding(tr.notes);
      B.actors = BAND.map((who, i) => ({ who, x: at[i][0] * M, y: at[i][1] * M, z: (A.stageZ || 0) * M, facing: Math.PI / 2, pose: null, inst: who }));
      sim.emit('music', { song: 'band' });
      if (sim.game.audio && sim.game.audio.tempo) try { sim.game.audio.tempo(112); } catch (e) { /* no sound */ }
      if (!phase) sim.startBeat('band_start');
    },
    stepNow(B) { return Math.floor(B.stepF); },
    isOn(B, who) {
      if (!B.alive[who]) return false;
      const live = BAND.filter(w => B.alive[w]);
      const L = B.sound[who], st = this.stepNow(B);
      if (live.length === 1) return st % 4 !== 3;   // the solo: nearly always sounding
      return L[st % L.length];
    },
    spots(sim, B) {
      const out = [];
      for (const a of B.actors) {
        if (!B.alive[a.who]) continue;
        const on = this.isOn(B, a.who), tubaBell = a.who === 'tuba' && BAND.filter(w => B.alive[w]).length === 1;
        out.push({ id: a.who, who: a.who, kind: 'warm', p: tubaBell ? [a.x + 4, a.y + 6, a.z + 46] : [a.x, a.y + 3, a.z + 28], r: 5.5 * T.warmRadius, open: on, deflect: 'THE MUSIC PROTECTS THEM' });
        out.push({ id: a.who + 'b', who: a.who, kind: 'body', p: [a.x, a.y, a.z + 20], r: 10, open: on, deflect: 'THE MUSIC PROTECTS THEM' });
      }
      return out;
    },
    update(sim, B, dt) {
      if (B.phase === 0 || B.dead) return;
      B.stepF += dt * B.bpm / 60 * 2;
      const bar = Math.floor(B.stepF / 8);
      for (const a of B.actors) { a.pose = B.alive[a.who] ? null : 'down'; a.on = this.isOn(B, a.who); a.attack = a.on && B.alive[a.who] ? E.move('cast', (B.stepF / 2) % 1) : null; a.facing = Math.PI / 2; a.expr = 'smile'; }
      // each bar while the band lives, two dancing Gigglers waltz in (at most six)
      if (bar !== B.lastBar && !sim.cutscene) {
        B.lastBar = bar;
        const alive = sim.enemies.filter(e => e.alive).length;
        if (alive < 4 && bar % 2 === 0) for (let k = 0; k < Math.min(BAND.filter(w => B.alive[w]).length > 2 ? 2 : 1, 4 - alive); k++) { const sp = S7.pick('spawn', Object.keys(sim.areaDef.spawns).filter(s => s.startsWith('dance'))); sim.spawnEnemy('dancer', sim.areaDef.spawns[sp], { reveal: 1 }); }
        sim.emit('beatbar', { bar });
      }
      const live = BAND.filter(w => B.alive[w]).length;
      B.hud.k = live / 4; B.hud.sub = live === 1 ? 'THE SOLO' : BAND.filter(w => B.alive[w]).map(w => w.toUpperCase()).join(' · ');
    },
    hit(sim, B, w, dmg, crit) {
      const who = w.who; if (!B.alive[who]) return;
      B.dmg[who] += dmg;
      if (crit || B.dmg[who] >= 120) {
        B.alive[who] = false; sim.emit('musiciandown', { who });
        try { sim.game.audio.layer(who, 0, .2); } catch (e) { /* no sound */ }
        const live = BAND.filter(x => B.alive[x]).length;
        B.bpm = [148, 136, 124, 112][live] || 148;
        try { sim.game.audio.tempo(B.bpm); } catch (e) { /* no sound */ }
        if (who === 'tuba') { sim.giveItem('edelweiss', 1); sim.st.flags.edelweiss2 = 1; sim.say('A flower falls out of the tuba\'s bell.'); }
        if (!live) { B.dead = true; sim.killAllEnemies(); sim.startBeat('band_end'); }
        else sim.say(['Ein!', 'Zwei!', 'Drei!'][3 - live] || 'Vier!', { who });
      }
    }
  },
  /* ================= HANSI PULVER ================= */
  hansi: {
    start(sim, B, phase) {
      const A = S7.AREAS['01F'];
      B.spotsLeft = 5; B.melt = [0, 0, 0, 0, 0]; B.thaw = null; B.snowT = 2.2; B.budT = 5; B.phase = phase || 0; B.crits = 0; B.body = 0;
      B.c = [A.avalaugh[0] * M, A.avalaugh[1] * M];
      B.actors = [];
      sim.bossNoSwitch = false; sim.bossLockAim = false;
      if (!phase) { sim.startBeat('hansi_intro'); return; }
      if (phase === 1) { sim.emit('music', { song: 'powderking' }); }
      if (phase === 2) this.toSlalom(sim, B);
      if (phase === 3) this.toInterview(sim, B);
    },
    spots(sim, B) {
      if (B.phase === 1) {
        const c = B.c, z0 = sim.grid.floorAt(c[0], c[1]) - (B.sinkZ || 0), out = [];
        const P = [[-34, 30, 8 * M], [0, 34, 7.2 * M], [34, 30, 8 * M], [-22, 26, 10.9 * M], [22, 26, 10.9 * M]];
        P.forEach((p, i) => { if (B.melt[i] >= 1) return; out.push({ id: 's' + i, i, kind: 'warm', p: [c[0] + p[0], c[1] + p[1], z0 + p[2]], r: 8 * T.warmRadius, open: true }); });
        out.push({ id: 'body', kind: 'body', p: [c[0], c[1], z0 + 5 * M], r: 4.5 * M, open: true });
        return out;
      }
      if (B.phase === 2 && B.h) {
        const h = B.h, open = B.window > 0;
        return [{ id: 'hansi', kind: 'warm', p: [h.x, h.y, h.z + 40], r: 7 * T.warmRadius, open, deflect: 'BETWEEN GATES: NOTHING' }, { id: 'hb', kind: 'body', p: [h.x, h.y, h.z + 22], r: 11, open }];
      }
      if (B.phase === 3 && B.h) return [{ id: 'hansi', kind: 'warm', p: [B.h.x, B.h.y, B.h.z + 40], r: 10, open: true }, { id: 'hb', kind: 'body', p: [B.h.x, B.h.y, B.h.z + 22], r: 14, open: true }];
      return [];
    },
    update(sim, B, dt) {
      if (B.phase === 1) this.avalaugh(sim, B, dt);
      else if (B.phase === 2) this.slalom(sim, B, dt);
      B.hud.name = B.phase === 1 ? 'THE AVALAUGH' : 'HANSI PULVER';
    },
    avalaugh(sim, B, dt) {
      const c = B.c, z0 = sim.grid.floorAt(c[0], c[1]);
      B.hud.k = B.spotsLeft / 5; B.hud.sub = B.thaw ? 'THE THAW: ' + Math.ceil(B.thaw.t) + ' S' : B.spotsLeft + ' WARM SPOTS';
      for (let i = 0; i < 5; i++) if (B.melt[i] > 0 && B.melt[i] < 1) B.melt[i] = Math.min(1, B.melt[i] + dt * 2);
      B.snowT -= dt;
      if (B.snowT <= 0) { B.snowT = 2.2; sim.throwAt([c[0] + (S7.rnd('fx') - .5) * 60, c[1] + 30, z0 + 10 * M], 'snowball', { dmg: 15, speed: 240, g: 140, hp: 1, r: 6, red: 3 }); B.throwPose = .5; }
      B.budT -= dt;
      if (B.budT <= 0 && sim.enemies.filter(e => e.alive).length < 4) { B.budT = 5; const a = S7.rnd('spawn') * Math.PI + Math.PI * .1; sim.spawnEnemy('giggler', [c[0] + Math.cos(a) * 60, c[1] + Math.sin(a) * 60], { reveal: 2 }); sim.emit('bud', { at: [c[0], c[1], z0] }); }
      if (B.thaw) {
        B.thaw.t -= dt; B.sinkZ = Math.min(3 * M, (B.sinkZ || 0) + dt * 12);
        if (B.thaw.t <= 0) {
          B.thaw = null; sim.emit('explode', { at: [c[0], c[1], z0 + 40], radius: 20 * M, kind: 'boom' });
          sim.hurtPlayer(60, [c[0], c[1], z0 + 40], 'thaw');
          const i = B.melt.findIndex(m => m >= 1); if (i >= 0) { B.melt[i] = 0; B.spotsLeft++; }
          B.sinkZ = 0; sim.say('Everything comes back in the spring!', { who: 'hansi' });
        }
      }
    },
    toSlalom(sim, B) {
      B.phase = 2; B.h = null; B.gi = 0; B.window = 0; B.crits = 0; B.body = 0; B.medalT = 2;
      sim.emit('music', { song: 'slalom' });
      sim.bossNoSwitch = true;
      sim.placeAt('sl0'); const ex = sim.rails.exits('sl0'); if (ex.length) { sim.takeBranch(ex[0]); sim.W.v = 120; }
      const A = sim.areaDef; B.path = new RailPath(A.hansiPath.map(p => [p[0] * M, p[1] * M, null]), (x, y) => sim.grid.floorAt(x, y), false); B.hs = 0; B.gates = A.slalomGates.map(g => g * B.path.length);
      sim.say('Bend the knees!', { who: 'hansi' });
    },
    slalom(sim, B, dt) {
      const P = B.path, W = sim.W, me = sim.hero;
      // Hansi weaves down his own line; he waits at the next gate if you fall more than 60 m behind
      const myD = Math.hypot(me.x - P.at(0).x, me.y - P.at(0).y);
      const ahead = B.hs - myD;
      let v = 175; if (ahead > 60 * M) v = 0; else if (ahead < 0) v = 240;
      B.hs = Math.min(P.length, B.hs + v * dt);
      const p = P.at(B.hs), wob = Math.sin(B.hs / 60) * 3 * M;
      B.h = { x: p.x + Math.cos(p.yaw + Math.PI / 2) * wob, y: p.y + Math.sin(p.yaw + Math.PI / 2) * wob, z: p.z, yaw: p.yaw };
      B.actors = [{ who: 'hansi', x: B.h.x, y: B.h.y, z: B.h.z, facing: p.yaw, pose: 'crouch', skis: true }];
      // passing a gate: 0.8 s when he can be hurt (the flags flash)
      if (B.gi < B.gates.length && B.hs >= B.gates[B.gi]) { B.gi++; B.window = .8; sim.emit('slalomgate', { i: B.gi }); }
      if (v === 0 && Math.floor(B.t * 2) % 4 === 0) { sim.emit('laugh', { at: [B.h.x, B.h.y, B.h.z + 30], style: 'cackle', pitch: 2, loud: 1 }); if (!B.waitSaid) { B.waitSaid = true; sim.say('Bend the knees!', { who: 'hansi' }); } } else if (v) B.waitSaid = false;
      if (B.window > 0) B.window -= dt;
      B.medalT -= dt;
      if (B.medalT <= 0 && B.window <= 0) { B.medalT = 2.4; sim.throwAt([B.h.x, B.h.y, B.h.z + 30], 'medal', { dmg: 10, speed: 260, g: 120, hp: 1, r: 4, red: 4 }); }
      B.hud.k = 1 - B.crits / 4; B.hud.sub = B.window > 0 ? 'THROUGH THE GATE: NOW' : 'GATE ' + Math.min(B.gi + 1, B.gates.length) + ' OF ' + B.gates.length;
      // at the bottom he waits by the old station, laughing, the flags flashing every few seconds
      if (B.hs >= P.length && B.window <= 0) { B.bottomT = (B.bottomT || 0) + dt; if (B.bottomT > 2.5) { B.bottomT = 0; B.window = .8; } }
      // you reached the station without four hits: back up the face, both of you
      if (!W.edge && W.node === 'sl9' && B.crits < 4) {
        sim.say('Again! From the top!', { who: 'hansi' });
        B.gi = 0; B.hs = 0; B.window = 0;
        sim.placeAt('sl0'); const ex = sim.rails.exits('sl0'); if (ex.length) { sim.takeBranch(ex[0]); W.v = 120; }
      }
    },
    toInterview(sim, B) {
      B.phase = 3; sim.mode = 'interview'; sim.bossNoSwitch = true; sim.bossLockAim = true;
      sim.emit('music', { song: 'interview' });
      sim.placeAt('chair');
      const n = sim.rails.nodes.chair;
      B.h = { x: n.x + 2.3 * M, y: n.y + .8 * M, z: n.z - .2 * M };
      B.actors = [{ who: 'hansiBare', x: B.h.x, y: B.h.y, z: B.h.z, facing: Math.PI + .3, pose: 'kneel' }];
      B.it = 0; B.li = 0; B.ended = false;
      sim.aim.on = true; sim.aim.yaw = Math.atan2(.8, 2.3); sim.aim.pitch = -.12; sim.aim.k = 1; S7.interviewGun = true;
      sim.cam.pose = { x: n.x, y: n.y, z: n.z + EYE_H, yaw: 0, pitch: -.05, roll: 0, fov: 62 };
    },
    interview(sim, B, dt, I) {
      if (B.ended) return;
      sim.updateAim(dt, I); sim.aim.yaw = clamp(S7.angDiff(0, sim.aim.yaw), -1.2, 1.2); sim.aim.pitch = clamp(sim.aim.pitch, -.6, .5);
      B.it += dt;
      const L = S7.INTERVIEW;
      if (B.li < L.length && B.it >= L[B.li][0]) { sim.say(L[B.li][1], { who: 'hansiBare', life: 6 }); sim.emit('line', { who: 'hansiBare', text: L[B.li][1] }); B.li++; }
      const W = sim.weaponDef(), m = sim.mag();
      m.cd = Math.max(0, m.cd - dt);
      if ((I.fireP || (W.auto && I.fireD)) && m.cd <= 0) {
        sim.fire(W, m); B.ended = true; sim.st.ending = 'shot'; sim.addDossier('hansiShot'); sim.emit('kill', { enemy: { x: B.h.x, y: B.h.y, z: B.h.z }, crit: true });
        sim.startBeat('hansi_end');
        return;
      }
      if (B.it > S7.INTERVIEW[S7.INTERVIEW.length - 1][0] + 10) { B.ended = true; sim.st.ending = 'fell'; sim.addDossier('hansiFell'); sim.say('...You hesitate. That\'s new. They usually don\'t.', { who: 'hansiBare', life: 5 }); B.actors[0].hidden = true; sim.startBeat('hansi_end'); }
    },
    hit(sim, B, w, dmg, crit) {
      if (B.phase === 1) {
        if (w.kind === 'body') { B.body = (B.body || 0) + dmg; return; }
        if (B.melt[w.i] > 0) return;
        B.melt[w.i] = .01; B.spotsLeft--; sim.say(['Ow!', 'My medals!', 'Not the eyes!', 'Careful, that\'s gold!', 'Spring!'][4 - B.spotsLeft] || 'Ha!', { who: 'hansi' });
        if (B.spotsLeft === 2 && !B.thawDone) { B.thawDone = true; B.thaw = { t: 40 }; sim.say('Let\'s see how you like the Thaw!', { who: 'hansi' }); }
        if (B.spotsLeft <= 0) { B.thaw = null; sim.killAllEnemies(); sim.projectiles = sim.projectiles.filter(p => !p.hostile); sim.startBeat('hansi_fall'); B.phase = 1.5; }
        return;
      }
      if (B.phase === 2) {
        if (crit) B.crits++; else { B.body += dmg; if (B.body >= 90) { B.body = 0; B.crits++; } }
        if (B.crits >= 4) { B.phase = 2.5; sim.startBeat('hansi_crash'); }
      }
    }
  }
};
/** Hansi's interview, line by line (seconds from its start) */
S7.INTERVIEW = [[1, 'You know what the Föhn told me? The snow is a lie the mountain tells the valley.'], [6.5, 'Every spring the truth runs down into the rivers, and the children drink it.'], [12, 'Your grandmother keeps it frozen. Who pays her? Who pays you? Same bank.']];


/* ===== src/35-setpieces.js ===== */
/* SET PIECES: LAWINE! (the avalanche chase on 01C), the Himmelsbahn ride (01D), the summit's cameras (01F), and the
 * machinery they draw with the pen. Sim parts first (deterministic, headless), then the pictures (THINGS3D). */

/* ---------------- LAWINE! ---------------- */
S7.lawineUpdate = (sim, dt) => {
  const L = sim.lawine; if (!L) return;
  L.t += dt;
  const W = sim.W, avV = .92 * 260 * sim.diff().avalanche;
  const v = W.air ? 420 : W.edge ? W.v : 0;
  L.gap += (v - avV) * dt;
  L.gap = Math.min(L.gap, 40 * M);
  if (W.edge === 'f2-vb' || (W.node && W.node === 'f2')) { sim.lawine = null; sim.st.flags.lawineDone = 1; sim.emit('lawine', { on: false }); sim.say('Out of the white.', { who: 'dagny' }); return; }
  if (L.gap <= 0 && !CHEAT.god && !sim.o.attract) {
    sim.lawine = null; sim.st.flags.lawineDone = 1; sim.emit('lawine', { on: false, caught: true });
    sim.freezePersona();
    const f2 = sim.rails.nodes.f2, ps = sim.st.roster[sim.st.persona === 'ansel' ? sim.st.lastPersona : sim.st.persona] || sim.pstate();
    for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (r.frozen && r.statue && r.statue.area === '01C') r.statue.at = [f2.x + 6, f2.y, f2.z]; }
    void ps;
  }
};
S7.lawineCamera = (sim, h) => {
  if (!sim.lawine || sim.aim.on) return null;
  const W = sim.W, e = W.edge && sim.rails.edges[W.edge]; if (!e) return null;
  const ahead = e.path.at(Math.min(e.length, W.s + 9 * M));
  return sim.cam._aim([ahead.x + 2 * M, ahead.y, ahead.z + 2.6 * M], [h.x, h.y, h.z + 1.4 * M], 64);
};
/** a statue on a node makes the walker stop there (the Sweep must reach it) */
Sim.prototype.statueAtNode = function (id) {
  const n = this.rails.nodes[id]; if (!n) return false;
  for (const pid of PERSONA_ORDER) { const s = this.st.roster[pid].statue; if (this.st.roster[pid].frozen && s && s.area === this.st.area && Math.hypot(s.at[0] - n.x, s.at[1] - n.y) < 2 * M) return true; }
  return false;
};

/* ---------------- the Himmelsbahn ---------------- */
S7.gondolaUpdate = (sim, dt) => {
  const G = sim.gondola || (sim.gondola = { t: 0, passT: 7, crawlT: 10, climbed: 0, swing: 0, cabins: [], climbers: [] });
  G.t += dt; G.swing = Math.max(0, G.swing - dt * .12);
  const h = sim.hero, W = sim.W, moving = W.edge && sim.rails.edges[W.edge].kind === 'lift';
  sim.cabinPos = () => [sim.hero.x, sim.hero.y, sim.hero.z + 3.4 * M];
  // a cabin passes on the down cable every 15 s with a Snowballer leaning out
  G.passT -= dt;
  if (G.passT <= 0 && moving) {
    G.passT = 15;
    const c = { y: h.y - 160 * M, x: h.x + 12 * M };
    c.e = sim.spawnEnemy('snowballer', [c.x, c.y], { reveal: 0 }); c.e.fly = true; c.e.fixed = true;
    G.cabins.push(c);
  }
  for (const c of G.cabins) {
    c.y += 200 * dt;   // the down cabins come toward us and pass behind
    const z = S7.cableZ(c.y / M) * M;
    if (c.e && c.e.alive) { c.e.x = c.x + 1.6 * M; c.e.y = c.y; c.e.z = z + .2 * M; }
    c.z = z;
  }
  G.cabins = G.cabins.filter(c => { if (c.y - h.y > 160 * M) { if (c.e && c.e.alive) { c.e.alive = false; c.e.gone = true; } return false; } return true; });
  // Cable Crawlers: hand over hand along our cable toward the cabin
  G.crawlT -= dt;
  if (G.crawlT <= 0 && moving) {
    G.crawlT = 11;
    for (let k = 0; k < 2; k++) {
      const ny = h.y - (38 + k * 9) * M, e = sim.spawnEnemy('crawler', [h.x, ny], { reveal: 0 });
      e.fly = true; e.z = S7.cableZ(ny / M) * M + 4.4 * M; e.hover = 0;
    }
  }
  // climbers at the windows (twice on the ride): they climb up over 6 s and burst in
  const u = W.edge === 'gs-mid' ? W.s / sim.rails.edges['gs-mid'].length * .55 : W.edge === 'mid-gl' ? .55 + W.s / sim.rails.edges['mid-gl'].length * .45 : W.node === 'mid' ? .55 : 0;
  if ((u > .25 && G.climbed === 0) || (u > .75 && G.climbed === 1)) {
    G.climbed++;
    for (const sd of [-1, 1]) { const e = sim.spawnEnemy('climber', [h.x + sd * 1.6 * M, h.y], { reveal: 0 }); e.fly = true; G.climbers.push({ e, sd, t: 0 }); }
  }
  for (const C of G.climbers) {
    if (!C.e.alive) continue; C.t += dt;
    C.e.x = h.x + C.sd * 1.7 * M; C.e.y = h.y + 6; C.e.z = h.z - 2.4 * M + Math.min(1, C.t / 6) * 2.6 * M; C.e.facing = C.sd > 0 ? Math.PI : 0;
    if (C.t > 6.4) sim.burst(C.e);
  }
  G.climbers = G.climbers.filter(C => C.e.alive);
  // the insulators: all three shot and the power comes back
  const f = sim.st.flags;
  if (f.ins1 && f.ins2 && f.ins3 && !f.powerBack && !sim.beats.some(b => b.id === 'power_back')) sim.startBeat('power_back');
  if (W.node === 'gl' || f.gondolaDone) f.gondolaDone = 1;
};
S7.gondolaCamera = (sim, h) => {
  if (sim.aim.on || sim.camOverride) return null;
  const G = sim.gondola || { t: 0, swing: 0 }, k = Math.floor((G.t || 0) / 6) % 3, roll = Math.sin((G.t || 0) * 2.2) * .08 * G.swing;
  let p;
  if (k === 0) p = sim.cam._aim([h.x + 1.6 * M, h.y + 1.8 * M, h.z + 2.2 * M], [h.x, h.y - 1 * M, h.z + 1.4 * M], 66);
  else if (k === 1) p = sim.cam._aim([h.x - 6 * M, h.y + 3 * M, h.z + 1.5 * M], [h.x, h.y, h.z + 1.6 * M], 54);
  else p = sim.cam._aim([h.x + 8 * M, h.y - 12 * M, h.z - 4 * M], [h.x, h.y, h.z + 2 * M], 50);
  p.roll = roll;
  return p;
};
/* ---------------- the summit ---------------- */
S7.summitCamera = (sim, h) => {
  const B = sim.boss; if (!B || sim.aim.on || sim.camOverride) return null;
  if (B.phase === 1 && sim.W.node && sim.W.node[0] === 'p') {   // over the shoulder toward the Avalaugh
    const c = [1000 * M, 290 * M], d = Math.atan2(c[1] - h.y, c[0] - h.x);
    return sim.cam.aimSafe(h, [h.x - Math.cos(d) * 7 * M + Math.cos(d + Math.PI / 2) * 2.4 * M, h.y - Math.sin(d) * 7 * M + Math.sin(d + Math.PI / 2) * 2.4 * M, h.z + 3.2 * M], [c[0], c[1], sim.grid.floorAt(c[0], c[1]) + 6 * M], 58);
  }
  return null;
};

/* ---------------- pictures ---------------- */
Object.assign(S7.THINGS3D, {
  drift(pen, th, t, w, sim) { if (sim.st.flags.churchBell && !(sim.dropT > 0)) return; pen.ball(0, 0, 10, 44, 34, 30, '#f0f4fc').ball(14, 6, 26, 26, 22, 18, '#ffffff').ball(-16, -4, 22, 22, 18, 16, '#e8eef8'); },
  gateslots(pen, th, t, w, sim) {
    const n = sim.st.flags.gateOpen ? 3 : Math.min(3, sim.st.items.edelweiss || 0);
    pen.box(0, 0, 18, 44, 4, 36, '#2a3448').box(0, 0, 38, 50, 6, 4, '#c8a040');
    for (let i = 0; i < 3; i++) { const x = (i - 1) * 13, on = i < n; pen.ball(x, 3, 22, 4, 1, 4, on ? '#f4f1ea' : '#4a5468'); if (on) pen.glow(x, 4, 22, 2.4, '#fff0c0'); }
  },
  echowall(pen, th, t, w, sim) { const open = sim.st.gates['01B:mirrors']; if (open) return; pen.box(0, 0, 48, 14, 48, 96, '#c8e0f0').box(0, 0, 48, 16, 52, 4, '#e0b040'); pen.glow(0, 0, 50 + Math.sin(t * 2) * 6, 3, '#e8f8ff'); },
  icelock(pen, th, t, w, sim) { if (sim.st.gates['01E:' + th.o.gate]) return; pen.box(0, 0, 30, 30, 10, 60, '#bfeaff').ball(0, 0, 40, 10, 6, 14, '#e8fbff').glow(0, 2, 30, 3, '#9ae0ff'); },
  chessboard(pen, th, t, w, sim) {
    if (!sim.epilogue) return;
    pen.box(0, 0, 0, 22, 22, 2, '#bfeaff');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) pen.box(-9.6 + i * 2.75, -9.6 + j * 2.75, 1.2, 2.6, 2.6, .5, '#7ac0e0');
    for (const [x, y, c] of [[-6, -6, '#f4f8ff'], [-3, -7, '#f4f8ff'], [4, 6, '#1a2a3a'], [6, 3, '#1a2a3a'], [0, 1, '#f4f8ff']]) pen.cone(x, y, 1, x, y, 7, 1.4, c).ball(x, y, 7.5, 1.2, 1.2, 1.2, c);
  },
  pistepoles(pen, th, t, w, sim) {
    if (!sim.rails) return;
    const c = pres3dCam();
    for (const id in sim.rails.edges) {
      const e = sim.rails.edges[id]; if (e.kind !== 'ski') continue;
      for (let s = 0; s < e.length; s += 18 * M) {
        const p = e.path.at(s); if (c && Math.hypot(p.x - c.x, p.y - c.y) > 260 * M) continue;
        const nx = Math.cos(p.yaw + Math.PI / 2) * 9 * M, ny = Math.sin(p.yaw + Math.PI / 2) * 9 * M;
        const col = e.label === 'BLUE' || id.startsWith('bl') ? '#2a6ad8' : '#f06a1e';
        pen.at(p.x + nx, p.y + ny, sim.grid.floorAt(p.x + nx, p.y + ny)).tube(0, 0, 0, 0, 0, 26, 1, col);
        pen.at(p.x - nx, p.y - ny, sim.grid.floorAt(p.x - nx, p.y - ny)).tube(0, 0, 0, 0, 0, 26, 1, col);
      }
    }
  },
  avalanche(pen, th, t, w, sim) {
    const L = sim.lawine; if (!L) return;
    const h = sim.hero, yaw = sim.W.yaw, bx = h.x - Math.cos(yaw) * L.gap, by = h.y - Math.sin(yaw) * L.gap, bz = sim.grid.floorAt(bx, by);
    for (let i = -6; i <= 6; i++) {
      const ox = Math.cos(yaw + Math.PI / 2) * i * 22, oy = Math.sin(yaw + Math.PI / 2) * i * 22, s = 26 + Math.sin(t * 4 + i) * 6;
      pen.at(bx + ox, by + oy, bz).ball(0, 0, s, s * 1.2, s * 1.2, s, '#f4f8ff').ball(-20, 0, s * 1.6, s, s, s * .9, '#e0e8f4').glow(Math.sin(t * 7 + i) * 10, 0, s * 1.4, 6, '#e8f4ff');
      if (i % 3 === 0) pen.box(Math.cos(yaw) * s, Math.sin(yaw) * s, s * 1.2, 8, 3, 2, '#08080c');   // a laughing face in the wall
    }
  },
  cablecar(pen, th, t, w, sim) {
    const A = S7.CABLE, h = sim.hero, c = pres3dCam(), G = sim.gondola || { swing: 0, cabins: [], t: 0 };
    // the cables: ours and the down cable beside it, in segments near the camera
    for (let n = A.a[1]; n > A.b[1]; n -= 40) {
      if (c && Math.abs(n * M - c.y) > 600 * M) continue;
      const z0 = S7.cableZ(n) * M + 4.5 * M, z1 = S7.cableZ(n - 40) * M + 4.5 * M;
      pen.at().tube(A.a[0] * M, n * M, z0, A.a[0] * M, (n - 40) * M, z1, .8, '#2a2a30').tube(A.a[0] * M + 12 * M, n * M, z0, A.a[0] * M + 12 * M, (n - 40) * M, z1, .8, '#2a2a30');
    }
    // pylons every 200 m, the next one's insulators frozen until shot
    for (let n = A.a[1] - 100; n > A.b[1]; n -= 200) {
      if (c && Math.abs(n * M - c.y) > 900 * M) continue;
      const z = S7.cableZ(n) * M + 4.5 * M, g = sim.grid.floorAt(A.a[0] * M + 6 * M, n * M);
      pen.at(A.a[0] * M + 6 * M, n * M, g).box(0, 0, (z - g) / 2, 6, 6, z - g, '#5a6068').box(0, 0, z - g + 2, 30 * M / 16, 8, 6, '#5a6068');
    }
    const iy = (1880 - 1760 * .55 - 80);
    for (const [k, dx, dz] of [['ins1', -3, 1.5], ['ins2', 3, 1.5], ['ins3', 0, 4]]) if (!sim.st.flags[k]) pen.at(A.a[0] * M + dx * M, iy * M, S7.cableZ(iy) * M + dz * M).ball(0, 0, 0, 10, 10, 14, '#bfeaff').glow(0, 0, 0, 2, '#e0f8ff');
    // our cabin round the hero (it swings at the power cut)
    const sw = Math.sin((G.t || 0) * 2.2) * .12 * G.swing;
    pen.at(h.x, h.y, h.z, 0, 1, 0, sw);
    pen.box(0, 0, -2, 46, 34, 4, '#c81e1e').box(0, 0, 50, 46, 34, 4, '#c81e1e');
    for (const [x, y] of [[-21, -15], [21, -15], [-21, 15], [21, 15]]) pen.box(x, y, 24, 4, 4, 50, '#a01818');
    pen.box(0, -17, 8, 46, 1, 14, '#a01818').box(0, 17, 8, 46, 1, 14, '#a01818').box(-23, 0, 8, 1, 34, 14, '#a01818').box(23, 0, 8, 1, 34, 14, '#a01818');
    pen.tube(0, 0, 52, 0, 0, 72, 1.2, '#3a3a40').box(0, 0, 72, 10, 6, 6, '#3a3a40').glow(0, 0, 46, 2.2, '#ffe8c0');
    // the other cabins on the down cable
    for (const cb of G.cabins || []) { pen.at(cb.x, cb.y, cb.z).box(0, 0, 24, 44, 32, 50, '#2a5ac8').box(0, 0, 0, 46, 34, 4, '#1a3a8a').tube(0, 0, 50, 0, 0, 72, 1.2, '#3a3a40'); }
  },
  slalomgates(pen, th, t, w, sim) {
    const A = S7.AREAS['01F'], B = sim.boss;
    if (!sim.slalomPath) sim.slalomPath = new RailPath(A.hansiPath.map(p => [p[0] * M, p[1] * M, null]), (x, y) => sim.grid.floorAt(x, y), false);
    const P = sim.slalomPath;
    A.slalomGates.forEach((g, i) => {
      const p = P.at(g * P.length), flash = B && B.phase === 2 && B.window > 0 && B.gi === i + 1, c = flash && Math.floor(t * 12) % 2 ? '#ff2030' : null;
      for (const sd of [-1, 1]) { const x = p.x + Math.cos(p.yaw + Math.PI / 2) * sd * 2.2 * M, y = p.y + Math.sin(p.yaw + Math.PI / 2) * sd * 2.2 * M, z = sim.grid.floorAt(x, y); pen.at(x, y, z).tube(0, 0, 0, 0, 0, 30, 1, '#c8c8d0').box(0, sd * 5, 22, 1, 10, 8, c || (i % 2 ? '#2a5ac8' : '#d81e2a')); }
    });
  },
  avalaugh(pen, th, t, w, sim) {
    const B = sim.boss; if (!B || B.id !== 'hansi' || !(B.phase >= 1 && B.phase < 2) && B.rise === undefined) return;
    if (B.phase >= 2) return;
    const rise = B.phase >= 1 ? 1 : clamp((B.rise = (B.rise || 0) + 1 / 150), 0, 1), sink = B.sinkZ || 0, z0 = th.z + sim.grid.floorAt(th.x, th.y) - sink - (1 - rise) * 12 * M;
    const melt = B.melt || [0, 0, 0, 0, 0], bob = Math.sin(t * 1.4) * 4;
    pen.at(th.x, th.y, z0);
    pen.ball(0, 0, 3 * M, 5 * M, 5 * M, 3.4 * M, '#f0f4fc').ball(0, 0, 7.4 * M + bob * .3, 3.6 * M, 3.6 * M, 2.8 * M, '#f4f8ff').ball(0, 0, 10.6 * M + bob, 2.4 * M, 2.4 * M, 2.2 * M, '#ffffff');
    // pine-trunk arms
    const sw = Math.sin(t * 2) * .4;
    pen.tube(-3 * M, 0, 8 * M, -7 * M, Math.sin(sw) * 2 * M, 10.5 * M + Math.cos(sw) * M, 8, '#4a3020').tube(3 * M, 0, 8 * M, 7 * M, -Math.sin(sw) * 2 * M, 10.5 * M + Math.cos(sw) * M, 8, '#4a3020');
    // the coal grin, the coal eyes (warm spots 3, 4), three gold medals (warm spots 0, 1, 2)
    pen.box(0, 2.3 * M, 10.1 * M + bob, 2.6 * M, 6, 10, '#08080c');
    const eyes = [[-22, 26, 10.9 * M], [22, 26, 10.9 * M]];
    eyes.forEach(([x, y, z], k) => { const m = melt[3 + k]; if (m < 1) pen.ball(x, y + 8, z + bob, 9 * (1 - m), 6, 9 * (1 - m), '#101014').glow(x, y + 12, z + bob, 2.4 * (1 - m), '#ff6a1e'); });
    const med = [[-34, 30, 8 * M], [0, 34, 7.2 * M], [34, 30, 8 * M]];
    med.forEach(([x, y, z], k) => { const m = melt[k]; if (m < 1) pen.tube(x, y - 4, z + 30, x, y, z + 8, 1, '#d81e2a').ball(x, y, z, 10 * (1 - m), 3, 10 * (1 - m), '#f0c030').glow(x, y + 3, z, 2.6 * (1 - m), '#ffe080'); });
    for (let k = 0; k < 5; k++) if (melt[k] > 0) pen.ball((k - 2) * 30, 40, 6 * M - melt[k] * 4 * M, 5, 5, 8, '#c8e8ff');   // drips
    if (B.thaw) w.arc(th.x, th.y, sim.grid.floorAt(th.x, th.y) + 1, 0, (1 - B.thaw.t / 40) * 22 * M, 0, TAU, '#7ac8ff', .5);
  },
  chairlift(pen, th, t, w, sim) {
    const n = sim.rails && sim.rails.nodes.chair; if (!n) return;
    const sw = Math.sin(t * .7) * .05;
    pen.at(n.x, n.y, n.z, 0, 1, 0, sw);
    pen.box(0, 0, -4, 46, 18, 3, '#3a3a40').box(0, -9, 8, 46, 2, 24, '#3a3a40').box(-22, 0, 4, 2, 18, 16, '#4a4a52').box(22, 0, 4, 2, 18, 16, '#4a4a52');
    pen.tube(0, 0, 20, 0, 0, 90, 1.2, '#4a4a52').tube(-400, 0, 92, 400, 0, 92, 1, '#2a2a30');
  }
});
let _presCam = null;
const pres3dCam = () => _presCam;
S7.setPresCam = (c) => { _presCam = c; };

/** the boss's machinery: Grau's car and its cable; the band's instruments */
S7.BOSS3D = {
  grau(pen, B, t, sim) {
    const C = B.car; if (!C) return;
    pen.at(8 * M, 3.7 * M, C.z);
    pen.box(0, 0, -2, 48, 34, 4, '#3a1a1a').box(0, 0, 50, 48, 34, 4, '#3a1a1a').box(-23, 0, 24, 2, 34, 50, '#5a2a2a').box(23, 0, 24, 2, 34, 50, '#5a2a2a').box(0, -16, 24, 48, 2, 50, '#5a2a2a');
    pen.box(-14, 17, 24, 18, 2, 46, '#c8a040').box(14, 17, 24, 18, 2, 46, '#c8a040');
    pen.glow(0, 0, 46, 2.4, '#ffe0b0').ball(0, 16, 56, 3, 3, 3, B.phase >= 2 ? '#ff2020' : '#ffe0a0');
    if (B.phase < 2) pen.tube(0, 0, 52, 0, 0, 500, 1, '#2a2a2a'); else pen.tube(0, 0, 52, 4, 2, 120 + Math.sin(t * 8) * 6, 1, '#2a2a2a');
    if (B.cyc === 'hat') pen.glow(0, 24, 46, 1.6, '#fff0a0');
  },
  band(pen, B, t, sim) {
    for (const a of B.actors) {
      if (!B.alive[a.who]) continue;
      pen.at(a.x, a.y, a.z);
      const pump = a.on ? 1 + Math.sin(t * 12) * .15 : 1;
      if (a.who === 'tuba') pen.tube(4, 6, 14, 4, 6, 40, 4, '#d8b040').cone(4, 6, 40, 6, 9, 52, 9 * pump, '#e8c050');
      if (a.who === 'accordion') pen.box(0, 7, 20, 14 * pump, 6, 12, '#c81e2a').box(-8 * pump, 7, 20, 2, 7, 13, '#f4f1ea').box(8 * pump, 7, 20, 2, 7, 13, '#f4f1ea');
      if (a.who === 'trumpet') pen.tube(2, 6, 30, 2, 18, 30, 1.2, '#e0b040').cone(2, 18, 30, 2, 22, 30, 3 * pump, '#f0c050');
      if (a.who === 'snare') pen.box(0, 8, 16, 12, 12, 5, '#f4f1ea').box(0, 8, 13.5, 12.4, 12.4, 1, '#d81e2a').tube(-3, 6, 24, -1, 9, 18 + Math.sin(t * 16) * 2, .6, '#8a6a4a').tube(3, 6, 24, 1, 9, 18 + Math.cos(t * 16) * 2, .6, '#8a6a4a');
      if (a.on) pen.glow(0, 10, 50, 1.4, '#ffe080');
    }
  },
  hansi() {}
};
/** set pieces on the HUD: the avalanche's distance */
S7.drawAreaHud = (g, r, S, sim) => {
  if (sim.lawine) {
    const k = clamp(sim.lawine.gap / (40 * M), 0, 1);
    UI.title(g, 'LAWINE!', r.W / 2, S.y0 + 40, 3, { colors: ['#ffffff', '#c8d8f0', '#8aa8d8'] });
    UI.rect(g, r.W / 2 - 60, S.y0 + 72, 120, 5, '#3a3438'); UI.rect(g, r.W / 2 - 60, S.y0 + 72, 120 * k, 5, k < .3 ? '#ff2030' : '#f4f1ea');
    UI.text(g, Math.round(sim.lawine.gap / M) + ' M BEHIND YOU', r.W / 2, S.y0 + 80, MUTED, { align: 'center' });
    UI.prompt(g, [['move', 'TUCK']], r.W / 2, S.y1 - 10, { align: 'center', scale: 2 });
  }
};


/* ===== src/40-meta.js ===== */
/* META: things to check and pick up (§7.12, §7.14), gates (§7.13), the Featherbed ring and switching (§7.8), freezing
 * and the Sweep's rescue (§7.10), Room 7 (§7.16) and Murmel's hints. */
const REACH = 2.4 * M, PICK_R = 1.6 * M;
Object.assign(Sim.prototype, {
  /* ---------------- what is near: prompts, auto pickups ---------------- */
  updateNear(I) {
    const h = this.hero, c = [h.x, h.y, h.z];
    this.near = null;
    if (this.aim.on || this.mode === 'frozen' || this.W.air) return;
    let best = null, bd = 1e9;
    this.nearList = [];
    for (const s of this.spots) {
      const used = this.spotUsed(s);
      const d = V.dist(c, [s.x, s.y, s.z]);
      if (PICKUPS[s.kind]) { if (!used && d < PICK_R + (s.node ? 6 : 0) && (!s.needs || this.meets(s.needs, true))) this.collect(s); continue; }
      if (!VERBS[s.kind] || s.target) continue;
      if (used && !s.repeat && !REPEAT[s.kind]) continue;
      if (s.node && this.W.node !== s.node && d > REACH * .6) continue;
      if (s.hidden && s.hidden(this)) continue;
      if (d < (s.reach || 2.4) * M) {
        this.nearList.push(s);
        // the one the hero faces wins (a quick turn faces another); a spot on this very node counts as straight ahead
        const ang = s.node === this.W.node ? 0 : Math.abs(S7.angDiff(this.hero.yaw, Math.atan2(s.y - h.y, s.x - h.x))), score = d / M + ang * 3;
        if (score < bd) { bd = score; best = s; }
      }
    }
    // a frozen statue in this area
    const ps = this.statueHere();
    if (ps && V.dist(c, ps.at) < 2.2 * M && this.st.persona === 'ansel') best = { kind: 'statue', id: 'statue:' + ps.id, persona: ps.id, x: ps.at[0], y: ps.at[1], z: ps.at[2] };
    if (best) this.near = { spot: best, verb: typeof VERBS[best.kind] === 'function' ? VERBS[best.kind](this, best) : VERBS[best.kind], label: best.label || '' };
  },
  statueHere() {
    for (const id of PERSONA_ORDER) { const r = this.st.roster[id]; if (r.frozen && r.statue && r.statue.area === this.st.area) return { id, at: r.statue.at }; }
    return null;
  },
  meets(needs, quiet) {
    if (needs.item && !(this.st.items[needs.item] >= (needs.n || 1))) return false;
    if (needs.flag && !this.st.flags[needs.flag]) return false;
    if (needs.persona && this.st.persona !== needs.persona) return false;
    return true;
  },
  interact(pick) {
    let s = this.near && this.near.spot;
    if (pick) { const p = (this.nearList || []).find(x => x.id === pick); if (p) s = p; }
    if (!s) return;
    if (s.kind === 'statue') { this.holdSpot = { spot: s, t: 0 }; return; }
    const f = ACTIONS[s.kind]; if (f) { this.emit('interact', { spot: s.id, kind: s.kind }); f(this, s); }
  },
  updateHold(dt, I) {
    const H = this.holdSpot;
    if (!I.interactD || !this.near || this.near.spot.kind !== 'statue') { this.holdSpot = null; return; }
    H.t += dt; this.emit('chip', { t: H.t });
    if (H.t >= 1.5) { this.holdSpot = null; this.revive(H.spot.persona); }
  },
  collect(s) {
    this.st.spots[this.spotKey(s)] = 1;
    PICKUPS[s.kind](this, s);
  },
  /** a gate target (a far bell, an exposure, a cornice, an echo wall, crystals...) is solved */
  solveSpot(s) {
    if (this.spotUsed(s)) return;
    this.st.spots[this.spotKey(s)] = 1;
    this.emit('solve', { spot: s.id, kind: s.kind, at: [s.x, s.y, s.z] });
    if (s.opens) for (const g of [].concat(s.opens)) this.openGate(g);
    if (s.flag) this.st.flags[s.flag] = 1;
    if (s.give) for (const k in s.give) this.giveItem(k, s.give[k]);
    if (s.dossier) this.addDossier(s.dossier);
    if (s.exposure) { this.st.exposures.push(s.exposure); this.uiRequest = { kind: 'exposure', id: s.exposure }; }
    if (s.beat) this.startBeat(s.beat);
    if (s.line) this.say(s.line);
  },
  hitTarget(s, W, p) {
    if (s.far && !(W.id === 'gamsbock' && this.aim.scope)) { this.splash('TOO FAR.', { at: p, small: true }); this.emit('toofar', { at: p }); return; }
    if (s.kind === 'far' || s.shootable) { this.solveSpot(s); return; }
    this.emit('tink', { at: p });
  },
  openGate(gid) {
    if (this.gateOpen(gid)) return;
    this.st.gates[this.gateKey(gid)] = 1;
    const g = this.areaDef.gates && this.areaDef.gates[gid];
    if (g && g.hides) for (const eid of [].concat(g.hides)) if (this.rails.edges[eid]) this.rails.edges[eid].hidden = false;
    this.grid.dynBlocks = this.grid.dynBlocks.filter(b => b.gate !== gid); this.grid.invalidateFlows();
    this.emit('gate', { gate: gid, ok: true, kind: g && g.kind });
    if (this.W.node) this.setupJunction(this.W.node);
  },
  /** may the walker take edge e? Solves or refuses its gate (with the gate's line) */
  passGate(e) {
    if (!e.gate || this.gateOpen(e.gate) || CHEAT.ghost) return true;
    const g = this.areaDef.gates[e.gate], st = this.st, P = st.persona;
    const refuse = (line) => { this.say(line || g.line || 'The way is shut.', { who: g.who }); this.emit('gate', { gate: e.gate, ok: false }); return false; };
    switch (g.kind) {
      case 'patrol': return P === 'ansel' ? (this.emit('gate', { gate: e.gate, ok: true, kind: 'patrol' }), this.say('Patrol.', { who: 'ansel' }), true) : refuse('Patrol only. You are not patrol.');
      case 'buyout':
        if (P !== 'rurik' && !this.o.attract) return refuse('Members only. Membership is a matter of means.');
        if (this.o.bot || this.o.attract) { if (this.spendRed(g.price)) { this.openGate(e.gate); this.emit('coins', {}); return true; } return refuse('Not enough Red.'); }
        this.prompt = { choice: true, title: 'PAY ' + g.price + ' RED?', items: ['PAY ' + g.price + ' RED', 'LEAVE'], i: 0, onPick: i => { if (i === 0) { if (this.spendRed(g.price)) { this.openGate(e.gate); this.emit('coins', {}); this.say('Paid in full.', { who: 'rurik' }); } else this.say('Not enough Red.', { who: 'rurik' }); } } };
        return false;
      case 'key': return st.items[g.item] ? (this.openGate(e.gate), this.say(g.okLine || 'Unlocked.'), true) : refuse(g.line || 'Locked.');
      case 'icelock': return st.items.ember ? (this.openGate(e.gate), this.emit('steam', { at: [this.hero.x, this.hero.y, this.hero.z + 20] }), this.say('The ice steams away.'), true) : refuse('Frozen shut.');
      case 'delegate':
        if ((st.items.edelweiss || 0) >= 3) { this.openGate(e.gate); this.startBeat(g.beat || 'delegate_gate'); return false; }
        return refuse('Three flowers. You have ' + (st.items.edelweiss || 0) + '.');
      case 'flag': return st.flags[g.flag] ? (this.openGate(e.gate), true) : refuse(g.line);
      case 'clear': return !this.anyAlive() ? true : refuse(g.line || 'Not while someone is laughing.');
      default: return refuse(g.line);
    }
  },
  giveItem(id, n = 1) {
    const st = this.st; st.items[id] = (st.items[id] || 0) + n;
    const I = S7.ITEMS[id];
    this.emit('item', { id, n });
    this.toast((I ? I.name : id).toUpperCase() + (n > 1 ? ' ×' + n : ''), { item: id });
    if (I && I.dossier) this.addDossier(I.dossier);
  },
  addDossier(id) { if (!this.st.dossier.includes(id)) { this.st.dossier.push(id); this.toast('DOSSIER: ' + (S7.DOSSIER[id] ? S7.DOSSIER[id].title : id)); this.emit('dossier', { id }); } },

  /* ---------------- the Featherbed ring and switching ---------------- */
  updateRing(dt, rdt, I) {
    const R = this.ring;
    const may = this.canSwitch() && (this.mode === 'rail' || this.mode === 'lift') && !(this.W.edge && this.rails.edges[this.W.edge].kind === 'ski');
    if (!R) {
      if (I.ringP && may) this.ringT = 0;
      if (I.ringD && may && this.ringT !== undefined) { this.ringT += rdt; if (this.ringT > .18) { this.ring = { i: PERSONA_ORDER.indexOf(this.st.persona), t: 0 }; this.emit('ring', { open: true }); this.tut('ring', true); } }
      if (I.ringR && this.ringT !== undefined && this.ringT <= .18 && may) { this.ringT = undefined; this.trySwitch(this.st.lastPersona); }
      if (!I.ringD) this.ringT = undefined;
      return false;
    }
    R.t += rdt;
    if (I.ringPick !== null && I.ringPick !== undefined) R.i = I.ringPick;
    if (I.pick !== null && I.pick !== undefined) R.i = I.pick;
    const st2 = I.stick; if (Math.hypot(st2[0], st2[1]) > .5) { const a = Math.atan2(st2[1], st2[0]); R.i = Math.round(S7.wrapAng(a + Math.PI / 2) / (TAU / 7) + 7) % 7; }
    if (I.leftP) R.i = (R.i + 6) % 7; if (I.rightP) R.i = (R.i + 1) % 7;
    if (!I.ringD || (I.pick !== null && I.pick !== undefined && I.device !== 'gamepad')) {
      this.ring = null; this.ringT = undefined; this.emit('ring', { open: false });
      const id = PERSONA_ORDER[R.i];
      if (id !== this.st.persona) this.trySwitch(id);
    }
    return true;
  },
  /** can the ring pick this persona now? '' when yes, else why not */
  whyNot(id) {
    const r = this.st.roster[id];
    if (!r.unlocked && !CHEAT.allPersonas) return 'NOT YET';
    if (r.frozen) return 'FROZEN';
    if (id === 'ansel' && this.areaDef.kind !== 'room7' && !CHEAT.allPersonas && !this.o.attract) return 'ROOM 7 ONLY';
    return '';
  },
  trySwitch(id, force) {
    if (!id || id === this.st.persona) return false;
    const why = force ? '' : this.whyNot(id);
    if (why) { this.say(this.personaDef(id).name.toUpperCase() + ': ' + why); this.emit('refuse', {}); return false; }
    this.aimExit(true);
    this.st.lastPersona = this.st.persona; this.st.persona = id;
    this.switching = { from: this.st.lastPersona, to: id, t: 0 };
    this.lowBarked = false;
    this.emit('switch', { from: this.st.lastPersona, to: id });
    return true;
  },
  bark(kind) {
    const P = this.personaDef(); if (!P || !P.barks) return;
    let l = P.barks[kind]; if (!l) return;
    if (Array.isArray(l)) l = l[Math.floor(S7.rnd('fx') * l.length) % l.length];
    this.say(l, { who: this.st.persona, bark: true });
    this.emit('bark', { who: this.st.persona, text: l });
  },

  /* ---------------- freezing and the Sweep (§7.10) ---------------- */
  freezePersona() {
    const st = this.st, id = st.persona, ps = this.pstate();
    this.aimExit(true); this.ring = null;
    if (id === 'ansel') { this.mode = 'gameover'; this.emit('gameover', {}); return; }
    ps.frozen = true; ps.hp = 0;
    ps.statue = { area: st.area, at: [this.hero.x, this.hero.y, this.hero.z], yaw: this.hero.yaw };
    this.curResults().frozen++;
    this.mode = 'frozen'; this.frozenT = 1.2;
    this.emit('freeze', { persona: id, at: ps.statue.at });
    this.bark('frozen');
  },
  startRescue() {
    const st = this.st;
    this.mode = 'rail';
    if (st.roster.ansel.frozen || st.roster.ansel.hp <= 0) { this.mode = 'gameover'; this.emit('gameover', {}); return; }
    st.lastPersona = st.persona; st.persona = 'ansel';
    const A = this.areaDef, node = this.lastDoor7 && this.rails.nodes[this.lastDoor7] ? this.lastDoor7 : (A.sweepNode || this.entryNode || Object.keys(this.rails.nodes)[0]);
    this.placeAt(node);
    this.emit('rescue', { start: true }); this.emit('switch', { from: st.lastPersona, to: 'ansel' });
    this.switching = { from: st.lastPersona, to: 'ansel', t: 0 };
    this.toast('THE SWEEP IS ON. FIND THE STATUE.', { life: 3.5 });
    this.tut('rescue');
  },
  revive(id) {
    const r = this.st.roster[id]; if (!r || !r.frozen) return;
    r.frozen = false; r.statue = null; r.hp = Math.ceil(this.maxHp(id) * .5);
    this.emit('rescue', { persona: id }); this.tut('rescue', true);
    this.say(this.personaDef(id).barks.revived, { who: id });
    if (this.st.flags.scriptedFreeze && !this.st.flags.rescueDone) { this.st.flags.rescueDone = 1; this.startBeat('t00_after_rescue'); }
  },
  /** put the walker on a node (warps, the Sweep's entry), facing its first exit */
  placeAt(nodeId, face) {
    const n = this.rails.nodes[nodeId]; if (!n) return;
    const ex = this.rails.exits(nodeId);
    this.W = { edge: null, node: nodeId, s: 0, dir: 1, v: 0, yaw: face !== undefined ? face : ex.length ? this.rails.branchYaw(ex[0], ex[0].dir) : 0, turnT: 0, turnFrom: 0, lastEdge: null, air: null };
    this.junction = null; this.st.node = nodeId; this.cam.shotId = null;
    this.heroUpdate(0); this.setupJunction(nodeId);
  },

  /* ---------------- Room 7 ---------------- */
  enterRoom7(s) {
    if (this.anyAlive()) { this.say('The door won\'t open while someone is laughing.'); return; }
    this.st.room7Door = { area: this.st.area, node: this.W.node || s.node };
    this.lastDoor7 = this.st.room7Door.node;
    this.emit('room7', { in: true });
    this.transition(() => { this.enterArea('room7', 'door', { noSave: true }); this.autosave('room7'); });
  },
  leaveRoom7() {
    const d = this.st.room7Door || { area: '00A', node: 'r7' };
    this.emit('room7', { in: false });
    this.transition(() => { this.enterArea(d.area, d.node, { noSave: true }); this.lastDoor7 = d.node; this.entryNode = d.node; });
  },
  /** a white flurry over an area change (the presenter shows it; the sim switches at once) */
  transition(fn) { this.emit('flurry', {}); fn(); },
  useExit(n) {
    if (this.o.echo && this.echoRun) { this.echoRun.finish(); return; }
    if (n.needs && !this.meets(n.needs) && !CHEAT.ghost) { this.say(n.line || 'Locked.'); return; }
    if (this.anyAlive() && !n.always) { this.say('Not while someone is laughing.'); return; }
    const [area, node] = n.to;
    this.emit('exit', { to: area });
    this.transition(() => { this.enterArea(area, node); this.entryNode = node; this.lastDoor7 = null; });
  },

  /* ---------------- Murmel's hints ---------------- */
  murmel(s) {
    const st = this.st, rurik = st.persona === 'rurik';
    if (st.freeHint) { st.freeHint = false; this.startTalk(S7.TALKS.murmel_first ? 'murmel_first' : this.hintTalk()); return; }
    this.prompt = { choice: true, title: 'MURMEL', items: [rurik ? 'A HINT (ON THE HOUSE)' : 'BUY A HINT (10 RED)', 'LEAVE'], i: 0, onPick: i => {
      if (i !== 0) { this.startTalk([['murmel', 'Come back... with change...']]); return; }
      if (!rurik && !this.spendRed(10)) { this.startTalk([['murmel', 'Gratuity... is customary... You have... none...']]); return; }
      st.hintsBought++; this.curResults().hints++;
      this.startTalk(this.hintTalk());
    } };
  },
  hintTalk() {
    const k = S7.objectiveKey(this), H = S7.HINTS[k] || S7.HINTS.fallback;
    return [['murmel', H]];
  }
});

/* ---- spot kinds: what △ says and does ---- */
const VERBS = {
  npc: 'TALK', murmel: 'TALK', pim: 'LISTEN', phone: s => 'ANSWER', tableau: 'CHECK', door7: 'ENTER ROOM 7', exit: 'ENTER',
  r7door: 'LEAVE', clock: 'SAVE', bench: 'WAX', wardrobe: 'WARDROBE', bed: 'CHECK', window: 'LOOK', rosalind: 'TALK', r7phone: 'LISTEN',
  codelock: 'OPEN', lift: 'BOARD', sign: 'READ', statue: 'HOLD TO CHIP FREE', gatebox: 'CHECK'
};
const REPEAT = { npc: 1, murmel: 1, tableau: 1, door7: 1, exit: 1, r7door: 1, clock: 1, bench: 1, wardrobe: 1, bed: 1, window: 1, rosalind: 1, r7phone: 1, codelock: 1, sign: 1, gatebox: 1 };
const ACTIONS = {
  npc: (sim, s) => sim.startTalk(typeof s.talk === 'function' ? s.talk(sim) : s.talk),
  pim: (sim, s) => { sim.st.spots[sim.spotKey(s)] = 1; sim.startTalk(s.talk); },
  murmel: (sim, s) => sim.murmel(s),
  phone: (sim, s) => { sim.st.spots[sim.spotKey(s)] = 1; sim.emit('pickup_phone', {}); sim.startTalk(s.talk); if (s.beat) sim.startBeat(s.beat); },
  tableau: (sim, s) => sim.startTalk([[s.who || 'tableau', s.line]]),
  sign: (sim, s) => sim.startTalk([['sign', s.line]]),
  door7: (sim, s) => sim.enterRoom7(s),
  exit: (sim, s) => { const n = sim.rails.nodes[s.node]; sim.useExit(Object.assign({}, n, s)); },
  r7door: (sim) => sim.leaveRoom7(),
  clock: (sim) => { sim.uiRequest = { kind: 'save' }; sim.startTalk([['rosalind', 'The clock is wound. Your sins are not.']]); },
  bench: (sim) => { sim.uiRequest = { kind: 'wax' }; },
  wardrobe: (sim) => { sim.uiRequest = { kind: 'wardrobe' }; },
  bed: (sim) => sim.startTalk([['holle', S7.holleLine(sim)]]),
  window: (sim) => { sim.uiRequest = { kind: 'postcard' }; },
  rosalind: (sim) => sim.startTalk([['rosalind', S7.objectiveLine(sim, 'rosalind')]]),
  r7phone: (sim) => sim.startTalk(sim.st.target >= 1 ? 'briefing_t01' : 'briefing_t00_replay'),
  codelock: (sim, s) => { sim.uiRequest = { kind: 'codelock', spot: s.id, len: s.code.length }; },
  gatebox: (sim, s) => { const e = sim.rails.edges[s.edge]; if (e && sim.passGate(e)) sim.say('Open.'); },
  lift: (sim, s) => { const e = sim.rails.edges[s.edge]; if (e && sim.W.node === e.a) sim.takeBranch({ edge: e, dir: 1 }); }
};
const PICKUPS = {
  red: (sim, s) => { sim.gain('red', s.n || 10, [s.x, s.y, s.z]); },
  rime: (sim, s) => { sim.gain('rime', s.n || 4, [s.x, s.y, s.z]); sim.toast('RIME +' + (s.n || 4)); },
  pin: (sim, s) => { sim.st.pins.push(s.pin); sim.emit('pin', { id: s.pin }); sim.toast('LIFT PIN: ' + S7.PINS[s.pin - 1].name); },
  dossier: (sim, s) => sim.addDossier(s.dossier),
  item: (sim, s) => sim.giveItem(s.item, s.n || 1)
};
S7.VERBS = VERBS; S7.PICKUPS = PICKUPS;


/* ===== src/50-story.js ===== */
/* STORY (§7.15): talks (typed lines with a speaker, voiced by 71-voice), choices, beats (generator scripts: talks,
 * waits, cards, camera overrides, spawns, flags) that run on the sim's clock and can be skipped, title cards, the
 * objective line and Oma Holle's line. */
const TYPE_RATE = 42;   // letters a second
Object.assign(Sim.prototype, {
  /* ---------------- talks ---------------- */
  startTalk(src, o = {}) {
    const raw = typeof src === 'string' ? S7.TALKS[src] : src;
    if (!raw) throw new Error('unknown talk ' + src);
    const lines = [];
    for (const l of raw) {
      if (Array.isArray(l)) { if (l[2] && l[2].if && !l[2].if(this)) continue; lines.push({ who: l[0], text: typeof l[1] === 'function' ? l[1](this) : l[1] }); }
      else if (l.if && !l.if(this)) continue;
      else lines.push(Object.assign({}, l));
    }
    if (!lines.length) { if (o.onDone) o.onDone(); return; }
    this.talk = { id: typeof src === 'string' ? src : null, lines, i: 0, shown: 0, t: 0, onDone: o.onDone, wait: 0 };
    this.aimExit(true); this.healing = false;
    this.emit('talk', { id: this.talk.id, open: true });
    this.talkLine();
  },
  talkLine() {
    const T0 = this.talk, l = T0.lines[T0.i];
    T0.shown = 0; T0.t = 0;
    if (l.card) { this.card = { title: l.card[0], sub: l.card[1] || '', t: 0, dur: l.dur || 2.6, who: l.who }; this.emit('card', { title: l.card[0] }); }
    else if (l.who) this.emit('line', { who: l.who, text: l.text });
    if (l.flag) this.st.flags[l.flag] = 1;
    if (l.sfx) this.emit('sfx', { name: l.sfx });
  },
  updateTalk(dt, I) {
    const T0 = this.talk, l = T0.lines[T0.i];
    T0.t += dt;
    if (l.card) { if (!this.card) this.nextLine(); return; }
    const len = (l.text || '').length;
    T0.shown = Math.min(len, T0.shown + dt * TYPE_RATE * (this.skipping ? 100 : 1));
    const auto = this.o.attract || this.o.bot || this.skipping || (this.talkAuto && T0.shown >= len && T0.t > len / TYPE_RATE + 1.4);
    if (I.confirmP || I.interactP || I.fireP || (I.clicked && !this.o.bot) || auto) {
      if (T0.shown < len && !auto) T0.shown = len;
      else if (!auto || T0.shown >= len) this.nextLine();
    }
  },
  nextLine() {
    const T0 = this.talk; if (!T0) return;
    T0.i++;
    if (T0.i >= T0.lines.length) { this.talk = null; this.emit('talk', { open: false }); if (T0.onDone) T0.onDone(); return; }
    this.talkLine();
  },
  /* ---------------- choices (Murmel, the velvet rope, skip scene) ---------------- */
  updateChoice(dt, I) {
    const P = this.prompt, n = P.items.length;
    if (I.upP || I.leftP) { P.i = (P.i + n - 1) % n; this.emit('tick', {}); }
    if (I.downP || I.rightP) { P.i = (P.i + 1) % n; this.emit('tick', {}); }
    if (I.choicePick !== undefined && I.choicePick !== null) P.i = I.choicePick;
    let pick = null;
    if (I.confirmP || (I.choiceClick !== undefined && I.choiceClick !== null)) pick = P.i;
    else if (I.cancelP) pick = n - 1;
    else if (this.o.bot || this.o.attract) pick = P.botPick !== undefined ? P.botPick : 0;
    if (pick !== null) { this.prompt = null; this.emit('confirm', {}); P.onPick(pick); }
  },
  /* ---------------- cards ---------------- */
  updateCard(dt, I) {
    const C = this.card; C.t += dt;
    if (C.t >= C.dur || this.skipping || ((I.confirmP || I.fireP || I.clicked || I.interactP) && C.t > .8) || (this.o.bot && C.t > .5)) { this.card = null; this.emit('cardEnd', {}); }
  },
  /* ---------------- beats ---------------- */
  startBeat(id, o = {}) {
    const fn = typeof id === 'function' ? id : S7.BEATS[id];
    if (!fn) throw new Error('unknown beat ' + id);
    const G = this.beatApi();
    const b = { id: typeof id === 'string' ? id : 'fn', gen: fn(G, o), wait: null, done: false };
    this.beats.push(b);
    this.emit('beat', { id: b.id });
    this.stepBeat(b, 0);
    return b;
  },
  beatApi() {
    const sim = this;
    return {
      sim,
      say: (src) => ({ talk: src }),
      wait: (s) => ({ t: s }),
      card: (title, sub, o) => ({ card: [title, sub || '', o] }),
      until: (fn) => ({ until: fn }),
      cam: (o, dur) => { sim.camOverride = o ? Object.assign({ t: 0, dur }, o) : null; },
      cut: (on) => { sim.cutscene = on; sim.letterbox = on ? 1 : 0; if (on) { sim.aimExit(true); sim.ring = null; } sim.emit('cutscene', { on }); },
      flag: (k, v = 1) => { sim.st.flags[k] = v; },
      has: (k) => !!sim.st.flags[k],
      spawn: (type, at, o) => sim.spawnEnemy(type, at, o || {}),
      wave: (id) => sim.startWave(id),
      emit: (t, d) => sim.emit(t, d),
      music: (song) => sim.emit('music', { song }),
      sfx: (name) => sim.emit('sfx', { name }),
      toast: (t) => sim.toast(t),
      area: (id, node, o) => sim.enterArea(id, node, o || {}),
      give: (k, n) => sim.giveItem(k, n),
      gate: (g) => sim.openGate(g),
      unlock: (ids) => { for (const id of ids) sim.st.roster[id].unlocked = true; },
      persona: (id) => { sim.st.lastPersona = sim.st.persona; sim.st.persona = id; },
      place: (node, face) => sim.placeAt(node, face),
      boss: (id, phase) => sim.startBoss(id, phase),
      ui: (kind, o) => { sim.uiRequest = Object.assign({ kind }, o || {}); }
    };
  },
  stepBeat(b, dt) {
    for (let guard = 0; guard < 200; guard++) {
      const w = b.wait;
      if (w) {
        if (w.t !== undefined) { w.t -= dt; dt = 0; if (w.t > 0 && !this.skipping) return; }
        else if (w.talk !== undefined) { if (this.talk || this.card) return; }
        else if (w.card !== undefined) { if (this.card) return; }
        else if (w.until) { if (!w.until(this) && !(this.skipping && guard > 2)) return; }
        else if (w.uiDone) { if (this.uiRequest || this.uiOpen) return; }
        b.wait = null;
      }
      const r = b.gen.next();
      if (r.done) { b.done = true; return; }
      const v = r.value;
      if (v === undefined || v === null) { b.wait = { t: 0 }; return; }
      if (typeof v === 'number') b.wait = { t: v };
      else if (v.talk !== undefined) { this.startTalk(v.talk); b.wait = { talk: 1 }; }
      else if (v.card) { this.card = { title: v.card[0], sub: v.card[1], t: 0, dur: (v.card[2] && v.card[2].dur) || 2.6, silhouette: v.card[2] && v.card[2].who }; this.emit('card', { title: v.card[0] }); b.wait = { card: 1 }; }
      else if (v.until) b.wait = { until: v.until };
      else if (v.t !== undefined) b.wait = { t: v.t };
      else b.wait = { t: 0 };
    }
  },
  runBeats(dt) {
    for (const b of this.beats.slice()) if (!b.done) this.stepBeat(b, dt);
    this.beats = this.beats.filter(b => !b.done);
    if (this.skipping && !this.cutscene) this.skipping = false;
  },
  /** skip the running cutscene: every wait, talk and card runs out at once; same state as watching it */
  skipCutscene() {
    if (!this.cutscene) return;
    this.skipping = true;
    for (let i = 0; i < 400 && this.cutscene; i++) {
      if (this.talk) { while (this.talk) this.nextLine(); }
      this.card = null;
      this.runBeats(1);
      if (!this.beats.length) break;
    }
    if (this.talk) while (this.talk) this.nextLine();
    this.card = null;
    if (this.cutscene && !this.beats.length) { this.cutscene = false; this.letterbox = 0; }
    this.camOverride = null;
    this.skipping = false;
    this.emit('skipped', {});
  }
});

/** the current objective's key and text (content/story/objectives.js holds the table) */
S7.objectiveKey = sim => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return o.key; return 'fallback'; };
S7.objective = sim => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return o.text; return 'Go where the laughing is.'; };
S7.objectiveLine = (sim, who) => { for (const o of S7.OBJECTIVES) if (o.when(sim)) return who === 'rosalind' ? o.rosalind || o.text : o.text; return 'Go where the laughing is.'; };
S7.holleLine = sim => {
  const L = S7.HOLLE_LINES, n = (sim.st.flags.holleN = (sim.st.flags.holleN || 0) + 1);
  const stage = sim.st.target >= 1 ? 2 : sim.st.flags.grauDead ? 1 : 0;
  const pool = L.filter(l => l[0] <= stage);
  return pool[(n - 1) % pool.length][1];
};


/* ===== src/60-save.js ===== */
/* SAVES (§7.17) and RESULTS (§7.20): the saved state is sim.st (plain data) plus where the walker stands. Autosaves on
 * area entry, Room 7 entry and every boss start; never in a session, attract mode or a bot run. Ranks per target. */
const SAVE_VERSION = 1;
Object.assign(Sim.prototype, {
  serialize() {
    const st = JSON.parse(JSON.stringify(this.st));
    st.node = this.W.node || (this.W.edge ? this.rails.edges[this.W.edge].a : this.st.node);
    st.yaw = Math.round(this.W.yaw * 1000) / 1000;
    if (this.boss) st.bossCheckpoint = { id: this.boss.id, phase: this.boss.phase };
    return st;
  },
  deserialize(data) {
    const st = JSON.parse(JSON.stringify(data));
    if (st.v !== SAVE_VERSION) throw new Error('save version ' + st.v);
    this.st = st;
    this.beats = []; this.talk = null; this.card = null; this.cutscene = false; this.letterbox = 0; this.camOverride = null; this.prompt = null;
    this.mode = 'rail'; this.switching = null; this.ring = null; this.mags = {};
    this.enterArea(st.area, st.node, { silent: false, noSave: true, face: st.yaw, noEnter: !!st.bossCheckpoint });
    if (st.bossCheckpoint) { const b = st.bossCheckpoint; delete st.bossCheckpoint; this.startBoss(b.id, b.phase); }
    for (const id of PERSONA_ORDER) { const r = st.roster[id]; if (r.frozen && r.statue && r.statue.area !== st.area) { /* the statue waits where it fell */ } }
    if (st.roster[st.persona].frozen) { const alt = PERSONA_ORDER.find(id => !st.roster[id].frozen && st.roster[id].unlocked && id !== 'ansel') || 'ansel'; st.persona = alt; }
  },
  autosave(why) {
    if (this.o.attract || this.o.bot || this.o.noSave || S7.inSession) return false;
    if (!this.game.saves) return false;
    try { this.game.saves.autosave(); this.emit('save', { slot: 'auto', why }); return true; } catch (e) { return false; }
  },
  saveMeta() {
    const A = this.areaDef;
    return { place: A.title + (A.sub ? ' · ' + A.sub : ''), level: 'TARGET ' + String(this.st.target).padStart(2, '0') };
  }
});
/** ranks (§7.25): Double Black, Black, Blue, Green */
S7.RANKS = [
  { id: 'dblack', name: 'DOUBLE BLACK', icon: '◆◆', color: '#101014' },
  { id: 'black', name: 'BLACK DIAMOND', icon: '◆', color: '#101014' },
  { id: 'blue', name: 'BLUE SQUARE', icon: '■', color: '#2a6ad8' },
  { id: 'green', name: 'GREEN CIRCLE', icon: '●', color: '#2aa04a' }
];
S7.rankOf = (r, target) => {
  const crit = r.kills ? r.crits / r.kills : 0, par = target === 0 ? 12 * 60 : 40 * 60;
  if (crit >= .6 && r.frozen === 0 && r.time <= par) return S7.RANKS[0];
  if (crit >= .4 && r.frozen <= 1) return S7.RANKS[1];
  if (crit >= .2) return S7.RANKS[2];
  return S7.RANKS[3];
};
/** migrate an older save, or refuse it (null) */
S7.migrateSave = (data, from) => (from === SAVE_VERSION ? data : null);


/* ===== src/70-audio.js ===== */
/* AUDIO (§10): every sound is code. Sound effects are the engine's chip voices (audio.define); songs are in the
 * engine's step notation with an explore layer and a danger layer; the wind, the room tone and the drips are our own
 * WebAudio beds; laughter and voices are synthesized in 71-voice.js. It listens to the bus and never changes the sim. */
const SFX = {
  // weapons
  shot38: [{ wave: 'noise', freq: 2400, to: 300, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 160, to: 50, dur: .08, vol: .3 }],
  shotpole: [{ wave: 'noise', freq: 4200, to: 1200, dur: .04, vol: .22, filter: 'highpass' }, { wave: 'square', freq: 300, to: 120, dur: .03, vol: .12 }],
  shotrifle: [{ wave: 'noise', freq: 1800, to: 120, dur: .4, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 110, to: 30, dur: .3, vol: .5 }, { wave: 'noise', freq: 6000, dur: .03, vol: .2, filter: 'highpass' }],
  shotgun: [{ wave: 'noise', freq: 1500, to: 110, dur: .32, vol: .68, filter: 'lowpass' }, { wave: 'sine', freq: 95, to: 32, dur: .26, vol: .6 }],
  alphorn: [{ wave: 'saw', freq: 'A2', to: 'A1', dur: .5, vol: .4, vib: [6, .02] }, { wave: 'saw', freq: 'E3', to: 'E2', dur: .45, vol: .25 }, { wave: 'noise', freq: 700, to: 200, dur: .4, vol: .3, filter: 'lowpass' }],
  shot25: [{ wave: 'noise', freq: 3600, to: 900, dur: .07, vol: .32, filter: 'highpass' }, { wave: 'square', freq: 400, to: 160, dur: .04, vol: .14 }],
  launcher: [{ wave: 'noise', freq: 900, to: 200, dur: .25, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 220, to: 90, dur: .2, vol: .3 }],
  reload: [{ wave: 'noise', freq: 3000, dur: .03, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 900, dur: .02, vol: .08, delay: .12 }, { wave: 'noise', freq: 2400, dur: .04, vol: .2, filter: 'highpass', delay: .22 }],
  shell: [{ wave: 'noise', freq: 2800, dur: .03, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 700, dur: .02, vol: .08, delay: .05 }],
  reloaded: { wave: 'square', freq: 1200, to: 900, dur: .04, vol: .08 },
  dryfire: { wave: 'square', freq: 2000, dur: .02, vol: .1 },
  overheat: [{ wave: 'noise', freq: 1200, to: 400, dur: .6, vol: .3, filter: 'bandpass' }, { wave: 'saw', freq: 120, to: 60, dur: .3, vol: .2 }],
  scope: { wave: 'noise', freq: 5000, to: 2000, dur: .08, vol: .12, filter: 'highpass' },
  // combat
  scan: [{ wave: 'sine', freq: 1320, to: 1300, dur: .25, vol: .25, vib: [12, .01] }, { wave: 'noise', freq: 300, to: 3000, dur: .6, vol: .14, filter: 'bandpass' }],
  crit: [{ wave: 'noise', freq: 8000, to: 2000, dur: .2, vol: .35, filter: 'highpass' }, { wave: 'triangle', freq: 'A5', dur: .6, vol: .14 }, { wave: 'triangle', freq: 'C#6', dur: .6, vol: .12 }, { wave: 'triangle', freq: 'E6', dur: .6, vol: .12 }],
  slush: [{ wave: 'noise', freq: 600, to: 120, dur: .35, vol: .35, filter: 'lowpass' }],
  burst: [{ wave: 'noise', freq: 900, to: 80, dur: .5, vol: .6, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .35, vol: .6 }, { wave: 'noise', freq: 3000, to: 600, dur: .15, vol: .25, filter: 'bandpass' }],
  boom: [{ wave: 'noise', freq: 700, to: 60, dur: .7, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 25, dur: .6, vol: .7 }],
  tink: [{ wave: 'triangle', freq: 'E7', dur: .12, vol: .2 }, { wave: 'noise', freq: 7000, dur: .03, vol: .1, filter: 'highpass' }],
  giggleup: { wave: 'square', freq: 400, to: 1400, dur: .35, vol: .14, vib: [30, .06] },
  whoosh: { wave: 'noise', freq: 600, to: 2400, dur: .3, vol: .16, filter: 'bandpass' },
  snowhit: { wave: 'noise', freq: 1600, to: 400, dur: .12, vol: .3, filter: 'lowpass' },
  hurt: [{ wave: 'noise', freq: 520, to: 200, dur: .12, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 160, to: 90, dur: .1, vol: .3 }],
  freeze: [{ wave: 'noise', freq: 9000, to: 3000, dur: 1.2, vol: .3, filter: 'highpass' }, { wave: 'triangle', freq: 'E6', to: 'E5', dur: 1.2, vol: .14 }],
  chip: { wave: 'noise', freq: 6000, dur: .03, vol: .12, filter: 'highpass' },
  rescue: [{ wave: 'triangle', freq: 'C5', dur: .15, vol: .2 }, { wave: 'triangle', freq: 'E5', dur: .15, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'G5', dur: .3, vol: .2, delay: .2 }],
  // movement and the world
  step: { wave: 'noise', freq: 900, dur: .03, vol: .06, filter: 'lowpass' },
  snowstep: { wave: 'noise', freq: 1400, to: 500, dur: .06, vol: .08, filter: 'lowpass' },
  hockeystop: [{ wave: 'noise', freq: 4000, to: 800, dur: .4, vol: .35, filter: 'highpass' }],
  jump: { wave: 'noise', freq: 800, to: 2000, dur: .2, vol: .2, filter: 'bandpass' },
  land: [{ wave: 'noise', freq: 600, to: 100, dur: .2, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 80, to: 40, dur: .15, vol: .3 }],
  quickturn: { wave: 'noise', freq: 1200, to: 600, dur: .08, vol: .1, filter: 'lowpass' },
  lift: [{ wave: 'square', freq: 90, dur: .2, vol: .1 }, { wave: 'noise', freq: 400, dur: .1, vol: .1, delay: .2 }],
  bell: [{ wave: 'triangle', freq: 'E5', dur: 1.2, vol: .2 }, { wave: 'sine', freq: 'B5', dur: 1.0, vol: .1 }, { wave: 'sine', freq: 'G#6', dur: .6, vol: .06 }],
  bigbell: [{ wave: 'triangle', freq: 'C3', dur: 3, vol: .4 }, { wave: 'sine', freq: 'G3', dur: 2.6, vol: .2 }, { wave: 'sine', freq: 'E4', dur: 2, vol: .12 }, { wave: 'sine', freq: 'A#4', dur: 1.6, vol: .08 }],
  ding: [{ wave: 'sine', freq: 'C6', dur: .6, vol: .25 }, { wave: 'sine', freq: 'G6', dur: .4, vol: .08 }],
  cuckoo: [{ wave: 'sine', freq: 'E5', dur: .18, vol: .2 }, { wave: 'sine', freq: 'C5', dur: .3, vol: .2, delay: .22 }],
  phone: [{ wave: 'square', freq: 1400, dur: .4, vol: .08, vib: [22, .05] }, { wave: 'square', freq: 1400, dur: .4, vol: .08, vib: [22, .05], delay: .6 }],
  door7: [{ wave: 'triangle', freq: 'C4', dur: .8, vol: .14 }, { wave: 'triangle', freq: 'E4', dur: .8, vol: .12 }, { wave: 'triangle', freq: 'G4', dur: .8, vol: .1 }],
  flurry: { wave: 'noise', freq: 3000, to: 900, dur: .6, vol: .16, filter: 'bandpass' },
  echo: [{ wave: 'pulse', freq: 'A4', to: 'A5', dur: .25, vol: .16 }, { wave: 'pulse', freq: 'A5', to: 'E5', dur: .3, vol: .14, delay: .25 }, { wave: 'pulse', freq: 'A4', dur: .3, vol: .08, delay: .7 }, { wave: 'pulse', freq: 'A4', dur: .3, vol: .04, delay: 1.1 }],
  flash: [{ wave: 'noise', freq: 9000, dur: .05, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 2000, to: 9000, dur: .5, vol: .06 }],
  flare: [{ wave: 'noise', freq: 2000, to: 5000, dur: .5, vol: .2, filter: 'bandpass' }, { wave: 'noise', freq: 1500, dur: 1.2, vol: .08, filter: 'highpass', delay: .4 }],
  coins: [{ wave: 'square', freq: 'B5', dur: .06, vol: .1 }, { wave: 'square', freq: 'E6', dur: .1, vol: .1, delay: .06 }, { wave: 'square', freq: 'B5', dur: .06, vol: .08, delay: .14 }, { wave: 'square', freq: 'G6', dur: .1, vol: .08, delay: .2 }],
  charge: [{ wave: 'noise', freq: 500, to: 50, dur: 1, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 22, dur: .8, vol: .7 }],
  wax: { wave: 'noise', freq: 3000, to: 1500, dur: .6, vol: .2, filter: 'highpass' },
  chime: [{ wave: 'triangle', freq: 'G5', dur: .5, vol: .14 }, { wave: 'triangle', freq: 'D6', dur: .5, vol: .1, delay: .08 }],
  steam: { wave: 'noise', freq: 4000, to: 800, dur: 1, vol: .2, filter: 'highpass' },
  grind: [{ wave: 'saw', freq: 55, to: 45, dur: 2.5, vol: .14, vib: [8, .05] }, { wave: 'noise', freq: 300, dur: 2.5, vol: .14, filter: 'lowpass' }],
  collapse: [{ wave: 'noise', freq: 500, to: 60, dur: 1.4, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 25, dur: 1, vol: .6 }],
  feathers: { wave: 'noise', freq: 5000, to: 2000, dur: .9, vol: .14, filter: 'highpass' },
  rumble: { wave: 'noise', freq: 120, dur: 1.5, vol: .5, filter: 'lowpass' },
  pickup: [{ wave: 'square', freq: 'E5', dur: .05, vol: .1 }, { wave: 'square', freq: 'A5', dur: .08, vol: .1, delay: .05 }],
  red: { wave: 'triangle', freq: 'A5', to: 'E6', dur: .06, vol: .08 },
  rime: [{ wave: 'triangle', freq: 'E6', dur: .1, vol: .12 }, { wave: 'triangle', freq: 'B6', dur: .2, vol: .1, delay: .06 }],
  item: [{ wave: 'pulse', freq: 'C5', dur: .1, vol: .14 }, { wave: 'pulse', freq: 'G5', dur: .1, vol: .14, delay: .1 }, { wave: 'pulse', freq: 'C6', dur: .25, vol: .14, delay: .2 }],
  gateok: [{ wave: 'square', freq: 'G4', dur: .08, vol: .12 }, { wave: 'square', freq: 'D5', dur: .14, vol: .12, delay: .08 }],
  gateno: [{ wave: 'square', freq: 'D4', dur: .1, vol: .1 }, { wave: 'square', freq: 'C#4', dur: .16, vol: .1, delay: .1 }],
  // UI
  tick: { wave: 'square', freq: 1800, dur: .015, vol: .05 },
  confirm: [{ wave: 'square', freq: 'C6', dur: .04, vol: .08 }, { wave: 'square', freq: 'G6', dur: .06, vol: .08, delay: .04 }],
  back: { wave: 'square', freq: 'G5', to: 'C5', dur: .08, vol: .07 },
  ring: { wave: 'noise', freq: 2000, to: 600, dur: .25, vol: .12, filter: 'bandpass' },
  switch: [{ wave: 'noise', freq: 4000, to: 1200, dur: .45, vol: .16, filter: 'bandpass' }, { wave: 'triangle', freq: 'E5', to: 'B5', dur: .3, vol: .06 }],
  sting: [{ wave: 'saw', freq: 'A2', dur: .9, vol: .25 }, { wave: 'saw', freq: 'E3', dur: .9, vol: .2 }, { wave: 'square', freq: 'A4', to: 'G#4', dur: .9, vol: .12 }, { wave: 'noise', freq: 600, to: 100, dur: .5, vol: .3, filter: 'lowpass' }],
  thaw: [{ wave: 'noise', freq: 9000, to: 3000, dur: .25, vol: .2, filter: 'highpass' }]
};

class S7Audio {
  constructor(game, sim) {
    this.game = game; this.sim = sim; this.A = game.audio; this.danger = 0; this.dangerT = 0; this.song = null; this.amb = null;
    for (const k in SFX) this.A.define('s7' + k, SFX[k]);
    const on = (t, f) => S7.bus.on(t, f), sfx = (n, o) => this.sfx(n, o);
    on('shot', d => sfx(S7.WEAPONS[S7.PERSONAS[d.persona].weapon].sfx));
    on('reload', () => sfx('reload')); on('shell', () => sfx('shell')); on('reloaded', () => sfx('reloaded')); on('dryfire', () => sfx('dryfire')); on('overheat', () => sfx('overheat'));
    on('scope', () => sfx('scope')); on('scan', () => sfx('scan'));
    on('crit', () => { sfx('crit'); this.game.input.rumble && this.game.input.rumble(.4, .12); });
    on('kill', d => { if (!d.crit) sfx('slush'); });
    on('explode', d => { sfx(d.kind === 'burst' ? 'burst' : 'boom'); this.game.shake(d.kind === 'burst' ? 3 : 5); });
    on('tink', () => sfx('tink')); on('giggleup', () => sfx('giggleup')); on('throw', () => sfx('whoosh')); on('splat', () => sfx('snowhit')); on('shatter', () => sfx('tink'));
    on('hurt', () => { sfx('hurt'); this.game.flash('#ff2030', .08); this.game.input.rumble && this.game.input.rumble(.6, .18); });
    on('freeze', () => sfx('freeze')); on('chip', d => { if (Math.floor(d.t * 8) !== Math.floor((d.t - 1 / 120) * 8)) sfx('chip'); }); on('rescue', d => d.persona && sfx('rescue'));
    on('hockeystop', () => sfx('hockeystop')); on('jump', () => sfx('jump')); on('land', () => sfx('land')); on('quickturn', () => sfx('quickturn')); on('lift', () => sfx('lift'));
    on('pickup', d => sfx(d.kind === 'rime' ? 'rime' : d.kind === 'red' ? 'red' : 'pickup')); on('item', () => sfx('item')); on('pin', () => sfx('item')); on('dossier', () => sfx('pickup'));
    on('gate', d => sfx(d.ok ? 'gateok' : 'gateno')); on('coins', () => sfx('coins')); on('steam', () => sfx('steam'));
    on('skill', d => sfx({ flare: 'flare', makeitrain: 'coins', echo: 'echo', flash: 'flash', charge: 'charge' }[d.skill] || 'pickup'));
    on('switch', () => sfx('switch')); on('ring', d => d.open && sfx('ring')); on('flurry', () => sfx('flurry')); on('room7', () => sfx('door7'));
    on('card', () => sfx('sting')); on('splash', d => d.text === 'THAW.' && sfx('thaw'));
    on('tick', () => sfx('tick')); on('confirm', () => sfx('confirm')); on('refuse', () => sfx('gateno'));
    on('sfx', d => sfx(d.name)); on('bigbell', () => sfx('bigbell')); on('solve', d => sfx(d.kind === 'far' ? 'bigbell' : d.kind === 'cornice' || d.kind === 'serac' ? 'rumble' : 'chime'));
    on('music', d => this.music(d.song)); on('area', d => this.areaMusic(d.to));
    on('save', () => sfx('cuckoo')); on('pickup_phone', () => sfx('phone'));
    on('tutorial', () => sfx('confirm'));
  }
  sfx(name, o) { if (!name) return; try { if (typeof name === 'string') this.A.sfx(SFX[name] ? 's7' + name : name, o); else this.A.sfx(name, o); } catch (e) { /* no sound here */ } }
  ui(name) { this.sfx(name === 'tick' ? 'tick' : name === 'back' ? 'back' : 'confirm'); }
  music(id, o = {}) {
    if (this.song === id && !o.restart) return;
    this.song = id; this.dangerOn = false;
    if (!id) { this.A.stopMusic(1); return; }
    const s = S7.SONGS[id]; if (!s) return;
    try { this.A.music(s, Object.assign({ sync: true, fade: .8 }, o)); } catch (e) { /* no sound */ }
  }
  areaMusic(id) { const A = S7.AREAS[id]; if (A && A.music && !this.sim.boss) this.music(A.music); this.ambience(A && A.ambience); }
  /** each frame: the danger layer while Whiteouts are near; the beds' gains */
  update(dt) {
    const sim = this.sim; if (!sim || !sim.st) return;
    const near = sim.enemies.some(e => e.alive && !e.passive && V.dist2([e.x, e.y], [sim.hero.x, sim.hero.y]) < 40 * M);
    if (near) this.dangerT = 1.5; else this.dangerT -= dt;
    const want = this.dangerT > 0;
    if (want !== this.dangerOn && S7.SONGS[this.song] && S7.SONGS[this.song].tracks.some(t => t.name === 'danger')) { this.dangerOn = want; try { this.A.layer('danger', want ? 1 : 0, want ? .5 : 1.5); } catch (e) { /* no music */ } }
    if (this.amb) this.ambTick(dt);
  }
  /** ambience beds: wind (two filtered noise bands with slow gusts), room tone, the archive's drips */
  ambience(kind) {
    const c = this.A.ctx; if (!c || !this.A._sfxBus) { this.pendingAmb = kind; return; }
    if (this.amb && this.amb.kind === kind) return;
    if (this.amb) { const old = this.amb; try { old.g.gain.setTargetAtTime(0, c.currentTime, .4); setTimeout(() => { try { old.src.forEach(s => s.stop()); } catch (e) { /* stopped */ } }, 2000); } catch (e) { /* gone */ } this.amb = null; }
    if (!kind) return;
    const buf = S7.noiseBuffer(c), g = c.createGain(); g.gain.value = 0; g.connect(this.A._sfxBus);
    const src = [], mk = (type, f, q, vol) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = c.createGain(); gg.gain.value = vol; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(); src.push(s); return { fl, gg }; };
    const parts = [];
    if (kind === 'wind' || kind === 'storm' || kind === 'fohn') { parts.push(mk('bandpass', 380, .7, .5), mk('bandpass', 1400, 1.2, .18)); }
    if (kind === 'roomtone' || kind === 'room7') parts.push(mk('lowpass', 180, .5, .25));
    if (kind === 'archive') parts.push(mk('bandpass', 220, 2, .25));
    if (kind === 'crowd') parts.push(mk('bandpass', 700, .8, .12), mk('lowpass', 300, .5, .2));
    g.gain.setTargetAtTime(kind === 'storm' ? .5 : .32, c.currentTime, .8);
    this.amb = { kind, g, src, parts, t: 0, drip: 0 };
  }
  ambTick(dt) {
    const a = this.amb, c = this.A.ctx; a.t += dt;
    const gust = .6 + .4 * Math.sin(a.t * .37) * Math.sin(a.t * .13 + 1);
    if ((a.kind === 'wind' || a.kind === 'storm' || a.kind === 'fohn') && a.parts[0]) { a.parts[0].fl.frequency.setTargetAtTime((a.kind === 'fohn' ? 260 : 380) + gust * 260, c.currentTime, .3); a.parts[0].gg.gain.setTargetAtTime(.25 + gust * .4, c.currentTime, .3); }
    if (a.kind === 'archive') { a.drip -= dt; if (a.drip <= 0) { a.drip = .7 + Math.random() * 2.2; this.sfx({ wave: 'sine', freq: 1800 + Math.random() * 900, to: 900, dur: .08, vol: .05 }); } }
    if (a.kind === 'room7' && Math.floor(a.t) !== Math.floor(a.t - dt)) this.sfx({ wave: 'noise', freq: 5000, dur: .012, vol: .025, filter: 'highpass' });
  }
}
S7.Audio = S7Audio;
/** one second of white noise per context (laughs, voices, beds) */
S7.noiseBuffer = (c) => {
  if (c._s7noise) return c._s7noise;
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
  return (c._s7noise = b);
};


/* ===== src/71-voice.js ===== */
/* LAUGHTER (§10.3) and VOICES (§10.4): WebAudio on the engine's context, into its effects bus (so the volume, effects
 * and mute settings hold), times the voices setting. Laughs are formant "ha" syllables in four styles, panned and
 * lowpassed by line of sight, at most eight at once. Voices are Animalese-style gibberish: a syllable for every other
 * typed letter, vowels setting the formants, consonants a click or a hiss, a pitch and a tic per speaker. Headless (no
 * AudioContext) every call is a no-op. */
const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
class S7Voice {
  constructor(game) { this.game = game; this.live = []; this.lastShown = -1; this.lastLine = null; this.lastT = 0; this.q = []; }
  ctx() { const A = this.game.audio; return A && A.ctx && A._sfxBus && A.ready !== false ? A.ctx : null; }
  bus() {
    const c = this.ctx(); if (!c) return null;
    if (!this._bus || this._bus.context !== c) { this._bus = c.createGain(); this._bus.connect(this.game.audio._sfxBus); }
    const v = this.game.settings.voices; this._bus.gain.value = typeof v === 'number' ? v : .8;
    return this._bus;
  }
  /** a laugh at world point `at` heard from the camera pose (style: giggle | cackle | chuckle | wheeze) */
  laugh(style, pitchSt, at, pose, occluded) {
    const c = this.ctx(), out = this.bus(); if (!c || !out || !pose) return;
    const now = c.currentTime;
    this.live = this.live.filter(l => l > now);
    if (this.live.length >= 8) return;
    const d = Math.hypot(at[0] - pose.x, at[1] - pose.y), gain = clamp(1 - d / (60 * M), 0, 1) * .5; if (gain < .02) return;
    const ang = Math.atan2(at[1] - pose.y, at[0] - pose.x) - pose.yaw, pan = clamp(Math.sin(ang), -1, 1);
    const P = c.createStereoPanner ? c.createStereoPanner() : null; if (P) { P.pan.value = pan; P.connect(out); }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = occluded ? 900 : 9000; lp.connect(P || out);
    const base = 220 * Math.pow(2, (pitchSt || 0) / 12) * (style === 'chuckle' ? .7 : style === 'giggle' ? 1.5 : 1);
    const n = style === 'giggle' ? 6 + Math.floor(Math.random() * 4) : style === 'cackle' ? 4 + Math.floor(Math.random() * 2) : style === 'chuckle' ? 3 + Math.floor(Math.random() * 1.9) : 4;
    const syl = style === 'giggle' ? .09 : style === 'cackle' ? .13 : style === 'chuckle' ? .16 : .14;
    let t = now + .02;
    for (let i = 0; i < n; i++) {
      const f = base * (style === 'giggle' ? 1 + i * .05 : style === 'cackle' ? 1.2 - i * .06 : 1 - i * .03);
      // a breath before each syllable
      this.noise(c, lp, t, .03, 2200, gain * .25);
      if (style !== 'wheeze') {
        const o = c.createOscillator(); o.type = style === 'cackle' ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (style === 'giggle' ? 1.08 : .92), t + syl);
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * (style === 'chuckle' ? .6 : 1), t + .012); g.gain.exponentialRampToValueAtTime(.001, t + syl * .95);
        const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 750; f2.frequency.value = 1200; f1.Q.value = 5; f2.Q.value = 6;
        o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); o.start(t); o.stop(t + syl + .02);
      } else this.noise(c, lp, t, syl * .9, 1100, gain * .9, 'bandpass');
      t += syl * (1.05 + Math.random() * .2);
    }
    this.live.push(t);
  }
  noise(c, dest, t, dur, f, vol, type = 'highpass') {
    const s = c.createBufferSource(); s.buffer = S7.noiseBuffer(c); const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  /** the syllables a line makes: deterministic for a text (tests read it) */
  static schedule(text, V0) {
    const out = []; let n = 0, prevCons = null;
    const rate = V0.rate || 1, words = text.length;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i].toLowerCase();
      if (ch === ',' ) { out.push({ pause: .12 }); continue; }
      if (ch === '.' || ch === '!' || ch === '?') { out.push({ pause: ch === '.' ? .25 : .15, mark: ch }); continue; }
      if (!/[a-zäöüéèà]/.test(ch)) { prevCons = null; continue; }
      const v = 'aeiouyäöüéèà'.includes(ch);
      if (!v) { prevCons = ch; continue; }
      n++;
      if (n % 2 === 0 && !V0.every) { prevCons = null; continue; }
      const vk = { 'ä': 'e', 'ö': 'o', 'ü': 'u', 'é': 'e', 'è': 'e', 'à': 'a' }[ch] || ch;
      const drift = -2 * (i / Math.max(1, words));
      out.push({ v: vk, cons: prevCons, st: drift + ((ch.charCodeAt(0) * 7 + i * 3) % (2 * (V0.range || 2) + 1)) - (V0.range || 2), dur: (.055 + ((i * 13) % 5) * .006) / rate, idx: i });
      prevCons = null;
    }
    return out;
  }
  /** each frame during a talk: voice the letters typed since the last frame */
  talkTick(talk) {
    if (!talk) { this.lastLine = null; return; }
    const l = talk.lines[talk.i]; if (!l || l.card || !l.who) return;
    const key = talk.i + ':' + l.text;
    if (this.lastLine !== key) { this.lastLine = key; this.lastShown = 0; this.sched = S7Voice.schedule(l.text || '', this.voiceOf(l.who)); this.si = 0; }
    const shown = Math.floor(talk.shown);
    if (shown <= this.lastShown) return;
    const V0 = this.voiceOf(l.who);
    while (this.si < this.sched.length && (this.sched[this.si].idx === undefined || this.sched[this.si].idx < shown)) {
      const sy = this.sched[this.si++];
      if (sy.pause) continue;
      const last = this.sched.slice(this.si).findIndex(x => x.mark) ;
      const q = last >= 0 && last < 3 && this.sched[this.si + last].mark === '?';
      this.syllable(V0, sy, q, (l.text || '').includes('!'));
    }
    this.lastShown = shown;
  }
  voiceOf(who) { const P = S7.PEOPLE[who] || S7.PERSONAS[who], id = P && P.voice ? P.voice : who; return S7.VOICES[id] || S7.VOICES.whiteout; }
  syllable(V0, sy, question, excl) {
    const c = this.ctx(), out = this.bus(); if (!c || !out || !V0) return;
    const t = c.currentTime + .005, dur = sy.dur;
    let f = V0.pitch * Math.pow(2, (sy.st + (question ? 3 : 0) + (excl ? 2 : 0)) / 12);
    if (V0.yodel && sy.idx % 5 === 0) f *= 2;
    if (V0.ding && sy.idx % 5 === 0) this.game.audio.sfx({ wave: 'sine', freq: 'C6', dur: .3, vol: .06 });
    let dest = out;
    if (V0.band) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 1200; b.Q.value = .6; b.connect(out); dest = b; }
    if (V0.lowpass) { const b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = V0.lowpass; b.connect(dest); dest = b; }
    if (V0.echo) { const dl = c.createDelay(); dl.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; dl.connect(fb); fb.connect(dl); dl.connect(dest); const mix = c.createGain(); mix.connect(dest); mix.connect(dl); dest = mix; }
    if (sy.cons) { const sib = 'szfxch'.includes(sy.cons); this.noise(c, dest, t, .012 + (sib ? .02 : 0), sib ? 4000 : 1500, .12 * (V0.vol || 1)); }
    if (V0.crackle && Math.random() < .3) this.noise(c, dest, t, .01, 6000, .05);
    const o = c.createOscillator(); o.type = V0.wave || 'square';
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (V0.glide ? 1.08 : .97), t + dur);
    if (V0.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = V0.vib; lg.gain.value = f * .03; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .02); }
    const F = FORMANTS[sy.v] || FORMANTS.a, f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = 4; f2.Q.value = 5;
    const g = c.createGain(), vol = (V0.vol || 1) * .35 * (excl ? 1.25 : 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
    if (V0.breath) this.noise(c, g, t, dur, 1800, .06);
    if (V0.gravel) this.noise(c, g, t, dur, 300, .1, 'lowpass');
    g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }
}
S7.Voice = S7Voice;


/* ===== src/80-ui-kit.js ===== */
/* UI KIT: canvas widgets for a TV at ten feet (§6.4): big type, one idea per screen, a red focus bar, hover focuses,
 * a click activates, a drag moves a slider, the wheel scrolls; the same on pad, keys and mouse. Prompts are glyph chips
 * that follow the device used last. Everything draws in game pixels inside r.overlay. */
const INK = '#08070a', PAPER = '#f4f1ea', RED = '#d81e2a', MUTED = '#8a8590', GOLD = '#e0b040';
S7.COL = { INK, PAPER, RED, MUTED, GOLD };
const UI = S7.UIK = {
  /** text with the house outline; returns { w, h } */
  text(g, s, x, y, color = PAPER, o = {}) { return E.font.text(g, String(s), Math.round(x), Math.round(y), color, Object.assign({ outline: INK }, o)); },
  width(s, scale = 1) { return E.font.width(String(s), { scale }); },
  big(g, s, x, y, scale = 2, color = PAPER, align = 'center') { return E.font.text(g, String(s), Math.round(x), Math.round(y), color, { outline: INK, scale, align }); },
  title(g, s, x, y, scale = 4, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale, colors: ['#ffffff', '#f4f1ea', '#d8d4cc'], outline: INK, depth: 2, depthColor: '#2a0a0e', align: 'center' }, o)); },
  rect(g, x, y, w, h, c) { E.px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); },
  /** a see-through dark panel */
  panel(g, x, y, w, h, a = .82, c = '#0b0a0c') { g.save(); g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.restore(); },
  veil(g, r, a = .6, c = '#05030a') { g.save(); g.globalAlpha = a; g.fillStyle = c; g.fillRect(0, 0, r.W, r.H); g.restore(); },
  /** the safe area (5% inside every edge: TV overscan) */
  safe(r) { return { x0: Math.round(r.W * .05), y0: Math.round(r.H * .05), x1: Math.round(r.W * .95), y1: Math.round(r.H * .95) }; },
  /** a glyph chip for an action on the device used last: the button's symbol in a rounded box; returns its width */
  chip(g, act, x, y, scale = 1, o = {}) {
    const lab = o.label || S7.label(act);
    const w = Math.max(9, E.font.width(lab, { scale }) + 6 * scale), h = 9 * scale + 2;
    const yy = Math.round(y - 1), xx = Math.round(x);
    E.ui.box(g, xx, yy, w, h, { bg: o.bg || '#f4f1ea', border: INK, gradient: false });
    const glyphCol = { '✕': '#3a6ad8', '○': '#d83a3a', '□': '#c84ac8', '△': '#2aa080' }[lab] || INK;
    E.font.text(g, lab, xx + Math.round((w - E.font.width(lab, { scale })) / 2), yy + 1 + scale, glyphCol, { outline: false, scale });
    return w;
  },
  /** a prompt: chips and a verb in capitals: prompt(g, [['interact', 'CHECK']], x, y, { align: 'center' }) */
  prompt(g, parts, x, y, o = {}) {
    const sc = o.scale || 1, gap = 6 * sc;
    let w = 0; for (const [act, verb] of parts) w += Math.max(9, E.font.width(o.labels && o.labels[act] || S7.label(act), { scale: sc }) + 6 * sc) + 3 + E.font.width(verb, { scale: sc }) + gap;
    w -= gap;
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const [act, verb] of parts) { cx += this.chip(g, act, cx, y, sc, { label: o.labels && o.labels[act] }) + 3; this.text(g, verb, cx, y + sc, o.color || PAPER, { scale: sc }); cx += E.font.width(verb, { scale: sc }) + gap; }
    return w;
  },
  /** a pointer inside a box? */
  hit(p, x, y, w, h) { return !!p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h; },
  /** a portrait in a frame */
  portrait(g, rig, x, y, size, o = {}) { if (!rig) return; rig.drawPortrait(g, Math.round(x), Math.round(y), size, Object.assign({ bg: '#1a1418', frame: true, zoom: 2.6 }, o)); },
  /** five-segment bars (the Wax Bench) */
  segBar(g, x, y, n, of, w = 14, h = 6, on = RED) { for (let i = 0; i < of; i++) { this.rect(g, x + i * (w + 2), y, w, h, i < n ? on : '#3a3438'); this.rect(g, x + i * (w + 2), y + h - 1, w, 1, i < n ? '#8a0e18' : '#2a2428'); } },
  diamond(g, x, y, r, c, fill) { const pts = [[x, y - r], [x + r, y], [x, y + r], [x - r, y]]; if (fill) E.px.poly(g, pts, c); else for (let i = 0; i < 4; i++) E.px.line(g, pts[i][0], pts[i][1], pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], c); },
  /** read menu input this step: { up, down, left, right, confirm, back, pageL, pageR, ptr, click, wheel, moved } */
  nav(game) {
    const I = game.input;
    const nv = { up: I.repeat('up', .3, .09), down: I.repeat('down', .3, .09), left: I.repeat('left', .3, .07), right: I.repeat('right', .3, .07), confirm: I.pressed('confirm') || I.pressed('start'), back: I.pressed('cancel'),
      pageL: I.pressed('pageL'), pageR: I.pressed('pageR'), ptr: I.pointer ? I.pointer() : null, click: I.clicked ? I.clicked() : null, wheel: S7.Input.takeWheel(), held: I.down('confirm') };
    const p = nv.ptr, last = this._lastPtr;
    nv.moved = !!p && (!last || Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) > .5);
    this._lastPtr = p ? p.slice() : null;
    nv.mouseDown = I.held && (I.held.has ? I.held.has('Mouse0') : false);
    return nv;
  }
};

/** a vertical list of items, focus by keys/pad, hover by mouse, click or confirm to pick */
class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.boxes = []; this.t = 0; this.skip(1); }
  skip(d) { const n = this.items.length; for (let k = 0; k < n && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + n) % n; }
  update(nv, game) {
    const n = this.items.length; if (!n) return null;
    this.t += 1 / 60;
    if (nv.up) { this.i = (this.i + n - 1) % n; this.skip(-1); S7.sfx('tick'); }
    if (nv.down) { this.i = (this.i + 1) % n; this.skip(1); S7.sfx('tick'); }
    for (let k = 0; k < this.boxes.length; k++) { const b = this.boxes[k]; if (!b) continue; if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3]) && !this.items[k].disabled && this.i !== k) { this.i = k; S7.sfx('tick'); } if (UI.hit(nv.click, b[0], b[1], b[2], b[3]) && !this.items[k].disabled) { this.i = k; return this.pick(); } }
    const it = this.items[this.i];
    if (it && it.adjust && (nv.left || nv.right)) { it.adjust(nv.left ? -1 : 1); S7.sfx('tick'); }
    if (nv.confirm) return this.pick();
    if (nv.back && this.o.onBack) { S7.sfx('back'); this.o.onBack(); return 'back'; }
    return null;
  }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) return null; S7.sfx('confirm'); if (it.on) it.on(); return it; }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, lh = (o.lh || 13) * sc / 2 + (o.gap || 4), align = o.align || 'center';
    this.boxes = [];
    this.items.forEach((it, k) => {
      const yy = y + k * lh, f = k === this.i, label = typeof it.label === 'function' ? it.label() : it.label;
      const w = UI.width(label, sc) * (f ? 1.1 : 1), x0 = align === 'center' ? x - w / 2 : x;
      if (f) { UI.rect(g, align === 'center' ? x - w / 2 - 10 : x - 10, yy + 1, 5, 7 * sc - 1, RED); }
      UI.text(g, label, align === 'center' ? x : x, yy, it.disabled ? '#5a5560' : f ? '#ffffff' : (o.color || '#d0ccd4'), { scale: sc, align });
      this.boxes[k] = [x0 - 14, yy - 2, w + 28, 7 * sc + 4];
      if (f && it.hint) UI.text(g, it.hint, x, yy + 7 * sc + 3, MUTED, { align });
    });
  }
}
S7.ListMenu = ListMenu;

/** a horizontal slider row: label, bar, value; drag with the mouse */
S7.slider = (g, nv, x, y, w, v, min, max, focused) => {
  UI.rect(g, x, y + 3, w, 3, '#3a3438');
  const k = (v - min) / (max - min); UI.rect(g, x, y + 3, Math.round(w * k), 3, focused ? RED : '#8a8590');
  UI.rect(g, x + Math.round(w * k) - 2, y, 4, 9, focused ? '#ffffff' : '#c8c4cc');
  if (nv && nv.mouseDown && nv.ptr && nv.ptr[1] >= y - 4 && nv.ptr[1] <= y + 12 && nv.ptr[0] >= x - 4 && nv.ptr[0] <= x + w + 4) return min + clamp((nv.ptr[0] - x) / w, 0, 1) * (max - min);
  return null;
};

/** a canvas modal: freezes the sim while open; subclasses implement update(nv) → 'close' and draw(g, r) */
class Modal {
  constructor(o = {}) { this.o = o; this.t = 0; }
  update() { return null; }
  draw() {}
}
S7.Modal = Modal;
S7.sfx = (name) => { if (S7.audio && S7.audio.ui) S7.audio.ui(name); };


/* ===== src/81-hud.js ===== */
/* HUD (§7.19): minimal, like Killer7, inside the 5% safe margin. Top left the persona, HP and the Red vial; top right
 * Rime (and the Edelweiss slots in Target 01); bottom centre the prompts. In aim mode: the reticle, ammo pips, the scan
 * ring, warm-spot diamonds, laugh ripples, damage chevrons, the scope. Splashes, toasts, tutorials, talks, choices,
 * title cards and the letterbox. The mouse picks markers through worldPick (an intent, never a sim change). */
class Hud {
  constructor(game, sim) {
    this.game = game; this.sim = sim; this.ripples = []; this.chevrons = []; this.markers = []; this.ringBoxes = []; this.choiceBoxes = []; this.redFlash = 0; this.hpShow = {}; this.t = 0; this.vignette = 0; this.talkSel = 0;
    S7.bus.on('laugh', d => { if (this.ripples.length > 24) this.ripples.shift(); this.ripples.push({ at: d.at, loud: d.loud, t: 0 }); });
    S7.bus.on('hurt', d => { this.chevrons.push({ from: d.from, t: 0 }); this.vignette = .5; });
    S7.bus.on('noRed', () => { this.redFlash = 1; });
  }
  /** project a world point to game pixels through the presenter's (or the sim's) camera */
  proj(x, y, z) {
    const p = S7.project(this.sim.cam.pose, x, y, z, this.game.W / this.game.H);
    return p ? [p[0] * this.game.W, p[1] * this.game.H, p[2]] : null;
  }
  /** the mouse in the world: hovering a marker focuses it, a click takes it (filled into this step's intents) */
  worldPick(I) {
    const p = I.pointer, sim = this.sim; if (!p) return;
    if (sim.ring) { this.ringBoxes.forEach((b, i) => { if (b && Math.hypot(p[0] - b[0], p[1] - b[1]) < b[2]) I.ringPick = i; }); return; }
    if (sim.prompt && sim.prompt.choice) { this.choiceBoxes.forEach((b, i) => { if (b && UI.hit(p, b[0], b[1], b[2], b[3])) { I.choicePick = i; if (I.clicked) I.choiceClick = i; } }); return; }
    if (sim.aim.on) return;
    for (const m of this.markers) {
      if (Math.hypot(p[0] - m.x, p[1] - m.y) < 13) {
        if (m.kind === 'branch') { I.branchPick = m.i; if (!I.clicked) I.clicked = null; }
        else if (m.kind === 'spot' && I.clicked && Math.hypot(I.clicked[0] - m.x, I.clicked[1] - m.y) < 13) I.spotPick = m.id;
      }
    }
    if (I.clicked && I.branchPick === null) I.clicked = null;
  }
  update(dt) {
    this.t += dt;
    for (const r of this.ripples) r.t += dt; this.ripples = this.ripples.filter(r => r.t < 1.4);
    for (const c of this.chevrons) c.t += dt; this.chevrons = this.chevrons.filter(c => c.t < 1.2);
    this.redFlash = Math.max(0, this.redFlash - dt * 2); this.vignette = Math.max(0, this.vignette - dt * 1.6);
  }
  draw(r) {
    const sim = this.sim; if (!sim.st) return;
    r.overlay(g => {
      const S = UI.safe(r), hide = CHEAT.hideHud || sim.cutscene || sim.mode === 'interview';
      if (sim.letterbox) { const h = Math.round(r.H * .12); UI.rect(g, 0, 0, r.W, h, '#000'); UI.rect(g, 0, r.H - h, r.W, h, '#000'); }
      if (this.vignette > 0) { g.save(); g.globalAlpha = this.vignette * .5; g.fillStyle = '#ff2030'; g.fillRect(0, 0, r.W, 4); g.fillRect(0, r.H - 4, r.W, 4); g.fillRect(0, 0, 4, r.H); g.fillRect(r.W - 4, 0, 4, r.H); g.restore(); }
      this.markers = [];
      if (!hide && sim.areaDef.kind !== 'room7') this.drawStatus(g, r, S);
      if (!hide && sim.areaDef.kind === 'room7') this.drawRoom7(g, r, S);
      if (!hide && sim.aim.k > .5) this.drawAim(g, r, S);
      if (!hide && !sim.aim.on && !sim.talk && !sim.ring) { this.drawJunction(g, r, S); this.drawNear(g, r, S); this.drawSkiFork(g, r, S); this.drawStatue(g, r, S); }
      if (sim.ring) this.drawRing(g, r, S);
      this.drawSplashes(g, r, S);
      if (!sim.talk && !sim.card) this.drawToasts(g, r, S);
      if (sim.tutorial && !hide && !sim.talk) this.drawTutorial(g, r, S);
      if (sim.boss && !hide) this.drawBoss(g, r, S);
      if (S7.drawAreaHud) S7.drawAreaHud(g, r, S, sim, this);
      if (sim.talk) this.drawTalk(g, r, S);
      if (sim.prompt && sim.prompt.choice) this.drawChoice(g, r, S);
      if (sim.card) this.drawCard(g, r);
      if (CHEAT.showFps) { const now = typeof performance !== 'undefined' ? performance.now() : 0; this.fpsN = (this.fpsN || 0) + 1; if (now - (this.fpsAt || 0) > 1000) { this.fps = this.fpsN * 1000 / Math.max(1, now - (this.fpsAt || now - 1000)); this.fpsN = 0; this.fpsAt = now; } UI.text(g, 'FPS ' + Math.round(this.fps || 0) + '  HASH ' + sim.hash(), S.x0, r.H - 12, '#8affc8'); }
      if (CHEAT.freeCam) UI.text(g, 'FREE CAMERA · ' + S7.label('up') + S7.label('left') + S7.label('down') + S7.label('right') + ' MOVE · Q/E DOWN/UP', r.W / 2, S.y1 - 10, '#8affc8', { align: 'center' });
    });
  }
  /* ---- the persona, HP, Red, Rime ---- */
  drawStatus(g, r, S) {
    const sim = this.sim, st = sim.st, P = sim.personaDef(), ps = sim.pstate(), max = sim.maxHp();
    UI.portrait(g, S7.personaRig(st.persona), S.x0, S.y0, 30, { bg: '#1a1014' });
    const nx = S.x0 + 34;
    UI.text(g, P.short, nx, S.y0 - 1, PAPER, { scale: 2 });
    UI.text(g, P.epithet, nx, S.y0 + 14, MUTED);
    // HP: white, recent damage in red
    const key = st.persona; this.hpShow[key] = this.hpShow[key] === undefined ? ps.hp : E.approach(this.hpShow[key], ps.hp, 40 / 60);
    const bw = 70, y = S.y0 + 24;
    UI.rect(g, nx - 1, y - 1, bw + 2, 7, INK); UI.rect(g, nx, y, bw * clamp(this.hpShow[key] / max, 0, 1), 5, RED); UI.rect(g, nx, y, bw * clamp(ps.hp / max, 0, 1), 5, ps.hp < max * .3 && Math.floor(this.t * 4) % 2 ? '#ffb0b0' : '#f4f1ea');
    UI.text(g, Math.ceil(ps.hp) + '', nx + bw + 4, y - 1, MUTED);
    // the Red thermos: a vertical vial right of the name block
    const vx = Math.max(nx + UI.width(P.short, 2), nx + bw + 22) + 8, vy = S.y0, vh = 28, k = clamp(st.red / 999, 0, 1), fl = this.redFlash > 0 && Math.floor(this.t * 12) % 2;
    UI.rect(g, vx - 1, vy - 1, 8, vh + 2, fl ? '#ffffff' : INK); UI.rect(g, vx, vy + vh * (1 - k), 6, vh * k, '#c8102a'); UI.rect(g, vx + 1, vy + vh * (1 - k), 1, vh * k, '#ff5060');
    UI.text(g, 'RED', vx + 10, vy + 4, '#ff6070'); UI.text(g, String(Math.floor(st.red)), vx + 10, vy + 14, '#ffb0b8', { scale: 1 });
    // Rime, top right; Target 01's Edelweiss slots
    const rx = S.x1;
    UI.text(g, 'RIME ' + st.rime, rx, S.y0 + 2, '#9af0ff', { scale: 2, align: 'right' });
    if (st.target >= 1) { const n = st.items.edelweiss || 0; for (let i = 0; i < 3; i++) { const x0 = rx - 46 + i * 16, y0 = S.y0 + 22; S7.drawFlower(g, x0 + 6, y0 + 6, i < n); } }
    // the area's name, briefly, on entry
    if (sim.areaTitleT === undefined || this._area !== sim.st.area) { this._area = sim.st.area; this.areaT = 0; }
    this.areaT = (this.areaT || 0) + 1 / 60;
    if (this.areaT < 3.2 && !sim.cutscene && !sim.talk && !sim.ring && sim.aim.k < .5) { const A = sim.areaDef, a = this.areaT < 2.6 ? 1 : 1 - (this.areaT - 2.6) / .6; g.save(); g.globalAlpha = a; UI.title(g, A.title, r.W / 2, r.H * .36, 3); if (A.sub) UI.text(g, A.sub, r.W / 2, r.H * .36 + 30, RED, { align: 'center', scale: 2 }); g.restore(); }
    // other personas' state (frozen) as small marks under the portrait
    let fx = S.x0; for (const id of PERSONA_ORDER) { const rr = st.roster[id]; if (!rr.unlocked) continue; UI.rect(g, fx, S.y0 + 34, 4, 4, rr.frozen ? '#8ae0ff' : id === st.persona ? RED : '#5a5560'); fx += 6; }
  }
  drawRoom7(g, r, S) {
    const sim = this.sim, st = sim.st;
    UI.text(g, 'ROOM 7', S.x0, S.y0, PAPER, { scale: 2 });
    UI.text(g, 'RED ' + Math.floor(st.red) + '   RIME ' + st.rime, S.x0, S.y0 + 16, MUTED);
    UI.portrait(g, S7.personaRig(st.persona), S.x1 - 30, S.y0, 30);
  }
  /* ---- junction markers: an arrow per branch, the highlighted one large and red ---- */
  drawJunction(g, r, S) {
    const sim = this.sim, J = sim.junction; if (!J || sim.W.edge || !J.exits.length) return;
    const n = sim.rails.nodes[J.node];
    J.exits.forEach((x, i) => {
      const yaw = sim.rails.branchYaw(x, x.dir), d = 1.6 * M;
      const p = this.proj(n.x + Math.cos(yaw) * d, n.y + Math.sin(yaw) * d, n.z + 10); if (!p) return;
      const f = i === J.i, e = x.edge, end = sim.rails.nodes[sim.rails.endNode(e, x.dir)];
      const sa = sim.branchScreenAngle(x, sim.cam.pose, this.game.W / this.game.H), rr = f ? 9 : 6;
      const tip = [p[0] + Math.cos(sa) * rr, p[1] + Math.sin(sa) * rr], l = [p[0] + Math.cos(sa + 2.4) * rr, p[1] + Math.sin(sa + 2.4) * rr], rt = [p[0] + Math.cos(sa - 2.4) * rr, p[1] + Math.sin(sa - 2.4) * rr];
      E.px.poly(g, [tip, l, p, rt], INK); E.px.poly(g, [[tip[0], tip[1] - 1], [l[0], l[1] - 1], [p[0], p[1] - 1], [rt[0], rt[1] - 1]], f ? RED : PAPER);
      const gate = e.gate && !sim.gateOpen(e.gate) ? sim.areaDef.gates[e.gate] : null;
      let label = e.label || (end && end.label) || '';
      if (e.kind === 'lift') label = 'LIFT'; if (e.kind === 'jump') label = 'JUMP';
      if (f && label) UI.text(g, label, p[0], p[1] + 12, f ? '#ffffff' : MUTED, { align: 'center' });
      if (gate) { UI.text(g, gate.label || 'SHUT', p[0], p[1] - 22, '#ffb0a0', { align: 'center' }); const who = gate.solver || gate.who; if (who && S7.PERSONAS[who]) UI.portrait(g, S7.personaRig(who), p[0] - 7, p[1] - 38, 14, { frame: false }); }
      this.markers.push({ kind: 'branch', i, x: p[0], y: p[1] });
    });
    const go = S7.label('move');
    if (J.exits.length > 1) UI.prompt(g, [['move', 'GO'], ['left', 'CHOOSE']], r.W / 2, S.y1 - 10, { align: 'center', labels: { left: this.game.input.lastDevice === 'gamepad' ? 'L' : '◆' } });
    else UI.prompt(g, [['move', 'GO'], ['turn', 'TURN']], r.W / 2, S.y1 - 10, { align: 'center' });
    void go;
  }
  drawSkiFork(g, r, S) {
    const sim = this.sim, F = sim.skiForkAt; if (!F) return;
    const n = sim.rails.nodes[F.node];
    F.exits.forEach((x, i) => {
      const yaw = sim.rails.branchYaw(x, x.dir), p = this.proj(n.x + Math.cos(yaw) * 40, n.y + Math.sin(yaw) * 40, n.z + 20); if (!p) return;
      const f = i === F.i, lab = x.edge.label || (x.edge.kind === 'jump' ? 'JUMP' : 'RUN');
      UI.diamond(g, p[0], p[1], f ? 8 : 5, f ? RED : PAPER, true);
      UI.text(g, lab, p[0], p[1] + 10, f ? '#ffffff' : MUTED, { align: 'center', scale: f ? 2 : 1 });
      this.markers.push({ kind: 'branch', i, x: p[0], y: p[1] });
    });
  }
  /* ---- what △ would do here: a diamond over it and the prompt ---- */
  drawNear(g, r, S) {
    const sim = this.sim, N = sim.near;
    for (const o of sim.nearList || []) { if (N && o === N.spot) continue; const q = this.proj(o.x, o.y, o.z + 30); if (q) { UI.diamond(g, q[0], q[1], 4, MUTED, true); this.markers.push({ kind: 'spot', id: o.id, x: q[0], y: q[1] }); } }
    if (N) {
      const s = N.spot, p = this.proj(s.x, s.y, s.z + 34);
      if (p) { UI.diamond(g, p[0], p[1] - Math.sin(this.t * 4) * 2, 5, INK, true); UI.diamond(g, p[0], p[1] - Math.sin(this.t * 4) * 2, 4, '#ffe0a0', true); this.markers.push({ kind: 'spot', id: s.id, x: p[0], y: p[1] }); }
      UI.prompt(g, [['interact', N.verb]], r.W / 2, S.y1 - 26, { align: 'center', scale: 2 });
      if (N.label) UI.text(g, N.label, r.W / 2, S.y1 - 40, MUTED, { align: 'center' });
      if (sim.holdSpot) { const k = clamp(sim.holdSpot.t / 1.5, 0, 1); UI.rect(g, r.W / 2 - 40, S.y1 - 4, 80, 4, '#3a3438'); UI.rect(g, r.W / 2 - 40, S.y1 - 4, 80 * k, 4, '#8ae0ff'); }
    }
    // heal prompt when hurt
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .5 && sim.st.red > 0 && !N && !sim.junction) UI.prompt(g, [['heal', 'DRINK RED']], S.x0, S.y1 - 10, {});
  }
  drawStatue(g, r, S) {
    const sim = this.sim, st = sim.st; if (st.persona !== 'ansel') return;
    for (const id of PERSONA_ORDER) {
      const s = st.roster[id]; if (!s.frozen || !s.statue || s.statue.area !== st.area) continue;
      const h = sim.hero, d = Math.hypot(s.statue.at[0] - h.x, s.statue.at[1] - h.y) / M, p = this.proj(s.statue.at[0], s.statue.at[1], s.statue.at[2] + 40);
      if (p && p[0] > 0 && p[0] < r.W) { UI.diamond(g, p[0], p[1], 6, '#8ae0ff', true); UI.text(g, S7.PERSONAS[id].short + ' ' + Math.round(d) + ' M', p[0], p[1] + 9, '#c8f4ff', { align: 'center' }); }
      else UI.text(g, '◆ ' + S7.PERSONAS[id].short + ' — ' + Math.round(d) + ' M', r.W / 2, S.y0 + 50, '#8ae0ff', { align: 'center', scale: 2 });
    }
  }
  /* ---- the Featherbed ring ---- */
  drawRing(g, r, S) {
    const sim = this.sim, R = sim.ring, cx = r.W / 2, cy = r.H / 2 + 6, rad = Math.min(78, r.H * .32);
    UI.veil(g, r, .45, '#0a0610');
    UI.big(g, 'THE FEATHERBED', cx, S.y0, 2);
    this.ringBoxes = [];
    PERSONA_ORDER.forEach((id, i) => {
      const a = -Math.PI / 2 + i * TAU / 7, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad, f = i === R.i, why = sim.whyNot(id), sz = f ? 36 : 26;
      const P = S7.PERSONAS[id];
      UI.portrait(g, S7.personaRig(id), x - sz / 2, y - sz / 2, sz, { bg: id === sim.st.persona ? '#4a1018' : '#1a1418', tint: why ? '#606068' : undefined });
      if (f) { UI.rect(g, x - sz / 2 - 2, y + sz / 2 + 1, sz + 4, 2, RED); }
      UI.text(g, String(P.n), x - sz / 2 - 2, y - sz / 2 - 2, f ? RED : MUTED);
      if (why) UI.text(g, why, x, y + sz / 2 + 4, '#8ae0ff', { align: 'center' });
      this.ringBoxes[i] = [x, y, sz / 2 + 4];
    });
    const P = S7.PERSONAS[PERSONA_ORDER[R.i]];
    UI.text(g, P.short, cx, cy - 12, '#ffffff', { scale: 2, align: 'center' });
    UI.text(g, P.epithet, cx, cy + 4, RED, { align: 'center' });
    UI.text(g, S7.WEAPONS[P.weapon].name + ' · ' + P.skill.name, cx, cy + 14, MUTED, { align: 'center' });
    UI.prompt(g, [['ring', 'RELEASE TO SWITCH']], cx, S.y1 - 8, { align: 'center' });
  }
  /* ---- aim mode ---- */
  drawAim(g, r, S) {
    const sim = this.sim, a = sim.aim, W = sim.weaponDef(), m = sim.mag();
    const ret = a.reticle ? [a.reticle[0] * r.W, a.reticle[1] * r.H] : [r.W / 2, r.H / 2];
    const [cx, cy] = [Math.round(ret[0]), Math.round(ret[1])];
    if (a.scope) {   // the scope: a ring vignette and crosshair
      g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, r.W, r.H); g.arc(cx, cy, r.H * .42, 0, TAU, true); g.fill(); g.restore();
      UI.rect(g, cx - r.H * .42, cy, r.H * .84, 1, INK); UI.rect(g, cx, cy - r.H * .42, 1, r.H * .84, INK); UI.rect(g, cx - 1, cy - 1, 3, 3, RED);
    }
    // warm-spot diamonds on revealed Whiteouts within 30 m
    const eye = sim.eye();
    for (const e of sim.enemies) {
      if (!e.alive || !sim.isRevealed(e) || e.warmOpen === false) continue;
      const wp = sim.warmPos(e); if (V.dist(eye, wp) > 30 * M) continue;
      const p = this.proj(wp[0], wp[1], wp[2]); if (!p) continue;
      const pul = 4 + Math.sin(this.t * 10 + e.id) * 1.2; UI.diamond(g, p[0], p[1], pul + 1, INK); UI.diamond(g, p[0], p[1], pul, '#ffb040');
    }
    if (sim.boss) for (const w of sim.bossWarmSpots()) { if (!w.open) continue; const p = this.proj(w.p[0], w.p[1], w.p[2]); if (p) { UI.diamond(g, p[0], p[1], 7, INK); UI.diamond(g, p[0], p[1], 6, '#ffb040'); } }
    for (const s of sim.spots) if (s.target && !sim.spotUsed(s)) { const p = this.proj(s.x, s.y, s.z); if (p && p[2] < 140 * M) { UI.diamond(g, p[0], p[1], 5, '#a0e0ff'); if (s.far) UI.text(g, 'FAR', p[0], p[1] + 7, '#a0e0ff', { align: 'center' }); } }
    // the reticle, per persona
    const col = PAPER, pid = sim.st.persona;
    if (!a.scope) {
      if (pid === 'rurik' || pid === 'kasimir') { for (let k = 0; k < 12; k++) { const an = k / 12 * TAU, rr = pid === 'rurik' ? 12 : 16; E.px.dot(g, cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, col); } }
      else if (pid === 'brigid') { UI.rect(g, cx - 6, cy, 13, 1, col); UI.rect(g, cx, cy, 1, 8, col); UI.rect(g, cx - 3, cy + 4, 7, 1, col); UI.rect(g, cx - 2, cy + 8, 5, 1, col); }
      else { const gp = pid === 'dagny' ? 5 : 3; UI.rect(g, cx - gp - 5, cy, 5, 1, col); UI.rect(g, cx + gp + 1, cy, 5, 1, col); UI.rect(g, cx, cy - gp - 5, 1, 5, col); UI.rect(g, cx, cy + gp + 1, 1, 5, col); }
      UI.rect(g, cx, cy, 1, 1, RED);
    }
    // the scan cooldown ring round the reticle
    if (sim.scanCd > 0) { const k = 1 - sim.scanCd / 1.2, n = 24; for (let i = 0; i < n * k; i++) { const an = -Math.PI / 2 + i / n * TAU; E.px.dot(g, cx + Math.cos(an) * 20, cy + Math.sin(an) * 20, '#ff6070'); } }
    // ammo pips (or the Alphorn's heat)
    const n = W.mag, pw = n > 12 ? 2 : 4, tot = n * (pw + 1); for (let i = 0; i < n; i++) UI.rect(g, cx - tot / 2 + i * (pw + 1), cy + 24, pw, 4, i < m.n ? (W.heat ? '#ffb040' : PAPER) : '#3a3438');
    if (m.reload > 0) { const k = W.perShell ? m.n / W.mag : 1 - m.reload / (W.reload * (1 - .08 * sim.stats().speed)); UI.rect(g, cx - 20, cy + 31, 40, 2, '#3a3438'); UI.rect(g, cx - 20, cy + 31, 40 * clamp(k, 0, 1), 2, '#ffe0a0'); UI.text(g, W.heat ? 'OVERHEAT' : 'RELOADING', cx, cy + 35, MUTED, { align: 'center' }); }
    // laugh ripples: red arcs at the screen edge, toward each laugh, as thick as it is loud (the four loudest)
    if (this.game.settings.laughCues !== false) {
      const top = this.ripples.slice().sort((a2, b) => b.loud - a2.loud).slice(0, 4), pose = sim.cam.pose;
      for (const rp of top) {
        const ang = Math.atan2(rp.at[1] - pose.y, rp.at[0] - pose.x) - pose.yaw, k = 1 - rp.t / 1.4, th = Math.max(1, Math.round(rp.loud * 4 * k));
        const sx = Math.sin(ang), sy = -Math.cos(ang), ex = r.W / 2 + sx * (r.W / 2 - 10), ey = r.H / 2 + sy * (r.H / 2 - 10);
        for (let q = -3; q <= 3; q++) { const an2 = ang + q * .06, x2 = r.W / 2 + Math.sin(an2) * (r.W / 2 - 10), y2 = r.H / 2 - Math.cos(an2) * (r.H / 2 - 10); UI.rect(g, x2 - th / 2, y2 - th / 2, th, th, '#ff3040'); }
        void ex; void ey;
      }
    }
    // damage chevrons
    for (const c of this.chevrons) if (c.from) { const pose = sim.cam.pose, ang = Math.atan2(c.from[1] - pose.y, c.from[0] - pose.x) - pose.yaw, x2 = cx + Math.sin(ang) * 46, y2 = cy - Math.cos(ang) * 46; UI.diamond(g, x2, y2, 5, '#ff2030', true); }
    UI.prompt(g, [['fire', 'FIRE'], ['scan', 'SCAN'], ['skill', S7.PERSONAS[pid].skill.name.toUpperCase()]], r.W / 2, S.y1 - 8, { align: 'center' });
  }
  /* ---- splashes: THAW. (big), TOO FAR. (at the hit), RED +n ---- */
  drawSplashes(g, r, S) {
    for (const s of this.sim.splashes) {
      const u = s.t / s.life;
      if (s.small && s.at) { const p = this.proj(s.at[0], s.at[1], s.at[2]); if (p) UI.text(g, s.text, p[0], p[1] - 10 - u * 8, '#ffffff', { align: 'center', scale: 1 }); continue; }
      const sc = s.crit ? (u < .1 ? 5 : 4) : 3, y = r.H * .28 - u * 6;
      g.save(); g.globalAlpha = u < .8 ? 1 : 1 - (u - .8) / .2;
      UI.title(g, s.text, r.W / 2, y, sc, { colors: ['#ffffff', '#ffffff', '#e8e4dc'] });
      UI.rect(g, r.W / 2 - 40, y + sc * 9, 80, 3, RED);
      g.restore();
    }
  }
  drawToasts(g, r, S) {
    let y = S.y0 + (this.sim.tutorial ? 74 : 44);
    for (const t of this.sim.toasts) {
      const a = t.t < .15 ? t.t / .15 : t.t > t.life - .4 ? (t.life - t.t) / .4 : 1;
      g.save(); g.globalAlpha = clamp(a, 0, 1);
      if (t.line && t.who) { const P = S7.PERSONAS[t.who] || S7.PEOPLE[t.who]; const name = P ? (P.short || P.name || '').toUpperCase() : ''; UI.text(g, name, r.W / 2, y, RED, { align: 'center' }); UI.text(g, t.text, r.W / 2, y + 9, PAPER, { align: 'center', scale: 2, wrap: r.W * .8 }); y += 30; }
      else { UI.text(g, t.text, r.W / 2, y, t.big ? '#ffffff' : PAPER, { align: 'center', scale: t.big ? 2 : 1 }); y += t.big ? 18 : 11; }
      g.restore();
    }
  }
  drawTutorial(g, r, S) {
    const T0 = S7.TUTORIALS[this.sim.tutorial.id]; if (!T0) return;
    const y = S.y0 + 44, parts = T0.parts.map(p => [p[0], p[1]]);
    UI.panel(g, r.W / 2 - 110, y - 4, 220, T0.text ? 30 : 18, .7);
    UI.prompt(g, parts, r.W / 2, y, { align: 'center', scale: 1 });
    if (T0.text) UI.text(g, T0.text, r.W / 2, y + 13, MUTED, { align: 'center' });
  }
  drawBoss(g, r, S) {
    const b = this.sim.boss; if (!b || !b.hud) return;
    const w = r.W * .5, x = r.W / 2 - w / 2, y = S.y1 - 34;
    UI.text(g, b.hud.name, r.W / 2, y - 11, '#ffffff', { align: 'center', scale: 1 });
    UI.rect(g, x - 1, y - 1, w + 2, 6, INK); UI.rect(g, x, y, w * clamp(b.hud.k, 0, 1), 4, RED);
    if (b.hud.sub) UI.text(g, b.hud.sub, r.W / 2, y + 7, MUTED, { align: 'center' });
  }
  /* ---- the talk box: the name in red capitals, the text at scale 2 ---- */
  drawTalk(g, r, S) {
    const T0 = this.sim.talk, l = T0.lines[T0.i]; if (!l || l.card) return;
    const large = this.game.settings.textSize === 'large', sc = large ? 3 : 2, bw = Math.round(r.W * (large ? .92 : .8)), bx = Math.round((r.W - bw) / 2);
    const text = (l.text || '').slice(0, Math.floor(T0.shown));
    const lines = E.font.wrap ? E.font.wrap(l.text || '', bw - 16, { scale: sc }) : [l.text];
    const bh = 18 + (Array.isArray(lines) ? lines.length : 3) * (8 * sc + 2) + 6, by = S.y1 - bh;
    const P = S7.PEOPLE[l.who] || S7.PERSONAS[l.who], name = P ? (P.short || P.name).toUpperCase() : (l.who || '').toUpperCase();
    UI.panel(g, bx, by, bw, bh, .88);
    UI.rect(g, bx, by, bw, 2, RED);
    const rig = P && (S7.PERSONAS[l.who] ? S7.personaRig(l.who) : S7.peopleRig(l.who));
    if (rig) UI.portrait(g, rig, bx + 6, by - 30, 34, { bg: '#1a1014' });
    if (P && P.icon) S7.drawIcon(g, P.icon, bx + 8, by - 28, 30);
    UI.text(g, name, bx + (rig || (P && P.icon) ? 46 : 8), by - 11, RED, { scale: 2 });
    UI.text(g, text, bx + 8, by + 8, PAPER, { scale: sc, wrap: bw - 16 });
    if (T0.shown >= (l.text || '').length && Math.floor(this.t * 3) % 2) UI.diamond(g, bx + bw - 10, by + bh - 8, 3, RED, true);
    // a name card pops in big when the speaker changes
    if (T0.t < .45 && (T0.i === 0 || T0.lines[T0.i - 1].who !== l.who)) { const k = 1 - T0.t / .45; g.save(); g.globalAlpha = k; UI.title(g, name, r.W / 2, r.H * .3, 3); g.restore(); }
  }
  drawChoice(g, r, S) {
    const P = this.sim.prompt, w = 200, h = 22 + P.items.length * 16, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2;
    UI.panel(g, x, y, w, h, .92); UI.rect(g, x, y, w, 2, RED);
    UI.text(g, P.title, r.W / 2, y + 5, RED, { align: 'center' });
    this.choiceBoxes = [];
    P.items.forEach((it, i) => { const yy = y + 18 + i * 16, f = i === P.i; if (f) UI.rect(g, x + 8, yy + 1, 4, 12, RED); UI.text(g, it, r.W / 2, yy, f ? '#ffffff' : MUTED, { align: 'center', scale: 2 }); this.choiceBoxes[i] = [x, yy - 2, w, 16]; });
  }
  /* ---- title cards: black, the title huge, a red subtitle, a sting ---- */
  drawCard(g, r) {
    const C = this.sim.card;
    UI.rect(g, 0, 0, r.W, r.H, '#000');
    if (C.silhouette) { const rig = S7.PEOPLE[C.silhouette] ? S7.peopleRig(C.silhouette) : null; if (rig) UI.portrait(g, rig, r.W / 2 - 40, r.H * .52, 80, { bg: '#000', frame: false, tint: '#000000' }); }
    const words = C.title.length > 22 ? 3 : 4;
    const lines = E.font.wrap(C.title, r.W * .9, { scale: words }) || [C.title];
    (Array.isArray(lines) ? lines : [C.title]).forEach((ln, i) => UI.title(g, ln, r.W / 2, r.H * .3 + i * (words * 9 + 4), words));
    if (C.sub) UI.text(g, C.sub, r.W / 2, r.H * .3 + (Array.isArray(lines) ? lines.length : 1) * (words * 9 + 4) + 6, RED, { align: 'center', scale: 2 });
  }
}
S7.Hud = Hud;
/** a little Edelweiss for the HUD slots and the Delegate Gate */
S7.drawFlower = (g, x, y, on) => {
  const c = on ? '#f4f1ea' : '#3a3438', k = on ? '#f0c030' : '#2a2428';
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; E.px.disc(g, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2, c); }
  E.px.disc(g, x, y, 2, k);
};
/** small drawn icons (items, Murmel's face) */
S7.drawIcon = (g, kind, x, y, s) => {
  const c = x + s / 2, m = y + s / 2;
  if (kind === 'key') { E.px.disc(g, c - s * .2, m, s * .18, '#e0b040'); UI.rect(g, c - s * .05, m - 1, s * .4, 3, '#e0b040'); UI.rect(g, c + s * .25, m, 2, s * .15, '#e0b040'); E.px.disc(g, c - s * .2, m, s * .07, '#0b0a0c'); }
  else if (kind === 'flower') S7.drawFlower(g, c, m, true);
  else if (kind === 'ember') { E.px.disc(g, c, m, s * .3, '#c0c4cc'); E.px.disc(g, c, m, s * .2, '#ff5020'); E.px.disc(g, c - 1, m - 1, s * .08, '#ffe0a0'); }
  else if (kind === 'bell') { E.px.poly(g, [[c - s * .25, m + s * .2], [c + s * .25, m + s * .2], [c + s * .15, m - s * .2], [c - s * .15, m - s * .2]], '#d8b040'); E.px.disc(g, c, m + s * .25, s * .06, '#8a6020'); }
  else if (kind === 'pin') { E.px.disc(g, c, m, s * .28, '#d8202a'); UI.text(g, '7', c - 2, m - 3, '#ffffff'); }
  else if (kind === 'paper') { UI.rect(g, c - s * .25, m - s * .32, s * .5, s * .64, '#f0ead8'); for (let i = 0; i < 4; i++) UI.rect(g, c - s * .18, m - s * .2 + i * 4, s * .36, 1, '#8a8590'); }
  else if (kind === 'murmel') { E.px.disc(g, c, m, s * .4, '#f4f4f0'); E.px.disc(g, c - s * .32, m - s * .32, s * .12, '#f4f4f0'); E.px.disc(g, c + s * .32, m - s * .32, s * .12, '#f4f4f0'); E.px.dot(g, c - s * .14, m - s * .05, '#000'); E.px.dot(g, c + s * .14, m - s * .05, '#000'); E.px.disc(g, c, m + s * .1, s * .06, '#2a1a1a'); }
  else if (kind === 'phone') { UI.rect(g, c - s * .3, m - s * .1, s * .6, s * .3, '#1a1a1e'); E.px.disc(g, c, m - s * .15, s * .15, '#1a1a1e'); }
  else if (kind === 'sign') { UI.rect(g, c - s * .3, m - s * .2, s * .6, s * .35, '#c8b48a'); UI.rect(g, c - 1, m + s * .15, 2, s * .3, '#5a3a1a'); }
};


/* ===== src/82-screens.js ===== */
/* SCREENS: canvas modals (the sim freezes behind them): difficulty, the Wax Bench, the Wardrobe, the map, Items &
 * Dossier, Personas, the code lock, the window's postcard, an Exposure, About & Credits, the skip prompt. Big type,
 * at most seven focusable things, one idea per screen (§6.4). */
const WAX_COST = [3, 5, 8, 12, 16];
const STAT_INFO = { power: ['POWER', '+12% damage a level'], speed: ['SPEED', '+8% movement and reload a level'], critical: ['CRITICAL', '+10% warm-spot room; from level 3, +1 Rime a crit'], steady: ['STEADY', '-15% sway, +0.4 s reveal a level'] };

class DifficultyModal extends Modal {
  constructor(o) { super(o); const ids = Object.keys(DIFF); this.menu = new ListMenu(ids.map(id => ({ label: DIFF[id].label, hint: DIFF[id].line, on: () => { this.result = id; } })), { i: 1, onBack: () => { this.result = 'back'; } }); }
  update(nv) { this.menu.update(nv); return this.result ? 'close' : null; }
  draw(g, r) { UI.veil(g, r, .78); UI.big(g, 'HOW STEEP?', r.W / 2, r.H * .2, 3); this.menu.draw(g, r.W / 2, r.H * .4, { scale: 2, lh: 30, gap: 14 }); UI.prompt(g, [['confirm', 'CHOOSE'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center' }); }
}

/** the Wax Bench: one persona at a time, four big five-segment bars, the cost, your Rime */
class WaxModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.pi = Math.max(0, PERSONA_ORDER.indexOf(this.sim.st.persona)); this.si = 0; this.boxes = []; this.msg = ''; this.msgT = 0; }
  ids() { return PERSONA_ORDER.filter(id => this.sim.st.roster[id].unlocked || CHEAT.allPersonas); }
  update(nv) {
    const ids = this.ids(), keys = Object.keys(STAT_INFO);
    if (nv.left || nv.pageL) { this.pi = (this.pi + ids.length - 1) % ids.length; S7.sfx('tick'); }
    if (nv.right || nv.pageR) { this.pi = (this.pi + 1) % ids.length; S7.sfx('tick'); }
    if (nv.up) { this.si = (this.si + 3) % 4; S7.sfx('tick'); }
    if (nv.down) { this.si = (this.si + 1) % 4; S7.sfx('tick'); }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.si = i; if (UI.hit(nv.click, ...b)) { this.si = i; this.buy(ids, keys); } });
    if (this.arrows) { if (UI.hit(nv.click, ...this.arrows[0])) { this.pi = (this.pi + ids.length - 1) % ids.length; } if (UI.hit(nv.click, ...this.arrows[1])) this.pi = (this.pi + 1) % ids.length; }
    if (nv.confirm) this.buy(ids, keys);
    this.msgT -= 1 / 60;
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  buy(ids, keys) {
    const id = ids[this.pi % ids.length], st = this.sim.st, s = st.roster[id].stats, k = keys[this.si], lv = s[k];
    if (lv >= 5) { this.msg = 'WAXED AS FAR AS IT GOES.'; this.msgT = 2; S7.sfx('back'); return; }
    const cost = WAX_COST[lv];
    if (st.rime < cost && !CHEAT.infRed) { this.msg = 'NOT ENOUGH RIME.'; this.msgT = 2; S7.sfx('back'); return; }
    if (!CHEAT.infRed) st.rime -= cost;
    s[k] = lv + 1; this.msg = STAT_INFO[k][0] + ' ' + (lv + 1) + '. Wax them well. The mountain notices.'; this.msgT = 3;
    S7.bus.emit('sfx', { name: 'wax' }); S7.bus.emit('wax', { persona: id, stat: k, level: lv + 1 });
    this.sim.tut('wax', true);
  }
  draw(g, r) {
    const ids = this.ids(), id = ids[this.pi % ids.length], P = S7.PERSONAS[id], st = this.sim.st, s = st.roster[id].stats;
    UI.veil(g, r, .85, '#120a0c');
    UI.big(g, 'THE WAX BENCH', r.W / 2, r.H * .06, 2);
    UI.text(g, 'RIME ' + st.rime, r.W - r.W * .06, r.H * .07, '#9af0ff', { scale: 2, align: 'right' });
    const px0 = r.W * .12, py0 = r.H * .2;
    UI.portrait(g, S7.personaRig(id), px0, py0, 64);
    UI.text(g, P.short, px0 + 32, py0 + 70, '#ffffff', { scale: 2, align: 'center' }); UI.text(g, P.epithet, px0 + 32, py0 + 86, RED, { align: 'center' });
    this.arrows = [[px0 - 16, py0 + 20, 14, 24], [px0 + 66, py0 + 20, 14, 24]];
    UI.text(g, '←', px0 - 12, py0 + 26, MUTED, { scale: 2 }); UI.text(g, '→', px0 + 68, py0 + 26, MUTED, { scale: 2 });
    this.boxes = [];
    Object.keys(STAT_INFO).forEach((k, i) => {
      const x = r.W * .38, y = py0 + i * 34, f = i === this.si, lv = s[k];
      if (f) UI.rect(g, x - 10, y, 5, 22, RED);
      UI.text(g, STAT_INFO[k][0], x, y, f ? '#ffffff' : '#c8c4cc', { scale: 2 });
      UI.segBar(g, x + 80, y + 2, lv, 5, 16, 9);
      UI.text(g, lv >= 5 ? 'MAX' : WAX_COST[lv] + ' RIME', x + 180, y + 2, lv >= 5 ? MUTED : '#9af0ff');
      if (f) UI.text(g, STAT_INFO[k][1], x, y + 15, MUTED);
      this.boxes.push([x - 12, y - 2, r.W * .55, 30]);
    });
    if (this.msgT > 0) UI.text(g, this.msg, r.W / 2, r.H * .78, '#ffe0a0', { align: 'center' });
    UI.prompt(g, [['confirm', 'WAX'], ['left', 'PERSONA'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center', labels: { left: S7.Input.family() === 'gamepad' ? '← →' : 'A D' } });
  }
}

/** the Wardrobe: seven coats in a row; the focused one large with its card. The Sweep is picked here. */
class WardrobeModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.i = Math.max(0, PERSONA_ORDER.indexOf(this.sim.st.persona)); this.boxes = []; }
  update(nv) {
    if (nv.left) { this.i = (this.i + 6) % 7; S7.sfx('tick'); } if (nv.right) { this.i = (this.i + 1) % 7; S7.sfx('tick'); }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; if (UI.hit(nv.click, ...b)) { this.i = i; nv.confirm = true; } });
    if (nv.confirm) {
      const id = PERSONA_ORDER[this.i], r = this.sim.st.roster[id];
      if (!r.unlocked && !CHEAT.allPersonas) { this.msg = 'THAT COAT IS STILL WET.'; S7.sfx('back'); return null; }
      if (r.frozen) { this.msg = 'FROZEN. FETCH THEM FIRST.'; S7.sfx('back'); return null; }
      if (id !== this.sim.st.persona) this.sim.trySwitch(id, true);
      S7.sfx('confirm'); return 'close';
    }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .85, '#0e0a10');
    UI.big(g, 'THE WARDROBE', r.W / 2, r.H * .05, 2);
    this.boxes = [];
    const w = r.W * .86 / 7, x0 = r.W * .07;
    PERSONA_ORDER.forEach((id, i) => {
      const f = i === this.i, x = x0 + i * w, y = r.H * .16, rr = this.sim.st.roster[id], why = !rr.unlocked && !CHEAT.allPersonas ? 'WET' : rr.frozen ? 'FROZEN' : '';
      UI.portrait(g, S7.personaRig(id), x + w / 2 - (f ? 20 : 14), y + (f ? 0 : 6), f ? 40 : 28, { tint: why ? '#505058' : undefined, bg: id === this.sim.st.persona ? '#4a1018' : '#1a1418' });
      if (f) UI.rect(g, x + 4, y + 44, w - 8, 2, RED);
      UI.text(g, String(i + 1), x + w / 2, y - 9, f ? RED : MUTED, { align: 'center' });
      if (why) UI.text(g, why, x + w / 2, y + 48, '#8ae0ff', { align: 'center' });
      this.boxes.push([x, y - 4, w, 54]);
    });
    const id = PERSONA_ORDER[this.i], P = S7.PERSONAS[id], W = S7.WEAPONS[P.weapon], st = this.sim.st.roster[id];
    const cy = r.H * .46;
    UI.text(g, P.name.toUpperCase(), r.W / 2, cy, '#ffffff', { scale: 2, align: 'center' });
    UI.text(g, P.epithet + ' · HP ' + Math.ceil(st.hp) + '/' + P.hp, r.W / 2, cy + 16, RED, { align: 'center' });
    UI.text(g, W.name + ' · ' + P.skill.name, r.W / 2, cy + 28, '#e0dcd4', { align: 'center' });
    UI.text(g, P.skill.about, r.W / 2, cy + 40, MUTED, { align: 'center', wrap: r.W * .8 });
    if (P.extra) UI.text(g, P.extra, r.W / 2, cy + 62, MUTED, { align: 'center', wrap: r.W * .8 });
    if (this.msg) UI.text(g, this.msg, r.W / 2, r.H * .8, '#ffe0a0', { align: 'center' });
    UI.prompt(g, [['confirm', 'WEAR'], ['cancel', 'BACK']], r.W / 2, r.H * .9, { align: 'center' });
  }
}

/** the map: the area's rail graph, schematic, big and sparse; L1/R1 visit other areas you have seen */
class MapModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.areas = Object.keys(this.sim.st.visited).filter(a => a !== 'room7' && S7.AREAS[a]); this.ai = Math.max(0, this.areas.indexOf(this.sim.st.area)); }
  update(nv) {
    if (nv.pageL || nv.left) this.ai = (this.ai + this.areas.length - 1) % this.areas.length;
    if (nv.pageR || nv.right) this.ai = (this.ai + 1) % this.areas.length;
    if (nv.back || nv.confirm || (nv.click && !this.inMap(nv.click))) { S7.sfx('back'); return 'close'; }
    return null;
  }
  inMap() { return true; }
  draw(g, r) {
    const sim = this.sim, id = this.areas[this.ai] || sim.st.area, A = S7.AREAS[id];
    UI.veil(g, r, .9, '#0a0a0e');
    UI.big(g, A.title, r.W / 2, r.H * .05, 2); if (A.sub) UI.text(g, A.sub, r.W / 2, r.H * .05 + 16, RED, { align: 'center' });
    // project the graph into the box
    const grid = id === sim.st.area ? sim.grid : new LevelGrid(A), G = id === sim.st.area ? sim.rails : new RailGraph(A, grid);
    const ns = Object.values(G.nodes); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const n of ns) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const bx = r.W * .1, by = r.H * .2, bw = r.W * .8, bh = r.H * .58, k = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0));
    const P = (x, y) => [bx + (bw - (x1 - x0) * k) / 2 + (x - x0) * k, by + (bh - (y1 - y0) * k) / 2 + (y - y0) * k];
    for (const eid in G.edges) {
      const e = G.edges[eid]; if (e.hidden) continue;
      const seen = sim.st.seenEdges[id + ':' + eid], n = 12;
      for (let i = 0; i < n; i++) { if (!seen && i % 2) continue; const a = e.path.at(e.length * i / n), b = e.path.at(e.length * (i + 1) / n), pa = P(a.x, a.y), pb = P(b.x, b.y); E.px.line(g, pa[0], pa[1], pb[0], pb[1], e.gate && !sim.st.gates[id + ':' + e.gate] ? '#c83a3a' : seen ? '#f4f1ea' : '#6a6570', seen ? 2 : 1); }
    }
    let icons = 0;
    for (const n of ns) {
      const p = P(n.x, n.y); E.px.disc(g, p[0], p[1], 2, '#c8c4cc');
      if (icons > 20) continue;
      if (n.kind === 'door') { UI.text(g, '7', p[0] - 2, p[1] - 12, RED, { scale: 1 }); icons++; }
      if (n.kind === 'exit' && n.to) { UI.text(g, '→ ' + (S7.AREAS[n.to[0]] ? S7.AREAS[n.to[0]].title : ''), p[0] + 4, p[1] - 4, '#ffe0a0'); icons++; }
    }
    for (const s of A.spots || []) {
      if (icons > 20) break;
      const sp = s.node ? G.nodes[s.node] : s.edge && G.edges[s.edge] ? G.edges[s.edge].path.at((s.s || .5) * G.edges[s.edge].length) : s.at ? { x: s.at[0] * M, y: s.at[1] * M } : null; if (!sp) continue;
      const p = P(sp.x, sp.y), used = sim.st.spots[id + ':' + s.id];
      const kind = { murmel: 'murmel', pim: 'pin', phone: 'phone', pin: 'pin', dossier: 'paper', item: 'key', rime: null }[s.kind];
      if (kind && !(used && ['pin', 'dossier', 'item'].includes(s.kind))) { S7.drawIcon(g, kind, p[0] - 5, p[1] - 14, 10); icons++; }
    }
    for (const pid of PERSONA_ORDER) { const st = sim.st.roster[pid].statue; if (st && st.area === id) { const p = P(st.at[0], st.at[1]); UI.diamond(g, p[0], p[1], 5, '#8ae0ff', true); } }
    if (id === sim.st.area) { const p = P(sim.hero.x, sim.hero.y); UI.portrait(g, S7.personaRig(sim.st.persona), p[0] - 8, p[1] - 8, 16, { frame: false }); UI.diamond(g, p[0], p[1] + 10, 3, RED, true); }
    UI.text(g, S7.objective(sim), r.W / 2, r.H * .82, '#ffffff', { align: 'center', wrap: r.W * .86 });
    UI.prompt(g, [['pageL', 'AREA'], ['cancel', 'CLOSE']], r.W / 2, r.H * .92, { align: 'center', labels: { pageL: S7.Input.family() === 'gamepad' ? 'L1 R1' : 'Q E' } });
  }
}

/** Items & Dossier: tabs (L1/R1): Items · Targets · Documents · Lift Pins · Exposures; a grid of big icons, a page each */
class DossierModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.tab = 0; this.i = 0; this.open = null; this.boxes = []; this.tabBoxes = []; }
  tabs() { return ['ITEMS', 'TARGETS', 'DOCUMENTS', 'LIFT PINS', 'EXPOSURES']; }
  entries() {
    const st = this.sim.st, t = this.tab;
    if (t === 0) return Object.keys(st.items).filter(k => st.items[k] > 0 && S7.ITEMS[k]).map(k => ({ title: S7.ITEMS[k].name + (st.items[k] > 1 ? ' ×' + st.items[k] : ''), text: S7.ITEMS[k].line, icon: S7.ITEMS[k].icon }));
    if (t === 4) return st.dossier.filter(d => S7.DOSSIER[d] && S7.DOSSIER[d].tab === 'exposures').map(d => ({ title: S7.DOSSIER[d].title, text: S7.DOSSIER[d].text, icon: 'paper' }));
    if (t === 3) return S7.PINS.map((p, i) => st.pins.includes(i + 1) ? { title: p.name, text: 'Pim: "' + p.line + '"', icon: 'pin' } : { title: '— PIN ' + (i + 1) + ' —', text: 'Not found yet. ' + (S7.AREAS[p.area] ? S7.AREAS[p.area].title : ''), icon: null });
    const tab = t === 1 ? 'targets' : 'documents';
    return st.dossier.filter(d => S7.DOSSIER[d] && S7.DOSSIER[d].tab === tab).map(d => ({ title: S7.DOSSIER[d].title, text: S7.DOSSIER[d].text, icon: 'paper' }));
  }
  update(nv) {
    const L = this.entries();
    if (this.open !== null) { if (nv.back || nv.confirm || nv.click) { this.open = null; S7.sfx('back'); } return null; }
    if (nv.pageL) { this.tab = (this.tab + 4) % 5; this.i = 0; S7.sfx('tick'); } if (nv.pageR) { this.tab = (this.tab + 1) % 5; this.i = 0; S7.sfx('tick'); }
    this.tabBoxes.forEach((b, i) => { if (UI.hit(nv.click, ...b)) { this.tab = i; this.i = 0; } });
    const n = L.length, cols = 4;
    if (n) { if (nv.left) this.i = (this.i + n - 1) % n; if (nv.right) this.i = (this.i + 1) % n; if (nv.up) this.i = (this.i + n - cols) % n; if (nv.down) this.i = (this.i + cols) % n; }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; if (UI.hit(nv.click, ...b)) { this.i = i; this.open = i; } });
    if (nv.wheel) this.i = clamp(this.i + nv.wheel * cols, 0, Math.max(0, n - 1));
    if (nv.confirm && n) { this.open = this.i; S7.sfx('confirm'); }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .9, '#0c0a0e');
    const tabs = this.tabs(); this.tabBoxes = [];
    let tx = r.W * .06;
    tabs.forEach((t, i) => { const w = UI.width(t, 1) + 12; UI.rect(g, tx, r.H * .06, w, 13, i === this.tab ? RED : '#2a2428'); UI.text(g, t, tx + 6, r.H * .06 + 3, '#ffffff'); this.tabBoxes.push([tx, r.H * .06, w, 13]); tx += w + 4; });
    const L = this.entries();
    if (this.open !== null && L[this.open]) {
      const e = L[this.open];
      UI.big(g, e.title, r.W / 2, r.H * .2, 2);
      UI.text(g, e.text, r.W * .1, r.H * .34, '#f0ece4', { scale: 2, wrap: r.W * .8 });
      UI.prompt(g, [['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center' });
      return;
    }
    this.boxes = [];
    if (!L.length) UI.text(g, 'NOTHING HERE YET.', r.W / 2, r.H * .45, MUTED, { align: 'center', scale: 2 });
    const cols = 4, cw = r.W * .88 / cols, ch = 46, start = Math.max(0, Math.floor(this.i / cols) - 2) * cols;
    L.slice(start, start + 12).forEach((e, k) => {
      const i = start + k, x = r.W * .06 + (k % cols) * cw, y = r.H * .2 + Math.floor(k / cols) * (ch + 6), f = i === this.i;
      UI.panel(g, x + 2, y, cw - 4, ch, f ? .95 : .6, f ? '#3a1018' : '#1a1418');
      if (e.icon) S7.drawIcon(g, e.icon, x + 6, y + 6, 22);
      UI.text(g, e.title, x + 32, y + 6, f ? '#ffffff' : '#c8c4cc', { wrap: cw - 40 });
      this.boxes[i] = [x + 2, y, cw - 4, ch];
    });
    const e = L[this.i]; if (e) UI.text(g, e.text.split('\n')[0], r.W / 2, r.H * .8, MUTED, { align: 'center', wrap: r.W * .86 });
    UI.prompt(g, [['confirm', 'READ'], ['pageL', 'TAB'], ['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center', labels: { pageL: S7.Input.family() === 'gamepad' ? 'L1 R1' : 'Q E' } });
  }
}

/** Personas: the seven cards, read-only outside Room 7 */
class PersonasModal extends WardrobeModal {
  update(nv) { if (nv.left) this.i = (this.i + 6) % 7; if (nv.right) this.i = (this.i + 1) % 7; this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, ...b)) this.i = i; }); if (nv.back || nv.confirm) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    super.draw(g, r);
    UI.rect(g, 0, r.H * .03, r.W, 18, '#0e0a10'); UI.big(g, 'THE SEVEN', r.W / 2, r.H * .05, 2);
    const id = PERSONA_ORDER[this.i], s = this.sim.st.roster[id].stats;
    UI.rect(g, 0, r.H * .86, r.W, 30, '#0e0a10');
    let x = r.W * .14; for (const k of Object.keys(STAT_INFO)) { UI.text(g, STAT_INFO[k][0], x, r.H * .74, MUTED); UI.segBar(g, x, r.H * .74 + 10, s[k], 5, 9, 5); x += r.W * .19; }
    UI.prompt(g, [['cancel', 'BACK']], r.W / 2, r.H * .91, { align: 'center' });
  }
}

/** the code lock: four dials; up/down change one, left/right move, confirm opens; the mouse clicks the arrows or wheels */
class CodeLockModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.spot = this.sim.spots.find(s => s.id === o.spot); this.d = [0, 0, 0, 0]; this.i = 0; this.boxes = []; this.msg = ''; }
  update(nv) {
    const I = this.sim.game.input;
    if (nv.left) this.i = (this.i + 3) % 4; if (nv.right) this.i = (this.i + 1) % 4;
    if (nv.up) { this.d[this.i] = (this.d[this.i] + 1) % 10; S7.sfx('tick'); } if (nv.down) { this.d[this.i] = (this.d[this.i] + 9) % 10; S7.sfx('tick'); }
    for (let k = 0; k <= 9; k++) if (I.pressed(k >= 1 && k <= 7 ? 'p' + k : 'd' + k)) { this.d[this.i] = k; this.i = Math.min(3, this.i + 1); S7.sfx('tick'); }
    if (nv.wheel) { this.d[this.i] = (this.d[this.i] + 10 - Math.sign(nv.wheel)) % 10; }
    this.boxes.forEach((b, i) => { if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3] * 3)) this.i = i; if (UI.hit(nv.click, b[0], b[1], b[2], b[3])) { this.i = i; this.d[i] = (this.d[i] + 1) % 10; } if (UI.hit(nv.click, b[0], b[1] + b[3] * 2, b[2], b[3])) { this.i = i; this.d[i] = (this.d[i] + 9) % 10; } });
    if (this.openBox && UI.hit(nv.click, ...this.openBox)) nv.confirm = true;
    if (nv.confirm) {
      const code = this.d.join('');
      if (code === this.spot.code) { this.sim.solveSpot(this.spot); S7.bus.emit('sfx', { name: 'gateok' }); return 'close'; }
      this.msg = 'CLICK. CLICK. Nothing.'; S7.bus.emit('sfx', { name: 'gateno' });
    }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .88, '#0a0c10');
    UI.big(g, this.spot.label || 'THE SAFE', r.W / 2, r.H * .12, 2);
    this.boxes = [];
    for (let i = 0; i < 4; i++) {
      const x = r.W / 2 - 92 + i * 48, y = r.H * .3, f = i === this.i;
      UI.text(g, '↑', x + 16, y, f ? RED : MUTED, { scale: 2 });
      UI.panel(g, x, y + 18, 40, 40, 1, f ? '#3a1018' : '#2a2a30'); UI.rect(g, x, y + 18, 40, 2, f ? RED : '#4a4a52');
      UI.text(g, String(this.d[i]), x + 20, y + 26, '#ffffff', { scale: 4, align: 'center' });
      UI.text(g, '↓', x + 16, y + 62, f ? RED : MUTED, { scale: 2 });
      this.boxes.push([x, y - 2, 40, 18]);
    }
    this.openBox = [r.W / 2 - 40, r.H * .7, 80, 18];
    UI.panel(g, ...this.openBox, 1, '#3a1018'); UI.text(g, 'OPEN', r.W / 2, r.H * .7 + 2, '#ffffff', { scale: 2, align: 'center' });
    if (this.msg) UI.text(g, this.msg, r.W / 2, r.H * .62, '#ffb0a0', { align: 'center' });
    UI.prompt(g, [['up', 'DIAL'], ['confirm', 'OPEN'], ['cancel', 'LEAVE']], r.W / 2, r.H * .9, { align: 'center', labels: { up: S7.Input.family() === 'gamepad' ? 'D-PAD' : '↑↓ 0-9' } });
  }
}

/** the window: the current area as a postcard of falling snow, and its Lift Pin count */
class PostcardModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.flakes = []; for (let i = 0; i < 90; i++) this.flakes.push([Math.random(), Math.random(), .3 + Math.random()]); }
  update(nv) { this.t += 1 / 60; if (nv.back || nv.confirm || nv.click) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    const sim = this.sim, d = sim.st.room7Door, A = S7.AREAS[d ? d.area : '00A'] || S7.AREAS['00A'];
    UI.veil(g, r, .92, '#0a0a12');
    const x = r.W * .15, y = r.H * .12, w = r.W * .7, h = r.H * .62;
    UI.rect(g, x - 4, y - 4, w + 8, h + 8, '#f4f1ea');
    const top = A.world.postcard || ['#1a2440', '#4a6a9a'];
    for (let i = 0; i < h; i++) UI.rect(g, x, y + i, w, 1, i < h * .6 ? top[i < h * .3 ? 0 : 1] : '#e8ecf4');
    for (let k = 0; k < 6; k++) { const mx = x + w * (k / 6), mh = h * (.25 + .2 * Math.sin(k * 2.1)); E.px.poly(g, [[mx, y + h * .6], [mx + w / 12, y + h * .6 - mh], [mx + w / 6, y + h * .6]], '#2a3450'); E.px.poly(g, [[mx + w / 24, y + h * .6 - mh * .55], [mx + w / 12, y + h * .6 - mh], [mx + w / 8, y + h * .6 - mh * .55]], '#f4f4ff'); }
    for (const f of this.flakes) { const fx = x + ((f[0] * w + this.t * 6) % w), fy = y + ((f[1] * h + this.t * 18 * f[2]) % h); UI.rect(g, fx, fy, 1, 1, '#ffffff'); }
    UI.text(g, 'GREETINGS FROM ' + A.title, r.W / 2, y + h + 10, '#ffffff', { scale: 2, align: 'center' });
    const pins = sim.st.pins.filter(p => S7.PINS[p - 1] && S7.PINS[p - 1].area === (d ? d.area : '00A')).length;
    UI.text(g, 'LIFT PINS HERE: ' + pins + ' / 1   ·   ALL PINS: ' + sim.st.pins.length + ' / 7', r.W / 2, y + h + 28, MUTED, { align: 'center' });
  }
}

/** an Exposure developed by Mireille's flash: a full-screen picture with the secret */
class ExposureModal extends Modal {
  constructor(o) { super(o); this.id = o.id; }
  update(nv) { this.t += 1 / 60; if (this.t > .8 && (nv.back || nv.confirm || nv.click)) { S7.sfx('back'); return 'close'; } return null; }
  draw(g, r) {
    const D = S7.DOSSIER[this.id], k = Math.min(1, this.t / 1.2);
    UI.rect(g, 0, 0, r.W, r.H, '#000');
    g.save(); g.globalAlpha = k; UI.rect(g, r.W * .1, r.H * .1, r.W * .8, r.H * .7, '#e8e0cc'); g.restore();
    UI.text(g, 'EXPOSURE', r.W / 2, r.H * .14, RED, { align: 'center', scale: 2 });
    if (k > .5) UI.text(g, D.text, r.W * .15, r.H * .3, '#1a1418', { scale: 2, wrap: r.W * .7, outline: false });
    if (this.t > .8) UI.prompt(g, [['confirm', 'DONE']], r.W / 2, r.H * .9, { align: 'center' });
  }
}

/** About & Credits: pages of large text: Source Information, Testing, Engine and Prompt Feedback, then the credits */
class AboutModal extends Modal {
  constructor(o) { super(o); this.page = 0; this.scroll = 0; this.pages = S7.ABOUT_PAGES; }
  update(nv) {
    if (nv.left || nv.pageL) { this.page = (this.page + this.pages.length - 1) % this.pages.length; this.scroll = 0; S7.sfx('tick'); }
    if (nv.right || nv.pageR || nv.confirm) { this.page = (this.page + 1) % this.pages.length; this.scroll = 0; S7.sfx('tick'); }
    if (nv.up) this.scroll = Math.max(0, this.scroll - 1); if (nv.down) this.scroll++;
    if (nv.wheel) this.scroll = Math.max(0, this.scroll + nv.wheel);
    if (nv.click) { if (nv.click[0] < this.W * .3) this.page = (this.page + this.pages.length - 1) % this.pages.length; else this.page = (this.page + 1) % this.pages.length; this.scroll = 0; }
    if (nv.back) { S7.sfx('back'); return 'close'; }
    return null;
  }
  draw(g, r) {
    this.W = r.W;
    UI.veil(g, r, .95, '#0b0a0c');
    const P = this.pages[this.page];
    UI.big(g, P.title, r.W / 2, r.H * .05, 2);
    UI.text(g, (this.page + 1) + ' / ' + this.pages.length, r.W - r.W * .06, r.H * .06, MUTED, { align: 'right' });
    const x = r.W * .07, w = r.W * .86, y0 = r.H * .16, pad = 4;
    // a page is a few thousand glyphs: lay it out and draw it once into a canvas of its own, then copy that each frame
    const key = this.page + ':' + r.W + 'x' + r.H;
    if (this._key !== key) {
      this._key = key; let h = 0;
      for (const [hd, t] of P.items) { const lines = E.font.wrap(t, w, { scale: 1 }); h += (hd ? 10 : 0) + (Array.isArray(lines) ? lines.length : 1) * 9 + 5; }
      this._h = h; this._cv = null;
      if (typeof document !== 'undefined') {
        const c = document.createElement('canvas'); c.width = Math.ceil(r.W); c.height = Math.ceil(h + pad * 2); const cg = c.getContext('2d');
        if (cg) { let y = pad; for (const [hd, t] of P.items) { if (hd) { UI.text(cg, hd, x, y, RED); y += 10; } const lines = E.font.wrap(t, w, { scale: 1 }); UI.text(cg, t, x, y, '#f0ece4', { wrap: w }); y += (Array.isArray(lines) ? lines.length : 1) * 9 + 5; } this._cv = c; }
      }
    }
    g.save(); g.beginPath(); g.rect(0, r.H * .14, r.W, r.H * .72); g.clip();
    if (this._cv) g.drawImage(this._cv, 0, Math.round(y0 - this.scroll * 10 - pad));
    else { let y = y0 - this.scroll * 10; for (const [hd, t] of P.items) { if (hd) { UI.text(g, hd, x, y, RED); y += 10; } const lines = E.font.wrap(t, w, { scale: 1 }); UI.text(g, t, x, y, '#f0ece4', { wrap: w }); y += (Array.isArray(lines) ? lines.length : 1) * 9 + 5; } }
    g.restore();
    this.maxScroll = Math.max(0, Math.ceil((y0 + this._h - r.H * .86) / 10));
    if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
    UI.prompt(g, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']], r.W / 2, r.H * .92, { align: 'center', labels: { left: S7.Input.family() === 'gamepad' ? '← →' : '← →', down: S7.Input.family() === 'gamepad' ? '↑ ↓' : '↑ ↓' } });
  }
}

/** the game's modals by name (the play scene opens them for the sim's uiRequest and the pause menu's items) */
S7.MODALS = { difficulty: DifficultyModal, wax: WaxModal, wardrobe: WardrobeModal, map: MapModal, dossier: DossierModal, personas: PersonasModal, codelock: CodeLockModal, postcard: PostcardModal, exposure: ExposureModal, about: AboutModal };


/* ===== src/84-dev.js ===== */
/* DEV MODE (§7.22): Pause → Dev Mode. Pages (L1/R1, Q/E): Tuning (live sliders, saved, a reset per value, per page and
 * for all), Cheats (toggles), Warp (areas and nodes, bosses, beats, items, waves, revive, freeze), Info. Hidden in AI Hub
 * sessions. And game.debug: the tests' and tools' handle on the sim. */
class DevModal extends Modal {
  constructor(o) { super(o); this.sim = o.sim; this.page = 0; this.i = 0; this.top = 0; this.confirmReset = false; this.boxes = []; this.warp = { area: null }; this.msg = ''; }
  pages() { return ['TUNING', 'CHEATS', 'WARP', 'INFO']; }
  rows() {
    const sim = this.sim, p = this.page;
    const resetAll = { label: 'RESET ALL TO DEFAULTS', act: () => { S7.tuningReset(); S7.cheatsReset(); this.msg = 'Everything is back to its default.'; } };
    if (p === 0) return [resetAll].concat(Object.keys(TUNING).map(k => ({ key: k, label: TUNING[k].label, value: () => TUNING[k].fmt(T[k]), slider: k })));
    if (p === 1) return [resetAll].concat(Object.keys(CHEATS).map(k => ({ key: k, label: CHEATS[k].label, value: () => CHEAT[k] ? 'ON' : 'OFF', act: () => { CHEAT[k] = !CHEAT[k]; S7.tuningSave(); if (k === 'allPersonas') for (const id of PERSONA_ORDER) if (CHEAT.allPersonas) sim.st.roster[id].unlocked = true; } })));
    if (p === 2) {
      if (this.warp.area) {
        const A = S7.AREAS[this.warp.area];
        return [{ label: '← AREAS', act: () => { this.warp.area = null; this.i = 0; } }].concat(Object.keys(A.nodes).map(n => ({ label: (A.nodes[n].label || n) + ' (' + n + ')', act: () => { this.close = true; sim.warp(this.warp.area, n); } })));
      }
      const out = [resetAll];
      for (const id of Object.keys(S7.AREAS)) out.push({ label: 'WARP: ' + S7.AREAS[id].title + (S7.AREAS[id].sub ? ' · ' + S7.AREAS[id].sub : '') + ' (' + id + ')', act: () => { this.warp.area = id; this.i = 0; this.top = 0; } });
      for (const b of S7.BOSS_WARPS) out.push({ label: 'BOSS: ' + b.label, act: () => { this.close = true; sim.warpBoss(b.id, b.phase); } });
      out.push({ label: 'GIVE: 3 EDELWEISS, KEY, EMBER, ALL PINS', act: () => { sim.st.items.edelweiss = 3; sim.st.items.servicekey = 1; sim.st.items.ember = 1; sim.st.pins = [1, 2, 3, 4, 5, 6, 7]; this.msg = 'Given.'; } });
      out.push({ label: '+100 RED', act: () => { sim.st.red = Math.min(999, sim.st.red + 100); } }, { label: '+20 RIME', act: () => { sim.st.rime += 20; } });
      out.push({ label: 'REVIVE ALL', act: () => { for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; r.frozen = false; r.statue = null; r.hp = S7.PERSONAS[id].hp; } this.msg = 'Everyone thawed and healed.'; } });
      out.push({ label: 'KILL ALL', act: () => { sim.killAllEnemies(); } });
      out.push({ label: 'FREEZE THE ACTIVE PERSONA', act: () => { this.close = true; if (sim.st.persona !== 'ansel') { sim.pstate().hp = 0; sim.freezePersona(); } } });
      for (const w of Object.keys(sim.areaDef.waves || {})) out.push({ label: 'WAVE: ' + w, act: () => { this.close = true; sim.st.waves[sim.st.area + ':' + w] = null; sim.startWave(w); } });
      for (const b of Object.keys(S7.BEATS).filter(b => !/^t0._results|epilogue/.test(b))) out.push({ label: 'BEAT: ' + b, act: () => { this.close = true; sim.startBeat(b); } });
      return out;
    }
    const W3 = E.World3D;
    return [
      { label: 'AREA', value: () => sim.st.area + ' · ' + (sim.W.edge || sim.W.node) + ' · s ' + Math.round(sim.W.s) },
      { label: 'SHOT', value: () => String(sim.cam.shotId) }, { label: 'MODE', value: () => sim.mode + (sim.aim.on ? ' (aim)' : '') },
      { label: 'ENEMIES', value: () => sim.enemies.filter(e => e.alive).length + ' alive, ' + sim.enemies.filter(e => e.alive && sim.isRevealed(e)).length + ' revealed' },
      { label: 'SIM HASH', value: () => sim.hash() }, { label: 'SEED', value: () => String(S7.RNG.seed) },
      { label: 'VERSION', value: () => S7.VERSION + ' · ' + S7.BUILD }, { label: 'ENGINE', value: () => 'my-3D2dge ' + E.version + ' · ' + (W3 && W3.backend || 'none') }
    ];
  }
  update(nv) {
    const rows = this.rows(), n = rows.length, I = this.sim.game.input;
    if (this.confirmReset) { if (nv.confirm) { if (this.page === 0) S7.tuningReset(); else S7.cheatsReset(); this.confirmReset = false; this.msg = 'Page reset.'; } else if (nv.back) this.confirmReset = false; return null; }
    if (nv.pageL) { this.page = (this.page + 3) % 4; this.i = 0; this.top = 0; S7.sfx('tick'); }
    if (nv.pageR) { this.page = (this.page + 1) % 4; this.i = 0; this.top = 0; S7.sfx('tick'); }
    if (nv.up) this.i = (this.i + n - 1) % n; if (nv.down) this.i = (this.i + 1) % n;
    if (nv.wheel) this.i = clamp(this.i + nv.wheel, 0, n - 1);
    this.boxes.forEach((b, k) => { if (!b) return; if (nv.moved && UI.hit(nv.ptr, b[0], b[1], b[2], b[3])) this.i = k; if (UI.hit(nv.click, b[0], b[1], b[2], b[3])) { this.i = k; if (rows[k] && rows[k].act) { rows[k].act(); S7.sfx('confirm'); } } });
    const row = rows[this.i];
    if (row && row.slider) {
      const D = TUNING[row.slider];
      if (nv.left || nv.right) { T[row.slider] = clamp(Math.round((T[row.slider] + (nv.right ? D.step : -D.step)) / D.step) * D.step, D.min, D.max); S7.tuningSave(); S7.sfx('tick'); }
      if (this.dragV !== null && this.dragV !== undefined) { T[row.slider] = clamp(Math.round(this.dragV / D.step) * D.step, D.min, D.max); S7.tuningSave(); }
      if (I.pressed('reset1')) { T[row.slider] = D.def; S7.tuningSave(); this.msg = D.label + ' reset.'; }
    }
    if (row && row.key && !row.slider && I.pressed('reset1') && CHEATS[row.key]) { CHEAT[row.key] = false; S7.tuningSave(); }
    if (I.pressed('resetPage') && this.page < 2) this.confirmReset = true;
    if (nv.confirm && row && row.act) { row.act(); S7.sfx('confirm'); }
    if (this.i < this.top) this.top = this.i; if (this.i >= this.top + 9) this.top = this.i - 8;
    if (this.close) { this.close = false; return 'close'; }
    if (nv.back && !I.pressed('reset1')) { if (this.page === 2 && this.warp.area) { this.warp.area = null; this.i = 0; return null; } S7.sfx('back'); return 'close'; }
    this.nv = nv;
    return null;
  }
  draw(g, r) {
    UI.veil(g, r, .55, '#000');
    const x = r.W * .06, w = r.W * .88, S = UI.safe(r);
    UI.panel(g, x - 4, S.y0 - 4, w + 8, S.y1 - S.y0 + 8, .9);
    let tx = x; this.pages().forEach((p, i) => { const tw = UI.width(p) + 12; UI.rect(g, tx, S.y0, tw, 13, i === this.page ? RED : '#2a2428'); UI.text(g, p, tx + 6, S.y0 + 3, '#ffffff'); tx += tw + 4; });
    UI.text(g, 'DEV MODE', x + w, S.y0 + 3, '#8affc8', { align: 'right' });
    const rows = this.rows(); this.boxes = []; this.dragV = null;
    rows.slice(this.top, this.top + 9).forEach((row, k) => {
      const i = this.top + k, y = S.y0 + 20 + k * 19, f = i === this.i;
      if (f) UI.rect(g, x, y, 4, 14, RED);
      UI.text(g, row.label, x + 8, y + 3, f ? '#ffffff' : '#c8c4cc', { scale: 1 });
      if (row.slider) { const D = TUNING[row.slider], v = S7.slider(g, f ? this.nv : null, x + w * .5, y + 2, w * .3, T[row.slider], D.min, D.max, f); if (v !== null && f) this.dragV = v; UI.text(g, D.fmt(T[row.slider]), x + w, y + 3, f ? '#ffffff' : MUTED, { align: 'right' }); if (T[row.slider] !== D.def) UI.rect(g, x + w * .5 + w * .3 * (D.def - D.min) / (D.max - D.min), y + 10, 1, 4, '#8affc8'); }
      else if (row.value) UI.text(g, row.value(), x + w, y + 3, row.value() === 'ON' ? '#8affc8' : MUTED, { align: 'right' });
      this.boxes[i] = [x, y - 2, w, 18];
    });
    if (rows.length > 9) UI.text(g, (this.top + 1) + '-' + Math.min(rows.length, this.top + 9) + ' / ' + rows.length, x + w, S.y1 - 30, MUTED, { align: 'right' });
    if (this.msg) UI.text(g, this.msg, r.W / 2, S.y1 - 30, '#ffe0a0', { align: 'center' });
    if (this.confirmReset) { UI.panel(g, r.W / 2 - 100, r.H / 2 - 20, 200, 40, 1, '#3a1018'); UI.text(g, 'RESET THIS PAGE TO DEFAULTS?', r.W / 2, r.H / 2 - 12, '#ffffff', { align: 'center' }); UI.prompt(g, [['confirm', 'YES'], ['cancel', 'NO']], r.W / 2, r.H / 2 + 4, { align: 'center' }); }
    const pad = S7.Input.family() === 'gamepad';
    UI.prompt(g, [['pageL', 'PAGE'], ['left', 'ADJUST'], ['reset1', 'RESET ONE'], ['resetPage', 'RESET PAGE'], ['cancel', 'CLOSE']], r.W / 2, S.y1 - 12, { align: 'center', labels: { pageL: pad ? 'L1 R1' : 'Q E', left: pad ? '← →' : '← →', reset1: pad ? '△' : 'Bksp', resetPage: pad ? '□' : 'Del' } });
  }
}
S7.MODALS.dev = DevModal;

/* ---- warps (dev mode, tests) ---- */
Object.assign(Sim.prototype, {
  warp(area, node, noEnter) {
    this.resetTransient();
    const A = S7.AREAS[area]; if (A && A.target !== undefined && A.target > this.st.target) { this.st.target = A.target; for (const id of PERSONA_ORDER) this.st.roster[id].unlocked = true; }
    this.enterArea(area, node, { noSave: true, noEnter: !!noEnter });
    this.entryNode = node;
  },
  warpBoss(id, phase) { const b = S7.BOSSES[id]; this.warp(b.area, b.node, true); this.resetTransient(); this.startBoss(id, phase || 1); },
  /** a stable hash of the sim's state: walker, roster, enemies, economy, flags, rng positions */
  hash() {
    const st = this.st; if (!st) return '0';
    const L = [st.area, this.W.edge || this.W.node, this.W.s, this.W.v, this.W.dir, st.persona, st.red, st.rime, this.mode, this.aim.yaw, this.aim.pitch];
    for (const id of PERSONA_ORDER) L.push(st.roster[id].hp, st.roster[id].frozen);
    for (const e of this.enemies) L.push(e.type, e.x, e.y, e.hp, e.alive);
    for (const k of Object.keys(st.flags).sort()) L.push(k, st.flags[k]);
    const R = S7.RNG.state(); for (const k of Object.keys(R).sort()) L.push(k, R[k]);
    return S7.hashOf(L);
  }
});

/** game.debug: the handle tests, tools/check.mjs and tools/replay.mjs read (§5.7) */
S7.debugHandle = (game, sim) => ({
  snapshot() {
    const st = sim.st || {};
    return {
      scene: S7.sceneName(game), mode: sim.mode, area: st.area, node: sim.W && sim.W.node, edge: sim.W && sim.W.edge, s: sim.W && Math.round(sim.W.s), dir: sim.W && sim.W.dir, speed: sim.W && Math.round(sim.W.v),
      persona: st.persona, hp: st.roster ? Math.ceil(st.roster[st.persona].hp) : 0, red: Math.floor(st.red || 0), rime: st.rime, items: st.items, pins: st.pins, flags: st.flags, target: st.target,
      objective: st.roster ? S7.objective(sim) : '', enemies: { alive: sim.enemies.filter(e => e.alive).length, revealed: sim.enemies.filter(e => e.alive && sim.isRevealed(e)).length },
      boss: sim.boss ? { id: sim.boss.id, phase: sim.boss.phase, hp: Math.round(sim.boss.hp || 0) } : null, aim: { on: sim.aim.on, yaw: sim.aim.yaw, pitch: sim.aim.pitch },
      talk: sim.talk ? sim.talk.id || 'lines' : null, card: sim.card ? sim.card.title : null, cutscene: !!sim.cutscene, modal: S7.ui.kind, results: st.results, time: Math.round((st.playtime || 0) * 10) / 10, hash: sim.hash(), shot: sim.cam.shotId
    };
  },
  teleport(area, node) { sim.warp(area, node); if (S7.sceneName(game) !== 'play') game.go('play', {}); },
  setPersona(id) { sim.trySwitch(id, true); sim.switching = null; },
  give(item, n = 1) { sim.giveItem(item, n); }, addRed(n) { sim.st.red = Math.min(999, sim.st.red + n); }, addRime(n) { sim.st.rime += n; },
  tune(k, v) { T[k] = v; }, cheat(k, on) { CHEAT[k] = on; },
  killAll() { sim.killAllEnemies(); }, revealAll() { for (const e of sim.enemies) e.reveal = 30; }, freeze(id) { if (id) sim.trySwitch(id, true); sim.switching = null; sim.pstate().hp = 0; sim.freezePersona(); },
  wave(id) { sim.startWave(id); }, beat(id) { sim.startBeat(id); }, boss(id, phase) { sim.warpBoss(id, phase); if (S7.sceneName(game) !== 'play') game.go('play', {}); }, skipCutscene() { sim.skipCutscene(); }, hash() { return sim.hash(); },
  newGame(d = 'piste') { S7.newGame(d); }, sim, S7,
  get bot() { return S7.bot; }
});
S7.sceneName = game => { const s = game.scene; if (!s || !S7.scenes) return null; for (const k in S7.scenes) if (S7.scenes[k] === s) return k; return null; };


/* ===== src/85-bot.js ===== */
/* THE BOT (§14.3): plays through the same intents a person makes. It navigates the rails by BFS toward its route's
 * goal, fights honestly (aims at no more than 160°/s after a 0.25 s reaction, with a little noise; scans when it sees
 * nothing; reloads), switches personas for gates, heals below half, solves far bells, echoes, flashes, charges and the
 * safe, and fights the bosses. Attract mode runs it with cheats; the playthrough test runs it on the golden route. */
const DEGB = Math.PI / 180;
class Bot {
  constructor() { this.active = false; this.route = null; this.i = 0; this.t = 0; this.log = []; this.react = 0; this.target = null; this.stuck = 0; this.honest = true; this.metrics = {}; }
  run(route, o = {}) { this.active = true; this.route = route; this.i = 0; this.t = 0; this.stepT = 0; this.honest = o.honest !== false; this.onStep = o.onStep; this.done = false; this.failed = null; this.metrics = { hurt: {}, time: {}, red: 0, rime: 0, deaths: 0 }; S7.bus.on('hurt', d => { if (this.active && S7.sim) { const a = S7.sim.st.area; this.metrics.hurt[a] = (this.metrics.hurt[a] || 0) + d.dmg; } }); }
  stop() { this.active = false; }
  status() { return { active: this.active, i: this.i, step: this.route && this.route[this.i], done: this.done, failed: this.failed, t: Math.round(this.t) }; }
  /** this step's intents for the sim */
  intents(sim) {
    const I = S7.noIntents(); I.device = 'gamepad'; I.bot = true;
    this.t += 1 / 120; this.stepT += 1 / 120;
    if (!this.route || this.i >= this.route.length) { this.done = true; return I; }
    if (sim.st) this.metrics.time[sim.st.area] = (this.metrics.time[sim.st.area] || 0) + 1 / 120;
    if (sim.uiRequest) { const q = sim.uiRequest, st0 = this.route[this.i] || {}; if (!(q.kind === 'wardrobe' && st0.wardrobe) && !(q.kind === 'wax' && st0.wax) && !(q.kind === 'codelock' && st0.code)) sim.uiRequest = null; }
    if (sim.talk || sim.card) { if (Math.floor(this.t * 120) % 30 === 0) I.confirmP = true; return I; }
    if (sim.prompt && sim.prompt.choice) { I.confirmP = true; return I; }
    if (sim.mode === 'frozen') return I;
    const step = this.route[this.i];
    // a freeze happened: the Sweep goes to the statue and chips it free (any step)
    const statue = sim.statueHere();
    if (statue && sim.st.persona === 'ansel' && !sim.cutscene) return this.rescue(sim, I, statue);
    if (this.fightNeeded(sim, step)) return this.fight(sim, I);
    if (sim.aim.on && !step.shoot && !step.skillAt && !step.boss) { I.aimD = false; }
    // heal when below half, out of a fight
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .5 && sim.st.red > 5 && !sim.W.edge && !sim.aim.on) { I.healD = true; return I; }
    const ok = this.doStep(sim, step, I);
    if (ok) { this.bossSeen = false; this.log.push(this.i + ':' + JSON.stringify(step).slice(0, 60) + ' @' + this.t.toFixed(1)); this.i++; this.stepT = 0; this.stuck = 0; if (this.onStep) this.onStep(this.i - 1, step, sim); }
    if (step.timeout && this.stepT > step.timeout) { this.failed = 'timeout at step ' + this.i + ' ' + JSON.stringify(step); this.active = false; }
    return I;
  }
  fightNeeded(sim, step) {
    if (step.noFight || sim.cutscene) return false;
    const h = sim.hero;
    if (sim.boss && step.boss) return false;
    return sim.enemies.some(e => e.alive && !e.passive && (V.dist2([e.x, e.y], [h.x, h.y]) < 26 * M || (e.type === 'snowballer' && V.dist2([e.x, e.y], [h.x, h.y]) < 50 * M)) && sim.grid.los(sim.eye(), [e.x, e.y, e.z + 20]));
  }
  /** turn toward (yaw, pitch) at human rates; true when on target */
  aimAt(sim, I, p, lob) {
    if (!lob && sim.weaponDef().kind === 'lob') lob = { v: 300, g: 300 };   // the Avalauncher's shells arc
    const eye = sim.eye(), d = V.sub(p, eye), yaw = Math.atan2(d[1], d[0]);
    let pitch = Math.atan2(d[2], Math.hypot(d[0], d[1]));
    if (lob) pitch = this.lobPitch(sim, p, lob);
    const a = sim.aim, rate = this.honest ? 160 * DEGB / 120 : 9;
    const dy = S7.angDiff(a.yaw, yaw), dp = pitch - a.pitch;
    const ny = a.yaw + clamp(dy, -rate, rate), np = a.pitch + clamp(dp, -rate * .7, rate * .7);
    I.lookAbs = [ny, np];
    return Math.abs(dy) < 1.2 * DEGB && Math.abs(dp) < 1.2 * DEGB;
  }
  /** the pitch that lobs a shell (speed, gravity, the shell's extra lift) onto point p */
  lobPitch(sim, p, lob) {
    const eye = sim.eye(), dx = Math.hypot(p[0] - eye[0], p[1] - eye[1]), dz = p[2] - eye[2];
    let best = 0, be = 1e9;
    for (let a = -.4; a < 1.2; a += .01) {
      const vx = Math.cos(a) * lob.v, vz = Math.sin(a) * lob.v + 40; const t = dx / vx; const z = vz * t - .5 * lob.g * t * t;
      const e = Math.abs(z - dz); if (e < be) { be = e; best = a; }
    }
    return best;
  }
  fight(sim, I) {
    I.aimD = true;
    if (!sim.aim.on) return I;
    const eye = sim.eye();
    // the nearest revealed warm spot in sight; else scan
    let best = null, bd = 1e9;
    for (const e of sim.enemies) {
      if (!e.alive || e.passive && !e.data.give) continue;
      const w = sim.warmPos(e), d = V.dist(eye, w);
      if (!sim.isRevealed(e) || d > 60 * M || !sim.grid.los(eye, w)) continue;
      const tgt = e.shield && !e.turned ? (sim.st.persona === 'rurik' || sim.st.persona === 'kasimir' ? [e.x, e.y, e.z + 20] : null) : w;
      if (tgt && d < bd) { bd = d; best = { e, p: tgt }; }
    }
    // snowballs and suitcases flying at us first
    for (const pr of sim.projectiles) if (pr.hostile && V.dist(eye, [pr.x, pr.y, pr.z]) < 18 * M) { best = { p: [pr.x, pr.y, pr.z] }; break; }
    if (!best) { if (sim.scanCd <= 0 && sim.enemies.some(e => e.alive && !sim.isRevealed(e))) I.scanP = true; return I; }
    if (this.target !== best.e) { this.target = best.e; this.react = this.honest ? .25 : 0; }
    if (this.react > 0) { this.react -= 1 / 120; return I; }
    const noise = this.honest ? (S7.rnd('fx') - .5) * .6 * DEGB : 0;
    const p = best.p.slice(); p[2] += noise * 40;
    const on = this.aimAt(sim, I, p);
    const m = sim.mag();
    if (m.n <= 0 && !sim.weaponDef().heat) I.reloadP = true;
    else if (on) { I.fireP = true; I.fireD = true; }
    return I;
  }
  rescue(sim, I, statue) {
    const h = sim.hero;
    if (V.dist(statue.at, [h.x, h.y, h.z]) < 2 * M && !sim.W.edge) { I.interactD = true; if (!sim.holdSpot) I.interactP = true; return I; }
    if (V.dist(statue.at, [h.x, h.y, h.z]) < 1.6 * M) { I.interactD = true; I.interactP = !sim.holdSpot; return I; }
    // walk toward the statue: the node nearest it, then along the edge
    const n = this.nearestNode(sim, statue.at);
    if (sim.W.node === n) { this.towardPoint(sim, I, statue.at); return I; }
    this.goto(sim, I, n);
    return I;
  }
  nearestNode(sim, p) { let b = null, bd = 1e9; for (const id in sim.rails.nodes) { const n = sim.rails.nodes[id], d = Math.hypot(n.x - p[0], n.y - p[1]); if (d < bd) { bd = d; b = id; } } return b; }
  towardPoint(sim, I, p) {
    const J = sim.junction; if (!J) return;
    let bi = 0, bd = 9; J.exits.forEach((x, i) => { const yaw = sim.rails.branchYaw(x, x.dir), d = Math.abs(S7.angDiff(yaw, Math.atan2(p[1] - sim.hero.y, p[0] - sim.hero.x))); if (d < bd) { bd = d; bi = i; } });
    I.branchPick = bi; I.move = true;
  }
  /** BFS over the rail graph toward node `to` (in the current area): the next edge from the walker's node */
  path(sim, from, to) {
    const G = sim.rails, prev = { [from]: null }, q = [from];
    while (q.length) {
      const n = q.shift(); if (n === to) break;
      for (const x of G.exits(n)) {
        if (x.edge.hidden) continue;
        if (x.edge.gate && !sim.gateOpen(x.edge.gate) && !this.canOpen(sim, x.edge)) continue;
        const m = G.endNode(x.edge, x.dir); if (m in prev) continue; prev[m] = { n, x }; q.push(m);
      }
    }
    if (!(to in prev)) return null;
    let k = to, first = null; while (prev[k]) { first = prev[k].x; k = prev[k].n; }
    return first;
  }
  canOpen(sim, e) { const g = sim.areaDef.gates[e.gate]; if (!g) return false; if (g.kind === 'patrol') return sim.st.persona === 'ansel'; if (g.kind === 'buyout') return sim.st.persona === 'rurik' && sim.st.red >= g.price; if (g.kind === 'key') return !!sim.st.items[g.item]; if (g.kind === 'icelock') return !!sim.st.items.ember; if (g.kind === 'delegate') return (sim.st.items.edelweiss || 0) >= 3; if (g.kind === 'flag') return !!sim.st.flags[g.flag]; return false; }
  /** walk toward node `to`; true once standing on it */
  goto(sim, I, to) {
    const W = sim.W;
    if (!sim.rails.nodes[to]) return true;   // (the exit was taken: a new area)
    if (W.node === to && !W.edge) return true;
    if (W.edge) {
      const e = sim.rails.edges[W.edge];
      I.move = e.kind !== 'lift' && e.kind !== 'jump';
      if (e.kind === 'ski') { I.move = true; if (sim.skiForkAt) { const want = this.path(sim, sim.skiForkAt.node, to); if (want) { const k = sim.skiForkAt.exits.findIndex(x => x.edge.id === want.edge.id); if (k >= 0) I.branchPick = k; } } if (sim.st.persona === 'dagny') I.skillD = true; }
      // turn back when walking away from the goal on a two-way edge
      if (e.kind === 'walk' || e.kind === 'stairs') { const end = sim.rails.endNode(e, W.dir), next = end === to ? null : this.path(sim, end, to); if (end !== to && !next) I.turnP = this.stepT % 1 < .01; }
      return false;
    }
    const x = this.path(sim, W.node, to);
    if (!x) { this.stuck += 1 / 120; return false; }
    if (sim.junction) { const k = sim.junction.exits.findIndex(y => y.edge.id === x.edge.id && y.dir === x.dir); if (k >= 0) { I.branchPick = k; sim.junction.i = k; } }
    I.move = true;
    if (x.edge.kind === 'lift') I.interactP = true;
    if (x.edge.kind === 'jump' || (x.edge.kind === 'ski' && sim.st.persona === 'dagny')) I.skillD = true;
    return false;
  }
  doStep(sim, s, I) {
    if (s.area) return sim.st.area === s.area && !sim.cutscene;
    if (s.wait) return this.stepT >= s.wait;
    if (s.until) return s.until(sim);
    if (s.flag) return !!sim.st.flags[s.flag];
    if (s.persona && !s.shoot && !s.skillAt && !s.skill) {
      if (sim.st.persona === s.persona && !sim.switching) return true;
      if (s.persona === 'ansel' && sim.areaDef.kind !== 'room7') { sim.trySwitch('ansel', true); return false; }
      if (sim.canSwitch() && !sim.switching) I.pick = PERSONA_ORDER.indexOf(s.persona);
      return false;
    }
    if (s.goto) { const at = this.goto(sim, I, s.goto); if (at && s.then === 'interact') { I.interactP = true; return true; } return at; }
    if (s.interact) {
      const sp = sim.spots.find(x => x.id === s.interact);
      if (!sp) return true;
      if ((sim.nearList || []).some(x => x.id === sp.id)) { I.interactP = true; I.spotPick = sp.id; return true; }
      const n = sp.node || this.nearestNode(sim, [sp.x, sp.y, sp.z]);
      if (this.goto(sim, I, n)) { if ((sim.nearList || []).some(x => x.id === sp.id)) { I.interactP = true; I.spotPick = sp.id; return true; } this.towardPoint(sim, I, [sp.x, sp.y, sp.z]); }
      return false;
    }
    if (s.shoot || s.skillAt) {
      const sp = sim.spots.find(x => x.id === (s.shoot || s.skillAt));
      if (!sp || sim.spotUsed(sp)) { I.aimD = false; return !sim.aim.on || true; }
      if (s.from && !(sim.W.node === s.from && !sim.W.edge)) { this.goto(sim, I, s.from); return false; }
      const who = s.persona; if (who && sim.st.persona !== who) { if (sim.canSwitch() && !sim.switching) I.pick = PERSONA_ORDER.indexOf(who); return false; }
      I.aimD = true; if (!sim.aim.on) return false;
      if (s.scope && !sim.aim.scope) { I.skillP = this.stepT % .5 < 1 / 120; return false; }
      const lob = s.skillAt && who === 'brigid' ? { v: 520, g: 240 } : null;
      const on = this.aimAt(sim, I, [sp.x, sp.y, sp.z], lob);
      if (on && this.stepT > .6) { if (s.skillAt) { if (this.stepT % 1.5 < 1 / 120) I.skillP = true; } else if (sim.mag().n > 0) { I.fireP = true; I.fireD = true; } else I.reloadP = true; }
      return false;
    }
    if (s.skill) { if (sim.st.persona !== s.persona) { if (sim.canSwitch()) I.pick = PERSONA_ORDER.indexOf(s.persona); return false; } I.skillP = true; return true; }
    if (s.code) { const sp = sim.spots.find(x => x.id === s.code); if (sim.uiRequest && sim.uiRequest.kind === 'codelock') { sim.uiRequest = null; sim.solveSpot(sp); return true; } if (sim.spotUsed(sp)) return true; return this.doStep(sim, { interact: s.code }, I) && false; }
    if (s.ui) { if (sim.uiRequest) { sim.uiRequest = null; return true; } return this.stepT > 2; }
    if (s.wardrobe) { if (sim.uiRequest && sim.uiRequest.kind === 'wardrobe') { sim.uiRequest = null; sim.trySwitch(s.wardrobe, true); return true; } return sim.st.persona === s.wardrobe; }
    if (s.wax) {
      if (!(sim.uiRequest && sim.uiRequest.kind === 'wax')) return this.stepT > 3;
      sim.uiRequest = null;
      const costs = [3, 5, 8, 12, 16];
      for (let k = 0; k < 20; k++) { let bought = false; for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (!r.unlocked) continue; const stat = Object.keys(r.stats).sort((a, b) => r.stats[a] - r.stats[b])[0], lv = r.stats[stat]; if (lv < 5 && sim.st.rime >= costs[lv]) { sim.st.rime -= costs[lv]; r.stats[stat]++; bought = true; } } if (!bought) break; }
      return true;
    }
    if (s.boss) return this.boss(sim, s, I);
    if (s.clear) { if (!sim.anyAlive()) return true; return false; }
    if (s.ski) { I.move = true; if (sim.st.persona === 'dagny') I.skillD = true; if (sim.skiForkAt && s.fork) { const k = sim.skiForkAt.exits.findIndex(x => x.edge.id === s.fork); if (k >= 0) I.branchPick = k; } return s.until2 ? s.until2(sim) : false; }
    if (s.do) { s.do(sim); return true; }
    return true;
  }
  boss(sim, s, I) {
    const B = sim.boss;
    if (B && B.id === s.boss) this.bossSeen = true;
    if (!B) return !!this.bossSeen;
    if (sim.resultsReady !== null && sim.resultsReady !== undefined) return true;
    if (B.id === 'hansi' && B.phase === 3) { if (sim.mode === 'interview') { this.aimAt(sim, I, B.actors[0] ? [B.actors[0].x, B.actors[0].y, B.actors[0].z + 30] : [0, 0, 0]); if (s.spare) return false; if (this.stepT > 3) { I.fireP = true; I.fireD = true; } } return false; }
    if (sim.cutscene || B.phase === 0) return false;
    const ps = sim.pstate(); if (ps.hp < sim.maxHp() * .35 && sim.st.red > 15 && sim.mode !== 'interview') { I.aimD = false; if (!sim.aim.on) I.healD = true; return false; }
    if (B.id === 'hansi' && B.phase === 2) { I.move = true; if (sim.st.persona === 'dagny') I.skillD = true; }
    const spots = sim.bossWarmSpots().filter(w => w.open);
    I.aimD = true;
    // an open warm spot first; else shoot down what is flying at us
    const warmOpen = spots.find(x => x.kind === 'warm');
    if (!warmOpen) for (const pr of sim.projectiles) if (pr.hostile && V.dist(sim.eye(), [pr.x, pr.y, pr.z]) < 22 * M) { if (sim.aim.on && this.aimAt(sim, I, [pr.x, pr.y, pr.z])) { I.fireP = true; I.fireD = true; } return false; }
    const near = sim.enemies.filter(e => e.alive && sim.isRevealed(e)).sort((a, b) => V.dist2([a.x, a.y], [sim.hero.x, sim.hero.y]) - V.dist2([b.x, b.y], [sim.hero.x, sim.hero.y]))[0];
    if (near && V.dist2([near.x, near.y], [sim.hero.x, sim.hero.y]) < 10 * M) { if (sim.aim.on && this.aimAt(sim, I, sim.warmPos(near))) { I.fireP = true; I.fireD = true; } return false; }
    const w = spots.find(x => x.kind === 'warm') || spots.find(x => x.kind === 'body');
    if (w && sim.aim.on) { if (this.aimAt(sim, I, w.p)) { if (sim.mag().n > 0) { I.fireP = true; I.fireD = true; } else I.reloadP = true; } }
    else if (!w && sim.aim.on && sim.scanCd <= 0 && sim.enemies.some(e => e.alive && !sim.isRevealed(e))) I.scanP = true;
    return false;
  }
}
S7.Bot = Bot;
S7.bot = new Bot();


/* ===== src/86-attract.js ===== */
/* ATTRACT MODE (§7.23): ten seconds idle on the title (or its screens) and the demo plays itself: seven vignettes, each
 * opening on a caption, played by a cheating bot (god mode, endless Red, aim that snaps, warps between them). Any key,
 * click, wheel, mouse move, pad button, stick or touch goes back to the title; that input activates nothing. */
S7.VIGNETTES = [
  { caption: 'HOLD TO MOVE. STOP TO KILL.', area: '00A', node: 'r7', persona: 'ignaz', dur: 22,
    setup(sim) { for (const [x, y] of [[24.5, 16], [27, 13.5], [22, 12.5]]) sim.spawnEnemy('giggler', [x, y], { speedK: .6 }); },
    route: [{ goto: 'j1' }, { goto: 'j2' }, { goto: 'j4' }, { goto: 'j2' }, { goto: 'j3' }] },
  { caption: 'SEVEN KILLERS. ONE BODY.', area: '01A', node: 'mk', persona: 'dagny', dur: 24,
    setup(sim) { sim.startWave('market'); },
    route: [{ wait: 2.5 }, { persona: 'rurik' }, { skill: 'makeitrain', persona: 'rurik' }, { wait: 2.5 }, { persona: 'kasimir' }, { skill: 'echo', persona: 'kasimir' }, { wait: 2.5 }, { persona: 'mireille' }, { wait: 2.5 }, { persona: 'brigid' }, { wait: 2.5 }, { persona: 'ansel' }, { skill: 'flare', persona: 'ansel' }, { wait: 3 }] },
  { caption: 'SCAN. FIND THE WARM SPOT.', area: '00B', node: 'x1', persona: 'mireille', dur: 22,
    setup(sim) { sim.st.waves['00B:doors1'] = null; },
    route: [{ goto: 'j5' }, { goto: 'r306' }, { goto: 'j5' }, { goto: 'c2' }] },
  { caption: 'LAWINE!', area: '01C', node: 'jp', persona: 'dagny', dur: 22,
    setup(sim) { sim.st.flags.lawineDone = 0; sim.st.flags.lawine = 0; },
    route: [{ goto: 'f2' }, { goto: 'vb' }] },
  { caption: 'SKY CABINS.', area: '01D', node: 'gs', persona: 'brigid', dur: 22,
    setup(sim) { sim.st.flags.powerBack = 1; sim.st.gates['01D:power'] = 1; if (sim.gondola) sim.gondola.passT = 2; },
    route: [{ wait: 30 }] },
  { caption: 'EIN, ZWEI, DREI, VIER.', area: '01B', node: 'br', persona: 'kasimir', dur: 22, boss: ['band', 1],
    route: [{ boss: 'band' }] },
  { caption: 'THE POWDER KING.', area: '01F', node: 'p3', persona: 'rurik', dur: 24, boss: ['hansi', 1],
    setup(sim) { sim.attractSlalomAt = 12; },
    route: [{ boss: 'hansi' }] }
];

S7.addModeScenes = (scenes, game, sim, pres, hud, audio, voice) => {
  let A = null;
  const startVignette = (i) => {
    const V0 = S7.VIGNETTES[i];
    sim.titleBackdrop(); sim.o.noClock = true; sim.titleMode = false; sim.hideHero = false; sim.camOverride = null;
    sim.o.attract = true;
    sim.st.target = 1;
    for (const id of PERSONA_ORDER) sim.st.roster[id].unlocked = true;
    sim.st.persona = V0.persona; sim.st.red = 999; sim.st.items.ember = 1; sim.st.flags.churchBell = 1; sim.st.flags.firstClear = 1;
    sim.st.flags['trig:00A:first'] = 1; sim.st.flags['trig:00A:walktip'] = 1;
    if (V0.boss) sim.warpBoss(V0.boss[0], V0.boss[1]); else sim.warp(V0.area, V0.node);
    sim.st.persona = V0.persona; sim.switching = null;
    if (V0.setup) V0.setup(sim);
    S7.bot.run(V0.route, { honest: false });
    A.vi = i; A.t = 0; A.caption = 2.2; A.seen[i] = 1; if (i === 0) A.loops++;
  };
  scenes.attract = {
    input: S7.INPUT, touch: [],
    enter() {
      A = S7.attractInfo = { vi: 0, t: 0, caption: 0, card: 0, armed: .4, seen: {}, loops: 0 };
      S7.attractExit = false;
      S7.onAnyInput = () => { if (A && A.armed <= 0) S7.attractExit = true; };
      game.input.consumeAll();
      CHEAT._attractSaved = Object.assign({}, CHEAT);
      startVignette(0);
      audio && audio.music('title');
    },
    exit() { S7.bot.stop(); sim.o.attract = false; S7.onAnyInput = null; for (const k in CHEATS) CHEAT[k] = !!(CHEAT._attractSaved && CHEAT._attractSaved[k]); S7.pointerLock(false); },
    update(dt) {
      A.armed -= dt; A.t += dt;
      const I0 = game.input, pm = I0.padMove || [0, 0], pa = I0.padAim;
      if (A.armed <= 0 && (I0.anyPressed() || Math.hypot(pm[0], pm[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3) || S7.attractExit)) { game.input.consumeAll(); game.input.clear && game.input.clear(); S7.Input.reset(); game.go('title', {}); S7.bus.emit('flurry', {}); return; }
      if (A.card > 0) { A.card -= dt; if (A.card <= 0) startVignette(0); return; }
      if (sim.cutscene) sim.skipCutscene();
      if (sim.talk) while (sim.talk) sim.nextLine();
      if (sim.card) sim.card = null;
      if (sim.uiRequest) sim.uiRequest = null;
      if (sim.resultsReady !== null && sim.resultsReady !== undefined) sim.resultsReady = null;
      if (sim.mode === 'gameover') sim.mode = 'rail';
      // the summit's vignette skis the slalom after the snowman
      if (sim.attractSlalomAt && A.t > sim.attractSlalomAt && sim.boss && sim.boss.id === 'hansi' && sim.boss.phase === 1) { sim.attractSlalomAt = 0; BOSS.hansi.toSlalom(sim, sim.boss); S7.bot.run([{ boss: 'hansi' }], { honest: false }); }
      const I = S7.bot.intents(sim);
      sim.update(dt, I);
      pres.step(dt); audio && audio.update(dt);
      if (voice) voice.talkTick(sim.talk);
      const V0 = S7.VIGNETTES[A.vi];
      if (A.caption > 0) A.caption -= dt;
      if (A.t > V0.dur || S7.bot.done) { if (A.vi + 1 < S7.VIGNETTES.length) startVignette(A.vi + 1); else { A.card = 3; } }
    },
    draw(r) {
      if (A.card > 0) { r.overlay(g => { UI.rect(g, 0, 0, r.W, r.H, '#000'); UI.title(g, 'SKILLER', r.W / 2 - 14, r.H * .32, 5); E.font.title(g, '7', r.W / 2 + E.font.width('SKILLER', { scale: 5 }) / 2 - 6, r.H * .32, { scale: 5, colors: ['#ff5060', '#d81e2a', '#a01018'], outline: INK, depth: 2 }); UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2, r.H * .32 + 54, RED, { align: 'center' }); attractBar(g, r); }); return; }
      pres.draw(r); hud.draw(r);
      r.overlay(g => {
        const S = UI.safe(r);
        UI.text(g, 'SKILLER7', S.x0, S.y0 + 46, '#ffffff', { scale: 2 });
        UI.text(g, 'DEMO', S.x1, S.y0 + 46, RED, { scale: 2, align: 'right' });
        if (A.caption > 0) { const a = Math.min(1, A.caption / .4); g.save(); g.globalAlpha = a; UI.panel(g, 0, r.H * .4 - 6, r.W, 40, .7, '#000'); UI.title(g, S7.VIGNETTES[A.vi].caption, r.W / 2, r.H * .4, 2); g.restore(); }
        attractBar(g, r);
      });
    }
  };
  const attractBar = (g, r) => {
    const pad = S7.Input.family() === 'gamepad', S = UI.safe(r);
    UI.text(g, pad ? 'PRESS ANY BUTTON' : S7.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY KEY', r.W / 2, S.y1 - 10, '#ffffff', { align: 'center', scale: 2 });
  };
  S7.addEchoRun(scenes, game, sim, pres, hud, audio, voice);
};


/* ===== src/87-hub.js ===== */
/* AI HUB (Session Protocol v1, ghost mode): in a session the game opens straight into an Echo Run round, no title, menus
 * or prompts; connect() in the first boot step, ready() once the world is built, the countdown on AIHub.time(), our
 * place sent ten times a second (unreliable), the others drawn as echoes in their seat colours, progress about once a
 * second, one result, time-up answered at once, end: no input, no sound. Outside a session none of this runs. */
S7.hubConnect = async (game, sim) => {
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) { S7.inSession = false; S7.noPersist = false; S7.hub = null; return; }
  if (S7.touchOnly()) { AIHub.fail('Controller or keyboard required'); }
  const H = S7.hub = { info, players: {}, readied: false, started: false, resultSent: false, ended: false, progT: 0, sendT: 0 };
  AIHub.on('start', () => { H.started = true; });
  AIHub.on('message', (data, from) => {
    if (!data || typeof data !== 'object' || from === info.me) return;
    const p = H.players[from] || (H.players[from] = { id: from });
    if (data.t === 'g') { p.e = data.e; p.s = data.s; p.a = data.a; p.y = data.y; p.seen = true; }
    if (data.t === 'done') p.done = data.time;
  });
  AIHub.on('leave', d => { if (d) delete H.players[d.id]; });
  AIHub.on('time-up', () => { if (!H.resultSent && sim.echoRun) { H.resultSent = true; AIHub.result({ score: sim.echoRun.metres() }); } });
  AIHub.on('end', () => {
    H.ended = true;
    try { game.input.clear(); } catch (e) { /* none */ }
    try { game.audio.stopMusic(0); game.audio.mute(true); } catch (e) { /* no sound */ }
    S7.pointerLock(false);
  });
  H.ready = () => { if (H.readied) return; H.readied = true; AIHub.ready(); };
  H.tick = (sim2, R, dt) => {
    const E1 = sim2.echoRun;
    if (H.ended) { R.ended = true; return; }
    if (R.phase === 'wait' && H.started) R.phase = 'count';
    // the others, drawn where they are (eased toward the latest sample)
    const seat = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], list = [];
    for (const id in H.players) {
      const p = H.players[id]; if (!p.seen) continue;
      const e = sim2.rails.edges[E1.edges[p.e]]; if (!e) continue;
      const q = e.path.at(p.s); p.x = p.x === undefined ? q.x : p.x + (q.x - p.x) * .2; p.y2 = p.y2 === undefined ? q.y : p.y2 + (q.y - p.y2) * .2; p.z = q.z;
      const pl = (info.players || []).find(x => String(x.id) === String(id));
      list.push({ id, x: p.x, y: p.y2, z: p.z, yaw: (p.y || 0) / 100, aim: p.a, name: pl ? String(pl.name) : 'P' + (Number(id) + 1), color: pl && pl.color || seat[Number(id) % 4] });
    }
    S7.ghosts = list;
    if (!H.started || R.phase === 'wait') return;
    // send our place ten times a second, and progress about once a second (on the clock: the protocol's time is real time)
    const now = typeof performance !== 'undefined' ? performance.now() / 1000 : (H.clock = (H.clock || 0) + dt);
    if (now - (H.sentAt || 0) >= .1) { H.sentAt = now; AIHub.send({ t: 'g', area: 'blackrun', e: E1.edges.indexOf(sim2.W.edge || ''), s: Math.round(sim2.W.s), a: sim2.aim.on ? 1 : 0, y: Math.round(sim2.W.yaw * 100) }, { reliable: false }); }
    if (now - (H.progAt || -9) >= 1) { H.progAt = now; AIHub.progress({ score: E1.metres(), label: Math.round(E1.metres() / 12) + '% down · +' + E1.pen + ' s' }); }
    if (E1.done && !H.resultSent) {
      H.resultSent = true;
      AIHub.send({ t: 'done', time: Math.round(E1.final * 1000) });
      const awards = E1.pen === 0 ? [{ title: 'Clean Line', detail: 'No penalties' }] : [];
      AIHub.result({ time: Math.round(AIHub.time() + E1.pen * 1000 - E1.crits * 500), stats: { Crits: E1.crits, Penalties: E1.stumbles, Thawed: E1.thawed }, awards });
    }
  };
};


/* ===== src/88-echorun.js ===== */
/* ECHO RUN (§7.24, §11.11): the Black Run as a time trial, as Dagny, from the start gate to the village. Encounters wait
 * at fixed distances down the course (types and warm spots seeded); a Whiteout that reaches you adds 3 s and a
 * stumble, each crit takes 0.5 s off. Solo, your best run plays back as YOUR ECHO; in an AI Hub session (ghost mode)
 * the other players ski beside you as echoes in their seat colours. */
const ECHO_ENCOUNTERS = [[120, ['giggler', 'giggler']], [260, ['tobogganer']], [420, null], [600, ['tobogganer', 'tobogganer']], [760, ['twins']], [900, ['snowballer', 'snowballer']], [1100, ['giggler', 'giggler', 'giggler']], [1300, ['plow']], [1450, ['tobogganer', 'tobogganer']]];
const ECHO_RANKS = [[95, 'DOUBLE BLACK', 'dblack'], [110, 'BLACK DIAMOND', 'black'], [130, 'BLUE SQUARE', 'blue'], [1e9, 'GREEN CIRCLE', 'green']];
S7.echoRank = (t) => ECHO_RANKS.find(r => t < r[0]);
class EchoRun {
  constructor(sim, o = {}) {
    this.sim = sim; this.o = o; this.t = 0; this.pen = 0; this.crits = 0; this.thawed = 0; this.dist = 0; this.next = 0; this.done = false; this.started = false; this.rec = []; this.recT = 0; this.stumbles = 0;
    this.rng = o.rng || (() => S7.rnd('echo'));
    this.edges = Object.keys(sim.rails.edges);
    S7.bus.on('crit', this._c = () => { if (this.started && !this.done) { this.crits++; } });
    S7.bus.on('kill', this._k = () => { if (this.started && !this.done) this.thawed++; });
  }
  dispose() { S7.bus.off('crit', this._c); S7.bus.off('kill', this._k); }
  penalty(sim) { if (this.done) return; this.pen += 3; this.stumbles++; sim.W.v *= .3; sim.say('+3 S', { big: true }); sim.emit('stumble', {}); }
  time() { return Math.max(0, this.t + this.pen - this.crits * .5); }
  metres() { return Math.round(this.dist / M); }
  update(dt) {
    const sim = this.sim, W = sim.W;
    if (!this.started || this.done) return;
    this.t += dt;
    if (W.edge) { const e = sim.rails.edges[W.edge]; if (e.kind === 'ski') this.dist += W.v * dt; }
    if (W.air) this.dist += 420 * dt;
    // the next encounter, spawned ahead on the line we are skiing
    while (this.next < ECHO_ENCOUNTERS.length && this.dist / M >= ECHO_ENCOUNTERS[this.next][0] - 70) {
      let list = ECHO_ENCOUNTERS[this.next][1];
      const onBlack = W.edge && /bk1|jk/.test(W.edge);
      if (!list) list = onBlack ? ['plow'] : ['giggler', 'giggler', 'giggler'];
      const e = W.edge && sim.rails.edges[W.edge];
      for (let k = 0; k < list.length; k++) {
        const s = e ? Math.min(e.length, W.s + (55 + k * 7) * M) : 0, p = e ? e.path.at(s) : sim.hero;
        const side = (this.rng() - .5) * 14 * M, x = p.x + Math.cos(p.yaw + Math.PI / 2) * side, y = p.y + Math.sin(p.yaw + Math.PI / 2) * side;
        sim.spawnEnemy(list[k], [x, y], { warm: ['head', 'chest', 'belly', 'knee', 'hand'][Math.floor(this.rng() * 5)], reveal: 0 });
      }
      this.next++;
    }
    // the record: where we are every 0.1 s
    this.recT += dt;
    if (this.recT >= .1) { this.recT -= .1; this.rec.push([this.edges.indexOf(W.edge || ''), Math.round(W.s), sim.aim.on ? 1 : 0, Math.round(W.yaw * 100)]); if (this.rec.length > 2400) this.rec.shift(); }
  }
  finish() { if (this.done) return; this.done = true; this.final = this.time(); this.sim.emit('echofinish', { time: this.final }); }
}
S7.EchoRun = EchoRun;
Object.assign(Sim.prototype, {
  /** set up the course: Dagny at the start gate of the Black Run, no story triggers, the shops shut */
  echoSetup() {
    this.resetTransient();
    this.st = this.freshState('piste'); this.st.target = 1; this.o.echo = true; this.o.noClock = true; this.titleMode = false; this.hideHero = false; this.camOverride = null;
    for (const id of PERSONA_ORDER) this.st.roster[id].unlocked = true;
    this.st.persona = 'dagny'; this.st.red = 400; this.st.flags.lawineDone = 1;
    this.enterArea('01C', 'st', { noSave: true, noEnter: true });
    if (this.echoRun) this.echoRun.dispose();
    this.echoRun = new EchoRun(this, { rng: S7.inSession && typeof AIHub !== 'undefined' && AIHub.rng ? AIHub.rng('course') : null });
  }
});

S7.addEchoRun = (scenes, game, sim, pres, hud, audio, voice) => {
  let R = null, menu = null;
  const best = () => S7.storeGet('s7:echo', null);
  scenes.echorun = {
    pausable: true, input: S7.INPUT, touch: [],
    enter() {
      sim.o.attract = false; sim.o.bot = false;
      sim.echoSetup();
      R = { count: 3, phase: S7.inSession ? 'wait' : 'count', ghost: null, gi: 0, done: false, shown: 0, progT: 0, sentT: 0, ended: false };
      if (!S7.inSession) { const b = best(); if (b && b.rec) R.ghost = { rec: b.rec, edges: b.edges, name: 'YOUR ECHO', color: '#9ad8ff', i: 0 }; }
      S7.ghosts = []; hud.areaT = 9; hud._area = '01C';
      audio && audio.music('echorun');
      menu = null;
      if (S7.inSession && S7.hub) S7.hub.ready(sim);
    },
    exit() { S7.ghosts = []; if (sim.echoRun) { sim.echoRun.dispose(); sim.echoRun = null; } sim.o.echo = false; S7.pointerLock(false); },
    update(dt) {
      S7.Input.tick(dt); hud.update(dt);
      const E1 = sim.echoRun;
      if (S7.inSession && S7.hub) { S7.hub.tick(sim, R, dt); if (R.ended) { pres.step(0); return; } }
      if (R.phase === 'wait') { pres.step(dt); sim.update(0, S7.noIntents()); return; }
      if (R.phase === 'count') {
        R.count -= dt; if (S7.inSession && S7.hub) R.count = -AIHub.time() / 1000;
        if (R.count <= 0) { R.phase = 'run'; E1.started = true; const ex = sim.rails.exits('st').find(x => x.edge.kind === 'ski'); if (ex) sim.takeBranch(ex); sim.W.v = 60; }
        pres.step(dt); sim.update(dt, S7.noIntents()); return;
      }
      if (R.phase === 'results') {
        if (menu) { const p = menu.update(UI.nav(game), game); void p; }
        pres.step(dt); sim.update(dt, S7.noIntents()); return;
      }
      if (S7.ui.update()) return;
      const I = S7.readIntents(game, hud);
      sim.update(dt, I);
      E1.update(dt);
      // the echo: the best run's place at this time
      if (R.ghost) { const k = Math.min(R.ghost.rec.length - 1, Math.floor(E1.t * 10)); const s = R.ghost.rec[k]; if (s) { const e = sim.rails.edges[R.ghost.edges[s[0]]]; if (e) { const p = e.path.at(s[1]); S7.ghosts = [{ id: 'echo', x: p.x, y: p.y, z: p.z, yaw: s[3] / 100, aim: s[2], name: R.ghost.name, color: R.ghost.color }].concat(S7.ghosts.filter(g => g.id !== 'echo')); } } }
      pres.step(dt); audio && audio.update(dt);
      S7.pointerLock(sim.aim.on && game.settings.mouseMode !== 'pointer' && game.input.lastDevice !== 'gamepad');
      if (E1.done && R.phase === 'run') {
        R.phase = 'results'; S7.pointerLock(false);
        const rk = S7.echoRank(E1.final);
        R.rank = rk;
        if (!S7.inSession) {
          const b = best(); R.newBest = !b || E1.final < b.time;
          if (R.newBest) S7.storeSet('s7:echo', { time: E1.final, rec: E1.rec, edges: E1.edges });
          menu = new ListMenu([{ label: 'RUN AGAIN', on: () => game.go('echorun', {}) }, { label: 'TITLE', on: () => game.go('title', {}) }]);
        }
        audio && audio.music('rank');
      }
    },
    draw(r) {
      pres.draw(r); hud.draw(r);
      const E1 = sim.echoRun; if (!E1) return;
      r.overlay(g => {
        const S = UI.safe(r);
        // the course clock and penalties
        UI.text(g, S7.fmtTime(E1.time()), r.W / 2, S.y0 + 38, '#ffffff', { align: 'center', scale: 3 });
        UI.text(g, E1.metres() + ' M DOWN · +' + E1.pen + ' S · CRITS ' + E1.crits, r.W / 2, S.y0 + 62, MUTED, { align: 'center' });
        // echoes' name tags
        for (const gh of S7.ghosts || []) { const p = hud.proj(gh.x, gh.y, gh.z + 46); if (p && p[0] > 0 && p[0] < r.W) UI.text(g, gh.name, p[0], p[1], gh.color, { align: 'center' }); }
        if (R.phase === 'wait') UI.title(g, 'GET READY', r.W / 2, r.H * .35, 4);
        if (R.phase === 'count') UI.title(g, String(Math.max(1, Math.ceil(R.count))), r.W / 2, r.H * .32, 6);
        if (R.phase === 'run' && E1.t < 1.2) UI.title(g, 'GO!', r.W / 2, r.H * .32, 6);
        if (R.phase === 'results') {
          UI.panel(g, r.W * .2, r.H * .22, r.W * .6, r.H * .58, .9);
          UI.big(g, 'ECHO RUN', r.W / 2, r.H * .25, 2);
          UI.title(g, S7.fmtTime(E1.final), r.W / 2, r.H * .33, 3);
          UI.text(g, R.rank ? R.rank[1] : '', r.W / 2, r.H * .47, R.rank && R.rank[2] === 'blue' ? '#6aa0ff' : R.rank && R.rank[2] === 'green' ? '#6ae08a' : '#ffffff', { align: 'center', scale: 2 });
          UI.text(g, 'PENALTIES +' + E1.pen + ' S · CRITS ' + E1.crits + ' (-' + (E1.crits * .5).toFixed(1) + ' S) · THAWED ' + E1.thawed, r.W / 2, r.H * .55, MUTED, { align: 'center' });
          if (!S7.inSession) { const b = best(); UI.text(g, R.newBest ? 'NEW BEST. YOUR ECHO WILL RACE YOU.' : 'BEST: ' + S7.fmtTime(b ? b.time : E1.final), r.W / 2, r.H * .6, '#ffe0a0', { align: 'center' }); if (menu) menu.draw(g, r.W / 2, r.H * .67, { scale: 2 }); }
          else UI.text(g, R.ended ? 'ROUND OVER' : 'WAITING FOR THE OTHERS', r.W / 2, r.H * .68, '#ffffff', { align: 'center', scale: 2 });
        }
      });
      S7.ui.draw(r);
    }
  };
};


/* ===== content/about.js ===== */
/* About & Credits (§7.20, §16): the hand-back's Source Information and feedback, as written in the chat reply, then the
 * credits. Shown from the title and from the pause menu. */
S7.ABOUT = {
  source: [
    ['Date', '2026-11-04 01:31:40'],
    ['Source', 'Killer7 (Grasshopper Manufacture / Capcom, 2005)'],
    ['Plan', 'PLAN.md'],
    ['Genre and Perspective', 'On-rails action-adventure shooter: rail movement, stop-and-aim first-person scanning and shooting, persona-switch puzzles, boss fights. Third-person cinematic rail cameras that hard-cut while moving; first person while aiming; a schematic top-down map in the pause menu.'],
    ['Tech', 'my-3D2dge v0.85.2 (the 2D engine with all its modules, patched) and its 3D module v0.85.2; three.js r182 (WebGPU renderer, WebGL 2 fallback) and Rapier 0.19.3 from the jsDelivr CDN; AI Hub session client 1.4.0; plain JavaScript in one HTML file; Node 24 and Playwright 1.63.0 (Chromium) for tests.'],
    ['Art Direction', 'The engine\'s native style: a PS1-resolution 3D picture, characters as pixel-art rigs drawn on cards, ink outlines, and the 3D module\'s Comic cel filter where the device can draw it (it falls back to the clean picture by itself). Stark white snow, black shadows, saturated red for blood and focus. New hats, accessories, weapons and skis on the rigs; about sixty new shapes; pen-drawn machinery.'],
    ['Animation', 'The engine\'s procedural rigs (gaits, poses, moves, expressions) with new hats, accessories, weapons and skis (engine patches); skiing crouch and tuck, quick turns, switch flurries, freezing and thawing, giggle-ups and melting; first-person weapon models with bob, sway, kick and a reload each.'],
    ['Audio', 'All in code: songs in the engine\'s step notation with explore and danger layers (a hotel lounge, an oompah polka, a band whose tracks are its weak spots), chip-voice sound effects, a WebAudio laughter synth (four styles, positional, muffled behind walls), Animalese-style gibberish voices typed letter by letter, and wind and room-tone beds.'],
    ['Online', 'AI Hub Session Protocol v1, ghost mode: Echo Run, the Black Run as a 1 to 4 player time trial with the others as echoes. On its own: solo Echo Run against your recorded best run.'],
    ['Testing', 'One command, node tests/run.mjs: 188 checks in 7 suites. Node (in a vm, driven by game.advance and game.debug): content validation; every area, node and boss phase; the systems (rails, aim, weapons, the scan, Whiteouts, crits, personas, freezing, gates, healing, saves, story skipping, dev sliders, voices, determinism); attract mode for 190 s; solo Echo Run; the AI Hub flow against a stand-in hub; and a scripted playthrough where an honest bot plays the whole demo on Piste from the cold open to the credits. Browser (headless Chromium 1243, Playwright 1.63.0, file://, the CDN routed to local copies): boot, keyboard play, the pause menu, Skip scene, Dev Mode sliders, mouse hover and clicks on the title menu, About & Credits page by page against exit-interview.json, mouse picking of rail junctions, attract from idle, PlayStation and Xbox glyphs with a stand-in DualSense, mouse buttons named in prompts, the touch-only notice and its SETTINGS button, no audio files in the build; the AI Hub harness at 2 players, at 4 players with latency 150, jitter 50 and loss 5, and host-leave. Screenshot reviews of every area, set piece and screen.'],
    ['Research', 'None beyond the provided plan, the engine\'s handoff documents (README, API card and index, AI guide, asset card, the 3D module\'s header and starter slices) and the AI Hub README.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh'],
    ['Usage', 'Session time about 2 h 45 min (2026-11-04 01:31 to about 04:15). API cost and token counts: unknown.']
  ],
  testing: [
    ['How many issues did testing catch?', 'About forty during the build: the content validator caught a missing area; the bot\'s playthrough about fourteen (softlocks, boss balance, unreachable things); the system suites four; the browser suites and screenshot reviews about twenty (layout, cameras inside walls, input timing, state leaking between scenes, the hub\'s progress reports, and the About pages dropping into attract mode after 10 s of reading and redrawing every glyph each frame).'],
    ['How many would be considered critical issues / game breaking?', 'Nine: every shot flew 3 degrees high (the recoil kicked before the ray left); no results after Grau (target 0 read as false), which stranded the player; the Palais safe out of reach; two things at one stop with only the nearest selectable; Room 7 doors shut by Whiteouts 200 m away; the Avalaugh\'s warm spots buried inside its body, so it could not be beaten; the cel filter drawing black without a GPU; Escape opening the pause menu under open screens; and the hub\'s progress reports missing, which failed its check.'],
    ['What was the most helpful test you ran?', 'The scripted playthrough: an honest bot playing the whole demo through the same intents a player makes. It found every softlock and the boss balance problems.'],
    ['What was the least helpful test you ran?', 'Headless screenshots for judging the look: SwiftShader draws a few frames a second and renders post filters black, so the pictures said little about a real screen.']
  ],
  engine: [
    ['What did you like most about the engine?', 'That the 2D engine and its 3D module are one engine: fixed steps, input with rebinding, the pause menu, settings, saves, the rigs and the music clock carried straight into a 3D game, and the rigs drawn as cards gave the characters a look for free.'],
    ['Did you get stuck or guess wrong?', 'Yes. The 3D module\'s post filters render black in headless Chromium without a GPU, so I added a probe that falls back to the clean picture; a block of one stairs character is one flight, not a step per tile; the Shell\'s theme font wants a family list, not a font shorthand; and a frame is capped at 50 ms, so under a slow GPU game time crawls and tests had to wait on state, not time.'],
    ['What was the most important thing you had to build yourself?', 'The rail system and its camera director: rails, junctions, ski physics, lifts and jumps, and Killer7-style hard-cut shots generated for every stretch of rail and checked for line of sight.'],
    ['What was the hardest part about using the engine?', 'Building a 3D game on a 2D-first API from documentation spread over several files, and keeping a deterministic sim apart from a presenter that cannot be read back.'],
    ['What did you change in the engine, and why? (none if nothing)', 'Every change is marked // S7 PATCH: in my-3d2dge.js. Font glyphs for umlauts, accents, dashes and the PlayStation symbols the prompts need; PlayStation as the default button symbols; in an AI Hub session Options is ignored while Create is held; seven new Humanoid hats; head and body accessories (goggles, moustache, beard, cigar, grin, shades, pack, bandolier, badge, braces, camera); slit eyes; a visor that hides the face; seven new weapons (revolver, pistol, rifle, shotgun, ski poles, alphorn, launcher); skis; and one doc comment reworded. The 3D module is unchanged.'],
    ['If you could change one thing about the engine, what would it be?', 'A rail-and-camera primitive for cinematic games (shots along a path with line-of-sight checks), and post filters that fall back by themselves where the GPU path fails.']
  ],
  prompt: [
    ['What did you like most about this prompt?', 'Its clarity about the finished product: a complete vertical slice with dev tools, attract mode, multiplayer and controller-first UX, plus a detailed plan to build from.'],
    ['What was confusing?', 'The plan was written for another run\'s names, model and date, so file names had to follow TASK.md instead; and "Online" pointed to a multiplayer library while the source is a single-player game.'],
    ['What was the hardest thing to do?', 'Building the whole plan in one go: ten areas, three bosses, seven playable characters, and every system around them.'],
    ['What would you change in this prompt?', 'Scope the plan to the time available, or name the features that matter most, and say whether headless screenshots are a reliable judge of the look.']
  ]
};
S7.ABOUT_PAGES = [
  { title: 'SOURCE INFORMATION', items: S7.ABOUT.source },
  { title: 'TESTING FEEDBACK', items: S7.ABOUT.testing },
  { title: 'ENGINE FEEDBACK', items: S7.ABOUT.engine },
  { title: 'PROMPT FEEDBACK', items: S7.ABOUT.prompt },
  { title: 'CREDITS', items: [
    ['', 'SKILLER7 — SEVEN KILLERS, ONE MOUNTAIN. An original game. Design, code, art, music and words by code, from a plan.'],
    ['Made with', 'my-3D2dge v0.85.2 and its 3D module (MIT) · three.js r182 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub session client 1.4.0'],
    ['Asset store entries', 'Converted from Kenney (Holiday, Furniture, Nature) and KayKit (Furniture Bits) CC0 sets.'],
    ['Inspired by', 'Killer7 (Grasshopper Manufacture / Capcom, 2005). An original game; no affiliation.']
  ] }
];
S7.CREDITS = [
  ['', 'SKILLER7', 3], ['', 'SEVEN KILLERS, ONE MOUNTAIN', 1], ['', ''],
  ['THE SEVEN', 'Ansel · Dagny · Ignaz · Rurik · Kasimir · Mireille · Brigid'], ['IN THE BED', 'Oma Holle'], ['KNITTING', 'Sister Rosalind'], ['ON THE PHONE', 'The Concierge'],
  ['THE WIND', 'Mister Föhn'], ['COUNTING', 'Pim the Lift Boy'], ['GRATUITY', 'Murmel'], ['CHECKED OUT', 'Augustin Grau · Die Lustigen Vier · Hansi Pulver'], ['', ''],
  ['ENGINE', 'my-3D2dge v0.85.2 and its 3D module'], ['3D', 'three.js r182 · Rapier 0.19.3'], ['ONLINE', 'AI Hub Session Protocol v1'], ['SHAPES', 'Kenney and KayKit CC0 sets, converted'], ['', ''],
  ['INSPIRED BY', 'Killer7 (Grasshopper Manufacture / Capcom, 2005)'], ['', 'An original game. No affiliation.'], ['', ''],
  ['MODEL', 'Anthropic claude-opus-5-5 · xhigh'], ['', 'THE SNOW WILL CONTINUE.', 2]
];


/* ===== content/areas/00A-lobby.js ===== */
/* TARGET 00 · 00A GRAND HOTEL NADA, THE LOBBY (§11.7): marble checkerboard, a red runner, chandeliers, the bar behind
 * a velvet rope, a mezzanine up the stairs to the staff stairwell. The first Whiteout, Murmel, Pim, the bar phone. */
S7.area('00A', {
  title: 'GRAND HOTEL NADA', sub: 'LOBBY', target: 0, music: 'hotel', ambience: 'roomtone', pinNo: 1,
  world: { kind: 'level', w: 36, h: 27, wallH: 7,
    rooms: [[2, 2, 34, 25]], walls: [[13, 2, 14, 9, 7], [13, 14, 14, 25, 7]],
    raised: [[14, 2, 30, 6, 4]], stairs: [[20, 6, 23, 11, 'n', 0, 4]],
    pillars: [[17, 14], [17, 19], [30, 14], [30, 19]],
    ground: 'tiles', colors: { base: '#e8e4dc', dark: '#2a2226', light: '#f4f0ea' }, side: 'block', wallColor: '#5a1e24', raisedSide: 'block',
    sky: '#05040a', fog: { color: '#0a0608', near: 260, far: 900 }, ambient: ['#5a4048', '#140a0e', 1.25], lights: 6, palette: 'hotel' },
  nodes: {
    r7: { t: [31.5, 21.5], kind: 'door', label: 'ROOM 7' },
    j1: { t: [24.5, 21.5], kind: 'junction', label: 'RECEPTION' },
    s1: { t: [15.5, 21.5], kind: 'npc', label: 'LUGGAGE RACK' },
    d0: { t: [24.5, 24.0], kind: 'stop', label: 'REVOLVING DOOR' },
    j2: { t: [24.5, 14.5], kind: 'junction', label: 'LOBBY' },
    j4: { t: [31.5, 11.5], kind: 'stop', label: 'ELEVATORS' },
    j3: { t: [21.5, 11.5], kind: 'junction', label: 'STAIRS' },
    g1: { t: [16.5, 11.5], kind: 'stop', label: 'BAR' },
    b1: { t: [8.5, 11.5], kind: 'stop', label: 'BAR' },
    b2: { t: [4.5, 11.5], kind: 'stop', label: 'BEHIND THE BAR' },
    m1: { t: [21.5, 4.5], kind: 'stop', label: 'MEZZANINE' },
    x1: { t: [21.5, 2.7], kind: 'exit', label: 'STAIRWELL', to: ['00B', 'x1'], needs: { item: 'servicekey' }, line: 'Locked. STAFF ONLY.' }
  },
  edges: [
    { a: 'r7', b: 'j1' }, { a: 'j1', b: 's1' }, { a: 'j1', b: 'd0' }, { a: 'j1', b: 'j2' },
    { a: 'j2', b: 'j4' }, { a: 'j2', b: 'j3' }, { a: 'j3', b: 'g1', gate: 'rope' }, { a: 'g1', b: 'b1' }, { a: 'b1', b: 'b2' },
    { a: 'j3', b: 'm1', kind: 'stairs', via: [[21.5, 8.5]] }, { a: 'm1', b: 'x1' }
  ],
  gates: { rope: { kind: 'buyout', price: 20, who: 'rurik', solver: 'rurik', label: 'MEMBERS ONLY', icon: 'rope' } },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7', label: 'Room 7' },
    { id: 'murmel', kind: 'murmel', node: 's1', label: 'Murmel' },
    { id: 'pim', kind: 'pim', at: [32.5, 11.5], talk: 'pim_00A', label: 'Pim', reach: 3 },
    { id: 'pin1', kind: 'pin', pin: 1, node: 'j4' },
    { id: 'phone', kind: 'phone', at: [9.5, 12.6], talk: 'concierge_bar', label: 'House phone', reach: 2.6 },
    { id: 'rime1', kind: 'rime', n: 4, edge: 'b1-b2', s: .5 },
    { id: 'rime2', kind: 'rime', n: 3, edge: 'j2-j4', s: .7 },
    { id: 'red1', kind: 'red', n: 10, edge: 'j1-d0', s: .6 },
    { id: 'red2', kind: 'red', n: 8, edge: 'r7-j1', s: .5 },
    { id: 'file', kind: 'dossier', dossier: 'graufile', edge: 'j1-s1', s: .2 },
    { id: 'key', kind: 'item', item: 'servicekey', node: 'b2' },
    { id: 'revolve', kind: 'sign', node: 'd0', line: 'The revolving door won\'t turn. Outside, the storm leans on it.' },
    { id: 'stairwell', kind: 'exit', node: 'x1', label: 'Stairwell' }
  ],
  spawns: { first: [33.2, 13.2], elev1: [33.2, 10], elev2: [33.2, 12.6], elev3: [32.6, 8.4], bar1: [3.5, 7], bar2: [3.5, 16], bar3: [10.5, 16.5], mezz1: [28.5, 3.5], mezz2: [15.5, 3.5], hall1: [8, 22], hall2: [29, 23.5] },
  waves: {
    first: { spawn: [['giggler', 'first', 0, { warm: 'chest', speedK: .8 }]], set: 'firstClear' },
    elev: { spawn: [['giggler', 'elev1', 0], ['giggler', 'elev2', 1.2], ['giggler', 'elev3', 2.4]] },
    bar: { spawn: [['giggler', 'bar1', 0], ['giggler', 'bar2', .8], ['bellboy', 'bar3', 2]] },
    mezz: { spawn: [['bellboy', 'mezz1', 0], ['bellboy', 'mezz2', 1.5]] },
    hall: { spawn: [['giggler', 'hall1', 0], ['bellboy', 'hall2', 1.5]] }
  },
  triggers: [
    { id: 'first', edge: 'j1-j2', s: .35, beat: 't00_first_whiteout' },
    { id: 'elev', node: 'j4', wave: 'elev', flag: 'firstClear' },
    { id: 'bar', node: 'b1', wave: 'bar' },
    { id: 'mezz', edge: 'j3-m1', s: .3, wave: 'mezz' },
    { id: 'hall', node: 's1', wave: 'hall', flag: 'murmelMet' },
    { id: 'ropetip', node: 'j3', beat: 't00_rope_tip' },
    { id: 'walktip', onEnter: true, tut: 'walk', notFlag: 'walkTipDone' }
  ],
  props: [
    ['shape', 'S7:reception-desk', 24.5, 23.2, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:service-bell-small', 25.2, 23.2, 1.1, {}],
    ['shape', 'S7:luggage-rack', 14.6, 22.8, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:bar-counter', 6.5, 9, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:bar-counter', 6.5, 14, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:bottle-shelf', 2.6, 11.5, 0, { facing: 0 }],
    ['shape', 'S7:fireplace', 2.5, 18, 0, { facing: 0 }],
    ['shape', 'kenney-furniture:lounge-sofa', 7, 20, 0, { facing: 0, scale: 1.3 }],
    ['shape', 'kenney-furniture:lounge-chair', 9.6, 22.4, 0, { facing: -Math.PI * .6, scale: 1.3 }],
    ['shape', 'kenney-furniture:lounge-design-sofa', 27.5, 17.2, 0, { facing: Math.PI / 2, scale: 1.3 }],
    ['shape', 'kenney-furniture:side-table', 21.5, 17.2, 0, { scale: 1.3 }],
    ['shape', 'S7:elevator-doors', 33.6, 10, 0, { facing: Math.PI }],
    ['shape', 'S7:elevator-doors', 33.6, 13, 0, { facing: Math.PI, params: { open: .4 } }],
    ['shape', 'S7:revolving-door', 24.5, 24.9, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:velvet-stanchion', 17.6, 10.6, 0, {}], ['shape', 'S7:velvet-stanchion', 17.6, 12.4, 0, {}],
    ['shape', 'S7:potted-palm', 19, 23.6, 0, {}], ['shape', 'S7:potted-palm', 29.6, 23.6, 0, {}], ['shape', 'S7:potted-palm', 14.6, 15, 0, {}],
    ['shape', 'S7:luggage-cart', 28.5, 23.4, 0, { facing: .4 }],
    ['shape', 'S7:suitcase', 15.4, 23, 0, { facing: .2 }], ['shape', 'S7:suitcase', 13.8, 22.6, 0, { facing: -.4 }],
    ['thing', 'chandelier', 20, 14.5, 6.2], ['thing', 'chandelier', 27.5, 19, 6.2], ['thing', 'chandelier', 7, 11.5, 5.4],
    ['thing', 'runner', 24.5, 18, 0, { w: 2, d: 13, color: '#8a1420' }], ['thing', 'runner', 21.5, 8.5, 0, { w: 2.2, d: 6, color: '#8a1420', stairs: true }],
    ['light', 20, 14.5, 5.6, { color: '#ffd8a0', reach: 230, power: 4.5, flicker: .03 }],
    ['light', 27.5, 19, 5.6, { color: '#ffd8a0', reach: 230, power: 4.5, flicker: .03 }],
    ['light', 7, 11.5, 4.8, { color: '#ffb070', reach: 170, power: 3.4, flicker: .05 }],
    ['light', 24.5, 25.5, 3, { color: '#7a90ff', reach: 160, power: 2.2 }],
    ['light', 32.5, 11.5, 2.6, { color: '#c0ffd0', reach: 110, power: 1.6, flicker: .3 }],
    ['light', 21.5, 3.5, 6.5, { color: '#ffd0a0', reach: 160, power: 2 }]
  ],
  people: [{ who: 'murmel', at: [14.4, 22.6], z: .4 }, { who: 'pim', at: [33, 11.5], z: .8, lift: true }],
  blocks: [[23, 22.8, 0, 26, 23.6, 1.1]]
});


/* ===== content/areas/00B-thirdfloor.js ===== */
/* TARGET 00 · 00B THE THIRD FLOOR (§11.7): a long corridor of numbered doors that open behind you, a hole in the floor
 * (Dagny's jump), the ceiling that falls (the Sweep's rescue), Room 7 "3-7", the lookout across the light well where the
 * giant service bell hangs, far (Ignaz's Long Look), and the shaft doors to Grau. */
S7.area('00B', {
  title: 'GRAND HOTEL NADA', sub: 'THIRD FLOOR', target: 0, music: 'hotel', ambience: 'roomtone', sweepNode: 'r7b',
  world: { kind: 'level', w: 120, h: 18, wallH: 3.6,
    rooms: [[1, 8, 30, 11], [10, 3, 16, 8], [16, 11, 22, 16], [34, 8, 66, 11], [42, 11, 48, 16], [43, 6, 46, 8], [52, 1, 58, 8]],
    pits: [[30, 8, 34, 11], [58, 1, 119, 7]],
    ground: 'planks', colors: { base: '#4a5a40', dark: '#2a3424', light: '#6a7a58' }, side: 'block', wallColor: '#a8b49a', wallTop: '#2a3020',
    sky: '#020403', fog: { color: '#0c100c', near: 150, far: 700 }, ambient: ['#3a4a38', '#0c100a', 1.2], lights: 6, palette: 'thirdfloor' },
  nodes: {
    x1: { t: [2.5, 9.5], kind: 'exit', label: 'STAIRWELL', to: ['00A', 'x1'], always: true },
    c1: { t: [8.5, 9.5], kind: 'pass' },
    j5: { t: [15.5, 9.5], kind: 'junction', label: 'ROOMS 305 · 306' },
    r305: { t: [12.5, 5.5], kind: 'stop', label: 'ROOM 305' },
    r306: { t: [18.5, 13.5], kind: 'stop', label: 'ROOM 306' },
    c2: { t: [24.5, 9.5], kind: 'stop', label: 'ROOM SERVICE' },
    g2: { t: [29.2, 9.5], kind: 'stop', label: 'THE HOLE' },
    lz: { t: [35.5, 9.5], kind: 'pass' },
    c3: { t: [39.5, 9.5], kind: 'pass' },
    j6: { t: [44.5, 9.5], kind: 'junction', label: '3-7' },
    r7b: { t: [44.5, 7.0], kind: 'door', label: 'ROOM 7 · "3-7"' },
    r312: { t: [45, 13.5], kind: 'stop', label: 'ROOM 312' },
    c4: { t: [55.5, 9.5], kind: 'junction', label: 'CORRIDOR END' },
    l1: { t: [55.5, 3.5], kind: 'stop', label: 'LOOKOUT' },
    sh: { t: [64.5, 9.5], kind: 'exit', label: 'SERVICE SHAFT', to: ['00C', 's1'], open: true, needs: { flag: 'bellRung' }, line: 'The shaft doors are shut. Ring for service.' }
  },
  edges: [
    { a: 'x1', b: 'c1' }, { a: 'c1', b: 'j5' }, { a: 'j5', b: 'r305' }, { a: 'j5', b: 'r306' }, { a: 'j5', b: 'c2' }, { a: 'c2', b: 'g2' },
    { a: 'g2', b: 'lz', kind: 'jump', apex: 1.6, label: 'JUMP' },
    { a: 'lz', b: 'c3' }, { a: 'c3', b: 'j6' }, { a: 'j6', b: 'r7b' }, { a: 'j6', b: 'r312' }, { a: 'j6', b: 'c4' }, { a: 'c4', b: 'l1' }, { a: 'c4', b: 'sh', gate: 'shaft' }
  ],
  gates: { shaft: { kind: 'flag', flag: 'bellRung', label: 'SHAFT DOORS', solver: 'ignaz', line: 'The shaft doors are shut. Ring for service.' } },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7b', label: 'Room 7 · "3-7"' },
    { id: 'pin2', kind: 'pin', pin: 2, node: 'c2' },
    { id: 'menu', kind: 'dossier', dossier: 'roomservice', node: 'r305' },
    { id: 'red305', kind: 'red', n: 12, edge: 'j5-r305', s: .6 },
    { id: 'rime306', kind: 'rime', n: 4, node: 'r306' },
    { id: 'rime312', kind: 'rime', n: 4, node: 'r312' },
    { id: 'rimeL', kind: 'rime', n: 3, edge: 'c4-l1', s: .5 },
    { id: 'red1', kind: 'red', n: 10, edge: 'c1-j5', s: .5 },
    { id: 'red2', kind: 'red', n: 10, edge: 'c3-j6', s: .5 },
    { id: 'pim', kind: 'pim', at: [56.5, 9.5], talk: 'pim_00B', label: 'Pim', reach: 3 },
    { id: 'hole', kind: 'sign', node: 'g2', line: 'The floor has fallen through. The other side is five metres off. Someone in a hurry might clear it.' },
    { id: 'bell', kind: 'far', target: true, far: true, at: [116, 4], atZ: 2.6, r: 1.4, beat: 't00_bell', label: 'THE SERVICE BELL' },
    { id: 'stair', kind: 'exit', node: 'x1', label: 'Stairwell' }
  ],
  spawns: { d1: [5.5, 9.5], d2: [12.5, 7.5], d3: [11.5, 9.5], d4: [21.5, 9.5], d5: [18.5, 11.5], cart: [28.5, 9.6], tw: [20.5, 14.5], res1: [47.5, 9.5], res2: [50.5, 9.5], b312a: [46.5, 15], b312b: [43, 15], end1: [61.5, 9.5], end2: [63.5, 9.2] },
  waves: {
    doors1: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', .6]] },
    doors2: { spawn: [['giggler', 'd3', 0], ['giggler', 'd4', .4], ['bellboy', 'd5', 1.2]] },
    twins: { spawn: [['twins', 'tw', 0]] },
    cart: { spawn: [['snowballer', 'cart', 0]] },
    rescue: { spawn: [['giggler', 'res1', 0], ['giggler', 'res2', 1.4]] },
    r312: { spawn: [['bellboy', 'b312a', 0], ['bellboy', 'b312b', .8]] },
    shaftguard: { spawn: [['giggler', 'end1', 0], ['bellboy', 'end2', 1], ['giggler', 'end1', 3]] }
  },
  triggers: [
    { id: 'doors1', edge: 'c1-j5', s: .4, wave: 'doors1', tut: 'quickturn' },
    { id: 'doors2', edge: 'j5-c2', s: .3, wave: 'doors2' },
    { id: 'twins', node: 'r306', wave: 'twins' },
    { id: 'cart', edge: 'j5-c2', s: .5, wave: 'cart' },
    { id: 'collapse', edge: 'lz-c3', s: .6, beat: 't00_collapse', flag: 'jumped' },
    { id: 'jumped', node: 'lz', set: 'jumped' },
    { id: 'r312', node: 'r312', wave: 'r312' },
    { id: 'shaft', node: 'c4', wave: 'shaftguard', flag: 'bellRung' },
    { id: 'jumptip', node: 'g2', tut: 'jump' },
    { id: 'longtip', node: 'l1', tut: 'longlook' }
  ],
  props: [
    ['shape', 'S7:room-door', 6, 7.9, 0, { facing: Math.PI / 2 }], ['shape', 'S7:room-door', 11.5, 11.1, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:room-door', 21.5, 7.9, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:room-door', 26.5, 11.1, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:room-door', 38, 7.9, 0, { facing: Math.PI / 2 }], ['shape', 'S7:room-door', 52, 11.1, 0, { facing: -Math.PI / 2 }],
    ['shape', 'S7:room7-door', 44.5, 6.1, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:room-service-cart', 25, 10.4, 0, { facing: 0 }], ['shape', 'S7:room-service-cart', 28.3, 10.2, 0, { facing: .5 }],
    ['shape', 'kaykit-furniture-bits:bed-single-a', 12, 4.5, 0, { facing: Math.PI / 2, scale: 1.3 }], ['shape', 'kaykit-furniture-bits:bed-double-a', 19.5, 14.5, 0, { facing: -Math.PI / 2, scale: 1.3 }],
    ['shape', 'kaykit-furniture-bits:bed-single-b', 45.5, 14.6, 0, { facing: -Math.PI / 2, scale: 1.3 }], ['shape', 'kaykit-furniture-bits:cabinet-small', 14.6, 4, 0, { scale: 1.3 }],
    ['shape', 'S7:sconce', 1.2, 9.5, 2, { facing: 0 }], ['shape', 'S7:sconce', 33.8, 9.5, 2, { facing: 0 }],
    ['shape', 'S7:service-bell-big', 116, 4, 2.6, { facing: Math.PI }],
    ['thing', 'runner', 15.5, 9.5, 0, { w: 28, d: 1.6, color: '#3a5a30' }], ['thing', 'runner', 50, 9.5, 0, { w: 30, d: 1.6, color: '#3a5a30' }],
    ['thing', 'bellbig', 116, 4, 2.6],
    ['light', 8.5, 9.5, 3.2, { color: '#d8f0c0', reach: 110, power: 2.2, flicker: .08 }],
    ['light', 22, 9.5, 3.2, { color: '#d8f0c0', reach: 110, power: 2.2, flicker: .6 }],
    ['light', 40, 9.5, 3.2, { color: '#d8f0c0', reach: 120, power: 2.4, flicker: .05 }],
    ['light', 55, 4, 3, { color: '#c0d8ff', reach: 140, power: 2.4 }],
    ['light', 116, 4, 5, { color: '#ffe8b0', reach: 140, power: 2.6 }],
    ['light', 62, 9.5, 3, { color: '#ff4030', reach: 90, power: 2 }]
  ],
  people: [{ who: 'pim', at: [56.5, 9.5], z: .6 }]
});

/* TARGET 00 · 00C THE SERVICE SHAFT: Grau's arena. A ring rail round the shaft floor; the car above (§11.8) */
S7.area('00C', {
  title: 'THE SERVICE SHAFT', sub: 'BELLCAPTAIN GRAU', target: 0, music: 'shaft', ambience: 'roomtone', boss: 'grau',
  world: { kind: 'level', w: 16, h: 16, wallH: 30, rooms: [[3, 3, 13, 13]], ground: 'plain', colors: { base: '#2a2626', dark: '#141212', light: '#3a3434' }, side: 'metal', wallColor: '#2a2a30', wallTop: '#141418',
    sky: '#000000', fog: { color: '#100406', near: 200, far: 900 }, ambient: ['#3a3038', '#0a0606', 1.1], lights: 5 },
  nodes: { s1: { t: [5.2, 10.8], kind: 'stop', label: 'SOUTH-WEST' }, n2: { t: [10.8, 10.8], kind: 'stop', label: 'SOUTH-EAST' }, n3: { t: [10.8, 6.2], kind: 'stop', label: 'NORTH-EAST' }, n4: { t: [5.2, 6.2], kind: 'stop', label: 'NORTH-WEST' } },
  edges: [{ a: 's1', b: 'n2' }, { a: 'n2', b: 'n3' }, { a: 'n3', b: 'n4' }, { a: 'n4', b: 's1' }],
  spots: [], spawns: { top1: [6, 8], top2: [10, 8], top3: [8, 9] }, waves: {}, triggers: [],
  props: [
    ['thing', 'beacon', 3.4, 3.4, 4], ['thing', 'beacon', 12.6, 12.6, 4],
    ['light', 8, 8, 4, { color: '#ff2020', reach: 140, power: .9, flicker: .2, tag: 'beacon' }],
    ['light', 8, 3.5, 12, { color: '#ffe0b0', reach: 260, power: 3.4, tag: 'car' }], ['light', 8, 12, 2.5, { color: '#c8d0ff', reach: 160, power: 1.2 }]
  ],
  onEnter(sim) { sim.startBoss('grau', 0); },
  /** looking past the hero, up the shaft at the car */
  camera(sim, h) { if (sim.aim.on || sim.camOverride || !sim.boss) return null; const car = [8 * M, 3.7 * M, (sim.boss.car ? sim.boss.car.z : 96) + 24], d = Math.atan2(car[1] - h.y, car[0] - h.x); const back = Math.min(3.8 * M, Math.hypot(h.x - 8 * M, h.y - 8 * M) + 1.4 * M); return sim.cam.aimSafe(h, [h.x - Math.cos(d) * back + Math.cos(d + 1.57) * 1.6 * M, h.y - Math.sin(d) * back + Math.sin(d + 1.57) * 1.6 * M, h.z + 2.6 * M], [car[0] * .6 + h.x * .4, car[1] * .6 + h.y * .4, car[2] * .7 + h.z * .3], 66); }
});


/* ===== content/areas/01A-village.js ===== */
/* TARGET 01 · 01A OBERGLÜCK, THE VILLAGE (§11.7): dusk, snow, timber chalets, the Glühwein market, the frozen fountain,
 * the church whose bell (Ignaz, far) shakes the drift off the lift station, the turnstile (Rurik) to the T-bar, the
 * ski school (Murmel), the Delegate Gate to the gondola (three Edelweiss), and the Palais gate. */
const chalet = (x0, y0, x1, y1, h = 5) => [x0, y0, x1, y1, h];
S7.area('01A', {
  title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'wind', outdoor: true, pinNo: 3,
  world: { kind: 'level', w: 84, h: 46, wallH: 5,
    rooms: [[2, 2, 82, 44]],
    walls: [chalet(3, 26, 13, 41, 9), chalet(2, 4, 12, 10, 6), [5, 10, 8, 13, 14], chalet(20, 4, 30, 12), chalet(47, 6, 56, 12), chalet(20, 20, 30, 28), chalet(20, 36, 30, 44), chalet(46, 37, 53, 44), chalet(68, 9, 80, 13), chalet(67, 20, 80, 30), chalet(55, 35, 61, 40)],
    ground: 'snow', colors: { base: '#e6ecf6', dark: '#b8c4da', light: '#ffffff' }, side: 'planks', wallColor: '#6a4428', wallTop: '#f4f8ff', wallLine: '#3a2414',
    sky: ['#1e1c3a', '#d88a60'], fog: { color: '#4a3a58', near: 380, far: 1500 }, ambient: ['#8a8ab0', '#4a3a40', 1.25], lights: 6,
    sun: { color: '#ffb070', intensity: 1.7, dir: [.85, .25, -.38], shadow: true }, snow: 420, wind: [.5, .15], postcard: ['#2a2450', '#c87a5a'] },
  nodes: {
    ht: { t: [16.5, 32.5], kind: 'stop', label: 'GRAND HOTEL STEPS' },
    ls: { t: [40.5, 32.5], kind: 'junction', label: 'LIFT SQUARE' },
    tq: { t: [50.5, 32.5], kind: 'stop', label: 'T-BAR QUEUE' },
    tb: { t: [62.5, 32.5], kind: 'exit', label: 'T-BAR', to: ['01C', 'tbot'], open: true },
    f2: { t: [40.5, 24.5], kind: 'junction', label: 'FOUNTAIN' },
    f1: { t: [40.5, 16.5], kind: 'junction', label: 'FOUNTAIN' },
    pg: { t: [40.5, 4.5], kind: 'exit', label: 'PALAIS DES NEIGES', to: ['01B', 'e1'], open: true },
    ch: { t: [16.5, 16.5], kind: 'stop', label: 'CHURCH SQUARE' },
    mk: { t: [62.5, 16.5], kind: 'junction', label: 'MARKET' },
    r7a: { t: [77.5, 16.5], kind: 'door', label: 'ROOM 7 · BAKERY' },
    mu: { t: [62.5, 24.5], kind: 'stop', label: 'SKI SCHOOL' },
    gg: { t: [40.5, 41.5], kind: 'exit', label: 'HIMMELSBAHN', to: ['01D', 'gs'], open: true }
  },
  edges: [
    { a: 'ht', b: 'ls' }, { a: 'ls', b: 'tq', gate: 'drift' }, { a: 'tq', b: 'tb', gate: 'turnstile' },
    { a: 'ls', b: 'f2' }, { a: 'f2', b: 'f1', via: [[44, 20.5]] }, { a: 'f1', b: 'ch' }, { a: 'f1', b: 'mk' }, { a: 'mk', b: 'r7a' }, { a: 'mk', b: 'mu' }, { a: 'f2', b: 'mu' },
    { a: 'f1', b: 'pg' }, { a: 'ls', b: 'gg', gate: 'delegate' }
  ],
  gates: {
    drift: { kind: 'flag', flag: 'churchBell', label: 'BURIED', solver: 'ignaz', line: 'The lift station is buried under a roof of snow. Something has to shake it loose.' },
    turnstile: { kind: 'buyout', price: 40, solver: 'rurik', label: 'TURNSTILE · 40 RED' },
    delegate: { kind: 'delegate', label: 'DELEGATES ONLY', beat: 'delegate_gate' }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7a', label: 'Room 7 · the bakery' },
    { id: 'murmel', kind: 'murmel', node: 'mu', label: 'Murmel' },
    { id: 'pim', kind: 'pim', at: [43.5, 20.5], talk: 'pim_01A', label: 'Pim', reach: 3.4 },
    { id: 'pin3', kind: 'pin', pin: 3, edge: 'f2-f1', s: .5 },
    { id: 'phone', kind: 'phone', at: [38.6, 40.6], talk: 'concierge_gate', label: 'Phone booth', reach: 2.8 },
    { id: 'v1', kind: 'tableau', at: [14.5, 15], who: 'villager', label: 'A frozen villager', line: 'It hasn\'t stopped snowing since Grandmother was a girl.', reach: 3 },
    { id: 'v2', kind: 'tableau', at: [18.5, 18.2], who: 'villager', label: 'A frozen villager', line: 'The Föhn came through Tuesday. My husband laughed until he wasn\'t there.', reach: 3 },
    { id: 'v3', kind: 'tableau', at: [64.5, 22.6], who: 'villager', label: 'A frozen ski instructor', line: 'Bend the knees. Bend the truth. Same muscles.', reach: 3 },
    { id: 'price', kind: 'dossier', dossier: 'pricelist', node: 'mu' },
    { id: 'rime1', kind: 'rime', n: 4, edge: 'f1-ch', s: .3 },
    { id: 'rime2', kind: 'rime', n: 4, edge: 'mk-r7a', s: .6 },
    { id: 'red1', kind: 'red', n: 12, edge: 'ht-ls', s: .5 },
    { id: 'red2', kind: 'red', n: 10, edge: 'f1-mk', s: .4 },
    { id: 'red3', kind: 'red', n: 10, edge: 'mk-mu', s: .5 },
    { id: 'bell', kind: 'far', target: true, far: true, at: [6.5, 13.3], atZ: 11.6, r: 1.5, beat: 'church_bell', label: 'THE CHURCH BELL' },
    { id: 'hotel', kind: 'sign', node: 'ht', line: 'The Grand Hotel Nada. The bellcaptain\'s post is empty. Somebody has already hung a black ribbon on it.' },
    { id: 'gate', kind: 'sign', at: [40.5, 39.5], line: 'HIMMELSBAHN — DELEGATES ONLY. Three Edelweiss passes, please. The slots are shaped like flowers.', reach: 2.6 }
  ],
  spawns: { m1: [60.5, 19.5], m2: [66.5, 15.5], m3: [58.5, 14.5], mplow: [70.5, 16.5], mroof: [51.5, 9], c1: [12.5, 18.5], c2: [20.5, 14.5], sl1: [56.5, 30], sl2: [60.5, 34.5], h1: [30.5, 33], h2: [34.5, 30] },
  waves: {
    market: { spawn: [['giggler', 'm1', 0], ['giggler', 'm2', 1], ['plow', 'mplow', 1.5], ['snowballer', 'mroof', 0, { z: 58 }], ['giggler', 'm3', 3]] },
    church: { spawn: [['twins', 'c1', 0], ['twins', 'c2', 1.5]] },
    sleds: { spawn: [['tobogganer', 'sl1', 0], ['tobogganer', 'sl2', 1.2], ['giggler', 'sl1', 3]] },
    hotel: { spawn: [['giggler', 'h1', 0], ['bellboy', 'h2', 1]] }
  },
  triggers: [
    { id: 'market', node: 'mk', wave: 'market' },
    { id: 'church', node: 'ch', wave: 'church' },
    { id: 'sleds', node: 'tq', wave: 'sleds', flag: 'churchBell' },
    { id: 'hotel', edge: 'ht-ls', s: .6, wave: 'hotel' },
    { id: 'lookout', node: 'mk', tut: 'longlook', flag: 'driftSeen' },
    { id: 'drift', node: 'ls', set: 'driftSeen' },
    { id: 'pim', node: 'f1', beat: 'pim_01A_seen' }
  ],
  props: [
    ['shape', 'S7:church-tower', 6.5, 11.5, 0, {}],
    ['shape', 'S7:chalet-roof', 7, 7, 6, { params: { w: 160, d: 96 } }],
    ['shape', 'S7:chalet-roof', 25, 8, 5, { params: { w: 160, d: 128 } }], ['shape', 'S7:chalet-roof', 51.5, 9, 5, { params: { w: 144, d: 96 } }],
    ['shape', 'S7:chalet-roof', 25, 24, 5, { params: { w: 160, d: 128 } }], ['shape', 'S7:chalet-roof', 25, 40, 5, { params: { w: 160, d: 128 } }],
    ['shape', 'S7:chalet-roof', 49.5, 40.5, 5, { params: { w: 112, d: 112 } }], ['shape', 'S7:chalet-roof', 74, 11, 5, { params: { w: 192, d: 64 } }],
    ['shape', 'S7:chalet-roof', 73.5, 25, 5, { params: { w: 208, d: 160 } }], ['shape', 'S7:chalet-roof', 58, 37.5, 5, { params: { w: 96, d: 80 } }],
    ['shape', 'S7:chalet-roof', 8, 33.5, 9, { params: { w: 160, d: 240 } }],
    ['shape', 'S7:fountain-frozen', 40.5, 20.5, 0, {}],
    ['shape', 'S7:gluehwein-stall', 58.5, 13.5, 0, { facing: Math.PI / 2 }], ['shape', 'S7:gluehwein-stall', 66.5, 19.5, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:gluehwein-stall', 70.5, 13.5, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:phone-booth', 38.6, 41, 0, {}],
    ['shape', 'S7:ski-rack', 64.5, 21.5, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:lift-hut', 58, 37.5, 0, {}],
    ['shape', 'S7:turnstile', 55.5, 32.5, 0, {}],
    ['shape', 'kenney-holiday:tree-decorated-snow', 44.5, 27.5, 0, { scale: 2.2 }], ['shape', 'kenney-holiday:tree-snow-b', 33.5, 14, 0, { scale: 2.4 }], ['shape', 'kenney-holiday:tree-snow-c', 14, 22.5, 0, { scale: 2.4 }],
    ['shape', 'kenney-holiday:snowman-hat', 34, 30, 0, { scale: 1.8, facing: .4 }], ['shape', 'kenney-holiday:sled-long', 46, 28.5, 0, { scale: 1.4 }], ['shape', 'kenney-holiday:snow-pile', 31.5, 18, 0, { scale: 2 }],
    ['shape', 'kenney-holiday:bench', 36.5, 23, 0, { scale: 1.6, facing: Math.PI / 2 }], ['shape', 'kenney-holiday:cabin-fence', 30.5, 34.5, 0, { scale: 1.6 }],
    ['thing', 'drift', 47.5, 32.5, 0], ['thing', 'stringlights', 56, 15, 4.2, { dx: 16, dy: 0, n: 14 }], ['thing', 'stringlights', 40.5, 8, 4.2, { dx: 0, dy: 10, n: 10 }],
    ['thing', 'fire', 58.5, 14.5, .2], ['thing', 'fire', 66.5, 18.5, .2], ['thing', 'fire', 70.5, 14.5, .2],
    ['thing', 'gateslots', 40.5, 39.8, 0],
    ['light', 58.5, 14.5, 1.2, { color: '#ff9040', reach: 140, power: 3, flicker: .25 }], ['light', 66.5, 18.5, 1.2, { color: '#ff9040', reach: 140, power: 3, flicker: .25 }],
    ['light', 40.5, 20.5, 4, { color: '#ffd8a0', reach: 200, power: 2 }], ['light', 16.5, 32.5, 4, { color: '#ffd8a0', reach: 160, power: 2.2 }],
    ['light', 77.5, 16.5, 3, { color: '#ffe0b0', reach: 120, power: 2 }], ['light', 40.5, 40, 3.5, { color: '#c0d0ff', reach: 140, power: 1.8 }]
  ],
  people: [{ who: 'murmel', at: [63.4, 22.6], z: .4 }, { who: 'pim', at: [43.5, 20.5], z: 1.4 },
    { who: 'villager', at: [14.5, 15], pose: 'wave', facing: .4 }, { who: 'villager', at: [18.5, 18.2], pose: 'hips', facing: -2.4 }, { who: 'villager', at: [64.5, 22.6], pose: 'crouch', facing: 2.6 }]
});


/* ===== content/areas/01B-palais.js ===== */
/* TARGET 01 · 01B PALAIS DES NEIGES (§11.7): the conference palace. Security, the atrium (the Concierge on Article
 * Nine), the frozen Coastal and Steppe delegations, the Inspector (Edelweiss 1), the dark press room where Mireille's
 * flash develops the blackboard, the safe (2-6-0-1: the Ember Charm), the Hall of Mirrors whose Echo Wall Kasimir sings
 * open, and the ballroom: Die Lustigen Vier. */
S7.area('01B', {
  title: 'PALAIS DES NEIGES', sub: 'THE THAW ACCORD', target: 1, music: 'palais', ambience: 'roomtone', pinNo: 4,
  world: { kind: 'level', w: 56, h: 42, wallH: 6,
    rooms: [[2, 17, 16, 24], [16, 14, 26, 27], [16, 27, 26, 34], [16, 34, 26, 41], [26, 27, 36, 34], [26, 34, 36, 41], [26, 17, 36, 24], [36, 19, 46, 22], [46, 17, 52, 24], [38, 24, 54, 41]],
    walls: [[26, 34, 31, 35, 6]], raised: [[40, 25, 52, 29, 1]],
    ground: 'tiles', colors: { base: '#d8dce4', dark: '#3a4050', light: '#eef0f4' }, side: 'block', wallColor: '#4a5068', wallTop: '#20242e', raisedSide: 'planks', raisedColor: '#5a2a1a',
    sky: '#04050a', fog: { color: '#0a0c14', near: 260, far: 900 }, ambient: ['#5a6078', '#14161e', 1.25], lights: 6, postcard: ['#101830', '#4a5a8a'] },
  nodes: {
    e1: { t: [4.5, 20.5], kind: 'exit', label: 'TO THE VILLAGE', to: ['01A', 'pg'] },
    sc: { t: [10.5, 20.5], kind: 'stop', label: 'SECURITY' },
    at: { t: [21, 20.5], kind: 'junction', label: 'ATRIUM' },
    cf: { t: [21, 30.5], kind: 'junction', label: 'COASTAL HALL' },
    pr: { t: [21, 38], kind: 'stop', label: 'PRESS ROOM' },
    sd: { t: [31, 30.5], kind: 'junction', label: 'STEPPE HALL' },
    ck: { t: [32.5, 38], kind: 'door', label: 'CLOAKROOM · ROOM 7' },
    hm: { t: [31, 20.5], kind: 'junction', label: 'HALL OF MIRRORS' },
    sp: { t: [41.5, 20.5], kind: 'stop', label: 'SERVANTS\' PASSAGE' },
    bb: { t: [49, 20.5], kind: 'stop', label: 'BACKSTAGE' },
    br: { t: [46, 33], kind: 'stop', label: 'BALLROOM' },
    bx: { t: [48.5, 40], kind: 'exit', label: 'BACK EXIT', to: ['01A', 'f1'], open: true }
  },
  edges: [
    { a: 'e1', b: 'sc' }, { a: 'sc', b: 'at' }, { a: 'at', b: 'cf' }, { a: 'cf', b: 'pr' }, { a: 'cf', b: 'sd' }, { a: 'sd', b: 'ck', via: [[32.5, 34.5]] },
    { a: 'at', b: 'hm' }, { a: 'hm', b: 'sp', gate: 'mirrors' }, { a: 'sp', b: 'bb' }, { a: 'bb', b: 'br', via: [[53, 26.5], [50, 31]] }, { a: 'br', b: 'bx', gate: 'band' }
  ],
  gates: {
    mirrors: { kind: 'spot', label: 'A WALL OF MIRRORS', solver: 'kasimir', line: 'Your reflection grins back. Mirrors lie. Echoes don\'t.', block: [36, 19, 37, 22, 0, 6] },
    band: { kind: 'flag', flag: 'bandDead', label: 'THE BAND IS PLAYING', line: 'The doors stay shut while the band plays.' }
  },
  bandAt: [[43, 26.6], [45.5, 26.6], [48, 26.6], [50.5, 26.6]], stageZ: 1,
  spots: [
    { id: 'door7', kind: 'door7', node: 'ck', label: 'Room 7 · behind the coats' },
    { id: 'arch', kind: 'sign', node: 'sc', line: 'A metal-detector arch. It beeps at everyone. It beeped at you twice.' },
    { id: 'phone', kind: 'phone', at: [23.5, 15.4], talk: 'concierge_atrium', label: 'House phone', reach: 3.2 },
    { id: 'amb', kind: 'tableau', at: [18.5, 31.2], who: 'delegate', label: 'The Coastal Ambassador', line: 'We have nothing to hide that we haven\'t already hidden.', reach: 3 },
    { id: 'interp', kind: 'tableau', at: [23.6, 32.6], who: 'delegate', label: 'An interpreter', line: 'He says... he is sorry. He is not saying that.', reach: 3 },
    { id: 'gen', kind: 'tableau', at: [34.4, 31.6], who: 'delegate', label: 'The Steppe General', line: 'Neutrality isn\'t a place. It\'s a direction. Away.', reach: 3 },
    { id: 'sec', kind: 'tableau', at: [28.4, 32.8], who: 'delegate', label: 'A secretary', line: 'Sign here. And here. And under the ice.', reach: 3 },
    { id: 'waiter', kind: 'tableau', at: [28.6, 18.6], who: 'delegate', label: 'A waiter', line: 'The canapés were always frozen. Now they\'re honest.', reach: 3 },
    { id: 'journo', kind: 'tableau', at: [19, 39.4], who: 'delegate', label: 'A journalist', line: 'Off the record? The record is on ice.', reach: 3 },
    { id: 'safe', kind: 'codelock', at: [18.6, 29.2], code: '2601', give: { ember: 1 }, dossier: 'accord', label: 'THE COASTAL SAFE', reach: 3.4, line: 'The safe swings open. Inside: a coal that will not cool, in a silver cage.' },
    { id: 'board', kind: 'exposure', target: true, at: [21, 40.4], atZ: 1.7, r: 1.4, exposure: 'exposure1', flag: 'exposure1', dossier: 'exposure1', label: 'A BLACKBOARD' },
    { id: 'mirror', kind: 'echowall', target: true, at: [36.5, 20.5], atZ: 1.8, r: 1.6, opens: 'mirrors', flag: 'mirrorsOpen', label: 'THE ECHO WALL' },
    { id: 'pin4', kind: 'pin', pin: 4, node: 'sp' },
    { id: 'rime1', kind: 'rime', n: 4, node: 'pr' }, { id: 'rime2', kind: 'rime', n: 4, edge: 'sp-bb', s: .5 }, { id: 'rime3', kind: 'rime', n: 3, edge: 'sd-ck', s: .5 },
    { id: 'red1', kind: 'red', n: 10, edge: 'sc-at', s: .5 }, { id: 'red2', kind: 'red', n: 10, edge: 'at-hm', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'cf-sd', s: .5 },
    { id: 'leave', kind: 'exit', node: 'e1', label: 'To the village' }
  ],
  spawns: { s1: [6, 18.5], s2: [6, 22.5], s3: [14.5, 18], s4: [14.5, 23], cp: [24, 28.5], c1: [17, 33], c2: [24.5, 33], t1: [34.5, 28.5], t2: [27.5, 28.5], insp: [31, 28.6], d1: [17.5, 36], d2: [24.5, 40], d3: [18, 40],
    dance1: [39.5, 39], dance2: [52.5, 39], dance3: [39.5, 31], dance4: [52.5, 31] },
  waves: {
    security: { spawn: [['bellboy', 's1', 0], ['giggler', 's3', .5], ['bellboy', 's2', 1.4], ['giggler', 's4', 2.2]] },
    coast: { spawn: [['plow', 'cp', 0], ['giggler', 'c1', .8], ['giggler', 'c2', 1.6]] },
    steppe: { spawn: [['twins', 't1', 0], ['twins', 't2', 1.2]] },
    dark: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', 1], ['giggler', 'd3', 2]] }
  },
  triggers: [
    { id: 'security', node: 'sc', wave: 'security', tut: 'scan' },
    { id: 'coast', node: 'cf', wave: 'coast' },
    { id: 'steppe', node: 'sd', wave: 'steppe' },
    { id: 'insp', node: 'sd', beat: 'inspector', once: false, notFlag: 'edelweiss1' },
    { id: 'dark', node: 'pr', wave: 'dark', beat: 'darkroom' },
    { id: 'mirrors', node: 'hm', beat: 'mirrors_tip', notFlag: 'mirrorsOpen' },
    { id: 'band', node: 'br', beat: 'band_arrive', notFlag: 'bandDead' }
  ],
  props: [
    ['shape', 'S7:security-arch', 10.5, 20.5, 0, { facing: 0 }], ['shape', 'S7:velvet-stanchion', 10.5, 18.6, 0, {}], ['shape', 'S7:velvet-stanchion', 10.5, 22.4, 0, {}],
    ['shape', 'S7:conference-table', 21, 32.2, 0, {}], ['shape', 'S7:conference-table', 31, 32.2, 0, {}],
    ['shape', 'S7:flagpole', 28.5, 28.6, 0, { params: { c: 'steppe' } }], ['shape', 'S7:flagpole', 33.5, 28.6, 0, { params: { c: 'steppe' } }], ['shape', 'S7:flagpole', 31, 33.4, 0, { params: { c: 'steppe' } }],
    ['shape', 'S7:flagpole', 17.5, 28.4, 0, { params: { c: 'coastal' } }], ['shape', 'S7:flagpole', 25, 28.4, 0, { params: { c: 'coastal' } }],
    ['shape', 'S7:safe', 18.4, 28.4, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:blackboard', 21, 40.6, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:pinboard', 25.6, 37, 0, { facing: Math.PI }], ['shape', 'S7:pinboard', 16.4, 37, 0, { facing: 0 }],
    ['shape', 'S7:mirror-panel', 26.4, 18.5, 0, { facing: 0 }], ['shape', 'S7:mirror-panel', 26.4, 22.5, 0, { facing: 0 }], ['shape', 'S7:mirror-panel', 35.6, 18.2, 0, { facing: Math.PI }], ['shape', 'S7:mirror-panel', 35.6, 22.8, 0, { facing: Math.PI }],
    ['shape', 'S7:stage', 46, 26.5, 0, { facing: 0, scale: .9 }], ['shape', 'S7:band-flag', 38.6, 30, 0, { facing: 0 }], ['shape', 'S7:band-flag', 53.4, 30, 0, { facing: Math.PI }],
    ['shape', 'kenney-furniture:lounge-sofa', 18, 16, 0, { scale: 1.3, facing: Math.PI / 2 }], ['shape', 'S7:potted-palm', 25, 15, 0, {}], ['shape', 'S7:potted-palm', 17, 25.6, 0, {}],
    ['shape', 'kaykit-furniture-bits:chair-a', 23, 38.5, 0, { scale: 1.3 }], ['shape', 'kaykit-furniture-bits:table-medium', 19, 36, 0, { scale: 1.3 }],
    ['shape', 'kaykit-furniture-bits:shelf-a-big', 35.5, 39.5, 0, { scale: 1.4, facing: Math.PI }],
    ['thing', 'chandelier', 21, 20.5, 5.4], ['thing', 'chandelier', 46, 34, 5.4], ['thing', 'chandelier', 31, 20.5, 5.4],
    ['thing', 'echowall', 36.5, 20.5, 0], ['thing', 'runner', 9, 20.5, 0, { w: 13, d: 2, color: '#2a4a8a' }],
    ['light', 21, 20.5, 5, { color: '#e8f0ff', reach: 220, power: 3.2 }], ['light', 31, 20.5, 5, { color: '#e0e8ff', reach: 180, power: 2.6, flicker: .04 }],
    ['light', 21, 30.5, 4.5, { color: '#c0d0ff', reach: 160, power: 2.6 }], ['light', 31, 30.5, 4.5, { color: '#ffc0b0', reach: 160, power: 2.6 }],
    ['light', 21, 38, 4, { color: '#c0d0ff', reach: 120, power: 2.2, tag: 'press' }], ['light', 46, 34, 5, { color: '#ffd8a0', reach: 260, power: 4 }], ['light', 46, 26.5, 3.5, { color: '#ff6040', reach: 140, power: 2.6 }]
  ],
  people: [
    { who: 'delegate', at: [18.5, 31.2], pose: 'hips', facing: 0 }, { who: 'delegate', at: [23.6, 32.6], pose: 'wave', facing: Math.PI }, { who: 'delegate', at: [34.4, 31.6], pose: 'guard', facing: Math.PI },
    { who: 'delegate', at: [28.4, 32.8], pose: 'cast', facing: 0 }, { who: 'delegate', at: [28.6, 18.6], pose: 'hips', facing: Math.PI / 2 }, { who: 'delegate', at: [19, 39.4], pose: 'crouch', facing: -Math.PI / 2 }
  ],
  dark: { area: 'pr', node: 'pr', light: 'press' },
  /** the ballroom while the band plays: from the dance floor, the hero in the foreground, the stage beyond */
  camera(sim, h) { if (!sim.boss || sim.boss.id !== 'band' || sim.aim.on || sim.camOverride) return null; return sim.cam.aimSafe(h, [h.x + 1.4 * M, h.y + 5 * M, h.z + 2.4 * M], [46.5 * M, 26.6 * M, 1.6 * M], 58); }
});


/* ===== content/areas/01C-blackrun.js ===== */
/* TARGET 01 · 01C THE BLACK RUN (§11.7): a terrain. The T-bar up (Snowballers on the slope, aim from the lift), the top
 * station (Room 7, Murmel), the patrol rope (Ansel), the ridge's cornice (Brigid) that becomes a snow bridge, the
 * avalanche shelter (Edelweiss 3, Pin 5), Dagny's jump onto the avalanche slope (LAWINE!), and the downhill: BLUE,
 * BLACK or THE JUMP, down to the village. Units in the data: metres (tiles); the height function works in units. */
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
S7.blackRunHeight = (x, y) => {
  const m = x / M, n = y / M;
  let z = 520 - smooth(170, 260, n) * (n - 170) * .42 - smooth(260, 1300, n) * 0;   // the plateau, then the run
  z = Math.max(z, 30 + (1300 - Math.min(n, 1300)) * .02);
  const vx = (m - 470) / 300; z += vx * vx * 80;                                       // the valley's walls
  z -= smooth(18, 0, Math.abs(m - 340)) * smooth(195, 150, n) * smooth(120, 150, n) * 26;   // the crevasse under the ridge
  z -= smooth(26, 0, Math.hypot(m - 545, n - 560)) * 18;                              // the gully under the jump
  z += (E.noise2(m / 70, n / 70) - .5) * 12 + (E.noise2(m / 19, n / 19) - .5) * 2.2;   // moguls and swells
  return z * M;
};
S7.snowColor = (tint) => (x, y, z, nz, out) => {
  const n = E.noise2(x / 400, y / 400), k = E.noise2(x / 60, y / 60), lit = .82 + nz * .18;
  const base = tint || [232, 238, 248];
  out = out || [0, 0, 0];
  out[0] = Math.min(255, base[0] * lit - 14 * n - 6 * k); out[1] = Math.min(255, base[1] * lit - 10 * n - 4 * k); out[2] = Math.min(255, base[2] * lit - 4 * n);
  return out;
};
S7.area('01C', {
  title: 'THE BLACK RUN', sub: 'PIZ NADA', target: 1, music: 'blackrun', ambience: 'wind', outdoor: true, skis: true, sweepNode: 'ts', pinNo: 5,
  world: { kind: 'terrain', height: S7.blackRunHeight, color: S7.snowColor(), size: 32768, far: 16000,
    terrainLook: { rock: { colors: ['#3a3a44', '#4a4a56', '#2a2a32', '#5a5a66'], band: 30, slope: [.55, .8] }, speckle: .1, mottle: .2 },
    sky: { top: '#02030a', horizon: '#1a2240', ground: '#0a0c18', sun: '#c8d8ff', haze: .25 }, fog: { color: '#0a1020', near: 1600, far: 9000 },
    ambient: ['#8090c0', '#202838', 1.3], sun: { color: '#c8d8ff', intensity: 1.4, dir: [.3, .5, -.8], shadow: true }, lights: 6, snow: 500, wind: [.2, .6], postcard: ['#04060e', '#2a3458'] },
  nodes: {
    tbot: { t: [560, 1080], kind: 'stop', label: 'T-BAR' },
    ttop: { t: [560, 232], kind: 'stop', label: 'T-BAR TOP' },
    ts: { t: [500, 168], kind: 'junction', label: 'TOP STATION' },
    st: { t: [500, 200], kind: 'stop', label: 'START GATE' },
    pr: { t: [442, 168], kind: 'stop', label: 'PATROL ROPE' },
    cr: { t: [382, 168], kind: 'stop', label: 'THE RIDGE' },
    as: { t: [300, 168], kind: 'stop', label: 'AVALANCHE SHELTER' },
    jp: { t: [300, 204], kind: 'stop', label: 'THE DROP' },
    kick: { t: [318, 248], kind: 'pass' },
    av0: { t: [352, 318], kind: 'pass', onLand: 'lawine' },
    av1: { t: [395, 450], kind: 'pass' },
    av2a: { t: [358, 580], kind: 'pass' }, av2b: { t: [445, 580], kind: 'pass' },
    f1: { t: [500, 400], kind: 'pass' },
    bl1: { t: [395, 640], kind: 'pass' }, bk1: { t: [503, 660], kind: 'pass' }, jk: { t: [552, 478], kind: 'pass' },
    f2: { t: [500, 900], kind: 'pass' },
    vb: { t: [500, 1095], kind: 'exit', label: 'THE VILLAGE', to: ['01A', 'ls'], open: true }
  },
  edges: [
    { a: 'tbot', b: 'ttop', kind: 'lift', ground: true, speed: 300, aimOnTheMove: true, label: 'T-BAR', via: [[562, 800], [560, 500]] },
    { a: 'ttop', b: 'ts', via: [[540, 190]] }, { a: 'ts', b: 'st' },
    { a: 'ts', b: 'pr', gate: 'rope' }, { a: 'pr', b: 'cr' }, { a: 'cr', b: 'as', lerpZ: true, label: 'SNOW BRIDGE' }, { a: 'as', b: 'jp' },
    { a: 'jp', b: 'kick', kind: 'ski' }, { a: 'kick', b: 'av0', kind: 'jump', apex: 7, slowmo: true, label: 'THE JUMP' },
    { a: 'av0', b: 'av1', kind: 'ski', via: [[372, 380]] }, { a: 'av1', b: 'av2a', kind: 'ski', label: 'LEFT' }, { a: 'av1', b: 'av2b', kind: 'ski', label: 'RIGHT' },
    { a: 'av2a', b: 'f2', kind: 'ski', via: [[410, 760]] }, { a: 'av2b', b: 'f2', kind: 'ski', via: [[480, 740]] },
    { a: 'st', b: 'f1', kind: 'ski', via: [[492, 300]] },
    { a: 'f1', b: 'bl1', kind: 'ski', label: 'BLUE', via: [[440, 520]] }, { a: 'bl1', b: 'f2', kind: 'ski', via: [[420, 780]] },
    { a: 'f1', b: 'bk1', kind: 'ski', label: 'BLACK', via: [[505, 540]] }, { a: 'bk1', b: 'f2', kind: 'ski', via: [[510, 780]] },
    { a: 'f1', b: 'jk', kind: 'ski', label: 'THE JUMP', via: [[535, 440]] }, { a: 'jk', b: 'bk1', kind: 'jump', apex: 4, slowmo: true },
    { a: 'f2', b: 'vb', kind: 'ski', via: [[498, 1000]] }
  ],
  gates: {
    rope: { kind: 'patrol', label: 'CLOSED — PATROL ONLY', solver: 'ansel' },
    cornice: { kind: 'spot', label: 'A CREVASSE', solver: 'brigid', hides: 'cr-as', line: 'Too much snow. Not enough engineer.' }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'ts', label: 'Room 7 · the top station' },
    { id: 'murmel', kind: 'murmel', at: [506, 164], label: 'Murmel', reach: 3.4 },
    { id: 'cornice', kind: 'cornice', target: true, at: [366, 158], up: 4, r: 2.2, opens: 'cornice', flag: 'corniceDown', beat: 'cornice_down', label: 'THE CORNICE' },
    { id: 'ew3', kind: 'item', item: 'edelweiss', node: 'as', needs: { flag: 'shelterOpen' } },
    { id: 'pin5', kind: 'pin', pin: 5, node: 'as' },
    { id: 'clip', kind: 'dossier', dossier: 'avalanche1926', node: 'as' },
    { id: 'red1', kind: 'red', n: 12, edge: 'ts-st', s: .5 }, { id: 'red2', kind: 'red', n: 10, edge: 'pr-cr', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'st-f1', s: .6 }, { id: 'red4', kind: 'red', n: 14, edge: 'bl1-f2', s: .5 },
    { id: 'rime1', kind: 'rime', n: 5, edge: 'as-jp', s: .5 }, { id: 'rime2', kind: 'rime', n: 4, edge: 'jk-bk1', s: .9 },
    { id: 'netsign', kind: 'sign', node: 'pr', line: 'CLOSED — AVALANCHE DANGER — PATROL ONLY. The rope is orange and very sure of itself.' }
  ],
  spawns: { tb1: [530, 820], tb2: [600, 640], tb3: [530, 430], sh1: [290, 185], sh2: [312, 190], b1: [372, 590], b2: [415, 600], b3: [395, 560], b4: [400, 700], b5: [425, 690], bk: [503, 590], k1: [505, 760], k2: [520, 790], k3: [490, 800] },
  waves: {
    tbar: { spawn: [['snowballer', 'tb1', 0], ['snowballer', 'tb2', 0], ['snowballer', 'tb3', 0]], until: 'clear' },
    shelter: { spawn: [['giggler', 'sh1', 0], ['giggler', 'sh2', .8]] },
    blue1: { spawn: [['skier', 'b1', 0], ['skier', 'b2', .5], ['skier', 'b3', 1]] },
    blue2: { spawn: [['tobogganer', 'b4', 0], ['tobogganer', 'b5', .8]] },
    black1: { spawn: [['plow', 'bk', 0]] },
    black2: { spawn: [['tobogganer', 'k1', 0], ['tobogganer', 'k2', .5], ['tobogganer', 'k3', 1]] }
  },
  triggers: [
    { id: 'tbar', edge: 'tbot-ttop', s: .06, wave: 'tbar', tut: 'lift' },
    { id: 'shelter', node: 'as', set: 'shelterOpen' },
    { id: 'shelterdone', node: 'as', set: 'shelterDone' },
    { id: 'leave', edge: 'as-jp', s: .2, wave: 'shelter' },
    { id: 'ropecross', node: 'pr', set: 'ropeCrossed' },
    { id: 'blue1', edge: 'f1-bl1', s: .5, wave: 'blue1' }, { id: 'blue2', edge: 'bl1-f2', s: .2, wave: 'blue2' },
    { id: 'black1', edge: 'f1-bk1', s: .15, wave: 'black1' }, { id: 'black2', edge: 'bk1-f2', s: .25, wave: 'black2' },
    { id: 'skitip', edge: 'st-f1', s: .05, tut: 'ski' },
    { id: 'jumptip', node: 'jp', tut: 'jump' }
  ],
  props: [
    ['shape', 'S7:lift-hut', 506, 156, 0, {}], ['shape', 'S7:room7-door', 500, 158.6, 0, { facing: Math.PI / 2 }], ['shape', 'S7:shelter-hut', 296, 156, 0, {}],
    ['shape', 'S7:cornice', 366, 156, 0, {}], ['shape', 'S7:net', 442, 168, 0, { facing: Math.PI / 2 }], ['shape', 'S7:lift-hut', 560, 1094, 0, {}], ['shape', 'S7:lift-hut', 560, 222, 0, {}],
    ['shape', 'S7:floodlight', 488, 300, 0, {}], ['shape', 'S7:floodlight', 520, 520, 0, {}], ['shape', 'S7:floodlight', 420, 620, 0, {}], ['shape', 'S7:floodlight', 520, 820, 0, {}], ['shape', 'S7:floodlight', 486, 1000, 0, {}],
    ['shape', 'S7:snow-cannon', 470, 450, 0, { facing: 1 }], ['shape', 'S7:snow-cannon', 530, 700, 0, { facing: 2 }],
    ['thing', 'pistepoles', 0, 0, 0], ['thing', 'avalanche', 0, 0, 0],
    ['light', 488, 300, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 520, 520, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 420, 620, 7, { color: '#fff4d0', reach: 900, power: 6 }],
    ['light', 520, 820, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 500, 168, 3, { color: '#ffd8a0', reach: 200, power: 3 }], ['light', 300, 168, 3, { color: '#ff9060', reach: 160, power: 2.4 }]
  ],
  people: [{ who: 'murmel', at: [506, 164], z: .4 }],
  update(sim, dt) { S7.lawineUpdate(sim, dt); },
  camera(sim, h) { return S7.lawineCamera(sim, h); }
});


/* ===== content/areas/01D-gondola.js ===== */
/* TARGET 01 · 01D HIMMELSBAHN, THE GONDOLA (§11.7): a storm-fogged valley under one long cable. You ride a cabin (aim from
 * it: cabins pass on the down cable with Snowballers leaning out; Cable Crawlers come hand over hand; climbers at the
 * windows). At 55% the power cuts: the cabin swings, Pim sits on the roof, and three frozen insulators on the next
 * pylon, far, must be shot (Ignaz's scope) before the power comes back. */
S7.gondolaHeight = (x, y) => {
  const m = x / M, n = y / M, u = clamp((1900 - n) / 1800, 0, 1);
  let z = 100 + u * 1200 - Math.sin(u * Math.PI) * 260;
  const vx = (m - 1000) / 220; z += vx * vx * 160;
  z += (E.noise2(m / 90, n / 90) - .5) * 30 + (E.noise2(m / 23, n / 23) - .5) * 5;
  return z * M;
};
S7.CABLE = { a: [1000, 1880, 116], b: [1000, 120, 1332] };   // metres: the village station and the glacier station (z of the cable)
S7.cableZ = (n) => { const A = S7.CABLE.a, B = S7.CABLE.b, u = clamp((A[1] - n) / (A[1] - B[1]), 0, 1); return A[2] + (B[2] - A[2]) * u - Math.sin(u * Math.PI) * 30; };
S7.area('01D', {
  title: 'HIMMELSBAHN', sub: 'THE GONDOLA', target: 1, music: 'gondola', ambience: 'storm', outdoor: true, sweepNode: 'gs', pinNo: 6, cabin: true,
  world: { kind: 'terrain', height: S7.gondolaHeight, color: S7.snowColor([214, 222, 236]), size: 32768, far: 12000,
    terrainLook: { rock: { colors: ['#30343e', '#3a3e4a', '#262a32'], band: 40, slope: [.45, .7] }, speckle: .1, mottle: .3 },
    sky: { top: '#0a0e18', horizon: '#3a4458', ground: '#1a1e28', sun: '#8090b0', haze: .6 }, fog: { color: '#2a3040', near: 500, far: 4200 },
    ambient: ['#7080a0', '#20242c', 1.35], sun: { color: '#a0b0d0', intensity: 1.1, dir: [-.3, .4, -.8], shadow: true }, lights: 5, snow: 700, wind: [1.2, .3], postcard: ['#1a2030', '#5a6478'] },
  nodes: {
    gs: { t: [1000, 1880, 116], kind: 'stop', label: 'VILLAGE STATION' },
    mid: { t: [1000, 1880 - 1760 * .55, S7.cableZ(1880 - 1760 * .55)], kind: 'stop', label: 'POWER CUT', air: true },
    gl: { t: [1000, 120, 1332], kind: 'exit', label: 'GLACIER STATION', to: ['01E', 'gl'], open: true }
  },
  edges: [
    { a: 'gs', b: 'mid', kind: 'lift', speed: 240, label: 'HIMMELSBAHN', via: [[1000, 1500, S7.cableZ(1500)], [1000, 1200, S7.cableZ(1200)]] },
    { a: 'mid', b: 'gl', kind: 'lift', speed: 240, gate: 'power', via: [[1000, 600, S7.cableZ(600)], [1000, 350, S7.cableZ(350)]] }
  ],
  gates: { power: { kind: 'flag', flag: 'powerBack', label: 'NO POWER', solver: 'ignaz', line: 'The cabin swings. The power is out. Something on the next pylon is frozen.' } },
  spots: [
    { id: 'pin6', kind: 'pin', pin: 6, node: 'mid' },
    { id: 'pim', kind: 'pim', at: [1000, 1880 - 1760 * .55], atZ: S7.cableZ(1880 - 1760 * .55) + 3.2, talk: 'pim_01D', label: 'Pim, on the roof', reach: 5 },
    { id: 'ins1', kind: 'far', target: true, far: true, at: [1000 - 3, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 1.5, r: 1.2, flag: 'ins1', label: 'AN INSULATOR' },
    { id: 'ins2', kind: 'far', target: true, far: true, at: [1000 + 3, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 1.5, r: 1.2, flag: 'ins2', label: 'AN INSULATOR' },
    { id: 'ins3', kind: 'far', target: true, far: true, at: [1000, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 4, r: 1.2, flag: 'ins3', label: 'AN INSULATOR' }
  ],
  spawns: {}, waves: {},
  triggers: [
    { id: 'board', onEnter: true, beat: 'gondola_board' },
    { id: 'cut', node: 'mid', beat: 'power_cut' }
  ],
  props: [
    ['shape', 'S7:gondola-station', 1000, 1892, 116 - 6, { facing: Math.PI / 2 }], ['shape', 'S7:gondola-station', 1000, 104, 1332 - 6, { facing: -Math.PI / 2 }],
    ['thing', 'cablecar', 0, 0, 0],
    ['light', 1000, 1880, 116 + 4, { color: '#ffb060', reach: 300, power: 4 }], ['light', 1000, 120, 1336, { color: '#ffb060', reach: 300, power: 4 }],
    ['light', 1000, 1880, 120, { color: '#ffe8c0', reach: 160, power: 3, tag: 'cabin' }]
  ],
  people: [{ who: 'pim', at: [1000, 1880 - 1760 * .55], z: S7.cableZ(1880 - 1760 * .55) + 2.6, always: true, cabinRoof: true }],
  update(sim, dt) { S7.gondolaUpdate(sim, dt); },
  camera(sim, h) { return S7.gondolaCamera(sim, h); }
});


/* ===== content/areas/01E-archive.js ===== */
/* TARGET 01 · 01E THE GLACIER ARCHIVE (§11.7): blue ice, dark, cyan glows; deposit boxes and people frozen in the walls.
 * The ice gallery (Pim, a frozen house phone), Echo crystals (Kasimir) in the corridor and on a side branch (Pin 7), the
 * ledger vault (Mireille's flash: the reveal), ice locks on the Room 7 door and the inner vault (the Ember Charm), the
 * first Bloom, and Brigid's seracs before the freight elevator. */
S7.area('01E', {
  title: 'THE GLACIER ARCHIVE', sub: 'ARTICLE NINE', target: 1, music: 'archive', ambience: 'archive', pinNo: 7, cold: true,
  world: { kind: 'level', w: 48, h: 36, wallH: 5.5,
    rooms: [[2, 7, 10, 10], [10, 4, 20, 14], [12, 1, 18, 4], [12, 14, 17, 20], [20, 7, 30, 10], [30, 4, 42, 14], [32, 14, 40, 22], [34, 22, 38, 32], [20, 28, 34, 32]],
    ground: 'plain', colors: { base: '#a8d8ec', dark: '#4a7a9a', light: '#d8f4ff' }, side: 'block', wallColor: '#6ab8dc', wallTop: '#c8f0ff', wallLine: '#2a6a8a',
    sky: '#000204', fog: { color: '#02060a', near: 140, far: 620 }, ambient: ['#3a7a9a', '#04121a', 1.15], lights: 6, postcard: ['#021018', '#2a6a8a'] },
  nodes: {
    gl: { t: [4, 8.5], kind: 'exit', label: 'THE GONDOLA', to: ['01D', 'gl'] },
    ig: { t: [15, 8.5], kind: 'junction', label: 'ICE GALLERY' },
    pc: { t: [15, 2.5], kind: 'stop', label: 'A SIDE VAULT' },
    r7e: { t: [14.5, 18.5], kind: 'door', label: 'ROOM 7 · IN THE ICE' },
    ec: { t: [25, 8.5], kind: 'stop', label: 'THE CORRIDOR' },
    lv: { t: [36, 8.5], kind: 'junction', label: 'LEDGER VAULT' },
    iv: { t: [36, 18.5], kind: 'junction', label: 'INNER VAULT' },
    sr: { t: [36, 27], kind: 'stop', label: 'SERACS' },
    fe: { t: [23, 30], kind: 'exit', label: 'FREIGHT ELEVATOR', to: ['01F', 'p3'], open: true }
  },
  edges: [
    { a: 'gl', b: 'ig' }, { a: 'ig', b: 'pc', gate: 'sidecrystals' }, { a: 'ig', b: 'r7e', gate: 'r7lock' }, { a: 'ig', b: 'ec' }, { a: 'ec', b: 'lv', gate: 'crystals' },
    { a: 'lv', b: 'iv', gate: 'vaultlock' }, { a: 'iv', b: 'sr' }, { a: 'sr', b: 'fe', gate: 'seracs', via: [[35, 30]] }
  ],
  gates: {
    sidecrystals: { kind: 'spot', label: 'HUMMING ICE', solver: 'kasimir', line: 'The ice hums. It wants a note.', block: [13, 3, 17, 4, 0, 5] },
    crystals: { kind: 'spot', label: 'HUMMING ICE', solver: 'kasimir', line: 'The ice hums. It wants a note.', block: [28, 7, 30, 10, 0, 5] },
    r7lock: { kind: 'icelock', label: 'FROZEN SHUT', solver: null },
    vaultlock: { kind: 'icelock', label: 'FROZEN SHUT', solver: null },
    seracs: { kind: 'spot', label: 'SERACS', solver: 'brigid', line: 'Too much ice. Not enough engineer.', block: [27, 28, 31, 32, 0, 5] }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7e', label: 'Room 7 · in the ice' },
    { id: 'phone', kind: 'phone', at: [11.2, 9.5], talk: 'concierge_vault', label: 'A house phone in the ice', reach: 3 },
    { id: 'pim', kind: 'pim', at: [17.5, 6], talk: 'pim_01E', label: 'Pim', reach: 3.4 },
    { id: 'd1', kind: 'tableau', at: [11, 5], who: 'tableau', label: 'Account 4417', line: 'Account 4417. Contents: a journalist, 1961.', reach: 3 },
    { id: 'd2', kind: 'tableau', at: [19, 5], who: 'tableau', label: 'Account 2210', line: 'Account 2210. Contents: a quarrel between two countries. Unopened.', reach: 3 },
    { id: 'd3', kind: 'tableau', at: [11, 12.8], who: 'tableau', label: 'Account 0889', line: 'Account 0889. Contents: the truth about a war. Interest accrues.', reach: 3 },
    { id: 'sidec', kind: 'crystal', target: true, at: [15, 3.6], atZ: 1.4, r: 1.6, opens: 'sidecrystals', label: 'HUMMING CRYSTALS' },
    { id: 'pin7', kind: 'pin', pin: 7, node: 'pc' },
    { id: 'cry', kind: 'crystal', target: true, at: [29, 8.5], atZ: 1.4, r: 1.6, opens: 'crystals', flag: 'crystalsDone', label: 'HUMMING CRYSTALS' },
    { id: 'ledger', kind: 'exposure', target: true, at: [40.5, 8.5], atZ: 1.5, r: 1.4, exposure: 'exposure2', flag: 'ledgerRead', dossier: 'exposure2', beat: 'ledger_reveal', label: 'THE FROZEN LEDGER' },
    { id: 'vaultrime', kind: 'rime', n: 15, node: 'iv' },
    { id: 'orders', kind: 'dossier', dossier: 'standingorders', edge: 'iv-sr', s: .2 },
    { id: 'serac', kind: 'serac', target: true, at: [29, 30], atZ: 1.5, r: 2.4, opens: 'seracs', flag: 'seracsDown', beat: 'seracs_down', label: 'SERACS' },
    { id: 'red1', kind: 'red', n: 10, edge: 'gl-ig', s: .5 }, { id: 'red2', kind: 'red', n: 12, edge: 'ig-ec', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'lv-iv', s: .6 },
    { id: 'rime1', kind: 'rime', n: 4, edge: 'ig-ec', s: .8 }, { id: 'rime2', kind: 'rime', n: 4, node: 'sr' }, { id: 'rime3', kind: 'rime', n: 4, edge: 'ec-lv', s: .7 }
  ],
  spawns: { g1: [18.5, 12.5], g2: [11.5, 12.5], g3: [18.5, 5], gt: [13, 6], v1: [36, 21], v2: [33, 16], v3: [39, 16], l1: [40, 12], l2: [32, 5] },
  waves: {
    gallery: { spawn: [['giggler', 'g1', 0], ['giggler', 'g2', .8], ['twins', 'gt', 1.5], ['giggler', 'g3', 2.5]] },
    ledger: { spawn: [['giggler', 'l1', 0], ['bellboy', 'l2', 1]] },
    vault: { spawn: [['bloom', 'v1', 0], ['giggler', 'v2', 1], ['giggler', 'v3', 1.5]] }
  },
  triggers: [
    { id: 'gallery', node: 'ig', wave: 'gallery' },
    { id: 'ledger', node: 'lv', wave: 'ledger' },
    { id: 'vault', node: 'iv', wave: 'vault' },
    { id: 'done', node: 'sr', set: 'archiveSeen' }
  ],
  props: [
    ['thing', 'icewall', 15, 4.6, 0, { n: 5 }], ['thing', 'icewall', 15, 13.4, 0, { n: 5 }], ['thing', 'icewall', 36, 4.6, 0, { n: 6 }],
    ['shape', 'S7:deposit-box', 11, 4.6, .5, { facing: Math.PI / 2 }], ['shape', 'S7:deposit-box', 19, 4.6, .5, { facing: Math.PI / 2 }], ['shape', 'S7:deposit-box', 11, 13.4, .5, { facing: -Math.PI / 2 }],
    ['shape', 'S7:frozen-case', 13, 13.3, 0, {}], ['shape', 'S7:frozen-case', 17, 4.7, 0, {}], ['shape', 'S7:frozen-case', 33, 4.7, 0, {}], ['shape', 'S7:frozen-case', 39, 4.7, 0, {}],
    ['shape', 'S7:crystal-cluster', 15, 3.6, 0, {}], ['shape', 'S7:crystal-cluster', 29, 8, 0, { facing: .4 }], ['shape', 'S7:crystal-cluster', 29, 9.3, 0, { facing: -.6 }],
    ['shape', 'S7:lectern', 40.5, 8.5, 0, { facing: Math.PI }],
    ['shape', 'S7:serac', 28.5, 29, 0, {}], ['shape', 'S7:serac', 30, 31, 0, { facing: 1 }],
    ['shape', 'S7:glacier-gate', 4, 7.2, 0, {}], ['shape', 'S7:room7-door', 14.5, 19.9, 0, { facing: -Math.PI / 2 }],
    ['thing', 'icelock', 14.5, 14.2, 0, { gate: 'r7lock' }], ['thing', 'icelock', 36, 14.2, 0, { gate: 'vaultlock' }],
    ['light', 15, 8.5, 3.5, { color: '#60d0ff', reach: 180, power: 3 }], ['light', 25, 8.5, 3, { color: '#80e0ff', reach: 140, power: 2.4 }],
    ['light', 36, 8.5, 3.6, { color: '#a0e8ff', reach: 200, power: 3.2 }], ['light', 36, 18.5, 3, { color: '#40c0ff', reach: 150, power: 2.6 }],
    ['light', 30, 30, 3, { color: '#60d0ff', reach: 160, power: 2.6 }], ['light', 23, 30, 3, { color: '#ffd8a0', reach: 120, power: 2 }]
  ],
  people: [{ who: 'pim', at: [17.5, 6], z: .8 }]
});

/* TARGET 01 · 01F THE SUMMIT (§11.7, §11.8): the summit plaza and its glass signing pavilion (an arc rail of five covers),
 * the glacier face below (the slalom: a ski rail beside Hansi's own line through six gates) and the old chairlift
 * station where the interview happens. */
S7.summitHeight = (x, y) => {
  const m = x / M, n = y / M;
  let z = 1600 - smooth(355, 420, n) * (n - 355) * .42;
  z = Math.max(z, 1240);
  const vx = (m - 1000) / 160; z += vx * vx * 90;
  z += smooth(330, 360, n) * (E.noise2(m / 40, n / 40) - .5) * 8;
  return z * M;
};
const SUMMIT_C = [1000, 290];
const arcNode = (deg) => [SUMMIT_C[0] + Math.cos(deg * Math.PI / 180) * 30, SUMMIT_C[1] + Math.sin(deg * Math.PI / 180) * 30];
const SL_X = 990, HANSI_X = 1010;
S7.area('01F', {
  title: 'THE SUMMIT', sub: 'MIDNIGHT', target: 1, music: 'powderking', ambience: 'fohn', outdoor: true, skis: true, sweepNode: 'p3',
  avalaugh: [1000, 290],
  world: { kind: 'terrain', height: S7.summitHeight, color: S7.snowColor([228, 226, 246]), size: 32768, far: 13000,
    terrainLook: { rock: { colors: ['#3a3048', '#4a4058', '#2a2438'], band: 30, slope: [.5, .75] }, speckle: .12, mottle: .25 },
    sky: { top: '#05030e', horizon: '#3a2a5a', ground: '#140e24', sun: '#ffb860', haze: .3 }, fog: { color: '#1a1430', near: 1400, far: 9000 },
    ambient: ['#8a7ab0', '#2a2038', 1.3], sun: { color: '#ffc880', intensity: 1.2, dir: [-.5, .3, -.6], shadow: true }, lights: 6, snow: 260, wind: [.6, -.2], postcard: ['#0a0618', '#5a3a6a'] },
  nodes: {
    p1: { t: arcNode(30), kind: 'stop', label: 'FLAGPOLE' }, p2: { t: arcNode(60), kind: 'stop', label: 'WEATHER MAST' }, p3: { t: arcNode(90), kind: 'stop', label: 'THE PLAZA' },
    p4: { t: arcNode(120), kind: 'stop', label: 'PAVILION PILLAR' }, p5: { t: arcNode(150), kind: 'stop', label: 'FLAGPOLE' },
    sl0: { t: [SL_X, 360], kind: 'stop', label: 'THE GLACIER FACE' },
    sl1: { t: [SL_X - 6, 470], kind: 'pass' }, sl2: { t: [SL_X + 4, 590], kind: 'pass' }, sl3: { t: [SL_X - 5, 720], kind: 'pass' }, sl4: { t: [SL_X + 3, 850], kind: 'pass' },
    sl9: { t: [SL_X, 1010], kind: 'stop', label: 'THE OLD CHAIRLIFT' },
    chair: { t: [1000, 1050, 1290], kind: 'stop', label: 'A STUCK CHAIR', air: true }, chair2: { t: [1000, 1062, 1291], kind: 'stop', air: true }
  },
  edges: [
    { a: 'p1', b: 'p2', via: [arcNode(45)] }, { a: 'p2', b: 'p3', via: [arcNode(75)] }, { a: 'p3', b: 'p4', via: [arcNode(105)] }, { a: 'p4', b: 'p5', via: [arcNode(135)] },
    { a: 'sl0', b: 'sl1', kind: 'ski', aimOnTheMove: true }, { a: 'sl1', b: 'sl2', kind: 'ski', aimOnTheMove: true }, { a: 'sl2', b: 'sl3', kind: 'ski', aimOnTheMove: true },
    { a: 'sl3', b: 'sl4', kind: 'ski', aimOnTheMove: true }, { a: 'sl4', b: 'sl9', kind: 'ski', aimOnTheMove: true },
    { a: 'chair', b: 'chair2', lerpZ: true }
  ],
  hansiPath: [[HANSI_X, 360], [HANSI_X + 12, 430], [HANSI_X - 4, 520], [HANSI_X + 14, 610], [HANSI_X - 2, 700], [HANSI_X + 12, 790], [HANSI_X - 4, 880], [HANSI_X + 8, 960], [HANSI_X, 1010]],
  slalomGates: [.12, .27, .42, .57, .72, .87],
  spots: [],
  spawns: {}, waves: {},
  triggers: [{ id: 'boss', onEnter: true, beat: 'summit_arrive', notFlag: 't01Done' }],
  props: [
    ['shape', 'S7:pavilion', 1000, 262, 0, {}], ['shape', 'S7:flagpole', arcNode(30)[0] + 2, arcNode(30)[1] + 2, 0, { params: { c: 'coastal' } }], ['shape', 'S7:flagpole', arcNode(150)[0] - 2, arcNode(150)[1] + 2, 0, { params: { c: 'steppe' } }],
    ['shape', 'S7:floodlight', arcNode(60)[0] + 2, arcNode(60)[1] + 2, 0, {}], ['shape', 'S7:chair-station', 1000, 1030, 0, {}],
    ['thing', 'slalomgates', 0, 0, 0], ['thing', 'avalaugh', 1000, 290, 0], ['thing', 'chairlift', 1000, 1050, 0],
    ['light', 1000, 262, 6, { color: '#ffb050', reach: 600, power: 5, tag: 'fohn' }], ['light', arcNode(60)[0], arcNode(60)[1], 7, { color: '#fff0d0', reach: 700, power: 4 }],
    ['light', 1000, 1030, 4, { color: '#ffd8a0', reach: 300, power: 3 }]
  ],
  people: [],
  camera(sim, h) { return S7.summitCamera(sim, h); }
});


/* ===== content/areas/room7.js ===== */
/* ROOM 7 (§7.16): one persistent room; every Room 7 door leads here. A loop of six stops: the door, the wardrobe, the
 * bed (Oma Holle; Sister Rosalind knits beside it), the window, the cuckoo clock (save), the wax bench (upgrades). */
S7.area('room7', {
  title: 'ROOM 7', sub: 'GRAND HOTEL NADA', kind: 'room7', music: 'room7', ambience: 'room7',
  world: { kind: 'level', w: 14, h: 12, wallH: 4.5, rooms: [[1, 1, 13, 11]], ground: 'planks', colors: { base: '#4a3226', dark: '#2e1e16', light: '#6a4a36' }, side: 'planks', wallColor: '#3a2620',
    sky: '#0a0608', fog: { color: '#120a0c', near: 200, far: 900 }, ambient: ['#6a5048', '#20140e', 1.5], lights: 4, torchLights: 0, palette: 'room7' },
  nodes: {
    door: { t: [7, 10.1], kind: 'stop', label: 'DOOR' },
    wardrobe: { t: [3, 8], kind: 'stop', label: 'WARDROBE' },
    bed: { t: [3.4, 4.6], kind: 'stop', label: 'BED' },
    window: { t: [7, 2.4], kind: 'stop', label: 'WINDOW' },
    clock: { t: [10.8, 4.4], kind: 'stop', label: 'CLOCK' },
    bench: { t: [10.8, 8], kind: 'stop', label: 'WAX BENCH' }
  },
  edges: [
    { a: 'door', b: 'wardrobe', via: [[4.6, 9.6]] }, { a: 'wardrobe', b: 'bed' }, { a: 'bed', b: 'window', via: [[4.8, 2.8]] },
    { a: 'window', b: 'clock', via: [[9.4, 2.8]] }, { a: 'clock', b: 'bench' }, { a: 'bench', b: 'door', via: [[9.4, 9.6]] }
  ],
  spots: [
    { id: 'door', kind: 'r7door', node: 'door', label: 'Room 7 door' },
    { id: 'wardrobe', kind: 'wardrobe', node: 'wardrobe', label: 'The Wardrobe' },
    { id: 'bed', kind: 'bed', node: 'bed', label: 'Oma Holle' },
    { id: 'rosalind', kind: 'rosalind', at: [5.2, 4.2], label: 'Sister Rosalind', reach: 2.8 },
    { id: 'window', kind: 'window', node: 'window', label: 'The window' },
    { id: 'clock', kind: 'clock', node: 'clock', label: 'Cuckoo Clock' },
    { id: 'phone', kind: 'r7phone', at: [12, 6.2], label: 'Telephone', reach: 2.6 },
    { id: 'bench', kind: 'bench', node: 'bench', label: 'Wax Bench' }
  ],
  spawns: {}, waves: {}, triggers: [],
  props: [
    ['shape', 'S7:holle-bed', 2.2, 3.2, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:wardrobe', 1.6, 8, 0, { facing: 0 }],
    ['shape', 'S7:cuckoo-clock', 12.4, 4.4, 0, { facing: Math.PI }],
    ['shape', 'S7:wax-bench', 12.2, 8.4, 0, { facing: Math.PI }],
    ['shape', 'kaykit-furniture-bits:armchair', 5.4, 3.6, 0, { facing: Math.PI * .75, scale: 1.2 }],
    ['shape', 'kaykit-furniture-bits:table-small', 12.2, 6.2, 0, { facing: Math.PI, scale: 1.1 }],
    ['shape', 'S7:candlestick-phone', 12.2, 6.2, .9, { facing: Math.PI }],
    ['shape', 'S7:radiator', 9.2, 1.4, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:team-photo', 1.2, 5.8, 1.6, { facing: 0 }],
    ['shape', 'kaykit-furniture-bits:rug-rectangle-a', 7, 6, 0, { facing: 0, scale: 1.6 }],
    ['thing', 'r7window', 7, 1.05, 0],
    ['thing', 'r7lamp', 7, 6, 3.4], ['thing', 'chessboard', 3.4, 5.4, .5],
    ['light', 7, 6, 3.2, { color: '#ffc880', reach: 150, power: 3.2, flicker: .03 }],
    ['light', 7, 1.6, 2.6, { color: '#7a9aff', reach: 120, power: 1.6 }],
    ['light', 12, 4.4, 2.2, { color: '#ffb060', reach: 70, power: 1 }]
  ],
  people: [
    { who: 'holle', at: [2.6, 3.4], z: .62, pose: 'down', facing: Math.PI / 2 },
    { who: 'rosalind', at: [5.25, 3.7], z: 0, pose: 'kneel', facing: Math.PI, knit: true },
    { who: 'fohn', at: [4.2, 6.2], z: 0, pose: 'kneel', facing: -Math.PI * .75, epilogue: true }
  ],
});


/* ===== content/enemies.js ===== */
/* The Whiteouts (§7.6). speed: [min, max] u/s; contact: burst damage; red: [body kill, crit kill]; rime: on a crit. */
S7.enemy('giggler', { name: 'Giggler', hp: 30, speed: [32, 42], contact: 20, red: [8, 14], rime: 1, ai: 'walker', blast: 1.5, hats: [null, null, 'beanie'] });
S7.enemy('bellboy', { name: 'Bellboy', hp: 18, speed: [85, 100], contact: 14, red: [6, 12], rime: 1, ai: 'runner', warm: 'head', hats: ['pillbox'] });
S7.enemy('tobogganer', { name: 'Tobogganer', hp: 26, speed: [130, 170], contact: 26, red: [10, 18], rime: 1, ai: 'sled', warm: 'chest', sled: true, laugh: 'cackle' });
S7.enemy('skier', { name: 'Giggler on skis', hp: 30, speed: [110, 140], contact: 20, red: [8, 14], rime: 1, ai: 'sled', sled: false, skis: true });
S7.enemy('snowballer', { name: 'Snowballer', hp: 25, speed: [0, 0], contact: 0, red: [8, 14], rime: 1, ai: 'thrower', every: 2.6, reach: 60, throwDmg: 8, laugh: 'chuckle' });
S7.enemy('twins', { name: 'Twins', hp: 40, speed: [28, 32], contact: 20, red: [12, 20], rime: 2, ai: 'twins',
  onHit(sim, e, warm) {
    if (warm || e.split) return true;
    // a body hit splits it in two small Gigglers, once
    e.split = true; e.alive = false; e.gone = true;
    for (const s of [-1, 1]) { const g = sim.spawnEnemy('giggler', [e.x + Math.cos(e.facing + Math.PI / 2) * 10 * s, e.y + Math.sin(e.facing + Math.PI / 2) * 10 * s], { hp: 12, size: .7, reveal: 3, wave: e.wave }); g.split = true; }
    sim.emit('split', { at: [e.x, e.y, e.z + 16] });
    return false;
  } });
S7.enemy('plow', { name: 'Plow', hp: 90, speed: [24, 28], contact: 30, red: [20, 30], rime: 2, ai: 'plow', warm: 'back', shield: true, size: 1.15, laugh: 'cackle' });
S7.enemy('inspector', { name: 'Inspector', hp: 50, speed: [0, 0], contact: 0, red: [15, 25], rime: 2, ai: 'inspector', passive: true, warm: 'head', hats: ['felt'],
  onKill(sim, e) { if (e.data.give) { sim.giveItem(e.data.give, 1); sim.st.flags[e.data.flag || 'inspectorDead'] = 1; sim.emit('edelweiss', { at: [e.x, e.y, e.z + 20] }); } } });
S7.enemy('bloom', { name: 'Bloom', hp: 300, speed: [16, 20], contact: 45, red: [40, 60], rime: 4, ai: 'bloom', size: 1.8, blast: 2.5, noCrit: true, laugh: 'cackle',
  init(sim, e) { e.spotsLeft = 3; e.spotI = 0; },
  warmAt(sim, e) {
    const k = e.size, a = sim.time * .8 + e.spotI * 2.1, f = e.facing;
    const lx = 2.6 + Math.cos(a) * 1.5, ly = Math.sin(a) * 6, lz = 22 + (e.spotI % 3) * 5;
    return [e.x + (lx * Math.cos(f) - ly * Math.sin(f)) * k, e.y + (lx * Math.sin(f) + ly * Math.cos(f)) * k, e.z + lz * k];
  },
  onHit(sim, e, warm) {
    if (!warm) return true;
    e.spotsLeft--; e.spotI++; e.size *= .82; e.hp = Math.max(e.hp, 1);
    sim.emit('crit', { enemy: e, at: sim.warmPos(e) }); sim.splash('THAW.', { crit: true });
    sim.curResults().crits++;
    if (e.spotsLeft <= 0) { e.hp = 0; sim.kill(e, true); }
    return false;
  } });
S7.enemy('dancer', { name: 'Dancing Giggler', hp: 22, speed: [40, 50], contact: 16, red: [6, 10], rime: 1, ai: 'dancer', laugh: 'giggle' });
S7.enemy('crawler', { name: 'Cable Crawler', hp: 20, speed: [26, 34], contact: 20, red: [8, 12], rime: 1, ai: 'crawler', warm: 'chest' });
S7.enemy('climber', { name: 'Window climber', hp: 24, speed: [0, 0], contact: 18, red: [8, 12], rime: 1, ai: 'idle', warm: 'head',
  init(sim, e) { e.fixed = true; e.climbT = 6; } });


/* ===== content/items.js ===== */
/* Items, Lift Pins and Dossier pages (§7.12, §11.10). */
S7.item('servicekey', { name: 'Service Key', kind: 'key', icon: 'key', line: 'A brass key on a red tassel. STAFF ONLY, it says, in a hand that never smiled.' });
S7.item('edelweiss', { name: 'Edelweiss Pass', kind: 'key', icon: 'flower', line: 'A delegate\'s pass, pressed like a flower. The gondola wants three.' });
S7.item('ember', { name: 'Ember Charm', kind: 'key', icon: 'ember', line: 'A coal that never cooled, in a cage of silver. Ice weeps when it comes near.' });
S7.item('grauBell', { name: 'Grau\'s Bell', kind: 'story', icon: 'bell', line: 'A small brass service bell. It rings by itself at seven.' });

S7.PINS = [
  { name: 'PIZ NADA — HIGHER THAN YOU THINK', line: 'They say three thousand metres. The mountain says otherwise.', area: '00A' },
  { name: 'GRAND HOTEL NADA — ROOMS 1–316', line: 'There is no Room 7. There never was. Don\'t knock.', area: '00B' },
  { name: 'OBERGLÜCK CHRISTMAS MARKET', line: 'The Glühwein is warm. That\'s how they get you.', area: '01A' },
  { name: 'THAW ACCORD — SIGN HERE', line: 'Treaties are written in pencil and signed in pen.', area: '01B' },
  { name: 'I SURVIVED THE BLACK RUN', line: 'Seven didn\'t.', area: '01C' },
  { name: 'HIMMELSBAHN — HOLD ON TIGHT', line: 'I held on. The lift let go.', area: '01D' },
  { name: '1926 TEAM — EIGHT FOR GOLD', line: 'Eight on the lift. Seven on the wall. One in the bed.', area: '01E' }
];

S7.DOSSIER = {
  t00: { title: 'TARGET 00 — AUGUSTIN GRAU', tab: 'targets', text: 'Bell captain, Grand Hotel Nada. Forty-one years of service. Never late. Never smiled.\n\nSmiling since Tuesday.' },
  t01: { title: 'TARGET 01 — HANSI PULVER', tab: 'targets', text: 'Three Olympic golds. The face of Nada chocolate. Instructor to presidents.\n\nListed by the Department: WARM FRONT — COMMANDER.' },
  graufile: { title: 'Grau\'s employee file', tab: 'documents', text: 'Hired 1984. Promoted 1991. Commended for discretion eleven times.\n\nNotes: carries guests\' luggage without asking what is inside. Recommended.' },
  roomservice: { title: 'Room service: the Bellcaptain\'s specials', tab: 'documents', text: 'Turn-down service. Wake-up call. Late checkout.\n\nEarly checkout. Very early. Ask at the desk.' },
  accord: { title: 'The Thaw Accord, Article Nine', tab: 'documents', text: 'The Free Canton of Piz Nada shall open the Glacier Archive. Every account. Every name.\n\nEvery body. In trust.' },
  avalanche1926: { title: 'The Avalanche of 1926', tab: 'documents', text: 'A clipping. A chairlift of eight young skiers, the national team, caught on the Black Run. One survivor, a girl of four... no. Of fourteen.\n\nThe photograph shows eight. Count again.' },
  standingorders: { title: 'Department of Discretion: Standing Orders', tab: 'documents', text: '1. Discretion.\n2. See 1.' },
  pricelist: { title: 'The ski school price list', tab: 'documents', text: 'Group lesson: 40.\nPrivate lesson: 80.\nPrivate lesson, no questions: 800.' },
  exposure1: { title: 'Exposure: the blackboard', tab: 'exposures', text: 'Under a cartoon of a chairlift, in invisible ink:\n\nTHE DAY THE EIGHT WENT UP: 26 · 01' },
  exposure2: { title: 'Exposure: the ledger', tab: 'exposures', text: 'ACCOUNT 7 — HOLDER: H. HOLLE\nCONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926\n— IN TRUST.' },
  hansiShot: { title: 'Note: the interview (shot)', tab: 'targets', text: 'He talked. You listened. Then you didn\'t.\n\nThe chairlift kept swinging.' },
  hansiFell: { title: 'Note: the interview (fell)', tab: 'targets', text: 'You hesitated. He noticed.\n\nHe let go of the chair. The fog took the rest.' }
};


/* ===== content/personas.js ===== */
/* The Seven (§7.8, §8.3, §11.9 barks). rig: E.Humanoid options (the hats, accessories, weapons and skis are the
 * S7 PATCHes in engine/my-3d2dge.js). */
S7.persona('ansel', {
  n: 1, name: 'Ansel Holle', short: 'ANSEL', epithet: 'THE SWEEP', hp: 120, weapon: 'patrol38', walk: 1, startUnlocked: true,
  look: 'Ski patrolman. Orange parka, black beanie, goggles up.',
  skill: { id: 'flare', name: 'Flare', cost: 12, cooldown: 20, about: 'A flare overhead shows every Whiteout within 30 m for 8 s.' },
  extra: 'Patrol: crosses patrol ropes. Rescue: chips frozen personas free.',
  rig: { build: 'heroic', size: 1.3, hunch: .15, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#18181c', pom: '#f06a1e' }, acc: ['goggles', 'pack'], weapon: 'revolver', sleeves: 'long',
    colors: { skin: '#e6c8b0', hair: '#9a9aa0', cloth: '#d2461e', coat: '#d2461e', pants: '#1c1c22', boot: '#2a2420', trim: '#f4f4f4', glove: '#1c1c22', metal: '#4a4a52', lens: '#f0a020', pack: '#c81e2a' } },
  voice: 'ansel', color: '#d2461e',
  barks: { switch: ['Sweep\'s on.', 'Nobody stays on the mountain.'], crit: 'Clear.', low: 'Patrol needs patrol.', frozen: '...log it...', revived: 'Back on shift.' }
});
S7.persona('dagny', {
  n: 2, name: 'Dagny Holle', short: 'DAGNY', epithet: 'SCHUSS', hp: 80, weapon: 'poleguns', walk: 1.15, startUnlocked: true,
  look: 'Downhill racer. Electric-blue speed suit, silver helmet, orange visor.',
  skill: { id: 'tuck', name: 'Tuck', cost: 2, hold: true, about: 'Hold: double speed on rails, 260 on skis. 2 Red a second. Needed for jumps.' },
  rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'ponytail', hat: { style: 'racehelmet', color: '#c0c8d0', visor: '#ff8a1e' }, weapon: 'poles', sleeves: 'long',
    colors: { skin: '#f0d0b8', hair: '#f0d890', cloth: '#1e5cff', pants: '#1e5cff', trim: '#ffffff', boot: '#101014', glove: '#101014', metal: '#c8ccd4' } },
  voice: 'dagny', color: '#1e5cff',
  barks: { switch: ['Late. Everyone\'s always late.', 'Point me downhill.'], crit: 'Gone.', low: 'Slower is worse.', frozen: '...cold...', revived: 'I owe you a coffee.' }
});
S7.persona('ignaz', {
  n: 3, name: 'Ignaz Holle', short: 'IGNAZ', epithet: 'TELEMARK', hp: 90, weapon: 'gamsbock', walk: .9, startUnlocked: true,
  look: 'Old aristocrat hunter. Tweed, knickerbockers, red socks, a feathered felt hat.',
  skill: { id: 'longlook', name: 'Long Look', cost: 0, about: 'In aim: a ×3.5 scope. Sway halved, range 250 m. Rings far bells.' },
  rig: { build: 'heroic', size: 1.3, hunch: .1, outfit: 'coat', hair: 'short', hat: { style: 'felt', color: '#2e4a2a', feather: '#e8e0c0' }, acc: ['moustache'], weapon: 'rifle', sleeves: 'long',
    colors: { skin: '#ead0b8', hair: '#e8e8e8', cloth: '#7a5a3a', coat: '#7a5a3a', pants: '#6a4a2a', boot: '#8a1a1a', trim: '#3a2a1a', glove: '#5a3a22', metal: '#3a3030', stache: '#f0f0f0', wood: '#6a3a1a' } },
  voice: 'ignaz', color: '#2e4a2a',
  barks: { switch: ['Ah. Weather for it.', 'One shot is a conversation.'], crit: 'Clean.', low: 'I have bled before. In better company.', frozen: '...how undignified...', revived: 'Hm. Thawed.' }
});
S7.persona('rurik', {
  n: 4, name: 'Rurik Holle', short: 'RURIK', epithet: 'MOGUL', hp: 150, weapon: 'bullion', walk: .9, startUnlocked: true,
  look: 'Fur-coated tycoon. Ushanka, black beard, gold tooth, cigar.',
  skill: { id: 'makeitrain', name: 'Make It Rain', cost: 10, cooldown: 6, about: 'Throws coins: Whiteouts within 12 m kneel to grab them for 3 s.' },
  extra: 'Buyout: pays velvet ropes, turnstiles and Murmel.',
  rig: { build: 'bulky', size: 1.4, outfit: 'coat', hair: 'short', hat: { style: 'ushanka', color: '#4a3a2a' }, acc: ['beard', 'cigar'], weapon: 'shotgun', sleeves: 'long',
    colors: { skin: '#e2c0a2', hair: '#1a1410', cloth: '#3a2a20', coat: '#3a2a20', trim: '#d8b040', pants: '#141416', boot: '#141416', glove: '#2a1a12', metal: '#d8b040', beard: '#1a1410' } },
  voice: 'rurik', color: '#d8b040',
  barks: { switch: ['Everything has a price. Even this.', 'I\'ll buy the next round.'], crit: 'Paid in full.', low: 'Bad investment.', frozen: '...put it on my tab...', revived: 'Worth every coin.' }
});
S7.persona('kasimir', {
  n: 5, name: 'Kasimir Holle', short: 'KASIMIR', epithet: 'YODEL', hp: 110, weapon: 'alphorn', walk: 1, startUnlocked: false,
  look: 'Yodeler. White shirt, lederhosen, green braces, the alphorn on his back.',
  skill: { id: 'echo', name: 'Echo', cost: 10, cooldown: 4, about: 'A yodel: opens Echo Walls (25 m), shatters ice crystals (15 m), marks Whiteouts through walls (40 m).' },
  rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'short', hat: { style: 'felt', color: '#6a6a6a', feather: '#3a3a3a' }, acc: ['moustache', 'braces'], weapon: 'alphorn', sleeves: 'short',
    colors: { skin: '#eccab0', hair: '#5a3a1e', cloth: '#f0f0e8', pants: '#5a3a1e', trim: '#2e5a2e', boot: '#4a2e18', metal: '#8a5a2a', stache: '#5a3a1e', wood: '#8a5a2a' } },
  voice: 'kasimir', color: '#2e5a2e',
  barks: { switch: ['Yo-di-ah... hoo.', 'The mountain sings back if you\'re rude enough.'], crit: 'Encore!', low: 'Sour note.', frozen: '...hoo...', revived: 'From the top!' }
});
S7.persona('mireille', {
  n: 6, name: 'Mireille Holle', short: 'MIREILLE', epithet: 'SNAPSHOT', hp: 85, weapon: 'lady25', walk: 1, startUnlocked: false,
  look: 'Press photographer. Trench coat, black beret, black bob, press badge.',
  skill: { id: 'flash', name: 'Flash', cost: 8, cooldown: 2, aimOnly: true, about: 'In aim: stuns Whiteouts in a 35° cone for 2.5 s and reveals them. Develops Exposures.' },
  extra: 'Her warm-spot shots have 25% more room.',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', hat: { style: 'beret', color: '#141414' }, acc: ['badge', 'camera'], weapon: 'pistol', sleeves: 'long',
    colors: { skin: '#f2d6c4', hair: '#141414', cloth: '#c8b48a', coat: '#c8b48a', pants: '#2a2a2e', boot: '#1a1a1e', trim: '#8a7a5a', glove: '#1a1a1e', metal: '#2a2a2e', lips: '#c81e2a' } },
  voice: 'mireille', color: '#c8b48a',
  barks: { switch: ['Smile. No, not you.', 'Light is a confession.'], crit: 'Developed.', low: 'Overexposed.', frozen: '...out of focus...', revived: 'Back in frame.' }
});
S7.persona('brigid', {
  n: 7, name: 'Brigid Holle', short: 'BRIGID', epithet: 'AVALANCHE', hp: 110, weapon: 'avalauncher', walk: 1, startUnlocked: false,
  look: 'Avalanche engineer. Red hard-shell, yellow hard hat with a lamp, a red braid.',
  skill: { id: 'charge', name: 'Control Charge', cost: 15, cooldown: 3, aimOnly: true, about: 'In aim: a long lob with a 5 m blast. The only thing that brings down cornices and seracs.' },
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'ponytail', hat: { style: 'hardhat', color: '#f0c020' }, acc: ['bandolier'], weapon: 'launcher', sleeves: 'long',
    colors: { skin: '#f0d0b8', hair: '#c8501e', cloth: '#c81e1e', coat: '#c81e1e', trim: '#d0d8e0', pants: '#141416', boot: '#2a2420', glove: '#2a2420', metal: '#5a6068' } },
  voice: 'brigid', color: '#c81e1e',
  barks: { switch: ['Fire in the hole. Gently.', 'Snow\'s just water that hasn\'t decided.'], crit: 'Controlled.', low: 'Load\'s shifting.', frozen: '...buried...', revived: 'Dug out. Cheers.' }
});

/* ---- weapons (§7.4) ---- */
S7.weapon('patrol38', { name: 'Patrol .38', kind: 'hitscan', dmg: 24, interval: .4, mag: 6, reload: 1.8, spread: .4, range: 60, recoil: 1.2, burn: true, sfx: 'shot38' });
S7.weapon('poleguns', { name: 'Pole Guns', kind: 'hitscan', dmg: 6, interval: .07, mag: 50, reload: 1.5, spread: 2, range: 35, recoil: .3, auto: true, sfx: 'shotpole' });
S7.weapon('gamsbock', { name: 'Gamsbock', kind: 'hitscan', dmg: 90, interval: 1.2, mag: 5, reload: 2.4, spread: 0, range: 120, recoil: 3, pierce: 1, sfx: 'shotrifle' });
S7.weapon('bullion', { name: 'Bullion', kind: 'pellets', pellets: 10, dmg: 9, interval: .95, mag: 6, reload: .45, perShell: true, spread: 8, range: 25, recoil: 4, knock: 70, sfx: 'shotgun' });
S7.weapon('alphorn', { name: 'Alphorn', kind: 'cone', cone: 25, dmg: 40, interval: 1, mag: 5, reload: 2.5, heat: true, range: 18, recoil: 2, knock: 90, sfx: 'alphorn' });
S7.weapon('lady25', { name: 'Lady .25', kind: 'hitscan', dmg: 15, interval: .2, mag: 9, reload: 1.1, spread: .3, range: 70, recoil: .6, sfx: 'shot25' });
S7.weapon('avalauncher', { name: 'Avalauncher', kind: 'lob', dmg: 70, interval: 1.1, mag: 4, reload: 2.8, range: 90, recoil: 3.5, sfx: 'launcher' });


/* ===== content/shapes.js ===== */
/* S7's shapes (docs/ASSETS.md format): still objects as data, drawn by the engine in 3D (world.shape('S7:id', ...)).
 * Units: 16 = 1 m; the origin is the middle of the footprint on the ground, the front facing south (+y). */
S7.SHAPE_SET = { set: 'S7', format: 1,
  materials: {
    brass: '#c8a040 metal', gilt: '#e0b040 metal', redvelvet: '#8a1420 cloth', whitepaint: '#e8e4dc none', cream: '#f0e8d4 none', blackwood: '#2a1a14 planks', darkwood: '#4a2e1e planks',
    lacquer: '#1a1418 glaze', marblew: '#e8e4dc glaze', green: '#2e4a2a cloth', feather: '#f4f4f8 cloth', ivory: '#f0ead8 none', bottle: '#3a6a3a glaze', amberglass: '#c87820 glaze',
    steelp: '#8a9098 metal', cabin: '#c81e1e metal', glacier: '#9ad8f0 glaze', snowm: '#f0f4fa speck', chalet: '#6a4428 planks', plasterw: '#e8e0d0 noise', roofsnow: '#f4f8ff speck',
    orange: '#f06a1e none', blackp: '#18181c none', ice2: '#bfeaff glaze', coastal: '#2a5ac8 cloth', steppe: '#8a2a2a cloth', ember: { color: '#ff6020', glow: 1 }, glowwarm: { color: '#ffe8b0', glow: 1 }, glowred: { color: '#d81e2a', glow: 1 }, glowwhite: { color: '#fff8e0', glow: 1 }, crystalc: { color: '#8ae8ff', pattern: 'glaze', glow: .4 }, glass: '#a8d8f0 glaze'
  },
  shapes: {
    /* ---- Room 7 ---- */
    'holle-bed': { about: 'an iron bedstead heaped with a featherbed', tags: 'room7', mats: { i: 'iron', s: 'linen', f: 'feather' },
      parts: [['mirror', 'x', ['box', 'i', [17, 0, 0], [2, 30, 26]]], ['box', 'i', [17, 0, 22], [2, 30, 2]], ['box', 's', [0, 0, 8], [34, 30, 6]], ['ball', 'f', [-2, 0, 18], 16, { sz: .55 }], ['ball', 'f', [9, -4, 19], 9, { sz: .5 }], ['box', 's', [-13, 0, 15], [7, 24, 5]]] },
    'wardrobe': { about: 'a tall wardrobe of seven coats, doors ajar', tags: 'room7', mats: { w: 'blackwood', h: 'brass', c: 'redvelvet' },
      parts: [['box', 'w', [0, 0, 0], [40, 18, 64]], ['box', 'c', [0, 8, 8], [34, 3, 46]], ['box', 'w', [-12, 12, 4], [17, 2, 56], { rot: -25 }], ['box', 'w', [12, 12, 4], [17, 2, 56], { rot: 25 }], ['row', 2, [6, 0, 0], ['ball', 'h', [0, 11, 32], 1.2]], ['box', 'w', [0, 0, 64], [44, 20, 3]]] },
    'cuckoo-clock': { about: 'a cuckoo clock on a carved post', tags: 'room7', mats: { w: 'darkwood', f: 'ivory', b: 'brass' }, lights: [[0, 6, 44, '#ffb060', 30]],
      parts: [['box', 'w', [0, 0, 0], [6, 6, 30]], ['box', 'w', [0, 0, 30], [18, 9, 18]], ['prism', 'w', [0, 0, 48], [[-11, 0], [11, 0], [0, 9]], 10, { axis: 'y' }], ['cyl', 'f', [0, 5, 38], 6, 1, { seg: 12 }], ['row', 2, [6, 0, 0], ['box', 'b', [0, 6, 12], [2, 2, 14]]]] },
    'wax-bench': { about: 'a workbench with skis and a glowing wax iron', tags: 'room7', mats: { w: 'oak', s: 'steel', i: 'iron', k: 'orange' }, lights: [[4, 0, 18, '#ff8030', 40]],
      parts: [['box', 'w', [0, 0, 14], [36, 16, 3]], ['mirror', 'xy', ['box', 'w', [15, 6, 0], [3, 3, 14]]], ['box', 'k', [0, -2, 17.5], [44, 4, 1]], ['box', 'i', [6, 4, 17], [7, 4, 3]], ['box', 'k', [-12, 4, 17], [4, 3, 6]]] },
    'candlestick-phone': { about: 'a candlestick telephone', tags: 'room7', mats: { b: 'lacquer', g: 'brass' },
      parts: [['cyl', 'b', [0, 0, 0], 3.5, 1.5], ['cyl', 'b', [0, 0, 1.5], 1, 9], ['cyl', 'b', [0, 0, 10], 2.2, 2, { r2: 1.2 }], ['box', 'g', [3.5, 0, 6], [1.4, 1.4, 6]]] },
    'radiator': { about: 'a cast-iron radiator', tags: 'room7', mats: { i: 'iron' }, parts: [['row', 8, [3, 0, 0], ['box', 'i', [0, 0, 2], [2, 5, 14]]], ['box', 'i', [0, 0, 1], [24, 4, 2]]] },
    'team-photo': { about: 'a framed team photograph of eight skiers', tags: 'room7', mats: { f: 'gilt', p: '#8a8070 none', d: '#3a3430 none' }, parts: [['box', 'f', [0, 0, 0], [2, 20, 14]], ['box', 'p', [1.2, 0, 1.5], [.5, 17, 11]], ['row', 8, [0, 2, 0], ['box', 'd', [1.5, 0, 4], [.5, 1.2, 4]]]] },
    /* ---- the hotel ---- */
    'reception-desk': { about: 'a long marble-topped reception desk', tags: 'hotel', mats: { w: 'blackwood', m: 'marblew', b: 'brass' }, parts: [['box', 'w', [0, 0, 0], [50, 12, 17]], ['box', 'm', [0, 0, 17], [52, 14, 2]], ['box', 'b', [0, 6.5, 6], [50, .8, 1]]] },
    'service-bell-small': { about: 'a brass desk bell', tags: 'hotel', mats: { b: 'brass' }, parts: [['cyl', 'b', [0, 0, 0], 2.5, .6], ['ball', 'b', [0, 0, 1], 2, { sz: .7 }]] },
    'luggage-rack': { about: 'a brass luggage rack with straps', tags: 'hotel', mats: { b: 'brass', s: 'redvelvet' }, parts: [['mirror', 'xy', ['box', 'b', [10, 4, 0], [1.4, 1.4, 12]]], ['box', 's', [0, 0, 12], [22, 10, 1.5]]] },
    'bar-counter': { about: 'a dark bar counter with a brass rail', tags: 'hotel', mats: { w: 'blackwood', t: 'lacquer', b: 'brass' }, parts: [['box', 'w', [0, 0, 0], [60, 12, 18]], ['box', 't', [0, 0, 18], [62, 14, 2]], ['box', 'b', [0, 8, 3], [60, 1, 1]]] },
    'bottle-shelf': { about: 'a mirrored shelf of bottles', tags: 'hotel', mats: { w: 'blackwood', g: 'bottle', a: 'amberglass' }, parts: [['box', 'w', [0, 0, 0], [6, 50, 46]], ['row', 3, [0, 0, 12], ['box', 'w', [3, 0, 12], [6, 50, 1]]], ['row', 7, [0, 6, 0], ['cyl', 'g', [4, 0, 13], 1.4, 7]], ['row', 6, [0, 7, 0], ['cyl', 'a', [4, 0, 25], 1.4, 6]], ['row', 7, [0, 6, 0], ['cyl', 'g', [4, 2, 37], 1.3, 6]]] },
    'fireplace': { about: 'a marble fireplace with a low fire', tags: 'hotel', mats: { m: 'marblew', d: '#1a1010 none', f: 'flame' }, flames: [[0, 2, 3, 10, 9]], lights: [[0, 4, 8, '#ff8030', 70]],
      parts: [['box', 'm', [0, 0, 0], [8, 36, 30]], ['box', 'd', [3, 0, 0], [4, 22, 18]], ['box', 'm', [1, 0, 30], [12, 40, 3]]] },
    'elevator-doors': { about: 'brass elevator doors, perhaps ajar', tags: 'hotel', mats: { b: 'brass', d: '#0a0a0c none', f: 'gilt' }, params: { open: 0 },
      make: p => [['box', 'f', [0, 0, 0], [3, 30, 44]], ['box', 'd', [1, 0, 2], [2, 26 * p.open, 34]], ['box', 'b', [1.5, -7 - p.open * 6, 2], [1.5, 13 - p.open * 6, 34]], ['box', 'b', [1.5, 7 + p.open * 6, 2], [1.5, 13 - p.open * 6, 34]], ['cyl', 'f', [1.5, 0, 40], 4, 1, { seg: 10 }]] },
    'revolving-door': { about: 'a revolving door of brass and glass', tags: 'hotel', mats: { b: 'brass', g: 'glass' }, parts: [['cyl', 'b', [0, 0, 0], 22, 2, { seg: 16 }], ['cyl', 'b', [0, 0, 44], 22, 3, { seg: 16 }], ['cyl', 'b', [0, 0, 0], 1.5, 44], ['ring', 4, 10, ['box', 'g', [0, 0, 2], [20, 1, 40]]]] },
    'velvet-stanchion': { about: 'a brass stanchion', tags: 'hotel', mats: { b: 'brass' }, parts: [['cyl', 'b', [0, 0, 0], 3.5, 1.5], ['cyl', 'b', [0, 0, 1], 1, 16], ['ball', 'b', [0, 0, 18], 2]] },
    'potted-palm': { about: 'a potted palm', tags: 'hotel', mats: { p: 'glazed', l: '#2a6a3a foliage', t: 'bark' }, parts: [['cyl', 'p', [0, 0, 0], 6, 9, { r2: 7 }], ['cyl', 't', [0, 0, 9], 1.2, 14], ['ring', 6, 6, ['box', 'l', [0, 0, 22], [12, 4, 2], { rot: [0, -25, 0] }]]] },
    'luggage-cart': { about: 'a brass luggage cart with suitcases', tags: 'hotel', mats: { b: 'brass', c: 'redvelvet', s: 'leather' }, parts: [['box', 'c', [0, 0, 3], [24, 14, 2]], ['mirror', 'x', ['box', 'b', [11, 0, 3], [1.5, 1.5, 30]]], ['box', 'b', [0, 0, 32], [24, 1.5, 1.5]], ['box', 's', [-4, 0, 5], [12, 10, 8]], ['box', 's', [5, 0, 5], [10, 9, 12]], ['mirror', 'xy', ['cyl', 'b', [10, 6, 0], 2.5, 1]]] },
    'suitcase': { about: 'a leather suitcase', tags: 'hotel', mats: { s: 'leather', b: 'brass' }, parts: [['box', 's', [0, 0, 0], [16, 6, 12]], ['box', 'b', [0, 0, 12], [5, 1, 2]]] },
    'room-door': { about: 'a numbered hotel room door', tags: 'hotel', mats: { w: 'darkwood', b: 'brass', f: 'cream' }, parts: [['box', 'f', [0, 0, 0], [22, 2, 40]], ['box', 'w', [0, 1, 0], [18, 2, 37]], ['ball', 'b', [6, 2.5, 18], 1.2], ['box', 'b', [0, 2.2, 30], [5, .5, 3]]] },
    'room7-door': { about: 'a plain door with a frosted stencilled 7', tags: 'room7', mats: { w: 'whitepaint', g: '#c8d8e8 glaze', s: '#d81e2a none' }, lights: [[0, 6, 26, '#ffd8a0', 26]],
      parts: [['box', 'w', [0, 0, 0], [22, 2, 40]], ['box', 'g', [0, 1.2, 20], [12, 1, 14]], ['box', 's', [1, 1.8, 30], [6, .5, 1.5]], ['box', 's', [3, 1.8, 24], [1.5, .5, 12], { rot: [0, 25, 0] }]] },
    'room-service-cart': { about: 'a room-service cart with a cloche', tags: 'hotel', mats: { c: 'linen', s: 'steel' }, parts: [['box', 'c', [0, 0, 12], [22, 14, 2]], ['mirror', 'xy', ['box', 's', [10, 6, 0], [1.5, 1.5, 12]]], ['ball', 's', [0, 0, 14], 6, { sz: .7 }]] },
    'sconce': { about: 'a wall sconce', tags: 'hotel', mats: { b: 'brass', g: 'glowwarm' }, parts: [['box', 'b', [0, 0, 0], [2, 4, 8]], ['cyl', 'g', [2, 0, 6], 2, 4, { r2: 3 }]] },
    'service-bell-big': { about: 'a giant service bell on a bracket', tags: 'hotel', mats: { b: 'gilt', i: 'iron' }, parts: [['box', 'i', [0, 0, 40], [30, 3, 3]], ['lathe', 'b', [0, 0, 6], [[0, 0], [14, 0], [13, 4], [10, 14], [6, 22], [0, 26]]], ['cyl', 'i', [0, 0, 32], 1.5, 8]] },
    /* ---- the village ---- */
    'chalet-roof': { about: 'a pitched roof heavy with snow', tags: 'village', mats: { s: 'roofsnow', w: 'shingle', t: 'darkwood' }, params: { w: 64, d: 64 },
      make: p => [['prism', 'w', [0, 0, 0], [[-p.w / 2 - 6, 0], [p.w / 2 + 6, 0], [0, p.w * .4]], p.d + 8, { axis: 'y' }], ['prism', 's', [0, 0, 2], [[-p.w / 2 - 6, 0], [p.w / 2 + 6, 0], [0, p.w * .4]], p.d + 9, { axis: 'y', }], ['box', 't', [0, p.d / 2 + 4, -2], [p.w + 12, 2, 4]]] },
    'church-tower': { about: 'a church bell tower with an onion top', tags: 'village', mats: { p: 'plasterw', r: '#2a4a3a metal', b: 'gilt', d: '#1a1a1a none' },
      parts: [['box', 'p', [0, 0, 0], [48, 48, 220]], ['box', 'd', [0, 24.5, 180], [20, 1, 26]], ['cyl', 'r', [0, 0, 220], 26, 18, { seg: 8, r2: 30 }], ['ball', 'r', [0, 0, 252], 22, { sz: 1.2 }], ['cone', 'r', [0, 0, 270], 6, 30], ['cyl', 'b', [0, 0, 300], 1.5, 18]] },
    'gluehwein-stall': { about: 'a market stall with a striped awning and a fire', tags: 'village', mats: { w: 'chalet', a: 'redvelvet', s: 'roofsnow', k: 'iron' }, flames: [[0, 10, 2, 8, 8]], lights: [[0, 10, 12, '#ff9040', 90]],
      parts: [['box', 'w', [0, -6, 0], [40, 16, 16]], ['mirror', 'x', ['box', 'w', [19, 6, 0], [2, 2, 36]]], ['prism', 'a', [0, 0, 36], [[-24, 0], [24, 0], [0, 12]], 30, { axis: 'y' }], ['prism', 's', [0, 0, 38], [[-23, 0], [23, 0], [0, 11]], 28, { axis: 'y' }], ['cyl', 'k', [0, 10, 0], 6, 6]] },
    'phone-booth': { about: 'a red alpine phone booth', tags: 'village', mats: { r: 'cabin', g: 'glass', s: 'roofsnow' }, lights: [[0, 0, 40, '#fff0c0', 40]], parts: [['box', 'r', [0, 0, 0], [16, 16, 4]], ['mirror', 'xy', ['box', 'r', [7, 7, 4], [2, 2, 36]]], ['row', 2, [0, 15, 0], ['box', 'g', [0, 0, 6], [12, 1, 30]]], ['box', 'r', [0, 0, 40], [18, 18, 4]], ['box', 's', [0, 0, 44], [18, 18, 3]]] },
    'ski-rack': { about: 'a wooden ski rack with skis', tags: 'village', mats: { w: 'oak', a: '#c81e1e none', b: '#1e5cff none' }, parts: [['box', 'w', [0, 0, 0], [40, 4, 3]], ['box', 'w', [0, 0, 16], [40, 4, 2]], ['mirror', 'x', ['box', 'w', [19, 0, 0], [2, 4, 18]]], ['row', 5, [8, 0, 0], ['box', 'a', [0, 3, 0], [1.5, 1, 28], { rot: [0, -8, 0] }]], ['row', 4, [8, 0, 0], ['box', 'b', [4, 3, 0], [1.5, 1, 26], { rot: [0, 8, 0] }]]] },
    'fountain-frozen': { about: 'a frozen village fountain', tags: 'village', mats: { s: 'stone', i: 'ice2' }, parts: [['cyl', 's', [0, 0, 0], 40, 10, { seg: 12 }], ['cyl', 'i', [0, 0, 9], 36, 2, { seg: 12 }], ['cyl', 's', [0, 0, 0], 5, 36], ['cyl', 's', [0, 0, 30], 14, 3, { seg: 10 }], ['cone', 'i', [0, 0, 33], 6, 18], ['ring', 6, 12, ['cone', 'i', [0, 0, 10], 2, 22]]] },
    'lift-hut': { about: 'a lift station hut', tags: 'village', mats: { w: 'chalet', s: 'roofsnow', m: 'steelp' }, parts: [['box', 'w', [0, 0, 0], [60, 40, 40]], ['box', 's', [0, 0, 40], [66, 46, 6]], ['cyl', 'm', [0, -26, 0], 3, 70], ['box', 'm', [0, -26, 70], [40, 4, 4]]] },
    'turnstile': { about: 'a steel turnstile', tags: 'village', mats: { m: 'steelp', y: '#f0c020 none' }, parts: [['box', 'm', [0, 0, 0], [6, 14, 18]], ['ring', 3, 6, ['box', 'y', [0, 0, 14], [12, 1.5, 1.5]]]] },
    'piste-pole': { about: 'an orange piste pole', tags: 'mountain', mats: { o: 'orange', b: 'blackp' }, parts: [['cyl', 'o', [0, 0, 0], 1.2, 30], ['cyl', 'b', [0, 0, 22], 1.3, 4]] },
    'floodlight': { about: 'a floodlight mast', tags: 'mountain', mats: { m: 'steelp', l: 'glowwhite' }, lights: [[0, 6, 110, '#fff4d0', 300]], parts: [['cyl', 'm', [0, 0, 0], 3, 110], ['box', 'm', [0, 4, 110], [24, 4, 12]], ['row', 3, [7, 0, 0], ['box', 'l', [0, 6.5, 112], [5, 1, 6]]]] },
    'snow-cannon': { about: 'a snow cannon on a tripod', tags: 'mountain', mats: { m: 'steelp', y: '#f0c020 metal' }, parts: [['ring', 3, 6, ['box', 'm', [0, 0, 0], [2, 2, 20], { rot: [0, 15, 0] }]], ['cyl', 'y', [0, 0, 20], 9, 16, { r2: 6 }]] },
    'net': { about: 'an orange safety net', tags: 'mountain', mats: { o: 'orange', m: 'steelp' }, parts: [['mirror', 'x', ['cyl', 'm', [24, 0, 0], 1, 24]], ['box', 'o', [0, 0, 4], [48, 1, 16]]] },
    'shelter-hut': { about: 'an avalanche shelter hut, half buried', tags: 'mountain', mats: { w: 'chalet', s: 'roofsnow', r: 'cabin' }, parts: [['box', 'w', [0, 0, 0], [70, 50, 36]], ['prism', 's', [0, 0, 36], [[-40, 0], [40, 0], [0, 26]], 56, { axis: 'y' }], ['box', 'r', [0, 25.5, 4], [16, 1, 26]], ['rock', 'snowm', [-30, -20, 0], 24, { sz: .6 }]] },
    'pylon': { about: 'a cable-car pylon of steel lattice', tags: 'mountain', mats: { m: 'steelp', i: '#c8f0ff glaze' }, parts: [['mirror', 'xy', ['box', 'm', [10, 10, 0], [3, 3, 240], { rot: [0, -2, 0] }]], ['row', 6, [0, 0, 40], ['box', 'm', [0, 0, 20], [24, 24, 2]]], ['box', 'm', [0, 0, 240], [60, 12, 8]]] },
    'cornice': { about: 'a heavy snow overhang on a ridge', tags: 'mountain', mats: { s: 'snowm', r: 'rock' }, parts: [['rock', 'r', [0, 0, 0], 40, { sz: .7, seed: 3 }], ['ball', 's', [10, 18, 30], 34, { sz: .55 }], ['ball', 's', [-16, 22, 28], 24, { sz: .5 }]] },
    'serac': { about: 'a tower of blue ice', tags: 'archive', mats: { i: 'glacier' }, parts: [['box', 'i', [0, 0, 0], [26, 20, 70], { rot: 8 }], ['box', 'i', [14, 6, 0], [16, 16, 52], { rot: -10 }], ['cone', 'i', [-6, 0, 70], 12, 18]] },
    'crystal-cluster': { about: 'a cluster of humming ice crystals', tags: 'archive', mats: { c: 'crystalc' }, parts: [['cone', 'c', [0, 0, 0], 8, 46], ['cone', 'c', [10, 4, 0], 6, 34, { rot: [0, 18, 0] }], ['cone', 'c', [-9, -3, 0], 6, 30, { rot: [0, -20, 0] }], ['cone', 'c', [3, -9, 0], 5, 24, { rot: [18, 0, 0] }]] },
    'deposit-box': { about: 'a numbered deposit box door in the ice', tags: 'archive', mats: { m: 'steelp', i: 'ice2', b: 'brass' }, parts: [['box', 'i', [0, 0, 0], [30, 4, 40]], ['box', 'm', [0, 2, 6], [22, 2, 26]], ['cyl', 'b', [0, 3.5, 19], 4, 1, { seg: 10 }]] },
    'lectern': { about: 'a lectern with a frozen ledger', tags: 'archive', mats: { w: 'darkwood', i: 'ice2', p: 'ivory' }, parts: [['box', 'w', [0, 0, 0], [12, 10, 20]], ['box', 'w', [0, 0, 20], [16, 12, 2], { rot: [14, 0, 0] }], ['box', 'p', [0, 0, 23], [14, 10, 2], { rot: [14, 0, 0] }], ['box', 'i', [0, 0, 24], [16, 12, 4], { rot: [14, 0, 0] }]] },
    'pavilion': { about: 'a glass signing pavilion', tags: 'summit', mats: { g: 'glass', m: 'steelp', f: 'feather' }, parts: [['cyl', 'm', [0, 0, 0], 70, 4, { seg: 8 }], ['ring', 8, 64, ['box', 'm', [0, 0, 4], [3, 3, 60]]], ['ring', 8, 62, ['box', 'g', [0, 0, 4], [46, 1, 56]]], ['cyl', 'g', [0, 0, 64], 72, 4, { seg: 8, r2: 20 }]] },
    'flagpole': { about: 'a flagpole with a faction flag', tags: 'summit', mats: { m: 'steelp', c: 'coastal' }, params: { c: 'coastal' }, make: p => [['cyl', 'm', [0, 0, 0], 1.2, 90], ['box', p.c, [12, 0, 72], [24, .5, 16]]] },
    'slalom-gate': { about: 'a slalom gate of two flags', tags: 'summit', mats: { r: '#d81e2a cloth', b: '#2a5ac8 cloth', m: 'steelp' }, parts: [['mirror', 'x', ['cyl', 'm', [24, 0, 0], 1, 30]], ['box', 'r', [-18, 0, 20], [10, 1, 8]], ['box', 'b', [18, 0, 20], [10, 1, 8]]] },
    'chair-station': { about: 'an old chairlift station', tags: 'summit', mats: { w: 'chalet', m: 'steelp', s: 'roofsnow' }, parts: [['box', 'w', [0, 0, 0], [70, 40, 30]], ['box', 's', [0, 0, 30], [76, 46, 6]], ['cyl', 'm', [0, 30, 0], 26, 4, { seg: 12 }], ['cyl', 'm', [0, 30, 4], 3, 60]] },
    'conference-table': { about: 'a long conference table with chairs', tags: 'palais', mats: { w: 'darkwood', c: 'leather' }, parts: [['box', 'w', [0, 0, 12], [80, 24, 3]], ['mirror', 'xy', ['box', 'w', [36, 9, 0], [3, 3, 12]]], ['row', 5, [16, 0, 0], ['box', 'c', [0, 18, 0], [10, 8, 16]]], ['row', 5, [16, 0, 0], ['box', 'c', [0, -18, 0], [10, 8, 16]]]] },
    'security-arch': { about: 'a metal-detector arch', tags: 'palais', mats: { m: 'steelp', r: 'glowred' }, parts: [['mirror', 'x', ['box', 'm', [14, 0, 0], [4, 8, 40]]], ['box', 'm', [0, 0, 40], [32, 8, 4]], ['box', 'r', [0, 4.5, 41], [4, 1, 2]]] },
    'mirror-panel': { about: 'an ornate gilt mirror panel', tags: 'palais', mats: { f: 'gilt', m: '#c8e0f0 glaze' }, parts: [['box', 'f', [0, 0, 0], [40, 4, 60]], ['box', 'm', [0, 2.5, 5], [32, 1, 48]], ['ball', 'f', [0, 2, 60], 6, { sz: .6 }]] },
    'pinboard': { about: 'a press pinboard of clippings', tags: 'palais', mats: { c: '#8a6a4a none', p: 'ivory', r: '#d81e2a none' }, parts: [['box', 'c', [0, 0, 10], [40, 2, 28]], ['row', 4, [9, 0, 0], ['box', 'p', [0, 1.5, 22], [7, .5, 9]]], ['row', 3, [11, 0, 0], ['box', 'p', [0, 1.5, 12], [8, .5, 7]]], ['ball', 'r', [-12, 2, 30], 1]] },
    'blackboard': { about: 'a blackboard on a stand', tags: 'palais', mats: { b: '#1a2a20 none', w: 'darkwood' }, parts: [['mirror', 'x', ['box', 'w', [16, 0, 0], [2, 2, 44]]], ['box', 'b', [0, 0, 16], [34, 2, 26]]] },
    'safe': { about: 'a heavy safe with four dials', tags: 'palais', mats: { s: '#2a3a34 metal', b: 'brass' }, parts: [['box', 's', [0, 0, 0], [24, 22, 28]], ['row', 4, [5, 0, 0], ['cyl', 'b', [0, 11.5, 18], 2, 1, { seg: 10 }]], ['box', 'b', [7, 11.5, 8], [5, 1, 2]]] },
    'stage': { about: 'a ballroom stage with red curtains', tags: 'palais', mats: { w: 'darkwood', c: 'redvelvet', g: 'gilt' }, parts: [['box', 'w', [0, 0, 0], [140, 50, 10]], ['mirror', 'x', ['box', 'c', [66, -22, 10], [14, 4, 80]]], ['box', 'c', [0, -24, 74], [140, 4, 16]], ['box', 'g', [0, 25.5, 2], [140, 1, 6]]] },
    'band-flag': { about: 'a festival banner', tags: 'palais', mats: { r: '#d81e2a cloth', w: 'feather' }, parts: [['box', 'r', [0, 0, 40], [2, 30, 40]], ['box', 'w', [0, 0, 50], [2.2, 30, 8]]] },
    'gondola-station': { about: 'a gondola station platform', tags: 'gondola', mats: { c: 'stone', m: 'steelp', s: 'roofsnow' }, parts: [['box', 'c', [0, 0, 0], [120, 60, 30]], ['row', 4, [36, 0, 0], ['cyl', 'm', [0, -24, 30], 3, 60]], ['box', 'm', [0, 0, 90], [130, 70, 5]], ['box', 's', [0, 0, 95], [130, 70, 4]]] },
    'glacier-gate': { about: 'the steel door of the Glacier Archive', tags: 'archive', mats: { m: 'steelp', i: 'ice2', b: 'brass' }, parts: [['box', 'i', [0, 0, 0], [60, 10, 60]], ['cyl', 'm', [0, 5, 24], 22, 4, { seg: 16 }], ['ring', 6, 14, ['box', 'b', [0, 8, 24], [3, 1, 3]]]] },
    'frozen-case': { about: 'a person frozen upright in a block of ice', tags: 'archive', mats: { i: '#bfeaff glaze', p: '#5a6a80 none', s: '#d8c8b8 none' }, parts: [['box', 'p', [0, 0, 0], [8, 6, 26]], ['ball', 's', [0, 0, 30], 4], ['box', 'i', [0, 0, 0], [16, 12, 40]]] }
  }
};


/* ===== content/songs.js ===== */
/* Songs (§10.1), "alpine noir": the engine's step notation (a token a step: a note, '-' holds, '.' rests, '|' a bar
 * line for the eye). Each play song has an explore layer and a 'danger' layer that starts silent (audio.layer brings it
 * in while Whiteouts are near). The band's four tracks are its musicians: a note sounding is a warm spot showing. */
const rep = (s, n) => Array(n).fill(s).join(' | ');
S7.song('title', { bpm: 84, steps: 2, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, notes: 'A4 - - C5 - E5 | F5 - - E5 - - | D5 - - C5 - B4 | C5 - - - - - | A4 - - C5 - E5 | F5 - - A5 - - | G#5 - - - - - | A5 - - - . . | E5 - - D5 - C5 | B4 - - C5 - D5 | C5 - - B4 - A4 | G#4 - - - - - | F4 - - A4 - C5 | E5 - - D5 - C5 | B4 - - G#4 - B4 | A4 - - - - .' },
  { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . . E3 . . | F2 . . C3 . . | D2 . . A2 . . | E2 . . B2 . . | A2 . . E3 . . | F2 . . C3 . . | E2 . . B2 . . | A2 . . E3 . . | C3 . . G3 . . | G2 . . D3 . . | A2 . . E3 . . | E2 . . B2 . . | F2 . . C3 . . | C3 . . G3 . . | E2 . . B2 . . | A2 . . E3 . .' },
  { name: 'pad', wave: 'sine', vol: .07, notes: 'A3 - - - - - | A3 - - - - - | F3 - - - - - | E3 - - - - - | A3 - - - - - | C4 - - - - - | B3 - - - - - | A3 - - - - - | G3 - - - - - | D3 - - - - - | E3 - - - - - | E3 - - - - - | F3 - - - - - | G3 - - - - - | G#3 - - - - - | A3 - - - - -' },
  { name: 'tick', wave: 'drums', vol: .08, notes: 'h . . . h . | h . . . h . | h . . . h . | h . . . h .' }
] });
S7.song('room7', { bpm: 112, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .12, notes: 'E6 . B5 . G5 . | A5 . E6 . C6 . | B5 . G5 . E5 . | F#5 . A5 . B5 . | E6 . B5 . G5 . | A5 . C6 . E6 . | D6 . B5 . G5 . | E5 - - - . .' },
  { name: 'low', wave: 'triangle', vol: .08, notes: 'E4 . . . B4 . | A3 . . . E4 . | G3 . . . D4 . | B3 . . . F#4 . | E4 . . . B4 . | A3 . . . E4 . | G3 . . . B3 . | E3 . . . . .' },
  { name: 'clock', wave: 'drums', vol: .05, notes: 'h . h . h . | h . h . h .' }
] });
S7.song('hotel', { bpm: 96, steps: 2, tracks: [
  { name: 'bass', wave: 'triangle', vol: .22, notes: 'D3 . F3 . A3 . C4 . | B2 . D3 . F3 . G#3 . | G2 . Bb2 . D3 . F3 . | A2 . C#3 . E3 . G3 . | D3 . F3 . A3 . C4 . | Bb2 . D3 . F3 . A3 . | E3 . G3 . Bb3 . D4 . | A2 . G2 . F2 . E2 .' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: '. . A4 - - F4 E4 - | D4 - - - . . . . | . . G4 - Bb4 - A4 - | E4 - - - . . C#5 - | D5 - - C5 A4 - - - | . . F4 - G4 A4 - - | G4 - - F4 E4 - D4 - | C#4 - - - - - . .' },
  { name: 'brush', wave: 'drums', vol: .06, notes: 'h . h h h . h h | h . h h h . h h' },
  { name: 'danger', wave: 'saw', vol: .09, on: false, notes: 'D3 G#3 . . D3 G#3 . . | . . . . D#4 - . . | D3 G#3 . . D3 G#3 . . | . . A3 D#4 . . . .' },
  { name: 'dangerkick', wave: 'drums', vol: .14, on: false, notes: 'k . . k . . k . | k . . k . k . .' }
] });
S7.song('shaft', { bpm: 132, steps: 2, tracks: [
  { name: 'bell', wave: 'sine', vol: .14, notes: 'C6 . . . G5 . . . | C6 . . . . . G5 . | C6 . . . G5 . . . | E6 . D6 . C6 . . .' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'C3 C3 . C3 Eb3 . C3 . | Ab2 Ab2 . Ab2 G2 . G2 . | C3 C3 . C3 Eb3 . F3 . | G2 . G2 . B2 . D3 .' },
  { name: 'pulse', wave: 'pulse12', vol: .06, notes: 'C5 Eb5 G5 Eb5 C5 Eb5 G5 Eb5 | Ab4 C5 Eb5 C5 G4 B4 D5 B4' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . h . s . h . | k . h k s . h h' },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'C4 - - - F#4 - - - | C4 - - - G4 - - -' }
] });
S7.song('village', { bpm: 118, steps: 2, tracks: [
  { name: 'oom', wave: 'triangle', vol: .22, notes: 'D2 . A2 . D2 . A2 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . E3 . | D2 . A2 . A1 . C#2 .' },
  { name: 'pah', wave: 'pulse', vol: .06, notes: '. F4 . F4 . F4 . F4 | . Bb4 . Bb4 . Bb4 . Bb4 | . C#5 . C#5 . E4 . E4 | . F4 . A4 . E4 . G4' },
  { name: 'accordion', wave: 'pulse12', vol: .08, notes: 'A4 - D5 - F5 - E5 D5 | D5 - - Bb4 - - G4 - | E4 - A4 - C#5 - E5 - | F5 - E5 - D5 - - - | A4 - D5 - F5 - A5 G5 | G5 - - F5 - - E5 - | E5 - D5 - C#5 - Bb4 - | A4 - - - D5 - - .' },
  { name: 'danger', wave: 'drums', vol: .16, on: false, notes: 's s s s s . s . | s s s s s s k .' },
  { name: 'danger2', wave: 'saw', vol: .06, on: false, notes: 'D3 . D#3 . D3 . D#3 . | D3 . G#3 . D3 . G#3 .' }
] });
S7.song('palais', { bpm: 100, steps: 4, tracks: [
  { name: 'arp', wave: 'sine', vol: .1, notes: 'E4 G4 B4 E5 B4 G4 E4 G4 | C4 E4 G4 C5 G4 E4 C4 E4 | A3 C4 E4 A4 E4 C4 A3 C4 | B3 D#4 F#4 B4 F#4 D#4 B3 D#4' },
  { name: 'type', wave: 'drums', vol: .05, notes: 'h . h h . h . h | . h h . h . h h' },
  { name: 'pad', wave: 'triangle', vol: .07, notes: 'E3 - - - - - - - | C3 - - - - - - - | A2 - - - - - - - | B2 - - - - - - -' },
  { name: 'danger', wave: 'square', vol: .06, on: false, notes: 'E5 . . E5 . . F5 . | . . E5 . . . . . | E5 . . E5 . . A#5 . | . . . . B5 . . .' }
] });
// the band: four musicians, four tracks; a note sounding is a warm spot showing (the boss reads these strings)
S7.song('band', { bpm: 112, steps: 2, tracks: [
  { name: 'tuba', wave: 'triangle', vol: .24, notes: 'G2 . . . D2 . . . | G2 . . . D2 . . . | C2 . . . G2 . . . | D2 . . . D2 . A2 .' },
  { name: 'accordion', wave: 'pulse12', vol: .08, notes: '. . B4 D5 . . B4 D5 | . . B4 D5 . . G4 B4 | . . C5 E5 . . C5 E5 | . . A4 C5 . . F#4 A4' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: 'D5 - - - . . . . | . . . . G5 - E5 - | . . . . . . . . | F#5 - - - A5 - . .' },
  { name: 'snare', wave: 'drums', vol: .16, notes: 'k . s . k . s s | k . s . k s s s' }
] });
S7.song('blackrun', { bpm: 138, steps: 2, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 B3 D3 | C3 C3 C4 C3 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 D#3 F#3' },
  { name: 'yodel', wave: 'pulse', vol: .09, notes: 'E5 - E6 - B5 - G5 - | A5 - A6 - E6 - . . | G5 - G6 - D6 - B5 - | B5 - F#5 - B4 - . . | E5 - E6 - B5 - G5 - | A5 - C6 - E6 - D6 - | C6 - B5 - A5 - G5 - | F#5 - - - B5 - . .' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . h . s . h k | k . h k s . h h' },
  { name: 'danger', wave: 'sine', vol: .1, on: false, notes: 'E4 - - - - - - - | C4 - - - - - - - | A3 - - - - - - - | B3 - - - - - - -' },
  { name: 'choir', wave: 'triangle', vol: .1, on: false, notes: 'B4 - - - - - - - | G4 - - - - - - - | E4 - - - - - - - | F#4 - - - - - - -' }
] });
S7.song('gondola', { bpm: 72, steps: 2, tracks: [
  { name: 'pad', wave: 'sine', vol: .12, notes: 'D3 - - - - - - - | F3 - - - - - - - | C3 - - - - - - - | Bb2 - - - A2 - - -' },
  { name: 'pad2', wave: 'triangle', vol: .06, notes: 'A4 - - - G4 - - - | A4 - - - C5 - - - | G4 - - - E4 - - - | F4 - - - E4 - - -' },
  { name: 'heart', wave: 'drums', vol: .14, notes: 'k . k . . . . . | k . k . . . . .' },
  { name: 'creak', wave: 'drums', vol: .04, notes: '. . . . . . t . | . . . . . t . .' },
  { name: 'danger', wave: 'saw', vol: .06, on: false, notes: 'D4 . . D4 . . Eb4 . | D4 . . D4 . . A3 .' }
] });
S7.song('archive', { bpm: 66, steps: 4, tracks: [
  { name: 'drone', wave: 'triangle', vol: .12, notes: 'D2 - - - - - - - - - - - - - - - | Eb2 - - - - - - - - - - - - - - -' },
  { name: 'bells', wave: 'sine', vol: .07, notes: 'A5 . . . D6 . . . . . F6 . . . . . | E6 . . . . . A5 . Bb5 . . . . . . .' },
  { name: 'heart', wave: 'drums', vol: .12, notes: 'k . . k . . . . . . . . . . . . | k . . k . . . . . . . . . . . .' },
  { name: 'danger', wave: 'square', vol: .05, on: false, notes: 'D5 Eb5 D5 Eb5 . . . . D5 Eb5 D5 Eb5 . . . .' }
] });
S7.song('powderking', { bpm: 128, steps: 2, tracks: [
  { name: 'oom', wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . E3 .' },
  { name: 'schlager', wave: 'square', vol: .08, notes: 'E5 - G5 - C6 - G5 - | A5 - - F5 A5 - C6 - | B5 - G5 - D5 - G5 - | C6 - - - . . E5 F5 | E5 - G5 - C6 - E6 - | D6 - C6 - A5 - F5 - | G5 - B5 - D6 - B5 - | C6 - - - . . . .' },
  { name: 'chords', wave: 'pulse12', vol: .05, notes: '. E4 . E4 . E4 . E4 | . A4 . A4 . A4 . A4 | . B4 . B4 . B4 . B4 | . E4 . G4 . E4 . G4' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k . s . k . s . | k . s . k k s s' },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'C3 C#3 C3 C#3 C3 C#3 C3 C#3 | F2 F#2 F2 F#2 G2 G#2 G2 G#2' }
] });
S7.song('slalom', { bpm: 150, steps: 2, tracks: [
  { name: 'gallop', wave: 'triangle', vol: .2, notes: 'C3 . C3 C3 G2 . G2 G2 | F2 . F2 F2 G2 . G2 G2' },
  { name: 'lead', wave: 'square', vol: .07, notes: 'C6 - B5 - G5 - E5 - | F5 - A5 - G5 - - - | C6 - D6 - E6 - C6 - | B5 - G5 - D6 - - -' },
  { name: 'drum', wave: 'drums', vol: .16, notes: 'k h s h k h s s | k h s h k k s h' }
] });
S7.song('interview', { bpm: 60, steps: 2, tracks: [
  { name: 'pad', wave: 'sine', vol: .13, notes: 'C4 - - - - - - - | Ab3 - - - - - - - | F3 - - - - - - - | G3 - - - - - - -' },
  { name: 'high', wave: 'triangle', vol: .04, notes: '. . . . G5 - - - | . . . . Eb5 - - - | . . . . C5 - - - | . . . . D5 - B4 -' }
] });
S7.song('echorun', { bpm: 160, steps: 2, tracks: [
  { name: 'bass', wave: 'saw', vol: .09, notes: 'A2 A2 A3 A2 C3 C3 C4 C3 | D3 D3 D4 D3 E3 E3 E4 E3' },
  { name: 'lead', wave: 'pulse', vol: .08, notes: 'A5 - C6 - E6 - C6 - | D6 - F6 - E6 - B5 - | A5 - E6 - A6 - E6 - | G#6 - E6 - B5 - E6 -' },
  { name: 'drum', wave: 'drums', vol: .18, notes: 'k h s h k k s h' }
] });
S7.song('epilogue', { bpm: 70, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .1, notes: 'E6 . B5 . G5 . | A5 . E6 . C6 . | B5 . G5 . E5 . | F#5 . A5 . B5 . | E6 . B5 . G5 . | A5 . C6 . E6 . | D6 . B5 . G5 . | E5 - - - . .' },
  { name: 'pad', wave: 'sine', vol: .08, notes: 'E3 - - - - - | A2 - - - - - | G2 - - - - - | B2 - - - - -' }
] });
S7.song('stage', { bpm: 120, steps: 4, tracks: [
  { name: 'a', wave: 'square', vol: .12, notes: 'A4 . C5 . E5 . A5 - - - - - - - . . | G#5 - - - E5 - - - A5 - - - - - - -' },
  { name: 'b', wave: 'triangle', vol: .2, notes: 'A2 - - - - - - - - - - - - - - - | E2 - - - - - - - A2 - - - - - - -' }
] });
S7.song('gameover', { bpm: 80, steps: 2, tracks: [
  { name: 'a', wave: 'square', vol: .1, notes: 'E5 - D5 - C5 - B4 - | A4 - - - G#4 - - - | A4 - - - - - - - | . . . . . . . .' },
  { name: 'b', wave: 'triangle', vol: .18, notes: 'A2 - - - - - - - | E2 - - - - - - - | A1 - - - - - - - | . . . . . . . .' }
] });
S7.song('rank', { bpm: 140, steps: 2, tracks: [
  { name: 'a', wave: 'pulse', vol: .12, notes: 'C5 E5 G5 C6 - - E6 - | D6 - C6 - - - . .' },
  { name: 'b', wave: 'triangle', vol: .18, notes: 'C3 - - - G2 - - - | C3 - - - . . . .' }
] });
void rep;


/* ===== content/story/common.js ===== */
/* The cast (§8.3, §11.3), tutorials, objectives, Murmel's hints and Oma Holle's lines (§11.9). */
S7.person('holle', { name: 'Oma Holle', short: 'HOLLE', voice: 'holle',
  rig: { build: 'chibi', size: 1.0, outfit: 'robe', hair: 'long', weapon: null, sleeves: 'long', colors: { skin: '#e8d8c8', hair: '#f4f4f4', cloth: '#e8e4f0', pants: '#e8e4f0', boot: '#d8d4e0' } } });
S7.person('rosalind', { name: 'Sister Rosalind', short: 'ROSALIND', voice: 'rosalind',
  rig: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'short', hood: true, weapon: null, sleeves: 'long', acc: ['shades'], colors: { skin: '#ead8c8', hair: '#f4f4f4', cloth: '#18181c', pants: '#18181c', boot: '#101012', trim: '#f4f4f4', shades: '#2a2a3a' } } });
S7.person('concierge', { name: 'The Concierge', short: 'CONCIERGE', voice: 'concierge', icon: 'phone',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, sleeves: 'long', acc: ['badge'], colors: { skin: '#d8ccc4', hair: '#c0c0c8', cloth: '#101014', coat: '#101014', pants: '#101014', boot: '#0a0a0c', trim: '#2a2a30', eye: '#d0d0d8' } } });
S7.person('fohn', { name: 'Mister Föhn', short: 'FÖHN', voice: 'fohn',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, sleeves: 'long', acc: ['shades'], colors: { skin: '#b8805a', hair: '#141414', cloth: '#f4efe4', coat: '#f4efe4', pants: '#f4efe4', boot: '#d8c8a8', trim: '#e0d8c4' } } });
S7.person('pim', { name: 'Pim the Lift Boy', short: 'PIM', voice: 'pim', fade: .6,
  rig: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2e5a3a' }, weapon: null, colors: { skin: '#dce8ec', hair: '#6a5a4a', cloth: '#2e5a3a', pants: '#2e4a3a', boot: '#2a2a2a' } } });
S7.person('murmel', { name: 'Murmel', short: 'MURMEL', voice: 'murmel', icon: 'murmel', blob: true });
S7.person('grau', { name: 'Augustin Grau', short: 'GRAU', voice: 'grau',
  rig: { build: 'heroic', size: 1.4, outfit: 'coat', hair: 'bald', hat: { style: 'pillbox', color: '#a01818', band: '#e0b040' }, weapon: null, sleeves: 'long', face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#a8a8a8', cloth: '#a01818', coat: '#a01818', pants: '#801010', boot: '#1a1a1a', trim: '#e0b040', glove: '#f4f4f4' } } });
S7.person('hansi', { name: 'Hansi Pulver', short: 'HANSI', voice: 'hansi',
  rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', hat: { style: 'racehelmet', color: '#e0b040', visor: '#a0c0d0' }, weapon: 'poles', sleeves: 'long', skis: { color: '#e0b040' }, colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', boot: '#1a1a1a', glove: '#1a1a1a', metal: '#f0d870', trim: '#ffffff' } } });
S7.person('hansiBare', { name: 'Hansi Pulver', short: 'HANSI', voice: 'hansi',
  rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', weapon: null, sleeves: 'long', colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', boot: '#1a1a1a', glove: '#1a1a1a', trim: '#ffffff' } } });
S7.person('tuba', { name: 'The Tuba', short: 'TUBA', voice: 'band', rig: { build: 'bulky', size: 1.35, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#2e4a2a', feather: '#ffffff' }, weapon: null, face: { eyes: 'slit' }, acc: ['grin', 'braces'], colors: { skin: '#f6f6f4', cloth: '#f4f4f0', pants: '#5a3a1e', boot: '#3a2a1a', trim: '#2e5a2e' } } });
S7.person('accordion', { name: 'The Accordion', short: 'ACCORDION', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'robe', hair: 'ponytail', weapon: null, face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f0f0f0', cloth: '#c81e2a', pants: '#c81e2a', boot: '#3a2a1a', trim: '#ffffff' } } });
S7.person('trumpet', { name: 'The Trumpet', short: 'TRUMPET', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#4a4a4a', feather: '#e0e0e0' }, weapon: null, face: { eyes: 'slit' }, acc: ['grin', 'braces'], colors: { skin: '#f6f6f4', cloth: '#f4f4f0', pants: '#4a3a2a', boot: '#2a1a12', trim: '#3a5a8a' } } });
S7.person('snare', { name: 'The Snare', short: 'SNARE', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'robe', hair: 'long', weapon: null, face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f4f4f4', cloth: '#2a5ac8', pants: '#2a5ac8', boot: '#2a1a12', trim: '#ffffff' } } });
S7.person('villager', { name: 'A villager', short: 'VILLAGER', voice: 'whiteout', rig: { build: 'heroic', size: 1.25, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#5a3a6a', pom: '#f0f0f0' }, weapon: null, colors: { skin: '#e8f4ff', hair: '#c8d8e8', cloth: '#6a8ab0', coat: '#6a8ab0', pants: '#3a4a5a' } } });
S7.person('delegate', { name: 'A delegate', short: 'DELEGATE', voice: 'whiteout', rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, acc: ['badge'], colors: { skin: '#e0eef8', hair: '#a0b0c0', cloth: '#2a3448', coat: '#2a3448', pants: '#1a2030' } } });
S7.person('tableau', { name: 'Frozen', short: 'FROZEN', voice: 'whiteout' });
S7.person('sign', { name: 'A sign', short: '', voice: null, icon: 'sign' });
S7.person('exposure', { name: 'Exposure', short: 'EXPOSURE', voice: null, icon: 'paper' });
S7.person('intercom', { name: 'Intercom', short: 'INTERCOM', voice: 'rosalind', icon: 'phone' });
for (const id of ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid']) S7.PEOPLE[id] = S7.PEOPLE[id] || null;

/* ---- tutorials: one-shot tips, big glyphs, cleared by doing the thing ---- */
S7.TUTORIALS = {
  walk: { parts: [['move', 'HOLD TO WALK']], text: 'Let go and you stand still. Standing is honest.' },
  junction: { parts: [['left', 'PICK A WAY'], ['move', 'GO']] },
  quickturn: { parts: [['turn', 'QUICK TURN']] },
  aim: { parts: [['aim', 'HOLD TO AIM']], text: 'You stop. You look. You listen.' },
  scan: { parts: [['scan', 'SCAN']], text: 'Laughter you can\'t see. Scan to show it.' },
  fire: { parts: [['fire', 'SHOOT THE WARM SPOT']], text: 'The orange glow. One shot thaws them.' },
  heal: { parts: [['heal', 'HOLD TO DRINK RED']], text: 'Red heals. Red also pays.' },
  ring: { parts: [['ring', 'HOLD: THE FEATHERBED']], text: 'Seven coats. Pick one. Let go.' },
  skill: { parts: [['skill', 'SKILL']], text: 'Each of the Seven has one. Most cost Red.' },
  longlook: { parts: [['aim', 'AIM'], ['skill', 'LONG LOOK']], text: 'Ignaz\'s scope reaches what nobody else can.' },
  jump: { parts: [['skill', 'TUCK'], ['move', 'GO']], text: 'Only Dagny jumps. Tucked, or fast.' },
  rescue: { parts: [['interact', 'HOLD AT THE STATUE']], text: 'The Sweep chips the frozen free.' },
  wax: { parts: [['interact', 'THE WAX BENCH']], text: 'Rime buys skill. Wax them well.' },
  ski: { parts: [['move', 'TUCK'], ['turn', 'HOCKEY STOP']], text: 'Stopped on the slope, you can aim.' },
  lift: { parts: [['aim', 'AIM FROM THE LIFT']], text: 'The lift keeps moving. So do they.' }
};

/* ---- objectives: the first that matches is the current one (the map, Rosalind, Murmel's hints) ---- */
S7.OBJECTIVES = [
  { key: 'end', when: s => s.st.flags.t01Done, text: 'Sleep. The snow will continue.', rosalind: 'Sleep. I\'ll keep shaking.' },
  { key: 'hansi', when: s => s.st.target >= 1 && s.st.flags.archiveDone, text: 'The summit. Hansi Pulver skis at midnight.', rosalind: 'Up the freight elevator. He is waiting with his medals.' },
  { key: 'crystals', when: s => s.st.target >= 1 && s.st.flags.gondolaDone && !s.st.flags.crystalsDone, text: 'The Glacier Archive. The ice hums in the corridor.', rosalind: 'The vault. Read nothing. Read everything.' },
  { key: 'archive', when: s => s.st.target >= 1 && s.st.flags.gondolaDone, text: 'The Glacier Archive. Read the ledger. Reach the freight elevator.', rosalind: 'The vault. Read nothing. Read everything.' },
  { key: 'gate', when: s => s.st.target >= 1 && (s.st.items.edelweiss || 0) >= 3, text: 'Take three Edelweiss to the Delegate Gate. Ride the Himmelsbahn.', rosalind: 'Three flowers. The gondola is for delegates. Be one.' },
  { key: 'cornice', when: s => s.st.target >= 1 && s.st.flags.ropeCrossed && !s.st.flags.corniceDown, text: 'The ridge wears a snow hat. Knock it off.', rosalind: 'Brigid knows what to do with a ridge.' },
  { key: 'patrol', when: s => s.st.target >= 1 && s.st.area === '01C' && !s.st.flags.shelterDone, text: 'The avalanche shelter, past the patrol rope.', rosalind: 'The Sweep crosses ropes. Wake him.' },
  { key: 'mirrors', when: s => s.st.target >= 1 && s.st.area === '01B' && !s.st.flags.mirrorsOpen, text: 'The Palais. The Hall of Mirrors hides a passage.', rosalind: 'Mirrors lie. Sing to them.' },
  { key: 'press', when: s => s.st.target >= 1 && s.st.area === '01B' && !s.st.flags.exposure1, text: 'The Palais. A dark press room. A safe that wants a date.', rosalind: 'Somebody with a flash could develop a secret.' },
  { key: 'bell01A', when: s => s.st.target >= 1 && !s.st.flags.churchBell, text: 'Three Edelweiss for the gondola. The T-bar is buried; ring the church bell.', rosalind: 'Three flowers for a gondola. Go and pick them.' },
  { key: 'flowers', when: s => s.st.target >= 1, text: 'Three Edelweiss: the Palais, the band, the mountain.', rosalind: 'Three flowers for a gondola. Go and pick them.' },
  { key: 'grau', when: s => s.st.flags.bellRung, text: 'The service shaft. Augustin Grau.', rosalind: 'The Bellcaptain is in the shaft. Ring for service. You did.' },
  { key: 'gap', when: s => s.st.area === '00B' && !s.st.flags.jumped, text: 'The third floor. The floor ahead has fallen in.', rosalind: 'A hole is a ski jump for someone in a hurry.' },
  { key: 'bell', when: s => s.st.area === '00B' || s.st.flags.jumped, text: 'Ring for service at the end of the hall. The shaft doors open for the bell.', rosalind: 'The Bellcaptain\'s luggage is heavy. Ring for service.' },
  { key: 'key', when: s => s.st.flags.ropePaid && !s.st.items.servicekey, text: 'Find the Service Key behind the bar.', rosalind: 'The staff keep their keys where the drinks are.' },
  { key: 'rope', when: s => s.st.flags.firstClear, text: 'The stairwell is locked. Get behind the bar.', rosalind: 'The bar is for members. Rurik is a member of everything.' },
  { key: 'start', when: () => true, text: 'Third floor and below. Bellcaptain Grau.', rosalind: 'Third floor and below. Don\'t keep him waiting.' }
];
S7.HINTS = {
  start: 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...',
  rope: 'The bar... is for members... Membership is a matter of means... Who in the family has means...?',
  key: 'Behind the bar... where the bottles sleep... a key on a red tassel...',
  gap: 'A hole in the floor... is a ski jump... for someone in a hurry...',
  bell: 'Ring for service... at the end of the hall... Only an old man\'s eyes... reach that far...',
  grau: 'The Bellcaptain... tips his hat... to everyone... Look under it...',
  bell01A: 'The church bell... shakes the snow off the lift station... Someone with a long gun... and long patience...',
  flowers: 'The gondola is for delegates... Three Edelweiss... One in the Palais... one in a tuba... one on the mountain...',
  gate: 'The gondola is for delegates... Three Edelweiss... You have them... Go...',
  mirrors: 'Mirrors lie... Echoes don\'t... Sing to the wall...',
  press: 'The press room is dark... Someone with a flash... could develop a secret...',
  patrol: 'The ridge is closed... Patrol only... The Sweep lives in Room 7... Wake him...',
  cornice: 'The ridge wears a snow hat... Knock it off... and you have a bridge... Brigid knows how...',
  crystals: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  archive: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  hansi: 'He is fast... He is gold... Gold melts... like everything...',
  end: 'Gratuity... was customary... Sleep...',
  fallback: 'Have you tried... being somebody else...?'
};
S7.HOLLE_LINES = [
  [0, 'Shake the bed...'], [0, 'Is it spring yet? Don\'t tell me.'], [0, 'The wind is warm today. Close the window.'], [0, 'Seven coats. Seven hooks. One girl.'],
  [1, 'Eight on the lift... no, seven... no...'], [2, 'Hansi always fell to the left.'], [2, 'I taught Hansi to fall. Not to land.']
];


/* ===== content/story/t00.js ===== */
/* TARGET 00 — TURN-DOWN SERVICE: talks and beats (§11.9). Talk lines: [speaker, text] or { card: [title, sub] }. */
S7.talk('cold_open_phone', [
  ['concierge', 'Good evening, Madame Holle. A guest has checked into the Grand Hotel who will not be checking out.'],
  ['concierge', 'Bellcaptain Grau. Third floor and below. The Department thanks you for your discretion.'],
  ['holle', '...Shake the bed, Rosalind.'],
  ['rosalind', 'She means it\'s time. She always means it\'s time.']
]);
S7.talk('cold_open_wardrobe', [
  ['ignaz', 'Grau. His grandfather carried my luggage in 1925. He never smiled either.'],
  ['dagny', 'This one\'s smiling.'],
  ['rurik', 'Everyone smiles when the price is right.']
]);
S7.talk('briefing_t00_replay', [
  ['concierge', 'Bellcaptain Grau. Third floor and below.'],
  ['concierge', 'The Department thanks you for your discretion. It always has.']
]);
S7.talk('first_whiteout', [
  ['ignaz', 'Laughter. In a hotel lobby. At this hour.'],
  ['dagny', 'Shoot it before it finishes the joke.']
]);
S7.talk('murmel_first', [
  ['murmel', 'Welcome... to Piz Nada... Higher than you think...'],
  ['murmel', 'Gratuity... is customary... The first one... is on the house...'],
  ['murmel', 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...']
]);
S7.talk('pim_00A', [
  ['pim', 'Going up? Nobody\'s going up. The elevator\'s been laughing since Tuesday.'],
  ['pim', 'Seven of you. I always count. Count again, later.']
]);
S7.talk('concierge_bar', [
  ['concierge', 'The Bellcaptain is on duty tonight. Third floor and below.'],
  ['concierge', 'Do enjoy the bar. It is complimentary, for members.']
]);
S7.talk('pim_00B', [['pim', 'Room 7 isn\'t on the plan. The architect was very sorry. He\'s in the walls now.']]);
S7.talk('t00_collapse', [
  ['intercom', 'Housekeeping. Somebody is frozen on the third floor.'],
  ['intercom', 'The Sweep only leaves Room 7 when someone\'s on the floor. He\'s coming.']
]);
S7.talk('t00_after_rescue', [
  ['ansel', 'Clear. Logged.'],
  ['intercom', 'Use the wardrobe if you want him back. Otherwise he goes home to his chair.']
]);
S7.talk('t00_bell', [
  ['ignaz', 'Ring for service, then.'],
  { who: 'sign', text: 'DONNNG.', sfx: 'bigbell' },
  ['dagny', 'Something opened at the end of the hall.']
]);
S7.talk('grau_intro', [
  ['grau', 'Ding. Ding. Ding. Every floor has a bell, and every bell has a floor.'],
  ['grau', 'Your luggage, Madame? It is very heavy. It is full of everyone you were.']
]);
S7.talk('grau_dead', [
  ['grau', 'Checkout... is at... eleven...']
]);
S7.talk('after_grau', [
  { card: ['TARGET 00 — AUGUSTIN GRAU — ELIMINATED'] },
  ['concierge', 'Your guest has checked out. Housekeeping has been notified.'],
  ['concierge', 'Breakfast is served at seven. As always. As it was. As it will be.']
]);

S7.beat('cold_open', function* (G) {
  const sim = G.sim;
  G.cut(true); G.music('room7');
  yield G.card('THE WINTER OF THE THAW ACCORD.');
  yield G.card('THE FREE CANTON OF PIZ NADA.', 'POPULATION: DISCREET.');
  G.cam({ at: [9 * M, 9.5 * M, 2.6 * M], look: [3 * M, 4 * M, 1 * M], fov: 50 });
  G.sfx('phone');
  yield 1.2;
  yield G.say('cold_open_phone');
  G.emit('shakebed', {});
  G.sfx('feathers');
  G.cam({ at: [6 * M, 6.5 * M, 1.2 * M], look: [1.6 * M, 8 * M, 1.6 * M], fov: 55 });
  yield 1.4;
  G.emit('wardrobe', { open: true });
  yield G.say('cold_open_wardrobe');
  yield G.card('TARGET 00', 'TURN-DOWN SERVICE', { who: 'grau', dur: 3 });
  G.cam(null);
  G.cut(false);
  G.flag('coldOpenDone');
  sim.st.target = 0;
  G.area('00A', 'r7', { face: Math.PI });
  sim.entryNode = 'r7'; sim.lastDoor7 = 'r7';
  sim.tut('walk');
});
S7.beat('t00_first_whiteout', function* (G) {
  const sim = G.sim;
  G.emit('laugh', { at: [33 * M, 12 * M, 30], style: 'giggle', pitch: 0, loud: .8 });
  yield .4;
  yield G.say('first_whiteout');
  G.wave('first');
  sim.tut('aim');
  yield G.until(s => s.aim.on || s.st.flags.firstClear);
  if (!sim.st.flags.firstClear) { sim.tut('scan'); yield G.until(s => s.scan || s.st.flags.firstClear || s.enemies.some(e => e.reveal > 0)); }
  if (!sim.st.flags.firstClear) { sim.tut('fire'); yield G.until(s => s.st.flags.firstClear); }
  if (sim.st.flags.firstCrit) sim.say('Clean.', { who: 'ignaz' });
  yield 1.2;
  sim.tut('junction');
});
S7.beat('t00_rope_tip', function* (G) {
  const sim = G.sim;
  if (sim.gateOpen('rope')) return;
  if (sim.st.persona !== 'rurik') sim.tut('ring');
  sim.st.flags.ropeSeen = 1;
  yield 0;
});
S7.beat('t00_collapse', function* (G) {
  const sim = G.sim;
  G.emit('collapse', { at: [sim.hero.x, sim.hero.y, sim.hero.z + 80] });
  G.sfx('collapse');
  sim.st.flags.scriptedFreeze = 1;
  yield .5;
  // the ceiling gives way on whoever is wearing the coat: frozen, statue left where they stood
  if (sim.st.persona === 'ansel') sim.trySwitch('ignaz', true);
  sim.pstate().hp = 0; sim.freezePersona();
  yield G.until(s => s.mode !== 'frozen');
  yield G.say('t00_collapse');
  G.wave('rescue');
  sim.tut('rescue');
});
S7.beat('t00_after_rescue', function* (G) { yield 1; yield G.say('t00_after_rescue'); G.sim.tut('wax'); });
S7.beat('t00_bell', function* (G) {
  G.flag('bellRung');
  G.emit('bigbell', {});
  yield G.say('t00_bell');
  G.cut(true);
  G.cam({ at: [60 * M, 13 * M, 3 * M], look: [64.5 * M, 9.5 * M, 1.6 * M], fov: 50 }, 3);
  G.emit('shaftdoors', { open: true });
  G.sfx('grind');
  yield 3;
  G.cam(null); G.cut(false);
});
S7.beat('grau_start', function* (G) {
  const sim = G.sim;
  G.cut(true);
  G.music('shaft');
  G.cam({ orbit: { c: [7 * M, 7 * M, 6 * M], r: 5 * M, h: 1 * M, speed: .35, a0: 0 }, fov: 60 });
  yield G.card('AUGUSTIN GRAU', 'THE BELLCAPTAIN', { who: 'grau', dur: 2.4 });
  yield G.say('grau_intro');
  G.cam(null); G.cut(false);
  sim.boss.phase = 1; sim.boss.t = 0;
});
S7.beat('t00_end', function* (G) {
  const sim = G.sim;
  G.cut(true);
  yield G.say('grau_dead');
  yield 1.2;
  G.give('grauBell', 1);
  G.cut(false);
  sim.finishTarget(0);
});
S7.beat('t00_results_done', function* (G) {
  const sim = G.sim;
  sim.st.flags.grauDead = 1;
  G.area('room7', 'bed', { silent: false });
  sim.st.room7Door = { area: '01A', node: 'ht' };
  G.cut(true);
  yield G.say('after_grau');
  yield G.say('briefing_t01');
  G.unlock(['kasimir', 'mireille', 'brigid']);
  yield G.card('THREE MORE COATS ARE DRY.');
  yield G.card('TARGET 01', 'APRÈS', { who: 'hansi', dur: 3 });
  G.cut(false);
  sim.st.target = 1;
  sim.addDossier('t01');
  G.area('01A', 'ht', { face: 0 });
  sim.entryNode = 'ht'; sim.lastDoor7 = null;
  sim.tut('ring');
  sim.toast('THE FEATHERBED HAS SEVEN NOW', { life: 4 });
});


/* ===== content/story/t01.js ===== */
/* TARGET 01 — APRÈS: talks and beats (§11.9). */
S7.talk('briefing_t01', [
  ['concierge', 'At midnight, at the summit, the Coastal Federation and the Steppe Directorate will sign the Thaw Accord.'],
  ['concierge', 'Forty years of frozen war, ended with a fountain pen.'],
  ['concierge', 'Article Nine requires the Canton to open the Glacier Archive. Every account. Every name. Every body.'],
  ['rosalind', 'Bodies in a bank.'],
  ['concierge', 'Deposits, Sister.'],
  ['concierge', 'The Föhn has booked a guest onto the mountain. Hansi Pulver. Three Olympic golds. The face on the chocolate.'],
  ['concierge', 'He will ski the summit at midnight and the glacier will weep. The Department would prefer it did not weep.'],
  ['holle', 'Hansi. I taught Hansi to fall.'],
  ['mireille', 'Then we\'ll teach him to land.'],
  ['kasimir', 'Yo-di-ah-hee... hoo.'],
  ['brigid', 'I\'ll bring the snow down on him. Gently. Like a mother.']
]);
S7.talk('pim_01A', [['pim', 'Do you know why it never stops snowing here? Somebody upstairs is shaking a bed.']]);
S7.talk('pim_01D', [['pim', 'There were eight of us on the lift that day. The snow took seven. Count again.'], ['holle', '...Hold on tight, children. Hold on...']]);
S7.talk('pim_01E', [['pim', 'They froze the whole team in the photograph. Smile, everybody. Nobody smiled.']]);
S7.talk('concierge_gate', [['concierge', 'The gondola is reserved for delegates. Delegates carry Edelweiss. Edelweiss grows where it likes.']]);
S7.talk('concierge_atrium', [['concierge', 'The Accord has forty-three articles. Article Nine is the one with teeth. The others are gums.']]);
S7.talk('concierge_vault', [['concierge', 'You are in the vault. The Department would prefer you didn\'t read anything. The Department knows you will.']]);
S7.talk('church_bell', [['ignaz', 'Ring for service, then. Again.'], ['dagny', 'The roof\'s letting go. The lift station\'s clear.']]);
S7.talk('delegate_gate', [['concierge', 'Three Edelweiss. Welcome aboard, delegate. Mind the gap. The gap is about six hundred metres.']]);
S7.talk('darkroom', [['mireille', 'A dark room. My favourite kind of honest.']]);
S7.talk('mirrors_tip', [['kasimir', 'So many of me. And none of them can sing.']]);
S7.talk('band_intro', [['tuba', 'Ein! Zwei! Drei! Vier!'], ['accordion', 'A waltz for the delegates! Everybody dance!'], ['trumpet', 'You came without a partner. That\'s all right. Partners come to you.']]);
S7.talk('band_dead', [['snare', 'Bravo... bravo...'], ['kasimir', 'Encore? No.']]);
S7.talk('cornice', [['brigid', 'Controlled.'], ['ansel', 'Bridge. Logged.']]);
S7.talk('shelter', [['dagny', 'The way down is the way down. Point me at it.']]);
S7.talk('lawine', [['dagny', 'LAWINE!']]);
S7.talk('power_cut', [['rurik', 'The power company. Never trust a monopoly.'], ['ignaz', 'Three insulators on the next pylon. Frozen. A long way off.']]);
S7.talk('power_back', [['dagny', 'Moving. Finally.']]);
S7.talk('ledger', [
  { who: 'exposure', text: 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.' },
  ['mireille', 'We\'re in the vault.'],
  ['ignaz', 'We are the vault, mademoiselle.'],
  ['dagny', 'Don\'t read it twice. Reading twice is how you fall.']
]);
S7.talk('seracs', [['brigid', 'Ice towers. Load-bearing lies. Down they come.']]);
S7.talk('hansi_intro', [
  ['hansi', 'Grüß Gott! You came for a lesson? Lesson one: everything goes downhill.'],
  ['fohn', '(a warm wind, laughing)']
]);
S7.talk('hansi_fall', [['hansi', 'Ha! You melted my snowman. Fine. Catch me if you can ski.']]);
S7.talk('hansi_crash', [['hansi', 'Ooof. Bad edge. Bad... edge...']]);
S7.talk('epilogue', [
  ['fohn', 'Your move, Frau Holle. You lost a bishop. A very handsome bishop. Three gold medals.'],
  ['holle', 'I have seven more pieces.'],
  ['fohn', 'You have one piece, Holle. Wearing seven coats.'],
  ['fohn', 'Spring always comes. That\'s not a threat. It\'s a weather report.'],
  ['rosalind', 'Draughty.'],
  ['concierge', 'The Accord is signed. Nobody remembers signing it. Your next guest arrives with the thaw. Sleep well, Madame.'],
  ['pim', 'Eight on the lift. Seven in the wardrobe. One in the bed. Now you\'ve counted right.', { if: s => s.st.pins.length >= 7 }],
  ['holle', s => s.st.ending === 'fell' ? 'He fell to the left. He always fell to the left.' : 'Seven coats. Seven hooks. Shake the bed, Rosalind.']
]);

S7.beat('pim_01A_seen', function* () { yield 0; });
S7.beat('church_bell', function* (G) {
  G.flag('churchBell'); G.emit('bigbell', {});
  yield G.say('church_bell');
  G.cut(true);
  G.cam({ at: [44 * M, 36 * M, 5 * M], look: [47.5 * M, 32.5 * M, 1 * M], fov: 50 }, 3);
  G.emit('driftfall', {}); G.sfx('rumble');
  yield 2.6;
  G.cam(null); G.cut(false);
  G.toast('THE LIFT STATION IS CLEAR');
});
S7.beat('delegate_gate', function* (G) {
  const sim = G.sim;
  G.cut(true);
  for (let i = 0; i < 3; i++) { G.emit('slot', { i }); G.sfx('chime'); yield .7; }
  yield G.say('delegate_gate');
  G.cut(false);
  sim.st.items.edelweiss = 0; sim.st.flags.gateOpen = 1;
  sim.useExit(sim.rails.nodes.gg);
});
S7.beat('inspector', function* (G) {
  const sim = G.sim;
  if (sim.st.flags.edelweiss1 || sim.enemies.some(e => e.alive && e.type === 'inspector')) return;
  const marks = [[28.5, 29.4], [33.5, 29.4], [31, 32.6]];
  sim.spawnEnemy('inspector', marks[0], { data: { marks, give: 'edelweiss', flag: 'edelweiss1' } });
  sim.say('An inspector, with a delegate\'s pass. He hasn\'t noticed you.', {});
  yield 0;
});
S7.beat('darkroom', function* (G) { if (G.has('exposure1')) return; yield G.say('darkroom'); G.sim.tut('scan'); });
S7.beat('mirrors_tip', function* (G) { yield G.say('mirrors_tip'); });
S7.beat('band_arrive', function* (G) {
  const sim = G.sim;
  if (sim.boss || sim.st.flags.bandDead) return;
  sim.autosave('boss');
  sim.startBoss('band', 0);
  yield 0;
});
S7.beat('band_start', function* (G) {
  G.cut(true);
  G.cam({ at: [46 * M, 37 * M, 3 * M], look: [46.5 * M, 26.6 * M, 2.4 * M], fov: 46 });
  yield G.card('DIE LUSTIGEN VIER', 'THE JOLLY FOUR', { dur: 2.2 });
  yield G.say('band_intro');
  G.cam(null); G.cut(false);
  G.sim.say('Shoot each one while their note sounds.', {});
});
S7.beat('band_end', function* (G) {
  const sim = G.sim;
  G.flag('bandDead'); G.gate('band');
  sim.splash('BRAVO', { crit: true });
  sim.gain('rime', 10, [46 * M, 27 * M, 30]);
  yield G.say('band_dead');
  sim.boss = null; G.music('palais');
});
S7.beat('cornice_down', function* (G) {
  G.cut(true);
  G.cam({ at: [392 * M, 196 * M, G.sim.grid.floorAt(392 * M, 196 * M) + 8 * M], look: [345 * M, 166 * M, G.sim.grid.floorAt(345 * M, 166 * M)], fov: 52 }, 4);
  G.emit('cornicefall', {}); G.sfx('rumble');
  yield 3.4;
  G.cam(null); G.cut(false);
  yield G.say('cornice');
});
S7.beat('lawine', function* (G) {
  const sim = G.sim;
  if (G.has('lawineDone') || G.has('lawine')) return;
  G.flag('lawine');
  sim.lawine = { gap: 12 * M, t: 0, slow: 0 };
  sim.say('LAWINE!', { who: 'dagny', big: true });
  sim.emit('lawine', { on: true });
  yield 0;
});
S7.beat('gondola_board', function* (G) {
  const sim = G.sim;
  yield .6;
  if (sim.W.node === 'gs' && !sim.st.flags.powerBack) { const ex = sim.rails.exits('gs'); if (ex.length) sim.takeBranch(ex[0]); }
  sim.tut('lift');
});
S7.beat('power_cut', function* (G) {
  const sim = G.sim;
  if (G.has('powerBack')) return;
  G.emit('powercut', {}); G.sfx('grind');
  sim.gondola = sim.gondola || {}; sim.gondola.swing = 1;
  yield G.say('power_cut');
  sim.tut('longlook');
});
S7.beat('power_back', function* (G) {
  const sim = G.sim;
  G.flag('powerBack'); G.gate('power');
  G.emit('powerback', {}); G.sfx('lift');
  yield G.say('power_back');
  const ex = sim.rails.exits('mid'); if (sim.W.node === 'mid' && ex.length) sim.takeBranch(ex[0]);
});
S7.beat('ledger_reveal', function* (G) {
  yield G.until(s => !s.uiRequest && !s.uiOpen);
  G.cut(true);
  yield G.say('ledger');
  G.cut(false);
});
S7.beat('seracs_down', function* (G) { G.emit('seracfall', {}); G.sfx('collapse'); yield 1; yield G.say('seracs'); G.flag('archiveDone'); });
S7.beat('summit_arrive', function* (G) { const sim = G.sim; if (sim.boss) return; sim.st.flags.gondolaDone = 1; sim.autosave('boss'); sim.startBoss('hansi', 0); yield 0; });
S7.beat('hansi_intro', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true); G.music('powderking');
  B.actors = [{ who: 'hansi', x: 1000 * M, y: 300 * M, z: sim.grid.floorAt(1000 * M, 300 * M), facing: Math.PI / 2, pose: 'hips' }];
  G.cam({ orbit: { c: [1000 * M, 300 * M, sim.grid.floorAt(1000 * M, 300 * M) + 2 * M], r: 7 * M, h: 1 * M, speed: .25, a0: 1.2 }, fov: 50 });
  yield G.card('HANSI PULVER', 'THE POWDER KING', { who: 'hansi', dur: 2.6 });
  yield G.say('hansi_intro');
  G.emit('avalaughrise', {}); G.sfx('rumble');
  B.actors = [];
  G.cam({ at: [1000 * M, 345 * M, sim.grid.floorAt(1000 * M, 345 * M) + 3 * M], look: [1000 * M, 290 * M, sim.grid.floorAt(1000 * M, 290 * M) + 9 * M], fov: 60 }, 2.5);
  B.rise = 0; yield 2.5;
  G.cam(null); G.cut(false);
  yield G.card('THE AVALAUGH', '', { dur: 1.6 });
  B.phase = 1; sim.autosave('boss');
});
S7.beat('hansi_fall', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true);
  G.emit('avalaughfall', {}); G.sfx('collapse');
  B.actors = [{ who: 'hansi', x: 1000 * M, y: 305 * M, z: sim.grid.floorAt(1000 * M, 305 * M), facing: Math.PI / 2, pose: 'crouch', skis: true }];
  G.cam({ at: [1015 * M, 330 * M, sim.grid.floorAt(1015 * M, 330 * M) + 3 * M], look: [1000 * M, 305 * M, sim.grid.floorAt(1000 * M, 305 * M) + 1.5 * M], fov: 52 }, 3);
  yield G.say('hansi_fall');
  yield 1;
  G.cam(null); G.cut(false);
  BOSS.hansi.toSlalom(sim, B);
  sim.autosave('boss');
});
S7.beat('hansi_crash', function* (G) {
  const sim = G.sim, B = sim.boss;
  G.cut(true);
  G.emit('crash', {}); G.sfx('collapse');
  yield G.say('hansi_crash');
  yield G.card('THE INTERVIEW', '', { dur: 1.6 });
  G.cut(false);
  BOSS.hansi.toInterview(sim, B);
});
S7.beat('hansi_end', function* (G) {
  const sim = G.sim;
  yield 2.5;
  S7.interviewGun = false; sim.bossLockAim = false; sim.aimExit(true); sim.mode = 'rail';
  yield G.card('TARGET 01 — HANSI PULVER — ELIMINATED', sim.st.ending === 'fell' ? 'FELL' : 'SHOT');
  sim.finishTarget(1);
});
S7.beat('epilogue', function* (G) {
  const sim = G.sim;
  sim.st.flags.t01Done = 1;
  G.area('room7', 'bed', { silent: false });
  G.cut(true); G.music('epilogue');
  sim.epilogue = true;
  G.cam({ at: [7 * M, 8.8 * M, 2.2 * M], look: [2.8 * M, 3.6 * M, 1.2 * M], fov: 48 });
  yield 1;
  yield G.say('epilogue');
  G.emit('curtain', {});
  yield 1;
  yield G.card('TARGET 02 — BLACK ICE', 'NEXT WINTER');
  yield G.card('THE SNOW WILL CONTINUE.');
  G.cam(null); G.cut(false);
  sim.epilogue = false;
  sim.autosave('end');
  sim.creditsReady = true;
});


/* ===== content/things3d.js ===== */
/* Things drawn with the pen every frame (they move, glow or flicker), and the people's idle motion. A thing's function
 * gets the pen already at its place: (pen, thing, time, world, sim, presenter). Units: 16 = 1 m. */
Object.assign(S7.THINGS3D, {
  chandelier(pen, th, t) {
    const sw = Math.sin(t * .8 + th.x) * .03;
    pen.at(th.x, th.y, th.z, sw);
    pen.tube(0, 0, 0, 0, 0, 30, .5, '#2a2018');
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, x = Math.cos(a) * 14, y = Math.sin(a) * 14; pen.tube(0, 0, 2, x, y, -2, .5, '#c8a040').ball(x, y, -1, 1.5, 1.5, 1.5, '#e0b040').glow(x, y, 2, 1.6, '#ffe0a0'); }
    pen.ball(0, 0, 0, 5, 5, 4, '#e0b040');
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pen.ball(Math.cos(a) * 9, Math.sin(a) * 9, -7, .9, .9, 2.4, '#e8f4ff'); }
  },
  runner(pen, th) { const o = th.o; pen.box(0, 0, o.stairs ? 34 : .4, o.w * M, o.d * M, o.stairs ? .6 : .6, o.color || '#8a1420'); if (!o.stairs) { pen.box(-o.w * M / 2 + 1, 0, .6, 1, o.d * M, .4, '#d0a040'); pen.box(o.w * M / 2 - 1, 0, .6, 1, o.d * M, .4, '#d0a040'); } },
  r7window(pen, th, t, w) {
    // a tall bay window: frame, moonlit panes, the snow falling past outside
    pen.box(0, 0, 40, 60, 3, 4, '#2a1a14').box(0, 0, 4, 60, 3, 4, '#2a1a14').box(-30, 0, 22, 4, 3, 40, '#2a1a14').box(30, 0, 22, 4, 3, 40, '#2a1a14').box(0, 0, 22, 2, 3, 36, '#2a1a14');
    pen.box(0, -1, 22, 56, .5, 34, '#1a2850');
    for (let i = 0; i < 26; i++) { const x = ((i * 37.3) % 54) - 27, z = 40 - ((t * (8 + (i % 5) * 2) + i * 11) % 34); pen.box(x + Math.sin(t + i) * 2, -2, z, 1, .5, 1, '#ffffff'); }
    pen.glow(0, -4, 30, 6, '#5a7aff');
  },
  r7lamp(pen, th, t) { pen.tube(0, 0, 0, 0, 0, 12, .3, '#2a2018').cone(0, 0, -6, 0, 0, 2, 9, '#d8b080').glow(0, 0, -4, 3.4 + Math.sin(t * 13) * .1, '#ffd8a0'); },
  bellbig(pen, th, t, w, sim) { const ring = sim.st.flags.bellRung ? Math.sin(t * 6) * .2 * Math.max(0, 1 - (t % 8) / 4) : 0; pen.at(th.x, th.y, th.z, 0, 1, ring); pen.box(0, 0, 40, 40, 3, 3, '#3a3030'); pen.cone(0, 0, 0, 0, 0, 30, 16, '#e0b040').ball(0, 0, 30, 5, 5, 4, '#c8a030').glow(0, 0, 14, 3, '#fff0b0'); },
  stringlights(pen, th, t) { const o = th.o, n = o.n || 12; for (let i = 0; i < n; i++) { const u = i / (n - 1), x = (o.dx || 0) * M * u, y = (o.dy || 0) * M * u, z = Math.sin(u * Math.PI) * -12; pen.glow(x, y, z, 1.4, ['#ff4040', '#ffd040', '#40ff80', '#4080ff'][i % 4]); } },
  fire(pen, th, t) { const k = .8 + Math.sin(t * 17 + th.x) * .1 + Math.sin(t * 29) * .08; pen.glow(0, 0, 6, 4 * k, '#ff8030').glow(0, 0, 10, 2.4 * k, '#ffe080'); },
  beacon(pen, th, t) { const a = t * 4; pen.ball(0, 0, 0, 3, 3, 3, '#801010').glow(Math.cos(a) * 3, Math.sin(a) * 3, 0, 3, '#ff2020'); },
  sign(pen, th) { const o = th.o; pen.at(th.x, th.y, th.z, o.yaw || 0).tube(0, 0, 0, 0, 0, 30, 1, '#3a3030').box(0, 0, 32, 3, 22, 14, o.color || '#2a5ac8'); },
  icewall(pen, th, t) { const o = th.o; for (let i = 0; i < (o.n || 6); i++) pen.box(i * 18 - (o.n || 6) * 9, 0, 30 + Math.sin(i * 2.3) * 10, 16, 8, 60 + Math.cos(i * 1.7) * 20, i % 2 ? '#9ad8f0' : '#bfeaff'); pen.glow(0, 6, 40, 6, '#7ad8ff'); },
  frozenperson(pen, th, t) { pen.box(0, 0, 18, 14, 12, 38, '#bfeaff').ball(0, 0, 30, 4, 4, 4, '#d8c8b8').box(0, 0, 12, 6, 4, 22, th.o.color || '#4a5a70'); }
});
/** people's idle motion: Murmel bobs on his bungee, Pim rocks on a floating chair, Rosalind knits */
S7.peopleAnim = (sim, d, t) => {
  if (d.epilogue) return { hidden: !sim.epilogue, state: { pose: 'kneel', expr: 'smile' } };
  if (d.cabinRoof) return { hidden: sim.W.node !== 'mid', dz: Math.sin(t * 1.4) * 2, fade: .6 };
  if (d.who === 'pim') { const seen = sim.spots.some(s => s.kind === 'pim' && !sim.spotUsed(s)) || d.always; return { dz: 20 + Math.sin(t * 1.2) * 3, hidden: !seen && !d.always, fade: .55 + Math.sin(t * 2) * .1, state: { pose: 'kneel' } }; }
  if (d.who === 'murmel') return { dz: Math.sin(t * 2.2) * 2, facing: Math.atan2(sim.hero.y - d.at[1] * M, sim.hero.x - d.at[0] * M) };
  if (d.knit) return { state: { pose: 'kneel', attack: E.move('cast', (t * .7) % 1) } };
  if (d.who === 'holle') return { state: { down: 1 } };
  return {};
};
/** per-frame extras: Pim's chair, Murmel's bungee cords and ski rack, Holle's heaving featherbed */
S7.drawExtra = (R, pres, pen, t) => {
  const sim = pres.sim;
  for (const p of R.people) {
    const d = p.def;
    if (d.who === 'pim' && p.a.visible) { const z = p.a.z; pen.at(p.a.x, p.a.y, z); pen.box(0, 0, -2, 16, 12, 2, '#3a5a8a').box(-6, 0, 8, 2, 12, 18, '#3a5a8a').tube(0, 0, 18, 0, 0, 90, .5, '#4a4a52').glow(0, 0, 4, 3, '#c8f0ff'); }
    if (d.who === 'murmel') { pen.at(p.x, p.y, p.z); pen.box(-14, 0, 14, 4, 30, 30, '#5a3a22').tube(0, -5, 12, -12, -10, 22, .5, '#e02020').tube(0, 5, 12, -12, 10, 22, .5, '#20a0e0'); }
  }
  if (R.id === 'room7') {
    const shake = sim.st && sim.st.flags.coldOpenShake ? Math.sin(t * 20) * 1.5 : 0;
    pen.at(2.2 * M, 3.2 * M, 0);
    for (let i = 0; i < 9; i++) { const a = i * 1.7; pen.ball(Math.cos(a) * 8 + (i % 3) * 4 - 6, Math.sin(a) * 9, 18 + (i % 2) * 3 + Math.sin(t * 1.3 + i) * .6 + shake, 7, 7, 4, '#f4f4f8'); }
  }
};
/** Murmel is a marmot: a Blob (§8.3), drawn as an actor beside his rack */
S7.peopleBlob = (who) => who === 'murmel' ? new E.Blob({ R: 9, ears: 'cat', feet: true, mouth: true, face: 'front', colors: { dk: '#c8c4bc', base: '#f4f4f0', lt: '#ffffff', spec: '#ffffff', eye: '#1a1010', pupil: '#000000' } }) : null;


/* ===== content/voices.js ===== */
/* Voices (§10.4): base pitch (Hz), range (semitones), rate, source wave and each speaker's tic. */
S7.voice('holle', { pitch: 420, range: 5, rate: .7, wave: 'triangle', vib: 6, vol: .7 });
S7.voice('rosalind', { pitch: 260, range: 2, rate: 1.2, wave: 'square' });
S7.voice('concierge', { pitch: 120, range: 1, rate: .8, wave: 'sawtooth', band: true, crackle: true });
S7.voice('fohn', { pitch: 160, range: 4, rate: .9, wave: 'sine', breath: true, glide: true, vol: 1.2 });
S7.voice('pim', { pitch: 520, range: 3, rate: 1.3, wave: 'triangle', echo: true });
S7.voice('murmel', { pitch: 200, range: 2, rate: .7, wave: 'sawtooth', lowpass: 600 });
S7.voice('ansel', { pitch: 110, range: 1, rate: .8, wave: 'sawtooth' });
S7.voice('dagny', { pitch: 330, range: 3, rate: 1.4, wave: 'square' });
S7.voice('ignaz', { pitch: 140, range: 2, rate: .8, wave: 'sawtooth', vib: 5 });
S7.voice('rurik', { pitch: 95, range: 2, rate: 1, wave: 'sawtooth', gravel: true });
S7.voice('kasimir', { pitch: 180, range: 7, rate: 1.1, wave: 'square', yodel: true });
S7.voice('mireille', { pitch: 300, range: 4, rate: 1, wave: 'triangle', breath: true });
S7.voice('brigid', { pitch: 240, range: 2, rate: 1, wave: 'square' });
S7.voice('grau', { pitch: 150, range: 1, rate: 1, wave: 'square', ding: true });
S7.voice('hansi', { pitch: 210, range: 5, rate: 1.1, wave: 'square', glide: true });
S7.voice('band', { pitch: 260, range: 6, rate: 1.2, wave: 'square' });
S7.voice('whiteout', { pitch: 380, range: 6, rate: 1.3, wave: 'square' });


/* ===== src/90-present3d.js ===== */
/* PRESENTER 3D: turns sim state into pictures with the engine's 3D module. One World3D per area (Room 7's and the last
 * area's are kept, so the door is instant); the hero, Whiteouts and people are the 2D engine's rigs drawn as cards,
 * placed by us every step (pose: false, never read back); props are store and S7 shapes; things are drawn with the pen
 * each frame; warm spots are glows; the gun is the first-person overlay. It never changes sim state. */
const RIG_CACHE = {};
/** a persona's rig (one per persona, kept) */
S7.personaRig = (id) => RIG_CACHE[id] || (RIG_CACHE[id] = new E.Humanoid(Object.assign({}, S7.PERSONAS[id].rig)));
S7.peopleRig = (id) => RIG_CACHE['p:' + id] || (RIG_CACHE['p:' + id] = S7.PEOPLE[id] && S7.PEOPLE[id].rig ? new E.Humanoid(Object.assign({}, S7.PEOPLE[id].rig)) : null);
S7.whiteoutRig = (e) => {
  const ED = S7.ENEMIES[e.type];
  const o = { build: ED.ai === 'plow' || e.type === 'bloom' ? 'bulky' : 'heroic', size: 1.25 * e.size, hunch: .2 + (e.id % 4) * .04, outfit: e.type === 'bellboy' ? 'coat' : 'shirt', hair: 'bald', weapon: null, sleeves: 'long',
    face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f0f0f0', cloth: e.tint || '#ffffff', coat: e.tint || '#ffffff', pants: '#ecedf2', boot: '#e0e2ea', trim: '#d8dce8', eye: '#0a0a0e', belt: '#e0e4ec', glove: '#f4f4f4' } };
  if (e.hat) o.hat = { style: e.hat, color: '#f4f4f4' };
  if (e.type === 'bellboy') { o.hat = { style: 'pillbox', color: '#f4f4f4' }; }
  if (ED.skis) o.skis = { color: '#e8e8f0' };
  return new E.Humanoid(o);
};

class Presenter3D {
  constructor(game, sim, W3) {
    this.game = game; this.sim = sim; this.W3 = W3;
    this.worlds = {}; this.cur = null; this.order = [];
    this.flakes = []; this.decals = []; this.fx = []; this.lastArea = null;
    this.t = 0; this.prevCam = null; this.curCam = null;
    this.filterProbe = { done: S7.storeGet('s7:celOk', null) !== null, ok: S7.storeGet('s7:celOk', true) };
    S7.bus.on('area', d => { this.lastArea = d.from; });
    S7.bus.on('kill', d => this.onKill(d));
    S7.bus.on('explode', d => this.onExplode(d));
    S7.bus.on('crit', d => this.burst(d.at, '#ff3040', 16, 1.2));
    S7.bus.on('hit', d => this.burst(d.at, '#ff6070', 5, .6));
    S7.bus.on('tink', d => d.at && this.burst(d.at, '#c8f4ff', 6, .5, true));
    S7.bus.on('shatter', d => this.burst(d.at, '#e8f4ff', 8, .6, true));
    S7.bus.on('impact', d => this.burst(d.at, '#d8d4cc', 3, .4, true));
    S7.bus.on('splat', d => this.burst(d.at, '#ffffff', 6, .5, true));
    S7.bus.on('solve', d => d.at && this.burst(d.at, '#ffe8a0', 18, 1.2, true));
    S7.bus.on('steam', d => this.burst(d.at, '#ffffff', 20, 1.4, true));
    S7.bus.on('blink', d => this.burst(V.add(d.from, [0, 0, 18]), '#ffffff', 10, .7, true));
    S7.bus.on('hockeystop', () => { const h = this.sim.hero; this.burst([h.x + Math.cos(h.yaw) * 8, h.y + Math.sin(h.yaw) * 8, h.z + 2], '#ffffff', 26, .8, true); });
    S7.bus.on('switch', () => { const h = this.sim.hero; this.burst([h.x, h.y, h.z + 20], '#ffffff', 30, .9, true); this.game.flash('#ffffff', .12, .5); });
    S7.bus.on('rescue', d => { if (d.persona) { const s = this.sim.hero; this.burst([s.x, s.y, s.z + 20], '#c8f4ff', 34, 1.2, true); } });
    S7.bus.on('flurry', () => this.game.flash('#ffffff', .3, .9));
    S7.bus.on('land', () => { const h = this.sim.hero; this.burst([h.x, h.y, h.z + 2], '#ffffff', 18, .7, true); });
  }
  /* ---------------- worlds ---------------- */
  ensure(areaId) {
    let R = this.worlds[areaId];
    if (!R) {
      // keep at most the new world, Room 7's and the one we came from
      const keep = new Set([areaId, 'room7', this.sim.st && this.sim.st.room7Door ? this.sim.st.room7Door.area : null, this.cur && this.cur.id]);
      for (const id of Object.keys(this.worlds)) if (!keep.has(id)) { try { this.worlds[id].world.dispose(); } catch (e) { /* already gone */ } delete this.worlds[id]; }
      R = this.worlds[areaId] = this.build(areaId);
    }
    if (this.cur !== R) { this.cur = R; this.resetActors(R); this.decals = []; }
    return R;
  }
  build(areaId) {
    const A = S7.AREAS[areaId], Wd = A.world, W3 = this.W3, game = this.game;
    const o = {
      sky: Wd.sky || '#06050b', fog: Wd.fog ? Object.assign({}, Wd.fog, { far: Wd.fog.far * T.fogFar }) : false, ambient: Wd.ambient || ['#606070', '#202028', 1.2],
      torchLights: Wd.torchLights || 0, torchShadows: 1, lights: Wd.lights || 6, glowLights: 6, spots: 0,
      overlay: { fov: 62 }, camera: { mode: 'fixed', near: 1.5 }, look: 'card', gravity: 480,
      filter: { bands: T.celBands, ink: T.inkStrength, inkW: 1.5, punch: 1.4, apply: 'all' },
      onDraw: (w, r) => this.onDraw(w, r)
    };
    if (Wd.sun) o.sun = Wd.sun;
    if (Wd.kind === 'terrain') {
      o.terrain = Object.assign({ size: Wd.size || 32768, height: Wd.height, cell: Wd.cell || 32, chunk: 32, far: Wd.far || 14000, physics: 300, detail: 1.3 }, Wd.terrainLook || {});
      if (Wd.color) o.terrain.color = Wd.color;
    } else {
      const b = S7.buildRows(Wd);
      o.level = { rows: b.rows, legend: b.legend, ground: Wd.ground || 'flagstone', colors: Wd.colors, side: Wd.side || 'block', wallSide: Wd.wallSide || Wd.side || 'block', color: Wd.raisedColor || Wd.wallColor, bottom: -400 };
    }
    const world = new W3(game, o);
    const R = { id: areaId, A, world, things: [], lights: [], people: [], hero: null, enemies: new Map(), flakes: null };
    world.camera.mouseLook = false;
    for (const p of A.props || []) {
      if (p[0] === 'shape') { try { world.shape(p[1], p[2] * M, p[3] * M, (p[4] || 0) * M, Object.assign({ solid: false }, p[5] || {})); } catch (e) { game.fail('shape ' + p[1], e); } }
      else if (p[0] === 'thing') R.things.push({ kind: p[1], x: p[2] * M, y: p[3] * M, z: (p[4] || 0) * M, o: p[5] || {} });
      else if (p[0] === 'light') { const L = world.light(Object.assign({ color: '#ffffff', reach: 120, power: 2 }, p[4] || {})); L.x = p[1] * M; L.y = p[2] * M; L.z = (p[3] || 2) * M; L.on = true; L.base = L.power; L.flick = (p[4] && p[4].flicker) || 0; L.tag = p[4] && p[4].tag; R.lights.push(L); }
    }
    // extra lights the presenter moves (muzzle flash, the flare, boss lights)
    R.muzzle = world.light({ color: '#ffd080', reach: 140, power: 0 }); R.muzzle.on = false;
    R.flareL = world.light({ color: '#ff4030', reach: 520, power: 0 }); R.flareL.on = false;
    for (const pp of A.people || []) {
      const rig = S7.peopleRig(pp.who), blob = !rig && S7.peopleBlob ? S7.peopleBlob(pp.who) : null; if (!rig && !blob) continue;
      const t = S7.tw(pp.at), z = pp.z !== undefined ? pp.z * M : 0;
      const a = world.mob(Object.assign({ x: t[0], y: t[1], z, pose: false, fly: true, facing: pp.facing || 0 }, rig ? { rig } : { blob })); a.setSolid(false);
      R.people.push({ a, rig, blob, def: pp, x: t[0], y: t[1], z });
    }
    if (Wd.snow) R.snow = { n: Wd.snow, wind: Wd.wind || [.3, .1] };
    if (S7.buildExtra) S7.buildExtra(R, this);
    try { world.prepare(); } catch (e) { game.fail('prepare', e); }
    return R;
  }
  resetActors(R) {
    for (const [, e] of R.enemies) { try { R.world.remove(e.a); } catch (err) { /* gone */ } }
    R.enemies.clear();
    if (R.hero) { try { R.world.remove(R.hero); } catch (err) { /* gone */ } R.hero = null; }
  }
  /* ---------------- each step ---------------- */
  step(dt) {
    const sim = this.sim; if (!sim.st) return;
    const R = this.ensure(sim.st.area), w = R.world, h = sim.hero;
    this.t += dt;
    // the hero: the active persona's rig on one actor (hidden in first person)
    const pid = sim.st.persona, rig = S7.personaRig(pid);
    if (!R.hero) { R.hero = w.hero({ x: h.x, y: h.y, z: h.z, rig, pose: false, fly: true, r: 4, half: 8 }); R.hero.setSolid(false); }
    const A = R.hero;
    if (A.rig !== rig) A.rig = rig;
    A.place(h.x, h.y, h.z + (sim.W.air ? 0 : 0)); A.facing = h.yaw;
    A.visible = sim.aim.k < .5 && sim.mode !== 'interview' && !sim.hideHero && !(sim.areaDef.hideHero && sim.areaDef.hideHero(sim));
    const sw = sim.switching;
    A.fade = sw ? (sw.t < .22 ? 1 - sw.t / .22 : (sw.t - .22) / .23) : 1;
    A.sink = sw ? (sw.t < .22 ? sw.t / .22 * 20 : (1 - (sw.t - .22) / .23) * 20) : 0;
    if (sim.mode === 'frozen') A.fade = 1;
    const e = sim.W.edge ? sim.rails.edges[sim.W.edge] : null, ski = e && (e.kind === 'ski' || e.kind === 'jump') || sim.W.air;
    const st = { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.yaw };
    if (!ski && sim.W.v > 1) { st.vx = Math.cos(h.yaw) * sim.W.v; st.vy = Math.sin(h.yaw) * sim.W.v; }
    if (ski) { st.pose = 'crouch'; st.lean = sim.tucking ? .45 : .25; }
    if (sim.healing && sim.pstate().hp < sim.maxHp()) st.pose = 'cast';
    if (sim.mode === 'frozen') { st.pose = 'guard'; }
    if (sw && sw.t > .22 && sw.t < .45) st.pose = 'hips';
    if (sim.W.air) st.air = true;
    if (sim.holdSpot) st.pose = 'kneel';
    rig.state = rig.state || {}; rig.state.skis = !!ski || pid === 'dagny' && sim.areaDef.skis;
    if (sim.mode !== 'frozen') rig.update(dt, st);
    // Whiteouts: an actor each, faded in when revealed, melting when thawed
    const seen = new Set();
    for (const en of sim.enemies) {
      seen.add(en.id);
      let E1 = R.enemies.get(en.id);
      if (!E1) { const rg = S7.whiteoutRig(en); const a = w.mob({ x: en.x, y: en.y, z: en.z, rig: rg, pose: false, fly: true, facing: en.facing }); a.setSolid(false); E1 = { a, rig: rg, vis: 0, px: en.x, py: en.y }; R.enemies.set(en.id, E1); }
      const a = E1.a, rev = sim.isRevealed(en) || !en.alive;
      E1.vis = E.approach(E1.vis, rev ? 1 : 0, dt / (rev ? .25 : .4));
      a.place(en.x, en.y, en.z); a.facing = en.facing + (en.turned ? Math.PI : 0);
      a.visible = E1.vis > .02; a.fade = E1.vis * (en.alive ? 1 : Math.max(0, 1 - en.melting / .8));
      a.sink = en.alive ? (en.sinkZ || 0) : en.melting / .8 * 26;
      a.flash = en.hurtT > 0 ? .5 : en.giggle > 0 ? (Math.floor(en.giggle * 30) % 2 ? .6 : 0) : 0;
      const vx = (en.x - E1.px) / Math.max(dt, 1e-4), vy = (en.y - E1.py) / Math.max(dt, 1e-4); E1.px = en.x; E1.py = en.y;
      const rs = { x: en.x, y: en.y, z: en.z, vx, vy, facing: a.facing, expr: 'smile', run: S7.ENEMIES[en.type].ai === 'runner' ? .6 : .3 };
      if (en.laughPose > 0 || en.giggle > 0) rs.pose = 'cheer';
      if (en.kneel > 0) rs.pose = 'kneel';
      if (en.stun > 0) rs.pose = 'guard';
      if (en.throwPose > 0) rs.attack = E.move('throw', 1 - en.throwPose / .4);
      if (S7.ENEMIES[en.type].sled || en.type === 'skier') { rs.pose = 'crouch'; rs.vx = rs.vy = 0; }
      if (en.giggle > 0) E1.rig.kick(.06);
      E1.rig.update(dt, rs);
      // tells: footprints (snow 8 s, indoors wet 2.5 s) and breath
      E1.stepD = (E1.stepD || 0) + Math.hypot(vx, vy) * dt;
      if (en.alive && E1.stepD > 11 && !S7.ENEMIES[en.type].sled && !en.fly) { E1.stepD = 0; E1.foot = -(E1.foot || 1); const out = sim.areaDef.outdoor || sim.grid.kind === 'terrain'; this.decal(en.x + Math.cos(en.facing + Math.PI / 2) * 2.4 * E1.foot, en.y + Math.sin(en.facing + Math.PI / 2) * 2.4 * E1.foot, en.z, out ? 8 : 2.5, out ? '#9aa6c0' : '#4a5260', en.facing); }
      E1.breath = (E1.breath || Math.random() * 1.2) - dt;
      if (en.alive && E1.breath <= 0) { E1.breath = 1.2; if (sim.areaDef.cold !== false) this.fx.push({ k: 'puff', x: en.x + Math.cos(en.facing) * 6, y: en.y + Math.sin(en.facing) * 6, z: en.z + 30 * en.size, t: 0, life: .9 }); }
    }
    for (const [id, E1] of R.enemies) if (!seen.has(id)) { try { w.remove(E1.a); } catch (err) { /* gone */ } R.enemies.delete(id); }
    // people (Room 7's, Murmel, Pim...)
    for (const p of R.people) {
      const d = p.def, extra = S7.peopleAnim ? S7.peopleAnim(sim, d, this.t) : {};
      p.a.place(p.x + (extra.dx || 0), p.y + (extra.dy || 0), p.z + (extra.dz || 0)); p.a.facing = extra.facing !== undefined ? extra.facing : d.facing || Math.atan2(h.y - p.y, h.x - p.x);
      p.a.visible = !(extra.hidden); p.a.fade = extra.fade !== undefined ? extra.fade : (S7.PEOPLE[d.who] && S7.PEOPLE[d.who].fade) || 1;
      if (p.blob) { p.blob.update(dt, { squash: Math.sin(this.t * 2.2) * .12, look: [Math.cos(p.a.facing), Math.sin(p.a.facing)] }); continue; }
      p.rig.update(dt, Object.assign({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.a.facing, pose: d.pose || null, expr: d.expr || null }, extra.state || {}));
    }
    // the boss's people (Grau, the band, Hansi): actors with the people's rigs, made and dropped as the boss needs them
    const B = sim.boss, want = new Set();
    R.bossActors = R.bossActors || new Map();
    if (B && B.actors) B.actors.forEach((ba, i) => {
      const key = ba.who + ':' + i; want.add(key);
      let X = R.bossActors.get(key);
      if (!X) { const rig = S7.peopleRig(ba.who); if (!rig) return; const a = w.mob({ x: ba.x, y: ba.y, z: ba.z, rig, pose: false, fly: true }); a.setSolid(false); X = { a, rig }; R.bossActors.set(key, X); }
      X.a.place(ba.x, ba.y, ba.z); X.a.facing = ba.facing || 0; X.a.visible = !ba.hidden; X.a.fade = ba.who === 'hansiBare' ? 1 : 1;
      X.a.sink = B.id === 'band' && B.alive && !B.alive[ba.who] ? 10 : 0;
      X.rig.state = X.rig.state || {}; X.rig.state.skis = !!ba.skis;
      X.rig.update(dt, { x: ba.x, y: ba.y, z: ba.z, vx: 0, vy: 0, facing: X.a.facing, pose: ba.pose || null, attack: ba.attack || null, expr: ba.expr || null, down: B.id === 'band' && B.alive && !B.alive[ba.who] ? 1 : 0, lean: ba.skis ? .35 : 0 });
    });
    for (const [k, X] of R.bossActors) if (!want.has(k)) { try { w.remove(X.a); } catch (e) { /* gone */ } R.bossActors.delete(k); }
    // echoes: the other skiers (Echo Run), translucent, with a scarf in their colour
    R.ghostActors = R.ghostActors || new Map();
    const gseen = new Set();
    for (const gh of S7.ghosts || []) {
      gseen.add(gh.id);
      let X = R.ghostActors.get(gh.id);
      if (!X) { const rig = new E.Humanoid(Object.assign({}, S7.PERSONAS.dagny.rig, { colors: Object.assign({}, S7.PERSONAS.dagny.rig.colors, { cloth: gh.color, pants: gh.color }) })); const a = w.mob({ x: gh.x, y: gh.y, z: gh.z, rig, pose: false, fly: true }); a.setSolid(false); X = { a, rig, px: gh.x, py: gh.y }; R.ghostActors.set(gh.id, X); }
      X.a.place(gh.x, gh.y, gh.z); X.a.facing = gh.yaw; X.a.fade = .45; X.a.visible = true;
      X.rig.state = X.rig.state || {}; X.rig.state.skis = true;
      X.rig.update(dt, { x: gh.x, y: gh.y, z: gh.z, vx: 0, vy: 0, facing: gh.yaw, pose: 'crouch', point: !!gh.aim, lean: .3 });
    }
    for (const [k, X] of R.ghostActors) if (!gseen.has(k)) { try { w.remove(X.a); } catch (e) { /* gone */ } R.ghostActors.delete(k); }
    if (S7.stepExtra) S7.stepExtra(R, this, dt);
    // effects
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < f.life);
    for (const d of this.decals) d.t += dt;
    this.decals = this.decals.filter(d => d.t < d.life);
    w.step(dt);
    this.prevCam = this.curCam; this.curCam = Object.assign({}, sim.cam.pose);
  }
  decal(x, y, z, life, color, yaw) { this.decals.push({ x, y, z, life, color, yaw, t: 0 }); if (this.decals.length > 600) this.decals.splice(0, this.decals.length - 600); }
  burst(at, color, n, life, light) { if (!at) return; for (let i = 0; i < n; i++) this.fx.push({ k: 'bit', x: at[0], y: at[1], z: at[2], vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120, vz: Math.random() * 110 + 20, t: 0, life: life * (.6 + Math.random() * .6), c: color, s: light ? 1.1 : 1.6 }); }
  onKill(d) {
    const e = d.enemy; if (!e) return;
    this.burst([e.x, e.y, e.z + 18], '#e01828', d.crit ? 26 : 14, 1.1);
    for (let i = 0; i < 5; i++) this.decal(e.x + (Math.random() - .5) * 20, e.y + (Math.random() - .5) * 20, e.z, 120, '#b0101c', Math.random() * 6);
  }
  onExplode(d) {
    this.burst(d.at, d.kind === 'burst' ? '#e01828' : '#ffb050', 22, 1);
    this.fx.push({ k: 'ring', x: d.at[0], y: d.at[1], z: d.at[2], r: d.radius || 24, t: 0, life: .45 });
    if (d.kind === 'burst') for (let i = 0; i < 4; i++) this.decal(d.at[0] + (Math.random() - .5) * 26, d.at[1] + (Math.random() - .5) * 26, this.sim.grid.floorAt(d.at[0], d.at[1]), 120, '#b0101c', 0);
  }
  /* ---------------- each frame ---------------- */
  draw(r) {
    const sim = this.sim; if (!sim.st) return;
    const R = this.ensure(sim.st.area), w = R.world, al = clamp(this.game.alpha || 0, 0, 1);
    const c0 = this.prevCam || sim.cam.pose, c1 = this.curCam || sim.cam.pose;
    const cut = !c0 || Math.hypot(c1.x - c0.x, c1.y - c0.y, c1.z - c0.z) > 60;
    const cam = cut ? c1 : { x: lerp(c0.x, c1.x, al), y: lerp(c0.y, c1.y, al), z: lerp(c0.z, c1.z, al), yaw: c0.yaw + S7.angDiff(c0.yaw, c1.yaw) * al, pitch: lerp(c0.pitch, c1.pitch, al), roll: lerp(c0.roll || 0, c1.roll || 0, al), fov: lerp(c0.fov, c1.fov, al) };
    if (CHEAT.freeCam && this.free) Object.assign(cam, this.free);
    const sh = this.game.shakeAmt ? this.game.shakeAmt : 0;
    w.camera.fixed = { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll || 0, fov: cam.fov };
    w.camera.near = sim.aim.k > .5 ? 1 : 1.5;
    void sh;
    // the player's look settings, live (the dev mode's cel bands, ink and fog)
    w.filter = Object.assign({}, w.filter, { bands: T.celBands, ink: T.inkStrength });
    this.drawCam = cam; S7.setPresCam(cam);
    w.draw(r);
    this.probeFilter(w, r);   // (right after the draw, in the same task: the canvas still holds this frame)
  }
  /** the Comic cel filter is a post pass: where a device draws it black, fall back to the clean picture (ink outlines
   *  stay) once, and remember */
  probeFilter(w, r) {
    const P = this.filterProbe; if (P.done || typeof document === 'undefined') return;
    if (this.game.settings.filter3d === 'clean') return;
    P.frames = (P.frames || 0) + 1;
    if (P.frames < 20 || P.frames % 10) return;
    const cv = this.W3.renderer && this.W3.renderer.domElement; if (!cv) return;
    try {
      const c = P.cv || (P.cv = document.createElement('canvas')); c.width = 32; c.height = 18;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 32, 18);
      const d = g.getImageData(0, 0, 32, 18).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      P.samples = (P.samples || 0) + 1; P.lit = (P.lit || 0) + (sum > 600 ? 1 : 0);
      if (P.lit > 0) { P.done = true; P.ok = true; S7.storeSet('s7:celOk', true); return; }
      if (P.samples >= 6) { P.done = true; P.ok = false; S7.storeSet('s7:celOk', false); this.game.settings.set('filter3d', 'clean'); if (S7.ui) S7.ui.toastMsg('Comic cel filter unavailable here: using None'); }
    } catch (e) { P.done = true; }
  }
  /** the world's onDraw: pen things, glows, lights, effects, the first-person overlay */
  onDraw(w, r) {
    const sim = this.sim, R = this.cur; if (!R || R.world !== w) return;
    const pen = w.pen, T0 = this.t;
    // things
    for (const th of R.things) { const f = S7.THINGS3D[th.kind]; if (f) { pen.at(th.x, th.y, th.z); f(pen, th, T0, w, sim, this); } }
    for (const L of R.lights) {
      if (L.flick) L.power = L.base * (1 - L.flick * (.5 + .5 * Math.sin(T0 * 23 + L.x) * Math.sin(T0 * 7.1)));
      if (L.tag === 'press') L.on = !!sim.st.flags.exposure1;
      if (L.tag && S7.LIGHT_RULES && S7.LIGHT_RULES[L.tag]) S7.LIGHT_RULES[L.tag](L, sim, T0);
    }
    if (S7.drawExtra) S7.drawExtra(R, this, pen, T0);
    if (sim.boss && S7.BOSS3D[sim.boss.id]) S7.BOSS3D[sim.boss.id](pen, sim.boss, T0, sim);
    // Ansel drags his rescue toboggan on a rope
    if (sim.st.persona === 'ansel' && sim.aim.k < .5 && !sim.W.air) {
      const hy = sim.hero.yaw, bx = sim.hero.x - Math.cos(hy) * 26, by = sim.hero.y - Math.sin(hy) * 26, bz = sim.grid.floorAt(bx, by);
      pen.at(bx, by, bz, hy).box(0, 0, 3, 26, 10, 3, '#f06a1e').box(13, 0, 6, 2, 10, 4, '#f06a1e').box(0, 0, 1, 28, 1, 1, '#2a2a2a');
      pen.at().tube(bx + Math.cos(hy) * 13, by + Math.sin(hy) * 13, bz + 5, sim.hero.x, sim.hero.y, sim.hero.z + 13, .4, '#e8e0c0');
    }
    // warm spots: the four nearest revealed ones light the scene
    const h = sim.hero, eye = sim.eye();
    const warm = [];
    for (const en of sim.enemies) if (en.alive && sim.isRevealed(en) && en.warmOpen !== false) { const p = sim.warmPos(en), d = V.dist(eye, p); if (d < 30 * M) warm.push([d, p, en]); }
    warm.sort((a, b) => a[0] - b[0]);
    warm.forEach((x, i) => { const pul = 1 + Math.sin(T0 * 9 + x[2].id) * .15; w.glow(x[1][0], x[1][1], x[1][2], 2.2 * pul * Math.sqrt(T.warmRadius), '#ff6a1e', { core: '#ffe0a0', light: i < 4 }); });
    if (CHEAT.showHits) for (const en of sim.enemies) if (en.alive) { const p = sim.warmPos(en); pen.at().ball(p[0], p[1], p[2], sim.warmR(), sim.warmR(), sim.warmR(), '#ff00ff'); }
    // echo marks: a pale outline glow through walls
    for (const en of sim.enemies) if (en.alive && en.marked > 0 && !sim.isRevealed(en)) w.glow(en.x, en.y, en.z + 20, 3, '#9ad8ff', { core: '#ffffff' });
    // statues: frozen personas in an ice shell
    for (const id of PERSONA_ORDER) {
      const st = sim.st.roster[id].statue; if (!st || st.area !== sim.st.area) continue;
      const g = id === sim.st.persona && sim.mode === 'frozen' ? clamp(1.2 - sim.frozenT, 0, 1.2) / 1.2 : 1;
      pen.at(st.at[0], st.at[1], st.at[2]);
      pen.box(0, 0, 18 * g, 16 * g, 16 * g, 36 * g, '#9ae0ff').ball(0, 0, 36 * g, 9 * g, 9 * g, 7 * g, '#c8f0ff').box(4, -3, 10 * g, 6 * g, 5, 20 * g, '#e8fbff');
      if (!(id === sim.st.persona && sim.mode === 'frozen')) { const rg = S7.personaRig(id); void rg; pen.glow(0, 0, 40, 2, '#c8f0ff'); }
    }
    // projectiles
    for (const p of sim.projectiles) {
      pen.at(p.x, p.y, p.z);
      if (p.kind === 'snowball') pen.ball(0, 0, 0, 3.4, 3.4, 3.4, '#f4f8ff');
      else if (p.kind === 'icecube') pen.box(0, 0, 0, 5, 5, 5, '#bfeaff', T0 * 6);
      else if (p.kind === 'suitcase') pen.box(0, 0, 0, 12, 5, 9, '#7a2a1a', T0 * 4).box(0, 0, 5, 4, 1, 2, '#d0a040');
      else if (p.kind === 'medal') pen.ball(0, 0, 0, 3.4, 1, 3.4, '#f0c030').glow(0, 0, 0, 1.6, '#fff0a0');
      else if (p.kind === 'shell' || p.kind === 'charge') pen.ball(0, 0, 0, p.kind === 'charge' ? 3.5 : 2.6, 2.6, 2.6, '#c81e1e').glow(0, 0, 0, 1.5, '#ffb060');
      else pen.ball(0, 0, 0, 3, 3, 3, '#ffffff');
    }
    // drops: Red and Rime glints flying home
    for (const d of sim.drops) { pen.at(d.x, d.y, d.z); if (d.kind === 'red') pen.glow(0, 0, 0, 1.6, '#ff2030'); else pen.ball(0, 0, 0, 1.6, 1.6, 2.6, '#9af0ff').glow(0, 0, 0, 1.2, '#e0ffff'); }
    // pickups on the rails: red snow, rime crystals, pins, papers, keys
    for (const s of sim.spots) {
      if (sim.spotUsed(s)) continue;
      pen.at(s.x, s.y, s.z);
      const bob = Math.sin(T0 * 3 + s.x) * 1.5;
      if (s.kind === 'red') { pen.ball(0, 0, 1, 8, 8, 2, '#c8102a').ball(3, 2, 2, 4, 4, 2.4, '#e01830'); }
      else if (s.kind === 'rime') { pen.cone(0, 0, 0, 0, 0, 14, 3, '#8ae8ff').cone(3, 1, 0, 5, 2, 9, 2, '#bff4ff').glow(0, 0, 8, 2, '#c8faff'); }
      else if (s.kind === 'pin') { pen.ball(0, 0, 10 + bob, 2.6, .8, 2.6, '#d8202a').glow(0, 0, 10 + bob, 1.4, '#ffd0d0'); }
      else if (s.kind === 'dossier') { pen.box(0, 0, 8 + bob, 7, 1, 9, '#f0ead8', T0).glow(0, 0, 8 + bob, 1, '#ffffff'); }
      else if (s.kind === 'item') { pen.box(0, 0, 9 + bob, 3, 1, 7, '#e0b040', T0 * 2).glow(0, 0, 9 + bob, 1.6, '#ffe8a0'); }
      else if (S7.SPOT3D[s.kind]) S7.SPOT3D[s.kind](pen, s, T0, w, sim);
    }
    // the scan ring, the flare, the flash
    if (sim.scan) { const k = Math.min(1, sim.scan.t / .6), Rr = T.scanRadius * M * k; w.arc(sim.scan.at[0], sim.scan.at[1], sim.scan.at[2] + 1, Math.max(0, Rr - 10), Rr, 0, TAU, '#ff4050', 1 - k * .5); }
    if (sim.flare) { pen.at(sim.flare.x, sim.flare.y, sim.flare.z).glow(0, 0, 0, 5, '#ff3020'); R.flareL.x = sim.flare.x; R.flareL.y = sim.flare.y; R.flareL.z = sim.flare.z; R.flareL.on = true; R.flareL.power = 7 + Math.sin(T0 * 30) * 1.2; } else R.flareL.on = false;
    // effects: bits, puffs, rings
    for (const f of this.fx) {
      const u = f.t / f.life;
      if (f.k === 'bit') { const x = f.x + f.vx * f.t, y = f.y + f.vy * f.t, z = Math.max(this.sim.grid.floorAt(f.x, f.y), f.z + f.vz * f.t - 160 * f.t * f.t); pen.at(x, y, z).box(0, 0, 0, f.s * (1 - u * .5), f.s * (1 - u * .5), f.s * (1 - u * .5), f.c); }
      else if (f.k === 'puff') pen.at(f.x, f.y, f.z + u * 8).ball(0, 0, 0, 2 + u * 4, 2 + u * 4, 2 + u * 3, '#eef4ff');
      else if (f.k === 'ring') w.arc(f.x, f.y, this.sim.grid.floorAt(f.x, f.y) + 1, f.r * u * .8, f.r * u, 0, TAU, '#ff6040', 1 - u);
    }
    // decals: footprints, red snow
    for (const d of this.decals) { const a = 1 - d.t / d.life; if (a < .05) continue; pen.at(d.x, d.y, d.z + .3, d.yaw || 0).box(0, 0, 0, 3.4, 2, .2, d.color); }
    // snowfall round the camera
    if (R.snow) this.drawSnow(pen, R, T0);
    // the muzzle flash light
    const sh = this.muzzleT > 0; if (sh) { R.muzzle.x = eye[0] + Math.cos(sim.aim.yaw) * 20; R.muzzle.y = eye[1] + Math.sin(sim.aim.yaw) * 20; R.muzzle.z = eye[2]; R.muzzle.on = true; R.muzzle.power = 6 * this.muzzleT / .06; this.muzzleT -= 1 / 60; } else R.muzzle.on = false;
    // dev overlays
    if (CHEAT.showRails) this.drawRails(pen);
    if (CHEAT.showShots) this.drawShots(pen);
    // first person: the gun on the overlay
    w.overlay.on = sim.aim.k > .6 && sim.mode !== 'interview' || sim.mode === 'interview' && S7.interviewGun;
    if (w.overlay.on && S7.drawViewModel) { w.overlay.camera.fov = sim.aim.scope ? 40 : 62; S7.drawViewModel(w.overlay.pen, sim, this); }
    void h;
  }
  drawSnow(pen, R, T0) {
    const c = this.drawCam || this.sim.cam.pose, n = R.snow.n, box = 28 * M, wind = R.snow.wind;
    if (!R.flakeSeed) { R.flakeSeed = []; for (let i = 0; i < n; i++) R.flakeSeed.push([Math.random(), Math.random(), Math.random(), .6 + Math.random() * .8]); }
    for (let i = 0; i < n; i++) {
      const s = R.flakeSeed[i], fall = T0 * 26 * s[3];
      const x = c.x + ((s[0] * box + T0 * wind[0] * 40 - c.x) % box + box) % box - box / 2;
      const y = c.y + ((s[1] * box + T0 * wind[1] * 40 - c.y) % box + box) % box - box / 2;
      const z = c.z + ((s[2] * box * .6 - fall - c.z) % (box * .6) + box * .6) % (box * .6) - box * .3;
      pen.at(x + Math.sin(T0 * 1.3 + i) * 3, y, z).box(0, 0, 0, .8, .8, .8, '#ffffff');
    }
  }
  drawRails(pen) {
    const G = this.sim.rails; pen.at();
    for (const id in G.edges) { const e = G.edges[id]; if (e.hidden) continue; const n = Math.max(2, Math.ceil(e.length / 24)); for (let i = 0; i < n; i++) { const a = e.path.at(e.length * i / n), b = e.path.at(e.length * (i + 1) / n); pen.tube(a.x, a.y, a.z + 2, b.x, b.y, b.z + 2, .7, e.gate && !this.sim.gateOpen(e.gate) ? '#ff3030' : e.kind === 'ski' ? '#30a0ff' : '#30ff60'); } }
    for (const id in G.nodes) { const n = G.nodes[id]; pen.ball(n.x, n.y, n.z + 3, 2.5, 2.5, 2.5, '#ffff40'); }
  }
  drawShots(pen) {
    const sim = this.sim, e = sim.W.edge ? sim.rails.edges[sim.W.edge] : null; if (!e) return;
    for (const s of sim.cam.shots(e, sim.W.dir)) { const c = s.at || null; if (!c) continue; pen.at().ball(c[0], c[1], c[2], 3, 3, 3, s.id === sim.cam.shotId ? '#ff40ff' : '#a040a0'); }
  }
}
S7.Presenter3D = Presenter3D;

/** the presenter for Node and tests: the same interface, nothing drawn */
class NullPresenter { constructor() {} step() {} draw() {} ensure() {} }
S7.NullPresenter = NullPresenter;
S7.THINGS3D = S7.THINGS3D || {};
S7.SPOT3D = S7.SPOT3D || {};


/* ===== src/92-firstperson.js ===== */
/* FIRST PERSON (§9): the Seven's weapons on the overlay pen (the eye's frame: x ahead, y right, z up, engine units),
 * with gloved hands and sleeves in the persona's colours. Bob, sway as the view turns, a kick per shot, a muzzle glow,
 * and a reload each: the .38's cylinder swings out and spins, the poles dip, the bolt cycles, the pump racks, the
 * alphorn steams, the slide, the drum turns. The picture only: it reads the sim and changes nothing. */
const VMS = { kick: 0, lastYaw: null, lastPitch: 0, sx: 0, sy: 0, shotT: 9, alt: 0, t: 0, flash: 0 };
S7.bus.on('shot', d => { VMS.kick = Math.min(1.5, VMS.kick + 1); VMS.shotT = 0; VMS.alt = d.alt || 0; VMS.flash = .06; if (S7.pres) S7.pres.muzzleT = .06; });
S7.drawViewModel = (pen, sim, pres) => {
  const a = sim.aim, dt = 1 / 60; VMS.t += dt; VMS.shotT += dt; VMS.flash = Math.max(0, VMS.flash - dt);
  if (a.scope) return;   // down Ignaz's scope there is only the ring
  const id = sim.st.persona, P = S7.PERSONAS[id], C = P.rig.colors, m = sim.mag(id), W = S7.WEAPONS[P.weapon];
  // sway lags the turn; kick springs back
  if (VMS.lastYaw !== null) { VMS.sx += clamp(S7.angDiff(VMS.lastYaw, a.yaw) * 60 * .25, -1.4, 1.4); VMS.sy += clamp((a.pitch - VMS.lastPitch) * 60 * .25, -1.2, 1.2); }
  VMS.lastYaw = a.yaw; VMS.lastPitch = a.pitch;
  VMS.sx *= .86; VMS.sy *= .86; VMS.kick *= .8;
  const br = Math.sin(VMS.t * 1.6) * .25, moving = sim.W.v > 5 ? Math.sin(VMS.t * 9) * .5 : 0;
  const ox = 8 - VMS.kick * 1.6, oy = 4.4 + VMS.sx * .6 + moving * .3, oz = -6 + VMS.sy * .5 + br - Math.abs(moving) * .3 + VMS.kick * .4;
  const rel = m.reload > 0 ? 1 - m.reload / Math.max(.1, W.perShell ? 1 : W.reload) : -1;   // 0..1 through a reload
  const glove = C.glove || '#2a2420', sleeve = C.coat || C.cloth || '#444';
  const hand = (x, y, z) => pen.ball(x, y, z, 1.3, 1.2, 1.1, glove);
  const sleeveTo = (x, y, z) => pen.tube(x - 9, y + 2, z - 6, x - 1, y, z, 1.6, sleeve);
  pen.at(0, 0, 0, 0, 1, VMS.kick * .06 + (rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) * .35 : 0), 0);
  const flash = (x, y, z, r) => { if (VMS.flash > 0) pen.glow(x, y, z, r, '#fff0b0').glow(x, y, z, r * .55, '#ffffff'); };
  switch (P.weapon) {
    case 'patrol38': {
      const swing = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) : 0, spin = rel * 18;
      pen.box(ox - 1, oy, oz - 1.6, 2, 1.4, 3.4, '#3a2a1a').box(ox + 1.6, oy, oz + .6, 3, 1.6, 1.6, '#4a4a52');
      pen.at(ox + 1.6, oy + swing * 1.8, oz + .6, spin).box(0, 0, 0, 2.2, 2, 2, '#5a5a62').at(0, 0, 0, 0, 1, VMS.kick * .06, 0);
      pen.tube(ox + 2.8, oy, oz + 1, ox + 7.5, oy, oz + 1, .55, '#5a5a62');
      hand(ox - .6, oy, oz - 1.6); sleeveTo(ox - .6, oy, oz - 1.6); flash(ox + 8.4, oy, oz + 1, 1.6);
      if (swing > .2) { hand(ox + 1.4, oy - 2.4, oz - .4); sleeveTo(ox + 1.4, oy - 2.4, oz - .4); }
      break;
    }
    case 'poleguns': {
      for (const sd of [-1, 1]) {
        const dip = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI) * 3 : 0, y = sd * 3.6, z = oz - 1 - dip;
        hand(ox - 1, y, z); sleeveTo(ox - 1, y, z);
        pen.tube(ox - 1, y, z, ox + 13, y * .7, z + 2, .35, C.metal || '#c8ccd4').ball(ox + 9, y * .78, z + 1.4, 1.4, 1.4, .3, '#1a1a1e');
        if (VMS.alt === (sd > 0 ? 1 : 0)) flash(ox + 13.6, y * .7, z + 2, 1.1);
      }
      break;
    }
    case 'gamsbock': {
      const bolt = rel >= 0 && rel < 1 ? Math.sin(rel * Math.PI * 2) : VMS.shotT < .6 ? Math.sin(VMS.shotT / .6 * Math.PI) : 0;
      pen.box(ox - 3, oy, oz - 1.4, 7, 2, 2.6, C.wood || '#6a3a1a').tube(ox + .5, oy, oz, ox + 16, oy, oz + .3, .5, '#2a2626');
      pen.tube(ox + 1, oy, oz + 2, ox + 7, oy, oz + 2, .9, '#1a1a1e').ball(ox + .8, oy, oz + 2, 1, 1, 1, '#4a6a8a');
      pen.box(ox + 1 - bolt * 1.2, oy + 1.2, oz + .8, 1, 1.4, .6, '#8a8a92');
      hand(ox - 1.6, oy, oz - 1.6); sleeveTo(ox - 1.6, oy, oz - 1.6); hand(ox + 5, oy - 1.4, oz - .6); sleeveTo(ox + 5, oy - 1.4, oz - .6);
      flash(ox + 16.8, oy, oz + .3, 2);
      break;
    }
    case 'bullion': {
      const pump = VMS.shotT < .5 ? Math.sin(VMS.shotT / .5 * Math.PI) : rel >= 0 ? Math.sin(rel * Math.PI) : 0;
      pen.box(ox - 2.6, oy, oz - 1.2, 5, 2, 2.4, C.wood || '#5a3a1a').tube(ox + .5, oy, oz + .3, ox + 12, oy, oz + .3, .8, '#d8b040').tube(ox + .5, oy, oz - .7, ox + 10, oy, oz - .7, .6, '#c8a030');
      pen.box(ox + 5 - pump * 2, oy, oz - .7, 4, 2.2, 1.8, '#8a5a2a');
      hand(ox - 1.4, oy, oz - 1.4); sleeveTo(ox - 1.4, oy, oz - 1.4); hand(ox + 5 - pump * 2, oy - 1, oz - 1.4); sleeveTo(ox + 5 - pump * 2, oy - 1, oz - 1.4);
      flash(ox + 12.8, oy, oz + .3, 2.6);
      break;
    }
    case 'alphorn': {
      const heat = 1 - m.n / W.mag;
      pen.tube(ox - 2, oy - 1, oz, ox + 30, oy - 6, oz - 6, 1.1, '#8a5a2a').cone(ox + 30, oy - 6, oz - 6, ox + 36, oy - 7, oz - 7, 4.4, '#9a6a3a');
      pen.ball(ox - 2.4, oy - 1, oz + .2, 1, 1, 1, '#2a1a0a');
      hand(ox, oy - 1.2, oz - 1); sleeveTo(ox, oy - 1.2, oz - 1); hand(ox + 7, oy - 2.4, oz - 2.2); sleeveTo(ox + 7, oy - 2.4, oz - 2.2);
      if (heat > .4) pen.glow(ox + 33, oy - 6.6, oz - 4 + Math.sin(VMS.t * 6) * .6, 1 + heat * 1.6, '#e8e8f0');
      if (VMS.flash > 0) pen.glow(ox + 37, oy - 7, oz - 7, 4, '#c8f0ff');
      break;
    }
    case 'lady25': {
      const slide = VMS.shotT < .12 ? 1 - VMS.shotT / .12 : rel >= 0 ? Math.sin(rel * Math.PI) : 0;
      pen.box(ox - .6, oy, oz - 1.4, 1.6, 1.2, 2.6, '#2a2a2e').box(ox + 1.4 - slide * .8, oy, oz + .3, 3.4, 1.3, 1.2, '#3a3a40');
      hand(ox - .4, oy, oz - 1.6); sleeveTo(ox - .4, oy, oz - 1.6); hand(ox + .2, oy - 1, oz - 1.8);
      flash(ox + 3.6, oy, oz + .3, 1.1);
      break;
    }
    case 'avalauncher': {
      const drum = (rel >= 0 ? rel * 4 : 0) + (4 - m.n) * .5;
      pen.tube(ox - 3, oy, oz, ox + 13, oy, oz + .4, 1.9, '#5a6068').tube(ox + 12, oy, oz + .4, ox + 13.6, oy, oz + .4, 2.1, '#1a1a1e');
      pen.at(ox + 2, oy, oz - 1.6, drum).box(0, 0, 0, 3, 3, 3, '#3a4048').at(0, 0, 0, 0, 1, VMS.kick * .06, 0);
      pen.tube(ox + 4, oy + 1.4, oz - 3.4, ox + 9, oy + 1.4, oz - 3.4, 1, '#d8c020');
      hand(ox - 1, oy + .4, oz - 2); sleeveTo(ox - 1, oy + .4, oz - 2); hand(ox + 6, oy - 1.6, oz - 1.4); sleeveTo(ox + 6, oy - 1.6, oz - 1.4);
      if (VMS.flash > 0) pen.glow(ox + 14, oy, oz + .4, 2.8, '#ffb060');
      if (rel >= 0 && rel < 1) pen.glow(ox + 8, oy + 1.4, oz - 3, .8 + Math.sin(VMS.t * 30) * .3, '#ffffff');
      break;
    }
  }
  // Mireille lifts the camera for her Flash
  if (id === 'mireille' && sim.flash && sim.flash.t > 0) pen.at(0, 0, 0).box(6, -3, 1, 3, 4, 3, '#1a1a1e').glow(7.6, -3, 1.4, 3, '#ffffff');
};


/* ===== src/95-scenes.js ===== */
/* SCENES: title (over Room 7, the camera drifting toward the snowing window; idle 10 s → attract), play (Room 7 is a
 * mode of play), results, game over, credits. The modal manager opens canvas screens over play or the title. */
S7.ui = {
  modal: null, kind: null, msgs: [],
  open(kind, o = {}) { const C = S7.MODALS[kind]; if (!C) return; this.modal = new C(Object.assign({ sim: S7.sim }, o)); this.kind = kind; if (S7.sim) S7.sim.uiOpen = true; S7.sfx('confirm'); if (S7.game.audio.duck) S7.game.audio.duck(true); this.pausable(false); },
  /** while a screen is open, Escape and Options close it instead of pausing */
  pausable(on) { if (!S7.scenes) return; for (const k of ['play', 'echorun']) if (S7.scenes[k]) S7.scenes[k].pausable = on; },
  close() { const m = this.modal; this.modal = null; this.kind = null; this.pausable(true); if (S7.sim) S7.sim.uiOpen = false; if (S7.game.audio.duck) S7.game.audio.duck(false); S7.game.input.consumeAll(); if (m && m.onClose) m.onClose(); return m; },
  update() { if (!this.modal) return false; const nv = UI.nav(S7.game); this.modal.t += 1 / 120; if (this.modal.update(nv) === 'close') this.close(); return true; },
  draw(r) { if (this.modal) r.overlay(g => this.modal.draw(g, r)); this.drawMsgs(r); },
  toastMsg(text) { this.msgs.push({ text, at: typeof performance !== 'undefined' ? performance.now() : 0, t: 0 }); },
  drawMsgs(r) { if (!this.msgs.length) return; r.overlay(g => { let y = Math.round(r.H * .05) + 32; for (const m of this.msgs) { m.t = typeof performance !== 'undefined' ? (performance.now() - m.at) / 1000 : m.t + 1 / 60; UI.text(g, m.text, r.W / 2, y, '#ffe0a0', { align: 'center' }); y += 10; } }); this.msgs = this.msgs.filter(m => m.t < 3.5); }
};

/** the free camera (Dev Mode) */
S7.freeCam = (game, sim, dt) => {
  const P = S7.pres, I = game.input, c = P.free || (P.free = Object.assign({}, sim.cam.pose));
  const mv = I.move(), pa = I.padAim || [0, 0], m = S7.mouseDelta(), sp = 320 * dt;
  c.yaw += (pa[0] * 2.2 * dt) + m[0] * .003; c.pitch = clamp(c.pitch - pa[1] * 1.6 * dt - m[1] * .003, -1.4, 1.4);
  const f = [Math.cos(c.yaw), Math.sin(c.yaw)], r = [-f[1], f[0]];
  c.x += (f[0] * -mv[1] + r[0] * mv[0]) * sp; c.y += (f[1] * -mv[1] + r[1] * mv[0]) * sp;
  if (I.down('pageR')) c.z += sp; if (I.down('pageL')) c.z -= sp;
  if (S7.pres.cur) S7.pres.cur.world.camera.capture = true;
};
S7.makeScenes = (game, sim, pres, hud, audio, voice) => {
  const scenes = {};
  const snd = () => { if (audio) audio.update(1 / 60); };
  /* ---------------- title ---------------- */
  let titleMenu = null, titleT = 0;
  const hasSave = () => { try { return !!(game.saves && game.saves.latest()); } catch (e) { return false; } };
  const buildTitle = () => {
    titleMenu = new ListMenu([
      { label: 'NEW GAME', on: () => S7.ui.open('difficulty', { onDone: true }) },
      { label: 'CONTINUE', disabled: !hasSave(), on: () => S7.continueGame() },
      { label: 'LOAD', disabled: !hasSave(), on: () => { if (game.saves && game.saves.show) game.saves.show('load', s => { if (s) game.go('play', { loaded: true }); }); } },
      { label: 'ECHO RUN', on: () => game.go('echorun', {}) },
      { label: 'SETTINGS', on: () => game.menu('settings') },
      { label: 'ABOUT & CREDITS', on: () => S7.ui.open('about') }
    ], { i: hasSave() ? 1 : 0 });
    S7.titleMenu = titleMenu;   // for tests and the bot: which item has the focus, and where each is drawn
  };
  scenes.title = {
    input: S7.INPUT, touch: [],
    enter() {
      sim.o.attract = false; sim.o.bot = false; S7.Input.reset(); titleT = 0;
      sim.titleBackdrop(); audio && audio.music('title'); buildTitle(); game.input.consumeAll();
      if (game.input.touchEnabled !== undefined) game.input.touchEnabled = false;
    },
    update(dt) {
      S7.Input.tick(dt); titleT += dt;
      sim.update(dt, S7.noIntents()); pres.step(dt); snd();
      const m = S7.ui.modal;
      if (m) {
        S7.ui.update();
        if (!S7.ui.modal && S7.ui.kind === null && m instanceof DifficultyModal && m.result && m.result !== 'back') { S7.newGame(m.result); return; }
        
      } else {
        const touch = S7.touchOnly();
        if (touch) { const c = game.input.clicked && game.input.clicked(); if (c && UI.hit(c, ...(this.setBox || [0, 0, 0, 0]))) game.menu('settings'); }
        else titleMenu.update(UI.nav(game), game);
      }
      if (game.shell && game.shell.screen) S7.Input.idleShell = (S7.Input.idleShell || 0) + dt; else S7.Input.idleShell = 0;
      // 10 s without input on the title or a menu starts attract mode; the About pages are reading, so they allow a minute
      if (S7.Input.idle > (S7.ui.kind === 'about' ? 60 : 10) && !S7.inSession) { if (S7.ui.modal) S7.ui.close(); if (game.shell && game.shell.screen) game.shell.hide(); game.go('attract', {}); }
    },
    draw(r) {
      pres.draw(r);
      r.overlay(g => {
        UI.veil(g, r, .35, '#05030a');
        const S = UI.safe(r);
        UI.title(g, 'SKILLER', r.W / 2 - 14, S.y0 + 8, 5);
        E.font.title(g, '7', r.W / 2 + E.font.width('SKILLER', { scale: 5 }) / 2 - 6, S.y0 + 8, { scale: 5, colors: ['#ff5060', '#d81e2a', '#a01018'], outline: INK, depth: 2, depthColor: '#2a0a0e' });
        UI.text(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2, S.y0 + 58, RED, { align: 'center', scale: 1 });
        if (S7.touchOnly()) {
          UI.panel(g, r.W / 2 - 150, r.H * .45, 300, 70, .85);
          UI.big(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .45 + 8, 1);
          UI.text(g, 'Connect a controller or a keyboard to play.', r.W / 2, r.H * .45 + 24, MUTED, { align: 'center' });
          scenes.title.setBox = [r.W / 2 - 50, r.H * .45 + 40, 100, 20];
          UI.panel(g, ...scenes.title.setBox, 1, RED); UI.text(g, 'SETTINGS', r.W / 2, r.H * .45 + 44, '#ffffff', { align: 'center', scale: 2 });
        } else titleMenu.draw(g, r.W / 2, r.H * .42, { scale: 2, lh: 13, gap: 8 });
        UI.text(g, 'v' + S7.VERSION + ' · ' + S7.BUILD + ' · my-3D2dge ' + E.version, S.x0, S.y1 - 6, '#6a6570');
        if (!S7.touchOnly()) UI.prompt(g, [['confirm', 'SELECT']], S.x1, S.y1 - 8, { align: 'right' });
      });
      S7.ui.draw(r);
    }
  };
  /* ---------------- play ---------------- */
  scenes.play = {
    pausable: true, input: S7.INPUT, touch: [],
    enter(d = {}) {
      sim.o.attract = false; sim.o.bot = !!d.bot || S7.bot.active; sim.titleMode = false; sim.hideHero = false; game.input.consumeAll();
      if (sim.st) audio && audio.areaMusic(sim.st.area);
    },
    update(dt) {
      S7.Input.tick(dt); hud.update(dt);
      if (S7.ui.update()) { pres.step(0); return; }
      if (sim.uiRequest && !S7.bot.active) { const q = sim.uiRequest; sim.uiRequest = null; if (q.kind === 'save') { if (game.saves && game.saves.show && !S7.inSession) { game.saves.canSave = true; game.saves.show('save', () => { game.saves.canSave = false; }); } } else S7.ui.open(q.kind, q); return; }
      if (sim.mode === 'gameover') { game.go('gameover', {}); return; }
      if (sim.resultsReady !== null && sim.resultsReady !== undefined) { const t = sim.resultsReady; sim.resultsReady = null; game.go('results', { target: t }); return; }
      if (sim.creditsReady) { sim.creditsReady = false; game.go('credits', {}); return; }
      // Dev Mode's free camera: the sticks or WASD and the mouse fly it, Q / E go down and up; the sim holds still
      if (CHEAT.freeCam && S7.pres) { S7.freeCam(game, sim, dt); pres.step(0); return; }
      if (S7.pres) S7.pres.free = null;
      const I = S7.bot && S7.bot.active ? S7.bot.intents(sim) : S7.readIntents(game, hud);
      if (I.mapP && !sim.aim.on && !sim.talk && !sim.cutscene && !S7.inSession) { S7.ui.open('map'); return; }
      game.timeScale = T.timeScale * (sim.slowmo ? sim.slowmo.k : 1);
      if (sim.slowmo) { sim.slowmo.t -= dt; if (sim.slowmo.t <= 0) sim.slowmo = null; }
      sim.update(dt, I);
      pres.step(dt); snd();
      if (voice) voice.talkTick(sim.talk);
      // the pointer lock follows aim mode with the mouse in look mode
      S7.pointerLock(sim.aim.on && game.settings.mouseMode !== 'pointer' && game.input.lastDevice !== 'gamepad' && !S7.bot.active);
    },
    exit() { S7.pointerLock(false); game.timeScale = 1; },
    draw(r) { pres.draw(r); if (!S7.ui.modal) hud.draw(r); S7.ui.draw(r); }
  };
  /* ---------------- results (§7.20): the rank badge and six stats, the Concierge's note ---------------- */
  let res = null, resMenu = null;
  scenes.results = {
    input: S7.INPUT,
    enter(d) {
      const t = d.target, R = sim.st.results[t]; R.done = true;
      res = { t, R, rank: S7.rankOf(R, t), time: 0 };
      sim.st.flags['rank' + t] = res.rank.id;
      audio && audio.music('rank');
      resMenu = new ListMenu([{ label: 'CONTINUE', on: () => { game.go('play', {}); sim.startBeat(t === 0 ? 't00_results_done' : 'epilogue'); } }]);
    },
    update(dt) { S7.Input.tick(dt); res.time += dt; if (res.time > 1) resMenu.update(UI.nav(game)); pres.step(0); },
    draw(r) {
      pres.draw(r);
      r.overlay(g => {
        UI.veil(g, r, .86, '#08060a'); const R = res.R, S = UI.safe(r);
        UI.big(g, 'TARGET ' + String(res.t).padStart(2, '0') + ' — ' + (res.t === 0 ? 'TURN-DOWN SERVICE' : 'APRÈS'), r.W / 2, S.y0, 2);
        const k = Math.min(1, res.time / .6);
        S7.drawRank(g, res.rank.id, r.W / 2, S.y0 + 44, 10 + 12 * k);
        UI.text(g, res.rank.name, r.W / 2, S.y0 + 70, '#ffffff', { align: 'center', scale: 2 });
        const crit = R.kills ? Math.round(R.crits / R.kills * 100) : 0;
        const stats = [['TIME', S7.fmtTime(R.time, false)], ['WHITEOUTS THAWED', R.kills], ['CRITICAL', crit + '%'], ['RED COLLECTED', R.red], ['PERSONAS FROZEN', R.frozen], ['HINTS BOUGHT', R.hints]];
        stats.forEach(([l, v], i) => { const x = r.W * (i % 2 ? .56 : .14), y = S.y0 + 92 + Math.floor(i / 2) * 22; UI.text(g, l, x, y, MUTED); UI.text(g, String(v), x + r.W * .3, y - 2, '#ffffff', { scale: 2, align: 'right' }); });
        const note = { dblack: 'Impeccable. The Department has no notes.', black: 'Clean work. A little mess on the carpet.', blue: 'The guest checked out. Some of the staff did too.', green: 'Messy, Madame. Housekeeping will bill you.' }[res.rank.id];
        UI.text(g, 'CONCIERGE: "' + note + '"', r.W / 2, S.y0 + 164, '#e0dcd4', { align: 'center', wrap: r.W * .8 });
        if (res.time > 1) resMenu.draw(g, r.W / 2, S.y1 - 22, { scale: 2 });
      });
    }
  };
  /* ---------------- game over: Continue (the newer of the autosave and the clock's) or Quit ---------------- */
  let goMenu = null, goT = 0;
  scenes.gameover = {
    input: S7.INPUT,
    enter() {
      goT = 0; audio && audio.music('gameover');
      goMenu = new ListMenu([{ label: 'CONTINUE', on: () => S7.continueGame(true) }, !S7.inSession && { label: 'QUIT TO TITLE', on: () => game.go('title') }].filter(Boolean));
    },
    update(dt) { S7.Input.tick(dt); goT += dt; if (goT > 1.2) goMenu.update(UI.nav(game)); pres.step(0); },
    draw(r) { pres.draw(r); r.overlay(g => { UI.veil(g, r, Math.min(.85, goT), '#000'); UI.title(g, 'THE MOUNTAIN KEEPS YOU.', r.W / 2, r.H * .3, 2, { colors: ['#ffffff', '#c8d8f0', '#8aa8d8'] }); if (goT > 1.2) goMenu.draw(g, r.W / 2, r.H * .55, { scale: 2, lh: 13, gap: 8 }); }); }
  };
  /* ---------------- credits (after the epilogue): big type scrolling, then the title ---------------- */
  let cr = 0;
  scenes.credits = {
    input: S7.INPUT,
    enter() { cr = 0; audio && audio.music('epilogue'); },
    update(dt) { S7.Input.tick(dt); cr += dt; if (cr > 3 && (game.input.anyPressed() || cr > S7.CREDITS.length * 2.2 + 8)) game.go('title'); },
    draw(r) {
      r.overlay(g => {
        UI.rect(g, 0, 0, r.W, r.H, '#000');
        const y0 = r.H - cr * 26;
        S7.CREDITS.forEach((l, i) => { const y = y0 + i * 22; if (y < -20 || y > r.H + 10) return; if (l[0]) UI.text(g, l[0], r.W / 2, y, RED, { align: 'center' }); UI.text(g, l[1], r.W / 2, y + 9, '#f4f1ea', { align: 'center', scale: l[2] || 1 }); });
      });
    }
  };
  return scenes;
};

/** a rank badge: one or two black diamonds, a blue square, a green circle (white-edged, readable on any ground) */
S7.drawRank = (g, id, x, y, r) => {
  const dia = (cx, c) => { UI.diamond(g, cx, y, r + 2, '#f4f1ea', true); UI.diamond(g, cx, y, r, c, true); };
  if (id === 'dblack') { dia(x - r * .9, '#101014'); dia(x + r * .9, '#101014'); }
  else if (id === 'black') dia(x, '#101014');
  else if (id === 'blue') { UI.rect(g, x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4, '#f4f1ea'); UI.rect(g, x - r, y - r, 2 * r, 2 * r, '#2a6ad8'); }
  else { E.px.disc(g, x, y, r + 2, '#f4f1ea'); E.px.disc(g, x, y, r, '#2aa04a'); }
};
/** the title's backdrop: Room 7 in the sim, nobody walking, the camera drifting over the bed toward the window */
Sim.prototype.titleBackdrop = function () {
  this.resetTransient();
  this.st = this.freshState('piste'); this.o.noClock = true;
  this.enterArea('room7', 'door', { silent: true, noEnter: true, noSave: true });
  this.titleMode = true; this.hideHero = true;
  this.camOverride = { t: 0, at: t => [(9.5 - Math.sin(t * .05) * 2) * M, (8.8 - t * .02 % 3) * M, (2.6 + Math.sin(t * .1) * .3) * M], look: t => [(5 + Math.sin(t * .07) * 2) * M, 1.6 * M, 1.4 * M], fov: 54 };
  this.toasts = [];
};


/* ===== src/99-start.js ===== */
/* START: S7.start({ World3D, headless, seed }) makes the game: the 2D engine's E.Game (fixed steps, scenes, input and
 * rebinding, the pause menu and settings, saves), the sim, the 3D presenter (or the null one headless), the HUD, sound,
 * voices, the scenes, the AI Hub session when there is one, and game.debug for tests and tools. */
const SETTINGS = S7.SETTINGS = [
  { key: 'picture3d', label: '3D picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'Full']], help: 'Pixels: the game\'s own chunky resolution. Full: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true, help: 'Lamps, the moon and the sun cast real shadows.' },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'cel', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], help: 'Comic cel: flat bands of light and ink. Where a device can\'t draw it, the game falls back to None.' },
  { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'piste', options: [['bunny', 'Bunny Hill'], ['piste', 'Piste'], ['offpiste', 'Off-Piste']], help: 'Changeable mid-game.', apply: (g, v) => { if (S7.sim && S7.sim.st) S7.sim.st.difficulty = v; } },
  { key: 'aimToggle', label: 'Aim', group: 'Game', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
  { key: 'aimAssist', label: 'Aim assist', group: 'Game', value: 'default', options: [['default', 'By difficulty'], ['off', 'Off'], ['low', 'Low'], ['high', 'High']], help: 'Controller only: turning slows over a warm spot and leans toward it.' },
  { key: 'padSens', label: 'Controller look speed', group: 'Game', type: 'slider', value: 1, min: .5, max: 2, step: .05 },
  { key: 'mouseMode', label: 'Mouse aim', group: 'Game', value: 'look', options: [['look', 'Look (captured)'], ['pointer', 'Pointer (light gun)']] },
  { key: 'mouseSens', label: 'Mouse look speed', group: 'Game', type: 'slider', value: .12, min: .03, max: .4, step: .01 },
  { key: 'laughCues', label: 'Laugh ripples', group: 'Game', value: true, help: 'Red arcs at the screen\'s edge toward laughter.' },
  { key: 'textSize', label: 'Text size', group: 'Game', value: 'normal', options: [['normal', 'Normal'], ['large', 'Large']] },
  { key: 'voices', label: 'Voices', group: 'Game', type: 'slider', value: .8, min: 0, max: 1, step: .05 },
  { key: 'padGlyphs', label: 'Controller buttons', group: 'Game', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { if (g.settings && g.settings.glyphs !== v) g.settings.set('glyphs', v); } }
];
S7.HELP = () => {
  const pad = S7.Input.family() === 'gamepad', L = S7.label;
  return {
    keys: [[L('move'), 'Walk (hold), tuck on skis'], [L('turn'), 'Quick turn / hockey stop'], [L('aim'), 'Aim (first person)'], [L('fire'), 'Fire'], [L('scan'), 'Scan for Whiteouts (aiming)'], [L('skill'), 'Skill'], [L('ring'), 'Hold: the Featherbed (switch killer)'], [L('heal'), 'Hold: drink Red (heal)'], [L('reload'), 'Reload (aiming)'], [L('interact'), 'Check, talk, enter'], [L('map'), 'Map'], [pad ? 'Options' : 'Esc / P', 'Pause']].concat(pad ? [] : [['1-7', 'Switch killer directly'], ['Mouse', 'Look while aiming; click markers in the world']]),
    sections: [
      ['MOVING', 'You move on rails. Hold to walk, let go to stop. At a junction pick a way, then hold to go. The camera cuts like a film.'],
      ['SHOOTING', 'Stop and aim. Whiteouts are invisible: listen for laughing, look for footprints and breath, then scan. Shoot the orange warm spot: one shot thaws them.'],
      ['THE SEVEN', 'Hold the Featherbed button and pick a killer. Each has a gun and a skill. Some gates show a face: that one opens it.'],
      ['RED AND RIME', 'Red heals and pays for skills. Rime waxes your skills at the Wax Bench in Room 7. Room 7 doors save, heal nothing, and wait.'],
      ['FREEZING', 'At zero HP a killer freezes. The Sweep comes out of Room 7 to chip them free. If the Sweep falls, the mountain keeps you.']
    ]
  };
};

S7.start = (opts = {}) => {
  const W3 = opts.World3D || E.World3D || null;
  const headless = !!opts.headless || !HAS_DOM;
  S7.inSession = !headless && typeof AIHub !== 'undefined' && AIHub.active;
  S7.noPersist = S7.inSession || !!opts.noPersist;
  S7.RNG.reset(opts.seed || 7);
  S7.tuningLoad();
  const pauseItems = () => {
    if (S7.inSession) return [];
    const sim = S7.sim, scn = game.scene, inPlay = scn === scenes.play, out = [];
    const open = k => () => { game.resume(); if (game.shell) game.shell.hide(); S7.ui.open(k); };
    if (inPlay && sim.cutscene) out.push(['Skip scene', () => { game.resume(); if (game.shell) game.shell.hide(); sim.skipCutscene(); }]);
    if (inPlay) out.push(['Map', open('map')], ['Items & Dossier', open('dossier')], ['Personas', open('personas')]);
    out.push(['About & Credits', open('about')]);
    if (inPlay) out.push(['Dev Mode', open('dev')]);
    return out;
  };
  const game = new E.Game(Object.assign(opts.loop !== undefined ? { loop: opts.loop } : {}, { canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT, headless, id: 'skiller7',
    menu: { items: pauseItems, settings: SETTINGS, controls: S7.CONTROL_NAMES, quit: S7.inSession ? false : 'title',
      saves: S7.inSession ? false : { slots: 3, version: 1, migrate: (d, from) => S7.migrateSave(d, from) } } }));
  S7.game = game;
  game.input.names = Object.assign({}, game.input.names || {}, S7.CONTROL_NAMES);
  if (game.input.touchEnabled !== undefined) game.input.touchEnabled = false;
  S7.Input.init(game);
  if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');
  // the themed shell: the standard pause, settings, controls and saves, our help
  if (!headless && E.Shell) {
    try {
      game.shell = new E.Shell(game, { theme: { ink: '#f4f1ea', paper: 'rgba(11,10,12,.94)', accent: '#d81e2a', muted: '#a8a2ac', danger: '#ff3a3a', line: '#4a2a30', font: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', titleFont: 'Impact, "Arial Black", sans-serif' },
        screens: { help: { title: 'How to play', keys: () => S7.HELP().keys, sections: () => S7.HELP().sections } } });
      // ten feet from a TV: the HTML screens scale with the window's height
      const zoom = () => { if (game.shell && game.shell.root) game.shell.root.style.zoom = String(clamp(innerHeight / 560, 1, 2.4)); };
      zoom(); addEventListener('resize', zoom);
    } catch (e) { game.fail('shell', e); }
  }
  const sim = S7.sim = new Sim(game, { attract: false, bot: false });
  let hud = null, audio = null, voice = null;
  // the presenter is made in a boot step (after the 3D engine starts); scenes reach it through this wrapper
  const pres = { step: dt => S7.pres && S7.pres.step(dt), draw: r => S7.pres && S7.pres.draw(r), ensure: id => S7.pres && S7.pres.ensure(id) };
  hud = S7.hud = new Hud(game, sim);
  audio = S7.audio = new S7Audio(game, sim);
  voice = S7.voice = new S7Voice(game);
  S7.bus.on('laugh', d => { if (!d.at || !sim.grid) return; const pose = sim.cam.pose; voice.laugh(d.style, d.pitch, d.at, pose, !sim.grid.los([pose.x, pose.y, pose.z], d.at, 6)); });
  // saves: the sim's state with its place and target
  if (game.saves && !S7.inSession) {
    game.saves.write = () => Object.assign({ data: sim.serialize() }, sim.saveMeta());
    game.saves.read = save => { sim.deserialize(save.data); S7.loadedSave = true; };
    game.saves.canSave = false;
  }
  const boot = [
    ['The mountain', () => { S7.registerShapes(); }],
    ['The 3D engine', () => W3 && !headless ? W3.init(game) : null],
    ['Room 7', () => { S7.pres = W3 && !headless ? new Presenter3D(game, sim, W3) : new NullPresenter(); sim.titleBackdrop(); S7.pres.ensure('room7'); }]
  ];
  if (S7.inSession) boot.unshift(['The hub', () => S7.hubConnect(game, sim)]);
  const first = S7.inSession ? 'echorun' : 'title';
  const scenes = S7.scenes = S7.makeScenes(game, sim, pres, hud, audio, voice);
  S7.addModeScenes(scenes, game, sim, pres, hud, audio, voice);
  game.start({ scenes, scene: first,
    boot: { title: 'SKILLER7', version: S7.VERSION, steps: boot, messages: ['Shaking the featherbed', 'Counting the coats', 'Waxing the skis', 'Winding the cuckoo clock', 'Laughing quietly'] } });
  game.debug = S7.debugHandle(game, sim);
  S7.started = true;
  return game;
};

/* ---- new game, continue ---- */
S7.newGame = (diff) => {
  const g = S7.game, sim = S7.sim;
  g.settings.set('difficulty', diff);
  sim.o.noClock = false; sim.titleMode = false; sim.hideHero = false; sim.camOverride = null;
  sim.newGame(diff);
  g.go('play', {});
};
S7.continueGame = (afterDeath) => {
  const g = S7.game, sim = S7.sim;
  let ok = false;
  try { const s = g.saves && g.saves.latest(); if (s) { const r = g.saves.load(s.slot); ok = !!r; } } catch (e) { g.fail('continue', e); }
  if (!ok) { if (afterDeath && sim.st) { sim.mode = 'rail'; for (const id of PERSONA_ORDER) { const r = sim.st.roster[id]; if (r.frozen || r.hp <= 0) { r.frozen = false; r.statue = null; r.hp = Math.ceil(S7.PERSONAS[id].hp * .5); } } sim.enterArea(sim.st.area, sim.entryNode || Object.keys(sim.rails.nodes)[0], { noSave: true }); } else { sim.newGame(g.settings.difficulty || 'piste'); } }
  sim.o.noClock = false; sim.titleMode = false; sim.hideHero = false; sim.mode = 'rail';
  g.go('play', {});
};
/** pointer lock for mouse look while aiming (the 3D module forwards the moves to camera.takeMouse) */
S7.pointerLock = (on) => {
  if (!HAS_DOM || !S7.pres || !S7.pres.cur) return;
  const cam = S7.pres.cur.world.camera, cv = S7.game.screen && S7.game.screen.canvas; if (!cv) return;
  cam.capture = on;
  if (on && document.pointerLockElement !== cv && !S7._lockAsked) { S7._lockAsked = true; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { S7.lockFailed(); }); } catch (e) { S7.lockFailed(); } }
  if (!on) { S7._lockAsked = false; if (document.pointerLockElement === cv) document.exitPointerLock(); }
};
S7.lockFailed = () => { if (S7.game.settings.mouseMode !== 'pointer') { S7.game.settings.set('mouseMode', 'pointer'); S7.ui.toastMsg('Mouse: pointer mode'); } };
S7.mouseDelta = () => { if (!S7.pres || !S7.pres.cur || !S7.pres.cur.world) return [0, 0]; const out = [0, 0]; try { S7.pres.cur.world.camera.takeMouse(out); } catch (e) { /* no camera */ } return out; };
if (HAS_DOM) document.addEventListener('pointerlockerror', () => S7.lockFailed && S7.game && S7.lockFailed());

/** shapes: S7's own set and the store entries the game uses */
S7.registerShapes = () => {
  if (S7._shapesDone) return; S7._shapesDone = true;
  const A = (typeof window !== 'undefined' ? window : globalThis).ASSETS || {};
  for (const k of ['kenney-holiday', 'kenney-furniture', 'kaykit-furniture-bits', 'kenney-nature']) if (A[k]) E.addAssets(A[k]);
  if (S7.SHAPE_SET) E.addAssets(S7.SHAPE_SET);
};


})();
