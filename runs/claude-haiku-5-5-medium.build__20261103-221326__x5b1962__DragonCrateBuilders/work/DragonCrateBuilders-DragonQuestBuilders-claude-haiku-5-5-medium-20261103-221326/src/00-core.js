// Dragon Crate Builders: namespace, constants, seeded streams, event bus and the data tables (blocks, items, recipes,
// monsters, residents, quests, tuning). Plain data first; systems in the later files read it.
globalThis.DQ = globalThis.DQ || {};
const DQ = globalThis.DQ;
DQ.TITLE = 'Dragon Crate Builders';
DQ.VERSION = '0.9.0';
DQ.T = 16;                 // one block, in world units (x east, y south, z up)
DQ.W = 48; DQ.D = 48; DQ.H = 16;   // the Patchwork Realm: columns x, y and levels z
DQ.SEED = 20261103;
DQ.DAY_MINUTES = 12;       // a day in real minutes (tunable in Dev Tools)
DQ.REACH = 3.2;            // blocks

DQ.hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
// a named, seeded stream: the same numbers every run for the same label (no Math.random in game logic)
DQ.rng = label => My3D2dge.rng((DQ.SEED ^ DQ.hash(label)) >>> 0);

// ---- event bus -------------------------------------------------------------
DQ.events = {
  map: {},
  on(name, fn) { (this.map[name] = this.map[name] || []).push(fn); return () => { this.map[name] = this.map[name].filter(f => f !== fn); }; },
  emit(name, payload) { for (const fn of this.map[name] || []) fn(payload); },
  clear() { this.map = {}; },
};

// ---- tuning: the live sliders (Dev Tools) and their defaults ---------------
DQ.TUNING_DEFS = [
  { key: 'walkSpeed', label: 'Walk speed', min: 40, max: 140, step: 5, def: 84 },
  { key: 'jumpSpeed', label: 'Jump height', min: 150, max: 300, step: 10, def: 220 },
  { key: 'dayMinutes', label: 'Day length (min)', min: 2, max: 30, step: 1, def: 12 },
  { key: 'playerDamage', label: 'Your damage', min: 0.5, max: 4, step: 0.5, def: 1 },
  { key: 'monsterDamage', label: 'Monster damage', min: 0, max: 3, step: 0.25, def: 1 },
  { key: 'monsterHealth', label: 'Monster health', min: 0.5, max: 3, step: 0.5, def: 1 },
  { key: 'cheerRate', label: 'Cheer gained', min: 0.5, max: 3, step: 0.5, def: 1 },
  { key: 'spawnRate', label: 'Monster spawns', min: 0, max: 3, step: 0.5, def: 1 },
  { key: 'breakSpeed', label: 'Block break speed', min: 0.5, max: 4, step: 0.5, def: 1 },
];
DQ.tuning = {};
DQ.resetTuning = () => { for (const d of DQ.TUNING_DEFS) DQ.tuning[d.key] = d.def; };
DQ.resetTuning();

