// ===== part 1: the game, its input, settings, shared state and small helpers =====================================
const E = My3D2dge, R = WW.rules, W = WW.world, AU = WW.audio;
const { clamp } = E;
const HUB = globalThis.AIHub, inSession = !!(HUB && HUB.active);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// a screen that can only touch: no keyboard, no pad is likely; the game says so (touch controls are out of scope)
const touchOnly = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches && !matchMedia('(any-pointer: fine)').matches;
const TITLE = 'WALTER WHITEWASH';
const D0 = E.Input.DEFAULT;

// ---- controls ---------------------------------------------------------------------------------------------------------------
// Gamepad: left stick move, right stick aim, ✕ interact, □ attack (R2 too), ○ dodge, △ switch weapon, R1 sprint, L1 pills,
// Create map, R3 view. Keyboard: WASD, E, J or click, Space, Q, Shift, H, M or Tab, V. Mouse aims.
const PRESET = {
  up: D0.up, down: D0.down, left: D0.left, right: D0.right,
  interact: ['KeyE', 'Pad0'], attack: ['KeyJ', 'Mouse0', 'Pad2', 'Pad7'], dodge: ['Space', 'Pad1'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad5'],
  swap: ['KeyQ', 'Pad3', 'Mouse1'], heal: ['KeyH', 'Pad4'], map: ['KeyM', 'Tab', 'Pad8'], view: ['KeyV', 'Pad11'],
  start: D0.start, pause: D0.pause, confirm: D0.confirm, cancel: D0.cancel
};

// The common issue: a pad's axes sometimes arrive inverted. Two settings flip them at the source, so the sticks, the menus
// and the aim all follow (the left stick and the right stick together).
const flip = { h: false, v: false };
if (typeof navigator !== 'undefined' && navigator.getGamepads && !navigator.getGamepads.__ww) {
  const real = navigator.getGamepads.bind(navigator);
  const wrapped = () => Array.from(real() || []).map(p => {
    if (!p || (!flip.h && !flip.v)) return p;
    return new Proxy(p, { get(t, k) {
      if (k === 'axes') return Array.from(t.axes).map((v, i) => (i % 2 === 0 ? (flip.h ? -v : v) : (flip.v ? -v : v)));
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
    } });
  });
  wrapped.__ww = true;
  try { Object.defineProperty(navigator, 'getGamepads', { value: wrapped, configurable: true, writable: true }); } catch (e) { navigator.getGamepads = wrapped; }
}

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET,
  menu: { controls: { interact: 'Interact', attack: 'Attack and fire', dodge: 'Dodge', sprint: 'Sprint', swap: 'Switch weapon', heal: 'Pain pills', map: 'Map', view: 'Change view' }, saves: !inSession, quit: inSession ? false : 'title' }
});
game.input.touchEnabled = false;

const ui = new E.Shell(game, {
  theme: { ink: '#f4efe0', paper: '#0e1612', accent: '#6fd36a', muted: '#9bb09a', danger: '#ff6a4a', line: '#2c4a38' },
  settings: { items: [
    { key: 'invertH', label: 'Invert stick left / right', type: 'toggle', value: false, group: 'Controller' },
    { key: 'invertV', label: 'Invert stick up / down', type: 'toggle', value: false, group: 'Controller' },
    { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', group: 'Game' },
    { key: 'aimAssist', label: 'Aim assist', type: 'toggle', value: true, group: 'Game' }
  ], onChange(s, key) { applySettings(); } }
});
function applySettings() {
  const s = game.settings;
  flip.h = !!s.invertH; flip.v = !!s.invertV;
}
const diff = () => { const i = ['Easy', 'Normal', 'Hard'].indexOf(game.settings.difficulty); return i < 0 ? 1 : i; };
applySettings();
// PlayStation glyphs by default on a controller; Settings > Button symbols switches to Xbox (A B X Y)
try {
  if (!inSession && typeof localStorage !== 'undefined' && !localStorage.getItem('ww-glyph-init')) { localStorage.setItem('ww-glyph-init', '1'); game.settings.set('glyphs', 'playstation'); }
  else if (inSession && game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');
} catch (e) { /* storage blocked */ }

// ---- shared state ------------------------------------------------------------------------------------------------------------
let S = R.newState();
let map = null, mapName = 'town', flow = null, dress = [];
let mode = 'walk';                 // walk | cook | talk | cut
let auto = null;                   // the attract mode's brain (null in real play)
const hero = new E.Body({ x: 0, y: 0, r: 5 }); hero.facing = Math.PI / 2;
const rigs = {};
const rigFor = k => rigs[k] || (rigs[k] = new E.Humanoid(W.looks[k]));
let heroRig = rigFor('walt');
const fx = { shake: 0, loud: 0, toastQ: [], iFrames: 0, dodge: 0, dodgeCd: 0, atkCd: 0, fireCd: 0, hurt: 0, mouseActive: 0, lastMouse: null, hazmat: 0, tutorialShown: false, hint: null };
const lists = { customers: [], cops: [], thugs: [], npcs: [], drops: [], ghosts: new Map() };
let boss = null, stations = [], focusSt = null, hoverSt = null;
const shots = new E.Bullets(game, { plane: 'ground' });
const combo = new E.Combo(['jab', 'cross', 'hook'], { window: .35 });
let respawnT = { customers: 0, thugs: 0 };
let report = null;
let clockPaused = false;
let lastInputAt = nowMs();
const flags = () => S.flags;

const money = n => '$' + Math.round(n).toLocaleString('en-US');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const rnd = E.rand, pick = E.pick;
const keyOf = a => game.input.label(a);

function toast(title, text, secs) { ui.toast(title, text || '', secs || 3.2); }
function loud(n) { fx.loud = Math.max(fx.loud, n || 3); }
function shake(n) { game.shake(n); }

// the player's input this step, whatever made it: the pad, the keyboard, the mouse, or the attract mode's brain
function readCtrl(dt) {
  const I = game.input, c = { mx: 0, my: 0, sprint: false, attack: false, attackHeld: false, dodge: false, interact: false, swap: false, heal: false, aim: null, click: null };
  if (auto) return auto.ctrl(dt, c);
  const m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
  c.mx = d[0]; c.my = d[1];
  c.sprint = I.down('sprint');
  c.attack = I.pressed('attack') || I.buffered('attack', .12); c.attackHeld = I.down('attack');
  c.dodge = I.pressed('dodge'); c.interact = I.pressed('interact'); c.swap = I.pressed('swap'); c.heal = I.pressed('heal');
  c.click = I.pressed('attack') && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') && I.clicked ? I.clicked() : null;
  // aim: the right stick, else the mouse (while it moves), else the way you walk
  const ms = I.mouseScreen && I.mouseScreen();
  if (ms) { if (!fx.lastMouse || Math.hypot(ms[0] - fx.lastMouse[0], ms[1] - fx.lastMouse[1]) > 1.5) fx.mouseActive = 3; fx.lastMouse = ms.slice(); }
  fx.mouseActive = Math.max(0, fx.mouseActive - dt);
  if (I.padAim && I.lastDevice === 'gamepad') { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); c.aim = Math.atan2(a[1], a[0]); }
  else if (fx.mouseActive > 0 && I.lastDevice !== 'gamepad') { const g = game.mouseGround(); if (g) c.aim = Math.atan2(g[1] - hero.y, g[0] - hero.x); }
  return c;
}
