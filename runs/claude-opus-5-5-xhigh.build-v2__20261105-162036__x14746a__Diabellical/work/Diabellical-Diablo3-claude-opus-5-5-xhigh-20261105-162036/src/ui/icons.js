// 12x12 icons. Library ones come through hudSprite; these are the game's own.
import { hudSprite, TEXTURE_LIBRARY } from '../../pixel-engine.js';

const P = { a: 'ink', b: 'night', c: 'slate', d: 'mist', e: 'white', f: 'sand', g: 'orange', h: 'red', i: 'plum', j: 'lime', k: 'green', l: 'teal', m: 'navy', n: 'blue', o: 'sky', p: 'cyan' };

const OWN = {
  sk_clout: ['............', '....ggg.....', '...gffgg....', '...gffgg....', '..ggggggg...', '..gffffgg...', '.ggggggggg..', '.....c......', '.....c......', '.....c......', '.....c......', '............'],
  sk_toll: ['.....gg.....', '....ggff....', '...ggfff....', '...ggfff....', '..gggffff...', '.ggggffff...', 'ggggggfffgg.', '.....gg.....', 'f..........f', '.f........f.', '..ffffffff..', '............'],
  sk_wave: ['............', 'f...f...f...', '.f...f...f..', '..f...f...f.', '...f...f...f', '...f...f...f', '..f...f...f.', '.f...f...f..', 'f...f...f...', '............', '............', '............'],
  sk_peal: ['.....ee.....', '...e....e...', '.e...gg...e.', '....gggg....', 'e..gggggg..e', 'e..ffffff..e', '....gggg....', '.e...gg...e.', '...e....e...', '.....ee.....', '............', '............'],
  sk_spark: ['............', '.........fe.', '........gfe.', '.......gfg..', '......gfg...', '.....hgg....', '....hgg.....', '...hh.......', '..h.........', '............', '............', '............'],
  sk_flare: ['.....e.....', '.e...f...e.', '..e..f..e..', '...efefe...', '....efe....', 'eeffeeeffee', '....efe....', '...efefe...', '..e..f..e..', '.e...f...e.', '.....e.....', '...........'],
  sk_dusk: ['............', '..i....i....', '...i..ii....', '....iii..g..', '...iii..gfg.', '..iii..gfg..', '.ii....gg...', 'i.........g.', '......g.....', '...g........', '............', '............'],
  sk_snuff: ['............', '....c.......', '...ccc......', '..ccccc.....', '.ccccccc....', '....c.......', '....c..gg...', '....c.gffg..', '....c..gg...', '....c..bb...', '....c.......', '............'],
  sk_beacon: ['.....ee.....', '.....ff.....', '.....ff.....', '....gffg....', '....gffg....', '...ggffgg...', '...ggffgg...', '..gghffhgg..', '..gghffhgg..', '.gghhhhhhgg.', '.cccccccccc.', '............'],
  sk_comet: ['..........e.', '.........ef.', '........efg.', '.......efg..', '......efg...', '.....ffg....', '...ffgg.....', '..fffgh.....', '.ffffgh.....', '.fffgh......', '..ggh.......', '............'],
  sk_shovel: ['.........cc.', '........cdc.', '.......cdd..', '......cdc...', '.....gg.....', '....gg......', '...gg.......', '..gg........', '.gg.........', 'gg..........', '............', '............'],
  sk_bone: ['..ee........', '.eeee.......', '.eeee.......', '..eee.......', '...eee......', '....eee.....', '.....eee....', '......eee...', '.......eeee.', '.......eeee.', '........ee..', '............'],
  sk_exhume: ['....jjjj....', '...jjjjjj...', '..jj.ee.jj..', '..j.eeee.j..', '...eaeeae...', '...eeeeee...', '....eaae....', '.c..eeee..c.', '.cc......cc.', 'ccccccccccc.', 'ccccccccccc.', '............'],
  sk_coffin: ['....iiii....', '...iiiiii...', '..iiffiiii..', '..iiffffii..', '..iiffiiii..', '..iiffiiii..', '..iiiiiiii..', '...iiiiii...', '...iiiiii...', '....iiii....', '............', '............'],
  sk_grave: ['............', '....cccc....', '...cddddc...', '...cdccdc...', '...cddddc...', '...cdccdc...', '...cddddc...', '..bbbbbbbb..', '.bbbbbbbbbb.', 'bbbbbbbbbbbb', '............', '............'],
  sk_danse: ['..e.....e...', '.eee...eee..', '..e..e..e...', '.e.e.e.e.e..', 'e..e.e.e..e.', '...e.e.e....', '..e.ee.e.e..', '.e...e...e..', 'e....e....e.', '............', '............', '............'],
  it_head: ['............', '...cccccc...', '..cddddddc..', '.cddddddddc.', '.cdbbbbbbdc.', '.cdbbbbbbdc.', '.cddddddddc.', '..cddddddc..', '...cddddc...', '............', '............', '............'],
  it_shoulders: ['............', '.cccc..cccc.', 'cddddcdddddc', 'cddddcdddddc', '.ccc.cc.ccc.', '.....cc.....', '.....cc.....', '............', '............', '............', '............', '............'],
  it_chest: ['..cc....cc..', '.cdddccdddc.', '.cdddddddddc', '.ccddddddcc.', '..cddddddc..', '..cddddddc..', '..cddddddc..', '..cddddddc..', '..cddddddc..', '...cccccc...', '............', '............'],
  it_hands: ['...c.c.c....', '..cdcdcdc...', '..cdcdcdc...', '..cdcdcdcc..', '..cdddddcdc.', '..cdddddddc.', '..cddddddc..', '...cddddc...', '...cccccc...', '............', '............', '............'],
  it_legs: ['..cccccccc..', '..cddddddc..', '..cddddddc..', '..cddccddc..', '..cddccddc..', '..cddccddc..', '..cddccddc..', '..cddccddc..', '..cccccccc..', '............', '............', '............'],
  it_feet: ['............', '..ccc...ccc.', '..cdc...cdc.', '..cdc...cdc.', '..cdc...cdc.', '..cdc...cdc.', '.ccdc..ccdc.', 'cdddc.cdddc.', 'ccccc.ccccc.', '............', '............', '............'],
  it_amulet: ['..c......c..', '...c....c...', '....c..c....', '.....cc.....', '.....ff.....', '....ffff....', '...fgggf....', '....ffff....', '.....ff.....', '............', '............', '............'],
  it_ring: ['............', '.....jj.....', '....jeej....', '...ccjjcc...', '..cc....cc..', '..c......c..', '..c......c..', '..cc....cc..', '...cccccc...', '............', '............', '............'],
  it_main: ['.....gg.....', '....gffg....', '...ggffgg...', '...ggffgg...', '..gggggggg..', '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....', '............', '............'],
  it_staff: ['.......gfg..', '......gffg..', '.......gg...', '......cc....', '.....cc.....', '.....cc.....', '....cc......', '....cc......', '...cc.......', '...cc.......', '..cc........', '............'],
  it_spade: ['.........dd.', '........ddd.', '.......ddd..', '......gdd...', '.....gg.....', '....gg......', '...gg.......', '..gg........', '.gg.........', '............', '............', '............'],
  it_off: ['..cccccccc..', '.cddddddddc.', '.cddffffddc.', '.cddffffddc.', '.cddffffddc.', '.cddffffddc.', '..cddffddc..', '...cddddc...', '....cddc....', '.....cc.....', '............', '............'],
  it_lantern: ['.....cc.....', '....c..c....', '...cccccc...', '...cggggc...', '...cgffgc...', '...cgffgc...', '...cggggc...', '...cccccc...', '............', '............', '............', '............'],
  gem_ember: ['............', '....hhhh....', '...hgfgghh..', '..hggfggghh.', '..hgggggghh.', '...hgggghh..', '....hgghh...', '.....hhh....', '............', '............', '............', '............'],
  gem_salt: ['............', '....dddd....', '...deeeddd..', '..deeeddddd.', '..ddddddddd.', '...ddddddd..', '....ddddd...', '.....ddd....', '............', '............', '............', '............'],
  gem_amber: ['............', '....ffff....', '...feefggf..', '..feeffgggf.', '..fffffgggf.', '...ffffggf..', '....fffgf...', '.....fff....', '............', '............', '............', '............'],
  mat_scrap: ['............', '....cc......', '...cddc.cc..', '...cddccdc..', '..ccdddddc..', '.cddddddc...', '.cddcdddc...', '..cc.ccc....', '............', '............', '............', '............'],
  mat_dust: ['............', '............', '.....f......', '...f.f.f....', '.....f..f...', '..f.f.f.....', '....fff.f...', '..f.fffff...', '.fffffffff..', '............', '............', '............'],
  mat_shards: ['.....g......', '....gf......', '....gff.....', '...gfff.g...', '...gfff.gf..', '..gffff.gf..', '..gggg..gg..', '............', '............', '............', '............', '............'],
  key: ['............', '...ggg......', '..g...g.....', '..g...ggggg.', '..g...g.f.f.', '...ggg......', '............', '............', '............', '............', '............', '............'],
};

const cache = new Map();
export function icon(id) {
  let c = cache.get(id);
  if (c) return c;
  if (OWN[id]) c = { rows: OWN[id].map((r) => r.padEnd(12, '.')), colors: P };
  else if (TEXTURE_LIBRARY.has(id)) c = hudSprite(id);
  else c = { rows: OWN.mat_scrap, colors: P };
  cache.set(id, c);
  return c;
}
export const OWN_ICONS = Object.keys(OWN);
export const slotIcon = (slot) => `it_${slot}`;
export const itemIcon = (it) => it.icon ?? slotIcon(it.slot);
export const gemIcon = (gemId) => `gem_${gemId.slice(0, -1)}`;
