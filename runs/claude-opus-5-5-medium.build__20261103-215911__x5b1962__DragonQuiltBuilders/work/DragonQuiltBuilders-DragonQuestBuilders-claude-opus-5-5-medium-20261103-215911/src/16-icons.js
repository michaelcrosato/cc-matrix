// Item icons: block cubes from the atlas, objects from their shapes, and hand-made 10 x 10 sprites for the rest.
(() => {
const E = My3D2dge, DQ = globalThis.DQ;
const O = '#1a1020';   // outline
const ART = {
  pebble: [['..........', '..........', '...oooo...', '..oLLbbo..', '.oLbbbbdo.', '.obbbbddo.', '.obbbdddo.', '..odddoo..', '...ooo....', '..........'], { o: O, L: '#d8d4e0', b: '#9a96a0', d: '#6a6670' }],
  copperOre: [['..........', '...ooo....', '..occbo...', '.obcbbcoo.', '.obbcbbbco', '.ocbbbcbbo', '.obbcbbbo.', '..obbcbo..', '...oooo...', '..........'], { o: O, c: '#e88a4a', b: '#8c8c9a' }],
  coal: [['..........', '...oooo...', '..okkkko..', '.okKkkkko.', '.okkkkkko.', '.okkkKkko.', '..okkkko..', '...oooo...', '..........', '..........'], { o: O, k: '#2a2630', K: '#5a5260' }],
  branch: [['..........', '........o.', '.......obo', '......obo.', '..o..obo..', '.obooobo..', '..obbbo...', '...obo....', '..obo.....', '..oo......'], { o: O, b: '#9a6a3a' }],
  straw: [['..........', '..y.y.y...', '..y.y.y.y.', '.yy.y.y.y.', '..yyyyyy..', '..ooooooo.', '..yyyyyy..', '..y.y.yy..', '.y..y..y..', '..........'], { o: '#a07020', y: '#e8c050' }],
  grain: [['..........', '....g.....', '...ggg....', '....g.g...', '...ggggg..', '....g.g...', '...ggg....', '....s.....', '....s.....', '..........'], { g: '#d8b850', s: '#8a9a40' }],
  cotton: [['..........', '...oooo...', '..owwwwo..', '.owwWwwwo.', '.owwwwwwo.', '.owwwwWwo.', '..owwwwo..', '...ogo....', '....g.....', '..........'], { o: '#9a96a8', w: '#f4f0f8', W: '#ffffff', g: '#6a8a4a' }],
  thread: [['..........', '...oooo...', '..otttto..', '..oTttto..', '..otttto..', '..oTttto..', '..otttto..', '...oooo..t', '........t.', '.........t'], { o: '#8a5a32', t: '#f1e6c8', T: '#c8b890' }],
  lint: [['..........', '..o.o.o...', '.ollllll..', 'olllLllllo', '.lllllllo.', 'ollllLllo.', '.olllllo..', '..o.o.o...', '..........', '..........'], { o: '#9a94a8', l: '#cfcad6', L: '#f0eef4' }],
  mothDust: [['..........', '....y.....', '..y...y...', '....Y.....', '.y.YYY.y..', '....Y.....', '..y...y...', '....y.....', '..........', '..........'], { y: '#c8a0ff', Y: '#fff0b0' }],
  pins: [['..........', '.r....b...', '.o....o...', '.o..y.o...', '.o..o.o...', '.o..o.o...', '.o..o.o...', '....o.....', '..........', '..........'], { r: '#e84a4a', b: '#4a8ae8', y: '#e8d04a', o: '#c8c8d8' }],
  steelThread: [['..........', '...oooo...', '..osssso..', '..oSssso..', '..osssso..', '..oSssso..', '..osssso..', '...oooo.s.', '.......s..', '......s...'], { o: '#4a4a5a', s: '#d8dce8', S: '#9aa0b0' }],
  blackYarn: [['..........', '...oooo...', '..okKkko..', '.okkKkkko.', '.oKkkkKko.', '.okkKkkko.', '..okkkKo..', '...ooook..', '........k.', '..........'], { o: '#0a0410', k: '#2a1a3a', K: '#6a4a8a' }],
  frayedScrap: [['..........', '.o.o......', 'opppo.o...', '.opPpppo..', '..oppppPo.', '.opPpppo..', 'oppppo.o..', '.o.oo.....', '..........', '..........'], { o: '#2a1a2a', p: '#5a3a5a', P: '#8a6a8a' }],
  copperIngot: [['..........', '..........', '...oooooo.', '..oLccccco', '.oLccccco.', 'occccccdo.', 'oddddddo..', '.ooooooo..', '..........', '..........'], { o: '#4a2a1a', L: '#ffc890', c: '#e88a4a', d: '#a85a2a' }],
  dyeRed: [['..........', '....oo....', '....ww....', '...owwo...', '..orrrro..', '..orRrro..', '..orrrro..', '..orrrro..', '...oooo...', '..........'], { o: O, w: '#e8e0d0', r: '#d04a4a', R: '#ff8a8a' }],
  dyeBlue: [['..........', '....oo....', '....ww....', '...owwo...', '..orrrro..', '..orRrro..', '..orrrro..', '..orrrro..', '...oooo...', '..........'], { o: O, w: '#e8e0d0', r: '#4a6ad0', R: '#8aa8ff' }],
  dyeYellow: [['..........', '....oo....', '....ww....', '...owwo...', '..orrrro..', '..orRrro..', '..orrrro..', '..orrrro..', '...oooo...', '..........'], { o: O, w: '#e8e0d0', r: '#e8c040', R: '#fff0a0' }],
  bluebell: [['..........', '...bb.....', '..bBbb....', '..bbbb.bb.', '...b.bBbb.', '...g..bb..', '...g..g...', '....gg....', '....g.....', '..........'], { b: '#5a7ae0', B: '#9ab0ff', g: '#5a9a4a' }],
  buttercup: [['..........', '...yyy....', '..yYyyy...', '..yyoyy...', '..yyyyy...', '...yyy....', '....g.....', '...gg.....', '....g.....', '..........'], { y: '#f0d030', Y: '#fff8a0', o: '#e8a020', g: '#5a9a4a' }],
  thimbleberry: [['..........', '....gg....', '...oggo...', '..orrrro..', '.orRrrrro.', '.orrrrdro.', '.orrrrrro.', '..orrrro..', '...oooo...', '..........'], { o: '#5a1020', r: '#d83a5a', R: '#ff9ab0', d: '#a02040', g: '#5a9a4a' }],
  puffball: [['..........', '..........', '...oooo...', '..opPpppo.', '.oppppppo.', '.oppppppo.', '..ossssoo.', '...osso...', '...oooo...', '..........'], { o: '#7a6a5a', p: '#e8dcc8', P: '#ffffff', s: '#c8b898' }],
  roastPuffball: [['..........', '..........', '...oooo...', '..obBbbbo.', '.obbbbbbo.', '.obbdbbbo.', '..ossssoo.', '...osso...', '...oooo...', '.s.s.s....'], { o: '#4a2a1a', b: '#b07a4a', B: '#e8b080', d: '#7a4a2a', s: '#c8c8c8' }],
  bun: [['..........', '..........', '...oooo...', '..obbrbbo.', '.obrbbbrbo', '.obbbbbbbo', '.oddddddo.', '..oooooo..', '..........', '..........'], { o: '#5a3020', b: '#e0a060', r: '#d83a5a', d: '#b07040' }],
  stew: [['..........', '....s.s...', '...s.s....', '.oooooooo.', '.obrgbrbo.', '.oddddddo.', '..oddddo..', '...oooo...', '..........', '..........'], { o: '#3a2a20', b: '#c87a3a', r: '#d83a5a', g: '#6aa04a', d: '#8a8a9a', s: '#e8e8f0' }],
  pie: [['..........', '..........', '..oooooo..', '.obcbcbcbo', 'obcbcbcbco', 'orrrrrrrro', 'odddddddo.', '.oooooooo.', '..........', '..........'], { o: '#4a2a10', b: '#e8b060', c: '#c88a40', r: '#d83a5a', d: '#a8a8b8' }],
  darningStick: [['..........', '.........o', '........ow', '.......ob.', '......ob..', '.....ob...', '....ob....', '...ob.....', '..ob......', '..o.......'], { o: '#4a2a10', b: '#c89a62', w: '#f1e6c8' }],
  cobbleClub: [['......ooo.', '.....oSssO', '.....osssO', '......oso.', '.....ob...', '....ob....', '...ob.....', '..ob......', '.ob.......', '.o........'], { o: '#2a2a3a', O: '#2a2a3a', S: '#d8d8e0', s: '#9a96a0', b: '#a07040' }],
  copperBodkin: [['........oo', '.......owo', '......owco', '.....owco.', '....owco..', '.o.owco...', '..oyco....', '..oyo.....', '.oo.o.....', 'oo........'], { o: '#3a1a10', w: '#ffd0a0', c: '#e88a4a', y: '#e8c040' }],
  seamRipper: [['.......w..', '......ww.w', '......wpw.', '.....owp..', '....oyo...', '...oyo....', '..oyo.....', '.oyo......', '.oo.......', '..........'], { o: '#3a2a10', y: '#e8c040', w: '#e8e8f0', p: '#ff5a8a' }],
  quiltedVest: [['..........', '..oo..oo..', '.orbo.obro', '.obrbobrbo', '.orbrbrbro', '.obrbrbrbo', '.orbrbrbro', '.obrbrbrbo', '.oooooooo.', '..........'], { o: O, r: '#d04a4a', b: '#4a6ad0' }],
  copperBuckler: [['..........', '...oooo...', '..occcco..', '.occLccco.', '.ocLccccdo', '.occcccdo.', '..occcdo..', '...oddo...', '....oo....', '..........'], { o: '#3a1a10', c: '#e88a4a', L: '#ffd0a0', d: '#a85a2a' }],
  heartpatch: [['..........', '..oo..oo..', '.orroorrro', 'orrLrrrrro', 'orrrrrrrro', '.orrrrrro.', '..orrrro..', '...orro...', '....oo....', '..........'], { o: '#5a1020', r: '#e84a6a', L: '#ffb0c0' }],
  banner: [['..yo......', '..bo......', '..boooooo.', '..borrrro.', '..bowwwwo.', '..bobbbbo.', '..booooo..', '..b.......', '..b.......', '..b.......'], { o: '#2a1a10', y: '#ffd84a', b: '#8a5a32', r: '#d04a4a', w: '#f1e6c8' }],
  hallPattern: [['..........', '.oooooooo.', '.owwwwwwo.', '.owbwwbwo.', '.owbbbbwo.', '.owbwwbwo.', '.owbbbbwo.', '.owwwwwwo.', '.oooooooo.', '..........'], { o: '#5a3a1a', w: '#f1e6c8', b: '#4a6ad0' }],
  goldenNeedle: [['.........y', '........yY', '.......yY.', '......yY..', '.....yY...', '....yY....', '...yY.....', '..oy......', '.o.o......', 'o.........'], { o: '#f1e6c8', y: '#e8b830', Y: '#fff0a0' }],
  goldenThread: [['..........', '..yy......', '.y..y..yy.', '.y...yy..y', '..y..y...y', '...yy.y.y.', '......yy..', '..........', '..........', '..........'], { y: '#ffd84a' }],
  ancientButton: [['..........', '...oooo...', '..oyyyyo..', '.oyYyyyyo.', '.oydyydyo.', '.oyyyyyyo.', '.oydyydyo.', '..oyyyyo..', '...oooo...', '..........'], { o: '#6a4a10', y: '#e8b830', Y: '#fff0a0', d: '#8a6a20' }],
  goldenThimble: [['..........', '...oooo...', '..oyydyo..', '..oydyyo..', '..oyydyo..', '.oydyydyo.', '.oyyyyyyo.', '.oooooooo.', '..........', '..........'], { o: '#6a4a10', y: '#e8b830', d: '#b08820' }]
};
const _c = new Map();
DQ.Icons = {
  ART,
  // an item's icon as a canvas, about `size` pixels (null when headless)
  get(id, size = 16) {
    if (typeof document === 'undefined') return null;
    const key = id + ':' + size; let c = _c.get(key); if (c !== undefined) return c;
    const it = DQ.ITEMS[id]; c = null;
    if (it && it.block) { const bid = DQ.blockId(it.block); c = DQ.Icons.cube(bid, size); }
    else if (it && it.obj) {
      const def = DQ.OBJECTS[it.obj];
      if (def.shape) { try { const spr = E.shapeSprite(def.shape, { view: 'iso', facing: Math.PI / 2 }); c = DQ.Icons.fit(spr.cv || spr.canvas || spr, size); } catch (e) { c = null; } }
      if (!c) c = DQ.Icons.special(it.obj, size);
    } else if (ART[id]) { const [rows, pal] = ART[id], spr = E.sprite(rows, pal, Math.max(1, Math.round(size / 10))); c = DQ.Icons.fit(spr.cv || spr.canvas || spr, size); }
    _c.set(key, c); return c;
  },
  fit(src, size) {
    if (!src || !src.width) return null;
    const k = Math.min(size / src.width, size / src.height), s = k >= 1 ? Math.floor(k) : k, w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    const c = E.mkCanvas(size, size), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h); return c;
  },
  cube(bid, size) {
    const A = new DQ.Atlas(new E.View('icon', 'icon', 45, 30, Math.SQRT2 * size / 32, DQ.VIEW_ISO.zBoost)), c = E.mkCanvas(size, size), g = c.getContext('2d');
    const f0 = A.at(0, 0, 0), wx = A.at(1, 1, 0), base = [Math.round(size / 2 - (wx[0]) / 2), Math.round(size - 1 - (A.at(1, 1, 0)[1]))];
    for (const f of [1, 3, 0, 2, 4]) { if (!A.faces[f]) continue; const s = A.face(bid, 0, f); if (s) g.drawImage(s.cv, base[0] + s.x, base[1] + s.y); }
    return c;
  },
  // doors and ballistas have no shape: small drawn icons
  special(obj, size) {
    const c = E.mkCanvas(size, size), g = c.getContext('2d'), p = E.px, k = size / 16;
    if (obj === 'latticeDoor' || obj === 'plankDoor') {
      p.rect(g, 4 * k, 1 * k, 8 * k, 14 * k, '#3a2414'); p.rect(g, 5 * k, 2 * k, 6 * k, 12 * k, obj === 'plankDoor' ? '#b07a48' : '#8a6a42');
      if (obj === 'plankDoor') { E.font.text(g, '♥', Math.round(6 * k), Math.round(5 * k), '#d04a4a', false); } else for (let i = 0; i < 3; i++) p.line(g, 5 * k, (3 + i * 4) * k, 10 * k, (6 + i * 4) * k, '#c89a62');
    } else if (obj === 'ballista') {
      p.rect(g, 3 * k, 9 * k, 10 * k, 5 * k, '#6a4a2a'); p.line(g, 2 * k, 8 * k, 14 * k, 5 * k, '#a07040', 2); p.line(g, 4 * k, 3 * k, 4 * k, 12 * k, '#3a2414', 1); p.disc(g, 12 * k, 6 * k, 2 * k, '#c8443a');
    } else { p.disc(g, 8 * k, 8 * k, 5 * k, '#8a8aa0'); }
    return c;
  }
};
})();
