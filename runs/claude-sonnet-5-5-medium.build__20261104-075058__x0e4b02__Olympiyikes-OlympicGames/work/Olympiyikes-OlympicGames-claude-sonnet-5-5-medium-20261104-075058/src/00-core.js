// Olympiyikes! core: the OLY namespace, controls, settings, the E.Game, scene wrapper, rng, storage, bus.
(() => {
'use strict';
const E = My3D2dge, G = globalThis;
const O = G.OLY = { E, version: '1.0.0', title: 'OLYMPIYIKES!', tagline: 'Faster. Higher. Yikes.' };
const hasDOM = typeof document !== 'undefined' && typeof window !== 'undefined';
O.inHub = !!(G.AIHub && G.AIHub.active);

// ---------------------------------------------------------------- controls (controller-first, keyboard native)
const OLY_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  mashL: ['KeyJ', 'Pad2', 'Pad4'], mashR: ['KeyK', 'Pad1', 'Pad5'],
  action: ['Space', 'Pad0', 'Mouse0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad3'], alt: ['KeyL', 'Pad7', 'Pad6', 'Mouse2'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5']
};
O.KEYS = OLY_KEYS;

const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', help: 'CPU skill and timing windows' },
  { key: 'promptStyle', label: 'Controller prompts', options: ['PlayStation', 'Xbox'], value: 'PlayStation', help: 'Button glyphs for the controller',
    apply: (g, v) => { try { g.settings.set('glyphs', v === 'Xbox' ? 'xbox' : 'playstation'); } catch (e) { /* ignore */ } } },
  { key: 'mashAssist', label: 'Mash assist', options: ['Off', 'One button', 'Hold'], value: 'Off', help: 'One button: any mash key counts. Hold: holding gives a steady pace' },
  { key: 'timingAssist', label: 'Timing assist', options: ['Off', 'On'], value: 'Off', help: 'Timing windows 40% wider' },
  { key: 'commentary', label: 'Commentary', options: ['Voices + subtitles', 'Subtitles only', 'Off'], value: 'Voices + subtitles' },
  { key: 'textSize', label: 'Text size', options: ['Large', 'Huge'], value: 'Large' },
  { key: 'hints', label: 'Hints', options: ['On', 'Off'], value: 'On' },
  { key: 'voices', group: 'Sound', label: 'Voices volume', type: 'slider', min: 0, max: 1, step: .05, value: .8 },
  { key: 'crowd', group: 'Sound', label: 'Crowd volume', type: 'slider', min: 0, max: 1, step: .05, value: .7 }
];

const game = O.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', input: OLY_KEYS, id: 'olympiyikes', bg: '#0b0f24',
  menu: {
    items: [['Restart event', () => O.restartEvent && O.restartEvent()], ['How to play', () => O.showHelp && O.showHelp()], ['Dev mode', () => O.Dev && O.Dev.open()]],
    settings: GAME_SETTINGS, quit: O.inHub ? false : 'title',
    controls: { mashL: 'Left (mash, pass, tuck)', mashR: 'Right (mash, check, pike)', action: 'Action (start, jump, release)', turbo: 'YIKES Turbo', alt: 'Hold (breathe, steady, tuck)', tabL: false, tabR: false }
  }
});
if (O.inHub && game.settings) { /* the hub owns quit */ }

// ---------------------------------------------------------------- tuning (dev sliders) and cheats
O.TUNE_DEFAULTS = { cpuSkill: 0, timing: 1, mash: 1, wind: 1, hype: 1, speed: 1, rivalPace: 1 };
O.tune = Object.assign({}, O.TUNE_DEFAULTS);
O.cheat = { perfect: false, qual: false, torches: false, showHit: false };
O.diff = () => ({ Easy: { cpu: -.12, win: 1.25 }, Normal: { cpu: 0, win: 1 }, Hard: { cpu: .06, win: .85 } }[game.settings.difficulty] || { cpu: 0, win: 1 });
O.win = () => O.diff().win * (game.settings.timingAssist === 'On' ? 1.4 : 1) * O.tune.timing;   // timing window multiplier
O.textScale = () => (game.settings.textSize === 'Huge' ? 3 : 2);

// ---------------------------------------------------------------- storage, bus, rng
const hash = s => { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
O.hash = hash;
const mem = {};   // in-memory mirror: storage may be blocked (hub sessions, private tabs, headless tests)
O.store = {
  get: (k, d) => { if (k in mem) return JSON.parse(mem[k]); try { const v = E.store.get('oly:' + k, d); return v === null || v === undefined ? d : v; } catch (e) { return d; } },
  set: (k, v) => { mem[k] = JSON.stringify(v === undefined ? null : v); try { E.store.set('oly:' + k, v); } catch (e) { /* ignore */ } }
};
const listeners = {};
O.bus = { on(n, f) { (listeners[n] = listeners[n] || []).push(f); }, emit(n, a) { (listeners[n] || []).forEach(f => f(a)); } };
const streams = {};
O.seed = 12345;
O.setSeed = s => { O.seed = s >>> 0; for (const k in streams) delete streams[k]; };
O.rng = label => {
  if (O.inHub && G.AIHub && G.AIHub.rng && G.AIHub.active && O.hubInfo) { if (!streams[label]) streams[label] = G.AIHub.rng(label); return streams[label]; }
  if (!streams[label]) streams[label] = E.rng(hash(O.seed + '|' + label));
  return streams[label];
};
O.gauss = r => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / .7071; };   // ~N(0,1)
O.clamp = E.clamp;
O.crnd = E.rng(0xC05E7);   // cosmetic randomness: never touches Math.random or the gameplay streams
O.pad2 = n => (n < 10 ? '0' : '') + n;
O.fmtTime = s => { if (!isFinite(s)) return '--.--'; const m = Math.floor(s / 60), r = s - m * 60; return (m ? m + ':' + (r < 10 ? '0' : '') : '') + r.toFixed(2); };
O.fmtDist = m => m.toFixed(2) + ' m';
O.fmtPts = p => p.toFixed(1);

