/* 06-data-moves: animation clips (hand targets for the pose layer, 32-anim), the dunk catalog (PLAN 10.3), taunts and
 * celebrations, power-ups (6.15, 10.4) and cheat codes (10.8). Hand targets are [forward, right, up] in the rig's own
 * frame at size 1 for a heroic build (32-anim scales them to each build); a clip is a function of its time t (seconds)
 * returning { R, L, crouch, lean, hop, turn, pose, expr }. */
const wave01 = (t, hz) => .5 + .5 * Math.sin(t * TAU * hz);
const CLIPS = {
  hold: () => ({ R: [5, 2.2, 15], L: [5, -2.2, 15], ball: 'both', crouch: .12 }),
  gather: () => ({ R: [4, 1.6, 20], L: [4, -1.6, 20], ball: 'both', crouch: .3 }),
  jumpshot: (t, x) => x.released ? { R: [7, 1.2, 40], L: [3, -3.5, 30], ball: null } : { R: [3, 1.2, 33], L: [2.4, -2.6, 31], ball: 'R' },
  layup: (t, x) => { const k = clamp(x.u || 0, 0, 1); return { R: [5 + k, 2, 16 + 26 * k], L: [3, -3, 26], ball: x.released ? null : 'R' }; },
  passChest: t => { const k = clamp(t / .14, 0, 1); return { R: [4 + 7 * k, 1.5 - .5 * k, 19], L: [4 + 7 * k, -1.5 + .5 * k, 19], ball: t < .08 ? 'both' : null }; },
  passBounce: t => { const k = clamp(t / .14, 0, 1); return { R: [4 + 6 * k, 1.5, 18 - 8 * k], L: [4 + 6 * k, -1.5, 18 - 8 * k], ball: t < .08 ? 'both' : null }; },
  passLob: t => { const k = clamp(t / .2, 0, 1); return { R: [2 + 4 * k, 1.5, 22 + 16 * k], L: [2 + 4 * k, -1.5, 22 + 16 * k], ball: t < .1 ? 'both' : null }; },
  passFlair: t => { const k = clamp(t / .12, 0, 1); return { R: [-3 * k, 5 - 9 * k, 14], L: [3, -3, 16], ball: t < .06 ? 'R' : null }; },
  catch: () => ({ R: [8, 2, 20], L: [8, -2, 20], ball: null }),
  steal: t => { const k = t < .2 ? t / .2 : 1 - (t - .2) / .2; return { R: [5 + 6 * k, 3 - 2 * k, 16 - 5 * k], L: [2, -5, 18], lean: .25 * k, crouch: .2 }; },
  shove: t => { const k = t < .06 ? 0 : t < .14 ? (t - .06) / .08 : 1 - clamp((t - .14) / .3, 0, 1); return { R: [3 + 9 * k, 3, 20], L: [3 + 9 * k, -3, 20], lean: .3 * k, expr: 'angry' }; },
  spin: () => ({ R: [3, 7, 17], L: [3, -7, 19], ball: 'R' }),
  defense: (t, x) => ({ R: [3, 8, 20 + (x.hands ? 14 : 0)], L: [3, -8, 20 + (x.hands ? 14 : 0)], crouch: .45 }),
  block: (t, x) => x.swat > 0 ? { R: [2 + 6 * (1 - x.swat), 3 - 3 * (1 - x.swat), 42 - 12 * (1 - x.swat)], L: [1, -3, 40] } : { R: [1, 3, 41], L: [1, -3, 41] },
  rebound: (t, x) => x.got ? { R: [4, 1.6, 27], L: [4, -1.6, 27], ball: 'both' } : { R: [3, 2, 41], L: [3, -2, 41] },
  tipoff: (t, x) => ({ R: [2, 2, 44], L: [1, -4, 26], crouch: x.ready ? .4 : 0 }),
  inbound: (t, x) => x.thrown ? { R: [9, 1, 24], L: [9, -1, 24] } : { R: [2, 1.6, 34], L: [2, -1.6, 34], ball: 'both' },
  call: t => ({ R: [3, 3, 40 + 3 * Math.sin(t * 14)], L: null }),
  /* celebrations and taunts */
  chestPound: t => { const k = Math.floor(t * 5) % 2; return { R: [3, k ? 1 : 4, k ? 25 : 28], L: [3, k ? -4 : -1, k ? 28 : 25], expr: 'shout' }; },
  flex: () => ({ R: [1, 7, 31], L: [1, -7, 31], expr: 'shout', crouch: .15 }),
  raiseRoof: t => { const k = wave01(t, 3); return { R: [2, 5, 34 + 8 * k], L: [2, -5, 34 + 8 * k], expr: 'smile' }; },
  pointSky: () => ({ R: [2, 3, 46], L: [2, -3, 14], expr: 'smile' }),
  airplane: t => ({ R: [0, 12, 24 + 3 * Math.sin(t * 6)], L: [0, -12, 24 - 3 * Math.sin(t * 6)], lean: .2, expr: 'smile' }),
  robotDance: t => { const k = Math.floor(t * 4) % 4; return { R: [[6, 4, 28], [2, 7, 22], [6, 4, 14], [2, 7, 30]][k], L: [[2, -7, 22], [6, -4, 28], [2, -7, 30], [6, -4, 14]][k], turn: (k % 2 ? .3 : -.3) }; },
  gorilla: t => { const k = Math.floor(t * 8) % 2; return { R: [4, 2, k ? 24 : 27], L: [4, -2, k ? 27 : 24], crouch: .35, expr: 'shout' }; },
  chestDrum: t => { const k = Math.floor(t * 9) % 2; return { R: [4, 1.5, k ? 23 : 27], L: [4, -1.5, k ? 27 : 23], crouch: .3, expr: 'shout' }; },
  shimmy: t => { const k = Math.sin(t * 18); return { R: [3, 6, 22 + 2 * k], L: [3, -6, 22 - 2 * k], turn: .25 * k, expr: 'smile' }; },
  surf: t => ({ R: [0, 10, 22 + 2 * Math.sin(t * 4)], L: [0, -10, 22 - 2 * Math.sin(t * 4)], crouch: .4, turn: PI / 2 * .6, lean: .1 * Math.sin(t * 4) }),
  goggles: () => ({ R: [4, 1.6, 31], L: [4, -1.6, 31], expr: 'smile' }),
  fingerWag: t => ({ R: [5, 2 + 1.5 * Math.sin(t * 16), 36], L: [2, -4, 14], expr: 'angry' }),
  fingerGuns: t => ({ R: [10, 3, 22 + (t % .4 < .1 ? 3 : 0)], L: [10, -3, 22 + ((t + .2) % .4 < .1 ? 3 : 0)], expr: 'smile' }),
  watch: () => ({ R: [5, -1, 22], L: [6, -2, 20], expr: 'angry' }),
  armsCrossed: () => ({ R: [4, -2, 21], L: [4, 2, 22], expr: null }),
  blowFingers: () => ({ R: [5, .5, 30], L: [2, -4, 14], expr: 'smile' }),
  pogo: t => ({ R: [2, 4, 34], L: [2, -4, 34], hop: Math.abs(Math.sin(t * 9)) * 7, expr: 'smile' }),
  processing: t => ({ R: [3, 3, 16], L: [3, -3, 16], turn: .45 * Math.sin(t * 2), expr: null }),
  glitchWave: t => ({ R: [2, 5 + (Math.floor(t * 12) % 2) * 3, 38], L: [2, -4, 14 + (Math.floor(t * 7) % 2) * 6] }),
  micDrop: t => t < .5 ? { R: [7, 2, 32], L: [2, -4, 14] } : { R: [7, 3, 22], L: [2, -4, 14], expr: 'smile' },
  pointCamera: () => ({ R: [12, 1, 26], L: [2, -5, 14], expr: 'shout', turn: .9 })
};
const TAUNT_LEN = .9, CELE_LEN = 1.3;

