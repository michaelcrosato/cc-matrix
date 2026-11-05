/* UI KIT: the "lockwork brass" look, one focus system for every screen (widgets as rects from a layout function, the
 * d-pad and stick move to the nearest one by geometry, the mouse hovers and clicks), the glyph painter (PlayStation
 * shapes, Xbox letters, keycaps, a mouse) and the prompts row, item icons. */
B.COL = { bg0: '#1c1813', bg1: '#0e0c0a', border: '#b8924a', focus: '#ffd36a', text: '#f0e6d0', dim: '#a89878', hp: '#e0463c', mp: '#4a8aff', food: '#c8a040', rivet: '#e8c878', bad: '#e0463c', good: '#4ae070' };
B.TITLE_COLORS = ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'];
const px = E.px;
B.panel = (g, x, y, w, h, o = {}) => {
  E.ui.box(g, x, y, w, h, { bg: o.bg || [B.COL.bg0, B.COL.bg1], border: o.border || B.COL.border, alpha: o.alpha === undefined ? .94 : o.alpha });
  if (o.rivets !== false) for (const [rx, ry] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) px.rect(g, rx, ry, 2, 2, B.COL.rivet);
};
B.focusFrame = (g, x, y, w, h, t) => {
  const pulse = (Math.sin((t || 0) * 5) + 1) / 2, c = pulse > .5 ? B.COL.focus : '#e8b84a';
  px.rect(g, x - 2, y - 2, w + 4, 1, c); px.rect(g, x - 2, y + h + 1, w + 4, 1, c); px.rect(g, x - 2, y - 2, 1, h + 4, c); px.rect(g, x + w + 1, y - 2, 1, h + 4, c);
  px.rect(g, x - 1, y - 1, w + 2, 1, '#6a4a1a'); px.rect(g, x - 1, y + h, w + 2, 1, '#6a4a1a');
};
B.text = (g, s, x, y, color = B.COL.text, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), color, Object.assign({ shadow: '#000', outline: false }, o));
B.tw = (s, o) => E.font.width(String(s), o);
B.wrap = (s, w, o) => E.font.wrap(String(s), w, o);
B.cut = (s, w) => { s = String(s); if (B.tw(s) <= w) return s; while (s.length > 1 && B.tw(s + '.') > w) s = s.slice(0, -1); return s + '.'; };

