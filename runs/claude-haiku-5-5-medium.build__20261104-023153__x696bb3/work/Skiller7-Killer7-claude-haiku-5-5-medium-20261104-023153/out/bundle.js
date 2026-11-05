(() => {
'use strict';
const E = globalThis.My3D2dge;   // the 2D engine's namespace (loaded first)
// ---- src/00-core.js
/* Skiller7: core. Namespace, units, the tuning table (the dev mode's sliders), and the data registries (personas,
 * weapons, Whiteouts, bosses). The sim works in metres, z up; the presenter turns metres into engine units (16 a metre). */
const S7 = {};
globalThis.S7 = S7;
S7.VERSION = '1.0.0';
S7.TITLE = 'SKILLER7';
S7.TAG = 'Seven Killers, One Mountain';
S7.M = 16;                         // engine units per metre
S7.STEP = 1 / 120;

S7.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
S7.lerp = (a, b, t) => a + (b - a) * t;
S7.approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
S7.wrapAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
S7.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ---- tuning: every number the dev mode exposes. value is the live value; def the default ---- */
S7.TUNING = {
  heroHP:     { def: 6,   min: 2,   max: 12,  step: 1,    label: 'Hero HP (half hearts)', group: 'Persona' },
  walkSpeed:  { def: 2.4, min: 0.8, max: 5,   step: 0.1,  label: 'Walk speed (m/s)', group: 'Persona' },
  aimSpeed:   { def: 1.4, min: 0.4, max: 3,   step: 0.1,  label: 'Aim turn speed', group: 'Persona' },
  dmgMult:    { def: 1,   min: 0.25, max: 4,  step: 0.25, label: 'Weapon damage x', group: 'Weapons' },
  ammoMult:   { def: 1,   min: 0.25, max: 4,  step: 0.25, label: 'Magazine size x', group: 'Weapons' },
  fireRate:   { def: 1,   min: 0.5, max: 2,   step: 0.1,  label: 'Fire rate x', group: 'Weapons' },
  coneMult:   { def: 1,   min: 0.25, max: 3,  step: 0.25, label: 'Aim cone x', group: 'Weapons' },
  enemyCount: { def: 1,   min: 0,   max: 2,   step: 0.25, label: 'Whiteouts per wave x', group: 'Whiteouts' },
  enemyWarn:  { def: 1.4, min: 0.4, max: 3,   step: 0.1,  label: 'Laugh warning (s)', group: 'Whiteouts' },
  blastR:     { def: 2.4, min: 1,   max: 5,   step: 0.2,  label: 'Blast radius (m)', group: 'Whiteouts' },
  blastDmg:   { def: 2,   min: 1,   max: 4,   step: 1,    label: 'Blast damage', group: 'Whiteouts' },
  scanRange:  { def: 16,  min: 6,   max: 30,  step: 1,    label: 'Scan range (m)', group: 'Scan' },
  scanTime:   { def: 3,   min: 1,   max: 8,   step: 0.5,  label: 'Scan reveal (s)', group: 'Scan' },
  redDrops:   { def: 1,   min: 0,   max: 3,   step: 0.25, label: 'Red drop rate x', group: 'Economy' },
  rimeMult:   { def: 1,   min: 0,   max: 3,   step: 0.25, label: 'Rime reward x', group: 'Economy' },
  bossHP:     { def: 1,   min: 0.25, max: 3,  step: 0.25, label: 'Boss HP x', group: 'Bosses' },
  slopeSpeed: { def: 1,   min: 0.5, max: 2,   step: 0.1,  label: 'Ski speed x', group: 'Ski' },
  gameSpeed:  { def: 1,   min: 0.25, max: 2,  step: 0.25, label: 'Game speed x', group: 'Dev' }
};
S7.live = {};
S7.resetTuning = () => { for (const k in S7.TUNING) S7.live[k] = S7.TUNING[k].def; };
S7.resetTuning();
S7.cheats = { god: false, ammo: false, reveal: false };

/* ---- personas: Oma Holle's seven. Each one is a body in a coat and a weapon with a field ability ---- */
S7.PERSONAS = {
  patrol: { name: 'SKI PATROL', who: 'Pieter Holle', weapon: 'rifle', ability: 'flare', abilityName: 'FLARE',
    abilityDesc: 'Bursts a flare: stuns every Whiteout ahead for 3 seconds.', hat: 'helmet', hatColor: '#c8282e',
    colors: { cloth: '#c8282e', coat: '#e8e4dc', pants: '#2a2630', boot: '#1e1a20', trim: '#f0c020', skin: '#e9b58e', hair: '#5a3a24' }, acc: { scarf: '#f0c020' }, unlock: 0 },
  racer: { name: 'DOWNHILL RACER', who: 'Anja Holle', weapon: 'smg', ability: 'tuck', abilityName: 'TUCK',
    abilityDesc: 'Crouches into a tuck: double speed on the slope for 4 seconds.', hat: 'helmet', hatColor: '#1f5fd6',
    colors: { cloth: '#1f5fd6', coat: '#1f5fd6', pants: '#101418', boot: '#d8d8d8', trim: '#ffd23a', skin: '#f0c2a0', hair: '#c04a18' }, acc: { goggles: true }, unlock: 0 },
  baron: { name: 'TELEMARK BARON', who: 'Count Rurik', weapon: 'pistol', ability: 'longlook', abilityName: 'LONG LOOK',
    abilityDesc: 'Holds a long look: time crawls while you aim.', hat: 'band', hatColor: '#3a2a20',
    colors: { cloth: '#3a2a20', coat: '#3a2a20', pants: '#2a2220', boot: '#16120e', trim: '#c9a040', skin: '#f2d0b0', hair: '#eaeaea' }, acc: { moustache: true }, unlock: 0 },
  tycoon: { name: 'FUR TYCOON', who: 'Mister Gerhardt', weapon: 'shotgun', ability: 'buyout', abilityName: 'BUYOUT',
    abilityDesc: 'Throws a fistful of Rime into the air. Every crystal is yours.', hat: 'cap', hatColor: '#8a5a2a',
    colors: { cloth: '#8a5a2a', coat: '#8a5a2a', pants: '#2a1e16', boot: '#140e0a', trim: '#f0d060', skin: '#e0b090', hair: '#2a1a10' }, acc: { beard: '#2a1a10' }, unlock: 'bellcaptain' },
  yodeler: { name: 'YODELER', who: 'Hansi Mooser', weapon: 'pistol', ability: 'echo', abilityName: 'ECHO',
    abilityDesc: 'Yodels. Every Whiteout within earshot is revealed for 4 seconds.', hat: 'pointed', hatColor: '#2f7a3a',
    colors: { cloth: '#2f7a3a', coat: '#2f7a3a', pants: '#5a3a20', boot: '#2a1a10', trim: '#e0c060', skin: '#f5cfa8', hair: '#8a6a3a' }, acc: { scarf: '#c83a3a' }, unlock: 'bellcaptain' },
  photog: { name: 'PRESS PHOTOGRAPHER', who: 'Lotte Grau', weapon: 'smg', ability: 'flashbulb', abilityName: 'FLASHBULB',
    abilityDesc: 'Fires a flashbulb: blinds Whiteouts in front and reveals them.', hat: 'cap', hatColor: '#3a3a44',
    colors: { cloth: '#3a3a44', coat: '#3a3a44', pants: '#20202a', boot: '#101014', trim: '#f0f0f0', skin: '#f0c8b0', hair: '#1a1a1a' }, acc: { goggles: true }, unlock: 'powderking' },
  avalanche: { name: 'AVALANCHE ENGINEER', who: 'Doktor Lawine', weapon: 'shotgun', ability: 'charge', abilityName: 'CHARGE',
    abilityDesc: 'Charges the next shot: three times the damage.', hat: 'helmet', hatColor: '#f0a020',
    colors: { cloth: '#f0a020', coat: '#f0a020', pants: '#3a3a40', boot: '#141418', trim: '#202020', skin: '#e8b890', hair: '#606060' }, acc: { goggles: true }, unlock: 'powderking' }
};
S7.ROSTER = ['patrol', 'racer', 'baron', 'tycoon', 'yodeler', 'photog', 'avalanche'];

/* ---- weapons. dmg: hearts of damage on a body hit (a warm spot kills outright). cone: aim cone in degrees
 * (the first-person aim tolerance). range: metres. rate: shots a second. mag: rounds. reload: seconds. ---- */
S7.WEAPONS = {
  pistol:  { name: 'PISTOL',  dmg: 2, cone: 2.2, range: 46, rate: 3.2, mag: 12, reload: 1.1, pellets: 1, kick: .4 },
  rifle:   { name: 'RIFLE',   dmg: 3, cone: 0.9, range: 90, rate: 1.4, mag: 5,  reload: 1.8, pellets: 1, kick: 1.1 },
  smg:     { name: 'SMG',     dmg: 1, cone: 4.2, range: 30, rate: 9,   mag: 30, reload: 1.5, pellets: 1, kick: .25 },
  shotgun: { name: 'SHOTGUN', dmg: 3, cone: 6.5, range: 14, rate: 1.1, mag: 6,  reload: 2.2, pellets: 4, kick: 1.3 }
};

/* ---- Whiteouts: the invisible laughing ones. warm: the warm spot's height, r: its size (metres). warn: laugh before
 * the blast. speed: metres a second along the rail. ---- */
S7.ENEMIES = {
  giggler: { name: 'GIGGLER', hp: 1, speed: 1.5, warm: 1.7, r: .22, arm: 3.2, dmg: 1, hat: 'pointed', hatColor: '#d8d8e8',
    colors: { cloth: '#e8e8f4', coat: '#e8e8f4', pants: '#9aa4b8', boot: '#5a6070', skin: '#f4e6dc', hair: '#c8c8d8' }, laugh: 'hi' },
  cackler: { name: 'CACKLER', hp: 1, speed: 2.6, warm: 1.6, r: .2, arm: 3.0, dmg: 1, hat: 'cap', hatColor: '#c8d4ff',
    colors: { cloth: '#bccbff', coat: '#bccbff', pants: '#5a6a8a', boot: '#2a3040', skin: '#f0e0d8', hair: '#e8e8ff' }, laugh: 'hoo' },
  brute: { name: 'BRUTE', hp: 3, speed: .9, warm: 1.9, r: .3, arm: 3.6, dmg: 2, hat: 'helmet', hatColor: '#dadff0',
    colors: { cloth: '#d0d6e8', coat: '#d0d6e8', pants: '#7a8294', boot: '#40465a', skin: '#e6d0c0', hair: '#9aa0b0' }, laugh: 'ha', bulky: true }
};

/* ---- wave tables: which Whiteouts a wave brings ---- */
S7.WAVES = {
  ballroom: [['giggler', 0], ['giggler', 1.2], ['cackler', 2.2], ['giggler', 3.0], ['cackler', 4.2]],
  stairs:   [['cackler', 0], ['giggler', 1.0], ['brute', 2.5], ['cackler', 3.5]],
  lane:     [['giggler', 0], ['giggler', .8], ['cackler', 1.6], ['giggler', 2.4]],
  slope:    [['cackler', 0], ['cackler', 1.2], ['giggler', 2.4]],
  shaft:    [['giggler', 0], ['cackler', .9], ['giggler', 1.8], ['brute', 2.6]],
  plateau:  [['giggler', 0], ['cackler', .8], ['brute', 1.6], ['giggler', 2.8], ['cackler', 3.4]]
};

/* ---- bosses. hp in warm-spot hits (a warm spot hit is worth 2). id names the presenter's model. ---- */
S7.BOSSES = {
  bellcaptain: { name: 'THE BELLCAPTAIN', hp: 8, title: 'Hotel Bell', pulseEvery: 4.5, spawnEvery: 6.5, pulseR: 4.2, pulseDmg: 1,
    line: 'Ding. Ding. The lift is serviced, sir. Mind the gap.' },
  powderking: { name: 'THE POWDER KING', hp: 10, title: 'Snow Colossus', pulseEvery: 3.8, spawnEvery: 5.5, pulseR: 5, pulseDmg: 1,
    line: 'Ho ho! Is it cold? I am melting! It is wonderful!' }
};

/* ---- the scoring of a target: the rank cut-offs (seconds for the time score; ranks S A B C) ---- */
S7.RANKS = [['S', 0.9], ['A', 0.7], ['B', 0.45], ['C', 0]];

/* ---- seeded random streams (the engine's E.rng): the same seed gives the same run ---- */
S7.streams = {};
S7.seed = (n) => {
  S7.streams.spread = E.rng(n * 7 + 1);   // shot spread
  S7.streams.laugh = E.rng(n * 7 + 2);    // laughter timing
  S7.streams.drop = E.rng(n * 7 + 3);     // Red drops
};
S7.seed(1);

// ---- src/10-levels.js
/* Skiller7: areas. Each area is data: floor rooms (tile rectangles, inclusive), rails (legs: polylines in metres, tile
 * centres, with the legs they lead to), camera shots per leg, waves, pickups, gates and the boss. Walls are the tiles
 * no room covers. Terrain areas (the slope) give their ground from a height function instead of rooms.
 * x is east, y is south (metres, tile centres at .5), z is up. */
S7.AREAS = {};

/* ---- Room 7: the save room. Sister Rosalind, the Cuckoo Clock, the Wardrobe, the Wax Bench, a bed under a mountain ---- */
S7.AREAS.room7 = {
  id: 'room7', title: 'ROOM 7', sub: 'PIZ NADA SANATORIUM, TOP FLOOR', kind: 'room', music: 'room7',
  size: [16, 12], rooms: [[1, 1, 14, 10]], ground: 'planks', side: 'block', start: 'idle',
  legs: { idle: { pts: [[7.5, 6.5], [8.5, 6.5]], next: [], shots: [] } },
  colors: { base: '#5a3f32', dark: '#3e2a22', light: '#7a5a48' }, wallColor: '#7a2a30', sky: '#0a0608',
  fog: { color: '#120a0c', near: 18, far: 60 },
  cam: { at: [6.6, 1.5, 3.1], fov: 58 }, lookAt: [8, 6, 1.6],
  props: [ ['bed', 4, 3.2, 0], ['clock', 12.2, 2.4, 0], ['wardrobe', 12.5, 6.5, 0], ['bench', 8, 9, 0] ]
};

/* ---- Target 00: the Grand Hotel Nada. Lobby, a junction (north: the ballroom; south: the stairs), the elevator shaft. ---- */
S7.AREAS.t00 = {
  id: 't00', title: 'TARGET 00', sub: 'GRAND HOTEL NADA', kind: 'rail', music: 'hotel', target: 0,
  size: [44, 24],
  rooms: [
    [2, 8, 12, 16],   // lobby
    [13, 11, 22, 12], // corridor
    [23, 9, 27, 14],  // junction hall
    [23, 2, 34, 7],   // ballroom
    [24, 8, 26, 8],   // ballroom link
    [35, 5, 35, 6],   // ballroom to shaft
    [25, 15, 26, 16], // stairs link
    [23, 17, 30, 22], // stairs
    [31, 19, 35, 20], // stair corridor
    [36, 4, 42, 21]   // elevator shaft hall
  ],
  start: 'lobby',
  legs: {
    lobby: { pts: [[3.5, 12.5], [12.5, 11.5], [22.5, 11.5], [25.5, 11.5]], next: ['north', 'south'], junction: true,
      shots: [ { from: 0, at: [2.5, 14.5, 3.4], fov: 56 }, { from: .5, at: [12.8, 11.6, 2.6], fov: 52 } ] },
    north: { pts: [[25.5, 11.5], [25.5, 8.5], [30.5, 5.5], [35.5, 5.5], [37.5, 6.5]], next: ['shaftN'],
      shots: [ { from: 0, at: [24.5, 14.2, 3.6], fov: 50 }, { from: .55, at: [33.5, 3.2, 3.4], fov: 54 } ] },
    south: { pts: [[25.5, 11.5], [25.5, 15.5], [25.5, 18.5], [30.5, 19.5], [33.5, 19.5], [37.5, 19.5]], next: ['shaftS'],
      shots: [ { from: 0, at: [23.5, 13.0, 3.0], fov: 52 }, { from: .6, at: [24.0, 18.0, 3.6], fov: 52 } ] },
    shaftN: { pts: [[37.5, 6.5], [38.5, 11.5], [39.5, 16.5]], next: [], boss: 'bellcaptain',
      shots: [ { from: 0, at: [36.5, 9.5, 2.8], fov: 56 } ] },
    shaftS: { pts: [[37.5, 19.5], [39.5, 16.5]], next: [], boss: 'bellcaptain',
      shots: [ { from: 0, at: [40.5, 20.0, 2.6], fov: 56 } ] }
  },
  waves: [
    { leg: 'lobby', at: .35, wave: 'lane' },
    { leg: 'north', at: .3, wave: 'ballroom' },
    { leg: 'north', at: .75, wave: 'ballroom' },
    { leg: 'south', at: .3, wave: 'stairs' },
    { leg: 'shaftN', at: .3, wave: 'shaft' },
    { leg: 'shaftS', at: .3, wave: 'shaft' }
  ],
  pickups: [
    { id: 't00-r1', leg: 'lobby', at: .9, kind: 'red' },
    { id: 't00-m1', leg: 'north', at: .15, kind: 'rime' },
    { id: 't00-r2', leg: 'south', at: .5, kind: 'red' },
    { id: 't00-m2', leg: 'south', at: .88, kind: 'rime' },
    { id: 't00-r3', leg: 'north', at: .92, kind: 'red' },
    { id: 't00-note1', leg: 'lobby', at: .6, kind: 'note', note: 'note-lift' },
    { id: 't00-note2', leg: 'north', at: .45, kind: 'note', note: 'note-ballroom' }
  ],
  // people you can talk to: Murmel the marmot in the lobby, Pim the lift boy's ghost on the stairs (he gives the door code)
  npcs: [ { id: 'murmel', leg: 'lobby', at: .25, lat: -1.4 }, { id: 'pim', leg: 'south', at: .3, lat: 1.3 } ],
  gates: [ { id: 'rope', leg: 'north', at: .55, kind: 'buyout', price: 2, label: 'MEMBERS ONLY', who: 'rurik' },
           { id: 'service', leg: 'south', at: .62, kind: 'code', code: '1926', label: 'SERVICE DOOR' } ],
  // the view of the rooms: lights and a few props (kind: chandelier, desk, plant, bell, piano, chair, palm, sign)
  props: [ ['chandelier', 17, 11.5, 5.6], ['chandelier', 28, 5.5, 5.4], ['desk', 6, 12, 0], ['palm', 9, 9.5, 0],
           ['palm', 4.5, 15, 0], ['chandelier', 26, 18.5, 5.4], ['palm', 33, 21.5, 0], ['bell', 38, 17, 0],
           ['chair', 29, 3, 0], ['chair', 32, 3, 0], ['piano', 28, 3.2, 0], ['desk', 19, 20.2, 0], ['palm', 40, 6.5, 0] ],
  lights: [ [7, 12, 3.6, '#ffd8a0'], [17, 11.5, 3.2, '#ffd8a0'], [25, 11.5, 3.6, '#ffe0b0'], [28, 5.5, 4.2, '#ffd8a0'],
            [26, 18.5, 3.6, '#ffc890'], [33, 19.5, 3.2, '#ffb0a0'], [39, 10, 3.6, '#ff8a7a'], [39, 19, 3.2, '#ff8a7a'] ],
  colors: { base: '#2a1e2c', dark: '#1a121c', light: '#4a3a4c' }, wallColor: '#4a2430', sky: '#05040a',
  fog: { color: '#0a0608', near: 30, far: 180 }, ambient: ['#6a5a6c', '#2a2030', 2.4],
  cam: { at: [5, 3, 5], fov: 56 }
};

/* ---- Target 01: Après. The village lane (rooms of chalets), the black ski run (terrain), the plateau of the Powder King ---- */
S7.AREAS.t01 = {
  id: 't01', title: 'TARGET 01', sub: 'APRÈS PISTE', kind: 'rail', music: 'slope', target: 1,
  terrain: true,
  legs: {
    lane: { pts: [[60.5, 6.5], [60.5, 30.5], [60.5, 56.5]], next: ['slope'],
      shots: [ { from: 0, at: [57.5, 2.5, 4.2], fov: 52 }, { from: .5, at: [66.5, 36.5, 3.5], fov: 54 } ] },
    slope: { pts: [[60.5, 56.5], [68.5, 88.5], [52.5, 118.5], [64.5, 150.5], [60.5, 176.5]], next: ['plateau'], ski: true,
      shots: [ { from: 0, at: [57.5, 56.5, 4.8], fov: 56 }, { from: .5, at: [72.5, 112.5, 9.0], fov: 60 } ] },
    plateau: { pts: [[60.5, 176.5], [60.5, 192.5]], next: [], boss: 'powderking',
      shots: [ { from: 0, at: [55.5, 170.5, 6.5], fov: 58 } ] }
  },
  waves: [
    { leg: 'lane', at: .3, wave: 'lane' },
    { leg: 'lane', at: .75, wave: 'lane' },
    { leg: 'slope', at: .25, wave: 'slope' },
    { leg: 'slope', at: .7, wave: 'slope' },
    { leg: 'plateau', at: .2, wave: 'plateau' }
  ],
  pickups: [
    { id: 't01-r1', leg: 'lane', at: .15, kind: 'red' },
    { id: 't01-m1', leg: 'lane', at: .2, kind: 'rime' },
    { id: 't01-m3', leg: 'lane', at: .34, kind: 'rime' },
    { id: 't01-m2', leg: 'slope', at: .35, kind: 'rime' },
    { id: 't01-r2', leg: 'slope', at: .8, kind: 'red' },
    { id: 't01-note', leg: 'slope', at: .5, kind: 'note', note: 'note-powder' }
  ],
  npcs: [ { id: 'murmel', leg: 'lane', at: .6, lat: 1.5 }, { id: 'hansi', leg: 'slope', at: .15, lat: -1.6 } ],
  gates: [ { id: 'rope1', leg: 'lane', at: .5, kind: 'buyout', price: 4, label: 'MEMBERS ONLY', who: 'rurik' } ],
  // the terrain: flat village, a steep black run that drops toward the plateau, the plateau itself
  groundZ(x, y) {
    if (y < 58) return 27 - .06 * y;
    if (y < 178) return 27 - .06 * 58 - (y - 58) * .4 + Math.sin(y * .21) * .35 + Math.sin(x * .3) * .25;
    return 27 - .06 * 58 - 120 * .4;
  },
  props: [ ['chalet', 52, 14], ['chalet', 70, 14], ['chalet', 52, 24], ['chalet', 70, 26], ['chalet', 52, 36], ['chalet', 70, 38],
           ['pine', 48, 18], ['pine', 74, 20], ['pine', 48, 32], ['pine', 75, 34], ['pine', 50, 60], ['pine', 72, 66],
           ['pine', 46, 92], ['pine', 80, 100], ['pine', 45, 130], ['pine', 78, 140], ['pine', 70, 170] ],
  cam: { at: [55, 2, 6], fov: 56 }, colors: { base: '#e8eef8', dark: '#b0bcd8', light: '#ffffff' },
  fog: { color: '#c8d4ea', near: 90, far: 620 }, sky: ['#3a5a9a', '#b8c8e6', '#dce6f4'], music2: 'boss'
};

/* ---- the Echo Run: the black run alone, timed (the ski leg, no waves) ---- */
S7.AREAS.echo = {
  id: 'echo', title: 'ECHO RUN', sub: 'THE BLACK RUN, AGAINST THE CLOCK', kind: 'rail', music: 'slope', target: 2,
  terrain: true, echo: true,
  legs: {
    run: { pts: [[60.5, 56.5], [68.5, 88.5], [52.5, 118.5], [64.5, 150.5], [60.5, 176.5]], next: [], ski: true, finish: true,
      shots: [ { from: 0, at: [57.5, 56.5, 4.8], fov: 56 }, { from: .5, at: [72.5, 112.5, 9.0], fov: 60 } ] }
  },
  waves: [], pickups: [], gates: [], groundZ: S7.AREAS.t01.groundZ,
  props: S7.AREAS.t01.props, cam: { at: [55, 2, 6], fov: 56 }, colors: S7.AREAS.t01.colors,
  fog: S7.AREAS.t01.fog, sky: S7.AREAS.t01.sky
};

/* ---- geometry helpers used by the sim and the presenter ---- */
S7.areaGrid = (area) => {
  if (area._grid) return area._grid;
  const [w, h] = area.size, g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill('#'));
  for (const [x0, y0, x1, y1] of area.rooms || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = '.';
  area._grid = g.map(r => r.join(''));
  return area._grid;
};
/** ground height (metres) under a point, from the terrain function or the rooms (flat) */
S7.groundZ = (area, x, y) => (area.groundZ ? area.groundZ(x, y) : 0);
S7.isFloor = (area, x, y) => {
  if (area.terrain) return true;
  const g = S7.areaGrid(area), tx = Math.floor(x), ty = Math.floor(y);
  return ty >= 0 && ty < g.length && tx >= 0 && tx < g[0].length && g[ty][tx] === '.';
};

/** the legs' lengths and sample tables (metres). A leg is sampled every 0.05 m for quick lookup by distance. */
S7.prepareLegs = (area) => {
  if (area._prepared) return area;
  for (const id in area.legs) {
    const L = area.legs[id];
    L.id = id;
    L.seg = [];
    let total = 0;
    for (let i = 0; i < L.pts.length - 1; i++) {
      const [ax, ay] = L.pts[i], [bx, by] = L.pts[i + 1], len = Math.hypot(bx - ax, by - ay);
      L.seg.push({ x0: ax, y0: ay, x1: bx, y1: by, s0: total, len, dx: (bx - ax) / len, dy: (by - ay) / len });
      total += len;
    }
    L.len = total;
    L.shots = (L.shots || []).slice().sort((a, b) => a.from - b.from);
  }
  area._prepared = true;
  return area;
};
/** the point and heading at distance s along a leg */
S7.legAt = (area, legId, s) => {
  const L = area.legs[legId];
  s = S7.clamp(s, 0, L.len);
  let seg = L.seg[L.seg.length - 1];
  for (const g of L.seg) if (s <= g.s0 + g.len) { seg = g; break; }
  const t = S7.clamp((s - seg.s0) / seg.len, 0, 1);
  const x = seg.x0 + (seg.x1 - seg.x0) * t, y = seg.y0 + (seg.y1 - seg.y0) * t;
  return { x, y, z: S7.groundZ(area, x, y), dx: seg.dx, dy: seg.dy, ang: Math.atan2(seg.dy, seg.dx) };
};
/** the shot that frames distance s on a leg */
S7.shotAt = (area, legId, s) => {
  const L = area.legs[legId], f = L.len ? s / L.len : 0;
  let shot = L.shots[0] || null;
  for (const sh of L.shots) if (f >= sh.from) shot = sh;
  return shot;
};

/** where a person stands: on the rail, a metre or so to one side */
S7.npcPos = (area, n) => {
  const q = S7.legAt(area, n.leg, n.at * area.legs[n.leg].len);
  return { x: q.x - q.dy * n.lat, y: q.y + q.dx * n.lat, z: q.z };
};

// ---- src/20-sim.js
/* Skiller7: the sim. Deterministic, fixed step (1/120 s), in metres. It owns every rule: the rail walker, the junctions,
 * gates, pickups, the first-person aim and the shots, the Whiteouts (invisible until scanned), personas and their
 * abilities, the Sweep, bosses, the echo timer. It never touches the 3D world: it leaves events in sim.ev for the
 * presenter, the sound and the HUD to read. */
S7.prog = null;   // the player's progress (saved): rime, red, unlocked personas, upgrades, picked pickups, best times

S7.newProgress = () => ({
  rime: 0, red: 3, unlocked: { patrol: true, racer: true, baron: true },
  upg: { hp: 0, ammo: 0, scan: 0 }, picked: {}, notes: {}, bossDown: {}, echoBest: null, rankBest: {}
});

S7.Sim = class Sim {
  constructor(area, opts = {}) {
    this.area = S7.prepareLegs(area);
    this.opts = opts;
    this.t = 0;
    this.ev = [];
    this.camOverride = null;   // a cutscene's camera (set by the scenes' cuts): { at, look, fov }
    this.braking = false;
    S7.seed(opts.seed || 1);
    this.legId = area.start || Object.keys(area.legs)[0];
    this.s = 0;
    this.dir = 1;
    this.speed = 0;
    this.mode = 'rail';
    this.junction = null;     // { options: [legIds], pick }
    this.gateOpen = {};
    this.fired = {};          // waves fired
    this.boss = null;
    this.complete = false;
    this.over = false;
    this.enemies = [];
    this.footprints = [];
    this.nextId = 1;
    this.aimYaw = 0;          // radians, relative to the walk direction
    this.aimPitch = 0;
    this.scanT = 0;           // seconds left on the scan pulse's ring
    this.scanCD = 0;
    this.stunT = 0;
    this.longT = 0;
    this.tuckT = 0;
    this.frozenSwitchT = 0;
    this.switchT = 0;
    this.thawT = 0;
    this.stats = { kills: 0, thaws: 0, shots: 0, hits: 0, revealed: 0, deaths: 0, pickups: 0, blasts: 0, time: 0, rime: 0, red: 0 };
    this.trace = [];          // echo: the run's distance over time
    this.traceT = 0;
    const roster = S7.ROSTER.filter(id => S7.prog.unlocked[id]);
    const cur = S7.prog.current;
    if (cur && roster.includes(cur)) roster.splice(roster.indexOf(cur), 1), roster.unshift(cur);
    this.roster = roster.length ? roster : ['patrol'];
    this.heroes = this.roster.map(id => this.makePersona(id));
    this.cur = 0;
    this.ev.push({ type: 'start', area: area.id });
  }

  makePersona(id) {
    const P = S7.PERSONAS[id], W = S7.WEAPONS[P.weapon], u = S7.prog.upg;
    const maxHp = Math.round(S7.live.heroHP + u.hp * 2);
    const mag = Math.round(W.mag * S7.live.ammoMult * (1 + .25 * u.ammo));
    return { id, hp: maxHp, maxHp, mag, magMax: mag, reloadT: 0, cdShot: 0, cdAbility: 0, frozen: false, charged: false,
      abilityT: 0, rescue: 0 };
  }
  get me() { return this.heroes[this.cur]; }
  get W() { return S7.WEAPONS[S7.PERSONAS[this.me.id].weapon]; }
  get leg() { return this.area.legs[this.legId]; }
  get pos() { return S7.legAt(this.area, this.legId, this.s); }
  eyePos() {
    const p = this.pos;
    return { x: p.x, y: p.y, z: p.z + 1.62, yaw: this.aimYaw + (this.dir > 0 ? p.ang : p.ang + Math.PI), pitch: this.aimPitch };
  }
  emit(type, data = {}) { data.type = type; this.ev.push(data); }
  hasAlive() { return this.heroes.some(h => !h.frozen); }

  /* ---- intents: the one interface for the player, the bot and the tests ----
   * I = { fwd, back, turn (edge), aim, fire (held), fireEdge, scan (edge), ability (edge), switchP (edge), heal (edge),
   *       interact (held), ring (held), branch (edge: -1 | 1), aimDX, aimDY (radians this step), confirm (edge) } */
  update(dt, I) {
    if (this.over || this.complete) return;
    this.t += dt;
    if (I.pay && !this.talkNear()) this.pay();
    const ringK = I.ring ? .15 : 1;
    const wdt = dt * ringK;
    const me = this.me;
    if (this.switchT > 0) this.switchT -= dt;
    if (this.stunT > 0) this.stunT -= dt;
    if (this.longT > 0) this.longT -= dt;
    if (this.tuckT > 0) this.tuckT -= dt;
    if (this.scanT > 0) this.scanT -= dt;
    if (this.scanCD > 0) this.scanCD -= dt;
    for (const h of this.heroes) {
      if (h.cdShot > 0) h.cdShot -= dt;
      if (h.cdAbility > 0) h.cdAbility -= dt;
      if (h.reloadT > 0) { h.reloadT -= dt; if (h.reloadT <= 0) { h.mag = h.magMax; this.emit('reload', { id: h.id }); } }
      if (h.abilityT > 0) h.abilityT -= dt;
    }

    // the active persona: frozen, the next alive one takes over after the freeze
    if (me.frozen) {
      this.frozenSwitchT += dt;
      if (this.frozenSwitchT > 1.2) {
        this.frozenSwitchT = 0;
        if (!this.switchTo(this.nextAlive())) { this.over = true; this.emit('gameover'); return; }
      }
      // the Sweep: hold interact to thaw a frozen persona
      if (I.interact) { this.thawT += dt; if (this.thawT > 2) { this.thawT = 0; const f = this.heroes.find(h => h.frozen); if (f) { f.frozen = false; f.hp = 2; this.emit('thaw_self', { id: f.id }); } } }
      else this.thawT = 0;
      this.updateEnemies(wdt, I);
      this.updateBoss(wdt);
      return;
    }
    if (I.switchP && this.switchT <= 0 && this.heroes.length > 1) {
      if (this.switchTo(this.nextAlive())) this.switchT = .45;
    }
    if (I.ability && me.cdAbility <= 0) this.useAbility(me);
    if (I.heal && this.prog().red > 0 && me.hp < me.maxHp) { this.prog().red--; me.hp = Math.min(me.maxHp, me.hp + 2); this.emit('heal', { id: me.id }); }
    if (I.scan && this.scanCD <= 0) this.scan();
    this.thawT = I.interact && this.heroes.some(h => h.frozen) ? this.thawT + dt : 0;
    if (this.thawT > 2) { this.thawT = 0; const f = this.heroes.find(h => h.frozen); if (f) { f.frozen = false; f.hp = 2; this.emit('thaw_self', { id: f.id }); } }

    // junction: the hero picks a branch, then walks on
    if (this.junction) {
      if (I.branch) { this.junction.pick = S7.clamp(this.junction.pick + I.branch, 0, this.junction.options.length - 1); this.emit('branch', { pick: this.junction.pick }); }
      if (!I.fwd) this.junctionArmed = true;     // the hero lets go, then presses forward again to commit
      if (I.fwd && this.junctionArmed) {
        const to = this.junction.options[this.junction.pick];
        this.junction = null;
        this.legId = to; this.s = 0; this.dir = 1;
        this.emit('leg', { leg: to, area: this.area.id });
      }
      this.updateEnemies(wdt, I);
      this.updateBoss(wdt);
      this.updateTrace(dt);
      return;
    }

    const L = this.leg;
    const aiming = !!I.aim && !L.ski;
    // walking: speed is a magnitude in m/s; dir (+1 along the leg, -1 back along it) gives the way
    if (L.ski) this.dir = 1;                                   // the black run is skied downhill only
    else if (I.turn) { this.dir = -this.dir; this.emit('turn'); }
    const walk = S7.live.walkSpeed * (this.tuckT > 0 && me.id === 'racer' ? 1.4 : 1);
    this.braking = !!(L.ski && I.back);
    if (L.ski) {
      const skiV = 9 * S7.live.slopeSpeed * (this.tuckT > 0 ? 2 : 1);
      this.speed = S7.approach(this.speed, I.back ? 0 : skiV, (I.back ? 26 : 5) * dt);   // back = the hockey stop
    } else if (!aiming && I.fwd) {
      this.speed = S7.approach(this.speed, walk, 6 * dt);
    } else {
      this.speed = S7.approach(this.speed, 0, (aiming ? 10 : 7) * dt);
    }
    this.s += this.speed * this.dir * wdt;
    this.checkGates();
    const lim = L.len;
    if (this.s >= lim) {
      this.s = lim;
      this.arriveEnd();
    } else if (this.s <= 0) {
      this.s = 0;
      if (this.dir < 0) this.speed = 0;
    }

    // aim, fire, reload
    if (aiming) {
      this.aimYaw = S7.clamp(this.aimYaw + (I.aimDX || 0) * (me.id === 'baron' ? 1 : 1), -1.25, 1.25);
      this.aimPitch = S7.clamp(this.aimPitch + (I.aimDY || 0), -.9, .8);
      this.aimYaw = S7.clamp(this.aimYaw, -1.25, 1.25);
      if (me.id === 'baron' && this.abilityOn('longlook')) this.longT = Math.max(this.longT, .2);
    } else {
      this.aimYaw = S7.approach(this.aimYaw, 0, dt * 4);
      this.aimPitch = S7.approach(this.aimPitch, 0, dt * 4);
    }
    if (S7.cheats.ammo) me.mag = me.magMax;
    if (aiming && me.cdShot <= 0 && !me.reloadT) {
      if (me.mag > 0) { if (I.fire) this.fireShot(I); }
      else if (I.fireEdge) { me.reloadT = this.W.reload; this.emit('empty', { id: me.id }); }
    }

    this.checkWaves();
    this.checkPickups();
    this.updateEnemies(wdt, I);
    this.updateBoss(wdt);
    this.stats.time += dt;
    this.mode = aiming ? 'aim' : (L.ski ? 'ski' : (this.speed !== 0 ? 'walk' : 'rail'));
    this.updateTrace(dt);
  }

  abilityOn(name) { const me = this.me; return S7.PERSONAS[me.id].ability === name; }
  prog() { return S7.prog; }
  nextAlive() {
    for (let i = 1; i <= this.heroes.length; i++) { const j = (this.cur + i) % this.heroes.length; if (!this.heroes[j].frozen) return j; }
    return -1;
  }
  switchTo(j) {
    if (j < 0) return false;
    const from = this.me.id;
    this.cur = j; this.frozenSwitchT = 0;
    this.emit('switch', { from, to: this.me.id });
    return true;
  }
  updateTrace(dt) {
    this.traceT -= dt;
    if (this.traceT <= 0 && this.leg) { this.traceT = .1; this.trace.push([+this.t.toFixed(2), this.legId, +this.s.toFixed(2)]); }
  }

  useAbility(me) {
    const P = S7.PERSONAS[me.id], a = P.ability;
    const pos = this.pos, fx = Math.cos(this.eyeYaw()), fy = Math.sin(this.eyeYaw());
    const inFront = e => { const dx = e.x - pos.x, dy = e.y - pos.y, d = Math.hypot(dx, dy); return d < 16 && (dx * fx + dy * fy) > 0; };
    const cd = { flare: 9, tuck: 8, longlook: 10, buyout: 12, echo: 14, flashbulb: 9, charge: 8 }[a] || 8;
    me.cdAbility = cd;
    if (a === 'flare') { this.stunT = 3; this.enemies.forEach(e => { if (inFront(e)) e.stun = 3; }); }
    if (a === 'tuck') this.tuckT = 4;
    if (a === 'longlook') this.longT = 5;
    if (a === 'buyout') { for (let i = 0; i < 3; i++) this.emit('rime_drop', { x: pos.x + (i - 1) * .9, y: pos.y + .6 * (i % 2) }); this.prog().rime += Math.round(3 * S7.live.rimeMult); this.stats.rime += Math.round(3 * S7.live.rimeMult); }
    if (a === 'echo') this.enemies.forEach(e => { e.revealT = Math.max(e.revealT, 4); });
    if (a === 'flashbulb') this.enemies.forEach(e => { if (inFront(e)) { e.stun = 2; e.revealT = Math.max(e.revealT, 3); } });
    if (a === 'charge') me.charged = true;
    this.emit('ability', { id: me.id, ability: a, name: P.abilityName });
  }
  eyeYaw() { const p = this.pos; return this.aimYaw + (this.dir > 0 ? p.ang : p.ang + Math.PI); }

  scan() {
    this.scanCD = 1.6; this.scanT = .7;
    const p = this.pos, yaw = this.eyeYaw(), fx = Math.cos(yaw), fy = Math.sin(yaw), R = S7.live.scanRange;
    let found = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
      const front = d < 4 || (d < R && (dx * fx + dy * fy) / d > .35);
      if (front && d < R) { if (e.revealT <= 0) found++; e.revealT = S7.live.scanTime; e.scanned = true; }
    }
    this.stats.revealed += found;
    for (const f of this.footprints) if (Math.hypot(f.x - p.x, f.y - p.y) < R) f.life = Math.max(f.life, 6);
    this.emit('scan', { x: p.x, y: p.y, z: p.z, found, range: R });
  }

  fireShot(I) {
    const me = this.me, W = this.W, P = S7.PERSONAS[me.id];
    if (!S7.cheats.ammo) me.mag--;
    me.cdShot = 1 / (W.rate * S7.live.fireRate);
    if (me.mag <= 0 && !S7.cheats.ammo) me.reloadT = W.reload;
    this.stats.shots++;
    const eye = this.eyePos();
    const charged = me.charged; me.charged = false;
    const coneDeg = W.cone * S7.live.coneMult;
    const hits = [];
    for (let i = 0; i < W.pellets; i++) {
      const sp = (S7.streams.spread() - .5) * 2 * coneDeg * Math.PI / 180, sq = (S7.streams.spread() - .5) * 2 * coneDeg * Math.PI / 180;
      const yaw = eye.yaw + sp, pitch = eye.pitch + sq;
      const d = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
      const hit = this.castShot(eye, d, W, charged ? 3 : 1);
      if (hit) hits.push(hit);
    }
    if (hits.length) this.stats.hits++;
    this.emit('shot', { id: me.id, weapon: P.weapon, eye, hit: hits.length > 0, hits, charged });
  }

  /** hitscan along a ray: nearest enemy or the boss in the cone */
  castShot(o, d, W, mult) {
    let best = null, bestT = Infinity;
    const tol = (t) => t * Math.tan(W.cone * S7.live.coneMult * Math.PI / 180) * .6;
    const test = (e, spot, bodyR, id, isBoss) => {
      const px = spot[0] - o.x, py = spot[1] - o.y, pz = spot[2] - o.z;
      const t = px * d[0] + py * d[1] + pz * d[2];
      if (t < .2 || t > W.range) return;
      const qx = px - t * d[0], qy = py - t * d[1], qz = pz - t * d[2];
      const perp = Math.hypot(qx, qy, qz);
      if (perp <= bodyR + tol(t) && t < bestT) { bestT = t; best = { e, id, t, isBoss }; }
    };
    for (const e of this.enemies) {
      if (!e.alive || (e.revealT <= 0 && !S7.cheats.reveal)) continue;
      test(e, [e.x, e.y, e.z + e.warm], e.r * 1.6, 'warm', false);
      test(e, [e.x, e.y, e.z + 1.0], .42, 'body', false);
    }
    if (this.boss && this.boss.alive) {
      const b = this.boss;
      test(b, [b.x, b.y, b.z + b.warmZ], b.warmR, 'warm', true);
      test(b, [b.x, b.y, b.z + 1.6], b.bodyR, 'body', true);
    }
    if (!best) return null;
    if (best.isBoss) {
      const b = this.boss;
      const dmg = best.id === 'warm' ? 2 * mult : 1 * mult;
      b.hp -= dmg * S7.live.dmgMult;
      this.emit('boss_hit', { id: b.id, warm: best.id === 'warm', at: [b.x, b.y, b.z] });
      if (b.hp <= 0 && b.alive) this.bossDown();
      return { kind: 'boss', warm: best.id === 'warm', t: best.t };
    }
    const e = best.e;
    if (best.id === 'warm') {
      this.stats.thaws++;
      this.killEnemy(e, true);
      return { kind: 'thaw', t: best.t, at: [e.x, e.y, e.z] };
    }
    e.hp -= this.W.dmg * S7.live.dmgMult * mult;
    e.hitT = .25;
    if (e.hp <= 0) this.killEnemy(e, false);
    this.emit('hit', { at: [e.x, e.y, e.z + 1], type: e.type });
    return { kind: 'body', t: best.t, at: [e.x, e.y, e.z] };
  }

  killEnemy(e, thaw) {
    if (!e.alive) return;
    e.alive = false; e.deadT = 0;
    this.stats.kills++;
    this.emit('kill', { type: e.type, thaw, at: [e.x, e.y, e.z], laughing: e.laughing });
    if (S7.streams.drop() < .35 * S7.live.redDrops) this.emit('red_drop', { at: [e.x, e.y, e.z] });
  }

  /* ---- the Whiteouts ---- */
  spawnWave(name) {
    const list = S7.WAVES[name] || S7.WAVES.lane;
    const n = Math.max(0, Math.round(list.length * S7.live.enemyCount));
    const p = this.pos, dir = this.dir, L = this.leg.len;
    for (let i = 0; i < n; i++) {
      const [type, off] = list[i % list.length];
      const extra = Math.floor(i / list.length) * .9;
      const dist = 6.5 + off * 2.2 + extra + (dir > 0 ? 0 : 0);
      let s = S7.clamp(this.s + dir * dist, 0, L);
      if (Math.abs(s - this.s) < 2.5) s = S7.clamp(this.s - dir * 2.5, 0, L);
      const def = S7.ENEMIES[type], lat = ((i * 37) % 11 - 5) * .22;
      const e = { id: this.nextId++, type, hp: def.hp, def, leg: this.legId, s, lat, alive: true, laughing: false,
        warnT: 0, stun: 0, revealT: 0, scanned: false, hitT: 0, deadT: 0, speedK: 1, step: 0 };
      e.warm = def.warm; e.r = def.r; e.x = 0; e.y = 0; e.z = 0;
      this.placeEnemy(e);
      this.enemies.push(e);
    }
    this.emit('wave', { name, n });
  }
  placeEnemy(e) {
    const q = S7.legAt(this.area, e.leg, e.s);
    const nx = -q.dy, ny = q.dx;
    e.x = q.x + nx * e.lat; e.y = q.y + ny * e.lat; e.z = q.z;
    e.ang = q.ang;
  }

  updateEnemies(dt, I) {
    const p = this.pos;
    const longK = this.longT > 0 ? .35 : 1;
    for (const e of this.enemies) {
      if (e.hitT > 0) e.hitT -= dt;
      if (!e.alive) { e.deadT += dt; continue; }
      if (e.revealT > 0) e.revealT -= dt;
      if (e.stun > 0) { e.stun -= dt; }
      const same = e.leg === this.legId;
      const dzs = same ? (this.s - e.s) : 0;
      const dist3 = same ? Math.hypot(e.x - p.x, e.y - p.y) : 99;
      if (e.stun > 0 || this.stunT > 0 && dist3 < 16) { e.laughing = false; continue; }
      if (same) {
        const v = e.def.speed * longK;
        if (Math.abs(dzs) > e.def.arm) {
          const stepLen = v * dt * Math.sign(dzs);
          e.s += stepLen;
          e.step += Math.abs(stepLen);
          if (e.step > 1.1) { e.step = 0; this.footprints.push({ x: e.x, y: e.y, z: e.z, life: S7.live.scanTime + 1.2, leg: e.leg, s: e.s }); }
          this.placeEnemy(e);
          e.laughing = false; e.warnT = 0;
        } else {
          if (!e.laughing) { e.laughing = true; e.warnT = S7.live.enemyWarn; this.emit('laugh', { type: e.type, at: [e.x, e.y, e.z], style: e.def.laugh, loud: false }); }
          e.warnT -= dt * longK;
          if (S7.streams.laugh() < dt * 1.2) this.emit('laugh', { type: e.type, at: [e.x, e.y, e.z], style: e.def.laugh, loud: true });
          if (e.warnT <= 0) this.blast(e);
        }
      } else {
        e.laughing = false;
      }
      // footprints fade
    }
    for (const f of this.footprints) f.life -= dt;
    this.footprints = this.footprints.filter(f => f.life > 0);
    this.enemies = this.enemies.filter(e => e.alive || e.deadT < .8);
  }

  blast(e) {
    e.alive = false; e.deadT = 0; e.exploded = true;
    this.stats.blasts++;
    this.emit('explode', { at: [e.x, e.y, e.z], radius: S7.live.blastR, type: e.type });
    const p = this.pos;
    if (Math.hypot(e.x - p.x, e.y - p.y) < S7.live.blastR) this.hurt(S7.live.blastDmg * (e.def.dmg || 1) / 2, 'blast');
  }

  hurt(dmg, from) {
    const me = this.me;
    if (S7.cheats.god || me.frozen || this.switchT > 0) return;
    me.hp -= dmg;
    this.emit('hurt', { id: me.id, dmg, from, hp: me.hp });
    if (me.hp <= 0) {
      me.hp = 0; me.frozen = true; this.frozenSwitchT = 0; this.stats.deaths++;
      this.emit('freeze', { id: me.id, at: this.pos });
    }
  }

  /* ---- waves, pickups, gates, ends ---- */
  checkWaves() {
    const L = this.leg, f = L.len ? this.s / L.len : 0;
    for (let i = 0; i < this.area.waves.length; i++) {
      const w = this.area.waves[i];
      if (w.leg !== this.legId || this.fired[i] || f < w.at) continue;
      this.fired[i] = true;
      this.spawnWave(w.wave);
    }
  }
  checkPickups() {
    const P = this.prog(), L = this.leg;
    for (const pk of this.area.pickups || []) {
      if (pk.leg !== this.legId || P.picked[pk.id]) continue;
      if (Math.abs(this.s - pk.at * L.len) > 1.4) continue;
      P.picked[pk.id] = true;
      this.stats.pickups++;
      if (pk.kind === 'note') { P.notes[pk.note] = true; this.emit('note', { id: pk.note }); continue; }
      if (pk.kind === 'red') { P.red++; this.stats.red++; } else { P.rime += Math.round(2 * S7.live.rimeMult); this.stats.rime += Math.round(2 * S7.live.rimeMult); }
      this.emit('pickup', { kind: pk.kind, id: pk.id, at: this.pos });
    }
  }
  checkGates() {
    const L = this.leg;
    for (const g of this.area.gates || []) {
      if (g.leg !== this.legId || this.gateOpen[g.id]) continue;
      const gs = g.at * L.len;
      if (this.dir > 0 && this.s >= gs - .02) {
        this.s = gs - .02; this.speed = 0;
        this.gateNear = g;
        if (this.wantPay) {
          this.wantPay = false;
          if (g.kind === 'code') this.emit('code_request', { id: g.id, label: g.label, digits: g.code.length });
          else if (this.prog().rime >= g.price) { this.prog().rime -= g.price; this.openGate(g.id, g.price); }
          else this.emit('gate_fail', { id: g.id, price: g.price });
        }
      } else if (this.gateNear === g) this.gateNear = null;
    }
  }
  openGate(id, price = 0) { this.gateOpen[id] = true; this.gateNear = null; this.emit('gate', { id, price }); }
  /** interact pressed: pay a gate in front of the hero */
  pay() { if (this.gateNear) this.wantPay = true; }
  /** the person in talking range on this leg (2.6 m), or null */
  npcNear() {
    const p = this.pos;
    for (const n of this.area.npcs || []) {
      if (n.leg !== this.legId) continue;
      const q = S7.npcPos(this.area, n);
      if (Math.hypot(q.x - p.x, q.y - p.y) < 2.6) return n;
    }
    return null;
  }
  talkNear() {
    const n = this.npcNear();
    if (n) this.emit('talk', { id: n.id });
    return !!n;
  }
  arriveEnd() {
    const L = this.leg;
    if (L.finish) { this.finish(); return; }
    if (L.boss && !this.boss && !this.bossDoneFor(L.boss)) { this.startBoss(L.boss); return; }
    if (L.next && L.next.length === 1 && this.dir > 0) {
      this.legId = L.next[0]; this.s = 0; this.emit('leg', { leg: this.legId, area: this.area.id });
      return;
    }
    if (L.next && L.next.length > 1 && this.dir > 0) {
      this.junction = { options: L.next.slice(), pick: 0 };
      this.junctionArmed = false;
      this.speed = 0;
      this.emit('junction', { options: L.next.slice(), leg: this.legId });
      return;
    }
    this.speed = 0;
  }
  bossDoneFor(id) { return !!(this.prog().bossDown[this.area.id + ':' + id]); }
  startBoss(id) {
    const def = S7.BOSSES[id], L = this.leg, p = this.pos;
    const bx = p.x + p.dx * 2.2, by = p.y + p.dy * 2.2;
    this.boss = { id, name: def.name, hp: def.hp * S7.live.bossHP, maxHP: def.hp * S7.live.bossHP, x: bx, y: by, z: p.z,
      alive: true, pulseT: 3, spawnT: def.spawnEvery, warmZ: id === 'powderking' ? 2.6 : 3.1, warmR: .45, bodyR: 1.5, t: 0, phase: 1, def };
    this.speed = 0;
    this.emit('boss', { id, phase: 1, name: def.name, line: def.line });
  }
  updateBoss(dt) {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.t += dt;
    const def = b.def;
    if (b.hp <= b.maxHP / 2 && b.phase === 1) { b.phase = 2; this.emit('boss', { id: b.id, phase: 2, name: def.name, line: 'Oh, the warmth! Again!' }); }
    b.pulseT -= dt;
    if (b.pulseT <= 0) {
      b.pulseT = def.pulseEvery * (b.phase === 2 ? .8 : 1);
      this.emit('boss_pulse', { at: [b.x, b.y, b.z], r: def.pulseR });
      const p = this.pos;
      if (Math.hypot(p.x - b.x, p.y - b.y) < def.pulseR) this.hurt(def.pulseDmg * 1, 'pulse');
    }
    b.spawnT -= dt;
    if (b.spawnT <= 0) {
      b.spawnT = def.spawnEvery;
      this.spawnWave(this.area.id === 't00' ? 'shaft' : 'plateau');
    }
  }
  bossDown() {
    const b = this.boss;
    b.alive = false;
    this.prog().bossDown[this.area.id + ':' + b.id] = true;
    this.emit('bossdown', { id: b.id });
    this.enemies.forEach(e => { if (e.alive) { e.alive = false; e.deadT = 0; } });
    this.complete = true;
    this.finish();
  }
  finish() {
    if (this.complete && this.finished) return;
    this.complete = true;
    this.finished = true;
    this.emit('complete', { area: this.area.id, time: this.t, stats: this.stats });
  }
}

// ---- src/30-present.js
/* Skiller7: the presenter. Builds one 3D world per area (E.World3D: the level as text, the terrain of the black run),
 * mirrors the sim into actors (the hero's persona, the Whiteouts, the bosses, the echo), places the camera (hard-cut
 * shots along the rail, first person while aiming), draws the gun on the overlay, the scan ring, footprints and warm
 * spots, and turns sim events into sparks, sounds and laughter. It only reads the sim. */
const TAU2 = Math.PI * 2;
S7.LEG_LABELS = { north: 'BALLROOM', south: 'STAIRS', lane: 'LANE', slope: 'BLACK RUN', plateau: 'PLATEAU' };

/* ---- drawn things: props made of pen shapes (engine units, a metre is 16) ---- */
S7.defineThings = () => {
  const T = E.World3D.THINGS;
  T.chandelier = (pen, t, time) => {
    pen.tube(0, 0, 0, 0, 0, 22, .7, '#3a3030').ball(0, 0, 22, 9, 9, 6, '#d8b060');
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU2 + time * .2; pen.tube(0, 0, 22, Math.cos(a) * 8, Math.sin(a) * 8, 14, .45, '#c0a060').glow(Math.cos(a) * 8, Math.sin(a) * 8, 15, 2.2, '#ffd890'); }
  };
  T.desk = (pen) => { pen.box(0, 0, 14, 40, 14, 28, '#5a3a24').box(0, 0, 30, 44, 17, 4, '#7a5234'); };
  T.palm = (pen, t, time) => {
    pen.tube(0, 0, 0, 1, 0, 40, 3, '#6a4a2a');
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU2 + .3; pen.slab(1, 0, 40, 1 + Math.cos(a) * 22, Math.sin(a) * 22, 32, 0, 0, 1, 5, 2, '#2f7a3a'); }
  };
  T.bell = (pen) => { pen.box(0, 0, 9, 14, 14, 18, '#7a5a2a').ball(0, 0, 22, 6, 6, 6, '#e0b040'); };
  T.chair = (pen) => { pen.box(0, 0, 9, 14, 14, 3, '#6a2a2a').box(-6, 0, 17, 2, 14, 16, '#6a2a2a').box(0, 0, 4, 12, 12, 8, '#6a2a2a'); };
  T.piano = (pen) => { pen.box(0, 0, 16, 40, 22, 32, '#15101a').box(-2, 12, 24, 36, 2, 10, '#eeeae4'); };
  T.chalet = (pen) => {
    pen.box(0, 0, 24, 96, 64, 48, '#7a5234').box(0, 0, 62, 104, 72, 6, '#f4f8ff').box(0, 0, 54, 100, 70, 4, '#5a3a24');
    pen.box(-40, 32, 16, 12, 2, 24, '#3a2414').box(20, 32, 40, 14, 2, 14, '#e8d080');
  };
  T.pine = (pen) => { pen.tube(0, 0, 0, 0, 0, 22, 2.4, '#4a3018'); pen.cone(0, 0, 18, 0, 0, 62, 16, '#1f5a34').cone(0, 0, 36, 0, 0, 80, 12, '#2a6e40'); pen.box(0, 0, 66, 6, 6, 6, '#f4f8ff'); };
  T.bed = (pen) => { pen.box(0, 0, 10, 44, 80, 20, '#5a2a2a').box(0, 0, 26, 40, 74, 14, '#f0e6d8').box(0, -32, 44, 40, 14, 18, '#ffffff').box(0, 0, 40, 44, 80, 8, '#7a3a3a'); };
  T.clock = (pen, t, time) => {
    pen.box(0, 0, 60, 26, 14, 120, '#4a2a1a').box(0, -7.5, 96, 18, 1, 18, '#f0e6c8').box(0, -8, 30, 10, 1, 16, '#2a1a10');
    const a = time * .4; pen.tube(0, -8, 96, Math.sin(a) * 6, -8, 96 + Math.cos(a) * 6, .6, '#1a1008');
    pen.box(0, -8, 60, 6, 2, 8, '#d8b040');
  };
  T.wardrobe = (pen) => { pen.box(0, 0, 40, 40, 22, 80, '#3a2418').box(-10, -11, 40, 16, 1, 70, '#5a3a24').box(10, -11, 40, 16, 1, 70, '#5a3a24'); };
  T.bench = (pen) => { pen.box(0, 0, 8, 80, 22, 6, '#4a3020').box(-30, 0, 4, 4, 22, 8, '#3a2418').box(30, 0, 4, 4, 22, 8, '#3a2418'); pen.glow(0, 0, 28, 6, '#ffd08a'); };
};

