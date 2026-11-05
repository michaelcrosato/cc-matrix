// WIRETAP: input. The key preset, the game settings, the gamepad axis inversion, prompts and glyphs that follow the last
// device (PlayStation by default, Xbox in Settings), touch-only detection, and the controllers every character is driven by.
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'],
  interact: ['KeyE', 'Pad0'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], blend: ['KeyF', 'Pad2'], partner: ['KeyQ', 'Pad3'],
  notebook: ['Tab', 'KeyN'], map: ['KeyM'],
  watch: ['Mouse2', 'Pad6'], photo: ['Mouse0', 'Pad7'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  rotL: ['BracketLeft', 'Pad4'], rotR: ['BracketRight', 'Pad5'], camReset: ['KeyR', 'Pad11'],
  tabPrev: ['KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], uiAlt: ['Digit2', 'KeyT', 'Pad2'], uiInfo: ['Digit3', 'KeyI', 'Pad3'], uiFast: ['ShiftLeft', 'Pad7'],
  boxTop: ['Digit1', 'Pad3'], boxLeft: ['Digit2', 'Pad2'], boxRight: ['Digit3', 'Pad1'], boxBottom: ['Digit4', 'Pad0'], create: ['Pad8']
};
const CONTROL_NAMES = { interact: 'Interact / vault / tackle', crouch: 'Crouch (toggle)', blend: 'Act natural (hold)', partner: 'Partner / crew orders',
  notebook: 'Notebook', map: 'Map', watch: 'Watch (aim camera)', photo: 'Take photo', sprint: 'Run', rotL: 'Turn view left', rotR: 'Turn view right',
  camReset: 'Reset camera', tabPrev: false, tabNext: false, uiAlt: false, uiInfo: false, uiFast: false, boxTop: false, boxLeft: false, boxRight: false, boxBottom: false, create: false };

const GAME_SETTINGS = [
  { key: 'padSymbols', group: 'Game', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation  ✕ ○ □ △'], ['xbox', 'Xbox  A B X Y']],
    help: 'Which controller symbols the prompts show', apply: (g, v) => { for (const p of g.players || [g.input]) p.glyphs = v; Prompt.changed = true; } },
  { key: 'stickInvX', group: 'Game', label: 'Invert stick left/right', type: 'toggle', value: false, help: 'Flips the sticks for controllers that report them backwards' },
  { key: 'stickInvY', group: 'Game', label: 'Invert stick up/down', type: 'toggle', value: false, help: 'Flips the sticks for controllers that report them backwards' },
  { key: 'difficulty', group: 'Game', label: 'Case difficulty', type: 'select', value: 'detective', options: [['detective', 'Detective'], ['rookie', 'Rookie'], ['murder', 'Murder Police']],
    help: 'How fast the corner makes you, how long the minimization window is, how impatient the Major gets' },
  { key: 'runMode', group: 'Game', label: 'Run', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
  { key: 'watchMode', group: 'Game', label: 'Watch', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
  { key: 'textSpeed', group: 'Game', label: 'Text speed', type: 'select', value: 'normal', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast'], ['instant', 'Instant']] },
  { key: 'voices', group: 'Game', label: 'Voice volume', type: 'slider', value: .8, min: 0, max: 1, step: .1 },
  { key: 'language', group: 'Game', label: 'Strong language', type: 'select', value: 'uncensored', options: [['uncensored', 'Uncensored'], ['bleeped', 'Bleeped']] },
  { key: 'hints', group: 'Game', label: 'Investigation hints', type: 'toggle', value: true, help: 'Szabo and Hal nudge you; Rookie also marks key wire lines' },
  { key: 'cones', group: 'Game', label: 'Show sight cones', type: 'toggle', value: true, help: 'Lookouts near you show where they look' }
];
const TEXT_CPS = { normal: 45, slow: 28, fast: 80, instant: 999 };

/** the ~10% of pads that report their sticks backwards: one wrapper flips both sticks for every reader (play, menus, E.Shell) */
function installGamepadInversion(game) {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  const real = navigator.getGamepads.bind(navigator);
  const wrap = p => {
    if (!p) return p; const ix = game.settings.stickInvX, iy = game.settings.stickInvY; if (!ix && !iy) return p;
    const a = Array.from(p.axes); if (ix) { a[0] = -a[0]; if (a.length > 2) a[2] = -a[2]; } if (iy) { a[1] = -a[1]; if (a.length > 3) a[3] = -a[3]; }
    return { id: p.id, index: p.index, connected: p.connected, mapping: p.mapping, timestamp: p.timestamp, buttons: p.buttons, axes: a, vibrationActuator: p.vibrationActuator, hapticActuators: p.hapticActuators };
  };
  try { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => Array.from(real() || []).map(wrap) }); } catch (e) { game.fail('gamepad inversion', e); }
}

/* ---- prompts: which device the player is on (keyboard and mouse count as one), with hysteresis for a nudged mouse ---- */
const Prompt = {
  dev: 'kbm', style: 'playstation', changed: true, mouseMoved: 0, lastXY: null,
  init() {
    if (!HAS_DOM) return;
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const p = [e.clientX, e.clientY];
      if (this.lastXY) this.mouseMoved += Math.hypot(p[0] - this.lastXY[0], p[1] - this.lastXY[1]); this.lastXY = p; }, { passive: true });
    // chorded buttons (left click while the right is held to watch): pointer events send no second pointerdown, mouse events do
    let chord = false;
    addEventListener('mousedown', e => { if (e.button === 0 && (e.buttons & 2) && !e.target.closest('#ui .screen')) { chord = true; game.input.press('Mouse0'); } }, true);
    addEventListener('mouseup', e => { if (e.button === 0 && chord) { chord = false; game.input.release('Mouse0'); } }, true);
  },
  tick() {
    const I = game.input, ld = I.lastDevice;
    let d = this.dev;
    if (ld === 'gamepad') { d = 'pad'; this.mouseMoved = 0; }
    else if (ld === 'keyboard') d = 'kbm';
    else if (ld === 'mouse') { if (this.dev !== 'pad' || this.mouseMoved > 6) d = 'kbm'; }
    else if (ld === 'touch') d = 'kbm';
    const st = I.padStyle ? I.padStyle() : 'playstation', s = st === 'xbox' ? 'xbox' : 'playstation';
    if (d !== this.dev || s !== this.style) { this.dev = d; this.style = s; this.changed = true; }
    if (this.changed) { this.changed = false; BUS.emit('device', d); }
  },
  /** the label a prompt shows for an action on the device in use: '✕', 'A', 'E', 'Left click' */
  label(a, inp = game.input) {
    if (this.dev === 'pad') return inp.label(a, 'gamepad');
    const codes = (inp.map[a] || []).filter(c => !c.startsWith('Pad') && !c.startsWith('Act:'));
    if (codes.length && codes[0].startsWith('Mouse')) return inp.label(a, 'mouse');
    return inp.label(a, 'keyboard');
  }
};
const PS = { '✕': ['#7aa7ff', 'cross'], '○': ['#ff6b6b', 'circle'], '□': ['#f08fd8', 'square'], '△': ['#45d6a0', 'triangle'] };
const XB = { A: '#5dc24a', B: '#e8483c', X: '#3d8ef0', Y: '#f2c230' };
/** a prompt glyph as HTML (the same colours on canvas): <span class="g ...">, <kbd>, or a mouse */
function glyphHTML(a) {
  const l = Prompt.label(a);
  if (Prompt.dev === 'pad') {
    if (PS[l]) return `<span class="g g-ps" style="--gc:${PS[l][0]}">${l}</span>`;
    if (XB[l] && Prompt.style === 'xbox') return `<span class="g g-xb" style="--gc:${XB[l]}">${l}</span>`;
    return `<span class="g g-pill">${esc(l)}</span>`;
  }
  if (/click/i.test(l)) return `<span class="g g-mouse ${/right/i.test(l) ? 'r' : 'l'}" title="${esc(l)}"></span>`;
  if (/wheel/i.test(l)) return `<span class="g g-mouse w" title="${esc(l)}"></span>`;
  return `<kbd>${esc(l)}</kbd>`;
}
/** draw a glyph on the canvas at (x, y) (top left); returns its width */
const Glyph = {
  draw(g, a, x, y, inp) {
    const l = Prompt.label(a, inp || game.input);
    if (Prompt.dev === 'pad' && (PS[l] || (XB[l] && Prompt.style === 'xbox'))) {
      const c = PS[l] ? PS[l][0] : XB[l], cx = x + 5, cy = y + 4;
      px.disc(g, cx, cy, 5, '#101018'); px.disc(g, cx, cy, 4, c);
      if (PS[l]) {
        const k = PS[l][1], w = '#ffffff';
        if (k === 'cross') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, w); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, w); }
        else if (k === 'circle') { px.disc(g, cx, cy, 2, w); px.disc(g, cx, cy, 1, c); }
        else if (k === 'square') { px.rect(g, cx - 2, cy - 2, 5, 5, w); px.rect(g, cx - 1, cy - 1, 3, 3, c); }
        else { px.line(g, cx, cy - 2, cx - 2, cy + 2, w); px.line(g, cx, cy - 2, cx + 2, cy + 2, w); px.line(g, cx - 2, cy + 2, cx + 2, cy + 2, w); }
      } else E.font.text(g, l, cx - 2, cy - 3, '#ffffff', { outline: false });
      return 11;
    }
    if (/click/i.test(l)) {   // a small mouse with the pressed button lit
      px.rect(g, x, y, 7, 10, '#e8e4dc'); px.rect(g, x + 1, y + 1, 5, 8, '#c8c4bc');
      px.rect(g, /right/i.test(l) ? x + 4 : x + 1, y + 1, 2, 4, '#ffb347'); px.line(g, x + 3, y + 1, x + 3, y + 4, '#5a5650');
      return 9;
    }
    const w = E.font.width(l) + 6;
    px.rect(g, x, y - 1, w, 11, '#e8e4dc'); px.rect(g, x + 1, y, w - 2, 8, '#f8f6f0'); px.rect(g, x + 1, y + 8, w - 2, 1, '#9a968e');
    E.font.text(g, l, x + 3, y + 1, '#1a1814', { outline: false });
    return w + 1;
  },
  /** glyph then a word: "✕ Talk" */
  prompt(g, a, word, x, y, col = '#ffffff', inp) { const w = this.draw(g, a, x, y, inp); E.font.text(g, word, x + w + 3, y + 1, col, { shadow: '#000', outline: false }); return w + 3 + E.font.width(word); }
};

