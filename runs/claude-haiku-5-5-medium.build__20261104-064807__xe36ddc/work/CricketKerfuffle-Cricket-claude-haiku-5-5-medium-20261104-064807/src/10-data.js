/* ---- THE WORLD IN DATA. Units: 16 units = 1 metre. x across the ground, y along the pitch (the striker's stumps at
 * SY, toward the bowler's at BY, which is larger), z up. The bowler's end is at +y, so the broadcast camera looks down
 * the pitch from behind the bowler and the striker is at the top of the screen. ---- */
G.W = { PX: 576, SY: 416, BY: 736, CY: 576, RX: 520, RY: 540, CREASE: 20, STUMP_H: 12.5, RELEASE_Y: 706, RELEASE_Z: 34 };
G.W.BAT_CREASE = G.W.SY + G.W.CREASE;       // the striker's popping crease (y increases toward the bowler)
G.W.BOWL_CREASE = G.W.BY - G.W.CREASE;

/* ---- TEAMS: four sides, each with an eleven. Kits are colours for the rigs; stars are the first four names. ---- */
G.TEAMS = [
  { id: 'KER', name: 'Kerfuffle CC', nick: 'The Teapots', chip: '#f2ead8', home: true,
    kit: { cloth: '#f2ead8', pants: '#f2ead8', trim: '#2f6b3a', belt: '#2f6b3a', cap: '#2f6b3a', boot: '#3a2e24' },
    squad: ['Edie Pluckrose', 'Basil Thwaite', 'Dev Mistry', 'Pip Larkin', 'Hodge', 'Pemberton', 'Allsop', 'Twigg', 'Moss', 'Fairweather', 'Hobbs'],
    bowlers: [0, 1, 4, 5], keeper: 3, captain: 0 },
  { id: 'MUD', name: 'Lower Muddleford', nick: 'The Mutineers', chip: '#e07a2a',
    kit: { cloth: '#6a4a2a', pants: '#6a4a2a', trim: '#e07a2a', belt: '#e07a2a', cap: '#e07a2a', boot: '#2a1e14' },
    squad: ['Gaz Gristle', 'Big Terry Dunstable', 'Nan Gristle', 'Wal Bagshaw', 'Clod', 'Furrow', 'Pratt', 'Wurzel', 'Muckle', 'Hobnail', 'Sowerby'],
    bowlers: [1, 2, 4, 5], keeper: 3, captain: 0 },
  { id: 'THR', name: 'Gentlemen of Thrumpton', nick: 'The Gentlemen', chip: '#22305a',
    kit: { cloth: '#f4f2ea', pants: '#f4f2ea', trim: '#22305a', belt: '#d8b04a', cap: '#d8b04a', boot: '#1e2030' },
    squad: ['Hon. Peregrine Twistleton-Smythe', 'Fortescue', 'Lady Araminta Fitch', 'Ffoulkes', 'Carstairs', 'Montague', 'St John-Smythe', 'Pargeter', 'Halloran', 'Ambrose', 'Tuttle'],
    bowlers: [0, 4, 5, 6], keeper: 3, captain: 2 },
  { id: 'LAR', name: 'Sunburnt Bay Larrikins', nick: 'The Larrikins', chip: '#1fb5a8',
    kit: { cloth: '#1fb5a8', pants: '#1fb5a8', trim: '#ffd23a', belt: '#ffd23a', cap: '#ffd23a', boot: '#1a1a1e' },
    squad: ['Shazza Brannigan', 'Kev "Thongs" Malone', 'Big Wal', 'Bluey', 'Sandy', 'Robbo', 'Gazza', 'Davo', 'Dunno', 'Tanner', 'Rocko'],
    bowlers: [0, 1, 3, 5], keeper: 2, captain: 1 },
  { id: 'MAG', name: 'Magic Circle XI', nick: 'The Conjurers', chip: '#5a2a7a',
    kit: { cloth: '#5a2a7a', pants: '#2a2a3a', trim: '#c8ccd8', belt: '#c8ccd8', cap: '#c8ccd8', boot: '#1a1a22' },
    squad: ['Mystique', 'The Great Spinaldo', 'Madame Zsa-Zsa Flick', 'Houdini Jnr', 'Presto', 'Abra', 'Prestidigitate', 'Sleight', 'Dazzle', 'Illusion', 'Hocus'],
    bowlers: [0, 1, 2, 6], keeper: 3, captain: 1 },
  { id: 'THU', name: "Thrumpton's Thunderbolts", nick: 'The Thunderbolts', chip: '#7a3aff', ghosts: true,
    kit: { cloth: '#1a1a1e', pants: '#1a1a1e', trim: '#7a3aff', belt: '#ffcf3a', cap: '#7a3aff', boot: '#0e0e12' },
    squad: ['Lord Rufus Thrumpton-Vane', 'The Thrumptonator 3000', 'Dr Ebenezer Grimble', 'Bartholomew', 'Silas', 'Ignatius', 'Obadiah', 'Cornelius', 'Eternal Two', 'Eternal Three', 'Eternal Four'],
    bowlers: [1, 0, 4, 5], keeper: 3, captain: 0, ghostIdx: [3, 4, 5, 6, 7] }
];
// the players' looks (rig options) from their index: heroic stars, chibi comics, bulky sloggers; a third are left-handed
G.PLAYER_LOOK = [
  { build: 'heroic', hair: 'ponytail', hairColor: '#b0582a', skin: '#e0b090', hat: 'cap' },        // Edie
  { build: 'chibi', hair: 'bald', hairColor: '#d8d8d8', skin: '#e8c0a0', hat: 'cap', moustache: 'walrus' },   // Basil
  { build: 'heroic', hair: 'short', hairColor: '#1e1a1a', skin: '#b08060', hat: 'helmet', glasses: true },   // Dev
  { build: 'chibi', hair: 'spiky', hairColor: '#f0d070', skin: '#f0c8a8', hat: null, gloves: 'keeper' },  // Pip
  { build: 'bulky', hair: 'short', hairColor: '#3a2418', skin: '#c8906a', hat: 'cap', moustache: 'handlebar' },
  { build: 'heroic', hair: 'short', hairColor: '#8a6a4a', skin: '#e8c0a0', hat: 'cap' },
  { build: 'chibi', hair: 'long', hairColor: '#5a3a2a', skin: '#d8a880', hat: 'band' },
  { build: 'bulky', hair: 'short', hairColor: '#6a3a22', skin: '#8a5a3a', hat: 'helmet' },
  { build: 'heroic', hair: 'spiky', hairColor: '#2a2018', skin: '#e0b090', hat: 'cap' },
  { build: 'chibi', hair: 'short', hairColor: '#c8a050', skin: '#f0c8a8', hat: 'cap' },
  { build: 'bulky', hair: 'bald', hairColor: '#8a8a8a', skin: '#a07050', hat: 'cap', beard: 'full' }
];

