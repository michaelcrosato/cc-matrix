// Fit Getaway — a fitness comedy inspired by Wii Fit. Lean the Dot. Keep it in the circle.
// Controls: Left stick / WASD / mouse lean; X/A/Enter confirm; O/B/Esc back; Options/P pause.
import { Engine, withUrlOptions, PALETTE, THREE, toonMaterial, HERO_MODEL, HERO_RIG, HERO_CLIPS, compileClips, PlatformerCharacter, readMoveInput, ContactShadow, setLookLayer, mergeStaticMeshes, LOOK_PRESETS, parseSong, validateClip, applySky, skyAt, buildModel, model, checkModel } from '../pixel-engine.js';
import { TITLE, TAGLINE } from './data/title.js';
import { Dot, Bot, mulberry, starsFor } from './core/dot.js';
import { makeTunables, TUNABLE_TABS, TUNABLE_DEFAULTS } from './core/tunables.js';
import { syllabify, renderVoice, SPEAKERS } from './audio/voice.js';
import { ACTIVITIES, ACT_BY_ID, STATIONS, WEEK, QUESTIONS, UNLOCKS, CLASSMATES, LINES, RESULT_LINES, allLines } from './data/content.js';
import { ABOUT } from './data/about.js';
import { say, measure, wrap } from './ui/font.js';

const { BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, Mesh, Group, Vector3, Color } = THREE;
const SAVE_KEY = 'fit-getaway-save-v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Songs (all in code, loud tracks; bus at 10%) ----------
function song(bpm, leadNotes, bassNotes, wave = 'triangle') {
  return { bpm, stepsPerBeat: 4, tracks: { lead: { wave, decay: 0.35, volume: 0.6 }, bass: { wave: 'triangle', decay: 0.3, volume: 0.5 } }, patterns: { a: { lead: leadNotes, bass: bassNotes } }, order: ['a'], loop: true };
}
export const SONGS = {
  title: song(92, 'C4 . E4 . G4 . E4 . A4 . G4 . E4 . . .', 'C2 . . . G2 . . . A2 . . . G2 . . .'),
  still: song(60, 'C4 . . . E4 . . . G4 . . . . . . .', 'C2 . . . . . . . G2 . . . . . . .'),
  rep: song(110, 'C4 C4 . E4 . G4 . A4 . G4 E4 . C4 .', 'C2 . C2 . F2 . C2 . G2 . C2 . G2 .', 'square'),
  beat: song(104, 'C5 . C5 . E5 . G5 . C5 . E5 . G5 .', 'C2 C2 C2 C2 F2 F2 G2 G2 C2 C2 C2 C2 G2 G2', 'square'),
  step: song(104, 'C4 E4 G4 E4 A4 G4 E4 C4 D4 E4 G4 A4 G4 E4 D4 .', 'C2 . G2 . A2 . G2 . F2 . G2 . C2 . G2 .', 'square'),
  lagoon: song(120, 'E4 . G4 . A4 . G4 . E4 . D4 . E4 . . .', 'C2 . G2 . A2 . G2 . C2 . G2 . C2 . . .', 'triangle'),
  jog: song(112, 'C4 E4 G4 C5 G4 E4 C4 E4 D4 F4 A4 G4 E4 D4 C4 .', 'C2 . G2 . C2 . G2 . F2 . G2 . C2 . G2 .'),
  evening: song(70, 'E5 . D5 . C5 . G4 . A4 . C5 . E5 . . .', 'C2 . . . G2 . . . A2 . . . G2 . . .'),
  stand: song(60, 'C4 . . . . . . . G4 . . . . . . .', 'C2 . . . . . . . . . . . . . . .'),
};
export const SFX_DEFS = {
  tick: { wave: 'square', freq: 1200, decay: 0.05, volume: 0.4 },
  chimeIn: { wave: 'sine', freq: 880, decay: 0.3, volume: 0.5, arp: [0, 7], arpRate: 0.07 },
  chimeOut: { wave: 'sine', freq: 520, decay: 0.2, volume: 0.4 },
  wobble: { wave: 'saw', freq: 180, freqEnd: 120, decay: 0.25, volume: 0.35 },
  repTick: { wave: 'square', freq: 660, decay: 0.08, volume: 0.4 },
  bonk: { wave: 'sine', freq: 220, freqEnd: 90, decay: 0.2, volume: 0.6 },
  thwap: { wave: 'noise', freq: 900, decay: 0.15, volume: 0.5 },
  splash: { wave: 'noise', freq: 500, decay: 0.5, volume: 0.5 },
  gust: { wave: 'noise', freq: 300, decay: 0.6, volume: 0.3 },
  squawk: { wave: 'saw', freq: 900, freqEnd: 1400, decay: 0.2, volume: 0.4 },
  drip: { wave: 'sine', freq: 700, freqEnd: 400, decay: 0.15, volume: 0.4 },
  star: { wave: 'triangle', freq: 990, decay: 0.3, volume: 0.5, arp: [0, 4, 7], arpRate: 0.06 },
  ow: { wave: 'square', freq: 300, freqEnd: 200, decay: 0.2, volume: 0.4 },
};

// ---------- Clips ----------
const hold = (name, pose) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]] });
export const EXTRA_CLIPS = [
  hold('Tree', { Pelvis: { p: [0.03, -0.02, 0] }, ArmR: [-172, 0, -6], ArmL: [-172, 0, 6] }),
  hold('Heron', { Pelvis: { p: [0, -0.02, 0] }, Torso: [10, 0, 0], ArmR: [-20, 0, -80], ArmL: [-20, 0, 80] }),
  hold('Warrior', { Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }),
  hold('Chair', { Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }),
  hold('Fold', { Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6] }),
  hold('Plank', { Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] }, Head: [-48, 0, 0], ArmR: [-63, 0, -5], ArmL: [-63, 0, 5] }),
  { name: 'SquatRep', frames: 30, loop: false, keys: [[0, { Pelvis: { p: [0, -0.02, 0] }, ArmR: [6, 0, -9], ArmL: [6, 0, 9] }], [30, { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] }]] },
  { name: 'LungeRep', frames: 30, loop: false, keys: [[0, { Pelvis: { p: [0, -0.02, 0] }, ArmR: [6, 0, -9], ArmL: [6, 0, 9] }], [30, { Pelvis: { p: [0, -0.24, 0] }, Torso: [6, 0, 0], ArmR: [-60, 0, -10], ArmL: [-60, 0, 10] }]] },
  { name: 'Press', frames: 30, loop: false, keys: [[0, { Pelvis: { p: [0, -0.02, 0] }, ArmR: [-40, 0, -10], ArmL: [-40, 0, 10] }], [30, { Pelvis: { p: [0, 0, 0] }, ArmR: [-175, 0, -6], ArmL: [-175, 0, 6] }]] },
  { name: 'Jog', frames: 16, loop: true, keys: [[0, { Pelvis: { p: [0, 0, 0] }, ArmR: [-30, 0, -10], ArmL: [30, 0, 10] }], [8, { Pelvis: { p: [0, 0.03, 0] }, ArmR: [30, 0, -10], ArmL: [-30, 0, 10] }], [16, { Pelvis: { p: [0, 0, 0] }, ArmR: [-30, 0, -10], ArmL: [30, 0, 10] }]] },
];
export const ALL_CLIP_DEFS = [...HERO_CLIPS, ...EXTRA_CLIPS];

// ---------- Ounce model def (PLAN section 13, verbatim shape) ----------
export const OUNCE_DEF = model({
  id: 'ounce', about: 'Ounce: a mint retro bathroom scale whose round dial is its face', tags: ['character'], size: [1.1, 1.05, 1.1],
  palette: { body: 'cyan', base: 'teal', tread: 'sky', face: 'white', rim: 'slate', tick: 'mist', needle: 'red', eye: 'ink' },
  parts: [
    { name: 'base', box: [1.04, 0.08, 1.04], at: [0, 0.04, 0], c: 'base' },
    { name: 'plate', box: [0.96, 0.2, 0.96], at: [0, 0.18, 0], c: 'body' },
    { mirror: [{ name: 'tread', box: [0.3, 0.03, 0.42], at: [0.22, 0.295, -0.22], c: 'tread' }], axis: 'x' },
    { group: [
        { name: 'neck', box: [0.5, 0.42, 0.14], at: [0, 0.21, 0], c: 'body' },
        { group: [
            { name: 'rim', cyl: [0.78, 0.1, 0.78], at: [0, 0, 0], c: 'rim', seg: 14 },
            { name: 'dial', cyl: [0.66, 0.04, 0.66], at: [0, 0.06, 0], c: 'face', seg: 14 },
            ...[-60, -30, 0, 30, 60].map((a) => ({ box: [0.06, 0.03, 0.09], at: [Math.sin(a * Math.PI / 180) * 0.26, 0.085, -Math.cos(a * Math.PI / 180) * 0.26], rot: [0, -a, 0], c: 'tick' })),
            { mirror: [{ name: 'eye', box: [0.08, 0.03, 0.11], at: [0.12, 0.09, -0.07], c: 'eye' }], axis: 'x' },
            { group: [{ name: 'needleBar', box: [0.06, 0.03, 0.22], at: [0, 0, 0.1], c: 'needle' }, { name: 'hub', cyl: [0.07, 0.04, 0.07], at: [0, 0, 0], c: 'needle', seg: 8 }], name: 'needle', pivot: true, at: [0, 0.1, 0.1], rot: [0, 180, 0] },
          ], name: 'face', pivot: true, at: [0, 0.5, 0.08], rot: [72, 0, 0] },
      ], name: 'head', pivot: true, at: [0, 0.26, 0.2] },
  ],
});

// ---------- Save / App ----------
function defaultSettings() { return { music: 0.10, sfx: 0.8, voice: 0.8, glyphs: 'ps', gentle: false, mouseRadius: 70, stepOffset: 0, reduceFlash: false, look: 'Default' }; }
function newSlot(name, avatarIdx) {
  const avatars = [
    { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' },
    { skin: 'sand', top: 'lime', bottom: 'navy', shoe: 'white', hair: 'orange', headband: null },
    { skin: 'orange', top: 'cyan', bottom: 'white', shoe: 'ink', hair: 'ink', headband: 'cyan' },
    { skin: 'sand', top: 'red', bottom: 'ink', shoe: 'white', hair: 'plum', headband: null },
    { skin: 'mist', top: 'orange', bottom: 'teal', shoe: 'white', hair: 'sand', headband: 'lime' },
    { skin: 'sand', top: 'plum', bottom: 'sand', shoe: 'red', hair: 'teal', headband: 'white' },
  ];
  return { name: name || 'Guest', avatar: { ...avatars[avatarIdx || 0] }, avatarIdx: avatarIdx || 0, day: 1, week: 1, drips: 0, stars: {}, best: {}, doneToday: [], totalStars: 0, ages: [], testT: [], confession: false, unlocked: [], weighed: false, goalPaid: false, played: {} };
}
class Store {
  constructor() { this.mem = null; this.ok = true; try { const t = '__fg_test__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); } catch { this.ok = false; } }
  load() {
    try { if (this.ok) { const s = localStorage.getItem(SAVE_KEY); if (s) return JSON.parse(s); } } catch { /* fall through */ }
    return this.mem || { version: 1, slots: [null, null, null], settings: defaultSettings() };
  }
  save(data) { this.mem = data; try { if (this.ok) localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* in-memory only */ } }
}
export const store = new Store();
export const App = {
  data: store.load(), tunables: makeTunables(), slotIndex: 0, session: null, sessionInfo: null,
  device: 'keyboard', idleTime: 0, botSkill: 'average', godMode: false, timeScalePref: 1, hideHud: false,
  promptState: 'keyboard', lastInputDesc: 'none',
  get settings() { return this.data.settings || (this.data.settings = defaultSettings()); },
  slot() { return this.data.slots[this.slotIndex]; },
  ensureSlot() { if (!this.data.slots[this.slotIndex]) this.data.slots[this.slotIndex] = newSlot('Guest', 0); return this.data.slots[this.slotIndex]; },
  persist() { store.save(this.data); },
  resetSave() { this.data = { version: 1, slots: [null, null, null], settings: defaultSettings() }; this.persist(); },
  state() {
    const s = this.slot();
    return { title: TITLE, device: this.device, prompt: this.promptState, slot: this.slotIndex, day: s?.day ?? null, week: s?.week ?? null, drips: s?.drips ?? 0, stars: s?.stars ?? {}, tunables: this.tunables.changed(), session: !!this.session, botSkill: this.botSkill };
  },
};
if (typeof globalThis !== 'undefined') globalThis.__GAME__ = App;

// ---------- Input / device ----------
const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
export function initInput(ctx) { try { ctx.input.gamepadDeadzone = 0.12; ctx.input.gamepadButtons = { ...PAD_MAP }; } catch { /* headless tolerant */ } }
export function updateDevice(ctx) {
  try {
    const st = ctx.input.state();
    const held = st.held || [];
    if (held.some(k => k.startsWith('Pad'))) App.device = 'pad';
    else if (held.some(k => k.startsWith('Mouse')) || (ctx.input.mouseDelta && (Math.abs(ctx.input.mouseDelta.x) > 2 || Math.abs(ctx.input.mouseDelta.y) > 2))) App.device = 'mouse';
    else if (held.length) App.device = 'keyboard';
    const ax = ctx.input.moveAxis();
    if (Math.hypot(ax.x, ax.y) > 0.3 && App.device !== 'mouse') { /* stick counts as pad only with pad held; keep keyboard otherwise */ }
    App.promptState = App.device;
    if (held.length || ctx.input.wasPressed('MouseLeft')) App.idleTime = 0;
  } catch { /* headless */ }
}
export function confirmPressed(ctx) { return ctx.input.wasPressed('PadCross') || ctx.input.wasPressed('Enter') || ctx.input.wasPressed('Space') || ctx.input.wasPressed('KeyE') || ctx.input.wasPressed('MouseLeft'); }
export function backPressed(ctx) { return ctx.input.wasPressed('PadCircle') || ctx.input.wasPressed('Escape') || ctx.input.wasPressed('Backspace') || ctx.input.wasPressed('MouseRight'); }
export function pausePressed(ctx) {
  // Respect hub chord: ignore Options while Create held.
  try { if (ctx.input.isDown('PadCreate')) return false; } catch { /* ignore */ }
  return ctx.input.wasPressed('PadOptions') || ctx.input.wasPressed('KeyP') || ctx.input.wasPressed('Escape');
}
export function glyphFor(action) {
  const ps = App.settings.glyphs === 'ps';
  if (App.device === 'pad') return action === 'confirm' ? (ps ? '[X]' : '[A]') : action === 'back' ? (ps ? '[O]' : '[B]') : action === 'pause' ? '[Options]' : '[Stick]';
  if (App.device === 'mouse') return action === 'confirm' ? '[Click]' : action === 'back' ? '[R-Click]' : '[Pause icon]';
  return action === 'confirm' ? '[Enter]' : action === 'back' ? '[Esc]' : '[P]';
}
// Keyboard lean with smoothing + Shift half lean; mouse lean from pointer offset to dial centre.
export class LeanInput {
  constructor() { this.kx = 0; this.ky = 0; this.mode = 'keys'; this.mx = 0; this.my = 0; }
  read(ctx, dt, dialCX, dialCY) {
    const input = ctx.input;
    const ax = input.moveAxis();
    let tx = 0, ty = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) tx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) tx += 1;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) ty += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) ty -= 1;
    if (Math.abs(ax.x) > 0.12 || Math.abs(ax.y) > 0.12) { tx = ax.x; ty = -ax.y; this.mode = 'stick'; }
    const half = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) ? 0.5 : 1;
    tx *= half; ty *= half;
    const atk = dt / 0.10, rel = dt / 0.06;
    const step = (cur, tgt) => cur + clamp(tgt - cur, -(tgt === 0 ? rel : atk) * Math.sign(tgt - cur || 1) * Math.abs(tgt - cur || 1), (tgt === 0 ? rel : atk)) ;
    // simpler exponential smoothing toward target
    const k = 1 - Math.exp(-dt / (tx !== 0 || ty !== 0 ? 0.10 : 0.06));
    if (tx !== 0 || ty !== 0 || this.mode !== 'mouse') { this.kx += (tx - this.kx) * k; this.ky += (ty - this.ky) * k; }
    // Mouse: pointer offset from dial centre / radius, as force.
    try {
      const p = input.pointer;
      if (p && p.over && (Math.abs(input.mouseDelta?.x || 0) > 0 || Math.abs(input.mouseDelta?.y || 0) > 0)) this.mode = 'mouse';
      if (this.mode === 'mouse' && p && dialCX !== undefined) {
        const hud = ctx.hud; const axp = (p.x + 1) / 2 * hud.width, ayp = (1 - p.y) / 2 * hud.height;
        const R = App.tunables.mouseLeanRadius;
        this.mx = clamp((axp - dialCX) / R, -1, 1); this.my = clamp(-(ayp - dialCY) / R, -1, 1);
        const d = Math.hypot(this.mx, this.my); if (d > 1) { this.mx /= d; this.my /= d; }
        return { x: this.mx, y: this.my };
      }
    } catch { /* headless */ }
    if ((tx !== 0 || ty !== 0) && this.mode === 'mouse') this.mode = 'keys';
    const d = Math.hypot(this.kx, this.ky); if (d > 1) { return { x: this.kx / d, y: this.ky / d }; }
    return { x: this.kx, y: this.ky };
  }
}

