// Data: items (materials, blocks, food, gear, key items, furniture) and recipes with their Notion triggers.
// kind: block | mat | food | weapon | body | shield | use | key | obj ; cat: the Bag's strip.
(() => {
const DQ = globalThis.DQ;
const ITEMS = DQ.ITEMS = {};
const I = (id, name, kind, cat, o = {}) => { ITEMS[id] = Object.assign({ id, name, kind, cat, stack: 99 }, o); return ITEMS[id]; };
// icon palettes are short: one letter per colour
const ic = (rows, pal) => ({ rows, pal });
// ---- blocks (their icon is a little cube of the block) ----
for (const k of ['earth', 'sand', 'stone', 'log', 'cobble', 'planks', 'thatch', 'feltRed', 'feltBlue', 'feltYellow', 'glow', 'stairsPlank', 'stairsCobble', 'gildedFelt']) {
  const b = DQ.BLOCKS[DQ.blockId(k)];
  I(k, b.name, 'block', 'building', { block: b.id, desc: b.desc });
}
// ---- materials ----
I('pebble', 'Pebble', 'mat', 'materials', { desc: 'A little stone with big dreams.', icon: ic(['....aaa.....', '...abbba....', '..abbcbba...', '..abccccba..', '..abbccbba..', '...abbbbba..', '....aaaaa...'], { a: '#4a4652', b: '#8a8694', c: '#c4c0cc' }) });
I('copperOre', 'Copper Ore', 'mat', 'materials', { desc: 'A lump of tweed studded with copper sequins.', icon: ic(['...aaaa.....', '..abbbbaa...', '.abcbbdbba..', '.abbbbbcba..', '.abdbcbbba..', '..abbbbba...', '...aaaaa....'], { a: '#4a4652', b: '#8a8694', c: '#e8954a', d: '#ffd0a0' }) });
I('coal', 'Charcloth', 'mat', 'materials', { desc: 'Black felt that burns hot and slow.', icon: ic(['....aaa.....', '..aabbbaa...', '.abbcbbbba..', '.abbbbbcba..', '..abbbbba...', '...aaaaa....'], { a: '#14101a', b: '#2e2836', c: '#5a5266' }) });
I('branch', 'Branch', 'mat', 'materials', { desc: 'A crooked stick. Every builder\'s best friend.', icon: ic(['.........ab.', '........ab..', '.......ab...', '...ab.ab....', '....aab.....', '....ab......', '...ab.......', '..ab........'], { a: '#5a3a22', b: '#9a6a3a' }) });
I('straw', 'Straw', 'mat', 'materials', { desc: 'Golden and scratchy. Lovely for beds.', icon: ic(['..a.b.a.b...', '..a.b.ab....', '...ab.ab....', '...abab.....', '...cccc.....', '...abab.....', '..ab..ba....', '..a....a....'], { a: '#c89a30', b: '#f0d070', c: '#8a5a2a' }) });
I('grain', 'Wild Grain', 'mat', 'food', { desc: 'Plump little grains. Good in buns and stews.', icon: ic(['....ab......', '...abab.....', '....ab.ab...', '...ab.abab..', '....c..ab...', '....c..c....', '....c.c.....', '....cc......'], { a: '#c8a040', b: '#f0d890', c: '#6a8a3a' }) });
I('cotton', 'Cotton Puff', 'mat', 'materials', { desc: 'Soft as a cloud and twice as useful.', icon: ic(['...aaa......', '..abbbaaa...', '.abbbbbbba..', '.abbbbbbbba.', '.aabbbbbba..', '...aaaaaa...', '....c..c....'], { a: '#c8c0d8', b: '#fffaff', c: '#6a8a3a' }) });
I('thread', 'Thread', 'mat', 'materials', { desc: 'A neat spool of cotton thread.', icon: ic(['..aaaaaa....', '...bcbcb....', '...cbcbc....', '...bcbcb....', '...cbcbc....', '..aaaaaa....'], { a: '#8a5a32', b: '#f4eedc', c: '#d0c8b0' }) });
I('lint', 'Lint', 'mat', 'materials', { desc: 'Fluffy, flammable, faintly judgemental.', icon: ic(['...a.a......', '..abbba.....', '.abbcbba....', '.abcbbbaa...', '..abbbba....', '...aaa.a....'], { a: '#8a8498', b: '#cfcad6', c: '#f4f2f8' }) });
I('mothDust', 'Moth Dust', 'mat', 'materials', { desc: 'It shimmers. It also makes you sneeze.', icon: ic(['....a.......', '..a...b.a...', '....bab.....', '.a.bacab.a..', '....bab.....', '..a..b..a...', '....a.......'], { a: '#9a8ac8', b: '#d8c8f8', c: '#ffffff' }) });
I('pins', 'Pins', 'mat', 'materials', { desc: 'A bundle of pins. Ouch.', icon: ic(['..a...b.....', '...c.c..d...', '....cc.c....', '....ccc.....', '...c.cc.....', '..c...c.....'], { a: '#e84a4a', b: '#4a8ae8', c: '#c8ccd8', d: '#f0c040' }) });
I('steelThread', 'Steel Thread', 'mat', 'materials', { desc: 'Thread spun from steel. It hums when plucked.', icon: ic(['..aaaaaa....', '...bcbcb....', '...cbcbc....', '...bcbcb....', '..aaaaaa....'], { a: '#3a3a4a', b: '#e8ecf4', c: '#9aa0b0' }) });
I('blackYarn', 'Black Yarn', 'mat', 'materials', { desc: 'Tangled beyond all reason.', icon: ic(['...aaaa.....', '..abcbba....', '.abcbcbba...', '.acbcbcba...', '.abcbcbba...', '..abbbba.c..', '...aaaa...c.'], { a: '#14101e', b: '#3a2a50', c: '#6a5a8a' }) });
I('frayedScrap', 'Frayed Scrap', 'mat', 'materials', { desc: 'A tatter of frayed cloth. It burns in a pinch.', icon: ic(['.a.a.a......', '.bbbbbb.....', '.bcbbcbb....', '.bbbcbbb....', '..bbbbbb....', '..a.a..a....'], { a: '#c8b890', b: '#5a3a5a', c: '#7a5a7a' }) });
I('copperIngot', 'Copper Ingot', 'mat', 'materials', { desc: 'A gleaming bar of copper. Smells of pennies.', icon: ic(['............', '....aaaaaa..', '...abbbbca..', '..abbbbca...', '..aaaaaaa...'], { a: '#7a3a1a', b: '#d07a3a', c: '#ffc890' }) });
I('dyeRed', 'Rose Dye', 'mat', 'materials', { desc: 'A little pot of rosy red.', icon: ic(['....aa......', '...abba.....', '..accccа....'.replace('а', 'a'), '..acddca....', '..acccca....', '...aaaa.....'], { a: '#3a2a3a', b: '#8a7a6a', c: '#d04a4a', d: '#ff9a8a' }) });
I('dyeBlue', 'Bluebell Dye', 'mat', 'materials', { desc: 'A little pot of bluebell blue.', icon: ic(['....aa......', '...abba.....', '..acccca....', '..acddca....', '..acccca....', '...aaaa.....'], { a: '#3a2a3a', b: '#8a7a6a', c: '#4a6ad0', d: '#9ab0ff' }) });
I('dyeYellow', 'Buttercup Dye', 'mat', 'materials', { desc: 'A little pot of buttercup yellow.', icon: ic(['....aa......', '...abba.....', '..acccca....', '..acddca....', '..acccca....', '...aaaa.....'], { a: '#3a2a3a', b: '#8a7a6a', c: '#e8c040', d: '#fff0a0' }) });
I('bluebell', 'Bluebell', 'mat', 'materials', { desc: 'A nodding blue flower.', icon: ic(['...aa.......', '..abba......', '..abba......', '...cc.......', '....c.aa....', '....cabba...', '....c.cc....', '....c.c.....'], { a: '#2a3a8a', b: '#6a8ae8', c: '#3a7a3a' }) });
I('buttercup', 'Buttercup', 'mat', 'materials', { desc: 'Hold it under your chin. Do you like butter?', icon: ic(['...a.a......', '..abcba.....', '...aba......', '....d.......', '....d.......', '...dd.......'], { a: '#c89a10', b: '#f8e060', c: '#fff8c0', d: '#3a7a3a' }) });
I('thimbleberry', 'Thimbleberry', 'food', 'food', { food: { belly: 5, hp: 0 }, desc: 'A berry shaped like a tiny thimble. Tart!', icon: ic(['....cc......', '...aaaa.....', '..abbbba....', '..abdbba....', '..abbbba....', '...aaaa.....'], { a: '#8a1a2a', b: '#d83a4a', c: '#4a8a3a', d: '#ffb0b0' }) });
I('puffball', 'Puffball', 'food', 'food', { food: { belly: 3, hp: 0 }, desc: 'A round mushroom. Better cooked.', icon: ic(['...aaaa.....', '..abbbba....', '.abbcbbba...', '.abbbbbba...', '..aaaaaa....', '....dd......', '....dd......'], { a: '#a89070', b: '#f0e0c0', c: '#ffffff', d: '#d8c8a8' }) });
I('roastPuffball', 'Roast Puffball', 'food', 'food', { food: { belly: 20, hp: 5 }, desc: 'Toasty and nutty. Tastes like a campfire hug.', icon: ic(['...aaaa.....', '..abbbba....', '.abbcbbba...', '.abbbbbba...', '..aaaaaa....', '....dd......'], { a: '#6a4020', b: '#c88a4a', c: '#f0c080', d: '#8a6040' }) });
I('bun', 'Thimbleberry Bun', 'food', 'food', { food: { belly: 35, hp: 10 }, desc: 'A sweet bun with berries baked in. Mmm!', icon: ic(['...aaaaa....', '..abbcbba...', '.abcbbbcba..', '.abbbbbbba..', '.aaaaaaaaa..'], { a: '#8a5020', b: '#e0a050', c: '#d83a4a' }) });
I('stew', 'Glen Stew', 'food', 'food', { food: { belly: 60, hp: 20 }, desc: 'A hearty stew. It sticks to your seams.', icon: ic(['..c.c.c.....', '...c.c......', '.aaaaaaaa...', '.abddedba...', '..abbbba....', '...aaaa.....'], { a: '#3a2a2a', b: '#6a5a5a', c: '#e8e8f0', d: '#c87a3a', e: '#6aa04a' }) });
I('pie', 'Marigold\'s Hearty Pie', 'food', 'food', { food: { belly: 100, hp: 999 }, desc: 'The best pie in the Patchwork Realm. Fills you right up!', icon: ic(['...aaaaa....', '..abcbcba...', '.abcbcbcba..', '.abbbbbbba..', '.ddddddddd..'], { a: '#8a5020', b: '#e8b060', c: '#c84a3a', d: '#f0f0f0' }) });
I('darningStick', 'Darning Stick', 'weapon', 'tools', { weapon: { atk: 3, blockDmg: 6, tier: 1, speed: 1, rig: 'needle', color: '#c8ccd8' }, desc: 'A big darning needle. Pokes monsters, picks at blocks.', icon: ic(['.........aa.', '........aba.', '.......aba..', '......aba...', '.....aba....', '....aba.....', '...cca......', '..cc........'], { a: '#5a5a6a', b: '#e8ecf4', c: '#8a5a32' }) });
I('cobbleClub', 'Cobble Club', 'weapon', 'tools', { weapon: { atk: 7, blockDmg: 10, tier: 2, speed: 1, rig: 'club', color: '#9a9aa8' }, desc: 'A stick with ambition, and a rock on the end.', icon: ic(['.......aaa..', '......abbba.', '......abcba.', '.....aabba..', '....aaa.....', '...aa.......', '..aa........'], { a: '#4a3a3a', b: '#9a9aa8', c: '#d0d0dc' }) });
I('copperBodkin', 'Copper Bodkin', 'weapon', 'tools', { weapon: { atk: 12, blockDmg: 12, tier: 2, speed: .9, rig: 'bodkin', color: '#d07a3a' }, desc: 'A copper blade with a bodkin point. Quick and keen.', icon: ic(['.........ab.', '........abc.', '.......abc..', '......abc...', '...d.abc....', '....ddc.....', '...dd.d.....', '..ee........'], { a: '#7a3a1a', b: '#ffc890', c: '#d07a3a', d: '#5a3a22', e: '#3a2a1a' }) });
I('seamRipper', 'Seam Ripper', 'weapon', 'tools', { weapon: { atk: 9, blockDmg: 20, tier: 3, speed: 1, rig: 'ripper', color: '#f0d060', knot: 4 }, desc: 'A golden seam ripper. No knot in the world can hold against it.', icon: ic(['........a.a.', '........aba.', '.......abba.', '......abb...', '.....abb....', '....cca.....', '...ccc......', '..cc........'], { a: '#8a6a10', b: '#ffe070', c: '#c84a4a' }) });
I('quiltedVest', 'Quilted Vest', 'body', 'tools', { def: 3, desc: 'A padded vest. Cosy AND protective!', icon: ic(['..aa..aa....', '.abba.abba..', '.abbbabbba..', '.abcbbbcba..', '.abbbcbbba..', '.abcbbbcba..', '.aaaaaaaaa..'], { a: '#3a3a6a', b: '#6a7ad0', c: '#f1e6c8' }) });
I('copperBuckler', 'Copper Buckler', 'shield', 'tools', { def: 4, desc: 'A round copper shield. It goes "bong".', icon: ic(['...aaaa.....', '..abbbba....', '.abbccbba...', '.abcddcba...', '.abbccbba...', '..abbbba....', '...aaaa.....'], { a: '#5a2a10', b: '#d07a3a', c: '#e8a060', d: '#ffe0b0' }) });
I('heartpatch', 'Heartpatch', 'use', 'tools', { desc: 'A heart-shaped patch. Sew it on for +10 max HP!', icon: ic(['.aa...aa....', 'abba.abba...', 'abbbabbba...', 'abcbbbbba...', '.abbbbba....', '..abbba.....', '...aba......', '....a.......'], { a: '#8a1a3a', b: '#e84a6a', c: '#ffb0c0' }) });
I('banner', 'Banner of Mending', 'key', 'key', { stack: 1, desc: 'Plant it where Thimbleton used to be. Folks always come for a light.', icon: ic(['.a..........', '.abbbbb.....', '.abcccb.....', '.abcdcb.....', '.abcccb.....', '.abbbbb.....', '.a.b.b......', '.a..........', '.a..........'], { a: '#8a6a3a', b: '#c84a3a', c: '#f0d070', d: '#ffffff' }) });
I('hallPattern', 'Pattern: Quilters\' Hall', 'key', 'key', { stack: 1, desc: 'A schematic of considerable grandeur. And considerable lumber.', icon: ic(['.aaaaaaaa...', '.abbbbbba...', '.abccccba...', '.abcbbcba...', '.abcbbcba...', '.abbbbbba...', '.aaaaaaaa...'], { a: '#6a5a3a', b: '#f4eedc', c: '#4a6ad0' }) });
I('goldenNeedle', 'Golden Needle', 'key', 'key', { stack: 1, desc: 'The last Golden Needle in the realm. It glints.', icon: ic(['..........a.', '.........aba', '........aba.', '.......aba..', '......aba...', '.....aba....', '....aa......', '...a........'], { a: '#8a6a10', b: '#ffe070' }) });
I('goldenThread', 'Golden Thread', 'key', 'key', { stack: 1, desc: 'A fragment of the Golden Thread. It hums with Knack.', icon: ic(['..a.....a...', '.aba...aba..', '..aba.aba...', '...abab.....', '....aba.....', '...ab.ba....', '..ab...ba...'], { a: '#c89a10', b: '#fff0a0' }) });
I('ancientButton', 'Ancient Button', 'key', 'key', { stack: 9, desc: 'A huge old button, from before the Fraying.', icon: ic(['...aaaa.....', '..abbbba....', '.abcbbcba...', '.abbbbbba...', '.abcbbcba...', '..abbbba....', '...aaaa.....'], { a: '#8a6a10', b: '#e8c040', c: '#5a4010' }) });
I('goldenThimble', 'Golden Thimble', 'key', 'key', { stack: 1, desc: 'A thimble of solid gold. Your fingers feel braver: +2 attack while you carry it.', icon: ic(['...aaaa.....', '..abcbca....', '..acbcba....', '..abcbca....', '.aaaaaaaa...', '.abbbbbba...'], { a: '#8a6a10', b: '#e8c040', c: '#fff0a0' }) });
// ---- furniture and stations (objects; their icon is the object drawn small) ----
const OBJ_ITEMS = { bench: 'Mending Bench', torch: 'Wick Torch', lantern: 'Moth Lantern', latticeDoor: 'Lattice Door', plankDoor: 'Plank Door', strawBed: 'Straw Bed',
  table: 'Plank Table', stool: 'Stool', chest: 'Storage Chest', hearthPot: 'Hearth Pot', forge: 'Thimble Forge', weaponRack: 'Weapon Rack', pinTrap: 'Pin Trap', ballista: 'Bobbin Ballista' };
const OBJ_DESC = { bench: 'A sturdy bench with a pincushion. Craft wonders here!', torch: 'A stick with a lint wick. A room needs a light!', lantern: 'A copper cage of glowing moth dust. Ever so pretty.',
  latticeDoor: 'Crossed branches on a hinge. A room needs a door!', plankDoor: 'A proper plank door with a stitched heart.', strawBed: 'A straw bed with a patchwork quilt. Do beds bite? No!',
  table: 'A plank table, for suppers and elbows.', stool: 'Somewhere to perch.', chest: 'A chest with twenty slots. Tidy!', hearthPot: 'A pot on a stone ring. Cook here!',
  forge: 'A giant thimble that glows hot. Smelt and smith here!', weaponRack: 'A rack for clubs. Every guard post needs one.', pinTrap: 'A board bristling with pins. Monsters hate it.', ballista: 'A bobbin-powered bolt thrower. Man it and fire!' };
for (const k in OBJ_ITEMS) I(k, OBJ_ITEMS[k], 'obj', 'furniture', { obj: k, desc: OBJ_DESC[k] });
for (const k of ['bench', 'hearthPot', 'forge']) ITEMS[k].cat = 'furniture';
DQ.item = id => ITEMS[id] || null;
DQ.itemName = id => (ITEMS[id] && ITEMS[id].name) || id;

// ---- recipes: station, inputs -> output, the Notion that teaches it ----
// notion.on: start | pickup (item key) | level (n) | quest (id) | flag (key) | placed (object) ; alt: an input that may stand in for another
const RECIPES = DQ.RECIPES = [];
const R = (id, station, inp, out, n, notion, o = {}) => RECIPES.push(Object.assign({ id, station, in: inp, out, n, notion }, o));
R('torch', 'pocket', { branch: 1, lint: 1 }, 'torch', 1, { on: 'pickup', key: 'lint' });
R('bench', 'pocket', { branch: 3, earth: 4 }, 'bench', 1, { on: 'flag', key: 'bannerPlanted' });
R('strawBed', 'bench', { straw: 4, cotton: 1 }, 'strawBed', 1, { on: 'pickup', key: 'straw' });
R('latticeDoor', 'bench', { branch: 3 }, 'latticeDoor', 1, { on: 'flag', key: 'bannerPlanted' });
R('chest', 'bench', { log: 2, branch: 2 }, 'chest', 1, { on: 'quest', key: 'M3' });
R('planks', 'bench', { log: 1 }, 'planks', 3, { on: 'pickup', key: 'log' });
R('thread', 'bench', { cotton: 2 }, 'thread', 2, { on: 'pickup', key: 'cotton' });
R('thatch', 'bench', { straw: 2 }, 'thatch', 3, { on: 'pickup', key: 'straw' });
R('dyeRed', 'bench', { thimbleberry: 2 }, 'dyeRed', 1, { on: 'level', key: 3 });
R('dyeBlue', 'bench', { bluebell: 2 }, 'dyeBlue', 1, { on: 'level', key: 3 });
R('dyeYellow', 'bench', { buttercup: 2 }, 'dyeYellow', 1, { on: 'level', key: 3 });
R('cobbleClub', 'bench', { branch: 2, pebble: 3 }, 'cobbleClub', 1, { on: 'pickup', key: 'pebble' });
R('cobble', 'bench', { stone: 1, earth: 1 }, 'cobble', 2, { on: 'level', key: 2 });
R('stool', 'bench', { planks: 2 }, 'stool', 1, { on: 'level', key: 2 });
R('table', 'bench', { planks: 4 }, 'table', 1, { on: 'level', key: 2 });
R('plankDoor', 'bench', { planks: 2, thread: 1 }, 'plankDoor', 1, { on: 'level', key: 2 });
R('weaponRack', 'bench', { planks: 3, pebble: 2 }, 'weaponRack', 1, { on: 'quest', key: 'M6start' });
R('stairsPlank', 'bench', { planks: 2 }, 'stairsPlank', 2, { on: 'level', key: 2 });
R('stairsCobble', 'bench', { cobble: 2 }, 'stairsCobble', 2, { on: 'level', key: 3 });
R('quiltedVest', 'bench', { cotton: 4, thread: 2 }, 'quiltedVest', 1, { on: 'level', key: 3 });
R('feltRed', 'bench', { cotton: 2, dyeRed: 1 }, 'feltRed', 4, { on: 'level', key: 3 });
R('feltBlue', 'bench', { cotton: 2, dyeBlue: 1 }, 'feltBlue', 4, { on: 'level', key: 3 });
R('feltYellow', 'bench', { cotton: 2, dyeYellow: 1 }, 'feltYellow', 4, { on: 'level', key: 3 });
R('hearthPot', 'bench', { stone: 4, coal: 1 }, 'hearthPot', 1, { on: 'quest', key: 'M8start' }, { alt: { coal: 'frayedScrap' } });
R('forge', 'bench', { stone: 6, coal: 2, cobble: 2 }, 'forge', 1, { on: 'quest', key: 'M9start' });
R('pinTrap', 'bench', { pins: 3, planks: 1 }, 'pinTrap', 2, { on: 'level', key: 4 });
R('glow', 'bench', { mothDust: 1, feltYellow: 1 }, 'glow', 2, { on: 'pickup', key: 'mothDust', level: 3 });
R('lantern', 'bench', { copperIngot: 1, mothDust: 1, thread: 1 }, 'lantern', 1, { on: 'level', key: 4 });
R('gildedFelt', 'bench', { feltYellow: 2, copperIngot: 1 }, 'gildedFelt', 4, { on: 'quest', key: 'S3' }, { alt: { copperIngot: 'blackYarn' } });
R('roastPuffball', 'hearth', { puffball: 1 }, 'roastPuffball', 1, { on: 'pickup', key: 'puffball' });
R('bun', 'hearth', { thimbleberry: 2, grain: 1 }, 'bun', 1, { on: 'placed', key: 'hearthPot' });
R('stew', 'hearth', { puffball: 2, thimbleberry: 1, grain: 1 }, 'stew', 1, { on: 'quest', key: 'M8' });
R('copperIngot', 'forge', { copperOre: 1, coal: 1 }, 'copperIngot', 1, { on: 'placed', key: 'forge' }, { alt: { coal: 'frayedScrap' } });
R('copperBodkin', 'forge', { copperIngot: 2, log: 1 }, 'copperBodkin', 1, { on: 'placed', key: 'forge' });
R('copperBuckler', 'forge', { copperIngot: 2, planks: 2 }, 'copperBuckler', 1, { on: 'placed', key: 'forge' });
R('ballista', 'forge', { log: 2, copperIngot: 2, steelThread: 2 }, 'ballista', 1, { on: 'quest', key: 'M10' });
R('seamRipper', 'forge', { goldenNeedle: 1, copperIngot: 2, steelThread: 2 }, 'seamRipper', 1, { on: 'pickup', key: 'goldenNeedle' });
DQ.recipe = id => RECIPES.find(r => r.id === id) || null;
DQ.STATIONS = { pocket: 'Pocket Notions', bench: 'Mending Bench', hearth: 'Hearth Pot', forge: 'Thimble Forge' };
})();