/* ---- GROUNDS: three for the demo (the plan's five are reduced here). Each has its sky, its floor palette, its
 * weather and time of day, its boundary scale and its stadium targets (bonus runs when a ball passes through). ---- */
G.GROUNDS = {
  green: {
    id: 'green', name: 'Kerfuffle Village Green', short: 'THE GREEN', sky: ['#8fc4ff', '#ffe6b0'], light: 'day', ambient: .92,
    overcast: false, swing: 1, bounce: 1, grass: '#6fae4a', grassDark: '#5e9c3e', pitch: '#c9b98a', ring: '#f4f4f0',
    outfieldK: 1.0, boundary: 1.0, tip: 'The pub window is worth six. The vicarage greenhouse is worth ten.',
    targets: [
      { id: 'pub', name: 'The Leaning Wicket window', x: 180, y: 300, z: 26, r: 18, bonus: 6, colour: '#8a2a2a' },
      { id: 'greenhouse', name: 'Vicarage greenhouse', x: 920, y: 720, z: 26, r: 18, bonus: 10, colour: '#8ad8a8' }
    ],
    chaos: ['cow', 'bees', 'bells', 'peacock'], chaosTag: 'Doris the cow', camp: 'Pavilion End'
  },
  hall: {
    id: 'hall', name: 'Thrumpton Hall', short: 'THE HALL', sky: ['#9aa6b4', '#cfd6dc'], light: 'overcast', ambient: .78,
    overcast: true, swing: 1.5, bounce: 1, grass: '#5f9f55', grassDark: '#4f8c48', pitch: '#c4b892', ring: '#f4f4f0',
    outfieldK: 0.9, boundary: 1.12, tip: 'Overcast: the ball swings, the fountain is worth six, and the peacocks are not your friends.',
    targets: [
      { id: 'fountain', name: 'The fountain', x: 380, y: 260, z: 20, r: 22, bonus: 6, colour: '#8ad0e8' },
      { id: 'hallwindow', name: 'The Hall window', x: 760, y: 330, z: 30, r: 16, bonus: 8, colour: '#d8b04a' }
    ],
    chaos: ['peacock', 'rain', 'bells'], chaosTag: 'the peacocks', camp: 'Hall End'
  },
  bay: {
    id: 'bay', name: 'Sunburnt Bay', short: 'THE BAY', sky: ['#3fb8ff', '#bff0ff'], light: 'day', ambient: .98,
    overcast: false, swing: 0.8, bounce: 1.25, grass: '#e8d39a', grassDark: '#dcc287', pitch: '#d8c49a', ring: '#fffaf0',
    outfieldK: 1.4, boundary: 0.95, tip: 'Sand slows the ball, and the Ferris wheel is worth twelve.',
    targets: [
      { id: 'ferris', name: 'The Ferris wheel', x: 980, y: 520, z: 60, r: 26, bonus: 12, colour: '#ffd23a' },
      { id: 'icecream', name: 'The ice-cream van', x: 200, y: 640, z: 18, r: 18, bonus: 6, colour: '#fff0f0' }
    ],
    chaos: ['gulls', 'tide'], chaosTag: 'the seagulls', camp: 'Pier End'
  }
};
G.GROUNDS.dome = {
  id: 'dome', name: 'The Thrumpton Megadome', short: 'THE DOME', sky: ['#0a0a1e', '#2a1a4a'], light: 'night', ambient: .42,
  overcast: false, swing: 1, bounce: 1.1, grass: '#2f7a3a', grassDark: '#286a32', pitch: '#b8a888', ring: '#f4f4f0', fog: true,
  outfieldK: 0.7, boundary: 1.1, tip: 'Floodlights, fog banks, and a jumbotron worth fifteen. No tea. No interval.',
  targets: [
    { id: 'jumbotron', name: 'The jumbotron', x: 760, y: 300, z: 60, r: 26, bonus: 15, colour: '#7a3aff' },
    { id: 'vipbox', name: 'The VIP box', x: 380, y: 280, z: 40, r: 18, bonus: 12, colour: '#ffcf3a' }
  ],
  chaos: ['fog', 'fireworks'], chaosTag: 'the fog banks', camp: 'Jumbotron End'
};
G.GROUNDS.downs = {
  id: 'downs', name: 'Dustbowl Downs', short: 'THE DOWNS', sky: ['#ffcf8a', '#c89a6a'], light: 'day', ambient: .9,
  overcast: false, swing: 1, bounce: 1.05, spin: 1.6, grass: '#a8a85a', grassDark: '#97974e', pitch: '#d4b37a', ring: '#f4f4f0',
  outfieldK: 0.85, boundary: 1.0, tip: 'Rough outside off turns the spinners. The top hat is worth eight. The balloon is worth fifteen.',
  targets: [
    { id: 'tophat', name: 'The giant top hat', x: 300, y: 330, z: 40, r: 22, bonus: 8, colour: '#1a1a22' },
    { id: 'balloon', name: 'The hot-air balloon', x: 840, y: 240, z: 120, r: 26, bonus: 15, colour: '#e04a3a' }
  ],
  chaos: ['rain', 'dust'], chaosTag: 'the dust devils', camp: 'Top Hat End'
};
G.GROUND_ORDER = ['green', 'hall', 'bay', 'downs', 'dome'];

