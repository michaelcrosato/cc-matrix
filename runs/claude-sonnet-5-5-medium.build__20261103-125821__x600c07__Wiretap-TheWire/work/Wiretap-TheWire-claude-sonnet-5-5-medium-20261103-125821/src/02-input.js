// 02-input: the WIRETAP key preset, controllers (human / bot), glyph helpers for canvas + DOM, device watcher
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
const CONTROL_NAMES = { interact: 'Interact / vault / tackle', blend: 'Act natural (hold)', partner: 'Call out / crew orders', watch: 'Watch (aim camera)', photo: 'Take photo', crouch: 'Crouch', sprint: 'Run', notebook: 'Notebook', map: 'Map', rotL: 'Rotate view left', rotR: 'Rotate view right', camReset: 'Reset camera',
  tabPrev: false, tabNext: false, uiAlt: false, uiInfo: false, uiFast: false, boxTop: false, boxLeft: false, boxRight: false, boxBottom: false, confirm: 'Confirm', cancel: 'Back' };

// right stick, read from the (already inversion-wrapped) gamepad list
function padAxes() {
  try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps) if (p && p.connected) return { l: [p.axes[0] || 0, p.axes[1] || 0], r: [p.axes[2] || 0, p.axes[3] || 0] }; } catch (e) { /* no pads */ }
  return { l: [0, 0], r: [0, 0] };
}
const dz = (v, d = .2) => Math.abs(v) < d ? 0 : v;

// Controllers: gameplay never reads game.input directly outside HumanController
class HumanController {
  constructor(input) { this.input = input; }
  move() { return this.input.move(); }
  down(a) { return this.input.down(a); }
  pressed(a) { return this.input.pressed(a); }
  released(a) { return this.input.released(a); }
}
// raw-key controller for local two-player (each human owns a set of keys on the shared keyboard)
class KeyController {
  constructor(map, pad) { this.map = map; this.pad = pad == null ? -1 : pad; this.pheld = {}; this.ptap = {}; this.pmove = [0, 0]; this.held = new Set(); this.tapped = new Set(); this.kb = true;
    this.kd = e => { if (e.repeat) return; this.held.add(e.code); this.tapped.add(e.code); }; this.ku = e => { this.held.delete(e.code); };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku); }
  dispose() { window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); }
  // gamepad poll (standard mapping): left stick/d-pad move, face buttons act; call once per step
  poll() { if (this.pad < 0) return; let gp = null; try { const l = navigator.getGamepads ? navigator.getGamepads() : []; gp = l[this.pad]; } catch (e) { gp = null; } if (!gp || !gp.connected) { this.pmove = [0, 0]; return; }
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = dz(gp.axes[0] || 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), ay = dz(gp.axes[1] || 0) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0), m = Math.max(1, Math.hypot(ax, ay)); this.pmove = [ax / m, ay / m];
    const PM = { interact: 0, crouch: 1, blend: 2, partner: 3, watch: 6, photo: 7, sprint: 10 }; for (const a in PM) { const now = b(PM[a]); if (now && !this.pheld[a]) this.ptap[a] = true; this.pheld[a] = now; } }
  has(a, set) { return (this.map[a] || []).some(c => set.has(c)); }
  move() { if (this.pmove[0] || this.pmove[1]) return this.pmove; const x = (this.has('right', this.held) ? 1 : 0) - (this.has('left', this.held) ? 1 : 0), y = (this.has('down', this.held) ? 1 : 0) - (this.has('up', this.held) ? 1 : 0), m = Math.hypot(x, y) || 1; return [x / m, y / m]; }
  down(a) { return this.has(a, this.held) || !!this.pheld[a]; }
  pressed(a) { if (this.ptap[a]) { this.ptap[a] = false; return true; } const hit = (this.map[a] || []).filter(c => this.tapped.has(c)); hit.forEach(c => this.tapped.delete(c)); return hit.length > 0; }
  released() { return false; }
}
const P1_KEYS = { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], watch: ['KeyQ'], photo: ['KeyE'], blend: ['KeyF'], sprint: ['ShiftLeft'], crouch: ['KeyC'] };
const P2_KEYS = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], interact: ['Period', 'Enter'], partner: ['Slash'], sprint: ['ShiftRight'] };
class BotController {
  constructor() { this.mv = [0, 0]; this.held = {}; this.taps = {}; }
  move() { return this.mv; }
  down(a) { return !!this.held[a]; }
  pressed(a) { const t = this.taps[a]; this.taps[a] = 0; return !!t; }
  released() { return false; }
  tap(a) { this.taps[a] = 1; }
}

// Glyphs: label text -> css class for DOM, 9x9 pixel discs for canvas
const PS_COL = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#f08fd8', '△': '#45d6a0' };
const XB_COL = { A: '#5dc24a', B: '#e8483c', X: '#3d8ef0', Y: '#f2c230' };
const PS_CLS = { '✕': 'cross', '○': 'circle', '□': 'square', '△': 'triangle' };
function glyphHTML(label) {
  const l = String(label);
  if (PS_COL[l]) return `<span class="g g-ps g-ps-${PS_CLS[l]}" style="--c:${PS_COL[l]}">${l}</span>`;
  if (XB_COL[l]) return `<span class="g g-xb" style="--c:${XB_COL[l]}">${l}</span>`;
  if (/^(L[123]|R[123]|LB|RB|LT|RT|LS|RS|Create|Options|View|Menu|D-pad.*)$/.test(l)) return `<span class="g g-pill">${esc(l)}</span>`;
  if (/click/i.test(l)) return `<span class="g g-mouse ${/right/i.test(l) ? 'r' : 'l'}" title="${esc(l)}"></span>`;
  return `<kbd>${esc(l)}</kbd>`;
}
const lbl = a => { try { return game.input.label(a); } catch (e) { return a; } };
const glyph = a => glyphHTML(lbl(a));
function glyphCanvas(g, label, x, y) {
  const l = String(label), col = PS_COL[l] || XB_COL[l];
  if (col) { px.disc(g, x + 4, y + 4, 4, '#101418'); px.disc(g, x + 4, y + 4, 3, col); E.font.text(g, l.length === 1 && XB_COL[l] ? l : (PS_CLS[l] ? { cross: 'x', circle: 'o', square: '#', triangle: '^' }[PS_CLS[l]] : l), x + 2, y + 1, '#101418'); return 10; }
  const w = E.font.width(l) + 4; px.rect(g, x, y, w, 9, '#2a2e34'); px.rect(g, x, y, w, 8, '#c8ccd4'); E.font.text(g, l, x + 2, y + 1, '#16181c'); return w + 1;
}
// device watcher: re-render DOM legends/prompts when the device or glyph style changes (6 px hysteresis for mouse nudges)
const Devices = { sig: '', touchOnly: false, sawKey: false, padSeen: false,
  signature() { const i = game.input; return (i.lastDevice || '') + ':' + (i.padStyle ? i.padStyle() : '') + ':' + (game.settings.padSymbols || ''); },
  tick() { const s = this.signature(); if (s !== this.sig) { this.sig = s; bus.emit('device', s); } },
  detectTouchOnly() {
    try { const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
      const coarse = mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && (navigator.maxTouchPoints || 0) > 0;
      this.touchOnly = coarse && !this.padSeen && !this.sawKey; } catch (e) { this.touchOnly = false; }
    return this.touchOnly; }
};
