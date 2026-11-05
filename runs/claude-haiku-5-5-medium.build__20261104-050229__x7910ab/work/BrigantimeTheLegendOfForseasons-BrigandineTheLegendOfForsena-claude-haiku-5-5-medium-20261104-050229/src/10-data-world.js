// The world as data: seasons and elements, realms, castles, roads, knights, classes, items. Edit these tables to change
// the game; the sims read them, and the data suite (tests/t-data.mjs) checks that every id they name exists.

// ---- elements and seasons ----
// A hit is stronger when the attacker's element opposes the defender's (verdant and ambered, solar and rime). The
// season's own element is in Tide: it adds to the attacks of that element and takes from the opposite one.
G.OPPOSED = { verdant: 'ambered', ambered: 'verdant', solar: 'rime', rime: 'solar' };
G.def('element', 'verdant', { name: 'Verdant', color: '#7ad06a' });
G.def('element', 'solar', { name: 'Solar', color: '#ff7a4a' });
G.def('element', 'ambered', { name: 'Ambered', color: '#e8b050' });
G.def('element', 'rime', { name: 'Rime', color: '#7ac8ff' });
G.def('element', 'hour', { name: 'Hour', color: '#a090d0' });
G.def('element', 'neutral', { name: 'Neutral', color: '#c8c0b0' });

G.def('season', 'spring', { name: 'Spring', element: 'verdant', color: '#8ad870', next: 'summer',
  tidings: 'The river rises over the fords. Verdance sends word that the thaw has come early.' });
G.def('season', 'summer', { name: 'Summer', element: 'solar', color: '#ffb060', next: 'autumn',
  tidings: 'Dry wind over Solmark. The grass is pale, and the forests are waiting for a spark.' });
G.def('season', 'autumn', { name: 'Autumn', element: 'ambered', color: '#e8a040', next: 'winter',
  tidings: 'Gales off the Amberlyn coast. Crops are in, and the roads are hard to hold.' });
G.def('season', 'winter', { name: 'Winter', element: 'rime', color: '#9ad8ff', next: 'spring',
  tidings: 'Hoarfast reports ice on every river. Nothing moves far until the thaw.' });
G.SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

// ---- realms: the four playable season-realms, the Hourless Dominion (AI), and the free companies ----
G.def('realm', 'verdance', { name: 'Verdance', season: 'spring', element: 'verdant', playable: true, color: '#4ea85a', accent: '#c8f08a',
  capital: 'mossgate', motto: 'Green roots, slow oaths', ruler: 'oren' });
G.def('realm', 'solmark', { name: 'Solmark', season: 'summer', element: 'solar', playable: true, color: '#c8502a', accent: '#ffd36a',
  capital: 'brightwall', motto: 'Hard sun, hard hands', ruler: 'tamsin' });
G.def('realm', 'amberlyn', { name: 'Amberlyn', season: 'autumn', element: 'ambered', playable: true, color: '#b07a2a', accent: '#ffe0a0',
  capital: 'gildmere', motto: 'Keep the harvest, keep the road', ruler: 'wren' });
G.def('realm', 'hoarfast', { name: 'Hoarfast', season: 'winter', element: 'rime', playable: true, color: '#4a7ab8', accent: '#dff4ff',
  capital: 'frostwatch', motto: 'Hold the ice, hold the line', ruler: 'hale' });
G.def('realm', 'dominion', { name: 'The Hourless Dominion', season: null, element: 'hour', playable: false, color: '#3a3050', accent: '#b8a8e8',
  capital: 'stillhold', motto: 'No hour, no end', ruler: 'vesper' });
G.def('realm', 'free', { name: 'Free Companies', season: null, element: 'neutral', playable: false, color: '#5a4a3a', accent: '#d8c090',
  capital: null, motto: 'No banner but our own', ruler: null });
G.PLAYABLE_REALMS = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];

