// Controls (controller first; keyboard and mouse native), the intent every builder is driven by, and glyph icons.
(() => {
const E = My3D2dge, DQ = globalThis.DQ, px = E.px;
const MOVE = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
const MENUK = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const PLAY = Object.assign({}, MOVE, {
  jump: ['Space', 'Pad0'], swing: ['Mouse0', 'KeyJ', 'Pad2'], place: ['Mouse2', 'KeyK', 'Pad3'], interact: ['KeyF', 'Pad1'],
  sprint: ['ShiftLeft', 'Pad7'], eye: ['KeyC', 'Pad6'], hotPrev: ['BracketLeft', 'Pad4'], hotNext: ['BracketRight', 'Pad5'],
  camLeft: ['KeyQ'], camRight: ['KeyE'], zoomIn: ['Equal'], zoomOut: ['Minus'], camReset: ['KeyR', 'Pad11'],
  satchel: ['Tab', 'KeyI', 'Pad8'], map: ['KeyM', 'Pad17'], journal: ['KeyN'], drop: ['KeyX', 'Delete', 'Pad2'], more: ['KeyT'], tabPrev: ['KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5']
}, MENUK);
for (let i = 1; i <= 8; i++) PLAY['hot' + i] = ['Digit' + i];
DQ.Controls = {
  PLAY,
  NAMES: { jump: 'Jump', swing: 'Swing / break', place: 'Place / use', interact: 'Talk / interact', sprint: 'Sprint', eye: "Builder's Eye", hotPrev: 'Hotbar previous', hotNext: 'Hotbar next',
    camLeft: 'Turn camera left', camRight: 'Turn camera right', zoomIn: 'Zoom in', zoomOut: 'Zoom out', camReset: 'Reset camera', satchel: 'Satchel', map: 'Map', journal: 'Journal', drop: 'Drop (in the Bag)', more: false, tabPrev: false, tabNext: false,
    hot1: false, hot2: false, hot3: false, hot4: false, hot5: false, hot6: false, hot7: false, hot8: false },
  // the mouse is the cursor while it moved or clicked in the last 2 s
  mouseMode(input) { return input.lastDevice === 'mouse' || (input.mouse && input.mouse.active && input.clock - input.mouse.t < 2 && input.lastDevice !== 'gamepad'); },
  // one plain intent per step from the player's devices: the builder, the AI, tests and bots all drive this shape
  intent(game, ctx) {
    const I = game.input, s = game.settings, m = I.move(), v = game.view;
    const d = v.screenDirToGround(m[0], m[1]);
    const it = DQ.Controls.blank();
    it.move = d;
    it.jump = I.pressed('jump'); it.jumpHeld = I.down('jump');
    const sprintMode = s.dqSprint || 'Hold';
    if (sprintMode === 'Toggle') { if (I.pressed('sprint')) ctx._sprintOn = !ctx._sprintOn; if (Math.hypot(d[0], d[1]) < .1) ctx._sprintOn = false; it.sprint = !!ctx._sprintOn; } else it.sprint = I.down('sprint');
    it.swing = I.pressed('swing'); it.swingHeld = I.down('swing'); it.swingReleased = I.released('swing');
    it.place = I.pressed('place'); it.interact = I.pressed('interact');
    it.eye = I.down('eye');
    if (I.pressed('hotPrev')) it.hot = -1; else if (I.pressed('hotNext')) it.hot = 1;
    for (let k = 1; k <= 8; k++) if (I.pressed('hot' + k)) it.hot = { slot: k - 1 };
    const ws = I.wheelSteps(); if (ws) it.hot = ws > 0 ? 1 : -1;
    it.camTurn = I.pressed('camLeft') ? -1 : I.pressed('camRight') ? 1 : I.flick('x');
    if (I.pressed('zoomIn')) it.zoom = 1; else if (I.pressed('zoomOut')) it.zoom = -1;
    else if (I.padAim && Math.abs(I.padAim[1]) > .6 && Math.abs(I.padAim[0]) < .5) { if (I.clock - (ctx._zoomRep || -9) > .35) { ctx._zoomRep = I.clock; it.zoom = I.padAim[1] < 0 ? 1 : -1; } }
    it.camReset = I.pressed('camReset');
    // the mouse aims at what is under it
    if (DQ.Controls.mouseMode(I) && I.pointer() && ctx.world && game.r) {
      const p = I.pointer(), hit = ctx.world.pickScreen(p[0], p[1], v, game.r.ix, game.r.iy);
      it.mouse = true;
      if (hit) { it.cursor = { x: hit.x, y: hit.y, z: hit.z, n: hit.n, obj: hit.obj }; }
      const ap = game.r.pick(p[0], p[1]).find(q => q && q.def);
      if (ap) it.cursorObj = ap;
      const actor = game.r.pick(p[0], p[1]).find(q => q && (q.npc || q.monster));
      if (actor) it.cursorActor = actor;
    }
    return it;
  },
  blank() { return { move: [0, 0], jump: false, jumpHeld: false, sprint: false, swing: false, swingHeld: false, swingReleased: false, place: false, interact: false, hot: null, eye: false, cursor: null, mouse: false, camTurn: 0, zoom: 0, camReset: false, eyeUp: false, eyeDown: false }; }
};

// ---- glyph icons: PlayStation / Xbox / keyboard keycaps / mouse, drawn in pixels ----
const PS = { 0: ['disc', '#7aa7ff', 'x'], 1: ['disc', '#ff6a6a', 'o'], 2: ['disc', '#ff8ad8', 'sq'], 3: ['disc', '#55dca8', 'tri'] };
const XB = { 0: ['disc', '#5ad05a', 'A'], 1: ['disc', '#ff5a5a', 'B'], 2: ['disc', '#5a9aff', 'X'], 3: ['disc', '#f0c830', 'Y'] };
const PADN = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['Create', 'View'], 9: ['Options', 'Menu'], 10: ['L3', 'LS'], 11: ['R3', 'RS'], 12: ['Up', 'Up'], 13: ['Dn', 'Dn'], 14: ['Lt', 'Lt'], 15: ['Rt', 'Rt'], 17: ['Pad', 'View'] };
const KEYN = { Space: 'Space', ShiftLeft: 'Shift', Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backspace: 'Bksp', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const Glyphs = DQ.Glyphs = {
  family(game) { const I = game.input; return I.lastDevice === 'gamepad' ? ((game.settings && game.settings.dqGlyphs) === 'Xbox' ? 'xbox' : 'ps') : I.lastDevice === 'mouse' ? 'mouse' : 'keys'; },
  // the code to show for an action on the device used last
  code(game, action) {
    const I = game.input, m = I.map[action]; if (!m) return null;
    const fam = Glyphs.family(game), real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (fam === 'ps' || fam === 'xbox') return real.find(c => /^Pad\d+$/.test(c)) || real[0];
    if (fam === 'mouse') return real.find(c => c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad'));
    return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad'));
  },
  // draw the icon for an action (or a pseudo action: move, camera, hotbar, wheel) at x, y (top-left, 9 px tall); returns its width
  draw(g, game, action, x, y) {
    const fam = Glyphs.family(game), pad = fam === 'ps' || fam === 'xbox';
    if (action === 'move') return pad ? Glyphs.stick(g, x, y, 'L') : fam === 'mouse' ? Glyphs.keycap(g, x, y, 'WASD') : Glyphs.keycap(g, x, y, 'WASD');
    if (action === 'camera') return pad ? Glyphs.stick(g, x, y, 'R') : Glyphs.keycap(g, x, y, 'Q') + 1 + Glyphs.keycap(g, x + Glyphs.keyW('Q') + 1, y, 'E');
    if (action === 'hotbar') { if (pad) { const w1 = Glyphs.pill(g, x, y, fam === 'ps' ? 'L1' : 'LB'); return w1 + 1 + Glyphs.pill(g, x + w1 + 1, y, fam === 'ps' ? 'R1' : 'RB'); } if (fam === 'mouse') return Glyphs.mouse(g, x, y, 'wheel'); return Glyphs.keycap(g, x, y, '1-8'); }
    const code = Glyphs.code(game, action); if (!code) return 0;
    return Glyphs.drawCode(g, game, code, x, y);
  },
  drawCode(g, game, code, x, y) {
    const fam = Glyphs.family(game), xb = (game.settings && game.settings.dqGlyphs) === 'Xbox';
    let m = /^Pad(\d+)$/.exec(code);
    if (m) {
      const n = +m[1], face = (xb ? XB : PS)[n];
      if (face) {
        px.disc(g, x + 4.5, y + 4.5, 4.5, '#141020'); px.disc(g, x + 4.5, y + 4.5, 3.8, '#2a2440');
        const c = face[1], s = face[2];
        if (xb) E.font.text(g, s, x + 3, y + 1, c, false);
        else if (s === 'x') { px.line(g, x + 2.5, y + 2.5, x + 6.5, y + 6.5, c); px.line(g, x + 6.5, y + 2.5, x + 2.5, y + 6.5, c); }
        else if (s === 'o') { px.disc(g, x + 4.5, y + 4.5, 2.6, c); px.disc(g, x + 4.5, y + 4.5, 1.5, '#2a2440'); }
        else if (s === 'sq') { px.rect(g, x + 2, y + 2, 5, 5, c); px.rect(g, x + 3, y + 3, 3, 3, '#2a2440'); }
        else { px.line(g, x + 4.5, y + 2, x + 2, y + 6.5, c); px.line(g, x + 4.5, y + 2, x + 7, y + 6.5, c); px.line(g, x + 2, y + 6.5, x + 7, y + 6.5, c); }
        return 10;
      }
      const nm = PADN[n]; if (nm) return n >= 10 && n <= 11 ? Glyphs.stick(g, x, y, n === 10 ? 'L' : 'R', true) : Glyphs.pill(g, x, y, xb ? nm[1] : nm[0]);
      return Glyphs.pill(g, x, y, 'B' + n);
    }
    if (code === 'Mouse0') return Glyphs.mouse(g, x, y, 'L');
    if (code === 'Mouse2') return Glyphs.mouse(g, x, y, 'R');
    if (code === 'Mouse1') return Glyphs.mouse(g, x, y, 'M');
    const lab = KEYN[code] || (game.input.codeLabel ? game.input.codeLabel(code) : code);
    return Glyphs.keycap(g, x, y, lab);
  },
  keyW(lab) { return Math.max(9, E.font.width(lab) + 5); },
  keycap(g, x, y, lab) {
    const w = Glyphs.keyW(lab);
    px.rect(g, x, y + 1, w, 8, '#5a5670'); px.rect(g, x, y, w, 8, '#d8d4e4'); px.rect(g, x + 1, y + 1, w - 2, 6, '#ecebf4'); px.rect(g, x, y + 8, w, 1, '#3a364a');
    E.font.text(g, lab, x + Math.round((w - E.font.width(lab)) / 2), y + 1, '#2a2440', false);
    return w;
  },
  pill(g, x, y, lab) {
    const w = Math.max(11, E.font.width(lab) + 6);
    px.rect(g, x + 1, y, w - 2, 9, '#141020'); px.rect(g, x, y + 1, w, 7, '#141020'); px.rect(g, x + 1, y + 1, w - 2, 7, '#3a3456');
    E.font.text(g, lab, x + Math.round((w - E.font.width(lab)) / 2), y + 1, '#ecebf4', false);
    return w;
  },
  stick(g, x, y, s, click) {
    px.disc(g, x + 4.5, y + 4.5, 4.5, '#141020'); px.disc(g, x + 4.5, y + 4.5, 3.6, click ? '#6a6488' : '#3a3456'); px.disc(g, x + 4.5, y + 4.5, 2.4, '#2a2440');
    E.font.text(g, s, x + 3, y + 1, '#ecebf4', false);
    return 10;
  },
  mouse(g, x, y, b) {
    px.rect(g, x + 1, y, 7, 10, '#141020'); px.rect(g, x + 2, y + 1, 5, 8, '#d8d4e4');
    if (b === 'L') px.rect(g, x + 2, y + 1, 2, 3, '#ff8a4a'); else if (b === 'R') px.rect(g, x + 5, y + 1, 2, 3, '#ff8a4a'); else if (b === 'M' || b === 'wheel') px.rect(g, x + 4, y + 1, 1, 3, '#ff8a4a');
    px.rect(g, x + 4, y + 1, 1, 3, b === 'wheel' ? '#ff8a4a' : '#8a86a0');
    return 10;
  },
  tick(g, x, y, ok) {   // the font has no tick or cross: little icons
    if (ok) { px.line(g, x, y + 4, x + 2, y + 6, '#6ae06a'); px.line(g, x + 2, y + 6, x + 6, y + 1, '#6ae06a'); px.line(g, x, y + 5, x + 2, y + 7, '#2a6a2a'); }
    else { px.line(g, x + 1, y + 1, x + 6, y + 6, '#ff6a6a'); px.line(g, x + 6, y + 1, x + 1, y + 6, '#ff6a6a'); }
    return 8;
  },
  // text with {btn:action} tokens swapped for icons of the device used last; returns the width
  text(g, game, str, x, y, color, o = {}) {
    const parts = String(str).split(/(\{btn:[a-zA-Z0-9]+\})/); let cx = x;
    const sc = o.scale || 1;
    for (const p of parts) {
      const m = /^\{btn:(\w+)\}$/.exec(p);
      if (m) { cx += Glyphs.draw(g, game, m[1], cx, y - 1 + (sc > 1 ? 3 : 0)) + 2; continue; }
      if (!p) continue;
      E.font.text(g, p, cx, y, color, Object.assign({ shadow: '#05040a', outline: false }, o)); cx += E.font.width(p, o) + (o.scale > 1 ? 2 : 0);
    }
    return cx - x;
  },
  width(game, str, o = {}) {
    const parts = String(str).split(/(\{btn:[a-zA-Z0-9]+\})/); let w = 0; const fam = Glyphs.family(game);
    for (const p of parts) { const m = /^\{btn:(\w+)\}$/.exec(p); if (m) { w += (m[1] === 'camera' && fam !== 'ps' && fam !== 'xbox' ? 21 : m[1] === 'hotbar' ? 24 : m[1] === 'move' ? (fam === 'ps' || fam === 'xbox' ? 10 : 25) : 10) + 2; const code = !['move', 'camera', 'hotbar'].includes(m[1]) && Glyphs.code(game, m[1]); if (code && !/^Pad|^Mouse/.test(code)) w += Glyphs.keyW(KEYN[code] || game.input.codeLabel(code)) - 10; } else if (p) w += E.font.width(p, o); }
    return w;
  },
  // the plain-text label (hub howto, logs): 'Space', 'X', 'Left click'
  label(game, action) { const c = Glyphs.code(game, action); return c ? (KEYN[c] || game.input.codeLabel(c)) : ''; }
};
})();
