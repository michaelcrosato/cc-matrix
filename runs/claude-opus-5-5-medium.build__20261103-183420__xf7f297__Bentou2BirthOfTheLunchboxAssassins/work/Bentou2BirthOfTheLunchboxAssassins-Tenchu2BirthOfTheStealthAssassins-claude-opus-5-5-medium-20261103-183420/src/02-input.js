/* 02-input: the action map (DualSense first, keyboard and mouse native), the hero's intent from the player's input, the
 * button glyphs drawn on canvas for whichever device was used last, the touch-only gate and the idle clock. */
const MENU = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'] };
B.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  jump: ['Space', 'Pad0'], crouch: ['KeyC', 'Pad1'], attack: ['Mouse0', 'KeyJ', 'Pad2'], interact: ['KeyF', 'Pad3'], block: ['Mouse2', 'KeyK', 'Pad4'],
  grapple: ['KeyG', 'Mouse1', 'Pad5'], focus: ['Tab', 'Pad6'], useTool: ['KeyR', 'Pad7'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'],
  toolPrev: ['Pad14'], toolNext: ['Pad15'], heal: ['KeyH', 'Pad13'], lure: ['KeyV', 'Pad12'], camLeft: ['KeyQ'], camRight: ['KeyE'], camReset: ['KeyX', 'Pad11'],
  objectives: ['KeyM', 'Pad8'], ...MENU
};
B.CONTROL_NAMES = { jump: 'Jump / climb', crouch: 'Crouch', attack: 'Strike / Silent Cut', interact: 'Interact', block: 'Block / parry', grapple: 'Grappling hook',
  focus: 'Ki Focus', useTool: 'Use tool', sprint: 'Sprint', toolPrev: 'Previous tool', toolNext: 'Next tool', heal: 'Eat rice ball', lure: 'Whistle',
  camLeft: 'Turn camera left', camRight: 'Turn camera right', camReset: 'Reset camera', objectives: 'Objectives' };

/* the idle clock (attract mode) and "mouse mode": any key, button, stick, mouse move over 4 px, wheel, click or touch */
B.idle = 0; B.mouseT = -99; B.wheel = 0; B.slotKey = 0; B.anyInput = false;
const touchOnly = () => { try { return !!(typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0); } catch (e) { return false; } };
B.touchOnly = false;
if (!HEADLESS) {
  B.touchOnly = touchOnly();
  const poke = () => { B.idle = 0; B.anyInput = true; };
  B.taps = new Set();
  addEventListener('keydown', e => { if (!e.repeat) B.taps.add(e.code); }, { capture: true });
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') B.taps.add('Mouse' + e.button); }, { capture: true });
  let lx = -1, ly = -1;
  addEventListener('keydown', e => { poke(); B.touchOnly = false; if (/^Digit[1-8]$/.test(e.code)) B.slotKey = +e.code.slice(5); if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); }, { capture: true });
  addEventListener('pointerdown', e => { poke(); if (e.pointerType === 'mouse') B.mouseT = B.game ? B.game.real : 0; }, { capture: true });
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; if (lx >= 0 && Math.hypot(e.clientX - lx, e.clientY - ly) > 4) { poke(); B.mouseT = B.game ? B.game.real : 0; } lx = e.clientX; ly = e.clientY; }, { capture: true });
  addEventListener('wheel', e => { poke(); B.wheel += Math.sign(e.deltaY); B.mouseT = B.game ? B.game.real : 0; }, { passive: true, capture: true });
  addEventListener('touchstart', poke, { passive: true, capture: true });
  addEventListener('gamepadconnected', () => { B.touchOnly = false; poke(); });
  addEventListener('contextmenu', e => e.preventDefault());
}
/* a gamepad's activity (buttons or sticks) also resets the idle clock: read once a step */
B.padActive = () => {
  const I = B.game.input, ax = I.padAxes || []; let any = false;
  for (const v of ax) if (Math.abs(v) > .35) any = true;
  if (I.held && typeof I.held.forEach === 'function') I.held.forEach(c => { if (typeof c === 'string' && c.startsWith('Pad')) any = true; });
  if (any) B.padT = B.game.real;
  return any;
};
B.padT = -99;
B.mouseMode = () => !!B.game && B.game.real - B.mouseT < 3 && B.mouseT >= B.padT;
const heldCode = c => { const h = B.game.input.held; return !!h && (typeof h.has === 'function' ? h.has(c) : !!h[c]); };

