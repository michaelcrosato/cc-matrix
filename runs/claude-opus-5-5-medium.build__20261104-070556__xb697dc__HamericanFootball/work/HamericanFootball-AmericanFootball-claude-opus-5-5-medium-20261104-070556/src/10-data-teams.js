/* TEAMS: colors, logos, rosters, ratings, mascots, coaches, AI personalities and stars (data only). A designer adds a
 * team by adding an entry here: the validation test checks it. Ratings 1-10: SPD ACC STR HND TCK ARM AIM AWR KCK. */
(() => {
'use strict';
const FF = window.FF;
const BASE = {   // base ratings by position
  QB: [5, 5, 4, 5, 2, 7, 6, 6, 1], RB: [7, 7, 6, 5, 3, 1, 1, 5, 1], WR: [8, 7, 3, 7, 2, 1, 1, 5, 1], OL: [2, 3, 7, 3, 3, 1, 1, 5, 1],
  DE: [5, 5, 6, 3, 6, 1, 1, 5, 1], NT: [2, 3, 8, 2, 6, 1, 1, 5, 1], LB: [5, 5, 6, 4, 7, 1, 1, 6, 1], CB: [8, 7, 3, 5, 4, 1, 1, 5, 1],
  S: [7, 6, 4, 5, 6, 1, 1, 6, 1], K: [3, 3, 2, 3, 1, 4, 3, 5, 7]
};
const KEYS = ['SPD', 'ACC', 'STR', 'HND', 'TCK', 'ARM', 'AIM', 'AWR', 'KCK'];
const POS = { QB: 'QB', C: 'OL', LG: 'OL', RG: 'OL', RB: 'RB', WR1: 'WR', WR2: 'WR', DE1: 'DE', NT: 'NT', DE2: 'DE', LB1: 'LB', LB2: 'LB', CB: 'CB', S: 'S', K: 'K' };
const GROUP = { OL: 'OL', DE: 'DL', NT: 'DL', LB: 'LB', QB: 'QB', RB: 'RB', WR: 'WR', CB: 'DB', S: 'DB', K: 'K' };
const SLOTS = ['QB', 'C', 'LG', 'RG', 'RB', 'WR1', 'WR2', 'DE1', 'NT', 'DE2', 'LB1', 'LB2', 'CB', 'S', 'K'];
FF.SLOTS = SLOTS; FF.POS = POS; FF.RKEYS = KEYS;
FF.SKIN = ['#f0c8a8', '#e0b090', '#c89070', '#a87050', '#6a4028', '#4a2c18'];

// one roster line: [slot, number, name, skin 1-6, hair style, hair color, rating deltas, special, bio]
const R = (slot, num, name, skin, hair, hc, delta = {}, special = null, bio = '') => ({ slot, num, name, skin, hair, hairColor: hc, delta, special, bio });

const TEAMS = [
  { id: 'fiascos', name: 'TUMBLEWEED JUNCTION FIASCOS', short: 'FIASCOS', abbr: 'TUM', city: 'TUMBLEWEED JCT',
    colors: { primary: '#e8742a', secondary: '#4a2a6a', trim: '#f4e8c8', helmet: '#e8742a', stripe: '#4a2a6a', pants: '#f4e8c8', cleats: '#1e1a22', glow: '#7aff6a' },
    logo: ['....yy..o...', '..o.yo.yy...', '.yyoooooy.o.', 'o.obbbbbo.y.', '.yobboobboy.', 'yobboyyoobo.', '.obboyyobbo.', '.yobboobboy.', '..obbbbbbo..', '.o.ooooooo.y', '...y.oy..o..', '............'],
    pal: { o: '#e8742a', y: '#ffd84a', b: '#8a5a2a' }, stadium: 'tumbleweed', chant: ['FI', 'AS', 'CO'], mod: { all: { '*': -1 } },
    ai: { run: .45, pass: .45, trick: .10, blitz: .25, lateHit: .10 },
    coach: { name: 'GUS BLUSTER', voice: 'bluster', build: 'bulky', skin: 2, cloth: '#e8742a', hat: '#4a2a6a' },
    mascot: { name: 'FUMBLES', head: 'tumbleweed', body: '#8a5a2a' },
    roster: [R('QB', 7, 'HAP HAZARD', 2, 'short', '#6a4a2a', { ARM: 2, AWR: 1 }, null, 'Rookie. Hauls pickle barrels.'), R('C', 50, 'TANK TANKERSLEY', 3, 'short', '#2a1a10', { STR: 2 }),
      R('LG', 63, 'SPUD MURPHY', 1, 'short', '#c8602a'), R('RG', 66, 'LUGNUT LOPEZ', 3, 'ponytail', '#1a1410'), R('RB', 22, 'DOC DOBSON', 4, 'bald', '#1a1410', { ACC: 1 }, null, 'A dentist on weekdays.'),
      R('WR1', 88, 'WHEELS WASHINGTON', 5, 'spiky', '#1a1410', { SPD: 2 }, null, 'Fast. Vain.'), R('WR2', 81, 'PETEY PICKENS', 1, 'short', '#d0502a', { HND: -1 }),
      R('DE1', 91, 'GRIZZ GRIZZWOLD', 2, 'long', '#5a3a1a', { STR: 1 }), R('NT', 95, 'MOOSE MALONEY', 4, 'short', '#1a1410'), R('DE2', 97, 'RATTLESNAKE RITA', 3, 'ponytail', '#2a1a10', { ACC: 2, SPD: 1 }),
      R('LB1', 52, 'BUCK BOONE', 1, 'short', '#a07a40'), R('LB2', 54, 'SAGEBRUSH SAM', 5, 'short', '#1a1410'), R('CB', 24, 'DUST DEVIL DIAZ', 3, 'spiky', '#1a1410', { SPD: 1 }),
      R('S', 31, 'PREACHER PRUITT', 6, 'bald', '#1a1410', { AWR: 2 }), R('K', 3, 'TOE-JAM TOMMY', 1, 'long', '#e0c060')] },
  { id: 'mudhogs', name: 'BAYOU MUDHOGS', short: 'MUDHOGS', abbr: 'BAY', city: 'THE BAYOU',
    colors: { primary: '#4a6a2a', secondary: '#6a4a2a', trim: '#e8c040', helmet: '#4a6a2a', stripe: '#e8c040', pants: '#6a4a2a', cleats: '#1a1410', glow: '#e8c040' },
    logo: ['............', '..pp....pp..', '.pPPp..pPPp.', '.pPPPPPPPPp.', '.pPkPPPPkPp.', '.pPPPPPPPPp.', 'wpPPssssPPpw', '.wPsnsnsnPw.', '..PPssssPP..', '...pPPPPp...', '....pppp....', '............'],
    pal: { p: '#c87a8a', P: '#f0a0b0', k: '#1a1a1a', s: '#e07080', n: '#5a2a30', w: '#f4f0e0' }, stadium: 'hogwallow', chant: ['HOGS', 'HOGS', 'HOGS'],
    mod: { OL: { STR: 2 }, DL: { STR: 2 }, LB: { STR: 2 }, all: { SPD: -1 } }, ai: { run: .70, pass: .25, trick: .05, blitz: .30, lateHit: .35 },
    coach: { name: 'GATOR GUIDRY', voice: 'gator', build: 'bulky', skin: 2, cloth: '#4a6a2a', hat: '#3a5a1a' },
    mascot: { name: 'HAMBONE', head: 'hog', body: '#f0a0b0' },
    roster: [R('QB', 10, 'CLETUS THIBODEAUX', 2, 'long', '#8a5a2a', { ARM: -2, AIM: -1, SPD: 2 }), R('C', 60, 'GUMBO GUIDRY JR', 3, 'short', '#2a1a10'), R('LG', 71, 'BOUDIN BROUSSARD', 2, 'bald', '#2a1a10'),
      R('RG', 75, 'TOOTIE TRAHAN', 4, 'short', '#1a1410'), R('RB', 44, 'BIG BERTHA BOUDREAUX', 3, 'ponytail', '#3a2010', { STR: 6, SPD: -1, ACC: -3 }, 'mudslide', 'Runs through you like hot butter through grits.'),
      R('WR1', 80, 'CRAWDAD COMEAUX', 5, 'spiky', '#1a1410'), R('WR2', 84, 'SKEETER LANDRY', 1, 'short', '#c8a060'), R('DE1', 90, 'BAYOU BILLY BREAUX', 2, 'long', '#4a3018'),
      R('NT', 98, 'HOG JAW HEBERT', 3, 'bald', '#1a1410'), R('DE2', 92, 'CATFISH CORMIER', 4, 'short', '#1a1410'), R('LB1', 51, 'MOSSY MOUTON', 2, 'long', '#6a7a3a'),
      R('LB2', 57, 'RUSTY ROBICHAUX', 1, 'short', '#c05a2a'), R('CB', 21, 'PIROGUE PREJEAN', 5, 'short', '#1a1410'), R('S', 33, 'GATOR BAIT GUILLORY', 3, 'spiky', '#2a1a10'), R('K', 8, 'BOOTS BOUDREAUX', 2, 'short', '#5a3a1a')] },
  { id: 'owls', name: 'NEON NITE OWLS', short: 'NITE OWLS', abbr: 'NEO', city: 'AFTERGLOW CITY',
    colors: { primary: '#1a1a2a', secondary: '#3af0f0', trim: '#f03ab0', helmet: '#1a1a2a', stripe: '#3af0f0', pants: '#1a1a2a', cleats: '#f03ab0', glow: '#3af0f0' },
    logo: ['............', '.m........m.', '.mm......mm.', '..cccmmccc..', '.cCCCccCCCc.', '.cCkkCCkkCc.', '.cCkkCCkkCc.', '.cCCCccCCCc.', '..ccc.yccc..', '......y.....', '............', '............'],
    pal: { c: '#1a8a9a', C: '#3af0f0', k: '#101018', m: '#f03ab0', y: '#ffd84a' }, stadium: 'afterglow', chant: ['HOOT', 'HOOT'],
    mod: { QB: { SPD: 2, HND: 1 }, RB: { SPD: 2, HND: 1 }, WR: { SPD: 2, HND: 1 }, DB: { SPD: 2, HND: 1 }, OL: { STR: -1 }, DL: { STR: -1 } }, ai: { run: .25, pass: .65, trick: .10, blitz: .15, lateHit: .10 },
    coach: { name: 'DJ HOOT', voice: 'hoot', build: 'heroic', skin: 4, cloth: '#2a1a3a', hat: '#f03ab0' },
    mascot: { name: 'HOOTY', head: 'owl', body: '#3a3a5a' },
    roster: [R('QB', 1, 'LUMEN LOPEZ', 3, 'spiky', '#1a1410', { ARM: 2, AIM: 3 }, 'nightvision', 'Sees the open man in the dark.'), R('C', 55, 'BASS DROP BAKER', 4, 'short', '#1a1410'),
      R('LG', 64, 'SUBWOOFER SMITH', 2, 'bald', '#1a1410'), R('RG', 68, 'REVERB REYES', 3, 'short', '#1a1410'), R('RB', 26, 'STROBE STEVENS', 5, 'spiky', '#f03ab0'),
      R('WR1', 11, 'ZAP ZAPATA', 3, 'spiky', '#3af0f0', { SPD: 1, ACC: 2 }, 'afterburner', 'You blinked. He is already in the end zone.'), R('WR2', 17, 'PIXEL PARK', 1, 'short', '#1a1410'),
      R('DE1', 93, 'NEON NIKKI NAKAMURA', 1, 'ponytail', '#f03ab0'), R('NT', 96, 'BLACKLIGHT BRUNO', 4, 'bald', '#1a1410'), R('DE2', 99, 'GLOWSTICK GUS', 2, 'spiky', '#7aff6a'),
      R('LB1', 50, 'LASER LARUE', 5, 'short', '#1a1410'), R('LB2', 58, 'DISCO DAN', 2, 'long', '#e0c060'), R('CB', 2, 'SPARKLE SPARKS', 4, 'ponytail', '#f03ab0'),
      R('S', 20, 'MIDNIGHT MOSS', 6, 'short', '#1a1410'), R('K', 4, 'RAVE RAVENSWOOD', 2, 'spiky', '#3af0f0')] },
  { id: 'yetis', name: 'GLACIER BAY YETIS', short: 'YETIS', abbr: 'GLB', city: 'GLACIER BAY',
    colors: { primary: '#8ac8f0', secondary: '#f0f4f8', trim: '#2a3a6a', helmet: '#f0f4f8', stripe: '#8ac8f0', pants: '#2a3a6a', cleats: '#1a1a2a', glow: '#bfe8ff' },
    logo: ['............', '..w..w..w...', '..w..w..w...', '.wwwwwwwww..', '.wbbbbbbbw..', '.wbbbbbbbbw.', '.wbbbbbbbbw.', '..wbbbbbbw..', '..wbbbbbbw..', '...wbbbbw...', '....wwww....', '............'],
    pal: { w: '#f0f4f8', b: '#8ac8f0' }, stadium: 'frostbite', chant: ['BRRR', 'BRRR'],
    mod: { DL: { STR: 2, TCK: 2 }, LB: { STR: 2, TCK: 2 }, all: { HND: 1, SPD: -1 } }, ai: { run: .50, pass: .45, trick: .05, blitz: .45, lateHit: .15 },
    coach: { name: 'BJORN ICEBERG', voice: 'iceberg', build: 'bulky', skin: 1, cloth: '#5a4a3a', hat: '#8a7a6a' },
    mascot: { name: 'ABOMINABLE AL', head: 'yeti', body: '#f0f4f8' },
    roster: [R('QB', 9, 'SLEET SORENSEN', 1, 'short', '#f0e0a0'), R('C', 61, 'TUNDRA THORSON', 1, 'long', '#e0c070'), R('LG', 70, 'PERMAFROST PAULSEN', 2, 'short', '#c0a060'),
      R('RG', 77, 'GLACIER GUNDERSON', 1, 'bald', '#e0c070'), R('RB', 30, 'PLOW PETERSON', 2, 'short', '#8a5a2a'), R('WR1', 82, 'FLURRY FINN', 1, 'spiky', '#f0e0a0'),
      R('WR2', 87, 'ICICLE IVERSEN', 3, 'short', '#1a1410'), R('DE1', 99, 'AVALANCHE', 1, 'long', '#f4f4f0', { STR: 4, TCK: 3, SPD: 1 }, 'snowplow', 'Seven feet tall. Speaks only in growls and sacks.'),
      R('NT', 94, 'BERG BJORKLUND', 2, 'bald', '#e0c070'), R('DE2', 91, 'HAILSTORM HANSEN', 1, 'ponytail', '#f0e0a0'), R('LB1', 53, 'FROSTY FJELD', 1, 'short', '#f0f0f0'),
      R('LB2', 59, 'SNOWBALL SVENSSON', 2, 'short', '#c0a060'), R('CB', 23, 'POWDER PEDERSEN', 3, 'spiky', '#1a1410'), R('S', 36, 'WHITEOUT WALLIN', 1, 'long', '#f0f0f0'),
      R('K', 5, 'SNOWSHOE SAMUELSSON', 1, 'short', '#f0e0a0')] },
  { id: 'dynasty', name: 'GOLD COAST DYNASTY', short: 'DYNASTY', abbr: 'GCD', city: 'GOLD COAST',
    colors: { primary: '#f0c040', secondary: '#18161e', trim: '#f4f4f0', helmet: '#f0c040', stripe: '#18161e', pants: '#18161e', cleats: '#f0c040', glow: '#ffe890' },
    logo: ['............', '..y..y..y...', '..yy.yy.yy..', '..yyyyyyyy..', '..yrygyryy..', '..yyyyyyyy..', '...bbbbbb...', '..bBwBBwBb..', '.bBBwwwwBBb.', '..bBwBBwBb..', '...bbbbbb...', '............'],
    pal: { y: '#f0c040', r: '#e03a3a', g: '#3ae0a0', b: '#6a3a1a', B: '#a8602a', w: '#f4f4f0' }, stadium: 'megadome', chant: ['DY', 'NAS', 'TY'],
    mod: { all: { '*': 1 } }, ai: { run: .45, pass: .50, trick: .05, blitz: .30, lateHit: .20 },
    coach: { name: 'PRESCOTT PRIMROSE', voice: 'sterling', build: 'heroic', skin: 1, cloth: '#e8d8b0', hat: '#f0c040' },
    mascot: { name: 'GOLDIE', head: 'lion', body: '#f0c040' },
    roster: [R('QB', 12, 'BROCK STERLING III', 1, 'short', '#f0d070', { ARM: 2, AIM: 2, AWR: 1 }, 'goldenspiral', 'The owner\'s son. Has never been hit.'), R('C', 52, 'BLUE CHIP BIXBY', 1, 'short', '#c0a060'),
      R('LG', 67, 'TRUST FUND TUCKER', 2, 'short', '#5a3a1a'), R('RG', 74, 'OFFSHORE OSGOOD', 3, 'bald', '#1a1410'), R('RB', 28, 'CHASE MONEY', 4, 'spiky', '#1a1410'),
      R('WR1', 13, 'TREY GOLD', 5, 'short', '#1a1410', { SPD: 1 }), R('WR2', 19, 'PRESTON PLATINUM', 1, 'spiky', '#f0e0c0'), R('DE1', 90, 'GOLDEN GATE GRAYSON', 2, 'short', '#5a3a1a'),
      R('NT', 97, 'VAULT VANCE', 4, 'bald', '#1a1410'), R('DE2', 94, 'DIAMOND DUKE', 3, 'short', '#1a1410'), R('LB1', 55, 'THE MOUNTAIN', 4, 'long', '#1a1410', { STR: 2, TCK: 2 }, 'seismic', 'I will fall on you. Like a mountain.'),
      R('LB2', 50, 'ROYCE ROLLINS', 1, 'short', '#c0a060'), R('CB', 22, 'SILVER SPOON SINCLAIR', 1, 'spiky', '#e0e0e0'), R('S', 29, 'HEDGE FUND HARRINGTON', 2, 'short', '#5a3a1a'),
      R('K', 1, 'PENNY PINCHER PERKINS', 1, 'bald', '#c0a060', { KCK: 1 })] },
  { id: 'scrubs', name: 'THE SCRUBS', short: 'SCRUBS', abbr: 'PRC', city: 'PRACTICE SQUAD', hidden: true,
    colors: { primary: '#8a8a90', secondary: '#c83a3a', trim: '#c83a3a', helmet: '#8a8a90', stripe: '#c83a3a', pants: '#5a5a60', cleats: '#1a1a1a', glow: '#ff6a6a' },
    logo: ['............', '....gggg....', '...gGGGGg...', '..gGrrrGGg..', '..gGrGGrGg..', '..gGrrrGGgss', '..gGrGGGGgss', '..gGrGGGGg..', '...gGGGGg...', '....gggg....', '............', '............'],
    pal: { g: '#5a5a60', G: '#b0b0b8', r: '#c83a3a', s: '#e0e0e0' }, stadium: 'tumbleweed', chant: ['SCRUBS'], mod: { all: { '*': -2 } },
    ai: { run: .60, pass: .40, trick: 0, blitz: .10, lateHit: 0 },
    coach: { name: 'COACH BLUSTER', voice: 'bluster', build: 'bulky', skin: 2, cloth: '#8a8a90', hat: '#c83a3a' },
    mascot: { name: 'DUMMY', head: 'tumbleweed', body: '#8a8a90' },
    roster: [R('QB', 60, 'BACKUP BOB', 2, 'short', '#5a3a1a'), R('C', 61, 'SCOUT TEAM SCOTT', 1, 'short', '#c0a060'), R('LG', 62, 'PRACTICE PAT', 3, 'short', '#1a1410'),
      R('RG', 63, 'CLIPBOARD CARL', 4, 'bald', '#1a1410'), R('RB', 64, 'WATERBOY WALT', 2, 'spiky', '#5a3a1a'), R('WR1', 65, 'DUMMY DAN', 5, 'short', '#1a1410'),
      R('WR2', 66, 'FILLER FRANK', 1, 'short', '#c05a2a'), R('DE1', 90, 'BENCH BRENDA', 3, 'ponytail', '#1a1410'), R('NT', 91, 'TRYOUT TROY', 4, 'bald', '#1a1410'),
      R('DE2', 92, 'SPARE SPENCER', 2, 'short', '#5a3a1a'), R('LB1', 93, 'UNDERSTUDY URSULA', 1, 'ponytail', '#c05a2a'), R('LB2', 94, 'DEPTH CHART DEV', 5, 'short', '#1a1410'),
      R('CB', 95, 'SUB SUSIE', 3, 'ponytail', '#1a1410'), R('S', 96, 'PINNIE PETE', 2, 'spiky', '#5a3a1a'), R('K', 99, 'LONG SHOT LARRY', 1, 'long', '#e0c060')] }
];

// ratings: the position's base, the team's modifier for the group and for all, then the player's own deltas (clamped 1-10)
for (const t of TEAMS) for (const p of t.roster) {
  const pos = POS[p.slot], g = GROUP[pos], base = BASE[pos], r = {};
  KEYS.forEach((k, i) => {
    let v = base[i];
    for (const part of [t.mod.all, t.mod[g], t.mod[pos]]) if (part) v += (part['*'] && !p.special ? part['*'] : 0) + (part[k] || 0);
    v += p.delta[k] || 0; r[k] = Math.max(1, Math.min(10, v));
  });
  p.r = r; p.pos = pos; p.group = g; p.team = t.id;
  p.boss = p.special === 'mudslide' ? 1.6 : p.special === 'seismic' ? 1.7 : p.special === 'snowplow' ? 1.8 : 0;
}
// the 4 bars on the team-select screen
for (const t of TEAMS) {
  const avg = (slots, k) => slots.reduce((a, s) => a + t.roster.find(p => p.slot === s).r[k], 0) / slots.length;
  t.bars = { PASS: (avg(['QB'], 'ARM') + avg(['QB'], 'AIM') + avg(['WR1', 'WR2'], 'HND') + avg(['WR1', 'WR2'], 'SPD')) / 40,
    RUN: (avg(['RB'], 'SPD') + avg(['RB'], 'STR') + avg(['C', 'LG', 'RG'], 'STR') * 2) / 40,
    DEFENSE: (avg(['DE1', 'NT', 'DE2', 'LB1', 'LB2'], 'TCK') * 2 + avg(['CB', 'S'], 'SPD') + avg(['DE1', 'NT', 'DE2'], 'STR')) / 40,
    SPECIAL: (avg(['K'], 'KCK') * 3 + avg(['WR1'], 'SPD')) / 40 };
  t.star = t.roster.find(p => p.special) || t.roster.find(p => p.slot === 'QB');
}
FF.data.teams = TEAMS;
FF.team = id => TEAMS.find(t => t.id === id);

// the cast outside the teams (story, broadcast booth, refs)
FF.data.cast = {
  chet: { name: 'CHET THUNDERBUNS', voice: 'chet', rig: { build: 'heroic', skin: 2, hair: 'short', hairColor: '#3a2a1a', cloth: '#2a3a8a', coat: '#2a3a8a', headset: true } },
  lou: { name: 'LOU "THE TOE" DIGGS', voice: 'lou', rig: { build: 'heroic', skin: 4, hair: 'bald', hairColor: '#1a1410', cloth: '#8a2a2a', coat: '#8a2a2a', headset: true } },
  bluster: { name: 'COACH BLUSTER', voice: 'bluster', rig: { build: 'bulky', skin: 2, hair: 'short', hairColor: '#8a6a4a', cloth: '#e8742a', cap: '#4a2a6a', whistle: true } },
  pearl: { name: 'MAMA PEARL', voice: 'pearl', rig: { build: 'heroic', skin: 1, hair: 'ponytail', hairColor: '#b8b8c0', cloth: '#6a9a4a', apron: true } },
  hap: { name: 'HAP HAZARD', voice: 'hap', team: 'fiascos', slot: 'QB' },
  sterling: { name: 'MONTGOMERY STERLING II', voice: 'sterling', rig: { build: 'heroic', skin: 1, hair: 'short', hairColor: '#e0e0e0', cloth: '#f0c040', coat: '#f0c040' } },
  brock: { name: 'BROCK STERLING III', voice: 'brock', team: 'dynasty', slot: 'QB' },
  bertha: { name: 'BIG BERTHA', voice: 'bertha', team: 'mudhogs', slot: 'RB' },
  gator: { name: 'GATOR GUIDRY', voice: 'gator', rig: { build: 'bulky', skin: 2, hair: 'short', hairColor: '#3a2a1a', cloth: '#4a6a2a', cap: '#3a5a1a' } },
  lumen: { name: 'LUMEN LOPEZ', voice: 'lumen', team: 'owls', slot: 'QB' },
  zap: { name: 'ZAP ZAPATA', voice: 'zap', team: 'owls', slot: 'WR1' },
  hoot: { name: 'DJ HOOT', voice: 'hoot', rig: { build: 'heroic', skin: 4, hair: 'spiky', hairColor: '#f03ab0', cloth: '#2a1a3a', headset: true } },
  iceberg: { name: 'COACH ICEBERG', voice: 'iceberg', rig: { build: 'bulky', skin: 1, hair: 'long', hairColor: '#e0e0e0', cloth: '#5a4a3a', coat: '#7a6a5a' } },
  avalanche: { name: 'AVALANCHE', voice: 'avalanche', team: 'yetis', slot: 'DE1' },
  mountain: { name: 'THE MOUNTAIN', voice: 'mountain', team: 'dynasty', slot: 'LB1' },
  wheels: { name: 'WHEELS WASHINGTON', voice: 'hap', team: 'fiascos', slot: 'WR1' },
  fumbles: { name: 'FUMBLES', voice: 'mascot', mascot: 'fiascos' },
  ref: { name: 'ZEBRA ZEKE', voice: 'ref', rig: { build: 'heroic', skin: 3, hair: 'short', hairColor: '#1a1410', cloth: '#f0f0f0', ref: true, cap: '#f4f4f4' } }
};
})();