// ---- castles on the continent (positions in a 1000 x 1000 world, y down). Meridian, the Calendar City, is the goal. ----
const CASTLE = (id, name, realm, x, y, o = {}) => G.def('castle', id, Object.assign({ name, realm, x, y, yield: 3, capital: false }, o));
CASTLE('mossgate', 'Mossgate', 'verdance', 220, 200, { capital: true, yield: 4 });
CASTLE('ferncrest', 'Ferncrest', 'verdance', 330, 300);
CASTLE('larkhold', 'Larkhold', 'verdance', 150, 340);
CASTLE('brightwall', 'Brightwall', 'solmark', 780, 200, { capital: true, yield: 4 });
CASTLE('emberfall', 'Emberfall', 'solmark', 640, 300);
CASTLE('sunspire', 'Sunspire', 'solmark', 860, 330);
CASTLE('gildmere', 'Gildmere', 'amberlyn', 780, 800, { capital: true, yield: 4 });
CASTLE('harrowvale', 'Harrowvale', 'amberlyn', 640, 700);
CASTLE('quillon', 'Quillon', 'amberlyn', 860, 660);
CASTLE('frostwatch', 'Frostwatch', 'hoarfast', 220, 800, { capital: true, yield: 4 });
CASTLE('rimecrag', 'Rimecrag', 'hoarfast', 340, 700);
CASTLE('icehollow', 'Icehollow', 'hoarfast', 140, 640);
CASTLE('stillhold', 'Stillhold', 'dominion', 500, 330, { capital: true, yield: 5 });
CASTLE('meridian', 'Meridian', 'dominion', 500, 520, { yield: 5, goal: true });
CASTLE('thornpass', 'Thornpass', 'free', 400, 170, { yield: 1 });
CASTLE('blackhollow', 'Blackhollow', 'free', 500, 830, { yield: 1 });

// ---- roads: an undirected graph. The campaign's marches follow them. ----
G.ROADS = [
  ['mossgate', 'ferncrest'], ['mossgate', 'larkhold'], ['ferncrest', 'larkhold'], ['larkhold', 'icehollow'],
  ['brightwall', 'emberfall'], ['brightwall', 'sunspire'], ['emberfall', 'sunspire'],
  ['gildmere', 'harrowvale'], ['gildmere', 'quillon'], ['harrowvale', 'quillon'], ['sunspire', 'quillon'],
  ['frostwatch', 'rimecrag'], ['frostwatch', 'icehollow'], ['rimecrag', 'icehollow'],
  ['mossgate', 'thornpass'], ['thornpass', 'brightwall'], ['thornpass', 'stillhold'],
  ['ferncrest', 'stillhold'], ['emberfall', 'stillhold'], ['stillhold', 'meridian'],
  ['meridian', 'harrowvale'], ['meridian', 'rimecrag'], ['meridian', 'emberfall'], ['meridian', 'ferncrest'],
  ['blackhollow', 'harrowvale'], ['blackhollow', 'rimecrag']
];
G.neighbourCastles = id => G.ROADS.filter(r => r[0] === id || r[1] === id).map(r => (r[0] === id ? r[1] : r[0]));

// the castle's yield in mana per season (its own realm's season doubles it)
G.castleYield = castleId => {
  const c = G.get('castle', castleId);
  return c.yield;
};

