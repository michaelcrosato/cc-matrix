// ===== 10_level.js — Stage 1 "Verdant Reach": a data-driven event timeline keyed by rail distance =====
// Each event: { d, route?: 'alpha'|'beta', run() }. Designers add rows here; the engine handles the rest.
const sw = (n, f, type = 'dart') => () => { for (let i = 0; i < n; i++) Enemies.spawn(type, B.swoop(f(i, n))); };
const cr = (n, f, type = 'dart') => () => { for (let i = 0; i < n; i++) Enemies.spawn(type, Object.assign(B.cross(f(i, n)), { fireT: rand(0.5, 2) })); };
const hold = (n, f, type = 'dart') => () => { for (let i = 0; i < n; i++) Enemies.spawn(type, B.hold(f(i, n))); };
let _chainId = 0;
const chain = (n, lx0, ly0, amp = 26) => () => { const g = 'chain' + (++_chainId); for (let i = 0; i < n; i++) Enemies.spawn('gnat', B.chain({ i, lx0, ly0, amp, group: g })); };
const tail = n => () => { for (let i = 0; i < n; i++) Enemies.spawn('dart', B.tail({ lx0: (i - (n - 1) / 2) * 16, ly0: 6 + i * 3 })); Game.hint('loop'); };
const haul = (drop, dir = 1) => () => Enemies.spawn('hauler', B.haul({ lx0: -110 * dir, lx1: 110 * dir, ly0: 18, drop, ahead: 230, dur: 8 }));
const ground = (type, n, ahead, spread = 30, o = {}) => () => { for (let i = 0; i < n; i++) spawnGround(type, Game.d + ahead + i * 40, (i % 2 ? 1 : -1) * rand(spread * 0.3, spread), o); };
const ring = (type, lx = 0, ly = 0, ahead = 300) => () => Items.atRail(type, Game.d + ahead, lx, ly);
const say = (who, text, dur = 3.4, prio = false) => () => Comms.say(who, text, dur, null, prio);
const spinners = (n, ahead) => () => { for (let i = 0; i < n; i++) spawnSpinner(Game.d + ahead + i * 22, rand(-38, 38), rand(-14, 16)); };

