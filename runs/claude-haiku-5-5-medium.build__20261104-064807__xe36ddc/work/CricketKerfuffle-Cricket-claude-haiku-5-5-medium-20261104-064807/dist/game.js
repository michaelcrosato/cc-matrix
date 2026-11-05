(() => {
/* CRICKET KERFUFFLE - an over-the-top arcade cricket game, built on my-3D2dge v0.85.2.
 * This file is the head of one IIFE. The build (tools/build.mjs) concatenates src/*.js in name order.
 * Layout: simulation (pure, deterministic, fixed steps) in 1x-2x files; presentation in 3x; scenes in 4x; AI Hub in 5x;
 * dev panel 6x; test handle 7x; start 9x. */
'use strict';
const E = My3D2dge;
const { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const G = {};                        // the game's own namespace: everything the scenes share
G.VERSION = '1.0.0';

const HUB_SESSION = !!(globalThis.AIHub && globalThis.AIHub.active);   // an AI Hub session: no pause items, no quit, no auto-pause
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', autoPause: !HUB_SESSION,
  menu: {
    items: [],                       // (99-start adds Restart and Dev Mode, unless this is a hub session)
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', help: 'How well the CPU bats and bowls' },
      { key: 'overs', label: 'Default overs', options: ['1', '2', '3', '5'], value: '2' },
      { key: 'wickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5' },
      { key: 'kerfRules', label: 'Kerfuffle rules', options: ['On', 'Off'], value: 'On', help: 'Items, specials, Hype and chaos. Off is purist arcade' },
      { key: 'marker', label: 'Pitch marker', options: ['On', 'Off'], value: 'On', help: 'Shows where the ball is aimed' },
      { key: 'timingWords', label: 'Timing feedback', options: ['On', 'Off'], value: 'On', help: 'PERFECT, GOOD, EARLY and LATE over the batter' },
      { key: 'fielding', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', help: 'Assisted catches easy chances for you' },
      { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', help: 'Auto calls the runs for you once the ball is on the ground' },
      { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments', help: 'Instant replays of the big plays' },
      { key: 'captions', label: 'Commentary captions', options: ['On', 'Off'], value: 'On' },
      { key: 'voices', label: 'Gibberish voices', options: ['On', 'Off'], value: 'On', help: 'The commentary and the players talk in Animalese' },
      { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox (A B X Y)'], value: 'PlayStation', help: 'The symbols on the prompts for a controller' }
    ],
    controls: { shot: 'Ground shot / Bowl / Catch / Throw to striker end', loft: 'Lofted shot / Alt delivery / Throw to bowler end', block: 'Defend / Alt delivery / Lob to keeper', special: 'Special / Review', run: 'Run / Field preset / Dive', charge: 'Charge down the pitch' },
    quit: HUB_SESSION ? false : 'title'
  },
  input: Object.assign(Object.fromEntries(Object.entries(E.Input.DEFAULT).filter(([k]) => !['attack', 'dash', 'skill', 'jump'].includes(k))), {
    shot: ['KeyJ', 'Pad0', 'Mouse0'], loft: ['KeyK', 'Pad2', 'Mouse2'], block: ['KeyL', 'KeyQ', 'Pad1'],
    special: ['KeyI', 'KeyF', 'Pad3'], run: ['Space', 'Pad5'], charge: ['KeyE', 'Pad7']
  })
});
G.game = game;
G.input = game.input;
G.audio = game.audio;
G.setting = k => game.settings[k];   // read a setting ('On' | 'Off' | option text) at any time
G.rng = { play: E.rng(1), cosmetic: E.rng(2) };   // gameplay (seeded per match) and cosmetic (crowd, particles, lines)
G.errors = [];

// the view: the broadcast camera, a telephoto TV look from behind the bowler (see camPitch and camScale in TUNING)
G.view = null;
G.makeViews = () => {
  G.view = new E.View('broadcast', 'Broadcast', 0, G.T('camPitch'), G.T('camScale'), 1);
  G.wideView = new E.View('wide', 'Wide', 0, 55, G.T('wideScale'), 1);
};

// the Kerfuffle's own letters: a font glyph map for the 5x7 font (it lacks the PlayStation symbols; see glyphs)

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

/* ---- TUNING: the live gameplay variables. Systems read G.T(key) at each use, so a dev slider takes effect at once.
 * The difficulty multipliers apply over the live value (never shown as sliders). Reset puts every value back. ---- */
G.TUNE_DEFS = [
  { key: 'ballSpeed', label: 'Ball speed scale', def: 0.62, min: 0.35, max: 1.0, step: 0.01, group: 'Ball' },
  { key: 'gravity', label: 'Gravity (u/s2)', def: 160, min: 100, max: 300, step: 5, group: 'Ball' },
  { key: 'pitchBounce', label: 'Pitch bounce', def: 0.55, min: 0.3, max: 0.8, step: 0.01, group: 'Ball' },
  { key: 'swing', label: 'Swing x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Ball' },
  { key: 'spin', label: 'Spin turn x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Ball' },
  { key: 'seam', label: 'Seam sd ( deg)', def: 2.5, min: 0, max: 8, step: 0.1, group: 'Ball' },
  { key: 'perfectMs', label: 'Perfect window +/-ms', def: 40, min: 10, max: 120, step: 1, group: 'Batting' },
  { key: 'goodMs', label: 'Good window +/-ms', def: 85, min: 30, max: 200, step: 1, group: 'Batting' },
  { key: 'okMs', label: 'Mistime window +/-ms', def: 150, min: 60, max: 300, step: 1, group: 'Batting' },
  { key: 'batPower', label: 'Ground shot power x', def: 1.0, min: 0.5, max: 2, step: 0.05, group: 'Batting' },
  { key: 'loftPower', label: 'Lofted power x', def: 1.0, min: 0.5, max: 2, step: 0.05, group: 'Batting' },
  { key: 'edge', label: 'Edge zone x', def: 1.0, min: 0, max: 3, step: 0.05, group: 'Batting' },
  { key: 'runSpeed', label: 'Batter run speed', def: 120, min: 70, max: 200, step: 1, group: 'Fielding' },
  { key: 'fieldSpeed', label: 'Fielder speed', def: 105, min: 60, max: 180, step: 1, group: 'Fielding' },
  { key: 'throwSpeed', label: 'Throw speed', def: 420, min: 250, max: 700, step: 5, group: 'Fielding' },
  { key: 'throwError', label: 'Throw error', def: 6, min: 0, max: 30, step: 0.5, group: 'Fielding' },
  { key: 'catchRing', label: 'Catch ring time (s)', def: 0.9, min: 0.3, max: 2, step: 0.05, group: 'Fielding' },
  { key: 'catchWindow', label: 'Catch window +/-ms', def: 110, min: 30, max: 300, step: 5, group: 'Fielding' },
  { key: 'aiBatSkill', label: 'CPU timing error (ms)', def: 70, min: 5, max: 200, step: 1, group: 'CPU' },
  { key: 'aiAggression', label: 'CPU aggression', def: 0.5, min: 0, max: 1, step: 0.05, group: 'CPU' },
  { key: 'aiBowlAccuracy', label: 'CPU bowling scatter', def: 10, min: 0, max: 40, step: 0.5, group: 'CPU' },
  { key: 'meterSpeed', label: 'Bowling meter speed (Hz)', def: 1.4, min: 0.5, max: 3, step: 0.05, group: 'Bowling' },
  { key: 'meterSweet', label: 'Meter sweet zone', def: 0.18, min: 0.05, max: 0.5, step: 0.01, group: 'Bowling' },
  { key: 'hypeGain', label: 'Hype gain x', def: 1.0, min: 0, max: 4, step: 0.1, group: 'Kerfuffle' },
  { key: 'fireStreak', label: 'ON FIRE streak', def: 3, min: 2, max: 6, step: 1, group: 'Kerfuffle' },
  { key: 'boundaryScale', label: 'Boundary size x', def: 1.0, min: 0.6, max: 1.3, step: 0.01, group: 'Ground' },
  { key: 'chaosRate', label: 'Chaos rate x', def: 1.0, min: 0, max: 3, step: 0.1, group: 'Kerfuffle' },
  { key: 'commentaryRate', label: 'Commentary rate x', def: 1.0, min: 0, max: 2, step: 0.1, group: 'Presentation' },
  { key: 'camPitch', label: 'Broadcast pitch ( deg)', def: 12, min: 8, max: 30, step: 1, group: 'Presentation' },
  { key: 'camScale', label: 'Broadcast scale', def: 1.45, min: 1.0, max: 2.4, step: 0.05, group: 'Presentation' },
  { key: 'wideScale', label: 'Wide cam scale', def: 0.8, min: 0.5, max: 1.2, step: 0.05, group: 'Presentation' },
  { key: 'timeScale', label: 'Game speed', def: 1.0, min: 0.1, max: 2.0, step: 0.05, group: 'Presentation' }
];
G.TUNE_DEF = Object.fromEntries(G.TUNE_DEFS.map(d => [d.key, d.def]));
G.tune = Object.assign({}, G.TUNE_DEF);
// the difficulty multipliers (plan 5.19.2): Village is kinder to the batter, Test and Kerfuffle! are harder
G.DIFF = {
  County: {},
  Village: { perfectMs: 1.5, goodMs: 1.4, ballSpeed: 0.85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  Test: { perfectMs: 0.75, goodMs: 0.8, ballSpeed: 1.1, aiBatSkill: 0.7, catchWindow: 0.8 },
  'Kerfuffle!': { perfectMs: 0.75, goodMs: 0.8, ballSpeed: 1.1, aiBatSkill: 0.7, catchWindow: 0.8, chaosRate: 2 }
};
G.difficulty = () => {
  const d = game.settings.difficulty;
  return G.DIFF[d] ? d : 'County';
};
// G.T(key): the live value, times the difficulty's multiplier if it has one
G.T = key => {
  const base = G.tune[key];
  const m = G.DIFF[G.difficulty()] || {};
  return m[key] !== undefined ? base * m[key] : base;
};
G.tuneSet = (key, v) => {
  const d = G.TUNE_DEFS.find(x => x.key === key);
  if (!d) return false;
  G.tune[key] = clamp(+v, d.min, d.max);
  G.tuneSave();
  return true;
};
G.tuneReset = () => { G.tune = Object.assign({}, G.TUNE_DEF); G.tuneSave(); };
G.tuneChanged = () => G.TUNE_DEFS.filter(d => Math.abs(G.tune[d.key] - d.def) > 1e-9).map(d => d.key);
G.tuneSave = () => E.store.set('kerfuffle:dev', { v: 1, values: G.tune });
G.tuneLoad = () => {
  const s = E.store.get('kerfuffle:dev', null);
  if (!s || s.v !== 1 || !s.values) return;
  for (const d of G.TUNE_DEFS) if (typeof s.values[d.key] === 'number') G.tune[d.key] = clamp(s.values[d.key], d.min, d.max);
};
G.tuneLoad();

/* ---- BALL PHYSICS: one step function, shared by the simulation and the predictor, so a prediction is the future.
 * Fixed steps of 1/120 s. No random numbers inside the step: the seam deviation is drawn at release and kept on the
 * ball. Swing acts in the air before the pitch; spin turns the ball on the pitch; the outfield rolls and decays. ---- */
G.DT = 1 / 120;
G.speedUnits = kmh => kmh * 2.757 * (G.T('ballSpeed') / 0.62);   // units a second for a nominal km/h

G.newBall = (x, y, z) => ({ x, y, z, vx: 0, vy: 0, vz: 0, spin: 0, swingA: 0, spinDrift: 0, spinGrip: 0, turn: 0,
  seamDev: 0, bounceMul: 1, age: 0, phase: 'held', pitched: false, bounces: 0, touchedGround: false,
  carried: false, hitBy: -1, rolling: false, trail: [] });

// the environment a ball flies in: the ground's bounce and swing, and the outfield's friction (k)
G.envOf = ground => ({ bounce: ground.bounce, swing: ground.swing, k: ground.outfieldK, overcast: !!ground.overcast });

G.onPitch = b => Math.abs(b.x - G.W.PX) <= 24 && b.y >= G.W.SY && b.y <= G.W.BY;

/* one step of 1/120 s. ev(type, data) is called for events (pitch, bounce, roll) when given (not in predictions). */
G.stepBall = (b, env, ev) => {
  const dt = G.DT;
  b.age += dt;
  b.vz -= G.T('gravity') * dt;
  if (b.phase === 'delivery' && !b.pitched) {
    // the late swing: a lateral push, away from a right-hander (negative x) for a positive swingA, growing over 0.35 s
    b.vx += -b.swingA * 60 * G.T('swing') * env.swing * Math.min(1, b.age / 0.35) * dt;
    b.vx += b.spinDrift * dt;
    // Dibbly-Dobbly Doom: the ball wobbles in the air
    if (b.wobble) b.vx += Math.sin(b.age * 11) * 70 * dt;
  }
  const drag = 1 - 0.02 * dt;
  b.vx *= drag; b.vy *= drag;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    b.z = 0;
    b.touchedGround = true;
    if (b.phase === 'delivery' && !b.pitched && G.onPitch(b)) {
      // the pitch: a bounce, a little grip, and the turn (spin and seam; positive turn is away from a right-hander)
      b.pitched = true; b.bounces++;
      b.vz = -b.vz * G.T('pitchBounce') * env.bounce * b.bounceMul;
      if (b.vz < 4) b.vz = 0;
      const sg = 0.86 - b.spinGrip;
      b.vx *= sg; b.vy *= sg;
      const ang = (-b.turn * G.T('spin') + b.seamDev) * PI / 180;
      const c = Math.cos(ang), s = Math.sin(ang);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c;
      b.vx = vx; b.vy = vy;
      if (ev) ev('pitch', { x: b.x, y: b.y });
    } else if (b.vz < -25) {
      b.vz = -b.vz * 0.42; b.vx *= 0.85; b.vy *= 0.85; b.bounces++;
      if (ev && b.phase === 'hit') ev('bounce', { x: b.x, y: b.y });
    } else {
      b.vz = 0;
      if (b.phase === 'hit') { b.phase = 'rolling'; if (ev) ev('roll', {}); }
    }
  }
  if (b.phase === 'rolling') {
    const f = Math.exp(-env.k * dt);
    b.vx *= f; b.vy *= f;
    if (Math.hypot(b.vx, b.vy) < 3) { b.vx = 0; b.vy = 0; }
  }
  b.speed = Math.hypot(b.vx, b.vy, b.vz);
};

/* predictor: the same step on a copy. Returns the time a point is crossed, or samples. */
G.clone = b => Object.assign({}, b, { trail: null });
G.predictUntil = (b, env, pred, maxT) => {
  const c = G.clone(b); let t = 0;
  while (t < maxT) {
    G.stepBall(c, env, null); t += G.DT;
    if (pred(c, t)) return { t, b: c };
  }
  return null;
};
// when the ball reaches y = plane (moving toward the batter, y decreasing), in seconds from now
G.timeToPlane = (b, env, plane, maxT = 2.5) => {
  const r = G.predictUntil(b, env, c => c.y <= plane, maxT);
  return r ? r.t : null;
};
// where and when the ball next lands (z reaches 0 and it is not still rising)
G.landingOf = (b, env, maxT = 4) => {
  const c = G.clone(b); let t = 0;
  if (c.z <= 0.01 && Math.abs(c.vz) < 1) return { t: 0, x: c.x, y: c.y };
  while (t < maxT) {
    c.phase = c.phase === 'held' ? 'hit' : c.phase;
    const lastZ = c.z;
    G.stepBall(c, env, null); t += G.DT;
    if (c.z <= 0.01 && lastZ > 0.01 && c.vz <= 0) return { t, x: c.x, y: c.y };
  }
  return { t, x: c.x, y: c.y };
};

/* solve a delivery: the release point, the pitch target (a point on the pitch) and nominal km/h give the start velocity
 * that lands the ball on the target with no swing (swing and spin then move the real pitching point). */
G.solveDelivery = (rel, tgt, kmh) => {
  const sp = G.speedUnits(kmh);
  const dx = tgt.x - rel.x, dy = tgt.y - rel.y, D = Math.hypot(dx, dy);
  const T1 = D / (sp * 0.97);
  const vz = (0.5 * G.T('gravity') * T1 * T1 - rel.z) / T1;
  const vh = D / T1;
  return { vx: dx / D * vh, vy: dy / D * vh, vz };
};

/* ---- THE MATCH: a pure simulation of innings, overs, the delivery director, batting, bowling, fielding, running, the
 * umpire, Hype and the arcade layer. It runs in fixed steps (G.DT) with a seeded RNG (the play stream), emits events
 * for the presentation, and takes human input through its methods. Every state has a timeout, so play cannot stall.
 *
 * Director: innings -> setup -> runup -> flight -> play -> dead -> between (-> setup, or break, or end). ---- */
const CONTACT_Y = 452;                       // the front-foot contact plane: 16 units in front of the batter's crease
const FAMILIES = ['pace', 'spin', 'swing', 'medium'];   // a team's bowlers in order: the first is the quick, the second the spinner
G.PRESETS = {
  attacking: [[165, 190, 'slip'], [158, 190, 'slip'], [132, 200, 'gully'], [95, 230, 'point'], [58, 260, 'cover'], [14, 300, 'mid-off'], [-14, 300, 'mid-on'], [-160, 300, 'fine-leg'], [151, 320, 'third-man']],
  balanced: [[165, 190, 'slip'], [95, 240, 'point'], [55, 270, 'cover'], [12, 320, 'mid-off'], [-12, 320, 'mid-on'], [-60, 270, 'mid-wkt'], [-95, 250, 'sq-leg'], [-160, 300, 'fine-leg'], [155, 300, 'third-man']],
  defensive: [[95, 260, 'point'], [55, 360, 'deep-cover'], [12, 360, 'long-off'], [-12, 360, 'long-on'], [-60, 360, 'deep-mid-wkt'], [-95, 360, 'deep-sq'], [-160, 340, 'fine-leg'], [155, 340, 'third-man'], [40, 260, 'cover']],
  spin: [[160, 110, 'slip'], [-100, 100, 'short-leg'], [100, 100, 'silly-point'], [55, 240, 'cover'], [12, 280, 'mid-off'], [-12, 280, 'mid-on'], [-60, 240, 'mid-wkt'], [-95, 360, 'deep-sq'], [-15, 360, 'long-on']]
};
G.PRESET_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];
G.PRESET_LABEL = { attacking: 'ATTACKING', balanced: 'BALANCED', defensive: 'DEFENSIVE', spin: 'SPIN ATTACK' };
// a spot in the batter's frame (degrees from straight, + off side) at a distance from the pitch's middle
G.presetSpot = (theta, dist, hand = 1) => {
  const r = theta * PI / 180;
  return { x: 576 - hand * Math.sin(r) * Math.min(dist, 520), y: 576 + Math.cos(r) * Math.min(dist, 500) };
};

G.Match = class Match {
  constructor(cfg) {
    this.cfg = Object.assign({ overs: 2, wickets: 5, kerf: true, batFirst: 0, teams: [0, 1], ground: 'green', seed: 1 }, cfg);
    this.ground = G.GROUNDS[this.cfg.ground] || G.GROUNDS.green;
    this.env = G.envOf(this.ground);
    this.rng = E.rng(this.cfg.seed);
    this.t = 0;                                // match time in seconds, counted in fixed steps
    this.events = [];                          // presentation events, drained each frame by the scene
    this.log = [];                             // every ball bowled, for the scorecard and the report
    this.innings = [];
    this.hype = [0, 0]; this.streak = [0, 0]; this.fire = [false, false]; this.dots = [0, 0];
    this.items = [null, null]; this.targetsHit = {};
    this.teapot = [false, false]; this.horseshoe = [false, false];
    this.review = [1, 1];
    this.result = null;
    this.coverage = {};
    this.stats = { fours: 0, sixes: 0, wickets: 0, catches: 0, runouts: 0, items: 0, targets: 0, specials: 0, bowled: 0, lbw: 0, dropped: 0, wides: 0, noballs: 0, byes: 0, chaos: 0, rain: 0, reviews: 0, reviewsWon: 0,
      stumpings: 0, dives: 0, lofts: 0, groundHits: 0, runsCompleted: 0, chargedHits: 0, greenReleases: 0, aftertouch: 0, throws: 0, thirdUmpire: 0 };
    this.dotRun = 0;
    this.ballNo = 0;
    this.phase = 'idle';
    this.timer = 0;
    this.delivery = null; this.ball = null; this.pressed = null; this.bat = null;
    this.fielders = []; this.preset = this.cfg.preset || 'balanced';
    this.runs = null;
    this.pending = null;
    this.chaos = null; this.rainUsed = false;
    this.catchRing = null; this.throwing = null; this.humanFieldHold = null;
    this.cpuPressAt = null; this.cpuIntent = null; this.arriveAbs = null;
    this.startInnings(0);
  }

  /* ---- the event bus and coverage ---- */
  emit(type, data) {
    this.events.push({ type, data: data || {}, t: this.t });
    if (this.events.length > 400) this.events.shift();
    this.coverage[type] = (this.coverage[type] || 0) + 1;
  }
  drain() { const e = this.events; this.events = []; return e; }

  /* ---- sides, players ---- */
  team(side) { return G.TEAMS[this.cfg.teams[side]]; }
  get I() { return this.innings[this.innings.length - 1]; }
  get battingSide() { return this.I.side; }
  get bowlingSide() { return 1 - this.I.side; }
  get striker() { return this.I.bat.find(b => b.end === 'A' && !b.out) || this.I.bat.find(b => !b.out); }
  get nonStriker() { return this.I.bat.find(b => b !== this.striker && !b.out); }
  batterName(bt) { return this.team(this.battingSide).squad[bt.p]; }
  bowlerName() { return this.team(this.bowlingSide).squad[this.I.bowler]; }
  familyOf(idx) { const team = this.team(this.bowlingSide); return FAMILIES[team.bowlers.indexOf(idx) % 4] || 'pace'; }
  // the human sides: cfg.humanSides lists the sides a person plays (side 0 is Kerfuffle, the captain's side)
  isHumanSide(side) { return (this.cfg.humanSides || []).indexOf(side) >= 0; }
  humanBats() { return !this.cfg.autoBat && this.isHumanSide(this.battingSide); }
  humanBowls() { return !this.cfg.autoBowl && this.isHumanSide(this.bowlingSide); }
  humanFields() { return !this.cfg.autoBowl && this.isHumanSide(this.bowlingSide); }
  // the delivery stream: a hub round's deliveries come from its own seeded stream, so every copy faces the same balls
  dRand() { return this.cfg.deliveryRng ? this.cfg.deliveryRng() : this.rng(); }

  /* ---- innings ---- */
  startInnings(k) {
    const isSuper = k >= 2;
    const side = isSuper ? (k === 2 ? this.superBattingFirst() : 1 - this.superBattingFirst()) : (k === 0 ? this.cfg.batFirst : 1 - this.cfg.batFirst);
    const I = {
      k, side, isSuper, runs: 0, wkts: 0, legal: 0, extras: { w: 0, nb: 0, b: 0, lb: 0 }, boundaries: 0,
      overs: isSuper ? 1 : this.cfg.overs, wk: isSuper ? 2 : this.cfg.wickets, over: 0, ballInOver: 0, overRuns: 0,
      bat: [{ p: 0, end: 'A', y: G.W.BAT_CREASE, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' },
        { p: 1, end: 'B', y: G.W.BOWL_CREASE, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' }],
      nextP: 2, bowler: this.team(1 - side).bowlers[0], bowlerLast: -1, target: null, endReason: null, fow: []
    };
    if (k === 1) I.target = this.innings[0].runs + 1;
    if (k === 3) I.target = this.innings[2].runs + 1;
    this.innings.push(I);
    this.emit('innings', { k, side, isSuper, target: I.target, overs: I.overs, wickets: I.wk });
    this.placeFielders();
    this.startOver();
  }
  superBattingFirst() { return 1 - this.cfg.batFirst; }   // the side batting second in the match bats first in the Super Over
  startOver() {
    const I = this.I;
    I.ballInOver = 0; I.overRuns = 0;
    I.bowler = this.pickBowler();
    this.overSetupChance();
    this.setPhase('setup', 0.7);
  }
  // the chaos and items of an over start: items float for the batting side, chaos happens between overs
  overSetupChance() {
    if (!this.cfg.kerf || this.cfg.noChaos) return;
    const I = this.I;
    // the story's rain (the fourth chapter): the second innings is rained off once
    if (this.cfg.forceRain && I.k === 1 && !this.rainUsed && I.over === 1 && !this.chaosNow) { this.chaosNow = 'rain'; }
    if (I.over > 0 && this.rng() < 0.3 * G.T('chaosRate') && this.ground.chaos.length && !this.chaosNow) {
      let pool = this.ground.chaos.filter(c => c !== 'rain' || (I.k === 1 && !this.rainUsed && !I.isSuper));
      if (pool.length) {
        const id = pool[Math.floor(this.rng() * pool.length)];
        this.chaosNow = id;
      }
    }
    if (I.ballInOver === 0 && this.items[this.battingSide] === null && this.rng() < 0.35 * G.T('chaosRate')) this.spawnItem();
  }
  pickBowler() {
    const I = this.I, team = this.team(this.bowlingSide);
    const list = team.bowlers.filter(i => i !== I.bowlerLast);
    const pool = list.length ? list : team.bowlers;
    const idx = pool[I.over % pool.length];
    I.bowlerLast = I.bowler;
    return idx;
  }
  setPhase(p, t) { this.phase = p; this.timer = t; }

  /* ---- fielders: the bowling side's eleven, placed by a preset in the batter's frame ---- */
  placeFielders() {
    const spots = G.PRESETS[this.preset];
    const side = this.bowlingSide;
    const hand = 1;
    const old = this.fielders;
    this.fielders = spots.map(([th, d, role], i) => {
      const s = G.presetSpot(th, d, hand);
      const prev = old[i];
      return { id: i, side, role, x: prev ? prev.x : s.x, y: prev ? prev.y : s.y, hx: s.x, hy: s.y, hold: false, speed: G.T('fieldSpeed'), human: false, keeper: false, slowT: 0, dive: false };
    });
    const ghostIdx = this.team(this.bowlingSide).ghostIdx || [];
    this.fielders.forEach((f, i) => { f.ghost = ghostIdx.indexOf(i) >= 0; });
    const ky = this.preset === 'spin' ? G.W.SY - 24 : G.W.SY - 12;
    this.fielders.push({ id: spots.length, side, role: 'keeper', x: G.W.PX, y: ky, hx: G.W.PX, hy: ky, hold: false, speed: G.T('fieldSpeed'), human: false, keeper: true, slowT: 0, dive: false });
    if (this.humanFields()) this.setActiveHuman();
  }
  stepFielders(dt) {
    for (const f of this.fielders) {
      if (f.slowT > 0) f.slowT -= dt;
      // a ghost fielder of the Eternal XI is intangible for half a second in every six: the ball passes through him
      if (f.ghost) f.intangible = ((this.t + f.id * 1.7) % 6) < 0.5;
      if (f.hold || f.human || f.keeper || (this.catchRing && this.catchRing.f === f)) continue;
      const dx = f.hx - f.x, dy = f.hy - f.y, d = Math.hypot(dx, dy);
      if (d > 1) {
        const sp = f.speed * (f.slowT > 0 ? 0.7 : 1) * dt;
        const s = Math.min(d, sp);
        f.x += dx / d * s; f.y += dy / d * s;
      }
    }
    // a chasing CPU fielder runs for the ball
    const b = this.ball;
    if (b && this.phase === 'play' && !this.throwing && !this.catchRing) {
      const chaser = this.chaserFor();
      if (chaser) {
        const L = b.carried && b.z > 0.5 && this.landing ? this.landing : { x: b.x, y: b.y };
        const dx = L.x - chaser.x, dy = L.y - chaser.y, d = Math.hypot(dx, dy);
        if (d > 1) { const s = Math.min(d, chaser.speed * (chaser.slowT > 0 ? 0.7 : 1) * dt * 1.1); chaser.x += dx / d * s; chaser.y += dy / d * s; }
      }
    }
  }
  // the CPU fielder nearest the ball's landing point is the one that chases it
  chaserFor() {
    const b = this.ball;
    const L = b.carried && b.z > 0.5 && this.landing ? this.landing : { x: b.x, y: b.y };
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      if (f.hold || f.keeper || f.human) continue;
      const d = Math.hypot(f.x - L.x, f.y - L.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  setActiveHuman() {
    const b = this.ball;
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      f.human = false;
      if (f.keeper && !b) continue;
      const d = b ? Math.hypot(f.x - b.x, f.y - b.y) : 0;
      if (!f.hold && d < bd) { bd = d; best = f; }
    }
    if (best) best.human = true;
  }
  humanField() { return this.fielders.find(f => f.human) || null; }

  /* ---- the director ---- */
  update(dt) {
    this.t += dt;
    if (this.phase === 'idle' || this.phase === 'end') return;

    this.timer -= dt;
    this.stepFielders(dt);
    // the human fielder is always the one nearest the ball while it is in play
    if (this.humanFields() && (this.phase === 'play' || this.phase === 'flight') && !this.catchRing) this.setActiveHuman();
    if (this.chaosNow && this.phase === 'setup' && this.timer > 0 && this.timer < 0.7) this.startChaos();
    switch (this.phase) {
      case 'setup': return this.stepSetup(dt);
      case 'runup': return this.stepRunup(dt);
      case 'flight': return this.stepFlight(dt);
      case 'play': return this.stepPlay(dt);
      case 'dead': if (this.timer <= 0) this.commit(); return;
      case 'between': if (this.timer <= 0) this.afterBetween(); return;
      case 'break': if (this.timer <= 0) this.afterBreak(); return;
      case 'rain': if (this.timer <= 0) this.endRain(); return;
      case 'chaos': if (this.timer <= 0) this.endChaos(); return;
    }
  }
  stepSetup(dt) {
    if (this.humanBowls()) return;     // the human picks a delivery
    if (this.timer <= 0) this.cpuBowl();
  }
  // the CPU's bowler: a delivery from the bowler's family (or the machine's list), aimed with a length
  cpuBowl() {
    const fam = this.familyOf(this.I.bowler);
    const kit = G.BOWL_KIT[fam];
    const key = this.cfg.machine ? this.cfg.machine[this.ballNo % this.cfg.machine.length] : kit[Math.floor(this.dRand() * kit.length)];
    const len = this.dRand() < 0.15 ? 'yorker' : this.dRand() < 0.45 ? 'full' : this.dRand() < 0.8 ? 'good' : 'short';
    const ty = { yorker: G.W.BAT_CREASE + 12, full: G.W.BAT_CREASE + 40, good: G.W.BAT_CREASE + 92, short: G.W.BAT_CREASE + 150 }[len];
    const sc = this.cfg.bowlScatter !== undefined ? this.cfg.bowlScatter : G.T('aiBowlAccuracy');
    // a CPU bowler with a full meter bowls his special, half the time
    if (this.hype[this.bowlingSide] >= 100 && this.dRand() < 0.5) {
      const sp = this.bowlSpecialOf(this.I.bowler);
      if (sp) { this.hype[this.bowlingSide] = 0; this.stats.specials++; this.emit('special', { id: sp, name: G.SPECIALS[sp].name, owner: this.bowlerName() }); this.startRunup({ key, target: { x: G.W.PX, y: ty }, cpu: true, fam, special: sp }); return; }
    }
    const x = this.cfg.bowlX !== undefined ? G.W.PX + this.cfg.bowlX : G.W.PX + (this.dRand() - 0.5) * sc;
    this.startRunup({ key, target: { x, y: ty + (this.dRand() - 0.5) * sc }, cpu: true, fam });
  }
  startRunup(D) {
    const fam = D.fam || (G.DELIVERIES[D.key] ? G.DELIVERIES[D.key].fam : 'pace');
    const family = fam === 'swing' ? 'swing' : fam === 'medium' ? 'medium' : fam === 'spin' ? 'spin' : 'pace';
    const dur = { pace: 2.0, swing: 1.8, medium: 1.5, spin: 0.9 }[family];
    this.delivery = Object.assign({ dur, t: 0, released: false, meter: 0.5, quality: null, key: D.key }, D);
    this.setPhase('runup', dur);
    this.emit('runup', { key: D.key, fam: family, cpu: !!D.cpu });
  }
  stepRunup(dt) {
    const D = this.delivery;
    D.t += dt;
    if (D.released) return;
    if (D.cpu && D.t >= D.dur - 0.25) return this.release('green');
    if (!D.cpu && D.t >= D.dur) return this.release('amber');   // no press: an amber release
    if (!D.cpu && D.t >= D.dur - 0.7) D.meter = 0.5 + 0.5 * Math.sin(D.t * TAU * G.T('meterSpeed'));
  }
  // the human's release on the meter: green in the sweet zone, amber and red around it, a no-ball at the far tip
  bowlRelease() {
    const D = this.delivery;
    if (!D || D.released || this.phase !== 'runup' || D.t < D.dur - 0.7) return false;
    const u = 0.5 + 0.5 * Math.sin(D.t * TAU * G.T('meterSpeed'));
    const d = Math.abs(u - 0.5) * 2;
    const sweet = G.T('meterSweet');
    const q = u > 0.94 ? 'noball' : d <= sweet ? 'green' : d <= sweet * 2.2 ? 'amber' : 'red';
    this.release(q);
    return true;
  }
  // the bowl: the release point and the velocity that lands on the target, with the meter's scatter
  release(quality) {
    const D = this.delivery;
    if (!D || D.released) return;
    D.released = true;
    const special = D.special;
    const del = special ? this.specialDelivery(special) : G.DELIVERIES[D.key];
    const scat = { green: 2, amber: 10, red: 18, noball: 18, cpu: 1 }[quality] || 4;
    const fac = { green: 1, amber: 0.9, red: 0.8, noball: 0.8, cpu: 1 }[quality] || 1;
    const tgt = D.target || { x: G.W.PX, y: G.W.BAT_CREASE + 60 };
    const target = {
      x: clamp(tgt.x + (this.dRand() - 0.5) * 2 * scat, G.W.PX - 34, G.W.PX + 34),
      y: clamp(tgt.y + (this.dRand() - 0.5) * 2 * scat * 0.5, G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12)
    };
    const kmh = (del.kmh[0] + this.dRand() * (del.kmh[1] - del.kmh[0])) * fac;
    const b = G.newBall(0, 0, 0);
    const rel = { x: G.W.PX - 4, y: G.W.RELEASE_Y, z: G.W.RELEASE_Z };
    Object.assign(b, rel, G.solveDelivery(rel, target, kmh));
    b.phase = 'delivery';
    const hand = this.handOf(this.striker);
    b.swingA = del.swing * (special === 'kfBall' ? 2 : 1) * hand;
    b.turn = del.turn;
    b.spinGrip = del.fam === 'spin' ? 0.05 : 0;
    b.bounceMul = del.bounce;
    b.vanish = special === 'vanish'; b.sawn = special === 'sawn'; b.wobble = special === 'dibbly'; b.triple = special === 'triple';
    if (quality === 'green' && !D.cpu) this.stats.greenReleases++;
    this.stumpRisk = false;
    b.seamDev = (this.dRand() + this.dRand() + this.dRand() - 1.5) * 2 * G.T('seam') * (del.seam || 1);
    b.delivery = D.key; b.kmh = Math.round(kmh);
    this.ball = b;
    this.ballNo++;
    this.noBall = quality === 'noball';
    this.bowlQuality = quality;
    this.lastDel = { key: D.key, label: del.label || D.key, fam: del.fam || D.fam || 'pace', kmh: Math.round(kmh), target, quality, special: special || null };
    this.fastestKmh = Math.max(this.fastestKmh || 0, this.lastDel.kmh);
    this.releaseAt = this.t;
    this.touched = false;
    this.path = [];                       // the ball's recorded path, for the Owl-Eye review
    this.shock = special === 'grandad';   // the batter is shocked by a Grandad: his timing windows halve
    this.grudgeBall = special === 'grudge';
    this.chirpActive = !!this.chirpNext; this.chirpNext = false;
    this.ghostFielder = null; this.charging = false;
    this.ballStartRuns = this.I.runs;
    this.crossed = false; this.pitchedFlag = false; this.pressed = null; this.missed = false;
    this.bat = null; this.runs = null; this.landing = null; this.catchRing = null; this.catchResolved = false;
    this.arriveAbs = null;
    const tt = G.timeToPlane(b, this.env, CONTACT_Y, 3);
    this.arriveAbs = this.releaseAt + (tt !== null ? tt : 1);
    this.setPhase('flight', 6);
    this.phase = 'flight';
    this.emit('release', { key: D.key, label: this.lastDel.label, fam: this.lastDel.fam, kmh: this.lastDel.kmh, quality, cpu: !!D.cpu });
    if (this.noBall) this.emit('noball:warn', {});
    if (this.cpuBatting()) this.cpuPlanBat();
  }
  // a bowling special's delivery: its speed, swing, turn, bounce and seam
  specialDelivery(key) {
    const L = {
      vicar: { label: "VICAR'S REVENGE", kmh: [150, 158], swing: -1.2, turn: 0, bounce: 0.9, fam: 'pace', seam: 0.5 },
      sunburn: { label: 'SUNBURN BOUNCER', kmh: [150, 156], swing: 0, turn: 0, bounce: 1.3, fam: 'pace', seam: 1 },
      kfBall: { label: 'KERFUFFLE BALL', kmh: [138, 148], swing: 0.1, turn: 0, bounce: 1, fam: 'pace', seam: 1 },
      grandad: { label: 'THE GRANDAD', kmh: [78, 88], swing: 0, turn: 9, bounce: 1.25, fam: 'spin', seam: 0.3 },
      peregrine: { label: 'PEREGRINE SWOOP', kmh: [125, 135], swing: 3, turn: 0, bounce: 1, fam: 'swing', seam: 1 },
      dibbly: { label: 'DIBBLY-DOBBLY DOOM', kmh: [80, 80], swing: 0, turn: 0, bounce: 0.9, fam: 'medium', seam: 4 },
      sawn: { label: 'SAWN IN HALF', kmh: [76, 86], swing: 0.2, turn: -8, bounce: 1.05, fam: 'spin', seam: 0.3 },
      grudge: { label: 'THE GRUDGE BALL', kmh: [136, 146], swing: 0.15, turn: 0, bounce: 0.9, fam: 'pace', seam: 0.5 },
      vanish: { label: 'THE VANISHING BALL', kmh: [80, 90], swing: 0.3, turn: -8, bounce: 1.0, fam: 'spin', seam: 0.3 },
      triple: { label: 'TRIPLE THREAT', kmh: [138, 148], swing: 0, turn: 0, bounce: 1, fam: 'pace', seam: 1 }
    };
    return L[key] || G.DELIVERIES.express;
  }
  // the batter's hand: -1 for a left-hander (every third squad member), 1 for a right-hander
  handOf(bt) { return bt && bt.p % 3 === 2 ? -1 : 1; }
  // the batter's press: a shot (button), the aim (a batter-frame angle, or null), and a special if one is played
  batPress(button, aim, special) {
    if (this.phase !== 'flight' || this.pressed || this.missed || !this.ball || this.ball.phase !== 'delivery') return false;
    this.pressed = { button, aim: aim === undefined ? null : aim, special: special || null, t: this.t, charged: !!this.charging };
    const sh = this.shotFor(this.pressed);
    this.pressed.shot = sh.key;
    let gr = this.gradeOf(this.pressed, sh.contactAt);
    const S = special ? G.SPECIALS[special] : null;
    if (S && S.minGrade && (gr.grade === 'EARLY' || gr.grade === 'LATE')) gr = { ms: gr.ms, grade: S.minGrade };
    this.pressed.grade = gr.grade; this.pressed.ms = gr.ms;
    if (gr.grade === 'MISS') {
      this.missed = true;
      // a charged batter who misses can be stumped
      if (this.charging) this.stumpRisk = true;
      this.pressed = null;
      this.emit('press', { button, grade: 'MISS', shot: sh.key, ms: gr.ms });
      return true;
    }
    this.pressed.dueAt = this.arriveAbs;   // the bat meets the ball at the contact plane
    this.emit('press', { button, grade: gr.grade, shot: sh.key, ms: Math.round(gr.ms) });
    return true;
  }
  // the timing grade: the press's contact moment against the moment the ball reaches the contact plane. A Grandad's
  // shock halves the windows (for the ball it bowls) and a chirp narrows them; ON FIRE widens them
  gradeOf(pr, contactAt) {
    const contactAbs = pr.t + contactAt;
    const ms = (contactAbs - this.arriveAbs) * 1000;
    let w = this.fireBat() ? 1.5 : 1;
    if (this.shock) w *= 0.5;
    if (this.chirpActive) w *= 0.7;
    const a = Math.abs(ms), P = G.T('perfectMs') * w, Gd = G.T('goodMs') * w, Ok = G.T('okMs') * (this.chirpActive ? 0.7 : 1);
    const grade = a <= P ? 'PERFECT' : a <= Gd ? 'GOOD' : a <= Ok ? (ms < 0 ? 'EARLY' : 'LATE') : 'MISS';
    return { ms, grade };
  }
  shotFor(pr) {
    const S = pr.special ? G.SPECIALS[pr.special] : null;
    if (S && S.shot) return Object.assign({ key: S.shot }, G.SHOTS[S.shot], { special: true });
    const pitchY = this.ball.pitchY !== undefined ? this.ball.pitchY : this.predictPitch().y;
    const len = G.lengthOf(pitchY);
    const sector = pr.aim !== null ? pr.aim : this.sectorOfBall();
    const button = pr.button === 'shot' ? 'shot' : pr.button === 'loft' ? 'loft' : 'block';
    const key = G.resolveShot(button, len, sector);
    return Object.assign({ key }, G.SHOTS[key]);
  }
  predictPitch() {
    const r = G.predictUntil(this.ball, this.env, c => c.pitched, 2.5);
    return r ? r.b : { x: this.ball.x, y: G.W.BAT_CREASE + 80 };
  }
  // a neutral stick reads the line the ball is on, from its contact-plane position (mirrored for a left-hander)
  sectorOfBall() {
    const r = G.predictUntil(this.ball, this.env, c => c.y <= CONTACT_Y, 2.5);
    const x = r ? r.b.x : this.ball.x;
    return clamp(-(x - G.W.PX) * 3 * this.handOf(this.striker), -120, 120);
  }
  // the bat's contact: the outgoing ball, an edge, or a defence. A special changes the shot, the power and the ball's
  // flags (unstoppable, passes the first fielder, a catch trap, a forced four)
  contactNow(pr) {
    const b = this.ball, sh = G.SHOTS[pr.shot];
    if (pr.charged) this.stats.chargedHits++;
    if (sh.lofted) this.stats.lofts++; else this.stats.groundHits++;
    this.pressed = null;
    const grade = pr.grade;
    const S = pr.special ? G.SPECIALS[pr.special] : null;
    if (S) { this.stats.specials++; this.emit('special', { id: pr.special, name: S.name, owner: this.batterName(this.striker) }); }
    if (sh.defend) {
      b.vx *= 0.15; b.vy = -Math.abs(b.vy) * 0.1; b.vz = 4; b.phase = 'hit'; b.carried = false;
      this.afterContact({ shot: pr.shot, grade, lofted: false, defended: true });
      return;
    }
    const hand = this.handOf(this.striker);
    if (!S && (grade === 'EARLY' || grade === 'LATE') && !sh.lofted && this.rng() < 0.22 * G.T('edge')) {
      const ang = (this.rng() < 0.5 ? -1 : 1) * (150 + this.rng() * 25) * PI / 180;
      b.vx = Math.sin(ang) * 120 * hand; b.vy = -Math.cos(ang) * 120; b.vz = 40; b.phase = 'hit'; b.carried = true;
      b.hitBy = this.battingSide; b.touchedGround = false; b.trail = [];
      this.afterContact({ shot: pr.shot, grade, lofted: false, edge: true });
      this.bat.edge = true;
      this.emit('edge', {});
      return;
    }
    const perf = S && S.perfect ? 'PERFECT' : grade;
    const power = { PERFECT: 1, GOOD: 0.85, EARLY: 0.6, LATE: 0.6 }[perf] || 0.6;
    const err = { PERFECT: 2, GOOD: 6, EARLY: 14, LATE: 14 }[perf] || 14;
    const base = pr.aim !== null ? pr.aim : sh.nat;
    let theta = base + (this.rng() - 0.5) * 2 * err;
    if (grade === 'EARLY') theta -= 12; else if (grade === 'LATE') theta += 12;
    const r = theta * PI / 180;
    const mult = (S && S.mult ? S.mult : 1) * (!this.humanBats() && this.cfg.cpuPower ? this.cfg.cpuPower : 1);
    const speed = sh.speed * (sh.lofted ? G.T('loftPower') : G.T('batPower')) * power * mult * (this.fireBat() ? 1.2 : 1) * (1 + 0.25 * (b.speed || 300) / 386);
    const launch = (sh.launch + (grade === 'EARLY' && sh.lofted ? 6 : 0)) * PI / 180;
    b.vx = -Math.sin(r) * hand * speed * Math.cos(launch);
    b.vy = Math.cos(r) * speed * Math.cos(launch);
    b.vz = speed * Math.sin(launch);
    b.phase = 'hit'; b.carried = true; b.hitBy = this.battingSide; b.touchedGround = false; b.bounces = 0;
    b.z = Math.max(b.z, sh.lofted ? 12 : 2);
    b.trail = [];
    // a feeding drill: the CPU's shot is aimed to land at the human fielder, so a catch or a gather comes to him
    if (this.cfg.feedFielder && !this.humanBats()) {
      const f = this.fielders.find(q => q.human);
      if (f) {
        const dx = f.x - b.x, dy = f.y - b.y, d = Math.max(1, Math.hypot(dx, dy));
        const dir = [dx / d, dy / d];
        if (sh.lofted) { const th = 40 * PI / 180, v = Math.sqrt(d * G.T('gravity') / Math.sin(2 * th)); b.vx = dir[0] * v * Math.cos(th); b.vy = dir[1] * v * Math.cos(th); b.vz = v * Math.sin(th); }
        else { const v = d * this.env.k; b.vx = dir[0] * v; b.vy = dir[1] * v; b.vz = 0; }
      }
    }
    b.unstoppable = !!(S && S.unstoppable);
    b.passFirst = !!(S && S.passFirst);
    this.catchTrap = !!(S && S.catchTrap);
    this.forceFour = !!(S && S.forceFour);
    this.bat = { shot: pr.shot, grade, lofted: !!sh.lofted, special: pr.special || null, theta: Math.round(theta), speed: Math.round(speed) };
    this.emit('contact', { grade, shot: pr.shot, lofted: !!sh.lofted, theta: Math.round(theta), speed: Math.round(speed), special: pr.special || null });
    this.afterContact({ shot: pr.shot, grade, lofted: !!sh.lofted });
  }
  // the batter steps down the pitch: the contact plane moves 24 units toward the bowler, and the ball arrives sooner
  charge() {
    if (this.phase !== 'flight' || this.pressed || !this.ball || this.ball.phase !== 'delivery' || this.charging) return false;
    const tt = G.timeToPlane(this.ball, this.env, CONTACT_Y + 24, 3);
    if (tt === null) return false;
    this.charging = true;
    this.arriveAbs = this.t + tt;
    this.emit('charge', {});
    return true;
  }
  // a dive for the crease: a runner who is close to his crease grounds his bat a fifth of a second sooner
  dive() {
    const th = this.throwing;
    if (!th || !th.runner) return false;
    const d = Math.abs(th.runner.y - (th.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE));
    if (d > 50) return false;
    th.runnerTime -= 0.15;
    this.stats.dives++;
    this.emit('dive', {});
    return true;
  }
  // aftertouch: a bowler's stick pushed sideways in the first quarter second moves the ball that way
  aftertouch(dx) {
    const b = this.ball;
    if (!b || this.phase !== 'flight' || b.phase !== 'delivery' || b.pitched || b.age > 0.25 || this.touched) return false;
    this.touched = true;
    b.vx += dx * 45;
    this.stats.aftertouch++;
    this.emit('aftertouch', { dx });
    return true;
  }
  // a fielder's special: Fortescue's silver tray guarantees the next catch; Pip's chirp unsettles the next batter
  fieldSpecial() {
    const squad = this.team(this.bowlingSide).squad;
    const owner = squad.find(n => G.OWNERS[n] && G.OWNERS[n].field);
    if (!owner || this.hype[this.bowlingSide] < 100) return null;
    const id = G.OWNERS[owner].field;
    if (id === 'silverTray') this.silverArmed = true;
    if (id === 'chirp') this.chirpNext = true;
    if (id === 'lightning') this.lightningOver = true;   // the stumping window triples for one over
    this.hype[this.bowlingSide] = 0;
    this.stats.specials++;
    this.emit('special', { id, name: G.SPECIALS[id].name, owner });
    return id;
  }
  // a special played by the batter spends his side's Hype
  spendHype(side) { this.hype[side] = 0; }
  // the special a bowler or a batter carries, by name (null when none)
  bowlSpecialOf(idx) { const o = G.OWNERS[this.team(this.bowlingSide).squad[idx]]; return o && o.bowl ? o.bowl : null; }
  batSpecialOf(bt) { const o = G.OWNERS[this.batterName(bt)]; return o && o.bat ? o.bat : null; }
  cpuBatting() { return !this.humanBats(); }


  /* ---- batting: the press, the grade, the contact ---- */
  // the batter presses a shot (button) with an aim (the batter-frame angle, or null for a neutral stick)
  fireBat() { return this.fire[this.battingSide]; }
  // the timing grade: the press's contact moment against the moment the ball reaches the contact plane
  predictPitch() {
    const r = G.predictUntil(this.ball, this.env, c => c.pitched, 2.5);
    return r ? r.b : { x: this.ball.x, y: G.W.BAT_CREASE + 80 };
  }
  // a neutral stick reads the line the ball is on, from its contact-plane position
  // the contact: the outgoing ball, an edge, or a defence
  afterContact(info) {
    this.bat = Object.assign(this.bat || {}, info);
    this.setPhase('play', 14);
    this.phase = 'play';
    this.runs = { active: false, run: 0, awaitCall: 2.6, human: false, endHuman: false };
    this.stampContact = this.t;
    this.boundaryFlag = false;
    this.landing = this.landingFor(this.ball);
    this.ballTouchedGround = false;
    this.catchChanceDone = false;
    this.cpuDecideRun();
  }
  landingFor(b) {
    const L = G.landingOf(Object.assign({}, b, { phase: 'hit' }), this.env, 4);
    return L ? { x: L.x, y: L.y, t: L.t } : null;
  }
  // a delivery passes the batter: a wide, a no-ball, bowled, LBW, or a beaten bat
  stepFlight(dt) {
    const b = this.ball;
    G.stepBall(b, this.env, (type, d) => { if (type === 'pitch') { this.pitchedFlag = true; this.pitchAt = d; this.emit('pitch', d); } });
    if (b.pitched && !this.pitchedFlag) this.pitchedFlag = true;
    if (b.trail) { b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 10) b.trail.shift(); }
    if (this.path && this.path.length < 600) this.path.push({ x: b.x, y: b.y, z: b.z });
    if (this.pressed && this.t >= this.pressed.dueAt) { this.contactNow(this.pressed); return; }
    if (this.cpuBatting() && !this.pressed && !this.missed && this.cpuPressAt !== null && this.t >= this.cpuPressAt) this.cpuFire();
    if (!this.crossed && b.y <= G.W.BAT_CREASE + 10) { this.crossed = true; this.deliveryPassed(); return; }
    if (this.phase === 'flight' && b.y < G.W.SY - 26) this.dead('beaten', { beaten: true });
  }
  deliveryPassed() {
    const b = this.ball;
    if (this.pressed) return;   // the bat met it (the contact will come)
    const off = b.x - G.W.PX;
    if (off < -26 || off > 18 || b.z > 40) return this.dead('wide', { wide: true });
    if (this.noBall) return this.dead('noball', { noball: true });
    const r = G.predictUntil(b, this.env, c => c.y <= G.W.SY, 2.5);
    // the stumps, with the batter's pad in front of them: a ball that would hit the stumps past the pad (within seven
    // units of the middle stump) is an LBW candidate; a ball pitched on the stumps and going straight through is bowled
    const hits = r && Math.abs(r.b.x - G.W.PX) <= 7 && r.b.z <= 12;
    if (this.stumpRisk && this.rng() < (this.lightningOver ? 0.9 : 0.45)) { this.stats.stumpings++; return this.dismiss('stumped', {}); }
    if (!hits) return this.dead('beaten', { beaten: true });
    const pitch = this.predictPitch();
    if (Math.abs(pitch.x - G.W.PX) <= 3.5) {
      this.stats.bowled++;
      this.sawnSplit = !!b.sawn;
      return this.dismiss('bowled', {});
    }
    // LBW: the umpire's call, with his accuracy and the truth (pitched in line)
    const truth = Math.abs(pitch.x - G.W.PX) <= 14;
    const acc = this.umpireAccuracy();
    const call = this.rng() < acc ? truth : !truth;
    this.lbw = { truth, call };
    this.emit('appeal', { how: 'lbw' });
    if (call) { this.stats.lbw++; return this.dismiss('lbw', { review: truth !== call }); }
    if (truth) this.reviewable = { batter: this.striker, call: 'notout', truth: 'out', side: this.battingSide, how: 'lbw' };
    return this.dead('notout', { how: 'lbw', notOut: true });
  }
  umpireAccuracy() { return (this.cfg.umpireAccuracy !== undefined ? this.cfg.umpireAccuracy : (this.innings.length && this.I.isSuper ? 0.95 : 0.9)) + (this.grudgeBall ? 0.1 : 0); }
  // the ball in play after a contact: a boundary, a catch, a gather, the throw, the run
  stepPlay(dt) {
    const b = this.ball;
    // the batters keep running while the ball is thrown in
    if (this.runs && this.runs.active) this.stepRuns(dt);
    if (this.throwing) return this.stepThrow(dt);
    G.stepBall(b, this.env, (type) => { if (type === 'bounce') this.emit('bounce', {}); });
    if (b.trail) { b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 10) b.trail.shift(); }
    if (this.path && this.path.length < 600) this.path.push({ x: b.x, y: b.y, z: b.z });
    if (b.touchedGround) this.ballTouchedGround = true;
    if (this.catchRing) return this.stepCatchRing(dt);
    this.checkTargets();
    const bs = this.ground.boundary * G.T('boundaryScale') * (1 - (this.tide || 0));
    const ex = (b.x - G.W.PX) / (G.W.RX * bs), ey = (b.y - G.W.CY) / (G.W.RY * bs);
    // a peacock on the outfield deflects a low ball that passes it (a quarter turn either way)
    const dv = this.deflector;
    if (dv && !dv.used && b.z >= (dv.zMin || 0) && b.z < dv.zMax && Math.hypot(b.x - dv.x, b.y - dv.y) < dv.r) {
      dv.used = true;
      const a = (this.rng() < 0.5 ? -1 : 1) * dv.deg * PI / 180, c = Math.cos(a), s = Math.sin(a);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx; b.vy = vy;
      this.emit('deflect', {});
    }
    if (!this.boundaryFlag && ex * ex + ey * ey > 1) {
      this.boundaryFlag = true;
      return this.boundary(this.forceFour || this.ballTouchedGround ? 4 : 6);
    }
    // a catch chance: the ball airborne and low, close to a fielder
    // a passes-through special: the first fielder the ball meets is a ghost for this ball
    if (b.passFirst) { const pf = this.nearestFielder(b.x, b.y); if (pf && Math.hypot(pf.x - b.x, pf.y - b.y) <= 10) { this.ghostFielder = pf; b.passFirst = false; this.emit('pass-through', {}); } }
    if (b.carried && b.z < 12 && !this.catchChanceDone && !b.unstoppable && !this.cfg.noCatch) {
      const f = this.nearestFielder(b.x, b.y);
      if (f && Math.hypot(f.x - b.x, f.y - b.y) <= 10) return this.catchChance(f);
    }
    // a ground ball: a fielder gathers it when it is slow enough and near
    if (!b.carried || b.z <= 0.01) {
      if (b.speed < 260 && !this.gathered && !b.unstoppable) {
        const f = this.nearestFielder(b.x, b.y);
        if (f && Math.hypot(f.x - b.x, f.y - b.y) <= 7) return this.gather(f);
      }
    }
    if (this.runs.awaitCall > 0) this.runs.awaitCall -= dt;
    if (this.runs.awaitCall > 0 && !this.runs.active && this.ballTouchedGround && this.humanBats() && G.setting('running') === 'Auto' && this.bat && !this.bat.defended) this.startRun();
    if (this.humanFieldHold) { this.humanFieldHold.timer -= dt; if (this.humanFieldHold.timer <= 0) this.throwTo(this.humanFieldHold.f, this.bestEnd()); }
    if (b.speed < 2 && b.z <= 0.01 && !this.runs.active && this.t - this.stampContact > 1.0) return this.dead('settled', {});
    // the hard cap: no ball is in play for more than 15 seconds; runs in hand are called off
    if (this.t - this.stampContact > 13) { this.runs.active = false; return this.dead('settled', {}); }
  }
  nearestFielder(x, y) {
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      if (f.hold || f === this.ghostFielder || f.intangible) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  // a catch chance: the CPU's catch is a roll; a human's is a catch ring, pressed on its moment
  catchChance(f) {
    this.catchChanceDone = true;
    const b = this.ball;
    const speed = b.speed || 300;
    const base = f.keeper ? 0.85 : (f.role.indexOf('slip') >= 0 ? 0.85 : 0.82);
    let p = clamp(base - 0.25 * (speed / 400) - (f.dive ? 0.3 : 0), 0.05, 0.97);
    if (this.catchTrap) p = Math.min(0.95, p * 2);            // Boardwalk Bludgeon: caught if a fielder is under it
    if (this.silverArmed) { this.silverArmed = false; this.emit('silver-tray', {}); this.resolveCatch(f, true, 1); return; }
    const auto = game.settings.fielding === 'Auto' || (game.settings.fielding === 'Assisted' && p > 0.85);
    if (f.human && !auto) {
      this.catchRing = { f, p, t: G.T('catchRing'), total: G.T('catchRing'), role: f.role };
      this.emit('catch-ring', { role: f.role, t: this.catchRing.total });
      return;
    }
    const caught = this.rng() < p;
    this.resolveCatch(f, caught, p);
  }
  stepCatchRing(dt) {
    const R = this.catchRing;
    R.t -= dt;
    // the ball falls onto the fielder's hands at the ring's end
    const k = clamp(1 - R.t / R.total, 0, 1);
    const b = this.ball;
    b.x = lerp(b.x, R.f.x, 0.25); b.y = lerp(b.y, R.f.y, 0.25); b.z = Math.max(1, b.z * (1 - k * 0.1));
    if (R.t <= -G.T('catchWindow') / 1000) { this.catchRing = null; this.resolveCatch(R.f, false, R.p); }
  }
  // the human's catch press: caught if it lands inside the window around the ring's end
  catchPress() {
    const R = this.catchRing;
    if (!R) return false;
    const off = Math.abs(R.t) * 1000;
    const ok = off <= G.T('catchWindow');
    const caught = ok && this.rng() < 0.6 + 0.4 * R.p;
    const perfect = ok && off <= G.T('catchWindow') * 0.5;
    this.catchRing = null;
    this.resolveCatch(R.f, caught, R.p, perfect);
    return true;
  }
  resolveCatch(f, caught, p, screamer) {
    if (caught) {
      f.hold = true; this.gathered = true;
      this.ball.x = f.x; this.ball.y = f.y; this.ball.z = 2; this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.phase = 'held'; this.ball.carried = false;
      this.emit('catch', { role: f.role, id: f.id, keeper: !!f.keeper, screamer: !!screamer, p: Math.round(p * 100) });
      this.stats.catches++;
      this.hypeGain(this.bowlingSide, screamer ? 15 : 8, 'catch');
      return this.dismiss('caught', { catcher: f.role });
    }
    this.stats.dropped++;
    this.emit('catch:dropped', { role: f.role });
    this.ball.carried = false;
    this.ball.vx *= 0.3; this.ball.vy *= 0.3; this.ball.vz = Math.abs(this.ball.vz) * 0.3;
    this.catchChanceDone = true;
  }
  // a gather: a ground ball taken. A human chooses where to throw (3 s); the CPU throws to the better end
  gather(f) {
    const b = this.ball;
    this.gathered = true;
    f.hold = true;
    // the gulls steal a stopped ball in the outfield: two byes, and a glare
    if (this.gulls && b.carried === false) { this.I.runs += 2; this.I.extras.b += 2; this.stats.byes += 2; this.emit('byes', { n: 2 }); }
    // a gathered ball is no catch chance: it is in the fielder's hands, and the throw follows
    b.carried = false; this.catchChanceDone = true;
    b.vx = b.vy = b.vz = 0; b.phase = 'held'; b.z = 1; b.x = f.x; b.y = f.y;
    this.emit('gather', { role: f.role });
    if (f.human) { this.humanFieldHold = { f, timer: 3 }; this.emit('throw-pick', {}); return; }
    this.throwTo(f, this.bestEnd());
  }
  // the end a throw should go to: the end where a runner is closest to his crease, and not the bowler's end unless needed
  bestEnd() {
    if (!this.runs || !this.runs.active) return 'A';
    const I = this.I;
    const r = I.bat.find(b => !b.out && b.end === 'B') || null;
    return r ? 'A' : 'B';
  }
  // a fielder throws to an end: a direct hit runs a batter out if he is still short of his crease
  throwTo(f, end) {
    if (this.humanFieldHold && this.humanFieldHold.f === f) this.humanFieldHold = null;
    const stump = end === 'A' ? { x: G.W.PX, y: G.W.SY } : { x: G.W.PX, y: G.W.BY };
    const d = Math.hypot(f.x - stump.x, f.y - stump.y);
    const err = (this.rng() - 0.5) * 2 * G.T('throwError') * d / 480;
    const tt = d / G.T('throwSpeed');
    const hit = Math.abs(err) < 8;
    const runner = this.runs && this.runs.active ? this.I.bat.find(bt => !bt.out && bt.end !== end) : null;
    const runnerTime = runner ? Math.abs(runner.y - (end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE)) / G.T('runSpeed') : 0;
    this.throwing = { f, end, t: tt, total: tt, hit, runner, runnerTime, from: { x: f.x, y: f.y }, to: stump };
    this.stats.throws++;
    this.emit('throw', { end, t: tt });
  }
  stepThrow(dt) {
    const th = this.throwing;
    th.t -= dt;
    const k = 1 - Math.max(0, th.t) / Math.max(0.001, th.total);
    const b = this.ball;
    b.x = lerp(th.from.x, th.to.x, k); b.y = lerp(th.from.y, th.to.y, k); b.z = 4;
    if (th.t > 0) return;
    this.throwing = null;
    if (th.runner && th.hit && Math.abs(th.runnerTime - th.total) < 0.15) { this.stats.thirdUmpire++; this.emit('third-umpire', { out: th.runnerTime > th.total, margin: Math.round((th.runnerTime - th.total) * 1000), name: this.batterName(th.runner) }); }
    if (th.runner && th.hit && th.runnerTime > th.total) return this.runOut(th.runner);
    if (th.hit && th.runner) this.emit('throw:miss', {});
    // the ball is dead when the runners are home: a run in progress is finished first
    if (this.runs && this.runs.active) return;
    this.dead('settled', {});
  }
  runOut(bt) {
    bt.out = true; bt.how = 'run out';
    this.I.wkts++;
    this.stats.runouts++;
    this.stats.wickets++;
    this.emit('runout', { name: this.batterName(bt) });
    this.hypeGain(this.bowlingSide, 30, 'wicket');
    this.runs.active = false;
    this.dead('runout', { how: 'run out' });
  }
  // a boundary, a four or a six, the Hype, and the ball goes to the stands
  boundary(n) {
    this.addRuns(n);
    this.emit('boundary', { n, x: this.ball.x, y: this.ball.y });
    if (n === 4) this.stats.fours++; else this.stats.sixes++;
    this.I.boundaries++;
    this.hypeGain(this.battingSide, n === 6 ? 25 : 15, 'boundary');
    this.streakAdd(this.battingSide);
    this.dead('boundary', { n });
  }
  streakAdd(side) {
    this.streak[side]++;
    this.dots[side] = 0;
    if (this.streak[side] >= G.T('fireStreak') && !this.fire[side]) { this.fire[side] = true; this.emit('fire:on', { side }); }
  }
  streakEnd(side) { if (this.fire[side]) this.emit('fire:off', { side }); this.fire[side] = false; this.streak[side] = 0; }
  // the ball is dead: the umpire signals, and the commit follows after a beat
  dead(reason, d) {
    if (this.phase !== 'flight' && this.phase !== 'play') return;
    this.deadReason = reason;
    this.deadData = d || {};
    this.ball.phase = 'dead';
    this.pressed = null;
    this.catchRing = null;
    this.throwing = null;
    this.humanFieldHold = null;
    if (this.runs) this.runs.active = false;
    this.setPhase('dead', this.reviewable ? 4.2 : 1.4);
    this.emit('dead', { reason, n: d && d.n || 0, how: d && d.how });
  }
  // the run, from the play: both batters walk to the far crease; both grounded is a run
  stepRuns(dt) {
    const R = this.runs, I = this.I;
    if (!R.active) return;
    const sp = G.T('runSpeed') * (this.ground.outfieldK > 0.8 ? 0.85 : 1);
    let arrived = 0;
    for (const bt of I.bat) {
      if (bt.out) continue;
      const goal = bt.end === 'A' ? G.W.BOWL_CREASE : G.W.BAT_CREASE;
      const d = Math.abs(goal - bt.y);
      if (d > 0.5) bt.y += Math.sign(goal - bt.y) * Math.min(d, sp * dt);
      else arrived++;
    }
    if (arrived >= I.bat.filter(b => !b.out).length) {
      R.run++;
      this.stats.runsCompleted++;
      I.bat.forEach(bt => { if (!bt.out) { bt.end = bt.end === 'A' ? 'B' : 'A'; bt.y = bt.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE; } });
      R.active = false;
      this.addRuns(1);
      this.emit('run', { n: R.run });
      if (R.human && R.more) { R.more = false; this.startRun(); }
      else if (this.cpuDecideMore()) this.startRun();
    }
  }
  startRun() {
    const R = this.runs;
    if (!R || R.active || this.phase !== 'play') return false;
    R.active = true;
    R.awaitCall = 0;
    this.emit('running', {});
    return true;
  }
  // the batter's R1: a run, or (while running) to turn for another
  callRun() {
    if (this.phase !== 'play' || !this.runs) return false;
    if (this.runs.active) { this.runs.more = true; return true; }
    return this.startRun();
  }
  cpuDecideRun() {
    if (!this.cpuBatting()) return;
    const bt = this.bat;
    if (!bt || bt.defended) return;
    if (bt.lofted && !this.ballTouchedGround && bt.grade !== 'PERFECT') return;
    if (this.runs.awaitCall > 0 && this.rng() < 0.55 + 0.25 * G.T('aiAggression')) this.startRun();
  }
  cpuDecideMore() {
    if (!this.cpuBatting()) return false;
    return this.rng() < 0.2 + 0.2 * G.T('aiAggression');
  }
  addRuns(n) {
    const I = this.I;
    if (this.teapot[this.battingSide] && n > 0) { n *= 2; this.teapot[this.battingSide] = false; this.emit('item:used', { id: 'teapot', n }); }
    I.runs += n;
    I.overRuns += n;
    I.bat.forEach(bt => { if (!bt.out && bt.end === 'A') bt.runs += 0; });
    const s = this.striker; if (s) s.runs += n;
  }

  /* ---- the dismissal ---- */
  dismiss(how, d) {
    const I = this.I;
    const bt = this.striker;
    // a free hit: the only dismissal is a run out
    if (this.freeHit && how !== 'runout' && how !== 'run out') return this.dead('notout', { freeHit: true });
    if (this.cfg.invincible && how !== 'runout' && how !== 'run out') return this.dead('notout', { invincible: true });
    if (this.horseshoe[this.battingSide] && how !== 'bowled') {
      this.horseshoe[this.battingSide] = false;
      this.emit('item:used', { id: 'horseshoe', n: 0 });
      return this.dead('notout', { how, overturned: true });
    }
    bt.out = true; bt.how = how; I.wkts++; this.stats.wickets++;
    this.hypeGain(this.bowlingSide, 30, 'wicket');
    this.streakEnd(this.battingSide);
    this.emit('wicket', { how, name: this.batterName(bt), review: !!(d && d.review) });
    if (d && d.review) this.reviewable = { batter: bt, call: 'out', truth: 'notout', side: this.battingSide, how };
    this.dead('wicket', { how, review: !!(d && d.review) });
  }
  // the review (the human's Y during the dead beat): an LBW call the truth contradicts is overturned, once an innings
  reviewPress() {
    const rv = this.reviewable;
    if (!rv || this.phase !== 'dead' || this.review[rv.side] <= 0) return false;
    this.review[rv.side]--;
    this.stats.reviews++;
    const won = rv.truth !== rv.call;
    if (won) {
      this.stats.reviewsWon++;
      if (rv.call === 'out') {
        rv.batter.out = false; rv.batter.how = ''; this.I.wkts--; this.stats.wickets--;
        this.streak[rv.side] = 0;
      } else {
        rv.batter.out = true; rv.batter.how = rv.how || 'lbw'; this.I.wkts++; this.stats.wickets++;
      }
    }
    this.emit('review', { won, call: rv.call, truth: rv.truth });
    this.reviewable = null;
    return won;
  }
  // the commit: the ball goes into the record. Wides and no-balls are extras and are bowled again.
  commit() {
    const I = this.I;
    const r = this.deadReason, d = this.deadData || {};
    const legal = !(r === 'wide' || r === 'noball');
    if (r === 'wide') { I.runs += 1; I.extras.w += 1; I.overRuns += 1; this.stats.wides++; this.emit('extra', { kind: 'wide' }); }
    if (r === 'noball') { I.runs += 1; I.extras.nb += 1; I.overRuns += 1; this.stats.noballs++; this.freeHit = true; this.emit('extra', { kind: 'noball' }); }
    if (legal) { I.legal++; I.ballInOver++; }
    const ballRuns = I.runs - (this.ballStartRuns || 0);
    const striker = this.striker;
    if (legal && striker) striker.balls++;
    if (r === 'boundary' && striker) { if (d.n === 4) striker.fours++; else striker.sixes++; }
    const rec = {
      n: this.ballNo, inn: I.k, over: I.over, ball: I.ballInOver, bowler: this.bowlerName(), batter: this.batterName(striker),
      runs: I.runs, wkts: I.wkts, reason: r, shot: this.bat ? this.bat.shot : '', grade: this.bat ? this.bat.grade : '',
      delivery: this.lastDel ? this.lastDel.key : '', kmh: this.lastDel ? this.lastDel.kmh : 0, legal, lofted: !!(this.bat && this.bat.lofted), ballRuns
    };
    this.log.push(rec);
    this.emit('ball', rec);
    if (this.bat && this.bat.grade === 'PERFECT') this.hypeGain(this.battingSide, 8, 'perfect');
    this.dotRun = legal && ballRuns === 0 && r !== 'wicket' && r !== 'runout' ? this.dotRun + 1 : 0;
    if (legal && ballRuns === 0 && r !== 'wicket' && r !== 'runout') this.dotBall();
    this.bat = null; this.lbw = null; this.reviewable = null; this.noBall = false; this.gathered = false; this.humanFieldHold = null;
    this.shock = false; this.grudgeBall = false; this.chirpActive = false; this.catchTrap = false; this.forceFour = false; this.ghostFielder = null;
    this.freeHit = this.freeHit && !legal;
    this.delivery = null;
    // the innings goes on: wickets fall, the target is passed, the over ends
    if (I.wkts >= I.wk) return this.endInnings('allout');
    if (this.chaseWon()) return this.endInnings('target');
    if (r === 'wicket' || r === 'runout') this.nextBatterIn();
    if (legal && I.ballInOver >= 6) return this.endOver();
    this.setPhase('between', 0.9);
    this.phase = 'between';
  }
  chaseWon() { const I = this.I; return I.target !== null && I.runs >= I.target; }
  dotBall() {
    this.hypeGain(this.bowlingSide, 6, 'dot');
    this.dots[this.bowlingSide]++;
    this.streakEnd(this.battingSide);
    // the church bells ring for a dot ball while the bells chaos lasts: Hype for the bowlers, and a roar
    if (this.bells > 0) { this.bells--; this.hypeGain(this.bowlingSide, 10, 'bells'); this.emit('bells', {}); }
    if (this.dots[this.bowlingSide] >= G.T('fireStreak') && !this.fire[this.bowlingSide]) { this.fire[this.bowlingSide] = true; this.emit('bowl:fire', { side: this.bowlingSide }); }
  }
  // the next batter walks in at the striker's end
  nextBatterIn() {
    const I = this.I;
    const slot = I.bat.findIndex(b => b.out && b.end === 'A');
    const dead = I.bat.findIndex(b => b.out);
    const idx = slot >= 0 ? slot : dead;
    if (idx < 0) return;
    if (I.nextP >= this.team(I.side).squad.length) return;
    const yy = I.bat[idx].end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE;
    I.bat[idx] = { p: I.nextP++, end: I.bat[idx].end, y: yy, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' };
  }
  endOver() {
    const I = this.I;
    I.over++;
    this.gulls = false; this.deflector = null; this.lightningOver = false;
    if (I.overRuns === 0) this.hypeGain(this.bowlingSide, 20, 'maiden');
    I.bat.forEach(b => { if (!b.out) { b.end = b.end === 'A' ? 'B' : 'A'; b.y = b.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE; } });
    this.emit('over', { n: I.over, runs: I.overRuns, wkts: I.wkts });
    if (I.over >= I.overs) return this.endInnings('overs');
    this.setPhase('between', 1.6);
    this.phase = 'between';
    this.startOverFlag = true;
  }
  afterBetween() {
    if (this.startOverFlag) { this.startOverFlag = false; this.startOver(); return; }
    this.setPhase('setup', 0.7);
    this.phase = 'setup';
    this.placeFielders();
  }
  endInnings(reason) {
    const I = this.I;
    I.endReason = reason;
    this.emit('innings:end', { k: I.k, runs: I.runs, wkts: I.wkts, reason });
    this.phase = 'between';
    this.setPhase('between', 0);
    if (I.k === 0 && this.cfg.singleInnings) return this.finish('single', I.side);
    if (I.k === 0) { this.setPhase('break', 3.0); this.phase = 'break'; return; }
    if (I.k === 1) {
      const a = this.innings[0], b = this.innings[1];
      if (b.runs > a.runs) return this.finish('chase', b.side);
      if (b.runs < a.runs) return this.finish('defend', a.side);
      this.setPhase('break', 3.0); this.phase = 'break'; this.superNext = true; return;
    }
    if (I.k === 2) { this.setPhase('break', 3.0); this.phase = 'break'; return; }
    if (I.k === 3) {
      const s1 = this.innings[2], s2 = this.innings[3];
      if (s2.runs > s1.runs) return this.finish('super', s2.side);
      if (s2.runs < s1.runs) return this.finish('super', s1.side);
      const b1 = s1.boundaries, b2 = s2.boundaries;
      if (b2 !== b1) return this.finish('super', b2 > b1 ? s2.side : s1.side);
      return this.finish('tie', -1);
    }
  }
  afterBreak() {
    if (this.superNext) { this.superNext = false; this.startInnings(2); this.emit('super', {}); return; }
    if (this.I.k === 0) return this.startInnings(1);
    if (this.I.k === 2) return this.startInnings(3);
  }
  finish(kind, winner) {
    this.phase = 'end';
    const a = this.innings[0], b = this.innings[1] || null;
    const side = winner;
    const margin = kind === 'chase' ? (2 + 0) : kind === 'defend' ? a.runs - b.runs : 0;
    const wkLeft = kind === 'chase' ? this.innings[1].wk - this.innings[1].wkts : 0;
    this.result = { kind, winner: side, margin, wicketsLeft: wkLeft, A: a.runs, B: b ? b.runs : 0, super: this.innings.length > 2 };
    this.emit('match:end', this.result);
  }
  // the powers: Hype, ON FIRE, items and targets
  hypeGain(side, n, why) {
    const before = this.hype[side];
    this.hype[side] = clamp(this.hype[side] + n * G.T('hypeGain'), 0, 100);
    if (before < 100 && this.hype[side] >= 100) this.emit('hype:full', { side, why });
  }
  spawnItem() {
    const side = this.battingSide;
    const ids = Object.keys(G.ITEMS);
    const id = ids[Math.floor(this.rng() * ids.length)];
    const x = G.W.PX + (this.rng() - 0.5) * 300, y = G.W.CY + (this.rng() - 0.5) * 220;
    this.items[side] = { id, x, y, r: 14 };
    this.emit('item:spawn', { id, x, y, side });
  }
  checkTargets() {
    const b = this.ball;
    if (!b.carried) return;
    for (const tg of this.ground.targets) {
      if (this.targetsHit[tg.id]) continue;
      if (Math.hypot(b.x - tg.x, b.y - tg.y) <= tg.r && b.z <= tg.z + 14) {
        this.targetsHit[tg.id] = true;
        this.stats.targets++;
        this.addRuns(tg.bonus);
        this.hypeGain(this.battingSide, 30, 'target');
        this.emit('target:hit', { id: tg.id, name: tg.name, bonus: tg.bonus, x: tg.x, y: tg.y });
      }
    }
    const it = this.items[this.battingSide];
    if (it && Math.hypot(b.x - it.x, b.y - it.y) <= it.r + 4 && b.z < 30) {
      this.items[this.battingSide] = null;
      this.stats.items++;
      if (it.id === 'cake') this.hypeGain(this.battingSide, 40, 'cake');
      else if (it.id === 'teapot') this.teapot[this.battingSide] = true;
      else if (it.id === 'horseshoe') this.horseshoe[this.battingSide] = true;
      this.emit('item:got', { id: it.id, side: this.battingSide });
    }
  }
  // chaos: between overs. A rain delay in the second innings revises the target by the Kerfuffle Method
  startChaos() {
    const id = this.chaosNow;
    this.chaosNow = null;
    if (id === 'rain') {
      this.rainUsed = true; this.stats.rain++;
      this.setPhase('rain', 6); this.phase = 'rain';
      this.emit('rain:start', {});
      return;
    }
    this.stats.chaos++;
    this.chaos = id;
    this.setPhase('chaos', 2.2); this.phase = 'chaos';
    this.emit('chaos', { id });
    // each chaos has its effect on the match, and each one ends by itself
    if (id === 'bees') { const f = this.fielders[(this.ballNo * 3) % 9]; if (f) f.slowT = 4; }
    if (id === 'tide') this.tide = Math.min(0.15, (this.tide || 0) + 0.04);
    if (id === 'gulls') this.gulls = true;
    if (id === 'bells') this.bells = 3;
    if (id === 'peacock') this.deflector = { x: G.W.PX + 70, y: G.W.CY + 60, zMax: 6, deg: 25, r: 16, used: false };
    if (id === 'dust') this.deflector = { x: G.W.PX - 110, y: G.W.CY + 20, zMin: 8, zMax: 30, deg: 10, r: 26, used: false };
    if (id === 'cow') this.deflector = { x: G.W.PX + 170, y: G.W.CY - 40, zMax: 8, deg: 25, r: 16, used: false };   // Doris, at deep midwicket: she turns a low ball too
  }
  endChaos() { this.chaos = null; this.setPhase('setup', 0.6); this.phase = 'setup'; }
  endRain() {
    const I = this.I;
    if (I.k === 1 && !I.isSuper) {
      const O = this.cfg.overs, o = Math.max(1, I.overs - 1), w = I.wkts;
      const first = this.innings[0].runs;
      const rev = Math.max(I.runs + 1, G.kerfTarget(first, O, o, w));
      const Rb = G.kerfResources(O, O, w), Ra = G.kerfResources(o, O, w);
      I.overs = o; I.target = rev;
      this.kmRevision = { first, before: first + 1, after: rev, O, o, w, Ra: +Ra.toFixed(3), Rb: +Rb.toFixed(3) };
      this.emit('kerf-method', this.kmRevision);
    }
    this.emit('rain:end', {});
    this.setPhase('setup', 0.6); this.phase = 'setup';
  }
  // the human side's review: once an innings, after an LBW or a caught-behind, the truth decides
  // ---- CPU batting ----
  cpuPlanBat() {
    const mistime = (this.chirpActive ? 2 : 1) * (this.lastDel && this.lastDel.special === 'dibbly' ? 2 : 1);
    const err = this.cfg.cheatPerfect ? 0 : (this.rng() - 0.5) * 2 * G.T('aiBatSkill') / 1000 * mistime;
    const pitch = this.predictPitch();
    const len = G.lengthOf(pitch.y);
    // a CPU batter with a full meter plays his special
    const sp = this.hype[this.battingSide] >= 100 ? this.batSpecialOf(this.striker) : null;
    if (sp) { this.hype[this.battingSide] = 0; this.cpuIntent = { button: 'loft', aim: null, special: sp }; this.cpuPressAt = this.arriveAbs - 0.14 + err; return; }
    const pLoft = this.cfg.cpuLoft !== undefined ? this.cfg.cpuLoft : G.T('aiAggression') * 0.6;
    const loft = this.rng() < pLoft && len !== 'yorker';
    const button = len === 'yorker' ? 'block' : loft ? 'loft' : 'shot';
    // a CPU batter leaves what is wide of the line, the way a sensible batter does
    const off = pitch.x - G.W.PX;
    if ((len === 'full' || len === 'good') && (off < -26 || off > 22) && this.rng() < 0.85) { this.cpuIntent = null; this.cpuPressAt = null; return; }
    this.cpuIntent = { button, aim: null, special: null };
    this.cpuPressAt = this.arriveAbs - G.SHOTS.drive.contactAt + err;
  }
  cpuFire() {
    if (!this.cpuIntent) { this.cpuPressAt = null; return; }
    const it = this.cpuIntent;
    this.cpuPressAt = null;
    this.batPress(it.button, it.aim);
  }
  // ---- human inputs: the stick aims the batter, the field moves the active fielder ----
  fieldMove(dx, dy, dt) {
    const f = this.humanField();
    if (!f || f.hold) return;
    const sp = f.speed * 1.15;
    f.x = clamp(f.x + dx * sp * dt, 40, 1112); f.y = clamp(f.y + dy * sp * dt, 40, 1112);
  }
  // a human fielder's button: the throw to an end ('A' the striker's, 'B' the bowler's), or a catch press
  fieldAct(end) {
    if (this.catchRing) return this.catchPress();
    if (this.humanFieldHold) { const f = this.humanFieldHold.f; this.throwTo(f, end); return true; }
    return false;
  }
};


/* ---- PRESENTATION: the ground (a TileMap baked from the ground's recipe), the stands and the crowd, the stumps, the
 * players (Humanoid rigs with cricket kit and bats), the ball and its shadow and trail, the umpire, and the glyph prompts.
 * It reads the match and never changes it. ---- */
G.buildMap = (ground) => {
  // the map: 72 x 72 cells of 16 units. Grass inside the boundary, the pitch down the middle, the surround outside
  const N = 72, rows = [];
  const bs = ground.boundary * G.T('boundaryScale');
  for (let cy = 0; cy < N; cy++) {
    let s = '';
    for (let cx = 0; cx < N; cx++) {
      const x = cx * 16 + 8, y = cy * 16 + 8;
      const ex = (x - G.W.PX) / (G.W.RX * bs), ey = (y - G.W.CY) / (G.W.RY * bs);
      const onPitch = Math.abs(x - G.W.PX) <= 26 && y >= G.W.SY - 8 && y <= G.W.BY + 8;
      s += onPitch ? 'p' : ex * ex + ey * ey <= 1.06 ? '.' : 'o';
    }
    rows.push(s);
  }
  return rows;
};
G.floorTexFor = ground => (x, y, tag) => {
  const n = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - 0.5, m = E.noise2(x * 0.05, y * 0.05) * 0.5;
  if (tag === 'out') { const v = 150 + n * 14; return [v * 0.9, v * 0.85, v * 0.78]; }   // the surround: pavement and stone
  const bs = ground.boundary * G.T('boundaryScale');
  if (tag === 'pitch') {
    // the pitch and its creases (1-unit white lines), worn at the ends
    const wear = Math.abs(y - G.W.SY) < 40 || Math.abs(y - G.W.BY) < 40 ? 0.9 : 1;
    const cr = (Math.abs(y - G.W.BAT_CREASE) < 1 || Math.abs(y - G.W.BOWL_CREASE) < 1) && Math.abs(x - G.W.PX) < 24;
    const ret = (Math.abs(x - (G.W.PX - 21)) < 1 || Math.abs(x - (G.W.PX + 21)) < 1) && Math.abs(y - G.W.SY) < 20;
    if (cr || ret) return [236, 236, 228];
    const v = (ground.pitch === '#c9b98a' ? [201, 185, 138] : [212, 196, 154]);
    return v.map(c => c * wear * (0.96 + n * 0.08 + m * 0.06));
  }
  // grass: mown stripes 32 units wide, and the rope where the boundary is
  const ex = (x - G.W.PX) / (G.W.RX * bs), ey = (y - G.W.CY) / (G.W.RY * bs);
  const rr = Math.sqrt(ex * ex + ey * ey);
  if (rr > 0.985 && rr < 1.0) return [240, 240, 236];
  const stripe = Math.floor(x / 32) % 2 ? 1 : 0;
  const g = ground.grass, d = ground.grassDark;
  const c = stripe ? g : d;
  const hx = parseInt(c.slice(1, 3), 16), hy = parseInt(c.slice(3, 5), 16), hz = parseInt(c.slice(5, 7), 16);
  const k = 0.94 + n * 0.12 + m * 0.1;
  return [hx * k, hy * k, hz * k];
};
G.makeWorld = () => {
  const ground = G.match ? G.match.ground : G.GROUNDS.green;
  G.mapGround = ground;
  G.map = new E.TileMap({ rows: G.buildMap(ground), legend: { '.': { floor: 'grass' }, p: { floor: 'pitch' }, o: { floor: 'out' } },
    floorTex: G.floorTexFor(ground), outside: '#8a8478', ao: 0 });
  G.mapOwner = ground.id;
};

/* ---- drawing helpers: all pixel primitives in screen space; the world goes through r.w ---- */
G.box = (g, r, x, y, z, w, d, h, c) => {
  const T = G.tonesOf(c);
  const p = (dx, dy, dz) => r.w(x + dx, y + dy, z + dz);
  const b = p(w / 2, -d / 2, 0), cc = p(w / 2, d / 2, 0), dd = p(-w / 2, d / 2, 0);
  const at = p(-w / 2, -d / 2, h), bt = p(w / 2, -d / 2, h), ct = p(w / 2, d / 2, h), dt = p(-w / 2, d / 2, h);
  px.poly(g, [dd, cc, ct, dt], T.sh);     // front face
  px.poly(g, [cc, b, bt, ct], T.deep);    // right face
  px.poly(g, [at, bt, ct, dt], T.lt);     // top
  px.line(g, dt[0], dt[1], ct[0], ct[1], T.hi, 1);
};
G.tonesOf = hex => {
  if (!G._tones) G._tones = {};
  if (!G._tones[hex]) G._tones[hex] = E.tones(hex);
  return G._tones[hex];
};
G.stick = (g, r, x, y, z0, z1, col) => {
  const a = r.w(x, y, z0), b = r.w(x, y, z1);
  px.line(g, a[0], a[1], b[0], b[1], col, 1);
};
// the stumps at one end: three ash sticks, two bails across the top
G.drawStumps = (r, y) => {
  const split = G.match && G.match.sawnSplit && y === G.W.SY ? 4 : 0;   // Sawn in Half: the outer stumps fly apart
  r.queue(G.W.PX, y, 0, g => {
    for (const dx of [-3, 0, 3]) G.stick(g, r, G.W.PX + dx + (dx ? Math.sign(dx) * split : 0), y, 0, G.W.STUMP_H, '#e8d8a8');
    const a = r.w(G.W.PX - 3, y, G.W.STUMP_H), b = r.w(G.W.PX + 3, y, G.W.STUMP_H);
    px.line(g, a[0], a[1] - 1, b[0], b[1] - 1, '#f4ecc0', 1);
  }, { bias: 0 });
};
// the stands: a pavilion behind the far end, a scoreboard and the sight screen, boundary boards
G.drawScenery = (r, match) => {
  const ground = G.mapGround;
  r.queue(G.W.PX, 150, 0, g => {
    G.box(g, r, G.W.PX, 150, 0, 170, 60, 44, '#e8e0d0');
    G.box(g, r, G.W.PX, 150, 44, 180, 66, 10, '#8a2a2a');
    G.box(g, r, G.W.PX - 84, 150, 0, 22, 20, 80, '#f6f2e6');
  }, { bias: -1, solid: false });
  // the scoreboard hut, with its live numbers drawn on top
  r.queue(G.W.PX + 120, 140, 0, g => {
    G.box(g, r, G.W.PX + 120, 140, 0, 60, 26, 44, '#2f6b3a');
    const p = r.w(G.W.PX + 120, 140, 44);
    if (match && match.I) {
      const I = match.I;
      E.font.text(g, match.battingSide === 0 ? G.TEAMS[match.cfg.teams[0]].id : G.TEAMS[match.cfg.teams[1]].id, p[0] - 22, p[1] - 6, '#ffe08a', { outline: '#0b0814' });
      E.font.text(g, I.runs + '/' + I.wkts, p[0] - 22, p[1] + 3, '#ffffff', { outline: '#0b0814' });
    }
  }, { bias: -1 });
  // the boundary boards: a band round the rope, drawn as ground-level strips
};
G.drawCrowd = (r, match, t) => {
  const bs = G.mapGround.boundary * G.T('boundaryScale');
  const n = 140, cheer = match && match.fire && (match.fire[0] || match.fire[1]) ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (i % 3) * 0.02;
    const rad = 1.10 + (i % 4) * 0.035;
    const x = G.W.PX + Math.cos(a) * G.W.RX * bs * rad, y = G.W.CY + Math.sin(a) * G.W.RY * bs * rad;
    const h = E.hash2(i, 9);
    const col = ['#eef0f6', '#2a5ab8', '#c8502a', '#f0d070', '#7aa0c8', '#3a2a22'][Math.floor(h * 6)];
    const jump = cheer ? Math.abs(Math.sin(t * 6 + i)) * 3 : Math.sin(t * 1.4 + i) * 0.4;
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0);
      px.rect(g, p[0] - 2, p[1] - 9 - jump, 4, 6, col);
      px.rect(g, p[0] - 2, p[1] - 3 - jump, 4, 3, '#2a2030');
    }, { bias: -2 });
  }
};
// the cow, and the bees and bells and seagulls as chaos props (drawn when they are on the ground)
G.drawChaos = (r, match) => {
  if (!match || !match.chaos) return;
  if (match.chaos === 'cow') r.sprite(G.W.PX + 170, G.W.CY - 40, 0, G.COW, { anchor: 'bottom' });
};
G.COW = E.sprite(['..........', '.wwwwwwwww.', 'wwbbwwwwwwp', 'wwbbwwwwwwp', 'wwwwwwwwwww', '.wwwwwwwww.', '.wlw...wlw.', '.wlw...wlw.'], { w: '#f4f4f0', b: '#2a2a30', l: '#3a2a22', p: '#f0a0a0' }, 2);

/* ---- players: rigs, cached per player. The kit, the look and the bat ---- */
G.rigOf = (key, side, idx) => {
  G._rigs = G._rigs || {};
  if (G._rigs[key]) return G._rigs[key];
  const team = G.TEAMS[G.match.cfg.teams[side]];
  const look = G.PLAYER_LOOK[idx % G.PLAYER_LOOK.length];
  const hatOpt = look.hat ? (look.hat === 'cap' ? { style: 'cap', color: team.kit.cap } : look.hat === 'helmet' ? { style: 'helmet', color: '#f2ead8' } : look.hat) : null;
  const rig = new E.Humanoid({
    size: 1.1, build: look.build, hair: look.hair, hat: hatOpt, weapon: null, sleeves: 'short',
    colors: Object.assign({ skin: look.skin, hair: look.hairColor, cloth: team.kit.cloth, pants: team.kit.pants, trim: team.kit.trim, belt: team.kit.belt, boot: team.kit.boot, glove: '#f4f4f0' }, {})
  });
  G._rigs[key] = rig;
  return rig;
};
// the stance: the bat grounded across the batter's front (it reads side-on in the broadcast view); the swing sweeps it
G.batAngleNow = () => G.swingPose ? G.swingPose.angle : 0.3;
G.batLiftNow = () => G.swingPose ? G.swingPose.lift : -3;
G.umpireRig = () => G._umpire || (G._umpire = new E.Humanoid({ size: 1.15, build: 'heroic', hair: 'short', hat: { style: 'brim', color: '#f4f4f0' }, weapon: null, outfit: 'coat',
  colors: { skin: '#e0b090', hair: '#8a8a8a', cloth: '#f4f4f0', coat: '#f4f4f0', pants: '#2a2a30', trim: '#22305a', boot: '#1a1a1e' } }));
// a cricket bat in the batter's hand: a willow blade from the hand, the angle of the swing
G.batInto = (g, r, rig, angle, lift, local) => {
  // a willow bat from the right hand: a handle, the blade with its edge line, and the sticker band. local() maps a
  // world point into the figure's own drawing space (an actor draws in its own small buffer)
  const h = rig.hand('R');
  const L = 15;
  const a = local(h[0], h[1], h[2]);
  const b = local(h[0] + Math.cos(angle) * L, h[1] + Math.sin(angle) * L, h[2] + lift);
  const c = local(h[0] + Math.cos(angle) * (L * 0.55), h[1] + Math.sin(angle) * (L * 0.55), h[2] + lift * 0.5);
  px.line(g, a[0], a[1], c[0], c[1], '#4a2f18', 2);
  px.line(g, c[0], c[1], b[0], b[1], '#f0dca8', 4);
  px.line(g, c[0], c[1] + 1, b[0], b[1] + 1, '#b89a60', 1);
  px.dot(g, b[0], b[1], '#ffffff');
};
// the bowler's ball in the hand until release
// the bowler's marker on the pitch, while the human bowls; and the dev toggle's predicted path
G.drawMarker = (r, match) => {
  if (!match || match.phase !== 'setup' || !match.humanBowls() || G.setting('marker') !== 'On') return;
  const mk = G.marker;
  r.queue(mk.x, mk.y, 0, g => {
    const p = r.w(mk.x, mk.y, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; px.disc(g, p[0] + Math.cos(a) * 4, p[1] + Math.sin(a) * 2, 0.6, '#ffe08a'); }
  }, { bias: -2 });
};
G.drawTrajectory = (r, match) => {
  const b = match.ball;
  if (!G.devFlags.trajectory || !b || match.phase !== 'flight') return;
  const c = G.clone(b);
  for (let k = 0; k < 480; k++) {
    G.stepBall(c, match.env, null);
    if (k % 8) continue;
    const p = r.w(c.x, c.y, c.z);
    r.overlay(g => px.rect(g, p[0], p[1], 1, 1, '#7ad0ff'));
  }
};
G.ballFx = (r, match) => {
  const b = match.ball;
  if (!b || match.phase === 'end') return;
  // Triple Threat: two holograms ride beside the real ball, on other lines (only the real one is simulated)
  if (b.triple && b.phase === 'delivery') {
    for (const dx of [-11, 11]) {
      const hp = r.w(b.x + dx, b.y, b.z);
      r.queue(b.x + dx, b.y, b.z, g => px.blend(g, 0.5, 'normal', () => px.disc(g, hp[0], hp[1], 2, (Math.floor(G.game.time * 20) % 2) ? '#7ad0ff' : '#c8f0ff')), { bias: 3 });
    }
  }
  if (b.vanish && b.phase === 'delivery' && b.age > 0.35 && b.age < 0.62) {
    // the Vanishing Ball: the ball is gone, a puff of smoke marks it, and the shadow is still drawn
    r.shadow(b.x, b.y, 3.5, 0.25, undefined, 0);
    r.queue(b.x, b.y, b.z, g => { const p = r.w(b.x, b.y, b.z); px.disc(g, p[0], p[1], 3 + Math.sin(b.age * 30) * 1, '#8a6aa8'); }, { bias: 3 });
    return;
  }
  if (b.phase === 'held' && match.phase !== 'dead') return;
  const pos = r.w(b.x, b.y, b.z);
  // the shadow: on the ground under the ball
  r.shadow(b.x, b.y, 3.5, b.z > 6 ? 0.25 : 0.45, undefined, 0);
  // the trail
  if (b.trail && b.trail.length > 1) {
    r.queue(b.x, b.y, b.z, g => {
      for (let i = 1; i < b.trail.length; i++) {
        const p = b.trail[i - 1], q = b.trail[i];
        const a = r.w(p.x, p.y, p.z), c = r.w(q.x, q.y, q.z);
        px.line(g, a[0], a[1], c[0], c[1], i > b.trail.length - 4 ? '#ffffff' : '#c8c8d0', 1);
      }
    }, { bias: 2 });
  }
  r.queue(b.x, b.y, b.z, g => {
    const ph = pos;
    const rad = b.speed > 300 ? 2 : 2;
    px.disc(g, ph[0], ph[1], rad + 1, '#2a0808');
    px.disc(g, ph[0], ph[1], rad, b.delivery === 'bouncer' ? '#ffb0a0' : '#c8202a');
    px.dot(g, ph[0] - 1, ph[1] - 1, '#ffffff');
  }, { bias: 3, emissive: true });
};
// the batter, the bowler, the fielders and the umpire: every rig drawn in the scene
G.drawPlayers = (r, match) => {
  const pl = G.playersNow(match);
  for (const p of pl) {
    const rig = G.rigOf(p.key, p.side, p.idx);
    r.shadow(p.x, p.y, 6, 0.35, undefined, 0);
    const w0 = r.w(p.x, p.y, 0);
    r.actor(p.x, p.y, 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, r.view);
      if (p.bat) G.batInto(g, r, rig, G.batAngleNow(), G.batLiftNow(), (x, y, z) => { const w = r.w(x, y, z); return [ox + w[0] - w0[0], oy + w[1] - w0[1]]; });
    }, p.ghost ? { alpha: p.intangible ? 0.25 : 0.6 } : {});
  }
  const u = G.umpireRig();
  r.actor(G.W.PX + 30, G.W.BOWL_CREASE + 24, 0, (g, ox, oy) => u.draw(g, ox, oy, r.view));
};
G.playersNow = match => {
  const out = [];
  if (!match) return out;
  const I = match.I;
  const bat = match.striker, nst = match.nonStriker;
  for (const bt of [bat, nst]) {
    if (!bt || bt.out) continue;
    const isStriker = bt === bat;
    out.push({ key: 'bat' + (isStriker ? 0 : 1), side: match.battingSide, idx: bt.p, x: G.W.PX + (isStriker ? 8 : -8), y: bt.y,
      facing: PI / 2, bat: isStriker, role: 'bat' });
  }
  // the bowler: running in from behind his crease during the run-up, then at the crease
  const D = match.delivery;
  const bowlY = match.phase === 'runup' && D ? G.W.RELEASE_Y + (1 - Math.min(1, D.t / D.dur)) * 120 : G.W.RELEASE_Y + 6;
  out.push({ key: 'bowl', side: match.bowlingSide, idx: I.bowler, x: G.W.PX - 4, y: bowlY, facing: -PI / 2, bowl: true, role: 'bowl' });
  for (const f of match.fielders) {
    if (f.keeper) out.push({ key: 'keeper', side: match.bowlingSide, idx: 3, x: f.x, y: f.y, facing: PI / 2, role: 'keeper' });
    else out.push({ key: 'f' + f.id, side: match.bowlingSide, idx: (f.id * 2 + 1) % 11, x: f.x, y: f.y, facing: Math.atan2(G.W.CY - f.y, G.W.PX - f.x), role: 'field', ghost: !!f.ghost, intangible: !!f.intangible });
  }
  return out;
};
// the rigs take their poses from the simulation each step: the run, the stance, the swing of the batter
G.tickRigs = (dt, match) => {
  if (!match || dt <= 0) return;
  G._prev = G._prev || {};
  G.umpireTick(dt, match);
  for (const p of G.playersNow(match)) {
    const rig = G.rigOf(p.key, p.side, p.idx);
    const prev = G._prev[p.key] || { x: p.x, y: p.y };
    const vx = (p.x - prev.x) / dt, vy = (p.y - prev.y) / dt;
    G._prev[p.key] = { x: p.x, y: p.y };
    let attack = null;
    if (p.role === 'bat' && p.bat && G.swingState) attack = E.move('slash', G.swingState.u, 'active');
    // the bowler's action: the arm comes over in the last third of the run-up and the release
    if (p.role === 'bowl' && match.delivery && match.phase === 'runup' && match.delivery.t > match.delivery.dur - 0.35) attack = E.move('throw', clamp((match.delivery.t - (match.delivery.dur - 0.35)) / 0.35, 0, 1), 'active');
    // a fielder celebrates a catch with both arms up
    if (p.role !== 'bat' && G.celebrate && G.celebrate.key === p.key && G.celebrate.t > 0) attack = E.move('cast', clamp(1 - G.celebrate.t, 0, 1), 'active');
    rig.update(dt, { x: p.x, y: p.y, z: 0, vx, vy, facing: p.facing, attack, stance: p.role === 'bat' ? 'ready' : undefined });
  }
};

/* ---- the glyph prompts: PlayStation shapes (or the Xbox letters) for a controller, keycaps for a keyboard,
 * a mouse button for the mouse. The prompt follows the device used last. ---- */
G.GLYPH = {
  cross: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'],
  circle: ['.ooo.', 'o...o', 'o...o', 'o...o', '.ooo.'],
  square: ['ooooo', 'o...o', 'o...o', 'o...o', 'ooooo'],
  triangle: ['..o..', '.o.o.', 'o...o', 'o...o', 'ooooo'],
  l1: ['LL'], r1: ['RR']
};
G.GLYPH_COL = { cross: '#7aa7ff', circle: '#ff6b6b', square: '#ff8ad8', triangle: '#5fd38a' };
G.XBOX = { shot: ['A', '#5fd38a'], loft: ['B', '#ff6b6b'], block: ['X', '#7aa7ff'], special: ['Y', '#ffd23a'], run: ['RB', '#f4f4f0'], back: ['LB', '#f4f4f0'], charge: ['RT', '#f4f4f0'] };
G.PS = { shot: 'cross', loft: 'square', block: 'circle', special: 'triangle', run: 'r1', back: 'l1', charge: 'r1' };
// the letter an Xbox-style prompt shows for an action (A B X Y, LB, RB, RT)
G.xboxGlyph = action => (G.XBOX[action] || ['?'])[0];
// draws the prompt for an action at (x, y) in screen pixels; returns its width
G.prompt = (g, action, x, y, word, opts = {}) => {
  const dev = game.input.lastDevice;
  let w = 0;
  if (dev === 'gamepad') {
    const xbox = G.setting('buttons') !== 'PlayStation';
    if (xbox) {
      const letter = G.xboxGlyph(action), col = (G.XBOX[action] || [0, '#ffffff'])[1];
      px.disc(g, x + 5, y + 5, 5, '#0b0814');
      px.disc(g, x + 5, y + 5, 4, col);
      E.font.text(g, letter, x + 5 - E.font.width(letter) / 2, y + 2, '#0b0814');
      w = 11;
    } else {
      const k = G.PS[action] || 'cross';
      if (k === 'l1' || k === 'r1') {
        const txt = k === 'l1' ? 'L1' : 'R1';
        px.rect(g, x, y, 12, 9, '#2a2634'); E.font.text(g, txt, x + 1, y + 1, '#f4f4f0', { font: 'tiny' });
        w = 13;
      } else {
        const rows = G.GLYPH[k], col = G.GLYPH_COL[k];
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
          const ch = rows[j][i];
          if (ch === 'x' || ch === 'o') px.rect(g, x + i + 1, y + j + 1, 1, 1, col);
        }
        w = 7;
      }
    }
  } else if (dev === 'mouse') {
    const key = action === 'shot' ? 'LMB' : action === 'loft' ? 'RMB' : (game.input.label(action) || '').toUpperCase();
    E.font.text(g, key, x, y, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    w = E.font.width(key, { font: 'tiny' });
  } else {
    const key = game.input.label(action) || '?';
    const kw = E.font.width(key, { font: 'tiny' }) + 4;
    px.rect(g, x, y, kw, 8, '#2a2634'); px.rect(g, x, y + 6, kw, 2, '#0b0814');
    E.font.text(g, key, x + 2, y + 1, '#f4f4f0', { font: 'tiny' });
    w = kw;
  }
  if (word) { E.font.text(g, word, x + w + 3, y + 1, opts.color || '#f4f4f0', { font: 'tiny', outline: '#0b0814' }); w += 4 + E.font.width(word, { font: 'tiny' }); }
  return w;
};
G.promptRow = (g, items, x, y) => {
  let cx = x;
  for (const [a, word] of items) cx += G.prompt(g, a, cx, y, word) + 8;
  return cx - x;
};

/* ---- the Megadome, the sea, the peacock, the fireworks, the sightscreen, the vanishing ball, the Owl-Eye review ---- */
// the sightscreen: a white boarded screen on a scaffold behind the striker, for the bowler to aim at
G.drawSightscreen = r => {
  r.queue(G.W.PX, G.W.SY - 66, 0, g => {
    G.box(g, r, G.W.PX, G.W.SY - 66, 0, 60, 4, 30, '#f4f4f0');
    G.box(g, r, G.W.PX, G.W.SY - 66, 0, 4, 4, 6, '#6a4a2a');
  }, { bias: -1 });
};
// the sea: the boundary's rope moves in as the tide comes in, drawn as a line of surf on the sand
G.drawTide = (r, match) => {
  if (!match || !match.tide) return;
  const bs = G.mapGround.boundary * G.T('boundaryScale');
  const k = 1 - match.tide;
  r.decal(g => {
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU;
      const x = G.W.PX + Math.cos(a) * G.W.RX * bs * k, y = G.W.CY + Math.sin(a) * G.W.RY * bs * k;
      const p = r.w(x, y, 0);
      px.rect(g, p[0], p[1], 2, 2, (i + Math.floor(G.game.time * 4)) % 3 ? '#e8faff' : '#7ad0ff');
    }
  });
};
G.PEACOCK = E.sprite(['...bb...', '..bBb..', '.bBBBb..', 'bBBbBbBb', '.bBBBb..', '..bbb...', '..yyy...', '..y.y...'], { b: '#2a6ab0', B: '#3ad0a0', y: '#e8c040' }, 2);
G.drawPeacock = (r, match) => {
  if (!match || match.chaos !== 'peacock') return;
  r.sprite(G.W.PX + 70, G.W.CY + 60, 0, G.PEACOCK, { anchor: 'bottom' });
};
// the fog banks: a dithered translucency over the outfield, stronger for the fog chaos
G.drawFog = (r, match) => {
  if (!G.mapGround || !G.mapGround.fog) return;
  const a = 0.10 + (match && match.chaos === 'fog' ? 0.12 : 0) + 0.03 * Math.sin(G.game.time * 0.5);
  r.overlay(g => px.blend(g, clamp(a, 0, 0.3), 'normal', () => {
    for (let k = 0; k < 4; k++) px.rect(g, 0, Math.round(r.H * (0.3 + k * 0.14)), r.W, Math.round(r.H * 0.12), '#9aa8c8');
  }));
};
// the floodlights of the night ground: four pylons at the corners of the field, each lighting the outfield
G.drawNightLights = (r, match) => {
  if (!G.mapGround || G.mapGround.light !== 'night') return;
  const spots = [[G.W.PX - 320, G.W.SY - 160], [G.W.PX + 320, G.W.SY - 160], [G.W.PX - 320, G.W.BY + 160], [G.W.PX + 320, G.W.BY + 160]];
  for (const [x, y] of spots) {
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0), q = r.w(x, y, 90);
      px.line(g, p[0], p[1], q[0], q[1], '#3a3a4a', 3);
      px.rect(g, q[0] - 5, q[1] - 3, 10, 5, '#fff4dc');
    }, { bias: -1 });
    game.lights.add(x, y, 90, 220, 0.75, { color: '#fff4dc' });
  }
};
// fireworks: bursts of sparks in the sky over the ground, for a six at night and the fireworks chaos
G.fireworks = [];
G.addFirework = (x, y) => G.fireworks.push({ x, y, t: 1.6, col: ['#ffd23a', '#ff6b6b', '#7ad0ff', '#ffffff'][Math.floor(G.rng.cosmetic() * 4)] });
G.drawFireworks = r => {
  for (const f of G.fireworks) {
    const k = 1 - f.t / 1.6, p = r.w(f.x, f.y, 60 + 40 * Math.sin(k * PI));
    r.overlay(g => {
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, d = 4 + 14 * k;
        px.rect(g, p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d * 0.6, 1, 1, f.col);
      }
    });
  }
};
// the Owl-Eye: the ball's recorded path as a tube of dots, the pitching and impact markers, and the three lights
G.drawOwlEye = (r, match) => {
  const rv = match && match.reviewable;
  if (!rv || match.phase !== 'dead' || !match.path || !match.path.length) return;
  const path = match.path, pitch = match.pitchAt;
  const lit = {
    pitching: !!pitch && Math.abs(pitch.x - G.W.PX) <= 14,
    impact: rv.truth === 'out',
    wickets: rv.call === 'out'
  };
  r.overlay(g => {
    for (let i = 0; i < path.length; i += 2) {
      const p = r.w(path[i].x, path[i].y, path[i].z);
      px.rect(g, p[0], p[1], 2, 2, i > path.length - 20 ? '#ffffff' : '#7ad0ff');
    }
    if (pitch) { const p = r.w(pitch.x, pitch.y, 0); px.disc(g, p[0], p[1], 3, '#ffd23a'); }
    E.ui.box(g, 6, 40, 92, 52, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.9 });
    E.font.text(g, 'OWL-EYE', 12, 44, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    [['PITCHING', lit.pitching], ['IMPACT', lit.impact], ['WICKETS', lit.wickets]].forEach(([label, on], k) => {
      px.disc(g, 14, 58 + k * 10, 3, on ? '#5fd38a' : '#ff6b6b');
      E.font.text(g, label, 22, 55 + k * 10, '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
    });
    E.font.text(g, rv.call === 'out' ? 'THE CALL: OUT' : 'THE CALL: NOT OUT', 12, 84, '#ffffff', { font: 'tiny', outline: '#0b0814' });
  });
};
// the umpire's signal, a move from the engine, for a wicket (the arm up) or a boundary (a sweep, or both arms for a six)
G.umpireSignal = null;
G.signalFor = ev => {
  if (ev === 'wicket') G.umpireSignal = { move: 'overhead', t: 1.1 };
  else if (ev === 'six') G.umpireSignal = { move: 'cast', t: 1.1 };
  else if (ev === 'four') G.umpireSignal = { move: 'cross', t: 1.0 };
};

// the umpire's own rig: his signals (the engine's moves) and his stance in between
G.umpireTick = (dt, match) => {
  const u = G.umpireRig();
  let attack = null;
  if (G.umpireSignal) {
    G.umpireSignal.t -= dt;
    if (G.umpireSignal.t <= 0) G.umpireSignal = null;
    else attack = E.move(G.umpireSignal.move, clamp(1 - G.umpireSignal.t / 1.1, 0, 1), 'active');
  }
  u.update(dt, { x: G.W.PX + 30, y: G.W.BOWL_CREASE + 24, z: 0, vx: 0, vy: 0, facing: PI / 2, attack });
};

/* ---- THE MATCH SCENE: the match running on the screen. It feeds the human inputs into the simulation, steps it, turns
 * its events into callouts, commentary, sound and camera, and draws the pitch, the players and the HUD. Every match
 * mode (Story, Quick Match, Versus, Nets, the Showdown, the hub round and the attract showreel) runs here. ---- */
G.startMatch = (cfg, opts = {}) => {
  G.cfg = cfg;
  G.match = new G.Match(cfg);
  G.frameRing = []; G.lastRec = -1;
  if (cfg.startHype) G.match.hype = cfg.startHype.slice();   // a lesson may start with a full meter
  G.matchOpts = opts;
  G.callouts = [];
  G.timing = null;
  G.swingPose = null;
  G.swingState = null;
  G.marker = { x: G.W.PX, y: G.W.BAT_CREASE + 70 };
  G.aimHeld = null;
  G.lastCfg = cfg;
  G.game.go('match', null, { fade: 'black', seconds: 0.25 });
};

G.say = (tag, vars) => {
  const pool = G.LINES[tag];
  if (!pool || G.devFlags.muteCommentary) return;
  const voices = [['A', pool.A], ['D', pool.D]].filter(([, l]) => l && l.length);
  if (!voices.length) return;
  const [who, lines] = voices[Math.floor(G.rng.cosmetic() * voices.length)];
  const text = G.fill(lines[Math.floor(G.rng.cosmetic() * lines.length)], vars || {});
  if (G.setting('captions') === 'On') G.talk && G.talk.say(text, { name: who === 'A' ? 'SIR AUBREY' : 'DAZZA', auto: 3, modal: false, alpha: .85, place: 'top', y: 40 });
  G.voice && G.voice.say(text, who === 'A' ? 'aubrey' : 'dazza');
};
G.fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? String(v[k]) : m));
G.callout = (text, color, secs = 0.9) => { G.callouts.unshift({ text, color, t: secs, max: secs }); if (G.callouts.length > 3) G.callouts.length = 3; };

