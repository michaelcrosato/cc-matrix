/* ---- ARENAS: five barns (PLAN 11.2). The rink's geometry is shared; the dressing is data ---- */
const ARENAS = {
  icebox: { id: 'icebox', name: "The Ol' Icebox", town: 'Mukluk Falls', ambient: .62, outside: [92, 70, 52], floorOut: 'rubber', stand: ['#6a4a2e', '#7a5636', '#5a3c24'], cap: '#8a5a32',
    ads: ['MUKLUK MUFFLER & TIRE', "KOWALCHUK'S PEROGIES", "BAIT 'N' BAGELS", 'SAVE THE ICEBOX'], lamps: [[300, 330], [560, 300], [820, 330], [300, 480], [560, 500], [820, 480]], lampColor: '#ffd8a0',
    items: ['hotsauce', 'tape', 'poutine', 'boombox'], hazards: [], music: 'play', organ: true, crowd: ['#5a3a22', '#e8b43a', '#c8402a', '#3a6ab0', '#e8e0d0'], toque: true, banners: ['1962', 'CHAMPS'] },
  pond: { id: 'pond', name: 'Lake Kabonk', town: 'Logjam', ambient: .45, outside: [214, 226, 240], floorOut: 'snow', stand: ['#e8eef6', '#dfe8f2', '#d0dcea'], cap: '#f4f8ff', snowbank: true,
    ads: [], lamps: [[260, 260], [560, 250], [860, 260]], lampColor: '#ffc880', weather: { kind: 'snow', amount: .5, wind: .2 },
    items: ['cocoa', 'tape', 'lumber', 'boombox'], hazards: ['thinice'], music: 'pond', crowd: ['#c83a2a', '#2a5a9a', '#e8b43a', '#3a8a4a', '#f0f0f0'], parka: true, dusk: true },
  grindhouse: { id: 'grindhouse', name: 'The Grindhouse', town: 'Rustbelt', ambient: .5, outside: [58, 62, 66], floorOut: 'concrete', stand: ['#3a3e44', '#44484e', '#2e3236'], cap: '#9be04a',
    ads: ['RUSTBELT SCRAP', 'IRON GUT CHILI', 'GRINDHOUSE: NO REFUNDS', 'BRUISE BROS FAN CLUB'], lamps: [[300, 320], [560, 320], [820, 320], [440, 480], [700, 480]], lampColor: '#c8ffd0', flicker: true,
    items: ['poutine', 'lumber', 'boombox'], hazards: ['octopus', 'rat'], music: 'grind', crowd: ['#4b2a6b', '#9be04a', '#6a6a6a', '#2a2a2a', '#c8402a'] },
  mall: { id: 'mall', name: 'MegaMall Ice Palace', town: 'MegaMall', ambient: .7, outside: [210, 200, 220], floorOut: 'tile', stand: ['#d8d0e4', '#e4dcee', '#c8c0d8'], cap: '#e0389a',
    ads: ['GLITTERMAN MEGAPLEX: COMING SOON!', 'FOOD COURT ->', '50% OFF SKATES', 'MALL MONEY ACCEPTED', 'POLAR PETE SAYS HI'], lamps: [[300, 300], [560, 300], [820, 300], [300, 500], [820, 500]], lampColor: '#ffe0ff', neon: true,
    items: ['hotsauce', 'tape', 'poutine', 'lumber', 'bricks', 'boombox'], hazards: ['mascot', 'drop'], music: 'mall', crowd: ['#18b5b0', '#e0389a', '#f0d060', '#f4f0f8', '#5a5ae0'] },
  dome: { id: 'dome', name: 'The Kaboom Dome', town: 'Glitterman City', ambient: .55, outside: [40, 34, 26], floorOut: 'carpet', stand: ['#2a2420', '#342c26', '#221c18'], cap: '#d9a520',
    ads: ['GLITTERMAN INDUSTRIES', 'GOLD-PLATED PARKING', 'KABOOM CUP FINAL', 'GILDED GRIZZLIES'], lamps: [[260, 300], [560, 280], [860, 300], [260, 500], [560, 520], [860, 500]], lampColor: '#ffffff', flames: true,
    items: ['hotsauce', 'bricks', 'boombox'], hazards: ['octopus'], music: 'final', crowd: ['#d9a520', '#141414', '#5a3a22', '#e8b43a', '#f0f0f0'] }
};
const ARENA_IDS = ['icebox', 'pond', 'grindhouse', 'mall', 'dome'];

/* ---- ITEMS: what fans throw (PLAN 7.12) ---- */
const ITEMS = {
  hotsauce: { name: 'HOT SAUCE', color: '#e0302a', dur: 8, text: 'Infinite turbo!' },
  tape: { name: "GRANDMA'S TAPE", color: '#f0f0f0', dur: 10, text: "Can't lose the puck!" },
  poutine: { name: 'POUTINE', color: '#e8b43a', dur: 10, text: 'Unstoppable!' },
  lumber: { name: 'LUMBER', color: '#c08a4a', dur: 30, text: '3 cannon shots!' },
  bricks: { name: 'BRICK PADS', color: '#b0503a', dur: 12, text: 'Goalie grows!' },
  boombox: { name: 'BOOM BOX', color: '#5ad0ff', dur: 0, text: '+40 BOOM!' },
  cocoa: { name: 'HOT COCOA', color: '#8a5a3a', dur: 8, text: 'Warm and fast!' }
};