// ---------------------------------------------------------------- input helpers
O.pi = i => game.players[i] || game.input;
O.anyInput = () => {
  for (const p of game.players) if (p.anyPressed && p.anyPressed()) return true;
  return false;
};
O.pressedAny = a => game.players.some(p => p.pressed(a));
O.lastDevice = () => game.input.lastDevice || 'keyboard';
O.lastPointer = null; O.pointerMoved = false;
O.trackPointer = () => {
  const p = game.input.pointer && game.input.pointer();
  if (p && (!O.lastPointer || p[0] !== O.lastPointer[0] || p[1] !== O.lastPointer[1])) { O.pointerMoved = !!O.lastPointer; O.lastPointer = [p[0], p[1]]; } else O.pointerMoved = false;
};

// ---------------------------------------------------------------- scene wrapper
O.scenes = {};
O.toasts = [];
O.toast = (txt, col = '#ffe27a', t = 2) => O.toasts.push({ txt, col, t, max: t });
O.idle = 0;
O.scene = (name, def) => {
  const w = {
    pausable: !!def.pausable, view: def.view || 'side', touch: [],
    enter(data) {
      game.input.consumeAll(); O.lockT = def.lock === undefined ? .6 : def.lock; O.cur = name; O.curDef = def; O.idle = 0; O.menuScene = !!def.menu;
      if (def.enter) def.enter.call(def, data || {});
    },
    exit() { if (def.exit) def.exit.call(def); },
    update(dt) {
      O.trackPointer();
      if (O.Dev && O.Dev.isOpen()) { O.Dev.update(dt); return; }
      if (!dt) return;
      O.lockT = Math.max(0, O.lockT - dt);
      for (const t of O.toasts) t.t -= dt; O.toasts = O.toasts.filter(t => t.t > 0);
      if (def.menu && !O.inHub) {
        if (O.anyInput() || O.pointerMoved || game.input.clicked()) O.idle = 0; else O.idle += dt;
        if (O.idle > 10 && O.Attract) { O.idle = 0; O.Attract.start(); return; }
      }
      if (O.Comms) O.Comms.update(dt);
      if (O.Fireworks) O.Fireworks.update(dt);
      if (def.update) def.update.call(def, dt);
    },
    draw(r) {
      if (def.draw) def.draw.call(def, r);
      r.overlay(g => {
        if (O.Fireworks) O.Fireworks.draw(g);
        if (O.Comms) O.Comms.draw(g, r);
        let y = r.H - 40;
        for (const t of O.toasts) { const a = Math.min(1, t.t / .4); if (a > .2) E.font.text(g, t.txt, r.W / 2, y, t.col, { align: 'center', shadow: '#000', scale: 2 }); y -= 18; }
        if (O.Dev && O.Dev.isOpen()) O.Dev.draw(g, r);
      });
    },
    back() { return def.back ? !!def.back.call(def) : false; }
  };
  O.scenes[name] = w;
  return w;
};
O.go = (name, data, fade) => game.go(name, data, fade === undefined ? { fade: 'wipe' } : fade);
O.locked = () => O.lockT > 0;

// ---------------------------------------------------------------- touch-only detection
O.touchOnly = false; O.sawKeyOrPad = false;
if (hasDOM) {
  try { O.touchOnly = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0); } catch (e) { /* ignore */ }
  const seen = () => { O.sawKeyOrPad = true; O.touchOnly = false; };
  window.addEventListener('keydown', seen); window.addEventListener('gamepadconnected', seen);
  try { if (game.settings && O.touchOnly) game.settings.set('touch', 'off'); } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------- 10-foot HTML screens (pause, settings, controls): bigger, gold on navy
if (hasDOM) {
  try {
    const st = document.createElement('style'); st.id = 'oly-tv';
    st.textContent = '.esh{font-size:clamp(16px,1.55vw,30px);--accent:#f2b632;--paper:rgba(12,16,40,.94)} .esh button{font-size:1.15em!important;min-height:2.9em;padding:.7em 1em!important} .esh h2{font-size:2.2em} .esh-mod{width:min(820px,94vw)!important} .esh input[type=range]{width:min(320px,30vw);height:2.2em}';
    document.head.appendChild(st);
  } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------- palettes
O.C = { gold: '#f2b632', gold2: '#ffe27a', navy: '#0b0f24', navy2: '#1a2150', white: '#ffffff', red: '#e8443a', blue: '#3b82f6', green: '#22c55e', ink: '#101533', pink: '#ff8fd8', cyan: '#7fe0ff' };
})();