S7.Presenter = class Presenter {
  constructor(game, sim, area, opts = {}) {
    this.game = game; this.sim = sim; this.area = area; this.opts = opts;
    this.enemyActors = new Map();
    this.heroActors = {};
    this.gunKick = 0;
    this.time = 0;
    this.lastCamShot = null;
    this.ringT = 0;
    this.ghost = null;
    this.bossActor = null;
    this.inbox = [];          // the events the scenes answer (dialogue, notes, the code door, the boss)
    this.npcs = {};
  }

  build() {
    const A = this.area, g = this.game, M = S7.M;
      const opts = {
      look: 'card', res: 'pixels',
      gravity: 480,
      sky: A.sky || ['#05040a', '#1a1426', '#2a1e34'],
      fog: A.fog ? { color: A.fog.color, near: A.fog.near * M, far: A.fog.far * M } : false,
      ambient: A.ambient || ['#6a5a6e', '#2a2030', 2.2],
      sun: A.terrain ? { color: '#fff6e8', intensity: 2.2, dir: [.4, .9, -.6], area: 600, shadow: true } : { color: '#ffe6c8', intensity: 1.1, dir: [.3, .9, -.2] },
      torchLights: 0, torchShadows: 0, lights: 2, glowLights: 4, shadows: false, outlines: false,
      camera: { mode: 'fixed', capture: true, near: 1.2 },
      overlay: { fov: 56 },
      onDraw: (w, r) => this.onWorldDraw(w, r)
    };
    if (A.terrain) {
      const gz = A.groundZ;
      opts.terrain = {
        size: 4096,
        height: (x, y) => gz(x / M, y / M) * M,
        color: (x, y, z, nz) => { const k = 0.82 + .18 * Math.max(0, nz); return [Math.round(232 * k), Math.round(240 * k), Math.round(252 * k)]; },
        cell: 32, chunk: 32, far: 900, physics: 220, detail: 1.4, bottom: -2000,
        rock: { colors: [[84, 92, 116], [120, 124, 140]], band: 3, slope: [.5, .8] }
      };
    } else {
      opts.level = { rows: S7.areaGrid(A), legend: {}, ground: A.ground || 'flagstone', side: A.side || 'block',
        colors: A.colors || { base: '#3a2a3a', dark: '#24182a', light: '#5a4a5c' }, color: A.wallColor || '#4a2430' };
    }
    this.world = new E.World3D(g, opts);
    const W = this.world;
    this.heroes = {};
    // props
    for (const pr of A.props || []) {
      const [kind, x, y, z] = pr;
      if (kind === 'rosalind' || kind === 'bed') continue;
      if (A.terrain) {
        const zz = S7.groundZ(A, x, y) * M;
        W.thing(kind, x * M, y * M, zz, { yaw: 0 });
      } else if (kind === 'bed' || kind === 'clock' || kind === 'wardrobe' || kind === 'bench') {
        W.thing(kind, x * M, y * M, 0, { yaw: 0 });
      } else {
        W.thing(kind, x * M, y * M, (z || 0) * M, { yaw: 0 });
      }
    }
    for (const L of A.lights || []) {
      const lt = W.light({ color: L[3], reach: 13 * M, power: 1.8, flicker: .04 });
      lt.x = L[0] * M; lt.y = L[1] * M; lt.z = L[2] * M; this.lights = this.lights || []; this.lights.push(lt);
    }
    // the hero: one body under the persona's coat
    this.spawnHero();
    this.spawnNpcs();
    this.prepared = false;
    W.prepare();
    this.prepared = true;
    return this;
  }

  /** the people on the rails: Murmel (a marmot made of a blob) and Pim (a translucent lift boy) */
  spawnNpcs() {
    const W = this.world, M = S7.M;
    for (const n of this.area.npcs || []) {
      const q = S7.npcPos(this.area, n);
      let rig, a;
      const kind = S7.NPCS[n.id].kind;
      if (kind === 'blob') {
        rig = new E.Blob({ R: 12, colors: { dk: '#5a3a20', base: '#9a7040', lt: '#c8a060', spec: '#f0e0c0', eye: '#1a1008', pupil: '#000' }, ears: 'rabbit' });
        a = W.mob({ x: q.x * M, y: q.y * M, z: q.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
      } else {
        const N = S7.NPCS[n.id];
        rig = new E.Humanoid({ size: 1.3, build: 'heroic', hat: { style: N.hat, color: N.colors.trim }, colors: N.colors, weapon: null, outfit: 'coat', sleeves: 'long' });
        a = W.mob({ x: q.x * M, y: q.y * M, z: q.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
        a.fade = kind === 'ghost' ? .6 : 1;
      }
      a.setSolid(false);
      this.npcs[n.id] = { actor: a, rig, n };
    }
  }
  syncNpcs(dt) {
    const M = S7.M;
    for (const id in this.npcs) {
      const v = this.npcs[id], q = S7.npcPos(this.area, v.n);
      v.actor.place(q.x * M, q.y * M, q.z * M);
      v.rig.update(dt, { x: q.x * M, y: q.y * M, z: q.z * M, facing: S7.legAt(this.area, v.n.leg, 0).ang, vx: 0, vy: 0 });
    }
  }
  rigFor(id) {
    const P = S7.PERSONAS[id];
    const hatStyle = P.hat === 'felt' ? 'felt' : P.hat;
    return new E.Humanoid({ size: 1.3, build: 'heroic', hat: { style: hatStyle, color: P.hatColor }, colors: P.colors,
      weapon: 'gun', hair: 'short', outfit: 'coat', sleeves: 'long', acc: P.acc });
  }
  spawnHero() {
    const W = this.world, sim = this.sim;
    this.heroes = {};
    for (const h of sim.heroes) {
      const rig = this.rigFor(h.id);
      const p = sim.pos;
      const a = W.mob({ x: p.x * S7.M, y: p.y * S7.M, z: p.z * S7.M, rig, pose: false, fly: true, r: 8, half: 0 });
      a.setSolid(false);
      this.heroes[h.id] = { actor: a, rig, id: h.id };
    }
  }
  /** the Whiteouts: a mob each, invisible until revealed (its fade) */
  syncEnemies(dt) {
    const W = this.world, sim = this.sim, M = S7.M;
    const seen = new Set();
    for (const e of sim.enemies) {
      seen.add(e.id);
      let v = this.enemyActors.get(e.id);
      if (!v) {
        const rig = new E.Humanoid({ size: e.def.bulky ? 1.45 : 1.2, build: e.def.bulky ? 'bulky' : 'chibi', hat: { style: e.def.hat, color: e.def.hatColor },
          colors: e.def.colors, weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long' });
        const a = W.mob({ x: e.x * M, y: e.y * M, z: e.z * M, rig, pose: false, fly: true, r: 6, half: 0 });
        a.setSolid(false);
        v = { actor: a, rig, e, fade: 0, dead: false, hatT: 0 };
        this.enemyActors.set(e.id, v);
      }
      v.e = e;
      const want = e.revealT > 0 || S7.cheats.reveal ? 1 : 0;
      v.fade = S7.approach(v.fade, want, dt * 5);
      v.actor.fade = v.fade;
      v.actor.visible = v.fade > .02;
      v.actor.place(e.x * M, e.y * M, e.z * M);
      const pose = e.alive ? (e.laughing ? 'cheer' : null) : 'down';
      // the laugh shivers through the body; a thawed one sinks into the snow
      v.actor.sink = e.alive ? 0 : Math.min(24, e.deadT * 40);
      const shiver = e.laughing ? Math.sin(this.time * 38 + e.id) * .18 : 0;
      v.rig.update(dt, { x: e.x * M, y: e.y * M, z: e.z * M, facing: (e.ang || 0) + shiver, vx: 0, vy: 0, pose: pose || undefined,
        expr: e.laughing ? 'smile' : undefined, hurt: e.hitT > 0 ? 1 : 0 });
      if (!e.alive && e.deadT > .9) { v.actor.remove(); this.enemyActors.delete(e.id); }
    }
    for (const [id, v] of this.enemyActors) {
      if (!seen.has(id)) { v.actor.remove(); this.enemyActors.delete(id); }
    }
  }

  syncBoss(dt) {
    const sim = this.sim, b = sim.boss, W = this.world, M = S7.M;
    if (!b) return;
    if (!this.bossActor) {
      let rig;
      if (b.id === 'bellcaptain') rig = new E.Humanoid({ size: 2.1, build: 'bulky', hat: { style: 'helmet', color: '#d4a02a' }, colors: { cloth: '#3a2430', coat: '#3a2430', pants: '#1a121c', boot: '#0a0608', trim: '#d4a02a', skin: '#e8b890', hair: '#4a3a40' }, weapon: null, outfit: 'coat', sleeves: 'long' });
      else rig = new E.Blob({ R: 26, colors: { dk: '#8aa0c0', base: '#f2f6ff', lt: '#ffffff', spec: '#ffffff', eye: '#1a1a20', pupil: '#000' }, mouth: true });
      const a = W.mob({ x: b.x * M, y: b.y * M, z: b.z * M, rig, pose: false, fly: true, r: 10, half: 0 });
      a.setSolid(false);
      this.bossActor = { actor: a, rig, id: b.id };
    }
    this.bossActor.actor.place(b.x * M, b.y * M, b.z * M);
    if (this.bossMove) this.bossMove.update(dt);
    const atk = this.bossMove ? this.bossMove.state : null;
    if (this.bossActor.id === 'bellcaptain') this.bossActor.rig.update(dt, { x: b.x * M, y: b.y * M, z: b.z * M, facing: Math.atan2(sim.pos.y - b.y, sim.pos.x - b.x), attack: atk, pose: b.alive ? undefined : 'down' });
    else this.bossActor.rig.update(dt, { squash: atk ? .3 : 0, look: [0, 0] });
  }

  /* ---- each fixed step: mirror the sim, place the camera, consume events ---- */
  step(dt) {
    const sim = this.sim, W = this.world, M = S7.M;
    this.time += dt;
    const p = sim.pos;
    this.gunKick = Math.max(0, this.gunKick - dt * 6);
    for (const h of sim.heroes) {
      const v = this.heroes[h.id];
      if (!v) continue;
      const active = h === sim.me;
      v.actor.place(p.x * M, p.y * M, p.z * M);
      const spd = active ? sim.speed : 0;
      const ang = S7.legAt(this.area, sim.legId, sim.s).ang + (sim.dir < 0 ? Math.PI : 0);
      v.rig.update(dt, { x: p.x * M, y: p.y * M, z: p.z * M, vx: Math.cos(ang) * spd * M, vy: Math.sin(ang) * spd * M, facing: ang,
        point: this.isAim() && active ? true : false, aim: this.isAim() && active ? sim.aimPitch : 0,
        pose: h.frozen ? 'down' : (sim.braking && active ? 'crouch' : undefined), run: active && spd > 1 ? Math.min(1, spd / 4) : 0,
        dash: active && sim.tuckT > 0 });
      v.actor.visible = active && !this.isAim();
    }
    this.syncEnemies(dt);
    this.syncBoss(dt);
    this.syncNpcs(dt);
    // the camera
    if (sim.camOverride) {   // a cutscene cut: the boss, framed by the camera until its dialogue ends
      const co = sim.camOverride, lk = co.look;
      const yaw = Math.atan2(lk[1] - co.at[1], lk[0] - co.at[0]), hd = Math.hypot(lk[0] - co.at[0], lk[1] - co.at[1]);
      W.camera.fixed = { x: co.at[0] * M, y: co.at[1] * M, z: co.at[2] * M, yaw, pitch: Math.atan2(lk[2] - co.at[2], hd), roll: 0, fov: co.fov };
    } else if (this.isAim()) {
      const eye = sim.eyePos();
      this.camTarget = { mode: 'aim', eye };
      W.camera.fixed = { x: eye.x * M, y: eye.y * M, z: eye.z * M, yaw: eye.yaw, pitch: eye.pitch, roll: 0, fov: 54 };
    } else {
      const shot = sim.area.kind === 'room' ? this.roomShot() : S7.shotAt(sim.area, sim.legId, sim.s);
      this.camTarget = { mode: 'shot', shot };
      if (shot) {
        const at = shot.at, tx = p.x, ty = p.y, tz = p.z + 1.2;
        const yaw = Math.atan2(ty - at[1], tx - at[0]);
        const hd = Math.hypot(tx - at[0], ty - at[1]);
        const pitch = Math.atan2(tz - at[2], hd) * .9;
        const fov = shot.fov || 54;
        W.camera.fixed = { x: at[0] * M, y: at[1] * M, z: at[2] * M, yaw, pitch, roll: 0, fov };
      }
    }
    // events
    this.consume();
    W.step(dt);
    this.ringT = Math.max(0, this.ringT - dt);
  }

  isAim() { return this.sim.mode === 'aim' || (this.sim.aimHeld && !this.sim.leg.ski); }
  roomShot() { const a = this.area.cam; return { at: a.at, fov: a.fov, look: this.area.lookAt }; }

  /** the sim's events for this step: sparks, sounds, the scan ring, the footprint and tension cues */
  consume() {
    const sim = this.sim;
    const list = sim.ev.splice(0);
    for (const e of list) {
      if (['talk', 'note', 'code_request', 'boss', 'gate'].includes(e.type)) this.inbox.push(e);
      switch (e.type) {
        case 'shot': this.gunKick = 1; S7.sfx(e.weapon === 'shotgun' ? 'boom' : e.weapon === 'rifle' ? 'shoot' : 'laser'); if (e.hit) this.spark(e.hits[0]); break;
        case 'hit': this.spark({ at: e.at }); S7.sfx('hit'); break;
        case 'kill': this.game.shake(e.thaw ? 2 : 1); S7.sfx(e.thaw ? 'thaw' : 'hit'); this.game.particles.glints(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M + 14, 10, '#e6fbff'); if (e.thaw) S7.note(this, 'THAW.', e.at); break;
        case 'laugh': S7.laugh(e); break;
        case 'explode': this.game.shake(4); this.game.flash('#ffffff'); S7.sfx('boom'); this.game.particles.explosion(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M + 8, 1.2); break;
        case 'scan': this.ringT = .7; S7.sfx('scan'); break;
        case 'hurt': this.game.shake(3); S7.sfx('hurt'); break;
        case 'freeze': S7.sfx('freeze'); this.game.shake(6); break;
        case 'switch': S7.sfx('select'); break;
        case 'pickup': S7.sfx(e.kind === 'red' ? 'heal' : 'coin'); break;
        case 'gate': S7.sfx('door'); this.game.shake(2); break;
        case 'gate_fail': S7.sfx('bump'); break;
        case 'junction': S7.sfx('confirm'); break;
        case 'boss': S7.sfx('boss'); break;
        case 'boss_hit': S7.sfx(e.warm ? 'thaw' : 'hit'); this.game.shake(e.warm ? 4 : 2); break;
        case 'bossdown': this.game.shake(10); S7.sfx('victory'); break;
        case 'boss_pulse': this.bossMove = new E.Attack(this.bossActor && this.bossActor.id === 'bellcaptain' ? 'haymaker' : 'sweep'); this.bossMove.start(); this.game.flash('#ffe8e0'); S7.sfx('boom'); this.game.particles.explosion(e.at[0] * S7.M, e.at[1] * S7.M, e.at[2] * S7.M, e.r); break;
        case 'ability': S7.sfx('powerup'); this.game.flash('#fff8e8'); break;
        case 'rime_drop': S7.sfx('coin'); break;
        case 'red_drop': break;
        case 'heal': S7.sfx('heal'); break;
        case 'branch': S7.sfx('select'); break;
        case 'turn': S7.sfx('swing'); break;
        case 'wave': S7.sfx('confirm'); break;
        case 'thaw_self': S7.sfx('powerup'); break;
        default: break;
      }
    }
  }

  spark(hit) {
    if (!hit || !hit.at) return;
    const [x, y, z] = hit.at;
    this.game.particles.sparks(x * S7.M, y * S7.M, z * S7.M + 14, 8, null, { color: '#fff6d0' });
  }

  /* ---- world drawing, once per frame, under the actors ---- */
  onWorldDraw(w, r) {
    const sim = this.sim, M = S7.M;
    const pen = w.pen;
    // the scan ring and the footprints
    for (const f of sim.footprints) {
      const a = Math.min(1, f.life / 1.5);
      w.arc(f.x * M, f.y * M, f.z * M + 1, 0, 8, 0, TAU2, '#2a3450', .45 * a);
    }
    if (this.ringT > 0) {
      const k = 1 - this.ringT / .7, R = S7.live.scanRange * M * k;
      const p = sim.pos;
      w.arc(p.x * M, p.y * M, p.z * M + 2, R * .85, R, 0, TAU2, '#ff6a50', .7 * (1 - k));
    }
    // the warm spots of the revealed Whiteouts
    for (const e of sim.enemies) {
      if (!e.alive || (e.revealT <= 0 && !S7.cheats.reveal)) continue;
      const pulse = 2.6 + Math.sin(this.time * 9 + e.id) * .6;
      w.glow(e.x * M, e.y * M, (e.z + e.warm) * M, pulse, '#ff3a2a', { core: '#ffe0c0', light: true });
    }
    // the boss's warm spot
    if (sim.boss && sim.boss.alive) {
      const b = sim.boss;
      w.glow(b.x * M, b.y * M, (b.z + b.warmZ) * M, 5 + Math.sin(this.time * 6) * .6, '#ff3a2a', { core: '#ffe0c0', light: true });
    }
    // frozen persona: ice around its body
    for (const h of sim.heroes) {
      if (!h.frozen) continue;
      const p = sim.pos;
      pen.at(p.x * M, p.y * M, p.z * M, 0);
      pen.box(0, 0, 14, 22, 22, 26, '#bfe6ff');
      pen.at();
    }
    // the first-person gun
    if (this.isAim() && w.overlay) this.drawGun(w.overlay.pen);
    // the ghost of the echo run
    if (this.ghost) this.drawGhost(w, this.ghost);
  }

  drawGun(pen) {
    const sim = this.sim, me = sim.me, W = S7.WEAPONS[S7.PERSONAS[me.id].weapon];
    const kick = this.gunKick * (W.kick || .5);
    pen.at();
    const bx = 14 - kick * 1.2, by = 5.4, bz = -6.2 + kick * .7;
    pen.box(bx, by, bz, 8, 1.6, 2.4, '#2a2a30');
    pen.box(bx - 1, by, bz + 1.4, 8.6, 1.8, 1.2, '#1a1a20');
    const len = S7.PERSONAS[me.id].weapon === 'rifle' ? 12 : 6;
    pen.box(bx + 8 + len / 2, by, bz + .4, len, 1.1, 1.1, '#3a3a40');
    if (W.pellets > 1) pen.box(bx + 8 + len / 2, by - 1.6, bz + .2, len, 1.1, 1.1, '#3a3a40');
    pen.ball(bx - 2, by + .4, bz - 3.6, 2.2, 2.2, 2.2, '#c8a890');
    pen.tube(bx - 3, by + 3.8, bz - 6, bx - 2, by + 3.8, bz - 4.5, 1.2, S7.PERSONAS[me.id].colors.cloth);
    pen.at();
  }

  drawGhost(w, g) {
    const M = S7.M, p = g.pos;
    if (!p) return;
    w.glow(p.x * M, p.y * M, (p.z + 1.4) * M, 2.2, '#9ad8ff', { core: '#ffffff', light: false });
  }

  /* ---- the HUD, drawn over the world ---- */
  drawLabels(r) {
    const sim = this.sim, W = this.world;
    if (!sim.junction) return;
    const opts = sim.junction.options, pick = sim.junction.pick;
    opts.forEach((id, i) => {
      const q = S7.legAt(this.area, id, 3);
      const sc = W.project(q.x * S7.M, q.y * S7.M, (q.z + 2.4) * S7.M);
      if (!sc) return;
      const on = i === pick;
      const label = (on ? '> ' : '  ') + (S7.LEG_LABELS[id] || id.toUpperCase()) + (on ? ' <' : '');
      r.text(label, sc[0], sc[1], on ? '#ffe070' : '#d8d8e8', { align: 'center', outline: true, scale: 1 });
    });
  }
  setGhost(pos) { this.ghost = pos ? { pos } : null; }
  dispose() { try { this.world.dispose(); } catch (err) { /* already gone */ } }
};

/* the text of a thaw or a laugh, drawn over the Whiteout in the world */
S7.note = (pres, text, at) => {
  const M = S7.M;
  pres.game.particles.text(at[0] * M, at[1] * M, at[2] * M + 22, text, '#fff6c0');
};

// ---- src/40-scenes.js
/* Skiller7: scenes, input, the run (sim + presenter + bot), Room 7, the dev panel, the HUD, the AI Hub hooks, and start. */
S7.game = null;
S7.hub = null;             // the AI Hub client (window.AIHub) when it is there
S7.idle = 0;
S7.run = null;             // { sim, pres, area, talk, bot, cheats, done }

S7.INPUT = Object.assign({}, E.Input.DEFAULT, {
  fwd: ['KeyW', 'ArrowUp', 'Pad0'],
  back: ['KeyS', 'Pad1'],
  turn: ['KeyA', 'KeyD', 'Pad11'],
  aim: ['Mouse2', 'ShiftLeft', 'ShiftRight', 'Pad6'],
  fire: ['Mouse0', 'KeyJ', 'Pad7'],
  scan: ['Space', 'Pad4'],
  ability: ['KeyE', 'Pad5'],
  switchP: ['KeyQ', 'Pad3'],
  heal: ['KeyH', 'Pad8'],
  interact: ['KeyF', 'Pad2'],
  ring: ['KeyR', 'Pad10']
});

/* ---- the controller look: PlayStation glyphs (the default) or Xbox A B X Y ---- */
S7.GLYPHS = {
  PlayStation: { Pad0: ['X', '#5b8cff'], Pad1: ['O', '#ff5a5a'], Pad2: ['SQ', '#e06cc8'], Pad3: ['TR', '#5cd6a0'] },
  Xbox: { Pad0: ['A', '#58c85a'], Pad1: ['B', '#ff5a4a'], Pad2: ['X', '#4a8cff'], Pad3: ['Y', '#f0d040'] }
};
S7.ACTION_PAD = { fwd: 'Pad0', back: 'Pad1', interact: 'Pad2', switchP: 'Pad3', confirm: 'Pad0', cancel: 'Pad1', aim: 'Pad6', fire: 'Pad7', scan: 'Pad4', ability: 'Pad5', heal: 'Pad8', ring: 'Pad10', turn: 'Pad11', start: 'Pad9' };
S7.padName = (action) => S7.ACTION_PAD[action];
/** a button prompt: a coloured disc with its letter (controller), or the key's cap (keyboard and mouse) */
S7.prompt = (g, x, y, action, text) => {
  const pad = S7.isPad();
  if (!pad) {
    const label = text || S7.game.input.label(action) || '?';
    const w = E.font.width(label) + 6;
    E.ui.box(g, x, y - 4, w, 11, { bg: '#20202c', border: '#8a86a8', gradient: false });
    E.font.text(g, label, x + 3, y - 1, '#ffffff');
    return w + 4;
  }
  const pad_ = S7.padName(action);
  const style = S7.GLYPHS[S7.game.settings.glyphs === 'Xbox' ? 'Xbox' : 'PlayStation'];
  const sym = style[pad_] || ['?', '#999'];
  E.px.disc(g, x + 4, y + 1, 4.5, sym[1]);
  E.font.text(g, sym[0], x + 4 - E.font.width(sym[0]) / 2, y - 1, '#0b0814');
  const label = text || '';
  if (label) E.font.text(g, label, x + 11, y - 1, '#f4f0ff');
  return 11 + (label ? E.font.width(label) + 4 : 0);
};
/* the last time a key, a click or a touch came in: the attract timer and the attract exit read it (a press between two
 * steps still counts) */
S7.lastInput = -1e9;
if (typeof addEventListener === 'function') for (const t of ['keydown', 'pointerdown', 'touchstart', 'wheel']) addEventListener(t, () => { S7.lastInput = performance.now(); }, true);
/* the mouse: its movement since the last step turns the aim while the aim button is held (no pointer lock needed) */
S7.mouseMove = [0, 0];
if (typeof addEventListener === 'function') addEventListener('mousemove', e => { S7.mouseMove[0] += e.movementX || 0; S7.mouseMove[1] += e.movementY || 0; });
S7.isPad = () => /gamepad|pad/i.test(String(S7.game.input.lastDevice));
S7.anyInput = () => {
  const I = S7.game.input;
  return I.anyPressed() || I.move()[0] !== 0 || I.move()[1] !== 0;
};
S7.touchOnly = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

/* ---- the intents of one step: the player's devices, or the bot ---- */
S7.readIntents = (dt) => {
  const I = S7.game.input, m = I.move(), k = S7.live;
  const cam = S7.run && S7.run.pres && S7.run.pres.world ? S7.run.pres.world.camera : null;
  const mouse = [0, 0];
  if (cam && cam.takeMouse) cam.takeMouse(mouse);
  const aim = I.down('aim');
  const moved = S7.mouseMove;
  mouse[0] += moved[0]; mouse[1] += moved[1]; S7.mouseMove = [0, 0];
  return {
    fwd: I.down('fwd') || (m[1] < -.5 && !aim),
    back: I.down('back') || m[1] > .6 && !aim,
    turn: I.pressed('turn'),
    aim,
    fire: I.down('fire'),
    fireEdge: I.pressed('fire'),
    scan: I.pressed('scan'),
    ability: I.pressed('ability'),
    switchP: I.pressed('switchP'),
    heal: I.pressed('heal'),
    interact: I.down('interact'),
    pay: I.pressed('interact'),
    ring: I.down('ring'),
    branch: I.pressed('left') ? -1 : I.pressed('right') ? 1 : 0,
    confirm: I.pressed('confirm'),
    aimDX: aim ? (m[0] * k.aimSpeed * dt + mouse[0] * .0024) : 0,
    aimDY: aim ? (-m[1] * k.aimSpeed * dt - mouse[1] * .0024) : 0
  };
};

/* ---- what the scenes answer: a person speaks, a note is read, the service door asks for its code, the boss begins ---- */
S7.onSceneEvent = (r, e) => {
  if (e.type === 'talk') {
    const n = S7.NPCS[e.id];
    if (!n) return;
    const rig = r.pres.npcs[e.id] ? r.pres.npcs[e.id].rig : null;
    r.talk.say(n.lines[r.areaId] || n.lines.t00, { name: n.name, portrait: rig && rig.drawPortrait ? rig : undefined, voice: S7.VOICE[n.voice] });
  } else if (e.type === 'note') {
    const note = S7.NOTES[e.id];
    r.talk.say([note.text], { name: 'DOSSIER: ' + note.title, voice: S7.VOICE.hero });
  } else if (e.type === 'code_request') {
    const g = r.area.gates.find(x => x.id === e.id);
    r.code = { id: e.id, label: g.label, at: 0, cells: new Array(g.code.length).fill(0), wrong: 0 };
  } else if (e.type === 'boss' && e.phase === 1) {
    S7.startCut(r, S7.BEATS.boss);
  }
};
/* ---- cutscenes: a generator of camera shots and dialogue. A shot holds the camera for its seconds; confirm, cancel or
 * pause skips it, and closing a line of dialogue moves on. The sim is frozen while a cut plays. ---- */
S7.startCut = (r, gen) => { if (!r.bot) r.cut = { gen: gen(r), wait: 0 }; };
S7.cutStep = (r, dt, talkBusy) => {
  const c = r.cut;
  if (!c) return false;
  if (talkBusy) return true;
  const I = S7.game.input;
  if (c.wait > 0) {
    c.wait -= dt;
    const skip = I.pressed('confirm') || I.pressed('cancel') || I.pressed('pause');
    if (c.wait > 0 && !skip) return true;
    c.wait = 0;
  }
  const n = c.gen.next();
  if (n.done) { r.cut = null; r.sim.camOverride = null; return false; }
  const v = n.value || {};
  if (v.say) { r.sim.camOverride = null; r.talk.say(v.say, v.opts || {}); return true; }
  if (v.shot) { r.sim.camOverride = { at: v.shot.at, look: v.shot.look, fov: v.shot.fov || 50 }; c.wait = v.t || 3; return true; }
  return true;
};
S7.gateCode = (area, id) => area.gates.find(g => g.id === id).code;
/** the service door: the digits typed against its code */
S7.submitCode = (r, typed) => {
  const c = r.code;
  if (typed === S7.gateCode(r.area, c.id)) {
    r.code = null;
    r.sim.openGate(c.id);
    r.talk.say(['The door gives with a sigh of cold air and old lift grease.'], { name: c.label });
  } else {
    c.wrong = 1.2; c.cells = c.cells.map(() => 0); c.at = 0;
    S7.sfx('bump');
  }
};
S7.codeStep = (r, dt) => {
  const I = S7.game.input, c = r.code;
  if (r.bot) { S7.submitCode(r, c.cells.length ? S7.gateCode(r.area, c.id) : ''); return; }
  if (I.pressed('cancel')) { r.code = null; return; }
  if (I.repeat('up', .3, .12)) c.cells[c.at] = (c.cells[c.at] + 1) % 10;
  if (I.repeat('down', .3, .12)) c.cells[c.at] = (c.cells[c.at] + 9) % 10;
  if (I.pressed('left')) c.at = Math.max(0, c.at - 1);
  if (I.pressed('right')) c.at = Math.min(c.cells.length - 1, c.at + 1);
  if (c.wrong > 0) c.wrong -= dt;
  if (I.pressed('confirm')) { if (c.at < c.cells.length - 1) c.at++; else S7.submitCode(r, c.cells.join('')); }
};
S7.drawCode = (r, c) => r.overlay(g => {
  const w = 150, x = r.W / 2 - w / 2, y = r.H / 2 - 34;
  E.ui.box(g, x, y, w, 62, { bg: ['#1a1030', '#0a0618'], border: '#c8a0ff', alpha: .95 });
  E.font.text(g, c.label, r.W / 2, y + 6, '#ffe8c0', { align: 'center' });
  c.cells.forEach((d, i) => {
    const cx = r.W / 2 - c.cells.length * 10 + i * 20;
    E.ui.box(g, cx, y + 20, 16, 22, { bg: i === c.at ? '#4a3a70' : '#20163a', border: i === c.at ? '#ffe070' : '#6a5a8a', gradient: false });
    E.font.text(g, String(d), cx + 5, y + 26, '#ffffff');
  });
  E.font.text(g, c.wrong > 0 ? 'WRONG CODE' : 'UP/DOWN CHANGE   CONFIRM NEXT', r.W / 2, y + 49, c.wrong > 0 ? '#ff7a6a' : '#9a90b0', { align: 'center' });
});

/* ---- the run: one area under play, or the bot's attract loop ---- */
S7.beginRun = (areaId, o = {}) => {
  S7.endRun();
  const area = S7.AREAS[areaId];
  const sim = new S7.Sim(area, o);
  const pres = new S7.Presenter(S7.game, sim, area, o);
  pres.build();
  const run = { sim, pres, area, areaId, talk: new E.Dialog(S7.game), bot: !!o.bot, time: 0, reportedHub: false, talked: {}, code: null, talkOpen: false };
  S7.run = run;
  if (o.bot) Object.assign(S7.cheats, { god: true, reveal: true, ammo: true });
  if (areaId === 'echo' && S7.prog.echoBest && S7.prog.echoBest.trace) run.ghostTrace = S7.prog.echoBest.trace;
  run.titleT = 3.5;
  run.intro = o.intro || null;
  return run;
};
S7.endRun = () => {
  if (S7.run && S7.run.pres) S7.run.pres.dispose();
  S7.run = null;
};
/** a step of the run: the intents go to the sim, the presenter follows */
S7.stepRun = (dt) => {
  const run = S7.run;
  if (!run) return;
  const sim = run.sim;
  let I;
  if (run.bot) I = S7.botIntents(run, dt);
  else I = S7.readIntents(dt);
  if (run.echoWait) { run.echoWait = S7.hub && S7.hub.time() < 0; }
  if (!run.echoWait) sim.update(dt, I);
  run.time += dt;
  if (run.titleT > 0) run.titleT -= dt;
  if (run.ghostTrace) S7.updateGhost(run);
  run.pres.step(dt);
  if (S7.hub && S7.hub.active && run.areaId === 'echo' && !run.reportedHub) S7.hubProgress(run);
};

/** the echo's ghost: where the best run was at this time */
S7.updateGhost = (run) => {
  const tr = run.ghostTrace, t = run.sim.t;
  let lo = 0, hi = tr.length - 1;
  if (!tr.length || t > tr[hi][0] + .5) { run.pres.setGhost(null); return; }
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tr[mid][0] <= t) lo = mid; else hi = mid - 1; }
  const [, leg, s] = tr[lo];
  run.pres.setGhost(S7.legAt(run.area, leg, s));
};

/* ---- the bot: follows the rails, aims at the nearest Whiteout, fires, scans, uses its ability ---- */
S7.botIntents = (run, dt) => {
  const sim = run.sim, p = sim.pos;
  const I = { fwd: true, back: false, turn: false, aim: false, fire: false, fireEdge: false, scan: false, ability: false,
    switchP: false, heal: false, interact: false, ring: false, branch: 0, aimDX: 0, aimDY: 0 };
  if (sim.junction) { I.branch = sim.junction.pick < 1 ? 1 : 0; I.fwd = (run.time % 1) > .5; return I; }   // (lets go, presses forward again)
  if (sim.boss && sim.boss.alive) { /* the boss: stand and shoot */ }
  let target = null, best = 1e9;
  for (const e of sim.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 26 && d < best && (e.revealT > 0 || S7.cheats.reveal)) { best = d; target = e; }
  }
  const boss = sim.boss && sim.boss.alive ? sim.boss : null;
  if (boss && (!target || best > Math.hypot(boss.x - p.x, boss.y - p.y))) target = boss;
  if (target) {
    I.aim = true; I.fire = true;
    const want = Math.atan2(target.y - p.y, target.x - p.x) - (sim.dir > 0 ? p.ang : p.ang + Math.PI);
    const dyaw = S7.wrapAng(want - sim.aimYaw);
    I.aimDX = S7.clamp(dyaw, -.12, .12);
    const dist = Math.hypot(target.x - p.x, target.y - p.y);
    const wantPitch = Math.atan2((target.z + (target.warm || target.warmZ || 1.5)) - (p.z + 1.62), Math.max(.5, dist));
    I.aimDY = S7.clamp(wantPitch - sim.aimPitch, -.05, .05);
    I.fwd = false;
    I.fireEdge = true;
  }
  if (!target && run.bot) {
    if (sim.mode !== 'aim' && (run.time % 2.5) < dt) I.scan = true;
  }
  if (target && (run.time % 2.2) < dt) I.scan = true;
  if (sim.me.cdAbility <= 0 && (run.time % 7) < dt) I.ability = true;
  if (sim.me.frozen) I.interact = true;
  if (sim.gateNear && !sim.gateOpen[sim.gateNear.id] && (run.time % 1) < dt) I.pay = true;
  const person = sim.npcNear();
  // the bot knows the service code (it may cheat): the door opens as the bot reaches it
  if (sim.gateNear && sim.gateNear.kind === 'code' && !sim.gateOpen[sim.gateNear.id]) sim.openGate(sim.gateNear.id);
  run.talked = run.talked || {};
  if (person && !run.talked[person.id]) { run.talked[person.id] = true; I.pay = true; }
  if (sim.me.hp < 3 && S7.prog.red > 0 && (run.time % 1.2) < dt) I.heal = true;
  if (sim.leg.ski) { I.aim = false; I.fire = false; I.fireEdge = false; I.fwd = true; }
  return I;
};

/* ---- Room 7: the save room. A menu of its own, with Sister Rosalind, the clock, the wardrobe and the bench ---- */
S7.openRoom7 = (o = {}) => {
  S7.endRun();
  const area = S7.AREAS.room7;
  const sim = new S7.Sim(area, { room: true });
  const pres = new S7.Presenter(S7.game, sim, area, {});
  pres.build();
  const rosaRig = new E.Humanoid({ size: 1.25, build: 'chibi', hat: { style: 'band', color: '#f4f0ea' }, colors: { cloth: '#1a1a22', coat: '#1a1a22', pants: '#1a1a22', boot: '#0a0a0e', trim: '#f4f0ea', skin: '#f0cdb0', hair: '#c8c8d0' }, weapon: null, outfit: 'robe', sleeves: 'long' });
  const rosa = pres.world.mob({ x: 9 * S7.M, y: 5.4 * S7.M, z: 0, rig: rosaRig, pose: false, fly: true, r: 6, half: 0 });
  rosa.setSolid(false);
  S7.room7 = { sim, pres, area, talk: new E.Dialog(S7.game), menu: null, rosaRig, rosa };
  S7.room7Setup(o);
};
S7.room7Setup = (o) => {
  const R = S7.room7, P = S7.prog;
  const items = [];
  items.push({ label: 'TARGET 00: THE GRAND HOTEL NADA', id: 'go:t00' });
  items.push({ label: 'TARGET 01: APRES PISTE', id: 'go:t01', disabled: !P.bossDown['t00:bellcaptain'] });
  items.push({ label: 'ECHO RUN: THE BLACK RUN', id: 'go:echo', disabled: !P.bossDown['t01:powderking'] });
  items.push({ label: 'CUCKOO CLOCK: SAVE', id: 'save' });
  items.push({ label: 'WARDROBE: CHOOSE A COAT', id: 'wardrobe' });
  items.push({ label: 'WAX BENCH: UPGRADES', id: 'bench' });
  items.push({ label: 'DOSSIER: READ NOTES', id: 'dossier' });
  items.push({ label: 'SISTER ROSALIND: TALK', id: 'talk' });
  items.push({ label: 'TITLE', id: 'title' });
  R.items = items;
  R.menu = new E.Menu(S7.game, items.map(it => ({ label: it.label, disabled: !!it.disabled })), {
    x: 'center', y: 118, title: 'ROOM 7', box: true,
    onPick: (i) => S7.room7Pick(items[i].id), onCancel: () => {}
  });
  R.menuKind = 'main';
  if (o.intro) R.talk.say(S7.LINES.room7Intro, { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
  if (o.after) R.talk.say(S7.LINES.after[o.after], { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
};
S7.room7Pick = (id) => {
  const R = S7.room7;
  if (id === 'go:t00') { S7.game.go('play', { area: 't00' }); }
  else if (id === 'go:t01') S7.game.go('play', { area: 't01' });
  else if (id === 'go:echo') S7.game.go('play', { area: 'echo' });
  else if (id === 'save') { S7.game.saves.save(0); R.talk.say(['The clock strikes. Your coat is noted in the book.'], { name: 'CUCKOO CLOCK' }); }
  else if (id === 'wardrobe') S7.openWardrobe();
  else if (id === 'bench') S7.openBench();
  else if (id === 'dossier') S7.openDossier();
  else if (id === 'talk') R.talk.say(S7.LINES.rosalind, { name: 'SISTER ROSALIND', portrait: R.rosaRig, voice: S7.VOICE.rosalind });
  else if (id === 'title') S7.game.go('title');
};
S7.openWardrobe = () => {
  const R = S7.room7, P = S7.prog;
  const items = S7.ROSTER.map(id => ({ label: (P.unlocked[id] ? '' : '(LOCKED) ') + S7.PERSONAS[id].name + '  ' + S7.PERSONAS[id].abilityName, id, disabled: !P.unlocked[id] }));
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: i.disabled })), { x: 'center', y: 90, title: 'WARDROBE',
    onPick: (i) => { if (items[i].disabled) return; P.current = items[i].id; R.talk.say([S7.PERSONAS[items[i].id].abilityDesc], { name: S7.PERSONAS[items[i].id].name }); S7.room7Back(); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'wardrobe';
};
S7.openBench = () => {
  const R = S7.room7, P = S7.prog;
  const ups = [['hp', 'WAX: STURDY COAT  (+2 HP)', 6], ['ammo', 'WAX: BIG POCKETS  (+25% MAG)', 4], ['scan', 'WAX: LONG LENS  (+SCAN)', 4]];
  const items = ups.map(([k, label, cost]) => ({ label: label + '  ' + cost + ' RIME', k, cost, disabled: P.upg[k] >= 4 || P.rime < cost }));
  items.push({ label: 'BACK', k: 'back' });
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled && i.k !== 'back' })), { x: 'center', y: 90, title: 'WAX BENCH  (RIME ' + P.rime + ')',
    onPick: (i) => { const it = items[i]; if (it.k === 'back') return S7.room7Back(); if (it.disabled) return; P.rime -= it.cost; P.upg[it.k]++; S7.openBench(); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'bench';
};
S7.openDossier = () => {
  const R = S7.room7, keys = Object.keys(S7.prog.notes);
  const items = keys.map(k => ({ label: S7.NOTES[k].title, k }));
  if (!items.length) items.push({ label: 'NO NOTES YET', k: null, disabled: true });
  items.push({ label: 'BACK', k: 'back' });
  R.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled })), { x: 'center', y: 90, title: 'DOSSIER',
    onPick: (i) => { const it = items[i]; if (it.k === 'back') return S7.room7Back(); if (it.k) R.talk.say(S7.NOTES[it.k].text.match(/.{1,140}(\s|$)/g), { name: S7.NOTES[it.k].title }); },
    onCancel: () => S7.room7Back() });
  R.menuKind = 'dossier';
};
S7.room7Back = () => { const R = S7.room7; R.menuKind = 'main'; S7.room7Setup({}); };

/* ---- the dev panel: the tuning sliders, cheats, and the warps ---- */
S7.devRows = () => {
  const rows = [];
  let group = null;
  for (const k in S7.TUNING) {
    const t = S7.TUNING[k];
    if (t.group !== group) { group = t.group; rows.push({ head: group.toUpperCase() }); }
    rows.push({ kind: 'slider', key: k, label: t.label });
  }
  rows.push({ head: 'CHEATS' });
  rows.push({ kind: 'toggle', key: 'god', label: 'God mode' });
  rows.push({ kind: 'toggle', key: 'ammo', label: 'Infinite ammo' });
  rows.push({ kind: 'toggle', key: 'reveal', label: 'Reveal all Whiteouts' });
  rows.push({ head: 'ACTIONS' });
  rows.push({ kind: 'act', label: 'Give 20 Rime', fn: () => { S7.prog.rime += 20; } });
  rows.push({ kind: 'act', label: 'Give 5 Red', fn: () => { S7.prog.red += 5; } });
  rows.push({ kind: 'act', label: 'Unlock every coat', fn: () => { for (const id of S7.ROSTER) S7.prog.unlocked[id] = true; } });
  rows.push({ kind: 'act', label: 'Kill all Whiteouts', fn: () => { const r = S7.run; if (r) for (const e of r.sim.enemies) if (e.alive) r.sim.killEnemy(e, false); } });
  rows.push({ kind: 'act', label: 'Warp: Target 00', fn: () => S7.game.go('play', { area: 't00' }) });
  rows.push({ kind: 'act', label: 'Warp: Target 01', fn: () => S7.game.go('play', { area: 't01' }) });
  rows.push({ kind: 'act', label: 'Warp: Echo Run', fn: () => S7.game.go('play', { area: 'echo' }) });
  rows.push({ kind: 'act', label: 'Warp: Room 7', fn: () => S7.game.go('room7', {}) });
  rows.push({ kind: 'act', label: 'RESET TO DEFAULTS', fn: () => { S7.resetTuning(); S7.cheats.god = S7.cheats.ammo = S7.cheats.reveal = false; } });
  return rows;
};
S7.DEV_SEL = () => S7.devRows().filter(r => !r.head);

/* ---- the HUD ---- */
S7.drawHUD = (r, run) => {
  const sim = run.sim, pres = run.pres;
  const me = sim.me, P = S7.PERSONAS[me.id], W = S7.WEAPONS[P.weapon];
  r.overlay(gg => {
    const x = 6, y = 6;
    E.ui.box(gg, x, y, 96, 30, { bg: ['#1a1030', '#0a0618'], border: '#7a5a90', alpha: .85 });
    const h = pres.heroes[me.id];
    if (h && h.rig) h.rig.drawPortrait(gg, x + 4, y + 2, 26, { zoom: 3, turn: .4, bg: null });
    E.font.text(gg, P.name, x + 34, y + 4, '#ffe8c0', { scale: 1 });
    E.ui.hearts(gg, x + 34, y + 14, me.hp, me.maxHp);
    E.font.text(gg, W.name + '  ' + (S7.cheats.ammo ? '--' : me.mag) + '/' + me.magMax, x + 34, y + 23, '#c8c0e0');
    // the party: each persona's HP as a pip
    sim.heroes.forEach((h2, i) => {
      const pw = 14, px = x + 100 + i * 15;
      if (px + pw > r.W - 4) return;
      E.ui.box(gg, px, y, pw, 12, { bg: h2.frozen ? '#2a3a60' : '#1a1030', border: i === sim.cur ? '#ffe070' : '#4a3a60', gradient: false, alpha: .85 });
      E.ui.bar(gg, px + 2, y + 9, pw - 4, 2, h2.hp / h2.maxHp, h2.frozen ? '#8ad8ff' : '#ff5a4a');
      E.font.text(gg, S7.PERSONAS[h2.id].name.slice(0, 2), px + 2, y + 2, h2.frozen ? '#a8e0ff' : '#f0e8ff', { scale: 1 });
    });
    // the red and the rime
    E.ui.box(gg, x, y + 34, 60, 12, { bg: '#140c24', alpha: .8, gradient: false });
    E.font.text(gg, 'RED ' + S7.prog.red, x + 4, y + 37, '#ff8a7a');
    E.font.text(gg, 'RIME ' + S7.prog.rime, x + 32, y + 37, '#bff8ff');
    // scan and ability
    const sx = r.W - 92, sy = r.H - 22;
    E.ui.box(gg, sx, sy, 88, 16, { bg: '#140c24', alpha: .8, gradient: false });
    const scanR = sim.scanCD > 0 ? 1 - sim.scanCD / 1.6 : 1;
    E.ui.bar(gg, sx + 3, sy + 12, 82, 2, scanR, sim.scanCD > 0 ? '#7a6a8a' : '#ff6a50');
    E.font.text(gg, sim.scanCD > 0 ? 'SCAN ...' : 'SCAN READY', sx + 3, sy + 3, sim.scanCD > 0 ? '#9a90b0' : '#ffd2b0');
    const ab = P.abilityName, cd = me.cdAbility > 0 ? ' ' + Math.ceil(me.cdAbility) : ' READY';
    E.font.text(gg, ab + cd, sx + 3, sy - 9, me.cdAbility > 0 ? '#9a90b0' : '#ffe070');
    // the prompts
    let py = r.H - 38;
    const prompt = (act, text) => { S7.prompt(gg, 8, py, act, text); py -= 14; };
    if (sim.gateNear && !sim.gateOpen[sim.gateNear.id]) prompt('interact', sim.gateNear.kind === 'code' ? 'ENTER THE CODE: ' + sim.gateNear.label : 'PAY ' + sim.gateNear.price + ' RIME: ' + sim.gateNear.label);
    if (!sim.gateNear && sim.npcNear()) prompt('interact', 'TALK TO ' + S7.NPCS[sim.npcNear().id].name);
    if (sim.heroes.some(h => h.frozen) && me.frozen) prompt('interact', 'HOLD TO THAW THE SWEEP');
    if (sim.junction) { E.font.text(gg, 'PICK A WAY  (LEFT / RIGHT, THEN FORWARD)', r.W / 2, 22, '#ffe070', { align: 'center' }); }
    if (me.frozen) E.font.title(gg, 'FROZEN', r.W / 2, r.H / 2 - 40, { scale: 2, align: 'center' });
    if (sim.mode === 'aim' || pres.isAim()) {
      E.font.text(gg, '+', r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center' });
    }
    if (sim.boss && sim.boss.alive) {
      const b = sim.boss, bw = Math.min(260, r.W * .5);
      E.ui.box(gg, r.W / 2 - bw / 2 - 4, 6, bw + 8, 20, { bg: '#120a14', alpha: .85 });
      E.font.text(gg, b.name, r.W / 2, 9, '#ffd8a0', { align: 'center' });
      E.ui.bar(gg, r.W / 2 - bw / 2, 19, bw, 4, Math.max(0, b.hp / b.maxHP), '#ff6a50');
    }
    if (run.area.id === 'echo') {
      E.font.title(gg, sim.t.toFixed(2) + 's', r.W - 6, 6, { scale: 1, align: 'right' });
    }
    if (run.titleT > 0) {
      E.font.title(gg, run.area.title, r.W / 2, r.H / 2 - 60, { scale: 2, align: 'center', colors: ['#ffe8c0', '#ff6a50'] });
      E.font.text(gg, run.area.sub, r.W / 2, r.H / 2 - 40, '#c8c0e0', { align: 'center' });
    }
    if (run.bot) E.font.text(gg, 'ATTRACT', r.W / 2, r.H - 8, '#ff6a50', { align: 'center' });
  });
  pres.drawLabels(r);
};

/* ---- the scenes ---- */
S7.makeScenes = (game) => {
  const scenes = {};
  scenes.title = {
    enter() {
      S7.idle = 0; S7.idleSince = performance.now(); S7.endRun(); S7.game.weather = { kind: 'snow', amount: .55, wind: .25 };
      S7.music('title');
      const items = [];
      if (S7.touchOnly) items.push({ label: 'SETTINGS', id: 'settings' });
      else {
        items.push({ label: 'NEW GAME', id: 'new' });
        items.push({ label: 'CONTINUE', id: 'continue', disabled: !S7.game.saves.latest() });
        items.push({ label: 'ECHO RUN', id: 'echo' });
        items.push({ label: 'SETTINGS', id: 'settings' });
        items.push({ label: 'CONTROLS', id: 'controls' });
        items.push({ label: 'ABOUT & CREDITS', id: 'credits' });
      }
      this.ids = items.map(i => i.id);
      this.menu = new E.Menu(S7.game, items.map(i => ({ label: i.label, disabled: !!i.disabled })), { x: 'center', y: 128, box: false, color: '#f4eef8', pick: '#ffe070',
        onPick: (i) => this.pick(this.ids[i]) });
    },
    pick(id) {
      if (id === 'new') { S7.prog = S7.newProgress(); S7.game.go('room7', { intro: true }); }
      else if (id === 'continue') { const s = S7.game.saves.latest(); if (s) S7.game.saves.load(s.slot ?? 0); }
      else if (id === 'echo') S7.game.go('play', { area: 'echo' });
      else if (id === 'settings') S7.game.menu('settings');
      else if (id === 'controls') S7.game.menu('controls');
      else if (id === 'credits') S7.game.go('credits', { from: 'title' });
    },
    update(dt) {
      if (S7.anyInput() || S7.lastInput > S7.idleSince) S7.idleSince = performance.now();
      // (a hub session owns the screen: no attract)
      if (performance.now() - S7.idleSince > 10000 && !(S7.hub && S7.hub.active)) { S7.game.go('attract', { fade: 0 }); return; }
      if (S7.touchOnly) return;
      this.menu.update(dt);
    },
    draw(r) {
      r.sky(['#060a1e', '#16214a', '#3a4c86']);
      r.overlay(g => {
        E.font.title(g, S7.TITLE, r.W / 2, 22, { scale: 2, align: 'center', colors: ['#ffffff', '#ff6a50', '#c81e2a'], depth: 3, depthColor: '#3a0a10' });
        E.font.text(g, S7.TAG, r.W / 2, 60, '#e8e4ff', { align: 'center' });
        E.font.text(g, 'a game in the manner of Killer7', r.W / 2, 72, '#8a86b0', { align: 'center' });
      });
      if (S7.touchOnly) r.overlay(g => {
        E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H / 2 - 10, '#ffe070', { align: 'center', scale: 1 });
      });
      else this.menu.draw(r);
      r.overlay(g => { E.font.text(g, 'v' + S7.VERSION + '  ' + S7.hubLine(), 4, r.H - 10, '#6a6688'); });
    }
  };

  scenes.attract = {
    enter() {
      S7.prog = S7.prog || S7.newProgress();
      this.since = performance.now() + 400;   // (a press that brought us here doesn't leave again)
      this.order = ['t00', 't01', 'echo']; this.k = 0;
      this.begin();
    },
    begin() { const id = this.order[this.k % this.order.length]; this.k++; S7.beginRun(id, { bot: true }); S7.run.attract = true; S7.game.weather = null; S7.music(S7.AREAS[id].music); },
    update(dt) {
      if (S7.anyInput() || S7.lastInput > this.since) { S7.game.go('title', { fade: 0 }); return; }
      S7.stepRun(dt);
      const r = S7.run;
      if (r && (r.sim.complete || r.sim.over || r.time > 150)) { S7.endRun(); this.begin(); }
    },
    draw(r) { if (S7.run) { S7.drawRunWorld(r); S7.drawHUD(r, S7.run); } r.overlay(g => { E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H / 2 + 60, '#ffe070', { align: 'center' }); }); },
    exit() { S7.endRun(); Object.assign(S7.cheats, { god: false, reveal: false, ammo: false }); }
  };

  scenes.room7 = {
    enter(d) { S7.game.weather = null; S7.music('room7'); S7.openRoom7(d || {}); },
    update(dt) {
      const R = S7.room7;
      if (!R) return;
      R.pres.step(dt);
      R.rosaRig.update(dt, { x: 9 * S7.M, y: 5.4 * S7.M, z: 0, facing: -Math.PI / 2, expr: 'smile' });
      if (R.talk.update(dt)) return;
      if (R.menu) R.menu.update(dt);
    },
    draw(r) {
      const R = S7.room7;
      if (!R) return;
      R.pres.world.draw(r);
      r.overlay(g => {
        E.font.text(g, 'ROOM 7', 6, 6, '#e8c8a0');
        E.font.text(g, 'RIME ' + S7.prog.rime + '   RED ' + S7.prog.red, 6, 16, '#bff8ff');
      });
      if (R.menu) R.menu.draw(r);
      R.talk.draw(r);
    },
    exit() { if (S7.room7) { S7.room7.pres.dispose(); S7.room7 = null; } }
  };

  scenes.play = {
    pausable: true,
    enter(d) {
      d = d || {};
      if (d.resume && S7.run) { S7.keepRun = false; return; }
      S7.endRun();
      S7.game.weather = null;
      const areaId = d.area || 't00';
      S7.music(S7.AREAS[areaId].music);
      S7.run = S7.beginRun(areaId, { bot: !!d.bot, intro: null });
      if (S7.BEATS[areaId]) S7.startCut(S7.run, S7.BEATS[areaId]);
      if (areaId === 'echo' && S7.hub && S7.hub.active) { S7.run.echoWait = true; S7.hub.ready(); }
    },
    exit() { if (!S7.keepRun) S7.endRun(); S7.keepRun = false; },
    update(dt) {
      if (!S7.run) return;
      const r = S7.run, sim = r.sim;
      if (r.bot && r.talk.open) r.talk.close();   // the bot skips its dialogue
      if (r.code) { S7.codeStep(r, dt); r.pres.step(dt); return; }
      const talkBusy = r.talk.update(dt);
      const cutBusy = S7.cutStep(r, dt, talkBusy);
      if (talkBusy || cutBusy) { r.pres.step(dt); return; }   // the world and its camera carry on under dialogue and cuts
      S7.stepRun(dt);
      for (const e of r.pres.inbox.splice(0)) S7.onSceneEvent(r, e);
      if (sim.complete && !r.done) { r.done = true; S7.onComplete(r); }
      else if (sim.over && !r.done) { r.done = true; S7.game.go('gameover', { area: r.areaId }); }
    },
    draw(r) {
      if (!S7.run) return;
      S7.drawRunWorld(r);
      S7.drawHUD(r, S7.run);
      if (S7.run.code) S7.drawCode(S7.run, S7.run.code);
      S7.run.talk.draw(r);
    }
  };

  scenes.dev = {
    enter() { this.rowsAll = S7.devRows(); this.i = 0; },
    update(dt) {
      const I = S7.game.input, rows = this.rowsAll.filter(r => !r.head), n = rows.length;
      if (I.pressed('cancel') || I.pressed('pause')) { S7.game.go('play', { resume: true }); return; }
      if (I.repeat('up', .3, .09)) this.i = (this.i - 1 + n) % n;
      if (I.repeat('down', .3, .09)) this.i = (this.i + 1) % n;
      const row = rows[this.i];
      const step = (dir) => {
        if (row.kind !== 'slider') return;
        const t = S7.TUNING[row.key];
        S7.live[row.key] = S7.clamp(Math.round((S7.live[row.key] + dir * t.step) / t.step) * t.step, t.min, t.max);
      };
      if (I.repeat('left', .3, .07)) step(-1);
      if (I.repeat('right', .3, .07)) step(1);
      if (I.pressed('confirm')) {
        if (row.kind === 'toggle') S7.cheats[row.key] = !S7.cheats[row.key];
        if (row.kind === 'act') row.fn();
      }
      if (row.kind === 'slider' && I.pressed('confirm')) { S7.live[row.key] = S7.TUNING[row.key].def; }
    },
    draw(r) {
      S7.drawRunWorld(r);
      const rows = this.rowsAll;
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, r.H - 12, { bg: ['#0c0a18', '#06050c'], border: '#8a7ab0', alpha: .9 });
        E.font.title(g, 'DEV MODE', r.W / 2, 12, { scale: 1, align: 'center' });
        E.font.text(g, 'UP/DOWN choose   LEFT/RIGHT change   CONFIRM toggles or runs   CANCEL: back', r.W / 2, r.H - 16, '#8a86b0', { align: 'center' });
        let idx = 0;
        const colW = (r.W - 24) / 2, lineH = 8;
        let col = 0, x0 = 12, yy = 26;
        for (const row of rows) {
          if (row.head) { if (yy > r.H - 20 && col === 0) { col = 1; x0 = 12 + colW; yy = 26; } E.font.text(g, row.head, x0, yy, '#ffe070'); yy += lineH + 2; continue; }
          if (yy > r.H - 20 && col === 0) { col = 1; x0 = 12 + colW; yy = 26; }
          const sel = idx === this.i;
          if (sel) E.ui.box(g, x0 - 3, yy - 2, colW - 6, lineH + 2, { bg: '#3a2a60', gradient: false, alpha: .8 });
          let val = '';
          if (row.kind === 'slider') val = String(S7.live[row.key]);
          if (row.kind === 'toggle') val = S7.cheats[row.key] ? 'ON' : 'OFF';
          E.font.text(g, row.label, x0, yy, sel ? '#fff' : '#c8c0e0');
          E.font.text(g, val, x0 + colW * .6 - 6, yy, sel ? '#ffe070' : '#9a96b8', { align: 'right' });
          if (row.kind === 'slider') {
            const t = S7.TUNING[row.key];
            E.ui.bar(g, x0 + colW * .62, yy + 4, colW * .2, 2, (S7.live[row.key] - t.min) / (t.max - t.min), sel ? '#ffe070' : '#7a6a9a');
          }
          idx++; yy += lineH + 2;
        }
      });
    }
  };

  scenes.results = {
    enter(d) { this.d = d || {}; S7.music('victory'); S7.game.weather = null; },
    update(dt) {
      const I = S7.game.input;
      if (I.pressed('confirm') || I.pressed('cancel')) { const next = this.d.next || 'room7'; S7.game.go(next, this.d.nextData || {}); }
    },
    draw(r) {
      const d = this.d;
      r.sky(['#060a1e', '#16214a', '#2a3a70']);
      r.overlay(g => {
        E.ui.box(g, 16, 14, r.W - 32, r.H - 28, { bg: ['#1a1030', '#0a0618'], border: '#8a7ab0', alpha: .92 });
        E.font.title(g, d.title || 'TARGET COMPLETE', r.W / 2, 22, { scale: 2, align: 'center' });
        const lines = [
          'TIME  ' + (d.time || 0).toFixed(1) + ' s',
          'WHITEOUTS THAWED  ' + (d.kills || 0) + '   BLASTS TAKEN  ' + (d.blasts || 0),
          'SHOTS ' + (d.shots || 0) + '   HIT RATE ' + Math.round((d.acc || 0) * 100) + '%',
          'FREEZES ' + (d.deaths || 0) + '   REVEALED ' + (d.revealed || 0),
          'RIME +' + (d.rime || 0) + '   RED +' + (d.red || 0)
        ];
        lines.forEach((t, i) => E.font.text(g, t, r.W / 2, 60 + i * 14, '#e8e4ff', { align: 'center' }));
        E.font.title(g, 'RANK ' + (d.rank || 'C'), r.W / 2, 140, { scale: 3, align: 'center', colors: ['#ffe070', '#ff6a50'] });
        E.font.text(g, d.line || '', r.W / 2, 196, '#c8b8e0', { align: 'center', wrap: r.W - 60 });
        E.font.text(g, 'CONFIRM: CONTINUE', r.W / 2, r.H - 26, '#ffe070', { align: 'center' });
      });
    }
  };

  scenes.gameover = {
    enter(d) { this.d = d || {}; S7.game.weather = null; S7.music(null); this.menu = new E.Menu(S7.game, [{ label: 'RETURN TO ROOM 7' }, { label: 'TITLE' }], { x: 'center', y: 140, title: null, box: false, pick: '#ffe070',
      onPick: (i) => { S7.endRun(); if (i === 0) S7.game.go('room7', {}); else S7.game.go('title'); } }); },
    update(dt) { this.menu.update(dt); },
    draw(r) { r.sky(['#0a0408', '#2a0c14', '#0a0408']); r.overlay(g => { E.font.title(g, 'SNOWED IN', r.W / 2, 40, { scale: 3, align: 'center', colors: ['#ffffff', '#8ad8ff'] }); E.font.text(g, 'Oma Holle laughs. Her coat is still warm.', r.W / 2, 92, '#c8e4ff', { align: 'center' }); }); this.menu.draw(r); }
  };

  scenes.credits = {
    enter(d) { this.d = d || {}; this.y = 0; S7.music('title'); },
    update(dt) {
      this.y -= dt * 14;
      const I = S7.game.input;
      if (I.pressed('confirm') || I.pressed('cancel') || I.pressed('pause')) S7.game.go('title', { fade: 0 });
    },
    draw(r) {
      r.sky(['#060a1e', '#16214a', '#2a3a70']);
      r.overlay(g => {
        const lines = S7.CREDITS;
        let y = r.H - 20 + this.y;
        for (const ln of lines) {
          const [kind, text] = ln;
          if (kind === 'h') { E.font.title(g, text, r.W / 2, y, { scale: 1, align: 'center', colors: ['#ffe070', '#ff6a50'] }); y += 16; }
          else if (kind === 'w') { for (const part of E.font.wrap(text, r.W - 40)) { E.font.text(g, part, r.W / 2, y, '#e8e4ff', { align: 'center' }); y += 9; } }
          else y += 6;
        }
        if (y < -40) this.y = 0;
        E.font.text(g, 'CONFIRM: BACK', r.W / 2, r.H - 10, '#8a86b0', { align: 'center' });
      });
    }
  };
  return scenes;
};