// ---- blocks ----------------------------------------------------------------
// hp: hits at tool power 1; tier: the minimum tool tier to break it (tier 0 needs none); drop: item id or null
// light: glows (lanterns). top/side: patch colours (side is the darker, stitched edge).
DQ.BLOCKS = [
  { name: 'Air', air: true },
  { name: 'Backing Cloth', top: '#5b4a7e', side: '#40345c', hp: 0, tier: 99, drop: null, unbreakable: true },
  { name: 'Meadow Turf', top: '#7fcb5a', side: '#8d6a3e', hp: 1, tier: 0, drop: 'batting' },
  { name: 'Batting', top: '#b98a58', side: '#8a6038', hp: 1, tier: 0, drop: 'batting' },
  { name: 'Cobble Patch', top: '#a3a6b4', side: '#6e7180', hp: 3, tier: 1, drop: 'cobble' },
  { name: 'Pine Board', top: '#d19b58', side: '#9a6a36', hp: 2, tier: 0, drop: 'pine' },
  { name: 'Calico Sand', top: '#ecd695', side: '#c6b06c', hp: 1, tier: 0, drop: 'sand' },
  { name: 'Brick Patch', top: '#c9645a', side: '#8e3f3a', hp: 3, tier: 1, drop: 'brick' },
  { name: 'Copper Thread Ore', top: '#e0a852', side: '#8c6230', hp: 4, tier: 1, drop: 'copper' },
  { name: 'Black Knot', top: '#352c3e', side: '#1b1622', hp: 8, tier: 3, drop: 'knot' },
  { name: 'Pane', top: '#c9ecff', side: '#86b8d8', hp: 1, tier: 0, drop: 'pane' },
  { name: 'Tatami', top: '#e2c17e', side: '#a88a4e', hp: 2, tier: 0, drop: 'tatami' },
  { name: 'Workbench', top: '#c79a64', side: '#6e4a2a', hp: 2, tier: 0, drop: 'workbench', station: true },
  { name: 'Bed', top: '#f6e6ee', side: '#d4487a', hp: 2, tier: 0, drop: 'bed', bed: true },
  { name: 'Door', top: '#8a5632', side: '#5a3420', hp: 2, tier: 0, drop: 'door', door: true },
  { name: 'Lantern', top: '#ffe27a', side: '#e0a030', hp: 1, tier: 0, drop: 'lantern', light: 1 },
  { name: 'Chest', top: '#d9a03a', side: '#8a5a1a', hp: 2, tier: 0, drop: 'chest', chest: true },
  { name: 'Banner of Mending', top: '#69b8ec', side: '#2f6ea8', hp: 4, tier: 0, drop: 'banner', banner: true },
  { name: 'Wool', top: '#f6f2e8', side: '#cfc8b4', hp: 1, tier: 0, drop: 'wool' },
  { name: 'Roof Tile', top: '#4f7fc4', side: '#2f4f86', hp: 2, tier: 0, drop: 'roof' },
  { name: 'Pumpkin Patch', top: '#f08a2a', side: '#b85c18', hp: 1, tier: 0, drop: 'pumpkin' },
  { name: 'Bobbin Ballista', top: '#8a6a4a', side: '#4a3a2a', hp: 4, tier: 0, drop: 'ballista', turret: true },
  { name: 'Bobbin Portal', top: '#9a7ce8', side: '#5a3aa8', hp: 3, tier: 0, drop: 'portal', portal: true },
];
DQ.BLOCK_ID = {};
DQ.BLOCKS.forEach((b, i) => { DQ.BLOCK_ID[b.name] = i; });
DQ.B = {
  AIR: 0, CLOTH: 1, TURF: 2, BATTING: 3, COBBLE: 4, PINE: 5, SAND: 6, BRICK: 7, COPPER: 8, KNOT: 9, PANE: 10,
  TATAMI: 11, BENCH: 12, BED: 13, DOOR: 14, LANTERN: 15, CHEST: 16, BANNER: 17, WOOL: 18, ROOF: 19, PUMPKIN: 20,
  BALLISTA: 21, PORTAL: 22,
};
DQ.solidBlock = id => id > 0;

