// Pixel-art HUD icons as data: the tool wheel and the button glyphs.
export const TOOL_ICONS = {
  scalpel: { rows: ['..........w.', '.........wwm', '........wwm.', '.......wwm..', '......wwm...', '.....ssm....', '....ssm.....', '...ssm......', '..ssm.......', '.ssm........', 'ssm.........', '.m..........'], c: { w: 'white', m: 'mist', s: 'slate' } },
  forceps: { rows: ['..m......m..', '..m......m..', '..mm....mm..', '...m....m...', '...mm..mm...', '....m..m....', '....mmmm....', '....ssss....', '.....ss.....', '.....ss.....', '.....ss.....', '.....ww.....'], c: { m: 'mist', s: 'slate', w: 'white' } },
  suture: { rows: ['.....wwww...', '...ww....w..', '..w.......w.', '.w........w.', '.w.......w..', '.b......m...', '.b.....mm...', '..b...mm....', '..bb.mm.....', '....mm......', '...mm.......', '..mm........'], c: { w: 'white', b: 'sky', m: 'mist' } },
  drain: { rows: ['..........nn', '.........nn.', '........nn..', '.......ss...', '......ss....', '.....ss.....', '....ss......', '...sws......', '..sws.......', '.wws........', 'www.........', '.w..........'], c: { w: 'white', s: 'sky', n: 'navy' } },
  syringe: { rows: ['...........w', '..........w.', '.......mmw..', '......mccm..', '.....mccm...', '....mccm....', '...mccm.....', '..mmcm......', '.mm.mm......', 'mm..........', 'w...........', '............'], c: { w: 'white', m: 'mist', c: 'cyan' } },
  gel: { rows: ['.....tt.....', '.....tt.....', '....tttt....', '...tttttt...', '...llllll...', '..llllllll..', '..lwwwwwll..', '..lwwwwwll..', '..lwwwwwll..', '..llllllll..', '..llllllll..', '...llllll...'], c: { t: 'teal', l: 'lime', w: 'white' } },
  laser: { rows: ['r...........', 'rr..........', '.ro.........', '..oo........', '...nn.......', '....nn......', '.....nn.....', '......nn....', '.......nn...', '........nn..', '.........nn.', '..........nn'], c: { r: 'red', o: 'orange', n: 'mist' } },
  scanner: { rows: ['...cccccc...', '..c......c..', '.c..c.....c.', '.c...c....c.', '.c....c...c.', '.c........c.', '..c......c..', '...cccccc...', '.....mm.....', '.....mm.....', '.....ss.....', '.....ss.....'], c: { c: 'cyan', m: 'mist', s: 'slate' } },
  dressing: { rows: ['............', '...wwwwww...', '..wwwwwwww..', '.wwmmmmmmww.', '.wwm....mww.', '.wwm....mww.', '.wwm....mww.', '.wwmmmmmmww.', '..wwwwwwww..', '...wwwwwwww.', '..........ww', '............'], c: { w: 'white', m: 'mist' } },
};

const C = { o: 'ink', x: 'white' };
const SHAPE = {
  cross: ['..ooooo..', '.ooooooo.', 'ooxoooxoo', 'oooxoxooo', 'ooooxoooo', 'oooxoxooo', 'ooxoooxoo', '.ooooooo.', '..ooooo..'],
  circle: ['..ooooo..', '.ooooooo.', 'oooxxxooo', 'ooxoooxoo', 'ooxoooxoo', 'ooxoooxoo', 'oooxxxooo', '.ooooooo.', '..ooooo..'],
  square: ['..ooooo..', '.ooooooo.', 'ooxxxxxoo', 'ooxoooxoo', 'ooxoooxoo', 'ooxoooxoo', 'ooxxxxxoo', '.ooooooo.', '..ooooo..'],
  triangle: ['..ooooo..', '.oooxooo.', 'oooxoxooo', 'oooxoxooo', 'ooxoooxoo', 'ooxoooxoo', 'oxxxxxxxo', '.ooooooo.', '..ooooo..'],
  disc: ['..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'],
  dpad: ['...ooo...', '...oxo...', '...oxo...', 'oooooooo.', 'oxxxxxxo.', 'oooooooo.', '...oxo...', '...oxo...', '...ooo...'],
  mouseL: ['..ooooo..', '.oxxoeeo.', '.oxxoeeo.', '.oxxoeeo.', '.ooooooo.', '.oeeeeeo.', '.oeeeeeo.', '.oeeeeeo.', '..ooooo..'],
  mouseR: ['..ooooo..', '.oeeoxxo.', '.oeeoxxo.', '.oeeoxxo.', '.ooooooo.', '.oeeeeeo.', '.oeeeeeo.', '.oeeeeeo.', '..ooooo..'],
  mouseM: ['..ooooo..', '.oeexeeo.', '.oeexeeo.', '.oeexeeo.', '.ooooooo.', '.oeeeeeo.', '.oeeeeeo.', '.oeeeeeo.', '..ooooo..'],
};
export const GLYPHS = {
  // PlayStation.
  CROSS: { sprite: SHAPE.cross, c: { ...C, x: 0x7ab8ff } },
  CIRCLE: { sprite: SHAPE.circle, c: { ...C, x: 0xff6b6b } },
  SQUARE: { sprite: SHAPE.square, c: { ...C, x: 0xff9edb } },
  TRIANGLE: { sprite: SHAPE.triangle, c: { ...C, x: 0x5fe0b0 } },
  L1: { pill: 'L1' }, R1: { pill: 'R1' }, L2: { pill: 'L2' }, R2: { pill: 'R2' }, OPTIONS: { pill: 'OPT' },
  // Xbox.
  A: { sprite: SHAPE.disc, c: { o: 0x2f9e44 }, letter: 'A' }, B: { sprite: SHAPE.disc, c: { o: 0xd9363e }, letter: 'B' }, X: { sprite: SHAPE.disc, c: { o: 0x3b6fd9 }, letter: 'X' }, Y: { sprite: SHAPE.disc, c: { o: 0xd9a400 }, letter: 'Y' },
  LB: { pill: 'LB' }, RB: { pill: 'RB' }, LT: { pill: 'LT' }, RT: { pill: 'RT' }, MENU: { pill: 'MENU' },
  // Both.
  LS: { pill: 'LS' }, RS: { pill: 'RS' }, DPAD: { sprite: SHAPE.dpad, c: { o: 'ink', x: 'white' } },
  // Mouse.
  LMB: { sprite: SHAPE.mouseL, c: { o: 'ink', x: 'sand', e: 'mist' } }, RMB: { sprite: SHAPE.mouseR, c: { o: 'ink', x: 'sand', e: 'mist' } }, WHEEL: { sprite: SHAPE.mouseM, c: { o: 'ink', x: 'sand', e: 'mist' } },
};