/* ---- DELIVERIES: the catalogue. kmh is nominal (x 2.757 units a second per km/h, times the ball speed setting).
 * swing: + is away from a right-hander; turn: degrees, + is away from a right-hander; bounce and dip multiply the pitch.
 * minY, maxY: where it pitches (the length bands, in world y: 460 is the yorker line; 566 short). ---- */
G.DELIVERIES = {
  express: { label: 'EXPRESS', fam: 'pace', kmh: [138, 148], swing: 0.1, turn: 0, bounce: 1.0, dip: 0, minY: 440, maxY: 620 },
  bouncer: { label: 'BOUNCER', fam: 'pace', kmh: [135, 145], swing: 0, turn: 0, bounce: 1.25, dip: 0, minY: 590, maxY: 650 },
  yorker: { label: 'YORKER', fam: 'pace', kmh: [136, 146], swing: 0.15, turn: 0, bounce: 0.9, dip: 0.1, minY: 440, maxY: 462 },
  outswing: { label: 'OUTSWINGER', fam: 'swing', kmh: [125, 135], swing: 1.0, turn: 0, bounce: 1.0, dip: 0, minY: 470, maxY: 530 },
  inswing: { label: 'INSWINGER', fam: 'swing', kmh: [125, 135], swing: -1.0, turn: 0, bounce: 1.0, dip: 0, minY: 470, maxY: 530 },
  legbreak: { label: 'LEG BREAK', fam: 'spin', kmh: [78, 88], swing: -0.3, turn: 9, bounce: 1.05, dip: 0.2, minY: 500, maxY: 580 },
  googly: { label: 'GOOGLY', fam: 'spin', kmh: [76, 86], swing: 0.2, turn: -8, bounce: 1.05, dip: 0.2, minY: 500, maxY: 580 },
  offbreak: { label: 'OFF BREAK', fam: 'spin', kmh: [80, 90], swing: 0.3, turn: -8, bounce: 1.0, dip: 0.15, minY: 500, maxY: 570 },
  dobber: { label: 'DOBBER', fam: 'medium', kmh: [100, 110], swing: 0.1, turn: 0, bounce: 0.95, dip: 0.1, minY: 480, maxY: 580 },
  cutter: { label: 'CUTTER', fam: 'medium', kmh: [105, 115], swing: 0, turn: 3, bounce: 0.95, dip: 0, minY: 480, maxY: 560 }
};
// the bowler types: which deliveries each family offers, and the three buttons' choices (shot, loft, block)
G.BOWL_KIT = {
  pace: ['express', 'yorker', 'bouncer'], swing: ['outswing', 'inswing', 'express'], medium: ['dobber', 'cutter', 'yorker'],
  spin: ['legbreak', 'googly', 'offbreak']
};

/* ---- SHOTS: the resolver table. A button, a length and a sector of the batter's frame (degrees, + off side, 0
 * straight, +/-180 behind) give one shot: contactAt is the seconds from the press to the bat's contact, launch the
 * angle, speed the outgoing speed in units a second, nat the natural direction when the stick is neutral. ---- */
