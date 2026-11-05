// SMASHBY: over-the-top arcade rugby sevens. The core: constants, the tuning registry (the dev panel's sliders), the
// RNG, the teams, venues and the commentary lines. Everything is in world units: one tile is 16.
const SM = {};   // the game's namespace, read by every other file
SM.T = 16;
// the pitch: the field of play is X0..X1 (64 tiles, a try line at each end) and Y0..Y1 (36 tiles, touch to touch);
// the in-goal runs five tiles beyond each try line to the dead-ball line
SM.X0 = 96; SM.X1 = 1120; SM.CX = 608;
SM.Y0 = 64; SM.Y1 = 640; SM.CY = 352;
SM.DL0 = 16; SM.DL1 = 1200;          // dead-ball lines
SM.POST0 = 24; SM.POST1 = 1192;      // the posts sit on the dead-ball lines
SM.GOALW = 29;                       // half the width between the uprights
SM.BAR = 34;                         // crossbar height
SM.COLS = 76; SM.ROWS = 41;          // the TileMap: 3 stand rows north, a rail, 36 field rows, the boards south
SM.STAND = 3;

// The tuning registry: every balance number the dev panel shows. Simulation code reads SM.TUNE.v.key, never a literal.
SM.TUNE_DEFS = [
  { key: 'runSpeed', label: 'Run speed', group: 'Movement', value: 100, min: 60, max: 160, step: 5 },
  { key: 'turboMult', label: 'Turbo multiplier', group: 'Movement', value: 1.45, min: 1, max: 2.2, step: .05 },
  { key: 'turboTank', label: 'Turbo tank (s)', group: 'Movement', value: 3, min: 1, max: 8, step: .25 },
  { key: 'turboRegen', label: 'Turbo refill (/s)', group: 'Movement', value: .3, min: .05, max: 1, step: .05 },
  { key: 'passSpeed', label: 'Pass speed', group: 'Passing', value: 230, min: 120, max: 400, step: 10 },
  { key: 'catchBase', label: 'Catch chance', group: 'Passing', value: .95, min: .5, max: 1, step: .01 },
  { key: 'tackleRange', label: 'Tackle reach', group: 'Contact', value: 14, min: 8, max: 30, step: 1 },
  { key: 'tackleBase', label: 'Tackle success', group: 'Contact', value: .78, min: .3, max: 1, step: .01 },
  { key: 'bigHitCharge', label: 'Big hit charge (s)', group: 'Contact', value: .7, min: .2, max: 2, step: .05 },
  { key: 'fendBeat', label: 'Fend strength', group: 'Contact', value: .7, min: 0, max: 1, step: .05 },
  { key: 'sidestepEvade', label: 'Sidestep evade (s)', group: 'Contact', value: .25, min: .05, max: .6, step: .05 },
  { key: 'kickMax', label: 'Kick distance', group: 'Kicking', value: 520, min: 200, max: 900, step: 20 },
  { key: 'bounceChaos', label: 'Oval bounce chaos', group: 'Kicking', value: .6, min: 0, max: 1, step: .05 },
  { key: 'windMult', label: 'Wind strength', group: 'Kicking', value: 1, min: 0, max: 3, step: .1 },
  { key: 'pressurePenalty', label: 'Catch pressure penalty', group: 'Passing', value: .12, min: 0, max: .4, step: .01 },
  { key: 'interceptMult', label: 'Interception chance', group: 'Passing', value: 1, min: 0, max: 2, step: .05 },
  { key: 'bigHitLaunch', label: 'Big hit launch', group: 'Contact', value: 1, min: .2, max: 3, step: .1 },
  { key: 'refRange', label: 'Ref sight range', group: 'Referee', value: 260, min: 60, max: 600, step: 10 },
  { key: 'refFov', label: 'Ref sight angle (rad)', group: 'Referee', value: 1.4, min: .4, max: 3.14, step: .05 },
  { key: 'ruckTime', label: 'Ruck length (s)', group: 'Breakdown', value: 1.6, min: .5, max: 4, step: .1 },
  { key: 'mashWeight', label: 'Ruck mash weight', group: 'Breakdown', value: .05, min: .01, max: .12, step: .005 },
  { key: 'hypeMult', label: 'Hype gain', group: 'Arcade', value: 1, min: 0, max: 3, step: .1 },
  { key: 'superTime', label: 'Super length (s)', group: 'Arcade', value: 4, min: 1, max: 10, step: .5 },
  { key: 'aiReaction', label: 'CPU reaction (s)', group: 'Arcade', value: .25, min: 0, max: 1, step: .05 },
  { key: 'cpuMash', label: 'CPU mash rate (/s)', group: 'Arcade', value: 9, min: 2, max: 20, step: 1 },
  { key: 'sinBin', label: 'Sin bin (s)', group: 'Rules', value: 30, min: 5, max: 120, step: 5 },
  { key: 'halfLength', label: 'Half length (s)', group: 'Rules', value: 120, min: 20, max: 600, step: 10 },
  { key: 'gameSpeed', label: 'Game speed', group: 'Rules', value: 1, min: .25, max: 2, step: .05 }
];
SM.TUNE = {
  v: {},
  defaults() { const d = {}; for (const t of SM.TUNE_DEFS) d[t.key] = t.value; return d; },
  reset(key) { const d = this.defaults(); if (key) this.v[key] = d[key]; else this.v = d; this.save(); },
  set(key, value) {
    const t = SM.TUNE_DEFS.find(x => x.key === key); if (!t) return;
    const s = Math.round((Math.min(t.max, Math.max(t.min, value)) - t.min) / t.step) * t.step + t.min;
    this.v[key] = +s.toFixed(4); this.save();
  },
  // the dev panel's cheats are layers on top of the base values: they never change what reset restores
  load() { const saved = SM.store ? SM.store.get('smashby:tune', null) : null; this.v = this.defaults(); if (saved) for (const k in saved) if (k in this.v) this.v[k] = saved[k]; },
  save() { if (SM.store) SM.store.set('smashby:tune', this.v); }
};
SM.TUNE.v = SM.TUNE.defaults();