/** the world of the current run (or the room), drawn with the presenter's camera */
S7.drawRunWorld = (r) => { const run = S7.run; if (run && run.pres && run.pres.world) run.pres.world.draw(r); };

/** a run's area is done: the results, the unlocks, the story */
S7.onComplete = (r) => {
  const P = S7.prog, st = r.sim.stats, acc = st.shots ? st.hits / st.shots : 0;
  const rank = acc > .6 && st.deaths === 0 ? 'S' : acc > .4 && st.deaths <= 1 ? 'A' : st.deaths <= 2 ? 'B' : 'C';
  const d = { title: r.area.title + ' COMPLETE', time: r.sim.t, kills: st.kills, blasts: st.blasts, shots: st.shots, acc, deaths: st.deaths, revealed: st.revealed, rime: st.rime, red: st.red, rank };
  if (r.areaId === 't00') {
    P.unlocked.tycoon = true; P.unlocked.yodeler = true;
    d.line = S7.LINES.t00Done.join(' ');
    d.next = 'room7'; d.nextData = { after: 't00' };
  } else if (r.areaId === 't01') {
    P.unlocked.photog = true; P.unlocked.avalanche = true;
    d.line = S7.LINES.t01Done.join(' ');
    d.next = 'credits'; d.nextData = { from: 'epilogue' };
  } else if (r.areaId === 'echo') {
    const best = P.echoBest;
    d.title = 'ECHO RUN';
    d.line = 'Your run is recorded. The next racer will race you.';
    if (!best || r.sim.t < best.time) P.echoBest = { time: r.sim.t, trace: r.sim.trace };
    d.next = 'room7';
    if (S7.hub && S7.hub.active) S7.hubResult(r);
  }
  P.rankBest[r.areaId] = P.rankBest[r.areaId] || rank;
  S7.game.go('results', d, { fade: 0 });
};