G.SHOTS = {
  drive: { name: 'STRAIGHT DRIVE', contactAt: .13, launch: 3, speed: 300, nat: 0 },
  cover: { name: 'COVER DRIVE', contactAt: .13, launch: 4, speed: 310, nat: 50 },
  onDrive: { name: 'ON DRIVE', contactAt: .13, launch: 4, speed: 295, nat: -50 },
  flick: { name: 'FLICK', contactAt: .12, launch: 6, speed: 280, nat: -100 },
  push: { name: 'PUSH', contactAt: .12, launch: 3, speed: 230, nat: 0 },
  cut: { name: 'SQUARE CUT', contactAt: .11, launch: 5, speed: 320, nat: 100 },
  pull: { name: 'PULL', contactAt: .12, launch: 8, speed: 320, nat: -95 },
  dig: { name: 'DIG OUT', contactAt: .12, launch: 2, speed: 180, nat: 0 },
  loftStraight: { name: 'LOFTED STRAIGHT', contactAt: .14, launch: 38, speed: 240, lofted: true, nat: 0 },
  loftCover: { name: 'INSIDE-OUT LOFT', contactAt: .14, launch: 34, speed: 230, lofted: true, nat: 55 },
  slog: { name: 'SLOG-SWEEP', contactAt: .15, launch: 36, speed: 250, lofted: true, nat: -70 },
  hook: { name: 'HOOK', contactAt: .12, launch: 30, speed: 240, lofted: true, nat: -110 },
  upper: { name: 'UPPER CUT', contactAt: .11, launch: 34, speed: 230, lofted: true, nat: 90 },
  scoop: { name: 'SCOOP', contactAt: .12, launch: 42, speed: 190, lofted: true, nat: 170 },
  helicopter: { name: 'HELICOPTER', contactAt: .12, launch: 40, speed: 250, lofted: true, nat: 0 },
  defFwd: { name: 'FORWARD DEFENCE', contactAt: .08, launch: 0, speed: 60, nat: 0, defend: true },
  defBack: { name: 'BACK DEFENCE', contactAt: .08, launch: 0, speed: 50, nat: 0, defend: true }
};
// the resolver: (button, length of the pitch, sector) -> a shot key. length is one of yorker, full, good, short
G.resolveShot = (button, len, sector) => {
  const s = sector;
  if (button === 'shot') {
    if (len === 'yorker') return 'dig';
    if (len === 'full') return s >= -25 && s <= 25 ? 'drive' : s > 25 && s <= 75 ? 'cover' : s < -25 && s >= -75 ? 'onDrive' : s < -75 && s >= -130 ? 'flick' : s >= 75 && s <= 125 ? 'cut' : 'push';
    if (len === 'good') return s >= -25 && s <= 25 ? 'push' : s > 25 && s <= 75 ? 'cover' : s < -25 && s >= -130 ? 'flick' : s >= 75 && s <= 125 ? 'cut' : 'push';
    if (s >= -130 && s <= -60) return 'pull';                  // short
    if (s >= 60 && s <= 125) return 'cut';
    return 'push';
  }
  if (button === 'loft') {
    if (Math.abs(s) >= 150) return 'scoop';
    if (len === 'yorker') return 'helicopter';
    if (len === 'full') return s >= -30 && s <= 30 ? 'loftStraight' : s > 30 && s <= 80 ? 'loftCover' : s < -30 && s >= -110 ? 'slog' : 'loftStraight';
    if (len === 'good') return s < -30 && s >= -110 ? 'slog' : 'loftStraight';
    if (s >= -140 && s <= -60) return 'hook';                  // short
    if (s >= 60 && s <= 120) return 'upper';
    return 'hook';
  }
  // block: defend
  return len === 'short' ? 'defBack' : 'defFwd';
};
G.lengthOf = y => y <= G.W.BAT_CREASE + 24 ? 'yorker' : y <= G.W.BAT_CREASE + 70 ? 'full' : y <= G.W.BAT_CREASE + 130 ? 'good' : 'short';
G.kindOfShot = key => G.SHOTS[key] && G.SHOTS[key].lofted ? 'lofted' : 'ground';

/* ---- SPECIALS: eighteen signature moves, each owned by a player (G.OWNERS). A batter's special is a shot; a bowler's
 * is a delivery; a fielder's changes the next catch or the next ball. Hype fills one meter per side; a special empties it.
 * Effects are read by the simulation: shot (the shot it plays), mult (power), perfect (a PERFECT contact), minGrade,
 * unstoppable (goes through the fielders), passFirst (passes the first fielder), catchTrap (a catch is far likelier),
 * forceFour (a boundary), delivery (a bowling special's delivery, see the match). ---- */
