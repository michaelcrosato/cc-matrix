// Controls (pad first, keyboard+mouse native), prompt glyphs, item icons.
(() => {
const { E, T } = DQ;
const px = E.px;

DQ.PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Escape', 'Pad1'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  jump: ['Space', 'Pad0'], attack: ['Mouse0', 'KeyJ', 'Pad2'], place: ['Mouse2', 'KeyK', 'Pad3'], interact: ['KeyF', 'Pad1'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7'], hotPrev: ['BracketLeft', 'Pad4'], hotNext: ['BracketRight', 'Pad5'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'], slot7: ['Digit7'], slot8: ['Digit8'],
  eye: ['KeyC', 'Pad6'], camL: ['KeyQ'], camR: ['KeyE'], resetCam: ['KeyR', 'Pad11'], satchel: ['Tab', 'KeyI', 'Pad8'], map: ['KeyM'], journal: ['KeyN']
};
DQ.CONTROL_NAMES = { up: false, down: false, left: false, right: false, confirm: false, cancel: false, start: false, pause: false, jump: 'Jump', attack: 'Swing / break', place: 'Place / use item', interact: 'Talk / interact', sprint: 'Sprint', hotPrev: 'Hotbar previous', hotNext: 'Hotbar next', slot1: false, slot2: false, slot3: false, slot4: false, slot5: false, slot6: false, slot7: false, slot8: false, camL: 'Turn camera left', camR: 'Turn camera right', resetCam: 'Reset camera', eye: "Builder's Eye (hold)", satchel: 'Satchel', map: 'Map', journal: 'Journal' };

// ---------- intent for the hero ----------
DQ.wheelAcc = 0; DQ.mouseMode = false; let mouseT = 0, lastPtr = null, flickX = 0, flickY = 0, flickCd = 0;
DQ.readIntent = function (dt) {
  const S = DQ.S, game = DQ.game, I = game.input, h = S.hero;
  const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
  // mouse mode: pointer moved/clicked recently
  const p = I.pointer(); if (p && (!lastPtr || Math.hypot(p[0] - lastPtr[0], p[1] - lastPtr[1]) > 1) || I.down('attack') && I.lastDevice === 'mouse') mouseT = 2;
  if (p) lastPtr = p; mouseT = Math.max(0, mouseT - dt);
  DQ.mouseMode = I.lastDevice === 'mouse' && mouseT > 0;
  let aim = null;
  if (DQ.mouseMode && !S.cut) { const g = game.mouseGround(); if (g) aim = Math.atan2(g[1] - h.y, g[0] - h.x); }
  // hotbar
  const ws = DQ.wheelAcc; DQ.wheelAcc = 0; if (ws) DQ.inv.cycle(ws > 0 ? 1 : -1);
  if (I.pressed('hotPrev')) DQ.inv.cycle(-1); if (I.pressed('hotNext')) DQ.inv.cycle(1);
  for (let i = 1; i <= 8; i++) if (I.pressed('slot' + i)) S.sel = i - 1;
  // camera: keys and right stick flicks
  flickCd = Math.max(0, flickCd - dt);
  if (I.pressed('camL')) DQ.turnCam(-90); if (I.pressed('camR')) DQ.turnCam(90);
  const ax = I.padAim;
  if (ax && flickCd <= 0) { if (Math.abs(ax[0]) > .7 && Math.abs(ax[0]) > Math.abs(ax[1])) { DQ.turnCam(ax[0] > 0 ? 90 : -90); flickCd = .35; } else if (Math.abs(ax[1]) > .7) { game.zoomBy(ax[1] < 0 ? 1.18 : .85); flickCd = .25; } }
  if (I.pressed('resetCam')) { game.resetCamera(); DQ.game.note('CAMERA RESET', 1); }
  // Builder's Eye: hold to stand still and step a precision cursor one cell at a time
  if (I.down('eye') && !S.cut && !h.mount) {
    if (!DQ.builderEyeActive) { DQ.builderEyeActive = true; const t0 = DQ.heroTarget(); DQ.eyeCell = { cx: t0.cx, cy: t0.cy }; }
    const dx = I.repeat('right', .3, .16) - I.repeat('left', .3, .16), dy = I.repeat('down', .3, .16) - I.repeat('up', .3, .16);
    if (dx || dy) { const gd = game.view.screenDirToGround(dx, dy); DQ.eyeCell.cx += Math.round(gd[0]); DQ.eyeCell.cy += Math.round(gd[1]); }
  } else { DQ.builderEyeActive = false; DQ.eyeCell = null; }
  const sprintDown = I.down('sprint'); if (DQ.settings.sprintToggle) { if (I.pressed('sprint')) DQ.sprintOn = !DQ.sprintOn; } else DQ.sprintOn = sprintDown;
  return { mx: d[0], my: d[1], sprint: DQ.sprintOn, jump: I.pressed('jump'), swingPressed: I.buffered('attack', .12) && (I.consume('attack'), true), swingHeld: I.down('attack'), placePressed: I.pressed('place'), interactPressed: I.pressed('interact'), cancel: I.pressed('cancel'), aim };
};
DQ.turnCam = function (deg) { const g = DQ.game; if (DQ.camTurnCd > 0) return; g.rotateView(deg); DQ.camTurnCd = .25; DQ.audio.sfx('whoosh', { vol: .2 }); };
DQ.camTurnCd = 0;

// ---------- glyphs ----------
const PSC = { 0: ['x', '#7aa7ff'], 1: ['o', '#ff6a6a'], 2: ['sq', '#ff8ad8'], 3: ['tri', '#55dca8'] };
const XB = { 0: ['A', '#58d058'], 1: ['B', '#f06060'], 2: ['X', '#5a9aff'], 3: ['Y', '#f0d040'] };
const padFor = a => { const I = DQ.game.input, codes = (I.map && I.map[a]) || []; const b = (I.bindings && I.bindings[a]); const pad = (b && b.pad && b.pad.length ? b.pad : codes.filter(c => /^Pad\d+$/.test(c))); const c = pad.find(c => /^Pad\d+$/.test(c)); return c ? +c.slice(3) : null; };
const keyFor = a => { const I = DQ.game.input; try { return I.label(a, I.lastDevice === 'mouse' ? 'mouse' : 'keyboard'); } catch (e) { return '?'; } };
DQ.glyphKind = () => { const d = DQ.game.input.lastDevice; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'key'; };
// draws a glyph for an action at (x,y) (left,top); returns its width
DQ.glyph = function (g, a, x, y) {
  const kind = DQ.glyphKind(), game = DQ.game;
  if (kind === 'pad') {
    const b = padFor(a), xbox = DQ.settings.glyphs === 'Xbox';
    if (b !== null && b <= 3) {
      const [s, col] = (xbox ? XB : PSC)[b]; px.disc(g, x + 5, y + 5, 5, '#161224'); px.ring ? 0 : 0;
      if (xbox) { E.font.text(g, s, x + 5, y + 1, col, { align: 'center' }); return 11; }
      const cx = x + 5, cy = y + 5;
      if (s === 'x') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, col, 1); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, col, 1); }
      if (s === 'o') { for (let k = 0; k < 12; k++) px.dot(g, Math.round(cx + Math.cos(k / 12 * 6.283) * 3), Math.round(cy + Math.sin(k / 12 * 6.283) * 3), col); }
      if (s === 'sq') { px.rect(g, cx - 2, cy - 2, 5, 1, col); px.rect(g, cx - 2, cy + 2, 5, 1, col); px.rect(g, cx - 2, cy - 2, 1, 5, col); px.rect(g, cx + 2, cy - 2, 1, 5, col); }
      if (s === 'tri') { px.line(g, cx, cy - 3, cx - 3, cy + 2, col, 1); px.line(g, cx, cy - 3, cx + 3, cy + 2, col, 1); px.line(g, cx - 3, cy + 2, cx + 3, cy + 2, col, 1); }
      return 11;
    }
    const names = xbox ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'] : ['x', 'o', 'sq', 'tri', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'];
    const t = b !== null && names[b] ? names[b] : (b === 12 || b === 13 || b === 14 || b === 15 ? 'D-pad' : '?'); const w = E.font.width(t) + 6;
    px.rect(g, x, y + 1, w, 9, '#161224'); px.rect(g, x, y + 1, w, 1, '#8a84b8'); E.font.text(g, t, x + 3, y + 2, '#fff', { outline: false, shadow: null }); return w;
  }
  if (kind === 'mouse') { const m = { attack: 'LMB', place: 'RMB' }[a]; if (m) { const w = E.font.width(m) + 6; px.rect(g, x, y + 1, w, 9, '#d8d4e8'); px.rect(g, x, y + 10, w, 1, '#8a84a8'); E.font.text(g, m, x + 3, y + 2, '#222', { outline: false, shadow: null }); return w; } }
  const t = keyFor(a), w = Math.max(9, E.font.width(t) + 6);
  px.rect(g, x, y + 1, w, 9, '#d8d4e8'); px.rect(g, x, y + 10, w, 1, '#8a84a8'); px.rect(g, x, y + 1, w, 1, '#fff'); E.font.text(g, t, x + 3, y + 2, '#222', { outline: false, shadow: null }); return w;
};
// a row of prompts: [['jump','Jump'],...]
DQ.prompts = function (g, list, x, y, o = {}) {
  let cx = x; for (const [a, label] of list) { const w = DQ.glyph(g, a, cx, y); E.font.text(g, label, cx + w + 3, y + 2, o.color || '#fff', { shadow: '#000', outline: false }); cx += w + 6 + E.font.width(label) + 8; } return cx - x;
};
DQ.promptWidth = (list) => list.reduce((s, [a, l]) => s + 11 + 6 + E.font.width(l) + 8 + (DQ.glyphKind() === 'key' ? E.font.width(keyFor(a)) : 0), 0);