G.matchNames = () => {
  const m = G.match, cfg = m.cfg;
  const a = G.TEAMS[cfg.teams[0]], b = G.TEAMS[cfg.teams[1]];
  return { a, b };
};

/* ---- the scene ---- */
G.scenes = G.scenes || {};
G.scenes.match = {
  pausable: true,
  view: 'broadcast',
  enter() {
    G.game.lights.enabled = true;
    G.game.lights.ambient = G.mapGround ? G.match.ground.ambient : 0.9;
    G.game.lights.dark = [18, 22, 40];
    G.game.lights.refresh && G.game.lights.refresh();
    G.game.setView(G.view);
    G.game.cam.smooth = 0.18;
    G.game.cam.bounds = null;
    G.game.cam.zoomLimit = null;
    G.makeWorld();
    G.game.audio.music(G.SONG_MATCH, { loop: true });
    G.talk = G.talk || new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#e8c070', speed: 60 });
    G.voice && G.voice.resume && G.voice.resume();
    G.match.cfg.onStart && G.match.cfg.onStart(G.match);
    G.game.debug = G.debugHandle;
    G.say('start', { ground: G.match.ground.name, team: G.TEAMS[G.match.cfg.teams[0]].name });
  },
  exit() {
    G.game.audio.music(null);
    G.game.lights.enabled = false;
    G.talk && G.talk.close && G.talk.close();
  },
  update(dt) {
    const m = G.match;
    const I = G.game.input;
    if (!m) return;
    // the dev panel takes the controls while it is open
    if (G.dev && G.dev.open) { G.dev.update(dt); return; }
    if (G.talk && G.talk.update(dt)) return;   // a modal line holds play
    if (G.matchOpts.attract) G.attractInput(I);
    const step = dt * G.T('timeScale');
    if (G.hubRound && G.hubRound.frozen) return;
    G.tickThirdUmpire(dt);
    if (G.replayTick(dt)) { G.drainEvents(); return; }   // the replay holds the play still
    G.humanInput(I, step);
    G.tickRigs(dt, m);
    G.recordFrame(m);
    // the simulation runs in fixed steps, scaled by the game speed and the slow-motion of a big moment
    const slow = G.slowT > 0 ? 0.35 : 1;
    if (G.slowT > 0) G.slowT -= dt;
    if (G.rainWait > 0) G.rainWait -= dt;
    if (m.phase !== 'end') m.update(step * slow);
    G.drainEvents();
    G.updateFx(dt);
    G.devApply();
    G.cameraFor(dt);
    if (m.phase === 'end') { if (!G.endQueued) { G.endQueued = true; G.endMatch(); } }
    if (G.matchOpts.onUpdate) G.matchOpts.onUpdate(dt);
  },
  draw(r) {
    const m = G.match;
    if (!m) return;
    r.sky(m.ground.sky);
    G.drawSky(r, m);
    if (G.replay) { r.sky(m.ground.sky); G.map.drawFloor(r); G.drawReplayFrame(r, G.replay); G.drawThirdUmpire(r); return; }
    G.map.drawFloor(r);
    G.drawTide(r, m);
    G.drawSightscreen(r);
    G.drawScenery(r, m);
    G.drawStumps(r, G.W.SY);
    G.drawStumps(r, G.W.BY);
    G.drawCrowd(r, m, G.game.time);
    G.drawTargets(r, m);
    G.drawItems(r, m);
    G.drawChaos(r, m);
    G.drawPeacock(r, m);
    G.drawNightLights(r, m);
    G.drawPlayers(r, m);
    G.drawMarker(r, m);
    G.ballFx(r, m);
    G.drawTrajectory(r, m);
    G.drawCatchRing(r, m);
    G.drawFireworks(r);
    G.drawFog(r, m);
    G.drawOwlEye(r, m);
    G.drawThirdUmpire(r);
    G.drawHUD(r, m);
    G.drawCallouts(r);
    if (G.talk) G.talk.draw(r);
    if (G.dev && G.dev.open) G.dev.draw(r);
    if (G.matchOpts.attract) G.attractDraw(r);
  }
};