G.SPECIALS = {
  teakettle: { kind: 'bat', name: 'TEA-KETTLE SLOG', text: 'A whistle, a steam trail, and a PERFECT lofted hit with a quarter more distance.', shot: 'loftStraight', mult: 1.25, perfect: true },
  kfShot: { kind: 'bat', name: 'KERFUFFLE SHOT', text: 'A guaranteed PERFECT lofted hit with a fire trail.', shot: 'loftStraight', perfect: true },
  longHandle: { kind: 'bat', name: 'THE LONG HANDLE', text: 'A lofted hit with four-fifths more power.', shot: 'loftStraight', mult: 1.4 },
  boardwalk: { kind: 'bat', name: 'BOARDWALK BLUDGEON', text: 'A huge hit, forty per cent further. Caught if a fielder is under it.', shot: 'loftStraight', mult: 1.4, catchTrap: true },
  croquet: { kind: 'bat', name: 'THE CROQUET DRIVE', text: 'A ground shot that goes through the fielders for four.', shot: 'drive', unstoppable: true, forceFour: true },
  ectoplasmic: { kind: 'bat', name: 'ECTOPLASMIC EDGE', text: 'The ball passes through the first fielder it meets.', shot: 'drive', passFirst: true },
  statistical: { kind: 'bat', name: 'STATISTICAL CERTAINTY', text: 'Dev has done the sums. A GOOD contact is guaranteed.', shot: 'drive', minGrade: 'GOOD' },
  vicar: { kind: 'bowl', name: "VICAR'S REVENGE", text: 'A yorker at 155 km/h with holy light. The edge zone is wider.', delivery: 'vicar' },
  sunburn: { kind: 'bowl', name: 'SUNBURN BOUNCER', text: 'A bouncer in the heat haze. Duck, or be dotted.', delivery: 'sunburn' },
  kfBall: { kind: 'bowl', name: 'KERFUFFLE BALL', text: 'Green meter, faster, and double swing.', delivery: 'kfBall' },
  grandad: { kind: 'bowl', name: 'THE GRANDAD', text: 'A leg-break that bounces hard. The batter is shocked: timing halved.', delivery: 'grandad' },
  peregrine: { kind: 'bowl', name: 'PEREGRINE SWOOP', text: 'Swing three times the usual, and late.', delivery: 'peregrine' },
  dibbly: { kind: 'bowl', name: 'DIBBLY-DOBBLY DOOM', text: 'An 80 km/h ball that wobbles in the air. The batter is mistimed.', delivery: 'dibbly' },
  sawn: { kind: 'bowl', name: 'SAWN IN HALF', text: 'A googly. A bowled wicket splits the stumps.', delivery: 'sawn' },
  grudge: { kind: 'bowl', name: 'THE GRUDGE BALL', text: 'A yorker that seeks the pad. The umpire is ten per cent keener.', delivery: 'grudge' },
  vanish: { kind: 'bowl', name: 'THE VANISHING BALL', text: 'The ball vanishes in mid-air. The shadow is still there.', delivery: 'vanish' },
  silverTray: { kind: 'field', name: 'SILVER TRAY SAVE', text: 'The next catch chance is guaranteed, on a silver tray.' },
  lightning: { kind: 'field', name: 'LIGHTNING STUMPING', text: 'The stumping window triples for one over.' },
  grudgeDrive: { kind: 'bat', name: 'THE GRUDGE DRIVE', text: 'A power drive straight back at the bowler.', shot: 'drive', mult: 1.3 },
  triple: { kind: 'bowl', name: 'TRIPLE THREAT', text: 'Three balls: two holograms on other lines, and one real ball. Only the real one matters.', delivery: 'triple' },
  chirp: { kind: 'field', name: 'THE CHIRP', text: 'Pip chirps. The next batter\'s timing windows shrink, or a CPU batter is flustered.' }
};
// the owners: which player carries which special, by team squad name
G.OWNERS = {
  'Edie Pluckrose': { bat: 'teakettle', bowl: 'vicar' }, 'Basil Thwaite': { bowl: 'grandad' }, 'Dev Mistry': { bat: 'statistical' }, 'Pip Larkin': { field: 'chirp' },
  'Gaz Gristle': { bat: 'longHandle' }, 'Big Terry Dunstable': { bowl: 'dibbly' },
  'Hon. Peregrine Twistleton-Smythe': { bowl: 'peregrine' }, 'Fortescue': { field: 'silverTray' }, 'Lady Araminta Fitch': { bat: 'croquet' },
  'Ffoulkes': { bat: 'ectoplasmic' }, 'Carstairs': { bowl: 'sawn' },
  'Mystique': {}, 'The Great Spinaldo': { bowl: 'vanish' }, 'Madame Zsa-Zsa Flick': { bowl: 'sawn' }, 'Houdini Jnr': { field: 'lightning' },
  'Lord Rufus Thrumpton-Vane': { bowl: 'grudge', bat: 'grudgeDrive' }, 'The Thrumptonator 3000': { bowl: 'triple' }, 'Dr Ebenezer Grimble': { bat: 'ectoplasmic' },
  'Shazza Brannigan': { bowl: 'sunburn' }, 'Kev "Thongs" Malone': { bat: 'boardwalk' }
};

/* ---- ITEMS: floating tokens the batting side can collect by passing a ball through them. ---- */
G.ITEMS = {
  teapot: { name: 'GOLDEN TEAPOT', text: 'The next scoring shot scores double.', colour: '#ffd23a' },
  horseshoe: { name: 'LUCKY HORSESHOE', text: 'The next dismissal is overturned.', colour: '#c8ccd8' },
  cake: { name: 'CAKE SLICE', text: 'Hype +40.', colour: '#f0a0c0' }
};

/* ---- CHAOS: scripted moments between balls. Each ends by itself and restores the field. ---- */
G.CHAOS = {
  cow: { name: 'DORIS THE COW', text: 'Doris the cow has wandered onto the outfield. She is at deep midwicket and, frankly, better placed than the fielder.' },
  bees: { name: 'BEES FROM THE HIVE', text: 'The bees from the oak have found a fielder. He is slower for an over.' },
  bells: { name: 'CHURCH BELLS', text: 'The church bells ring for a dot ball. Nobody knows why. Nobody asks.' },
  peacock: { name: 'PEACOCKS', text: 'Peacocks wander across the outfield, and a ground ball is deflected by one.' },
  rain: { name: 'RAIN', text: 'The rain has arrived. The covers are on. The Kerfuffle Method is consulted.' },
  gulls: { name: 'SEAGULLS', text: 'A seagull steals a stopped ball. Two byes, and a glare.' },
  tide: { name: 'THE TIDE', text: 'The tide comes in a little further. The boundary is now a little smaller.' },
  fog: { name: 'FOG BANKS', text: 'Fog rolls in across the outfield, and the far fielders go soft at the edges.' },
  dust: { name: 'DUST DEVILS', text: 'Dust devils spin across the pitch, and an aerial ball is turned by one.' },
  fireworks: { name: 'FIREWORKS', text: 'Fireworks from a box nobody can account for. The crowd loves it.' }
};

/* ---- COMMENTARY: two voices. A = Sir Aubrey (plummy, digressive), D = Dazza (blunt, a coastal fast bowler). Lines
 * are picked by event tag with a cooldown; {batter} {bowler} {team} {ground} {runs} {target} {kmh} are filled in. ---- */
