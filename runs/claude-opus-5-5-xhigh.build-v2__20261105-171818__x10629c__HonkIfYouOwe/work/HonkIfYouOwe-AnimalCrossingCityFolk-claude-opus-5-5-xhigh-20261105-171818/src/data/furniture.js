// Furniture: 60 pieces in sets, plus singles. Most are kenney-furniture recoloured through `palette`.
const K = (m) => `kenney-furniture/${m}`;
const COTTAGE = { wood: 'orange', woodDark: 'red', metal: 'mist', metalLight: 'white', metalDark: 'slate', carpet: 'red', carpetDarker: 'plum', lamp: 'sand', plant: 'green', carpetBlue: 'sky' };
const MOSSY = { wood: 'teal', woodDark: 'night', metal: 'slate', metalLight: 'lime', metalDark: 'night', carpet: 'green', carpetDarker: 'teal', lamp: 'lime', plant: 'lime', carpetBlue: 'green' };
const SEASIDE = { wood: 'white', woodDark: 'mist', metal: 'sky', metalLight: 'white', metalDark: 'navy', carpet: 'sky', carpetDarker: 'blue', lamp: 'cyan', plant: 'green', carpetBlue: 'sky' };
const LOFT = { wood: 'night', woodDark: 'ink', metal: 'mist', metalLight: 'white', metalDark: 'ink', carpet: 'plum', carpetDarker: 'red', lamp: 'cyan', plant: 'teal', carpetBlue: 'plum' };
const BUREAU = { wood: 'slate', woodDark: 'night', metal: 'mist', metalLight: 'mist', metalDark: 'night', carpet: 'navy', carpetDarker: 'night', lamp: 'white', plant: 'green', carpetBlue: 'navy' };
const CHEESE = { wood: 'sand', woodDark: 'orange', metal: 'orange', metalLight: 'sand', metalDark: 'orange', carpet: 'sand', carpetDarker: 'orange', lamp: 'white', plant: 'lime', carpetBlue: 'sand' };
const F = (id, name, set, model, palette, w, d, price, tags, extra = {}) => ({ id, name, cat: 'furniture', set, model, palette, w, d, price, tags, ...extra });

