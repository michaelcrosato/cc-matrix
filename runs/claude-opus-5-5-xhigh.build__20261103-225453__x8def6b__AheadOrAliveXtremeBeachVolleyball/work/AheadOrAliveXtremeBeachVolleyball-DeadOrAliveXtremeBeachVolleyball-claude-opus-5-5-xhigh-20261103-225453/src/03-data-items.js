/* 03-data-items: swimsuits, accessories, gifts and the shops that sell them. Prices are Sonny Dollars (S$); "day" items
 * reach the shop on that day. Swimwear is athletic or fashion-forward. */
G.SUITS = {};
[
  ['seigaiha', 'Seigaiha', 'onepiece', 'waves', '#23306b', '#e8eef8', '#c8303a', 'classic elegant', 'sig', 0],
  ['estrella', 'Estrella', 'sport2', 'stars', '#c8202c', '#ffd04a', '#1a1a1a', 'bold sporty', 'sig', 0],
  ['fjord', 'Fjord', 'rash', 'solid', '#9fd8f0', '#1d3560', '#ffffff', 'sporty classic', 'sig', 0, { sleeves: 'short' }],
  ['kentepop', 'Kente Pop', 'tankini', 'geo', '#ff8a1e', '#2f9e4a', '#ffd36a', 'bold cute', 'sig', 0],
  ['reefbreak', 'Reef Break', 'racer', 'gradient', '#1fb7b0', '#ff7a5e', '#ffffff', 'sporty bold', 'sig', 0],
  ['peony', 'Peony', 'halter', 'floral', '#ffb2a0', '#e85a8a', '#ffffff', 'cute elegant', 'sig', 0],
  ['protour', 'Pro Tour', 'racer', 'pin', '#f4f6fa', '#d8283a', '#1a2a5a', 'sporty', 'riptide', 12000],
  ['sandstorm', 'Sandstorm', 'sport2', 'solid', '#e8c06a', '#1a1a1a', '#ffffff', 'sporty bold', 'riptide', 9000],
  ['lifeguard', 'Lifeguard', 'onepiece', 'solid', '#e0302a', '#ffd04a', '#ffffff', 'sporty classic', 'riptide', 8000],
  ['coralrash', 'Coral Rash', 'rash', 'stripes', '#ff7a5e', '#ffffff', '#2a3a5a', 'sporty', 'riptide', 14000, { sleeves: 'long' }],
  ['neonrush', 'Neon Rush', 'tankini', 'gradient', '#7cff5a', '#ff4fb8', '#1a1a1a', 'bold sporty', 'riptide', 16000, { day: 2 }],
  ['monaco', 'Monaco', 'halter', 'stripes', '#1d2f6a', '#ffffff', '#d8283a', 'classic elegant', 'coral', 22000],
  ['polkapop', 'Polka Pop', 'sport2', 'dots', '#e8283a', '#ffffff', '#ffd04a', 'cute', 'coral', 18000, { brief: true }],
  ['tropicana', 'Tropicana', 'sarong', 'palms', '#2f8f4e', '#ffe0a0', '#ff8a1e', 'elegant', 'coral', 26000],
  ['mermaid', 'Mermaid', 'onepiece', 'scales', '#1fb7b0', '#7a5fd8', '#e8f8ff', 'cute elegant', 'coral', 30000, { day: 3 }],
  ['sunsetblvd', 'Sunset Boulevard', 'tankini', 'gradient', '#ff9e5e', '#7a3fa0', '#ffd36a', 'bold elegant', 'coral', 28000],
  ['midnight', 'Midnight', 'onepiece', 'solid', '#16141c', '#ffd36a', '#ffd36a', 'elegant bold', 'coral', 35000, { day: 4 }],
  ['gingham', 'Gingham Picnic', 'tankini', 'check', '#6aa8e8', '#ffffff', '#e8283a', 'cute classic', 'coral', 15000],
  ['fortunagold', 'Fortuna Gold', 'racer', 'lame', '#ffd36a', '#fff3c0', '#1a1a1a', 'bold', 'final', 0],
  ['jackpot', 'Jackpot', 'sport2', 'sevens', '#1a1a2a', '#ffd36a', '#e8283a', 'bold cute', 'prize', 300],
  ['pinstripe', "Pepper's Pinstripe", 'racer', 'pin', '#121216', '#f4f4f4', '#ffd36a', 'classic elegant', 'pepper', 0]
].forEach(([id, name, cut, pattern, main, accent, trim, tastes, where, price, extra]) => {
  G.SUITS[id] = Object.assign({ id, name, cut, pattern, colors: { main, accent, trim }, tastes: tastes.split(' '), where, price, kind: 'suit' }, extra || {});
});
G.SUIT_IDS = Object.keys(G.SUITS);
G.CUT_NAMES = { onepiece: 'One-piece', racer: 'Racerback', halter: 'Halter', sport2: 'Sport two-piece', tankini: 'Tankini', rash: 'Rash guard', sarong: 'Sarong set' };