// ---- items -----------------------------------------------------------------
// kind: 'block' (places as a block of that id), 'tool' (power, tier), 'material', 'food' (heals), 'key' (quest item)
DQ.ITEMS = {
  ballista: { name: 'Bobbin Ballista', kind: 'block', block: DQ.B.BALLISTA, color: '#8a6a4a', blurb: 'Fires at the nearest monster. It is the only thing that can tangle Gnarlgrim.' },
  portal:   { name: 'Bobbin Portal', kind: 'block', block: DQ.B.PORTAL, color: '#9a7ce8', blurb: 'Place two. Stand on one to come out of the other.' },
  cottageP: { name: 'Cottage Pattern', kind: 'pattern', pattern: 'cottage', color: '#c9e8ff', blurb: 'Lay it on clear ground. The residents build it, block by block.' },
  towerP:   { name: 'Lookout Pattern', kind: 'pattern', pattern: 'tower', color: '#c9e8ff', blurb: 'A tall lookout with a storehouse at its foot.' },
  scroll:   { name: 'Blueprint Scroll', kind: 'scroll', color: '#f4e4b0', blurb: 'Use it on something you built: its blocks are copied into a blueprint of your own.' },
  shedP:    { name: 'Shed Pattern', kind: 'pattern', pattern: 'shed', color: '#c9e8ff', blurb: 'A small storehouse with a chest and a lamp.' },
  lodgeP:   { name: 'Lodge Pattern', kind: 'pattern', pattern: 'lodge', color: '#c9e8ff', blurb: 'A workshop lodge with a bench and a lamp.' },
  stick:    { name: 'Darning Stick', kind: 'tool', power: 1, tier: 0, glyph: '/', color: '#cfd6e8', blurb: 'A thin wooden stick for poking things. Good for turf.' },
  club:     { name: 'Cobble Club', kind: 'tool', power: 2, tier: 1, glyph: 'T', color: '#a3a6b4', blurb: 'Heavy enough to cut through patchwork cobble.' },
  bodkin:   { name: 'Copper Bodkin', kind: 'tool', power: 3, tier: 2, glyph: 'J', color: '#e0a852', blurb: 'A fine copper needle that goes through anything.' },
  ripper:   { name: 'Seam Ripper', kind: 'tool', power: 4, tier: 3, glyph: 'R', color: '#e25a7a', blurb: 'The only tool that cuts Black Knots.' },
  batting:  { name: 'Batting', kind: 'material', color: '#b98a58', blurb: 'Soft stuffing. Everything needs a bit.' },
  cobble:   { name: 'Cobble', kind: 'material', color: '#a3a6b4', blurb: 'Patchwork stone.' },
  pine:     { name: 'Pine Board', kind: 'material', color: '#d19b58', blurb: 'Good straight grain.' },
  sand:     { name: 'Calico Sand', kind: 'material', color: '#ecd695', blurb: 'Fine and soft.' },
  brick:    { name: 'Brick', kind: 'material', color: '#c9645a', blurb: 'Warm, stacking, stitched.' },
  copper:   { name: 'Copper Thread', kind: 'material', color: '#e0a852', blurb: 'Bright, metallic, and tangles easily.' },
  knot:     { name: 'Black Knot', kind: 'material', color: '#352c3e', blurb: 'Cold and tight. Gnarlgrim is made of these.' },
  pane:     { name: 'Pane', kind: 'material', color: '#c9ecff', blurb: 'Clear as a summer window.' },
  tatami:   { name: 'Tatami', kind: 'material', color: '#e2c17e', blurb: 'Woven floor matting.' },
  wool:     { name: 'Wool', kind: 'material', color: '#f6f2e8', blurb: 'Fluffy and warm.' },
  gossamer: { name: 'Gossamer Thread', kind: 'key', color: '#f4f0ff', blurb: 'Granny Gossamer\'s own thread. It makes the best tools.' },
  berry:    { name: 'Berry', kind: 'food', heal: 2, color: '#d64a7a', blurb: 'Tastes of a summer you can\'t quite remember.' },
  // placeable blocks
  workbench:{ name: 'Workbench', kind: 'block', block: DQ.B.BENCH, color: '#c79a64' },
  bed:      { name: 'Bed', kind: 'block', block: DQ.B.BED, color: '#d4487a' },
  door:     { name: 'Door', kind: 'block', block: DQ.B.DOOR, color: '#8a5632' },
  lantern:  { name: 'Lantern', kind: 'block', block: DQ.B.LANTERN, color: '#ffe27a' },
  chest:    { name: 'Chest', kind: 'block', block: DQ.B.CHEST, color: '#d9a03a' },
  banner:   { name: 'Banner of Mending', kind: 'block', block: DQ.B.BANNER, color: '#69b8ec', blurb: 'Plant it to stitch a glowing border around your town.' },
  roof:     { name: 'Roof Tile', kind: 'block', block: DQ.B.ROOF, color: '#4f7fc4' },
  tatamiB:  { name: 'Tatami Floor', kind: 'block', block: DQ.B.TATAMI, color: '#e2c17e' },
  paneB:    { name: 'Pane', kind: 'block', block: DQ.B.PANE, color: '#c9ecff' },
  brickB:   { name: 'Brick', kind: 'block', block: DQ.B.BRICK, color: '#c9645a' },
  cobbleB:  { name: 'Cobble Patch', kind: 'block', block: DQ.B.COBBLE, color: '#a3a6b4' },
  pineB:    { name: 'Pine Board', kind: 'block', block: DQ.B.PINE, color: '#d19b58' },
  woolB:    { name: 'Wool', kind: 'block', block: DQ.B.WOOL, color: '#f6f2e8' },
  battingB: { name: 'Batting', kind: 'block', block: DQ.B.BATTING, color: '#b98a58' },
};
// the hotbar's starting kit
DQ.START_BAG = { stick: 1, batting: 0 };