G.LINES = {
  start: { A: ['Good afternoon from {ground}, where the sun is out, the tea is stewed, and {team} are about to play cricket, after a fashion.', 'We are under way. A pigeon has just taken guard at silly point, which seems a shame to waste.', 'Lovely day for it. Mrs Crumb has brought the scones, and the scones are, I am told, load-bearing.'],
    D: ['Should be a cracker. Or a shambles. Probably both, mate.', 'Right. Let us see what this lot can do.'] },
  dot: { A: ['Defended. A stroke of great dignity and no ambition whatsoever.', 'Left alone. The ball goes by like a gossip past a closed door.', 'Nothing doing. The bowler looks at the sky as if it owes him money.'],
    D: ['Nothing doing.', 'Tight line, that. Tight as a vicar at a jumble sale.'] },
  beaten: { A: ['Beaten all ends up! He could not have missed that more if he had brought a map.', 'Beaten! The stumps are safe, and so is the batter, which is, I suppose, the main thing.'],
    D: ['Played and missed. Dreadful. Lovely ball, mind.', 'Air shot, that. Plenty of air. Not much shot.'] },
  single: { A: ['A quick single, taken with all the urgency of a vicar late for a fete.', 'Three runs there, if the batsman can be persuaded to stop his feet.'],
    D: ['Tip and run.', 'Keep going, keep going, that is a single, my son.'] },
  four: { A: ['FOUR! Struck with the elegance of a swan, and the violence of an angry swan.', 'That is four, and it did not even touch the fielders on the way.'],
    D: ['Too short, too wide, too bad. Four.', 'Boundary, mate. Lovely shot.'] },
  six: { A: ['That is MAXIMUM! Somebody alert the air-traffic people.', 'Six! Clean over the rope, and the rope is not a small rope.'],
    D: ["That's gone into the next postcode, mate.", 'Six, and I am not even sure which postcode it landed in.'] },
  pub: { A: ['Through the window of the Leaning Wicket! Last orders, I fear, have been called by the ball.', 'The publican is coming out. He appears to be pleased, which is unusual.'],
    D: ['That window was not insured, mate.', 'Sorry, Vic. Sorry, Vic. Put it on the cricket.'] },
  greenhouse: { A: ['Into the vicarage greenhouse. There goes the marrow competition.', 'The greenhouse is no more. The Reverend has come out in his slippers.'],
    D: ['Marrows everywhere, mate.', 'That is a lot of glass for one shot.'] },
  bowled: { A: ['Bowled him! The stumps are doing cartwheels, which is more than the batsman managed.', 'Bowled! The timber has seen better days, and so, now, has the batter.'],
    D: ['Timber!', 'He never saw that one coming. Nobody did, mate.'] },
  caught: { A: ['A catch of quiet magnificence. Someone get that fielder a scone.', 'Caught! Safe as houses, and the ball is in the fielder and not the hedge.'],
    D: ['Up, up... and taken. Safe as houses.', 'Caught, plain as a pikelet.'] },
  dropped: { A: ['Dropped! Butter, I think, would have had a firmer grip.', 'He has put that down. Like a vicar with a hot teapot.'],
    D: ["Oh, he'll be buying the drinks tonight.", 'Drop, that. Drop of the year, that.'] },
  lbw: { A: ['A huge appeal! The Reverend raises... raises... yes, eventually, the finger.', 'Lbw, in the view of the umpire, and the umpire is the Reverend, which is either fine or a catastrophe.'],
    D: ['Plumb. Plumber than a plumber.', 'Dead in front, that. Dead as a dodo.'] },
  runout: { A: ['Yes! No! Wait! Sorry! The four stages of grief, conducted at a sprint.', 'Run out by a country mile, and the country is quite small.'],
    D: ['Run out by a country mile.', 'Ooh, he never got in. Never got in.'] },
  wide: { A: ['Wide. Wide enough to land a light aircraft.', 'Wide, and the umpire is already waving his cake fork.'], D: ['Wide. Wide enough to land a plane.'] },
  noball: { A: ['No-ball! He has overstepped, which in this village is practically a felony. Free hit to come.'], D: ['Overstepped, mate. Free hit.'] },
  fire: { A: ['Willow ablaze! Health and Safety will want a word.', 'The bat is smoking. Somebody fetch a bucket, and a sandwich.'],
    D: ['The bat is literally smoking. Someone fetch a bucket.', 'Flames on the willow. Lovely.'] },
  special: { A: ['Oh, he is going for something special. I cannot look. I am looking.', 'The special! Stand well back, the Reverend is in the way.'],
    D: ['Here we go, here we go.', 'Special, that. Special as a Sunday roast.'] },
  review: { A: ['Owl-Eye has it. Pitching in line. Hitting. And it is clipping the bails by a whisker of a whisker.'],
    D: ['Let us see the replay, then. Come on, Owl-Eye.'] },
  rain: { A: ['And down it comes. The covers are on, the umbrellas are up, and the crowd are discussing the weather.'], D: ['Covers on, tea on.'] },
  cow: { A: ['There is a cow on the outfield. A Friesian, I believe. She is at deep midwicket and, frankly, better positioned than their fine leg.'], D: ['That cow is fielding better than the lot of them.'] },
  idle: { A: ['A Mrs Hepplewhite of Lower Muddleford has sent in a lemon drizzle. Mrs Hepplewhite, you are a saint.', 'There is a pigeon at short leg who has, I think, been there since Tuesday.', 'I have been looking at this cake. I had not noticed the cricket.'],
    D: ['Lovely day for it.', 'Is it? I hadn\'t noticed.'] },
  target: { A: ['The target is {target}. Mrs Crumb has chalked it up, and the chalk is already fading.'], D: ['Need {target}. Steady, now.'] },
  win: { A: ['And that is the match! Victory for {winner}, for common sense, and for the scone.'], D: ['That is that, then. Shake hands, have a sandwich, try again.'] },
  loss: { A: ['A narrow defeat for {loser}, and a wide one for the scoreboard.'], D: ['Tough luck, lads. Have a sandwich.'] },
  tie: { A: ['A tie! A Super Over of almost unbearable tension follows, and the Reverend needs a sit-down.'], D: ['Super Over, lads. Hold tight.'] }
};
// the shouts: the gibberish voices' own words (captions in speech bubbles)
G.SHOUTS = ['YES!', 'NO!', 'WAIT!', 'TWO!', 'HOWZAT!', 'OUT!', 'CATCH IT!', 'MINE!', 'SORRY!', 'KER-FUF-FLE!'];