// ---------- HUD helpers ----------
export function drawText(hud, x, y, text, opts = {}) { say(hud, x, y, String(text), opts); }
export function drawCentered(hud, y, text, opts = {}) { const w = measure(text, opts.scale || 1); say(hud, Math.round((hud.width - w) / 2), y, String(text), opts); }
export function panel(hud, x, y, w, h, fill = 'ink') { hud.rect(x, y, w, h, fill); }
export class Menu {
  constructor(items) { this.items = items; this.index = 0; this.repeat = 0; }
  update(ctx, dt) {
    const n = this.items.length; if (!n) return null;
    let moved = false;
    if (ctx.input.wasPressed('ArrowUp') || ctx.input.wasPressed('KeyW') || ctx.input.wasPressed('PadUp')) { this.index = (this.index - 1 + n) % n; moved = true; }
    if (ctx.input.wasPressed('ArrowDown') || ctx.input.wasPressed('KeyS') || ctx.input.wasPressed('PadDown')) { this.index = (this.index + 1) % n; moved = true; }
    const ax = ctx.input.moveAxis();
    this.repeat -= dt;
    if (this.repeat <= 0 && Math.abs(ax.y) > 0.6) { this.index = (this.index + (ax.y < 0 ? 1 : -1) + n) % n; this.repeat = 0.22; moved = true; }
    // hover moves focus
    try {
      const p = ctx.input.pointer;
      if (p && p.over) {
        const axp = (p.x + 1) / 2 * ctx.hud.width, ayp = (1 - p.y) / 2 * ctx.hud.height;
        this.items.forEach((it, i) => { if (it._rect && axp >= it._rect[0] && axp <= it._rect[0] + it._rect[2] && ayp >= it._rect[1] && ayp <= it._rect[1] + it._rect[3]) this.index = i; });
      }
    } catch { /* headless */ }
    if (moved) { try { ctx.audio.play('tick', { volume: 0.3 }); } catch { /* ignore */ } }
    if (confirmPressed(ctx)) return this.items[this.index]?.id ?? null;
    if (ctx.input.wasPressed('MouseLeft')) return this.items[this.index]?.id ?? null;
    return null;
  }
  draw(hud, x, y, { scale = 1, gap = 12, width = 220 } = {}) {
    this.items.forEach((it, i) => {
      const yy = y + i * gap;
      it._rect = [x - 4, yy - 2, width, gap];
      if (i === this.index) hud.rect(x - 4, yy - 2, width, gap - 2, 'teal');
      say(hud, x, yy, (i === this.index ? '> ' : '  ') + it.label, { color: it.disabled ? 'slate' : 'white', scale });
    });
  }
}
// Dialogue: typewriter ~40cps with voice syllables.
export class Dialogue {
  constructor(ctx) { this.ctx = ctx; this.queue = []; this.cur = null; this.chars = 0; this.done = null; }
  say(speaker, text, done) { this.queue.push({ speaker, text }); if (done) this.done = done; if (!this.cur) this.next(); }
  sayAll(lines, done) { for (const [s, t] of lines) this.queue.push({ speaker: s, text: t }); this.done = done; if (!this.cur) this.next(); }
  next() {
    this.cur = this.queue.shift() || null; this.chars = 0;
    if (this.cur) {
      try {
        const ac = this.ctx.audio?.context; const bus = this.ctx.audio?.buses?.sfx;
        if (ac && bus && this.cur.speaker !== 'Kevin') renderVoice(ac, bus, syllabify(this.cur.text, this.cur.speaker), this.cur.speaker);
        if (this.cur.speaker === 'Kevin') this.ctx.audio.play('squawk');
      } catch { /* no audio yet */ }
    } else if (this.done) { const d = this.done; this.done = null; d(); }
  }
  get active() { return !!this.cur; }
  update(ctx, dt) {
    if (!this.cur) return;
    const fast = ctx.input.isDown('PadCross') || ctx.input.isDown('Space') || ctx.input.isDown('Enter');
    this.chars += dt * (fast ? 200 : 40);
    if (confirmPressed(ctx)) { if (this.chars < this.cur.text.length) this.chars = this.cur.text.length; else this.next(); }
  }
  draw(hud) {
    if (!this.cur) return;
    const h = 44; const y = hud.height - h - 6;
    hud.rect(6, y, hud.width - 12, h, 'white');
    hud.rect(6, y, hud.width - 12, 10, 'teal');
    say(hud, 10, y + 1, this.cur.speaker, { color: 'white', scale: 1 });
    const shown = this.cur.text.slice(0, Math.floor(this.chars));
    wrap(shown, 52).forEach((ln, i) => say(hud, 10, y + 14 + i * 9, ln, { color: 'ink', shadow: 'white', scale: 1 }));
    say(hud, hud.width - 60, y + h - 10, glyphFor('confirm') + ' next', { color: 'ink', shadow: 'white' });
  }
}
// ---------- Audio helpers ----------
let audioBooted = false;
export function bootAudio(ctx) {
  if (audioBooted) return; audioBooted = true;
  try {
    for (const [k, v] of Object.entries(SFX_DEFS)) ctx.audio.register(k, v);
    ctx.audio.setVolume('music', App.settings.music ?? 0.10);
    ctx.audio.setVolume('sfx', App.settings.sfx ?? 0.8);
  } catch { /* headless */ }
}
export function playSong(ctx, name) { try { if (name && SONGS[name]) ctx.audio.playMusic(SONGS[name], name); else ctx.audio.playMusic(null); } catch { /* headless */ } }
export function speak(ctx, speaker, text) { try { const ac = ctx.audio?.context; const bus = ctx.audio?.buses?.sfx; if (ac && bus) renderVoice(ac, bus, syllabify(text, speaker), speaker); } catch { /* ignore */ } }
// ---------- Avatar / Ounce / world builders ----------
export function dressAvatar(root, look) {
  try {
    const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
    const SLOT = { Overalls: 'bottom', ThighR: 'bottom', ThighL: 'bottom', Shirt: 'top', SleeveR: 'top', SleeveL: 'top', GloveR: 'skin', GloveL: 'skin', Face: 'skin', ShoeR: 'shoe', ShoeL: 'shoe' };
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (hide.has(o.name)) { o.visible = false; return; }
      if (SLOT[o.name] && look[SLOT[o.name]]) { try { o.material = toonMaterial(PALETTE[look[SLOT[o.name]]]); } catch { /* palette name */ } }
      o.castShadow = false;
    });
    // Dot eyes on the face front (+Z local) so the front reads at gameplay framing.
    const face = root.getObjectByName('Face');
    if (face && face.parent) {
      face.geometry.computeBoundingBox();
      const b = face.geometry.boundingBox, s = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
      for (const sx of [-1, 1]) { const e = new Mesh(new BoxGeometry(0.055, 0.09, 0.03), toonMaterial(PALETTE.ink)); e.position.set(c.x + sx * s.x * 0.2, c.y + 0.02, c.z - s.z * 0.48); face.parent.add(e); }
      const mouth = new Mesh(new BoxGeometry(0.1, 0.022, 0.03), toonMaterial(PALETTE.ink)); mouth.position.set(c.x, c.y - s.y * 0.2, c.z - s.z * 0.47); face.parent.add(mouth);
    }
  } catch { /* model shape differs: leave as-is */ }
}
export async function makeAvatar(ctx, look, clipName) {
  let model = null, mixer = null, actions = {};
  try {
    const loaded = await ctx.loadModel(HERO_MODEL, { castShadow: false });
    model = loaded.scene; setLookLayer(model, 'actors'); dressAvatar(model, look || {});
    const clips = compileClips(ALL_CLIP_DEFS, HERO_RIG, model);
    mixer = new THREE.AnimationMixer(model);
    for (const c of clips) { const a = mixer.clipAction(c); actions[c.name] = a; }
    const start = actions[clipName] || actions.Idle || Object.values(actions)[0];
    if (start) { start.play(); }
  } catch {
    model = new Group();
    const body = new Mesh(new BoxGeometry(0.5, 0.9, 0.3), toonMaterial(PALETTE.cyan)); body.position.y = 0.8; model.add(body);
    const head = new Mesh(new SphereGeometry(0.28, 10, 8), toonMaterial(PALETTE.sand)); head.position.y = 1.5; model.add(head);
  }
  try { for (const sx of [-1, 1]) { const e = new Mesh(new BoxGeometry(0.06, 0.1, 0.03), toonMaterial(PALETTE.ink)); e.position.set(sx * 0.12, 1.42, -0.17); model.add(e); } } catch { /* fallback avatar already simple */ }
  return { model, mixer, actions, play(name) { try { for (const a of Object.values(actions)) a.stop(); const a = actions[name]; if (a) { a.reset().play(); } } catch { /* ignore */ } }, setTime(name, t) { try { const a = actions[name]; if (a) { a.paused = true; a.time = t; mixer.update(0); } } catch { /* ignore */ } } };
}
export function makeOunceMesh(scale = 1) {
  let obj = null;
  try { const b = buildModel(OUNCE_DEF); obj = b.object; } catch { obj = null; }
  if (!obj) {
    obj = new Group();
    const base = new Mesh(new BoxGeometry(1, 0.25, 1), toonMaterial(PALETTE.cyan)); base.position.y = 0.15; obj.add(base);
    const dial = new Mesh(new CylinderGeometry(0.4, 0.4, 0.12, 14), toonMaterial(PALETTE.white)); dial.rotation.x = Math.PI / 2.5; dial.position.set(0, 0.6, 0.2); dial.name = 'ol-dial'; obj.add(dial);
    const needle = new Mesh(new BoxGeometry(0.05, 0.3, 0.05), toonMaterial(PALETTE.red)); needle.position.set(0, 0.6, 0.28); needle.name = 'needle'; obj.add(needle);
  }
  obj.scale.setScalar(scale);
  let needle = null; try { needle = obj.getObjectByName('needle'); } catch { /* ignore */ }
  return { object: obj, needle, setMood(v) { if (needle) needle.rotation.y = v; } };
}
export function groundBlock(ctx, [x, y, z], [w, h, d], colorName, { collide = true } = {}) {
  if (collide) { try { ctx.physics.addStaticBox({ position: [x, y, z], halfExtents: [w / 2, h / 2, d / 2] }); } catch { /* headless physics still present */ } }
  const m = new Mesh(new BoxGeometry(w, h, d), toonMaterial(PALETTE[colorName] || PALETTE.white));
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = false; return m;
}
export function applyLook(ctx) {
  try { const map = { Default: LOOK_PRESETS.none, storybook: LOOK_PRESETS.storybook, arcade: LOOK_PRESETS.arcade, handheld: LOOK_PRESETS.handheld }; const l = map[App.settings.look]; if (l) ctx.engine.setLook(l); } catch { /* ignore */ }
}
// Dial drawing (shared): ring + dot + crosshair. Returns dial centre.
export function drawDial(hud, cx, cy, r, dot, ringR, opts = {}) {
  // outer dial
  for (let ring = 0; ring < 3; ring++) { const rr = r - ring * 1; hud.rect(cx - rr, cy - 1, rr * 2, 2, 'slate'); hud.rect(cx - 1, cy - rr, 2, rr * 2, 'slate'); }
  hud.rect(cx - r, cy - r, r * 2, 2, 'slate'); hud.rect(cx - r, cy + r - 2, r * 2, 2, 'slate'); hud.rect(cx - r, cy - r, 2, r * 2, 'slate'); hud.rect(cx + r - 2, cy - r, 2, r * 2, 'slate');
  const rr2 = ringR * r;
  const col = opts.inRing ? 'lime' : 'orange';
  hud.rect(cx - rr2, cy - rr2, rr2 * 2, 2, col); hud.rect(cx - rr2, cy + rr2 - 2, rr2 * 2, 2, col); hud.rect(cx - rr2, cy - rr2, 2, rr2 * 2, col); hud.rect(cx + rr2 - 2, cy - rr2, 2, rr2 * 2, col);
  if (opts.target) { const tx = cx + opts.target.x * r, ty = cy - opts.target.y * r; hud.rect(tx - 3, ty - 1, 7, 2, 'cyan'); hud.rect(tx - 1, ty - 3, 2, 7, 'cyan'); }
  const dx = cx + clamp(dot.x, -1.2, 1.2) / 1.2 * r, dy = cy - clamp(dot.y, -1.2, 1.2) / 1.2 * r;
  hud.rect(dx - 2, dy - 2, 5, 5, opts.inRing ? 'white' : 'red');
  hud.rect(dx - 1, dy - 1, 3, 3, 'ink');
  return { cx, cy };
}

// ---------- Navigation ----------
let engineRef = null;
async function goTo(ctx, game, camera) {
  try { await ctx.engine.screen.cover('iris'); } catch { /* headless */ }
  try { await ctx.engine.loadGame(game, camera ? { camera } : undefined); } catch (e) { try { await ctx.engine.loadGame(game); } catch { /* ignore */ } }
  try { await ctx.engine.screen.reveal('iris'); } catch { /* headless */ }
}
const CAM = {
  title: { preset: 'fixed', position: [0, 3, 10], target: [0, 1, 0], fov: 34 },
  island: { preset: 'iso', zoom: 1.15 },
  lane3: { preset: 'fixed', position: [0, 2.3, 8.2], target: [0, 1.15, 0], fov: 30 },
  lane4: { preset: 'fixed', position: [0, 3, 9.5], target: [0, 1, 0], fov: 32 },
  weighin: { preset: 'fixed', position: [0, 1.6, 5.5], target: [0, 0.8, 0], fov: 32 },
  side: { preset: 'side', zoom: 1.1 },
  top: { preset: 'topdown', zoom: 1.1 },
};
function touchOnlyDevice() { try { return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)); } catch { return false; } }
function starsLine(n) { return '***'.slice(0, n) + '...'.slice(0, 3 - n); }
function scoreClassmates(act, score) {
  const max = act.kind === 'hoop' || act.kind === 'header' ? Math.max(act.stars[2], score, 1) : 100;
  const frac = act.kind === 'slack' ? clamp(score / 1000, 0, 1) : act.kind === 'pier' ? clamp(score / 40, 0, 1) : clamp(score / max, 0, 1);
  return ['Dennis', 'June', 'Marguerite'].map(name => ({ name, score: Math.round((CLASSMATES[name].score + (frac - 0.5) * 0.08) * max), beaten: frac > CLASSMATES[name].score }));
}
function awardActivity(act, score, seconds, { dropIn = false, session = false } = {}) {
  const T = App.tunables;
  let stars = 0;
  if (act.kind === 'slack') stars = score >= 1 ? (score >= 3 ? 3 : score) : 0;
  else if (act.kind === 'pier') stars = starsFor(score, act.stars.map(s => s * (T.starThresholdScale || 1)));
  else stars = starsFor(score, act.stars.map(s => s * (T.starThresholdScale || 1)));
  const slot = App.slot();
  let drips = 0;
  if (!dropIn && !session && slot) {
    drips = Math.round((2 + 3 * stars + Math.floor(seconds / 30)) * (T.dripRate || 1));
    slot.drips += drips;
    if (!slot.stars[act.id] || stars > slot.stars[act.id]) slot.stars[act.id] = stars;
    if (!slot.best[act.id] || score > slot.best[act.id]) slot.best[act.id] = score;
    if (!slot.doneToday.includes(act.id)) slot.doneToday.push(act.id);
    slot.played[act.id] = true;
    slot.totalStars = Object.values(slot.stars).reduce((a, b) => a + b, 0);
    App.persist();
  } else if (slot && dropIn) {
    if (!slot.best[act.id] || score > slot.best[act.id]) slot.best[act.id] = score;
    App.persist();
  }
  const line = (RESULT_LINES[stars] || RESULT_LINES[0])[Math.floor(Math.abs(score)) % 3];
  return { stars, drips, line, classmates: scoreClassmates(act, score) };
}
function checkUnlocks() {
  const slot = App.slot(); if (!slot) return [];
  const got = [];
  for (const u of UNLOCKS) if (slot.drips >= u.drips && !slot.unlocked.includes(u.name)) { slot.unlocked.push(u.name); got.push(u); }
  if (got.length) App.persist();
  return got;
}