/* ---- the glyph painter: one badge for an action's binding on the device used last ---- */
B.padIndex = (game, a) => { const m = game.input.map[a] || []; const c = m.find(x => /^Pad\d+$/.test(x)); return c ? +c.slice(3) : -1; };
B.keyCode = (game, a) => { const m = game.input.map[a] || []; return m.find(x => !x.startsWith('Pad') && !x.startsWith('Act:') && !x.startsWith('Mouse')) || m.find(x => x.startsWith('Mouse')); };
B.device = game => { const d = game.input.lastDevice; return d === 'touch' ? 'keyboard' : d; };
B.xbox = game => game.input.glyphs === 'xbox';
/** draw the badge; returns its width */
B.glyph = (g, game, a, x, y, dev) => {
  dev = dev || B.device(game);
  if (dev === 'gamepad') { const i = B.padIndex(game, a); if (i >= 0) return B.padGlyph(g, game, i, x, y); }
  if (dev === 'mouse' && B.MOUSE_OF[a]) return B.mouseGlyph(g, B.MOUSE_OF[a], x, y);
  const code = B.keyCode(game, a); if (!code) return B.KEY_EXTRA[a] ? B.keycap(g, B.KEY_EXTRA[a], x, y) : 0;
  let label = game.input.codeLabel(code); if (label.length > 7) label = label.replace('click', '').trim();
  return B.keycap(g, label, x, y);
};
B.MOUSE_OF = { use: 'L', strike: 'R', examine: 'M', confirm: 'L' };
B.KEY_EXTRA = { selPrev: 'Shift+Tab' };   // keys read outside the action map
B.keycap = (g, label, x, y) => {
  const w = Math.max(9, B.tw(label) + 5);
  px.rect(g, x, y + 1, w, 9, '#1a1814'); px.rect(g, x, y, w, 9, '#d8d0c0'); px.rect(g, x + 1, y + 1, w - 2, 7, '#f0ece0');
  E.font.text(g, label, x + Math.round((w - B.tw(label)) / 2), y + 1, '#2a2418', { outline: false });
  return w;
};
B.mouseGlyph = (g, b, x, y) => {
  px.rect(g, x, y, 8, 11, '#d8d0c0'); px.rect(g, x + 1, y + 1, 6, 9, '#f0ece0'); px.rect(g, x + 4, y + 1, 1, 4, '#8a8070');
  if (b === 'L') px.rect(g, x + 1, y + 1, 3, 4, '#e0463c'); else if (b === 'R') px.rect(g, x + 5, y + 1, 2, 4, '#e0463c'); else px.rect(g, x + 3, y + 1, 2, 3, '#e0463c');
  return 9;
};
B.padGlyph = (g, game, i, x, y) => {
  const xb = B.xbox(game);
  if (i <= 3) {
    px.disc(g, x + 5, y + 5, 5, '#1a1814'); px.disc(g, x + 5, y + 5, 4, '#2a2620');
    if (xb) { const L = ['A', 'B', 'X', 'Y'][i], C = ['#4ae070', '#e0463c', '#4a8aff', '#ffd36a'][i]; E.font.text(g, L, x + 5 - Math.floor(B.tw(L) / 2), y + 1, C, { outline: false }); }
    else if (i === 0) { const c = '#7ab0ff'; px.line(g, x + 2, y + 2, x + 8, y + 8, c); px.line(g, x + 8, y + 2, x + 2, y + 8, c); }
    else if (i === 1) { px.disc(g, x + 5, y + 5, 3, '#ff6a6a'); px.disc(g, x + 5, y + 5, 2, '#2a2620'); }
    else if (i === 2) { px.rect(g, x + 2, y + 2, 7, 1, '#ff8ad8'); px.rect(g, x + 2, y + 8, 7, 1, '#ff8ad8'); px.rect(g, x + 2, y + 2, 1, 7, '#ff8ad8'); px.rect(g, x + 8, y + 2, 1, 7, '#ff8ad8'); }
    else { const c = '#5ae0b0'; px.line(g, x + 5, y + 2, x + 2, y + 8, c); px.line(g, x + 5, y + 2, x + 8, y + 8, c); px.rect(g, x + 2, y + 8, 7, 1, c); }
    return 11;
  }
  if (i >= 12 && i <= 15) {   // the d-pad: a cross with the pressed arm lit
    px.rect(g, x + 3, y, 4, 10, '#3a3630'); px.rect(g, x, y + 3, 10, 4, '#3a3630');
    const arm = [[x + 3, y, 4, 4], [x + 3, y + 6, 4, 4], [x, y + 3, 4, 4], [x + 6, y + 3, 4, 4]][i - 12]; px.rect(g, arm[0], arm[1], arm[2], arm[3], '#f0ece0');
    return 11;
  }
  const L = (xb ? ['', '', '', '', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'])[i] || '?';
  const w = B.tw(L) + 6; px.rect(g, x, y, w, 10, '#1a1814'); px.rect(g, x + 1, y + 1, w - 2, 8, '#3a3630');
  E.font.text(g, L, x + 3, y + 1, '#f0ece0', { outline: false }); return w;
};
/** a row of prompts: [[action, verb], ...]; align 'left' | 'right' | 'center'; returns the row's width */
B.promptsW = (game, list) => { let w = 0; for (const [a, v] of list) w += B.glyphW(game, a) + 3 + B.tw(v) + 9; return w - 9; };
B.glyphW = (game, a, dev) => {
  dev = dev || B.device(game);
  if (dev === 'gamepad') { const i = B.padIndex(game, a); if (i >= 0) { if (i <= 3 || (i >= 12 && i <= 15)) return 11; const L = (B.xbox(game) ? ['', '', '', '', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'])[i] || '?'; return B.tw(L) + 6; } }
  if (dev === 'mouse' && B.MOUSE_OF[a]) return 9;
  const code = B.keyCode(game, a); if (!code) return B.KEY_EXTRA[a] ? Math.max(9, B.tw(B.KEY_EXTRA[a]) + 5) : 0; let label = game.input.codeLabel(code); if (label.length > 7) label = label.replace('click', '').trim();
  return Math.max(9, B.tw(label) + 5);
};
B.prompts = (g, game, list, x, y, align = 'left', color = B.COL.text) => {
  const w = B.promptsW(game, list); let cx = align === 'right' ? x - w : align === 'center' ? Math.round(x - w / 2) : x;
  for (const [a, v] of list) { const gw = B.glyph(g, game, a, cx, y); cx += gw + 3; B.text(g, v, cx, y + 1, color); cx += B.tw(v) + 9; }
  return w;
};
/** replace {action} in a hint with the player's own button names (for text-only use) */
B.fillGlyphs = (game, s) => String(s).replace(/\{(\w+)\}/g, (_, a) => { const dev = B.device(game); if (dev === 'gamepad') { const i = B.padIndex(game, a); if (i >= 0) return (B.xbox(game) ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'] : ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'])[i]; } const c = B.keyCode(game, a); return c ? game.input.codeLabel(c) : B.KEY_EXTRA[a] || ''; });
/** draw text with {action} glyph badges inline */
B.glyphText = (g, game, s, x, y, color = B.COL.text, align = 'left') => {
  const parts = String(s).split(/(\{\w+\})/); let w = 0; const meas = [];
  for (const p of parts) { const m = /^\{(\w+)\}$/.exec(p); const pw = m ? B.glyphW(game, m[1]) + 2 : B.tw(p); meas.push([p, m && m[1], pw]); w += pw; }
  let cx = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x;
  for (const [p, a, pw] of meas) { if (a) B.glyph(g, game, a, cx, y - 1); else B.text(g, p, cx, y, color); cx += pw; }
  return w;
};

/* ---- the focus system: a screen gives widgets [{ id, x, y, w, h, ... }]; the focus moves among them ---- */
B.Focus = {
  /** move the focus from cur toward dir (0 up, 1 right, 2 down, 3 left) to the nearest widget that way */
  nav(ws, cur, dir) {
    const c = ws.find(w => w.id === cur) || ws[0]; if (!c) return null;
    if (c.nav && c.nav[dir] !== undefined) return c.nav[dir];
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = null, bd = 1e9;
    for (const w of ws) {
      if (w === c || w.skip) continue;
      const wx = w.x + w.w / 2, wy = w.y + w.h / 2, dx = wx - cx, dy = wy - cy;
      const along = [-dy, dx, dy, -dx][dir], across = Math.abs([dx, dy, dx, dy][dir]);
      if (along <= 2) continue;
      const d = along + across * 2.2; if (d < bd) { bd = d; best = w; }
    }
    return best ? best.id : c.id;
  },
  /** the input for a screen: directions (with repeat), hover, clicks; returns { act: 'ok' | 'alt' | 'alt2' | 'back' | 'tabL' | 'tabR' | 'rclick', w } or null */
  update(game, ws, scr) {
    const I = game.input; if (!ws.length) return null;
    if (!ws.some(w => w.id === scr.focus)) scr.focus = (ws.find(w => !w.skip) || ws[0]).id;
    const dirs = ['up', 'right', 'down', 'left'];
    for (let d = 0; d < 4; d++) if (I.repeat(dirs[d], .35, .1)) { const n = B.Focus.nav(ws, scr.focus, d); if (n !== scr.focus) { scr.focus = n; game.audio.sfx('uiMove'); } else if (scr.edge) scr.edge(d); }
    const p = I.pointer();
    if (p && (B.device(game) === 'mouse' || B.device(game) === 'keyboard') && I.mouse && I.mouse.t !== scr._mt) {
      scr._mt = I.mouse.t; const h = ws.find(w => p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h && !w.skip);
      if (h && h.id !== scr.focus) scr.focus = h.id;
    }
    const cl = scr.skipClick ? null : I.clicked(); if (scr.skipClick) scr.skipClick--;
    if (cl) { const h = ws.find(w => cl[0] >= w.x && cl[0] < w.x + w.w && cl[1] >= w.y && cl[1] < w.y + w.h && !w.skip); if (h) { scr.focus = h.id; return { act: 'ok', w: h }; } return { act: 'miss', at: cl }; }
    const fw = ws.find(w => w.id === scr.focus);
    if (I.pressed('confirm') || I.pressed('use')) return { act: 'ok', w: fw };
    if (I.pressed('cancel')) return { act: 'back', w: fw };
    if (I.pressed('alt')) return { act: 'alt', w: fw };
    if (I.pressed('alt2')) return { act: 'alt2', w: fw };
    if (I.pressed('tabL')) return { act: 'tabL', w: fw };
    if (I.pressed('tabR')) return { act: 'tabR', w: fw };
    if (I.pressed('selNext')) return { act: 'tabR', w: fw };
    if (B.UI && B.UI.wheel) { const n = B.UI.wheel; B.UI.wheel = 0; return { act: n > 0 ? 'wheelDown' : 'wheelUp', w: fw }; }
    return null;
  }
};

/* ---- item icons: 12x12 pixel art, shaded from the item's colour ---- */
B.ICON_ART = {
  sword: ['..........ab', '.........abc', '........abc.', '.......abc..', '......abc...', '.....abc....', '.g..abc.....', '..gabc......', '..hg........', '.h..g.......', 'h...........', '............'],
  dagger: ['............', '..........a.', '.........ab.', '........abc.', '.......abc..', '......abc...', '...g.abc....', '....gbc.....', '....hg......', '...h..g.....', '..h.........', '............'],
  axe: ['......aaa...', '.....abbba..', '....abcbba..', '....abbbba..', '.....abba...', '......ha....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', '............'],
  mace: ['.......a.a..', '......abbba.', '.....abcbbba', '......abbba.', '.......a.a..', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', '............'],
  hammer: ['......aaaa..', '.....abbbbba', '.....abcbbba', '......aaaa..', '.......h....', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', '............'],
  pick: ['...aaaa.....', '..abbbba....', '.ab....ha...', 'a......h....', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', '............', '............'],
  staff: ['..........gg', '.........gg.', '........h...', '.......h....', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', 'g...........', '............'],
  spear: ['..........ab', '.........abc', '........aba.', '.......h....', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', 'h...........', '............'],
  glaive: ['.........aab', '........abcb', '........abba', '.......h.a..', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '.h..........', 'h...........', '............'],
  sling: ['............', '..hh........', '.h..h.......', '.h...h......', '..h...h.....', '......h.....', '.....abba...', '....abccba..', '.....abba...', '............', '............', '............'],
  bow: ['.....bb.....', '....b..h....', '...b....h...', '..b.....h...', '..b......h..', '..b......h..', '..b......h..', '..b.....h...', '...b....h...', '....b..h....', '.....bb.....', '............'],
  crossbow: ['..bbbbbbbb..', '.b...hh...b.', '.....hh.....', '.....hh.....', '.....hh.....', '.....hh.....', '.....hh.....', '.....hh.....', '.....ab.....', '.....hh.....', '............', '............'],
  darts: ['............', '.a........a.', '..b.....b...', '...c...c....', '....hh......', '....hh......', '...h..h.....', '..h....h....', '.h......h...', '............', '............', '............'],
  arrows: ['.a..a..a....', '.b..b..b....', '.h..h..h....', '.h..h..h....', '.h..h..h....', '.h..h..h....', '.h..h..h....', '.h..h..h....', 'cwc.cwc.cwc.', 'cwc.cwc.cwc.', '............', '............'],
  stones: ['............', '............', '...aa..aa...', '..abba.abba.', '..abca.abca.', '...aa..aa...', '.....aa.....', '....abba....', '....abca....', '.....aa.....', '............', '............'],
  robe: ['....aaaa....', '...abbbba...', '..abbggbba..', '.abbbggbbba.', '.ab.bggb.ba.', '...bbggbb...', '...bbggbb...', '..bbbggbbb..', '..bbbggbbb..', '.bbbbggbbbb.', '.aaaaaaaaaa.', '............'],
  armor: ['............', '..aa....aa..', '.abba..abba.', '.abbbaabbba.', '.abcbbbbcba.', '..abcbbcba..', '..abbbbbba..', '..abbccbba..', '..abbbbbba..', '..abbbbbba..', '...aaaaaa...', '............'],
  mail: ['............', '..aa....aa..', '.axxa..axxa.', '.axcxaaxcxa.', '.axxcxxcxxa.', '..axxxxxxa..', '..acxcxcxa..', '..axxxxxxa..', '..axcxcxca..', '..axxxxxxa..', '...aaaaaa...', '............'],
  shield: ['............', '..aaaaaaaa..', '.abbbbbbbba.', '.abcbbbbbba.', '.abbbggbbba.', '.abbggggbba.', '.abbbggbbba.', '..abbbbbba..', '...abbbba...', '....abba....', '.....aa.....', '............'],
  cap: ['............', '............', '............', '....aaaa....', '...abbbba...', '..abcbbbba..', '..abbbbbba..', '.aaaaaaaaaa.', '............', '............', '............', '............'],
  helm: ['............', '....aaaa....', '...abbbba...', '..abcbbbba..', '..abbbbbba..', '..abaaaaba..', '..ab....ba..', '..ab....ba..', '...a....a...', '............', '............', '............'],
  crown: ['............', '............', '..b..b..b...', '..bb.bb.bb..', '..bbbbbbbb..', '..bcbbcbbb..', '..bbbbbbbb..', '..aaaaaaaa..', '............', '............', '............', '............'],
  goggles: ['............', '............', '............', 'hh........hh', '.haaa..aaah.', '.abwba.abwba', '.abcba.abcba', '.abbbahabbba', '..aaa...aaa.', '............', '............', '............'],
  amulet: ['...g....g...', '....g..g....', '.....gg.....', '.....aa.....', '....abba....', '...abcwba...', '...abbbba...', '....abba....', '.....aa.....', '............', '............', '............'],
  ring: ['............', '............', '.....b......', '....bwb.....', '...aaaaa....', '..a.....a...', '..a.....a...', '..a.....a...', '...aaaaa....', '............', '............', '............'],
  bracers: ['............', '..aaa..aaa..', '.abba.abba..', '.abca.abca..', '.abba.abba..', '.abca.abca..', '.abba.abba..', '..aaa..aaa..', '............', '............', '............', '............'],
  boots: ['............', '..aa...aa...', '..ab...ab...', '..ab...ab...', '..ab...ab...', '..abb..abb..', '..abbb.abbb.', '..aaaa.aaaa.', '............', '............', '............', '............'],
  ration: ['............', '............', '...hhhhhh...', '..hbbbbbbh..', '.hbcbbbbbbh.', '.hbbbbbbbbh.', '.hbbbbbbbbh.', '..hhhhhhhh..', '............', '............', '............', '............'],
  potion: ['....aaaa....', '.....ww.....', '.....ww.....', '....abba....', '...abbbba...', '..abwbbbba..', '..abcbbbba..', '..abbbbbba..', '...abbbba...', '....aaaa....', '............', '............'],
  scroll: ['............', '..hhhhhhhh..', '.hwwwwwwwwh.', '..wbbbbbbw..', '..wwwwwwww..', '..wbbbbbww..', '..wwwwwwww..', '..wbbbbbbw..', '.hwwwwwwwwh.', '..hhhhhhhh..', '............', '............'],
  note: ['............', '..wwwwwww...', '..wbbbbbww..', '..wwwwwwww..', '..wbbbbbbw..', '..wwwwwwww..', '..wbbbbw.w..', '..wwwwwwww..', '..wbbbbbbw..', '..wwwwwwww..', '............', '............'],
  book: ['............', '..aaaaaaaa..', '..abbbbbbwa.', '..abggggbwa.', '..abbbbbbwa.', '..abbggbbwa.', '..abbbbbbwa.', '..abbbbbbwa.', '..aaaaaaaa..', '............', '............', '............'],
  key: ['............', '..aaa.......', '.abbba......', '.ab.bbaaaaaa', '.abbbbbbbbba', '..aaa...ab.a', '........ab..', '............', '............', '............', '............', '............'],
  ward: ['............', '....a.a.a...', '...abbbbba..', '..abbcbbbba.', '.abbcwcbbba.', '..abbcbbbba.', '.abbbbbbbba.', '..abbbbbba..', '...abbbba...', '....a.a.a...', '............', '............'],
  gear: ['............', '.....aa.....', '..a.abba.a..', '..abbbbbba..', '...abaabba..', '.aabba.abaa.', '.aabba.abaa.', '...abaabba..', '..abbbbbba..', '..a.abba.a..', '.....aa.....', '............'],
  rock: ['............', '............', '............', '....aaaa....', '...abbbba...', '..abcbbbba..', '..abbbbbba..', '..abbbbbbba.', '...aaaaaaa..', '............', '............', '............'],
  ingot: ['............', '............', '............', '............', '...aaaaaa...', '..abcbbbba..', '.abbbbbbbba.', '.aaaaaaaaaa.', '............', '............', '............', '............'],
  bone: ['............', '.aa.........', 'abba........', '.abba.......', '..abba......', '...abba.....', '....abba....', '.....abba...', '......abba..', '.......abba.', '........aa..', '............'],
  wand: ['..........w.', '.........wcw', '..........w.', '........h...', '.......h....', '......h.....', '.....h......', '....h.......', '...h........', '..h.........', '............', '............'],
  picks: ['............', '..hhhhhhhh..', '.h.x.x.x..h.', '.h.x.x.x..h.', '.h.x.x.x..h.', '.h.x.x.x..h.', '..hhhhhhhh..', '............', '............', '............', '............', '............'],
  symbol: ['.....g......', '....g.g.....', '.....g......', '....aaa.....', '...abbba....', '...abwba....', '...abbba....', '....aba.....', '....aba.....', '....abba....', '....aba.....', '............'],
  lantern: ['.....aa.....', '....a..a....', '...aaaaaa...', '...abbbba...', '...abwwba...', '...abccba...', '...abbbba...', '...aaaaaa...', '............', '............', '............', '............'],
  coin: ['............', '............', '....aaaa....', '...abbbba...', '..abcwbbba..', '..abbbbbba..', '..abbbbbba..', '...abbbba...', '....aaaa....', '............', '............', '............']
};
B.iconCache = new Map();
B.icon = id => {
  if (B.iconCache.has(id)) return B.iconCache.get(id);
  const d = B.ITEMS[id] || { icon: 'rock', color: '#888' }, art = B.ICON_ART[d.icon] || B.ICON_ART.rock, t = E.tones(d.color);
  const pal = { a: '#14100c', b: t.base, c: t.lt, w: '#fff6e0', h: '#7a5232', g: '#e8c050', x: '#b8c0cc' };
  const spr = E.sprite(art, pal); B.iconCache.set(id, spr); return spr;
};
B.drawIcon = (g, it, x, y, scale = 1) => {
  if (!it) return; const spr = B.icon(it.id);
  if (scale === 1) px.sprite(g, spr, x, y); else px.sprite(g, spr, x, y, { scale });
  if (it.n > 1) B.text(g, String(it.n), x + 12 * scale - B.tw(String(it.n)) + 1, y + 12 * scale - 6, '#ffffff', { font: 'tiny', outline: '#000', shadow: false });
};