/* the hero's intent from the player: the left stick and the movement keys (never the d-pad: it picks tools in play) */
B.stickPrev = { rx: 0, flick: 0 };
B.intentFromInput = () => {
  const G = B.game, I = G.input, ax = I.padAxes || []; B.padActive();
  let sx = ax[0] || 0, sy = ax[1] || 0; const sl = Math.hypot(sx, sy), dz = I.deadzone || .18;
  if (sl < dz) { sx = 0; sy = 0; } else { const k = (sl - dz) / (1 - dz) / sl; sx *= k; sy *= k; }
  let kx = 0, ky = 0;
  const keysOf = a => (I.map[a] || []).filter(c => !c.startsWith('Pad') && !c.startsWith('Act:'));
  for (const c of keysOf('left')) if (heldCode(c)) kx = -1;
  for (const c of keysOf('right')) if (heldCode(c)) kx = 1;
  for (const c of keysOf('up')) if (heldCode(c)) ky = -1;
  for (const c of keysOf('down')) if (heldCode(c)) ky = 1;
  for (const a of ['left', 'right', 'up', 'down']) if (heldCode('Act:' + a)) { if (a === 'left') kx = -1; if (a === 'right') kx = 1; if (a === 'up') ky = -1; if (a === 'down') ky = 1; }
  let mx = sx, my = sy, walk = false;
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; }
  else if (sl > dz && Math.hypot(sx, sy) < .55) walk = true;
  const d = Math.hypot(mx, my) > .01 ? G.view.screenDirToGround(mx, my) : [0, 0], dl = Math.hypot(d[0], d[1]), ml = Math.min(1, Math.hypot(mx, my));
  const move = dl > 0 ? [d[0] / dl * ml, d[1] / dl * ml] : [0, 0];
  let toolDelta = 0; if (I.pressed('toolPrev')) toolDelta = -1; if (I.pressed('toolNext')) toolDelta = 1;
  if (B.wheel) { toolDelta = B.wheel > 0 ? 1 : -1; B.wheel = 0; }
  const toolSlot = B.slotKey; B.slotKey = 0;
  const mg = B.mouseMode() ? G.mouseGround() : null;
  return { move, walk, sprint: I.down('sprint'), crouchPressed: I.pressed('crouch'), crouchDown: I.down('crouch'), jumpPressed: I.pressed('jump'), attackPressed: I.pressed('attack'),
    blockDown: I.down('block'), blockPressed: I.pressed('block'), interactPressed: I.pressed('interact'), interactDown: I.down('interact'), grapplePressed: I.pressed('grapple'),
    grappleDown: I.down('grapple'), grappleReleased: I.released('grapple'), usePressed: I.pressed('useTool'), focusDown: I.down('focus'), toolDelta, toolSlot,
    healPressed: I.pressed('heal'), lurePressed: I.pressed('lure'), aimPoint: mg ? { x: mg[0], y: mg[1] } : null, right: [ax[2] || 0, ax[3] || 0] };
};
B.emptyIntent = () => ({ move: [0, 0], walk: false, sprint: false, crouchPressed: false, crouchDown: false, jumpPressed: false, attackPressed: false, blockDown: false, blockPressed: false,
  interactPressed: false, interactDown: false, grapplePressed: false, grappleDown: false, grappleReleased: false, usePressed: false, focusDown: false, toolDelta: 0, toolSlot: 0,
  healPressed: false, lurePressed: false, aimPoint: null, right: [0, 0] });

/* ---- glyphs: a pixel icon for an action on the device used last (PlayStation shapes in their colors, Xbox letters,
 * a keycap, a mouse with its button lit). Canvas text can embed {a:attack} ---- */