/* ---- the human inputs: the batter, the non-striker's run calls, the bowler's marker and meter, the fielder's moves and throws ---- */
// the players on each side. Player 1 is Kerfuffle's first; in a 2 v 2 the second joined player is the Gentlemen's...
// (layout '1v1': P1 and P2 face each other; '2v2': P1 and P3 are side 0, P2 and P4 side 1; 'coop': P1 and P2 are side 0)
G.humansOf = side => {
  const P = G.game.players || [G.game.input];
  const L = G.layout || '1v1';
  if (P.length === 1) return [P[0]];   // one player takes whichever side the match makes human
  if (L === 'coop') return side === 0 ? P.slice(0, 2) : [];
  if (L === '2v2') return side === 0 ? [P[0], P[2]].filter(Boolean) : [P[1], P[3]].filter(Boolean);
  return side === 0 ? [P[0]] : (P[1] ? [P[1]] : []);
};
G.humanInput = (I, dt) => {
  const m = G.match;
  if (!m || m.phase === 'end') return;
  const hb = G.humansOf(m.battingSide), hw = G.humansOf(m.bowlingSide);
  const batter = m.humanBats() && hb.length ? hb[0] : null;
  const runner = m.humanBats() && hb.length > 1 ? hb[1] : null;      // the non-striker calls for runs too
  const bowler = m.humanBowls() && hw.length ? hw[m.I.over % hw.length] : null;
  const fielder = m.humanFields() && hw.length ? (hw.length > 1 ? hw[(m.I.over + 1) % hw.length] : hw[0]) : null;
  // the stick: the batter's aim (a batter-frame angle), the bowler's marker, or the fielder's steering
  const mg = G.game.mouseGround && G.game.mouseGround();
  if (batter) {
    const mv = batter.move();
    let aim = null;
    if (mg && G.game.input.mouse && G.mouseMoved(G.game.input)) {
      const sx = G.W.PX + 8, sy = G.W.BAT_CREASE;
      const dx = mg[0] - sx, dy = mg[1] - sy;
      if (Math.hypot(dx, dy) > 12) aim = Math.atan2(-dx * m.handOf(m.striker), dy) * 180 / PI;
    } else if (Math.hypot(mv[0], mv[1]) > 0.35) {
      const d = G.game.view.screenDirToGround(mv[0], mv[1]);
      aim = Math.atan2(-d[0] * m.handOf(m.striker), d[1]) * 180 / PI;
    }
    G.aimHeld = aim;
    if (m.phase === 'flight' && !m.pressed && !m.missed) {
      if (batter.pressed('shot')) m.batPress('shot', aim, null);
      else if (batter.pressed('loft')) m.batPress('loft', aim, null);
      else if (batter.pressed('block')) m.batPress('block', null, null);
      else if (batter.pressed('special') && m.hype[m.battingSide] >= 100) {
        // the striker's own special, or the Kerfuffle Shot for a player without one
        const sp = m.batSpecialOf(m.striker) || 'kfShot';
        m.spendHype(m.battingSide);
        m.batPress('loft', aim, sp);
        G.callout(G.SPECIALS[sp].name, '#ffd23a', 1.0);
      }
      if (batter.pressed('charge')) m.charge();
    }
    if (batter.pressed('run') && m.throwing) m.dive();
    if (batter.pressed('run')) m.callRun();
  }
  if (runner && runner.pressed('run')) m.callRun();
  if (bowler && m.phase === 'setup' && bowler.pressed('run')) {
    // R1 cycles the field: attacking, balanced, defensive, spin
    const k = G.PRESET_ORDER.indexOf(m.preset);
    m.preset = G.PRESET_ORDER[(k + 1) % G.PRESET_ORDER.length];
    m.placeFielders();
    G.callout(G.PRESET_LABEL[m.preset], '#ffe08a', 1.0);
  }
  if (bowler && m.phase === 'setup') {
    const mv = bowler.move();
    // the marker follows the stick (the mouse on the pitch wins while it moves)
    const mk = G.marker;
    if (mg && G.mouseMoved(G.game.input) && mg[1] > G.W.BAT_CREASE && mg[1] < G.W.BOWL_CREASE) { mk.x = clamp(mg[0], G.W.PX - 34, G.W.PX + 34); mk.y = clamp(mg[1], G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12); }
    else { mk.x = clamp(mk.x + mv[0] * 60 * dt, G.W.PX - 34, G.W.PX + 34); mk.y = clamp(mk.y + mv[1] * 80 * dt, G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12); }
    const fam = m.familyOf(m.I.bowler);
    const kit = G.BOWL_KIT[fam];
    const pick = (bowler.pressed('shot') && kit[0]) || (bowler.pressed('loft') && kit[1]) || (bowler.pressed('block') && kit[2]);
    if (pick) m.startRunup({ key: pick, target: { x: mk.x, y: mk.y }, cpu: false, fam });
    else if (bowler.pressed('special') && m.hype[m.bowlingSide] >= 100) {
      // the bowler's own special delivery, or the Kerfuffle Ball for a bowler without one
      const sp = m.bowlSpecialOf(m.I.bowler) || 'kfBall';
      m.hype[m.bowlingSide] = 0;
      m.startRunup({ key: 'express', target: { x: mk.x, y: mk.y }, cpu: false, fam, special: sp });
    }
  }
  if (bowler && m.phase === 'runup' && m.delivery && !m.delivery.cpu) {
    if (bowler.pressed('shot') || bowler.pressed('loft') || bowler.pressed('block')) m.bowlRelease();
  }
  // the aftertouch: the stick pushed sideways in the first quarter second after release
  if (bowler && m.phase === 'flight') { const mv = bowler.move(); if (Math.abs(mv[0]) > 0.4) m.aftertouch(mv[0]); }
  if (bowler && m.phase === 'dead' && bowler.pressed('special')) m.reviewPress();
  if (batter && m.phase === 'dead' && batter.pressed('special')) m.reviewPress();
  if (fielder && m.phase === 'play' || fielder && m.phase === 'flight') {
    const mv = fielder.move();
    m.fieldMove(mv[0], mv[1], dt);
    if (fielder.pressed('special') && m.hype[m.bowlingSide] >= 100) m.fieldSpecial();
    if (m.catchRing) { if (fielder.pressed('shot')) m.catchPress(); }
    else if (m.humanFieldHold) {
      if (fielder.pressed('shot')) m.fieldAct('A');
      else if (fielder.pressed('loft')) m.fieldAct('B');
      else if (fielder.pressed('block')) m.fieldAct('A');
    }
  }
};
G.mouseMoved = I => {
  const t = I.mouse && I.mouse.t;
  if (t === undefined) return false;
  if (G._mt === undefined) { G._mt = t; return false; }
  if (G._mt !== t) { G._mt = t; G._mouseAt = G.game.time; }
  return G._mouseAt !== undefined && G.game.time - G._mouseAt < 1.2;
};