const LEVEL = [
  // ---- Act 1: the Emerald Sea ----
  { d: 20, run: say('hollis', 'Team Sparfox, the Varn Dominion has seized Verdant Reach. Punch through to their base and destroy whatever they are guarding.', 4.2) },
  { d: 140, run: say('tusk', 'You heard the Admiral. Vale, you\'ve got the lead — we\'ll cover you.') },
  { d: 200, run: () => Game.hint('move') },
  { d: 250, run: sw(4, (i) => ({ lx0: (i - 1.5) * 26, ly0: 22, lx1: (i - 1.5) * 10, ly1: 4, dur: 5, fire: 0.4 })) },
  { d: 300, run: () => Game.hint('fire') },
  { d: 420, run: cr(3, i => ({ lx0: -120 - i * 18, lx1: 120 - i * 18, ly0: 10 + i * 4, dur: 4 })) },
  { d: 520, run: say('wren', 'Try to keep up, rookie. These guys are slow.') },
  { d: 560, run: ring('silver', 0, 4) },
  { d: 650, run: sw(5, (i) => ({ lx0: (i - 2) * 18, ly0: 30 - Math.abs(i - 2) * 6, lx1: (i - 2) * 30, ly1: 0, dur: 5 })) },
  { d: 800, run: chain(6, -10, 8) },
  { d: 880, run: () => { Comms.say('tusk', 'They\'re shooting back! Double-tap a bank button to barrel roll — it deflects lasers.', 4, 'rolltip'); Game.hint('roll'); } },
  { d: 950, run: hold(3, i => ({ lx0: (i - 1) * 30, ly0: 10, hold: 120, life: 7, phase: i })) },
  { d: 1100, run: haul('laser') },
  { d: 1120, run: say('moss', 'That hauler is carrying supplies. Shoot it down!', 3) },
  { d: 1250, run: tail(3) },
  { d: 1270, run: () => Comms.say('wren', 'Bandits on your tail! Hit the somersault and get behind them!', 3.6, 'tailtip', true) },
  { d: 1450, run: cr(6, i => ({ lx0: (i % 2 ? -1 : 1) * (110 + i * 8), lx1: (i % 2 ? 1 : -1) * 110, ly0: 6 + i * 3, dur: 4.5 })) },
  { d: 1500, run: ring('gold', 0, 10) },
  // ---- Act 2: Coastal plains ----
  { d: 1560, run: say('moss', 'Ground forces dug in along the beach. Tanks at twelve o\'clock!') },
  { d: 1580, run: ground('tank', 4, 300, 28) },
  { d: 1750, run: sw(4, (i) => ({ lx0: -40 + i * 26, ly0: -6, lx1: 0, ly1: 20, dur: 4.5 })) },
  { d: 1900, run: ground('turret', 3, 280, 40) },
  { d: 2000, run: () => Wingmen.chase('wren') },
  { d: 2150, run: chain(7, 12, 14, 30) },
  { d: 2300, run: haul('bomb', -1) },
  { d: 2420, run: () => { for (const x of [-14, 0, 14]) Items.atRail('silver', Game.d + 280, x, 6); } },
  { d: 2500, run: hold(4, i => ({ lx0: (i - 1.5) * 24, ly0: 14, hold: 140, life: 6, phase: i })) },
  { d: 2520, run: ground('tank', 4, 300, 26) },
  { d: 2650, run: ring('gold', -12, 4) },
  { d: 2850, run: () => Carrier.start() },
  { d: 3200, run: ring('silver', 12, 0, 120) },
  { d: 3500, run: ring('gold', -10, 8, 120) },
  // ---- Act 3: Port Halcyon ----
  { d: 3950, run: say('hollis', 'Port Halcyon ahead. The city\'s defence grid is in Dominion hands — watch the rooftops.', 3.8) },
  { d: 4000, run: sw(5, (i) => ({ lx0: (i - 2) * 22, ly0: 30, lx1: (i - 2) * 10, ly1: 8, dur: 4 })) },
  { d: 4020, run: () => { Comms.say('moss', 'See those glowing gates? Fly through ALL of them and I can hack a hidden route open!', 4.2); Game.hint('gates'); } },
  { d: 4100, run: ground('turret', 4, 300, 30) },
  { d: 4250, run: cr(4, i => ({ lx0: 120 + i * 20, lx1: -120 + i * 20, ly0: 14, dur: 4 })) },
  { d: 4350, run: ground('tank', 3, 300, 12, { drive: 3 }) },
  { d: 4450, run: tail(2) },
  { d: 4560, run: chain(6, 0, 20, 34) },
  { d: 4700, run: () => Wingmen.chase('tusk') },
  { d: 4800, run: haul('shield') },
  { d: 4950, run: hold(3, i => ({ lx0: (i - 1) * 34, ly0: 18, hold: 120, life: 6, phase: i }), 'ace') },
  { d: 5000, run: ring('silver', 0, -4) },
  { d: 5080, run: ground('turret', 4, 300, 34) },
  { d: 5200, run: ring('gold', 8, 6, 200) },
  { d: L.BRANCH, run: () => Game.decideRoute() },
  // ---- Route Alpha: City core ----
  { d: 5350, route: 'alpha', run: say('hollis', 'Stay on course through the city core. Mind those skybridges.') },
  { d: 5450, route: 'alpha', run: sw(6, (i) => ({ lx0: (i - 2.5) * 16, ly0: 34, lx1: (i - 2.5) * 22, ly1: 0, dur: 4.5 })) },
  { d: 5600, route: 'alpha', run: ground('tank', 4, 300, 14) },
  { d: 5750, route: 'alpha', run: chain(8, -8, 4, 30) },
  { d: 5900, route: 'alpha', run: hold(3, i => ({ lx0: (i - 1) * 30, ly0: 12, hold: 110, life: 7, phase: i }), 'ace') },
  { d: 6050, route: 'alpha', run: () => { ring('silver', 0, 2)(); haul('laser')(); } },
  { d: 6200, route: 'alpha', run: tail(3) },
  { d: 6400, route: 'alpha', run: cr(6, i => ({ lx0: (i % 2 ? -1 : 1) * 120, lx1: (i % 2 ? 1 : -1) * 120, ly0: 0 + i * 5, dur: 4 })) },
  { d: 6550, route: 'alpha', run: () => Wingmen.chase('moss') },
  { d: 6700, route: 'alpha', run: () => { ring('gold', 0, -6)(); ground('turret', 4, 300, 34)(); } },
  { d: 6850, route: 'alpha', run: chain(8, 10, 16, 28) },
  { d: 7000, route: 'alpha', run: sw(6, (i) => ({ lx0: (i - 2.5) * 20, ly0: -4, lx1: (i - 2.5) * 8, ly1: 24, dur: 4 })) },
  { d: 7200, route: 'alpha', run: hold(4, i => ({ lx0: (i - 1.5) * 26, ly0: 16, hold: 130, life: 7, phase: i }), 'ace') },
  { d: 7400, route: 'alpha', run: haul('bomb', -1) },
  { d: 7550, route: 'alpha', run: cr(6, i => ({ lx0: 120 + i * 12, lx1: -120, ly0: 8 + (i % 3) * 8, dur: 4 })) },
  { d: 7700, route: 'alpha', run: () => { ring('silver', -10, 0)(); ring('silver', 10, 0, 330)(); } },
  { d: 7850, route: 'alpha', run: ground('tank', 4, 300, 14) },
  { d: 8000, route: 'alpha', run: ring('gold', 0, 4) },
  // ---- Route Beta: the hidden Rustvein Canyon ----
  { d: 5350, route: 'beta', run: () => { Comms.say('moss', 'Gate sequence complete — hidden route open! Into the canyon, stay low!', 3.6, null, true); Audio_.playSong('canyon'); } },
  { d: 5420, route: 'beta', run: say('wren', 'Now THIS is flying!', 2.4) },
  { d: 5500, route: 'beta', run: sw(5, (i) => ({ lx0: (i - 2) * 20, ly0: 26, lx1: (i - 2) * 6, ly1: 0, dur: 4 })) },
  { d: 5700, route: 'beta', run: haul('laser') },
  { d: 5900, route: 'beta', run: () => { spinners(10, 200)(); Comms.say('tusk', 'Floating mines — don\'t get close, shoot \'em early.', 3.2); } },
  { d: 6000, route: 'beta', run: chain(8, 0, 6, 26) },
  { d: 6150, route: 'beta', run: tail(3) },
  { d: 6300, route: 'beta', run: ring('gold', 0, -8, 200) },
  { d: 6400, route: 'beta', run: hold(3, i => ({ lx0: (i - 1) * 26, ly0: 10, hold: 110, life: 7, phase: i }), 'ace') },
  { d: 6550, route: 'beta', run: () => Wingmen.chase('moss') },
  { d: 6650, route: 'beta', run: ground('tank', 5, 280, 24) },
  { d: 6800, route: 'beta', run: spinners(10, 200) },
  { d: 6900, route: 'beta', run: ring('gold', 6, 4) },
  { d: 7000, route: 'beta', run: chain(9, 0, 14, 30) },
  { d: 7150, route: 'beta', run: cr(6, i => ({ lx0: (i % 2 ? -1 : 1) * 90, lx1: (i % 2 ? 1 : -1) * 90, ly0: 4 + i * 4, dur: 3.5 })) },
  { d: 7300, route: 'beta', run: haul('life', -1) },
  { d: 7450, route: 'beta', run: hold(4, i => ({ lx0: (i - 1.5) * 22, ly0: 12, hold: 120, life: 7, phase: i }), 'ace') },
  { d: 7600, route: 'beta', run: () => { ring('gold', 0, 0)(); ring('silver', 0, 10, 340)(); } },
  { d: 7800, route: 'beta', run: sw(6, (i) => ({ lx0: (i - 2.5) * 16, ly0: 28, lx1: (i - 2.5) * 20, ly1: 2, dur: 4 })) },
  { d: 8000, route: 'beta', run: ring('silver', 0, 6) },
  // ---- Final approach ----
  { d: 8250, run: say('hollis', 'Enemy base dead ahead. Something enormous is powering up beneath it...', 3.6) },
  { d: 8350, run: () => Audio_.playSong('stage') },
  { d: 8400, run: sw(5, (i) => ({ lx0: (i - 2) * 24, ly0: 20, lx1: (i - 2) * 10, ly1: 6, dur: 4 })) },
  { d: 8580, run: () => { Audio_.play('alarm'); Comms.say('moss', 'Massive energy spike! It\'s rising out of the ground!', 3, null, true); } },
  { d: L.ALLRANGE, run: () => Game.enterAllRange() },
];
LEVEL.sort((a, b) => a.d - b.d);

const HINTS = {
  move: () => `${G('move')} Fly &nbsp; ${G('boost')} Boost &nbsp; ${G('brake')} Brake`,
  fire: () => `${G('fire')} Fire &nbsp;·&nbsp; Hold ${G('fire')} to charge a homing lock-on shot`,
  roll: () => `Double-tap ${G('bankL')} or ${G('bankR')} to barrel roll &nbsp;·&nbsp; Hold to bank`,
  loop: () => `${G('loop')} Somersault to get behind pursuers`,
  bomb: () => `${G('bomb')} Smart Bomb &nbsp;·&nbsp; press again to detonate early`,
  gates: () => `Fly through all 5 gates to open the hidden route`,
  rescue: () => `Shoot the fighter chasing your wingman!`,
  allrange: () => `ALL-RANGE MODE &nbsp; ${G('move')} Steer freely &nbsp; ${G('loop')} U-turn`,
};