/* ---- STORY: the Grand Kerfuffle, in three chapters for this demo (the plan's full five are reduced). Each is a match
 * with its own scenario and its own dialogue beats; the Kerfuffle Goals earn the stars. ---- */
G.CHAPTERS = [
  { id: 1, title: 'A Gentle Knock', opp: 1, ground: 'green', overs: 2, wickets: 5, batFirst: true, teach: 'Aim, the ground shot, the loft, the defence and the run.',
    pre: [['AUBREY', 'Kerfuffle-on-the-Wold. Population: two hundred and twelve, and a cow called Doris.'], ['GAZ', 'By warm-up I mean a thrashing.'], ['EDIE', "Watch the ball, not the cake, Pip."]],
    post: [['THRUMPTON', "With the heater on. Beginner's luck. Thrumpton Hall next. Dress code: impeccable."]],
    goals: [['Win the match', m => m.won], ['Hit a six', m => m.stats.sixes > 0], ['Smash the pub window', m => !!(m.targetsHit.pub || m.targetsHit.greenhouse)]] },
  { id: 2, title: 'Tea on the Lawn', opp: 2, ground: 'hall', overs: 2, wickets: 5, batFirst: false, teach: 'Bowling, the meter, the fielding ring and the throw.',
    pre: [['PEREGRINE', 'Do mind the peacocks. They bite.'], ['FORTESCUE', 'Tea at the fall of the third wicket, or at four, whichever is more dignified.']],
    post: [['PEREGRINE', 'I shall have Fortescue polish your trophy. With marmalade.']],
    goals: [['Win the match', m => m.won], ['Take a catch on the ring', m => m.stats.catches > 0], ['Hit the Hall window', m => !!(m.targetsHit.hallwindow || m.targetsHit.fountain)]] },
  { id: 3, title: 'Sand in the Sandwiches', opp: 3, ground: 'bay', overs: 2, wickets: 5, batFirst: true, teach: 'Bouncers, the tide and the dive into the crease.',
    pre: [['SHAZZA', 'He has been buying ringers. Weird ones. See-through ones.'], ['BLUEY', 'Statistically, sunscreen does not melt at-- Mate.']],
    post: [['SHAZZA', 'Not bad, Teapots. Not bad at all.']],
    goals: [['Win the match', m => m.won], ['Hook a six', m => m.stats.sixes > 0], ['Dive at the crease', m => m.stats.dives > 0]] },
  { id: 4, title: 'Now You See It', opp: 4, ground: 'downs', overs: 2, wickets: 5, batFirst: false, forceRain: true, teach: 'Spin, the charge, the stumping and the rain rule.',
    pre: [['SPINALDO', 'Pick a card. It will be the card of your downfall.'], ['BASIL', 'I bowled leg-spin to a magician once. He sawed my stumps in half.']],
    post: [['SPINALDO', 'Pick a card. The card is a midnight booking. Thrumpton has the Megadome for the night.']],
    goals: [['Win the match', m => m.won], ['Stump a batter', m => m.stats.stumpings > 0], ['Hit the hot-air balloon', m => !!m.targetsHit.balloon]] },
  { id: 5, title: 'The Midnight Final', opp: 5, ground: 'dome', overs: 3, wickets: 5, batFirst: true, kerf: true, teach: 'On fire, the triple threat, the ghosts, the fog and the Super Over.',
    pre: [['THRUMPTON', 'No tea. No cake. No interval. Just ADVERTS.'], ['EDIE', "Then let's give you one."]],
    post: [['THRUMPTON', 'Plumb. Absolutely plumb.']],
    goals: [['Win the match', m => m.won], ['Lose at most one wicket in the first innings', m => m.innings[0].wkts <= 1], ['Hit the jumbotron', m => !!m.targetsHit.jumbotron]] }
];
G.STORY_PROLOGUE = [
  ['AUBREY', 'Kerfuffle-on-the-Wold. Nothing of note has happened here since the hailstorm of 1953, which was rained off.'],
  ['THRUMPTON', 'Fourth of June, 1975. First ball. Given out leg before by a vicar who was looking at a butterfly.'],
  ['EDIE', 'That was my grandfather. He still talks about that butterfly.'],
  ['THRUMPTON', 'I have purchased the deeds to this green. On Monday it becomes the Thrumpton Parking Plaza. Four hundred spaces. No cricket.'],
  ['MRS CRUMB', 'Over my dead sponge.'],
  ['THRUMPTON', 'Unless you beat my teams in the Grand Kerfuffle. Five matches. My grounds. My rules. I am not a monster.'],
  ['EDIE', 'Done. We will play you anywhere. Bring cake.']
];
G.STORY_ENDING = [
  ['AUBREY', 'And so the Grand Kerfuffle was won, by the Teapots, with sandwiches.'],
  ['THRUMPTON', 'Plumb. Absolutely plumb. The deeds are torn up. Worth the wait.'],
  ['AUBREY', 'Lord Thrumpton-Vane now polishes the tea urn on Saturdays and is said to be adequate at fine leg.']
];
G.LOSS_LINES = [['MRS CRUMB', 'Never mind, dear. Even the best of us get a golden duck. Have a scone and go again.']];
G.MATCH_REPORTS = {
  win: '{winner}, set {target}, were indebted to {topBat} ({topRuns}{notOut}, {sixes} sixes). {topBowl} took {wkts} for {runs} with guile, swing and, in one instance, marmalade.',
  tie: 'A tie, decided by a Super Over of almost unbearable tension, at the end of which {hero} was carried from the field on the shoulders of the scorer.',
  loss: '{loser} never recovered from a top order that had gone to tea. {topBowl} took {wkts} for {runs} and the scorer was not impressed.'
};
G.BUILD = 'CricketKerfuffle-Cricket-claude-haiku-5-5-medium-20261104-064807';