// ---- recipes: station (null for the hand), inputs, output, the notion that unlocks it, town level it needs ------------
DQ.RECIPES = [
  { id: 'workbench', out: 'workbench', n: 1, station: null, inputs: { pine: 4 }, known: true },
  { id: 'club', out: 'club', n: 1, station: 'workbench', inputs: { pine: 3, cobble: 2 }, notion: 'cobble' },
  { id: 'bodkin', out: 'bodkin', n: 1, station: 'workbench', inputs: { copper: 3, pine: 2 }, notion: 'copper' },
  { id: 'ripper', out: 'ripper', n: 1, station: 'workbench', inputs: { copper: 4, gossamer: 1, pine: 2 }, notion: 'gossamer' },
  { id: 'bed', out: 'bed', n: 1, station: 'workbench', inputs: { wool: 3, pine: 3 }, notion: 'wool' },
  { id: 'door', out: 'door', n: 1, station: 'workbench', inputs: { pine: 2 }, known: true },
  { id: 'lantern', out: 'lantern', n: 1, station: 'workbench', inputs: { copper: 1, cobble: 1 }, notion: 'copper' },
  { id: 'chest', out: 'chest', n: 1, station: 'workbench', inputs: { pine: 4 }, notion: 'pine' },
  { id: 'banner', out: 'banner', n: 1, station: 'workbench', inputs: { wool: 6, pine: 4 }, known: true },
  { id: 'brick', out: 'brickB', n: 4, station: null, inputs: { cobble: 2, batting: 1 }, notion: 'cobble' },
  { id: 'roof', out: 'roof', n: 2, station: 'workbench', inputs: { pine: 2, wool: 1 }, notion: 'wool' },
  { id: 'pane', out: 'paneB', n: 2, station: 'workbench', inputs: { sand: 2, copper: 1 }, notion: 'sand' },
  { id: 'tatami', out: 'tatamiB', n: 3, station: null, inputs: { batting: 2, pine: 1 }, notion: 'pine' },
  { id: 'pie', out: 'berry', n: 2, station: 'workbench', inputs: { berry: 1, wool: 1 }, notion: 'berry' },
  { id: 'batting', out: 'battingB', n: 3, station: null, inputs: { batting: 3 }, known: true },
  { id: 'ballista', out: 'ballista', n: 1, station: 'workbench', inputs: { copper: 3, pine: 2 }, notion: 'copper' },
  { id: 'portal', out: 'portal', n: 2, station: 'workbench', inputs: { copper: 4, wool: 2 }, notion: 'copper' },
  { id: 'cottageP', out: 'cottageP', n: 1, station: 'workbench', inputs: { pine: 3, wool: 2 }, notion: 'wool' },
  { id: 'towerP', out: 'towerP', n: 1, station: 'workbench', inputs: { pine: 4, cobble: 2 }, notion: 'cobble' },
  { id: 'scroll', out: 'scroll', n: 1, station: 'workbench', inputs: { pine: 1, wool: 1 }, known: true },
  { id: 'shedP', out: 'shedP', n: 1, station: 'workbench', inputs: { pine: 3, cobble: 1 }, notion: 'pine' },
  { id: 'lodgeP', out: 'lodgeP', n: 1, station: 'workbench', inputs: { pine: 4, wool: 2 }, notion: 'wool' },
];
DQ.RECIPE_ID = {};
DQ.RECIPES.forEach(r => { DQ.RECIPE_ID[r.id] = r; });

