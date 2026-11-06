// Shop and home items. Furniture maps onto kenney-furniture models where possible.
import { FISH, BUGS, FOSSILS, ART, byId } from './collect.js';
export const TOOLS = [
  { id: 'net', name: 'Net', icon: 'net' }, { id: 'rod', name: 'Rod', icon: 'rod' }, { id: 'shovel', name: 'Shovel', icon: 'shovel' },
  { id: 'axe', name: 'Axe', icon: 'axe' }, { id: 'can', name: 'Watering Can', icon: 'can' }, { id: 'sling', name: 'Slingshot', icon: 'sling' },
];
const FU = (id, name, price, set, model, w = 1, d = 1, extra = {}) => ({ id, name, price, kind: 'furniture', set, model, w, d, ...extra });
export const FURNITURE = [
  FU('cot', 'Cottage Cot', 900, 'Cottage', 'bedSingle', 1, 2, { fn: 'bed' }),
  FU('cotchair', 'Cottage Chair', 400, 'Cottage', 'chair', 1, 1, { fn: 'seat' }),
  FU('cottable', 'Cottage Table', 700, 'Cottage', 'table', 2, 1, {}),
  FU('cotlamp', 'Cottage Lamp', 350, 'Cottage', 'lampRoundFloor', 1, 1, { fn: 'lamp' }),
  FU('cotbook', 'Cottage Bookcase', 800, 'Cottage', 'bookcaseClosed', 2, 1, {}),
  FU('mosscouch', 'Mossy Couch', 1500, 'Mossy', 'loungeSofa', 2, 1, { fn: 'seat' }),
  FU('mossplant', 'Mossy Fern', 300, 'Mossy', 'pottedPlant', 1, 1, { grows: true }),
  FU('mossrug', 'Mossy Rug', 500, 'Mossy', 'rugRound', 2, 2, { rug: true }),
  FU('mosslamp', 'Mossy Lamp', 450, 'Mossy', 'lampSquareFloor', 1, 1, { fn: 'lamp' }),
  FU('mosstable', 'Mossy Table', 900, 'Mossy', 'tableRound', 2, 2, {}),
  FU('seabed', 'Seaside Bed', 1800, 'Seaside', 'bedDouble', 2, 2, { fn: 'bed' }),
  FU('seachair', 'Seaside Chair', 650, 'Seaside', 'chairCushion', 1, 1, { fn: 'seat' }),
  FU('seastereo', 'Seaside Stereo', 1200, 'Seaside', 'speaker', 1, 1, { fn: 'stereo' }),
  FU('seatv', 'Seaside TV', 2200, 'Seaside', 'televisionModern', 1, 1, { fn: 'tv' }),
  FU('seadesk', 'Seaside Desk', 1100, 'Seaside', 'desk', 2, 1, {}),
  FU('loftsofa', 'Loft Sofa', 2600, 'City Loft', 'loungeDesignSofa', 2, 1, { fn: 'seat' }),
  FU('loftlamp', 'Loft Lamp', 800, 'City Loft', 'lampSquareTable', 1, 1, { fn: 'lamp' }),
  FU('loftmirror', 'Loft Mirror', 1500, 'City Loft', 'bathroomMirror', 1, 1, { fn: 'mirror' }),
  FU('loftcoffee', 'Loft Coffee Table', 1200, 'City Loft', 'tableCoffeeGlass', 2, 1, {}),
  FU('loftshelf', 'Loft Shelf', 1600, 'City Loft', 'bookcaseOpen', 2, 1, {}),
  FU('burdesk', 'Bureau Desk', 1900, 'Bureau', 'desk', 2, 1, {}),
  FU('burchair', 'Bureau Chair', 900, 'Bureau', 'chairDesk', 1, 1, { fn: 'seat' }),
  FU('burcabinet', 'Bureau Cabinet', 1400, 'Bureau', 'cabinetTelevision', 2, 1, {}),
  FU('burclock', 'Bureau Clock', 700, 'Bureau', 'books', 1, 1, { fn: 'clock' }),
  FU('cheesechair', 'Cheese Chair', 3000, 'Cheese', 'chairCushion', 1, 1, { fn: 'seat', tint: 'sand' }),
  FU('cheesetable', 'Cheese Table', 3500, 'Cheese', 'tableRound', 2, 2, { tint: 'sand' }),
  FU('cheesebed', 'Cheese Bed', 5000, 'Cheese', 'bedDouble', 2, 2, { fn: 'bed', tint: 'sand' }),
  FU('cheeselamp', 'Cheese Lamp', 1500, 'Cheese', 'lampRoundFloor', 1, 1, { fn: 'lamp', tint: 'sand' }),
  FU('toilet', 'Toilet', 600, 'Single', 'toilet', 1, 1, { fn: 'toilet' }),
  FU('fishtank', 'Fish Tank', 1300, 'Single', 'cabinetBedDrawer', 1, 1, { fn: 'tank' }),
  FU('bugcage', 'Bug Cage', 900, 'Single', 'cabinetBed', 1, 1, { fn: 'cage' }),
  FU('rugsq', 'Plain Rug', 300, 'Single', 'rugRectangle', 2, 2, { rug: true }),
  FU('bench', 'Hall Bench', 500, 'Single', 'benchCushion', 2, 1, { fn: 'seat' }),
  FU('radio', 'Radio', 500, 'Single', 'radio', 1, 1, { fn: 'stereo' }),
  FU('plantbig', 'Big Plant', 450, 'Single', 'pottedPlant', 1, 1, { grows: true }),
  FU('bathtub', 'Claw Bathtub', 1800, 'Single', 'bathtub', 2, 1, {}), FU('stove', 'Cast-Iron Stove', 1500, 'Single', 'kitchenStove', 1, 1, {}), FU('fridge', 'Humming Fridge', 1700, 'Single', 'kitchenFridge', 1, 1, {}), FU('coatrack', 'Coat Rack', 350, 'Single', 'coatRack', 1, 1, {}),
  FU('sidetable', 'Side Table', 450, 'Single', 'sideTable', 1, 1, {}), FU('barstool', 'Bar Stool', 300, 'Single', 'stoolBar', 1, 1, { fn: 'seat' }), FU('bigshelf', 'Wide Bookcase', 1300, 'Single', 'bookcaseClosedWide', 2, 1, {}), FU('laptop', 'Laptop', 1600, 'Single', 'laptop', 1, 1, {}),
  FU('trashcan', 'Bin', 200, 'Single', 'trashcan', 1, 1, {}), FU('pillowbig', 'Floor Pillow', 250, 'Single', 'pillowBlue', 1, 1, { fn: 'seat' }), FU('loungechair', 'Lounge Chair', 1400, 'City Loft', 'loungeChair', 1, 1, { fn: 'seat' }), FU('bunkbed', 'Bunk Bed', 2000, 'Single', 'bedBunk', 1, 2, { fn: 'bed' }),
  FU('trophy_derby', 'Derby Trophy', 0, 'Trophy', 'books', 1, 1, { trophy: true }),
  FU('trophy_bug', 'Bug-Off Trophy', 0, 'Trophy', 'books', 1, 1, { trophy: true }),
  FU('trophy_snow', 'Snowman Trophy', 0, 'Trophy', 'books', 1, 1, { trophy: true }),
];
const CL = (id, name, price, slot, color, extra = {}) => ({ id, name, price, kind: 'clothes', slot, color, ...extra });
export const CLOTHES = [
  CL('tee_red', 'Red Tee', 300, 'outfit', 'red', { tags: ['plain', 'warm'] }), CL('tee_blue', 'Blue Tee', 300, 'outfit', 'blue', { tags: ['plain', 'cool'] }),
  CL('tee_lime', 'Lime Tee', 300, 'outfit', 'lime', { tags: ['plain', 'bright'] }), CL('dress_plum', 'Plum Frock', 700, 'outfit', 'plum', { tags: ['fancy', 'dark'] }),
  CL('coat_navy', 'Navy Coat', 900, 'outfit', 'navy', { tags: ['warm', 'fancy'] }), CL('rain_cyan', 'Damp Slicker', 600, 'outfit', 'cyan', { tags: ['damp', 'cool'] }),
  CL('sweater_orange', 'Orange Sweater', 650, 'outfit', 'orange', { tags: ['warm', 'cozy'] }), CL('suit_slate', 'Slate Suit', 1500, 'outfit', 'slate', { tags: ['fancy', 'dark'] }),
  CL('gown_white', 'Pale Gown', 2400, 'outfit', 'white', { tags: ['fancy', 'bright'], couture: true }), CL('cape_red', 'Couture Cape', 3200, 'outfit', 'red', { tags: ['fancy', 'bright'], couture: true }),
  CL('hat_cap', 'Cap', 250, 'hat', 'blue', { tags: ['plain'] }), CL('hat_top', 'Top Hat', 900, 'hat', 'ink', { tags: ['fancy'] }),
  CL('hat_straw', 'Straw Hat', 400, 'hat', 'sand', { tags: ['bright'] }), CL('hat_wool', 'Wool Hat', 450, 'hat', 'orange', { tags: ['warm', 'cozy'] }),
  CL('hat_umbrella', 'Umbrella Hat', 800, 'hat', 'cyan', { tags: ['damp'] }), CL('hat_pot', 'Cooking Pot', 500, 'hat', 'slate', { tags: ['odd'] }),
  CL('tee_sky', 'Sky Tee', 300, 'outfit', 'sky', { tags: ['plain', 'cool'] }), CL('tee_sand', 'Sand Tee', 280, 'outfit', 'sand', { tags: ['plain', 'warm'] }), CL('tee_white', 'White Tee', 280, 'outfit', 'white', { tags: ['plain', 'bright'] }), CL('tee_teal', 'Teal Tee', 320, 'outfit', 'teal', { tags: ['plain', 'cool'] }),
  CL('hoodie_green', 'Moss Hoodie', 700, 'outfit', 'green', { tags: ['warm', 'cozy'] }), CL('hoodie_plum', 'Plum Hoodie', 700, 'outfit', 'plum', { tags: ['warm', 'cozy', 'dark'] }), CL('overalls_blue', 'Blue Overalls', 800, 'outfit', 'blue', { tags: ['plain', 'odd'] }), CL('poncho_cyan', 'Puddle Poncho', 650, 'outfit', 'cyan', { tags: ['damp', 'odd'] }),
  CL('vest_red', 'Waistcoat', 1100, 'outfit', 'red', { tags: ['fancy'] }), CL('robe_navy', 'Midnight Robe', 1300, 'outfit', 'navy', { tags: ['fancy', 'dark', 'warm'] }), CL('smock_lime', 'Garden Smock', 450, 'outfit', 'lime', { tags: ['bright', 'cozy'] }), CL('jacket_orange', 'Autumn Jacket', 900, 'outfit', 'orange', { tags: ['warm'] }),
  CL('suit_ink', 'Evening Suit', 2000, 'outfit', 'ink', { tags: ['fancy', 'dark'], couture: true }), CL('dress_sky', 'Cloud Dress', 2600, 'outfit', 'sky', { tags: ['fancy', 'bright'], couture: true }),
  CL('hat_beanie', 'Beanie', 350, 'hat', 'teal', { tags: ['warm', 'cozy'] }), CL('hat_bowler', 'Bowler', 700, 'hat', 'night', { tags: ['fancy'] }), CL('hat_flower', 'Flower Crown', 500, 'hat', 'plum', { tags: ['bright'] }), CL('hat_sailor', 'Sailor Cap', 450, 'hat', 'white', { tags: ['plain'] }), CL('hat_witch', 'Pointed Hat', 600, 'hat', 'plum', { tags: ['odd', 'dark'] }), CL('hat_crown', 'Paper Crown', 300, 'hat', 'sand', { tags: ['odd', 'bright'] }),
  CL('glasses_star', 'Star Shades', 600, 'glasses', 'sand', { tags: ['odd'] }), CL('glasses_red', 'Red Frames', 500, 'glasses', 'red', {}), CL('glasses_goggles', 'Goggles', 700, 'glasses', 'cyan', { tags: ['odd'] }),
  CL('umb_green', 'Green Umbrella', 300, 'umbrella', 'green', {}), CL('umb_yellow', 'Yellow Umbrella', 300, 'umbrella', 'sand', {}), CL('umb_plum', 'Plum Umbrella', 350, 'umbrella', 'plum', {}),
  CL('glasses_round', 'Round Specs', 350, 'glasses', 'ink', {}), CL('glasses_sun', 'Sun Shades', 450, 'glasses', 'night', {}), CL('glasses_gold', 'Gold Pince-nez', 1100, 'glasses', 'sand', {}),
  CL('umb_red', 'Red Umbrella', 300, 'umbrella', 'red', {}), CL('umb_blue', 'Blue Umbrella', 300, 'umbrella', 'blue', {}), CL('umb_pattern', 'Pattern Umbrella', 600, 'umbrella', 'white', { pattern: true }),
];
export const WALLPAPER = [
  { id: 'wall_cream', name: 'Cream Wallpaper', price: 400, kind: 'wall', color: 'sand' }, { id: 'wall_mint', name: 'Mint Wallpaper', price: 450, kind: 'wall', color: 'lime' },
  { id: 'wall_sky', name: 'Sky Wallpaper', price: 450, kind: 'wall', color: 'sky' }, { id: 'wall_plum', name: 'Plum Wallpaper', price: 600, kind: 'wall', color: 'plum' },
];
export const FLOORS = [
  { id: 'floor_wood', name: 'Wood Flooring', price: 400, kind: 'floor', color: 'orange' }, { id: 'floor_tile', name: 'Checker Tile', price: 500, kind: 'floor', color: 'mist' },
  { id: 'floor_moss', name: 'Mossy Carpet', price: 500, kind: 'floor', color: 'green' }, { id: 'floor_slate', name: 'Slate Floor', price: 650, kind: 'floor', color: 'slate' },
];
export const MISC = [
  { id: 'pear', name: 'Pear', price: 100, kind: 'fruit', line: 'A pear. Round, sweet, grudge-free.' },
  { id: 'fruit_cherry', name: 'Foreign Cherry', price: 500, kind: 'fruit', line: 'It claims to be from somewhere nicer.' },
  { id: 'weed', name: 'Weed', price: 20, kind: 'weed', line: 'Technically a plant. Technically.' },
  { id: 'beanbag', name: 'Bag of Beans', price: 1000, kind: 'beans', line: 'Heavy with legume.' },
  { id: 'mushroom', name: 'Mushroom', price: 250, kind: 'mushroom', line: 'It knows something about the soil.' },
  { id: 'lump', name: 'Mystery Lump', price: 50, kind: 'lump', line: 'A fossil, or a very confident rock. Dr. Quill can tell.' },
  { id: 'driftwood', name: 'Driftwood Oddity', price: 300, kind: 'shell', line: 'It looks like a duck. It looks like a lot of things. All of them damp.' },
  { id: 'shell', name: 'Shell', price: 150, kind: 'shell', line: 'A small ocean apartment, vacated.' },
  { id: 'cheese', name: 'Cheese Wheel', price: 100, kind: 'cheese', line: 'A whole wheel. Brave.' },
  { id: 'rotcheese', name: 'Rotten Cheese', price: 1, kind: 'cheese', line: 'It has a smell. A visible one.' },
  { id: 'seedpack', name: 'Seed Packet', price: 80, kind: 'seed', line: 'Flowers, folded small.' },
  { id: 'sapling', name: 'Sapling', price: 200, kind: 'sapling', line: 'A tree, optimistically.' },
  { id: 'medicine', name: 'Wasp Ointment', price: 150, kind: 'medicine', line: 'Smells of mint and regret.' },
  { id: 'paper', name: 'Stationery', price: 50, kind: 'paper', line: 'Paper. The future is blank.' },
  { id: 'record', name: 'Vesper Record', price: 0, kind: 'record', line: 'A record, warm from an accordion.' },
  { id: 'cheesewrap', name: 'Cheesewrap', price: 0, kind: 'junk', line: 'Wrapped. Unwrapped. Rewrapped.' },
  { id: 'snowball', name: 'Snowball', price: 0, kind: 'junk', line: 'Cold, round, and optimistic.' },
];
export const ITEMS = {};
for (const x of [...FISH, ...BUGS, ...FOSSILS, ...ART, ...FURNITURE, ...CLOTHES, ...WALLPAPER, ...FLOORS, ...MISC]) ITEMS[x.id] = x;
for (const t of TOOLS) ITEMS[t.id] = { ...t, kind: 'tool', price: 0 };
export const item = (id) => ITEMS[id] ?? { id, name: id, price: 0, kind: 'junk' };
export const STORE_STOCK_FURN = FURNITURE.filter(f => !f.trophy && f.set !== 'Cheese');
