/* =====================================================================================
 * 61-ui-kit: the "lockwork brass" look (panels, rivets, focus), the glyph painter (PlayStation shapes, Xbox letters,
 * keycaps, the mouse), text with [act:name] badges, item icons, and the one focus system: widgets as rects, the d-pad and
 * stick move by geometry, the mouse hovers and clicks, the wheel scrolls
 * ===================================================================================== */
const COL = { bg: ['#1c1813', '#0e0c0a'], border: '#b8924a', focus: '#ffd36a', text: '#f0e6d0', dim: '#9a8e78', hp: '#e0463c', slot: '#4a8aff', food: '#c8a040', rivet: '#e8c878', bad: '#ff7a5a', good: '#8ae08a' };
B.COL = COL;
const px = E.px;
const TXT = (g, s, x, y, c = COL.text, o = {}) => E.font.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
const TW = (s, o) => E.font.width(String(s), o);
B.TXT_ = TXT;
/** a brass panel with rivets in its corners */
function panel(g, x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  E.ui.box(g, x, y, w, h, { bg: o.bg || COL.bg, border: o.border || COL.border, alpha: o.alpha === undefined ? .94 : o.alpha });
  if (o.rivets !== false && w > 12 && h > 12) for (const [rx, ry] of [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 5], [x + w - 5, y + h - 5]]) px.rect(g, rx, ry, 2, 2, COL.rivet);
}
B.panel = panel;
/** a parchment page: flat paper with a dark ink border */
function parch(g, x, y, w, h) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); px.rect(g, x - 2, y - 2, w + 4, h + 4, '#3a2410'); px.rect(g, x, y, w, h, '#d8c49a'); px.rect(g, x + 2, y + 2, w - 4, 2, '#e8d8b0'); px.rect(g, x + 2, y + h - 4, w - 4, 2, '#c0aa7c'); for (let i = 0; i < 18; i++) px.dot(g, x + 4 + (i * 53) % (w - 8), y + 4 + (i * 37) % (h - 8), '#c4ae84'); }
B.parch = parch;
/** the focus frame: a double brass border that pulses */
function focusFrame(g, x, y, w, h) {
  const p = (Math.sin(game.real * 5) + 1) / 2, c = p > .5 ? COL.focus : '#e8b84a';
  px.rect(g, x - 2, y - 2, w + 4, 1, c); px.rect(g, x - 2, y + h + 1, w + 4, 1, c); px.rect(g, x - 2, y - 2, 1, h + 4, c); px.rect(g, x + w + 1, y - 2, 1, h + 4, c);
  px.rect(g, x - 1, y - 1, w + 2, 1, '#6a4a1a'); px.rect(g, x - 1, y + h, w + 2, 1, '#6a4a1a');
}
B.focusFrame = focusFrame;
/* ---- glyphs ---- */
const PS = { '✕': ['#7ab0ff', 'x'], '○': ['#ff6a6a', 'o'], '□': ['#ff8ad8', 's'], '△': ['#5ae0a0', 't'] };
const XB = { A: '#5ad06a', B: '#ff5a4a', X: '#4a8aff', Y: '#ffd040' };
const devOf = () => { const d = game.input.lastDevice; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'keys'; };
B.devOf = devOf;
/** a label for an action on the device used last: { kind: 'ps' | 'xb' | 'pad' | 'key' | 'mouse', text } */
function badgeOf(a, dev = devOf()) {
  const I = game.input;
  if (a === 'move') return dev === 'pad' ? { kind: 'pad', text: 'L stick' } : { kind: 'key', text: 'WASD' };
  if (a === 'lr') return dev === 'pad' ? { kind: 'pad', text: 'D-pad ←→' } : { kind: 'key', text: '← →' };
  if (a === 'ud') return dev === 'pad' ? { kind: 'pad', text: 'D-pad ↑↓' } : { kind: 'key', text: '↑ ↓' };
  if (a === 'turn') return dev === 'pad' ? { kind: 'pad', text: 'D-pad ←→' } : { kind: 'key', text: I.codeLabel('KeyQ') + ' ' + I.codeLabel('KeyE') };
  if (dev === 'mouse' && B.MOUSE_ACT[a]) return { kind: 'mouse', text: B.MOUSE_ACT[a] };
  if (dev === 'pad') {
    if (a === 'map') return { kind: 'pad', text: I.padStyle() === 'xbox' ? 'View' : 'Create' };
    const t = I.label(a, 'gamepad');
    if (PS[t]) return { kind: 'ps', text: t };
    if (XB[t] && I.padStyle() === 'xbox') return { kind: 'xb', text: t };
    return { kind: 'pad', text: t.replace('D-pad ', '') };
  }
  return { kind: 'key', text: I.label(a, 'keyboard') };
}
B.badgeOf = badgeOf;
const badgeW = b => b.kind === 'ps' || b.kind === 'xb' ? 11 : b.kind === 'mouse' ? 8 : Math.max(11, TW(b.text) + 6);
/** draw a badge at (x, y) (its top-left, 11 tall); returns its width */
function glyph(g, a, x, y, dev) {
  const b = typeof a === 'object' ? a : badgeOf(a, dev); x = Math.round(x); y = Math.round(y);
  if (b.kind === 'ps') {
    const [c, sh] = PS[b.text]; px.disc(g, x + 5, y + 5, 5, '#16141c'); px.disc(g, x + 5, y + 5, 4, '#26222e');
    if (sh === 'x') { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
    else if (sh === 'o') { px.disc(g, x + 5, y + 5, 3, c); px.disc(g, x + 5, y + 5, 2, '#26222e'); }
    else if (sh === 's') { px.rect(g, x + 3, y + 3, 5, 1, c); px.rect(g, x + 3, y + 7, 5, 1, c); px.rect(g, x + 3, y + 3, 1, 5, c); px.rect(g, x + 7, y + 3, 1, 5, c); }
    else { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.rect(g, x + 2, y + 7, 7, 1, c); }
    return 11;
  }
  if (b.kind === 'xb') { px.disc(g, x + 5, y + 5, 5, '#16141c'); px.disc(g, x + 5, y + 5, 4, XB[b.text]); TXT(g, b.text, x + 5 - TW(b.text) / 2 + .5, y + 2, '#101010', { shadow: false }); return 11; }
  if (b.kind === 'mouse') {
    px.rect(g, x + 1, y, 6, 11, '#d8d0c0'); px.rect(g, x + 2, y + 1, 4, 9, '#3a3630'); px.rect(g, x + 1, y + 4, 6, 1, '#d8d0c0'); px.rect(g, x + 4, y, 1, 4, '#d8d0c0');
    const lit = b.text === 'L' ? [x + 2, y + 1, 2, 3] : b.text === 'R' ? [x + 5, y + 1, 1, 3] : [x + 4, y + 1, 1, 3]; px.rect(g, ...lit, '#ffd36a'); return 8;
  }
  const w = badgeW(b), dark = b.kind === 'pad';
  px.rect(g, x + 1, y, w - 2, 11, dark ? '#16141c' : '#5a5448'); px.rect(g, x, y + 1, w, 9, dark ? '#16141c' : '#5a5448');
  px.rect(g, x + 1, y + 1, w - 2, 8, dark ? '#2e2a36' : '#e8e0d0'); TXT(g, b.text, x + 3, y + 2, dark ? '#e8e0f0' : '#1a1610', { shadow: false });
  return w;
}
B.glyph = glyph;
/** text with [act:name] badges in it; returns its width. o.wrap: a width to wrap at (returns { w, h }) */
const TOKEN = /\[act:(\w+)\]/g;
function richWidth(s) { let w = 0; for (const part of String(s).split(/(\[act:\w+\])/)) { const m = part.match(/^\[act:(\w+)\]$/); w += m ? badgeW(badgeOf(m[1])) + 2 : TW(part); } return w; }
function rich(g, s, x, y, c = COL.text, o = {}) {
  if (o.wrap) {
    const words = String(s).split(' '), lines = []; let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (richWidth(t) > o.wrap && line) { lines.push(line); line = wd; } else line = t; }
    if (line) lines.push(line);
    lines.forEach((l, i) => rich(g, l, o.align === 'center' ? x - richWidth(l) / 2 : x, y + i * (o.lh || 11), c));
    return { w: o.wrap, h: lines.length * (o.lh || 11), lines: lines.length };
  }
  let cx = Math.round(x);
  for (const part of String(s).split(/(\[act:\w+\])/)) { const m = part.match(/^\[act:(\w+)\]$/); if (m) { cx += glyph(g, m[1], cx, y - 2) + 2; } else if (part) { TXT(g, part, cx, y, c); cx += TW(part); } }
  return cx - x;
}
B.rich = rich; B.richWidth = richWidth;
/** the text of a hint for the log (plain words for the badges) */
B.plainText = s => String(s).replace(TOKEN, (m, a) => badgeOf(a).text);
/** a row of prompts: [[action, verb], ...] right-aligned at (x, y) or left from x; returns the width */
function prompts(g, list, x, y, o = {}) {
  const ws = list.map(([a, v]) => badgeW(badgeOf(a)) + 3 + TW(v)), total = ws.reduce((s, w) => s + w, 0) + (list.length - 1) * 8;
  let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x;
  list.forEach(([a, v], i) => { cx += glyph(g, a, cx, y - 2) + 3; TXT(g, v, cx, y, o.color || COL.text); cx += TW(v) + 8; });
  return total;
}
B.prompts = prompts;

