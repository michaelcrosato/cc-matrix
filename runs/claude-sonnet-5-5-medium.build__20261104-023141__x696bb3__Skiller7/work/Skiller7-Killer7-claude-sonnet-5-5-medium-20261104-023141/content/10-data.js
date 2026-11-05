// Content as data: weapons, the Seven, Whiteouts, items, upgrades, the Dossier.
const D = S7.def;

// ---- weapons: rate = shots/s, mag, reload s, dmg per pellet, spread (rad), range m, pellets, kind ----
D('weapons', 'revolver', { name: 'Station Revolver', rate: 2.4, mag: 6, reload: 1.3, dmg: 3, spread: .006, range: 40, pellets: 1, kind: 'hitscan', sfx: 'shot_rev' });
D('weapons', 'poles', { name: 'Pole Pistols', rate: 7, mag: 14, reload: 1.1, dmg: 1.2, spread: .02, range: 30, pellets: 1, kind: 'hitscan', sfx: 'shot_pole' });
D('weapons', 'rifle', { name: 'Hunting Rifle', rate: .9, mag: 4, reload: 1.8, dmg: 8, spread: .001, range: 90, pellets: 1, kind: 'hitscan', sfx: 'shot_rifle', scope: true });
D('weapons', 'shotgun', { name: 'Fur-Lined Shotgun', rate: 1.1, mag: 2, reload: 1.6, dmg: 1.7, spread: .075, range: 18, pellets: 8, kind: 'hitscan', sfx: 'shot_shotgun' });
D('weapons', 'alphorn', { name: 'Alphorn', rate: 1.4, mag: 5, reload: 1.2, dmg: 2.2, spread: .035, range: 26, pellets: 1, kind: 'hitscan', sfx: 'shot_horn', stun: .8 });
D('weapons', 'camera', { name: 'Press Camera', rate: 1.6, mag: 8, reload: 1.1, dmg: 1.6, spread: .004, range: 45, pellets: 1, kind: 'hitscan', sfx: 'shot_cam', reveal: 5, stun: .6 });
D('weapons', 'launcher', { name: 'Avalanche Launcher', rate: .55, mag: 3, reload: 2.2, dmg: 7, spread: .004, range: 50, pellets: 1, kind: 'blast', blast: 3.4, sfx: 'shot_launch' });
D('weapons', 'sweep', { name: 'Chipping Pick', rate: 1, mag: 1, reload: 1, dmg: 1, spread: 0, range: 3, pellets: 1, kind: 'hitscan', sfx: 'shot_pole' });

// ---- the Seven: HP, weapon, skill, look (E.Humanoid options), voice (Animalese settings) ----
const P = (id, o) => D('personas', id, o);
P('rurik', { name: 'Rurik Kessel', title: 'Ski Patrolman', hp: 100, weapon: 'revolver', skill: 'flare', skillName: 'Flare', skillCost: 12, color: '#d81e2a', blurb: 'Steady. Honest. Has pulled 212 people off mountains and put one back.',
  look: { size: 1.3, build: 'heroic', hat: { style: 'beanie', color: '#d81e2a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#d81e2a', pants: '#20242e', boot: '#101218', hair: '#4a3a30' } }, voice: { base: 150, wob: .18, rate: 1 } });
P('anselma', { name: 'Anselma Brandt', title: 'Downhill Racer', hp: 70, weapon: 'poles', skill: 'tuck', skillName: 'Tuck', skillCost: 10, color: '#f5b700', blurb: 'Has never been late. Has been early to several funerals.',
  look: { size: 1.25, build: 'chibi', hat: { style: 'racehelmet', color: '#f5b700' }, outfit: 'shirt', weapon: 'gun', colors: { cloth: '#f5b700', pants: '#1a2230', boot: '#101218', hair: '#c44' } }, voice: { base: 330, wob: .25, rate: 1.35 } });
