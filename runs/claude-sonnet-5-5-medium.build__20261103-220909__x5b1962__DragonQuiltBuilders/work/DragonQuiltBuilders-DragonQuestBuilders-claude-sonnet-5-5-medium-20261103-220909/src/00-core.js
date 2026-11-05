// Dragon Quilt Builders: core namespace, deterministic rng, event bus, tuning, data tables.
(() => {
const E = My3D2dge;
const DQ = globalThis.DQ = { E, T: 16, TITLE: 'Dragon Quilt Builders', VERSION: '1.0.0', SEED: 20261103 };

// ---------- deterministic randomness: named seeded streams ----------
const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const streams = {};
DQ.hash = hash;
DQ.rng = label => streams[label] || (streams[label] = mulberry(DQ.SEED ^ hash(label)));
DQ.reseed = seed => { DQ.SEED = seed >>> 0; for (const k of Object.keys(streams)) delete streams[k]; };
DQ.rnd = (a, b, label = 'game') => a + (b - a) * DQ.rng(label)();
DQ.pick = (list, label = 'game') => list[Math.floor(DQ.rng(label)() * list.length)];
DQ.chance = (p, label = 'game') => DQ.rng(label)() < p;
DQ.cosm = (a = 0, b = 1) => a + (b - a) * Math.random();     // cosmetic only (never touches game state)

// ---------- event bus ----------
const handlers = {};
DQ.events = {
  on(n, fn) { (handlers[n] = handlers[n] || []).push(fn); return () => { handlers[n] = handlers[n].filter(f => f !== fn); }; },
  emit(n, p) { for (const f of (handlers[n] || []).slice()) { try { f(p); } catch (e) { DQ.err('event ' + n, e); } } },
  clear() { for (const k of Object.keys(handlers)) delete handlers[k]; }
};
DQ.errors = [];
DQ.err = (where, e) => { DQ.errors.push(where + ': ' + (e && e.stack || e)); if (DQ.errors.length < 4 && typeof console !== 'undefined') console.error('[DQ] ' + where, e); };
DQ.safe = (where, fn) => { try { return fn(); } catch (e) { DQ.err(where, e); } };

// ---------- tuning (live sliders in Dev Tools) ----------
DQ.TUNING_DEFS = [
  { key: 'walk', label: 'Walk speed', value: 78, min: 40, max: 140, step: 2 },
  { key: 'jump', label: 'Jump power', value: 215, min: 150, max: 320, step: 5 },
  { key: 'builderAtk', label: 'Builder attack ×', value: 1, min: .25, max: 4, step: .05 },
  { key: 'blockDmg', label: 'Block damage ×', value: 1, min: .25, max: 4, step: .05 },
  { key: 'monsterHp', label: 'Monster HP ×', value: 1, min: .25, max: 4, step: .05 },
  { key: 'monsterDmg', label: 'Monster damage ×', value: 1, min: .25, max: 4, step: .05 },
  { key: 'dropRate', label: 'Drop rate ×', value: 1, min: 0, max: 4, step: .1 },
  { key: 'spawnEvery', label: 'Spawn every (s)', value: 8, min: 2, max: 30, step: 1 },
  { key: 'maxMonsters', label: 'Max monsters', value: 10, min: 0, max: 30, step: 1 },
  { key: 'aggro', label: 'Aggro range (blocks)', value: 6, min: 2, max: 14, step: .5 },
  { key: 'dayMinutes', label: 'Day length (min)', value: 12, min: 2, max: 30, step: 1 },
  { key: 'bellySecs', label: 'Belly drain (s/pt)', value: 9, min: 2, max: 40, step: 1 },
  { key: 'cheerMult', label: 'Cheer ×', value: 1, min: .25, max: 5, step: .25 },
  { key: 'siegePrep', label: 'Siege prep (s)', value: 90, min: 5, max: 240, step: 5 },
  { key: 'helperRate', label: 'Helper speed ×', value: 1, min: .25, max: 6, step: .25 },
  { key: 'reach', label: 'Reach (blocks)', value: 3.5, min: 2, max: 8, step: .5 }
];
DQ.tuning = {};
DQ.resetTuning = () => { for (const d of DQ.TUNING_DEFS) DQ.tuning[d.key] = d.value; };
DQ.resetTuning();

// ---------- blocks: columns of patches ----------
// hp: hits at weapon blockDmg 1; tier: lowest tool tier that harms it; drop: item id
DQ.BLOCKS = [
  null,
  { key: 'felt', name: 'Meadow Felt', top: '#6fae4f', side: '#7a5a3a', face: 'plaster', hp: 2, tier: 1, drop: 'felt', place: true, mat: 'moss' },
  { key: 'burlap', name: 'Burlap', top: '#d7bf84', side: '#b99a5e', face: 'sandstone', hp: 2, tier: 1, drop: 'burlap', place: true, mat: 'burlap' },
  { key: 'cobble', name: 'Cobble', top: '#9a9aa6', side: '#6c6c7c', face: 'cobble', hp: 4, tier: 1, drop: 'cobble', place: true, mat: 'cobble' },
  { key: 'plank', name: 'Plank', top: '#c68c54', side: '#9a6a3a', face: 'plank', hp: 3, tier: 1, drop: 'plank', place: true, mat: 'plank' },
  { key: 'wool', name: 'Wool Block', top: '#f1e6d2', side: '#d8c9ac', face: 'wool', hp: 2, tier: 1, drop: 'woolblock', place: true, mat: 'wool' },
  { key: 'thatch', name: 'Straw Bale', top: '#e2c25a', side: '#c9a53c', face: 'straw', hp: 2, tier: 1, drop: 'thatch', place: true, mat: 'straw' },
  { key: 'copper', name: 'Copper Ore', top: '#d6865a', side: '#8a6a6a', face: 'rock', hp: 6, tier: 2, drop: 'copperore', place: false, mat: 'copper' },
  { key: 'steel', name: 'Steel Ore', top: '#9fb4d8', side: '#5c6a8a', face: 'rock', hp: 9, tier: 3, drop: 'steelore', place: false, mat: 'steel' },
  { key: 'knot', name: 'Black Knot', top: '#3a2a4a', side: '#241a30', face: 'rock', hp: 14, tier: 4, drop: 'button', place: false, mat: 'bone' },
  { key: 'brick', name: 'Stitched Brick', top: '#c46a5a', side: '#9a4a40', face: 'brick', hp: 6, tier: 1, drop: 'brick', place: true, mat: 'brick' },
  { key: 'velvet', name: 'Velvet Block', top: '#9a4a9a', side: '#703a78', face: 'velvet', hp: 3, tier: 1, drop: 'velvet', place: true, mat: 'velvet' },
  { key: 'fray', name: 'Frayed Rock', top: '#7a5a9a', side: '#4a3a6a', face: 'rock', hp: 7, tier: 2, drop: 'cobble', place: false, mat: 'rock' },
  { key: 'snow', name: 'Cotton Drift', top: '#f0f4ff', side: '#c8d4ec', face: 'plaster', hp: 1, tier: 1, drop: 'cotton', place: false, mat: 'snow' }
];
const bidx = {}; DQ.BLOCKS.forEach((b, i) => { if (b) bidx[b.key] = i; });
DQ.blockId = k => bidx[k] || 0;
DQ.MAXH = 6;

// ---------- items ----------
const I = (id, name, kind, o = {}) => ({ id, name, kind, stack: 99, ...o });
DQ.ITEMS = {};
const addItems = list => list.forEach(i => DQ.ITEMS[i.id] = i);
addItems([
  I('felt', 'Meadow Felt', 'block', { block: 'felt', desc: 'Soft green patchwork turf.' }),
  I('burlap', 'Burlap', 'block', { block: 'burlap', desc: 'Scratchy but sturdy sacking.' }),
  I('cobble', 'Cobble', 'block', { block: 'cobble', desc: 'Stone stitched into blocks.' }),
  I('plank', 'Plank', 'block', { block: 'plank', desc: 'Smooth boards for walls and floors.' }),
  I('woolblock', 'Wool Block', 'block', { block: 'wool', desc: 'A cuddly block. Great for walls.' }),
  I('thatch', 'Straw Bale', 'block', { block: 'thatch', desc: 'Golden, itchy and cheap.' }),
  I('brick', 'Stitched Brick', 'block', { block: 'brick', desc: 'Sturdy red masonry.' }),
  I('velvet', 'Velvet Block', 'block', { block: 'velvet', desc: 'Fancy! Residents love it.' }),
  I('branch', 'Branch', 'mat', { desc: 'A stick. Many things start as a stick.' }),
  I('cotton', 'Cotton', 'mat', { desc: 'Fluffy fibres, good for stuffing.' }),
  I('straw', 'Straw', 'mat', { desc: 'Dry stalks from meadow tufts.' }),
  I('lint', 'Lint', 'mat', { desc: 'Dropped by Lintlings. Surprisingly handy.' }),
  I('copperore', 'Copper Ore', 'mat', { desc: 'Smelt it at a Thimble Forge.' }),
  I('steelore', 'Steel Ore', 'mat', { desc: 'Smelt it at a Thimble Forge.' }),
  I('copperthread', 'Copper Thread', 'mat', { desc: 'Springy orange wire.' }),
  I('steelthread', 'Steel Thread', 'mat', { desc: 'Cuts through anything. Almost.' }),
  I('button', 'Ancient Button', 'mat', { desc: 'A glinting old button. Collectors swoon.' }),
  I('berry', 'Thimbleberry', 'food', { belly: 6, hp: 0, desc: 'Raw and tart. Belly +6.' }),
  I('crumpet', 'Crumpet', 'food', { belly: 30, hp: 12, desc: 'Warm and buttery. Belly +30, HP +12.' }),
  I('stew', 'Button Stew', 'food', { belly: 50, hp: 25, desc: 'Marigold approves. Belly +50, HP +25.' }),
  I('heartpatch', 'Heartpatch', 'use', { stack: 9, desc: 'Permanently raises max HP by 10.' }),
  I('stick', 'Darning Stick', 'weapon', { stack: 1, atk: 4, blockDmg: 1, tier: 1, metal: '#8a6a3a', desc: 'Your first tool. Pokes things.' }),
  I('club', 'Cobble Club', 'weapon', { stack: 1, atk: 8, blockDmg: 2, tier: 2, metal: '#8a8a96', desc: 'Heavy. Breaks ore and manners.' }),
  I('bodkin', 'Copper Bodkin', 'weapon', { stack: 1, atk: 12, blockDmg: 3, tier: 3, metal: '#e0905a', desc: 'A needle fit for a hero.' }),
  I('ripper', 'Seam Ripper', 'weapon', { stack: 1, atk: 17, blockDmg: 5, tier: 4, metal: '#b8c8ff', desc: 'Cuts Black Knots. The Knots hate it.' }),
  I('vest', 'Quilted Vest', 'body', { stack: 1, def: 3, desc: 'Padded for protection. Defense +3.' }),
  I('shield', 'Patch Shield', 'shield', { stack: 1, def: 3, desc: 'A pot lid with ambition. Defense +3.' }),
  I('banner', 'Banner of Mending', 'key', { stack: 1, desc: 'Plant it in Thimbleton to start a town.' }),
  I('needle', 'Golden Needle', 'key', { stack: 1, desc: 'Sir Buttonsworth\'s prize. Needed for the Seam Ripper.' }),
  // placeable objects
  I('door', 'Plank Door', 'obj', { obj: 'door', desc: 'Keeps the draught and the Knots out.' }),
  I('torch', 'Torch', 'obj', { obj: 'torch', desc: 'A room needs a light.' }),
  I('lantern', 'Lantern', 'obj', { obj: 'lantern', desc: 'Warm light, fancier than a torch.' }),
  I('bed', 'Straw Bed', 'obj', { obj: 'bed', desc: 'Residents sleep here. So can you.' }),
  I('chest', 'Chest', 'obj', { obj: 'chest', desc: 'Stores 20 stacks of stuff.' }),
  I('table', 'Table', 'obj', { obj: 'table', desc: 'Meals are better with a table.' }),
  I('bench', 'Bench', 'obj', { obj: 'seat', desc: 'A seat for supper.' }),
  I('workbench', 'Mending Bench', 'obj', { obj: 'workbench', desc: 'A crafting station.' }),
  I('hearth', 'Hearth Pot', 'obj', { obj: 'hearth', desc: 'A cooking station. Marigold loves it.' }),
  I('forge', 'Thimble Forge', 'obj', { obj: 'forge', desc: 'Smelts ore and forges tools.' }),
  I('bookcase', 'Bookcase', 'obj', { obj: 'bookcase', desc: 'Full of nice-looking spines.' }),
  I('rack', 'Weapon Rack', 'obj', { obj: 'rack', desc: 'Mortimer feels at home near one.' }),
  I('trap', 'Pin Trap', 'obj', { obj: 'trap', desc: 'Monsters step on it. Monsters regret it.' }),
  I('ballista', 'Bobbin Ballista', 'obj', { obj: 'ballista', desc: 'Fires spools. The only thing that can Tangle Gnarlgrim.' })
]);

// ---------- recipes ----------
// station: pocket | workbench | hearth | forge. notion: when the recipe is first learnt.
const R = (out, n, station, inn, notion) => ({ out, n, station, in: inn, notion });
DQ.RECIPES = [
  R('plank', 2, 'pocket', { branch: 2 }, { on: 'pickup', key: 'branch' }),
  R('woolblock', 1, 'pocket', { cotton: 3 }, { on: 'pickup', key: 'cotton' }),
  R('torch', 2, 'pocket', { branch: 1, straw: 1 }, { on: 'start' }),
  R('door', 1, 'pocket', { plank: 3 }, { on: 'pickup', key: 'plank' }),
  R('chest', 1, 'pocket', { plank: 4 }, { on: 'pickup', key: 'plank' }),
  R('workbench', 1, 'pocket', { plank: 4, cobble: 2 }, { on: 'pickup', key: 'cobble' }),
  R('hearth', 1, 'pocket', { cobble: 5, branch: 2 }, { on: 'quest', key: 'kitchen' }),
  R('bed', 1, 'workbench', { woolblock: 2, plank: 2 }, { on: 'quest', key: 'bedroom' }),
  R('table', 1, 'workbench', { plank: 4 }, { on: 'quest', key: 'supper' }),
  R('bench', 2, 'workbench', { plank: 2 }, { on: 'quest', key: 'supper' }),
  R('lantern', 1, 'workbench', { lint: 2, cobble: 1 }, { on: 'level', key: 2 }),
  R('bookcase', 1, 'workbench', { plank: 4, woolblock: 1 }, { on: 'level', key: 2 }),
  R('rack', 1, 'workbench', { plank: 3, cobble: 2 }, { on: 'quest', key: 'guard' }),
  R('trap', 1, 'workbench', { branch: 3, cobble: 2 }, { on: 'level', key: 2 }),
  R('brick', 2, 'workbench', { cobble: 2, lint: 1 }, { on: 'level', key: 3 }),
  R('velvet', 2, 'workbench', { woolblock: 2, berry: 1 }, { on: 'level', key: 3 }),
  R('forge', 1, 'workbench', { cobble: 8, plank: 2 }, { on: 'quest', key: 'forge' }),
  R('crumpet', 2, 'hearth', { straw: 2, berry: 1 }, { on: 'quest', key: 'kitchen' }),
  R('stew', 1, 'hearth', { berry: 3, cotton: 1, branch: 1 }, { on: 'level', key: 2 }),
  R('copperthread', 2, 'forge', { copperore: 1, branch: 1 }, { on: 'pickup', key: 'copperore' }),
  R('steelthread', 2, 'forge', { steelore: 1, branch: 1 }, { on: 'pickup', key: 'steelore' }),
  R('club', 1, 'forge', { plank: 2, cobble: 6 }, { on: 'quest', key: 'forge' }),
  R('bodkin', 1, 'forge', { plank: 2, copperthread: 5 }, { on: 'quest', key: 'forge' }),
  R('vest', 1, 'forge', { woolblock: 4, copperthread: 2 }, { on: 'level', key: 3 }),
  R('shield', 1, 'forge', { plank: 4, copperthread: 3 }, { on: 'level', key: 3 }),
  R('ripper', 1, 'forge', { needle: 1, steelthread: 4, copperthread: 2 }, { on: 'pickup', key: 'needle' }),
  R('ballista', 1, 'forge', { plank: 6, copperthread: 4, lint: 3 }, { on: 'quest', key: 'siege' })
];
DQ.STATIONS = { pocket: 'Pocket Notions', workbench: 'Mending Bench', hearth: 'Hearth Pot', forge: 'Thimble Forge' };

// ---------- objects ----------
// size: footprint always 1 cell; solid: blocks walkers; light: radius (0 = none); shape: engine E.SHAPES id or prop
DQ.OBJECTS = {
  door: { name: 'Plank Door', hp: 40, door: true },
  torch: { name: 'Torch', hp: 8, light: 70, color: '#ffb050', prop: 'torch', room: 'light' },
  lantern: { name: 'Lantern', hp: 8, light: 90, color: '#ffe090', prop: 'lantern', room: 'light', solid: false },
  bed: { name: 'Straw Bed', hp: 12, shape: 'bed', bed: true, solid: true },
  chest: { name: 'Chest', hp: 12, shape: 'chest', solid: true, chest: true },
  table: { name: 'Table', hp: 12, shape: 'table', solid: true },
  seat: { name: 'Bench', hp: 8, shape: 'bench', solid: false },
  workbench: { name: 'Mending Bench', hp: 16, shape: 'anvil', station: 'workbench', solid: true },
  hearth: { name: 'Hearth Pot', hp: 16, prop: 'brazier', station: 'hearth', solid: true, light: 60, color: '#ff9a50' },
  forge: { name: 'Thimble Forge', hp: 20, shape: 'well', station: 'forge', solid: true, light: 70, color: '#ff7a3a' },
  bookcase: { name: 'Bookcase', hp: 12, shape: 'bookcase', solid: true },
  rack: { name: 'Weapon Rack', hp: 12, shape: 'shelf', solid: true },
  trap: { name: 'Pin Trap', hp: 6, shape: 'fence', trap: true, solid: false },
  ballista: { name: 'Bobbin Ballista', hp: 150, shape: 'cart', ballista: true, solid: true },
  banner: { name: 'Banner of Mending', hp: 300, prop: 'banner', solid: true, light: 110, color: '#ffe8a0' },
  portal: { name: 'Bobbin Portal', hp: 9999, prop: 'crystal', portal: true, solid: true, light: 90, color: '#a0c8ff' },
  button: { name: 'Ancient Button', hp: 1, prop: 'crystal', collect: true, solid: false, light: 40, color: '#ffe060' },
  tree: { name: 'Tuft Tree', hp: 4, shape: 'tree', plant: true, solid: true, drops: [['branch', 2, 3], ['cotton', 0, 1]], regrow: 1 },
  pine: { name: 'Pine Spool', hp: 5, shape: 'pine', plant: true, solid: true, drops: [['branch', 2, 4]], regrow: 1 },
  cottonbush: { name: 'Cotton Puff', hp: 2, shape: 'bush', plant: true, solid: false, drops: [['cotton', 1, 3]], regrow: 1 },
  berrybush: { name: 'Thimbleberry', hp: 2, shape: 'bush', plant: true, solid: false, drops: [['berry', 1, 3]], regrow: 1, tint: '#d85a8a' },
  tuft: { name: 'Straw Tuft', hp: 1, shape: 'grass', plant: true, solid: false, drops: [['straw', 1, 2]], regrow: 1 },
  boulder: { name: 'Pebble Heap', hp: 5, shape: 'rock', plant: true, solid: true, drops: [['cobble', 1, 2]], regrow: 2 }
};

// ---------- rooms ----------
DQ.ROOMS = [
  { type: 'Bedroom', needs: { bed: 1 }, cheer: 15, max: 3 },
  { type: 'Kitchen', needs: { hearth: 1 }, cheer: 18, max: 1 },
  { type: 'Smithy', needs: { forge: 1 }, cheer: 18, max: 1 },
  { type: 'Workshop', needs: { workbench: 1 }, cheer: 12, max: 1 },
  { type: 'Guard Post', needs: { rack: 1 }, cheer: 15, max: 1 },
  { type: "Quilters' Hall", needs: { bookcase: 1 }, minCells: 12, cheer: 25, max: 1 },
  { type: 'Mess Hall', needs: { table: 1, seat: 2 }, cheer: 15, max: 1 },
  { type: 'Snug', needs: {}, cheer: 6, max: 2 }
];
DQ.LEVELS = [
  { lv: 1, cheer: 0, radius: 9, unlock: 'The Banner is planted! Residents may come.' },
  { lv: 2, cheer: 40, radius: 12, unlock: 'New notions: Lantern, Bookcase, Pin Trap, Button Stew. A Town Chest can be named.' },
  { lv: 3, cheer: 100, radius: 15, unlock: 'New notions: Stitched Brick, Velvet, Quilted Vest, Patch Shield.' },
  { lv: 4, cheer: 180, radius: 18, unlock: 'The town is big enough for a siege. Mortimer has Opinions.' },
  { lv: 5, cheer: 290, radius: 22, unlock: 'Thimbleton is a Marvel of Mending!' }
];
DQ.cheerForLevel = c => { let l = 1; for (const L of DQ.LEVELS) if (c >= L.cheer) l = L.lv; return l; };

// ---------- monsters ----------
DQ.MONSTERS = {
  lintling: { name: 'Lintling', hp: 12, atk: 5, def: 0, spd: 30, blk: 3, r: 5, wind: .5, kind: 'blob', colors: { base: '#f4f0e0', dk: '#b8b09a', lt: '#fff', eye: '#222' }, drops: [['lint', .8, 1, 2], ['straw', .3, 1, 1]], xp: 1, regions: ['glen', 'crags', 'fray'] },
  pinhog: { name: 'Pinhog', hp: 24, atk: 9, def: 2, spd: 38, blk: 6, r: 6, wind: .55, kind: 'blob', horns: true, colors: { base: '#c06a9a', dk: '#7a3a5a', lt: '#e89aca', eye: '#222' }, drops: [['cotton', .6, 1, 2], ['berry', .4, 1, 2]], regions: ['glen', 'crags'], night: true },
  mothlet: { name: 'Mothlet', hp: 9, atk: 4, def: 0, spd: 44, blk: 2, r: 4, wind: .35, kind: 'blob', wings: true, colors: { base: '#9a8ac8', dk: '#5a4a88', lt: '#d8d0ff', eye: '#fff' }, drops: [['lint', .5, 1, 1]], night: true, regions: ['glen', 'fray'], fly: true },
  knight: { name: 'Frayed Knight', hp: 42, atk: 13, def: 4, spd: 34, blk: 8, r: 6, wind: .65, kind: 'rig', colors: { cloth: '#6a3a8a', metal: '#b8b0d0', bone: '#d8d0c0' }, build: 'skeleton', drops: [['steelore', .15, 1, 1], ['copperthread', .4, 1, 2], ['button', .3, 1, 1]], night: true, regions: ['fray', 'crags'] },
  brute: { name: 'Knotbrute', hp: 95, atk: 20, def: 6, spd: 26, blk: 25, r: 8, wind: .8, kind: 'rig', colors: { cloth: '#3a2a4a', skin: '#6a5a7a' }, build: 'bulky', size: 1.5, drops: [['button', .8, 1, 2], ['steelthread', .3, 1, 1]], regions: [] },
  buttons: { name: 'Sir Buttonsworth', hp: 260, atk: 14, def: 5, spd: 36, blk: 20, r: 9, wind: .6, kind: 'rig', boss: true, colors: { cloth: '#d8b04a', metal: '#f0e090', skin: '#f0d8b0' }, build: 'bulky', size: 1.8, drops: [['needle', 1, 1, 1], ['steelthread', 1, 3, 3]], regions: [] },
  gnarlgrim: { name: 'Gnarlgrim the Knotted', hp: 600, atk: 18, def: 25, spd: 30, blk: 60, r: 10, wind: .7, kind: 'rig', boss: true, colors: { cloth: '#2a1a3a', skin: '#5a4a7a', eye: '#ff5a5a' }, build: 'bulky', size: 2.1, drops: [], regions: [] }
};

DQ.SETTINGS = [
  { key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'difficulty', label: 'Difficulty', options: ['Relaxed', 'Normal', 'Hard'], value: 'Normal' },
  { key: 'autoHop', label: 'Auto-hop up ledges', value: true },
  { key: 'sprintToggle', label: 'Sprint toggle', value: false },
  { key: 'voices', label: 'Voices volume', type: 'slider', value: 1, min: 0, max: 1, step: .1 },
  { key: 'hints', label: 'Hints and tracker', value: true },
  { key: 'damageNumbers', label: 'Damage numbers', value: true }
];
})();