/* ---- item icons: 12 x 12 pixel art, shaded from the item's colour (E.tones) ---- */
const ICONS = {
  sword: ['..........dd', '.........dce', '........dcd.', '.......dcd..', '......dcd...', '.....dcd....', '..g.dcd.....', '...gcd......', '...Gg.......', '..wG.g......', '.ww.........', 'ww..........'],
  dagger: ['............', '............', '.......d....', '......dce...', '.....dcd....', '....dcd.....', '..g.cd......', '...gd.......', '...Gg.......', '..ww.g......', '.ww.........', '............'],
  axe: ['......bcc...', '.....bcdde..', '.....bcddd..', '......bcdd..', '.....w.bc...', '....w.......', '...w........', '..w.........', '.w..........', 'w...........', '............', '............'],
  mace: ['.......c.c..', '......cdddc.', '.......dedd.', '......cdddc.', '.....w.c.c..', '....w.......', '...w........', '..w.........', '.w..........', 'W...........', '............', '............'],
  hammer: ['......bbcc..', '.....bccdd..', '......ccddd.', '.......cdd..', '.....w..d...', '....w.......', '...w........', '..w.........', '.w..........', 'W...........', '............', '............'],
  staff: ['..........sS', '.........wS.', '........w...', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', 'S...........', '............'],
  spear: ['..........ss', '.........sds', '........ws..', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', 'w...........', '............'],
  glaive: ['........cdd.', '.......cdde.', '.......cddw.', '........cw..', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', 'w...........'],
  pick: ['....ccdde...', '...c...wdd..', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', '............', '............', '............'],
  sling: ['............', '.p.......p..', '..p.....p...', '...p...p....', '....p.p.....', '.....cc.....', '....cddc....', '....cddc....', '.....cc.....', '............', '............', '............'],
  bow: ['....cc......', '...c..p.....', '..c...p.....', '.c....p.....', '.c....p.....', 'c.....p.....', 'c.....p.....', '.c....p.....', '.c....p.....', '..c...p.....', '...c..p.....', '....cc......'],
  xbow: ['............', '.SSSSSSSSS..', '.....p......', '....p.......', '..ccccccccd.', '..bbbbcbbb..', '...p..w.....', '....p.w.....', '......w.....', '......ww....', '............', '............'],
  darts: ['............', '.s......s...', '..s......s..', '...c......c.', '....c......c', '.....d......', '..s......s..', '...s......s.', '....c......c', '.....c......', '......d.....', '............'],
  stones: ['............', '............', '...bc.......', '..bcdd..bc..', '..bccd.bcdd.', '...bb..bccd.', '.......bbb..', '..bcd.......', '.bccdd......', '.bbcc.......', '............', '............'],
  arrows: ['...........d', '..........dc', '.........w..', '...p....w...', '..p....w....', '.p....w.....', 'p....w......', '....w.......', '...w........', '..w.........', '.pp.........', 'p...........'],
  bolts: ['............', '..........d.', '.........dc.', '........S...', '.......S....', '......S.....', '..d..S......', '.dc.S.......', '..SS........', '.SS.........', 'pp..........', '............'],
  robe: ['....cddc....', '...cbddbc...', '..ccbddbcc..', '..cc.dd.cc..', '...c.dd.c...', '...cccccc...', '...cccccc...', '..ccccdccc..', '..ccccdccc..', '.cccccdcccc.', '.bbbbbbbbbb.', '............'],
  armor: ['............', '..bcc..ccb..', '.bccccccccb.', '.bcdccccdcb.', '.bcdccccdcb.', '..bccccccb..', '..bcccdccb..', '..bccccccb..', '..bccccccb..', '..bbbbbbbb..', '............', '............'],
  chain: ['............', '..sSs..sSs..', '.sSsSssSsSs.', '.SsSsSsSsSS.', '.sSsSsSsSss.', '..SsSsSsSS..', '..sSsSsSss..', '..SsSsSsSS..', '..sSsSsSss..', '..SSSSSSSS..', '............', '............'],
  scale: ['............', '..bcd..dcb..', '.bcdcdcdcdb.', '.cdcdcdcdcc.', '.dcdcdcdcdd.', '..cdcdcdcc..', '..dcdcdcdd..', '..cdcdcdcc..', '..dcdcdcdd..', '..bbbbbbbb..', '............', '............'],
  shield: ['............', '..bbbbbbbb..', '.bccccccccb.', '.bcddddddcb.', '.bcdcccdccb.', '.bcdcgcdccb.', '.bccccccccb.', '..bccccccb..', '...bccccb...', '....bccb....', '.....bb.....', '............'],
  buckler: ['............', '............', '....bbbb....', '...bccccb...', '..bcddddcb..', '..bcdggdcb..', '..bcdggdcb..', '..bcddddcb..', '...bccccb...', '....bbbb....', '............', '............'],
  cap: ['............', '............', '....bccb....', '...bcddcb...', '..bcddddcb..', '..bccccccb..', '..bccccccb..', '.bbbbbbbbbb.', '............', '............', '............', '............'],
  helm: ['............', '....bccb....', '...bcddcb...', '..bcddddcb..', '..bccccccb..', '..bckkkkcb..', '..bcckkccb..', '..bcckkccb..', '..bb.kk.bb..', '............', '............', '............'],
  crown: ['............', '............', '..c..c..c...', '..cc.cc.cc..', '..cdccdccd..', '..cddddddc..', '..crcdcrcc..', '..cccccccc..', '..bbbbbbbb..', '............', '............', '............'],
  goggles: ['............', '............', '............', '.gggg..gggg.', 'g.dc.gg.dc.g', 'g.cd.gg.cd.g', '.gggg..gggg.', '............', '............', '............', '............', '............'],
  amulet: ['...g....g...', '....g..g....', '.....gg.....', '.....gg.....', '....gccg....', '...gcddcg...', '...gcdecg...', '...gcddcg...', '....gccg....', '.....gg.....', '............', '............'],
  bracers: ['............', '..ggggg.....', '..gcccg.....', '..gcdcg.....', '..gcccg.ggggg', '..ggggg.gcccg', '........gcdcg', '........gcccg', '........ggggg', '............', '............', '............'],
  ring: ['............', '............', '.....cc.....', '....cddc....', '....cddc....', '...ggccgg...', '..g......g..', '..g......g..', '..g......g..', '...g....g...', '....gggg....', '............'],
  boots: ['............', '...bcc......', '...bcc......', '...bcc......', '...bcc......', '...bcc......', '...bccc.....', '...bcccccc..', '...bccccdcb.', '...bbbbbbbb.', '............', '............'],
  ration: ['............', '............', '...pppppp...', '..pPPPPPPp..', '..pPccccPp..', '..pPcddcPp..', '..pPccccPp..', '..pPPPPPPp..', '...pppppp...', '............', '............', '............'],
  iration: ['............', '...wwwwww...', '..wccccccw..', '..wcddddcw..', '..wcdeedcw..', '..wcddddcw..', '..wccccccw..', '..wwwwwwww..', '............', '............', '............', '............'],
  potion: ['............', '.....ww.....', '.....pp.....', '.....pp.....', '....pccp....', '...pcdecp...', '...pcddcp...', '...pccccp...', '...pbccbp...', '....pppp....', '............', '............'],
  scroll: ['............', '..cc........', '.cddppppp...', '.cdpPPPPPp..', '..pPpPpPPp..', '..pPPPPPPp..', '..pPpPPpPp..', '..pPPPPPPp..', '...pppppddc.', '........ddc.', '.........cc.', '............'],
  wand: ['..........e.', '.........ded', '..........d.', '........g...', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..g.........', '............', '............'],
  key: ['............', '..ccc.......', '.c...c......', '.c...c......', '.c...c......', '..ccdcccccc.', '.......c.c..', '.......c.c..', '............', '............', '............', '............'],
  ward: ['............', '...c.c.c....', '..ccccccc...', '.ccdddddcc..', '..cdbbbdc...', '.ccdbkbdcc..', '..cdbbbdc...', '.ccdddddcc..', '..ccccccc...', '...c.c.c....', '............', '............'],
  gear: ['............', '.....cc.....', '..c.cddc.c..', '...cdddddc..', '..cddkkddc..', '.cddk..kddc.', '.cddk..kddc.', '..cddkkddc..', '...cdddddc..', '..c.cddc.c..', '.....cc.....', '............'],
  note: ['............', '..pppppp....', '..pPPPPPp...', '..pP.k.kPp..', '..pPk.k.Pp..', '..pP.k.kPp..', '..pPk.k.Pp..', '..pP.k..Pp..', '..pPPPPPPp..', '...ppppppp..', '............', '............'],
  book: ['............', '..bbbbbbbb..', '..bccccccp..', '..bcddddcp..', '..bcdggdcp..', '..bcdggdcp..', '..bcddddcp..', '..bccccccp..', '..bccccccp..', '..bbbbbbbb..', '............', '............'],
  rock: ['............', '............', '....bcc.....', '...bcddc....', '..bccddcc...', '..bccccdcc..', '.bbccccccc..', '.bbbcccccb..', '..bbbbbbb...', '............', '............', '............'],
  ingot: ['............', '............', '............', '....cdddd...', '...cddeddd..', '..cccddddb..', '..cccccccb..', '..bbbbbbbb..', '............', '............', '............', '............'],
  bone: ['............', '.cc.........', 'cdc.........', '.cdc........', '..cdc.......', '...cdc......', '....cdc.....', '.....cdc....', '......cdc...', '.......cdc.c', '........cdcd', '.........cc.'],
  picks: ['............', '...wwwwww...', '..wWWWWWWw..', '..wW.s.sWw..', '..wW.s.sWw..', '..wWss.sWw..', '..wW.s.sWw..', '..wWWWWWWw..', '...wwwwww...', '............', '............', '............'],
  symbol: ['....gggg....', '...g....g...', '...g....g...', '....gggg....', '.....gg.....', '.....gg.....', '.....gggg...', '.....gg.....', '.....ggg....', '.....gg.....', '............', '............'],
  lantern: ['.....SS.....', '....S..S....', '....SSSS....', '...SccccS...', '...ScddcS...', '...ScdecS...', '...ScddcS...', '...SccccS...', '....SSSS....', '............', '............', '............'],
  coin: ['............', '............', '....gggg....', '...gccccg...', '..gcdddrcg..', '..gcdrrdcg..', '..gcdddrcg..', '...gccccg...', '....gggg....', '............', '............', '............']
};
const ICON_CACHE = new Map();
/** an item's icon sprite (cached by id and colour) */
function iconOf(id) {
  const d = IT(id); if (!d) return null;
  const k = id; if (ICON_CACHE.has(k)) return ICON_CACHE.get(k);
  const t = E.tones(d.color || '#a8a8b0');
  const pal = { a: t.deep, b: t.sh, c: t.base, d: t.lt, e: t.hi, w: '#7a5430', W: '#4a3018', g: '#d8b04a', G: '#9a7a2a', s: '#c8ccd8', S: '#7a7e8a', p: '#e8dcb8', P: '#b8a888', k: '#0a0808', r: '#c8402a' };
  const spr = E.sprite(ICONS[d.icon] || ICONS.rock, pal);
  ICON_CACHE.set(k, spr); return spr;
}
B.iconOf = iconOf;
/** draw an item's icon (12 px, or scale 2) with a 1-px dark outline */
function icon(g, id, x, y, scale = 1) {
  const s = iconOf(id); if (!s) return;
  if (scale === 1) px.sprite(g, s, Math.round(x), Math.round(y)); else px.sprite(g, s, Math.round(x), Math.round(y), { scale });
}
B.icon = icon;

/* ---- the focus system: a screen gives its widgets ({ id, x, y, w, h, act, alt, tri, tip, group }) each step ---- */
const Focus = {
  /** move or act on a list of widgets; returns { id (the focus), acted } */
  step(list, id, o = {}) {
    const I = game.input; if (!list.length) return { id: null };
    let cur = list.find(w => w.id === id) || list.find(w => !w.disabled) || list[0];
    const pt = I.pointer && I.pointer(), moved = pt && (!this._pt || Math.hypot(pt[0] - this._pt[0], pt[1] - this._pt[1]) > 0);
    if (pt) this._pt = pt.slice();
    const inside = (w, p) => p && p[0] >= w.x && p[0] < w.x + w.w && p[1] >= w.y && p[1] < w.y + w.h;
    if (moved && game.input.lastDevice === 'mouse') { const h = list.find(w => inside(w, pt) && !w.noFocus); if (h && h !== cur) { cur = h; Sound.sfx('uiMove'); } }
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) {
      if (!I.repeat(a, .35, .1)) continue;
      if (o.onDir && o.onDir(a, cur)) continue;
      const nb = cur.nbr && cur.nbr[a]; if (nb) { const t = list.find(w => w.id === nb); if (t) { cur = t; Sound.sfx('uiMove'); continue; } }
      const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = null, bd = 1e9;
      for (const w of list) {
        if (w === cur || w.disabled && o.skipDisabled || w.noFocus) continue;
        const wx = w.x + w.w / 2, wy = w.y + w.h / 2, ddx = wx - cx, ddy = wy - cy, along = ddx * dx + ddy * dy;
        if (along <= 2) continue;
        const across = Math.abs(ddx * dy) + Math.abs(ddy * dx), d = along + across * 2.2;
        if (d < bd) { bd = d; best = w; }
      }
      if (best) { cur = best; Sound.sfx('uiMove'); }
    }
    let acted = false;
    const click = I.clicked();
    if (click && !o.noClick) { const h = list.find(w => inside(w, click)); if (h) { cur = h; if (!(o.noClickSlots && h.slot !== undefined) && !h.disabled && h.act) { h.act(); acted = true; Sound.sfx('uiConfirm'); } } }
    if (!acted && I.pressed('confirm') && !I.held.has('Mouse0')) { if (cur.disabled) Sound.sfx('uiError'); else if (cur.act) { cur.act(); Sound.sfx('uiConfirm'); acted = true; } }
    if (!acted && (I.pressed('mAlt') || (I.pressed('rclick') && pt && inside(cur, pt)))) { if (cur.alt) { cur.alt(); acted = true; } }
    if (!acted && I.pressed('mTri')) { if (cur.tri) { cur.tri(); acted = true; } else if (o.tri) { o.tri(); acted = true; } }
    return { id: cur.id, cur, acted };
  },
  draw(g, list, id) { const w = list.find(q => q.id === id); if (w && !w.noFrame) focusFrame(g, w.x, w.y, w.w, w.h); }
};
B.Focus = Focus;