// Cheats: toggles in the dev panel (they change play, never the saved tuning)
SM.CHEATS = { godMode: false, infiniteTurbo: false, alwaysHype: false, alwaysOnFire: false, refBlind: false, refStrict: false, noClock: false, bigHeads: false };

// The RNG: one stream for the simulation (set per match), another for cosmetic choices. Never Math.random.
SM.rng = null; SM.fx = null;
SM.seed = s => { SM.rng = My3D2dge.rng(s); SM.fx = My3D2dge.rng(s * 31 + 7); };
SM.R = () => SM.rng();                       // [0, 1)
SM.range = (a, b) => a + (b - a) * SM.R();    // [a, b)
SM.pickR = list => list[Math.floor(SM.R() * list.length)];
SM.seed(1);

// Helpers
SM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
SM.lerp = (a, b, t) => a + (b - a) * t;
SM.mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0');
SM.sevensClock = (run, half) => {   // the TV clock: each half is seven minutes of sevens time
  const len = SM.TUNE.v.halfLength; return Math.min(7, run * 7 / len);
};

// The teams. Players: [name, nickname, role, build, size, hair, hairColor, skinColor, hat, stats [SPD POW HND KCK TKL]].
// Roles: 0 PROP, 1 HOOKER, 2 PROP, 3 SCRUM-HALF, 4 FLY-HALF, 5 CENTRE, 6 WING. Forwards are 0..2; backs 3..6.
SM.TEAMS = [
  { id: 'mudlarks', name: 'MUDDINGTON MUDLARKS', short: 'MUD', home: true,
    colors: { cloth: '#4aa0e0', trim: '#5a3a1e', pants: '#3a2a1a', boot: '#1a1410', belt: '#5a3a1e' },
    away: { cloth: '#e8dcc0', trim: '#4aa0e0', pants: '#3a2a1a', boot: '#1a1410', belt: '#4aa0e0' },
    chip: '#4aa0e0', aggression: .5, cheapShots: .1, crest: 'mudlark',
    players: [
      ['Dougie', 'The Fridge', 0, 'bulky', 1.35, 'bald', '#f0d0b8', '#f0d0b8', 'cap', [4, 9, 5, 3, 8]],
      ['Kev', 'Gravy', 1, 'bulky', 1.25, 'short', '#c05a2a', '#e8c0a0', 'band', [5, 8, 6, 3, 7]],
      ['Sione', 'Tiny', 2, 'bulky', 1.42, 'short', '#1a1410', '#8a5a3a', 'none', [4, 10, 4, 2, 8]],
      ['Priya', 'Pocket Rocket', 3, 'heroic', 1.05, 'ponytail', '#1a1410', '#8a5a3a', 'none', [8, 4, 9, 6, 6]],
      ['Ffion', 'Boots', 4, 'heroic', 1.12, 'long', '#a0502a', '#f0d0b8', 'none', [6, 5, 8, 9, 5]],
      ['Marcus', 'The Bus', 5, 'heroic', 1.3, 'spiky', '#1a1410', '#6a4028', 'none', [7, 8, 6, 4, 7]],
      ['Jamie', 'Wheels', 6, 'heroic', 1.1, 'spiky', '#e8c070', '#f0d0b8', 'none', [10, 4, 7, 5, 4]]
    ] },
  { id: 'badgers', name: 'BRAMBLEWICK BADGERS', short: 'BAD', home: false,
    colors: { cloth: '#24242a', trim: '#f0f0f0', pants: '#f0f0f0', boot: '#1a1a1e', belt: '#f0f0f0' },
    away: { cloth: '#f0f0f0', trim: '#24242a', pants: '#24242a', boot: '#1a1a1e', belt: '#24242a' },
    chip: '#f0f0f0', aggression: .3, cheapShots: .05, crest: 'badger', difficulty: 'rookie',
    players: [
      ['Edna', 'Nan', 0, 'bulky', 1.25, 'short', '#b8b8c0', '#e8c0a0', 'cap', [3, 8, 6, 4, 8]],
      ['Barnaby', 'Barn Door', 0, 'bulky', 1.38, 'bald', '#f0d0b8', '#e8b090', 'none', [3, 9, 3, 2, 7]],
      ['Wilf', 'Wilf', 1, 'bulky', 1.2, 'short', '#6a3a22', '#e0b090', 'none', [4, 7, 5, 3, 6]],
      ['Pip', 'Pip', 3, 'heroic', 1.0, 'spiky', '#c05a2a', '#f0d0b8', 'none', [7, 3, 7, 5, 5]],
      ['Clementine', 'Clem', 4, 'heroic', 1.1, 'ponytail', '#e8c070', '#f0d0b8', 'none', [5, 4, 7, 8, 4]],
      ['Ollie', 'Badger', 5, 'heroic', 1.25, 'short', '#1a1410', '#8a5a3a', 'none', [6, 7, 5, 3, 6]],
      ['Tilly', 'Tilly', 6, 'heroic', 1.08, 'long', '#1a1410', '#e0b090', 'none', [8, 3, 6, 4, 4]]
    ] },
  { id: 'gulls', name: 'PORT GRUMBLE GULLS', short: 'GUL', home: false,
    colors: { cloth: '#f4f4f0', trim: '#1fa89a', pants: '#1e2a50', boot: '#1a1a1e', belt: '#1fa89a' },
    away: { cloth: '#1fa89a', trim: '#f4f4f0', pants: '#1e2a50', boot: '#1a1a1e', belt: '#f4f4f0' },
    chip: '#1fa89a', aggression: .45, cheapShots: .1, crest: 'gull', difficulty: 'pro',
    players: [
      ['Sal', 'Salty', 0, 'bulky', 1.32, 'short', '#1a1410', '#8a5a3a', 'none', [4, 8, 5, 3, 7]],
      ['Kenji', 'Kipper', 1, 'bulky', 1.2, 'spiky', '#1a1410', '#e0b090', 'none', [6, 7, 7, 3, 6]],
      ['Mo', 'Anchor', 2, 'bulky', 1.38, 'bald', '#f0d0b8', '#8a5a3a', 'none', [4, 9, 4, 2, 8]],
      ['Lulu', 'Lulu', 3, 'heroic', 1.02, 'ponytail', '#c05a2a', '#f0d0b8', 'none', [8, 4, 9, 6, 5]],
      ['Jonty', 'Silky', 4, 'heroic', 1.15, 'long', '#e8c070', '#f0d0b8', 'none', [7, 5, 9, 9, 4]],
      ['Dexter', 'Jet', 5, 'heroic', 1.25, 'short', '#1a1410', '#6a4028', 'none', [8, 7, 7, 4, 6]],
      ['Bree', 'Breeze', 6, 'heroic', 1.1, 'long', '#f0e0c0', '#f0d0b8', 'none', [10, 4, 8, 5, 4]]
    ] },
  { id: 'ironsides', name: 'FURNACE FORGE IRONSIDES', short: 'IRN', home: false,
    colors: { cloth: '#f07a1e', trim: '#3a3a44', pants: '#1a1a1e', boot: '#1a1a1e', belt: '#3a3a44' },
    away: { cloth: '#3a3a44', trim: '#f07a1e', pants: '#1a1a1e', boot: '#1a1a1e', belt: '#f07a1e' },
    chip: '#f07a1e', aggression: .85, cheapShots: .35, crest: 'anvil', difficulty: 'pro',
    players: [
      ['Grigor', 'The Kiln', 0, 'bulky', 1.4, 'bald', '#f0d0b8', '#5a3a28', 'cap', [4, 10, 3, 2, 9]],
      ['Rusty', 'Rusty', 1, 'bulky', 1.25, 'short', '#8a3a1a', '#e0b090', 'none', [5, 8, 5, 3, 8]],
      ['Bertha', 'Big Bertha', 2, 'bulky', 1.4, 'ponytail', '#1a1410', '#8a5a3a', 'none', [4, 10, 4, 2, 9]],
      ['Smudge', 'Smudge', 3, 'heroic', 1.05, 'spiky', '#1a1410', '#5a3a28', 'none', [7, 5, 7, 5, 6]],
      ['Ingot', 'Ingot', 4, 'heroic', 1.15, 'short', '#e8c070', '#f0d0b8', 'none', [6, 6, 7, 8, 6]],
      ['Adaeze', 'Anvil', 5, 'bulky', 1.32, 'short', '#1a1410', '#6a4028', 'none', [7, 9, 6, 3, 9]],
      ['Flint', 'Flint', 6, 'heroic', 1.12, 'spiky', '#8a8a90', '#f0d0b8', 'none', [9, 6, 6, 4, 6]]
    ] },
  { id: 'maulers', name: 'MEGACORP MAULERS', short: 'MEG', home: false,
    colors: { cloth: '#e8c040', trim: '#5a2a8a', pants: '#3a1a5a', boot: '#1a1410', belt: '#5a2a8a' },
    away: { cloth: '#5a2a8a', trim: '#e8c040', pants: '#3a1a5a', boot: '#1a1410', belt: '#e8c040' },
    chip: '#e8c040', aggression: .7, cheapShots: .25, crest: 'diamond', difficulty: 'legend',
    players: [
      ['BIG UNIT', 'BIG UNIT', 0, 'bulky', 1.9, 'bald', '#e8c040', '#f0d0b8', 'band', [6, 12, 6, 3, 10]],
      ['Lou', 'Leverage Lou', 1, 'bulky', 1.25, 'short', '#1a1410', '#8a5a3a', 'none', [6, 8, 7, 3, 7]],
      ['Bonus', 'Bonus', 2, 'bulky', 1.38, 'short', '#e8c070', '#f0d0b8', 'none', [5, 9, 5, 2, 8]],
      ['Synergy', 'Synergy', 3, 'heroic', 1.05, 'ponytail', '#8a4ae0', '#5a3a28', 'none', [9, 5, 9, 6, 6]],
      ['Chad', 'Chad', 4, 'heroic', 1.15, 'long', '#e8c040', '#f0d0b8', 'none', [7, 6, 9, 10, 5]],
      ['Vance', 'Vance', 5, 'heroic', 1.28, 'spiky', '#1a1410', '#e0b090', 'none', [8, 8, 7, 5, 7]],
      ['Hedge', 'Hedge', 6, 'heroic', 1.12, 'short', '#c0c0c8', '#f0d0b8', 'none', [10, 5, 8, 6, 5]]
    ] }
];