// ================= TITLE =================
export class TitleGame {
  name = TITLE;
  constructor(mode = 'main') { this.mode = mode; this.menu = null; this.t = 0; this.nameText = 'Guest'; this.avatarIdx = 0; this.aboutPage = 0; this.settingIdx = 0; }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); applyLook(ctx); playSong(ctx, 'title');
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [30, 1, 22], 'white', { collide: false }));
    ctx.scene.add(groundBlock(ctx, [0, 0.02, -4], [8, 0.1, 5], 'cyan', { collide: false }));
    const av = await makeAvatar(ctx, App.slot()?.avatar || { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' }, 'Idle');
    av.model.position.set(-1.2, 0, 0); av.model.rotation.y = Math.PI; ctx.scene.add(av.model); this.avatar = av;
    const oc = makeOunceMesh(1.2); oc.object.position.set(1.4, 0, 0.3); ctx.scene.add(oc.object); this.ounce = oc;
    this.buildMenu();
  }
  buildMenu() {
    const slot = App.slot();
    if (this.mode === 'main') this.menu = new Menu([
      { id: 'week', label: slot ? `The Week — Day ${slot.day} (Week ${slot.week})` : 'The Week' },
      { id: 'dropin', label: 'Drop-In Class' }, { id: 'family', label: 'Family Hour' },
      { id: 'settings', label: 'Settings' }, { id: 'about', label: 'About & Credits' },
    ]);
    else if (this.mode === 'slots') this.menu = new Menu([0, 1, 2].map(i => ({ id: 'slot' + i, label: App.data.slots[i] ? `Slot ${i + 1}: ${App.data.slots[i].name} — Day ${App.data.slots[i].day}` : `Slot ${i + 1}: New guest` })).concat([{ id: 'back', label: 'Back' }]));
    else if (this.mode === 'dropin') this.menu = new Menu(ACTIVITIES.filter(a => a.id !== 'longstand').map(a => ({ id: 'act:' + a.id, label: `${a.name} — ${a.station}` })).concat([{ id: 'back', label: 'Back' }]));
    else if (this.mode === 'about') this.menu = new Menu([{ id: 'aboutNext', label: 'Next page' }, { id: 'back', label: 'Back' }]);
  }
  fixedUpdate() {}
  update(ctx, dt) {
    this.t += dt; App.idleTime += dt; updateDevice(ctx);
    if (this.avatar?.mixer) this.avatar.mixer.update(dt);
    if (this.ounce) this.ounce.setMood(Math.sin(this.t * 1.5) * 0.4);
    // Attract after 10s idle on title/menus.
    if (App.idleTime > 10 && !App.session) { App.idleTime = 0; void goTo(ctx, new ActivityGame('still-tree', { attract: true, playlistIdx: 0 }), CAM.lane3); return; }
    const hud = ctx.hud; hud.clear(); if (App.hideHud) return;
    drawCentered(hud, 18, TITLE, { color: 'white', scale: 3 });
    drawCentered(hud, 42, TAGLINE + '  Press any button. Gently.', { color: 'sand', scale: 1 });
    if (touchOnlyDevice()) { drawCentered(hud, 58, 'Controller or keyboard required', { color: 'orange', scale: 1 }); drawCentered(hud, 68, 'Attract mode will run. Tap to return here.', { color: 'white', scale: 1 }); }
    if (this.mode === 'name') {
      drawCentered(hud, 80, 'Name (Up/Down pick, 8 max): ' + this.nameText, { color: 'white', scale: 1 });
      drawCentered(hud, 94, 'Avatar ' + (this.avatarIdx + 1) + '/6 — Left/Right to change', { color: 'cyan', scale: 1 });
      drawCentered(hud, 108, glyphFor('confirm') + ' Start week    ' + glyphFor('back') + ' Back', { color: 'sand', scale: 1 });
      try {
        for (const e of (ctx.input.buttonEvents || [])) { /* clicks handled below */ }
      } catch { /* ignore */ }
      const NAMES = ['Guest', 'Alex', 'Sam', 'Jo', 'Rin', 'Max', 'Ivy', 'Leo'];
      if (ctx.input.wasPressed('ArrowUp')) this.nameText = NAMES[(NAMES.indexOf(this.nameText) + 1 + NAMES.length) % NAMES.length] || 'Guest';
      if (ctx.input.wasPressed('ArrowDown')) this.nameText = NAMES[(NAMES.indexOf(this.nameText) - 1 + NAMES.length) % NAMES.length] || 'Guest';
      if (ctx.input.wasPressed('ArrowLeft')) this.avatarIdx = (this.avatarIdx + 5) % 6;
      if (ctx.input.wasPressed('ArrowRight')) this.avatarIdx = (this.avatarIdx + 1) % 6;
      if (confirmPressed(ctx)) {
        const s = newSlot(this.nameText.slice(0, 8) || 'Guest', this.avatarIdx); App.data.slots[App.slotIndex] = s; App.persist();
        void goTo(ctx, new WeighInGame({ intro: true }), CAM.weighin);
      }
      if (backPressed(ctx)) { this.mode = 'slots'; this.buildMenu(); }
      return;
    }
    if (this.mode === 'settings') { this.drawSettings(ctx); return; }
    if (this.mode === 'about') { this.drawAbout(ctx); return; }
    this.menu.draw(hud, 24, 78, { scale: 1, gap: 13, width: Math.min(300, hud.width - 40) });
    drawCentered(hud, hud.height - 16, `${glyphFor('confirm')} Confirm   ${glyphFor('back')} Back   Lean: stick / WASD / mouse`, { color: 'mist', scale: 1 });
    const pick = this.menu.update(ctx, dt);
    if (pick) this.onPick(ctx, pick);
    if (backPressed(ctx) && this.mode !== 'main') { this.mode = 'main'; this.buildMenu(); }
  }
  onPick(ctx, id) {
    try { ctx.audio.play('coin'); } catch { /* ignore */ }
    if (id === 'week') { this.mode = 'slots'; this.buildMenu(); }
    else if (id === 'dropin') { this.mode = 'dropin'; this.buildMenu(); }
    else if (id === 'family') { void goTo(ctx, new MedleyGame({ local: true }), CAM.lane4); }
    else if (id === 'settings') { this.mode = 'settings'; }
    else if (id === 'about') { this.mode = 'about'; this.aboutPage = 0; this.buildMenu(); }
    else if (id === 'back') { this.mode = 'main'; this.buildMenu(); }
    else if (id === 'aboutNext') { this.aboutPage = (this.aboutPage + 1) % 6; }
    else if (id.startsWith('slot')) {
      App.slotIndex = Number(id.slice(4));
      if (App.data.slots[App.slotIndex]) { void goTo(ctx, new IslandGame(), CAM.island); }
      else { this.mode = 'name'; this.nameText = 'Guest'; }
    } else if (id.startsWith('act:')) { App.ensureSlot(); void goTo(ctx, new ActivityGame(id.slice(4), { dropIn: true }), CAM.lane3); }
  }
  drawSettings(ctx) {
    const hud = ctx.hud; const s = App.settings;
    const rows = [
      ['Music volume', Math.round(s.music * 100) + '%'], ['SFX volume', Math.round(s.sfx * 100) + '%'], ['Voice volume', Math.round(s.voice * 100) + '%'],
      ['Button glyphs', s.glyphs === 'ps' ? 'PlayStation' : 'Xbox'], ['Gentle Mode', s.gentle ? 'On (rings bigger)' : 'Off'],
      ['Mouse lean radius', String(Math.round(App.tunables.mouseLeanRadius))], ['Step timing offset', s.stepOffset + ' ms'],
      ['Reduce flashes', s.reduceFlash ? 'On' : 'Off'], ['Look', s.look], ['Back', ''],
    ];
    drawCentered(hud, 70, 'Settings', { color: 'white', scale: 2 });
    rows.forEach((r, i) => { const y = 92 + i * 11; if (i === this.settingIdx) hud.rect(20, y - 2, hud.width - 40, 10, 'teal'); say(hud, 26, y, r[0] + (r[1] ? ': ' + r[1] : ''), { color: 'white' }); });
    say(hud, 26, hud.height - 24, 'Up/Down select, Left/Right change, ' + glyphFor('back') + ' back', { color: 'sand' });
    if (ctx.input.wasPressed('ArrowUp') || ctx.input.wasPressed('PadUp')) this.settingIdx = (this.settingIdx + rows.length - 1) % rows.length;
    if (ctx.input.wasPressed('ArrowDown') || ctx.input.wasPressed('PadDown')) this.settingIdx = (this.settingIdx + 1) % rows.length;
    const dir = (ctx.input.wasPressed('ArrowRight') || ctx.input.wasPressed('PadRight') ? 1 : 0) - (ctx.input.wasPressed('ArrowLeft') || ctx.input.wasPressed('PadLeft') ? 1 : 0);
    if (dir) {
      const k = this.settingIdx;
      if (k === 0) s.music = clamp(s.music + dir * 0.05, 0, 1);
      if (k === 1) s.sfx = clamp(s.sfx + dir * 0.05, 0, 1);
      if (k === 2) s.voice = clamp(s.voice + dir * 0.05, 0, 1);
      if (k === 3) s.glyphs = s.glyphs === 'ps' ? 'xbox' : 'ps';
      if (k === 4) s.gentle = !s.gentle;
      if (k === 5) App.tunables.mouseLeanRadius = clamp(App.tunables.mouseLeanRadius + dir * 5, 30, 140);
      if (k === 6) { s.stepOffset = clamp(s.stepOffset + dir * 5, -150, 150); App.tunables.stepOffsetMs = s.stepOffset; }
      if (k === 7) s.reduceFlash = !s.reduceFlash;
      if (k === 8) { const looks = ['Default', 'storybook', 'arcade', 'handheld']; s.look = looks[(looks.indexOf(s.look) + dir + looks.length) % looks.length]; applyLook(ctx); }
      try { ctx.audio.setVolume('music', s.music); ctx.audio.setVolume('sfx', s.sfx); } catch { /* ignore */ }
      App.persist();
    }
    if (backPressed(ctx) || (confirmPressed(ctx) && this.settingIdx === 9)) { this.mode = 'main'; this.buildMenu(); }
  }
  drawAbout(ctx) {
    const hud = ctx.hud;
    const pages = [
      ['Credits', TITLE + ' — ' + TAGLINE, 'Built on Pixel Engine 0.46.0.', 'This is not medical advice. Ounce is a scale.', 'Story: a week on Tare Island with', 'Ounce, Coach Plumb, Marguerite,', 'Dennis, June and Kevin the gull.'],
      ['Source Information', 'Date: ' + ABOUT.sourceInformation.date, 'Source: ' + ABOUT.sourceInformation.source, 'Plan: ' + ABOUT.sourceInformation.plan, 'Genre: Sports', 'Perspective: isometric / fixed', 'Tech: Pixel Engine, esbuild'],
      ['Source Information 2', 'Art: engine pixel look', 'Animation: ClipDef + mixer', 'Audio: songs in code, formant voices', 'Online: AI Hub ghost 1-4', 'Testing: headless + browser', 'Research: director spikes + guides'],
      ['Testing Feedback', ...ABOUT.testingFeedback.map(t => t.slice(0, 46))],
      ['Engine Feedback', ...ABOUT.engineFeedback.map(t => t.slice(0, 46))],
      ['Prompt Feedback', ...ABOUT.promptFeedback.map(t => t.slice(0, 46)), 'Kit CREDITS: see CREDITS.md', 'in the dev folder (shipped summary).'],
    ];
    const p = pages[this.aboutPage % pages.length];
    drawCentered(hud, 66, p[0] + `  (${this.aboutPage + 1}/6)`, { color: 'white', scale: 1 });
    p.slice(1).forEach((ln, i) => drawCentered(hud, 82 + i * 10, ln, { color: 'sand', scale: 1 }));
    this.menu.draw(hud, 24, hud.height - 42, { width: 180 });
    const pick = this.menu.update(ctx, 0.016);
    if (pick === 'aboutNext') this.aboutPage = (this.aboutPage + 1) % 6;
    if (pick === 'back' || backPressed(ctx)) { this.mode = 'main'; this.buildMenu(); }
  }
  cameraTarget() { return new Vector3(0, 1, 0); }
  status() { return `title ${this.mode} idle ${App.idleTime.toFixed(1)} device ${App.device}`; }
}