/* ---- touch-only devices: no touch controls; "Controller or keyboard required" ---- */
const Touch = {
  only: false, sawKey: false, sawPad: false,
  check() {
    if (!HAS_DOM || !window.matchMedia) return (this.only = false);
    const coarse = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && ((navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window || matchMedia('(hover: none)').matches);
    let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(p => p && p.connected); } catch (e) {}
    const was = this.only; this.only = coarse && !pad && !this.sawKey && !this.sawPad;
    if (was !== this.only) BUS.emit('touchOnly', this.only);
    return this.only;
  },
  init() {
    if (!HAS_DOM) return;
    addEventListener('keydown', () => { if (!this.sawKey) { this.sawKey = true; this.check(); } });
    addEventListener('gamepadconnected', () => { this.sawPad = true; this.check(); });
    this.check();
  }
};

/* ---- controllers: gameplay never reads game.input directly ---- */
class HumanCtl {
  constructor(inp) { this.inp = inp; this.human = true; this._run = false; this._watch = false; }
  /** the ground direction the player pushes (length up to 1) */
  ground() { const m = this.inp.move(), l = Math.min(1, Math.hypot(m[0], m[1])); if (l < .05) return [0, 0]; const d = game.view.screenDirToGround(m[0], m[1]); return [d[0] * l, d[1] * l]; }
  screenMove() { return this.inp.move(); }
  down(a) { return this.inp.down(a); }
  pressed(a) { return this.inp.pressed(a); }
  released(a) { return this.inp.released(a); }
  /** run and watch: hold or toggle (Settings) */
  running() { if (game.settings.runMode === 'toggle') { if (this.inp.pressed('sprint')) this._run = !this._run; return this._run; } return this.inp.down('sprint') || (this.inp.lastDevice === 'gamepad' && this._padRun()); }
  _padRun() { if (this.inp.pressed('sprint')) this._run = !this._run; if (Math.hypot(...this.inp.move()) < .2) this._run = false; return this._run; }   // L3 toggles run on a pad
  watching() { if (game.settings.watchMode === 'toggle') { if (this.inp.pressed('watch')) this._watch = !this._watch; return this._watch; } return this.inp.down('watch'); }
  aimStick() { const a = this.inp.padAxes || []; const x = a[2] || 0, y = a[3] || 0; return Math.hypot(x, y) > .2 ? [x, y] : [0, 0]; }
  pointer() { return this.inp.lastDevice === 'mouse' || Prompt.dev === 'kbm' ? this.inp.pointer() : null; }
}
class BotCtl {
  constructor() { this.mv = [0, 0]; this.held = {}; this.taps = {}; this.human = false; this.run = false; this.watch = false; this.aim = null; }
  ground() { return this.mv; }
  screenMove() { return [0, 0]; }
  down(a) { return !!this.held[a]; }
  pressed(a) { return !!this.taps[a]; }
  released() { return false; }
  running() { return this.run; }
  watching() { return this.watch; }
  aimStick() { return [0, 0]; }
  pointer() { return null; }
  tap(a) { this.taps[a] = 1; }
  tick() { for (const k in this.taps) if (--this.taps[k] <= 0) delete this.taps[k]; }
}
