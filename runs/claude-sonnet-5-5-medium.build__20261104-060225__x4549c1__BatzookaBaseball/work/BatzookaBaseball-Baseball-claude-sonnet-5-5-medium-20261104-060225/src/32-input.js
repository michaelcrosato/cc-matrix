/* BATZOOKA BASEBALL: input. One action preset, intents for the sim, and the glyph prompts that follow the device
   used last (PlayStation or Xbox symbols for a pad, key caps for the keyboard, mouse buttons for the mouse). */
const DEF_IN = E.Input.DEFAULT;
BZ.PRESET = {
  up: DEF_IN.up, down: DEF_IN.down, left: DEF_IN.left, right: DEF_IN.right,
  swing: ['Space', 'Mouse0', 'Pad0'], power: ['KeyE', 'Mouse2', 'Pad2'], tri: ['KeyF', 'Pad3'], cir: ['KeyG', 'Pad1'],
  dive: ['KeyQ', 'Pad4'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad5'], next: ['KeyR', 'Pad5'], sup: ['KeyC', 'Pad6', 'Pad7'],
  t1: ['Digit1', 'Pad1'], t2: ['Digit2', 'Pad3'], t3: ['Digit3', 'Pad2'], th: ['Digit4', 'Pad0'],
  view: ['KeyV', 'Pad11'], start: DEF_IN.start, pause: DEF_IN.pause, confirm: DEF_IN.confirm, cancel: DEF_IN.cancel
};
BZ.ACTION_NAMES = { swing: 'Swing / Pitch', power: 'Batzooka / Fireball', tri: 'Bunt / Advance', cir: 'Steal / Recall', dive: 'Pitch select / Dive', turbo: 'Turbo', next: 'Next pitch / Switch fielder', sup: 'Super glove', t1: 'Throw to 1st', t2: 'Throw to 2nd', t3: 'Throw to 3rd', th: 'Throw home', view: 'Camera' };

/* ---- a button glyph, drawn with pixels (the 5x7 font has no PlayStation symbols) ---- */
const PAD_COL = { ps: ['#6ab0ff', '#ff6a6a', '#ff9ad0', '#6af0a0'], xb: ['#4ad060', '#ff5050', '#5a9aff', '#ffd030'] };
function padGlyph(g, cx, cy, idx, style, size = 5) {
  if (idx <= 3) {
    const cols = style === 'xbox' ? PAD_COL.xb : PAD_COL.ps, c = cols[idx];
    px.disc(g, cx, cy, size + 1, '#10101c'); px.disc(g, cx, cy, size, '#202030');
    if (style === 'xbox') { const ch = ['A', 'B', 'X', 'Y'][idx]; E.font.text(g, ch, cx - 2, cy - 3, c, { outline: false }); return; }
    const s = size - 2;
    if (idx === 0) { px.line(g, cx - s, cy - s, cx + s, cy + s, c, 1); px.line(g, cx - s, cy + s, cx + s, cy - s, c, 1); }
    else if (idx === 1) { px.disc(g, cx, cy, s, c); px.disc(g, cx, cy, s - 1, '#202030'); }
    else if (idx === 2) { px.rect(g, cx - s, cy - s, s * 2 + 1, 1, c); px.rect(g, cx - s, cy + s, s * 2 + 1, 1, c); px.rect(g, cx - s, cy - s, 1, s * 2 + 1, c); px.rect(g, cx + s, cy - s, 1, s * 2 + 1, c); }
    else { px.line(g, cx, cy - s, cx - s, cy + s - 1, c, 1); px.line(g, cx, cy - s, cx + s, cy + s - 1, c, 1); px.line(g, cx - s, cy + s - 1, cx + s, cy + s - 1, c, 1); }
    return;
  }
  const names = { 4: style === 'xbox' ? 'LB' : 'L1', 5: style === 'xbox' ? 'RB' : 'R1', 6: style === 'xbox' ? 'LT' : 'L2', 7: style === 'xbox' ? 'RT' : 'R2', 9: style === 'xbox' ? 'MENU' : 'OPT', 11: 'R3', 10: 'L3' };
  const t = names[idx] || ('B' + idx), w = E.font.width(t) + 6;
  px.rect(g, cx - w / 2, cy - 5, w, 10, '#10101c'); px.rect(g, cx - w / 2 + 1, cy - 4, w - 2, 8, '#2a2a40');
  E.font.text(g, t, cx - w / 2 + 3, cy - 3, '#e8e8ff', { outline: false });
}
/* draws "[glyph] label"; returns the width used. action: an input action name or a literal like 'stick' */
BZ.promptW = (game, action, label) => 22 + E.font.width(label || '');
BZ.prompt = (g, game, x, y, action, label, o = {}) => {
  const I = (o.input || game.input), dev = I.lastDevice === 'touch' ? 'keyboard' : I.lastDevice;
  let w = 0;
  if (action === 'stick') {
    if (dev === 'gamepad') { px.disc(g, x + 6, y + 5, 6, '#10101c'); px.disc(g, x + 6, y + 5, 4, '#303048'); px.disc(g, x + 6, y + 5, 2, '#9090c0'); w = 14; }
    else if (dev === 'mouse') { px.rect(g, x, y - 1, 10, 13, '#10101c'); px.rect(g, x + 1, y, 8, 11, '#e8e8f8'); px.rect(g, x + 4, y, 1, 5, '#10101c'); w = 12; }
    else { for (const [k, dx, dy] of [['W', 7, 0], ['A', 0, 9], ['S', 7, 9], ['D', 14, 9]]) { px.rect(g, x + dx, y + dy - 2, 8, 8, '#10101c'); px.rect(g, x + dx + 1, y + dy - 1, 6, 6, '#e8e8f8'); E.font.text(g, k, x + dx + 2, y + dy - 1, '#1a1a2a', { outline: false }); } w = 24; }
  } else {
    const codes = (I.map[action] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    const pads = codes.filter(c => c.startsWith('Pad')), keys = codes.filter(c => !c.startsWith('Pad'));
    if (dev === 'gamepad' && pads.length) { const idx = +pads[0].slice(3), st = I.padStyle(); padGlyph(g, x + 6, y + 5, idx, st); w = idx <= 3 ? 14 : E.font.width(['L1', 'R1', 'L2', 'R2'][idx - 4] || 'B') + 10; }
    else if (dev === 'mouse' && keys.some(c => c.startsWith('Mouse'))) {
      const m = keys.find(c => c.startsWith('Mouse')), left = m === 'Mouse0';
      px.rect(g, x, y - 1, 11, 13, '#10101c'); px.rect(g, x + 1, y, 9, 11, '#e8e8f8'); px.rect(g, x + 5, y, 1, 5, '#10101c'); px.rect(g, left ? x + 1 : x + 6, y, 4, 5, '#ff7a5a'); w = 13;
    } else {
      const k = keys.find(c => !c.startsWith('Mouse')) || keys[0] || 'Enter', t = I.codeLabel(k), tw = Math.max(9, E.font.width(t) + 6);
      px.rect(g, x, y - 1, tw, 12, '#10101c'); px.rect(g, x + 1, y, tw - 2, 10, '#e8e8f8'); px.rect(g, x + 1, y + 8, tw - 2, 2, '#a8a8c0');
      E.font.text(g, t, x + (tw - E.font.width(t)) / 2 + 0, y + 1, '#1a1a2a', { outline: false }); w = tw + 2;
    }
  }
  if (label) E.font.text(g, label, x + w + 3, y + 2, o.color || '#ffffff', { shadow: '#000', outline: false });
  return w + 4 + (label ? E.font.width(label) : 0);
};

/* ---- intents: what a human is asking for this step ---- */
BZ.zoneFromPointer = (game, I) => {
  const p = I.pointer && I.pointer(); if (!p) return null;
  const W_ = game.W, H_ = game.H, k = game.screen.S / (game.screen.dpr || 1);
  // pointer is in screen pixels (canvas buffer coordinates): map to a zone around the screen centre
  const bx = (p[0] / (game.screen.S) ), by = (p[1] / (game.screen.S));
  const px_ = (p[0] - (game.screen.canvas.width / 2)) / (game.screen.canvas.width / 2), py_ = (p[1] - (game.screen.canvas.height / 2)) / (game.screen.canvas.height / 2);
  return [clamp(px_ * 1.7, -1.6, 1.6), clamp(py_ * 1.7, -1.6, 1.6)];
};
BZ.readIntent = (game, I, sideIdx) => {
  const M = BZ.M, m = I.move(), it = { mx: m[0], my: m[1] };
  it.swing = I.pressed('swing'); it.power = I.pressed('power'); it.bunt = I.down('tri'); it.steal = I.pressed('cir');
  it.next = I.pressed('next'); it.prev = I.pressed('dive'); it.bean = I.down('dive');
  it.jump = I.pressed('dive'); it.turbo = I.down('turbo'); it.super = I.pressed('sup');
  it.advance = I.pressed('tri'); it.retreat = I.pressed('cir');
  it.throwBase = I.pressed('t1') ? 1 : I.pressed('t2') ? 2 : I.pressed('t3') ? 3 : I.pressed('th') ? 0 : -1;
  if (I.lastDevice === 'mouse') {
    const z = BZ.zoneFromPointer(game, I); if (z) it.mouse = z;
    // clicking a base throws there; a click is also the swing, so only in the field
    if (M && (M.phase === 'play') && sideIdx === 1 - M.half && I.pressed('swing') && game.mouseGround) {
      const gp = game.mouseGround(); if (gp) {
        const lx = gp[0] - G.HX, ly = gp[1] - G.HY; let best = -1, bd = 60;
        BASES.forEach((b, i) => { const d = hyp(b[0] - lx, b[1] - ly); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { it.throwBase = best; it.swing = false; }
      }
    }
  }
  return it;
};
/* which input drives a side: player 1 (and the keyboard) the first human side, player 2 the other */
BZ.ctlFor = (game, sideIdx, M) => {
  const sd = M.sides[sideIdx]; return sd.human ? (sd.ctl || game.players[0]) : null;
};