// ================= ISLAND =================
export class IslandGame {
  name = 'Tare Island';
  constructor() { this.t = 0; this.input = undefined; this.near = null; this.menu = null; this.menuStation = null; this.paused = false; this.pauseMenu = null; this.barkTimer = 0; this.bark = ''; this.report = null; this.targetVec = new Vector3(); this.mouseWalk = null; }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); playSong(ctx, 'title');
    const slot = App.ensureSlot();
    try { applySky(ctx.engine, skyAt(9)); } catch { /* ignore */ }
    // Ground: white plaza, lawn, sand, sea ring.
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [44, 1, 34], 'white'));
    ctx.scene.add(groundBlock(ctx, [0, 0.01, 0], [20, 0.06, 16], 'mist', { collide: false }));
    ctx.scene.add(groundBlock(ctx, [14, 0.01, -10], [14, 0.06, 10], 'sand', { collide: false }));
    ctx.scene.add(groundBlock(ctx, [-14, 0.01, 8], [14, 0.06, 10], 'green', { collide: false }));
    // Sea
    const sea = new Mesh(new BoxGeometry(70, 0.4, 60), toonMaterial(PALETTE.sky)); sea.position.set(0, -0.7, 0); ctx.scene.add(sea);
    // Stations: columns + roof
    for (const st of STATIONS) {
      const g = new Group();
      const roof = new Mesh(new BoxGeometry(3.2, 0.3, 3.2), toonMaterial(PALETTE[st.color] || PALETTE.white)); roof.position.y = 2.4; g.add(roof);
      for (const [cx, cz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) { const c = new Mesh(new BoxGeometry(0.25, 2.4, 0.25), toonMaterial(PALETTE.white)); c.position.set(cx, 1.2, cz); g.add(c); }
      const mat = new Mesh(new BoxGeometry(2, 0.08, 2), toonMaterial(PALETTE.teal)); mat.position.y = 0.06; g.add(mat);
      g.position.set(st.x, 0, st.z); ctx.scene.add(g);
    }
    // Volcano + hills + bridge scenery (tall things to -x,-z)
    const volc = new Mesh(new ConeGeometry(4, 5, 10), toonMaterial(PALETTE.slate)); volc.position.set(-15, 2.5, -14); ctx.scene.add(volc);
    const hill = new Mesh(new CylinderGeometry(2.5, 2.5, 8, 10), toonMaterial(PALETTE.lime)); hill.rotation.z = Math.PI / 2; hill.position.set(15, 1, -14); ctx.scene.add(hill);
    const jarGlass = new Mesh(new CylinderGeometry(0.9, 0.9, 2.2, 12), toonMaterial(PALETTE.sky)); jarGlass.position.set(4, 1.4, -4); ctx.scene.add(jarGlass); this.jarMesh = jarGlass;
    // Hero
    const av = await makeAvatar(ctx, slot.avatar, 'Idle');
    this.avatar = av; this.model = av.model; ctx.scene.add(this.model);
    this.shadow = new ContactShadow(0.42); ctx.scene.add(this.shadow);
    try { this.hero = new PlatformerCharacter(ctx.physics, { position: [0, 0, 5], lockDepth: false }); this.hero.attachModel(this.model, compileClips(ALL_CLIP_DEFS, HERO_RIG, this.model), HERO_RIG); } catch { this.hero = null; }
    const oc = makeOunceMesh(1.4); oc.object.position.set(1, 0, 4); ctx.scene.add(oc.object); this.ounce = oc; this.ouncePos = new Vector3(1, 0, 4);
    // Classmates wandering
    this.mates = [];
    const looks = [{ skin: 'sand', top: 'orange', bottom: 'white', shoe: 'white', hair: 'mist' }, { skin: 'sand', top: 'teal', bottom: 'ink', shoe: 'white', hair: 'ink' }, { skin: 'sand', top: 'lime', bottom: 'plum', shoe: 'white', hair: 'sand' }];
    for (let i = 0; i < 3; i++) { const m = await makeAvatar(ctx, looks[i], 'Idle'); m.model.position.set(-6 + i * 6, 0, -2); ctx.scene.add(m.model); this.mates.push({ av: m, x: -6 + i * 6, z: -2, ph: i * 2 }); }
    this.dlg = new Dialogue(ctx);
    const wk = WEEK[(slot.day - 1) % 7];
    if (!slot.weighed) this.dlg.sayAll([['Ounce', slot.day === 1 && slot.week === 1 ? 'Hello! I\u2019m Ounce. Please step on me.' : 'Good morning. Weigh-In first, please.'], ['Ounce', 'Today: ' + wk.test + '. ' + wk.beat]]);
    else this.dlg.sayAll([['Coach', wk.beat], ['Ounce', 'Prescription: ' + wk.goal + '.']]);
  }
  nearestStation() {
    if (!this.model) return null;
    const p = this.model.position; let best = null, bd = 3.2;
    for (const st of STATIONS) { const d = Math.hypot(p.x - st.x, p.z - st.z); if (d < bd) { bd = d; best = st; } }
    return best;
  }
  openStation(ctx, st) {
    this.menuStation = st;
    if (st.id === 'weighin') { void goTo(ctx, new WeighInGame({}), CAM.weighin); return; }
    if (st.id === 'hammock') {
      const slot = App.slot();
      if ((slot?.doneToday?.length || 0) >= 1) { this.showReport(ctx); }
      else this.dlg.sayAll([['Ounce', 'Leaving early earns a guilt-trip, never a block.'], ['Ounce', 'Do one activity first. The hammock will wait.']]);
      return;
    }
    if (st.id === 'jar') { this.menu = new Menu([{ id: 'close', label: 'Back' }]); this.jarView = true; return; }
    if (st.id === 'locker') { this.menu = new Menu([{ id: 'skin', label: 'Change top colour' }, { id: 'hair', label: 'Change hair' }, { id: 'close', label: 'Back' }]); this.lockerView = true; return; }
    if (st.id === 'hall') { this.menu = new Menu([{ id: 'close', label: 'Back' }]); this.hallView = true; return; }
    const acts = ACTIVITIES.filter(a => a.station === st.id);
    const slot = App.slot();
    this.menu = new Menu(acts.map(a => {
      const locked = slot && a.day > slot.day && !slot.played[a.id];
      return { id: 'act:' + a.id, label: `${a.name} ${starsLine(slot?.stars[a.id] || 0)}${locked ? ' (Day ' + a.day + ')' : ''} Best ${slot?.best[a.id] ?? '-'}`, disabled: locked };
    }).concat([{ id: 'close', label: 'Back' }]));
  }
  showReport(ctx) {
    const slot = App.slot(); const wk = WEEK[(slot.day - 1) % 7];
    const doneSet = new Set(slot.doneToday);
    let goalMet = false; try { goalMet = wk.goalCheck(doneSet, slot.stars); } catch { goalMet = false; }
    // Day 5 special: beat Dennis check via best scores
    if (slot.day === 5) goalMet = ACTIVITIES.some(a => (slot.best[a.id] || 0) > 30);
    let bonus = 0;
    if (goalMet && !slot.goalPaid) { bonus = 5; slot.drips += 5; slot.goalPaid = true; }
    const unlocks = checkUnlocks();
    this.report = { goalMet, bonus, unlocks, minutes: slot.doneToday.length * 8 + 5 };
    App.persist();
  }
  advanceDay(ctx) {
    const slot = App.slot(); if (!slot) return;
    if (slot.day >= 7) {
      if (!slot.confession) { void goTo(ctx, new EndingGame(), CAM.title); return; }
      slot.week += 1; slot.day = 1;
    } else slot.day += 1;
    slot.doneToday = []; slot.weighed = false; slot.goalPaid = false; App.persist();
    void goTo(ctx, new IslandGame(), CAM.island);
  }
  fixedUpdate(ctx, dt) {
    if (this.paused || this.menu || this.report || this.dlg?.active) return;
    if (!this.hero) return;
    this.input = readMoveInput(ctx, this.hero, this.input);
    // Hub wrapper: Cross jumps or interacts
    try {
      if (this.near && ctx.input.consumePress('PadCross')) { this.openStation(ctx, this.near); return; }
      if (ctx.input.consumePress('PadCross')) this.input.jump = true;
      if (ctx.input.isDown('PadCross')) this.input.jumpHeld = true;
      if (ctx.input.consumePress('PadTriangle')) this.input.wave = true;
      if (ctx.input.consumePress('PadSquare')) this.input.sit = true;
      // Mouse walk: click ground walks there
      if (this.mouseWalk) {
        const p = this.model.position; const dx = this.mouseWalk.x - p.x, dz = this.mouseWalk.z - p.z;
        if (Math.hypot(dx, dz) > 0.4) { this.input.move.set(dx, 0, dz).normalize(); } else this.mouseWalk = null;
      }
    } catch { /* input shape */ }
    this.hero.fixedUpdate(dt, this.input);
  }
  update(ctx, dt) {
    this.t += dt; updateDevice(ctx);
    const slot = App.slot();
    if (this.paused) { this.drawPause(ctx); return; }
    if (pausePressed(ctx) && !App.session) { this.paused = true; try { ctx.engine.timeScale = 0; } catch { /* ignore */ } this.pauseMenu = new Menu([{ id: 'resume', label: 'Resume' }, { id: 'restart', label: 'Restart activity' }, { id: 'island', label: 'Back to the island' }, { id: 'settings', label: 'Settings' }, { id: 'howto', label: 'How to play' }, { id: 'about', label: 'About & Credits' }, { id: 'dev', label: 'Dev Tools' }, { id: 'title', label: 'Title' }]); return; }
    if (this.dlg) this.dlg.update(ctx, dt);
    if (this.hero && this.model) { try { this.hero.updateVisual(this.model, dt, ctx.physics.alpha); } catch { /* ignore */ } const feet = this.model.position; try { this.shadow.place(feet.x, 0, feet.z, feet.y); } catch { /* ignore */ } }
    if (this.avatar?.mixer && !this.hero) this.avatar.mixer.update(dt);
    // Ounce hops after player
    if (this.ounce && this.model) {
      const p = this.model.position; const target = new Vector3(p.x + 1.2, 0, p.z + 0.6);
      this.ouncePos.lerp(target, 1 - Math.exp(-dt * 2));
      const hop = Math.abs(Math.sin(this.t * 4)) * 0.15;
      this.ounce.object.position.set(this.ouncePos.x, hop, this.ouncePos.z);
      this.ounce.object.scale.set(1.4, 1.4 * (1 - hop * 0.2), 1.4);
      this.ounce.setMood(Math.sin(this.t * 2) * 0.5);
    }
    for (const m of this.mates || []) { if (m.av.mixer) m.av.mixer.update(dt); m.av.model.position.x = m.x + Math.sin(this.t * 0.3 + m.ph) * 2; m.av.model.position.z = m.z + Math.cos(this.t * 0.2 + m.ph) * 1; }
    if (this.jarMesh && slot) { const fill = clamp(slot.drips / 175, 0.05, 1); this.jarMesh.scale.y = fill; this.jarMesh.position.y = 0.3 + fill * 1.1; }
    this.near = this.nearestStation();
    // Mouse click station / ground
    try {
      if (ctx.input.wasPressed('MouseLeft') && !this.menu && !this.report) {
        if (this.near) this.openStation(ctx, this.near);
      }
    } catch { /* ignore */ }
    const hud = ctx.hud; hud.clear(); if (App.hideHud) return;
    say(hud, 12, 8, `Day ${slot?.day ?? 1} — Week ${slot?.week ?? 1}`, { color: 'white', scale: 1 });
    say(hud, hud.width - 110, 8, `Drips ${slot?.drips ?? 0}`, { color: 'cyan', scale: 1 });
    const wk = WEEK[((slot?.day ?? 1) - 1) % 7];
    say(hud, 12, 18, 'Prescription: ' + wk.goal, { color: 'sand', scale: 1 });
    if (!slot?.weighed) say(hud, 12, 28, 'Go to Weigh-In Terrace to start.', { color: 'orange', scale: 1 });
    if (this.near && !this.menu && !this.report) drawCentered(hud, hud.height - 34, `[${App.device === 'pad' ? 'X' : 'Enter'}] Enter: ${this.near.name}`, { color: 'white', scale: 1 });
    if (this.dlg) this.dlg.draw(hud);
    if (this.jarView) {
      panel(hud, 30, 50, hud.width - 60, 110, 'ink');
      drawCentered(hud, 58, 'Sweat Jar — ' + (slot?.drips ?? 0) + ' Drips', { color: 'white', scale: 1 });
      UNLOCKS.forEach((u, i) => drawCentered(hud, 72 + i * 10, `${slot?.drips >= u.drips ? '[x]' : '[ ]'} ${u.drips} — ${u.name}`, { color: slot?.drips >= u.drips ? 'lime' : 'mist', scale: 1 }));
      this.menu.draw(hud, 30, hud.height - 50, { width: 160 });
      const p = this.menu.update(ctx, dt); if (p === 'close' || backPressed(ctx)) { this.jarView = false; this.menu = null; }
      return;
    }
    if (this.lockerView) {
      panel(hud, 30, 50, hud.width - 60, 90, 'ink');
      drawCentered(hud, 58, 'Locker Room — ' + (slot?.name ?? ''), { color: 'white', scale: 1 });
      drawCentered(hud, 72, `Top ${slot?.avatar.top}  Hair ${slot?.avatar.hair}  Unlocks: ${(slot?.unlocked || []).join(', ') || 'none'}`, { color: 'sand', scale: 1 });
      this.menu.draw(hud, 30, 110, { width: 240 });
      const p = this.menu.update(ctx, dt);
      if (p === 'skin' && slot) { const cols = ['white', 'lime', 'cyan', 'red', 'orange', 'plum']; slot.avatar.top = cols[(cols.indexOf(slot.avatar.top) + 1) % cols.length]; App.persist(); }
      if (p === 'hair' && slot) { const cols = ['ink', 'orange', 'plum', 'teal', 'sand', 'mist']; slot.avatar.hair = cols[(cols.indexOf(slot.avatar.hair) + 1) % cols.length]; App.persist(); }
      if (p === 'close' || backPressed(ctx)) { this.lockerView = false; this.menu = null; void goTo(ctx, new IslandGame(), CAM.island); }
      return;
    }
    if (this.hallView) {
      panel(hud, 30, 46, hud.width - 60, 140, 'ink');
      drawCentered(hud, 54, 'Hall of Numbers', { color: 'white', scale: 1 });
      const ages = slot?.ages || [];
      drawCentered(hud, 68, ages.length ? 'Wobble Ages: ' + ages.join(' -> ') : 'No Weigh-Ins yet.', { color: 'cyan', scale: 1 });
      ACTIVITIES.slice(0, 8).forEach((a, i) => drawCentered(hud, 82 + i * 10, `${a.name}: ${starsLine(slot?.stars[a.id] || 0)} best ${slot?.best[a.id] ?? '-'}`, { color: 'sand', scale: 1 }));
      this.menu.draw(hud, 30, hud.height - 50, { width: 160 });
      const p = this.menu.update(ctx, dt); if (p === 'close' || backPressed(ctx)) { this.hallView = false; this.menu = null; }
      return;
    }
    if (this.report) {
      panel(hud, 40, 60, hud.width - 80, 120, 'ink');
      drawCentered(hud, 68, `Evening Report — Day ${slot.day}`, { color: 'white', scale: 2 });
      drawCentered(hud, 92, `Activities: ${slot.doneToday.length}  Drips: ${slot.drips}`, { color: 'cyan', scale: 1 });
      drawCentered(hud, 104, this.report.goalMet ? `Prescription met! +${this.report.bonus} Drips bonus.` : 'Prescription not met. Noted, kindly.', { color: 'sand', scale: 1 });
      if (this.report.unlocks.length) drawCentered(hud, 116, 'Unlocked: ' + this.report.unlocks.map(u => u.name).join(', '), { color: 'lime', scale: 1 });
      drawCentered(hud, 132, `Tomorrow: ${(WEEK[slot.day % 7]?.test || 'Stillness')} test. Concern: your ankles.`, { color: 'mist', scale: 1 });
      drawCentered(hud, 150, glyphFor('confirm') + ' Sleep — next morning', { color: 'white', scale: 1 });
      if (confirmPressed(ctx)) { this.report = null; try { applySky(ctx.engine, skyAt(19)); } catch { /* ignore */ } this.advanceDay(ctx); }
      return;
    }
    if (this.menu && this.menuStation) {
      panel(hud, 30, 60, hud.width - 60, 130, 'ink');
      drawCentered(hud, 68, this.menuStation.name, { color: 'white', scale: 1 });
      drawCentered(hud, 80, 'Pick an activity. Locked rows open on their day.', { color: 'sand', scale: 1 });
      this.menu.draw(hud, 40, 94, { width: Math.min(320, hud.width - 80) });
      const pick = this.menu.update(ctx, dt);
      if (pick === 'close' || backPressed(ctx)) { this.menu = null; this.menuStation = null; }
      else if (pick && pick.startsWith('act:')) {
        const act = ACT_BY_ID[pick.slice(4)]; const s2 = App.slot();
        if (act && s2 && act.day > s2.day && !s2.played[act.id]) { this.dlg?.sayAll([['Ounce', 'That opens on Day ' + act.day + '. Noted.']]); }
        else if (act) { this.menu = null; void goTo(ctx, new ActivityGame(act.id, {}), CAM.lane3); }
      }
    }
    // bark timer
    this.barkTimer -= dt;
    if (this.barkTimer <= 0) { this.barkTimer = 6; if (!this.menu && !this.dlg?.active && ctx.random && ctx.random.chance && ctx.random.chance(0.5)) { /* occasional bark drawn as subtitle */ this.bark = LINES.ounce[Math.floor(Math.abs(Math.sin(this.t)) * LINES.ounce.length) % LINES.ounce.length]; } }
    if (this.bark && !this.menu) drawCentered(hud, hud.height - 48, 'Ounce: ' + this.bark, { color: 'cyan', scale: 1 });
  }
  drawPause(ctx) {
    const hud = ctx.hud; hud.clear();
    panel(hud, 40, 50, hud.width - 80, 150, 'ink');
    drawCentered(hud, 60, 'Paused', { color: 'white', scale: 2 });
    this.pauseMenu.draw(hud, 50, 84, { width: 240 });
    const pick = this.pauseMenu.update(ctx, 0.016);
    const resume = () => { this.paused = false; try { ctx.engine.timeScale = App.timeScalePref; } catch { /* ignore */ } };
    if (pick === 'resume' || backPressed(ctx)) resume();
    else if (pick === 'island') { resume(); void goTo(ctx, new IslandGame(), CAM.island); }
    else if (pick === 'title') { resume(); void goTo(ctx, new TitleGame('main'), CAM.title); }
    else if (pick === 'restart') { resume(); void goTo(ctx, new IslandGame(), CAM.island); }
    else if (pick === 'settings') { resume(); void goTo(ctx, new TitleGame('settings'), CAM.title); }
    else if (pick === 'howto') { resume(); this.dlg?.sayAll([['Coach', 'Lean with stick, WASD or mouse. Keep the Dot in the circle.'], ['Ounce', 'Breathe with Space. Step with F and J. That is the game.']]); }
    else if (pick === 'about') { resume(); void goTo(ctx, new TitleGame('about'), CAM.title); }
    else if (pick === 'dev') { resume(); void goTo(ctx, new DevGame('island'), CAM.title); }
  }
  cameraTarget(ctx) { const p = this.model?.position; return p ? this.targetVec.set(p.x, p.y + 0.9, p.z) : this.targetVec.set(0, 1, 5); }
  onCameraChange(ctx) { try { this.hero?.setLockDepth(ctx.camera.lockDepth); } catch { /* ignore */ } }
  status() { const s = App.slot(); return `island day ${s?.day} drips ${s?.drips} near ${this.near?.id || 'none'} device ${App.device}`; }
  fingerprint() { const s = App.slot(); return `island:${s?.day}:${s?.drips}:${(s?.doneToday || []).join(',')}`; }
}

