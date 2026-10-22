'use strict';
/* ===== ENGINE: settings, input, audio, 3D mesh renderer ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

const DEFAULTS = { invH: false, invV: false, deadzone: 0.15, master: 0.8, music: 0.6, sfx: 0.9, shake: 1, rumble: true, subs: true, aim: 1, diff: 1, hints: true, glyphs: 0 };
const Settings = Object.assign({}, DEFAULTS);
try { Object.assign(Settings, JSON.parse(localStorage.getItem('starfern64.settings') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('starfern64.settings', JSON.stringify(Settings)); } catch (e) {} };
let Records = {};
try { Records = JSON.parse(localStorage.getItem('starfern64.records') || '{}'); } catch (e) {}
const saveRecords = () => { try { localStorage.setItem('starfern64.records', JSON.stringify(Records)); } catch (e) {} };

/* ---------- Input (gamepad primary, keyboard secondary) ---------- */
const Input = {
  keys: {}, keyEdge: {}, padPrev: [], lastDevice: 'kb', anyPressed: false, padConnected: false, kbSeen: false,
  s: { x: 0, y: 0, fire: false, fireP: false, fireR: false, bombP: false, rollL: false, rollR: false, boost: false, brake: false, pauseP: false, okP: false, backP: false, navX: 0, navY: 0, triP: false },
  navTimer: 0, navLast: 0,
  init() {
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.keyEdge[e.code] = true;
      this.keys[e.code] = true; this.lastDevice = 'kb'; this.kbSeen = true; this.anyPressed = true; Audio_.unlock();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('gamepadconnected', () => { this.padConnected = true; });
    addEventListener('gamepaddisconnected', () => { this.padConnected = !!this.pad(); });
    addEventListener('mousedown', () => Audio_.unlock());
  },
  pad() { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of l) if (p && p.connected) return p; return null; },
  poll() {
    const s = this.s, k = this.keys, e = this.keyEdge;
    const kd = (...c) => c.some(x => k[x]), ke = (...c) => c.some(x => e[x]);
    let x = (kd('ArrowRight', 'KeyD') ? 1 : 0) - (kd('ArrowLeft', 'KeyA') ? 1 : 0);
    let y = (kd('ArrowUp', 'KeyW') ? 1 : 0) - (kd('ArrowDown', 'KeyS') ? 1 : 0);
    let fire = kd('Space', 'KeyJ', 'KeyZ'), fireP = ke('Space', 'KeyJ', 'KeyZ'), bombP = ke('KeyX', 'KeyK'), rollL = ke('KeyQ'), rollR = ke('KeyE'),
      boost = kd('ShiftLeft', 'ShiftRight'), brake = kd('ControlLeft', 'ControlRight', 'KeyC'), pauseP = ke('Escape', 'KeyP'), okP = ke('Enter', 'Space', 'KeyJ', 'KeyZ'), backP = ke('Escape', 'Backspace', 'KeyX'),
      triP = ke('KeyT', 'Tab');
    let navX = ke('ArrowRight', 'KeyD') ? 1 : ke('ArrowLeft', 'KeyA') ? -1 : 0, navY = ke('ArrowDown', 'KeyS') ? 1 : ke('ArrowUp', 'KeyW') ? -1 : 0;
    let any = Object.keys(e).length > 0;
    const p = this.pad();
    this.padConnected = !!p;
    if (p) {
      const b = i => !!(p.buttons[i] && p.buttons[i].pressed), pv = this.padPrev, edge = i => b(i) && !pv[i];
      let ax = p.axes[0] || 0, ay = -(p.axes[1] || 0);
      if (Settings.invH) ax = -ax; if (Settings.invV) ay = -ay;
      const m = Math.hypot(ax, ay), dz = Settings.deadzone;
      if (m > dz) { const f = (m - dz) / (1 - dz) / m; ax *= f; ay *= f; } else { ax = ay = 0; }
      if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = 1; if (b(13)) ay = -1;
      if (Math.abs(ax) > Math.abs(x) || Math.abs(ay) > Math.abs(y)) { x = Math.abs(ax) > Math.abs(x) ? ax : x; y = Math.abs(ay) > Math.abs(y) ? ay : y; }
      fire = fire || b(0) || b(7) && false; fireP = fireP || edge(0);
      bombP = bombP || edge(2); rollL = rollL || edge(4); rollR = rollR || edge(5);
      boost = boost || b(7); brake = brake || b(6); pauseP = pauseP || edge(9) || edge(8);
      okP = okP || edge(0); backP = backP || edge(1); triP = triP || edge(3);
      // menu nav: dpad edges + stick pulse (respects invert toggles)
      for (const [i, dx, dy] of [[12, 0, -1], [13, 0, 1], [14, -1, 0], [15, 1, 0]]) if (edge(i)) { navX = dx || navX; navY = dy || navY; }
      const sx = ax, sy = -ay, now = performance.now();
      const dir = Math.abs(sx) > 0.6 ? [Math.sign(sx), 0] : Math.abs(sy) > 0.6 ? [0, Math.sign(sy)] : null;
      if (dir) { if (now > this.navTimer) { navX = dir[0] || navX; navY = dir[1] || navY; this.navTimer = now + (this.navLast ? 160 : 380); this.navLast = 1; } } else { this.navLast = 0; this.navTimer = 0; }
      let pa = false; for (let i = 0; i < p.buttons.length; i++) { if (edge(i)) pa = true; this.padPrev[i] = b(i); }
      if (pa || Math.hypot(p.axes[0] || 0, p.axes[1] || 0) > 0.5) { this.lastDevice = 'pad'; any = true; }
    }
    // key-edge menu nav should map to stick direction too
    const prevFire = s.fire;
    Object.assign(s, { x: clamp(x, -1, 1), y: clamp(y, -1, 1), fire, fireP, fireR: prevFire && !fire, bombP, rollL, rollR, boost, brake, pauseP, okP, backP, navX, navY, triP });
    this.anyPressed = any;
    this.keyEdge = {};
    return s;
  }
};

