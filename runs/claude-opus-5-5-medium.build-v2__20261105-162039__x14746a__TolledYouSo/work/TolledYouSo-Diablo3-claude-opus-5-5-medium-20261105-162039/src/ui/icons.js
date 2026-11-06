// Our own 12x12 icons: skills the library lacks, item slots recoloured by rarity, gems, and the candle flame.
const S = (rows, colors) => ({ rows, colors });
export const ICONS = {
  i_bell: S(['.....oo.....', '....oooo....', '....oyyo....', '...oyyyyo...', '...oyyyyo...', '...oyyyyo...', '..oyyyyyyo..', '..oyyyyyyo..', '.oyyyyyyyyo.', 'oooooooooooo', '.....ww.....', '.....ww.....'], { o: 'orange', y: 'sand', w: 'white' }),
  i_toll: S(['r....oo....r', '.r..oooo..r.', '....oyyo....', 'r..oyyyyo..r', '...oyyyyo...', '.r.oyyyyo.r.', '..oyyyyyyo..', '..oyyyyyyo..', '.oyyyyyyyyo.', 'oooooooooooo', 'r....ww....r', '.....ww.....'], { o: 'orange', y: 'sand', w: 'white', r: 'white' }),
  i_shovel: S(['.........ww.', '........www.', '.......www..', '......ww....', '.....ww.....', '....ww......', '...oo.......', '..ssss......', '.ssssss.....', '.ssssss.....', '.ssss.......', '..ss........'], { w: 'orange', o: 'orange', s: 'mist' }),
  i_bone: S(['.ww......ww.', 'wwww....wwww', 'wwwww..wwwww', '.wwww.wwwww.', '..wwwwwwww..', '...wwwwww...', '...wwwwww...', '..wwwwwwww..', '.wwwww.wwww.', 'wwwww..wwwww', 'wwww....wwww', '.ww......ww.'], { w: 'white' }),
  i_coffin: S(['...pppppp...', '..pppppppp..', '.pppyyppppp.', '.pppyyppppp.', '.pyyyyyyppp.', '.pyyyyyyppp.', '.pppyyppppp.', '.pppyyppppp.', '..pppppppp..', '..pppppppp..', '...pppppp...', '....pppp....'], { p: 'plum', y: 'sand' }),
  slot_head: S(['....wwww....', '..wwwwwwww..', '.wwwwwwwwww.', '.wwwwwwwwww.', '.www.ww.www.', '.www.ww.www.', '.wwwwwwwwww.', '..wwwwwwww..', '..wwwwwwww..', '...ww..ww...', '............', '............'], { w: 'white' }),
  slot_shoulders: S(['............', '.wwww..wwww.', 'wwwwww.wwwww', 'wwwwww.wwwww', 'wwww....wwww', '.ww......ww.', '.ww......ww.', '.ww......ww.', '............', '............', '............', '............'], { w: 'white' }),
  slot_chest: S(['..ww....ww..', '.wwwwwwwwww.', 'wwwwwwwwwwww', 'wwwwwwwwwwww', 'ww.wwwwww.ww', '...wwwwww...', '...wwwwww...', '...wwwwww...', '...wwwwww...', '...wwwwww...', '............', '............'], { w: 'white' }),
  slot_hands: S(['..w.w.w.w...', '..w.w.w.w...', '..w.w.w.w...', '..w.w.w.w.w.', '..wwwwwwwww.', '..wwwwwwww..', '..wwwwwwww..', '..wwwwwww...', '...wwwwww...', '...wwwwww...', '............', '............'], { w: 'white' }),
  slot_legs: S(['..wwwwwwww..', '..wwwwwwww..', '..wwwwwwww..', '..www..www..', '..www..www..', '..www..www..', '..www..www..', '..www..www..', '..www..www..', '..www..www..', '............', '............'], { w: 'white' }),
  slot_feet: S(['............', '...www......', '...www......', '...www......', '...www......', '...www......', '...wwwwww...', '...wwwwwww..', '...wwwwwwww.', '...wwwwwwww.', '............', '............'], { w: 'white' }),
  slot_amulet: S(['.w........w.', '..w......w..', '...w....w...', '....w..w....', '.....ww.....', '....wwww....', '...wwwwww...', '...wwwwww...', '....wwww....', '............', '............', '............'], { w: 'white' }),
  slot_ring: S(['............', '....wwww....', '...wwwwww...', '............', '...wwwwww...', '..ww....ww..', '.ww......ww.', '.ww......ww.', '..ww....ww..', '...wwwwww...', '............', '............'], { w: 'white' }),
  slot_main: S(['..........ww', '.........www', '........www.', '.......www..', '......www...', '.....www....', '....www.....', '.w.www......', '.wwww.......', '..ww........', '.wwww.......', 'ww..........'], { w: 'white' }),
  slot_off: S(['.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '..wwwwwwww..', '..wwwwwwww..', '...wwwwww...', '....wwww....', '.....ww.....', '............'], { w: 'white' }),
  gem_ember: S(['............', '....oooo....', '...oyyyyo...', '..oyyooooo..', '..oyooooro..', '..ooooorro..', '...oorrro...', '....orro....', '.....oo.....', '............', '............', '............'], { o: 'orange', y: 'sand', r: 'red' }),
  gem_salt: S(['............', '.....ww.....', '....wwww....', '...wwmmww...', '..wwmmmmww..', '...wwmmww...', '....wwww....', '.....ww.....', '............', '............', '............', '............'], { w: 'white', m: 'mist' }),
  gem_amber: S(['............', '....yyyy....', '...yyyyyy...', '..yyooyyyy..', '..yoooyyyy..', '..yyooyyyy..', '...yyyyyy...', '....yyyy....', '............', '............', '............', '............'], { y: 'sand', o: 'orange' }),
};
for (const [k, v] of Object.entries(ICONS)) if (v.rows.some((r) => r.length !== 12)) throw new Error(`icon ${k}`);
export const recolor = (id, color) => { const s = ICONS[id]; const colors = {}; for (const k of Object.keys(s.colors)) colors[k] = color; return { rows: s.rows, colors }; };