// ================= WEIGH-IN =================
export class WeighInGame {
  name = 'Weigh-In';
  constructor(opts = {}) { this.opts = opts; this.phase = 'intro'; this.t = 0; this.phaseT = 0; this.dot = null; this.bot = null; this.lean = null; this.inRing = 0; this.frames = 0; this.targets = []; this.targetIdx = 0; this.holdT = 0; this.T = 0; this.feelAge = 30; this.ageShown = 0; this.ageTrue = 0; this.menu = null; this.dlg = null; }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); playSong(ctx, 'evening');
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [12, 1, 10], 'white', { collide: false }));
    const slot = App.ensureSlot();
    const av = await makeAvatar(ctx, slot.avatar, 'Idle'); av.model.position.set(0, 0.12, 0); ctx.scene.add(av.model); this.avatar = av;
    const oc = makeOunceMesh(1.6); oc.object.position.set(0, 0, 0.2); ctx.scene.add(oc.object); this.ounce = oc;
    const rand = mulberry(1234 + slot.day * 77 + slot.week * 1000);
    this.dot = new Dot(rand); this.bot = new Bot(App.botSkill === 'idle' ? 'average' : App.botSkill, rand); this.rng = rand;
    this.lean = new LeanInput(); this.dlg = new Dialogue(ctx);
    const wk = WEEK[(slot.day - 1) % 7]; this.testKind = wk.test;
    if (this.opts.intro) this.dlg.sayAll([['Ounce', 'Hello! I\u2019m Ounce. Please step on me.'], ['Ounce', 'Ow.'], ['Ounce', 'That was a joke. I can\u2019t feel pain. I can only keep records.'], ['Ounce', 'This dot is you. Keep it in the circle. That\u2019s it. That\u2019s the game.'], ['Coach', 'Stand. Breathe. Be noted.']], () => { this.phase = 'feel'; });
    else this.dlg.sayAll([['Ounce', 'Please step on me.'], ['Ounce', 'Ow.'], ['Ounce', 'Today: ' + this.testKind + ' test.']], () => { this.phase = 'test'; this.phaseT = 0; });
    if (this.testKind === 'Lean') this.targets = [{ x: -0.7, y: 0 }, { x: 0.7, y: 0.2 }, { x: 0, y: -0.6 }];
  }
  fixedUpdate(ctx, dt) {
    if (this.phase !== 'test' && this.phase !== 'feel') return;
    if (this.phase === 'test') {
      this.phaseT += dt;
      const T = App.tunables; let u = { x: 0, y: 0 }; let target = { x: 0, y: 0 };
      // Input: real lean if keys held, else bot assists when autopilot skill set via keys? Use lean only; tests drive keys.
      const dialX = ctx.hud.width / 2, dialY = 56;
      u = this.lean.read(ctx, dt, dialX, dialY);
      if (this.testKind === 'Lean') target = this.targets[this.targetIdx] || { x: 0, y: 0 };
      if (this.testKind === 'Chase') { const tt = this.phaseT; target = { x: Math.sin(tt * 0.7) * 0.6, y: Math.cos(tt * 0.5) * 0.5 }; }
      this.dot.step(dt, u.x, u.y, T, {});
      const d = Math.hypot(this.dot.x - target.x, this.dot.y - target.y);
      this.frames++;
      if (this.testKind === 'Stillness') { if (Math.hypot(this.dot.x, this.dot.y) <= 0.30 * (App.settings.gentle ? 1.25 : 1) * T.ringScale) this.inRing++; }
      else if (this.testKind === 'Chase') { this.inRing += clamp(1 - d * 2, 0, 1); }
      else if (this.testKind === 'Lean') { if (d <= 0.12) { this.holdT += dt; if (this.holdT >= 1.5) { this.targetIdx++; this.holdT = 0; try { ctx.audio.play('chimeIn'); } catch { /* ignore */ } } } else this.holdT = Math.max(0, this.holdT - dt); this.inRing += clamp(1 - d, 0, 1); }
      if (this.phaseT >= 13) this.finishTest(ctx);
    }
  }
  finishTest(ctx) {
    const slot = App.slot();
    let Tv = 0;
    if (this.testKind === 'Stillness') Tv = this.frames ? this.inRing / this.frames : 0;
    else Tv = clamp(this.inRing / Math.max(1, this.frames), 0, 1);
    if (this.testKind === 'Lean') Tv = clamp(0.35 + this.targetIdx * 0.22 + Tv * 0.2, 0, 1);
    this.T = clamp(Tv, 0, 1);
    slot.testT.push(this.T); if (slot.testT.length > 7) slot.testT.shift();
    this.phase = 'question'; this.phaseT = 0;
    const q = QUESTIONS[(slot.day - 1) % QUESTIONS.length];
    this.menu = new Menu(q.a.map((a, i) => ({ id: 'ans' + i, label: a })));
    this.qText = q.q;
  }
  computeAge() {
    const slot = App.slot(); const last3 = slot.testT.slice(-3); const mean = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0.5;
    let tr = Math.round(20 + 60 * (1 - mean)) - Math.min(20, slot.totalStars * (App.tunables.ageTrainingWeight || 0.5));
    tr = clamp(tr, 18, 95); this.ageTrue = tr; this.ageShown = slot.confession ? tr : tr + 7;
    slot.ages.push(this.ageShown); if (slot.ages.length > 7) slot.ages.shift();
    slot.weighed = true; App.persist();
  }
  update(ctx, dt) {
    this.t += dt; updateDevice(ctx);
    if (this.avatar?.mixer) this.avatar.mixer.update(dt);
    if (this.dlg) this.dlg.update(ctx, dt);
    if (this.ounce) this.ounce.setMood(this.phase === 'reveal' ? Math.sin(this.t * 10) * (1 - clamp(this.phaseT / 3, 0, 1)) : Math.sin(this.t * 2) * 0.3);
    const hud = ctx.hud; hud.clear();
    drawCentered(hud, 10, 'Morning Weigh-In — ' + this.testKind, { color: 'white', scale: 1 });
    if (this.phase === 'feel') {
      drawCentered(hud, 60, 'How old do you feel? This is not binding.', { color: 'sand', scale: 1 });
      drawCentered(hud, 78, String(this.feelAge), { color: 'cyan', scale: 3 });
      drawCentered(hud, 110, 'Left/Right change, ' + glyphFor('confirm') + ' confirm', { color: 'white', scale: 1 });
      if (ctx.input.wasPressed('ArrowLeft')) this.feelAge = clamp(this.feelAge - 1, 5, 95);
      if (ctx.input.wasPressed('ArrowRight')) this.feelAge = clamp(this.feelAge + 1, 5, 95);
      if (confirmPressed(ctx)) { this.phase = 'test'; this.phaseT = 0; this.dlg.sayAll([['Ounce', 'Thank you. I have written that down.']]); }
    } else if (this.phase === 'test') {
      const fade = this.testKind === 'Stillness' && this.phaseT > 3;
      drawDial(hud, hud.width / 2, 56, 44, this.dot, 0.30 * (App.settings.gentle ? 1.25 : 1), { inRing: Math.hypot(this.dot.x, this.dot.y) <= 0.3, target: this.testKind !== 'Stillness' ? (this.testKind === 'Lean' ? this.targets[this.targetIdx] : { x: Math.sin(this.phaseT * 0.7) * 0.6, y: Math.cos(this.phaseT * 0.5) * 0.5 }) : null });
      if (fade) drawCentered(hud, 108, 'Eyes closed.', { color: 'orange', scale: 1 });
      drawCentered(hud, 118, `${this.testKind} — ${(Math.max(0, 13 - this.phaseT)).toFixed(0)}s  Keep it in the circle.`, { color: 'sand', scale: 1 });
      say(hud, 12, hud.height - 14, 'Lean: stick / WASD / mouse from dial centre', { color: 'mist', scale: 1 });
    } else if (this.phase === 'question') {
      drawCentered(hud, 60, this.qText, { color: 'white', scale: 1 });
      this.menu.draw(hud, 30, 80, { width: 280 });
      const p = this.menu.update(ctx, dt);
      if (p) { this.computeAge(); this.phase = 'reveal'; this.phaseT = 0; try { ctx.audio.play('ow'); } catch { /* ignore */ } }
    } else if (this.phase === 'reveal') {
      this.phaseT += dt;
      const shown = this.phaseT < 2 ? Math.floor(Math.abs(Math.sin(this.phaseT * 6)) * 60) + 20 : this.ageShown;
      drawCentered(hud, 60, 'Your Wobble Age is', { color: 'sand', scale: 1 });
      drawCentered(hud, 78, String(shown), { color: 'cyan', scale: 4 });
      if (this.phaseT > 2.2) {
        drawCentered(hud, 118, `Is that close? (You feel ${this.feelAge}.)`, { color: 'white', scale: 1 });
        const chart = App.slot().ages;
        chart.forEach((a, i) => { const x = hud.width / 2 - 60 + i * 18; const y = 150 - (a - 18); hud.rect(x, clamp(y, 130, 165), 8, 3, 'cyan'); });
        drawCentered(hud, hud.height - 20, glyphFor('confirm') + ' To the island', { color: 'white', scale: 1 });
        if (confirmPressed(ctx)) void goTo(ctx, new IslandGame(), CAM.island);
      }
    }
    if (this.dlg) this.dlg.draw(hud);
    if (this.phase === 'intro') drawCentered(hud, hud.height - 60, 'Ferry arriving... Tare Island: everything starts at zero.', { color: 'mist', scale: 1 });
  }
  cameraTarget() { return new Vector3(0, 1, 0); }
  status() { return `weighin ${this.phase} test ${this.testKind} T ${this.T.toFixed(2)} age ${this.ageShown}`; }
  fingerprint() { return `weigh:${this.T.toFixed(3)}:${this.ageShown}`; }
}