/* ---- the dunk catalog. keys: [u, { R, L }] over the flight's progress; slam at u .9 (or keys' slam flag); spin: turns
 * of the facing over spinU; flip: a front flip over flipU; apexAbove: the leap above the slam point; hands: 1 or 2 ---- */
const D_ = (id, o) => def('dunk', id, o);
D_('hammer', { banner: 'TWO-HAND HAMMER!', slam: 0, dist: [0, 70], hands: 2, apexAbove: 18, bonus: 0, lines: 'dunkPower',
  keys: [[0, { R: [5, 2, 18], L: [5, -2, 18] }], [.35, { R: [2, 2, 44], L: [2, -2, 44] }], [.8, { R: [0, 2, 47], L: [0, -2, 47] }], [.9, { R: [8, 2, 36], L: [8, -2, 36] }]] });
D_('tomahawk', { banner: 'TOMAHAWK!', slam: 5, dist: [30, 130], hands: 1, apexAbove: 26, bonus: 50, lines: 'dunkPower',
  keys: [[0, { R: [5, 2, 20], L: [4, -2, 22] }], [.3, { R: [-3, 2, 44], L: [3, -4, 30] }], [.7, { R: [-5, 2, 46], L: [3, -4, 32] }], [.88, { R: [9, 1, 38], L: [3, -4, 28] }]] });
