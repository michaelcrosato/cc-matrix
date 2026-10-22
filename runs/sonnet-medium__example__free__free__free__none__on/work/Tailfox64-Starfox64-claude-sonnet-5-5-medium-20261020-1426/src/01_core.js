import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ============================== utils ============================== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rsign = () => (Math.random() < 0.5 ? -1 : 1);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// closest distance^2 from point p to segment a-b
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function segDist2(a, b, p) {
  _sa.subVectors(b, a); _sb.subVectors(p, a);
  const l2 = _sa.lengthSq();
  const t = l2 > 0 ? clamp(_sb.dot(_sa) / l2, 0, 1) : 0;
  _sa.multiplyScalar(t).add(a);
  return _sa.distanceToSquared(p);
}

/* ============================== settings ============================== */
const SETTINGS_KEY = 'tailfox64.settings.v1';
const DEFAULTS = {
  invertX: false, invertY: false, pitchStyle: 0, deadzone: 0.15, sens: 1,
  music: 0.6, sfx: 0.9, shake: 1, rumble: true, bloom: true, aimAssist: true,
  difficulty: 1, glyphs: 0, hints: true, fovFx: true,
};
const S = Object.assign({}, DEFAULTS);
try { Object.assign(S, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

/* ============================== input ============================== */
const ACTIONS = ['fire', 'bomb', 'rollL', 'rollR', 'boost', 'brake', 'uturn', 'pause', 'confirm', 'back'];
const Input = {
  keys: new Set(), cur: {}, prev: {}, p: {}, nav: { up: false, down: false, left: false, right: false },
  rep: { up: 0, down: 0, left: 0, right: 0 }, held: { up: false, down: false, left: false, right: false },
  moveX: 0, moveY: 0, rawL: [0, 0], lastDevice: 'kb', activity: false, anyPressed: false,
  hasPad: false, hasKey: false, ai: null, chargeHeld: 0,
  init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.lastDevice = 'kb'; this.activity = true; this.hasKey = true;
      Snd.init();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.activity = true; });
    window.addEventListener('mousedown', () => { this.activity = true; Snd.init(); });
    window.addEventListener('gamepadconnected', () => { this.hasPad = true; this.activity = true; });
    window.addEventListener('gamepaddisconnected', () => { this.hasPad = !!this.getPad(); });
  },
  getPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of list) if (g && g.connected) return g;
    return null;
  },
  update(dt) {
    const pad = this.getPad();
    this.hasPad = !!pad;
    const k = (c) => this.keys.has(c);
    let kx = (k('ArrowRight') || k('KeyD') ? 1 : 0) - (k('ArrowLeft') || k('KeyA') ? 1 : 0);
    let ky = (k('ArrowUp') || k('KeyW') ? 1 : 0) - (k('ArrowDown') || k('KeyS') ? 1 : 0);
    let px = 0, py = 0, padAct = false;
    const b = {
      fire: k('Space') || k('KeyZ') || k('KeyJ'), bomb: k('KeyX') || k('KeyK'), rollL: k('KeyQ'), rollR: k('KeyE'),
      boost: k('ShiftLeft') || k('ShiftRight'), brake: k('KeyC') || k('ControlLeft'), uturn: k('KeyR'),
      pause: k('Escape') || k('KeyP'), confirm: k('Enter') || k('Space') || k('KeyZ'), back: k('Escape') || k('KeyX') || k('Backspace'),
    };
    let dl = false, dr = false, du = false, dd = false;
    this.rawL = [0, 0];
    if (pad) {
      const bt = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      const ax = (i) => pad.axes[i] || 0;
      let lx = ax(0), ly = ax(1), rx = ax(2), ry = ax(3);
      if (S.invertX) { lx = -lx; rx = -rx; }
      if (S.invertY) { ly = -ly; ry = -ry; }
      this.rawL = [lx, -ly];
      let sx = lx, sy = ly;
      if (Math.hypot(rx, ry) > Math.hypot(lx, ly)) { sx = rx; sy = ry; }
      const m = Math.hypot(sx, sy), dz = S.deadzone;
      if (m > dz) { const s = (m - dz) / (1 - dz) / m; px = sx * s; py = -sy * s; } else { px = 0; py = 0; }
      b.fire = b.fire || bt(0) || bt(2); b.bomb = b.bomb || bt(1); b.rollL = b.rollL || bt(4); b.rollR = b.rollR || bt(5);
      b.boost = b.boost || bt(7) || (pad.buttons[7] && pad.buttons[7].value > 0.5);
      b.brake = b.brake || bt(6) || (pad.buttons[6] && pad.buttons[6].value > 0.5);
      b.uturn = b.uturn || bt(3); b.pause = b.pause || bt(9); b.confirm = b.confirm || bt(0); b.back = b.back || bt(1);
      du = bt(12); dd = bt(13); dl = bt(14); dr = bt(15);
      for (let i = 0; i < pad.buttons.length; i++) if (pad.buttons[i].pressed) padAct = true;
      if (m > 0.45) padAct = true;
      if (padAct) { this.lastDevice = 'pad'; this.activity = true; Snd.init(); }
    }
    let mx = clamp(kx + px + (dr ? 1 : 0) - (dl ? 1 : 0), -1, 1), my = clamp(ky + py + (du ? 1 : 0) - (dd ? 1 : 0), -1, 1);
    // menu navigation edges with auto-repeat
    const want = { up: my > 0.6, down: my < -0.6, left: mx < -0.6, right: mx > 0.6 };
    for (const d of ['up', 'down', 'left', 'right']) {
      this.nav[d] = false;
      if (want[d]) {
        if (!this.held[d]) { this.nav[d] = true; this.rep[d] = 0.4; } else { this.rep[d] -= dt; if (this.rep[d] <= 0) { this.nav[d] = true; this.rep[d] = 0.11; } }
      }
      this.held[d] = want[d];
    }
    this.anyPressed = false;
    for (const a of ACTIONS) if (b[a]) this.anyPressed = true;
    if (this.ai) {
      // attract-mode driver: replaces gameplay input only
      const A = this.ai;
      mx = A.moveX; my = A.moveY;
      for (const a of ACTIONS) b[a] = !!A[a];
    }
    this.moveX = mx; this.moveY = my;
    for (const a of ACTIONS) { this.p[a] = !!b[a] && !this.prev[a]; this.prev[a] = !!b[a]; this.cur[a] = !!b[a]; }
  },
  rumble(strong, weak, ms) {
    if (!S.rumble || this.ai) return;
    const pad = this.getPad();
    const a = pad && pad.vibrationActuator;
    if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
  },
};
const GLYPHS = {
  pad: { fire: '✕', bomb: '○', roll: 'L1 / R1', boost: 'R2', brake: 'L2', uturn: '△', pause: 'OPTIONS', confirm: '✕', back: '○', move: 'L STICK', nav: 'D-PAD' },
  kb: { fire: 'SPACE', bomb: 'X', roll: 'Q / E', boost: 'SHIFT', brake: 'C', uturn: 'R', pause: 'ESC', confirm: 'ENTER', back: 'ESC', move: 'WASD', nav: 'ARROWS' },
};
function glyphText(a) { const m = S.glyphs === 1 ? 'pad' : S.glyphs === 2 ? 'kb' : Input.lastDevice; return GLYPHS[m][a]; }
const gl = (a) => `<b class="gl">${glyphText(a)}</b>`;