/* ---- AI Hub: the session (ghost mode) ---- */
S7.hubLine = () => (S7.hub && S7.hub.active ? 'AI HUB SESSION' : '');
S7.hubProgress = (run) => { const L = run.sim.leg; S7.hub.progress({ score: Math.round(100 * run.sim.s / Math.max(1, L.len)), label: run.sim.legId }); };
S7.hubResult = (r) => { if (r.reportedHub) return; r.reportedHub = true; S7.hub.result({ time: Math.round(r.sim.t * 1000) }); };

S7.start = () => {
  const E_ = My3D2dge;
  S7.E = E_;
  S7.defineThings();
  S7.prog = S7.newProgress();
  S7.hub = globalThis.AIHub || null;
  const game = new E_.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: S7.INPUT,
    menu: {
      items: [['Dev mode', () => { S7.keepRun = true; if (S7.game.shell) S7.game.shell.hide(); S7.game.go('dev', { fade: 0 }); }]],
      settings: [
        { key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation', help: 'The buttons drawn on screen: PlayStation, or Xbox A B X Y.' },
        // the engine's Filter setting (cel, pixel) turns the picture black in the software renderer used for testing, so it is left out
        ...E_.World3D.SETTINGS.filter(o => o.key !== 'filter3d')
      ],
      saves: { slots: 3 }
    } });
  S7.game = game;
  window.__game = game;
  game.saves.write = () => ({ data: S7.prog, place: S7.run ? S7.run.areaId : 'room7', level: 'room7' });
  game.saves.read = (save) => { if (save && save.data) S7.prog = save.data; };
  const scenes = S7.makeScenes(game);
  game.debug = S7.debugHandle();
  game.start({
    scenes, scene: 'title',
    boot: { title: S7.TITLE, steps: [
      ['The 3D engine', () => E_.World3D.init(game)],
    ] }
  });
  if (S7.hub && S7.hub.active) S7.hub.connect({ mode: 'ghost' }).then(() => { S7.hub.ready(); });
  S7.started = true;
};

