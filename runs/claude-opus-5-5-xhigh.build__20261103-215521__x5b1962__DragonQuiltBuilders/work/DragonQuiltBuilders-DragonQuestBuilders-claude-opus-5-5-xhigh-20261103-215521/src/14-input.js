// Input: the action presets (controller first; keyboard and mouse native), the intent each step (the only thing the
// Builder reads: the player, the attract AI, tests and Bee bots drive the same code), the right stick's flicks, the
// wheel, cursor modes, and the glyph icons every prompt is drawn with (PlayStation by default, Xbox in Settings, keys
// and mouse buttons for keyboard and mouse, following the device used last).
(() => {
const DQ = globalThis.DQ, E = DQ.E, px = E.px;
const MOVES = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
const MENUK = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const UI = { ok: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], back: ['Escape', 'Backspace', 'Pad1'], alt: ['KeyX', 'Pad2'], alt2: ['KeyT', 'KeyY', 'Pad3'], tabPrev: ['KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], pgUp: ['PageUp', 'Pad6'], pgDn: ['PageDown', 'Pad7'] };
const PLAY = Object.assign({}, MOVES, {
  jump: ['Space', 'Pad0'], swing: ['Mouse0', 'KeyJ', 'Pad2'], place: ['Mouse2', 'KeyK', 'Pad3'], interact: ['KeyF', 'Pad1'],
  sprint: ['ShiftLeft', 'Pad7'], eye: ['KeyC', 'Pad6'], hotPrev: ['BracketLeft', 'Pad4'], hotNext: ['BracketRight', 'Pad5'],
  camLeft: ['KeyQ'], camRight: ['KeyE'], zoomIn: ['Equal'], zoomOut: ['Minus'], camReset: ['KeyR', 'Pad11'],
  satchel: ['Tab', 'KeyI', 'Pad8'], map: ['KeyM', 'Pad17'], journal: ['KeyN']
}, MENUK, UI);
for (let i = 1; i <= 8; i++) PLAY['hot' + i] = ['Digit' + i];
const MENU = Object.assign({}, MOVES, MENUK, UI);
const NAMES = { jump: 'Jump', swing: 'Swing / break (hold: Spin Stitch)', place: 'Place / use item', interact: 'Talk / interact', sprint: 'Sprint', eye: 'Builder\'s Eye',
  hotPrev: 'Previous item', hotNext: 'Next item', camLeft: 'Turn camera left', camRight: 'Turn camera right', zoomIn: 'Zoom in', zoomOut: 'Zoom out', camReset: 'Reset camera',
  satchel: 'Satchel (Bag)', map: 'Map', journal: 'Journal', ok: false, back: false, alt: false, alt2: false, tabPrev: false, tabNext: false, pgUp: false, pgDn: false };
for (let i = 1; i <= 8; i++) NAMES['hot' + i] = false;

const Controls = DQ.Controls = { PLAY, MENU, NAMES, mouseT: -99, _lp: null, _flickArm: true, _flickT: 0, _zoomT: 0, wheel: 0, _wheelAcc: 0 };
/** the mouse wheel in whole notches (for the hotbar); installed once on the canvas */
Controls.install = game => {
  const c = game.screen && game.screen.canvas; if (!c || Controls._wheelOn) return; Controls._wheelOn = true;
  c.addEventListener('wheel', e => { if (Controls.wheelLock) return; e.preventDefault(); const d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 100 : 1); Controls._wheelAcc += d; game.input.lastDevice = 'mouse'; Controls.mouseT = game.real; }, { passive: false });
};
/** read once a step: whole wheel notches since the last read (+ = down) */
Controls.wheelSteps = () => { const a = Controls._wheelAcc; if (Math.abs(a) < 40) return 0; Controls._wheelAcc = 0; return Math.sign(a) * Math.max(1, Math.round(Math.abs(a) / 100)); };
/** the mouse is the cursor: it moved or clicked in the last 2 s */
Controls.mouseActive = game => { const I = game.input, p = I.pointer ? I.pointer() : null; if (p && (!Controls._lp || p[0] !== Controls._lp[0] || p[1] !== Controls._lp[1])) { if (Controls._lp) Controls.mouseT = game.real; Controls._lp = p.slice(); } if (I.pressed('swing') && I.lastDevice === 'mouse') Controls.mouseT = game.real; return I.lastDevice === 'mouse' && game.real - Controls.mouseT < 2 && !!p; };
/** the right stick: a flick turns the camera 90 degrees (once per push past .6, rearmed .25 s after it centres); held up / down zooms */
Controls.stick = (game, dt) => {
  const a = game.input.padAim, out = { turn: 0, zoom: 0 };
  Controls._flickT = Math.max(0, Controls._flickT - dt); Controls._zoomT = Math.max(0, Controls._zoomT - dt);
  if (!a) { if (Controls._flickT <= 0) Controls._flickArm = true; return out; }
  if (Math.abs(a[0]) > .6 && Math.abs(a[0]) > Math.abs(a[1]) && Controls._flickArm) { out.turn = a[0] > 0 ? 1 : -1; Controls._flickArm = false; Controls._flickT = .25; }
  if (Math.abs(a[0]) < .3 && Controls._flickT <= 0) Controls._flickArm = true;
  if (Math.abs(a[1]) > .6 && Math.abs(a[1]) > Math.abs(a[0]) && Controls._zoomT <= 0) { out.zoom = a[1] < 0 ? 1 : -1; Controls._zoomT = .35; }
  return out;
};
/** the intent for this step, from the player's devices */
Controls.intent = (game, ctx, dt) => {
  const I = game.input, m = I.move(), d = game.view.screenDirToGround(m[0], m[1]), st = Controls.stick(game, dt), wh = Controls.wheelSteps();
  let hotStep = 0, hotSlot = null; if (I.pressed('hotPrev') || wh < 0) hotStep = -1; if (I.pressed('hotNext') || wh > 0) hotStep = 1; for (let i = 1; i <= 8; i++) if (I.pressed('hot' + i)) hotSlot = i - 1;
  const sprintToggle = game.settings.sprintMode === 'toggle';
  if (sprintToggle && I.pressed('sprint')) Controls._sprintOn = !Controls._sprintOn;
  if (sprintToggle && Math.hypot(d[0], d[1]) < .1) Controls._sprintOn = false;
  const intent = {
    move: d, jump: I.pressed('jump'), jumpHeld: I.down('jump'), sprint: sprintToggle ? !!Controls._sprintOn : I.down('sprint'),
    swing: I.pressed('swing'), swingHeld: I.down('swing'), swingReleased: I.released('swing'), place: I.pressed('place'), interact: I.pressed('interact'),
    hotStep, hotSlot, eye: I.down('eye'), cursor: null, mouse: false,
    camTurn: (I.pressed('camLeft') ? -1 : 0) + (I.pressed('camRight') ? 1 : 0) + st.turn, zoom: (I.pressed('zoomIn') ? 1 : 0) - (I.pressed('zoomOut') ? 1 : 0) + st.zoom,
    camReset: I.pressed('camReset'), eyeUp: I.pressed('jump'), eyeDown: I.pressed('sprint'), raw: m
  };
  if (Controls.mouseActive(game)) intent.mouse = true;
  return intent;
};
Controls.blank = () => ({ move: [0, 0], jump: false, jumpHeld: false, sprint: false, swing: false, swingHeld: false, swingReleased: false, place: false, interact: false, hotStep: 0, hotSlot: null, eye: false, cursor: null, mouse: false, camTurn: 0, zoom: 0, camReset: false, eyeUp: false, eyeDown: false, raw: [0, 0] });

// ---------------- glyphs ----------------
const PS = { 0: ['✕', '#7aa7ff'], 1: ['○', '#ff6a6a'], 2: ['□', '#ff8ad8'], 3: ['△', '#55dca8'] };
const XB = { 0: ['A', '#5ad06a'], 1: ['B', '#ff6a6a'], 2: ['X', '#5a9aff'], 3: ['Y', '#f0d040'] };
const SHOULDER = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['CREATE', 'VIEW'], 9: ['OPTIONS', 'MENU'], 10: ['L3', 'LS'], 11: ['R3', 'RS'], 12: ['↑', '↑'], 13: ['↓', '↓'], 14: ['←', '←'], 15: ['→', '→'], 16: ['PS', 'GUIDE'], 17: ['PAD', 'VIEW'] };
const Glyphs = DQ.Glyphs = {};
Glyphs.family = game => { const I = game.input; if (I.lastDevice === 'gamepad') return (game.settings.glyphs === 'xbox') ? 'xbox' : 'ps'; if (I.lastDevice === 'mouse') return 'mouse'; return 'keys'; };
/** the code to show for an action on this device family */
Glyphs.code = (game, a, fam = Glyphs.family(game)) => {
  const m = game.input.map[a]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (fam === 'ps' || fam === 'xbox') return real.find(c => /^Pad\d+$/.test(c)) || real[0];
  if (fam === 'mouse') return real.find(c => c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real[0];
  return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => c.startsWith('Mouse')) || real[0];
};
const T = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c, Object.assign({ outline: false }, o || {}));
/** the width a glyph takes */
Glyphs.width = (game, a, fam) => {
  const code = typeof a === 'string' && a.startsWith('@') ? a.slice(1) : Glyphs.code(game, a, fam); if (!code) return 0;
  const f = fam || Glyphs.family(game);
  if (/^Pad\d+$/.test(code)) { const n = +code.slice(3); if (n <= 3) return 11; const lab = SHOULDER[n] ? SHOULDER[n][f === 'xbox' ? 1 : 0] : '?'; return E.font.width(lab) + 7; }
  if (code.startsWith('Mouse')) return 9;
  if (code === 'Wheel') return 9;
  return Math.max(11, E.font.width(game.input.codeLabel(code)) + 6);
};
/** draw the glyph for action a (or '@Code' for a code) at x, y (top-left; 11 px tall); returns its width */
Glyphs.draw = (g, game, a, x, y, fam) => {
  const f = fam || Glyphs.family(game), code = typeof a === 'string' && a.startsWith('@') ? a.slice(1) : Glyphs.code(game, a, f); if (!code) return 0;
  x = Math.round(x); y = Math.round(y);
  if (/^Pad\d+$/.test(code)) {
    const n = +code.slice(3);
    if (n <= 3) {
      px.disc(g, x + 5, y + 5, 5.4, '#151225'); px.disc(g, x + 5, y + 5, 4.6, '#2a2648');
      if (f === 'xbox') { const [l, c] = XB[n]; T(g, l, x + 5 - Math.floor(E.font.width(l) / 2), y + 2, c); }
      else { const c = PS[n][1];
        if (n === 0) { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
        else if (n === 1) { for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2; px.dot(g, Math.round(x + 5 + Math.cos(t) * 2.6), Math.round(y + 5 + Math.sin(t) * 2.6), c); } }
        else if (n === 2) { px.rect(g, x + 3, y + 3, 5, 1, c); px.rect(g, x + 3, y + 7, 5, 1, c); px.rect(g, x + 3, y + 3, 1, 5, c); px.rect(g, x + 7, y + 3, 1, 5, c); }
        else { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.line(g, x + 2, y + 7, x + 8, y + 7, c); } }
      return 11;
    }
    const lab = SHOULDER[n] ? SHOULDER[n][f === 'xbox' ? 1 : 0] : '?', w = E.font.width(lab) + 7;
    const round = n >= 8 && n <= 9 || n >= 16;
    px.rect(g, x + (round ? 1 : 0), y, w - (round ? 2 : 0), 11, '#151225'); px.rect(g, x + 1, y + 1, w - 2, 9, n === 10 || n === 11 ? '#2a2648' : '#3a3660');
    if (n === 10 || n === 11) { for (let k = 0; k < 14; k++) { const t = k / 14 * Math.PI * 2; } }
    T(g, lab, x + 4, y + 2, '#f4f0ff'); return w;
  }
  if (code.startsWith('Mouse')) {
    const b = +code.slice(5);
    px.rect(g, x + 1, y, 7, 11, '#151225'); px.rect(g, x + 2, y + 1, 5, 9, '#e8e4f4'); px.rect(g, x + 4, y + 1, 1, 4, '#151225');
    if (b === 0) px.rect(g, x + 2, y + 1, 2, 4, '#ffb050'); else if (b === 2) px.rect(g, x + 5, y + 1, 2, 4, '#ffb050'); else px.rect(g, x + 4, y + 2, 1, 2, '#ffb050');
    return 9;
  }
  if (code === 'Wheel') { px.rect(g, x + 1, y, 7, 11, '#151225'); px.rect(g, x + 2, y + 1, 5, 9, '#e8e4f4'); px.rect(g, x + 4, y + 1, 1, 4, '#ffb050'); return 9; }
  const lab = game.input.codeLabel(code), w = Math.max(11, E.font.width(lab) + 6);
  px.rect(g, x, y + 1, w, 10, '#151225'); px.rect(g, x + 1, y, w - 2, 10, '#d8d4e4'); px.rect(g, x + 1, y + 8, w - 2, 2, '#9a96aa');
  T(g, lab, x + Math.floor((w - E.font.width(lab)) / 2), y + 1, '#1a1830'); return w;
};
/** text with {btn:action} tokens drawn as glyphs; returns its width. o: font options + { measure } */
Glyphs.text = (g, game, s, x, y, color, o = {}) => {
  const parts = String(s).split(/(\{btn:[A-Za-z0-9@]+\})/); let cx = x;
  for (const p of parts) {
    if (!p) continue;
    const m = p.match(/^\{btn:([A-Za-z0-9@]+)\}$/);
    if (m) { const w = o.measure ? Glyphs.width(game, m[1]) : Glyphs.draw(g, game, m[1], cx, y - 2); cx += w + 2; }
    else { const t = DQ.safe(p); if (!o.measure) E.font.text(g, t, cx, y, color, Object.assign({ outline: false, shadow: '#05040a' }, o)); cx += E.font.width(t, o); }
  }
  return cx - x;
};
Glyphs.measure = (game, s, o = {}) => Glyphs.text(null, game, s, 0, 0, '#fff', Object.assign({}, o, { measure: true }));
/** the plain-text form (the hub card's how-to, tests) */
Glyphs.plain = (game, s) => String(s).replace(/\{btn:([A-Za-z0-9@]+)\}/g, (_, a) => { const c = Glyphs.code(game, a); if (!c) return '?'; if (/^Pad\d+$/.test(c)) { const n = +c.slice(3); return n <= 3 ? (Glyphs.family(game) === 'xbox' ? XB[n][0] : ['Cross', 'Circle', 'Square', 'Triangle'][n]) : SHOULDER[n] ? SHOULDER[n][Glyphs.family(game) === 'xbox' ? 1 : 0] : c; } if (c.startsWith('Mouse')) return ['Left click', 'Middle click', 'Right click'][+c.slice(5)] || c; return game.input.codeLabel(c); });
})();