/* ---- the events: callouts, commentary, sound, camera, the hype and the fire ---- */
G.drainEvents = () => {
  const m = G.match;
  for (const ev of m.drain()) {
    const d = ev.data;
    switch (ev.type) {
      case 'innings':
        G.callout(d.k === 0 ? 'FIRST INNINGS' : d.k === 1 ? 'SECOND INNINGS' : 'SUPER OVER', '#ffe08a', 1.4);
        if (d.target) G.say('target', { target: d.target });
        break;
      case 'release': G.game.audio.sfx('select', { vol: 0.2 }); break;
      case 'pitch': G.sfxSafe('pitch'); break;
      case 'contact': {
        G.sfxSafe(d.lofted ? 'batHigh' : 'bat');
        G.timing = { word: d.grade, t: 0.7, max: 0.7, grade: d.grade };
        if (d.grade === 'PERFECT') { G.sfxSafe('ring'); G.game.shake(2); G.flashAt = 0.12; }
        G.swingPose = { t: 0.22, dir: d.theta };
        break;
      }
      case 'edge': G.sfxSafe('edge'); G.callout('EDGE!', '#ffb0a0', 0.8); break;
      case 'beaten': G.callout('BEATEN!', '#c8c8d0', 0.6); G.say('beaten'); break;
      case 'boundary':
        G.signalFor(d.n === 6 ? 'six' : 'four');
        if (d.n === 6) G.requestReplay(3, 'SIX'); else if (G.setting('replays') === 'Always') G.requestReplay(1, 'FOUR');
        if (d.n === 6 && G.mapGround && G.mapGround.light === 'night') G.addFirework(d.x, d.y);
        if (d.n === 6) { G.callout('SIX!', '#ffd23a', 1.4); G.game.shake(4); G.game.flash('#ffe08a', 0.2, 0.6); G.say('six'); G.sfxSafe('six'); G.slowT = 0.6; }
        else { G.callout('FOUR!', '#7ad0ff', 1.1); G.say('four'); G.sfxSafe('four'); }
        G.crowdRoar(d.n);
        break;
      case 'third-umpire': G.thirdUmpire = { out: d.out, margin: d.margin, name: d.name, t: 0 }; G.callout('THIRD UMPIRE', '#9ad0ff', 1.2); break;
      case 'wicket': G.requestReplay(2, 'WICKET'); G.signalFor('wicket'); G.callout('WICKET!', '#ff6b6b', 1.4); G.sfxSafe('stumps'); G.game.shake(3); G.say(d.how === 'bowled' ? 'bowled' : d.how === 'caught' ? 'caught' : d.how === 'lbw' ? 'lbw' : 'runout'); break;
      case 'runout': G.callout('RUN OUT!', '#ff6b6b', 1.4); G.say('runout'); G.sfxSafe('stumps'); break;
      case 'catch': G.celebrate = { key: d.keeper ? 'keeper' : 'f' + d.id, t: 1.2 }; G.callout(d.screamer ? 'SCREAMER!' : 'CAUGHT!', '#ffffff', 1.1); G.say('caught'); G.sfxSafe('catch'); break;
      case 'catch:dropped': G.callout('DROPPED!', '#ffb0a0', 1.1); G.say('dropped'); break;
      case 'catch-ring': break;
      case 'appeal': G.callout('HOWZAT!', '#ffe08a', 1.1); G.voice && G.voice.say('HOWZAT!', 'players'); break;
      case 'dead': if (d.reason === 'wide') { G.say('wide'); G.callout('WIDE', '#ffe08a', 0.9); } if (d.reason === 'noball') { G.say('noball'); G.callout('NO BALL', '#ffe08a', 1.2); } if (d.reason === 'notout') G.callout('NOT OUT', '#ffffff', 1.1); break;
      case 'extra': break;
      case 'over': G.callout('OVER ' + d.n + ' - ' + d.runs + ' RUNS', '#ffffff', 1.2); break;
      case 'run': G.callout(d.n === 1 ? 'ONE' : d.n === 2 ? 'TWO' : d.n + ' RUNS', '#ffffff', 0.8); break;
      case 'running': G.sfxSafe('run'); break;
      case 'throw': G.sfxSafe('throw'); break;
      case 'gather': G.sfxSafe('gloves'); break;
      case 'hype:full': G.callout('KERFUFFLE! SPECIAL READY', '#ffd23a', 1.6); G.sfxSafe('hype'); G.crowdRoar(4); break;
      case 'fire:on': G.callout('ON FIRE!', '#ff8a3a', 1.6); G.sfxSafe('fire'); G.say('fire'); break;
      case 'fire:off': break;
      case 'bowl:fire': G.callout('BOWLER ON FIRE!', '#ff8a3a', 1.4); break;
      case 'special': G.requestReplay(2, 'SPECIAL'); G.sfxSafe('special'); G.callout(d.name, '#ffd23a', 1.6); G.say('special'); G.crowdRoar(4); break;
      case 'charge': G.callout('CHARGE!', '#ffe08a', 0.8); break;
      case 'dive': G.callout('DIVE!', '#ffe08a', 1.0); G.sfxSafe('run'); break;
      case 'pass-through': G.callout('THROUGH THE FIELDER!', '#c8f0ff', 1.0); break;
      case 'silver-tray': G.callout('SILVER TRAY SAVE!', '#ffe08a', 1.4); G.say('caught'); break;
      case 'bells': G.callout('CHURCH BELLS! +10 HYPE', '#ffe08a', 1.2); G.crowdRoar(3); break;
      case 'deflect': G.callout('DEFLECTED!', '#ffb0a0', 0.9); break;
      case 'byes': G.callout('BYES: ' + d.n, '#ffffff', 1.0); break;
      case 'target:hit': G.requestReplay(3, 'BONUS'); G.callout('KERFUFFLE BONUS +' + d.bonus, '#ffe08a', 1.6); G.sfxSafe('glass'); G.slowT = 0.4; G.say('pub', {}); G.crowdRoar(6); break;
      case 'item:spawn': G.callout('A TOKEN ON THE OUTFIELD', '#ffe08a', 1.0); break;
      case 'item:got': G.callout(G.ITEMS[d.id].name + ' ARMED', G.ITEMS[d.id].colour, 1.4); G.sfxSafe('coin'); break;
      case 'item:used': G.callout(d.id === 'teapot' ? 'GOLDEN TEAPOT - DOUBLE!' : d.id === 'horseshoe' ? 'THE HORSESHOE! NOT OUT!' : 'HYPE +40', '#ffe08a', 1.4); break;
      case 'chaos': if (d.id === 'fireworks') for (let k = 0; k < 3; k++) G.addFirework(G.W.PX + (G.rng.cosmetic() - 0.5) * 400, G.W.CY + (G.rng.cosmetic() - 0.5) * 300); G.callout(G.CHAOS[d.id].name, '#ffe08a', 2.2); G.say(d.id === 'cow' ? 'cow' : 'idle'); break;
      case 'rain:start': G.callout('RAIN STOPS PLAY', '#9ad0ff', 2.2); G.say('rain'); G.sfxSafe('rain'); break;
      case 'rain:end': break;
      case 'kerf-method': G.kerfCard = { t: 6, d }; G.callout('KERFUFFLE METHOD', '#9ad0ff', 2.6); break;
      case 'review': G.callout(d.won ? 'REVIEW: OVERTURNED!' : 'REVIEW: LOST', d.won ? '#5fd38a' : '#ff6b6b', 1.8); G.say('review'); break;
      case 'innings:end': G.callout('INNINGS OVER', '#ffe08a', 1.2); break;
      case 'match:end': G.endQueued = false; break;
      case 'ball': G.lastBall = d; break;
    }
  }
};
// the replay's record: every 1/30 s, the ball and every player's state, so the rigs can be posed again
G.recordFrame = m => {
  if (!m || m.t - G.lastRec < 1 / 30 || !m.ball) return;
  G.lastRec = m.t;
  const players = G.playersNow(m).map(p => ({ key: p.key, side: p.side, idx: p.idx, x: p.x, y: p.y, facing: p.facing, role: p.role, bat: !!p.bat, ghost: !!p.ghost, intangible: !!p.intangible }));
  G.frameRing.push({ ball: [m.ball.x, m.ball.y, m.ball.z], players });
  if (G.frameRing.length > 300) G.frameRing.shift();
};
G.sfxSafe = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* the sound is optional */ } };
G.crowdRoar = n => { G.crowdLevel = Math.min(1, (G.crowdLevel || 0) + n / 10); G.crowdRoarFor(n); };
G.updateFx = dt => {
  for (const c of G.callouts) c.t -= dt;
  G.callouts = G.callouts.filter(c => c.t > 0);
  if (G.timing) { G.timing.t -= dt; if (G.timing.t <= 0) G.timing = null; }
  if (G.swingPose) { G.swingPose.t -= dt; if (G.swingPose.t <= 0) G.swingPose = null; }
  if (G.kerfCard) { G.kerfCard.t -= dt; if (G.kerfCard.t <= 0) G.kerfCard = null; }
  G.crowdLevel = Math.max(0, (G.crowdLevel || 0) - dt * 0.4);
  G.fireworks.forEach(f => { f.t -= dt; });
  G.fireworks = G.fireworks.filter(f => f.t > 0);
  if (G.celebrate) { G.celebrate.t -= dt; if (G.celebrate.t <= 0) G.celebrate = null; }
  G.flashAt = Math.max(0, (G.flashAt || 0) - dt);
  // the swing: the bat angle sweeps from the stance through the contact
  const m = G.match;
  if (G.swingPose && m) {
    const k = 1 - G.swingPose.t / 0.22;
    // the blade's direction for the shot's line (batter's frame: x = -sin, y = cos), swept through the contact
    const th = G.swingPose.dir * PI / 180;
    G.swingPose.angle = Math.atan2(Math.cos(th), -Math.sin(th)) + (1 - k) * 0.7 - 0.35;
    G.swingPose.lift = 10 * Math.sin(Math.min(1, k) * PI);
    G.swingState = { u: clamp(k, 0, 1) };
  } else { G.swingState = null; }
};
G.cameraFor = dt => {
  const m = G.match, g = G.game;
  let fx = G.W.PX, fy = G.W.CY - 30, z = 0;
  if (m.ball && (m.phase === 'play' || m.phase === 'flight') && m.ball.carried && m.ball.z > 25) {
    const ex = m.ball.x - G.W.PX, ey = m.ball.y - G.W.CY;
    fx = G.W.PX + ex * 0.4; fy = G.W.CY + ey * 0.4; z = 0;
  }
  g.focus(fx, fy, z);
  // the wide view follows a lofted ball round the ground; the broadcast view for the rest
  const want = (m.phase === 'play' && m.ball && m.ball.carried && m.ball.z > 25) ? G.wideView : G.view;
  if (g.view !== want) g.setView(want);
};
G.endMatch = () => {
  G.game.after(1.6, () => G.matchEnded && G.matchEnded(G.match));
};