const PS_COL = { '✕': '#7ab4ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ae0a0' }, XB_COL = { A: '#5ad86a', B: '#ff5a5a', X: '#5a9aff', Y: '#f0d040' };
B.device = () => { const I = B.game.input; return I.lastDevice === 'gamepad' ? 'gamepad' : B.mouseMode() ? 'mouse' : 'keyboard'; };
B.label = (a, dev) => { const I = B.game.input, d = dev || B.device(); let l = I.label(a, d === 'mouse' ? 'mouse' : d); if (!l || l === '?') l = I.label(a, 'keyboard'); return l || a; };
B.glyphW = (a, dev) => { const l = B.label(a, dev), d = dev || B.device(); if (d === 'gamepad' && (PS_COL[l] || XB_COL[l])) return 11; if (/click/i.test(l)) return 9; return E.font.width(l) + 6; };
B.glyph = (g, a, x, y, dev) => {   // x, y: top-left; returns the width drawn (icons are 11 px tall)
  const l = B.label(a, dev), d = dev || B.device();
  if (d === 'gamepad') {
    const c = PS_COL[l] || XB_COL[l];
    if (c) { px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, '#2a2a38'); E.font.text(g, l, x + 6, y + 2, c, { align: 'center', outline: false }); return 11; }
    if (/^D-pad/.test(l)) {   // a cross with the used arm lit
      px.rect(g, x + 3, y, 5, 11, '#2a2a38'); px.rect(g, x, y + 3, 11, 5, '#2a2a38'); const arm = l.slice(-1);
      const lit = '#f0e0b0'; if (arm === '↑') px.rect(g, x + 4, y + 1, 3, 3, lit); if (arm === '↓') px.rect(g, x + 4, y + 7, 3, 3, lit); if (arm === '←') px.rect(g, x + 1, y + 4, 3, 3, lit); if (arm === '→') px.rect(g, x + 7, y + 4, 3, 3, lit);
      return 11;
    }
    const w = E.font.width(l) + 6; px.rect(g, x + 1, y, w - 2, 11, '#101018'); px.rect(g, x, y + 1, w, 9, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 9, '#3a3a4c');
    E.font.text(g, l, x + w / 2, y + 2, '#f4ead5', { align: 'center', outline: false }); return w;
  }
  if (/click/i.test(l)) {   // a mouse: body, buttons, the one used lit
    px.rect(g, x + 1, y, 7, 11, '#101018'); px.rect(g, x + 2, y + 1, 5, 9, '#d8d0c0'); px.rect(g, x + 4, y + 1, 1, 4, '#101018');
    const lit = '#d8402a'; if (/Left/.test(l)) px.rect(g, x + 2, y + 1, 2, 4, lit); else if (/Right/.test(l)) px.rect(g, x + 5, y + 1, 2, 4, lit); else px.rect(g, x + 4, y + 2, 1, 2, lit);
    return 9;
  }
  const w = E.font.width(l) + 6; px.rect(g, x, y, w, 11, '#101018'); px.rect(g, x + 1, y, w - 2, 10, '#e8e0cc'); px.rect(g, x + 1, y + 8, w - 2, 2, '#a89a80');
  E.font.text(g, l, x + w / 2, y + 1, '#1a1418', { align: 'center', outline: false }); return w;
};
/* text with inline {a:action} glyphs, left-aligned at x (or centered with align: 'center'); returns the width */
B.richW = (s, o = {}) => { let w = 0; for (const p of String(s).split(/(\{a:[a-zA-Z]+\})/)) { const m = /^\{a:([a-zA-Z]+)\}$/.exec(p); w += m ? B.glyphW(m[1]) + 2 : E.font.width(p, o); } return w; };
B.rich = (g, s, x, y, color = '#f4ead5', o = {}) => {
  let cx = o.align === 'center' ? Math.round(x - B.richW(s, o) / 2) : o.align === 'right' ? Math.round(x - B.richW(s, o)) : x;
  for (const p of String(s).split(/(\{a:[a-zA-Z]+\})/)) {
    const m = /^\{a:([a-zA-Z]+)\}$/.exec(p);
    if (m) { cx += B.glyph(g, m[1], cx, y - 2) + 2; continue; }
    if (p) { E.font.text(g, p, cx, y, color, Object.assign({ shadow: '#000', outline: false }, o, { align: 'left' })); cx += E.font.width(p, o); }
  }
  return cx;
};
