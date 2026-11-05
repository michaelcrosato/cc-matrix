// MASH TV: button glyph icons and prompts (the 5x7 font has no X O [] /\ symbols).
const PADCODE = { confirm: 'Pad0', select: 'Pad0', cancel: 'Pad1', back: 'Pad1', slide: 'Pad6', bomb: 'Pad5', showboat: 'Pad4', fire: 'Pad7',
  pause: 'Pad9', start: 'Pad9', join: 'Pad9', tabL: 'Pad4', tabR: 'Pad5', reset: 'Pad3', more: 'Pad3', ready: 'Pad0', skip: 'Pad0', move: 'StickL', aim: 'StickR', dpad: 'Pad12', pgL: 'Pad14', pgR: 'Pad15' };
const KEYCODE = { confirm: 'Enter', select: 'Enter', cancel: 'Esc', back: 'Esc', slide: 'Space', bomb: 'E', showboat: 'Q', fire: 'Mouse0',
  pause: 'Esc', start: 'Enter', join: 'Enter', tabL: 'Q', tabR: 'E', reset: 'R', more: 'M', ready: 'Enter', skip: 'Enter', move: 'WASD', aim: 'Mouse', dpad: 'Arrows', pgL: 'Left', pgR: 'Right' };
const PS = { Pad0: ['x', '#7aa8ff'], Pad1: ['o', '#ff6a6a'], Pad2: ['s', '#ff8ad8'], Pad3: ['t', '#5fe0a0'] };
const XB = { Pad0: ['A', '#4ccf6a'], Pad1: ['B', '#ff5a5a'], Pad2: ['X', '#5a9aff'], Pad3: ['Y', '#ffd23a'] };
const PSN = { Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CRE', Pad9: 'OPT', Pad10: 'L3', Pad11: 'R3' };
const XBN = { Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU', Pad10: 'LS', Pad11: 'RS' };
const MT_glyph = MT.glyph = {};
function device(input) { const d = input ? input.lastDevice : 'keyboard'; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'key'; }
function family(input) { return (input && input.padStyle ? input.padStyle() : 'playstation') === 'xbox' ? 'xbox' : 'playstation'; }
MT_glyph.family = family;
// what to show for logical prompt id on this input: { kind: 'pad'|'key'|'mouse', code }
MT_glyph.resolve = function (id, input) {
  const d = device(input), bind = input && input.bindings && input.bindings[id];
  if (d === 'pad') { const c = (bind && bind.pad && bind.pad[0]) || PADCODE[id] || id; return { kind: 'pad', code: c }; }
  let k = (bind && bind.keys && bind.keys[0]) || KEYCODE[id] || id;
  if (d === 'mouse' || k.startsWith('Mouse')) { if (id === 'fire') return { kind: 'mouse', code: 'Mouse0' }; if (id === 'bomb' && d === 'mouse') return { kind: 'mouse', code: 'Mouse2' }; if (id === 'aim') return { kind: 'mouse', code: 'Mouse' }; }
  if (/^Key[A-Z]$/.test(k)) k = k.slice(3); if (k === 'ShiftLeft') k = 'Shift'; if (k === 'Escape') k = 'Esc';
  return { kind: 'key', code: k };
};
const dark = '#140a24';
function discBg(g, x, y, c) { E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 4, c || '#2a1446'); }
function drawPadCode(g, x, y, code, fam) {
  const t = (fam === 'xbox' ? XB : PS)[code];
  if (t) {
    E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 4, '#2a1446');
    if (fam === 'xbox') E.font.text(g, t[0], x + 5, y + 1, t[1], { align: 'center', outline: false });
    else {
      const c = t[1], X = x + 5, Y = y + 5;
      if (t[0] === 'x') { E.px.line(g, X - 2, Y - 2, X + 2, Y + 2, c, 1); E.px.line(g, X - 2, Y + 2, X + 2, Y - 2, c, 1); E.px.line(g, X - 2, Y - 1, X + 1, Y + 2, c, 1); E.px.line(g, X - 1, Y - 2, X + 2, Y + 1, c, 1); }
      else if (t[0] === 'o') { E.px.disc(g, X, Y, 3, c); E.px.disc(g, X, Y, 1.4, '#2a1446'); }
      else if (t[0] === 's') { E.px.rect(g, X - 2, Y - 2, 5, 5, c); E.px.rect(g, X - 1, Y - 1, 3, 3, '#2a1446'); }
      else { E.px.poly(g, [[X, Y - 3], [X + 3, Y + 2], [X - 3, Y + 2]], c); E.px.poly(g, [[X, Y - 1], [X + 1.4, Y + 1], [X - 1.4, Y + 1]], '#2a1446'); }
    }
    return 11;
  }
  const nm = (fam === 'xbox' ? XBN : PSN)[code];
  if (nm) { const w = E.font.width(nm) + 5; E.px.rect(g, x, y + 1, w, 9, dark); E.px.rect(g, x + 1, y + 2, w - 2, 7, fam === 'xbox' ? '#3a3a52' : '#34335a'); E.font.text(g, nm, x + w / 2, y + 2, '#fff', { align: 'center', outline: false }); return w; }
  if (code === 'Pad12' || code === 'Pad13' || code === 'Pad14' || code === 'Pad15') { discBg(g, x, y); E.px.rect(g, x + 4, y + 2, 3, 7, '#e8e8f0'); E.px.rect(g, x + 2, y + 4, 7, 3, '#e8e8f0'); return 11; }
  if (code === 'StickL' || code === 'StickR') { E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 3.4, '#8a86b0'); E.px.disc(g, x + 5, y + 5, 1.6, '#34335a'); E.font.text(g, code === 'StickL' ? 'L' : 'R', x + 13, y + 2, '#fff', { outline: false }); return 18; }
  E.px.rect(g, x, y + 1, 11, 9, dark); E.font.text(g, '?', x + 5, y + 2, '#fff', { align: 'center', outline: false }); return 11;
}
function drawKey(g, x, y, label) {
  const w = Math.max(11, E.font.width(label) + 6);
  E.px.rect(g, x, y + 1, w, 10, dark); E.px.rect(g, x + 1, y, w - 2, 9, '#e8e4f4'); E.px.rect(g, x + 1, y + 8, w - 2, 1, '#a8a2c8');
  E.font.text(g, label, x + w / 2, y + 1, '#1a1030', { align: 'center', outline: false }); return w;
}
function drawMouse(g, x, y, code) {
  E.px.rect(g, x, y, 9, 11, dark); E.px.rect(g, x + 1, y + 1, 7, 9, '#d8d4ec'); E.px.rect(g, x + 4, y + 1, 1, 4, dark); E.px.rect(g, x + 1, y + 5, 7, 1, dark);
  if (code === 'Mouse0') E.px.rect(g, x + 1, y + 1, 3, 4, '#ffcc33'); else if (code === 'Mouse2') E.px.rect(g, x + 5, y + 1, 3, 4, '#ffcc33'); else E.px.rect(g, x + 3, y + 3, 3, 3, '#ffcc33');
  return 9;
}
// draw one icon, returns its width
MT_glyph.draw = function (g, x, y, id, input, o = {}) {
  const r = MT_glyph.resolve(id, input);
  if (r.kind === 'pad') return drawPadCode(g, x, y, r.code, family(input));
  if (r.kind === 'mouse') return drawMouse(g, x, y, r.code);
  return drawKey(g, x, y, r.code);
};
MT_glyph.width = function (id, input) {
  const r = MT_glyph.resolve(id, input);
  if (r.kind === 'mouse') return 9; if (r.kind === 'key') return Math.max(11, E.font.width(r.code) + 6);
  const fam = family(input), t = (fam === 'xbox' ? XB : PS)[r.code]; if (t) return 11;
  const nm = (fam === 'xbox' ? XBN : PSN)[r.code]; if (nm) return E.font.width(nm) + 5; return r.code.startsWith('Stick') ? 18 : 11;
};
// a row of icon + label pairs; returns total width. align: 'left' | 'center' | 'right'
MT_glyph.prompt = function (g, x, y, pairs, input, o = {}) {
  let tw = 0; const gap = 9;
  for (const [id, label] of pairs) tw += MT_glyph.width(id, input) + 3 + E.font.width(label) + gap;
  tw -= gap; let px = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  for (const [id, label] of pairs) {
    const w = MT_glyph.draw(g, Math.round(px), y, id, input);
    E.font.text(g, label, Math.round(px + w + 3), y + 2, o.color || '#fff7e8', { shadow: '#000', outline: false });
    px += w + 3 + E.font.width(label) + gap;
  }
  return tw;
};
// the input whose device decides prompts: the one that last pressed anything (any player)
MT.lastInput = function () { return MT.lastIn && MT.game.players.includes(MT.lastIn) ? MT.lastIn : MT.game.input; };
