// Teams: colors, logos, rosters, ratings, looks, coaches, mascots, AI personalities, stars and their specials.
(() => {
'use strict';
const FF = window.FF;
const RATINGS = ['SPD', 'ACC', 'STR', 'HND', 'TCK', 'ARM', 'AIM', 'AWR', 'KCK'];
// base ratings by position: SPD ACC STR HND TCK ARM AIM AWR KCK
const BASE = {
  QB: [5, 5, 4, 5, 2, 7, 6, 6, 1], RB: [7, 7, 6, 5, 3, 1, 1, 5, 1], WR: [8, 7, 3, 7, 2, 1, 1, 5, 1], OL: [2, 3, 7, 3, 3, 1, 1, 5, 1],
  DE: [5, 5, 6, 3, 6, 1, 1, 5, 1], NT: [2, 3, 8, 2, 6, 1, 1, 5, 1], LB: [5, 5, 6, 4, 7, 1, 1, 6, 1], CB: [8, 7, 3, 5, 4, 1, 1, 5, 1],
  S: [7, 6, 4, 5, 6, 1, 1, 6, 1], K: [3, 3, 2, 3, 1, 4, 3, 5, 7]
};
const POS = { QB: 'QB', C: 'OL', LG: 'OL', RG: 'OL', RB: 'RB', WR1: 'WR', WR2: 'WR', DE1: 'DE', NT: 'NT', DE2: 'DE', LB1: 'LB', LB2: 'LB', CB: 'CB', S: 'S', K: 'K' };
const GROUP = { QB: 'QB', OL: 'OL', RB: 'RB', WR: 'WR', DE: 'DL', NT: 'DL', LB: 'LB', CB: 'CB', S: 'S', K: 'K' };
const SKIN = ['#f0c8a8', '#e0b090', '#c89070', '#a87050', '#6a4028', '#4a2c18'];
FF.RATINGS = RATINGS; FF.POS = POS; FF.SKIN = SKIN;
// a roster line: [slot, number, name, skin 1-6, hair style, hair color, { rating deltas or set }, special, bio, extras]
const T = [];
T.push({ id: 'fiascos', name: 'TUMBLEWEED JUNCTION FIASCOS', city: 'TUMBLEWEED JUNCTION', short: 'FIASCOS', abbr: 'TUM', stadium: 'tumbleweed',
  colors: { primary: '#e8742a', secondary: '#4a2a6a', trim: '#f4e8c8', helmet: '#e8742a', stripe: '#4a2a6a', pants: '#f4e8c8', cleats: '#1e1a22', glow: '#7aff6a' },
  logo: { rows: ['....y..y....', '...yoy.oy...', '..yoooyooy..', '..oobbbboo..', '.obdbbdbbbo.', '.bbdbbbdbbb.', '.bdbbdbbdbb.', '.bbbdbbbbdb.', '.bdbbbdbdbb.', '..bbdbbbbb..', '...bbbdbb...', '....bbbb....'], pal: { y: '#ffd84a', o: '#e8742a', b: '#a87a4a', d: '#5a3a1a' } },
  chant: ['FI', 'AS', 'CO'], sign: ['FIASCO!', 'GO TUM!', '0-99?!', 'PICKLES'],
  mod: { all: -1 }, ai: { run: .45, pass: .45, trick: .10, blitz: .25, lateHit: .10 },
  coach: { name: 'GUS BLUSTER', voice: 'bluster', look: { build: 'bulky', size: 1.25, hat: { style: 'cap', color: '#e8742a' }, hair: 'short', colors: { cloth: '#d84a3a', pants: '#3a3a4a', skin: '#f0a080', hair: '#6a4a2a' } } },
  mascot: { name: 'FUMBLES', head: 'tumbleweed', voice: 'mascot' },
  roster: [
    ['QB', 7, 'HAP HAZARD', 2, 'short', '#6a4a2a', { ARM: 2, AWR: 1 }, null, 'The rookie. Hauls pickle barrels. Cannon arm.', { star: 1 }],
    ['C', 50, 'TANK TANKERSLEY', 3, 'short', '#2a1a10', { STR: 2 }, null, 'A gentle giant who cries at sad movies.'],
    ['LG', 63, 'SPUD MURPHY', 1, 'short', '#c86a2a', {}, null, 'Always has a potato. Ginger beard.', { beard: '#c86a2a' }],
    ['RG', 66, 'LUGNUT LOPEZ', 3, 'ponytail', '#1a1210', {}, null, 'A mechanic.'],
    ['RB', 22, 'DOC DOBSON', 4, 'bald', '#1a1210', { ACC: 1 }, null, 'A dentist on weekdays.', { star: 1, stache: '#1a1210' }],
    ['WR1', 88, 'WHEELS WASHINGTON', 5, 'spiky', '#1a1210', { SPD: 2 }, null, 'Fast. Vain. Gold chain.', { star: 1 }],
    ['WR2', 81, 'PETEY PICKENS', 1, 'short', '#d8502a', { HND: -1 }, null, 'The owner\'s nephew. Brave. Butterfingered.'],
    ['DE1', 91, 'GRIZZ GRIZZWOLD', 2, 'long', '#4a3020', { STR: 1 }, null, 'A huge beard.', { beard: '#4a3020' }],
    ['NT', 95, 'MOOSE MALONEY', 4, 'short', '#1a1210', {}, null, 'Wide as a barn door.'],
    ['DE2', 97, 'RATTLESNAKE RITA RUIZ', 3, 'ponytail', '#2a1810', { ACC: 2, SPD: 1 }, null, 'The best player on the team. She knows it.', { star: 1 }],
    ['LB1', 52, 'BUCK BOONE', 1, 'short', '#b89a6a', {}, null, 'Buzz cut, buzz saw.'],
    ['LB2', 54, 'SAGEBRUSH SAM', 5, 'short', '#1a1210', {}, null, 'Talks to his cleats.', { stache: '#1a1210' }],
    ['CB', 24, 'DUST DEVIL DIAZ', 3, 'spiky', '#1a1210', { SPD: 1 }, null, 'Spins when he runs.'],
    ['S', 31, 'PREACHER PRUITT', 6, 'short', '#1a1210', { AWR: 2 }, null, 'Quotes scripture about tackling.', { star: 1 }],
    ['K', 3, 'TOE-JAM TOMMY', 1, 'long', '#e0c070', {}, null, 'Smells like victory. Mostly feet.', { size: 1.0 }]
  ] });
T.push({ id: 'mudhogs', name: 'BAYOU MUDHOGS', city: 'BAYOU', short: 'MUDHOGS', abbr: 'BAY', stadium: 'hogwallow',
  colors: { primary: '#4a6a2a', secondary: '#6a4a2a', trim: '#e8c040', helmet: '#4a6a2a', stripe: '#e8c040', pants: '#6a4a2a', cleats: '#2a1a10', glow: '#c8ff6a' },
  logo: { rows: ['.dd......dd.', '.dpd....dpd.', '..dppppppd..', '.dppppppppd.', '.dpkppppkpd.', '.dppppppppd.', '.dppnnnnppd.', 'wdpnknnknpdw', 'w.dpnnnnpd.w', '.w.dppppd.w.', '....dddd....', '............'], pal: { d: '#3a2414', p: '#c88a6a', k: '#14100c', n: '#e8a8a0', w: '#f4f0e0' } },
  chant: ['HOGS', 'HOGS', 'HOGS'], sign: ['HOGS!', 'MUD!', 'OINK', 'SOOIE!'],
  mod: { OL: { STR: 2 }, DL: { STR: 2 }, LB: { STR: 2 }, all: { SPD: -1 } }, ai: { run: .70, pass: .25, trick: .05, blitz: .30, lateHit: .35 },
  coach: { name: 'GATOR GUIDRY', voice: 'gator', look: { build: 'bulky', size: 1.2, hat: { style: 'cap', color: '#3a5a2a' }, colors: { cloth: '#6a4a2a', pants: '#3a3a2a', skin: '#c89070', hair: '#3a2a1a' } } },
  mascot: { name: 'HAMBONE', head: 'hog', voice: 'mascot' },
  roster: [
    ['QB', 10, 'CLETUS THIBODEAUX', 2, 'long', '#8a6a3a', { ARM: -2, AIM: -1, SPD: 2 }, null, 'A scrambler. Wrestles gators for fun.'],
    ['C', 60, 'GUMBO GUIDRY JR.', 3, 'short', '#2a1a10', {}, null, 'Coach\'s nephew.'],
    ['LG', 71, 'BOUDIN BROUSSARD', 2, 'bald', '#2a1a10', {}, null, 'Smells of smoked sausage.', { beard: '#5a3a1a' }],
    ['RG', 75, 'TOOTIE TRAHAN', 4, 'short', '#1a1210', {}, null, 'Plays accordion in the off season.'],
    ['RB', 44, 'BIG BERTHA BOUDREAUX', 3, 'ponytail', '#2a1a10', { set: { STR: 10, SPD: 6, ACC: 4 } }, 'MUDSLIDE', 'The boss of the bayou. Runs through people like hot butter through grits.', { size: 1.6, boss: 1 }],
    ['WR1', 80, 'CRAWDAD COMEAUX', 5, 'spiky', '#1a1210', {}, null, 'Pinches. Allegedly.'],
    ['WR2', 84, 'SKEETER LANDRY', 1, 'short', '#c8a060', {}, null, 'Buzzes around.'],
    ['DE1', 90, 'BAYOU BILLY BREAUX', 2, 'long', '#5a3a1a', {}, null, '', { beard: '#5a3a1a' }],
    ['NT', 98, 'HOG JAW HEBERT', 4, 'bald', '#1a1210', {}, null, ''],
    ['DE2', 92, 'CATFISH CORMIER', 3, 'short', '#1a1210', {}, null, '', { stache: '#1a1210' }],
    ['LB1', 51, 'MOSSY MOUTON', 2, 'short', '#6a5a3a', {}, null, ''],
    ['LB2', 57, 'RUSTY ROBICHAUX', 1, 'short', '#c8502a', {}, null, ''],
    ['CB', 21, 'PIROGUE PREJEAN', 5, 'short', '#1a1210', {}, null, ''],
    ['S', 33, 'GATOR BAIT GUILLORY', 3, 'spiky', '#2a1a10', {}, null, ''],
    ['K', 8, 'BOOTS BOUDREAUX', 3, 'short', '#2a1a10', {}, null, 'Bertha\'s cousin.', { size: 1.05 }]
  ] });
T.push({ id: 'owls', name: 'NEON NITE OWLS', city: 'AFTERGLOW CITY', short: 'NITE OWLS', abbr: 'NEO', stadium: 'afterglow',
  colors: { primary: '#1a1a2a', secondary: '#3af0f0', trim: '#f03ab0', helmet: '#1a1a2a', stripe: '#3af0f0', pants: '#1a1a2a', cleats: '#0a0a12', glow: '#3af0f0', glowing: true },
  logo: { rows: ['............', '.mm......mm.', '..mm....mm..', '.cccc..cccc.', 'cwkkc..cwkkc', 'ckkkc..ckkkc', '.cccc..cccc.', '.....yy.....', '.....yy.....', '......y.....', '............', '............'], pal: { m: '#f03ab0', c: '#3af0f0', w: '#ffffff', k: '#0a0a14', y: '#ffd84a' } },
  chant: ['HOOT', 'HOOT'], sign: ['HOOT!', 'GLOW!', 'NEON', 'LIGHTS!'],
  mod: { QB: { SPD: 2, HND: 1 }, RB: { SPD: 2, HND: 1 }, WR: { SPD: 2, HND: 1 }, CB: { SPD: 2, HND: 1 }, S: { SPD: 2, HND: 1 }, OL: { STR: -1 }, DL: { STR: -1 } },
  ai: { run: .25, pass: .65, trick: .10, blitz: .15, lateHit: .10 },
  coach: { name: 'DJ HOOT', voice: 'djhoot', look: { build: 'heroic', size: 1.2, hat: { style: 'band', color: '#3af0f0' }, colors: { cloth: '#2a1a3a', pants: '#1a1a2a', skin: '#a87050', hair: '#1a1210', trim: '#f03ab0' } } },
  mascot: { name: 'HOOTY', head: 'owl', voice: 'mascot' },
  roster: [
    ['QB', 1, 'LUMEN LOPEZ', 3, 'spiky', '#1a1210', { set: { ARM: 9, AIM: 9 } }, 'NIGHT VISION', 'Sees the open man in the dark.', { boss: 1 }],
    ['C', 55, 'BASS DROP BAKER', 4, 'short', '#1a1210', {}, null, ''],
    ['LG', 64, 'SUBWOOFER SMITH', 5, 'bald', '#1a1210', {}, null, ''],
    ['RG', 68, 'REVERB REYES', 3, 'short', '#1a1210', {}, null, ''],
    ['RB', 26, 'STROBE STEVENS', 2, 'spiky', '#f0e070', {}, null, ''],
    ['WR1', 11, 'ZAP ZAPATA', 3, 'spiky', '#3af0f0', { set: { SPD: 10, ACC: 9 } }, 'AFTERBURNER', 'You blinked. He is already in the end zone.', { boss: 1 }],
    ['WR2', 17, 'PIXEL PARK', 2, 'short', '#1a1210', {}, null, ''],
    ['DE1', 93, 'NEON NIKKI NAKAMURA', 2, 'ponytail', '#f03ab0', {}, null, ''],
    ['NT', 96, 'BLACKLIGHT BRUNO', 4, 'bald', '#1a1210', {}, null, ''],
    ['DE2', 99, 'GLOWSTICK GUS', 1, 'spiky', '#7aff6a', {}, null, ''],
    ['LB1', 50, 'LASER LARUE', 5, 'short', '#1a1210', {}, null, ''],
    ['LB2', 58, 'DISCO DAN', 3, 'long', '#3a2010', {}, null, ''],
    ['CB', 2, 'SPARKLE SPARKS', 1, 'ponytail', '#f0d070', {}, null, ''],
    ['S', 20, 'MIDNIGHT MOSS', 6, 'short', '#1a1210', {}, null, ''],
    ['K', 4, 'RAVE RAVENSWOOD', 2, 'spiky', '#f03ab0', {}, null, '', { size: 1.05 }]
  ] });
T.push({ id: 'yetis', name: 'GLACIER BAY YETIS', city: 'GLACIER BAY', short: 'YETIS', abbr: 'GLB', stadium: 'frostbite',
  colors: { primary: '#8ac8f0', secondary: '#f0f4f8', trim: '#2a3a6a', helmet: '#f0f4f8', stripe: '#8ac8f0', pants: '#2a3a6a', cleats: '#1a1a2a', glow: '#bfe8ff' },
  logo: { rows: ['..b.b.b.b...', '..b.b.b.b...', '............', '..wwwwwww...', '.wwwwwwwww..', '.wwbwwwbww..', '.wwwwwwwww..', '..wwwwwww...', '...wwbww....', '...wwwww....', '....www.....', '............'], pal: { w: '#f0f4f8', b: '#5aa8e0' } },
  chant: ['BRRR', 'BRRR'], sign: ['BRRR!', 'YETI!', 'COLD!', 'FROZEN'],
  mod: { DL: { STR: 2, TCK: 2 }, LB: { STR: 2, TCK: 2 }, all: { HND: 1, SPD: -1 } }, ai: { run: .50, pass: .45, trick: .05, blitz: .45, lateHit: .15 },
  coach: { name: 'BJORN ICEBERG', voice: 'iceberg', look: { build: 'bulky', size: 1.25, outfit: 'coat', sleeves: 'long', hair: 'long', colors: { cloth: '#8a6a4a', coat: '#d8ccb8', pants: '#3a3a4a', skin: '#f0c8a8', hair: '#e0e0e0' } } },
  mascot: { name: 'ABOMINABLE AL', head: 'yeti', voice: 'mascot' },
  roster: [
    ['QB', 9, 'SLEET SORENSEN', 1, 'short', '#e8d8a0', {}, null, 'Ice in his veins. Literally, probably.'],
    ['C', 61, 'TUNDRA THORSON', 1, 'long', '#c8a060', {}, null, '', { beard: '#c8a060' }],
    ['LG', 70, 'PERMAFROST PAULSEN', 2, 'short', '#8a6a3a', {}, null, ''],
    ['RG', 77, 'GLACIER GUNDERSON', 1, 'bald', '#c8a060', {}, null, '', { beard: '#e0c080' }],
    ['RB', 30, 'PLOW PETERSON', 2, 'short', '#6a4a2a', {}, null, ''],
    ['WR1', 82, 'FLURRY FINN', 1, 'spiky', '#f0f0f0', {}, null, ''],
    ['WR2', 87, 'ICICLE IVERSEN', 3, 'short', '#1a1210', {}, null, ''],
    ['DE1', 99, 'AVALANCHE', 1, 'long', '#f0f0f0', { set: { STR: 10, SPD: 6, TCK: 9 } }, 'SNOWPLOW', 'Seven feet tall. Speaks only in growls and sacks. Knits.', { size: 1.8, boss: 1, beard: '#f0f0f0' }],
    ['NT', 94, 'BERG BJORKLUND', 2, 'bald', '#6a4a2a', {}, null, ''],
    ['DE2', 91, 'HAILSTORM HANSEN', 1, 'ponytail', '#e8d8a0', {}, null, ''],
    ['LB1', 53, 'FROSTY FJELD', 1, 'short', '#f0f0f0', {}, null, ''],
    ['LB2', 59, 'SNOWBALL SVENSSON', 2, 'short', '#c8a060', {}, null, ''],
    ['CB', 23, 'POWDER PEDERSEN', 3, 'spiky', '#1a1210', {}, null, ''],
    ['S', 36, 'WHITEOUT WALLIN', 1, 'short', '#f0f0f0', {}, null, ''],
    ['K', 5, 'SNOWSHOE SAMUELSSON', 1, 'long', '#e8d8a0', {}, null, '', { size: 1.05 }]
  ] });
T.push({ id: 'dynasty', name: 'GOLD COAST DYNASTY', city: 'GOLD COAST', short: 'DYNASTY', abbr: 'GCD', stadium: 'megadome',
  colors: { primary: '#f0c040', secondary: '#18161e', trim: '#f4f4f0', helmet: '#f0c040', stripe: '#18161e', pants: '#18161e', cleats: '#f0c040', glow: '#ffe890' },
  logo: { rows: ['.g...g...g..', '.gg.ggg.gg..', '.ggggggggg..', '.gkgkgkgkg..', '..bbbbbbb...', '.bbbbbbbbbb.', 'bbbwwwwwwbbb', 'bbbbwbwbbbbb', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '..bbbbbbbb..', '............'], pal: { g: '#f0c040', k: '#18161e', b: '#8a4a22', w: '#ffffff' } },
  chant: ['DY', 'NAS', 'TY'], sign: ['$$$', 'GOLD!', '#1', 'DYNASTY'],
  mod: { all: 1 }, ai: { run: .45, pass: .50, trick: .05, blitz: .30, lateHit: .20 },
  coach: { name: 'PRESCOTT PRIMROSE', voice: 'primrose', look: { build: 'heroic', size: 1.2, hair: 'short', colors: { cloth: '#f4e8d0', pants: '#2a2a3a', skin: '#f0c8a8', hair: '#c8a060', trim: '#a8d0f0' } } },
  mascot: { name: 'GOLDIE', head: 'lion', voice: 'mascot' },
  roster: [
    ['QB', 12, 'BROCK STERLING III', 1, 'short', '#e8c870', { set: { ARM: 10, AIM: 9, AWR: 8 } }, 'GOLDEN SPIRAL', 'The owner\'s son. Smug. Has never been hit.', { boss: 1 }],
    ['C', 52, 'BLUE CHIP BIXBY', 1, 'short', '#8a6a3a', {}, null, ''],
    ['LG', 67, 'TRUST FUND TUCKER', 2, 'short', '#c8a060', {}, null, ''],
    ['RG', 74, 'OFFSHORE OSGOOD', 3, 'bald', '#1a1210', {}, null, ''],
    ['RB', 28, 'CHASE MONEY', 4, 'spiky', '#1a1210', {}, null, ''],
    ['WR1', 13, 'TREY GOLD', 5, 'short', '#1a1210', { SPD: 1 }, null, ''],
    ['WR2', 19, 'PRESTON PLATINUM', 1, 'short', '#f0f0f0', {}, null, ''],
    ['DE1', 90, 'GOLDEN GATE GRAYSON', 2, 'short', '#6a4a2a', {}, null, ''],
    ['NT', 97, 'VAULT VANCE', 4, 'bald', '#1a1210', {}, null, ''],
    ['DE2', 94, 'DIAMOND DUKE', 3, 'short', '#1a1210', {}, null, ''],
    ['LB1', 55, 'THE MOUNTAIN', 4, 'long', '#1a1210', { set: { STR: 9, TCK: 10, SPD: 6 } }, 'SEISMIC SACK', 'Malu Faleolo. He will fall on you. Like a mountain.', { size: 1.7, boss: 1 }],
    ['LB2', 50, 'ROYCE ROLLINS', 2, 'short', '#8a6a3a', {}, null, ''],
    ['CB', 22, 'SILVER SPOON SINCLAIR', 1, 'short', '#e8d8a0', {}, null, ''],
    ['S', 29, 'HEDGE FUND HARRINGTON', 2, 'short', '#6a4a2a', {}, null, ''],
    ['K', 1, 'PENNY PINCHER PERKINS', 1, 'short', '#c8a060', { set: { KCK: 9 } }, null, 'Charges by the yard.', { size: 1.05 }]
  ] });
T.push({ id: 'scrubs', name: 'THE SCRUBS', city: 'PRACTICE SQUAD', short: 'SCRUBS', abbr: 'PRC', stadium: 'tumbleweed', hidden: true,
  colors: { primary: '#8a8a90', secondary: '#c83a3a', trim: '#c83a3a', helmet: '#8a8a90', stripe: '#c83a3a', pants: '#6a6a70', cleats: '#2a2a30', glow: '#ff8a8a' },
  logo: { rows: ['............', '..rrrr......', '..r..r......', '.ssssssss...', 'ssrrrsssss..', 'ssrssrssss..', 'ssrrrsssssss', '.srssssssss.', '..sssss.....', '............', '............', '............'], pal: { s: '#c8c8d0', r: '#c83a3a' } },
  chant: ['PRAC', 'TICE'], sign: ['MEH', 'GO?', 'SCRUBS'],
  mod: { all: -2 }, ai: { run: .60, pass: .40, trick: 0, blitz: .10, lateHit: 0 },
  coach: { name: 'GUS BLUSTER', voice: 'bluster', look: { build: 'bulky', size: 1.25, hat: { style: 'cap', color: '#e8742a' }, colors: { cloth: '#d84a3a', pants: '#3a3a4a', skin: '#f0a080', hair: '#6a4a2a' } } },
  mascot: { name: 'DUMMY', head: 'dummy', voice: 'mascot' },
  roster: [
    ['QB', 60, 'BACKUP BOB', 2, 'short', '#6a4a2a', {}, null, ''], ['C', 61, 'SCOUT TEAM SCOTT', 3, 'short', '#1a1210', {}, null, ''],
    ['LG', 62, 'PRACTICE PAT', 1, 'short', '#c8a060', {}, null, ''], ['RG', 63, 'CLIPBOARD CARL', 4, 'bald', '#1a1210', {}, null, ''],
    ['RB', 64, 'WATERBOY WALT', 2, 'spiky', '#6a4a2a', {}, null, ''], ['WR1', 65, 'DUMMY DAN', 5, 'short', '#1a1210', {}, null, ''],
    ['WR2', 66, 'FILLER FRANK', 1, 'short', '#c86a2a', {}, null, ''], ['DE1', 90, 'BENCH BRENDA', 3, 'ponytail', '#2a1810', {}, null, ''],
    ['NT', 91, 'TRYOUT TROY', 4, 'short', '#1a1210', {}, null, ''], ['DE2', 92, 'SPARE SPENCER', 2, 'short', '#8a6a3a', {}, null, ''],
    ['LB1', 93, 'UNDERSTUDY URSULA', 1, 'ponytail', '#e0c070', {}, null, ''], ['LB2', 94, 'DEPTH CHART DEV', 6, 'short', '#1a1210', {}, null, ''],
    ['CB', 95, 'SUB SUSIE', 3, 'ponytail', '#1a1210', {}, null, ''], ['S', 96, 'PINNIE PETE', 2, 'short', '#6a4a2a', {}, null, ''],
    ['K', 99, 'LONG SHOT LARRY', 1, 'short', '#c8a060', {}, null, '', { size: 1.0 }]
  ] });

/** the team's ratings for each roster line: base by position, the team's modifier, the player's own delta (or set) */
function rate(team, line) {
  const [slot, , , , , , delta] = line, extra = line[9] || {}, pos = POS[slot], grp = GROUP[pos], base = BASE[pos].slice(), out = {};
  RATINGS.forEach((k, i) => { out[k] = base[i]; });
  const mods = team.mod || {}, add = m => { if (typeof m === 'number') { for (const k of RATINGS) out[k] += m; } else if (m) for (const k in m) out[k] += m[k]; };
  if (!(extra.star && typeof mods.all === 'number' && mods.all < 0)) add(mods.all);
  add(mods[grp]); add(mods[pos]);
  if (delta && delta.set) Object.assign(out, delta.set); else if (delta) for (const k in delta) out[k] += delta[k];
  for (const k of RATINGS) out[k] = Math.max(1, Math.min(10, Math.round(out[k])));
  return out;
}
for (const t of T) {
  t.players = t.roster.map(line => {
    const [slot, num, name, skin, hair, hairColor, , special, bio, extra = {}] = line;
    return { slot, pos: POS[slot], num, name, skin: SKIN[(skin || 1) - 1], hair, hairColor, special, bio, extra, r: rate(t, line), team: t.id,
      short: name.split(' ').slice(-1)[0] };
  });
  t.bySlot = Object.fromEntries(t.players.map(p => [p.slot, p]));
  const avg = ks => ks.reduce((a, k) => a + k, 0) / ks.length;
  const P = t.bySlot;
  t.bars = { PASS: avg([P.QB.r.ARM, P.QB.r.AIM, P.WR1.r.HND, P.WR2.r.SPD, P.WR1.r.SPD]), RUN: avg([P.RB.r.SPD, P.RB.r.STR, P.C.r.STR, P.LG.r.STR, P.RG.r.STR]),
    DEFENSE: avg([P.DE1.r.TCK, P.NT.r.STR, P.LB1.r.TCK, P.LB2.r.TCK, P.CB.r.SPD, P.S.r.TCK]), SPECIAL: avg([P.K.r.KCK, P.K.r.KCK, P.RB.r.SPD]) };
  t.star = t.players.find(p => p.special) || t.players.find(p => p.extra.star) || P.QB;
}
FF.data.teams = Object.fromEntries(T.map(t => [t.id, t]));
FF.data.teamList = T.map(t => t.id);
FF.data.playable = T.filter(t => !t.hidden).map(t => t.id);

// the cast who aren't on a roster: announcers, the owner, refs, the band
FF.data.cast = {
  chet: { name: 'CHET THUNDERBUNS', voice: 'chet', look: { build: 'heroic', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'spiky', colors: { cloth: '#f4f0e6', coat: '#c83a3a', pants: '#2a2a3a', skin: '#f0c8a8', hair: '#e8c060' } }, headset: true },
  lou: { name: 'LOU "THE TOE" DIGGS', voice: 'lou', look: { build: 'heroic', size: 1.2, outfit: 'coat', sleeves: 'long', hair: 'bald', colors: { cloth: '#f4f0e6', coat: '#2a4a8a', pants: '#2a2a3a', skin: '#a87050', hair: '#d0d0d0' } }, headset: true, stache: '#d0d0d0' },
  pearl: { name: 'MAMA PEARL', voice: 'pearl', look: { build: 'heroic', size: 1.15, hair: 'ponytail', face: { eyes: 'big' }, colors: { cloth: '#6aa84a', pants: '#4a3a5a', skin: '#e0b090', hair: '#c0c0c8', trim: '#2a6a2a' } } },
  sterling: { name: 'MONTGOMERY STERLING II', voice: 'sterling', look: { build: 'bulky', size: 1.25, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { cloth: '#f4f0e6', coat: '#d8a830', pants: '#d8a830', skin: '#f0c8a8', hair: '#d0d0d0', trim: '#18161e' } }, stache: '#d0d0d0' },
  ref: { name: 'ZEBRA ZEKE', voice: 'ref', look: { build: 'heroic', size: 1.15, hat: { style: 'cap', color: '#f4f4f0' }, colors: { cloth: '#f4f4f0', pants: '#f4f4f0', skin: '#c89070', hair: '#1a1210', boot: '#18161e' } }, stripes: true }
};
})();