// ---------- item icons ----------
const cube = (g, x, y, s, top, side) => { // isometric cube about s px wide
  const w = s, h = Math.round(s / 2);
  px.poly(g, [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]], top);
  px.poly(g, [[x, y + h / 2], [x + w / 2, y + h], [x + w / 2, y + h + h], [x, y + h + h / 2 ]], E.shade ? E.shade(side, -.1) : side);
  px.poly(g, [[x + w / 2, y + h], [x + w, y + h / 2], [x + w, y + h + h / 2], [x + w / 2, y + h + h]], E.tones(side).deep);
};
DQ.drawIcon = function (g, id, x, y, s = 16) {
  const it = DQ.ITEMS[id]; if (!it) return; const m = s / 16, C = (px_, py_, w_, h_, c) => px.rect(g, Math.round(x + px_ * m), Math.round(y + py_ * m), Math.max(1, Math.round(w_ * m)), Math.max(1, Math.round(h_ * m)), c);
  const k = it.kind;
  if (k === 'block') { const b = DQ.BLOCKS[DQ.blockId(it.block)]; cube(g, x + 1 * m, y + 2 * m, 14 * m, b.top, b.side); return; }
  const o = it.obj;
  if (k === 'obj') {
    if (o === 'door') { C(4, 1, 8, 14, '#9a6a3a'); C(5, 2, 6, 12, '#c68c54'); C(9, 8, 2, 2, '#ffe9a0'); }
    else if (o === 'torch') { C(7, 6, 2, 9, '#7a4a22'); C(5, 2, 6, 5, '#ff8a2a'); C(6, 3, 4, 3, '#ffd060'); }
    else if (o === 'lantern') { C(5, 3, 6, 10, '#6a5a3a'); C(6, 5, 4, 6, '#ffe090'); C(6, 1, 4, 2, '#6a5a3a'); }
    else if (o === 'bed') { C(1, 8, 14, 5, '#8a5a32'); C(2, 6, 12, 4, '#f4ecd8'); C(2, 6, 4, 4, '#e86a5a'); C(1, 13, 2, 2, '#6a4222'); C(13, 13, 2, 2, '#6a4222'); }
    else if (o === 'chest') { C(2, 6, 12, 8, '#a8743a'); C(2, 4, 12, 3, '#c68c54'); C(7, 7, 2, 3, '#ffe9a0'); }
    else if (o === 'table') { C(1, 5, 14, 3, '#c68c54'); C(3, 8, 2, 6, '#8a5a32'); C(11, 8, 2, 6, '#8a5a32'); }
    else if (o === 'seat') { C(2, 8, 12, 3, '#c68c54'); C(3, 11, 2, 4, '#8a5a32'); C(11, 11, 2, 4, '#8a5a32'); }
    else if (o === 'workbench') { C(1, 6, 14, 3, '#9a9aa6'); C(3, 9, 3, 6, '#6c6c7c'); C(10, 9, 3, 6, '#6c6c7c'); C(5, 3, 6, 3, '#c68c54'); }
    else if (o === 'hearth') { C(3, 6, 10, 8, '#6c6c7c'); C(4, 4, 8, 3, '#9a9aa6'); C(5, 9, 6, 4, '#ff9a3a'); }
    else if (o === 'forge') { C(2, 5, 12, 10, '#7a7a8a'); C(4, 8, 8, 5, '#ff7a3a'); C(5, 9, 6, 3, '#ffd060'); C(6, 1, 4, 5, '#4a4a5a'); }
    else if (o === 'bookcase') { C(2, 2, 12, 13, '#8a5a32'); for (let r = 0; r < 3; r++) { C(3, 3 + r * 4, 10, 3, '#3a2a1a'); C(3, 3 + r * 4, 2, 3, '#e86a5a'); C(6, 3 + r * 4, 2, 3, '#5aa8e8'); C(9, 3 + r * 4, 3, 3, '#e8c040'); } }
    else if (o === 'rack') { C(2, 3, 12, 2, '#8a5a32'); C(2, 9, 12, 2, '#8a5a32'); C(5, 1, 1, 13, '#b8b8c8'); C(9, 1, 1, 13, '#b8b8c8'); C(3, 13, 10, 2, '#6a4222'); }
    else if (o === 'trap') { for (let i = 0; i < 4; i++) { C(2 + i * 3, 6, 2, 8, '#d8d8e8'); C(2 + i * 3, 4, 2, 2, '#fff'); } C(1, 13, 14, 2, '#6c6c7c'); }
    else if (o === 'ballista') { C(2, 10, 12, 4, '#8a5a32'); C(7, 3, 2, 9, '#b8b8c8'); C(2, 4, 12, 2, '#c68c54'); C(1, 3, 2, 4, '#e86a5a'); C(13, 3, 2, 4, '#e86a5a'); }
    else C(3, 3, 10, 10, '#ccc');
    return;
  }
  if (id === 'branch') { C(2, 12, 12, 2, '#8a5a32'); C(3, 9, 9, 2, '#8a5a32'); C(10, 6, 2, 4, '#8a5a32'); C(5, 7, 2, 3, '#6fae4f'); return; }
  if (id === 'cotton') { px.disc(g, x + 8 * m, y + 8 * m, 5 * m, '#f4f0e8'); px.disc(g, x + 5 * m, y + 6 * m, 3 * m, '#fff'); px.disc(g, x + 11 * m, y + 10 * m, 3 * m, '#e8e0d0'); return; }
  if (id === 'straw') { for (let i = 0; i < 5; i++) C(3 + i * 2, 3 + (i % 2), 1, 11 - (i % 2), i % 2 ? '#e2c25a' : '#c9a53c'); C(2, 10, 12, 2, '#a07a2a'); return; }
  if (id === 'lint') { px.disc(g, x + 8 * m, y + 9 * m, 4 * m, '#e8e4dc'); px.disc(g, x + 6 * m, y + 7 * m, 2 * m, '#fff'); return; }
  if (id === 'copperore' || id === 'steelore') { const col = id === 'copperore' ? '#d6865a' : '#9fb4d8'; px.disc(g, x + 8 * m, y + 9 * m, 5 * m, '#5a5a66'); px.disc(g, x + 6 * m, y + 7 * m, 2 * m, col); px.disc(g, x + 10 * m, y + 10 * m, 2 * m, col); return; }
  if (id === 'copperthread' || id === 'steelthread') { const col = id === 'copperthread' ? '#e0905a' : '#b8c8ff'; px.disc(g, x + 8 * m, y + 8 * m, 5 * m, col); px.disc(g, x + 8 * m, y + 8 * m, 3 * m, '#2a2438'); px.disc(g, x + 8 * m, y + 8 * m, 1.5 * m, col); return; }
  if (id === 'button') { px.disc(g, x + 8 * m, y + 8 * m, 6 * m, '#c8a030'); px.disc(g, x + 8 * m, y + 8 * m, 4.5 * m, '#ffe060'); C(6, 6, 1, 1, '#8a6a10'); C(9, 6, 1, 1, '#8a6a10'); C(6, 9, 1, 1, '#8a6a10'); C(9, 9, 1, 1, '#8a6a10'); return; }
  if (id === 'berry') { px.disc(g, x + 6 * m, y + 9 * m, 3 * m, '#d85a8a'); px.disc(g, x + 10 * m, y + 8 * m, 3 * m, '#c04070'); C(7, 3, 2, 3, '#4f9a3a'); return; }
  if (id === 'crumpet') { px.disc(g, x + 8 * m, y + 9 * m, 6 * m, '#c8903a'); px.disc(g, x + 8 * m, y + 8 * m, 5 * m, '#e8b860'); C(7, 5, 2, 2, '#fff0a0'); return; }
  if (id === 'stew') { C(2, 7, 12, 7, '#6c6c7c'); C(3, 6, 10, 3, '#c0603a'); C(5, 3, 2, 3, '#fff'); return; }
  if (id === 'heartpatch') { px.disc(g, x + 5 * m, y + 6 * m, 3.5 * m, '#ff6a8a'); px.disc(g, x + 11 * m, y + 6 * m, 3.5 * m, '#ff6a8a'); px.poly(g, [[x + 1.5 * m, y + 7 * m], [x + 14.5 * m, y + 7 * m], [x + 8 * m, y + 14 * m]], '#ff6a8a'); C(3, 9, 10, 1, '#ffe0e8'); return; }
  if (k === 'weapon') { const c = it.metal; px.line(g, x + 3 * m, y + 13 * m, x + 12 * m, y + 3 * m, c, Math.max(1, Math.round(2 * m))); px.line(g, x + 2 * m, y + 14 * m, x + 5 * m, y + 11 * m, '#6a4222', Math.max(1, Math.round(2 * m))); C(11, 2, 3, 2, '#fff'); return; }
  if (k === 'body') { C(3, 3, 10, 11, '#d89a5a'); C(5, 3, 6, 2, '#2a2438'); C(7, 5, 2, 9, '#a0683a'); for (let i = 0; i < 3; i++) C(4, 6 + i * 3, 8, 1, '#f4d8a8'); return; }
  if (k === 'shield') { C(3, 2, 10, 9, '#c8903a'); C(5, 11, 6, 3, '#c8903a'); C(7, 3, 2, 10, '#ffe9a0'); return; }
  if (id === 'banner') { C(3, 1, 1, 14, '#8a5a32'); C(4, 2, 9, 7, '#ffd36a'); C(4, 5, 9, 2, '#e86a5a'); C(5, 9, 3, 2, '#ffd36a'); return; }
  if (id === 'needle') { px.line(g, x + 3 * m, y + 14 * m, x + 13 * m, y + 2 * m, '#ffd36a', Math.max(1, Math.round(2 * m))); C(12, 2, 2, 3, '#fff'); return; }
  C(3, 3, 10, 10, '#ccc');
};
})();