/* the Kerfuffle Method (the rain rule): resources are overs left times wickets in hand, and the target is the first
 * innings' runs scaled by the resources left against those at the start, plus one. */
G.kerfResources = (oversLeft, oversStart, wicketsLost) => (oversLeft / oversStart) * (1 - 0.07 * wicketsLost);
G.kerfTarget = (firstRuns, oversStart, oversLeft, wicketsLost) => Math.floor(firstRuns * G.kerfResources(oversLeft, oversStart, wicketsLost) / G.kerfResources(oversStart, oversStart, wicketsLost)) + 1;

/* ---- THE NETS LESSONS: eleven scripted practices. Each runs a match with its own setup, and is passed when its goal
 * is met on the match's own record (its stats and its balls). A lesson ends when it is passed or its balls run out. ---- */
G.LESSONS = [
  { id: 1, title: 'Aim and the ground shot', text: 'Aim with the stick and hit along the ground. Score four runs off ground shots.', balls: 24, machine: ['express', 'dobber', 'cutter', 'offbreak'], goal: m => m.stats.groundHits >= 2 && m.I.runs >= 4 },
  { id: 2, title: 'The lofted shot', text: 'Press LOFT on a full ball. Three lofted hits that connect.', balls: 24, machine: ['express', 'outswing', 'dobber'], goal: m => m.stats.lofts >= 3 },
  { id: 3, title: 'Defend and leave', text: 'Leave the wide ones and defend the rest. Three dot balls in a row.', balls: 24, machine: ['outswing', 'offbreak', 'express', 'cutter'], goal: m => m.dotRun >= 3 },
  { id: 4, title: 'Running', text: 'Call a run with RUN, and send both batters through. Two runs made.', balls: 24, machine: ['dobber', 'cutter', 'offbreak'], goal: m => m.stats.runsCompleted >= 2 },
  { id: 5, title: 'Charge against spin', text: 'Charge down the pitch to a spinner and hit it. One charged contact.', balls: 24, machine: ['legbreak', 'googly', 'offbreak'], goal: m => m.stats.chargedHits >= 1 },
  { id: 6, title: 'The bowling marker and the meter', text: 'Bowl on the green. Press a delivery to start, and again on the sweet spot. Three greens.', balls: 18, bowl: true, machine: null, goal: m => m.stats.greenReleases >= 3 },
  { id: 7, title: 'Aftertouch', text: 'Bowl a seamer and push the stick sideways as it leaves the hand. One aftertouch.', balls: 18, bowl: true, machine: null, goal: m => m.stats.aftertouch >= 1 },
  { id: 8, title: 'Specials and Hype', text: 'Hype starts full. Play your special (triangle, or I) with the ball in the air.', balls: 18, startHype: [100, 100], goal: m => m.stats.specials >= 1 },
  { id: 9, title: 'The catch ring', text: 'Catch a lofted ball: press the shot button when the ring closes. One catch.', balls: 30, fielding: true, cpuLoft: 1, cpuPower: 0.6, feedFielder: true, machine: ['express', 'dobber', 'outswing'], goal: m => m.stats.catches >= 1 },
  { id: 10, title: 'Throws', text: 'Gather a ball and throw it to the striker end (shot) or the bowler end (loft). Two throws.', balls: 30, fielding: true, cpuLoft: 0, cpuPower: 0.6, feedFielder: true, noCatch: true, machine: ['express', 'dobber', 'outswing'], goal: m => m.stats.throws >= 2 },
  { id: 11, title: 'Reviews', text: 'When an LBW is given, press the review button (triangle, or F) before the ball is dead. One review made.', balls: 40, umpire: 0, bowlX: -13, machine: ['inswing'], goal: m => m.stats.reviews >= 1 }
];
G.ATTRACT_CHAIN = [
  { ground: 'green', teams: [0, 1], note: 'THE VILLAGE GREEN' },
  { ground: 'hall', teams: [2, 3], note: 'THRUMPTON HALL, OVERCAST' },
  { ground: 'bay', teams: [3, 0], note: 'SUNBURNT BAY' },
  { ground: 'downs', teams: [4, 1], note: 'DUSTBOWL DOWNS' },
  { ground: 'dome', teams: [5, 2], note: 'THE MEGADOME, IN FOG' },
  { ground: 'green', teams: [4, 5], note: 'THE GREEN, AT TEA' },
  { ground: 'hall', teams: [5, 0], note: 'THRUMPTON HALL, THE GHOSTS' },
  { ground: 'bay', teams: [1, 4], note: 'THE BAY, A SIX INTO THE SEA' },
  { ground: 'downs', teams: [0, 5], note: 'THE DOWNS, THE CONJURER' },
  { ground: 'dome', teams: [3, 4], note: 'THE DOME, THE FINAL OVER' }
];