SM.VENUES = [
  { id: 'muddington', label: 'MUDDINGTON', name: 'Muddington Park', weather: 'rain', time: 'day', mud: true, sky: ['#3a4a5a', '#6a7a88', '#8a9aa0'],
    music: 'Mud and Glory', boards: ['THE MUDDY DUCK', 'PIES & PINTS', "BIG DAVE'S BUSES", 'CHANNEL THUD'], stand: 'plank', crowd: '#4aa0e0' },
  { id: 'docks', label: 'DOCKS', name: 'Port Grumble Docks', weather: 'wind', time: 'dusk', mud: false, sky: ['#2a2040', '#c06a3a', '#f0a050'],
    music: 'Grumble Shanty', boards: ['SEAGULL-PROOF CHIPS', 'KRAKEN INSURANCE', "GRUMBLE'S GRAVY"], stand: 'stone', crowd: '#1fa89a' },
  { id: 'furnace', label: 'FURNACE', name: 'The Furnace', weather: 'clear', time: 'night', mud: false, sky: ['#0a0608', '#2a1408', '#5a2a10'],
    music: 'Forge Floor', boards: ['FORGEWORKS STEEL', 'TURBO TONIC', 'MEGA MEAT PIES'], stand: 'stone', crowd: '#f07a1e' },
  { id: 'megadome', label: 'MEGADOME', name: 'The Megadome', weather: 'storm', time: 'night', mud: false, sky: ['#0a0418', '#2a1040', '#4a1a6a'],
    music: 'Megadome Mayhem', boards: ['GOLDBRICK HOLDINGS', 'CHANNEL THUD', 'TURBO TONIC'], stand: 'stone', crowd: '#e8c040' }
];

