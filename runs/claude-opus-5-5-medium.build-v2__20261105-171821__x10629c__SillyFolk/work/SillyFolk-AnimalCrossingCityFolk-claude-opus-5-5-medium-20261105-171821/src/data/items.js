// All items as data. Adding a fish, bug or chair means one entry here (and optionally a model def).
const FISH = [
  // id, name, beans, where, seasons, hours [from,to], shadow, rare, line, colour, shape
  ['minnow', 'Minnow', 60, 'river', '012', null, 'S', 0, "That's… that's all of it.", 'mist'],
  ['perch', 'Perch', 150, 'river', '0123', [5, 19], 'S', 0, 'It was just sitting there. On purpose.', 'lime'],
  ['crawfish', 'Crawfish', 200, 'pond', '01', null, 'S', 0, 'It has opinions about your thumbs.', 'red'],
  ['carp', 'Carp', 300, 'pond', '0123', null, 'M', 0, "Carp diem! …Sorry. It made me say that.", 'orange'],
  ['trout', 'Trout', 400, 'river', '02', null, 'M', 0, "It isn't pouting. That's just its face.", 'sky'],
  ['catfish', 'Catfish', 800, 'pond', '12', [18, 5], 'L', 0, 'It claims to be a different catfish online.', 'slate'],
  ['pike', 'Pike', 900, 'river', '23', null, 'L', 0, 'Someone should tell it about the other end of the hook.', 'green'],
  ['eel', 'Eel', 1200, 'river', '12', [17, 4], 'M', 0, 'Slippery. Also, it knows what you did.', 'navy'],
  ['salmon', 'Salmon', 1500, 'mouth', '2', null, 'L', 0, 'It came all this way and now look.', 'red'],
  ['goldcarp', 'Golden Carp', 5000, 'pond', '0', [5, 9], 'L', 1, 'It looks expensive and it knows.', 'sand'],
  ['sturgeon', 'Sturgeon', 6000, 'mouth', '3', null, 'XL', 1, 'Older than the Mayor. Slightly faster.', 'night'],
  ['sardine', 'Sardine', 100, 'sea', '0123', null, 'S', 0, 'Comes with its own sense of confinement.', 'sky'],
  ['mackerel', 'Mackerel', 250, 'sea', '12', null, 'M', 0, 'Holy it.', 'teal'],
  ['bream', 'Sea Bream', 500, 'sea', '01', null, 'M', 0, 'Very calm. Suspiciously calm.', 'orange'],
  ['flounder', 'Flounder', 700, 'sea', '0123', null, 'L', 0, 'Both eyes on you. Literally.', 'sand'],
  ['puffer', 'Pufferfish', 1800, 'sea', '1', [17, 4], 'M', 0, "It's taking this very personally.", 'lime'],
  ['moonfish', 'Moonfish', 4000, 'sea', '12', [21, 4], 'XL', 1, "It's bigger than your whole debt. Almost.", 'white'],
];
const BUGS = [
  // id, name, beans, spot, seasons, hours, rare, line, colour, shape
  ['cabbagefly', 'Cabbage Butterfly', 90, 'flower', '01', [6, 18], 0, "It's very sorry about the cabbage.", 'white', 'fly'],
  ['pillbug', 'Pill Bug', 100, 'rock', '0123', null, 0, 'It has rolled up and refused to comment.', 'slate', 'ball'],
  ['ladybird', 'Ladybird', 120, 'flower', '0', null, 0, 'It came for the aphids and stayed for the drama.', 'red', 'ball'],
  ['skater', 'Pond Skater', 130, 'water', '1', null, 0, 'Technically walking on water. Not technically impressed.', 'night', 'long'],
  ['cricket', 'Cricket', 130, 'grass', '2', [17, 5], 0, 'It was just getting to the good part.', 'green', 'long'],
  ['moth', 'Moth', 150, 'lamp', '0123', [19, 5], 0, 'It has found the lamp. It has found its purpose.', 'mist', 'fly'],
  ['grasshopper', 'Grasshopper', 160, 'grass', '12', null, 0, "It didn't save anything for winter either.", 'lime', 'long'],
  ['dragonfly', 'Dragonfly', 180, 'water', '12', null, 0, 'Four wings and still somehow caught.', 'cyan', 'long'],
  ['bumblebee', 'Bumblebee', 200, 'flower', '01', [6, 19], 0, "It's too busy for this, and it says so.", 'sand', 'ball'],
  ['snail', 'Snail', 200, 'rockrain', '01', null, 0, 'Not the Mayor. Probably.', 'orange', 'ball'],
  ['cicada', 'Cicada', 250, 'trunk', '1', [6, 18], 0, 'Seventeen years underground for this.', 'teal', 'long'],
  ['swallowtail', 'Swallowtail', 300, 'flower', '1', [6, 18], 0, 'Fancy. It wants you to know that.', 'sand', 'fly'],
  ['firefly', 'Firefly', 300, 'water', '1', [19, 4], 0, 'Dimmer up close. Aren’t we all.', 'lime', 'ball'],
  ['woollybear', 'Woolly Bear', 350, 'trunk', '2', null, 0, 'Yolanda wants to know where it got that sweater.', 'orange', 'long'],
  ['mantis', 'Praying Mantis', 400, 'flower', '12', null, 0, "It isn't praying. It's negotiating.", 'green', 'long'],
  ['snowflea', 'Snow Flea', 600, 'snow', '3', [10, 15], 0, 'Technically a bug. Emotionally, a snowflake.', 'navy', 'ball'],
  ['stag', 'Stag Beetle', 2000, 'trunk', '1', [19, 4], 1, 'It has been waiting for someone to try that.', 'night', 'beetle'],
  ['rhino', 'Rhino Beetle', 2500, 'trunk', '1', [22, 4], 1, "You're not sure who caught whom.", 'plum', 'beetle'],
];
export const FOSSILS = [
  ['moat_skull', 'Moatosaur Skull', 1800, 'moat', 'A long face, mostly teeth, entirely regret.'], ['moat_torso', 'Moatosaur Torso', 1500, 'moat', 'It held a very small lunch for a very long time.'], ['moat_tail', 'Moatosaur Tail', 1200, 'moat', 'It was steering. Badly.'],
  ['regret_skull', 'Regretodon Skull', 1800, 'regret', 'It knows what it did.'], ['regret_neck', 'Regretodon Neck', 1400, 'regret', 'Too long. It saw things coming for weeks.'], ['regret_torso', 'Regretodon Torso', 1500, 'regret', 'Died mid-sigh.'],
  ['trilobite', 'Trilobite', 800, null, 'Essentially a woodlouse with ambition.'], ['ammonite', 'Ammonite', 1000, null, "A snail that went to a good school."], ['amberfly', 'Amber Fly', 1300, null, "Still hasn't heard the news."], ['tooth', 'Mystery Tooth', 900, null, 'Nobody has come back for it.'],
];
export const ARTWORKS = [
  ['mona', 'Mona Llama', 'A llama with a knowing look. She knows.'], ['pearl', 'Goose with a Pearl Earring', 'She has just noticed you owe her money.'], ['wave', 'The Great Wave Off Beans', 'A great wave, about to ruin a bean harvest.'], ['starry', 'The Starry Bus Stop', 'The last bus is, as ever, not coming.'], ['venus', 'The Birth of Venus Flytrap', 'Rising from a clam, hungry.'], ['honk', 'The Honk', 'One long honk passing through nature.'], ['whistler', "Whistler's Moose", 'He would prefer not to be painted.'], ['cheese', 'The Cheese of Earthly Delights', 'Three panels. All cheddar.'],
];
const SHELLS = [['shell_clam', 'Clam Shell', 15, 'white', 'A clam moved out. It left no forwarding address.'], ['shell_scallop', 'Scallop Shell', 60, 'orange', 'Fancy edges. Nobody home.'], ['shell_cone', 'Cone Shell', 120, 'sand', 'Pointy. Nothing to do with ice cream.'], ['shell_pearl', 'Pearly Shell', 300, 'sky', 'Lady Ottoline would call this "a start".'], ['drift_bottle', 'Bottle with Nothing In It', 80, 'teal', 'A message, in that it says nothing.'], ['drift_wood', 'Interesting Stick', 40, 'orange', 'Yes. Very interesting.']];
// Furniture: [id, name, price, model, size, set, palette, flags]. Models with no slash are the game's own.
const F = (id, name, price, m, size, set, palette = {}, fn = null) => ({ id, name, price, cat: 'furn', model: m, size, set, palette, fn });
const K = (n) => 'kenney-furniture/' + n;
const cot = { wood: 'sand', woodDark: 'orange', carpet: 'orange', carpetDarker: 'red', metal: 'mist' }, mos = { wood: 'green', woodDark: 'teal', carpet: 'lime', carpetDarker: 'green', metal: 'slate', metalDark: 'night', plant: 'lime', lamp: 'lime' }, sea = { wood: 'white', woodDark: 'sky', carpet: 'sky', carpetDarker: 'blue', metal: 'cyan', metalLight: 'white', metalDark: 'navy', lamp: 'cyan', carpetBlue: 'sky' }, loft = { wood: 'slate', woodDark: 'night', carpet: 'plum', carpetDarker: 'red', metal: 'ink', metalLight: 'mist', metalDark: 'ink', lamp: 'sand', carpetBlue: 'plum' }, bur = { wood: 'navy', woodDark: 'night', carpet: 'mist', carpetDarker: 'slate', metal: 'sand', metalLight: 'white', metalDark: 'night', lamp: 'sand' };
export const FURNITURE = [
  F('c_bed', 'Cottage Bed', 1800, K('bed-single'), [1, 2], 'Cottage', cot, 'bed'), F('c_chair', 'Cottage Chair', 500, K('chair-cushion'), [1, 1], 'Cottage', cot, 'seat'), F('c_table', 'Cottage Table', 900, K('table-cloth'), [2, 1], 'Cottage', cot), F('c_lamp', 'Cottage Lamp', 700, K('lamp-round-floor'), [1, 1], 'Cottage', cot, 'lamp'), F('c_sofa', 'Cottage Sofa', 1600, K('lounge-sofa'), [2, 1], 'Cottage', cot, 'seat'), F('c_shelf', 'Cottage Shelf', 800, K('bookcase-open'), [1, 1], 'Cottage', cot), F('c_rug', 'Cottage Rug', 600, K('rug-rounded'), [2, 2], 'Cottage', cot, 'rug'), F('c_stove', 'Cottage Stove', 1400, K('kitchen-stove'), [1, 1], 'Cottage', cot),
  F('m_bed', 'Mossy Bed', 2200, K('bed-single'), [1, 2], 'Mossy', mos, 'bed'), F('m_chair', 'Mossy Stool', 600, K('stool-bar'), [1, 1], 'Mossy', mos, 'seat'), F('m_table', 'Mossy Table', 1000, K('table-round'), [2, 2], 'Mossy', mos), F('m_lamp', 'Mossy Lamp', 800, K('lamp-square-table'), [1, 1], 'Mossy', mos, 'lamp'), F('m_plant', 'Very Mossy Plant', 500, K('potted-plant'), [1, 1], 'Mossy', mos, 'plant'), F('m_shelf', 'Mossy Shelf', 900, K('bookcase-closed'), [1, 1], 'Mossy', mos), F('m_rug', 'Moss Rug (Real Moss)', 700, K('rug-round'), [2, 2], 'Mossy', mos, 'rug'),
  F('s_bed', 'Seaside Bed', 2400, K('bed-double'), [2, 2], 'Seaside', sea, 'bed'), F('s_chair', 'Seaside Chair', 700, K('lounge-chair-relax'), [1, 1], 'Seaside', sea, 'seat'), F('s_table', 'Seaside Table', 1100, K('table-glass'), [2, 1], 'Seaside', sea), F('s_lamp', 'Seaside Lamp', 900, K('lamp-square-floor'), [1, 1], 'Seaside', sea, 'lamp'), F('s_tub', 'Seaside Bathtub', 2600, K('bathtub'), [2, 1], 'Seaside', sea), F('s_rug', 'Seaside Rug', 800, K('rug-square'), [2, 2], 'Seaside', sea, 'rug'),
  F('l_sofa', 'Loft Sofa', 4200, K('lounge-design-sofa'), [2, 1], 'City Loft', loft, 'seat'), F('l_chair', 'Loft Chair', 2200, K('lounge-design-chair'), [1, 1], 'City Loft', loft, 'seat'), F('l_table', 'Loft Coffee Table', 1800, K('table-coffee-glass'), [2, 1], 'City Loft', loft), F('l_lamp', 'Loft Lamp', 2000, K('lamp-round-table'), [1, 1], 'City Loft', loft, 'lamp'), F('l_speaker', 'Loft Speaker', 1500, K('speaker'), [1, 1], 'City Loft', loft), F('l_rug', 'Loft Rug', 1600, K('rug-rectangle'), [2, 1], 'City Loft', loft, 'rug'),
  F('b_desk', 'Bureau Desk', 2800, K('desk'), [2, 1], 'Bureau', bur), F('b_chair', 'Bureau Chair', 1300, K('chair-desk'), [1, 1], 'Bureau', bur, 'seat'), F('b_lamp', 'Bureau Lamp', 1100, K('lamp-square-table'), [1, 1], 'Bureau', bur, 'lamp'), F('b_shelf', 'Bureau Filing Shelf', 1500, K('bookcase-closed-doors'), [1, 1], 'Bureau', bur), F('b_computer', 'Bureau Computer', 2600, K('computer-screen'), [1, 1], 'Bureau', bur),
  F('z_chair', 'Wedge Chair', 3000, 'cheese-chair', [1, 1], 'Cheese', {}, 'seat'), F('z_table', 'Wheel Table', 3400, 'cheese-table', [2, 2], 'Cheese'), F('z_lamp', 'Cheese Lamp (Do Not Lick)', 2800, 'cheese-lamp', [1, 1], 'Cheese', {}, 'lamp'), F('z_bed', 'Fondue Bed', 5200, 'cheese-bed', [1, 2], 'Cheese', {}, 'bed'),
  F('tv', 'Television', 2400, K('television-vintage'), [1, 1], null, cot, 'tv'), F('stereo', 'Stereo', 1800, K('radio'), [1, 1], null, cot, 'stereo'), F('mirror', 'Standing Mirror', 2000, 'standing-mirror', [1, 1], null, {}, 'mirror'), F('fishtank', 'Fish Tank', 2200, 'fish-tank', [1, 1], null, {}, 'tank'), F('bugcage', 'Bug Cage', 1200, 'bug-cage', [1, 1], null, {}, 'cage'), F('clock', 'Grandfather Clock', 1600, 'floor-clock', [1, 1], null, {}, 'clock'), F('toilet', 'Toilet (Decorative, Legally)', 1400, K('toilet'), [1, 1], null, {}, 'toilet'), F('fridge', 'Fridge', 1500, K('kitchen-fridge'), [1, 1], null, sea), F('plant1', 'Fern, Probably', 400, K('potted-plant'), [1, 1], null, cot, 'plant'), F('box', 'Cardboard Box (Furnished)', 60, K('cardboard-box-closed'), [1, 1], null, {}), F('bear', 'Teddy Bear', 900, K('bear'), [1, 1], null, cot), F('books', 'Stack of Unread Books', 300, K('books'), [1, 1], null, {}), F('coat', 'Coat Rack', 450, K('coat-rack-standing'), [1, 1], null, cot), F('washer', 'Washing Machine', 1300, K('washer'), [1, 1], null, {}), F('bench', 'Indoor Bench', 800, K('bench-cushion'), [2, 1], null, cot, 'seat'),
  F('trophy_fish', 'Derby Trophy', 3000, 'sf-trophy', [1, 1], 'Trophy'), F('trophy_bug', 'Bug-Off Trophy', 3000, 'sf-trophy', [1, 1], 'Trophy'), F('trophy_snow', 'Snowman Trophy', 3000, 'sf-trophy', [1, 1], 'Trophy'), F('trophy_rocco', "Rocco's Favourite Trophy", 100, 'sf-trophy', [1, 1], 'Trophy'), F('b_medal_b', 'Bureau Commendation (B)', 1000, 'sf-plaque', [1, 1], 'Trophy'), F('b_medal_a', 'Bureau Citation (A)', 2000, 'sf-plaque', [1, 1], 'Trophy'), F('b_medal_s', 'Bureau Sash of Excess (S)', 4000, 'sf-trophy', [1, 1], 'Trophy'), F('snowman_gift', 'Tiny Snow Globe', 1000, 'snow-globe', [1, 1], null), F('wish_star', 'Fallen Star (Warm)', 1500, 'star-lamp', [1, 1], null, {}, 'lamp'),
];
const shirt = (id, name, price, c, tags, tex = null, o = {}) => ({ id, name, price, cat: 'shirt', color: c, tags, tex, ...o });
export const CLOTHES = [
  shirt('s_white', 'Plain White Tee', 300, 'white', ['plain', 'clean']), shirt('s_red', 'Red Tee', 340, 'red', ['loud']), shirt('s_blue', 'Blue Tee', 340, 'blue', ['calm']), shirt('s_green', 'Moss Green Tee', 340, 'green', ['outdoors']), shirt('s_navy', 'Sailor Top', 700, 'navy', ['damp', 'seaside']), shirt('s_sand', 'Beige, Basically', 280, 'sand', ['plain']), shirt('s_plum', 'Plum Velvet Top', 1600, 'plum', ['fancy', 'evening']), shirt('s_slate', 'Slate Hoodie', 800, 'slate', ['city', 'sulk']), shirt('s_orange', 'Autumn Knit', 900, 'orange', ['cosy', 'wool']), shirt('s_teal', 'Teal Raincoat', 1100, 'teal', ['damp', 'practical']), shirt('s_sky', 'Sky Polo', 520, 'sky', ['calm', 'clean']), shirt('s_lime', 'Lime Hi-Vis', 480, 'lime', ['loud', 'practical']), shirt('s_ink', 'All-Black Turtleneck', 1800, 'ink', ['city', 'evening', 'fancy']), shirt('s_mist', 'Grey Cardigan', 780, 'mist', ['cosy', 'wool']), shirt('s_stripe', 'Stripy Jumper', 900, 'white', ['seaside', 'loud'], 'stripes'), shirt('s_check', 'Check Flannel', 950, 'red', ['outdoors', 'cosy'], 'check'), shirt('s_dot', 'Polka Tee', 800, 'plum', ['loud', 'fancy'], 'dots'), shirt('s_apron', "Mrs. Gander's Apron", 0, 'sand', ['practical', 'debt']), shirt('s_cheese', 'Cheese Rind Vest', 2600, 'sand', ['damp', 'loud', 'fancy']), shirt('s_scarf', "Yolanda's Knitted Thing", 200, 'orange', ['wool', 'cosy']),
  shirt('s_couture1', 'Maison Plume Pink Coat', 9000, 'plum', ['fancy', 'evening', 'couture'], 'dots', { couture: 1 }), shirt('s_couture2', 'Maison Plume Feather Cape', 14000, 'white', ['fancy', 'loud', 'couture'], 'stripes', { couture: 2 }), shirt('s_couture3', 'Maison Plume Damp Silk', 20000, 'navy', ['fancy', 'damp', 'couture'], null, { couture: 3 }),
];
const hat = (id, name, price, style, c, tags) => ({ id, name, price, cat: 'hat', style, color: c, tags });
export const HATS_DATA = [hat('h_cap', 'Baseball Cap', 500, 'cap', 'red', ['city']), hat('h_beanie', 'Bobble Beanie', 600, 'beanie', 'blue', ['cosy', 'wool']), hat('h_top', 'Top Hat', 2800, 'tophat', 'ink', ['fancy', 'evening']), hat('h_straw', 'Straw Hat', 800, 'straw', 'sand', ['outdoors', 'seaside']), hat('h_wizard', 'Pointy Hat', 1500, 'wizard', 'plum', ['loud']), hat('h_crown', 'Paper-ish Crown', 4000, 'crown', 'sand', ['fancy', 'loud']), hat('h_bucket', 'Rain Bucket Hat', 700, 'bucket', 'teal', ['damp', 'practical']), hat('h_bow', 'Big Bow', 650, 'bow', 'red', ['fancy']), hat('h_beret', 'Beret of Opinions', 1100, 'beret', 'navy', ['city', 'fancy']), hat('h_party', 'Party Hat', 200, 'party', 'lime', ['loud']), hat('h_antlers', 'Foam Antlers', 1000, 'antlers', 'sand', ['loud', 'outdoors']), hat('h_flower', 'Flower Clip', 300, 'flower', 'red', ['outdoors'])];
export const GLASSES_DATA = [['g_round', 'Round Glasses', 900, 'round', ['clean']], ['g_shades', 'Sunglasses', 1200, 'shades', ['city', 'evening']], ['g_star', 'Star Glasses', 1500, 'star', ['loud']], ['g_mono', 'Monocle', 3000, 'mono', ['fancy']], ['g_visor', 'Visor', 800, 'visor', ['practical']], ['g_nerd', 'Nerd Frames', 700, 'nerd', ['city']]].map(([id, name, price, style, tags]) => ({ id, name, price, cat: 'glasses', style, tags }));
export const UMBRELLAS = [['u_red', 'Red Umbrella', 600, 'red'], ['u_blue', 'Blue Umbrella', 600, 'blue'], ['u_sand', 'Sensible Umbrella', 500, 'sand'], ['u_plum', 'Tragic Umbrella', 1500, 'plum'], ['u_lime', 'Frog Umbrella', 1000, 'lime'], ['u_pattern', 'Own-Pattern Umbrella', 2000, 'white']].map(([id, name, price, color]) => ({ id, name, price, cat: 'umbrella', color, tags: ['damp'] }));
export const WALLS = [['w_cream', 'Cream Wallpaper', 800, 'sand', 'white'], ['w_moss', 'Moss Wallpaper', 900, 'green', 'lime'], ['w_navy', 'Navy Stripes', 1100, 'navy', 'blue'], ['w_plum', 'Plum Damask', 1500, 'plum', 'red'], ['w_sea', 'Seaside Boards', 1000, 'sky', 'white'], ['w_brick', 'City Brick', 1300, 'red', 'orange']].map(([id, name, price, a, b]) => ({ id, name, price, cat: 'wall', a, b }));
export const FLOORS = [['f_oak', 'Oak Boards', 800, 'orange', 'sand'], ['f_check', 'Checker Tile', 1100, 'white', 'slate'], ['f_grass', 'Indoor Grass', 900, 'green', 'lime'], ['f_navy', 'Navy Carpet', 1000, 'navy', 'blue'], ['f_sand', 'Sand (Why)', 400, 'sand', 'white'], ['f_plum', 'Plum Parquet', 1500, 'plum', 'red']].map(([id, name, price, a, b]) => ({ id, name, price, cat: 'floor', a, b }));
export const FLOWER_SPECIES = { tulip: ['red', 'sand', 'white', 'plum', 'orange'], daisy: ['white', 'sand', 'sky'], cosmos: ['plum', 'white', 'red', 'orange'], bluebell: ['blue', 'sky', 'white', 'plum'] };
export const HYBRIDS = { 'tulip:red+white': 'plum', 'tulip:sand+red': 'orange', 'daisy:white+sand': 'sky', 'cosmos:plum+white': 'red', 'cosmos:red+sand': 'orange', 'bluebell:blue+white': 'sky', 'bluebell:blue+red': 'plum' };
export const TOOLS = [['net', 'Net', 500], ['rod', 'Rod', 500], ['shovel', 'Shovel', 500], ['axe', 'Axe', 800], ['can', 'Watering Can', 500], ['sling', 'Slingshot', 800]];
export const TOOL_ORDER = TOOLS.map((t) => t[0]);
export const ITEMS = {};
export const add = (it) => { ITEMS[it.id] = it; return it; };
for (const [id, name, price, where, seasons, hours, shadow, rare, line, color] of FISH) add({ id, name, price, cat: 'fish', where, seasons, hours, shadow, rare: !!rare, line, color });
add({ id: 'boot', name: 'Old Boot', price: 10, cat: 'junk', where: 'any', line: 'Somewhere, a fish is walking funny.', color: 'orange', tags: ['boot'] });
for (const [id, name, price, spot, seasons, hours, rare, line, color, shape] of BUGS) add({ id, name, price, cat: 'bug', spot, seasons, hours, rare: !!rare, line, color, shape });
for (const [id, name, price, set, line] of FOSSILS) add({ id, name, price, cat: 'fossil', set, line, color: 'sand' });
add({ id: 'fossil_unk', name: 'Unidentified Fossil', price: 50, cat: 'fossilunk', line: 'Definitely old. Possibly a potato.', color: 'sand' });
for (const [id, name, line] of ARTWORKS) add({ id: 'art_' + id, art: id, name, price: 2500, cat: 'art', line, color: 'sand' });
for (const [id, name, price, color, line] of SHELLS) add({ id, name, price, cat: 'shell', color, line });
for (const f of [...FURNITURE, ...CLOTHES, ...HATS_DATA, ...GLASSES_DATA, ...UMBRELLAS, ...WALLS, ...FLOORS]) add(f);
for (const [id, name, price] of TOOLS) add({ id, name, price, cat: 'tool', color: 'slate', line: 'Tools are just debts you can hold.' });
add({ id: 'weed', name: 'Weed', price: 5, cat: 'junk', color: 'green', line: 'The plant nobody ordered.' });
add({ id: 'pear', name: 'Pear', price: 100, cat: 'fruit', color: 'lime', tags: ['fruit', 'sweet'], line: 'Shaped like a very small argument.' });
add({ id: 'fig', name: 'Foreign Fig', price: 500, cat: 'fruit', foreign: true, color: 'plum', tags: ['fruit', 'sweet', 'fancy'], line: "From Gran. It's been in the post a while." });
add({ id: 'quince', name: 'Foreign Quince', price: 500, cat: 'fruit', foreign: true, color: 'sand', tags: ['fruit', 'sour'], line: "Gran says it's an acquired taste. She is yet to acquire it." });
add({ id: 'mushroom', name: 'Suspicious Mushroom', price: 180, cat: 'food', color: 'red', tags: ['mushroom', 'earthy'], line: 'It looks back.' });
add({ id: 'medicine', name: 'Medicine', price: 400, cat: 'med', color: 'white', line: 'Tastes of apology.' });
add({ id: 'sapling', name: 'Pear Sapling', price: 640, cat: 'seed', color: 'green', line: 'A tree, on instalments.' });
add({ id: 'cheesewheel', name: 'Cheese Wheel', price: 100, cat: 'cheese', color: 'sand', tags: ['cheese'], line: 'It only goes up. Mostly. Until it goes off.' });
add({ id: 'cheesebad', name: 'Cheese Wheel (Off)', price: 1, cat: 'cheese', color: 'lime', tags: ['cheese', 'stinky'], line: 'You can smell it from the map.' });
add({ id: 'bag', name: 'Bag of Beans', price: 1000, cat: 'bag', color: 'orange', line: "Beans are currency, dear. You can't plant them." });
add({ id: 'parcel', name: 'Parcel', price: 0, cat: 'quest', color: 'orange', noSell: true, line: 'Addressed in very firm handwriting.' });
add({ id: 'paper', name: 'Letter Paper', price: 40, cat: 'paper', color: 'white', line: 'Say something. Anything. Gran is waiting.' });
add({ id: 'lostthing', name: "Somebody's Lost Thing", price: 0, cat: 'quest', color: 'sky', noSell: true, line: "It's yours now. Morally, no." });
add({ id: 'snowmangift', name: 'Bit of Snowman', price: 200, cat: 'junk', color: 'white', line: 'It asked you to look after it.' });
for (const k of Object.keys(FLOWER_SPECIES)) { add({ id: 'seed_' + k, name: k[0].toUpperCase() + k.slice(1) + ' Seeds', price: 120, cat: 'seed', flower: k, color: 'lime', line: 'Small, hopeful and non-refundable.' }); for (const c of FLOWER_SPECIES[k]) add({ id: `fl_${k}_${c}`, name: `${c[0].toUpperCase() + c.slice(1)} ${k[0].toUpperCase() + k.slice(1)}`, price: 80, cat: 'flower', flower: k, fc: c, color: c, tags: ['flower'], line: 'Pretty. It will die, but pretty.' }); }
export const FISH_LIST = Object.values(ITEMS).filter((i) => i.cat === 'fish');
export const BUG_LIST = Object.values(ITEMS).filter((i) => i.cat === 'bug');
export const ART_LIST = Object.values(ITEMS).filter((i) => i.cat === 'art');
export const FOSSIL_LIST = Object.values(ITEMS).filter((i) => i.cat === 'fossil');
export const EMOTES = ['laugh', 'cry', 'shock', 'anger', 'love', 'shrug', 'bow', 'dance'];
export const EMOTE_CLIP = { laugh: 'Laugh', cry: 'Cry', shock: 'Shock', anger: 'Anger', love: 'Love', shrug: 'Shrug', bow: 'Bow', dance: 'Dance' };
export const SONG_RECORDS = [['rec_rain', 'Vesper: Rain on the Lamp Post', 'rain'], ['rec_small', 'Vesper: A Very Small Waltz', 'small'], ['rec_debt', 'Vesper: Interest Blues', 'debt'], ['rec_sea', 'Vesper: Lighthouse, Please', 'sea'], ['rec_goose', 'Vesper: Honk If You Love Me', 'goose'], ['rec_bye', 'Vesper: Last Bus Out', 'bye']];
for (const [id, name, song] of SONG_RECORDS) add({ id, name, price: 1000, cat: 'record', song, color: 'plum', line: 'Plays better on a stereo than in your pocket.' });
export const buyPriceOf = (it, T) => Math.round((it.price ?? 0) * T.buy);
export const sellPriceOf = (entry, T) => { const it = ITEMS[entry.id]; if (!it || it.noSell) return 0; let p = it.cat === 'furn' || it.cat === 'shirt' || it.cat === 'hat' || it.cat === 'glasses' || it.cat === 'umbrella' || it.cat === 'wall' || it.cat === 'floor' ? Math.round(it.price / 4) : it.cat === 'art' ? (entry.forged ? 20 : 800) : it.cat === 'tool' ? 100 : it.price; if (entry.id === 'bag' && entry.value) p = entry.value; return Math.max(1, Math.round(p * T.sell)); };