/* ---------- Audio: synthesized SFX + procedural music ---------- */
const Audio_ = {
  ctx: null, master: null, musG: null, sfxG: null, musicOn: false, step: 0, nextT: 0, track: 0,
  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ctx = new C(); this.master = this.ctx.createGain(); this.musG = this.ctx.createGain(); this.sfxG = this.ctx.createGain();
      this.musG.connect(this.master); this.sfxG.connect(this.master); this.master.connect(this.ctx.destination);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVol();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  applyVol() { if (!this.ctx) return; this.master.gain.value = Settings.master; this.musG.gain.value = Settings.music * 0.35; this.sfxG.gain.value = Settings.sfx; },
  tone(f, d, type = 'square', vol = 0.2, slide = 0, delay = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, vol = 0.3, freq = 1200, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(f); f.connect(g); g.connect(this.sfxG); s.start(t); s.stop(t + d);
  },
  sfx(n) {
    switch (n) {
      case 'laser': this.tone(900, 0.12, 'sawtooth', 0.09, -600); break;
      case 'laser2': this.tone(1100, 0.1, 'sawtooth', 0.09, -700); this.tone(700, 0.1, 'square', 0.04, -300); break;
      case 'lock': this.tone(1400, 0.06, 'square', 0.08); break;
      case 'missile': this.tone(300, 0.4, 'sawtooth', 0.12, 600); this.noise(0.4, 0.1, 3000); break;
      case 'boom': this.noise(0.5, 0.35, 2500); this.tone(90, 0.4, 'sine', 0.3, -50); break;
      case 'bigboom': this.noise(1.2, 0.5, 3000); this.tone(60, 1, 'sine', 0.5, -30); this.noise(0.8, 0.3, 1500, 0.2); break;
      case 'hit': this.noise(0.25, 0.4, 1800); this.tone(150, 0.2, 'square', 0.2, -100); break;
      case 'clang': this.tone(1800, 0.15, 'triangle', 0.15, -900); this.tone(2400, 0.1, 'square', 0.05); break;
      case 'roll': this.noise(0.4, 0.12, 6000); this.tone(400, 0.4, 'sine', 0.08, 500); break;
      case 'bomb': this.noise(1.2, 0.6, 4000); this.tone(50, 1.2, 'sine', 0.6, 80); break;
      case 'ring': this.tone(660, 0.12, 'triangle', 0.2); this.tone(880, 0.12, 'triangle', 0.2, 0, 0.08); this.tone(1320, 0.25, 'triangle', 0.2, 0, 0.16); break;
      case 'power': for (let i = 0; i < 5; i++) this.tone(500 + i * 150, 0.12, 'square', 0.12, 0, i * 0.06); break;
      case 'boost': this.noise(0.6, 0.2, 5000); break;
      case 'ui': this.tone(700, 0.05, 'square', 0.08); break;
      case 'ok': this.tone(520, 0.07, 'square', 0.1); this.tone(780, 0.1, 'square', 0.1, 0, 0.06); break;
      case 'back': this.tone(500, 0.08, 'square', 0.1, -200); break;
      case 'warn': this.tone(880, 0.12, 'square', 0.12); this.tone(660, 0.12, 'square', 0.12, 0, 0.14); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, 0, i * 0.14)); break;
      case 'lose': [400, 340, 280, 200].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.15, -40, i * 0.25)); break;
    }
  },
  blip(seed) { for (let i = 0; i < 3; i++) this.tone(300 + hash(seed + i) * 500, 0.05, 'square', 0.05, 0, i * 0.055); },
  startMusic(track) { this.track = track; this.musicOn = true; if (this.ctx) this.nextT = this.ctx.currentTime + 0.1; this.step = 0; },
  stopMusic() { this.musicOn = false; },
  update() {
    if (!this.ctx || !this.musicOn) return; const now = this.ctx.currentTime; if (this.nextT < now - 0.3) this.nextT = now + 0.05;
    const roots = this.track === 0 ? [55, 55, 65.4, 49, 55, 55, 73.4, 65.4] : this.track === 1 ? [51.9, 51.9, 58.3, 46.2, 51.9, 61.7, 58.3, 46.2] : [49, 49, 49, 55];
    const bt = this.track === 2 ? 0.2 : 0.16;
    while (this.nextT < now + 0.2) {
      const t = this.nextT - now, st = this.step, bar = Math.floor(st / 16) % roots.length, r = roots[bar], i = st % 16;
      if (i % 4 === 0) this.tone(r * (this.track === 2 ? 2 : 1), 0.18, 'sawtooth', 0.35, -r * 0.3, t, this.musG);
      if (i % 2 === 1 || this.track === 2) this.tone(r * 4 * [1, 1.5, 1.25, 2][(i >> 1) % 4] * (st % 32 > 15 ? 1.2 : 1), 0.1, 'square', 0.12, 0, t, this.musG);
      if (i % 8 === 4) this.tone(180, 0.1, 'triangle', 0.4, -120, t, this.musG);
      if (i % 2 === 0) { const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(i % 4 === 2 ? 0.2 : 0.08, now + t); g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05); s.connect(f); f.connect(g); g.connect(this.musG); s.start(now + t); s.stop(now + t + 0.06); }
      if (this.track !== 2 && i === 0 && (st / 16 | 0) % 2 === 0) [2, 3, 4].forEach(m => this.tone(r * m * 2, 1.2, 'triangle', 0.08, 0, t, this.musG));
      this.step++; this.nextT += bt;
    }
  }
};