// ---- src/45-beats.js
/* Skiller7: the cutscenes. Each beat is a generator of camera shots and dialogue (see S7.cutStep in 40-scenes). */
S7.BEATS = {
  t00: function* () {
    yield { shot: { at: [2.5, 14.5, 3.4], look: [11, 11.5, 1.2], fov: 56 }, t: 2.6 };
    yield { say: S7.LINES.t00Arrival, opts: { name: 'THE GRAND HOTEL NADA' } };
  },
  t01: function* () {
    yield { shot: { at: [57.5, 2.5, 4.2], look: [60.5, 40.5, 1.0], fov: 54 }, t: 2.6 };
    yield { say: S7.LINES.t01Arrival, opts: { name: 'APRES PISTE' } };
  },
  boss: function* (r) {
    const b = r.sim.boss, p = r.sim.pos;
    yield { shot: { at: [b.x - p.dx * 4.5, b.y - p.dy * 4.5, p.z + 2.4], look: [b.x, b.y, p.z + 1.8], fov: 46 }, t: 3.4 };
    yield { say: [b.def.line], opts: { name: b.def.name, voice: S7.VOICE.bell } };
  }
};

// ---- src/50-audio.js
/* Skiller7: sound. Everything is written in code: the engine's chip synth plays the sound effects, the songs and the
 * laughter (arpeggiated voices), and the dialogue blips are Animalese-style gibberish voices. No audio files. */
