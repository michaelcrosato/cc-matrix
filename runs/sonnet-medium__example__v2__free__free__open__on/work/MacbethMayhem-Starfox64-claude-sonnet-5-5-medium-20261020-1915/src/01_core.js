/* ===================== 01 CORE: utils, settings, input, audio ===================== */
import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';

const V3 = THREE.Vector3, QT = THREE.Quaternion, M4 = THREE.Matrix4, EU = THREE.Euler;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sign = (v) => (v < 0 ? -1 : 1);
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmtTime = (t) => { t = Math.max(0, Math.floor(t)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

/* ---------- settings & save ---------- */
const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, sfx: 0.9, invertH: false, invertV: false, deadzone: 0.15, sens: 1, rumble: true, shake: 1, hints: true, aimAssist: true, outlines: true, shadows: true };
const Store = {
  get(k, d) { try { const v = localStorage.getItem('macbethmayhem.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('macbethmayhem.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const Settings = Object.assign({}, DEFAULT_SETTINGS, Store.get('settings', {}));
const saveSettings = () => Store.set('settings', Settings);
const Progress = Object.assign({ medals: {}, best: {}, plays: 0 }, Store.get('progress', {}));
const saveProgress = () => Store.set('progress', Progress);

/* ---------- input ---------- */
const ACTIONS = ['fire', 'charge', 'bomb', 'boost', 'brake', 'rollL', 'rollR', 'uturn', 'pause'];
const KEYMAP = {
  fire: ['Space', 'KeyJ'], charge: ['KeyK'], bomb: ['KeyL', 'KeyB'], boost: ['ShiftLeft', 'ShiftRight'], brake: ['ControlLeft', 'KeyC'],
  rollL: ['KeyQ'], rollR: ['KeyE'], uturn: ['KeyF'], pause: ['Escape', 'KeyP'],
};
const PADMAP = { fire: [0], charge: [2], bomb: [1], boost: [7], brake: [6], rollL: [4], rollR: [5], uturn: [3], pause: [9] };
const Input = {
  keys: new Set(), pressedKeys: new Set(), lastDevice: 'keyboard', lastActivity: performance.now(), pad: null, padConnected: false,
  ctl: { x: 0, y: 0, rawX: 0, rawY: 0 }, nav: { up: false, down: false, left: false, right: false, confirm: false, back: false },
  prev: {}, navHold: {}, navTimer: {}, tapT: { l: -9, r: -9 }, prevDir: { l: false, r: false }, mouseMoved: false, touchOnly: false, hasKeyboardEver: false,
  init() {
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this.pressedKeys.add(e.code); this.lastDevice = 'keyboard'; this.hasKeyboardEver = true; this.lastActivity = performance.now();
      Input.onAny && Input.onAny('key'); try { Sfx.init(); Sfx.resume(); Sfx.applyVolumes(); } catch (err) { /* audio unavailable */ }
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); });
    addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0 || e.movementX === undefined) { this.lastActivity = performance.now(); this.mouseMoved = true; Input.onAny && Input.onAny('mouse'); } });
    addEventListener('mousedown', () => { this.lastActivity = performance.now(); Input.onAny && Input.onAny('mouse'); try { Sfx.init(); Sfx.resume(); Sfx.applyVolumes(); } catch (err) { /* audio unavailable */ } });
    addEventListener('touchstart', () => { this.lastActivity = performance.now(); Input.onAny && Input.onAny('touch'); }, { passive: true });
    addEventListener('gamepadconnected', (e) => { this.padConnected = true; this.lastDevice = 'pad'; UI && UI.toast && UI.toast('Controller connected'); });
    addEventListener('gamepaddisconnected', () => { this.padConnected = false; });
    const mq = matchMedia('(any-pointer: fine)'), co = matchMedia('(any-pointer: coarse)');
    this.touchOnly = () => co.matches && !mq.matches && !this.padConnected && !this.hasKeyboardEver;
  },
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  },
  held(action) {
    let h = false;
    for (const k of KEYMAP[action] || []) if (this.keys.has(k)) h = true;
    const p = this.pad;
    if (p) {
      for (const b of PADMAP[action] || []) { const bt = p.buttons[b]; if (bt && (bt.pressed || bt.value > 0.6)) h = true; }
    }
    return h;
  },
  /** Called once per frame. Fills ctl (gameplay) and nav (menu) */
  update(dt) {
    this.pad = this.getPad();
    const p = this.pad;
    let ax = 0, ay = 0, rx = 0, ry = 0, dpx = 0, dpy = 0;
    if (p) {
      ax = p.axes[0] || 0; ay = p.axes[1] || 0;
      const dz = Settings.deadzone;
      const mag = Math.hypot(ax, ay);
      if (mag < dz) { ax = 0; ay = 0; } else { const k = (mag - dz) / (1 - dz) / mag; ax *= k; ay *= k; }
      if (p.buttons[14] && p.buttons[14].pressed) dpx -= 1;
      if (p.buttons[15] && p.buttons[15].pressed) dpx += 1;
      if (p.buttons[12] && p.buttons[12].pressed) dpy -= 1;
      if (p.buttons[13] && p.buttons[13].pressed) dpy += 1;
      let any = Math.abs(ax) + Math.abs(ay) + Math.abs(dpx) + Math.abs(dpy) > 0.5;
      for (const b of p.buttons) if (b.pressed) any = true;
      if (any) { this.lastDevice = 'pad'; this.lastActivity = performance.now(); Input.onAny && Input.onAny('pad'); }
    }
    // keyboard direction
    let kx = 0, ky = 0;
    const K = this.keys;
    if (K.has('KeyA') || K.has('ArrowLeft')) kx -= 1;
    if (K.has('KeyD') || K.has('ArrowRight')) kx += 1;
    if (K.has('KeyW') || K.has('ArrowUp')) ky -= 1;
    if (K.has('KeyS') || K.has('ArrowDown')) ky += 1;
    // menu direction (the invert toggles also fix a reversed stick in menus; D-pad and keys are never inverted)
    const rawX = clamp(ax * (Settings.invertH ? -1 : 1) + dpx + kx, -1, 1), rawY = clamp(ay * (Settings.invertV ? -1 : 1) + dpy + ky, -1, 1);
    // gameplay direction: stick may be inverted by settings (the "common gamepad inversion" fix); dpad/keys are never inverted
    const gx = ax * (Settings.invertH ? -1 : 1), gy = ay * (Settings.invertV ? -1 : 1);
    this.ctl.x = clamp(gx + dpx + kx, -1, 1) * 1;
    this.ctl.y = clamp(gy + dpy + ky, -1, 1) * 1;
    this.ctl.rawX = rawX; this.ctl.rawY = rawY;
    // button edge detection
    const c = this.ctl;
    for (const a of ACTIONS) {
      const h = this.held(a);
      const tapped = (KEYMAP[a] || []).some((k) => this.pressedKeys.has(k));
      c[a] = h || tapped; c[a + 'Down'] = (h && !this.prev[a]) || tapped; c[a + 'Up'] = !h && this.prev[a];
      this.prev[a] = h;
    }
    // double-tap roll
    const now = performance.now() / 1000;
    const L = this.ctl.x < -0.85, R = this.ctl.x > 0.85;
    if (L && !this.prevDir.l) { if (now - this.tapT.l < 0.28) c.rollLDown = true; this.tapT.l = now; }
    if (R && !this.prevDir.r) { if (now - this.tapT.r < 0.28) c.rollRDown = true; this.tapT.r = now; }
    this.prevDir.l = L; this.prevDir.r = R;
    // menu navigation with repeat
    const nav = this.nav;
    const dirs = { up: rawY < -0.5, down: rawY > 0.5, left: rawX < -0.5, right: rawX > 0.5 };
    for (const d in dirs) {
      nav[d] = false;
      if (dirs[d]) {
        if (!this.navHold[d]) { nav[d] = true; this.navHold[d] = true; this.navTimer[d] = 0.38; }
        else { this.navTimer[d] -= dt; if (this.navTimer[d] <= 0) { nav[d] = true; this.navTimer[d] = 0.11; } }
      } else this.navHold[d] = false;
    }
    const K2 = this.pressedKeys; // key taps shorter than one frame still count
    if (K2.has('ArrowUp') || K2.has('KeyW')) nav.up = true; if (K2.has('ArrowDown') || K2.has('KeyS')) nav.down = true; if (K2.has('ArrowLeft') || K2.has('KeyA')) nav.left = true; if (K2.has('ArrowRight') || K2.has('KeyD')) nav.right = true;
    const padConfirm = p && p.buttons[0] && p.buttons[0].pressed, padBack = p && p.buttons[1] && p.buttons[1].pressed;
    const confirmNow = padConfirm || this.keys.has('Enter') || this.keys.has('Space') || this.keys.has('NumpadEnter');
    const backNow = padBack || this.keys.has('Escape') || this.keys.has('Backspace');
    nav.confirm = (confirmNow && !this.prev._confirm) || K2.has('Enter') || K2.has('Space') || K2.has('NumpadEnter'); this.prev._confirm = confirmNow;
    nav.back = (backNow && !this.prev._back) || K2.has('Escape') || K2.has('Backspace'); this.prev._back = backNow;
  },
  rumble(strong, weak, ms) {
    if (!Settings.rumble) return;
    const p = this.pad;
    if (p && p.vibrationActuator && p.vibrationActuator.playEffect) {
      p.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: clamp(weak, 0, 1), strongMagnitude: clamp(strong, 0, 1) }).catch(() => {});
    }
  },
  idleSeconds() { return (performance.now() - this.lastActivity) / 1000; },
};
/* Glyphs adapt to the last-used device (PlayStation layout for pads) */
const GLYPH_PAD = { fire: ['✕', 'blue'], charge: ['□', 'pink'], bomb: ['○', 'red'], uturn: ['△', 'green'], boost: ['R2', 'grey'], brake: ['L2', 'grey'], rollL: ['L1', 'grey'], rollR: ['R1', 'grey'], pause: ['OPTIONS', 'grey'], confirm: ['✕', 'blue'], back: ['○', 'red'], move: ['L', 'grey'], nav: ['D-PAD', 'grey'] };
const GLYPH_KEY = { fire: 'SPACE', charge: 'K', bomb: 'L', uturn: 'F', boost: 'SHIFT', brake: 'CTRL', rollL: 'Q', rollR: 'E', pause: 'ESC', confirm: 'ENTER', back: 'ESC', move: 'WASD', nav: 'ARROWS' };
function glyph(a) {
  if (Input.lastDevice === 'pad') { const g = GLYPH_PAD[a]; return `<span class="glyph pad ${g[1]}">${g[0]}</span>`; }
  return `<span class="glyph key">${GLYPH_KEY[a]}</span>`;
}