/* ============================== audio ============================== */
const Snd = {
  ctx: null, master: null, sfxG: null, musG: null, noiseBuf: null, chargeOsc: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.sfxG = this.ctx.createGain(); this.musG = this.ctx.createGain();
      this.sfxG.connect(comp); this.musG.connect(comp); comp.connect(this.master); this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 1.5; this.noiseBuf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      Music.start();
    } catch (e) { this.ctx = null; }
  },
  applyVolumes() { if (!this.ctx) return; this.sfxG.gain.value = S.sfx; this.musG.gain.value = S.music * 0.55; },
  tone(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + (o.at || 0), d = o.d || 0.15;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = o.t || 'square'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + d);
    const v = (o.v === undefined ? 0.2 : o.v);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.01, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(o.bus === 'mus' ? this.musG : this.sfxG);
    osc.start(t); osc.stop(t + d + 0.05);
  },
  noise(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + (o.at || 0), d = o.d || 0.3;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = this.ctx.createGain(); const v = o.v === undefined ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(o.bus === 'mus' ? this.musG : this.sfxG);
    src.start(t, Math.random()); src.stop(t + d + 0.05);
  },
  laser(l) { this.tone({ t: 'sawtooth', f: 1400 - l * 120, f2: 260, d: 0.13, v: 0.1 }); if (l > 1) this.tone({ t: 'square', f: 900, f2: 200, d: 0.1, v: 0.06, at: 0.02 }); },
  allyLaser() { this.tone({ t: 'triangle', f: 900, f2: 300, d: 0.09, v: 0.04 }); },
  lock() { this.tone({ t: 'square', f: 1200 + Math.random() * 200, d: 0.06, v: 0.1 }); },
  charge(on) {
    if (!this.ctx) return;
    if (on && !this.chargeOsc) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sawtooth';
      const t = this.ctx.currentTime; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 1.6);
      g.gain.value = 0.05; o.connect(g); g.connect(this.sfxG); o.start(); this.chargeOsc = { o, g };
    } else if (!on && this.chargeOsc) { try { this.chargeOsc.o.stop(); } catch (e) { /* ignore */ } this.chargeOsc = null; }
  },
  missile() { this.noise({ d: 0.35, f: 3000, f2: 400, v: 0.18, ft: 'bandpass' }); this.tone({ t: 'sawtooth', f: 300, f2: 900, d: 0.25, v: 0.08 }); },
  hit() { this.tone({ t: 'square', f: 1800, f2: 900, d: 0.05, v: 0.08 }); },
  explode(size = 1) {
    this.noise({ d: 0.35 + size * 0.35, f: 2400, f2: 120, v: 0.3 + 0.1 * size });
    this.tone({ t: 'sine', f: 120, f2: 30, d: 0.3 + size * 0.2, v: 0.45 });
  },
  bomb() { this.noise({ d: 1.6, f: 5000, f2: 60, v: 0.6 }); this.tone({ t: 'sine', f: 200, f2: 20, d: 1.4, v: 0.7 }); this.tone({ t: 'sawtooth', f: 80, f2: 600, d: 0.5, v: 0.12 }); },
  pickup(big) { [0, 4, 7, 12].forEach((s, i) => this.tone({ t: 'triangle', f: 520 * Math.pow(2, s / 12), d: 0.18, v: 0.15, at: i * 0.07 })); if (big) this.tone({ t: 'triangle', f: 1568, d: 0.5, v: 0.12, at: 0.3 }); },
  damage() { this.noise({ d: 0.4, f: 900, f2: 100, v: 0.5 }); this.tone({ t: 'sawtooth', f: 160, f2: 50, d: 0.3, v: 0.25 }); },
  warn() { this.tone({ t: 'square', f: 880, d: 0.12, v: 0.12 }); this.tone({ t: 'square', f: 660, d: 0.12, v: 0.12, at: 0.16 }); },
  roll() { this.noise({ d: 0.5, f: 600, f2: 3000, v: 0.14, ft: 'bandpass' }); },
  deflect() { this.tone({ t: 'triangle', f: 1600, f2: 2400, d: 0.1, v: 0.12 }); },
  boost() { this.noise({ d: 0.7, f: 400, f2: 2500, v: 0.18, ft: 'bandpass' }); },
  brake() { this.noise({ d: 0.5, f: 2500, f2: 300, v: 0.12, ft: 'bandpass' }); },
  uturn() { this.noise({ d: 1.0, f: 500, f2: 2400, v: 0.2, ft: 'bandpass' }); },
  voice(p = 1) { this.tone({ t: 'square', f: (260 + Math.random() * 160) * p, d: 0.05, v: 0.045 }); },
  comm() { this.tone({ t: 'square', f: 1500, d: 0.05, v: 0.07 }); this.tone({ t: 'square', f: 2000, d: 0.05, v: 0.07, at: 0.07 }); },
  menu() { this.tone({ t: 'square', f: 700, d: 0.04, v: 0.08 }); },
  select() { this.tone({ t: 'square', f: 600, d: 0.06, v: 0.1 }); this.tone({ t: 'square', f: 1000, d: 0.1, v: 0.1, at: 0.06 }); },
  back() { this.tone({ t: 'square', f: 500, f2: 300, d: 0.1, v: 0.1 }); },
  clear() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone({ t: 'square', f: 440 * Math.pow(2, s / 12), d: 0.22, v: 0.1, at: i * 0.12 })); },
  shield() { this.tone({ t: 'sine', f: 400, f2: 1200, d: 0.12, v: 0.12 }); },
};

