// ---------------------------------------------------------------- string sprites: pickups, prizes, icons
MT.spr = (() => {
  const S = (rows, pal) => E.sprite(rows, pal);
  const spr = {
    bill: S(['gggggggggg', 'gGGGGGGGGg', 'gGgG$$GgGg', 'gGGGGGGGGg', 'gggggggggg'], { g: '#2a8a3a', G: '#7ad88a', $: '#fff7a0' }),
    stack: S(['.gggggggg.', 'gGGGGGGGGg', 'gGGyyyyGGg', 'gggggggggg', 'gGGGGGGGGg', 'gggggggggg'], { g: '#2a7a3a', G: '#8ae09a', y: '#ffcc33' }),
    gold: S(['..hhhhhh..', '.hYYYYYYh.', 'hYYYwYYYYh', 'yyyyyyyyyy', 'yoooooooyy'], { h: '#fff4b0', Y: '#ffd040', w: '#ffffff', y: '#d8a020', o: '#a07010' }),
    case: S(['...kkkk...', '..k....k..', 'ssssssssss', 'sSSSSSSSSs', 'sSSS$$SSSs', 'sSSSSSSSSs', 'ssssssssss'], { k: '#5a5a6a', s: '#6a7080', S: '#d8e0f0', $: '#2a8a3a' }),
    key: S(['.yyy......', 'y...y.....', 'y.w.yyyyyy', 'y...y..y.y', '.yyy...y..'], { y: '#ffcc33', w: '#ffffff' }),
    bulb: S(['.www.', 'wWWWw', 'wWyWw', '.www.', '.sss.', '.sss.'], { w: '#c8d0e0', W: '#ffffff', y: '#ffe060', s: '#6a6a7a' }),
    star: S(['....y....', '...yYy...', 'yyyYYYyyy', '.yYYYYYy.', '..yYYYy..', '.yYy.yYy.', '.yy...yy.'], { y: '#e8a020', Y: '#ffe060' }),
    statue: S(['...yy...', '..yYYy..', '..yYYy..', '.yyYYyy.', 'y.yYYy.y', '..yYYy..', '..yYYy..', '..yYYy..', '.yyyyyy.', 'kkkkkkkk', 'kKKKKKKk'], { y: '#d8a020', Y: '#ffe060', k: '#3a2a1a', K: '#6a4a2a' }),
    tomatoSplat: null
  };
  const BOX = ['.b..b.', 'bbbbbb', 'cccccc', 'cCcCcc', 'cccccc', 'cccccc'];
  spr.prizeR = S(BOX, { b: '#ffcc33', c: '#c8202a', C: '#ff6a6a' });
  spr.prizeB = S(BOX, { b: '#ffffff', c: '#2a5ac8', C: '#6a9aff' });
  spr.prizeG = S(BOX, { b: '#c8202a', c: '#d8a020', C: '#fff0a0' });
  // 12x12 prize icons: a handful of silhouettes, each prize picks one with its colors
  const ICONS = {
    toaster: ['............', '...ww..ww...', '..wwwwwwww..', '.mmmmmmmmmm.', '.mMMMMMMMMm.', '.mMMMMMMMMmk', '.mMMMMMMMMmk', '.mmmmmmmmmm.', '..d......d..'],
    blender: ['....kkkk....', '...cCCCCc...', '...cCCCCc...', '....cCCc....', '....cCCc....', '...mmmmmm...', '...mMMMMm...', '...mmmmmm...'],
    box: ['............', '..cccccccc..', '.cCCCCCCCCc.', '.cCCwwCCCCc.', '.cCCCCCCCCc.', '.cccccccccc.', '..k......k..'],
    vehicle: ['............', '....cccc....', '...cCCCCc...', '.mmmmmmmmmm.', 'mMMMMMMMMMMm', 'mmmmmmmmmmmm', '.kk......kk.', '.kk......kk.'],
    robot: ['....kkkk....', '...mMMMMm...', '...mwMMwm...', '...mMMMMm...', '..cccccccc..', '..cCCCCCCc..', '..cCCCCCCc..', '...k....k...', '...k....k...'],
    screen: ['kkkkkkkkkkkk', 'kCCCCCCCCCCk', 'kCwCCCCCCCCk', 'kCCCCCCCCCCk', 'kCCCCCCCCCCk', 'kkkkkkkkkkkk', '.....mm.....', '...mmmmmm...'],
    gem: ['....wwww....', '...wCCCCw...', '..wCCwCCCw..', '...cCCCCc...', '....cCCc....', '.....cc.....'],
    moon: ['....yyyy....', '..yyYYYYyy..', '.yYYYcYYYYy.', '.yYYYYYYcYy.', '.yYcYYYYYYy.', '..yyYYYYyy..', '....yyyy....']
  };
  const cache = {};
  spr.icon = (shape, c1, c2) => { const k = shape + c1 + c2; return cache[k] || (cache[k] = S(ICONS[shape] || ICONS.box, { c: E.tones(c1).sh, C: c1, m: E.tones(c2).sh, M: c2, w: '#ffffff', k: '#1a1424', d: '#3a3a48', y: '#d8a020', Y: '#ffe060' })); };
  return spr;
})();

// ---------------------------------------------------------------- the power-up capsule: a mini TV showing the power-up's letter
MT.drawCapsule = (g, x, y, wid, k = 1, t = 0) => {
  const W = MT.WEAPONS[wid] || MT.ADDONS[wid] || { letter: '?', color: '#ffffff' };
  px.rect(g, x - 6 * k, y - 5 * k, 12 * k, 10 * k, '#14101c');
  px.rect(g, x - 5 * k, y - 4 * k, 10 * k, 8 * k, '#c8d0e0');
  px.rect(g, x - 4 * k, y - 3 * k, 8 * k, 6 * k, Math.floor(t * 4) % 2 ? W.color : E.tones(W.color).sh);
  E.font.text(g, W.letter, x - E.font.width(W.letter) * k / 2 + .5, y - 3 * k, '#14101c', { scale: k, outline: false });
  px.line(g, x - 2 * k, y - 5 * k, x - 4 * k, y - 8 * k, '#c8d0e0'); px.line(g, x + 2 * k, y - 5 * k, x + 4 * k, y - 8 * k, '#c8d0e0');
};