// ================= ACTIVITY =================
const ATTRACT_PLAYLIST = ['still-tree', 'hoop', 'header', 'step', 'slack', 'tray', 'pier', 'jog', 'longstand'];
export class ActivityGame {
  name = 'Activity';
  constructor(actId, opts = {}) {
    this.act = ACT_BY_ID[actId] || ACTIVITIES[0]; this.opts = opts;
    this.phase = 'intro'; this.phaseT = 0; this.playT = 0; this.score = 0; this.result = null;
    this.lean = new LeanInput(); this.paused = false; this.pauseMenu = null; this.finished = false;
    this.botSkillLocal = opts.botSkill || null; // when set, local lane is bot-driven (tests/attract)
    if (opts.attract) this.botSkillLocal = 'expert';
  }
  duration() { const a = this.act; if (a.kind === 'still' || a.kind === 'longstand') return a.hold || a.dur; if (a.kind === 'reps') return (a.reps + 2) * (a.tempo || 3.2) * (App.tunables.repTempoScale || 1); if (a.kind === 'pier') return 40; return a.dur || 60; }
  ringRadius() { let r = this.act.ring || 0.30; if (App.settings.gentle) r *= 1.25; r *= (App.tunables.ringScale || 1); if (this.opts.attract || App.godMode) r *= 2; if (this.act.kind === 'longstand') { const t = this.playT; if (t > 75) r = 0.24; else if (t > 50) r = 0.28; else if (t > 30) r = 0.34; else r = 0.40; } return clamp(r, 0.1, 0.8); }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); playSong(ctx, this.act.song || 'title');
    const a = this.act;
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [16, 1, 10], 'white', { collide: false }));
    ctx.scene.add(groundBlock(ctx, [0, 0.01, -2], [16, 0.05, 3], a.station === 'Lagoon' ? 'sand' : 'mist', { collide: false }));
    // Mats + avatars (lanes). Local centre, bots either side.
    this.lanes = [];
    const slot = App.slot();
    const looks = [slot?.avatar || { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' }, { skin: 'sand', top: 'orange', bottom: 'white', shoe: 'white', hair: 'mist' }, { skin: 'sand', top: 'teal', bottom: 'ink', shoe: 'white', hair: 'ink' }];
    const skills = ['good', null, 'average']; // left bot, local, right bot (solo)
    const nLanes = this.opts.lanes || 3;
    const xs = nLanes === 4 ? [-3, -1, 1, 3] : nLanes === 1 ? [0] : [-2.2, 0, 2.2];
    for (let i = 0; i < nLanes; i++) {
      const mat = new Mesh(new BoxGeometry(1.4, 0.08, 2), toonMaterial(PALETTE[i === Math.floor(nLanes / 2) ? 'cyan' : 'mist'])); mat.position.set(xs[i], 0.04, 0.8); ctx.scene.add(mat);
      const isLocal = this.opts.lanes ? i === (this.opts.localIndex ?? 0) : i === Math.floor(nLanes / 2);
      const av = await makeAvatar(ctx, looks[i % looks.length], a.clip || 'Idle'); av.model.position.set(xs[i], 0, 0.8); av.model.rotation.y = Math.PI; ctx.scene.add(av.model);
      const rand = mulberry(900 + i * 131 + a.id.length * 17);
      const lane = { i, x: xs[i], av, dot: new Dot(rand), bot: new Bot(isLocal ? (this.botSkillLocal || 'average') : (skills[i] || 'average'), rand), isLocal, skill: isLocal ? this.botSkillLocal : (skills[i] || 'average'), rand,
        inFrames: 0, frames: 0, breathS: 0.5, r: 0, repScoreSum: 0, repCount: 0, angle: 0, lastAng: null, angVel: 0, lift: 0.6, hoopScore: 0, hoops: 1,
        stepHits: 0, stepTotal: 0, stepAcc: 0, laneX: 0, combo: 0, headerScore: 0, progress: 0, falls: 0, trayScore: 0, ball: { x: 0, y: 0, vx: 0, vy: 0 }, cadence: 0, lastFoot: 0, jogScore: 0, cups: 0, pierState: 0, pierDist: 0 };
      // tray board init
      lane.cups = [{ x: -0.6, y: -0.6, c: 'R' }, { x: 0.6, y: -0.6, c: 'B' }, { x: 0, y: 0.6, c: 'Y' }];
      lane.vitamins = Array.from({ length: 4 }, (_, k) => ({ x: (k - 1.5) * 0.3, y: 0.2, c: ['R', 'B', 'Y'][k % 3], done: false }));
      this.lanes.push(lane);
    }
    this.local = this.lanes.find(l => l.isLocal) || this.lanes[0];
    // Coach at side (not behind player)
    const coach = await makeAvatar(ctx, { skin: 'sand', top: 'cyan', bottom: 'cyan', shoe: 'white', hair: 'mist' }, a.clip || 'Idle'); coach.model.position.set(-3.4, 0, 0.2); coach.model.rotation.y = Math.PI; ctx.scene.add(coach.model); this.coach = coach;
    const oc = makeOunceMesh(1); oc.object.position.set(3.4, 0, 0.2); ctx.scene.add(oc.object); this.ounce = oc;
    // Header objects pool (visual boxes falling in HUD space handled logically; 3D markers)
    this.objects = []; this.spawnT = 0; this.chartIdx = 0; this.stepClock = 0;
    this.dlg = new Dialogue(ctx);
    this.dlg.sayAll([['Coach', coachLineFor(a)], ['Ounce', goalLineFor(a)]]);
    this.phase = 'intro'; this.phaseT = 0;
    try { ctx.particles.register('confetti', { count: [8, 14], life: [0.6, 1], speed: [1, 2], gravity: -2, size: [1, 2], colors: ['cyan', 'lime', 'sand', 'orange'] }); } catch { /* ignore */ }
  }
  localInput(ctx, dt, lane) {
    if (lane.isLocal && !this.botSkillLocal && !this.opts.attract) {
      const dialX = ctx.hud.width / 2, dialY = 56;
      return this.lean.read(ctx, dt, dialX, dialY);
    }
    return null; // bot
  }
  // Bot behaviour per kind. Returns {u:{x,y}, breath, step}
  botDrive(lane, dt, target) {
    const skill = lane.skill || 'average';
    const errF = skill === 'expert' ? 0.15 : skill === 'good' ? 0.4 : skill === 'sloppy' ? 1.1 : 0.7;
    const u = lane.bot.drive(lane.dot, target || { x: 0, y: 0 }, dt);
    return { u, breath: (Math.sin(this.playT * (Math.PI * 2 / 8)) > 0), errF };
  }
  fixedUpdate(ctx, dt) {
    if (this.paused) return;
    this.phaseT += dt;
    if (this.phase === 'intro' && this.phaseT > 2.5) { const slot = App.slot(); const first = slot && !slot.played[this.act.id]; this.phase = this.opts.attract ? 'play' : (first ? 'practice' : 'countdown'); this.phaseT = 0; if (this.phase === 'play') this.playT = 0; }
    else if (this.phase === 'practice' && this.phaseT > 8) { this.phase = 'countdown'; this.phaseT = 0; }
    else if (this.phase === 'countdown' && this.phaseT > 3) { this.phase = 'play'; this.phaseT = 0; this.playT = 0; }
    if (this.phase !== 'play' && this.phase !== 'practice') return;
    const scored = this.phase === 'play';
    this.playT += scored ? dt : 0;
    const tNow = scored ? this.playT : this.phaseT;
    const T = App.tunables; const a = this.act;
    const ring = this.ringRadius();
    // Long Stand events
    let mods = {}; let target = { x: 0, y: 0 };
    if (a.kind === 'longstand') {
      if (tNow > 10 && tNow < 85) mods.bx = 0.10;
      if (Math.abs(tNow - 20) < dt) for (const l of this.lanes) l.dot.impulse(0, -0.6);
      if (tNow > 35 && tNow < 75) mods.noise = 1.2;
      if (Math.abs(tNow - 65) < dt) for (const l of this.lanes) l.dot.impulse((this.lanes[0].rand() - 0.5), (this.lanes[0].rand() - 0.5));
    }
    if (a.bias) mods.bx = Math.sin(tNow * 0.3) * a.bias;
    if (a.ramp) mods.noise = lerp(1, a.ramp, clamp(tNow / (a.hold || 30), 0, 1));
    if (a.inst) mods.inst = a.inst;
    for (const lane of this.lanes) {
      lane.frames++;
      const isBotLane = !lane.isLocal || !!this.botSkillLocal || !!this.opts.attract;
      let u = { x: 0, y: 0 }; let breathHeld = false;
      if (!isBotLane) { u = this.localInput(ctx, dt, lane) || { x: 0, y: 0 }; breathHeld = ctx.input.isDown('PadR2') || ctx.input.isDown('Space') || ctx.input.isDown('MouseLeft'); }
      else { const b = this.botDrive(lane, dt, target); u = b.u; breathHeld = b.breath; }
      // Breath sync
      if (a.breath) {
        const cyc = (tNow % (a.breath * 2)) / (a.breath * 2); const wantIn = cyc < 0.5;
        const targetS = (wantIn === breathHeld) ? 1 : 0; lane.breathS += (targetS - lane.breathS) * Math.min(1, dt * 3);
      }
      const m2 = { ...mods };
      if (a.noiseY) m2.noise = (m2.noise || 1) * 1; // y-noise approx via overall
      if (a.breath) m2.noise = (mods.noise || 1) * (1.25 - (T.breathBonus || 0.55) * lane.breathS);
      if (a.kind === 'slack') {
        const walking = u.y > 0.3; m2.inst = (walking ? (T.slackWalkInst || 2.6) : 1.2) / (T.dotInstability || 0.6); m2.noise = 1.25;
        // gusts every ~6m
        if (Math.floor(lane.progress / 6) !== Math.floor((lane.progress) / 6)) { /* handled below */ }
      }
      lane.dot.step(dt, u.x, u.y, T, m2);
      if (a.kind === 'slack') lane.dot.y = lane.dot.vy = 0;
      const distC = Math.hypot(lane.dot.x, lane.dot.y);
      const inRing = distC <= ring || App.godMode;
      if (inRing) lane.inFrames++;
      // Kind scoring
      if (scored) this.scoreLane(lane, dt, u, inRing, tNow);
      // Avatar lean
      if (lane.av?.model) { lane.av.model.rotation.z = -lane.dot.x * 0.18; lane.av.model.rotation.x = -lane.dot.y * 0.12; }
    }
    if (scored && tNow >= this.duration()) this.finish(ctx);
    // Attract: advance playlist every 14s
    if (this.opts.attract && tNow > 14) { const next = ATTRACT_PLAYLIST[(this.opts.playlistIdx + 1) % ATTRACT_PLAYLIST.length]; void goTo(ctx, new ActivityGame(next, { attract: true, playlistIdx: this.opts.playlistIdx + 1 }), CAM.lane3); }
  }
  scoreLane(lane, dt, u, inRing, tNow) {
    const a = this.act; const T = App.tunables;
    switch (a.kind) {
      case 'still': case 'longstand': break; // from inFrames at finish; live score updated in finish calc
      case 'reps': {
        const tempo = (a.tempo || 3.2) * (T.repTempoScale || 1); const total = a.reps + 2;
        const repF = (tNow / tempo); const repIdx = Math.floor(repF); const ph = repF - repIdx;
        let target = 0; if (ph < 0.4) target = ph / 0.4; else if (ph < 0.55) target = 1; else if (ph < 0.9) target = 1 - (ph - 0.55) / 0.35; else target = 0;
        const isBotLane = !lane.isLocal || !!this.botSkillLocal;
        let inputR;
        if (isBotLane) { const errF = lane.skill === 'expert' ? 0.05 : lane.skill === 'good' ? 0.12 : lane.skill === 'sloppy' ? 0.35 : 0.2; inputR = clamp(target + Math.sin(tNow * 2 + lane.i) * errF, 0, 1); }
        else {
          // stick up/down scrubs; keyboard rate control via W/S handled as target velocity approx by lean y
          inputR = clamp(0.5 - u.y * 0.9, 0, 1);
          if (a.id === 'lunge') inputR = clamp(0.5 + u.x * 0.9 * (repIdx % 2 ? -1 : 1), 0, 1);
          if (a.heavy) inputR = clamp(0.5 - u.y * 0.9, 0, 1);
        }
        const lagK = 1 - Math.exp(-dt / Math.max(0.02, (T.repLag || 0.1) * (a.heavy ? 1.5 : 1)));
        lane.r += (inputR - lane.r) * lagK;
        const tremor = (T.repFatigue || 0.1) * Math.pow(clamp(repIdx / total, 0, 1), 2) * Math.sin(tNow * 30);
        const err = Math.abs((lane.r + tremor * 0.02) - target);
        lane.repScoreSum += clamp(1 - 1.6 * err, 0, 1) * dt; lane.repCount += dt;
        if (lane.av) { const dur = 1; lane.av.setTime(a.clip, clamp(lane.r, 0, 1) * dur); }
        break;
      }
      case 'hoop': {
        const isBotLane = !lane.isLocal || !!this.botSkillLocal;
        let angVel = 0;
        if (isBotLane) { angVel = lane.skill === 'expert' ? 1.6 : lane.skill === 'good' ? 1.4 : lane.skill === 'sloppy' ? 0.7 : 1.2; if (Math.floor(tNow / 25) % 2 === 1) angVel = -angVel; }
        else {
          const mag = Math.hypot(u.x, u.y);
          if (mag > 0.5) { const ang = Math.atan2(u.y, u.x); if (lane.lastAng !== null) { let d = ang - lane.lastAng; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; lane.angVel = lerp(lane.angVel, d / Math.max(dt, 0.001) / (Math.PI * 2), 0.4); } lane.lastAng = ang; }
          else lane.angVel *= (1 - dt * 2);
          angVel = lane.angVel;
        }
        const dirWant = tNow < 25 ? 1 : tNow < 50 ? -1 : 0;
        const inBand = Math.abs(angVel) >= (T.hoopLow || 0.9) && Math.abs(angVel) <= (T.hoopHigh || 2.4) && (dirWant === 0 || Math.sign(angVel) === dirWant);
        const wrong = dirWant !== 0 && Math.sign(angVel) === -dirWant && Math.abs(angVel) > 0.3;
        if (inBand) { lane.lift = clamp(lane.lift + (T.hoopLiftRate || 0.35) * dt, 0, 1); lane.hoopScore += Math.abs(angVel) * dt * lane.hoops; }
        else lane.lift = clamp(lane.lift - (wrong ? 0.5 : 0.25) * dt, 0, 1);
        if (lane.lift <= 0) { lane.lift = 0.3; /* dropped: brief pickup */ }
        lane.angle += angVel * dt * Math.PI * 2;
        break;
      }
      case 'step': {
        // Chart: 104 BPM. Notes every beat alternating feet.
        const beat = 60 / 104; const idx = Math.floor(tNow / beat);
        if (idx !== lane._lastBeat) {
          lane._lastBeat = idx; lane.stepTotal++;
          const foot = idx % 2 === 0 ? 'L' : 'R';
          let hit = false;
          if (!lane.isLocal || this.botSkillLocal) { const p = lane.skill === 'expert' ? 0.95 : lane.skill === 'good' ? 0.8 : lane.skill === 'sloppy' ? 0.4 : 0.65; hit = lane.rand() < p; lane.stepAcc += hit ? (lane.rand() < 0.6 ? 1 : 0.7) : 0; }
          lane._pendingFoot = foot; lane._pendingTime = tNow;
        }
        break;
      }
      case 'header': {
        lane.laneX = clamp(lane.laneX + u.x * 4.5 * dt, -2, 2);
        this.spawnT -= dt;
        if (lane.isLocal && this.spawnT <= 0) {
          this.spawnT = (App.tunables.headerInterval || 1.0) * (0.9 + Math.random() * 0.2);
          const kinds = ['coconut', 'coconut', 'coconut', 'flipflop', 'pineapple'];
          const kind = Math.random() < 0.05 ? 'pineapple' : (Math.random() < 0.25 ? 'flipflop' : 'coconut');
          this.objects.push({ x: (Math.random() * 2 - 1) * 1.8, t: 0, fall: 1.4, kind, laneX: lane.laneX });
        }
        if (lane.isLocal) {
          for (const o of this.objects) {
            o.t += dt;
            if (o.t >= o.fall && !o.resolved) {
              o.resolved = true;
              const hit = Math.abs(o.x - lane.laneX) < 0.45;
              if (o.kind === 'coconut') { if (hit) { lane.combo++; const tier = lane.combo >= 20 ? 4 : lane.combo >= 10 ? 3 : lane.combo >= 5 ? 2 : 1; lane.headerScore += 10 * tier; try { this._ctx?.audio.play('bonk'); } catch { /* ignore */ } } else lane.combo = 0; }
              else if (o.kind === 'pineapple') { if (hit) lane.headerScore += 30; }
              else { if (hit) { lane.headerScore = Math.max(0, lane.headerScore - 10); lane.combo = 0; } }
            }
          }
          this.objects = this.objects.filter(o => !o.resolved || o.t < o.fall + 0.2);
        } else {
          // bot lanes: simulate score rate by skill
          const rate = lane.skill === 'expert' ? 9 : lane.skill === 'good' ? 6 : lane.skill === 'sloppy' ? 2 : 4;
          lane.headerScore += rate * dt * (0.7 + lane.rand() * 0.6);
        }
        break;
      }
      case 'slack': {
        const walking = u.y > 0.3 || (!lane.isLocal && Math.abs(lane.dot.x) < 0.45);
        if (walking && Math.abs(lane.dot.x) < 0.9) lane.progress += 1.1 * dt;
        if (Math.abs(lane.dot.x) > 1 && !App.godMode) { lane.falls++; lane.progress = Math.floor(lane.progress / 10) * 10; lane.dot.x = 0; lane.dot.vx = 0; }
        if (lane.progress >= (a.dist || 30) && !lane._done) lane._done = true;
        break;
      }
      case 'tray': {
        // Tilt ball toward cups with lag; score on delivery (simulated physics).
        for (const v of lane.vitamins) {
          if (v.done) continue;
          const cup = lane.cups.find(c => c.c === v.c);
          let tx = 0, ty = 0;
          if (!lane.isLocal || this.botSkillLocal) { tx = clamp((cup.x - v.x) * 0.8, -1, 1); ty = clamp((cup.y - v.y) * 0.8, -1, 1); }
          else { tx = u.x; ty = u.y; }
          const g = (App.tunables.trayGravity || 9.8) / 9.8;
          v.x += tx * g * dt * 0.6; v.y += ty * g * dt * 0.6;
          v.x = clamp(v.x, -0.9, 0.9); v.y = clamp(v.y, -0.9, 0.9);
          if (Math.hypot(v.x - cup.x, v.y - cup.y) < 0.18) { v.done = true; lane.trayScore += 10; }
        }
        break;
      }
      case 'jog': {
        // Cadence from alternating feet (bots simulate; local from step keys polled in update — here approximate from lean oscillation + bot fallback)
        const isBotLane = !lane.isLocal || !!this.botSkillLocal;
        if (isBotLane) { const targetC = lane.skill === 'expert' ? 3.0 : lane.skill === 'good' ? 2.9 : lane.skill === 'sloppy' ? 2.0 : 2.7; lane.cadence = lerp(lane.cadence, targetC, dt); }
        else { lane.cadence = lerp(lane.cadence, Math.abs(u.x) > 0.2 ? 2.8 : lane.cadence * 0.99, dt * 2); }
        const inBand = lane.cadence >= 2.4 && lane.cadence <= 3.6;
        lane.progress += (lane.cadence / 3) * 3 * dt * (inBand ? 1 : 0.6);
        lane.jogScore = clamp(70 * clamp(lane.progress / 220, 0, 1) + 30 * (lane.cups / 18), 0, 100);
        break;
      }
      case 'pier': {
        // Simplified: run-up hold in tuck zone builds speed; score at end from dot control.
        lane.pierDist = 8 + lane.inFrames / Math.max(1, lane.frames) * 30;
        break;
      }
    }
  }
  computeScore(lane) {
    const a = this.act;
    switch (a.kind) {
      case 'still': { const inR = lane.frames ? lane.inFrames / lane.frames : 0; if (a.breath) return Math.round(100 * (0.8 * inR + 0.2 * lane.breathS)); return Math.round(100 * inR); }
      case 'longstand': { const inR = lane.frames ? lane.inFrames / lane.frames : 0; return Math.round(100 * inR); }
      case 'reps': return Math.round(100 * (lane.repCount ? lane.repScoreSum / lane.repCount : 0));
      case 'hoop': return Math.round(lane.hoopScore);
      case 'step': return Math.round(100 * (lane.stepTotal ? (lane.stepAcc / lane.stepTotal) : 0));
      case 'header': return Math.round(lane.isLocal ? lane.headerScore : lane.headerScore);
      case 'slack': { if (lane.progress >= (a.dist || 30)) { const t = this.playT; let s = 1; if (lane.falls === 0 && t < 32) s = 3; else if (lane.falls <= 1 && t < 45) s = 2; return s; } return 0; }
      case 'tray': { const max = lane.vitamins.length * 10; return Math.round(100 * (lane.trayScore / Math.max(1, max)) * 0.8 + lane.trayScore * 0.2); }
      case 'jog': return Math.round(lane.jogScore || (70 * clamp(lane.progress / 220, 0, 1)));
      case 'pier': return Math.round(clamp(lane.pierDist, 0, 45) * 10) / 10;
      default: return 0;
    }
  }
  finish(ctx) {
    if (this.finished) return; this.finished = true; this._ctx = ctx;
    this.score = this.computeScore(this.local);
    // Slack score is stars directly; pier score is metres.
    let dispScore = this.score;
    const res = awardActivity(this.act, this.act.kind === 'slack' ? this.score : dispScore, this.playT, { dropIn: !!this.opts.dropIn, session: !!this.opts.session });
    // For slack, awardActivity expects stars code — recompute stars properly:
    if (this.act.kind === 'slack') { res.stars = this.score; /* score is stars */ dispScore = Math.round(1000 - 60 * this.local.falls - 8 * Math.max(0, this.playT - 27)); }
    if (this.act.kind === 'pier') { res.stars = starsFor(dispScore, this.act.stars); }
    this.result = { ...res, score: dispScore };
    this.phase = 'results'; this.phaseT = 0;
    try { ctx.audio.play('star'); ctx.particles.burst('confetti', new Vector3(0, 2, 0), { count: 24 }); } catch { /* ignore */ }
    if (this.act.id === 'longstand' && !this.opts.dropIn) { const slot = App.slot(); if (slot && slot.day === 7 && !slot.confession) { /* ending triggered from island advance; mark done */ } }
    if (this.opts.onDone) this.opts.onDone(this.result, this.score);
  }
  // Step input from update (foot keys) feeds local lane accuracy.
  handleStepKeys(ctx) {
    const lane = this.local; if (!lane || this.act.kind !== 'step' || this.phase !== 'play') return;
    const now = this.playT; const beat = 60 / 104; const idx = Math.floor(now / beat); const foot = idx % 2 === 0 ? 'L' : 'R';
    const off = ((now / beat) - idx - 0.5) * beat * 1000 + (App.tunables.stepOffsetMs || 0);
    const pressL = ctx.input.wasPressed('PadL1') || ctx.input.wasPressed('PadL2') || ctx.input.wasPressed('KeyF') || ctx.input.wasPressed('ArrowLeft');
    const pressR = ctx.input.wasPressed('PadR1') || ctx.input.wasPressed('PadR2') || ctx.input.wasPressed('KeyJ') || ctx.input.wasPressed('ArrowRight');
    const pressMouseL = ctx.input.wasPressed('MouseLeft'); const pressMouseR = ctx.input.wasPressed('MouseRight');
    const got = pressL || pressMouseL ? 'L' : pressR || pressMouseR ? 'R' : null;
    if (got) {
      const w = (App.tunables.stepWindow || 1);
      const aoff = Math.abs(off);
      if (got === foot) { if (aoff <= 55 * w) lane.stepAcc += 1; else if (aoff <= 100 * w) lane.stepAcc += 0.7; else if (aoff <= 140 * w) lane.stepAcc += 0.4; try { ctx.audio.play(aoff <= 55 * w ? 'chimeIn' : 'repTick'); } catch { /* ignore */ } }
    }
    // Jog foot alternation
    if (this.act.kind === 'jog' && got) {
      if (got !== lane._lastFootGot) { lane.cadence = clamp(lane.cadence + 0.4, 0, 4); lane._lastFootGot = got; if (Math.random() < 0.1) lane.cups = Math.min(18, lane.cups + 1); }
      else lane.cadence = Math.max(0, lane.cadence - 0.3);
    }
  }
  update(ctx, dt) {
    this._ctx = ctx; updateDevice(ctx);
    if (this.paused) { this.drawPause(ctx); return; }
    if (pausePressed(ctx) && !App.session && !this.opts.attract) { this.paused = true; try { ctx.engine.timeScale = 0; } catch { /* ignore */ } this.pauseMenu = new Menu([{ id: 'resume', label: 'Resume' }, { id: 'restart', label: 'Restart activity' }, { id: 'island', label: 'Back to the island' }, { id: 'settings', label: 'Settings' }, { id: 'howto', label: 'How to play' }, { id: 'about', label: 'About & Credits' }, { id: 'dev', label: 'Dev Tools' }]); return; }
    if (this.opts.attract) {
      // Any input exits attract.
      let any = false;
      try { any = confirmPressed(ctx) || backPressed(ctx) || ctx.input.wasPressed('MouseLeft') || Math.abs(ctx.input.mouseDelta?.x || 0) > 3 || Math.abs(ctx.input.mouseDelta?.y || 0) > 3; } catch { /* ignore */ }
      if (any) { void goTo(ctx, new TitleGame('main'), CAM.title); return; }
    }
    for (const lane of this.lanes || []) if (lane.av?.mixer) lane.av.mixer.update(dt);
    if (this.coach?.mixer) this.coach.mixer.update(dt);
    if (this.dlg) this.dlg.update(ctx, dt);
    this.handleStepKeys(ctx);
    const hud = ctx.hud; hud.clear(); if (App.hideHud) return;
    const a = this.act; const lane = this.local;
    say(hud, 12, 20, `${a.name} — ${a.station}`, { color: 'white', scale: 1 });
    const ring = this.ringRadius();
    if (lane) {
      const inRing = Math.hypot(lane.dot.x, lane.dot.y) <= ring;
      drawDial(hud, hud.width / 2, 56, 44, lane.dot, ring / 1.2, { inRing });
      // mouse crosshair line
      try { const p = ctx.input.pointer; if (p?.over) { const axp = (p.x + 1) / 2 * hud.width, ayp = (1 - p.y) / 2 * hud.height; hud.rect(axp - 3, ayp, 7, 1, 'cyan'); hud.rect(axp, ayp - 3, 1, 7, 'cyan'); } } catch { /* ignore */ }
    }
    if (this.phase === 'intro') { drawCentered(hud, 112, goalLineFor(a), { color: 'sand', scale: 1 }); drawCentered(hud, 124, controlLineFor(a), { color: 'mist', scale: 1 }); }
    else if (this.phase === 'practice') drawCentered(hud, 112, 'Try it. (Unscored)', { color: 'cyan', scale: 1 });
    else if (this.phase === 'countdown') drawCentered(hud, 112, String(Math.ceil(3 - this.phaseT)), { color: 'white', scale: 3 });
    else if (this.phase === 'play') {
      const remain = Math.max(0, this.duration() - this.playT);
      say(hud, 12, 8, `Time ${remain.toFixed(0)}s`, { color: 'sand', scale: 1 });
      say(hud, hud.width - 120, 8, `Score ${Math.round(this.computeScore(lane))}`, { color: 'cyan', scale: 1 });
      if (a.kind === 'still' && a.breath) { const cyc = (this.playT % (a.breath * 2)) / (a.breath * 2); drawCentered(hud, 112, cyc < 0.5 ? 'In... (hold ' + glyphFor('confirm') + ')' : 'Out... (release)', { color: 'white', scale: 1 }); hud.rect(hud.width / 2 - 40, 124, 80 * (cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2), 4, 'cyan'); }
      if (a.kind === 'hoop') drawCentered(hud, 112, this.playT < 25 ? 'Circle one way!' : this.playT < 50 ? 'Now the other way.' : 'Either way!', { color: 'sand', scale: 1 });
      if (a.kind === 'header' && lane) drawCentered(hud, 112, `Lane ${lane.laneX.toFixed(1)}  Combo x${lane.combo >= 20 ? 4 : lane.combo >= 10 ? 3 : lane.combo >= 5 ? 2 : 1}  Head coconuts, dodge flip-flops!`, { color: 'sand', scale: 1 });
      if (a.kind === 'slack' && lane) drawCentered(hud, 112, `${lane.progress.toFixed(1)}m / ${a.dist}m  Falls ${lane.falls}  Push forward to walk.`, { color: 'sand', scale: 1 });
      if (a.kind === 'step') drawCentered(hud, 112, 'Step on the beat: F/J, L1/R1, or mouse buttons.', { color: 'sand', scale: 1 });
      if (a.kind === 'reps') drawCentered(hud, 112, 'Match the marker. Coach says: Last one. (She lies.)', { color: 'sand', scale: 1 });
      if (a.kind === 'tray') drawCentered(hud, 112, 'Tilt to roll vitamins into matching cups.', { color: 'sand', scale: 1 });
      if (a.kind === 'jog' && lane) drawCentered(hud, 112, `Cadence ${lane.cadence.toFixed(1)}/s (2.4-3.6)  Cups ${lane.cups}/18`, { color: 'sand', scale: 1 });
      if (a.kind === 'pier') drawCentered(hud, 112, 'Hold the tuck, press at the lip, stay in the ring!', { color: 'sand', scale: 1 });
      if (a.kind === 'longstand') drawCentered(hud, 112, longStandCaption(this.playT), { color: 'orange', scale: 1 });
      // Mini lane scores
      (this.lanes || []).forEach((l, i) => { say(hud, 12 + i * 130, hud.height - 26, `${l.isLocal ? 'You' : (i === 0 ? 'Classmate A' : 'Classmate B')}: ${Math.round(this.computeScore(l))}`, { color: l.isLocal ? 'cyan' : 'mist', scale: 1 }); });
    } else if (this.phase === 'results' && this.result) {
      panel(hud, 40, 40, hud.width - 80, 150, 'ink');
      drawCentered(hud, 50, a.name + ' — Results', { color: 'white', scale: 1 });
      drawCentered(hud, 66, `Score ${this.result.score}   ${starsLine(this.result.stars)}`, { color: 'cyan', scale: 2 });
      drawCentered(hud, 92, this.result.line, { color: 'sand', scale: 1 });
      if (!this.opts.dropIn && !this.opts.session) drawCentered(hud, 104, `+${this.result.drips} Drips into the Sweat Jar.`, { color: 'lime', scale: 1 });
      this.result.classmates.forEach((c, i) => drawCentered(hud, 118 + i * 10, `${c.name}: ${c.score} ${c.beaten ? '(beaten!)' : ''}`, { color: c.beaten ? 'lime' : 'mist', scale: 1 }));
      drawCentered(hud, 152, `${glyphFor('confirm')} Continue   [R] Retry`, { color: 'white', scale: 1 });
      if (confirmPressed(ctx)) { if (this.opts.onDone) { /* medley handles */ } else if (this.opts.dropIn) void goTo(ctx, new TitleGame('dropin'), CAM.title); else void goTo(ctx, new IslandGame(), CAM.island); }
      if (ctx.input.wasPressed('KeyR')) void goTo(ctx, new ActivityGame(a.id, { ...this.opts }), CAM.lane3);
    }
    if (this.opts.attract) { drawCentered(hud, 24, TITLE, { color: 'white', scale: 2 }); drawCentered(hud, hud.height - 36, 'Press any button.', { color: 'sand', scale: 1 }); drawCentered(hud, hud.height - 24, 'Ounce: This is a recording. The person in it is doing better than you.', { color: 'cyan', scale: 1 }); }
    if (this.dlg) this.dlg.draw(hud);
  }
  drawPause(ctx) {
    const hud = ctx.hud; hud.clear();
    panel(hud, 40, 50, hud.width - 80, 150, 'ink');
    drawCentered(hud, 60, 'Paused — ' + this.act.name, { color: 'white', scale: 2 });
    this.pauseMenu.draw(hud, 50, 84, { width: 240 });
    const pick = this.pauseMenu.update(ctx, 0.016);
    const resume = () => { this.paused = false; try { ctx.engine.timeScale = App.timeScalePref; } catch { /* ignore */ } };
    if (pick === 'resume' || backPressed(ctx)) resume();
    else if (pick === 'island') { resume(); void goTo(ctx, App.slot() ? new IslandGame() : new TitleGame('main'), App.slot() ? CAM.island : CAM.title); }
    else if (pick === 'restart') { resume(); void goTo(ctx, new ActivityGame(this.act.id, { ...this.opts }), CAM.lane3); }
    else if (pick === 'settings') { resume(); void goTo(ctx, new TitleGame('settings'), CAM.title); }
    else if (pick === 'howto') { resume(); }
    else if (pick === 'about') { resume(); void goTo(ctx, new TitleGame('about'), CAM.title); }
    else if (pick === 'dev') { resume(); void goTo(ctx, new DevGame('activity:' + this.act.id), CAM.title); }
  }
  cameraTarget() { return new Vector3(0, 1.15, 0); }
  status() { return `activity ${this.act.id} | ${this.phase} | t ${this.playT.toFixed(1)} | score ${Math.round(this.score || this.computeScore(this.local || { dot: { x: 0, y: 0 }, frames: 1, inFrames: 0 } ))} device ${App.device}`; }
  fingerprint(ctx) { const l = this.local; return l ? `act:${this.act.id}:${this.computeScore(l)}:${l.dot.x.toFixed(3)},${l.dot.y.toFixed(3)}` : `act:${this.act.id}:none`; }
}
function coachLineFor(a) { return { still: 'You are a tree. A tree does not check its phone.', reps: 'Good. Again. That was also good. Again.', hoop: 'Circles. Small, smug circles.', step: 'On the beat. The floor is your friend.', header: 'Head the coconut. Not the flip-flop.', slack: 'Walk when steady. Stop to recover.', tray: 'Tilt gently. The tray believes in you.', jog: 'Alternate feet. I shall pace you.', pier: 'Tuck. Leap. Cannonball, if you must.', longstand: 'Stand.' }[a.kind] || 'Stand.'; }
function goalLineFor(a) { if (a.kind === 'still') return `Hold the Dot in the ring for ${a.hold}s.`; if (a.kind === 'reps') return `Match the tempo for ${a.reps} reps. (Plus two. Coach lies.)`; if (a.kind === 'hoop') return 'Keep the hoop up for 60s.'; if (a.kind === 'step') return 'Step on the beat at 104 BPM.'; if (a.kind === 'header') return 'Head coconuts. Dodge flip-flops.'; if (a.kind === 'slack') return 'Cross 30m. Stopping to recover is wise.'; if (a.kind === 'tray') return 'Roll vitamins into matching cups.'; if (a.kind === 'jog') return 'Jog the island. Alternate feet.'; if (a.kind === 'pier') return 'Three attempts. Jump far.'; return 'Stand still for 90s.'; }
function controlLineFor(a) { return 'Lean: stick / WASD / mouse. ' + (a.breath ? 'Breathe: hold Space/R2. ' : '') + (a.kind === 'step' || a.kind === 'jog' ? 'Feet: F/J or L1/R1.' : ''); }
function longStandCaption(t) { if (t < 10) return 'Coach: Stand.'; if (t < 20) return 'Kevin lands on your head.'; if (t < 30) return 'Dennis sneezes.'; if (t < 45) return 'Light rain. Noise rises.'; if (t < 55) return 'Marguerite applauds, slowly. Ounce: Ignore her.'; if (t < 65) return 'June: Are you nearly done?'; if (t < 75) return 'Kettlebell Volcano rumbles.'; if (t < 85) return 'Rain stops. Sun out.'; return 'Coach: You may blink.'; }

