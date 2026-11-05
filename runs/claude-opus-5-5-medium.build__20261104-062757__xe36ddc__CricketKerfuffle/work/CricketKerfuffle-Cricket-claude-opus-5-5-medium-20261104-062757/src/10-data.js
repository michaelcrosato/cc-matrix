// ---- content as data, keyed by id: teams and players, grounds, deliveries, shots, specials, items, targets, chaos
// events, story chapters, commentary lines. Systems look things up by id; DESIGN-NOTES.md says how to add each kind.

// deliveries (8.4): km/h range, swing (+ away from a right-hander), seam, turn (degrees, + away from a right-hander),
// bounce and dip multipliers, the length band the AI aims at
const DELIVERIES = {
  express: { name: 'Express', fam: 'pace', kmh: [138, 148], swing: .1, seam: 1, turn: 0, bounce: 1, len: [70, 120] },
  bouncer: { name: 'Bouncer', fam: 'pace', kmh: [135, 145], swing: 0, seam: 1, turn: 0, bounce: 1.15, len: [140, 175] },
  yorker: { name: 'Yorker', fam: 'pace', kmh: [136, 146], swing: .15, seam: .5, turn: 0, bounce: .9, len: [8, 24] },
  slower: { name: 'Slower ball', fam: 'pace', kmh: [105, 115], swing: 0, seam: 1.2, turn: 0, bounce: .95, len: [50, 100], hideSpeed: true },
  outswing: { name: 'Outswinger', fam: 'swing', kmh: [125, 135], swing: 1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  inswing: { name: 'Inswinger', fam: 'swing', kmh: [125, 135], swing: -1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  wobble: { name: 'Wobble seam', fam: 'swing', kmh: [120, 130], swing: 0, wob: .3, seam: 3, turn: 0, bounce: 1, len: [60, 110] },
  dobber: { name: 'Dobber', fam: 'medium', kmh: [100, 110], swing: .1, seam: 1.5, turn: 0, bounce: .95, len: [60, 110] },
  cutter: { name: 'Cutter', fam: 'medium', kmh: [105, 115], swing: 0, seam: 1, turn: 3, bounce: .95, len: [60, 110] },
  knuckle: { name: 'Knuckle ball', fam: 'medium', kmh: [95, 105], swing: 0, wob: .5, seam: .5, turn: 0, bounce: .9, len: [40, 90] },
  legbreak: { name: 'Leg break', fam: 'spin', kmh: [78, 88], swing: -.3, seam: .3, turn: 9, bounce: 1.05, len: [50, 100] },
  googly: { name: 'Googly', fam: 'spin', kmh: [76, 86], swing: .2, seam: .3, turn: -8, bounce: 1.05, len: [50, 100] },
  topspin: { name: 'Topspinner', fam: 'spin', kmh: [80, 90], swing: 0, seam: .3, turn: 0, bounce: 1.2, len: [60, 110] },
  offbreak: { name: 'Off break', fam: 'spin', kmh: [80, 90], swing: .3, seam: .3, turn: -8, bounce: 1, len: [50, 100] },
  armball: { name: 'Arm ball', fam: 'spin', kmh: [88, 96], swing: .3, seam: .3, turn: 0, bounce: .95, len: [50, 100] },
  doosra: { name: 'Doosra', fam: 'spin', kmh: [78, 88], swing: 0, seam: .3, turn: 8, bounce: 1.05, len: [50, 100] },
  piston: { name: 'Piston Express', fam: 'machine', kmh: [160, 170], swing: 0, seam: .8, turn: 0, bounce: 1.05, len: [70, 120] },
  steamBouncer: { name: 'Steam Bouncer', fam: 'machine', kmh: [148, 152], swing: 0, seam: 1, turn: 0, bounce: 1.2, len: [145, 175] },
  spinCycle: { name: 'Spin Cycle', fam: 'machine', kmh: [94, 96], swing: 0, seam: 0, turn: 14, turnRand: true, bounce: 1.1, len: [50, 100] },
  banana: { name: 'Banana Swing', fam: 'machine', kmh: [128, 134], swing: 2.2, seam: .5, turn: 0, bounce: 1, len: [40, 80] }
};
const RUNUP = { pace: 2.0, swing: 1.7, medium: 1.5, spin: .9, machine: 1.2 };

// field presets (8.4.2): [position, angle from straight (+ off side), distance (b = boundary - 30)]
const FIELDS = {
  attacking: { name: 'Attacking', spots: [['slip', 165, 150], ['2nd slip', 158, 150], ['gully', 132, 150], ['point', 95, 230], ['cover', 58, 260], ['mid-off', 14, 300], ['mid-on', -14, 300], ['midwicket', -60, 240], ['fine leg', -162, 'b']] },
  balanced: { name: 'Balanced', spots: [['slip', 165, 150], ['point', 95, 240], ['cover', 55, 270], ['mid-off', 12, 320], ['mid-on', -12, 320], ['midwicket', -60, 270], ['square leg', -95, 250], ['fine leg', -160, 'b'], ['third man', 155, 'b']] },
  defensive: { name: 'Defensive', spots: [['point', 95, 250], ['deep cover', 55, 'b'], ['long-off', 12, 'b'], ['long-on', -12, 'b'], ['deep midwicket', -60, 'b'], ['deep square', -95, 'b'], ['fine leg', -160, 'b'], ['third man', 155, 'b'], ['cover', 40, 260]] },
  spin: { name: 'Spin attack', spots: [['slip', 160, 60], ['short leg', -100, 50], ['silly point', 100, 50], ['cover', 55, 240], ['mid-off', 12, 280], ['mid-on', -12, 280], ['midwicket', -60, 240], ['deep square', -95, 'b'], ['long-on', -15, 'b']] }
};
const FIELD_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];

// shots (8.5): button, lengths, sector (batter-frame degrees, + off side), the animation family, contactAt (s), launch
// (deg), speed (u/s), the zone (line: off-side offset from middle stump; z: height)
const SHOTS = [
  { id: 'straightDrive', name: 'Straight drive', b: 'shot', len: ['full', 'good'], sec: [-25, 25], fam: 'drive', at: .13, launch: 3, speed: 500, line: [-7, 9], z: [0, 15] },
  { id: 'coverDrive', name: 'Cover drive', b: 'shot', len: ['full'], sec: [25, 75], fam: 'drive', at: .13, launch: 4, speed: 510, line: [-4, 15], z: [0, 15] },
  { id: 'onDrive', name: 'On drive', b: 'shot', len: ['full', 'good'], sec: [-75, -25], fam: 'drive', at: .13, launch: 4, speed: 490, line: [-9, 7], z: [0, 15] },
  { id: 'flick', name: 'Flick off the pads', b: 'shot', len: ['full', 'good'], sec: [-130, -75], fam: 'flick', at: .12, launch: 6, speed: 460, line: [-11, 3], z: [0, 19] },
  { id: 'glance', name: 'Leg glance', b: 'shot', len: ['full', 'good', 'short'], sec: [-180, -130], fam: 'glance', at: .11, launch: 3, speed: 330, line: [-11, 1], z: [0, 22] },
  { id: 'punch', name: 'Back-foot punch', b: 'shot', len: ['good'], sec: [25, 75], fam: 'drive', at: .12, launch: 5, speed: 470, line: [-4, 15], z: [5, 23] },
  { id: 'pull', name: 'Pull', b: 'shot', len: ['short'], sec: [-130, -45], fam: 'pull', at: .12, launch: 8, speed: 520, line: [-7, 11], z: [12, 34] },
  { id: 'cut', name: 'Square cut', b: 'shot', len: ['short', 'good'], sec: [75, 125], fam: 'cut', at: .11, launch: 5, speed: 520, line: [4, 24], z: [5, 28] },
  { id: 'lateCut', name: 'Late cut', b: 'shot', len: ['full', 'good', 'short', 'yorker'], sec: [125, 180], fam: 'glance', at: .1, launch: 2, speed: 300, line: [3, 21], z: [2, 23] },
  { id: 'push', name: 'Push', b: 'shot', len: ['full', 'good', 'short', 'yorker'], sec: [-180, 180], fam: 'drive', at: .12, launch: 3, speed: 380, line: [-9, 13], z: [0, 25] },
  { id: 'loftStraight', name: 'Lofted straight hit', b: 'loft', len: ['full', 'good'], sec: [-30, 30], fam: 'loft', at: .14, launch: 36, speed: 360, line: [-7, 9], z: [0, 18] },
  { id: 'loftCover', name: 'Inside-out over cover', b: 'loft', len: ['full', 'good'], sec: [30, 85], fam: 'loft', at: .14, launch: 33, speed: 345, line: [-3, 17], z: [0, 18] },
  { id: 'slog', name: 'Slog sweep', b: 'loft', len: ['full', 'good', 'yorker'], sec: [-115, -30], fam: 'sweep', at: .15, launch: 35, speed: 360, line: [-11, 9], z: [0, 22] },
  { id: 'hook', name: 'Hook', b: 'loft', len: ['short'], sec: [-150, -45], fam: 'pull', at: .12, launch: 30, speed: 360, line: [-7, 11], z: [16, 40] },
  { id: 'upperCut', name: 'Upper cut', b: 'loft', len: ['short'], sec: [60, 140], fam: 'cut', at: .11, launch: 34, speed: 330, line: [3, 21], z: [16, 38] },
  { id: 'scoop', name: 'Scoop over the keeper', b: 'loft', len: ['full', 'good', 'yorker', 'short'], sec: [140, 180], sec2: [-180, -150], fam: 'scoop', at: .12, launch: 42, speed: 290, line: [-5, 7], z: [0, 22] },
  { id: 'helicopter', name: 'Helicopter shot', b: 'loft', len: ['yorker'], sec: [-40, 40], fam: 'heli', at: .12, launch: 38, speed: 370, line: [-5, 7], z: [0, 8] },
  { id: 'loftLeg', name: 'Lofted over midwicket', b: 'loft', len: ['full', 'good', 'short', 'yorker'], sec: [-180, 180], fam: 'loft', at: .14, launch: 32, speed: 335, line: [-9, 11], z: [0, 26] },
  { id: 'fwdDefence', name: 'Forward defence', b: 'block', len: ['full', 'good', 'yorker'], sec: [-180, 180], fam: 'block', at: .08, launch: 0, speed: 60, line: [-9, 13], z: [0, 21] },
  { id: 'backDefence', name: 'Back-foot defence', b: 'block', len: ['short'], sec: [-180, 180], fam: 'block', at: .08, launch: 0, speed: 50, line: [-9, 13], z: [7, 29] }
];
const SHOT = Object.fromEntries(SHOTS.map(s => [s.id, s]));
const lengthBand = d => d <= 24 ? 'yorker' : d <= 70 ? 'full' : d <= 130 ? 'good' : 'short';

// signature specials (8.6)
const SPECIALS = {
  kerfShot: { name: 'Kerfuffle Shot', kind: 'bat', text: 'A guaranteed PERFECT lofted hit, with a trail of fire' },
  kerfBall: { name: 'Kerfuffle Ball', kind: 'bowl', text: 'Green meter, +15% pace and double swing' },
  kettle: { name: 'Tea-Kettle Slog', kind: 'bat', text: 'PERFECT lofted hit, +25% distance, a steam whistle' },
  vicar: { name: "Vicar's Revenge", kind: 'bowl', text: 'A 155 km/h inswinging yorker with holy light' },
  grandad: { name: 'The Grandad', kind: 'bowl', text: 'A leg break that bounces three times' },
  stats: { name: 'Statistical Certainty', kind: 'bat', text: 'Shows the exact timing: GOOD guaranteed' },
  chirp: { name: 'The Chirp', kind: 'bowl', text: 'Flusters the batter: timing windows shrink' },
  longHandle: { name: 'The Long Handle', kind: 'bat', text: 'A lofted hit with power ×1.4' },
  dibbly: { name: 'Dibbly-Dobbly Doom', kind: 'bowl', text: 'An 80 km/h ball that wobbles in the air' },
  peregrine: { name: 'Peregrine Swoop', kind: 'bowl', text: 'Banana swing ×3, very late' },
  silverTray: { name: 'Silver Tray Save', kind: 'bowl', text: 'The next catch chance is guaranteed' },
  croquet: { name: 'The Croquet Drive', kind: 'bat', text: 'A ground shot no fielder can stop' },
  sunburn: { name: 'Sunburn Bouncer', kind: 'bowl', text: 'A 152 km/h bouncer in a heat haze' },
  bludgeon: { name: 'Boardwalk Bludgeon', kind: 'bat', text: 'A huge hit, +40% distance' },
  vanish: { name: 'Vanishing Ball', kind: 'bowl', text: 'Invisible for part of its flight' },
  sawn: { name: 'Sawn in Half', kind: 'bowl', text: 'A googly that saws the stumps in half' },
  lightning: { name: 'Lightning Stumping', kind: 'bowl', text: 'A spinner whose keeper stumps in a flash' },
  grudgeBall: { name: 'Grudge Ball', kind: 'bowl', text: 'An LBW-seeking yorker, full of resentment' },
  grudgeDrive: { name: 'Grudge Drive', kind: 'bat', text: 'A power drive straight back at the bowler' },
  triple: { name: 'Triple Threat', kind: 'bowl', text: 'Three balls released: only one is real' },
  ecto: { name: 'Ectoplasmic Edge', kind: 'bat', text: 'The ball passes through the first fielder' }
};

// items (8.7.1)
const ITEMS = {
  teapot: { name: 'Golden Teapot', side: 'bat', text: 'Next scoring shot: runs ×2', color: '#ffd23a' },
  horseshoe: { name: 'Lucky Horseshoe', side: 'bat', text: 'Next dismissal overturned', color: '#c8ccd8' },
  giantBat: { name: 'Giant Bat', side: 'bat', text: 'Bigger bat for 2 balls', color: '#e8d49a' },
  cake: { name: 'Cake Slice', side: 'any', text: 'Hype +40', color: '#ff8ad8' },
  sticky: { name: 'Sticky Gloves', side: 'bowl', text: 'Next catch guaranteed', color: '#8ad06a' },
  banana: { name: 'Banana Peel', side: 'bowl', text: 'Next run attempt: batters slip', color: '#ffe04a' },
  fogMachine: { name: 'Fog Machine', side: 'bowl', text: 'Next ball: the batter loses sight of it', color: '#a8b8c8' }
};
const BAT_ITEMS = ['teapot', 'horseshoe', 'giantBat', 'cake'], BOWL_ITEMS = ['sticky', 'banana', 'fogMachine', 'cake'];

// teams (8.2). Each player: bat (timing 1-10), pow, tech, bowl { del: [3 delivery ids], skill, fam }, fld, ctc, sp
// (special), look (rig options). Squads are filled to eleven from the name pool.
const TEAMS = [
  { id: 'ker', name: 'Kerfuffle CC', nick: 'The Teapots', code: 'KER', home: 'green', kit: { cloth: '#f2ead8', pants: '#efe6d2', trim: '#2f6b3a', cap: '#2f6b3a' }, chip: '#2f6b3a', strength: 6,
    pool: ['Hodge', 'Pemberton', 'Allsop', 'Twigg', 'Moss', 'Fairweather', 'Hobbs', 'Nettles'],
    stars: [
      { id: 'edie', name: 'Edie Pluckrose', short: 'PLUCKROSE', bat: 8, pow: 8, tech: 7, bowl: { del: ['express', 'bouncer', 'yorker'], skill: 8 }, fld: 7, ctc: 8, sp: 'kettle', bsp: 'vicar', voice: 240,
        look: { build: 'heroic', size: 1.2, hair: 'ponytail', colors: { hair: '#b0482a', skin: '#f2c8a0' } } },
      { id: 'dev', name: 'Dev Mistry', short: 'MISTRY', bat: 8, pow: 5, tech: 9, fld: 6, ctc: 6, sp: 'stats', voice: 170, look: { build: 'heroic', size: 1.18, hair: 'short', glasses: true, colors: { hair: '#1a1a22', skin: '#a8704a' } } },
      { id: 'pip', name: 'Pip Larkin', short: 'LARKIN', bat: 6, pow: 5, tech: 6, fld: 8, ctc: 9, keeper: true, sp: null, bsp: 'chirp', voice: 290, look: { build: 'chibi', size: 1.15, hair: 'spiky', colors: { hair: '#f0d060', skin: '#f2c8a0' } } },
      { id: 'basil', name: 'Basil Thwaite', short: 'THWAITE', bat: 3, pow: 3, tech: 5, bowl: { del: ['legbreak', 'googly', 'topspin'], skill: 9 }, fld: 3, ctc: 5, bsp: 'grandad', voice: 120, look: { build: 'chibi', size: 1.15, hair: 'bald', moustache: 'walrus', outfit: 'coat', colors: { coat: '#c8b48a', skin: '#e8b890', hair: '#d8d8d8' } } },
      { id: 'hodge', name: 'Ted Hodge', short: 'HODGE', bat: 5, pow: 6, tech: 5, bowl: { del: ['outswing', 'inswing', 'wobble'], skill: 7 }, fld: 6, ctc: 6, voice: 150, look: { build: 'heroic', size: 1.18, hair: 'short', colors: { hair: '#6a4a2a' } } }
    ] },
  { id: 'mud', name: 'Lower Muddleford Mutineers', nick: 'The Mutineers', code: 'MUD', home: 'green', kit: { cloth: '#6a4a2a', pants: '#5a3e24', trim: '#e07a2a', cap: '#e07a2a' }, chip: '#e07a2a', strength: 3,
    pool: ['Clod', 'Furrow', 'Bagshaw', 'Wurzel', 'Pratt', 'Muckle', 'Turnip', 'Haybale'],
    stars: [
      { id: 'gaz', name: 'Gaz Gristle', short: 'GRISTLE', bat: 5, pow: 9, tech: 3, fld: 4, ctc: 4, sp: 'longHandle', style: 'slogger', voice: 130, look: { build: 'bulky', size: 1.2, hair: 'bald', beard: true, colors: { skin: '#e8a882', facial: '#c8743a' } } },
      { id: 'terry', name: 'Big Terry Dunstable', short: 'DUNSTABLE', bat: 3, pow: 6, tech: 3, bowl: { del: ['dobber', 'cutter', 'knuckle'], skill: 6 }, fld: 3, ctc: 4, bsp: 'dibbly', voice: 110, look: { build: 'bulky', size: 1.22, hair: 'short', colors: { hair: '#3a2a1a' } } },
      { id: 'nan', name: 'Nan Gristle', short: 'N.GRISTLE', bat: 3, pow: 2, tech: 6, bowl: { del: ['offbreak', 'armball', 'topspin'], skill: 7 }, fld: 3, ctc: 6, voice: 230, look: { build: 'chibi', size: 1.1, hair: 'long', colors: { hair: '#e0e0e0' } } }
    ] },
  { id: 'gen', name: 'Gentlemen of Thrumpton', nick: 'The Gentlemen', code: 'GEN', home: 'hall', kit: { cloth: '#f4f4f0', pants: '#f0f0ea', trim: '#22305a', cap: '#d8b04a' }, chip: '#22305a', strength: 6,
    pool: ['Ffoulkes', 'Carstairs', 'Montague', 'St John-Smythe', 'Pargeter', 'Wimbourne', 'Ashby'],
    stars: [
      { id: 'peregrine', name: 'Hon. Peregrine Twistleton-Smythe', short: 'TWISTLETON', bat: 6, pow: 5, tech: 7, bowl: { del: ['outswing', 'inswing', 'express'], skill: 9 }, fld: 6, ctc: 6, bsp: 'peregrine', voice: 175, look: { build: 'heroic', size: 1.2, hair: 'short', moustache: 'handlebar', colors: { hair: '#d8b880' } } },
      { id: 'fortescue', name: 'Fortescue', short: 'FORTESCUE', bat: 4, pow: 3, tech: 6, bowl: { del: ['dobber', 'cutter', 'slower'], skill: 6 }, fld: 9, ctc: 10, bsp: 'silverTray', voice: 125, look: { build: 'heroic', size: 1.18, hair: 'bald', outfit: 'coat', colors: { coat: '#1a1a22', skin: '#e8c0a0' } } },
      { id: 'araminta', name: 'Lady Araminta Fitch', short: 'FITCH', bat: 9, pow: 6, tech: 8, fld: 6, ctc: 6, sp: 'croquet', voice: 250, look: { build: 'heroic', size: 1.16, hair: 'long', colors: { hair: '#2a1a12' } } }
    ] },
  { id: 'lar', name: 'Sunburnt Bay Larrikins', nick: 'The Larrikins', code: 'LAR', home: 'bay', kit: { cloth: '#1fb5a8', pants: '#ffd23a', trim: '#ffffff', cap: '#ffd23a' }, chip: '#1fb5a8', strength: 7,
    pool: ['Dunno', 'Bluey', 'Sandy', 'Robbo', 'Gazza', 'Davo', 'Stevo'],
    stars: [
      { id: 'shazza', name: 'Shazza Brannigan', short: 'BRANNIGAN', bat: 5, pow: 6, tech: 5, bowl: { del: ['express', 'bouncer', 'yorker'], skill: 9 }, fld: 7, ctc: 7, bsp: 'sunburn', voice: 245, look: { build: 'heroic', size: 1.2, hair: 'ponytail', colors: { hair: '#f8e080', skin: '#e8a070' } } },
      { id: 'kev', name: 'Kev "Thongs" Malone', short: 'MALONE', bat: 6, pow: 10, tech: 3, fld: 5, ctc: 5, sp: 'bludgeon', style: 'slogger', voice: 140, look: { build: 'bulky', size: 1.22, hair: 'spiky', colors: { hair: '#c89048', skin: '#e09060' } } },
      { id: 'wal', name: 'Big Wal', short: 'BIG WAL', bat: 5, pow: 7, tech: 4, fld: 7, ctc: 8, keeper: true, voice: 115, look: { build: 'bulky', size: 1.2, hair: 'short', colors: { hair: '#4a3020' } } }
    ] },
  { id: 'mag', name: 'Magic Circle XI', nick: 'The Conjurers', code: 'MAG', home: 'downs', kit: { cloth: '#5a2a7a', pants: '#3a1a52', trim: '#c8ccd8', cap: '#1a1a22' }, chip: '#5a2a7a', strength: 7,
    pool: ['Presto', 'Abra', 'Mystique', 'Prestidigitate', 'Sleight', 'Hocus', 'Pocus'],
    stars: [
      { id: 'spinaldo', name: 'The Great Spinaldo', short: 'SPINALDO', bat: 5, pow: 4, tech: 6, bowl: { del: ['legbreak', 'googly', 'doosra'], skill: 10 }, fld: 5, ctc: 6, bsp: 'vanish', voice: 135, look: { build: 'heroic', size: 1.22, hair: 'long', moustache: 'handlebar', hat: { style: 'pointed', color: '#1a1a22' }, cape: true, colors: { hair: '#1a1a22' } } },
      { id: 'zsazsa', name: 'Madame Zsa-Zsa Flick', short: 'FLICK', bat: 6, pow: 5, tech: 7, bowl: { del: ['googly', 'offbreak', 'armball'], skill: 8 }, fld: 6, ctc: 6, bsp: 'sawn', voice: 260, look: { build: 'heroic', size: 1.16, hair: 'long', colors: { hair: '#8a1a3a' } } },
      { id: 'houdini', name: 'Houdini Jnr', short: 'HOUDINI', bat: 6, pow: 5, tech: 6, fld: 8, ctc: 8, keeper: true, bsp: 'lightning', voice: 200, look: { build: 'chibi', size: 1.15, hair: 'spiky', colors: { hair: '#2a2a3a' } } }
    ] },
  { id: 'thr', name: "Thrumpton's Thunderbolts", nick: 'The Thunderbolts', code: 'THR', home: 'dome', kit: { cloth: '#1a1a22', pants: '#24242e', trim: '#7a3aff', cap: '#ffcf3a' }, chip: '#7a3aff', strength: 9,
    pool: ['Bartholomew', 'Silas', 'Ignatius', 'Obadiah', 'Cornelius', 'Ebenezer'], ghosts: true,
    stars: [
      { id: 'thrumpton', name: 'Lord Thrumpton-Vane', short: 'THRUMPTON', bat: 7, pow: 7, tech: 6, bowl: { del: ['inswing', 'yorker', 'slower'], skill: 7 }, fld: 4, ctc: 5, sp: 'grudgeDrive', bsp: 'grudgeBall', voice: 160, look: { build: 'bulky', size: 1.2, hair: 'short', moustache: 'handlebar', hat: { style: 'cap', color: '#6a5a3a' }, colors: { hair: '#8a8a8a', skin: '#f0c8b0' } } },
      { id: 'machine', name: 'The Thrumptonator 3000', short: 'THRUMPTONATOR', bat: 1, pow: 1, tech: 1, bowl: { del: ['piston', 'steamBouncer', 'spinCycle'], skill: 10 }, fld: 0, ctc: 0, machine: true, bsp: 'triple', voice: 90, look: { build: 'bulky' } },
      { id: 'grimble', name: 'Dr Ebenezer Grimble', short: 'GRIMBLE', bat: 8, pow: 7, tech: 8, fld: 7, ctc: 7, sp: 'ecto', ghost: true, voice: 100, look: { build: 'heroic', size: 1.2, hair: 'short', beard: true, colors: { hair: '#c8d8e8', skin: '#c8e0f0' } } }
    ] }
];
const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
// a squad of eleven: the stars, then generated players from the pool (seeded by the team, so it is the same every time)
function squad(team) {
  if (team._squad) return team._squad;
  const R = E.rng(team.id.charCodeAt(0) * 131 + team.id.charCodeAt(2)), out = team.stars.map(p => Object.assign({ team: team.id, hand: 1 }, p));
  const fams = [['express', 'bouncer', 'yorker'], ['outswing', 'inswing', 'wobble'], ['dobber', 'cutter', 'knuckle'], ['offbreak', 'armball', 'topspin'], ['legbreak', 'googly', 'topspin']];
  const skins = ['#f2c8a0', '#e8b890', '#c88a5a', '#a8704a', '#7a4a2a', '#f0d0b0'], hairs = ['#1a1a22', '#4a3020', '#8a5a2a', '#d8b060', '#b0482a', '#8a8a8a'];
  let bowlers = out.filter(p => p.bowl).length, keeper = out.some(p => p.keeper);
  const used = new Set(out.map(p => p.short));
  for (let i = 0; out.length < 11; i++) {
    const nm = team.pool[i % team.pool.length]; if (used.has(upper(nm)) && i < team.pool.length * 2) continue; used.add(upper(nm));
    const first = 'ABCDEFGHJKLMNPRSTW'[Math.floor(R() * 18)];
    const needBowl = bowlers < 5 && out.length >= 4, lower = out.length >= 7;
    const p = { id: team.id + '_' + i, name: first + '. ' + nm, short: upper(nm), team: team.id, bat: lower ? 2 + Math.floor(R() * 3) : 4 + Math.floor(R() * 4), pow: 3 + Math.floor(R() * 5), tech: 3 + Math.floor(R() * 5), fld: 4 + Math.floor(R() * 5), ctc: 4 + Math.floor(R() * 5),
      hand: R() < .3 ? -1 : 1, voice: 140 + Math.floor(R() * 120), ghost: !!team.ghosts,
      look: { build: R() < .2 ? 'bulky' : R() < .35 ? 'chibi' : 'heroic', size: 1.15 + R() * .07, hair: pick(['short', 'spiky', 'bald', 'long', 'short'], R), beard: R() < .15, moustache: R() < .15 ? 'walrus' : null, colors: { skin: team.ghosts ? '#c8e0f0' : pick(skins, R), hair: team.ghosts ? '#d8e8f8' : pick(hairs, R) } } };
    if (!keeper && out.length === 5) { p.keeper = true; keeper = true; }
    if (needBowl) { p.bowl = { del: fams[(bowlers + team.id.length) % fams.length], skill: 5 + Math.floor(R() * 4) }; bowlers++; }
    out.push(p);
  }
  for (const p of out) { if (p.bowl) p.bowl.fam = DELIVERIES[p.bowl.del[0]].fam; p.special = p.sp || null; }
  return (team._squad = out);
}
const allPlayers = () => TEAMS.flatMap(squad);
const playerById = id => allPlayers().find(p => p.id === id);

// grounds (8.3): boundary rx × ry, pitch factors, outfield decay, palette, the ends, stadium targets, chaos pool
const GROUNDS = {
  green: { name: 'Kerfuffle Village Green', short: 'THE VILLAGE GREEN', rx: 560, ry: 600, bounce: 1, turn: 1, seam: 1.2, pace: .95, outfield: 1.25, time: 'day', weather: 'clear', song: 'green',
    ends: ['Pavilion End', 'Leaning Wicket End'], crowd: .6, grass: ['#6fae4a', '#5e9c3e'], pitch: '#c9b98a', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', rope: '#f4f4f4', surround: 'village',
    targets: [{ id: 'pub', name: 'The Leaning Wicket window', at: [-640, 120, 26], r: 34, bonus: 6, line: 'Through the window of the Leaning Wicket! Last orders, I fear, have been called by the ball.' },
      { id: 'greenhouse', name: 'the vicarage greenhouse', at: [600, 330, 14], r: 36, bonus: 10, line: 'Into the vicarage greenhouse. There goes the marrow competition.' },
      { id: 'weathervane', name: 'the church weathervane', at: [420, -520, 110], r: 40, bonus: 12, line: 'He has hit the weathervane! The wind is now officially from the south-south-Kerfuffle.' },
      { id: 'hive', name: 'the beehive in the oak', at: [-470, -330, 60], r: 34, bonus: 4, line: 'Into the beehive. Oh dear. Oh dear oh dear. Everyone stay very still.' }],
    chaos: ['cow', 'bees', 'bells', 'mascot'] },
  hall: { name: 'Thrumpton Hall', short: 'THRUMPTON HALL', rx: 620, ry: 620, bounce: 1, turn: .9, seam: 1.1, pace: 1, outfield: .8, time: 'day', weather: 'overcast', song: 'hall',
    ends: ['Hall End', 'Orangery End'], crowd: .5, grass: ['#5f9f55', '#4f8c48'], pitch: '#c4b892', sky: ['#7a8696', '#9aa6b4', '#cfd6dc'], accent: '#22305a', rope: '#d8b04a', surround: 'hall',
    targets: [{ id: 'fountain', name: 'the fountain', at: [-560, 360, 16], r: 40, bonus: 6, line: 'Into the fountain! Fortescue will fetch it with a silver net.' },
      { id: 'phantom', name: "the Phantom's windscreen", at: [580, 220, 14], r: 34, bonus: 10, line: "Straight through the windscreen of his Lordship's motor car! Oh, splendid. I mean, oh dear." },
      { id: 'hallWindow', name: 'the Long Gallery window', at: [60, -690, 70], r: 44, bonus: 8, line: 'Through a window of the Long Gallery. A portrait of an ancestor looks thoroughly put out.' }],
    chaos: ['peacocks', 'teaTray', 'mascot'] },
  bay: { name: 'Sunburnt Bay', short: 'SUNBURNT BAY', rx: 640, ry: 520, bounce: 1.25, turn: .9, seam: 1, pace: 1.15, outfield: 1.1, sand: true, time: 'day', weather: 'clear', song: 'bay',
    ends: ['Pier End', 'Dunes End'], crowd: .7, grass: ['#e8d39a', '#dcc287'], pitch: '#d8c49a', sky: ['#3fb8ff', '#7fd8ff', '#bff0ff'], accent: '#1fb5a8', rope: '#ffd23a', surround: 'beach',
    targets: [{ id: 'ferris', name: 'the Ferris wheel', at: [-560, -420, 90], r: 50, bonus: 12, line: 'Into the Ferris wheel! A family from Dorking now has a souvenir.' },
      { id: 'icecream', name: 'the ice-cream van', at: [600, 300, 20], r: 36, bonus: 6, line: 'Onto the ice-cream van! It is raining ninety-nines!' },
      { id: 'shark', name: 'the inflatable shark', at: [-640, 260, 12], r: 38, bonus: 8, line: 'He has popped the inflatable shark. Jaws, it turns out, was mostly air.' }],
    chaos: ['gulls', 'tide', 'mascot'] },
  downs: { name: 'Dustbowl Downs', short: 'DUSTBOWL DOWNS', rx: 600, ry: 600, bounce: 1.05, turn: 1.6, seam: .9, pace: .9, outfield: .85, time: 'day', weather: 'clear', song: 'downs', storm: true,
    ends: ['Top Hat End', 'Water Tower End'], crowd: .5, grass: ['#a8a85a', '#97974e'], pitch: '#d4b37a', sky: ['#e8a860', '#ffcf8a', '#ffe8b8'], accent: '#5a2a7a', rope: '#c8ccd8', surround: 'downs',
    targets: [{ id: 'tophat', name: 'the giant top hat', at: [-560, 300, 30], r: 40, bonus: 8, line: 'Into the giant top hat! And out come... doves. Of course they do.' },
      { id: 'tower', name: 'the water tower', at: [520, -470, 80], r: 44, bonus: 10, line: 'He has holed the water tower! A brief and very local shower.' },
      { id: 'balloon', name: 'the hot-air balloon', at: [0, -560, 150], r: 46, bonus: 15, moving: true, line: 'He has hit the BALLOON! Two magicians and a rabbit are descending, slowly.' }],
    chaos: ['dustDevil', 'rabbits', 'rain', 'mascot'] },
  dome: { name: 'The Thrumpton Megadome', short: 'THE MEGADOME', rx: 700, ry: 700, bounce: 1.1, turn: 1, seam: 1, pace: 1.2, outfield: .7, time: 'night', weather: 'fog', song: 'dome',
    ends: ['Jumbotron End', 'Old Pavilion End'], crowd: 1, grass: ['#2f7a3a', '#286a32'], pitch: '#b8a888', sky: ['#04040e', '#0a0a1e', '#1a1040'], accent: '#7a3aff', rope: '#ffcf3a', surround: 'dome',
    targets: [{ id: 'jumbotron', name: 'the jumbotron', at: [0, -760, 120], r: 60, bonus: 15, line: 'Onto the JUMBOTRON! It now shows, I believe, a very large crack.' },
      { id: 'vip', name: "Thrumpton's VIP box", at: [-640, 120, 70], r: 44, bonus: 12, line: "Into his Lordship's VIP box! The champagne has been, how shall I put it, opened." },
      { id: 'bell', name: 'the ghost bell', at: [620, -320, 90], r: 40, bonus: 12, line: 'He has rung the ghost bell! Somewhere, an old scorer wakes.' },
      { id: 'laser', name: 'the laser rig', at: [600, 380, 60], r: 40, bonus: 8, line: 'Off the laser rig! The light show is now an abstract light show.' }],
    chaos: ['ghosts', 'fogBank', 'advert', 'fireworks'] }
};
const GROUND_ORDER = ['green', 'hall', 'bay', 'downs', 'dome'];

// chaos events (8.7.3): id, its name, how long it lasts (overs), what it does (29-chaos.js runs them)
const CHAOS = {
  cow: { name: 'Doris the cow', overs: 2, line: "There's a cow on the outfield. A Friesian, I believe. She's at deep midwicket and better positioned than their fine leg." },
  bees: { name: 'The bees', overs: 1, line: 'The bees are out of the oak and after a fielder. He is running faster than he has all season.' },
  bells: { name: 'Church bells', overs: 0, line: 'And the church bells ring out. Either a wedding, or the vicar has sat on the rope again.' },
  mascot: { name: 'The chicken', overs: 1, line: 'A pitch invader! A man in a chicken costume, pursued by two stewards. The chicken is winning.' },
  peacocks: { name: 'Peacocks', overs: 2, line: 'Peacocks on the outfield. Proud, vain, and in the way. Rather like the home side.' },
  teaTray: { name: "Fortescue's tea tray", overs: 0, line: 'Fortescue brings out the tea tray. Play is suspended for Earl Grey.' },
  gulls: { name: 'Seagulls', overs: 1, line: 'The seagulls are circling. Keep an eye on your chips, and your cricket ball.' },
  tide: { name: 'The tide', overs: 2, line: 'The tide is coming in. The square leg boundary is, technically, now at sea.' },
  dustDevil: { name: 'Dust devils', overs: 1, line: 'A dust devil whirls across the square. The ball in the air may take a detour.' },
  rabbits: { name: 'Rabbits', overs: 0, line: 'Rabbits! Out of the top hat and across the outfield. Seven of them. No, eight.' },
  rain: { name: 'The rain delay', overs: 0, line: 'And down it comes. The covers are on, the umbrellas are up, and the crowd discuss the weather.' },
  ghosts: { name: 'Ghost fielders', overs: 2, line: 'The ghost fielders are flickering. One of them, I swear, just walked through the umpire.' },
  fogBank: { name: 'A fog bank', overs: 2, line: 'A fog bank rolls in. Somewhere out there is a fielder. Possibly two.' },
  advert: { name: 'Advert break', overs: 0, line: 'We are contractually obliged to take a short break for a word from our sponsor.' },
  fireworks: { name: 'Fireworks', overs: 0, line: 'Fireworks over the Megadome! Thrumpton spared no expense, and no eardrums.' }
};

// the cast's voices (5.13.3): base pitch Hz, speed (syllable length ×), character
const VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5, color: '#ffd36a', name: 'SIR AUBREY' }, dazza: { base: 135, speed: .85, color: '#7ad0ff', name: 'DAZZA' },
  priya: { base: 210, speed: .9, color: '#ff9ad8', name: 'PROF. PRIYA' }, edie: { base: 240, speed: .9, color: '#8ae08a', name: 'EDIE' },
  basil: { base: 120, speed: 1.1, trem: 7, color: '#e8c890', name: 'BASIL' }, dev: { base: 170, speed: 1, color: '#a8c8ff', name: 'DEV' },
  pip: { base: 290, speed: .75, color: '#ffe060', name: 'PIP' }, crumb: { base: 220, speed: 1.05, color: '#ffb0a0', name: 'MRS CRUMB' },
  hollis: { base: 150, speed: 1.1, color: '#e0e0ff', name: 'REV. HOLLIS' }, thrumpton: { base: 160, speed: 1, nasal: true, color: '#c890ff', name: 'LORD THRUMPTON' },
  ghost: { base: 130, speed: 1.2, whisper: true, color: '#a8e0ff', name: 'THE GHOSTS' }, machine: { base: 90, speed: .9, ring: 30, color: '#ffcf3a', name: 'THRUMPTONATOR' },
  gaz: { base: 130, speed: .95, color: '#e07a2a', name: 'GAZ' }, peregrine: { base: 175, speed: 1.05, color: '#d8b04a', name: 'PEREGRINE' },
  shazza: { base: 245, speed: .85, color: '#1fb5a8', name: 'SHAZZA' }, spinaldo: { base: 135, speed: 1.15, vib: 4, color: '#c890ff', name: 'SPINALDO' },
  fortescue: { base: 125, speed: 1.2, color: '#c8ccd8', name: 'FORTESCUE' }, kev: { base: 140, speed: .85, color: '#ffd23a', name: 'KEV' }
};

for (const k in GROUNDS) GROUNDS[k].id = k;
for (const k in DELIVERIES) DELIVERIES[k].id = k;