// Notions: the first time you hold an item of its kind you get the idea, and its recipes open. (The item's key.)
DQ.NOTION_TEXT = {
  cobble: 'You\'ve got a notion! Cobble makes a club.',
  copper: 'You\'ve got a notion! Copper thread makes a bodkin, and light.',
  wool: 'You\'ve got a notion! Wool is for beds and roofs.',
  pine: 'You\'ve got a notion! Pine boards are for chests, and for everything.',
  sand: 'You\'ve got a notion! Sand becomes glass.',
  berry: 'You\'ve got a notion! Berries make pie.',
  gossamer: 'You\'ve got a notion! Granny\'s thread makes a Seam Ripper.',
};

// ---- rooms: the furniture that types them ----------------------------------------------------------------------
DQ.ROOMS = [
  { id: 'bedroom', name: 'Bedroom', needs: DQ.B.BED, cheer: 4 },
  { id: 'workshop', name: 'Workshop', needs: DQ.B.BENCH, cheer: 3 },
  { id: 'storehouse', name: 'Storehouse', needs: DQ.B.CHEST, cheer: 2 },
];
// town levels: Cheer totals needed, and what each unlocks
DQ.LEVELS = [
  { level: 1, cheer: 0, border: 5, text: 'The Banner is up. The border glows.' },
  { level: 2, cheer: 6, border: 7, text: 'Town level 2. Bricks and roof tiles are in demand.' },
  { level: 3, cheer: 14, border: 9, text: 'Town level 3. The residents are finding their feet.' },
  { level: 4, cheer: 26, border: 11, text: 'Town level 4. Pie is on the menu.' },
  { level: 5, cheer: 40, border: 13, text: 'Town level 5. Thimbleton is a proper town now.' },
];

// ---- monsters ---------------------------------------------------------------------------------------------------
DQ.MONSTERS = {
  slime: { name: 'Lint Slime', hp: 4, dmg: 2, speed: 22, aggro: 8, reach: 1.1, kind: 'blob', colors: { dk: '#3a6b6a', base: '#79d4cc', lt: '#b8f2ea', spec: '#ffffff', eye: '#ffffff', pupil: '#1f2a38' }, drop: 'batting', dropN: 2, cheer: 1 },
  snag:  { name: 'Snag', hp: 6, dmg: 3, speed: 38, aggro: 10, reach: 1.1, kind: 'blob', colors: { dk: '#5a2a40', base: '#e25a7a', lt: '#ffa6bb', spec: '#ffffff', eye: '#ffe27a', pupil: '#2a0e1a' }, drop: 'copper', dropN: 1, cheer: 2, horns: true },
  gnarlgrim: { name: 'Gnarlgrim', hp: 60, dmg: 4, speed: 26, aggro: 14, reach: 3.2, kind: 'boss', colors: { dk: '#1b1622', base: '#352c3e', lt: '#5a4c6a', spec: '#8fe0f2', eye: '#ffe27a', pupil: '#e25a7a' }, drop: 'knot', dropN: 3, cheer: 12 },
};
// ---- residents --------------------------------------------------------------------------------------------------
DQ.NPCS = [
  { id: 'pim', name: 'Pim', job: 'farmer', colors: { skin: '#f3c9a0', hair: '#7a4a2a', cloth: '#7fb35a', pants: '#5a4a3a' }, hat: 'cap', voice: 'hi', arrives: 'bedroom' },
  { id: 'ottilie', name: 'Ottilie', job: 'cook', colors: { skin: '#e8b890', hair: '#2a2a3a', cloth: '#e0a080', pants: '#5a3a3a' }, hair: 'long', voice: 'mid', arrives: 'bedroom' },
  { id: 'bramble', name: 'Bramble', job: 'woodcutter', colors: { skin: '#c99a6a', hair: '#3a2a1a', cloth: '#6a5a3a', pants: '#3a3a4a' }, hat: 'helmet', voice: 'low', arrives: 'bedroom' },
  { id: 'doro', name: 'Doro', job: 'guard', colors: { skin: '#f0c8a8', hair: '#c8a040', cloth: '#5a6aa8', pants: '#2a3048' }, hat: 'helmet', voice: 'low', arrives: 'bedroom' },
  { id: 'tilly', name: 'Tilly', job: 'tailor', colors: { skin: '#f6d8c0', hair: '#c0506a', cloth: '#e8a0c0', pants: '#6a4a6a' }, hair: 'ponytail', voice: 'hi', arrives: 'bedroom' },
];
// ---- story: the chapter's steps, in order. Each has the lines Granny says when it's done and the objective text.
DQ.QUESTS = [
  { id: 'footing', title: 'Find your footing', text: 'Break five blocks of the meadow.' },
  { id: 'notion', title: 'Get a notion', text: 'Hold something new. Craft a Cobble Club from cobble.' },
  { id: 'banner', title: 'Raise the Banner', text: 'Craft a Banner of Mending and plant it.' },
  { id: 'shelter', title: 'A shelter', text: 'Build a room: walls, a roof, a door, a light and a bed inside.' },
  { id: 'gnarl', title: 'The Snags', text: 'Defeat three Snags that come out of the den.' },
  { id: 'siege', title: 'Night visitors', text: 'Hold the town through the night siege.' },
  { id: 'boss', title: 'Gnarlgrim', text: 'Go into the Tangle Den and cut Gnarlgrim down with your Seam Ripper.' },
];
DQ.CHAPTER_TITLE = 'Chapter One: A Stitch in Time';