export const FURNITURE = [
  // Cottage
  F('cottageChair', 'Cottage Chair', 'Cottage', K('chair-cushion'), COTTAGE, 1, 1, 1200, ['seat'], { func: 'seat', icon: 'chair' }),
  F('cottageTable', 'Cottage Table', 'Cottage', K('table-cloth'), COTTAGE, 2, 1, 2000, ['table'], { icon: 'table' }),
  F('cottageBed', 'Cottage Bed', 'Cottage', K('bed-single'), COTTAGE, 1, 2, 3000, ['bed'], { func: 'bed', icon: 'bed' }),
  F('cottageSofa', 'Cottage Sofa', 'Cottage', K('lounge-sofa'), COTTAGE, 2, 1, 3200, ['seat'], { func: 'seat', icon: 'sofa' }),
  F('cottageLamp', 'Cottage Lamp', 'Cottage', K('lamp-round-floor'), COTTAGE, 1, 1, 1400, ['lamp'], { func: 'lamp', icon: 'lamp' }),
  F('cottageShelf', 'Cottage Bookcase', 'Cottage', K('bookcase-open'), COTTAGE, 1, 1, 1800, ['storage'], { icon: 'shelfIcon' }),
  F('cottageRug', 'Cottage Rug', 'Cottage', K('rug-round'), COTTAGE, 2, 2, 1600, ['rug'], { func: 'rug', icon: 'rug', flat: true }),
  F('cottageSide', 'Cottage Side Table', 'Cottage', K('cabinet-bed-drawer'), COTTAGE, 1, 1, 900, ['table'], { icon: 'table' }),
  // Mossy
  F('mossyStool', 'Mossy Stool', 'Mossy', K('stool-bar'), MOSSY, 1, 1, 1100, ['seat'], { func: 'seat', icon: 'chair' }),
  F('mossyTable', 'Mossy Table', 'Mossy', K('table-round'), MOSSY, 2, 2, 2200, ['table'], { icon: 'table' }),
  F('mossyBed', 'Mossy Bed', 'Mossy', K('bed-double'), MOSSY, 2, 2, 3600, ['bed'], { func: 'bed', icon: 'bed' }),
  F('mossyLamp', 'Glowcap Lamp', 'Mossy', K('lamp-square-floor'), MOSSY, 1, 1, 1500, ['lamp'], { func: 'lamp', icon: 'lamp' }),
  F('mossySofa', 'Mossy Sofa', 'Mossy', K('lounge-sofa-long'), MOSSY, 2, 2, 3800, ['seat'], { func: 'seat', icon: 'sofa' }),
  F('mossyPlant', 'Sulking Fern', 'Mossy', K('potted-plant'), MOSSY, 1, 1, 900, ['plant'], { func: 'plant', icon: 'plantIcon' }),
  F('mossyRug', 'Moss Rug', 'Mossy', K('rug-square'), MOSSY, 2, 2, 1400, ['rug'], { func: 'rug', icon: 'rug', flat: true }),
  F('mossyShelf', 'Damp Bookcase', 'Mossy', K('bookcase-closed'), MOSSY, 1, 1, 1700, ['storage'], { icon: 'shelfIcon' }),
  // Seaside
  F('seasideChair', 'Deck Chair', 'Seaside', K('lounge-chair-relax'), SEASIDE, 1, 2, 1600, ['seat'], { func: 'seat', icon: 'chair' }),
  F('seasideTable', 'Seaside Table', 'Seaside', K('table-coffee-square'), SEASIDE, 1, 1, 1200, ['table'], { icon: 'table' }),
  F('seasideBed', 'Seaside Bunk', 'Seaside', K('bed-bunk'), SEASIDE, 1, 2, 3400, ['bed'], { func: 'bed', icon: 'bed' }),
  F('seasideLamp', 'Lighthouse Lamp', 'Seaside', K('lamp-round-table'), SEASIDE, 1, 1, 1200, ['lamp'], { func: 'lamp', icon: 'lamp' }),
  F('seasideRug', 'Tide Rug', 'Seaside', K('rug-rounded'), SEASIDE, 2, 2, 1800, ['rug'], { func: 'rug', icon: 'rug', flat: true }),
  F('seasideBath', 'Seaside Tub', 'Seaside', K('bathtub'), SEASIDE, 2, 1, 2800, ['bath'], { icon: 'rockIcon' }),
  F('seasideShelf', 'Driftwood Shelf', 'Seaside', K('bookcase-open-low'), SEASIDE, 1, 1, 1100, ['storage'], { icon: 'shelfIcon' }),
  // City Loft
  F('loftChair', 'Loft Chair', 'City Loft', K('chair-modern-cushion'), LOFT, 1, 1, 2200, ['seat'], { func: 'seat', icon: 'chair' }),
  F('loftSofa', 'Loft Sofa', 'City Loft', K('lounge-design-sofa'), LOFT, 2, 1, 5200, ['seat'], { func: 'seat', icon: 'sofa' }),
  F('loftTable', 'Glass Table', 'City Loft', K('table-glass'), LOFT, 2, 1, 3600, ['table'], { icon: 'table' }),
  F('loftLamp', 'Very Thin Lamp', 'City Loft', K('lamp-square-table'), LOFT, 1, 1, 2000, ['lamp'], { func: 'lamp', icon: 'lamp' }),
  F('loftTV', 'Loft Television', 'City Loft', K('television-modern'), LOFT, 2, 1, 5800, ['electronics'], { func: 'tv', icon: 'tv' }),
  F('loftSpeakers', 'Loft Speakers', 'City Loft', K('speaker'), LOFT, 1, 1, 3000, ['electronics'], { func: 'stereo', icon: 'stereo' }),
  F('loftRug', 'Abstract Rug', 'City Loft', K('rug-rectangle'), LOFT, 2, 2, 2600, ['rug'], { func: 'rug', icon: 'rug', flat: true }),
  // Bureau
  F('bureauDesk', 'Bureau Desk', 'Bureau', K('desk'), BUREAU, 2, 1, 3200, ['table'], { icon: 'table' }),
  F('bureauChair', 'Bureau Chair', 'Bureau', K('chair-desk'), BUREAU, 1, 1, 1800, ['seat'], { func: 'seat', icon: 'chair' }),
  F('bureauShelf', 'Filing Shelf', 'Bureau', K('bookcase-closed-doors'), BUREAU, 1, 1, 2000, ['storage'], { icon: 'shelfIcon' }),
  F('bureauLamp', 'Interrogation Lamp', 'Bureau', K('lamp-square-floor'), BUREAU, 1, 1, 1600, ['lamp'], { func: 'lamp', icon: 'lamp' }),
  F('bureauCan', 'Bureau Bin', 'Bureau', K('trashcan'), BUREAU, 1, 1, 500, ['bin'], { icon: 'question' }),
  F('bureauPC', 'Beige Computer', 'Bureau', K('computer-screen'), BUREAU, 1, 1, 2600, ['electronics'], { icon: 'tv' }),
  // Cheese
  F('cheeseChair', 'Cheddar Chair', 'Cheese', K('chair-rounded'), CHEESE, 1, 1, 1500, ['seat'], { func: 'seat', icon: 'cheese' }),
  F('cheeseTable', 'Brie Table', 'Cheese', K('table-coffee'), CHEESE, 2, 1, 1900, ['table'], { icon: 'cheese' }),
  F('cheeseBed', 'Gouda Bed', 'Cheese', K('bed-single'), CHEESE, 1, 2, 3300, ['bed'], { func: 'bed', icon: 'cheese' }),
  F('cheeseLamp', 'Lamp of Roquefort', 'Cheese', K('lamp-round-floor'), CHEESE, 1, 1, 1700, ['lamp'], { func: 'lamp', icon: 'cheese' }),
  F('cheeseSofa', 'Edam Sofa', 'Cheese', K('lounge-sofa'), CHEESE, 2, 1, 3500, ['seat'], { func: 'seat', icon: 'cheese' }),
  F('cheeseWheelSeat', 'Wheel, Decorative', 'Cheese', 'cheese-wheel', null, 1, 1, 1300, ['cheese'], { icon: 'cheese' }),
  // Singles and functional pieces
  F('stereo', 'Modest Stereo', null, K('radio'), COTTAGE, 1, 1, 2400, ['electronics'], { func: 'stereo', icon: 'stereo' }),
  F('tv', 'Vintage Television', null, K('television-vintage'), COTTAGE, 1, 1, 4200, ['electronics'], { func: 'tv', icon: 'tv' }),
  F('mirror', 'Standing Mirror', null, K('bathroom-mirror'), COTTAGE, 1, 1, 2800, ['mirror'], { func: 'mirror', icon: 'glasses' }),
  F('fishTank', 'Fish Tank', null, 'tank', null, 2, 1, 3000, ['pet'], { func: 'tank', icon: 'fish1', params: { w: 1.6 } }),
  F('bugCage', 'Bug Cage', null, 'tank', { water: 'lime', frame: 'plum', sand: 'green', top: 'plum' }, 1, 1, 2000, ['pet'], { func: 'cage', icon: 'beetle', params: { w: 0.9 } }),
  F('wallClock', 'Grandfather Clock', null, K('coat-rack-standing'), COTTAGE, 1, 1, 2600, ['clock'], { func: 'clock', icon: 'clock' }),
  F('toilet', 'Toilet', null, K('toilet'), COTTAGE, 1, 1, 1000, ['toilet'], { func: 'toilet', icon: 'question' }),
  F('fridge', 'Fridge, Humming', null, K('kitchen-fridge'), COTTAGE, 1, 1, 3000, ['kitchen'], { icon: 'shelfIcon' }),
  F('stove', 'Stove', null, K('kitchen-stove'), COTTAGE, 1, 1, 2800, ['kitchen'], { icon: 'table' }),
  F('bearToy', 'Worried Bear', null, K('bear'), COTTAGE, 1, 1, 800, ['toy'], { icon: 'question' }),
  F('pottedPlant', 'Potted Plant', null, K('potted-plant'), COTTAGE, 1, 1, 700, ['plant'], { func: 'plant', icon: 'plantIcon' }),
  F('laptop', 'Laptop, Closed', null, K('laptop'), LOFT, 1, 1, 2200, ['electronics'], { icon: 'tv' }),
  F('washer', 'Washing Machine', null, K('washer'), COTTAGE, 1, 1, 2400, ['kitchen'], { icon: 'rockIcon' }),
  F('boxes', 'Unpacked Boxes', null, K('cardboard-box-closed'), COTTAGE, 1, 1, 200, ['clutter'], { icon: 'gift' }),
  // Trophies and awards
  F('trophyGold', 'Derby Trophy', null, 'tank', { water: 'sand', frame: 'orange', sand: 'orange', top: 'orange' }, 1, 1, 8000, ['trophy'], { icon: 'trophy', params: { w: 0.8 }, notForSale: true }),
  F('trophyBug', 'Bug-Off Trophy', null, 'tank', { water: 'lime', frame: 'orange', sand: 'orange', top: 'orange' }, 1, 1, 8000, ['trophy'], { icon: 'trophy', params: { w: 0.8 }, notForSale: true }),
  F('trophySnow', 'Snowman Trophy', null, 'snowman', null, 1, 1, 8000, ['trophy'], { icon: 'trophy', notForSale: true }),
  F('roccoTrophy', "Rocco's Trophy", null, 'tank', { water: 'red', frame: 'orange', sand: 'sand', top: 'orange' }, 1, 1, 12000, ['trophy'], { icon: 'trophy', params: { w: 0.8 }, notForSale: true }),
  F('bureauC', 'Bureau Plaque, Grade C', 'Bureau', K('books'), BUREAU, 1, 1, 1000, ['award'], { icon: 'trophy', notForSale: true }),
  F('bureauB', 'Bureau Plaque, Grade B', 'Bureau', K('books'), BUREAU, 1, 1, 3000, ['award'], { icon: 'trophy', notForSale: true }),
  F('bureauA', 'Bureau Plaque, Grade A', 'Bureau', K('books'), BUREAU, 1, 1, 6000, ['award'], { icon: 'trophy', notForSale: true }),
  F('bureauS', 'Bureau Plaque, Grade S', 'Bureau', K('books'), BUREAU, 1, 1, 12000, ['award'], { icon: 'trophy', notForSale: true }),
  F('couturePiece', 'Couture Chaise', 'City Loft', K('lounge-design-chair'), LOFT, 2, 1, 16000, ['seat'], { func: 'seat', icon: 'sofa', rare: true }),
  F('magdaClock', 'Slightly Warm Clock', null, K('coat-rack-standing'), BUREAU, 1, 1, 9000, ['clock'], { func: 'clock', icon: 'clock', rare: true, notForSale: true }),
];
export const FURNITURE_SETS = ['Cottage', 'Mossy', 'Seaside', 'City Loft', 'Bureau', 'Cheese'];