/* ---------- audio: everything synthesised with Web Audio ---------- */
const MUSIC = {
  title: { bpm: 96, root: 38, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'triangle',
    bars: [
      { b: '0 . . . . . 0 . 5 . . . . . 4 .', l: '7 . . . 9 . . . 11 . . . 9 . 8 .', a: '0 2 4 2 0 2 4 2 -2 0 2 0 -3 -1 1 -1' },
      { b: '5 . . . . . 5 . 3 . . . . . 3 .', l: '9 . . . 11 . . . 12 . . . 11 . 9 .', a: '0 2 5 2 0 2 5 2 -2 0 3 0 -2 0 3 0' },
      { b: '3 . . . . . 3 . 4 . . . . . 4 .', l: '7 . . . 8 . . . 9 . . . . . 11 .', a: '0 2 4 2 0 2 4 2 0 2 5 2 0 2 5 2' },
      { b: '4 . . . . . 4 . 0 . . . . . . .', l: '11 . . . 9 . . . 7 . . . . . . .', a: '1 3 5 3 1 3 5 3 0 2 4 2 0 2 4 2' },
    ], drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' }, drumsOn: 0.0 },
  stage: { bpm: 138, root: 40, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'sawtooth',
    bars: [
      { b: '0 0 . 0 0 . 0 . 0 0 . 0 0 . 7 .', l: '7 . . 7 . 9 . 7 . . 5 . 7 . . .', a: '0 4 7 4 0 4 7 4 0 4 7 4 0 4 7 4' },
      { b: '5 5 . 5 5 . 5 . 5 5 . 5 5 . 3 .', l: '8 . . 8 . 9 . 8 . . 7 . 5 . . .', a: '5 8 12 8 5 8 12 8 5 8 12 8 5 8 12 8' },
      { b: '3 3 . 3 3 . 3 . 3 3 . 3 3 . 4 .', l: '7 . . 7 . 9 . 11 . . 9 . 7 . . .', a: '3 7 10 7 3 7 10 7 3 7 10 7 3 7 10 7' },
      { b: '4 4 . 4 4 . 4 . 4 4 . 4 4 . 6 .', l: '9 . 11 . 12 . 11 . 9 . 7 . 6 . . .', a: '4 7 11 7 4 7 11 7 4 7 11 7 4 7 11 7' },
    ], drums: { k: 'x...x...x..xx...', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.xx' }, drumsOn: 1 },
  boss: { bpm: 156, root: 38, scale: [0, 1, 3, 5, 7, 8, 11], wave: 'sawtooth',
    bars: [
      { b: '0 0 0 . 0 0 0 . 0 0 0 . 1 1 1 .', l: '12 . 12 . 13 . 12 . 11 . 12 . . . . .', a: '0 7 0 7 0 7 0 7 1 8 1 8 1 8 1 8' },
      { b: '0 0 0 . 0 0 0 . 3 3 3 . 4 4 4 .', l: '12 . 14 . 15 . 14 . 12 . 11 . 12 . . .', a: '0 7 0 7 0 7 0 7 3 10 3 10 4 11 4 11' },
      { b: '5 5 5 . 5 5 5 . 4 4 4 . 3 3 3 .', l: '15 . 14 . 12 . 11 . 12 . 14 . 12 . . .', a: '5 12 5 12 5 12 5 12 4 11 4 11 3 10 3 10' },
      { b: '1 1 1 . 1 1 1 . 4 4 4 . 4 4 4 4', l: '13 . 12 . 11 . 8 . 11 . 12 . 13 . 14 .', a: '1 8 1 8 1 8 1 8 4 11 4 11 4 11 4 11' },
    ], drums: { k: 'x..xx..xx..xx.x.', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx' }, drumsOn: 1 },
  range: { bpm: 148, root: 43, scale: [0, 2, 4, 5, 7, 9, 10], wave: 'square',
    bars: [
      { b: '0 . 0 0 . 0 0 . 0 . 0 0 . 0 4 .', l: '9 . 11 . 12 . 11 . 9 . 7 . 9 . . .', a: '0 2 4 7 0 2 4 7 0 2 4 7 0 2 4 7' },
      { b: '3 . 3 3 . 3 3 . 3 . 3 3 . 3 2 .', l: '11 . 12 . 14 . 12 . 11 . 9 . 11 . . .', a: '3 5 7 10 3 5 7 10 3 5 7 10 3 5 7 10' },
      { b: '4 . 4 4 . 4 4 . 4 . 4 4 . 4 5 .', l: '12 . 14 . 16 . 14 . 12 . 11 . 12 . 14 .', a: '4 6 8 11 4 6 8 11 4 6 8 11 4 6 8 11' },
      { b: '5 . 5 5 . 5 4 . 4 . 3 3 . 2 2 .', l: '14 . 12 . 11 . 9 . 11 . 12 . 14 . . .', a: '5 7 9 12 5 7 9 12 4 6 8 11 4 6 8 11' },
    ], drums: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.xxxx' }, drumsOn: 1 },
  victory: { bpm: 120, root: 43, scale: [0, 2, 4, 5, 7, 9, 11], wave: 'square',
    bars: [
      { b: '0 . . . 4 . . . 5 . . . 4 . . .', l: '7 . 9 . 11 . 12 . 14 . . . . . . .', a: '0 2 4 2 0 2 4 2 3 5 7 5 3 5 7 5' },
      { b: '3 . . . 4 . . . 0 . . . . . . .', l: '14 . 12 . 11 . 9 . 7 . . . . . . .', a: '4 6 8 6 4 6 8 6 0 2 4 2 0 2 4 2' },
    ], drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' }, drumsOn: 1 },
  defeat: { bpm: 70, root: 36, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'triangle',
    bars: [
      { b: '0 . . . . . . . 0 . . . . . . .', l: '4 . . . . . 3 . . . 2 . . . . .', a: '0 . 2 . 0 . 2 . -2 . 0 . -2 . 0 .' },
      { b: '-2 . . . . . . . -3 . . . . . . .', l: '2 . . . . . 1 . . . 0 . . . . .', a: '-2 . 0 . -2 . 0 . -3 . -1 . -3 . -1 .' },
    ], drums: { k: 'x...............', s: '................', h: '................' }, drumsOn: 0 },
};
const VOICES = { rook: [150, 'sawtooth', 0.7], tansy: [520, 'triangle', 1.3], bram: [110, 'square', 0.8], hollin: [260, 'triangle', 1], maldoon: [85, 'sawtooth', 0.6], sisters: [360, 'sawtooth', 1.4], lead: [200, 'square', 1] };
const Sfx = {
  ctx: null, master: null, musicBus: null, sfxBus: null, noiseBuf: null, track: null, stepIdx: 0, nextTime: 0, timer: null, engine: null, musicName: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.musicBus = c.createGain(); this.sfxBus = c.createGain();
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.musicBus.connect(this.master); this.sfxBus.connect(this.master); this.master.connect(this.comp); this.comp.connect(c.destination);
    const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    // engine drone
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 55; o2.frequency.value = 55.7; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus); o1.start(); o2.start();
    this.engine = { o1, o2, g, f };
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = Settings.master; this.musicBus.gain.value = Settings.music * 0.55; this.sfxBus.gain.value = Settings.sfx;
  },
  setEngine(on, speed01, boost) {
    if (!this.engine) return;
    const t = this.ctx.currentTime, e = this.engine;
    e.g.gain.setTargetAtTime(on ? 0.035 + speed01 * 0.03 : 0, t, 0.1);
    e.o1.frequency.setTargetAtTime(48 + speed01 * 55 + (boost ? 25 : 0), t, 0.1); e.o2.frequency.setTargetAtTime(49 + speed01 * 55.6 + (boost ? 25 : 0), t, 0.1);
    e.f.frequency.setTargetAtTime(250 + speed01 * 500, t, 0.1);
  },
  tone(o) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.dur);
    const v = o.vol === undefined ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let n = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n.connect(f); n = f; }
    n.connect(g); g.connect(o.dest || this.sfxBus); osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  noise(o) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f1 || 1000, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(o.vol === undefined ? 0.3 : o.vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(o.dest || this.sfxBus); s.start(t, Math.random()); s.stop(t + o.dur + 0.05);
  },
  laser(lv = 1) { this.tone({ type: 'square', f: 1500 + lv * 100, f2: 300, dur: 0.12, vol: 0.12 }); this.tone({ type: 'sawtooth', f: 800, f2: 200, dur: 0.1, vol: 0.06 }); },
  enemyLaser() { this.tone({ type: 'sawtooth', f: 500, f2: 150, dur: 0.18, vol: 0.09, lp: 1800 }); },
  charge() { this.tone({ type: 'sawtooth', f: 200, f2: 900, dur: 0.6, vol: 0.12, lp: 2500 }); },
  lock() { this.tone({ type: 'square', f: 1200, f2: 1800, dur: 0.08, vol: 0.1 }); },
  missile() { this.noise({ ft: 'bandpass', f1: 3000, f2: 400, dur: 0.4, vol: 0.2 }); this.tone({ type: 'sawtooth', f: 400, f2: 80, dur: 0.3, vol: 0.12 }); },
  hit() { this.tone({ type: 'square', f: 300, f2: 100, dur: 0.07, vol: 0.12 }); },
  explode(size = 1) {
    this.noise({ ft: 'lowpass', f1: 2500 / (0.5 + size * 0.5), f2: 80, dur: 0.35 + size * 0.35, vol: 0.38 * Math.min(1.4, 0.5 + size * 0.5) });
    this.tone({ type: 'sine', f: 140, f2: 30, dur: 0.4 + size * 0.2, vol: 0.4 });
  },
  bomb() { this.noise({ ft: 'lowpass', f1: 4000, f2: 40, dur: 1.6, vol: 0.55 }); this.tone({ type: 'sine', f: 90, f2: 20, dur: 1.4, vol: 0.6 }); this.tone({ type: 'sawtooth', f: 900, f2: 60, dur: 0.8, vol: 0.12 }); },
  hurt() { this.noise({ ft: 'bandpass', f1: 800, f2: 200, dur: 0.3, vol: 0.4 }); this.tone({ type: 'sawtooth', f: 180, f2: 60, dur: 0.3, vol: 0.25 }); },
  roll() { this.noise({ ft: 'bandpass', f1: 300, f2: 3500, dur: 0.5, vol: 0.2, q: 2 }); },
  deflect() { this.tone({ type: 'triangle', f: 1800, f2: 2600, dur: 0.1, vol: 0.12 }); },
  boost() { this.noise({ ft: 'highpass', f1: 400, f2: 3000, dur: 0.8, vol: 0.2 }); this.tone({ type: 'sawtooth', f: 80, f2: 220, dur: 0.6, vol: 0.12 }); },
  brake() { this.noise({ ft: 'lowpass', f1: 2000, f2: 200, dur: 0.5, vol: 0.18 }); },
  ring() { [0, 0.07, 0.14].forEach((d, i) => this.tone({ type: 'triangle', f: 660 * Math.pow(1.26, i), dur: 0.2, vol: 0.2, delay: d })); },
  pickup() { [0, 0.06, 0.12, 0.18].forEach((d, i) => this.tone({ type: 'square', f: 523 * Math.pow(1.19, i * 1.5), dur: 0.12, vol: 0.14, delay: d })); },
  warn() { for (let i = 0; i < 3; i++) this.tone({ type: 'square', f: 880, f2: 700, dur: 0.18, vol: 0.14, delay: i * 0.3 }); },
  alarm() { this.tone({ type: 'square', f: 960, f2: 640, dur: 0.2, vol: 0.1 }); },
  menuMove() { this.tone({ type: 'square', f: 700, dur: 0.04, vol: 0.08 }); },
  menuSelect() { this.tone({ type: 'square', f: 600, dur: 0.07, vol: 0.12 }); this.tone({ type: 'square', f: 900, dur: 0.1, vol: 0.12, delay: 0.06 }); },
  menuBack() { this.tone({ type: 'square', f: 500, f2: 300, dur: 0.1, vol: 0.1 }); },
  type() { this.tone({ type: 'square', f: 1400 + rand(200), dur: 0.015, vol: 0.03 }); },
  medal() { [0, 0.12, 0.24, 0.4].forEach((d, i) => this.tone({ type: 'square', f: [523, 659, 784, 1047][i], dur: 0.3, vol: 0.18, delay: d })); },
  voice(who, text) {
    if (!this.ctx) return;
    const v = VOICES[who] || VOICES.lead; const n = Math.min(26, Math.ceil(text.length / 2.2));
    for (let i = 0; i < n; i++) {
      const f = v[0] * (0.8 + Math.random() * 0.6) * (i % 5 === 4 ? 1.25 : 1);
      this.tone({ type: v[1], f, f2: f * (0.9 + Math.random() * 0.25), dur: 0.05 + Math.random() * 0.04, vol: 0.07, delay: i * 0.075 * v[2] * 0.9 + 0.02, lp: 1800 });
    }
  },
  // ----- music sequencer -----
  playMusic(name) {
    if (!this.ctx) { this.pendingMusic = name; return; }
    if (this.musicName === name) return;
    this.musicName = name; this.track = MUSIC[name]; this.stepIdx = 0; this.nextTime = this.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 60);
  },
  stopMusic() { this.track = null; this.musicName = null; },
  schedule() {
    if (!this.track || !this.ctx) return;
    const tr = this.track, spStep = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const bar = tr.bars[Math.floor(this.stepIdx / 16) % tr.bars.length], s = this.stepIdx % 16;
      const deg = (d) => tr.root + tr.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const t = this.nextTime, dt = t - this.ctx.currentTime;
      const tok = (str) => str.split(' ')[s] ?? '.';
      const bt = tok(bar.b); if (bt !== '.') this.tone({ type: tr.wave === 'triangle' ? 'triangle' : 'sawtooth', f: hz(deg(+bt)), dur: spStep * 1.6, vol: 0.5, delay: dt, lp: 700, dest: this.musicBus });
      const lt = tok(bar.l); if (lt !== '.') this.tone({ type: tr.wave === 'sawtooth' ? 'square' : tr.wave, f: hz(deg(+lt) + 12), dur: spStep * 3.2, vol: 0.2, delay: dt, lp: 3200, dest: this.musicBus, attack: 0.01 });
      const at = tok(bar.a); if (at !== '.') this.tone({ type: 'triangle', f: hz(deg(+at) + 24), dur: spStep * 0.9, vol: 0.09, delay: dt, dest: this.musicBus });
      const dr = tr.drums;
      if (tr.drumsOn) {
        if (dr.k[s] === 'x') { this.tone({ type: 'sine', f: 150, f2: 40, dur: 0.16, vol: 0.7, delay: dt, dest: this.musicBus }); }
        if (dr.s[s] === 'x') { this.noise({ ft: 'highpass', f1: 1500, dur: 0.12, vol: 0.28, delay: dt, dest: this.musicBus }); this.tone({ type: 'triangle', f: 220, f2: 120, dur: 0.08, vol: 0.2, delay: dt, dest: this.musicBus }); }
        if (dr.h[s] === 'x') this.noise({ ft: 'highpass', f1: 7000, dur: 0.035, vol: 0.1, delay: dt, dest: this.musicBus });
      }
      this.nextTime += spStep; this.stepIdx++;
    }
  },
};