/* ---- the HUD: score, overs, the batters and the bowler, the meter, prompts, callouts and the catch ring ---- */
G.drawHUD = (r, m) => {
  const I = m.I;
  const cw = r.W, ch = r.H;
  const bat = G.TEAMS[m.cfg.teams[m.battingSide]];
  const bowl = G.TEAMS[m.cfg.teams[m.bowlingSide]];
  r.overlay(g => {
    // the score bug, top left
    E.ui.box(g, 3, 3, 96, 30, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    px.rect(g, 6, 6, 3, 24, bat.chip);
    E.font.text(g, bat.id, 12, 6, '#ffffff', { outline: '#0b0814' });
    E.font.text(g, I.runs + '/' + I.wkts, 12, 15, '#ffe08a', { scale: 2, outline: '#0b0814' });
    E.font.text(g, G.oversText(I), 66, 19, '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
    if (I.target !== null) {
      const need = I.target - I.runs, left = (I.overs * 6) - I.legal;
      const txt = need > 0 ? 'NEED ' + need + ' FROM ' + left : 'TARGET ' + I.target;
      E.font.text(g, txt, 6, 36, need > 0 && need <= left * 1.5 ? '#ffe08a' : '#ff8a8a', { font: 'tiny', outline: '#0b0814' });
    }
    // this over, top right
    const ov = m.log.filter(x => x.inn === I.k && x.over === I.over).slice(-6);
    const ox = cw - 6 - 6 * 9;
    E.ui.box(g, ox - 4, 3, 6 * 9 + 6, 14, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    for (let i = 0; i < 6; i++) {
      const rec = ov[i];
      const x = ox + i * 9, col = !rec ? '#2a2634' : rec.reason === 'wicket' || rec.reason === 'runout' ? '#ff6b6b' : rec.reason === 'boundary' ? (rec.ballRuns === 6 ? '#ffd23a' : '#7ad0ff') : rec.legal ? (rec.ballRuns ? '#f4f4f0' : '#8a8a9a') : '#c8a050';
      px.disc(g, x + 4, 10, 3, col);
      const t = !rec ? '' : rec.reason === 'wicket' ? 'W' : rec.reason === 'wide' ? 'w' : rec.reason === 'noball' ? 'n' : rec.reason === 'boundary' ? String(rec.ballRuns) : rec.ballRuns ? String(rec.ballRuns) : '•';
      if (t) E.font.text(g, t, x + 4 - E.font.width(t, { font: 'tiny' }) / 2, 7, '#0b0814', { font: 'tiny' });
    }
    // the batters and the bowler
    const st = m.striker, ns = m.nonStriker;
    if (st) {
      E.ui.box(g, 3, ch - 30, 116, 27, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
      E.font.text(g, m.batterName(st) + (st.out ? '' : '*'), 7, ch - 27, '#ffffff', { font: 'tiny', outline: '#0b0814' });
      E.font.text(g, st.runs + ' (' + st.balls + ')' + (ns ? '  ' + m.batterName(ns).split(' ').pop() + ' ' + ns.runs : ''), 7, ch - 18, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    }
    E.ui.box(g, cw - 120, ch - 30, 117, 27, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.85 });
    E.font.text(g, m.bowlerName(), cw - 116, ch - 27, '#ffffff', { font: 'tiny', outline: '#0b0814' });
    const bo = m.log.filter(x => x.inn === I.k && x.bowler === m.bowlerName());
    const bruns = bo.reduce((s, x) => s + (x.ballRuns || 0), 0), bwk = bo.filter(x => x.reason === 'wicket' || x.reason === 'runout').length;
    E.font.text(g, (I.over) + '.' + I.ballInOver + ' OV  ' + bwk + '-' + bruns, cw - 116, ch - 18, '#c8e0ff', { font: 'tiny', outline: '#0b0814' });
    // the Kerfuffle meter, bottom centre
    const hyp = m.hype[m.battingSide];
    const hb = m.hype[m.bowlingSide];
    const mw = 120, mx = Math.round(cw / 2 - mw / 2), my = ch - 14;
    E.ui.bar(g, mx, my, mw, 6, Math.max(hyp, hb) / 100, m.hype[m.battingSide] >= 100 || m.hype[m.bowlingSide] >= 100 ? '#ffd23a' : '#7a5ad0');
    E.font.text(g, 'KERFUFFLE', mx + mw / 2, my - 9, '#e8e0f0', { font: 'tiny', align: 'center', outline: '#0b0814' });
    if (m.hype[m.battingSide] >= 100 || m.hype[m.bowlingSide] >= 100) {
      G.promptRow(g, [['special', 'SPECIAL']], mx - 40, my + 9);
    }
    if (m.fire[m.battingSide]) E.font.text(g, 'ON FIRE', cw / 2, my + 12, '#ff8a3a', { font: 'tiny', align: 'center', outline: '#0b0814' });
    if (m.freeHit) E.font.text(g, 'FREE HIT', cw / 2, 28, '#ffd23a', { font: 'tiny', align: 'center', outline: '#0b0814' });
    // the timing word, over the batter
    if (G.timing && G.setting('timingWords') === 'On') {
      const col = G.timing.grade === 'PERFECT' ? '#ffd23a' : G.timing.grade === 'GOOD' ? '#5fd38a' : G.timing.grade === 'MISS' ? '#8a8a9a' : '#ff9a6a';
      E.font.text(g, G.timing.word, cw / 2, ch / 2 - 40, col, { scale: 2, align: 'center', outline: '#0b0814' });
    }
    // the bowler's meter, while the run-up runs
    if (m.phase === 'runup' && m.delivery && !m.delivery.cpu && m.delivery.t > m.delivery.dur - 0.7) {
      const u = m.delivery.meter;
      const bw2 = 140, bx = Math.round(cw / 2 - bw2 / 2), by = ch - 34;
      px.rect(g, bx - 1, by - 1, bw2 + 2, 11, '#0b0814');
      const sweet = G.T('meterSweet');
      px.rect(g, bx + Math.round(bw2 * (0.5 - sweet / 2)), by, Math.round(bw2 * sweet), 9, '#5fd38a');
      px.rect(g, bx + Math.round(bw2 * u) - 1, by - 2, 3, 13, '#ffffff');
      E.font.text(g, 'RELEASE', cw / 2, by - 9, '#ffffff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    }
    // the delivery panel for a bowler, the batter's prompts, the fielder's prompts
    const items = [];
    if (m.humanBats() && (m.phase === 'flight' || m.phase === 'play')) {
      if (m.phase === 'flight' && !m.pressed) items.push(['shot', 'GROUND'], ['loft', 'LOFT'], ['block', 'DEFEND']);
      if (m.phase === 'play' && m.runs && !m.runs.active) items.push(['run', 'RUN']);
      if (m.phase === 'play' && m.runs && m.runs.active) items.push(['run', 'AGAIN']);
      if (m.hype[m.battingSide] >= 100) items.push(['special', 'SPECIAL']);
    }
    if (m.humanBowls() && m.phase === 'setup' && !m.delivery) {
      const fam = m.familyOf(m.I.bowler), kit = G.BOWL_KIT[fam];
      items.push(['shot', G.DELIVERIES[kit[0]].label], ['loft', G.DELIVERIES[kit[1]].label], ['block', G.DELIVERIES[kit[2]].label]);
      if (m.hype[m.bowlingSide] >= 100) items.push(['special', 'SPECIAL']);
    }
    if (m.humanBowls() && m.phase === 'runup') items.push(['shot', 'RELEASE']);
    if (m.humanField() && m.humanFieldHold) items.push(['shot', 'STRIKER END'], ['loft', 'BOWLER END']);
    if (m.catchRing) items.push(['shot', 'CATCH!']);
    if (m.phase === 'dead' && m.reviewable && m.review[m.reviewable.side] > 0) items.push(['special', 'REVIEW']);
    if (items.length) {
      G.promptRow(g, items, 8, ch - 42);
    }
    if (G.lastBall && m.phase === 'setup') E.font.text(g, 'OVER ' + m.I.over + '.' + m.I.ballInOver + ' - ' + G.oversText(m.I), cw - 6, 36, '#e8e0f0', { font: 'tiny', align: 'right', outline: '#0b0814' });
    if (G.kerfCard) {
      const d = G.kerfCard.d;
      E.ui.box(g, cw / 2 - 90, 60, 180, 58, { bg: ['#1d3a4a', '#0b1a22'], alpha: 0.92 });
      E.font.text(g, 'THE KERFUFFLE METHOD', cw / 2, 66, '#ffe08a', { font: 'tiny', align: 'center', outline: '#0b0814' });
      E.font.text(g, 'first ' + d.first + ' - target ' + d.after, cw / 2, 80, '#ffffff', { font: 'tiny', align: 'center', outline: '#0b0814' });
      E.font.text(g, 'carry the scone...', cw / 2, 94, '#c8e0ff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    }
  });
};
G.oversText = I => I.over + '.' + I.ballInOver + ' ov' + (I.overs ? '/' + I.overs : '');
G.drawCallouts = r => {
  r.overlay(g => {
    let y = 100;
    for (const c of G.callouts.slice(0, 2)) {
      const sc = c.t > c.max - 0.2 ? 3 : 2;
      E.font.text(g, c.text, r.W / 2, y, c.color, { scale: sc, align: 'center', outline: '#0b0814' });
      y += 22;
    }
  });
};
G.drawCatchRing = (r, m) => {
  const R = m.catchRing;
  if (!R) return;
  const b = r.w(R.f.x, R.f.y, 22);
  r.overlay(g => {
    const rad = 2 + 16 * clamp(R.t / R.total, 0, 1);
    const pts = [];
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push([b[0] + Math.cos(a) * rad, b[1] + Math.sin(a) * rad * 0.6]); }
    for (let i = 0; i < 24; i++) { const p = pts[i], q = pts[(i + 1) % 24]; px.line(g, p[0], p[1], q[0], q[1], '#5fd38a', 1); }
    px.disc(g, b[0], b[1], 2, '#ffffff');
  });
};
G.drawTargets = (r, m) => {
  for (const tg of m.ground.targets) {
    const hit = m.targetsHit[tg.id];
    r.queue(tg.x, tg.y, 0, g => {
      const p = r.w(tg.x, tg.y, tg.z);
      px.rect(g, p[0] - 5, p[1] - 9, 10, 9, hit ? '#3a3a44' : tg.colour);
      px.rect(g, p[0] - 4, p[1] - 8, 3, 3, hit ? '#1a1a22' : '#ffffff');
      if (!hit) E.font.text(g, '+' + tg.bonus, p[0] - 6, p[1] - 17, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    }, { bias: 0 });
  }
};
G.drawItems = (r, m) => {
  for (const side of [0, 1]) {
    const it = m.items[side];
    if (!it || side !== m.battingSide) continue;
    const pos = r.w(it.x, it.y, 6);
    r.queue(it.x, it.y, 0, g => {
      const bob = Math.sin(G.game.time * 4) * 2;
      px.disc(g, pos[0], pos[1] - 3 + bob, 4, G.ITEMS[it.id].colour);
      px.disc(g, pos[0] - 1, pos[1] - 4 + bob, 1, '#ffffff');
    }, { bias: 0, emissive: true });
  }
};
G.drawSky = (r, m) => {
  // the sun or the cloud, drawn in the sky band over the far stands
  if (m.ground.overcast) {
    r.overlay(g => { px.rect(g, 0, 0, r.W, Math.round(r.H * 0.06), '#7a8496'); });
  }
};
G.SONG_MATCH = { bpm: 140, steps: 4, tracks: [
  { wave: 'square', vol: .07, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };

/* ---- THE FRONT END: the title, the setup rows, the toss, the story map and its dialogue, the results with the Wisden-
 * style report, the About and Credits pages, Nets and the Super Over Showdown. Every screen has at most six choices,
 * big type, and a footer of prompts that follow the device. ---- */
// the profile: story progress, the teams unlocked (the first two start open; a Quick Match win unlocks the other side),
// and the career stats (sixes hit, the fastest ball bowled). A save that can't be read gives a new profile.
G.profileDefaults = () => ({ v: 1, chapter: 1, stars: [0, 0, 0], best: {}, unlocks: [0, 1], stats: { sixes: 0, fastest: 0 } });
G.profile = () => {
  const p = E.store.get('kerfuffle:profile', null);
  if (!p || p.v !== 1) return G.profileDefaults();
  return Object.assign(G.profileDefaults(), p, { stats: Object.assign({ sixes: 0, fastest: 0 }, p.stats || {}) });
};
G.unlockedTeams = () => { const u = G.profile().unlocks; return G.TEAMS.map((_, i) => i).filter(i => u.includes(i)); };
// a finished match adds its sixes and fastest ball to the career, and a Quick Match win unlocks the other side
G.recordMatch = m => {
  const P = G.profile();
  P.stats.sixes += m.stats.sixes || 0;
  P.stats.fastest = Math.max(P.stats.fastest || 0, m.fastestKmh || 0);
  if (G.setupState && G.setupState.mode === 'quick' && m.result && m.result.winner === 0 && !P.unlocks.includes(m.cfg.teams[1])) P.unlocks.push(m.cfg.teams[1]);
  G.saveProfile(P);
};
G.saveProfile = p => E.store.set('kerfuffle:profile', p);
G.touchOnly = () => {
  const mm = typeof matchMedia === 'function' ? matchMedia('(any-pointer: fine)') : null;
  const touchy = !!(mm && !mm.matches && (navigator.maxTouchPoints || 0) > 0);
  return touchy && !G.nonTouchSeen;
};
G.footer = (r, items) => {
  r.overlay(g => {
    px.rect(g, 0, r.H - 13, r.W, 13, '#0b0814');
    G.promptRow(g, items, 6, r.H - 10);
  });
};
// a row menu: rows of label and values, left and right change a value, up and down move, confirm acts
G.rowMenu = (rows, o = {}) => ({
  rows, i: 0, t: 0,
  update(I, dt) {
    const up = I.pressed('up'), down = I.pressed('down'), left = I.pressed('left'), right = I.pressed('right');
    if (up) this.i = (this.i + rows.length - 1) % rows.length;
    if (down) this.i = (this.i + 1) % rows.length;
    const row = rows[this.i];
    if (row.values && (left || right)) { const n = row.values.length; row.idx = ((row.idx || 0) + (right ? 1 : n - 1)) % n; if (row.onChange) row.onChange(row.values[row.idx], row.idx); G.game.audio.sfx('select', { vol: .3 }); }
    if (I.pressed('confirm') && row.act) { I.consumeAll(); row.act(); return true; }
    if (I.pressed('cancel') && o.back) { I.consumeAll(); o.back(); return true; }
    return false;
  },
  draw(r, x, y) {
    rows.forEach((row, k) => {
      const yy = y + k * 17, sel = k === this.i;
      r.overlay(g => {
        if (sel) { px.rect(g, x - 6, yy - 3, r.W - (x - 6) * 2, 15, '#2f2a52'); px.rect(g, x - 6, yy - 3, 2, 15, '#ffd23a'); }
        E.font.text(g, row.label, x, yy, sel ? '#ffe08a' : '#e8e0f0', { outline: '#0b0814' });
        if (row.values) E.font.text(g, (sel ? '< ' : '') + row.values[row.idx || 0] + (sel ? ' ▸' : ''), r.W - x, yy, sel ? '#ffffff' : '#c8c0e0', { align: 'right', outline: '#0b0814' });
      });
    });
  }
});

/* ---- TITLE: the village green at golden hour, the menu, and the attract timer ---- */
G.scenes.title = {
  view: 'side',
  enter() {
    G.game.lights.enabled = false;
    G.game.setView('side');
    G.game.follow(null);
    G.game.audio.music(G.SONG_TITLE);
    G.idle = 0;
    G.menu = new E.Menu(G.game, [
      { label: 'STORY', disabled: false }, 'QUICK MATCH', 'VERSUS', 'SUPER OVER SHOWDOWN', 'NETS', 'EXTRAS'
    ], { x: 'center', y: 96, onPick: i => G.titlePick(i), onCancel: () => {} });
    G.menu.sound = true;
  },
  update(dt) {
    const I = G.game.input;
    if (I.anyPressed() && I.lastDevice !== 'touch') G.nonTouchSeen = true;
    const busy = I.anyPressed() || (I.mouse && G.mouseMoved(I));
    if (busy) G.idle = 0; else G.idle += dt;
    if (G.idle >= 10 && !G.touchOnly()) { G.game.go('attract', null, { fade: 'black', seconds: 0.4 }); return; }
    if (G.touchOnly()) { if (G.idle >= 10) { G.game.go('attract', null, { fade: 'black', seconds: 0.4 }); return; } return; }
    G.menu.update(dt);
  },
  draw(r) {
    G.drawTitleScene(r, G.game.time);
    if (G.touchOnly()) {
      r.overlay(g => {
        E.ui.box(g, r.W / 2 - 110, r.H / 2 - 44, 220, 88, { bg: ['#1a1a2e', '#0b0814'], alpha: 0.95 });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 30, '#ffe08a', { align: 'center', outline: '#0b0814', wrap: 200 });
        E.font.text(g, 'This game is played with a pad or keys.', r.W / 2, r.H / 2 - 4, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
        E.font.text(g, 'SETTINGS', r.W / 2, r.H / 2 + 22, '#ffffff', { align: 'center', outline: '#0b0814' });
      });
      return;
    }
    G.menu.draw(r);
    G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]);
    r.overlay(g => {
      E.font.text(g, G.VERSION_LINE, 4, 4, '#8a84a8', { font: 'tiny', outline: '#0b0814' });
      if (Math.floor(G.game.time * 2) % 2) E.font.text(g, 'PRESS ' + (G.game.input.label('shot') || 'ENTER').toUpperCase(), r.W / 2, r.H - 26, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
  }
};
G.VERSION_LINE = 'KERFUFFLE v' + G.VERSION + ' - MY-3D2DGE 0.85.2';
G.titlePick = i => {
  G.game.audio.sfx('confirm');
  if (i === 0) return G.openStory();
  if (i === 1) return G.game.go('setup', { mode: 'quick' });
  if (i === 2) return G.game.go('setup', { mode: 'versus' });
  if (i === 3) return G.game.go('showdown');
  if (i === 4) return G.game.go('nets');
  if (i === 5) return G.game.go('extras');
};
// the title's art: the green, a pavilion, a batter, the cow, and the logo
G.drawTitleScene = (r, t) => {
  r.sky(['#8fc4ff', '#ffe6b0']);
  r.overlay(g => {
    px.rect(g, 0, Math.round(r.H * 0.55), r.W, r.H, '#5e9c3e');
    for (let x = 0; x < r.W; x += 24) px.rect(g, x, Math.round(r.H * 0.55) + 2, 12, r.H, '#6fae4a');
    px.rect(g, 0, Math.round(r.H * 0.55) - 2, r.W, 2, '#ffffff');
    // the pavilion, the tree and the church
    px.rect(g, r.W - 96, Math.round(r.H * 0.36), 80, 40, '#e8e0d0');
    px.rect(g, r.W - 98, Math.round(r.H * 0.34), 84, 6, '#8a2a2a');
    px.rect(g, r.W - 60, Math.round(r.H * 0.42), 14, 18, '#2f6b3a');
    px.disc(g, 40, Math.round(r.H * 0.38), 22, '#2f6b3a');
    px.rect(g, 38, Math.round(r.H * 0.38), 4, 22, '#6a4a2a');
    px.rect(g, 180, Math.round(r.H * 0.3), 10, 30, '#f2ead8');
    px.rect(g, 178, Math.round(r.H * 0.3) - 6, 14, 6, '#8a2a2a');
  });
  r.overlay(g => {
    E.font.title(g, 'CRICKET', r.W / 2, 14, { scale: 3, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a', align: 'center' });
    E.font.title(g, 'KERFUFFLE', r.W / 2, 42, { scale: 2, colors: ['#f4fff4', '#8ad8a8', '#2f6b3a'], outline: '#0b1a10', depth: 2, depthColor: '#14301c', align: 'center' });
    E.font.text(g, 'an over-the-top arcade cricket game, with tea', r.W / 2, 66, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
  // the batter knocking up: a stick figure of a batter, animated by the sine of time
  r.overlay(g => {
    const bx = r.W - 150, by = Math.round(r.H * 0.6), sw = Math.sin(t * 2) * 6;
    px.rect(g, bx, by - 22, 4, 22, '#c8b8a0');
    px.rect(g, bx + 4, by - 16, 8, 3, '#f2ead8');
    px.line(g, bx + 8, by - 14, bx + 22 + sw, by - 4, '#6b4a28', 2);
    px.line(g, bx + 14, by - 22, bx + 22 + sw, by - 16, '#e8d8a8', 3);
  });
};

/* ---- EXTRAS: settings, about and credits ---- */
G.scenes.extras = {
  enter() { G.extrasMenu = new E.Menu(G.game, ['SETTINGS', 'ABOUT AND CREDITS'], { x: 'center', y: 110, onPick: i => { if (i === 0) G.game.menu('settings'); else G.game.go('about', { page: 0 }); }, onCancel: () => G.game.go('title') }); },
  update(dt) { if (G.game.input.pressed('cancel')) { G.game.input.consumeAll(); return G.game.go('title'); } G.extrasMenu.update(dt); },
  draw(r) { r.sky(['#2a2052', '#4a3a72']); r.overlay(g => E.font.title(g, 'EXTRAS', r.W / 2, 30, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' })); G.extrasMenu.draw(r); G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]); }
};

/* ---- SETUP: the match rows for a Quick Match or a Versus, then the toss ---- */
G.scenes.setup = {
  enter(data) {
    const mode = data && data.mode || 'quick';
    // a Quick Match opponent must be unlocked; a Versus has every side
    const open = mode === 'quick' ? G.unlockedTeams() : G.TEAMS.map((_, i) => i);
    const teamVals = G.TEAMS.map(t => t.name);
    G.setupState = { mode, home: 0, away: open.find(i => i !== 0) !== undefined ? open.find(i => i !== 0) : 0, ground: 0, overs: Math.max(0, ['1', '2', '3', '5'].indexOf(G.setting('overs'))), wkts: Math.max(0, ['2', '3', '5', '10'].indexOf(String(G.setting('wickets')))), bat: 0, p2: false, layout: 0 };
    const S = G.setupState;
    G.setupRows = G.rowMenu([
      { label: 'HOME', values: teamVals, idx: S.home, onChange: (v, k) => { S.home = k; if (S.away === k) S.away = (k + 1) % G.TEAMS.length; } },
      { label: 'AWAY', values: open.map(i => teamVals[i]), idx: Math.max(0, open.indexOf(S.away)), onChange: (v, k) => { S.away = open[k]; if (S.home === S.away) S.home = (S.away + 1) % G.TEAMS.length; } },
      { label: 'GROUND', values: G.GROUND_ORDER.map(g => G.GROUNDS[g].name), idx: 0, onChange: (v, k) => { S.ground = k; } },
      { label: 'OVERS', values: ['1', '2', '3', '5'], idx: S.overs, onChange: (v, k) => { S.overs = k; } },
      { label: 'WICKETS', values: ['2', '3', '5', '10'], idx: S.wkts, onChange: (v, k) => { S.wkts = k; } },
      { label: 'TEAMS', values: ['1 v 1', '2 v 2', 'CO-OP'], idx: S.layout, onChange: (v, k) => { S.layout = k; } },
      { label: 'DIFFICULTY', values: ['County', 'Village', 'Test', 'Kerfuffle!'], idx: Math.max(0, ['County', 'Village', 'Test', 'Kerfuffle!'].indexOf(G.setting('difficulty'))), onChange: (v) => { game.settings.set('difficulty', v); } },
      { label: 'KERFUFFLE RULES', values: ['On', 'Off'], idx: G.setting('kerfRules') === 'Off' ? 1 : 0, onChange: (v) => { game.settings.set('kerfRules', v); } },
      { label: mode === 'versus' ? 'PLAYER 2: PRESS START TO JOIN' : 'START MATCH', act: () => G.setupStart(mode) },
      { label: 'BACK', act: () => G.game.go('title') }
    ], { back: () => G.game.go('title') });
    G.setupRows.i = 0;
    // a second player may join the Versus for the Gentlemen's side
    G.game.allowJoin({ max: 4, onJoin: (input, n) => { S.p2 = n >= 2; } });
  },
  exit() { G.game.allowJoin(false); },
  update(dt) {
    const I = G.game.input;
    G.setupRows.update(I, dt);
  },
  draw(r) {
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => E.font.title(g, G.setupState.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
    G.setupRows.draw(r, 24, 50);
    G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]);
  }
};
G.setupStart = mode => {
  const S = G.setupState;
  const home = S.home, away = S.away === S.home ? (S.home + 1) % G.TEAMS.length : S.away;
  const overs = [1, 2, 3, 5][S.overs];
  const wk = [2, 3, 5, 10][S.wkts];
  // the layout: 1 v 1 has a second human for the Gentlemen's side; 2 v 2 has two a side; co-op is two against the CPU
  const layout = ['1v1', '2v2', 'coop'][S.layout];
  G.layout = layout;
  // a side is human only where a player has joined it (the first player is always Kerfuffle's)
  const P = G.game.players || [G.game.input];
  const humanSides = layout === 'coop' ? [0] : (P.length >= 2 ? [0, 1] : [0]);
  G.game.go('toss', { cfg: { teams: [home, away], ground: G.GROUND_ORDER[S.ground], overs, wickets: wk, kerf: G.setting('kerfRules') !== 'Off', seed: 1000 + (G.game.time * 1000 | 0) % 9000, humanSides, mode } });
};

/* ---- THE TOSS: call heads or tails with the coin; the winner bats or bowls ---- */
G.scenes.toss = {
  enter(data) {
    G.tossCfg = data.cfg;
    G.tossStage = 'call'; G.tossT = 0; G.tossResult = null;
    G.tossRng = E.rng(G.tossCfg.seed + 3);
  },
  update(dt) {
    const I = G.game.input;
    G.tossT += dt;
    if (G.tossStage === 'call' && (I.pressed('shot') || I.pressed('block'))) {
      G.tossChoice = I.pressed('shot') ? 'heads' : 'tails';
      G.tossStage = 'flip'; G.tossT = 0; I.consumeAll();
    } else if (G.tossStage === 'flip' && G.tossT > 1.6) {
      const heads = G.tossRng() < 0.5;
      G.tossWon = (heads ? 'heads' : 'tails') === G.tossChoice;
      G.tossStage = 'result'; G.tossT = 0;
      G.game.audio.sfx('coin');
    } else if (G.tossStage === 'result' && G.tossT > 0.6) {
      const humanWins = G.tossWon;
      if (!humanWins) { G.tossStage = 'cpu'; G.tossT = 0; G.tossCpuBat = G.GROUNDS[G.tossCfg.ground].overcast ? false : true; }
      else G.tossStage = 'choose';
    } else if (G.tossStage === 'cpu' && G.tossT > 1.6) {
      G.startTossMatch(!G.tossCpuBat);
    } else if (G.tossStage === 'choose') {
      if (I.pressed('shot')) G.startTossMatch(true);
      else if (I.pressed('block')) G.startTossMatch(false);
    }
  },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    const cfg = G.tossCfg;
    const home = G.TEAMS[cfg.teams[0]], away = G.TEAMS[cfg.teams[1]];
    r.overlay(g => {
      E.font.title(g, 'THE TOSS', r.W / 2, 16, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, home.name + ' v ' + away.name, r.W / 2, 50, '#ffffff', { align: 'center', outline: '#0b0814' });
      const coin = G.tossStage === 'flip' ? (Math.floor(G.tossT * 12) % 2 ? 'HEADS' : 'TAILS') : G.tossStage === 'result' ? (G.tossWon ? G.tossChoice : G.tossChoice === 'heads' ? 'tails' : 'heads').toUpperCase() : '';
      if (G.tossStage === 'call') E.font.text(g, 'CALL IT: ' + (G.game.input.label('shot') || 'J') + ' HEADS  ' + (G.game.input.label('block') || 'L') + ' TAILS', r.W / 2, r.H / 2 - 10, '#ffe08a', { align: 'center', outline: '#0b0814' });
      if (coin) E.font.text(g, coin, r.W / 2, r.H / 2 - 10, '#ffffff', { scale: 2, align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'result') E.font.text(g, G.tossWon ? 'YOU WON THE TOSS' : 'THE CPU WON THE TOSS', r.W / 2, r.H / 2 + 14, '#ffffff', { align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'choose') E.font.text(g, 'BAT   ' + (G.game.input.label('shot') || 'J') + '        BOWL   ' + (G.game.input.label('block') || 'L'), r.W / 2, r.H / 2 + 14, '#ffe08a', { align: 'center', outline: '#0b0814' });
      if (G.tossStage === 'cpu') E.font.text(g, G.tossCpuBat ? 'THE CPU BATS FIRST' : 'THE CPU BOWLS FIRST', r.W / 2, r.H / 2 + 14, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
    G.footer(r, [['shot', 'HEADS'], ['block', 'TAILS']]);
  }
};
G.startTossMatch = humanBats => {
  const cfg = Object.assign({}, G.tossCfg);
  cfg.batFirst = humanBats ? 0 : 1;
  if (cfg.humanSides && cfg.humanSides.indexOf(0) < 0) cfg.humanSides = [0];
  // the match's batting order: the side batting first is the one that won the bat or bowl choice
  if (!humanBats) cfg.batFirst = 1;
  G.startMatch(cfg, {});
};

/* ---- STORY: the map of the Grand Kerfuffle: three chapters, the prologue, the endings ---- */
G.openStory = () => {
  const P = G.profile();
  if (P.started && (P.chapter > 1 || P.stars.some(x => x > 0))) return G.game.go('storychoice');   // a saved story: Continue or New Game
  if (!P.started) { P.started = true; G.saveProfile(P); G.game.go('cutscene', { lines: G.STORY_PROLOGUE, then: 'story' }); return; }
  G.game.go('story');
};
// a new story clears the campaign progress (chapters and stars) and keeps the profile's unlocks and stats
G.resetStory = () => { const P = G.profile(); P.started = false; P.chapter = 1; P.stars = G.CHAPTERS.map(() => 0); G.saveProfile(P); };
const storyFrame = (r, sub) => {
  r.sky(['#8fc4ff', '#ffe6b0']);
  r.overlay(g => {
    E.font.title(g, 'THE GRAND KERFUFFLE', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
    E.font.text(g, sub, r.W / 2, 58, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
};
G.scenes.storychoice = {
  enter() {
    G.storyChoice = new E.Menu(G.game, ['CONTINUE', 'NEW GAME', 'BACK'], { x: 'center', y: 96, onPick: i => {
      if (i === 0) return G.game.go('story');
      if (i === 1) return G.game.go('storynew');
      return G.game.go('title');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.storyChoice.update(dt); },
  draw(r) { storyFrame(r, 'A saved story was found.'); G.storyChoice.draw(r); G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]); }
};
G.scenes.storynew = {
  enter() {
    G.storyChoice = new E.Menu(G.game, ['YES, START AGAIN', 'NO, KEEP IT'], { x: 'center', y: 96, onPick: i => {
      if (i === 0) { G.resetStory(); return G.game.go('cutscene', { lines: G.STORY_PROLOGUE, then: 'story' }); }
      return G.game.go('storychoice');
    }, onCancel: () => G.game.go('storychoice') });
  },
  update(dt) { G.storyChoice.update(dt); },
  draw(r) { storyFrame(r, 'Starting again overwrites the saved story. Are you sure?'); G.storyChoice.draw(r); G.footer(r, [['shot', 'CHOOSE'], ['block', 'BACK']]); }
};
G.scenes.story = {
  enter() {
    const P = G.profile();
    G.storyMenu = new E.Menu(G.game, G.CHAPTERS.map(c => ({ label: c.id + '  ' + c.title, disabled: c.id > P.chapter })).concat([{ label: 'BACK', disabled: false }]),
      { x: 'center', y: 80, onPick: i => { if (i === G.CHAPTERS.length) return G.game.go('title'); const c = G.CHAPTERS[i]; if (c.id > P.chapter) return; G.game.go('chapter', { id: c.id }); }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.storyMenu.update(dt); },
  draw(r) {
    const P = G.profile();
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => {
      E.font.title(g, 'THE GRAND KERFUFFLE', r.W / 2, 12, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'Thrumpton wants the green for parking. Win five matches.', r.W / 2, 40, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.storyMenu.draw(r);
    r.overlay(g => {
      CHAPTER_STARS(g, P, r);
    });
    G.footer(r, [['shot', 'PLAY'], ['block', 'BACK']]);
  }
};
const CHAPTER_STARS = (g, P, r) => {
  G.CHAPTERS.forEach((c, i) => {
    const s = P.stars[i] || 0;
    E.font.text(g, '*'.repeat(s) + '.'.repeat(3 - s), r.W - 60, 80 + i * 17, '#ffd23a', { font: 'tiny', outline: '#0b0814' });
  });
};
// a chapter: its pre-match scene, then the match, the post-match scene and the goals
G.scenes.chapter = {
  enter(data) {
    const c = G.CHAPTERS.find(x => x.id === data.id);
    G.chapter = c;
    G.game.go('cutscene', { lines: c.pre, then: 'chapterMatch' });
  }
};
G.scenes.chapterMatch = {
  enter() {
    const c = G.chapter;
    const cfg = { teams: [0, c.opp], ground: c.ground, overs: c.overs, wickets: c.wickets, kerf: !!c.kerf || c.id >= 2, seed: 77 + c.id * 13, batFirst: c.batFirst ? 0 : 1, humanSides: [0], mode: 'story', chapter: c.id, forceRain: !!c.forceRain };
    G.startMatch(cfg, { chapter: c.id });
  }
};
G.chapterDone = (match) => {
  const c = G.chapter;
  const won = !!(match.result && match.result.winner === 0);
  const view = { won, stats: match.stats, targetsHit: match.targetsHit, innings: match.innings };
  const goals = c.goals.map(([, test]) => !!test(view));
  const stars = goals.filter(Boolean).length;
  const P = G.profile();
  P.stars[c.id - 1] = Math.max(P.stars[c.id - 1] || 0, stars);
  if (won && P.chapter === c.id) P.chapter = c.id + 1;
  G.saveProfile(P);
  G.lastGoals = goals;
  return { won, stars, goals };
};

/* ---- CUTSCENE: the dialogue over a plain backdrop, with a portrait-less caption box ---- */
G.scenes.cutscene = {
  enter(data) {
    G.cut = { lines: data.lines.slice(), then: data.then, idx: 0 };
    G.talk = new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#e8c070', speed: 42 });
    G.talk.say(G.cut.lines.map(([n, t]) => t), { name: G.cut.lines[0][0], modal: true });
    G.cutLine = 0;
    G.game.audio.music(G.SONG_TEA);
  },
  update(dt) {
    const I = G.game.input;
    if (G.talk && G.talk.update(dt)) return;
    if (I.pressed('shot') || I.pressed('confirm') || I.pressed('cancel')) {
      I.consumeAll();
      return G.cutDone();
    }
  },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => { px.rect(g, 0, Math.round(r.H * 0.6), r.W, r.H, '#5e9c3e'); });
    if (G.talk) G.talk.draw(r);
    G.footer(r, [['shot', 'CONTINUE']]);
  }
};
G.cutDone = () => {
  const then = G.cut.then;
  if (then === 'story') return G.game.go('story');
  if (then === 'chapterMatch') return G.game.go('chapterMatch');
  if (then === 'ending') return G.game.go('cutscene', { lines: G.STORY_ENDING, then: 'title' });
  if (then === 'title') return G.game.go('title');
  return G.game.go('title');
};

/* ---- RESULTS: the banner, the margin, the key stats and the match report, then rematch, continue or menu ---- */
G.matchEnded = m => {
  if (G.matchOpts && G.matchOpts.attract) return G.game.go('attract', null, { fade: 0 });
  if (G.matchOpts && G.matchOpts.lesson) return G.lessonEnded(m);
  if (G.matchOpts && G.matchOpts.hub) return G.hubRoundEnded(m);
  if (G.matchOpts && G.matchOpts.nets) return G.game.go('results', { match: m, kind: 'nets' });
  if (G.matchOpts && G.matchOpts.showdown) {
    const best = E.store.get('kerfuffle:showdown:best', {});
    const score = G.showdownScore(m);
    const key = G.showMode === 'bat' ? 'bat' : 'bowl';
    if (score > (best[key] || 0)) { best[key] = score; E.store.set('kerfuffle:showdown:best', best); }
    G.showScore = score;
    if (G.tableQualifies(key, score)) return G.game.go('initials', { mode: key, score });
    return G.game.go('results', { match: m, kind: 'showdown' });
  }
  if (G.matchOpts && G.matchOpts.chapter) {
    G.recordMatch(m);
    const res = G.chapterDone(m);
    G.chapterResult = res;
    return G.game.go('results', { match: m, kind: 'chapter', res });
  }
  G.recordMatch(m);
  return G.game.go('results', { match: m, kind: 'quick' });
};
G.reportFor = (m) => {
  const res = m.result;
  const A = G.TEAMS[m.cfg.teams[0]], B = G.TEAMS[m.cfg.teams[1]];
  const names = { 0: A.name, 1: B.name };
  if (!res || res.kind === 'tie') return G.MATCH_REPORTS.tie.replace('{hero}', 'the scorer');
  const winner = names[res.winner], loser = names[1 - res.winner];
  const inn = m.innings[0];
  const top = inn.bat.slice().sort((a, b) => b.runs - a.runs)[0];
  const batName = m.team(inn.side).squad[top.p];
  const bowl = m.team(1 - inn.side).squad[m.team(1 - inn.side).bowlers[0]];
  const wkts = inn.wkts, runs = inn.runs;
  const line = res.kind === 'chase'
    ? G.fill(G.MATCH_REPORTS.win, { winner, target: m.innings[1].target, topBat: batName, topRuns: top.runs, notOut: top.out ? '' : ' not out', sixes: m.stats.sixes, topBowl: bowl, wkts, runs })
    : G.fill(G.MATCH_REPORTS.win, { winner, target: m.innings[1] ? m.innings[1].target : runs, topBat: batName, topRuns: top.runs, notOut: '', sixes: m.stats.sixes, topBowl: bowl, wkts, runs });
  return loser && res.kind !== 'chase' ? line.replace(/set \d+,/, 'set ' + (m.innings[1] ? m.innings[1].target : runs) + ',') : line;
};
G.scenes.results = {
  enter(data) {
    G.resData = data;
    const labels = data.kind === 'chapter' ? ['CONTINUE', 'HIGHLIGHTS'] : data.kind === 'nets' || data.kind === 'showdown' ? ['REMATCH', 'MENU'] : ['REMATCH', 'HIGHLIGHTS', 'MENU'];
    G.resLabels = labels;
    G.resMenu = new E.Menu(G.game, labels, { x: 'center', y: 150, onPick: i => G.resultPick(i), onCancel: () => G.game.go('title') });
    G.game.audio.music(G.SONG_TITLE);
    G.resReport = G.reportFor(data.match);
  },
  update(dt) { G.resMenu.update(dt); },
  draw(r) {
    const d = G.resData, m = d.match, res = m.result;
    r.sky(['#2a3a72', '#e8a060']);
    r.overlay(g => {
      const A = G.TEAMS[m.cfg.teams[0]], B = G.TEAMS[m.cfg.teams[1]];
      const win = res && res.winner === 0;
      E.font.title(g, res && res.kind === 'tie' ? 'A TIE!' : win ? 'KERFUFFLE WIN' : (res ? G.TEAMS[m.cfg.teams[res.winner]].name.toUpperCase() + ' WIN' : 'RESULT'), r.W / 2, 10, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      const margin = res ? (res.kind === 'chase' ? 'by ' + res.wicketsLeft + ' wickets' : res.kind === 'defend' ? 'by ' + res.margin + ' runs' : res.kind === 'super' ? 'in a Super Over' : '') : '';
      E.font.text(g, margin, r.W / 2, 42, '#ffffff', { align: 'center', outline: '#0b0814' });
      E.font.text(g, A.id + ' ' + m.innings[0].runs + '/' + m.innings[0].wkts + '   ' + B.id + ' ' + (m.innings[1] ? m.innings[1].runs + '/' + m.innings[1].wkts : '-'), r.W / 2, 56, '#ffe08a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, m.stats.sixes + ' sixes  ' + m.stats.fours + ' fours  ' + m.stats.wickets + ' wickets', r.W / 2, 68, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (d.kind === 'chapter' && d.res) {
        E.font.text(g, d.res.won ? 'STARS EARNED: ' + d.res.stars + ' of 3' : 'THE SCORER SAYS: NEVER MIND, DEAR', r.W / 2, 80, '#ffd23a', { align: 'center', outline: '#0b0814' });
      }
      const words = G.wrapLines(G.resReport || '', r.W - 40, 'tiny');
      words.slice(0, 3).forEach((w, k) => E.font.text(g, w, 20, 96 + k * 9, '#e8e0f0', { font: 'tiny', outline: '#0b0814' }));
    });
    G.resMenu.draw(r);
    G.footer(r, [['shot', 'SELECT']]);
  }
};
G.wrapLines = (s, w, font) => E.font.wrap(s, w, { font });
G.resultPick = i => {
  const d = G.resData;
  if (G.resLabels[i] === 'HIGHLIGHTS') { G.hlReturn = d; return G.game.go('highlights'); }
  if (G.resLabels[i] === 'MENU') return G.game.go('title');
  if (d.kind === 'chapter') {
    const won = G.chapterResult && G.chapterResult.won;
    const lines = won ? G.CHAPTERS[G.chapter.id - 1].post : G.LOSS_LINES;
    const then = !won ? 'story' : G.chapter.id === G.CHAPTERS.length ? 'ending' : 'story';
    return G.game.go('cutscene', { lines, then });
  }
  if (d.kind === 'nets') return G.game.go('nets');
  if (d.kind === 'showdown') return G.game.go('showdown');
  if (i === 0) return G.startMatchFromSetup();
  return G.game.go('title');
};
G.startMatchFromSetup = () => G.startMatch(Object.assign({}, G.lastCfg), G.matchOpts || {});

/* ---- ABOUT AND CREDITS: paged, one topic a page. The text is the same as the chat reply's sections. ---- */
G.scenes.about = {
  enter(data) { G.aboutPage = data && data.page || 0; },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('right') || I.pressed('down')) { G.aboutPage = (G.aboutPage + 1) % G.ABOUT.length; I.consumeAll(); }
    if (I.pressed('left') || I.pressed('up')) { G.aboutPage = (G.aboutPage + G.ABOUT.length - 1) % G.ABOUT.length; I.consumeAll(); }
    if (I.pressed('cancel') || I.pressed('confirm')) { I.consumeAll(); return G.game.go('extras'); }
  },
  draw(r) {
    const page = G.ABOUT[G.aboutPage];
    r.sky(['#241a40', '#3a2a62']);
    r.overlay(g => {
      E.font.title(g, page.title, r.W / 2, 10, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, (G.aboutPage + 1) + ' / ' + G.ABOUT.length, r.W - 6, 6, '#c8c0e0', { font: 'tiny', align: 'right', outline: '#0b0814' });
      page.lines.slice(0, 10).forEach((l, k) => E.font.text(g, l, 14, 40 + k * 14, '#f4f0ff', { font: 'tiny', outline: '#0b0814' }));
    });
    G.footer(r, [['shot', 'BACK'], ['run', 'NEXT PAGE']]);
  }
};
G.ABOUT = [
  { title: 'SOURCE INFORMATION', lines: [
    'Date: 2026-11-04 06:48:07', 'Source: Cricket (over the top arcade style)', 'Plan: PLAN.md (the build folder)',
    'Genre: arcade sports (cricket) with a comedy story', 'Perspective: broadcast camera behind the bowler; a wide follow camera',
    'Tech: my-3D2dge v0.85.2 (unmodified), AI Hub client 1.4.0, plain JavaScript', 'Art: engine HD pixel rigs; a ground, kits and stumps drawn in code',
    'Animation: the engine rigs, poses and E.move("slash") for the swing', 'Audio: chip-synth effects and songs; formant gibberish voices; crowd',
    'Online: AI Hub parallel Super Over, 1 to 4 players. Model: claude-haiku-5-5, effort medium'] },
  { title: 'TECH AND ENGINE', lines: [
    'Engine: my-3D2dge v0.85.2 (MIT, Michael Crosato). Unmodified: no engine files changed.', 'Views: a custom broadcast View (12 deg, scale 1.45) and a wide View.',
    'Floor: a TileMap of 72 by 72 cells, with mown stripes, creases and rope painted in code.', 'Rigs: E.Humanoid in kit colours; the bat is drawn by the game.',
    'Sound: game.audio chip voices; formant voices and crowd noise on its audio context.', 'Hub: the session client is the first script in head; tags follow it.',
    'Tests: node test/run.mjs (headless and bundle) and browser checks in Chromium.', 'Everything else is original and synthesized in code.'] },
  { title: 'ART, ANIMATION AND AUDIO', lines: [
    'Ground: 16-unit cells, mown stripes, white creases, rope, surround.', 'Players: heroic and chibi rigs in kit colours, with bats.',
    'Batting swing: the engine slash move, timed to the contact.', 'Bowling: the run-up and a meter; the release is the rig stride.',
    'Music: a brass march for the title, a bouncy theme for the match.', 'Voices: Sir Aubrey and Dazza in gibberish, captions on.',
    'Crowd: a roar is noise through band-pass filters.', 'No audio files are loaded.'] },
  { title: 'ONLINE AND TESTING', lines: [
    'AI Hub parallel Super Over: six balls, two wickets, the same balls for every copy.', 'The card is the game\'s own: Ready and More time.',
    'node test/run.mjs: 272 checks in twelve suites (ball, sim, specials, features, flow, play, multi, hub, bundle, browser, showcase, brief).', 'Browser: the file opens from file:// with no errors and no requests.',
    'AI Hub harness: passes for 1, 2 and 4 players (4 on a slow, lossy link).', 'Headless: game.advance and game.debug drive every suite.'] },
  { title: 'TESTING FEEDBACK', lines: [
    'Issues found: about a dozen, all fixed. Rigs never animated; the bat and pitch did not draw;', 'the hub round played two innings; the idle timer ran late; the touch gate was off;',
    'the input preset dropped the menu actions; a removed helper broke commentary.', 'Critical (game-breaking for their feature): the hub round, the rigs and the idle timer.',
    'Most helpful: the headless match runs to a result, with the in-play cap and the scorecard check.', 'Least helpful: toss timing checks that needed rewriting after the flow changed.'] },
  { title: 'ENGINE FEEDBACK', lines: [
    'Liked most: the View system and the rig draw, with r.w projection for every point.', 'Stuck: an input preset without the defaults warns; actor drawing is local space.',
    'Built ourselves: the ball physics and predictor, timing, fielders, running, the umpire, the bat.', 'Hardest: a broadcast look and world points drawn inside actors.',
    'Changed in the engine: none. No engine file was edited.', 'Wish: a rig option for a two-handed bat grip, and world points inside actors.'] },
  { title: 'PROMPT FEEDBACK', lines: [
    'Liked most: the exit-interview shape, and the explicit hub and testing rules.', 'Confusing: PLAN.md and TASK.md disagree on names. TASK won, but it cost time.',
    'Hardest: the plan is bigger than one session. The scope had to be cut.', 'Change: a must-have list and a scope budget, and one set of names.'] },
  { title: 'CREDITS', lines: [
    'Cricket Kerfuffle. The Grand Kerfuffle is a comedy in five chapters.', 'Engine: my-3D2dge by Michael Crosato (MIT).',
    'Hub: AI Hub Session Protocol v1, client 1.4.0.', 'Built with Claude Haiku 5.5 (medium effort).',
    'Doris the cow did not ask to be in this, and is thrilled about it.', 'Press BACK to leave.'] }
];

/* ---- NETS, THE SUPER OVER SHOWDOWN and THE ATTRACT SHOWREEL. Nets is practice against the machine, and the Six
 * Machine challenge (twelve balls, a score). The Showdown is six balls batting or a defended fourteen, with a best
 * score kept. Attract runs CPU matches on the real machinery, with cheats, until any input ends it. ---- */
const MACHINE_ALL = ['express', 'yorker', 'outswing', 'inswing', 'legbreak', 'googly', 'offbreak', 'dobber', 'cutter', 'bouncer'];
G.startNets = mode => {
  const six = mode === 'six';
  const cfg = { teams: [0, 3], ground: 'green', overs: six ? 2 : 99, wickets: 10, kerf: false, batFirst: 0, seed: six ? 91 : 92,
    humanSides: [0], machine: six ? ['express', 'outswing', 'legbreak', 'bouncer', 'yorker', 'dobber'] : MACHINE_ALL, mode: six ? 'six' : 'practice', preset: 'balanced' };
  G.startMatch(cfg, { nets: true, six });
};

/* ---- SHOWDOWN: bat six balls against the machine, or defend fourteen against Kev Malone's slog ---- */
G.scenes.showdown = {
  enter() {
    G.showMenu = new E.Menu(G.game, ['BAT: SIX BALLS', 'BOWL: DEFEND 14', 'BACK'], { x: 'center', y: 96, onPick: i => {
      if (i === 2) return G.game.go('title');
      G.startShowdown(i === 0 ? 'bat' : 'bowl');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.showMenu.update(dt); },
  draw(r) {
    const best = E.store.get('kerfuffle:showdown:best', {});
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'SUPER OVER', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'BEST BATTING ' + (best.bat || 0) + '   BEST BOWLING ' + (best.bowl || 0), r.W / 2, 42, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.showMenu.draw(r);
    G.footer(r, [['shot', 'SELECT'], ['block', 'BACK']]);
  }
};
G.startShowdown = mode => {
  G.showMode = mode;
  const cfg = mode === 'bat'
    ? { teams: [0, 3], ground: 'bay', overs: 1, wickets: 2, kerf: true, batFirst: 0, seed: 404, humanSides: [0], machine: ['express', 'bouncer', 'yorker', 'dobber', 'express', 'bouncer'], mode: 'showdown', singleInnings: true }
    : { teams: [0, 3], ground: 'hall', overs: 1, wickets: 2, kerf: true, batFirst: 1, seed: 505, humanSides: [0], mode: 'showdown', singleInnings: true };
  G.startMatch(cfg, { showdown: true });
};
// the showdown's score: the runs off the bat, or fourteen less the runs conceded, times ten, plus wickets times twenty-five
G.showdownScore = m => {
  const inn = m.innings[0];
  if (G.showMode === 'bat') return inn.runs;
  const runs = inn.runs;
  const wk = inn.wkts;
  return Math.max(0, (14 - runs) * 10 + wk * 25);
};

/* ---- ATTRACT: the showreel. CPU matches on the real machinery, a segment per ground. ---- */
G.ATTRACT = G.ATTRACT_CHAIN;   // the ten segments of the showreel (10-data.js)
G.attractSeg = 0;
G.scenes.attract = {
  enter() {
    const seg = G.ATTRACT[G.attractSeg % G.ATTRACT.length];
    G.attractSeg++;
    G.startAttractSegment(seg);
  }
};
G.startAttractSegment = seg => {
  const cfg = { teams: seg.teams, ground: seg.ground, overs: 3, wickets: 5, kerf: true, batFirst: 0, seed: 300 + G.attractSeg * 17,
    humanSides: [], autoBat: true, autoBowl: true, bowlScatter: 1.2, mode: 'attract' };   // the CPU bowls tight to the stumps, so the batters are beaten for wickets as well as runs
  G.attractT = 0;
  G.attractNote = seg.note;
  G.startMatch(cfg, { attract: true, onUpdate: dt => {
    G.attractT += dt;
    if (G.attractT > 90 && G.match.phase !== 'end') { G.match.phase = 'end'; G.match.result = G.match.result || { kind: 'tie', winner: -1 }; G.matchEnded(G.match); }
  } });
};
G.attractInput = I => {
  if (I.anyPressed() || (I.mouse && G.mouseMoved(I))) { I.consumeAll(); G.game.go('title', null, { fade: 0 }); }
};
G.attractDraw = r => {
  r.overlay(g => {
    const blink = Math.floor(G.game.time * 2) % 2;
    E.font.text(g, G.attractNote || '', 6, 6, '#ffe08a', { font: 'tiny', outline: '#0b0814' });
    if (blink) E.font.text(g, 'DEMO', r.W / 2, r.H - 26, '#ffffff', { align: 'center', outline: '#0b0814' });
    E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
  });
};

/* ---- THE EXTRAS: the Nets lessons and their results, the replays and the highlights reel, the third umpire's screen,
 * and the high-score table with initials. Each is a screen of its own, built on the match's own record. ---- */
G.scenes.nets = {
  enter() {
    const P = G.profile();
    const items = G.LESSONS.map(l => ({ label: l.id + '  ' + l.title + (P.lessons && P.lessons[l.id] ? '  *' : ''), disabled: false }));
    items.push({ label: 'FREE PRACTICE', disabled: false }, { label: 'SIX MACHINE (12 BALLS)', disabled: false }, { label: 'BACK', disabled: false });
    G.netsMenu = new E.Menu(G.game, items, { x: 'center', y: 40, onPick: i => {
      const n = G.LESSONS.length;
      if (i < n) return G.startLesson(G.LESSONS[i]);
      if (i === n) return G.startNets('practice');
      if (i === n + 1) return G.startNets('six');
      return G.game.go('title');
    }, onCancel: () => G.game.go('title') });
  },
  update(dt) { G.netsMenu.update(dt); },
  draw(r) {
    r.sky(['#8fc4ff', '#ffe6b0']);
    r.overlay(g => {
      E.font.title(g, 'NETS', r.W / 2, 6, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'Eleven lessons, then free practice and the Six Machine. Mrs Crumb keeps the score.', r.W / 2, 28, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.netsMenu.draw(r);
    G.footer(r, [['shot', 'START'], ['block', 'BACK']]);
  }
};
// a lesson: a match with its own set-up, passed when its goal is met on the match's record, or failed when its balls run out
G.startLesson = lesson => {
  const cfg = {
    teams: [0, 3], ground: 'green', overs: 30, wickets: 10, kerf: false, batFirst: lesson.bowl ? 1 : 0,
    seed: 500 + lesson.id, humanSides: lesson.bowl || lesson.fielding ? [lesson.bowl ? 0 : 1] : [0],
    machine: lesson.machine || null, mode: 'lesson', lesson: lesson.id, startHype: lesson.startHype || null,
    umpireAccuracy: lesson.umpire, cpuLoft: lesson.cpuLoft, cpuPower: lesson.cpuPower, feedFielder: lesson.feedFielder, bowlX: lesson.bowlX, noCatch: lesson.noCatch
  };
  G.lessonNow = lesson;
  G.startMatch(cfg, { lesson, nets: true, onUpdate: () => {
    const m = G.match;
    if (m.phase === 'end') return;
    if (lesson.goal(m)) { G.lessonPass = true; m.phase = 'end'; m.result = { kind: 'lesson', winner: -1 }; G.endQueued = false; G.matchEnded(m); }
    else if (m.log.length >= lesson.balls) { G.lessonPass = false; m.phase = 'end'; m.result = { kind: 'lesson', winner: -1 }; G.endQueued = false; G.matchEnded(m); }
  } });
};
G.lessonEnded = m => {
  const L = G.lessonNow;
  const P = G.profile();
  P.lessons = P.lessons || {};
  if (G.lessonPass) P.lessons[L.id] = true;
  G.saveProfile(P);
  G.game.go('lessonresult', { lesson: L, passed: !!G.lessonPass, stats: Object.assign({}, m.stats) });
};
G.scenes.lessonresult = {
  enter(d) {
    G.lessonRes = d;
    const next = G.LESSONS.find(l => l.id === d.lesson.id + 1);
    const labels = (next && d.passed ? ['NEXT LESSON'] : []).concat(['TRY AGAIN', 'LESSONS']);
    G.lessonMenu = new E.Menu(G.game, labels, { x: 'center', y: 130, onPick: i => {
      const pick = labels[i];
      if (pick === 'NEXT LESSON') return G.startLesson(next);
      if (pick === 'TRY AGAIN') return G.startLesson(d.lesson);
      return G.game.go('nets');
    }, onCancel: () => G.game.go('nets') });
  },
  update(dt) { G.lessonMenu.update(dt); },
  draw(r) {
    const d = G.lessonRes;
    r.sky(['#2a3a72', '#e8a060']);
    r.overlay(g => {
      E.font.title(g, d.passed ? 'LESSON PASSED' : 'TRY AGAIN', r.W / 2, 20, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, d.lesson.id + '  ' + d.lesson.title, r.W / 2, 60, '#ffffff', { align: 'center', outline: '#0b0814' });
      E.font.text(g, d.lesson.text, r.W / 2, 80, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814', wrap: 300 });
      E.font.text(g, 'Runs ' + (G.match ? G.match.I.runs : 0) + '   Dots ' + (G.match ? G.match.dotRun : 0) + '   Fours ' + d.stats.fours + '   Sixes ' + d.stats.sixes, r.W / 2, 104, '#ffe08a', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.lessonMenu.draw(r);
    G.footer(r, [['shot', 'SELECT']]);
  }
};

/* ---- THE REPLAY: the last moments of a big play, played back at half speed from the match's own frames ---- */
G.replay = null;
G.requestReplay = (weight, label) => {
  const set = G.setting('replays');
  if (set === 'Never') return;
  if (!G.frameRing || G.frameRing.length < 30) return;
  const clip = { frames: G.frameRing.slice(-150), t: 0, label: label || 'REPLAY', weight, ground: G.mapGround, rigStep: 0 };
  G.highlights = G.highlights || [];
  G.highlights.push(clip);
  G.highlights.sort((a, b) => b.weight - a.weight);
  G.highlights = G.highlights.slice(0, 3);
  G.replay = clip;
};
// the replay: each recorded frame holds every player's state, and the real rigs are posed from those states, in order,
// one frame at a time (each rig steps through the recorded frames, so its walk and its swing are the play's own)
G.drawReplayFrame = (r, clip) => {
  const n = clip.frames.length;
  const idx = clamp(Math.floor(clip.t * 0.5 * 30), 0, n - 1);
  while (clip.rigStep < idx) {
    clip.rigStep++;
    const f = clip.frames[clip.rigStep], pf = clip.frames[clip.rigStep - 1];
    for (const p of f.players) {
      const rig = G.replayRig(p);
      const prev = pf.players.find(q => q.key === p.key) || p;
      rig.update(1 / 30, { x: p.x, y: p.y, z: 0, vx: (p.x - prev.x) * 30, vy: (p.y - prev.y) * 30, facing: p.facing, stance: p.role === 'bat' ? 'ready' : undefined });
    }
  }
  const f = clip.frames[idx];
  if (!f) return;
  for (const p of f.players) {
    const rig = G.replayRig(p);
    const w0 = r.w(p.x, p.y, 0);
    r.actor(p.x, p.y, 0, (g, ox, oy) => {
      rig.draw(g, ox, oy, r.view);
      if (p.bat) G.batInto(g, r, rig, G.batAngleNow(), G.batLiftNow(), (x, y, z) => { const w = r.w(x, y, z); return [ox + w[0] - w0[0], oy + w[1] - w0[1]]; });
    });
  }
  r.overlay(g => {
    const q = r.w(f.ball[0], f.ball[1], f.ball[2]);
    px.disc(g, q[0], q[1], 2, '#c8202a');
    E.font.text(g, clip.label, 6, 6, '#ffffff', { font: 'tiny', outline: '#0b0814' });
    E.font.text(g, 'REPLAY 0.5x', r.W - 6, 6, '#ffe08a', { font: 'tiny', align: 'right', outline: '#0b0814' });
  });
};
// the replay's rigs are their own (keyed apart from the live ones), so the live play is not disturbed
G.replayRig = p => {
  G._rp = G._rp || {};
  const key = 'rp:' + p.key + ':' + p.side + ':' + p.idx;
  if (!G._rp[key]) G._rp[key] = G.rigOf(key, p.side, p.idx);
  return G._rp[key];
};
G.replayTick = dt => {
  if (!G.replay) return false;
  G.replay.t += dt;
  if (G.replay.t >= G.replay.frames.length / 30 * 2) G.replay = null;
  return !!G.replay;
};

/* ---- THE HIGHLIGHTS: the three biggest clips of the match, one after another ---- */
// back to the results of the match the clips came from (or, for a reel opened on its own, the last match's results)
G.hlBack = () => G.game.go('results', G.hlReturn || { kind: 'quick', match: G.match });
G.scenes.highlights = {
  enter() { G.hl = { i: 0, t: 0 }; },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('shot')) { I.consumeAll(); return G.hlBack(); }
    G.hl.t += dt;
    const c = G.highlights[G.hl.i];
    if (c && G.hl.t > c.frames.length / 30 * 2 + 0.5) { G.hl.i++; G.hl.t = 0; if (G.hl.i >= G.highlights.length) return G.hlBack(); }
  },
  draw(r) {
    r.sky(['#0a0a1e', '#2a2a4a']);
    const c = G.highlights[G.hl.i];
    if (!c) { r.overlay(g => E.font.text(g, 'NO HIGHLIGHTS', r.W / 2, r.H / 2, '#ffffff', { align: 'center', outline: '#0b0814' })); return; }
    if (c.ground) { G.map && G.map.drawFloor(r); }
    G.drawReplayFrame(r, Object.assign({}, c, { t: G.hl.t }));
    r.overlay(g => E.font.text(g, 'HIGHLIGHT ' + (G.hl.i + 1) + ' OF ' + G.highlights.length + '  ·  PRESS ' + (G.game.input.label('shot') || 'J') + ' TO SKIP', r.W / 2, r.H - 12, '#ffe08a', { font: 'tiny', align: 'center', outline: '#0b0814' }));
  }
};

/* ---- THE THIRD UMPIRE: a close run-out goes upstairs. The TV screen shows the call, then the verdict. ---- */
G.thirdUmpire = null;
G.drawThirdUmpire = r => {
  const t = G.thirdUmpire;
  if (!t) return;
  r.overlay(g => {
    E.ui.box(g, r.W / 2 - 84, 66, 168, 62, { bg: ['#101018', '#05050a'], alpha: 0.95 });
    E.font.text(g, 'THIRD UMPIRE', r.W / 2, 72, '#9ad0ff', { font: 'tiny', align: 'center', outline: '#0b0814' });
    const reveal = t.t > 1.2;
    const word = reveal ? (t.out ? 'OUT' : 'NOT OUT') : (Math.floor(t.t * 12) % 2 ? (t.out ? 'NOT OUT' : 'OUT') : (t.out ? 'OUT' : 'NOT OUT'));
    E.font.text(g, word, r.W / 2, 90, reveal ? (t.out ? '#ff6b6b' : '#5fd38a') : '#ffffff', { scale: 2, align: 'center', outline: '#0b0814' });
    if (reveal) E.font.text(g, t.name + ' · by ' + t.margin + ' ms', r.W / 2, 114, '#e8e0f0', { font: 'tiny', align: 'center', outline: '#0b0814' });
  });
};
G.tickThirdUmpire = dt => { if (G.thirdUmpire) { G.thirdUmpire.t += dt; if (G.thirdUmpire.t > 3.2) G.thirdUmpire = null; } };

/* ---- THE HIGH-SCORE TABLE: a Showdown score in the top five asks for initials ---- */
G.tableKey = mode => 'kerfuffle:table:' + mode;
G.tableOf = mode => E.store.get(G.tableKey(mode), []);
G.tableQualifies = (mode, score) => { const t = G.tableOf(mode); return t.length < 5 || score > t[t.length - 1].score; };
G.scenes.initials = {
  enter(d) { G.ini = { mode: d.mode, score: d.score, letters: [0, 0, 0], at: 0 }; },
  update(dt) {
    const I = G.game.input, s = G.ini;
    if (I.pressed('left')) s.at = (s.at + 2) % 3;
    if (I.pressed('right')) s.at = (s.at + 1) % 3;
    if (I.pressed('up')) s.letters[s.at] = (s.letters[s.at] + 1) % 26;
    if (I.pressed('down')) s.letters[s.at] = (s.letters[s.at] + 25) % 26;
    if (I.pressed('confirm') || I.pressed('shot')) {
      I.consumeAll();
      if (s.at < 2) { s.at++; return; }
      const name = s.letters.map(k => String.fromCharCode(65 + k)).join('');
      const t = G.tableOf(s.mode).concat([{ name, score: s.score }]).sort((a, b) => b.score - a.score).slice(0, 5);
      E.store.set(G.tableKey(s.mode), t);
      G.game.go('table', { mode: s.mode });
    }
  },
  draw(r) {
    const s = G.ini;
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'A TOP FIVE SCORE', r.W / 2, 20, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'SCORE ' + s.score, r.W / 2, 56, '#ffffff', { align: 'center', outline: '#0b0814' });
      for (let k = 0; k < 3; k++) {
        const x = r.W / 2 - 40 + k * 40, col = k === s.at ? '#ffd23a' : '#e8e0f0';
        px.rect(g, x - 12, 84, 26, 30, '#2a2634');
        E.font.text(g, String.fromCharCode(65 + s.letters[k]), x, 92, col, { scale: 2, outline: '#0b0814' });
      }
      E.font.text(g, 'UP AND DOWN CHANGE A LETTER, LEFT AND RIGHT MOVE', r.W / 2, 128, '#c8c0e0', { align: 'center', font: 'tiny', outline: '#0b0814' });
    });
    G.footer(r, [['shot', 'NEXT'], ['block', 'BACK']]);
  }
};
G.scenes.table = {
  enter(d) { G.tableMode = d.mode; G.tableMenu = new E.Menu(G.game, ['MENU'], { x: 'center', y: 150, onPick: () => G.game.go('title') }); },
  update(dt) { G.tableMenu.update(dt); },
  draw(r) {
    const t = G.tableOf(G.tableMode);
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, G.tableMode === 'bat' ? 'BATTING TABLE' : 'BOWLING TABLE', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      if (!t.length) E.font.text(g, 'NO SCORES YET', r.W / 2, 60, '#ffffff', { align: 'center', outline: '#0b0814' });
      t.forEach((row, k) => E.font.text(g, (k + 1) + '  ' + row.name + '   ' + row.score, r.W / 2 - 70, 50 + k * 16, k === 0 ? '#ffe08a' : '#e8e0f0', { outline: '#0b0814' }));
    });
    G.tableMenu.draw(r);
    G.footer(r, [['shot', 'MENU']]);
  }
};

/* ---- AUDIO: every sound is written in code. The effects are the engine's chip voices; the commentary and the players'
 * shouts are Animalese-style gibberish (formant syllables on the engine's audio context); the crowd is noise through
 * band-pass filters. Nothing loads from a file. ---- */
G.defineSounds = () => {
  const A = G.game.audio;
  const defs = {
    bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35, filter: 'bandpass' }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
    batHigh: [{ wave: 'noise', freq: 2000, to: 800, dur: .05, vol: .3, filter: 'bandpass' }, { wave: 'sine', freq: 520, to: 340, dur: .11, vol: .35 }, { wave: 'triangle', freq: 980, dur: .06, vol: .12 }],
    ring: { wave: 'sine', freq: 880, to: 1320, dur: .12, vol: .2 },
    pitch: { wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 },
    edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25, filter: 'highpass' }, { wave: 'triangle', freq: 1800, dur: .02, vol: .15 }],
    stumps: [{ wave: 'triangle', freq: 700, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, dur: .05, vol: .3 }, { wave: 'noise', freq: 900, dur: .06, vol: .2 }],
    catch: { wave: 'triangle', freq: 900, to: 600, dur: .08, vol: .25 },
    gloves: { wave: 'noise', freq: 300, dur: .05, vol: .2, filter: 'lowpass' },
    throw: { wave: 'noise', freq: 1200, to: 300, dur: .25, vol: .15 },
    run: { wave: 'triangle', freq: 300, dur: .03, vol: .08 },
    select: { wave: 'square', freq: 660, dur: .03, vol: .08 },
    four: [{ wave: 'triangle', freq: 523, dur: .1, vol: .25 }, { wave: 'triangle', freq: 659, dur: .1, vol: .25 }, { wave: 'triangle', freq: 784, dur: .18, vol: .25 }],
    six: [{ wave: 'square', freq: 523, dur: .1, vol: .18 }, { wave: 'square', freq: 784, dur: .1, vol: .18 }, { wave: 'square', freq: 1047, dur: .3, vol: .2 }],
    hype: { wave: 'square', freq: 440, to: 880, dur: .3, vol: .18 },
    fire: { wave: 'saw', freq: 220, to: 660, dur: .5, vol: .15, vib: [6, .05] },
    special: { wave: 'square', freq: 330, to: 990, dur: .4, vol: .2, vib: [10, .04] },
    glass: { wave: 'noise', freq: 4000, dur: .25, vol: .25, filter: 'highpass' },
    coin: { wave: 'square', freq: 988, to: 1976, dur: .12, vol: .15 },
    rain: { wave: 'noise', freq: 2200, dur: .6, vol: .12, filter: 'highpass' }
  };
  for (const [k, v] of Object.entries(defs)) A.define(k, v);
};
// the songs: the match's bouncy cricket theme, and the title's brass march (the engine's note notation)
G.SONG_TITLE = { bpm: 120, steps: 4, tracks: [
  { wave: 'square', vol: .08, notes: 'Bb4 . D5 F5 . D5 Bb4 . | G4 . Bb4 D5 . Bb4 G4 . | F4 . A4 C5 . A4 F4 . | G4 . F4 - - . . .' },
  { wave: 'triangle', vol: .25, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 .' },
  { wave: 'drums', vol: .12, notes: 'k . s . k . s s | k . s . k s s .' }] };
G.SONG_MATCH = { bpm: 140, steps: 4, tracks: [
  { wave: 'square', vol: .06, notes: 'E5 . E5 G5 . E5 D5 . | C5 . C5 E5 . C5 B4 . | A4 . C5 . E5 . A5 . | G5 - - . . . . .' },
  { wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | A2 . E2 . A2 . E2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .' },
  { wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h h .' }] };
G.SONG_TEA = { bpm: 96, steps: 3, tracks: [
  { wave: 'pulse12', vol: .07, notes: 'G5 - E5 . C5 - . | A4 - F4 . D4 - . | G4 - C5 . E5 - .' },
  { wave: 'triangle', vol: .2, notes: 'C3 . . G2 . . | F2 . . C3 . . | G2 . . D3 . .' }] };

/* the voice: formant syllables. Each syllable is a saw through two band-pass filters set to its vowel, with a short
 * attack and release. Pitch falls across a phrase, rises for a question and jumps for shouts. */
G.VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5, glide: 0 },
  dazza: { base: 135, speed: 0.85, vib: 0, glide: 0 },
  priya: { base: 210, speed: 0.9, vib: 0, glide: 0 },
  edie: { base: 240, speed: 0.9, vib: 0, glide: 0 },
  basil: { base: 120, speed: 1, vib: 7, glide: 0 },
  mrs: { base: 220, speed: 1, vib: 0, glide: 0 },
  thrumpton: { base: 160, speed: 1, vib: 0, glide: .2 },
  players: { base: 170, speed: 1, vib: 0, glide: 0 }
};
G.FORMANTS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700] };
G.voice = {
  ctx: null,
  bus: null,
  busyUntil: 0,
  open() {
    const a = G.game.audio;
    if (!a || !a.ctx) return null;
    if (!this.bus) {
      this.bus = a.ctx.createGain();
      this.bus.gain.value = 0.35;
      const comp = a.ctx.createDynamicsCompressor ? a.ctx.createDynamicsCompressor() : null;
      if (comp) { this.bus.connect(comp); comp.connect(a.ctx.destination); } else this.bus.connect(a.ctx.destination);
    }
    return a.ctx;
  },
  // the syllables of a text: vowel groups, each with its consonant onset
  syllables(text) {
    const s = String(text).toLowerCase().replace(/[^a-z!?.,' ]/g, ' ');
    const out = [];
    const re = /([bcdfghjklmnpqrstvwxyz]*)([aeiouy]+)/g;
    let m, last = 0;
    while ((m = re.exec(s))) {
      const gap = s.slice(last, m.index);
      out.push({ onset: (m[1] || '').replace(/^\s+/, ''), vowel: m[2][0] === 'y' ? 'i' : m[2][0], pause: /[.,!?]/.test(gap) ? 'long' : /\s/.test(gap) ? 'space' : '' });
      last = m.index + m[0].length;
    }
    if (!out.length) out.push({ onset: '', vowel: 'a', pause: '' });
    const end = s.slice(last);
    out[out.length - 1].tail = /!/.test(end) ? '!' : /\?/.test(end) ? '?' : '';
    if (/!/.test(s)) out[out.length - 1].tail = '!';
    if (/\?/.test(s)) out[out.length - 1].tail = '?';
    return out;
  },
  say(text, who) {
    if (G.setting('voices') === 'Off') return;
    const ctx = this.open();
    if (!ctx) return;
    const P = G.VOICES[who] || G.VOICES.players;
    const now = ctx.currentTime;
    const start = Math.max(now + 0.02, this.busyUntil);
    if (start > now + 2.5) return;          // at most a couple of seconds queued: the rest are skipped
    const syl = this.syllables(text);
    let t = start, n = syl.length;
    syl.forEach((sy, i) => {
      const dur = (0.075 + Math.random() * 0.03) / P.speed;
      const decl = 1 - 0.12 * (i / Math.max(1, n - 1));
      let pitch = P.base * decl * (1 + (Math.random() - 0.5) * 0.08);
      if (sy.tail === '?' && i === n - 1) pitch *= 1.25;
      if (sy.tail === '!') pitch *= 1.3;
      if (sy.tail === '!' && i === n - 1) pitch *= 1.1;
      if (sy.pause === 'long') t += 0.12; else if (sy.pause === 'space') t += 0.03;
      this.syllable(ctx, t, dur, pitch, sy, P, sy.tail === '!' ? 0.9 : 0.7);
      t += dur * 1.05;
    });
    this.busyUntil = t;
  },
  syllable(ctx, t, dur, pitch, sy, P, vol) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, t);
    if (P.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = P.vib; lg.gain.value = pitch * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const [f1, f2] = G.FORMANTS[sy.vowel] || G.FORMANTS.a;
    const b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
    b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 6;
    b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 6;
    const sum = ctx.createGain(); sum.gain.value = 0.6;
    osc.connect(b1); osc.connect(b2); b1.connect(sum); b2.connect(sum);
    sum.connect(g); g.connect(this.bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.008);
    g.gain.setValueAtTime(vol * 0.5, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    osc.start(t); osc.stop(t + dur + 0.05);
    if (sy.onset && /^[ptkcbdgfsxhz]/.test(sy.onset)) {
      // a short burst for a plosive or a fricative onset
      const nz = ctx.createBufferSource(), buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      nz.buffer = buf; const ng = ctx.createGain(); ng.gain.value = 0.12; nz.connect(ng); ng.connect(this.bus); nz.start(t);
    }
  }
};
// the crowd: a roar is a noise through three band-pass filters that rises and falls; the bed murmurs under play
G.roar = (level = 1, seconds = 1.6) => {
  const ctx = G.voice.open();
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); const t = ctx.currentTime;
  const k = clamp(level, 0, 1) * 0.12;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(k, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  for (const f of [400, 900, 1800]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 2; src.connect(b); b.connect(g); }
  g.connect(G.voice.bus);
  src.start(t); src.stop(t + seconds);
};
G.crowdRoarFor = n => G.roar(clamp(n / 6, 0.2, 1), 1.2 + n * 0.1);

/* ---- AI HUB: a parallel Super Over (AI Hub Session Protocol v1). The copies share one seed: the six deliveries and the
 * batters' balls come from AIHub.rng('over') and AIHub.rng('deliveries'), so every copy faces the same balls whatever
 * the player does. The round sends a progress after each ball and one result. The card is the game's own. ---- */
G.HUB = { active: !!(globalThis.AIHub && globalThis.AIHub.active), info: null, card: null, cfg: null, started: false, resulted: false, ended: null, error: null, progressAt: 0, unsub: [] };
G.hubStart = () => {
  if (!G.HUB.active) return;
  const A = globalThis.AIHub;
  G.hubItemsOff();
  G.HUB.unsub.push(A.on('card', c => { G.HUB.card = c; }));
  G.HUB.unsub.push(A.on('start', () => { G.HUB.startAt = true; }));
  G.HUB.unsub.push(A.on('time-up', () => G.hubReportNow()));
  G.HUB.unsub.push(A.on('end', e => G.hubEnd(e)));
  A.connect({ mode: 'parallel', seats: [1, 4], card: true }).then(info => {
    if (!info) { G.HUB.active = false; G.hubItemsOn(); G.game.go('title'); return; }
    G.HUB.info = info;
    const over = A.rng('over'), del = A.rng('deliveries');
    const pool = ['express', 'outswing', 'inswing', 'legbreak', 'googly', 'bouncer', 'yorker', 'dobber', 'cutter', 'offbreak'];
    const machine = [];
    for (let i = 0; i < 6; i++) machine.push(pool[Math.floor(over() * pool.length)]);
    G.HUB.cfg = { teams: [0, 3], ground: 'green', overs: 1, wickets: 2, kerf: true, batFirst: 0, seed: Math.floor(info.seed % 100000) + 1,
      humanSides: [0], machine, deliveryRng: del, mode: 'hub', singleInnings: true };
    A.ready();
  }).catch(e => { G.HUB.error = String(e && e.message || e); });
};
G.hubItemsOff = () => { const mi = G.game.o && G.game.o.menu && G.game.o.menu.items; if (mi) mi.length = 0; };
G.hubItemsOn = () => { const mi = G.game.o && G.game.o.menu && G.game.o.menu.items; if (mi && !mi.length) mi.push(...G.pauseItems()); };
// the progress of the round, and its one result
G.hubProgress = m => {
  const I = m.I, s = I.runs;
  globalThis.AIHub.progress({ score: s, label: s + '/' + I.wkts + ' (' + I.legal + ' balls)' });
};
G.hubReportNow = () => {
  if (!G.HUB.active || G.HUB.resulted || !G.match) return;
  const m = G.match, I = m.innings[0];
  G.HUB.resulted = true;
  globalThis.AIHub.result({ score: I.runs, stats: { boundaries: m.stats.fours + m.stats.sixes, sixes: m.stats.sixes, wickets: I.wkts } });
};
G.hubRoundEnded = m => { G.hubReportNow(); G.game.go('hubwait'); };
G.hubEnd = e => {
  G.HUB.ended = e && e.reason || 'finished';
  G.hubFrozen = true;
  G.game.input.clear && G.game.input.clear();
  G.game.audio.stopMusic && G.game.audio.stopMusic(0.1);
  G.game.audio.mute && G.game.audio.mute(true);
  G.HUB.unsub.forEach(f => { try { f && f(); } catch (err) { /* the hub's remover is optional */ } });
};
// the card: the game's own, with its controls, the players and the time left
G.scenes.hubcard = {
  enter() { G.game.audio.music(G.SONG_TITLE); G.game.lights.enabled = false; },
  update(dt) {
    const I = G.game.input, A = globalThis.AIHub;
    if (G.hubFrozen) return;
    if (G.HUB.cfg && A) {
      if (A.time && A.time() >= 0 && !G.HUB.started) return G.hubBegin();
    }
    if (I.pressed('shot') || I.pressed('confirm')) { I.consumeAll(); A.answer('ready'); G.HUB.answered = 'ready'; }
    if (I.pressed('special')) { I.consumeAll(); A.answer('more'); }
    const click = I.clicked && I.clicked();
    if (click) {
      const [x, y] = click;
      if (x > G.game.W / 2 - 70 && x < G.game.W / 2 + 70 && y > G.game.H - 52 && y < G.game.H - 30) A.answer('ready');
      if (x > G.game.W / 2 - 70 && x < G.game.W / 2 + 70 && y > G.game.H - 28 && y < G.game.H - 14) A.answer('more');
    }
  },
  draw(r) {
    const c = G.HUB.card || {}, info = G.HUB.info;
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      E.font.title(g, 'CRICKET KERFUFFLE', r.W / 2, 12, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      E.font.text(g, 'MOST RUNS FROM ONE OVER WINS', r.W / 2, 44, '#ffe08a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, 'Six balls, two wickets, the same six balls for everyone.', r.W / 2, 58, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (!info) E.font.text(g, G.HUB.error ? 'CONNECTION ERROR' : 'CONNECTING TO THE HUB...', r.W / 2, 90, '#ffffff', { align: 'center', outline: '#0b0814' });
      const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
      (info ? info.players : []).forEach((p, k) => {
        const ready = c.ready && c.ready.indexOf(p.id) >= 0;
        E.font.text(g, (ready ? '* ' : '- ') + p.name, 20 + (k % 2) * 150, 80 + Math.floor(k / 2) * 14, colors[k % 4], { outline: '#0b0814' });
      });
      if (c.left !== undefined && c.left !== null) E.font.text(g, 'TIME LEFT ' + Math.ceil(c.left / 1000) + 'S', r.W / 2, 116, '#ffffff', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (c.paused) E.font.text(g, 'PAUSED: MOST PLAYERS WANT MORE TIME', r.W / 2, 128, '#ffd23a', { align: 'center', font: 'tiny', outline: '#0b0814' });
      if (c.starting) E.font.text(g, 'STARTING...', r.W / 2, 128, '#5fd38a', { align: 'center', outline: '#0b0814' });
      E.font.text(g, 'YOUR CONTROLS: ' + G.hubControls(), r.W / 2, r.H - 66, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      px.rect(g, r.W / 2 - 70, r.H - 52, 140, 22, '#2f6b3a'); E.font.text(g, 'READY', r.W / 2, r.H - 46, '#ffffff', { align: 'center', outline: '#0b0814' });
      px.rect(g, r.W / 2 - 70, r.H - 28, 140, 14, '#2a2634'); E.font.text(g, 'MORE TIME', r.W / 2, r.H - 25, '#e8e0f0', { align: 'center', font: 'tiny', outline: '#0b0814' });
      G.promptRow(g, [['shot', 'READY'], ['special', 'MORE TIME']], 10, r.H - 10);
    });
  }
};
G.hubControls = () => [G.game.input.label('shot'), G.game.input.label('loft'), G.game.input.label('run')].join(' ') + ' - stick aims';
G.hubBegin = () => {
  G.HUB.started = true;
  G.startMatch(G.HUB.cfg, { hub: true, onUpdate: dt => {
    if (!G.match || G.hubFrozen) return;
    if (G.match.log.length !== G.HUB.lastLog) { G.HUB.lastLog = G.match.log.length; G.hubProgress(G.match); }
  } });
};
G.scenes.hubwait = {
  enter() { G.game.lights.enabled = false; },
  draw(r) {
    r.sky(['#2a2052', '#4a3a72']);
    r.overlay(g => {
      const endTxt = G.hubFrozen ? (G.HUB.ended === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER') : 'WAITING FOR THE OTHERS...';
      E.font.title(g, endTxt, r.W / 2, r.H / 2 - 30, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' });
      const m = G.match;
      if (m && m.innings[0]) E.font.text(g, 'Your score: ' + m.innings[0].runs + ' from one over', r.W / 2, r.H / 2 + 10, '#ffffff', { align: 'center', outline: '#0b0814' });
    });
  }
};

/* ---- DEV MODE: opened from the pause menu, or with the Backquote key during a match. A full-screen panel over the
 * paused match: live sliders for the gameplay variables (with a reset to defaults), toggles for play aids, jumps to
 * the situations the tests and balance passes need, and the match's snapshot. Values apply at once. ---- */
G.devFlags = { slow: false, autoBat: false, autoBowl: false, infiniteHype: false, noChaos: false, muteCommentary: false, trajectory: false, invincible: false };
G.TOGGLE_DEFS = [
  ['slow', 'Slow motion (0.35x)'], ['autoBat', 'Auto-bat (the CPU bats for you)'], ['autoBowl', 'Auto-bowl (the CPU bowls for you)'],
  ['infiniteHype', 'Infinite Hype'], ['noChaos', 'No chaos events'], ['muteCommentary', 'Mute commentary'],
  ['trajectory', 'Show the predicted ball path'], ['invincible', 'Invincible batter (no wickets)']
];
G.dev = {
  open: false, tab: 0, row: 0, dragging: null,
  tabs: ['TUNING', 'TOGGLES', 'JUMP', 'INFO'],
  toggle() { this.open ? this.close() : this.show(); },
  show() {
    this.open = true; this.row = 0; this.tab = 0;
    if (G.match && G.match.phase === 'flight') G.match.dev_wasFlight = true;
    if (G.game.paused) G.game.resume();
    G.game.audio.sfx('select', { vol: .3 });
  },
  openFromPause() { this.show(); },
  close() { this.open = false; G.game.audio.sfx('cancel', { vol: .3 }); },
  rows() {
    if (this.tab === 0) return [{ kind: 'reset', label: 'RESET ALL TO DEFAULTS' }].concat(G.TUNE_DEFS.map(d => ({ kind: 'slider', def: d })));
    if (this.tab === 1) return G.TOGGLE_DEFS.map(([k, l]) => ({ kind: 'toggle', key: k, label: l }));
    if (this.tab === 2) return [
      { kind: 'act', label: 'SKIP TO THE LAST OVER', fn: () => { const I = G.match.I; I.over = Math.max(0, I.overs - 1); } },
      { kind: 'act', label: 'ADD 20 RUNS', fn: () => { G.match.I.runs += 20; } },
      { kind: 'act', label: 'FULL HYPE FOR BOTH SIDES', fn: () => { G.match.hype = [100, 100]; } },
      { kind: 'act', label: 'TRIGGER A RAIN DELAY (2ND INNINGS)', fn: () => { if (G.match.I.k === 1) { G.match.rainUsed = false; G.match.chaosNow = 'rain'; G.match.setPhase('setup', 0.2); } } },
      { kind: 'act', label: 'TRIGGER DORIS THE COW', fn: () => { G.match.chaosNow = 'cow'; G.match.setPhase('setup', 0.2); } },
      { kind: 'act', label: 'SPAWN AN ITEM', fn: () => { G.match.items[G.match.battingSide] = null; G.match.spawnItem(); } },
      { kind: 'act', label: 'UNLOCK ALL TEAMS', fn: () => { const P = G.profile(); P.unlocks = G.TEAMS.map((_, i) => i); G.saveProfile(P); } },
      { kind: 'act', label: 'WIN THE CHAPTER (STORY)', fn: () => { G.match.phase = 'end'; G.match.result = { kind: 'chase', winner: 0, wicketsLeft: 1, margin: 0, A: 0, B: 0 }; G.matchEnded(G.match); } }
    ];
    return [
      { kind: 'info', label: 'SCENE ' + G.game.sceneName },
      { kind: 'info', label: 'PHASE ' + (G.match ? G.match.phase : '-') + '  t ' + (G.match ? G.match.t.toFixed(1) : '') },
      { kind: 'info', label: 'SCORE ' + (G.match ? G.match.I.runs + '/' + G.match.I.wkts + ' (' + G.match.I.legal + ' legal)' : '-') },
      { kind: 'info', label: 'LAST BALL ' + (G.lastBall ? G.lastBall.reason + ' ' + G.lastBall.grade + ' ' + G.lastBall.delivery : '-') },
      { kind: 'info', label: 'BAKED FLOORS ' + (G.map && G.map.floors ? G.map.floors.size || Object.keys(G.map.floors).length : '-') },
      { kind: 'info', label: 'TUNING CHANGED ' + G.tuneChanged().length }
    ];
  },
  update(dt) {
    const I = G.game.input;
    const rows = this.rows();
    if (I.pressed('cancel') || I.pressed('pause') || I.pressed('block')) { I.consumeAll(); return this.close(); }
    if (I.pressed('run')) { this.tab = (this.tab + 1) % this.tabs.length; this.row = 0; }
    if (I.pressed('up')) this.row = (this.row + rows.length - 1) % rows.length;
    if (I.pressed('down')) this.row = (this.row + 1) % rows.length;
    const row = rows[this.row];
    const dir = I.pressed('right') ? 1 : I.pressed('left') ? -1 : (I.repeat && (I.repeat('right', .4, .1) ? 1 : I.repeat('left', .4, .1) ? -1 : 0)) || 0;
    if (row && row.kind === 'slider' && dir) {
      const d = row.def;
      G.tuneSet(d.key, G.tune[d.key] + dir * d.step * (I.down('shot') ? 5 : 1));
    }
    if (row && (I.pressed('confirm') || I.pressed('shot'))) {
      if (row.kind === 'reset') { G.tuneReset(); G.game.audio.sfx('confirm', { vol: .4 }); }
      else if (row.kind === 'toggle') { G.devFlags[row.key] = !G.devFlags[row.key]; G.devApply(); }
      else if (row.kind === 'act') row.fn();
      else if (row.kind === 'slider') G.tuneSet(row.def.key, G.tune[row.def.key] === row.def.def ? row.def.def : row.def.def);
    }
    if (row && row.kind === 'slider' && I.pressed('block')) G.tuneSet(row.def.key, row.def.def);
    G.devApply();
    I.consumeAll();
  },
  draw(r) {
    const rows = this.rows();
    r.overlay(g => {
      px.rect(g, 0, 0, r.W, r.H, '#07060dee');
      E.font.text(g, 'DEV MODE', 8, 6, '#ffe08a', { scale: 2, outline: '#0b0814' });
      this.tabs.forEach((t, k) => E.font.text(g, t, 120 + k * 52, 10, k === this.tab ? '#ffffff' : '#7a7498', { font: 'tiny', outline: '#0b0814' }));
      const top = Math.max(0, this.row - 9);
      rows.slice(top, top + 13).forEach((row, k) => {
        const idx = top + k, y = 30 + k * 13, sel = idx === this.row;
        if (sel) px.rect(g, 6, y - 2, r.W - 12, 12, '#2f2a52');
        const label = row.kind === 'slider' ? row.def.label : row.label || '';
        E.font.text(g, label, 12, y, sel ? '#ffe08a' : '#e8e0f0', { font: 'tiny', outline: '#0b0814' });
        if (row.kind === 'slider') {
          const d = row.def, v = G.tune[d.key], k2 = (v - d.min) / (d.max - d.min);
          const bx = Math.round(r.W * 0.52), bw = Math.round(r.W * 0.25);
          px.rect(g, bx, y + 2, bw, 3, '#2a2634'); px.rect(g, bx, y + 2, Math.round(bw * clamp(k2, 0, 1)), 3, v === d.def ? '#7a7498' : '#ffd23a');
          E.font.text(g, String(+v.toFixed(3)) + (v === d.def ? '' : ' (def ' + d.def + ')'), r.W - 12, y, v === d.def ? '#c8c0e0' : '#ffe08a', { font: 'tiny', align: 'right', outline: '#0b0814' });
        }
        if (row.kind === 'toggle') E.font.text(g, G.devFlags[row.key] ? 'ON' : 'OFF', r.W - 12, y, G.devFlags[row.key] ? '#5fd38a' : '#8a8498', { font: 'tiny', align: 'right', outline: '#0b0814' });
      });
      G.promptRow(g, [['shot', 'CHANGE'], ['pause', 'CLOSE'], ['run', 'NEXT TAB']], 6, r.H - 12);
    });
  }
};
// the toggles reach the match: slow motion, the auto play, hype, chaos and the commentary's voices
G.devApply = () => {
  const f = G.devFlags, m = G.match;
  G.game.timeScale = 1;
  G.slowT = f.slow ? 1e9 : (G.slowT && G.slowT > 1e8 ? 0 : G.slowT);
  if (!m) return;
  m.cfg.autoBat = !!(f.autoBat || (m.cfg.mode === 'attract'));
  m.cfg.autoBowl = !!(f.autoBowl || (m.cfg.mode === 'attract'));
  if (f.infiniteHype) m.hype = [100, 100];
  m.cfg.noChaos = !!f.noChaos;
  m.cfg.invincible = !!f.invincible;
  if (f.noChaos) m.chaosNow = null;
};
G.pauseItems = () => [
  ['Restart match', () => { if (G.cfg && G.game.sceneName === 'match') G.startMatch(G.cfg, G.matchOpts); }],
  ['Dev mode', () => G.dev.openFromPause()]
];

/* ---- THE TEST HANDLE: game.debug, read by the headless suites and by the dev panel. It reports the state a test
 * needs and drives the match with the same inputs a person would use. ---- */
G.debugHandle = {
  snapshot() {
    const m = G.match;
    const I = m ? m.I : null;
    return {
      scene: game.sceneName,
      mode: m ? m.cfg.mode : null,
      ui: { device: game.input.lastDevice, glyphs: G.setting('buttons'), touchGate: G.touchOnly() },
      match: m ? { innings: I.k, runs: I.runs, wkts: I.wkts, balls: I.legal, over: I.over, ballInOver: I.ballInOver, target: I.target,
        striker: m.striker ? m.batterName(m.striker) : null, bowler: m.bowlerName(), hype: m.hype.slice(), fire: m.fire.slice(), phase: m.phase, result: m.result ? m.result.kind : null,
        review: m.review.slice(), freeHit: !!m.freeHit } : null,
      ball: m && m.ball ? { phase: m.ball.phase, x: Math.round(m.ball.x), y: Math.round(m.ball.y), z: Math.round(m.ball.z * 10) / 10, speed: Math.round(m.ball.speed || 0), pitched: m.ball.pitched } : null,
      last: m && m.log.length ? m.log[m.log.length - 1] : null,
      logLen: m ? m.log.length : 0,
      deliveries: m ? m.log.slice(0, 3).map(r => r.delivery + '@' + r.kmh) : [],
      coverage: m ? Object.assign({}, m.coverage) : {},
      stats: m ? Object.assign({}, m.stats) : {},
      dev: { open: G.dev.open, flags: Object.assign({}, G.devFlags) },
      attract: { seg: G.attractSeg, note: G.attractNote || null },
      hub: { active: G.HUB.active, started: G.HUB.started, resulted: G.HUB.resulted, ended: G.HUB.ended },
      story: { chapter: G.profile().chapter, stars: G.profile().stars.slice() },
      toss: G.tossStage || null,
      clips: (G.highlights || []).length,
      timing: m ? { until: m.arriveAbs !== null ? +(m.arriveAbs - m.t).toFixed(3) : null, meter: m.delivery ? +m.delivery.meter.toFixed(3) : null, dt: m.delivery ? +(m.delivery.t).toFixed(3) : null, dur: m.delivery ? m.delivery.dur : null, ringT: m.catchRing ? +m.catchRing.t.toFixed(3) : null, held: !!m.humanFieldHold, reviewable: !!m.reviewable, hype: m.hype.slice(), lesson: G.lessonPass === undefined ? null : G.lessonPass, sceneTime: G.game.time } : null,
      fielders: m ? m.fielders.filter(f => f.human).map(f => [Math.round(f.x), Math.round(f.y)]) : [],
      ballXY: m && m.ball ? [Math.round(m.ball.x), Math.round(m.ball.y), Math.round(m.ball.z * 10) / 10] : null,
      inputs: game.players ? game.players.length : 1,
      rigs: G._rigs ? Object.keys(G._rigs).length : 0,
      batHand: G._rigs && G._rigs.bat0 ? G._rigs.bat0.hand('R').map(v => Math.round(v * 10) / 10) : null,
      batPos: G.match && G.match.striker ? [G.W.PX + 8, G.match.striker.y] : null,
      errors: game.errors.length
    };
  },
  // the step that presses a shot for a PERFECT on the current delivery
  idealPress() { const m = G.match; if (!m || m.phase !== 'flight' || m.arriveAbs === null) return null; return m.arriveAbs - G.game.time - 0.12; },
  startMatch(cfg, opts) { G.startMatch(cfg, opts || {}); },
  lesson: id => G.startLesson(G.LESSONS.find(l => l.id === id)),
  chapter: id => { G.chapter = G.CHAPTERS.find(c => c.id === id); G.game.go('chapterMatch'); },
  tune: (k, v) => G.tuneSet(k, v),
  tuneRead: k => G.T(k),
  // the light state the play tests read every step: the phase, the timing, the balls, the human fielders
  live: () => {
    const m = G.match;
    if (!m) return { scene: game.sceneName };
    return { scene: game.sceneName, phase: m.phase, logLen: m.log.length, until: m.arriveAbs !== null ? m.arriveAbs - m.t : null,
      dt: m.delivery ? m.delivery.t : null, dur: m.delivery ? m.delivery.dur : null, meter: m.delivery ? m.delivery.meter : null,
      ring: !!m.catchRing, ringT: m.catchRing ? m.catchRing.t : null, held: !!m.humanFieldHold, reviewable: !!m.reviewable, ball: m.ball ? [m.ball.x, m.ball.y, m.ball.z] : null,
      fielders: m.fielders.filter(f => f.human).map(f => [f.x, f.y]), balls: m.I ? m.I.legal : 0, innings: m.I ? m.I.k : -1,
      lesson: G.lessonPass === undefined ? null : G.lessonPass, scoreRuns: m.I ? m.I.runs : 0, throws: m.stats.throws, hype: m.hype.slice() };
  },
  // the screens a person sees only at a review, a close run-out or a replay: set up for a screenshot or a check
  thirdUmpire: out => { G.thirdUmpire = { out: !!out, margin: 40, name: 'Edie Pluckrose', t: 0 }; },
  owlEye: () => {
    const m = G.match;
    m.reviewable = { batter: m.striker, call: 'notout', truth: 'out', side: m.battingSide, how: 'lbw' };
    m.pitchAt = { x: G.W.PX + 4, y: G.W.BAT_CREASE + 110, z: 0 };
    m.setPhase('dead', 4);
    m.phase = 'dead';
  },
  replay: () => G.requestReplay(3, 'SIX'),
  initials: score => { G.game.go('initials', { mode: 'bat', score }); },
  highlights: () => { G.game.go('highlights'); },
  attractSegment: () => G.attractSeg,
  humans: () => [G.humansOf(0).length, G.humansOf(1).length],
  replays: () => ({ playing: !!G.replay, clips: (G.highlights || []).length, thirdUmpire: !!G.thirdUmpire }),
  table: (mode, score) => G.tableQualifies(mode, score),
  tableRows: mode => G.tableOf(mode).length,
  profile: () => G.profile(),
  glyph: action => ({ xbox: G.setting('buttons') !== 'PlayStation', letter: G.xboxGlyph(action), ps: G.PS[action] || 'cross' }),
  aim: () => G.aimHeld,
  marker: () => (G.marker ? [G.marker.x, G.marker.y] : null),
  pointerGround: () => (G.game.mouseGround ? G.game.mouseGround() : null),
  setProfile: p => G.saveProfile(p),
  openStory: () => G.openStory(),
  unlockedTeams: () => G.unlockedTeams(),
  recordMatch: m => G.recordMatch(m),
  setupAway: () => (G.setupState ? G.setupState.away : null),
  aboutTitles: () => G.ABOUT.map(p => p.title),
  setLayout: l => { G.layout = l; },
  tuneReset: () => G.tuneReset(),
  openDev: () => G.dev.show(),
  closeDev: () => G.dev.close(),
  bowl: (key, target) => G.match && G.match.startRunup({ key, target: target || { x: G.W.PX, y: G.W.BAT_CREASE + 90 }, cpu: false, fam: (G.DELIVERIES[key] || {}).fam }),
  release: q => G.match && G.match.release(q || 'green')
};

/* ---- START: the scenes, the views, the boot steps and the hub. This file runs last. ---- */
G.makeViews();
G.defineSounds();
G.scenes.match.view = G.view;
G.scenes.attract.view = G.view;
const SCENES = Object.assign({}, G.scenes);
SCENES.attract.pausable = false;
G.game.o.menu.items.push(...G.pauseItems());
G.game.debug = G.debugHandle;
// the Backquote key opens the dev panel during a match (keyboard only, not rebindable)
addEventListener('keydown', e => { if (e.code === 'Backquote' && !e.repeat && G.game.sceneName === 'match') G.dev.toggle(); });
G.game.start({
  scenes: SCENES,
  scene: G.HUB.active ? 'hubcard' : 'title',
  boot: {
    title: 'CRICKET KERFUFFLE', version: G.VERSION,
    steps: [
      ['Mowing the outfield', () => { G.makeWorld(); }],
      ['Rolling the pitch', () => { G.tuneLoad(); }],
      ['Whitening the creases', () => { G.voice.open && G.voice.open(); }],
      ['Brewing the tea', () => { G.profile(); }]
    ],
    messages: ['Polishing the ball on a trouser leg', 'Counting the crowd\'s umbrellas', 'Finding the vicar\'s spectacles']
  }
});
G.hubStart();

})();