S7.SFX = {
  scan:   { wave: 'sine', freq: 'A5', to: 'A3', dur: .7, vol: .18, vib: [5, .04] },
  freeze: { wave: 'triangle', freq: 'E6', to: 'E3', dur: .5, vol: .22, arp: [0, -5, -12], step: .06 },
  thaw:   { wave: 'sine', freq: 'C6', to: 'G6', dur: .25, vol: .2, arp: [0, 4, 7, 12], step: .03 },
  hurt:   { wave: 'square', freq: 'G3', to: 'C3', dur: .2, vol: .2 },
  laser:  { wave: 'pulse', freq: 'A5', to: 'A3', dur: .09, vol: .2 },
  shoot:  { wave: 'noise', freq: 'C4', to: 'C2', dur: .12, vol: .34 },
  boom:   { wave: 'noise', freq: 'D2', to: 'D1', dur: .45, vol: .42 },
  hit:    { wave: 'square', freq: 'E5', to: 'E4', dur: .05, vol: .18 },
  swing:  { wave: 'sine', freq: 'G4', to: 'E3', dur: .08, vol: .1 },
  heal:   { wave: 'triangle', freq: 'C5', dur: .18, vol: .18, arp: [0, 4, 7, 12], step: .04 },
  coin:   { wave: 'square', freq: 'B5', dur: .12, vol: .16, arp: [0, 7], step: .05 },
  reload: { wave: 'square', freq: 'C4', to: 'C5', dur: .15, vol: .14 },
  empty:  { wave: 'square', freq: 'A3', dur: .04, vol: .14 },
  switch: { wave: 'triangle', freq: 'E5', to: 'C5', dur: .14, vol: .18 },
  bump:   { wave: 'square', freq: 'A2', dur: .08, vol: .2 },
  door:   { wave: 'saw', freq: 'D3', to: 'D5', dur: .35, vol: .14 },
  boss:   { wave: 'saw', freq: 'C2', to: 'C3', dur: .6, vol: .22, arp: [0, 3, 7], step: .15 },
  victory: { wave: 'square', freq: 'C5', dur: .15, vol: .18, arp: [0, 4, 7, 12, 16], step: .09 },
  powerup: { wave: 'triangle', freq: 'G4', to: 'G6', dur: .3, vol: .2 },
  confirm: { wave: 'square', freq: 'A5', dur: .06, vol: .14 },
  select:  { wave: 'square', freq: 'E5', dur: .03, vol: .1 },
  gameover: { wave: 'saw', freq: 'G3', to: 'G1', dur: 1.2, vol: .2 }
};
/* the engine's own presets, used by name */
S7.PRESETS = { boom: 'boom', shoot: 'shoot', laser: 'laser', hit: 'hit', hurt: 'hurt', coin: 'coin', heal: 'heal', door: 'door', bump: 'bump', confirm: 'confirm', select: 'select', powerup: 'powerup', swing: 'swing', victory: 'powerup', boss: 'charge', freeze: 'die', thaw: 'powerup', scan: 'blip' };
S7.sfx = (name, o) => {
  const a = S7.game && S7.game.audio;
  if (!a) return;
  const voice = S7.SFX[name];
  try {
    if (voice) a.sfx(voice, o);
    else a.sfx(S7.PRESETS[name] || name, o);
  } catch (err) { /* the sound is optional; a missing sound never stops the game */ }
};

