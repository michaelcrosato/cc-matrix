/* 02-input: the WIRETAP input preset, controllers (gameplay never reads game.input directly), and prompts/glyphs that
   follow the device used last (PlayStation glyphs by default, Xbox in Settings, keys and mouse buttons otherwise). */
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'],
  interact: ['KeyE', 'Pad0'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], blend: ['KeyF', 'Pad2'], partner: ['KeyQ', 'Pad3'],
  notebook: ['Tab', 'KeyN', 'Pad8'], map: ['KeyM'],
  watch: ['Mouse2', 'Pad6'], photo: ['Mouse0', 'Pad7'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  rotL: ['BracketLeft', 'Pad4'], rotR: ['BracketRight', 'Pad5'], camReset: ['KeyR', 'Pad11'],
  tabPrev: ['KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], uiAlt: ['Digit2', 'KeyT', 'Pad2'], uiInfo: ['Digit3', 'KeyI', 'Pad3'], uiFast: ['ShiftLeft', 'Pad7'],
  boxTop: ['Digit1', 'Pad3'], boxLeft: ['Digit2', 'Pad2'], boxRight: ['Digit3', 'Pad1'], boxBottom: ['Digit4', 'Pad0']
};
const CONTROL_NAMES = { interact: 'Interact / vault / tackle', crouch: 'Crouch (toggle)', blend: 'Act natural (hold)', partner: 'Partner / crew orders',
  notebook: 'Notebook', map: 'Map', watch: 'Watch (aim camera)', photo: 'Take photo', sprint: 'Run', rotL: 'Turn view left', rotR: 'Turn view right',
  camReset: 'Reset camera', tabPrev: false, tabNext: false, uiAlt: false, uiInfo: false, uiFast: false, boxTop: false, boxLeft: false, boxRight: false, boxBottom: false };

/* ---- prompts: the device the player used last, with a 6-pixel mouse hysteresis so a nudged mouse keeps pad prompts ---- */
const Prompts = {
  dev: 'keyboard', style: 'playstation', dirty: true, _sig: '', _padMouse: null,
  watch(I) {
    let d = I.lastDevice;
    if (d === 'gamepad') this._padMouse = I.mouse ? [I.mouse.cx, I.mouse.cy] : null;
    if (d === 'mouse' && this.dev === 'gamepad' && this._padMouse && I.mouse && Math.hypot(I.mouse.cx - this._padMouse[0], I.mouse.cy - this._padMouse[1]) < 6) d = 'gamepad';
    if (d === 'touch') d = this.dev === 'touch' ? 'touch' : 'touch';
    this.dev = d; this.style = (game.settings.glyphs === 'xbox') ? 'xbox' : 'playstation';
    const sig = d + this.style;
    if (sig !== this._sig) { this._sig = sig; this.dirty = true; }
  },
  pad() { return this.dev === 'gamepad'; },
  label(a, I = game.input) { const dv = this.dev === 'touch' ? 'keyboard' : this.dev; return I.label(a, dv === 'mouse' ? 'mouse' : dv) || a; },
  /** the html chip for one action (or a literal label) on the current device */
  html(a, I) { return Glyph.html(I === undefined && !KEYS[a] && !['confirm', 'cancel', 'start', 'pause'].includes(a) ? a : this.label(a, I)); },
  stick() { return this.pad() ? Glyph.html('L-stick') : Glyph.html('WASD'); }
};

/* ---- glyphs: the same colors on the canvas and in the DOM ---- */
const GLYPH = { '✕': ['cross', '#7aa7ff'], '○': ['circle', '#ff6b6b'], '□': ['square', '#f08fd8'], '△': ['tri', '#45d6a0'],
  A: ['xa', '#5dc24a'], B: ['xb', '#e8483c'], X: ['xx', '#3d8ef0'], Y: ['xy', '#f2c230'] };
const PILLS = ['L1', 'R1', 'L2', 'R2', 'L3', 'R3', 'Create', 'Options', 'LB', 'RB', 'LT', 'RT', 'LS', 'RS', 'View', 'Menu', 'L-stick', 'R-stick', 'D-pad'];
const Glyph = {
  kind(l) {
    if (Prompts.dev === 'gamepad' && GLYPH[l]) return 'face';
    if (PILLS.includes(l)) return 'pill';
    if (l === 'Left click' || l === 'Right click' || l === 'Middle click') return 'mouse';
    return 'key';
  },
  html(l) {
    const k = this.kind(l);
    if (k === 'face') return `<span class="g g-face g-${GLYPH[l][0]}" aria-label="${esc(l)}">${l === '✕' ? '✕' : l === '○' ? '○' : l === '□' ? '□' : l === '△' ? '△' : esc(l)}</span>`;
    if (k === 'pill') return `<span class="g g-pill">${esc(l)}</span>`;
    if (k === 'mouse') return `<span class="g g-mouse g-m${l[0] === 'L' ? 'l' : l[0] === 'R' ? 'r' : 'm'}" aria-label="${esc(l)}"><i></i></span>`;
    return `<kbd>${esc(l === ' ' ? 'Space' : l)}</kbd>`;
  },
  /** canvas: draw the glyph for a label with its top-left at x, y (game pixels); returns its width */
  draw(g, l, x, y) {
    const k = this.kind(l); x = Math.round(x); y = Math.round(y);
    if (k === 'face') {
      const c = GLYPH[l][1];
      px.disc(g, x + 5, y + 5, 5, '#101014'); px.disc(g, x + 5, y + 5, 4, '#26262e');
      if (l === '✕') { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
      else if (l === '○') { px.disc(g, x + 5, y + 5, 3, c); px.disc(g, x + 5, y + 5, 2, '#26262e'); }
      else if (l === '□') { px.rect(g, x + 3, y + 3, 5, 5, c); px.rect(g, x + 4, y + 4, 3, 3, '#26262e'); }
      else if (l === '△') { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.line(g, x + 2, y + 7, x + 8, y + 7, c); }
      else E.font.text(g, l, x + 5, y + 2, c, { align: 'center' });
      return 11;
    }
    if (k === 'mouse') {
      px.rect(g, x + 1, y, 7, 11, '#101014'); px.rect(g, x + 2, y + 1, 5, 9, '#d8d4cc');
      const lft = l[0] === 'L'; px.rect(g, x + (lft ? 2 : 5), y + 1, 2, 4, '#ffb347'); px.line(g, x + 4, y + 1, x + 4, y + 4, '#101014');
      return 10;
    }
    const w = E.font.width(l) + 6;
    px.rect(g, x, y, w, 11, '#101014'); px.rect(g, x + 1, y + 1, w - 2, 8, k === 'pill' ? '#3a3a46' : '#e8e2d4');
    E.font.text(g, l, x + 3, y + 2, k === 'pill' ? '#f2ead8' : '#1a1610');
    return w;
  },
  /** canvas: a prompt "[glyph] Label" for an action; returns the width drawn */
  prompt(g, a, label, x, y, color = '#f2ead8', align = 'left') {
    const l = KEYS[a] ? Prompts.label(a) : a, gw = this.measure(l), tw = E.font.width(label) + 3, w = gw + tw;
    let x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    this.draw(g, l, x0, y); E.font.text(g, label, Math.round(x0 + gw + 3), Math.round(y + 2), color, { shadow: '#000', outline: false });
    return w;
  },
  measure(l) { const k = this.kind(l); return k === 'face' ? 11 : k === 'mouse' ? 10 : E.font.width(l) + 6; }
};

/* ---- controllers: HumanCtl reads a player's input; BotCtl is driven by code (attract, bots, tests) ---- */
class HumanCtl {
  constructor(input) { this.i = input; this.runOn = false; this.watchOn = false; this.human = true; }
  get live() { return !Globals.blocked(); }
  move() { return this.live ? this.i.move() : [0, 0]; }
  down(a) { return this.live && this.i.down(a); }
  pressed(a) { return this.live && this.i.pressed(a); }
  released(a) { return this.i.released(a); }
  running() {
    if (!this.live) return false;
    if (game.settings.runMode === 'toggle' || this.i.lastDevice === 'gamepad') { if (this.i.pressed('sprint')) this.runOn = !this.runOn; if (Math.hypot(...this.i.move()) < .1) this.runOn = false; return this.runOn; }
    return this.i.down('sprint');
  }
  watching() {
    if (!this.live) return false;
    if (game.settings.watchMode === 'toggle') { if (this.i.pressed('watch')) this.watchOn = !this.watchOn; return this.watchOn; }
    return this.i.down('watch');
  }
  /** the right stick, or null */
  aimStick() { return this.i.padAim; }
  pointer() { return this.i.lastDevice === 'mouse' || this.i.lastDevice === 'keyboard' ? this.i.pointer() : null; }
  tick() {}
}
class BotCtl {
  constructor() { this.mv = [0, 0]; this.held = new Set(); this.taps = new Set(); this.was = new Set(); this.run = false; this.watch = false; this.aim = null; this.human = false; }
  move() { return this.mv; }
  down(a) { return this.held.has(a) || this.taps.has(a); }
  pressed(a) { return this.taps.has(a); }
  released(a) { return this.was.has(a) && !this.held.has(a); }
  running() { return this.run; }
  watching() { return this.watch; }
  aimStick() { return null; }
  pointer() { return null; }
  tap(a) { this.taps.add(a); }
  tick() { this.was = new Set([...this.held, ...this.taps]); this.taps.clear(); }
}
/** a remote player's controller: the host applies what the network says */
class RemoteCtl extends BotCtl { constructor(id) { super(); this.id = id; } }