// The commentary: lines by category. {$player} is the scorer's nickname, {$team} the side, {$score} the score.
SM.LINES = {
  kickoff: ['And we\'re underway at {$venue}!', 'Big boot to get us going!'],
  try: ['HE\'S GONE OVER! TRY TIME!', 'Under the sticks! You could drive a bus through that gap!', 'Dotted down! {$player}, take a bow!', 'In at the corner! Somebody check the paint on that touchline!'],
  bigHit: ['OH, THAT\'S A BIG ONE!', 'He\'ll feel that in the morning. And the morning after.', 'Absolutely SHUDDERING!'],
  monsterHit: ['MONSTER HIT! That\'s gone into orbit!', 'Put him in Row Z!', 'Somebody get that man a postcode, he\'s lost!'],
  sidestep: ['Left him for dead!', 'Feet like a ballroom dancer!'],
  fend: ['HAND-OFF! Right in the chops!', 'He\'s fended him into next week!'],
  lineBreak: ['He\'s through! There\'s daylight!', 'The line\'s been cut like a birthday cake!'],
  knockOn: ['Knock-on. Butter fingers.', 'Dropped it like a hot pie!'],
  forward: ['Forward! The ref\'s not having that.'],
  jackal: ['JACKAL! He\'s pinched it!', 'Turnover! Stolen like a pie at a buffet!'],
  scrum: ['Crouch... bind... SET! And they\'ve hit like freight trains!'],
  lineout: ['He\'s been lifted so high he can see his house!', 'Stolen at the lineout! Cheeky!'],
  conversionGood: ['Straight between the sticks!', 'Bang! Two more!'],
  conversionMiss: ['Wide! Hooked it like a fisherman.', 'DOINK! Off the upright!'],
  dropGoal: ['DROP GOAL! Cheeky, cheeky!'],
  penalty: ['Penalty! The ref\'s arm is out!'],
  yellow: ['YELLOW CARD! Off to the sin bin, and I mean an actual bin!'],
  onFire: ['HE\'S ON FIRE!', 'Somebody call the fire brigade! Actually, don\'t, let it burn!'],
  superRun: ['THUNDER RUN! Get out of the way!'],
  powerup: ['Somebody\'s chucked a meat pie on the pitch!', 'AIR HORN! The crowd\'s gone barmy!'],
  hooter: ['There\'s the hooter! Ball has to go dead!'],
  halftime: ['Half-time here at {$venue}: {$score}.'],
  fulltime: ['FULL TIME! {$team} win it, {$score}!', 'That\'s it! Somebody get the kettle on!']
};
SM.REPLACE = (s, vars) => String(s).replace(/\{\$(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined) ? vars[k] : m);