// ================= MEDLEY (Family Hour + Hub ghost) =================
const MEDLEY_EVENTS = [
  { actId: 'still-tree', label: 'Stillness', dur: 25 },
  { actId: 'hoop', label: 'Beat', dur: 25 },
  { actId: 'header', label: 'Balance-lean', dur: 25 },
];
export class MedleyGame {
  name = 'The Medley';
  constructor(opts = {}) { this.opts = opts; this.phase = opts.session ? 'cardwait' : 'join'; this.eventIdx = 0; this.t = 0; this.phaseT = 0; this.scores = [0, 0, 0, 0]; this.eventScores = []; this.activity = null; this.joined = [true, false, false, false]; this.botsFill = true; this.resultSent = false; this.ghostTimer = null; this.ghosts = {}; this.leftPlayers = new Set(); this.countdownShown = false; }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); playSong(ctx, 'beat');
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [16, 1, 10], 'white', { collide: false }));
    this.dlg = new Dialogue(ctx);
    if (this.opts.session) { this.phase = 'card'; this.setupHub(ctx); }
    else this.dlg.sayAll([['Ounce', 'Family Hour. Each device claims a mat.'], ['Ounce', 'Press Cross or Enter to join. Up to 4.']]);
  }
  setupHub(ctx) {
    const H = (typeof window !== 'undefined' ? window.AIHub : null);
    if (!H) return;
    try {
      H.on('card', (c) => { this.cardState = c; });
      H.on('start', () => { this.phase = 'countdown'; this.phaseT = 0; });
      H.on('message', (data, from) => { this.ghosts[from] = data; });
      H.on('leave', ({ id }) => { this.leftPlayers.add(id); });
      H.on('time-up', () => { this.sendResult(true); });
      H.on('end', () => { this.phase = 'ended'; try { ctx.audio.playMusic(null); } catch { /* ignore */ } });
    } catch { /* harness tolerant */ }
    // Ghost sender: 100ms interval, starts on start (also send score 0 early once card shown).
    const sendGhost = () => {
      try {
        if (!window.AIHub || this.phase === 'ended') return;
        const act = this.activity; const sc = this.totalScore();
        const lane = act?.local;
        window.AIHub.send({ a: this.eventIdx, x: lane?.dot?.x ?? 0, y: lane?.dot?.y ?? 0, c: 0, t: 0, s: sc }, { reliable: false });
        window.AIHub.progress({ score: sc, label: `${TITLE} ${sc}` });
      } catch { /* ignore */ }
    };
    try { this.ghostTimer = setInterval(sendGhost, 100); } catch { /* headless */ }
    App.go = (id) => id; App.setDriver = (s) => { App.botSkill = s; };
  }
  totalScore() { return Math.round(this.scores.reduce((a, b) => a + b, 0)); }
  startEvent(ctx) {
    const ev = MEDLEY_EVENTS[this.eventIdx];
    const act = ACT_BY_ID[ev.actId];
    // Shortened medley version: reuse ActivityGame with onDone, 4 lanes, local index = my seat or 0.
    const mySeat = this.opts.session ? (App.sessionInfo?.me ?? 0) : 0;
    this.activity = new ActivityGame(ev.actId, { lanes: 4, localIndex: clamp(mySeat, 0, 3), session: !!this.opts.session, dropIn: true, botSkill: this.opts.session ? null : null,
      onDone: (res, raw) => {
        const norm = act.kind === 'header' ? clamp(Math.round(raw / 8), 0, 1000) : clamp(Math.round((raw / 100) * 1000), 0, 1000);
        this.scores[mySeat] = (this.scores[mySeat] || 0) + norm;
        this.eventScores.push(norm);
        this.eventIdx++;
        if (this.eventIdx < MEDLEY_EVENTS.length) { this.phase = 'between'; this.phaseT = 0; }
        else { this.phase = 'podium'; this.sendResult(false); }
        this.activity = null;
      } });
    // Override duration for medley events by monkey-patching duration.
    const origDur = this.activity.duration.bind(this.activity);
    this.activity.duration = () => ev.dur;
    this.phase = 'playing';
    // Setup activity in same scene? ActivityGame is a Game; embed by delegating: we load it as engine game for session simplicity in standalone, but for medley we run nested update.
    // Nested approach: call setup on current ctx.
    void this.activity.setup(ctx).catch(() => {});
  }
  sendResult(timeUp) {
    if (this.resultSent) return; this.resultSent = true;
    if (this.opts.session && typeof window !== 'undefined' && window.AIHub) {
      try { window.AIHub.result({ score: this.totalScore(), stats: { Events: this.eventScores.join(',') }, awards: [{ title: 'Stillest', detail: 'Noted by Ounce.' }] }); } catch { /* ignore */ }
    }
  }
  fixedUpdate(ctx, dt) { if (this.activity && this.phase === 'playing') this.activity.fixedUpdate(ctx, dt); }
  update(ctx, dt) {
    this.t += dt; updateDevice(ctx);
    if (this.activity && this.phase === 'playing') { this.activity.update(ctx, dt); return; }
    const hud = ctx.hud; hud.clear();
    if (this.phase === 'join') {
      drawCentered(hud, 30, 'Family Hour — The Medley', { color: 'white', scale: 2 });
      drawCentered(hud, 56, 'Each device claims a mat: press Cross / Enter.', { color: 'sand', scale: 1 });
      for (let i = 0; i < 4; i++) drawCentered(hud, 74 + i * 11, `Mat ${i + 1}: ${this.joined[i] ? 'Joined' : (this.botsFill ? 'Bot will fill' : 'Empty')}`, { color: this.joined[i] ? 'lime' : 'mist', scale: 1 });
      drawCentered(hud, 124, glyphFor('confirm') + ' Start Medley (3 events, ~90s)   B toggles bots', { color: 'white', scale: 1 });
      if (ctx.input.wasPressed('KeyB')) this.botsFill = !this.botsFill;
      if (confirmPressed(ctx)) { this.eventIdx = 0; this.startEvent(ctx); }
      if (backPressed(ctx)) void goTo(ctx, new TitleGame('main'), CAM.title);
      return;
    }
    if (this.phase === 'card') {
      const info = App.sessionInfo; const players = info?.players || [{ name: 'You', color: '#ffffff' }];
      drawCentered(hud, 24, TITLE, { color: 'white', scale: 3 });
      drawCentered(hud, 48, 'Score the most across three events. Stay in the circle.', { color: 'sand', scale: 1 });
      players.forEach((p, i) => drawCentered(hud, 66 + i * 11, `${p.name} — Seat ${i + 1}`, { color: 'white', scale: 1 }));
      const left = this.cardState?.left;
      drawCentered(hud, 116, left != null ? `Starts in ${(left / 1000).toFixed(0)}s` : 'Waiting for players...', { color: 'cyan', scale: 1 });
      drawCentered(hud, 130, 'Lean: stick / WASD / mouse. Enter or Cross: Ready. Triangle/M: More time.', { color: 'mist', scale: 1 });
      // Direct keydown for Enter handled in boot listener; also poll here.
      if (ctx.input.wasPressed('Enter') || ctx.input.wasPressed('PadCross')) { try { window.AIHub?.answer('ready'); } catch { /* ignore */ } }
      if (ctx.input.wasPressed('PadTriangle') || ctx.input.wasPressed('KeyM')) { try { window.AIHub?.answer('more'); } catch { /* ignore */ } }
      return;
    }
    if (this.phase === 'countdown') {
      let remain = 3;
      try { const t = window.AIHub?.time(); if (typeof t === 'number' && isFinite(t)) remain = Math.max(0, -t / 1000); } catch { /* ignore */ }
      drawCentered(hud, 70, 'Get ready... ' + remain.toFixed(1), { color: 'white', scale: 2 });
      if (remain <= 0) { this.eventIdx = 0; this.startEvent(ctx); }
      return;
    }
    if (this.phase === 'between') {
      this.phaseT += dt;
      drawCentered(hud, 70, `Event ${this.eventIdx} done. Next soon...`, { color: 'white', scale: 1 });
      drawCentered(hud, 86, `Total ${this.totalScore()}`, { color: 'cyan', scale: 2 });
      if (this.phaseT > 2) this.startEvent(ctx);
      return;
    }
    if (this.phase === 'podium') {
      drawCentered(hud, 40, 'Podium — The Medley', { color: 'white', scale: 2 });
      drawCentered(hud, 64, `Your total: ${this.totalScore()}`, { color: 'cyan', scale: 2 });
      drawCentered(hud, 84, 'Awards: Stillest, Most Apologetic, Best Knees (noted).', { color: 'sand', scale: 1 });
      drawCentered(hud, 98, 'Ounce: Noted. All of it. Filed.', { color: 'mist', scale: 1 });
      if (!this.opts.session) drawCentered(hud, 116, glyphFor('confirm') + ' Rematch / Title', { color: 'white', scale: 1 });
      if (!this.opts.session && confirmPressed(ctx)) void goTo(ctx, new TitleGame('main'), CAM.title);
      return;
    }
    if (this.phase === 'ended') { drawCentered(hud, 70, 'Round ended.', { color: 'white', scale: 1 }); return; }
    drawCentered(hud, 70, 'The Medley', { color: 'white', scale: 1 });
  }
  dispose() { if (this.ghostTimer) { try { clearInterval(this.ghostTimer); } catch { /* ignore */ } } }
  cameraTarget() { return new Vector3(0, 1, 0); }
  status() { return `medley ${this.phase} event ${this.eventIdx} total ${this.totalScore()} session ${!!this.opts.session}`; }
  fingerprint() { return `medley:${this.eventIdx}:${this.totalScore()}`; }
}
// Session card is MedleyGame in card phase (kept light for harness).
export class CardGame extends MedleyGame { constructor() { super({ session: true }); this.name = TITLE + ' Card'; } }

