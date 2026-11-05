// Data tables: blocks, items, recipes, objects (with their shapes), rooms, town levels. Designers edit these.
(() => {
const E = My3D2dge, DQ = globalThis.DQ;

// ---------------- BLOCKS ----------------
// tex: [top pattern, side pattern]; base colours per face kind; tier = minimum tool tier (99 = never)
DQ.BLOCKS = {
  1: { key: 'backing', name: 'Backing Cloth', hp: 1e9, tier: 99, tex: ['grid', 'grid'], col: '#1a1840', placeable: false },
  2: { key: 'earth', name: 'Corduroy Earth', hp: 6, tier: 1, drop: 'earth', tex: ['cordTop', 'cord'], col: '#8a5a3a', placeable: true, step: 'grass' },
  3: { key: 'grass', name: 'Gingham Turf', hp: 6, tier: 1, drop: 'earth', tex: ['gingham', 'fringe'], col: '#6cb84a', side: '#8a5a3a', placeable: false, step: 'grass' },
  4: { key: 'sand', name: 'Calico Sand', hp: 4, tier: 1, drop: 'sand', tex: ['calico', 'calico'], col: '#e8d08a', placeable: true, step: 'sand' },
  5: { key: 'gravel', name: 'Button Gravel', hp: 8, tier: 1, drop: 'pebble', dropN: 2, tex: ['bumps', 'bumps'], col: '#9a96a0', placeable: false, step: 'stone' },
  6: { key: 'stone', name: 'Tweed Stone', hp: 20, tier: 2, drop: 'stone', tex: ['tweed', 'tweed'], col: '#8c8c9a', placeable: true, step: 'stone' },
  7: { key: 'copperOre', name: 'Copper Sequin Seam', hp: 30, tier: 2, drop: 'copperOre', tex: ['sequins', 'sequins'], col: '#8c8c9a', accent: '#d07a3a', placeable: false, step: 'stone' },
  8: { key: 'coal', name: 'Charcloth Seam', hp: 24, tier: 2, drop: 'coal', tex: ['lumps', 'lumps'], col: '#8c8c9a', accent: '#2a2630', placeable: false, step: 'stone' },
  9: { key: 'log', name: 'Plaid Log', hp: 12, tier: 1, drop: 'log', tex: ['rings', 'plaid'], col: '#c89a62', side: '#7a5032', placeable: true, step: 'wood' },
  10: { key: 'leaves', name: 'Pompom Leaves', hp: 2, tier: 1, drop: 'branch', dropChance: .35, tex: ['bobbles', 'bobbles'], col: '#4a9a4a', placeable: false, step: 'grass' },
  11: { key: 'frayed', name: 'Frayed Cloth', hp: 24, tier: 2, drop: 'frayedScrap', tex: ['torn', 'torn'], col: '#5a3a5a', placeable: false, step: 'grass' },
  12: { key: 'knot', name: 'Black Knot', hp: 60, tier: 3, drop: 'blackYarn', tex: ['loops', 'loops'], col: '#2a1a3a', placeable: false, step: 'stone' },
  13: { key: 'water', name: 'Satin Water', hp: 1e9, tier: 99, liquid: true, tex: ['satin', 'satin'], col: '#4a8ad0', placeable: false, step: 'water' },
  20: { key: 'cobble', name: 'Cobble Patch', hp: 22, tier: 2, drop: 'cobble', tex: ['quiltstone', 'quiltstone'], col: '#9a9aa8', placeable: true, step: 'stone' },
  21: { key: 'planks', name: 'Plank Patch', hp: 10, tier: 1, drop: 'planks', tex: ['boards', 'boards'], col: '#c8955a', placeable: true, step: 'wood' },
  22: { key: 'thatch', name: 'Straw Thatch', hp: 4, tier: 1, drop: 'thatch', tex: ['straw', 'straw'], col: '#e0b850', placeable: true, step: 'grass' },
  23: { key: 'feltRed', name: 'Red Felt Patch', hp: 6, tier: 1, drop: 'feltRed', tex: ['felt', 'felt'], col: '#d04a4a', placeable: true, felt: true, step: 'grass' },
  24: { key: 'feltBlue', name: 'Blue Felt Patch', hp: 6, tier: 1, drop: 'feltBlue', tex: ['felt', 'felt'], col: '#4a6ad0', placeable: true, felt: true, step: 'grass' },
  25: { key: 'feltYellow', name: 'Yellow Felt Patch', hp: 6, tier: 1, drop: 'feltYellow', tex: ['felt', 'felt'], col: '#e8c040', placeable: true, felt: true, step: 'grass' },
  26: { key: 'glow', name: 'Glow Patch', hp: 6, tier: 1, drop: 'glow', tex: ['star', 'star'], col: '#fff0b0', placeable: true, light: 48, step: 'grass' },
  27: { key: 'stairsPlank', name: 'Plank Stairs', hp: 10, tier: 1, drop: 'stairsPlank', tex: ['boards', 'boards'], col: '#c8955a', placeable: true, shape: 'stair', step: 'wood' },
  28: { key: 'stairsCobble', name: 'Cobble Stairs', hp: 22, tier: 2, drop: 'stairsCobble', tex: ['quiltstone', 'quiltstone'], col: '#9a9aa8', placeable: true, shape: 'stair', step: 'stone' },
  29: { key: 'tangle', name: 'Tangle', hp: 12, tier: 1, tex: ['loops', 'loops'], col: '#3a2a4a', placeable: false, temp: 20, step: 'grass' },
  30: { key: 'gildedFelt', name: 'Gilded Felt', hp: 6, tier: 1, drop: 'gildedFelt', tex: ['gild', 'gild'], col: '#e8b830', placeable: true, felt: true, step: 'grass' },
  31: { key: 'ruin', name: 'Old Cobble', hp: 22, tier: 2, drop: 'cobble', tex: ['quiltstone', 'quiltstone'], col: '#6a6a78', placeable: false, step: 'stone' },
  32: { key: 'road', name: 'Plank Road', hp: 10, tier: 1, drop: 'planks', tex: ['boards', 'boards'], col: '#a8784a', placeable: false, step: 'wood' }
};
DQ.BLOCK_ID = {};
for (const id in DQ.BLOCKS) { const b = DQ.BLOCKS[id]; b.id = +id; b.solid = !b.liquid; b.opaque = !b.liquid && b.shape !== 'stair'; DQ.BLOCK_ID[b.key] = +id; }
DQ.blockId = k => DQ.BLOCK_ID[k] || 0;
DQ.block = id => DQ.BLOCKS[id] || null;

// ---------------- ITEMS ----------------
// kind: block | material | food | weapon | body | shield | use | key | object.  cat: bag tab
const I = (name, kind, cat, desc, extra) => Object.assign({ name, kind, cat, desc }, extra || {});
DQ.ITEMS = {
  earth: I('Corduroy Earth', 'block', 'Building', 'Soft brown cord. The ground of all good things.', { block: 'earth' }),
  sand: I('Calico Sand', 'block', 'Building', 'Sandy calico, still a little warm from the sun.', { block: 'sand' }),
  stone: I('Tweed Stone', 'block', 'Building', 'Sturdy herringbone stone. Dad-jacket tough.', { block: 'stone' }),
  log: I('Plaid Log', 'block', 'Building', 'A log in a very fetching tartan.', { block: 'log' }),
  cobble: I('Cobble Patch', 'block', 'Building', 'Quilted cobblestones. Lumpy, in a reassuring way.', { block: 'cobble' }),
  planks: I('Plank Patch', 'block', 'Building', 'Neat boards with stitched seams.', { block: 'planks' }),
  thatch: I('Straw Thatch', 'block', 'Building', 'Golden straw, bundled tight. Smells like summer.', { block: 'thatch' }),
  feltRed: I('Red Felt Patch', 'block', 'Building', 'Bright red felt with a diamond stitch.', { block: 'feltRed' }),
  feltBlue: I('Blue Felt Patch', 'block', 'Building', 'Blue as a bluebell. As blue as blue gets.', { block: 'feltBlue' }),
  feltYellow: I('Yellow Felt Patch', 'block', 'Building', 'Sunny yellow felt. Cheerful to a fault.', { block: 'feltYellow' }),
  glow: I('Glow Patch', 'block', 'Building', 'Felt stitched with a star. It glows, and counts as a light.', { block: 'glow' }),
  stairsPlank: I('Plank Stairs', 'block', 'Building', 'Up we go! Faces the way you do.', { block: 'stairsPlank' }),
  stairsCobble: I('Cobble Stairs', 'block', 'Building', 'Stone steps, cosy and solid.', { block: 'stairsCobble' }),
  gildedFelt: I('Gilded Felt', 'block', 'Building', 'Felt shot with gold thread. Fancy!', { block: 'gildedFelt' }),
  pebble: I('Pebble', 'material', 'Materials', 'A little stone with big dreams.'),
  copperOre: I('Copper Ore', 'material', 'Materials', 'Lumpy copper sequins. Smelt it at a Forge.'),
  coal: I('Charcloth', 'material', 'Materials', 'Black felt that burns hot and long.'),
  branch: I('Branch', 'material', 'Materials', 'A stick. Every hero starts with a stick.'),
  straw: I('Straw', 'material', 'Materials', 'Dry and golden. Good for beds and thatch.'),
  grain: I('Wild Grain', 'material', 'Food', 'Hardy little seeds. Bakes into buns.'),
  cotton: I('Cotton Puff', 'material', 'Materials', 'Fluffy cotton from the Glen.'),
  thread: I('Thread', 'material', 'Materials', 'Spun from cotton. Holds the world together.'),
  lint: I('Lint', 'material', 'Materials', 'Fluffy, flammable, faintly judgemental.'),
  mothDust: I('Moth Dust', 'material', 'Materials', 'Shimmering dust from a Mothlet. It glows faintly.'),
  pins: I('Pins', 'material', 'Materials', 'Sharp! Mind your fingers.'),
  steelThread: I('Steel Thread', 'material', 'Materials', 'Thread as strong as a sword. Stronger, maybe.'),
  blackYarn: I('Black Yarn', 'material', 'Materials', 'Tangled beyond all reason.'),
  frayedScrap: I('Frayed Scrap', 'material', 'Materials', 'A tatter of the Fraying. Burns like charcloth.'),
  copperIngot: I('Copper Ingot', 'material', 'Materials', 'A gleaming bar of copper.'),
  dyeRed: I('Rose Dye', 'material', 'Materials', 'Berry-red dye.'),
  dyeBlue: I('Bluebell Dye', 'material', 'Materials', 'Bluebell-blue dye.'),
  dyeYellow: I('Buttercup Dye', 'material', 'Materials', 'Buttercup-yellow dye.'),
  bluebell: I('Bluebell', 'material', 'Materials', 'A nodding blue flower.'),
  buttercup: I('Buttercup', 'material', 'Materials', 'Hold it under your chin. Do you like butter?'),
  thimbleberry: I('Thimbleberry', 'food', 'Food', 'A berry shaped like a thimble. Belly +5.', { food: { belly: 5, hp: 0 } }),
  puffball: I('Puffball', 'material', 'Food', 'A round mushroom. Better roasted.'),
  roastPuffball: I('Roast Puffball', 'food', 'Food', 'Smoky and chewy. Belly +20, HP +5.', { food: { belly: 20, hp: 5 } }),
  bun: I('Thimbleberry Bun', 'food', 'Food', 'Sweet, sticky, splendid. Belly +35, HP +10.', { food: { belly: 35, hp: 10 } }),
  stew: I('Glen Stew', 'food', 'Food', 'A hearty bowl. Belly +60, HP +20.', { food: { belly: 60, hp: 20 } }),
  pie: I("Marigold's Hearty Pie", 'food', 'Food', 'Made with love and too much butter. Belly +100, full HP.', { food: { belly: 100, hp: 999 } }),
  darningStick: I('Darning Stick', 'weapon', 'Tools', 'A wooden darning stick. Pokes monsters, breaks soft blocks.', { atk: 3, blockDmg: 6, tier: 1, rig: 'stick', speed: 1 }),
  cobbleClub: I('Cobble Club', 'weapon', 'Tools', 'A stick with ambition. Breaks stone. Tier 2.', { atk: 7, blockDmg: 10, tier: 2, rig: 'club', speed: 1 }),
  copperBodkin: I('Copper Bodkin', 'weapon', 'Tools', 'A gleaming copper needle-sword. Quick and sharp.', { atk: 12, blockDmg: 12, tier: 2, rig: 'sword', speed: .9 }),
  seamRipper: I('Seam Ripper', 'weapon', 'Tools', 'The legendary tool. Cuts Black Knots. x4 against knots.', { atk: 9, blockDmg: 20, tier: 3, rig: 'ripper', speed: 1, ripper: true }),
  quiltedVest: I('Quilted Vest', 'body', 'Tools', 'A padded vest. Def +3.', { def: 3 }),
  copperBuckler: I('Copper Buckler', 'shield', 'Tools', 'A shiny little shield. Def +4.', { def: 4 }),
  heartpatch: I('Heartpatch', 'use', 'Key', 'A heart-shaped patch. Max HP +10 when used.'),
  banner: I('Banner of Mending', 'use', 'Key', 'Plant it where Thimbleton used to be.', { keyItem: true }),
  hallPattern: I("Pattern: Quilters' Hall", 'use', 'Key', 'A grand pattern. Place it inside the town border.', { keyItem: true }),
  goldenNeedle: I('Golden Needle', 'key', 'Key', 'The last Golden Needle. Forge it into a Seam Ripper.', { keyItem: true }),
  goldenThread: I('Golden Thread', 'key', 'Key', 'A fragment of the Golden Thread. Warm to the touch.', { keyItem: true }),
  ancientButton: I('Ancient Button', 'key', 'Key', 'A huge golden button from an older age.', { keyItem: true }),
  goldenThimble: I('Golden Thimble', 'key', 'Key', 'A gift of gratitude. Teaches Gilded Felt.', { keyItem: true }),
  // placeable objects
  bench: I('Mending Bench', 'object', 'Furniture', 'A crafting bench. Make all sorts of things here.', { obj: 'bench' }),
  torch: I('Wick Torch', 'object', 'Furniture', 'A stick with a lint wick. Counts as a room light.', { obj: 'torch' }),
  lantern: I('Moth Lantern', 'object', 'Furniture', 'A copper lantern full of moth glow. A bright light.', { obj: 'lantern' }),
  latticeDoor: I('Lattice Door', 'object', 'Furniture', 'Crossed branches on a hinge. A door! Rooms need one.', { obj: 'latticeDoor' }),
  plankDoor: I('Plank Door', 'object', 'Furniture', 'A sturdy door with a stitched heart.', { obj: 'plankDoor' }),
  strawBed: I('Straw Bed', 'object', 'Furniture', 'A bed! Residents adore beds. Sleep at night.', { obj: 'strawBed' }),
  table: I('Plank Table', 'object', 'Furniture', 'A table for suppers and gossip.', { obj: 'table' }),
  stool: I('Stool', 'object', 'Furniture', 'Three legs, no wobble. Mostly.', { obj: 'stool' }),
  chest: I('Storage Chest', 'object', 'Furniture', 'Holds 20 stacks. Make one the Town Chest.', { obj: 'chest' }),
  hearthPot: I('Hearth Pot', 'object', 'Furniture', 'A cooking pot over a fire. Cook food here.', { obj: 'hearthPot' }),
  forge: I('Thimble Forge', 'object', 'Furniture', 'A thimble-shaped furnace. Smelt and smith here.', { obj: 'forge' }),
  weaponRack: I('Weapon Rack', 'object', 'Furniture', 'Clubs at the ready. Makes a Guard Post.', { obj: 'weaponRack' }),
  pinTrap: I('Pin Trap', 'object', 'Furniture', 'A board of pins. Monsters hate it.', { obj: 'pinTrap' }),
  ballista: I('Bobbin Ballista', 'object', 'Furniture', 'A spool-bolt launcher. Man it to Tangle big foes.', { obj: 'ballista' })
};
for (const k in DQ.ITEMS) DQ.ITEMS[k].id = k;
DQ.item = k => DQ.ITEMS[k] || null;
DQ.CATS = ['Materials', 'Building', 'Furniture', 'Food', 'Tools', 'Key'];

// ---------------- RECIPES ----------------
// station: pocket | bench | hearth | forge. notion: { on, key } is when the idea arrives
const R = (id, station, inputs, out, n, notion, alt) => ({ id, station, inputs, out, n: n || 1, notion, alt });
DQ.RECIPES = [
  R('torch', 'pocket', { branch: 1, lint: 1 }, 'torch', 1, { on: 'pickup', key: 'lint' }),
  R('bench', 'pocket', { branch: 3, earth: 4 }, 'bench', 1, { on: 'flag', key: 'bannerPlanted' }),
  R('strawBed', 'bench', { straw: 4, cotton: 1 }, 'strawBed', 1, { on: 'pickup', key: 'straw' }),
  R('latticeDoor', 'bench', { branch: 3 }, 'latticeDoor', 1, { on: 'flag', key: 'bannerPlanted' }),
  R('chest', 'bench', { log: 2, branch: 2 }, 'chest', 1, { on: 'quest', key: 'm3' }),
  R('planks', 'bench', { log: 1 }, 'planks', 3, { on: 'pickup', key: 'log' }),
  R('thread', 'bench', { cotton: 2 }, 'thread', 2, { on: 'pickup', key: 'cotton' }),
  R('thatch', 'bench', { straw: 2 }, 'thatch', 3, { on: 'pickup', key: 'straw' }),
  R('dyeRed', 'bench', { thimbleberry: 2 }, 'dyeRed', 1, { on: 'level', key: 3 }),
  R('dyeBlue', 'bench', { bluebell: 2 }, 'dyeBlue', 1, { on: 'level', key: 3 }),
  R('dyeYellow', 'bench', { buttercup: 2 }, 'dyeYellow', 1, { on: 'level', key: 3 }),
  R('cobbleClub', 'bench', { branch: 2, pebble: 3 }, 'cobbleClub', 1, { on: 'pickup', key: 'pebble' }),
  R('cobble', 'bench', { stone: 1, earth: 1 }, 'cobble', 2, { on: 'level', key: 2 }),
  R('stool', 'bench', { planks: 2 }, 'stool', 1, { on: 'level', key: 2 }),
  R('table', 'bench', { planks: 4 }, 'table', 1, { on: 'level', key: 2 }),
  R('plankDoor', 'bench', { planks: 2, thread: 1 }, 'plankDoor', 1, { on: 'level', key: 2 }),
  R('weaponRack', 'bench', { planks: 3, pebble: 2 }, 'weaponRack', 1, { on: 'quest', key: 'm6start' }),
  R('stairsPlank', 'bench', { planks: 2 }, 'stairsPlank', 2, { on: 'level', key: 2 }),
  R('stairsCobble', 'bench', { cobble: 2 }, 'stairsCobble', 2, { on: 'level', key: 3 }),
  R('quiltedVest', 'bench', { cotton: 4, thread: 2 }, 'quiltedVest', 1, { on: 'level', key: 3 }),
  R('feltRed', 'bench', { cotton: 2, dyeRed: 1 }, 'feltRed', 4, { on: 'level', key: 3 }),
  R('feltBlue', 'bench', { cotton: 2, dyeBlue: 1 }, 'feltBlue', 4, { on: 'level', key: 3 }),
  R('feltYellow', 'bench', { cotton: 2, dyeYellow: 1 }, 'feltYellow', 4, { on: 'level', key: 3 }),
  R('hearthPot', 'bench', { stone: 4, coal: 1 }, 'hearthPot', 1, { on: 'quest', key: 'm8start' }, { stone: 4, frayedScrap: 1 }),
  R('forge', 'bench', { stone: 6, coal: 2, cobble: 2 }, 'forge', 1, { on: 'quest', key: 'm9start' }),
  R('pinTrap', 'bench', { pins: 3, planks: 1 }, 'pinTrap', 2, { on: 'level', key: 4 }),
  R('glow', 'bench', { mothDust: 1, feltYellow: 1 }, 'glow', 2, { on: 'pickup', key: 'mothDust', level: 3 }),
  R('lantern', 'bench', { copperIngot: 1, mothDust: 1, thread: 1 }, 'lantern', 1, { on: 'level', key: 4 }),
  R('gildedFelt', 'bench', { feltYellow: 2, copperIngot: 1 }, 'gildedFelt', 4, { on: 'quest', key: 's3' }, { feltYellow: 2, blackYarn: 1 }),
  R('roastPuffball', 'hearth', { puffball: 1 }, 'roastPuffball', 1, { on: 'pickup', key: 'puffball' }),
  R('bun', 'hearth', { thimbleberry: 2, grain: 1 }, 'bun', 1, { on: 'placed', key: 'hearthPot' }),
  R('stew', 'hearth', { puffball: 2, thimbleberry: 1, grain: 1 }, 'stew', 1, { on: 'quest', key: 'm8' }),
  R('copperIngot', 'forge', { copperOre: 1, coal: 1 }, 'copperIngot', 1, { on: 'placed', key: 'forge' }),
  R('copperBodkin', 'forge', { copperIngot: 2, log: 1 }, 'copperBodkin', 1, { on: 'placed', key: 'forge' }),
  R('copperBuckler', 'forge', { copperIngot: 2, planks: 2 }, 'copperBuckler', 1, { on: 'placed', key: 'forge' }),
  R('ballista', 'forge', { log: 2, copperIngot: 2, steelThread: 2 }, 'ballista', 1, { on: 'quest', key: 'm10' }),
  R('seamRipper', 'forge', { goldenNeedle: 1, copperIngot: 2, steelThread: 2 }, 'seamRipper', 1, { on: 'pickup', key: 'goldenNeedle' })
];
DQ.recipe = id => DQ.RECIPES.find(r => r.id === id) || null;
DQ.STATIONS = { pocket: 'Pocket Notions', bench: 'Mending Bench', hearth: 'Hearth Pot', forge: 'Thimble Forge' };

// ---------------- OBJECTS ----------------
// solid: blocks bodies; h: its height (bodies stand on low solids); light: [radius, colour]; door: hp
DQ.OBJECTS = {
  bench: { name: 'Mending Bench', solid: true, h: 12, station: 'bench', shape: 'dqBench' },
  torch: { name: 'Wick Torch', solid: false, h: 14, light: [64, '#ffb060'], roomLight: true, shape: 'dqTorch' },
  lantern: { name: 'Moth Lantern', solid: false, h: 14, light: [96, '#ffe7a0'], roomLight: true, shape: 'dqLantern' },
  latticeDoor: { name: 'Lattice Door', solid: false, h: 32, door: 30, tall: 2, shape: null },
  plankDoor: { name: 'Plank Door', solid: false, h: 32, door: 50, tall: 2, shape: null },
  strawBed: { name: 'Straw Bed', solid: true, h: 6, bed: true, shape: 'dqBed' },
  table: { name: 'Plank Table', solid: true, h: 12, shape: 'dqTable' },
  stool: { name: 'Stool', solid: true, h: 8, seat: true, shape: 'dqStool' },
  chest: { name: 'Storage Chest', solid: true, h: 12, chest: true, shape: 'dqChest' },
  hearthPot: { name: 'Hearth Pot', solid: true, h: 14, station: 'hearth', light: [48, '#ff8040'], shape: 'dqHearth' },
  forge: { name: 'Thimble Forge', solid: true, h: 22, station: 'forge', light: [56, '#ff7030'], shape: 'dqForge' },
  weaponRack: { name: 'Weapon Rack', solid: true, h: 18, shape: 'dqRack' },
  pinTrap: { name: 'Pin Trap', solid: false, h: 2, trap: true, shape: 'dqPinTrap' },
  ballista: { name: 'Bobbin Ballista', solid: true, h: 14, ballista: 150, shape: null },
  banner: { name: 'Banner of Mending', solid: true, h: 40, light: [80, '#ffd870'], roomLight: true, banner: true, shape: null, fixed: true },
  portal: { name: 'Bobbin Portal', solid: false, h: 32, tall: 2, light: [40, '#c8a0ff'], portal: true, shape: null, fixed: true },
  cage: { name: 'Knot Cage', solid: true, h: 20, hp: 30, tier: 2, shape: 'dqCage', fixed: true },
  ancientButton: { name: 'Ancient Button', solid: false, h: 12, collect: 'ancientButton', shape: 'dqButton', fixed: true },
  lostBundle: { name: 'Lost Bundle', solid: false, h: 8, bundle: true, shape: 'dqBundle', fixed: true },
  threadPedestal: { name: 'Golden Thread', solid: true, h: 12, collect: 'goldenThread', shape: 'dqPedestal', fixed: true },
  supplyCrate: { name: 'Supply Crate', solid: true, h: 12, supply: true, shape: 'dqCrate', fixed: true },
  dummy: { name: 'Straw Dummy', solid: true, h: 24, shape: 'dqDummy', fixed: true },
  barrel: { name: 'Barrel', solid: true, h: 16, shape: 'barrel', prop: true, fixed: true },
  crate: { name: 'Crate', solid: true, h: 13, shape: 'crate', prop: true, fixed: true },
  sack: { name: 'Sack', solid: false, h: 10, shape: 'sack', prop: true, fixed: true },
  well: { name: 'Old Well', solid: true, h: 26, shape: 'well', prop: true, fixed: true },
  sign: { name: 'Signpost', solid: false, h: 22, shape: 'sign', prop: true, fixed: true },
  // plants: break in one hit with any tool, regrow after a day
  tuft: { name: 'Straw Tuft', plant: { straw: [1, 2], grain: [0, 1, .3] }, shape: 'dqTuft' },
  cottonPuff: { name: 'Cotton Puff', plant: { cotton: [2, 2] }, shape: 'dqCotton' },
  berryBush: { name: 'Thimbleberry Bush', plant: { thimbleberry: [2, 2] }, shape: 'dqBerry' },
  bluebell: { name: 'Bluebell', plant: { bluebell: [1, 1] }, shape: 'dqBluebell' },
  buttercup: { name: 'Buttercup', plant: { buttercup: [1, 1] }, shape: 'dqButtercup' },
  puffballPlant: { name: 'Puffball', plant: { puffball: [1, 1] }, shape: 'dqPuffball' },
  deadBush: { name: 'Dead Bush', plant: { branch: [1, 2] }, shape: 'dqDeadBush' }
};
for (const k in DQ.OBJECTS) { const o = DQ.OBJECTS[k]; o.id = k; if (o.plant) { o.solid = false; o.h = 8; } }

// shapes for the objects (the engine's object format; sized for the 26-unit hero)
Object.assign(E.SHAPES, {
  dqBench: { about: 'mending bench: plank table with pincushion, spools and scissors', mats: { t: 'oak', l: 'walnut', p: '#d04a6a', s: '#4a6ad0', y: '#e8c040', m: 'iron' },
    parts: [['box','t',[0,0,10],[14,10,2]], ['mirror','xy',['box','l',[5.5,3.5,0],[2,2,10]]], ['ball','p',[-3,-1,13.5],2.2,{sz:.7}], ['cyl','s',[3,-2,12],1.4,2.4], ['cyl','y',[4.5,1.5,12],1.4,2.4], ['box','m',[0,2.5,12],[4,.8,.6],{rot:30}]] },
  dqTorch: { about: 'wick torch: stick with lint wick', mats: { s: 'walnut', w: '#e8e0f0' }, parts: [['box','s',[0,0,0],[1.6,1.6,11]], ['ball','w',[0,0,12],2,{sz:.9}]], flames: [[0,0,13,4,6]] },
  dqLantern: { about: 'moth lantern: copper cage with glowing core', mats: { c: 'copper', g: { color: '#ffe7a0', glow: 1 } }, parts: [['box','c',[0,0,0],[6,6,1]], ['box','g',[0,0,1],[4,4,8]], ['mirror','xy',['box','c',[2.6,2.6,1],[1,1,8]]], ['box','c',[0,0,9],[6,6,1]], ['cyl','c',[0,0,10],1.6,2]] },
  dqBed: { about: 'straw bed with patchwork quilt', mats: { f: 'oak', s: 'straw', r: '#d04a4a', b: '#4a6ad0', p: 'linen' },
    parts: [['box','f',[0,0,0],[13,24,3]], ['box','s',[0,0,3],[12,23,2]], ['box','r',[0,3,5],[12.4,8,1.2]], ['box','b',[0,-4,5],[12.4,6,1.2]], ['box','r',[0,-9,5],[12.4,3,1.2]], ['box','p',[0,10,5],[9,4,2]], ['box','f',[0,11.5,3],[13,1.5,7]]] },
  dqTable: { about: 'plank table', mats: { t: 'planks', l: 'walnut' }, parts: [['box','t',[0,0,10],[15,15,2]], ['mirror','xy',['box','l',[5.5,5.5,0],[2,2,10]]]] },
  dqStool: { about: 'stool', mats: { w: 'oak', l: 'walnut' }, parts: [['cyl','w',[0,0,7],5,1.5], ['ring',3,3,['box','l',[0,0,0],[1.5,1.5,7]]]] },
  dqChest: { about: 'storage chest', mats: { w: 'oak', b: 'iron', l: 'gold' }, parts: [['box','w',[0,0,0],[14,10,8]], ['box','w',[0,0,8],[14,10,3]], ['mirror','x',['box','b',[5,0,0],[1.4,10.4,11.2]]], ['box','l',[0,-5.2,6],[2.4,.6,3]]] },
  dqHearth: { about: 'hearth pot: stone ring and iron pot', mats: { s: 'stone', p: 'iron', w: '#8ab0c0' }, parts: [['ring',8,6,['box','s',[0,0,0],[4,4,3]]], ['lathe','p',[0,0,3],[[0,0],[5,0],[6,4],[5.5,8],[0,8]]], ['cyl','w',[0,0,10.5],4.6,.6]], flames: [[0,0,2,8,6]] },
  dqForge: { about: 'thimble forge: thimble-shaped furnace with glowing mouth', mats: { m: 'copper', d: 'iron', g: { color: '#ff9040', glow: 1 } },
    parts: [['lathe','m',[0,0,0],[[0,0],[7.5,0],[7,12],[6,18],[4,21],[0,21]]], ['box','g',[0,-6.6,3],[6,1,6]], ['ring',10,6.8,['ball','d',[0,0,14],.8]]] },
  dqRack: { about: 'weapon rack with two clubs', mats: { w: 'planks', c: 'walnut', s: 'stone' }, parts: [['box','w',[0,0,0],[14,4,2]], ['mirror','x',['box','w',[6,0,0],[2,3,16]]], ['box','w',[0,0,14],[14,3,2]], ['mirror','x',['box','c',[2.5,-1,2],[2,2,13],{rot:[8,0,0]}]], ['mirror','x',['ball','s',[2.5,-2,14],2.2]]] },
  dqPinTrap: { about: 'board with coloured pin heads', mats: { w: 'planks', a: '#e84a4a', b: '#4a8ae8', c: '#e8d04a', p: 'steel' },
    parts: [['box','w',[0,0,0],[14,14,1.5]], ['row',3,[4,0,0],['box','p',[0,-4,1.5],[.5,.5,2.5]]], ['row',3,[4,0,0],['ball','a',[0,-4,4],1]], ['row',3,[4,0,0],['ball','b',[0,0,4],1]], ['row',3,[4,0,0],['ball','c',[0,4,4],1]], ['row',3,[4,0,0],['box','p',[0,0,1.5],[.5,.5,2.5]]], ['row',3,[4,0,0],['box','p',[0,4,1.5],[.5,.5,2.5]]]] },
  dqCage: { about: 'knot cage: black yarn bars', mats: { k: '#2a1a3a', t: '#5a3a6a' }, parts: [['box','k',[0,0,0],[14,14,2]], ['box','k',[0,0,18],[14,14,2]], ['ring',8,6.5,['cyl','t',[0,0,2],1,16]]] },
  dqButton: { about: 'ancient golden 4-hole button on a stand', mats: { g: 'gold', s: 'stone', d: '#8a6a20' }, parts: [['cyl','s',[0,0,0],4,2], ['cyl','g',[0,0,8],6,2,{rot:[90,0,0]}], ['mirror','xy',['cyl','d',[1.6,-1.2,9.6],.8,.6,{rot:[90,0,0]}]]] },
  dqBundle: { about: 'patch-sack bundle', mats: { b: '#c87a4a', p: '#4a6ad0', t: '#e8d0a0' }, parts: [['ball','b',[0,0,4],5,{sz:.8}], ['box','p',[1,-4.2,4],[3,.6,3]], ['cyl','t',[0,0,7.5],1.6,2]] },
  dqPedestal: { about: 'pedestal with the Golden Thread', mats: { s: 'marble', g: { color: '#ffd84a', glow: 1 } }, parts: [['cyl','s',[0,0,0],6,8,{seg:8}], ['cyl','s',[0,0,8],7,2,{seg:8}], ['cyl','g',[0,0,10],3,3], ['ball','g',[0,0,14],2]] },
  dqCrate: { about: 'supply crate of planks', mats: { w: 'crate', p: 'planks' }, parts: [['box','w',[0,0,0],[14,14,10]], ['box','p',[0,0,10],[12,6,2]]] },
  dqDummy: { about: 'straw training dummy', mats: { p: 'walnut', s: 'straw', c: '#c84a3a' }, parts: [['box','p',[0,0,0],[2,2,24]], ['ball','s',[0,0,14],5,{sz:1.3}], ['ball','s',[0,0,22],3.5], ['box','c',[0,0,17],[11,1.5,1.5]]] },
  dqTuft: { about: 'straw tuft', mats: { s: '#d8b850', g: '#8ab040' }, parts: [['ring',6,2.5,['box','s',[0,0,0],[1,1,7],{rot:[12,0,0]}]], ['ring',4,1.2,['box','g',[0,0,0],[1,1,5]]]] },
  dqCotton: { about: 'cotton puff plant', mats: { s: '#6a8a4a', c: '#fbf8f0' }, parts: [['box','s',[0,0,0],[1,1,8]], ['ring',3,3,['box','s',[0,0,2],[.8,.8,5],{rot:[20,0,0]}]], ['ball','c',[0,0,9],2.5], ['ring',3,3.5,['ball','c',[0,0,7],2]]] },
  dqBerry: { about: 'thimbleberry bush', mats: { l: 'shrub', b: '#d83a5a' }, parts: [['ball','l',[0,0,5],6,{sz:.8}], ['ring',5,4.5,['ball','b',[0,0,6],1.2]], ['ball','b',[1,-2,9.5],1.2]] },
  dqBluebell: { about: 'bluebells', mats: { s: '#5a9a4a', b: '#5a7ae0' }, parts: [['ring',3,2,['box','s',[0,0,0],[.6,.6,6]]], ['ring',3,2,['ball','b',[0,0,6],1.4]]] },
  dqButtercup: { about: 'buttercups', mats: { s: '#5a9a4a', b: '#f0d030' }, parts: [['ring',4,2.2,['box','s',[0,0,0],[.6,.6,5]]], ['ring',4,2.2,['cyl','b',[0,0,5],1.5,.8]]] },
  dqPuffball: { about: 'puffball mushroom', mats: { p: '#e8dcc8', s: '#c8b898', d: '#a89878' }, parts: [['cyl','s',[0,0,0],1.6,3], ['ball','p',[0,0,5],4,{sz:.75}], ['ball','d',[3,2,2],1.8]] },
  dqDeadBush: { about: 'dead bush of branches', mats: { b: '#7a5a3a' }, parts: [['ring',5,1,['box','b',[0,0,0],[1,1,8],{rot:[25,0,0]}]], ['ring',3,2.5,['box','b',[0,0,4],[.8,.8,5],{rot:[-30,0,0]}]]] }
});

// ---------------- ROOMS (priority order) ----------------
DQ.ROOMS = [
  { id: 'hall', name: "Quilters' Hall", cheer: 100, max: 1, need: r => r.pattern === 'hall' && r.size >= 50 },
  { id: 'guardPost', name: 'Guard Post', cheer: 30, max: 1, need: r => r.has.weaponRack >= 1 && r.lights >= 2 },
  { id: 'smithy', name: 'Smithy', cheer: 30, max: 1, need: r => r.has.forge >= 1 && r.has.chest >= 1 },
  { id: 'kitchen', name: 'Kitchen', cheer: 25, max: 1, need: r => r.has.hearthPot >= 1 && r.has.chest >= 1 },
  { id: 'messHall', name: 'Mess Hall', cheer: 25, max: 1, need: r => r.has.table >= 1 && r.has.stool >= 2 },
  { id: 'workshop', name: 'Workshop', cheer: 25, max: 1, need: r => r.has.bench >= 1 && r.has.chest >= 1 },
  { id: 'bedroom', name: 'Bedroom', cheer: 20, max: 3, need: r => r.has.strawBed >= 1 },
  { id: 'snug', name: 'Snug', cheer: 5, max: 3, need: () => true }
];
DQ.room = id => DQ.ROOMS.find(r => r.id === id);

// ---------------- TOWN LEVELS ----------------
DQ.LEVELS = [
  null,
  { lv: 1, cheer: 0, r: 10, unlocks: ['Mending Bench', 'Lattice Door', 'Straw Bed'], arrives: 'wren' },
  { lv: 2, cheer: 40, r: 13, unlocks: ['Cobble Patch', 'Stool', 'Plank Table', 'Plank Door', 'Plank Stairs', 'Town Chest'], arrives: 'mortimer' },
  { lv: 3, cheer: 130, r: 16, unlocks: ['Dyes', 'Felt Patches', 'Quilted Vest', 'Cobble Stairs', 'Glow Patch'], arrives: 'marigold' },
  { lv: 4, cheer: 250, r: 18, unlocks: ['Pin Trap', 'Moth Lantern'], arrives: 'professor' },
  { lv: 5, cheer: 450, r: 20, unlocks: ['Chapter clear!', 'Hearty Pie for everyone'], arrives: null }
];
})();
