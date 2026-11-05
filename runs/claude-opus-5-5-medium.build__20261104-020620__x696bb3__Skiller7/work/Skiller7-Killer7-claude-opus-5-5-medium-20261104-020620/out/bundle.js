/* SKILLER7 2026-11-04 11:17 — an original game inspired by Killer7. Built on my-3D2dge v0.85.2. */
(() => { 'use strict';
const __S7_BUILD__ = "2026-11-04 11:17";

/* ==== src/00-core.js ==== */
/* SKILLER7 — core: the namespace, the event bus, the registries, units, math, the named random streams.
 * Everything in the sim is deterministic: it draws numbers only from S7.rng(name) streams, never an unseeded random. */
const E = My3D2dge, { clamp, lerp, approach } = E;
const TAU = Math.PI * 2, M = 16;            // 16 engine units = 1 metre = 1 tile
const S7 = globalThis.S7 = {
  VERSION: '1.0.0', BUILD: typeof __S7_BUILD__ !== 'undefined' ? __S7_BUILD__ : 'dev',
  AREAS: {}, PERSONAS: {}, WEAPONS: {}, ENEMIES: {}, ITEMS: {}, BEATS: {}, SONGS: {}, VOICES: {}, LINES: {}, PEOPLE: {},
  M, started: false, headless: typeof document === 'undefined'
};
S7.area = (id, def) => (S7.AREAS[id] = Object.assign({ id }, def));
S7.persona = (id, def) => (S7.PERSONAS[id] = Object.assign({ id }, def));
S7.weapon = (id, def) => (S7.WEAPONS[id] = Object.assign({ id }, def));
S7.enemy = (id, def) => (S7.ENEMIES[id] = Object.assign({ id }, def));
S7.item = (id, def) => (S7.ITEMS[id] = Object.assign({ id }, def));
S7.beat = (id, fn) => (S7.BEATS[id] = fn);
S7.lines = (id, list) => (S7.LINES[id] = list);

/* ---- the bus: the sim emits, audio, effects, HUD and tutorials listen (they never change sim state) ---- */
const BUS = {};
S7.bus = {
  on(type, fn) { (BUS[type] || (BUS[type] = [])).push(fn); return () => { const l = BUS[type]; l.splice(l.indexOf(fn), 1); }; },
  emit(type, data) { const l = BUS[type]; if (l) for (const f of l.slice()) { try { f(data || {}); } catch (e) { if (S7.game) S7.game.fail('bus ' + type, e); else throw e; } } }
};
const emit = (t, d) => S7.bus.emit(t, d);

/* ---- named random streams, seeded from the run's seed ---- */
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const STREAMS = {};
S7.seed = 7;
S7.rng = name => STREAMS[name] || (STREAMS[name] = E.rng((S7.seed * 7919 + hashStr(name)) >>> 0));
S7.reseed = seed => { S7.seed = seed; for (const k in STREAMS) delete STREAMS[k]; };
const R = name => S7.rng(name)();
const RR = (name, a, b) => a + (b - a) * R(name);

/* ---- small math ---- */
const V = {
  add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dir: (yaw, pitch) => [Math.cos(yaw) * Math.cos(pitch), Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch)]
};
S7.V = V;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const wrapAng = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
/** ray (origin o, unit dir d) against a sphere: distance along the ray, or null */
function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], q = ox * ox + oy * oy + oz * oz - r * r, h = b * b - q;
  if (h < 0) return null; const s = Math.sqrt(h), t = -b - s; if (t >= 0) return t; const t2 = -b + s; return t2 >= 0 ? 0 : null;
}
/** ray against a vertical capsule (x, y, z0..z1, radius r): distance, or null */
function rayCapsule(o, d, x, y, z0, z1, r) {
  // closest approach of the ray to the segment, by sampling the analytic 2D circle then clamping the height
  const ox = o[0] - x, oy = o[1] - y, a = d[0] * d[0] + d[1] * d[1];
  let best = null;
  if (a > 1e-9) {
    const b = ox * d[0] + oy * d[1], c = ox * ox + oy * oy - r * r, h = b * b - a * c;
    if (h >= 0) { const t = (-b - Math.sqrt(h)) / a; if (t >= 0) { const z = o[2] + d[2] * t; if (z >= z0 && z <= z1) best = t; } }
  }
  for (const zc of [z0, z1]) { const t = raySphere(o, d, [x, y, zc], r); if (t !== null && (best === null || t < best)) best = t; }
  return best;
}
S7.raySphere = raySphere; S7.rayCapsule = rayCapsule;
const fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const fmtClock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (r < 10 ? '0' : '') + r; };

/* ---- the live tuning table: every important number, exposed as a dev slider with a reset to defaults ---- */
const TUNING = {
  walkSpeed:   { def: 85, min: 40, max: 200, step: 5, label: 'Walk speed', group: 'Move' },
  skiTop:      { def: 190, min: 100, max: 400, step: 10, label: 'Ski top speed', group: 'Move' },
  padSens:     { def: 1, min: .5, max: 2, step: .05, label: 'Aim sensitivity (pad)', group: 'Aim' },
  assist:      { def: 1, min: 0, max: 1, step: .05, label: 'Aim assist strength', group: 'Aim' },
  enemySpeed:  { def: 1, min: .3, max: 2, step: .05, label: 'Enemy speed x', group: 'Enemies' },
  enemyHP:     { def: 1, min: .2, max: 3, step: .05, label: 'Enemy HP x', group: 'Enemies' },
  playerDmg:   { def: 1, min: .2, max: 3, step: .05, label: 'Damage dealt x', group: 'Combat' },
  warmRadius:  { def: 1, min: .5, max: 2.5, step: .05, label: 'Warm spot radius x', group: 'Combat' },
  scanRadius:  { def: 40, min: 10, max: 80, step: 1, label: 'Scan radius (m)', group: 'Combat' },
  revealTime:  { def: 6, min: 1, max: 15, step: .5, label: 'Reveal time (s)', group: 'Combat' },
  spawnRate:   { def: 1, min: .3, max: 2, step: .05, label: 'Spawn rate x', group: 'Enemies' },
  explosionDmg:{ def: 1, min: 0, max: 3, step: .05, label: 'Explosion damage x', group: 'Enemies' },
  redDrop:     { def: 1, min: 0, max: 3, step: .05, label: 'Red drop x', group: 'Economy' },
  rimeDrop:    { def: 1, min: 0, max: 3, step: .05, label: 'Rime drop x', group: 'Economy' },
  healRate:    { def: 40, min: 10, max: 200, step: 5, label: 'Heal rate (HP/s)', group: 'Economy' },
  timeScale:   { def: 1, min: .1, max: 2, step: .05, label: 'Time scale', group: 'World' },
  celBands:    { def: 3, min: 2, max: 8, step: 1, label: 'Cel bands', group: 'Look' },
  ink:         { def: 1, min: 0, max: 1.5, step: .05, label: 'Ink strength', group: 'Look' },
  fogFar:      { def: 1, min: .3, max: 3, step: .05, label: 'Fog far x', group: 'Look' }
};
const T = {};
S7.TUNING = TUNING; S7.T = T;
S7.tuneReset = key => { for (const k in TUNING) if (!key || k === key) T[k] = TUNING[k].def; };
S7.tune = (k, v) => { const t = TUNING[k]; if (!t) return; T[k] = clamp(Math.round(v / t.step) * t.step, t.min, t.max); S7.saveDev && S7.saveDev(); };
S7.tuneReset();

/* ---- difficulty (§7.25) ---- */
const DIFF = {
  'Bunny Hill': { dmg: .5, speed: .85, reveal: 1.5, red: 1.3, assist: 'High', aval: .85 },
  Piste: { dmg: 1, speed: 1, reveal: 1, red: 1, assist: 'Low', aval: 1 },
  'Off-Piste': { dmg: 1.5, speed: 1.15, reveal: .7, red: .8, assist: 'Off', aval: 1.1 }
};
S7.DIFF = DIFF;
const diff = () => DIFF[(S7.G && S7.G.difficulty) || 'Piste'] || DIFF.Piste;

/* ---- cheats (dev mode and attract mode) ---- */
const CHEATS = { god: false, infRed: false, oneHit: false, revealAll: false, ghost: false, allPersonas: false, showRails: false, showVolumes: false, showShots: false, freeCam: false, hideHud: false, slowCrit: false, showFps: false };
S7.CHEATS = CHEATS;

/* ==== src/05-input.js ==== */
/* SKILLER7 — input: the action map (§6.1), the intent layer (one place turns devices into intents; the bot writes the
 * same intents), last-device tracking, the idle timer for attract mode, touch-only detection. */
const INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  move: ['KeyW', 'ArrowUp', 'Pad0'], turn: ['KeyS', 'ArrowDown', 'Pad1'],
  interact: ['KeyE', 'KeyF', 'Pad3'], heal: ['KeyH', 'Pad2'], ring: ['Tab', 'Pad4'], skill: ['KeyQ', 'Pad5'],
  aim: ['Mouse2', 'Pad6'], fire: ['Mouse0', 'Pad7'], scan: ['Space', 'Mouse1', 'Pad4'], reload: ['KeyR', 'Pad2'], map: ['KeyM', 'Pad8'],
  p1: ['Digit1'], p2: ['Digit2'], p3: ['Digit3'], p4: ['Digit4'], p5: ['Digit5'], p6: ['Digit6'], p7: ['Digit7']
};
const CONTROL_NAMES = { move: 'Move (hold)', turn: 'Quick turn / hockey stop', interact: 'Check / interact', heal: 'Heal (hold)', ring: 'Featherbed ring (hold)',
  skill: 'Skill', aim: 'Aim', fire: 'Fire', scan: 'Scan (while aiming)', reload: 'Reload (while aiming)', map: 'Map',
  p1: 'Persona 1', p2: 'Persona 2', p3: 'Persona 3', p4: 'Persona 4', p5: 'Persona 5', p6: 'Persona 6', p7: 'Persona 7' };
S7.INPUT = INPUT;

/** an empty intent frame */
const blankIntent = () => ({ move: false, turn: false, left: false, right: false, stick: [0, 0], interact: false, heal: false, ring: false, ringPressed: false, ringReleased: false,
  skill: false, skillDown: false, aim: false, fire: false, firePressed: false, scan: false, reload: false, map: false, pick: 0, confirm: false, cancel: false,
  lookYaw: 0, lookPitch: 0, pointer: null, click: null, branch: -1, interactId: null, any: false, up: false, down: false, pickChoice: -1, interactHeld: false, ringSel: null, clickGo: false });

/* mouse deltas from pointer lock (the presenter adds them each step from world.camera.takeMouse) */
S7.mouse = { dx: 0, dy: 0, locked: false };
const padRamp = { t: 0, k: 0 };
let aimToggled = false, lastAimDown = false;

/** read the human devices into intents (once a step, in play) */
function readHumanIntent(dt) {
  const I = S7.game.input, st = S7.game.settings || {}, o = blankIntent(), ax = I.move();
  o.move = I.down('move') || ax[1] < -.55;
  o.turn = I.pressed('turn');
  o.left = I.pressed('left'); o.right = I.pressed('right'); o.up = I.pressed('up'); o.down = I.pressed('down');
  o.stick = [ax[0], ax[1]];
  o.interact = I.pressed('interact'); o.interactHeld = I.down('interact'); o.heal = I.down('heal'); o.ring = I.down('ring'); o.ringPressed = I.pressed('ring'); o.ringReleased = I.released('ring');
  o.skill = I.pressed('skill'); o.skillDown = I.down('skill');
  const aimDown = I.down('aim');
  if (st.aimToggle === 'Toggle') { if (aimDown && !lastAimDown) aimToggled = !aimToggled; o.aim = aimToggled; } else { o.aim = aimDown; aimToggled = false; }
  lastAimDown = aimDown;
  o.fire = I.down('fire'); o.firePressed = I.pressed('fire'); o.scan = I.pressed('scan'); o.reload = I.pressed('reload'); o.map = I.pressed('map');
  o.confirm = I.pressed('confirm'); o.cancel = I.pressed('cancel');
  for (let k = 1; k <= 7; k++) if (I.pressed('p' + k)) o.pick = k;
  // the look: the right stick (a curve, a ramp after a held push), else the left stick at 60%, and the mouse
  let pa = I.padAim || null;
  if (!pa && S7.sim && S7.sim.aiming() && Math.hypot(ax[0], ax[1]) > .2 && I.lastDevice === 'gamepad') pa = [ax[0] * .6, ax[1] * .6];
  if (pa) {
    const m = Math.hypot(pa[0], pa[1]);
    if (m > .9) padRamp.t += dt; else padRamp.t = 0;
    padRamp.k = padRamp.t > .35 ? Math.min(1, padRamp.k + dt / .3) : Math.max(0, padRamp.k - dt * 4);
    const cx = Math.sign(pa[0]) * Math.pow(Math.abs(pa[0]), 1.8), cy = Math.sign(pa[1]) * Math.pow(Math.abs(pa[1]), 1.8), sens = (st.padSens || 1) * T.padSens * (1 + .6 * padRamp.k);
    o.lookYaw += cx * 160 * sens * dt; o.lookPitch -= cy * 110 * sens * dt * (st.invertAimY || I.invertAimY ? -1 : 1);
    o.padLook = true;
  } else { padRamp.t = 0; padRamp.k = 0; }
  if (S7.mouse.dx || S7.mouse.dy) {
    const k = st.mouseSens || .12;
    o.lookYaw += S7.mouse.dx * k; o.lookPitch -= S7.mouse.dy * k * (st.invertAimY ? -1 : 1);
    S7.mouse.dx = S7.mouse.dy = 0;
  }
  o.pointer = I.pointer ? I.pointer() : null; o.click = I.clicked ? I.clicked() : null;
  o.mouseDown0 = I.held && I.held.has ? I.held.has('Mouse0') : false;
  o.any = I.anyPressed();
  return o;
}

/* ---- the idle timer (real seconds without input, for attract mode) and the device in use ---- */
const IDLE = { t: 0, last: null };
S7.idle = IDLE;
function idleTick(rdt) {
  // real seconds in the page (a slow frame still counts its time); steps in Node
  if (typeof performance !== 'undefined' && typeof document !== 'undefined' && !S7.game.headless) { const now = performance.now(); rdt = IDLE.lastNow ? Math.min(.25, (now - IDLE.lastNow) / 1000) : 0; IDLE.lastNow = now; }
  const I = S7.game.input, p = I.pointer ? I.pointer() : null, mv = I.move(), pa = I.padAim;
  let active = I.anyPressed() || Math.hypot(mv[0], mv[1]) > .3 || (pa && Math.hypot(pa[0], pa[1]) > .3) || (I.held && I.held.size > 0);
  if (p && IDLE.last && Math.hypot(p[0] - IDLE.last[0], p[1] - IDLE.last[1]) > 3) active = true;
  if (p) IDLE.last = p.slice();
  if (IDLE.wheel || IDLE.tap) { active = true; IDLE.wheel = false; IDLE.tap = false; }
  if (active) IDLE.t = 0; else IDLE.t += rdt;
  return active;
}
if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
  addEventListener('wheel', () => { IDLE.wheel = true; }, { passive: true });
  addEventListener('keydown', e => { S7.keyUsed = true; IDLE.tap = true; if (!e.repeat) (S7.keyTaps || (S7.keyTaps = new Set())).add(e.code); }, true);
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') S7.touchUsed = true; IDLE.tap = true; }, true);
  addEventListener('touchstart', () => { IDLE.tap = true; }, { capture: true, passive: true });
}

/** touch-only: a coarse pointer, no fine one, touch points, no gamepad, no key pressed yet (§6.5) */
S7.touchOnly = () => {
  if (typeof matchMedia !== 'function' || typeof navigator === 'undefined') return false;
  if (S7.keyUsed) return false;
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean) : [];
  if (pads.length) return false;
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0;
};
/** the prompt chip for an action: the glyph on a pad, the key on a keyboard */
S7.label = (a, dev) => {
  const I = S7.game.input; let l = I.label(a, dev);
  if (!l || l === 'none') l = '?';
  return l;
};

/* ==== src/10-world.js ==== */
/* SKILLER7 — the world the sim knows: a LevelGrid (from the same rows and legend the 3D world is built from, or the
 * same terrain height function) for floors, walls, line of sight and flow fields; the rail graph (nodes, edges, paths);
 * the camera director's shots (authored, or placed automatically where a clear line to the hero exists). */
const LEGEND0 = { '#': { wall: 48 }, w: { wall: 12 }, P: { pillar: 56 }, '.': {}, ' ': { pit: true }, t: { torch: true } };

/** rows built from rectangles: a designer's tool for room-and-corridor levels.
 *  ops: ['fill', x0, y0, x1, y1, ch] (inclusive), ['set', x, y, ch], ['row', y, x0, str] */
function buildRows(w, h, ops, base = '#') {
  const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(base));
  for (const op of ops) {
    if (op[0] === 'fill') { const [, x0, y0, x1, y1, ch] = op; for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = ch; }
    else if (op[0] === 'set') g[op[2]][op[1]] = op[3];
    else if (op[0] === 'row') { const [, y, x0, str] = op; for (let i = 0; i < str.length; i++) if (str[i] !== '?') g[y][x0 + i] = str[i]; }
  }
  return g.map(r => r.join(''));
}
S7.buildRows = buildRows;

class LevelGrid {
  constructor(area) {
    this.area = area; this.blocks = (area.blocks || []).map(b => b.map((v, i) => v * (i === 2 || i === 5 ? M : M)));
    const W3 = area.world || {};
    if (W3.terrain) {
      this.terrain = W3.terrain; this.w = Math.ceil(W3.terrain.size / M); this.h = this.w;
    } else {
      const L = W3.level, rows = L.rows; this.rows = rows; this.h = rows.length; this.w = rows[0].length;
      const leg = Object.assign({}, LEGEND0, L.legend || {});
      this.F = new Float32Array(this.w * this.h); this.Tp = new Float32Array(this.w * this.h); this.S = new Array(this.w * this.h); this.pit = new Uint8Array(this.w * this.h);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const ch = rows[y][x] || '#', e = leg[ch] || {}, k = y * this.w + x;
        const fl = e.floor || 0;
        this.F[k] = fl; this.S[k] = e.stairs ? e : null;
        if (e.pit) { this.pit[k] = 1; this.F[k] = -400; this.Tp[k] = -400; }
        else if (e.wall !== undefined) this.Tp[k] = fl + e.wall; else if (e.pillar !== undefined) this.Tp[k] = fl + e.pillar;
        else if (e.platform !== undefined) { this.Tp[k] = e.platform; this.F[k] = e.pit ? -400 : fl; this.plat = this.plat || {}; this.plat[k] = e.platform; }
        else this.Tp[k] = fl;
      }
    }
  }
  /** the floor's height under (x, y) in units: what a walker stands on */
  floor(x, y) {
    if (this.terrain) return this.terrain.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 0;
    const k = cy * this.w + cx, s = this.S[k];
    if (s) { const fx = x / M - cx, fy = y / M - cy, from = s.from || 0, to = s.floor || 16, u = s.stairs === 'n' ? 1 - fy : s.stairs === 's' ? fy : s.stairs === 'e' ? fx : 1 - fx; return from + (to - from) * u; }
    return this.F[k];
  }
  /** the top of whatever stands at (x, y): a wall's top, else the floor */
  top(x, y) {
    if (this.terrain) return this.terrain.height(x, y);
    const cx = Math.floor(x / M), cy = Math.floor(y / M);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 9999;
    const k = cy * this.w + cx; return this.S[k] ? this.floor(x, y) : this.Tp[k];
  }
  wall(cx, cy) { if (this.terrain) return false; if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return true; const k = cy * this.w + cx; return this.Tp[k] > this.F[k] + 10 && !this.S[k] && !(this.plat && this.plat[k]); }
  /** solid at a point? walls (below their tops), the ground, the extra blockers */
  solid(x, y, z) {
    if (this.terrain) { if (z < this.terrain.height(x, y)) return true; }
    else {
      const cx = Math.floor(x / M), cy = Math.floor(y / M);
      if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return true;
      const k = cy * this.w + cx;
      if (this.plat && this.plat[k] !== undefined) { const p = this.plat[k]; if (z < p && z > p - 4) return true; if (z < this.F[k]) return true; }
      else if (z < (this.S[k] ? this.floor(x, y) : this.Tp[k])) return true;
    }
    for (const b of this.blocks) if (x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5]) return true;
    return false;
  }
  /** march a ray: the distance to the first solid point, or max */
  ray(o, d, max) {
    const st = this.terrain ? 6 : 3;
    for (let t = st; t < max; t += st) if (this.solid(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)) return t - st * .5;
    return max;
  }
  los(a, b) { const d = V.sub(b, a), L = V.len(d); if (L < 1) return true; return this.ray(a, V.norm(d), L) >= L - 1; }
  walkable(cx, cy) { if (this.terrain) return true; if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return false; const k = cy * this.w + cx; return !this.pit[k] && (this.Tp[k] <= this.F[k] + 10 || this.S[k]); }
  /** a breadth-first flow field toward a tile: dist[k], rebuilt when the target tile changes */
  flow(tx, ty) {
    if (this.terrain) return null;
    const cx = clamp(Math.floor(tx / M), 0, this.w - 1), cy = clamp(Math.floor(ty / M), 0, this.h - 1), key = cy * this.w + cx;
    if (this._flowKey === key && this._flow) return this._flow;
    const D = this._flow || new Int32Array(this.w * this.h); D.fill(-1);
    const q = [key]; D[key] = 0;
    for (let i = 0; i < q.length; i++) {
      const k = q[i], x = k % this.w, y = (k / this.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!this.walkable(nx, ny)) continue; const nk = ny * this.w + nx;
        if (D[nk] >= 0 || Math.abs(this.F[nk] - this.F[k]) > 20 && !this.S[nk] && !this.S[k]) continue;
        D[nk] = D[k] + 1; q.push(nk);
      }
    }
    this._flow = D; this._flowKey = key; return D;
  }
  /** which way from (x, y) toward the flow's target: [dx, dy] unit, or null to go straight */
  flowDir(x, y, tx, ty) {
    const D = this.flow(tx, ty); if (!D) return null;
    const cx = Math.floor(x / M), cy = Math.floor(y / M), k = cy * this.w + cx;
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h || D[k] < 0) return null;
    if (D[k] <= 1) return null;
    let best = null, bd = D[k];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue; const nk = ny * this.w + nx;
      if (D[nk] < 0 || D[nk] >= bd) continue;
      if (dx && dy && (D[cy * this.w + nx] < 0 || D[ny * this.w + cx] < 0)) continue;   // (no cutting corners)
      bd = D[nk]; best = [(nx + .5) * M - x, (ny + .5) * M - y];
    }
    if (!best) return null; const l = Math.hypot(best[0], best[1]) || 1; return [best[0] / l, best[1] / l];
  }
}
S7.LevelGrid = LevelGrid;

/* ---- paths: a polyline (optionally Catmull-Rom smoothed), sampled densely, measured ---- */
function makePath(pts, smooth) {
  let P = pts;
  if (smooth && pts.length > 2) {
    P = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 24));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, c = j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        P.push([c(0), c(1), c(2)]);
      }
    }
    P.push(pts[pts.length - 1]);
  }
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const len = cum[cum.length - 1] || 1;
  return {
    pts: P, len,
    at(s) {
      s = clamp(s, 0, len); let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const a = P[lo], b = P[hi], seg = cum[hi] - cum[lo] || 1, u = (s - cum[lo]) / seg;
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: a[2] + (b[2] - a[2]) * u, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  };
}
S7.makePath = makePath;

/** load an area's rail graph: nodes and edges in engine units, paths measured, cameras placed */
function buildRails(area, grid) {
  const T2U = (t, zDef) => { const x = t[0] * M, y = t[1] * M; return [x, y, t[2] !== undefined ? t[2] * M : (zDef !== undefined ? zDef : grid.floor(x, y))]; };
  const nodes = {}, edges = [], adj = {};
  for (const id in area.nodes) { const n = area.nodes[id], p = T2U(n.t); nodes[id] = Object.assign({}, n, { id, x: p[0], y: p[1], z: p[2], fixedZ: n.t[2] !== undefined }); adj[id] = []; }
  for (const e0 of area.edges || []) {
    const A = nodes[e0.a], B = nodes[e0.b]; if (!A || !B) throw new Error(area.id + ': edge ' + e0.a + '-' + e0.b + ' has an unknown node');
    const kind = e0.kind || 'walk', id = e0.id || e0.a + '-' + e0.b;
    const pts = [[A.x, A.y, A.z], ...(e0.via || []).map(v => T2U(v)), [B.x, B.y, B.z]];
    const path = makePath(pts, (e0.via || []).length > 0 && e0.smooth !== false);
    const e = Object.assign({}, e0, { id, kind, A, B, path, len: path.len, oneWay: e0.oneWay ?? (kind === 'ski' || kind === 'lift' || kind === 'jump') });
    e.followZ = (kind === 'walk' || kind === 'stairs' || kind === 'ski' || kind === 'lift' && e0.ground) && !e0.bridge;
    edges.push(e); adj[e.a].push(e); adj[e.b].push(e);
  }
  const R2 = { area, grid, nodes, edges, adj, byId: Object.fromEntries(edges.map(e => [e.id, e])) };
  for (const e of edges) { e.shots = (e.cams || autoCams(R2, e, 1)).map(s => normShot(s)); e.rshots = e.oneWay ? e.shots : (e.rcams || (e.cams ? e.cams : autoCams(R2, e, -1))).map(s => normShot(s)); }
  return R2;
}
S7.buildRails = buildRails;

/** where on an edge (s from a): { x, y, z, angle }; walk and ski edges hug the floor; jump edges fly an arc */
function edgePos(R2, e, s) {
  const p = e.path.at(s);
  if (e.followZ) p.z = R2.grid.floor(p.x, p.y);
  if (e.kind === 'jump') { const u = clamp(s / e.len, 0, 1), za = e.A.z, zb = e.B.z; p.z = za + (zb - za) * u + Math.sin(u * Math.PI) * (e.apex || 2.5) * M; }
  return p;
}
S7.edgePos = edgePos;

/* ---- camera shots ---- */
function normShot(s) {
  const o = Object.assign({ s: [0, 1], shot: 'follow', fov: 52, blend: 0 }, s);
  const m = v => v && Array.isArray(v) ? [v[0] * M, v[1] * M, (v[2] || 0) * M] : v;
  if (o.at) o.atU = m(o.at); if (Array.isArray(o.look)) o.lookU = m(o.look); if (o.path) o.pathU = o.path.map(m);
  return o;
}
const FOLLOW = { back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 };
/** automatic fixed shots for an edge: segments of about 10 m, each from the first candidate spot with a clear line
 *  to the hero all along it (behind and high to one side; ahead looking back; wide from the side), else a follow shot */
function autoCams(R2, e, dir) {
  const G2 = R2.grid, L = e.len, out = [];
  if (e.kind === 'ski' || e.kind === 'lift' || e.kind === 'jump' || G2.terrain) {
    const n = Math.max(1, Math.round(L / (24 * M)));
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n;
      if (i % 3 === 1 && e.kind === 'ski') {   // a fixed side-on shot now and then on the slope (a floodlit stretch)
        const sm = (dir > 0 ? (s0 + s1) / 2 : 1 - (s0 + s1) / 2) * L, P = edgePos(R2, e, sm), sd = i % 2 ? 1 : -1, a = P.angle + Math.PI / 2 * sd;
        const at = [P.x + Math.cos(a) * 9 * M, P.y + Math.sin(a) * 9 * M, P.z + 4 * M]; at[2] = Math.max(at[2], G2.floor(at[0], at[1]) + 3 * M);
        out.push({ s: [s0, s1], shot: 'fixed', at: [at[0] / M, at[1] / M, at[2] / M], look: 'hero', fov: 48 });
      } else out.push({ s: [s0, s1], shot: 'follow', back: e.kind === 'lift' ? 4.5 : 4.2, side: (i % 2 ? -1 : 1) * 1.4, up: e.kind === 'lift' ? 1.6 : 2.2, ahead: 4, fov: 58, lag: .15 });
    }
    return out;
  }
  const n = Math.max(1, Math.round(L / (10 * M)));
  for (let i = 0; i < n; i++) {
    const s0 = i / n, s1 = (i + 1) / n;
    const sa = (dir > 0 ? s0 : 1 - s0) * L, sb = (dir > 0 ? s1 : 1 - s1) * L;
    const P0 = edgePos(R2, e, sa), P1 = edgePos(R2, e, sb);
    let f = [P1.x - P0.x, P1.y - P0.y]; const fl = Math.hypot(f[0], f[1]);
    if (fl < 1) { const a = P0.angle + (dir < 0 ? Math.PI : 0); f = [Math.cos(a), Math.sin(a)]; } else f = [f[0] / fl, f[1] / fl];
    const r = [-f[1], f[0]], side = ((hashStr(e.id) + i) % 2) ? 1 : -1;
    const mid = [(P0.x + P1.x) / 2, (P0.y + P1.y) / 2, (P0.z + P1.z) / 2];
    const cand = [];
    for (const sd of [side, -side]) {
      cand.push([P0.x - f[0] * 3.2 * M + r[0] * sd * 2.6 * M, P0.y - f[1] * 3.2 * M + r[1] * sd * 2.6 * M, P0.z + 3.1 * M, 50]);
      cand.push([P1.x + f[0] * 2.4 * M + r[0] * sd * 2.4 * M, P1.y + f[1] * 2.4 * M + r[1] * sd * 2.4 * M, P1.z + 2.4 * M, 50]);
      cand.push([mid[0] + r[0] * sd * 5 * M, mid[1] + r[1] * sd * 5 * M, mid[2] + 4 * M, 56]);
      cand.push([P0.x - f[0] * 2 * M + r[0] * sd * 1.2 * M, P0.y - f[1] * 2 * M + r[1] * sd * 1.2 * M, P0.z + 2.2 * M, 56]);
    }
    let pick = null;
    for (const c of cand) {
      if (!openAt(G2, c)) continue;
      let ok = true;
      for (let k = 0; k <= 4 && ok; k++) { const s = sa + (sb - sa) * k / 4, P = edgePos(R2, e, s); if (!G2.los([c[0], c[1], c[2]], [P.x, P.y, P.z + 1.2 * M])) ok = false; }
      if (ok) { pick = c; break; }
    }
    if (pick) out.push({ s: [s0, s1], shot: 'fixed', at: [pick[0] / M, pick[1] / M, pick[2] / M], look: 'hero', fov: pick[3] });
    else out.push(Object.assign({ s: [s0, s1], shot: 'follow' }, FOLLOW));
  }
  return out;
}
const openAt = (G2, c) => { for (const [dx, dy, dz] of [[0, 0, 0], [6, 0, 0], [-6, 0, 0], [0, 6, 0], [0, -6, 0], [0, 0, 6], [0, 0, -6]]) if (G2.solid(c[0] + dx, c[1] + dy, c[2] + dz)) return false; return true; };

/** the camera director: which shot covers the walker now, and its pose { x, y, z, yaw, pitch, roll, fov } */
class Director {
  constructor() { this.pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, fov: 55 }; this.shotKey = null; this.cuts = 0; this.lagP = null; this.override = null; this.aimK = 0; }
  /** the shot for the walker: e (edge), s, dir */
  shotFor(e, s, dir) {
    const list = dir < 0 ? e.rshots : e.shots, u = dir < 0 ? 1 - s / e.len : s / e.len;
    for (let i = 0; i < list.length; i++) { const sh = list[i]; if (u >= sh.s[0] - 1e-6 && u <= sh.s[1] + 1e-6) return [sh, i]; }
    return [list[list.length - 1], list.length - 1];
  }
  /** a pose for a shot, looking at hero point H (feet), facing f (radians) */
  poseOf(sh, H, f, grid, e, s, dir) {
    const look = sh.lookU ? sh.lookU : [H[0], H[1], H[2] + (sh.lookUp ?? 1.1) * M];
    let at;
    if (sh.shot === 'fixed') at = sh.atU;
    else if (sh.shot === 'crane') { const u = e ? clamp(((dir < 0 ? 1 - s / e.len : s / e.len) - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]), 0, 1) : 0; at = [sh.atU[0], sh.atU[1], lerp(sh.zFrom, sh.zTo, u) * M]; }
    else if (sh.shot === 'dolly') { const u = e ? clamp(((dir < 0 ? 1 - s / e.len : s / e.len) - sh.s[0]) / Math.max(1e-6, sh.s[1] - sh.s[0]), 0, 1) : 0, P = sh.pathU, k = u * (P.length - 1), i = Math.min(P.length - 2, Math.floor(k)), t = k - i; at = [lerp(P[i][0], P[i + 1][0], t), lerp(P[i][1], P[i + 1][1], t), lerp(P[i][2], P[i + 1][2], t)]; }
    else if (sh.shot === 'orbit') { const a = sh.t0 + (this.t || 0) * (sh.speed || .2); at = [sh.center[0] + Math.cos(a) * sh.radius, sh.center[1] + Math.sin(a) * sh.radius, sh.center[2] + sh.height]; look[0] = sh.center[0]; look[1] = sh.center[1]; look[2] = sh.center[2] + (sh.lookUp || 0); }
    else if (sh.shot === 'pov') { at = [H[0], H[1], H[2] + 1.6 * M]; const yaw = f; return { x: at[0], y: at[1], z: at[2], yaw, pitch: -.05, roll: 0, fov: sh.fov || 62 }; }
    else {   // follow
      const c = Math.cos(f), sn = Math.sin(f), back = (sh.back ?? FOLLOW.back) * M, side = (sh.side ?? FOLLOW.side) * M, up = (sh.up ?? FOLLOW.up) * M, ahead = (sh.ahead ?? FOLLOW.ahead) * M;
      const head = [H[0], H[1], H[2] + 1.3 * M];
      at = [H[0] - c * back - sn * side, H[1] - sn * back + c * side, H[2] + up];
      look[0] = H[0] + c * ahead; look[1] = H[1] + sn * ahead; look[2] = H[2] + 1.1 * M;
      if (grid) {   // pull in when a wall gets between, never under the floor
        const d = V.sub(at, head), L = V.len(d), t = grid.ray(head, V.norm(d), L);
        if (t < L) at = V.add(head, V.norm(d), Math.max(8, t - 6));
        at[2] = Math.max(at[2], grid.floor(at[0], at[1]) + 1.2 * M);
      }
    }
    const dx = look[0] - at[0], dy = look[1] - at[1], dz = look[2] - at[2];
    return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, Math.hypot(dx, dy)), roll: sh.roll || 0, fov: sh.fov || 55 };
  }
  /** project a world point through the pose: [x, y] in -1..1 (y down), or null behind; aspect = width / height */
  project(p, aspect = 16 / 9, pose = this.pose) {
    const f = V.dir(pose.yaw, pose.pitch), r = V.norm(V.cross(f, [0, 0, 1])), u = V.cross(r, f), d = [p[0] - pose.x, p[1] - pose.y, p[2] - pose.z];
    const z = V.dot(d, f); if (z <= 1) return null;
    const th = Math.tan((pose.fov || 55) * Math.PI / 360);
    return [V.dot(d, r) / (z * th * aspect), -V.dot(d, u) / (z * th)];
  }
}
S7.Director = Director;

/* ==== src/15-validate.js ==== */
/* SKILLER7 — the content validator (§14.7): runs in the tests and at boot (the quick part). It returns a list of
 * problems: unknown references, spawns and nodes off the floor, edges without length, missing beats and items. */
S7.validate = () => {
  const out = [], bad = (a, m) => out.push(a + ': ' + m);
  for (const id in S7.AREAS) {
    let A; try { A = loadArea(id); } catch (e) { bad(id, e.message); continue; }
    const area = A.area, G2 = A.grid, R2 = A.rails;
    for (const e of R2.edges) { if (!(e.len > 1)) bad(id, 'edge ' + e.id + ' has no length'); if (e.gate && !(area.gates || {})[e.gate]) bad(id, 'edge ' + e.id + ' has an unknown gate ' + e.gate); for (const sh of e.shots) if (sh.s[0] > sh.s[1]) bad(id, 'edge ' + e.id + ' shot range'); const cov = e.shots.reduce((a, s) => a + (s.s[1] - s.s[0]), 0); if (cov < .999) bad(id, 'edge ' + e.id + ' shots cover ' + cov.toFixed(2)); }
    for (const nid in R2.nodes) { const n = R2.nodes[nid]; if (!R2.adj[nid].length) bad(id, 'node ' + nid + ' has no edges'); if (!G2.terrain && !n.fixedZ && !G2.walkable(Math.floor(n.x / M), Math.floor(n.y / M))) bad(id, 'node ' + nid + ' is not on the floor'); if (n.to && !S7.AREAS[n.to[0]]) bad(id, 'exit ' + nid + ' to an unknown area'); else if (n.to && !S7.AREAS[n.to[0]].nodes[n.to[1]]) bad(id, 'exit ' + nid + ' to an unknown node ' + n.to.join(':')); }
    for (const k in area.spawns || {}) { const s = area.spawns[k]; if (!G2.terrain && s[2] === undefined && !G2.walkable(Math.floor(s[0]), Math.floor(s[1]))) bad(id, 'spawn ' + k + ' is not on the floor'); }
    for (const w in area.waves || {}) for (const [type, sp] of area.waves[w].spawn) { if (!S7.ENEMIES[type]) bad(id, 'wave ' + w + ' has an unknown enemy ' + type); if (!(area.spawns || {})[sp]) bad(id, 'wave ' + w + ' has an unknown spawn ' + sp); }
    for (const t of area.triggers || []) { if (t.edge && !R2.byId[t.edge]) bad(id, 'trigger ' + t.id + ' on an unknown edge'); if (t.node && !R2.nodes[t.node]) bad(id, 'trigger ' + t.id + ' on an unknown node'); if (t.beat && !S7.BEATS[t.beat]) bad(id, 'trigger ' + t.id + ' has an unknown beat'); if (t.wave && !(area.waves || {})[t.wave]) bad(id, 'trigger ' + t.id + ' has an unknown wave'); if (t.tip && !S7.TIPDEFS[t.tip]) bad(id, 'trigger ' + t.id + ' has an unknown tip'); }
    for (const s of A.spots) { if (s.item && !S7.ITEMS[s.item]) bad(id, 'spot ' + s.id + ' has an unknown item'); if (s.beat && !S7.BEATS[s.beat]) bad(id, 'spot ' + s.id + ' has an unknown beat'); if (s.lines && typeof s.lines === 'string' && !S7.LINES[s.lines]) bad(id, 'spot ' + s.id + ' has unknown lines'); if (s.gate && !(area.gates || {})[s.gate]) bad(id, 'spot ' + s.id + ' has an unknown gate'); }
    for (const t of A.targets || []) if (t.beat && !S7.BEATS[t.beat]) bad(id, 'target ' + t.id + ' has an unknown beat');
  }
  for (const id in S7.PERSONAS) { const P = S7.PERSONAS[id]; if (!S7.WEAPONS[P.weapon]) bad('persona ' + id, 'unknown weapon'); }
  const strs = JSON.stringify([S7.LINES, S7.AREAS, S7.ITEMS, S7.PERSONAS]);
  const MARK = new RegExp('\\b(' + ['TO' + 'DO', 'T' + 'BD', 'lo' + 'rem', 'place' + 'holder', 'X' + 'XX'].join('|') + ')\\b', 'i');
  if (MARK.test(strs)) bad('content', 'an unfinished marker in the text');
  return out;
};
S7.validateQuick = () => { const v = S7.validate(); if (v.length && S7.game) S7.game.fail('content', new Error(v.slice(0, 5).join('; '))); return v; };

/* ==== src/20-sim.js ==== */
/* SKILLER7 — the sim: one state object (S7.G), the walker on the rails, the modes, personas and switching, Red and
 * Rime, items, gates, talk and beats, Room 7, freezing and the Sweep's rescue, saves. It never touches the DOM or 3D. */
const ORDER = ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid'];
S7.ORDER = ORDER;
let G = null;            // the state (S7.G)
const W = { area: null, grid: null, rails: null };   // the loaded area (S7.W)
S7.W = W;
const AREA_CACHE = {};

function newState(o = {}) {
  const roster = {};
  for (const id of ORDER) { const P = S7.PERSONAS[id]; roster[id] = { hp: P.hp, max: P.hp, stats: { power: 0, speed: 0, crit: 0, steady: 0 }, frozen: false, statue: null, unlocked: ['ansel', 'dagny', 'ignaz', 'rurik'].includes(id) }; }
  return {
    v: 1, seed: o.seed || 7, difficulty: o.difficulty || 'Piste', time: 0, playtime: 0,
    area: null, mode: 'play', modeT: 0, cut: false, letterbox: 0,
    walker: { edge: null, s: 0, dir: 1, v: 0, node: null, arrived: null, turnT: 0, branch: 0, skiStop: false, air: 0, lastNode: null },
    persona: 'ignaz', last: 'dagny', roster, red: 60, rime: 0, items: {}, pins: [], dossier: [], exposures: [],
    gates: {}, waves: {}, spots: {}, flags: {}, visited: {}, seen: {}, tips: {},
    aim: { on: false, yaw: 0, pitch: 0, k: 0, recoil: 0, scope: false, sway: 0 },
    wpn: {}, cd: {}, scan: null, scanCd: 0, revealAll: 0, ringSel: null, switchT: 0, switchTo: null,
    enemies: [], proj: [], drops: [], fx: [], nextId: 1, statueHold: 0, gameoverT: 0,
    lastDoor: {}, r7from: null, boss: null, aval: null, echo: null,
    stats: newStats(), results: {}, target: 0, hints: 0, ending: null, cam: null
  };
}
const newStats = () => ({ time: 0, kills: 0, crits: 0, hits: 0, shots: 0, red: 0, frozen: 0, hints: 0 });
S7.newState = newState;

/* ---- areas ---- */
function loadArea(id) {
  if (AREA_CACHE[id]) return AREA_CACHE[id];
  const area = S7.AREAS[id]; if (!area) throw new Error('unknown area ' + id);
  const grid = new LevelGrid(area), rails = buildRails(area, grid);
  const spots = (area.spots || []).map(s => Object.assign({}, s, { pos: spotPos(rails, s) }));
  const targets = (area.targets || []).map(t => Object.assign({}, t, { pos: [t.at[0] * M, t.at[1] * M, (t.at[2] || 0) * M] }));
  return (AREA_CACHE[id] = { id, area, grid, rails, spots, targets });
}
S7.loadArea = loadArea;
function spotPos(R2, s) {
  if (s.node) { const n = R2.nodes[s.node]; if (!n) throw new Error(R2.area.id + ': spot ' + s.id + ' on unknown node ' + s.node); return [n.x, n.y, n.z]; }
  if (s.edge) { const e = R2.byId[s.edge]; if (!e) throw new Error(R2.area.id + ': spot ' + s.id + ' on unknown edge ' + s.edge); const p = edgePos(R2, e, (s.s ?? .5) * e.len); return [p.x, p.y, p.z]; }
  return [s.at[0] * M, s.at[1] * M, (s.at[2] || 0) * M];
}
const key = (k, area = G.area) => area + ':' + k;
const flag = f => !!(G && G.flags[f]);
const setFlag = (f, v = true) => { G.flags[f] = v; emit('flag', { flag: f, v }); };
S7.flag = flag; S7.setFlag = setFlag;

/** enter an area at a node (arriving stopped there) */
function enterArea(id, nodeId, o = {}) {
  const from = G.area, A = loadArea(id);
  Object.assign(W, { area: A.area, grid: A.grid, rails: A.rails, spots: A.spots, targets: A.targets, A });
  G.area = id; G.visited[id] = true;
  if (!o.keepEnemies) { G.enemies = []; G.proj = []; G.drops = []; }
  const n = A.rails.nodes[nodeId] || A.rails.nodes[A.area.start];
  placeAtNode(n.id, o.dir);
  G.aim.on = false; G.aval = null; G.scan = null;
  if (id !== 'room7') { G.lastDoor[id] = G.lastDoor[id] || null; }
  W.dir = director; director.cut();
  if (A.area.target !== undefined && id !== 'room7') G.target = A.area.target;
  emit('area', { from, to: id });
  if (A.area.onEnter && !o.silent) A.area.onEnter(G);
  if (!o.noAutosave && id !== 'room7') S7.autosave && S7.autosave('area');
  return A;
}
S7.enterArea = enterArea;
function placeAtNode(nodeId, dirHint) {
  const R2 = W.rails, n = R2.nodes[nodeId], wk = G.walker, es = R2.adj[nodeId].filter(edgeOpen);
  const e = es[0] || R2.adj[nodeId][0];
  wk.node = nodeId; wk.v = 0; wk.turnT = 0; wk.skiStop = false; wk.air = 0;
  if (e) { wk.edge = e.id; wk.s = e.a === nodeId ? 0 : e.len; wk.dir = e.a === nodeId ? 1 : -1; wk.arrived = null; }
  else { wk.edge = null; wk.s = 0; wk.dir = 1; }
  if (dirHint !== undefined) wk.face = dirHint;
  // the way back (to an exit or a door) counts as where we came from: the default goes on into the area
  const n0 = R2.nodes[nodeId], back = R2.adj[nodeId].find(x => { const o = x.a === nodeId ? x.B : x.A; return o.kind === 'exit' || o.kind === 'door' && o !== n0; });
  wk.arrived = back && R2.adj[nodeId].length > 1 ? back.id : null;
  wk.branch = 0; pickDefaultBranch();
  if (n0.go) { const i = branchesAt(nodeId).findIndex(x => x.id === n0.go); if (i >= 0) wk.branch = i; }
  wk.lastNode = nodeId;
}
S7.placeAtNode = placeAtNode;

/* ---- the walker ---- */
const curEdge = () => G.walker.edge ? W.rails.byId[G.walker.edge] : null;
function heroPos() {
  const wk = G.walker, e = curEdge();
  if (!e) { const n = W.rails.nodes[wk.node]; return { x: n.x, y: n.y, z: n.z, angle: 0 }; }
  const p = edgePos(W.rails, e, wk.s); if (wk.dir < 0) p.angle += Math.PI;
  return p;
}
S7.heroPos = heroPos;
/** the hero's facing for drawing (turning through 180 degrees during a quick turn) */
const heroFacing = () => { const p = heroPos(), wk = G.walker; return wk.turnT > 0 ? p.angle + Math.PI * (wk.turnT / .22) : (wk.face !== undefined && wk.node && wk.v === 0 && !curEdge() ? wk.face : p.angle); };
S7.heroFacing = heroFacing;
/** can the walker use this edge (not hidden; a one-way edge only from its start) */
function edgeOpen(e, fromNode) {
  if (e.hidden && !flag(e.hidden)) return false;
  if (e.closed && flag(e.closed)) return false;
  if (fromNode && e.oneWay && e.a !== fromNode) return false;
  if (e.onlyFor && G.persona !== e.onlyFor && !CHEATS.ghost) return false;
  return true;
}
/** the edges a walker standing at node n can take */
const branchesAt = n => W.rails.adj[n].filter(e => edgeOpen(e, n));
S7.branchesAt = branchesAt;
/** default highlight: straight on from the way we arrived (or the first) */
function pickDefaultBranch() {
  const wk = G.walker; if (!wk.node) return;
  const B = branchesAt(wk.node); if (!B.length) return;
  const n = W.rails.nodes[wk.node], arrive = wk.arrived ? W.rails.byId[wk.arrived] : null;
  let face = arrive ? (arrive.b === wk.node ? edgeHeading(arrive, wk.node, true) : edgeHeading(arrive, wk.node, true)) : null;
  if (face === null) { wk.branch = 0; return; }
  let best = 0, bd = 9;
  B.forEach((e, i) => { if (arrive && e.id === arrive.id && B.length > 1) return; const d = Math.abs(angDiff(face, edgeHeading(e, wk.node))); if (d < bd) { bd = d; best = i; } });
  wk.branch = best; void n;
}
/** the heading leaving node n along edge e (or, with arriving, the heading we had arriving at n) */
function edgeHeading(e, n, arriving) {
  const R2 = W.rails, atA = e.a === n, s0 = atA ? 0 : e.len, s1 = atA ? Math.min(e.len, 1.5 * M) : Math.max(0, e.len - 1.5 * M);
  const p0 = edgePos(R2, e, s0), p1 = edgePos(R2, e, s1), a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return arriving ? a + Math.PI : a;
}
S7.edgeHeading = edgeHeading;
const speedOf = () => {
  const P = S7.PERSONAS[G.persona], st = G.roster[G.persona].stats;
  let v = T.walkSpeed * (P.speedK || 1) * (1 + .08 * st.speed);
  if (G.persona === 'dagny' && G.tuck) v *= 2;
  return v;
};
/** take an edge from the node the walker stands at (with its gate checked) */
function takeEdge(e) {
  const wk = G.walker, n = wk.node;
  if (!edgeOpen(e, n)) return false;
  if (e.gate && !gatePass(e.gate)) return false;
  if (e.kind === 'jump') {
    if (G.persona !== 'dagny' && !CHEATS.ghost) { refuse('TOO FAR TO JUMP.', 'gap'); return false; }
    wk.v = Math.max(wk.v, 200); emit('jump', {});
  }
  if (e.kind === 'lift') emit('lift', { on: true, edge: e.id });
  wk.edge = e.id; wk.s = e.a === n ? 0 : e.len; wk.dir = e.a === n ? 1 : -1; wk.node = null; wk.arrived = null; wk.skiStop = false;
  return true;
}
S7.takeEdge = takeEdge;
function refuse(text, hint) { emit('refuse', { text, hint }); S7.splash(text, 1.6); }

/** a step of the walker (play mode, not aiming unless a moving edge allows it) */
function walkerStep(dt, I) {
  const wk = G.walker, R2 = W.rails;
  if (wk.turnT > 0) { wk.turnT = Math.max(0, wk.turnT - dt); return; }
  if (wk.node) {   // stopped on a node
    wk.v = 0;
    const B = branchesAt(wk.node), n = R2.nodes[wk.node];
    if (I.turn && wk.arrived) { const back = R2.byId[wk.arrived]; if (back && edgeOpen(back, wk.node)) { const i = B.indexOf(back); if (i >= 0) { wk.branch = i; takeEdge(back); wk.turnT = .22; emit('turn', {}); return; } } }
    if (B.length >= 2) {
      if (I.branch >= 0 && I.branch < B.length) wk.branch = I.branch;
      if (I.left || I.right) wk.branch = (wk.branch + (I.right ? 1 : -1) + B.length) % B.length;
      else if (Math.hypot(I.stick[0], I.stick[1]) > .5 && !I.moveByStickOnly) {
        // the stick picks the branch nearest its screen angle
        const want = Math.atan2(I.stick[1], I.stick[0]); let best = -1, bd = 1.2;
        B.forEach((e, i) => { const sa = branchScreenAngle(e, wk.node); if (sa === null) return; const d = Math.abs(angDiff(want, sa)); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) wk.branch = best;
      }
    } else wk.branch = 0;
    if (n.kind === 'exit' && n.open && !wk.exitDone && n.to) { wk.exitDone = true; tryExit(n); return; }
    // at a junction a held move waits a moment (time to pick a way); a fresh press goes at once
    if (B.length >= 3) { if (!I.move) wk.dwell = -1; else if (wk.dwell === undefined || wk.dwell === null) wk.dwell = 0; else if (wk.dwell >= 0) wk.dwell += 1 / 120; }
    const fresh = wk.dwell === -1 || wk.dwell === undefined || wk.dwell >= .4;
    const go = I.move && (B.length < 3 || fresh) || I.branch >= 0 && I.clickGo;
    if (go) wk.dwell = null;
    if (go && B.length) {
      const e = B[clamp(wk.branch, 0, B.length - 1)];
      if (B.length === 1 && wk.arrived && e.id === wk.arrived && n.kind !== 'start') return;   // a dead end: turn round to go back
      takeEdge(e);
    }
    return;
  }
  const e = curEdge(); if (!e) return;
  const L = e.len;
  if (e.kind === 'lift') { wk.v = (e.speed || (e.cabin ? 140 : 120)) * (G.flags.liftStop === e.id ? 0 : 1); }
  else if (e.kind === 'ski') { skiPhysics(dt, I, e); forkStep(e, I); }
  else if (e.kind === 'jump') { wk.air += dt; }
  else {
    if (I.turn && !e.oneWay) { wk.dir *= -1; wk.turnT = .22; wk.v = 0; emit('turn', {}); return; }
    const target = I.move ? speedOf() * (e.kind === 'stairs' ? .85 : 1) * (e.slow || 1) : 0;
    wk.v = approach(wk.v, target, (target > wk.v ? speedOf() / .18 : speedOf() / .12) * dt);
    // slow into a junction or a stop: arrive exactly on it
    const ahead = wk.dir > 0 ? L - wk.s : wk.s, endN = wk.dir > 0 ? e.b : e.a;
    if (stopsAt(endN, e) && ahead < 1.2 * M) wk.v = Math.min(wk.v, Math.max(28, ahead * 6));
  }
  let s = wk.s + wk.dir * wk.v * dt;
  const passed = []; for (const t of W.area.triggers || []) if (t.edge === e.id) passed.push(t);
  const s0 = wk.s; wk.s = clamp(s, 0, L);
  for (const t of passed) { const ts = (t.s ?? .5) * L; if ((s0 - ts) * (wk.s - ts) <= 0 && s0 !== wk.s) fireTrigger(t); }
  if (wk.dir > 0 ? s >= L : s <= 0) arrive(wk.dir > 0 ? e.b : e.a, e, Math.abs(s - wk.s));
}
/** a node stops the walker: a junction, a door, a dead end, any node with a kind of its own */
function stopsAt(nid, viaEdge) {
  const n = W.rails.nodes[nid], B = branchesAt(nid);
  if (viaEdge && viaEdge.kind === 'ski') { const out = B.filter(e => e.id !== viaEdge.id); if (out.length && out.every(e => e.kind === 'ski' || e.kind === 'jump') && !n.kind) return false; }
  return !!n.kind && n.kind !== 'pass' || B.length !== 2;
}
function arrive(nid, e, over) {
  const wk = G.walker, n = W.rails.nodes[nid];
  if (!G.seen[key('n:' + nid)]) G.seen[key('n:' + nid)] = true;
  G.seen[key('e:' + e.id)] = true;
  if (e.kind === 'lift') emit('lift', { on: false, edge: e.id });
  if (e.kind === 'jump') emit('land', { node: nid });
  for (const t of W.area.triggers || []) if (t.node === nid) fireTrigger(t);
  if (W.rails.nodes[nid] !== n || G.area !== W.area.id) return;   // (a trigger moved us)
  const B = branchesAt(nid), out = B.filter(x => x.id !== e.id);
  const keepGoing = !stopsAt(nid, e) && out.length >= 1;
  if (keepGoing) { wk.passed = nid; wk.passedAt = G.time; emit('pass', { node: nid }); }
  if (keepGoing && (e.kind === 'ski' || e.kind === 'jump') && out.length) {
    // a fork on the slope: the branch picked while moving (or straight on)
    const want = wk.forkIds && wk.forkIds[wk.forkPick ?? 0], pick = out.find(x => x.id === want) || out[0], v = wk.v; wk.fork = null; wk.forkIds = null;
    wk.node = nid; wk.arrived = e.id; if (takeEdge(pick)) { wk.v = v; wk.s = clamp(pick.a === nid ? over : pick.len - over, 0, pick.len); wk.forkPick = null; return; }
  } else if (keepGoing && out.length === 1 && edgeOpen(out[0], nid) && (!out[0].gate || gateOpen(out[0].gate))) {
    const v = wk.v, nx = out[0]; wk.node = nid; wk.arrived = e.id;
    if (takeEdge(nx)) { wk.v = v; wk.s = clamp(nx.a === nid ? over : nx.len - over, 0, nx.len); return; }
  }
  wk.node = nid; wk.arrived = e.id; wk.v = 0; wk.exitDone = false; wk.lastNode = nid; wk.dwell = 0;
  pickDefaultBranch();
  if (B.length >= 3) emit('junction', { node: nid, options: B.length });
  if (n.kind === 'exit' && n.open) { wk.exitDone = true; tryExit(n); }
  if (n.kind === 'end' && n.onArrive) n.onArrive(G);
}
/** the branch's angle on screen (radians, x right, y down) through the director's pose */
function branchScreenAngle(e, nid) {
  const n = W.rails.nodes[nid], atA = e.a === nid, p = edgePos(W.rails, e, atA ? Math.min(e.len, 1.5 * M) : Math.max(0, e.len - 1.5 * M));
  const a = director.project([n.x, n.y, n.z + 16]), b = director.project([p.x, p.y, p.z + 16]);
  if (!a || !b) return null; return Math.atan2(b[1] - a[1], (b[0] - a[0]) * 16 / 9);
}
S7.branchScreenAngle = branchScreenAngle;

/** a fork on the slope ahead: markers 2.5 s before it; left / right (or the stick, or a click) pick a branch */
function forkStep(e, I) {
  const wk = G.walker, nid = wk.dir > 0 ? e.b : e.a, ahead = wk.dir > 0 ? e.len - wk.s : wk.s;
  const out = branchesAt(nid).filter(x => x.id !== e.id && x.a === nid);
  if (out.length < 2 || ahead > Math.max(2.5 * wk.v, 6 * M)) { wk.fork = null; return; }
  if (!wk.fork || wk.fork.node !== nid) { let best = 0, bd = 9; const h = edgeHeading(e, nid, true); out.forEach((x, i) => { const d = Math.abs(angDiff(h, edgeHeading(x, nid))); if (d < bd) { bd = d; best = i; } }); wk.fork = { node: nid, options: out.map(x => x.id), pick: best }; }
  const F = wk.fork;
  if (I.left) F.pick = (F.pick + out.length - 1) % out.length; if (I.right) F.pick = (F.pick + 1) % out.length;
  if (I.branch >= 0 && I.branch < out.length) F.pick = I.branch;
  else if (Math.abs(I.stick[0]) > .6) { const want = I.stick[0] > 0 ? 1 : -1; let best = F.pick, bv = -9; out.forEach((x, i) => { const sa = branchScreenAngle(x, nid); if (sa === null) return; const v = Math.cos(sa) * want; if (v > bv) { bv = v; best = i; } }); F.pick = best; }
  wk.forkPick = F.pick; wk.forkIds = F.options;
}
S7.forkStep = forkStep;
/* ---- skiing (§7.1): gravity along the slope, drag, a hockey stop, tuck ---- */
function skiPhysics(dt, I, e) {
  const wk = G.walker, p0 = edgePos(W.rails, e, wk.s), p1 = edgePos(W.rails, e, clamp(wk.s + 8, 0, e.len)), slope = -(p1.z - p0.z) / Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
  if (I.turn && wk.v > 5) { wk.skiStop = true; emit('hockey', {}); }
  if (wk.skiStop) { wk.v = Math.max(0, wk.v - 600 * dt); if (I.move && wk.v === 0 && !G.aim.on) wk.skiStop = false; if (wk.skiStop) return; }
  const tuck = I.move, dagnyTuck = G.persona === 'dagny' && G.tuck, k = tuck ? .0006 : .0019;
  const top = dagnyTuck ? 260 : T.skiTop * (tuck ? 1 : .85);
  wk.v += (520 * slope - k * wk.v * wk.v - 6) * dt;
  if (tuck && wk.v < 60) wk.v += 90 * dt;   // (a skate to push off)
  wk.v = clamp(wk.v, 25, top);
  wk.tucking = tuck;
}

/* ---- gates (§7.13) ---- */
const gateDef = id => (W.area.gates || {})[id];
const gateOpen = id => !!G.gates[key(id)] || CHEATS.ghost;
S7.gateOpen = gateOpen;
function openGate(id, area = G.area) { if (G.gates[key(id, area)]) return; G.gates[key(id, area)] = true; const g = (S7.AREAS[area].gates || {})[id]; emit('gate', { gate: id, ok: true, area }); if (g && g.flag) setFlag(g.flag); if (g && g.onOpen) g.onOpen(G); }
S7.openGate = openGate;
/** try to pass a gate on the way in: true if it lets us through (perhaps opening it now) */
function gatePass(id) {
  if (gateOpen(id)) return true;
  const g = gateDef(id); if (!g) return true;
  if (g.kind === 'patrol') { if (G.persona === 'ansel') { openGate(id); S7.splash('PATROL.', 1); return true; } refuse(g.line || 'Patrol only. You are not patrol.', 'patrol'); return false; }
  if (g.kind === 'flag') { if (flag(g.flag)) { openGate(id); return true; } refuse(g.line || 'It will not open.', g.hint); return false; }
  if (g.kind === 'key') { if (G.items[g.item]) { openGate(id); S7.splash('UNLOCKED.', 1); return true; } refuse(g.line || 'Locked.', g.hint); return false; }
  refuse(g.line || 'The way is shut.', g.hint);
  return false;
}
/** interact with a gate standing beside it: buyouts, ice locks, delegate gates, keys */
function gateInteract(id) {
  const g = gateDef(id); if (!g || gateOpen(id)) return;
  if (g.kind === 'buyout') {
    if (G.persona !== 'rurik') { say([[G.persona, g.line || 'Members only. Membership is a matter of means.']]); return; }
    say([['rurik', 'Pay ' + g.price + ' Red?']], { choices: ['PAY ' + g.price + ' RED', 'LEAVE'], onChoice: i => { if (i === 0) { if (G.red >= g.price || CHEATS.infRed) { spendRed(g.price); openGate(id); emit('buyout', {}); S7.splash('PAID IN FULL.', 1.2); } else S7.splash('NOT ENOUGH RED.', 1.2); } } });
  } else if (g.kind === 'icelock') {
    if (G.items.ember) { openGate(id); emit('steam', { at: g.at }); S7.splash('THE ICE WEEPS.', 1.4); } else say([[G.persona, g.line || 'Frozen shut.']]);
  } else if (g.kind === 'delegate') {
    const n = G.items.edelweiss || 0;
    if (n >= 3) { openGate(id); emit('delegate', {}); runBeat('delegate_gate'); } else say([[G.persona, 'Three flowers. You have ' + n + '.']]);
  } else if (g.kind === 'key') { if (G.items[g.item]) { openGate(id); S7.splash('UNLOCKED.', 1); } else say([[G.persona, g.line || 'Locked.']]); }
  else say([[G.persona, g.line || 'Not with these hands.']]);
}
S7.gateInteract = gateInteract;
/** a skill went off at a point: echo walls, crystals, cornices and seracs nearby open */
function skillGates(kind, at, radius) {
  const gs = W.area.gates || {};
  for (const id in gs) {
    const g = gs[id]; if (gateOpen(id) || !g.at) continue;
    const p = [g.at[0] * M, g.at[1] * M, W.grid.floor(g.at[0] * M, g.at[1] * M) + (g.at[2] || 0) * M], d = V.dist(p, at);
    if (g.kind === kind && d <= radius * M) { openGate(id); S7.splash(g.done || 'OPEN.', 1.4); if (g.beat) runBeat(g.beat); }
  }
}
S7.skillGates = skillGates;

/* ---- exits ---- */
function tryExit(n) {
  if (n.needs) {
    if (n.needs.item && !G.items[n.needs.item]) { refuse(n.line || 'Locked.', n.hint); G.walker.exitDone = false; return false; }
    if (n.needs.flag && !flag(n.needs.flag)) { refuse(n.line || 'Not yet.', n.hint); G.walker.exitDone = false; return false; }
  }
  if (nearEnemies(40).length && !n.anyway) { refuse('Not while someone is laughing.'); G.walker.exitDone = false; return false; }
  emit('exit', { to: n.to }); S7.flurry && S7.flurry();
  enterArea(n.to[0], n.to[1]);
  return true;
}
S7.tryExit = tryExit;

/* ---- personas, the ring, switching (§7.8) ---- */
const P_ = () => G.roster[G.persona];
S7.canPick = id => { const r = G.roster[id]; if (!r || r.frozen) return false; if (!r.unlocked && !CHEATS.allPersonas) return false; if (id === 'ansel' && G.area !== 'room7' && !CHEATS.allPersonas) return false; return true; };
function switchTo(id, instant) {
  if (id === G.persona || !S7.canPick(id)) return false;
  if (G.boss && G.boss.noSwitch) { S7.splash('NO TIME TO CHANGE.', 1); return false; }
  G.switchTo = id; G.mode = 'switch'; G.switchT = instant ? 0 : .45; G.aim.on = false; G.tuck = false;
  emit('switch', { from: G.persona, to: id });
  if (instant) finishSwitch();
  return true;
}
S7.switchTo = switchTo;
function finishSwitch() {
  const from = G.persona; G.last = from; G.persona = G.switchTo; G.switchTo = null; G.mode = 'play';
  G.aim.scope = false;
  emit('switched', { from, to: G.persona });
  bark(G.persona, 'in');
}

/* ---- Red, Rime, healing, the Wax Bench (§7.11) ---- */
const addRed = n => { G.red = clamp(G.red + n, 0, 999); if (n > 0) G.stats.red += n; };
const spendRed = n => { if (CHEATS.infRed) return true; if (G.red < n) return false; G.red -= n; return true; };
S7.addRed = addRed; S7.spendRed = spendRed;
const WAX = [3, 5, 8, 12, 16];
S7.WAX = WAX;
S7.waxCost = (id, stat) => { const lv = G.roster[id].stats[stat]; return lv >= 5 ? null : WAX[lv]; };
S7.wax = (id, stat) => { const c = S7.waxCost(id, stat); if (c === null || G.rime < c) return false; G.rime -= c; G.roster[id].stats[stat]++; emit('wax', { id, stat }); return true; };
function healStep(dt, I) {
  const r = P_();
  if (!I.heal || r.hp >= r.max || (G.red <= 0 && !CHEATS.infRed)) { G.healing = false; return; }
  const amt = Math.min(T.healRate * dt, r.max - r.hp, CHEATS.infRed ? 1e9 : G.red);
  r.hp += amt; if (!CHEATS.infRed) G.red -= amt; G.healing = true; emit('heal', { amount: amt });
}
/** the player is hurt (unless switching, in Room 7 or in god mode) */
function hurt(dmg, from) {
  if (CHEATS.god || G.mode === 'switch' || G.area === 'room7' || G.mode !== 'play' && G.mode !== 'ring') return;
  if (G.attract || G.echo) return;
  const r = P_(); dmg *= diff().dmg; r.hp = Math.max(0, r.hp - dmg);
  emit('hurt', { persona: G.persona, dmg, from });
  if (r.hp <= 0) freezeActive();
  else if (r.hp < r.max * .3 && !r.lowBark) { r.lowBark = true; bark(G.persona, 'low'); }
}
S7.hurt = hurt;

/* ---- freezing and the Sweep (§7.10) ---- */
function freezeActive() {
  const id = G.persona, r = G.roster[id], wk = G.walker;
  r.hp = 0; G.mode = 'frozen'; G.modeT = 0; G.aim.on = false;
  let p = heroPos(); const e0 = curEdge();
  if (W.area.statueAt && (G.aval || e0 && (e0.kind === 'ski' || e0.kind === 'jump' || e0.kind === 'lift'))) { const n = W.rails.nodes[W.area.statueAt]; p = { x: n.x + 24, y: n.y + 10, z: n.z }; }
  r.statue = { area: G.area, at: [p.x, p.y, p.z], edge: wk.edge, s: wk.s, node: wk.node, face: heroFacing() };
  G.stats.frozen++; emit('freeze', { persona: id, at: r.statue.at }); bark(id, 'frozen');
}
S7.freezeActive = freezeActive;
function afterFreeze() {
  const id = G.persona, r = G.roster[id];
  if (id === 'ansel') { G.mode = 'gameover'; G.gameoverT = 0; emit('gameover', {}); return; }
  r.frozen = true;
  G.persona = 'ansel'; G.last = id; const sw = G.roster.ansel; if (sw.hp <= 0) sw.hp = sw.max;
  const door = G.lastDoor[G.area], A = W.rails;
  const spawn = door && A.nodes[door] ? door : (W.area.sweepAt || W.area.start);
  placeAtNode(spawn); G.mode = 'play'; director.cut();
  emit('sweep', { statue: r.statue }); S7.splash('THE SWEEP', 1.6);
  if (!G.tips.rescue) { G.tips.rescue = true; S7.tip('rescue'); }
}
/** frozen statues in this area, nearest first */
const statuesHere = () => ORDER.filter(id => G.roster[id].frozen && G.roster[id].statue && G.roster[id].statue.area === G.area).map(id => ({ id, st: G.roster[id].statue }));
S7.statuesHere = statuesHere;
function rescueStep(dt, I) {
  const p = heroPos(); let near = null;
  for (const s of statuesHere()) if (Math.hypot(s.st.at[0] - p.x, s.st.at[1] - p.y) < 1.8 * M) near = s;
  G.nearStatue = near ? near.id : null;
  if (near && I.interactHeld) { G.statueHold += dt; if (G.statueHold >= 1.5) { const r = G.roster[near.id]; r.frozen = false; r.statue = null; r.hp = Math.round(r.max * .5); r.lowBark = false; G.statueHold = 0; emit('rescue', { persona: near.id }); bark(near.id, 'revived'); } }
  else G.statueHold = 0;
}

/* ---- talk: lines typed out with voices; the sim waits while a modal line is open ---- */
const TALK = { q: [], i: 0, shown: 0, open: false, choices: null, onChoice: null, onDone: null, sel: 0, t: 0 };
S7.TALK = TALK;
function say(lines, o = {}) {
  TALK.q = lines.map(l => Array.isArray(l) ? { who: l[0], text: l[1] } : l); TALK.i = 0; TALK.shown = 0; TALK.open = true; TALK.t = 0;
  TALK.choices = o.choices || null; TALK.onChoice = o.onChoice || null; TALK.onDone = o.onDone || null; TALK.sel = 0;
  if (G.mode === 'play' || G.mode === 'ring') { TALK.prevMode = 'play'; G.mode = 'talk'; G.aim.on = false; }
  emit('say', { who: TALK.q[0] && TALK.q[0].who });
}
S7.say = say;
function talkStep(dt, I) {
  const L = TALK.q[TALK.i]; if (!L) { closeTalk(); return; }
  TALK.t += dt;
  const full = L.text.length, cps = S7.game && S7.game.settings && S7.game.settings.textSpeed === 'Fast' ? 70 : 42;
  if (TALK.shown < full) TALK.shown = Math.min(full, TALK.shown + cps * dt);
  const last = TALK.i === TALK.q.length - 1;
  if (last && TALK.choices && TALK.shown >= full) {
    if (I.up || I.left) TALK.sel = (TALK.sel + TALK.choices.length - 1) % TALK.choices.length;
    if (I.down || I.right) TALK.sel = (TALK.sel + 1) % TALK.choices.length;
    if (I.pickChoice >= 0) { TALK.sel = I.pickChoice; I.confirm = true; }
  }
  if (I.confirm || I.interact || I.firePressed || I.cancel && !TALK.choices) {
    if (TALK.shown < full) TALK.shown = full;
    else if (!last) { TALK.i++; TALK.shown = 0; TALK.t = 0; emit('say', { who: TALK.q[TALK.i].who }); }
    else { const ch = TALK.choices, f = TALK.onChoice, sel = I.cancel && ch ? ch.length - 1 : TALK.sel; closeTalk(); if (ch && f) f(sel); }
  }
}
function closeTalk() {
  const d = TALK.onDone; TALK.open = false; TALK.q = []; TALK.choices = null; TALK.onChoice = null; TALK.onDone = null;
  if (G.mode === 'talk') G.mode = 'play';
  if (d) d();
}
/* barks: short lines that do not stop play */
const BARKS = [];
S7.BARKS = BARKS;
function bark(id, kind) {
  const P = S7.PERSONAS[id]; if (!P || !P.barks) return;
  const l = P.barks[kind]; if (!l) return; const text = Array.isArray(l) ? l[Math.floor(R('bark') * l.length)] : l;
  BARKS.push({ who: id, text, t: 2.4 }); if (BARKS.length > 2) BARKS.shift(); emit('bark', { who: id, text });
}
S7.bark = bark;
S7.barkLine = (who, text, t = 2.6) => { BARKS.push({ who, text, t }); if (BARKS.length > 2) BARKS.shift(); emit('bark', { who, text }); };

/* splashes and tips (HUD) */
const SPLASH = [];
S7.SPLASH = SPLASH;
S7.splash = (text, t = 1.2, o = {}) => { SPLASH.push(Object.assign({ text, t, t0: t }, o)); if (SPLASH.length > 3) SPLASH.shift(); };
const TIPS = { cur: null };
S7.TIPS = TIPS;
S7.tip = id => { if (G.attract || !S7.TIPDEFS[id]) return; if (G.tips['shown:' + id]) return; G.tips['shown:' + id] = true; TIPS.cur = { id, t: 0 }; emit('tutorial', { id }); };
S7.tipDone = id => { if (TIPS.cur && TIPS.cur.id === id) TIPS.cur = null; };

/* ---- beats: coroutines on game time (dialog, cameras, waits, spawns, cards) ---- */
const BEATS_RUN = [];
S7.BEATS_RUN = BEATS_RUN;
function runBeat(id, arg) {
  const f = S7.BEATS[id]; if (!f) throw new Error('unknown beat ' + id);
  const gen = f(BG, arg); BEATS_RUN.push({ id, gen, wait: null }); emit('beat', { id });
  stepBeat(BEATS_RUN[BEATS_RUN.length - 1], 0);
}
S7.runBeat = runBeat;
function stepBeat(b, dt) {
  for (let guard = 0; guard < 50; guard++) {
    const w = b.wait;
    if (w !== null) {
      if (typeof w === 'number') { b.wait -= dt; if (b.wait > 0) return; dt = 0; }
      else if (typeof w === 'function') { if (!w()) return; }
    }
    const r = b.gen.next(); b.wait = null;
    if (r.done) { b.done = true; return; }
    const v = r.value;
    if (typeof v === 'number' || typeof v === 'function') b.wait = v;
    else if (v === undefined) { b.wait = 0.0001; return; }
  }
}
function beatsStep(dt) { for (const b of BEATS_RUN.slice()) { stepBeat(b, dt); if (b.done) BEATS_RUN.splice(BEATS_RUN.indexOf(b), 1); } }
/* the beat toolkit: yield BG.say(...) etc. */
const BG = {
  say(lines, o) { say(lines, o); return () => !TALK.open; },
  card(title, sub, t = 2.6, o = {}) { G.card = Object.assign({ title, sub, t, t0: t }, o); G.mode = G.mode === 'talk' ? 'talk' : 'card'; emit('card', { title }); return () => !G.card; },
  cam(shot, t) { director.override = normShot(Object.assign({ s: [0, 1] }, shot)); director.overT = t; director.cut(); },
  camOff() { director.override = null; director.cut(); },
  cut(on) { G.cut = on; if (on) G.aim.on = false; },
  wait: s => s,
  until: f => f,
  flag: (f, v) => setFlag(f, v),
  wave: id => startWave(id),
  clear: () => () => !aliveEnemies().length,
  give: (item, n) => giveItem(item, n),
  splash: (t, s) => S7.splash(t, s),
  emit: (t, d) => emit(t, d),
  G: () => G
};
S7.BG = BG;

/* ---- items, pins, the Dossier (§7.12) ---- */
function giveItem(id, n = 1) {
  const it = S7.ITEMS[id]; if (!it) throw new Error('unknown item ' + id);
  if (it.kind === 'pin') { if (!G.pins.includes(id)) G.pins.push(id); }
  else if (it.kind === 'doc') { if (!G.dossier.includes(id)) G.dossier.push(id); }
  else if (it.kind === 'exposure') { if (!G.exposures.includes(id)) G.exposures.push(id); }
  else if (it.kind === 'rime') { G.rime += n; }
  else if (it.kind === 'red') { addRed(n); }
  else G.items[id] = (G.items[id] || 0) + n;
  emit('pickup', { kind: id, amount: n }); return true;
}
S7.giveItem = giveItem;

/* ---- spots: interactables and pickups ---- */
const spotDone = s => !!G.spots[key(s.id)];
const markSpot = s => { G.spots[key(s.id)] = true; };
S7.spotDone = spotDone;
function nearSpot() {
  const p = heroPos(); let best = null, bd = 1e9;
  for (const s of W.spots) {
    if (s.kind === 'pickup' || s.kind === 'lookout' || s.kind === 'exposure') continue;
    if (s.hidden && !flag(s.hidden)) continue;
    if (s.when && !flag(s.when)) continue;
    if (s.once && spotDone(s)) continue;
    if (s.kind === 'gate' && gateOpen(s.gate)) continue;
    const d = Math.hypot(s.pos[0] - p.x, s.pos[1] - p.y);
    if (d < (s.r || 2.2) * M && Math.abs(s.pos[2] - p.z) < 3 * M && d < bd) { bd = d; best = s; }
  }
  return best;
}
S7.nearSpot = nearSpot;
function interact(s) {
  if (!s) return;
  emit('interact', { id: s.id, kind: s.kind });
  if (s.kind === 'gate') return gateInteract(s.gate);
  if (s.kind === 'room7') return enterRoom7(s);
  if (s.kind === 'npc' && s.who === 'murmel') return murmel(s);
  if (s.kind === 'phone') { markSpot(s); return runBeat(s.beat); }
  if (s.kind === 'codelock') return emit('open', { screen: 'codelock', spot: s.id, code: s.code });
  if (s.kind === 'lift') { const e = W.rails.byId[s.lift]; G.walker.node = s.node; if (e) takeEdge(e); return; }
  if (s.kind === 'r7') return room7Use(s);
  if (s.kind === 'exit') return tryExit(W.rails.nodes[s.node]);
  if (s.beat) { if (s.once) markSpot(s); return runBeat(s.beat, s); }
  if (s.lines) { const L = typeof s.lines === 'string' ? S7.LINES[s.lines] : s.lines; if (s.once) markSpot(s); return say(L.map(l => Array.isArray(l) ? l : [s.who || G.persona, l])); }
}
S7.interact = interact;
function pickupsStep() {
  const p = heroPos();
  for (const s of W.spots) {
    if (s.kind !== 'pickup' || spotDone(s)) continue;
    if (s.hidden && !flag(s.hidden)) continue;
    if (Math.hypot(s.pos[0] - p.x, s.pos[1] - p.y) < (s.r || 1.4) * M && Math.abs(s.pos[2] - p.z) < 3 * M) {
      markSpot(s); giveItem(s.item, s.n || 1);
      const it = S7.ITEMS[s.item]; S7.splash(it.kind === 'red' ? 'RED +' + (s.n || 1) : it.kind === 'rime' ? 'RIME +' + (s.n || 1) : it.name.toUpperCase(), 1.4, { small: it.kind === 'red' || it.kind === 'rime' });
      if (it.kind === 'pin' || it.kind === 'doc' || it.kind === 'key') S7.barkLine(G.persona, it.kind === 'pin' ? 'A lift pin. ' + it.slogan : it.kind === 'doc' ? 'Paperwork. Read it later.' : 'That will open something.');
    }
  }
}

/* ---- Murmel's hints (§7.14) ---- */
function murmel(s) {
  const first = !G.flags.murmelMet;
  if (first) { setFlag('murmelMet'); markSpot(s); return say(S7.LINES.murmel_first.map(l => ['murmel', l])); }
  const free = G.persona === 'rurik', cost = free ? 0 : 10;
  say([['murmel', free ? 'For you... it is on the house... Means recognise means...' : 'A hint... is ten Red... Gratuity... is customary...']], {
    choices: [free ? 'BUY A HINT (FREE)' : 'BUY A HINT (10 RED)', 'LEAVE'],
    onChoice: i => {
      if (i !== 0) return say([['murmel', 'Mind the gap... between floors...']]);
      if (cost && !spendRed(cost)) return say([['murmel', 'No Red... no hint... The mountain does not do credit...']]);
      G.hints++; G.stats.hints++; say([['murmel', S7.hintFor()]]);
    }
  });
}
S7.hintFor = () => { const o = S7.objectiveId(); const H = S7.LINES.hints; return (H[o] || S7.LINES.hint_fallback[0]); };

/* ---- Room 7 (§7.16) ---- */
function enterRoom7(s) {
  if (nearEnemies(40).length) { refuse('The door won\'t open while someone is laughing.'); return; }
  G.lastDoor[G.area] = s.node; G.r7from = { area: G.area, node: s.node };
  S7.flurry && S7.flurry(); emit('room7', { in: true });
  enterArea('room7', 'door', { noAutosave: true });
  thawLeftBehind(s && G.r7from ? G.r7from.area : null);
  S7.autosave && S7.autosave('room7');
  if (!G.tips.room7) { G.tips.room7 = true; S7.tip('room7'); }
}
S7.enterRoom7 = enterRoom7;
/** the featherbed thaws the family left frozen in other places (at a quarter of their strength) */
function thawLeftBehind(here) {
  for (const id of ORDER) { const r = G.roster[id]; if (r.frozen && r.statue && r.statue.area !== here) { r.frozen = false; r.statue = null; r.hp = Math.round(r.max * .25); emit('rescue', { persona: id, bed: true }); S7.barkLine('rosalind', 'Rosalind wrapped ' + S7.PERSONAS[id].name.split(' ')[0] + ' in the featherbed. Thawed. Barely.', 3); } }
}
S7.thawLeftBehind = thawLeftBehind;
function leaveRoom7() {
  const f = G.r7from || { area: '00A', node: 'r7' };
  S7.flurry && S7.flurry(); emit('room7', { in: false });
  if (G.persona === 'ansel' && !G.flags.sweepKeep && statuesHere().length === 0) { /* the Sweep can stay out if picked */ }
  enterArea(f.area, f.node, { noAutosave: true });
}
S7.leaveRoom7 = leaveRoom7;
function room7Use(s) {
  if (s.use === 'door') return leaveRoom7();
  if (s.use === 'clock') return emit('open', { screen: 'save' });
  if (s.use === 'bench') return emit('open', { screen: 'waxbench' });
  if (s.use === 'wardrobe') return emit('open', { screen: 'wardrobe' });
  if (s.use === 'bed') { const L = S7.LINES.holle_bed, i = (G.flags.holleI || 0) % L.length; G.flags.holleI = (G.flags.holleI || 0) + 1; return say([['holle', L[i]]]); }
  if (s.use === 'rosalind') return say([['rosalind', S7.rosalindLine()]]);
  if (s.use === 'window') { const n = G.pins.length; return say([[G.persona, 'Snow. It never stops here.'], ['rosalind', 'Lift pins in your pocket: ' + n + ' of 7. The window counts them too.']]); }
  if (s.use === 'phone') return runBeat(G.target >= 1 ? 'briefing_replay1' : 'briefing_replay0');
}
S7.wardrobePick = id => { if (!G.roster[id].unlocked && !CHEATS.allPersonas) return false; if (G.roster[id].frozen) return false; if (id === G.persona) return true; G.last = G.persona; G.persona = id; emit('switched', { from: G.last, to: id }); bark(id, 'in'); return true; };

/* ---- objectives (one line from the story flags) ---- */
S7.objectiveId = () => {
  const f = G.flags, it = G.items;
  if (G.target === 0) {
    if (!f.ropePaid && !G.gates['00A:rope']) return 'rope';
    if (!it.servicekey) return 'key';
    if (!f.bellRung) return 'bell';
    if (!f.gapJumped) return 'gap';
    return 'grau';
  }
  if (!f.liftClear) return 'bell1';
  const ed = it.edelweiss || 0;
  if (ed < 3) {
    if (!f.mirrors && !f.band) return 'mirrors';
    if (!f.exposure1 && !it.ember) return 'press';
    if (!f.patrol) return 'patrol';
    if (!f.cornice) return 'cornice';
    return 'gate';
  }
  if (!f.gondolaDone) return 'gate';
  if (!f.crystals) return 'crystals';
  if (!f.ledger) return 'ledger';
  if (!f.seracs) return 'seracs';
  return 'hansi';
};
S7.objective = () => (S7.LINES.objectives[S7.objectiveId()] || '');
S7.rosalindLine = () => (S7.LINES.rosalind_obj[S7.objectiveId()] || 'Go on. The snow is waiting.');

/* ---- the main step (§5.4 order) ---- */
const director = new Director();
S7.director = director;
Director.prototype.cut = function () { this.shotKey = null; this.lagP = null; this.cuts++; };
function aiming() { return !!(G && G.aim.on); }
S7.sim = { aiming };
function canAim() {
  if (G.mode !== 'play' || G.cut || G.area === 'room7') return false;
  const wk = G.walker, e = curEdge();
  if (wk.turnT > 0 || wk.air > 0 && e && e.kind === 'jump') return false;
  if (!e || wk.node) return true;
  if (e.kind === 'lift' || e.aimOnTheMove) return true;
  if (e.kind === 'ski') return wk.skiStop && wk.v === 0 || !!(G.boss && G.boss.aimOnTheMove);
  return true;
}
S7.canAim = canAim;

function simUpdate(dt, I) {
  if (!G || !W.area) return;
  G.time += dt; G.modeT += dt;
  if (G.area !== 'room7' && G.mode !== 'gameover') { G.playtime += dt; G.stats.time += dt; }
  for (const b of BARKS) b.t -= dt; while (BARKS.length && BARKS[0].t <= 0) BARKS.shift();
  for (const s of SPLASH) s.t -= dt; while (SPLASH.length && SPLASH[0].t <= 0) SPLASH.shift();
  if (TIPS.cur) TIPS.cur.t += dt;
  G.letterbox = approach(G.letterbox, G.cut ? 1 : 0, dt * 4);
  if (G.card) { G.card.t -= dt; const ct = G.card; if (ct.t <= 0 || ct.t < ct.t0 - .8 && (I.confirm || I.firePressed || I.cancel)) { G.card = null; if (G.mode === 'card') G.mode = 'play'; } }
  // modes
  if (G.mode === 'talk') { talkStep(dt, I); beatsStep(dt); S7.cameraStep(dt); return; }
  if (G.mode === 'card') { beatsStep(dt); S7.cameraStep(dt); return; }
  if (G.mode === 'switch') { G.switchT -= dt; if (G.switchT <= 0) finishSwitch(); S7.combatStep(dt, I, true); S7.cameraStep(dt); return; }
  if (G.mode === 'frozen') { if (G.modeT >= 1.2) afterFreeze(); S7.combatStep(dt, I, true); S7.cameraStep(dt); return; }
  if (G.mode === 'gameover') { G.gameoverT += dt; return; }
  if (G.mode === 'results' || G.mode === 'end') { beatsStep(dt); return; }
  // the ring (time slows: the scene sets game.timeScale)
  if (G.mode === 'ring') {
    if (I.pick) { const id = ORDER[I.pick - 1]; G.ringSel = id; }
    if (I.ringSel) G.ringSel = I.ringSel;
    if (Math.hypot(I.stick[0], I.stick[1]) > .5) { const a = Math.atan2(I.stick[1], I.stick[0]), k = Math.round(((a + Math.PI / 2) / TAU) * 7 + 7) % 7; G.ringSel = ORDER[k]; }
    if (!I.ring) { G.mode = 'play'; if (G.ringSel && G.ringSel !== G.persona) switchTo(G.ringSel); else if (G.modeT < .22 && G.last && S7.canPick(G.last)) switchTo(G.last); G.ringSel = null; }
    S7.combatStep(dt, I, true); S7.cameraStep(dt); return;
  }
  // play
  const wk = G.walker;
  if (G.boss && G.boss.forceAim) { I.aim = true; I.scan = false; I.skill = false; I.ringPressed = false; I.pick = 0; }
  if (!G.cut) {
    if (I.pick && !G.aim.on && G.area !== 'room7') { const id = ORDER[I.pick - 1]; if (id !== G.persona) { if (S7.canPick(id)) switchTo(id); else S7.splash(G.roster[id].frozen ? 'FROZEN.' : id === 'ansel' ? 'ROOM 7 ONLY.' : 'NOT YET.', 1); } }
    if (I.ringPressed && !G.aim.on && G.area !== 'room7' && !(G.boss && G.boss.noSwitch)) { G.mode = 'ring'; G.modeT = 0; G.ringSel = null; emit('ring', {}); S7.tipDone('ring'); }
    const wantAim = I.aim && canAim();
    if (wantAim !== G.aim.on) {
      G.aim.on = wantAim;
      if (wantAim) { const f = heroFacing(); G.aim.yaw = G.aim.keepYaw !== undefined && G.boss ? G.aim.keepYaw : f; G.aim.pitch = 0; G.aim.scope = false; emit('aim', { on: true }); S7.tipDone('aim'); if (G.walker.v && curEdge() && curEdge().kind === 'walk') G.walker.v = 0; }
      else { emit('aim', { on: false }); G.aim.scope = false; S7.collectDrops && S7.collectDrops(); }
    }
    if (!G.aim.on || (curEdge() && (curEdge().kind === 'lift' || curEdge().aimOnTheMove || curEdge().kind === 'ski' && !wk.skiStop))) {
      const pb = G.aim.on ? Object.assign({}, I, { turn: false, move: curEdge() && curEdge().kind === 'ski' ? I.move : false }) : I;
      if (!G.boss || !G.boss.lockWalker) walkerStep(dt, pb);
    }
    if (I.move && !G.aim.on) S7.tipDone('walk');
    if (!G.aim.on) healStep(dt, I); else G.healing = false;
    // interact
    const ns = G.aim.on ? null : nearSpot(); G.near = ns;
    if (G.persona === 'ansel' || statuesHere().length) rescueStep(dt, I);
    if (I.interact && !G.aim.on) { if (I.interactId) interact(W.spots.find(s => s.id === I.interactId)); else if (ns && !G.nearStatue) interact(ns); }
    pickupsStep();
  }
  S7.skillsStep(dt, I);
  S7.combatStep(dt, I, false);
  S7.bossStep && S7.bossStep(dt, I);
  beatsStep(dt);
  if (director.overT !== undefined && director.override) { director.overT -= dt; if (director.overT <= 0) { director.override = null; director.overT = undefined; director.cut(); } }
  S7.cameraStep(dt);
  if (S7.echoStep) S7.echoStep(dt, I);
}
S7.simUpdate = simUpdate;

/** each step: the director's pose (the shot covering the walker, or the eye while aiming, or a beat's override) */
S7.cameraStep = dt => {
  const d = director, wk = G.walker, e = curEdge(), H = heroPos(), f = heroFacing();
  d.t = (d.t || 0) + dt;
  G.aim.k = approach(G.aim.k, G.aim.on ? 1 : 0, dt / .15);
  let pose;
  if (d.override) pose = d.poseOf(d.override, [H.x, H.y, H.z], f, W.grid, null, 0, 1);
  else if (e) {
    const [sh, i] = d.shotFor(e, wk.s, wk.dir), k = e.id + ':' + (wk.dir < 0 ? 'r' : 'f') + i;
    if (k !== d.shotKey) { if (d.shotKey !== null && !sh.blend) d.cuts++; d.shotKey = k; d.lagP = null; d.blend = sh.blend ? { from: Object.assign({}, d.pose), t: 0, dur: sh.blend } : null; }
    pose = d.poseOf(sh, [H.x, H.y, H.z], f, W.grid, e, wk.s, wk.dir);
    if (sh.shot === 'follow' && sh.lag) { if (!d.lagP) d.lagP = [pose.x, pose.y, pose.z]; const a = 1 - Math.exp(-dt / sh.lag); d.lagP = [lerp(d.lagP[0], pose.x, a), lerp(d.lagP[1], pose.y, a), lerp(d.lagP[2], pose.z, a)]; const look = V.add([pose.x, pose.y, pose.z], V.dir(pose.yaw, pose.pitch), 64); pose.x = d.lagP[0]; pose.y = d.lagP[1]; pose.z = d.lagP[2]; const dx = look[0] - pose.x, dy = look[1] - pose.y, dz = look[2] - pose.z; pose.yaw = Math.atan2(dy, dx); pose.pitch = Math.atan2(dz, Math.hypot(dx, dy)); }
    if (d.blend) { d.blend.t += dt; const u = E.ease.inOutSine(clamp(d.blend.t / d.blend.dur, 0, 1)), A = d.blend.from; pose = { x: lerp(A.x, pose.x, u), y: lerp(A.y, pose.y, u), z: lerp(A.z, pose.z, u), yaw: A.yaw + angDiff(A.yaw, pose.yaw) * u, pitch: lerp(A.pitch, pose.pitch, u), roll: 0, fov: lerp(A.fov, pose.fov, u) }; if (u >= 1) d.blend = null; }
  } else pose = { x: H.x - 40, y: H.y - 40, z: H.z + 40, yaw: Math.PI / 4, pitch: -.5, roll: 0, fov: 55 };
  if (G.aim.k > 0) {
    const eye = S7.eye(), a = G.aim, sway = a.sway || 0, fov = a.scope ? 18 : (W.area.world && W.area.world.overlay && W.area.world.overlay.fov) || 62;
    const ep = { x: eye[0], y: eye[1], z: eye[2], yaw: a.yaw + (a.swayY || 0), pitch: a.pitch + a.recoil * Math.PI / 180 + (a.swayP || 0), roll: 0, fov };
    const u = E.ease.inOutSine(G.aim.k);
    pose = u >= 1 ? ep : { x: lerp(pose.x, ep.x, u), y: lerp(pose.y, ep.y, u), z: lerp(pose.z, ep.z, u), yaw: pose.yaw + angDiff(pose.yaw, ep.yaw) * u, pitch: lerp(pose.pitch, ep.pitch, u), roll: 0, fov: lerp(pose.fov, ep.fov, u) };
    void sway;
  }
  d.pose = pose; G.cam = pose;
};
S7.eye = () => { const H = heroPos(); return [H.x, H.y, H.z + 1.6 * M]; };

/* ---- triggers and waves ---- */
function fireTrigger(t) {
  if (G.echo) return;
  if (t.once !== false && G.flags['trig:' + key(t.id)]) return;
  if (t.when && !flag(t.when)) return;
  if (t.unless && flag(t.unless)) return;
  G.flags['trig:' + key(t.id)] = true;
  if (t.beat) runBeat(t.beat);
  if (t.wave) startWave(t.wave);
  if (t.tip) S7.tip(t.tip);
  if (t.flag) setFlag(t.flag);
}
S7.fireTrigger = fireTrigger;
function startWave(id) {
  const k = key(id); if (G.waves[k]) return;
  const w = (W.area.waves || {})[id]; if (!w) throw new Error(W.area.id + ': unknown wave ' + id);
  G.waves[k] = 'active';
  const list = w.spawn.map(([type, sp, delay]) => ({ type, sp, at: (delay || 0) / T.spawnRate }));
  G.pending = (G.pending || []).concat(list.map(x => Object.assign(x, { wave: k, t: 0 })));
  emit('wave', { id });
}
S7.startWave = startWave;
const aliveEnemies = () => G.enemies.filter(e => e.alive && !e.ambient);
const nearEnemies = m => { const H = heroPos(); return aliveEnemies().filter(e => Math.hypot(e.x - H.x, e.y - H.y) < m * M); };
S7.nearEnemies = nearEnemies;
S7.aliveEnemies = aliveEnemies;
function wavesStep(dt) {
  if (G.pending && G.pending.length) {
    for (const p of G.pending) p.t += dt;
    const alive = aliveEnemies().length;
    let room = 10 - alive;
    G.pending = G.pending.filter(p => { if (p.t < p.at || room <= 0) return true; room--; const sp = (W.area.spawns || {})[p.sp]; if (!sp) throw new Error(W.area.id + ': unknown spawn ' + p.sp); const wd = W.area.waves[p.wave.slice(G.area.length + 1)] || {}, Hp = heroPos(); let sx = sp[0] * M, sy = sp[1] * M; const dd = Math.hypot(sx - Hp.x, sy - Hp.y); if (dd < 7 * M && !wd.close) { const k = 7 * M / Math.max(1, dd), nx = Hp.x + (sx - Hp.x) * k, ny = Hp.y + (sy - Hp.y) * k; if (W.grid.walkable(Math.floor(nx / M), Math.floor(ny / M))) { sx = nx; sy = ny; } } S7.spawnEnemy(p.type, sx, sy, sp[2] !== undefined ? W.grid.floor(sp[0] * M, sp[1] * M) + sp[2] * M : undefined, { wave: p.wave, part: wd.part, revealed: wd.revealed }); return false; });
  }
  for (const k in G.waves) if (G.waves[k] === 'active' && k.startsWith(G.area + ':') && !(G.pending || []).some(p => p.wave === k) && !G.enemies.some(e => e.alive && e.wave === k)) {
    G.waves[k] = 'done'; const id = k.slice(G.area.length + 1); setFlag('wave:' + k); emit('waveDone', { id });
    const w = W.area.waves[id]; if (w && w.then) runBeat(w.then);
  }
}
S7.wavesStep = wavesStep;

/* ---- saves (§7.17) ---- */
function serialize() {
  const r = {}; for (const id of ORDER) { const x = G.roster[id]; r[id] = { hp: Math.round(x.hp * 100) / 100, max: x.max, stats: Object.assign({}, x.stats), frozen: x.frozen, statue: x.statue, unlocked: x.unlocked }; }
  return JSON.parse(JSON.stringify({ v: 1, area: G.area, node: G.walker.node || G.walker.lastNode, r7from: G.r7from, persona: G.persona, last: G.last, roster: r, red: Math.round(G.red), rime: G.rime, items: G.items, pins: G.pins, dossier: G.dossier, exposures: G.exposures,
    gates: G.gates, waves: Object.fromEntries(Object.entries(G.waves).filter(([, v]) => v === 'done')), spots: G.spots, flags: Object.fromEntries(Object.entries(G.flags).filter(([k]) => !k.startsWith('trig:') || true)), visited: G.visited, seen: G.seen, tips: G.tips,
    lastDoor: G.lastDoor, results: G.results, target: G.target, playtime: Math.round(G.playtime * 10) / 10, difficulty: G.difficulty, stats: G.stats, hints: G.hints, seed: G.seed }));
}
S7.serialize = serialize;
function migrate(d, from) { if (!d || typeof d !== 'object') return null; if (from === undefined || from < 1) { if (!d.area) return null; d.v = 1; } return d; }
S7.migrate = migrate;
function deserialize(d) {
  d = migrate(d, d && d.v); if (!d) throw new Error('This save cannot be read.');
  G = S7.G = newState({ seed: d.seed, difficulty: d.difficulty });
  for (const k of ['persona', 'last', 'red', 'rime', 'items', 'pins', 'dossier', 'exposures', 'gates', 'waves', 'spots', 'flags', 'visited', 'seen', 'tips', 'lastDoor', 'results', 'target', 'playtime', 'stats', 'hints', 'r7from']) if (d[k] !== undefined) G[k] = JSON.parse(JSON.stringify(d[k]));
  for (const id of ORDER) if (d.roster && d.roster[id]) Object.assign(G.roster[id], JSON.parse(JSON.stringify(d.roster[id])));
  enterArea(d.area, d.node, { noAutosave: true, silent: true });
  return G;
}
S7.deserialize = deserialize;
S7.newGame = (o = {}) => { G = S7.G = newState(o); BEATS_RUN.length = 0; BARKS.length = 0; SPLASH.length = 0; TALK.open = false; TIPS.cur = null; return G; };

/* ---- the code lock (§7.13): four dials; the right date opens it ---- */
S7.codeOpen = (spotId, code) => {
  const s = W.spots.find(x => x.id === spotId); if (!s || spotDone(s)) return false;
  if (String(code) !== String(s.code)) { emit('codeWrong', {}); S7.splash('CLICK. CLICK. NOTHING.', 1.2); return false; }
  markSpot(s); emit('codeRight', {}); S7.splash('THE SAFE OPENS.', 1.4); runBeat('safe_open'); return true;
};

/* ==== src/30-combat.js ==== */
/* SKILLER7 — combat: aiming, the seven weapons, skills, the Whiteouts (behaviours, warm spots, tells), the scan,
 * projectiles, drops, contact explosions. One damage pipeline for everything (§7.4–7.9). */
const DEG = Math.PI / 180;
const WARM_PARTS = { head: [.06, 0, 1.56], chest: [.2, 0, 1.22], belly: [.22, 0, .96], knee: [.14, .12, .46], hand: [.3, .34, .92], back: [-.24, 0, 1.18] };
S7.WARM_PARTS = WARM_PARTS;
const wstate = id => G.wpn[id] || (G.wpn[id] = { mag: S7.WEAPONS[S7.PERSONAS[id].weapon].mag, reloadT: 0, cool: 0, heat: 0, overT: 0, alt: 0, flash: 0 });
S7.wstate = wstate;
const stats = () => G.roster[G.persona].stats;
const warmR = (crit = stats().crit) => 5 * (1 + .1 * crit) * T.warmRadius * (G.persona === 'mireille' ? 1.25 : 1);

/* ---- enemies ---- */
function spawnEnemy(type, x, y, z, o = {}) {
  const D = S7.ENEMIES[type]; if (!D) throw new Error('unknown enemy ' + type);
  const parts = D.warm || ['head', 'chest', 'belly', 'knee', 'hand'];
  const e = {
    id: G.nextId++, type, x, y, z: z ?? W.grid.floor(x, y), hp: (o.hp || D.hp) * T.enemyHP, size: (o.size || D.size || 1) * (1 + RR('spawn', -.08, .08)),
    facing: 0, speed: RR('spawn', D.speed[0], D.speed[1]), revealed: o.revealed || 0, vis: 0, alive: true, dying: 0, t: 0, laughT: RR('laugh', .4, 2.4),
    style: D.laugh || ['giggle', 'cackle', 'chuckle', 'wheeze'][Math.floor(R('laugh') * 4)], pitch: RR('laugh', -3, 3), giggle: -1, stun: 0, kneel: 0, burn: 0,
    wave: o.wave || null, part: o.part || parts[Math.floor(R('spawn') * parts.length)], tint: Math.floor(R('spawn') * 5), phase: R('spawn') * TAU,
    ai: D.ai, small: !!o.small, ambient: !!o.ambient, spots: D.spots ? D.spots.slice() : null, budT: 2, throwT: RR('spawn', .8, 2.4), turnT: 3.5, back: 0, blinkT: 2.5, life: 0, mark: 0
  };
  e.max = e.hp;
  if (o.facing !== undefined) e.facing = o.facing; else { const H = heroPos(); e.facing = Math.atan2(H.y - y, H.x - x); }
  if (D.ai === 'inspector') { e.marks = (o.marks || []).map(m => [m[0] * M, m[1] * M]); }
  if (o.on) e.on = o.on;
  G.enemies.push(e); emit('spawn', { enemy: e });
  return e;
}
S7.spawnEnemy = spawnEnemy;
/** a warm spot's world point */
function warmPos(e, part = e.part) {
  const P = WARM_PARTS[part] || WARM_PARTS.chest, s = e.size * M, c = Math.cos(e.facing), sn = Math.sin(e.facing);
  let f = P[0], r = P[1];
  if (e.ai === 'twins') { const a = e.t * .9; f = Math.cos(a) * .3; r = Math.sin(a) * .3; }
  return [e.x + (c * f - sn * r) * s, e.y + (sn * f + c * r) * s, e.z + P[2] * s];
}
S7.warmPos = warmPos;
const bloomSpots = e => e.spots.map((p, i) => ({ i, pos: [e.x + Math.cos(e.facing + (i - 1) * .9) * .45 * e.size * M, e.y + Math.sin(e.facing + (i - 1) * .9) * .45 * e.size * M, e.z + (1.1 + (i % 2) * .35) * e.size * M], part: p }));
S7.bloomSpots = bloomSpots;
const heroTarget = () => { const H = heroPos(); return [H.x, H.y, H.z]; };

function enemiesStep(dt, frozen) {
  const H = heroTarget(), D2 = diff(), spd = T.enemySpeed * D2.speed;
  for (const e of G.enemies) {
    if (!e.alive) { e.dying += dt; continue; }
    e.t += dt; e.revealed = Math.max(0, e.revealed - dt); e.mark = Math.max(0, e.mark - dt);
    const shown = e.revealed > 0 || G.revealAll > 0 || CHEATS.revealAll || e.mark > 0;
    e.vis = approach(e.vis, shown ? 1 : 0, dt / (shown ? .25 : .4));
    if (e.burn > 0) { e.burn -= dt; damageEnemy(e, 5 * dt, 'burn'); if (!e.alive) continue; }
    const dx = H[0] - e.x, dy = H[1] - e.y, d = Math.hypot(dx, dy), dz = H[2] - e.z;
    // laughter: quicker and louder as they near
    e.laughT -= dt;
    if (e.laughT <= 0 && !e.ambient) { const near = clamp(1 - d / (40 * M), 0, 1); e.laughT = lerp(4.2, 1.1, near) * RR('laugh', .8, 1.25); emit('laugh', { enemy: e, style: e.style, at: [e.x, e.y, e.z + 1.5 * e.size * M], loud: near, d }); }
    if (frozen || e.on && !flag(e.on)) continue;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.kneel > 0) { e.kneel -= dt; continue; }
    if (e.giggle >= 0) { e.giggle += dt; if (e.giggle >= .35) explodeEnemy(e); continue; }
    const D = S7.ENEMIES[e.type];
    if (e.track) {   // riding a rail: the gondola's cable (crawlers), the down cabins, the windows
      const tr = e.track, te = W.rails.byId[tr.edge], ws = G.walker.s;
      if (tr.ride) tr.s = ws + (tr.s0 === undefined ? (tr.s0 = tr.s - ws) : tr.s0);
      else if (tr.pass) tr.s += tr.speed * dt; else tr.s = approach(tr.s, ws, Math.abs(tr.speed) * dt);
      if (tr.pass && (tr.s < -200 || tr.s > te.len + 200)) { e.alive = false; e.dying = 9; continue; }
      const p = edgePos(W.rails, te, clamp(tr.s, 0, te.len)), a = p.angle + Math.PI / 2; e.x = p.x + Math.cos(a) * (tr.dy || 0); e.y = p.y + Math.sin(a) * (tr.dy || 0); e.z = p.z + (tr.dz || 0) * M; e.flyZ = e.z;
      e.facing = Math.atan2(H[1] - e.y, H[0] - e.x);
      if (e.ai === 'thrower') { e.throwT -= dt; if (e.throwT <= 0 && d < 60 * M) { e.throwT = 1.6; throwAt(e, H, 'snowball'); } continue; }
      if (D.contact && Math.hypot(H[0] - e.x, H[1] - e.y) < 2 * M && Math.abs(H[2] - e.z) < 3.4 * M) { e.giggle = 0; emit('giggleup', { enemy: e }); }
      continue;
    }
    // contact: within 1.5 m they giggle up, then burst
    if (D.contact && d < 1.5 * M * Math.max(1, e.size * .8) && Math.abs(dz) < 2 * M && G.mode !== 'switch' && G.area !== 'room7') { e.giggle = 0; emit('giggleup', { enemy: e }); continue; }
    let vx = 0, vy = 0, sp = e.speed * spd;
    const face = Math.atan2(dy, dx);
    switch (e.ai) {
      case 'thrower': {
        e.facing = face; e.throwT -= dt;
        if (e.throwT <= 0 && d < 60 * M && d > 6 * M && W.grid.los([e.x, e.y, e.z + 1.6 * M], [H[0], H[1], H[2] + 1.2 * M])) { e.throwT = 2.6; throwAt(e, H, D.projectile || 'snowball'); }
        break;
      }
      case 'inspector': {
        e.blinkT -= dt; e.life += dt; e.facing = face;
        if (e.blinkT <= 0 && e.marks && e.marks.length) { e.blinkT = 2.5; const m = e.marks[Math.floor(R('spawn') * e.marks.length)]; emit('blink', { enemy: e, from: [e.x, e.y, e.z] }); e.x = m[0]; e.y = m[1]; e.z = W.grid.floor(e.x, e.y); }
        if (e.life > 25) { e.alive = false; e.vanished = true; emit('vanish', { enemy: e }); G.flags.inspectorGone = (G.flags.inspectorGone || 0) + 1; }
        break;
      }
      case 'plow': {
        e.turnT -= dt;
        if (e.back > 0) { e.back -= dt; e.facing = approach(e.facing, face + Math.PI, dt * 10); if (e.back <= 0) e.turnT = 3.5; break; }
        if (e.turnT <= 0) { e.back = 1.2; emit('laugh', { enemy: e, style: 'cackle', at: [e.x, e.y, e.z + 24], loud: 1, d }); break; }
        e.facing = face; [vx, vy] = moveDir(e, H); vx *= sp; vy *= sp; break;
      }
      case 'sled': { e.facing = face; vx = Math.cos(face) * sp; vy = Math.sin(face) * sp; break; }
      case 'runner': { e.facing = face; const [mx, my] = moveDir(e, H), zz = Math.sin(e.t * .8 * TAU + e.phase) * 1.2; vx = (mx + -my * zz) * sp; vy = (my + mx * zz) * sp; break; }
      case 'bloom': {
        e.facing = face; [vx, vy] = moveDir(e, H); vx *= sp; vy *= sp; e.budT -= dt;
        if (e.budT <= 0 && aliveEnemies().length < 10) { e.budT = 4; spawnEnemy('giggler', e.x + Math.cos(face + 1.6) * 20, e.y + Math.sin(face + 1.6) * 20, undefined, { wave: e.wave, revealed: 2 }); }
        break;
      }
      case 'dancer': { e.facing = face + Math.sin(e.t * 3) * .8; const [mx, my] = moveDir(e, H), sw = Math.sin(e.t * 2.4 + e.phase); vx = (mx * .7 - my * sw) * sp; vy = (my * .7 + mx * sw) * sp; break; }
      case 'static': break;
      default: { e.facing = face; const [mx, my] = moveDir(e, H), sw = Math.sin(e.t * 1.7 + e.phase) * .35; vx = (mx - my * sw) * sp; vy = (my + mx * sw) * sp; }
    }
    if (vx || vy) {
      // keep a metre apart
      for (const o of G.enemies) if (o !== e && o.alive) { const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy); if (od < 16 && od > .01) { vx += ox / od * 40; vy += oy / od * 40; } }
      const nx = e.x + vx * dt, ny = e.y + vy * dt;
      if (W.grid.terrain || W.grid.walkable(Math.floor(nx / M), Math.floor(ny / M))) { e.x = nx; e.y = ny; }
      else if (W.grid.walkable(Math.floor(nx / M), Math.floor(e.y / M))) e.x = nx; else if (W.grid.walkable(Math.floor(e.x / M), Math.floor(ny / M))) e.y = ny;
      e.z = e.flyZ !== undefined ? e.flyZ : W.grid.floor(e.x, e.y);
    }
  }
  if (G.enemies.length > 40) G.enemies = G.enemies.filter(e => e.alive || e.dying < 1.5);
  else G.enemies = G.enemies.filter(e => e.alive || e.dying < 3);
}
function moveDir(e, H) {
  const f = W.grid.flowDir(e.x, e.y, H[0], H[1]);
  if (f) return f; const dx = H[0] - e.x, dy = H[1] - e.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d];
}
function throwAt(e, H, kind) {
  const from = [e.x, e.y, e.z + 1.7 * e.size * M], to = [H[0], H[1], H[2] + 1.2 * M], d = V.sub(to, from), L = V.len(d), sp = kind === 'suitcase' ? 170 : kind === 'medal' ? 260 : 220, tt = L / sp;
  G.proj.push({ id: G.nextId++, kind, team: 'enemy', p: from, v: [d[0] / tt, d[1] / tt, d[2] / tt + 150 * tt], g: 300, hp: 1, r: kind === 'suitcase' ? 8 : 5, dmg: kind === 'suitcase' ? 10 : kind === 'medal' ? 10 : 8, t: 0, life: tt + 1.5, spin: 0 });
  emit('throw', { kind, at: from });
}
S7.throwAt = throwAt;
function explodeEnemy(e) {
  if (!e.alive) return;
  e.alive = false; e.dying = 0; e.exploded = true;
  const H = heroTarget(), d = Math.hypot(H[0] - e.x, H[1] - e.y), D = S7.ENEMIES[e.type];
  emit('explode', { at: [e.x, e.y, e.z + 16], radius: 1.5, enemy: e });
  if (d < 2.2 * M) hurt((D.contact || 20) * T.explosionDmg, e);
  if (S7.echoPenalty) S7.echoPenalty(e);
}
/** damage an enemy; returns true when it died */
function damageEnemy(e, dmg, how, crit) {
  if (!e.alive) return false;
  if (CHEATS.oneHit) dmg = 9999;
  e.hp -= dmg; e.revealed = Math.max(e.revealed, 3);
  emit('hit', { target: e, part: crit ? 'warm' : 'body', dmg });
  if (e.hp <= 0 || crit && !S7.ENEMIES[e.type].boss) { killEnemy(e, crit); return true; }
  if (e.ai === 'twins' && !e.split && how !== 'burn') {   // a body hit splits it into two small Gigglers, once
    e.split = true; e.alive = false; e.dying = 0; e.splitDone = true; emit('split', { enemy: e });
    for (const sd of [-1, 1]) spawnEnemy('giggler', e.x + Math.cos(e.facing + Math.PI / 2) * 14 * sd, e.y + Math.sin(e.facing + Math.PI / 2) * 14 * sd, e.z, { hp: 12, size: .7, wave: e.wave, revealed: 3, small: true });
  }
  return false;
}
S7.damageEnemy = damageEnemy;
function killEnemy(e, crit) {
  e.alive = false; e.dying = 0; e.crit = crit;
  const D = S7.ENEMIES[e.type], d2 = diff();
  G.stats.kills++; if (crit) G.stats.crits++;
  const red = Math.round((crit ? D.red[1] : D.red[0]) * d2.red * T.redDrop), rime = crit ? Math.round((D.rime || 1) * T.rimeDrop + (stats().crit >= 3 ? 1 : 0)) : 0;
  const H = heroTarget(), near = Math.hypot(H[0] - e.x, H[1] - e.y) < 10 * M;
  if (near) { addRed(red); G.rime += rime; emit('pickup', { kind: 'red', amount: red, at: [e.x, e.y, e.z] }); if (rime) emit('pickup', { kind: 'rime', amount: rime }); }
  else G.drops.push({ x: e.x, y: e.y, z: e.z + 16, red, rime, t: 0 });
  emit('kill', { enemy: e, type: e.type, crit });
  if (crit) { emit('crit', { enemy: e }); S7.splash('THAW.', .9, { big: true }); if (R('bark') < .35) bark(G.persona, 'crit'); }
  if (e.drop) { giveItem(e.drop); S7.splash(S7.ITEMS[e.drop].name.toUpperCase(), 1.6); if (e.onDropFlag) setFlag(e.onDropFlag); }
  if (D.onKill) D.onKill(e, G);
  if (S7.echoCrit && crit) S7.echoCrit(e);
}
S7.killEnemy = killEnemy;
S7.killAll = () => { for (const e of G.enemies) if (e.alive) killEnemy(e, true); G.pending = []; };

/* ---- aiming ---- */
function aimStep(dt, I) {
  const a = G.aim, st = stats();
  let dy = I.lookYaw * DEG, dp = I.lookPitch * DEG;
  // aim assist (controller only): slow near a revealed warm spot, and a gentle pull
  const mode = (S7.game && S7.game.settings && S7.game.settings.aimAssist) || diff().assist;
  if (I.padLook && mode !== 'Off' && T.assist > 0) {
    const hi = mode === 'High', eye = S7.eye(); let best = null, bd = 5 * DEG;
    for (const p of assistPoints()) { const v = V.sub(p, eye), yaw = Math.atan2(v[1], v[0]), pit = Math.atan2(v[2], Math.hypot(v[0], v[1])), d = Math.hypot(angDiff(a.yaw, yaw), pit - a.pitch); if (d < bd) { bd = d; best = [yaw, pit]; } }
    if (best) {
      if (bd < 3.5 * DEG) { const k = lerp(1, hi ? .4 : .55, T.assist); dy *= k; dp *= k; }
      const pull = (hi ? .25 : .12) * T.assist * dt * 4; a.yaw += angDiff(a.yaw, best[0]) * pull; a.pitch += (best[1] - a.pitch) * pull;
    }
  }
  if (a.scope) { dy *= .35; dp *= .35; }
  a.yaw = wrapAng(a.yaw + dy); a.pitch = clamp(a.pitch + dp, -70 * DEG, 70 * DEG);
  // the pointer (light gun): the reticle follows the mouse; the view pans in the outer tenth
  const pm = I.pointerAim;
  if (pm) { const ex = Math.abs(pm[0]) > .8 ? Math.sign(pm[0]) * (Math.abs(pm[0]) - .8) / .2 : 0, ey = Math.abs(pm[1]) > .8 ? Math.sign(pm[1]) * (Math.abs(pm[1]) - .8) / .2 : 0; a.yaw = wrapAng(a.yaw + ex * 120 * DEG * dt); a.pitch = clamp(a.pitch - ey * 80 * DEG * dt, -70 * DEG, 70 * DEG); }
  a.pointer = pm || null;
  // sway (a Lissajous wobble) and recoil recovery
  const amp = Math.max(.1, .7 * (1 - .15 * st.steady)) * (a.scope ? .5 : 1) * DEG, t = G.time;
  a.swayY = Math.sin(t * .6 * TAU) * amp; a.swayP = Math.sin(t * .9 * TAU + 1) * amp * .7;
  a.recoil = Math.max(0, a.recoil - 10 * dt);
}
function assistPoints() {
  const out = [];
  for (const e of G.enemies) if (e.alive && e.vis > .5) { if (e.spots) for (const s of bloomSpots(e)) { if (e.spots[s.i]) out.push(s.pos); } else out.push(warmPos(e)); }
  for (const t of W.targets || []) if (!flag('hit:' + key(t.id))) out.push(t.pos);
  if (S7.bossTargets) for (const b of S7.bossTargets()) if (b.kind === 'warm' && b.window) out.push(b.pos);
  return out;
}
/** the aim ray now: from the eye along the reticle, with spread (degrees) */
function aimRay(spread = 0, k = 0) {
  const a = G.aim, o = S7.eye();
  let yaw = a.yaw + (a.swayY || 0), pit = a.pitch + a.recoil * DEG + (a.swayP || 0);
  if (a.pointer) { const fov = (a.scope ? 18 : 62) * DEG, th = Math.tan(fov / 2), asp = S7.aspect || 16 / 9; yaw += Math.atan(a.pointer[0] * th * asp); pit -= Math.atan(a.pointer[1] * th); }
  if (spread) { const r1 = R('spread'), r2 = R('spread'), ang = r1 * TAU, rad = Math.sqrt(r2) * spread * DEG; yaw += Math.cos(ang) * rad; pit += Math.sin(ang) * rad; }
  void k;
  return { o, d: V.dir(yaw, pit) };
}
S7.aimRay = aimRay;

/** cast a shot: the nearest thing the ray meets (warm spots first among overlaps) */
function castShot(o, d, max, opts = {}) {
  const wall = W.grid.ray(o, d, max);
  let best = { t: wall, kind: wall < max ? 'wall' : 'none' };
  const consider = (t, h) => { if (t !== null && t < best.t) best = Object.assign({ t }, h); };
  const wr = warmR();
  for (const e of G.enemies) {
    if (!e.alive || opts.skip && opts.skip.has(e)) continue;
    const s = e.size * M, bt = rayCapsule(o, d, e.x, e.y, e.z + 5 * e.size, e.z + 1.7 * s - 5, .34 * s);
    if (e.spots) { for (const sp of bloomSpots(e)) if (e.spots[sp.i]) { const t = raySphere(o, d, sp.pos, wr * 1.3); if (t !== null && (bt === null || t <= bt + .7 * s)) consider(t - .01, { kind: 'warm', enemy: e, spot: sp.i }); } }
    else {
      const wp = warmPos(e), t = raySphere(o, d, wp, wr);
      let facesOk = true;
      if (e.part === 'back') { const toShooter = Math.atan2(o[1] - e.y, o[0] - e.x); facesOk = Math.abs(angDiff(e.facing + Math.PI, toShooter)) < 1.4; }
      if (t !== null && facesOk && (bt === null || t <= bt + .75 * s)) consider(t - .01, { kind: 'warm', enemy: e });
    }
    if (bt !== null) {
      if (e.ai === 'plow' && !(e.back > 0)) { const toShooter = Math.atan2(o[1] - e.y, o[0] - e.x); if (Math.abs(angDiff(e.facing, toShooter)) < 1.3) { consider(bt, { kind: 'shield', enemy: e }); continue; } }
      consider(bt, { kind: 'body', enemy: e });
    }
  }
  for (const p of G.proj) if (p.team === 'enemy') consider(raySphere(o, d, p.p, p.r + 2), { kind: 'proj', proj: p });
  for (const t of W.targets || []) if (!flag('hit:' + key(t.id))) consider(raySphere(o, d, t.pos, t.r * M), { kind: 'target', target: t });
  if (S7.bossTargets) for (const b of S7.bossTargets()) consider(b.capsule ? rayCapsule(o, d, b.pos[0], b.pos[1], b.pos[2] - b.capsule, b.pos[2] + b.capsule, b.r) : raySphere(o, d, b.pos, b.r), { kind: 'boss', boss: b });
  best.at = V.add(o, d, best.t);
  return best;
}
S7.castShot = castShot;

/** apply a hit from the player's weapon */
function applyHit(h, dmg, W0, o) {
  const st = stats(), range = (W0.range || 60) * M * (G.aim.scope && W0.scopeRange ? W0.scopeRange / W0.range : 1);
  dmg *= (1 + .12 * st.power) * T.playerDmg; if (h.t > range) dmg *= .25;
  G.stats.hits++;
  if (h.kind === 'warm') {
    const e = h.enemy;
    if (e.spots) { e.spots[h.spot] = null; emit('crit', { enemy: e }); S7.splash('THAW.', .8, { big: true }); e.revealed = Math.max(e.revealed, 3); if (e.spots.every(x => !x)) killEnemy(e, true); else { e.size *= .85; damageEnemy(e, 0, 'spot'); } return; }
    damageEnemy(e, dmg * 3, 'warm', true); if (W0.burn && e.alive) e.burn = 3;
  } else if (h.kind === 'body') { damageEnemy(h.enemy, dmg, 'body'); if (W0.burn && h.enemy.alive) h.enemy.burn = 3; }
  else if (h.kind === 'shield') { emit('tink', { at: h.at }); h.enemy.revealed = Math.max(h.enemy.revealed, 3); h.enemy.shieldHits = (h.enemy.shieldHits || 0) + 1; if (h.enemy.shieldHits === 4 && !G.tips.plow) { G.tips.plow = true; S7.tip('plow'); } }
  else if (h.kind === 'proj') { h.proj.dead = true; addRed(h.proj.kind === 'suitcase' ? 4 : 1); emit('shatter', { at: h.at, kind: h.proj.kind }); }
  else if (h.kind === 'target') {
    const t = h.target;
    if (t.far && !(G.persona === 'ignaz' && G.aim.scope)) { S7.splash('TOO FAR.', 1, { at: h.at }); emit('toofar', { at: h.at }); return; }
    setFlag('hit:' + key(t.id)); emit('targetHit', { id: t.id, at: t.pos });
    if (t.flag) setFlag(t.flag); if (t.gate) openGate(t.gate); if (t.beat) runBeat(t.beat); if (t.splash) S7.splash(t.splash, 1.4);
  } else if (h.kind === 'boss') S7.bossHit(h.boss, dmg, h.at);
  else if (h.kind === 'wall') emit('impact', { at: h.at });
  void o;
}
S7.applyHit = applyHit;

/* ---- the weapons (§7.4) ---- */
function weaponsStep(dt, I) {
  const id = G.persona, P = S7.PERSONAS[id], W0 = S7.WEAPONS[P.weapon], w = wstate(id), st = stats(), rk = 1 + .08 * st.speed;
  w.cool -= dt; w.flash = Math.max(0, w.flash - dt * 8);
  if (W0.heat) { if (w.overT > 0) { w.overT -= dt; if (w.overT <= 0) w.mag = W0.mag; } }
  else if (w.reloadT > 0) { w.reloadT -= dt * rk; if (w.reloadT <= 0) { w.mag = W0.mag; emit('reloaded', { persona: id }); } }
  if (!G.aim.on || G.aim.k < .9) return;
  if (I.reload && !W0.heat && w.mag < W0.mag && w.reloadT <= 0) startReload(w, W0);
  const want = W0.auto ? I.fire : I.firePressed;
  if (!want || w.cool > 0 || w.reloadT > 0 || w.overT > 0) return;
  if (w.mag <= 0) { if (!W0.heat) { startReload(w, W0); emit('dry', { persona: id }); } return; }
  w.mag--; w.cool = W0.interval; w.flash = 1; w.alt ^= 1; G.stats.shots++;
  emit('shot', { persona: id, weapon: P.weapon }); S7.bossShot && S7.bossShot();
  if (W0.heat && w.mag <= 0) { w.overT = W0.reload; emit('overheat', {}); }
  if (W0.kind === 'hitscan') {
    const { o, d } = aimRay(W0.spread);
    const skip = new Set();
    for (let k = 0; k <= (W0.pierce || 0); k++) { const h = castShot(o, d, (W0.scopeRange || W0.range) * M * 2, { skip }); applyHit(h, W0.dmg, W0, o); if (h.enemy) skip.add(h.enemy); else break; emit('tracer', { from: o, to: h.at }); }
  } else if (W0.kind === 'pellets') {
    for (let k = 0; k < W0.pellets; k++) { const { o, d } = aimRay(W0.spread); const h = castShot(o, d, W0.range * M * 1.5); applyHit(h, W0.dmg, W0, o); if (h.kind === 'body' || h.kind === 'shield') knock(h.enemy, o, 40); }
  } else if (W0.kind === 'cone') coneBlast(W0);
  else if (W0.kind === 'lob') lob(W0.speed, W0.splash, W0.dmg, false);
  G.aim.recoil += W0.recoil;   // (the kick comes after the shot leaves)
}
function startReload(w, W0) { w.reloadT = W0.perShell ? W0.reload * (W0.mag - w.mag) : W0.reload; emit('reload', { persona: G.persona }); }
function knock(e, o, k) { if (!e || !e.alive) return; const a = Math.atan2(e.y - o[1], e.x - o[0]); e.x += Math.cos(a) * k * .2; e.y += Math.sin(a) * k * .2; if (e.ai === 'plow') { e.back = 1.2; e.turnT = 3.5; } }
function coneBlast(W0) {
  const { o, d } = aimRay(0), reach = W0.range * M, half = W0.cone / 2 * DEG;
  for (const e of G.enemies) {
    if (!e.alive) continue; const c = [e.x, e.y, e.z + 1.1 * e.size * M], v = V.sub(c, o), L = V.len(v); if (L > reach) continue;
    if (Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) > half || !W.grid.los(o, c)) continue;
    damageEnemy(e, W0.dmg * (1 + .12 * stats().power) * T.playerDmg, 'body'); knock(e, o, 160); if (e.alive && e.ai === 'plow') e.back = 1.2;
  }
  for (const p of G.proj) if (p.team === 'enemy') { const v = V.sub(p.p, o); if (V.len(v) < reach && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) { p.dead = true; emit('shatter', { at: p.p, kind: p.kind }); } }
  if (S7.bossTargets) for (const b of S7.bossTargets()) { const v = V.sub(b.pos, o); if (V.len(v) < reach && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) S7.bossHit(b, W0.dmg * .5, b.pos, 'cone'); }
  emit('blast', { at: o, dir: d });
}
function lob(speed, splash, dmg, charge) {
  const { o, d } = aimRay(0);
  G.proj.push({ id: G.nextId++, kind: charge ? 'charge' : 'shell', team: 'player', p: V.add(o, d, 10), v: [d[0] * speed, d[1] * speed, d[2] * speed + 30], g: 300, r: 3, splash: splash * M, dmg, t: 0, life: charge ? 5 : 2, charge });
  emit('lob', { charge });
}
function explodeAt(p, radius, dmg, src) {
  emit('explode', { at: p, radius: radius / M, source: src });
  for (const e of G.enemies) if (e.alive && Math.hypot(e.x - p[0], e.y - p[1]) < radius && Math.abs(e.z + 16 - p[2]) < radius + 24) { damageEnemy(e, dmg * (1 + .12 * stats().power) * T.playerDmg, 'splash'); if (e.alive && e.ai === 'plow') { e.back = 1.2; e.turnT = 3.5; } }
  if (S7.bossTargets) for (const b of S7.bossTargets()) if (V.dist(b.pos, p) < radius + b.r) S7.bossHit(b, dmg, p, 'splash');
  for (const t of W.targets || []) if (!t.far && t.splashable && V.dist(t.pos, p) < radius + t.r * M) applyHit({ kind: 'target', target: t, at: p, t: 0 }, 0, {}, p);
  if (src === 'charge') { skillGates('cornice', p, 6); skillGates('serac', p, 6); }
}
function projStep(dt) {
  const H = heroTarget();
  for (const p of G.proj) {
    p.t += dt; p.v[2] -= p.g * dt; const np = V.add(p.p, p.v, dt);
    if (p.team === 'player') {
      let hit = W.grid.solid(np[0], np[1], np[2]) || p.t > p.life;
      if (!hit) for (const e of G.enemies) if (e.alive && Math.hypot(e.x - np[0], e.y - np[1]) < .45 * e.size * M && np[2] > e.z && np[2] < e.z + 1.8 * e.size * M) { hit = true; break; }
      if (!hit && S7.bossTargets) for (const b of S7.bossTargets()) if (V.dist(b.pos, np) < b.r + 4) { hit = true; break; }
      if (hit) { p.dead = true; explodeAt(p.p, p.splash, p.dmg, p.charge ? 'charge' : 'shell'); continue; }
    } else {
      const out = () => { if (p.kind === 'suitcase' && R('spawn') < .2 && G.boss && G.boss.phase < 3) { const c = 9 * M; spawnEnemy('giggler', c - (H[0] - c) * .85, c - (H[1] - c) * .85, undefined, { revealed: 3 }); } };
      if (Math.hypot(np[0] - H[0], np[1] - H[1]) < 10 && np[2] > H[2] && np[2] < H[2] + 30) { p.dead = true; hurt(p.dmg, p); emit('splat', { at: np, kind: p.kind }); out(); continue; }
      if (W.grid.solid(np[0], np[1], np[2]) || p.t > p.life) { p.dead = true; emit('splat', { at: p.p, kind: p.kind }); out(); continue; }
    }
    p.p = np;
  }
  G.proj = G.proj.filter(p => !p.dead);
}
S7.lob = lob;

/* ---- drops fly to you (§7.7) ---- */
function dropsStep(dt) {
  const H = heroTarget();
  for (const d of G.drops) {
    d.t += dt; const dx = H[0] - d.x, dy = H[1] - d.y, dz = H[2] + 16 - d.z, L = Math.hypot(dx, dy, dz);
    if (d.t > .5 && (L < 4 * M || !G.aim.on || d.pull)) { const k = Math.min(1, 380 * dt / Math.max(1, L)); d.x += dx * k; d.y += dy * k; d.z += dz * k; }
    if (L < 16) { d.got = true; addRed(d.red); G.rime += d.rime; emit('pickup', { kind: 'red', amount: d.red }); if (d.rime) emit('pickup', { kind: 'rime', amount: d.rime }); }
  }
  G.drops = G.drops.filter(d => !d.got);
}
S7.collectDrops = () => { for (const d of G.drops) d.pull = true; };

/* ---- the scan (§7.5) ---- */
function scanStep(dt, I) {
  G.scanCd = Math.max(0, G.scanCd - dt);
  if (I.scan && G.aim.on && G.scanCd <= 0) { G.scan = { r: 0, at: S7.eye(), max: T.scanRadius * M }; G.scanCd = 1.2; emit('scan', { at: G.scan.at, radius: T.scanRadius }); S7.tipDone('scan'); }
  if (G.scan) {
    const sc = G.scan, r0 = sc.r; sc.r += sc.max / .6 * dt;
    const rev = (T.revealTime * diff().reveal + .4 * stats().steady);
    for (const e of G.enemies) if (e.alive) { const d = Math.hypot(e.x - sc.at[0], e.y - sc.at[1]); if (d >= r0 - 8 && d <= sc.r) { if (e.revealed <= 0) emit('reveal', { enemy: e, by: 'scan' }); e.revealed = Math.max(e.revealed, rev); } }
    if (sc.r >= sc.max) G.scan = null;
  }
  if (G.flare) { G.flare.t -= dt; for (const e of G.enemies) if (e.alive && Math.hypot(e.x - G.flare.at[0], e.y - G.flare.at[1]) < 30 * M) e.revealed = Math.max(e.revealed, .5); if (G.flare.t <= 0) G.flare = null; }
  if (G.revealAll > 0) G.revealAll -= dt;
}

/* ---- skills (§7.9) ---- */
const SKILL_CD = { flare: 20, makeitrain: 4, echo: 4, flash: 2, charge: 2.5, longlook: .2, tuck: 0 };
function skillsStep(dt, I) {
  for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);
  if (G.mode !== 'play' || G.cut) { G.tuck = false; return; }
  const P = S7.PERSONAS[G.persona], sk = P.skill, cost = P.skillCost || 0;
  if (sk === 'tuck') {
    const moving = G.walker.v > 5 || I.move;
    G.tuck = I.skillDown && !G.aim.on && (G.red > 0 || CHEATS.infRed);
    if (G.tuck && moving) { if (!CHEATS.infRed) G.red = Math.max(0, G.red - 2 * dt); }
    return;
  }
  if (!I.skill) return;
  if ((G.cd[sk] || 0) > 0) { emit('dry', {}); return; }
  const aimOnly = sk === 'flash' || sk === 'charge' || sk === 'longlook';
  if (aimOnly && !G.aim.on) { S7.splash('AIM FIRST.', .9); return; }
  if (sk === 'longlook') { G.aim.scope = !G.aim.scope; emit('scope', { on: G.aim.scope }); G.cd[sk] = .2; return; }
  if (!spendRed(cost)) { emit('dry', {}); emit('noRed', {}); S7.splash('NOT ENOUGH RED.', 1); return; }
  G.cd[sk] = SKILL_CD[sk] || 1; emit('skill', { persona: G.persona, skill: sk });
  const H = heroTarget();
  if (sk === 'flare') { G.flare = { t: 8, at: [H[0], H[1], H[2] + 3 * M] }; }
  else if (sk === 'makeitrain') { for (const e of G.enemies) if (e.alive && Math.hypot(e.x - H[0], e.y - H[1]) < 12 * M && !S7.ENEMIES[e.type].boss) { e.kneel = 3; e.revealed = Math.max(e.revealed, 3); } }
  else if (sk === 'echo') { skillGates('echowall', H, 25); skillGates('crystal', H, 15); for (const e of G.enemies) if (e.alive && Math.hypot(e.x - H[0], e.y - H[1]) < 40 * M) e.mark = 5; }
  else if (sk === 'flash') {
    const { o, d } = aimRay(0), half = 17.5 * DEG;
    for (const e of G.enemies) { if (!e.alive) continue; const v = V.sub([e.x, e.y, e.z + 20], o); if (V.len(v) < 25 * M && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half) { e.stun = 2.5; e.revealed = Math.max(e.revealed, 4); emit('reveal', { enemy: e, by: 'flash' }); } }
    for (const s of W.spots) if (s.kind === 'exposure' && !spotDone(s) && (!s.when || flag(s.when))) { const v = V.sub(s.pos, o); if (V.len(v) < 25 * M && Math.acos(clamp(V.dot(V.norm(v), d), -1, 1)) < half * 1.6) { markSpot(s); if (s.item) giveItem(s.item); if (s.flag) setFlag(s.flag); emit('exposure', { id: s.id }); if (s.beat) runBeat(s.beat); } }
    if (S7.bossFlash) S7.bossFlash(o, d);
  }
  else if (sk === 'charge') lob(620, 5, 90, true);
}
S7.skillsStep = skillsStep;

/** the combat step: aim, weapons, enemies, scan, projectiles, drops, waves (frozen: enemies hold, laughs go on) */
S7.combatStep = (dt, I, frozen) => {
  if (!frozen && G.aim.on) aimStep(dt, I);
  if (!frozen) weaponsStep(dt, I);
  if (!frozen) scanStep(dt, I);
  enemiesStep(dt, frozen || G.cut);
  if (!frozen) { projStep(dt); dropsStep(dt); }
  S7.wavesStep(dt);
};

/* ==== src/35-bosses.js ==== */
/* SKILLER7 — bosses (§11.8): Bellcaptain Grau (a car in a shaft, a hat-tip window), Die Lustigen Vier (warm spots that
 * glow only while their own track sounds, on the music clock), Hansi Pulver (the Avalaugh, the slalom, the interview).
 * Also: the avalanche chase, ranks and the results. */
const BOSSES = {};
S7.BOSSES = BOSSES;
S7.bossTargets = () => (G && G.boss && BOSSES[G.boss.id].targets ? BOSSES[G.boss.id].targets(G.boss) : []);
S7.bossHit = (t, dmg, at, how) => { if (G.boss) BOSSES[G.boss.id].hit(G.boss, t, dmg, at, how); };
S7.bossStep = (dt, I) => { if (G.boss && !G.boss.done) BOSSES[G.boss.id].step(G.boss, dt, I); avalStep(dt); if (G.slowmo) { /* scene reads it */ } };
S7.startBoss = (id, phase) => { G.boss = BOSSES[id].start(phase || 1); emit('boss', { id, phase: G.boss.phase }); };
S7.bossFlash = (o, d) => { if (G.boss && BOSSES[G.boss.id].flash) BOSSES[G.boss.id].flash(G.boss, o, d); };
const bossWin = (b, beat) => { b.done = true; G.boss = null; emit('bossDead', { id: b.id }); runBeat(beat); };

/* ---- GRAU: the shaft (00C). Floors at 3, 6.5 and 10 m; the car in the middle; Grau throws, then tips his hat ---- */
const FLOORS = [3, 6.5, 10];
BOSSES.grau = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    return { id: 'grau', phase, t: 0, carZ: FLOORS[1] * M, carTo: FLOORS[0] * M, state: 'move', st: 0, throws: 0, hat: 0, hp: 150, noSwitch: true, floorI: 0, dropT: 6, hpMax: 150, name: 'BELLCAPTAIN GRAU', bar: 1 };
  },
  pos(b) { const H = heroPos(), c = [9 * M, 9 * M], a = Math.atan2(H.y - c[1], H.x - c[0]); return [c[0] + Math.cos(a) * 1.1 * M, c[1] + Math.sin(a) * 1.1 * M, b.carZ + (b.phase === 3 ? 2.6 * M : .1)]; },
  targets(b) {
    if (b.state === 'dying') return [];
    const p = this.pos(b), out = [{ id: 'body', kind: 'body', pos: [p[0], p[1], p[2] + 18], r: 9, capsule: 14 }];
    if (b.hat > 0) out.unshift({ id: 'head', kind: 'warm', window: true, pos: [p[0], p[1], p[2] + 1.75 * 1.4 * M], r: warmR() * 1.3 });
    return out;
  },
  step(b, dt) {
    b.t += dt; b.st += dt; b.hat = Math.max(0, b.hat - dt);
    const speed = b.phase === 2 ? 340 : 120;
    if (b.state === 'move') { b.carZ = approach(b.carZ, b.carTo, speed * dt); if (b.carZ === b.carTo) { b.state = 'ding'; b.st = 0; emit('ding', { phase: b.phase }); } }
    else if (b.state === 'ding' && b.st > .6) { b.state = 'throw'; b.st = 0; b.throws = 0; }
    else if (b.state === 'throw') {
      if (b.st > .55 && b.throws < 3) { b.st = 0; b.throws++; const p = this.pos(b), H = heroPos(); throwAt({ x: p[0], y: p[1], z: p[2] - .6 * M, size: 1.4 }, [H.x + RR('spawn', -34, 34), H.y + RR('spawn', -34, 34), H.z], 'suitcase'); if (b.phase >= 2 && R('spawn') < .5) { const side = [RR('spawn', 3, 15) * M, R('spawn') < .5 ? 2.5 * M : 15.5 * M]; throwAt({ x: side[0], y: side[1], z: 8 * M, size: 1 }, [H.x, H.y, H.z], 'suitcase'); } }
      if (b.throws >= 3 && b.st > .7) { b.state = 'hat'; b.st = 0; b.hat = b.phase === 3 ? 1 : 1.4; emit('hattip', {}); }
    } else if (b.state === 'hat' && b.hat <= 0) {
      b.state = 'move'; b.floorI = (b.floorI + 1 + Math.floor(R('spawn') * 2)) % 3; b.carTo = FLOORS[b.floorI] * M;
      if (b.phase === 2) { b.carTo = FLOORS[(b.floorI + 1) % 3] * M; }
    } else if (b.state === 'dying') { if (b.st > 2.4) { setFlag('grauDead'); bossWin(b, 't00_done'); } return; }
    if (b.phase === 3) { b.dropT -= dt; if (b.dropT <= 0) { b.dropT = 5; const H = heroPos(), c = 9 * M; spawnEnemy('giggler', c - (H.x - c) * .9, c - (H.y - c) * .9, undefined, { revealed: 4 }); emit('drop', {}); } }
  },
  hit(b, t, dmg) {
    if (b.state === 'dying') return;
    if (t.kind === 'warm' && b.hat > 0) { emit('crit', { enemy: null, boss: true }); S7.splash('CRITICAL BRAVO', 1.2, { big: true }); G.stats.crits++; G.stats.kills++; this.next(b); return; }
    if (b.hat > 0) { b.hp -= dmg; b.bar = Math.max(0, b.hp / b.hpMax); emit('hit', { target: 'grau', part: 'body', dmg }); if (b.hp <= 0) this.next(b); return; }
    emit('tink', { at: t.pos }); S7.splash('THE HAT.', .5, { small: true });
  },
  next(b) {
    b.hat = 0; b.hp = b.hpMax; b.bar = 1; b.phase++; emit('boss', { id: 'grau', phase: b.phase });
    if (b.phase === 2) { emit('cableSnap', {}); S7.barkLine('grau', 'The cable. Housekeeping will hear of this.', 2.6); b.state = 'move'; b.carTo = FLOORS[0] * M; }
    else if (b.phase === 3) { S7.barkLine('grau', 'Ding. Ding. Ding. Last call.', 2.6); b.state = 'move'; b.carTo = FLOORS[1] * M; }
    else { b.state = 'dying'; b.st = 0; G.rime += 10; S7.barkLine('grau', 'Checkout... is at... eleven...', 3); S7.killAll(); emit('melt', { boss: 'grau' }); }
  }
};
S7.beat('grau_intro', function* (B) {
  const G2 = B.G(); B.cut(true);
  yield B.card('TARGET 00 — AUGUSTIN GRAU', 'THE BELLCAPTAIN', 2.6, { target: true, who: 'grau' });
  yield B.cam({ shot: 'orbit', center: [9 * M, 9 * M, 3 * M], radius: 6 * M, height: 3 * M, speed: .35, t0: 0, lookUp: 2 * M, fov: 52 }, 999);
  yield B.say([['grau', 'Ding. Ding. Ding. Every floor has a bell, and every bell has a floor.'], ['grau', 'Your luggage, Madame? It is very heavy. It is full of everyone you were.']]);
  B.camOff(); B.cut(false); S7.startBoss('grau'); void G2;
  S7.tip('aim');
});

/* ---- DIE LUSTIGEN VIER: four musicians on the stage (01B ballroom). The band song's tracks are their windows ---- */
const BAND = [['tuba', 48, 16.8], ['accordion', 50.8, 16.6], ['trumpet', 53.4, 16.6], ['snare', 55.6, 16.8]];
const BPMS = [112, 124, 136, 148];
function trackOn(name, step) { const sg = S7.SONGS.band, tr = sg.tracks.find(t => t.name === name); if (!tr) return false; const tk = tr._tok || (tr._tok = tr.notes.split(/\s+/).filter(x => x && x !== '|')); const k = tk[step % tk.length]; return k !== '.'; }
S7.trackOn = trackOn;
BOSSES.band = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    return { id: 'band', phase, t: 0, clock: 0, step: 0, bpm: BPMS[0], bar: 1, name: 'DIE LUSTIGEN VIER', kills: 0, lastBar: -1,
      m: BAND.map(([name, x, y]) => ({ name, x: x * M, y: y * M, z: 16, dmg: 0, alive: true, dying: 0 })) };
  },
  window(b, mus) { return mus.alive && trackOn(mus.name, b.step); },
  targets(b) {
    const out = [];
    for (const mu of b.m) if (mu.alive) {
      const win = this.window(b, mu), solo = b.m.filter(x => x.alive).length === 1;
      out.push({ id: mu.name + ':body', kind: 'body', pos: [mu.x, mu.y, mu.z + 18], r: 8, capsule: 12, mu, window: win });
      out.push({ id: mu.name + ':warm', kind: 'warm', pos: [mu.x, mu.y, mu.z + (mu.name === 'tuba' && solo ? 30 : 22)], r: warmR() * 1.15, mu, window: win });
    }
    return out;
  },
  step(b, dt) {
    b.t += dt; b.clock += dt * b.bpm / 60 * 4; b.step = Math.floor(b.clock);
    const bar = Math.floor(b.step / 16);
    const Hb = heroPos(), inRoom = Math.hypot(Hb.x - 51.5 * M, Hb.y - 23 * M) < 14 * M;
    if (bar !== b.lastBar) { b.lastBar = bar; if (bar % 2 === 0 && inRoom && G.enemies.filter(e => e.alive && e.type === 'dancer').length < 4) for (const sd of [-1, 1]) spawnEnemy('dancer', (51.5 + sd * 6.5) * M, 19.5 * M, undefined, { revealed: 0 }); }
    for (const mu of b.m) if (!mu.alive) mu.dying += dt;
    if (b.m.every(x => !x.alive) && !b.ending) { b.ending = true; b.endT = 0; }
    if (b.ending) { b.endT += dt; if (b.endT > 1.6) { setFlag('band'); G.rime += 10; S7.killAll(); bossWin(b, 'band_done'); } }
  },
  hit(b, t, dmg) {
    const mu = t.mu; if (!mu || !mu.alive) return;
    if (!t.window) { emit('deflect', { at: t.pos }); S7.splash('THE MUSIC PROTECTS THEM.', .7, { small: true }); return; }
    if (t.kind === 'warm') { G.stats.crits++; this.kill(b, mu); S7.splash('CRITICAL BRAVO', 1.1, { big: true }); return; }
    mu.dmg += dmg; emit('hit', { target: mu.name, part: 'body', dmg }); if (mu.dmg >= 120) this.kill(b, mu);
  },
  kill(b, mu) {
    mu.alive = false; b.kills++; G.stats.kills++; b.bpm = BPMS[Math.min(3, b.kills)]; b.clock = b.step;   // (the clock keeps its place at the new tempo)
    b.bar = b.m.filter(x => x.alive).length / 4;
    emit('bandKill', { name: mu.name, bpm: b.bpm }); emit('kill', { type: 'musician', crit: true });
    if (mu.name === 'tuba' && !G.flags.edel2) { G.flags.edel2 = true; giveItem('edelweiss'); S7.splash('EDELWEISS PASS', 1.6); }
  }
};
S7.beat('band_intro', function* (B) {
  B.cut(true);
  yield B.card('DIE LUSTIGEN VIER', 'THE JOLLY FOUR', 2.6, { target: true, who: 'band' });
  yield B.cam({ shot: 'fixed', at: [51.5, 29.6, 2.4], look: [51.5, 16.8, 2], fov: 50 }, 999);
  yield B.say([['tuba', 'Eins! Zwei! Drei! Vier!'], ['kasimir', 'They play only on the beat. Shoot on the beat.']]);
  B.camOff(); B.cut(false); S7.startBoss('band');
});
S7.beat('band_done', function* (B) {
  yield B.say([['tuba', 'Bravo... bravo...']]);
  S7.splash('BRAVO.', 1.6, { big: true }); B.emit('bandDone', {});
});

/* ---- HANSI PULVER: the Avalaugh (5 warm spots, the Thaw), the slalom (hit him only at the gates), the interview ---- */
const AV = [200, 100];
const GATES = [.16, .31, .46, .61, .76, .9];
S7.SLALOM_GATES = GATES;
BOSSES.hansi = {
  start(phase) {
    S7.autosave && S7.autosave('boss');
    const b = { id: 'hansi', phase, t: 0, name: 'HANSI PULVER', bar: 1, snowT: 2.2, budT: 5, spots: [1, 1, 1, 1, 1], thaw: null, crits: 0, dmg: 0, hs: 0, wait: 0, medalT: 3, regrow: 0 };
    if (phase === 2) Object.assign(b, { noSwitch: true, aimOnTheMove: true });
    if (phase === 3) Object.assign(b, { noSwitch: true, lockWalker: true, t3: 0, forceAim: true });
    return b;
  },
  spotPos(i) { const P = [[-1.6, 6.8, 2.75], [0, 7.8, 3.05], [1.6, 6.8, 2.75], [-.7, 11.9, 1.95], [.7, 11.9, 1.95]][i]; return [AV[0] * M + P[0] * M, AV[1] * M + P[2] * M, W.grid.floor(AV[0] * M, AV[1] * M) + P[1] * M]; },
  balls() { const z0 = W.grid.floor(AV[0] * M, AV[1] * M); return [[3.5, 4], [8, 3], [11.5, 2]].map(([z, r]) => [[AV[0] * M, AV[1] * M, z0 + z * M], r * M]); },
  hansiPos(b) {
    const e = W.rails.byId['sl0-sl1'], s = clamp(b.hs, 0, e.len), p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2, off = (20 + Math.sin(s / 90) * 5) * M;
    return [p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, W.grid.floor(p.x + Math.cos(a) * off, p.y + Math.sin(a) * off)];
  },
  inWindow(b) { const e = W.rails.byId['sl0-sl1']; return GATES.some(g => Math.abs(b.hs - g * e.len) < 84); },
  targets(b) {
    if (b.phase === 1) { const out = this.balls().map(([pos, r], i) => ({ id: 'av:ball' + i, kind: 'body', pos, r })); b.spots.forEach((on, i) => { if (on) out.unshift({ id: 'av:' + i, kind: 'warm', window: true, pos: this.spotPos(i), r: warmR() * 2.2, spot: i }); }); return out; }
    if (b.phase === 2) { const p = this.hansiPos(b), w = this.inWindow(b); return [{ id: 'h:warm', kind: 'warm', window: w, pos: [p[0], p[1], p[2] + 1.3 * 1.4 * M], r: warmR() * 1.4 }, { id: 'h:body', kind: 'body', window: w, pos: [p[0], p[1], p[2] + 18], r: 9, capsule: 12 }]; }
    return [];
  },
  step(b, dt, I) {
    b.t += dt;
    if (b.phase === 1) {
      const H = heroPos();
      b.snowT -= dt; if (b.snowT <= 0) { b.snowT = 3; G.proj.push({ id: G.nextId++, kind: 'snowball', team: 'enemy', p: [AV[0] * M, AV[1] * M + 3.4 * M, W.grid.floor(AV[0] * M, AV[1] * M) + 10.4 * M], v: [0, 0, 0], g: 300, hp: 1, r: 9, dmg: 12, t: 0, life: 5 }); const p = G.proj[G.proj.length - 1], d = V.sub([H.x, H.y, H.z + 16], p.p), tt = V.len(d) / 210; p.v = [d[0] / tt, d[1] / tt, d[2] / tt + 150 * tt]; emit('throw', { kind: 'snowball', at: p.p }); }
      b.budT -= dt; if (b.budT <= 0) { b.budT = 5; if (aliveEnemies().length < 6) spawnEnemy('giggler', (AV[0] + RR('spawn', -5, 5)) * M, (AV[1] + 6) * M, undefined, { revealed: 2 }); }
      const left = b.spots.filter(Boolean).length;
      if (left <= 2 && left > 0) { if (!b.thaw) { b.thaw = { t: 40 }; emit('thaw', {}); S7.splash('THE THAW', 1.6, { big: true }); } b.thaw.t -= dt; if (b.thaw.t <= 0) { hurt(60, null); const i = b.spots.indexOf(0); if (i >= 0) b.spots[i] = 1; b.thaw = null; emit('explode', { at: [AV[0] * M, AV[1] * M, 6 * M], radius: 12 }); } }
      b.bar = left / 5;
      if (!left && !b.down) { b.down = true; b.downT = 0; emit('avalaughDown', {}); S7.killAll(); }
      if (b.down) { b.downT += dt; if (b.downT > 2.2) { setFlag('avalaughDown'); G.boss = null; runBeat('hansi_slalom'); } }
    } else if (b.phase === 2) {
      const e = W.rails.byId['sl0-sl1'], wk = G.walker, ps = curEdge() === e ? wk.s : 0, lead = b.hs - ps;
      let v = clamp(170 + (lead < 15 * M ? 60 : lead > 45 * M ? -60 : 0), 60, 260);
      const nextGate = GATES.map(g => g * e.len).find(g => g > b.hs + 4);
      if (lead > 60 * M && nextGate !== undefined && nextGate - b.hs < 20) { v = 0; if (!b.waitBark) { b.waitBark = true; S7.barkLine('hansi', 'Bend the knees!', 2); } } else b.waitBark = false;
      if (this.inWindow(b)) v *= .55;   // (he carves round the pole: the flags flash red)
      b.hs = Math.min(e.len - 40, b.hs + v * dt);
      if (wk.node === 'sl1' && !b.crash) { S7.splash('AGAIN! FROM THE TOP!', 1.8, { big: true }); S7.barkLine('hansi', 'Ha! Too slow! Again, from the top!', 2.4); placeAtNode('sl0'); b.hs = 0; director.cut(); emit('slalomAgain', {}); }
      b.medalT -= dt; if (b.medalT <= 0 && !this.inWindow(b)) { b.medalT = 2.8; const p = this.hansiPos(b); throwAt({ x: p[0], y: p[1], z: p[2], size: 1.4 }, [heroPos().x, heroPos().y, heroPos().z], 'medal'); }
      b.bar = 1 - b.crits / 4;
      if (b.crits >= 4 && !b.crash) { b.crash = true; emit('hansiCrash', {}); S7.splash('HE IS DOWN.', 1.6); b.hs = e.len - 40; }
      if (b.crash && wk.node === 'sl1') { G.boss = null; runBeat('hansi_interview'); }
    } else if (b.phase === 3) {
      b.t3 += dt; G.aim.on = true; I.scan = false; I.skill = false;
      if (!b.l1 && b.t3 > 1) { b.l1 = true; S7.barkLine('hansi', 'You know what the Föhn told me? The snow is a lie the mountain tells the valley.', 4.2); }
      if (!b.l2 && b.t3 > 5.4) { b.l2 = true; S7.barkLine('hansi', 'Every spring the truth runs down into the rivers, and the children drink it.', 4.2); }
      if (!b.l3 && b.t3 > 9.8) { b.l3 = true; S7.barkLine('hansi', 'Your grandmother keeps it frozen. Who pays her? Who pays you? Same bank.', 4.4); }
      if (b.t3 > 24.2 && !b.end) { b.end = 'fell'; S7.barkLine('hansi', '...You hesitate. That\'s new. They usually don\'t.', 3.4); emit('hansiFall', {}); b.endT = 0; }
      if (b.end) { b.endT = (b.endT || 0) + dt; if (b.endT > 3.4) { setFlag('hansiDead'); G.ending = b.end; giveItem(b.end === 'shot' ? 'doc_t01' : 'doc_t01'); G.flags.ending = b.end; G.aim.on = false; bossWin(b, 't01_done'); } }
    }
  },
  hit(b, t, dmg) {
    if (b.phase === 1) {
      if (t.kind === 'warm') { b.spots[t.spot] = 0; G.stats.crits++; G.stats.kills++; emit('crit', { boss: true }); emit('melt', { spot: t.spot }); S7.splash('CRITICAL BRAVO', 1, { big: true }); return; }
      emit('tink', { at: t.pos }); return;
    }
    if (b.phase === 2) {
      if (!t.window) { emit('deflect', { at: t.pos }); S7.splash('AT THE GATES.', .6, { small: true }); return; }
      if (t.kind === 'warm') { b.crits++; G.stats.crits++; emit('crit', { boss: true }); S7.splash('CRITICAL BRAVO', 1, { big: true }); return; }
      b.dmg += dmg; if (b.dmg >= 90) { b.dmg -= 90; b.crits++; S7.splash('HIT.', .8); }
    }
  }
};
S7.bossShot = () => { if (G.boss && G.boss.id === 'hansi' && G.boss.phase === 3 && !G.boss.end && G.boss.t3 > .6) { G.boss.end = 'shot'; G.boss.endT = 0; emit('hansiShot', {}); S7.barkLine(G.persona, '...', 1.6); } };
S7.beat('hansi_intro', function* (B) {
  B.cut(true);
  yield B.card('TARGET 01 — HANSI PULVER', 'THE POWDER KING', 2.8, { target: true, who: 'hansi' });
  yield B.cam({ shot: 'fixed', at: [200, 138, 304], look: [200, 100, 304], fov: 50 }, 999);
  B.emit('hansiAppear', {});
  yield B.say([['hansi', 'Grüß Gott! You came for a lesson? Lesson one: everything goes downhill.']]);
  B.emit('avalaughRise', {}); yield 2.4;
  B.camOff(); B.cut(false); S7.startBoss('hansi', 1);
});
S7.beat('hansi_slalom', function* (B) {
  B.cut(true);
  yield B.say([['hansi', 'Ha! You melt my snowman? Race me, then! Gates only! Fair is fair!']]);
  B.cut(false); S7.startBoss('hansi', 2); S7.tip('ski');
  S7.barkLine(B.G().persona, 'Down the face. Hit him at the gates.', 2.6);
});
S7.beat('hansi_interview', function* (B) {
  B.cut(true); B.emit('fog', {});
  yield B.card('THE INTERVIEW', '', 2.2);
  B.cut(false); S7.startBoss('hansi', 3);
});

/* ---- the avalanche chase (01C, once): it runs at 92% of Dagny's tucked top speed; let go and it catches up ---- */
function avalStep(dt) {
  const a = G.aval; if (!a || G.mode !== 'play') return;
  a.t += dt; const wk = G.walker; a.pd += wk.v * dt; a.d += a.speed * dt;
  if (flag('lawineEnd')) { G.aval = null; setFlag('lawineDone'); S7.splash('CLEAR.', 1.4); emit('lawineEnd', {}); return; }
  if (a.d >= a.pd - 12) { G.aval = null; setFlag('lawineDone'); setFlag('lawineEnd'); freezeActive(); emit('buried', {}); }
}

/* ---- ranks and results (§7.25) ---- */
S7.rank = (target, s) => {
  const crit = s.kills ? s.crits / s.kills * 100 : 0, par = target === 0 ? 12 * 60 : 40 * 60;
  if (crit >= 60 && s.frozen === 0 && s.time <= par) return 'DOUBLE BLACK';
  if (crit >= 40 && s.frozen <= 1) return 'BLACK DIAMOND';
  if (crit >= 20) return 'BLUE SQUARE';
  return 'GREEN CIRCLE';
};
BG.results = target => {
  const s = Object.assign({}, G.stats), rank = S7.rank(target, s);
  G.results['t0' + target] = { stats: s, rank };
  G.resultsShow = { target, stats: s, rank, note: target === 0 ? 'Your guest has checked out. Housekeeping has been notified.' : 'The glacier did not weep. The Department is grateful, in its way.' };
  G.mode = 'results'; emit('result', { target, stats: s, rank });
  return () => G.mode !== 'results';
};
S7.closeResults = () => { if (G.mode === 'results') { G.mode = 'play'; G.resultsShow = null; } };
S7.newStatsFn = newStats;

/* ==== src/60-audio.js ==== */
/* SKILLER7 — audio, all in code: the engine's chip synth for music and effects, plus our own WebAudio laughter
 * (formant-filtered "ha"s, positional) and Animalese-style gibberish voices typed along with the dialog (§10).
 * Everything here listens to the bus; nothing changes the sim. Headless (no AudioContext) it all does nothing. */
const AU = { song: null, layerOn: false, voices: [], laughs: 0, lastShown: -1, lastLine: -1, bark: null };
S7.AU = AU;
const A_ = () => S7.game && S7.game.audio;
S7.sfx = (name, o) => { const a = A_(); if (!a || S7.game.headless) return; a.sfx(name, o); };
S7.music = (id, o = {}) => {
  const a = A_(); if (!a) return; if (AU.song === id && !o.restart) return; AU.song = id;
  if (!id) { a.music(null); return; }
  const s = S7.SONGS[id]; if (!s) return;
  a.music(JSON.parse(JSON.stringify(s)), Object.assign({ sync: true, fade: o.fade ?? .8 }, s.loop === false ? { loop: false } : {}));
  AU.layerOn = false;
};
const SFX = {
  tick: { wave: 'pulse12', freq: 'A6', dur: .03, vol: .08 }, confirm: [{ wave: 'pulse', freq: 'E5', dur: .06, vol: .12 }, { wave: 'pulse', freq: 'B5', dur: .08, vol: .1, delay: .05 }],
  back: { wave: 'pulse', freq: 'B4', to: 'E4', dur: .08, vol: .1 }, dry: { wave: 'noise', freq: 3000, dur: .04, vol: .2, filter: 'highpass' }, dial: { wave: 'noise', freq: 2400, dur: .02, vol: .18, filter: 'bandpass', q: 6 },
  shot38: [{ wave: 'noise', freq: 1600, to: 300, dur: .18, vol: .5 }, { wave: 'square', freq: 'C3', to: 'C2', dur: .1, vol: .2 }], shotPole: { wave: 'noise', freq: 2600, to: 900, dur: .05, vol: .25 },
  shotRifle: [{ wave: 'noise', freq: 900, to: 120, dur: .5, vol: .55 }, { wave: 'saw', freq: 'G2', to: 'C1', dur: .3, vol: .2 }], shotShotgun: [{ wave: 'noise', freq: 700, to: 90, dur: .38, vol: .6 }, { wave: 'square', freq: 'D2', to: 'A0', dur: .2, vol: .25 }],
  alphorn: [{ wave: 'saw', freq: 'F2', dur: .7, vol: .32, vib: [5, .02], hold: true }, { wave: 'saw', freq: 'C3', dur: .7, vol: .2, vib: [5, .02], hold: true }, { wave: 'noise', freq: 400, to: 120, dur: .5, vol: .25 }],
  shot25: { wave: 'noise', freq: 3000, to: 600, dur: .08, vol: .35 }, lob: [{ wave: 'noise', freq: 500, to: 2000, dur: .25, vol: .3 }, { wave: 'sine', freq: 'C3', to: 'G3', dur: .2, vol: .2 }],
  reload: [{ wave: 'noise', freq: 2400, dur: .03, vol: .2, filter: 'bandpass', q: 8 }, { wave: 'noise', freq: 1800, dur: .04, vol: .22, filter: 'bandpass', q: 8, delay: .25 }], reloaded: { wave: 'noise', freq: 3000, dur: .04, vol: .25, filter: 'bandpass', q: 6 },
  overheat: [{ wave: 'noise', freq: 1500, to: 300, dur: .8, vol: .3 }, { wave: 'saw', freq: 'A2', to: 'D2', dur: .4, vol: .15 }],
  scan: [{ wave: 'sine', freq: 'E6', to: 'E5', dur: .5, vol: .18 }, { wave: 'noise', freq: 400, to: 3000, dur: .6, vol: .12, delay: .05 }],
  crit: [{ wave: 'noise', freq: 5000, to: 1500, dur: .25, vol: .35, filter: 'highpass' }, { wave: 'sine', freq: 'A4', dur: .9, vol: .12, hold: true }, { wave: 'sine', freq: 'C#5', dur: .9, vol: .1, hold: true }, { wave: 'sine', freq: 'E5', dur: .9, vol: .09, hold: true }],
  kill: [{ wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3 }, { wave: 'sine', freq: 'G2', to: 'C1', dur: .3, vol: .2 }], explode: [{ wave: 'noise', freq: 900, to: 60, dur: .6, vol: .6 }, { wave: 'sine', freq: 'C2', to: 'C1', dur: .5, vol: .4 }],
  tink: { wave: 'triangle', freq: 'E6', to: 'B6', dur: .1, vol: .2 }, giggleup: { wave: 'square', freq: 'C5', to: 'C6', dur: .35, vol: .12, arp: [0, 3, 0, 5, 0, 7], step: .04, loop: true },
  throw: { wave: 'noise', freq: 600, to: 1600, dur: .25, vol: .14 }, splat: { wave: 'noise', freq: 1200, to: 200, dur: .2, vol: .28 }, shatter: { wave: 'noise', freq: 4000, to: 1500, dur: .2, vol: .25, filter: 'highpass' },
  step: { wave: 'noise', freq: 1200, dur: .03, vol: .06 }, hockey: { wave: 'noise', freq: 3000, to: 600, dur: .5, vol: .3 }, jump: { wave: 'noise', freq: 400, to: 1200, dur: .3, vol: .2 }, land: { wave: 'noise', freq: 600, to: 120, dur: .25, vol: .35 },
  bell: [{ wave: 'sine', freq: 'C3', dur: 2.4, vol: .3 }, { wave: 'sine', freq: 'D#4', dur: 2, vol: .14 }, { wave: 'sine', freq: 'G#4', dur: 1.6, vol: .1 }, { wave: 'sine', freq: 'C6', dur: .8, vol: .06 }],
  ding: [{ wave: 'sine', freq: 'E6', dur: .9, vol: .2 }, { wave: 'sine', freq: 'B6', dur: .5, vol: .06 }], phone: { wave: 'square', freq: 'A5', dur: .9, vol: .06, arp: [0, 2], step: .03, loop: true },
  door7: [{ wave: 'sine', freq: 'C5', dur: .7, vol: .14 }, { wave: 'sine', freq: 'E5', dur: .7, vol: .11 }, { wave: 'sine', freq: 'G5', dur: .8, vol: .1 }], echo: [{ wave: 'square', freq: 'A4', dur: .25, vol: .14 }, { wave: 'square', freq: 'A5', dur: .25, vol: .12, delay: .25 }, { wave: 'square', freq: 'E5', dur: .5, vol: .1, delay: .5 }, { wave: 'square', freq: 'A5', dur: .5, vol: .05, delay: 1 }],
  flash: [{ wave: 'noise', freq: 6000, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 'C7', to: 'C6', dur: .4, vol: .08 }], flare: { wave: 'noise', freq: 2500, dur: 1, vol: .14, hold: true }, coins: { wave: 'square', freq: 'E6', dur: .5, vol: .08, arp: [0, 7, 12, 7, 0, 12], step: .05, loop: true },
  charge: [{ wave: 'noise', freq: 200, to: 50, dur: 1.2, vol: .6 }, { wave: 'sine', freq: 'A1', to: 'A0', dur: 1, vol: .4 }], wax: { wave: 'noise', freq: 3500, to: 1500, dur: .6, vol: .2 }, chime: { wave: 'sine', freq: 'E6', dur: .7, vol: .14 },
  steam: { wave: 'noise', freq: 4000, to: 800, dur: .9, vol: .2 }, swish: { wave: 'noise', freq: 800, to: 3000, dur: .3, vol: .16 }, ring: { wave: 'sine', freq: 'G4', to: 'D5', dur: .2, vol: .1 }, card: [{ wave: 'saw', freq: 'A2', dur: .5, vol: .14 }, { wave: 'square', freq: 'A3', dur: .3, vol: .1 }],
  pickup: [{ wave: 'pulse', freq: 'E6', dur: .05, vol: .08 }, { wave: 'pulse', freq: 'A6', dur: .08, vol: .08, delay: .05 }], hurt: [{ wave: 'noise', freq: 700, to: 200, dur: .2, vol: .3 }, { wave: 'square', freq: 'C3', to: 'G2', dur: .15, vol: .12 }],
  freeze: [{ wave: 'noise', freq: 6000, to: 2000, dur: 1.2, vol: .25, filter: 'highpass' }, { wave: 'sine', freq: 'B5', to: 'B6', dur: 1.2, vol: .08 }], thaw: { wave: 'noise', freq: 2000, to: 5000, dur: .5, vol: .2 },
  rumble: { wave: 'noise', freq: 120, dur: 2.5, vol: .5, hold: true }, cable: { wave: 'noise', freq: 300, dur: .5, vol: .16, filter: 'bandpass', q: 8 }, deflect: { wave: 'triangle', freq: 'A6', to: 'E7', dur: .08, vol: .1 }
};
S7.audioInit = game => {
  if (!game.audio) return; for (const k in SFX) game.audio.define(k, SFX[k]);
  const on = (ev, f) => S7.bus.on(ev, f);
  on('shot', d => S7.sfx(S7.WEAPONS[d.weapon].sfx)); on('reload', () => S7.sfx('reload')); on('reloaded', () => S7.sfx('reloaded')); on('dry', () => S7.sfx('dry')); on('overheat', () => S7.sfx('overheat'));
  on('scan', () => S7.sfx('scan')); on('crit', () => S7.sfx('crit')); on('kill', d => { if (!d.crit) S7.sfx('kill'); }); on('explode', () => S7.sfx('explode')); on('tink', () => S7.sfx('tink')); on('giggleup', () => S7.sfx('giggleup'));
  on('throw', () => S7.sfx('throw')); on('splat', () => S7.sfx('splat')); on('shatter', () => S7.sfx('shatter')); on('hockey', () => S7.sfx('hockey')); on('jump', () => S7.sfx('jump')); on('land', () => S7.sfx('land'));
  on('bigBell', () => S7.sfx('bell')); on('ding', () => S7.sfx('ding')); on('phoneRing', () => S7.sfx('phone')); on('room7', () => S7.sfx('door7')); on('pickup', () => S7.sfx('pickup')); on('hurt', () => { S7.sfx('hurt'); S7.game.input.rumble && S7.game.input.rumble(.5, .15); });
  on('freeze', () => S7.sfx('freeze')); on('rescue', () => S7.sfx('thaw')); on('switch', () => S7.sfx('swish')); on('ring', () => S7.sfx('ring')); on('card', () => S7.sfx('card')); on('wax', () => S7.sfx('wax')); on('steam', () => S7.sfx('steam')); on('deflect', () => S7.sfx('deflect'));
  on('edelSlot', () => S7.sfx('chime')); on('codeRight', () => S7.sfx('confirm')); on('codeWrong', () => S7.sfx('dry')); on('lawine', () => S7.sfx('rumble')); on('corniceFall', () => S7.sfx('rumble')); on('powerCut', () => S7.sfx('cable')); on('scope', () => S7.sfx('tick'));
  on('skill', d => S7.sfx({ flare: 'flare', makeitrain: 'coins', echo: 'echo', flash: 'flash', charge: 'charge' }[d.skill] || 'confirm'));
  on('crit', () => { if (CHEATS.slowCrit && S7.game) S7.game.timeScale = .25; if (S7.game && S7.game.freeze) S7.game.freeze(.06); });
  on('laugh', d => laugh(d)); on('bark', d => { AU.bark = { who: d.who, text: d.text, i: 0, t: 0 }; });
  on('bandKill', d => { const a = A_(); if (a && a.layer) { a.layer(d.name, 0, .3); a.tempo && a.tempo(d.bpm); } });
  on('area', d => { const A = S7.AREAS[d.to]; if (A && !G.boss && !G.attract) S7.music(A.music); });
  on('boss', d => { if (d.id === 'band' && d.phase === 1) S7.music('band', { restart: true }); if (d.id === 'grau' && d.phase === 1) S7.music('shaft', { restart: true }); if (d.id === 'grau' && d.phase > 1) { const a = A_(); a && a.tempo && a.tempo(128 + d.phase * 12); } if (d.id === 'hansi') S7.music(d.phase === 3 ? 'interview' : 'powderking', { restart: d.phase === 1 }); });
  on('bossDead', d => { S7.music('stage', { restart: true }); });
};
/** each frame (the presenter calls it): the danger layer, the voices typing, the laughs' gains */
S7.audioFrame = dt => {
  const a = A_(); if (!a || !a.ctx || S7.game.headless || !G) return;
  const danger = S7.nearEnemies && S7.nearEnemies(40).length > 0 && G.area !== 'room7';
  if (danger !== AU.layerOn) { AU.layerOn = danger; if (a.layer) try { a.layer('danger', danger ? 1 : 0, danger ? .5 : 1.5); } catch (e) { /* the song has no danger layer */ } }
  // the typed letters speak
  if (TALK.open) {
    const L = TALK.q[TALK.i];
    if (L) { if (AU.lastLine !== TALK.i || AU.lastQ !== TALK.q) { AU.lastLine = TALK.i; AU.lastQ = TALK.q; AU.lastShown = 0; } const n = Math.floor(TALK.shown); for (let k = AU.lastShown; k < n; k++) speakLetter(L.who, L.text, k); AU.lastShown = n; }
  }
  if (AU.bark) { const b = AU.bark; b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t * 38)); for (let k = b.i; k < n; k++) speakLetter(b.who, b.text, k, .7); b.i = n; if (n >= b.text.length) AU.bark = null; }
};

/* ---- the voices: one syllable for every second letter, formants from the vowels ---- */
const VOICES = {
  holle: [420, 5, 1.25, 'triangle', { vib: 6, quiet: .7 }], rosalind: [260, 2, .9, 'pulse', {}], concierge: [120, 1, 1.2, 'sawtooth', { phone: true }], fohn: [160, 4, 1.1, 'sine', { breath: true, glide: true }],
  pim: [520, 3, .8, 'triangle', { echo: true }], murmel: [200, 2, 1.3, 'sawtooth', { muffle: true }], ansel: [110, 1, 1.15, 'sawtooth', {}], dagny: [330, 3, .75, 'pulse', {}], ignaz: [140, 2, 1.2, 'sawtooth', { trem: true }],
  rurik: [95, 2, 1, 'sawtooth', { gravel: true }], kasimir: [180, 7, .9, 'pulse', { yodel: true }], mireille: [300, 4, 1, 'triangle', { breath: true }], brigid: [240, 2, 1, 'pulse', {}], grau: [150, 1, 1, 'square', { ding: true }],
  hansi: [210, 5, .95, 'pulse', {}], tuba: [90, 3, 1, 'sawtooth', {}], villager: [250, 3, 1, 'triangle', {}], exposure: null
};
S7.VOICES = VOICES;
const VOWEL = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
/** the syllable schedule for a text (deterministic): [{ i, vowel, cons, pause, up }] (the voice test reads it) */
S7.syllables = text => {
  const out = [], t = text.toLowerCase(); let n = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === ',' || ch === ';') { out.push({ i, pause: .12 }); continue; }
    if (ch === '.' || ch === '!' || ch === '?') { out.push({ i, pause: .25, q: ch === '?', bang: ch === '!' }); continue; }
    if (!/[a-zäöüß]/.test(ch)) continue;
    if (n++ % 2) continue;
    let v = null; for (let k = i; k < Math.min(t.length, i + 3); k++) if (VOWEL[t[k]]) { v = t[k]; break; }
    out.push({ i, vowel: v || 'a', cons: VOWEL[ch] ? null : ch });
  }
  return out;
};
function speakLetter(who, text, k, vol = 1) {
  const V0 = VOICES[who]; if (!V0) return;
  const a = A_(), c = a && a.ctx; if (!c || c.state !== 'running' || a.muted) return;
  const ch = text[k] || '', lc = ch.toLowerCase();
  if (!/[a-zäöüß]/i.test(ch)) return;
  let idx = 0; for (let i = 0; i <= k; i++) if (/[a-zäöüß]/i.test(text[i])) idx++;
  if (idx % 2 === 0) return;
  const set = S7.game.settings, gainK = (set.voices ?? .8) * (a.sfxVolume ?? 1) * vol * (V0[4].quiet || 1);
  if (gainK <= 0) return;
  const [base, range, rate, wave, ex] = V0, t0 = c.currentTime + .005, dur = (.055 + ((idx * 7) % 5) * .006) * rate;
  let v = 'a'; for (let i = k; i < Math.min(text.length, k + 3); i++) if (VOWEL[text[i].toLowerCase()]) { v = text[i].toLowerCase(); break; }
  const drift = 1 - Math.min(.12, idx * .004), q = /\?/.test(text.slice(k, k + 12)) && text.length - k < 12 ? 1.19 : 1;
  let semi = ((idx * 37 + text.length) % (range * 2 + 1)) - range; if (ex.yodel && idx % 4 === 1) semi += 12;
  const f0 = base * Math.pow(2, semi / 12) * drift * q;
  const osc = c.createOscillator(); osc.type = wave === 'pulse' ? 'square' : wave; osc.frequency.setValueAtTime(f0, t0); if (ex.glide) osc.frequency.linearRampToValueAtTime(f0 * 1.06, t0 + dur);
  if (ex.vib || ex.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = ex.vib || 9; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .05); }
  const F = VOWEL[v], f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain(), out = c.createGain();
  f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = 5; f2.Q.value = 7;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.32 * gainK, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g);
  let tail = g;
  if (ex.phone) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = .7; tail.connect(bp); tail = bp; }
  if (ex.muffle) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; tail.connect(lp); tail = lp; }
  tail.connect(out); out.connect(a._sfxBus || c.destination);
  if (ex.echo) { const d = c.createDelay(.5), fb = c.createGain(); d.delayTime.value = .18; fb.gain.value = .35; tail.connect(d); d.connect(fb); fb.connect(d); d.connect(out); }
  if (!VOWEL[lc] && a._noise) { const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = a._noise; nf.type = 'highpass'; nf.frequency.value = 's z f'.includes(lc) ? 4000 : 1800; ng.gain.setValueAtTime(.12 * gainK, t0); ng.gain.exponentialRampToValueAtTime(.001, t0 + .012); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + .02); }
  if (ex.ding && idx % 10 === 5) S7.sfx('ding', { vol: .3 });
  osc.start(t0); osc.stop(t0 + dur + .02);
}

/* ---- laughter (§10.3): one voice a laugh, formant filters for "ha", breath before each syllable; positional ---- */
const LAUGH = { giggle: [7, .09, 1.6, 'square', 1.04], cackle: [5, .12, 1.1, 'sawtooth', .96], chuckle: [3, .14, .7, 'triangle', .99], wheeze: [5, .11, 1.2, 'noise', 1] };
function laugh(d) {
  const a = A_(), c = a && a.ctx; if (!c || c.state !== 'running' || a.muted || AU.laughs >= 8) return;
  const pose = S7.director.pose, dist = d.d / M; if (dist > 60) return;
  const set = S7.game.settings, gk = (1 - dist / 60) * (a.sfxVolume ?? 1) * (set.voices ?? .8) * .5; if (gk <= .01) return;
  const [n0, syl, pk, wave, slope] = LAUGH[d.style] || LAUGH.giggle, e = d.enemy, n = n0 + (e ? (e.id % 3) : 0), base = 300 * pk * Math.pow(2, ((e && e.pitch) || 0) / 12);
  const pan = c.createStereoPanner ? c.createStereoPanner() : null, out = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = W.grid && !W.grid.los([pose.x, pose.y, pose.z], d.at) ? 900 : 9000;
  out.gain.value = gk; if (pan) pan.pan.value = clamp(Math.sin(angDiff(pose.yaw, Math.atan2(d.at[1] - pose.y, d.at[0] - pose.x))), -1, 1);
  lp.connect(out); if (pan) { out.connect(pan); pan.connect(a._sfxBus || c.destination); } else out.connect(a._sfxBus || c.destination);
  AU.laughs++; const t0 = c.currentTime + .01;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * syl * 1.15, f = base * Math.pow(slope, i), g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + syl);
    if (wave === 'noise' || i % 2 === 0) { const nb = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); nb.buffer = a._noise; nf.type = 'bandpass'; nf.frequency.value = 1500; ng.gain.setValueAtTime(wave === 'noise' ? .4 : .12, t); ng.gain.exponentialRampToValueAtTime(.001, t + (wave === 'noise' ? syl : .03)); nb.connect(nf); nf.connect(ng); ng.connect(lp); nb.start(t); nb.stop(t + syl + .02); }
    if (wave !== 'noise') { const o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); o.type = wave; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .92, t + syl); f1.type = f2.type = 'bandpass'; f1.frequency.value = 750; f2.frequency.value = 1200; f1.Q.value = 4; f2.Q.value = 5; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); o.start(t); o.stop(t + syl + .02); }
  }
  setTimeout(() => { AU.laughs = Math.max(0, AU.laughs - 1); }, (n * syl * 1.15 + .2) * 1000);
}

/* ==== src/70-ui.js ==== */
/* SKILLER7 — the canvas UI kit and the modal screens (10-foot: big type, few items, one idea a screen). Pad, keys and
 * mouse all drive the same focus lists: hover moves the focus, a click picks, a drag moves a slider. */
const INK = '#f4f1ea', PAPER = '#0b0a0c', RED = '#d81e2a', MUTED = '#8a8590', GOLD = '#e0b040';
const UI = S7.UI = { stack: [], marks: [], rects: [], last: null, flakes: [], t: 0 };
const txt = (g, s, x, y, c = INK, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: '#05040a' }, o));
const tw = (s, scale = 1) => E.font.width(String(s), { scale });
S7.txt = txt;
const box = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#16141a', '#0b0a0c'], border: '#3a343e' }, o));
const veil = (g, r, a = .7, c = '#05040a') => px.blend(g, a, 'normal', () => px.rect(g, 0, 0, r.W, r.H, c));
const px = E.px;
UI.box = box; UI.veil = veil;

/* ---- button glyphs: ✕ ○ □ △ drawn as shapes (the font has none); everything else as a key cap ---- */
function chip(g, label, x, y, o = {}) {
  const s = o.scale || 1, h = 9 * s + 2, ps = { '✕': 'x', '○': 'o', '□': 's', '△': 't' }[label];
  if (ps) {
    const w = h, cx = x + w / 2, cy = y + h / 2, c = { x: '#8ab4ff', o: '#ff6a6a', s: '#ff8ad8', t: '#6af0b0' }[ps], rr = 3 * s;
    px.disc(g, cx, cy, h / 2, '#1a1820'); px.disc(g, cx, cy, h / 2 - 1, '#2a2632');
    if (ps === 'x') { px.line(g, cx - rr, cy - rr, cx + rr, cy + rr, c, s + 1); px.line(g, cx - rr, cy + rr, cx + rr, cy - rr, c, s + 1); }
    else if (ps === 'o') { for (let a = 0; a < TAU; a += .3) px.dot(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, c); if (s > 1) for (let a = 0; a < TAU; a += .3) px.dot(g, cx + Math.cos(a) * (rr - 1), cy + Math.sin(a) * (rr - 1), c); }
    else if (ps === 's') { px.rect(g, cx - rr, cy - rr, rr * 2, 1 + (s > 1), c); px.rect(g, cx - rr, cy + rr - (s > 1), rr * 2 + 1, 1 + (s > 1), c); px.rect(g, cx - rr, cy - rr, 1 + (s > 1), rr * 2, c); px.rect(g, cx + rr - (s > 1), cy - rr, 1 + (s > 1), rr * 2, c); }
    else { px.line(g, cx, cy - rr, cx - rr, cy + rr - 1, c, s); px.line(g, cx, cy - rr, cx + rr, cy + rr - 1, c, s); px.line(g, cx - rr, cy + rr - 1, cx + rr, cy + rr - 1, c, s); }
    return w;
  }
  const xb = S7.game && S7.game.input.lastDevice === 'gamepad' ? { A: '#6ad06a', B: '#ff6a5a', X: '#6aa8ff', Y: '#ffd040' }[label] : null;
  const w = tw(label, s) + 6;
  box(g, x, y, w, h, { bg: xb ? [xb, E.shade ? xb : xb] : ['#2a2632', '#1a1820'], border: xb ? '#000' : '#6a6070', gradient: false });
  txt(g, label, x + 3, y + 2, xb ? '#0b0a0c' : INK, { scale: s, outline: false });
  return w;
}
UI.chip = chip;
/** a prompt: the action's glyph and a verb, e.g. [△] CHECK Murmel; returns its width */
function prompt(g, act, verb, x, y, o = {}) {
  const lab = S7.label(act), s = o.scale || 1;
  const w1 = chip(g, lab, x, y, { scale: s });
  txt(g, verb, x + w1 + 4, y + 1 + s, o.color || INK, { scale: s });
  return w1 + 4 + tw(verb, s);
}
UI.prompt = prompt;
const promptW = (act, verb, s = 1) => { const l = S7.label(act); return ('✕○□△'.includes(l) && l.length === 1 ? 9 * s + 2 : tw(l, s) + 6) + 4 + tw(verb, s); };
UI.promptW = promptW;
/** prompts in a row, centred at y */
UI.prompts = (g, r, list, y, s = 1) => { const ws = list.map(([a, v]) => promptW(a, v, s)), tot = ws.reduce((a, b) => a + b, 0) + (list.length - 1) * 14; let x = r.W / 2 - tot / 2; list.forEach(([a, v], i) => { prompt(g, a, v, x, y, { scale: s }); x += ws[i] + 14; }); };

/* ---- input for menus (a modal reads these) ---- */
const In = {
  up: () => S7.game.input.repeat('up', .3, .09), down: () => S7.game.input.repeat('down', .3, .09), left: () => S7.game.input.repeat('left', .3, .07), right: () => S7.game.input.repeat('right', .3, .07),
  ok: () => S7.game.input.pressed('confirm'), back: () => S7.game.input.pressed('cancel') || S7.game.input.pressed('pause'),
  l1: () => S7.game.input.pressed('ring') || S7.game.input.pressed('skill') && S7.game.input.lastDevice !== 'gamepad' && false, r1: () => S7.game.input.pressed('skill'),
  tri: () => S7.game.input.pressed('interact'), sq: () => S7.game.input.pressed('heal'),
  ptr: () => S7.game.input.pointer ? S7.game.input.pointer() : null, click: () => S7.game.input.clicked ? S7.game.input.clicked() : null,
  down0: () => S7.game.input.held.has('Mouse0'), key: c => S7.game.input.held.has(c)
};
UI.In = In;
const inRect = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
UI.inRect = inRect;
let ptrMoved = false, lastPtr = null;
UI.tickPointer = () => { const p = In.ptr(); ptrMoved = !!(p && (!lastPtr || p[0] !== lastPtr[0] || p[1] !== lastPtr[1])); lastPtr = p; };
let prevHeld = new Set();
UI.pc = c => S7.game.input.held.has(c) && !prevHeld.has(c) || !!(S7.keyTaps && S7.keyTaps.has(c));   // a key or button pressed since the last UI step (a quick tap counts too)
UI.endTick = () => { prevHeld = new Set(S7.game.input.held); if (S7.keyTaps) S7.keyTaps.clear(); };

/** a focus list: items { label, value?() , onPick?(), onLeft?(), onRight?(), slider?: { get, set, min, max, step }, disabled? } */
class List {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.rects = []; this.drag = null; this.skip(); }
  skip(d = 1) { const n = this.items.length; for (let k = 0; k < n && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + n) % n; }
  update() {
    const n = this.items.length; if (!n) return;
    if (In.up()) { this.i = (this.i + n - 1) % n; this.skip(-1); S7.sfx('tick'); }
    if (In.down()) { this.i = (this.i + 1) % n; this.skip(1); S7.sfx('tick'); }
    const it = this.items[this.i], p = In.ptr();
    if (ptrMoved && p) this.rects.forEach((r, k) => { if (inRect(p, r) && !this.items[k].disabled && this.i !== k) { this.i = k; S7.sfx('tick'); } });
    const c = In.click();
    if (it && it.slider) {
      const sl = it.slider, st = sl.step || (sl.max - sl.min) / 20;
      if (In.left()) { sl.set(clamp(sl.get() - st, sl.min, sl.max)); S7.sfx('tick'); }
      if (In.right()) { sl.set(clamp(sl.get() + st, sl.min, sl.max)); S7.sfx('tick'); }
      const tr = this.track && this.track[this.i];
      if (tr && p && In.down0() && (this.drag === this.i || inRect(p, [tr[0] - 4, tr[1] - 4, tr[2] + 8, tr[3] + 8]))) { this.drag = this.i; const u = clamp((p[0] - tr[0]) / tr[2], 0, 1); sl.set(Math.round((sl.min + (sl.max - sl.min) * u) / st) * st); }
      if (!In.down0()) this.drag = null;
    } else if (it) { if (In.left() && it.onLeft) { it.onLeft(); S7.sfx('tick'); } if (In.right() && it.onRight) { it.onRight(); S7.sfx('tick'); } }
    if (c) { const k = this.rects.findIndex(r => inRect(c, r)); if (k >= 0 && !this.items[k].disabled) { this.i = k; const t = this.items[k]; if (t.slider) return; if (t.onRight && !t.onPick) { t.onRight(); S7.sfx('tick'); return; } if (t.onPick) { S7.sfx('confirm'); t.onPick(); } return; } }
    if (In.ok() && it && !it.disabled && it.onPick) { S7.sfx('confirm'); it.onPick(); }
  }
  draw(g, x, y, w, o = {}) {
    const s = o.scale || 2, rh = o.rh || (9 * s + 6), rows = o.rows || this.items.length, start = clamp(this.i - Math.floor(rows / 2), 0, Math.max(0, this.items.length - rows));
    this.rects = []; this.track = [];
    for (let k = 0; k < this.items.length; k++) {
      if (k < start || k >= start + rows) { this.rects[k] = [-99, -99, 0, 0]; continue; }
      const it = this.items[k], yy = y + (k - start) * rh, foc = k === this.i, col = it.disabled ? '#4a4650' : foc ? INK : '#b8b0bc';
      this.rects[k] = [x, yy - 2, w, rh];
      if (foc) { px.rect(g, x, yy - 2, 3, rh - 2, RED); px.blend(g, .35, 'normal', () => px.rect(g, x + 3, yy - 2, w - 3, rh - 2, '#3a1418')); }
      const lab = typeof it.label === 'function' ? it.label() : it.label;
      txt(g, lab, x + 8 + (foc ? 2 : 0), yy + 2, col, { scale: s });
      if (it.slider) {
        const sl = it.slider, tx = x + w - 120, ty = yy + rh / 2 - 3, u = (sl.get() - sl.min) / (sl.max - sl.min);
        px.rect(g, tx, ty, 90, 4, '#2a2630'); px.rect(g, tx, ty, Math.round(90 * u), 4, foc ? RED : '#8a3a40'); px.rect(g, tx + Math.round(90 * u) - 2, ty - 3, 4, 10, INK);
        txt(g, sl.fmt ? sl.fmt(sl.get()) : String(+sl.get().toFixed(2)), tx + 96, yy + 2 + (s - 1) * 2, col, { scale: 1 });
        this.track[k] = [tx, ty, 90, 4];
      } else if (it.value) { const v = String(it.value()); txt(g, (it.onLeft || it.onRight ? '← ' : '') + v + (it.onLeft || it.onRight ? ' →' : ''), x + w - 8 - tw((it.onLeft || it.onRight ? '← ' : '') + v + (it.onLeft || it.onRight ? ' →' : ''), s), yy + 2, foc ? GOLD : '#a09880', { scale: s }); }
    }
    if (this.items.length > rows) { if (start > 0) txt(g, '↑', x + w - 10, y - 10, MUTED); if (start + rows < this.items.length) txt(g, '↓', x + w - 10, y + rows * rh, MUTED); }
  }
}
UI.List = List;

/* ---- the modal stack: while one is open the sim is frozen (the play scene checks UI.modal()) ---- */
UI.modal = () => UI.stack[UI.stack.length - 1] || null;
UI.open = (name, arg) => {
  const f = SCREENS[name]; if (!f) throw new Error('unknown screen ' + name);
  const m = f(arg || {}); m.name = name; UI.stack.push(m); S7.UIOPEN = true; S7.game.input.consumeAll(); if (S7.keyTaps) S7.keyTaps.clear(); prevHeld = new Set(S7.game.input.held); emit('ui', { open: name });
  if (S7.game.audio) S7.game.audio.duck(true);
  return m;
};
UI.close = () => { const m = UI.stack.pop(); if (m && m.onClose) m.onClose(); S7.UIOPEN = UI.stack.length > 0; S7.game.input.consumeAll(); if (!S7.UIOPEN && S7.game.audio) S7.game.audio.duck(false); emit('ui', { close: m && m.name }); };
UI.closeAll = () => { while (UI.stack.length) UI.close(); };
UI.update = dt => { UI.t += dt; UI.tickPointer(); const m = UI.modal(); if (!m) { UI.endTick(); return false; } m.update(dt); UI.endTick(); return true; };
UI.draw = (g, r) => { for (const m of UI.stack) m.draw(g, r); };
UI.openFromPause = name => { const game = S7.game; if (game.shell && game.shell.hide) game.shell.hide(); game.resume && game.resume(); game.paused = false; UI.open(name); };
// the sim asks for screens through the bus
S7.bus.on('open', d => {
  if (!S7.game || S7.game.headless) return;
  if (d.screen === 'save') { if (S7.game.saves && S7.game.saves.show) { S7.game.saves.show('save', () => S7.say([['rosalind', 'The clock is wound. Your sins are not.']])); } return; }
  UI.open(d.screen, d);
});

/* ---- a page frame: a title, a body, the prompts at the bottom; 5% safe margins ---- */
function frame(g, r, title, o = {}) {
  veil(g, r, o.veil ?? .82);
  const mx = Math.round(r.W * .05), my = Math.round(r.H * .05);
  E.font.title(g, title, r.W / 2, my + 2, { scale: o.tscale || 3, colors: ['#ffffff', INK, '#c8c0b8'], outline: '#05040a', depth: 2, depthColor: '#3a0a10', align: 'center' });
  if (o.sub) txt(g, o.sub, r.W / 2 - tw(o.sub) / 2, my + 30 + ((o.tscale || 3) - 3) * 8, RED);
  return { x: mx, y: my, w: r.W - mx * 2, h: r.H - my * 2 };
}
UI.frame = frame;
const backPrompt = (g, r, extra = []) => UI.prompts(g, r, extra.concat([['cancel', 'BACK']]), r.H - Math.round(r.H * .05) - 12);

/* ================= the screens ================= */
const SCREENS = {};
UI.SCREENS = SCREENS;

SCREENS.difficulty = () => {
  const D = [['Bunny Hill', 'Half damage. Long reveals. Strong aim assist.'], ['Piste', 'As the mountain intends.'], ['Off-Piste', 'They hit harder, move quicker, fade faster.']];
  const L = new List(D.map(([d]) => ({ label: d.toUpperCase(), onPick: () => { UI.close(); S7.startNewGame(d); } })));
  L.i = 1;
  return { update() { L.update(); if (In.back()) UI.close(); }, draw(g, r) { const F = frame(g, r, 'NEW GAME', { sub: 'HOW STEEP?' }); L.draw(g, r.W / 2 - 110, F.y + 64, 220); const d = D[L.i][1]; txt(g, d, r.W / 2 - tw(d) / 2, F.y + 64 + 3 * 24 + 10, '#c8c0b8'); backPrompt(g, r, [['confirm', 'START']]); } };
};

SCREENS.about = () => {
  const P = S7.ABOUT, st = { p: 0, scroll: 0 };
  const flip = d => { st.p = (st.p + d + P.length) % P.length; st.scroll = 0; S7.sfx('tick'); };
  return {
    update() { if (In.left() || In.l1() || S7.game.input.pressed('ring')) flip(-1); if (In.right() || In.r1()) flip(1); if (In.down()) st.scroll++; if (In.up()) st.scroll = Math.max(0, st.scroll - 1); const c = In.click(); if (c && UI.aboutArrows) { if (inRect(c, UI.aboutArrows[0])) flip(-1); else if (inRect(c, UI.aboutArrows[1])) flip(1); } if (In.back() || In.ok()) UI.close(); },
    draw(g, r) {
      const pg = P[st.p], F = frame(g, r, pg[0], { sub: (st.p + 1) + ' / ' + P.length, tscale: 2 });
      const lines = []; for (const para of pg[1]) { for (const l of E.font.wrap(para, F.w - 16, { scale: 1 })) lines.push(l); lines.push(''); }
      const per = Math.floor((F.h - 64) / 10); st.scroll = Math.min(st.scroll, Math.max(0, lines.length - per));
      lines.slice(st.scroll, st.scroll + per).forEach((l, i) => txt(g, l, F.x + 8, F.y + 44 + i * 10, l.endsWith(':') ? GOLD : INK));
      if (lines.length > per) txt(g, '↑↓ ' + (st.scroll + 1) + '-' + Math.min(lines.length, st.scroll + per) + ' / ' + lines.length, F.x + F.w - 70, F.y + 30, MUTED);
      UI.aboutArrows = [[F.x, r.H / 2 - 10, 16, 20], [F.x + F.w - 16, r.H / 2 - 10, 16, 20]]; txt(g, '←', F.x + 2, r.H / 2 - 6, RED, { scale: 2 }); txt(g, '→', F.x + F.w - 12, r.H / 2 - 6, RED, { scale: 2 });
      UI.prompts(g, r, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

SCREENS.help = () => ({
  update() { if (In.back() || In.ok()) UI.close(); },
  draw(g, r) {
    const F = frame(g, r, 'HOW TO PLAY', { tscale: 2 }), rows = [['move', 'Hold: walk the rail. Let go: stand.'], ['turn', 'Quick turn. On skis: hockey stop.'], ['left', 'Pick a way at a junction (or the stick, or a click).'], ['aim', 'Aim in first person.'], ['scan', 'Scan (while aiming): reveal the laughing.'], ['fire', 'Shoot. The warm spot thaws them at once.'], ['skill', 'Your persona\'s skill.'], ['ring', 'Hold: the Featherbed. Seven killers, one body.'], ['heal', 'Hold: drink Red to heal.'], ['interact', 'Check, talk, pay, rescue.']];
    rows.forEach(([a, t], i) => { prompt(g, a, '', F.x + 10, F.y + 40 + i * 15); txt(g, t, F.x + 64, F.y + 42 + i * 15, INK); });
    txt(g, 'Whiteouts are invisible. Listen for laughter, look for breath and footprints, then scan.', F.x + 10, F.y + 44 + rows.length * 15, GOLD);
    backPrompt(g, r);
  }
});

/* ---- the map: the area's rail graph as a schematic (visited edges solid, seen ones dotted) ---- */
SCREENS.map = () => {
  const areas = () => Object.keys(G.visited).filter(a => a !== 'room7' && S7.AREAS[a]);
  const st = { i: Math.max(0, areas().indexOf(G.area)) };
  return {
    update() { const A = areas(); if (In.left() || S7.game.input.pressed('ring')) st.i = (st.i + A.length - 1) % A.length; if (In.right() || In.r1()) st.i = (st.i + 1) % A.length; if (In.back() || In.ok() || S7.game.input.pressed('map')) UI.close(); },
    draw(g, r) {
      const A = areas(), id = A[st.i] || G.area, L = loadArea(id), area = L.area, F = frame(g, r, area.title, { sub: area.sub, tscale: 2 });
      const ns = Object.values(L.rails.nodes); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const n of ns) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
      const bw = F.w - 40, bh = F.h - 90, k = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0)), ox = F.x + 20 + (bw - (x1 - x0) * k) / 2, oy = F.y + 46 + (bh - (y1 - y0) * k) / 2, P = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
      for (const e of L.rails.edges) {
        if (e.hidden && !G.flags[e.hidden]) continue;
        const seen = G.seen[id + ':e:' + e.id], pts = e.path.pts;
        for (let i = 0; i < pts.length - 1; i += 1) { const a = P(pts[i][0], pts[i][1]), b = P(pts[i + 1][0], pts[i + 1][1]); if (seen) px.line(g, a[0], a[1], b[0], b[1], e.kind === 'ski' ? '#a0c0ff' : e.kind === 'lift' ? GOLD : INK, 2); else if (i % 2 === 0) px.line(g, a[0], a[1], b[0], b[1], '#5a5460', 1); }
        if (e.gate) { const m = e.path.at(e.len / 2), q = P(m.x, m.y), open = G.gates[id + ':' + e.gate]; px.rect(g, q[0] - 3, q[1] - 3, 7, 7, open ? '#3a3a40' : RED); if (open) px.line(g, q[0] - 4, q[1] + 4, q[0] + 4, q[1] - 4, INK); }
      }
      let icons = 0;
      for (const n of ns) {
        const q = P(n.x, n.y), seen = G.seen[id + ':n:' + n.id] || G.walker.node === n.id;
        px.disc(g, q[0], q[1], 2, seen ? INK : '#5a5460');
        if (icons < 20 && seen && n.label && (n.kind === 'door' || n.kind === 'exit' || n.kind === 'stop' && n.label)) { txt(g, n.kind === 'door' ? '7' : n.kind === 'exit' ? '→' + (n.to ? (S7.AREAS[n.to[0]] || {}).title || '' : '') : n.label, q[0] + 4, q[1] - 3, n.kind === 'door' ? RED : '#c8c0b8', { scale: 1 }); icons++; }
      }
      if (id === G.area) { const H = heroPos(), q = P(H.x, H.y); px.disc(g, q[0], q[1], 4, RED); px.disc(g, q[0], q[1], 2, INK); }
      for (const s of statuesHere()) if (id === G.area) { const q = P(s.st.at[0], s.st.at[1]); px.rect(g, q[0] - 2, q[1] - 2, 5, 5, '#80e0ff'); }
      const obj = S7.objective(); txt(g, obj, r.W / 2 - tw(obj) / 2, r.H - Math.round(r.H * .05) - 28, GOLD);
      UI.prompts(g, r, [['left', 'AREA'], ['cancel', 'BACK']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

/* ---- items and the Dossier: tabs of big icons, one line each; pages of text ---- */
SCREENS.dossier = () => {
  const tabs = ['ITEMS', 'DOCUMENTS', 'LIFT PINS', 'EXPOSURES'], st = { t: 0, i: 0, read: null };
  const list = () => st.t === 0 ? Object.keys(G.items).filter(k => G.items[k]).map(k => [S7.ITEMS[k], G.items[k]]) : st.t === 1 ? G.dossier.map(k => [S7.ITEMS[k]]) : st.t === 2 ? G.pins.map(k => [S7.ITEMS[k]]) : G.exposures.map(k => [S7.ITEMS[k]]);
  return {
    update() {
      if (st.read) { if (In.back() || In.ok()) st.read = null; return; }
      if (S7.game.input.pressed('ring') || In.left() && false) { st.t = (st.t + 3) % 4; st.i = 0; S7.sfx('tick'); } if (In.r1()) { st.t = (st.t + 1) % 4; st.i = 0; S7.sfx('tick'); }
      if (In.left()) { st.t = (st.t + 3) % 4; st.i = 0; } if (In.right()) { st.t = (st.t + 1) % 4; st.i = 0; }
      const L = list(); if (In.up()) st.i = Math.max(0, st.i - 1); if (In.down()) st.i = Math.min(L.length - 1, st.i + 1);
      const c = In.click(); if (c && UI.dRects) { UI.dRects.tabs.forEach((rc, k) => { if (inRect(c, rc)) { st.t = k; st.i = 0; } }); UI.dRects.rows.forEach((rc, k) => { if (inRect(c, rc)) { st.i = k; st.read = L[k] && L[k][0]; } }); }
      const p = In.ptr(); if (ptrMoved && p && UI.dRects) UI.dRects.rows.forEach((rc, k) => { if (inRect(p, rc)) st.i = k; });
      if (In.ok() && L[st.i]) st.read = L[st.i][0];
      if (In.back()) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'ITEMS & DOSSIER', { tscale: 2 }), L = list(); UI.dRects = { tabs: [], rows: [] };
      let x = F.x + 10; tabs.forEach((t, k) => { const w = tw(t) + 12; UI.dRects.tabs.push([x, F.y + 32, w, 12]); if (k === st.t) px.rect(g, x, F.y + 32, w, 12, RED); txt(g, t, x + 6, F.y + 34, k === st.t ? INK : MUTED); x += w + 4; });
      if (st.read) { const it = st.read, lines = E.font.wrap(it.text || it.about || '', F.w - 40, { scale: 2 }); txt(g, it.name.toUpperCase(), F.x + 20, F.y + 56, GOLD, { scale: 1 }); lines.slice(0, 7).forEach((l, i) => txt(g, l, F.x + 20, F.y + 72 + i * 18, INK, { scale: 2 })); backPrompt(g, r); return; }
      if (!L.length) txt(g, 'NOTHING YET.', r.W / 2 - tw('NOTHING YET.', 2) / 2, F.y + 90, MUTED, { scale: 2 });
      const start = clamp(st.i - 3, 0, Math.max(0, L.length - 7));
      L.slice(start, start + 7).forEach(([it, n], k) => {
        const i = k + start, y = F.y + 52 + k * 20, foc = i === st.i; UI.dRects.rows[i] = [F.x + 10, y - 2, F.w - 20, 18];
        if (foc) px.rect(g, F.x + 10, y - 2, 3, 16, RED);
        drawIcon(g, it, F.x + 20, y - 1);
        txt(g, it.name + (n > 1 ? ' ×' + n : ''), F.x + 40, y + 1, foc ? INK : '#c8c0b8', { scale: foc ? 2 : 1 });
        if (foc) txt(g, (it.slogan || it.about || '').slice(0, 64), F.x + 40, y + 16 - 2, MUTED);
      });
      txt(g, 'LIFT PINS ' + G.pins.length + '/7   DOCUMENTS ' + G.dossier.length + '/8   RIME ' + G.rime + '   RED ' + Math.round(G.red), F.x + 10, F.y + F.h - 26, GOLD);
      backPrompt(g, r, [['confirm', 'READ'], ['ring', 'TAB']]);
    }
  };
};
function drawIcon(g, it, x, y) {
  const k = it.kind, c = k === 'pin' ? GOLD : k === 'doc' ? '#e8e0d0' : k === 'exposure' ? '#80e0ff' : it.icon === 'flower' ? '#ffffff' : it.icon === 'ember' ? '#ff7a2a' : GOLD;
  if (k === 'pin') { px.disc(g, x + 6, y + 6, 6, '#3a2a10'); px.disc(g, x + 6, y + 6, 5, c); txt(g, String(it.n), x + 4, y + 3, '#3a2a10', { outline: false }); }
  else if (k === 'doc' || k === 'exposure') { px.rect(g, x, y, 11, 14, c); for (let i = 0; i < 4; i++) px.rect(g, x + 2, y + 3 + i * 3, 7, 1, '#6a6460'); }
  else if (it.icon === 'flower') { for (let a = 0; a < TAU; a += TAU / 6) px.disc(g, x + 6 + Math.cos(a) * 4, y + 6 + Math.sin(a) * 4, 2, c); px.disc(g, x + 6, y + 6, 2, GOLD); }
  else if (it.icon === 'ember') { px.disc(g, x + 6, y + 7, 5, '#5a1a0a'); px.disc(g, x + 6, y + 7, 3, c); px.dot(g, x + 5, y + 5, '#ffe0a0'); }
  else { px.rect(g, x + 1, y + 5, 10, 3, c); px.disc(g, x + 2, y + 6, 3, c); px.rect(g, x + 8, y + 8, 2, 3, c); }
}
UI.drawIcon = drawIcon;

/* ---- the seven: portraits, weapon, skill, stats ---- */
UI.rigs = {};
UI.rig = id => UI.rigs[id] || (UI.rigs[id] = new E.Humanoid(Object.assign({ size: 1.3 }, (S7.PEOPLE[id] || {}).rig || (S7.PERSONAS[id] || {}).rig || {})));
SCREENS.personas = () => {
  const st = { i: ORDER.indexOf(G.persona) };
  return {
    update(dt) { if (In.left()) st.i = (st.i + 6) % 7; if (In.right()) st.i = (st.i + 1) % 7; const c = In.click(); if (c && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(c, rc)) st.i = k; }); if (In.back() || In.ok()) UI.close(); for (const id of ORDER) UI.rig(id).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); },
    draw(g, r) { const F = frame(g, r, 'THE SEVEN', { tscale: 2, sub: 'OMA HOLLE\'S WARDROBE' }); UI.pRects = []; personaRow(g, r, F, st.i, true); personaCard(g, r, F, ORDER[st.i]); backPrompt(g, r, [['left', 'NEXT']]); }
  };
};
function personaRow(g, r, F, sel, ro) {
  const n = 7, w = Math.min(46, (F.w - 20) / n), x0 = r.W / 2 - n * w / 2;
  ORDER.forEach((id, k) => {
    const x = x0 + k * w, y = F.y + 44, R0 = G.roster[id], ok = R0.unlocked, foc = k === sel; UI.pRects[k] = [x, y, w - 2, w - 2];
    UI.rig(id).drawPortrait(g, x + 1, y + 1, w - 4, { zoom: 2.4, turn: .5, bg: foc ? ['#5a1a20', '#1a0a0e'] : ['#2a2630', '#101014'], tint: !ok ? '#202020' : R0.frozen ? '#80c0ff' : undefined });
    if (foc) { px.rect(g, x, y + w - 2, w - 2, 2, RED); }
    txt(g, String(k + 1), x + 2, y + 2, ok ? INK : MUTED);
    void ro;
  });
}
function personaCard(g, r, F, id) {
  const P = S7.PERSONAS[id], R0 = G.roster[id], W0 = S7.WEAPONS[P.weapon], y = F.y + 44 + 52;
  if (!R0.unlocked) { txt(g, 'THE COAT IS STILL WET.', r.W / 2 - tw('THE COAT IS STILL WET.', 2) / 2, y + 20, MUTED, { scale: 2 }); return; }
  txt(g, P.name.toUpperCase(), F.x + 16, y, INK, { scale: 2 }); txt(g, P.epithet, F.x + 16, y + 18, RED);
  txt(g, 'HP ' + Math.round(R0.hp) + ' / ' + R0.max + (R0.frozen ? '   FROZEN' : ''), F.x + 16, y + 30, R0.frozen ? '#80e0ff' : INK); E.ui.bar(g, F.x + 16, y + 40, 100, 5, R0.hp / R0.max, '#f4f1ea');
  txt(g, 'WEAPON  ' + W0.name, F.x + 16, y + 52, '#c8c0b8'); txt(g, 'SKILL   ' + P.skillName + (P.skillCost ? ' (' + P.skillCost + ' RED' + (P.skill === 'tuck' ? '/S' : '') + ')' : ''), F.x + 16, y + 62, '#c8c0b8');
  E.font.wrap(P.about, F.w / 2 - 20, { scale: 1 }).forEach((l, i) => txt(g, l, F.x + 16, y + 76 + i * 10, MUTED));
  const st = R0.stats, sx = r.W / 2 + 20; ['power', 'speed', 'crit', 'steady'].forEach((k, i) => { txt(g, k.toUpperCase(), sx, y + 2 + i * 16, INK); for (let s = 0; s < 5; s++) px.rect(g, sx + 60 + s * 12, y + 2 + i * 16, 10, 7, s < st[k] ? GOLD : '#3a3640'); });
}
UI.personaRow = personaRow; UI.personaCard = personaCard;

/* ---- Room 7: the Wardrobe and the Wax Bench ---- */
SCREENS.wardrobe = () => {
  const st = { i: ORDER.indexOf(G.persona) };
  return {
    update(dt) {
      if (In.left()) { st.i = (st.i + 6) % 7; S7.sfx('tick'); } if (In.right()) { st.i = (st.i + 1) % 7; S7.sfx('tick'); }
      const c = In.click(), p = In.ptr(); if (p && ptrMoved && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(p, rc)) st.i = k; });
      const pick = () => { const id = ORDER[st.i]; if (S7.wardrobePick(id)) { S7.sfx('confirm'); UI.close(); } else S7.sfx('dry'); };
      if (c && UI.pRects) UI.pRects.forEach((rc, k) => { if (inRect(c, rc)) { st.i = k; pick(); } });
      if (In.ok()) pick(); if (In.back()) UI.close();
      for (const id of ORDER) UI.rig(id).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    },
    draw(g, r) { const F = frame(g, r, 'THE WARDROBE', { tscale: 2, sub: 'SEVEN COATS. SEVEN HOOKS.' }); UI.pRects = []; personaRow(g, r, F, st.i); personaCard(g, r, F, ORDER[st.i]); backPrompt(g, r, [['confirm', 'WEAR THIS COAT']]); }
  };
};
SCREENS.waxbench = () => {
  const st = { i: ORDER.indexOf(G.persona), s: 0 }, STATS = [['power', '+12% damage a level'], ['speed', '+8% movement and reload'], ['crit', '+10% warm spot radius; from 3, +1 Rime a crit'], ['steady', '-15% sway, +0.4 s reveal']];
  const unlocked = () => ORDER.filter(id => G.roster[id].unlocked);
  return {
    update(dt) {
      const U = unlocked(); let k = U.indexOf(ORDER[st.i]); if (k < 0) k = 0;
      if (S7.game.input.pressed('ring') || In.left()) { k = (k + U.length - 1) % U.length; st.i = ORDER.indexOf(U[k]); S7.sfx('tick'); }
      if (In.r1() || In.right()) { k = (k + 1) % U.length; st.i = ORDER.indexOf(U[k]); S7.sfx('tick'); }
      if (In.up()) st.s = (st.s + 3) % 4; if (In.down()) st.s = (st.s + 1) % 4;
      const p = In.ptr(), c = In.click(); if (p && ptrMoved && UI.wRects) UI.wRects.forEach((rc, j) => { if (inRect(p, rc)) st.s = j; });
      const buy = () => { const id = ORDER[st.i]; if (S7.wax(id, STATS[st.s][0])) { S7.sfx('wax'); S7.barkLine('rosalind', 'Wax them well. The mountain notices.', 2.4); } else S7.sfx('dry'); };
      if (c && UI.wRects) UI.wRects.forEach((rc, j) => { if (inRect(c, rc)) { st.s = j; buy(); } });
      if (In.ok()) buy(); if (In.back()) UI.close();
      UI.rig(ORDER[st.i]).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 });
    },
    draw(g, r) {
      const F = frame(g, r, 'THE WAX BENCH', { tscale: 2, sub: 'WAX THE SKILLS. THE MOUNTAIN NOTICES.' }), id = ORDER[st.i], P = S7.PERSONAS[id], R0 = G.roster[id];
      UI.rig(id).drawPortrait(g, F.x + 16, F.y + 48, 64, { zoom: 3, turn: .5, bg: ['#5a1a20', '#1a0a0e'] });
      txt(g, P.name.toUpperCase(), F.x + 16, F.y + 118, INK, { scale: 1 }); txt(g, P.epithet, F.x + 16, F.y + 128, RED);
      UI.wRects = [];
      STATS.forEach(([k, d], j) => {
        const y = F.y + 50 + j * 26, x = F.x + 100, foc = j === st.s, lv = R0.stats[k], cost = S7.waxCost(id, k); UI.wRects[j] = [x - 4, y - 3, F.w - 104, 24];
        if (foc) px.rect(g, x - 4, y - 3, 3, 22, RED);
        txt(g, k.toUpperCase(), x, y, foc ? INK : '#c8c0b8', { scale: 2 }); for (let s = 0; s < 5; s++) px.rect(g, x + 90 + s * 16, y + 2, 13, 9, s < lv ? GOLD : '#3a3640');
        txt(g, cost === null ? 'MAX' : cost + ' RIME', x + 176, y + 2, cost !== null && G.rime >= cost ? INK : MUTED); if (foc) txt(g, d, x, y + 15, MUTED);
      });
      txt(g, 'RIME ' + G.rime, F.x + F.w - 70, F.y + 34, '#80e0ff', { scale: 1 });
      backPrompt(g, r, [['confirm', 'WAX'], ['left', 'PERSONA']]);
    }
  };
};

/* ---- the code lock: four dials ---- */
SCREENS.codelock = arg => {
  const st = { d: [0, 0, 0, 0], i: 0, msg: '' };
  const tryIt = () => { if (S7.codeOpen(arg.spot, st.d.join(''))) { UI.close(); } else { st.msg = 'CLICK. CLICK. NOTHING.'; S7.sfx('dry'); } };
  return {
    update() {
      if (In.left()) st.i = (st.i + 3) % 4; if (In.right()) st.i = (st.i + 1) % 4;
      if (In.up()) { st.d[st.i] = (st.d[st.i] + 1) % 10; S7.sfx('dial'); } if (In.down()) { st.d[st.i] = (st.d[st.i] + 9) % 10; S7.sfx('dial'); }
      for (let k = 0; k <= 9; k++) if (In.key('Digit' + k) && !UI['dk' + k]) { UI['dk' + k] = true; st.d[st.i] = k; st.i = Math.min(3, st.i + 1); S7.sfx('dial'); } else if (!In.key('Digit' + k)) UI['dk' + k] = false;
      const c = In.click(); if (c && UI.cRects) UI.cRects.forEach(([rc, i, d]) => { if (inRect(c, rc)) { st.i = i; if (d) { st.d[i] = (st.d[i] + d + 10) % 10; S7.sfx('dial'); } } });
      if (c && UI.cOpen && inRect(c, UI.cOpen)) tryIt();
      if (In.ok()) tryIt(); if (In.back()) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'THE SAFE', { tscale: 2, sub: 'FOUR DIALS. A DATE PEOPLE NEVER FORGET.' }); UI.cRects = [];
      for (let i = 0; i < 4; i++) {
        const x = r.W / 2 - 92 + i * 48, y = F.y + 70, foc = i === st.i;
        box(g, x, y, 40, 48, { bg: foc ? ['#3a1418', '#1a0a0e'] : ['#24202a', '#101014'], border: foc ? RED : '#4a4450' });
        E.font.title(g, String(st.d[i]), x + 20, y + 12, { scale: 3, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 1 });
        txt(g, '↑', x + 16, y - 12, foc ? RED : MUTED); txt(g, '↓', x + 16, y + 52, foc ? RED : MUTED);
        UI.cRects.push([[x + 8, y - 16, 24, 14], i, 1], [[x + 8, y + 48, 24, 14], i, -1], [[x, y, 40, 48], i, 0]);
      }
      UI.cOpen = [r.W / 2 - 40, F.y + 150, 80, 18]; box(g, UI.cOpen[0], UI.cOpen[1], 80, 18, { bg: [RED, '#8a1018'] }); txt(g, 'OPEN', r.W / 2 - tw('OPEN', 1) / 2, F.y + 155, INK);
      if (st.msg) txt(g, st.msg, r.W / 2 - tw(st.msg) / 2, F.y + 176, RED);
      backPrompt(g, r, [['up', 'DIAL'], ['confirm', 'OPEN']]);
    }
  };
};

/* ---- an Exposure: the developed photograph, full screen ---- */
SCREENS.exposure = arg => {
  const it = S7.ITEMS[arg.item], st = { t: 0 };
  return {
    update(dt) { st.t += dt; if (st.t > .8 && (In.ok() || In.back() || In.click())) UI.close(); },
    draw(g, r) {
      veil(g, r, 1, '#1a1410');
      const w = r.W * .78, h = r.H * .7, x = (r.W - w) / 2, y = (r.H - h) / 2 - 6, dev = clamp(st.t / 1.6, 0, 1);
      px.rect(g, x - 4, y - 4, w + 8, h + 8, '#e8e0d0'); px.rect(g, x, y, w, h, dev < 1 ? E.shade('#3a3028', dev * .6) : '#4a3e32');
      for (let i = 0; i < 40; i++) px.dot(g, x + (i * 37 % w), y + (i * 53 % h), '#5a4e42');
      if (arg.item === 'exp_board') { for (let k = 0; k < 8; k++) { const cx = x + w * .2 + k * w * .08; px.line(g, x + w * .12, y + h * .18, x + w * .88, y + h * .18 - 6, '#d8d0c0'); px.disc(g, cx, y + h * .34, 5, '#d8d0c0'); px.line(g, cx, y + h * .19, cx, y + h * .3, '#d8d0c0'); } }
      else { for (let k = 0; k < 9; k++) px.rect(g, x + w * .1, y + h * .14 + k * 9, w * .8, 1, '#7a6e60'); }
      const lines = E.font.wrap(it.text, w - 30, { scale: 2 });
      px.blend(g, dev, 'normal', () => lines.forEach((l, i) => txt(g, l, x + w / 2 - tw(l, 2) / 2, y + h * .48 + i * 18, '#fff6d8', { scale: 2 })));
      txt(g, 'EXPOSURE DEVELOPED', x, y + h + 10, GOLD); if (st.t > .8) UI.prompts(g, r, [['confirm', 'CLOSE']], r.H - 18);
    }
  };
};

/* ---- results: the rank badge and six stats ---- */
SCREENS.results = () => {
  const st = { t: 0 }; S7.music && S7.music('stage');
  return {
    update(dt) { st.t += dt; if (st.t > 1 && (In.ok() || In.click())) { UI.close(); S7.closeResults(); } },
    onClose() { S7.closeResults(); },
    draw(g, r) {
      const R0 = G.resultsShow; if (!R0) return; const F = frame(g, r, 'TARGET 0' + R0.target, { sub: 'ELIMINATED', tscale: 3 }), s = R0.stats, cp = s.kills ? Math.round(s.crits / s.kills * 100) : 0;
      const col = { 'DOUBLE BLACK': '#f4f1ea', 'BLACK DIAMOND': '#f4f1ea', 'BLUE SQUARE': '#4a8aff', 'GREEN CIRCLE': '#3ac860' }[R0.rank], bx = r.W / 2, by = F.y + 74;
      if (R0.rank === 'GREEN CIRCLE') px.disc(g, bx, by, 14, col); else if (R0.rank === 'BLUE SQUARE') px.rect(g, bx - 13, by - 13, 26, 26, col);
      else { const d = R0.rank === 'DOUBLE BLACK' ? [-12, 12] : [0]; for (const o of d) { px.poly(g, [[bx + o, by - 15], [bx + o + 12, by], [bx + o, by + 15], [bx + o - 12, by]], '#000'); px.poly(g, [[bx + o, by - 12], [bx + o + 9, by], [bx + o, by + 12], [bx + o - 9, by]], '#1a1a1a'); } }
      txt(g, R0.rank, bx - tw(R0.rank, 2) / 2, by + 20, col, { scale: 2 });
      const rows = [[fmtClock(s.time), 'TIME'], [s.kills, 'WHITEOUTS THAWED'], [cp + '%', 'CRITICAL'], [s.red, 'RED COLLECTED'], [s.frozen, 'PERSONAS FROZEN'], [s.hints, 'HINTS BOUGHT']];
      rows.forEach(([v, l], i) => { const x = r.W / 2 - 150 + (i % 3) * 104, y = by + 44 + Math.floor(i / 3) * 30; txt(g, String(v), x + 44 - tw(String(v), 2) / 2, y, INK, { scale: 2 }); txt(g, l, x + 44 - tw(l) / 2, y + 16, MUTED); });
      txt(g, R0.note, r.W / 2 - tw(R0.note) / 2, F.y + F.h - 34, '#c8c0b8');
      if (st.t > 1) UI.prompts(g, r, [['confirm', 'CONTINUE']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

/* ---- game over: the mountain keeps you ---- */
SCREENS.gameover = () => {
  const L = new List([{ label: 'CONTINUE', onPick: () => { UI.close(); S7.continueGame(); } }, { label: 'QUIT TO TITLE', onPick: () => { UI.close(); S7.game.go('title'); } }]);
  return { update() { L.update(); }, draw(g, r) { const F = frame(g, r, 'THE MOUNTAIN KEEPS YOU.', { tscale: 2, veil: .86 }); txt(g, 'The Sweep is down. Nobody is coming for the Sweep.', r.W / 2 - tw('The Sweep is down. Nobody is coming for the Sweep.') / 2, F.y + 40, MUTED); L.draw(g, r.W / 2 - 90, F.y + 80, 180); UI.prompts(g, r, [['confirm', 'PICK']], r.H - 20); } };
};

/* ---- skip a cutscene ---- */
SCREENS.skip = () => {
  const L = new List([{ label: 'SKIP SCENE', onPick: () => { UI.close(); S7.skipScene(); } }, { label: 'KEEP WATCHING', onPick: () => UI.close() }]);
  return { update() { L.update(); if (In.back()) UI.close(); }, draw(g, r) { veil(g, r, .6); txt(g, 'SKIP SCENE?', r.W / 2 - tw('SKIP SCENE?', 2) / 2, r.H / 2 - 40, INK, { scale: 2 }); L.draw(g, r.W / 2 - 80, r.H / 2 - 12, 160); } };
};
/** skipping a scene runs it to its end at once: pages turn, cards go (skip equals watch) */
S7.skipScene = () => {
  for (let i = 0; i < 120 * 90 && (G.cut || G.mode === 'talk' || G.mode === 'card'); i++) { const I = blankIntent(); if (i % 2 === 0) I.confirm = true; simUpdate(1 / 120, I); }
};

/* ==== src/72-dev.js ==== */
/* SKILLER7 — dev mode (§7.22), from the pause menu: live tuning sliders with a reset, cheats, warps, info. Pages switch
 * with L1/R1 (Q/E); △/Backspace resets the focused value; □/Delete resets the page; ○/Esc closes. Saved in localStorage. */
const DEVKEY = 's7:dev';
S7.saveDev = () => { try { if (typeof localStorage !== 'undefined') localStorage.setItem(DEVKEY, JSON.stringify({ T, CHEATS })); } catch (e) { /* storage refused: the values last for the visit */ } };
S7.loadDev = () => { try { if (typeof localStorage === 'undefined') return; const d = JSON.parse(localStorage.getItem(DEVKEY) || 'null'); if (!d) return; for (const k in d.T || {}) if (TUNING[k]) T[k] = clamp(+d.T[k], TUNING[k].min, TUNING[k].max); for (const k in d.CHEATS || {}) if (k in CHEATS) CHEATS[k] = !!d.CHEATS[k]; } catch (e) { /* a damaged record: the defaults stand */ } };
const CHEAT_NAMES = { god: 'God mode', infRed: 'Infinite Red', oneHit: 'One-hit kills', revealAll: 'Reveal all', ghost: 'Ghost through gates', allPersonas: 'All personas', showRails: 'Show rails and nodes', showVolumes: 'Show hit volumes and warm spots', showShots: 'Show camera shots', freeCam: 'Free camera', hideHud: 'Hide HUD', slowCrit: 'Slow motion on crits', showFps: 'Show FPS and sim hash' };
SCREENS.dev = () => {
  const pages = ['TUNING', 'CHEATS', 'WARP', 'INFO'], st = { p: 0, confirm: false };
  const resetAll = () => { S7.tuneReset(); for (const k in CHEATS) CHEATS[k] = false; S7.saveDev(); S7.splash('ALL DEFAULTS', 1); };
  const resetBtn = { label: 'RESET ALL TO DEFAULTS', onPick: resetAll };
  const tun = () => [resetBtn].concat(Object.keys(TUNING).map(k => ({ key: k, label: TUNING[k].label, slider: { get: () => T[k], set: v => S7.tune(k, v), min: TUNING[k].min, max: TUNING[k].max, step: TUNING[k].step, fmt: v => String(+v.toFixed(2)) + (v === TUNING[k].def ? '' : '*') } })));
  const che = () => [resetBtn].concat(Object.keys(CHEATS).map(k => ({ key: k, label: CHEAT_NAMES[k], value: () => CHEATS[k] ? 'ON' : 'OFF', onPick: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); }, onLeft: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); }, onRight: () => { CHEATS[k] = !CHEATS[k]; S7.saveDev(); } })));
  const warp = () => {
    const A = Object.keys(S7.AREAS), w = st.warp || (st.warp = { a: Math.max(0, A.indexOf(G.area)), n: 0 }), area = S7.AREAS[A[w.a]], nodes = Object.keys(area.nodes);
    w.n = clamp(w.n, 0, nodes.length - 1);
    return [resetBtn,
      { label: 'AREA', value: () => A[w.a] + ' ' + area.title, onLeft: () => { w.a = (w.a + A.length - 1) % A.length; w.n = 0; st.list = null; }, onRight: () => { w.a = (w.a + 1) % A.length; w.n = 0; st.list = null; } },
      { label: 'NODE', value: () => nodes[w.n] + (area.nodes[nodes[w.n]].label ? ' ' + area.nodes[nodes[w.n]].label : ''), onLeft: () => { w.n = (w.n + nodes.length - 1) % nodes.length; }, onRight: () => { w.n = (w.n + 1) % nodes.length; } },
      { label: 'WARP THERE', onPick: () => { UI.closeAll(); S7.enterArea(A[w.a], nodes[w.n], { noAutosave: true }); } },
      { label: 'START A BOSS', value: () => ['grau 00C', 'band 01B', 'hansi 01F (1)', 'hansi slalom (2)', 'hansi interview (3)'][st.boss || 0], onLeft: () => { st.boss = ((st.boss || 0) + 4) % 5; }, onRight: () => { st.boss = ((st.boss || 0) + 1) % 5; },
        onPick: () => { UI.closeAll(); const b = st.boss || 0; if (b === 0) { S7.enterArea('00C', 'n1', { noAutosave: true, silent: true }); S7.startBoss('grau'); } else if (b === 1) { S7.enterArea('01B', 'br', { noAutosave: true, silent: true }); S7.startBoss('band'); } else if (b === 2) { S7.enterArea('01F', 'a3', { noAutosave: true, silent: true }); S7.startBoss('hansi', 1); } else if (b === 3) { S7.enterArea('01F', 'sl0', { noAutosave: true, silent: true }); setFlag('avalaughDown'); S7.startBoss('hansi', 2); } else { S7.enterArea('01F', 'sl1', { noAutosave: true, silent: true }); setFlag('avalaughDown'); S7.startBoss('hansi', 3); } } },
      { label: 'PLAY A BEAT', value: () => Object.keys(S7.BEATS)[st.beat || 0], onLeft: () => { st.beat = ((st.beat || 0) + Object.keys(S7.BEATS).length - 1) % Object.keys(S7.BEATS).length; }, onRight: () => { st.beat = ((st.beat || 0) + 1) % Object.keys(S7.BEATS).length; }, onPick: () => { UI.closeAll(); S7.runBeat(Object.keys(S7.BEATS)[st.beat || 0]); } },
      { label: 'GIVE: 3 EDELWEISS, KEY, EMBER, PINS', onPick: () => { G.items.edelweiss = 3; G.items.servicekey = 1; G.items.ember = 1; for (let i = 1; i <= 7; i++) giveItem('pin' + i); S7.splash('GIVEN', 1); } },
      { label: '+100 RED', onPick: () => addRed(100) }, { label: '+20 RIME', onPick: () => { G.rime += 20; } },
      { label: 'REVIVE ALL', onPick: () => { for (const id of ORDER) { const r = G.roster[id]; r.frozen = false; r.statue = null; r.hp = r.max; } } },
      { label: 'KILL ALL', onPick: () => S7.killAll() },
      { label: 'TRIGGER A WAVE', value: () => Object.keys(W.area.waves || {})[st.wave || 0] || '(none here)', onLeft: () => { st.wave = Math.max(0, (st.wave || 0) - 1); }, onRight: () => { st.wave = Math.min(Object.keys(W.area.waves || {}).length - 1, (st.wave || 0) + 1); }, onPick: () => { const k = Object.keys(W.area.waves || {})[st.wave || 0]; if (k) { delete G.waves[G.area + ':' + k]; UI.closeAll(); S7.startWave(k); } } },
      { label: 'FREEZE THE ACTIVE PERSONA', onPick: () => { UI.closeAll(); S7.freezeActive(); } }];
  };
  let L = new List(tun());
  const setPage = p => { st.p = (p + pages.length) % pages.length; L = new List(st.p === 0 ? tun() : st.p === 1 ? che() : st.p === 2 ? warp() : []); S7.sfx('tick'); };
  return {
    update() {
      const pc = UI.pc;
      if (st.confirm) { if (In.ok()) { if (st.p === 0) S7.tuneReset(); else if (st.p === 1) for (const k in CHEATS) CHEATS[k] = false; S7.saveDev(); st.confirm = false; } else if (pc('Escape') || pc('Pad1')) st.confirm = false; return; }
      if (pc('Pad4') || pc('KeyQ')) setPage(st.p - 1);
      if (pc('Pad5') || pc('KeyE')) setPage(st.p + 1);
      const c = In.click(); if (c && UI.devTabs) UI.devTabs.forEach((rc, k) => { if (inRect(c, rc)) setPage(k); });
      if (st.p === 2) { const keep = L.i; L.items = warp(); L.i = keep; }
      L.update();
      const it = L.items[L.i];
      if ((pc('Pad3') || pc('Backspace')) && it) { if (it.key && TUNING[it.key]) S7.tuneReset(it.key); else if (it.key && it.key in CHEATS) CHEATS[it.key] = false; S7.saveDev(); S7.sfx('tick'); }
      if ((pc('Pad2') || pc('Delete')) && st.p < 2) st.confirm = true;
      if (pc('Escape') || pc('Pad1') || pc('Pad9')) UI.close();
    },
    draw(g, r) {
      const F = frame(g, r, 'DEV MODE', { tscale: 2 });
      UI.devTabs = []; let x = F.x + 10; pages.forEach((t, k) => { const w = tw(t) + 12; UI.devTabs.push([x, F.y + 32, w, 12]); if (k === st.p) px.rect(g, x, F.y + 32, w, 12, RED); txt(g, t, x + 6, F.y + 34, k === st.p ? INK : MUTED); x += w + 4; });
      if (st.p === 3) {
        const H = heroPos(), sh = S7.director.shotKey || '-', rows = ['AREA ' + G.area + '   EDGE ' + G.walker.edge + '   S ' + Math.round(G.walker.s) + '   NODE ' + G.walker.node, 'SHOT ' + sh + '   CUTS ' + S7.director.cuts, 'MODE ' + G.mode + '   AIM ' + G.aim.on + '   PERSONA ' + G.persona, 'ENEMIES ' + aliveEnemies().length + ' alive, ' + G.enemies.filter(e => e.alive && e.vis > .5).length + ' revealed', 'HERO ' + [H.x, H.y, H.z].map(v => (v / M).toFixed(1)).join(', ') + ' m', 'SIM HASH ' + S7.hash() + '   SEED ' + S7.seed, 'VERSION ' + S7.VERSION + '   BUILD ' + S7.BUILD, 'ENGINE ' + (E.versionLabel ? E.versionLabel() : E.version) + '   BACKEND ' + (S7.presenter && S7.presenter.backend ? S7.presenter.backend() : 'headless')];
        rows.forEach((l, i) => txt(g, l, F.x + 12, F.y + 52 + i * 13, INK));
      } else L.draw(g, F.x + 8, F.y + 50, F.w - 16, { scale: 1, rh: 12, rows: Math.floor((F.h - 76) / 12) });
      if (st.confirm) { box(g, r.W / 2 - 110, r.H / 2 - 24, 220, 48, { bg: ['#3a1418', '#1a0a0e'], border: RED }); txt(g, 'RESET THIS PAGE TO DEFAULTS?', r.W / 2 - tw('RESET THIS PAGE TO DEFAULTS?') / 2, r.H / 2 - 14, INK); UI.prompts(g, r, [['confirm', 'YES'], ['cancel', 'NO']], r.H / 2 + 4); }
      UI.prompts(g, r, [['ring', 'PAGE'], ['interact', 'RESET VALUE'], ['heal', 'RESET PAGE'], ['cancel', 'CLOSE']], r.H - Math.round(r.H * .05) - 12);
    }
  };
};

/* ==== src/75-hud.js ==== */
/* SKILLER7 — the HUD (§7.19): minimal, inside a 5% safe margin. Prompts follow the device used last. World markers
 * (junction branches, interactables, warm spots) are projected; the mouse hovers and clicks them (the UI turns that into
 * intents). Also the dialog box, title cards, the letterbox, the Featherbed ring, splashes, tips and the flurry. */
const HUD = { hpTrail: {}, laughs: [], hurts: [], marks: [], flurry: 0, flakes: [] };
S7.HUD = HUD;
S7.bus.on('laugh', d => { HUD.laughs.push({ at: d.at, loud: d.loud, t: 0 }); if (HUD.laughs.length > 12) HUD.laughs.shift(); });
S7.bus.on('hurt', d => { HUD.hurts.push({ from: d.from && (d.from.p || [d.from.x, d.from.y, d.from.z]), t: 0 }); if (HUD.hurts.length > 6) HUD.hurts.shift(); HUD.redT = .3; });
S7.flurry = () => { HUD.flurry = .6; if (S7.game && S7.game.flash && !S7.reduceMotion()) S7.game.flash('#ffffff', .3, .5); emit('flurry', {}); };
S7.reduceMotion = () => !!(S7.game && S7.game.settings && S7.game.settings.reduceMotion);
/** a world point to game pixels (the 3D world's own projection in the page, the director's in Node) */
S7.proj = (p, r) => {
  if (S7.presenter && S7.presenter.project) { const q = S7.presenter.project(p); if (q !== undefined) return q; }
  const q = S7.director.project(p, S7.aspect || 16 / 9); if (!q) return null; return [(q[0] + 1) / 2 * (r ? r.W : 427), (q[1] + 1) / 2 * (r ? r.H : 240)];
};
const safe = r => [Math.round(r.W * .05), Math.round(r.H * .05)];
const firstName = id => S7.PEOPLE[id] ? (S7.PEOPLE[id].persona ? S7.PERSONAS[id].name.split(' ')[0].toUpperCase() : S7.PEOPLE[id].name) : String(id).toUpperCase();
/** a tip's text with its glyphs ({move} -> the chip) */
function richText(g, s, x, y, scale = 1, color = INK) {
  const parts = s.split(/(\{[a-z0-9]+\})/); let w = 0;
  for (const p of parts) { if (!p) continue; const m = p.match(/^\{([a-z0-9]+)\}$/); if (m) w += (g ? chip(g, S7.label(m[1]), x + w, y - 1, { scale }) : promptW(m[1], '', scale) - 4) + 4; else { if (g) txt(g, p, x + w, y + scale, color, { scale }); w += tw(p, scale); } }
  return w;
}

/** mouse picks in the world: hover a marker, click it (filled in from the last frame's marks) */
UI.worldIntent = I => {
  const p = In.ptr(), c = In.click(), dev = S7.game.input.lastDevice;
  if (dev !== 'mouse' && dev !== 'keyboard') return;
  for (const m of HUD.marks) {
    const hov = p && inRect(p, m.rect), hit = c && inRect(c, m.rect);
    if (m.kind === 'branch' && (hov && ptrMoved || hit)) { I.branch = m.i; if (hit) I.clickGo = true; }
    if (m.kind === 'spot' && hit) { I.interact = true; I.interactId = m.id; }
    if (m.kind === 'ring' && hov) I.ringSel = m.id;
    if (m.kind === 'choice' && (hov || hit)) { if (hov) TALK.sel = m.i; if (hit) I.pickChoice = m.i; }
    if (m.kind === 'talk' && hit && !TALK.choices) I.confirm = true;
  }
  if (G.aim.on && p && (S7.game.settings.mouseMode === 'Pointer' || !S7.mouse.locked && dev === 'mouse')) I.pointerAim = [clamp((p[0] - S7.W_ / 2) / (S7.W_ / 2), -1, 1), clamp((p[1] - S7.H_ / 2) / (S7.H_ / 2), -1, 1)];
};

UI.hud = (g, r, dt) => {
  S7.W_ = r.W; S7.H_ = r.H; S7.aspect = r.W / r.H; HUD.marks = [];
  const [mx, my] = safe(r);
  for (const l of HUD.laughs) l.t += dt; HUD.laughs = HUD.laughs.filter(l => l.t < 1.4);
  for (const h of HUD.hurts) h.t += dt; HUD.hurts = HUD.hurts.filter(h => h.t < 1);
  HUD.redT = Math.max(0, (HUD.redT || 0) - dt);
  if (G.card) { drawCard(g, r); return; }
  // the letterbox
  if (G.letterbox > 0) { const h = Math.round(r.H * .12 * G.letterbox); px.rect(g, 0, 0, r.W, h, '#000'); px.rect(g, 0, r.H - h, r.W, h, '#000'); }
  if (HUD.redT > 0 && !S7.reduceMotion()) px.blend(g, HUD.redT, 'normal', () => { px.rect(g, 0, 0, r.W, 6, '#a00010'); px.rect(g, 0, r.H - 6, r.W, 6, '#a00010'); px.rect(g, 0, 0, 6, r.H, '#a00010'); px.rect(g, r.W - 6, 0, 6, r.H, '#a00010'); });
  const hide = CHEATS.hideHud || G.cut || G.attract && false;
  if (!hide && G.area !== 'room7') { if (G.aim.on && G.aim.k > .6) aimHud(g, r); else railMarks(g, r); }
  if (!hide) { personaBlock(g, r, mx, my); topRight(g, r, mx, my); bossBar(g, r); statueMarker(g, r); if (G.area !== 'room7') laughRipples(g, r); }
  if (G.area === 'room7' && !hide && !TALK.open) { const ns = G.near; if (ns) { const t = ns.label || ''; txt(g, t, r.W / 2 - tw(t, 2) / 2, r.H - my - 44, GOLD, { scale: 2 }); } }
  if (G.mode === 'ring') ringHud(g, r);
  // splashes
  SPLASH.forEach((s, i) => {
    const u = 1 - s.t / s.t0, a = Math.min(1, s.t / .2);
    if (s.big) { const sc = 4 + (u < .1 ? (1 - u / .1) * 1.5 : 0); px.blend(g, a, 'normal', () => { E.font.title(g, s.text, r.W / 2, r.H * .36 - sc * 4, { scale: Math.round(sc), colors: ['#ffffff', '#f4f1ea', '#e8e0d8'], outline: '#05040a', depth: 2, depthColor: '#5a0a12', align: 'center' }); px.rect(g, r.W / 2 - tw(s.text, Math.round(sc)) / 2, r.H * .36 + sc * 5, tw(s.text, Math.round(sc)), 2, RED); }); }
    else if (s.at) { const q = S7.proj(s.at, r); if (q) txt(g, s.text, q[0] - tw(s.text) / 2, q[1] - 14 - u * 10, INK); }
    else txt(g, s.text, r.W / 2 - tw(s.text, s.small ? 1 : 2) / 2, r.H * .58 + i * 18, s.small ? GOLD : INK, { scale: s.small ? 1 : 2 });
  });
  // barks (subtitles that don't stop play)
  if (!TALK.open) BARKS.forEach((b, i) => { const s = firstName(b.who) + ': ' + b.text, sc = S7.game.settings.textSize === 'Large' ? 2 : 1, lines = E.font.wrap(s, r.W * .8, { scale: sc }); lines.forEach((l, k) => txt(g, l, r.W / 2 - tw(l, sc) / 2, r.H - my - 70 - (BARKS.length - 1 - i) * 22 + k * 10 * sc, k === 0 ? '#f4e8d0' : '#f4e8d0', { scale: sc })); });
  // the tip
  if (TIPS.cur && !TALK.open && !G.cut) { const d = S7.TIPDEFS[TIPS.cur.id]; if (d) { const w = richText(null, d.text, 0, 0, 1); const x = r.W / 2 - w / 2, y = r.H * .7; px.blend(g, .6, 'normal', () => px.rect(g, x - 8, y - 4, w + 16, 16, '#05040a')); richText(g, d.text, x, y, 1, INK); if (TIPS.cur.t > 14) TIPS.cur = null; } }
  if (!hide) bottomPrompts(g, r, my);
  if (TALK.open) dialogBox(g, r);
  drawFlurry(g, r, dt);
  if (CHEATS.showFps) txt(g, 'HASH ' + S7.hash() + '  ' + (S7.game.fps ? Math.round(S7.game.fps) + ' FPS' : ''), mx, r.H - my - 8, '#80ff80');
};

function personaBlock(g, r, mx, my) {
  const id = G.persona, R0 = G.roster[id], rig = UI.rig(id);
  rig.drawPortrait(g, mx, my, 32, { zoom: 2.2, turn: .5, bg: ['#2a1418', '#0b0a0c'], tint: G.mode === 'frozen' ? '#80c0ff' : undefined });
  px.rect(g, mx, my + 32, 32, 1, RED);
  txt(g, firstName(id), mx + 38, my, INK, { scale: 2 });
  const tr = HUD.hpTrail[id] = approach(HUD.hpTrail[id] ?? R0.hp, R0.hp, 30 / 120), w = 80;
  px.rect(g, mx + 38, my + 18, w + 2, 7, '#05040a'); px.rect(g, mx + 39, my + 19, Math.round(w * tr / R0.max), 5, RED); px.rect(g, mx + 39, my + 19, Math.round(w * R0.hp / R0.max), 5, INK);
  // the Red vial
  const vx = mx + 38 + w + 8, vh = 30, k = clamp(G.red / 300, 0, 1);
  px.rect(g, vx - 1, my - 1, 8, vh + 2, '#05040a'); px.rect(g, vx, my + vh - Math.round(vh * k), 6, Math.round(vh * k), G.healing ? '#ff4050' : '#c01020'); px.rect(g, vx + 1, my, 1, vh, '#ffffff22'.slice(0, 7));
  txt(g, String(Math.round(G.red)), vx + 10, my + vh - 8, '#ff6070');
  if (G.persona === 'dagny' && G.tuck) txt(g, 'TUCK', mx + 38, my + 28, GOLD);
}
function topRight(g, r, mx, my) {
  const x = r.W - mx, s = 'RIME ' + G.rime;
  px.poly(g, [[x - tw(s) - 14, my + 3], [x - tw(s) - 10, my - 1], [x - tw(s) - 6, my + 3], [x - tw(s) - 10, my + 9]], '#80e0ff'); txt(g, s, x - tw(s), my, '#c0f0ff');
  if (G.target === 1) for (let i = 0; i < 3; i++) { const cx = x - 40 + i * 14, cy = my + 22, on = (G.items.edelweiss || 0) > i; for (let a = 0; a < TAU; a += TAU / 6) px.disc(g, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2, on ? '#ffffff' : '#3a3640'); px.disc(g, cx, cy, 2, on ? GOLD : '#2a2630'); }
  if (G.pins.length) txt(g, 'PINS ' + G.pins.length + '/7', x - tw('PINS ' + G.pins.length + '/7'), my + 32, MUTED);
  if (S7.ECHO && S7.ECHO.on) S7.echoHud(g, r, x, my);
}
function bossBar(g, r) {
  const b = G.boss; if (!b || !b.name || b.phase === 3 && b.id === 'hansi') return;
  const w = Math.round(r.W * .4), x = r.W / 2 - w / 2, y = Math.round(r.H * .05) + 42;
  txt(g, b.name + (b.id !== 'band' ? '  ' + ['', 'I', 'II', 'III'][b.phase] : ''), r.W / 2 - tw(b.name + '  II') / 2, y, INK);
  px.rect(g, x - 1, y + 10, w + 2, 6, '#05040a'); px.rect(g, x, y + 11, Math.round(w * clamp(b.bar ?? 1, 0, 1)), 4, RED);
  if (b.thaw) { const s = 'THE THAW ' + Math.ceil(b.thaw.t); txt(g, s, r.W / 2 - tw(s, 2) / 2, y + 22, '#80e0ff', { scale: 2 }); }
  if (b.id === 'band') { const nm = ['tuba', 'accordion', 'trumpet', 'snare']; nm.forEach((n, i) => { const mu = b.m[i], on = mu.alive && S7.trackOn(n, b.step), xx = x + i * (w / 4); txt(g, n.toUpperCase(), xx + 2, y + 18, !mu.alive ? '#3a3640' : on ? GOLD : MUTED); }); }
}
function statueMarker(g, r) {
  const S = statuesHere(); if (!S.length || G.area === 'room7') return;
  const H = heroPos(), st = S[0].st, d = Math.hypot(st.at[0] - H.x, st.at[1] - H.y) / M, q = S7.proj([st.at[0], st.at[1], st.at[2] + 20], r);
  const name = firstName(S[0].id), s = name + ' ' + Math.round(d) + ' M';
  if (q && q[0] > 10 && q[0] < r.W - 10 && q[1] > 10 && q[1] < r.H - 10) { px.rect(g, q[0] - 3, q[1] - 3, 7, 7, '#80e0ff'); txt(g, s, q[0] - tw(s) / 2, q[1] - 14, '#c0f0ff'); }
  else { const a = q ? Math.atan2(q[1] - r.H / 2, q[0] - r.W / 2) : Math.PI / 2, cx = r.W / 2 + Math.cos(a) * r.W * .38, cy = r.H / 2 + Math.sin(a) * r.H * .36; px.poly(g, [[cx + Math.cos(a) * 8, cy + Math.sin(a) * 8], [cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6], [cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6]], '#80e0ff'); txt(g, s, cx - tw(s) / 2, cy + 8, '#c0f0ff'); }
  if (G.nearStatue) { const k = G.statueHold / 1.5; px.rect(g, r.W / 2 - 40, r.H * .62, 80, 5, '#05040a'); px.rect(g, r.W / 2 - 39, r.H * .62 + 1, Math.round(78 * k), 3, '#80e0ff'); }
}
function laughRipples(g, r) {
  if (!S7.game.settings.laughCues) return;
  const L = HUD.laughs.slice().sort((a, b) => b.loud - a.loud).slice(0, 4), pose = S7.director.pose;
  for (const l of L) {
    const dx = l.at[0] - pose.x, dy = l.at[1] - pose.y, a = angDiff(pose.yaw, Math.atan2(dy, dx)), q = S7.proj(l.at, r);
    if (q && q[0] > 20 && q[0] < r.W - 20 && Math.abs(a) < .6) continue;   // (on screen: the laugh speaks for itself)
    const sx = r.W / 2 + Math.sin(a) * r.W * .46, sy = r.H / 2 - Math.cos(a) * r.H * .44, k = (1 - l.t / 1.4), th = 1 + Math.round(l.loud * 3);
    px.blend(g, k, 'normal', () => { for (let i = -3; i <= 3; i++) { const b = a + i * .05; px.rect(g, r.W / 2 + Math.sin(b) * r.W * .46 - th / 2, r.H / 2 - Math.cos(b) * r.H * .44 - th / 2, th, th, RED); } });
    void sx; void sy;
  }
}
/** rail mode: the junction's branches as markers (hover, click), the interactables, the ski fork */
function railMarks(g, r) {
  const wk = G.walker;
  if (wk.node && G.mode === 'play') {
    const B = branchesAt(wk.node), n = W.rails.nodes[wk.node];
    if (B.length >= 2) B.forEach((e, i) => {
      const atA = e.a === wk.node, p = edgePos(W.rails, e, atA ? Math.min(e.len, 2.6 * M) : Math.max(0, e.len - 2.6 * M)), q = S7.proj([p.x, p.y, p.z + 1.2 * M], r);
      if (!q) return; const foc = i === wk.branch, other = atA ? e.B : e.A, lab = e.label || other.label || '', gated = e.gate && !gateOpen(e.gate), sz = foc ? 7 : 5;
      px.poly(g, [[q[0], q[1] - sz], [q[0] + sz, q[1]], [q[0], q[1] + sz], [q[0] - sz, q[1]]], foc ? RED : '#f4f1ea'); px.poly(g, [[q[0], q[1] - sz + 2], [q[0] + sz - 2, q[1]], [q[0], q[1] + sz - 2], [q[0] - sz + 2, q[1]]], foc ? '#ff6070' : '#0b0a0c');
      if (gated) { const gd = gateDef(e.gate); px.rect(g, q[0] - 3, q[1] - 14, 7, 6, GOLD); if (gd && gd.who) UI.rig(gd.who).drawPortrait(g, q[0] + 8, q[1] - 18, 14, { zoom: 1.6, turn: .5 }); }
      if (foc && lab) txt(g, lab, q[0] - tw(lab) / 2, q[1] + 9, INK);
      HUD.marks.push({ kind: 'branch', i, rect: [q[0] - 10, q[1] - 10, 20, 20] });
    });
    void n;
  }
  const e = curEdge();
  if (e && e.kind === 'ski' && wk.fork) wk.fork.options.forEach((id, i) => { const x = W.rails.byId[id], p = edgePos(W.rails, x, Math.min(x.len, 6 * M)), q = S7.proj([p.x, p.y, p.z + 1.5 * M], r); if (!q) return; const foc = i === wk.fork.pick, lab = x.label || x.B.label || ('WAY ' + (i + 1)); txt(g, lab, q[0] - tw(lab, foc ? 2 : 1) / 2, q[1] - 6, foc ? RED : INK, { scale: foc ? 2 : 1 }); HUD.marks.push({ kind: 'branch', i, rect: [q[0] - 20, q[1] - 10, 40, 20] }); });
  // interactables near: a diamond over each
  const H = heroPos();
  for (const s of W.spots) {
    if (s.kind === 'pickup' || s.kind === 'lookout' || s.kind === 'exposure' || s.hidden && !flag(s.hidden) || s.once && spotDone(s) || s.kind === 'gate' && gateOpen(s.gate)) continue;
    const d = Math.hypot(s.pos[0] - H.x, s.pos[1] - H.y); if (d > 7 * M) continue;
    const q = S7.proj([s.pos[0], s.pos[1], s.pos[2] + 2.2 * M], r); if (!q) continue;
    const near = G.near === s, k = near ? 5 : 3, c = s.kind === 'room7' ? RED : s.kind === 'phone' ? GOLD : '#80e0ff';
    px.poly(g, [[q[0], q[1] - k], [q[0] + k, q[1]], [q[0], q[1] + k], [q[0] - k, q[1]]], c);
    if (s.kind === 'room7') txt(g, '7', q[0] - 2, q[1] - 16, RED, { scale: 1 });
    if (s.kind === 'phone' && !spotDone(s) && Math.floor(G.time * 4) % 2) txt(g, 'RING', q[0] - 9, q[1] - 16, GOLD);
    HUD.marks.push({ kind: 'spot', id: s.id, rect: [q[0] - 8, q[1] - 8, 16, 16] });
  }
}
/** aim mode: the reticle (at the centre or the pointer), ammo, scan ring, reload, warm spot diamonds, damage chevrons, the scope */
function aimHud(g, r) {
  const P = S7.PERSONAS[G.persona], W0 = S7.WEAPONS[P.weapon], w = wstate(G.persona), cx = G.aim.pointer ? (G.aim.pointer[0] + 1) / 2 * r.W : r.W / 2, cy = G.aim.pointer ? (G.aim.pointer[1] + 1) / 2 * r.H : r.H / 2;
  if (G.aim.scope) { const rad = r.H * .42; px.rect(g, 0, 0, r.W / 2 - rad, r.H, '#000'); px.rect(g, r.W / 2 + rad, 0, r.W, r.H, '#000'); for (let y = 0; y < r.H; y++) { const dy = y - r.H / 2, hw = Math.sqrt(Math.max(0, rad * rad - dy * dy)); px.rect(g, r.W / 2 - rad, y, rad - hw, 1, '#000'); px.rect(g, r.W / 2 + hw, y, rad - hw, 1, '#000'); } px.line(g, r.W / 2 - rad, r.H / 2, r.W / 2 + rad, r.H / 2, '#000'); px.line(g, r.W / 2, r.H / 2 - rad, r.W / 2, r.H / 2 + rad, '#000'); }
  // warm spots: revealed and within 30 m
  const eye = S7.eye(), pulse = 4 + Math.sin(G.time * 8) * 1.5;
  const dia = (p, c = '#ff8a30') => { const q = S7.proj(p, r); if (!q) return; px.poly(g, [[q[0], q[1] - pulse - 2], [q[0] + pulse + 2, q[1]], [q[0], q[1] + pulse + 2], [q[0] - pulse - 2, q[1]]], c); px.poly(g, [[q[0], q[1] - pulse], [q[0] + pulse, q[1]], [q[0], q[1] + pulse], [q[0] - pulse, q[1]]], '#0b0a0c00'.slice(0, 7)); px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#fff0c0'); };
  for (const e of G.enemies) {
    if (!e.alive || e.vis < .5 || V.dist([e.x, e.y, e.z], eye) > 30 * M) continue;
    if (e.spots) { for (const s of bloomSpots(e)) if (e.spots[s.i]) dia(s.pos); }
    else if (!(e.ai === 'plow' && !(e.back > 0))) dia(warmPos(e));
    if (CHEATS.showVolumes) { const q = S7.proj([e.x, e.y, e.z + 16], r); if (q) txt(g, e.type + ' ' + Math.round(e.hp), q[0], q[1], '#80ff80'); }
  }
  for (const b of S7.bossTargets()) if (b.kind === 'warm' && b.window) dia(b.pos, GOLD);
  // the reticle
  const col = w.reloadT > 0 || w.overT > 0 ? MUTED : INK, k = 1 + w.flash * 2;
  if (W0.kind === 'pellets' || W0.kind === 'cone') { const rr = W0.kind === 'cone' ? 18 : 12; for (let a = 0; a < TAU; a += .35) px.dot(g, cx + Math.cos(a) * rr * k * .8, cy + Math.sin(a) * rr * k * .8, col); }
  else if (W0.kind === 'lob') { px.line(g, cx - 6, cy, cx + 6, cy, col); for (let i = 1; i <= 3; i++) px.line(g, cx - 3, cy + i * 5, cx + 3, cy + i * 5, col); }
  else { const gap = 3 + k * 1.5; px.rect(g, cx - gap - 5, cy, 5, 1, col); px.rect(g, cx + gap + 1, cy, 5, 1, col); px.rect(g, cx, cy - gap - 5, 1, 5, col); px.rect(g, cx, cy + gap + 1, 1, 5, col); px.dot(g, cx, cy, RED); }
  // ammo pips, heat, reload
  const n = W0.mag, ww = Math.min(4, Math.floor(120 / n)), ax = r.W / 2 - n * ww / 2, ay = r.H * .62;
  if (W0.heat) { px.rect(g, r.W / 2 - 30, ay, 60, 4, '#2a2630'); px.rect(g, r.W / 2 - 30, ay, Math.round(60 * (1 - w.mag / n)), 4, w.overT > 0 ? '#ff5020' : GOLD); if (w.overT > 0) txt(g, 'OVERHEATED', r.W / 2 - tw('OVERHEATED') / 2, ay + 8, '#ff7040'); }
  else { for (let i = 0; i < n; i++) px.rect(g, ax + i * ww, ay, Math.max(1, ww - 1), 4, i < w.mag ? INK : '#3a3640'); if (w.reloadT > 0) { const tot = W0.perShell ? W0.reload * W0.mag : W0.reload, u = 1 - w.reloadT / tot; txt(g, 'RELOADING', r.W / 2 - tw('RELOADING') / 2, ay + 8, MUTED); px.rect(g, r.W / 2 - 30, ay + 18, Math.round(60 * clamp(u, 0, 1)), 2, INK); } }
  // the scan cooldown ring
  if (G.scanCd > 0) { const u = 1 - G.scanCd / 1.2; for (let a = 0; a < TAU * u; a += .2) px.dot(g, cx + Math.sin(a) * 15, cy - Math.cos(a) * 15, '#80e0ff'); }
  // damage chevrons
  for (const h of HUD.hurts) if (h.from && h.from[0] !== undefined) { const pose = S7.director.pose, a = angDiff(pose.yaw, Math.atan2(h.from[1] - pose.y, h.from[0] - pose.x)), x = r.W / 2 + Math.sin(a) * 40, y = r.H / 2 - Math.cos(a) * 40; px.blend(g, 1 - h.t, 'normal', () => px.poly(g, [[x + Math.sin(a) * 8, y - Math.cos(a) * 8], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], [x - Math.cos(a) * 6, y - Math.sin(a) * 6]], RED)); }
}
function bottomPrompts(g, r, my) {
  const y = r.H - my - 12, wk = G.walker, e = curEdge(), L = [];
  if (G.mode === 'ring') L.push(['ring', 'RELEASE TO CHANGE']);
  else if (TALK.open || G.mode !== 'play') return;
  else if (G.aim.on) { L.push(['fire', 'FIRE'], ['scan', 'SCAN']); const P = S7.PERSONAS[G.persona]; if (P.skill !== 'tuck') L.push(['skill', P.skill === 'longlook' ? (G.aim.scope ? 'SCOPE OFF' : 'SCOPE') : P.skillName.toUpperCase()]); if (!S7.WEAPONS[P.weapon].heat) L.push(['reload', 'RELOAD']); }
  else if (G.nearStatue) L.push(['interact', 'HOLD: CHIP ' + firstName(G.nearStatue) + ' FREE']);
  else if (G.near) L.push(['interact', G.near.kind === 'r7' ? G.near.label : (G.near.kind === 'room7' ? 'ENTER' : G.near.kind === 'phone' ? 'ANSWER' : G.near.kind === 'gate' ? 'USE' : 'CHECK') + ' ' + (G.near.label || '')]);
  else if (e && e.kind === 'ski') { L.push(['move', 'TUCK']); L.push(['turn', 'STOP']); if (G.persona === 'dagny') L.push(['skill', 'RACE TUCK']); if (wk.fork) L.push(['left', 'PICK A LINE']); }
  else if (e && e.kind === 'lift') L.push(['aim', 'AIM']);
  else if (wk.node) { const B = branchesAt(wk.node); if (B.length >= 2) { L.push(['move', 'GO']); L.push(['left', 'PICK']); } else if (B.length === 1 && wk.arrived === B[0].id) L.push(['turn', 'TURN BACK']); else L.push(['move', 'GO']); }
  if (G.area !== 'room7' && !G.aim.on && G.mode === 'play' && !(e && e.kind === 'ski') && aliveEnemies().length) L.push(['aim', 'AIM']);
  if (L.length) UI.prompts(g, r, L.slice(0, 4), y);
}
function dialogBox(g, r) {
  const Lq = TALK.q[TALK.i]; if (!Lq) return;
  const sc = S7.game.settings.textSize === 'Large' ? 3 : 2, bw = Math.round(r.W * .78), bx = Math.round((r.W - bw) / 2), lh = 9 * sc + 2, bh = lh * 3 + 18, by = r.H - Math.round(r.H * .05) - bh - (TALK.choices ? 14 : 0);
  box(g, bx, by, bw, bh, { bg: ['#0e0c10', '#05040a'], border: '#4a2a30' });
  const who = Lq.who, P = S7.PEOPLE[who], name = firstName(who), hasP = P && (P.rig || P.blob) && who !== 'exposure';
  let tx = bx + 8;
  if (hasP && P.rig) { UI.rig(who).drawPortrait(g, bx + 6, by + 6, bh - 12, { zoom: 2.6, turn: .5, bg: ['#2a1418', '#0b0a0c'] }); tx = bx + bh; UI.rig(who)._talk = TALK.shown < Lq.text.length; }
  else if (hasP && P.blob) { drawMurmel(g, bx + 6 + (bh - 12) / 2, by + bh / 2 + 6, (bh - 12) / 2); tx = bx + bh; }
  const nameT = TALK.t < .4 ? 1 + (1 - TALK.t / .4) * .4 : 1;
  txt(g, name, tx, by - 9 - (nameT > 1 ? 2 : 0), RED, { scale: nameT > 1.2 ? 2 : 1 });
  const shown = Lq.text.slice(0, Math.floor(TALK.shown)), lines = E.font.wrap(shown, bx + bw - tx - 8, { scale: sc }), vis = lines.slice(-3);
  vis.forEach((l, i) => txt(g, l, tx, by + 8 + i * lh, Lq.who === 'exposure' ? '#ffe8b0' : INK, { scale: sc }));
  HUD.marks.push({ kind: 'talk', rect: [bx, by, bw, bh] });
  if (TALK.choices && TALK.i === TALK.q.length - 1 && TALK.shown >= Lq.text.length) {
    let x = bx + 10; TALK.choices.forEach((c, i) => { const w = tw(c) + 14, foc = i === TALK.sel; box(g, x, by + bh + 2, w, 13, { bg: foc ? [RED, '#8a1018'] : ['#2a2630', '#16141a'], border: foc ? INK : '#4a4450' }); txt(g, c, x + 7, by + bh + 5, INK); HUD.marks.push({ kind: 'choice', i, rect: [x, by + bh + 2, w, 13] }); x += w + 6; });
  } else if (TALK.shown >= Lq.text.length && Math.floor(UI.t * 3) % 2) txt(g, '▸', bx + bw - 12, by + bh - 12, RED, { scale: 1 });
}
function drawMurmel(g, x, y, R0) { px.disc(g, x, y, R0, '#c8c4bc'); px.disc(g, x - 1, y - 1, R0 - 2, '#f4f4f0'); px.disc(g, x - R0 * .6, y - R0 * .8, R0 * .3, '#f4f4f0'); px.disc(g, x + R0 * .6, y - R0 * .8, R0 * .3, '#f4f4f0'); px.rect(g, x - R0 * .4, y - R0 * .2, 2, 2, '#1a1414'); px.rect(g, x + R0 * .3, y - R0 * .2, 2, 2, '#1a1414'); px.disc(g, x, y + R0 * .15, 2, '#2a1a1a'); px.line(g, x - R0, y + R0 * .3, x + R0, y - R0 * .1, '#d83a2a', 2); }
UI.drawMurmel = drawMurmel;
function drawCard(g, r) {
  const c = G.card; px.rect(g, 0, 0, r.W, r.H, '#000');
  const lines = E.font.wrap(c.title, r.W * .86, { scale: 4 }), sc = lines.length > 2 ? 3 : 4;
  const L2 = E.font.wrap(c.title, r.W * .86, { scale: sc }), y0 = r.H / 2 - L2.length * (sc * 9) / 2 - (c.sub ? 10 : 0);
  if (c.target && c.who && UI.rig(c.who)) UI.rig(c.who).drawPortrait(g, r.W - Math.round(r.W * .05) - 64, Math.round(r.H * .1), 64, { zoom: 3, turn: .3, bg: '#000', tint: '#101010' });
  L2.forEach((l, i) => E.font.title(g, l, r.W / 2, y0 + i * sc * 9, { scale: sc, colors: ['#ffffff', '#f4f1ea', '#d8d0c8'], outline: '#000', depth: 2, depthColor: '#3a0a10', align: 'center' }));
  if (c.sub) txt(g, c.sub, r.W / 2 - tw(c.sub, 2) / 2, y0 + L2.length * sc * 9 + 10, c.dead ? RED : RED, { scale: 2 });
}
function ringHud(g, r) {
  px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
  const R0 = Math.min(r.W, r.H) * .32, cx = r.W / 2, cy = r.H / 2;
  ORDER.forEach((id, k) => {
    const a = -Math.PI / 2 + k / 7 * TAU, x = cx + Math.cos(a) * R0 - 16, y = cy + Math.sin(a) * R0 - 16, ok = S7.canPick(id), sel = G.ringSel === id, cur = G.persona === id, ro = G.roster[id];
    UI.rig(id).drawPortrait(g, x, y, 32, { zoom: 2.2, turn: .5, bg: sel ? ['#8a1a20', '#2a0a0e'] : ['#2a2630', '#101014'], tint: !ro.unlocked ? '#141414' : ro.frozen ? '#80c0ff' : !ok ? '#606060' : undefined });
    if (sel) { px.rect(g, x - 2, y - 2, 36, 2, RED); px.rect(g, x - 2, y + 32, 36, 2, RED); }
    if (cur) px.rect(g, x, y + 34, 32, 1, INK);
    txt(g, String(k + 1), x + 1, y + 1, INK);
    if (id === 'ansel' && G.area !== 'room7') txt(g, 'ROOM 7 ONLY', x + 16 - tw('ROOM 7 ONLY') / 2, y + 36, MUTED);
    HUD.marks.push({ kind: 'ring', id, rect: [x, y, 32, 32] });
  });
  const id = G.ringSel || G.persona, P = S7.PERSONAS[id];
  txt(g, P.name.toUpperCase(), cx - tw(P.name.toUpperCase(), 2) / 2, cy - 12, INK, { scale: 2 }); txt(g, P.epithet + ' · ' + S7.WEAPONS[P.weapon].name, cx - tw(P.epithet + ' · ' + S7.WEAPONS[P.weapon].name) / 2, cy + 6, RED);
  txt(g, P.skillName, cx - tw(P.skillName) / 2, cy + 16, MUTED);
}
function drawFlurry(g, r, dt) {
  if (HUD.flurry > 0) { HUD.flurry -= dt; if (!S7.reduceMotion()) for (let i = 0; i < 60; i++) { const s = (i * 97 + Math.floor(HUD.flurry * 60) * 13) % 1000; px.rect(g, (s * 7.3) % r.W, (s * 3.1 + (.6 - HUD.flurry) * 300) % r.H, 2 + i % 3, 2 + i % 2, '#ffffff'); } }
}
UI.richText = richText;

/* ==== src/85-bot.js ==== */
/* SKILLER7 — the bot: it writes the same intents a player's devices do. It walks routes (BFS over the rail graph),
 * fights (scan when nothing shows; turn at human rates after a reaction time; fire on the warm spot), heals, rescues,
 * turns pages. The scripted playthrough and attract mode use it (attract lets it cheat). */
const BOT = { route: null, i: 0, t: 0, stepT: 0, on: false, log: [], target: null, reactT: 0, cheat: false, choice: null, failed: null, done: false, lastNode: null, interactT: 0, phase: 0, metrics: {} };
S7.BOT = BOT;
const rnode = n => W.rails.nodes[n];
/** a path of edges from the walker's node (or edge end) to a node, over edges usable now */
function botPath(to) {
  const wk = G.walker; let start = wk.node;
  if (!start) { const e = curEdge(); if (!e) return null; start = wk.dir > 0 ? e.b : e.a; }
  if (start === to) return [];
  const prev = { [start]: null }, q = [start];
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    for (const e of W.rails.adj[n]) {
      if (!edgeOpen(e, n)) continue;
      if (e.gate && !gateOpen(e.gate)) { const g = gateDef(e.gate); if (!g) continue; if (g.kind === 'patrol' && G.persona !== 'ansel') continue; if (g.kind === 'flag' && !flag(g.flag)) continue; if (g.kind === 'key' && !G.items[g.item]) continue; if (['buyout', 'icelock', 'delegate', 'echowall', 'crystal', 'cornice', 'serac'].includes(g.kind)) continue; }
      if (e.kind === 'jump' && G.persona !== 'dagny') continue;
      const m = e.a === n ? e.b : e.a; if (m in prev) continue; prev[m] = [n, e]; q.push(m);
    }
  }
  if (!(to in prev)) return null;
  const path = []; for (let n = to; prev[n]; n = prev[n][0]) path.unshift(prev[n][1]);
  return path;
}
S7.botPath = botPath;
const statueNode = st => { let best = null, bd = 1e9; for (const id in W.rails.nodes) { const n = rnode(id), d = Math.hypot(n.x - st.at[0], n.y - st.at[1]); if (d < bd) { bd = d; best = id; } } return best; };

/** the bot's choice of target: a boss's open window, anything close, a shot at us, the nearest revealed */
function botTarget() {
  const eye = S7.eye(), H = heroPos(), cands = [];
  for (const b of S7.bossTargets()) {
    if (V.dist(b.pos, eye) > 70 * M || !W.grid.los(eye, b.pos)) continue;
    if (b.kind === 'warm' && b.window) cands.push({ p: b.pos, pri: 1, r: b.r, boss: true });
    else if (b.kind === 'body' && b.window && G.boss && G.boss.id === 'band') cands.push({ p: b.pos, pri: 4, r: b.r });
  }
  for (const e of G.enemies) {
    if (!e.alive || e.ambient) continue;
    const d = Math.hypot(e.x - H.x, e.y - H.y);
    if (!(e.vis > .5) && !BOT.cheat) continue;
    if (d > 60 * M) continue;
    if (!W.grid.los(eye, [e.x, e.y, e.z + 20])) continue;
    let p;
    if (e.spots) { const s = bloomSpots(e).find(x => e.spots[x.i]); p = s ? s.pos : [e.x, e.y, e.z + 20]; }
    else if (e.ai === 'plow' && !(e.back > 0)) p = [e.x, e.y, e.z + 18 * e.size];
    else p = warmPos(e);
    cands.push({ p, pri: d < 9 * M ? 0 : 3, d, r: warmR() * .7, e });
  }
  for (const pr of G.proj) if (pr.team === 'enemy' && V.dist(pr.p, eye) < 16 * M) cands.push({ p: pr.p, pri: 2, r: 5, proj: true });
  cands.sort((a, b) => a.pri - b.pri || (a.d || 0) - (b.d || 0));
  return cands[0] || null;
}
/** turn the aim toward a point at human rates; returns the angular error (radians) */
function botAimAt(I, p, dt) {
  const eye = S7.eye(), v = V.sub(p, eye), yaw = Math.atan2(v[1], v[0]), pit = Math.atan2(v[2], Math.hypot(v[0], v[1]));
  const a = G.aim, rate = (BOT.cheat ? 900 : 160) * dt, dy = angDiff(a.yaw, yaw) / DEG, dp = (pit - a.pitch) / DEG;
  I.lookYaw = clamp(dy, -rate, rate); I.lookPitch = clamp(dp, -rate * .7, rate * .7);
  if (BOT.cheat) { a.yaw = yaw; a.pitch = pit; I.lookYaw = I.lookPitch = 0; }
  return Math.hypot(angDiff(a.yaw + I.lookYaw * DEG, yaw), pit - a.pitch - I.lookPitch * DEG);
}
const aimPoint = p => { const eye = S7.eye(), v = V.sub(p, eye); return [Math.atan2(v[1], v[0]), Math.atan2(v[2], Math.hypot(v[0], v[1]))]; };

/** the fighting part: true while it is busy fighting (the route waits) */
function botFight(I, dt) {
  const t = botTarget(), threats = aliveEnemies().filter(e => Math.hypot(e.x - heroPos().x, e.y - heroPos().y) < 30 * M).length;
  const eye0 = S7.eye(), bossOn = !!(G.boss && !G.boss.done && G.boss.phase !== 3) && S7.bossTargets().some(b => V.dist(b.pos, eye0) < 60 * M && W.grid.los(eye0, b.pos));
  if (!t && !threats && !bossOn) { BOT.target = null; return false; }
  const e = curEdge();
  if (e && e.kind === 'ski' && !G.walker.skiStop && !(G.boss && G.boss.aimOnTheMove)) { if (threats && !G.aval) I.turn = true; else return false; }
  if (G.aval) return false;
  I.aim = true;
  if (!G.aim.on || G.aim.k < .9) return true;
  const w = wstate(G.persona), W0 = S7.WEAPONS[S7.PERSONAS[G.persona].weapon];
  if (!t) { if (G.scanCd <= 0) I.scan = true; BOT.target = null; return true; }
  if (BOT.target !== t.p && (!BOT.target || V.dist(BOT.target, t.p) > 40)) { BOT.reactT = BOT.cheat ? 0 : .25; }
  BOT.target = t.p; BOT.reactT -= dt;
  if (BOT.reactT > 0) return true;
  const err = botAimAt(I, t.p, dt), dist = V.dist(t.p, S7.eye()), tol = Math.max(.4 * DEG, Math.atan(t.r / Math.max(1, dist)) * (W0.kind === 'pellets' || W0.kind === 'cone' ? 3 : 1));
  if (w.mag <= 0 && !W0.heat && w.reloadT <= 0) { I.reload = true; return true; }
  if (err < tol || W0.kind === 'cone' && err < 10 * DEG && dist < W0.range * M) { I.fire = true; I.firePressed = true; }
  if (G.persona === 'rurik' && threats >= 3 && G.red > 30 && !(G.cd.makeitrain > 0)) I.skill = true;
  return true;
}

/** one route step's intents; returns true when the step is done */
function botStep(s, I, dt) {
  const wk = G.walker;
  if (s.area) return G.area === s.area;
  if (s.wait !== undefined) { BOT.stepT += 0; return BOT.t - BOT.stepStart >= s.wait; }
  if (s.until) return s.until(G);
  if (s.flag) return flag(s.flag);
  if (s.goto) {
    const [ar, n] = s.goto.includes(':') ? s.goto.split(':') : [G.area, s.goto];
    if (G.area !== ar || BOT.stepArea && G.area !== BOT.stepArea) return true;
    if (wk.node === n || wk.passed === n && G.time - wk.passedAt < .05) return true;
    const path = botPath(n); if (!path) { BOT.noPath = n; return false; }
    if (!path.length) { I.move = true; if (G.persona === 'dagny' && (s.tuck || G.aval)) I.skillDown = true; return false; }
    if (wk.node) { const B2 = branchesAt(wk.node), i = B2.indexOf(path[0]); if (B2.length === 1 && wk.arrived === path[0].id && rnode(wk.node).kind !== 'start') { I.turn = BOT.t % .3 < .02; return false; } if (i >= 0) { I.branch = i; I.move = true; if (wk.branch !== i) I.move = BOT.t % .2 < .1 ? true : I.move; } }
    else {
      const e = curEdge(), toward = wk.dir > 0 ? e.b : e.a;
      if (path.length && e.kind !== 'ski' && e.kind !== 'lift' && e.kind !== 'jump') { const goingRight = path[0] && (path[0].a === toward || path[0].b === toward); void goingRight; }
      if (e.kind === 'ski' && wk.fork) { const out = branchesAt(wk.fork.node).filter(x => x.id !== e.id && x.a === wk.fork.node), nx = path.find(x => out.includes(x)); if (nx) I.branch = out.indexOf(nx); }
      if (!(e.kind === 'walk' || e.kind === 'stairs') || true) I.move = true;
      // walking the wrong way along an edge (after a turn): turn round
      if ((e.kind === 'walk' || e.kind === 'stairs') && !e.oneWay) { const ahead = toward; const p2 = botPath(n); if (p2 && p2.length && ahead !== n && p2[0] && !(p2[0].a === ahead || p2[0].b === ahead) && p2[0].id !== e.id) { /* fine */ } if (ahead !== n && p2 && p2[0] && p2[0].id === e.id) I.turn = true; }
    }
    if (G.persona === 'dagny' && (s.tuck || G.aval)) I.skillDown = true;
    return false;
  }
  if (s.interact) {
    if (s.done && s.done(G)) return true;
    const sp = W.spots.find(x => x.id === s.interact); if (!sp) { BOT.failed = 'no spot ' + s.interact; return false; }
    if (sp.node && wk.node !== sp.node) return botStep({ goto: sp.node }, I, dt) && false;
    if (s.done && s.done(G)) return true;
    if (TALK.open || G.mode !== 'play') return false;
    if (BOT.interactT <= 0) { I.interact = true; BOT.interactT = .6; BOT.pressed = (BOT.pressed || 0) + 1; }
    BOT.interactT -= dt;
    if (!s.done) return BOT.pressed >= (s.times || 1) && !TALK.open;
    return false;
  }
  if (s.choose !== undefined) { BOT.choice = s.choose; return true; }
  if (s.switch) {
    if (G.persona === s.switch) return true;
    if (G.mode === 'play' && !G.aim.on) I.pick = ORDER.indexOf(s.switch) + 1;
    return false;
  }
  if (s.wardrobe) { S7.wardrobePick(s.wardrobe); return true; }
  if (s.wax) { for (const [id, stat] of s.wax) S7.wax(id, stat); return true; }
  if (s.code) { if (S7.codeOpen) S7.codeOpen(s.code.spot, s.code.code); return true; }
  if (s.shoot) {   // a far target: scope in (Ignaz), line it up, fire
    const tg = (W.targets || []).find(t => t.id === s.shoot); if (!tg) { BOT.failed = 'no target ' + s.shoot; return false; }
    if (flag('hit:' + key(tg.id))) { I.aim = false; return true; }
    if (tg.when && !flag(tg.when)) return false;
    I.aim = true; if (!G.aim.on || G.aim.k < .9) return false;
    if (G.persona === 'ignaz' && !G.aim.scope && !(G.cd.longlook > 0)) I.skill = true;
    const err = botAimAt(I, tg.pos, dt);
    if (err < .25 * DEG && G.aim.scope && wstate(G.persona).cool <= 0 && BOT.t - (BOT.lastShot || 0) > .8) { I.fire = I.firePressed = true; BOT.lastShot = BOT.t; }
    if (wstate(G.persona).mag <= 0) I.reload = true;
    return false;
  }
  if (s.flash || s.charge || s.echo) {
    const id = s.flash || s.charge || s.echo;
    if (s.echo) { if (gateOpen(id)) return true; if (!G.aim.on && BOT.t - (BOT.lastSkill || -9) > 1.2) { I.skill = true; BOT.lastSkill = BOT.t; } return false; }
    let p;
    if (s.flash) { const sp = W.spots.find(x => x.id === id); if (spotDone(sp)) { I.aim = false; return true; } p = sp.pos; }
    else { if (gateOpen(id)) { I.aim = false; return true; } const g = gateDef(id); p = [g.at[0] * M, g.at[1] * M, W.grid.floor(g.at[0] * M, g.at[1] * M) + 4]; }
    I.aim = true; if (!G.aim.on || G.aim.k < .9) return false;
    const err = botAimAt(I, s.charge ? lobAim(p) : p, dt);
    if (err < .6 * DEG && BOT.t - (BOT.lastSkill || -9) > 1.5) { I.skill = true; BOT.lastSkill = BOT.t; }
    return false;
  }
  if (s.skill) { if (BOT.t - (BOT.lastSkill || -9) > 1) { I.skill = true; BOT.lastSkill = BOT.t; return true; } return false; }
  if (s.clear) return !nearEnemies(45).length && !(G.pending && G.pending.length);
  if (s.boss) return !!flag(s.boss);
  if (s.hold) { I[s.hold] = true; return s.untilFn ? s.untilFn(G) : false; }
  if (s.fn) { s.fn(G, I); return true; }
  BOT.failed = 'unknown step ' + JSON.stringify(s); return false;
}
/** where to aim a lob (Control Charge: 620 u/s, gravity 300) so it lands on p: the low arc */
function lobAim(p) {
  const eye = S7.eye(), dx = p[0] - eye[0], dy = p[1] - eye[1], d = Math.hypot(dx, dy), h = p[2] - eye[2], v = 620, g = 300;
  const disc = v ** 4 - g * (g * d * d + 2 * h * v * v); const th = disc >= 0 ? Math.atan((v * v - Math.sqrt(disc)) / (g * d)) : Math.PI / 4;
  const k = d * Math.tan(th) - (30 * d / v);   // (the shell starts with a little lift)
  return [p[0], p[1], eye[2] + k];
}

/** the bot's intents for this step */
function botIntent(dt) {
  const I = blankIntent(); BOT.t += dt;
  if (!G) return I;
  if (G.mode === 'talk') { if (BOT.t % .3 < dt * 1.5) { I.confirm = true; if (TALK.choices) I.pickChoice = BOT.choice ?? 0; } return I; }
  if (G.mode === 'card') { if (G.card && G.card.t0 - G.card.t > .9) I.confirm = true; return I; }
  if (G.mode === 'results') { if (!BOT.resT) BOT.resT = BOT.t; if (BOT.t - BOT.resT > 1.2) { S7.closeResults(); BOT.resT = 0; } return I; }
  if (G.mode === 'gameover') { BOT.failed = BOT.failed || 'game over in ' + G.area; return I; }
  if (G.mode !== 'play' || G.cut) return I;
  // heal when low and safe
  const r = G.roster[G.persona];
  if (BOT.stepIdx === BOT.i && BOT.t - BOT.stepStart > 600) BOT.failed = BOT.failed || 'no progress at step ' + BOT.i + ' in ' + G.area + ' (persona ' + G.persona + ', statues ' + statuesHere().length + ')';
  if (r.hp < r.max * .75 && G.red > 20 && !nearEnemies(20).length && !G.proj.length && !(G.boss && S7.bossTargets().some(b => V.dist(b.pos, S7.eye()) < 40 * M)) && !G.aim.on && !(curEdge() && curEdge().kind !== "walk" && curEdge().kind !== "stairs" && !G.walker.node)) { I.heal = true; return I; }
  if (r.hp < r.max * .5 && G.red > 10 && !G.aim.on) I.heal = true;
  if (r.hp < r.max * .45 && G.red > 15 && !(G.boss && G.boss.id === 'grau' && G.boss.hat > 0) && !G.proj.some(p => p.team === 'enemy' && V.dist(p.p, S7.eye()) < 12 * M) && !aliveEnemies().some(e => Math.hypot(e.x - heroPos().x, e.y - heroPos().y) < 9 * M)) { I.heal = true; return I; }
  // rescue a frozen statue first (the Sweep)
  const sts = statuesHere();
  if (sts.length && G.persona === 'ansel') {
    if (nearEnemies(12).length && botFight(I, dt)) return I;
    const st = sts[0], n = statueNode(st.st);
    if (G.nearStatue) { I.interactHeld = true; return I; }
    if (G.walker.node !== n) { botStep({ goto: n }, I, dt); return I; }
    I.interactHeld = true; return I;
  }
  // the interview: wait, then fire (the "shot" ending), or not
  if (G.boss && G.boss.id === 'hansi' && G.boss.phase === 3) { if (G.boss.t3 > 12 && BOT.shootInterview !== false) { I.fire = I.firePressed = true; } return I; }
  if (botFight(I, dt)) { BOT.fightT = (BOT.fightT || 0) + dt; if (BOT.stepIdx === BOT.i && BOT.t - BOT.stepStart > 300) BOT.failed = BOT.failed || 'fighting too long at step ' + BOT.i + ' in ' + G.area + ': ' + aliveEnemies().map(e => e.type + '@' + Math.round(e.x / M) + ',' + Math.round(e.y / M)).join(' '); return I; }
  if (!BOT.route || BOT.i >= BOT.route.length) { BOT.done = true; return I; }
  const s = BOT.route[BOT.i];
  if (BOT.stepIdx !== BOT.i) { BOT.stepIdx = BOT.i; BOT.stepStart = BOT.t; BOT.pressed = 0; BOT.interactT = 0; BOT.stepArea = G.area; }
  if (botStep(s, I, dt)) { BOT.log.push({ i: BOT.i, t: Math.round(G.time), area: G.area, step: JSON.stringify(s).slice(0, 60) }); BOT.i++; if (s.choose === undefined) BOT.choice = null; }
  else if (BOT.t - BOT.stepStart > (s.timeout || 240)) BOT.failed = BOT.failed || 'stuck at step ' + BOT.i + ' ' + JSON.stringify(s).slice(0, 80) + ' in ' + G.area + ' node ' + G.walker.node + ' edge ' + G.walker.edge + (BOT.noPath ? ' (no path to ' + BOT.noPath + ')' : '');
  return I;
}
S7.bot = {
  run(route, o = {}) { Object.assign(BOT, { route, i: 0, t: 0, on: true, log: [], cheat: !!o.cheat, failed: null, done: false, stepIdx: -1, choice: null }); },
  stop() { BOT.on = false; BOT.route = null; },
  status: () => ({ on: BOT.on, i: BOT.i, n: BOT.route ? BOT.route.length : 0, failed: BOT.failed, done: BOT.done, log: BOT.log }),
  intent: botIntent
};

/* ==== src/86-attract.js ==== */
/* SKILLER7 — attract mode (§7.23): after 10 s idle on the title, a loop of seven vignettes played by a cheating bot
 * (god mode, infinite Red, aim that snaps, everything revealed). Any key, button, click, wheel, stick or mouse move
 * exits; the input that exits never reaches the menu. */
const VIGNETTES = [
  { cap: 'HOLD TO MOVE. STOP TO KILL.', area: '00A', node: 'r7', persona: 'ignaz', t: 20, setup: () => { setFlag('firstThaw'); setFlag('pim1done'); }, route: [{ goto: 'j1' }, { fn: () => S7.startWave('lobby') }, { goto: 'j2' }, { clear: true }, { goto: 'j4' }, { goto: 'j2' }, { goto: 'j3' }] },
  { cap: 'SEVEN KILLERS. ONE BODY.', area: '01A', node: 'mk', persona: 'rurik', t: 24, setup: () => { S7.startWave('market'); }, route: [{ wait: 2.5 }, { switch: 'dagny' }, { wait: 2.5 }, { switch: 'kasimir' }, { skill: true }, { wait: 2 }, { switch: 'mireille' }, { wait: 2.5 }, { switch: 'brigid' }, { wait: 2.5 }, { switch: 'ignaz' }, { wait: 2.5 }, { goto: 'f1' }] },
  { cap: 'SCAN. FIND THE WARM SPOT.', area: '00B', node: 'x1', persona: 'dagny', t: 20, route: [{ goto: 'j5' }, { clear: true }, { goto: 'r306' }, { clear: true }, { goto: 'j5' }, { goto: 'c2' }] },
  { cap: 'LAWINE!', area: '01C', node: 'jp', persona: 'dagny', t: 22, setup: () => { setFlag('cornice'); }, route: [{ goto: 'al', tuck: true }, { goto: 'bk2', tuck: true }, { goto: 'vb', tuck: true }] },
  { cap: 'SKY CABINS.', area: '01D', node: 'gs', persona: 'ignaz', t: 22, route: [{ hold: 'move', untilFn: () => false }] },
  { cap: 'EIN, ZWEI, DREI, VIER.', area: '01B', node: 'bb', persona: 'dagny', t: 22, setup: () => { setFlag('mirrors'); }, route: [{ goto: 'br' }, { flag: 'band' }] },
  { cap: 'THE POWDER KING.', area: '01F', node: 'fe', persona: 'ignaz', t: 24, route: [{ flag: 'avalaughDown' }, { goto: 'a1' }, { goto: 'sl0' }, { goto: 'sl1' }] }
];
S7.VIGNETTES = VIGNETTES;
const ATT = { i: 0, t: 0, saved: null, title: 0, seen: new Set(), loops: 0 };
S7.ATT = ATT;
function startVignette(i) {
  const v = VIGNETTES[i]; ATT.i = i; ATT.t = 0; ATT.seen.add(i);
  S7.newGame({ seed: 11 + i, difficulty: 'Piste' }); G.attract = true; G.noSaves = true;
  for (const id of ORDER) G.roster[id].unlocked = true; G.red = 999; G.items.edelweiss = 3; G.items.ember = 1; G.items.servicekey = 1;
  G.persona = v.persona; S7.enterArea(v.area, v.node, { noAutosave: true });
  if (v.setup) v.setup();
  BG.card(v.cap, 'DEMO', 2.2);
  S7.bot.run(v.route.map(s => Object.assign({ timeout: 999 }, s)), { cheat: true });
  S7.presenter.enterArea && S7.presenter.enterArea(G.area);
  S7.flurry();
}
S7.startVignette = startVignette;
S7.attractScene = game => ({
  touch: [], camera: false,
  enter() {
    game.input.touchEnabled = false;
    ATT.saved = Object.assign({}, CHEATS); Object.assign(CHEATS, { god: true, infRed: true, revealAll: true, oneHit: false });
    ATT.title = 0; ATT.loops = 0; ATT.seen = new Set(); ATT.exitArm = .25; game.input.consumeAll(); startVignette(0);
  },
  exit() { Object.assign(CHEATS, ATT.saved || {}); S7.BOT.on = false; if (G) G.attract = false; S7.saveDev && S7.saveDev(); },
  update(dt) {
    ATT.exitArm -= dt;
    const I0 = S7.game.input;
    if (ATT.exitArm <= 0 && (idleTick(1 / 120) || In.click())) { I0.consumeAll(); IDLE.t = 0; S7.flurry(); game.go('title', null, { fade: 'white', seconds: .3 }); return; }
    if (ATT.title > 0) { ATT.title -= dt; if (ATT.title <= 0) startVignette(0); return; }
    ATT.t += dt;
    const I = S7.bot.intent(dt);
    if (G.mode === 'results') S7.closeResults();
    game.timeScale = G.mode === 'ring' ? .15 : 1;
    simUpdate(dt, I); S7.presenter.step(dt);
    const v = VIGNETTES[ATT.i];
    if (ATT.t >= v.t || G.mode === 'gameover' || G.mode === 'end') {
      if (ATT.i + 1 < VIGNETTES.length) startVignette(ATT.i + 1); else { ATT.title = 3; ATT.loops++; }
    }
  },
  draw(r) {
    if (ATT.title > 0) { S7.presenter.drawTitle && S7.presenter.drawTitle(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#000'); E.font.title(g, 'SKILLER', r.W / 2 - 14, r.H * .35, { scale: 5, colors: ['#ffffff', INK], outline: '#000', depth: 3, align: 'center' }); E.font.title(g, '7', r.W / 2 + tw('SKILLER', 5) / 2 - 6, r.H * .35, { scale: 5, colors: ['#ff5060', RED], outline: '#000', depth: 3 }); }); }
    else { S7.presenter.draw(r); r.overlay(g => UI.hud(g, r, 1 / 60)); }
    r.overlay(g => {
      const [mx, my] = [Math.round(r.W * .05), Math.round(r.H * .05)];
      E.font.title(g, 'SKILLER7', mx, my - 2, { scale: 1, colors: [INK, '#c8c0b8'], outline: '#000' });
      txt(g, 'DEMO', r.W - mx - tw('DEMO', 2), my, RED, { scale: 2 });
      if (Math.floor(UI.t * 2) % 2 === 0 || true) { const s = S7.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY BUTTON'; px.blend(g, .7, 'normal', () => px.rect(g, r.W / 2 - tw(s, 2) / 2 - 8, r.H - my - 20, tw(s, 2) + 16, 18, '#000')); txt(g, s, r.W / 2 - tw(s, 2) / 2, r.H - my - 17, Math.floor(UI.t * 2) % 2 ? INK : GOLD, { scale: 2 }); }
    });
  }
});

/* ==== src/87-hub.js ==== */
/* SKILLER7 — Echo Run (§7.24): the Black Run as a time trial as Dagny. Whiteouts that reach you add 3 s; each crit takes
 * 0.5 s off. On its own: your best run is recorded and replayed as YOUR ECHO. In an AI Hub session (ghost mode, 1-4):
 * the others are echoes in their seat colours; the hub runs the card, the clock and the results. */
const ECHO = { on: false, solo: true, t: 0, pen: 0, crits: 0, thawed: 0, done: false, dist: 0, rec: [], recT: 0, enc: 0, best: null, ghosts: {}, sendT: 0, progT: 0, started: false, finishedAt: null };
S7.ECHO = ECHO;
const ENCOUNTERS = [[120, ['giggler', 'giggler']], [260, ['tobogganer']], [420, ['plow', 'giggler']], [600, ['tobogganer', 'tobogganer']], [760, ['twins']], [900, ['snowballer', 'snowballer']], [1100, ['giggler', 'giggler', 'giggler']], [1300, ['plow']], [1450, ['tobogganer', 'tobogganer']]];
S7.ECHO_ENCOUNTERS = ENCOUNTERS;
const ECHO_RANKS = [[70, 'DOUBLE BLACK'], [82, 'BLACK DIAMOND'], [96, 'BLUE SQUARE'], [1e9, 'GREEN CIRCLE']];
S7.echoRank = t => ECHO_RANKS.find(([s]) => t < s)[1];
const hubOn = () => typeof AIHub !== 'undefined' && !!AIHub.active;
S7.hubActive = () => hubOn() && !!S7.HUB;

/** set up a run: a fresh state, Dagny at the start gate, the course's encounters from the seeded stream */
function echoSetup(solo) {
  S7.newGame({ seed: 77, difficulty: 'Piste' }); G.noSaves = true; G.echo = true; G.roster.dagny.unlocked = true; G.persona = 'dagny'; G.red = 200;
  const rnd = solo ? E.rng(1926) : (AIHub.rng ? AIHub.rng('course') : E.rng(1926));
  ECHO.plan = ENCOUNTERS.map(([m, list]) => ({ m: m * .5, list: list.map(t => t === 'plow' && rnd() < .3 ? 'giggler' : t), side: rnd() < .5 ? -1 : 1, part: ['head', 'chest', 'belly'][Math.floor(rnd() * 3)] }));
  Object.assign(ECHO, { on: true, solo, t: 0, pen: 0, crits: 0, thawed: 0, done: false, dist: 0, rec: [], recT: 0, enc: 0, started: !solo ? false : false, finishedAt: null, sendT: 0, progT: 0, countT: 3 });
  S7.enterArea('01C', 'st', { noAutosave: true, silent: true });
  G.flags['trig:01C:skitip'] = true;
  try { const b = typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('s7:echo') || 'null'); ECHO.best = b && b.time ? b : null; } catch (e) { ECHO.best = null; }
}
S7.echoSetup = echoSetup;
S7.startEchoSolo = () => { echoSetup(true); S7.game.go('hub', { solo: true }, { fade: 'white', seconds: .4 }); };
S7.echoPenalty = e => { if (!ECHO.on || ECHO.done) return; ECHO.pen += 3; G.walker.v *= .4; S7.splash('+3 S', 1, { big: false }); emit('echo', { kind: 'penalty' }); void e; };
S7.echoCrit = () => { if (!ECHO.on || ECHO.done) return; ECHO.crits++; ECHO.pen -= .5; S7.splash('-0.5 S', .8, { small: true }); };
S7.bus.on('kill', () => { if (ECHO.on) ECHO.thawed++; });
/** the course distance travelled (metres) */
const echoMetres = () => ECHO.dist / M;
S7.echoStep = (dt) => {
  if (!ECHO.on || !G.echo) return;
  if (!ECHO.started || ECHO.done) return;
  ECHO.t += dt; const wk = G.walker, e = curEdge();
  if (e && (e.kind === 'ski' || e.kind === 'jump') && !wk.node) ECHO.dist += wk.v * dt;
  // the encounters, spawned ahead of you along your line
  const p = ECHO.plan[ECHO.enc];
  if (p && echoMetres() >= p.m - 30) {
    ECHO.enc++; const H = heroPos(), f = H.angle;
    p.list.forEach((t, k) => { const a = f + p.side * (.3 + k * .25), d = (34 + k * 6) * M, x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d; spawnEnemy(t, x, y, undefined, { part: p.part, revealed: 0 }); });
  }
  // the record (every 0.1 s: edge, s, aiming, yaw)
  ECHO.recT += dt; if (ECHO.recT >= .1) { ECHO.recT = 0; ECHO.rec.push([W.rails.edges.indexOf(e), Math.round(wk.s), G.aim.on ? 1 : 0, Math.round(G.aim.yaw * 100)]); }
  // the finish: the village bottom
  if (wk.node === 'vb' || wk.passed === 'vb' || e && e.id === 'f2-vb' && wk.s >= e.len - 2) echoFinish();
};
function echoFinish() {
  if (ECHO.done) return; ECHO.done = true; const time = Math.max(0, ECHO.t + ECHO.pen); ECHO.finishedAt = time;
  ECHO.rank = S7.echoRank(time); emit('echo', { kind: 'finish', time });
  if (ECHO.solo) { const better = !ECHO.best || time < ECHO.best.time; if (better) { ECHO.newBest = true; try { localStorage.setItem('s7:echo', JSON.stringify({ time, rec: ECHO.rec })); } catch (e) { /* the record lasts the visit */ } } }
  else if (hubOn()) { AIHub.result({ time: Math.round(time * 1000), stats: { Crits: ECHO.crits, Penalties: Math.max(0, Math.round(ECHO.pen + ECHO.crits * .5) / 3 | 0), Thawed: ECHO.thawed }, awards: ECHO.pen <= 0 ? [{ title: 'Clean Line', detail: 'No penalties' }] : [] }); ECHO.reported = true; }
}
/** where a recorded echo is at time t (seconds) */
S7.echoAt = (rec, t) => { const k = Math.min(rec.length - 1, Math.max(0, Math.floor(t / .1))), s = rec[k]; if (!s) return null; const e = W.rails.edges[s[0]]; if (!e) return null; const p = edgePos(W.rails, e, s[1]); return { x: p.x, y: p.y, z: p.z, angle: p.angle, aim: s[2], yaw: s[3] / 100 }; };
S7.echoHud = (g, r, x, my) => {
  const t = ECHO.done ? ECHO.finishedAt : ECHO.t + ECHO.pen, s = fmtTime(t);
  E.font.title(g, s, r.W / 2, my + 2, { scale: 3, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 1 });
  txt(g, 'PENALTIES ' + (ECHO.pen > 0 ? '+' : '') + ECHO.pen.toFixed(1) + ' S   ' + Math.round(echoMetres()) + ' M', r.W / 2 - 80, my + 28, MUTED);
  if (ECHO.best) txt(g, 'BEST ' + fmtTime(ECHO.best.time), x - 80, my + 44, GOLD);
  void x;
};

/* ---- the AI Hub session ---- */
S7.hubBoot = async game => {
  if (!hubOn()) return;
  try {
    const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] });
    S7.hubTried = true;
    if (!info) { if (game.sceneName === 'hub') game.go('title'); return; }
    S7.HUB = { info, ghosts: {}, ended: false, timeUp: false, readySent: false };
    if (S7.touchOnly()) { AIHub.fail('Controller or keyboard required'); return; }
    AIHub.on('message', (d, from) => { if (!d || from === info.me) return; if (d.t === 'g') S7.HUB.ghosts[from] = Object.assign(S7.HUB.ghosts[from] || {}, { e: d.e, s: d.s, a: d.a, y: d.y, at: Date.now() }); if (d.t === 'done') (S7.HUB.ghosts[from] = S7.HUB.ghosts[from] || {}).done = d.time; });
    AIHub.on('leave', d => { delete S7.HUB.ghosts[d.id]; });
    AIHub.on('start', () => { S7.HUB.start = true; });
    AIHub.on('time-up', () => { S7.HUB.timeUp = true; if (!ECHO.done && !ECHO.reported) { AIHub.result({ score: Math.round(echoMetres()) }); ECHO.reported = true; } });
    AIHub.on('end', () => { S7.HUB.ended = true; game.input.clear(); if (game.audio) { game.audio.music(null); game.audio.mute(true); } });
  } catch (e) { game.fail('hub', e); }
};
S7.hubScene = game => ({
  touch: [], pausable: true, camera: false,
  enter(d) {
    if (typeof AIHub !== 'undefined' && AIHub.active && !S7.HUB && !(d && d.solo)) { if (S7.hubTried) { game.go('title'); return; } }
    const solo = !S7.hubActive(); if (!ECHO.on || ECHO.solo !== solo) echoSetup(solo);
    S7.presenter.enterArea(G.area); S7.music('echorun', { restart: true }); this.drawn = 0; this.after = 0;
    if (solo) { ECHO.countT = 3; ECHO.started = false; }
  },
  update(dt) {
    const H = S7.HUB;
    if (H && H.ended) return;
    if (UI.update(dt)) return;
    this.ticks = (this.ticks || 0) + 1;
    if (H && !H.readySent && this.ticks > 3 && (this.drawn > 1 || S7.game.headless)) { H.readySent = true; AIHub.ready(); }
    // the network keeps the hub's clock (real time), whatever the frame rate
    const nowR = typeof performance !== 'undefined' ? performance.now() / 1000 : G.time, rdt = Math.min(.5, Math.max(0, nowR - (this.lastR ?? nowR))); this.lastR = nowR;
    if (H && H.start && !H.ended && !ECHO.started) { ECHO.progT0 = (ECHO.progT0 || 0) + rdt; if (ECHO.progT0 >= 1) { ECHO.progT0 = 0; AIHub.progress({ score: 0, label: 'at the start gate' }); } }
    if (!ECHO.started) {
      if (H) { const t = AIHub.time(); if (H.start && t >= 0) { ECHO.started = true; S7.splash('GO!', 1, { big: true }); } }
      else { ECHO.countT -= dt; if (ECHO.countT <= 0) { ECHO.started = true; S7.splash('GO!', 1, { big: true }); } }
      S7.cameraStep(dt); S7.presenter.step(dt); return;
    }
    const I = S7.BOT.on ? S7.bot.intent(dt) : readHumanIntent(dt);
    if (!S7.BOT.on) UI.worldIntent(I);
    game.timeScale = 1;
    if (!ECHO.done) simUpdate(dt, I); else { S7.cameraStep(dt); this.after += dt; }
    S7.presenter.step(dt);
    if (H && !H.ended) {
      ECHO.sendT += rdt; if (ECHO.sendT >= .1) { ECHO.sendT = 0; const e = curEdge(); AIHub.send({ t: 'g', area: 'blackrun', e: W.rails.edges.indexOf(e), s: Math.round(G.walker.s), a: G.aim.on ? 1 : 0, y: Math.round(G.aim.yaw * 100) }, { reliable: false }); }
      ECHO.progT += rdt; if (ECHO.progT >= 1 || !ECHO.progSent) { ECHO.progSent = true; ECHO.progT = 0; const m = Math.round(echoMetres()); AIHub.progress({ score: m, label: Math.round(m / 6.4) + '% down · +' + Math.max(0, ECHO.pen).toFixed(0) + ' s' }); }
      if (ECHO.done && !ECHO.doneSent) { ECHO.doneSent = true; AIHub.send({ t: 'done', time: ECHO.finishedAt }, { reliable: true }); }
    }
    if (!H && ECHO.done && this.after > 1.2 && !UI.modal()) UI.open('echoresults');
  },
  draw(r) {
    this.drawn++;
    S7.presenter.draw(r);
    r.overlay(g => {
      UI.hud(g, r, 1 / 60);
      const H = S7.HUB;
      if (!ECHO.started) { const n = H ? (AIHub.time() === -Infinity ? 'GET READY' : Math.max(1, Math.ceil(-AIHub.time() / 1000))) : Math.max(1, Math.ceil(ECHO.countT)); E.font.title(g, String(n), r.W / 2, r.H * .32, { scale: 5, colors: ['#ffffff', INK], outline: '#000', align: 'center', depth: 2, depthColor: RED }); txt(g, 'ECHO RUN · THE BLACK RUN', r.W / 2 - tw('ECHO RUN · THE BLACK RUN', 2) / 2, r.H * .32 + 50, RED, { scale: 2 }); }
      if (H && H.ended) { veil(g, r, .6); E.font.title(g, 'ROUND OVER', r.W / 2, r.H * .4, { scale: 4, colors: ['#ffffff', INK], outline: '#000', align: 'center' }); }
      else if (ECHO.done && H) txt(g, 'FINISHED ' + fmtTime(ECHO.finishedAt) + ' · WATCHING THE ECHOES', r.W / 2 - 110, r.H * .3, GOLD);
      UI.draw(g, r);
    });
  }
});
SCREENS.echoresults = () => {
  const L = new List([{ label: 'RUN AGAIN', onPick: () => { UI.close(); echoSetup(true); S7.game.go('hub', { solo: true }, { fade: 'white', seconds: .3 }); } }, { label: 'TITLE', onPick: () => { UI.close(); ECHO.on = false; S7.game.go('title'); } }]);
  return { update() { L.update(); }, draw(g, r) { const F = frame(g, r, 'ECHO RUN', { tscale: 2, sub: ECHO.rank }); const s = fmtTime(ECHO.finishedAt); E.font.title(g, s, r.W / 2, F.y + 54, { scale: 4, colors: ['#ffffff', INK], outline: '#000', align: 'center' }); txt(g, 'CRITS ' + ECHO.crits + '   THAWED ' + ECHO.thawed + '   PENALTIES ' + ECHO.pen.toFixed(1) + ' S', r.W / 2 - 100, F.y + 96, INK); if (ECHO.newBest) txt(g, 'A NEW BEST. YOUR ECHO WILL RACE YOU.', r.W / 2 - tw('A NEW BEST. YOUR ECHO WILL RACE YOU.') / 2, F.y + 110, GOLD); else if (ECHO.best) txt(g, 'BEST ' + fmtTime(ECHO.best.time), r.W / 2 - 30, F.y + 110, GOLD); L.draw(g, r.W / 2 - 80, F.y + 130, 160); } };
};

/* ==== content/about.js ==== */
/* SKILLER7 content — About & Credits: the Source Information and the three feedback sections, as in the hand-back
 * (the same words as exit-interview.json), then the credits (the credits scene scrolls S7.CREDITS). */
S7.ABOUT = [
  ['SOURCE INFORMATION', [
    "Date: 2026-11-04 02:06:20",
    "Source: Killer7 (Grasshopper Manufacture / Capcom, 2005)",
    "Plan: PLAN.md",
    "Genre and Perspective: On-rails action-adventure shooter: rail movement, first-person scan-and-shoot, persona-switch puzzles, boss fights. Third-person cinematic rail cameras that hard-cut while moving; first person while aiming; a schematic top-down map in the pause menu",
    "Tech: my-3D2dge v0.85.2 (2D engine with its modules, and its 3D module), three.js r182 (WebGPU renderer with WebGL 2 fallback), Rapier 0.19.3, AI Hub session client 1.4.0, plain JavaScript; Node 24 and Playwright 1.63.0 for tests",
    "Art Direction: The engine's native style: PS1-resolution picture, pixel-art rigs drawn on cards, the 3D module's Comic cel filter (flat bands of light, ink lines); stark white snow, black shadows, saturated red; new hats, face accessories, held weapons and about fifty new objects and pen-drawn set pieces",
    "Animation: The engine's procedural rigs (gaits, poses, expressions) driven by the sim each step, extended with new hats, accessories and weapons; first-person weapon models with kick and reload motion on the overlay pen; moving pen-drawn set pieces (a heaving featherbed, an elevator car, swinging bells, a band on the beat, a laughing snowman)",
    "Audio: All in code: music in the engine's step notation with danger layers and a band whose tracks are its weak points; chip-synth sound effects; a WebAudio laughter synth with formant filters and stereo position; Animalese-style gibberish voices typed along with every line",
    "Online: AI Hub Session Protocol v1, ghost mode: Echo Run, 1-4 players racing down the Black Run with the others shown as echoes; on its own, Echo Run races your own recorded best run",
    "Testing: One command (node tests/run.mjs) printing failures and a count: 26 headless Node suites on exact fixed steps through game.debug and S7 (rails, camera, weapons, scan, enemies, combat, personas, death and rescue, economy, gates, NPCs, saves, bosses, Echo Run, voices, dev mode, determinism, story, start, attract, a fake AI Hub) including an honest scripted bot playthrough of the whole demo on three difficulties, plus Playwright browser suites on the built file (boot, keyboard play, pause and dev sliders, mouse picks, gamepad and Xbox glyphs, attract, touch-only) and the AI Hub harness in three scenarios; screenshots only for the look",
    "Research: None outside the files given: PLAN.md, the engine handoff docs (README, API card, guide, 3D module header, asset card) and the AI Hub README",
    "Environment: Claude Code CLI (headless); Linux; browser unknown",
    "Model: Anthropic, claude-opus-5-5, reasoning effort medium",
    "Usage: unknown"
  ]],
  ['TESTING FEEDBACK', [
    "How many issues did testing catch? About 40 distinct issues, most found by the scripted bot playthrough and its isolated boss runs, the rest by the browser suites and screenshots.",
    "How many would be considered critical issues / game breaking? About 12 were critical: the walker jumping to the far end of an edge, a cold open that waited 50 minutes, three unbeatable boss phases (Grau's adds, the snowman's hidden warm spots, a slalom with no retry), a cornice that could not be hit, frozen personas lost for good in one-way areas, crashes from a bad music value, a null state on the title and a disposed 3D world, and an AI Hub session that opened on the title screen.",
    "What was the most helpful test you ran? The honest bot playthrough of the whole demo, headless: 13 minutes of game time in about 7 seconds, and it found every softlock and balance wall in order.",
    "What was the least helpful test you ran? The content validator: it has not failed since it was written, because the playthrough had already found everything it checks."
  ]],
  ['ENGINE FEEDBACK', [
    "What did you like most about the engine? The split between a deterministic fixed-step 2D engine and a 3D world drawn under it: the whole game's rules run headless in Node, and the rigs, the cel filter and the pen gave a strong look quickly.",
    "Did you get stuck or guess wrong? Yes: stairs tiles each rise their full height (a sawtooth across three tiles), the pen's and world.shape's height conventions, which materials exist (no brass), and the pixel font lacking umlauts, accents, the em dash and the PlayStation symbols. The first-person overlay does not compose with the Comic cel filter (the world turns black behind the gun), so the gun is drawn in the world in the eye's frame. Headless Chromium also runs the 3D page at about 45 steps a second, which broke tests timed in steps.",
    "What was the most important thing you had to build yourself? The rail system: the walker with junctions, quick turns, ski physics, lifts and jumps, and a camera director that plays hand-authored Killer7-style shots (fixed corners, low angles, dollies, cranes) on the set-piece edges and places fixed shots automatically wherever a clear line to the hero exists on the rest.",
    "What was the hardest part about using the engine? Keeping two sources of geometry in step: the sim keeps its own grid (from the same level rows, or the same terrain function) for line of sight and paths, because World3D only exists in the browser.",
    "What did you change in the engine, and why? Six S7 PATCHes in my-3d2dge.js: new hats (beanie, ushanka, felt, beret, hard hat, race helmet, pillbox); face accessories (goggles, moustache, beard, shades, cigar, visor); gun-like held weapons (revolver, pistol, rifle, shotgun, ski poles, alphorn, camera, launcher); PlayStation button symbols by default; game.pauseBlock() so an open screen or the AI Hub's Create + Options never pauses; font glyphs for umlauts, sharp s, accents, the em dash and the middle dot. The 3D module is unchanged.",
    "If you could change one thing about the engine, what would it be? A headless stand-in for World3D (its level, rays and projection without three.js), so a 3D game's rules and its picture could share one source of geometry in tests."
  ]],
  ['PROMPT FEEDBACK', [
    "What did you like most about this prompt? It is concrete about the deliverables and the process (one test command, headless tools, the shared machine) while leaving the design open, and the plan gave a complete design to build to.",
    "What was confusing? The plan's file names carry a different model and date; STAGE.md says TASK.md wins, but it is easy to miss.",
    "What was the hardest thing to do? Scope: the plan describes nine areas, three bosses and every system at full depth; building all of it whole in one session meant writing content compactly and leaning on automatic camera placement.",
    "What would you change in this prompt? Say how long the demo should take a first-time player, and whether an honest bot finishing it counts as the proof of complete, so the effort can be aimed."
  ]],
  ['CREDITS', [
    'SKILLER7 — Seven Killers, One Mountain. Version ' + S7.VERSION + '.',
    'Design, code, music, sound, voices and words: written for this demo by Claude (Anthropic, claude-opus-5-5), from PLAN.md.',
    'Made with my-3D2dge v0.85.2 and its 3D module (MIT) · three.js r182 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub session client 1.4.0 · Asset store entries converted from the Kenney Holiday Kit (CC0).',
    'Inspired by Killer7 (Grasshopper Manufacture / Capcom, 2005). An original game; no affiliation.'
  ]]
];
S7.CREDITS = ['#SKILLER7', 'SEVEN KILLERS, ONE MOUNTAIN', '', '#THE SEVEN', 'Ansel Holle — The Sweep', 'Dagny Holle — Schuss', 'Ignaz Holle — Telemark', 'Rurik Holle — Mogul', 'Kasimir Holle — Yodel', 'Mireille Holle — Snapshot', 'Brigid Holle — Avalanche', '',
  '#ROOM 7', 'Oma Holle', 'Sister Rosalind', 'The Concierge (Ambrose)', '', '#ON THE MOUNTAIN', 'Pim the Lift Boy', 'Murmel', 'Bellcaptain Augustin Grau', 'Die Lustigen Vier', 'Hansi Pulver, the Powder King', 'Mister Föhn', '',
  '#MADE WITH', 'my-3D2dge v0.85.2 and its 3D module (MIT)', 'three.js r182 (MIT)', 'Rapier 0.19.3 (Apache-2.0)', 'AI Hub session client 1.4.0', 'Kenney Holiday Kit (CC0)', '',
  '#WRITTEN BY', 'Claude (Anthropic, claude-opus-5-5)', 'from PLAN.md', '', 'Inspired by Killer7 (Grasshopper Manufacture / Capcom, 2005).', 'An original game; no affiliation.', '', '#THE SNOW WILL CONTINUE.'];

/* ==== content/areas-t00.js ==== */
/* SKILLER7 content — Room 7 and Target 00 (Grand Hotel Nada): the lobby, the third floor, the service shaft.
 * Units: x, y in tiles (1 m), z in metres. Rails: nodes and edges; cameras are placed automatically where a shot has a
 * clear line to the hero, unless an edge lists its own (cams). */
const B = S7.buildRows;

S7.area('room7', {
  title: 'ROOM 7', sub: 'GRAND HOTEL NADA, TOP FLOOR', music: 'room7', ambience: 'room7', start: 'door', interior: true,
  world: {
    level: { rows: B(12, 10, [['fill', 1, 1, 10, 8, '.'], ['set', 6, 0, 'W']]), legend: { '#': { wall: 64 }, W: { wall: 64 } }, ground: 'planks', colors: { base: '#4a3226', dark: '#2a1a14', light: '#6a4a36' }, side: 'planks', color: '#2a1e1c', wallSide: 'planks' },
    sky: '#05040a', fog: false, ambient: ['#5a4a5a', '#1a1014', 1.0], torchLights: 0, lights: 4, glowLights: 4, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.3 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    door: { t: [6, 8.2], kind: 'stop', label: 'THE DOOR' }, wardrobe: { t: [2.4, 6.6], kind: 'stop', label: 'THE WARDROBE' }, bed: { t: [2.6, 3.4], kind: 'stop', label: 'THE BED' },
    chair: { t: [4.6, 2.0], kind: 'stop', label: 'SISTER ROSALIND' }, window: { t: [6.5, 1.8], kind: 'stop', label: 'THE WINDOW' },
    clock: { t: [9.5, 2.6], kind: 'stop', label: 'THE CUCKOO CLOCK' }, phone: { t: [9.6, 4.8], kind: 'stop', label: 'THE TELEPHONE' }, bench: { t: [9.4, 7.0], kind: 'stop', label: 'THE WAX BENCH' }
  },
  edges: [['door', 'wardrobe'], ['wardrobe', 'bed'], ['bed', 'chair'], ['chair', 'window'], ['window', 'clock'], ['clock', 'phone'], ['phone', 'bench'], ['bench', 'door']].map(([a, b]) => ({ a, b, cams: [{ s: [0, 1], shot: 'fixed', at: [10.8, 8.8, 3.3], look: 'hero', fov: 58 }], rcams: [{ s: [0, 1], shot: 'fixed', at: [1.2, 8.8, 3.3], look: 'hero', fov: 58 }] })),
  spots: [
    { id: 'r7_door', node: 'door', kind: 'r7', use: 'door', label: 'LEAVE' }, { id: 'r7_wardrobe', node: 'wardrobe', kind: 'r7', use: 'wardrobe', label: 'THE WARDROBE' },
    { id: 'r7_bed', node: 'bed', kind: 'r7', use: 'bed', label: 'OMA HOLLE' }, { id: 'r7_ros', node: 'chair', kind: 'r7', use: 'rosalind', label: 'SISTER ROSALIND' },
    { id: 'r7_window', node: 'window', kind: 'r7', use: 'window', label: 'THE WINDOW' }, { id: 'r7_clock', node: 'clock', kind: 'r7', use: 'clock', label: 'SAVE' },
    { id: 'r7_phone', node: 'phone', kind: 'r7', use: 'phone', label: 'THE TELEPHONE' }, { id: 'r7_bench', node: 'bench', kind: 'r7', use: 'bench', label: 'THE WAX BENCH' }
  ],
  props: [
    ['shape', 'wardrobe7', 1.6, 6.6, 0, { facing: 0 }], ['shape', 'holle-bed', 2.2, 2.6, 0, { facing: 0 }], ['shape', 'armchair', 4.6, 1.3, 0, { facing: Math.PI / 2 }],
    ['shape', 'cuckoo-clock', 10.5, 2.4, 0, { facing: Math.PI }], ['shape', 'side-table', 10.4, 4.8, 0, { facing: Math.PI }], ['shape', 'wax-bench', 10.2, 7.2, 0, { facing: Math.PI }],
    ['shape', 'radiator', 4.0, 8.7, 0, { facing: -Math.PI / 2 }], ['shape', 'room7-door', 6, 9.0, 0, { facing: -Math.PI / 2 }],
    ['pen', 'window7', 6.5, .9, 0], ['pen', 'featherbed', 2.2, 2.6, 0], ['pen', 'phone7', 10.4, 4.8, 0], ['pen', 'lamp7', 6, 5, 3.4],
    ['light', 6, 5, 3.2, { color: '#ffc880', reach: 150, power: 30, flicker: .03 }], ['light', 6.5, 1.2, 2.4, { color: '#8aa8ff', reach: 110, power: 12 }], ['light', 10.2, 7.2, 1.2, { color: '#ff8a40', reach: 60, power: 8, flicker: .15 }]
  ],
  people: [['rosalind', 4.6, 1.5, 0, Math.PI / 2, 'sit'], ['holle', 2.2, 2.4, .55, 0, 'lie']]
});

/* ---- 00A GRAND HOTEL NADA: THE LOBBY (40 x 28; walls 6 m; marble checker; a red runner) ---- */
S7.area('00A', {
  title: 'GRAND HOTEL NADA', sub: 'THE LOBBY', target: 0, music: 'hotel', ambience: 'roomtone', start: 'r7', interior: true, accent: '#a01828',
  world: {
    level: {
      rows: B(40, 28, [
        ['fill', 14, 6, 37, 25, '.'], ['fill', 14, 1, 37, 3, '='], ['fill', 23, 4, 25, 4, '3'], ['fill', 23, 5, 25, 5, '2'], ['fill', 23, 6, 25, 6, '1'], ['fill', 2, 6, 12, 11, '.'], ['fill', 13, 8, 13, 9, '.'],
        ['fill', 5, 10, 10, 10, 'c'], ['fill', 18, 23, 22, 23, 'c'], ['fill', 38, 13, 38, 16, '.'], ['set', 24, 26, '.'], ['set', 2, 7, 't'], ['set', 2, 9, 't'],
        ['set', 17, 12, 'P'], ['set', 31, 12, 'P'], ['set', 17, 19, 'P'], ['set', 31, 19, 'P'], ['fill', 24, 7, 24, 24, 'r'], ['fill', 25, 21, 36, 21, 'r'], ['fill', 38, 21, 38, 22, '.']
      ]),
      legend: { '#': { wall: 96 }, '=': { floor: 64, side: 'block' }, 1: { stairs: 'n', from: 0, floor: 21 }, 2: { stairs: 'n', from: 21, floor: 43 }, 3: { stairs: 'n', from: 43, floor: 64 }, c: { wall: 18 }, P: { pillar: 96 }, r: { floor: 0, ground: 'red' }, t: { torch: true } },
      ground: 'tiles', colors: { base: '#e8e4dc', dark: '#2a2226', light: '#f4f0e8' }, side: 'block', color: '#3a2a2e', wallSide: 'block'
    },
    sky: '#05040a', fog: { color: '#0a0608', near: 160, far: 900 }, ambient: ['#4a3040', '#140a0e', 1.15], torchLights: 2, torchShadows: 1, lights: 6, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.4 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    r7: { t: [36.5, 21.5], kind: 'door', label: 'ROOM 7' }, j1: { t: [24.5, 21.5] }, s1: { t: [16.5, 21.5], kind: 'stop', label: 'LUGGAGE RACK' }, d0: { t: [24.5, 25.4], kind: 'stop', label: 'REVOLVING DOOR' },
    j2: { t: [24.5, 14.5] }, j4: { t: [36.0, 14.5], kind: 'stop', label: 'ELEVATORS' }, j3: { t: [24.5, 7.6] }, g1: { t: [13.5, 8.5], kind: 'stop', label: 'THE BAR' },
    b1: { t: [8.5, 8.0], kind: 'stop', label: 'BAR' }, b2: { t: [4.0, 7.6], kind: 'stop', label: 'BEHIND THE BAR' },
    m1: { t: [24.5, 2.5], label: 'MEZZANINE' }, x1: { t: [36.5, 2.4], kind: 'exit', open: true, label: 'STAIRWELL', to: ['00B', 'x1'], needs: { item: 'servicekey' }, line: 'STAFF ONLY. The stairwell door is locked.', hint: 'key' }
  },
  edges: [
    { a: 'r7', b: 'j1', cams: [{ s: [0, .55], shot: 'fixed', at: [37.4, 24.6, 2.6], look: 'hero', fov: 52 }, { s: [.55, 1], shot: 'fixed', at: [20, 24.4, 4.8], look: 'hero', fov: 50 }] },
    { a: 'j1', b: 's1', cams: [{ s: [0, 1], shot: 'dolly', path: [[23, 24.4, 1.6], [15, 24.4, 1.6]], look: 'hero', fov: 50 }] },
    { a: 'j1', b: 'd0' }, { a: 'j1', b: 'j2', cams: [{ s: [0, 1], shot: 'fixed', at: [30, 4, 7.4], look: 'hero', fov: 46 }] },
    { a: 'j2', b: 'j4' }, { a: 'j2', b: 'j3', cams: [{ s: [0, 1], shot: 'fixed', at: [30, 4, 7.4], look: 'hero', fov: 50 }] },
    { a: 'j3', b: 'g1', gate: 'rope' }, { a: 'g1', b: 'b1' }, { a: 'b1', b: 'b2', cams: [{ s: [0, 1], shot: 'fixed', at: [11.5, 6.6, 2.2], look: 'hero', fov: 54 }] },
    { a: 'j3', b: 'm1', kind: 'stairs', via: [[24.5, 4.2]], smooth: false, cams: [{ s: [0, 1], shot: 'crane', at: [20.5, 9.5], zFrom: 1.8, zTo: 7.5, look: 'hero', fov: 54 }] },
    { a: 'm1', b: 'x1' }
  ],
  gates: { rope: { kind: 'buyout', price: 20, who: 'rurik', label: 'MEMBERS ONLY', line: 'Members only. Membership is a matter of means.', at: [14, 8.5, 1], flag: 'ropePaid' } },
  spots: [
    { id: 'r7door', node: 'r7', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel', node: 's1', kind: 'npc', who: 'murmel', label: 'MURMEL' },
    { id: 'rope', node: 'j3', kind: 'gate', gate: 'rope', label: 'VELVET ROPE', r: 2.6 }, { id: 'revolving', node: 'd0', kind: 'tableau', lines: 'lobby_door', label: 'REVOLVING DOOR' },
    { id: 'pim1', node: 'j4', kind: 'npc', who: 'pim', beat: 'pim1', once: true, label: 'THE LIFT BOY' }, { id: 'phone_bar', node: 'b1', kind: 'phone', beat: 'concierge_bar', once: true, label: 'HOUSE PHONE' },
    { id: 'key', node: 'b2', kind: 'pickup', item: 'servicekey' }, { id: 'pin1', edge: 'j2-j4', s: .85, kind: 'pickup', item: 'pin1' },
    { id: 'doc_grau', edge: 'j1-s1', s: .45, kind: 'pickup', item: 'doc_grau' }, { id: 'rime1', edge: 'b1-b2', s: .7, kind: 'pickup', item: 'rime', n: 4 },
    { id: 'rime2', edge: 'm1-x1', s: .5, kind: 'pickup', item: 'rime', n: 3 }, { id: 'red1', edge: 'r7-j1', s: .35, kind: 'pickup', item: 'red5', n: 10 }, { id: 'red2', edge: 'j1-d0', s: .6, kind: 'pickup', item: 'red5', n: 12 },
    { id: 'doc_t00', edge: 'j2-j3', s: .4, kind: 'pickup', item: 'doc_t00' }
  ],
  spawns: { elev1: [29.5, 8.5], elev2: [28.5, 20.5], elev3: [22.5, 13.5], first: [37.5, 14.5], bar1: [3.5, 10.6], bar2: [11.5, 10.6], bar3: [6.5, 6.6], mz1: [34.5, 1.5], mz2: [30.5, 2.5], lob1: [15.5, 15.5], lob2: [33.5, 24.5] },
  waves: {
    first: { spawn: [['giggler', 'first', 0]], part: 'chest' }, elev: { spawn: [['giggler', 'elev1', 0], ['giggler', 'elev2', 1.5], ['giggler', 'elev3', 3]] },
    bar: { spawn: [['giggler', 'bar1', 0], ['giggler', 'bar2', 1], ['bellboy', 'bar3', 2.5]] }, mezz: { spawn: [['bellboy', 'mz1', 0], ['bellboy', 'mz2', 1.2]] },
    lobby: { spawn: [['giggler', 'lob1', 0], ['bellboy', 'lob2', 1.2], ['giggler', 'lob2', 2.4]] }
  },
  triggers: [
    { id: 'walk', edge: 'r7-j1', s: .1, tip: 'walk' }, { id: 'jtip', node: 'j1', tip: 'junction' },
    { id: 'first', edge: 'j1-j2', s: .5, beat: 't00_first_whiteout' }, { id: 'w_elev', node: 'j4', wave: 'elev', when: 'firstThaw' },
    { id: 'w_bar', node: 'b1', wave: 'bar' }, { id: 'w_mezz', node: 'm1', wave: 'mezz' }, { id: 'w_lobby', edge: 'j2-j3', s: .6, wave: 'lobby', when: 'pim1done' }
  ],
  props: [
    ['shape', 'reception-desk', 20, 23.4, 0, { facing: -Math.PI / 2 }], ['shape', 'bar-counter', 7.5, 10.4, 0, { facing: -Math.PI / 2 }], ['shape', 'bottle-shelf', 7.5, 11.5, 0, { facing: -Math.PI / 2 }],
    ['shape', 'luggage-cart', 15.2, 22.6, 0, { facing: 0 }], ['shape', 'luggage-rack', 15.2, 20.2, 0, { facing: 0 }], ['shape', 'armchair', 28, 17, 0, { facing: Math.PI }], ['shape', 'armchair', 28, 11, 0, { facing: Math.PI }],
    ['shape', 'velvet-stanchion', 14.4, 7.6, 0], ['shape', 'velvet-stanchion', 14.4, 9.4, 0], ['shape', 'elevator-doors', 38.8, 13.6, 0, { facing: Math.PI }], ['shape', 'elevator-doors', 38.8, 15.6, 0, { facing: Math.PI }],
    ['shape', 'room7-door', 38.6, 21.5, 0, { facing: Math.PI }], ['shape', 'revolving-door', 24.5, 26.6, 0], ['shape', 'potted-palm', 33, 7, 0], ['shape', 'potted-palm', 16, 7, 0],
    ['shape', 'stool', 6, 9.2, 0], ['shape', 'stool', 8.5, 9.2, 0], ['shape', 'table', 4.5, 7, 0], ['shape', 'stairwell-door', 37.6, 2.4, 4, { facing: Math.PI }],
    ['pen', 'chandelier', 20, 14, 5.4], ['pen', 'chandelier', 29, 14, 5.4], ['pen', 'chandelier', 24.5, 20, 5.4], ['pen', 'balustrade', 14, 3.9, 4, { x1: 37 }], ['pen', 'elevator-car', 36.8, 14.5, 0],
    ['light', 20, 14, 5, { color: '#ffd8a0', reach: 200, power: 26, flicker: .02 }], ['light', 29, 14, 5, { color: '#ffd8a0', reach: 200, power: 26, flicker: .02 }], ['light', 24.5, 20, 5, { color: '#ffd8a0', reach: 200, power: 22 }],
    ['light', 24.5, 26, 2.5, { color: '#8090c0', reach: 140, power: 10 }], ['light', 6, 8, 2.5, { color: '#ff9a50', reach: 120, power: 14, flicker: .1 }], ['light', 36.5, 14.5, 2.5, { color: '#c0ffd0', reach: 90, power: 10, flicker: .3 }]
  ],
  people: [['murmel', 15.4, 20.6, 1.0, Math.PI / 2, 'murmel'], ['pim', 37.2, 14.5, .3, Math.PI, 'pim', 'pim1seen']],
  onEnter(G) { if (!G.flags.t00started) { G.flags.t00started = true; } }
});

/* ---- 00B THIRD FLOOR (100 x 26: the corridors west, the hotel's light well east, the giant service bell across it) ---- */
S7.area('00B', {
  title: 'GRAND HOTEL NADA', sub: 'THE THIRD FLOOR', target: 0, music: 'hotel', ambience: 'roomtone', start: 'x1', interior: true, accent: '#8ab070', sweepAt: 'j6',
  world: {
    level: {
      rows: B(100, 26, [
        ['fill', 2, 4, 38, 6, '.'], ['fill', 14, 1, 19, 3, '.'], ['fill', 14, 7, 19, 10, '.'], ['fill', 39, 3, 40, 7, '.'], ['fill', 41, 1, 98, 24, ' '],
        ['fill', 26, 7, 28, 12, '.'], ['fill', 26, 13, 28, 16, ' '], ['fill', 8, 17, 38, 19, '.'], ['fill', 12, 14, 16, 16, '.'], ['fill', 12, 20, 16, 23, '.'],
        ['fill', 39, 16, 40, 20, '.'], ['set', 8, 7, '.'], ['set', 12, 3, '.'], ['fill', 26, 17, 28, 19, '.'], ['fill', 95, 2, 97, 8, 'K']
      ]),
      legend: { '#': { wall: 48 }, K: { wall: 300 }, ' ': { pit: true } },
      ground: 'planks', colors: { base: '#5a4a3a', dark: '#2a221a', light: '#7a6a52' }, side: 'block', color: '#4a5a44', wallSide: 'plaster', bottom: -400
    },
    sky: '#04060a', fog: { color: '#0c100c', near: 120, far: 700 }, ambient: ['#405040', '#0a0c0a', 1.0], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.4 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    x1: { t: [2.6, 5.5], kind: 'stop', label: 'STAIRWELL' }, c1: { t: [8.5, 5.5] }, j5: { t: [16.5, 5.5] }, r305: { t: [16.5, 2.0], kind: 'stop', label: 'ROOM 305' }, r306: { t: [16.5, 9.4], kind: 'stop', label: 'ROOM 306' },
    c2: { t: [27.5, 5.5] }, l1: { t: [39.6, 5.0], kind: 'stop', label: 'THE LOOKOUT' }, g2: { t: [27.5, 12.2], kind: 'stop', label: 'THE HOLE' }, g3: { t: [27.5, 18.0] },
    c4: { t: [33.5, 18.0], kind: 'stop', label: 'ROOM SERVICE' }, sh: { t: [39.8, 18.0], kind: 'exit', open: true, label: 'THE SERVICE SHAFT', to: ['00C', 'n1'] },
    c3: { t: [21.5, 18.0] }, j6: { t: [14.5, 18.0] }, r312: { t: [14.5, 21.8], kind: 'stop', label: 'ROOM 312' }, r7b: { t: [14.5, 14.6], kind: 'door', label: 'ROOM 3-7' }
  },
  edges: [
    { a: 'x1', b: 'c1' }, { a: 'c1', b: 'j5' }, { a: 'j5', b: 'r305' }, { a: 'j5', b: 'r306' }, { a: 'j5', b: 'c2' }, { a: 'c2', b: 'l1' }, { a: 'c2', b: 'g2' },
    { a: 'g2', b: 'g3', kind: 'jump', apex: 2.2 }, { a: 'g3', b: 'c4' }, { a: 'c4', b: 'sh', gate: 'shaft' }, { a: 'g3', b: 'c3' }, { a: 'c3', b: 'j6' }, { a: 'j6', b: 'r312' }, { a: 'j6', b: 'r7b' }
  ],
  gates: { shaft: { kind: 'flag', flag: 'bellRung', line: 'The shaft doors are shut. Someone has to ring for service.', hint: 'bell' } },
  targets: [{ id: 'bell', at: [92, 5, 3.6], r: 1.6, far: true, flag: 'bellRung', beat: 'bell_rung' }],
  spots: [
    { id: 'r7b', node: 'r7b', kind: 'room7', label: 'ROOM 3-7' }, { id: 'doc_menu', node: 'r305', kind: 'pickup', item: 'doc_menu' }, { id: 'red305', edge: 'j5-r305', s: .6, kind: 'pickup', item: 'red5', n: 12 },
    { id: 'rime306', node: 'r306', kind: 'pickup', item: 'rime', n: 4 }, { id: 'pin2', edge: 'j5-c2', s: .8, kind: 'pickup', item: 'pin2' }, { id: 'rime_c4', edge: 'g3-c4', s: .3, kind: 'pickup', item: 'rime', n: 3 },
    { id: 'red312', node: 'r312', kind: 'pickup', item: 'red5', n: 15 }, { id: 'rime312', edge: 'j6-r312', s: .5, kind: 'pickup', item: 'rime', n: 3 }, { id: 'red_l1', edge: 'c2-l1', s: .5, kind: 'pickup', item: 'red5', n: 8 },
    { id: 'lookout', node: 'l1', kind: 'tableau', lines: 'lookout', label: 'THE LIGHT WELL' }, { id: 'pim2', node: 'c4', kind: 'npc', who: 'pim', beat: 'pim2', once: true, label: 'THE LIFT BOY' },
    { id: 'hole', node: 'g2', kind: 'tableau', lines: 'hole', label: 'THE HOLE' }
  ],
  spawns: { d1: [12.5, 3.5], d2: [8.5, 7.5], d3: [5.5, 4.5], d4: [19.5, 8.5], t306: [17.5, 9.5], cart: [36.5, 5.5], col1: [36.5, 18.5], col2: [38.5, 17.5], s312: [14.5, 22.5], g3a: [21.5, 17.5] },
  waves: {
    doors1: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', .4], ['giggler', 'd3', 1.6]] }, twins: { spawn: [['twins', 't306', 0]] },
    cart: { spawn: [['icecuber', 'cart', 0], ['giggler', 'd4', 2]] }, collapse: { spawn: [['giggler', 'col1', 1.5], ['giggler', 'col2', 3]] }, r312: { spawn: [['bellboy', 's312', 0], ['giggler', 'g3a', 1]] }
  },
  triggers: [
    { id: 'doors1', edge: 'c1-j5', s: .3, wave: 'doors1', tip: 'turn' }, { id: 'twins', node: 'r306', wave: 'twins' }, { id: 'cart', edge: 'j5-c2', s: .3, wave: 'cart' },
    { id: 'lookout', node: 'l1', beat: 'lookout_hint' }, { id: 'gapjump', node: 'g3', flag: 'gapJumped' }, { id: 'collapse', edge: 'g3-c4', s: .5, beat: 'collapse' }, { id: 'r312', node: 'r312', wave: 'r312' }
  ],
  props: [
    ['shape', 'room-door', 12, 3.1, 0, { facing: Math.PI / 2, n: 301 }], ['shape', 'room-door', 8, 6.9, 0, { facing: -Math.PI / 2 }], ['shape', 'room-door', 22, 3.1, 0, { facing: Math.PI / 2 }], ['shape', 'room-door', 31, 6.9, 0, { facing: -Math.PI / 2 }],
    ['shape', 'room-door', 20, 16.1, 0, { facing: Math.PI / 2 }], ['shape', 'room-door', 33, 19.9, 0, { facing: -Math.PI / 2 }], ['shape', 'room-service-cart', 33.2, 18.9, 0], ['shape', 'room-service-cart', 35.5, 5.0, 0],
    ['shape', 'room7-door', 14.5, 14.1, 0, { facing: Math.PI / 2 }], ['shape', 'bed', 16, 1.6, 0, { facing: Math.PI / 2 }], ['shape', 'bed', 16, 9.8, 0, { facing: -Math.PI / 2 }], ['shape', 'bed', 13, 22.6, 0, { facing: -Math.PI / 2 }],
    ['shape', 'shaft-doors', 40.8, 18, 0, { facing: Math.PI }], ['pen', 'service-bell', 92, 5, 3.6], ['pen', 'lightwell', 41, 1, 0, { x1: 98, y1: 24 }], ['pen', 'broken-floor', 26, 13, 0, { x1: 28, y1: 16 }],
    ['light', 8, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }], ['light', 20, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12, flicker: .6 }], ['light', 33, 5, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }],
    ['light', 20, 18, 2.4, { color: '#d8ffd0', reach: 110, power: 12 }], ['light', 34, 18, 2.4, { color: '#ffe0b0', reach: 110, power: 12 }], ['light', 92, 5, 6, { color: '#ffd080', reach: 240, power: 30 }], ['light', 14.5, 15.5, 2, { color: '#ffc880', reach: 70, power: 8 }]
  ]
});

/* ---- 00C THE SERVICE SHAFT (Bellcaptain Grau): a ring rail round the shaft floor; the car runs up and down ---- */
S7.area('00C', {
  title: 'THE SERVICE SHAFT', sub: 'BELLCAPTAIN AUGUSTIN GRAU', target: 0, music: 'shaft', ambience: 'shaft', start: 'n1', interior: true, accent: '#d01818', boss: 'grau',
  world: {
    level: { rows: B(18, 18, [['fill', 2, 2, 15, 15, '.'], ['fill', 7, 7, 10, 10, 'o']]), legend: { '#': { wall: 340 }, o: { floor: 0, ground: 'metal' } }, ground: 'flagstone', colors: { base: '#3a3438', dark: '#1a1418', light: '#5a5458' }, side: 'metal', color: '#2a2026', wallSide: 'brick' },
    sky: '#020102', fog: { color: '#100406', near: 120, far: 700 }, ambient: ['#5a2028', '#100406', 1.1], torchLights: 0, lights: 6, glowLights: 6, overlay: { fov: 64 },
    filter: { bands: 3, ink: 1, inkW: 1.6, punch: 1.5 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: { n1: { t: [4, 4], label: 'NORTH-WEST' }, n2: { t: [14, 4], label: 'NORTH-EAST' }, n3: { t: [14, 14], label: 'SOUTH-EAST' }, n4: { t: [4, 14], label: 'SOUTH-WEST' } },
  edges: [['n1', 'n2', [15.4, 2.6, 2.2]], ['n2', 'n3', [15.4, 15.4, 2.2]], ['n3', 'n4', [2.6, 15.4, 2.2]], ['n4', 'n1', [2.6, 2.6, 2.2]]].map(([a, b, at]) => ({ a, b, cams: [{ s: [0, 1], shot: 'fixed', at, look: 'hero', lookUp: 3, fov: 64 }], rcams: [{ s: [0, 1], shot: 'fixed', at: [18 - at[0], 18 - at[1], 2.2], look: 'hero', lookUp: 3, fov: 64 }] })),
  spots: [], spawns: { top1: [6, 6], top2: [12, 12], top3: [12, 6], top4: [6, 12] },
  props: [['pen', 'shaft', 9, 9, 0], ['light', 9, 9, 9, { color: '#ff3030', reach: 220, power: 16, flicker: 0 }], ['light', 9, 9, 3, { color: '#ffd8b0', reach: 160, power: 10 }], ['light', 3, 3, 2, { color: '#ff6040', reach: 120, power: 10 }], ['light', 15, 15, 2, { color: '#ff6040', reach: 120, power: 10 }]],
  onEnter(G) { if (!G.flags.grauDead) S7.runBeat('grau_intro'); }
});

/* ==== content/areas-t01.js ==== */
/* SKILLER7 content — Target 01 "Après": Oberglück, the Palais des Neiges, the Black Run, the Himmelsbahn, the Glacier
 * Archive, the Summit. Terrain areas give a height function (engine units in and out) shared by the sim and the 3D world. */
const B1 = S7.buildRows;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const snowColor = tint => (x, y, z, nz, out) => {
  const n = E.noise2(x / 300, y / 300), f = E.noise2(x / 41, y / 41), k = .86 + f * .1 + n * .05, steep = sstep(.92, .7, nz);
  out[0] = (238 - steep * 60) * k * tint[0]; out[1] = (242 - steep * 52) * k * tint[1]; out[2] = (250 - steep * 30) * k * tint[2]; return out;
};

/* ---- 01A OBERGLÜCK, THE VILLAGE (96 x 48; snow; dusk; chalets as walls; the church tower 80 m from the lookout) ---- */
S7.area('01A', {
  title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'village', start: 'ht', accent: '#c8302a', snow: .7, wind: .3,
  world: {
    level: {
      rows: B1(96, 48, [
        ['fill', 3, 12, 92, 16, '.'], ['fill', 30, 2, 34, 45, '.'], ['fill', 8, 30, 62, 34, '.'], ['fill', 44, 9, 60, 18, '.'], ['fill', 7, 8, 18, 20, '.'],
        ['fill', 26, 27, 42, 37, '.'], ['fill', 50, 16, 54, 25, '.'], ['fill', 28, 37, 36, 46, '.'], ['fill', 1, 9, 5, 19, 'C'], ['fill', 6, 13, 7, 15, 'B'],
        ['fill', 36, 24, 40, 26, 'L'], ['fill', 0, 0, 95, 0, 'X'], ['fill', 0, 47, 95, 47, 'X'], ['fill', 0, 0, 0, 47, 'X'], ['fill', 95, 0, 95, 47, 'X']
      ], 'H'),
      legend: { H: { wall: 80 }, C: { wall: 128 }, B: { wall: 200 }, L: { wall: 64 }, X: { wall: 160 } },
      ground: 'snow', colors: { base: '#e8ecf4', dark: '#9aa4c0', light: '#ffffff' }, side: 'earth', color: '#5a4636', wallSide: 'planks'
    },
    sky: ['#2a2440', '#e8a070'], fog: { color: '#b88a80', near: 300, far: 1500 }, ambient: ['#b0a0c0', '#5a4a50', 1.3], sun: { color: '#ffb070', intensity: 2.4, dir: [.8, .25, -.35] },
    torchLights: 3, torchShadows: 0, lights: 6, glowLights: 6, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.3 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    ht: { t: [14.5, 32.5], kind: 'stop', label: 'HOTEL STEPS' }, ls: { t: [32.5, 32.5], label: 'LIFT STATION' }, f2: { t: [32.5, 23.5] }, f1: { t: [32.5, 14.5] },
    ch: { t: [11.5, 14.5], kind: 'stop', label: 'CHURCH SQUARE' }, mk: { t: [52.5, 14.5], label: 'THE MARKET' }, mu: { t: [52.5, 23.5], kind: 'stop', label: 'SKI SCHOOL' },
    r7a: { t: [70.5, 14.5], kind: 'door', label: 'ROOM 7' }, lk: { t: [88.5, 14.5], kind: 'stop', label: 'THE LOOKOUT' },
    pg: { t: [32.5, 3.2], kind: 'exit', open: true, label: 'PALAIS DES NEIGES', to: ['01B', 'e1'] },
    tq: { t: [43.5, 32.5], kind: 'stop', label: 'TURNSTILE' }, tb: { t: [58.5, 32.5], kind: 'exit', open: true, label: 'T-BAR', to: ['01C', 'tbB'] },
    gq: { t: [32.5, 39.5], kind: 'stop', label: 'DELEGATE GATE' }, gg: { t: [32.5, 45.0], kind: 'exit', open: true, label: 'HIMMELSBAHN', to: ['01D', 'gs'] }
  },
  edges: [
    { a: 'ht', b: 'ls' }, { a: 'ls', b: 'f2' }, { a: 'f2', b: 'f1' }, { a: 'f1', b: 'ch' }, { a: 'f1', b: 'mk' }, { a: 'f1', b: 'pg' }, { a: 'mk', b: 'mu' }, { a: 'mk', b: 'r7a' }, { a: 'r7a', b: 'lk' },
    { a: 'ls', b: 'tq', gate: 'drift' }, { a: 'tq', b: 'tb', gate: 'turnstile' }, { a: 'ls', b: 'gq' }, { a: 'gq', b: 'gg', gate: 'delegate' }
  ],
  gates: {
    drift: { kind: 'flag', flag: 'liftClear', line: 'The lift station is buried under its own roof. Something has to shake it loose.', hint: 'bell1' },
    turnstile: { kind: 'buyout', price: 40, who: 'rurik', line: 'A turnstile. Forty Red. Someone with means.', at: [44, 32.5, 1] },
    delegate: { kind: 'delegate', line: 'DELEGATES ONLY. Three Edelweiss slots.', at: [32.5, 41, 1] }
  },
  targets: [{ id: 'churchbell', at: [6.5, 14, 13.4], r: 1.4, far: true, flag: 'liftClear', beat: 'church_bell' }],
  spots: [
    { id: 'r7a', node: 'r7a', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel1', node: 'mu', kind: 'npc', who: 'murmel', label: 'MURMEL' }, { id: 'doc_prices', edge: 'mk-mu', s: .7, kind: 'pickup', item: 'doc_prices' },
    { id: 'turnstile', node: 'tq', kind: 'gate', gate: 'turnstile', label: 'TURNSTILE' }, { id: 'delegate', node: 'gq', kind: 'gate', gate: 'delegate', label: 'DELEGATE GATE' },
    { id: 'booth', node: 'gq', kind: 'phone', beat: 'concierge_booth', once: true, label: 'PHONE BOOTH', r: 3 }, { id: 'pin3', edge: 'f2-f1', s: .5, kind: 'pickup', item: 'pin3' },
    { id: 'pim3', node: 'f1', kind: 'npc', who: 'pim', beat: 'pim3', once: true, label: 'THE LIFT BOY', r: 3 },
    { id: 'tab1', node: 'ch', kind: 'tableau', lines: 'village1', label: 'A FROZEN VILLAGER' }, { id: 'tab2', node: 'ls', kind: 'tableau', lines: 'village2', label: 'A FROZEN WOMAN' }, { id: 'tab3', node: 'mu', kind: 'tableau', lines: 'village3', label: 'THE SKI INSTRUCTOR', r: 1.2 },
    { id: 'lookout1', node: 'lk', kind: 'tableau', lines: 'lookout1', label: 'THE CHURCH TOWER' }, { id: 'rimeA1', edge: 'f1-ch', s: .6, kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeA2', edge: 'r7a-lk', s: .5, kind: 'pickup', item: 'rime', n: 4 },
    { id: 'redA1', edge: 'ht-ls', s: .5, kind: 'pickup', item: 'red5', n: 10 }, { id: 'redA2', edge: 'f1-mk', s: .4, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redA3', edge: 'ls-gq', s: .5, kind: 'pickup', item: 'red5', n: 10 }
  ],
  spawns: { m1: [58.5, 10.5], m2: [46.5, 17.5], m3: [60.5, 17.5], mplow: [59.5, 14.5], mroof: [50.5, 8.5, 5], c1: [9.5, 9.5], c2: [9.5, 19.5], s1: [20.5, 31.5], s2: [40.5, 34.5], s3: [28.5, 28.5], k1: [80.5, 13.5], k2: [90.5, 15.5] },
  waves: {
    market: { spawn: [['giggler', 'm1', 0], ['giggler', 'm2', .8], ['plow', 'mplow', 1.6], ['giggler', 'm3', 2.6], ['snowballer', 'mroof', 0]] },
    church: { spawn: [['twins', 'c1', 0], ['twins', 'c2', 1.2]] }, square: { spawn: [['bellboy', 's1', 0], ['giggler', 's2', .6], ['giggler', 's3', 1.4]] }, lookout: { spawn: [['giggler', 'k1', 0], ['giggler', 'k2', 1.2]] }
  },
  triggers: [{ id: 'seven', node: 'ls', tip: 'seven' }, { id: 'market', node: 'mk', wave: 'market' }, { id: 'church', node: 'ch', wave: 'church' }, { id: 'square', edge: 'ls-gq', s: .3, wave: 'square', when: 'band' }, { id: 'lookoutW', node: 'lk', wave: 'lookout' }],
  props: [
    ['shape', 'gluehwein-stall', 47, 10, 0, { facing: Math.PI / 2 }], ['shape', 'gluehwein-stall', 57, 10, 0, { facing: Math.PI / 2 }], ['shape', 'gluehwein-stall', 47, 18, 0, { facing: -Math.PI / 2 }],
    ['shape', 'ski-rack', 50.5, 24.5, 0], ['shape', 'phone-booth', 34.5, 39.5, 0, { facing: Math.PI }], ['shape', 'turnstile', 44.5, 33.6, 0], ['shape', 'fountain', 36.5, 19.5, 0],
    ['shape', 'room7-door', 70.5, 11.9, 0, { facing: Math.PI / 2 }], ['shape', 'lamppost', 28.5, 14.5, 0], ['shape', 'lamppost', 36.5, 30, 0], ['shape', 'lamppost', 66, 16.5, 0], ['shape', 'lamppost', 20, 33.8, 0],
    ['shape', 'kenney-holiday:snowman', 24, 34, 0, { facing: -Math.PI / 2 }], ['shape', 'kenney-holiday:tree-snow-b', 10, 34, 0], ['shape', 'kenney-holiday:tree-snow-c', 42, 40, 0], ['shape', 'kenney-holiday:tree-snow-b', 22, 44, 0],
    ['shape', 'kenney-holiday:sled-long', 54, 30.5, 0], ['shape', 'bench', 13, 18, 0], ['shape', 'delegate-gate', 32.5, 41.5, 0],
    ['pen', 'string-lights', 44, 12, 4.4, { x1: 60 }], ['pen', 'string-lights', 44, 17, 4.4, { x1: 60 }], ['pen', 'church-bell', 6.5, 14, 13.4], ['pen', 'roof-drift', 38, 25, 4], ['pen', 'tbar-pylon', 58.5, 31, 0],
    ['light', 47, 10, 1.5, { color: '#ff9040', reach: 120, power: 14, flicker: .2 }], ['light', 57, 10, 1.5, { color: '#ff9040', reach: 120, power: 14, flicker: .2 }], ['light', 52, 14, 4, { color: '#ffd080', reach: 200, power: 16 }],
    ['light', 32.5, 23, 4, { color: '#ffd8a0', reach: 160, power: 12 }], ['light', 32.5, 39, 3, { color: '#ffe0b0', reach: 140, power: 12 }]
  ],
  people: [['murmel', 51.4, 24.6, 1.4, -Math.PI / 2, 'murmel'], ['pim', 33.5, 15.5, 4.2, Math.PI / 2, 'pimseat'], ['villager', 12.5, 16, 0, -1, 'frozen'], ['villager2', 31, 33.5, 0, 0, 'frozen'], ['instructor', 53.6, 24, 0, 2, 'frozen']]
});

/* ---- 01B PALAIS DES NEIGES (60 x 40; marble; glass; two delegation halls; the ballroom) ---- */
S7.area('01B', {
  title: 'PALAIS DES NEIGES', sub: 'THE SUMMIT CONFERENCE', target: 1, music: 'palais', ambience: 'roomtone', start: 'e1', interior: true, accent: '#3a6ac8',
  world: {
    level: {
      rows: B1(60, 40, [
        ['fill', 2, 18, 8, 22, '.'], ['fill', 9, 19, 16, 21, '.'], ['fill', 17, 15, 24, 25, '.'], ['fill', 20, 9, 22, 14, '.'], ['fill', 23, 7, 36, 13, '.'], ['fill', 37, 10, 37, 10, '.'],
        ['fill', 37, 9, 49, 11, '.'], ['fill', 50, 7, 56, 13, '.'], ['fill', 51, 14, 53, 15, '.'], ['fill', 44, 16, 58, 30, '.'], ['fill', 46, 16, 56, 17, '='], ['fill', 51, 31, 53, 37, '.'],
        ['fill', 19, 26, 21, 26, '.'], ['fill', 14, 27, 26, 33, '.'], ['fill', 12, 30, 13, 31, '.'], ['fill', 6, 32, 12, 38, '.'], ['fill', 25, 22, 29, 24, '.'], ['fill', 28, 25, 29, 26, '.'],
        ['fill', 28, 27, 40, 33, '.'], ['fill', 37, 34, 38, 34, '.'], ['fill', 36, 35, 42, 38, '.'], ['set', 11, 20, 'A'], ['set', 11, 18, 'A'], ['set', 11, 22, 'A'],
        ['set', 18, 16, 'P'], ['set', 23, 16, 'P'], ['set', 18, 24, 'P'], ['set', 23, 24, 'P'], ['fill', 18, 29, 22, 31, 'T'], ['fill', 32, 29, 36, 31, 'T']
      ]),
      legend: { '#': { wall: 96 }, '=': { floor: 16, side: 'block' }, P: { pillar: 96 }, A: { wall: 40 }, T: { wall: 12 } },
      ground: 'tiles', colors: { base: '#d8dce8', dark: '#4a5068', light: '#f0f2f8' }, side: 'block', color: '#3a4058', wallSide: 'block'
    },
    sky: '#04060c', fog: { color: '#0a0c14', near: 160, far: 800 }, ambient: ['#5a6890', '#10121a', 1.15], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.35 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    e1: { t: [4.5, 20.5], kind: 'stop', label: 'ENTRANCE' }, sc: { t: [12.5, 20.5], label: 'SECURITY' }, at: { t: [20.5, 20.5], label: 'ATRIUM' }, cf: { t: [20.5, 28.4], label: 'COASTAL HALL' },
    pr: { t: [9.5, 35.5], kind: 'stop', label: 'PRESS ROOM' }, sd: { t: [33.5, 27.8], label: 'STEPPE HALL' }, ck: { t: [39.5, 36.5], kind: 'door', label: 'CLOAKROOM' },
    hm: { t: [27.5, 10.5], label: 'HALL OF MIRRORS' }, hw: { t: [35.5, 10.5], kind: 'stop', label: 'THE MIRROR WALL' }, sp: { t: [44.5, 10.5], label: 'SERVANTS\' PASSAGE' }, bb: { t: [52.5, 10.5], label: 'BACKSTAGE' },
    br: { t: [51.5, 28.4], kind: 'stop', label: 'THE BALLROOM' }, bx: { t: [52.5, 37.0], kind: 'exit', open: true, label: 'BACK EXIT', to: ['01A', 'f1'] }, e0: { t: [2.5, 20.5], kind: 'exit', open: true, label: 'TO THE VILLAGE', to: ['01A', 'pg'] }
  },
  edges: [
    { a: 'e0', b: 'e1' }, { a: 'e1', b: 'sc' }, { a: 'sc', b: 'at' }, { a: 'at', b: 'cf', via: [[20.5, 26]] }, { a: 'cf', b: 'pr', via: [[13, 30.5], [9.5, 32.5]] }, { a: 'at', b: 'sd', via: [[27, 23.4], [28.6, 26]] },
    { a: 'sd', b: 'ck', via: [[37.5, 34]] }, { a: 'at', b: 'hm', via: [[21, 12], [23.5, 10.5]] }, { a: 'hm', b: 'hw' }, { a: 'hw', b: 'sp', gate: 'mirrors' }, { a: 'sp', b: 'bb' },
    { a: 'bb', b: 'br', via: [[52.5, 15]] }, { a: 'br', b: 'bx', gate: 'bandexit' }
  ],
  gates: {
    mirrors: { kind: 'echowall', at: [37, 10.5, 1.5], done: 'THE WALL SINGS OPEN.', flag: 'mirrors', line: 'An ornate wall of mirrors. It hums when you speak.', hint: 'mirrors' },
    bandexit: { kind: 'flag', flag: 'band', line: 'The band is still playing.' }
  },
  spots: [
    { id: 'ck', node: 'ck', kind: 'room7', label: 'ROOM 7' }, { id: 'phone_at', node: 'at', kind: 'phone', beat: 'concierge_atrium', once: true, label: 'HOUSE PHONE', r: 3 },
    { id: 'safe', node: 'cf', kind: 'codelock', code: '2601', label: 'THE SAFE', once: true }, { id: 'board', at: [7, 37.6, 1.6], kind: 'exposure', item: 'exp_board', flag: 'exposure1', beat: 'board_developed' },
    { id: 'pin4', edge: 'sp-bb', s: .4, kind: 'pickup', item: 'pin4' }, { id: 'rimeB1', node: 'pr', kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeB2', edge: 'sd-ck', s: .5, kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeB3', edge: 'bb-br', s: .3, kind: 'pickup', item: 'rime', n: 3 },
    { id: 'redB1', edge: 'sc-at', s: .5, kind: 'pickup', item: 'red5', n: 10 }, { id: 'redB2', edge: 'at-cf', s: .5, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redB3', edge: 'hm-hw', s: .5, kind: 'pickup', item: 'red5', n: 10 },
    { id: 'mirrorwall', node: 'hw', kind: 'tableau', lines: 'mirrorwall', label: 'THE MIRROR WALL', when: '', r: 2 },
    { id: 'amb', node: 'cf', kind: 'tableau', lines: 'coastal', label: 'THE COASTAL AMBASSADOR', r: 3.2 }, { id: 'gen', node: 'sd', kind: 'tableau', lines: 'steppe', label: 'THE STEPPE GENERAL', r: 3.2 },
    { id: 'interp', edge: 'at-sd', s: .5, kind: 'tableau', lines: 'interpreter', label: 'THE INTERPRETER', r: 2 }, { id: 'waiter', edge: 'sc-at', s: .8, kind: 'tableau', lines: 'waiter', label: 'A WAITER', r: 1.6 },
    { id: 'journo', node: 'pr', kind: 'tableau', lines: 'journalist', label: 'A JOURNALIST', r: 3 }, { id: 'secretary', edge: 'cf-pr', s: .5, kind: 'tableau', lines: 'secretary', label: 'A SECRETARY', r: 1.8 }
  ],
  spawns: { sec1: [15.5, 19.5], sec2: [15.5, 21.5], sec3: [22.5, 17.5], sec4: [22.5, 23.5], co1: [25.5, 32.5], co2: [15.5, 32.5], co3: [24.5, 27.5], st1: [38.5, 28.5], st2: [38.5, 32.5], dk1: [7.5, 37.5], dk2: [11.5, 33.5], dk3: [6.5, 33.5],
    ins: [36.5, 28.5], hm1: [34.5, 8.5], hm2: [34.5, 12.5] },
  waves: {
    security: { spawn: [['bellboy', 'sec1', 0], ['bellboy', 'sec2', .6], ['giggler', 'sec3', 1.2], ['giggler', 'sec4', 2]] }, coast: { spawn: [['plow', 'co1', 0], ['giggler', 'co2', .8], ['giggler', 'co3', 1.6]] },
    steppe: { spawn: [['twins', 'st1', 0], ['twins', 'st2', 1.2]] }, dark: { spawn: [['giggler', 'dk1', 0], ['giggler', 'dk2', 1], ['giggler', 'dk3', 2]] }, mirrorsW: { spawn: [['bellboy', 'hm1', 0], ['giggler', 'hm2', 1]] }
  },
  triggers: [
    { id: 'security', edge: 'e1-sc', s: .6, wave: 'security', tip: 'scan' }, { id: 'coast', node: 'cf', wave: 'coast' }, { id: 'steppe', node: 'sd', wave: 'steppe' }, { id: 'inspector', node: 'sd', beat: 'inspector', when: 'wave:01B:steppe' },
    { id: 'insp2', edge: 'at-sd', s: .3, beat: 'inspector', when: 'inspectorGone' }, { id: 'dark', node: 'pr', wave: 'dark' }, { id: 'mirrorsW', node: 'hm', wave: 'mirrorsW' }, { id: 'band', node: 'br', beat: 'band_intro', unless: 'band' }
  ],
  props: [
    ['shape', 'security-arch', 11.5, 20.5, 0, { facing: 0 }], ['shape', 'flag-coastal', 15, 27.5, 0], ['shape', 'flag-coastal', 25, 27.5, 0], ['shape', 'flag-steppe', 29, 27.5, 0], ['shape', 'flag-steppe', 39, 27.5, 0], ['shape', 'flag-steppe', 34, 33.4, 0],
    ['shape', 'conference-table', 20, 30, 0], ['shape', 'conference-table', 34, 30, 0], ['shape', 'safe4', 15, 33.4, 0, { facing: -Math.PI / 2 }], ['shape', 'blackboard', 7, 38.4, 0, { facing: -Math.PI / 2 }],
    ['shape', 'interpreter-booth', 27.5, 23.4, 0], ['shape', 'press-pinboard', 11.5, 38.4, 0, { facing: -Math.PI / 2 }], ['shape', 'room7-door', 40.5, 38.4, 0, { facing: -Math.PI / 2 }],
    ['pen', 'mirror-wall', 37, 10.5, 0], ['pen', 'mirrors', 23, 7, 0, { x1: 36 }], ['pen', 'chandelier', 20.5, 20.5, 5.4], ['pen', 'chandelier', 51, 23, 5.4], ['pen', 'stage', 46, 16, 1, { x1: 56 }], ['pen', 'dancefloor', 47, 20, 0, { x1: 57, y1: 29 }],
    ['light', 20.5, 20.5, 5, { color: '#e0e8ff', reach: 220, power: 22 }], ['light', 20, 30, 4, { color: '#e8f0ff', reach: 160, power: 14 }], ['light', 34, 30, 4, { color: '#e8f0ff', reach: 160, power: 14 }],
    ['light', 30, 10, 4, { color: '#f0e8ff', reach: 180, power: 16 }], ['light', 51, 22, 5, { color: '#ffd0a0', reach: 260, power: 26 }], ['light', 51, 17, 2.5, { color: '#ff7040', reach: 160, power: 14 }]
  ],
  people: [['ambassador', 19, 29.2, 0, 1.6, 'frozen'], ['general', 34, 29.2, 0, 1.6, 'frozen'], ['interpreter', 26.5, 23.5, 0, 0, 'frozen'], ['waiter', 16.6, 20.4, 0, 0, 'frozen'], ['journalist', 10.5, 34, 0, 2.6, 'frozen'], ['secretary', 12.5, 31.5, 0, 0, 'frozen']],
  dark: { region: [6, 32, 12, 38] }
});

/* ---- 01C THE BLACK RUN (terrain: a plateau at 380 m, the slope to the village; a ridge with a crevasse; the T-bar) ---- */
const H01C = (x, y) => {
  const m = x / M, n = y / M;
  let z = 380 * (1 - sstep(108, 860, n));
  z += Math.sin(m / 23) * Math.cos(n / 31) * 2.2 + Math.sin(m / 9 + n / 13) * .6;
  z += Math.pow((m - 150) / 170, 2) * 70 * sstep(100, 300, n) * (1 - sstep(780, 860, n));
  z -= 9 * Math.exp(-Math.pow((m - 192) / 14, 2) - Math.pow((n - 345) / 26, 2));   // the gully under the kicker
  z += 14 * sstep(190, 230, m) * (1 - sstep(105, 125, n));                            // the ridge
  z -= 50 * Math.exp(-Math.pow((m - 243) / 3.2, 2)) * (1 - sstep(80, 105, n));          // the crevasse
  return z * M;
};
S7.H01C = H01C;
S7.area('01C', {
  title: 'THE BLACK RUN', sub: 'PIZ NADA, NORTH FACE', target: 1, music: 'blackrun', ambience: 'wind', start: 'tbB', accent: '#ff7a1e', snow: 1, wind: .6, statueAt: 'vb',
  world: {
    terrain: { size: 15360, height: H01C, color: snowColor([.96, .98, 1.04]), cell: 32, far: 9000, rock: { colors: ['#4a4e5a', '#5a5e6a', '#3a3e48'], band: 30, slope: [.55, .8] }, speckle: .05, mottle: .1 },
    sky: { top: '#02040c', horizon: '#1a2440', ground: '#0a0c14', sun: '#a0b0ff', haze: .2 }, fog: { color: '#0a1020', near: 400, far: 5200 }, ambient: ['#7080b0', '#202430', 1.25],
    sun: { color: '#b8c4ff', intensity: 1.6, dir: [-.3, .6, -.7] }, torchLights: 0, lights: 6, glowLights: 4, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.35 }, camera: { mode: 'fixed', near: 1, far: 9000 }
  },
  nodes: {
    tbB: { t: [80, 884], kind: 'stop', label: 'T-BAR (BOTTOM)' }, tbT: { t: [80, 96], kind: 'stop', label: 'T-BAR (TOP)' }, ts: { t: [110, 72], kind: 'door', label: 'TOP STATION' },
    st: { t: [122, 112], kind: 'start', label: 'START GATE', go: 'st-f1' }, pr: { t: [165, 62], kind: 'stop', label: 'PATROL ROPE' }, cr: { t: [222, 58], kind: 'stop', label: 'THE RIDGE' },
    as: { t: [268, 58], kind: 'stop', label: 'AVALANCHE SHELTER' }, jp: { t: [268, 112], kind: 'stop', label: 'THE LIP' },
    f1: { t: [122, 200] }, bl1: { t: [62, 330] }, bl2: { t: [72, 520] }, bk1: { t: [148, 360] }, bk2: { t: [160, 545] }, jk: { t: [188, 300] },
    al: { t: [252, 200] }, ax1: { t: [238, 285] }, ax2: { t: [228, 400] }, ax3: { t: [200, 470] },
    f2: { t: [122, 700] }, vb: { t: [100, 868], kind: 'exit', label: 'OBERGLÜCK', to: ['01A', 'ls'], anyway: true }
  },
  edges: [
    { a: 'tbB', b: 'tbT', kind: 'lift', ground: true, speed: 380, via: [[80, 700], [80, 500], [80, 300], [80, 150]] },
    { a: 'tbT', b: 'ts' }, { a: 'ts', b: 'st' }, { a: 'ts', b: 'pr' }, { a: 'pr', b: 'cr', gate: 'rope' }, { a: 'cr', b: 'as', hidden: 'cornice', bridge: true }, { a: 'as', b: 'jp' },
    { a: 'jp', b: 'al', kind: 'jump', onlyFor: 'dagny', apex: 3 },
    { a: 'st', b: 'f1', kind: 'ski', label: 'DOWNHILL' },
    { a: 'f1', b: 'bl1', kind: 'ski', label: 'BLUE', via: [[90, 260]] }, { a: 'bl1', b: 'bl2', kind: 'ski', via: [[40, 430]] }, { a: 'bl2', b: 'f2', kind: 'ski', via: [[100, 620]] },
    { a: 'f1', b: 'bk1', kind: 'ski', label: 'BLACK' }, { a: 'bk1', b: 'bk2', kind: 'ski' }, { a: 'bk2', b: 'f2', kind: 'ski' },
    { a: 'f1', b: 'jk', kind: 'ski', label: 'THE JUMP', onlyFor: 'dagny' }, { a: 'jk', b: 'bk2', kind: 'jump', apex: 5, slow: true },
    { a: 'al', b: 'ax1', kind: 'ski' }, { a: 'ax1', b: 'ax2', kind: 'ski', label: 'LEFT', via: [[214, 340]] }, { a: 'ax1', b: 'ax2', id: 'ax1-ax2b', kind: 'ski', label: 'RIGHT', via: [[256, 345]] },
    { a: 'ax2', b: 'ax3', kind: 'ski', label: 'LEFT', via: [[206, 430]] }, { a: 'ax2', b: 'ax3', id: 'ax2-ax3b', kind: 'ski', label: 'RIGHT', via: [[236, 440]] }, { a: 'ax3', b: 'bk2', kind: 'ski' },
    { a: 'f2', b: 'vb', kind: 'ski' }
  ],
  gates: {
    rope: { kind: 'patrol', line: 'CLOSED — AVALANCHE DANGER — PATROL ONLY. You are not patrol.', hint: 'patrol', flag: 'patrol' },
    cornice: { kind: 'cornice', at: [236.5, 54, 1.5], done: 'THE CORNICE COMES DOWN.', flag: 'cornice', beat: 'cornice_down' }
  },
  spots: [
    { id: 'ts', node: 'ts', kind: 'room7', label: 'ROOM 7' }, { id: 'murmel2', node: 'tbT', kind: 'npc', who: 'murmel', label: 'MURMEL', r: 3 }, { id: 'vbx', node: 'vb', kind: 'exit', label: 'INTO THE VILLAGE' },
    { id: 'edel3', node: 'as', kind: 'pickup', item: 'edelweiss', r: 2 }, { id: 'pin5', edge: 'cr-as', s: .8, kind: 'pickup', item: 'pin5' }, { id: 'doc_1926', edge: 'as-jp', s: .2, kind: 'pickup', item: 'doc_1926' },
    { id: 'cornice', node: 'cr', kind: 'tableau', lines: 'cornice', label: 'THE CORNICE', r: 2 }, { id: 'redC1', node: 'ts', kind: 'pickup', item: 'red5', n: 12, r: 3 },
    { id: 'redC2', edge: 'f1-bl1', s: .5, kind: 'pickup', item: 'red5', n: 10, r: 2.5 }, { id: 'redC3', edge: 'bk1-bk2', s: .5, kind: 'pickup', item: 'red5', n: 12, r: 2.5 }, { id: 'redC4', edge: 'ts-pr', s: .5, kind: 'pickup', item: 'red5', n: 10 },
    { id: 'rimeC1', edge: 'pr-cr', s: .5, kind: 'pickup', item: 'rime', n: 5 }, { id: 'rimeC2', edge: 'bl1-bl2', s: .5, kind: 'pickup', item: 'rime', n: 4, r: 2.5 }
  ],
  spawns: { tb1: [104, 600], tb2: [52, 420], tb3: [110, 250], b11: [70, 290], b12: [84, 300], b13: [56, 300], b21: [58, 480], b22: [86, 470], k1: [150, 430], k2: [140, 500], k3: [170, 500], k4: [150, 470], sh1: [262, 70], sh2: [274, 76] },
  waves: {
    tbar: { spawn: [['snowballer', 'tb1', 0], ['snowballer', 'tb2', 0], ['snowballer', 'tb3', 0]] },
    blue1: { spawn: [['tobogganer', 'b11', 0], ['tobogganer', 'b12', .6], ['tobogganer', 'b13', 1.2]] }, blue2: { spawn: [['tobogganer', 'b21', 0], ['tobogganer', 'b22', .8]] },
    black1: { spawn: [['plow', 'k1', 0]] }, black2: { spawn: [['tobogganer', 'k2', 0], ['tobogganer', 'k3', .5], ['tobogganer', 'k4', 1]] }, shelter: { spawn: [['giggler', 'sh1', 0], ['giggler', 'sh2', 1]] }
  },
  triggers: [
    { id: 'tbar', edge: 'tbB-tbT', s: .05, wave: 'tbar' }, { id: 'skitip', node: 'st', tip: 'ski' }, { id: 'blue1', edge: 'f1-bl1', s: .3, wave: 'blue1' }, { id: 'blue2', edge: 'bl1-bl2', s: .5, wave: 'blue2' },
    { id: 'black1', edge: 'f1-bk1', s: .7, wave: 'black1' }, { id: 'black2', edge: 'bk1-bk2', s: .3, wave: 'black2' }, { id: 'shelter', edge: 'as-jp', s: .4, wave: 'shelter' },
    { id: 'lawine', node: 'al', beat: 'lawine', unless: 'lawineDone' }, { id: 'lawineEnd', node: 'bk2', flag: 'lawineEnd', when: 'lawine' }, { id: 'slowjump', edge: 'jk-bk2', s: .45, beat: 'slowjump' }
  ],
  props: [
    ['shape', 'room7-door', 112, 70, 0, { facing: Math.PI / 2 }], ['shape', 'top-station', 104, 64, 0], ['shape', 'shelter-hut', 272, 51, 0], ['shape', 'start-gate', 122, 110, 0],
    ['pen', 'piste-poles', 0, 0, 0], ['pen', 'patrol-rope', 165, 62, 0], ['pen', 'cornice', 238, 54, 0], ['pen', 'floodlights', 0, 0, 0], ['pen', 'tbar-line', 80, 96, 0], ['pen', 'kicker', 188, 300, 0],
    ['light', 122, 112, 8, { color: '#ffe8c0', reach: 260, power: 24 }], ['light', 150, 380, 14, { color: '#ffe8c0', reach: 400, power: 40 }], ['light', 90, 600, 14, { color: '#ffe8c0', reach: 400, power: 40 }], ['light', 110, 860, 10, { color: '#ffd0a0', reach: 300, power: 30 }]
  ],
  people: [['murmel', 78, 92, 1.4, 1.6, 'murmel']]
});

/* ---- 01D HIMMELSBAHN (terrain: a valley; one lift edge of 900 m; the power cut at 55%; the storm) ---- */
const D_BASE = m => 20 + m * .42 + 60 * sstep(820, 900, m);
const H01D = (x, y) => { const m = x / M, n = y / M, v = Math.abs(n - 300) / 140; return (D_BASE(m) + v * v * 90 + Math.sin(m / 37) * 8 + Math.cos(n / 29) * 5) * M; };
const CABLE = m => D_BASE(m) + 13 + 34 * Math.sin(Math.PI * Math.max(0, Math.min(1, m / 905)));
S7.CABLE = CABLE;
S7.area('01D', {
  title: 'HIMMELSBAHN', sub: 'THE GONDOLA', target: 1, music: 'gondola', ambience: 'storm', start: 'gs', accent: '#5a8ac8', snow: 1, wind: 1, statueAt: 'gs',
  world: {
    terrain: { size: 16384, height: H01D, color: snowColor([.9, .95, 1.06]), cell: 32, far: 7000, rock: { colors: ['#3a3e4a', '#4a4e5a'], band: 30, slope: [.45, .7] }, speckle: .05, mottle: .15 },
    sky: { top: '#060812', horizon: '#3a4058', ground: '#10121a', sun: '#8090c0', haze: .6 }, fog: { color: '#4a5068', near: 200, far: 2600 }, ambient: ['#8090b0', '#30343e', 1.3],
    sun: { color: '#a8b8ff', intensity: 1.2, dir: [.3, .4, -.8] }, torchLights: 0, lights: 5, glowLights: 4, overlay: { fov: 64 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.3 }, camera: { mode: 'fixed', near: 1, far: 8000 }
  },
  nodes: { gs: { t: [40, 300, CABLE(40) - 1.6], kind: 'stop', label: 'VALLEY STATION' }, gl: { t: [905, 300, CABLE(905) - 1.6], kind: 'exit', open: true, label: 'GLACIER STATION', to: ['01E', 'gl'], anyway: true } },
  edges: [{ a: 'gs', b: 'gl', kind: 'lift', cabin: true, speed: 120, via: Array.from({ length: 17 }, (_, i) => { const m = 40 + (i + 1) * 50; return [m, 300, CABLE(m) - 1.6]; }),
    cams: [{ s: [0, .2], shot: 'follow', back: 7, side: 5, up: 2.4, ahead: 2, fov: 56 }, { s: [.2, .45], shot: 'follow', back: -9, side: -4, up: 1.2, ahead: -2, fov: 54 }, { s: [.45, .7], shot: 'follow', back: 10, side: -6, up: 4, ahead: 0, fov: 54 }, { s: [.7, 1], shot: 'follow', back: 6, side: 6, up: -1.5, ahead: 4, fov: 58 }] }],
  targets: [{ id: 'ins1', at: [600, 297.6, CABLE(600) + 1], r: .9, far: true, flag: 'ins1', when: 'powerCut' }, { id: 'ins2', at: [600, 300, CABLE(600) + 1.4], r: .9, far: true, flag: 'ins2', when: 'powerCut' }, { id: 'ins3', at: [600, 302.4, CABLE(600) + 1], r: .9, far: true, flag: 'ins3', when: 'powerCut' }],
  spots: [{ id: 'pin6', edge: 'gs-gl', s: .04, kind: 'pickup', item: 'pin6', r: 2 }, { id: 'rimeD1', edge: 'gs-gl', s: .3, kind: 'pickup', item: 'rime', n: 5, r: 2 }, { id: 'redD1', edge: 'gs-gl', s: .7, kind: 'pickup', item: 'red5', n: 15, r: 2 }],
  spawns: {},
  triggers: [{ id: 'board', edge: 'gs-gl', s: .01, beat: 'gondola' }],
  props: [['pen', 'gondola', 0, 0, 0], ['pen', 'pylons', 0, 0, 0], ['shape', 'glacier-station', 905, 300, 0], ['shape', 'valley-station', 40, 300, 0], ['light', 600, 300, 30, { color: '#ffb060', reach: 300, power: 24 }]]
});

/* ---- 01E THE GLACIER ARCHIVE (50 x 40; ice walls; dark; cyan glows; people frozen in the walls) ---- */
S7.area('01E', {
  title: 'THE GLACIER ARCHIVE', sub: 'DEPOSITS OF EVERY NATION', target: 1, music: 'archive', ambience: 'drip', start: 'gl', interior: true, accent: '#40e0ff',
  world: {
    level: {
      rows: B1(50, 40, [
        ['fill', 1, 19, 10, 21, '.'], ['fill', 11, 16, 18, 24, '.'], ['fill', 13, 10, 15, 15, '.'], ['fill', 12, 5, 17, 9, '.'], ['fill', 13, 25, 15, 34, '.'], ['fill', 12, 31, 17, 35, '.'],
        ['fill', 19, 19, 34, 21, '.'], ['fill', 35, 16, 42, 24, '.'], ['fill', 37, 25, 39, 27, '.'], ['fill', 34, 28, 43, 33, '.'], ['fill', 44, 33, 48, 36, '.'], ['fill', 40, 33, 43, 35, '.']
      ]),
      legend: { '#': { wall: 96 } }, ground: 'tiles', colors: { base: '#a8d8e8', dark: '#2a5068', light: '#e0f8ff' }, side: 'block', color: '#4a8aa8', wallSide: 'block'
    },
    sky: '#01040a', fog: { color: '#02060a', near: 80, far: 520 }, ambient: ['#2a5a7a', '#02060a', 1.0], torchLights: 0, lights: 7, glowLights: 6, overlay: { fov: 62 },
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.45 }, camera: { mode: 'fixed', near: 1 }
  },
  nodes: {
    gl: { t: [3.5, 20.5], kind: 'stop', label: 'THE TUNNEL' }, ig: { t: [14.5, 20.5], label: 'THE ICE GALLERY' }, pq: { t: [14.5, 12.5], kind: 'stop', label: 'HUMMING ICE' }, pn: { t: [14.5, 6.5], kind: 'stop', label: 'A NICHE' },
    r7q: { t: [14.5, 27.5], kind: 'stop', label: 'A FROZEN DOOR' }, r7e: { t: [14.5, 33.0], kind: 'door', label: 'ROOM 7' },
    ec: { t: [24.5, 20.5], kind: 'stop', label: 'THE CRYSTALS' }, lv: { t: [38.5, 20.5], label: 'THE LEDGER VAULT' }, iv: { t: [38.5, 30.5], label: 'THE INNER VAULT' },
    sr: { t: [42.5, 34.0], kind: 'stop', label: 'THE SERACS' }, fe: { t: [47.0, 34.5], kind: 'exit', open: true, label: 'FREIGHT ELEVATOR', to: ['01F', 'fe'] }
  },
  edges: [
    { a: 'gl', b: 'ig' }, { a: 'ig', b: 'pq' }, { a: 'pq', b: 'pn', gate: 'pincrystal' }, { a: 'ig', b: 'r7q' }, { a: 'r7q', b: 'r7e', gate: 'r7ice' }, { a: 'ig', b: 'ec' }, { a: 'ec', b: 'lv', gate: 'crystals' },
    { a: 'lv', b: 'iv', gate: 'vaultice', via: [[38.5, 26]] }, { a: 'iv', b: 'sr', via: [[41.5, 33]] }, { a: 'sr', b: 'fe', gate: 'seracs' }
  ],
  gates: {
    pincrystal: { kind: 'crystal', at: [14.5, 10, 1.5], done: 'THE ICE SHATTERS.', line: 'The ice hums. It wants a note.', hint: 'crystals' },
    crystals: { kind: 'crystal', at: [28, 20.5, 1.5], done: 'THE CRYSTALS SHATTER.', flag: 'crystals', line: 'The ice hums. It wants a note.', hint: 'crystals' },
    r7ice: { kind: 'icelock', line: 'Frozen shut. A door with a 7 under the ice.', at: [14.5, 30, 1] }, vaultice: { kind: 'icelock', line: 'Frozen shut.', at: [38.5, 25, 1], flag: 'vaultOpen' },
    seracs: { kind: 'serac', at: [45, 34.5, 1.5], done: 'THE SERACS COME DOWN.', flag: 'seracs', line: 'Ice towers. Too much ice. Not enough engineer.', hint: 'seracs' }
  },
  spots: [
    { id: 'r7e', node: 'r7e', kind: 'room7', label: 'ROOM 7' }, { id: 'r7q', node: 'r7q', kind: 'gate', gate: 'r7ice', label: 'ICE LOCK' }, { id: 'ivq', node: 'lv', kind: 'gate', gate: 'vaultice', label: 'ICE LOCK', r: 2.6 },
    { id: 'pin7', node: 'pn', kind: 'pickup', item: 'pin7' }, { id: 'ledger', at: [41.5, 20.5, 1.2], kind: 'exposure', item: 'exp_ledger', flag: 'ledger', beat: 'ledger' },
    { id: 'doc_orders', node: 'iv', kind: 'pickup', item: 'doc_orders' }, { id: 'rimeV', edge: 'iv-sr', s: .3, kind: 'pickup', item: 'rime', n: 15 },
    { id: 'pim5', node: 'ig', kind: 'npc', who: 'pim', beat: 'pim5', once: true, label: 'THE LIFT BOY', r: 3 }, { id: 'phone_ice', node: 'ec', kind: 'phone', beat: 'concierge_vault', once: true, label: 'A PHONE IN THE ICE', r: 3 },
    { id: 'acc1', edge: 'gl-ig', s: .7, kind: 'tableau', lines: 'deposit1', label: 'ACCOUNT 4417', r: 1.8 }, { id: 'acc2', edge: 'ig-ec', s: .5, kind: 'tableau', lines: 'deposit2', label: 'ACCOUNT 2210', r: 1.8 }, { id: 'acc3', node: 'iv', kind: 'tableau', lines: 'deposit3', label: 'ACCOUNT 0889', r: 3 },
    { id: 'redE1', edge: 'gl-ig', s: .3, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redE2', edge: 'ec-lv', s: .5, kind: 'pickup', item: 'red5', n: 12 }, { id: 'redE3', node: 'sr', kind: 'pickup', item: 'red5', n: 15, r: 2 },
    { id: 'rimeE1', node: 'r7q', kind: 'pickup', item: 'rime', n: 4 }, { id: 'rimeE2', node: 'pq', kind: 'pickup', item: 'rime', n: 4 }
  ],
  spawns: { g1: [17.5, 17.5], g2: [17.5, 23.5], g3: [11.5, 23.5], g4: [11.5, 17.5], v1: [40.5, 31.5], v2: [36.5, 29.5], v3: [42.5, 29.5], l1: [41.5, 17.5], l2: [41.5, 23.5] },
  waves: { gallery: { spawn: [['giggler', 'g1', 0], ['giggler', 'g2', .8], ['twins', 'g3', 1.6], ['giggler', 'g4', 2.4]] }, vault: { spawn: [['bloom', 'v1', 0], ['giggler', 'v2', 1], ['giggler', 'v3', 2]] }, ledgerW: { spawn: [['bellboy', 'l1', 0], ['giggler', 'l2', 1]] } },
  triggers: [{ id: 'gallery', node: 'ig', wave: 'gallery' }, { id: 'vault', node: 'iv', wave: 'vault' }, { id: 'ledgerW', node: 'lv', wave: 'ledgerW' }],
  props: [
    ['pen', 'ice-walls', 0, 0, 0], ['pen', 'crystals', 28, 20.5, 0, { gate: 'crystals' }], ['pen', 'crystals', 14.5, 10, 0, { gate: 'pincrystal' }], ['pen', 'seracs', 45, 34.5, 0], ['pen', 'ledger', 41.5, 20.5, 0],
    ['pen', 'icedoor', 14.5, 30, 0, { gate: 'r7ice' }], ['pen', 'icedoor', 38.5, 25, 0, { gate: 'vaultice' }], ['shape', 'room7-door', 14.5, 35.6, 0, { facing: -Math.PI / 2 }], ['shape', 'freight-elevator', 48.4, 34.5, 0, { facing: Math.PI }],
    ['light', 14, 20, 3, { color: '#40e0ff', reach: 160, power: 14 }], ['light', 28, 20, 2, { color: '#60f0ff', reach: 120, power: 12 }], ['light', 38, 20, 3, { color: '#40d0ff', reach: 160, power: 14 }], ['light', 38, 30, 3, { color: '#40c0ff', reach: 160, power: 14 }],
    ['light', 45, 34, 2.5, { color: '#a0f0ff', reach: 120, power: 10 }], ['light', 14, 7, 2, { color: '#60f0ff', reach: 90, power: 8 }]
  ],
  people: [['frozen1', 12, 16.2, 0, 1.6, 'frozen'], ['frozen2', 17.6, 24.6, 0, -1.6, 'frozen'], ['frozen3', 22, 18.6, 0, 1.6, 'frozen'], ['frozen4', 35.6, 31, 0, 0, 'frozen']]
});

/* ---- 01F THE SUMMIT (terrain: the plaza and the glass pavilion; the glacier face below; the old chairlift) ---- */
const H01F = (x, y) => { const m = x / M, n = y / M; let z = 300 * (1 - sstep(165, 840, n)); z += Math.sin(m / 27) * Math.cos(n / 33) * 1.5 * sstep(170, 200, n); z += Math.pow((m - 230) / 160, 2) * 40 * sstep(180, 300, n); return z * M; };
S7.H01F = H01F;
const ARC = (deg, r = 30) => [200 + Math.cos(deg * Math.PI / 180) * r, 100 + Math.sin(deg * Math.PI / 180) * r];
S7.area('01F', {
  title: 'THE SUMMIT', sub: 'PIZ NADA, MIDNIGHT', target: 1, music: 'powderking', ambience: 'wind', start: 'fe', accent: '#e0b040', snow: .6, wind: .8, boss: 'hansi',
  world: {
    terrain: { size: 16384, height: H01F, color: snowColor([.98, .96, 1.04]), cell: 32, far: 9000, rock: { colors: ['#3a3448', '#4a4458'], band: 30, slope: [.55, .8] }, speckle: .05, mottle: .1 },
    sky: { top: '#0a0420', horizon: '#3a2a5a', ground: '#100a1a', sun: '#ffd080', haze: .25 }, fog: { color: '#1a1030', near: 300, far: 5000 }, ambient: ['#9080c0', '#2a2030', 1.3],
    sun: { color: '#c8b8ff', intensity: 1.5, dir: [.2, .7, -.65] }, torchLights: 0, lights: 6, glowLights: 6, overlay: { fov: 62 }, filter: { bands: 3, ink: 1, inkW: 1.4, punch: 1.4 }, camera: { mode: 'fixed', near: 1, far: 9000 }
  },
  nodes: {
    fe: { t: [200, 150], kind: 'stop', label: 'THE FREIGHT ELEVATOR' }, a1: { t: ARC(30) }, a2: { t: ARC(60) }, a3: { t: ARC(90) }, a4: { t: ARC(120) }, a5: { t: ARC(150) },
    sl0: { t: [240, 140], kind: 'stop', label: 'THE GLACIER FACE' }, sl1: { t: [246, 826], kind: 'stop', label: 'THE OLD CHAIRLIFT' }
  },
  edges: [
    { a: 'fe', b: 'a3' }, { a: 'a1', b: 'a2', via: [ARC(45)] }, { a: 'a2', b: 'a3', via: [ARC(75)] }, { a: 'a3', b: 'a4', via: [ARC(105)] }, { a: 'a4', b: 'a5', via: [ARC(135)] },
    { a: 'a1', b: 'sl0', hidden: 'avalaughDown' }, { a: 'sl0', b: 'sl1', kind: 'ski', aimOnTheMove: true, via: [[250, 260], [232, 400], [252, 540], [234, 680]], cams: [{ s: [0, 1], shot: 'follow', back: 4.4, side: -2.2, up: 2, ahead: 6, fov: 60, lag: .1 }] }
  ],
  spots: [], spawns: { b1: [196, 108], b2: [204, 108] },
  props: [['pen', 'pavilion', 200, 100, 0], ['pen', 'avalaugh', 200, 100, 0], ['pen', 'slalom-gates', 0, 0, 0], ['pen', 'chairlift', 246, 826, 0], ['shape', 'flagpole', 226, 115, 0], ['shape', 'flagpole', 174, 115, 0], ['shape', 'weather-mast', 200, 130, 0],
    ['light', 200, 100, 6, { color: '#ffb050', reach: 400, power: 30 }], ['light', 240, 400, 20, { color: '#d0c0ff', reach: 500, power: 30 }]],
  onEnter(G) { if (!G.flags.hansiDead) S7.runBeat('hansi_intro'); }
});

/* ==== content/cameras.js ==== */
/* SKILLER7 content — hand-authored camera shots for the set-piece edges (Killer7's high corners, low angles, dollies
 * and cranes). Shots: s: [from, to] share of the edge; at / path in tiles and metres; look 'hero'. Every other edge
 * gets the director's automatic fixed shots. The content suite checks each authored camera stands in open space with
 * a clear line to the hero along its whole range. */
S7.CAMERAS = {
  '00B': {
    'c1-j5': [{ s: [0, 1], shot: 'dolly', path: [[7, 4.3, 2.6], [15, 4.3, 2.6]], look: 'hero', fov: 50 }],
    'j5-c2': [{ s: [0, 1], shot: 'fixed', at: [28.6, 6.4, 1.3], look: 'hero', lookUp: 1.4, fov: 46 }],
    'c2-l1': [{ s: [0, 1], shot: 'crane', at: [33, 4.4], zFrom: 1.6, zTo: 2.8, look: 'hero', fov: 52 }],
    'g3-c4': [{ s: [0, 1], shot: 'fixed', at: [34.6, 19.2, 2.7], look: 'hero', fov: 52 }],
    'c3-j6': [{ s: [0, 1], shot: 'fixed', at: [12.6, 17.2, 2.6], look: 'hero', fov: 52 }]
  },
  '01A': {
    'f1-mk': [{ s: [0, .5], shot: 'fixed', at: [40, 12.6, 6], look: 'hero', fov: 50 }, { s: [.5, 1], shot: 'dolly', path: [[44, 16.6, 2], [56, 16.6, 2]], look: 'hero', fov: 52 }],
    'mk-r7a': [{ s: [0, 1], shot: 'crane', at: [61, 12.4], zFrom: 2, zTo: 6, look: 'hero', fov: 54 }],
    'ls-tq': [{ s: [0, 1], shot: 'fixed', at: [44.6, 34.4, 1.2], look: 'hero', lookUp: 1.4, fov: 48 }],
    'f1-ch': [{ s: [0, .55], shot: 'follow', back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 }, { s: [.55, 1], shot: 'fixed', at: [16, 9, 7], look: 'hero', fov: 54 }],
    'ht-ls': [{ s: [0, 1], shot: 'dolly', path: [[13, 30.4, 2.4], [30, 30.4, 2.4]], look: 'hero', fov: 52 }]
  },
  '01B': {
    'sc-at': [{ s: [0, .5], shot: 'fixed', at: [17.6, 19.4, 2.6], look: 'hero', fov: 48 }, { s: [.5, 1], shot: 'fixed', at: [22.5, 15.5, 4.5], look: 'hero', fov: 52 }],
    'at-hm': [{ s: [0, 1], shot: 'crane', at: [22, 13.5], zFrom: 1.8, zTo: 5, look: 'hero', fov: 54 }],
    'hm-hw': [{ s: [0, 1], shot: 'fixed', at: [36, 8, 2.2], look: 'hero', fov: 50 }],
    'bb-br': [{ s: [0, .25], shot: 'fixed', at: [55.6, 12.6, 3], look: 'hero', fov: 52 }, { s: [.25, 1], shot: 'fixed', at: [57.5, 29.6, 5], look: 'hero', fov: 56 }],
    'at-cf': [{ s: [0, 1], shot: 'fixed', at: [20.5, 32.5, 3], look: 'hero', fov: 52 }]
  },
  '01E': {
    'gl-ig': [{ s: [0, 1], shot: 'dolly', path: [[2, 19.4, 1.5], [12, 19.4, 2]], look: 'hero', fov: 50 }],
    'ig-ec': [{ s: [0, 1], shot: 'fixed', at: [12, 22.6, 3.5], look: 'hero', fov: 52 }],
    'ec-lv': [{ s: [0, .5], shot: 'fixed', at: [26, 19.3, 1.2], look: 'hero', lookUp: 1.4, fov: 48 }, { s: [.5, 1], shot: 'fixed', at: [41.6, 23.4, 3.8], look: 'hero', fov: 52 }],
    'iv-sr': [{ s: [0, 1], shot: 'fixed', at: [43, 31, 4], look: 'hero', fov: 52 }]
  }
};
for (const a in S7.CAMERAS) for (const id in S7.CAMERAS[a]) { const e = S7.AREAS[a].edges.find(x => (x.id || x.a + '-' + x.b) === id); if (!e) throw new Error('cameras: no edge ' + a + ':' + id); e.cams = S7.CAMERAS[a][id]; }

/* ==== content/data.js ==== */
/* SKILLER7 content — personas, weapons, enemies, items, tutorial tips. Plain data: adding one never changes src/. */
S7.persona('ansel', { n: 1, name: 'Ansel Holle', epithet: 'THE SWEEP', hp: 120, weapon: 'patrol38', skill: 'flare', skillName: 'Flare', skillCost: 12, voice: 'ansel',
  about: 'Ski patrol. Quiet, procedural. Lifts patrol ropes; chips frozen family out of the ice.',
  rig: { build: 'heroic', hunch: .15, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#18181c', pom: '#f06a1e' }, acc: [{ kind: 'goggles', color: '#f0a020' }], weapon: 'revolver', colors: { skin: '#e6c8b0', hair: '#9a9aa0', cloth: '#d2461e', coat: '#d2461e', pants: '#1c1c22', boot: '#2a2420', trim: '#f4f4f4', metal: '#5a5a62' } },
  barks: { in: ['Sweep\'s on.', 'Nobody stays on the mountain.'], crit: 'Clear.', low: 'Patrol needs patrol.', frozen: '...log it...', revived: 'Back on shift.' } });
S7.persona('dagny', { n: 2, name: 'Dagny Holle', epithet: 'SCHUSS', hp: 80, weapon: 'poleguns', skill: 'tuck', skillName: 'Tuck (hold)', skillCost: 2, speedK: 1.15, voice: 'dagny',
  about: 'Downhill racer. Impatient. Tuck doubles her speed; only she can make a jump.',
  rig: { build: 'heroic', outfit: 'shirt', hair: 'ponytail', hat: { style: 'racehelmet', color: '#c0c8d0', visor: '#ff8a1e' }, weapon: 'poles', colors: { skin: '#f0d0b8', hair: '#f0d890', cloth: '#1e5cff', pants: '#1e5cff', trim: '#ffffff', boot: '#101014', metal: '#c8ccd4' } },
  barks: { in: ['Late. Everyone\'s always late.', 'Point me downhill.'], crit: 'Gone.', low: 'Slower is worse.', frozen: '...cold...', revived: 'I owe you a coffee.' } });
S7.persona('ignaz', { n: 3, name: 'Ignaz Holle', epithet: 'TELEMARK', hp: 90, weapon: 'gamsbock', skill: 'longlook', skillName: 'Long Look (scope)', skillCost: 0, speedK: .9, voice: 'ignaz',
  about: 'An old hunter of the old school. Formal. His scope reaches what nobody else can.',
  rig: { build: 'heroic', hunch: .1, outfit: 'coat', hair: 'short', hat: { style: 'felt', color: '#2e4a2a', feather: '#e8e0c0' }, face: { bangs: 0 }, acc: [{ kind: 'moustache', color: '#f0f0f0' }], weapon: 'rifle', colors: { skin: '#e2c2a8', hair: '#e8e8e8', cloth: '#7a5a3a', coat: '#7a5a3a', pants: '#6a4a2a', boot: '#8a1a1a', trim: '#3a2a1a', metal: '#3a3a40', wood: '#6a4a2a' } },
  barks: { in: ['Ah. Weather for it.', 'One shot is a conversation.'], crit: 'Clean.', low: 'I have bled before. In better company.', frozen: '...how undignified...', revived: 'Hm. Thawed.' } });
S7.persona('rurik', { n: 4, name: 'Rurik Holle', epithet: 'MOGUL', hp: 150, weapon: 'bullion', skill: 'makeitrain', skillName: 'Make It Rain', skillCost: 10, speedK: .9, voice: 'rurik', size: 1.4,
  about: 'A fur-coated tycoon. Pays velvet ropes and turnstiles. Throws coins; they kneel for them.',
  rig: { build: 'bulky', outfit: 'coat', hair: 'short', hat: { style: 'ushanka', color: '#4a3a2a' }, acc: [{ kind: 'beard', color: '#1a1410' }, { kind: 'cigar' }], weapon: 'shotgun', colors: { skin: '#d8b498', hair: '#1a1410', cloth: '#3a2a20', coat: '#3a2a20', trim: '#d8b040', pants: '#141416', boot: '#1a1410', metal: '#d8b040' } },
  barks: { in: ['Everything has a price. Even this.', 'I\'ll buy the next round.'], crit: 'Paid in full.', low: 'Bad investment.', frozen: '...put it on my tab...', revived: 'Worth every coin.' } });
S7.persona('kasimir', { n: 5, name: 'Kasimir Holle', epithet: 'YODEL', hp: 110, weapon: 'alphorn', skill: 'echo', skillName: 'Echo', skillCost: 10, voice: 'kasimir',
  about: 'A yodeler with menace. His Echo opens singing walls, shatters humming ice, marks them through stone.',
  rig: { build: 'heroic', outfit: 'shirt', hair: 'short', hat: { style: 'felt', color: '#6a6a6a', feather: '#3a3a3a' }, acc: [{ kind: 'moustache', color: '#5a3a1e' }], weapon: 'alphorn', colors: { skin: '#e8c8a8', hair: '#5a3a1e', cloth: '#f0f0e8', pants: '#5a3a1e', trim: '#2e5a2e', boot: '#4a2e18', wood: '#8a5a2a', metal: '#8a5a2a' } },
  barks: { in: ['Yo-di-ah... hoo.', 'The mountain sings back if you\'re rude enough.'], crit: 'Encore!', low: 'Sour note.', frozen: '...hoo...', revived: 'From the top!' } });
S7.persona('mireille', { n: 6, name: 'Mireille Holle', epithet: 'SNAPSHOT', hp: 85, weapon: 'lady25', skill: 'flash', skillName: 'Flash', skillCost: 8, voice: 'mireille',
  about: 'Press photographer. Wry. Her Flash stuns, reveals and develops secrets in the dark.',
  rig: { build: 'heroic', outfit: 'coat', hair: 'short', hat: { style: 'beret', color: '#141414' }, weapon: 'pistol', colors: { skin: '#f2d8c4', hair: '#141414', cloth: '#c8b48a', coat: '#c8b48a', pants: '#2a2a2e', boot: '#1a1a1e', trim: '#8a7a5a', metal: '#2a2a30' } },
  barks: { in: ['Smile. No, not you.', 'Light is a confession.'], crit: 'Developed.', low: 'Overexposed.', frozen: '...out of focus...', revived: 'Back in frame.' } });
S7.persona('brigid', { n: 7, name: 'Brigid Holle', epithet: 'AVALANCHE', hp: 110, weapon: 'avalauncher', skill: 'charge', skillName: 'Control Charge', skillCost: 15, voice: 'brigid',
  about: 'Avalanche-control engineer. Dry. Only her Control Charge brings down cornices and seracs.',
  rig: { build: 'heroic', outfit: 'coat', hair: 'ponytail', hat: { style: 'hardhat', color: '#f0c020' }, weapon: 'launcher', colors: { skin: '#f0d4c0', hair: '#c8501e', cloth: '#c81e1e', coat: '#c81e1e', trim: '#d0d8e0', pants: '#141416', boot: '#202024', metal: '#5a6068' } },
  barks: { in: ['Fire in the hole. Gently.', 'Snow\'s just water that hasn\'t decided.'], crit: 'Controlled.', low: 'Load\'s shifting.', frozen: '...buried...', revived: 'Dug out. Cheers.' } });

S7.weapon('patrol38', { name: 'Patrol .38', kind: 'hitscan', dmg: 24, interval: .4, mag: 6, reload: 1.8, spread: .4, range: 60, recoil: 1.2, burn: true, sfx: 'shot38' });
S7.weapon('poleguns', { name: 'Pole Guns', kind: 'hitscan', auto: true, dmg: 6, interval: .07, mag: 50, reload: 1.5, spread: 2, range: 35, recoil: .3, sfx: 'shotPole' });
S7.weapon('gamsbock', { name: 'Gamsbock', kind: 'hitscan', dmg: 90, interval: 1.2, mag: 5, reload: 2.4, spread: 0, range: 120, scopeRange: 250, recoil: 3, pierce: 1, sfx: 'shotRifle' });
S7.weapon('bullion', { name: 'Bullion', kind: 'pellets', pellets: 10, dmg: 9, interval: .95, mag: 6, reload: .45, perShell: true, spread: 8, range: 25, recoil: 4, sfx: 'shotShotgun' });
S7.weapon('alphorn', { name: 'Alphorn', kind: 'cone', dmg: 40, cone: 25, interval: 1, mag: 5, heat: true, reload: 2.5, range: 18, recoil: 2, sfx: 'alphorn' });
S7.weapon('lady25', { name: 'Lady .25', kind: 'hitscan', dmg: 15, interval: .2, mag: 9, reload: 1.1, spread: .3, range: 70, recoil: .6, sfx: 'shot25' });
S7.weapon('avalauncher', { name: 'Avalauncher', kind: 'lob', dmg: 70, splash: 2.5, speed: 300, interval: 1.1, mag: 4, reload: 2.8, range: 90, recoil: 3.5, sfx: 'lob' });

S7.enemy('giggler', { name: 'Giggler', hp: 30, speed: [32, 42], contact: 20, red: [8, 14], rime: 1, size: 1, ai: 'walker' });
S7.enemy('bellboy', { name: 'Bellboy', hp: 18, speed: [85, 100], contact: 14, red: [6, 12], rime: 1, size: .95, ai: 'runner', warm: ['head'], hat: 'pillbox' });
S7.enemy('tobogganer', { name: 'Tobogganer', hp: 26, speed: [130, 170], contact: 26, red: [10, 18], rime: 1, size: 1, ai: 'sled', warm: ['chest'], sled: true });
S7.enemy('snowballer', { name: 'Snowballer', hp: 25, speed: [0, 0], red: [8, 14], rime: 1, size: 1, ai: 'thrower', projectile: 'snowball' });
S7.enemy('icecuber', { name: 'Snowballer', hp: 25, speed: [0, 0], red: [8, 14], rime: 1, size: 1, ai: 'thrower', projectile: 'icecube' });
S7.enemy('twins', { name: 'Twins', hp: 40, speed: [30, 30], contact: 20, red: [12, 20], rime: 2, size: 1.05, ai: 'twins', warm: ['chest'] });
S7.enemy('plow', { name: 'Plow', hp: 90, speed: [26, 26], contact: 30, red: [20, 30], rime: 2, size: 1.15, ai: 'plow', warm: ['back'] });
S7.enemy('inspector', { name: 'Inspector', hp: 50, speed: [60, 60], red: [15, 25], rime: 2, size: 1, ai: 'inspector', warm: ['head', 'chest'] });
S7.enemy('bloom', { name: 'Bloom', hp: 300, speed: [18, 18], contact: 45, red: [40, 60], rime: 4, size: 1.8, ai: 'bloom', spots: ['a', 'b', 'c'] });
S7.enemy('dancer', { name: 'Dancing Giggler', hp: 30, speed: [34, 40], contact: 18, red: [8, 14], rime: 1, size: 1, ai: 'dancer' });
S7.enemy('crawler', { name: 'Cable Crawler', hp: 30, speed: [30, 38], contact: 20, red: [8, 14], rime: 1, size: .9, ai: 'walker' });

// items (§7.12)
S7.item('servicekey', { kind: 'key', name: 'Service Key', icon: 'key', about: 'Brass. Says STAFF ONLY in three languages and means it in all of them.' });
S7.item('edelweiss', { kind: 'key', name: 'Edelweiss Pass', icon: 'flower', about: 'A delegate\'s pass, pressed flat. Three open the gondola.' });
S7.item('ember', { kind: 'key', name: 'Ember Charm', icon: 'ember', about: 'A coal that never cools. Ice weeps when it meets it.' });
S7.item('red5', { kind: 'red', name: 'Red snow' }); S7.item('rime', { kind: 'rime', name: 'Rime crystal' });
const PINS = [
  ['pin1', 'PIZ NADA — HIGHER THAN YOU THINK', 'They say three thousand metres. The mountain says otherwise.'],
  ['pin2', 'GRAND HOTEL NADA — ROOMS 1–316', 'There is no Room 7. There never was. Don\'t knock.'],
  ['pin3', 'OBERGLÜCK CHRISTMAS MARKET', 'The Glühwein is warm. That\'s how they get you.'],
  ['pin4', 'THAW ACCORD — SIGN HERE', 'Treaties are written in pencil and signed in pen.'],
  ['pin5', 'I SURVIVED THE BLACK RUN', 'Seven didn\'t.'],
  ['pin6', 'HIMMELSBAHN — HOLD ON TIGHT', 'I held on. The lift let go.'],
  ['pin7', '1926 TEAM — EIGHT FOR GOLD', 'Eight on the lift. Seven on the wall. One in the bed.']];
PINS.forEach(([id, slogan, line], i) => S7.item(id, { kind: 'pin', n: i + 1, name: 'Lift Pin ' + (i + 1), slogan, about: '"' + line + '" — Pim' }));
const DOCS = [
  ['doc_t00', 'TARGET 00: AUGUSTIN GRAU', 'Bell captain. Forty-one years of service. Never late. Never smiled. Smiling since Tuesday.'],
  ['doc_t01', 'TARGET 01: HANSI PULVER', 'Three Olympic golds. The face of Nada chocolate. Instructor to presidents. Listed: WARM FRONT — COMMANDER.'],
  ['doc_grau', 'GRAU: EMPLOYEE FILE', 'Punctual. Discreet. Carries luggage for guests who do not leave. Commendation, 1971: for not asking.'],
  ['doc_menu', 'ROOM SERVICE: THE BELLCAPTAIN\'S SPECIALS', 'Turn-down service. Late checkout. Early checkout. Permanent checkout. Ask at the desk.'],
  ['doc_art9', 'THE THAW ACCORD, ARTICLE NINE', 'The Canton shall open the Glacier Archive. Every account. Every name. Every body. Signed in pen, at midnight.'],
  ['doc_1926', 'THE AVALANCHE OF 1926', 'A clipping. Eight young skiers on the chairlift for the team photograph. The snow came down. One was found alive.'],
  ['doc_orders', 'DEPARTMENT OF DISCRETION: STANDING ORDERS', '1. Discretion. 2. See 1.'],
  ['doc_prices', 'SKI SCHOOL PRICE LIST', 'Private lesson: 80. Private lesson, no questions: 800. Lesson in falling: priceless.']];
DOCS.forEach(([id, name, text]) => S7.item(id, { kind: 'doc', name, text, about: text }));
S7.item('exp_board', { kind: 'exposure', name: 'Exposure: the press room blackboard', text: 'Under a cartoon of a chairlift, in invisible ink: THE DAY THE EIGHT WENT UP: 26 · 01', about: 'THE DAY THE EIGHT WENT UP: 26 · 01' });
S7.item('exp_ledger', { kind: 'exposure', name: 'Exposure: the frozen ledger', text: 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.', about: 'ACCOUNT 7 — HOLDER: H. HOLLE — SEVEN (7) PERSONS — IN TRUST.' });

/* tutorial tips: a big glyph and a verb; each clears when its action is done */
S7.TIPDEFS = {
  walk: { act: 'move', text: 'HOLD {move} TO WALK' }, junction: { act: 'left', text: '{left} {right} PICK A WAY · HOLD {move} TO GO' },
  aim: { act: 'aim', text: 'HOLD {aim} TO AIM' }, scan: { act: 'scan', text: '{scan} SCAN FOR LAUGHTER' }, fire: { act: 'fire', text: '{fire} SHOOT THE WARM SPOT' },
  heal: { act: 'heal', text: 'HOLD {heal} TO DRINK RED' }, ring: { act: 'ring', text: 'HOLD {ring}: THE FEATHERBED' }, turn: { act: 'turn', text: '{turn} QUICK TURN' },
  interact: { act: 'interact', text: '{interact} CHECK' }, skill: { act: 'skill', text: '{skill} SKILL' }, rescue: { act: 'interact', text: 'HOLD {interact} AT THE STATUE TO CHIP IT FREE' },
  room7: { act: 'interact', text: 'THE CLOCK SAVES · THE BENCH WAXES · THE WARDROBE CHANGES' }, plow: { act: 'fire', text: 'THE SHIELD STOPS SHOTS · WAIT FOR ITS BACK, OR BLAST IT ROUND' },
  ski: { act: 'move', text: 'HOLD {move} TO TUCK · {turn} HOCKEY STOP, THEN AIM' }, seven: { act: 'ring', text: 'THE FEATHERBED NOW HOLDS SEVEN' }, map: { act: 'map', text: '{map} MAP' }
};

/* ==== content/shapes.js ==== */
/* SKILLER7 content — new objects in the engine's shape format (docs/ASSETS.md): a few named parts each, drawn in 3D
 * by world.shape. Origin: the footprint's middle on the floor; written facing south (+y); 16 units = 1 m. */
Object.assign(E.SHAPES, {
  'wardrobe7': { about: 'Oma Holle\'s wardrobe, seven coats', mats: { w: 'walnut', d: 'oak', b: 'gold' }, parts: [['box', 'w', [0, 0, 0], [30, 12, 44]], ['box', 'd', [-7.5, 6.2, 2], [14, 1, 38]], ['box', 'd', [7.5, 6.2, 2], [14, 1, 38]], ['box', 'w', [0, 0, 44], [32, 14, 3]], ['box', 'b', [-1.5, 7, 20], [1, 1, 4]], ['box', 'b', [1.5, 7, 20], [1, 1, 4]]] },
  'holle-bed': { about: 'an iron bedstead, the featherbed on it', mats: { f: 'iron', s: 'linen' }, parts: [['box', 'f', [0, 0, 6], [22, 36, 2]], ['mirror', 'xy', ['cyl', 'f', [10, 17, 0], 1, 10]], ['box', 'f', [0, -17.5, 6], [22, 1.5, 18]], ['box', 'f', [0, 17.5, 6], [22, 1.5, 10]], ['box', 's', [0, 0, 8], [20, 34, 3]]] },
  armchair: { about: 'a wing armchair', mats: { c: 'velvet', w: 'walnut' }, parts: [['box', 'c', [0, 0, 5], [14, 13, 5]], ['box', 'c', [0, -6, 10], [14, 3, 14]], ['mirror', 'x', ['box', 'c', [6.5, 0, 10], [3, 12, 6]]], ['mirror', 'xy', ['box', 'w', [6, 5, 0], [2, 2, 5]]]] },
  'cuckoo-clock': { about: 'a carved cuckoo clock on a post', mats: { w: 'walnut', f: 'birch', b: 'gold' }, parts: [['box', 'w', [0, 0, 0], [3, 3, 26]], ['box', 'w', [0, 0, 26], [12, 6, 12]], ['prism', 'w', [0, 0, 38], [[-8, 0], [8, 0], [0, 6]], 8, { axis: 'x' }], ['cyl', 'f', [0, 3.2, 32], 4, 1, { rot: [90, 0, 0] }], ['row', 2, [4, 0, 0], ['cyl', 'b', [-2, 0, 14], 1, 10]]] },
  'side-table': { about: 'a small round side table', mats: { w: 'walnut' }, parts: [['cyl', 'w', [0, 0, 12], 6, 1.5], ['cyl', 'w', [0, 0, 0], 1.2, 12], ['cyl', 'w', [0, 0, 0], 4, 1]] },
  'wax-bench': { about: 'a ski-waxing bench with an iron', mats: { w: 'oak', m: 'iron', g: 'flame' }, parts: [['box', 'w', [0, 0, 12], [30, 10, 2]], ['mirror', 'xy', ['box', 'w', [13, 4, 0], [2, 2, 12]]], ['box', 'm', [4, 0, 14], [7, 4, 2]], ['box', 'g', [4, 0, 14.6], [6, 3, .6]], ['box', 'w', [-6, 0, 14], [14, 2, 1.5]]] },
  radiator: { about: 'a cast-iron radiator', mats: { m: 'iron' }, parts: [['row', 7, [3, 0, 0], ['box', 'm', [0, 0, 1], [2, 4, 12]]], ['box', 'm', [0, 0, 0], [22, 3, 2]]] },
  'room7-door': { about: 'a plain door, a frosted 7 stencilled on it', mats: { d: '#e8e4dc none', f: 'walnut', s: '#d81e2a none' }, parts: [['box', 'f', [0, 0, 0], [18, 3, 36]], ['box', 'd', [0, 1, 1], [15, 2, 33]], ['box', 's', [0, 2.2, 22], [5, .5, 1.5]], ['box', 's', [1.6, 2.2, 15], [1.5, .5, 8], { rot: [0, -16, 0] }]] },
  'reception-desk': { about: 'the hotel\'s reception desk, marble and brass', mats: { m: 'marble', b: 'gold', w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [80, 12, 18]], ['box', 'm', [0, 0, 18], [82, 14, 2]], ['box', 'b', [0, 6.6, 9], [80, .6, 1]], ['box', 'b', [20, 0, 20], [3, 3, 2]]] },
  'bar-counter': { about: 'a long bar counter', mats: { w: 'walnut', b: 'gold' }, parts: [['box', 'w', [0, 0, 0], [96, 12, 17]], ['box', 'w', [0, 0, 17], [98, 14, 2]], ['box', 'b', [0, 7.2, 3], [96, .8, 1]]] },
  'bottle-shelf': { about: 'shelves of bottles behind a bar', mats: { w: 'walnut', g: '#3a8a4a glaze', r: '#8a2a2a glaze' }, parts: [['box', 'w', [0, -2, 0], [96, 2, 40]], ['row', 3, [0, 0, 11], ['box', 'w', [0, 0, 10], [96, 6, 1.5]]], ['row', 12, [8, 0, 0], ['cyl', 'g', [0, 0, 11.5], 1.2, 6]], ['row', 12, [8, 0, 0], ['cyl', 'r', [4, 0, 22.5], 1.2, 6]]] },
  'luggage-cart': { about: 'a brass luggage cart with suitcases', mats: { b: 'gold', s: 'leather', r: '#8a1a1a cloth' }, parts: [['box', 'b', [0, 0, 3], [22, 12, 1.5]], ['mirror', 'x', ['cyl', 'b', [10, 0, 4], 1, 30]], ['box', 'b', [0, 0, 33], [22, 2, 2]], ['box', 's', [-4, 0, 4.5], [10, 8, 7]], ['box', 'r', [4, 0, 4.5], [9, 7, 9]], ['box', 's', [-2, 0, 11.5], [8, 6, 6]]] },
  'luggage-rack': { about: 'a luggage rack', mats: { w: 'oak' }, parts: [['box', 'w', [0, 0, 10], [26, 10, 1.5]], ['mirror', 'xy', ['box', 'w', [12, 4, 0], [1.5, 1.5, 10]]]] },
  'velvet-stanchion': { about: 'a brass post and a velvet rope', mats: { b: 'gold', v: '#a01828 velvet' }, parts: [['cyl', 'b', [0, 0, 0], 3, 1], ['cyl', 'b', [0, 0, 1], .8, 15], ['ball', 'b', [0, 0, 16.5], 1.5], ['box', 'v', [0, 8, 13], [1, 16, 1.2]]] },
  'elevator-doors': { about: 'brass elevator doors, part open', mats: { b: 'gold', d: '#1a1410 none' }, parts: [['box', 'b', [0, 0, 0], [24, 3, 44]], ['box', 'd', [0, 1.6, 2], [8, 1, 38]], ['cyl', 'b', [0, 1.6, 46], 4, 1, { rot: [90, 0, 0] }]] },
  'revolving-door': { about: 'a revolving door, the storm behind it', mats: { g: '#a8b8c8 glaze', b: 'gold' }, parts: [['cyl', 'b', [0, 0, 0], 14, 2], ['cyl', 'b', [0, 0, 44], 14, 2], ['cyl', 'b', [0, 0, 0], 1, 44], ['ring', 4, 6, ['box', 'g', [0, 0, 2], [12, 1, 40]]]] },
  'potted-palm': { about: 'a potted palm', mats: { p: 'clay', l: 'leaves', t: 'bark' }, parts: [['lathe', 'p', [0, 0, 0], [[0, 0], [5, 0], [6, 9], [0, 9]]], ['cyl', 't', [0, 0, 9], 1, 18], ['ring', 6, 4, ['ball', 'l', [0, 0, 26], 6, { sz: .3 }]]] },
  'stairwell-door': { about: 'a heavy staff door', mats: { d: 'metal', s: '#e8e0c0 none' }, parts: [['box', 'd', [0, 0, 0], [18, 3, 36]], ['box', 's', [0, 1.8, 28], [12, .5, 3]]] },
  'room-door': { about: 'a hotel room door with a number', mats: { d: 'walnut', b: 'gold' }, parts: [['box', 'd', [0, 0, 0], [16, 3, 36]], ['box', 'b', [0, 1.8, 26], [6, .6, 3]], ['ball', 'b', [5, 2, 17], 1.2]] },
  'room-service-cart': { about: 'a room-service cart, a silver cloche', mats: { c: 'linen', s: 'steel' }, parts: [['box', 'c', [0, 0, 0], [20, 12, 14]], ['ball', 's', [-3, 0, 17], 4, { sz: .7 }], ['box', 's', [5, 0, 14], [4, 4, 4]]] },
  'shaft-doors': { about: 'the service shaft\'s steel doors', mats: { m: 'steel', r: '#a01818 none' }, parts: [['box', 'm', [0, 0, 0], [28, 4, 44]], ['box', 'r', [0, 2.2, 40], [24, .6, 3]]] },
  'gluehwein-stall': { about: 'a Glühwein stall, a fire under the pot', mats: { w: 'timber', r: 'shingle', s: '#e8ecf4 none', c: 'copper', f: 'flame' }, flames: [[0, 6, 10, 5, 6]], lights: [[0, 6, 12, '#ff9040', 60]],
    parts: [['box', 'w', [0, 0, 0], [40, 22, 14]], ['box', 'w', [0, 9, 14], [40, 4, 2]], ['mirror', 'x', ['box', 'w', [19, -10, 14], [2, 2, 20]]], ['prism', 'r', [0, -2, 34], [[-24, 0], [24, 0], [0, 10]], 28, { axis: 'x' }], ['prism', 's', [0, -2, 37], [[-22, 0], [22, 0], [0, 8]], 26, { axis: 'x' }], ['cyl', 'c', [0, 6, 16], 5, 5]] },
  'ski-rack': { about: 'a rack of skis', mats: { w: 'oak', r: '#c8302a none', b: '#2a5aa8 none' }, parts: [['box', 'w', [0, 0, 16], [34, 3, 2]], ['mirror', 'x', ['box', 'w', [16, 0, 0], [2, 2, 18]]], ['row', 6, [5, 0, 0], ['box', 'r', [0, 2, 1], [2, 1, 28], { rot: [8, 0, 0] }]], ['row', 5, [5, 0, 0], ['box', 'b', [2.5, 3, 1], [2, 1, 26], { rot: [-6, 0, 0] }]]] },
  'phone-booth': { about: 'a red phone booth, snow on its roof', mats: { r: '#c8202a none', g: '#c8d8e0 glaze', s: '#f0f4f8 none' }, parts: [['box', 'r', [0, 0, 0], [16, 16, 4]], ['mirror', 'xy', ['box', 'r', [7, 7, 4], [2, 2, 36]]], ['box', 'g', [0, 7.5, 6], [12, 1, 30]], ['box', 'r', [0, 0, 40], [18, 18, 4]], ['box', 's', [0, 0, 44], [17, 17, 2]]] },
  turnstile: { about: 'a ski-lift turnstile', mats: { m: 'steel', y: '#f0c020 none' }, parts: [['box', 'm', [0, 0, 0], [6, 10, 16]], ['ring', 3, 1, ['box', 'y', [0, 4, 12], [1, 10, 1.5]]], ['box', 'm', [12, 0, 0], [2, 2, 16]]] },
  fountain: { about: 'a frozen fountain', mats: { s: 'stone', i: 'ice' }, parts: [['cyl', 's', [0, 0, 0], 24, 6, { seg: 12 }], ['cyl', 'i', [0, 0, 6], 22, 1, { seg: 12 }], ['cyl', 's', [0, 0, 6], 3, 18], ['cyl', 's', [0, 0, 24], 8, 2], ['cyl', 'i', [0, 0, 18], 6, 6, { r2: 1 }]] },
  'delegate-gate': { about: 'a gate with three Edelweiss slots', mats: { m: 'steel', g: 'gold' }, parts: [['mirror', 'x', ['box', 'm', [16, 0, 0], [3, 3, 40]]], ['box', 'm', [0, 0, 38], [36, 3, 4]], ['row', 3, [10, 0, 0], ['cyl', 'g', [0, 2, 30], 3, 1, { rot: [90, 0, 0] }]]] },
  'security-arch': { about: 'a metal-detector arch', mats: { m: 'steel', g: '#3a4a5a none' }, parts: [['mirror', 'x', ['box', 'g', [11, 0, 0], [3, 8, 36]]], ['box', 'g', [0, 0, 36], [25, 8, 4]], ['box', 'm', [0, 4.2, 37], [6, .5, 2]]] },
  'flag-coastal': { about: 'the Coastal Federation\'s flag: blue, a white wave', mats: { p: 'steel', b: '#2a5ac8 cloth', w: '#ffffff none' }, parts: [['cyl', 'p', [0, 0, 0], .8, 48], ['box', 'b', [7, 0, 30], [14, 1, 16]], ['box', 'w', [7, .6, 36], [12, .3, 2]]] },
  'flag-steppe': { about: 'the Steppe Directorate\'s flag: grey-red, a black sun', mats: { p: 'steel', r: '#8a3a3a cloth', k: '#141414 none' }, parts: [['cyl', 'p', [0, 0, 0], .8, 48], ['box', 'r', [7, 0, 30], [14, 1, 16]], ['cyl', 'k', [7, .6, 38], 3, .3, { rot: [90, 0, 0] }]] },
  'conference-table': { about: 'a long conference table', mats: { w: 'walnut', c: 'leather' }, parts: [['box', 'w', [0, 0, 12], [72, 26, 2]], ['mirror', 'xy', ['box', 'w', [32, 10, 0], [3, 3, 12]]], ['row', 5, [14, 0, 0], ['box', 'c', [0, 17, 0], [8, 8, 12]]], ['row', 5, [14, 0, 0], ['box', 'c', [0, -17, 0], [8, 8, 12]]]] },
  safe4: { about: 'a wall safe with four dials', mats: { m: 'iron', b: 'gold' }, parts: [['box', 'm', [0, 0, 0], [20, 16, 24]], ['row', 4, [4, 0, 0], ['cyl', 'b', [0, 8.2, 14], 1.5, 1, { rot: [90, 0, 0] }]], ['box', 'b', [6, 8.2, 8], [3, 1, 1]]] },
  blackboard: { about: 'a blackboard, a chairlift cartoon on it', mats: { f: 'oak', k: '#141818 none', c: '#d8d8d0 none' }, parts: [['box', 'f', [0, 0, 8], [40, 2, 26]], ['box', 'k', [0, 1.1, 9], [37, .5, 23]], ['box', 'c', [0, 1.5, 26], [30, .3, .8], { rot: [0, 4, 0] }], ['mirror', 'x', ['box', 'f', [18, 0, 0], [2, 2, 8]]]] },
  'interpreter-booth': { about: 'an interpreter\'s glass booth', mats: { g: '#a8c0d8 glaze', w: 'walnut' }, parts: [['box', 'w', [0, 0, 0], [30, 20, 14]], ['box', 'g', [0, 0, 14], [30, 20, 18]], ['box', 'w', [0, 0, 32], [32, 22, 2]]] },
  'press-pinboard': { about: 'a pinboard of press clippings', mats: { c: 'burlap', p: '#e8e4d8 none' }, parts: [['box', 'c', [0, 0, 10], [36, 1.5, 22]], ['row', 4, [8, 0, 0], ['box', 'p', [0, 1, 20], [6, .5, 7]]], ['row', 3, [10, 0, 0], ['box', 'p', [0, 1, 13], [7, .5, 5]]]] },
  'top-station': { about: 'a lift station at the top, its roof heavy with snow', mats: { w: 'timber', r: 'shingle', s: '#f0f4f8 none', g: '#ffd890 none' }, parts: [['box', 'w', [0, 0, 0], [80, 50, 48]], ['prism', 'r', [0, 0, 48], [[-46, 0], [46, 0], [0, 22]], 56, { axis: 'x' }], ['prism', 's', [0, 0, 51], [[-44, 0], [44, 0], [0, 19]], 54, { axis: 'x' }], ['row', 3, [20, 0, 0], ['box', 'g', [0, 25.2, 26], [10, .5, 10]]]] },
  'shelter-hut': { about: 'an avalanche shelter of stone', mats: { s: 'stone', r: 'slate', w: '#f0f4f8 none' }, parts: [['box', 's', [0, 0, 0], [56, 40, 36]], ['prism', 'r', [0, 0, 36], [[-32, 0], [32, 0], [0, 16]], 44, { axis: 'x' }], ['prism', 'w', [0, 0, 39], [[-30, 0], [30, 0], [0, 13]], 42, { axis: 'x' }]] },
  'start-gate': { about: 'a race start gate', mats: { m: 'steel', o: '#ff7a1e none', k: '#141414 none' }, parts: [['mirror', 'x', ['box', 'o', [14, 0, 0], [3, 3, 34]]], ['box', 'k', [0, 0, 34], [32, 3, 8]], ['box', 'm', [0, 4, 6], [26, 1, 1]]] },
  'glacier-station': { about: 'the glacier station of the gondola', mats: { c: 'stone', g: '#80c0e0 glaze', m: 'steel' }, parts: [['box', 'c', [0, 0, 0], [140, 100, 70]], ['box', 'g', [-70, 0, 30], [2, 60, 30]], ['box', 'm', [0, 0, 70], [150, 110, 6]]] },
  'valley-station': { about: 'the valley station of the gondola', mats: { c: 'stone', w: 'timber', m: 'steel' }, parts: [['box', 'c', [0, 0, 0], [120, 90, 40]], ['box', 'w', [0, 0, 40], [124, 94, 24]], ['box', 'm', [0, 0, 64], [130, 100, 6]]] },
  'freight-elevator': { about: 'a freight elevator cage', mats: { m: 'iron', y: '#f0c020 none' }, parts: [['box', 'm', [0, 0, 0], [30, 30, 2]], ['mirror', 'xy', ['box', 'm', [14, 14, 2], [2, 2, 44]]], ['box', 'y', [0, -14, 20], [28, 1, 2]], ['box', 'm', [0, 0, 46], [32, 32, 2]]] },
  flagpole: { about: 'a summit flagpole', mats: { p: 'steel', f: '#f4f1ea cloth' }, parts: [['cyl', 'p', [0, 0, 0], 1, 90], ['box', 'f', [10, 0, 72], [20, 1, 14]]] },
  'weather-mast': { about: 'a weather mast with a cup anemometer', mats: { p: 'steel', r: '#c8302a none' }, parts: [['cyl', 'p', [0, 0, 0], 1.2, 80], ['ring', 3, 5, ['ball', 'r', [0, 0, 82], 2]], ['box', 'p', [0, 0, 60], [12, 2, 2]]] }
});

/* ==== content/songs.js ==== */
/* SKILLER7 content — the music, written in the engine's step notation (one token a step: a note, '-' hold, '.' rest).
 * "Alpine noir": pulse accordion chords, triangle and saw oompah bass, pulse12 zither arpeggios, sine pads, brushed
 * hats. Every play song has a 'danger' layer (on: false) that comes in while Whiteouts are near. */
const rp = (s, n) => Array(n).fill(s).join(' | ');
const S_ = (id, song) => (S7.SONGS[id] = song);

S_('title', { bpm: 84, steps: 2, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, vib: [5, .015], notes: 'A4 - - - C5 - E5 - | F5 - - - E5 - D5 - | E5 - - - A4 - G#4 - | A4 - - - - - . . | A4 - - - C5 - E5 - | F5 - - - A5 - G#5 - | A5 - - - E5 - C5 - | B4 - - - - - . .' },
  { name: 'waltz', wave: 'triangle', vol: .2, notes: rp('A2 . E3 . E3 .', 2) + ' | ' + rp('D2 . F3 . F3 .', 2) + ' | ' + rp('E2 . B2 . E3 .', 2) + ' | ' + rp('A2 . E3 . A3 .', 2) },
  { name: 'pad', wave: 'sine', vol: .07, notes: 'A3 - - - - - - - - - - - | D3 - - - - - - - - - - - | E3 - - - - - - - - - - - | A3 - - - - - - - - - - -' },
  { name: 'bells', wave: 'pulse12', vol: .05, notes: rp('. . . . . . . . . . E6 .', 3) + ' | . . . . . . . . G#6 . A6 .' }
] });
S_('room7', { bpm: 96, steps: 2, tracks: [
  { name: 'box', wave: 'triangle', vol: .14, notes: 'E6 . G6 . B6 . | A6 . G6 . E6 . | D6 . F#6 . A6 . | G6 . F#6 . D6 . | C6 . E6 . G6 . | B5 . C6 . E6 . | D6 - - - B5 . | E6 - - - . .' },
  { name: 'bass', wave: 'sine', vol: .12, notes: 'E3 . . . . . | A2 . . . . . | D3 . . . . . | G2 . . . . . | C3 . . . . . | A2 . . . . . | B2 . . . . . | E2 . . . . .' },
  { name: 'tick', wave: 'drums', vol: .05, notes: rp('t . t . t .', 8) }
] });
S_('hotel', { bpm: 92, steps: 2, tracks: [
  { name: 'walk', wave: 'triangle', vol: .22, notes: 'D2 . F2 . A2 . C3 . | Bb1 . D2 . F2 . A2 . | G1 . Bb1 . D2 . F2 . | A1 . C#2 . E2 . G2 .' },
  { name: 'trumpet', wave: 'square', vol: .07, vib: [5, .015], notes: 'D4 - - - F4 - E4 D4 | . . . . . . . . | Bb3 - - - D4 - C4 Bb3 | A3 - - - . . . . | D4 - F4 - A4 - G4 F4 | E4 - - - . . . . | F4 - E4 - D4 - C#4 - | D4 - - - . . . .' },
  { name: 'brush', wave: 'drums', vol: .07, notes: rp('h . h h h . h h', 4) },
  { name: 'danger', wave: 'saw', vol: .07, on: false, notes: 'D3 . . D#3 . . D3 . | . . G#3 . . . . . | Bb2 . . B2 . . Bb2 . | . . E3 . F3 . . .' }
] });
S_('shaft', { bpm: 128, steps: 4, tracks: [
  { name: 'ding', wave: 'pulse12', vol: .08, notes: 'E6 . . . . . . . E6 . . . . . . . | E6 . . . . . . . E6 . . . B5 . . .' },
  { name: 'pulse', wave: 'saw', vol: .11, notes: rp('E2 . E2 . E3 . E2 . G2 . E2 . F2 . E2 .', 2) },
  { name: 'kick', wave: 'drums', vol: .12, notes: rp('k . . . s . . . k . k . s . . .', 2) },
  { name: 'danger', wave: 'square', vol: .06, notes: 'E4 - - - F4 - - - E4 - - - B3 - - - | E4 - - - G4 - F4 - E4 - - - - - - -' }
] });
S_('village', { bpm: 116, steps: 2, tracks: [
  { name: 'oompah', wave: 'triangle', vol: .22, notes: rp('A2 . E3 . A2 . E3 .', 2) + ' | ' + rp('D2 . A2 . D2 . A2 .', 1) + ' | ' + rp('E2 . B2 . E2 . G#2 .', 1) },
  { name: 'accordion', wave: 'pulse', vol: .08, notes: rp('. [A3] . [A3] . [A3] . [A3]', 1).replace(/\[A3\]/g, 'C4') + ' | . E4 . E4 . E4 . E4 | . F4 . F4 . F4 . F4 | . E4 . E4 . G#4 . G#4' },
  { name: 'lead', wave: 'square', vol: .06, vib: [5, .015], notes: 'E5 - C5 - A4 - C5 - | E5 - A5 - G#5 - E5 - | F5 - D5 - A4 - D5 - | E5 - - - . . . .' },
  { name: 'danger', wave: 'drums', vol: .09, on: false, notes: rp('s s s s s . s . s s s s s s s s', 1) }
] });
S_('palais', { bpm: 104, steps: 4, tracks: [
  { name: 'arp', wave: 'sine', vol: .09, notes: rp('C4 E4 G4 B4 C5 B4 G4 E4', 2) + ' | ' + rp('A3 C4 E4 G4 A4 G4 E4 C4', 2) },
  { name: 'type', wave: 'drums', vol: .05, notes: rp('t . . t . t . . t . t t . . t .', 2) },
  { name: 'pad', wave: 'triangle', vol: .08, notes: 'C3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -' },
  { name: 'danger', wave: 'saw', vol: .05, on: false, notes: 'C3 . . C#3 . . C3 . . . . . G3 . F#3 . | A2 . . A#2 . . A2 . . . . . E3 . D#3 .' }
] });
/* the band: each musician's track is their window. Kill one and their layer goes; the tempo climbs 112 > 124 > 136 > 148 */
S_('band', { bpm: 112, steps: 4, tracks: [
  { name: 'tuba', wave: 'triangle', vol: .26, notes: 'C2 - - - . . . . G1 - - - . . . . | C2 - - - . . . . G1 - - - . . . . | F1 - - - . . . . C2 - - - . . . . | G1 - - - . . . . G1 - - - B1 - - -' },
  { name: 'accordion', wave: 'pulse', vol: .09, notes: '. . . . E4 - - - . . . . E4 - - - | . . . . E4 - - - . . . . G4 - - - | . . . . F4 - - - . . . . A4 - - - | . . . . D4 - - - . . . . D4 - F4 -' },
  { name: 'trumpet', wave: 'square', vol: .07, notes: 'G4 - E4 - G4 - C5 - . . . . . . . . | . . . . . . . . E5 - D5 - C5 - - - | A4 - C5 - F5 - A5 - . . . . . . . . | . . . . . . . . G5 - F5 - D5 - B4 -' },
  { name: 'snare', wave: 'drums', vol: .1, notes: 's s . . s s . . s s . . s s s s | . . s s . . s s . . s s s s s s | s s . . s s . . s s . . s s s s | s s s s s s s s . . . . s . s .' }
] });
S_('blackrun', { bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: rp('A1 . A2 . A1 . A2 . F1 . F2 . G1 . G2 .', 2) },
  { name: 'yodel', wave: 'pulse', vol: .07, vib: [5, .015], notes: 'A4 - E5 - A5 - E5 - C5 - A4 - E5 - . . | F4 - C5 - F5 - C5 - G4 - D5 - G5 - . .' },
  { name: 'drums', wave: 'drums', vol: .11, notes: rp('k . h . s . h . k k h . s . h h', 2) },
  { name: 'danger', wave: 'sine', vol: .08, on: false, notes: 'A3 - - - - - - - E4 - - - - - - - | F3 - - - - - - - G3 - - - - - - -' }
] });
S_('gondola', { bpm: 70, steps: 4, tracks: [
  { name: 'pad', wave: 'sine', vol: .1, notes: 'D3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - -' },
  { name: 'creak', wave: 'drums', vol: .05, notes: rp('o . . . . . c . . . o . . . . .', 2) },
  { name: 'heart', wave: 'drums', vol: .09, notes: rp('k . k . . . . . . . . . . . . .', 2) },
  { name: 'danger', wave: 'pulse12', vol: .05, on: false, notes: 'D5 . F5 . A5 . F5 . D5 . F5 . A5 . C6 . | C5 . E5 . G5 . E5 . A4 . C5 . E5 . G5 .' }
] });
S_('archive', { bpm: 66, steps: 4, tracks: [
  { name: 'drone', wave: 'triangle', vol: .12, notes: 'E2 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - - | E2 - - - - - - - - - - - - - - -' },
  { name: 'bells', wave: 'sine', vol: .08, notes: 'B5 . . . E6 . . . . . G6 . . . . . | . . F#6 . . . . . B5 . . . . . . . | C6 . . . F6 . . . . . A6 . . . . . | . . G6 . . . . . E6 . . . . . . .' },
  { name: 'heart', wave: 'drums', vol: .07, notes: rp('k . k . . . . . . . . . . . . .', 4) },
  { name: 'danger', wave: 'saw', vol: .05, on: false, notes: 'E3 . . F3 . . E3 . . . . . A#3 . . . | E3 . . F3 . . E3 . . . . . B3 . . .' }
] });
S_('powderking', { bpm: 132, steps: 2, tracks: [
  { name: 'schlager', wave: 'square', vol: .07, notes: 'C5 - E5 - G5 - E5 - | F5 - A5 - C6 - A5 - | G5 - - - E5 - C5 - | D5 - - - - - . . | C5 - E5 - G5 - C6 - | B5 - A5 - G5 - F5 - | E5 - G5 - D5 - F5 - | C5 - - - - - . .' },
  { name: 'oompah', wave: 'triangle', vol: .2, notes: rp('C2 . G2 . C2 . G2 .', 2) + ' | ' + rp('F1 . C2 . G1 . D2 .', 2) },
  { name: 'drums', wave: 'drums', vol: .1, notes: rp('k . s . k . s . k . s . k s s s', 2) },
  { name: 'danger', wave: 'saw', vol: .06, on: false, notes: 'C3 . . C#3 . . C3 . | F2 . . F#2 . . G2 . | C3 . . C#3 . . C3 . | G2 . . G#2 . . G2 .' }
] });
S_('interview', { bpm: 60, steps: 4, tracks: [{ name: 'pad', wave: 'sine', vol: .1, notes: 'A2 - - - - - - - - - - - - - - - | F2 - - - - - - - - - - - - - - -' }, { name: 'wind', wave: 'drums', vol: .03, notes: rp('o . . . . . . . . . . . . . . .', 2) }] });
S_('echorun', { bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: rp('E2 . E3 . E2 . E3 . C2 . C3 . D2 . D3 .', 2) },
  { name: 'lead', wave: 'pulse', vol: .07, notes: 'E5 . G5 . B5 . E6 . D6 . B5 . G5 . A5 . | C6 . B5 . G5 . E5 . D5 . E5 . F#5 . G5 .' },
  { name: 'drums', wave: 'drums', vol: .11, notes: rp('k . h . s . h . k . h k s . h h', 2) }
] });
S_('credits', { bpm: 88, steps: 2, tracks: [
  { name: 'lead', wave: 'triangle', vol: .14, notes: 'E5 - - - D5 - C5 - | B4 - - - A4 - - - | C5 - - - B4 - A4 - | G#4 - - - - - - - | A4 - C5 - E5 - A5 - | G#5 - - - E5 - - - | F5 - E5 - D5 - C5 - | B4 - - - E5 - - -' },
  { name: 'bass', wave: 'sine', vol: .14, notes: 'A2 - - - - - - - | E2 - - - - - - - | F2 - - - - - - - | E2 - - - - - - - | A2 - - - - - - - | E2 - - - - - - - | D2 - - - - - - - | E2 - - - - - - -' }
] });
S_('stage', { bpm: 140, steps: 2, loop: false, tracks: [{ wave: 'square', vol: .12, notes: 'A4 C5 E5 A5 - - G#5 - A5 - - - . .' }, { wave: 'triangle', vol: .2, notes: 'A2 - - - - - E2 - A2 - - - . .' }] });
S_('gameover', { bpm: 70, steps: 2, loop: false, tracks: [{ wave: 'triangle', vol: .16, notes: 'E4 - D4 - C4 - B3 - A3 - - - - - . .' }, { wave: 'sine', vol: .12, notes: 'A2 - - - - - - - E2 - - - - - . .' }] });
S_('rank', { bpm: 150, steps: 2, loop: false, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 E5 G5 C6 . C6 - - .' }] });

/* ==== content/story.js ==== */
/* SKILLER7 content — the cast, every line, and the beats (coroutines: yield seconds, a condition, B.say, B.card, B.cam).
 * Style (§11.2): short flat sentences; euphemism as menace; politics as weather; repetition with drift. */
S7.PEOPLE = {
  holle: { name: 'OMA HOLLE', voice: 'holle', rig: { build: 'chibi', size: 1.0, hair: 'long', colors: { skin: '#e8d8c8', hair: '#f4f4f4', cloth: '#f0ece4', pants: '#f0ece4' }, weapon: null } },
  rosalind: { name: 'SISTER ROSALIND', voice: 'rosalind', rig: { build: 'heroic', outfit: 'robe', hood: true, acc: [{ kind: 'shades', color: '#2a2a3a', shine: '#c0c8e0' }], weapon: null, colors: { skin: '#ead6c6', hair: '#f4f4f4', cloth: '#18181c', coat: '#18181c', trim: '#f4f4f4', pants: '#18181c' } } },
  concierge: { name: 'THE CONCIERGE', voice: 'concierge', rig: { build: 'heroic', outfit: 'coat', hair: 'short', weapon: null, colors: { skin: '#d8d0cc', hair: '#c0c0c8', cloth: '#101014', coat: '#101014', pants: '#101014', trim: '#d8b040', eye: '#d0d0d8' } } },
  fohn: { name: 'MISTER FÖHN', voice: 'fohn', rig: { build: 'heroic', outfit: 'coat', hair: 'short', acc: [{ kind: 'shades', color: '#101010' }], weapon: null, colors: { skin: '#b8805a', hair: '#101010', cloth: '#f4efe4', coat: '#f4efe4', pants: '#f4efe4', trim: '#e0d8c8' } } },
  pim: { name: 'PIM, THE LIFT BOY', voice: 'pim', rig: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2e5a3a' }, weapon: null, colors: { skin: '#d8e8e0', hair: '#5a4a3a', cloth: '#2e5a3a', pants: '#2a3a30' } } },
  murmel: { name: 'MURMEL', voice: 'murmel', blob: true },
  grau: { name: 'BELLCAPTAIN GRAU', voice: 'grau', rig: { build: 'heroic', size: 1.4, outfit: 'coat', hair: 'short', hat: { style: 'pillbox', color: '#a01818', band: '#e0b040' }, weapon: null, colors: { skin: '#a8a8a8', hair: '#606060', cloth: '#a01818', coat: '#a01818', pants: '#801010', trim: '#e0b040' } } },
  hansi: { name: 'HANSI PULVER', voice: 'hansi', rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', hat: { style: 'racehelmet', color: '#e0b040', visor: '#c0e8ff' }, acc: [{ kind: 'goggles', color: '#c0e8ff' }], weapon: 'poles', colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', trim: '#ffffff', metal: '#e0e0e8' } } },
  exposure: { name: 'EXPOSURE', voice: null },
  tuba: { name: 'THE TUBA', voice: 'tuba', rig: { build: 'bulky', size: 1.3, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#3a5a2a', feather: '#e8e0c0' }, weapon: null, colors: { skin: '#f6f6f4', cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e', eye: '#101010' } } },
  villager: { name: 'A VILLAGER', voice: 'villager', rig: { build: 'heroic', outfit: 'coat', hair: 'short', weapon: null, colors: { skin: '#e8d0b8', cloth: '#6a4a3a', coat: '#6a4a3a', pants: '#3a2a20', hair: '#5a3a20' } } }
};
for (const id of S7.ORDER) S7.PEOPLE[id] = { name: S7.PERSONAS[id].name.toUpperCase(), voice: S7.PERSONAS[id].voice, rig: S7.PERSONAS[id].rig, persona: true };

const L = S7.lines;
L('murmel_first', ['Welcome... to Piz Nada... Higher than you think...', 'Gratuity... is customary... The first one... is on the house...', 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...']);
L('hints', {
  rope: 'The bar... is for members... Membership is a matter of means... Who in the family has means...?',
  key: 'Staff keys... live behind bars... The bar... is behind the rope...',
  bell: 'Ring for service... at the end of the hall... Only an old man\'s eyes... reach that far...',
  gap: 'A hole in the floor... is a ski jump... for someone in a hurry...',
  grau: 'The Bellcaptain... works in the shaft... Every floor has a bell... Wait for the hat...',
  bell1: 'The church bell... shakes the snow off the lift station... Someone with a long gun... and long patience...',
  gate: 'The gondola is for delegates... Three Edelweiss... One in the Palais... one in a tuba... one on the mountain...',
  mirrors: 'Mirrors lie... Echoes don\'t... Sing to the wall...',
  press: 'The press room is dark... Someone with a flash... could develop a secret... A safe likes dates...',
  patrol: 'The ridge is closed... Patrol only... The Sweep lives in Room 7... Wake him...',
  cornice: 'The ridge wears a snow hat... Knock it off... and you have a bridge... Brigid knows how...',
  crystals: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  ledger: 'A ledger frozen dark... wants a flash...',
  seracs: 'Ice towers... come down... for an engineer...',
  hansi: 'The summit... Hansi falls to the left... He always did...'
});
L('hint_fallback', ['Have you tried... being somebody else...?']);
L('objectives', {
  rope: 'Get past the velvet rope into the bar.', key: 'Find the service key behind the bar. Take the stairwell up.', bell: 'Ring for service: the bell across the light well.',
  gap: 'Cross the hole in the floor.', grau: 'The service shaft. The Bellcaptain is on duty.', bell1: 'Clear the snow off the lift station.',
  gate: 'Collect three Edelweiss passes for the gondola.', mirrors: 'The Palais: find the passes. Sing past the mirrors.', press: 'The press room is dark. Develop what\'s on the board.',
  patrol: 'The Black Run: cross the patrol rope.', cornice: 'Bring down the cornice. Reach the avalanche shelter.', crystals: 'The Archive: shatter the humming crystals.',
  ledger: 'Read the frozen ledger.', seracs: 'Bring down the seracs. Take the freight elevator.', hansi: 'The summit. Hansi Pulver skis at midnight.'
});
L('rosalind_obj', {
  rope: 'The bar has a rope. Ropes have prices.', key: 'Staff keys hang where staff drink.', bell: 'The Bellcaptain\'s luggage is heavy. Ring for service.', gap: 'The floor is gone. Someone in this family has never once slowed down.',
  grau: 'He is waiting in the shaft. He has always been waiting.', bell1: 'The church rings. The roof listens.', gate: 'Three flowers for a gondola. Go and pick them.',
  mirrors: 'Mirrors in the Palais. Kasimir sings badly enough.', press: 'Dark rooms keep secrets. Mireille keeps a flash.', patrol: 'The ridge is closed. Your brother is patrol.',
  cornice: 'Brigid brings the snow down. Gently, she says.', crystals: 'The vault. Read nothing. Read everything.', ledger: 'The vault. Read nothing. Read everything.', seracs: 'Ice towers. Brigid.', hansi: 'Midnight. The summit. She taught him to fall.'
});
L('holle_bed', ['Shake the bed...', 'Hansi always fell to the left.', 'Seven coats. Seven hooks. One girl.', 'Is it spring yet? Don\'t tell me.', 'The wind is warm today. Close the window.', 'Eight on the lift... no, seven... no...']);
L('lobby_door', ['The revolving door turns in the storm. It does not let anyone out.', 'Checkout is not available at this time.']);
L('lookout', ['Across the light well, the hotel\'s great service bell. Seventy years of dust on it.', 'Too far for a pistol. Not too far for an old man\'s eyes.']);
L('hole', ['The floor fell through to the second floor. Nobody heard it. Nobody heard anything here.']);
L('village1', ['It hasn\'t stopped snowing since Grandmother was a girl.']);
L('village2', ['The Föhn came through Tuesday. My husband laughed until he wasn\'t there.']);
L('village3', ['Bend the knees. Bend the truth. Same muscles.']);
L('lookout1', ['The church tower. Its bell, eighty metres off, dark against the dusk.', 'A bell that big could shake the snow off half the village.']);
L('coastal', ['The Coastal Ambassador, frozen mid-handshake: "We have nothing to hide that we haven\'t already hidden."']);
L('steppe', ['The Steppe General, frozen saluting: "Neutrality isn\'t a place. It\'s a direction. Away."']);
L('interpreter', ['The interpreter: "He says... he is sorry. He is not saying that."']);
L('waiter', ['A waiter with a tray: "The canapés were always frozen. Now they\'re honest."']);
L('journalist', ['A journalist: "Off the record? The record is on ice."']);
L('secretary', ['A secretary: "Sign here. And here. And under the ice."']);
L('mirrorwall', ['An ornate wall of mirrors. Seven faces in it, all the same face.', 'It hums when you speak. It would ring if you sang.']);
L('cornice', ['The ridge wears a cornice of snow over a crevasse.', 'Bring it down in the right place and it makes a bridge.']);
L('deposit1', ['Account 4417. Contents: a journalist, 1961.']);
L('deposit2', ['Account 2210. Contents: a quarrel between two countries. Unopened.']);
L('deposit3', ['Account 0889. Contents: the truth about a war. Interest accrues.']);
L('briefing0', [['concierge', 'Good evening, Madame Holle. A guest has checked into the Grand Hotel who will not be checking out.'], ['concierge', 'Bellcaptain Grau. Third floor and below. The Department thanks you for your discretion.']]);
L('briefing1', [['concierge', 'At midnight, at the summit, the Coastal Federation and the Steppe Directorate will sign the Thaw Accord.'], ['concierge', 'Forty years of frozen war, ended with a fountain pen.'],
  ['concierge', 'Article Nine requires the Canton to open the Glacier Archive. Every account. Every name. Every body.'], ['rosalind', 'Bodies in a bank.'], ['concierge', 'Deposits, Sister.'],
  ['concierge', 'The Föhn has booked a guest onto the mountain. Hansi Pulver. Three Olympic golds. The face on the chocolate.'],
  ['concierge', 'He will ski the summit at midnight and the glacier will weep. The Department would prefer it did not weep.']]);

const B_ = S7.beat;
const toRoom = (area, node) => { S7.flurry && S7.flurry(); S7.enterArea(area, node, { noAutosave: true }); };
/* ---- the cold open (Room 7) ---- */
B_('cold_open', function* (B) {
  B.cut(true);
  yield B.card('THE WINTER OF THE THAW ACCORD.', '', 2.8);
  yield B.card('THE FREE CANTON OF PIZ NADA.', 'POPULATION: DISCREET.', 2.8);
  yield B.cam({ shot: 'fixed', at: [10.6, 8.6, 2.8], look: [3.5, 3, 1], fov: 54 }, 999);
  B.emit('phoneRing', {}); yield 1.4;
  yield B.say(S7.LINES.briefing0);
  yield B.cam({ shot: 'fixed', at: [5, 5.2, 1.6], look: [2.2, 2.6, .8], fov: 44 }, 999);
  yield B.say([['holle', '...Shake the bed, Rosalind.'], ['rosalind', 'She means it\'s time. She always means it\'s time.']]);
  B.emit('featherShake', {}); yield 1.6;
  yield B.cam({ shot: 'fixed', at: [6, 7.6, 2.2], look: [1.6, 6.6, 1.4], fov: 50 }, 999);
  B.emit('wardrobeOpen', {}); yield .8;
  yield B.say([['ignaz', 'Grau. His grandfather carried my luggage in 1925. He never smiled either.'], ['dagny', 'This one\'s smiling.'], ['rurik', 'Everyone smiles when the price is right.']]);
  B.camOff(); B.cut(false);
  yield B.card('TARGET 00', 'TURN-DOWN SERVICE', 3, { target: true, who: 'grau' });
  const G = B.G(); G.r7from = { area: '00A', node: 'r7' }; G.lastDoor['00A'] = 'r7';
  toRoom('00A', 'r7'); S7.autosave && S7.autosave('area');
});
B_('t00_first_whiteout', function* (B) {
  const G = B.G();
  S7.startWave('first'); yield .5;
  yield B.say([['ignaz', 'Laughter. In a hotel lobby. At this hour.'], ['dagny', 'Shoot it before it finishes the joke.']]);
  S7.tip('aim');
  yield () => G.aim.on || !S7.aliveEnemies().length; S7.tip('scan');
  yield () => G.scan || G.enemies.some(e => e.alive && e.vis > .5) || !S7.aliveEnemies().length; S7.tipDone('scan'); S7.tip('fire');
  yield () => !S7.aliveEnemies().length;
  S7.tipDone('fire'); S7.setFlag('firstThaw');
  if (G.stats.crits) S7.barkLine(G.persona === 'ignaz' ? 'ignaz' : G.persona, 'Clean.');
  yield 1.2;
  if (G.roster[G.persona].hp < G.roster[G.persona].max * .7) S7.tip('heal');
  else S7.tip('interact');
});
B_('pim1', function* (B) {
  S7.setFlag('pim1seen');
  yield B.say([['pim', 'Going up? Nobody\'s going up. The elevator\'s been laughing since Tuesday.'], ['pim', 'Seven of you. I always count. Count again, later.']]);
  S7.setFlag('pim1done');
});
B_('pim2', function* (B) { yield B.say([['pim', 'Room 7 isn\'t on the plan. The architect was very sorry. He\'s in the walls now.']]); });
B_('pim3', function* (B) { yield B.say([['pim', 'Do you know why it never stops snowing here? Somebody upstairs is shaking a bed.']]); });
B_('pim5', function* (B) { yield B.say([['pim', 'They froze the whole team in the photograph. Smile, everybody. Nobody smiled.']]); });
B_('concierge_bar', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The Bellcaptain is on duty tonight. Third floor and below.'], ['concierge', 'Do enjoy the bar. It is complimentary, for members.']]); });
B_('concierge_booth', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The gondola is reserved for delegates. Delegates carry Edelweiss.'], ['concierge', 'Edelweiss grows where it likes.']]); });
B_('concierge_atrium', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'The Accord has forty-three articles. Article Nine is the one with teeth.'], ['concierge', 'The others are gums.']]); B.give('doc_art9'); });
B_('concierge_vault', function* (B) { B.emit('phoneRing', {}); yield .6; yield B.say([['concierge', 'You are in the vault. The Department would prefer you didn\'t read anything.'], ['concierge', 'The Department knows you will.']]); });
B_('briefing_replay0', function* (B) { yield B.say(S7.LINES.briefing0); });
B_('briefing_replay1', function* (B) { yield B.say(S7.LINES.briefing1); });
B_('lookout_hint', function* (B) {
  const G = B.G();
  if (G.persona !== 'ignaz') S7.barkLine('ignaz', 'That bell. Seventy metres. My kind of conversation.', 3.2);
  else { S7.barkLine('ignaz', 'Ah. A bell that wants ringing.', 2.6); S7.tip('skill'); }
});
B_('bell_rung', function* (B) {
  B.cut(true); B.emit('bigBell', {}); S7.splash('DING.', 1.6, { big: true });
  yield B.cam({ shot: 'fixed', at: [33, 14, 2.2], look: [40.5, 18, 1.2], fov: 46 }, 3);
  B.emit('shaftOpen', {}); yield 3;
  B.cut(false);
  yield B.say([['ignaz', 'Service.'], ['dagny', 'The shaft doors. Downstairs, past the hole.']]);
});
B_('collapse', function* (B) {
  const G = B.G();
  if (G.persona === 'ansel') { B.emit('collapse', {}); S7.splash('THE CEILING MISSES THE SWEEP.', 1.6); return; }
  B.emit('collapse', {}); G.flags.collapseFor = G.persona; yield .25;
  S7.freezeActive();
  yield () => G.mode === 'play' && G.persona === 'ansel';
  S7.startWave('collapse');
  yield B.say([['rosalind', '(over the intercom) The Sweep only leaves Room 7 when someone\'s on the floor.'], ['rosalind', 'Use the wardrobe if you want him back.']]);
  yield () => !S7.statuesHere().length;
  S7.setFlag('rescued');
});
/* ---- after Grau: results, the after-call, the briefing, Target 01 ---- */
B_('t00_done', function* (B) {
  const G = B.G();
  yield 1.4;
  yield B.card('TARGET 00 — AUGUSTIN GRAU', 'ELIMINATED', 3.2, { target: true, who: 'grau', dead: true });
  yield B.results(0);
  toRoom('room7', 'door'); S7.thawLeftBehind(null); if (G.persona === 'ansel') { G.persona = G.roster.ignaz.frozen ? 'rurik' : 'ignaz'; }
  B.cut(true);
  yield B.cam({ shot: 'fixed', at: [10.6, 8.6, 2.8], look: [4, 3, 1], fov: 54 }, 999);
  B.emit('phoneRing', {}); yield 1;
  yield B.say([['concierge', 'Your guest has checked out. Housekeeping has been notified.'], ['concierge', 'Breakfast is served at seven. As always. As it was. As it will be.']]);
  yield 1;
  B.emit('phoneRing', {}); yield 1;
  yield B.say(S7.LINES.briefing1);
  yield B.say([['holle', 'Hansi. I taught Hansi to fall.'], ['mireille', 'Then we\'ll teach him to land.'], ['kasimir', 'Yo-di-ah-hee... hoo.'], ['brigid', 'I\'ll bring the snow down on him. Gently. Like a mother.']]);
  for (const id of ['kasimir', 'mireille', 'brigid']) G.roster[id].unlocked = true;
  B.camOff(); B.cut(false);
  yield B.card('THREE MORE COATS ARE DRY.', '', 2.6);
  yield B.card('TARGET 01', 'APRÈS', 3, { target: true, who: 'hansi' });
  G.target = 1; G.stats = S7.newStatsFn(); B.give('doc_t01');
  G.r7from = { area: '01A', node: 'ht' };
  toRoom('01A', 'ht'); S7.autosave && S7.autosave('area');
});
/* ---- Target 01 beats ---- */
B_('church_bell', function* (B) {
  B.cut(true); B.emit('bigBell', { church: true }); S7.splash('DONG.', 1.6, { big: true });
  yield B.cam({ shot: 'fixed', at: [28, 30, 3.2], look: [38, 25, 4], fov: 50 }, 3.2);
  B.emit('driftSlide', {}); yield 3.2;
  B.cut(false);
  yield B.say([['ignaz', 'The roof is clear. The lift is open.'], ['rurik', 'And the turnstile still wants forty.']]);
});
B_('delegate_gate', function* (B) {
  B.cut(true);
  yield B.cam({ shot: 'fixed', at: [30, 38, 2], look: [32.5, 41.5, 1.4], fov: 44 }, 3);
  for (let i = 0; i < 3; i++) { B.emit('edelSlot', { i }); yield .7; }
  yield .8; B.cut(false); S7.setFlag('gondolaGate');
  yield B.say([['concierge', '(a speaker by the gate) Welcome, delegate. Mind the gap. The gap is very large.']]);
});
B_('inspector', function* (B) {
  const G = B.G();
  if (G.items.edelweiss && G.flags.edel1) return;
  const e = S7.spawnEnemy('inspector', 36.5 * 16, 28.5 * 16, undefined, { marks: [[30, 28.5], [38, 28.5], [34, 32]], wave: null });
  e.drop = 'edelweiss'; e.onDropFlag = 'edel1';
  S7.barkLine(G.persona, 'An inspector. Carrying a pass. He won\'t stay.', 3);
  G.flags.inspectorGone = 0;
});
B_('board_developed', function* (B) {
  B.emit('open', { screen: 'exposure', item: 'exp_board' });
  yield () => !S7.UIOPEN;
  yield B.say([['mireille', 'Twenty-six, oh-one. The day the eight went up.'], ['mireille', 'A date makes a good combination. People never forget the worst day.']]);
});
B_('safe_open', function* (B) {
  B.give('ember'); B.give('doc_art9');
  yield B.say([['rurik', 'An ember in a safe. Rich people keep the strangest things warm.'], [B.G().persona, 'The Ember Charm. Ice weeps when it meets it.']]);
});
B_('cornice_down', function* (B) {
  B.cut(true); B.emit('corniceFall', {});
  yield B.cam({ shot: 'fixed', at: [226, 70, 396], look: [243, 55, 386], fov: 50 }, 3.6);
  yield 3.6; B.cut(false);
  yield B.say([['brigid', 'Bridge. Gently, see.']]);
});
B_('lawine', function* (B) {
  const G = B.G();
  S7.setFlag('lawine');
  G.aval = { d: -38 * 16, pd: 0, speed: 239 * S7.DIFF[G.difficulty].aval, t: 0 };
  B.emit('lawine', {}); S7.splash('LAWINE!', 2.2, { big: true });
  S7.barkLine('dagny', 'Tuck. Tuck. TUCK.', 2.4);
});
B_('slowjump', function* (B) { const G = B.G(); G.slowmo = .6; B.emit('slowmo', {}); yield .6; G.slowmo = 0; });
B_('gondola', function* (B) {
  const G = B.G(), A = S7.W;
  B.emit('gondolaStart', {});
  yield B.say([['mireille', 'A glass box on a wire, over a valley, in a storm. Very discreet.']]);
  const e = A.rails.byId['gs-gl'], at = () => G.walker.s / e.len;
  const crawl = (dir = 1) => { const s = G.walker.s + dir * 26 * 16; const en = S7.spawnEnemy('crawler', 0, 0, 0, { revealed: 0 }); en.track = { edge: 'gs-gl', s: Math.max(0, Math.min(e.len, s)), speed: 40, dz: 2.6 }; };
  const downCab = () => { const en = S7.spawnEnemy('snowballer', 0, 0, 0, {}); en.track = { edge: 'gs-gl', s: Math.min(e.len, G.walker.s + 60 * 16), speed: -160, dy: 12 * 16, dz: -1.2, pass: true }; en.cabin = true; };
  yield () => at() > .08; crawl(1);
  yield () => at() > .16; downCab();
  yield () => at() > .24; crawl(1); crawl(-1);
  yield () => at() > .32; downCab();
  yield () => at() > .4; for (const sd of [-1, 1]) { const en = S7.spawnEnemy('giggler', 0, 0, 0, { revealed: 1 }); en.track = { edge: 'gs-gl', s: G.walker.s + sd * 2.2 * 16, speed: 0, dy: sd * 1.4 * 16, dz: 0, ride: true }; }
  yield () => at() > .48; downCab(); crawl(1);
  yield () => at() >= .55 && !S7.aliveEnemies().length || at() > .6;
  // the power cut
  G.flags.liftStop = 'gs-gl'; S7.setFlag('powerCut'); B.emit('powerCut', {}); S7.splash('THE POWER IS OUT.', 2);
  yield 1.2;
  yield B.say([['pim', '(on the roof, legs dangling) There were eight of us on the lift that day. The snow took seven.'], ['pim', 'Count again.'], ['holle', '(far away) ...hold on to the bar, children... hold on...']]);
  yield B.say([['ignaz', 'The pylon ahead. Three frozen insulators. I will need the scope.']]);
  yield () => S7.flag('ins1') && S7.flag('ins2') && S7.flag('ins3');
  B.emit('powerOn', {}); S7.splash('POWER.', 1.4); G.flags.liftStop = null;
  yield () => at() > .7; downCab(); crawl(1);
  yield () => at() > .82; crawl(1); crawl(-1);
  yield () => at() > .97;
  S7.setFlag('gondolaDone');
});
B_('ledger', function* (B) {
  B.emit('open', { screen: 'exposure', item: 'exp_ledger' });
  yield () => !S7.UIOPEN;
  yield B.say([['exposure', 'ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.'], ['mireille', 'We\'re in the vault.'], ['ignaz', 'We are the vault, mademoiselle.'], ['dagny', 'Don\'t read it twice. Reading twice is how you fall.']]);
});
/* ---- the epilogue (Room 7) ---- */
B_('t01_done', function* (B) {
  const G = B.G();
  yield 1;
  yield B.card('TARGET 01 — HANSI PULVER', 'ELIMINATED', 3.4, { target: true, who: 'hansi', dead: true });
  yield B.results(1);
  toRoom('room7', 'door'); S7.thawLeftBehind(null); G.flags.epilogue = true;
  B.cut(true); B.emit('fohnHere', {});
  yield B.cam({ shot: 'fixed', at: [5.6, 6.2, 1.9], look: [2.4, 3, 1], fov: 46 }, 999);
  yield 1;
  yield B.say([['fohn', 'Your move, Frau Holle. You lost a bishop. A very handsome bishop. Three gold medals.'], ['holle', 'I have seven more pieces.'], ['fohn', 'You have one piece, Holle. Wearing seven coats.'], ['fohn', 'Spring always comes. That\'s not a threat. It\'s a weather report.']]);
  B.emit('windowDrip', {}); yield 1.6;
  yield B.say([['rosalind', 'Draughty.']]);
  B.emit('fohnGone', {}); B.emit('phoneRing', {}); yield 1.2;
  yield B.say([['concierge', 'The Accord is signed. Nobody remembers signing it. Your next guest arrives with the thaw. Sleep well, Madame.']]);
  if (G.pins.length >= 7) yield B.say([['pim', 'Eight on the lift. Seven in the wardrobe. One in the bed. Now you\'ve counted right.']]);
  B.camOff();
  yield B.card('TARGET 02 — BLACK ICE', '', 3);
  yield B.card('THE SNOW WILL CONTINUE.', '', 3.4);
  B.cut(false);
  G.mode = 'end'; B.emit('credits', {});
});

/* ==== src/90-present.js ==== */
/* SKILLER7 — the presenter: turns the sim's state into the 3D picture (the engine's World3D: cel filter, ink, rigs on
 * cards). A world per area (Room 7's stays alive), actors mirrored from the sim each step, set pieces drawn with the pen,
 * snow, footprints and breath, warm-spot glows, the scan ring, the first-person weapons on the overlay. It never changes
 * the sim; the sim never reads it. */
const WHITE = { skin: '#f6f6f4', hair: '#ffffff', cloth: '#ffffff', pants: '#ecedf2', boot: '#e8e8ee', eye: '#101010', trim: '#e0e4ee' };
const TINTS = ['#fff4f8', '#f4f8ff', '#f8fff4', '#fffbf0', '#f6f0ff'];
const NPC_LOOK = {
  villager: { outfit: 'coat', hair: 'short', colors: { skin: '#e8d0b8', cloth: '#6a4a3a', coat: '#6a4a3a', pants: '#3a2a20', hair: '#5a3a20' } }, villager2: { outfit: 'robe', hair: 'long', colors: { skin: '#e8d0b8', cloth: '#8a3a4a', hair: '#c8a060' } },
  instructor: { outfit: 'shirt', hair: 'short', hat: { style: 'beanie', color: '#c8302a', pom: '#ffffff' }, colors: { cloth: '#c8302a', pants: '#1a1a20' } },
  ambassador: { build: 'heroic', outfit: 'coat', hair: 'short', colors: { cloth: '#1a3a7a', coat: '#1a3a7a', pants: '#14141a', hair: '#c0c0c0' } }, general: { build: 'bulky', outfit: 'coat', hair: 'bald', hat: { style: 'cap', color: '#5a2a2a' }, colors: { cloth: '#5a4a4a', coat: '#5a4a4a', pants: '#3a2a2a', trim: '#d8b040' } },
  interpreter: { outfit: 'shirt', hair: 'ponytail', colors: { cloth: '#d8d0c0', pants: '#2a2a30', hair: '#3a2a20' } }, waiter: { outfit: 'coat', hair: 'short', colors: { cloth: '#f0f0f0', coat: '#f0f0f0', pants: '#141414' } },
  journalist: { outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#5a5a5a' }, colors: { cloth: '#8a7a5a', coat: '#8a7a5a' } }, secretary: { outfit: 'robe', hair: 'long', colors: { cloth: '#3a3a5a', hair: '#1a1a1a' } },
  frozen1: { outfit: 'coat', colors: { cloth: '#5a6a7a' } }, frozen2: { outfit: 'robe', hair: 'long', colors: { cloth: '#7a5a6a' } }, frozen3: { outfit: 'shirt', colors: { cloth: '#6a7a5a' } }, frozen4: { outfit: 'coat', hat: 'cap', colors: { cloth: '#4a4a5a' } }
};
const BAND_LOOK = { tuba: { build: 'bulky', colors: { cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e' } }, accordion: { colors: { cloth: '#f0ece0', pants: '#8a1a2a', trim: '#2e5a2e' } }, trumpet: { colors: { cloth: '#f0ece0', pants: '#5a3a1e', trim: '#2e5a2e' }, hat: { style: 'felt', color: '#4a4a4a' } }, snare: { hair: 'ponytail', colors: { cloth: '#f0ece0', pants: '#2a5a8a', trim: '#c8302a' } } };
const ECHO_COLS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const AT = (x, y, z = 0) => [x * M, y * M, z * M];

class Presenter3D {
  constructor(game, W3) { this.game = game; this.W3 = W3; this.worlds = {}; this.rec = null; this.titleOn = false; this.fx = { tracers: [], prints: [], puffT: 0 }; this.flakes = null; this.mouse = [0, 0]; }
  backend() { const R = this.W3 && this.W3.renderer; return R && R.backend && R.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2'; }
  init() {
    if (typeof window !== 'undefined' && window.ASSETS && window.ASSETS['kenney-holiday']) E.addAssets(window.ASSETS['kenney-holiday']);
    this.bus();
    this.ready = true;
    this.world('room7');
    if (typeof document !== 'undefined') {
      const cv = document.getElementById('screen');
      if (cv) cv.addEventListener('pointerdown', e => { const R0 = this.rec; if (!R0 || e.pointerType !== 'mouse' || S7.game.settings.mouseMode !== 'Look' || this.game.paused) return; if (e.button === 2 || G && G.aim.on) { R0.w.camera.capture = true; if (!document.pointerLockElement) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { S7.mouseFail = true; }); } catch (err) { S7.mouseFail = true; } } } });
      document.addEventListener('pointerlockerror', () => { if (!S7.mouseFail) { S7.mouseFail = true; S7.game.note && S7.game.note('MOUSE: POINTER MODE', 2); } });
      cv && cv.addEventListener('contextmenu', e => e.preventDefault());
    }
  }
  bus() {
    const P = () => this.game.particles, on = (t, f) => S7.bus.on(t, d => { if (this.rec) try { f(d); } catch (e) { this.game.fail('fx ' + t, e); } });
    on('explode', d => P().explosion(d.at[0], d.at[1], d.at[2], Math.max(.6, (d.radius || 1.5) / 2), { shake: 2 }));
    on('kill', d => { const e = d.enemy; if (e) { P().bits(e.x, e.y, e.z + 16, d.crit ? 22 : 12, ['#c8101e', '#ff3040', '#ffffff']); } });
    on('crit', d => { const e = d.enemy; if (e) P().bits(e.x, e.y, e.z + 22, 14, ['#ffffff', '#ff4050']); this.game.input.rumble && this.game.input.rumble(.4, .12); });
    on('hit', d => { const e = d.target; if (e && e.x !== undefined) P().sparks(e.x, e.y, e.z + 18, 4); });
    on('tink', d => P().sparks(d.at[0], d.at[1], d.at[2], 8)); on('deflect', d => P().glints(d.at[0], d.at[1], d.at[2], 6, '#ffe080'));
    on('shatter', d => P().bits(d.at[0], d.at[1], d.at[2], 10, ['#ffffff', '#c0e0ff'])); on('splat', d => P().bits(d.at[0], d.at[1], d.at[2], 8, ['#ffffff', '#e0e8ff']));
    on('pickup', d => { const H = heroPos(); P().glints(H.x, H.y, H.z + 20, 6, d.kind === 'rime' ? '#80e0ff' : '#ff4050'); });
    on('tracer', d => { this.fx.tracers.push({ a: d.from.slice(), b: d.to.slice(), t: .06 }); });
    on('flash', () => {}); on('skill', d => { if (d.skill === 'flash') this.game.flash('#ffffff', .12, .7); if (d.skill === 'echo') this.fx.echo = 1.2; if (d.skill === 'makeitrain') { const H = heroPos(); P().glints(H.x, H.y, H.z + 30, 30, '#ffd040'); } });
    on('hurt', () => { this.game.flash('#ff2030', .08, .5); this.game.shake && this.game.shake(2); });
    on('freeze', d => P().glints(d.at[0], d.at[1], d.at[2] + 16, 20, '#c0f0ff')); on('rescue', () => { const H = heroPos(); P().bits(H.x, H.y, H.z + 16, 16, ['#ffffff', '#c0f0ff']); });
    on('steam', () => { const H = heroPos(); P().smoke(H.x, H.y, H.z + 16, 10, { color: '#ffffff' }); }); on('hockey', () => { const H = heroPos(); P().smoke(H.x, H.y, H.z + 2, 8, { color: '#ffffff', size: 1.5 }); });
    on('collapse', () => { const H = heroPos(); P().bits(H.x, H.y, H.z + 40, 30, ['#a89880', '#e8e0d0']); this.game.shake && this.game.shake(6); });
    on('bigBell', () => this.game.shake && this.game.shake(3)); on('lawine', () => this.game.shake && this.game.shake(5)); on('corniceFall', () => this.game.shake && this.game.shake(6));
    on('area', () => { this.fx.prints.length = 0; this.fx.tracers.length = 0; });
  }
  /** a world for an area (built once; another area's world is disposed when we move on, Room 7's stays) */
  world(id) {
    if (this.worlds[id]) return this.worlds[id];
    for (const k in this.worlds) if (k !== 'room7' && k !== id && !(G && G.r7from && G.r7from.area === k && id === 'room7')) { this.worlds[k].w.dispose(); delete this.worlds[k]; }
    const A = S7.AREAS[id], W0 = A.world, o = Object.assign({}, W0);
    delete o.filter; o.filter = Object.assign({ bands: T.celBands, ink: T.ink }, W0.filter || {}, { bands: T.celBands, ink: (W0.filter && W0.filter.ink || 1) * T.ink });
    if (o.fog) o.fog = Object.assign({}, o.fog, { far: o.fog.far * T.fogFar });
    if (o.level) { o.level = Object.assign({}, o.level, { legend: Object.assign({}, o.level.legend) }); for (const k in o.level.legend) { const e = o.level.legend[k]; if (e && e.ground === 'red') o.level.legend[k] = Object.assign({}, e, { ground: 'plain', colors: { base: '#8a1420', dark: '#5a0a14', light: '#a82030' } }); } }
    const props = A.props || [];
    o.lights = props.filter(p => p[0] === 'light').length + 5;
    o.camera = Object.assign({ mode: 'fixed', near: 1 }, W0.camera || {}, { capture: false });
    o.onDraw = null;
    const w = new this.W3(this.game, o);
    const rec = { id, w, area: A, actors: {}, enemies: new Map(), lights: [], fxl: {}, people: [], shapes: [] };
    const fz = (x, y) => (A.world.terrain ? A.world.terrain.height(x, y) : (S7.loadArea(id).grid.floor(x, y)));
    for (const p of props) {
      if (p[0] === 'shape') { const [, sid, x, y, z, op] = p; try { rec.shapes.push(w.shape(sid, x * M, y * M, fz(x * M, y * M) + (z || 0) * M, Object.assign({ solid: false }, op || {}))); } catch (e) { this.game.fail('shape ' + sid, e); } }
      else if (p[0] === 'light') { const [, x, y, z, op] = p, h = w.light(op); h.x = x * M; h.y = y * M; h.z = fz(x * M, y * M) + z * M; rec.lights.push(h); }
    }
    for (const k of ['muzzle', 'boom', 'flare', 'flash']) rec.fxl[k] = w.light({ color: k === 'flare' ? '#ff5040' : k === 'boom' ? '#ff9a4a' : '#ffe8c0', reach: k === 'boom' ? 300 : 200, power: 0, on: false });
    for (const pe of A.people || []) {
      const [pid, x, y, z, face, mode, need] = pe, X = x * M, Y = y * M, Z = fz(X, Y) + (z || 0) * M;
      let a;
      if (mode === 'murmel') a = w.mob({ x: X, y: Y, z: Z, blob: new E.Blob({ R: 7, ears: 'cat', feet: true, mouth: true, face: 'front', colors: { dk: '#c8c4bc', base: '#f4f4f0', lt: '#ffffff', eye: '#1a1414' } }), fly: true, pose: false });
      else { const spec = S7.PEOPLE[pid] && S7.PEOPLE[pid].rig || NPC_LOOK[pid] || {}; a = w.mob({ x: X, y: Y, z: Z, rig: new E.Humanoid(Object.assign({ size: 1.3, build: 'heroic', weapon: null }, spec, { weapon: null })), fly: true, pose: false }); }
      a.setSolid(false); a.place(X, Y, Z); a.facing = face; if (mode === 'pim' || mode === 'pimseat') a.fade = .6;
      rec.people.push({ a, id: pid, mode, need, x: X, y: Y, z: Z, face, t: Math.random() * 3 });
    }
    w.prepare();
    this.worlds[id] = rec; return rec;
  }
  enterArea(id) { if (!this.ready) return; this.rec = this.world(id); this.rec.w.camera.set('fixed'); }
  /** the persona's actor in a world (one a persona, made when first needed) */
  heroActor(rec, id) {
    if (rec.actors[id]) return rec.actors[id];
    const P = S7.PERSONAS[id], rig = new E.Humanoid(Object.assign({ size: P.size || 1.3 }, P.rig));
    const a = rec.w.mob({ x: 0, y: 0, z: 0, rig, fly: true, pose: false }); a.setSolid(false); a.visible = false; rec.actors[id] = a; return a;
  }
  enemyActor(rec, e) {
    let a = rec.enemies.get(e.id); if (a) return a;
    const D = S7.ENEMIES[e.type], hat = D.hat === 'pillbox' ? { style: 'pillbox', color: '#f0f0f0', band: '#d8d8e8' } : e.id % 3 === 0 ? { style: 'beanie', color: '#ffffff', pom: TINTS[e.tint] } : null;
    const rig = new E.Humanoid({ size: 1.3 * e.size, build: e.type === 'bloom' || e.type === 'plow' ? 'bulky' : 'heroic', hunch: .2 + (e.id % 4) * .04, outfit: 'shirt', hair: 'bald', hat, weapon: null, colors: Object.assign({}, WHITE, { cloth: TINTS[e.tint], pants: TINTS[(e.tint + 2) % 5] }) });
    a = rec.w.mob({ x: e.x, y: e.y, z: e.z, rig, fly: true, pose: false }); a.setSolid(false); a.fade = 0; rec.enemies.set(e.id, a); a.data.e = e; return a;
  }
  title(on) { this.titleOn = on; if (on && this.ready) { this.rec = this.world('room7'); this.titleT = 0; } }
  step(dt) {
    if (!this.ready || !G) return;
    if (!this.rec || G.area !== this.rec.id) this.enterArea(G.area);
    const rec = this.rec;
    const w = this.rec.w, H = heroPos(), f = heroFacing(), wk = G.walker, e0 = curEdge();
    // the mouse in look mode: pointer lock while aiming
    const look = S7.game.settings.mouseMode === 'Look' && !S7.mouseFail;
    w.camera.capture = !!(G.aim.on && look); w.camera.mouseLook = true;
    if (!G.aim.on && typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
    S7.mouse.locked = !!w.camera.locked;
    if (w.camera.capture) { w.camera.takeMouse(this.mouse); if (!S7.mouse.wasLocked && S7.mouse.locked) this.mouse[0] = this.mouse[1] = 0; if (Math.abs(this.mouse[0]) < 240 && Math.abs(this.mouse[1]) < 240) { S7.mouse.dx += this.mouse[0]; S7.mouse.dy += this.mouse[1]; } }
    S7.mouse.wasLocked = S7.mouse.locked;
    // the personas: the active one walks the rail; the rest stay in the wardrobe; frozen ones stand as statues
    for (const id of ORDER) {
      const R0 = G.roster[id], act = id === G.persona && G.mode !== 'gameover', st = R0.frozen && R0.statue && R0.statue.area === G.area;
      if (!act && !st && !rec.actors[id]) continue;
      const a = this.heroActor(rec, id);
      if (act) {
        const ski = e0 && (e0.kind === 'ski' || e0.kind === 'jump'), v = wk.v * (wk.dir || 1), vx = ski ? 0 : Math.cos(H.angle) * wk.v, vy = ski ? 0 : Math.sin(H.angle) * wk.v;
        a.place(H.x, H.y, H.z); a.facing = f; a.visible = !(G.aim.on && G.aim.k > .5) && !CHEATS.freeCam || CHEATS.freeCam;
        const sw = G.mode === 'switch' ? clamp(G.switchT / .45, 0, 1) : 0; a.sink = sw > .5 ? (1 - (1 - sw) * 2) * 28 * 0 : 0; a.fade = G.mode === 'switch' ? Math.abs(sw * 2 - 1) : 1;
        let pose = ski ? 'crouch' : G.healing ? 'cast' : G.mode === 'frozen' ? null : null;
        if (G.mode === 'switch' && sw < .5) pose = 'hips';
        a.rig.update(dt, { x: H.x, y: H.y, z: H.z, vx, vy, facing: f, pose, lean: ski ? (wk.tucking ? .45 : .25) : 0, air: e0 && e0.kind === 'jump', point: G.aim.on, flip: 0 });
        if (G.mode === 'frozen') a.rig.update(0, { x: H.x, y: H.y, z: H.z, vx: 0, vy: 0, facing: f });
        void v;
      } else if (st) { a.place(R0.statue.at[0], R0.statue.at[1], R0.statue.at[2]); a.facing = R0.statue.face || 0; a.visible = true; a.fade = 1; }
      else a.visible = false;
    }
    // the Whiteouts: they fade in when revealed; footprints and breath give them away
    const alive = new Set();
    for (const e of G.enemies) {
      const a = this.enemyActor(rec, e); alive.add(e.id);
      const moving = Math.hypot(e.x - (a.data.px ?? e.x), e.y - (a.data.py ?? e.y)) / Math.max(dt, 1e-4); a.data.px = e.x; a.data.py = e.y;
      a.place(e.x, e.y, e.z); a.facing = e.facing;
      const show = e.alive ? e.vis : Math.max(0, 1 - e.dying / .6) * (e.vis > .3 || e.crit ? 1 : .6);
      a.fade = clamp(show, 0, 1); a.visible = a.fade > .03; a.sink = e.alive ? 0 : Math.min(28, e.dying / .6 * 28);
      a.flash = e.giggle >= 0 ? .1 : Math.max(0, a.flash - dt);
      const laughing = e.laughT > 0 && e.laughT < .5, pose = e.kneel > 0 ? 'kneel' : e.stun > 0 ? 'guard' : e.giggle >= 0 ? 'cheer' : laughing ? 'cheer' : e.ai === 'sled' ? 'crouch' : null;
      a.rig.update(dt, { x: e.x, y: e.y, z: e.z, vx: Math.cos(e.facing) * Math.min(moving, 90), vy: Math.sin(e.facing) * Math.min(moving, 90), facing: e.facing, pose, expr: 'smile', run: e.ai === 'runner' ? .6 : .3 });
      if (e.giggle >= 0) a.rig.kick && a.rig.kick(.15);
      // tells while unseen
      if (e.alive && e.vis < .5 && moving > 5) { a.data.stride = (a.data.stride || 0) + moving * dt; if (a.data.stride > 9) { a.data.stride = 0; a.data.foot = !a.data.foot; const sd = a.data.foot ? 3 : -3; this.fx.prints.push({ x: e.x + Math.cos(e.facing + Math.PI / 2) * sd, y: e.y + Math.sin(e.facing + Math.PI / 2) * sd, z: e.z, a: e.facing, t: 0, life: S7.AREAS[G.area].interior ? 2.5 : 8 }); if (this.fx.prints.length > 400) this.fx.prints.shift(); } }
      if (e.alive && e.vis < .5) { a.data.breath = (a.data.breath || e.id * .3 % 1.2) - dt; if (a.data.breath <= 0) { a.data.breath = 1.2; this.game.particles.smoke(e.x + Math.cos(e.facing) * 4, e.y + Math.sin(e.facing) * 4, e.z + 1.62 * e.size * M, 1, { color: '#ffffff', size: .6 }); } }
    }
    for (const [id, a] of rec.enemies) if (!alive.has(id)) { rec.w.remove(a); rec.enemies.delete(id); }
    // the boss's bodies
    this.bossActors(rec, dt);
    // people (NPCs): breathing, Pim's seat bobs, those that wait for a flag
    for (const p of rec.people) { p.t += dt; const vis = !p.need || flag(p.need); p.a.visible = vis && !(p.mode === 'pim' && flag('pim1done')); const z = p.z + (p.mode.startsWith('pim') ? Math.sin(p.t * 1.4) * 2 : 0); p.a.place(p.x, p.y, z); if (p.a.rig) p.a.rig.update(dt, { x: p.x, y: p.y, z, vx: 0, vy: 0, facing: p.face, pose: p.mode === 'sit' ? 'kneel' : p.mode === 'frozen' ? 'wave' : p.mode === 'lie' ? null : null, down: p.mode === 'lie' ? 1 : 0, expr: p.mode === 'frozen' ? 'shout' : undefined }); else if (p.a.blob) p.a.blob.update(dt, { squash: Math.sin(p.t * 2) * .05, look: [0, 1] }); }
    for (const t of this.fx.tracers) t.t -= dt; this.fx.tracers = this.fx.tracers.filter(t => t.t > 0);
    for (const p of this.fx.prints) p.t += dt; this.fx.prints = this.fx.prints.filter(p => p.t < p.life);
    // the presenter's own echo and ghost actors (Echo Run)
    this.echoActors(rec, dt);
    w.step(dt);
    S7.audioFrame && S7.audioFrame(dt);
  }
  bossActors(rec, dt) {
    const b = G.boss, B0 = rec.boss || (rec.boss = {});
    const need = (k, spec) => { if (!B0[k]) { const a = rec.w.mob({ x: 0, y: 0, z: 0, rig: new E.Humanoid(spec), fly: true, pose: false }); a.setSolid(false); a.visible = false; B0[k] = a; } return B0[k]; };
    for (const k in B0) B0[k].visible = false;
    if (G.area === '00C' && !flag('grauDead') && (b && b.id === 'grau' || !b)) {
      const a = need('grau', Object.assign({ size: 1.4 }, S7.PEOPLE.grau.rig)), p = b ? BOSSES.grau.pos(b) : [9 * M + 18, 9 * M, 6.5 * M], H = heroPos();
      a.place(p[0], p[1], p[2]); a.facing = Math.atan2(H.y - p[1], H.x - p[0]); a.visible = !(b && b.state === 'dying' && b.st > 1);
      a.rig.o.hat = b && b.hat > 0 ? null : { style: 'pillbox', color: '#a01818', band: '#e0b040' };
      a.rig.update(dt, { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, facing: a.facing, pose: b && b.state === 'throw' ? 'cast' : b && b.hat > 0 ? 'wave' : b && b.state === 'dying' ? 'die' : 'hips', expr: 'smile' });
      if (b && b.state === 'dying') a.sink = Math.min(30, b.st * 14);
    }
    if (G.area === '01B' && b && b.id === 'band') b.m.forEach((mu, i) => { const a = need('band' + i, Object.assign({ size: 1.3, build: 'heroic', weapon: null, hair: 'short', hat: { style: 'felt', color: '#3a5a2a', feather: '#e8e0c0' } }, BAND_LOOK[mu.name], { colors: Object.assign({}, WHITE, BAND_LOOK[mu.name].colors) })); a.place(mu.x, mu.y, mu.z); a.facing = Math.PI / 2; a.visible = mu.alive || mu.dying < .8; a.sink = mu.alive ? 0 : mu.dying * 30; const on = BOSSES.band.window(b, mu); a.rig.update(dt, { x: mu.x, y: mu.y, z: mu.z, vx: 0, vy: 0, facing: Math.PI / 2, pose: on ? 'cheer' : 'cast', expr: 'smile' }); if (on) a.rig.kick && a.rig.kick(.04); });
    if (G.area === '01F' && b && b.id === 'hansi' && b.phase >= 2) {
      const a = need('hansi', Object.assign({ size: 1.4 }, S7.PEOPLE.hansi.rig));
      if (b.phase === 2) { const p = BOSSES.hansi.hansiPos(b), e = W.rails.byId['sl0-sl1'], q = edgePos(W.rails, e, clamp(b.hs, 0, e.len)); a.place(p[0], p[1], p[2]); a.facing = q.angle; a.visible = true; a.rig.update(dt, { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, facing: q.angle, pose: 'crouch', lean: .3, flip: b.crash ? .6 : 0 }); }
      else { const H = heroPos(), f = heroFacing(), px0 = H.x + Math.cos(f + Math.PI / 2) * 14, py0 = H.y + Math.sin(f + Math.PI / 2) * 14; a.place(px0, py0, H.z - 4); a.facing = f + .4; a.visible = !(b.end === 'fell' && b.endT > 1.2); a.sink = b.end === 'fell' ? b.endT * 40 : 0; a.rig.update(dt, { x: px0, y: py0, z: H.z, vx: 0, vy: 0, facing: f + .4, pose: 'kneel', expr: b.end === 'shot' ? 'wince' : 'smile' }); }
    }
  }
  echoActors(rec, dt) {
    const E2 = rec.echo || (rec.echo = {});
    for (const k in E2) E2[k].visible = false;
    if (!S7.ECHO || !S7.ECHO.on || G.area !== '01C') return;
    const mk = (k, col) => { if (!E2[k]) { const a = rec.w.mob({ x: 0, y: 0, z: 0, rig: new E.Humanoid(Object.assign({ size: 1.3 }, S7.PERSONAS.dagny.rig, { colors: Object.assign({}, S7.PERSONAS.dagny.rig.colors, { cloth: col, pants: col, trim: '#ffffff' }) })), fly: true, pose: false }); a.setSolid(false); a.fade = .45; E2[k] = a; } return E2[k]; };
    const show = (k, col, p, name) => { const a = mk(k, col); a.place(p.x, p.y, p.z); a.facing = p.angle; a.visible = true; a.fade = .45; a.rig.update(dt, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.angle, pose: 'crouch', lean: .35 }); this.tags.push([p, name, col]); };
    this.tags = [];
    if (S7.ECHO.solo && S7.ECHO.best && S7.ECHO.started) { const p = S7.echoAt(S7.ECHO.best.rec, S7.ECHO.t); if (p) show('mine', '#a8d0ff', p, 'YOUR ECHO'); }
    if (S7.HUB) for (const id in S7.HUB.ghosts) { const g0 = S7.HUB.ghosts[id], e = W.rails.edges[g0.e]; if (!e) continue; const target = edgePos(W.rails, e, g0.s); const cur = g0.cur || (g0.cur = { x: target.x, y: target.y, z: target.z }); const k = Math.min(1, dt * 8); cur.x += (target.x - cur.x) * k; cur.y += (target.y - cur.y) * k; cur.z += (target.z - cur.z) * k; const pl = (S7.HUB.info.players || []).find(p => String(p.id) === String(id)); show('p' + id, ECHO_COLS[(+id) % 4], { x: cur.x, y: cur.y, z: cur.z, angle: target.angle }, pl ? pl.name : 'P' + (+id + 1)); }
  }
  project(p) { const w = this.rec && this.rec.w; if (!w) return undefined; return w.project(p[0], p[1], p[2]); }
  /** the frame: the pen's set pieces, lights, glows, the camera, the gun on the overlay, then the world */
  draw(r) {
    if (!this.ready || !G) return; if (!this.rec || G.area !== this.rec.id) this.enterArea(G.area);
    const rec = this.rec;
    const w = rec.w, pen = w.pen, t = G.time;
    pen.at();
    try { this.drawPens(rec, pen, t); } catch (e) { this.game.fail('pens', e); }
    // footprints (dark prints fading), tracers, projectiles, drops, statues' ice
    for (const p of this.fx.prints) { const k = 1 - p.t / p.life; pen.at(p.x, p.y, p.z + .3, p.a).box(0, 0, 0, 4, 2.2, .4, k > .5 ? '#7a8090' : '#a8b0c0'); }
    pen.at();
    for (const tr of this.fx.tracers) pen.tube(tr.a[0], tr.a[1], tr.a[2] - 2, tr.b[0], tr.b[1], tr.b[2], .25, '#fff0a0');
    for (const p of G.proj) { if (p.kind === 'suitcase') pen.at(p.p[0], p.p[1], p.p[2], t * 6).box(0, 0, 0, 10, 4, 7, '#7a1a1a').box(0, 0, 4, 3, 1, 2, '#d8b040'); else if (p.kind === 'medal') { pen.at(); pen.glow(p.p[0], p.p[1], p.p[2], 3, '#ffd040'); } else if (p.kind === 'shell' || p.kind === 'charge') { pen.at(); pen.ball(p.p[0], p.p[1], p.p[2], p.kind === 'charge' ? 3.5 : 2.5, 2, 2, '#c81e1e'); } else { pen.at(); pen.ball(p.p[0], p.p[1], p.p[2], p.r, p.r, p.r, p.kind === 'icecube' ? '#c8f0ff' : '#ffffff'); } }
    pen.at();
    for (const d of G.drops) w.glow(d.x, d.y, d.z, 1.4, d.rime ? '#80e0ff' : '#ff3040', { core: '#ffffff' });
    for (const s of statuesHere()) { const a = s.st.at; pen.at(a[0], a[1], a[2]); pen.box(0, 0, 14, 16, 16, 30, '#bfe8ff').ball(0, 0, 30, 10, 10, 8, '#d8f4ff'); }
    if (G.mode === 'frozen') { const H = heroPos(), k = clamp(G.modeT / 1.2, 0, 1); pen.at(H.x, H.y, H.z).box(0, 0, 14 * k, 16 * k, 16 * k, 30 * k, '#bfe8ff'); }
    // pickups still lying about: red snow, rime crystals, pins, documents
    for (const s of W.spots) if (s.kind === 'pickup' && !spotDone(s) && (!s.hidden || flag(s.hidden))) { const it = S7.ITEMS[s.item], bob = Math.sin(t * 2 + s.pos[0]) * 2; if (it.kind === 'red') { pen.at(s.pos[0], s.pos[1], s.pos[2]).ball(0, 0, 1, 7, 6, 1.5, '#c8101e'); } else if (it.kind === 'rime') { pen.at(s.pos[0], s.pos[1], s.pos[2] + 10 + bob, t).cone(0, 0, -5, 0, 0, 6, 3, '#80e0ff'); w.glow(s.pos[0], s.pos[1], s.pos[2] + 10 + bob, 1, '#80e0ff'); } else { pen.at(s.pos[0], s.pos[1], s.pos[2] + 12 + bob, t).box(0, 0, 0, 5, 1, 6, it.kind === 'pin' ? '#e0b040' : it.kind === 'key' ? '#d8b040' : '#f0e8d8'); w.glow(s.pos[0], s.pos[1], s.pos[2] + 12 + bob, .8, '#fff0c0'); } }
    // warm spots: revealed and within 30 m glow; the four nearest light the scene
    const eye = S7.eye(), glows = [];
    for (const e of G.enemies) if (e.alive && e.vis > .4) { if (e.spots) bloomSpots(e).forEach(s => { if (e.spots[s.i]) glows.push(s.pos); }); else if (!(e.ai === 'plow' && !(e.back > 0))) glows.push(warmPos(e)); }
    for (const bt of S7.bossTargets()) if (bt.kind === 'warm' && bt.window) glows.push(bt.pos);
    glows.filter(p => V.dist(p, eye) < 34 * M).sort((a, b) => V.dist(a, eye) - V.dist(b, eye)).forEach((p, i) => w.glow(p[0], p[1], p[2], 2.2, '#ff6a1e', { core: '#ffe0a0', light: i < 4 }));
    // the scan ring, the flare, Echo's rings
    if (G.scan) { const s = G.scan; w.arc(s.at[0], s.at[1], W.grid.floor(s.at[0], s.at[1]) + 1, Math.max(0, s.r - 10), s.r, 0, TAU, '#80e0ff', .55); }
    const FX = rec.fxl;
    if (G.flare) { const f = G.flare.at; w.glow(f[0], f[1], f[2], 3, '#ff4030', { core: '#ffe0c0' }); Object.assign(FX.flare, { x: f[0], y: f[1], z: f[2], on: true, power: 30 }); } else FX.flare.on = false;
    if (this.fx.echo > 0) { this.fx.echo -= 1 / 60; const H = heroPos(), k = 1 - this.fx.echo / 1.2; for (let i = 0; i < 3; i++) w.arc(H.x, H.y, H.z + 1, k * 25 * M * (1 - i * .2), k * 25 * M * (1 - i * .2) + 8, 0, TAU, '#e0f0ff', .4 * (1 - k)); }
    const wp = wstate(G.persona); Object.assign(FX.muzzle, { x: eye[0] + Math.cos(G.aim.yaw) * 20, y: eye[1] + Math.sin(G.aim.yaw) * 20, z: eye[2], on: G.aim.on && wp.flash > .6, power: 14 * wp.flash });
    // the echoes' name tags (drawn as text on the HUD, never as HTML)
    if (this.tags && this.tags.length) r.overlay(g => { for (const [p, name, col] of this.tags) { const q = w.project(p.x, p.y, p.z + 36); if (q) { txt(g, name, q[0] - tw(name) / 2, q[1] - 10, col); } } });
    // snow
    this.snow(rec, pen, t);
    // the camera
    if (CHEATS.freeCam) { if (w.camera.mode !== 'fly') w.camera.set('fly'); }
    else { if (w.camera.mode !== 'fixed') w.camera.set('fixed'); const c = G.cam || S7.director.pose; w.camera.fixed = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: c.roll || 0, fov: c.fov || 55 }; }
    // first person: the persona's weapon on the overlay
    // (the gun is drawn in the world, in the eye's frame, so the cel filter and ink take it as they take everything:
    //  the engine's overlay pass does not compose with the filter's post-processing)
    if (w.overlay) w.overlay.on = false;
    if (G.aim.on && G.aim.k > .85 && !G.aim.scope && !CHEATS.freeCam) { const c = G.cam; drawWeapon(pen, G.persona, wp, t, this, c); pen.at(); }
    if (CHEATS.showRails) this.debugRails(pen);
    w.draw(r);
  }
  snow(rec, pen, t) {
    const A = rec.area, amt = A.snow || (rec.id === 'room7' ? 0 : 0); if (!amt || S7.reduceMotion() && false) return;
    const c = G.cam || S7.director.pose, n = Math.round(420 * amt), wind = (A.wind || .3) * 40, S = 30 * M;
    if (!this.flakes || this.flakes.length !== n) { const rnd = E.rng(77); this.flakes = Array.from({ length: n }, () => [rnd() * S, rnd() * S, rnd() * S * .6, .6 + rnd() * .8]); }
    pen.at();
    for (const f of this.flakes) { const x = c.x - S / 2 + ((f[0] + t * wind) % S + S) % S, y = c.y - S / 2 + ((f[1] + t * wind * .3) % S + S) % S, z = c.z - S * .3 + ((f[2] - t * 30 * f[3]) % (S * .6) + S * .6) % (S * .6); pen.glow(x, y, z, .55 * f[3], '#ffffff'); }
  }
  debugRails(pen) {
    pen.at();
    for (const e of W.rails.edges) { const P = e.path.pts; for (let i = 0; i < P.length - 1; i++) { const a = edgePos(W.rails, e, 0), b = a; void b; } for (let s = 0; s < e.len; s += 24) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 24)); pen.tube(p.x, p.y, p.z + 2, q.x, q.y, q.z + 2, .6, e.kind === 'ski' ? '#40a0ff' : '#ff40ff'); } }
    for (const id in W.rails.nodes) { const n = W.rails.nodes[id]; pen.ball(n.x, n.y, n.z + 4, 3, 3, 3, '#ffff40'); }
  }
  drawTitle(r) {
    if (!this.ready) return;
    const rec = this.world('room7'); this.rec = rec; const w = rec.w; this.titleT = (this.titleT || 0) + 1 / 60;
    const t = this.titleT, u = (Math.sin(t * .07) + 1) / 2;
    w.camera.set('fixed'); w.camera.fixed = { x: (9.5 - u * 3) * M, y: (8.2 - u * 1.5) * M, z: (2.6 + u * .6) * M, yaw: Math.atan2((1.4 - 8.2) + u * 2, (6.4 - 9.5) + u * 2), pitch: -.18, roll: 0, fov: 52 };
    const pen = w.pen; pen.at();
    for (const p of rec.people) { p.t += 1 / 60; if (p.a.rig) p.a.rig.update(1 / 60, { x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, facing: p.face, pose: p.mode === 'sit' ? 'kneel' : null, down: p.mode === 'lie' ? 1 : 0 }); }
    if (G) { try { this.drawPens(rec, pen, t); } catch (e) { this.game.fail('pens', e); } } else this.drawRoom7(pen, t, rec);
    if (w.overlay) w.overlay.on = false;
    w.step(1 / 60);
    w.draw(r);
  }
  drawRoom7(pen, t) { PENS.window7(pen, 6.5, .9, 0, {}, t); PENS.featherbed(pen, 2.2, 2.6, 0, {}, t); PENS.lamp7(pen, 6, 5, 3.4, {}, t); PENS.phone7(pen, 10.4, 4.8, 0, {}, t); }
  drawPens(rec, pen, t) {
    const A = rec.area, fz = (x, y) => A.world.terrain ? A.world.terrain.height(x * M, y * M) : S7.loadArea(rec.id).grid.floor(x * M, y * M);
    for (const p of A.props || []) if (p[0] === 'pen') { const f = PENS[p[1]]; if (f) { pen.at(); f(pen, p[2], p[3], (p[4] || 0) + fz(p[2], p[3]) / M, p[5] || {}, t, rec); } }
    pen.at();
  }
}
S7.Presenter3D = Presenter3D;

/* ---- the first-person weapons (the overlay pen: x ahead of the eye, y right, z up; engine units) ---- */
function drawWeapon(op, id, w, t, P0, base) {
  const W0 = S7.WEAPONS[S7.PERSONAS[id].weapon], kick = w.flash, rel = w.reloadT > 0 ? Math.sin(clamp(1 - w.reloadT / (W0.perShell ? W0.reload * W0.mag : W0.reload), 0, 1) * Math.PI) : w.overT > 0 ? .6 : 0;
  const bob = Math.sin(t * 2.2) * .15, x0 = -kick * 1.6, z0 = -rel * 4 + bob + kick * .5, glove = { ansel: '#2a2a2a', dagny: '#101014', ignaz: '#5a3a2a', rurik: '#3a2a20', kasimir: '#e8c8a8', mireille: '#1a1a1a', brigid: '#c81e1e' }[id];
  op.at(base.x, base.y, base.z, base.yaw, 1, base.pitch - rel * .5, 0);
  if (id === 'ansel') { op.box(8 + x0, 3.4, -4.6 + z0, 3, 1.3, 1.8, '#3a3a40').tube(9 + x0, 3.4, -4 + z0, 14 + x0, 3.4, -4 + z0, .5, '#4a4a52').tube(7.6 + x0, 3.4, -4.3 + z0, 9.2 + x0, 3.4, -4.3 + z0, 1, '#5a5a62').box(6.4 + x0, 3.4, -6 + z0, 1.6, 1.1, 2.4, '#5a3a20').ball(6.2 + x0, 3.4, -6 + z0, 1.4, 1.2, 1.2, glove); if (rel) op.ball(8.4, 2.2, -4.2 + z0, 1, .6, 1, '#8a8a92'); }
  else if (id === 'dagny') { const a = w.alt ? 1 : 0; for (const sd of [-1, 1]) { const k = (sd > 0) === !!a ? x0 : 0; op.tube(5 + k, sd * 4.2, -6 + z0, 17 + k, sd * 3.2, -2.4 + z0, .35, '#c8ccd4').box(5.4 + k, sd * 4.2, -6 + z0, 1.6, 1.2, 2.4, '#1e5cff').ball(5 + k, sd * 4.2, -6.3 + z0, 1.3, 1.1, 1.1, glove); if (w.flash > .5 && (sd > 0) === !!a) op.glow(17.4, sd * 3.2, -2.4 + z0, 1.4, '#ffd080'); } }
  else if (id === 'ignaz') { op.tube(2 + x0, 3, -6 + z0, 7 + x0, 3, -4.6 + z0, 1, '#6a4a2a').tube(7 + x0, 3, -4.4 + z0, 18 + x0, 2.6, -3.4 + z0, .45, '#2a2a30').tube(8 + x0, 2.9, -3.2 + z0, 12 + x0, 2.8, -2.9 + z0, .7, '#1a1a1e').box(9 + x0, 3, -4.9 + z0, 4, 1.2, 1, '#6a4a2a').ball(5.6 + x0, 3, -5.6 + z0, 1.3, 1.1, 1.1, glove).ball(11 + x0, 2.4, -5 + z0, 1.2, 1, 1, glove); }
  else if (id === 'rurik') { const pump = w.reloadT > 0 ? Math.sin(t * 14) * 1.5 : kick * 1.4; op.tube(4 + x0, 3.2, -6 + z0, 16 + x0, 3, -3.6 + z0, .7, '#d8b040').tube(6 + x0, 3.2, -6.6 + z0, 15 + x0, 3, -4.7 + z0, .55, '#c8a030').box(10 - pump + x0, 3.1, -5 + z0, 4, 1.6, 1.4, '#6a4a2a').ball(5.4 + x0, 3.2, -6.5 + z0, 1.6, 1.4, 1.4, glove).ball(10 - pump + x0, 2.4, -5.6 + z0, 1.5, 1.2, 1.2, glove); }
  else if (id === 'kasimir') { const heat = 1 - w.mag / W0.mag; op.cone(3 + x0, 1.5, -5 + z0, 24 + x0, .2, -3.2 + z0, 1, '#8a5a2a').ball(24 + x0, .2, -3.2 + z0, 1, 2.6, 2.6, '#a06a32').ball(4 + x0, 2.6, -5.6 + z0, 1.3, 1.1, 1.1, glove); if (heat > .5) P0.game.particles.smoke && false; }
  else if (id === 'mireille') { op.box(8 + x0, 3, -4.2 + z0, 3.4, 1, 1.2, '#2a2a30').box(6.8 + x0, 3, -5.4 + z0, 1.2, .9, 2, '#3a3a40').ball(6.6 + x0, 3, -5.6 + z0, 1.2, 1, 1, glove); if (S7.G.cd.flash > 1.6) op.glow(9, -4, -3, 3, '#ffffff'); op.box(7, -4.6, -6 + z0 * .5, 3, 3, 2.4, '#3a3028').glow(8.5, -4.6, -5.4 + z0 * .5, .6, '#e0e0ff'); }
  else if (id === 'brigid') { op.tube(3 + x0, 3.6, -6 + z0, 16 + x0, 3.2, -3.4 + z0, 1.5, '#5a6068').tube(5 + x0, 4.8, -7 + z0, 9 + x0, 4.8, -6.4 + z0, .9, '#c8c8d0').box(7 + x0, 3.6, -7.2 + z0, 2, 1.4, 2.4, '#3a3a40').ball(6.6 + x0, 3.6, -7.4 + z0, 1.5, 1.3, 1.3, glove).ball(12 + x0, 2.4, -5.4 + z0, 1.4, 1.2, 1.2, glove); }
  if (w.flash > .5 && id !== 'dagny' && id !== 'kasimir') op.glow(id === 'ignaz' ? 18.5 + x0 : 15 + x0, 3, id === 'brigid' ? -3.4 : -3.8, 1.8, '#fff0a0');
}

/* ---- the set pieces drawn with the pen each frame (x, y in tiles; z in metres above the ground) ---- */
const PENS = {
  window7(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.box(0, 0, 40, 34, 2, 46, '#2a1e1c').box(0, -1.4, 40, 30, .6, 42, '#0a1430'); for (let i = 0; i < 14; i++) { const s = (i * 37) % 30 - 15, h = ((i * 53 + t * 16) % 42); pen.glow(s, -.4, 61 - h, .5, '#ffffff'); } pen.box(0, 1, 40, 2, 1, 46, '#2a1e1c').box(0, 1, 40, 34, 1, 2, '#2a1e1c'); if (flag('fohnHere') && G && G.flags.epilogue) pen.glow(0, 2, 30, 6, '#ffb060'); },
  featherbed(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); const heave = G && G.flags.featherShake ? Math.sin(t * 9) * 2 : Math.sin(t * .8) * .6; for (let i = 0; i < 9; i++) pen.ball(((i % 3) - 1) * 6, (Math.floor(i / 3) - 1) * 9 + 4, 14 + heave * ((i % 2) ? 1 : -.5), 6, 7, 3.5, '#f4f2ee'); pen.ball(0, -12, 13, 6, 4, 3, '#ffffff'); },
  phone7(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 13.5, 0, 0, 20, .6, '#1a1a1a').cone(0, 0, 13.5, 0, 0, 15, 2.4, '#1a1a1a').tube(-1.5, 0, 20, 1.5, 0, 21.5, .8, '#1a1a1a'); },
  lamp7(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 10, .3, '#2a2a2a').cone(0, 0, -2, 0, 0, 2, 6, '#5a3a1a'); pen.glow(0, 0, -2.5, 2 + Math.sin(t * 3) * .1, '#ffd890'); },
  chandelier(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 30, .4, '#d8b040'); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, cx = Math.cos(a) * 14, cy = Math.sin(a) * 14; pen.tube(0, 0, 2, cx, cy, -1, .35, '#d8b040').glow(cx, cy, 1, 1.2 + Math.sin(t * 7 + i) * .1, '#ffe0a0'); } pen.ball(0, 0, 0, 6, 6, 4, '#e8d8a0'); },
  balustrade(pen, x, y, z, o) { pen.at(); const y0 = y * M; for (let xx = x; xx <= o.x1; xx += .8) pen.tube(xx * M, y0, z * M, xx * M, y0, z * M + 14, .5, '#d8c8a8'); pen.bar(x * M, y0, z * M + 15, o.x1 * M, y0, z * M + 15, 2, 1.4, '#6a3a20'); },
  'elevator-car'(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.box(0, 0, 0, 20, 22, 1, '#3a2a1a').box(8, 0, 22, 2, 22, 44, '#5a4a2a'); pen.glow(0, 0, 42, 2, flag('pim1done') ? '#806040' : '#c0ffd0'); if (!flag('pim1done')) { pen.box(0, 0, 10 + Math.sin(t * 1.4) * 2, 10, 8, 1.2, '#4a3a2a').tube(-4, 0, 10, -4, 0, 60, .3, '#3a3a3a'); } },
  'service-bell'(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); const sw = flag('bellRung') ? Math.sin(t * 3) * .2 * Math.max(0, 1 - (G.time - (G.bellT || G.time)) / 4) : 0; pen.at(x * M, y * M, z * M, sw).tube(0, 0, 18, 0, 0, 60, .8, '#3a3a3a').cone(0, 0, -14, 0, 0, 14, 20, '#d8b040').ball(0, 0, -15, 4, 4, 4, '#a08020'); },
  lightwell(pen, x, y, z, o) { pen.at(); for (let k = 0; k < 6; k++) { const yy = (y + k * 4) * M; pen.box((x + o.x1) / 2 * M, yy, -40, (o.x1 - x) * M, 2, 4, '#2a3a2a'); } },
  'broken-floor'(pen, x, y, z, o) { pen.at(); for (let i = 0; i < 6; i++) pen.box((x + (i * 7 % 3)) * M, (y + i * .6) * M, -3 - i * 2, 10, 6, 2, '#5a4a3a'); },
  shaft(pen, x, y, z, o, t) {
    pen.at(x * M, y * M, 0); const b = G && G.boss && G.boss.id === 'grau' ? G.boss : null, cz = b ? b.carZ : 6.5 * M;
    for (const sd of [-1, 1]) pen.tube(sd * 20, 0, 0, sd * 20, 0, 300, 1, '#3a3a3a');
    if (!b || b.phase === 1) pen.tube(0, 0, cz + 50, 0, 0, 340, .8, '#5a5a5a');
    pen.box(0, 0, cz - 2, 44, 44, 4, '#4a3a2a').box(0, 0, cz + 46, 44, 44, 3, '#3a2a1a'); for (const [dx, dy] of [[-21, -21], [21, -21], [-21, 21], [21, 21]]) pen.tube(dx, dy, cz, dx, dy, cz + 46, 1, '#d8b040');
    for (const fz of [3, 6.5, 10]) pen.box(0, -30, fz * M - 2, 60, 6, 3, '#2a1a1a');
    pen.glow(0, 0, cz + 50, 2.5 + Math.sin(t * 6) * .5, '#ff2020');
    if (b && b.phase === 3) { pen.tube(10, 0, cz + 49, 10, 0, cz + 60, .6, '#3a3a3a').cone(10, 0, cz + 56, 10, 0, cz + 62, 4, '#d8b040'); }
  },
  'string-lights'(pen, x, y, z, o, t) { pen.at(); for (let xx = x; xx < o.x1; xx += 1.2) { const sag = Math.sin((xx - x) / (o.x1 - x) * Math.PI) * 10; pen.glow(xx * M, y * M, z * M - sag, .9, ['#ffd040', '#ff5040', '#80e0ff', '#ffffff'][Math.floor(xx * 3) % 4]); } },
  'church-bell'(pen, x, y, z, o, t) { const sw = flag('liftClear') ? Math.sin(t * 3) * .25 : 0; pen.at(x * M, y * M, z * M, 0, 1, sw).cone(0, 0, -10, 0, 0, 10, 14, '#c8a040').ball(0, 0, -11, 3, 3, 3, '#8a6a20').box(0, 0, 14, 30, 4, 3, '#4a3020'); },
  'roof-drift'(pen, x, y, z, o, t) { if (flag('liftClear')) return; pen.at(x * M, y * M, z * M); for (let i = 0; i < 6; i++) pen.ball(-30 + i * 12, 0, 10 + (i % 2) * 6, 14, 18, 10, '#f4f8ff'); },
  'tbar-pylon'(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 120, 3, '#5a5a62').bar(-30, 0, 120, 30, 0, 120, 6, 4, '#4a4a52'); },
  'mirror-wall'(pen, x, y, z, o, t) { const open = S7.gateOpen && G && G.gates['01B:mirrors'], k = open ? Math.min(1, (G.time - (G.mirrorT || (G.mirrorT = G.time))) / 1.5) : 0; for (const sd of [-1, 1]) { pen.at(x * M, (y + sd * 1.5) * M, 0, sd * k * 1.4); pen.box(0, -sd * 12, 48, 4, 24, 96, '#d8dce8').box(1.8, -sd * 12, 48, .6, 20, 88, '#a8b8d8'); } },
  mirrors(pen, x, y, z, o) { pen.at(); for (let xx = x + 1; xx < o.x1; xx += 3) { pen.box(xx * M, y * M + 2, 40, 30, 2, 60, '#c8d0e8'); pen.box(xx * M, (y + 6) * M - 2, 40, 30, 2, 60, '#c8d0e8'); } },
  stage(pen, x, y, z, o, t) { pen.at(); pen.box((x + o.x1) / 2 * M, (y + .5) * M, 15, (o.x1 - x) * M, 24, 2, '#6a1a1a'); const b = G && G.boss && G.boss.id === 'band' ? G.boss : null; if (b) b.m.forEach(mu => { if (!mu.alive) return; const on = BOSSES.band.window(b, mu); pen.at(mu.x, mu.y + 6, mu.z); if (mu.name === 'tuba') pen.cone(4, 0, 10, 8, -2, 34, 7, '#d8b040').ball(4, 0, 12, 6, 5, 7, '#c8a030'); else if (mu.name === 'accordion') { const st = on ? 1.5 : 1; pen.box(-3, 0, 20, 4, 6, 8, '#8a1a2a').box(0, 0, 20, 3 * st, 6, 8, '#f0e0c0').box(3 * st, 0, 20, 4, 6, 8, '#8a1a2a'); } else if (mu.name === 'trumpet') pen.cone(2, 0, 26, 12, 0, 27, 2.6, '#d8b040'); else pen.tube(0, 3, 12, 0, 3, 18, 6, '#e8e8f0'); }); },
  dancefloor(pen, x, y, z, o, t) { pen.at(); const b = G && G.boss && G.boss.id === 'band' ? G.boss : null, beat = b ? Math.floor(b.step / 4) : Math.floor(t * 2); for (let i = 0; i < 25; i++) { const cx = x + (i % 5) * 2 + 1, cy = y + Math.floor(i / 5) * 2 + 1, on = (i + beat) % 3 === 0; pen.box(cx * M, cy * M, .3, 30, 30, .5, on ? '#4a1a3a' : '#1a1418'); } },
  'piste-poles'(pen, x, y, z, o, t, rec) { pen.at(); for (const e of W.rails.edges) if (e.kind === 'ski' && W.area.id === rec.id) for (let s = 0; s < e.len; s += 240) { const p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2; for (const sd of [-1, 1]) { const px0 = p.x + Math.cos(a) * sd * 7 * M, py0 = p.y + Math.sin(a) * sd * 7 * M, pz = W.grid.floor(px0, py0); pen.tube(px0, py0, pz, px0, py0, pz + 22, .8, '#ff7a1e'); } } },
  'patrol-rope'(pen, x, y, z, o, t) { if (G && G.gates['01C:rope']) return; pen.at(x * M, y * M, z * M); for (const sd of [-1, 1]) pen.tube(0, sd * 40, 0, 0, sd * 40, 18, 1, '#ff7a1e'); for (let i = -6; i <= 6; i++) pen.box(0, i * 6, 14 + Math.abs(i) * .2, 1, 4, 4, i % 2 ? '#ff7a1e' : '#141414'); },
  cornice(pen, x, y, z, o, t) { if (G && G.flags.cornice) { pen.at(x * M, y * M, z * M).box(70, 0, -2, 130, 40, 8, '#e8f0f8'); return; } pen.at(x * M, y * M, z * M); for (let i = 0; i < 5; i++) pen.ball(20 + i * 18, 0, 6 + (i % 2) * 4, 18, 26, 10, '#f4f8ff'); },
  floodlights(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; for (const [m, n] of [[150, 380], [90, 600], [130, 250], [60, 450]]) { const X = m * M, Y = n * M, Z = W.grid.floor(X, Y); pen.tube(X, Y, Z, X, Y, Z + 220, 2, '#3a3a40').box(X, Y, Z + 222, 30, 6, 10, '#2a2a30'); pen.glow(X, Y + 4, Z + 220, 4, '#fff6d8'); } },
  'tbar-line'(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['tbB-tbT']; if (!e) return; for (let s = 0; s < e.len; s += 160) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 160)); pen.tube(p.x + 20, p.y, p.z + 60, q.x + 20, q.y, q.z + 60, .4, '#2a2a2a'); if (s % 800 < 160) pen.tube(p.x + 20, p.y, p.z, p.x + 20, p.y, p.z + 64, 2, '#5a5a62'); } },
  kicker(pen, x, y, z) { pen.at(x * M, y * M, z * M); pen.box(0, 30, 6, 40, 30, 12, '#f0f4f8').box(0, 44, 12, 40, 4, 4, '#ff7a1e'); },
  gondola(pen, x, y, z, o, t, rec) {
    pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['gs-gl'];
    for (const dy of [0, 12 * M]) for (let s = 0; s < e.len; s += 200) { const p = edgePos(W.rails, e, s), q = edgePos(W.rails, e, Math.min(e.len, s + 200)); pen.tube(p.x, p.y + dy, p.z + 34, q.x, q.y + dy, q.z + 34, .6, '#1a1a1e'); }
    const cabin = (X, Y, Z, yaw, lit) => { pen.at(X, Y, Z, yaw); pen.box(0, 0, -1, 40, 30, 2, '#3a4a5a').box(0, 0, 32, 42, 32, 3, '#c8302a'); for (const [dx, dy] of [[-19, -14], [19, -14], [-19, 14], [19, 14]]) pen.tube(dx, dy, 0, dx, dy, 32, .9, '#d8d8e0'); pen.tube(0, 0, 33, 0, 0, 36, .8, '#2a2a2a'); pen.box(0, 15, 6, 36, 1, 10, '#5a6a7a').box(0, -15, 6, 36, 1, 10, '#5a6a7a'); if (lit) pen.glow(0, 0, 29, 1.2, flag('powerCut') && !flag('ins3') ? '#402010' : '#ffe0a0'); };
    if (curEdge() && curEdge().id === 'gs-gl') { const H = heroPos(), sw = flag('powerCut') && !flag('ins3') ? Math.sin(t * 1.3) * .08 : 0; cabin(H.x, H.y, H.z - 2, H.angle + sw, true); }
    for (const en of G.enemies) if (en.cabin && en.alive) cabin(en.x, en.y, en.z - 6, Math.PI, false);
  },
  pylons(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; for (const m of [300, 600]) { const X = m * M, Y = 300 * M + 6 * M, Zg = W.grid.floor(X, Y), Zc = S7.CABLE(m) * M; pen.tube(X, Y, Zg, X, Y, Zc + 40, 4, '#5a5a62').bar(X, Y - 10 * M, Zc + 36, X, Y + 10 * M, Zc + 36, 6, 4, '#4a4a52'); } for (const tg of W.targets || []) { const hit = flag('hit:' + key(tg.id)); pen.at(); pen.ball(tg.pos[0], tg.pos[1], tg.pos[2], 6, 6, 9, hit ? '#3a3a40' : '#bfe8ff'); if (!hit && flag('powerCut')) w0glow(rec, tg.pos, '#80e0ff'); } },
  'ice-walls'(pen, x, y, z, o, t, rec) { pen.at(); const G2 = S7.loadArea(rec.id).grid; for (let cy = 0; cy < G2.h; cy += 3) for (let cx = 0; cx < G2.w; cx += 3) if (!G2.walkable(cx, cy) && G2.walkable(cx + 1, cy) || false) pen.glow(cx * M + 14, cy * M + 8, 30 + ((cx * cy) % 5) * 8, 1.4, '#40d0ff'); },
  crystals(pen, x, y, z, o, t) { if (G && G.gates[G.area + ':' + o.gate]) return; pen.at(x * M, y * M, z * M); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = 6 + (i % 3) * 4; pen.cone(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, 30 + (i % 3) * 14, 5, '#80e8ff'); } pen.glow(0, 0, 20, 3 + Math.sin(t * 5) * .5, '#a0f0ff'); },
  seracs(pen, x, y, z, o, t) { if (G && G.flags.seracs) { pen.at(x * M, y * M, z * M); for (let i = 0; i < 6; i++) pen.box(i * 6 - 15, (i % 2) * 8 - 4, 3, 10, 8, 6, '#bfe8ff'); return; } pen.at(x * M, y * M, z * M); for (let i = 0; i < 4; i++) pen.box(i * 8 - 12, (i % 2) * 6 - 3, 30, 10, 10, 60 + i * 6, '#bfe8ff'); },
  ledger(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 16, 1.5, '#3a2a1a').box(0, 0, 17, 14, 10, 2, flag('ledger') ? '#e8e0c0' : '#1a2a3a').box(0, 0, 18.5, 15, 11, 1, '#a8e0f0'); },
  icedoor(pen, x, y, z, o, t) { if (G && G.gates[G.area + ':' + o.gate]) return; pen.at(x * M, y * M, z * M); pen.box(0, 0, 22, 24, 6, 44, '#a8e0f8'); pen.glow(0, 4, 24, 2, '#c0f0ff'); },
  pavilion(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; pen.tube(Math.cos(a) * 80, Math.sin(a) * 80, 0, Math.cos(a) * 80, Math.sin(a) * 80, 70, 2, '#d8e0f0'); } pen.cone(0, 0, 70, 0, 0, 110, 90, '#a8c8e0'); pen.box(0, 0, 12, 60, 24, 3, '#3a2a1a'); },
  avalaugh(pen, x, y, z, o, t) {
    const b = G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 1 ? G.boss : null; if (!b && !(G && G.flags.hansiIntroDone === false)) { if (!(G && G.flags.avalaughDown)) { if (!(G && G.boss)) return; } else { pen.at(x * M, y * M, z * M); for (let i = 0; i < 8; i++) pen.ball(Math.cos(i) * 40, Math.sin(i * 1.7) * 40, 8, 26, 22, 10, '#f0f4f8'); return; } }
    if (!b) return; const left = b.spots.filter(Boolean).length, melt = 1 - left / 5 * .3, bob = Math.sin(t * 2) * 3;
    pen.at(x * M, y * M, z * M); pen.ball(0, 0, 3.5 * M, 4 * M, 4 * M, 3.6 * M * melt, '#f4f8ff').ball(0, 0, 8 * M + bob, 3 * M, 3 * M, 2.8 * M, '#ffffff').ball(0, 0, 11.5 * M + bob, 2 * M, 2 * M, 2 * M, '#ffffff');
    pen.box(0, 1.85 * M, 11 * M + bob, 1.4 * M, .3 * M, .25 * M, '#141414');
    for (const sd of [-1, 1]) pen.tube(sd * 2.8 * M, 0, 8.4 * M + bob, sd * 6.5 * M, 0, (10 + Math.sin(t * 1.5 + sd) * 1.5) * M, 1.2 * M * .5, '#4a3020');
    b.spots.forEach((on, i) => { const p = BOSSES.hansi.spotPos(i); if (on) { pen.at(); if (i < 3) pen.ball(p[0], p[1] - 4, p[2], 7, 3, 7, '#e0b040'); else pen.ball(p[0], p[1] - 3, p[2], 6, 3, 6, '#141414'); } });
    if (b.thaw) { const k = 1 - b.thaw.t / 40; pen.at(); for (let a = 0; a < TAU; a += .5) pen.glow(x * M + Math.cos(a) * k * 24 * M, y * M + Math.sin(a) * k * 24 * M, z * M + 2, 2, '#80d0ff'); }
  },
  'slalom-gates'(pen, x, y, z, o, t, rec) { pen.at(); if (W.area.id !== rec.id) return; const e = W.rails.byId['sl0-sl1'], b = G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 2 ? G.boss : null; if (!e) return; S7.SLALOM_GATES.forEach((g, i) => { const s = g * e.len, p = edgePos(W.rails, e, s), a = p.angle + Math.PI / 2, off = 20 * M, gx = p.x + Math.cos(a) * off, gy = p.y + Math.sin(a) * off, gz = W.grid.floor(gx, gy), hot = b && Math.abs(b.hs - s) < 84; for (const sd of [-1, 1]) pen.tube(gx + Math.cos(a) * sd * 50, gy + Math.sin(a) * sd * 50, gz, gx + Math.cos(a) * sd * 50, gy + Math.sin(a) * sd * 50, gz + 30, 1, hot ? '#ff2020' : i % 2 ? '#2a5ac8' : '#c8302a'); }); },
  chairlift(pen, x, y, z, o, t) { pen.at(x * M, y * M, z * M); pen.tube(0, 0, 0, 0, 0, 260, 3, '#4a4a52').box(0, 0, 120, 60, 40, 60, '#3a3a40'); if (G && G.boss && G.boss.id === 'hansi' && G.boss.phase === 3) { const H = heroPos(); pen.at(H.x, H.y, H.z); pen.box(6, 0, -6, 40, 20, 3, '#5a3a20').tube(-10, 0, -6, -10, 0, 120, .8, '#2a2a2a').tube(10, 0, -6, 10, 0, 120, .8, '#2a2a2a'); } }
};
S7.PENS = PENS;
function w0glow(rec, p, c) { rec.w.glow(p[0], p[1], p[2], 1.6, c, { core: '#ffffff' }); }

/* ==== src/95-scenes.js ==== */
/* SKILLER7 — the scenes: title (the menu, attract after 10 s idle, the touch-only notice), play (modals freeze the sim;
 * intents from the devices or the bot; the time scale for the ring, slow motion and the slalom), attract, credits, hub. */
S7.startNewGame = diffName => {
  S7.newGame({ seed: 7, difficulty: diffName || 'Piste' });
  if (S7.game.settings && S7.game.settings.difficulty !== G.difficulty) S7.game.settings.set('difficulty', G.difficulty);
  S7.enterArea('room7', 'door', { noAutosave: true });
  S7.runBeat('cold_open');
  S7.toPlay();
};
S7.toPlay = () => { UI.closeAll(); S7.game.go('play', null, { fade: 'white', seconds: .5 }); };
S7.continueGame = () => {
  const sv = S7.game.saves, l = sv && sv.latest();
  if (l && sv.load(l.slot)) return;
  S7.game.go('title');
};
const titleMenuItems = () => {
  const sv = S7.game.saves, any = !!(sv && sv.latest && sv.latest());
  return [
    { label: 'NEW GAME', onPick: () => UI.open('difficulty') },
    { label: 'CONTINUE', disabled: !any, onPick: () => S7.continueGame() },
    { label: 'LOAD', disabled: !any, onPick: () => sv.show('load', () => {}) },
    { label: 'ECHO RUN', onPick: () => S7.startEchoSolo() },
    { label: 'SETTINGS', onPick: () => S7.game.menu('settings') },
    { label: 'ABOUT & CREDITS', onPick: () => UI.open('about') }
  ];
};
S7.makeScenes = game => {
  const scenes = {};
  let titleList = null, touchNotice = false;
  scenes.title = {
    touch: [], camera: false,
    enter() { UI.closeAll(); game.paused = false; game.input.touchEnabled = false; titleList = new UI.List(titleMenuItems()); IDLE.t = 0; IDLE.lastNow = 0; S7.music('title'); S7.presenter.title && S7.presenter.title(true); G && (G.attract = false); game.timeScale = 1; S7.BOT.on = false; },
    exit() { S7.presenter.title && S7.presenter.title(false); },
    update(dt) {
      const rdt = 1 / 120;
      touchNotice = S7.touchOnly();
      const active = idleTick(rdt) || UI.modal() && false;
      if (game.paused || game.shell && game.shell.screen) IDLE.t = 0;   // (an engine settings screen open over the title: the timer counts in draw)
      if (UI.update(dt)) { if (active) IDLE.t = 0; return; }
      titleList.items = titleMenuItems();
      if (touchNotice) { const c = In.click(); if (c && UI.setBtn && inRect(c, UI.setBtn)) game.menu('settings'); }
      else titleList.update();
      if (IDLE.t >= 10) game.go('attract', null, { fade: 'white', seconds: .4 });
    },
    draw(r) {
      S7.presenter.drawTitle ? S7.presenter.drawTitle(r) : null;
      if (game.shell && game.shell.screen) { IDLE.t += 1 / 60; if (IDLE.t >= 10) { game.shell.hide && game.shell.hide(); game.go('attract'); } }
      r.overlay(g => {
        px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
        const top = Math.round(r.H * .1);
        E.font.title(g, 'SKILLER', r.W / 2 - 14, top, { scale: 5, colors: ['#ffffff', '#f4f1ea', '#d8d0c8'], outline: '#05040a', depth: 3, depthColor: '#3a3438', align: 'center' });
        E.font.title(g, '7', r.W / 2 + tw('SKILLER', 5) / 2 - 6, top, { scale: 5, colors: ['#ff5060', RED, '#8a0a14'], outline: '#05040a', depth: 3, depthColor: '#3a0a10' });
        txt(g, 'SEVEN KILLERS, ONE MOUNTAIN', r.W / 2 - tw('SEVEN KILLERS, ONE MOUNTAIN') / 2, top + 46, RED);
        if (touchNotice) {
          const s1 = 'CONTROLLER OR KEYBOARD REQUIRED', s2 = 'Connect a controller or a keyboard to play';
          txt(g, s1, r.W / 2 - tw(s1, 2) / 2, r.H * .5, INK, { scale: 2 }); txt(g, s2, r.W / 2 - tw(s2) / 2, r.H * .5 + 22, MUTED);
          UI.setBtn = [r.W / 2 - 60, r.H * .5 + 44, 120, 24]; box(g, UI.setBtn[0], UI.setBtn[1], 120, 24, { bg: [RED, '#8a1018'], border: INK }); txt(g, 'SETTINGS', r.W / 2 - tw('SETTINGS', 2) / 2, UI.setBtn[1] + 5, INK, { scale: 2 });
        } else if (!UI.modal()) {
          titleList.draw(g, r.W / 2 - 90, Math.round(r.H * .42), 180, { scale: 2, rh: 19 });
          UI.prompts(g, r, [['confirm', 'SELECT']], r.H - Math.round(r.H * .05) - 12);
        }
        txt(g, 'v' + S7.VERSION + ' · ' + S7.BUILD + ' · my-3D2dge ' + (E.version || ''), Math.round(r.W * .05), r.H - Math.round(r.H * .05) - 2, '#5a5460');
        UI.draw(g, r);
      });
    }
  };
  scenes.play = {
    pausable: true, touch: [], camera: false,
    enter() { if (!G) { S7.newGame({}); S7.enterArea('room7', 'door', { noAutosave: true }); } S7.presenter.enterArea(G.area); S7.music((S7.AREAS[G.area] || {}).music); game.input.touchEnabled = false; },
    update(dt) {
      if (UI.update(dt)) return;
      const I = S7.BOT.on ? S7.bot.intent(dt) : readHumanIntent(dt);
      if (!S7.BOT.on) UI.worldIntent(I);
      if (!S7.BOT.on && I.ringReleased && G.mode !== 'ring') { /* (a tap while aiming: the scan has it) */ }
      if (G.cut && !S7.BOT.on && game.input.pressed('start') && !UI.modal()) UI.open('skip');
      const slalomAim = G.boss && G.boss.id === 'hansi' && G.boss.phase === 2 && G.aim.on;
      game.timeScale = (G.mode === 'ring' ? .15 : G.slowmo ? .5 : slalomAim ? .6 : 1) * T.timeScale * (CHEATS.slowCrit && game.timeScale < .3 ? 1 : 1);
      simUpdate(dt, I);
      S7.presenter.step(dt);
      if (G.mode === 'results' && !UI.modal()) UI.open('results');
      if (G.mode === 'gameover' && G.gameoverT > 1.2 && !UI.modal()) { S7.music('gameover', { restart: true }); UI.open('gameover'); }
      if (G.mode === 'end') game.go('credits', null, { fade: 'black', seconds: 1 });
      if (I.map && G.mode === 'play' && !G.aim.on && !(S7.hubActive && S7.hubActive())) UI.open('map');
    },
    draw(r) { S7.presenter.draw(r); r.overlay(g => { UI.hud(g, r, 1 / 60); UI.draw(g, r); }); }
  };
  scenes.attract = S7.attractScene(game);
  scenes.credits = {
    touch: [],
    enter() { S7.music('credits'); this.t = 0; },
    update(dt) { this.t += dt; if (this.t > 2 && (game.input.anyPressed() || In.click())) game.go('title'); if (this.t > 90) game.go('title'); },
    draw(r) {
      r.overlay(g => {
        px.rect(g, 0, 0, r.W, r.H, '#000');
        const L = S7.CREDITS, y0 = r.H - this.t * 22;
        L.forEach((l, i) => { const y = y0 + i * 20; if (y < -20 || y > r.H + 10) return; const big = l.startsWith('#'), s = big ? l.slice(1) : l; txt(g, s, r.W / 2 - tw(s, big ? 2 : 1) / 2, y, big ? RED : INK, { scale: big ? 2 : 1 }); });
        if (this.t > 2) UI.prompts(g, r, [['confirm', 'TITLE']], r.H - 16);
      });
    }
  };
  if (S7.hubScene) scenes.hub = S7.hubScene(game);
  return scenes;
};

/* ==== src/99-start.js ==== */
/* SKILLER7 — the start: the game (settings, pause items, saves), the scenes, boot, game.debug (the tests' handle).
 * S7.start({ World3D }) in the page; S7.start({ headless: true, seed }) in Node (a NullPresenter, no audio). */
const SETTINGS = [
  { key: 'picture3d', label: '3D picture', group: 'Display', value: 'pixels', options: [['pixels', 'Pixels'], ['balanced', 'Balanced'], ['full', 'Full']], help: 'Pixels: the game\'s own resolution, chunky. Full: the screen\'s.' },
  { key: 'shadows3d', label: 'Shadows', group: 'Display', value: true, help: 'Lamps and the moon cast real shadows.' },
  { key: 'filter3d', label: 'Filter', group: 'Display', value: 'cel', options: [['clean', 'None'], ['cel', 'Comic cel'], ['pixel', 'Pixel']], help: 'Comic cel: flat bands of light and ink. The game is drawn for it.' },
  { key: 'difficulty', label: 'Difficulty', group: 'Game', value: 'Piste', options: ['Bunny Hill', 'Piste', 'Off-Piste'], help: 'Bunny Hill: half damage, longer reveals. Off-Piste: they hit harder and fade faster.', apply: (g, v) => { if (S7.G) S7.G.difficulty = v; } },
  { key: 'aimToggle', label: 'Aim', group: 'Game', value: 'Hold', options: ['Hold', 'Toggle'], help: 'Hold the aim button to aim, or press it once to aim and again to stop.' },
  { key: 'aimAssist', label: 'Aim assist (controller)', group: 'Game', value: 'Low', options: ['Off', 'Low', 'High'], help: 'Slows and gently pulls the aim near a revealed warm spot.' },
  { key: 'padSens', label: 'Aim speed (controller)', group: 'Game', type: 'slider', value: 1, min: .5, max: 2, step: .05 },
  { key: 'mouseMode', label: 'Mouse aim', group: 'Game', value: 'Look', options: ['Look', 'Pointer'], help: 'Look: the mouse turns the view (it is captured). Pointer: the reticle follows the mouse like a light gun.' },
  { key: 'mouseSens', label: 'Mouse sensitivity', group: 'Game', type: 'slider', value: .12, min: .03, max: .4, step: .01 },
  { key: 'laughCues', label: 'Laugh direction cues', group: 'Game', value: true, help: 'Red arcs at the screen\'s edge point at the loudest laughter.' },
  { key: 'textSize', label: 'Text size', group: 'Game', value: 'Normal', options: ['Normal', 'Large'] },
  { key: 'textSpeed', label: 'Text speed', group: 'Game', value: 'Normal', options: ['Normal', 'Fast'] },
  { key: 'voices', label: 'Voices', group: 'Game', type: 'slider', value: .8, min: 0, max: 1, step: .05 },
  { key: 'padGlyphs', label: 'Controller buttons', group: 'Game', value: 'PlayStation', options: ['PlayStation', 'Xbox'], help: 'The button symbols in prompts.', apply: (g, v) => { if (g.settings && g.settings.glyphs !== undefined) { const want = v === 'Xbox' ? 'xbox' : 'playstation'; if (g.settings.glyphs !== want) g.settings.set('glyphs', want); } g.input.glyphs = v === 'Xbox' ? 'xbox' : 'playstation'; } }
];
S7.SETTINGS = SETTINGS;
let presenter = null, NULLP = { init() {}, step() {}, draw() {}, enterArea() {}, title() {} };
S7.UIOPEN = false;

function pauseItems() {
  const hub = S7.hubActive && S7.hubActive();
  const items = [];
  if (G && G.cut && S7.UI) items.push(['Skip scene', () => { const g = S7.game; if (g.shell && g.shell.hide) g.shell.hide(); g.paused = false; S7.skipScene(); }]);
  if (S7.UI) {
    if (!hub) items.push(['Map', () => S7.UI.openFromPause('map')]);
    items.push(['Items & Dossier', () => S7.UI.openFromPause('dossier')], ['Personas', () => S7.UI.openFromPause('personas')], ['Help', () => S7.UI.openFromPause('help')], ['About & Credits', () => S7.UI.openFromPause('about')]);
    if (!hub) items.push(['Dev Mode', () => S7.UI.openFromPause('dev')]);
  }
  return items;
}

S7.start = (opts = {}) => {
  if (opts.seed) S7.reseed(opts.seed);
  const headless = !!opts.headless || typeof document === 'undefined';
  const game = S7.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, bg: null, input: INPUT, id: 'skiller7', headless, loop: headless ? false : undefined, fullscreen: S7.hubActive && S7.hubActive() ? false : undefined,
    menu: { items: pauseItems, settings: SETTINGS, controls: CONTROL_NAMES, saves: { slots: 3, version: 1, migrate: (d, from) => S7.migrate(d, from) }, quit: typeof AIHub !== 'undefined' && AIHub.active ? false : 'title' }
  });
  game.pauseBlock = () => !!(S7.UIOPEN || S7.hubActive && S7.hubActive() && game.input.held.has('Pad8'));
  if (game.input) game.input.touchEnabled = false;
  if (game.settings && game.settings.padGlyphs) game.input.glyphs = game.settings.padGlyphs === 'Xbox' ? 'xbox' : 'playstation';
  // saves
  const sv = game.saves;
  if (sv) {
    sv.write = () => ({ data: S7.serialize(), place: (S7.AREAS[G.area] || {}).title || G.area, level: 'TARGET 0' + (G.target || 0) });
    sv.read = save => { S7.deserialize(save.data); S7.toPlay && S7.toPlay(); };
    Object.defineProperty(sv, 'canSave', { get: () => !!(G && G.area === 'room7' && !(S7.hubActive && S7.hubActive())), configurable: true });
  }
  S7.autosave = why => { if (!G || G.attract || G.noSaves || S7.TESTING && !S7.TESTSAVES || (S7.hubActive && S7.hubActive())) return; try { if (sv) sv.autosave(); emit('save', { slot: 'auto', why }); } catch (e) { game.fail('autosave', e); } };
  S7.loadDev && S7.loadDev();
  const scenes = S7.makeScenes(game);
  presenter = headless || !opts.World3D ? NULLP : new S7.Presenter3D(game, opts.World3D);
  S7.presenter = presenter;
  S7.audioInit && S7.audioInit(game);
  const steps = [];
  if (!headless && opts.World3D) {
    steps.push(['The 3D engine: three.js r182, Rapier 0.19.3', () => opts.World3D.init(game)]);
    steps.push(['Shaking the featherbed', () => presenter.init()]);
  }
  steps.push(['Counting the coats', () => { S7.validateQuick && S7.validateQuick(); }]);
  if (S7.hubBoot) steps.push(['Calling the hub', () => S7.hubBoot(game)]);
  const first = opts.scene || (typeof AIHub !== 'undefined' && AIHub.active ? 'hub' : 'title');
  game.start({ scenes, scene: first, boot: { title: 'SKILLER7', version: S7.VERSION, steps, messages: ['Waxing the skis', 'Winding the cuckoo clock', 'Counting the coats', 'Shaking the featherbed', 'Asking the Föhn to wait'] } });
  game.debug = S7.debugHandle();
  S7.started = true;
  if (typeof window !== 'undefined') window.__game = { game, S7 };
  return game;
};

/** game.debug: the handle tests and tools use (§5.7) */
S7.debugHandle = () => ({
  snapshot() {
    const g = S7.game, wk = G ? G.walker : {};
    if (!G) return { scene: g.scene && g.sceneName, mode: null };
    return { scene: g.sceneName, mode: G.mode, area: G.area, node: wk.node, edge: wk.edge, s: Math.round(wk.s), dir: wk.dir, speed: Math.round(wk.v), persona: G.persona, hp: Math.round(G.roster[G.persona].hp),
      red: Math.round(G.red), rime: G.rime, items: Object.assign({}, G.items), pins: G.pins.length, edelweiss: G.items.edelweiss || 0, flags: Object.keys(G.flags).filter(k => G.flags[k] && !k.startsWith('trig:') && !k.startsWith('hit:')),
      objective: S7.objective(), enemies: { alive: aliveEnemies().length, revealed: G.enemies.filter(e => e.alive && e.vis > .5).length }, boss: G.boss ? { id: G.boss.id, phase: G.boss.phase, bar: G.boss.bar } : null,
      aim: { on: G.aim.on, yaw: +G.aim.yaw.toFixed(3), pitch: +G.aim.pitch.toFixed(3), scope: G.aim.scope }, target: G.target, results: G.results, time: +G.time.toFixed(2), hash: S7.hash(), bot: S7.bot.status() };
  },
  teleport(area, node) { if (G.area !== area) S7.enterArea(area, node, { noAutosave: true }); else S7.placeAtNode(node); },
  setPersona(id) { G.roster[id].unlocked = true; G.persona = id; }, give(item, n) { S7.giveItem(item, n); }, addRed(n) { S7.addRed(n); }, addRime(n) { G.rime += n; },
  tune(k, v) { S7.tune(k, v); }, cheat(name, on) { CHEATS[name] = on; }, killAll() { S7.killAll(); }, revealAll() { for (const e of G.enemies) e.revealed = 30; },
  freeze(id) { if (id && id !== G.persona) G.persona = id; S7.freezeActive(); }, wave(id) { S7.startWave(id); }, beat(id) { S7.runBeat(id); }, boss(id, phase) { S7.startBoss(id, phase); },
  skipCutscene() { S7.skipScene && S7.skipScene(); }, hash: () => S7.hash(), bot: S7.bot, S7
});
/** a stable hash of the sim state (walker, roster, enemies, economy, flags) */
S7.hash = () => {
  if (!G) return 0;
  const wk = G.walker, parts = [G.area, wk.edge, Math.round(wk.s * 10), wk.dir, Math.round(wk.v), wk.node, G.persona, Math.round(G.red * 10), G.rime, G.mode,
    ...ORDER.map(id => Math.round(G.roster[id].hp * 10)), ...G.enemies.filter(e => e.alive).map(e => e.type + Math.round(e.x) + ',' + Math.round(e.y) + ',' + Math.round(e.hp)), Object.keys(G.flags).sort().join(), Math.round(G.aim.yaw * 1000), Math.round(G.aim.pitch * 1000)];
  return hashStr(parts.join('|'));
};

})();
