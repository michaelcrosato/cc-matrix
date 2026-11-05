/* 03-data-items: 21 swimsuits, 10 accessories, 25 gifts, the three shops, gift tastes. */
// cut: onepiece racer halter sport2 tankini rash sarong • pattern: solid stripes pin dots waves stars floral palms check gradient geo scales sevens lame
G.SUITS = [
  ['seigaiha', 'Seigaiha', 'onepiece', 'waves', ['#23306b', '#e8eef8', '#c8303a'], ['classic', 'elegant'], 'sig', 0],
  ['estrella', 'Estrella', 'sport2', 'stars', ['#c8202c', '#ffd04a', '#1a1a1a'], ['bold', 'sporty'], 'sig', 0, { shorts: .35 }],
  ['fjord', 'Fjord', 'rash', 'solid', ['#9fd8f0', '#1d3560', '#ffffff'], ['sporty', 'classic'], 'sig', 0, { sleeves: 'short' }],
  ['kentepop', 'Kente Pop', 'tankini', 'geo', ['#ff8a1e', '#2f9e4a', '#ffd36a'], ['bold', 'cute'], 'sig', 0],
  ['reefbreak', 'Reef Break', 'racer', 'gradient', ['#1fb7b0', '#ff7a5e', '#ffffff'], ['sporty', 'bold'], 'sig', 0],
  ['peony', 'Peony', 'halter', 'floral', ['#ffb2a0', '#e85a8a', '#ffffff'], ['cute', 'elegant'], 'sig', 0],
  ['protour', 'Pro Tour', 'racer', 'pin', ['#f4f6fa', '#d8283a', '#1a2a5a'], ['sporty'], 'riptide', 12000],
  ['sandstorm', 'Sandstorm', 'sport2', 'solid', ['#e8c06a', '#1a1a1a', '#ffffff'], ['sporty', 'bold'], 'riptide', 9000, { shorts: .35 }],
  ['lifeguard', 'Lifeguard', 'onepiece', 'solid', ['#e0302a', '#ffd04a', '#ffffff'], ['sporty', 'classic'], 'riptide', 8000],
  ['coralrash', 'Coral Rash', 'rash', 'stripes', ['#ff7a5e', '#ffffff', '#2a3a5a'], ['sporty'], 'riptide', 14000, { sleeves: 'long' }],
  ['neonrush', 'Neon Rush', 'tankini', 'gradient', ['#7cff5a', '#ff4fb8', '#1a1a1a'], ['bold', 'sporty'], 'riptide', 16000, { day: 2 }],
  ['monaco', 'Monaco', 'halter', 'stripes', ['#1d2f6a', '#ffffff', '#d8283a'], ['classic', 'elegant'], 'coral', 22000],
  ['polkapop', 'Polka Pop', 'sport2', 'dots', ['#e8283a', '#ffffff', '#ffd04a'], ['cute'], 'coral', 18000],
  ['tropicana', 'Tropicana', 'sarong', 'palms', ['#2f8f4e', '#ffe0a0', '#ff8a1e'], ['elegant'], 'coral', 26000],
  ['mermaid', 'Mermaid', 'onepiece', 'scales', ['#1fb7b0', '#7a5fd8', '#e8f8ff'], ['cute', 'elegant'], 'coral', 30000, { day: 3 }],
  ['sunsetblvd', 'Sunset Boulevard', 'tankini', 'gradient', ['#ff9e5e', '#7a3fa0', '#ffd36a'], ['bold', 'elegant'], 'coral', 28000],
  ['midnight', 'Midnight', 'onepiece', 'solid', ['#16141c', '#ffd36a', '#ffd36a'], ['elegant', 'bold'], 'coral', 35000, { day: 4 }],
  ['gingham', 'Gingham Picnic', 'tankini', 'check', ['#6aa8e8', '#ffffff', '#e8283a'], ['cute', 'classic'], 'coral', 15000],
  ['fortunagold', 'Fortuna Gold', 'racer', 'lame', ['#ffd36a', '#fff3c0', '#1a1a1a'], ['bold'], 'final', 0],
  ['jackpot', 'Jackpot', 'sport2', 'sevens', ['#1a1a2a', '#ffd36a', '#e8283a'], ['bold', 'cute'], 'prize', 300, { shorts: .35 }],
  ['pinstripe', 'Pepper\'s Pinstripe', 'racer', 'pin', ['#121216', '#f4f4f4', '#ffd36a'], ['classic', 'elegant'], 'pepper', 0]
].map(([id, name, cut, pattern, colors, tastes, where, price, x]) => Object.assign({ id, name, cut, pattern, colors, tastes, where, price, kind: 'suit' }, x || {}));
// the hosts' match kits (not collectible)
G.HOUSE_KITS = { house_sonny: { id: 'house_sonny', name: 'House Kit', cut: 'rash', pattern: 'sevens', colors: ['#141418', '#ffd36a', '#ffd36a'], sleeves: 'none', tastes: [], kind: 'suit' } };
G.ACCS = [
  ['ribbon', 'Ribbon', 'hair', ['classic', 'cute'], 'coral', 2000],
  ['sweatband', 'Sweatband', 'head', ['sporty'], 'riptide', 3000],
  ['sportshades', 'Sport Shades', 'face', ['sporty'], 'riptide', 6000, true],
  ['heartshades', 'Heart Shades', 'face', ['cute', 'bold'], 'coral', 7500, true],
  ['aviators', 'Gold Aviators', 'face', ['bold'], 'coral', 15000, true, 3],
  ['visor', 'Sun Visor', 'head', ['sporty'], 'riptide', 4000],
  ['sunhat', 'Straw Sun Hat', 'head', ['elegant', 'classic'], 'coral', 9000],
  ['hibiscus', 'Hibiscus', 'hair', ['cute', 'elegant'], 'sundries', 2500],
  ['shellnecklace', 'Shell Necklace', 'neck', ['cute', 'classic'], 'sundries', 4500],
  ['wristbands', 'Wristbands', 'wrists', ['sporty'], 'riptide', 3500]
].map(([id, name, anchor, tastes, where, price, shades, day]) => ({ id, name, anchor, tastes, where, price, shades: !!shades, day: day || 1, kind: 'acc' }));
G.GIFTS = [
  ['mango_smoothie', 'Mango Smoothie', 'food', 800], ['bubble_tea', 'Bubble Tea', 'food', 900], ['matcha_icecream', 'Matcha Ice Cream', 'food', 700],
  ['mochi_box', 'Mochi Box', 'food', 1500], ['bbq_skewers', 'BBQ Skewers', 'food', 1200], ['hot_sauce', 'Hot Sauce Sampler', 'food', 2000],
  ['iced_coffee', 'Iced Coffee', 'food', 600], ['coconut', 'Fresh Coconut', 'food', 400],
  ['plush_seal', 'Plush Seal', 'goods', 3000], ['snow_globe', 'Snow Globe', 'goods', 2500], ['puzzle_cube', 'Puzzle Cube', 'goods', 2200],
  ['portable_speaker', 'Portable Speaker', 'goods', 9000], ['matcha_kit', 'Matcha Kit', 'goods', 4500], ['calligraphy_set', 'Calligraphy Set', 'goods', 6000],
  ['knitting_kit', 'Knitting Kit', 'goods', 2800], ['maracas', 'Maracas', 'goods', 1400], ['luchador_mask', 'Luchador Mask', 'goods', 5000, 2],
  ['beach_paperback', 'Beach Paperback', 'books', 1200], ['fashion_mag', 'Fashion Magazine', 'books', 800],
  ['energy_drink', 'Energy Drink', 'sports', 500], ['surf_wax', 'Surf Wax Deluxe', 'sports', 1600], ['sunscreen', 'Sunscreen SPF 100', 'sports', 1000], ['foam_finger', 'Foam Finger', 'sports', 900],
  ['glitter_sandals', 'Glitter Sandals', 'fashion', 5500], ['gold_hoops', 'Gold Hoop Earrings', 'fashion', 12000]
].map(([id, name, cat, price, day]) => ({ id, name, cat, price, day: day || 1, kind: 'gift', where: cat === 'sports' ? 'riptide' : cat === 'fashion' ? 'coral' : 'sundries' }));
// L love, + like, . neutral, - dislike; columns rin lola ingrid amara tess mei
G.TASTE_TABLE = {
  mango_smoothie: '.+.++.', bubble_tea: '.....+', matcha_icecream: '+.+..+', mochi_box: '+....L', bbq_skewers: '.+..L-', hot_sauce: '-L-.+-',
  iced_coffee: '..+...', coconut: '....+.', plush_seal: 'L.+..+', snow_globe: '..L-..', puzzle_cube: '+-...L', portable_speaker: '-+.L+.',
  matcha_kit: 'L-...+', calligraphy_set: '+...-.', knitting_kit: '..L-.-', maracas: '.+.+..', luchador_mask: '.L..+.', beach_paperback: '+-+...',
  fashion_mag: '..-+-+', energy_drink: '-..-+-', surf_wax: '....L.', sunscreen: '..+.+.', foam_finger: '-+..+.', glitter_sandals: '..-+-+', gold_hoops: '.+.L..'
};
G.taste = (npc, gift) => { const row = G.TASTE_TABLE[gift]; if (!row) return 'neutral'; const c = row[G.FIGHTERS.indexOf(npc)]; return c === 'L' ? 'love' : c === '+' ? 'like' : c === '-' ? 'dislike' : 'neutral'; };
G.ITEMS = {}; for (const it of [...G.SUITS, ...G.ACCS, ...G.GIFTS, ...Object.values(G.HOUSE_KITS)]) G.ITEMS[it.id] = it;
G.SHOPS = {
  riptide: { name: 'Riptide Sports', keeper: 'bo', color: '#2a7ad8', tabs: [['Swimsuits', 'suit'], ['Accessories', 'acc'], ['Gifts', 'gift']] },
  coral: { name: 'Coral Couture', keeper: 'odette', color: '#ff7aa8', tabs: [['Swimsuits', 'suit'], ['Accessories', 'acc'], ['Gifts', 'gift']] },
  sundries: { name: 'Sundries & Smiles', keeper: 'kai', color: '#ffb02a', tabs: [['Food', 'food'], ['Goods', 'goods'], ['Books & more', 'other']] }
};
G.shopStock = (shop, day) => {
  const all = [...G.SUITS, ...G.ACCS, ...G.GIFTS].filter(i => i.where === shop && (i.day || 1) <= Math.max(day, 1));
  return all;
};
G.GIFT_ICON_COLORS = { food: ['#ffb02a', '#ff6a3a'], goods: ['#7ad0ff', '#3a6ad8'], books: ['#e8e0c8', '#a85a3a'], sports: ['#7cff5a', '#2a8a3a'], fashion: ['#ff8ad8', '#c83a9a'] };