// ---- helpers used by every system ------------------------------------------------------------------------------------
DQ.itemName = id => (DQ.ITEMS[id] ? DQ.ITEMS[id].name : id);
// the materials that place their block directly (the block items above carry their own)
DQ.PLACE = { pine: DQ.B.PINE, cobble: DQ.B.COBBLE, batting: DQ.B.BATTING, sand: DQ.B.SAND, wool: DQ.B.WOOL, brick: DQ.B.BRICK, tatami: DQ.B.TATAMI, pane: DQ.B.PANE, pumpkin: DQ.B.PUMPKIN, roof: DQ.B.ROOF };
DQ.ITEMS.pie = { name: 'Pumpkin Pie', kind: 'food', heal: 6, color: '#f08a2a', blurb: 'Warm, sweet, and very good for a Builder.' };
DQ.ITEMS.bread = DQ.ITEMS.pie;

// ---- the controls: the actions this game uses (keyboard, mouse and a standard pad) ---------------------------------
DQ.INPUT_MAP = {
  jump: ['Space', 'KeyZ', 'Pad0'], attack: ['KeyJ', 'KeyX', 'Mouse0', 'Pad2'], place: ['KeyE', 'Mouse2', 'Pad7'],
  use: ['KeyF', 'Pad3'], dodge: ['ShiftLeft', 'ShiftRight', 'Pad1'], craft: ['KeyC', 'Pad8'], satchel: ['KeyI', 'Tab', 'Pad10'],
  turnL: ['KeyQ', 'Pad4'], turnR: ['KeyR', 'Pad5'], hotPrev: ['BracketLeft', 'Pad6'], hotNext: ['BracketRight', 'Pad11'],
  view: ['KeyB'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'], slot7: ['Digit7'], slot8: ['Digit8'],
};
// the pad button each action sits on (the standard mapping), for its glyph
DQ.PAD_OF = { jump: 0, dodge: 1, attack: 2, use: 3, turnL: 4, turnR: 5, hotPrev: 6, place: 7, craft: 8, satchel: 10, hotNext: 11 };
DQ.GLYPHS = {
  PlayStation: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3'],
  Xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'],
};

// the block an item places, and the item a block is made of (the first match: a material before its block item)
DQ.itemForBlock = id => {
  for (const k of Object.keys(DQ.PLACE)) if (DQ.PLACE[k] === id) return k;
  for (const k of Object.keys(DQ.ITEMS)) if (DQ.ITEMS[k].block === id) return k;
  return null;
};
// patterns: ghost layouts that residents build. Each cell is an offset from the pattern's corner and a block.
DQ.PATTERNS = {
  cottage: { name: 'Cottage', w: 5, d: 4, cells() {
    const B = DQ.B, out = [];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) {
      if (x === 0 || x === 4 || y === 0 || y === 3) for (let z = 0; z < 3; z++) out.push({ dx: x, dy: y, dz: z, id: B.PINE });
      out.push({ dx: x, dy: y, dz: 3, id: B.ROOF });
    }
    // the door in the front wall, and the bed and the lamp inside
    const front = out.findIndex(c => c.dx === 2 && c.dy === 0 && c.dz === 0);
    if (front >= 0) out.splice(front, 1);
    out.push({ dx: 2, dy: 0, dz: 0, id: B.DOOR });
    out.push({ dx: 3, dy: 2, dz: 0, id: B.BED });
    out.push({ dx: 1, dy: 1, dz: 2, id: B.LANTERN });
    return out;
  } },
  shed: { name: 'Shed', w: 4, d: 4, cells() {
    const B = DQ.B, out = [];
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
      if (x === 0 || x === 3 || y === 0 || y === 3) for (let z = 0; z < 3; z++) out.push({ dx: x, dy: y, dz: z, id: B.PINE });
      out.push({ dx: x, dy: y, dz: 3, id: B.ROOF });
    }
    const at = (dx, dy, dz) => { const i = out.findIndex(q => q.dx === dx && q.dy === dy && q.dz === dz); if (i >= 0) out.splice(i, 1); };
    at(1, 0, 0); out.push({ dx: 1, dy: 0, dz: 0, id: B.DOOR });
    out.push({ dx: 1, dy: 1, dz: 0, id: B.CHEST });
    out.push({ dx: 2, dy: 2, dz: 2, id: B.LANTERN });
    return out;
  } },
  lodge: { name: 'Lodge', w: 5, d: 4, cells() {
    const B = DQ.B, out = [];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) {
      if (x === 0 || x === 4 || y === 0 || y === 3) for (let z = 0; z < 3; z++) out.push({ dx: x, dy: y, dz: z, id: B.WOOL });
      out.push({ dx: x, dy: y, dz: 3, id: B.ROOF });
    }
    const at = (dx, dy, dz) => { const i = out.findIndex(q => q.dx === dx && q.dy === dy && q.dz === dz); if (i >= 0) out.splice(i, 1); };
    at(2, 0, 0); out.push({ dx: 2, dy: 0, dz: 0, id: B.DOOR });
    out.push({ dx: 1, dy: 1, dz: 0, id: B.BENCH });
    out.push({ dx: 3, dy: 2, dz: 2, id: B.LANTERN });
    return out;
  } },
  tower: { name: 'Lookout', w: 5, d: 5, cells() {
    const B = DQ.B, out = [];
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      if (x === 0 || x === 4 || y === 0 || y === 4) for (let z = 0; z < 5; z++) out.push({ dx: x, dy: y, dz: z, id: B.PINE });
      out.push({ dx: x, dy: y, dz: 5, id: B.ROOF });
    }
    const at = (dx, dy, dz) => { const i = out.findIndex(q => q.dx === dx && q.dy === dy && q.dz === dz); if (i >= 0) out.splice(i, 1); };
    at(2, 0, 0); out.push({ dx: 2, dy: 0, dz: 0, id: B.DOOR });
    at(1, 1, 0); out.push({ dx: 1, dy: 1, dz: 0, id: B.CHEST });
    at(2, 2, 4); out.push({ dx: 2, dy: 2, dz: 4, id: B.LANTERN });
    return out;
  } },
};
// the named places of the realm, by column
DQ.regionName = (x, y) => {
  if (x >= 34 && y >= 34) return 'the Tangle Den';
  if (Math.hypot(x - 14, y - 34) < 6) return 'Thread Pond';
  if (x < 13 && y > 24) return 'the Stonefield';
  if (x < 34 && y < 14) return 'the Brick Hills';
  if (x >= 34 && y < 14) return 'the Wool Forest';
  return 'the Meadow';
};