/* ---- procedural music: 16th-note step sequencer ---- */
const MIN = [0, 3, 7], MAJ = [0, 4, 7];
const TRACKS = {
  title: { bpm: 92, root: 50, bars: [[0, MIN], [-4, MAJ], [3, MAJ], [-2, MAJ]], bass: 'x..x..x.x..x..x.', arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1], k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', lead: [14, 12, 14, 17, 14, 12, 10, 12], pad: true },
  calm: { bpm: 126, root: 52, bars: [[0, MAJ], [5, MAJ], [7, MAJ], [5, MAJ]], bass: 'x.xxx.xxx.xxx.xx', arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2], k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx', lead: [12, 14, 16, 14, 12, 16, 19, 16] },
  combat: { bpm: 140, root: 45, bars: [[0, MIN], [-4, MAJ], [-9, MAJ], [-2, MAJ]], bass: 'xx.xx.xxxx.xx.xx', arp: [0, 1, 2, 1, 2, 1, 0, 1, 0, 1, 2, 1, 2, 1, 0, 2], k: 'x..xx..xx..xx..x', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', lead: [12, 15, 14, 12, 10, 12, 14, 15] },
  boss: { bpm: 154, root: 43, bars: [[0, MIN], [1, MAJ], [0, MIN], [-2, MAJ]], bass: 'xxxxxxxxxxxxxxxx', arp: [2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2], k: 'x.x.x.x.x.x.x.xx', s: '....x...x...x..x', h: 'x.xxx.xxx.xxx.xx', lead: [15, 14, 12, 14, 15, 17, 15, 14] },
  arena: { bpm: 148, root: 47, bars: [[0, MIN], [-4, MAJ], [-7, MAJ], [-5, MAJ]], bass: 'x.xxx.xxx.xxx.xx', arp: [0, 1, 2, 0, 1, 2, 1, 0, 0, 1, 2, 0, 1, 2, 1, 2], k: 'x...x...x..xx...', s: '....x.......x.x.', h: 'x.x.xxx.x.x.xxxx', lead: [12, 14, 15, 19, 17, 15, 14, 12] },
  victory: { bpm: 108, root: 55, bars: [[0, MAJ], [5, MAJ], [7, MAJ], [0, MAJ]], bass: 'x...x...x...x...', arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1], k: 'x.......x.......', s: '........x.......', h: 'x...x...x...x...', lead: [12, 16, 19, 16, 12, 16, 19, 24] },
};
const Music = {
  name: null, step: 0, next: 0, timer: null,
  start() { if (!this.timer) this.timer = setInterval(() => this.tick(), 25); },
  set(name) { if (this.name === name) return; this.name = name; this.step = 0; if (Snd.ctx) this.next = Snd.ctx.currentTime + 0.1; },
  tick() {
    const c = Snd.ctx; if (!c || !this.name || !TRACKS[this.name]) return;
    const T = TRACKS[this.name];
    if (this.next < c.currentTime - 0.5) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.15) { this.play(T, this.step, this.next - c.currentTime); this.next += 60 / T.bpm / 4; this.step++; }
  },
  play(T, st, at) {
    const s16 = st % 16, bar = Math.floor(st / 16) % T.bars.length, [r, ch] = T.bars[bar];
    const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);
    if (T.bass[s16] === 'x') Snd.tone({ t: 'sawtooth', f: mf(T.root + r - 12), d: 0.2, v: 0.2, at, bus: 'mus' });
    const an = T.root + r + 12 + ch[T.arp[s16] % 3] + (s16 % 8 === 7 ? 12 : 0);
    Snd.tone({ t: 'square', f: mf(an), d: 0.11, v: 0.05, at, bus: 'mus' });
    if (T.pad && s16 === 0) ch.forEach((n) => Snd.tone({ t: 'triangle', f: mf(T.root + r + n), d: 2.3, v: 0.07, at, bus: 'mus' }));
    if (T.lead && s16 % 2 === 0) {
      const li = Math.floor(s16 / 2) % 8;
      if (bar % 2 === 1 || li % 3 === 0) Snd.tone({ t: 'triangle', f: mf(T.root + r + T.lead[li] + (bar % 2 ? 12 : 0)), d: 0.22, v: 0.09, at, bus: 'mus' });
    }
    if (T.k[s16] === 'x') Snd.tone({ t: 'sine', f: 140, f2: 40, d: 0.14, v: 0.5, at, bus: 'mus' });
    if (T.s[s16] === 'x') Snd.noise({ d: 0.13, f: 2200, ft: 'highpass', v: 0.2, at, bus: 'mus' });
    if (T.h[s16] === 'x') Snd.noise({ d: 0.03, f: 7000, ft: 'highpass', v: 0.07, at, bus: 'mus' });
  },
};
