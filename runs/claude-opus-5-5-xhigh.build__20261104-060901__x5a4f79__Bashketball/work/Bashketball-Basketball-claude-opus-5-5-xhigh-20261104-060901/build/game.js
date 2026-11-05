/* BASHKETBALL — an original over-the-top arcade basketball game on my-3D2dge. Built from src/ by tools/build.mjs. */
(() => {
'use strict';

/* ==== 00-core.js ==== */
/* 00-core: the engine alias, constants, the game, its keys and settings, the shared state S, the event bus, randomness
 * and the content registries. Everything else in the game hangs off these. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const VERSION = '1.0.0';
const HUB = !!(typeof AIHub !== 'undefined' && AIHub.active);
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* ---- the broadcast camera: side-on, the court's length left to right, pitch 30 ---- */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);
E.VIEWS.broadcast = BROADCAST;

/* ---- court geometry (world units; z up). Court-local (cx, cy): x 0..640 baseline to baseline, y 0..288 far to near
 * sideline. World = court-local + (OX, OY) ---- */
const T16 = 16, OX = 64, OY = 64, CW = 640, CH = 288, CMX = OX + CW / 2, CMY = OY + CH / 2;
const RIM_Z = 80, RIM_R = 9, RIM_TUBE = 1.2, BALL_R = 4.5, THREE_R = 136, CORNER_Y = 20, CORNER_X = 108;
const RIMS = [{ x: OX + 52, y: CMY, z: RIM_Z, side: -1 }, { x: OX + 588, y: CMY, z: RIM_Z, side: 1 }];
const BOARD_X = [OX + 40, OX + 600], BOARD_Y = [OY + 120, OY + 168], BOARD_Z = [72, 100];
const WALL = { x0: OX - 24, x1: OX + CW + 24, y0: OY - 24, y1: OY + CH + 24 };
const MAP_W = 48, MAP_H = 25;
/** the hoop a team attacks: HOME (0) attacks the right hoop, AWAY (1) the left */
const attackRim = team => RIMS[team === 0 ? 1 : 0];
const defendRim = team => RIMS[team === 0 ? 0 : 1];
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
/** is a court point beyond the three-point line of the rim it attacks? */
function isThree(x, y, rim) {
  const lx = x - OX, ly = y - OY, nearX = rim.side < 0 ? lx : CW - lx;
  if (nearX <= CORNER_X) return ly < CORNER_Y || ly > CH - CORNER_Y;
  return dist2(x, y, rim.x, rim.y) > THREE_R;
}

/* ---- keys: the stick runs; six buttons (PLAN 6.2) ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'],
  shove: ['KeyQ', 'KeyL', 'Pad1'], oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'],
  tabL: ['KeyQ', 'PageUp', 'Pad4'], tabR: ['KeyE', 'Tab', 'PageDown', 'Pad5'], more: ['KeyT']   // (menus only: L1 / R1, Q / E switch tabs; T asks the hub's card for more time)
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
const ACTIONS = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
const CONTROL_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt', tabL: false, tabR: false, more: false };

/* ---- the game's own settings (group Game), beside the engine's standard ones ---- */
const DIFF_NAMES = ['ROOKIE', 'PRO', 'ALL-STAR', 'BLAM'];
const GAME_SETTINGS = [
  { key: 'glyphs', label: 'Button symbols', type: 'select', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', group: 'Game', apply: (g, v) => applyGlyphs(v, g) },
  { key: 'difficulty', label: 'CPU difficulty', type: 'select', options: [[0, 'Rookie'], [1, 'Pro'], [2, 'All-Star'], [3, 'BLAM']], value: 1, group: 'Game' },
  { key: 'quarterLen', label: 'Quarter length', type: 'select', options: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']], value: 120, group: 'Game' },
  { key: 'powerups', label: 'Power-ups', type: 'toggle', value: true, group: 'Game' },
  { key: 'twists', label: 'Court twists', type: 'toggle', value: true, group: 'Game' },
  { key: 'jackpotAll', label: 'Jackpot Spot on every court', type: 'toggle', value: false, group: 'Game' },
  { key: 'comeback', label: 'Comeback assist', type: 'select', options: [[0, 'Off'], [.2, 'Low'], [.35, 'Normal']], value: .35, group: 'Game' },
  { key: 'commentary', label: 'Commentary', type: 'select', options: [['full', 'Full'], ['big', 'Big plays'], ['off', 'Off']], value: 'full', group: 'Game' },
  { key: 'voiceVol', label: 'Voice volume', type: 'slider', min: 0, max: 1, step: .1, value: .8, group: 'Game' },
  { key: 'camera', label: 'Camera', type: 'select', options: [['broadcast', 'Broadcast'], ['high', 'High']], value: 'broadcast', group: 'Game', apply: g => applyCamera(g) },
  { key: 'shotMeter', label: 'Shot meter', type: 'toggle', value: true, group: 'Game' }
];

/* ---- the game ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', 'threequarter'], bg: '#05040a', id: 'bashketball',
  input: KEYS, autoPause: !HUB, pace: true,
  menu: HUB ? false : { items: () => pauseItems(), settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const A = game.audio, P = game.particles, L = game.lights;

/* ---- the shared state ---- */
const S = {
  scene: 'boot', mode: 'exhibition', court: null, teams: [], players: [], ball: null, match: null, twist: null, powerups: [],
  cheats: {}, rng: E.rng(1), fx: E.rng(2), events: [], eventId: 0, progress: null, menu: {}, dev: { open: false, overlays: {} },
  net: { role: 'local', seat: -1, rtt: 0 }, attract: null, lastShot: null, touchOnly: false
};

/* ---- the event bus: systems talk through it; the last 64 events are kept for debug, the net and the attract director ---- */
const BUS = {};
function on(type, fn) { (BUS[type] || (BUS[type] = [])).push(fn); return () => { const l = BUS[type]; l.splice(l.indexOf(fn), 1); }; }
function emit(type, data = {}) {
  data.type = type; data.eid = ++S.eventId; data.t = S.match ? S.match.gameT : 0;
  S.events.push(data); if (S.events.length > 64) S.events.shift();
  for (const fn of (BUS[type] || []).slice()) try { fn(data); } catch (e) { game.fail('event ' + type, e); }
  for (const fn of (BUS['*'] || []).slice()) try { fn(data); } catch (e) { game.fail('event *', e); }
  return data;
}

/* ---- registries: content is data; systems read it ---- */
const REG = {};
function def(kind, id, obj) { (REG[kind] || (REG[kind] = {}))[id] = Object.assign(obj, { id }); return obj; }
function get(kind, id) { return (REG[kind] || {})[id]; }
function all(kind) { return Object.values(REG[kind] || {}); }

/* ---- small helpers ---- */
const rnd = (a = 0, b = 1) => a + S.rng() * (b - a);
const fxr = (a = 0, b = 1) => a + S.fx() * (b - a);
const pickR = list => list[Math.floor(S.rng() * list.length) % list.length];
const pickF = list => list[Math.floor(S.fx() * list.length) % list.length];
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += S.rng(); return (u - 2) / .577; };
const mmss = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };
const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
const store = { get: (k, d) => E.store.get(k, d), set: (k, v) => E.store.set(k, v) };
function applyGlyphs(v, g = game) { for (const p of g.players || []) p.glyphs = v || 'playstation'; }
function applyCamera(g = game) {
  const want = g.settings && g.settings.camera === 'high' ? 'threequarter' : 'broadcast';
  if (g.scene && g.scene.matchScene && g.baseView && g.baseView.id !== want) g.setView(want);
}


/* ==== 01-tuning.js ==== */
/* 01-tuning: the single home of the important numbers. Every one is a live dev slider (PLAN Appendix A); systems read
 * tune(key) every time, so a change shows at once. resetTuning() restores the defaults. */
const TUNING = {};
const TUNE_GROUPS = ['Movement', 'Shooting', 'Dunks & Blocks', 'Defense', 'Supernova', 'CPU', 'Match', 'Physics', 'Courts'];
[
  ['Movement', 'runSpeed', 'Run speed', 108, 60, 160, 1, 'Units a second before ZOOM'],
  ['Movement', 'accel', 'Acceleration', 900, 300, 2000, 10, 'How fast a player reaches full speed'],
  ['Movement', 'turboMult', 'Turbo speed', 1.5, 1, 2.2, .05, 'Speed times this while turbo is held'],
  ['Movement', 'turboDrain', 'Turbo drain', .3, .05, .8, .01, 'Turbo used a second, held and moving'],
  ['Movement', 'turboRefill', 'Turbo refill', .2, .05, .8, .01, 'Turbo back a second, not held'],
  ['Movement', 'turboRefillDelay', 'Refill delay', .35, 0, 1.5, .05, 'Seconds before turbo refills'],
  ['Movement', 'playerGravity', 'Player gravity', 900, 500, 1500, 10, 'How fast jumps come down'],
  ['Movement', 'jumpShotVz', 'Jump speed', 250, 150, 400, 5, 'Takeoff speed before SWAT'],
  ['Shooting', 'shotSkill', 'Shot skill', 1, .4, 1.6, .02, 'Times every make chance'],
  ['Shooting', 'threeSkill', 'Three skill', 1, .4, 1.6, .02, 'Times three-point chances'],
  ['Shooting', 'perfectWindow', 'Perfect window', .1, .03, .3, .01, 'Seconds, centred on the top of the jump'],
  ['Shooting', 'perfectBonus', 'Perfect bonus', .15, 0, .4, .01, 'Extra chance for a PERFECT release'],
  ['Shooting', 'badReleasePenalty', 'Bad release', .3, 0, .6, .01, 'Chance lost early or late'],
  ['Shooting', 'contestPenalty', 'Contest penalty', .4, 0, .8, .01, 'Chance lost to a hand in the face'],
  ['Shooting', 'shotArc', 'Shot arc', 1, .6, 1.6, .05, 'Times the height of a jumper'],
  ['Dunks & Blocks', 'dunkRange', 'Dunk range', 150, 60, 300, 5, 'From the rim, before SLAM'],
  ['Dunks & Blocks', 'dunkGravity', 'Dunk gravity', 520, 300, 900, 10, 'Lower floats longer'],
  ['Dunks & Blocks', 'dunkApex', 'Dunk height', 1, .5, 2, .05, 'Times the leap above the slam'],
  ['Dunks & Blocks', 'dunkHang', 'Dunk hang time', 1, .5, 2, .05, 'Times the flight time'],
  ['Dunks & Blocks', 'dunkSlowMo', 'Dunk slow motion', .45, .1, 1, .05, 'Time scale at the apex (1 = off)'],
  ['Dunks & Blocks', 'blockReach', 'Block reach', 14, 6, 30, 1, 'Before SWAT'],
  ['Dunks & Blocks', 'blockChance', 'Block chance', 1, 0, 2, .05, 'Times every block chance'],
  ['Dunks & Blocks', 'shatterChance', 'Shatter chance', 1, 0, 5, .1, 'Times every shatter chance'],
  ['Defense', 'stealChance', 'Steal chance', .3, 0, .9, .01, 'Base chance per swipe'],
  ['Defense', 'stealReach', 'Steal reach', 18, 8, 36, 1, 'Units'],
  ['Defense', 'stealCooldown', 'Steal cooldown', .6, .1, 2, .05, 'Seconds between swipes'],
  ['Defense', 'shoveForce', 'Shove force', 220, 60, 500, 5, 'How far a shove sends them'],
  ['Defense', 'shoveCost', 'Shove cost', .25, 0, .8, .01, 'Turbo a shove uses'],
  ['Defense', 'shoveCooldown', 'Shove cooldown', 1, .2, 3, .05, 'Seconds between shoves'],
  ['Defense', 'shoveFumble', 'Shove fumble', .6, 0, 1, .01, 'Chance a shoved handler drops it'],
  ['Defense', 'knockdownTime', 'Knockdown time', .8, .2, 2, .05, 'Seconds on the floor'],
  ['Defense', 'spinCost', 'Spin cost', .2, 0, .6, .01, 'Turbo a spin move uses'],
  ['Defense', 'spinCooldown', 'Spin cooldown', 1.5, .3, 4, .05, 'Seconds between spins'],
  ['Supernova', 'novaBaskets', 'Baskets to ignite', 3, 2, 6, 1, 'In a row, unanswered'],
  ['Supernova', 'novaMaxBaskets', 'Nova baskets', 4, 1, 10, 1, 'More baskets before it ends'],
  ['Supernova', 'novaTime', 'Nova time', 40, 10, 120, 1, 'Seconds of game clock'],
  ['Supernova', 'novaShotBonus', 'Nova shot bonus', .25, 0, .6, .01, 'Added to every shot'],
  ['CPU', 'cpuSkill', 'CPU skill', 0, -.5, .5, .05, 'Offset on decision quality'],
  ['CPU', 'cpuReaction', 'CPU reaction', 1, .25, 3, .05, 'Times reaction delays'],
  ['CPU', 'cpuAggression', 'CPU aggression', 1, 0, 2, .05, 'Times steal and shove rates'],
  ['CPU', 'comeback', 'Comeback assist', .35, 0, 1, .05, 'Help for the team behind'],
  ['Match', 'quarterLength', 'Quarter length', 120, 20, 300, 5, 'Seconds (this match)'],
  ['Match', 'shotClock', 'Shot clock', 20, 8, 30, 1, 'Seconds'],
  ['Match', 'gameSpeed', 'Game speed', 1, .5, 1.5, .05, 'Time scale outside effects'],
  ['Match', 'fatigue', 'Fatigue', 1, 0, 3, .1, 'Times juice loss'],
  ['Physics', 'ballGravity', 'Ball gravity', 760, 400, 1200, 10, ''],
  ['Physics', 'ballBounce', 'Floor bounce', .62, .3, .9, .01, ''],
  ['Physics', 'rimBounce', 'Rim bounce', .45, .2, .8, .01, ''],
  ['Physics', 'boardBounce', 'Board bounce', .55, .2, .9, .01, ''],
  ['Courts', 'powerupInterval', 'Power-up every', 22, 6, 60, 1, 'Seconds'],
  ['Courts', 'hazardInterval', 'Twist timers', 1, .25, 4, .05, 'Times every twist timer'],
  ['Courts', 'windStrength', 'Wind strength', 140, 0, 300, 5, 'At full gust'],
  ['Courts', 'jackpotBonus', 'Jackpot bonus', 2, 0, 5, 1, 'Points']
].forEach(([group, key, label, d, min, max, step, help]) => { TUNING[key] = { key, group, label, v: d, def: d, min, max, step, help }; });
function tune(key) { const t = TUNING[key]; return t ? t.v : 0; }
function setTune(key, v) { const t = TUNING[key]; if (!t) return; t.v = clamp(Math.round(v / t.step) * t.step, t.min, t.max); t.v = +t.v.toFixed(4); }
function resetTuning(key) { for (const t of Object.values(TUNING)) if (!key || t.key === key) t.v = t.def; }
function loadTuning() { const saved = store.get('bb:tuning', null); if (saved) for (const k in saved) if (TUNING[k]) { TUNING[k].def = saved[k]; TUNING[k].v = saved[k]; } }
function saveTuningDefaults() { const o = {}; for (const t of Object.values(TUNING)) { o[t.key] = t.v; t.def = t.v; } store.set('bb:tuning', o); }
function tuningJSON() { const o = {}; for (const t of Object.values(TUNING)) o[t.key] = t.v; return JSON.stringify(o); }
const FACTORY = {}; for (const t of Object.values(TUNING)) FACTORY[t.key] = t.def;


/* ==== 02-data-teams.js ==== */
/* 02-data-teams: the six teams, their eighteen players (ratings, looks, voices, taunts, celebrations, barks) and the
 * story's cast. Ratings in the order ZOOM SPLASH DEEP SLAM DIME SWIPE SWAT BUMP, each 1..10. */
const RATING_KEYS = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const RATING_NAMES = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
const RATING_HELP = { zoom: 'Speed', splash: 'Jumpers & layups', deep: 'Three-pointers', slam: 'Dunking', dime: 'Passing & handles', swipe: 'Steals', swat: 'Blocks & boards', bump: 'Power' };

/* team logos: small string sprites, also painted big into the courts' floors */
const mkLogo = (rows, colors) => ({ rows, colors, spr: E.sprite(rows, colors), big: E.sprite(rows, colors, 2) });
const LOGOS = {
  sneaker: mkLogo(['.....ww.....', '....wwww....', '...wwwwww...', '..wwwww.....', '.....kkkk...', '....kmmmmk..', '...kmmmmmmk.', '..kmmmmmmmmk', '.kccccccccck', '.kkkkkkkkkk.'], { w: '#2de2ff', k: '#1a1420', m: '#ff3ca6', c: '#ffffff' }),
  wave: mkLogo(['......cccc..', '....cccwwcc.', '...ccw...wc.', '..cc......c.', '.cc....cc...', '.cc...cccc..', 'ccc..ccc....', 'ccccccc.....', 'oooooooooooo', '.oooooooooo.'], { c: '#18c8b8', w: '#f4fff8', o: '#ff7a5c' }),
  wrench: mkLogo(['yy........yy', 'y.y......y.y', '.yyy....yyy.', '...yy..yy...', '....yyyy....', '.....oo.....', '....oooo....', '...oo..oo...', '.ooo....ooo.', 'o.o......o.o', 'oo........oo'], { y: '#ffd23a', o: '#d8641e' }),
  volcano: mkLogo(['....oooo....', '...oykyo....', '...okyyk....', '....oooo....', '....rr.r....', '...rrrrrr...', '...b.rr.b...', '..bbbrrbbb..', '.bbbbbbbbbb.', 'bbbbbbbbbbbb'], { o: '#ff8a2a', y: '#ffd040', k: '#3a1a10', r: '#ff3a1a', b: '#4a2a2e' }),
  fist: mkLogo(['..gggggggg..', '.gwgwgwgwgg.', '.gggggggggg.', '.gggggggggg.', '..gggggggg..', '...gggggg...', '...rrrrrr...', '...gggggg...', '...gggggg...', '....gggg....'], { g: '#c8d0dc', w: '#ffffff', r: '#e8c040' }),
  mic: mkLogo(['....gggg....', '...gwwwwg...', '...gwkwkg...', '...gwwwwg...', '....gggg....', '.....pp.....', '..pppppppp..', '..pyyyyyyp..', '..pppppppp..'], { g: '#ffc83a', w: '#f4f0ea', k: '#4a2a8a', p: '#4a2a8a', y: '#ffc83a' }),
  globo: mkLogo(['...yyyyyy...', '..yrrrrrry..', '.yrryyyyrry.', 'yrry....yrry', 'yry..yy..yry', 'yry.yyyy.yry', 'yry..yy..yry', 'yrry....yrry', '.yrryyyyrry.', '..yrrrrrry..', '...yyyyyy...'], { y: '#ffd23a', r: '#d02a2a' })
};

/* ---- the teams (PLAN 10.2) ---- */
def('team', 'hightops', { name: 'NEON HEIGHTS HIGHTOPS', short: 'HIGHTOPS', city: 'NEON HEIGHTS', colors: { jersey: '#ff3ca6', trim: '#2de2ff', shorts: '#1a1420', sneaker: '#f4f4f4', sock: '#2de2ff' }, logo: 'sneaker', court: 'skybox', locked: false, players: ['volt', 'bigrumble', 'pixel'], style: 'FLASHY, FAST, HIGH-FLYING', bio: 'Rooftop royalty. They dunk on satellites for practice.' });
def('team', 'breakers', { name: 'BOARDWALK BREAKERS', short: 'BREAKERS', city: 'THE BOARDWALK', colors: { jersey: '#18c8b8', trim: '#ff7a5c', shorts: '#f2d8a0', sneaker: '#ffffff', sock: '#ff7a5c' }, logo: 'wave', court: 'pier', locked: false, players: ['riptide', 'shellshock', 'longboard'], style: 'PASSING AND THREES', bio: 'Laid back until the ball goes up. Then it rains.' });
def('team', 'crushers', { name: 'SCRAPYARD CRUSHERS', short: 'CRUSHERS', city: 'THE SCRAPYARD', colors: { jersey: '#d8641e', trim: '#ffd23a', shorts: '#1c1a18', sneaker: '#3a3430', sock: '#ffd23a' }, logo: 'wrench', court: 'scrapyard', locked: false, players: ['torque', 'sparkplug', 'hubcap'], style: 'POWER AND STEALS', bio: 'They crush cars for breakfast and defenders for lunch.' });
def('team', 'magma', { name: 'KABOOM MAGMA', short: 'MAGMA', city: 'KABOOM ISLAND', colors: { jersey: '#ff3a1a', trim: '#ffb020', shorts: '#22181e', sneaker: '#22181e', sock: '#ffb020' }, logo: 'volcano', court: 'caldera', locked: false, players: ['obsidian', 'ember', 'pumice'], style: 'DEFENSE AND CLUTCH SHOTS', bio: 'They play on a volcano. Your pressure is not scary.' });
def('team', 'blambots', { name: 'THE BLAMBOTS', short: 'BLAMBOTS', city: 'GLOBO-BLAM LABS', colors: { jersey: '#5a6478', trim: '#e8c040', shorts: '#2a3040', sneaker: '#2a3040', sock: '#e8c040' }, logo: 'fist', court: 'dome', locked: true, boss: true, players: ['dunkatron', 'swatbot', 'spareparts'], style: 'EVERYTHING, LOUDLY', bio: 'No salaries. No sweat. No mercy. Some assembly required.' });
def('team', 'allstars', { name: 'CHANNEL BLAM ALL-STARS', short: 'ALL-STARS', city: 'CHANNEL BLAM', colors: { jersey: '#f4f0ea', trim: '#ffc83a', shorts: '#4a2a8a', sneaker: '#ffc83a', sock: '#4a2a8a' }, logo: 'mic', court: 'dome', locked: true, secret: true, players: ['vinnie', 'deedee', 'blammo'], style: 'SHOWBIZ', bio: 'The broadcast booth, suited up. Somebody has to call it.' });
def('team', 'camp', { name: 'BLAM CAMP INTERNS', short: 'INTERNS', city: 'CHANNEL BLAM', colors: { jersey: '#9a9aa2', trim: '#5a5a62', shorts: '#5a5a62', sneaker: '#e8e8e8', sock: '#c8c8d0' }, logo: 'mic', court: 'skybox', locked: true, hidden: true, players: ['intern2', 'intern3', 'intern1'], style: 'PRACTICE', bio: 'Unpaid. Unbothered. Unblocked.' });
const STREET_TEAMS = ['hightops', 'breakers', 'crushers', 'magma'];

/* ---- the players. rig: build, size, hair, hat, skin, hair color; voice: the gibberish profile (12-audio-voice) ---- */
const P_ = (id, o) => def('player', id, o);
P_('volt', { name: 'VOLT', team: 'hightops', number: 7, role: 'HIGH-FLYER', r: [9, 5, 4, 9, 6, 6, 4, 3], rig: { build: 'heroic', size: 1.65, hair: 'ponytail', hat: { style: 'band', color: '#ff3ca6' }, skin: '#8a5a3c', hairColor: '#3ab0ff' }, voice: 'volt', taunt: 'raiseRoof', cele: ['raiseRoof', 'airplane', 'pointSky'], barks: ['Too slow!', 'Catch me!', 'Lights out!', 'Zap!'] });
P_('bigrumble', { name: 'BIG RUMBLE', team: 'hightops', number: 33, role: 'ENFORCER', r: [3, 3, 1, 7, 4, 4, 9, 10], rig: { build: 'bulky', size: 1.9, hair: 'flattop', skin: '#4a2c1e', hairColor: '#15100e', glove: '#2de2ff' }, voice: 'bigrumble', taunt: 'flex', cele: ['flex', 'chestPound', 'gorilla'], barks: ['Move.', 'Nope.', 'My paint.', 'Sit down.'] });
P_('pixel', { name: 'PIXEL', team: 'hightops', number: 3, role: 'SHARPSHOOTER', r: [6, 9, 9, 3, 7, 5, 3, 3], rig: { build: 'heroic', size: 1.55, hair: 'spiky', skin: '#f0c8a0', hairColor: '#4ae05a', shades: true }, voice: 'pixel', taunt: 'fingerGuns', cele: ['fingerGuns', 'pointSky', 'raiseRoof'], barks: ['Cash!', 'Pew pew!', 'Too easy!', 'Clutch!'] });
P_('riptide', { name: 'RIPTIDE', team: 'breakers', number: 1, role: 'POINT GUARD', r: [10, 6, 6, 5, 10, 7, 2, 3], rig: { build: 'heroic', size: 1.6, hair: 'long', skin: '#d8a070', hairColor: '#f2d890' }, voice: 'riptide', taunt: 'surf', cele: ['surf', 'airplane', 'pointSky'], barks: ['Cowabunga!', 'Wipeout!', 'Gnarly!', 'Ride it!'] });
P_('shellshock', { name: 'SHELLSHOCK', team: 'breakers', number: 30, role: 'THREE-POINT BOMBER', r: [6, 8, 10, 3, 6, 5, 3, 4], rig: { build: 'heroic', size: 1.65, hair: 'afro', skin: '#6a4028', hairColor: '#ff7a5c' }, voice: 'shellshock', taunt: 'goggles', cele: ['goggles', 'raiseRoof', 'pointSky'], barks: ['Splash!', 'From deep!', 'Bring a towel!', 'Bang!'] });
P_('longboard', { name: 'LONGBOARD', team: 'breakers', number: 55, role: 'SHOT BLOCKER', r: [4, 5, 2, 7, 4, 3, 9, 7], rig: { build: 'heroic', size: 1.85, legs: 1.12, hair: 'bald', hat: { style: 'band', color: '#18c8b8' }, skin: '#c89070', hairColor: '#c89070' }, voice: 'longboard', taunt: 'fingerWag', cele: ['fingerWag', 'flex', 'pointSky'], barks: ['Not today.', 'Denied.', 'Nope, dude.', 'Get that out.'] });
P_('torque', { name: 'TORQUE', team: 'crushers', number: 8, role: 'POWER DUNKER', r: [6, 4, 2, 10, 4, 4, 6, 9], rig: { build: 'bulky', size: 1.85, hair: 'mohawk', skin: '#c8a080', hairColor: '#141010' }, voice: 'torque', taunt: 'chestPound', cele: ['chestPound', 'flex', 'gorilla'], barks: ['CRUSHED!', 'Scrap metal!', 'Get flat!', 'Rrraagh!'] });
P_('sparkplug', { name: 'SPARKPLUG', team: 'crushers', number: 0, role: 'PICKPOCKET', r: [9, 6, 6, 4, 7, 10, 2, 2], rig: { build: 'chibi', size: 1.65, hair: 'short', hat: { style: 'cap', color: '#ffd23a' }, skin: '#3a2418', hairColor: '#120c0a' }, voice: 'sparkplug', taunt: 'shimmy', cele: ['shimmy', 'raiseRoof', 'airplane'], barks: ['Mine now!', 'Yoink!', 'Too slow!', 'Hehehe!'] });
P_('hubcap', { name: 'HUBCAP', team: 'crushers', number: 44, role: 'VETERAN', r: [5, 7, 6, 6, 6, 6, 6, 6], rig: { build: 'heroic', size: 1.7, hair: 'short', skin: '#e0b090', hairColor: '#a8a8a8' }, voice: 'hubcap', taunt: 'watch', cele: ['watch', 'pointSky', 'chestPound'], barks: ['Old school!', 'Kids these days.', 'Still got it.', 'Fundamentals!'] });
P_('obsidian', { name: 'OBSIDIAN', team: 'magma', number: 50, role: 'RIM PROTECTOR', r: [4, 4, 1, 8, 3, 4, 10, 8], rig: { build: 'bulky', size: 1.95, hair: 'bald', skin: '#3a2216', hairColor: '#3a2216' }, voice: 'obsidian', taunt: 'armsCrossed', cele: ['armsCrossed', 'flex', 'chestPound'], barks: ['Stone.', 'Denied.', 'The mountain says no.', 'Hmm.'] });
P_('ember', { name: 'EMBER', team: 'magma', number: 11, role: 'CLUTCH SHOOTER', r: [7, 9, 8, 5, 6, 6, 3, 3], rig: { build: 'heroic', size: 1.6, hair: 'long', skin: '#f0c090', hairColor: '#e0401a' }, voice: 'ember', taunt: 'blowFingers', cele: ['blowFingers', 'pointSky', 'raiseRoof'], barks: ['Too hot!', 'Burn!', 'Ice cold. I mean hot!', 'Sizzle!'] });
P_('pumice', { name: 'PUMICE', team: 'magma', number: 23, role: 'LEAPER', r: [8, 5, 3, 9, 5, 5, 7, 3], rig: { build: 'heroic', size: 1.65, hair: 'afro', skin: '#8a5030', hairColor: '#1a1210' }, voice: 'pumice', taunt: 'pogo', cele: ['pogo', 'raiseRoof', 'airplane'], barks: ['Boing!', 'Up here!', 'Floating!', 'Weee!'] });
P_('dunkatron', { name: 'DUNKATRON', team: 'blambots', number: 1, role: 'DESTROYER', r: [8, 6, 4, 10, 6, 8, 8, 8], rig: { build: 'bulky', size: 1.95, hair: 'bald', hat: { style: 'helmet', color: '#e8eef6' }, skin: '#c8d0dc', hairColor: '#c8d0dc', robot: true, eye: '#ff3a2a' }, voice: 'dunkatron', taunt: 'robotDance', cele: ['robotDance', 'flex', 'chestPound'], barks: ['BALL. ACQUIRED.', 'DUNK. EXECUTED.', 'YOU. ARE. OBSOLETE.', 'BEEP.'] });
P_('swatbot', { name: 'SWATBOT', team: 'blambots', number: 0, role: 'WALL', r: [6, 7, 7, 7, 7, 9, 10, 9], rig: { build: 'bulky', size: 1.95, hair: 'bald', hat: { style: 'helmet', color: '#d8dee8' }, skin: '#b8c0cc', hairColor: '#b8c0cc', robot: true, eye: '#ff2a4a' }, voice: 'swatbot', taunt: 'processing', cele: ['processing', 'robotDance', 'flex'], barks: ['REJECTED.', 'ACCESS. DENIED.', 'SWAT. PROTOCOL.', 'NEGATIVE.'] });
P_('spareparts', { name: 'SPARE PARTS', team: 'blambots', number: 99, role: 'BENCH UNIT', r: [6, 6, 6, 6, 6, 6, 6, 6], rig: { build: 'bulky', size: 1.8, hair: 'bald', hat: { style: 'helmet', color: '#a8a090' }, skin: '#9aa4b0', hairColor: '#9aa4b0', robot: true, eye: '#ffb02a', patch: '#c8a060' }, voice: 'spareparts', taunt: 'glitchWave', cele: ['glitchWave', 'robotDance', 'pointSky'], barks: ['ERR-OR.', 'I. AM. HELPING.', 'BZZT.', 'UPDATE. PENDING.'] });
P_('vinnie', { name: 'VINNIE VOX', team: 'allstars', number: 9, role: 'PLAY-BY-PLAY', r: [5, 7, 7, 5, 8, 5, 4, 5], rig: { build: 'heroic', size: 1.7, hair: 'short', hat: { style: 'band', color: '#2a2a30' }, skin: '#e8b890', hairColor: '#4a3020' }, voice: 'vinnie', taunt: 'micDrop', cele: ['micDrop', 'pointSky', 'raiseRoof'], barks: ['CALL IT!', 'BOOM-SHAKA!', 'HE SCORES! I SCORE!', 'ON THE AIR!'] });
P_('deedee', { name: 'DEE DEE DECIBEL', team: 'allstars', number: 10, role: 'COLOR COMMENTATOR', r: [7, 8, 6, 6, 7, 6, 5, 4], rig: { build: 'heroic', size: 1.6, hair: 'ponytail', skin: '#6a4030', hairColor: '#a050e0' }, voice: 'deedee', taunt: 'pointCamera', cele: ['pointCamera', 'raiseRoof', 'airplane'], barks: ['LOUDER!', 'COLOR ME IMPRESSED!', 'THAT\'S A STAT!', 'WOO!'] });
P_('blammo', { name: 'BLAMMO', team: 'allstars', number: 0, role: 'MASCOT', r: [7, 3, 1, 10, 3, 6, 9, 10], rig: { build: 'bulky', size: 2.0, hunch: .2, hair: 'flattop', skin: '#3a2e2a', hairColor: '#2a201c', face: '#7a6458', gorilla: true }, voice: 'blammo', taunt: 'chestDrum', cele: ['chestDrum', 'gorilla', 'flex'], barks: ['OOK!', 'HOO HOO!', 'BLAM-MO!', 'GRRR!'] });
P_('intern1', { name: 'INTERN 1', team: 'camp', number: 1, role: 'PRACTICE PARTNER', r: [6, 5, 4, 7, 7, 4, 4, 4], rig: { build: 'heroic', size: 1.55, hair: 'short', skin: '#e0b090', hairColor: '#6a3a1a' }, voice: 'intern1', taunt: 'pointSky', cele: ['pointSky'], barks: ['Coffee?', 'Got it!', 'Nice one!'] });
P_('intern2', { name: 'INTERN 2', team: 'camp', number: 2, role: 'PRACTICE PARTNER', r: [5, 5, 4, 4, 5, 5, 5, 4], rig: { build: 'heroic', size: 1.6, hair: 'ponytail', skin: '#8a5a3c', hairColor: '#1a1010' }, voice: 'intern2', taunt: 'shimmy', cele: ['shimmy'], barks: ['Oof.', 'My bad!', 'Again?'] });
P_('intern3', { name: 'INTERN 3', team: 'camp', number: 3, role: 'PRACTICE PARTNER', r: [5, 5, 4, 4, 5, 5, 5, 4], rig: { build: 'heroic', size: 1.65, hair: 'spiky', skin: '#c89070', hairColor: '#3a2a1a' }, voice: 'intern1', taunt: 'flex', cele: ['flex'], barks: ['Whoa!', 'Hey!', 'Ow.'] });
for (const p of all('player')) { p.ratings = {}; RATING_KEYS.forEach((k, i) => { p.ratings[k] = p.r[i]; }); }

/* ---- the story's cast (not playable) ---- */
const CAST = {
  vinnie: { name: 'VINNIE VOX', voice: 'vinnie', rig: { build: 'heroic', size: 1.7, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'band', color: '#2a2a30' }, colors: { skin: '#e8b890', hair: '#4a3020', cloth: '#f4f0ea', coat: '#2a3a8a', trim: '#ffc83a', pants: '#1e2440', boot: '#141414' } } },
  deedee: { name: 'DEE DEE DECIBEL', voice: 'deedee', rig: { build: 'heroic', size: 1.6, outfit: 'coat', sleeves: 'long', hair: 'ponytail', colors: { skin: '#6a4030', hair: '#a050e0', cloth: '#ffc83a', coat: '#8a2a6a', trim: '#ffffff', pants: '#2a1830', boot: '#141414' } } },
  gigawatt: { name: 'COMMISSIONER GIGAWATT', voice: 'gigawatt', rig: { build: 'heroic', size: 1.6, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#f0c8a8', hair: '#f4f4f4', cloth: '#ffd23a', coat: '#5a2a8a', trim: '#ffd23a', belt: '#ffd23a', pants: '#2a1640', boot: '#141010' } } },
  roscoe: { name: 'REF ROSCOE', voice: 'roscoe', rig: { build: 'heroic', size: 1.6, hair: 'short', hat: { style: 'cap', color: '#141414' }, sleeves: 'short', colors: { skin: '#c89070', hair: '#2a1a10', cloth: '#f4f4f4', trim: '#141414', pants: '#141414', boot: '#141414' } } },
  intern1: { name: 'INTERN 1', voice: 'intern1', rig: { build: 'heroic', size: 1.55, hair: 'short', colors: { skin: '#e0b090', hair: '#6a3a1a', cloth: '#8a8a92', trim: '#5a5a62', pants: '#5a5a62', boot: '#2a2a2e' } } },
  intern2: { name: 'INTERN 2', voice: 'intern2', rig: { build: 'heroic', size: 1.6, hair: 'ponytail', colors: { skin: '#8a5a3c', hair: '#1a1010', cloth: '#9a9aa2', trim: '#5a5a62', pants: '#5a5a62', boot: '#2a2a2e' } } }
};


/* ==== 03-data-courts.js ==== */
/* 03-data-courts: the five courts (PLAN 10.1). Each is data: its floor's material and colors, the line colors, the logo,
 * the backdrop, the silhouettes behind the stands, props, the crowd's colors, lights, weather, the dribble's sound, its
 * song and its twist. 20-court-build and 21-court-draw read these; 22-twists runs the twists. Props are placed in world
 * units (the arena is 768 x 400: the court 64..704 x 64..352, three tiers of stands north of it, aprons around). */
def('court', 'skybox', {
  name: 'THE SKYBOX', home: 'hightops', setting: 'A NEON HEIGHTS ROOFTOP AT NIGHT', floor: 'asphalt',
  floorColors: { a: '#2a2734', b: '#363242', grain: '#1c1a24', key: '#4a1a3e', apron: '#1e1c26' }, lines: '#2de2ff', paint: '#ff3ca6', logo: 'sneaker',
  backdrop: { sky: ['#07061a', '#1d1240', '#3a1a5a'], stars: 60, starsY: .6, moon: { x: .78, y: .16, r: 11, color: '#f4f0d8' },
    layers: [{ kind: 'city', color: '#140c2a', y: .58, height: .34, parallax: .08, seed: 3 }, { kind: 'city', color: '#21143a', y: .7, height: .26, parallax: .2, seed: 7 }] },
  silhouettes: 'skyline', standFace: 'brick', standColors: ['#2a2238', '#33293f', '#3c3048', '#45384f'],
  props: [['streetlamp', 30, 56, { light: true, size: 1.4 }], ['streetlamp', 738, 56, { light: true, size: 1.4 }], ['shape:ac-unit', 22, 112], ['shape:ac-unit', 746, 252],
    ['trashcan', 36, 332, { size: 1.3 }], ['shape:boombox', 740, 148], ['shape:bench', 740, 182], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380], ['trashcan', 732, 344, { size: 1.3 }]],
  crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a', '#8a4aff'], skins: ['#8a5a3c', '#f0c8a0', '#4a2c1e', '#d8a070', '#6a4028'],
  ambient: .45, lightColor: '#ffd8b0', glows: [['#ff3ca6', 180, 40], ['#2de2ff', 560, 40]], weather: null,
  dribble: 'dribble_asphalt', music: 'skybox', twist: 'jackpot',
  intro: 'THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!'
});
def('court', 'pier', {
  name: 'THE PIER', home: 'breakers', setting: 'A BOARDWALK AT SUNSET', floor: 'planks',
  floorColors: { a: '#a87a50', b: '#b88a5a', grain: '#6a4a30', key: '#3a8a84', apron: '#d8c08a' }, lines: '#f4ecd8', paint: '#18c8b8', logo: 'wave',
  backdrop: { sky: ['#2a1a4a', '#c8506a', '#ff7a5c', '#ffd27a'], sun: { x: .3, y: .5, r: 22, color: '#fff0b0' },
    layers: [{ kind: 'clouds', color: '#ffb0a0', y: .22, height: .1, parallax: .04, seed: 2 }, { kind: 'sea', color: '#3a4a8a', y: .62, height: .4, parallax: .12, seed: 4 }] },
  silhouettes: 'boardwalk', standFace: 'plank', standColors: ['#7a5236', '#86603e', '#926a46', '#9e744e'],
  props: [['palm', 24, 56, { size: 1.5 }], ['palm', 744, 56, { size: 1.5 }], ['shape:beach-umbrella', 30, 172], ['shape:lifeguard-tower', 740, 142], ['shape:surfboard', 20, 282],
    ['shape:surfboard', 750, 312], ['awning', 30, 352, { color: '#ff7ab0' }], ['lantern', 200, 50, { anchor: 'top', light: true }], ['lantern', 568, 50, { anchor: 'top', light: true }], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#ff5a8a', '#2ad8c8', '#ffd23a', '#ffffff', '#ff8a3a'], skins: ['#f0c8a0', '#d8a070', '#8a5a3c', '#e8b890', '#6a4028'],
  ambient: .82, lightColor: '#ffe0b0', glows: [], weather: null, wind: true,
  dribble: 'dribble_planks', music: 'pier', twist: 'wind',
  intro: 'WATCH THE WIND, FOLKS. AND THE SEAGULLS. MOSTLY THE SEAGULLS.'
});
def('court', 'scrapyard', {
  name: 'THE SCRAPYARD', home: 'crushers', setting: 'A JUNKYARD AT DUSK IN LIGHT RAIN', floor: 'concrete',
  floorColors: { a: '#5a5654', b: '#66615e', grain: '#3a3634', key: '#5a3a24', apron: '#3e3a36' }, lines: '#ffd23a', paint: '#d8641e', logo: 'wrench',
  backdrop: { sky: ['#120e1a', '#4a2e36', '#b0603a'],
    layers: [{ kind: 'clouds', color: '#3a2a30', y: .18, height: .14, parallax: .05, seed: 5 }, { kind: 'mountains', color: '#2a2024', y: .66, height: .3, parallax: .1, seed: 9 }, { kind: 'hills', color: '#1e181c', y: .76, height: .2, parallax: .2, seed: 4 }] },
  silhouettes: 'junkyard', standFace: 'rock', standColors: ['#3a3634', '#44403c', '#4e4944', '#58524c'],
  props: [['shape:junk-car', 28, 102, { facing: 0, color: '#8a3a2a' }], ['shape:tire-stack', 30, 212], ['firedrum', 26, 292, { light: true, size: 1.3 }], ['firedrum', 744, 92, { light: true, size: 1.3 }],
    ['shape:junk-car', 740, 232, { facing: PI, color: '#3a6a8a' }], ['barrel', 748, 332, { color: '#5a6a3a', size: 1.3 }], ['shape:tire-stack', 30, 352], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#d8641e', '#ffd23a', '#3a5a8a', '#5a5a5a', '#8a6a3a'], skins: ['#c8a080', '#3a2418', '#e0b090', '#8a5a3c', '#6a4028'],
  ambient: .6, lightColor: '#ffd8a0', glows: [['#ffffff', 120, 60], ['#ffffff', 640, 60]], weather: { kind: 'rain', amount: .4, wind: .15 }, dog: true,
  dribble: 'dribble_concrete', music: 'scrapyard', twist: 'oil',
  intro: 'OIL ON THE FLOOR AND FIRE IN THEIR EYES!'
});
def('court', 'caldera', {
  name: 'THE CALDERA', home: 'magma', setting: 'KABOOM ISLAND\'S VOLCANO AT NIGHT', floor: 'basalt',
  floorColors: { a: '#2a2226', b: '#34282c', grain: '#1a1416', key: '#4a1a14', apron: '#221a1c', seam: '#ff6a1a' }, lines: '#ffb020', paint: '#ff3a1a', logo: 'volcano',
  backdrop: { sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 25, starsY: .4,
    layers: [{ kind: 'mountains', color: '#1e0c0e', y: .5, height: .5, parallax: .05, seed: 12 }, { kind: 'sea', color: '#2a0c14', y: .74, height: .3, parallax: .15, seed: 6 }] },
  silhouettes: 'volcano', standFace: 'plank', standColors: ['#4a3020', '#563a26', '#62442c', '#6e4e32'],
  props: [['torch', 26, 56, { light: true, size: 1.6 }], ['torch', 742, 56, { light: true, size: 1.6 }], ['shape:tiki-totem', 28, 152], ['shape:tiki-totem', 742, 172], ['palm', 24, 272, { size: 1.4 }],
    ['torch', 26, 352, { light: true, size: 1.6 }], ['torch', 742, 352, { light: true, size: 1.6 }], ['palm', 746, 272, { size: 1.4 }], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#ff3a1a', '#ffb020', '#ffffff', '#3ad08a', '#ff7ab0'], skins: ['#8a5030', '#3a2216', '#f0c090', '#6a4028', '#c89070'],
  ambient: .42, lightColor: '#ffb070', glows: [['#ff4a1a', 384, -40]], weather: { kind: 'ash', amount: .3, wind: .1 },
  dribble: 'dribble_stone', music: 'caldera', twist: 'volcano',
  intro: 'THE FLOOR IS HOT, THE VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!'
});
def('court', 'dome', {
  name: 'THE BLAM DOME', home: 'blambots', setting: 'THE CHAMPIONSHIP ARENA', floor: 'maple',
  floorColors: { a: '#c8904a', b: '#d49c56', grain: '#a87038', key: '#8a2020', apron: '#2a1a24' }, lines: '#f4f0e8', paint: '#d02a2a', logo: 'globo',
  backdrop: { sky: ['#05040a', '#0e0a18', '#1a1028'], indoor: true, layers: [] },
  silhouettes: 'arena', standFace: 'stone', standColors: ['#2a2234', '#322840', '#3a2e4a', '#423454'], upperDeck: true,
  props: [['shape:pyro-cannon', 40, 60], ['shape:pyro-cannon', 728, 60], ['shape:pyro-cannon', 40, 356], ['shape:pyro-cannon', 728, 356], ['shape:tv-camera', 300, 384], ['shape:tv-camera', 470, 384],
    ['shape:scorer-table', 384, 380], ['shape:trophy', 384, 362], ['shape:bench', 30, 202], ['shape:bench', 738, 202]],
  crowd: ['#d02a2a', '#ffd23a', '#2a5ad0', '#ffffff', '#3ad08a', '#ff7a2a'], skins: ['#f0c8a0', '#8a5a3c', '#4a2c1e', '#d8a070', '#6a4028', '#e0b090'],
  ambient: .72, lightColor: '#fff0d8', glows: [], weather: null, spots: true,
  dribble: 'dribble_maple', music: 'dome', twist: 'boss',
  intro: 'THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS JUMBOTRON!'
});
const COURT_ORDER = ['skybox', 'pier', 'scrapyard', 'caldera', 'dome'];
const TWIST_INFO = {
  jackpot: ['JACKPOT SPOT', 'A glowing ring moves around the court. Make a jumper with your feet in it: +2 points.'],
  wind: ['SEA BREEZE', 'Gusts blow across the Pier and bend every shot. Watch the windsock; wait out a big one.'],
  oil: ['OIL SLICKS', 'Slick spots each quarter. You slide on them, and a hard turn at turbo speed slips you.'],
  volcano: ['ERUPTIONS & STEAM VENTS', 'Lava bombs fall on the red rings. Ride a puffing steam vent with turbo + shoot: VOLCANO LAUNCH.'],
  boss: ['THE BLAMBOTS', 'They OVERCLOCK in the 4th. Knock a bot down twice in 10 seconds and it reboots.']
};


/* ==== 04-data-story.js ==== */
/* 04-data-story: the Blam Tour (PLAN 10.5) and its story script (10.6): beats as lines [speaker, text] on a stage, the
 * matchup trash talk, halftime gags and sponsor breaks. {TEAM} is your team's name, {CAPTAIN} your first player. Every
 * line about a player uses the NAME. Announcers shout in caps; the Commissioner is smug in sentence case; robots speak
 * in SPACED. CAPITAL. WORDS. */
const TOUR_STOPS = {   // your team -> the three opponents in order; the final is always the BLAMBOTS at the Blam Dome
  hightops: ['breakers', 'crushers', 'magma'], breakers: ['hightops', 'crushers', 'magma'],
  crushers: ['hightops', 'breakers', 'magma'], magma: ['hightops', 'breakers', 'crushers']
};
const TOUR_DIFF_SHIFT = [-1, 0, .5, 1];   // CPU difficulty by stop: one step lower, as set, half a step higher, one higher
const RIVAL_LINES = {   // the rival captain's line before a game against that team
  breakers: ['riptide', 'Hope you packed sunscreen, {TEAM}. The tide\'s coming in, and it doesn\'t knock.'],
  hightops: ['volt', 'Welcome to the Skybox. Try not to look down. Actually, look down: that\'s where you\'ll be.'],
  crushers: ['torque', 'We crush cars for breakfast. You look like a light snack.'],
  magma: ['obsidian', 'On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully.']
};
const REPLY_LINES = {   // your captain's reply: [opponent][your team]
  breakers: { hightops: ['volt', 'Cute pier. I\'m about to dunk on it.'], crushers: ['torque', 'I\'ve crushed bigger boats than this.'], magma: ['obsidian', 'Sand turns to glass when I\'m around.'] },
  hightops: { breakers: ['riptide', 'Whoa, relax. We\'re just here to ride the wave. Over you.'], crushers: ['torque', 'Fancy lights. They\'ll look great on my scrap pile.'], magma: ['ember', 'Neon\'s cute. Lava\'s hotter.'] },
  crushers: { hightops: ['volt', 'Then you\'re about to get a stomachache.'], breakers: ['shellshock', 'Careful, the floor\'s greasier than your jokes.'], magma: ['pumice', 'I bounce. You crush. Let\'s see who\'s still standing.'] },
  magma: { hightops: ['bigrumble', 'I don\'t walk carefully. I walk LOUD.'], breakers: ['riptide', 'Dude. Is that, like, safe?'], crushers: ['sparkplug', 'I\'m too fast to get burned!'] }
};
const BEATEN_LINES = { breakers: ['riptide', 'Wipeout. Totally gnarly, though. Respect.'], hightops: ['volt', 'Okay, okay. You can ball. Don\'t let it go to your head.'], crushers: ['torque', 'You crushed us. That\'s MY job.'], magma: ['obsidian', 'The mountain... respects you.'] };
const REVEAL_REPLY = { hightops: ['volt', 'Did the toaster just trash-talk me?'], breakers: ['riptide', 'Bummer. I was gonna say we could be friends.'], crushers: ['torque', 'I\'ve got a crusher with your names on it.'], magma: ['obsidian', 'Metal melts.'] };

/* the beats. stage: where it plays (21-court-draw's stage painter); lines: [speaker, text]; choices: on the last line */
def('beat', 'prologue', { title: 'PROLOGUE', stage: 'studio', music: 'story', lines: [
  ['vinnie', 'GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!'],
  ['deedee', 'AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!'],
  ['vinnie', 'TONIGHT\'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE.'],
  ['gigawatt', 'Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours.'],
  ['gigawatt', 'Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha.'],
  ['deedee', '{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!']] });
def('beat', 'campOffer', { title: 'BLAM CAMP?', stage: 'studio', music: 'story', lines: [
  ['deedee', 'FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I\'LL SHOW YOU THE ROPES. OR DON\'T. LIVE DANGEROUSLY!']], choices: ['BLAM CAMP', 'LET\'S PLAY'] });
def('beat', 'stopIntro', { title: 'STOP INTRO', stage: 'court', music: 'story', dynamic: true });
def('beat', 'pregame', { title: 'PRE-GAME TALK', stage: 'court', music: 'story', dynamic: true });
def('beat', 'post1', { title: 'AFTER STOP 1', stage: 'court', music: 'story', dynamic: true });
def('beat', 'post2', { title: 'AFTER STOP 2', stage: 'monitor', music: 'story', villain: true, lines: [
  ['gigawatt', 'Data received. Prototype calibration at ninety-eight percent. Keep playing, little ballers. Keep... teaching them.'],
  ['deedee', 'TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT ARM?'],
  ['vinnie', 'THAT\'S BRANDING, DEE DEE. WE DON\'T ASK QUESTIONS ON LIVE TV.']] });
def('beat', 'reveal', { title: 'THE REVEAL', stage: 'dome', music: 'story', villain: true, dynamic: true });
def('beat', 'finalPre', { title: 'THE FINAL', stage: 'dome', music: 'story', lines: [['vinnie', 'THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!']] });
def('beat', 'overclock', { title: 'OVERCLOCK', inPlay: true, lines: [['gigawatt', 'OVERCLOCK THEM! MAXIMUM BLAM!'], ['deedee', 'THE ROBOTS ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!']] });
def('beat', 'reboot', { title: 'FIRST REBOOT', inPlay: true, lines: [['deedee', 'THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!']] });
def('beat', 'ending', { title: 'THE ENDING', stage: 'dome', music: 'credits', ending: true, lines: [
  ['dunkatron', 'ERROR. ERROR. HUMANS. TOO. ... BLAM.'],
  ['vinnie', 'THEY DID IT! {TEAM} WINS THE BLAM TOUR!'],
  ['deedee', 'AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!'],
  ['gigawatt', 'This isn\'t over! I\'ll buy another league! I\'ll buy the MOON! Hey! Put me down!'],
  ['vinnie', 'STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!'],
  ['deedee', 'GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!'],
  ['both', 'ALL BLAM!']] });
def('beat', 'lossStop', { title: 'A LOSS', stage: 'monitor', music: 'story', villain: true, lines: [['gigawatt', 'Tsk. Another court for my parking empire.']] });
def('beat', 'lossFinal', { title: 'A LOSS IN THE FINAL', stage: 'dome', music: 'story', villain: true, lines: [['gigawatt', 'Resistance is... adorable.'], ['dunkatron', 'GAME. OVER. INSERT. COIN.']] });
const BEAT_ORDER = ['prologue', 'campOffer', 'stopIntro', 'pregame', 'post1', 'post2', 'reveal', 'finalPre', 'overclock', 'reboot', 'ending', 'lossStop', 'lossFinal'];

/** the lines of a dynamic beat for the tour's state t ({ team, stop, opp, court }) */
function beatLines(id, t) {
  const opp = t.opp, court = get('court', t.court || 'skybox'), home = get('team', t.homeTeam || t.team), away = get('team', t.awayTeam || opp);
  if (id === 'stopIntro') return [['vinnie', 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR: ' + (home ? home.short : '') + ' VERSUS ' + (away ? away.short : '') + ' AT ' + court.name + '!'], ['deedee', court.intro]];
  if (id === 'pregame') { const a = RIVAL_LINES[opp], b = REPLY_LINES[opp] && REPLY_LINES[opp][t.team]; return [a, b].filter(Boolean); }
  if (id === 'post1') return [BEATEN_LINES[opp], ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']].filter(Boolean);
  if (id === 'reveal') return [['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'], ['gigawatt', 'Congratulations. You have earned the privilege... of being replaced.'],
    ['gigawatt', 'Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!'], ['dunkatron', 'BEEP. YOUR. CAREER. IS. DEPRECATED.'],
    ['swatbot', 'INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK.'], REVEAL_REPLY[t.team]].filter(Boolean);
  const b = get('beat', id); return b && b.lines ? b.lines : [];
}

const HALFTIME_GAGS = [
  'THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM SNEAKER GLUE. STICK THE LANDING. FOREVER.',
  'OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS SWEATING.',
  'REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT.',
  'GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0% EXPLANATION.',
  'IF YOU\'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON\'T KNOW HOW EITHER.',
  'WE ASKED THE ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT.'
];
const SPONSOR_BREAKS = [
  'WE\'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS SHATTERY!',
  'GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT.',
  'THIS REPLACEMENT BACKBOARD IS BROUGHT TO YOU BY... THE LAST REPLACEMENT BACKBOARD.'
];
const UNLOCK_CARDS = ['UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN'];
const CREDITS_ROLL = [
  ['BASHKETBALL', ''], ['AN ORIGINAL ARCADE BASKETBALL GAME', ''], ['', ''],
  ['GAME, CODE, ART, MUSIC, VOICES', 'Built by Claude (Anthropic, claude-opus-5-5)'], ['FROM THE PLAN BY', 'claude-opus-5-5 (PLAN.md)'],
  ['ENGINE', 'my-3D2dge v0.85.2 (MIT), modified'], ['ONLINE', 'AI Hub Session Protocol v1, client 1.4.0'],
  ['SOUND', 'Every song, sound and voice made in code'], ['', ''],
  ['STARRING', 'VOLT • BIG RUMBLE • PIXEL'], ['', 'RIPTIDE • SHELLSHOCK • LONGBOARD'], ['', 'TORQUE • SPARKPLUG • HUBCAP'], ['', 'OBSIDIAN • EMBER • PUMICE'],
  ['AND', 'DUNKATRON • SWATBOT • SPARE PARTS'], ['WITH', 'VINNIE VOX • DEE DEE DECIBEL • BLAMMO'], ['VILLAINY BY', 'COMMISSIONER GIGAWATT'], ['WHISTLE BY', 'REF ROSCOE'],
  ['', ''], ['NO FOULS. NO MERCY.', 'ALL BLAM.']
];


/* ==== 05-data-lines.js ==== */
/* 05-data-lines: the announcers' line banks by event (PLAN 10.7). ALL CAPS, at most 60 characters, slots {NAME} (the
 * player who did it), {VICTIM} (who it was done to) and {TEAM}. VINNIE calls the play, DEE DEE adds the color; the
 * announcer system alternates them, keeps the last 8 lines from repeating and lets big plays interrupt small ones. */
const LINE_RANK = { tipoff: 2, jumper: 1, layup: 1, putback: 3, three: 2, deepThree: 3, airball: 2, miss: 1, block: 3, steal: 2, shove: 2, ankles: 3, posterized: 5,
  dunkPower: 4, dunkSpin: 4, dunkFlip: 4, dunkHang: 4, dunkLong: 4, dunkNova: 5, dunkVolcano: 5, dunkQuake: 6, alleyoop: 4, novaOn: 5, novaOff: 3, shatter: 6, goaltend: 3, jackpot: 4,
  clutch: 3, buzzer: 5, comeback: 2, blowout: 2, shotClock: 2, quarterEnd: 3, halftime: 3, final: 6, gust: 3, oil: 3, eruption: 4, vent: 5, overclock: 5, reboot: 4, bossTalk: 2,
  pu_rocket: 3, pu_glue: 3, pu_laser: 3, pu_moon: 3, pu_bomb: 3, pu_gold: 3, bombHit: 4, taunt: 1, overtime: 4, suddenBlam: 5 };
const MINOR_BANKS = ['pu_rocket', 'pu_glue', 'pu_laser', 'pu_moon', 'pu_bomb', 'pu_gold', 'gust', 'oil', 'eruption', 'vent', 'overclock', 'reboot', 'bossTalk', 'bombHit', 'taunt', 'overtime', 'suddenBlam', 'dunkVolcano', 'dunkQuake'];
const LINES = {
  tipoff: ['WELCOME TO CHANNEL BLAM! LET\'S GET LOUD!', 'THE BALL IS UP! THE CROWD IS UP! I AM UP!', 'REF ROSCOE TOSSES IT AND WE ARE LIVE!', 'TIP-OFF! NO FOULS! NO MERCY! NO LUNCH BREAK!',
    'HERE WE GO! SNEAKERS LACED, VOLUME MAXED!', 'IT\'S GO TIME AND THE TIME IS GO!', 'THE ARENA IS SHAKING AND NOBODY HAS SCORED YET!', 'ALL RIGHT, BALL FANS, BUCKLE UP!',
    'TWO ON TWO, ONE BALL, ZERO RULES. PERFECT!', 'AND THE JUMP BALL GOES UP! WHO WANTS IT?'],
  jumper: ['{NAME} PULLS UP AND DRAINS IT!', 'BUCKETS! {NAME} WITH THE SMOOTH TWO!', 'NOTHING BUT NET FROM {NAME}!', 'MONEY! {NAME} CASHES IN!', '{NAME} WITH THE SOFT TOUCH!',
    'JUMPER IS GOOD! THE CROWD APPROVES!', 'BANG! {NAME} FROM MID-RANGE!', 'CASH IT! {NAME} IS FEELING IT!', 'FROM THE ELBOW, {NAME} HITS!', 'GOOD! {NAME} MAKES IT LOOK EASY!'],
  layup: ['{NAME} KISSES IT OFF THE GLASS!', 'EASY TWO FOR {NAME}!', 'LAYUP! GENTLE AS A LULLABY!', '{NAME} SNEAKS IN FOR TWO!', 'THE FINGER ROLL! FANCY!',
    'IN AND OUT OF TRAFFIC, {NAME} SCORES!', '{NAME} LAYS IT UP AND IN!', 'SOFT TOUCH! {NAME} SAID PLEASE!', 'A POLITE LITTLE LAYUP FROM {NAME}!', 'TWO POINTS, NO FUSS. {NAME}!'],
  putback: ['PUTBACK! {NAME} CLEANS UP THE MESS!', 'SECOND CHANCE, FIRST CLASS! {NAME}!', '{NAME} SAYS THANKS FOR THE REBOUND!', 'TIP SLAM! {NAME} IS ON THE GLASS!', 'CLEANUP ON AISLE RIM! {NAME}!',
    'PUTBACK! THE MISS BECAME A BLAM!', '{NAME} WAS WAITING FOR THAT ONE!', 'OFFENSIVE BOARD AND A SLAM! {NAME}!', 'RECYCLED! {NAME} PUTS IT BACK!', 'THAT\'S HUSTLE! {NAME} FINISHES!'],
  three: ['SPLASH! BRING A TOWEL!', 'THREE! {NAME} IS ON FIRE FROM DOWNTOWN!', 'FROM DOWNTOWN! BANG!', '{NAME} FROM THREE! COUNT IT!', 'THE THREE BALL IS FALLING!',
    'TRIPLE! {NAME} IS DIALED IN!', 'SPLASH CITY, POPULATION {NAME}!', 'RAINING THREES! GET AN UMBRELLA!', '{NAME} LETS IT FLY... GOOD!', 'THREE POINTS! THE NET IS SOAKED!'],
  deepThree: ['THAT WAS FROM A DIFFERENT ZIP CODE!', '{NAME} SHOT THAT FROM THE PARKING LOT! VALIDATED!', 'FROM THE LOGO! ARE YOU KIDDING ME?', 'DEEP! DEEPER! DEEPEST! GOOD!',
    '{NAME} NEEDED A PASSPORT FOR THAT SHOT!', 'THAT SHOT HAD FREQUENT FLYER MILES!', 'WAY DOWNTOWN! THE SUBURBS, EVEN!', '{NAME} FROM THE NEXT COUNTY!', 'SOMEBODY MEASURE THAT! TOO FAR!', 'HALF-COURT HEAVEN! {NAME}!'],
  airball: ['AIRBALL! THE SEAGULLS SAY THANK YOU!', 'THAT ONE IS STILL GOING. IT\'S IN ORBIT.', 'AIRBALL! NOT EVEN CLOSE, {NAME}!', 'WHIFF! THE RIM FELT NOTHING!', 'THAT SHOT MISSED THE WHOLE BUILDING!',
    'AIR-BALL! AIR-BALL! THE CROWD KNOWS!', '{NAME} JUST PASSED TO NOBODY!', 'BRICK? NO, THAT NEEDED TO HIT SOMETHING!', 'THE NET IS SAFE FROM {NAME}!', 'AND THAT ONE WENT TO THE MOON!'],
  miss: ['NO GOOD!', 'OFF THE RIM!', 'CLANK! IT RATTLES OUT!', 'BRICK! SOMEBODY BUILD A HOUSE!', 'IN AND OUT! SO CLOSE!', 'IT ROLLS OFF! UP FOR GRABS!', 'NOT THIS TIME, {NAME}!',
    'OFF THE BACK IRON!', 'THE RIM SAYS NO!', 'MISSED IT! REBOUND!'],
  dunkPower: ['BLAMMO! {NAME} JUST MAILED IT FIRST CLASS!', 'SOMEBODY CALL A CARPENTER, THAT RIM IS FINISHED!', 'KA-BLAM! THE CROWD LEFT THEIR SEATS. AND THEIR SHOES!', 'BOOM-SHAKA! {NAME} THROWS IT DOWN!',
    'HAMMER TIME! {NAME} BRINGS THE HAMMER!', 'THE RIM FILED A COMPLAINT!', 'SLAM! THE BACKBOARD IS STILL SHAKING!', '{NAME} DUNKED SO HARD THE BALL APOLOGIZED!', 'THUNDER AND LIGHTNING! {NAME}!', 'HE\'S... NO, {NAME} IS UNSTOPPABLE!'],
  dunkSpin: ['{NAME} SPUN SO FAST THE SCOREBOARD GOT DIZZY!', 'THREE-SIXTY! THE WORLD IS SPINNING!', 'ROUND AND ROUND AND BLAM!', '{NAME} DID A FULL TURN AND A FULL SLAM!',
    'I NEED TO SIT DOWN. I AM SITTING. I NEED TO LIE DOWN!', 'WHIRLWIND! {NAME} IS GENERATING POWER!', 'SPIN CYCLE COMPLETE! {NAME}!', 'A TORNADO WITH SNEAKERS!', '{NAME} DIDN\'T EVEN LOOK AT THE RIM!', 'TWIRL AND HURL! {NAME}!'],
  dunkFlip: ['A FRONT FLIP?! THAT\'S NOT BASKETBALL, THAT\'S THE CIRCUS!', '{NAME} FLIPPED OUT! LITERALLY!', 'HEAD OVER HEELS OVER RIM!', 'SOMERSAULT SLAM! CALL THE OLYMPICS!',
    'GRAVITY JUST FILED FOR UNEMPLOYMENT!', '{NAME} WENT UPSIDE DOWN AND THE RIM WENT DOWN!', 'THE FLIP! I FLIPPED! WE ALL FLIPPED!', 'GYMNASTICS SCORE: TEN! {NAME}!', 'THE CROWD JUST FLIPPED TOO!', 'TUMBLE AND RUMBLE! {NAME}!'],
  dunkHang: ['{NAME} IS HANGING ON THAT RIM LIKE IT OWES MONEY!', 'HANG TIME! {NAME} PAID RENT UP THERE!', 'RIM RATTLER! THE HOOP IS SHAKING!', '{NAME} IS STILL UP THERE. HELLO?',
    'SOMEBODY GET {NAME} A LADDER!', 'THAT RIM NEEDS THERAPY NOW!', 'SWINGING ON THE RIM LIKE A JUNGLE GYM!', 'HANGING AROUND! {NAME} LIKES THE VIEW!', 'THE RIM IS BENT AND SO AM I!', '{NAME} MOVED IN UP THERE!'],
  dunkLong: ['AIR TRAFFIC CONTROL HAS QUESTIONS FOR {NAME}!', 'FROM THE FREE-THROW LINE! FLYING!', '{NAME} TOOK OFF IN ONE TIME ZONE!', 'CLEARED FOR TAKEOFF! CLEARED FOR LANDING!',
    'THAT WAS A FLIGHT, NOT A DUNK!', '{NAME} JUST EARNED FREQUENT FLYER MILES!', 'GLIDING! {NAME} HAS WINGS!', 'FASTEN YOUR SEATBELTS! {NAME}!', 'HANG GLIDER! {NAME} SOARS!', 'THE ATMOSPHERE CALLED. IT WANTS {NAME} BACK!'],
  dunkNova: ['SEVEN-TWENTY! {NAME} BROKE PHYSICS!', 'SUPERNOVA SLAM! I SEE STARS!', 'TWO FULL SPINS! {NAME} IS A GALAXY!', 'COSMIC! {NAME} DUNKED FROM SPACE!',
    'THE STARS ALIGNED AND {NAME} DUNKED THEM!', 'SUPERNOVA! THE SKY IS ON FIRE!', '{NAME} IS IN ORBIT! AND SCORING!', 'BIG BANG! {NAME} MADE A UNIVERSE!', 'NASA IS CALLING {NAME}!', 'STELLAR! INTERSTELLAR! {NAME}!'],
  dunkVolcano: ['{NAME} RODE THE STEAM VENT TO THE MOON!', 'VOLCANO LAUNCH! {NAME} ERUPTED!', 'LAVA LAUNCH! STAND BACK!', 'THE VOLCANO ASSISTS {NAME}! STAT IT!'],
  dunkQuake: ['BLAM-QUAKE! CHECK THE RICHTER SCALE!', 'THE WHOLE ARENA MOVED! {NAME}!', 'SEISMIC SLAM! EVERYBODY DOWN!', 'THE FLOOR FELT THAT ONE! {NAME}!'],
  alleyoop: ['SPECIAL DELIVERY! SIGNED, SEALED, SLAMMED!', 'ALLEY-OOP! {NAME} SNATCHES IT FROM THE SKY!', 'LOB CITY! POPULATION: {NAME}!', 'FROM THE CLOUDS TO THE CUP!',
    'THE OOP! THE OOP! I LOVE THE OOP!', 'AIR MAIL! {NAME} SIGNS FOR IT!', 'THROW IT UP, {NAME} THROWS IT DOWN!', 'TEAMWORK MAKES THE DREAM WORK! BLAM!', 'HIGH-FIVE IN THE SKY! {NAME}!', 'THAT PASS HAD A GPS!'],
  block: ['REJECTED! RETURN TO SENDER!', '{NAME} SAYS NOT IN MY HOUSE! NOT IN MY ZIP CODE!', 'GET THAT OUTTA HERE!', 'BLOCKED! {NAME} SWATS IT AWAY!',
    'DENIED! {VICTIM} NEEDS A NEW PLAN!', 'SWAT CITY! {NAME} IS THE MAYOR!', 'FACIAL! {NAME} STUFFS {VICTIM}!', 'NO FLY ZONE! {NAME}!', 'THAT BALL WAS SENT TO THE CHEAP SEATS!', 'STUFFED LIKE A HOLIDAY TURKEY!'],
  steal: ['PICKPOCKET! CHECK YOUR WALLETS, FOLKS!', '{NAME} SNATCHED IT LIKE A SEAGULL AT A FRY STAND!', 'STOLEN! {NAME} HAS QUICK HANDS!', 'STRIPPED! {VICTIM} NEVER SAW IT COMING!',
    'THE HEIST! {NAME} TAKES IT!', 'GRAND THEFT BALL! {NAME}!', 'YOINK! {NAME} SAYS THANK YOU!', '{VICTIM} LEFT IT UNATTENDED! MISTAKE!', 'SWIPE! {NAME} IS A CAT BURGLAR!', 'TURNOVER! {NAME} PICKS THE POCKET!'],
  shove: ['NO FOULS IN BASHKETBALL, BABY!', 'THAT\'S NOT A FOUL. THAT\'S A LIFESTYLE.', '{VICTIM} JUST GOT SENT TO THE SHADOW REALM!', 'SHOVED! {VICTIM} IS ON THE FLOOR!',
    'BOOM! {NAME} CLEARS THE LANE!', '{NAME} WITH THE BULLDOZER!', 'FLATTENED! {VICTIM} SEES STARS!', 'PERFECTLY LEGAL AND DEEPLY RUDE!', 'TIMBER! {VICTIM} GOES DOWN!', '{NAME} SAYS EXCUSE ME. NOT REALLY.'],
  ankles: ['ANKLES! {VICTIM} NEEDS A NEW PAIR!', 'BROKE THE ANKLES! {NAME} IS NASTY!', '{VICTIM} FELL OVER! SPIN MOVE!', 'SHAKE AND BAKE! {NAME}!', 'CROSSED UP! {VICTIM} IS LOST!',
    '{NAME} SPUN {VICTIM} INTO NEXT WEEK!', 'THE SPIN! {VICTIM} SAT DOWN!', 'SOMEBODY HELP {VICTIM} UP!', 'DIZZY! {VICTIM} IS SEEING DOUBLE!', 'TURNSTILE DEFENSE! {NAME} WALKS BY!'],
  posterized: ['FRAME IT! HANG IT! {VICTIM} IS ON {NAME}\'S WALL NOW!', 'POSTERIZED! PRINT A MILLION COPIES!', '{NAME} DUNKED ON {VICTIM}! RIGHT ON!', 'THAT\'S A POSTER! AND A T-SHIRT!',
    '{VICTIM} WILL NEVER LIVE THAT DOWN!', 'MOM, COME LOOK! {VICTIM} GOT DUNKED ON!', 'POSTER CHILD! {VICTIM}!', 'SOMEBODY CALL {VICTIM} A CAB!', 'BIG FACE! {NAME} OVER {VICTIM}!', 'THE POSTER SHOP IS OPEN!'],
  novaOn: ['{NAME} HAS GONE SUPERNOVA! DIM THE LIGHTS!', 'SOMEBODY CALL NASA, {NAME} IS A STAR!', 'SUPERNOVA! THE BALL IS ON FIRE!', 'THREE STRAIGHT! {NAME} IS COSMIC!',
    '{NAME} IS BURNING BRIGHTER THAN THE SUN!', 'STAR POWER! {NAME} CAN\'T MISS!', 'SUPERNOVA! THE CROWD NEEDS SUNGLASSES!', 'IGNITION! {NAME} IS IN ORBIT!', '{NAME} JUST LIT UP THE NIGHT SKY!', 'HOT HOT HOT! {NAME} GOES NOVA!'],
  novaOff: ['AND THE STAR COLLAPSES! BACK TO EARTH, {NAME}!', 'THE FIRE IS OUT! {NAME} COOLS DOWN!', 'SUPERNOVA OVER! {NAME} IS HUMAN AGAIN!', 'BLACK HOLE! THE STREAK IS GONE!',
    '{NAME} FIZZLES OUT!', 'THE STAR BURNED OUT! FOR NOW!', 'AND THE FLAMES DIE DOWN!', 'NORMAL MODE ENGAGED, {NAME}!', 'COOLED OFF! WHAT A RUN, {NAME}!', 'GRAVITY RETURNS FOR {NAME}!'],
  shatter: ['THE GLASS! THE GLASS IS GONE!', 'SOMEBODY GET A BROOM. A BIGGER BROOM!', 'SHATTERED! {NAME} BROKE THE BACKBOARD!', 'GLASS EVERYWHERE! {NAME}!',
    'THAT BACKBOARD HAD A FAMILY!', '{NAME} OWES THE ARENA A NEW BOARD!', 'KRAKOOM! SEVEN YEARS BAD LUCK!', 'THE BOARD EXPLODED! NOT A DRILL!', 'SHARDS! SHARDS EVERYWHERE!', 'CALL THE GLAZIER! {NAME} STRIKES!'],
  goaltend: ['GOALTENDING! THE BUCKET COUNTS, AND SO DOES THE SHAME!', 'GOALTEND! TOO LATE, {NAME}!', 'ON THE WAY DOWN! THAT COUNTS!', 'GOALTENDING! THE REF SAW THAT!',
    'GOALIE {NAME} GETS IT WRONG!', 'HANDS OFF THE CUP! IT COUNTS!', '{NAME} SWATTED A DONE DEAL!', 'BASKET GOOD! NICE TRY, {NAME}!', 'THAT\'S A GOALTEND! TWO FREE POINTS!', 'TOO LATE TO THE PARTY, {NAME}!'],
  jackpot: ['JACKPOT! {NAME} HIT THE SPOT AND THE SPOT PAID OUT!', 'CHA-CHING! JACKPOT FOR {NAME}!', 'THE SPOT PAYS! TWO BONUS POINTS!', 'JACKPOT! SOMEBODY CALL THE BANK!',
    '{NAME} IS ON THE MONEY! LITERALLY!', 'BONUS BUCKETS! {NAME} HITS IT!', 'JACKPOT! THE LIGHTS ARE FLASHING!', '{NAME} FOUND THE SWEET SPOT!', 'THREE CHERRIES! JACKPOT!', 'CASH OUT! {NAME} HIT THE SPOT!'],
  clutch: ['TEN SECONDS! HEARTS POUNDING! SNEAKERS SQUEAKING!', 'CRUNCH TIME! WHO WANTS IT?', 'THE CLOCK IS TICKING! TICK TOCK!', 'NAIL-BITER! I HAVE NO NAILS LEFT!',
    'FINAL SECONDS! STAND UP!', 'CLUTCH TIME! THIS IS IT!', 'DOWN TO THE WIRE, FOLKS!', 'NOBODY BREATHE! OKAY, BREATHE A LITTLE!', 'IT\'S CLOSE! IT\'S LOUD! IT\'S LATE!', 'SOMEBODY BE A HERO!'],
  buzzer: ['AT THE BUZZER! I BROKE MY CHAIR! I NEED A NEW CHAIR!', 'BUZZER BEATER! {NAME}!', 'AT THE HORN! COUNT IT!', 'BEAT THE CLOCK! {NAME} DOES IT!',
    'BUZZER! BASKET! BEDLAM!', '{NAME} BEATS THE BUZZER AND THE ODDS!', 'JUST IN TIME! {NAME}!', 'OFF THE FINGERS AS THE HORN SOUNDS!', 'THE CLOCK SAYS ZERO, THE NET SAYS YES!', 'LAST SECOND! LAST LAUGH! {NAME}!'],
  comeback: ['{TEAM} IS CLAWING BACK! DON\'T TOUCH THAT DIAL!', 'HERE COME {TEAM}! IT\'S A GAME!', 'THE COMEBACK IS ON!', '{TEAM} REFUSES TO QUIT!', 'THE GAP IS CLOSING!',
    'STAY TUNED! {TEAM} IS ROLLING!', 'MOMENTUM SHIFT! {TEAM}!', 'NEVER COUNT OUT {TEAM}!', '{TEAM} SMELLS BLOOD!', 'WE HAVE A BALLGAME!'],
  blowout: ['THIS ONE\'S GETTING UGLY. I\'M COVERING MY EYES. I\'M PEEKING.', '{TEAM} IS RUNNING AWAY WITH IT!', 'SOMEBODY CALL A TIMEOUT! WE DON\'T HAVE THOSE!', 'BLOWOUT ALERT!',
    'IT\'S RAINING ON ONE SIDE ONLY!', '{TEAM} IS IN TOTAL CONTROL!', 'THE SCOREBOARD IS EMBARRASSED!', 'MERCY? NOT IN BASHKETBALL!', '{TEAM} IS HAVING A PARTY!', 'THAT LEAD IS GROWING LIKE A WEED!'],
  shotClock: ['SHOT CLOCK! YOU HAVE TO SHOOT IT EVENTUALLY, FOLKS!', 'TIME\'S UP! TURNOVER!', 'SHOT CLOCK VIOLATION! TOO SLOW!', 'THE CLOCK WINS THAT ONE!',
    'HELLO? THE HOOP IS RIGHT THERE!', 'TICK TOCK, TURNOVER!', 'HOLDING IT TOO LONG! VIOLATION!', 'NO SHOT, NO POINTS!', 'TWENTY SECONDS, ZERO SHOTS!', 'BUZZ! THE SHOT CLOCK STRIKES!'],
  quarterEnd: ['THAT\'S THE QUARTER! CATCH YOUR BREATH, I CAN\'T!', 'END OF THE QUARTER! WHAT A RIDE!', 'QUARTER\'S OVER! GET A DRINK!', 'HORN! QUARTER DONE!',
    'AND THE QUARTER ENDS! STAY WITH US!', 'BREAK TIME! LEGS ARE BURNING!', 'TIME OUT ON THE QUARTER!', 'THAT\'S A QUARTER IN THE BOOKS!', 'END OF THE PERIOD! WOW!', 'QUARTER\'S DONE! I\'M NOT!'],
  halftime: ['HALFTIME! STRETCH YOUR LEGS AND YOUR VOCABULARY!', 'HALFTIME! GRAB A SNACK! GRAB TWO!', 'HALF DONE! HALF TO GO!', 'THE HALF IS OVER! THE HYPE IS NOT!',
    'HALFTIME REPORT, COMING UP!', 'HALFTIME! LOCKER ROOM SPEECHES!', 'WE\'RE AT THE HALF, BALL FANS!', 'HALFWAY HOME!', 'TWO DOWN, TWO TO GO!', 'HALFTIME! I NEED A NAP!'],
  final: ['FINAL! {TEAM} TAKES IT!', 'IT\'S OVER! {TEAM} WINS!', 'GAME! {TEAM} IS VICTORIOUS!', 'THE FINAL HORN! {TEAM} WINS!', 'AND THAT\'S THE BALLGAME! {TEAM}!',
    'VICTORY FOR {TEAM}!', '{TEAM} WINS! GOODNIGHT!', 'FINAL SCORE! {TEAM} ON TOP!', 'DONE! {TEAM} RULES TONIGHT!', '{TEAM} TAKES THE W!'],
  overtime: ['OVERTIME! WE\'RE NOT DONE YET!', 'EXTRA BASKETBALL! FREE OF CHARGE!', 'TIED! OVERTIME, BABY!', 'BONUS ROUND! OVERTIME!'],
  suddenBlam: ['SUDDEN BLAM! NEXT BUCKET WINS!', 'SUDDEN BLAM! ONE SHOT! ONE GLORY!', 'NEXT BASKET TAKES IT ALL!', 'SUDDEN BLAM! NO MORE TIES!'],
  gust: ['BIG GUST OFF THE OCEAN! HOLD ONTO YOUR JUMPERS!', 'WIND ALERT! SHOTS ARE CURVING!', 'THE SEA BREEZE IS HOWLING!', 'GUST! THAT BALL IS GOING SIDEWAYS!'],
  oil: ['{NAME} HIT THE OIL! THAT\'S A SLIP \'N SLAM!', 'OIL SLICK! {NAME} WIPES OUT!', 'SLIPPERY! {NAME} GOES DOWN!', 'WHOOPS! {NAME} FOUND THE GREASE!'],
  eruption: ['THE VOLCANO WANTS IN ON THE ACTION!', 'ERUPTION! LAVA BOMBS INCOMING!', 'THE MOUNTAIN IS ANGRY!', 'KABOOM! WATCH THE RED RINGS!'],
  vent: ['{NAME} RODE THE STEAM VENT TO THE MOON!', 'STEAM POWERED! {NAME} LAUNCHES!', 'THE VENT GIVES {NAME} A LIFT!', 'SUPER BLOCK FROM THE STEAM! {NAME}!'],
  overclock: ['THE ROBOTS ARE OVERCLOCKING! I SMELL BURNT TOAST!', 'OVERCLOCK! RED EYES! RED ALERT!', 'MAXIMUM BLAM! THE BOTS ARE GLOWING!', 'THE BLAMBOTS JUST GOT AN UPGRADE!'],
  reboot: ['SYSTEM REBOOT! TURN IT OFF AND ON AGAIN, BABY!', '{NAME} IS REBOOTING! FREE BASKETS!', 'SHORT CIRCUIT! {NAME} IS FROZEN!', 'BLUE SCREEN! {NAME} CRASHED!'],
  bossTalk: ['THOSE ROBOTS RUN ON BATTERIES AND BAD MANNERS!', 'BEEP BOOP, THAT\'S A BUCKET!', 'THE BLAMBOTS DON\'T BLINK!', 'HUMANS VERSUS HARDWARE!'],
  pu_rocket: ['ROCKET KICKS! {NAME} IS LEGALLY A VEHICLE NOW!', 'ZOOM! {NAME} HAS ROCKETS ON!', 'ROCKET KICKS! CATCH {NAME} IF YOU CAN!', 'VROOM! ROCKET KICKS FOR {NAME}!'],
  pu_glue: ['GLUE GLOVES! THAT BALL ISN\'T GOING ANYWHERE!', 'STICKY FINGERS! {NAME} HAS GLUE GLOVES!', 'GLUE GLOVES! LOCK YOUR BALL UP!', '{NAME} GRABS THE GLUE GLOVES!'],
  pu_laser: ['LASER SIGHT! {NAME} CAN SEE THE FUTURE, AND IT\'S A BUCKET!', 'LOCKED ON! {NAME} HAS THE LASER!', 'LASER SIGHT! TARGET ACQUIRED!', 'PEW PEW! {NAME} CAN\'T MISS!'],
  pu_moon: ['MOON SHOES! GRAVITY HAS LEFT THE BUILDING!', 'BOING! {NAME} HAS MOON SHOES!', 'MOON SHOES! {NAME} WILL TOUCH THE SKY!', 'ONE SMALL STEP, ONE GIANT DUNK!'],
  pu_bomb: ['BLAM BOMB! EVERYBODY DUCK!', '{NAME} HAS THE BLAM BOMB! UH OH!', 'BLAM BOMB! THE NEXT SHOVE IS A NUKE!', 'TICK TICK! {NAME} IS ARMED!'],
  pu_gold: ['GOLD BALL! NEXT BUCKET\'S WORTH DOUBLE!', 'GOLDEN! {TEAM} SCORES DOUBLE NEXT!', 'GOLD BALL! SHINY AND VALUABLE!', 'DOUBLE POINTS ON THE LINE!'],
  bombHit: ['KA-BOOM! THE BLAM BOMB GOES OFF!', 'SHOCKWAVE! EVERYBODY IS DOWN!', 'THE BOMB! {NAME} CLEARED THE COURT!', 'BLAM BOMB DETONATED!'],
  taunt: ['{NAME} IS TALKING TRASH!', 'OH, {NAME} IS SHOWING OFF!', 'LISTEN TO {NAME} GO!', 'THE TAUNT! DISRESPECTFUL!']
};


/* ==== 06-data-moves.js ==== */
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


/* ==== 08-data-about.js ==== */
/* 08-data-about: the About/Credits pages (one topic a page) and the SECRETS page unlocked by finishing the Tour. The same
 * Source Information, Testing, Engine and Prompt Feedback are in the build's final report and exit-interview.json. */
const ABOUT_PAGES = [
  ['CREDITS', [
    'BASHKETBALL: an original over-the-top arcade basketball game. No fouls. No mercy. All BLAM.',
    'GAME, CODE, ART, ANIMATION, MUSIC, SOUND AND VOICES: built by Claude (Anthropic, model claude-opus-5-5, reasoning effort xhigh) in Claude Code, from the build plan PLAN.md (written by claude-opus-5-5 at max effort).',
    'ENGINE: my-3D2dge v0.85.2 by Michael Crosato (MIT License), github.com/michaelcrosato/my-3d2dge, with the changes listed on the ENGINE CHANGES page.',
    'ONLINE: AI Hub Session Protocol v1, session client 1.4.0, github.com/michaelcrosato/ai-hub.',
    'EVERY SOUND, SONG AND VOICE IS MADE IN CODE: chip-synth songs and stings, synthesized effects, and Animalese-style gibberish voices from formant filters. No audio files.',
    'EVERY PICTURE IS DRAWN BY CODE: procedural rigs, painted court floors, string sprites and prop shapes. No image files.',
    'Thanks for playing. Remember: the backboard is 40% less shattery now.'
  ]],
  ['SOURCE INFORMATION', [
    'DATE: 2026-11-04 06:09:01',
    'SOURCE: Basketball, in the over-the-top arcade style (genre inspiration; an original game with its own teams, courts and story).',
    'PLAN: PLAN.md',
    'TITLE: BASHKETBALL. As TASK.md asks, fifty playful riffs on "basketball" were brainstormed in the build session and one was picked with a real random number generator: Python secrets.randbelow(50) returned 3, BASHKETBALL (tools/title-pick.py; TITLE-PICK.txt). The plan had picked BASKETBLAM at its own stage; where the plan and TASK.md disagree TASK.md wins, so the game took the new name, and BLAM lives on as the league\'s brand (the Blam Tour, Blam Camp, the Blam Dome, the Hall of Blam).',
    'GENRE AND PERSPECTIVE: Arcade sports, 2-on-2 basketball with a short story ladder. A side-on broadcast camera (custom orthographic view, pitch 30), with a dunk cam; an optional High camera (the engine\'s three-quarter view).',
    'TECH: my-3D2dge v0.85.2 (full engine, modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio. Built and tested with Node 24, Playwright 1.63 (Chromium) and Python http.server.',
    'ART DIRECTION: The engine\'s native HD pixel style pushed to a 90s arcade broadcast: textured court floors, three-tier crowds, angled glass backboards, neon and lighting, comic banners.',
    'ANIMATION: The engine\'s procedural Humanoid rigs, with a basketball pose layer (two-bone IK hands) for dribbling, shooting, 12 dunks, hanging on the rim, steals, shoves, blocks, celebrations and taunts.',
    'AUDIO: 12 code-written songs with dynamic layers, 8 stings, about 60 synthesized effects, a crowd ambience bed, and formant-synthesized gibberish voices for 23 speakers.',
    'ONLINE: AI Hub shared-world sessions for 1-4 players (host-authoritative, snapshots and input messages), plus 1-4 players on one machine.',
    'TESTING: One command (node tests/run.mjs) over 17 suites and about 2,400 checks: headless Node runs driving game.advance and game.debug (content, physics, rules, mechanics, AI soaks on every court, flow, a scripted playthrough of the whole Tour, all ten Blam Camp lessons, three attract loops, dev mode, UI, audio, a fake-hub network), the bundle, Playwright Chromium (every deep link, an audio smoke test, a screenshot set) and the AI Hub harness\'s four scenarios on a 127.0.0.1 port-0 server. Then browser scripts on the shipped page with real keys and clicks: Dev Mode from the pause menu (a slider changes run speed live, RESET ALL), 10 s idle into attract and a key out, Camera High and Xbox symbols through Settings, the output measured and recorded; and the harness driven by hand (Ready, Start now, a client moving its player, Remove player, Time up). No subagents.',
    'RESEARCH: None beyond the engine handoff documentation and the AI Hub protocol README.',
    'ENVIRONMENT: Claude Code CLI (headless); Linux; browser unknown.',
    'MODEL: Anthropic, claude-opus-5-5, reasoning effort xhigh.',
    'USAGE: unknown cost and token count (not visible inside the session); session time about 2 hours 50 minutes (06:09 to about 09:00).'
  ]],
  ['TESTING FEEDBACK', [
    'HOW MANY ISSUES DID TESTING CATCH? About 35: 17 found by the headless suites (physics, rules, mechanics, the Tour playthrough, Blam Camp, the attract mode, audio, content), 4 by the CPU soaks and their stats, 2 by the browser console, 11 by reviewing screenshots, and 1 by driving the AI Hub harness by hand.',
    'HOW MANY WERE CRITICAL OR GAME-BREAKING? 8: online, the other players\x27 seats were played by the CPU instead of their owners (the hand-off ran on a timer that the scene change cleared; the fake-hub suite now checks that a client\x27s keys move its player on the host); a human inbounder could hang the game forever; the event bus overwrote the events\' own id field (every power-up event threw); the settings\' apply functions crashed at boot; Blam Camp could not chain lessons; a lesson step completed twice and crashed; two lessons could never be finished; and Dev Mode never opened from its deep link.',
    'MOST HELPFUL TEST: the scripted playthrough of the whole Tour (a bot playing the human seat through the real inputs, from the prologue through a lost stop, the rematch, the final, the ending, credits, unlocks and the Hall of Blam, then CONTINUE TOUR after a reload). It found the inbound hang nothing else would have.',
    'LEAST HELPFUL TEST: the determinism proof. The engine\'s exact fixed step made it pass the first time and it never failed again; the AI soaks that measured scoring and dunk rates taught far more.'
  ]],
  ['ENGINE FEEDBACK', [
    'WHAT I LIKED MOST: headless play with exact fixed steps. game.advance ran whole matches, the whole Tour and every camp lesson in Node at about fifty times real speed, so balance and flow could be measured, not guessed. Close behind: rigs that pose themselves, and floors painted by a function.',
    'DID I GET STUCK OR GUESS WRONG? A few times: game.after timers are cleared by a scene change (Dev Mode did not open); the rig\'s joint frame had to be read from solvePose before hand IK lined up; the pixel font has no middle dot, left triangle or check mark (they drew as ?); the pause and settings screens are sized in CSS pixels, tiny on a TV; and a 30-degree side view at 240 pixels tall left no room for four tiers of stands and a sky.',
    'THE MOST IMPORTANT THING I BUILT: the basketball itself: a decide-then-fly shot model over real rim, backboard, net and floor physics (substepped so nothing tunnels), and a pose layer over the rig (two-bone IK hands) that dribbles the actual ball, shoots, dunks twelve ways and hangs on the rim.',
    'THE HARDEST PART: making the procedural Humanoid hold, dribble and slam a ball convincingly in every build, and sorting the hoop in depth (the rim and net in back and front halves, the glass cheated 30 degrees toward the camera) in an orthographic side view.',
    'WHAT I CHANGED IN THE ENGINE: shorts and socks on the Humanoid; afro, flattop and mohawk hair; Dialog voice as a per-letter function; public sfx and music buses; a build label for this copy (details on the ENGINE CHANGES page). No engine bugs needed fixing.',
    'ONE THING I WOULD CHANGE: a ten-foot mode for the HTML Shell (pause, settings, controls) that scales with the screen. Here it is scaled with CSS zoom from the game.'
  ]],
  ['PROMPT FEEDBACK', [
    'WHAT I LIKED MOST: a definition of done that can be checked line by line, and a plan with a starting number for everything (geometry, tuning, difficulty tables, line samples), which turned design debates into slider tuning.',
    'WHAT WAS CONFUSING: the plan carries another run\'s names and dates (it says to use TASK.md\'s, which worked); the title is to be picked by a random number generator, but the plan had already picked one and said not to re-pick (TASK.md wins, so I re-picked in the build session and renamed the game late); and Usage asks for a cost and token count that the agent cannot see from inside the session.',
    'THE HARDEST THING: the breadth in one session: five courts with twists, eighteen players, twelve dunks, a story, ten lessons, an attract mode, dev mode and online play, each with tests, while balancing the CPU so scores land at 30-60 a team with about a third of baskets dunks.',
    'WHAT I WOULD CHANGE: mark the plan\'s must-haves apart from its nice-to-haves, say that HTML menus must scale for a TV too, and have the harness fill in Usage.'
  ]],
  ['ENGINE CHANGES', [
    'SHORTS ON HUMANOID: a shorts option ({ len, sock, sockLen }) draws the thigh in the shorts color down to a hem in the trim color, bare legs below and socks at the ankle, in the HD and classic styles. Basketball players do not wear trousers.',
    'HAIR STYLES: afro, flattop and mohawk, beside spiky, in the HD head (and so in portraits). The cast needed them.',
    'DIALOG VOICE AS A FUNCTION: E.Dialog\'s voice may be a function (letter, index, pageText) called for each letter typed, so the gibberish voice speaks a line as it types.',
    'PUBLIC AUDIO BUSES: audio.sfxBus and audio.musicBus getters, so the voices and the crowd ambience made outside sfx() follow the volume settings.',
    'BUILD LABEL: E.build names this copy (bashketball 2026-11-04) in place of the engine repo\'s unstamped value.'
  ]]
];
const SECRETS_TEXT = [
  'CHEAT CODES: enter them on the TONIGHT\'S MATCHUP card. Each lasts one game; any code but TOURNAMENT MODE marks the game with a star (no Hall of Blam).',
  'BIG HEADS: UP, UP, TURBO, PASS',
  'POWER-UPS ON: SHOOT, SHOOT, PASS, TURBO',
  'INFINITE TURBO: TURBO, TURBO, TURBO, UP, UP',
  'NO TWISTS: DOWN, DOWN, SHOVE',
  'SKY DUNKS: OOP, OOP, UP, SHOOT',
  'MOON GRAVITY: UP, OOP, UP, OOP',
  'TOURNAMENT MODE: DOWN, LEFT, RIGHT, DOWN (no power-ups, twists or comeback assist)',
  'UNLOCKED: THE BLAMBOTS and the CHANNEL BLAM ALL-STARS in Exhibition, and the Big heads setting in Options.'
];


/* ==== 10-audio-music.js ==== */
/* 10-audio-music: twelve songs and eight stings, written in code for the engine's synth (PLAN 12.1). Layers are tracks
 * that start silent (on: false) and come in with audio.layer: 'hype' on the title, 'nova' during a Supernova, the Dome's
 * 'overclock' and 'clutch'. Tracks of different lengths phase against each other. */
const DR = { basic: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |', four: 'k . h . s . h . k . h k s . h . |' };
const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .22, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'stabs', wave: 'saw', vol: .06, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic },
    { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }] },
  menu: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: DR.basic },
    { name: 'keys', wave: 'triangle', vol: .06, notes: 'G4 . . . B4 . . . E5 . . . . . . . | A4 . . . C5 . . . E5 . . . D5 . . . |' }] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .22, notes: 'A1 . A2 . . A1 . A2 C2 . C3 . . G1 . G2 | F1 . F2 . . F1 . F2 E1 . E2 . G1 . G2 . |' },
    { name: 'arp', wave: 'pulse', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 | F4 A4 C5 F5 C5 A4 F4 A4 E4 G#4 B4 E5 B4 G#4 E4 G#4 |' },
    { name: 'lead', wave: 'saw', vol: .045, notes: 'A5 - - . G5 - E5 - . . C5 D5 E5 - . . | F5 - - . E5 - D5 - E5 - - - . . . . | A5 - - . G5 - E5 - . . C5 D5 E5 - G5 - | A5 - G5 - E5 - D5 - C5 - - - . . . . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'A6 E6 C6 E6 A6 E6 C6 E6 B6 E6 C6 E6 C7 E6 B6 E6 |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'D2 . D2 A2 . D2 . A2 G2 . G2 D3 . G2 . D3 | A2 . A2 E3 . A2 . E3 G2 . F#2 . E2 . A2 . |' },
    { name: 'lead', wave: 'pulse', vol: .065, notes: 'F#5 - A5 - F#5 . E5 D5 . . B4 - D5 - . . | E5 - G5 - E5 . D5 C#5 . . A4 - B4 - C#5 - | F#5 - A5 - B5 . A5 F#5 . . D5 - E5 - F#5 - | G5 - F#5 - E5 - D5 - C#5 - D5 - - - . . |' },
    { name: 'stabs', wave: 'square', vol: .035, notes: '. . D4 . . . F#4 . . . G4 . . . B4 . | . . A4 . . . C#5 . . . G4 . . . A4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h . k k h . s . h o |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'D6 A5 F#5 A5 D6 A5 F#5 A5 E6 A5 G5 A5 F#6 A5 E6 A5 |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .16, notes: 'C2 . . C2 . . Eb2 . F2 . . F2 G2 . Eb2 . | C2 . . C2 . . Bb1 . Ab1 . . Ab1 G1 . . . |' },
    { name: 'lead', wave: 'square', vol: .05, notes: 'G4 - . Eb4 - . C4 . . . Bb3 C4 Eb4 - . . | F4 - . Eb4 - . C4 . Bb3 - . . G3 - . . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . h s . . k k . k h s . h . |' },
    { name: 'metal', wave: 'drums', vol: .07, notes: '. . . . . . t . . . . . . t . t | . . . c . . t . . . . . . t t t |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'C6 G5 Eb5 G5 C6 G5 Eb5 G5 D6 G5 F5 G5 Eb6 G5 D6 G5 |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 . . G2 . D3 . . F2 . . F2 . C3 . . | Bb1 . . Bb1 . F2 . . D2 . . D2 . A2 . . |' },
    { name: 'marimba', wave: 'triangle', vol: .09, notes: 'G4 . Bb4 . D5 . G4 . F4 . A4 . C5 . F4 . | D5 . C5 . Bb4 . G4 . A4 . F4 . D4 . F4 . |' },
    { name: 'lead', wave: 'square', vol: .04, notes: 'D5 - - - C5 - Bb4 - G4 - - - . . . . | F5 - - - D5 - C5 - Bb4 - C5 - D5 - - - |' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . t . s t . t k . t . s t t t |' },
    { name: 'nova', wave: 'pulse12', vol: .05, on: false, notes: 'G6 D6 Bb5 D6 G6 D6 Bb5 D6 A6 D6 C6 D6 Bb6 D6 A6 D6 |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { name: 'power', wave: 'saw', vol: .06, notes: 'E3 - - - E3 - - - G3 - - - A3 - - - | C4 - - - B3 - - - A3 - G3 - E3 - - - |' },
    { name: 'fifth', wave: 'saw', vol: .045, notes: 'B3 - - - B3 - - - D4 - - - E4 - - - | G4 - - - F#4 - - - E4 - D4 - B3 - - - |' },
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 E2 E2 E2 E2 E2 E2 E2 G2 G2 G2 G2 A2 A2 A2 A2 | C3 C3 C3 C3 B2 B2 B2 B2 A2 A2 G2 G2 E2 E2 E2 E2 |' },
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'B4 - E5 - G5 - F#5 - E5 - - - D5 - B4 - | C5 - E5 - G5 - A5 - B5 - - - - - . . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . k k h . s . h . |' },
    { name: 'overclock', wave: 'pulse12', vol: .055, on: false, notes: 'E5 G5 B5 E6 B5 G5 E5 G5 F#5 A5 C6 F#6 C6 A5 F#5 A5 |' },
    { name: 'clutch', wave: 'drums', vol: .1, on: false, notes: 'k k h k s k h k k k h k s s s s |' },
    { name: 'nova', wave: 'pulse12', vol: .045, on: false, notes: 'E6 B5 G5 B5 E6 B5 G5 B5 F#6 B5 A5 B5 G6 B5 F#6 B5 |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { name: 'melody', wave: 'square', vol: .07, notes: 'Bb4 . D5 . F5 . D5 . Bb4 - C5 . D5 . Eb5 . | F5 . D5 . Bb4 . C5 . D5 - C5 . Bb4 - - . |' },
    { name: 'brass', wave: 'saw', vol: .03, notes: 'D4 - - - F4 - - - Eb4 - - - G4 - - - | F4 - - - D4 - - - F4 - - - D4 - - - |' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'Bb2 . F2 . Bb2 . F2 . Eb2 . Bb2 . F2 . C3 . | Bb2 . F2 . Eb2 . F2 . Bb2 . F2 . Bb2 . . . |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 's . s s s . s . s s s . s . s s |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'F2 . . F2 . C3 . . Bb2 . . Bb2 . F2 . . | C3 . . C3 . G2 . . F2 . . A2 . C3 . . |' },
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'A4 - C5 - D5 . C5 A4 . . G4 - F4 - . . | G4 - A4 - Bb4 . A4 G4 . . E4 - F4 - . . |' },
    { name: 'drums', wave: 'drums', vol: .09, notes: DR.four }] },
  story: { bpm: 84, steps: 4, tracks: [
    { name: 'drone', wave: 'triangle', vol: .12, notes: 'D3 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - | Bb2 - - - - - - - - - - - - - - - | A2 - - - - - - - - - - - - - - - |' },
    { name: 'pluck', wave: 'pulse', vol: .045, notes: 'D5 . . . F5 . . . . . A4 . . . . . | E5 . . . G5 . . . . . C#5 . . . . . |' },
    { name: 'villain', wave: 'square', vol: .045, on: false, notes: 'D4 - F4 - A4 - G#4 - A4 - - - . . . . | D4 - F4 - Bb4 - A4 - G4 - F4 - E4 - - - |' },
    { name: 'drums', wave: 'drums', vol: .06, notes: 'k . . . . . . . k . . . . . h . |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .055, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . G4 . C5 - - . . . . . |' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . G2 . G2 . B2 . C3 . G2 . C3 . . . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . k . h . s . h h |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G#2 . A2 . . B2 . A2 G#2 . | E2 . E3 . . E2 G#2 . C#3 . B2 . A2 . G#2 A2 |' },
    { name: 'lead', wave: 'pulse', vol: .07, notes: 'G#4 - - . A4 B4 . E5 - . . . . . . . | C#5 - - . B4 A4 . G#4 - . A4 . B4 - - . | E5 - - . D#5 C#5 . B4 - . G#4 . A4 - B4 . | C#5 - B4 - A4 - G#4 - E4 - - - . . . . |' },
    { name: 'stabs', wave: 'saw', vol: .04, notes: '. . . . G#4 . . . . . . . B4 - . . | . . . . A4 . . . . . . . C#5 - E5 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: DR.basic }] }
};
const STINGS = {
  tip: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'E5 G5 B5 E6 - - . .' }, { wave: 'drums', vol: .1, notes: 'k . . . c . . .' }] },
  nova: { bpm: 150, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - . .' }, { wave: 'pulse', vol: .06, notes: 'G4 - C5 - E5 - G5 - - - . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k s c . . . . .' }] },
  shatter: { bpm: 140, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'C6 B5 Bb5 A5 Ab5 G5 - - . .' }, { wave: 'drums', vol: .12, notes: 'c . c . k k k . . .' }] },
  victory: { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'E5 . E5 . E5 . C5 . E5 - G5 - - - G4 - - - . .' }, { wave: 'triangle', vol: .25, notes: 'C3 . C3 . C3 . A2 . C3 - E3 - - - G2 - - - . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k . s . k k s . c . . . . . . .' }] },
  defeat: { bpm: 90, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 - - . F#4 - - . F4 - - . E4 - - - - - . .' }, { wave: 'triangle', vol: .22, notes: 'C3 - - . B2 - - . Bb2 - - . A2 - - - - - . .' }] },
  unlock: { bpm: 150, steps: 4, tracks: [{ wave: 'pulse', vol: .09, notes: 'C5 E5 G5 C6 . G5 C6 E6 - - . .' }, { wave: 'triangle', vol: .2, notes: 'C3 . . . G3 . . . C4 - . .' }] },
  sponsor: { bpm: 140, steps: 4, tracks: [{ wave: 'triangle', vol: .12, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . G5 . C6 . A5 . G5 . E5 . C5 - - - |' }, { wave: 'square', vol: .05, notes: 'C4 . . . F4 . . . G4 . . . C4 . . . | C4 . . . F4 . . . G4 . . . C4 - - - |' }, { wave: 'drums', vol: .07, notes: 'k . h . s . h . k . h . s . h . |' }] },
  buzzer: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'A3 - - - - - - .' }, { wave: 'square', vol: .1, notes: 'Bb3 - - - - - - .' }] }
};
let musicNow = null;
/** play a song by name (from SONGS), crossfading; layers reset; null stops */
function playMusic(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  if (name === musicNow && !o.restart) return;
  musicNow = name;
  if (!name) { A.music(null); return; }
  const song = SONGS[name]; if (!song) return;
  A.music(song, { fade: o.fade === undefined ? .6 : o.fade });
  A.tempo(song.bpm);
  if (name === 'title') game.after(8 * 4 * 60 / song.bpm, () => { if (musicNow === 'title') A.layer('hype', 1, 1); });
}
function sting(name) { if (S.net && S.net.role === 'server') return; const s = STINGS[name]; if (s) try { A.sting(s, { at: 'now', duck: .35 }); } catch (e) { game.fail('sting ' + name, e); } }
function musicLayer(name, on) { if (!musicNow || !SONGS[musicNow] || !SONGS[musicNow].tracks.some(t => t.name === name)) return; try { A.layer(name, on ? 1 : 0, 1); } catch (e) { game.fail('layer ' + name, e); } }


/* ==== 11-audio-sfx.js ==== */
/* 11-audio-sfx: every sound effect, written as the engine's chip voices (no files): the ball on five floors, the hoop
 * (swish, rim, glass, slam, shatter), sneakers and bodies, the match (whistle, buzzer, shot clock, horn), the crowd's
 * swells, power-ups and twists, the robots, the menus. sfx() plays one through a policy: quieter the farther from the
 * camera's centre it happens. */
const SFX = {
  dribble_asphalt: [{ wave: 'sine', freq: 150, to: 60, dur: .07, vol: .35 }, { wave: 'noise', freq: 3200, dur: .03, vol: .12, filter: 'highpass' }],
  dribble_planks: [{ wave: 'sine', freq: 120, to: 70, dur: .09, vol: .35 }, { wave: 'noise', freq: 600, dur: .06, vol: .14, filter: 'bandpass', q: 3 }],
  dribble_concrete: [{ wave: 'sine', freq: 130, to: 55, dur: .07, vol: .38 }, { wave: 'noise', freq: 1200, dur: .03, vol: .08 }],
  dribble_stone: [{ wave: 'sine', freq: 160, to: 70, dur: .06, vol: .3 }, { wave: 'triangle', freq: 1400, to: 1100, dur: .03, vol: .08 }],
  dribble_maple: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .36 }, { wave: 'noise', freq: 2400, dur: .02, vol: .07, filter: 'highpass' }],
  bounce: { wave: 'sine', freq: 130, to: 60, dur: .08, vol: .3 },
  catch: [{ wave: 'noise', freq: 900, dur: .05, vol: .2, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 120, dur: .04, vol: .15 }],
  release: { wave: 'noise', freq: 1800, to: 3200, dur: .08, vol: .1, filter: 'bandpass' },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .28, filter: 'bandpass', q: .8 },
  rim: [{ wave: 'square', freq: 620, to: 560, dur: .12, vol: .14 }, { wave: 'triangle', freq: 1240, to: 1180, dur: .18, vol: .12 }, { wave: 'noise', freq: 4000, dur: .015, vol: .1, filter: 'highpass' }],
  backboard: [{ wave: 'triangle', freq: 160, to: 110, dur: .14, vol: .3 }, { wave: 'noise', freq: 500, dur: .08, vol: .16, filter: 'lowpass' }],
  net_snap: { wave: 'noise', freq: 3000, to: 1500, dur: .1, vol: .14, filter: 'bandpass' },
  slam: [{ wave: 'sine', freq: 80, to: 38, dur: .4, vol: .6 }, { wave: 'square', freq: 520, to: 400, dur: .14, vol: .14 }, { wave: 'noise', freq: 700, to: 200, dur: .35, vol: .25, filter: 'lowpass' }],
  shatter: [{ wave: 'noise', freq: 5000, to: 1800, dur: .55, vol: .4, filter: 'highpass' }, { wave: 'sine', freq: 4200, to: 2600, dur: .3, vol: .07, delay: .05 }, { wave: 'sine', freq: 5600, to: 3800, dur: .25, vol: .06, delay: .12 },
    { wave: 'sine', freq: 3100, to: 2200, dur: .3, vol: .06, delay: .2 }, { wave: 'sine', freq: 4800, to: 3000, dur: .2, vol: .05, delay: .3 }, { wave: 'sine', freq: 2600, dur: .25, vol: .05, delay: .42 }],
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .12, vib: [40, .03] },
  step: { wave: 'noise', freq: 400, dur: .03, vol: .05, filter: 'lowpass' },
  jump: { wave: 'noise', freq: 600, to: 1400, dur: .1, vol: .12, filter: 'bandpass' },
  land: { wave: 'sine', freq: 90, to: 50, dur: .08, vol: .25 },
  land_heavy: [{ wave: 'sine', freq: 70, to: 35, dur: .2, vol: .5 }, { wave: 'noise', freq: 300, dur: .15, vol: .2, filter: 'lowpass' }],
  turbo: { wave: 'noise', freq: 400, to: 700, dur: .25, vol: .08, filter: 'lowpass' },
  shove: [{ wave: 'noise', freq: 800, to: 300, dur: .12, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .12, vol: .4 }],
  fall: [{ wave: 'sine', freq: 100, to: 45, dur: .22, vol: .45 }, { wave: 'noise', freq: 600, dur: .18, vol: .15, filter: 'lowpass' }, { wave: 'square', freq: 300, to: 200, dur: .05, vol: .06, delay: .1 }],
  steal: [{ wave: 'noise', freq: 2400, to: 900, dur: .1, vol: .2 }, { wave: 'square', freq: 880, to: 1320, dur: .08, vol: .1, delay: .05 }],
  block: [{ wave: 'noise', freq: 1500, dur: .06, vol: .3, filter: 'bandpass' }, { wave: 'sine', freq: 110, to: 50, dur: .25, vol: .5 }],
  spin: { wave: 'noise', freq: 600, to: 2200, dur: .3, vol: .16, filter: 'bandpass', q: 2 },
  dizzy: { wave: 'square', freq: 1800, arp: [0, 4, 7, 4, 0, 4], step: .05, dur: .3, vol: .05 },
  whoosh: { wave: 'noise', freq: 900, to: 2600, dur: .12, vol: .12, filter: 'bandpass' },
  whistle: [{ wave: 'square', freq: 2300, dur: .32, vol: .1, vib: [32, .05] }, { wave: 'sine', freq: 2300, dur: .32, vol: .1, vib: [32, .05] }],
  buzzer: [{ wave: 'square', freq: 220, dur: .9, vol: .16, hold: true }, { wave: 'square', freq: 230, dur: .9, vol: .16, hold: true }],
  shotclock_beep: { wave: 'square', freq: 1600, dur: .07, vol: .09, hold: true },
  horn: [{ wave: 'saw', freq: 196, dur: .7, vol: .14, hold: true }, { wave: 'saw', freq: 247, dur: .7, vol: .1, hold: true }, { wave: 'saw', freq: 294, dur: .7, vol: .1, hold: true }],
  crowd_roar: { wave: 'noise', freq: 700, to: 1100, dur: 1.6, vol: .3, filter: 'bandpass', q: .6, attack: .15 },
  crowd_ooh: [{ wave: 'noise', freq: 500, to: 900, dur: .7, vol: .2, filter: 'bandpass', q: 3, attack: .15 }, { wave: 'noise', freq: 900, to: 600, dur: .7, vol: .12, filter: 'bandpass', q: 4, attack: .2 }],
  crowd_boo: { wave: 'noise', freq: 300, to: 220, dur: 1, vol: .22, filter: 'bandpass', q: 2.5, attack: .2 },
  camera_flash: [{ wave: 'noise', freq: 6000, dur: .02, vol: .05, filter: 'highpass' }, { wave: 'noise', freq: 6000, dur: .02, vol: .04, filter: 'highpass', delay: .07 }],
  pu_spawn: { wave: 'pulse', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .12 },
  pu_pick: [{ wave: 'square', freq: 'G5', arp: [0, 4, 7, 12, 16], step: .045, dur: .3, vol: .12 }, { wave: 'triangle', freq: 'G4', arp: [0, 7, 12], step: .06, dur: .3, vol: .12 }],
  pu_end: { wave: 'square', freq: 'C5', arp: [7, 4, 0], step: .07, dur: .22, vol: .08 },
  jackpot: [{ wave: 'square', freq: 'C6', arp: [0, 4, 7, 12, 7, 12, 16], step: .05, dur: .4, vol: .1 }, { wave: 'noise', freq: 7000, dur: .4, vol: .05, filter: 'highpass' }],
  nova_on: [{ wave: 'saw', freq: 200, to: 1600, dur: .6, vol: .14 }, { wave: 'noise', freq: 3000, to: 8000, dur: .6, vol: .1, filter: 'highpass' }],
  wind_gust: { wave: 'noise', freq: 400, to: 1300, dur: 2.2, vol: .2, filter: 'bandpass', q: 1.4, attack: .5 },
  gull: [{ wave: 'saw', freq: 1400, to: 900, dur: .14, vol: .07 }, { wave: 'saw', freq: 1500, to: 1000, dur: .12, vol: .06, delay: .18 }],
  bark: [{ wave: 'saw', freq: 420, to: 260, dur: .09, vol: .14 }, { wave: 'noise', freq: 800, dur: .08, vol: .1 }, { wave: 'saw', freq: 440, to: 280, dur: .09, vol: .12, delay: .16 }],
  oil_slip: [{ wave: 'sine', freq: 600, to: 200, dur: .3, vol: .2 }, { wave: 'noise', freq: 1200, to: 300, dur: .3, vol: .1 }],
  rumble: { wave: 'noise', freq: 120, to: 80, dur: 1.5, vol: .45, filter: 'lowpass', attack: .2 },
  bomb_hit: [{ wave: 'noise', freq: 900, to: 120, dur: .6, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .5, vol: .55 }, { wave: 'noise', freq: 3000, to: 600, dur: .25, vol: .15 }],
  bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: .9, vol: .1 },
  vent_puff: { wave: 'noise', freq: 2500, to: 900, dur: .6, vol: .18, filter: 'bandpass', attack: .05 },
  pyro: [{ wave: 'noise', freq: 400, to: 120, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 3000, dur: .3, vol: .08, filter: 'highpass' }],
  servo: { wave: 'saw', freq: 300, to: 500, dur: .3, vol: .1, vib: [18, .04] },
  reboot: { wave: 'square', freq: 900, arp: [0, -3, -7, -12, -15, -19], step: .07, dur: .45, vol: .1 },
  select: { wave: 'square', freq: 880, dur: .04, vol: .08 },
  confirm: [{ wave: 'square', freq: 'C6', arp: [0, 7], step: .05, dur: .12, vol: .1 }],
  cancel: { wave: 'square', freq: 440, to: 300, dur: .08, vol: .08 },
  code_ok: [{ wave: 'triangle', freq: 'E6', arp: [0, 4, 7, 12], step: .06, dur: .35, vol: .14 }, { wave: 'pulse', freq: 'E5', dur: .35, vol: .06 }],
  stamp: [{ wave: 'sine', freq: 90, to: 45, dur: .2, vol: .5 }, { wave: 'noise', freq: 900, dur: .1, vol: .2 }],
  taunt: { wave: 'square', freq: 660, arp: [0, 5, 0, 7], step: .07, dur: .28, vol: .06 },
  tick: { wave: 'square', freq: 1200, dur: .02, vol: .05 }
};
for (const k in SFX) A.define(k, SFX[k]);
/** play a sound: o { vol, pitch, at: a world point (quieter far from the camera) } */
function sfx(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  let vol = o.vol === undefined ? 1 : o.vol;
  if (o.at && game.cam) { const d = Math.abs((o.at.x || 0) - (game.cam.x || CMX)); vol *= clamp(1.2 - d / 500, .25, 1); }
  try { A.sfx(name, { vol, pitch: o.pitch }); } catch (e) { game.fail('sfx ' + name, e); }
}


/* ==== 12-audio-voice.js ==== */
/* 12-audio-voice: Animalese/Simlish-style gibberish (PLAN 12.3). Text becomes syllables (a consonant cluster and a
 * vowel); each syllable is an oscillator at the speaker's pitch through two band-pass filters at the vowel's formants,
 * with a short noise burst for its consonant. Pitch drifts down a line, rises at "?", jumps at "!", and steps by a hash
 * of the text, so a line always sounds the same. Robots ring-modulate and quantize; the gorilla growls. The announcer
 * picks lines from the banks (05-data-lines) and shows them as lower-third captions while the voice speaks them; the
 * crowd is a looping noise bed whose level follows the game's excitement. */
const VOICE_PROFILES = {
  vinnie: { hz: 110, wave: 'sawtooth', rate: 14, fs: .92, punch: 1.2 }, deedee: { hz: 232, wave: 'square', rate: 15, fs: 1.18 },
  gigawatt: { hz: 140, wave: 'sawtooth', rate: 9, fs: 1.3, nasal: true, slide: true }, roscoe: { hz: 125, wave: 'square', rate: 12, fs: 1 },
  intern1: { hz: 160, wave: 'square', rate: 13, fs: 1.05 }, intern2: { hz: 210, wave: 'square', rate: 13, fs: 1.12 },
  volt: { hz: 220, wave: 'square', rate: 16, fs: 1.1 }, bigrumble: { hz: 85, wave: 'sawtooth', rate: 9, fs: .8 }, pixel: { hz: 270, wave: 'square', rate: 17, fs: 1.25 },
  riptide: { hz: 170, wave: 'sawtooth', rate: 10, fs: .95, slide: true }, shellshock: { hz: 200, wave: 'square', rate: 13, fs: 1.1, sing: true }, longboard: { hz: 120, wave: 'sawtooth', rate: 9, fs: .9 },
  torque: { hz: 95, wave: 'sawtooth', rate: 11, fs: .85, growl: .25 }, sparkplug: { hz: 300, wave: 'square', rate: 18, fs: 1.3 }, hubcap: { hz: 130, wave: 'sawtooth', rate: 10, fs: .95 },
  obsidian: { hz: 78, wave: 'sawtooth', rate: 8, fs: .78 }, ember: { hz: 230, wave: 'square', rate: 14, fs: 1.15 }, pumice: { hz: 190, wave: 'square', rate: 15, fs: 1.05, sing: true },
  dunkatron: { hz: 95, wave: 'square', rate: 10, fs: .9, robot: true }, swatbot: { hz: 120, wave: 'square', rate: 10, fs: .95, robot: true }, spareparts: { hz: 150, wave: 'square', rate: 12, fs: 1, robot: true, glitch: true },
  blammo: { hz: 66, wave: 'sawtooth', rate: 7, fs: .7, growl: .6 }, crowd: { hz: 180, wave: 'sawtooth', rate: 6, fs: 1, copies: 6 }
};
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const isVowel = ch => 'AEIOUY'.includes(ch);
/** the syllables of a line for a profile: [{ t, dur, f, v, c, loud }] (computed headless too: tests read it) */
function planSyllables(text, prof) {
  const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof;
  const up = String(text).toUpperCase(), out = []; let h = 2166136261; for (let i = 0; i < up.length; i++) h = Math.imul(h ^ up.charCodeAt(i), 16777619);
  const rnd = E.rng(h >>> 0), per = 1 / P.rate;
  // sentence chunks keep their ending mark for the contour
  const chunks = up.match(/[^.!?]+[.!?]*/g) || [up];
  let t = 0, total = 0; for (const ch of up) if (isVowel(ch)) total++;
  let n = 0;
  for (const chunk of chunks) {
    const mark = /!/.test(chunk) ? '!' : /\?/.test(chunk) ? '?' : '.', sylls = [];
    let cons = '';
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (/[A-Z]/.test(ch)) { if (isVowel(ch)) { if (!(i > 0 && isVowel(chunk[i - 1]))) sylls.push({ c: cons, v: ch.toLowerCase(), gap: 0 }); cons = ''; } else cons += ch; }
      else if (ch === ' ') { if (sylls.length) sylls[sylls.length - 1].gap = Math.max(sylls[sylls.length - 1].gap, .045); cons = ''; }
      else if (/[,.;:!?\-]/.test(ch)) { if (sylls.length) sylls[sylls.length - 1].gap = .14; cons = ''; }
    }
    sylls.forEach((s, k) => {
      const prog = total ? n / total : 0, last = k >= sylls.length - 2;
      let st = -2.2 * prog + (rnd() - .5) * 4 + (mark === '!' ? 4 : 0) + (mark === '?' && last ? 3 + k - sylls.length + 2 : 0) + (P.sing ? Math.sin(n * 1.3) * 3 : 0);
      if (P.robot) st = Math.round(st / 2) * 2;
      const dur = clamp(per * (.75 + rnd() * .4) * (last && mark !== '.' ? 1.3 : 1), .055, .2);
      out.push({ t, dur, f: P.hz * Math.pow(2, st / 12), v: s.v, c: s.c.slice(-2), loud: mark === '!' ? 1.25 : 1 });
      t += dur + s.gap * (P.robot ? 1.5 : 1); n++;
    });
  }
  return out;
}
const Voice = {
  bus: null, noise: null, speaking: 0,
  _ctx() { const c = A.ctx; if (!c || c.state !== 'running' || !A.sfxBus) return null; if (!this.bus) { this.bus = c.createGain(); this.bus.connect(A.sfxBus); const L = c.sampleRate, b = c.createBuffer(1, L, L), d = b.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1; this.noise = b; } this.bus.gain.value = game.settings.voiceVol === undefined ? .8 : game.settings.voiceVol; return c; },
  /** one syllable at time t0 (seconds of the audio clock) */
  _syl(c, s, P, t0, vol = .2) {
    if (P.robot) vol *= 1.7;   // (ring modulation halves a robot's level)
    const fm = FORMANTS[s.v] || FORMANTS.a, fs = P.fs || 1, end = t0 + s.dur;
    const osc = c.createOscillator(); osc.type = P.wave || 'square'; osc.frequency.setValueAtTime(s.f, t0); if (P.slide) osc.frequency.linearRampToValueAtTime(s.f * .88, end);
    const env = c.createGain(); env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(vol * s.loud, t0 + .012); env.gain.setValueAtTime(vol * s.loud, end - .025); env.gain.linearRampToValueAtTime(0, end);
    let src = osc;
    if (P.robot) { const rm = c.createGain(), lfo = c.createOscillator(); rm.gain.value = 0; lfo.frequency.value = P.glitch ? 30 + Math.random() * 60 : 50; lfo.connect(rm.gain); osc.connect(rm); src = rm; lfo.start(t0); lfo.stop(end + .02); }
    for (const [k, F] of [[0, fm[0]], [1, fm[1]]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F * fs * (P.nasal && k ? 1.25 : 1); bp.Q.value = P.nasal ? 12 : 6 + k * 2; src.connect(bp); bp.connect(env); }
    const dry = c.createGain(); dry.gain.value = .12; src.connect(dry); dry.connect(env);
    env.connect(this.bus); osc.start(t0); osc.stop(end + .02);
    if (P.growl) { const ns = c.createBufferSource(); ns.buffer = this.noise; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = c.createGain(); g.gain.setValueAtTime(vol * P.growl, t0); g.gain.linearRampToValueAtTime(0, end); ns.connect(lp); lp.connect(g); g.connect(this.bus); ns.start(t0, Math.random() * .5); ns.stop(end + .02); }
    const ch = s.c[s.c.length - 1];
    if (ch) {   // the consonant: a short burst before the vowel
      const ns = c.createBufferSource(); ns.buffer = this.noise; const f = c.createBiquadFilter(), g = c.createGain(), hiss = 'SFZCXJ'.includes(ch), thump = 'BDGMNVW'.includes(ch);
      f.type = hiss ? 'highpass' : thump ? 'lowpass' : 'bandpass'; f.frequency.value = hiss ? 4200 : thump ? 320 : 2600; g.gain.setValueAtTime(vol * (hiss ? .5 : .7), t0); g.gain.exponentialRampToValueAtTime(.001, t0 + (hiss ? .03 : .022));
      ns.connect(f); f.connect(g); g.connect(this.bus); ns.start(t0, Math.random() * .5); ns.stop(t0 + .04);
    }
  },
  /** speak a line; returns its length in seconds (the plan is made even without sound) */
  say(text, prof, o = {}) {
    const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof, plan = planSyllables(text, P), len = plan.length ? plan[plan.length - 1].t + plan[plan.length - 1].dur : .3;
    this.last = { text, plan, len };
    const c = this._ctx();
    if (c) {
      const t0 = c.currentTime + .02, copies = P.copies || 1;
      for (let k = 0; k < copies; k++) for (const s of plan) this._syl(c, copies > 1 ? Object.assign({}, s, { f: s.f * (1 + (k - copies / 2) * .03) }) : s, P, t0 + s.t + k * .012, (o.vol || .32) / Math.sqrt(copies));
      this.speaking = Math.max(this.speaking, len); dipMusic(len);
    }
    if (o.onEnd) game.after(len + .1, o.onEnd);
    return len;
  },
  /** a Dialog's voice: a syllable for each vowel group as it types */
  letter(ch, i, page, prof) {
    if (!isVowel(String(ch).toUpperCase()) || (i > 0 && isVowel(String(page[i - 1]).toUpperCase()))) return;
    const P = typeof prof === 'string' ? VOICE_PROFILES[prof] || VOICE_PROFILES.vinnie : prof, c = this._ctx(); if (!c) return;
    const k = page.length ? i / page.length : 0, bang = /!/.test(page), q = /\?/.test(page.slice(Math.max(0, i - 4), i + 6));
    let st = -2 * k + ((i * 7919) % 5 - 2) + (bang ? 3 : 0) + (q ? 3 : 0); if (P.robot) st = Math.round(st / 2) * 2;
    this._syl(c, { f: P.hz * Math.pow(2, st / 12), v: String(ch).toLowerCase(), c: String(page[i - 1] || '').toUpperCase(), dur: clamp(1 / P.rate, .06, .14), loud: bang ? 1.15 : 1 }, P, c.currentTime + .005, .3);
    dipMusic(.15);
  }
};
let dipUntil = 0;
function dipMusic(len) { const c = A.ctx; if (!c || !A.musicBus) return; dipUntil = Math.max(dipUntil, c.currentTime + len); A.musicBus.gain.setTargetAtTime(A.musicVolume * .75 * (A.ducked ? .35 : 1), c.currentTime, .05); }
function voiceTick() { const c = A.ctx; if (c && A.musicBus && dipUntil && c.currentTime > dipUntil) { dipUntil = 0; A.applyVolume(); } }

/* ---- the announcer: lines by event, alternating VINNIE and DEE DEE, as lower-third captions ---- */
const ANN = { cap: null, queue: [], recent: [], cool: {}, turn: 0, possN: 0, poss: -1 };
/** say a line from a bank: vars { NAME, VICTIM, TEAM }; o { speaker, force } */
function announce(bank, vars = {}, o = {}) {
  const mode = game.settings.commentary || 'full', rank = LINE_RANK[bank] || 1;
  if (mode === 'off' && !o.force) return null;
  if (mode === 'big' && rank < 4 && !o.force) return null;
  const now = game.real; if (ANN.cool[bank] > now && !o.force) return null;
  const M = S.match; if (M && M.poss !== ANN.poss) { ANN.poss = M.poss; ANN.possN = 0; }
  if (ANN.possN >= 2 && rank < 4 && !o.force) return null;
  if (ANN.cap && ANN.cap.until > now && ANN.cap.rank > rank && !o.force) return null;   // a bigger play is still on
  const bankLines = LINES[bank]; if (!bankLines) return null;
  const fresh = bankLines.filter(l => !ANN.recent.includes(l)), line = pickF(fresh.length ? fresh : bankLines);
  ANN.recent.push(line); if (ANN.recent.length > 8) ANN.recent.shift();
  ANN.cool[bank] = now + (rank >= 4 ? 1 : 4); ANN.possN++;
  const speaker = o.speaker || (ANN.turn++ % 2 ? 'deedee' : 'vinnie'), text = fill(line, vars);
  return caption(speaker, text, rank);
}
/** a caption with its voice (non-modal; shoot and pass never skip it) */
function caption(speaker, text, rank = 1, o = {}) {
  const len = Voice.say(text, CAST[speaker] ? CAST[speaker].voice : (get('player', speaker) ? get('player', speaker).voice : speaker));
  ANN.cap = { speaker, text, rank, at: game.real, until: game.real + Math.max(2.2, len + 1.2), name: o.name || (CAST[speaker] ? CAST[speaker].name : get('player', speaker) ? get('player', speaker).name : speaker.toUpperCase()) };
  return ANN.cap;
}
/** a player's bark over its head, in its own voice */
const BARKS = [];
function bark(p, text) { if (!p || !text) return; Voice.say(text, p.def.voice, { vol: .16 }); BARKS.push({ p, text, t: 1.6 }); if (BARKS.length > 3) BARKS.shift(); }

/* ---- the crowd's ambience: a looping noise bed through a band-pass, its level and brightness by excitement ---- */
const CROWD = { src: null, gain: null, bp: null, ex: .3, target: .3 };
function crowdStart() {
  const c = A.ctx; if (!c || c.state !== 'running' || !A.sfxBus || CROWD.src) return;
  const L = c.sampleRate * 2, buf = c.createBuffer(1, L, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < L; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * .1848) * .18; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = .7; const g = c.createGain(); g.gain.value = 0;
  src.connect(bp); bp.connect(g); g.connect(A.sfxBus); src.start(); Object.assign(CROWD, { src, gain: g, bp });
}
function crowdStop() { if (CROWD.src) { try { CROWD.src.stop(); } catch (e) { /* already stopped */ } CROWD.src = null; } }
function crowdTick(dt, on) {
  voiceTick();
  if (!on) { if (CROWD.gain) CROWD.gain.gain.value = approach(CROWD.gain.gain.value, 0, dt); return; }
  if (!CROWD.src) crowdStart(); if (!CROWD.gain) return;
  const M = S.match; let ex = .25;
  if (M) { const close = Math.abs(M.score[0] - M.score[1]) <= 6; if (M.quarter >= M.quarters) ex += .2; if (close) ex += .1; if (S.players.some(p => p.isNova())) ex += .2; }
  ex += ARENA.cheer * .4; CROWD.ex = approach(CROWD.ex, clamp(ex, 0, 1.2), dt * .8);
  // the home crowd chants DE-FENSE in the last minute of a close game while its team defends
  if (M && M.phase === 'live' && M.quarter >= M.quarters && M.clock < 60 && Math.abs(M.score[0] - M.score[1]) <= 8 && M.poss === 1 && game.real > (CROWD.chantAt || 0)) { CROWD.chantAt = game.real + 6; Voice.say('DE-FENSE! DE-FENSE!', 'crowd', { vol: .1 }); }
  const t = game.real; CROWD.gain.gain.value = (.12 + CROWD.ex * .22) * (1 + .1 * Math.sin(t * .7));
  CROWD.bp.frequency.value = 450 + CROWD.ex * 700;
}


/* ==== 20-court-build.js ==== */
/* 20-court-build: the arena TileMap (48 x 25 tiles: stands of three tiers north of the court, aprons around it), the
 * floor painters (asphalt, planks, concrete, basalt, maple) with analytic court lines and the team logo, and the new
 * prop shapes (data, per docs/ASSETS.md). Maps are built once per court and kept. */
const ARENA_ROWS = (() => {
  const rows = [];
  for (let r = 0; r < MAP_H; r++) {
    let s = '';
    for (let c = 0; c < MAP_W; c++) {
      if (r <= 2 && c >= 2 && c <= 45) s += String(r + 1);   // tiers 1 (back, tallest) .. 3 (front)
      else s += '.';
    }
    rows.push(s);
  }
  return rows;
})();

/** what a court-local point is: 'line', 'paint' (the key), 'circle' (centre circle fill), 'court' or 'apron' */
function courtMark(lx, ly) {
  const LW = 1.6;
  if (lx < -LW || lx > CW + LW || ly < -LW || ly > CH + LW) return 'apron';
  if (lx < LW || lx > CW - LW || ly < LW || ly > CH - LW) return 'line';
  if (Math.abs(lx - CW / 2) < LW * .7) return 'line';
  const dc = Math.hypot(lx - CW / 2, ly - CH / 2);
  if (Math.abs(dc - 40) < LW * .8) return 'line';
  for (const side of [-1, 1]) {
    const bx = side < 0 ? lx : CW - lx, rx = 52, ry = CH / 2;
    // the key: baseline to x 152, y 96..192, its free-throw circle r 48
    const inKey = bx >= 0 && bx <= 152 && ly >= 96 && ly <= 192;
    if (inKey && (Math.abs(ly - 96) < LW * .8 || Math.abs(ly - 192) < LW * .8 || Math.abs(bx - 152) < LW * .8)) return 'line';
    const dft = Math.hypot(bx - 152, ly - ry);
    if (bx >= 152 && Math.abs(dft - 48) < LW * .8) return 'line';
    if (bx < 152 && Math.abs(dft - 48) < LW * .7 && (Math.floor(Math.atan2(ly - ry, bx - 152) * 6) % 2 === 0)) return 'line';   // the dashed half inside the key
    // the three-point line: corner straights at y 20 / 268 to x 108, then the arc r 136 about the rim
    const dr = Math.hypot(bx - rx, ly - ry);
    if (bx <= CORNER_X && (Math.abs(ly - CORNER_Y) < LW * .8 || Math.abs(ly - (CH - CORNER_Y)) < LW * .8)) return 'line';
    if (bx > CORNER_X - 2 && Math.abs(dr - THREE_R) < LW * .8 && ly > CORNER_Y - 1 && ly < CH - CORNER_Y + 1) return 'line';
    // the restricted arc under the rim
    if (bx > rx && Math.abs(dr - 22) < LW * .6) return 'line';
    if (inKey) return 'paint';
  }
  if (dc < 40) return 'circle';
  return 'court';
}
const hexRGB = h => { const n = E.hex(h); return Array.isArray(n) ? n : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const addRGB = (a, k) => [a[0] + k, a[1] + k, a[2] + k];
/** the logo's color at a court-local point (the logo sprite scaled about the centre), or null */
function logoAt(logo, lx, ly, scale = 5) {
  const rows = logo.rows, h = rows.length, w = rows[0].length;
  const u = Math.floor((lx - CW / 2) / scale + w / 2), v = Math.floor((ly - CH / 2) / (scale * .9) + h / 2);
  if (v < 0 || v >= h || u < 0 || u >= w) return null;
  const ch = rows[v][u]; return ch === '.' || ch === ' ' ? null : logo.colors[ch];
}
/** the material under the lines: each court's floor, with its grain */
const FLOORS = {
  asphalt(x, y, C) { const n = E.hash2(Math.floor(x), Math.floor(y)), m = E.noise2(x * .05, y * .05); let c = mixRGB(C.a, C.b, m); c = addRGB(c, (n - .5) * 16); if (n > .985) c = addRGB(c, 30); if (E.noise2(x * .02 + 40, y * .02) > .72) c = mixRGB(c, C.grain, .5); return c; },
  planks(x, y, C) { const row = Math.floor(y / 9), off = (row * 37) % 64, joint = (y % 9) < .9 || ((x + off) % 64) < .9, n = E.hash2(row, Math.floor((x + off) / 64)); let c = mixRGB(C.a, C.b, n); c = addRGB(c, Math.sin(x * .7 + n * 9) * 6 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 10); return joint ? mixRGB(c, C.grain, .75) : c; },
  concrete(x, y, C) { const m = E.noise2(x * .03, y * .03), n = E.hash2(Math.floor(x), Math.floor(y)); let c = mixRGB(C.a, C.b, m); c = addRGB(c, (n - .5) * 14); const crack = Math.abs(E.noise2(x * .012 + 9, y * .012) - .5) < .012; if (crack) c = mixRGB(c, C.grain, .8); if ((x % 96) < .8 || (y % 96) < .8) c = mixRGB(c, C.grain, .4); return c; },
  basalt(x, y, C) {   // hexagonal-ish basalt tiles with glowing seams
    const s = 18, gx = x / s, gy = y / s; let best = 9, second = 9;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const cx = Math.floor(gx) + i, cy = Math.floor(gy) + j, px0 = cx + E.hash2(cx, cy) * .8, py0 = cy + E.hash2(cy + 7, cx) * .8, d = Math.hypot(gx - px0, gy - py0); if (d < best) { second = best; best = d; } else if (d < second) second = d; }
    const edge = second - best, n = E.hash2(Math.floor(x), Math.floor(y)); let c = addRGB(mixRGB(C.a, C.b, best), (n - .5) * 12);
    if (edge < .06) { const s2 = hexRGB(C.seam || '#ff6a1a'), k = 1 - edge / .06; return [s2[0] * k * .9 + c[0] * (1 - k), s2[1] * k * .7 + c[1] * (1 - k), s2[2] * k * .5 + c[2] * (1 - k), Math.round(k * 180)]; }
    return c;
  },
  maple(x, y, C) { const row = Math.floor(y / 4), off = (row * 53) % 120, joint = ((x + off) % 120) < .7, n = E.hash2(row, Math.floor((x + off) / 120)); let c = mixRGB(C.a, C.b, n * .8); c = addRGB(c, Math.sin(x * .4 + row) * 4 + (E.hash2(Math.floor(x), Math.floor(y)) - .5) * 6 + 10 * Math.max(0, 1 - Math.abs(((y + x * .3) % 140) - 70) / 40)); return joint || (y % 4) < .5 ? mixRGB(c, C.grain, .4) : c; }
};
/** the floor painter for a court: material, lines, paint, logos, the apron; floor tag ',' is the dark back */
function makeFloorTex(court) {
  const C = {}; for (const k in court.floorColors) C[k] = hexRGB(court.floorColors[k]);
  const line = hexRGB(court.lines), paint = hexRGB(court.paint), base = FLOORS[court.floor], logo = LOGOS[court.logo];
  return (x, y, tag) => {
    if (tag === 'back') return [14, 12, 20];
    const lx = x - OX, ly = y - OY, mark = courtMark(lx, ly);
    let c = base(x, y, C), glow = c[3]; c = c.slice(0, 3);
    if (mark === 'apron') { c = mixRGB(c, C.apron, .7); if (court.floor === 'maple') c = mixRGB(c, [40, 26, 36], .5); return glow ? [...c, glow >> 1] : c; }
    if (mark === 'line') { const n = E.hash2(Math.floor(x * 3), Math.floor(y * 3)); const worn = court.id === 'pier' && n > .7; return worn ? mixRGB(line, c, .5) : [...addRGB(line, (n - .5) * 12), court.id === 'skybox' ? 120 : 0]; }
    if (mark === 'paint') c = mixRGB(c, paint, court.floor === 'maple' ? .78 : .55);
    if (mark === 'circle') c = mixRGB(c, paint, .25);
    const lg = logoAt(logo, lx, ly); if (lg) c = mixRGB(c, hexRGB(lg), .72);
    for (const side of [-1, 1]) { const bx = side < 0 ? lx : CW - lx; if (bx > 154 && bx < 214 && Math.abs(ly - CH / 2) < 30) { const l2 = logoAt(logo, (bx - 184) * (side < 0 ? 1 : -1) + CW / 2, ly, 2.6); if (l2) c = mixRGB(c, hexRGB(l2), .35); } }
    return glow ? [...c, glow] : c;
  };
}
const MAPS = {};
/** the arena map for a court (built once) */
function courtMap(id) {
  if (MAPS[id]) return MAPS[id];
  const court = get('court', id), sc = court.standColors;
  const types = {}; [30, 20, 10].forEach((h, i) => { types[i + 1] = { h, face: court.standFace, side: sc[i], top: E.shade(sc[i], .15), line: E.shade(sc[i], -.35), roof: 'plain' }; });
  const map = new E.TileMap({ rows: ARENA_ROWS, legend: { 1: 1, 2: 2, 3: 3, 4: 4, '.': { floor: 'court' }, ',': { floor: 'back' } }, types, floorTex: makeFloorTex(court), outside: false, ao: 3 });
  return (MAPS[id] = map);
}

/* ---- the new prop shapes (sized for the engine's 26-unit hero; placed at scale 1.8 beside our 50-unit players) ---- */
const MAT = (id, color, pattern, extra) => { E.MATERIALS[id] = Object.assign({ color, pattern: pattern || 'none' }, extra || {}); };
MAT('bbSteel', '#8a96a6', 'metal'); MAT('bbDark', '#2a2a32', 'none'); MAT('bbChrome', '#c8d0dc', 'metal'); MAT('bbRubber', '#1e1c1e', 'none');
MAT('bbRed', '#d02a2a', 'glaze'); MAT('bbBlue', '#2a5ad0', 'glaze'); MAT('bbYellow', '#ffd23a', 'glaze'); MAT('bbWhite', '#e8e4dc', 'glaze');
MAT('bbTeal', '#18c8b8', 'glaze'); MAT('bbCoral', '#ff7a5c', 'glaze'); MAT('bbGold', '#e8b830', 'metal'); MAT('bbGlow', '#ffe08a', 'none', { glow: 1 });
MAT('bbRust', '#8a4a2a', 'metal'); MAT('bbTiki', '#8a5a32', 'planks'); MAT('bbScreen', '#3ac8ff', 'none', { glow: 1 }); MAT('bbPurple', '#5a2a8a', 'glaze');
E.SHAPES['ac-unit'] = { about: 'rooftop air conditioner, fan grille', tags: 'roof city', mats: { b: 'bbSteel', f: 'bbDark' },
  parts: [['box', 'b', [0, 0, 0], [14, 10, 9]], ['cyl', 'f', [0, 0, 9], 3.6, .8], ['box', 'f', [0, 5.1, 2], [10, .4, 1]], ['box', 'f', [0, 5.1, 4], [10, .4, 1]], ['box', 'f', [0, 5.1, 6], [10, .4, 1]]] };
E.SHAPES.boombox = { about: 'boombox, two speakers and a handle', tags: 'music street', mats: { b: 'bbDark', s: 'bbSteel', l: 'bbRed' },
  parts: [['box', 'b', [0, 0, 0], [12, 4, 6]], ['mirror', 'x', ['cyl', 's', [3.5, 2.2, 3], 2, .5, { rot: [90, 0, 0] }]], ['box', 'l', [0, 2.1, 4.6], [2.4, .3, .8]], ['box', 's', [0, 0, 6], [8, 1, .8]]] };
E.SHAPES['beach-umbrella'] = { about: 'striped beach umbrella', tags: 'beach', mats: { p: 'bbWhite', a: 'bbCoral', b: 'bbTeal' },
  parts: [['cyl', 'p', [0, 0, 0], .5, 22], ['cyl', 'a', [0, 0, 18], 12, 5, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 18], 12.2, 1.2, { seg: 8 }]] };
E.SHAPES['lifeguard-tower'] = { about: 'lifeguard tower on stilts, red roof', tags: 'beach', mats: { w: 'oak', r: 'bbRed', h: 'bbWhite' },
  parts: [['mirror', 'xy', ['box', 'w', [5, 4, 0], [1.5, 1.5, 16]]], ['box', 'w', [0, 0, 16], [13, 11, 1.5]], ['box', 'h', [0, 0, 17.5], [11, 9, 8]], ['wedge', 'r', [0, 0, 25.5], [14, 12, 4]], ['box', 'w', [0, 8, 0], [3, 6, 1], { rot: [35, 0, 0] }]] };
E.SHAPES.surfboard = { about: 'surfboard standing in the sand', tags: 'beach', mats: { s: 'bbTeal', t: 'bbYellow' },
  parts: [['box', 's', [0, 0, 0], [4, 1, 17]], ['ball', 's', [0, 0, 17], 2, { sz: 1.2 }], ['box', 't', [0, .55, 2], [.8, .2, 14]]] };
E.SHAPES['junk-car'] = { about: 'a wrecked car, rusted, flat tyres', tags: 'junkyard', mats: { b: 'bbRust', c: 'bbRust', w: 'bbRubber', g: 'bbDark' },
  parts: [['box', 'b', [0, 0, 2], [26, 13, 6]], ['box', 'c', [-2, 0, 8], [13, 12, 5]], ['box', 'g', [-2, 0, 9], [13.4, 10, 3]], ['mirror', 'xy', ['cyl', 'w', [8, 6, 0], 3, 2, { rot: [90, 0, 0] }]]] };
E.SHAPES['tire-stack'] = { about: 'a stack of old tyres', tags: 'junkyard', mats: { t: 'bbRubber', i: 'bbDark' },
  parts: [['row', 4, [0, 0, 3.2], ['cyl', 't', [0, 0, 4.8], 6, 3]], ['cyl', 'i', [0, 0, 12.9], 3, .3]] };
E.SHAPES['tiki-totem'] = { about: 'a carved tiki totem with glowing eyes', tags: 'island', mats: { w: 'bbTiki', e: 'bbGlow', d: 'walnut' },
  parts: [['box', 'w', [0, 0, 0], [7, 7, 26]], ['box', 'd', [0, 3.6, 18], [6, 1, 2]], ['box', 'e', [-1.6, 3.7, 21], [1.4, .4, 1.4]], ['box', 'e', [1.6, 3.7, 21], [1.4, .4, 1.4]], ['box', 'd', [0, 3.6, 8], [5, 1.2, 4]], ['box', 'w', [0, 0, 26], [9, 9, 2]]] };
E.SHAPES['pyro-cannon'] = { about: 'a pyro cannon on a stand', tags: 'arena', mats: { b: 'bbDark', c: 'bbSteel', r: 'bbRed' },
  parts: [['box', 'b', [0, 0, 0], [9, 9, 5]], ['cyl', 'c', [0, 0, 5], 2.8, 9, { r2: 3.4 }], ['cyl', 'r', [0, 0, 13.5], 3.5, 1]] };
E.SHAPES['tv-camera'] = { about: 'a broadcast TV camera on a tripod', tags: 'arena studio', mats: { b: 'bbDark', l: 'bbSteel', r: 'bbRed' },
  parts: [['ring', 3, 3, ['box', 'l', [0, 0, 0], [1, 1, 13], { rot: [0, -14, 0] }]], ['box', 'b', [0, 0, 13], [5, 9, 5]], ['cyl', 'l', [0, -5, 15.5], 1.8, 3, { rot: [90, 0, 0] }], ['box', 'r', [1.5, 4, 17], [1, 1, 1]]] };
E.SHAPES['scorer-table'] = { about: 'the scorer\'s table with a lit front panel', tags: 'arena', mats: { t: 'bbDark', f: 'bbBlue', s: 'bbScreen' },
  parts: [['box', 't', [0, 0, 0], [40, 9, 11]], ['box', 'f', [0, 4.6, 1], [38, .4, 8]], ['box', 's', [0, 4.9, 6], [30, .2, 2]]] };
E.SHAPES.trophy = { about: 'the Golden Blamboozle: a golden ball on a column', tags: 'arena award', mats: { c: 'marble', g: 'bbGold' },
  parts: [['cyl', 'c', [0, 0, 0], 3, 10, { r2: 2.2 }], ['cyl', 'g', [0, 0, 10], 2.4, 1.5], ['ball', 'g', [0, 0, 15], 4]] };
E.SHAPES['anchor-desk'] = { about: 'Channel BLAM\'s anchor desk', tags: 'studio', mats: { d: 'bbPurple', t: 'bbWhite', s: 'bbScreen' },
  parts: [['box', 'd', [0, 0, 0], [40, 10, 12]], ['box', 't', [0, 0, 12], [42, 11, 1.2]], ['box', 's', [0, 5.2, 4], [24, .3, 5]]] };
E.SHAPES['fence-chain'] = { about: 'a chain-link fence panel, len long', tags: 'street', mats: { p: 'bbSteel', m: 'bbDark' }, params: { len: 32 },
  make: p => [['mirror', 'x', ['cyl', 'p', [p.len / 2 - .5, 0, 0], .6, 18]], ['box', 'p', [0, 0, 17.5], [p.len, .6, .6]], ['row', Math.max(2, Math.round(p.len / 3)), [3, 0, 0], ['box', 'm', [0, 0, 1], [.3, .2, 16], { rot: [0, 30, 0] }]]] };
const NEW_SHAPES = ['ac-unit', 'boombox', 'beach-umbrella', 'lifeguard-tower', 'surfboard', 'junk-car', 'tire-stack', 'tiki-totem', 'pyro-cannon', 'tv-camera', 'scorer-table', 'trophy', 'anchor-desk', 'fence-chain'];


/* ==== 21-court-draw.js ==== */
/* 21-court-draw: the arena as it is drawn and as it moves: the backdrop and each court's silhouettes, the floor and the
 * stands, the crowd (about 260 fans who bob, jump, slump and flash cameras), the props, the hoops (padded stanchion, a
 * glass board cheated 30 degrees toward the camera, a rim in two halves that bends, a net of springs) and the lights. */
const ARENA = { id: null, court: null, map: null, bg: null, crowd: [], hoops: [], t: 0, cheer: 0, slump: 0, flashes: [], bob: 0, gull: null, dog: null, jumbo: null, pyro: 0, erupt: 0, carDrop: 0, rimGlow: [0, 0] };
const CROWD_TIERS = [{ y: 9, z: 30 }, { y: 25, z: 20 }, { y: 41, z: 10 }];
function makeHoop(i) {
  const rim = RIMS[i], strands = [];
  for (let s = 0; s < 10; s++) {
    const a = (s + .5) / 10 * TAU, nodes = [];
    for (const [rr, z] of [[7.8, 75], [6.6, 70.5], [5.5, 66]]) nodes.push({ rx: Math.cos(a) * rr, ry: Math.sin(a) * rr, rz: z, ox: 0, oy: 0, oz: 0, vx: 0, vy: 0, vz: 0 });
    strands.push({ a, nodes });
  }
  return { i, rim, strands, bend: 0, bendV: 0, glass: true, shards: [], swish: 0, perch: i === 0 };
}
/** the Blam Dome's jumbotron: the score, the last scorer live, BLAM! after a basket, OVERCLOCK in red, the Commissioner in the story */
function jumbotron(g, x, y, w, h) {
  const M = S.match, t = ARENA.t;
  if (!M) { drawPortrait(g, 'gigawatt', x + w / 2 - 13, y + 2, 26, { frame: false, expr: 'smile' }); return; }
  if (TWIST.overclocked > 0 && Math.floor(t * 3) % 2) { px.rect(g, x, y, w, h, '#3a0808'); E.font.text(g, 'OVERCLOCK', x + w / 2, y + h / 2 - 4, '#ff4a3a', { align: 'center', outline: false }); return; }
  const last = M.lastScorer, recent = last && M.gameT - M.lastScoreT < 3;
  if (recent) { drawPortrait(g, last.def.id, x + 2, y + 2, h - 4, { frame: false, expr: 'shout' }); E.font.title(g, 'BLAM!', x + w / 2 + 12, y + 4, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk }); E.font.text(g, M.score[0] + '-' + M.score[1], x + w / 2 + 12, y + h - 10, '#fff', { align: 'center', outline: false }); return; }
  const T0 = get('team', S.teams[0].id), T1 = get('team', S.teams[1].id);
  px.sprite(g, LOGOS[T0.logo].spr, x + 4, y + 3); px.sprite(g, LOGOS[T1.logo].spr, x + w - 16, y + 3);
  E.font.text(g, String(M.score[0]), x + 22, y + 4, '#fff', { outline: false }); E.font.text(g, String(M.score[1]), x + w - 22, y + 4, '#fff', { align: 'right', outline: false });
  E.font.text(g, mmss(Math.ceil(M.clock)), x + w / 2, y + h - 11, UIC.gold, { align: 'center', outline: false });
}
/** set the arena up for a court: its map, backdrop, crowd, hoops and weather */
function setupArena(id) {
  const court = get('court', id);
  ARENA.id = id; ARENA.court = court; ARENA.map = courtMap(id); ARENA.bg = new E.Backdrop(court.backdrop);
  ARENA.crowd = []; ARENA.flashes = []; ARENA.cheer = 0; ARENA.slump = 0;
  const h = (a, b) => E.hash2(a * 13 + 7, b * 29 + 3);
  CROWD_TIERS.forEach((tier, row) => {
    for (let c = 2; c <= 45; c++) for (const dx of [4, 12]) {
      const k = h(c * 2 + dx, row + id.length), empty = k > .93;
      if (empty) continue;
      ARENA.crowd.push({ x: c * 16 + dx, y: tier.y, z: tier.z, row, shirt: court.crowd[Math.floor(k * 97) % court.crowd.length], skin: court.skins[Math.floor(k * 53) % court.skins.length],
        ph: k * 9, hat: k > .8, sign: k < .03, home: k < .6, jump: 0 });
    }
  });
  ARENA.hoops = [makeHoop(0), makeHoop(1)];
  ARENA.gull = court.wind ? { x: BOARD_X[0], y: CMY, z: 102, vx: 0, vz: 0, flying: false, t: 0, blob: new E.Blob({ R: 3, wings: true, colors: { dk: '#8a8a92', base: '#f4f4f0', lt: '#ffffff', spec: '#ffffff', eye: '#141414', pupil: '#141414' } }) } : null;
  ARENA.dog = court.dog ? { x: 742, y: 330, bark: 0, blob: new E.Blob({ R: 5, ears: 'cat', tail: true, feet: true, colors: { dk: '#5a3a1a', base: '#8a5a2a', lt: '#b07a40', spec: '#ffffff', eye: '#141414', pupil: '#141414' } }) } : null;
  game.weather = court.weather ? Object.assign({}, court.weather) : null;
  ARENA.jumbo = id === 'dome' ? jumbotron : null;
  ARENA.bot = ARENA.bot || new E.Blob({ R: 5, feet: true, colors: { dk: '#4a5262', base: '#9aa6b8', lt: '#d8e0ea', spec: '#ffffff', eye: '#3ad8ff', pupil: '#0a2a3a' } });
}
/** the arena's own motion, every step: net and rim springs, the crowd's mood, the gull, the dog */
function updateArena(dt, wind = 0) {
  ARENA.t += dt; ARENA.cheer = Math.max(0, ARENA.cheer - dt * .45); ARENA.slump = Math.max(0, ARENA.slump - dt * .5); ARENA.bob = Math.max(0, ARENA.bob - dt * .2);
  for (const f of ARENA.flashes) f.t -= dt; E.prune(ARENA.flashes, f => f.t <= 0);
  const b = S.ball;
  for (const H of ARENA.hoops) {
    H.bendV += (-260 * H.bend - 12 * H.bendV) * dt; H.bend += H.bendV * dt; H.swish = Math.max(0, H.swish - dt);
    for (const st of H.strands) for (let k = 0; k < st.nodes.length; k++) {
      const n = st.nodes[k], stiff = 140 - k * 20;
      n.vx += (-stiff * n.ox - 6 * n.vx + wind * 18 * (k + 1)) * dt; n.vy += (-stiff * n.oy - 6 * n.vy) * dt; n.vz += (-stiff * n.oz - 6 * n.vz) * dt;
      if (b) {   // the ball pushes the knots it passes through
        const nx = H.rim.x + n.rx + n.ox, ny = H.rim.y + n.ry + n.oy, nz = n.rz + n.oz, dx = nx - b.x, dy = ny - b.y, dz = nz - b.z, d = Math.hypot(dx, dy, dz);
        if (d < BALL_R + 1.2 && d > .01) { const push = (BALL_R + 1.2 - d); n.ox += dx / d * push * .6; n.oy += dy / d * push * .6; n.oz += dz / d * push * .3; n.vx += dx / d * 40; n.vy += dy / d * 40; n.vz += (b.vz || 0) * .15; }
      }
      n.ox += n.vx * dt; n.oy += n.vy * dt; n.oz += n.vz * dt;
    }
  }
  for (const f of ARENA.crowd) f.jump = Math.max(0, f.jump - dt);
  // a Supernova lights the rim its team attacks
  if (S.players && S.players.length) for (let i = 0; i < 2; i++) ARENA.rimGlow[i] = S.players.some(p => p.isNova() && RIMS.indexOf(attackRim(p.team)) === i) ? 1 : 0;
  const G = ARENA.gull;
  if (G) {
    G.t += dt;
    if (G.flying) { G.x += G.vx * dt; G.z += G.vz * dt; G.vz = approach(G.vz, 30, dt * 40); if (G.z > 260 || G.x < -100 || G.x > 900) { G.flying = false; G.t = 0; G.x = BOARD_X[0]; G.z = 102; G.vx = 0; } }
    G.blob.update(dt, { flap: G.flying ? 1 : 0, look: [G.vx >= 0 ? 1 : -1, 0], squash: 0 });
  }
  if (ARENA.dog) { ARENA.dog.bark = Math.max(0, ARENA.dog.bark - dt); ARENA.dog.blob.update(dt, { squash: ARENA.dog.bark > 0 ? Math.sin(ARENA.t * 30) * .2 : 0, look: [-1, .3], walk: 0 }); }
}
/** a crowd reaction: 'cheer' (dunks, shatters), 'slump' (a home miss), 'flash' (cameras) */
function crowdReact(kind, k = 1) {
  if (kind === 'cheer') { ARENA.cheer = Math.min(1.6, ARENA.cheer + k); for (const f of ARENA.crowd) if (S.fx() < .6 * k) f.jump = .4 + S.fx() * .5; }
  if (kind === 'slump') ARENA.slump = Math.min(1, ARENA.slump + k);
  if (kind === 'flash') for (let i = 0; i < 14 * k; i++) { const f = pickF(ARENA.crowd); if (f) ARENA.flashes.push({ x: f.x + fxr(-3, 3), y: f.y, z: f.z + 8, t: .15 + S.fx() * .25 }); }
  if (ARENA.dog && kind === 'cheer') { ARENA.dog.bark = .8; sfx('bark'); }
}
function hoopHit(i, power) { const H = ARENA.hoops[i]; if (!H) return; H.bendV -= 60 * power; const G = ARENA.gull; if (G && i === 0 && !G.flying) { G.flying = true; G.vx = -60; G.vz = 60; sfx('gull'); } }

/* ---- drawing ---- */
const ppt = (r, x, y, z) => { const p = r.w(x, y, z); return [Math.round(p[0]), Math.round(p[1])]; };
function drawSilhouettes(r) {
  const court = ARENA.court, base = r.w(CMX, 0, 30)[1], t = ARENA.t, cx = r.w(CMX, 0, 0)[0];
  const at = (wx, par) => Math.round(cx + (wx - CMX) * par);
  const g = r.ctx, dk = E.shade(court.backdrop.sky[0], -.2);
  const S2 = court.silhouettes;
  if (S2 === 'skyline') {
    const wx = at(140, .55), wy = base;   // the water tower
    px.rect(g, wx - 1, wy - 34, 2, 34, dk); px.rect(g, wx + 13, wy - 34, 2, 34, dk); px.rect(g, wx - 3, wy - 50, 20, 17, '#1a1030'); px.poly(g, [[wx - 4, wy - 50], [wx + 7, wy - 58], [wx + 18, wy - 50]], '#1a1030');
    const bx = at(560, .6), on = Math.sin(t * 7) > -.85 || Math.sin(t * 1.3) > .5;   // the BLAM COLA billboard
    px.rect(g, bx - 2, base - 30, 3, 30, dk); px.rect(g, bx + 40, base - 30, 3, 30, dk); E.ui.box(g, bx - 6, base - 52, 54, 22, { bg: '#1a0c26', border: on ? '#ff3ca6' : '#4a1a3a', gradient: false });
    if (on) { E.font.text(g, 'BLAM', bx + 21, base - 49, '#ff3ca6', { align: 'center', outline: false }); E.font.text(g, 'COLA', bx + 21, base - 40, '#2de2ff', { align: 'center', outline: false }); }
    const hx = Math.round(((t * 22) % 900) - 120 + cx - r.W), hy = base - 70;   // the helicopter and its searchlight
    px.rect(g, hx, hy, 12, 5, '#0a0814'); px.rect(g, hx + 12, hy + 1, 10, 2, '#0a0814'); px.line(g, hx - 6, hy - 2, hx + 18, hy - 2, '#2a2440'); px.dot(g, hx + 2, hy + 5, Math.floor(t * 4) % 2 ? '#ff2a2a' : '#0a0814');
    px.blend(g, .18, 'add', () => px.poly(g, [[hx + 4, hy + 5], [hx - 30, base + 40], [hx + 40, base + 40]], '#fff8d0'));
  } else if (S2 === 'boardwalk') {
    const fx = at(620, .5), fy = base - 34, R = 30;   // the Ferris wheel
    for (let k = 0; k < 8; k++) { const a = t * .2 + k / 8 * TAU; px.line(g, fx, fy, fx + Math.cos(a) * R, fy + Math.sin(a) * R, '#4a2a4a'); px.rect(g, fx + Math.cos(a) * R - 2, fy + Math.sin(a) * R, 4, 4, ['#ff7ab0', '#ffd23a', '#2ad8c8'][k % 3]); }
    px.line(g, fx, fy, fx - 14, base, '#3a1a3a', 2); px.line(g, fx, fy, fx + 14, base, '#3a1a3a', 2);
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; px.dot(g, fx + Math.cos(a) * R, fy + Math.sin(a) * R, Math.floor(t * 6 + k) % 3 ? '#ffd27a' : '#ffffff'); }
    const lx = at(110, .45); px.poly(g, [[lx - 6, base], [lx - 3, base - 44], [lx + 3, base - 44], [lx + 6, base]], '#e8e0d8'); px.rect(g, lx - 3, base - 30, 6, 4, '#d02a2a'); px.rect(g, lx - 4, base - 50, 8, 6, '#3a2a3a'); px.blend(g, .3, 'add', () => { const a = t * 1.5; px.poly(g, [[lx, base - 47], [lx + Math.cos(a) * 90, base - 47 + Math.sin(a) * 10 - 6], [lx + Math.cos(a) * 90, base - 47 + Math.sin(a) * 10 + 6]], '#fff0a0'); });
    const cx0 = at(330, .5);   // the coaster: a hill of track and a car that loops every 12 s
    const track = u => [cx0 - 60 + u * 120, base - 8 - Math.max(0, Math.sin(u * PI * 2)) * 26 - Math.sin(u * PI) * 8];
    for (let u = 0; u < 1; u += .02) { const p = track(u), q = track(u + .02); px.line(g, p[0], p[1], q[0], q[1], '#5a2a3a'); if (Math.round(u * 50) % 5 === 0) px.line(g, p[0], p[1], p[0], base, '#3a1a2a'); }
    const cp = track((t / 12) % 1); px.rect(g, cp[0] - 3, cp[1] - 4, 7, 4, '#ffd23a');
  } else if (S2 === 'junkyard') {
    const kx = at(200, .5), sw = Math.sin(t * .8) * 14;   // the crane and its swinging magnet
    px.line(g, kx, base, kx, base - 60, '#2a1a1a', 3); px.line(g, kx - 10, base - 58, kx + 70, base - 64, '#2a1a1a', 2);
    px.line(g, kx + 60, base - 63, kx + 60 + sw, base - 30, '#1a1414'); px.rect(g, kx + 54 + sw, base - 30, 12, 4, '#3a3434');
    if (ARENA.carDrop > 0) { const k = 1 - ARENA.carDrop; px.rect(g, kx + 52 + sw, base - 26 + k * 40, 16, 7, '#6a3a2a'); }
    for (const [x0, n] of [[440, 3], [560, 4], [640, 2]]) { const xx = at(x0, .55); for (let k = 0; k < n; k++) px.rect(g, xx - 14 + (k % 2) * 3, base - 8 - k * 8, 28, 8, ['#5a3a2a', '#3a4a5a', '#5a5a3a', '#4a2a2a'][k % 4]); }
  } else if (S2 === 'volcano') {
    const vx = at(CMX, .3), top = base - 40, glow = .5 + .5 * Math.sin(t * 2);   // the crater glows and smokes
    px.blend(g, .4 + .2 * glow, 'add', () => px.disc(g, vx, top, 16, '#ff5a1a'));
    px.poly(g, [[vx - 90, base], [vx - 14, top], [vx + 14, top], [vx + 90, base]], '#1a0a0c'); px.rect(g, vx - 12, top, 24, 3, '#ff7a2a');
    for (let k = 0; k < 6; k++) { const u = ((t * .15 + k / 6) % 1); px.blend(g, .35 * (1 - u), 'normal', () => px.disc(g, vx + Math.sin(k * 3 + t) * 10 * u, top - u * 60, 4 + u * 10, '#3a2a2a')); }
    if (ARENA.erupt > 0) px.blend(g, .5, 'add', () => px.poly(g, [[vx - 10, top], [vx, top - 70], [vx + 10, top]], '#ffb030'));
  } else if (S2 === 'arena') {
    // the bowl: rafters, the upper deck's crowd, banners, the jumbotron, laser sweeps
    px.rect(g, 0, 0, r.W, base + 2, '#0a0812');
    for (let k = 0; k < 6; k++) { const y = base - 6 - k * 9; px.rect(g, 0, y, r.W, 1, '#1a1428'); for (let x = (k * 7) % 6; x < r.W; x += 6) { const c = court.crowd[(x * 7 + k * 3) % court.crowd.length]; if (E.hash2(x, k) > .25) { const j = ARENA.cheer > .3 && E.hash2(x, k + 9) > .5 ? -Math.abs(Math.sin(t * 9 + x)) * 2 : 0; px.rect(g, x, y - 4 + j, 3, 3, E.shade(c, -.35)); px.dot(g, x + 1, y - 5 + j, '#6a5048'); } } }
    for (let k = 0; k < 6; k++) { const bx = at(150 + k * 95, .7); px.rect(g, bx, 0, 12, 22, [STREET_TEAMS.map(s => get('team', s).colors.jersey)][0][k % 4]); px.poly(g, [[bx, 22], [bx + 6, 27], [bx + 12, 22]], '#ffd23a'); }
    const jx = at(CMX, .85), jy = Math.max(2, base - 64);
    E.ui.box(g, jx - 40, jy, 80, 34, { bg: '#0a0a14', border: '#5a5a6a', gradient: false });
    if (ARENA.jumbo) ARENA.jumbo(g, jx - 38, jy + 2, 76, 30);
    px.blend(g, .22, 'add', () => { for (let k = 0; k < 4; k++) { const a = Math.sin(t * .7 + k * 1.7) * .9; px.line(g, at(120 + k * 170, .9), 0, at(120 + k * 170, .9) + Math.sin(a) * 200, base + 60, ['#ff3a3a', '#3a8aff', '#3aff8a', '#ffd23a'][k], 1); } });
  }
}
function drawCrowd(r) {
  const t = ARENA.t, cheer = Math.min(1, ARENA.cheer), slump = ARENA.slump, beat = ARENA.bob;
  for (let row = 0; row < 3; row++) {
    const y = CROWD_TIERS[row].y;
    r.queue(CMX, y, CROWD_TIERS[row].z, g => {
      for (const f of ARENA.crowd) {
        if (f.row !== row) continue;
        const up = f.jump > 0 ? Math.sin((1 - f.jump) * PI * 2.2) * 5 : 0, bob = Math.sin(t * (2 + beat * 6) + f.ph) * (.6 + beat * 1.4) - slump * 1.5;
        const [x, yy] = ppt(r, f.x, f.y, f.z + Math.max(0, up) + bob);
        if (x < -6 || x > r.W + 6) continue;
        px.rect(g, x - 2, yy - 6, 5, 6, f.shirt); px.rect(g, x - 2, yy - 6, 5, 1, E.shade(f.shirt, .25));
        px.rect(g, x - 1, yy - 9, 3, 3, f.skin); if (f.hat) px.rect(g, x - 1, yy - 10, 3, 1, f.shirt);
        if (f.jump > 0 || cheer > .6) { px.line(g, x - 3, yy - 6, x - 4, yy - 11, f.skin); px.line(g, x + 3, yy - 6, x + 4, yy - 11, f.skin); }
        if (f.sign) { px.rect(g, x - 4, yy - 16, 9, 5, '#f4f0e0'); px.rect(g, x - 3, yy - 15, 7, 1, '#d02a2a'); px.rect(g, x - 3, yy - 13, 5, 1, '#2a2a8a'); }
      }
    });
  }
  if (ARENA.flashes.length) r.queue(CMX, 40, 30, g => { for (const f of ARENA.flashes) { const [x, y] = ppt(r, f.x, f.y, f.z); px.rect(g, x - 1, y, 3, 1, '#ffffff'); px.rect(g, x, y - 1, 1, 3, '#ffffff'); if (f.t > .25) px.blend(g, .35, 'add', () => px.disc(g, x, y, 2, '#fff8d0')); } }, { emissive: true });
}
/** a hoop: stanchion, glass, the rim's back half, the net's back strands (queued behind the ball), then the front ones */
function drawHoop(r, H) {
  const rim = H.rim, side = rim.side, bx = BOARD_X[H.i], team = S.teams && S.teams[H.i === 1 ? 1 : 0], pad = team ? get('team', team.id).colors.jersey : '#3a3a4a';
  const baseX = side < 0 ? OX - 30 : OX + CW + 30;
  r.queue(baseX, CMY - 2, 0, g => {   // the stanchion: a padded base, a pole and an arm to the board
    r.box(g, baseX - 13, CMY - 10, 0, baseX + 13, CMY + 10, 24, E.shade(pad, .15), E.shade(pad, -.25));
    const top = ppt(r, baseX, CMY, 112), arm = ppt(r, bx - side * 2, CMY, 96), mid = ppt(r, baseX, CMY, 24);
    px.line(g, mid[0], mid[1], top[0], top[1], '#3a3e4a', 4); px.line(g, mid[0] - 1, mid[1], top[0] - 1, top[1], '#6a7080', 1);
    px.line(g, top[0], top[1], arm[0], arm[1], '#3a3e4a', 3); const a2 = ppt(r, bx - side * 2, CMY, 80); px.line(g, mid[0], mid[1] - 30, a2[0], a2[1], '#30343e', 2);
  }, { bias: -2 });
  const nearX = bx + 15 * side, farX = bx - 15 * side, nearY = CMY + 26, farY = CMY - 26, GZ0 = 69, GZ1 = 104;
  r.queue(bx, CMY - 9, GZ0, g => {   // the glass, turned toward the camera so its face shows
    const P = [[farX, farY, GZ0], [farX, farY, GZ1], [nearX, nearY, GZ1], [nearX, nearY, GZ0]].map(p => ppt(r, ...p));
    if (H.glass) {
      px.blend(g, .28, 'screen', () => px.poly(g, P, '#bfe8ff'));
      px.blend(g, .4, 'add', () => { const a = ppt(r, farX + (nearX - farX) * .2, farY + (nearY - farY) * .2, GZ1 - 1), b = ppt(r, farX + (nearX - farX) * .45, farY + (nearY - farY) * .45, GZ0 + 1); px.line(g, a[0], a[1], b[0], b[1], '#ffffff'); });
      for (let k = 0; k < 4; k++) px.line(g, P[k][0], P[k][1], P[(k + 1) % 4][0], P[(k + 1) % 4][1], '#f4f8ff');
      const sq = [[.3, 82], [.3, 92], [.7, 92], [.7, 82]].map(([u, z]) => ppt(r, farX + (nearX - farX) * u, farY + (nearY - farY) * u, z));
      for (let k = 0; k < 4; k++) px.line(g, sq[k][0], sq[k][1], sq[(k + 1) % 4][0], sq[(k + 1) % 4][1], '#ff7a2a');
    } else {
      for (let k = 0; k < 4; k++) { const A2 = P[k], B2 = P[(k + 1) % 4]; for (let u = 0; u < 1; u += .25) { const x = A2[0] + (B2[0] - A2[0]) * u, y = A2[1] + (B2[1] - A2[1]) * u; px.poly(g, [[x, y], [x + 3, y + 1], [x + 1, y + 4]], '#cfeeff'); } px.line(g, A2[0], A2[1], B2[0], B2[1], '#5a6070'); }
    }
  }, { bias: -1 });
  // the rim: 16 points; the front bends down on hits
  const ring = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, fy = Math.sin(a), front = Math.max(0, Math.cos(a) * -side) * H.bend; ring.push([rim.x + Math.cos(a) * RIM_R, rim.y + fy * RIM_R, RIM_Z + front * 4]); }
  const rimPart = back => g => {
    const t = E.tones('#ff6a1a');
    for (let k = 0; k < 16; k++) { const a = ring[k], b = ring[(k + 1) % 16], isBack = (a[1] + b[1]) / 2 < rim.y; if (isBack !== back) continue; const p = ppt(r, ...a), q = ppt(r, ...b); px.line(g, p[0], p[1], q[0], q[1], back ? t.sh : t.base, 2); if (!back) px.line(g, p[0], p[1] - 1, q[0], q[1] - 1, t.lt); }
    // the clip to the board
    if (back) { const c0 = ppt(r, rim.x - side * RIM_R, rim.y, RIM_Z), c1 = ppt(r, bx, rim.y, RIM_Z + 1); px.line(g, c0[0], c0[1], c1[0], c1[1], t.sh, 2); }
  };
  const netPart = back => g => {
    const col = '#f4f4f0', dim = '#b8b8c0', N = H.strands, pt = (st, k) => { if (k < 0) { const a = st.a; return ppt(r, rim.x + Math.cos(a) * RIM_R, rim.y + Math.sin(a) * RIM_R, RIM_Z); } const n = st.nodes[k]; return ppt(r, rim.x + n.rx + n.ox, rim.y + n.ry + n.oy, n.rz + n.oz); };
    for (let s = 0; s < N.length; s++) {
      const st = N[s], isBack = Math.sin(st.a) < 0; if (isBack !== back) continue;
      for (let k = -1; k < 2; k++) { const p = pt(st, k), q = pt(st, k + 1); px.line(g, p[0], p[1], q[0], q[1], back ? dim : col); }
      const nx = N[(s + 1) % N.length];
      for (let k = 0; k < 3; k++) { const p = pt(st, k), q = pt(nx, Math.max(0, k - (k % 2 ? 0 : 0))); px.line(g, p[0], p[1], q[0], q[1], back ? dim : col); }
    }
  };
  r.queue(rim.x, rim.y - 6, RIM_Z, g => { netPart(true)(g); rimPart(true)(g); });
  r.queue(rim.x, rim.y + 6, RIM_Z, g => { netPart(false)(g); rimPart(false)(g); });
  if (ARENA.rimGlow && ARENA.rimGlow[H.i]) r.queue(rim.x, rim.y + 6.5, RIM_Z, g => { const c = ppt(r, rim.x, rim.y, RIM_Z); px.blend(g, .45, 'add', () => px.ell(g, c[0], c[1], 13, 5, '#ffb030')); }, { emissive: true });
}
function drawProps(r) {
  for (const [name, x, y, o] of ARENA.court.props) {
    if (name.startsWith('shape:')) r.shape(name.slice(6), x, y, 0, Object.assign({ scale: 1.8, facing: PI / 2, light: true }, o || {}, o && o.color ? { mats: { b: { color: o.color, pattern: 'metal' }, c: { color: o.color, pattern: 'metal' } } } : {}));
    else r.prop(name, x, y, 0, Object.assign({ size: 1.4 }, o || {}));
  }
  const G = ARENA.gull; if (G) r.actor(G.x, G.y, G.z, (g, ox, oy) => G.blob.draw(g, ox, oy, r.view));
  // the cleaning bot rolls out during a sponsor break and fits new glass
  const M = S.match;
  if (M && M.phase === 'sponsor' && M.sponsorPending && ARENA.bot) {
    const i = M.sponsorPending.rim, side = RIMS[i].side, k = clamp(M.phaseT / 1.6, 0, 1), back = clamp((M.phaseT - 3) / 1.1, 0, 1), bx = BOARD_X[i] + side * 60 * (1 - k + back), by = CMY + 34;
    ARENA.bot.update(1 / 60, { walk: k < 1 || back > 0 ? 1 : 0, squash: Math.sin(ARENA.t * 20) * .05, look: [-side, 0] });
    r.actor(bx, by, 0, (g, ox, oy) => ARENA.bot.draw(g, ox, oy, r.view));
    if (k >= 1 && back <= 0) { const [x0, y0] = r.w(bx, by, 10), [x1, y1] = r.w(BOARD_X[i], CMY, 86); r.queue(bx, by, 10, g => { px.line(g, x0, y0, x1, y1, '#9aa6b8', 1); if (Math.floor(ARENA.t * 10) % 2) px.dot(g, x1, y1, '#fff8b0'); }, { emissive: true }); if (S.fx() < .2) P.sparks(BOARD_X[i], CMY, 86, 1, null, { color: '#fff8b0' }); }
  }
  const D = ARENA.dog; if (D) r.actor(D.x, D.y, 0, (g, ox, oy) => D.blob.draw(g, ox, oy, r.view));
}
function arenaLights(r) {
  const court = ARENA.court, Lg = game.lights;
  Lg.enabled = true; Lg.ambient = court.ambient;
  for (const [x, y] of [[OX + 40, OY - 30], [OX + CW - 40, OY - 30], [OX + 40, OY + CH + 30], [OX + CW - 40, OY + CH + 30]]) Lg.add(x, y, 140, 280, .75, { color: court.lightColor });
  Lg.add(CMX, CMY, 160, 260, .5, { color: court.lightColor });
  for (const [col, x, y] of court.glows) Lg.add(x, y, 50, 140, .8, { color: col });
  if (court.spots) for (let k = 0; k < 6; k++) { const a = ARENA.t * .4 + k; Lg.add(CMX + Math.sin(a) * 260, CMY + Math.cos(a * 1.3) * 110, 120, 110, .9, { color: ['#ffffff', '#ffd0a0', '#a0d0ff'][k % 3] }); }
  if (court.id === 'caldera') { for (const x of [OX - 40, OX + CW + 40]) Lg.add(x, CMY, 10, 200, .6 + .15 * Math.sin(ARENA.t * 5), { color: '#ff4a1a' }); }
  if (ARENA.pyro > 0) Lg.add(CMX, CMY, 80, 420, ARENA.pyro, { color: '#ffb050' });
}
/** the whole arena under the players and the ball (they are queued by their own systems) */
function drawArena(r) {
  ARENA.bg.draw(r);
  drawSilhouettes(r);
  ARENA.map.drawFloor(r);
  const south = r.w(0, OY + CH + 48, 0)[1];
  if (south < r.H) {
    if (ARENA.court.id === 'caldera') {   // the lava moat beyond the arena: glowing, bubbling
      const g = r.ctx, y0 = Math.round(south); px.rect(g, 0, y0, r.W + 2, r.H - y0 + 2, '#8a1a0a');
      for (let k = 0; k < 40; k++) { const x = (k * 53 + Math.floor(ARENA.t * 9) * (k % 3)) % (r.W + 2), y = y0 + 3 + (k * 17) % Math.max(4, r.H - y0 - 4); px.rect(g, x, y, 6 + k % 5, 2, k % 2 ? '#ff6a1a' : '#ffb030'); }
      for (let k = 0; k < 6; k++) { const u = (ARENA.t * .7 + k / 6) % 1, x = (k * 97) % (r.W + 2), y = y0 + 6 + (k * 23) % Math.max(4, r.H - y0 - 8); px.disc(g, x, y, 1 + u * 2.5, u > .8 ? '#ffe080' : '#ff8a2a'); }
    } else px.rect(r.ctx, 0, Math.round(south), r.W + 2, r.H - south + 2, E.shade(ARENA.court.floorColors.apron, -.45));
  }
  ARENA.map.queueWalls(r);
  drawCrowd(r); drawProps(r);
  for (const H of ARENA.hoops) drawHoop(r, H);
  arenaLights(r);
}


/* ==== 22-twists.js ==== */
/* 22-twists: each court's twist (PLAN 10.1). THE SKYBOX: the Jackpot Spot (a ring that moves every 20 s: a jumper made
 * from it scores +2). THE PIER: sea breeze (gusts that bend every shot and the net). THE SCRAPYARD: oil slicks (players
 * slide; a hard turn at turbo speed slips). THE CALDERA: eruptions (lava bombs on telegraphed rings) and steam vents (the
 * VOLCANO LAUNCH, the SUPER BLOCK). THE BLAM DOME: the BLAMBOTS' OVERCLOCK, MAGNET HANDS and SYSTEM REBOOT. */
const TWIST = { kind: null, on: false, jackpot: false, spot: null, wind: false, windOn: false, windX: 0, windY: 0, gustT: 0, nextGust: 0, oil: false, slicks: [],
  volcano: false, vents: [], bombs: [], nextErupt: 0, rumble: 0, boss: false, overclocked: 0, q3Overclock: false };
function setupTwists(courtId, on, jackpotAll) {
  const court = get('court', courtId), k = court.twist, T = TWIST;
  Object.assign(T, { kind: k, on, jackpot: false, spot: null, wind: false, windOn: false, windX: 0, windY: 0, gustT: 0, oil: false, slicks: [], volcano: false, vents: [], bombs: [], rumble: 0, boss: false, overclocked: 0, q3Overclock: false });
  if (S.cheats.noTwists || S.cheats.tournament) on = false;
  T.on = on;
  if ((on && k === 'jackpot') || (jackpotAll && on)) { T.jackpot = true; moveSpot(); }
  if (on && k === 'wind') { T.wind = true; T.nextGust = (8 + S.rng() * 8) * tune('hazardInterval'); }
  if (on && k === 'oil') { T.oil = true; placeSlicks(); }
  if (on && k === 'volcano') { T.volcano = true; T.nextErupt = (14 + S.rng() * 10) * tune('hazardInterval'); T.vents = [{ x: OX + 200, y: OY + 60, puff: 0, pre: 0, t: 1.5 }, { x: OX + 440, y: OY + 228, puff: 0, pre: 0, t: 4 }]; }
  if (k === 'boss') T.boss = S.teams.some(t => get('team', t.id).boss);
  game.weather = court.weather ? Object.assign({}, court.weather) : null;
}
function moveSpot() {
  const ri = S.rng() < .5 ? 0 : 1, rim = RIMS[ri], a = (S.rng() - .5) * 2.4, d = 50 + S.rng() * 70;
  TWIST.spot = { rim: ri, x: clamp(rim.x - rim.side * Math.cos(a) * d, OX + 16, OX + CW - 16), y: clamp(rim.y + Math.sin(a) * d, OY + 16, OY + CH - 16), t: 20 };
}
function placeSlicks() {
  TWIST.slicks = [];
  for (let i = 0; i < 3; i++) for (let tries = 0; tries < 30; tries++) {
    const x = OX + 40 + S.rng() * (CW - 80), y = OY + 24 + S.rng() * (CH - 48), r = 20 + S.rng() * 16;
    const lx = x - OX, inKey = (lx < 170 || lx > CW - 170) && Math.abs(y - CMY) < 60, nearCentre = dist2(x, y, CMX, CMY) < 60, overlap = TWIST.slicks.some(s => dist2(s.x, s.y, x, y) < s.r + r + 10);
    if (!inKey && !nearCentre && !overlap) { TWIST.slicks.push({ x, y, r, ph: S.rng() * TAU }); break; }
  }
}
const onSlick = (x, y) => TWIST.slicks.some(s => ((x - s.x) / s.r) ** 2 + ((y - s.y) / (s.r * .6)) ** 2 < 1);
function slipOnOil(p) {
  const had = p.has; p.setState('knock'); p.kdT = .6; p.vx *= .6; p.vy *= .6;
  if (had) looseBall(p.vx * .8, p.vy * .8, 60, p);
  sfx('oil_slip'); emit('oilSlip', { slot: p.slot, name: p.name });
}
function twistHazardAt(x, y) { return onSlick(x, y) || TWIST.vents.some(v => dist2(v.x, v.y, x, y) < 26) || TWIST.bombs.some(b => dist2(b.x, b.y, x, y) < 30); }
function forceTwist(kind) {
  const T = TWIST;
  if (kind === 'gust') { T.wind = true; startGust(); }
  if (kind === 'slicks') { T.oil = true; placeSlicks(); }
  if (kind === 'eruption') { T.volcano = true; if (!T.vents.length) setupTwists(S.court, true); erupt(); }
  if (kind === 'vent') { T.volcano = true; if (!T.vents.length) T.vents = [{ x: OX + 200, y: OY + 60, puff: 0, pre: 0, t: 0 }, { x: OX + 440, y: OY + 228, puff: 0, pre: 0, t: 0 }]; for (const v of T.vents) { v.pre = 0; v.puff = 2; } }
  if (kind === 'overclock') overclock();
  if (kind === 'jackpot') { T.jackpot = true; moveSpot(); }
  if (kind === 'reboot') { const bot = S.players.find(p => get('team', p.teamId).boss) || S.players[2]; bot.rebootPending = true; }
}
function startGust() {
  const T = TWIST, w = (.45 + S.rng() * .55) * (S.rng() < .5 ? -1 : 1), a = (S.rng() - .5) * .87;
  T.windOn = true; T.gustT = 4; T.windX = w * Math.cos(a); T.windY = w * Math.sin(a) * .8; sfx('wind_gust'); emit('twist', { kind: 'gust', w });
}
function erupt() {
  const T = TWIST; T.rumble = 1.2; game.shake(1.5); sfx('rumble'); emit('twist', { kind: 'eruption' }); ARENA.erupt = 1.5;
  const b = S.ball, spots = [[b.x + (S.rng() - .5) * 40, b.y + (S.rng() - .5) * 30]];
  for (let i = 0; i < 2; i++) spots.push([OX + 60 + S.rng() * (CW - 120), OY + 30 + S.rng() * (CH - 60)]);
  spots.forEach(([x, y], i) => T.bombs.push({ x: clamp(x, OX + 20, OX + CW - 20), y: clamp(y, OY + 20, OY + CH - 20), t: -(i * 1), warn: 1.2, hit: false }));
}
function overclock() {
  const bots = S.players.filter(p => get('team', p.teamId).boss); if (!bots.length) return;
  for (const p of bots) { p.overclock = 30; p.turbo = 1; }
  TWIST.overclocked = 30; sfx('servo'); emit('overclock', {});
}
function twistStep(dt) {
  const T = TWIST, M = S.match, live = M.phase === 'live' || M.phase === 'inbound';
  if (T.jackpot && T.spot) { T.spot.t -= dt; if (T.spot.t <= 0) moveSpot(); }
  if (T.wind) {
    if (T.windOn) { T.gustT -= dt; if (T.gustT <= 0) { T.windOn = false; T.windX = T.windY = 0; } if (game.weather) game.weather.wind = T.windX; else game.weather = { kind: 'sand', amount: .35, wind: T.windX * 2 }; }
    else { if (game.weather && game.weather.kind === 'sand') game.weather = null; if (live) { T.nextGust -= dt; if (T.nextGust <= 0) { T.nextGust = (15 + S.rng() * 10) * tune('hazardInterval'); startGust(); } } }
  }
  if (T.volcano) {
    T.rumble = Math.max(0, T.rumble - dt); ARENA.erupt = Math.max(0, ARENA.erupt - dt);
    if (live) { T.nextErupt -= dt; if (T.nextErupt <= 0) { T.nextErupt = (25 + S.rng() * 10) * tune('hazardInterval'); erupt(); } }
    for (const bm of T.bombs) {
      bm.t += dt;
      if (bm.t >= bm.warn && !bm.hit) {
        bm.hit = true; P.explosion(bm.x, bm.y, 0, 1.4, { shake: 2 }); P.fire(bm.x, bm.y, 0, 10); sfx('bomb_hit');
        for (const p of S.players) if (dist2(p.x, p.y, bm.x, bm.y) < 22 && p.state !== 'knock' && p.state !== 'dunk' && p.state !== 'hang') knockDown(p, { x: bm.x, y: bm.y }, { time: .8, push: 140, fumble: 1 });
        if (S.ball.state === 'loose' && dist2(S.ball.x, S.ball.y, bm.x, bm.y) < 24 && S.ball.z < 20) { S.ball.vz = 220; S.ball.vx += (S.ball.x - bm.x) * 4; S.ball.vy += (S.ball.y - bm.y) * 4; }
      }
    }
    E.prune(T.bombs, bm => bm.t > bm.warn + .6);
    for (const v of T.vents) {
      v.t -= dt; v.puff = Math.max(0, v.puff - dt); v.pre = Math.max(0, v.pre - dt);
      if (v.t <= 0) { v.t = 5 * tune('hazardInterval'); v.pre = 1; }
      if (v.pre > 0 && v.pre - dt <= 0) { v.puff = 2; sfx('vent_puff', { vol: .4 }); }
    }
  }
  if (T.boss && M.phase === 'live') {
    const botTeam = S.players.find(p => get('team', p.teamId).boss).team, trail = M.score[1 - botTeam] - M.score[botTeam];
    if (M.quarter === M.quarters && !T.q4Overclock) { T.q4Overclock = true; overclock(); }
    if (M.quarter === M.quarters - 1 && trail >= 8 && !T.q3Overclock) { T.q3Overclock = true; overclock(); }
    T.overclocked = Math.max(0, T.overclocked - dt);
    for (const p of S.players) if (p.overclock > 0) { p.overclock -= dt; if (p.overclock <= 0) { p.overclock = 0; emit('overclockOff', { slot: p.slot }); } }
  }
}
/** the twists drawn on and over the floor */
function drawTwists(r) {
  const T = TWIST, t = ARENA.t;
  if (T.jackpot && T.spot) { const s = T.spot, k = .5 + .5 * Math.sin(t * 6); r.decal(() => { r.groundRing(s.x, s.y, 16, '#ffd23a', .9); r.groundRing(s.x, s.y, 13 + k * 2, '#fff0a0', .6); r.groundDisc(s.x, s.y, 15, '#ffd23a', .18); }); r.queue(s.x, s.y, 2, g => { const [x, y] = r.w(s.x, s.y, 10 + k * 3); E.font.text(g, '$', Math.round(x), Math.round(y) - 4, '#ffe060', { align: 'center', outline: '#5a3a00' }); }, { emissive: true }); }
  for (const s of T.slicks) r.decal(() => { r.groundDisc(s.x, s.y, s.r * .95, '#0c0a10', .85); for (let k = 0; k < 3; k++) { const a = t * .6 + s.ph + k * 2; r.groundArc(s.x + Math.cos(a) * s.r * .25, s.y + Math.sin(a) * s.r * .15, s.r * .3, s.r * .38, a, a + 1.6, ['#ff4ad8', '#4adfff', '#ffe04a'][k], .55); } });
  for (const v of T.vents) {
    r.decal(() => { r.groundDisc(v.x, v.y, 11, '#1a1010', 1); r.groundRing(v.x, v.y, 11, v.pre > 0 || v.puff > 0 ? '#ff8a3a' : '#5a3a2a', 1); r.groundRing(v.x, v.y, 6, '#3a2a20', 1); });
    if (v.pre > 0 || v.puff > 0) r.queue(v.x, v.y, 0, g => { const h = v.puff > 0 ? 80 : 18 * (1 - v.pre), [x] = r.w(v.x, v.y, 0); for (let k = 0; k < 9; k++) { const u = ((k / 9) + t * 1.4) % 1, z = u * h, w = 2 + u * 7, [, yy] = r.w(v.x, v.y, z); px.blend(g, .32 * (1 - u * .8), 'normal', () => px.disc(g, Math.round(x + Math.sin(t * 5 + k * 1.7) * (2 + u * 5)), Math.round(yy), w, k % 2 ? '#f4f4fa' : '#d8d8e4')); } });
  }
  for (const bm of T.bombs) {
    if (bm.t < 0) continue;
    if (!bm.hit) { const k = Math.floor(t * 10) % 2; r.decal(() => { r.groundRing(bm.x, bm.y, 22, k ? '#ff2a1a' : '#ff8a3a', .9); r.groundDisc(bm.x, bm.y, 22 * bm.t / bm.warn, '#ff3a1a', .25); });
      const fz = 260 * (1 - bm.t / bm.warn); r.queue(bm.x, bm.y, fz, g => { const [x, y] = r.w(bm.x, bm.y, fz); px.disc(g, Math.round(x), Math.round(y), 5, '#ff6a1a'); px.disc(g, Math.round(x) - 1, Math.round(y) - 1, 3, '#ffd040'); }, { emissive: true }); }
  }
  if (T.wind && T.windOn) for (let k = 0; k < 3; k++) if (S.fx() < .5) P.add({ kind: 'dust', x: OX + S.fx() * CW, y: OY + S.fx() * CH, z: 2 + S.fx() * 20, vx: TWIST.windX * 160, vy: TWIST.windY * 100, vz: 0, life: .8, color: '#e8d8a8' });
  for (const p of S.players) if (p.overclock > 0 && S.fx() < .25) P.smoke(p.x - Math.cos(p.facing) * 4, p.y, 44, 1, { color: '#d8d8e0', size: .6 });
}


/* ==== 30-ball.js ==== */
/* 30-ball: the ball. States: 'held' (its owner's hands or dribble), 'pass' (flying a planned path to a receiver),
 * 'shot' (flying with its shot record: decided outcome, points, shooter), 'loose' (free physics), 'dead' (after a score
 * and in breaks: physics, nobody may take it), 'dunk' (riding a dunker's hands). Physics: gravity, wind, the floor, the
 * rim (a torus: tube 1.2 round a ring of radius 9), the backboards (true planes), the walls (the crowd), the net's drag;
 * substeps near the rims so a fast ball never tunnels. A basket: the ball's centre crossing z 80 downward within 6.75 of
 * a rim's centre, counted once. */
function newBall() {
  return { x: CMX, y: CMY, z: BALL_R, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null, scored: false, lastTouch: null, touchT: 0,
    spin: 0, roll: 0, trail: [], rimT: 0, gold: false, bounceN: 0, prevZ: BALL_R, noCatch: 0, sinceFloor: 0 };
}
/** take the ball: p holds it now */
function giveBall(p, why = 'catch') {
  const b = S.ball, prevTeam = S.match ? S.match.poss : -1;
  b.state = 'held'; b.owner = p; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.lastTouch = p; b.noCatch = 0; b.scored = false;
  p.dribble.ph = .9; p.hasBallT = 0;
  if (S.match) { if (prevTeam !== p.team) { S.match.poss = p.team; resetShotClock(); emit('possession', { team: p.team, slot: p.slot, why }); } }
  return p;
}
/** let go of the ball into free physics */
function looseBall(vx = 0, vy = 0, vz = 0, from = null) {
  const b = S.ball; b.state = 'loose'; b.owner = null; b.pass = null; b.vx = vx; b.vy = vy; b.vz = vz; if (from) { b.lastTouch = from; b.noCatchBy = from; b.noCatch = .3; }
}
const nearRim = b => Math.min(dist2(b.x, b.y, RIMS[0].x, RIMS[0].y), dist2(b.x, b.y, RIMS[1].x, RIMS[1].y)) < 44 && b.z > 50 && b.z < 120;
/** one step of free flight (shot, loose, dead): substepped near the rims */
function ballPhysics(dt) {
  const b = S.ball, n = nearRim(b) || Math.hypot(b.vx, b.vy, b.vz) > 500 ? 6 : 1, h = dt / n;
  for (let i = 0; i < n; i++) ballSub(b, h);
  b.roll += Math.hypot(b.vx, b.vy) * dt; b.rimT = Math.max(0, b.rimT - dt);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
}
function ballSub(b, h) {
  const g = tune('ballGravity') * (S.cheats.moonGravity ? .55 : 1), shot = b.shot, ghost = shot && shot.made;   // a decided make flies clean (a rattle only clanks)
  if (b.z > BALL_R + .5 && TWIST.wind && TWIST.windOn && b.state !== 'dead') { b.vx += TWIST.windX * tune('windStrength') * h; b.vy += TWIST.windY * tune('windStrength') * h; }
  b.vz -= g * h; b.prevZ = b.z;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  // the rims
  for (let i = 0; i < 2; i++) {
    const R = RIMS[i], dx = b.x - R.x, dy = b.y - R.y, d = Math.hypot(dx, dy);
    if (Math.abs(b.z - RIM_Z) > 8 || d > RIM_R + 7) continue;
    if (!ghost) {
      const qx = R.x + (d > .01 ? dx / d : 1) * RIM_R, qy = R.y + (d > .01 ? dy / d : 0) * RIM_R, ex = b.x - qx, ey = b.y - qy, ez = b.z - RIM_Z, ed = Math.hypot(ex, ey, ez), min = BALL_R + RIM_TUBE;
      if (ed < min && ed > .001) {
        const nx = ex / ed, ny = ey / ed, nz = ez / ed, vn = b.vx * nx + b.vy * ny + b.vz * nz;
        b.x += nx * (min - ed); b.y += ny * (min - ed); b.z += nz * (min - ed);
        if (vn < 0) { const e = 1 + tune('rimBounce'); b.vx -= e * vn * nx; b.vy -= e * vn * ny; b.vz -= e * vn * nz; b.vx *= .92; b.vy *= .92; rimContact(i, Math.abs(vn)); }
      }
    } else if (shot.rattle && !shot.rattled && b.vz < 0 && b.z < RIM_Z + 4 && b.z > RIM_Z) { shot.rattled = true; rimContact(i, 90); }   // a rattle in: the iron clanks and bends as it drops
    // a decided miss that would drop in rolls out instead (in and out)
    if (shot && !shot.made && !shot.blocked && b.vz < 0 && b.z > RIM_Z - 1 && b.z < RIM_Z + 9 && d < RIM_R - .5 && b.state !== 'dead') { const a = d > .3 ? Math.atan2(dy, dx) : Math.atan2(b.y - shot.shooter.y, b.x - shot.shooter.x) + PI; b.vx = Math.cos(a) * 95; b.vy = Math.sin(a) * 95; b.vz = Math.max(b.vz, 30); if (b.rimT <= 0) rimContact(i, 60); }
    // the net: inside the cone under the rim, it drags the ball and ripples
    if (b.z < RIM_Z && b.z > 62 && d < RIM_R - 1.5) { const k = Math.exp(-h * 9); b.vx *= k; b.vy *= k; if (b.vz < -40) b.vz = lerp(b.vz, -40, 1 - Math.exp(-h * 6)); b.x -= dx * 3 * h; b.y -= dy * 3 * h; }
    // a basket: down through the ring's plane near its centre
    if (b.prevZ >= RIM_Z && b.z < RIM_Z && d < 6.75 && !b.scored && b.state !== 'dead') { b.scored = true; onBasket(i); }
  }
  if (b.scored && b.z < 58) b.scored = false;
  // the backboards: true planes facing the court
  for (let i = 0; i < 2; i++) {
    const X = BOARD_X[i], s = RIMS[i].side, face = X - s * BALL_R;   // left board faces +x
    if (ghost || b.y < BOARD_Y[0] - 2 || b.y > BOARD_Y[1] + 2 || b.z < BOARD_Z[0] - 3 || b.z > BOARD_Z[1] + 3 || !ARENA.hoops[i] || !ARENA.hoops[i].glass) continue;
    if (s < 0 ? (b.x < face && b.x > X - 6) : (b.x > face && b.x < X + 6)) { b.x = face; if (s < 0 ? b.vx < 0 : b.vx > 0) { b.vx = -b.vx * tune('boardBounce'); b.vy *= .9; boardContact(i, Math.abs(b.vx)); } }
  }
  // the floor
  if (b.z < BALL_R) {
    b.z = BALL_R;
    if (b.vz < -30) { b.vz = -b.vz * tune('ballBounce'); b.vx *= .9; b.vy *= .9; b.bounceN++; if (b.vz > 40) sfx(ARENA.court ? ARENA.court.dribble : 'dribble_maple', { vol: clamp(b.vz / 300, .15, .7) }); floorContact(); }
    else { b.vz = 0; const k = Math.exp(-h * 2.2); b.vx *= k; b.vy *= k; }
  }
  // the walls (the crowd throws it back)
  if (b.x < WALL.x0) { b.x = WALL.x0; b.vx = Math.abs(b.vx) * .5; } if (b.x > WALL.x1) { b.x = WALL.x1; b.vx = -Math.abs(b.vx) * .5; }
  if (b.y < WALL.y0) { b.y = WALL.y0; b.vy = Math.abs(b.vy) * .5; } if (b.y > WALL.y1) { b.y = WALL.y1; b.vy = -Math.abs(b.vy) * .5; }
  if (b.z > 400) { b.z = 400; b.vz = -Math.abs(b.vz) * .3; }
}
function rimContact(i, v) {
  const b = S.ball; if (b.rimT > 0) return; b.rimT = .08;
  hoopHit(i, clamp(v / 200, .2, 1.2)); sfx('rim', { vol: clamp(v / 260, .2, .8) });
  if (b.shot) { b.shot.rimmed = true; if (!b.shot.made && b.state === 'shot') resetShotClock(); }
  if (b.state === 'shot' && !(b.shot && b.shot.made)) { b.state = 'loose'; b.lastTouch = b.shot ? b.shot.shooter : b.lastTouch; }
  P.sparks(b.x, b.y, b.z, 3, 0, { color: '#ff9a3a' });
  emit('rim', { rim: i, v });
}
function boardContact(i, v) {
  const b = S.ball; sfx('backboard', { vol: clamp(v / 300, .2, .8) }); if (b.shot) b.shot.boarded = true;
  if (b.state === 'shot' && !(b.shot && b.shot.made)) { b.state = 'loose'; resetShotClock(); }
  hoopHit(i, .3); emit('backboard', { rim: i });
}
function floorContact() {
  const b = S.ball;
  if (b.state === 'shot') { const sh = b.shot; b.state = 'loose'; if (sh && !sh.rimmed && !sh.boarded && !sh.made && !sh.blocked) { sh.airball = true; emit('airball', { slot: sh.shooter.slot, name: sh.shooter.def.name }); } }
}
/** the ball's world position while held: the anim system writes the hand anchor (ballAt) each step */
function ballHeldStep(dt) {
  const b = S.ball, p = b.owner; if (!p) return;
  const at = p.ballAt; if (at) { b.vx = (at[0] - b.x) / Math.max(dt, 1e-4); b.vy = (at[1] - b.y) / Math.max(dt, 1e-4); b.vz = (at[2] - b.z) / Math.max(dt, 1e-4); b.x = at[0]; b.y = at[1]; b.z = at[2]; }
  b.roll += Math.hypot(p.vx, p.vy) * dt;
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
}
/** a planned pass: a path from A to the receiver over T seconds, its height by kind ('chest', 'bounce', 'lob', 'oop') */
function passStep(dt) {
  const b = S.ball, ps = b.pass; ps.t += dt;
  const u = clamp(ps.t / ps.T, 0, 1.6), x = ps.ax + (ps.bx - ps.ax) * u, y = ps.ay + (ps.by - ps.ay) * u;
  let z;
  if (ps.kind === 'bounce') z = u < .55 ? lerp(ps.az, BALL_R, (u / .55) ** 1.3) : lerp(BALL_R, ps.bz, ((u - .55) / .45) ** .8);
  else { const lin = lerp(ps.az, ps.bz, u); z = lin + ps.arc * 4 * u * (1 - u); }
  if (ps.kind === 'bounce' && u >= .55 && !ps.bounced) { ps.bounced = true; sfx(ARENA.court.dribble, { vol: .3 }); }
  b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; b.vz = (z - b.z) / dt; b.x = x; b.y = y; b.z = Math.max(BALL_R, z);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
  if (u >= 1.6) { b.state = 'loose'; b.pass = null; }   // nobody caught it: it flies on, free
}


/* ==== 31-player.js ==== */
/* 31-player: a player on the court ("baller"): its rig, ratings, body, turbo, juice, heat and Supernova, power-up,
 * stats, and the input source that writes its command each step (a local device, a CPU brain, the network, a script).
 * The match never reads a device directly: every slot reads a command from its source. */
const blankCmd = () => ({ mx: 0, my: 0, shootD: false, shootP: false, shootR: false, passP: false, turboD: false, shoveP: false, oopP: false, tauntP: false });
const ratingF = {
  zoom: r => .86 + .028 * r, splash: r => .78 + .045 * r, deep: r => .70 + .06 * r, slam: r => .75 + .05 * r,
  swipe: r => .55 + .09 * r
};
/** a Humanoid dressed as a player of a team: jersey, trim, shorts and socks, sneakers, hair; the pose layer installed */
function dressPlayer(def, teamId, extra = {}) {
  const t = get('team', teamId || def.team), C = t.colors, R = def.rig, o = {
    size: R.size, build: R.build, weapon: null, outfit: 'shirt', sleeves: 'none', hair: R.hair, hat: R.hat || null, hunch: R.hunch || 0,
    shorts: { len: .55, sock: C.sock, sockLen: .35 }, eyeGlow: R.robot ? R.eye : null, face: R.gorilla ? { eyes: 'big', bangs: 0 } : undefined,
    colors: { skin: R.skin, hair: R.hairColor, cloth: C.jersey, trim: C.trim, pants: C.shorts, boot: C.sneaker, belt: C.shorts, glove: R.glove || R.skin }
  };
  if (R.legs) { o.legUpper = 7.4 * R.legs; o.legLower = 7.4 * R.legs; o.hipZ = 14.3 * R.legs; }
  const rig = new E.Humanoid(Object.assign(o, extra));
  rig.bb = { pose: null, w: 0, def, shades: !!R.shades, robot: !!R.robot, headR: rig.o.headR };
  installPoseLayer(rig);
  return rig;
}
/** a rig for a story character (CAST) */
function castRig(id) { const c = CAST[id]; const rig = new E.Humanoid(Object.assign({ weapon: null }, c.rig)); rig.bb = { pose: null, w: 0, headR: rig.o.headR }; installPoseLayer(rig); return rig; }

class Baller {
  constructor(slot, team, def, teamId) {
    this.slot = slot; this.team = team; this.def = def; this.id = def.id; this.r = def.ratings; this.teamId = teamId;
    this.rig = dressPlayer(def, teamId);
    this.x = CMX; this.y = CMY; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.facing = team === 0 ? 0 : PI;
    this.state = 'run'; this.st = 0; this.cmd = blankCmd(); this.source = null; this.human = null;
    this.turbo = 1; this.turboIdle = 0; this.juice = 1; this.heat = 0; this.nova = 0; this.novaBaskets = 0;
    this.cd = { steal: 0, shove: 0, spin: 0, catch: 0, jump: 0, squeak: 0 }; this.windup = 0; this.act = null; this.holdT = 0; this.kdT = .8; this.landK = 1; this.flashT = 0; this.hangT = 0;
    this.jump = null; this.dunk = null; this.kd = 0; this.dizzy = 0; this.clip = null; this.clipT = 0; this.clipX = {};
    this.dribble = { ph: 0, side: 1, cross: 0 }; this.ballAt = null; this.hasBallT = 0; this.knocks = []; this.rebootT = 0; this.overclock = 0;
    this.pu = null; this.call = 0; this.order = null; this.ghostT = 0; this.landT = 0; this.slip = 0;
    this.stats = { PTS: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, DNK: 0, REB: 0, AST: 0, STL: 0, BLK: 0, KD: 0, SHT: 0, NOVA: 0 };
    this.brain = null;
  }
  get name() { return this.def.name; }
  get mate() { return S.players.find(q => q.team === this.team && q !== this); }
  get foes() { return S.players.filter(q => q.team !== this.team); }
  get has() { return S.ball && S.ball.state === 'held' && S.ball.owner === this; }
  get size() { return this.def.rig.size; }
  /** the juice factor and rating factors */
  jf() { return .85 + .15 * this.juice; }
  f(k) { return ratingF[k](this.r[k]) * this.jf(); }
  /** how high this player's hands reach standing (arms up), world units */
  reach() { const o = this.rig.o; return (o.hipZ + o.torso + (o.armUpper + o.armLower) * .95) * o.size; }
  shoulderZ() { const o = this.rig.o; return (o.hipZ + o.torso) * o.size; }
  onFloor() { return this.z <= .01 && !['air', 'dunk', 'hang'].includes(this.state); }
  /** can this player be controlled right now (not knocked down, frozen, flying a dunk...) */
  free() { return this.state === 'run' || this.state === 'cele' || this.state === 'taunt'; }
  isNova() { return this.nova > 0 || this.overclock > 0 || (S.cheats.novaHome && this.team === 0) || (S.cheats.novaAway && this.team === 1); }
  infTurbo() { const c = S.cheats.infTurbo; return this.isNova() || c === 'all' || (c === 'p1' && this.human === 0) || (c === 'team' && S.cheats.infTurboTeam === this.team) || !!(S.attract && S.attract.cheat); }
  setState(s) { this.state = s; this.st = 0; }
}
/* ---- input sources ---- */
/** a local device: game.players[i] (P1..P4), read as a command; the screen direction it pushes becomes a ground direction */
function localSource(input) {
  return { kind: 'local', input, read(p) {
    const I = input, c = blankCmd(), m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
    c.mx = d[0]; c.my = d[1];
    c.shootD = I.down('shoot'); c.shootP = I.pressed('shoot'); c.shootR = I.released('shoot');
    c.passP = I.pressed('pass'); c.turboD = I.down('turbo'); c.shoveP = I.pressed('shove'); c.oopP = I.pressed('oop'); c.tauntP = I.pressed('taunt');
    if (c.turboD && c.passP && !p.has && !(S.ball && S.ball.owner && S.ball.owner.team === p.team)) { c.passP = false; c.shoveP = true; }   // turbo + pass without the ball also shoves
    return c;
  } };
}
/** a CPU brain (34-ai) */
function cpuSource() { return { kind: 'cpu', read(p, dt) { return aiThink(p, dt); } }; }
/** a scripted list of commands by time (tests, attract) */
function scriptSource(steps) { let t = 0; return { kind: 'script', read(p, dt) { t += dt; const c = blankCmd(); for (const [t0, t1, o] of steps) if (t >= t0 && t < t1) Object.assign(c, o); return c; } }; }
function setSource(p, src) { p.source = src; if (src.kind !== 'local') p.human = null; }

/* ---- movement, turbo, juice: a player's body each step ---- */
function moveSpeed(p) {
  let sp = tune('runSpeed') * p.f('zoom');
  if (p.turboOn) sp *= tune('turboMult');
  if (p.pu && p.pu.id === 'rocket') sp *= 1.4;
  if (p.has) sp *= .96;
  return sp;
}
function locomote(p, c, dt, k = 1) {
  const m = Math.min(1, Math.hypot(c.mx, c.my)), sp = moveSpeed(p) * k, onOil = TWIST.oil && onSlick(p.x, p.y);
  const acc = tune('accel') * (onOil ? .15 : 1) * (p.pu && p.pu.id === 'rocket' ? 1.3 : 1);
  const tvx = c.mx * sp, tvy = c.my * sp;
  // a hard turn at speed squeaks (and on an oil slick at turbo speed, may slip)
  const v0 = Math.hypot(p.vx, p.vy);
  if (m > .5 && v0 > 80) {
    const turn = Math.abs(E.angDiff(Math.atan2(p.vy, p.vx), Math.atan2(c.my, c.mx)));
    if (turn > 1.6 && p.cd.squeak <= 0) { p.cd.squeak = .35; sfx('squeak', { vol: .25 }); P.dust(p.x, p.y, 0, 3); if (onOil && p.turboOn && S.rng() < .3) { slipOnOil(p); return; } }
  }
  p.vx = approach(p.vx, tvx, acc * dt); p.vy = approach(p.vy, tvy, acc * dt);
  if (onOil && m < .2) { p.vx *= Math.exp(-dt * .5); p.vy *= Math.exp(-dt * .5); }
  // facing: toward the move; a defender with the ball in front faces the handler (a defensive shuffle)
  const b = S.ball, h = b && b.state === 'held' ? b.owner : null;
  if (h && h.team !== p.team && dist2(p.x, p.y, h.x, h.y) < 70 && !p.has) p.facing = E.approachAng(p.facing, Math.atan2(h.y - p.y, h.x - p.x), dt * 10);
  else if (m > .2) p.facing = E.approachAng(p.facing, Math.atan2(c.my, c.mx), dt * (p.has ? 10 : 14));
}
function turboStep(p, c, dt) {
  const moving = Math.hypot(p.vx, p.vy) > 20;
  p.turboOn = c.turboD && p.turbo > 0.01 && p.state === 'run';
  if (p.infTurbo()) { p.turbo = 1; return; }
  if (c.turboD && moving) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt); p.turboIdle = 0; p.juice = Math.max(0, p.juice - .01 * dt * tune('fatigue')); }
  else if (!c.turboD) {
    p.turboIdle += dt;
    if (p.turboIdle > tune('turboRefillDelay')) { const k = (p.pu && p.pu.id === 'rocket' ? 2 : 1) * (1 + .5 * comebackK(p.team)); p.turbo = Math.min(1, p.turbo + tune('turboRefill') * k * dt); }
  }
}
/** the team trailing gets a little help (PLAN 8, comeback assist): 0..1 */
function comebackK(team) {
  const M = S.match; if (!M || M.quarter < 2 || M.tournament) return 0;
  const d = M.score[1 - team] - M.score[team]; if (d < 4) return 0;
  const c = M.comeback !== undefined ? M.comeback : tune('comeback');
  return c * Math.min(d, 15) / 15;
}
/** walls: invisible, 24 outside the lines */
function clampToArena(p) {
  const r = 6;
  if (p.x < WALL.x0 + r) { p.x = WALL.x0 + r; p.vx = Math.max(0, p.vx); } if (p.x > WALL.x1 - r) { p.x = WALL.x1 - r; p.vx = Math.min(0, p.vx); }
  if (p.y < WALL.y0 + r) { p.y = WALL.y0 + r; p.vy = Math.max(0, p.vy); } if (p.y > WALL.y1 - r) { p.y = WALL.y1 - r; p.vy = Math.min(0, p.vy); }
}
/** players push each other apart (no damage); box-outs: the stronger holds its spot */
function separate(dt) {
  const L2 = S.players;
  for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) {
    const a = L2[i], b = L2[j]; if (a.state === 'dunk' || b.state === 'dunk' || a.state === 'hang' || b.state === 'hang' || a.state === 'knock' || b.state === 'knock') continue;
    if (Math.abs(a.z - b.z) > 30) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = 11;
    if (d < min && d > .01) {
      const push = (min - d), ka = a.team !== b.team ? clamp(.5 + (b.r.bump - a.r.bump) * .05, .2, .8) : .5;
      a.x -= dx / d * push * ka; a.y -= dy / d * push * ka; b.x += dx / d * push * (1 - ka); b.y += dy / d * push * (1 - ka);
    }
  }
}
/** juice: knockdowns, turbo and minutes on the court wear a player down; breaks restore it */
function juiceStep(p, dt) { p.juice = Math.max(0, p.juice - .004 * dt * tune('fatigue')); }


/* ==== 32-anim.js ==== */
/* 32-anim: the basketball layer over the engine's procedural rig. The rig poses itself (walk, run, jump tuck, knockdown,
 * flips, faces); a pose layer wrapped round rig.solvePose then moves the hands with two-bone IK to the targets of the
 * current clip (06-data-moves): hands that hold and dribble the ball, shooting form, dunk choreography, hanging on the
 * rim, celebrations and taunts. The dribble is procedural and drives the ball itself; the ball rides the hands. */
const V3 = E.V3, HEROIC_SH = 23.9;
function installPoseLayer(rig) { const base = rig.solvePose; rig.solvePose = function () { base.call(this); poseLayer(this); }; }
function poseLayer(rig) {
  const bb = rig.bb, P = bb && bb.pose; if (!P || bb.w <= .001 || !rig.J.shR) return;
  const o = rig.o, J = rig.J, w = Math.min(1, bb.w), kr = (o.armUpper + o.armLower) / 10.9;
  for (const s of [1, -1]) {
    const T = s > 0 ? P.R : P.L; if (!T) continue;
    const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? J.handR : J.handL;
    const tgt = P.abs ? T : [J.shC[0] + T[0] * kr, J.shC[1] + T[1] * kr, J.shC[2] + (T[2] - HEROIC_SH) * kr];
    const goal = V3.lerp(hand, tgt, w), [el, h2] = E.ik3(sh, goal, o.armUpper, o.armLower, P.hint ? [P.hint[0], s * P.hint[1], P.hint[2]] : [-1, s * .8, -.15]);
    J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2;
  }
}
/** a world offset (from the rig's feet) turned into the rig's own frame at size 1 (the inverse of rig.worldOffset) */
function toLocal(rig, dx, dy, dz) {
  const a = rig.facing + rig.spin + (rig._cheat || 0), c = Math.cos(a), s = Math.sin(a), k = (1 - rig.sq * .4) * rig.o.size, kz = (1 + rig.sq) * rig.o.size;
  return [(dx * c + dy * s) / k, (-dx * s + dy * c) / k, dz / kz];
}
/** where the ball sits for a pose: in the hands ('both'), the right hand ('R'), or the dribble; a world point */
function ballAnchor(p, P) {
  const rig = p.rig, J = rig.J, br = BALL_R / rig.o.size;
  if (!P || !P.ball) return null;
  let loc;
  if (P.ball === 'dribble') loc = P.ballLoc;
  else if (P.ball === 'both') { const m = V3.lerp(J.handR, J.handL, .5); loc = V3.add(m, [br * .55, 0, J.handR[2] > J.shC[2] ? br * .4 : 0]); }
  else { const h = P.ball === 'L' ? J.handL : J.handR; loc = V3.add(h, h[2] > J.shC[2] + 2 ? [.4, 0, br * .95] : [br * .8, 0, -br * .2]); }
  const w = rig.worldOffset(loc); return [rig.x + w[0], rig.y + w[1], rig.z + w[2]];
}
/** the procedural dribble: the ball falls from the hand to the floor and back as two parabolas; the hand meets it at the
 *  top; a crossover swaps sides in front of the body */
function dribblePose(p, dt) {
  const D = p.dribble, o = p.rig.o, sz = o.size, br = BALL_R / sz, moving = Math.hypot(p.vx, p.vy) > 25;
  const rate = p.turboOn ? 3.8 : moving ? 3.0 : 2.2, before = D.ph;
  D.ph += rate * dt; if (D.ph >= 1) D.ph -= 1;
  if (before < .5 && D.ph >= .5 && p.z < 1) { sfx(ARENA.court ? ARENA.court.dribble : 'dribble_maple', { vol: .32, at: p }); emit('dribble', { slot: p.slot }); }
  // crossover: a sharp turn, or a defender reaching at the dribble side
  const foe = p.foes.find(q => dist2(q.x, q.y, p.x, p.y) < 22);
  if (foe) { const rel = toLocal(p.rig, foe.x - p.x, foe.y - p.y, 0); if (Math.sign(rel[1]) === D.side && D.ph < .5 && D.cross <= 0) { D.side = -D.side; D.cross = .5; } }
  D.cross = Math.max(0, D.cross - dt);
  D.lat = approach(D.lat === undefined ? 6 : D.lat, D.side * 6, dt * 46);
  const zt = o.hipZ * .92 - br, zb = br, f = D.ph;
  const z = f < .5 ? zt - (zt - zb) * (f / .5) ** 2 : zb + (zt - zb) * (1 - ((1 - f) / .5) ** 2);
  const ballLoc = [5.2 / sz * 1.6, D.lat / sz * 1.3, z];
  const contact = f > .85 || f < .15, hs = Math.sign(D.lat) || D.side;
  const handT = contact ? [ballLoc[0], ballLoc[1], z + br + .4] : [ballLoc[0] - .3, ballLoc[1], zt + br + 1.4];
  const off = [3.8, -hs * 4.6, o.hipZ + 2.5];
  return hs > 0 ? { abs: true, R: handT, L: off, ball: 'dribble', ballLoc } : { abs: true, L: handT, R: off, ball: 'dribble', ballLoc };
}
/** interpolate a dunk's hand keys at progress u (eased between keys) */
function dunkKeys(def, u) {
  const K = def.keys; let a = K[0], b = K[K.length - 1];
  for (let i = 0; i < K.length - 1; i++) if (u >= K[i][0] && u <= K[i + 1][0]) { a = K[i]; b = K[i + 1]; break; }
  if (u > K[K.length - 1][0]) { a = b; }
  const k = a === b ? 0 : E.ease.inOutSine((u - a[0]) / (b[0] - a[0])), out = {};
  for (const h of ['R', 'L']) { const A2 = a[1][h] || (b[1][h]), B2 = b[1][h] || A2; out[h] = A2 && B2 ? V3.lerp(A2, B2, k) : null; }
  return out;
}
/** pick the pose for a player's state this step, update its rig, and place the ball if it rides the hands */
function animStep(p, dt) {
  const rig = p.rig, bb = rig.bb, b = S.ball;
  let P = null, air = false, flip = 0, spin = 0, down = 0, hurt = false, pose = null, expr = null, hop = 0, turn = 0, land = 0;
  const holding = b && b.owner === p && (b.state === 'held' || b.state === 'dunk');
  const clip = (id, t, x) => CLIPS[id] ? CLIPS[id](t, x || {}) : null;
  switch (p.state) {
    case 'run':
      if (p.act) P = clip(p.act.id, p.act.t);
      else if (holding) P = p.holdT > 0 ? clip('hold', p.st) : dribblePose(p, dt);
      else if (p.call > 0) P = clip('call', p.st);
      else if (b && b.state === 'pass' && b.pass && b.pass.to === p && b.pass.T - b.pass.t < .35) P = clip('catch', 0);
      else { const h = b && b.state === 'held' ? b.owner : null; if (h && h.team !== p.team && dist2(h.x, h.y, p.x, p.y) < 60) P = clip('defense', p.st, { hands: h.state === 'air' || h.state === 'gather' }); }
      break;
    case 'gather': P = clip('gather', p.st); break;
    case 'air': {
      air = p.z > 3; const J2 = p.jump || {};
      if (J2.kind === 'shot') P = clip('jumpshot', p.st, { released: J2.released });
      else if (J2.kind === 'layup') P = clip('layup', p.st, { u: J2.T ? p.st / J2.T : 0, released: J2.released });
      else if (J2.kind === 'block') P = clip('block', p.st, { swat: J2.swatT > 0 ? J2.swatT / .15 : 0 });
      else if (J2.kind === 'rebound') P = clip('rebound', p.st, { got: holding });
      else if (J2.kind === 'tip') P = clip('tipoff', p.st, {});
      else if (holding) P = clip('rebound', p.st, { got: true });
      if (J2.kind === 'drop' && p.dunkDef && p.dunkDef.split) P = { R: [4, 4, 30], L: [4, -4, 30] };
      break;
    }
    case 'dunk': {
      const d = p.dunk, u = clamp(d.t / d.T, 0, 1), def = d.def;
      P = dunkKeys(def, u); P.ball = holding ? (def.hands === 1 ? 'R' : 'both') : null; air = true;
      if (def.spin) { const [u0, u1] = def.spinU; spin = -TAU * def.spin * E.ease.inOutSine(clamp((u - u0) / (u1 - u0), 0, 1)); }
      if (def.flip) { const [u0, u1] = def.flipU; const k = clamp((u - u0) / (u1 - u0), 0, 1); flip = k > 0 && k < 1 ? k : 0; }
      if (def.reverse && u > .35) turn = PI;
      expr = u > .6 ? 'shout' : null;
      if (d.oop && !holding && b && b.state === 'pass') P = { R: [6, 2, 44], L: [6, -2, 44] };
      break;
    }
    case 'hang': {   // hands on the rim (two points of the ring, turned into the rig's frame), legs swinging below
      const rim = attackRim(p.team), a = Math.atan2(p.y - rim.y, p.x - rim.x), L2 = [];
      for (const s of [1, -1]) { const ra = a + s * .55, wx = rim.x + Math.cos(ra) * RIM_R - p.x, wy = rim.y + Math.sin(ra) * RIM_R - p.y; L2.push(toLocal(rig, wx, wy, RIM_Z - p.z)); }
      P = { abs: true, R: L2[1], L: L2[0], hint: [-1, .6, -.3] }; air = true; expr = 'shout';
      break;
    }
    case 'knock': down = p.st < p.kdT - .25 ? 1 : 0; hurt = p.st < .3; expr = 'wince'; break;
    case 'getup': down = 0; break;
    case 'spin': P = clip('spin', p.st); P.ball = holding ? 'R' : null; spin = -TAU * clamp(p.st / .35, 0, 1); break;
    case 'steal': P = clip('steal', p.st); break;
    case 'shove': P = clip('shove', p.st); expr = 'angry'; break;
    case 'stumble': hurt = true; expr = 'wince'; P = { R: [2, 9, 26], L: [2, -9, 30] }; break;
    case 'frozen': hurt = (Math.floor(p.st * 12) % 2) === 0; P = { R: [6, 3, 14 + (Math.floor(p.st * 9) % 3) * 6], L: [3, -6, 20] }; break;
    case 'cele': case 'taunt': { const c = clip(p.clip, p.st); P = c; if (c) { expr = c.expr || 'smile'; hop = c.hop || 0; turn = c.turn || 0; if (c.crouch > .3) pose = 'crouch'; } break; }
    case 'inbound': P = clip('inbound', p.st, { thrown: !holding }); break;
    case 'idle': if (p.clip) { const c = clip(p.clip, p.st); P = c; if (c) { expr = c.expr || null; hop = c.hop || 0; turn = c.turn || 0; } } break;
  }
  if (P && P.crouch > .3 && !pose) pose = 'crouch';
  if (p.landT > 0) { land = p.landK || 1; p.landT = 0; }
  bb.pose = P; bb.w = approach(bb.w, P ? 1 : 0, dt * (P ? 16 : 8));
  const big = S.cheats.bigHeads || (game.settings && game.settings.bigHeads); rig.o.headR = bb.headR * (big ? 1.9 : 1);
  const vx = p.state === 'dunk' || p.state === 'hang' ? 0 : p.vx, vy = p.state === 'dunk' || p.state === 'hang' ? 0 : p.vy;
  rig.update(dt, { x: p.x, y: p.y, z: p.z + hop, vx, vy, facing: p.facing + turn + spin, air, flip, down, hurt, pose, expr, land, run: p.state === 'frozen' ? 0 : undefined });
  if (holding) p.ballAt = ballAnchor(p, P) || [p.x + Math.cos(p.facing) * 6, p.y + Math.sin(p.facing) * 6, p.z + 22];
  else p.ballAt = null;
}
/** where a player's hands are now (world), for catches and blocks */
function handsAt(p) {
  const r = p.rig, J = r.J; if (!J.handR) return [p.x, p.y, p.z + p.shoulderZ()];
  const m = V3.lerp(J.handR, J.handL, .5), w = r.worldOffset(m); return [p.x + w[0], p.y + w[1], p.z + w[2]];
}
/** a player drawn: shadow, the rig (x-ray for humans so they stay findable), Supernova afterimages, the number,
 *  shades, a robot's glow, dizzy stars */
function drawPlayer(r, p) {
  const rig = p.rig, nova = p.isNova();
  r.shadow(p.x, p.y, 7 * Math.max(.5, 1 - p.z / 160), .45);
  const opts = { xray: p.human !== null && p.human !== undefined ? { color: E.PLAYER_COLORS[p.human] || '#8fe3ff' } : false };
  if (nova) opts.ghost = { color: p.overclock > 0 ? '#ff3a3a' : '#ffd23a', life: .18, alpha: .45, owner: p };
  if (p.state === 'frozen') opts.flash = '#8ac8ff';
  if (p.flashT > 0) { opts.flash = '#ffffff'; opts.flashMix = .7; }
  r.actor(p.x, p.y, p.z, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    const v = r.view, J = rig.J;
    if (J.head && rig.bb.shades) { const w = rig.worldOffset(V3.add(J.head, [rig.o.headR * .85, 0, 0])), x = ox + v.ax * w[0] + v.ay * w[1], y = oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2]; px.rect(g, Math.round(x) - 2, Math.round(y) - 1, 4, 1, '#0a0a10'); }
    if (J.shC && p.state !== 'knock') {   // the jersey number, when the chest or back faces the camera
      const toCam = Math.sin(rig.facing + rig.spin + (rig._cheat || 0)); if (Math.abs(toCam) > .45) {
        const w = rig.worldOffset(V3.add(J.shC, [toCam > 0 ? 1.4 : -1.4, 0, -4])), x = ox + v.ax * w[0] + v.ay * w[1], y = oy + v.bx * w[0] + v.by * w[1] + v.bz * w[2];
        E.font.text(g, String(p.def.number), Math.round(x), Math.round(y) - 2, get('team', p.teamId).colors.trim, { font: 'tiny', align: 'center', outline: false });
      }
    }
  }, opts);
  if (p.dizzy > 0 || p.state === 'stumble') r.queue(p.x, p.y, p.z + 60, g => { const h = rig.head(), [x, y] = r.w(h[0], h[1], h[2] + 7); for (let k = 0; k < 3; k++) { const a = game.time * 7 + k * 2.1; px.dot(g, Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 2), '#ffe040'); px.dot(g, Math.round(x + Math.cos(a) * 6) + 1, Math.round(y + Math.sin(a) * 2), '#fff8b0'); } }, { emissive: true });
}


/* ==== 33-actions.js ==== */
/* 33-actions: what players do. Jump shots (decided at release, then flown: PLAN 6.7), layups, dunks from the catalog with
 * their flights and slams (6.8), alley-oops, putbacks, posters, passes (chest, bounce, lob, flair), steals, shoves and
 * knockdowns, spin moves, blocks and goaltending (6.10), rebounds and loose balls (6.11), and the state machine that
 * runs each player every step from its command. */
const isLocal = p => p.source && (p.source.kind === 'local' || p.source.kind === 'net' || p.source.kind === 'script');
const matchLive = () => S.match && (S.match.phase === 'live' || S.match.phase === 'buzzer');
const pGravity = p => tune('playerGravity') * (S.cheats.moonGravity ? .55 : 1) * (p && p.pu && p.pu.id === 'moon' ? .7 : 1);

/* ---- the shot model ---- */
function baseChance(d) {
  if (d <= 40) return .85; if (d <= 80) return lerp(.85, .70, (d - 40) / 40); if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64); if (d <= 320) return lerp(.30, .08, (d - 200) / 120); return .03;
}
/** the chance a shot from (x, y) goes in, with its breakdown (dev overlay): o { x, y, release: 'perfect'|'ok'|'bad', layup } */
function shotChance(p, o = {}) {
  const rim = attackRim(p.team), x = o.x === undefined ? p.x : o.x, y = o.y === undefined ? p.y : o.y, d = dist2(x, y, rim.x, rim.y), three = !o.layup && isThree(x, y, rim);
  const base = o.layup ? .85 : baseChance(d), rf = three ? p.f('deep') : p.f('splash');
  const rel = o.release === 'perfect' ? 1 + tune('perfectBonus') : o.release === 'bad' ? 1 - tune('badReleasePenalty') : 1;
  let contest = 1;
  for (const q of p.foes) {
    if (q.state === 'knock' || q.state === 'frozen') continue;
    const dq = dist2(q.x, q.y, x, y), between = dist2(q.x, q.y, rim.x, rim.y) < d + 8;
    if (!between) continue;
    if (dq < 30) contest = Math.min(contest, q.z > 6 ? 1 - tune('contestPenalty') : .8); else if (dq < 50) contest = Math.min(contest, .92);
  }
  let pr = base * rf * rel * contest * tune('shotSkill') * (three ? tune('threeSkill') : 1);
  if (p.turboOn) pr *= 1.05;
  const toRim = Math.atan2(rim.y - y, rim.x - x), lat = Math.abs(-Math.sin(toRim) * p.vx + Math.cos(toRim) * p.vy); if (lat > 70) pr *= .9;
  if (TWIST.windOn) pr *= 1 - .35 * Math.hypot(TWIST.windX, TWIST.windY) * Math.min(1, d / 320);
  let bonus = S.lesson && S.lesson.bonus && isLocal(p) ? S.lesson.bonus : 0; if (p.isNova()) bonus += tune('novaShotBonus'); if (p.pu && p.pu.id === 'laser') bonus += .3; bonus += comebackK(p.team) * .12;
  pr = clamp(pr + bonus, .02, .97);
  if (S.cheats.shots === 'in') pr = 1; if (S.cheats.shots === 'out') pr = 0;
  return { p: pr, d, three, base, rf, rel, contest, bonus };
}
function startShot(p) { p.setState('gather'); p.vx *= .3; p.vy *= .3; p.jumpTurbo = p.turboOn; sfx('jump', { vol: .15 }); }
function jumpUp(p, kind, vz, extra = {}) {
  p.setState('air'); p.vz = vz; p.z = Math.max(p.z, .01); p.jump = Object.assign({ kind, x0: p.x, y0: p.y, ta: vz / pGravity(p), released: false, tried: new Set() }, extra);
  p.rig.kick(1); p.cd.jump = .25;
  emit('jump', { slot: p.slot, kind });
}
function jumpSpeed(p, base) {
  let v = base + 10 * p.r.swat; if (p.jumpTurbo || p.turboOn) v *= 1.15; if (p.pu && p.pu.id === 'moon') v *= 1.5; return v;
}
/** let the jumper's ball go: decide the shot, then fly it to its decided target */
function releaseShot(p) {
  const J = p.jump; if (J.released || !p.has) return;
  J.released = true;
  const win = tune('perfectWindow') * (p.pu && p.pu.id === 'laser' ? 2 : 1), diff = p.st - J.ta;
  const release = Math.abs(diff) <= win / 2 ? 'perfect' : Math.abs(diff) <= win ? 'ok' : 'bad';
  const ch = shotChance(p, { x: J.x0, y: J.y0, release, layup: J.kind === 'layup' });
  launchShot(p, ch, { release, perfect: release === 'perfect', layup: J.kind === 'layup', early: diff < 0 });
}
/** decide and launch: made goes to the rim's centre (a quarter of them rattle in), missed to the iron or the glass */
function launchShot(p, ch, o = {}) {
  if (S.attract && S.attract.nextMiss) { S.attract.nextMiss = false; ch = Object.assign({}, ch, { p: 0 }); }
  if (S.attract && S.attract.nextMake) { S.attract.nextMake = false; ch = Object.assign({}, ch, { p: 1 }); }
  const b = S.ball, rim = attackRim(p.team), ri = RIMS.indexOf(rim), made = S.rng() < ch.p, three = ch.three;
  const from = { x: b.x, y: b.y, z: b.z }, d = dist2(from.x, from.y, rim.x, rim.y);
  const toward = Math.atan2(from.y - rim.y, from.x - rim.x);   // from the rim back toward the shooter
  let tgt, rattle = false, air = false;
  if (made) {
    rattle = S.rng() < .25 && !o.layup;
    const a = S.rng() * TAU; tgt = { x: rim.x + (rattle ? Math.cos(a) * 2.5 : 0), y: rim.y + (rattle ? Math.sin(a) * 2.5 : 0), z: RIM_Z - .5 };
  } else {
    const err = S.rng();
    if (ch.p < .2 && err < .35 && d > 90) { air = true; const k = S.rng() < .5 ? -1 : 1; tgt = { x: rim.x + Math.cos(toward) * (k > 0 ? -40 : 30), y: rim.y + Math.sin(toward) * 30 + (S.rng() - .5) * 30, z: BALL_R }; }
    else if (err < .4) tgt = { x: rim.x + Math.cos(toward) * (RIM_R + 2.2), y: rim.y + Math.sin(toward) * (RIM_R + 2.2), z: RIM_Z + 1 };   // front rim
    else if (err < .7) tgt = { x: rim.x - Math.cos(toward) * (RIM_R + 1.5), y: rim.y - Math.sin(toward) * (RIM_R + 1.5), z: RIM_Z + 2 };   // back rim
    else if (err < .88) { const s = S.rng() < .5 ? 1 : -1, a = toward + s * PI / 2; tgt = { x: rim.x + Math.cos(a) * (RIM_R + 2), y: rim.y + Math.sin(a) * (RIM_R + 2), z: RIM_Z + 1 }; }   // side rim
    else tgt = { x: BOARD_X[ri] - rim.side * (BALL_R + .5), y: rim.y + (S.rng() - .5) * 30, z: RIM_Z + 12 };   // off the glass
  }
  const g = tune('ballGravity') * (S.cheats.moonGravity ? .55 : 1), apex = clamp(18 + d * .10, 18, 60) * tune('shotArc') * (o.layup ? .45 : 1);
  const v = E.arc(from, tgt, g, { apex });
  if (TWIST.windOn) { const ax = TWIST.windX * tune('windStrength'), ay = TWIST.windY * tune('windStrength'); v.vx -= .5 * ax * v.t; v.vy -= .5 * ay * v.t; }
  b.state = 'shot'; b.owner = null; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.lastTouch = p; b.noCatch = .25; b.noCatchBy = p;
  b.shot = { shooter: p, team: p.team, rim: ri, points: three ? 3 : 2, made, rattle, chance: ch.p, perfect: !!o.perfect, release: o.release, t: 0, dist: d, layup: !!o.layup,
    jackpot: TWIST.jackpot && TWIST.spot && TWIST.spot.rim === ri && dist2(p.jump ? p.jump.x0 : p.x, p.jump ? p.jump.y0 : p.y, TWIST.spot.x, TWIST.spot.y) < 16 && !o.layup, airball: air };
  p.stats.FGA++; if (three) p.stats.TPA++;
  if (p.pu && p.pu.id === 'laser') { p.pu.shots--; if (p.pu.shots <= 0) endPowerup(p); }
  S.lastShot = { name: p.name, chance: ch.p, d: Math.round(d), three, release: o.release, contest: ch.contest, made };
  sfx('release', { vol: .3 }); emit('release', { slot: p.slot, name: p.name, made, chance: ch.p, perfect: !!o.perfect, release: o.release, three, layup: !!o.layup });
}
function startLayup(p) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), T = .56, tx = rim.x + (p.x - rim.x) * Math.min(1, 10 / Math.max(d, 1)), ty = rim.y + (p.y - rim.y) * Math.min(1, 10 / Math.max(d, 1));
  jumpUp(p, 'layup', pGravity(p) * T / 2 + 20, { T });
  p.vx = (tx - p.x) / T; p.vy = (ty - p.y) / T; p.facing = Math.atan2(rim.y - p.y, rim.x - p.x);
}

/* ---- dunks (PLAN 6.8, 10.3) ---- */
function dunkRange(p) {
  if (S.cheats.skyDunks) return CW / 2;
  let r = tune('dunkRange') * p.f('slam');
  if (p.isNova()) r += 40;
  if (p.pu && p.pu.id === 'moon') r = Math.max(r, THREE_R + 20);
  if (S.attract && S.attract.cheat) r = Math.max(r, 210);
  return r;
}
function onVent(p) { return TWIST.volcano && TWIST.vents.some(v => v.puff > 0 && dist2(p.x, p.y, v.x, v.y) < 18); }
function canDunk(p) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y);
  if (onVent(p) && (rim.side > 0 ? p.x > CMX : p.x < CMX)) return true;
  return (p.turbo >= .05 || p.infTurbo()) && d <= dunkRange(p) && d > 4;
}
function dunkNeeds(p, def, ctx) {
  if (def.needs === 'nova') return p.isNova();
  if (def.needs === 'vent') return !!ctx.vent;
  if (def.needs === 'quake') return (p.overclock > 0 && get('team', p.teamId).boss) || (p.pu && p.pu.id === 'moon' && ctx.roll < .5) || (p.isNova() && ctx.roll < .15) || ctx.forceQuake;
  return true;
}
function chooseDunk(p, d, ctx = {}) {
  if (ctx.force && get('dunk', ctx.force)) return get('dunk', ctx.force);
  if (ctx.vent) return get('dunk', 'volcano');
  const roll = S.rng(), approach = Math.abs(p.vy) > Math.abs(p.vx) * .84;
  const cands = all('dunk').filter(def => p.r.slam >= def.slam && d >= def.dist[0] && d <= def.dist[1] && dunkNeeds(p, def, Object.assign({ roll }, ctx)) && (!def.reverse || approach) && def.id !== 'volcano');
  if (!cands.length) return get('dunk', 'hammer');
  let tot = 0; const w = cands.map(def => { const k = (def.bonus + 40) * (p.r.slam - def.slam + 1) * (def.needs ? 3 : 1); tot += k; return k; });
  let x = S.rng() * tot; for (let i = 0; i < cands.length; i++) { x -= w[i]; if (x <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
/** take off: a flight from here to the slam point in front of the rim (the hands 6 above it); o: { oop, putback, vent, force } */
function startDunk(p, o = {}) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), vent = o.vent || onVent(p);
  const def = o.def || chooseDunk(p, d, { vent, force: o.force, forceQuake: o.forceQuake || p.forceQuake }); p.forceQuake = false;
  let ux = p.x - rim.x, uy = p.y - rim.y; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
  if (ux * rim.side > 0) ux = -ux * .5;   // from behind the board: come round to the court side
  const sl = { x: rim.x + ux * 8, y: rim.y + uy * 8, z: Math.max(4, RIM_Z + 6 - p.reach()) };
  const G = tune('dunkGravity') / (tune('dunkHang') ** 2) * (S.cheats.moonGravity ? .7 : 1), from = { x: p.x, y: p.y, z: p.z };
  const apex = (def.apexAbove * tune('dunkApex') + (p.pu && p.pu.id === 'moon' ? 20 : 0));
  const v = o.putback ? E.arc(from, sl, G, { time: .28 }) : E.arc(from, sl, G, { apex });
  p.setState('dunk'); p.vx = v.vx; p.vy = v.vy; p.vz = v.vz; p.dunkDef = def;
  p.dunk = { def, T: v.t, t: 0, G, sl, from, oop: !!o.oop, putback: !!o.putback, vent, blocked: false, slammed: false, apexT: Math.max(0, v.vz / G) };
  p.facing = Math.atan2(rim.y - p.y, rim.x - p.x); p.rig.kick(1.2);
  if (!o.oop) { const b = S.ball; if (b.owner === p) b.state = 'dunk'; }
  if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - .05);
  sfx('jump', { vol: .4 }); if (vent) { sfx('vent_puff'); P.smoke(p.x, p.y, 0, 12, { size: 1.4, color: '#e8e8f0' }); }
  emit('dunkStart', { slot: p.slot, name: p.name, dunk: def.id, banner: def.banner, T: v.t, apexT: p.dunk.apexT, oop: !!o.oop, putback: !!o.putback, vent: !!vent });
  return def;
}
function dunkStep(p, dt) {
  const d = p.dunk; d.t += dt;
  p.vz -= d.G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
  const b = S.ball;
  if (d.oop && b.owner !== p && b.state !== 'pass' && !d.slammed) { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; return; }   // the lob never came: fall
  if (d.t >= d.T && !d.slammed) { p.x = d.sl.x; p.y = d.sl.y; p.z = d.sl.z; if (b.owner === p) slam(p); else { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; p.vx = p.vy = 0; p.vz = 0; } }
}
function slam(p) {
  const d = p.dunk, def = d.def, rim = attackRim(p.team), ri = RIMS.indexOf(rim), b = S.ball;
  d.slammed = true;
  if (p.r.slam <= 3 && !p.isNova() && S.rng() < .04 && !S.cheats.shots) {   // the comedy miss: off the back rim
    b.state = 'loose'; b.owner = null; b.x = rim.x + rim.side * 4; b.y = rim.y; b.z = RIM_Z + 6; b.vx = -rim.side * 120; b.vy = (S.rng() - .5) * 60; b.vz = 160; b.shot = null; b.lastTouch = p;
    hoopHit(ri, 1); sfx('rim', { vol: .8 }); p.stats.FGA++; emit('dunkMiss', { slot: p.slot, name: p.name });
  } else {
    b.state = 'shot'; b.owner = null; b.x = rim.x; b.y = rim.y; b.z = RIM_Z + 5; b.vx = 0; b.vy = 0; b.vz = -260; b.lastTouch = p;
    b.shot = { shooter: p, team: p.team, rim: ri, points: 2, made: true, rattle: false, dunk: def.id, oop: d.oop, putback: d.putback, t: 0, dist: dist2(d.from.x, d.from.y, rim.x, rim.y) };
    p.stats.FGA++;
    hoopHit(ri, 1.4);
    // posters: a defender right under the rim on the dunker's side goes down
    let victim = null;
    for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 26 && q.state !== 'knock' && q.state !== 'dunk') { victim = q; knockDown(q, p, { time: 1.1, dizzy: 2.2, push: 120, poster: true }); }
    // the glass
    let sh = 0; if (p.r.slam >= 9 && d.T > .4) sh = .03; if (p.isNova()) sh = .35; if (p.pu && p.pu.id === 'moon') sh = .5; if (def.id === 'volcano') sh = .2; if (def.quake) sh = 1;
    const shatter = S.match && S.match.shatters < 2 && (S.rng() < sh * tune('shatterChance') || S.cheats.shatterNext);
    emit('dunk', { slot: p.slot, name: p.name, dunk: def.id, banner: def.banner, bonus: def.bonus, lines: def.lines, rim: ri, oop: d.oop, putback: d.putback, victim: victim && victim.name, shatter: !!shatter, x: rim.x, y: rim.y, z: RIM_Z });
    if (victim) emit('posterized', { slot: p.slot, name: p.name, victim: victim.name, vslot: victim.slot });
    if (shatter) { S.cheats.shatterNext = false; shatterGlass(ri, p); }
    if (def.quake) for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 70 && q.state !== 'knock') knockDown(q, p, { time: 1, push: 160 });
  }
  if (def.hang && !S.match.hubFast) { p.setState('hang'); p.hangT = def.hang; p.vx = p.vy = p.vz = 0; p.z = RIM_Z + 4 - p.reach(); }
  else { p.setState('air'); p.jump = { kind: 'drop', tried: new Set(), quake: !!def.quake }; p.vx = -rim.side * 20; p.vy = 0; p.vz = 40; }
}

/* ---- passes ---- */
function passKind(p, q) {
  for (const f of p.foes) if (segDist(f, p, q) < 12 && dist2(f.x, f.y, p.x, p.y) > 10) return 'bounce';
  return p.isNova() || S.rng() < .15 ? 'flair' : 'chest';
}
function segDist(o, a, b) { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); }
function passBall(p, q, kind = 'chest', o = {}) {
  const b = S.ball; if (!p.has || !q) return;
  const lob = kind === 'lob' || kind === 'oop' || kind === 'inbound', d = dist2(p.x, p.y, q.x, q.y), speed = (180 + 12 * p.r.dime) * 1.6;
  const T = o.T || (lob ? clamp(d / 230, .45, 1.1) : clamp(d / speed, .12, .9)), lead = lob ? .7 : .8;
  const hz = q.z + q.shoulderZ() * .8;
  b.state = 'pass'; b.owner = null; b.lastTouch = p;
  b.pass = { from: p, to: q, kind, t: 0, T, ax: b.x, ay: b.y, az: b.z, bx: o.bx === undefined ? q.x + q.vx * T * lead : o.bx, by: o.by === undefined ? q.y + q.vy * T * lead : o.by, bz: o.bz === undefined ? hz : o.bz,
    arc: lob ? (kind === 'oop' ? 0 : 34) : kind === 'bounce' ? 0 : 5, tried: new Set(), oop: kind === 'oop' };
  p.act = { id: kind === 'bounce' ? 'passBounce' : lob ? 'passLob' : kind === 'flair' ? 'passFlair' : 'passChest', t: 0, dur: .3 };
  p.facing = Math.atan2(q.y - p.y, q.x - p.x);
  sfx('release', { vol: .2 }); emit('pass', { slot: p.slot, to: q.slot, kind });
}
/** the alley-oop: the receiver leaps (a dunk flight to the rim) and the ball is lobbed to meet the hands at 70% of it */
function oopRange(p, q) { return dunkRange(q) * .95 + p.r.dime * 3; }
function oopReady(p, q) {
  if (!q || !q.free() || q.state === 'knock' || (S.match && S.match.oopCd && S.match.oopCd[q.team] > S.match.gameT && !isLocal(p) && !isLocal(q))) return false;
  const rim = attackRim(q.team), d = dist2(q.x, q.y, rim.x, rim.y);
  return d <= oopRange(p, q) && d > 20 && !q.foes.some(f => dist2(f.x, f.y, q.x, q.y) < 16);
}
function alleyOop(p, q) {
  if (S.match) { S.match.oopCd = S.match.oopCd || [0, 0]; S.match.oopCd[q.team] = S.match.gameT + 12; }
  const def = startDunk(q, { oop: true }), D = q.dunk, t = D.T * .7;
  const hx = q.x + q.vx * t, hy = q.y + q.vy * t, hz = q.z + q.vz * t - .5 * D.G * t * t + q.reach() * .92;
  passBall(p, q, 'oop', { T: t, bx: hx, by: hy, bz: hz });
  emit('oopThrow', { slot: p.slot, to: q.slot, dunk: def.id });
}

/* ---- defense ---- */
function startSteal(p) {
  if (p.cd.steal > 0) return; p.setState('steal'); p.stealDone = false; p.cd.steal = tune('stealCooldown') + (isLocal(p) ? 0 : .04);
  const h = S.ball.owner; if (h) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  sfx('whoosh', { vol: .2 });
}
function stealHit(p) {
  p.stealDone = true; const b = S.ball, h = b.state === 'held' ? b.owner : null;
  if (!h || h.team === p.team) return;
  const reach = tune('stealReach') + .6 * p.r.swipe, d = dist2(p.x, p.y, h.x, h.y);
  if (d > reach) return;
  if (h.state === 'spin' || h.state === 'air' || h.state === 'gather' || h.state === 'dunk') return;
  let k = tune('stealChance') * p.f('swipe') * (1.25 - .05 * h.r.dime);
  const rel = toLocal(h.rig, p.x - h.x, p.y - h.y, 0), ang = Math.atan2(rel[1], rel[0]);
  if (Math.abs(ang) > 2.1) k *= 1.4; else if (Math.sign(rel[1]) === Math.sign(h.dribble.lat || h.dribble.side)) k *= 1.4; else k *= .6;
  if (h.turboOn) k *= 1.15; if (p.isNova()) k *= 1.2; if (p.overclock > 0 || get('team', p.teamId).boss) k *= 1.15;
  if (h.pu && h.pu.id === 'glue') k = 0; else if (p.pu && p.pu.id === 'glue') k = 1;
  const win = S.rng() < clamp(k, 0, 1);
  emit('stealTry', { slot: p.slot, victim: h.slot, win, chance: k });
  if (!win) { p.cd.steal = Math.max(p.cd.steal, .2); return; }
  if (d < 8) giveBall(p, 'steal'); else { const a = Math.atan2(p.y - h.y, p.x - h.x); b.x = h.ballAt ? h.ballAt[0] : b.x; looseBall(Math.cos(a) * 90, Math.sin(a) * 90, 60, h); }
  p.stats.STL++; sfx('steal'); P.glints(b.x, b.y, b.z, 6, '#5aff6a');
  emit('steal', { slot: p.slot, name: p.name, victim: h.name, vslot: h.slot });
}
function startShove(p) {
  if (p.cd.shove > 0 || (!p.infTurbo() && p.turbo < .1)) return;
  p.setState('shove'); p.shoveDone = false; p.cd.shove = tune('shoveCooldown'); if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - tune('shoveCost'));
  const t = p.foes.slice().sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y))[0];
  if (t && dist2(t.x, t.y, p.x, p.y) < 40) p.facing = Math.atan2(t.y - p.y, t.x - p.x);
  p.windup = isLocal(p) ? 0 : .04; sfx('whoosh', { vol: .3 });
}
function shoveHit(p) {
  p.shoveDone = true; const bomb = p.pu && p.pu.id === 'bomb';
  if (bomb) { endPowerup(p); emit('bombHit', { slot: p.slot, name: p.name }); P.explosion(p.x, p.y, 10, 1.2); for (const q of p.foes) if (dist2(q.x, q.y, p.x, p.y) < 60) knockDown(q, p, { fumble: 1, push: 260 }); return; }
  let hit = null;
  for (const q of p.foes) {
    if (q.state === 'knock' || q.state === 'frozen' || q.state === 'hang') continue;
    const d = dist2(q.x, q.y, p.x, p.y), a = Math.abs(E.angDiff(p.facing, Math.atan2(q.y - p.y, q.x - p.x)));
    if (d < 24 && a < 1.05 && Math.abs(q.z - p.z) < 30) { hit = q; break; }
  }
  if (!hit) return;
  const kd = S.cheats.oneShove ? 1.4 : clamp(tune('knockdownTime') + .04 * (p.r.bump - hit.r.bump), .3, 1.4);
  knockDown(hit, p, { time: kd, push: tune('shoveForce') * (.75 + .05 * p.r.bump), shove: true, fumble: S.cheats.oneShove ? 1 : 0 });
  P.impact((p.x + hit.x) / 2, (p.y + hit.y) / 2, 24, 1, '#ffffff'); game.shake(2); sfx('shove');
  emit('shove', { slot: p.slot, name: p.name, victim: hit.name, vslot: hit.slot });
}
/** down goes q: sliding back, the ball loose (a fumble), the shot lost; juice and the robots' reboot count */
function knockDown(q, by, o = {}) {
  const b = S.ball, had = b.owner === q && (b.state === 'held' || b.state === 'dunk');
  const a = by ? Math.atan2(q.y - by.y, q.x - by.x) : 0, push = o.push || 160;
  const wasAir = q.state === 'air' || q.state === 'dunk' || q.state === 'gather';
  q.setState('knock'); q.kdT = o.time || clamp(tune('knockdownTime'), .3, 1.4); q.vx = Math.cos(a) * push; q.vy = Math.sin(a) * push; q.vz = Math.max(0, q.vz);
  q.dizzy = o.dizzy || 0; q.jump = null; q.dunk = null; q.flashT = .12; q.juice = Math.max(0, q.juice - .06); q.stats.KD++;
  if (had) {
    const fumble = o.fumble || (wasAir ? .7 : clamp(tune('shoveFumble') + .04 * ((by ? by.r.bump : 5) - q.r.bump), .2, .95));
    if (S.rng() < fumble) looseBall(Math.cos(a) * 110, Math.sin(a) * 110, 90, q);
  }
  sfx('fall', { vol: .5 });
  if (get('team', q.teamId).boss) { const t = S.match ? S.match.gameT : 0; q.knocks = q.knocks.filter(x => t - x < 10); q.knocks.push(t); if (q.knocks.length >= 2) { q.knocks = []; q.rebootPending = true; } }
  emit('knockdown', { slot: q.slot, name: q.name, by: by && by.slot, poster: !!o.poster });
}
function startSpin(p) {
  if (p.cd.spin > 0 || (!p.infTurbo() && p.turbo < .2)) return;
  p.setState('spin'); p.cd.spin = tune('spinCooldown'); if (!p.infTurbo()) p.turbo = Math.max(0, p.turbo - tune('spinCost'));
  const c = p.cmd, m = Math.hypot(c.mx, c.my), a = m > .3 ? Math.atan2(c.my, c.mx) : p.facing; p.spinDir = a; p.spinBroke = false;
  sfx('spin'); emit('spin', { slot: p.slot, name: p.name });
}
function startBlock(p, superK = 1) {
  jumpUp(p, 'block', jumpSpeed(p, 250) * superK, { superK });
  const h = S.ball.owner; if (h) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  if (superK > 1) { emit('superBlock', { slot: p.slot, name: p.name }); P.smoke(p.x, p.y, 0, 10, { color: '#e8e8f0' }); }
}
/** in the air with arms up: a block, or goaltending on a ball coming down over the rim */
function blockCheck(p) {
  const J = p.jump, b = S.ball; if (J.blocked) return;
  const hz = p.z + p.reach(), reach = tune('blockReach') + (p.r.swat - 5) * .8 + 4;
  const dx = b.x - p.x, dy = b.y - p.y, dz = b.z - hz, d = Math.hypot(dx, dy, Math.min(0, dz) * 1, Math.max(0, dz - 4));
  if (d > reach) return;
  const rim = defendRim(p.team), nearRimNow = dist2(b.x, b.y, rim.x, rim.y) < 18 && b.z > RIM_Z;
  let target = null, kind = null;
  if (b.state === 'shot' && b.shot && b.shot.team !== p.team && !b.shot.blocked) {
    if (b.vz < 0 && nearRimNow) kind = 'goaltend';
    else if (b.shot.t < .25) kind = 'shot';
    target = b.shot.shooter;
  } else if (b.state === 'held' && b.owner && b.owner.team !== p.team && (b.owner.state === 'air' || b.owner.state === 'gather')) { kind = 'shot'; target = b.owner; }
  else if (b.state === 'dunk' && b.owner && b.owner.team !== p.team && !b.owner.dunk.slammed) { kind = 'dunk'; target = b.owner; }
  if (!kind || J.tried.has(target)) return;
  J.tried.add(target);
  if (kind === 'goaltend') {
    if (p.isNova() || get('team', p.teamId).boss) kind = 'shot';
    else { b.shot.goaltend = true; J.blocked = true; emit('goaltend', { slot: p.slot, name: p.name }); onBasket(b.shot.rim, { goaltend: true }); return; }
  }
  let k = kind === 'dunk' ? clamp(.34 + .06 * (p.r.swat - target.r.slam), .1, .75) : clamp(.42 + .05 * (p.r.swat - 5), .12, .85);
  if (p.isNova()) k += .15; if (p.state === 'air' && J.superK > 1) k += .2;
  if (S.cheats.unblockable && kind === 'dunk') k = 0;
  k *= tune('blockChance');
  J.swatT = .15; p.rig.kick(.5);
  if (S.rng() >= clamp(k, 0, 1)) return;
  J.blocked = true;
  const away = -attackRim(target.team).side, vx = away * (120 + S.rng() * 60), vy = (S.rng() - .5) * 120;
  if (b.state === 'shot') { b.shot.blocked = true; b.shot.made = false; b.shot.rattle = false; b.state = 'loose'; b.vx = vx; b.vy = vy; b.vz = 140; b.lastTouch = p; b.noCatch = .15; b.noCatchBy = p; }
  else { looseBall(vx, vy, 140, target); if (kind === 'dunk') { target.setState('air'); target.jump = { kind: 'drop', tried: new Set() }; target.vx *= .2; target.vy *= .2; target.dunk = null; } else if (target.jump) target.jump.released = true; }
  p.stats.BLK++; sfx('block'); P.impact(b.x, b.y, b.z, 1.2, '#ff5a5a'); game.shake(2); p.rig.kick(.8);
  emit('block', { slot: p.slot, name: p.name, victim: target.name, vslot: target.slot, kind });
}

/* ---- rebounds, loose balls and catches ---- */
function canCatch(p) { return (p.state === 'run' || p.state === 'air' || p.state === 'cele' || p.state === 'taunt') && p.cd.catch <= 0 && !p.has; }
function catchStep(dt) {
  const b = S.ball; if (!b) return;
  b.noCatch = Math.max(0, b.noCatch - dt);
  if (b.state === 'shot' && b.shot) b.shot.t += dt;
  if (b.state === 'pass') {
    const ps = b.pass;
    for (const q of S.players) {   // interceptions: a defender with hands in the lane
      if (q.team === ps.from.team || ps.tried.has(q) || !canCatch(q)) continue;
      const h = handsAt(q); if (Math.hypot(h[0] - b.x, h[1] - b.y) > 10 || b.z > q.z + q.reach() + 6 || b.z < q.z) continue;
      ps.tried.add(q); const k = ps.kind === 'inbound' ? (ps.laneOk ? .3 : 0) : clamp(.22 + .04 * (q.r.swipe - ps.from.r.dime), .12, .55) * (q.pu && q.pu.id === 'glue' ? 3 : 1);
      if (S.rng() < k) { giveBall(q, 'intercept'); q.stats.STL++; sfx('steal'); emit('intercept', { slot: q.slot, name: q.name, victim: ps.from.name }); emit('steal', { slot: q.slot, name: q.name, victim: ps.from.name, vslot: ps.from.slot, intercept: true }); return; }
    }
    const q = ps.to, h = handsAt(q);
    if (q.state === 'dunk' && ps.oop) { if (Math.hypot(h[0] - b.x, h[1] - b.y, h[2] - b.z) < 16 || ps.t >= ps.T) { giveBall(q, 'oop'); b.state = 'dunk'; ps.from.stats.AST++; emit('alleyoop', { slot: q.slot, name: q.name, from: ps.from.name }); sfx('catch'); } return; }
    if (canCatch(q) && Math.hypot(h[0] - b.x, h[1] - b.y, (h[2] - b.z) * .6) < 14) { const was = ps.from; giveBall(q, ps.kind === 'inbound' ? 'inbound' : 'pass'); q.holdT = .12; q.lastPassFrom = was; q.lastPassT = 0; sfx('catch', { vol: .3 }); emit('catch', { slot: q.slot, from: was.slot, kind: ps.kind }); }
    return;
  }
  if (b.state !== 'loose') return;
  let best = null, bd = 1e9;
  for (const p of S.players) {
    if (!canCatch(p) || (b.noCatch > 0 && b.noCatchBy === p)) continue;
    const hd = dist2(p.x, p.y, b.x, b.y); if (hd > 12) continue;
    const top = p.z + p.reach() + 4; if (b.z > top || b.z < p.z - 4) continue;
    if (hd < bd) { bd = hd; best = p; }
  }
  if (!best) return;
  const fromShot = b.shot && !b.shot.made, offensive = fromShot && b.shot.team === best.team;
  giveBall(best, fromShot ? 'rebound' : 'loose');
  if (fromShot) { best.stats.REB++; emit('rebound', { slot: best.slot, name: best.name, offensive, air: best.state === 'air' }); }
  if (best.state === 'air' && best.jump) best.jump.kind = 'rebound';
  best.holdT = .15; sfx('catch', { vol: .3 });
}

/* ---- each player, every step ---- */
function playerStep(p, dt) {
  p.st += dt; for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
  p.call = Math.max(0, p.call - dt); p.holdT = Math.max(0, (p.holdT || 0) - dt); p.passiveT = Math.max(0, (p.passiveT || 0) - dt); p.dizzy = Math.max(0, p.dizzy - dt); p.flashT = Math.max(0, (p.flashT || 0) - dt);
  if (p.act) { p.act.t += dt; if (p.act.t > p.act.dur) p.act = null; }
  if (p.order) { p.order.t -= dt; if (p.order.t <= 0) p.order = null; }
  if (p.lastPassT !== undefined) p.lastPassT += dt;
  if (p.rebootPending && p.state !== 'knock' && p.state !== 'air') { p.rebootPending = false; p.setState('frozen'); p.vx = p.vy = 0; emit('reboot', { slot: p.slot, name: p.name }); }
  const c = p.cmd, live = matchLive();
  turboStep(p, c, dt);
  const decel = k => { p.vx = approach(p.vx, 0, k * dt); p.vy = approach(p.vy, 0, k * dt); };
  switch (p.state) {
    case 'run': locomote(p, c, dt); if (live || S.match && S.match.phase === 'tipoff') actRun(p, c, dt); else if (c.tauntP && !HUB && !p.has) startTaunt(p); break;
    case 'gather': decel(900); if (p.st >= .08 + (p.windup || 0)) { jumpUp(p, 'shot', jumpSpeed(p, tune('jumpShotVz'))); p.vx = p.vx * .5; p.vy = p.vy * .5; } break;
    case 'air': airStep(p, c, dt); break;
    case 'dunk': dunkStep(p, dt); break;
    case 'hang': p.vx = p.vy = 0; if (p.st >= p.hangT) { p.setState('air'); p.jump = { kind: 'drop', tried: new Set() }; p.vz = 0; } break;
    case 'knock': decel(260); if (p.z > 0) { p.vz -= pGravity(p) * dt; p.z = Math.max(0, p.z + p.vz * dt); } if (p.st >= p.kdT) p.setState('getup'); break;
    case 'getup': decel(900); if (p.st >= .3) p.setState('run'); break;
    case 'spin': {
      const sp = 30 / .35 + 20; p.vx = Math.cos(p.spinDir) * sp; p.vy = Math.sin(p.spinDir) * sp; p.facing = p.spinDir;
      if (!p.spinBroke) for (const q of p.foes) { if (q.state !== 'run') continue; const d = dist2(q.x, q.y, p.x, p.y), a = Math.abs(E.angDiff(p.spinDir, Math.atan2(q.y - p.y, q.x - p.x))); if (d < 16 && a < 1) { p.spinBroke = true; q.setState('stumble'); q.vx = -Math.cos(p.spinDir) * 40; q.vy = Math.sin(p.spinDir) * 60; emit('anklesBroken', { slot: p.slot, name: p.name, victim: q.name, vslot: q.slot }); } }
      if (p.st >= .35) p.setState('run'); break;
    }
    case 'steal': locomote(p, c, dt, .5); if (!p.stealDone && p.st >= .1) stealHit(p); if (p.st >= .38) p.setState('run'); break;
    case 'shove': { const lunge = p.st > p.windup && p.st < p.windup + .14 ? 70 : 0; p.vx = Math.cos(p.facing) * lunge; p.vy = Math.sin(p.facing) * lunge; if (!p.shoveDone && p.st >= .07 + p.windup) shoveHit(p); if (p.st >= .44 + p.windup) p.setState('run'); break; }
    case 'stumble': decel(200); if (p.st >= .4) p.setState('run'); break;
    case 'frozen': decel(600); if (p.st >= 3) { p.setState('run'); p.passiveT = 1; } if (Math.floor(p.st * 6) !== Math.floor((p.st - dt) * 6)) P.sparks(p.x, p.y, 40, 3, null, { color: '#8ad0ff' }); break;
    case 'cele': case 'taunt': decel(800); if (Math.hypot(c.mx, c.my) > .3 || c.shootP || c.passP || p.st >= (p.state === 'taunt' ? TAUNT_LEN : CELE_LEN) || (live && p.state === 'cele' && p.has)) p.setState('run'); break;
    case 'inbound': p.vx = p.vy = 0; break;
    case 'idle': decel(600); break;
  }
  if (p.state !== 'dunk' && p.state !== 'hang') { p.x += p.vx * dt; p.y += p.vy * dt; }
  if (p.state !== 'inbound' && p.state !== 'idle') clampToArena(p);
  juiceStep(p, dt);
  if (p.pu) { p.pu.t -= dt; if (p.pu.t <= 0) endPowerup(p); }
}
function startTaunt(p) { if (HUB) return; p.setState('taunt'); p.clip = p.def.taunt; sfx('taunt'); emit('taunt', { slot: p.slot, name: p.name, bark: pickF(p.def.barks) }); }
function startCele(p) { p.setState('cele'); p.clip = pickF(p.def.cele); }
/** the buttons while on the floor, by situation */
function actRun(p, c, dt) {
  const b = S.ball, mate = p.mate, tip = S.match && S.match.phase === 'tipoff';
  if (tip) { if (c.shootP && S.match.jumpers.includes(p) && p.cd.jump <= 0 && !p.tipJumped) { p.tipJumped = true; jumpUp(p, 'tip', jumpSpeed(p, 250) * 1.1); } return; }
  if (p.has) {
    if (c.shootP) {
      const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), vent = onVent(p) && (rim.side > 0 ? p.x > CMX : p.x < CMX);
      if ((c.turboD || vent) && canDunk(p)) startDunk(p, { vent: vent && c.turboD });
      else if (d <= 40) startLayup(p); else startShot(p);
      return;
    }
    if (c.passP && mate) { passBall(p, mate, passKind(p, mate)); return; }
    if (c.oopP && mate) { if (oopReady(p, mate)) alleyOop(p, mate); else passBall(p, mate, 'lob'); return; }
    if (c.shoveP) { startSpin(p); return; }
    return;
  }
  const ownBall = b && b.state === 'held' && b.owner && b.owner.team === p.team;
  if (ownBall && mate && mate.has) {
    const cpuMate = mate.source && mate.source.kind === 'cpu';
    if (c.passP) { p.call = .8; if (cpuMate) mate.order = { kind: 'pass', t: .9 }; emit('call', { slot: p.slot, kind: 'pass' }); }
    if (c.shootP && cpuMate) mate.order = { kind: 'shoot', t: .9 };
    if (c.oopP) { p.call = .8; if (cpuMate) mate.order = { kind: 'oop', t: 1.2 }; emit('call', { slot: p.slot, kind: 'oop' }); }
  } else {
    if (c.passP) startSteal(p);
    if (c.shootP && p.cd.jump <= 0) {
      const looseUp = b && (b.state === 'loose' || (b.state === 'shot' && b.vz < 0)) && dist2(b.x, b.y, p.x, p.y) < 40;
      if (looseUp) jumpUp(p, 'rebound', jumpSpeed(p, 230)); else startBlock(p, onVent(p) ? 1.6 : 1);
    }
  }
  if (c.shoveP && p.state === 'run') startShove(p);
  if (c.tauntP && p.state === 'run' && !HUB) startTaunt(p);
}
function airStep(p, c, dt) {
  const J = p.jump || { kind: 'drop' }, g = pGravity(p);
  p.vz -= g * dt; p.z += p.vz * dt;
  if (J.kind === 'block' || J.kind === 'rebound' || J.kind === 'tip') { p.vx = approach(p.vx, c.mx * 40, 200 * dt); p.vy = approach(p.vy, c.my * 40, 200 * dt); }
  if (J.swatT > 0) J.swatT -= dt;
  if (J.kind === 'shot' && !J.released) { if (!p.has) J.released = true; else if (!c.shootD || p.st >= J.ta + .25) releaseShot(p); }
  if (J.kind === 'layup' && !J.released) { if (!p.has) J.released = true; else if (p.st >= J.T * .5) { J.released = true; const ch = shotChance(p, { x: J.x0, y: J.y0, layup: true }); launchShot(p, ch, { layup: true }); } }
  if (J.kind === 'block' || J.kind === 'rebound') blockCheck(p);
  if (p.has && (J.kind === 'rebound' || J.kind === 'block') && (c.shootP || c.turboD)) {   // a putback
    const rim = attackRim(p.team); if (dist2(p.x, p.y, rim.x, rim.y) < 44 && p.z > 4) { startDunk(p, { putback: true }); emit('putbackTry', { slot: p.slot }); return; }
  }
  if (p.z <= 0 && p.vz <= 0) {
    p.z = 0; p.vz = 0; const heavy = J.kind === 'drop';
    p.setState('run'); p.landT = 1; p.landK = heavy ? 1 : .35; p.jump = null; p.vx *= .3; p.vy *= .3;
    sfx(heavy ? 'land_heavy' : 'land', { vol: heavy ? .5 : .2 }); if (heavy) { P.dust(p.x, p.y, 0, 12); p.rig.kick(-1); }
    if (J.quake) { P.ring(p.x, p.y, 4, 46, '#ffd23a', .5); game.shake(5); for (const q of p.foes) if (dist2(q.x, q.y, p.x, p.y) < 40 && q.state !== 'knock') knockDown(q, p, { time: .9, push: 200 }); }
  }
}


/* ==== 34-ai.js ==== */
/* 34-ai: the CPU brains (PLAN 8). Each CPU player decides at 10 Hz (staggered) and steers every step, writing the same
 * command a human's controls would. Roles: the HANDLER weighs dunk, shoot, drive, pass, oop and spin and commits to the
 * best for a moment; OFF THE BALL it spaces to the far wing, cuts when the handler drives, calls when open and grabs
 * power-ups; on DEFENSE it plays man-to-man between its mark and the rim, swipes, shoves and jumps to block with a
 * reaction delay and timing error by difficulty; on a LOOSE ball or a shot in the air the nearest of each team crash
 * the boards. Orders from a human teammate (pass, shoot, oop) and from the attract director come first. */
const DIFF_TABLE = [
  { q: .35, react: .35, rel: .12, blk: .18, steal: .6, shove: .20, turbo: .50 },
  { q: .60, react: .22, rel: .08, blk: .12, steal: 1.0, shove: .45, turbo: .75 },
  { q: .80, react: .14, rel: .05, blk: .07, steal: 1.4, shove: .65, turbo: .90 },
  { q: .95, react: .08, rel: .03, blk: .04, steal: 1.8, shove: .80, turbo: 1.0 }
];
function diffOf(p) {
  const M = S.match, lv = clamp(M && M.diff ? M.diff[p.team] : 1, 0, 3), i = Math.floor(Math.min(lv, 2.999)), k = lv - i, a = DIFF_TABLE[i], b = DIFF_TABLE[Math.min(3, i + 1)], o = {};
  for (const key in a) o[key] = lerp(a[key], b[key], k);
  o.q = clamp(o.q + tune('cpuSkill') + comebackK(p.team) * .1, .05, 1); o.react *= tune('cpuReaction'); o.steal *= tune('cpuAggression'); o.shove *= tune('cpuAggression');
  if (get('team', p.teamId).boss) o.shove = Math.max(o.shove, .8);
  if (S.cheats.cpuPassive && !isLocal(p)) { o.steal = 0; o.shove = 0; o.passive = true; }
  return o;
}
function brainOf(p) { return p.brain || (p.brain = { t: 0, next: (p.slot % 4) * .025, intent: null, commit: 0, releaseAt: null, blockAt: null, stealT: 0, label: '' }); }
/** a direction toward a point, side-stepping defenders ahead and oil slicks on turbo */
function steer(p, tx, ty, avoid = true) {
  let dx = tx - p.x, dy = ty - p.y; const d = Math.hypot(dx, dy); if (d < 3) return [0, 0];
  dx /= d; dy /= d;
  if (avoid) for (const q of p.foes) {
    const rx = q.x - p.x, ry = q.y - p.y, rd = Math.hypot(rx, ry); if (rd > 34 || rd < .5) continue;
    const ahead = (rx * dx + ry * dy) / rd; if (ahead < .45) continue;
    const side = (rx * -dy + ry * dx) > 0 ? -1 : 1, w = (1 - rd / 34) * 1.1; dx += -dy * side * w; dy += dx * side * w;
  }
  if (TWIST.oil && p.turboOn) for (const s of TWIST.slicks) { const rx = s.x - p.x, ry = s.y - p.y, rd = Math.hypot(rx, ry); if (rd < s.r + 24 && rd > .5) { dx -= rx / rd * .6; dy -= ry / rd * .6; } }
  for (const L2 of TWIST.bombs || []) { const rx = L2.x - p.x, ry = L2.y - p.y, rd = Math.hypot(rx, ry); if (rd < 40 && rd > .5) { dx -= rx / rd; dy -= ry / rd; } }
  const l = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 18); return [dx / l * k, dy / l * k];
}
const goTo = (p, c, x, y, avoid) => { const m = steer(p, x, y, avoid); c.mx = m[0]; c.my = m[1]; return c; };
/** the shot clock and score decide how urgent a shot is */
function laneBlocked(p, tx, ty) { return p.foes.some(q => q.state !== 'knock' && segDist(q, p, { x: tx, y: ty }) < 12 && dist2(q.x, q.y, p.x, p.y) < dist2(tx, ty, p.x, p.y)); }

function aiThink(p, dt) {
  const B = brainOf(p), c = blankCmd(), M = S.match, b = S.ball; if (!M || !b) return c;
  B.t += dt; const D = diffOf(p);
  if (S.lesson && S.lesson.ai) { const r = S.lesson.ai(p, c, dt, B); if (r) return r; }
  if (p.passiveT > 0) { const own = defendRim(p.team); goTo(p, c, lerp(p.x, own.x, .3), p.y, false); return c; }   // just rebooted: dazed for a second
  // in the air: hold the jumper until the release planned for it (the top of the jump, give or take the CPU's error)
  if (p.state === 'gather') { c.shootD = true; return c; }
  if (p.state === 'air') {
    const J = p.jump || {};
    if (J.kind === 'shot' && !J.released) { if (B.releaseAt === null) B.releaseAt = J.ta + gauss() * D.rel; c.shootD = p.st < B.releaseAt; }
    else B.releaseAt = null;
    if (p.has && (J.kind === 'rebound' || J.kind === 'block') && dist2(p.x, p.y, attackRim(p.team).x, attackRim(p.team).y) < 40 && S.rng() < D.q) c.turboD = true;
    return c;
  }
  B.releaseAt = null;
  if (p.state !== 'run' && p.state !== 'inbound' && p.state !== 'cele' && p.state !== 'taunt') return c;
  if (M.phase === 'tipoff') return tipAI(p, c, D);
  if (M.phase === 'inbound') return inboundAI(p, c, D);
  if (M.phase !== 'live' && M.phase !== 'buzzer') { const s = M.deadSpots && M.deadSpots[p.slot]; if (s) goTo(p, c, s[0], s[1], false); B.label = 'JOG'; return c; }
  if (p.has) return handlerAI(p, c, D, B);
  if (b.state === 'held' || b.state === 'dunk') return b.owner && b.owner.team === p.team ? offBallAI(p, c, D, B) : defenseAI(p, c, D, B);
  if (b.state === 'pass') return b.pass.from.team === p.team ? offBallAI(p, c, D, B) : defenseAI(p, c, D, B);
  if (p.order && p.order.kind === 'putback' && b.state === 'loose' && dist2(b.x, b.y, p.x, p.y) < 26 && p.cd.jump <= 0) { c.shootP = true; c.turboD = true; return c; }
  return looseAI(p, c, D, B);
}
function tipAI(p, c, D) {
  const M = S.match, b = S.ball; if (!M.jumpers.includes(p) || p.tipJumped) return c;
  const want = M.tossT >= .45 + gauss() * .03 + (1 - D.q) * .12 + (b.z > 0 ? 0 : 0);
  if (want && b.vz < 120) c.shootP = true; return c;
}
function inboundAI(p, c, D) {
  const M = S.match;
  if (p.state === 'inbound') { if (M.phaseT > .8 + (1 - D.q) * .3) c.passP = true; return c; }
  const spot = M.inboundSpots && M.inboundSpots[p.slot]; if (spot) goTo(p, c, spot[0], spot[1], false);
  return c;
}
/* ---- the handler ---- */
/** is the way to the rim open? no defender within 30 of the line, nearer the rim than the handler */
function laneOpen(p, rim) { return !p.foes.some(q => q.state !== 'knock' && q.state !== 'frozen' && segDist(q, p, rim) < 26 && dist2(q.x, q.y, rim.x, rim.y) < dist2(p.x, p.y, rim.x, rim.y) + 6); }
function handlerAI(p, c, D, B) {
  const rim = attackRim(p.team), d = dist2(p.x, p.y, rim.x, rim.y), mate = p.mate;
  if (B.t >= B.next) {
    B.next = B.t + .1;
    const ord = p.order;
    if (ord && ord.kind === 'pass' && mate) setIntent(B, 'pass', .2);
    else if (ord && ord.kind === 'shoot') setIntent(B, canDunk(p) && d < dunkRange(p) * .8 ? 'dunk' : 'shoot', .4);
    else if (ord && ord.kind === 'jumper') setIntent(B, 'shoot', .4);
    else if (ord && ord.kind === 'oop' && mate) setIntent(B, oopReady(p, mate) ? 'oop' : 'pass', .2);
    else if (ord && (ord.kind === 'dunk' || ord.kind === 'quake')) { setIntent(B, 'dunk', .6); B.dunkAt = .5 + S.rng() * .3; }
    else if (ord && ord.kind === 'vent') setIntent(B, 'vent', .6);
    else if (ord && ord.kind === 'three') setIntent(B, isThree(p.x, p.y, rim) ? 'shoot' : 'spot3', .6);
    else if (ord && ord.kind === 'spin') setIntent(B, 'spin', .3);
    else if (B.commit <= 0 || !B.intent) chooseHandlerIntent(p, D, B, d);
  }
  B.commit -= 1 / 120;
  if (p.hasBallT !== undefined) p.hasBallT += 1 / 120;
  const hesitate = p.hasBallT < D.react * .8 + .15;
  switch (B.intent) {
    case 'advance': {   // bring it up: to the top of the key, at a jog
      const tx = rim.x - rim.side * 165, ty = CMY + (p.y < CMY ? -34 : 34); goTo(p, c, tx, ty, true);
      if (S.rng() < D.turbo * .15 && (p.turbo > .6 || p.infTurbo())) c.turboD = true; break;
    }
    case 'probe': {   // a defender in the way: dribble sideways to make space
      const a = Math.atan2(rim.y - p.y, rim.x - p.x) + (B.probeSide || 1) * 1.7; c.mx = Math.cos(a) * .8; c.my = Math.sin(a) * .8;
      if (p.y < OY + 30 || p.y > OY + CH - 30) B.probeSide = -(B.probeSide || 1); break;
    }
    case 'dunk': {
      goTo(p, c, rim.x - rim.side * 12, rim.y, true); c.turboD = true;
      if (!hesitate && canDunk(p) && d <= dunkRange(p) * B.dunkAt && (p.turbo > .05 || p.infTurbo())) { c.shootP = true; c.turboD = true; B.intent = null; B.commit = 0; }
      break;
    }
    case 'shoot': if (!hesitate) { c.shootP = true; B.intent = null; B.commit = 0; p.order = null; } break;
    case 'spot3': { const a = Math.atan2(p.y - rim.y, p.x - rim.x), tx = rim.x + Math.cos(a) * (THREE_R + 14), ty = rim.y + Math.sin(a) * (THREE_R + 14); goTo(p, c, clamp(tx, OX + 10, OX + CW - 10), clamp(ty, OY + 30, OY + CH - 30), true); if (isThree(p.x, p.y, rim) && dist2(p.x, p.y, rim.x, rim.y) > THREE_R + 4) { c.shootP = true; B.intent = null; p.order = null; } break; }
    case 'pass': if (!hesitate || p.order) { c.passP = true; B.intent = null; B.commit = 0; p.order = null; } break;
    case 'oop': if (oopReady(p, mate)) { c.oopP = true; B.intent = null; p.order = null; } else goTo(p, c, p.x - rim.side * 10, p.y, true); break;
    case 'spin': { const a = Math.atan2(rim.y - p.y, rim.x - p.x) + (S.rng() < .5 ? .7 : -.7); c.mx = Math.cos(a); c.my = Math.sin(a); c.shoveP = true; B.intent = 'drive'; B.commit = .3; p.order = null; break; }
    case 'wait': goTo(p, c, p.x - rim.side * 6, p.y, true); break;
    case 'vent': {   // ride a steam vent: VOLCANO LAUNCH
      const v = TWIST.vents.filter(q => (rim.side > 0 ? q.x > CMX : q.x < CMX)).sort((a, q) => dist2(a.x, a.y, p.x, p.y) - dist2(q.x, q.y, p.x, p.y))[0];
      if (!v) { B.intent = 'dunk'; break; }
      goTo(p, c, v.x, v.y, false); if (dist2(p.x, p.y, v.x, v.y) < 14 && v.puff > 0) { c.shootP = true; c.turboD = true; B.intent = null; p.order = null; }
      break;
    }
    default: {   // drive at the rim
      goTo(p, c, rim.x - rim.side * 18, rim.y + (p.y - rim.y) * .3, true);
      if (laneOpen(p, rim) && d > 80 && (p.turbo > .3 || p.infTurbo()) && S.rng() < D.turbo * .6) c.turboD = true;
    }
  }
  B.label = (B.intent || 'DRIVE').toUpperCase();
  return c;
}
function setIntent(B, k, commit) { B.intent = k; B.commit = commit; }
function chooseHandlerIntent(p, D, B, d) {
  const M = S.match, rim = attackRim(p.team), mate = p.mate, noise = () => gauss() * (1 - D.q) * .25, sc = {};
  const urgent = M.shot < 3.5 && M.phase === 'live', ch = shotChance(p), three = ch.three, open = !p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 26 && q.state === 'run');
  const back = (p.x - CMX) * rim.side < 0, fast = p.foes.every(q => dist2(q.x, q.y, rim.x, rim.y) > d + 30), lane = laneOpen(p, rim);
  const slamBias = (p.r.slam - 6) * .07, shooter = (Math.max(p.r.splash, p.r.deep) - 6) * .06, turboOk = p.turbo >= .15 || p.infTurbo(), range = dunkRange(p);
  if (back && !fast && !urgent && !p.order) { setIntent(B, 'advance', .4); return; }
  sc.dunk = turboOk && d <= range ? (lane ? .52 : .1) + slamBias + (p.isNova() ? .35 : 0) + (S.attract ? .5 : 0) - Math.max(0, d / range - .7) * .6 : -1;
  sc.drive = d > 60 ? (lane ? .5 : .22) + slamBias * .5 : -.4;
  sc.shoot = ch.p * (three ? 3 : 2) / 2.2 + (open ? .2 : -.15) + shooter + (urgent ? .9 : 0) - (d > 230 && !urgent ? 1 : 0) - (M.shot > 14 && !open ? .2 : 0);
  if (TWIST.windOn && Math.hypot(TWIST.windX, TWIST.windY) > .6 && M.shot > 6) { sc.shoot -= .3; sc.wait = .45; }
  if (!lane && M.shot > 7) sc.probe = .42;
  if (mate && mate.free()) {
    const mc = shotChance(mate, { x: mate.x, y: mate.y }), md = dist2(mate.x, mate.y, rim.x, rim.y), pressed = p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 18);
    const risk = p.foes.some(q => segDist(q, p, mate) < 10) ? .3 : 0, mateOpen = !mate.foes.some(q => dist2(q.x, q.y, mate.x, mate.y) < 28);
    sc.pass = mc.p * (mc.three ? 3 : 2) / 2.2 - ch.p * (three ? 3 : 2) / 2.2 + (pressed ? .3 : 0) + (mateOpen ? .15 : -.1) - risk + (mate.call > 0 ? .45 : 0) + (isLocal(mate) ? .12 : 0) + (md < dunkRange(mate) && mateOpen ? .15 : 0) + p.r.dime * .01;
    if (oopReady(p, mate)) sc.oop = .3 + mate.r.slam / 40 + (S.attract ? .4 : 0) - risk;
  }
  const ahead = p.foes.find(q => q.state === 'run' && dist2(q.x, q.y, p.x, p.y) < 20 && Math.abs(E.angDiff(Math.atan2(rim.y - p.y, rim.x - p.x), Math.atan2(q.y - p.y, q.x - p.x))) < .6);
  if (ahead && (p.turbo >= .2 || p.infTurbo()) && p.cd.spin <= 0) sc.spin = .45 + p.r.dime * .02;
  if (urgent && sc.dunk > 0) sc.dunk += .4;
  let best = 'drive', bv = -9; for (const k in sc) { const v = sc[k] + noise(); if (v > bv) { bv = v; best = k; } }
  B.dunkAt = .55 + S.rng() * .35; B.probeSide = S.rng() < .5 ? 1 : -1;
  setIntent(B, best, best === 'drive' ? .35 : best === 'dunk' ? .6 : best === 'probe' ? .45 : .15);
}
/* ---- off the ball, on offense ---- */
function offBallAI(p, c, D, B) {
  const b = S.ball, h = b.owner || (b.pass && b.pass.from), rim = attackRim(p.team);
  if (b.state === 'pass' && b.pass.to === p) { const ps = b.pass; goTo(p, c, ps.bx, ps.by, false); B.label = 'GET OPEN'; return c; }
  if (p.order && p.order.kind === 'putback') { goTo(p, c, rim.x - rim.side * 22, rim.y + 8, false); B.label = 'CRASH'; return c; }
  // a power-up nearby, nobody near it
  const pu = POWERUPS.floor.find(u => dist2(u.x, u.y, p.x, p.y) < 120 && !p.foes.some(q => dist2(q.x, q.y, u.x, u.y) < 40));
  if (pu && !p.pu) { goTo(p, c, pu.x, pu.y, true); c.turboD = S.rng() < D.turbo; B.label = 'POWER-UP'; return c; }
  if (!h) return c;
  const hd = dist2(h.x, h.y, rim.x, rim.y), driving = h.has && Math.hypot(h.vx, h.vy) > 90 && hd < 170;
  let tx, ty;
  if (driving || (h.brain && h.brain.intent === 'oop')) { tx = rim.x - rim.side * 30; ty = rim.y + (h.y < rim.y ? 44 : -44); B.label = 'CUT'; if (dist2(p.x, p.y, tx, ty) > 50) c.turboD = S.rng() < D.turbo; }
  else {
    const ha = Math.atan2(h.y - rim.y, h.x - rim.x), wingA = ha + (Math.sin(ha) > 0 ? -1.1 : 1.1), R2 = p.r.deep >= 7 ? THREE_R + 16 : 110;
    tx = rim.x + Math.cos(wingA) * R2; ty = rim.y + Math.sin(wingA) * R2; B.label = 'SPOT UP';
  }
  tx = clamp(tx, OX + 12, OX + CW - 12); ty = clamp(ty, OY + 14, OY + CH - 14);
  if (dist2(tx, ty, h.x, h.y) < 70) { const a = Math.atan2(ty - h.y, tx - h.x); tx = h.x + Math.cos(a) * 70; ty = h.y + Math.sin(a) * 70; }
  goTo(p, c, tx, ty, true);
  const open = !p.foes.some(q => dist2(q.x, q.y, p.x, p.y) < 30), pressed = h.foes.some(q => dist2(q.x, q.y, h.x, h.y) < 18);
  if (open && pressed && S.rng() < .02) p.call = .6;
  return c;
}
/* ---- defense ---- */
function marksFor(team) {
  const def = S.players.filter(q => q.team === team), off = S.players.filter(q => q.team !== team); if (def.length < 2 || off.length < 2) return new Map(def.map((q, i) => [q, off[i] || off[0]]));
  const a = dist2(def[0].x, def[0].y, off[0].x, off[0].y) + dist2(def[1].x, def[1].y, off[1].x, off[1].y), b = dist2(def[0].x, def[0].y, off[1].x, off[1].y) + dist2(def[1].x, def[1].y, off[0].x, off[0].y);
  return a <= b + 30 ? new Map([[def[0], off[0]], [def[1], off[1]]]) : new Map([[def[0], off[1]], [def[1], off[0]]]);
}
function defenseAI(p, c, D, B) {
  const b = S.ball, own = defendRim(p.team), h = b.owner || (b.pass && b.pass.to);
  // orders first (the attract director's): shove the nearest, swipe at the handler
  if (p.order && p.order.kind === 'shove') { const t = p.foes.slice().sort((a, q) => dist2(a.x, a.y, p.x, p.y) - dist2(q.x, q.y, p.x, p.y))[0]; if (t) { goTo(p, c, t.x, t.y, false); c.turboD = true; if (dist2(t.x, t.y, p.x, p.y) < 22 && (p.turbo > .1 || p.infTurbo())) { c.shoveP = true; p.order = null; } return c; } }
  if (p.order && p.order.kind === 'steal' && b.owner && b.owner.team !== p.team) { const hd = b.owner; goTo(p, c, hd.x, hd.y, false); c.turboD = true; if (dist2(hd.x, hd.y, p.x, p.y) < 18 && p.cd.steal <= 0) { c.passP = true; p.order = null; } return c; }
  const mark = p.order && p.order.kind === 'block' && h ? h : marksFor(p.team).get(p) || h; if (!mark) return c;
  const onBall = mark === b.owner || (b.state === 'pass' && b.pass.to === mark);
  // help: the handler is driving and my mark is far from the ball
  const handler = b.state === 'held' || b.state === 'dunk' ? b.owner : null, hd = handler ? dist2(handler.x, handler.y, own.x, own.y) : 999;
  const help = !onBall && handler && hd < 175 && (handler.x - CMX) * own.side > 0;   // the rim protector sags into the lane
  let tx, ty;
  if (help) { const a = Math.atan2(handler.y - own.y, handler.x - own.x), k = clamp(hd * .28, 22, 46); tx = own.x + Math.cos(a) * k; ty = own.y + Math.sin(a) * k; }
  else { const tgt = mark, gap = onBall ? 15 + (1 - D.q) * 8 : 30, a = Math.atan2(own.y - tgt.y, own.x - tgt.x); tx = tgt.x + Math.cos(a) * gap; ty = tgt.y + Math.sin(a) * gap; }
  goTo(p, c, tx, ty, false); B.label = help ? 'PROTECT RIM' : 'MARK ' + (mark.slot + 1);
  if (dist2(p.x, p.y, tx, ty) > 60 && (p.turbo > .3 || p.infTurbo()) && S.rng() < D.turbo) c.turboD = true;
  if (D.passive) return c;
  // a shooter rising nearby: jump to block (after a reaction delay, with timing error)
  const riser = p.foes.find(q => (q.state === 'gather' || (q.state === 'air' && q.jump && (q.jump.kind === 'shot' || q.jump.kind === 'layup') && !q.jump.released) || (q.state === 'dunk' && q.dunk && !q.dunk.slammed)) && dist2(q.x, q.y, p.x, p.y) < (q.state === 'dunk' ? 140 : 42));
  if (riser && riser.state === 'dunk') {   // time the leap so the hands meet the ball late in the dunk's flight
    const Dk = riser.dunk, left = Dk.T - Dk.t, apexT = jumpSpeed(p, 250) / pGravity(p), sl = Dk.sl;
    if (B.blockErr === undefined || B.blockFor !== riser) { B.blockFor = riser; B.blockErr = gauss() * D.blk + D.react * .35; }
    goTo(p, c, sl.x, sl.y, false); c.turboD = true;
    if (dist2(p.x, p.y, sl.x, sl.y) < 48 && left <= apexT * .9 + B.blockErr && p.cd.jump <= 0) { c.shootP = true; B.label = 'BLOCK'; B.blockErr = undefined; }
    return c;
  }
  if (riser) {
    if (B.blockAt === null) B.blockAt = B.t + Math.max(0, D.react + gauss() * D.blk);
    if (B.t >= B.blockAt && p.cd.jump <= 0) { c.shootP = true; B.blockAt = null; B.label = 'BLOCK'; }
    else if (riser.state === 'gather' && S.rng() < D.shove * .25 * (1 / 120) * 60 && (p.turbo > .3 || p.infTurbo()) && dist2(riser.x, riser.y, p.x, p.y) < 22) { c.shoveP = true; B.label = 'SHOVE'; }
    goTo(p, c, riser.x, riser.y, false);
    return c;
  }
  B.blockAt = null;
  if (handler && onBall && handler.state === 'run') {
    const d = dist2(p.x, p.y, handler.x, handler.y);
    if (d < tune('stealReach') + 4 && p.cd.steal <= 0 && S.rng() < D.steal * p.f('swipe') / 120) { c.passP = true; B.label = 'STEAL'; }
    const inPaint = dist2(handler.x, handler.y, own.x, own.y) < 80;
    if (d < 24 && (inPaint || S.rng() < .3) && (p.turbo > .3 || p.infTurbo()) && p.cd.shove <= 0 && S.rng() < D.shove * (inPaint ? 1.2 : .35) / 120) { c.shoveP = true; B.label = 'SHOVE'; }
  }
  return c;
}
/* ---- loose balls and shots in the air ---- */
function looseAI(p, c, D, B) {
  const b = S.ball, team = S.players.filter(q => q.team === p.team);
  let tx = b.x + b.vx * .25, ty = b.y + b.vy * .25;
  if (b.state === 'shot' && b.shot) { const rim = RIMS[b.shot.rim]; const off = (p.slot % 2 ? 1 : -1) * 18; tx = rim.x - rim.side * 26; ty = rim.y + off; }
  const near = team.slice().sort((a, q) => dist2(a.x, a.y, tx, ty) - dist2(q.x, q.y, tx, ty))[0];
  if (near === p || b.state === 'shot') {
    goTo(p, c, tx, ty, false); B.label = 'BOARDS'; if (dist2(p.x, p.y, tx, ty) > 60 && S.rng() < D.turbo) c.turboD = true;
    const reachTop = p.z + p.reach() + 30, close = dist2(p.x, p.y, b.x, b.y) < 22;
    if (close && b.z > p.reach() * .9 && b.z < reachTop + 20 && b.vz < 60 && p.cd.jump <= 0 && S.rng() < .2 + D.q * .3) c.shootP = true;
  } else { const own = defendRim(p.team); goTo(p, c, lerp(b.x, own.x, .5), lerp(b.y, own.y, .3), false); B.label = 'GET BACK'; }
  return c;
}


/* ==== 35-match.js ==== */
/* 35-match: one match (PLAN 6.3). Phases: 'tipoff' (REF ROSCOE tosses, the jumpers tap it), 'live' (both clocks run),
 * 'buzzer' (the clock hit zero with a shot in the air), 'dead' (after a basket: celebrate, jog), 'inbound' (the inbounder
 * passes in; the clock starts on the catch), 'sponsor' (a shattered backboard's fake commercial), 'break' (between
 * quarters: the scene shows the card), 'over'. Baskets, the shot clock, Supernova, style points, stats, power-ups. */
const POWERUPS = { floor: [], t: 0 };
function teamPlayers(team) { return S.players.filter(p => p.team === team); }
/** start a match. o: { court, home, away, lineups: [[ids], [ids]], humans: [[slot, input]], quarterLen, quarters, diff: [h, a],
 *  powerups, twists, mode, comeback, score, quarter, clock, tipoff, seed, jackpotAll } */
function newMatch(o) {
  S.rng = E.rng(o.seed !== undefined ? o.seed : (Math.random() * 1e9) | 0); S.fx = E.rng((o.seed || 7) + 99);
  S.mode = o.mode || 'exhibition'; S.court = o.court; S.events = []; S.lastShot = null;
  const teams = [o.home, o.away];
  S.teams = teams.map((id, k) => { const t = get('team', id), lineup = (o.lineups && o.lineups[k]) || t.players.slice(); return { id, lineup: lineup.slice(), bench: [] }; });
  S.players = [];
  for (const k of [0, 1]) for (let i = 0; i < 2; i++) { const p = new Baller(k * 2 + i, k, get('player', S.teams[k].lineup[i]), teams[k]); setSource(p, cpuSource()); S.players.push(p); }
  for (const k of [0, 1]) S.teams[k].bench = [get('player', S.teams[k].lineup[2])].filter(Boolean).map(d => ({ def: d, juice: 1 }));
  for (const [slot, input] of o.humans || []) { const p = S.players[slot]; if (p) { setSource(p, localSource(input)); p.human = (input.player || 1) - 1; } }
  S.ball = newBall();
  const QL = o.quarterLen || 120;
  S.match = { phase: 'tipoff', phaseT: 0, quarter: o.quarter || 1, quarters: o.quarters || 4, quarterLen: QL, clock: o.clock !== undefined ? o.clock : QL, shot: tune('shotClock'),
    score: (o.score || [0, 0]).slice(), poss: -1, arrow: 1, ot: 0, sudden: false, gameT: 0, shatters: 0, gold: [false, false], style: [0, 0], plays: [], diff: (o.diff || [1, 1]).slice(),
    comeback: o.comeback, tournament: !!o.tournament, powerupsOn: o.powerups !== false, twistsOn: o.twists !== false, starred: false, jumpers: [], tossT: 0, inbounder: null,
    deadSpots: null, inboundSpots: null, hubFast: false, breakKind: null, results: null, clutchOn: false, lastScoreT: 0, jackpotAll: !!o.jackpotAll, halfLen: o.halfLen, noOT: !!o.noOT };
  setTune('quarterLength', QL); TUNING.quarterLength.def = QL;
  POWERUPS.floor = []; POWERUPS.t = tune('powerupInterval') * .6;
  setupArena(o.court);
  setupTwists(o.court, S.match.twistsOn, o.jackpotAll);
  if (o.tipoff === false) { formation(); setupInbound(o.firstPoss || 0, 'half'); }
  else startTipoff();
  emit('matchStart', { court: o.court, home: o.home, away: o.away });
  return S.match;
}
/** everyone to their spots for a restart: HOME on the left half, AWAY on the right */
function formation() {
  for (const p of S.players) {
    const k = p.slot % 2, side = p.team === 0 ? -1 : 1;
    p.x = CMX + side * (k ? 90 : 40); p.y = CMY + (k ? 60 : -40) * (p.team === 0 ? 1 : -1); p.z = 0; p.vx = p.vy = p.vz = 0;
    p.setState('run'); p.jump = null; p.dunk = null; p.facing = p.team === 0 ? 0 : PI; p.tipJumped = false;
  }
}
function startTipoff() {
  const M = S.match; formation(); M.phase = 'tipoff'; M.phaseT = 0; M.tossT = -1;
  const jumper = team => teamPlayers(team).slice().sort((a, b) => b.r.swat - a.r.swat)[0];
  M.jumpers = [jumper(0), jumper(1)];
  M.jumpers[0].x = CMX - 9; M.jumpers[0].y = CMY; M.jumpers[1].x = CMX + 9; M.jumpers[1].y = CMY;
  const b = S.ball; b.state = 'dead'; b.owner = null; b.x = CMX; b.y = CMY + 18; b.z = 30; b.vx = b.vy = b.vz = 0; b.shot = null;
  M.ref = M.ref || { rig: castRig('roscoe'), x: CMX, y: CMY + 22 }; M.ref.x = CMX; M.ref.y = CMY + 22; M.ref.out = false;
  emit('tipoff', {});
}
function resetShotClock() { if (S.match) S.match.shot = tune('shotClock'); }
/** the inbound: team passes in; kind 'baseline' (after a basket: from under the basket it defends), 'sideline' (after a
 *  violation, at the ball's x), 'half' (a quarter's start, at half court) */
function setupInbound(team, kind, atX) {
  const M = S.match, rim = defendRim(team), dir = -rim.side;   // dir: the way the team attacks
  let ix, iy, rx, ry;
  if (kind === 'baseline') { ix = rim.side < 0 ? OX - 14 : OX + CW + 14; iy = CMY + 34; rx = ix + dir * 76; ry = CMY - 26; }
  else if (kind === 'sideline') { ix = clamp(atX === undefined ? CMX : atX, OX + 40, OX + CW - 40); iy = OY + CH + 14; rx = ix + dir * 30; ry = OY + CH - 54; }
  else { ix = CMX; iy = OY + CH + 14; rx = CMX + dir * 46; ry = OY + CH - 60; }
  const mates = teamPlayers(team), inb = mates.slice().sort((a, b) => dist2(a.x, a.y, ix, iy) - dist2(b.x, b.y, ix, iy))[0], rec = mates.find(q => q !== inb);
  if (kind === 'half') formationFor(team);
  inb.x = ix; inb.y = iy; inb.z = 0; inb.vx = inb.vy = 0; inb.setState('inbound'); inb.facing = Math.atan2(ry - iy, rx - ix);
  if (rec && (kind === 'half' || dist2(rec.x, rec.y, rx, ry) > 180)) { rec.x = rx; rec.y = ry; }
  for (const q of S.players) if (q !== inb && q.state !== 'knock') { q.jump = null; q.dunk = null; if (q.state !== 'run' && q.state !== 'cele') q.setState('run'); }
  const b = S.ball; b.state = 'held'; b.owner = inb; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.scored = false;
  M.phase = 'inbound'; M.phaseT = 0; M.inbounder = inb; M.poss = team; resetShotClock();
  M.inboundSpots = {}; if (rec) M.inboundSpots[rec.slot] = [rx, ry];
  for (const q of teamPlayers(1 - team)) { const k = q.slot % 2; M.inboundSpots[q.slot] = [rx + dir * (k ? 70 : 24), ry + (k ? 50 : 10)]; }
  emit('inbound', { team, kind, slot: inb.slot });
}
function formationFor(team) {
  for (const p of S.players) { const k = p.slot % 2;
    const own = defendRim(p.team); p.x = lerp(own.x, CMX, p.team === team ? 1.1 : .7) + (k ? 30 : -10) * -own.side; p.y = CMY + (k ? 50 : -40); p.vx = p.vy = 0; p.z = 0; p.setState('run'); p.jump = null; p.dunk = null; }
}
/** a basket through rim i (o.goaltend: awarded) */
function onBasket(i, o = {}) {
  const M = S.match, b = S.ball; if (!M || M.phase === 'dead' || M.phase === 'over' || M.phase === 'break' || M.phase === 'sponsor') return;
  const team = i === 1 ? 0 : 1, sh = b.shot && b.shot.team === team ? b.shot : null;
  const shooter = sh ? sh.shooter : (b.lastTouch && b.lastTouch.team === team ? b.lastTouch : teamPlayers(team)[0]);
  let pts = sh ? sh.points : 2; const base = pts;
  const jackpot = !!(sh && sh.jackpot && !sh.dunk), gold = M.gold[team];
  if (jackpot) pts += tune('jackpotBonus');
  if (gold) { pts *= 2; M.gold[team] = false; for (const p of teamPlayers(team)) if (p.pu && p.pu.id === 'gold') endPowerup(p, true); }
  M.score[team] += pts; shooter.stats.PTS += pts; shooter.stats.FGM++;
  if (sh && sh.points === 3) shooter.stats.TPM++;
  if (sh && sh.dunk) shooter.stats.DNK++;
  if (shooter.lastPassFrom && shooter.lastPassT < 3 && shooter.lastPassFrom.team === team && shooter.lastPassFrom !== shooter && !(sh && sh.oop)) shooter.lastPassFrom.stats.AST++;
  shooter.lastPassFrom = null;
  const buzzer = M.phase === 'buzzer' || (M.clock < 1 && M.phase === 'live');
  // heat and SUPERNOVA
  for (const q of teamPlayers(1 - team)) { q.heat = 0; if (q.nova > 0) novaOff(q); }
  if (shooter.nova > 0) { shooter.novaBaskets--; if (shooter.novaBaskets <= 0) novaOff(shooter); }
  else { shooter.heat++; if (shooter.heat >= tune('novaBaskets')) novaOn(shooter); }
  const kind = sh && sh.dunk ? 'dunk' : sh && sh.points === 3 ? 'three' : sh && sh.layup ? 'layup' : 'jumper';
  emit('basket', { team, pts, base, slot: shooter.slot, name: shooter.name, kind, dunk: sh && sh.dunk, three: !!(sh && sh.points === 3), jackpot, gold, perfect: !!(sh && sh.perfect), buzzer,
    goaltend: !!o.goaltend, oop: !!(sh && sh.oop), putback: !!(sh && sh.putback), dist: sh ? sh.dist : 0, airball: false, score: M.score.slice(), deep: !!(sh && sh.dist > THREE_R + 60) });
  if (jackpot) emit('jackpot', { slot: shooter.slot, name: shooter.name, team });
  M.lastScoreT = M.gameT; M.lastScorer = shooter;
  b.state = 'dead'; b.owner = null; b.shot = null;
  if (M.sudden) { endGame(); return; }
  M.endAfterDead = buzzer && M.clock <= 0;
  M.phase = 'dead'; M.phaseT = 0; M.inboundTeam = 1 - team; M.inboundKind = 'baseline';
  const dir = RIMS[i].side;
  M.deadSpots = {};
  for (const q of S.players) { const k = q.slot % 2; M.deadSpots[q.slot] = q.team === team ? [CMX - dir * (k ? 110 : 50), CMY + (k ? 50 : -40)] : [RIMS[i].x - dir * (k ? 90 : 20), CMY + (k ? -30 : 40)]; }
  if (shooter.source && shooter.source.kind === 'cpu' && shooter.state === 'run') startCele(shooter);
  shooter.celePending = shooter.source && shooter.source.kind === 'cpu';
}
function novaOn(p) { p.nova = tune('novaTime'); p.novaBaskets = tune('novaMaxBaskets'); p.heat = 0; p.stats.NOVA++; emit('supernovaOn', { slot: p.slot, name: p.name, team: p.team }); }
function novaOff(p) { if (p.nova <= 0) return; p.nova = 0; p.novaBaskets = 0; emit('supernovaOff', { slot: p.slot, name: p.name, team: p.team }); }
function shatterGlass(i, by) {
  const M = S.match, H = ARENA.hoops[i]; if (!H || !H.glass) return; H.glass = false; M.shatters++; by.stats.SHT++;
  M.sponsorPending = { rim: i, t: 0, line: SPONSOR_BREAKS[(M.shatters - 1) % SPONSOR_BREAKS.length] };
  emit('shatter', { slot: by.slot, name: by.name, rim: i, x: BOARD_X[i], y: CMY, z: 86 });
}
function endPowerup(p, used) { if (!p.pu) return; const id = p.pu.id; p.pu = null; emit('powerupEnd', { slot: p.slot, id, used: !!used }); }
function grantPowerup(p, id) {
  const def = get('powerup', id); if (!def) return;
  if (def.team) { S.match.gold[p.team] = true; }
  p.pu = { id, t: def.seconds, shots: def.shots || 0, uses: def.uses || 0 };
  emit('powerupPick', { slot: p.slot, name: p.name, id, team: p.team });
}
function spawnPowerup(id, x, y) {
  if (!id) { const ids = PU_ORDER; id = ids[Math.floor(S.rng() * ids.length)]; }
  for (let tries = 0; tries < 20 && (x === undefined || twistHazardAt(x, y)); tries++) { x = OX + 60 + S.rng() * (CW - 120); y = OY + 30 + S.rng() * (CH - 60); }
  const u = { id, x, y, t: 10, born: 0 }; POWERUPS.floor.push(u); emit('powerupSpawn', { id, x, y }); return u;
}
function powerupStep(dt) {
  const M = S.match, max = S.attract ? 2 : 1;
  for (const u of POWERUPS.floor) { u.t -= dt; u.born += dt; for (const p of S.players) if (p.z < 8 && dist2(p.x, p.y, u.x, u.y) < 11 && p.state !== 'knock' && u.t > 0) { grantPowerup(p, u.id); u.t = -1; break; } }
  E.prune(POWERUPS.floor, u => u.t <= 0);
  if (!M.powerupsOn || M.phase !== 'live') return;
  POWERUPS.t -= dt * (S.cheats.fastPowerups ? 4.4 : 1);
  if (POWERUPS.t <= 0) { POWERUPS.t = tune('powerupInterval') + (S.rng() - .5) * 12; if (POWERUPS.floor.length < max) spawnPowerup(); }
}
/** a quarter's end: the next quarter, halftime, overtime, Sudden Blam or the final */
function quarterEnd() {
  const M = S.match; sfx('buzzer'); emit('quarterEnd', { quarter: M.quarter, score: M.score.slice() });
  for (const p of S.players) { p.order = null; if (p.state === 'inbound') p.setState('run'); }
  const tied = M.score[0] === M.score[1], regEnd = M.quarter >= M.quarters;
  if (regEnd && !tied) return endGame();
  if (regEnd && tied && M.noOT) return endGame();
  if (regEnd && tied) {
    if (M.ot >= 2 || M.halfLen) { M.sudden = true; M.ot++; emit('suddenBlam', {}); M.phase = 'break'; M.breakKind = 'ot'; M.phaseT = 0; return; }
    M.ot++; emit('overtime', { ot: M.ot }); M.phase = 'break'; M.breakKind = 'ot'; M.phaseT = 0; return;
  }
  M.phase = 'break'; M.breakKind = M.quarter === Math.floor(M.quarters / 2) ? 'half' : 'quarter'; M.phaseT = 0;
  if (M.breakKind === 'half') emit('halftime', { score: M.score.slice() });
}
/** after the break card: the next period */
function nextPeriod() {
  const M = S.match;
  for (const p of S.players) { p.juice = Math.min(1, p.juice + .25); p.nova = p.nova > 0 ? p.nova : 0; }
  for (const t of S.teams) for (const bp of t.bench) bp.juice = Math.min(1, bp.juice + .5);
  M.quarter++;
  if (M.ot > 0) { M.clock = M.sudden ? 9999 : 60; M.quarterLen = M.clock; startTipoff(); emit('periodStart', { quarter: M.quarter, ot: M.ot, sudden: M.sudden }); return; }
  M.clock = M.quarterLen; const tl = M.tipLoser === undefined ? 1 : M.tipLoser, team = M.quarter === 2 || M.quarter === 3 ? tl : 1 - tl; M.arrow = team;
  if (TWIST.oil) placeSlicks();
  setupInbound(team, 'half');
  emit('periodStart', { quarter: M.quarter });
}
function endGame() {
  const M = S.match; M.phase = 'over'; M.phaseT = 0; S.ball.state = 'dead'; S.ball.owner = null;
  const w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1; M.winner = w;
  if (w >= 0) { M.style[w] += 2000 + 50 * Math.abs(M.score[0] - M.score[1]); for (const p of teamPlayers(w)) if (p.state === 'run') startCele(p); }
  sfx('buzzer'); emit('gameEnd', { winner: w, score: M.score.slice() });
}
/** subs (PLAN 6.14): swap an on-court player with the bench player */
function substitute(slot) {
  const p = S.players[slot], T = S.teams[p.team], bp = T.bench[0]; if (!bp) return null;
  const q = new Baller(slot, p.team, bp.def, p.teamId); q.juice = bp.juice; q.source = p.source; q.human = p.human; q.x = p.x; q.y = p.y; q.facing = p.facing;
  T.bench[0] = { def: p.def, juice: p.juice }; S.players[slot] = q; emit('sub', { slot, out: p.def.id, in: q.def.id }); return q;
}
function cpuSubs() { for (const T of [0, 1]) { const humans = teamPlayers(T).some(q => q.human !== null && q.human !== undefined); if (humans) continue; const tired = teamPlayers(T).slice().sort((a, b) => a.juice - b.juice)[0], bp = S.teams[T].bench[0]; if (tired && bp && bp.juice > tired.juice + .15) substitute(tired.slot); } }

/* ---- the step ---- */
function matchStep(dt) {
  const M = S.match, b = S.ball; if (!M) return;
  M.phaseT += dt; M.gameT += dt;
  if (M.phase === 'break' || M.phase === 'over' && M.phaseT > 6) { animAll(dt); updateArena(dt, TWIST.windOn ? TWIST.windX : 0); return; }
  // commands
  for (const p of S.players) {
    const c = p.source ? p.source.read(p, dt) : blankCmd();
    if (M.phase === 'tipoff' && !M.jumpers.includes(p)) { c.mx = c.my = 0; }
    if (M.phase === 'tipoff') { c.mx = c.my = 0; c.passP = c.shoveP = c.oopP = false; }
    if (M.phase === 'inbound' && p === M.inbounder && p.has) { if ((c.passP && M.phaseT > .25) || (p.source && p.source.kind !== 'cpu' && M.phaseT > 2.5)) inboundPass(p); }
    if (M.phase === 'sponsor' || M.phase === 'over') { c.shootP = c.passP = c.shoveP = c.oopP = false; if (M.phase === 'sponsor') c.mx = c.my = 0; }
    if (p.state === 'frozen') { c.mx = c.my = 0; }
    p.cmd = c;
  }
  for (const p of S.players) playerStep(p, dt);
  separate(dt);
  if (M.phase === 'inbound') { const inb = M.inbounder; for (const q of teamPlayers(1 - inb.team)) { const d = dist2(q.x, q.y, inb.x, inb.y); if (d < 24 && d > .1) { q.x = inb.x + (q.x - inb.x) / d * 24; q.y = inb.y + (q.y - inb.y) / d * 24; } } }
  animAll(dt);
  // the ball
  if (b.state === 'held' || b.state === 'dunk') ballHeldStep(dt); else if (b.state === 'pass') passStep(dt); else ballPhysics(dt);
  if (M.phase !== 'tipoff') catchStep(dt); else tipStep(dt);
  // the clocks
  if (M.phase === 'live') {
    if (!S.dev.freezeClock && !M.sudden && !M.practice) M.clock -= dt;
    if (!S.dev.freezeShot && !M.practice && b.state === 'held') M.shot -= dt;
    for (const p of S.players) if (p.nova > 0) { p.nova -= dt; if (p.nova <= 0) { p.nova = 1e-9; novaOff(p); } }
    if (M.shot <= 0 && b.state === 'held') { sfx('buzzer'); const tm = b.owner.team, x = b.owner.x; emit('shotClockViolation', { team: tm }); b.state = 'dead'; setupInbound(1 - tm, 'sideline', x); }
    else if (M.clock <= 0) { M.clock = 0; if (b.state === 'shot' || (b.state === 'loose' && b.shot && !b.shot.rimmed && !b.shot.blocked)) { M.phase = 'buzzer'; M.phaseT = 0; sfx('buzzer'); } else quarterEnd(); }
    if (!M.clutchOn && M.quarter >= M.quarters && M.clock < 30 && Math.abs(M.score[0] - M.score[1]) <= 6) { M.clutchOn = true; emit('clutch', {}); }
  } else if (M.phase === 'buzzer') {
    if (b.state !== 'shot' && (!b.shot || b.shot.rimmed || b.shot.blocked || b.z <= BALL_R + 1) || M.phaseT > 3) { if (M.phase === 'buzzer') quarterEnd(); }
  } else if (M.phase === 'dead') {
    for (const p of S.players) if (p.celePending && p.state === 'run' && p.z === 0) { p.celePending = false; startCele(p); }
    if (M.phaseT > 1.1 && M.endAfterDead && !M.sponsorPending) { M.endAfterDead = false; quarterEnd(); }
    else if (M.phaseT > 1.1 && !M.sponsorPending) setupInbound(M.inboundTeam, M.inboundKind);
    if (M.sponsorPending && M.phaseT > .9) { M.phase = 'sponsor'; M.phaseT = 0; emit('sponsorBreak', { line: M.sponsorPending.line, rim: M.sponsorPending.rim }); }
  } else if (M.phase === 'sponsor') {
    if (M.phaseT > 4.2) { ARENA.hoops[M.sponsorPending.rim].glass = true; M.sponsorPending = null; if (M.endAfterDead) { M.endAfterDead = false; quarterEnd(); } else setupInbound(M.inboundTeam, M.inboundKind); }
  } else if (M.phase === 'inbound') {
    if (b.state === 'held' && b.owner !== M.inbounder) { M.phase = 'live'; M.phaseT = 0; M.inbounder.setState('run'); M.inbounder = null; }
    else if (b.state === 'loose') { M.phase = 'live'; if (M.inbounder) M.inbounder.setState('run'); M.inbounder = null; }
  } else if (M.phase === 'over') {
    for (const p of S.players) if (p.state === 'run' && M.winner === p.team && p.st > 1.5) startCele(p);
  }
  if (M.phase === 'live' && b.state === 'shot' && b.shot && !b.shot.made && b.z < 30 && b.shot.rimmed) b.state = 'loose';
  if (M.phase !== 'over') { twistStep(dt); powerupStep(dt); }
  updateArena(dt, TWIST.windOn ? TWIST.windX : 0);
}
function animAll(dt) { for (const p of S.players) animStep(p, dt); if (S.match && S.match.ref) refStep(dt); }
function inboundPass(p) {
  const rec = p.mate; if (!rec || !p.has) return;
  passBall(p, rec, 'inbound'); const ps = S.ball.pass; ps.arc = 14;
  ps.laneOk = true; p.setState('run'); p.x += Math.cos(p.facing) * 4;
}
/** the tip-off: the toss, the jumpers' taps */
function tipStep(dt) {
  const M = S.match, b = S.ball;
  if (M.tossT < 0 && M.phaseT > .7) { M.tossT = 0; b.x = CMX; b.y = CMY; b.z = 34; b.vz = Math.sqrt(2 * tune('ballGravity') * (120 - 34)); b.vx = b.vy = 0; b.state = 'dead'; sfx('whistle'); }
  if (M.tossT >= 0) M.tossT += dt;
  for (const j of M.jumpers) {
    if (j.state !== 'air' || M.tossT < 0) continue;
    const h = [j.x, j.y, j.z + j.reach()];
    if (Math.hypot(h[0] - b.x, h[1] - b.y, h[2] - b.z) < 13) {
      const mate = j.mate, to = mate || j, v = E.arc({ x: b.x, y: b.y, z: b.z }, { x: to.x, y: to.y, z: 30 }, tune('ballGravity'), { apex: 12 });
      b.state = 'loose'; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.lastTouch = j; b.noCatch = .3; b.noCatchBy = j;
      M.phase = 'live'; M.phaseT = 0; M.tipLoser = 1 - j.team; M.arrow = 1 - j.team; sfx('steal', { vol: .4 });
      emit('tipWin', { slot: j.slot, name: j.name, team: j.team }); return;
    }
  }
  if (M.tossT > 1.2 && b.z < 50 && b.vz < 0) { b.state = 'loose'; M.phase = 'live'; M.tipLoser = 1; M.arrow = 1; emit('tipWin', { slot: -1, team: -1 }); }
}
function refStep(dt) {
  const M = S.match, R = M.ref; if (!R) return;
  if (M.phase !== 'tipoff') { R.out = true; R.y = approach(R.y, OY + CH + 70, 90 * dt); }
  const tossing = M.phase === 'tipoff' && M.phaseT > .45 && M.phaseT < .9;
  R.rig.bb.pose = tossing ? { R: [3, 2, 44], L: [3, -2, 40] } : M.phase === 'tipoff' ? { R: [6, 2, 24], L: [6, -2, 24] } : null; R.rig.bb.w = approach(R.rig.bb.w, R.rig.bb.pose ? 1 : 0, dt * 10);
  R.rig.update(dt, { x: R.x, y: R.y, z: 0, vx: R.out ? 0 : 0, vy: R.out && R.y < OY + CH + 68 ? 90 : 0, facing: R.out ? PI / 2 : -PI / 2 });
  if (M.phase === 'tipoff' && S.ball.state === 'dead' && M.tossT < 0) { const w = R.rig.worldOffset(V3.lerp(R.rig.J.handR || [0, 0, 30], R.rig.J.handL || [0, 0, 30], .5)); S.ball.x = R.x + w[0]; S.ball.y = R.y + w[1]; S.ball.z = w[2] + 3; }
}


/* ==== 36-fx.js ==== */
/* 36-fx: presentation. The camera director (the broadcast camera pans with the ball and leads the play; the dunk cam
 * zooms and slows time round the apex), the comic banners ("BLAM!", "REJECTED!") one at a time by priority, and the
 * wiring from the match's events to particles, hit-stop, shake, flashes, rumble, sounds, the crowd, the announcer and
 * style points (PLAN 9). Comfort settings (reduce motion, shake, flashes) are applied by the engine and here. */
const CAM = { x: CMX, y: CMY, zoom: 1, zoomTo: 1, slowFrom: 0, slowTo: 0, slowK: 1, dunk: null, shake: 0 };
function cameraReset() { CAM.x = CMX; CAM.y = CMY; CAM.zoom = 1; CAM.zoomTo = 1; CAM.slowFrom = 0; CAM.slowTo = 0; CAM.dunk = null; game.cam.smooth = 0; game.setZoom(1); }
function cameraStep(dt, realDt) {
  const b = S.ball, M = S.match, high = game.view && game.view.id === 'threequarter';
  let fx = CMX, fy = CMY;
  if (b && M) {
    fx = b.owner ? b.owner.x : b.x; fy = b.owner ? b.owner.y : b.y;
    if (M.poss >= 0 && (M.phase === 'live' || M.phase === 'inbound')) fx += 48 * attackRim(M.poss).side;
    if (M.phase === 'tipoff') { fx = CMX; fy = CMY; }
    if (CAM.dunk && CAM.dunk.p.state === 'dunk') { const p = CAM.dunk.p, rim = attackRim(p.team); fx = (p.x + rim.x) / 2; fy = (p.y + rim.y) / 2; }
  }
  if (S.dev.freeCam) { const m = game.input.move(); CAM.x += m[0] * 200 * realDt; fx = CAM.x; }
  const k = 1 - Math.exp(-realDt / .16);
  CAM.x += (fx - CAM.x) * k; CAM.y += (fy - CAM.y) * k;
  const z = CAM.zoom = approach(CAM.zoom, CAM.zoomTo, realDt * (CAM.zoomTo > CAM.zoom ? 1.2 : .7)), halfW = game.W / 2 / Math.max(.5, (game.zoom || 1) * (high ? 1.5 : 1));
  const x0 = OX - 60 + halfW, x1 = OX + CW + 60 - halfW, cx = x0 > x1 ? CMX : clamp(CAM.x, x0, x1);
  const zz = z * (high ? .56 : 1);   // the High camera (the engine's three-quarter view, 1.5x) pulls back to show the court
  if (Math.abs((CAM.lastZ || 0) - zz) > .0005) { game.setZoom(zz); CAM.lastZ = zz; }
  game.cam.offset = high ? [0, 0] : [0, Math.round(game.H * .12 * (CAM.dunk ? .6 : 1))];
  game.focus(cx, high ? clamp(CAM.y, OY + 40, OY + CH - 20) : CMY, 0);
  // time: the dev speed, slow motion round a dunk's apex
  const now = game.real, slow = now >= CAM.slowFrom && now <= CAM.slowTo ? CAM.slowK : 1;
  game.timeScale = (S.dev.speed || 1) * tune('gameSpeed') * slow * (S.dev.frozen && !S.dev.stepping ? 0 : 1);
}
const reduce = () => !!(game.settings && game.settings.reduceMotion) || game.reduceMotion;

/* ---- banners ---- */
const BANNER_PRIO = { SHATTERED: 10, SUPERNOVA: 9, POSTERIZED: 8, DUNK: 7, OOP: 6, REJECTED: 5, JACKPOT: 4, THREE: 3, PICKPOCKET: 2, ANKLES: 1, INFO: 0 };
const BANNERS = { cur: null };
function banner(text, kind = 'INFO', colors, o = {}) {
  const prio = BANNER_PRIO[kind] || 0, cur = BANNERS.cur;
  if (cur && cur.t < cur.dur && (BANNER_PRIO[cur.kind] || 0) > prio && !o.force) return;
  BANNERS.cur = { text, kind, colors: colors || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], t: 0, dur: o.dur || 1.25, scale: o.scale || (text.length > 14 ? 2 : 3), sub: o.sub || '' };
}
const BANNER_COLORS = { dunk: ['#fff6c0', '#ffd23a', '#ff8a2a', '#c8401a'], three: ['#e8ffff', '#7af0ff', '#2ab8ff', '#1a5ad0'], block: ['#ffe8e8', '#ff7a7a', '#ff2a2a', '#8a1010'],
  steal: ['#e8ffe8', '#8aff8a', '#2ad84a', '#107a20'], nova: ['#ffffff', '#d8a0ff', '#a050ff', '#ffd23a'], shatter: ['#ffffff', '#c8f0ff', '#7ad0ff', '#3a8ad0'], jackpot: ['#fffbe0', '#ffe060', '#ffc020', '#a06a00'],
  poster: ['#ffe8ff', '#ff8ae0', '#ff3ac0', '#8a1060'], info: ['#ffffff', '#e8e0ff', '#b8a8f0', '#6a5aa0'] };
function bannerStep(dt) { const B = BANNERS.cur; if (B) { B.t += dt; if (B.t > B.dur + .2) BANNERS.cur = null; } for (const b of BARKS) b.t -= dt; E.prune(BARKS, b => b.t <= 0); }
function drawBanner(g, r) {
  const B = BANNERS.cur; if (!B) return;
  const t = B.t, k = t < .25 ? E.ease.outBack(t / .25) : 1, fade = t > B.dur ? 1 - (t - B.dur) / .2 : 1; if (fade <= 0) return;
  const sc = Math.max(1, Math.round(B.scale * k)), y = Math.round(r.H * .3) - sc * 4;
  if (fade < 1 && Math.floor(t * 30) % 2) return;
  E.font.title(g, B.text, Math.round(r.W / 2), y, { align: 'center', scale: sc, colors: B.colors, depth: 2, depthColor: '#1a0c24' });
  if (B.sub) E.font.text(g, B.sub, Math.round(r.W / 2), y + sc * 9 + 4, '#fff6d8', { align: 'center', outline: '#1a0c24' });
}

/* ---- events -> effects, sound, crowd, announcer, style points ---- */
const STYLE = { dunk: 200, three: 150, alleyoop: 250, block: 100, steal: 80, putback: 150, posterized: 200, shatter: 1000, supernova: 300, jackpot: 250, ankles: 100 };
function stylePts(team, pts, what, name) { const M = S.match; if (!M || team < 0) return; M.style[team] += pts; M.plays.push({ team, pts, what, name, q: M.quarter, t: M.gameT }); }
function rumbleFor(slot, k, s) { const p = S.players[slot]; if (p && p.human !== null && p.human !== undefined) { const I = game.players[p.human]; if (I && I.rumble) I.rumble(k, s); } }
const humanTeam = () => { const p = S.players.find(q => q.human !== null && q.human !== undefined); return p ? p.team : 0; };
function wireFx() {
  on('tipoff', () => { if (S.match.quarter === 1 && S.match.ot === 0) announce('tipoff'); });
  on('tipWin', () => { sting('tip'); sfx('whistle', { vol: .4 }); });
  on('basket', e => {
    const M = S.match, p = S.players[e.slot], rim = attackRim(e.team);
    if (!e.dunk) { sfx('swish'); P.glints(rim.x, rim.y, RIM_Z - 8, 6, '#ffffff'); }
    crowdReact('cheer', e.dunk ? 1 : .4);
    if (e.pts >= 3 || e.dunk) crowdReact('flash', e.dunk ? 1 : .5);
    if (e.goaltend) { banner('GOALTEND!', 'REJECTED', BANNER_COLORS.block); announce('goaltend', { NAME: '' }); }
    else if (e.buzzer) announce('buzzer', { NAME: e.name });
    else if (e.jackpot) announce('jackpot', { NAME: e.name });
    else if (e.three) { banner(e.deep ? 'FROM DOWNTOWN!' : 'THREE!', 'THREE', BANNER_COLORS.three); announce(e.deep ? 'deepThree' : 'three', { NAME: e.name }); stylePts(e.team, STYLE.three, 'THREE', e.name); }
    else if (!e.dunk) announce(e.putback ? 'putback' : e.kind === 'layup' ? 'layup' : 'jumper', { NAME: e.name });
    if (e.gold) banner('GOLD BALL x2!', 'JACKPOT', BANNER_COLORS.jackpot, { force: true });
    if (e.perfect && !e.dunk) { P.text(p.x, p.y, 60, 'PERFECT!', '#7af0ff', { scale: 1 }); }
    // the comeback and the blowout
    const d = M.score[0] - M.score[1], prev = M.prevDiff || 0; M.prevDiff = d;
    if (Math.abs(prev) >= 8 && Math.abs(d) <= 3) announce('comeback', { TEAM: get('team', S.teams[d >= 0 ? 0 : 1].id).short });
    else if (Math.abs(d) >= 15 && M.blowoutQ !== M.quarter) { M.blowoutQ = M.quarter; announce('blowout', { TEAM: get('team', S.teams[d > 0 ? 0 : 1].id).short }); }
  });
  on('dunkStart', e => {
    const p = S.players[e.slot]; if (!p || reduce()) return;
    CAM.dunk = { p }; CAM.zoomTo = 1.25; const now = game.real; CAM.slowFrom = now + e.apexT - .17; CAM.slowTo = now + e.apexT + .3; CAM.slowK = tune('dunkSlowMo');
    if (e.vent) announce('vent', { NAME: e.name });
  });
  on('dunk', e => {
    const p = S.players[e.slot], def = get('dunk', e.dunk);
    banner(e.banner, 'DUNK', BANNER_COLORS.dunk, { sub: e.oop ? 'ALLEY-OOP!' : e.putback ? 'PUTBACK!' : '' });
    game.freeze(.08); game.shake(4); if (!reduce()) game.flash('#ffffff', .06, .6);
    P.ring(e.x, e.y, 4, 26, '#fff6c0', .4); P.sparks(e.x, e.y, e.z, 16, null, { color: '#ffd23a' }); P.glints(e.x, e.y, e.z, 10, '#ffffff');
    if (def && def.fire) P.fire(e.x, e.y, e.z, 14, { size: 1.2 });
    sfx('slam'); sfx('crowd_roar'); crowdReact('cheer', 1.2); crowdReact('flash', 1);
    rumbleFor(e.slot, .6, .2); ARENA.pyro = ARENA.court.id === 'dome' ? 1 : 0;
    if (ARENA.court.id === 'dome') { sfx('pyro'); for (const x of [OX + 10, OX + CW - 10]) P.fire(x, OY - 20, 0, 14, { size: 1.6 }); }
    announce(e.oop ? 'alleyoop' : e.putback ? 'putback' : e.lines || 'dunkPower', { NAME: e.name, VICTIM: e.victim || '' });
    stylePts(p.team, STYLE.dunk + (e.bonus || 0) + (e.oop ? STYLE.alleyoop : 0) + (e.putback ? STYLE.putback : 0), e.banner, e.name);
    if (e.victim) { const v = S.players.find(q => q.name === e.victim); if (v && S.fx() < .6) game.after(.3, () => bark(p, pickF(p.def.barks))); }
    game.after(.5, () => { CAM.zoomTo = 1; CAM.dunk = null; });
  });
  on('dunkMiss', e => { announce('miss', { NAME: e.name }); sfx('crowd_ooh'); CAM.zoomTo = 1; CAM.dunk = null; });
  on('alleyoop', () => banner('ALLEY-OOP!', 'OOP', BANNER_COLORS.dunk));
  on('posterized', e => { banner('POSTERIZED!', 'POSTERIZED', BANNER_COLORS.poster, { sub: e.victim }); announce('posterized', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.posterized, 'POSTERIZED', e.name); sfx('dizzy'); });
  on('shatter', e => {
    banner('SHATTERED!', 'SHATTERED', BANNER_COLORS.shatter, { force: true, dur: 1.6 });
    game.freeze(.15); if (!reduce()) { game.flash('#c8f0ff', .12, .8); CAM.slowFrom = game.real; CAM.slowTo = game.real + .5; CAM.slowK = .3; }
    P.bits(e.x, e.y, e.z, 60, ['#cfeeff', '#ffffff', '#8ad0ff']); P.glints(e.x, e.y, e.z, 30, '#ffffff'); P.ring(e.x, e.y, 6, 40, '#c8f0ff', .5);
    sfx('shatter'); sting('shatter'); crowdReact('cheer', 1.6); crowdReact('flash', 1.5); rumbleFor(e.slot, 1, .4);
    announce('shatter', { NAME: e.name }, { force: true }); stylePts(S.players[e.slot].team, STYLE.shatter, 'SHATTERED THE GLASS', e.name);
  });
  on('sponsorBreak', () => sting('sponsor'));
  on('block', e => { banner('REJECTED!', 'REJECTED', BANNER_COLORS.block); announce('block', { NAME: e.name, VICTIM: e.victim }); sfx('crowd_ooh'); rumbleFor(e.slot, .4, .15); stylePts(S.players[e.slot].team, STYLE.block, 'BLOCK', e.name); if (S.fx() < .4) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('steal', e => { banner('PICKPOCKET!', 'PICKPOCKET', BANNER_COLORS.steal); announce('steal', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.steal, 'STEAL', e.name); if (S.fx() < .5) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('shove', e => { announce('shove', { NAME: e.name, VICTIM: e.victim }); const v = S.players[e.vslot]; if (v && v.team === humanTeam() && S.mode !== 'attract') sfx('crowd_boo', { vol: .4 }); rumbleFor(e.vslot, .5, .2); if (S.fx() < .35) bark(S.players[e.slot], pickF(S.players[e.slot].def.barks)); });
  on('knockdown', e => { const p = S.players[e.slot]; if (p) P.dust(p.x, p.y, 0, 10); });
  on('anklesBroken', e => { banner('ANKLES BROKEN!', 'ANKLES', BANNER_COLORS.steal); announce('ankles', { NAME: e.name, VICTIM: e.victim }); stylePts(S.players[e.slot].team, STYLE.ankles, 'ANKLES BROKEN', e.name); sfx('crowd_ooh'); });
  on('airball', e => { announce('airball', { NAME: e.name }); sfx('crowd_ooh', { vol: .5 }); });
  on('rim', () => { const b = S.ball; if (b.shot && !b.shot.made && !b.shot.blocked && S.fx() < .25) announce('miss', { NAME: b.shot.shooter.name }); if (b.shot && b.shot.team === 0) crowdReact('slump', .4); });
  on('supernovaOn', e => {
    const p = S.players[e.slot]; banner('SUPERNOVA!', 'SUPERNOVA', BANNER_COLORS.nova, { force: true, sub: e.name });
    P.ring(p.x, p.y, 6, 40, '#c890ff', .5); P.fire(p.x, p.y, 20, 20, { size: 1.1 }); sfx('nova_on'); sting('nova'); musicLayer('nova', true); ARENA.bob = 1;
    announce('novaOn', { NAME: e.name }); stylePts(e.team, STYLE.supernova, 'SUPERNOVA', e.name);
  });
  on('supernovaOff', e => { announce('novaOff', { NAME: e.name }); if (!S.players.some(p => p.nova > 0)) musicLayer('nova', false); });
  on('goaltend', () => sfx('whistle'));
  on('jackpot', e => { banner('JACKPOT!', 'JACKPOT', BANNER_COLORS.jackpot, { force: true }); sfx('jackpot'); stylePts(e.team, STYLE.jackpot, 'JACKPOT', e.name); moveSpot(); });
  on('powerupSpawn', e => { sfx('pu_spawn'); P.glints(e.x, e.y, 6, 10, get('powerup', e.id).color); P.ring(e.x, e.y, 2, 18, get('powerup', e.id).color, .4); });
  on('powerupPick', e => { const p = S.players[e.slot], def = get('powerup', e.id); sfx('pu_pick'); P.glints(p.x, p.y, 20, 12, def.color); P.text(p.x, p.y, 62, '+' + def.name, def.color, { scale: 1 }); announce('pu_' + e.id, { NAME: e.name, TEAM: get('team', p.teamId).short }); });
  on('powerupEnd', e => { if (!e.used) sfx('pu_end', { vol: .5 }); });
  on('twist', e => { if (e.kind === 'gust') announce('gust'); if (e.kind === 'eruption') { banner('ERUPTION!', 'INFO', BANNER_COLORS.dunk); announce('eruption'); sfx('bomb_whistle'); } });
  on('oilSlip', e => announce('oil', { NAME: e.name }));
  on('superBlock', e => announce('vent', { NAME: e.name }));
  on('bombHit', e => { banner('BLAM BOMB!', 'REJECTED', BANNER_COLORS.dunk, { force: true }); announce('bombHit', { NAME: e.name }); sfx('bomb_hit'); });
  on('overclock', () => { banner('OVERCLOCK!', 'SUPERNOVA', BANNER_COLORS.block, { force: true }); musicLayer('overclock', true); announce('overclock', {}, { force: true }); ARENA.jumboMsg = 'OVERCLOCK'; });
  on('overclockOff', () => { if (!S.players.some(p => p.overclock > 0)) musicLayer('overclock', false); });
  on('reboot', e => { banner('SYSTEM REBOOT!', 'REJECTED', BANNER_COLORS.shatter, { force: true }); sfx('reboot'); announce('reboot', { NAME: e.name }, { force: true }); });
  on('shotClockViolation', () => { announce('shotClock'); banner('SHOT CLOCK!', 'INFO', BANNER_COLORS.info); });
  on('quarterEnd', () => { const M = S.match; if (M.quarter === Math.floor(M.quarters / 2) && M.quarters > 1) announce('halftime', {}, { force: true }); else if (M.quarter < M.quarters) announce('quarterEnd', {}, { force: true }); });
  on('clutch', () => { announce('clutch'); musicLayer('clutch', true); try { if (musicNow && SONGS[musicNow]) A.tempo(SONGS[musicNow].bpm + 6); } catch (err) { game.fail('tempo', err); } });
  on('overtime', () => { banner('OVERTIME!', 'INFO', BANNER_COLORS.info, { force: true }); announce('overtime', {}, { force: true }); sfx('horn'); });
  on('suddenBlam', () => { banner('SUDDEN BLAM!', 'INFO', BANNER_COLORS.block, { force: true }); announce('suddenBlam', {}, { force: true }); sfx('horn'); });
  on('gameEnd', e => {
    if (e.winner >= 0) announce('final', { TEAM: get('team', S.teams[e.winner].id).short }, { force: true });
    const ht = humanTeam(), anyHuman = S.players.some(p => p.human !== null && p.human !== undefined);
    sting(!anyHuman || e.winner === ht ? 'victory' : 'defeat'); musicLayer('clutch', false);
  });
  on('taunt', e => { bark(S.players[e.slot], e.bark); if (S.fx() < .3) announce('taunt', { NAME: e.name }); });
  on('call', e => { const p = S.players[e.slot]; if (p && S.fx() < .5) bark(p, e.kind === 'oop' ? 'Up top!' : 'Here!'); });
  on('reboot', () => { if (S.mode === 'tour' && !TOUR.seenReboot) { TOUR.seenReboot = true; game.after(1.6, () => playInPlayBeat('reboot')); } });
  on('overclock', () => { if (S.mode === 'tour') game.after(1.2, () => playInPlayBeat('overclock')); });
}


/* ==== 37-match-scene.js ==== */
/* 37-match-scene: the scene a match is played in (Exhibition, the Tour, Blam Camp, the attract mode and the hub all use
 * it). Each step: the match (37 -> 35), banners, the camera, the crowd's sound, the break card between quarters, the
 * end of the game handed to the mode's flow (S.flow.onEnd). The dev panel, when open, drives the human slots by CPU. */
const FLOW = { onEnd: null, onBreak: null, lesson: null };
function startMatchScene(opts, flow = {}) {
  FLOW.onEnd = flow.onEnd || null; FLOW.onBreak = flow.onBreak || null; FLOW.lesson = flow.lesson || null; FLOW.noBreakCard = !!flow.noBreakCard; FLOW.openDev = !!flow.openDev;
  game.go('match', { match: opts }, { fade: flow.fade === undefined ? 'wipe' : flow.fade });
}
function matchEnter(d) {
  S.dev.open = false; ANN.cap = null; BANNERS.cur = null; BARKS.length = 0;
  newMatch(d.match);
  S.lesson = FLOW.lesson || null; FLOW.lesson = null;
  if (HUB && NET.info) hubAssignSources();
  if (FLOW.openDev && !HUB) { FLOW.openDev = false; S.dev.open = true; }
  cameraReset(); applyCamera(); game.cam.smooth = 0;
  playMusic(ARENA.court.music);
  BREAK.open = false;
  if (S.cheats.bigHeads && !S.match.starredBy) S.match.starred = true;
  game.resetCamera();
}
function matchUpdate(dt) {
  const M = S.match; if (!M) return;
  const realDt = 1 / 120;
  if (HUB && NET.info) { hubMenuUpdate(); if (hubStep(dt)) return; }
  if (SC.match) SC.match.pausable = !HUB && !S.dev.open;
  // the dev panel drives the human slots by CPU while it has the focus
  if (S.dev.open) { devAutopilot(true); devUpdate(); }
  if (M.phase === 'break') { if (BREAK.update(dt)) return; }
  if (S.lesson && S.lesson.update) S.lesson.update(dt);
  matchStep(dt);
  if (M.phase === 'break' && !BREAK.open) { if (FLOW.noBreakCard) { cpuSubs(); nextPeriod(); } else BREAK.show(M.breakKind); if (FLOW.onBreak) FLOW.onBreak(M.breakKind); }
  if (M.phase === 'over' && M.phaseT > 3.2 && !M.ended && !HUB) { M.ended = true; const res = matchResult(); S.lastResult = res; if (FLOW.onEnd) FLOW.onEnd(res); else game.go('results', { res }); }
  bannerStep(dt); cameraStep(dt, realDt); hudSounds();
  crowdTick(realDt, true);
}
/** what a finished match says: winner, score, MVP, the best play, box score, style */
function matchResult() {
  const M = S.match, w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  const all2 = S.players.slice(), mvp = all2.slice().sort((a, b) => (b.stats.PTS * 2 + b.stats.REB + b.stats.AST + b.stats.STL * 2 + b.stats.BLK * 2 + b.stats.DNK) - (a.stats.PTS * 2 + a.stats.REB + a.stats.AST + a.stats.STL * 2 + a.stats.BLK * 2 + a.stats.DNK) + (w >= 0 ? (b.team === w) - (a.team === w) : 0) * 6)[0];
  const best = M.plays.slice().sort((a, b) => b.pts - a.pts)[0] || null;
  return { winner: w, score: M.score.slice(), teams: S.teams.map(t => t.id), court: S.court, mvp: mvp && { id: mvp.def.id, name: mvp.name, team: mvp.team, stats: Object.assign({}, mvp.stats) }, best,
    box: all2.map(p => ({ slot: p.slot, id: p.def.id, name: p.name, team: p.team, human: p.human, stats: Object.assign({}, p.stats) })), style: M.style.slice(), starred: M.starred, mode: S.mode, ot: M.ot, quarters: M.quarters };
}
function matchDraw(r) {
  const M = S.match; if (!M) return;
  if (HUB && NET.role === 'server') { r.sky(['#05040a', '#0a0814']); r.overlay(g => hubOverlay(g, r)); return; }
  drawArena(r); drawTwists(r); drawWorldMarks(r); if (S.lesson && S.lesson.world) S.lesson.world(r);
  for (const p of S.players) drawPlayer(r, p);
  if (M.ref && M.ref.y < OY + CH + 66) { const R = M.ref; r.shadow(R.x, R.y, 6, .4); r.actor(R.x, R.y, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view)); }
  drawBall(r);
  if (S.dev.overlays) devOverlays(r);
  r.overlay(g => {
    if (!S.lesson) drawScoreBug(g, r); drawBanner(g, r); drawHudBottom(g, r);
    if (M.phase === 'sponsor') drawSponsor(g, r);
    if (M.phase === 'tipoff' && M.quarter === 1 && M.ot === 0) E.font.title(g, 'TIP-OFF!', Math.round(r.W / 2), Math.round(r.H * .2), { align: 'center', scale: 2, colors: BANNER_COLORS.info });
    if (M.phase === 'inbound' && M.inbounder && M.inbounder.human !== null && M.inbounder.human !== undefined) promptLine(g, '{pass} INBOUND', Math.round(r.W / 2), Math.round(r.H * .22), { align: 'center', input: game.players[M.inbounder.human] || game.input });
    if (M.phase === 'over') { const w = M.winner; E.font.title(g, w < 0 ? 'TIE GAME' : 'FINAL', Math.round(r.W / 2), Math.round(r.H * .42), { align: 'center', scale: 3, colors: BANNER_COLORS.dunk }); if (w >= 0) E.font.text(g, get('team', S.teams[w].id).name + ' WIN!', Math.round(r.W / 2), Math.round(r.H * .42) + 30, '#ffffff', { align: 'center', outline: '#0c0614' }); }
    if (S.lesson && S.lesson.draw) S.lesson.draw(g, r);
    if (S.attract) drawAttractOverlay(g, r);
  });
  if (M.phase === 'break' && BREAK.open && !HUB) BREAK.draw(r);
  if (S.dev.open) devDraw(r);
  if (HUB && NET.info) r.overlay(g => hubOverlay(g, r));
}
/** the sponsor break after a shattered backboard: a fake commercial card while a cleaning bot fits new glass */
function drawSponsor(g, r) {
  const M = S.match, t = M.phaseT, k = clamp(t / .3, 0, 1), w = Math.min(r.W - 40, 300), h = 92, x = Math.round((r.W - w) / 2), y = Math.round(r.H * .3 - (1 - k) * 200);
  E.ui.box(g, x, y, w, h, { bg: ['#fff4d8', '#ffd8a0'], border: '#d02a2a' });
  E.font.title(g, 'GLOBO-BLAM', x + w / 2, y + 6, { align: 'center', scale: 2, colors: ['#ff5a3a', '#d02a2a', '#8a1010'] });
  px.sprite(g, LOGOS.globo.spr, x + 8, y + 8); px.sprite(g, LOGOS.globo.spr, x + w - 20, y + 8);
  wrapText(M.sponsorPending ? M.sponsorPending.line : '', w - 20).slice(0, 4).forEach((l, i) => E.font.text(g, l, x + w / 2, y + 30 + i * 9, '#3a1a0c', { align: 'center', outline: false }));
  E.font.text(g, 'WE\'LL BE RIGHT BACK!', x + w / 2, y + h - 12, Math.floor(t * 3) % 2 ? '#d02a2a' : '#3a1a0c', { align: 'center', outline: false });
}


/* ==== 40-ui-kit.js ==== */
/* 40-ui-kit: the 10-foot interface (PLAN 11.1-11.2). Glyph icons drawn in pixels for every device (PlayStation's
 * cross, circle, square, triangle; Xbox's A B X Y; keycaps sized to their text; a mouse with the bound button lit),
 * prompt lines that swap {action} tokens for the icons of the device each player used last, menu navigation read from
 * every player (pad, keys, mouse hover and clicks, the wheel), big focusable buttons with an animated outline, rating
 * pips and cards. Body text is the 5x7 font at scale 1 or more; never the tiny font for anything a player needs. */
const UIC = { ink: '#fff7ec', paper: '#140c24', panel: '#1e1434', accent: '#ff3ca6', accent2: '#2de2ff', gold: '#ffd23a', muted: '#9a8fb8', line: '#3a2a5a', dim: '#5a4e78' };
const PS_BTN = { 0: ['x', '#7ab4ff'], 1: ['o', '#ff6a6a'], 2: ['s', '#ff8ad8'], 3: ['t', '#5ae08a'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['CREATE'], 9: ['OPTIONS'], 10: ['L3'], 11: ['R3'], 12: ['du'], 13: ['dd'], 14: ['dl'], 15: ['dr'] };
const XB_BTN = { 0: ['A', '#5ad84a'], 1: ['B', '#ff4a4a'], 2: ['X', '#4a8aff'], 3: ['Y', '#ffd23a'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['VIEW'], 9: ['MENU'], 10: ['LS'], 11: ['RS'], 12: ['du'], 13: ['dd'], 14: ['dl'], 15: ['dr'] };
const glyphStyle = () => (game.settings && game.settings.glyphs) || 'playstation';
/** which glyph an action shows for a player now: { kind: 'pad', n, style } | { kind: 'key', text } | { kind: 'mouse', btn } | { kind: 'stick' } */
function glyphFor(action, input, device) {
  const I = input || game.input, dev = device || I.lastDevice || 'keyboard', codes = (I.map && I.map[action]) || KEYS[action] || [];
  if (action === 'move') return dev === 'gamepad' ? { kind: 'stick' } : { kind: 'key', text: I.half === 'right' ? 'ARROWS' : 'WASD' };
  const pad = codes.find(c => /^Pad\d+$/.test(c)), mouse = codes.find(c => /^Mouse\d$/.test(c)), key = codes.find(c => !/^Pad|^Mouse|^Act:/.test(c));
  if (dev === 'gamepad' && pad) return { kind: 'pad', n: +pad.slice(3), style: glyphStyle() };
  if (dev === 'mouse' && mouse) return { kind: 'mouse', btn: +mouse.slice(5) };
  if (key) return { kind: 'key', text: keyText(key, I) };
  if (pad) return { kind: 'pad', n: +pad.slice(3), style: glyphStyle() };
  return { kind: 'key', text: action.toUpperCase() };
}
function keyText(code, I) {
  const L = { Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB', Period: '.', Slash: '/', Comma: ',', Semicolon: ';', Quote: "'", PageUp: 'PGUP', PageDown: 'PGDN' };
  if (L[code]) return L[code]; if (/^Key[A-Z]$/.test(code)) return (I && I.codeLabel ? I.codeLabel(code) : code.slice(3)).toUpperCase(); if (/^Digit\d$/.test(code)) return code.slice(5); if (/^Numpad/.test(code)) return 'NUM' + code.slice(6);
  return code.toUpperCase();
}
/** the width a glyph takes at scale s (1: prompt lines, 2: How to Play) */
function glyphW(gl, s = 1) {
  if (gl.kind === 'key') return Math.max(9, E.font.width(gl.text) + 5) * s;
  if (gl.kind === 'pad') { const L = (gl.style === 'xbox' ? XB_BTN : PS_BTN)[gl.n] || ['?']; return (L[0].length > 1 && !/^d[udlr]$/.test(L[0]) ? E.font.width(L[0]) + 6 : 10) * s; }
  if (gl.kind === 'mouse') return 8 * s; if (gl.kind === 'stick') return 10 * s; return 10 * s;
}
/** draw a glyph with its top-left at (x, y), height 10 * s */
function drawGlyph(g, gl, x, y, s = 1) {
  x = Math.round(x); y = Math.round(y); const H = 10 * s, W = glyphW(gl, s);
  if (gl.kind === 'key') { E.ui.box(g, x, y, W, H, { bg: ['#f4f0e8', '#c8c0d8'], border: '#3a3050', gradient: true }); px.rect(g, x + 1, y + H - 2 * s, W - 2, s, '#8a80a0'); E.font.text(g, gl.text, x + W / 2, y + Math.round((H - 7 * s) / 2) - (s > 1 ? 1 : 0), '#1a1428', { align: 'center', outline: false, scale: s }); return W; }
  if (gl.kind === 'mouse') { px.rect(g, x + s, y, W - 2 * s, H, '#e8e4f0'); px.rect(g, x, y + s, W, H - 2 * s, '#e8e4f0'); px.rect(g, x + W / 2 - .5, y, 1, H / 2, '#5a5070'); px.rect(g, gl.btn === 2 ? x + W / 2 : x + s, y + s, W / 2 - s, H / 2 - s, '#ff3ca6'); return W; }
  if (gl.kind === 'stick') { px.disc(g, x + W / 2, y + H / 2, H / 2, '#2a2438'); px.disc(g, x + W / 2, y + H / 2, H / 2 - 2 * s, '#5a5070'); px.disc(g, x + W / 2 - s, y + H / 2 - s, H / 4, '#8a80a0'); return W; }
  const L = (gl.style === 'xbox' ? XB_BTN : PS_BTN)[gl.n] || ['?'], name = L[0], col = L[1];
  if (/^d[udlr]$/.test(name)) { px.rect(g, x + 3 * s, y, 4 * s, H, '#3a3448'); px.rect(g, x, y + 3 * s, W, 4 * s, '#3a3448'); const k = { du: [3, 0], dd: [3, 6], dl: [0, 3], dr: [6, 3] }[name]; px.rect(g, x + k[0] * s, y + k[1] * s, 4 * s, 4 * s, '#f4f0e8'); return W; }
  if (name.length > 1) { E.ui.box(g, x, y, W, H, { bg: ['#4a4458', '#2a2438'], border: '#8a80a0' }); E.font.text(g, name, x + W / 2, y + Math.round((H - 7 * s) / 2), '#f4f0e8', { align: 'center', outline: false, scale: s }); return W; }
  const cx = x + W / 2, cy = y + H / 2, R = H / 2;
  px.disc(g, cx, cy, R, '#1a1428'); px.disc(g, cx, cy, R - s, '#2e2840');
  if (gl.style === 'xbox') { px.disc(g, cx, cy, R - s, col); E.font.text(g, name, cx, y + Math.round((H - 7 * s) / 2), '#141018', { align: 'center', outline: false, scale: s }); return W; }
  const r2 = R - 2.5 * s;
  if (name === 'x') { px.line(g, cx - r2, cy - r2, cx + r2, cy + r2, col, s + .5); px.line(g, cx - r2, cy + r2, cx + r2, cy - r2, col, s + .5); }
  else if (name === 'o') { px.disc(g, cx, cy, r2 + .5, col); px.disc(g, cx, cy, r2 - s, '#2e2840'); }
  else if (name === 's') { px.rect(g, cx - r2, cy - r2, r2 * 2, r2 * 2, col); px.rect(g, cx - r2 + s, cy - r2 + s, r2 * 2 - 2 * s, r2 * 2 - 2 * s, '#2e2840'); }
  else if (name === 't') { px.poly(g, [[cx, cy - r2 - .5], [cx + r2 + .5, cy + r2 - .5], [cx - r2 - .5, cy + r2 - .5]], col); px.poly(g, [[cx, cy - r2 + 1.5 * s], [cx + r2 - 1.5 * s, cy + r2 - 1.5 * s], [cx - r2 + 1.5 * s, cy + r2 - 1.5 * s]], '#2e2840'); }
  return W;
}
/** a prompt line: 'Hold {turbo} + {shoot} to DUNK' with icons for the player's device; o { align, color, input, scale, device } */
function promptLine(g, text, x, y, o = {}) {
  const I = o.input || game.input, s = o.scale || 1, parts = String(text).split(/(\{\w+\})/).filter(Boolean);
  const items = parts.map(p => { const m = /^\{(\w+)\}$/.exec(p); return m ? { gl: glyphFor(m[1], I, o.device) } : { t: p }; });
  const w = items.reduce((a, it) => a + (it.gl ? glyphW(it.gl, s) + 2 * s : E.font.width(it.t, { scale: s })), 0);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  for (const it of items) {
    if (it.gl) { drawGlyph(g, it.gl, cx + s, y - 1 * s, s); cx += glyphW(it.gl, s) + 2 * s; }
    else { E.font.text(g, it.t, Math.round(cx), Math.round(y), o.color || UIC.ink, { outline: '#0c0614', scale: s }); cx += E.font.width(it.t, { scale: s }); }
  }
  return w;
}
const promptWidth = (text, o = {}) => { const I = o.input || game.input, s = o.scale || 1; return String(text).split(/(\{\w+\})/).filter(Boolean).reduce((a, p) => { const m = /^\{(\w+)\}$/.exec(p); return a + (m ? glyphW(glyphFor(m[1], I, o.device), s) + 2 * s : E.font.width(p, { scale: s })); }, 0); };

/* ---- menu input from every player: pad, keys, the mouse ---- */
const NAV = { hover: null, lastPointer: null, consumed: false };
function navInput() {
  const o = { up: false, down: false, left: false, right: false, confirm: false, cancel: false, tabL: false, tabR: false, alt: false, start: false, settings: false, any: false, who: null, mouse: false };
  if (NAV.consumed) { NAV.consumed = false; for (const I of game.players) I.consumeAll(); return o; }
  for (const I of game.players) {
    if (I.repeat('up', .3, .09)) o.up = true; if (I.repeat('down', .3, .09)) o.down = true; if (I.repeat('left', .3, .09)) o.left = true; if (I.repeat('right', .3, .09)) o.right = true;
    if (I.pressed('confirm')) { o.confirm = true; o.who = o.who || I; }
    if (I.pressed('cancel') || (I.lastDevice === 'mouse' && I.pressed('pass') && !I.pressed('confirm'))) o.cancel = true;
    if (I.pressed('tabL')) o.tabL = true; if (I.pressed('tabR')) o.tabR = true; if (I.pressed('oop')) o.alt = true;
    if (I.pressed('start')) { o.start = true; if (I.lastDevice === 'gamepad') o.settings = true; }
    if (I.anyPressed()) o.any = true;
  }
  const I = game.input, pt = I.pointer();
  if (pt && (!NAV.lastPointer || Math.hypot(pt[0] - NAV.lastPointer[0], pt[1] - NAV.lastPointer[1]) > .5)) { NAV.hover = pt; o.mouse = true; }
  NAV.lastPointer = pt; o.click = I.clicked();
  return o;
}
function consumeNav() { NAV.consumed = true; for (const I of game.players) I.consumeAll(); }
/** a vertical list of big buttons: state { i }, items [{ label, sub, disabled, color }]; returns { picked, moved, cancel }, and
 *  remembers each button's rectangle (for the mouse) in state.rects */
function listNav(state, items, nav, o = {}) {
  const n = items.length, res = { picked: -1, moved: false, cancel: nav.cancel };
  if (!n) return res;
  const step = d => { let i = state.i; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!items[i].disabled) break; } if (i !== state.i) { state.i = i; res.moved = true; sfx('select'); } };
  if (nav[o.horizontal ? 'left' : 'up']) step(-1); if (nav[o.horizontal ? 'right' : 'down']) step(1);
  if (state.rects && NAV.hover && nav.mouse) state.rects.forEach((rc, i) => { if (rc && !items[i].disabled && inRect(NAV.hover, rc) && state.i !== i) { state.i = i; res.moved = true; sfx('select'); } });
  if (nav.click && state.rects) state.rects.forEach((rc, i) => { if (rc && !items[i].disabled && inRect(nav.click, rc)) { state.i = i; res.picked = i; } });
  if (nav.confirm && !items[state.i].disabled) res.picked = state.i;
  if (res.picked >= 0) sfx('confirm');
  if (res.cancel) sfx('cancel');
  return res;
}
const inRect = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
/** one big button: focus = an animated 2-px outline, a pointer and a brighter fill (never color alone) */
function drawButton(g, x, y, w, h, label, o = {}) {
  const f = !!o.focus, t = game.real, pulse = f ? .5 + .5 * Math.sin(t * 6) : 0;
  E.ui.box(g, x, y, w, h, { bg: o.disabled ? ['#241c34', '#1a1428'] : f ? ['#4a2a6a', '#2e1a4a'] : ['#2a1e40', '#1c1430'], border: f ? (pulse > .5 ? UIC.gold : '#fff0a0') : UIC.line, alpha: o.alpha || .95 });
  if (f) { px.rect(g, x - 1, y - 1, w + 2, 1, UIC.gold); px.rect(g, x - 1, y + h, w + 2, 1, UIC.gold); px.rect(g, x - 1, y, 1, h, UIC.gold); px.rect(g, x + w, y, 1, h, UIC.gold); E.font.text(g, '▸', x + 4 + Math.round(pulse * 2), y + Math.round(h / 2) - 4, UIC.gold, { outline: false }); }
  const s = o.scale || 1, ty = y + Math.round((h - 7 * s) / 2) - (o.sub ? 4 : 0);
  E.font.text(g, label, o.center ? x + w / 2 : x + 14, ty, o.disabled ? UIC.dim : o.color || (f ? '#ffffff' : UIC.ink), { align: o.center ? 'center' : 'left', scale: s, outline: '#0c0614' });
  if (o.sub) E.font.text(g, o.sub, o.center ? x + w / 2 : x + 14, ty + 9 * s + 1, f ? '#e8d8ff' : UIC.muted, { align: o.center ? 'center' : 'left', outline: false });
  return [x, y, w, h];
}
/** rating pips: eight icons with their name and ten pips */
function drawRatings(g, def, x, y, o = {}) {
  RATING_KEYS.forEach((k, i) => {
    const yy = y + i * (o.gap || 9), v = def.ratings[k];
    E.font.text(g, RATING_NAMES[k], x, yy, UIC.muted, { outline: false });
    for (let n = 0; n < 10; n++) px.rect(g, x + 40 + n * 5, yy + 1, 4, 5, n < v ? (v >= 9 ? UIC.gold : v >= 6 ? '#5ae08a' : '#7ab4ff') : '#2e2440');
  });
}
/** a screen's frame: dark gradient, a title strip, the prompt bar at the bottom in the last device's glyphs */
function screenFrame(r, title, prompts, o = {}) {
  const arena = !o.noBg && !o.sky && menuBackdrop(r, o.dim);
  r.overlay(g => {
    if (!o.noBg && !arena) { r.sky(o.sky || ['#0a0618', '#1a0e30', '#2a1240']); }
    if (title) E.font.title(g, title, Math.round(r.W / 2), Math.round(r.H * .05), { align: 'center', scale: o.titleScale || 2, colors: ['#fffbe8', '#ffe08a', '#ff8a3a', '#c8401a'], depth: 2 });
    if (prompts) promptBar(g, r, prompts);
  });
}
function promptBar(g, r, prompts) {
  const y = r.H - 15; px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 19, '#0a0614'));
  const text = prompts.join('    '); promptLine(g, text, Math.round(r.W / 2), y, { align: 'center' });
}
/** wrap text to a width; returns lines */
const wrapText = (text, w, o = {}) => E.font.wrap(String(text), w, o);
/** a live portrait of a player's rig in a frame */
const PORTRAITS = {};
function portraitRig(id) { if (PORTRAITS[id]) return PORTRAITS[id]; const d = get('player', id); const rig = d ? dressPlayer(d, d.team) : castRig(id); rig.update(0, { x: 0, y: 0, z: 0, facing: PI / 2 }); return (PORTRAITS[id] = rig); }
function drawPortrait(g, id, x, y, size, o = {}) { const rig = portraitRig(id); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2, expr: o.expr || null }); rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: o.turn === undefined ? .35 : o.turn, bg: o.bg || '#1a1030', border: o.border || UIC.line }, o)); }


/* ==== 41-hud.js ==== */
/* 41-hud: the match HUD (PLAN 11.5). The top strip: HOME's panel at the left, AWAY's at the right (team, score, two
 * player plates with turbo, heat pips, power-up and P badges), the period, the game clock and the shot clock in the
 * middle. In the world: P1-P4 tags over the humans, turbo rings, the handler's ring, edge arrows for humans off screen,
 * the release meter, the dunk-range ring, power-ups on the floor, barks. At the bottom: the announcer's lower third and,
 * at the Pier, the windsock. */
function hudPanelW(r) { return clamp(Math.floor((r.W - 84) / 2) - 8, 116, 170); }
function drawPlate(g, p, x, y, w, right) {
  const t = get('team', p.teamId), hc = p.human !== null && p.human !== undefined ? E.PLAYER_COLORS[p.human] : null;
  let nx = right ? x + w - 2 : x + 2;
  if (hc) { const bw = 13; const bx = right ? nx - bw : nx; px.rect(g, bx, y, bw, 8, hc); E.font.text(g, 'P' + (p.human + 1), bx + bw / 2, y, '#0c0614', { align: 'center', outline: false }); nx += right ? -bw - 2 : bw + 2; }
  const nm = p.name.length > 11 ? p.name.split(' ')[0] : p.name;
  E.font.text(g, nm, nx, y, p.isNova() ? UIC.gold : UIC.ink, { align: right ? 'right' : 'left', outline: '#0c0614' });
  // turbo bar, heat pips, power-up
  const bx = right ? x + 4 : x + w - 46, by = y + 2;
  E.ui.bar(g, bx, by, 26, 3, p.infTurbo() ? 1 : p.turbo, p.turboOn ? '#ffffff' : p.turbo < .2 ? '#ff5a3a' : t.colors.trim);
  for (let k = 0; k < 3; k++) { const on = p.isNova() || k < p.heat; px.rect(g, bx + 29 + k * 5, by - 1, 4, 5, on ? (p.isNova() ? (Math.floor(game.real * 8 + k) % 2 ? '#ffd23a' : '#ff7a2a') : '#ff7a2a') : '#3a2a4a'); }
  if (p.pu) { const def = get('powerup', p.pu.id), ix = right ? x - 14 : x + w + 2; px.sprite(g, def.icon, ix, y - 1); E.font.text(g, String(Math.ceil(p.pu.t)), ix + 6, y + 10, def.color, { align: 'center', font: 'tiny', outline: '#000' }); }
}
function drawScoreBug(g, r) {
  const M = S.match; if (!M) return;
  const W = hudPanelW(r), ca = game.cornerArea(), rightEdge = ca && ca.y0 < 30 ? Math.min(r.W - 4, Math.floor(ca.x0) - 2) : r.W - 4;
  for (const team of [0, 1]) {
    const T = get('team', S.teams[team].id), x = team === 0 ? 4 : rightEdge - W, y = 3, right = team === 1;
    E.ui.box(g, x, y, W, 36, { bg: [E.shade(T.colors.jersey, -.45), E.shade(T.colors.jersey, -.65)], border: T.colors.trim, alpha: .88 });
    px.sprite(g, LOGOS[T.logo].spr, right ? x + W - 15 : x + 3, y + 3);
    E.font.text(g, T.short, right ? x + W - 18 : x + 18, y + 4, '#ffffff', { align: right ? 'right' : 'left', outline: '#0c0614' });
    const sc = String(M.score[team]); E.font.text(g, sc, right ? x + 4 : x + W - 4, y + 2, M.gold[team] ? UIC.gold : '#ffffff', { align: right ? 'left' : 'right', scale: 2, outline: '#0c0614' });
    teamPlayers(team).forEach((p, i) => drawPlate(g, p, x + 2, y + 15 + i * 10, W - 4, right));
    if (M.poss === team && (M.phase === 'live' || M.phase === 'inbound')) px.rect(g, right ? x + W - 3 : x + 1, y + 2, 2, 32, UIC.gold);
  }
  // the clocks
  const cx = Math.round(r.W / 2), per = M.sudden ? 'SUDDEN BLAM' : M.ot ? 'OT' + (M.ot > 1 ? M.ot : '') : (M.quarters === 2 ? 'H' : 'Q') + M.quarter;
  E.ui.box(g, cx - 30, 3, 60, 26, { bg: ['#1a1030', '#0c0618'], border: UIC.line, alpha: .9 });
  E.font.text(g, per, cx, 5, UIC.muted, { align: 'center', outline: false });
  if (!M.sudden) E.font.text(g, mmss(Math.ceil(M.clock)), cx, 13, M.clock < 10 && M.phase === 'live' ? (Math.floor(game.real * 4) % 2 ? '#ff5a3a' : '#ffffff') : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  const sh = Math.ceil(M.shot), red = sh <= 5 && M.phase === 'live';
  E.ui.box(g, cx - 11, 30, 22, 11, { bg: red ? '#5a0a0a' : '#1a1030', border: red ? '#ff5a3a' : UIC.line, gradient: false, alpha: .9 });
  E.font.text(g, String(Math.max(0, sh)), cx, 32, red ? '#ff8a6a' : UIC.gold, { align: 'center', outline: false });
}
let lastShotBeep = 0;
function hudSounds() { const M = S.match; if (!M || M.phase !== 'live') return; const s = Math.ceil(M.shot); if (s <= 3 && s >= 1 && s !== lastShotBeep && S.ball.state === 'held') { lastShotBeep = s; sfx('shotclock_beep'); } if (s > 3) lastShotBeep = 0; }
/** the floor and in-world marks: rings, tags, the release meter, the dunk-range ring, power-ups */
function drawWorldMarks(r) {
  const b = S.ball, t = game.real;
  for (const u of POWERUPS.floor) {
    const def = get('powerup', u.id), k = .5 + .5 * Math.sin(t * 5), blink = u.t < 3 && Math.floor(t * 8) % 2;
    r.decal(() => { r.groundRing(u.x, u.y, 10 + k * 2, def.color, .8); r.groundDisc(u.x, u.y, 9, def.color, .2); });
    if (!blink) r.queue(u.x, u.y, 12, g => { const [x, y] = r.w(u.x, u.y, 14 + Math.sin(t * 3) * 3); px.sprite(g, def.icon, Math.round(x) - 6, Math.round(y) - 6); }, { emissive: true });
  }
  for (const p of S.players) {
    if (p.turboOn && p.z < 2) r.decal(() => r.groundRing(p.x, p.y, 9, '#ffffff', .5 + .3 * Math.sin(t * 20)));
    if (b.owner === p && b.state === 'held') r.decal(() => r.groundRing(p.x, p.y, 11, UIC.gold, .55));
    if (p.human !== null && p.human !== undefined) {
      const c = E.PLAYER_COLORS[p.human], top = p.z + p.rig.o.size * 34 + 8;
      r.queue(p.x, p.y, top, g => {
        const [x, y] = r.w(p.x, p.y, top), X = Math.round(x), Y = Math.round(y);
        if (X < 6 || X > r.W - 6) return;
        px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], c); E.font.text(g, 'P' + (p.human + 1), X, Y - 13, c, { align: 'center', outline: '#0c0614' });
      }, { emissive: true });
      // the release meter beside a human shooter; the dunk-range ring under a human handler on turbo
      if (game.settings.shotMeter !== false && p.state === 'air' && p.jump && p.jump.kind === 'shot' && !p.jump.released) r.queue(p.x, p.y, 70, g => {
        const J = p.jump, [x, y] = r.w(p.x, p.y, p.z + 40), X = Math.round(x) + 12, Y = Math.round(y) - 18, H = 26, top = J.ta + .25, u = clamp(p.st / top, 0, 1);
        const win = tune('perfectWindow') * (p.pu && p.pu.id === 'laser' ? 2 : 1), w0 = (J.ta - win / 2) / top, w1 = (J.ta + win / 2) / top;
        px.rect(g, X - 1, Y - 1, 6, H + 2, '#0c0614'); px.rect(g, X, Y, 4, H, '#2a2040');
        px.rect(g, X, Y + Math.round(H * (1 - w1)), 4, Math.max(1, Math.round(H * (w1 - w0))), '#5aff7a');
        px.rect(g, X - 2, Y + Math.round(H * (1 - u)), 8, 2, u > w1 ? '#ff5a3a' : '#ffffff');
      }, { emissive: true });
      if (b.owner === p && p.turboOn && game.settings.shotMeter !== false) { const rim = attackRim(p.team), R2 = dunkRange(p), inR = dist2(p.x, p.y, rim.x, rim.y) <= R2; r.decal(() => r.groundArc(rim.x, rim.y, R2 - 1.5, R2 + .5, rim.side < 0 ? -PI / 2 : PI / 2, rim.side < 0 ? PI / 2 : PI * 1.5, inR ? '#5aff7a' : '#ffffff', inR ? .7 : .35)); }
    }
  }
  for (const bk of BARKS) { const p = bk.p; r.queue(p.x, p.y, 90, g => { const h = p.rig.head(), [x, y] = r.w(h[0], h[1], h[2] + 10), w = E.font.width(bk.text) + 6; E.ui.box(g, Math.round(x - w / 2), Math.round(y) - 12, w, 11, { bg: '#ffffff', border: '#1a1030', gradient: false }); E.font.text(g, bk.text, Math.round(x), Math.round(y) - 10, '#1a1030', { align: 'center', outline: false }); }, { emissive: true }); }
}
/** edge arrows for humans off screen, the lower-third caption, the windsock */
function drawHudBottom(g, r) {
  for (const p of S.players) {
    if (p.human === null || p.human === undefined) continue;
    const [x, y] = r.w(p.x, p.y, p.z + 30); if (x >= 0 && x <= r.W && y >= 0 && y <= r.H) continue;
    const X = clamp(x, 8, r.W - 8), Y = clamp(y, 46, r.H - 30), c = E.PLAYER_COLORS[p.human], a = Math.atan2(y - Y, x - X);
    px.disc(g, X, Y, 6, '#0c0614'); px.poly(g, [[X + Math.cos(a) * 6, Y + Math.sin(a) * 6], [X + Math.cos(a + 2.3) * 5, Y + Math.sin(a + 2.3) * 5], [X + Math.cos(a - 2.3) * 5, Y + Math.sin(a - 2.3) * 5]], c);
    E.font.text(g, 'P' + (p.human + 1), X, Y + 7, c, { align: 'center', font: 'tiny', outline: '#000' });
  }
  const C = ANN.cap;
  if (C && game.real < C.until) {
    const w = Math.min(r.W - 20, 300), x = Math.round((r.W - w) / 2), lines = wrapText(C.text, w - 46).slice(0, 2), h = 14 + lines.length * 9, y = r.H - h - 6;
    E.ui.box(g, x, y, w, h, { bg: ['#1a0e34', '#0c0618'], border: C.speaker === 'deedee' ? UIC.accent : C.speaker === 'gigawatt' ? '#a050ff' : UIC.accent2, alpha: .9 });
    if (CAST[C.speaker] || get('player', C.speaker)) drawPortrait(g, C.speaker, x + 4, y + 3, Math.min(32, h - 6), { frame: false });
    E.font.text(g, C.name, x + 40, y + 3, C.speaker === 'deedee' ? '#ff8ad8' : '#7af0ff', { outline: false });
    lines.forEach((l, i) => E.font.text(g, l, x + 40, y + 12 + i * 9, UIC.ink, { outline: false }));
  }
  if (TWIST.wind) {   // the windsock: its direction and 1-3 chevrons
    const x = 22, y = r.H - 44, w = TWIST.windOn ? Math.hypot(TWIST.windX, TWIST.windY) : 0, dir = TWIST.windX >= 0 ? 1 : -1, n = w > .8 ? 3 : w > .55 ? 2 : w > 0 ? 1 : 0;
    E.ui.box(g, x - 16, y - 14, 34, 28, { bg: '#0c0618', border: UIC.line, alpha: .8 }); px.rect(g, x - 1, y - 8, 2, 18, '#c8c8d0');
    const L2 = 6 + w * 10, droop = (1 - w) * 6; px.poly(g, [[x, y - 8], [x + dir * L2, y - 7 + droop], [x + dir * L2, y - 3 + droop], [x, y - 2]], '#ff5a3a');
    for (let k = 0; k < n; k++) E.font.text(g, dir > 0 ? '>' : '<', x - 8 + k * 6, y + 4, '#ffd23a', { outline: false });
  }
}
/** the ball: a 9x9 sprite with seams, turning with its speed; a shadow sized by its height; a comet trail in Supernova */
const BALL_SPR = [0, 1, 2, 3].map(k => E.sprite([
  '..kkkkk..', '.koooook.', ['koSoooook', 'kooSooook', 'koooSoook', 'kooooSook'][k], 'kSSSSSSSk', ['kooooSook', 'koooSoook', 'kooSooook', 'koSoooook'][k], 'koooooook', 'kooooooLk', '.koooLLk.', '..kkkkk..'
].map(row => row.replace(/L/g, 'l')), { k: '#3a1a0c', o: '#e8742a', S: '#2a1408', l: '#ffb070' }));
function drawBall(r) {
  const b = S.ball; if (!b) return;
  if (b.state === 'held' && b.owner && b.owner.state === 'inbound' && !b.owner.ballAt) return;
  r.shadow(b.x, b.y, Math.max(2, 4.5 - b.z * .02), clamp(.5 - b.z * .002, .15, .5));
  const nova = b.owner ? b.owner.isNova() : b.shot && b.shot.shooter && b.shot.shooter.isNova(), fast = Math.hypot(b.vx, b.vy) > 260;
  if ((nova || fast) && b.trail.length > 2) r.queue(b.x, b.y, b.z, g => { px.blend(g, .5, 'add', () => { b.trail.forEach((q, i) => { const [x, y] = r.w(q[0], q[1], q[2]); px.disc(g, Math.round(x), Math.round(y), 1 + i * .45, nova ? (i % 2 ? '#ffd23a' : '#ff7a2a') : '#ffffff'); }); }); }, { bias: -.5, emissive: true });
  const fr = Math.floor(b.roll / 6) % 4, gold = S.match && S.match.gold && b.owner && S.match.gold[b.owner.team];
  r.sprite(b.x, b.y, b.z - BALL_R, BALL_SPR[fr], { anchor: 'bottom', glow: gold || nova ? .6 : 0, bias: b.owner && b.owner.dribble && Math.sin((b.owner.rig.facing || 0)) > 0 ? .5 : .2 });
}


/* ==== 42-screens.js ==== */
/* 42-screens: the screens (PLAN 11.3-11.4). Title, main menu, join (1-4 players), team select, lineup, court & rules,
 * the matchup card (the cheat-code window), the break card and the Halftime Report, results, the Hall of Blam, How to
 * Play, About/Credits, and the touch-only notice. Every screen works with any one device alone: pad, keys, or mouse
 * (hover moves the focus, a click picks, a right click goes back). */
const SC = {};   // scenes, by name
const CAB = new E.Arcade(game, { id: 'bashketball', hud: false });
const PROG = { tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: null, bestDunk: null, toursWon: 0 } };
function loadProgress() { const p = store.get('bb:progress', null); if (p) { Object.assign(PROG, p); PROG.unlocked = Object.assign({ bots: false, allstars: false, bigHeads: false }, p.unlocked); PROG.records = Object.assign({ mostPoints: null, bestDunk: null, toursWon: 0 }, p.records); } }
function saveProgress() { store.set('bb:progress', PROG); }
function teamUnlocked(id) { const t = get('team', id); return !t.locked || (id === 'blambots' ? PROG.unlocked.bots : PROG.unlocked.allstars) || S.dev.unlockAll; }
function noteRecords(res) {
  if (res.starred || S.mode === 'attract' || HUB) return;
  for (const b of res.box) { if (b.human === null || b.human === undefined) continue; const R = PROG.records; if (!R.mostPoints || b.stats.PTS > R.mostPoints.pts) R.mostPoints = { pts: b.stats.PTS, name: b.name }; }
  const dunk = res.best && res.best.what && S.match && S.match.plays.filter(p => get('team', S.teams[p.team].id) && S.players.some(q => q.team === p.team && q.human !== null && q.human !== undefined)).sort((a, b) => b.pts - a.pts)[0];
  if (dunk && (!PROG.records.bestDunk || dunk.pts > PROG.records.bestDunk.pts)) PROG.records.bestDunk = { pts: dunk.pts, what: dunk.what, name: dunk.name };
  saveProgress();
}
const IDLE = { t: 0 };
/** a menu scene's shared start: music, view, no touch controls, the idle clock for the attract mode */
function menuEnter(music = 'menu') { playMusic(music); game.lights.enabled = false; game.weather = null; game.setView('broadcast'); game.setZoom(1); game.cam.offset = [0, 0]; IDLE.t = 0; crowdTick(1, false); S.attract = null; if (!ARENA.map || ARENA.id !== MENU_COURT.id) setupArena(MENU_COURT.id); game.weather = null; }
const MENU_COURT = { id: 'skybox', t: 0 };
/** the arena behind the menus: the Skybox at night, panning slowly, dimmed under the panels */
function menuBackdrop(r, dim = .62) {
  if (!ARENA.map) return false;
  MENU_COURT.t += 1 / 60; game.focus(CMX + Math.sin(MENU_COURT.t * .05) * 180, CMY, 0);
  drawArena(r); game.lights.enabled = false;
  r.overlay(g => px.blend(g, dim, 'normal', () => { px.rect(g, 0, 0, r.W, r.H, '#0e0820'); }));
  return true;
}
function idleTick(dt, from) {
  if (ARENA.map) updateArena(dt);
  const nav = navInput(); if (nav.any || nav.mouse || nav.click || game.players.some(I => Math.hypot(...I.move()) > .3)) IDLE.t = 0; else IDLE.t += dt;
  if (IDLE.t > 10 && !game.paused && !(game.shell && game.shell.screen)) { IDLE.t = 0; startAttract(from); return null; }
  return nav;
}
function gotoScreen(name, data) { game.go(name, data, { fade: .18 }); }

/* ---- TITLE ---- */
const TITLE = { t: 0, rigs: null };
function titleRigs() {
  if (TITLE.rigs) return TITLE.rigs;
  const a = dressPlayer(get('player', 'riptide'), 'breakers'), b = dressPlayer(get('player', 'volt'), 'hightops');
  return (TITLE.rigs = { a, b });
}
SC.title = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('title'); setupArena('skybox'); TITLE.t = 0; game.focus(OX + 470, CMY, 0); },
  update(dt) {
    TITLE.t += dt; updateArena(dt); titleLoop(dt); game.focus(OX + 480, CMY, 0); game.cam.offset = [0, Math.round(game.H * .1)];
    if (S.touchOnly) { const c = game.input.clicked(); if (c && TITLE.setRect && inRect(c, TITLE.setRect)) game.menu('settings'); IDLE.t += dt; if (IDLE.t > 10) { IDLE.t = 0; startAttract('title'); } return; }
    const nav = idleTick(dt, 'title'); if (!nav) return;
    if (nav.confirm || nav.start || nav.click || game.input.pressed('shoot')) { consumeNav(); sfx('confirm'); gotoScreen('menu'); }
  },
  draw(r) {
    drawArena(r); const R = titleRigs();
    for (const [rig, p] of [[R.a, TITLE.pa], [R.b, TITLE.pb]]) if (p) { r.shadow(p.x, p.y, 7, .4); r.actor(p.x, p.y, p.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
    if (TITLE.ball) { const b = TITLE.ball; r.shadow(b.x, b.y, 3, .3); r.sprite(b.x, b.y, b.z - BALL_R, BALL_SPR[Math.floor(TITLE.t * 8) % 4], { anchor: 'bottom' }); }
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#3a2a6a'));
      drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .14));
      E.font.text(g, 'NO FOULS. NO MERCY. ALL BLAM.', Math.round(r.W / 2), Math.round(r.H * .14) + 58, '#fff0c8', { align: 'center', outline: '#1a0c24' });
      if (S.touchOnly) {
        E.font.text(g, 'CONTROLLER OR', Math.round(r.W / 2), Math.round(r.H * .56), '#ffffff', { align: 'center', scale: 2, outline: '#1a0c24' }); E.font.text(g, 'KEYBOARD REQUIRED', Math.round(r.W / 2), Math.round(r.H * .56) + 18, '#ffffff', { align: 'center', scale: 2, outline: '#1a0c24' });
        TITLE.setRect = drawButton(g, Math.round(r.W / 2) - 50, Math.round(r.H * .72), 100, 22, 'SETTINGS', { focus: true, center: true });
      } else if (Math.floor(game.real * 2) % 2) promptLine(g, 'PRESS {confirm} START', Math.round(r.W / 2), Math.round(r.H * .66), { align: 'center', scale: 1 });
      E.font.text(g, 'BASHKETBALL ' + VERSION + '  •  MY-3D2DGE V' + E.version, Math.round(r.W / 2), r.H - 10, '#8a80a8', { align: 'center', font: 'tiny', outline: false });
    });
  }
};
function drawLogo(g, r, cx, y, sc = 4) {
  // "BASH" bursting out of a comic star, then "KETBALL": one word, BASHKETBALL, measured so the halves never overlap
  const wA = E.font.width('BASH', { scale: sc }), wB = E.font.width('KETBALL', { scale: sc - 1 }), gap = sc, x0 = Math.round(cx - (wA + gap + wB) / 2), sx = x0 + wA / 2, sy = y + 5 * sc;
  const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + game.real * .3, R = (k % 2 ? 6.5 : 10) * sc; pts.push([sx + Math.cos(a) * R * 1.35, sy + Math.sin(a) * R * .85]); }
  px.poly(g, pts, '#ff3ca6'); px.poly(g, pts.map(([x, yy]) => [sx + (x - sx) * .86, sy + (yy - sy) * .86]), '#ffd23a');
  E.font.title(g, 'BASH', x0, y + Math.round(Math.sin(game.real * 4) * 1.5), { scale: sc, colors: ['#fffbe8', '#ffe08a', '#ff8a2a', '#c8201a'], depth: 3, depthColor: '#3a0814' });
  E.font.title(g, 'KETBALL', x0 + wA + gap, y + 2 * sc, { scale: sc - 1, colors: ['#ffffff', '#c8f8ff', '#2de2ff', '#1a5ad0'], depth: 3, depthColor: '#0c0624' });
}
/** the title's loop: a lob and a slam on the Skybox, every four seconds */
function titleLoop(dt) {
  const R = titleRigs(), t = TITLE.t % 4.2, rim = RIMS[1];
  const A2 = { x: OX + 430, y: CMY + 50, z: 0 }, B0 = { x: OX + 330, y: CMY - 40 }, slam = { x: rim.x - 9, y: rim.y, z: RIM_Z + 6 - 55 };
  TITLE.pa = A2; R.a.bb.pose = t < 1.1 ? { R: [5, 2.2, 15 + 4 * Math.sin(t * 18)], L: [5, -2.2, 15] } : t < 1.4 ? CLIPS.passLob(t - 1.1) : t > 2.3 ? CLIPS.raiseRoof(t) : null; R.a.bb.w = 1;
  R.a.update(dt, { x: A2.x, y: A2.y, z: 0, vx: 0, vy: 0, facing: Math.atan2(rim.y - A2.y, rim.x - A2.x), expr: t > 2.3 ? 'smile' : null });
  let pb;
  if (t < 1.1) { const k = t / 1.1; pb = { x: lerp(B0.x, rim.x - 90, k), y: lerp(B0.y, rim.y, k), z: 0, vx: 100, flying: false }; }
  else if (t < 2.1) { const k = (t - 1.1) / 1, sx = rim.x - 90, sy = rim.y; pb = { x: lerp(sx, slam.x, k), y: lerp(sy, slam.y, k), z: slam.z * (1 - (1 - k) ** 2) + 70 * Math.sin(k * PI) * (1 - k), flying: true, k }; }
  else if (t < 3) { pb = { x: slam.x, y: slam.y, z: Math.max(0, slam.z - (t - 2.1) ** 2 * 420), flying: false, after: true }; }
  else pb = { x: slam.x - (t - 3) * 60, y: slam.y + (t - 3) * 20, z: 0, vx: -60 };
  TITLE.pb = pb;
  R.b.bb.pose = pb.flying ? dunkKeys(get('dunk', 'windmill'), pb.k) : pb.after && pb.z > 2 ? { R: [4, 4, 40], L: [4, -4, 40] } : null; R.b.bb.w = 1;
  R.b.update(dt, { x: pb.x, y: pb.y, z: pb.z, vx: pb.vx || 0, vy: 0, facing: Math.atan2(rim.y - pb.y, rim.x - pb.x), air: pb.z > 3, expr: pb.flying ? 'shout' : null });
  // the ball: in A's hands, lobbed, slammed, falling through
  if (t < 1.25) { const h = R.a.hand('R'); TITLE.ball = { x: h[0], y: h[1], z: h[2] + 2 }; }
  else if (t < 1.85) { const k = (t - 1.25) / .6, h0 = { x: A2.x, y: A2.y, z: 50 }, h1 = R.b.hand('R'); TITLE.ball = { x: lerp(h0.x, h1[0], k), y: lerp(h0.y, h1[1], k), z: lerp(h0.z, h1[2], k) + 40 * Math.sin(k * PI) }; }
  else if (t < 2.1) { const h = R.b.hand('R'); TITLE.ball = { x: h[0], y: h[1], z: h[2] + 3 }; }
  else { const k = t - 2.1; TITLE.ball = { x: rim.x, y: rim.y, z: Math.max(BALL_R, RIM_Z + 4 - k * k * 400 - k * 80) }; }
  if (t >= 2.1 && t - dt < 2.1) { hoopHit(1, 1.3); P.ring(rim.x, rim.y, 4, 24, '#fff6c0', .4); P.sparks(rim.x, rim.y, RIM_Z, 12, null, { color: '#ffd23a' }); game.shake(2); crowdReact('cheer', 1); crowdReact('flash', 1); sfx('slam', { vol: .5 }); }
}

/* ---- MAIN MENU ---- */
const MAIN_ITEMS = [
  { id: 'tour', label: 'BLAM TOUR', sub: 'The story: four stops, one robot problem' }, { id: 'exhibition', label: 'EXHIBITION', sub: 'Any teams, any court, 1-4 players' },
  { id: 'camp', label: 'BLAM CAMP', sub: 'Learn every move, one lesson at a time' }, { id: 'hall', label: 'HALL OF BLAM', sub: 'Tour scores and records' },
  { id: 'howto', label: 'HOW TO PLAY', sub: 'Controls, rules, twists, power-ups' }, { id: 'options', label: 'OPTIONS', sub: 'Settings, controls, button symbols' },
  { id: 'about', label: 'ABOUT', sub: 'Credits and how this game was made' }
];
S.menu.main = { i: 0, rects: [] };
SC.menu = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); },
  update(dt) {
    const nav = idleTick(dt, 'menu'); if (!nav) return; const st = S.menu.main;
    if (nav.settings) { game.menu('settings'); return; }
    const res = listNav(st, MAIN_ITEMS, nav);
    if (res.cancel) { gotoScreen('title'); return; }
    if (res.picked >= 0) {
      const id = MAIN_ITEMS[res.picked].id; consumeNav();
      if (id === 'tour') gotoScreen('tourmenu'); else if (id === 'exhibition') gotoScreen('join'); else if (id === 'camp') gotoScreen('camp');
      else if (id === 'hall') gotoScreen('hall'); else if (id === 'howto') gotoScreen('howto'); else if (id === 'options') game.menu('settings'); else if (id === 'about') gotoScreen('about');
    }
  },
  draw(r) {
    screenFrame(r, null, ['{confirm} SELECT', '{cancel} BACK']);
    r.overlay(g => {
      drawLogo(g, r, Math.round(r.W * .27), Math.round(r.H * .05), 3);
      const st = S.menu.main, x = Math.round(r.W * .05), w = Math.round(r.W * .42), h = 20, y0 = Math.round(r.H * .05) + 50;
      st.rects = MAIN_ITEMS.map((it, i) => drawButton(g, x, y0 + i * (h + 3), w, h, it.label, { focus: st.i === i }));
      // the preview panel
      const px0 = Math.round(r.W * .52), pw = Math.round(r.W * .44), py = Math.round(r.H * .12), ph = Math.round(r.H * .72), it = MAIN_ITEMS[st.i];
      E.ui.box(g, px0, py, pw, ph, { bg: ['#1e1434', '#120a22'], border: UIC.line });
      E.font.title(g, it.label, px0 + pw / 2, py + 8, { align: 'center', scale: 2, colors: ['#ffffff', '#ffe08a', '#ff8a3a'] });
      wrapText(it.sub, pw - 16).forEach((l, i) => E.font.text(g, l, px0 + pw / 2, py + 30 + i * 9, UIC.ink, { align: 'center', outline: false }));
      menuPreview(g, it.id, px0 + 8, py + 52, pw - 16, ph - 60);
    });
  }
};
function menuPreview(g, id, x, y, w, h) {
  const t = game.real;
  if (id === 'tour') { STREET_TEAMS.concat('blambots').forEach((tid, i) => { const T = get('team', tid), cx = x + 12 + i * (w - 24) / 4, cy = y + h / 2 + Math.sin(i * 1.7) * 18; if (i) px.line(g, x + 12 + (i - 1) * (w - 24) / 4, y + h / 2 + Math.sin((i - 1) * 1.7) * 18, cx, cy, '#5a4a7a'); px.disc(g, cx, cy, 7, T.colors.jersey); px.sprite(g, LOGOS[T.logo].spr, cx - 6, cy - 5); }); E.font.text(g, PROG.tour ? 'STOP ' + (PROG.tour.stop + 1) + ' OF 4: CONTINUE YOUR TOUR' : 'START A NEW TOUR', x + w / 2, y + h - 10, UIC.gold, { align: 'center', outline: false }); }
  else if (id === 'exhibition') { drawPortrait(g, 'volt', x + w / 2 - 44, y + 8, 36); drawPortrait(g, 'torque', x + w / 2 + 8, y + 8, 36, { turn: -.35 }); E.font.title(g, 'VS', x + w / 2, y + 52, { align: 'center', scale: 2, colors: BANNER_COLORS.block }); E.font.text(g, '1-4 PLAYERS • 5 COURTS', x + w / 2, y + h - 10, UIC.muted, { align: 'center', outline: false }); }
  else if (id === 'camp') { drawPortrait(g, 'deedee', x + w / 2 - 18, y + 6, 36); E.font.text(g, (PROG.camp.length) + ' OF ' + CAMP_LESSONS.length + ' LESSONS DONE', x + w / 2, y + 52, UIC.gold, { align: 'center', outline: false }); }
  else if (id === 'hall') { const T = CAB.table('tour').slice(0, 5); T.forEach((e, i) => E.font.text(g, (i + 1) + '. ' + e.name + '  ' + e.score, x + 8, y + 6 + i * 10, i ? UIC.ink : UIC.gold, { outline: false })); if (!T.length) E.font.text(g, 'NO TOUR SCORES YET', x + w / 2, y + 20, UIC.muted, { align: 'center', outline: false }); }
  else if (id === 'howto') { promptLine(g, '{shoot} SHOOT  {pass} PASS', x + w / 2, y + 10, { align: 'center' }); promptLine(g, '{turbo} TURBO  {shove} SHOVE', x + w / 2, y + 24, { align: 'center' }); promptLine(g, '{oop} ALLEY-OOP', x + w / 2, y + 38, { align: 'center' }); }
  else if (id === 'options') { E.font.text(g, 'BUTTON SYMBOLS: ' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION'), x + w / 2, y + 10, UIC.ink, { align: 'center', outline: false }); E.font.text(g, 'CPU: ' + DIFF_NAMES[game.settings.difficulty || 1], x + w / 2, y + 22, UIC.ink, { align: 'center', outline: false }); }
  else if (id === 'about') { E.font.text(g, 'MADE BY CLAUDE', x + w / 2, y + 10, UIC.ink, { align: 'center', outline: false }); E.font.text(g, 'ON MY-3D2DGE v0.85.2', x + w / 2, y + 22, UIC.muted, { align: 'center', outline: false }); px.sprite(g, LOGOS.mic.big, x + w / 2 - 12, y + 34 + Math.round(Math.sin(t * 3))); }
}

/* ---- EXHIBITION: JOIN ---- */
const EXH = { seats: [], teams: ['hightops', 'breakers'], locked: [false, false], lineups: [null, null], court: 'skybox', ruleI: 0, picker: 0 };
S.menu.exh = EXH;
SC.join = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); if (!EXH.seats.length || EXH.seats.length !== game.players.length) EXH.seats = game.players.map((I, i) => ({ side: i % 2, ready: false })); game.allowJoin({ max: 4, onJoin: (I, n) => { applyGlyphs(game.settings.glyphs); EXH.seats[n - 1] = { side: (n - 1) % 2, ready: false }; } }); },
  exit() { game.allowJoin(false); },
  update(dt) {
    const nav = idleTick(dt, 'join'); if (!nav) return;
    game.players.forEach((I, i) => {
      const s = EXH.seats[i] || (EXH.seats[i] = { side: i % 2, ready: false });
      if (!s.ready && (I.pressed('left') || I.pressed('right'))) { s.side = I.pressed('left') ? 0 : 1; sfx('select'); }
      if (I.pressed('confirm')) { if (s.ready && i === 0 && EXH.seats.every((q, k) => k >= game.players.length || q.ready)) { consumeNav(); finishJoin(); return; } s.ready = true; sfx('confirm'); }
      if (I.pressed('cancel')) { if (s.ready) s.ready = false; else if (i > 0) { game.removePlayer(I); EXH.seats.splice(i, 1); } else { gotoScreen('menu'); } sfx('cancel'); }
    });
    const c = nav.click; if (c && EXH.goRect && inRect(c, EXH.goRect)) { EXH.seats.forEach(s => { s.ready = true; }); finishJoin(); }
    if (EXH.seats.length && EXH.seats.slice(0, game.players.length).every(s => s.ready) && game.players.length === 1 && EXH.autoGo) finishJoin();
  },
  draw(r) {
    screenFrame(r, 'WHO\'S PLAYING?', ['{left}{right} SIDE', '{confirm} READY', '{cancel} LEAVE']);
    r.overlay(g => {
      const cx = Math.round(r.W / 2), y0 = 36;
      E.font.title(g, 'HOME', Math.round(r.W * .22), y0, { align: 'center', scale: 2, colors: BANNER_COLORS.three }); E.font.title(g, 'AWAY', Math.round(r.W * .78), y0, { align: 'center', scale: 2, colors: BANNER_COLORS.block });
      for (let i = 0; i < 4; i++) {
        const I = game.players[i], s = EXH.seats[i], y = y0 + 24 + i * 30, col = E.PLAYER_COLORS[i];
        if (!I) { E.ui.box(g, cx - 60, y, 120, 24, { bg: '#140c24', border: UIC.line, alpha: .8 }); E.font.text(g, 'P' + (i + 1) + '  ' + (i === 1 ? 'PRESS 2 OR START' : 'PRESS START'), cx, y + 8, UIC.dim, { align: 'center', outline: false }); continue; }
        const x = s.side === 0 ? Math.round(r.W * .22) - 60 : Math.round(r.W * .78) - 60;
        E.ui.box(g, x, y, 120, 24, { bg: [E.shade(col, -.4), E.shade(col, -.6)], border: s.ready ? UIC.gold : col });
        E.font.text(g, 'P' + (i + 1), x + 6, y + 8, col, { outline: '#000' });
        const dev = I.half ? (I.half === 'left' ? 'KEYS: WASD + F G H R T' : 'KEYS: ARROWS + . / , L ;') : I.lastDevice === 'gamepad' ? 'CONTROLLER' : 'KEYBOARD + MOUSE';
        E.font.text(g, dev, x + 24, y + 3, UIC.ink, { outline: false }); E.font.text(g, s.ready ? 'READY!' : '← → PICK A SIDE', x + 24, y + 13, s.ready ? UIC.gold : UIC.muted, { outline: false });
      }
      E.font.text(g, 'EMPTY SEATS ARE PLAYED BY THE CPU', cx, y0 + 150, UIC.muted, { align: 'center', outline: false });
      const all = EXH.seats.slice(0, game.players.length).every(s => s.ready);
      EXH.goRect = drawButton(g, cx - 50, y0 + 162, 100, 18, all ? 'CONTINUE' : 'READY UP', { focus: all, center: true });
      if (all) promptLine(g, 'P1 {confirm} TO CONTINUE', cx, y0 + 186, { align: 'center' });
    });
  }
};
function finishJoin() { game.allowJoin(false); EXH.locked = [false, false]; EXH.picker = 0; gotoScreen('teams'); }
const humansOn = side => game.players.map((I, i) => ({ I, i, s: EXH.seats[i] })).filter(o => o.s && o.s.side === side);

/* ---- TEAM SELECT ---- */
const selectableTeams = () => all('team').filter(t => !t.hidden && teamUnlocked(t.id)).map(t => t.id);
SC.teams = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); EXH.forTour = !!(d && d.tour); EXH.locked = [false, EXH.forTour]; },
  update(dt) {
    const nav = idleTick(dt, 'teams'); if (!nav) return;
    const list = EXH.forTour ? STREET_TEAMS : selectableTeams();
    for (const side of [0, 1]) {
      if (EXH.locked[side]) continue;
      const owners = humansOn(side), inputs = owners.length ? owners.map(o => o.I) : (side === 1 && EXH.locked[0] || side === 0 ? [game.input] : []);
      if (side === 1 && !EXH.locked[0] && !owners.length) continue;
      for (const I of inputs) {
        const k = list.indexOf(EXH.teams[side]);
        if (I.pressed('left') || I.pressed('right')) { EXH.teams[side] = list[(k + (I.pressed('left') ? -1 : 1) + list.length) % list.length]; sfx('select'); }
        if (I.pressed('confirm')) { EXH.locked[side] = true; sfx('confirm'); I.consumeAll(); }
        if (I.pressed('oop')) { EXH.bio = EXH.bio === side ? null : side; sfx('select'); }
      }
    }
    const c = nav.click; if (c && EXH.cardRects) EXH.cardRects.forEach((rc, side) => { if (rc && inRect(c, rc) && !EXH.locked[side]) { if (c[0] < rc[0] + 20) EXH.teams[side] = list[(list.indexOf(EXH.teams[side]) - 1 + list.length) % list.length]; else if (c[0] > rc[0] + rc[2] - 20) EXH.teams[side] = list[(list.indexOf(EXH.teams[side]) + 1) % list.length]; else EXH.locked[side] = true; sfx('select'); } });
    if (nav.cancel) { if (EXH.locked[1] && !EXH.forTour) EXH.locked[1] = false; else if (EXH.locked[0]) EXH.locked[0] = false; else gotoScreen(EXH.forTour ? 'tourmenu' : 'join'); return; }
    if (EXH.locked[0] && EXH.locked[1]) { consumeNav(); if (EXH.forTour) { TOUR.team = EXH.teams[0]; gotoScreen('lineup', { tour: true }); } else gotoScreen('lineup'); }
  },
  draw(r) {
    screenFrame(r, EXH.forTour ? 'PICK YOUR CREW' : 'PICK THE TEAMS', ['{left}{right} CHANGE', '{confirm} LOCK IN', '{oop} BIO', '{cancel} BACK']);
    r.overlay(g => {
      EXH.cardRects = [0, 1].map(side => (side === 1 && EXH.forTour) ? null : teamCard(g, r, EXH.teams[side], side, EXH.locked[side]));
      if (EXH.forTour) { const x = Math.round(r.W * .54), w = Math.round(r.W * .42); E.ui.box(g, x, 36, w, r.H - 70, { bg: ['#1e1434', '#120a22'], border: UIC.line }); E.font.text(g, 'THE BLAM TOUR', x + w / 2, 44, UIC.gold, { align: 'center', outline: false }); wrapText('Win three stops and the final at the Blam Dome. Your team\'s home court is skipped: every road leads to Commissioner Gigawatt.', w - 16).forEach((l, i) => E.font.text(g, l, x + w / 2, 58 + i * 9, UIC.ink, { align: 'center', outline: false })); (TOUR_STOPS[EXH.teams[0]] || []).concat('blambots').forEach((tid, i) => { const T = get('team', tid); E.font.text(g, (i < 3 ? 'STOP ' + (i + 1) : 'FINAL') + ': ' + T.short, x + 12, 110 + i * 11, i < 3 ? UIC.ink : '#ff8a8a', { outline: false }); }); }
    });
  }
};
function teamCard(g, r, id, side, locked) {
  const T = get('team', id), w = Math.round(r.W * .42), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .54), y = 34, h = r.H - 68;
  E.ui.box(g, x, y, w, h, { bg: [E.shade(T.colors.jersey, -.5), '#120a22'], border: locked ? UIC.gold : T.colors.trim, alpha: .95 });
  E.font.text(g, side === 0 ? 'HOME' : 'AWAY', x + 6, y + 4, UIC.muted, { outline: false });
  const owners = humansOn(side); E.font.text(g, owners.length ? owners.map(o => 'P' + (o.i + 1)).join(' ') : 'CPU', x + w - 6, y + 4, owners.length ? E.PLAYER_COLORS[owners[0].i] : UIC.muted, { align: 'right', outline: false });
  px.sprite(g, LOGOS[T.logo].big, x + w / 2 - 12, y + 12);
  E.font.text(g, T.name, x + w / 2, y + 36, '#ffffff', { align: 'center', outline: '#000' });
  E.font.text(g, get('court', T.court).name, x + w / 2, y + 46, UIC.muted, { align: 'center', outline: false });
  if (!locked) { E.font.text(g, '←', x + 6, y + 22, UIC.gold, { scale: 2, outline: false }); E.font.text(g, '→', x + w - 18, y + 22, UIC.gold, { scale: 2, outline: false }); }
  if (EXH.bio === side) wrapText(T.bio + ' STYLE: ' + T.style, w - 14).forEach((l, i) => E.font.text(g, l, x + 7, y + 60 + i * 9, UIC.ink, { outline: false }));
  else {
    const rowH = Math.floor((h - 62) / 3);
    T.players.forEach((pid, i) => {
      const d = get('player', pid), ry = y + 58 + i * rowH, ps = Math.min(26, rowH - 4);
      drawPortrait(g, pid, x + 5, ry, ps);
      E.font.text(g, d.name + ' #' + d.number, x + ps + 10, ry, '#ffffff', { outline: false });
      const top = RATING_KEYS.map((k, n) => [k, d.r[n]]).sort((a, b) => b[1] - a[1]).slice(0, 2);
      E.font.text(g, top.map(([k, v]) => RATING_NAMES[k] + ' ' + v).join('  '), x + ps + 10, ry + 10, UIC.gold, { outline: false });
    });
  }
  if (locked) E.font.title(g, 'LOCKED IN', x + w / 2, y + h - 14, { align: 'center', scale: 1, colors: [UIC.gold, '#ff8a3a'] });
  return [x, y, w, h];
}

/* ---- LINEUP: each human picks a player; the other starter is the best juice ---- */
SC.lineup = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) {
    menuEnter('menu'); EXH.forTour = !!(d && d.tour);
    EXH.picks = [];   // { side, I, i, sel, done }
    for (const side of [0, 1]) { const hs = EXH.forTour ? (side === 0 ? game.players.map((I, i) => ({ I, i })) .slice(0, 2) : []) : humansOn(side); hs.slice(0, 2).forEach((o, k) => EXH.picks.push({ side, I: o.I, i: o.i, sel: k, done: false })); }
  },
  update(dt) {
    const nav = idleTick(dt, 'lineup'); if (!nav) return;
    for (const pk of EXH.picks) {
      if (pk.done) { if (pk.I.pressed('cancel')) { pk.done = false; sfx('cancel'); } continue; }
      if (pk.I.pressed('left') || pk.I.pressed('right')) { pk.sel = (pk.sel + (pk.I.pressed('left') ? 2 : 1)) % 3; sfx('select'); }
      if (pk.I.pressed('confirm')) { const taken = EXH.picks.some(o => o !== pk && o.side === pk.side && o.done && o.sel === pk.sel); if (!taken) { pk.done = true; sfx('confirm'); pk.I.consumeAll(); } else sfx('cancel'); }
      if (pk.I.pressed('cancel') && pk.i === 0) { gotoScreen('teams', EXH.forTour ? { tour: true } : null); return; }
    }
    const c = nav.click; if (c && EXH.lineRects) for (const [rc, pk, k] of EXH.lineRects) if (inRect(c, rc) && !pk.done) { pk.sel = k; pk.done = true; sfx('confirm'); }
    if (EXH.picks.every(p => p.done)) { consumeNav(); buildLineups(); if (EXH.forTour) beginTour(); else gotoScreen('courtsel'); }
  },
  draw(r) {
    screenFrame(r, 'STARTING LINEUP', ['{left}{right} PLAYER', '{confirm} PICK', '{cancel} BACK']);
    r.overlay(g => {
      EXH.lineRects = [];
      for (const side of [0, 1]) {
        const tid = EXH.teams[side], T = get('team', tid), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .54), w = Math.round(r.W * .42), y = 34;
        if (EXH.forTour && side === 1) { E.ui.box(g, x, y, w, r.H - 70, { bg: '#120a22', border: UIC.line }); E.font.text(g, 'THE TOUR STARTS SOON', x + w / 2, y + 40, UIC.muted, { align: 'center', outline: false }); continue; }
        E.ui.box(g, x, y, w, r.H - 70, { bg: [E.shade(T.colors.jersey, -.5), '#120a22'], border: T.colors.trim }); E.font.text(g, T.short, x + w / 2, y + 4, '#fff', { align: 'center', outline: false });
        T.players.forEach((pid, k) => {
          const d = get('player', pid), cy = y + 16 + k * Math.floor((r.H - 90) / 3), ch = Math.floor((r.H - 90) / 3) - 4, mine = EXH.picks.filter(p => p.side === side && p.sel === k);
          const rc = [x + 4, cy, w - 8, ch]; E.ui.box(g, ...rc, { bg: mine.length ? '#3a2a5a' : '#1a1030', border: mine.some(p => p.done) ? UIC.gold : mine.length ? E.PLAYER_COLORS[mine[0].i] : UIC.line });
          drawPortrait(g, pid, x + 8, cy + 3, Math.min(30, ch - 6)); E.font.text(g, d.name + ' #' + d.number, x + 44, cy + 3, '#fff', { outline: false }); E.font.text(g, d.role, x + 44, cy + 12, UIC.muted, { outline: false });
          const best = RATING_KEYS.map((rk, i2) => [rk, d.r[i2]]).sort((a, b) => b[1] - a[1]).slice(0, 2); E.font.text(g, best.map(([rk, v]) => RATING_NAMES[rk] + ' ' + '★'.repeat(Math.ceil(v / 2))).join('  '), x + 44, cy + 21, UIC.gold, { outline: false });
          mine.forEach((p, n) => E.font.text(g, 'P' + (p.i + 1) + (p.done ? ' ★' : ''), x + w - 10 - n * 22, cy + 3, E.PLAYER_COLORS[p.i], { align: 'right', outline: '#000' }));
          for (const p of EXH.picks.filter(q => q.side === side)) EXH.lineRects.push([rc, p, k]);
        });
      }
    });
  }
};
function buildLineups() {
  for (const side of [0, 1]) {
    const T = get('team', EXH.teams[side]), picks = EXH.picks.filter(p => p.side === side).map(p => T.players[p.sel]), rest = T.players.filter(id => !picks.includes(id));
    EXH.lineups[side] = picks.concat(rest).slice(0, 3);
  }
}
/* ---- COURT & RULES ---- */
const RULES = [
  { key: 'quarterLen', label: 'QUARTERS', opts: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']] },
  { key: 'difficulty', label: 'CPU', opts: [[0, 'ROOKIE'], [1, 'PRO'], [2, 'ALL-STAR'], [3, 'BLAM']] },
  { key: 'powerups', label: 'POWER-UPS', opts: [[true, 'ON'], [false, 'OFF']] },
  { key: 'twists', label: 'COURT TWISTS', opts: [[true, 'ON'], [false, 'OFF']] }
];
SC.courtsel = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); EXH.ruleI = 0; EXH.court = EXH.court || get('team', EXH.teams[0]).court; if (!teamUnlocked(get('court', EXH.court).home) && EXH.court === 'dome' && !S.dev.unlockAll) EXH.court = 'skybox'; },
  update(dt) {
    const nav = idleTick(dt, 'courtsel'); if (!nav) return;
    const rows = 1 + RULES.length + 1;
    if (nav.up) { EXH.ruleI = (EXH.ruleI + rows - 1) % rows; sfx('select'); } if (nav.down) { EXH.ruleI = (EXH.ruleI + 1) % rows; sfx('select'); }
    if (NAV.hover && nav.mouse && EXH.ruleRects) EXH.ruleRects.forEach((rc, i) => { if (rc && inRect(NAV.hover, rc) && EXH.ruleI !== i) { EXH.ruleI = i; sfx('select'); } });
    const d = nav.left ? -1 : nav.right ? 1 : 0, clickedRow = nav.click && EXH.ruleRects ? EXH.ruleRects.findIndex(rc => rc && inRect(nav.click, rc)) : -1;
    if (clickedRow >= 0) EXH.ruleI = clickedRow;
    if (EXH.ruleI === 0 && (d || clickedRow === 0)) { const k = COURT_ORDER.indexOf(EXH.court); let n = k; do { n = (n + (d || 1) + COURT_ORDER.length) % COURT_ORDER.length; } while (COURT_ORDER[n] === 'dome' && !PROG.unlocked.bots && !S.dev.unlockAll && n !== k); EXH.court = COURT_ORDER[n]; sfx('select'); }
    else if (EXH.ruleI > 0 && EXH.ruleI <= RULES.length && (d || clickedRow === EXH.ruleI)) { const R = RULES[EXH.ruleI - 1], cur = R.opts.findIndex(o => o[0] === game.settings[R.key]), n = (cur + (d || 1) + R.opts.length) % R.opts.length; game.settings.set(R.key, R.opts[n][0]); sfx('select'); }
    if ((nav.confirm && EXH.ruleI === rows - 1) || (clickedRow === rows - 1)) { consumeNav(); sfx('confirm'); gotoScreen('matchup', { exh: true }); return; }
    if (nav.confirm) { EXH.ruleI = rows - 1; sfx('select'); }
    if (nav.cancel) gotoScreen('lineup');
  },
  draw(r) {
    screenFrame(r, 'COURT & RULES', ['{up}{down} CHOOSE', '{left}{right} CHANGE', '{confirm} START', '{cancel} BACK']);
    r.overlay(g => {
      const C = get('court', EXH.court), x = Math.round(r.W * .05), w = Math.round(r.W * .9), y = 34; EXH.ruleRects = [];
      EXH.ruleRects.push(drawButton(g, x, y, w, 44, '← ' + C.name + ' →', { focus: EXH.ruleI === 0, sub: C.setting + '  •  TWIST: ' + TWIST_INFO[C.twist][0], scale: 2 }));
      const ty = y + 50;
      RULES.forEach((R, i) => { const cur = R.opts.find(o => o[0] === game.settings[R.key]) || R.opts[0]; EXH.ruleRects.push(drawButton(g, x, ty + i * 22, w, 19, R.label + ':  ← ' + cur[1] + ' →', { focus: EXH.ruleI === i + 1 })); });
      EXH.ruleRects.push(drawButton(g, Math.round(r.W / 2) - 60, ty + RULES.length * 22 + 4, 120, 22, 'START', { focus: EXH.ruleI === RULES.length + 1, center: true, color: UIC.gold }));
      wrapText(TWIST_INFO[C.twist][1], w - 20).slice(0, 2).forEach((l, i) => E.font.text(g, l, Math.round(r.W / 2), ty + RULES.length * 22 + 32 + i * 9, UIC.muted, { align: 'center', outline: false }));
    });
  }
};

/* ---- THE MATCHUP CARD: the starters face off; the cheat-code window ---- */
const MU = { t: 0, until: 6, codes: {}, steps: [], data: null };
SC.matchup = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter(d && d.tour ? 'tourmap' : 'menu'); MU.t = 0; MU.until = 6; MU.data = d || {}; MU.codes = {}; MU.hist = game.players.map(() => []); MU.lastStep = 0; },
  update(dt) {
    MU.t += dt; const nav = navInput();
    // cheat codes: each player's recent inputs, matched against the codes
    game.players.forEach((I, i) => {
      const h = MU.hist[i] || (MU.hist[i] = []);
      for (const a of ['up', 'down', 'left', 'right', 'shoot', 'pass', 'turbo', 'shove', 'oop']) if (I.pressed(a)) { h.push([a, MU.t]); MU.lastStep = MU.t; if (h.length > 6) h.shift(); }
      for (const C of CODES) {
        const n = C.steps.length; if (h.length < n || MU.codes[C.id]) continue;
        const tail = h.slice(-n); if (tail.every((s, k) => s[0] === C.steps[k] && (k === 0 || s[1] - tail[k - 1][1] <= .6))) { MU.codes[C.id] = { by: i }; h.length = 0; sfx('code_ok'); MU.flash = C.name + ': ON'; MU.flashT = 1.5; }
      }
    });
    if (MU.t - MU.lastStep < .6 && MU.t > MU.until - 2) MU.until += dt;   // a code in progress holds the card
    MU.flashT = Math.max(0, (MU.flashT || 0) - dt);
    const skip = (nav.confirm && game.players.some(I => I.pressed('confirm') && !I.pressed('shoot'))) || nav.click;
    if (MU.t > MU.until || (skip && MU.t > .6)) { consumeNav(); launchFromMatchup(); }
    if (nav.cancel && MU.t > .4 && !MU.data.tour) { gotoScreen('courtsel'); }
  },
  draw(r) {
    screenFrame(r, 'TONIGHT\'S MATCHUP', ['{confirm} TIP IT OFF', 'ENTER CODES NOW!']);
    r.overlay(g => {
      const teams = MU.data.tour ? [TOUR.team, TOUR.opp] : EXH.teams, lu = MU.data.tour ? TOUR.lineups : EXH.lineups, cx = Math.round(r.W / 2), y = 34;
      for (const side of [0, 1]) {
        const T = get('team', teams[side]), x = side === 0 ? Math.round(r.W * .04) : Math.round(r.W * .56), w = Math.round(r.W * .4);
        E.ui.box(g, x, y, w, 120, { bg: [E.shade(T.colors.jersey, -.45), '#120a22'], border: T.colors.trim });
        E.font.text(g, T.name, x + w / 2, y + 4, '#fff', { align: 'center', outline: '#000' });
        (lu[side] || T.players).slice(0, 2).forEach((pid, k) => { const d = get('player', pid); drawPortrait(g, pid, x + w / 4 - 20 + k * (w / 2), y + 16, 40, { turn: side ? -.35 : .35 }); E.font.text(g, d.name.split(' ').pop(), x + w / 4 + k * (w / 2), y + 60, '#fff', { align: 'center', outline: false }); drawMiniRatings(g, d, x + k * (w / 2), y + 72, w / 2); });
      }
      E.font.title(g, 'VS', cx, y + 44, { align: 'center', scale: 3, colors: BANNER_COLORS.block, depth: 2 });
      const C = get('court', MU.data.tour ? TOUR.court : EXH.court); E.font.text(g, 'AT ' + C.name, cx, y + 128, UIC.gold, { align: 'center', outline: false });
      E.font.text(g, String(Math.max(0, Math.ceil(MU.until - MU.t))), cx, y + 140, '#fff', { align: 'center', scale: 2, outline: '#000' });
      const on = Object.keys(MU.codes).map(id => CODES.find(c => c.id === id).name); if (on.length) E.font.text(g, on.join(' • '), cx, y + 162, '#5aff7a', { align: 'center', outline: false });
      if (MU.flashT > 0) E.font.title(g, MU.flash, cx, Math.round(r.H * .55), { align: 'center', scale: 2, colors: BANNER_COLORS.steal });
    });
  }
};
function drawMiniRatings(g, d, x, y, w) { RATING_KEYS.map((k, n) => [k, d.r[n]]).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([k, v], i) => E.font.text(g, RATING_NAMES[k] + ' ' + v, x + w / 2, y + i * 9, v >= 9 ? UIC.gold : UIC.ink, { align: 'center', outline: false })); }
/** the cheat codes entered on the card, into the match's options */
function applyCodes(o) {
  const C = MU.codes, cheats = {};
  if (C.tournament) { o.powerups = false; o.twists = false; o.comeback = 0; o.tournament = true; S.cheats = { tournament: true }; return o; }
  if (C.bigHeads) cheats.bigHeads = true; if (C.powerupsOn) o.powerups = true; if (C.noTwists) { o.twists = false; cheats.noTwists = true; }
  if (C.infTurbo) { cheats.infTurbo = 'team'; const by = C.infTurbo.by, seat = EXH.seats[by]; cheats.infTurboTeam = MU.data.tour ? 0 : seat ? seat.side : 0; }
  if (C.skyDunks) cheats.skyDunks = true; if (C.moonGravity) cheats.moonGravity = true;
  S.cheats = cheats; o.starred = Object.keys(C).length > 0;
  return o;
}
function launchFromMatchup() {
  if (MU.data.tour) { startTourMatch(); return; }
  const humans = []; game.players.forEach((I, i) => { const s = EXH.seats[i]; if (!s) return; const slotBase = s.side === 0 ? 0 : 2, used = humans.filter(h => h[0] >= slotBase && h[0] < slotBase + 2).length; if (used < 2) humans.push([slotBase + used, I]); });
  // the picks put each human on the player it chose: lineups already list the picks first, in seat order
  const o = applyCodes({ court: EXH.court, home: EXH.teams[0], away: EXH.teams[1], lineups: EXH.lineups.map(l => l.slice()), humans, quarterLen: game.settings.quarterLen || 120,
    diff: [game.settings.difficulty, game.settings.difficulty], powerups: !!game.settings.powerups, twists: !!game.settings.twists, comeback: game.settings.comeback, mode: 'exhibition', jackpotAll: !!game.settings.jackpotAll });
  EXH.lastOpts = o;
  startMatchScene(o, { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } });
  if (o.starred) game.after(.1, () => { if (S.match) S.match.starred = true; });
}

/* ---- THE BREAK CARD and THE HALFTIME REPORT ---- */
const BREAK = {
  open: false, t: 0, kind: 'quarter', subOpen: false, gag: '',
  show(kind) {
    this.open = true; this.t = 0; this.kind = kind; this.subOpen = false; this.i = 0; this.len = kind === 'half' ? 12 : 6;
    if (kind === 'half') { TOUR.gags = TOUR.gags || []; const left = HALFTIME_GAGS.filter(g => !TOUR.gags.includes(g)); this.gag = pickF(left.length ? left : HALFTIME_GAGS); TOUR.gags.push(this.gag); playMusic('halftime'); }
    if (ARENA.court && ARENA.court.id === 'scrapyard') { ARENA.carDrop = 1; game.after(.9, () => sfx('fall', { vol: .6 })); }
    if (S.attract || HUB) this.len = HUB ? 3 : 1.5;
  },
  update(dt) {
    this.t += dt; ARENA.carDrop = Math.max(0, ARENA.carDrop - dt * .5);
    const nav = navInput(), humans = S.players.filter(p => p.human !== null && p.human !== undefined && S.teams[p.team].bench.length);
    if (!HUB && !S.attract && humans.length && (nav.alt || (nav.click && this.subRect && inRect(nav.click, this.subRect)))) { this.subOpen = !this.subOpen; sfx('select'); }
    if (this.subOpen) {
      if (nav.up || nav.down) { this.i = (this.i + 1) % humans.length; sfx('select'); }
      if (nav.confirm) { const p = humans[this.i]; if (p) { substitute(p.slot); sfx('confirm'); } }
      if (nav.cancel) this.subOpen = false;
      return true;
    }
    if (this.t > this.len || (this.t > .8 && (nav.confirm || nav.click))) this.finish();
    return true;
  },
  finish() { this.open = false; cpuSubs(); if (this.kind === 'half') playMusic(ARENA.court.music); nextPeriod(); consumeNav(); },
  draw(r) {
    r.overlay(g => {
      const M = S.match, w = Math.min(r.W - 30, 330), h = this.kind === 'half' ? 170 : 128, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2) + 6;
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a4a'));
      E.ui.box(g, x, y, w, h, { bg: ['#22163a', '#0e0820'], border: UIC.gold });
      const title = this.kind === 'half' ? 'HALFTIME REPORT' : this.kind === 'ot' ? (M.sudden ? 'SUDDEN BLAM' : 'OVERTIME') : 'END OF Q' + M.quarter;
      E.font.title(g, title, x + w / 2, y + 6, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk });
      const T0 = get('team', S.teams[0].id), T1 = get('team', S.teams[1].id);
      E.font.text(g, T0.short + '  ' + M.score[0] + '  -  ' + M.score[1] + '  ' + T1.short, x + w / 2, y + 26, '#fff', { align: 'center', scale: 1, outline: '#000' });
      for (const team of [0, 1]) { const lead = teamPlayers(team).slice().sort((a, b) => b.stats.PTS - a.stats.PTS)[0]; if (lead) E.font.text(g, lead.name + ': ' + lead.stats.PTS + ' PTS', team ? x + w - 8 : x + 8, y + 40, UIC.muted, { align: team ? 'right' : 'left', outline: false }); }
      let yy = y + 54;
      if (this.kind === 'half') { wrapText(this.gag, w - 24).forEach((l, i) => E.font.text(g, l, x + w / 2, yy + i * 9, '#ffe8a0', { align: 'center', outline: false })); yy += 34; }
      // juice bars and subs for human teams
      for (const team of [0, 1]) teamPlayers(team).concat(S.teams[team].bench.map(b => ({ name: b.def.name, juice: b.juice, bench: true }))).forEach((p, i) => { const xx = team ? x + w / 2 + 6 : x + 8, ty = yy + i * 9; E.font.text(g, p.name.split(' ').pop() + (p.bench ? '*' : ''), xx, ty, p.bench ? UIC.muted : UIC.ink, { outline: false }); E.ui.bar(g, xx + 74, ty + 2, w / 2 - 90, 4, p.juice, p.juice > .6 ? '#5ae08a' : p.juice > .3 ? '#ffd23a' : '#ff5a3a'); });
      const humans = S.players.filter(p => p.human !== null && p.human !== undefined && S.teams[p.team].bench.length);
      if (this.subOpen) humans.forEach((p, i) => { drawButton(g, x + 20, y + h - 46 + i * 0, w - 40, 18, 'SUB OUT ' + p.name + ' FOR ' + S.teams[p.team].bench[0].def.name, { focus: this.i === i }); });
      else if (humans.length && !HUB && !S.attract) this.subRect = drawButton(g, x + w / 2 - 70, y + h - 40, 140, 16, 'SUBSTITUTE', { center: true });
      promptLine(g, (humans.length && !HUB && !S.attract ? '{oop} SUBS    ' : '') + '{confirm} CONTINUE  ' + Math.max(0, Math.ceil(this.len - this.t)), x + w / 2, y + h - 18, { align: 'center' });
    });
  }
};

/* ---- RESULTS ---- */
const RES = { page: 0, i: 0, res: null, from: null };
SC.results = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); RES.res = d.res; RES.from = d.from || 'exhibition'; RES.page = 0; RES.i = 0; RES.rects = []; },
  items() { return RES.from === 'tour' ? [{ label: 'CONTINUE' }] : [{ label: 'REMATCH' }, { label: 'NEW TEAMS' }, { label: 'MAIN MENU' }]; },
  update(dt) {
    const nav = navInput(), items = this.items();
    if (nav.tabL || nav.tabR || nav.left && RES.page === 1 || nav.right && RES.page === 0) { RES.page = 1 - RES.page; sfx('select'); }
    const r = listNav(RES, items, nav, { horizontal: true });
    if (r.picked >= 0) {
      consumeNav(); const L = items[r.picked].label;
      if (L === 'CONTINUE') tourAfterMatch(RES.res); else if (L === 'REMATCH') startMatchScene(Object.assign({}, EXH.lastOpts, { seed: undefined }), { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } });
      else if (L === 'NEW TEAMS') gotoScreen('teams'); else gotoScreen('menu');
    }
    if (r.cancel && RES.from !== 'tour') gotoScreen('menu');
  },
  draw(r) {
    const R = RES.res; if (!R) return;
    screenFrame(r, null, ['{left}{right} PAGE', '{confirm} SELECT']);
    r.overlay(g => {
      const cx = Math.round(r.W / 2), T0 = get('team', R.teams[0]), T1 = get('team', R.teams[1]);
      E.font.title(g, R.winner < 0 ? 'TIE GAME' : 'FINAL', cx, 6, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk });
      E.font.text(g, T0.short, cx - 70, 30, '#fff', { align: 'center', outline: '#000' }); E.font.text(g, T1.short, cx + 70, 30, '#fff', { align: 'center', outline: '#000' });
      E.font.title(g, String(R.score[0]), cx - 70, 40, { align: 'center', scale: 4, colors: R.winner === 0 ? BANNER_COLORS.jackpot : BANNER_COLORS.info });
      E.font.title(g, String(R.score[1]), cx + 70, 40, { align: 'center', scale: 4, colors: R.winner === 1 ? BANNER_COLORS.jackpot : BANNER_COLORS.info });
      if (R.starred) E.font.text(g, '★ CHEATS USED: NO HALL OF BLAM', cx, 78, '#ff8a8a', { align: 'center', outline: false });
      if (RES.page === 0) {
        if (R.mvp) { E.ui.box(g, Math.round(r.W * .06), 88, Math.round(r.W * .42), 74, { bg: '#1e1434', border: UIC.gold }); drawPortrait(g, R.mvp.id, Math.round(r.W * .06) + 6, 94, 40); E.font.text(g, 'MVP', Math.round(r.W * .06) + 52, 94, UIC.gold, { outline: false }); E.font.text(g, R.mvp.name, Math.round(r.W * .06) + 52, 104, '#fff', { outline: false }); const s = R.mvp.stats; E.font.text(g, s.PTS + ' PTS  ' + s.REB + ' REB', Math.round(r.W * .06) + 52, 116, UIC.ink, { outline: false }); E.font.text(g, s.STL + ' STL  ' + s.BLK + ' BLK  ' + s.DNK + ' DNK', Math.round(r.W * .06) + 52, 126, UIC.ink, { outline: false }); }
        const bx = Math.round(r.W * .52), bw = Math.round(r.W * .42);
        E.ui.box(g, bx, 88, bw, 74, { bg: '#1e1434', border: UIC.accent }); E.font.text(g, 'BLAM OF THE GAME', bx + bw / 2, 94, UIC.accent, { align: 'center', outline: false });
        if (R.best) { wrapText(R.best.what, bw - 12).slice(0, 2).forEach((l, i) => E.font.text(g, l, bx + bw / 2, 108 + i * 9, '#fff', { align: 'center', outline: false })); E.font.text(g, R.best.name + ' • +' + R.best.pts, bx + bw / 2, 132, UIC.gold, { align: 'center', outline: false }); }
        else E.font.text(g, 'A GAME OF FUNDAMENTALS', bx + bw / 2, 112, UIC.muted, { align: 'center', outline: false });
      } else {
        const x = Math.round(r.W * .05), w = Math.round(r.W * .9), cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'DNK'];
        E.ui.box(g, x, 86, w, 80, { bg: '#1e1434', border: UIC.line });
        cols.forEach((c, i) => E.font.text(g, c, x + w * .45 + i * (w * .55 / 6), 90, UIC.muted, { outline: false }));
        R.box.forEach((b, i) => { const y = 102 + i * 14; E.font.text(g, (b.human !== null && b.human !== undefined ? 'P' + (b.human + 1) + ' ' : '') + b.name, x + 6, y, b.team === 0 ? '#9ad8ff' : '#ffa8a8', { outline: false }); cols.forEach((c, k) => E.font.text(g, String(b.stats[c]), x + w * .45 + k * (w * .55 / 6), y, '#fff', { outline: false })); });
      }
      const items = this.items(), bw = 92, x0 = Math.round(cx - (items.length * (bw + 6)) / 2);
      RES.rects = items.map((it, i) => drawButton(g, x0 + i * (bw + 6), r.H - 42, bw, 20, it.label, { focus: RES.i === i, center: true }));
    });
  }
};

/* ---- HALL OF BLAM ---- */
SC.hall = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('menu'); },
  update(dt) { const nav = idleTick(dt, 'hall'); if (!nav) return; if (nav.cancel || nav.confirm || nav.click) { consumeNav(); gotoScreen('menu'); } },
  draw(r) {
    screenFrame(r, 'HALL OF BLAM', ['{cancel} BACK']);
    r.overlay(g => drawHallTable(g, r, 34));
  }
};
function drawHallTable(g, r, y) {
  const x = Math.round(r.W * .06), w = Math.round(r.W * .5), T = CAB.table('tour');
  E.ui.box(g, x, y, w, 128, { bg: '#1e1434', border: UIC.gold }); E.font.text(g, 'TOUR SCORES', x + w / 2, y + 4, UIC.gold, { align: 'center', outline: false });
  for (let i = 0; i < 10; i++) { const e = T[i], yy = y + 16 + i * 11; E.font.text(g, (i + 1) + '.', x + 8, yy, UIC.muted, { outline: false }); E.font.text(g, e ? e.name : '---', x + 26, yy, i === 0 ? UIC.gold : UIC.ink, { outline: false }); E.font.text(g, e ? String(e.score) : '0', x + w - 8, yy, '#fff', { align: 'right', outline: false }); }
  const rx = x + w + 8, rw = Math.round(r.W * .94) - rx, R = PROG.records;
  E.ui.box(g, rx, y, rw, 128, { bg: '#1e1434', border: UIC.accent }); E.font.text(g, 'RECORDS', rx + rw / 2, y + 4, UIC.accent, { align: 'center', outline: false });
  const lines = [['MOST POINTS IN A GAME', R.mostPoints ? R.mostPoints.pts + ' • ' + R.mostPoints.name : '---'], ['BEST PLAY', R.bestDunk ? R.bestDunk.what : '---'], ['', R.bestDunk ? R.bestDunk.name + ' • +' + R.bestDunk.pts : ''], ['TOURS WON', String(R.toursWon || 0)]];
  lines.forEach(([a, b], i) => { E.font.text(g, a, rx + 6, y + 18 + i * 24, UIC.muted, { outline: false }); wrapText(b, rw - 12).slice(0, 1).forEach(l => E.font.text(g, l, rx + 6, y + 28 + i * 24, '#fff', { outline: false })); });
}

/* ---- HOW TO PLAY: three pages ---- */
const HOW = { page: 0 };
const HOW_ROWS = [['move', 'RUN • DRIBBLE • DEFEND'], ['shoot', 'HOLD TO JUMP, LET GO AT THE TOP • BLOCK'], ['turbo', 'TURBO • HOLD IT + SHOOT TO DUNK'], ['pass', 'PASS • STEAL WITHOUT THE BALL'], ['shove', 'SPIN MOVE WITH IT • SHOVE WITHOUT'], ['oop', 'ALLEY-OOP • CALL FOR IT'], ['taunt', 'TAUNT']];
SC.howto = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('menu'); HOW.page = 0; HOW.back = d && d.back; },
  update(dt) { const nav = idleTick(dt, 'howto'); if (!nav) return; if (nav.left || nav.tabL) { HOW.page = (HOW.page + 2) % 3; sfx('select'); } if (nav.right || nav.tabR || nav.confirm || nav.click) { HOW.page = (HOW.page + 1) % 3; sfx('select'); } if (nav.cancel) { consumeNav(); gotoScreen(HOW.back || 'menu'); } },
  draw(r) {
    screenFrame(r, ['CONTROLS', 'THE RULES', 'TWISTS & POWER-UPS'][HOW.page], ['{left}{right} PAGE ' + (HOW.page + 1) + '/3', '{cancel} BACK']);
    r.overlay(g => howPage(g, r, HOW.page, 32));
  }
};
function howPage(g, r, page, y) {
  const x = Math.round(r.W * .06), w = Math.round(r.W * .88);
  if (page === 0) {
    const dev = game.input.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard';
    E.font.text(g, dev === 'gamepad' ? 'CONTROLLER (' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION') + ' SYMBOLS)' : 'KEYBOARD AND MOUSE', x + w / 2, y, UIC.muted, { align: 'center', outline: false });
    HOW_ROWS.forEach(([a, text], i) => { const yy = y + 12 + i * 24, pad = dev === 'gamepad'; E.ui.box(g, x, yy - 2, w, 23, { bg: '#1e1434', border: UIC.line, alpha: .9 }); const gk = glyphFor(a, game.input, pad ? 'gamepad' : 'keyboard'), kw = drawGlyph(g, gk, x + 6, yy, pad ? 2 : 1); if (!pad && (a === 'shoot' || a === 'pass')) drawGlyph(g, glyphFor(a, game.input, 'mouse'), x + 10 + kw, yy, 1); E.font.text(g, text, x + 66, yy + 6, UIC.ink, { outline: false }); });
  } else if (page === 1) {
    const lines = ['2 ON 2, FULL COURT, FOUR QUARTERS. MOST POINTS WINS.', 'NO FOULS: SHOVING, STEALING AND BODY CONTACT ARE LEGAL.', 'NO TRAVELING, NO BACKCOURT, NO OUT OF BOUNDS.', 'TWO POINTS, THREE FROM BEYOND THE ARC. DUNKS ARE TWO.',
      '20-SECOND SHOT CLOCK. TOUCH THE RIM AND IT RESETS.', 'GOALTENDING (A BALL COMING DOWN OVER THE RIM) COUNTS FOR THE SHOOTER.', 'DUNKS NEED TURBO. LET GO OF A JUMPER AT THE TOP: PERFECT!', 'SCORE 3 IN A ROW UNANSWERED: SUPERNOVA! UNLIMITED TURBO,', 'HOTTER SHOTS, SHATTERING DUNKS. IT ENDS WHEN THEY SCORE.', 'TIED AFTER 4: OVERTIME. TIED AFTER TWO: SUDDEN BLAM.'];
    lines.forEach((l, i) => E.font.text(g, l, x, y + 4 + i * 14, i === 1 || i === 7 ? UIC.gold : UIC.ink, { outline: false }));
  } else {
    COURT_ORDER.forEach((cid, i) => { const C = get('court', cid), info = TWIST_INFO[C.twist]; E.font.text(g, C.name + ': ' + info[0], x, y + i * 18, UIC.gold, { outline: false }); E.font.text(g, wrapText(info[1], w)[0], x, y + 8 + i * 18, UIC.muted, { font: 'tiny', outline: false }); });
    PU_ORDER.forEach((id, i) => { const d = get('powerup', id), xx = x + (i % 2) * (w / 2), yy = y + 96 + Math.floor(i / 2) * 22; px.sprite(g, d.icon, xx, yy); E.font.text(g, d.name, xx + 16, yy, d.color, { outline: false }); E.font.text(g, wrapText(d.help, w / 2 - 20)[0], xx + 16, yy + 9, UIC.muted, { font: 'tiny', outline: false }); });
  }
}

/* ---- ABOUT / CREDITS: one topic a page ---- */
const ABOUT = { page: 0, scroll: 0 };
function aboutPages() { const p = ABOUT_PAGES.slice(); if (PROG.unlocked.bots || S.dev.unlockAll) p.push(['SECRETS', SECRETS_TEXT]); return p; }
SC.about = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('credits'); ABOUT.page = 0; ABOUT.scroll = 0; },
  update(dt) {
    const nav = idleTick(dt, 'about'); if (!nav) return; const n = aboutPages().length;
    if (nav.left || nav.tabL) { ABOUT.page = (ABOUT.page + n - 1) % n; ABOUT.scroll = 0; sfx('select'); }
    if (nav.right || nav.tabR || nav.click) { ABOUT.page = (ABOUT.page + 1) % n; ABOUT.scroll = 0; sfx('select'); }
    if (nav.down) ABOUT.scroll++; if (nav.up) ABOUT.scroll = Math.max(0, ABOUT.scroll - 1);
    const z = game.input.zoom(); if (z && z !== 1) ABOUT.scroll = Math.max(0, ABOUT.scroll + (z < 1 ? 1 : -1));
    if (nav.cancel || nav.confirm) { consumeNav(); gotoScreen('menu'); }
  },
  draw(r) {
    const pages = aboutPages(), [title, body] = pages[ABOUT.page % pages.length];
    screenFrame(r, title, ['{left}{right} PAGE ' + (ABOUT.page + 1) + '/' + pages.length, '{up}{down} SCROLL', '{cancel} BACK']);
    r.overlay(g => {
      const x = Math.round(r.W * .05), w = Math.round(r.W * .9), y = 30, rows = Math.floor((r.H - 52 - y) / 9);
      const lines = []; for (const para of body) { const ls = wrapText(para, w); lines.push(...ls, ''); }
      ABOUT.scroll = Math.min(ABOUT.scroll, Math.max(0, lines.length - rows));
      lines.slice(ABOUT.scroll, ABOUT.scroll + rows).forEach((l, i) => E.font.text(g, l, x, y + i * 9, /^[A-Z][A-Z &/-]+:/.test(l) ? UIC.gold : UIC.ink, { outline: false }));
      if (lines.length > rows) { const k = ABOUT.scroll / Math.max(1, lines.length - rows); px.rect(g, r.W - 6, y, 2, rows * 9, '#2a2040'); px.rect(g, r.W - 6, y + Math.round(k * (rows * 9 - 12)), 2, 12, UIC.gold); }
    });
  }
};


/* ==== 43-tour.js ==== */
/* 43-tour: the Blam Tour (PLAN 10.5-10.6). PROLOGUE -> STOP 1 -> STOP 2 -> STOP 3 -> THE REVEAL -> THE FINAL -> ENDING ->
 * CREDITS -> HALL OF BLAM ENTRY. The tour map, the story scene (beats as dialog with live portraits and gibberish voices,
 * staged with posed rigs), the flow between stops, rematches, autosave and CONTINUE TOUR, unlocks, in-play beats. */
const TOUR = { team: 'hightops', stop: 0, score: 0, cheatsUsed: false, beatsSeen: [], lineups: [null, null], opp: null, court: null, seenReboot: false, gags: [], results: [], firstTour: true };
game.saves.write = () => ({ data: tourState(), place: TOUR.court ? get('court', TOUR.court).name : 'THE BLAM TOUR', level: TOUR.stop + 1 });
game.saves.read = save => { if (save && save.data) restoreTour(save.data); };
function tourState() { return { team: TOUR.team, stop: TOUR.stop, score: TOUR.score, cheatsUsed: TOUR.cheatsUsed, beatsSeen: TOUR.beatsSeen.slice(), lineups: TOUR.lineups, results: TOUR.results.slice(), gags: TOUR.gags.slice() }; }
function restoreTour(d) { Object.assign(TOUR, { team: d.team, stop: d.stop, score: d.score || 0, cheatsUsed: !!d.cheatsUsed, beatsSeen: d.beatsSeen || [], lineups: d.lineups || [null, null], results: d.results || [], gags: d.gags || [] }); setStop(); }
function setStop() {
  const opps = TOUR_STOPS[TOUR.team] || TOUR_STOPS.hightops;
  TOUR.opp = TOUR.stop < 3 ? opps[TOUR.stop] : 'blambots'; TOUR.court = get('team', TOUR.opp).court;
  TOUR.lineups = [TOUR.lineups[0] || get('team', TOUR.team).players.slice(), get('team', TOUR.opp).players.slice()];
}
function saveTour() { PROG.tour = tourState(); saveProgress(); try { game.saves.autosave(); } catch (e) { game.fail('autosave', e); } }
function beginTour() {
  Object.assign(TOUR, { team: EXH.teams[0], stop: 0, score: 0, cheatsUsed: false, beatsSeen: [], results: [], gags: [], seenReboot: false, firstTour: !PROG.tour && !PROG.records.toursWon });
  TOUR.lineups = [EXH.lineups[0] || get('team', TOUR.team).players.slice(), null]; TOUR.humans = Math.min(2, EXH.picks ? EXH.picks.filter(p => p.side === 0).length : 1);
  setStop(); saveTour();
  playBeats(TOUR.firstTour ? ['prologue', 'campOffer'] : ['prologue'], () => gotoScreen('tourmap'));
}
function continueTour() { const d = PROG.tour || (game.saves.latest() && game.saves.latest().data); if (!d) return false; restoreTour(d); TOUR.humans = 1; gotoScreen('tourmap'); return true; }
/* ---- the tour's menu ---- */
S.menu.tour = { i: 0, rects: [] };
SC.tourmenu = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('tourmap'); },
  items() { return [{ label: 'CONTINUE TOUR', disabled: !PROG.tour, sub: PROG.tour ? get('team', PROG.tour.team).short + ' • STOP ' + (PROG.tour.stop + 1) + ' • ' + PROG.tour.score + ' PTS' : 'No tour in progress' }, { label: 'NEW TOUR', sub: 'Pick a crew and take on the Tour' }, { label: 'BACK' }]; },
  update(dt) {
    const nav = idleTick(dt, 'tourmenu'); if (!nav) return; const st = S.menu.tour, items = this.items(); if (items[st.i].disabled) st.i = 1;
    const r = listNav(st, items, nav);
    if (r.cancel) { gotoScreen('menu'); return; }
    if (r.picked === 0) { consumeNav(); continueTour(); } else if (r.picked === 1) { consumeNav(); EXH.seats = [{ side: 0, ready: true }]; EXH.teams[0] = EXH.teams[0] && STREET_TEAMS.includes(EXH.teams[0]) ? EXH.teams[0] : 'hightops'; gotoScreen('teams', { tour: true }); } else if (r.picked === 2) gotoScreen('menu');
  },
  draw(r) {
    screenFrame(r, 'THE BLAM TOUR', ['{confirm} SELECT', '{cancel} BACK']);
    r.overlay(g => { const st = S.menu.tour, x = Math.round(r.W * .2), w = Math.round(r.W * .6); st.rects = this.items().map((it, i) => drawButton(g, x, 50 + i * 36, w, 30, it.label, { focus: st.i === i, sub: it.sub, disabled: it.disabled })); });
  }
};
/* ---- the tour map: Neon Heights' skyline, the Pier on the coast, the Scrapyard inland, Kaboom Island, the Dome on a hill ---- */
const MAP_SPOTS = { skybox: [.2, .32], pier: [.14, .7], scrapyard: [.48, .5], caldera: [.78, .78], dome: [.7, .22] };
S.menu.map = { hover: -1 };
SC.tourmap = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('tourmap'); setStop(); },
  update(dt) {
    const nav = idleTick(dt, 'tourmap'); if (!nav) return;
    const medal = SC.tourmap.medal, clickNext = nav.click && ((SC.tourmap.nextRect && inRect(nav.click, SC.tourmap.nextRect)) || (medal && Math.hypot(nav.click[0] - medal[0], nav.click[1] - medal[1]) < 14));
    SC.tourmap.hover = !!(medal && NAV.hover && Math.hypot(NAV.hover[0] - medal[0], NAV.hover[1] - medal[1]) < 14);
    if (nav.confirm || clickNext) { consumeNav(); goToStop(); }
    if (nav.cancel) { saveTour(); gotoScreen('menu'); }
  },
  draw(r) {
    screenFrame(r, 'THE BLAM TOUR', ['{confirm} PLAY STOP ' + (TOUR.stop + 1), '{cancel} SAVE & QUIT'], { sky: ['#0e1a3a', '#1a3a5a', '#2a5a6a'] });
    r.overlay(g => {
      const mw = Math.round(r.W * .64), mh = r.H - 60, mx = Math.round(r.W * .03), my = 28, t = game.real;
      // the land and the sea
      E.ui.box(g, mx, my, mw, mh, { bg: ['#2a6a8a', '#1a4a6a'], border: '#8ab0c8' });
      px.poly(g, [[mx + 4, my + 4], [mx + mw * .92, my + 4], [mx + mw * .9, my + mh * .55], [mx + mw * .6, my + mh * .7], [mx + mw * .25, my + mh * .62], [mx + 4, my + mh * .82]], '#5a8a4a');
      px.poly(g, [[mx + mw * .66, my + mh * .7], [mx + mw * .9, my + mh * .66], [mx + mw * .94, my + mh * .9], [mx + mw * .68, my + mh * .94]], '#4a7a3a');
      for (let k = 0; k < 6; k++) px.rect(g, mx + mw * .08 + k * 6, my + mh * .2 - (k % 3) * 6, 5, 14 + (k % 3) * 6, '#3a2a5a');
      const order = (TOUR_STOPS[TOUR.team] || []).map(id => get('team', id).court).concat('dome'), home = get('team', TOUR.team).court;
      const pt = c => [mx + MAP_SPOTS[c][0] * mw, my + MAP_SPOTS[c][1] * mh];
      const [hx, hy] = pt(home); px.disc(g, hx, hy, 5, '#fff'); E.font.text(g, 'HOME', hx, hy + 7, '#fff', { align: 'center', outline: '#000' });
      let prev = [hx, hy];
      order.forEach((c, i) => { const [x, y] = pt(c); for (let u = 0; u < 1; u += .08) px.dot(g, lerp(prev[0], x, u), lerp(prev[1], y, u), i <= TOUR.stop ? '#ffd23a' : '#c8d8e8'); prev = [x, y]; });
      order.forEach((c, i) => {
        const [x, y] = pt(c), won = i < TOUR.stop, next = i === TOUR.stop, T = get('team', i < 3 ? TOUR_STOPS[TOUR.team][i] : 'blambots'), pulse = next ? 2 + Math.sin(t * 6) * 1.5 + (SC.tourmap.hover ? 2 : 0) : 0;
        if (next) SC.tourmap.medal = [x, y];
        px.disc(g, x, y, 10 + pulse, next ? UIC.gold : won ? '#5ae08a' : '#3a3a5a'); px.disc(g, x, y, 8, i === 3 ? '#2a2a3a' : E.shade(T.colors.jersey, -.3)); px.sprite(g, LOGOS[T.logo].spr, x - 6, y - 5);
        if (won) { E.font.title(g, 'W', x + 8, y - 12, { scale: 1, colors: ['#ffffff', '#5aff7a', '#1a8a3a'] }); const res = TOUR.results[i]; if (res) E.font.text(g, res, x, y + 12, '#fff', { align: 'center', outline: '#000' }); }
        E.font.text(g, get('court', c).name.replace('THE ', ''), x, y - 22, next ? UIC.gold : '#e8f0ff', { align: 'center', outline: '#000' });
      });
      // the side panel
      const sx = mx + mw + 8, sw = r.W - sx - 8, T = get('team', TOUR.team), O = get('team', TOUR.opp);
      E.ui.box(g, sx, my, sw, mh, { bg: ['#1e1434', '#120a22'], border: UIC.line });
      px.sprite(g, LOGOS[T.logo].big, sx + sw / 2 - 12, my + 6); E.font.text(g, T.short, sx + sw / 2, my + 30, '#fff', { align: 'center', outline: false });
      E.font.text(g, 'TOUR SCORE', sx + sw / 2, my + 44, UIC.muted, { align: 'center', outline: false }); E.font.text(g, String(TOUR.score), sx + sw / 2, my + 53, UIC.gold, { align: 'center', scale: 2, outline: '#000' });
      E.font.text(g, 'RECORD ' + TOUR.stop + '-' + (TOUR.losses || 0), sx + sw / 2, my + 72, UIC.ink, { align: 'center', outline: false });
      E.font.text(g, TOUR.stop < 3 ? 'NEXT: STOP ' + (TOUR.stop + 1) : 'THE FINAL', sx + sw / 2, my + 88, UIC.gold, { align: 'center', outline: false });
      E.font.text(g, 'VS ' + O.short, sx + sw / 2, my + 98, '#fff', { align: 'center', outline: false });
      E.font.text(g, get('court', TOUR.court).name, sx + sw / 2, my + 108, UIC.muted, { align: 'center', outline: false });
      SC.tourmap.nextRect = drawButton(g, sx + 6, my + mh - 30, sw - 12, 22, 'PLAY', { focus: true, center: true });
    });
  }
};
function tourDiff() { const base = game.settings.difficulty === undefined ? 1 : game.settings.difficulty; return clamp(base + TOUR_DIFF_SHIFT[Math.min(3, TOUR.stop)], 0, 3); }
function goToStop() {
  setStop();
  const beats = TOUR.stop === 3 ? ['finalPre'] : ['stopIntro', 'pregame'];
  playBeats(beats, () => gotoScreen('matchup', { tour: true }));
}
function startTourMatch() {
  const humans = game.players.slice(0, Math.max(1, Math.min(2, TOUR.humans || 1))).map((I, i) => [i, I]);
  const o = applyCodes({ court: TOUR.court, home: TOUR.team, away: TOUR.opp, lineups: TOUR.lineups.map(l => l && l.slice()), humans, quarterLen: TOUR.quarterLen || 90, diff: [tourDiff(), tourDiff()], powerups: TOUR.stop > 0, twists: true, comeback: game.settings.comeback, mode: 'tour' });
  if (o.starred) TOUR.cheatsUsed = true;
  startMatchScene(o, { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'tour' }); } });
}
/** after a tour match's results: the post-game beat and the map, or the rematch prompt, or the ending */
function tourAfterMatch(res) {
  const won = res.winner === 0;
  if (won) {
    TOUR.score += res.style[0]; TOUR.results[TOUR.stop] = res.score[0] + '-' + res.score[1];
    const done = TOUR.stop; TOUR.stop++;
    if (done === 3) { TOUR.stop = 3; finishTour(); return; }
    saveTour();
    const beats = done === 0 ? ['post1'] : done === 1 ? ['post2'] : ['reveal'];
    TOUR.lastOpp = TOUR.opp; playBeats(beats, () => gotoScreen('tourmap'), { opp: TOUR.opp });
  } else { TOUR.losses = (TOUR.losses || 0) + 1; playBeats([TOUR.stop === 3 ? 'lossFinal' : 'lossStop'], () => gotoScreen('rematch')); }
}
/* ---- a loss: REMATCH? with a 10-second countdown ---- */
S.menu.rematch = { i: 0, rects: [], t: 0 };
SC.rematch = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('story'); S.menu.rematch.t = 10; S.menu.rematch.i = 0; },
  items: [{ label: 'REMATCH' }, { label: 'TOUR MAP' }, { label: 'QUIT TOUR' }],
  update(dt) {
    const st = S.menu.rematch, nav = navInput(); st.t -= dt;
    const r = listNav(st, this.items, nav);
    if (r.picked === 0 || st.t <= 0) { consumeNav(); gotoScreen('matchup', { tour: true }); }
    else if (r.picked === 1) { consumeNav(); saveTour(); gotoScreen('tourmap'); }
    else if (r.picked === 2 || r.cancel) { consumeNav(); quitTour(); }
  },
  draw(r) {
    screenFrame(r, 'REMATCH?', ['{confirm} SELECT']);
    r.overlay(g => { const st = S.menu.rematch, x = Math.round(r.W * .3), w = Math.round(r.W * .4); E.font.title(g, String(Math.max(0, Math.ceil(st.t))), Math.round(r.W / 2), 36, { align: 'center', scale: 4, colors: BANNER_COLORS.block }); st.rects = this.items.map((it, i) => drawButton(g, x, 90 + i * 28, w, 22, it.label, { focus: st.i === i, center: true })); });
  }
};
function quitTour() { const score = TOUR.score; PROG.tour = null; saveProgress(); hallEntry(score, () => gotoScreen('menu')); }
function finishTour() {
  PROG.records.toursWon = (PROG.records.toursWon || 0) + 1;
  const newly = !PROG.unlocked.bots; PROG.unlocked.bots = true; PROG.unlocked.allstars = true; PROG.unlocked.bigHeads = true; PROG.tour = null; saveProgress(); defineBigHeads();
  playBeats(['ending'], () => gotoScreen('credits', { unlocks: newly || true, score: TOUR.score }));
}
function defineBigHeads() { if (PROG.unlocked.bigHeads && !game.settings.spec('bigHeads')) game.settings.define({ key: 'bigHeads', label: 'Big heads', type: 'toggle', value: false, group: 'Game' }); }
/** the initials wheel for a qualifying tour score (no cheats), then done */
function hallEntry(score, done) {
  if (!TOUR.cheatsUsed && score > 0 && CAB.qualifies(score, 'tour') && !HUB) gotoScreen('hallentry', { score, done }); else done();
}
SC.hallentry = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('credits'); this.d = d; CAB.enter(d.score, 'tour', () => { game.after(.6, () => this.d.done()); }); },
  update(dt) { CAB.update(dt); },
  draw(r) { screenFrame(r, 'HALL OF BLAM', null); r.overlay(g => { E.font.text(g, 'TOUR SCORE ' + this.d.score + '! ENTER YOUR INITIALS', Math.round(r.W / 2), 30, UIC.gold, { align: 'center', outline: false }); }); CAB.draw(r); }
};
/* ---- credits: the roll over the trophy lift and a confetti storm, then the unlock cards ---- */
SC.credits = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('credits'); setupArena('dome'); this.t = 0; this.d = d || {}; this.cards = d && d.unlocks ? UNLOCK_CARDS.slice() : []; sting('victory'); this.trophy = dressPlayer(get('player', get('team', TOUR.team).players[0]), TOUR.team); },
  update(dt) {
    this.t += dt; updateArena(dt); crowdTick(1 / 120, false); game.focus(CMX, CMY, 0); if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) { for (let k = 0; k < 3; k++) P.add({ kind: 'bit', x: CMX - 200 + S.fx() * 400, y: CMY - 60 + S.fx() * 120, z: 160, vx: (S.fx() - .5) * 30, vy: 0, vz: -20, life: 3, color: pickF(['#ff3ca6', '#2de2ff', '#ffd23a', '#5ae08a', '#ffffff']) }); crowdReact('cheer', .2); }
    this.trophy.bb.pose = CLIPS.pointSky(this.t); this.trophy.bb.pose.R = [2, 2, 46]; this.trophy.bb.pose.L = [2, -2, 46]; this.trophy.bb.w = 1; this.trophy.update(dt, { x: CMX, y: CMY, z: 0, facing: PI / 2, expr: 'shout' });
    const nav = navInput(), rollEnd = CREDITS_ROLL.length * 12 / 22 + 8;
    if (nav.confirm || nav.cancel || nav.click || this.t > rollEnd + this.cards.length * 2.5) {
      if (this.t < rollEnd && !nav.cancel) { this.t = rollEnd; consumeNav(); return; }
      consumeNav(); const score = this.d.score || 0; if (this.d.score !== undefined) hallEntry(score, () => gotoScreen('menu')); else gotoScreen('about');
    }
  },
  draw(r) {
    drawArena(r); r.shadow(CMX, CMY, 8, .4); r.actor(CMX, CMY, 0, (g, ox, oy) => this.trophy.draw(g, ox, oy, r.view));
    const h = this.trophy.hand('R'); r.shape('trophy', h[0], h[1], h[2] - 4, { scale: 1.2 });
    r.overlay(g => {
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#2a1a4a'));
      const rollEnd = CREDITS_ROLL.length * 12 / 22 + 8, y0 = r.H - this.t * 22;
      if (this.t < rollEnd) CREDITS_ROLL.forEach(([a, b], i) => { const y = Math.round(y0 + i * 12 * 2); if (y < -10 || y > r.H) return; E.font.text(g, a, Math.round(r.W / 2), y, UIC.gold, { align: 'center', outline: '#000' }); if (b) E.font.text(g, b, Math.round(r.W / 2), y + 10, '#fff', { align: 'center', outline: '#000' }); });
      else { const k = Math.floor((this.t - rollEnd) / 2.5), c = this.cards[Math.min(k, this.cards.length - 1)]; if (c) { if (Math.floor(((this.t - rollEnd) % 2.5) * 10) === 0) sting('unlock'); E.ui.box(g, Math.round(r.W / 2) - 120, Math.round(r.H / 2) - 20, 240, 40, { bg: ['#3a1a5a', '#1a0a2a'], border: UIC.gold }); E.font.text(g, c, Math.round(r.W / 2), Math.round(r.H / 2) - 4, UIC.gold, { align: 'center', outline: '#000' }); } }
    });
  }
};

/* ---- the story scene: a list of beats, each a series of dialog lines on its stage ---- */
const TALK = new E.Dialog(game, { lines: 3, place: 'bottom', speed: 46 });
const STORY = { queue: [], beat: null, i: 0, lines: [], done: null, rigs: {}, t: 0, holdT: 0, choiceRes: null, ctx: {} };
function playBeats(ids, done, ctx = {}) { STORY.queue = ids.slice(); STORY.done = done; STORY.ctx = ctx; game.go('story', null, { fade: .2 }); }
function storyVars() { const T = get('team', TOUR.team); return { TEAM: T.short, CAPTAIN: get('player', (TOUR.lineups[0] || T.players)[0]).name }; }
function nextBeat() {
  if (!STORY.queue.length) { const d = STORY.done; STORY.done = null; TALK.close(); if (d) d(STORY.choiceRes); return; }
  const id = STORY.queue.shift(), b = get('beat', id); STORY.beat = b; STORY.i = 0; STORY.t = 0;
  if (!TOUR.beatsSeen.includes(id)) TOUR.beatsSeen.push(id);
  const ctx = Object.assign({ team: TOUR.team, stop: TOUR.stop, opp: STORY.ctx.opp || TOUR.opp, court: TOUR.court, homeTeam: TOUR.team, awayTeam: TOUR.opp }, STORY.ctx);
  STORY.lines = (b.dynamic ? beatLines(id, ctx) : b.lines).map(([sp, text]) => [sp === '{CAPTAIN}' ? (TOUR.lineups[0] || get('team', TOUR.team).players)[0] : sp, fill(text, storyVars())]);
  stageBeat(b, ctx); playMusic(b.music || 'story'); if (b.villain) game.after(.5, () => musicLayer('villain', true));
  emit('beat', { id }); sayLine();
}
function sayLine() {
  const b = STORY.beat, L = STORY.lines[STORY.i];
  if (!L) { nextBeat(); return; }
  const [sp, text] = L, both = sp === 'both', who = both ? 'vinnie' : sp, prof = CAST[who] ? CAST[who].voice : get('player', who) ? get('player', who).voice : 'vinnie';
  const name = both ? 'VINNIE & DEE DEE' : CAST[who] ? CAST[who].name : get('player', who) ? get('player', who).name : who.toUpperCase();
  TALK.voice = (ch, i, page) => { Voice.letter(ch, i, page, prof); if (both) Voice.letter(ch, i, page, 'deedee'); };
  const last = STORY.i === STORY.lines.length - 1, choices = last && b.choices ? b.choices : null;
  STORY.speaker = who;
  TALK.say(text, { name, portrait: storyRig(who), portraitOpts: { zoom: 3.2, turn: .4 }, choices, onChoice: k => { STORY.choiceRes = k; if (b.choices && k === 0 && STORY.beat === get('beat', 'campOffer')) { STORY.queue = []; STORY.done = () => { gotoScreen('camp', { fromTour: true }); }; } }, onDone: () => { STORY.i++; sayLine(); } });
}
function storyRig(id) { if (STORY.rigs[id]) return STORY.rigs[id]; const d = get('player', id); const rig = d ? dressPlayer(d, d.team) : castRig(CAST[id] ? id : 'vinnie'); rig.update(0, { x: 0, y: 0, z: 0, facing: PI / 2 }); return (STORY.rigs[id] = rig); }
/** each stage: where the cast stands */
function stageBeat(b, ctx) {
  const st = b.stage, actors = [];
  if (st === 'studio' || st === 'monitor') { actors.push(['vinnie', CMX - 26, CMY - 14, PI / 2], ['deedee', CMX + 26, CMY - 14, PI / 2]); }
  else if (st === 'court') { const a = (RIVAL_LINES[ctx.opp] || ['volt'])[0], mine = (TOUR.lineups[0] || get('team', TOUR.team).players)[0]; actors.push([mine, CMX - 40, CMY + 10, 0], [a, CMX + 40, CMY + 10, PI]); if (BEATEN_LINES[ctx.opp]) actors.push([BEATEN_LINES[ctx.opp][0], CMX + 40, CMY + 10, PI]); }
  else if (st === 'dome') { const mine = (TOUR.lineups[0] || get('team', TOUR.team).players)[0]; actors.push([mine, CMX - 70, CMY + 20, 0], ['gigawatt', CMX + 10, CMY - 10, PI * .75], ['dunkatron', CMX + 60, CMY + 10, PI], ['swatbot', CMX + 90, CMY - 6, PI]); if (b.ending) actors.push(['blammo', CMX - 20, CMY + 30, 0], ['vinnie', CMX - 120, CMY + 40, 0], ['deedee', CMX - 140, CMY + 20, 0]); }
  const seen = new Set(); STORY.actors = actors.filter(a => { if (seen.has(a[0])) return false; seen.add(a[0]); return true; }).map(([id, x, y, f]) => ({ id, rig: storyRig(id), x, y, f }));
  STORY.court = st === 'court' ? ctx.court : st === 'dome' ? 'dome' : null;
  if (STORY.court) setupArena(STORY.court);
}
SC.story = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [], pausable: true, story: true,
  enter() { menuEnter('story'); STORY.holdT = 0; nextBeat(); },
  exit() { TALK.close(); musicLayer('villain', false); game.setZoom(1); },
  update(dt) {
    STORY.t += dt; if (STORY.court) updateArena(dt);
    for (const a of STORY.actors || []) {
      const talking = STORY.speaker === a.id, ending = STORY.beat && STORY.beat.ending;
      if (ending && a.id === 'blammo' && STORY.i >= 3) { a.x += 30 * dt; const g2 = STORY.actors.find(q => q.id === 'gigawatt'); if (g2) { g2.x = a.x; g2.y = a.y; g2.carried = true; } }
      if (ending && (a.id === 'dunkatron' || a.id === 'swatbot') && STORY.i >= 1) a.down = true;
      a.rig.bb.pose = talking ? (CLIPS[a.rig.bb.def ? a.rig.bb.def.taunt : 'pointCamera'] || CLIPS.pointCamera)(STORY.t) : a.carried ? { R: [3, 6, 38], L: [3, -6, 38] } : null; a.rig.bb.w = approach(a.rig.bb.w, a.rig.bb.pose ? 1 : 0, dt * 8);
      a.rig._talk = talking && TALK.typing;
      a.rig.update(dt, { x: a.x, y: a.y, z: a.carried ? 30 : 0, facing: a.f, expr: talking ? 'shout' : null, down: a.down ? 1 : 0 });
    }
    game.focus(CMX, CMY, 0); game.cam.offset = [0, Math.round(game.H * (STORY.court ? .05 : .16))]; game.setZoom(STORY.court ? 1.3 : 2);
    // hold confirm for a second to skip this beat; Start skips the rest
    if (game.players.some(q => q.down('confirm'))) STORY.holdT += dt; else STORY.holdT = 0;
    if (STORY.holdT > 1) { STORY.holdT = 0; TALK.close(); STORY.lines = []; consumeNav(); nextBeat(); return; }
    if (game.players.some(q => q.pressed('start') && q.lastDevice === 'gamepad')) { skipCutscene(); return; }
    TALK.update(dt);
  },
  draw(r) {
    const b = STORY.beat; if (!b) return;
    if (STORY.court) drawArena(r);
    else { r.sky(['#0a0418', '#1e0c34', '#3a1452']); }
    r.overlay(g => {
      if (!STORY.court) {   // the Channel BLAM studio: lights, the logo, a monitor
        for (let k = 0; k < 8; k++) px.blend(g, .15, 'add', () => px.poly(g, [[r.W * (k / 8) + 20, 0], [r.W * (k / 8) - 30, r.H], [r.W * (k / 8) + 70, r.H]], k % 2 ? '#ff3ca6' : '#2de2ff'));
        const mx = r.W - 132, my = 22; E.ui.box(g, mx, my, 120, 74, { bg: '#0a0a14', border: '#5a5a6a' });
        if (b.stage === 'monitor' || STORY.speaker === 'gigawatt' || (b.id === 'prologue' && STORY.i >= 3 && STORY.i <= 4)) { drawPortrait(g, 'gigawatt', mx + 30, my + 6, 60, { frame: false, expr: 'smile' }); px.blend(g, .15, 'normal', () => { for (let y = my; y < my + 74; y += 2) px.rect(g, mx, y, 120, 1, '#000'); }); }
        else { px.sprite(g, LOGOS.mic.big, mx + 48, my + 20); E.font.text(g, 'CHANNEL BLAM', mx + 60, my + 50, UIC.gold, { align: 'center', outline: false }); }
      }
      E.font.text(g, b.title, 8, 6, UIC.muted, { outline: '#000' });
      promptLine(g, 'HOLD {confirm} SKIP', r.W - 8, 6, { align: 'right' });
    });
    if (!STORY.court) r.shape('anchor-desk', CMX, CMY + 6, 0, { scale: 1.6 });
    for (const a of STORY.actors || []) { r.shadow(a.x, a.y, 7, .4); r.actor(a.x, a.y, a.carried ? 30 : 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    TALK.draw(r);
  }
};
function skipCutscene() { TALK.close(); STORY.queue = []; STORY.lines = []; consumeNav(); nextBeat(); }
/** in play, the story speaks through captions (the Overclock, the first reboot) */
function playInPlayBeat(id) { const lines = get('beat', id).lines.map(([sp, t]) => [sp, fill(t, storyVars())]); lines.forEach(([sp, t], i) => game.after(i * 3.2, () => caption(sp, t, 6))); }


/* ==== 44-camp.js ==== */
/* 44-camp: Blam Camp (PLAN 10.9), ten lessons on the court. DEE DEE coaches through captions and her voice; INTERN 1
 * is your teammate, INTERNS 2 and 3 the practice opponents (scripted or passive). Each lesson is a few steps: an
 * instruction card with the player's own glyphs, a goal counter, "NICE!" on each success, then the next. Lessons are
 * picked from a list, can be skipped (the pause menu), and their completion is saved. */
const sp = (x, y) => [OX + x, OY + y];
function campPlace(slot, x, y, ball) { const p = S.players[slot]; const [wx, wy] = sp(x, y); p.x = wx; p.y = wy; p.vx = p.vy = 0; p.z = 0; p.setState('run'); p.jump = null; p.dunk = null; if (ball) giveBall(p, 'camp'); return p; }
const me = () => S.players[0], mate = () => S.players[1];
const CAMP_LESSONS = [
  { id: 'move', name: 'MOVE & TURBO', steps: [
    { text: 'Run through the three cones with {move}', say: 'WELCOME TO BLAM CAMP! RUN THROUGH THE CONES. FEEL THE SNEAKERS.', goal: 3, setup(L) { campPlace(0, 120, 144); L.cones = [sp(220, 80), sp(320, 200), sp(440, 110)].map(([x, y]) => ({ x, y, hit: false })); },
      tick(L) { for (const c of L.cones) if (!c.hit && dist2(me().x, me().y, c.x, c.y) < 16) { c.hit = true; L.count++; sfx('code_ok'); } } },
    { text: 'Hold {turbo} and cross the court in under 4 seconds', say: 'NOW HOLD TURBO AND GO! UNDER FOUR SECONDS!', goal: 1, setup(L) { campPlace(0, 30, 144); L.cones = []; L.runT = null; },
      tick(L, dt) { const lx = me().x - OX; if (lx > 70 && L.runT === null) L.runT = 0; if (L.runT !== null) L.runT += dt; if (lx > CW - 60 && L.runT !== null) { if (L.runT < 4) L.count++; else { L.runT = null; campPlace(0, 30, 144); caption('deedee', 'TOO SLOW! HOLD TURBO THE WHOLE WAY. AGAIN!'); } } } }
  ] },
  { id: 'pass', name: 'PASS', steps: [
    { text: 'Press {pass} to pass to your teammate', say: 'PASSING! PRESS PASS AND INTERN ONE CATCHES IT. TWICE, PLEASE.', goal: 2, setup(L) { campPlace(0, 200, 120, true); campPlace(1, 330, 190); }, on: { catch(L, e) { if (e.slot === 1) { L.count++; game.after(.8, () => { if (mate().has) passBall(mate(), me(), 'chest'); }); } } } },
    { text: 'When your teammate has it, press {pass} to call for it', say: 'NOW CALL FOR IT! PRESS PASS WHEN INTERN ONE HAS THE BALL.', goal: 1, setup(L) { campPlace(0, 200, 120); campPlace(1, 330, 190, true); }, on: { catch(L, e) { if (e.slot === 0 && e.from === 1) L.count++; } } }
  ] },
  { id: 'jumper', name: 'JUMP SHOT', steps: [
    { text: 'Hold {shoot} to jump, let go at the top. Make 2 (one PERFECT)', say: 'JUMP SHOTS! HOLD SHOOT, LET GO AT THE TOP OF THE JUMP. THE METER SHOWS YOU WHEN.', goal: 2, spot: [470, 110], setup(L) { campPlace(0, 470, 110, true); L.perfect = 0; L.bonus = .25; },
      on: { release(L, e) { if (e.slot === 0) L.lastPerfect = e.perfect; }, basket(L, e) { if (e.slot === 0 && !e.dunk && !e.three) { if (L.lastPerfect) L.perfect++; if (L.count === 1 && !L.perfect && !L.lastPerfect) { caption('deedee', 'GOOD! NOW ONE PERFECT: LET GO RIGHT AT THE TOP!'); } else L.count++; } } }, reset: true }
  ] },
  { id: 'three', name: 'THREE', steps: [
    { text: 'Make a three from beyond the arc', say: 'THE ARC IS THE LINE OF HONOR. SHOOT FROM BEHIND IT FOR THREE!', goal: 1, setup(L) { campPlace(0, 430, 230, true); L.bonus = .3; }, on: { basket(L, e) { if (e.slot === 0 && e.three) L.count++; } }, reset: true }
  ] },
  { id: 'dunk', name: 'DUNK', steps: [
    { text: 'Hold {turbo}, drive, press {shoot} inside the ring', say: 'DUNKS NEED TURBO! HOLD IT, GET INSIDE THE RING, AND PRESS SHOOT!', goal: 2, ring: true, setup(L) { campPlace(0, 380, 150, true); me().turbo = 1; }, on: { basket(L, e) { if (e.slot === 0 && e.dunk) L.count++; } }, reset: true }
  ] },
  { id: 'oop', name: 'ALLEY-OOP', steps: [
    { text: 'Press {oop} to lob to your cutting teammate', say: 'INTERN ONE WILL CUT TO THE RIM. WHEN IT GLOWS, PRESS ALLEY-OOP!', goal: 1, setup(L) { campPlace(0, 380, 200, true); campPlace(1, 330, 80); mate().turbo = 1; }, on: { alleyoop(L, e) { if (e.slot === 1) L.count++; } }, reset: true,
      ai(L, p, c) { if (p === mate()) { goTo(p, c, OX + 520, OY + 120, false); c.turboD = p.x < OX + 500; return c; } } },
    { text: 'Cut to the rim and press {oop} to call for one', say: 'YOUR TURN TO FLY! CUT TO THE RIM, HOLD TURBO, PRESS ALLEY-OOP TO CALL FOR IT!', goal: 1, setup(L) { campPlace(0, 330, 80); campPlace(1, 380, 210, true); me().turbo = 1; }, on: { alleyoop(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p === mate()) { if (p.has && p.order && p.order.kind === 'oop' && oopReady(p, me())) c.oopP = true; return c; } } }
  ] },
  { id: 'steal', name: 'STEAL & SPIN', steps: [
    { text: 'Swipe with {pass} to strip the dribbler (try its dribble side)', say: 'DEFENSE! GET CLOSE AND SWIPE WITH PASS. FROM THE SIDE OR BEHIND WORKS BEST.', goal: 1, setup(L) { campPlace(2, 320, 150, true); campPlace(0, 290, 150); campPlace(1, 120, 260); }, on: { steal(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2) { const t = game.time; c.mx = Math.sin(t * .8) * .3; c.my = Math.cos(t * .6) * .3; return c; } if (p.slot === 3 || p.slot === 1) return c; } },
    { text: 'With the ball, press {shove} to SPIN past the intern', say: 'SPIN MOVE! WITH THE BALL, PRESS SHOVE AND YOU SPIN. BREAK SOME ANKLES!', goal: 1, setup(L) { campPlace(0, 300, 150, true); campPlace(2, 330, 150); me().turbo = 1; }, on: { anklesBroken(L, e) { if (e.slot === 0) L.count++; }, spin(L, e) { if (e.slot === 0 && dist2(me().x, me().y, S.players[2].x, S.players[2].y) < 30) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2) { goTo(p, c, me().x + 22, me().y, false); return c; } if (p.slot === 3 || p.slot === 1) return c; } }
  ] },
  { id: 'block', name: 'BLOCK & SHOVE', steps: [
    { text: 'Jump with {shoot} to block the intern\'s jumper', say: 'BLOCKS! WHEN THE INTERN JUMPS, JUMP WITH SHOOT. TIMING IS EVERYTHING.', goal: 1, setup(L) { campPlace(2, 420, 150, true); campPlace(0, 400, 150); L.shotT = 1.4; }, on: { block(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c, dt) { if (p.slot === 2) { if (p.has && p.state === 'run') { L.shotT -= dt; if (L.shotT <= 0) { L.shotT = 2.5; c.shootP = true; c.shootD = true; } } else if (p.state === 'gather' || (p.state === 'air' && p.jump && !p.jump.released)) c.shootD = p.st < .32; return c; } if (p.slot === 3 || p.slot === 1) return c; },
      tick(L) { if (S.ball.state === 'loose' || S.ball.state === 'dead' || (S.ball.state === 'held' && S.ball.owner !== S.players[2])) { if (S.ball.z < 6 && !L.resetting) { L.resetting = true; game.after(.8, () => { L.resetting = false; campPlace(2, 420, 150, true); campPlace(0, 400, 150); }); } } } },
    { text: 'Press {shove} to shove the intern (it\'s legal!)', say: 'AND NOW: THE SHOVE. NO FOULS IN BASHKETBALL. PRESS SHOVE NEXT TO THE INTERN!', goal: 1, setup(L) { campPlace(2, 360, 150, true); campPlace(0, 330, 150); me().turbo = 1; }, on: { shove(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2 || p.slot === 3 || p.slot === 1) return c; } }
  ] },
  { id: 'rebound', name: 'REBOUND', steps: [
    { text: 'Grab the intern\'s miss: jump with {shoot} or run to it', say: 'REBOUNDS! THE INTERN WILL MISS. TRUST ME. GO GET IT!', goal: 1, setup(L) { campPlace(2, 470, 200, true); campPlace(0, 540, 150); L.shotT = 1; S.cheats.shots = null; }, on: { rebound(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c, dt) { if (p.slot === 2) { if (p.has && p.state === 'run') { L.shotT -= dt; if (L.shotT <= 0) { L.shotT = 3; L.forceMiss = true; c.shootP = true; c.shootD = true; } } else if (p.state === 'gather' || p.state === 'air') c.shootD = p.st < .31; return c; } if (p.slot === 3 || p.slot === 1) return c; } },
    { text: 'Shoot, jump for your miss with {shoot}, then {shoot} again: PUTBACK!', say: 'NOW THE PUTBACK: CATCH IT IN THE AIR UNDER THE RIM AND PRESS SHOOT AGAIN!', goal: 1, setup(L) { campPlace(0, 530, 160, true); L.bonus = -1; }, on: { dunk(L, e) { if (e.slot === 0 && e.putback) L.count++; } }, reset: true }
  ] },
  { id: 'nova', name: 'SUPERNOVA & THE RULES', steps: [
    { text: 'Score three in a row to go SUPERNOVA!', say: 'LAST LESSON! SCORE THREE IN A ROW AND YOU GO SUPERNOVA. THE INTERNS ARE... RELAXED.', goal: 1, init() { me().heat = 0; }, setup(L) { campPlace(0, 400, 150, true); L.bonus = .3; }, on: { supernovaOn(L, e) { if (e.slot === 0) L.count++; } }, reset: true,
      ai(L, p, c) { if (p.slot === 2 || p.slot === 3) { goTo(p, c, OX + 300 + p.slot * 10, OY + 40, false); return c; } } },
    { text: 'The rules: read the card, then {confirm}', say: 'YOU\'RE READY! REMEMBER THE RULES AND GO MAKE SOME NOISE!', goal: 1, card: true, setup(L) { L.cardT = 0; }, tick(L, dt) { L.cardT += dt; if (L.cardT > .6 && game.players.some(I => I.pressed('confirm'))) L.count++; } }
  ] }
];
const CAMP_RULES = ['NO FOULS: SHOVE, STEAL, BUMP. IT\'S ALL LEGAL.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'THE SHOT CLOCK IS 20 SECONDS.', 'DUNKS NEED TURBO.', 'NOBODY LEAVES THE COURT: THE WALLS KEEP IT IN.', 'THREE STRAIGHT = SUPERNOVA.'];
/* the lesson running in the match scene */
function startLesson(i, fromTour) {
  const L = CAMP_LESSONS[i], team = fromTour ? TOUR.team : (EXH.teams[0] && STREET_TEAMS.includes(EXH.teams[0]) ? EXH.teams[0] : 'hightops'), T = get('team', team);
  CAMPRUN.i = i; CAMPRUN.fromTour = fromTour; S.cheats = {};
  startMatchScene({ court: T.court, home: team, away: 'camp', lineups: [[T.players[0], 'intern1', T.players[1]], ['intern2', 'intern3', 'intern1']], humans: [[0, game.input]], quarterLen: 600, diff: [1, 0], powerups: false, twists: false, tipoff: false, mode: 'camp', seed: 3 + i },
    { fade: .2, noBreakCard: true, onEnd: () => {}, lesson: makeLessonRunner(L) });
}
const CAMPRUN = { i: 0, fromTour: false };
function makeLessonRunner(L) {
  const R = { L, step: 0, count: 0, niceT: 0, doneT: 0, t: 0, started: false, bonus: 0 };
  const offs = [];
  const st = () => L.steps[R.step];
  const begin = () => { const s = st(); if (!s) return; R.waiting = false; R.count = 0; R.bonus = 0; R.t = 0; R.niceT = 0; if (S.match) { S.match.practice = true; S.match.phase = 'live'; } for (const p of S.players) p.order = null; if (s.init) s.init(R); s.setup(R); R.bonus = R.bonus || 0; caption('deedee', s.say, 6); };
  R.update = dt => {
    const M = S.match; if (!M) return;
    if (!R.started) { R.started = true; M.practice = true; for (const [k, fn] of Object.entries(L.steps.reduce((a, s) => Object.assign(a, s.on || {}), {}))) offs.push(on(k, e => { const s = st(); if (s && s.on && s.on[k] && R.doneT <= 0) s.on[k](R, e); })); begin(); }
    M.phase = M.phase === 'dead' && R.doneT <= 0 ? 'dead' : M.phase; M.practice = true;
    if (L.steps[R.step] && L.steps[R.step].tick && R.doneT <= 0) L.steps[R.step].tick(R, dt);
    if (R.forceMiss && S.ball.state === 'shot' && S.ball.shot && S.ball.shot.shooter.slot === 2) { R.forceMiss = false; const sh = S.ball.shot; if (sh.made) { sh.made = false; const rim = RIMS[sh.rim]; const v = E.arc(S.ball, { x: rim.x - rim.side * 1, y: rim.y + 11, z: RIM_Z + 1 }, tune('ballGravity'), { apex: 20 }); S.ball.vx = v.vx; S.ball.vy = v.vy; S.ball.vz = v.vz; } }
    R.t += dt; R.niceT = Math.max(0, R.niceT - dt);
    // after a score or a dead ball, put the lesson back (no inbounds in camp)
    if (st() && st().reset && (M.phase === 'dead' || M.phase === 'inbound') && R.doneT <= 0) { if (!R.resetT) R.resetT = .9; R.resetT -= dt; if (R.resetT <= 0) { R.resetT = 0; M.phase = 'live'; st().setup(R); } }
    if (!R.waiting && R.count >= (st() ? st().goal : 1) && R.doneT <= 0) {
      R.niceT = 1.2; R.count = 0; R.waiting = true; sfx('code_ok'); banner('NICE!', 'JACKPOT', BANNER_COLORS.steal, { force: true });
      R.step++; if (R.step < L.steps.length) game.after(1.3, () => begin()); else { R.doneT = 2.4; if (!PROG.camp.includes(L.id)) { PROG.camp.push(L.id); saveProgress(); } caption('deedee', L.id === 'nova' ? 'YOU\'RE READY! GO GET \'EM!' : 'LESSON COMPLETE! ON TO THE NEXT!', 6); }
    }
    if (R.doneT > 0) { R.doneT -= dt; if (R.doneT <= 0) { offs.forEach(f => f()); finishLesson(); } }
  };
  R.ai = (p, c, dt, B) => { const s = st(); if (p.slot === 0) return null; if (s && s.ai) { const r = s.ai(R, p, c, dt, B); if (r) return r; } if (p.team === 1) { goTo(p, c, OX + 330 + (p.slot - 2) * 40, OY + 30, false); return c; } return null; };
  R.skip = () => { R.count = 99; };
  R.draw = (g, r) => {
    const s = st(), x = Math.round(r.W * .05), w = Math.round(r.W * .9);
    E.ui.box(g, x, 4, w, 34, { bg: ['#2a1650', '#140a28'], border: UIC.accent, alpha: .92 });
    E.font.text(g, 'BLAM CAMP • ' + (CAMPRUN.i + 1) + '. ' + L.name, x + 6, 7, UIC.accent, { outline: false });
    E.font.text(g, (s ? Math.min(R.count, s.goal) : 0) + ' / ' + (s ? s.goal : 1), x + w - 6, 7, UIC.gold, { align: 'right', outline: false });
    if (s) promptLine(g, s.text, x + w / 2, 21, { align: 'center' });
    if (s && s.card) { const cw = Math.min(r.W - 40, 300), cx = Math.round((r.W - cw) / 2); E.ui.box(g, cx, 46, cw, 100, { bg: ['#22163a', '#0e0820'], border: UIC.gold }); E.font.text(g, 'THE RULES', cx + cw / 2, 50, UIC.gold, { align: 'center', outline: false }); CAMP_RULES.forEach((l, i) => E.font.text(g, '• ' + l, cx + 8, 64 + i * 12, UIC.ink, { outline: false })); }
    if (!(ANN.cap && game.real < ANN.cap.until)) promptLine(g, '{pause} PAUSE: SKIP STEP, LESSON LIST', x + w / 2, r.H - 14, { align: 'center', color: UIC.muted });
  };
  R.world = r => {
    const s = st(); if (!s) return;
    for (const c of R.cones || []) r.queue(c.x, c.y, 0, g => { const [x, y] = r.w(c.x, c.y, 0); px.poly(g, [[x, y - 12], [x + 5, y], [x - 5, y]], c.hit ? '#5ae08a' : '#ff7a2a'); px.rect(g, x - 3, y - 7, 6, 2, '#ffffff'); });
    if (s.spot) { const [x, y] = sp(...s.spot); r.decal(() => r.groundRing(x, y, 14, UIC.gold, .8)); }
    if (s.ring) { const rim = attackRim(0), R2 = dunkRange(me()); r.decal(() => r.groundArc(rim.x, rim.y, R2 - 2, R2 + 1, PI / 2, PI * 1.5, '#5aff7a', .7)); }
    if (L.id === 'oop' && R.step === 0 && oopReady(me(), mate())) r.decal(() => r.groundRing(mate().x, mate().y, 12, '#5aff7a', .8));
  };
  return R;
}
function finishLesson() {
  const next = CAMPRUN.i + 1; S.lesson = null;
  if (next < CAMP_LESSONS.length && !CAMPRUN.single) startLesson(next, CAMPRUN.fromTour);
  else if (CAMPRUN.fromTour) gotoScreen('tourmap'); else gotoScreen('camp');
}
/* the lesson list */
S.menu.camp = { i: 0, rects: [] };
SC.camp = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { menuEnter('camp'); S.lesson = null; this.fromTour = !!(d && d.fromTour); if (this.fromTour) { CAMPRUN.single = false; startLesson(0, true); } },
  update(dt) {
    const nav = idleTick(dt, 'camp'); if (!nav) return; const st = S.menu.camp, items = CAMP_LESSONS.map(L => ({ label: L.name }));
    const r = listNav(st, items, nav); if (r.cancel) { gotoScreen('menu'); return; }
    if (r.picked >= 0) { consumeNav(); CAMPRUN.single = false; startLesson(r.picked, false); }
  },
  draw(r) {
    screenFrame(r, 'BLAM CAMP', ['{confirm} START LESSON', '{cancel} BACK']);
    r.overlay(g => {
      const st = S.menu.camp, x = Math.round(r.W * .06), w = Math.round(r.W * .5), h = 15, rows = CAMP_LESSONS.length;
      st.rects = CAMP_LESSONS.map((L, i) => drawButton(g, x, 30 + i * (h + 2), w, h, (i + 1) + '. ' + L.name + (PROG.camp.includes(L.id) ? '  ★' : ''), { focus: st.i === i, color: PROG.camp.includes(L.id) ? '#9affb0' : null }));
      const L = CAMP_LESSONS[st.i], px0 = x + w + 10, pw = Math.round(r.W * .94) - px0;
      E.ui.box(g, px0, 30, pw, rows * (h + 2) - 2, { bg: '#1e1434', border: UIC.line }); drawPortrait(g, 'deedee', px0 + pw / 2 - 18, 36, 36);
      L.steps.forEach((s, i) => wrapText(s.text.replace(/\{(\w+)\}/g, (m, a) => '[' + (CONTROL_NAMES[a] || a).toUpperCase() + ']'), pw - 12).slice(0, 2).forEach((l, k) => E.font.text(g, l, px0 + 6, 80 + i * 26 + k * 9, UIC.ink, { outline: false })));
    });
  }
};


/* ==== 45-attract.js ==== */
/* 45-attract: the attract mode (PLAN 13). Ten seconds without input on the title or a menu screen starts "CHANNEL BLAM
 * DEMO": five segments of real matches played by the CPU on both sides, cheating freely (infinite turbo, wide dunk
 * range, frequent power-ups) while a director forces the showcase plays, so every feature appears; between segments a
 * "TONIGHT ON CHANNEL BLAM" card; then the Hall of Blam and the logo; then it loops. Any input leaves, at once, back to
 * the screen it interrupted (its choices kept); on a touch-only device a tap shows the notice instead. */
const ATT_SEGS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [0, 0], quarter: 1, tipoff: true, label: 'TIP-OFF • TURBO DUNKS • ALLEY-OOP • JACKPOT SPOT',
    script: [[3, 'command', [0, 'dunk']], [9, 'give', 1], [9.1, 'command', [1, 'oop']], [16, 'twist', 'jackpot'], [17, 'give', 0], [17.2, 'make'], [17.3, 'command', [0, 'jumper']], [17.32, 'toSpot', 0], [24, 'give', 2], [24.1, 'command', [2, 'spin']], [29, 'command', [2, 'dunk']]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [18, 16], quarter: 2, label: 'SEA BREEZE • THREES • STEALS • POWER-UPS',
    script: [[1, 'give', 0], [1.2, 'command', [0, 'three']], [5, 'twist', 'gust'], [7, 'spawn', ['rocket', 1]], [8, 'spawn', ['laser', 0]], [11, 'give', 2], [11.2, 'command', [0, 'steal']], [17, 'give', 1], [17.1, 'command', [1, 'three']], [23, 'command', [1, 'dunk']]] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [27, 30], quarter: 3, label: 'SHOVES • BLAM BOMB • OIL SLICKS • BLOCKS • PUTBACK',
    script: [[1, 'give', 2], [1.5, 'grant', ['bomb', 0]], [1.6, 'command', [0, 'shove']], [9, 'slip', 3], [12, 'give', 1], [12.1, 'miss', 0], [12.2, 'command', [1, 'shoot']], [12.3, 'command', [0, 'putback']], [18, 'give', 2], [18.1, 'command', [2, 'shoot']], [18.2, 'command', [1, 'block']], [24, 'command', [0, 'shove']]] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [41, 39], quarter: 3, label: 'ERUPTIONS • VOLCANO LAUNCH • SHATTERED GLASS',
    script: [[2, 'give', 0], [6, 'twist', 'eruption'], [8, 'give', 0], [8.1, 'toVent', 0], [8.2, 'command', [0, 'vent']], [8.5, 'twist', 'vent'], [16, 'give', 1], [16.1, 'shatterNext'], [16.2, 'command', [1, 'dunk']], [27, 'give', 2], [27.1, 'command', [2, 'dunk']]] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [52, 51], quarter: 4, label: 'SUPERNOVA • OVERCLOCK • POSTERIZED • BLAM-QUAKE • REBOOT',
    script: [[1, 'give', 2], [4, 'nova', 2], [4.2, 'command', [2, 'dunk']], [11, 'overclock'], [12, 'give', 0], [12.1, 'poster', 0], [19, 'give', 1], [19.05, 'nearRim', 1], [19.1, 'command', [1, 'quake']], [26, 'twist', 'reboot'], [28, 'give', 3], [28.1, 'command', [3, 'dunk']]] }
];
const ATT_FEATURES = { dunk: 'TURBO DUNK!', alleyoop: 'ALLEY-OOP!', supernovaOn: 'SUPERNOVA!', shatter: 'SHATTERED GLASS!', steal: 'STEAL!', block: 'BLOCK!', shove: 'LEGAL SHOVE!', anklesBroken: 'SPIN MOVE!', jackpot: 'JACKPOT SPOT!',
  powerupPick: 'POWER-UP!', overclock: 'OVERCLOCK!', reboot: 'SYSTEM REBOOT!', posterized: 'POSTERIZED!', oilSlip: 'OIL SLICK!', bombHit: 'BLAM BOMB!', tipWin: 'TIP-OFF!' };
function startAttract(from) { S.attract = { from: from || 'title', seg: 0, t: 0, phase: 'card', cheat: true, feature: null, featureT: 0, notice: 0, seen: {} }; game.go('attract', null, { fade: .3 }); }
function attractSegment(i) {
  const A2 = S.attract, seg = ATT_SEGS[i];
  A2.seg = i; A2.t = 0; A2.phase = 'play'; A2.scriptI = 0;
  S.cheats = { fastPowerups: true };
  newMatch({ court: seg.court, home: seg.home, away: seg.away, quarterLen: 90, quarter: seg.quarter, clock: 60 + (i * 7) % 20, score: seg.score, diff: [2, 2], powerups: true, twists: true, tipoff: !!seg.tipoff, firstPoss: i % 2, mode: 'attract', seed: 101 + i * 13, noOT: true });
  S.mode = 'attract'; S.match.quarters = 4; cameraReset(); playMusic(get('court', seg.court).music); BREAK.open = false;
}
function attractAction(act, arg) {
  const pl = n => S.players[n], M = S.match;
  if (act === 'give') { const p = pl(arg); if (p && p.state !== 'dunk') { if (M.phase !== 'live') { M.phase = 'live'; for (const q of S.players) if (q.state === 'inbound') q.setState('run'); } p.setState('run'); p.z = 0; giveBall(p, 'director'); } }
  if (act === 'command') { const [n, kind] = arg, p = pl(n); if (!p) return; p.order = { kind, t: 5 }; if (kind === 'quake') p.forceQuake = true; if (kind === 'putback') { const rim = attackRim(p.team); p.x = rim.x - rim.side * 30; p.y = rim.y + 10; } }
  if (act === 'spawn') { const [id, n] = arg, p = pl(n); spawnPowerup(id, p.x + 24, p.y); }
  if (act === 'twist') forceTwist(arg);
  if (act === 'nova') novaOn(pl(arg));
  if (act === 'shatterNext') S.cheats.shatterNext = true;
  if (act === 'overclock') overclock();
  if (act === 'slip') { const p = pl(arg); if (p) { TWIST.oil = true; if (!TWIST.slicks.length) placeSlicks(); slipOnOil(p); } }
  if (act === 'miss') S.attract.nextMiss = true;
  if (act === 'make') S.attract.nextMake = true;
  if (act === 'toSpot') { const p = pl(arg), rim = attackRim(p.team); TWIST.jackpot = true; TWIST.spot = { rim: RIMS.indexOf(rim), x: rim.x - rim.side * 96, y: rim.y + 28, t: 20 }; p.x = TWIST.spot.x; p.y = TWIST.spot.y; p.vx = p.vy = 0; }
  if (act === 'grant') { const [id, n] = arg; grantPowerup(pl(n), id); }
  if (act === 'nearRim') { const p = pl(arg), rim = attackRim(p.team); p.x = rim.x - rim.side * 110; p.y = rim.y + 16; p.vx = p.vy = 0; for (const q of p.foes) if (dist2(q.x, q.y, rim.x, rim.y) < 60) { q.x -= rim.side * 80; } }
  if (act === 'toVent') { const p = pl(arg), rim = attackRim(p.team), v = TWIST.vents.find(q => (rim.side > 0 ? q.x > CMX : q.x < CMX)); if (p && v) { p.x = v.x - rim.side * 30; p.y = v.y; p.vx = p.vy = 0; } }
  if (act === 'poster') { const p = pl(arg), rim = attackRim(p.team), v = p.foes[0]; if (v) { v.x = rim.x - rim.side * 14; v.y = rim.y + 4; v.setState('run'); v.vx = v.vy = 0; } p.x = rim.x - rim.side * 90; p.y = rim.y + 20; p.order = { kind: 'dunk', t: 4 }; }
}
SC.attract = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [], matchScene: true,
  enter() { if (!S.attract) S.attract = { from: 'title', seg: 0, t: 0, phase: 'card', cheat: true, seen: {} }; S.attract.t = 0; S.attract.phase = 'card'; this.offs = this.offs || on('*', e => { const A2 = S.attract; if (!A2) return; const f = ATT_FEATURES[e.type]; if (f) { A2.feature = f; A2.featureT = 1.8; A2.seen[e.type] = (A2.seen[e.type] || 0) + 1; } }); },
  exit() { S.attract = null; S.cheats = {}; S.match = null; crowdTick(1, false); game.timeScale = 1; },
  update(dt) {
    const A2 = S.attract; if (!A2) return;
    // any input leaves (a touch-only device shows the notice instead)
    const nav = navInput(), moved = game.players.some(I => Math.hypot(...I.move()) > .3), pt = game.input.pointer();
    const mouseMoved = pt && A2.lastPt && Math.hypot(pt[0] - A2.lastPt[0], pt[1] - A2.lastPt[1]) > 4; A2.lastPt = pt || A2.lastPt;
    if (S.touchOnly) { if (nav.click) { if (A2.notice > 0 && A2.setRect && inRect(nav.click, A2.setRect)) game.menu('settings'); A2.notice = 4; } A2.notice = Math.max(0, A2.notice - dt); }
    else if (nav.any || nav.click || moved || mouseMoved) { const back = A2.from; consumeNav(); game.go(back, null, { fade: .15 }); return; }
    A2.t += dt; A2.featureT = Math.max(0, A2.featureT - dt);
    if (A2.phase === 'card') { if (A2.t > 2) attractSegment(A2.seg); return; }
    if (A2.phase === 'hall') { if (A2.t > 6) { A2.phase = 'logo'; A2.t = 0; } return; }
    if (A2.phase === 'logo') { if (A2.t > 4) { A2.seg = 0; A2.phase = 'card'; A2.t = 0; } return; }
    const seg = ATT_SEGS[A2.seg];
    while (A2.scriptI < seg.script.length && seg.script[A2.scriptI][0] <= A2.t) { const [, act, arg] = seg.script[A2.scriptI++]; try { attractAction(act, arg); } catch (e) { game.fail('attract ' + act, e); } }
    if (S.match.phase === 'break') { if (!BREAK.open) BREAK.show(S.match.breakKind); BREAK.update(dt); }
    else { matchStep(dt); }
    if (S.match.phase === 'over' || S.match.phase === 'break' && BREAK.t > 1) { if (S.match.phase === 'over') A2.t = seg.seconds; }
    bannerStep(dt); cameraStep(dt, 1 / 120); crowdTick(1 / 120, true);
    if (A2.t >= seg.seconds) { A2.t = 0; if (A2.seg + 1 < ATT_SEGS.length) { A2.seg++; A2.phase = 'card'; } else { A2.phase = 'hall'; playMusic('title'); } S.match = null; }
  },
  draw(r) {
    const A2 = S.attract; if (!A2) return;
    if (A2.phase === 'play' && S.match) { matchDraw(r); return; }
    screenFrame(r, null, null);
    r.overlay(g => {
      if (A2.phase === 'card') { const seg = ATT_SEGS[A2.seg]; E.font.title(g, 'TONIGHT ON', Math.round(r.W / 2), Math.round(r.H * .2), { align: 'center', scale: 2, colors: BANNER_COLORS.info }); E.font.title(g, 'CHANNEL BLAM', Math.round(r.W / 2), Math.round(r.H * .2) + 22, { align: 'center', scale: 3, colors: BANNER_COLORS.dunk }); E.font.text(g, get('team', seg.home).short + ' VS ' + get('team', seg.away).short + ' AT ' + get('court', seg.court).name, Math.round(r.W / 2), Math.round(r.H * .2) + 58, '#fff', { align: 'center', outline: '#000' }); wrapText(seg.label, r.W - 40).forEach((l, i) => E.font.text(g, l, Math.round(r.W / 2), Math.round(r.H * .2) + 74 + i * 10, UIC.gold, { align: 'center', outline: false })); }
      else if (A2.phase === 'hall') { E.font.title(g, 'HALL OF BLAM', Math.round(r.W / 2), 8, { align: 'center', scale: 2, colors: BANNER_COLORS.dunk }); drawHallTable(g, r, 34); }
      else drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .3));
      drawAttractOverlay(g, r);
    });
  }
};
function drawAttractOverlay(g, r) {
  const A2 = S.attract; if (!A2) return;
  E.ui.box(g, 4, 44, 112, 14, { bg: '#d02a2a', border: '#ffffff', gradient: false, alpha: .9 }); E.font.text(g, 'CHANNEL BLAM DEMO', 60, 47, '#ffffff', { align: 'center', outline: false });
  if (A2.featureT > 0 && A2.feature) { const w = E.font.width(A2.feature, { scale: 1 }) + 16; E.ui.box(g, 4, 60, w, 14, { bg: '#140c24', border: UIC.gold, alpha: .9 }); E.font.text(g, A2.feature, 4 + w / 2, 63, UIC.gold, { align: 'center', outline: false }); }
  if (S.touchOnly) { if (A2.notice > 0) { E.ui.box(g, Math.round(r.W / 2) - 110, Math.round(r.H * .4), 220, 56, { bg: '#140c24', border: UIC.gold }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', Math.round(r.W / 2), Math.round(r.H * .4) + 8, '#fff', { align: 'center', outline: false }); A2.setRect = drawButton(g, Math.round(r.W / 2) - 45, Math.round(r.H * .4) + 26, 90, 20, 'SETTINGS', { focus: true, center: true }); } }
  else if (Math.floor(game.real * 2) % 2) { const w = E.font.width('DEMO • PRESS ANY BUTTON') + 12; E.ui.box(g, r.W - w - 4, 44, w, 14, { bg: '#140c24', border: '#ffffff', gradient: false, alpha: .85 }); E.font.text(g, 'DEMO • PRESS ANY BUTTON', r.W - w / 2 - 4, 47, '#ffffff', { align: 'center', outline: false }); }
}


/* ==== 46-dev.js ==== */
/* 46-dev: dev mode (PLAN 14), reached from the pause menu's Dev Mode item (or #dev). The panel docks on the right of
 * the screen; while it has the focus the human slots are played by CPU brains so every change shows live. Tabs:
 * TUNING (every slider, live, with reset), CHEATS, MATCH, SCENES, DEBUG (overlays), TIME, CAMERA. Pad, keys and mouse
 * all work it (hover moves the focus, a click acts, the wheel turns a slider). Plus two bench scenes: #animlab (every
 * clip and dunk on any rig, slowed and scrubbed) and #shootaround (the rim's physics firing seeded shots). */
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
const DEV = { tab: 0, row: 0, group: 0, confirmReset: false, msg: '', msgT: 0, giveSlot: 0, puI: 0, twistI: 0, beatI: 0, segI: 0, lessonI: 0, courtI: 0, novaSlot: 0, swapSlot: 0 };
function openDev() { if (HUB) return; S.dev.open = true; DEV.row = 0; game.resume(); consumeNav(); }
function closeDev() { S.dev.open = false; devAutopilot(false); consumeNav(); }
/** while the panel is open the humans' players are driven by CPU brains; closing gives them back */
function devAutopilot(on) {
  for (const p of S.players || []) {
    if (on && p.source && p.source.kind === 'local') { p._local = p.source; p._human = p.human; p.source = cpuSource(); }
    if (!on && p._local) { p.source = p._local; p.human = p._human; p._local = null; }
  }
}
const devMsg = m => { DEV.msg = m; DEV.msgT = 2; };
const onOff = v => v ? 'ON' : 'OFF';
function devRows() {
  const M = S.match, rows = [];
  const R = (label, value, o = {}) => rows.push(Object.assign({ label, value }, o));
  const tab = DEV_TABS[DEV.tab];
  if (tab === 'TUNING') {
    const g = TUNE_GROUPS[DEV.group];
    R('← ' + g + ' →', '', { left: () => { DEV.group = (DEV.group + TUNE_GROUPS.length - 1) % TUNE_GROUPS.length; }, right: () => { DEV.group = (DEV.group + 1) % TUNE_GROUPS.length; }, help: 'Groups: ← → change the group' });
    for (const t of Object.values(TUNING).filter(t => t.group === g)) R(t.label, () => +t.v.toFixed(3) + (t.v !== t.def ? ' •' : ''), { slider: t, left: () => setTune(t.key, t.v - t.step), right: () => setTune(t.key, t.v + t.step), reset: () => resetTuning(t.key), help: t.help + ' (default ' + t.def + ')' });
    R('RESET ALL TO DEFAULTS', '', { act: () => { resetTuning(); devMsg('ALL SLIDERS RESET'); } });
    R('SAVE AS MY DEFAULTS', '', { act: () => { saveTuningDefaults(); devMsg('SAVED'); } });
    R('COPY AS JSON', '', { act: () => { const j = tuningJSON(); try { if (navigator.clipboard) navigator.clipboard.writeText(j); } catch (e) { game.fail('clipboard', e); } DEV.json = j; devMsg('COPIED ' + j.length + ' CHARACTERS'); } });
  } else if (tab === 'CHEATS') {
    const C = S.cheats, tog = (label, key, val = true) => R(label, () => onOff(C[key] === val || (val === true && !!C[key])), { act: () => { C[key] = C[key] === val ? null : val; } });
    tog('INFINITE TURBO: P1', 'infTurbo', 'p1'); tog('INFINITE TURBO: EVERYONE', 'infTurbo', 'all');
    tog('ALWAYS SUPERNOVA: HOME', 'novaHome'); tog('ALWAYS SUPERNOVA: AWAY', 'novaAway'); tog('CPU PASSIVE', 'cpuPassive');
    R('SHOTS', () => (C.shots || 'NORMAL').toUpperCase(), { act: () => { C.shots = C.shots === 'in' ? 'out' : C.shots === 'out' ? null : 'in'; } });
    tog('UNBLOCKABLE DUNKS', 'unblockable'); tog('ONE-SHOVE KNOCKDOWNS', 'oneShove'); tog('BIG HEADS', 'bigHeads'); tog('POWER-UPS EVERY 5 S', 'fastPowerups');
    R('TWISTS', () => onOff(TWIST.on), { act: () => { if (S.match) setupTwists(S.court, !TWIST.on); } });
    R('FREEZE GAME CLOCK', () => onOff(S.dev.freezeClock), { act: () => { S.dev.freezeClock = !S.dev.freezeClock; } });
    R('FREEZE SHOT CLOCK', () => onOff(S.dev.freezeShot), { act: () => { S.dev.freezeShot = !S.dev.freezeShot; } });
    R('UNLOCK EVERYTHING', () => onOff(S.dev.unlockAll), { act: () => { S.dev.unlockAll = true; PROG.unlocked = { bots: true, allstars: true, bigHeads: true }; saveProgress(); defineBigHeads(); devMsg('EVERYTHING UNLOCKED'); } });
    R(DEV.confirmReset ? 'REALLY RESET SAVE DATA?' : 'RESET SAVE DATA', '', { act: () => { if (!DEV.confirmReset) { DEV.confirmReset = true; return; } DEV.confirmReset = false; store.set('bb:progress', null); Object.assign(PROG, { tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: null, bestDunk: null, toursWon: 0 } }); devMsg('SAVE DATA RESET'); } });
  } else if (tab === 'MATCH') {
    if (!M) { R('NO MATCH RUNNING', ''); return rows; }
    R('HOME SCORE', () => M.score[0], { left: () => { M.score[0] = Math.max(0, M.score[0] - 1); }, right: () => { M.score[0]++; } });
    R('AWAY SCORE', () => M.score[1], { left: () => { M.score[1] = Math.max(0, M.score[1] - 1); }, right: () => { M.score[1]++; } });
    R('QUARTER', () => M.quarter, { left: () => { M.quarter = Math.max(1, M.quarter - 1); }, right: () => { M.quarter = Math.min(M.quarters, M.quarter + 1); } });
    R('CLOCK', () => mmss(M.clock), { left: () => { M.clock = Math.max(1, M.clock - 10); }, right: () => { M.clock += 10; } });
    R('SHOT CLOCK', () => Math.ceil(M.shot), { act: () => resetShotClock(), left: () => { M.shot = Math.max(1, M.shot - 5); }, right: () => resetShotClock() });
    R('GIVE BALL TO', () => S.players[DEV.giveSlot].name, { left: () => { DEV.giveSlot = (DEV.giveSlot + 3) % 4; }, right: () => { DEV.giveSlot = (DEV.giveSlot + 1) % 4; }, act: () => attractAction('give', DEV.giveSlot) });
    R('FORCE TIP-OFF', '', { act: () => startTipoff() });
    R('END THE QUARTER', '', { act: () => { M.clock = .01; } });
    R('END THE GAME: HOME WINS', '', { act: () => { M.score[0] = M.score[1] + 2; M.quarter = M.quarters; M.clock = .01; } });
    R('END THE GAME: HOME LOSES', '', { act: () => { M.score[1] = M.score[0] + 2; M.quarter = M.quarters; M.clock = .01; } });
    R('SUPERNOVA FOR', () => S.players[DEV.novaSlot].name, { left: () => { DEV.novaSlot = (DEV.novaSlot + 3) % 4; }, right: () => { DEV.novaSlot = (DEV.novaSlot + 1) % 4; }, act: () => novaOn(S.players[DEV.novaSlot]) });
    R('SHATTER NEXT DUNK', () => onOff(S.cheats.shatterNext), { act: () => { S.cheats.shatterNext = !S.cheats.shatterNext; } });
    R('SPAWN POWER-UP', () => get('powerup', PU_ORDER[DEV.puI]).name, { left: () => { DEV.puI = (DEV.puI + 5) % 6; }, right: () => { DEV.puI = (DEV.puI + 1) % 6; }, act: () => { const p = S.players[0]; spawnPowerup(PU_ORDER[DEV.puI], p.x + 24, p.y); } });
    R('PLACE JACKPOT SPOT', '', { act: () => forceTwist('jackpot') });
    const TW = ['gust', 'slicks', 'eruption', 'vent', 'overclock', 'reboot'];
    R('TRIGGER TWIST', () => TW[DEV.twistI].toUpperCase(), { left: () => { DEV.twistI = (DEV.twistI + TW.length - 1) % TW.length; }, right: () => { DEV.twistI = (DEV.twistI + 1) % TW.length; }, act: () => forceTwist(TW[DEV.twistI]) });
    R('SWAP TO CPU / BACK', () => S.players[DEV.swapSlot].name + ': ' + ((S.players[DEV.swapSlot]._local || S.players[DEV.swapSlot].source.kind === 'local') ? 'HUMAN' : 'CPU'), { left: () => { DEV.swapSlot = (DEV.swapSlot + 3) % 4; }, right: () => { DEV.swapSlot = (DEV.swapSlot + 1) % 4; }, act: () => { const p = S.players[DEV.swapSlot]; if (p._local) { p._local = null; p.human = null; } else if (p.source.kind === 'cpu' && p._swapped) { p.source = p._swapped; p.human = p._swHuman; p._swapped = null; } else if (p.source.kind === 'local') { p._swapped = p.source; p._swHuman = p.human; p.source = cpuSource(); p.human = null; } else { const I = game.input; p.source = localSource(I); p.human = 0; } } });
  } else if (tab === 'SCENES') {
    R('EXHIBITION AT', () => get('court', COURT_ORDER[DEV.courtI]).name, { left: () => { DEV.courtI = (DEV.courtI + 4) % 5; }, right: () => { DEV.courtI = (DEV.courtI + 1) % 5; }, act: () => devExhibition(COURT_ORDER[DEV.courtI]) });
    R('TOUR STOP', () => 'STOP ' + (DEV.stopI = DEV.stopI || 1), { left: () => { DEV.stopI = Math.max(1, (DEV.stopI || 1) - 1); }, right: () => { DEV.stopI = Math.min(4, (DEV.stopI || 1) + 1); }, act: () => devTourStop(DEV.stopI || 1) });
    R('STORY BEAT', () => BEAT_ORDER[DEV.beatI].toUpperCase(), { left: () => { DEV.beatI = (DEV.beatI + BEAT_ORDER.length - 1) % BEAT_ORDER.length; }, right: () => { DEV.beatI = (DEV.beatI + 1) % BEAT_ORDER.length; }, act: () => { closeDev(); setStop(); playBeats([BEAT_ORDER[DEV.beatI]], () => gotoScreen('menu')); } });
    R('CREDITS', '', { act: () => { closeDev(); gotoScreen('credits', {}); } });
    R('RESULTS', '', { act: () => { closeDev(); game.go('results', { res: S.match ? matchResult() : demoResult(), from: 'exhibition' }); } });
    R('ATTRACT MODE', () => 'SEGMENT ' + (DEV.segI + 1), { left: () => { DEV.segI = (DEV.segI + 4) % 5; }, right: () => { DEV.segI = (DEV.segI + 1) % 5; }, act: () => { closeDev(); startAttract('menu'); S.attract.seg = DEV.segI; } });
    R('BLAM CAMP LESSON', () => CAMP_LESSONS[DEV.lessonI].name, { left: () => { DEV.lessonI = (DEV.lessonI + 9) % 10; }, right: () => { DEV.lessonI = (DEV.lessonI + 1) % 10; }, act: () => { closeDev(); CAMPRUN.single = true; startLesson(DEV.lessonI, false); } });
    R('HUB CARD PREVIEW', '', { act: () => { closeDev(); game.go('hubcard', { preview: true }); } });
    R('ANIMATION LAB', '', { act: () => { closeDev(); game.go('animlab'); } });
    R('SHOOTAROUND (RIM PHYSICS)', '', { act: () => { closeDev(); game.go('shootaround'); } });
  } else if (tab === 'DEBUG') {
    const O = S.dev.overlays || (S.dev.overlays = {}), tog = (label, k) => R(label, () => onOff(O[k]), { act: () => { O[k] = !O[k]; } });
    tog('HITBOXES', 'hit'); tog('AI INTENTS', 'ai'); tog('SHOT CHANCE', 'shot'); tog('BALL PATH', 'path'); tog('TWIST AREAS', 'twist'); tog('EVENT LOG', 'log'); tog('STATE SNAPSHOT', 'snap');
  } else if (tab === 'TIME') {
    const SP = [.1, .25, .5, 1, 2];
    R('GAME SPEED', () => (S.dev.speed || 1) + 'x', { left: () => { const i = SP.indexOf(S.dev.speed || 1); S.dev.speed = SP[Math.max(0, i - 1)]; }, right: () => { const i = SP.indexOf(S.dev.speed || 1); S.dev.speed = SP[Math.min(SP.length - 1, i + 1)]; } });
    R('FREEZE', () => onOff(S.dev.frozen), { act: () => { S.dev.frozen = !S.dev.frozen; } });
    R('STEP ONE FRAME', '', { act: () => { if (S.dev.frozen) { S.dev.stepping = true; S.dev.stepN = 2; } } });
    R('SLOW MOTION ON DUNKS', () => onOff(tune('dunkSlowMo') < 1), { act: () => setTune('dunkSlowMo', tune('dunkSlowMo') < 1 ? 1 : TUNING.dunkSlowMo.def === 1 ? .45 : TUNING.dunkSlowMo.def) });
  } else if (tab === 'CAMERA') {
    R('VIEW', () => game.view.id === 'threequarter' ? 'HIGH' : 'BROADCAST', { act: () => game.settings.set('camera', game.settings.camera === 'high' ? 'broadcast' : 'high'), left: () => game.settings.set('camera', 'broadcast'), right: () => game.settings.set('camera', 'high') });
    R('ZOOM', () => CAM.zoomTo.toFixed(2), { left: () => { CAM.zoomTo = clamp(CAM.zoomTo - .1, .6, 2); }, right: () => { CAM.zoomTo = clamp(CAM.zoomTo + .1, .6, 2); } });
    R('FREE CAMERA', () => onOff(S.dev.freeCam), { act: () => { S.dev.freeCam = !S.dev.freeCam; } });
    R('RESET CAMERA', '', { act: () => { CAM.zoomTo = 1; S.dev.freeCam = false; game.settings.set('camera', 'broadcast'); } });
  }
  return rows;
}
function demoResult() { return { winner: 0, score: [52, 48], teams: ['hightops', 'breakers'], court: 'skybox', mvp: { id: 'volt', name: 'VOLT', team: 0, stats: { PTS: 24, REB: 5, AST: 3, STL: 2, BLK: 1, DNK: 7 } }, best: { what: 'FRONT-FLIP FREAK!', name: 'VOLT', pts: 380 }, box: S.players.length ? S.players.map(p => ({ slot: p.slot, id: p.def.id, name: p.name, team: p.team, human: p.human, stats: p.stats })) : [], style: [3200, 1800], starred: false, mode: 'exhibition' }; }
function devExhibition(court, o = {}) {
  closeDev(); const home = get('court', court).home, H = home === 'blambots' ? 'hightops' : home, A2 = H === 'breakers' ? 'crushers' : 'breakers';
  EXH.teams = [H, A2]; EXH.court = court; EXH.lineups = [get('team', H).players.slice(), get('team', A2).players.slice()]; EXH.seats = [{ side: 0, ready: true }];
  const opts = { court, home: H, away: A2, lineups: EXH.lineups, humans: [[0, game.input]], quarterLen: game.settings.quarterLen || 120, diff: [1, 1], powerups: true, twists: true, mode: 'exhibition' };
  EXH.lastOpts = opts; S.cheats = {};
  startMatchScene(opts, { fade: .2, openDev: !!o.panel, onEnd: res => game.go('results', { res, from: 'exhibition' }) });
}
function devTourStop(n) {
  closeDev(); TOUR.team = TOUR.team || 'hightops'; TOUR.stop = n - 1; TOUR.lineups = [get('team', TOUR.team).players.slice(), null]; TOUR.humans = 1; setStop(); gotoScreen('matchup', { tour: true });
}
/** the panel's step: navigation, sliders, actions; returns true while it has the focus */
function devUpdate() {
  if (!S.dev.open) return false;
  const nav = navInput(), rows = devRows(); DEV.msgT = Math.max(0, DEV.msgT - 1 / 120);
  if (S.dev.stepN > 0 && --S.dev.stepN === 0) S.dev.stepping = false;
  if (nav.tabL) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.row = 0; sfx('select'); }
  if (nav.tabR) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.row = 0; sfx('select'); }
  if (nav.up) DEV.row = (DEV.row + rows.length - 1) % rows.length; if (nav.down) DEV.row = (DEV.row + 1) % rows.length;
  if (DEV.rects && NAV.hover && nav.mouse) DEV.rects.forEach(([rc, i]) => { if (inRect(NAV.hover, rc)) DEV.row = i; });
  if (DEV.tabRects && nav.click) DEV.tabRects.forEach((rc, i) => { if (inRect(nav.click, rc)) { DEV.tab = i; DEV.row = 0; } });
  DEV.row = clamp(DEV.row, 0, rows.length - 1);
  const row = rows[DEV.row];
  if (row) {
    if (nav.left && row.left) row.left(); if (nav.right && row.right) row.right();
    const z = game.input.zoom(); if (z && z !== 1 && row.slider) { if (z > 1) row.right(); else row.left(); }
    if ((nav.confirm || (nav.click && DEV.rects && DEV.rects.some(([rc, i]) => i === DEV.row && inRect(nav.click, rc)))) && (row.act || row.right)) { (row.act || row.right)(); sfx('confirm'); }
    if (nav.alt && row.reset) { row.reset(); sfx('select'); }
  }
  if (nav.cancel || game.players.some(I => I.pressed('pause'))) closeDev();
  return true;
}
function devDraw(r) {
  r.overlay(g => {
    const x = Math.round(r.W * .62), w = r.W - x - 4, y = 44, h = r.H - y - 22, rows = devRows(), page = Math.floor(DEV.row / 8), shown = rows.slice(page * 8, page * 8 + 8);
    E.ui.box(g, x, y, w, h, { bg: ['#140c24', '#0a0614'], border: UIC.accent2, alpha: .94 });
    DEV.tabRects = [];
    DEV_TABS.forEach((t, i) => { const tw = Math.floor((w - 4) / DEV_TABS.length), tx = x + 2 + i * tw; DEV.tabRects.push([tx, y + 2, tw - 1, 10]); px.rect(g, tx, y + 2, tw - 1, 10, i === DEV.tab ? UIC.accent2 : '#2a2040'); E.font.text(g, t.slice(0, 4), tx + tw / 2, y + 3, i === DEV.tab ? '#0a0614' : UIC.ink, { align: 'center', font: 'tiny', outline: false }); });
    E.font.text(g, 'DEV • ' + DEV_TABS[DEV.tab] + (rows.length > 8 ? '  ' + (page + 1) + '/' + Math.ceil(rows.length / 8) : ''), x + 4, y + 15, UIC.accent2, { outline: false });
    DEV.rects = [];
    shown.forEach((row, k) => {
      const i = page * 8 + k, ry = y + 26 + k * 15, f = i === DEV.row, v = typeof row.value === 'function' ? row.value() : row.value;
      DEV.rects.push([[x + 2, ry - 2, w - 4, 14], i]);
      if (f) { px.rect(g, x + 2, ry - 2, w - 4, 14, '#3a2a5a'); px.rect(g, x + 2, ry - 2, 2, 14, UIC.gold); }
      E.font.text(g, row.label, x + 7, ry + 1, f ? '#fff' : UIC.ink, { outline: false });
      if (v !== '' && v !== undefined) E.font.text(g, String(v), x + w - 6, ry + 1, String(v).includes('•') ? UIC.gold : UIC.accent2, { align: 'right', outline: false });
      if (row.slider) { const t = row.slider, k2 = (t.v - t.min) / (t.max - t.min), kd = (t.def - t.min) / (t.max - t.min); px.rect(g, x + 7, ry + 10, w - 14, 1, '#3a2a5a'); px.rect(g, x + 7 + Math.round((w - 14) * kd), ry + 9, 1, 3, UIC.muted); px.rect(g, x + 6 + Math.round((w - 14) * k2), ry + 8, 3, 4, UIC.gold); }
    });
    const row = rows[DEV.row], help = DEV.msgT > 0 ? DEV.msg : row && row.help ? row.help : '';
    wrapText(help, w - 8).slice(0, 2).forEach((l, i) => E.font.text(g, l, x + 4, y + h - 22 + i * 9, DEV.msgT > 0 ? UIC.gold : UIC.muted, { outline: false }));
    promptLine(g, '{tabL}{tabR} TAB {confirm} DO {oop} RESET {cancel} CLOSE', x + w / 2, r.H - 14, { align: 'center' });
  });
}
/** debug overlays in the world */
function devOverlays(r) {
  const O = S.dev.overlays || {}, M = S.match; if (!M) return;
  if (O.hit) for (const p of S.players) r.queue(p.x, p.y, 1, g => { px.blend(g, .7, 'normal', () => { for (const pt of r.groundPts(p.x, p.y, 6, 12, p.z)) px.dot(g, pt[0], pt[1], '#5aff7a'); const sr = tune('stealReach') + .6 * p.r.swipe; for (const pt of r.groundPts(p.x, p.y, sr, 18, 0)) px.dot(g, pt[0], pt[1], '#ffd23a'); }); const h = handsAt(p), hp = r.w(h[0], h[1], h[2]); px.rect(g, hp[0] - 1, hp[1] - 1, 3, 3, '#ff3ca6'); }, { emissive: true });
  if (O.hit) r.queue(CMX, CMY, 100, g => { for (const rim of RIMS) for (const pt of r.groundPts(rim.x, rim.y, RIM_R, 16, RIM_Z)) px.dot(g, pt[0], pt[1], '#ff3a3a'); for (const X of BOARD_X) { const a = r.w(X, BOARD_Y[0], BOARD_Z[0]), b = r.w(X, BOARD_Y[1], BOARD_Z[1]); px.line(g, a[0], a[1], b[0], b[1], '#3ad0ff'); } const b = S.ball, bp = r.w(b.x, b.y, b.z); px.ell(g, bp[0], bp[1], 5, 5, '#ffffff'); }, { emissive: true });
  if (O.ai) for (const p of S.players) if (p.brain && p.source.kind === 'cpu') r.queue(p.x, p.y, 80, g => { const [x, y] = r.w(p.x, p.y, p.z + p.rig.o.size * 36 + 14); E.font.text(g, p.brain.label || '', Math.round(x), Math.round(y), '#7af0ff', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true });
  if (O.path && (S.ball.state === 'shot' || S.ball.state === 'loose')) r.queue(CMX, CMY, 100, g => { const b = Object.assign({}, S.ball); let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; for (let k = 0; k < 40; k++) { const h = 1 / 40; vz -= tune('ballGravity') * h; x += vx * h; y += vy * h; z += vz * h; if (z < BALL_R) break; const [sx, sy] = r.w(x, y, z); px.dot(g, sx, sy, k % 2 ? '#ffffff' : '#ffd23a'); } }, { emissive: true });
  if (O.twist) r.decal(() => { for (const s of TWIST.slicks) r.groundRing(s.x, s.y, s.r, '#ff3ca6', 1); for (const v of TWIST.vents) r.groundRing(v.x, v.y, 18, '#ffd23a', 1); for (const b of TWIST.bombs) r.groundRing(b.x, b.y, 22, '#ff3a3a', 1); if (TWIST.spot) r.groundRing(TWIST.spot.x, TWIST.spot.y, 16, '#5aff7a', 1); });
  r.overlay(g => {
    let y = 46;
    if (O.shot) { const h = S.ball.owner; if (h) { const c = shotChance(h); E.font.text(g, h.name + ' SHOT: ' + Math.round(c.p * 100) + '%' + (c.three ? ' (3)' : ''), 6, y, '#7af0ff', { outline: '#000' }); y += 9; } const L2 = S.lastShot; if (L2) { E.font.text(g, 'LAST: ' + L2.name + ' ' + Math.round(L2.chance * 100) + '% ' + L2.d + 'u ' + (L2.release || '') + ' ' + (L2.made ? 'MADE' : 'MISS'), 6, y, UIC.muted, { font: 'tiny', outline: '#000' }); y += 8; } }
    if (O.log) { S.events.slice(-10).forEach((e, i) => E.font.text(g, e.type, 6, y + i * 7, UIC.ink, { font: 'tiny', outline: '#000' })); y += 72; }
    if (O.snap) { const s = JSON.stringify(game.debug.snapshot()); wrapText(s, Math.round(r.W * .55), { font: 'tiny' }).slice(0, 10).forEach((l, i) => E.font.text(g, l, 6, y + i * 7, '#9affb0', { font: 'tiny', outline: '#000' })); }
  });
}
/* ---- the animation lab: every clip and dunk on any rig ---- */
const LAB = { clipI: 0, playerI: 0, speed: 1, t: 0, frozen: false, rig: null };
const LAB_ITEMS = () => Object.keys(CLIPS).map(k => ['clip', k]).concat(DUNK_ORDER.map(k => ['dunk', k])).concat([['dribble', 'dribble']]);
SC.animlab = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('camp'); setupArena('skybox'); LAB.t = 0; this.mk(); },
  exit() { game.setZoom(1); },
  mk() { const ids = all('player').map(p => p.id); const d = get('player', ids[LAB.playerI % ids.length]); LAB.rig = dressPlayer(d, d.team); LAB.def = d; LAB.dribble = { ph: 0, side: 1, cross: 0 }; },
  update(dt) {
    const nav = navInput(), items = LAB_ITEMS();
    if (nav.left) { LAB.clipI = (LAB.clipI + items.length - 1) % items.length; LAB.t = 0; } if (nav.right) { LAB.clipI = (LAB.clipI + 1) % items.length; LAB.t = 0; }
    if (nav.up || nav.down) { LAB.playerI += nav.up ? -1 + all('player').length : 1; this.mk(); }
    if (nav.confirm) LAB.speed = LAB.speed === 1 ? .25 : 1; if (nav.alt) LAB.frozen = !LAB.frozen; if (nav.tabR && LAB.frozen) LAB.t += 1 / 30;
    if (nav.cancel) { gotoScreen('menu'); return; }
    const k = dt * LAB.speed * (LAB.frozen ? 0 : 1); LAB.t += k; updateArena(dt);
    const [kind, id] = items[LAB.clipI], rig = LAB.rig, x = OX + 300, y = CMY;
    let z = 0, facing = 0, flip = 0, P = null;
    if (kind === 'clip') P = CLIPS[id](LAB.t % 1.4, { u: (LAB.t % 1) , released: LAB.t % 1.4 > .6, swat: (LAB.t % 1) < .15 ? 1 : 0 });
    else if (kind === 'dunk') { const def = get('dunk', id), T = 1.1, u = (LAB.t % (T + .5)) / T; P = dunkKeys(def, Math.min(1, u)); z = Math.sin(Math.min(1, u) * PI) * 40; if (def.spin) facing = -TAU * def.spin * E.ease.inOutSine(clamp((u - def.spinU[0]) / (def.spinU[1] - def.spinU[0]), 0, 1)); if (def.flip) { const kk = clamp((u - def.flipU[0]) / (def.flipU[1] - def.flipU[0]), 0, 1); flip = kk > 0 && kk < 1 ? kk : 0; } }
    else { const fake = { dribble: LAB.dribble, rig, vx: 0, vy: 0, turboOn: false, z: 0, x, y, foes: [] }; P = dribblePose(fake, k); }
    rig.bb.pose = P; rig.bb.w = 1; rig.update(k, { x, y, z, facing, flip, air: z > 3 });
    LAB.ballAt = P && P.ball ? ballAnchor({ rig }, P) : null; game.focus(x, y, 30); game.cam.offset = [0, 0]; game.setZoom(2.2);
  },
  draw(r) {
    drawArena(r); const rig = LAB.rig; r.shadow(rig.x, rig.y, 7, .4); r.actor(rig.x, rig.y, rig.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    if (LAB.ballAt) r.sprite(LAB.ballAt[0], LAB.ballAt[1], LAB.ballAt[2] - BALL_R, BALL_SPR[0], { anchor: 'bottom' });
    r.overlay(g => { rig.debug && rig.debug(r); const [kind, id] = LAB_ITEMS()[LAB.clipI]; E.font.text(g, 'ANIMATION LAB • ' + LAB.def.name + ' • ' + kind.toUpperCase() + ': ' + id + ' • ' + LAB.speed + 'x' + (LAB.frozen ? ' FROZEN' : ''), 6, 6, '#fff', { outline: '#000' }); promptBar(g, r, ['{left}{right} CLIP', '{up}{down} PLAYER', '{confirm} SPEED', '{oop} FREEZE', '{tabR} STEP', '{cancel} BACK']); });
  }
};
/* ---- the shootaround: seeded shots from random spots, flown by the rim's physics; made against decided ---- */
const SHOOT = { n: 0, made: 0, decided: 0, wrong: 0, t: 0, shooter: null };
SC.shootaround = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter() { menuEnter('camp'); newMatch({ court: 'skybox', home: 'hightops', away: 'breakers', quarterLen: 600, tipoff: false, powerups: false, twists: false, mode: 'bench', seed: 77 }); S.match.practice = true; for (const p of S.players) { p.x = OX - 40; p.y = OY - 20; } Object.assign(SHOOT, { n: 0, made: 0, decided: 0, wrong: 0, t: 0, shooter: S.players[0] }); this.fire(); },
  fire() {
    const p = SHOOT.shooter, rim = attackRim(0), a = (S.rng() - .5) * 2.6, d = 30 + S.rng() * 220, b = S.ball;
    p.x = clamp(rim.x - Math.cos(a) * d, OX + 4, OX + CW - 4); p.y = clamp(rim.y + Math.sin(a) * d, OY + 4, OY + CH - 4); p.z = 0;
    b.x = p.x; b.y = p.y; b.z = 58; b.state = 'held'; b.owner = p; b.scored = false; SHOOT.wantMade = S.rng() < .5;
    launchShot(p, { p: SHOOT.wantMade ? 1 : 0, three: isThree(p.x, p.y, rim) }, {}); SHOOT.t = 0; SHOOT.counted = false; SHOOT.n++; if (SHOOT.wantMade) SHOOT.decided++;
  },
  update(dt) {
    const nav = navInput(); if (nav.cancel) { gotoScreen('menu'); return; }
    S.match.phase = 'live'; ballPhysics(dt); updateArena(dt); SHOOT.t += dt;
    if (S.ball.scored && !SHOOT.counted) { SHOOT.counted = true; SHOOT.made++; if (!SHOOT.wantMade) SHOOT.wrong++; }
    if (SHOOT.t > 2.2 || (S.ball.z <= BALL_R + .1 && SHOOT.t > .6)) { if (SHOOT.wantMade && !SHOOT.counted) SHOOT.wrong++; this.fire(); }
    game.focus(OX + CW - 160, CMY, 0); game.cam.offset = [0, 0];
  },
  draw(r) { drawArena(r); drawBall(r); r.overlay(g => { E.font.text(g, 'SHOOTAROUND • RIM PHYSICS BENCH', 6, 6, '#fff', { outline: '#000' }); E.font.text(g, 'SHOTS ' + SHOOT.n + '  DECIDED MAKES ' + SHOOT.decided + '  WENT IN ' + SHOOT.made + '  DISAGREE ' + SHOOT.wrong, 6, 16, UIC.gold, { outline: '#000' }); promptBar(g, r, ['{cancel} BACK']); }); }
};


/* ==== 50-hub.js ==== */
/* 50-hub: AI Hub sessions (Protocol v1, PLAN 15), "HUB SHOWDOWN". Straight into the round: our own card (the court,
 * both teams lined up, the hub's names over the players they control, ready marks, how to win, this device's controls,
 * the countdown), then two halves of 1:30 in one shared world run by the host. Seats 0 and 2 play for HOME, 1 and 3 for
 * AWAY; empty slots are CPU. Clients send their inputs (stick, held buttons, and each press and release once, by id,
 * repeated in the next messages so a lost packet loses nothing) 15 times a second; the host sends snapshots 15 times a
 * second; clients draw the world 100 ms in the past, predict their own player's running and play each event once. A
 * leaver's player turns CPU; the host finishes the round at the final horn or at time-up. Outside a session the game
 * is untouched. */
const NET = { info: null, role: 'local', mySlot: -1, seatSlot: {}, slotSeat: {}, names: {}, colors: {}, sendT: 0, seq: 0, edgeId: 0, edges: [], lastHeld: 0, inputs: {}, snaps: [], lastSnapAt: 0,
  played: new Set(), card: null, started: false, startAt: 0, ended: false, finished: false, hostLeft: false, sent: 0, rateT: 0, rate: 0, left: new Set(), roster: null, graceMs: 0, endReason: null };
const BITS = { shoot: 1, pass: 2, turbo: 4, shove: 8, oop: 16, taunt: 32 };
const NET_EVENTS = ['basket', 'dunk', 'dunkStart', 'block', 'steal', 'shove', 'knockdown', 'posterized', 'shatter', 'supernovaOn', 'supernovaOff', 'powerupSpawn', 'powerupPick', 'jackpot', 'twist', 'overclock', 'reboot', 'alleyoop', 'rim', 'quarterEnd', 'gameEnd', 'tipWin', 'anklesBroken', 'airball', 'goaltend', 'shotClockViolation', 'halftime', 'clutch', 'suddenBlam', 'oilSlip', 'bombHit'];
const STATES = ['run', 'gather', 'air', 'dunk', 'hang', 'knock', 'getup', 'spin', 'steal', 'shove', 'stumble', 'frozen', 'cele', 'taunt', 'inbound', 'idle'];
const BSTATES = ['held', 'pass', 'shot', 'loose', 'dead', 'dunk'], PHASES = ['tipoff', 'live', 'buzzer', 'dead', 'inbound', 'sponsor', 'break', 'over'], JKINDS = ['shot', 'layup', 'block', 'rebound', 'tip', 'drop'];
/** the roster: two different street crews from the hub's shared random stream; the court is HOME's */
function hubRoster() { const R = AIHub.rng('roster'), a = Math.floor(R() * 4); let b = Math.floor(R() * 3); if (b >= a) b++; return { home: STREET_TEAMS[a], away: STREET_TEAMS[b], seed: Math.floor(R() * 1e9) }; }
function seatToSlot(i) { return [0, 2, 1, 3][i]; }
async function hubBoot() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { game.fail('hub connect', e); }
  if (!info) { HUB_OFF(); return; }
  NET.info = info; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; S.net.role = NET.role; S.net.seat = info.me;
  info.players.forEach((pl, i) => { const slot = seatToSlot(i); NET.seatSlot[pl.id] = slot; NET.slotSeat[slot] = pl.id; NET.names[slot] = String(pl.name || ('P' + (i + 1))).slice(0, 12).toUpperCase(); NET.colors[slot] = pl.color; });
  NET.mySlot = info.server ? -1 : NET.seatSlot[info.me];
  NET.roster = hubRoster();
  AIHub.on('card', c => { NET.card = c; });
  AIHub.on('start', () => { NET.started = true; });
  AIHub.on('message', (data, from) => hubMessage(data, from));
  AIHub.on('leave', e => hubLeave(e));
  AIHub.on('time-up', e => { NET.graceMs = e && e.graceMs; if (NET.role !== 'client') hubFinish(); });
  AIHub.on('end', e => { NET.ended = true; NET.endReason = e && e.reason; A.music(null); crowdStop(); for (const I of game.players) I.clear(); });
  game.go('hubcard', null, { fade: 0 });
  AIHub.ready();
}
/** a session that turned out not to be one (connect gave null): the game as it is on its own */
let HUB_OFF = () => {};
function hubMatchOpts() {
  const R = NET.roster, humans = [];
  if (NET.mySlot >= 0) humans.push([NET.mySlot, game.input]);
  return { court: get('team', R.home).court, home: R.home, away: R.away, quarterLen: 90, quarters: 2, halfLen: true, diff: [1, 1], powerups: true, twists: true, tipoff: true, mode: 'hub', seed: R.seed, humans };
}
/** the match in a session: host and server run it; clients mirror it */
function hubStartMatch() {
  const o = hubMatchOpts(); S.cheats = {};
  game.go('match', { match: o }, { fade: 0 });   // (matchEnter calls hubAssignSources once the match exists)
}
/** each hub player's slot: the host reads remote seats from the network (NetSource); every copy tags the humans */
function hubAssignSources() {
  for (const [slot, seat] of Object.entries(NET.slotSeat)) {
    const p = S.players[+slot]; if (!p) continue;
    p.human = [0, 2, 1, 3].indexOf(+slot);   // the seat's number: P1-P4 tags in the seat order
    if (+slot !== NET.mySlot && NET.role !== 'client') p.source = netSource(+seat);
  }
}
/* ---- inputs: client -> host ---- */
function heldBits(I) { let h = 0; for (const a in BITS) if (I.down(a)) h |= BITS[a]; return h; }
function hubCollectInput() {
  const I = game.input, h = heldBits(I);
  for (const a in BITS) { const b = BITS[a]; if ((h & b) !== (NET.lastHeld & b)) NET.edges.push([++NET.edgeId, b, h & b ? 1 : 0]); }
  NET.lastHeld = h; if (NET.edges.length > 8) NET.edges = NET.edges.slice(-8);
}
function hubSendInput() {
  const m = game.input.move(), d = game.view.screenDirToGround(m[0], m[1]);
  hubSend({ t: 'i', s: ++NET.seq, a: Math.round(AIHub.time()), m: [Math.round(d[0] * 64), Math.round(d[1] * 64)], h: NET.lastHeld, e: NET.edges.slice(-8) }, false);
}
function hubSend(data, reliable) { if (NET.ended) return; NET.sent++; try { AIHub.send(data, { reliable: !!reliable }); } catch (e) { game.fail('hub send', e); } }
/** a remote seat's player on the host: the stick and held bits, and each edge applied once, in order */
function netSource(seat) {
  const st = NET.inputs[seat] || (NET.inputs[seat] = { m: [0, 0], h: 0, last: 0, pending: [] });
  return { kind: 'net', seat, read() {
    const c = blankCmd(); let pressed = 0, released = 0;
    for (const [, bit, d] of st.pending) { if (d) pressed |= bit; else released |= bit; }
    st.pending = [];
    c.mx = st.m[0] / 64; c.my = st.m[1] / 64;
    c.shootD = !!(st.h & BITS.shoot) || (!!(pressed & BITS.shoot) && !(released & BITS.shoot));
    c.shootP = !!(pressed & BITS.shoot); c.shootR = !!(released & BITS.shoot); c.turboD = !!(st.h & BITS.turbo);
    c.passP = !!(pressed & BITS.pass); c.shoveP = !!(pressed & BITS.shove); c.oopP = !!(pressed & BITS.oop);
    return c;
  } };
}
/* ---- snapshots: host -> all ---- */
const r1 = v => Math.round(v);
function hubSnapshot() {
  const M = S.match, b = S.ball; if (!M) return null;
  const flags = (M.sudden ? 1 : 0) | (M.gold[0] ? 2 : 0) | (M.gold[1] ? 4 : 0) | (ARENA.hoops[0] && !ARENA.hoops[0].glass ? 8 : 0) | (ARENA.hoops[1] && !ARENA.hoops[1].glass ? 16 : 0) | (TWIST.windOn ? 32 : 0);
  const now = M.gameT, ev = S.events.filter(e => NET_EVENTS.includes(e.type) && now - e.t < 1).slice(-6).map(e => [e.eid, NET_EVENTS.indexOf(e.type), e.slot === undefined ? -1 : e.slot, e.vslot === undefined ? -1 : e.vslot, e.pts || 0, e.dunk ? DUNK_ORDER.indexOf(e.dunk) : e.id ? PU_ORDER.indexOf(e.id) : -1]);
  const pl = S.players.map(p => [r1(p.x), r1(p.y), r1(p.z), r1(p.vx), r1(p.vy), r1(p.facing * 100), STATES.indexOf(p.state), r1(p.st * 100), r1(p.turbo * 100),
    (p.nova > 0 ? 1 : 0) | (p.overclock > 0 ? 2 : 0) | (p.pu ? (PU_ORDER.indexOf(p.pu.id) + 1) << 2 : 0) | (p.dizzy > 0 ? 32 : 0) | (p.heat << 6), p.state === 'air' && p.jump ? JKINDS.indexOf(p.jump.kind) : p.state === 'dunk' && p.dunk ? DUNK_ORDER.indexOf(p.dunk.def.id) : -1,
    p.state === 'dunk' && p.dunk ? r1(p.dunk.t / p.dunk.T * 100) : p.jump && p.jump.released ? 1 : 0, p.def.id === S.teams[p.team].lineup[0] ? 0 : 1]);
  const w = [r1(TWIST.windX * 100), r1(TWIST.windY * 100), TWIST.spot ? r1(TWIST.spot.x) : 0, TWIST.spot ? r1(TWIST.spot.y) : 0, TWIST.vents.map(v => v.puff > 0 ? 2 : v.pre > 0 ? 1 : 0).join(''),
    POWERUPS.floor.map(u => [PU_ORDER.indexOf(u.id), r1(u.x), r1(u.y)]), TWIST.bombs.filter(x => x.t >= 0 && !x.hit).map(x => [r1(x.x), r1(x.y), r1(x.t * 10)])];
  return { t: 's', n: ++NET.seq, a: Math.round(AIHub.time()), g: [PHASES.indexOf(M.phase), M.quarter, r1(M.clock * 10), r1(M.shot * 10), M.score[0], M.score[1], M.poss, flags, r1(M.phaseT * 10), M.breakKind === 'half' ? 1 : 0],
    b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), b.owner ? b.owner.slot : -1, BSTATES.indexOf(b.state)], p: pl, w, ev };
}
function hubMessage(data, from) {
  if (!data || typeof data !== 'object') return;
  if (data.t === 'i' && NET.role !== 'client') {
    const seat = from, st = NET.inputs[seat] || (NET.inputs[seat] = { m: [0, 0], h: 0, last: 0, pending: [] });
    if (data.s < (st.seq || 0)) return; st.seq = data.s; st.m = data.m || [0, 0]; st.h = data.h | 0;
    for (const e of data.e || []) if (e[0] > st.last) { st.last = e[0]; st.pending.push(e); }
  } else if (data.t === 's' && NET.role === 'client') {
    if (data.n <= (NET.lastN || 0)) return; NET.lastN = data.n; data.at = game.real; NET.snaps.push(data); if (NET.snaps.length > 6) NET.snaps.shift(); NET.lastSnapAt = game.real;
  } else if (data.t === 'k' && NET.role === 'client') { TWIST.slicks = (data.s || []).map(([x, y, r]) => ({ x, y, r, ph: 0 })); TWIST.oil = TWIST.slicks.length > 0; }
  else if (data.t === 'over' && NET.role === 'client') { NET.over = data; }
}
/** a client applies the snapshot of 100 ms ago, interpolating, and plays new events once */
function hubApplySnapshots(dt) {
  const L2 = NET.snaps; if (!L2.length || !S.match) return;
  const target = game.real - .1; let a = L2[0], b = L2[L2.length - 1];
  for (let i = 0; i < L2.length - 1; i++) if (L2[i].at <= target && L2[i + 1].at >= target) { a = L2[i]; b = L2[i + 1]; break; }
  const k = b.at > a.at ? clamp((target - a.at) / (b.at - a.at), 0, 1) : 1, M = S.match, G = b.g;
  M.phase = PHASES[G[0]] || 'live'; M.quarter = G[1]; M.clock = G[2] / 10; M.shot = G[3] / 10; M.score = [G[4], G[5]]; M.poss = G[6]; M.phaseT = G[8] / 10; M.sudden = !!(G[7] & 1); M.gold = [!!(G[7] & 2), !!(G[7] & 4)];
  if (M.phase === 'break') M.breakKind = G[9] ? 'half' : 'quarter';
  for (const i of [0, 1]) if (ARENA.hoops[i]) ARENA.hoops[i].glass = !(G[7] & (i ? 16 : 8));
  S.players.forEach((p, i) => {
    const pa = a.p[i], pb = b.p[i]; if (!pa || !pb) return;
    const lx = lerp(pa[0], pb[0], k), ly = lerp(pa[1], pb[1], k), lz = lerp(pa[2], pb[2], k), st = STATES[pb[6]] || 'run';
    if (p.slot === NET.mySlot && st === 'run' && p.state === 'run') { const d = dist2(p.x, p.y, lx, ly); if (d > 48) { p.x = lx; p.y = ly; } else { p.x = lerp(p.x, lx, .15); p.y = lerp(p.y, ly, .15); } }
    else { p.x = lx; p.y = ly; p.vx = pb[3]; p.vy = pb[4]; }
    p.z = lz; p.facing = E.lerpAng ? E.lerpAng(pa[5] / 100, pb[5] / 100, k) : pb[5] / 100; p.turbo = pb[8] / 100;
    if (p.state !== st) { p.state = st; } p.st = pb[7] / 100;
    p.nova = pb[9] & 1 ? 1 : 0; p.overclock = pb[9] & 2 ? 1 : 0; const pu = (pb[9] >> 2) & 7; p.pu = pu ? { id: PU_ORDER[pu - 1], t: 9 } : null; p.dizzy = pb[9] & 32 ? 1 : 0; p.heat = (pb[9] >> 6) & 3;
    if (st === 'air') { p.jump = p.jump || { kind: 'shot', tried: new Set() }; p.jump.kind = JKINDS[pb[10]] || 'drop'; p.jump.released = !!pb[11]; }
    if (st === 'dunk') { const def = get('dunk', DUNK_ORDER[pb[10]] || 'hammer'); p.dunk = { def, t: pb[11] / 100, T: 1, slammed: false }; }
    if (st === 'knock') p.kdT = Math.max(p.kdT || .8, p.st + .2);
  });
  const ba = a.b, bb = b.b, ball = S.ball;
  ball.x = lerp(ba[0], bb[0], k); ball.y = lerp(ba[1], bb[1], k); ball.z = lerp(ba[2], bb[2], k); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5];
  ball.state = BSTATES[bb[7]] || 'loose'; ball.owner = bb[6] >= 0 ? S.players[bb[6]] : null; ball.roll += Math.hypot(ball.vx, ball.vy) * dt;
  ball.trail.push([ball.x, ball.y, ball.z]); if (ball.trail.length > 8) ball.trail.shift();
  const W = b.w; TWIST.windX = W[0] / 100; TWIST.windY = W[1] / 100; TWIST.windOn = !!(G[7] & 32);
  if (TWIST.spot && W[2]) { TWIST.spot.x = W[2]; TWIST.spot.y = W[3]; }
  String(W[4] || '').split('').forEach((c, i) => { const v = TWIST.vents[i]; if (v) { v.puff = c === '2' ? 1 : 0; v.pre = c === '1' ? .5 : 0; } });
  POWERUPS.floor = (W[5] || []).map(([c, x, y]) => ({ id: PU_ORDER[c] || 'rocket', x, y, t: 5, born: 1 }));
  TWIST.bombs = (W[6] || []).map(([x, y, t]) => ({ x, y, t: t / 10, warn: 1.2, hit: false }));
  for (const e of b.ev) if (!NET.played.has(e[0])) { NET.played.add(e[0]); const type = NET_EVENTS[e[1]], p = S.players[e[2]], v = S.players[e[3]];
    const data = { slot: e[2], vslot: e[3], name: p ? p.name : '', victim: v ? v.name : '', pts: e[4], net: true };
    if (type === 'dunk' || type === 'dunkStart') { const def = get('dunk', DUNK_ORDER[e[5]] || 'hammer'); Object.assign(data, { dunk: def.id, banner: def.banner, lines: def.lines, bonus: def.bonus, x: p ? attackRim(p.team).x : CMX, y: CMY, z: RIM_Z, T: .8, apexT: .4 }); }
    if (type === 'powerupPick' || type === 'powerupSpawn') { data.id = PU_ORDER[e[5]] || 'rocket'; data.x = p ? p.x : CMX; data.y = p ? p.y : CMY; }
    if (type === 'basket') { data.team = p ? p.team : 0; data.kind = 'jumper'; data.three = e[4] === 3; }
    if (type === 'supernovaOn' || type === 'supernovaOff' || type === 'jackpot') data.team = p ? p.team : 0;
    if (type === 'twist') data.kind = 'gust';
    if (type === 'gameEnd') data.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    if (type === 'shatter') { data.x = BOARD_X[0]; data.y = CMY; data.z = 86; }
    try { emit(type, data); } catch (err) { game.fail('net event', err); }
  }
  if (NET.played.size > 400) NET.played = new Set([...NET.played].slice(-200));
}
/** the client's own player runs at once on its own stick (blended toward the host above) */
function hubPredict(dt) { const p = S.players[NET.mySlot]; if (!p || p.state !== 'run') return; const c = localSource(game.input).read(p); p.cmd = c; locomote(p, c, dt); p.x += p.vx * dt; p.y += p.vy * dt; clampToArena(p); }
function hubLeave(e) {
  const id = e && e.id; NET.left.add(id);
  if (NET.info && id === NET.info.host) { NET.hostLeft = true; return; }
  const slot = NET.seatSlot[id]; if (slot === undefined || !S.players[slot]) return;
  const p = S.players[slot]; if (NET.role !== 'client') { p.source = cpuSource(); } p.human = null; delete NET.slotSeat[slot];
}
/** the host finishes the round once: standings, scores, stats, awards */
function hubFinish() {
  if (NET.finished || !NET.info || NET.role === 'client') return; NET.finished = true;
  const M = S.match, sc = M ? M.score : [0, 0], w = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1, ids = NET.info.players.map(p => p.id).filter(id => !NET.left.has(id));
  const team = id => S.players[NET.seatSlot[id]] ? S.players[NET.seatSlot[id]].team : 0;
  const standings = w < 0 ? [ids] : [ids.filter(id => team(id) === w), ids.filter(id => team(id) !== w)].filter(a => a.length);
  const scores = {}, stats = {}; for (const id of ids) { const p = S.players[NET.seatSlot[id]]; scores[id] = sc[team(id)]; if (p) stats[id] = { PTS: p.stats.PTS, DUNKS: p.stats.DNK, STL: p.stats.STL, BLK: p.stats.BLK }; }
  const best = (k, title, detail) => { const id = ids.slice().sort((a, b) => (stats[b] ? stats[b][k] : 0) - (stats[a] ? stats[a][k] : 0))[0]; return id !== undefined && stats[id] && stats[id][k] > 0 ? { id, title, detail: detail + ': ' + stats[id][k] } : null; };
  const awards = [best('DUNKS', 'Dunk of the Round', 'Dunks'), best('STL', 'Pickpocket', 'Steals'), best('BLK', 'Wall', 'Blocks')].filter(Boolean);
  const out = { standings, scores, stats, awards }; if (ids.length === 1) out.won = w === team(ids[0]);
  if (M && M.phase !== 'over') { M.phase = 'over'; M.phaseT = 0; M.winner = w; }
  hubSend({ t: 'over', score: sc }, true);
  try { AIHub.finish(out); } catch (e) { game.fail('hub finish', e); }
}
/** each step of a session match */
function hubStep(dt) {
  if (NET.ended) return true;
  NET.rateT += dt; if (NET.rateT >= 1) { NET.rate = NET.sent / NET.rateT; NET.sent = 0; NET.rateT = 0; }
  if (NET.role === 'client') {
    hubCollectInput(); NET.sendT += dt; if (NET.sendT >= .066) { NET.sendT = 0; hubSendInput(); }
    hubApplySnapshots(dt); hubPredict(dt); animAll(dt); updateArena(dt, TWIST.windOn ? TWIST.windX : 0); bannerStep(dt); cameraStep(dt, 1 / 120); crowdTick(1 / 120, true);
    return true;
  }
  // host or server: the world runs; a snapshot 15 times a second; the tip-off waits for the hub's clock
  if (!NET.started || AIHub.time() < 0) { if (S.match) { S.match.phaseT = 0; } animAll(dt); return true; }
  NET.sendT += dt; if (NET.sendT >= .066) { NET.sendT = 0; const s = hubSnapshot(); if (s) hubSend(s, false); }
  if (TWIST.oil && !NET.sentSlicks) { NET.sentSlicks = true; hubSend({ t: 'k', s: TWIST.slicks.map(s => [r1(s.x), r1(s.y), r1(s.r)]) }, true); }
  if (S.match && S.match.phase === 'over' && S.match.phaseT > 1.5) hubFinish();
  return false;
}
/* ---- our own card ---- */
SC.hubcard = {
  view: 'broadcast', input: KEYS, res: 'ps1', touch: [],
  enter(d) { this.preview = !!(d && d.preview); playMusic('menu'); const R = this.preview ? { home: 'hightops', away: 'breakers' } : NET.roster; setupArena(get('team', R.home).court); this.rigs = [R.home, R.away].map((tid, team) => get('team', tid).players.slice(0, 2).map((pid, k) => ({ team, k, slot: team * 2 + k, rig: dressPlayer(get('player', pid), tid) }))).flat(); this.R = R; this.t = 0; },
  update(dt) {
    this.t += dt; updateArena(dt); game.focus(CMX, CMY, 0); game.cam.offset = [0, Math.round(game.H * .08)];
    for (const a of this.rigs) a.rig.update(dt, { x: CMX + (a.team ? 1 : -1) * (40 + a.k * 44), y: CMY + (a.k ? 30 : -10), z: 0, facing: a.team ? PI : 0, pose: 'hips' });
    const nav = navInput(), I = game.input;
    if (this.preview) { if (nav.cancel || nav.confirm) gotoScreen('menu'); return; }
    if (NET.started) { hubStartMatch(); return; }
    if (nav.confirm || (nav.click && this.readyRect && inRect(nav.click, this.readyRect))) { try { AIHub.answer('ready'); } catch (e) { game.fail('hub answer', e); } sfx('confirm'); }
    if (I.pressed('oop') || I.pressed('more') || (nav.click && this.moreRect && inRect(nav.click, this.moreRect))) { try { AIHub.answer('more'); } catch (e) { game.fail('hub answer', e); } sfx('select'); }
  },
  draw(r) {
    drawArena(r);
    for (const a of this.rigs) { const x = CMX + (a.team ? 1 : -1) * (40 + a.k * 44), y = CMY + (a.k ? 30 : -10); r.shadow(x, y, 7, .4); r.actor(x, y, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
      const name = this.preview ? (a.slot === 0 ? 'YOU' : 'CPU') : NET.names[a.slot] || 'CPU', col = this.preview ? (a.slot === 0 ? '#e8443a' : '#9a8fb8') : NET.colors[a.slot] || '#9a8fb8';
      r.queue(x, y, 70, g => { const [sx, sy] = r.w(x, y, 66); E.font.text(g, name, Math.round(sx), Math.round(sy) - 8, col, { align: 'center', outline: '#000' }); const id = NET.slotSeat[a.slot]; if (NET.card && NET.card.ready && NET.card.ready.includes(id)) E.font.text(g, 'READY ★', Math.round(sx), Math.round(sy) + 1, '#5aff7a', { align: 'center', outline: '#000' }); }, { emissive: true }); }
    r.overlay(g => {
      const cx = Math.round(r.W / 2), R = this.R; px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, r.W, 52, '#1a0c2a'));
      drawLogo(g, r, cx - 6, 4, 2);
      E.font.text(g, 'HUB SHOWDOWN: ' + get('team', R.home).short + ' VS ' + get('team', R.away).short, cx, 36, '#fff', { align: 'center', outline: '#000' });
      E.font.text(g, 'OUTSCORE THE OTHER CREW OVER TWO HALVES. NO FOULS!', cx, 46, UIC.gold, { align: 'center', outline: '#000' });
      const C = NET.card, left = C && C.left !== null && C.left !== undefined ? Math.ceil(C.left / 1000) : null;
      E.font.text(g, C && C.paused ? 'PAUSED: SOMEONE WANTS MORE TIME' : C && C.starting ? 'STARTING!' : left !== null ? 'TIP-OFF IN ' + left : this.preview ? 'CARD PREVIEW' : 'WAITING FOR PLAYERS', cx, r.H - 70, '#fff', { align: 'center', scale: 1, outline: '#000' });
      promptLine(g, '{move} MOVE {shoot} SHOOT {pass} PASS {turbo} TURBO {shove} SHOVE {oop} OOP', cx, r.H - 56, { align: 'center' });
      this.readyRect = drawButton(g, cx - 104, r.H - 42, 100, 20, 'READY', { focus: true, center: true });
      this.moreRect = drawButton(g, cx + 4, r.H - 42, 100, 20, C && C.asked ? 'MORE TIME ★' : 'MORE TIME', { center: true });
      promptLine(g, '{confirm} READY    {oop} / T MORE TIME', cx, r.H - 16, { align: 'center' });
    });
  }
};
/** the small session overlay (Options or Esc): volumes and button symbols, never pausing the world */
const HUBMENU = { open: false, i: 0, rects: [] };
function hubMenuUpdate() {
  const I = game.input; if (!HUB) return false;
  if (I.pressed('pause') && !I.held.has('Pad8')) { HUBMENU.open = !HUBMENU.open; consumeNav(); return true; }
  if (!HUBMENU.open) return false;
  const nav = navInput(), items = HUBMENU_ITEMS(), r = listNav(HUBMENU, items, nav);
  const it = items[HUBMENU.i];
  if (nav.left || nav.right) { const d = nav.left ? -.1 : .1; if (it.key === 'volume') game.settings.set('volume', clamp((game.settings.volume || .7) + d, 0, 1)); if (it.key === 'voiceVol') game.settings.set('voiceVol', clamp((game.settings.voiceVol || .8) + d, 0, 1)); if (it.key === 'glyphs') game.settings.set('glyphs', glyphStyle() === 'xbox' ? 'playstation' : 'xbox'); }
  if (r.picked >= 0 && it.key === 'close' || r.cancel) HUBMENU.open = false;
  if (r.picked >= 0 && it.key === 'glyphs') game.settings.set('glyphs', glyphStyle() === 'xbox' ? 'playstation' : 'xbox');
  return true;
}
const HUBMENU_ITEMS = () => [{ key: 'volume', label: 'SOUND ← ' + Math.round((game.settings.volume === undefined ? .7 : game.settings.volume) * 10) + ' →' }, { key: 'voiceVol', label: 'VOICES ← ' + Math.round((game.settings.voiceVol === undefined ? .8 : game.settings.voiceVol) * 10) + ' →' }, { key: 'glyphs', label: 'BUTTONS: ' + (glyphStyle() === 'xbox' ? 'XBOX' : 'PLAYSTATION') }, { key: 'close', label: 'CLOSE' }];
function hubOverlay(g, r) {
  if (NET.role === 'server') { E.font.text(g, 'HOSTING', Math.round(r.W / 2), Math.round(r.H / 2), '#fff', { align: 'center', scale: 2, outline: '#000' }); return; }
  if (NET.hostLeft) { E.ui.box(g, Math.round(r.W / 2) - 70, Math.round(r.H * .4), 140, 24, { bg: '#3a0a0a', border: '#ff5a3a' }); E.font.text(g, 'HOST LEFT', Math.round(r.W / 2), Math.round(r.H * .4) + 8, '#fff', { align: 'center', outline: false }); }
  else if (NET.role === 'client' && NET.started && game.real - NET.lastSnapAt > 1 && !NET.ended) E.font.text(g, 'WAITING FOR HOST', Math.round(r.W / 2), Math.round(r.H * .4), '#fff', { align: 'center', outline: '#000' });
  if (NET.started && AIHub.time() < 0) E.font.title(g, String(Math.ceil(-AIHub.time() / 1000)), Math.round(r.W / 2), Math.round(r.H * .3), { align: 'center', scale: 4, colors: BANNER_COLORS.dunk });
  if (NET.ended) { E.ui.box(g, Math.round(r.W / 2) - 90, Math.round(r.H * .64), 180, 30, { bg: '#140c24', border: UIC.gold }); E.font.text(g, 'ROUND OVER  ' + S.match.score[0] + ' - ' + S.match.score[1], Math.round(r.W / 2), Math.round(r.H * .64) + 11, '#fff', { align: 'center', outline: false }); }
  if (HUBMENU.open) { const x = Math.round(r.W / 2) - 70; E.ui.box(g, x - 6, 50, 152, 100, { bg: '#140c24', border: UIC.gold }); HUBMENU.rects = HUBMENU_ITEMS().map((it, i) => drawButton(g, x, 56 + i * 22, 140, 18, it.label, { focus: HUBMENU.i === i })); }
}


/* ==== 90-start.js ==== */
/* 90-start: the scene table, the pause menu's items, the themed Shell, boot steps, touch-only detection, deep links,
 * game.debug (the tests' and tools' handle) and the start. */
SC.match = { matchScene: true, pausable: !HUB, view: 'broadcast', input: KEYS, res: 'ps1', touch: [], camera: { zoom: [.8, 1.4] }, enter: matchEnter, update: matchUpdate, draw: matchDraw,
  exit() { S.lesson = null; crowdTick(1, false); game.timeScale = 1; S.dev.open = false; devAutopilot(false); game.setView('broadcast'); game.setZoom(1); } };
SC.hubwait = { view: 'broadcast', input: KEYS, res: 'ps1', touch: [], update() {}, draw(r) { r.sky(['#05040a', '#140a24']); r.overlay(g => drawLogo(g, r, Math.round(r.W / 2), Math.round(r.H * .35), 3)); } };
/** the pause menu's own items for where the player is */
function pauseItems() {
  const items = [['How to Play', () => game.shell && game.shell.show('help', HOW_TO_PLAY_HELP())]];
  const sc = game.sceneName;
  if (sc === 'match' && S.match && (S.mode === 'exhibition' || S.mode === 'tour')) items.push(['Restart Game', () => { game.resume(); if (S.mode === 'tour') startTourMatch(); else startMatchScene(Object.assign({}, EXH.lastOpts), { onEnd: res => { noteRecords(res); game.go('results', { res, from: 'exhibition' }); } }); }]);
  if (sc === 'match' && S.lesson) { items.push(['Skip Step', () => { game.resume(); S.lesson.skip(); }]); items.push(['Lesson List', () => { game.resume(); S.lesson = null; gotoScreen('camp'); }]); }
  if (sc === 'story') items.push(['Skip Cutscene', () => { game.resume(); skipCutscene(); }]);
  if (!HUB) items.push(['Dev Mode', () => { if (sc === 'match' && S.match) openDev(); else { game.resume(); devExhibition(EXH.court || 'skybox', { panel: true }); } }]);
  return items;
}
const HOW_TO_PLAY_HELP = () => ({
  keys: HOW_ROWS.map(([a, t]) => [a === 'move' ? (game.input.lastDevice === 'gamepad' ? 'Left stick' : 'WASD') : game.input.label(a), t.charAt(0) + t.slice(1).toLowerCase()]),
  sections: [['Rules', 'Two on two, four quarters. No fouls: shoving and stealing are legal. Threes from beyond the arc. Dunks need turbo. 20-second shot clock. Goaltending counts for the shooter.'],
    ['Supernova', 'Score three in a row with nobody answering and you go SUPERNOVA: unlimited turbo, hotter shots, glass-shattering dunks.'],
    ['Twists', COURT_ORDER.map(c => get('court', c).name + ': ' + TWIST_INFO[get('court', c).twist][0]).join(' • ')]]
});
/* ---- touch-only devices: no touch controls; "Controller or keyboard required" and the settings button ---- */
function detectTouchOnly() {
  if (typeof navigator === 'undefined') return false;
  const mm = q => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; } };
  let pads = false; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { pads = false; }
  return (navigator.maxTouchPoints || 0) > 0 && !mm('(any-pointer: fine)') && !mm('(any-hover: hover)') && !pads;
}
function setupTouchOnly() {
  S.touchOnly = detectTouchOnly(); game.input.touchEnabled = false;
  if (typeof addEventListener === 'function') {
    const off = () => { if (S.touchOnly) { S.touchOnly = false; } };
    addEventListener('gamepadconnected', off); addEventListener('keydown', off);
  }
}
/* ---- the debug handle for tests and tools ---- */
game.debug = {
  snapshot() {
    const M = S.match, b = S.ball;
    return { scene: game.sceneName, mode: S.mode, court: S.court, phase: M && M.phase, quarter: M && M.quarter, clock: M && +M.clock.toFixed(2), shotClock: M && +M.shot.toFixed(2), score: M && M.score.slice(), possession: M && M.poss,
      ball: b && { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.state, owner: b.owner ? b.owner.slot : -1 },
      players: (S.players || []).map(p => ({ slot: p.slot, id: p.def.id, team: p.team, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: p.isNova(), powerup: p.pu && p.pu.id, source: p.source && p.source.kind, human: p.human })),
      lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, focus: (S.menu.main || {}).i }, attract: S.attract && { segment: S.attract.seg, phase: S.attract.phase }, net: { role: S.net.role, seat: S.net.seat, rtt: S.net.rtt }, touchOnly: S.touchOnly, dev: S.dev.open };
  },
  teleport(slot, x, y) { const p = S.players[slot]; if (p) { p.x = x; p.y = y; p.vx = p.vy = 0; } },
  give(slot) { attractAction('give', slot); },
  setScore(a, b) { if (S.match) S.match.score = [a, b]; },
  setClock(s) { if (S.match) S.match.clock = s; },
  setQuarter(q) { if (S.match) S.match.quarter = q; },
  force(name, args) { if (name === 'twist') forceTwist(args); else if (name === 'nova') novaOn(S.players[args]); else if (name === 'overclock') overclock(); else if (name === 'tipoff') startTipoff(); else if (name === 'shatterNext') S.cheats.shatterNext = true; },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  spawnPowerup(id, x, y) { return spawnPowerup(id, x, y); },
  cheat(name, on) { S.cheats[name] = on; },
  tune(key, v) { setTune(key, v); return tune(key); }
};
/* ---- deep links: #title, #attract, #exhibition/<court>/<home>-<away>, #tour/<stop>, #story/<beat>, #camp/<lesson>, #results,
 * #credits, #about, #dev, #animlab, #shootaround, #menu, #hubcard and the menu screens by name ---- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), [a, b, c] = h.split('/');
  if (!a) return false;
  if (a === 'exhibition') { const [hm, aw] = (c || 'hightops-breakers').split('-'); const court = get('court', b) ? b : 'skybox'; EXH.teams = [get('team', hm) ? hm : 'hightops', get('team', aw) ? aw : 'breakers']; EXH.court = court; EXH.lineups = EXH.teams.map(t => get('team', t).players.slice()); EXH.seats = [{ side: 0, ready: true }]; const o = { court, home: EXH.teams[0], away: EXH.teams[1], lineups: EXH.lineups, humans: [[0, game.input]], quarterLen: game.settings.quarterLen || 120, diff: [1, 1], powerups: true, twists: true, mode: 'exhibition' }; EXH.lastOpts = o; startMatchScene(o, { fade: 0, onEnd: res => game.go('results', { res, from: 'exhibition' }) }); return true; }
  if (a === 'dev') { devExhibition(b && get('court', b) ? b : 'skybox', { panel: true }); return true; }
  if (a === 'tour') { TOUR.team = c && STREET_TEAMS.includes(c) ? c : 'hightops'; TOUR.stop = clamp((+b || 1) - 1, 0, 3); TOUR.lineups = [get('team', TOUR.team).players.slice(), null]; TOUR.humans = 1; setStop(); game.go('tourmap', null, { fade: 0 }); return true; }
  if (a === 'story') { TOUR.team = TOUR.team || 'hightops'; setStop(); playBeats([get('beat', b) ? b : 'prologue'], () => game.go('menu')); return true; }
  if (a === 'camp') { const i = CAMP_LESSONS.findIndex(L => L.id === b); if (i >= 0) { CAMPRUN.single = true; startLesson(i, false); } else game.go('camp', null, { fade: 0 }); return true; }
  if (a === 'results') { game.go('results', { res: demoResult(), from: 'exhibition' }, { fade: 0 }); return true; }
  if (a === 'credits') { game.go('credits', {}, { fade: 0 }); return true; }
  if (a === 'attract') { startAttract('title'); if (b) S.attract.seg = clamp(+b - 1, 0, 4); return true; }
  if (a === 'hubcard') { game.go('hubcard', { preview: true }, { fade: 0 }); return true; }
  if (SC[a]) { game.go(a, a === 'teams' || a === 'lineup' ? {} : null, { fade: 0 }); return true; }
  return false;
}
/* ---- boot ---- */
function bootSteps() {
  return [
    ['Lacing up', () => { loadProgress(); loadTuning(); defineBigHeads(); applyGlyphs(game.settings.glyphs || 'playstation'); }],
    ['Painting the courts', () => { for (const id of COURT_ORDER) courtMap(id); }],
    ['Warming up the announcers', () => { wireFx(); setupTouchOnly(); }],
    ['Opening the doors', () => {
      if (HUB) { for (const sp of GAME_SETTINGS) if (!game.settings.spec(sp.key)) game.settings.define(sp); }
      else {
        new E.Shell(game, { theme: { ink: '#fff7ec', paper: '#140c24', accent: '#ff3ca6', muted: '#9a8fb8', danger: '#ff5a3a', line: '#3a2a5a', font: '700 1rem/1.35 "Trebuchet MS", system-ui, sans-serif', titleFont: '900 1.6rem/1 Impact, "Arial Black", system-ui' } });
        // the menus' HTML is sized in pixels: scale it with the screen so it reads on a TV at ten feet
        const fit = () => { const root = game.shell && game.shell.root; if (root && typeof innerHeight === 'number') root.style.zoom = String(clamp(innerHeight / 560, 1, 2.6)); };
        if (typeof addEventListener === 'function') addEventListener('resize', fit); fit();
      }
    }]
  ];
}
HUB_OFF = () => { game.go('title', null, { fade: 0 }); };
const SCENES = SC;
game.start({ scenes: SCENES, scene: HUB ? 'hubwait' : 'title', boot: { title: 'BASHKETBALL', version: VERSION, steps: bootSteps() } });
if (game.booted && game.booted.then) game.booted.then(() => { if (HUB) hubBoot().catch(e => { try { AIHub.fail(String(e && e.message || e)); } catch (err) { game.fail('hub fail', err); } }); else deepLink(); });
else if (HUB) hubBoot(); else deepLink();
window.__bb = { S, game, TUNING, emit, on, debug: game.debug, newMatch, setTune, tune, resetTuning, startMatchScene, matchResult, planSyllables, CODES, LINES, LINE_RANK, MINOR_BANKS, REG, get, all, NET, TOUR, PROG, CAMP_LESSONS, startLesson, startAttract, ATT_SEGS, SC, glyphFor, promptWidth, ARENA, TWIST, POWERUPS, CAB,
  STATES, launchShot, isThree, RIMS, OX, OY, CW, CH, CMX, CMY, onBasket, giveBall, attractAction, forceTwist, spawnPowerup, grantPowerup, dunkRange, chooseDunk, startDunk, SONGS, STINGS, SFX, VOICE_PROFILES, beatLines, BEAT_ORDER, NEW_SHAPES, hubSnapshot, hubMessage, netSource, hubFinish, hubStartMatch, openDev, closeDev, devRows, DEV, EXH, MU, applyCodes, setStop, playBeats, STORY, TALK, tourAfterMatch, finishTour, substitute, nextPeriod, BREAK, shotChance, knockDown, CONTROL_NAMES, KEYS, detectTouchOnly, setupTouchOnly, IDLE, NAV, deepLink,
  ballPhysics, startShove, startSteal, stealHit, startSpin, startLayup, startShot, passBall, alleyOop, oopReady, novaOn, novaOff, shatterGlass, setupInbound, quarterEnd, startTipoff,
  LOGOS, FLOORS, CLIPS, DUNK_ORDER, PU_ORDER, CAST, matchStep, playerStep, jumpUp, blockCheck, slipOnOil, overclock, onSlick, placeSlicks, endPowerup, COURT_ORDER, STREET_TEAMS, GAME_SETTINGS,
  TWIST_INFO, HALFTIME_GAGS, attackRim, defendRim, BALL_R, RIM_Z, RIM_R, THREE_R, BOARD_X, Voice, ANN, announce, caption, BANNERS, MAPS, courtMap, crowdReact, dribblePose, ballAnchor, handsAt, toLocal,
  CAMPRUN, saveProgress, loadProgress, continueTour, beginTour, startTourMatch, hubBoot, hubStep, hubApplySnapshots, BITS, HUBMENU, playMusic, sting, musicLayer, sfx, startCele, VERSION, fill, CREDITS_ROLL, ABOUT_PAGES, SECRETS_TEXT, glyphStyle, applyGlyphs, drawGlyph, aiThink, DEV_TABS, LAB, LAB_ITEMS };


})();