G.ACCS = {};
[
  ['ribbon', 'Ribbon', 'hair', 'A bow in your accent color', 'classic cute', 'coral', 2000],
  ['sweatband', 'Sweatband', 'head', 'Terry headband', 'sporty', 'riptide', 3000],
  ['sportshades', 'Sport Shades', 'face', 'Wraparound lenses', 'sporty', 'riptide', 6000, { shades: true }],
  ['heartshades', 'Heart Shades', 'face', 'Two pink hearts', 'cute bold', 'coral', 7500, { shades: true }],
  ['aviators', 'Gold Aviators', 'face', "Just like Sonny's", 'bold', 'coral', 15000, { shades: true, day: 3 }],
  ['visor', 'Sun Visor', 'head', 'White with a colored brim', 'sporty', 'riptide', 4000],
  ['sunhat', 'Straw Sun Hat', 'head', 'Wide straw brim, ribbon band', 'elegant classic', 'coral', 9000],
  ['hibiscus', 'Hibiscus', 'hair', 'A red flower behind the ear', 'cute elegant', 'sundries', 2500],
  ['shellnecklace', 'Shell Necklace', 'neck', 'White shell beads', 'cute classic', 'sundries', 4500],
  ['wristbands', 'Wristbands', 'wrists', 'A pair of terry bands', 'sporty', 'riptide', 3500]
].forEach(([id, name, anchor, about, tastes, where, price, extra]) => {
  G.ACCS[id] = Object.assign({ id, name, anchor, about, tastes: tastes.split(' '), where, price, kind: 'acc' }, extra || {});
});
G.ACC_IDS = Object.keys(G.ACCS);

G.GIFTS = {};
[
  ['food', 'sundries', [['mango_smoothie', 'Mango Smoothie', 800], ['bubble_tea', 'Bubble Tea', 900], ['matcha_icecream', 'Matcha Ice Cream', 700], ['mochi_box', 'Mochi Box', 1500],
    ['bbq_skewers', 'BBQ Skewers', 1200], ['hot_sauce', 'Hot Sauce Sampler', 2000], ['iced_coffee', 'Iced Coffee', 600], ['coconut', 'Fresh Coconut', 400]]],
  ['goods', 'sundries', [['plush_seal', 'Plush Seal', 3000], ['snow_globe', 'Snow Globe', 2500], ['puzzle_cube', 'Puzzle Cube', 2200], ['portable_speaker', 'Portable Speaker', 9000],
    ['matcha_kit', 'Matcha Kit', 4500], ['calligraphy_set', 'Calligraphy Set', 6000], ['knitting_kit', 'Knitting Kit', 2800], ['maracas', 'Maracas', 1400], ['luchador_mask', 'Luchador Mask', 5000, 2]]],
  ['books', 'sundries', [['beach_paperback', 'Beach Paperback', 1200], ['fashion_mag', 'Fashion Magazine', 800]]],
  ['sports', 'riptide', [['energy_drink', 'Energy Drink', 500], ['surf_wax', 'Surf Wax Deluxe', 1600], ['sunscreen', 'Sunscreen SPF 100', 1000], ['foam_finger', 'Foam Finger', 900]]],
  ['fashion', 'coral', [['glitter_sandals', 'Glitter Sandals', 5500], ['gold_hoops', 'Gold Hoop Earrings', 12000]]]
].forEach(([cat, where, list]) => list.forEach(([id, name, price, day]) => { G.GIFTS[id] = { id, name, price, cat, where, kind: 'gift', day: day || 1 }; }));
G.GIFT_IDS = Object.keys(G.GIFTS);
G.GIFT_CATS = ['food', 'goods', 'books', 'sports', 'fashion'];
G.CAT_NAMES = { food: 'Food & Drink', goods: 'Goods', books: 'Books', sports: 'Sports', fashion: 'Fashion' };

