/* 03-data-items: swimsuits (21), accessories (10), gifts (25), the three shops, and when stock arrives.
 * colors: main, accent, trim. cut and pattern are read by the rig (13-rigs.js). */
G.SUITS = {
  seigaiha: { name: 'Seigaiha', cut: 'onepiece', pattern: 'waves', colors: ['#23306b', '#e8eef8', '#c8303a'], tastes: ['classic', 'elegant'], where: 'Rin\'s signature' },
  estrella: { name: 'Estrella', cut: 'sport2', pattern: 'stars', colors: ['#c8202c', '#ffd04a', '#1a1a1a'], tastes: ['bold', 'sporty'], where: 'Lola\'s signature' },
  fjord: { name: 'Fjord', cut: 'rash', pattern: 'solid', colors: ['#9fd8f0', '#1d3560', '#ffffff'], tastes: ['sporty', 'classic'], where: 'Ingrid\'s signature' },
  kentepop: { name: 'Kente Pop', cut: 'tankini', pattern: 'geo', colors: ['#ff8a1e', '#2f9e4a', '#ffd36a'], tastes: ['bold', 'cute'], where: 'Amara\'s signature' },
  reefbreak: { name: 'Reef Break', cut: 'racer', pattern: 'gradient', colors: ['#1fb7b0', '#ff7a5e', '#ffffff'], tastes: ['sporty', 'bold'], where: 'Tess\'s signature' },
  peony: { name: 'Peony', cut: 'halter', pattern: 'floral', colors: ['#ffb2a0', '#e85a8a', '#ffffff'], tastes: ['cute', 'elegant'], where: 'Mei\'s signature' },
  protour: { name: 'Pro Tour', cut: 'racer', pattern: 'pin', colors: ['#f4f6fa', '#d8283a', '#1a2a5a'], tastes: ['sporty'], where: 'Riptide Sports', price: 12000, shop: 'riptide' },
  sandstorm: { name: 'Sandstorm', cut: 'sport2', pattern: 'solid', colors: ['#e8c06a', '#1a1a1a', '#ffffff'], tastes: ['sporty', 'bold'], where: 'Riptide Sports', price: 9000, shop: 'riptide' },
  lifeguard: { name: 'Lifeguard', cut: 'onepiece', pattern: 'solid', colors: ['#e0302a', '#ffd04a', '#ffffff'], tastes: ['sporty', 'classic'], where: 'Riptide Sports', price: 8000, shop: 'riptide' },
  coralrash: { name: 'Coral Rash', cut: 'rash', pattern: 'stripes', colors: ['#ff7a5e', '#ffffff', '#2a3a5a'], tastes: ['sporty'], where: 'Riptide Sports', price: 14000, shop: 'riptide' },
  neonrush: { name: 'Neon Rush', cut: 'tankini', pattern: 'gradient', colors: ['#7cff5a', '#ff4fb8', '#1a1a1a'], tastes: ['bold', 'sporty'], where: 'Riptide Sports', price: 16000, shop: 'riptide', day: 2 },
  monaco: { name: 'Monaco', cut: 'halter', pattern: 'stripes', colors: ['#1d2f6a', '#ffffff', '#d8283a'], tastes: ['classic', 'elegant'], where: 'Coral Couture', price: 22000, shop: 'coral' },
  polkapop: { name: 'Polka Pop', cut: 'sport2', pattern: 'dots', colors: ['#e8283a', '#ffffff', '#ffd04a'], tastes: ['cute'], where: 'Coral Couture', price: 18000, shop: 'coral' },
  tropicana: { name: 'Tropicana', cut: 'sarong', pattern: 'palms', colors: ['#2f8f4e', '#ffe0a0', '#ff8a1e'], tastes: ['elegant'], where: 'Coral Couture', price: 26000, shop: 'coral' },
  mermaid: { name: 'Mermaid', cut: 'onepiece', pattern: 'scales', colors: ['#1fb7b0', '#7a5fd8', '#e8f8ff'], tastes: ['cute', 'elegant'], where: 'Coral Couture', price: 30000, shop: 'coral', day: 3 },
  sunsetblvd: { name: 'Sunset Boulevard', cut: 'tankini', pattern: 'gradient', colors: ['#ff9e5e', '#7a3fa0', '#ffd36a'], tastes: ['bold', 'elegant'], where: 'Coral Couture', price: 28000, shop: 'coral' },
  midnight: { name: 'Midnight', cut: 'onepiece', pattern: 'solid', colors: ['#16141c', '#ffd36a', '#ffd36a'], tastes: ['elegant', 'bold'], where: 'Coral Couture', price: 35000, shop: 'coral', day: 4 },
  gingham: { name: 'Gingham Picnic', cut: 'tankini', pattern: 'check', colors: ['#6aa8e8', '#ffffff', '#e8283a'], tastes: ['cute', 'classic'], where: 'Coral Couture', price: 15000, shop: 'coral' },
  fortunagold: { name: 'Fortuna Gold', cut: 'racer', pattern: 'lame', colors: ['#ffd36a', '#fff3c0', '#1a1a1a'], tastes: ['bold'], where: 'Win the Final', reward: 'final' },
  jackpot: { name: 'Jackpot', cut: 'sport2', pattern: 'sevens', colors: ['#1a1a2a', '#ffd36a', '#e8283a'], tastes: ['bold', 'cute'], where: 'Casino prize counter', chips: 300 },
  pinstripe: { name: 'Pepper\'s Pinstripe', cut: 'racer', pattern: 'pin', colors: ['#121216', '#f4f4f4', '#ffd36a'], tastes: ['classic', 'elegant'], where: 'Pepper\'s gift (Day 4)', reward: 'pepper' }
};
G.SUIT_ORDER = ['seigaiha', 'estrella', 'fjord', 'kentepop', 'reefbreak', 'peony', 'protour', 'sandstorm', 'lifeguard', 'coralrash', 'neonrush', 'monaco', 'polkapop', 'tropicana', 'mermaid', 'sunsetblvd', 'midnight', 'gingham', 'fortunagold', 'jackpot', 'pinstripe'];
G.ACCESSORIES = {
  ribbon: { name: 'Ribbon', anchor: 'hair', look: 'a bow in the accent color', tastes: ['classic', 'cute'], where: 'Rin and Mei start with it; Coral Couture', price: 2000, shop: 'coral' },
  sweatband: { name: 'Sweatband', anchor: 'head', look: 'terry band', tastes: ['sporty'], where: 'Riptide; Lola starts with it', price: 3000, shop: 'riptide' },
  sportshades: { name: 'Sport Shades', anchor: 'face', look: 'wraparound lenses', tastes: ['sporty'], where: 'Riptide; Ingrid starts with them', price: 6000, shop: 'riptide', shades: true },
  heartshades: { name: 'Heart Shades', anchor: 'face', look: 'two pink hearts', tastes: ['cute', 'bold'], where: 'Coral Couture', price: 7500, shop: 'coral', shades: true },
  aviators: { name: 'Gold Aviators', anchor: 'face', look: 'like Sonny\'s', tastes: ['bold'], where: 'Coral Couture, Day 3+', price: 15000, shop: 'coral', shades: true, day: 3 },
  visor: { name: 'Sun Visor', anchor: 'head', look: 'white with a colored brim', tastes: ['sporty'], where: 'Riptide', price: 4000, shop: 'riptide' },
  sunhat: { name: 'Straw Sun Hat', anchor: 'head', look: 'wide straw brim', tastes: ['elegant', 'classic'], where: 'Coral Couture', price: 9000, shop: 'coral' },
  hibiscus: { name: 'Hibiscus', anchor: 'hair', look: 'a red flower behind the ear', tastes: ['cute', 'elegant'], where: 'Sundries; Amara starts with it', price: 2500, shop: 'sundries' },
  shellnecklace: { name: 'Shell Necklace', anchor: 'neck', look: 'white shell dots', tastes: ['cute', 'classic'], where: 'Sundries', price: 4500, shop: 'sundries' },
  wristbands: { name: 'Wristbands', anchor: 'wrists', look: '2-pixel bands', tastes: ['sporty'], where: 'Riptide; Tess starts with them', price: 3500, shop: 'riptide' }
};
G.ACC_ORDER = ['ribbon', 'sweatband', 'sportshades', 'heartshades', 'aviators', 'visor', 'sunhat', 'hibiscus', 'shellnecklace', 'wristbands'];
G.GIFTS = {
  mango_smoothie: { name: 'Mango Smoothie', price: 800, cat: 'food', shop: 'sundries', icon: 'coconut' },
  bubble_tea: { name: 'Bubble Tea', price: 900, cat: 'food', shop: 'sundries', icon: 'cup' },
  matcha_icecream: { name: 'Matcha Ice Cream', price: 700, cat: 'food', shop: 'sundries', icon: 'cone' },
  mochi_box: { name: 'Mochi Box', price: 1500, cat: 'food', shop: 'sundries', icon: 'box' },
  bbq_skewers: { name: 'BBQ Skewers', price: 1200, cat: 'food', shop: 'sundries', icon: 'stick' },
  hot_sauce: { name: 'Hot Sauce Sampler', price: 2000, cat: 'food', shop: 'sundries', icon: 'bottle' },
  iced_coffee: { name: 'Iced Coffee', price: 600, cat: 'food', shop: 'sundries', icon: 'cup' },
  coconut: { name: 'Fresh Coconut', price: 400, cat: 'food', shop: 'sundries', icon: 'coconut' },
  plush_seal: { name: 'Plush Seal', price: 3000, cat: 'goods', shop: 'sundries', icon: 'plush' },
  snow_globe: { name: 'Snow Globe', price: 2500, cat: 'goods', shop: 'sundries', icon: 'globe' },
  puzzle_cube: { name: 'Puzzle Cube', price: 2200, cat: 'goods', shop: 'sundries', icon: 'cube' },
  portable_speaker: { name: 'Portable Speaker', price: 9000, cat: 'goods', shop: 'sundries', icon: 'speaker' },
  matcha_kit: { name: 'Matcha Kit', price: 4500, cat: 'goods', shop: 'sundries', icon: 'cup' },
  calligraphy_set: { name: 'Calligraphy Set', price: 6000, cat: 'goods', shop: 'sundries', icon: 'brush' },
  knitting_kit: { name: 'Knitting Kit', price: 2800, cat: 'goods', shop: 'sundries', icon: 'ball' },
  maracas: { name: 'Maracas', price: 1400, cat: 'goods', shop: 'sundries', icon: 'maraca' },
  luchador_mask: { name: 'Luchador Mask', price: 5000, cat: 'goods', shop: 'sundries', icon: 'mask', day: 2 },
  beach_paperback: { name: 'Beach Paperback', price: 1200, cat: 'books', shop: 'sundries', icon: 'book' },
  fashion_mag: { name: 'Fashion Magazine', price: 800, cat: 'books', shop: 'sundries', icon: 'book' },
  energy_drink: { name: 'Energy Drink', price: 500, cat: 'sports', shop: 'riptide', icon: 'can' },
  surf_wax: { name: 'Surf Wax Deluxe', price: 1600, cat: 'sports', shop: 'riptide', icon: 'wax' },
  sunscreen: { name: 'Sunscreen SPF 100', price: 1000, cat: 'sports', shop: 'riptide', icon: 'bottle' },
  foam_finger: { name: 'Foam Finger', price: 900, cat: 'sports', shop: 'riptide', icon: 'finger' },
  glitter_sandals: { name: 'Glitter Sandals', price: 5500, cat: 'fashion', shop: 'coral', icon: 'sandal' },
  gold_hoops: { name: 'Gold Hoop Earrings', price: 12000, cat: 'fashion', shop: 'coral', icon: 'hoop' }
};
G.GIFT_ORDER = Object.keys(G.GIFTS);
G.GIFT_CATS = ['food', 'goods', 'books', 'sports', 'fashion'];
G.SHOPS = {
  riptide: { id: 'riptide', name: 'Riptide Sports', keeper: 'bo', cats: ['suits', 'acc', 'gifts'], sells: ['sports'] },
  coral: { id: 'coral', name: 'Coral Couture', keeper: 'odette', cats: ['suits', 'acc', 'gifts'], sells: ['fashion'] },
  sundries: { id: 'sundries', name: 'Sundries & Smiles', keeper: 'kai', cats: ['gifts', 'acc'], sells: ['food'] }
};
G.SHOP_QUIPS = {
  bo: ['Hydrate, champ. Then buy the good stuff.', 'Nothing beats a fresh wax job.', 'The visor says I\'m serious. The grin says I\'m fun.'],
  odette: ['Every stitch here is a promise.', 'Pink is not a color, darling. It is a mood.', 'You look like the sun decided to dress you.'],
  kai: ['Coconut\'s fresh, and so am I.', 'Try the mango. Trust me, the mango is trusting you.', 'Chips? Hot sauce? Listen to the bottle.']
};
/* the stock of each shop, by the day an item appears: every shop also has 2 daily deals at -25% (world rng) */
G.itemPrice = function (id) {
  const s = G.SUITS[id] || G.ACCESSORIES[id] || G.GIFTS[id];
  return s && s.price ? Math.round(s.price * G.T.priceMul) : 0;
};
G.itemName = function (id) { const s = G.SUITS[id] || G.ACCESSORIES[id] || G.GIFTS[id]; return s ? s.name : id; };
G.itemsForShop = function (shop, day) {
  const out = { suits: [], acc: [], gifts: [] };
  for (const id of G.SUIT_ORDER) { const s = G.SUITS[id]; if (s.shop === shop && (s.day || 1) <= day) out.suits.push(id); }
  for (const id of G.ACC_ORDER) { const a = G.ACCESSORIES[id]; if (a.shop === shop && (a.day || 1) <= day) out.acc.push(id); }
  for (const id of G.GIFT_ORDER) { const g = G.GIFTS[id]; if (g.shop === shop && (g.day || 1) <= day) out.gifts.push(id); }
  return out;
};
