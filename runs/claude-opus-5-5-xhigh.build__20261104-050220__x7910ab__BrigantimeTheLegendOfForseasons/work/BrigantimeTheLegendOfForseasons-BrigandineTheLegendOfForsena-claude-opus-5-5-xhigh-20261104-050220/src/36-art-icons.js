// ICONS AND GLYPHS: string sprites for sigils, elements, statuses and items, and the controller / keyboard / mouse
// prompt glyphs (the 5x7 font has no circle, square or triangle, so they are drawn in pixels). Shapes as well as
// colours tell everything apart (sides carry sigils; statuses have distinct silhouettes).

const { px } = E;
const SPR = (rows, map) => E.sprite(rows, map);
G.ICON = {};

/* ---- realm sigils (7 x 7, drawn in the trim colour on the banner) ---- */
const SIGIL_ROWS = {
  blossom: ['..x.x..', '.xxxxx.', 'xxxoxxx', '.xxoxx.', 'xxxxxxx', '.x.x.x.', '...x...'],
  sun: ['x..x..x', '.x.x.x.', '..xxx..', 'xxxoxxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  oak: ['...x...', '..xxx..', '.xxxxx.', 'xx.x.xx', '.xxxxx.', '..xxx..', '...x...'],
  snowflake: ['x..x..x', '.x.x.x.', '..xxx..', 'xxx.xxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  hourglass: ['xxxxxxx', '.x...x.', '..xox..', '...x...', '..x.x..', '.xooox.', 'xxxxxxx'],
  axes: ['xx...xx', 'xxx.xxx', '.xx.xx.', '..xxx..', '.xx.xx.', 'xx...xx', 'x.....x']
};
G.sigil = (name, color, accent) => {
  const key = name + color + (accent || ''); G.ICON._sig = G.ICON._sig || {};
  return G.ICON._sig[key] || (G.ICON._sig[key] = SPR(SIGIL_ROWS[name] || SIGIL_ROWS.axes, { x: color, o: accent || color }));
};

/* ---- elements ---- */
const ELEM_ROWS = {
  spring: ['..g.g..', '.gpgpg.', 'gpPyPpg', '.gpppg.', '..gpg..', '...g...', '..ggg..'],
  summer: ['y..y..y', '.yyyyy.', '.yOOOy.', 'yyOOOyy', '.yOOOy.', '.yyyyy.', 'y..y..y'],
  autumn: ['....oo.', '..oooO.', '.ooOoo.', 'oOoooo.', 'ooooo..', '.b.....', 'b......'],
  winter: ['c..c..c', '.c.c.c.', '..cwc..', 'cccwccc', '..cwc..', '.c.c.c.', 'c..c..c'],
  hour: ['bbbbbbb', '.b...b.', '..byb..', '...b...', '..b.b..', '.byyyb.', 'bbbbbbb'],
  none: ['...w...', '..www..', '.wwwww.', 'wwwwwww', '.wwwww.', '..www..', '...w...']
};
const ELEM_COL = { g: '#4a9a3a', p: '#f4b8d0', P: '#ffffff', y: '#ffd040', O: '#ff8a20', o: '#e07a1e', b: '#5a3a2a', c: '#8ad8ff', w: '#ffffff' };
G.elemIcon = e => { G.ICON._el = G.ICON._el || {}; return G.ICON._el[e] || (G.ICON._el[e] = SPR(ELEM_ROWS[e] || ELEM_ROWS.none, Object.assign({}, ELEM_COL, e === 'hour' ? { b: '#d8c070', y: '#f0e8d8' } : {}))); };

/* ---- statuses, buffs and debuffs (distinct shapes) ---- */
const FX_ROWS = {
  poison: ['..g..', '.g.g.', 'g.g.g', '.ggg.', '..g..'], burn: ['..o..', '.ooy.', 'ooyyo', 'oyyyo', '.ooo.'],
  chill: ['c.c.c', '.ccc.', 'ccwcc', '.ccc.', 'c.c.c'], sleep: ['zzzz.', '...z.', '..z..', '.z...', 'zzzz.'],
  stop: ['.www.', 'w.k.w', 'w.kkw', 'w...w', '.www.'], valor: ['..r..', '.rrr.', 'rr.rr', '..r..', '.rrr.'],
  haste: ['yy...', '.yyy.', 'yy.yy', '.yyy.', 'yy...'], warded: ['bbbbb', 'bwwwb', 'bwwwb', '.bwb.', '..b..'],
  guarded: ['wwwww', 'w...w', 'w...w', '.w.w.', '..w..'], frostarmor: ['ccccc', 'cwwwc', 'cwcwc', '.cwc.', '..c..'],
  weakened: ['.ppp.', 'pp.pp', '..p..', '.ppp.', '..p..'], exposed: ['rr.rr', 'r...r', '.r.r.', 'r...r', 'rr.rr']
};
const FX_COL = { g: '#7ad04a', o: '#ff7a2a', y: '#ffe04a', c: '#8ad8ff', w: '#e8e8f0', z: '#c8b0ff', k: '#3a3a46', r: '#ff5a4a', b: '#4aa0ff', p: '#b07ad0' };
G.fxIcon = id => { G.ICON._fx = G.ICON._fx || {}; return G.ICON._fx[id] || (G.ICON._fx[id] = SPR(FX_ROWS[id] || FX_ROWS.guarded, FX_COL)); };

/* ---- items (9 x 9) ---- */
const ITEM_ROWS = {
  sword: ['........w', '.......ww', '......ww.', '.....ww..', '....ww...', '.y.ww....', '..yy.....', '.byy.....', 'b..y.....'],
  spear: ['.......ww', '......www', '.....bw..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  axe: ['....www..', '...wwww..', '...wbww..', '....b....', '....b....', '....b....', '....b....', '....b....', '.........'],
  bow: ['..bb.....', '.b..s....', 'b....s...', 'b.....s..', 'b.....s..', 'b....s...', '.b..s....', '..bb.....', '.........'],
  staff: ['......oo.', '.....oOo.', '.....bo..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  rod: ['.....yy..', '....yoy..', '.....yy..', '....b....', '...b.....', '..b......', '.b.......', 'b........', '.........'],
  tome: ['.rrrrrr..', 'rwwwwwr..', 'rwyyywr..', 'rwwwwwr..', 'rwyyywr..', 'rwwwwwr..', '.rrrrrr..', '.........', '.........'],
  whip: ['bb.......', '.b.......', '.b..ggg..', '..bg...g.', '...g...g.', '..g...g..', '.g..gg...', '..gg.....', '.........'],
  armor: ['.ww...ww.', 'wwwwwwwww', 'wsssssssw', '.sswwwss.', '.sswwwss.', '.sssssss.', '.sss.sss.', '.ss...ss.', '.........'],
  robe: ['..ppppp..', '.ppwwwpp.', '.pppwppp.', '.ppppppp.', 'pppppppp.', 'ppppppppp', 'ppppppppp', '.........', '.........'],
  ring: ['...yyy...', '..y.w.y..', '.y.....y.', '.y.....y.', '.y.....y.', '..y...y..', '...yyy...', '.........', '.........'],
  amulet: ['.y.....y.', '..y...y..', '...y.y...', '....y....', '...bbb...', '..bwwwb..', '...bbb...', '.........', '.........'],
  herb: ['....g....', '...ggg...', '..gg.gg..', '.g..g..g.', '....g....', '....g....', '...ggg...', '.........', '.........'],
  potion: ['...ww....', '...ww....', '..wrrw...', '.wrrrrw..', '.wrrrrw..', '.wrrrrw..', '..wwww...', '.........', '.........'],
  seed: ['....g....', '...g.g...', '...bbb...', '..bbbbb..', '..bbbbb..', '...bbb...', '.........', '.........', '.........'],
  ember: ['....o....', '...oyo...', '..oyyyo..', '..oyyyo..', '...ooo...', '.........', '.........', '.........', '.........'],
  acorn: ['...bbb...', '..bbbbb..', '...ooo...', '..ooooo..', '..ooooo..', '...ooo...', '....o....', '.........', '.........'],
  shard: ['....c....', '...cwc...', '...cwc...', '..ccwcc..', '..cwccc..', '...ccc...', '....c....', '.........', '.........'],
  scroll: ['.wwwwww..', 'w.yyyy.w.', '.wyyyyw..', '.wyyyyw..', '.wyyyyw..', 'w.yyyy.w.', '.wwwwww..', '.........', '.........']
};
const ITEM_COL = { w: '#e8e8f0', y: '#ffd040', b: '#8a5a30', s: '#a8b0c0', o: '#ff8a20', O: '#ffe0a0', r: '#c83a3a', g: '#5ab04a', p: '#8a5ac8', c: '#8ad8ff' };
G.itemIcon = id => {
  const it = G.has('item', id) ? G.get('item', id) : null, kind = it ? it.icon : id;
  G.ICON._it = G.ICON._it || {}; return G.ICON._it[kind] || (G.ICON._it[kind] = SPR(ITEM_ROWS[kind] || ITEM_ROWS.ring, ITEM_COL));
};
/** the stopped-clock icon (Stilled castles) and a candle */
G.ICON.clock = SPR(['.wwww.', 'w.k..w', 'w.k..w', 'w.kkkw', 'w....w', '.wwww.'], { w: '#c8c8d0', k: '#3a3a46' });
G.ICON.candle = SPR(['..o..', '.oyo.', '..y..', '.www.', '.www.', '.www.', '.www.', 'wwwww'], { o: '#ff7a2a', y: '#ffe040', w: '#f0e8d8' });
G.ICON.mana = SPR(['..c..', '.cwc.', 'cwcwc', '.cwc.', '..c..'], { c: '#6ad8ff', w: '#e8fcff' });
G.ICON.away = SPR(['.ww.', 'wkkw', 'wkkw', '.ww.', '.w..', 'w.w.'], { w: '#f0e8d8', k: '#4a6aa0' });

/* ---- prompt glyphs ---- */
const PS = { confirm: ['cross', '#7ab0ff'], cancel: ['circle', '#ff6a6a'], command: ['square', '#ff8ad8'], info: ['triangle', '#5ad8a0'] };
const XB = { confirm: ['A', '#5ad86a'], cancel: ['B', '#ff5a5a'], command: ['X', '#5a9aff'], info: ['Y', '#ffd040'] };
const PAD_LABEL = { prev: ['L1', 'LB'], next: ['R1', 'RB'], zoomOut: ['L2', 'LT'], zoomIn: ['R2', 'RT'], danger: ['L3', 'LS'], turn: ['R3', 'RS'], pause: ['OPTIONS', 'MENU'], up: ['↑'], down: ['↓'], left: ['←'], right: ['→'], move: ['STICK'] };
/** draw the glyph for an action on a device ('gamepad' | 'keyboard' | 'mouse'); returns its width */
G.glyph = (g, x, y, action, device, style) => {
  const S = style || G.glyphStyle();
  if (device === 'gamepad') {
    const fam = S === 'xbox' ? XB : PS, f = fam[action];
    if (f) {
      const cx = x + 5, cy = y + 4;
      px.disc(g, cx, cy, 5, '#1a1824'); px.disc(g, cx, cy, 4, '#2e2a3c');
      if (S === 'xbox') { E.font.text(g, f[0], cx, cy - 3, f[1], { align: 'center', outline: false }); }
      else if (f[0] === 'cross') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, f[1], 1); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, f[1], 1); }
      else if (f[0] === 'circle') { for (let a = 0; a < 16; a++) px.dot(g, cx + Math.round(Math.cos(a / 16 * Math.PI * 2) * 2.4), cy + Math.round(Math.sin(a / 16 * Math.PI * 2) * 2.4), f[1]); }
      else if (f[0] === 'square') { px.rect(g, cx - 2, cy - 2, 5, 1, f[1]); px.rect(g, cx - 2, cy + 2, 5, 1, f[1]); px.rect(g, cx - 2, cy - 2, 1, 5, f[1]); px.rect(g, cx + 2, cy - 2, 1, 5, f[1]); }
      else { px.line(g, cx, cy - 3, cx - 3, cy + 2, f[1], 1); px.line(g, cx, cy - 3, cx + 3, cy + 2, f[1], 1); px.rect(g, cx - 3, cy + 2, 7, 1, f[1]); }
      return 11;
    }
    const lab = PAD_LABEL[action] ? (S === 'xbox' && PAD_LABEL[action][1] ? PAD_LABEL[action][1] : PAD_LABEL[action][0]) : action.toUpperCase();
    return G.keycap(g, x, y, lab, '#3a3650', '#e8e4ff', true);
  }
  const inp = G.game && G.game.input, lab = G.keyLabel(action, device);
  if (device === 'mouse' && lab.mouse) return G.mouseIcon(g, x, y, lab.mouse);
  return G.keycap(g, x, y, lab.key || lab, '#e8e4f0', '#1a1824');
};
/** a keycap with a label; returns its width */
G.keycap = (g, x, y, text, bg, fg, round) => {
  const w = Math.max(9, E.font.width(text) + 5);
  px.rect(g, x, y + 1, w, 8, '#0a0810'); px.rect(g, x + 1, y, w - 2, 9, '#0a0810');
  px.rect(g, x + 1, y + 1, w - 2, 7, bg); if (!round) px.rect(g, x + 1, y + 7, w - 2, 1, E.tones(bg).sh);
  E.font.text(g, text, x + w / 2, y + 1, fg, { align: 'center', outline: false });
  return w + 1;
};
/** a mouse with a button lit: 'L' | 'R' | 'M' | 'W' (wheel); returns its width */
G.mouseIcon = (g, x, y, b) => {
  px.rect(g, x + 1, y, 6, 9, '#0a0810'); px.rect(g, x + 2, y + 1, 4, 7, '#e8e4f0'); px.rect(g, x + 3, y + 1, 1, 3, '#8a86a0');
  if (b === 'L') px.rect(g, x + 2, y + 1, 1, 3, '#ff8a3a'); if (b === 'R') px.rect(g, x + 4, y + 1, 2, 3, '#ff8a3a'); if (b === 'M' || b === 'W') px.rect(g, x + 3, y + 1, 1, 3, '#ff8a3a');
  return 9;
};
/** the keyboard label (and mouse button) of an action, from the player's own bindings */
G.keyLabel = (action, device) => {
  const inp = G.game && G.game.input;
  const fixed = { move: 'WASD', prev: 'Shift+Tab', next: 'Tab', zoomOut: '-', zoomIn: '=', help: 'F1', up: '↑↓', down: '↑↓', left: '←→', right: '←→' };
  if (['up', 'down', 'left', 'right'].includes(action) && device !== 'gamepad') return { key: fixed[action] };
  if (!inp) return { key: fixed[action] || action };
  const codes = (inp.map && inp.map[action]) || [];
  const mouse = codes.find(c => /^Mouse/.test(c)), key = codes.find(c => !/^(Mouse|Pad|Act:)/.test(c));
  const mb = mouse ? { Mouse0: 'L', Mouse1: 'M', Mouse2: 'R' }[mouse] : null;
  if (device === 'mouse' && mb) return { mouse: mb, key: key ? inp.codeLabel(key) : null };
  if (fixed[action] && !key) return { key: fixed[action] };
  return { key: key ? inp.codeLabel(key).toUpperCase().replace('ARROWUP', '↑') : (fixed[action] || action) };
};
/** PlayStation (default) or Xbox, from Settings */
G.glyphStyle = () => (G.game && G.game.settings && String(G.game.settings.glyphs).toLowerCase() === 'xbox' ? 'xbox' : 'playstation');