/* gift icons, 12x12 pixel art, one per gift */
const GI = (rows, pal) => E.sprite(rows, pal);
G.GIFT_ICONS = {
  mango_smoothie: GI(['.....kk.....', '.....k......', '...wwwwww...', '...woooow...', '...wooOow...', '...woooow...', '....wooo....', '....wooo....', '....wwww....', '.....ww.....', '....wwww....', '............'], { k: '#e8508a', w: '#e8f4f8', o: '#ffb83a', O: '#ffe08a' }),
  bubble_tea: GI(['.....k......', '.....k......', '...wwwwww...', '...wbbbbw...', '...wbbbbw...', '...wbbbbw...', '...wbbbbw...', '...wdbdbw...', '...wbdbdw...', '....wwww....', '............', '............'], { k: '#ff5f7a', w: '#e8f4f8', b: '#d8b088', d: '#3a2418' }),
  matcha_icecream: GI(['....gggg....', '...gGggggg..', '...gggggGg..', '....gggg....', '....yyyy....', '....yYyy....', '.....yy.....', '.....yy.....', '.....y......', '............', '............', '............'], { g: '#8ac85a', G: '#c8f0a0', y: '#e8b060', Y: '#f8d898' }),
  mochi_box: GI(['............', '.bbbbbbbbbb.', '.b.pp.ww.gb.', '.bpPpwWwggb.', '.b.pp.ww.gb.', '.bbbbbbbbbb.', '.BBBBBBBBBB.', '............', '............', '............', '............', '............'], { b: '#c85a3a', B: '#8a3a2a', p: '#ffb2c8', P: '#ffe0e8', w: '#f8f6f0', W: '#ffffff', g: '#a8d880' }),
  bbq_skewers: GI(['...........k', '..........k.', '...rrbbk.k..', '..rRrbbkk...', '...rrbbk....', '.....kk.....', '....k.......', '...k........', '..k.........', '.k..........', '............', '............'], { r: '#c8402a', R: '#ff8a5a', b: '#8a5a2a', k: '#c8a070' }),
  hot_sauce: GI(['.....kk.....', '.....kk.....', '....rrrr....', '....rRrr....', '...rrrrrr...', '...ryyyyr...', '...ryRRyr...', '...ryyyyr...', '...rrrrrr...', '...rrrrrr...', '....rrrr....', '............'], { k: '#2a2a2a', r: '#d8202a', R: '#ff6a5a', y: '#ffd04a' }),
  iced_coffee: GI(['......k.....', '......k.....', '...wwwwww...', '...wcccw....', '...wcwwcw...', '...wcccw....', '...wccccw...', '...wccccw...', '....wwww....', '............', '............', '............'], { k: '#3a3a3a', w: '#d8eef4', c: '#8a5a3a' }),
  coconut: GI(['......k.....', '.....k......', '...bbbbbb...', '..bBbbbbbb..', '..bbbwbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '............', '............', '............'], { k: '#ff5f7a', b: '#6a4428', B: '#9a6a48', w: '#f8f0e0' }),
  plush_seal: GI(['............', '...wwwww....', '..wwwwwww...', '..wkwwkww...', '..wwwpwww...', '.wwwwwwwww..', 'wwwwwwwwwww.', 'wwwwwwwwwwww', '.wwwwwwwww.w', '..ww...ww...', '............', '............'], { w: '#e8eef4', k: '#141018', p: '#ff9aa8' }),
  snow_globe: GI(['....bbbb....', '...bwbbbb...', '..bbbwbwbb..', '..bwbgggbb..', '..bbgggggb..', '..bwbgbbwb..', '...bbbbbb...', '....bbbb....', '...yyyyyy...', '..yYyyyyyy..', '............', '............'], { b: '#9fd8f0', w: '#ffffff', g: '#3a8a4a', y: '#c8902a', Y: '#ffd36a' }),
  puzzle_cube: GI(['............', '..rrryyybbb.', '..rrryyybbb.', '..gggwwwooo.', '..gggwwwooo.', '..bbbrrryyy.', '..bbbrrryyy.', '............', '............', '............', '............', '............'], { r: '#e8283a', y: '#ffd04a', b: '#3a6ad8', g: '#3aa04a', w: '#f4f4f4', o: '#ff8a1e' }),
  portable_speaker: GI(['............', '.kkkkkkkkkk.', '.kggkkkkggk.', '.kgGgkkgGgk.', '.kggkkkkggk.', '.kkkkrrkkkk.', '.kkkkkkkkkk.', '............', '............', '............', '............', '............'], { k: '#2a2434', g: '#5a5678', G: '#9a94b8', r: '#ff5f7a' }),
  matcha_kit: GI(['............', '....gggg....', '...gGGGGg...', '..gggggggg..', '..gwwwwwwg..', '..gwwwwwwg..', '...gwwwwg...', '....gggg....', '...b....b...', '..bbbbbbbb..', '............', '............'], { g: '#3a5a3a', G: '#8ac85a', w: '#e8e0c8', b: '#a87a48' }),
  calligraphy_set: GI(['.........k..', '........kk..', '.......kk...', '......kk....', '.....bb.....', '....bb......', '..rrrrrrrr..', '..rwwwwwwr..', '..rwkwkwwr..', '..rrrrrrrr..', '............', '............'], { k: '#2a1a10', b: '#c8a070', r: '#c8302a', w: '#f8f0e0' }),
  knitting_kit: GI(['..k......k..', '...k....k...', '....k..k....', '...ppppp....', '..pPppppp...', '..pppPppp...', '..ppppppp...', '...ppppp....', '....ppp.....', '............', '............', '............'], { k: '#c8c4d8', p: '#e8508a', P: '#ff9ac8' }),
  maracas: GI(['..oo....yy..', '.oOoo..yYyy.', '.oooo..yyyy.', '..oo....yy..', '...k....k...', '...k....k...', '....k..k....', '....k..k....', '............', '............', '............', '............'], { o: '#ff8a1e', O: '#ffd08a', y: '#ffd04a', Y: '#fff0a0', k: '#8a5a2a' }),
  luchador_mask: GI(['...rrrrrr...', '..rrrrrrrr..', '.rryyrryyrr.', '.rywwyywwyr.', '.rywkyywkyr.', '.rryyrryyrr.', '.rrrryyrrrr.', '..rrrkkrrr..', '...rrrrrr...', '............', '............', '............'], { r: '#d8302a', y: '#ffd04a', w: '#ffffff', k: '#141018' }),
  beach_paperback: GI(['............', '.bbbbbbbb...', '.byyyyyyb...', '.bysssssbw..', '.bysoosbw...', '.byyyyyybw..', '.bkkkkkkbw..', '.bbbbbbbbw..', '..wwwwwwww..', '............', '............', '............'], { b: '#2ec4c9', y: '#ffd36a', s: '#ff9e5e', o: '#ff5f7a', k: '#2a2434', w: '#f8f0e0' }),
  fashion_mag: GI(['............', '.pppppppp...', '.pwwwwwwp...', '.pwkkwwwp...', '.pwkkwwwp...', '.pwwwpppp...', '.pyyyyyyp...', '.pppppppp...', '............', '............', '............', '............'], { p: '#ff5fa2', w: '#f8f0e0', k: '#7a5a48', y: '#ffd36a' }),
  energy_drink: GI(['....kkkk....', '....gggg....', '...gggggg...', '...gyyyyg...', '...gyGGyg...', '...gyyyyg...', '...gggggg...', '...gggggg...', '....kkkk....', '............', '............', '............'], { k: '#c8c4d8', g: '#3aa04a', G: '#9ff3a8', y: '#ffd04a' }),
  surf_wax: GI(['............', '...wwwwww...', '..wbbbbbbw..', '..wbBBBbbw..', '..wbbbbbbw..', '..wwwwwwww..', '...kkkkkk...', '............', '............', '............', '............', '............'], { w: '#f8f0e0', b: '#2ec4c9', B: '#9ff3e8', k: '#8a7a68' }),
  sunscreen: GI(['.....kk.....', '....wwww....', '....wwww....', '...oooooo...', '...owwwwo...', '...owyywo...', '...owyywo...', '...owwwwo...', '...oooooo...', '............', '............', '............'], { k: '#3a3a3a', w: '#f8f8f8', o: '#ff8a1e', y: '#ffd04a' }),
  foam_finger: GI(['.....bb.....', '.....bb.....', '.....bb.....', '...bbbbbb...', '..bbBBBbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '....kkkk....', '............', '............'], { b: '#3a6ad8', B: '#9fc0ff', k: '#ffd04a' }),
  glitter_sandals: GI(['............', '............', '..p.....p...', '.pyp...pyp..', '.wwwww.wwwww', 'wwWwwwwwWwww', '.wwwww.wwwww', '............', '............', '............', '............', '............'], { p: '#ff5fa2', y: '#ffd36a', w: '#f0c8e8', W: '#ffffff' }),
  gold_hoops: GI(['............', '..y......y..', '..y......y..', '.yYy....yYy.', 'y...y..y...y', 'y...y..y...y', 'y...y..y...y', '.yyy....yyy.', '............', '............', '............', '............'], { y: '#e8a020', Y: '#fff6c0' })
};

/* ---- the shops (all on the Fortuna Promenade) ---- */
G.SHOPS = {
  riptide: { id: 'riptide', name: 'Riptide Sports', keeper: 'bo', color: '#3a6ad8', sign: '#ffd04a', tabs: ['Swimsuits', 'Accessories', 'Gifts'] },
  coral: { id: 'coral', name: 'Coral Couture', keeper: 'odette', color: '#ff8aa8', sign: '#ffffff', tabs: ['Swimsuits', 'Accessories', 'Gifts'] },
  sundries: { id: 'sundries', name: 'Sundries & Smiles', keeper: 'kai', color: '#2fb5a0', sign: '#ffd36a', tabs: ['Food & Drink', 'Goods & Books', 'Accessories'] }
};
/** what a shop sells on a day: [{ item, tab }] (the luchador mask and day items arrive on their day) */
G.shopStock = (shop, day) => {
  const out = [];
  const add = (it, tab) => { if ((it.day || 1) <= day) out.push({ item: it, tab }); };
  if (shop === 'sundries') {
    for (const id of G.GIFT_IDS) { const g = G.GIFTS[id]; if (g.where === 'sundries') add(g, g.cat === 'food' ? 0 : 1); }
    for (const id of G.ACC_IDS) if (G.ACCS[id].where === 'sundries') add(G.ACCS[id], 2);
  } else {
    for (const id of G.SUIT_IDS) if (G.SUITS[id].where === shop) add(G.SUITS[id], 0);
    for (const id of G.ACC_IDS) if (G.ACCS[id].where === shop) add(G.ACCS[id], 1);
    for (const id of G.GIFT_IDS) if (G.GIFTS[id].where === shop) add(G.GIFTS[id], 2);
  }
  return out;
};
G.itemById = id => G.SUITS[id] || G.ACCS[id] || G.GIFTS[id] || null;
G.ITEM_COUNTS = () => ({ suits: G.SUIT_IDS.length, accs: G.ACC_IDS.length, gifts: G.GIFT_IDS.length });