/* the laughter of the Whiteouts: three voices (the giggler's hi-hi, the cackler's hoo, the brute's low ha) */
S7.LAUGH = {
  hi:  { wave: 'triangle', freq: 'E6', to: 'A6', arp: [0, 4, 7, 4], step: .045, dur: .2, vol: .12 },
  hoo: { wave: 'saw', freq: 'G4', to: 'E4', dur: .34, vol: .08, vib: [14, .04] },
  ha:  { wave: 'square', freq: 'C5', to: 'G4', arp: [0, -3], step: .08, dur: .16, vol: .12 }
};
S7.laugh = (e) => {
  const a = S7.game && S7.game.audio, v = S7.LAUGH[e.style] || S7.LAUGH.hi;
  if (!a) return;
  try { a.sfx(v, e.loud ? { vol: .9, pitch: 1.1 } : { vol: .5, pitch: .95 }); } catch (err) { /* optional */ }
};

/* dialogue voices: the Animalese-style gibberish of each speaker, a blip for each letter */
S7.VOICE = {
  rosalind: { wave: 'triangle', freq: 'A4', to: 'E5', dur: .06, vol: .13, vib: [7, .03] },
  murmel:   { wave: 'square', freq: 'D4', to: 'G4', dur: .05, vol: .12, vib: [11, .05] },
  pim:      { wave: 'sine', freq: 'C5', to: 'F5', dur: .07, vol: .12, vib: [4, .04] },
  bell:     { wave: 'saw', freq: 'G3', to: 'B3', dur: .05, vol: .1 },
  oma:      { wave: 'triangle', freq: 'F3', to: 'A3', dur: .08, vol: .14, vib: [5, .03] },
  hero:     { wave: 'pulse', freq: 'E4', to: 'A4', dur: .05, vol: .12, vib: [9, .04] }
};