P('baron', { name: 'Baron Ludo von Tanne', title: 'Telemark Aristocrat', hp: 80, weapon: 'rifle', skill: 'longlook', skillName: 'Long Look', skillCost: 0, color: '#3f7a52', blurb: 'Kneels to shoot, bows to nobody. Owns four valleys and no opinions.',
  look: { size: 1.35, build: 'heroic', hat: { style: 'felt', color: '#3f7a52' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#3f7a52', pants: '#4a3c2a', boot: '#2a1c12', hair: '#c8c0b0' } }, voice: { base: 120, wob: .1, rate: .8 } });
P('gustav', { name: 'Gustav Pelz', title: 'Fur-Coated Tycoon', hp: 120, weapon: 'shotgun', skill: 'rain', skillName: 'Make It Rain', skillCost: 0, color: '#7a3b5a', blurb: 'Buys the view, then the mountain, then the person standing in front of it.',
  look: { size: 1.4, build: 'bulky', hat: { style: 'ushanka', color: '#6a5a4a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#7a3b5a', pants: '#1c1820', boot: '#101018', hair: '#2a2a2a' } }, voice: { base: 95, wob: .08, rate: .75 } });
P('jodl', { name: 'Jodl Oberacher', title: 'Yodeler', hp: 75, weapon: 'alphorn', skill: 'echo', skillName: 'Echo', skillCost: 18, color: '#3b82f6', blurb: 'Sings one note. The mountain answers, and sometimes the glass.',
  look: { size: 1.3, build: 'chibi', hat: { style: 'felt', color: '#3b82f6' }, outfit: 'shirt', weapon: 'gun', colors: { cloth: '#3b82f6', pants: '#5a3a22', boot: '#3a2414', hair: '#d8a050' } }, voice: { base: 260, wob: .5, rate: 1.1 } });
P('vesper', { name: 'Vesper Lux', title: 'Press Photographer', hp: 60, weapon: 'camera', skill: 'flash', skillName: 'Flash', skillCost: 22, color: '#a8a8b8', blurb: 'Saw everything. Developed none of it. Prints are extra.',
  look: { size: 1.25, build: 'chibi', hat: { style: 'beret', color: '#202028' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#a8a8b8', pants: '#202028', boot: '#101018', hair: '#202028' } }, voice: { base: 210, wob: .22, rate: 1.2 } });
P('mara', { name: 'Mara Stollen', title: 'Avalanche Engineer', hp: 90, weapon: 'launcher', skill: 'charge', skillName: 'Charge', skillCost: 20, color: '#e07a1a', blurb: 'Knows precisely how much snow wants to fall. Helps it.',
  look: { size: 1.3, build: 'heroic', hat: { style: 'hardhat', color: '#e07a1a' }, outfit: 'coat', weapon: 'gun', colors: { cloth: '#e07a1a', pants: '#2a2a30', boot: '#101018', hair: '#3a2a20' } }, voice: { base: 175, wob: .15, rate: .95 } });
S7.ROSTER = ['rurik', 'anselma', 'baron', 'gustav', 'jodl', 'vesper', 'mara'];

// ---- Whiteouts (hp is before the Whiteout health slider; r = body radius, h = height, warm = Warm Spot offset ratio) ----
const W = (id, o) => D('enemies', id, o);
W('giggler', { name: 'Giggler', hp: 3, speed: 2.3, r: .42, h: 1.7, warm: [0, 1.28, .2], dmg: 14, laugh: 'giggle', color: '#e8eef5', rig: { size: 1.3, build: 'chibi', hat: { style: 'beanie', color: '#e8eef5' }, outfit: 'shirt', weapon: null, colors: { cloth: '#e8eef5', pants: '#cfd8e4', boot: '#9aa4b4' } }, drop: [4, 1], blurb: 'Laughs itself out of sight. Explodes of happiness.' });
W('bellhop', { name: 'Bellhop', hp: 7, speed: 1.8, r: .5, h: 1.8, warm: [0, 1.25, .2], dmg: 20, laugh: 'chuckle', color: '#b8283a', shield: { period: 3.2, open: 1.3 }, rig: { size: 1.35, build: 'heroic', hat: { style: 'pillbox', color: '#b8283a' }, outfit: 'coat', weapon: null, colors: { cloth: '#b8283a', pants: '#e8eef5', boot: '#202028' } }, drop: [8, 2], blurb: 'Pushes a luggage cart that blocks the Warm Spot. It lifts the cart to wave.' });
W('skier', { name: 'Schuss', hp: 2, speed: 5.4, r: .38, h: 1.6, warm: [0, 1.2, .2], dmg: 12, laugh: 'whoop', color: '#a8d8f4', dodge: true, rig: { size: 1.25, build: 'chibi', hat: { style: 'goggles', color: '#8fd0f0' }, outfit: 'shirt', weapon: null, colors: { cloth: '#a8d8f4', pants: '#d8e8f4', boot: '#5a6a7a' } }, drop: [5, 1], skis: true, blurb: 'Fast, giddy and sidesteps. Wait for it to land.' });
W('sumo', { name: 'Snow Sumo', hp: 16, speed: 1.1, r: .75, h: 2.1, warm: [0, 1.5, .26], warm2: [0, .8, -.3], dmg: 34, laugh: 'boom', color: '#d8e0ea', rig: { size: 1.7, build: 'bulky', hat: null, outfit: 'shirt', weapon: null, hair: 'bald', colors: { cloth: '#d8e0ea', pants: '#e8eef5', boot: '#aab4c4' } }, drop: [14, 4], blurb: 'Two Warm Spots: one on the chest, one on the back of the belt.' });
W('thrower', { name: 'Snowball Tenor', hp: 3, speed: 1.4, r: .42, h: 1.7, warm: [0, 1.3, .2], dmg: 10, laugh: 'trill', color: '#c0d0e8', ranged: { range: 12, every: 2.8, speed: 7 }, rig: { size: 1.3, build: 'chibi', hat: { style: 'felt', color: '#c0d0e8' }, outfit: 'coat', weapon: null, colors: { cloth: '#c0d0e8', pants: '#8a98b0', boot: '#4a5a6a' } }, drop: [6, 2], blurb: 'Keeps its distance and sings snowballs at you.' });

// ---- items, collectibles, upgrades ----
D('items', 'servicekey', { name: 'Service Key', text: 'Brass, warm to the touch. Opens the staff lift to Floor 3.' });
D('items', 'gondolaticket', { name: 'Gondola Ticket', text: 'Valid for one ascent. The date is tomorrow.' });
D('items', 'tbar', { name: 'T-Bar Token', text: 'A token for the T-bar. The bar is also a token for you.' });
S7.PINS = [
  ['pin1', 'Pin 1926', 'Lift Pin: the first lift boy, Pim, was hired the day the lift opened.'],
  ['pin2', 'Pin Nada', 'Lift Pin: Nada means nothing. Nobody has ever read it aloud twice.'],
  ['pin3', 'Pin Föhn', 'Lift Pin: the warm wind arrives on a Thursday. It is always a Thursday.'],
  ['pin4', 'Pin Cuckoo', 'Lift Pin: the clock in Room 7 has not struck since the featherbed.'],
  ['pin5', 'Pin Marmot', 'Lift Pin: Murmel has not slept since the Accord. Gratuity is customary.'],
  ['pin6', 'Pin Black', 'Lift Pin: the Black Run is black because nobody has returned the colour.'],
  ['pin7', 'Pin Seven', 'Lift Pin: there are seven of you. There has always been seven of you.']
];
S7.UPGRADES = [
  { id: 'edge', name: 'Sharper Edges', text: 'Bullets cut deeper. +15% damage per wax.', max: 3, cost: [3, 6, 10] },
  { id: 'fur', name: 'Fur Lining', text: 'More health in every coat. +15% per wax.', max: 3, cost: [3, 6, 10] },
  { id: 'lens', name: 'Long Lens', text: 'The Scan reaches further and lingers. +20% per wax.', max: 3, cost: [4, 7, 11] },
  { id: 'pocket', name: 'Deep Pockets', text: 'Carry more Red. +40 per wax.', max: 3, cost: [3, 6, 9] },
  { id: 'cold', name: 'Cold Blood', text: 'Red heals more. +25% per wax.', max: 3, cost: [4, 7, 11] },
  { id: 'quick', name: 'Quick Hands', text: 'Reload faster. -20% time per wax.', max: 3, cost: [3, 5, 8] }
];
S7.DOSSIER = [
  ['d_oma', 'OMA HOLLE', 'She is 104 and holds the mountain down with a featherbed. When she shakes it, seven people fall out of the wardrobe.'],
  ['d_foehn', 'MISTER FÖHN', 'The warm wind. He wants everyone to laugh until they are no longer in the room.'],
  ['d_whiteout', 'WHITEOUTS', 'People Föhn has touched. They laugh themselves invisible. They leave footprints, and breath, and a Warm Spot.'],
  ['d_scan', 'THE SCAN', 'A ring of cold from the chest. Anything laughing inside it is shown for a moment, against its will.'],
  ['d_seven', 'THE SEVEN', 'One body, seven coats. Whoever you are, someone else is wearing you at the next junction.'],
  ['d_red', 'RED', 'It is what is left when a Whiteout thaws. Heals, pays, and stains the snow in a way the snow dislikes.'],
  ['d_rime', 'RIME', 'Frozen crystal from the Warm Spot. Wax your coats with it at the Bench.'],
  ['d_sweep', 'THE SWEEP', 'He skis in from Room 7 when someone freezes. He does not talk. His pick says enough.'],
  ['d_accord', 'THE THAW ACCORD', 'A treaty between six neutral states, signed in pencil. It is raining on the pencil.'],
  ['d_murmel', 'MURMEL', 'A resort mascot bungeed to a ski rack. Knows things. Gratuity is customary.'],
  ['d_pim', 'PIM', 'Lift boy, 1926. Still waiting for someone to sit on the chair.']
];