// ================= ENDING =================
export class EndingGame {
  name = 'Ending';
  constructor() { this.phase = 'confess'; this.t = 0; this.slide = 0; }
  async setup(ctx) {
    bootAudio(ctx); initInput(ctx); playSong(ctx, 'evening');
    ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [14, 1, 10], 'white', { collide: false }));
    const slot = App.ensureSlot();
    const av = await makeAvatar(ctx, slot.avatar, 'Idle'); av.model.position.set(0, 0, 0); ctx.scene.add(av.model); this.avatar = av;
    const oc = makeOunceMesh(1.4); oc.object.position.set(1.5, 0, 0); ctx.scene.add(oc.object); this.ounce = oc;
    this.dlg = new Dialogue(ctx);
    const before = slot.ages.slice();
    slot.confession = true;
    slot.ages = slot.ages.map(a => a - 7);
    App.persist();
    this.before = before;
    this.dlg.sayAll([['Ounce', 'I have been adding seven. To everyone. For years. It felt motivating.'], ['Coach', 'You are leaning.'], ['Ounce', 'See you tomorrow. Bring your knees.']], () => { this.phase = 'credits'; });
  }
  fixedUpdate() {}
  update(ctx, dt) {
    this.t += dt; if (this.dlg) this.dlg.update(ctx, dt);
    if (this.avatar?.mixer) this.avatar.mixer.update(dt);
    this.slide = clamp(this.slide + dt * 0.3, 0, 1);
    const hud = ctx.hud; hud.clear();
    drawCentered(hud, 20, 'The Long Stand — Complete', { color: 'white', scale: 2 });
    drawCentered(hud, 46, 'The chart slides down seven years.', { color: 'sand', scale: 1 });
    const slot = App.slot();
    (this.before || []).forEach((a, i) => { const x = hud.width / 2 - 60 + i * 18; const y0 = 130 - (a - 18); const y1 = 130 - ((a - 7) - 18); const y = lerp(y0, y1, this.slide); hud.rect(x, clamp(y, 80, 150), 8, 3, i === (this.before.length - 1) ? 'lime' : 'cyan'); });
    if (this.phase === 'credits') {
      drawCentered(hud, 110, 'Credits', { color: 'white', scale: 2 });
      drawCentered(hud, 128, TITLE + ' — a week on Tare Island.', { color: 'sand', scale: 1 });
      drawCentered(hud, 140, 'Ounce will see you tomorrow. Week 2 begins.', { color: 'mist', scale: 1 });
      drawCentered(hud, 154, glyphFor('confirm') + ' Continue to Week 2', { color: 'white', scale: 1 });
      if (confirmPressed(ctx)) { slot.week += 1; slot.day = 1; slot.doneToday = []; slot.weighed = false; App.persist(); void goTo(ctx, new IslandGame(), CAM.island); }
    }
    if (this.dlg) this.dlg.draw(hud);
  }
  cameraTarget() { return new Vector3(0, 1, 0); }
  status() { return `ending ${this.phase} confession ${App.slot()?.confession}`; }
}

// ================= DEV =================
export class DevGame {
  name = 'Dev Tools';
  constructor(back = 'island') { this.back = back; this.tab = 0; this.idx = 0; this.toolIdx = 0; }
  async setup(ctx) { bootAudio(ctx); initInput(ctx); ctx.scene.add(groundBlock(ctx, [0, -0.5, 0], [12, 1, 10], 'white', { collide: false })); const av = await makeAvatar(ctx, App.slot()?.avatar || { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' }, 'Idle'); av.model.position.set(0, 0, 0); ctx.scene.add(av.model); this.avatar = av; }
  fixedUpdate() {}
  update(ctx, dt) {
    if (this.avatar?.mixer) this.avatar.mixer.update(dt);
    const hud = ctx.hud; hud.clear();
    const tabs = [...TUNABLE_TABS.map(t => t.name), 'Tools'];
    drawCentered(hud, 10, 'Dev Tools — L1/R1 tabs (Q/E)', { color: 'white', scale: 1 });
    say(hud, 12, 24, tabs.map((t, i) => (i === this.tab ? '[' + t + ']' : t)).join('  '), { color: 'cyan', scale: 1 });
    if (ctx.input.wasPressed('PadL1') || ctx.input.wasPressed('KeyQ')) this.tab = (this.tab + tabs.length - 1) % tabs.length;
    if (ctx.input.wasPressed('PadR1') || ctx.input.wasPressed('KeyE')) this.tab = (this.tab + 1) % tabs.length;
    if (this.tab < TUNABLE_TABS.length) {
      const keys = TUNABLE_TABS[this.tab].keys;
      keys.forEach((k, i) => { const y = 40 + i * 11; if (i === this.idx) hud.rect(10, y - 2, hud.width - 20, 10, 'teal'); say(hud, 16, y, `${k}: ${Number(App.tunables[k]).toFixed(2)} (default ${TUNABLE_DEFAULTS[k]})`, { color: 'white' }); });
      say(hud, 12, hud.height - 30, 'Up/Down select, Left/Right adjust. X: reset tab. Y: reset all.', { color: 'sand', scale: 1 });
      if (ctx.input.wasPressed('ArrowUp')) this.idx = (this.idx + keys.length - 1) % keys.length;
      if (ctx.input.wasPressed('ArrowDown')) this.idx = (this.idx + 1) % keys.length;
      const dir = (ctx.input.wasPressed('ArrowRight') ? 1 : 0) - (ctx.input.wasPressed('ArrowLeft') ? 1 : 0);
      if (dir) { const k = keys[this.idx]; const step = Math.abs(App.tunables[k]) > 10 ? 5 : Math.abs(App.tunables[k]) > 2 ? 0.5 : 0.05; App.tunables[k] = Math.round((App.tunables[k] + dir * step) * 100) / 100; }
      if (ctx.input.wasPressed('PadSquare')) App.tunables.resetTab(this.tab);
      if (ctx.input.wasPressed('PadTriangle')) App.tunables.resetAll();
    } else {
      const tools = ['Go to Day 1', 'Go to Day 7', 'Give 50 Drips', 'Unlock all', 'Autopilot: cycle bot skill (' + App.botSkill + ')', 'God mode: ' + (App.godMode ? 'On' : 'Off'), 'Time scale: ' + App.timeScalePref, 'Hide HUD: ' + (App.hideHud ? 'On' : 'Off'), 'Jump to Holding Still', 'Reset save', 'Export tunables (console)', 'Back'];
      tools.forEach((t, i) => { const y = 40 + i * 10; if (i === this.toolIdx) hud.rect(10, y - 2, hud.width - 20, 9, 'teal'); say(hud, 16, y, t, { color: 'white' }); });
      if (ctx.input.wasPressed('ArrowUp')) this.toolIdx = (this.toolIdx + tools.length - 1) % tools.length;
      if (ctx.input.wasPressed('ArrowDown')) this.toolIdx = (this.toolIdx + 1) % tools.length;
      if (confirmPressed(ctx)) {
        const slot = App.ensureSlot();
        if (this.toolIdx === 0) { slot.day = 1; App.persist(); }
        if (this.toolIdx === 1) { slot.day = 7; App.persist(); }
        if (this.toolIdx === 2) { slot.drips += 50; checkUnlocks(); App.persist(); try { ctx.audio.play('drip'); } catch { /* ignore */ } }
        if (this.toolIdx === 3) { for (const u of UNLOCKS) if (!slot.unlocked.includes(u.name)) slot.unlocked.push(u.name); App.persist(); }
        if (this.toolIdx === 4) { const order = ['idle', 'sloppy', 'average', 'good', 'expert']; App.botSkill = order[(order.indexOf(App.botSkill) + 1) % order.length]; }
        if (this.toolIdx === 5) App.godMode = !App.godMode;
        if (this.toolIdx === 6) { App.timeScalePref = App.timeScalePref === 1 ? 0.25 : App.timeScalePref === 0.25 ? 2 : App.timeScalePref === 2 ? 3 : 1; try { ctx.engine.timeScale = App.timeScalePref; } catch { /* ignore */ } }
        if (this.toolIdx === 7) App.hideHud = !App.hideHud;
        if (this.toolIdx === 8) { void goTo(ctx, new ActivityGame('still-tree', {}), CAM.lane3); return; }
        if (this.toolIdx === 9) App.resetSave();
        if (this.toolIdx === 10) { const j = JSON.stringify(App.tunables.changed()); try { console.log('[Fit Getaway tunables]', j); navigator.clipboard?.writeText(j); } catch { /* ignore */ } }
        if (this.toolIdx === 11 || backPressed(ctx)) { void goTo(ctx, new IslandGame(), CAM.island); return; }
      }
    }
    say(hud, 12, hud.height - 16, glyphFor('back') + ' Back to island', { color: 'mist', scale: 1 });
    if (backPressed(ctx)) void goTo(ctx, new IslandGame(), CAM.island);
  }
  cameraTarget() { return new Vector3(0, 1, 0); }
  status() { return `dev tab ${this.tab} tunables ${JSON.stringify(App.tunables.changed())}`; }
}

// ================= BOOT =================
export function createGame() {
  if (App.session) return new CardGame();
  return new TitleGame('main');
}
App.go = (id, args) => { /* debug API placeholder, wired in ready() */ };
App.setDriver = (skill) => { App.botSkill = skill; };
// Attach ready hook via wrapper classes: engine calls ready(ctx) if present.
// Add ready to TitleGame prototype.
TitleGame.prototype.ready = function (ctx) { wireDebug(ctx); };
IslandGame.prototype.ready = function (ctx) { wireDebug(ctx); };
ActivityGame.prototype.ready = function (ctx) { wireDebug(ctx); };
MedleyGame.prototype.ready = function (ctx) { wireDebug(ctx); };
function wireDebug(ctx) {
  engineRef = ctx.engine;
  App.go = (id, args = {}) => {
    if (id === 'title') return goTo(ctx, new TitleGame('main'), CAM.title);
    if (id === 'island') return goTo(ctx, new IslandGame(), CAM.island);
    if (id === 'weighin') return goTo(ctx, new WeighInGame({}), CAM.weighin);
    if (id === 'dev') return goTo(ctx, new DevGame('island'), CAM.title);
    if (id === 'medley') return goTo(ctx, new MedleyGame({ local: true }), CAM.lane4);
    if (id === 'ending') return goTo(ctx, new EndingGame(), CAM.title);
    if (ACT_BY_ID[id]) return goTo(ctx, new ActivityGame(id, args), CAM.lane3);
  };
  App.state = () => { const base = { title: TITLE, device: App.device, prompt: App.promptState, slot: App.slotIndex, session: !!App.session, botSkill: App.botSkill }; const s = App.slot(); if (s) Object.assign(base, { day: s.day, week: s.week, drips: s.drips, stars: s.stars, confession: s.confession }); base.tunables = App.tunables.changed(); return base; };
  try { ctx.audio.setVolume('music', App.settings.music ?? 0.10); } catch { /* ignore */ }
}
// Browser boot (skipped in Node/headless imports).
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  (async () => {
    let info = null;
    try {
      if (window.AIHub?.active) {
        App.session = true;
        info = await window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
        App.sessionInfo = info;
        if (!info) App.session = false;
      }
    } catch { App.session = false; }
    // Direct keydown for card Enter (harness).
    try {
      document.addEventListener('keydown', (e) => { if (App.session && e.key === 'Enter') { try { window.AIHub?.answer('ready'); } catch { /* ignore */ } } });
    } catch { /* ignore */ }
    const touchOnly = touchOnlyDevice();
    const first = App.session ? new CardGame() : new TitleGame('main');
    try {
      const engine = await Engine.start(first, withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, settings: { button: touchOnly ? 'top-right' : false }, quality: App.session ? 'medium' : 'high', seed: info ? info.seed : 7, background: PALETTE.sky, camera: App.session ? CAM.lane4 : CAM.title }));
      engineRef = engine;
      if (App.session) { try { window.AIHub.ready(); } catch { /* ignore */ } }
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (App.session) { try { window.AIHub?.fail(msg); } catch { /* ignore */ } }
      // Engine prints its own failure; avoid unhandled rejection surfacing as page error beyond that.
      try { console.error('Failed to start:', msg); } catch { /* ignore */ }
    }
  })();
}