/* ---------- Mesh builder + renderer (software 3D onto canvas 2D) ---------- */
function mkBox(cx, cy, cz, w, h, d, col) {
  const x = w / 2, y = h / 2, z = d / 2, v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]].map(p => [p[0] + cx, p[1] + cy, p[2] + cz]);
  return { v, f: [[4, 5, 6, 7, col], [1, 0, 3, 2, col], [0, 4, 7, 3, col], [5, 1, 2, 6, col], [3, 7, 6, 2, col], [0, 1, 5, 4, col]] };
}
function mkMerge(...parts) {
  const m = { v: [], f: [] };
  for (const p of parts) { const o = m.v.length; m.v.push(...p.v); for (const f of p.f) m.f.push(f.map((n, i) => i < f.length - 1 ? n + o : n)); }
  return m;
}
function mkPoly(verts, faces) { return { v: verts, f: faces }; }
// colors are RGB arrays
const C = {
  white: [225, 235, 240], gray: [110, 125, 140], dark: [50, 58, 70], fern: [70, 190, 90], leaf: [40, 130, 70], lime: [170, 240, 90], red: [220, 60, 70], orange: [255, 150, 50], yellow: [255, 220, 80], cyan: [80, 220, 255], blue: [70, 110, 220], purple: [150, 90, 220], pink: [255, 110, 190], brown: [120, 80, 50], bark: [90, 70, 55], spore: [190, 140, 255]
};
const Meshes = {};
(function () {
  const arw = (body, wing, acc) => mkPoly(
    [[0, 0, 3.2], [-0.6, 0.35, -1], [0.6, 0.35, -1], [0.6, -0.35, -1], [-0.6, -0.35, -1], [-0.55, 0, 0.8], [-3.2, -0.3, -1.9], [-0.7, 0, -1.4], [0.55, 0, 0.8], [3.2, -0.3, -1.9], [0.7, 0, -1.4], [0, 1.4, -1.7], [0, 0.3, -0.2], [0, 0.45, 1.2], [0, 0.3, -1.1], [-2.6, 0.5, -1.6], [2.6, 0.5, -1.6]],
    [[0, 1, 2, body], [0, 2, 3, shade(body, 0.8)], [0, 3, 4, shade(body, 0.55)], [0, 4, 1, shade(body, 0.85)], [1, 2, 3, 4, shade(body, 0.6)], [5, 6, 7, wing], [8, 9, 10, wing], [11, 12, 14, acc], [13, 1, 2, acc], [6, 15, 7, acc], [9, 16, 10, acc]]);
  function shade(c, k) { return c.map(v => v * k | 0); }
  Meshes.arwing = arw(C.white, C.fern, C.lime);
  Meshes.ally1 = arw(C.cyan, C.blue, C.white); Meshes.ally2 = arw(C.orange, C.red, C.yellow); Meshes.ally3 = arw(C.pink, C.purple, C.white);
  Meshes.dart = mkPoly([[0, 0, 2.5], [-1.5, 0, -1.5], [1.5, 0, -1.5], [0, 0.7, -1], [0, -0.5, -1], [-2.2, 0.2, -2], [2.2, 0.2, -2]],
    [[0, 3, 1, C.red], [0, 2, 3, shade(C.red, 0.8)], [0, 1, 4, shade(C.red, 0.5)], [0, 4, 2, shade(C.red, 0.6)], [1, 5, 4, C.dark], [2, 6, 4, C.dark], [1, 3, 5, C.orange], [2, 3, 6, C.orange]]);
  Meshes.heavy = mkMerge(mkBox(0, 0, 0, 3, 1.6, 6, C.purple), mkBox(0, 1.1, -1, 1.4, 0.8, 2.5, C.dark), mkBox(-3, 0, -1, 3.2, 0.4, 3, C.dark), mkBox(3, 0, -1, 3.2, 0.4, 3, C.dark), mkBox(0, 0, 3.5, 1, 1, 1.5, C.orange));
  Meshes.turret = mkMerge(mkBox(0, 0.8, 0, 3, 1.6, 3, C.gray), mkBox(0, 2, 0, 1.6, 1.2, 1.6, C.red), mkBox(0, 2.1, 1.4, 0.4, 0.4, 2, C.dark));
  Meshes.tower = mkMerge(mkBox(0, 0, 0, 5, 1, 5, C.bark), mkBox(0, 0, 0, 3, 1, 3, C.leaf));
  Meshes.rock = mkPoly([[0, 1.3, 0], [1.2, 0.2, 0.3], [0.2, 0.1, 1.2], [-1, 0.3, 0.4], [-0.2, -0.2, -1.1], [0.2, -1.2, 0.1], [0.9, 0.6, -0.9]],
    [[0, 1, 2, [120, 105, 95]], [0, 2, 3, [90, 80, 80]], [0, 3, 4, [100, 90, 85]], [0, 4, 6, [130, 115, 105]], [0, 6, 1, [110, 95, 90]], [5, 2, 1, [70, 62, 62]], [5, 3, 2, [60, 55, 58]], [5, 4, 3, [75, 68, 66]], [5, 6, 4, [65, 60, 60]], [5, 1, 6, [80, 70, 68]]]);
  Meshes.mine = mkPoly([[0, 1.2, 0], [0, -1.2, 0], [1.2, 0, 0], [-1.2, 0, 0], [0, 0, 1.2], [0, 0, -1.2]],
    [[0, 2, 4, C.yellow], [0, 4, 3, C.orange], [0, 3, 5, C.yellow], [0, 5, 2, C.orange], [1, 4, 2, C.orange], [1, 3, 4, C.yellow], [1, 5, 3, C.orange], [1, 2, 5, C.yellow]]);
  Meshes.chaser = Meshes.dart;
  Meshes.building = mkBox(0, 0.5, 0, 1, 1, 1, [60, 100, 80]);
  Meshes.tree = mkMerge(mkBox(0, 0.3, 0, 0.18, 0.6, 0.18, C.bark), mkPoly([[0, 1.8, 0], [-0.6, 0.5, -0.6], [0.6, 0.5, -0.6], [0.6, 0.5, 0.6], [-0.6, 0.5, 0.6]], [[0, 1, 2, C.fern], [0, 2, 3, C.leaf], [0, 3, 4, C.fern], [0, 4, 1, C.leaf]]));
  // boss 1: Thornwalker
  Meshes.boss1 = mkMerge(mkBox(0, 0, 0, 12, 6, 10, C.bark), mkBox(0, 4.5, 0, 6, 3, 6, C.leaf), mkBox(-8, -1, -2, 3, 9, 3, C.dark), mkBox(8, -1, -2, 3, 9, 3, C.dark), mkBox(-8, 4, 1, 2, 2, 8, C.red), mkBox(8, 4, 1, 2, 2, 8, C.red), mkBox(0, 0, 5.2, 4, 3, 1, C.dark));
  Meshes.boss1core = mkPoly([[0, 1.5, 0], [-1.5, 0, 0], [0, 0, 1.5], [1.5, 0, 0], [0, 0, -1.5], [0, -1.5, 0]], [[0, 1, 2, C.red], [0, 2, 3, C.orange], [0, 3, 4, C.red], [0, 4, 1, C.orange], [5, 2, 1, C.orange], [5, 3, 2, C.red], [5, 4, 3, C.orange], [5, 1, 4, C.red]]);
  // boss 2: Sporedreadnought
  Meshes.boss2 = mkMerge(mkBox(0, 0, 0, 10, 5, 26, C.dark), mkBox(0, 3.5, -4, 6, 3, 10, C.purple), mkBox(-9, 0, -4, 8, 1.5, 12, C.gray), mkBox(9, 0, -4, 8, 1.5, 12, C.gray), mkBox(-5, 2, 10, 2, 2, 8, C.red), mkBox(5, 2, 10, 2, 2, 8, C.red), mkBox(0, 5.8, 3, 2, 2, 5, C.spore));
  Meshes.pod = mkPoly([[0, 0, 2], [-1.2, 0.8, 0], [1.2, 0.8, 0], [1.2, -0.8, 0], [-1.2, -0.8, 0], [0, 0, -1.5]], [[0, 1, 2, C.pink], [0, 2, 3, C.spore], [0, 3, 4, C.pink], [0, 4, 1, C.spore], [5, 2, 1, C.purple], [5, 3, 2, C.pink], [5, 4, 3, C.purple], [5, 1, 4, C.pink]]);
})();

