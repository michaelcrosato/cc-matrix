/* =====================================================================================================================
 * INPUT: two sticks, no buttons. The left stick (WASD) sets the posture, the right stick (IJKL, or the face buttons) the
 * technique. KC.Reader turns one E.Input into the control intent a CPU also produces: { posture, press, held } in screen
 * directions ('n' 'u' 'd' 'l' 'r'). Prompts and glyph icons follow the device used last.
 * ===================================================================================================================== */
const MENU = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const KC_KEYS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'],
  tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1'],
  prev: ['KeyQ', 'Pad4'], next: ['KeyE', 'Pad5'], alt: ['KeyT', 'Pad3'], dev: ['F2', 'Backquote'], skip: ['Enter', 'NumpadEnter', 'Pad8'], click: ['Mouse0']
}, MENU);
// two on one keyboard: player 1 keeps WASD with T F G H as its technique keys, player 2 takes the arrows with I J K L
const KC_KEYS_P1 = Object.assign({}, KC_KEYS, { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  tUp: ['KeyT', 'PadRAxisUp', 'Pad3'], tDown: ['KeyG', 'PadRAxisDown', 'Pad0'], tLeft: ['KeyF', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyH', 'PadRAxisRight', 'Pad1'],
  confirm: ['Space', 'Pad0'], cancel: ['Backspace', 'Pad1'], start: ['Enter', 'Pad9'] });
const KC_KEYS_P2 = Object.assign({}, KC_KEYS, { up: ['ArrowUp', 'Pad12'], down: ['ArrowDown', 'Pad13'], left: ['ArrowLeft', 'Pad14'], right: ['ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1'],
  confirm: ['NumpadEnter', 'Pad0'], cancel: ['Numpad0', 'Pad1'], start: ['NumpadEnter', 'Pad9'], pause: ['Pad9'] });
KC.KEYS = KC_KEYS; KC.KEYS_P1 = KC_KEYS_P1; KC.KEYS_P2 = KC_KEYS_P2;
const T_ACT = { u: 'tUp', d: 'tDown', l: 'tLeft', r: 'tRight' };
KC.T_ACT = T_ACT;

/** one player's twin-stick reader: the posture (4-way, hysteresis on the analog stick, vertical beats horizontal on keys)
 *  and the technique's press edge (the most recent press wins; truly simultaneous presses: up, down, then sideways) */
KC.Reader = class {
  constructor(input) { this.I = input; this.p = 'n'; this.blocked = false; }
  posture() {
    const I = this.I; if (!I) return 'n';
    const m = I.padMove || [0, 0], mag = Math.hypot(m[0], m[1]);
    if (mag > .35 && I.lastDevice === 'gamepad') {   // the analog stick: dominant axis, pressed past .5, held until it drops below .35
      const along = d => d === 'u' ? -m[1] : d === 'd' ? m[1] : d === 'l' ? -m[0] : d === 'r' ? m[0] : 0;
      if (this.p !== 'n' && along(this.p) >= .35) return this.p;
      if (mag > .5) return (this.p = Math.abs(m[0]) > Math.abs(m[1]) ? (m[0] < 0 ? 'l' : 'r') : (m[1] < 0 ? 'u' : 'd'));
      return (this.p = 'n');
    }
    const u = I.down('up'), d = I.down('down'), l = I.down('left'), r = I.down('right');
    return (this.p = u && !d ? 'u' : d && !u ? 'd' : l && !r ? 'l' : r && !l ? 'r' : 'n');
  }
  read() {
    const I = this.I; if (!I || this.blocked || KC.Overlay.active) return { posture: 'n', press: null, held: null };
    let press = null;
    for (const d of ['l', 'r', 'd', 'u']) if (I.pressed(T_ACT[d])) press = d;   // (the last checked wins a tie: up > down > sideways)
    let held = null; for (const d of ['l', 'r', 'd', 'u']) if (I.down(T_ACT[d])) held = d;
    return { posture: this.posture(), press, held };
  }
};

/* ---- GLYPHS: icons the 5x7 font cannot draw: PlayStation and Xbox face buttons, sticks, keycaps, mouse buttons ---- */
const PS_COL = ['#7aa7ff', '#ff6a6a', '#ff8ad8', '#5ad8a0'], XB_COL = ['#5ac85a', '#e85a4a', '#4a8aff', '#f0c030'], XB_LET = ['A', 'B', 'X', 'Y'], NIN_LET = ['B', 'A', 'Y', 'X'];
const ARROW = { u: '↑', d: '↓', l: '←', r: '→', f: '→', b: '←', n: '' };
KC.ARROW = ARROW;
/** the device prompts should use for input I: 'gamepad', 'keyboard' or 'mouse' (touch shows the keyboard's) */
KC.device = (I = KC.game && KC.game.input) => !I ? 'keyboard' : I.lastDevice === 'gamepad' ? 'gamepad' : I.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
KC.padFamily = (I = KC.game && KC.game.input) => { const s = I && I.padStyle ? I.padStyle() : 'playstation'; return s === 'xbox' ? 'xbox' : s === 'nintendo' ? 'nintendo' : s === 'generic' ? 'generic' : 'playstation'; };
/** an icon spec for one input code on its device */
KC.codeIcon = (code, I) => {
  if (!code) return null;
  let m = /^Pad(\d+)$/.exec(code);
  if (m) {
    const b = +m[1];
    if (b <= 3) { const fam = KC.padFamily(I); return { kind: fam === 'playstation' ? 'ps' : fam === 'xbox' ? 'xb' : 'pad', b, fam }; }
    if (b >= 12 && b <= 15) return { kind: 'stick', side: 'D', dir: ['u', 'd', 'l', 'r'][b - 12] };
    const fam = KC.padFamily(I), names = { playstation: ['L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'], xbox: ['LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] }[fam] || ['L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS'];
    return { kind: 'pill', label: names[b - 4] || ('B' + b) };
  }
  m = /^Pad(R?)Axis(Up|Down|Left|Right)$/.exec(code);
  if (m) return { kind: 'stick', side: m[1] ? 'R' : 'L', dir: { Up: 'u', Down: 'd', Left: 'l', Right: 'r' }[m[2]] };
  if (code === 'Mouse0' || code === 'Mouse2') return { kind: 'mouse', b: code === 'Mouse0' ? 0 : 2 };
  const lab = I && I.codeLabel ? I.codeLabel(code) : code;
  return { kind: 'key', label: String(lab).toUpperCase().replace('BACKSPACE', 'BKSP').replace('NUM ', 'N') };
};
/** the icon for an action on a device: its first code there (after the player's rebinding) */
KC.actionIcon = (action, I = KC.game && KC.game.input, device = KC.device(I)) => {
  if (!I || !I.map || !I.map[action]) return { kind: 'key', label: '?' };
  const codes = I.map[action].filter(c => !c.startsWith('Act:'));
  if (device === 'mouse') { if (action === 'confirm') return { kind: 'mouse', b: 0 }; if (action === 'cancel') return { kind: 'mouse', b: 2 }; }
  if (device === 'gamepad') {
    const pads = codes.filter(c => c.startsWith('Pad')), stick = pads.find(c => /Axis/.test(c));
    return KC.codeIcon((['up', 'down', 'left', 'right'].includes(action) ? 'PadAxis' + { up: 'Up', down: 'Down', left: 'Left', right: 'Right' }[action] : stick && action[0] === 't' ? stick : pads.find(c => !/Axis/.test(c)) || pads[0]) || codes[0], I);
  }
  return KC.codeIcon(codes.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || codes[0], I);
};
/** draw an icon at (x, y) (its top left), s = pixel scale; returns its width */
KC.icon = (g, x, y, ic, s = 1) => {
  if (!ic) return 0;
  const H = 11 * s, font = { outline: false, scale: s };
  if (ic.kind === 'text') { E.font.text(g, ic.t, x, y + 2 * s, ic.color || '#ffffff', { outline: false, shadow: '#000', scale: s }); return E.font.width(ic.t, { scale: s }); }
  if (ic.kind === 'key' || ic.kind === 'pill') {
    const w = Math.max(H, E.font.width(ic.label, font) + 6 * s);
    px.rect(g, x + s, y, w - 2 * s, H, ic.kind === 'pill' ? '#2a2a3a' : '#e8e4dc'); px.rect(g, x, y + s, w, H - 2 * s, ic.kind === 'pill' ? '#2a2a3a' : '#e8e4dc');
    px.rect(g, x + s, y + H - 2 * s, w - 2 * s, s, ic.kind === 'pill' ? '#14141e' : '#9a968e');
    E.font.text(g, ic.label, x + Math.round((w - E.font.width(ic.label, font)) / 2), y + 2 * s, ic.kind === 'pill' ? '#e8e4f8' : '#1a1820', font);
    return w;
  }
  const R = Math.round(5.5 * s), cx = x + R, cy = y + R;
  if (ic.kind === 'ps' || ic.kind === 'xb' || ic.kind === 'pad') {
    px.disc(g, cx, cy, R, '#14121c'); px.disc(g, cx, cy, R - s, '#2a2834');
    if (ic.kind === 'xb') { px.disc(g, cx, cy, R - s, XB_COL[ic.b]); E.font.text(g, XB_LET[ic.b], cx - Math.floor(E.font.width(XB_LET[ic.b], font) / 2), cy - 3 * s, '#101018', font); }
    else if (ic.kind === 'pad') { const L = (ic.fam === 'nintendo' ? NIN_LET : ['S', 'E', 'W', 'N'])[ic.b]; E.font.text(g, L, cx - Math.floor(E.font.width(L, font) / 2), cy - 3 * s, '#e8e4f8', font); }
    else {
      const c = PS_COL[ic.b], k = Math.max(1, s), r = R - 3 * s;
      if (ic.b === 0) { px.line(g, cx - r, cy - r, cx + r, cy + r, c, k); px.line(g, cx - r, cy + r, cx + r, cy - r, c, k); }
      else if (ic.b === 1) { px.disc(g, cx, cy, r + k / 2, c); px.disc(g, cx, cy, Math.max(1, r - k / 2), '#2a2834'); }
      else if (ic.b === 2) { px.rect(g, cx - r, cy - r, 2 * r + 1, 2 * r + 1, c); px.rect(g, cx - r + k, cy - r + k, 2 * r + 1 - 2 * k, 2 * r + 1 - 2 * k, '#2a2834'); }
      else { px.line(g, cx, cy - r, cx - r, cy + r - 1, c, k); px.line(g, cx, cy - r, cx + r, cy + r - 1, c, k); px.line(g, cx - r, cy + r - 1, cx + r, cy + r - 1, c, k); }
    }
    return 2 * R + 1;
  }
  if (ic.kind === 'stick') {   // a stick (L or R, or D for the d-pad) with its direction
    if (ic.side === 'D') { px.rect(g, cx - 2 * s, y + s, 4 * s, H - 2 * s, '#2a2834'); px.rect(g, x + s, cy - 2 * s, H - 2 * s, 4 * s, '#2a2834'); }
    else { px.disc(g, cx, cy, R, '#14121c'); px.disc(g, cx, cy, R - s, '#3a3848'); px.disc(g, cx, cy, R - 3 * s, '#55536a'); }
    if (ic.side !== 'D') E.font.text(g, ic.side, cx - Math.floor(E.font.width(ic.side, font) / 2) , cy - 3 * s, '#e8e4f8', font);
    let w = 2 * R + 1;
    if (ic.dir && ic.dir !== 'n') { E.font.text(g, ARROW[ic.dir], x + w + s, y + 2 * s, '#ffe08a', { outline: false, shadow: '#000', scale: s }); w += E.font.width(ARROW[ic.dir], font) + 2 * s; }
    return w;
  }
  if (ic.kind === 'mouse') {
    const w = 9 * s; px.rect(g, x + s, y, w - 2 * s, H, '#e8e4dc'); px.rect(g, x, y + 2 * s, w, H - 4 * s, '#e8e4dc');
    px.rect(g, x + (ic.b === 0 ? s : w / 2), y + s, Math.floor(w / 2 - s), 4 * s, '#e8782a'); px.rect(g, x + Math.floor(w / 2), y, s, 5 * s, '#9a968e');
    return w;
  }
  return 0;
};
/** a run of icons and words: [ic, ic, 'text', ...]; returns its width (draw false: only measure) */
KC.iconRow = (g, x, y, parts, s = 1, draw = true) => {
  let w = 0;
  for (const p of parts) {
    const ic = typeof p === 'string' ? { kind: 'text', t: p } : p;
    if (draw) w += KC.icon(g, x + w, y, ic, s) + 2 * s;
    else w += (ic.kind === 'text' ? E.font.width(ic.t, { scale: s }) : ic.kind === 'key' || ic.kind === 'pill' ? Math.max(11 * s, E.font.width(ic.label, { scale: s }) + 6 * s) : ic.kind === 'mouse' ? 9 * s : ic.kind === 'stick' ? 12 * s + (ic.dir && ic.dir !== 'n' ? E.font.width('→', { scale: s }) + 2 * s : 0) : 12 * s) + 2 * s;
  }
  return w;
};
/** the two icons that perform a technique (facing right: toward is →), on the device used last */
KC.promptFor = (techId, I = KC.game && KC.game.input, device = KC.device(I)) => {
  const cell = techId === 'crouch' ? ['d', null] : techId === 'jump' ? ['u', null] : KC.cellOf(techId); if (!cell) return [];
  const [p, t] = cell, pd = KC.scrDir(p, 1), td = t && KC.scrDir(t, 1);
  const pAct = { u: 'up', d: 'down', l: 'left', r: 'right' }[pd], tAct = td && T_ACT[td];
  const out = [];
  if (device === 'gamepad') {
    if (pAct) out.push({ kind: 'stick', side: 'L', dir: pd });
    if (tAct) { if (out.length) out.push('+'); out.push({ kind: 'stick', side: 'R', dir: td }); }
  } else {
    if (pAct) out.push(KC.actionIcon(pAct, I, 'keyboard'));
    if (tAct) { if (out.length) out.push('+'); out.push(KC.actionIcon(tAct, I, 'keyboard')); }
  }
  if (techId === 'revPunch') out.push('CLOSE');
  return out;
};

/* ---- the touch-only gate: no keyboard or pad seen, a coarse pointer and a touch screen ---- */
KC.touchOnly = () => {
  if (KC._touchLifted) return false;
  try { return typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { KC._touchLifted = true; }, true);
  addEventListener('gamepadconnected', () => { KC._touchLifted = true; });
}
