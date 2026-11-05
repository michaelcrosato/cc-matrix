/* ---- ARENAS (section 11.2): every arena shares the rink; this table dresses it (floor, boards, stands, crowd, lights,
 * props, ads, items, hazards, music). Rink.dress(r) reads `dress` to place the props ---- */
const ARENAS = {
  icebox: {
    id: 'icebox', name: "THE OL' ICEBOX", town: 'MUKLUK FALLS', chapter: 1, home: 'muskrats',
    ambient: .74, lightColor: '#ffd8a0', outside: [52, 44, 40], outsideB: [62, 52, 46], ice: [212, 229, 243], boards: '#f2efe6', kick: '#e8c020', glassTint: '#cfe8ff',
    stand: { face: 'plank', side: '#6a4a30', top: '#8a6040' }, seat: ['#8a5a3a', '#7a4a2e'], fans: { toques: true, mix: ['#5a3a22', '#e8b43a', '#c83a2a', '#3a6aa8', '#f3e6c8'] },
    ads: ["MUKLUK MUFFLER & TIRE", "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS", 'GO MUSKRATS GO'], lamps: 6, lampColor: '#ffd8a0', signs: ['BARN BURNER', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY ♥'],
    items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazards: [], music: 'play', stopMusic: null, organ: true, banners: ['1962', 'CHAMPS'], dress: 'icebox'
  },
  pond: {
    id: 'pond', name: 'LAKE KABONK', town: 'LOGJAM', chapter: 2, home: 'lumberjacks',
    ambient: .6, lightColor: '#ffb070', outside: [214, 224, 236], outsideB: [190, 204, 222], ice: [200, 222, 240], boards: '#eef4fa', kick: '#eef4fa', glassTint: null, snowbanks: true,
    stand: null, seat: null, fans: { parkas: true, mix: ['#b3262a', '#141414', '#3a6aa8', '#e8b43a', '#5a8a3a'] },
    ads: [], lamps: 0, signs: ['TIMBER!', 'POND RULES', 'KABONK!'], weather: { kind: 'snow', amount: .5, wind: .2 },
    items: ['cocoa', 'tape', 'lumber', 'boombox'], hazards: ['thinice'], music: 'pond', stopMusic: 'pond', organ: false, dress: 'pond'
  },
  grindhouse: {
    id: 'grindhouse', name: 'THE GRINDHOUSE', town: 'RUSTBELT', chapter: 3, home: 'bruisers',
    ambient: .5, lightColor: '#c8ffd8', outside: [46, 50, 48], outsideB: [56, 60, 58], ice: [204, 222, 228], boards: '#d8dcd8', kick: '#9be04a', glassTint: '#b8d8c8',
    stand: { face: 'stone', side: '#3a3e44', top: '#4a4e56' }, seat: ['#3a3a44', '#4a3a5a'], fans: { mix: ['#4b2a6b', '#9be04a', '#3a3a3a', '#8a2a2a', '#5a8a3a'] },
    ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI', 'BRUISE BROS GYM', 'NO REFUNDS'], lamps: 4, lampColor: '#c8ffd8', flicker: true, signs: ['DROP EM!', 'BRUISE BROS', 'BLOOD MOON? NO. PG.'],
    items: ['poutine', 'lumber', 'boombox'], hazards: ['octopus', 'rat'], music: 'grind', stopMusic: null, organ: false, dress: 'grindhouse'
  },
  mall: {
    id: 'mall', name: 'MEGAMALL ICE PALACE', town: 'MEGAMALL', chapter: 4, home: 'marauders',
    ambient: .64, lightColor: '#ffffff', outside: [196, 186, 200], outsideB: [176, 168, 186], ice: [216, 232, 246], boards: '#ffffff', kick: '#e0389a', glassTint: '#e0f4ff',
    stand: { face: 'plaster', side: '#a8a0b8', top: '#c8c0d8' }, seat: ['#18b5b0', '#e0389a'], fans: { mix: ['#18b5b0', '#e0389a', '#ffd84a', '#ffffff', '#5a5ad8'] },
    ads: ['GLITTERMAN MEGAPLEX — COMING SOON!', 'FOOD COURT ↑', 'SALE SALE SALE', 'PRETZEL PLANET'], lamps: 0, neon: ['#ff4ab8', '#4af0f0', '#ffe04a'], signs: ['SMASH THAT GLASS', 'MALL RATS?', 'NO PARKING (YET)'],
    items: ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'], hazards: ['pete', 'drop'], music: 'mall', stopMusic: null, organ: false, dress: 'mall', noOT: true, showcase: true
  },
  dome: {
    id: 'dome', name: 'THE KABOOM DOME', town: 'GLITTERMAN CITY', chapter: 5, home: 'grizzlies',
    ambient: .5, lightColor: '#ffffff', outside: [30, 26, 34], outsideB: [40, 34, 44], ice: [214, 230, 248], boards: '#fbf6e8', kick: '#d9a520', glassTint: '#ffeec0',
    stand: { face: 'stone', side: '#2a2430', top: '#3a3240' }, seat: ['#d9a520', '#141414'], fans: { mix: ['#d9a520', '#141414', '#ffffff', '#5a3a22', '#e8b43a'] },
    ads: ['GLITTERMAN INDUSTRIES', 'GILDED GRIZZLIES', 'KABOOM CUP FINAL', 'GOLD IS GOOD'], lamps: 8, lampColor: '#ffffff', flames: true, lasers: true, signs: ['KABOOM!', 'GO MUSKRATS', 'GOLD RUSH', 'BYLAW 1897-B'],
    items: ['hotsauce', 'bricks', 'boombox'], hazards: ['octopus'], music: 'final', stopMusic: null, organ: true, dress: 'dome', boss: true
  }
};
const ARENA_ORDER = ['icebox', 'pond', 'grindhouse', 'mall', 'dome'];

/* ---- ITEMS (7.12): what fans throw, what each does (Items applies it) ---- */
const ITEM_DEFS = {
  hotsauce: { name: 'HOT SAUCE', text: 'Infinite turbo!', t: 8, color: '#e83a2a' },
  tape: { name: "GRANDMA'S TAPE", text: 'Puck glued to your stick!', t: 10, color: '#f4f4f4' },
  poutine: { name: 'POUTINE', text: 'Unstoppable! Every check is a big hit!', t: 10, color: '#e8c060' },
  lumber: { name: 'LUMBER', text: 'Next 3 shots: rockets!', t: 0, shots: 3, color: '#c8945a' },
  bricks: { name: 'BRICK PADS', text: 'Your goalie is HUGE!', t: 12, color: '#b8503a' },
  boombox: { name: 'BOOM BOX', text: '+40 BOOM!', t: 0, color: '#4af0f0' },
  cocoa: { name: 'HOT COCOA', text: 'Toasty legs! Turbo refilled!', t: 8, color: '#8a5a3a' }
};