const Gfx = {
  cv: null, g: null, W: 0, H: 0, F: 0, u: 1, cam: { x: 0, y: 0, z: 0, roll: 0 }, fog: [10, 20, 30], fogFar: 380, shake: 0,
  init() { this.cv = document.getElementById('c'); this.g = this.cv.getContext('2d'); addEventListener('resize', () => this.resize()); this.resize(); },
  resize() { const d = Math.min(devicePixelRatio || 1, 2); this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.cv.style.width = innerWidth + 'px'; this.cv.style.height = innerHeight + 'px'; this.W = this.cv.width; this.H = this.cv.height; this.F = this.H * 0.85; this.u = this.H / 1080; },
  proj(x, y, z) { const c = this.cam, dz = z - c.z; if (dz < 0.8) return null; const s = this.F / dz; return [this.W / 2 + (x - c.x) * s, this.H * 0.46 - (y - c.y) * s, s, dz]; },
  fogMix(col, dz, k = 1) { const f = clamp(dz / this.fogFar, 0, 1) ** 1.4 * k; return `rgb(${lerp(col[0], this.fog[0], f) | 0},${lerp(col[1], this.fog[1], f) | 0},${lerp(col[2], this.fog[2], f) | 0})`; },
  mesh(m, x, y, z, o = {}) {
    const g = this.g, sc = o.s || 1, sx = o.sx || sc, sy = o.sy || sc, sz = o.sz || sc, rx = o.rx || 0, ry = o.ry || 0, rz = o.rz || 0, flash = o.flash || 0, tint = o.tint;
    const cr = Math.cos(rz), sr = Math.sin(rz), cp = Math.cos(rx), sp = Math.sin(rx), cy = Math.cos(ry), sy_ = Math.sin(ry);
    const tv = m.v.map(p => {
      let a = p[0] * sx, b = p[1] * sy, c = p[2] * sz, t;
      t = a * cr - b * sr; b = a * sr + b * cr; a = t;       // roll (z)
      t = b * cp - c * sp; c = b * sp + c * cp; b = t;       // pitch (x)
      t = a * cy + c * sy_; c = -a * sy_ + c * cy; a = t;     // yaw (y)
      return [a, b, c];
    });
    const pv = tv.map(p => this.proj(x + p[0], y + p[1], z + p[2]));
    const faces = [];
    for (const f of m.f) {
      const n = f.length - 1, idx = f.slice(0, n); if (idx.some(i => !pv[i])) continue;
      const a = tv[idx[0]], b = tv[idx[1]], c = tv[idx[2]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const light = 0.5 + 0.5 * Math.abs(nx * 0.35 + ny * 0.8 - nz * 0.45);
      let d = 0; for (const i of idx) d += pv[i][3]; faces.push([d / n, idx, f[n], light]);
    }
    faces.sort((p, q) => q[0] - p[0]);
    for (const [d, idx, col, light] of faces) {
      let c = tint && o.tintAll ? tint : col;
      let r = c[0] * light, gg = c[1] * light, bb = c[2] * light;
      if (flash) { r = lerp(r, 255, flash); gg = lerp(gg, 255, flash); bb = lerp(bb, 255, flash); }
      g.beginPath(); g.moveTo(pv[idx[0]][0], pv[idx[0]][1]); for (let i = 1; i < idx.length; i++) g.lineTo(pv[idx[i]][0], pv[idx[i]][1]); g.closePath();
      g.fillStyle = this.fogMix([r, gg, bb], d); g.fill();
      g.strokeStyle = this.fogMix([Math.min(255, r + 60), Math.min(255, gg + 60), Math.min(255, bb + 60)], d, 1.1); g.lineWidth = Math.max(0.6, this.u * 1.2); g.stroke();
    }
  },
  line(a, b, col, w, alpha = 1) { const p = this.proj(a[0], a[1], a[2]), q = this.proj(b[0], b[1], b[2]); if (!p || !q) return; const g = this.g; g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); g.globalAlpha = 1; },
  glow(x, y, z, r, col, alpha = 1) { const p = this.proj(x, y, z); if (!p) return; const g = this.g, R = Math.max(1, r * p[2]); g.globalAlpha = alpha; const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], R); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], R, 0, TAU); g.fill(); g.globalAlpha = 1; },
  ring(x, y, z, r, col, w, n = 8, rot = 0, alpha = 1) { const g = this.g; let first = true; g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= n; i++) { const a = rot + i / n * TAU, p = this.proj(x + Math.cos(a) * r, y + Math.sin(a) * r, z); if (!p) { first = true; continue; } if (first) { g.moveTo(p[0], p[1]); first = false; } else g.lineTo(p[0], p[1]); } g.stroke(); g.globalAlpha = 1; },
  text(s, x, y, size, col = '#fff', align = 'left', o = {}) { const g = this.g; g.font = `${o.weight || 700} ${size * this.u}px ${o.font || 'Trebuchet MS, Verdana, sans-serif'}`; g.textAlign = align; g.textBaseline = o.base || 'alphabetic'; if (o.shadow !== false) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillText(s, x + 2 * this.u, y + 2 * this.u); } g.fillStyle = col; g.fillText(s, x, y); },
  rrect(x, y, w, h, r, fill, stroke, lw = 2) { const g = this.g; g.beginPath(); g.roundRect(x, y, w, h, r * this.u); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw * this.u; g.stroke(); } }
};
