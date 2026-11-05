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