D_('doublepump', { banner: 'DOUBLE PUMP!', slam: 6, dist: [30, 120], hands: 2, apexAbove: 30, bonus: 80, lines: 'dunkPower',
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.2, { R: [3, 2, 44], L: [3, -2, 44] }], [.32, { R: [5, 2, 14], L: [5, -2, 14] }], [.45, { R: [3, 2, 44], L: [3, -2, 44] }],
    [.57, { R: [5, 2, 14], L: [5, -2, 14] }], [.75, { R: [2, 2, 47], L: [2, -2, 47] }], [.9, { R: [8, 2, 36], L: [8, -2, 36] }]] });
D_('reverse', { banner: 'REVERSE ROCKET!', slam: 6, dist: [20, 100], hands: 2, apexAbove: 22, bonus: 100, lines: 'dunkSpin', spin: .5, spinU: [.2, .7], reverse: true,
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.4, { R: [1, 2, 44], L: [1, -2, 44] }], [.8, { R: [-3, 2, 48], L: [-3, -2, 48] }], [.92, { R: [-6, 2, 40], L: [-6, -2, 40] }]] });
D_('windmill', { banner: 'WINDMILL!', slam: 7, dist: [50, 150], hands: 1, apexAbove: 34, bonus: 100, lines: 'dunkSpin',
  keys: [[0, { R: [4, 2, 20], L: [3, -2, 22] }], [.3, { R: [0, 7, 14] }], [.55, { R: [-4, 4, 36] }], [.8, { R: [3, 2, 46] }], [.9, { R: [8, 1, 30] }]] });
D_('threesixty', { banner: 'THREE-SIXTY!', slam: 7, dist: [40, 140], hands: 2, apexAbove: 34, bonus: 120, lines: 'dunkSpin', spin: 1, spinU: [.2, .85],
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.3, { R: [4, 2, 26], L: [4, -2, 26] }], [.8, { R: [1, 2, 46], L: [1, -2, 46] }], [.92, { R: [8, 2, 36], L: [8, -2, 36] }]] });
D_('ftflyer', { banner: 'FREE-THROW FLYER!', slam: 8, dist: [110, 999], hands: 1, apexAbove: 46, bonus: 150, lines: 'dunkLong', split: true,
  keys: [[0, { R: [5, 2, 20], L: [4, -2, 22] }], [.3, { R: [6, 3, 40], L: [2, -8, 26] }], [.75, { R: [5, 2, 48], L: [0, -10, 24] }], [.9, { R: [9, 1, 38], L: [0, -9, 24] }]] });
D_('flip', { banner: 'FRONT-FLIP FREAK!', slam: 8, dist: [60, 150], hands: 2, apexAbove: 44, bonus: 180, lines: 'dunkFlip', flip: 1, flipU: [.22, .74],
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.3, { R: [5, 2, 24], L: [5, -2, 24] }], [.78, { R: [2, 2, 46], L: [2, -2, 46] }], [.9, { R: [8, 2, 36], L: [8, -2, 36] }]] });
D_('rattler', { banner: 'RIM RATTLER!', slam: 4, dist: [0, 60], hands: 2, apexAbove: 16, bonus: 60, lines: 'dunkHang', hang: 1.2,
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.5, { R: [3, 2, 44], L: [3, -2, 44] }], [.9, { R: [8, 2, 40], L: [8, -2, 40] }]] });
D_('nova720', { banner: 'SEVEN-TWENTY SUPERNOVA!', slam: 0, needs: 'nova', dist: [60, 190], hands: 2, apexAbove: 56, bonus: 250, lines: 'dunkNova', spin: 2, spinU: [.15, .85],
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.3, { R: [3, 4, 30], L: [3, -4, 30] }], [.8, { R: [1, 2, 48], L: [1, -2, 48] }], [.92, { R: [8, 2, 36], L: [8, -2, 36] }]] });
D_('volcano', { banner: 'VOLCANO LAUNCH!', slam: 0, needs: 'vent', dist: [0, 9999], hands: 2, apexAbove: 160, bonus: 300, lines: 'dunkVolcano', spin: 1, spinU: [.3, .8], fire: true,
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.4, { R: [2, 6, 44], L: [2, -6, 44] }], [.8, { R: [1, 2, 48], L: [1, -2, 48] }], [.92, { R: [9, 2, 34], L: [9, -2, 34] }]] });
D_('quake', { banner: 'BLAM-QUAKE!!!', slam: 0, needs: 'quake', dist: [80, 9999], hands: 2, apexAbove: 90, bonus: 400, lines: 'dunkQuake', quake: true,
  keys: [[0, { R: [5, 2, 20], L: [5, -2, 20] }], [.4, { R: [-2, 3, 46], L: [-2, -3, 46] }], [.85, { R: [-3, 3, 50], L: [-3, -3, 50] }], [.93, { R: [10, 2, 30], L: [10, -2, 30] }]] });