/* the songs: note strings, one token a step (- holds, . rests, | is ignored; k s h drums) */
S7.SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E4 - G4 - C5 - B4 - A4 - G4 - E4 - . | A4 - C5 - E5 - D5 - C5 - A4 - G4 - . |' },
    { wave: 'triangle', vol: .18, notes: 'C3 - - - G2 - - - A2 - - - E2 - - - |' }
  ] },
  hotel: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 . |' },
    { wave: 'triangle', vol: .18, notes: 'A2 - E2 - F2 - C2 - |' },
    { wave: 'drums', notes: 'k . h . s . h . |' }
  ] },
  room7: { bpm: 58, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'C4 - - - E4 - - - A3 - - - G3 - - - |' },
    { wave: 'triangle', vol: .08, notes: 'C3 - - - A2 - - - |' }
  ] },
  slope: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'E5 - G5 B5 - A5 - G5 - E5 - . - |' },
    { wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 A2 A2 A3 A2 |' },
    { wave: 'drums', notes: 'k h s h k h s h |' }
  ] },
  boss: { bpm: 150, steps: 4, tracks: [
    { wave: 'saw', vol: .12, notes: 'C3 C3 D#3 C3 F3 F3 G3 F3 |' },
    { wave: 'square', vol: .1, notes: 'G4 . C5 . G4 . D#5 . |' },
    { wave: 'drums', notes: 'k k s k k s k s |' }
  ] },
  victory: { bpm: 110, steps: 4, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - G5 C6 - |' },
    { wave: 'triangle', vol: .16, notes: 'C3 G3 C3 G3 |' }
  ] }
};
S7.music = (name) => {
  const a = S7.game && S7.game.audio;
  if (!a) return;
  if (!name) { try { a.music(null); } catch (err) { /* nothing playing */ } return; }
  const song = S7.SONGS[name];
  if (!song) return;
  try { a.music(song, { fade: .4 }); } catch (err) { /* the songs are optional too */ }
};

// ---- src/60-text.js
/* Skiller7: the words. Dialogue, cards and the About & Credits screen. The voice is terse, formal, a little sinister,
 * and very polite about murder: hotel euphemisms, cold weather, and a laughing wind. */
S7.LINES = {
  t00Arrival: [
    'The Grand Hotel Nada, built in 1926. Somebody has been laughing in it ever since.',
    'Your coat is pressed. Your guests have not yet checked out.'
  ],
  t01Arrival: [
    'The village is quiet, too quiet for a place that sells skiing.',
    'Above it the black run goes all the way down to the Powder King, and the Powder King is laughing.'
  ],
  room7Intro: [
    'Welcome to Room 7. The featherbed on the bed is Oma Holle. She is one hundred and four years old and she has been asleep for a hundred years.',
    'Do not lift the featherbed. When she shakes it, the wardrobe opens, and seven coats step out. You are one of the seven.',
    'The Department of Discretion has booked guests for the Grand Hotel Nada. Mister Foehn has been laughing on the lower floors. Each time he laughs, a guest walks out of the room and is not there any more.',
    'Your guests have been checked in. Please check them out.'
  ],
  rosalind: [
    'Sister Rosalind, sir. The clock on the wall is the cuckoo clock. It saves your place, and it is never wrong about the time.',
    'The Wardrobe holds your coats. The Wax Bench will wax your skills, for Rime. Rime is what the crystals in the snow are made of, and it is what the mountain pays us in.',
    'Mind the gap at the lift. Mind the Whiteouts. You will not see them. You will hear them laugh.'
  ],
  after: {
    t00: [
      'The lift has been serviced. The Bellcaptain rang for the last time and will not ring again.',
      'The black run is open, sir, though it is steep. Gratuity is customary at the top.'
    ]
  },
  t00Done: [
    'THE BELLCAPTAIN IS OUT OF SERVICE. Rime is counted and the Wardrobe has two new coats.',
    'Mister Foehn has the laughter of a lift in him. He will not forget the room.'
  ],
  t01Done: [
    'THE POWDER KING MELTS, LAUGHING. The featherbed is quiet for one whole minute.',
    'Somewhere over the mountain, a warm wind laughs once more, very quietly, and goes out.'
  ]
};

/* the About & Credits screen: [kind, text]; kind h = heading, w = wrapped text, s = space */
S7.CREDITS = [
  ['h', 'SKILLER7'],
  ['w', 'Seven killers share one body and one mountain. Ride the rails. Stop. Scan for the laughing Whiteouts. Shoot the warm spot before it laughs.'],
  ['s', 0],
  ['h', 'SOURCE INFORMATION'],
  ['w', 'Source: Killer7 (Grasshopper Manufacture, 2005). This game is original: its name, world, characters, levels and music are its own. It takes the source\'s rail structure, its stop-and-scan first person and its tone.'],
  ['w', 'Title: a playful riff on the source\'s name, drawn by a random number generator from fifty riffs.'],
  ['s', 0],
  ['h', 'ENGINE'],
  ['w', 'my-3D2dge v0.85.2 (2D engine and its 3D module), three.js r182 and Rapier 0.19.3 from a CDN. AI Hub session client 1.4.0.'],
  ['s', 0],
  ['h', 'CONTROLS'],
  ['w', 'Keyboard: W walk, S stop, A or D turn round, hold Shift or right mouse to aim, left mouse fires, Space scans, E ability, Q switches coat, F interacts, R rings time, H heals.'],
  ['w', 'Controller: Cross walks, Circle stops, Square interacts, Triangle switches, R2 fires, L2 aims, L1 scans, R1 ability, L3 rings time, R3 turns round.'],
  ['s', 0],
  ['h', 'PEOPLE'],
  ['w', 'Oma Holle sleeps. Mister Foehn laughs. Sister Rosalind keeps the clock. The Bellcaptain rings. The Powder King melts. Murmel is owed a tip.'],
  ['s', 0],
  ['h', 'MUSIC AND SOUND'],
  ['w', 'Every note and every voice is written in code. Laughter is an arpeggio. Dialogue is Animalese-style gibberish, one blip a letter.'],
  ['s', 0],
  ['h', 'TESTING FEEDBACK'],
  ['w', 'About fifteen issues were caught: a crash on Room 7, a black frame from the Comic cel filter, two Rime gates that could lock a run, a junction that committed by itself, and a camera inside a wall. Five were game-breaking. The most useful test was the Node playthrough of every area; the least useful was frame-by-frame screenshots.'],
  ['s', 0],
  ['h', 'ENGINE FEEDBACK'],
  ['w', 'Liked most: the 3D module\'s fixed cameras and the card-drawn rigs, with the pause menu, settings and saves for free. Guessed wrong: particle argument orders, pen box centres, the cel and pixel filters (black in the software renderer, so left out of Settings), and the menu close. Built myself: the rail walker, the Whiteout AI, the persona abilities, the bot. One engine patch: accessories (goggles, scarves, moustaches, beards) for the card rig, marked S7 PATCH.'],
  ['s', 0],
  ['h', 'PROMPT FEEDBACK'],
  ['w', 'Liked: concrete deliverables, file names and checks, and the one-command test rule. Confusing: the plan is about 2,100 lines and asks for engine patches and seven full personas, so the scope had to be cut to fit. Change: give the plan a must, should and cut list and a size budget.'],
  ['s', 0],
  ['h', 'THANKS'],
  ['w', 'To the players who ride the rails at the speed of the snow.'],
];

/* the dossier: notes found on the rails (each one is a pickup; the dossier lists those you have read) */
S7.NOTES = {
  'note-powder': { title: 'SLOPE CLOSURE', text: 'The black run is closed to the public after the third bell. The Powder King is not a hazard. He is a snowman, and he would like you to stop shooting his nose.' },
  'note-lift': { title: 'LIFT SCHEDULE', text: 'The lift is serviced on the hour. Please do not stand under the bell. The service door behind the stairs is for staff, and the staff are not here.' },
  'note-ballroom': { title: 'BALLROOM, EVENING', text: 'Members may enter. Non-members may enter, but will be remembered. Mister Foehn asks that the waltz be played a little faster than the laughter.' }
};

/* the people you can talk to. lines by area; any: the lines for every other place */
S7.NPCS = {
  hansi: { name: 'HANSI MOOSER', voice: 'oma', kind: 'human', colors: { cloth: '#2f7a3a', coat: '#2f7a3a', pants: '#5a3a20', boot: '#2a1a10', trim: '#e0c060', skin: '#f5cfa8', hair: '#8a6a3a' }, hat: 'pointed', lines: {
    t01: ['Hoo-hoo! I am a yodeler. I yodel for money, and the Whiteouts do not pay, so I yodel for free and they laugh at me.',
          'The rope across the lane is for members. Mister Gerhardt is the member. The rope is his idea, and his rope has a sense of humour.'] } },
  murmel: { name: 'MURMEL', voice: 'murmel', kind: 'blob', lines: {
    t00: ['Murmel. Resort marmot. I am bungeed to this ski rack, which is my job, and I am very good at it.',
          'Gratuity is customary. Customary is the word we use when nobody can remember who started it.',
          'The Whiteouts laugh before they arrive. Listen for the laughing, scan, then shoot the warm spot. Do not shoot the air.'],
    t01: ['Gratuity is still customary, and the slope is steeper than the bill.',
          'Mister Gerhardt owes me a sled. He says it is in the Powder King\'s hands. I say the Powder King has no hands.'] } },
  pim: { name: 'PIM', voice: 'pim', kind: 'ghost', colors: { cloth: '#1a2a4a', coat: '#1a2a4a', pants: '#10182a', boot: '#0a0a10', trim: '#d8b040', skin: '#e8e8f0', hair: '#c8c8d8' }, hat: 'cap', lines: {
    t00: ['Hello. I am the lift boy. I have been on this chairlift seat since 1926, and I am still on duty.',
          'The service door behind the stairs has a code. Nineteen twenty-six, the year they stopped the lift. Please do not tell the Bellcaptain. He is very particular.'] } }
};

// ---- src/70-debug.js
/* Skiller7: the test and tool handle, game.debug. The tests and the dev tools read the state and drive the game
 * through these functions; the player never needs them. */
S7.debugHandle = () => ({
  snapshot() {
    const run = S7.run, R = S7.room7, sc = S7.game.sceneName;
    const r = run || null, sim = r ? r.sim : null;
    const hero = sim ? sim.me : null;
    return {
      scene: sc,
      version: S7.VERSION,
      area: r ? r.areaId : (R ? 'room7' : null),
      leg: sim ? sim.legId : null,
      s: sim ? +sim.s.toFixed(2) : null,
      dir: sim ? sim.dir : null,
      mode: sim ? sim.mode : null,
      persona: hero ? hero.id : null,
      hp: hero ? hero.hp : null,
      frozen: hero ? hero.frozen : null,
      heroes: sim ? sim.heroes.map(h => ({ id: h.id, hp: h.hp, frozen: h.frozen, mag: h.mag })) : [],
      red: S7.prog ? S7.prog.red : null,
      rime: S7.prog ? S7.prog.rime : null,
      enemies: sim ? { alive: sim.enemies.filter(e => e.alive).length, revealed: sim.enemies.filter(e => e.alive && e.revealT > 0).length, total: sim.stats.kills } : null,
      boss: sim && sim.boss ? { id: sim.boss.id, hp: +sim.boss.hp.toFixed(2), alive: sim.boss.alive, phase: sim.boss.phase } : null,
      cut: r ? !!r.cut : null,
      dialog: r ? !!r.talk.open : null,
      aim: sim ? { yaw: +sim.aimYaw.toFixed(3), pitch: +sim.aimPitch.toFixed(3) } : null,
      junction: sim && sim.junction ? sim.junction.options.slice() : null,
      complete: sim ? sim.complete : null,
      over: sim ? sim.over : null,
      time: sim ? +sim.t.toFixed(2) : null,
      stats: sim ? Object.assign({}, sim.stats) : null,
      unlocked: S7.prog ? Object.keys(S7.prog.unlocked).filter(k => S7.prog.unlocked[k]) : [],
      bossDown: S7.prog ? Object.keys(S7.prog.bossDown) : [],
      cheats: Object.assign({}, S7.cheats),
      live: Object.assign({}, S7.live),
      hash: sim ? S7.hashSim(sim) : null
    };
  },
  hash() { return S7.run ? S7.hashSim(S7.run.sim) : null; },
  go(scene, data) { S7.game.go(scene, data || {}, { fade: 0 }); },
  play(areaId, bot) { S7.game.go('play', { area: areaId, bot: !!bot }, { fade: 0 }); },
  tune(key, v) { if (!(key in S7.TUNING)) throw new Error('no tuning ' + key); S7.live[key] = v; },
  cheat(name, on) { S7.cheats[name] = !!on; },
  give(what, n) { if (what === 'rime') S7.prog.rime += n; if (what === 'red') S7.prog.red += n; if (what === 'coats') for (const id of S7.ROSTER) S7.prog.unlocked[id] = true; },
  killAll() { if (S7.run) for (const e of S7.run.sim.enemies) if (e.alive) S7.run.sim.killEnemy(e, false); },
  revealAll() { if (S7.run) for (const e of S7.run.sim.enemies) e.revealT = 99; },
  freezeMe() { if (S7.run) { const h = S7.run.sim.me; h.hp = 0; h.frozen = true; } },
  freezeAll() { if (S7.run) for (const h of S7.run.sim.heroes) { h.hp = 0; h.frozen = true; } },
  finishRun() { if (S7.run) { const sim = S7.run.sim; sim.s = sim.leg.len; sim.arriveEnd(); } },
  wave(name) { if (S7.run) S7.run.sim.spawnWave(name); },
  bot(on) { if (S7.run) S7.run.bot = !!on; },
  save(slot) { return S7.game.saves.save(slot === undefined ? 0 : slot); },
  load(slot) { return S7.game.saves.load(slot === undefined ? 0 : slot); },
  sceneName() { return S7.game.sceneName; }
});

/* a stable number for the sim's state: the same inputs always give the same hash */
S7.hashSim = (sim) => {
  const h = [sim.t, sim.s, sim.speed, sim.dir, sim.cur, sim.stats.kills, sim.stats.shots, sim.stats.hits, sim.stats.deaths,
    sim.heroes.reduce((a, x) => a + x.hp * 7 + x.mag, 0), sim.enemies.length, sim.enemies.reduce((a, e) => a + e.s + e.hp, 0)];
  let x = 0x811c9dc5;
  for (const n of h) { const v = Math.round(n * 1000) | 0; x ^= v; x = Math.imul(x, 0x01000193) >>> 0; }
  return x.toString(16).padStart(8, '0');
};

})();