// ---- knight classes: how a knight is dressed and how its troop fights. A class names the skill a knight starts with. ----
// ---- knights: 19 named knights (4 playable rulers, realm knights, the Dominion's, the Gray Knight, the free companies) ----
// look: a Humanoid spec. voice: the pitch and lilt of the babble that speaks for them (Animalese).
const KNIGHT = (id, o) => G.def('knight', id, Object.assign({ mov: 3, bond: 3, skill: null, leader: false, level: 1, items: [], start: null, look: {}, voice: {}, quote: '' }, o));
KNIGHT('oren', { name: 'Oren', title: 'Lord of Mossgate', realm: 'verdance', element: 'verdant', cls: 'springwarden', level: 4, hp: 26, atk: 7, def: 4, mov: 3, rng: 1, bond: 4, leader: true, start: 'mossgate',
  look: { hat: 'helmet', hair: 'short', outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#3e7a3a', coat: '#2a5a2a', trim: '#e0c060', cape: '#2a5a2a', metal: '#c8d0c0' } },
  voice: { pitch: 180, lilt: 1.1 }, quote: 'The gate is open because I opened it. Mind the mud.' });
KNIGHT('bryony', { name: 'Bryony', title: 'Warden of Ferncrest', realm: 'verdance', element: 'verdant', cls: 'archer', level: 2, hp: 17, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'ferncrest',
  look: { hat: 'band', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#5a8a3a', hair: '#7a4a2a', trim: '#f0e0a0' } }, voice: { pitch: 260, lilt: 1.3 }, quote: 'Arrows are patient. So am I.' });
KNIGHT('dunstan', { name: 'Dunstan', title: 'of the Larkhold Ford', realm: 'verdance', element: 'verdant', cls: 'squire', level: 2, hp: 21, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'larkhold',
  look: { hat: null, hair: 'spiky', outfit: 'shirt', colors: { cloth: '#4a6a3a', hair: '#3a2a1a' } }, voice: { pitch: 150, lilt: .9 }, quote: 'Horses drown, knights wade. I prefer wading.' });
KNIGHT('tamsin', { name: 'Tamsin', title: 'Sun-Queen of Brightwall', realm: 'solmark', element: 'solar', cls: 'sunsovereign', level: 4, hp: 25, atk: 8, def: 3, mov: 3, rng: 1, bond: 4, leader: true, start: 'brightwall',
  look: { hat: 'crown', hair: 'long', outfit: 'coat', sleeves: 'long', cape: { len: 7, width: 5, seg: 2.5 }, colors: { cloth: '#a03a22', coat: '#7a2a1a', trim: '#ffd36a', cape: '#c8502a', hair: '#e8b860', metal: '#e8c880' } },
  voice: { pitch: 240, lilt: 1.2 }, quote: 'Brightwall does not bow to weather. Neither do I.' });
KNIGHT('ysolde', { name: 'Ysolde', title: 'of the Emberfall Wells', realm: 'solmark', element: 'solar', cls: 'adept', level: 2, hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'emberfall',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', colors: { cloth: '#7a2a40', hair: '#2a1a1a', trim: '#ffb060' } }, voice: { pitch: 300, lilt: 1.4 }, quote: 'The wells remember every fire we set. So will I.' });
KNIGHT('ferrin', { name: 'Ferrin', title: 'Sunspire Captain', realm: 'solmark', element: 'solar', cls: 'squire', level: 2, hp: 22, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'sunspire',
  look: { hat: 'helmet', hair: 'short', outfit: 'shirt', colors: { cloth: '#8a3a22', hair: '#4a2a1a' } }, voice: { pitch: 170, lilt: 1 }, quote: 'Lances are for leaving things behind.' });
KNIGHT('wren', { name: 'Wren', title: 'Harvest-Lord of Gildmere', realm: 'amberlyn', element: 'ambered', cls: 'harvestking', level: 4, hp: 25, atk: 7, def: 5, mov: 3, rng: 1, bond: 4, leader: true, start: 'gildmere',
  look: { hat: 'cap', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { cloth: '#8a6a2a', coat: '#6a4a1a', trim: '#ffe0a0', hair: '#b08040' } }, voice: { pitch: 210, lilt: 1.0 }, quote: 'A harvest is a promise kept in the right order.' });
KNIGHT('marrow', { name: 'Marrow', title: 'of the Harrowvale Mill', realm: 'amberlyn', element: 'ambered', cls: 'brigand', level: 2, hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 3, start: 'harrowvale',
  look: { hat: 'band', hair: 'bald', outfit: 'shirt', colors: { cloth: '#6a5a3a', hair: '#2a2a2a' } }, voice: { pitch: 130, lilt: .8 }, quote: 'Grain first. Swords after.' });
KNIGHT('lark', { name: 'Lark', title: 'Quillon Runner', realm: 'amberlyn', element: 'ambered', cls: 'archer', level: 2, hp: 15, atk: 6, def: 2, mov: 5, rng: 2, bond: 3, start: 'quillon',
  look: { hat: 'cap', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#a06a2a', hair: '#d0a050', trim: '#ffd080' } }, voice: { pitch: 290, lilt: 1.5 }, quote: 'I can be at the ford before the rumour arrives.' });
KNIGHT('hale', { name: 'Hale', title: 'Ice-Lord of Frostwatch', realm: 'hoarfast', element: 'rime', cls: 'rimeduke', level: 4, hp: 27, atk: 7, def: 6, mov: 3, rng: 1, bond: 4, leader: true, start: 'frostwatch',
  look: { hat: 'helmet', hair: 'short', outfit: 'coat', sleeves: 'long', cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#3a5a8a', coat: '#2a3a6a', trim: '#dff4ff', cape: '#3a5a8a', metal: '#d8e8ff' } },
  voice: { pitch: 160, lilt: .9 }, quote: 'Frost keeps what the sun can only spoil.' });
KNIGHT('brannoc', { name: 'Brannoc', title: 'of the Rimecrag Pass', realm: 'hoarfast', element: 'rime', cls: 'squire', level: 2, hp: 22, atk: 7, def: 4, mov: 4, rng: 1, bond: 3, start: 'rimecrag',
  look: { hat: 'helmet', hair: 'short', outfit: 'shirt', colors: { cloth: '#2a4a7a', hair: '#e8f0ff' } }, voice: { pitch: 140, lilt: .85 }, quote: 'The pass is ours until the thaw says otherwise.' });
KNIGHT('ilse', { name: 'Ilse', title: 'Icehollow Seer', realm: 'hoarfast', element: 'rime', cls: 'adept', level: 2, hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'icehollow',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', colors: { cloth: '#4a6a9a', hair: '#dff0ff', trim: '#9ad8ff' } }, voice: { pitch: 310, lilt: 1.3 }, quote: 'The ice remembers the shape of everything it has held.' });
KNIGHT('vesper', { name: 'Vesper', title: 'Regent of the Hourless Dominion', realm: 'dominion', element: 'hour', cls: 'chancellor', level: 5, hp: 24, atk: 8, def: 3, mov: 3, rng: 2, bond: 4, leader: true, start: 'stillhold', skill: 'frost',
  look: { hat: 'pointed', hair: 'long', outfit: 'robe', sleeves: 'long', colors: { cloth: '#2a2040', hair: '#c8c0e0', trim: '#8a78c8', skin: '#d8d0e8' } }, voice: { pitch: 330, lilt: 1.1 }, quote: 'Time is a debt. I have come to collect.' });
KNIGHT('shade', { name: 'Shade', title: 'Stillhold Watch', realm: 'dominion', element: 'hour', cls: 'squire', level: 3, hp: 24, atk: 7, def: 5, mov: 3, rng: 1, bond: 3, start: 'stillhold',
  look: { hat: 'helmet', hair: 'bald', outfit: 'coat', colors: { cloth: '#2a2a3a', coat: '#1a1a2a', trim: '#8a78c8', metal: '#6a6080' } }, voice: { pitch: 120, lilt: .75 }, quote: 'Stand still. It will not hurt for long.' });
KNIGHT('ashen', { name: 'Ashen', title: 'Meridian Warden', realm: 'dominion', element: 'hour', cls: 'squire', level: 3, hp: 24, atk: 8, def: 4, mov: 4, rng: 1, bond: 3, start: 'meridian',
  look: { hat: null, hair: 'bald', outfit: 'shirt', colors: { cloth: '#3a3048', skin: '#c8c0d8' } }, voice: { pitch: 200, lilt: .95 }, quote: 'Every bell here is mine to count.' });
KNIGHT('gray', { name: 'The Gray Knight', title: 'Keeper of the Stopped Hour', realm: 'dominion', element: 'hour', cls: 'graynight', level: 7, hp: 34, atk: 10, def: 8, mov: 3, rng: 1, bond: 5, leader: true, start: 'meridian',
  look: { hat: 'helmet', hair: null, outfit: 'coat', sleeves: 'long', cape: { len: 8, width: 6, seg: 3 }, colors: { cloth: '#6a6a72', coat: '#4a4a52', trim: '#c8c8d0', cape: '#5a5a62', metal: '#b0b4c0', skin: '#a0a0a8' } },
  voice: { pitch: 100, lilt: .7 }, quote: 'The clock stops when I say so. Not before.', size: 'L' });
KNIGHT('nessa', { name: 'Nessa', title: 'Thornpass Free Blade', realm: 'free', element: 'neutral', cls: 'squire', level: 2, hp: 20, atk: 7, def: 3, mov: 4, rng: 1, bond: 2, start: 'thornpass',
  look: { hat: 'band', hair: 'ponytail', outfit: 'tunic', colors: { cloth: '#5a4a3a', hair: '#8a5a2a' } }, voice: { pitch: 270, lilt: 1.25 }, quote: 'Nobody owns the pass. Nobody owns me.' });
KNIGHT('tobin', { name: 'Tobin', title: 'Blackhollow Bandit', realm: 'free', element: 'neutral', cls: 'brigand', level: 2, hp: 21, atk: 6, def: 4, mov: 3, rng: 1, bond: 2, start: 'blackhollow',
  look: { hat: 'cap', hair: 'spiky', outfit: 'coat', colors: { cloth: '#4a3a2a', coat: '#3a2a1a', hair: '#5a3a1a' } }, voice: { pitch: 140, lilt: .9 }, quote: 'Toll paid, road open. Simple.' });
KNIGHT('kestrel', { name: 'Kestrel', title: 'Captain of the Thorn Road', realm: 'free', element: 'neutral', cls: 'ranger', level: 3, hp: 18, atk: 7, def: 2, mov: 4, rng: 2, bond: 3, start: 'thornpass',
  look: { hat: 'band', hair: 'long', outfit: 'tunic', colors: { cloth: '#5a6a3a', hair: '#e0c080' } }, voice: { pitch: 250, lilt: 1.2 }, quote: 'Watch the high ground. Always.' });
KNIGHT('magpie', { name: 'Magpie', title: 'Taker of Shiny Things', realm: 'free', element: 'neutral', cls: 'brigand', level: 2, hp: 19, atk: 6, def: 3, mov: 4, rng: 1, bond: 2, start: 'blackhollow',
  look: { hat: 'cap', hair: 'short', outfit: 'shirt', colors: { cloth: '#2a2a2a', hair: '#1a1a1a' } }, voice: { pitch: 320, lilt: 1.45 }, quote: 'Everything is worth something to somebody.' });

// ---- items: found on quests, in events and in castle treasuries. Each knight holds one. ----
G.def('item', 'sun-rune', { name: 'Sun Rune', desc: 'Attack +2. Warm to the touch.', atk: 2, def: 0, mov: 0, icon: 'sun' });
G.def('item', 'iron-shield', { name: 'Iron Shield', desc: 'Defence +2. Heavy on the arm.', atk: 0, def: 2, mov: 0, icon: 'shield' });
G.def('item', 'swift-boots', { name: 'Swift Boots', desc: 'Move +1. Good for hills, bad for sleeping.', atk: 0, def: 0, mov: 1, icon: 'boot' });
G.def('item', 'frost-charm', { name: 'Frost Charm', desc: 'Defence +1 against Rime. Cold to hold.', atk: 0, def: 1, mov: 0, icon: 'snow' });
G.def('item', 'green-phial', { name: 'Green Phial', desc: 'Mends a knight for 8 HP when a battle begins.', atk: 0, def: 0, mov: 0, heal: 8, icon: 'phial' });