const DUNK_ORDER = ['hammer', 'tomahawk', 'doublepump', 'reverse', 'windmill', 'threesixty', 'ftflyer', 'flip', 'rattler', 'nova720', 'volcano', 'quake'];

/* ---- power-ups (PLAN 6.15): icons 12x12, colors, how long they last ---- */
const PU_ = (id, o) => def('powerup', id, o);
PU_('rocket', { name: 'ROCKET KICKS', color: '#ff7a2a', seconds: 15, help: 'Speed +40%, turbo refills twice as fast',
  icon: E.sprite(['......ww....', '.....wkkw...', '....wkkkw...', '...wkkkkw...', '..wkkkkkkw..', '.wkkkkkkkkw.', 'wwwwwwwwwwww', '.y.o.y.o.y..', '..o.y.o.y...', '...y...o....'], { w: '#ffffff', k: '#ff7a2a', y: '#ffd23a', o: '#ff3a1a' }) });
PU_('glue', { name: 'GLUE GLOVES', color: '#5ae04a', seconds: 15, help: 'Steals always work; nobody can strip you',
  icon: E.sprite(['..g.g.g.....', '..g.g.g.g...', '..ggggggg...', '.gggggggg...', 'ggggggggg...', '.gggggggg...', '..gggggg....', '..gwwwwg....', '..g.g..g....', '..d....d....', '.......d....'], { g: '#5ae04a', w: '#e8ffe0', d: '#3aa030' }) });
PU_('laser', { name: 'LASER SIGHT', color: '#ff3a4a', seconds: 15, shots: 2, help: '+30% shot chance and a wider PERFECT window, next 2 shots',
  icon: E.sprite(['.....rr.....', '...rrrrrr...', '..r..rr..r..', '.r...rr...r.', '.r...rr...r.', 'rrrrrwwrrrrr', 'rrrrrwwrrrrr', '.r...rr...r.', '.r...rr...r.', '..r..rr..r..', '...rrrrrr...', '.....rr.....'], { r: '#ff3a4a', w: '#ffffff' }) });
PU_('moon', { name: 'MOON SHOES', color: '#b8a0ff', seconds: 15, help: 'Dunk from the arc, jump 50% higher, dunks shatter half the time',
  icon: E.sprite(['....yy......', '...y........', '..y.........', '..y.........', '...y........', '....yy......', '..pppppp....', '.ppppppppp..', 'pwwwwwwwwwp.', '..s.s.s.s...', '..s.s.s.s...'], { y: '#fff0a0', p: '#b8a0ff', w: '#ffffff', s: '#c8c8d8' }) });
PU_('bomb', { name: 'BLAM BOMB', color: '#ffb02a', seconds: 20, uses: 1, help: 'Your next shove knocks down everyone near',
  icon: E.sprite(['........y.o.', '.......y.o..', '......kk....', '....kkkkk...', '...kkkkkkk..', '..kkwkkkkkk.', '..kwkkkkkkk.', '..kkkkkkkkk.', '..kkkkkkkkk.', '...kkkkkkk..', '....kkkkk...'], { k: '#2a2a34', w: '#8a8aa0', y: '#ffd23a', o: '#ff5a1a' }) });
PU_('gold', { name: 'GOLD BALL', color: '#ffd23a', seconds: 30, team: true, help: 'Your team\'s next basket counts double',
  icon: E.sprite(['....oooo....', '..oyyyyyyo..', '.oywwyyyyyo.', '.oywyyoyyyo.', 'oyyyyyoyyyyo', 'oooooooooooo', 'oyyyyyoyyyyo', '.oyyyyoyyyo.', '.oyyyyoyyyo.', '..oyyyyyyo..', '....oooo....'], { o: '#c88a1a', y: '#ffd23a', w: '#ffffff' }) });
const PU_ORDER = ['rocket', 'glue', 'laser', 'moon', 'bomb', 'gold'];

/* ---- cheat codes (PLAN 10.8): entered on the matchup card by any player ---- */
const CODES = [
  { id: 'bigHeads', name: 'BIG HEADS', steps: ['up', 'up', 'turbo', 'pass'] },
  { id: 'powerupsOn', name: 'POWER-UPS ON', steps: ['shoot', 'shoot', 'pass', 'turbo'] },
  { id: 'infTurbo', name: 'INFINITE TURBO', steps: ['turbo', 'turbo', 'turbo', 'up', 'up'] },
  { id: 'noTwists', name: 'NO TWISTS', steps: ['down', 'down', 'shove'] },
  { id: 'skyDunks', name: 'SKY DUNKS', steps: ['oop', 'oop', 'up', 'shoot'] },
  { id: 'moonGravity', name: 'MOON GRAVITY', steps: ['up', 'oop', 'up', 'oop'] },
  { id: 'tournament', name: 'TOURNAMENT MODE', steps: ['down', 'left', 'right', 'down'] }
];
