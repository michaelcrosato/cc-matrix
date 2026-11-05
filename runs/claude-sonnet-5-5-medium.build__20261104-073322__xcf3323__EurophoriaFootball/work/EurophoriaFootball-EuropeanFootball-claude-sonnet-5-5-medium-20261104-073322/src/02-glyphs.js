/* ============ 02-glyphs: pixel-art controller, keyboard and mouse icons, and the prompt line ============ */
EF.Glyphs = (() => {
  const PS = { cross: '#6aa0ff', circle: '#ff5a5a', square: '#ff7ad0', tri: '#3ad6a0' }, XB = { A: '#3ad65a', B: '#ff5a4a', X: '#4a8aff', Y: '#ffd34a' };
  const PAD = { Pad0: ['cross', 'A'], Pad1: ['circle', 'B'], Pad2: ['square', 'X'], Pad3: ['tri', 'Y'], Pad4: ['L1', 'LB'], Pad5: ['R1', 'RB'], Pad6: ['L2', 'LT'], Pad7: ['R2', 'RT'], Pad8: ['Create', 'View'], Pad9: ['Options', 'Menu'], Pad10: ['L3', 'L3'], Pad11: ['R3', 'R3'], Pad12: ['up', 'up'], Pad13: ['down', 'down'], Pad14: ['left', 'left'], Pad15: ['right', 'right'] };
  const width = (kind, s = 1) => (/^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(kind) ? 16 : /^(Options|Create|Menu|View)$/.test(kind) ? 20 : 12) * s;
  /** draw a pad glyph in g at (x, y) top-left, scale s; style 'playstation' | 'xbox' */
  function pad(g, name, x, y, s, style) {
    const ps = style !== 'xbox', cx = x + 6 * s, cy = y + 6 * s, k = PAD[name] || [name, name], kind = ps ? k[0] : k[1];
    if (PS[kind] || XB[kind]) {
      if (ps) { px.disc(g, cx, cy, 6 * s, '#10131f'); px.disc(g, cx, cy, 5 * s - 1, '#1c2036'); const c = PS[kind], r = 3 * s;
        if (kind === 'cross') { px.line(g, cx - r, cy - r, cx + r, cy + r, c, Math.max(1, s)); px.line(g, cx - r, cy + r, cx + r, cy - r, c, Math.max(1, s)); }
        else if (kind === 'circle') { px.disc(g, cx, cy, r + 1, c); px.disc(g, cx, cy, Math.max(1, r - 1), '#1c2036'); }
        else if (kind === 'square') { px.rect(g, cx - r, cy - r, r * 2, r * 2, c); px.rect(g, cx - r + Math.max(1, s), cy - r + Math.max(1, s), r * 2 - 2 * Math.max(1, s), r * 2 - 2 * Math.max(1, s), '#1c2036'); }
        else { px.poly(g, [[cx, cy - r - 1], [cx + r + 1, cy + r], [cx - r - 1, cy + r]], c); px.poly(g, [[cx, cy - r + Math.max(1, s)], [cx + r - Math.max(1, s), cy + r - Math.max(1, s)], [cx - r + Math.max(1, s), cy + r - Math.max(1, s)]], '#1c2036'); } }
      else { px.disc(g, cx, cy, 6 * s, XB[kind]); px.disc(g, cx, cy, 6 * s - 1, shadeC(XB[kind])); E.font.text(g, kind, cx, cy - 3 * s, '#ffffff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); }
      return 12 * s;
    }
    if (/^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(kind)) { const w = 16 * s; px.rect(g, x, y + 2 * s, w, 8 * s, '#10131f'); px.rect(g, x + 1, y + 2 * s + 1, w - 2, 8 * s - 2, '#2a3050'); E.font.text(g, kind, x + w / 2, y + 3 * s + 1, '#e8ecff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); return w; }
    if (/^(Options|Create|Menu|View)$/.test(kind)) { const w = 20 * s; px.rect(g, x, y + 3 * s, w, 6 * s, '#10131f'); px.rect(g, x + 1, y + 3 * s + 1, w - 2, 6 * s - 2, '#2a3050'); E.font.text(g, kind.slice(0, 4).toUpperCase(), x + w / 2, y + 3 * s + 1, '#e8ecff', { font: 'tiny', align: 'center', scale: 1, outline: false }); return w; }
    px.disc(g, cx, cy, 6 * s, '#10131f'); px.disc(g, cx, cy, 5 * s, '#2a3050'); E.font.text(g, String(kind).slice(0, 2), cx, cy - 2 * s, '#e8ecff', { font: 'tiny', align: 'center', scale: Math.max(1, s), outline: false }); return 12 * s;
  }
  const shadeC = c => { const n = parseInt(c.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * .78).toString(16).padStart(2, '0')).join(''); };
  function key(g, label, x, y, s) {
    const w = Math.max(12, E.font.width(label, { font: 'tiny' }) + 8) * s | 0, h = 11 * s;
    px.rect(g, x, y + 1, w, h, '#0a0c14'); px.rect(g, x, y, w, h - 1, '#e8ecf4'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#c8cfe0'); E.font.text(g, label, x + w / 2, y + 2 * s, '#141826', { font: 'tiny', align: 'center', scale: s >= 2 ? 2 : 1, outline: false }); return w;
  }
  function mouse(g, btn, x, y, s) {
    px.rect(g, x + 1, y, 9 * s, 12 * s, '#e8ecf4'); px.rect(g, x + 2, y + 1, 9 * s - 2, 12 * s - 2, '#8a92b0');
    const lit = '#ffc83a'; if (btn === 0) px.rect(g, x + 2, y + 1, 4 * s, 5 * s, lit); else if (btn === 2) px.rect(g, x + 1 + 5 * s - 1, y + 1, 4 * s, 5 * s, lit); else px.rect(g, x + 1 + 4 * s, y + 1, s + 1, 5 * s, lit);
    px.rect(g, x + 2, y + 6 * s, 9 * s - 2, 1, '#10131f'); return 11 * s;
  }
  return { pad, key, mouse, width };
})();
/** a prompt: the icon for the action on the player's device, then the label. Draws in g (inside r.overlay). Returns the width. */
EF.prompt = (g, x, y, action, label, o = {}) => {
  const s = o.scale || 1, inp = game.players[o.player || 0] || game.input, dev = o.device || inp.lastDevice || 'keyboard', style = (game.settings && game.settings.glyphs) || 'playstation';
  const measure = !!o.measure; let w = 0; const icons = [];
  if (action === 'euphoria' && (dev === 'gamepad')) icons.push(['pad', 'Pad4'], ['plus'], ['pad', 'Pad5']);
  else if (action === 'euphoria') icons.push(['key', 'SPACE']);
  else {
    const map = inp.map && inp.map[action] || [], pads = map.filter(c => /^Pad\d+$/.test(c)), keys = map.filter(c => !/^Pad\d+$/.test(c) && !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (dev === 'gamepad' && pads.length) icons.push(['pad', pads[0]]);
    else if (dev === 'mouse' && keys.find(c => c.startsWith('Mouse'))) icons.push(['mouse', +keys.find(c => c.startsWith('Mouse')).slice(5)]);
    else if (keys.length) icons.push(['key', inp.codeLabel ? inp.codeLabel(keys.find(c => !c.startsWith('Mouse')) || keys[0]) : keys[0]]);
    else if (pads.length) icons.push(['pad', pads[0]]);
  }
  let cx = x; if (o.align === 'center') { const tot = EF.promptWidth(action, label, o); cx = x - tot / 2; } else if (o.align === 'right') { cx = x - EF.promptWidth(action, label, o); }
  const x0 = cx;
  for (const ic of icons) {
    if (ic[0] === 'pad') cx += EF.Glyphs.pad(g, ic[1], cx, y, s, style) + 2 * s;
    else if (ic[0] === 'key') cx += EF.Glyphs.key(g, ic[1], cx, y, s) + 2 * s;
    else if (ic[0] === 'mouse') cx += EF.Glyphs.mouse(g, ic[1], cx, y, s) + 2 * s;
    else if (ic[0] === 'plus') { E.font.text(g, '+', cx, y + 2 * s, '#ffffff', { scale: s, shadow: '#000', outline: false }); cx += 6 * s + 2; }
  }
  if (label) { E.font.text(g, label, cx, y + (o.scale > 1 ? 3 : 2), o.color || '#fff6e0', { scale: s >= 2 ? 2 : 1, shadow: '#000', outline: false }); cx += E.font.width(label, { scale: s >= 2 ? 2 : 1 }); }
  return cx - x0;
};
EF.promptWidth = (action, label, o = {}) => {
  const s = o.scale || 1, inp = game.players[o.player || 0] || game.input, dev = o.device || inp.lastDevice || 'keyboard'; let w = 0;
  if (action === 'euphoria' && dev === 'gamepad') w = 16 * s * 2 + 6 * s + 8;
  else if (action === 'euphoria') w = Math.max(12, E.font.width('SPACE', { font: 'tiny' }) + 8) * s + 2;
  else { const map = inp.map && inp.map[action] || [], pads = map.filter(c => /^Pad\d+$/.test(c)), keys = map.filter(c => !/^Pad\d+$/.test(c) && !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (dev === 'gamepad' && pads.length) w = EF.Glyphs.width((PADNAMES[pads[0]] || ['x'])[0], s) + 2 * s; else if (dev === 'mouse' && keys.find(c => c.startsWith('Mouse'))) w = 11 * s + 2 * s; else if (keys.length) w = Math.max(12, E.font.width(inp.codeLabel ? inp.codeLabel(keys.find(c => !c.startsWith('Mouse')) || keys[0]) : keys[0], { font: 'tiny' }) + 8) * s + 2 * s; else w = 12 * s; }
  return w + (label ? E.font.width(label, { scale: s >= 2 ? 2 : 1 }) : 0);
};
const PADNAMES = { Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad9: ['Options'], Pad8: ['Create'] };
