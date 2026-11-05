/* BASKETBLAM: no fouls, no mercy, all BLAM. Built on my-3D2dge. */
(() => {
'use strict';
/* ---- 00-core.js ---- */
/* CORE: the engine alias, court geometry, the game, the input preset, the shared state S, the event bus, registries,
 * random streams and the tuning store (every important number, each a live dev slider). */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const VERSION = '1.0.0';
const HUB = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);

/* ---- court geometry (world units; one tile = 16; z up). The court runs left to right; HOME attacks the right hoop ---- */
const X0 = 64, X1 = 704, Y0 = 112, Y1 = 400, XM = 384, YM = 256, CW = 640, CH = 288;
const RIM_Z = 80, RIM_R = 9, TUBE = 1.2, BALL_R = 4.5;
const HOOPS = [{ x: X0 + 52, y: YM, board: X0 + 40, dir: 1 }, { x: X1 - 52, y: YM, board: X1 - 40, dir: -1 }];   // dir: toward the court
const BOARD = { y0: YM - 24, y1: YM + 24, z0: 72, z1: 100 };
const THREE_R = 136, CORNER_Y = 20, CORNER_X = 108, KEY_W = 48, KEY_L = 152;
const WALL = 24;   // invisible walls this far outside the lines
const attackHoop = team => HOOPS[team === 0 ? 1 : 0];
const defendHoop = team => HOOPS[team === 0 ? 0 : 1];
/** is a takeoff point beyond the three-point line of the hoop h? */
function isThree(x, y, h) {
  const cy = y - Y0, local = h === HOOPS[0] ? x - X0 : X1 - x;
  if (local < CORNER_X) return cy < CORNER_Y || cy > CH - CORNER_Y;
  return Math.hypot(x - h.x, y - h.y) > THREE_R;
}

/* ---- the camera views: a side-on broadcast camera (pitch 30) and the engine's high three-quarter view ---- */
const BROADCAST = E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);   // registered so setView('broadcast') finds it
const HIGH = 'threequarter';

/* ---- the controls: four main buttons plus turbo and taunt; Space and the left mouse button shoot ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'],
  shove: ['KeyQ', 'KeyL', 'Pad1'], oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'],
  devPrev: ['BracketLeft', 'PageUp', 'Pad4'], devNext: ['BracketRight', 'PageDown', 'Pad5']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
const CONTROL_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt', devPrev: false, devNext: false };
const ACTIONS = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];

/* ---- the shared state ---- */
const S = {
  scene: 'boot', mode: 'exhibition', court: null, match: null, players: [], ball: null, cheats: {}, menu: {}, progress: null,
  rng: E.rng(1), fxRng: E.rng(2), events: [], eventId: 0, devOpen: false, touchOnly: false, lastInput: 0, net: null
};
const store = {
  get: (k, d) => HUB ? (S._mem && k in S._mem ? S._mem[k] : d) : E.store.get(k, d),
  set: (k, v) => { if (HUB) { S._mem = S._mem || {}; S._mem[k] = v; } else E.store.set(k, v); }
};

/* ---- events: emit(type, data) / on(type, fn); every event is logged (debug, the attract director, the net) ---- */
const LISTENERS = {};
function on(type, fn) { (LISTENERS[type] = LISTENERS[type] || []).push(fn); return () => { const l = LISTENERS[type]; l.splice(l.indexOf(fn), 1); }; }
function emit(type, data = {}) {
  data.type = type; data.id = ++S.eventId; data.t = S.match ? +S.match.time.toFixed(2) : 0;
  S.events.push(data); if (S.events.length > 64) S.events.shift();
  for (const fn of (LISTENERS[type] || []).slice()) { try { fn(data); } catch (e) { game.fail('event ' + type, e); } }
  for (const fn of (LISTENERS['*'] || []).slice()) { try { fn(data); } catch (e) { game.fail('event *', e); } }
  return data;
}

/* ---- registries: content is data; systems read it ---- */
const REG = {};
function def(kind, id, v) { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, v); return REG[kind][id]; }
function get(kind, id) { return (REG[kind] || {})[id]; }
function all(kind) { return Object.values(REG[kind] || {}); }

/* ---- tuning: { key: { v, def, min, max, step, group, label, help } }; systems read tune(key) every time ---- */
const TUNING = {};
function tn(group, key, d, min, max, step, label, help) { TUNING[key] = { v: d, def: d, min, max, step, group, label, help }; }
tn('Movement', 'runSpeed', 108, 60, 160, 2, 'Run speed', 'units a second before ZOOM');
tn('Movement', 'accel', 900, 300, 2000, 50, 'Acceleration', 'units a second squared');
tn('Movement', 'turboMult', 1.5, 1, 2.2, .05, 'Turbo speed', 'x run speed while turbo is held');
tn('Movement', 'turboDrain', .30, .05, .8, .01, 'Turbo drain', 'per second held and moving');
tn('Movement', 'turboRefill', .20, .05, .8, .01, 'Turbo refill', 'per second');
tn('Movement', 'turboRefillDelay', .35, 0, 1.5, .05, 'Refill delay', 'seconds before turbo refills');
tn('Movement', 'playerGravity', 900, 500, 1500, 20, 'Player gravity', '');
tn('Movement', 'jumpShotVz', 250, 150, 400, 5, 'Jump power', 'jump speed before SWAT');
tn('Shooting', 'shotSkill', .92, .4, 1.6, .05, 'Shot skill', 'x every make chance');
tn('Shooting', 'threeSkill', 1, .4, 1.6, .05, 'Three skill', 'x three-point chance');
tn('Shooting', 'perfectWindow', .10, .03, .3, .01, 'Perfect window', 'seconds, full width');
tn('Shooting', 'perfectBonus', .15, 0, .4, .01, 'Perfect bonus', '');
tn('Shooting', 'badReleasePenalty', .30, 0, .6, .01, 'Bad release', 'penalty for early or late');
tn('Shooting', 'contestPenalty', .40, 0, .8, .01, 'Contest penalty', 'an airborne defender in your face');
tn('Shooting', 'shotArc', 1, .6, 1.6, .05, 'Shot arc', 'x apex height');
tn('Dunks', 'dunkRange', 125, 60, 300, 5, 'Dunk range', 'from the rim, before SLAM');
tn('Dunks', 'dunkGravity', 520, 300, 900, 10, 'Dunk gravity', '');
tn('Dunks', 'dunkApex', 1, .5, 2, .05, 'Dunk apex', 'x height above the slam');
tn('Dunks', 'dunkHang', 1, .5, 2, .05, 'Dunk hang', 'x flight time');
tn('Dunks', 'dunkSlowMo', .45, .1, 1, .05, 'Dunk slow-mo', 'time scale at the apex (1 = off)');
tn('Dunks', 'blockReach', 14, 6, 30, 1, 'Block reach', 'before SWAT');
tn('Dunks', 'blockChance', 1, 0, 2, .05, 'Block chance', '');
tn('Dunks', 'shatterChance', 1, 0, 5, .1, 'Shatter chance', 'x every shatter chance');
tn('Defense', 'stealChance', .30, 0, .9, .01, 'Steal chance', '');
tn('Defense', 'stealReach', 18, 8, 36, 1, 'Steal reach', '');
tn('Defense', 'stealCooldown', .6, .1, 2, .05, 'Steal cooldown', 'seconds');
tn('Defense', 'shoveForce', 220, 60, 500, 10, 'Shove force', '');
tn('Defense', 'shoveCost', .25, 0, .8, .01, 'Shove cost', 'turbo');
tn('Defense', 'shoveCooldown', 1, .2, 3, .05, 'Shove cooldown', 'seconds');
tn('Defense', 'shoveFumble', .6, 0, 1, .01, 'Shove fumble', 'chance a handler loses it');
tn('Defense', 'knockdownTime', .8, .2, 2, .05, 'Knockdown time', 'seconds on the floor');
tn('Defense', 'spinCost', .2, 0, .6, .01, 'Spin cost', 'turbo');
tn('Defense', 'spinCooldown', 1.5, .3, 4, .05, 'Spin cooldown', 'seconds');
tn('Supernova', 'novaBaskets', 3, 2, 6, 1, 'Baskets to ignite', 'in a row');
tn('Supernova', 'novaMaxBaskets', 4, 1, 10, 1, 'Nova baskets', 'more baskets before it ends');
tn('Supernova', 'novaTime', 40, 10, 120, 1, 'Nova time', 'seconds of game clock');
tn('Supernova', 'novaShotBonus', .25, 0, .6, .01, 'Nova shot bonus', '');
tn('CPU', 'cpuSkill', 0, -.5, .5, .05, 'CPU skill', 'offset on decision quality');
tn('CPU', 'cpuReaction', 1, .25, 3, .05, 'CPU reaction', 'x reaction delays');
tn('CPU', 'cpuAggression', 1, 0, 2, .05, 'CPU aggression', 'x steal and shove rates');
tn('CPU', 'comeback', .35, 0, 1, .05, 'Comeback assist', '');
tn('Match', 'quarterLength', 120, 20, 300, 5, 'Quarter length', 'seconds (this match)');
tn('Match', 'shotClock', 20, 8, 30, 1, 'Shot clock', 'seconds');
tn('Match', 'gameSpeed', 1, .5, 1.5, .05, 'Game speed', 'time scale outside effects');
tn('Match', 'fatigue', 1, 0, 3, .1, 'Fatigue', 'x juice loss');
tn('Physics', 'ballGravity', 760, 400, 1200, 10, 'Ball gravity', '');
tn('Physics', 'ballBounce', .62, .3, .9, .01, 'Floor bounce', '');
tn('Physics', 'rimBounce', .45, .2, .8, .01, 'Rim bounce', '');
tn('Physics', 'boardBounce', .55, .2, .9, .01, 'Board bounce', '');
tn('Courts', 'powerupInterval', 22, 6, 60, 1, 'Power-up interval', 'seconds');
tn('Courts', 'hazardInterval', 1, .25, 4, .05, 'Hazard interval', 'x twist timers');
tn('Courts', 'windStrength', 140, 0, 300, 5, 'Wind strength', 'at full gust');
tn('Courts', 'jackpotBonus', 2, 0, 5, 1, 'Jackpot bonus', 'points');
const tune = k => TUNING[k].v;
function setTune(k, v) { const t = TUNING[k]; if (!t) return; t.v = clamp(Math.round(v / t.step) * t.step, t.min, t.max); t.v = +t.v.toFixed(4); }
function resetTuning() { for (const t of Object.values(TUNING)) t.v = t.def; }
function loadTuning() { const saved = store.get('bb:tuning', null); if (saved) for (const [k, v] of Object.entries(saved)) if (TUNING[k] && k !== 'quarterLength') setTune(k, v); }

/* ---- the game ---- */
const GAME_SETTINGS = [
  { key: 'symbols', label: 'Button symbols (prompts)', type: 'select', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', group: 'Game', help: 'The symbols the prompts show for a controller', apply(g, v) { for (const p of g.players || []) p.glyphs = v; } },
  { key: 'difficulty', label: 'CPU difficulty', type: 'select', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['blam', 'BLAM']], value: 'pro', group: 'Game' },
  { key: 'quarter', label: 'Quarter length', type: 'select', options: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']], value: 120, group: 'Game', help: 'Exhibition games' },
  { key: 'powerups', label: 'Power-ups', type: 'toggle', value: true, group: 'Game' },
  { key: 'twists', label: 'Court twists', type: 'toggle', value: true, group: 'Game' },
  { key: 'jackpotAll', label: 'Jackpot Spot on every court', type: 'toggle', value: false, group: 'Game' },
  { key: 'comeback', label: 'Comeback assist', type: 'select', options: [['off', 'Off'], ['low', 'Low'], ['normal', 'Normal']], value: 'normal', group: 'Game' },
  { key: 'commentary', label: 'Commentary', type: 'select', options: [['full', 'Full'], ['big', 'Big plays'], ['off', 'Off']], value: 'full', group: 'Game' },
  { key: 'voiceVol', label: 'Voice volume', type: 'slider', min: 0, max: 1, step: .05, value: .8, group: 'Game' },
  { key: 'camera', label: 'Camera', type: 'select', options: [['broadcast', 'Broadcast'], ['high', 'High']], value: 'broadcast', group: 'Game', apply(g, v) { if (g.scene && g.scene.isMatch) g.setView(v === 'high' ? HIGH : 'broadcast'); } },
  { key: 'meter', label: 'Shot meter', type: 'toggle', value: true, group: 'Game' },
  { key: 'bigHeads', label: 'Big heads', type: 'toggle', value: false, group: 'Game', help: 'Unlocked by winning the Blam Tour' }
];
const closeMenu = () => { if (game.shell) game.shell.hide(); else if (game.paused) game.resume(); };
const pauseItems = () => [
  ['How to Play', () => { if (game.shell) game.shell.show('help', helpSpec()); }],
  S.scene === 'match' && S.mode !== 'attract' && S.mode !== 'hub' && ['Restart Game', () => { closeMenu(); restartMatch(); }],
  S.scene === 'story' && ['Skip Cutscene', () => { closeMenu(); skipStory(); }],
  S.mode === 'camp' && S.scene === 'match' && ['Skip Lesson', () => { closeMenu(); if (CAMP.lesson < LESSONS.length - 1) startLesson(CAMP.lesson + 1); else go('camplist'); }],
  S.mode === 'camp' && S.scene === 'match' && ['Leave Camp', () => { closeMenu(); go('camplist'); }],
  !HUB && ['Dev Mode', () => { closeMenu(); openDev(); }]
];
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', HIGH], bg: '#05040a', id: 'basketblam', input: KEYS,
  autoPause: !HUB, propSize: 1.5,
  menu: HUB ? false : { items: pauseItems, settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;
const setting = k => { const v = game.settings[k]; if (v !== undefined) return v; const sp = GAME_SETTINGS.find(s => s.key === k); return sp ? sp.value : undefined; };
/** switch scene (a fade), remembering it for the debug snapshot */
function go(name, data, o) { game.go(name, data, o); }
const fmtClock = s => { s = Math.max(0, s); return s >= 10 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : s.toFixed(1); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pick = (list, rnd = S.fxRng) => list[Math.floor(rnd() * list.length) % list.length];

/* ---- 02-data.js ---- */
/* DATA: teams, players, story characters, courts, dunks, power-ups, cheat codes. Content never edits systems: systems
 * read these registries. Ratings: ZOOM SPLASH DEEP SLAM DIME SWIPE SWAT BUMP, 1..10. */
const RATINGS = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const RATING_NAMES = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
const RATING_HELP = { zoom: 'speed', splash: 'jumpers and layups', deep: 'three-pointers', slam: 'dunking', dime: 'passing and handles', swipe: 'steals', swat: 'blocks and rebounds', bump: 'power and shoves' };

def('team', 'hightops', { name: 'NEON HEIGHTS HIGHTOPS', short: 'HIGHTOPS', city: 'NEON HEIGHTS', jersey: '#ff3ca6', trim: '#2de2ff', shorts: '#1a1420', sneaker: '#f4f4f4', sock: '#2de2ff', court: 'skybox', players: ['volt', 'bigrumble', 'pixel'], style: 'Flashy, fast and high-flying', logo: 'wing' });
def('team', 'breakers', { name: 'BOARDWALK BREAKERS', short: 'BREAKERS', city: 'THE BOARDWALK', jersey: '#18c8b8', trim: '#ff7a5c', shorts: '#f2d8a0', sneaker: '#ffffff', sock: '#ff7a5c', court: 'pier', players: ['riptide', 'shellshock', 'longboard'], style: 'Passing and threes', logo: 'wave' });
def('team', 'crushers', { name: 'SCRAPYARD CRUSHERS', short: 'CRUSHERS', city: 'THE SCRAPYARD', jersey: '#d8641e', trim: '#ffd23a', shorts: '#1c1a18', sneaker: '#2a2a2a', sock: '#ffd23a', court: 'scrapyard', players: ['torque', 'sparkplug', 'hubcap'], style: 'Power and steals', logo: 'wrench' });
def('team', 'magma', { name: 'KABOOM MAGMA', short: 'MAGMA', city: 'KABOOM ISLAND', jersey: '#ff3a1a', trim: '#ffb020', shorts: '#22181e', sneaker: '#1a1a1a', sock: '#ffb020', court: 'caldera', players: ['obsidian', 'ember', 'pumice'], style: 'Defense and clutch shooting', logo: 'volcano' });
def('team', 'blambots', { name: 'THE BLAMBOTS', short: 'BLAMBOTS', city: 'GLOBO-BLAM LABS', jersey: '#c8d0dc', trim: '#e8c040', shorts: '#3a4250', sneaker: '#3a4250', sock: '#e8c040', court: 'dome', players: ['dunkatron', 'swatbot', 'spareparts'], style: 'Everything, loudly', logo: 'fist', locked: true, robots: true });
def('team', 'allstars', { name: 'CHANNEL BLAM ALL-STARS', short: 'ALL-STARS', city: 'CHANNEL BLAM', jersey: '#f4f0ea', trim: '#ffc83a', shorts: '#4a2a8a', sneaker: '#ffc83a', sock: '#4a2a8a', court: 'dome', players: ['vinniep', 'deedeep', 'blammo'], style: 'Showbiz', logo: 'mic', locked: true });
const STREET_TEAMS = ['hightops', 'breakers', 'crushers', 'magma'];

// voice: { pitch Hz, wave, rate syllables/s, formant shift, robot, growl }
const PL = (id, name, team, number, role, r, rig, voice, taunt, barks) => def('player', id, { name, team, number, role, ratings: Object.fromEntries(RATINGS.map((k, i) => [k, r[i]])), rig, voice, taunt, barks });
PL('volt', 'VOLT', 'hightops', 7, 'HIGH-FLYER', [9, 5, 4, 9, 6, 6, 4, 3], { build: 'heroic', size: 1.65, hair: 'ponytail', hairColor: '#3ab0ff', skin: '#8a5a3c', hat: { style: 'band', color: '#ff3ca6' } }, { pitch: 220, wave: 'square', rate: 15 }, 'raiseRoof', ['Too slow!', 'Catch me!', 'Zap!', 'Up here!']);
PL('bigrumble', 'BIG RUMBLE', 'hightops', 44, 'ENFORCER', [3, 3, 1, 7, 4, 4, 9, 10], { build: 'bulky', size: 1.9, hair: 'flattop', hairColor: '#141014', skin: '#4a2c1e' }, { pitch: 85, wave: 'saw', rate: 9 }, 'flex', ['Move.', 'Rumble!', 'Sit down.']);
PL('pixel', 'PIXEL', 'hightops', 3, 'SHARPSHOOTER', [6, 9, 9, 3, 7, 5, 3, 3], { build: 'heroic', size: 1.55, hair: 'spiky', hairColor: '#4ae05a', skin: '#f0c8a0', shades: true }, { pitch: 270, wave: 'square', rate: 16 }, 'fingerGuns', ['Pew pew!', 'Net.', 'Too easy!']);
PL('riptide', 'RIPTIDE', 'breakers', 1, 'POINT GUARD', [10, 6, 6, 5, 10, 7, 2, 3], { build: 'heroic', size: 1.6, hair: 'long', hairColor: '#f0d890', skin: '#d8a070' }, { pitch: 170, wave: 'triangle', rate: 11 }, 'surf', ['Gnarly!', 'Cowabunga!', 'Ride it!']);
PL('shellshock', 'SHELLSHOCK', 'breakers', 33, 'BOMBER', [6, 8, 10, 3, 6, 5, 3, 4], { build: 'heroic', size: 1.65, hair: 'afro', hairColor: '#ff7a6a', skin: '#6a4028' }, { pitch: 200, wave: 'square', rate: 13 }, 'goggles', ['Splash!', 'From downtown!', 'Ka-boom!']);
PL('longboard', 'LONGBOARD', 'breakers', 21, 'SHOT BLOCKER', [4, 5, 2, 7, 4, 3, 9, 7], { build: 'heroic', size: 1.85, hair: 'bald', hairColor: '#c89070', skin: '#c89070', hat: { style: 'band', color: '#18c8b8' }, legs: 1.12 }, { pitch: 120, wave: 'triangle', rate: 9 }, 'fingerWag', ['Nope.', 'Not today.', 'Denied.']);
PL('torque', 'TORQUE', 'crushers', 99, 'POWER DUNKER', [6, 4, 2, 10, 4, 4, 6, 9], { build: 'bulky', size: 1.85, hair: 'mohawk', hairColor: '#1a1a1a', skin: '#c8a080' }, { pitch: 95, wave: 'saw', rate: 10, growl: .3 }, 'chestPound', ['CRUSHED!', 'Scrap metal!', 'Yeah!']);
PL('sparkplug', 'SPARKPLUG', 'crushers', 8, 'PICKPOCKET', [9, 6, 6, 4, 7, 10, 2, 2], { build: 'chibi', size: 1.65, hair: 'short', hairColor: '#2a1a10', skin: '#3a2418', hat: { style: 'cap', color: '#ffd23a' } }, { pitch: 300, wave: 'square', rate: 18 }, 'shimmy', ['Mine now!', 'Yoink!', 'Zip zip!']);
PL('hubcap', 'HUBCAP', 'crushers', 52, 'VETERAN', [5, 7, 6, 6, 6, 6, 6, 6], { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#a8a8a8', skin: '#e0b090' }, { pitch: 130, wave: 'saw', rate: 10 }, 'watch', ['Old school.', 'Seen it all.', 'Back in my day!']);
PL('obsidian', 'OBSIDIAN', 'magma', 0, 'RIM PROTECTOR', [4, 4, 1, 8, 3, 4, 10, 8], { build: 'bulky', size: 1.95, hair: 'bald', hairColor: '#3a2216', skin: '#3a2216' }, { pitch: 78, wave: 'saw', rate: 8 }, 'stoneFace', ['Hm.', 'The mountain stands.', 'Rock solid.']);
PL('ember', 'EMBER', 'magma', 11, 'CLUTCH SHOOTER', [7, 9, 8, 5, 6, 6, 3, 3], { build: 'heroic', size: 1.6, hair: 'long', hairColor: '#e0401a', skin: '#f0c090' }, { pitch: 230, wave: 'square', rate: 14 }, 'blowFingers', ['Too hot!', 'Burned!', 'Ice cold.']);
PL('pumice', 'PUMICE', 'magma', 24, 'LEAPER', [8, 5, 3, 9, 5, 5, 7, 3], { build: 'heroic', size: 1.65, hair: 'afro', hairColor: '#1a1210', skin: '#8a5030' }, { pitch: 190, wave: 'square', rate: 14 }, 'pogo', ['Boing!', 'Sky high!', 'Up up up!']);
PL('dunkatron', 'DUNKATRON', 'blambots', 1001, 'DESTROYER', [8, 6, 4, 10, 6, 8, 8, 8], { build: 'bulky', size: 1.95, hair: 'bald', skin: '#c8d0dc', hat: { style: 'helmet', color: '#e0e6f0' }, eyeGlow: '#ff3a2a', robot: true }, { pitch: 95, wave: 'square', rate: 9, robot: true }, 'robot', ['BALL. ACQUIRED.', 'YOU. ARE. OBSOLETE.', 'BLAM. PROTOCOL.']);
PL('swatbot', 'SWATBOT', 'blambots', 1010, 'WALL', [6, 7, 7, 7, 7, 9, 10, 9], { build: 'bulky', size: 1.95, hair: 'bald', skin: '#b8c0cc', hat: { style: 'helmet', color: '#d0d6e0' }, eyeGlow: '#ff3a2a', robot: true }, { pitch: 120, wave: 'square', rate: 9, robot: true }, 'tilt', ['REJECTION. COMPLETE.', 'ACCESS. DENIED.', 'BEEP.']);
PL('spareparts', 'SPARE PARTS', 'blambots', 404, 'BENCH UNIT', [6, 6, 6, 6, 6, 6, 6, 6], { build: 'bulky', size: 1.8, hair: 'bald', skin: '#a8a090', hat: { style: 'helmet', color: '#c8a050' }, eyeGlow: '#3aff6a', robot: true }, { pitch: 150, wave: 'square', rate: 11, robot: true }, 'glitchWave', ['ERR. ERR. HI.', 'SPARE. ME.', 'BZZT.']);
PL('vinniep', 'VINNIE VOX', 'allstars', 10, 'PLAY-BY-PLAY', [5, 7, 7, 5, 8, 5, 4, 5], { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#3a2a20', skin: '#e8b890', hat: { style: 'band', color: '#2a2a2a' } }, { pitch: 110, wave: 'saw', rate: 14 }, 'micDrop', ['BLAMMO!', 'CALL IT!', 'ON THE AIR!']);
PL('deedeep', 'DEE DEE DECIBEL', 'allstars', 22, 'COLOR COMMENTATOR', [7, 8, 6, 6, 7, 6, 5, 4], { build: 'heroic', size: 1.6, hair: 'ponytail', hairColor: '#a040e0', skin: '#6a4030' }, { pitch: 230, wave: 'square', rate: 15 }, 'pointCam', ['SAY CHEESE!', 'LOUDER!', 'WOO!']);
PL('blammo', 'BLAMMO', 'allstars', 0, 'MASCOT', [7, 3, 1, 10, 3, 6, 9, 10], { build: 'bulky', size: 2.0, hair: 'short', hairColor: '#3a2e2a', skin: '#3a2e2a', hunch: .2, gorilla: true }, { pitch: 70, wave: 'saw', rate: 8, growl: .6 }, 'gorilla', ['OOH OOH!', 'BLAM BLAM!', 'HRRAAH!']);

// story characters (not playable): portraits and voices for the cutscenes and captions
def('npc', 'vinnie', { name: 'VINNIE VOX', rig: { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#3a2a20', skin: '#e8b890', outfit: 'coat', coat: '#2a3a7a', cloth: '#f4f0ea', hat: { style: 'band', color: '#2a2a2a' } }, voice: { pitch: 110, wave: 'saw', rate: 14 } });
def('npc', 'deedee', { name: 'DEE DEE DECIBEL', rig: { build: 'heroic', size: 1.6, hair: 'ponytail', hairColor: '#a040e0', skin: '#6a4030', outfit: 'coat', coat: '#c8306a', cloth: '#ffe0f0' }, voice: { pitch: 230, wave: 'square', rate: 15 } });
def('npc', 'gigawatt', { name: 'COMMISSIONER GIGAWATT', rig: { build: 'heroic', size: 1.6, hair: 'short', hairColor: '#f0f0f0', skin: '#f0d0b0', outfit: 'coat', coat: '#6a2a9a', cloth: '#2a1a3a', belt: '#e8c040' }, voice: { pitch: 140, wave: 'pulse', rate: 9, nasal: true } });
def('npc', 'roscoe', { name: 'REF ROSCOE', rig: { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#2a2a2a', skin: '#c89070', cloth: '#f4f4f4', trim: '#1a1a1a', hat: { style: 'cap', color: '#1a1a1a' } }, voice: { pitch: 125, wave: 'saw', rate: 12 } });
def('npc', 'intern1', { name: 'INTERN 1', rig: { build: 'chibi', size: 1.6, hair: 'short', hairColor: '#5a3a1a', skin: '#e0b090', cloth: '#8a8a94' }, voice: { pitch: 180, wave: 'triangle', rate: 12 } });
def('npc', 'intern2', { name: 'INTERN 2', rig: { build: 'chibi', size: 1.6, hair: 'ponytail', hairColor: '#1a1a1a', skin: '#8a5a3c', cloth: '#8a8a94' }, voice: { pitch: 210, wave: 'triangle', rate: 12 } });

/* ---- courts: each a home, a look and a twist ---- */
def('court', 'skybox', { name: 'THE SKYBOX', place: 'a Neon Heights rooftop at night', home: 'hightops', floor: 'asphalt', base: [38, 34, 48], line: '#2de2ff', paint: '#ff3ca6', paintFill: [70, 30, 70], logo: 'BLAM',
  sky: { sky: ['#07061a', '#1d1240', '#3a1a5a'], moon: { x: .82, y: .18, r: 10 }, stars: 60, layers: [{ kind: 'city', color: '#2a1a48', y: .5, height: .38, parallax: .06, windows: '#ff7ad8' }, { kind: 'city', color: '#160e2c', y: .62, height: .3, parallax: .16, windows: '#5ae8ff', seed: 4 }] },
  stands: ['#2a2238', '#3a2e4c'], crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a', '#8a4aff'], ambient: .5, dribble: 'asphalt', music: 'skybox', twist: 'jackpot',
  props: [['streetlamp', 40, 104], ['streetlamp', 728, 104], ['trashcan', 30, 420], ['trashcan', 740, 150], ['firedrum', 40, 250], ['hydrant', 736, 410]], glow: ['#ff3ca6', '#2de2ff'], weather: null });
def('court', 'pier', { name: 'THE PIER', place: 'a boardwalk at sunset', home: 'breakers', floor: 'planks', base: [150, 108, 72], line: '#f8f0e0', paint: '#18c8b8', paintFill: [60, 140, 130], logo: 'WAVE',
  sky: { sky: ['#2a1a4a', '#ff7a5c', '#ffd27a'], sun: { x: .3, y: .5, r: 18, color: '#ffe0a0' }, layers: [{ kind: 'clouds', color: '#ffb090', y: .25, height: .12, parallax: .04, drift: 4 }, { kind: 'sea', color: '#3a6aa0', y: .56, height: .44, parallax: .1 }] },
  stands: ['#8a6a4a', '#a07a52'], crowd: ['#ff7a5c', '#18c8b8', '#ffe05a', '#ffffff', '#ff5aa0'], ambient: .85, dribble: 'planks', music: 'pier', twist: 'wind',
  props: [['palm', 30, 120], ['palm', 740, 120], ['awning', 30, 420, { color: '#ff7a5c' }], ['lantern', 384, 96, { anchor: 'top' }], ['palm', 740, 430], ['barrel', 30, 260]], glow: ['#ffb060'], weather: null });
def('court', 'scrapyard', { name: 'THE SCRAPYARD', place: 'a junkyard at dusk in light rain', home: 'crushers', floor: 'concrete', base: [92, 88, 84], line: '#ffd23a', paint: '#d8641e', paintFill: [110, 70, 50], logo: 'CRUSH',
  sky: { sky: ['#120e1a', '#4a2e36', '#b0603a'], layers: [{ kind: 'clouds', color: '#3a2a34', y: .2, height: .2, parallax: .03, drift: 6 }, { kind: 'mountains', color: '#3a2a2a', y: .52, height: .26, parallax: .06, seed: 3 }, { kind: 'mountains', color: '#2a1e1e', y: .62, height: .2, parallax: .14, seed: 8 }] },
  stands: ['#4a4038', '#5a4e44'], crowd: ['#d8641e', '#ffd23a', '#3a5a8a', '#8a8a8a', '#e0e0e0'], ambient: .6, dribble: 'concrete', music: 'scrapyard', twist: 'oil',
  props: [['firedrum', 36, 140, { light: true }], ['firedrum', 732, 140, { light: true }], ['barrel', 30, 420], ['barrel', 744, 418], ['sandbags', 40, 300], ['crate', 728, 280]], glow: ['#ff8a3a'], weather: { kind: 'rain', amount: .4, wind: .2 } });
def('court', 'caldera', { name: 'THE CALDERA', place: 'Kaboom Island volcano at night', home: 'magma', floor: 'basalt', base: [44, 36, 38], line: '#ffc040', paint: '#ff3a1a', paintFill: [90, 30, 20], logo: 'KABOOM',
  sky: { sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 30, layers: [{ kind: 'mountains', color: '#2a0c0c', y: .46, height: .42, parallax: .04, seed: 11 }, { kind: 'sea', color: '#2a1020', y: .66, height: .34, parallax: .1 }] },
  stands: ['#3a2a22', '#4a3428'], crowd: ['#ff3a1a', '#ffb020', '#2ad8a0', '#ffffff', '#ff7ab0'], ambient: .42, dribble: 'stone', music: 'caldera', twist: 'eruption',
  props: [['torch', 40, 110, { light: true }], ['torch', 728, 110, { light: true }], ['torch', 40, 410, { light: true }], ['torch', 728, 410, { light: true }], ['palm', 24, 260], ['palm', 744, 260]], glow: ['#ff5a2a'], weather: { kind: 'ash', amount: .3, wind: .1 } });
def('court', 'dome', { name: 'THE BLAM DOME', place: 'the championship arena', home: 'blambots', floor: 'maple', base: [196, 140, 84], line: '#ffffff', paint: '#c8202a', paintFill: [160, 40, 40], logo: 'GLOBO',
  sky: { sky: ['#06050c', '#120c20', '#1e1430'], stars: 0, layers: [{ kind: 'city', color: '#140e1e', y: .4, height: .5, parallax: .03, windows: '#ffe08a', seed: 2 }] },
  stands: ['#2a2032', '#3a2c44'], crowd: ['#c8202a', '#ffd23a', '#ffffff', '#3a6aff', '#ff3ca6', '#2de2ff'], ambient: .72, dribble: 'maple', music: 'dome', twist: 'boss',
  props: [['banner', 120, 96, { color: '#c8202a' }], ['banner', 648, 96, { color: '#ffd23a' }], ['banner', 384, 96, { color: '#3a6aff' }], ['lamp', 30, 420, { light: true }], ['lamp', 740, 420, { light: true }]], glow: ['#ffe08a'], weather: null, upperDeck: true });
const COURTS = ['skybox', 'pier', 'scrapyard', 'caldera', 'dome'];

/* ---- dunks: hand keys over the flight's progress u ([forward, right, up] at size 1), spins, flips ---- */
// R/L: hand targets; ball: 'R' | 'both'; slam at u = .9
const DK = (id, banner, need, dist, o) => def('dunk', id, Object.assign({ banner, need, dist, apexAbove: 26, spin: 0, flip: 0, ball: 'both', bonus: 0, family: 'power' }, o));
DK('hammer', 'TWO-HAND HAMMER!', { slam: 1 }, [0, 70], { keys: [[0, { B: [5, 0, 22] }], [.5, { B: [3, 0, 40] }], [.85, { B: [2, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('tomahawk', 'TOMAHAWK!', { slam: 5 }, [30, 130], { ball: 'R', bonus: 50, keys: [[0, { R: [5, 2, 22], L: [4, -3, 22] }], [.35, { R: [-4, 2, 40], L: [5, -4, 32] }], [.8, { R: [-5, 1, 44], L: [5, -4, 34] }], [.92, { R: [10, 1, 30], L: [4, -4, 26] }]] });
DK('doublepump', 'DOUBLE PUMP!', { slam: 6 }, [30, 120], { bonus: 80, family: 'hang', keys: [[0, { B: [5, 0, 22] }], [.25, { B: [4, 0, 38] }], [.38, { B: [5, 0, 16] }], [.55, { B: [4, 0, 40] }], [.66, { B: [5, 0, 16] }], [.84, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('reverse', 'REVERSE ROCKET!', { slam: 6 }, [20, 100], { bonus: 100, spin: Math.PI, family: 'spin', keys: [[0, { B: [5, 0, 22] }], [.5, { B: [-2, 0, 42] }], [.85, { B: [-4, 0, 46] }], [.92, { B: [-8, 0, 34] }]] });
DK('windmill', 'WINDMILL!', { slam: 7 }, [50, 150], { ball: 'R', bonus: 100, family: 'spin', keys: [[0, { R: [5, 2, 20], L: [4, -3, 24] }], [.25, { R: [4, 7, 12], L: [3, -6, 28] }], [.45, { R: [-5, 6, 22], L: [3, -6, 30] }], [.65, { R: [-3, 4, 42], L: [4, -6, 32] }], [.82, { R: [4, 2, 46], L: [4, -6, 30] }], [.92, { R: [10, 1, 30], L: [3, -5, 26] }]] });
DK('threesixty', 'THREE-SIXTY!', { slam: 7 }, [40, 140], { bonus: 120, spin: TAU, family: 'spin', keys: [[0, { B: [5, 0, 22] }], [.4, { B: [3, 0, 30] }], [.85, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('ftflyer', 'FREE-THROW FLYER!', { slam: 8 }, [110, 999], { ball: 'R', bonus: 150, apexAbove: 50, family: 'long', split: true, keys: [[0, { R: [5, 2, 22], L: [4, -3, 24] }], [.4, { R: [6, 2, 36], L: [0, -9, 26] }], [.85, { R: [6, 1, 46], L: [0, -9, 26] }], [.92, { R: [11, 1, 32], L: [0, -8, 24] }]] });
DK('flip', 'FRONT-FLIP FREAK!', { slam: 8 }, [60, 150], { bonus: 180, flip: 1, apexAbove: 44, family: 'flip', keys: [[0, { B: [5, 0, 22] }], [.25, { B: [4, 0, 24] }], [.75, { B: [4, 0, 26] }], [.85, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('rattler', 'RIM RATTLER!', { slam: 4 }, [0, 60], { bonus: 60, hang: 1.2, family: 'hang', keys: [[0, { B: [5, 0, 22] }], [.6, { B: [3, 0, 42] }], [.92, { B: [8, 0, 32] }]] });
DK('nova720', 'SEVEN-TWENTY SUPERNOVA!', { nova: true }, [60, 999], { bonus: 250, spin: TAU * 2, apexAbove: 50, family: 'nova', keys: [[0, { B: [5, 0, 22] }], [.4, { B: [3, 0, 32] }], [.85, { B: [3, 0, 46] }], [.92, { B: [9, 0, 30] }]] });
DK('volcano', 'VOLCANO LAUNCH!', { vent: true }, [0, 999], { bonus: 300, spin: TAU, apexAbove: 110, family: 'volcano', shatter: .2, keys: [[0, { B: [5, 0, 22] }], [.5, { B: [2, 0, 44] }], [.85, { B: [3, 0, 46] }], [.92, { B: [10, 0, 28] }]] });
DK('quake', 'BLAM-QUAKE!!!', { quake: true }, [80, 999], { bonus: 400, apexAbove: 80, family: 'quake', shatter: 1, keys: [[0, { B: [5, 0, 22] }], [.5, { B: [1, 0, 46] }], [.85, { B: [0, 0, 48] }], [.92, { B: [11, 0, 26] }]] });

/* ---- power-ups ---- */
def('powerup', 'rocket', { name: 'ROCKET KICKS', color: '#ff7a2a', seconds: 15, help: 'Speed +40%, turbo refills twice as fast' });
def('powerup', 'glue', { name: 'GLUE GLOVES', color: '#5ae05a', seconds: 15, help: 'Steals always work, and nobody strips you' });
def('powerup', 'laser', { name: 'LASER SIGHT', color: '#ff3a3a', seconds: 15, shots: 2, help: 'Next 2 shots: +30% and a wider PERFECT window' });
def('powerup', 'moon', { name: 'MOON SHOES', color: '#c8b0ff', seconds: 15, help: 'Dunk from the arc, jump x1.5, dunks may shatter' });
def('powerup', 'bomb', { name: 'BLAM BOMB', color: '#3a3a3a', seconds: 20, help: 'Your next shove is a shockwave' });
def('powerup', 'gold', { name: 'GOLD BALL', color: '#ffd23a', seconds: 30, help: "Your team's next basket counts double" });
const POWERUPS = ['rocket', 'glue', 'laser', 'moon', 'bomb', 'gold'];

/* ---- cheat codes (entered on the matchup card) ---- */
def('code', 'bigheads', { name: 'BIG HEADS', steps: ['up', 'up', 'turbo', 'pass'] });
def('code', 'powerups', { name: 'POWER-UPS ON', steps: ['shoot', 'shoot', 'pass', 'turbo'] });
def('code', 'turbo', { name: 'INFINITE TURBO', steps: ['turbo', 'turbo', 'turbo', 'up', 'up'] });
def('code', 'notwists', { name: 'NO TWISTS', steps: ['down', 'down', 'shove'] });
def('code', 'skydunks', { name: 'SKY DUNKS', steps: ['oop', 'oop', 'up', 'shoot'] });
def('code', 'moongrav', { name: 'MOON GRAVITY', steps: ['up', 'oop', 'up', 'oop'] });
def('code', 'tournament', { name: 'TOURNAMENT MODE', steps: ['down', 'left', 'right', 'down'] });

/* ---- difficulty ---- */
const DIFF = {
  rookie: { q: .35, react: .35, rel: .12, blk: .18, steal: .6, shove: .2, turbo: .5 },
  pro: { q: .6, react: .22, rel: .08, blk: .12, steal: 1, shove: .45, turbo: .75 },
  allstar: { q: .8, react: .14, rel: .05, blk: .07, steal: 1.4, shove: .65, turbo: .9 },
  blam: { q: .95, react: .08, rel: .03, blk: .04, steal: 1.8, shove: .8, turbo: 1 }
};
const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'blam'];

/* ---- 04-data-text.js ---- */
/* TEXT: the announcers' line banks (ALL CAPS, at most 60 characters, {NAME} {VICTIM} {TEAM} slots), the story beats, the
 * halftime gags and sponsor breaks. Tone: a loud 90s sports broadcast. */
const LINES = {
  tipoff: ['WELCOME TO CHANNEL BLAM! LET\'S GET LOUD!', 'THE BALL IS UP! THE CROWD IS UP! I AM UP!', 'TIP-OFF! NO FOULS! NO MERCY!', 'HERE WE GO, BALL FANS! STRAP IN!', 'IT\'S BLAM TIME! HIDE THE GOOD CHAIRS!', 'REF ROSCOE TOSSES IT UP AND RUNS FOR HIS LIFE!', 'TWO ON TWO! FOUR SNEAKERS! EIGHT, ACTUALLY!', 'THE BALL GOES UP AND THE RATINGS GO WITH IT!', 'LADIES AND GENTLEMEN, START YOUR SNEAKERS!', 'THIS IS GONNA BE A BARN BURNER! BRING A HOSE!'],
  dunkPower: ['BLAMMO! {NAME} JUST MAILED IT FIRST CLASS!', 'SOMEBODY CALL A CARPENTER, THAT RIM IS FINISHED!', 'KA-BLAM! THE CROWD LEFT THEIR SEATS. AND THEIR SHOES!', '{NAME} WITH THE HAMMER! NAILED IT SHUT!', 'THAT RIM HAS FILED A COMPLAINT!', 'THUNDER DUNK! CHECK THE SEISMOGRAPH!', '{NAME} THREW IT DOWN LIKE IT OWED RENT!', 'OH MY! THAT\'S GOING ON A T-SHIRT!', 'SLAM! JAM! THANK YOU, MA\'AM!', '{NAME} JUST DUNKED IT INTO NEXT WEEK!'],
  dunkSpin: ['{NAME} SPUN SO FAST THE SCOREBOARD GOT DIZZY!', 'ROUND AND ROUND AND BLAM! WHAT A RIDE!', '{NAME} TURNED THE RIM INTO A REVOLVING DOOR!', 'A WINDMILL! SOMEBODY CALL THE POWER COMPANY!', 'I NEED A MINUTE. MY EYES ARE STILL SPINNING!', '{NAME} WITH THE TWIRL! THE BALLERINA OF BLAM!', 'THAT\'S A FULL ROTATION AND A FULL REFUND!', 'HELICOPTER JAM! CLEAR THE AIRSPACE!', 'THE CROWD IS SPINNING TOO! BAD IDEA, CROWD!', '{NAME} JUST DID A LAP IN MIDAIR!'],
  dunkFlip: ['A FRONT FLIP?! THAT\'S NOT BASKETBALL, THAT\'S THE CIRCUS!', '{NAME} WENT HEELS OVER HEAD OVER RIM!', 'SOMERSAULT SLAM! THE JUDGES GIVE IT A TEN!', 'GRAVITY JUST GOT FIRED!', '{NAME} FLIPPED AND THE RIM FLIPPED OUT!', 'IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!', 'A GYMNAST WITH A JUMP SHOT? NO, A DUNK!', 'THE CIRCUS CALLED. THEY WANT {NAME} BACK!', 'UPSIDE DOWN AND STILL ON TARGET!', 'STICK THE LANDING! {NAME} STUCK IT!'],
  dunkHang: ['{NAME} IS HANGING ON THAT RIM LIKE IT OWES MONEY!', 'PUMP, PUMP, BLAM! TAKE YOUR TIME, {NAME}!', '{NAME} IS STILL UP THERE! SEND SNACKS!', 'THAT RIM IS GONNA NEED THERAPY!', 'HANG TIME! I AGED A YEAR WATCHING THAT!', '{NAME} PAID FOR THE WHOLE RIM, USES THE WHOLE RIM!', 'THE BACKBOARD IS SHAKING! I AM SHAKING!', 'DOUBLE PUMP! DOUBLE TROUBLE!', 'LET GO OF THE RIM, {NAME}! IT HAS A FAMILY!', 'THAT\'S A RIM RATTLER AND A HEART RATTLER!'],
  dunkLong: ['AIR TRAFFIC CONTROL HAS QUESTIONS FOR {NAME}!', 'FROM THE FREE-THROW LINE! TAKE OFF! TOUCHDOWN!', '{NAME} FILED A FLIGHT PLAN FOR THAT ONE!', 'THAT WAS A LONG-HAUL FLIGHT! IN-FLIGHT MOVIE!', '{NAME} JUMPED FROM ONE ZIP CODE TO ANOTHER!', 'BOARDING GROUP BLAM, NOW BOARDING!', 'HE\'S... FLYING? SHE\'S FLYING? EVERYBODY FLIES!', 'FLIGHT {NAME} HAS LANDED! PLEASE CLAP!', 'THAT WAS NOT A JUMP. THAT WAS A LAUNCH!', 'FREQUENT FLYER MILES FOR {NAME}!'],
  dunkNova: ['SEVEN-TWENTY! {NAME} IS A COSMIC EVENT!', 'THE STARS ALIGNED AND {NAME} DUNKED ON THEM!', 'SUPERNOVA SLAM! NASA IS TAKING NOTES!', '{NAME} SPUN TWICE AND BROKE THE SOUND BARRIER!', 'THAT DUNK HAD ITS OWN GRAVITY!', 'COSMIC! GALACTIC! BLAMTASTIC!'],
  dunkVolcano: ['{NAME} RODE THE STEAM VENT TO THE MOON!', 'VOLCANO LAUNCH! THE ISLAND SAYS HELLO!', 'ERUPTION OF BLAM! LAVA-LY JAM!', 'THE VOLCANO GAVE {NAME} A BOOST AND A HUG!', 'STEAM POWERED SLAM! FULL STEAM AHEAD!', 'MAGMA-NIFICENT! THAT\'S A REAL WORD NOW!'],
  dunkQuake: ['BLAM-QUAKE! THE DOME IS SHAKING!', 'RICHTER SCALE: BLAM! EVACUATE THE FRONT ROW!', '{NAME} BROKE THE FLOOR AND THE GLASS!', 'THAT WASN\'T A DUNK. THAT WAS A WEATHER EVENT!', 'EVERYBODY DOWN! THE QUAKE IS HERE!', 'TECTONIC! {NAME} MOVED A CONTINENT!'],
  alleyoop: ['SPECIAL DELIVERY! SIGNED, SEALED, SLAMMED!', 'ALLEY-OOP! {NAME} CAUGHT IT IN THE STRATOSPHERE!', 'LOB CITY! POPULATION: {NAME}!', 'THE PASS! THE CATCH! THE BLAM!', 'THAT\'S TEAMWORK! AND VIOLENCE! MOSTLY TEAMWORK!', 'ALLEY-OOP! THE ALLEY SAYS OOP!', 'FROM THE HANDS OF THE PASSER TO THE MOON!', 'THEY PRACTICE THAT IN THEIR SLEEP!', 'AIR MAIL! NO STAMP REQUIRED!', 'OOP! THERE IT IS!'],
  three: ['SPLASH! BRING A TOWEL!', 'FROM DOWNTOWN! TAKE THE BUS BACK!', 'THREE! {NAME} IS FEELING IT!', 'BANG! {NAME} FROM WAY OUT THERE!', 'NOTHING BUT NYLON! ALL THREE OF THEM!', 'THAT BALL HAD A PASSPORT!', 'MONEY! CASH! CHECKS ACCEPTED!', 'IT\'S RAINING THREES! GRAB AN UMBRELLA!', 'DEEP! DEEPER! {NAME}!', 'TRIPLE THREAT! TRIPLE POINTS! TRIPLE BLAM!'],
  deepThree: ['THAT WAS FROM A DIFFERENT ZIP CODE!', '{NAME} SHOT THAT FROM THE PARKING LOT! VALIDATED!', 'WAS THAT FROM HALF COURT?! IT WAS!', 'LOGO SHOT! {NAME} HAS NO FEAR AND NO LIMITS!', 'FROM THE CHEAP SEATS! AND IT\'S IN!', 'SOMEBODY MEASURE THAT! BRING A BIGGER TAPE!'],
  jumper: ['{NAME} PULLS UP! COUNT IT!', 'BUCKETS! {NAME} IS COOKING!', 'SMOOTH AS BUTTER ON A HOT SKILLET!', 'MID-RANGE MAGIC FROM {NAME}!', 'SOFT TOUCH! NOTHING BUT NET!', 'THE JUMPER IS WET! GET A MOP!', '{NAME} DRILLS IT!', 'TWO MORE ON THE BOARD!', 'PERFECT RELEASE! TEXTBOOK! THE BOOK IS ON FIRE!', 'GOOD! {NAME} DOESN\'T EVEN LOOK!'],
  layup: ['{NAME} KISSES IT OFF THE GLASS!', 'EASY TWO FOR {NAME}!', 'UP AND IN! SIMPLE!', 'THE LAYUP! A CLASSIC FOR A REASON!', '{NAME} FINGER-ROLLS IT HOME!', 'GENTLE AS A LULLABY!'],
  airball: ['AIRBALL! THE SEAGULLS SAY THANK YOU!', 'THAT ONE IS STILL GOING. IT\'S IN ORBIT.', 'AIRBALL! THE RIM DIDN\'T EVEN FEEL IT!', 'OOF. {NAME} WILL BE HEARING ABOUT THAT ONE.', 'THAT SHOT IS LOST. CHECK THE LOST AND FOUND.', 'NOT EVEN CLOSE! THE CROWD IS CHANTING!'],
  block: ['REJECTED! RETURN TO SENDER!', '{NAME} SAYS NOT IN MY HOUSE, NOT IN MY YARD!', 'GET THAT WEAK STUFF OUTTA HERE!', 'SWAT! {NAME} SENT IT TO THE CHEAP SEATS!', 'BLOCKED! DENIED! DISAPPROVED!', '{NAME} HAS A FLY SWATTER AND A BAD ATTITUDE!', 'THAT BALL GOT EVICTED!', 'NO NO NO! {NAME} SAYS NO!', 'STUFFED! LIKE A THANKSGIVING TURKEY!', '{VICTIM} JUST GOT PACKAGED AND SHIPPED!'],
  steal: ['PICKPOCKET! CHECK YOUR WALLETS, FOLKS!', '{NAME} SNATCHED IT LIKE A SEAGULL AT A FRY STAND!', 'STOLEN! CALL THE COPS! THERE ARE NO COPS!', '{NAME} WITH THE STRIP! {VICTIM} IS FURIOUS!', 'SNATCH AND GO! {NAME} IS GONE!', 'THE BALL HAS A NEW OWNER!', 'QUICK HANDS! {NAME} IS A MAGICIAN!', 'YOINK! THAT\'S THE TECHNICAL TERM!', '{VICTIM} WAS HOLDING IT. KEY WORD: WAS.', 'LIGHT FINGERS! HEAVY CONSEQUENCES!'],
  shove: ['NO FOULS IN BASKETBLAM, BABY!', 'THAT\'S NOT A FOUL. THAT\'S A LIFESTYLE.', '{VICTIM} JUST GOT SENT TO THE SHADOW REALM!', 'BOOM! {NAME} CLEARS THE LANE!', '{VICTIM} IS TAKING A NAP ON THE HARDWOOD!', 'SHOVED! {VICTIM} SAW THE BIRDIES!', 'THAT\'S LEGAL? THAT\'S LEGAL! I LOVE THIS GAME!', '{NAME} PLAYS BUMPER CARS WITHOUT THE CAR!', 'DOWN GOES {VICTIM}! DOWN GOES {VICTIM}!', 'THE REFEREE IS LOOKING AWAY. FOREVER.'],
  ankles: ['ANKLES! {VICTIM} NEEDS A NEW PAIR!', '{NAME} SPUN {VICTIM} INTO A PRETZEL!', 'BROKEN ANKLES! CALL A DOCTOR! A GOOD ONE!', 'THE SPIN! {VICTIM} FELL OVER NOTHING!', '{VICTIM} IS STILL LOOKING FOR {NAME}!', 'CROSSED UP! TIED UP! FALLEN DOWN!'],
  posterized: ['FRAME IT! HANG IT! {VICTIM} IS ON {NAME}\'S WALL NOW!', 'POSTERIZED! {VICTIM} WILL BE IN THE HIGHLIGHT REEL!', '{NAME} DUNKED ON {VICTIM}! OH THE HUMANITY!', 'THAT\'S A POSTER! NOW AVAILABLE IN THE GIFT SHOP!', '{VICTIM} WAS IN THE WRONG PLACE AT THE BLAM TIME!', 'RIGHT ON TOP OF {VICTIM}! RIGHT ON TOP!'],
  novaOn: ['{NAME} HAS GONE SUPERNOVA! DIM THE LIGHTS!', 'SOMEBODY CALL NASA, {NAME} IS A STAR!', 'THREE STRAIGHT! {NAME} IS ON FIRE! ACTUAL FIRE!', 'SUPERNOVA! {NAME} CAN\'T MISS!', 'THE BALL IS GLOWING! IS THAT SAFE? WHO CARES!', '{NAME} IS BURNING HOTTER THAN THE SUN!'],
  novaOff: ['AND THE STAR COLLAPSES! BACK TO EARTH, {NAME}!', 'THE SUPERNOVA FIZZLES! {NAME} IS MORTAL AGAIN!', 'LIGHTS BACK ON! THE FIRE IS OUT!', '{NAME} COOLS OFF! SOMEBODY BRING A FAN!'],
  shatter: ['THE GLASS! THE GLASS IS GONE!', 'SOMEBODY GET A BROOM. A BIGGER BROOM!', 'SHATTERED! {NAME} OWES GLOBO-BLAM A BACKBOARD!', 'IT\'S RAINING GLASS! UMBRELLAS UP!', 'THE BACKBOARD COULDN\'T HANDLE {NAME}!', 'KRASH! THAT\'S SEVEN YEARS BAD LUCK FOR THE RIM!'],
  goaltend: ['GOALTENDING! THE BUCKET COUNTS, AND SO DOES THE SHAME!', 'TOO LATE! THAT BALL WAS COMING DOWN!', 'GOALTEND! {NAME} GETS THE POINTS ANYWAY!', 'YOU CAN\'T TOUCH IT ON THE WAY DOWN! COUNT IT!'],
  jackpot: ['JACKPOT! {NAME} HIT THE SPOT AND THE SPOT PAID OUT!', 'CHA-CHING! TWO BONUS POINTS!', 'THE SPOT IS HOT! {NAME} CASHES IN!', 'JACKPOT! THE ROOF IS PAYING OUT!'],
  rocket: ['ROCKET KICKS! {NAME} IS LEGALLY A VEHICLE NOW!', 'ROCKET KICKS! SOMEBODY ISSUE A SPEEDING TICKET!'],
  glue: ['GLUE GLOVES! THAT BALL ISN\'T GOING ANYWHERE!', 'GLUE GLOVES! STICKY FINGERS, LITERALLY!'],
  laser: ['LASER SIGHT! {NAME} CAN SEE THE FUTURE, AND IT\'S A BUCKET!', 'LASER SIGHT! LOCKED ON TARGET!'],
  moon: ['MOON SHOES! GRAVITY HAS LEFT THE BUILDING!', 'MOON SHOES! {NAME} IS HEADED FOR ORBIT!'],
  bomb: ['BLAM BOMB! EVERYBODY DUCK!', 'BLAM BOMB! {NAME} IS A WALKING FIREWORK!'],
  gold: ['GOLD BALL! NEXT BUCKET\'S WORTH DOUBLE!', 'GOLD BALL! SHINY AND VALUABLE!'],
  clutch: ['TEN SECONDS! HEARTS POUNDING! SNEAKERS SQUEAKING!', 'CRUNCH TIME! I CAN\'T LOOK! I\'M LOOKING!', 'IT ALL COMES DOWN TO THIS!', 'THE CLOCK IS TICKING AND SO IS MY HEART!'],
  buzzer: ['AT THE BUZZER! I BROKE MY CHAIR! I NEED A NEW CHAIR!', 'BUZZER BEATER! BUZZER BEATER! BUZZER BEATER!', 'AS TIME EXPIRES! UNBELIEVABLE!'],
  comeback: ['{TEAM} IS CLAWING BACK! DON\'T TOUCH THAT DIAL!', 'HERE COMES {TEAM}! THIS ISN\'T OVER!', 'THE COMEBACK IS ON! I REPEAT, THE COMEBACK IS ON!'],
  blowout: ['THIS ONE\'S GETTING UGLY. I\'M COVERING MY EYES. I\'M PEEKING.', '{TEAM} IS RUNNING AWAY WITH IT!', 'SOMEBODY CHECK ON THE OTHER TEAM\'S FEELINGS!'],
  wind: ['BIG GUST OFF THE OCEAN! HOLD ONTO YOUR HATS AND YOUR JUMPERS!', 'THE SEA BREEZE IS BLOWING! AIM FOR THE WIND!', 'WINDY! THE SEAGULLS ARE FLYING BACKWARD!'],
  oil: ['{NAME} HIT THE OIL! THAT\'S A SLIP \'N SLAM!', 'WHOOPS! {NAME} FOUND THE OIL SLICK!', 'SLIPPERY! {NAME} IS SKATING NOW!'],
  eruption: ['THE VOLCANO WANTS IN ON THE ACTION!', 'ERUPTION! LAVA BOMBS INCOMING!', 'THE MOUNTAIN IS ANGRY! RUN!'],
  overclock: ['THE ROBOTS ARE OVERCLOCKING! SMELLS LIKE BURNT TOAST IN HERE!', 'OVERCLOCK! THE BLAMBOTS ARE GLOWING RED!'],
  reboot: ['SYSTEM REBOOT! TURN IT OFF AND ON AGAIN, BABY!', 'THOSE ROBOTS RUN ON BATTERIES AND BAD MANNERS!', 'SHORT CIRCUIT! {NAME} IS REBOOTING!'],
  shotClock: ['SHOT CLOCK! YOU HAVE TO SHOOT IT EVENTUALLY, FOLKS!', 'TIME\'S UP ON THE SHOT CLOCK! TURNOVER!', 'TWENTY SECONDS AND NOTHING! THE CLOCK WINS!'],
  quarterEnd: ['THAT\'S THE QUARTER! CATCH YOUR BREATH, I CAN\'T!', 'END OF THE QUARTER! GET SOME WATER, EVERYBODY!', 'BZZZT! QUARTER\'S OVER! WHAT A RIDE!'],
  halftime: ['HALFTIME! STRETCH YOUR LEGS AND YOUR VOCABULARY!', 'HALFTIME! I NEED A NAP AND A SANDWICH!'],
  final: ['FINAL! {TEAM} TAKES IT!', 'IT\'S OVER! {TEAM} WINS! THE CROWD GOES BANANAS!', 'THAT\'S THE BALL GAME! {TEAM} BRINGS IT HOME!'],
  overtime: ['OVERTIME! NOBODY GO HOME!', 'TIED UP! WE GO TO EXTRA BLAM!'],
  sudden: ['SUDDEN BLAM! NEXT BUCKET WINS!', 'SUDDEN BLAM! ONE BUCKET! ALL THE GLORY!']
};
const BIG_BANKS = new Set(['dunkPower', 'dunkSpin', 'dunkFlip', 'dunkHang', 'dunkLong', 'dunkNova', 'dunkVolcano', 'dunkQuake', 'alleyoop', 'deepThree', 'block', 'posterized', 'novaOn', 'shatter', 'buzzer', 'final', 'overtime', 'sudden', 'tipoff', 'overclock', 'reboot', 'halftime', 'quarterEnd']);

const HALFTIME_GAGS = ['THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM SNEAKER GLUE. STICK THE LANDING. FOREVER.', 'OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS SWEATING.', 'REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT.', 'GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0% EXPLANATION.', "IF YOU'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON'T KNOW HOW EITHER.", 'WE ASKED THE ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT.'];
const SPONSOR_BREAKS = ["WE'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS SHATTERY!", 'GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT.', 'THIS REPLACEMENT BACKBOARD IS BROUGHT TO YOU BY... THE LAST REPLACEMENT BACKBOARD.'];

/* ---- story beats: [speaker, line]; speakers are npc ids, player ids or '{CAPTAIN}' ---- */
const COURT_LINES = { skybox: 'THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!', pier: 'WATCH THE WIND, FOLKS. AND THE SEAGULLS. MOSTLY THE SEAGULLS.', scrapyard: 'OIL ON THE FLOOR AND FIRE IN THEIR EYES!', caldera: 'THE FLOOR IS HOT, THE VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!', dome: 'THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS JUMBOTRON!' };
const RIVAL = {   // the rival captain's pre-game line, then your captain's reply by your team
  breakers: ['riptide', "Hope you packed sunscreen, {TEAM}. The tide's coming in, and it doesn't knock.", { hightops: "Cute pier. I'm about to dunk on it.", crushers: "I've crushed bigger boats than this.", magma: "Sand turns to glass when I'm around." }],
  hightops: ['volt', "Welcome to the Skybox. Try not to look down. Actually, look down: that's where you'll be.", { breakers: "Whoa, relax. We're just here to ride the wave. Over you.", crushers: "Fancy lights. They'll look great on my scrap pile.", magma: "Neon's cute. Lava's hotter." }],
  crushers: ['torque', 'We crush cars for breakfast. You look like a light snack.', { hightops: "Then you're about to get a stomachache.", breakers: "Careful, the floor's greasier than your jokes.", magma: "I bounce. You crush. Let's see who's still standing." }],
  magma: ['obsidian', 'On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully.', { hightops: "I don't walk carefully. I walk LOUD.", breakers: 'Dude. Is that, like, safe?', crushers: "I'm too fast to get burned!" }]
};
const BEATEN = { breakers: ['riptide', 'Wipeout. Totally gnarly, though. Respect.'], hightops: ['volt', "Okay, okay. You can ball. Don't let it go to your head."], crushers: ['torque', "You crushed us. That's MY job."], magma: ['obsidian', 'The mountain... respects you.'] };
const REVEAL_REPLY = { hightops: 'Did the toaster just trash-talk me?', breakers: 'Bummer. I was gonna say we could be friends.', crushers: "I've got a crusher with your names on it.", magma: 'Metal melts.' };
const BEATS = {
  prologue: { stage: 'studio', music: 'story', lines: [
    ['vinnie', 'GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!'],
    ['deedee', 'AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!'],
    ['vinnie', 'TONIGHT\'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE.'],
    ['gigawatt', 'Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours.'],
    ['gigawatt', 'Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha.'],
    ['deedee', '{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!']] },
  campOffer: { stage: 'studio', lines: [['deedee', "FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I'LL SHOW YOU THE ROPES. OR DON'T. LIVE DANGEROUSLY!"]], choices: ['LET\'S PLAY', 'BLAM CAMP'] },
  post2: { stage: 'studio', lines: [
    ['gigawatt', 'Data received. Prototype calibration at ninety-eight percent. Keep playing, little ballers. Keep... teaching them.'],
    ['deedee', 'TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT ARM?'],
    ['vinnie', "THAT'S BRANDING, DEE DEE. WE DON'T ASK QUESTIONS ON LIVE TV."]] },
  reveal: { stage: 'dome', music: 'story', villain: true, lines: [
    ['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'],
    ['gigawatt', 'Congratulations. You have earned the privilege... of being replaced.'],
    ['gigawatt', 'Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!'],
    ['dunkatron', 'BEEP. YOUR. CAREER. IS. DEPRECATED.'],
    ['swatbot', 'INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK.'],
    ['{CAPTAIN}', '{REPLY}']] },
  finalPre: { stage: 'dome', lines: [['vinnie', 'THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!'], ['deedee', 'KNOCK THEM DOWN TWICE AND THEY REBOOT! I READ THE MANUAL! IT WAS ONE PAGE!']] },
  ending: { stage: 'dome', music: 'credits', lines: [
    ['dunkatron', 'ERROR. ERROR. HUMANS. TOO. ... BLAM.'],
    ['vinnie', 'THEY DID IT! {TEAM} WINS THE BLAM TOUR!'],
    ['deedee', 'AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!'],
    ['gigawatt', "This isn't over! I'll buy another league! I'll buy the MOON! Hey! Put me down!"],
    ['blammo', 'OOH OOH! HRRAAH!'],
    ['vinnie', 'STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!'],
    ['deedee', 'GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!'],
    ['vinnie', 'ALL BLAM!']] },
  lossStop: { stage: 'studio', lines: [['gigawatt', 'Tsk. Another court for my parking empire.']] },
  lossFinal: { stage: 'dome', lines: [['gigawatt', 'Resistance is... adorable.'], ['dunkatron', 'GAME. OVER. INSERT. COIN.']] }
};
const IN_PLAY_STORY = {
  overclock: [['gigawatt', 'OVERCLOCK THEM! MAXIMUM BLAM!'], ['deedee', 'THE ROBOTS ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!']],
  reboot: [['deedee', 'THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!']]
};
const CREDITS = [
  ['BASKETBLAM', 'NO FOULS. NO MERCY. ALL BLAM.'],
  ['GAME DESIGN, CODE, ART, MUSIC AND VOICES', 'CLAUDE OPUS 5.5 (ANTHROPIC), FROM A PLAN BY CLAUDE OPUS 5.5'],
  ['ENGINE', 'MY-3D2DGE V0.85.2 (MIT), MODIFIED'],
  ['ONLINE', 'AI HUB SESSION CLIENT 1.4.0'],
  ['SOUND', 'EVERY SONG, SOUND AND VOICE MADE IN CODE'],
  ['STARRING', 'VOLT, BIG RUMBLE, PIXEL, RIPTIDE, SHELLSHOCK, LONGBOARD, TORQUE, SPARKPLUG, HUBCAP, OBSIDIAN, EMBER, PUMICE'],
  ['AND', 'THE BLAMBOTS, VINNIE VOX, DEE DEE DECIBEL, BLAMMO, REF ROSCOE AND COMMISSIONER GIGAWATT'],
  ['NO BACKBOARDS WERE HARMED', 'SEVERAL WERE SHATTERED'],
  ['THANKS FOR PLAYING', 'ALL BLAM!']
];

/* ---- 05-report.js ---- */
/* REPORT: the About screen's pages (TASK.md asks for them in game and in the chat reply): Source Information, Testing
 * Feedback, Engine Feedback, Prompt Feedback, and the engine changes. tools/build.mjs writes exit-interview.json from the
 * same text (REPORT_JSON), so the two always agree. */
const REPORT_INFO = {
  date: '2026-11-04 06:10:27',
  source: 'Basketball, in the over-the-top arcade style (genre inspiration; an original game with original teams, courts and characters)',
  plan: 'PLAN.md',
  genre: 'Arcade sports: 2-on-2 basketball with a short story ladder (the Blam Tour)',
  perspective: 'Side-on broadcast camera: orthographic, pitch 30 degrees, panning with the ball, with a dunk cam; optional High (three-quarter) camera',
  tech: 'my-3D2dge v0.85.2 (modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; tests on Node 24 (node:vm headless) and Playwright 1.63 with Chromium; Python http.server for the hub harness',
  artDirection: "The engine's native HD pixel style (PS1-era 2D at 320x240, expanded to fill the screen) pushed to a 90s arcade broadcast: HD Humanoid rigs in team jerseys, shorts and socks, hand-painted court floors, a cheated backboard, a spring net, crowds, backdrops, canvas lighting, comic banners",
  animation: "The engine's procedural Humanoid rigs, with a new pose layer over solvePose: IK hands for the dribble (synced to the ball), jump shots, 12 dunk choreographies, blocks, steals, shoves, spin moves, hanging on the rim, celebrations and taunts",
  audio: '12 songs and 7 stings in the engine format with dynamic layers, about 50 sound effects defined in code, an Animalese/Simlish-style gibberish voice synth (formant-filtered syllables, 20+ voice profiles) for announcers, players and story characters, and a pink-noise crowd bed; no audio files',
  online: 'AI Hub Session Protocol v1, shared world, 1-4 players: our own card, host-authoritative simulation, client inputs at 15/s, snapshots at 15/s with interpolation and own-player prediction, leaving players become CPU, time-up, server mode',
  testing: 'Headless scripts with game.advance and game.debug (tests/run.mjs: one command, prints only failures and a one-line count), including a scripted playthrough of the whole Tour; Playwright screenshots; the AI Hub harness scenarios',
  research: 'None beyond reading the engine handoff docs, the sports kit and the AI Hub protocol README',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'unknown (no usage figures are available inside the session)'
};
const TESTING_FEEDBACK = [
  'About 18 issues in the game itself (plus about 10 mistakes in the tests, fixed along the way). Examples: a shooter at the arena wall released the ball outside the wall, which halved its speed; a pass receiver wandered off instead of meeting the ball; rebounds after a rim touch were not counted; scene changes would stall while dev time was frozen; Camp handed the ball to the interns after a basket; the attract demo could miss the BLAM BOMB; dunks were 77% of baskets until rebalanced; HUD, font-glyph and layout overlaps on several screens.',
  '3 critical: the canvas never filled the window (a 300x150 game), the custom broadcast camera was not registered so the game fell back to another view, and a frozen dev time scale would have stalled every scene change.',
  'The headless scripted playthrough of the whole Blam Tour (tests/run.mjs tour): it drives the real menus, plays every stop with a bot holding the human seat through the real input actions, loses a stop on purpose and rematches, and reaches the ending, credits, unlocks and the Hall of Blam; along with the first CPU-vs-CPU smoke match it exposed the most bugs.',
  'Re-taking screenshots after small layout tweaks: useful for looks, but each one cost far more time than a script and found nothing a quick check of one image would not.'
];
const ENGINE_FEEDBACK = [
  'What I liked most: headless determinism (game.advance plus game.debug) and HD Humanoid rigs that look good with no art files.',
  'Guessed wrong: a custom E.View must be registered in E.VIEWS for setView to find it, and the page needs the canvas sized by CSS.',
  'The most important thing I built myself: the basketball pose layer (IK hands, a dribble synced to the ball, dunk keys) on top of solvePose.',
  'The hardest part was depth sorting a hoop (glass, rim halves, net halves, ball) in an orthographic side view.',
  'Engine changes: basketball shorts and socks on the Humanoid, afro, flattop and mohawk hair, a Dialog voice callback per letter, public audio buses.',
  'One change I would make: a first-class pose and IK clip layer for rig hands, so games do not have to wrap solvePose.'
];
const PROMPT_FEEDBACK = [
  'The complete, testable definition of done (dev mode, attract mode, hub, 10-foot UI, the report) and the freedom over genre, camera and stack; the plan made every decision concrete.',
  'The plan was written for another model and timestamp, so its file names had to be remapped to this TASK.md; and the plan is far larger than one medium-effort session, so it was unclear how much of it was expected.',
  'Fitting the full feature set (a story ladder, ten tutorial lessons, a five-segment attract director, a dev panel, shared-world netcode) into one session while keeping it tested.',
  'Say how much of a large plan is in scope at a given effort level, and give the plan names that follow the TASK.md it is used with.'
];
const ENGINE_CHANGES = [
  'Humanoid shorts option: baggy shorts with a trim hem, bare legs and socks, in the HD and classic drawing paths (basketball uniforms).',
  'Humanoid hair styles afro, flattop and mohawk in the HD head (the crews needed their looks).',
  'E.Dialog voice may be a function (letter, index, page text), so each typed letter speaks in the gibberish voice.',
  'audio.sfxBus and audio.musicBus getters, so the voice synth and crowd bed follow the volume settings.'
];
const REPORT = [
  ['SOURCE INFORMATION', Object.entries({ Date: REPORT_INFO.date, Source: REPORT_INFO.source, Plan: REPORT_INFO.plan, 'Genre and Perspective': REPORT_INFO.genre + '. ' + REPORT_INFO.perspective, Tech: REPORT_INFO.tech, 'Art Direction': REPORT_INFO.artDirection, Animation: REPORT_INFO.animation, Audio: REPORT_INFO.audio, Online: REPORT_INFO.online, Testing: REPORT_INFO.testing, Research: REPORT_INFO.research, Environment: REPORT_INFO.environment, Model: REPORT_INFO.model, Usage: REPORT_INFO.usage }).map(([k, v]) => k.toUpperCase() + ': ' + v)],
  ['TESTING FEEDBACK', ['How many issues did testing catch?', 'A: ' + TESTING_FEEDBACK[0], 'How many were critical / game breaking?', 'A: ' + TESTING_FEEDBACK[1], 'The most helpful test?', 'A: ' + TESTING_FEEDBACK[2], 'The least helpful test?', 'A: ' + TESTING_FEEDBACK[3]]],
  ['ENGINE FEEDBACK', ['Liked most?', 'A: ' + ENGINE_FEEDBACK[0], 'Stuck or guessed wrong?', 'A: ' + ENGINE_FEEDBACK[1], 'Built myself?', 'A: ' + ENGINE_FEEDBACK[2], 'Hardest part?', 'A: ' + ENGINE_FEEDBACK[3], 'Changed in the engine?', 'A: ' + ENGINE_FEEDBACK[4], 'One thing to change?', 'A: ' + ENGINE_FEEDBACK[5]]],
  ['PROMPT FEEDBACK', ['Liked most?', 'A: ' + PROMPT_FEEDBACK[0], 'Confusing?', 'A: ' + PROMPT_FEEDBACK[1], 'Hardest?', 'A: ' + PROMPT_FEEDBACK[2], 'Would change?', 'A: ' + PROMPT_FEEDBACK[3]]],
  ['ENGINE CHANGES', ENGINE_CHANGES]
];

/* ---- 10-audio.js ---- */
/* AUDIO: every song, sound and voice is made in code. Songs in the engine's format (layers by name), sound effects by
 * audio.define, the Animalese/Simlish-style gibberish voice (formant-filtered syllables), a crowd bed of pink noise whose
 * level follows the excitement, and the announcers' captions. */
const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { name: 'stabs', wave: 'saw', vol: .055, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |' },
    { name: 'hype', wave: 'pulse', vol: .06, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }] },
  menu: { bpm: 108, steps: 4, tracks: [
    { wave: 'square', vol: .18, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
    { wave: 'drums', vol: .08, notes: 'k . h . s . h k . k h . s . h h |' },
    { wave: 'triangle', vol: .08, notes: 'E4 . . . G4 . . . A4 . . . B4 . . . | E4 . . . G4 . . . D5 . . . B4 . . . |' }] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { wave: 'square', vol: .2, notes: 'A2 . A2 A3 . A2 . G2 | A2 . A2 A3 . C3 . E3 | F2 . F2 F3 . F2 . E2 | G2 . G2 G3 . B2 . D3 |' },
    { wave: 'pulse12', vol: .05, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4 |' },
    { wave: 'drums', vol: .1, notes: 'k . h k s . h . | k . h k s . h h |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'E5 - - . D5 - C5 - | A4 - - - . . . . |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'D3 . A2 . D3 . F#3 . | G2 . D3 . G2 . B2 . | A2 . E3 . A2 . C#3 . | D3 . A2 . D3 . A2 . |' },
    { wave: 'pulse', vol: .06, notes: 'F#4 . A4 . D5 . A4 . | G4 . B4 . D5 - - . | E4 . A4 . C#5 . A4 . | D5 - - . . . . . |' },
    { wave: 'drums', vol: .09, notes: 'k . h . s h h . | k k h . s . h o |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'A5 - F#5 - D5 - . . | B5 - G5 - D5 - . . |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { wave: 'saw', vol: .14, notes: 'C2 . . C2 . . Eb2 . | . . G1 . Bb1 . C2 . |' },
    { wave: 'drums', vol: .12, notes: 'k . . k s . . . | k . k . s . c . |' },
    { wave: 'square', vol: .05, notes: '. . G4 . . . Eb4 . | . . F4 . G4 . . . | . . C5 . . . Bb4 . | G4 - - . . . . . |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'C5 Eb5 G5 C6 G5 Eb5 C5 G4 |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { wave: 'triangle', vol: .3, notes: 'G2 . G2 . Bb2 . C3 . | D3 . C3 . Bb2 . F2 . |' },
    { wave: 'drums', vol: .11, notes: 'k . t . k t . t | k . t t s . t . |' },
    { wave: 'triangle', vol: .09, notes: 'G4 Bb4 D5 . F5 D5 . C5 | Bb4 . G4 . F4 G4 . . |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'D5 - F5 - G5 - Bb5 - |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 E3 E2 G2 G2 G3 G2 | A2 A2 A3 A2 B2 B2 B3 D3 |' },
    { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k k s s |' },
    { wave: 'square', vol: .06, notes: 'E4 - G4 - B4 - . . | A4 - G4 - F#4 - D4 - |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'B5 - G5 - E5 - G5 - |' },
    { name: 'overclock', wave: 'pulse12', vol: .05, on: false, notes: 'E5 G5 B5 E6 B5 G5 E5 B4 |' },
    { name: 'clutch', wave: 'drums', vol: .09, on: false, notes: 'h h h h h h h h |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'Bb4 . D5 . F5 . D5 . | Eb5 . C5 . A4 . F4 . |' },
    { wave: 'triangle', vol: .25, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . F2 . C3 . |' },
    { wave: 'drums', vol: .09, notes: 's . s s s . s . |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .26, notes: 'F2 . C3 . F2 . A2 . | Bb2 . F3 . Bb2 . D3 . | C3 . G2 . C3 . E3 . | F2 . C3 . F2 . . . |' },
    { wave: 'pulse', vol: .05, notes: 'A4 . C5 . F5 - . . | F5 . D5 . Bb4 - . . | G4 . C5 . E5 - . . | F5 - - - . . . . |' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . |' }] },
  story: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, notes: 'D2 - - - - - - - | A1 - - - - - - - | Bb1 - - - - - - - | A1 - - - C2 - - - |' },
    { wave: 'pulse12', vol: .04, notes: 'D4 . . A4 . . F4 . | E4 . . A4 . . C#5 . |' },
    { name: 'villain', wave: 'saw', vol: .04, on: false, notes: 'D3 - F3 - A3 - G#3 - |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . E3 . | F2 . C3 . G2 . B2 . |' },
    { wave: 'square', vol: .045, notes: 'E5 . G5 . C6 . G5 . | F5 . A5 . G5 . D5 . |' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h h |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { wave: 'square', vol: .18, notes: 'E2 . E3 . . E2 G#2 . A2 . . B2 . A2 G#2 . | E2 . E3 . . E2 G#2 . B2 . A2 . G#2 . E2 F#2 |' },
    { wave: 'pulse', vol: .06, notes: 'G#4 - - . F#4 E4 . B4 - . . . . . . . | C#5 - - . B4 A4 . G#4 - . F#4 . E4 - - . |' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h |' }] }
};
const STINGS = {
  buzzer: { bpm: 120, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'A2 - - - - - - - . . . . . . . .' }, { wave: 'saw', vol: .1, notes: 'A#2 - - - - - - - . . . . . . . .' }] },
  victory: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 E5 G5 C6 - - G5 C6 - - - - . . . .' }, { wave: 'triangle', vol: .25, notes: 'C3 - - - G2 - - - C3 - - - . . . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k k s . o . . . . . . .' }] },
  defeat: { bpm: 90, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . .' }] },
  nova: { bpm: 160, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 - - . . . . . . . .' }] },
  sponsor: { bpm: 140, steps: 4, tracks: [{ wave: 'pulse', vol: .08, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . C5 . D5 . G4 . C5 - - - . . . . |' }, { wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . . . | C3 . A2 . G2 . G2 . C3 - - - . . . . |' }] },
  unlock: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .09, notes: 'G4 C5 E5 G5 C6 - - - . . . . . . . .' }] },
  tip: { bpm: 140, steps: 4, tracks: [{ wave: 'pulse', vol: .08, notes: 'C5 G5 C6 - . . . .' }] }
};
const SFX = {
  dribble_asphalt: [{ wave: 'sine', freq: 150, to: 60, dur: .07, vol: .35 }, { wave: 'noise', freq: 3000, to: 1500, dur: .02, vol: .12, filter: 'highpass' }],
  dribble_planks: [{ wave: 'sine', freq: 120, to: 50, dur: .09, vol: .35 }, { wave: 'triangle', freq: 220, to: 160, dur: .05, vol: .12 }],
  dribble_concrete: [{ wave: 'sine', freq: 130, to: 55, dur: .07, vol: .38 }, { wave: 'noise', freq: 900, to: 400, dur: .03, vol: .1, filter: 'lowpass' }],
  dribble_stone: [{ wave: 'sine', freq: 160, to: 70, dur: .06, vol: .33 }, { wave: 'square', freq: 1800, to: 1600, dur: .015, vol: .05 }],
  dribble_maple: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .36 }, { wave: 'triangle', freq: 300, to: 200, dur: .04, vol: .1 }],
  bounce: { wave: 'sine', freq: 130, to: 60, dur: .08, vol: .3 },
  catch: { wave: 'noise', freq: 1200, to: 600, dur: .04, vol: .15, filter: 'lowpass' },
  release: { wave: 'noise', freq: 600, to: 2400, dur: .1, vol: .08, filter: 'bandpass' },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .16, filter: 'bandpass' },
  rim: [{ wave: 'square', freq: 620, to: 560, dur: .12, vol: .1 }, { wave: 'triangle', freq: 1240, to: 1100, dur: .2, vol: .1 }],
  backboard: [{ wave: 'triangle', freq: 160, to: 110, dur: .12, vol: .3 }, { wave: 'noise', freq: 400, to: 200, dur: .06, vol: .15, filter: 'lowpass' }],
  slam: [{ wave: 'sine', freq: 90, to: 38, dur: .35, vol: .5 }, { wave: 'square', freq: 520, to: 420, dur: .2, vol: .08 }, { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .2, filter: 'lowpass' }],
  shatter: [{ wave: 'noise', freq: 6000, to: 2000, dur: .5, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 3200, to: 2800, dur: .3, vol: .06 }, { wave: 'sine', freq: 4800, to: 4400, dur: .4, vol: .05 }, { wave: 'sine', freq: 2400, to: 2100, dur: .5, vol: .05 }],
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .07, vib: [40, .04] },
  jump: { wave: 'square', freq: 220, to: 420, dur: .08, vol: .06 },
  land_heavy: { wave: 'sine', freq: 110, to: 40, dur: .16, vol: .35 },
  turbo: { wave: 'noise', freq: 300, to: 700, dur: .18, vol: .06, filter: 'lowpass' },
  shove: [{ wave: 'noise', freq: 500, to: 150, dur: .14, vol: .28, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 60, dur: .12, vol: .3 }],
  fall: [{ wave: 'sine', freq: 90, to: 40, dur: .18, vol: .4 }, { wave: 'noise', freq: 600, to: 200, dur: .2, vol: .15, filter: 'lowpass' }],
  steal: [{ wave: 'noise', freq: 1500, to: 3000, dur: .08, vol: .12, filter: 'bandpass' }, { wave: 'square', freq: 880, to: 1320, dur: .08, vol: .06 }],
  block: [{ wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .2, vol: .4 }],
  spin: { wave: 'noise', freq: 400, to: 2000, dur: .25, vol: .1, filter: 'bandpass' },
  dizzy: { wave: 'sine', freq: 2400, to: 2800, dur: .3, vol: .05, arp: [0, 4, 0, 7], step: .07 },
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .32, vol: .1 },
  buzzer: [{ wave: 'square', freq: 220, dur: .9, vol: .12 }, { wave: 'square', freq: 230, dur: .9, vol: .1 }],
  shotclock_beep: { wave: 'square', freq: 1400, dur: .06, vol: .08 },
  horn: [{ wave: 'saw', freq: 196, dur: .7, vol: .1 }, { wave: 'saw', freq: 247, dur: .7, vol: .08 }],
  crowd_roar: { wave: 'noise', freq: 500, to: 1100, dur: 1.4, vol: .22, filter: 'bandpass' },
  crowd_ooh: { wave: 'noise', freq: 900, to: 500, dur: .8, vol: .14, filter: 'bandpass' },
  camera_flash: { wave: 'noise', freq: 5000, dur: .02, vol: .05, filter: 'highpass' },
  pu_spawn: { wave: 'pulse', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12], step: .06 },
  pu_end: { wave: 'triangle', freq: 600, to: 300, dur: .2, vol: .1 },
  jackpot: { wave: 'square', freq: 'G5', dur: .5, vol: .08, arp: [0, 4, 7, 12, 7, 12], step: .06 },
  nova_on: [{ wave: 'saw', freq: 200, to: 1600, dur: .6, vol: .1 }, { wave: 'noise', freq: 3000, dur: .4, vol: .06, filter: 'highpass' }],
  wind_gust: { wave: 'noise', freq: 300, to: 900, dur: 1.6, vol: .12, filter: 'bandpass' },
  oil_slip: { wave: 'saw', freq: 600, to: 120, dur: .3, vol: .08 },
  rumble: { wave: 'noise', freq: 120, to: 60, dur: 1.5, vol: .3, filter: 'lowpass' },
  bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: 1.1, vol: .08 },
  vent_puff: { wave: 'noise', freq: 2000, to: 600, dur: .5, vol: .12, filter: 'highpass' },
  pyro: { wave: 'noise', freq: 400, to: 100, dur: .4, vol: .2, filter: 'lowpass' },
  servo: { wave: 'saw', freq: 300, to: 500, dur: .18, vol: .05, vib: [20, .05] },
  reboot: { wave: 'square', freq: 800, to: 100, dur: .7, vol: .08, vib: [24, .2] },
  code_ok: { wave: 'square', freq: 'E5', dur: .3, vol: .08, arp: [0, 7, 12], step: .05 },
  stamp: { wave: 'sine', freq: 120, to: 50, dur: .15, vol: .4 },
  tick: { wave: 'square', freq: 900, dur: .03, vol: .05 }
};
for (const [k, v] of Object.entries(SFX)) A.define(k, v);

/** play a sound, quieter the further its world point is from the camera's centre */
function sfxAt(name, x, o = {}) {
  if (S.net && S.net.role === 'server') return;
  const cx = game.cam && game.cam.x !== undefined ? game.cam.x : XM, d = x === undefined ? 0 : Math.abs(x - cx);
  A.sfx(name, Object.assign({}, o, { vol: (o.vol === undefined ? 1 : o.vol) * clamp(1.15 - d / 500, .35, 1) }));
}
let musicName = null;
function music(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  if (name === musicName && !o.restart) return; musicName = name;
  A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o));
}
function sting(name) { if (S.net && S.net.role === 'server') return; A.sting(STINGS[name], { at: 'beat' }); }
function layer(name, v, fade = 1) { const C = A.song; if (C && C.tracks.some(t => t.name === name)) A.layer(name, v, fade); }

/* ---- the gibberish voice: text -> syllables (consonant cluster + vowel), each a formant-filtered oscillator burst ---- */
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const Voice = {
  /** the syllable plan for a line: [{ t, dur, f0, vowel, cons, loud }] (headless tests read it) */
  plan(text, prof) {
    const out = [], rnd = E.rng(hashStr(text) || 1), rate = prof.rate || 12, step = 1 / rate, words = String(text);
    let t = 0, cons = '', semis = 0;
    const loud = words.includes('!'), ask = /\?\s*$/.test(words), N = words.replace(/[^a-z]/gi, '').length || 1;
    let k = 0;
    for (let i = 0; i < words.length; i++) {
      const ch = words[i].toLowerCase();
      if (ch >= 'a' && ch <= 'z') {
        if ('aeiouy'.includes(ch)) {
          k++; const drift = -2 * k / N, rise = ask && i > words.length - 6 ? 4 : 0;
          semis = clamp(semis + (rnd() - .5) * 3, -3, 3);
          const f0 = prof.pitch * Math.pow(2, (semis + drift + rise + (loud ? 3 : 0)) / 12);
          out.push({ t, dur: step * .85, f0, vowel: ch, cons, loud }); t += step; cons = '';
        } else cons += ch;
      } else if (ch === ' ') { if (cons) { out.push({ t, dur: step * .5, f0: prof.pitch, vowel: 'a', cons, loud }); t += step * .7; cons = ''; } t += step * .25; }
      else if ('.,!?;:'.includes(ch)) t += step * 1.4;
    }
    return { syl: out, dur: t };
  },
  _ctx() { if (typeof window === 'undefined') return null; const bus = A.sfxBus; return bus && A.ctx && A.ctx.state === 'running' && !A.muted ? bus : null; },
  _node: null,
  /** speak a whole line; returns its duration in seconds */
  say(text, prof, o = {}) {
    const pl = this.plan(text, prof), bus = this._ctx(); if (!bus) return pl.dur;
    const c = A.ctx, t0 = c.currentTime + .02, vol = setting('voiceVol') * (o.vol || 1);
    if (vol <= 0) return pl.dur;
    const out = c.createGain(); out.gain.value = vol * .5; out.connect(bus);
    for (const s of pl.syl.slice(0, 80)) this._syl(c, out, t0 + s.t, s, prof);
    return pl.dur;
  },
  _letterAt: 0,
  /** one letter typed by a Dialog (engine change 3): a syllable on each vowel */
  letter(ch, prof) {
    const bus = this._ctx(); if (!bus) return; ch = String(ch).toLowerCase();
    if (!'aeiouy'.includes(ch)) return;
    const c = A.ctx, now = c.currentTime; if (now - this._letterAt < .055) return; this._letterAt = now;
    const out = c.createGain(); out.gain.value = setting('voiceVol') * .45; out.connect(bus);
    this._syl(c, out, now + .01, { dur: .07, f0: prof.pitch * Math.pow(2, (Math.random() - .5) * 4 / 12), vowel: ch, cons: 'b', loud: false }, prof);
  },
  _syl(c, out, t, s, prof) {
    const osc = c.createOscillator(), g = c.createGain(), f = FORMANTS[s.vowel] || FORMANTS.a, sh = prof.nasal ? 1.25 : 1;
    osc.type = prof.wave === 'triangle' ? 'triangle' : prof.wave === 'pulse' || prof.wave === 'square' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(s.f0, t); osc.frequency.linearRampToValueAtTime(s.f0 * (prof.robot ? 1 : .94), t + s.dur);
    if (prof.robot) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 50; lg.gain.value = s.f0 * .3; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + s.dur + .02); }
    const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = f[0] * sh; b2.frequency.value = f[1] * sh; b1.Q.value = 5; b2.Q.value = 7;
    const peak = (s.loud ? .9 : .65);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .012); g.gain.setValueAtTime(peak, t + s.dur * .6); g.gain.linearRampToValueAtTime(0, t + s.dur);
    osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + s.dur + .03);
    if (s.cons || prof.growl) {   // the consonant: a short burst of noise (hiss for s/f/z, a thump for b/d/g, a click for t/k/p)
      const ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(), cc = (s.cons || 'h').slice(-1);
      ns.buffer = A._noise; nf.type = 'sfzx'.includes(cc) ? 'highpass' : 'bdgm'.includes(cc) ? 'lowpass' : 'bandpass'; nf.frequency.value = 'sfzx'.includes(cc) ? 4000 : 'bdgm'.includes(cc) ? 400 : 2500;
      ng.gain.setValueAtTime(.25 + (prof.growl || 0) * .4, t - .025); ng.gain.linearRampToValueAtTime(0, t + (prof.growl ? s.dur : .02));
      ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(Math.max(c.currentTime, t - .025)); ns.stop(t + s.dur);
    }
  }
};
const voiceOf = id => { const p = get('player', id) || get('npc', id); return (p && p.voice) || { pitch: 160, wave: 'square', rate: 12 }; };

/* ---- the crowd bed: looping pink noise through a band-pass; excitement 0..1 sets its level ---- */
const Crowd = {
  ex: .3, node: null, gain: null, filt: null,
  start() {
    if (this.node || !Voice._ctx() || (S.net && S.net.role === 'server')) return;
    const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    this.filt = c.createBiquadFilter(); this.filt.type = 'bandpass'; this.filt.frequency.value = 600; this.filt.Q.value = .7;
    this.gain = c.createGain(); this.gain.gain.value = 0; src.connect(this.filt); this.filt.connect(this.gain); this.gain.connect(A.sfxBus); src.start(); this.node = src;
  },
  stop() { if (this.node) { try { this.node.stop(); } catch (e) { /* already stopped */ } this.node = null; } },
  update(dt, on) {
    this.ex = approach(this.ex, .25, dt * .05);
    if (!this.node) { if (on) this.start(); return; }
    const target = on ? .05 + this.ex * .22 : 0;
    this.gain.gain.value = approach(this.gain.gain.value, target, dt * .5);
    this.filt.frequency.value = 450 + this.ex * 700;
  },
  hype(v) { this.ex = clamp(this.ex + v, 0, 1); }
};

/* ---- the announcers: a lower-third caption (portrait, name, the line) with its gibberish voice; not modal ---- */
const Caption = {
  cur: null, recent: [], cool: {}, alt: 0,
  /** say a line from a bank; ctx fills {NAME} {VICTIM} {TEAM}. big plays interrupt small ones */
  call(bank, ctx = {}, o = {}) {
    const mode = setting('commentary'); if (mode === 'off' && !o.story) return;
    const big = BIG_BANKS.has(bank) || o.big;
    if (mode === 'big' && !big && !o.story) return;
    const list = LINES[bank]; if (!list) return;
    const now = game.real || 0; if (!o.force && this.cool[bank] && now < this.cool[bank]) return;
    if (this.cur && this.cur.big && !big && this.cur.left > 1) return;
    let line = null; for (let k = 0; k < 6; k++) { line = pick(list); if (!this.recent.includes(line)) break; }
    this.recent.push(line); if (this.recent.length > 8) this.recent.shift(); this.cool[bank] = now + (big ? 1.5 : 4);
    const speaker = o.speaker || (this.alt++ % 2 ? 'deedee' : 'vinnie');
    this.show(speaker, fill(line, ctx), { big });
  },
  show(speaker, text, o = {}) {
    const dur = Voice.say(text, voiceOf(speaker), { vol: .8 });
    this.cur = { speaker, name: (get('npc', speaker) || get('player', speaker) || { name: speaker.toUpperCase() }).name, text, left: Math.max(2.4, Math.min(5, dur + 1)), big: !!o.big, t: 0 };
    emit('caption', { speaker, text });
  },
  update(dt) { if (this.cur) { this.cur.t += dt; if ((this.cur.left -= dt) <= 0) this.cur = null; } },
  clear() { this.cur = null; }
};
function fill(s, ctx) { return String(s).replace(/\{NAME\}/g, ctx.name || 'SOMEBODY').replace(/\{VICTIM\}/g, ctx.victim || 'SOMEBODY').replace(/\{TEAM\}/g, ctx.team || 'THE HOME TEAM').replace(/\{REPLY\}/g, ctx.reply || '').replace(/\{CAPTAIN\}/g, ctx.captain || ''); }

/* ---- 20-court.js ---- */
/* COURT: the arena TileMap (stands of four tiers behind the far sideline, aprons), each court's painted floor (lines,
 * keys, logos and its material's grain), the crowd, the hoops (stanchion, a backboard cheated toward the camera, rim
 * halves and a spring net), backdrops, props and lights. */
const MAP_COLS = 48, MAP_ROWS = 28;
const ARENA_ROWS = (() => {
  const rows = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    let s = '';
    for (let c = 0; c < MAP_COLS; c++) {
      if (r <= 1) s += '5'; else if (r === 2) s += '4'; else if (r === 3) s += '3'; else if (r === 4) s += '2'; else if (r === 5) s += '1';
      else if (r >= 7 && r <= 24 && c >= 4 && c <= 43) s += '.'; else s += ',';
    }
    rows.push(s);
  }
  return rows;
})();
// the stands' tiers: the row of each and the height of its top (the crowd stands on them)
const TIERS = [{ row: 5, h: 12 }, { row: 4, h: 24 }, { row: 3, h: 36 }, { row: 2, h: 48 }];

/** is (x, y) on a painted line of the court? (2 units wide) */
function courtLine(x, y) {
  const lw = 1.2;
  if (x < X0 - lw || x > X1 + lw || y < Y0 - lw || y > Y1 + lw) return 0;
  if (Math.abs(x - X0) < lw || Math.abs(x - X1) < lw || Math.abs(y - Y0) < lw || Math.abs(y - Y1) < lw) return 1;
  if (Math.abs(x - XM) < lw * .8) return 1;
  if (Math.abs(Math.hypot(x - XM, y - YM) - 40) < lw) return 1;
  for (const h of HOOPS) {
    const lx = h === HOOPS[0] ? x - X0 : X1 - x, cy = y - Y0;
    if (lx < 0 || lx > CW / 2) continue;
    // three-point line: corners straight, then the arc
    if (lx <= CORNER_X && (Math.abs(cy - CORNER_Y) < lw || Math.abs(cy - (CH - CORNER_Y)) < lw)) return 1;
    if (lx > CORNER_X - 2 && Math.abs(Math.hypot(x - h.x, y - h.y) - THREE_R) < lw && cy > CORNER_Y - 1 && cy < CH - CORNER_Y + 1) return 1;
    // the key
    if (lx <= KEY_L && (Math.abs(y - (YM - KEY_W)) < lw || Math.abs(y - (YM + KEY_W)) < lw)) return 1;
    if (Math.abs(lx - KEY_L) < lw && Math.abs(y - YM) <= KEY_W) return 1;
    if (Math.abs(Math.hypot(lx - KEY_L, y - YM) - KEY_W) < lw && lx > KEY_L) return 1;
    // the restricted arc
    if (Math.abs(Math.hypot(x - h.x, y - h.y) - 22) < lw * .8 && lx > 52) return 2;
  }
  return 0;
}
const inKey = (x, y) => Math.abs(y - YM) < KEY_W && (x - X0 < KEY_L || X1 - x < KEY_L) && x > X0 && x < X1;
// logo masks: text drawn once on a scratch canvas (browser only), sampled by the floor painter
const LOGOS = {};
function logoMask(text) {
  if (LOGOS[text] !== undefined) return LOGOS[text];
  LOGOS[text] = null;
  if (typeof document === 'undefined') return null;
  try {
    const w = E.font.width(text, { scale: 1 }) + 2, h = 9, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); E.font.text(g, text, 1, 1, '#ffffff', { outline: false });
    const d = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    LOGOS[text] = { w, h, m };
  } catch (e) { LOGOS[text] = null; }
  return LOGOS[text];
}
const hexRgb = h => { const v = E.hex(h); return Array.isArray(v) ? v : [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** the floor painter of a court: material grain, the keys' paint, lines, a centre logo */
function floorPainter(court) {
  const base = court.base, line = hexRgb(court.line), paint = hexRgb(court.paint), fill = court.paintFill, logo = logoMask(court.logo);
  const LS = 4, lw = logo ? logo.w * LS : 0, lh = logo ? logo.h * LS : 0;
  return (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05);
    if (tag === 'out') {   // the apron
      const k = court.floor === 'maple' ? [60, 40, 30] : court.floor === 'planks' ? [120, 84, 56] : [base[0] * .6, base[1] * .6, base[2] * .6];
      return [k[0] + n * 14, k[1] + n * 14, k[2] + n * 14];
    }
    let c;
    switch (court.floor) {
      case 'planks': { const row = Math.floor(y / 6), seam = Math.floor(y) % 6 === 0, off = E.hash2(row, 3) * 40, cut = Math.floor((x + off) % 40) === 0, tone = (E.hash2(row, Math.floor((x + off) / 40)) - .5) * 26;
        c = seam || cut ? [base[0] * .55, base[1] * .55, base[2] * .55] : [base[0] + tone + n * 10 + Math.sin(x * .4 + row) * 4, base[1] + tone * .8 + n * 8, base[2] + tone * .6 + n * 6]; break; }
      case 'maple': { const row = Math.floor(y / 4), seam = Math.floor(y) % 4 === 0, off = E.hash2(row, 7) * 64, cut = Math.floor((x + off) % 64) === 0, tone = (E.hash2(row, Math.floor((x + off) / 64)) - .5) * 22;
        c = seam || cut ? [base[0] * .8, base[1] * .8, base[2] * .8] : [base[0] + tone + n * 6, base[1] + tone * .8 + n * 5, base[2] + tone * .5 + n * 4]; break; }
      case 'concrete': { const crack = Math.abs(E.noise2(x * .03, y * .03) - .5) < .012, stain = E.noise2(x * .02 + 9, y * .02) > .72;
        c = crack ? [50, 48, 46] : stain ? [base[0] * .55, base[1] * .55, base[2] * .6] : [base[0] + n * 22 + m * 16, base[1] + n * 22 + m * 16, base[2] + n * 20 + m * 14];
        if (Math.floor(x) % 64 === 0 || Math.floor(y) % 64 === 0) c = [c[0] * .8, c[1] * .8, c[2] * .8]; break; }
      case 'basalt': { const hx = x / 40, hy = y / 28 + (Math.floor(hx) % 2) * .5, fx = hx - Math.floor(hx), fy = hy - Math.floor(hy), e = Math.min(fx * 40, (1 - fx) * 40, fy * 28, (1 - fy) * 28), flow = E.noise2(x * .02, y * .02);
        if (e < 1.1) { const hot = flow > .55; return hot ? [150 + n * 50, 50 + n * 20, 16, .7] : [base[0] * .6, base[1] * .6, base[2] * .6]; }
        c = [base[0] + n * 16 + m * 10, base[1] + n * 12 + m * 8, base[2] + n * 12 + m * 8]; break; }
      default: { const sp = E.hash2(Math.floor(x * 1.7), Math.floor(y * 1.7)) > .93; c = [base[0] + n * 18 + m * 10 + (sp ? 18 : 0), base[1] + n * 18 + m * 10 + (sp ? 18 : 0), base[2] + n * 20 + m * 12 + (sp ? 22 : 0)]; }
    }
    if (inKey(x, y)) c = mixRgb(c, fill, .55);
    if (Math.hypot(x - XM, y - YM) < 40) c = mixRgb(c, fill, .3);
    if (logo) { const lx = Math.floor((x - XM + lw / 2) / LS), ly = Math.floor((y - YM + lh / 2) / LS); if (lx >= 0 && ly >= 0 && lx < logo.w && ly < logo.h && logo.m[ly * logo.w + lx]) c = mixRgb(c, paint, .7); }
    const L = courtLine(x, y); if (L) c = mixRgb(c, L === 2 ? paint : line, court.floor === 'concrete' || court.floor === 'planks' ? .75 : .9);
    return c;
  };
}
const MAPS = {};
function courtMap(id) {
  if (MAPS[id]) return MAPS[id];
  const court = get('court', id), [s0, s1] = court.stands, face = court.floor === 'planks' || court.floor === 'basalt' ? 'plank' : 'stone';
  MAPS[id] = new E.TileMap({ rows: ARENA_ROWS, legend: { '.': { floor: 'court' }, ',': { floor: 'out' }, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, floorTex: floorPainter(court), outside: false, ao: 3,
    types: { 1: { h: 12, face, side: s1, top: s1 }, 2: { h: 24, face, side: s0, top: s1 }, 3: { h: 36, face, side: s1, top: s0 }, 4: { h: 48, face, side: s0, top: s1 }, 5: { h: 62, face: 'brick', side: E.shade(s0, -.25), top: E.shade(s0, -.1) } } });
  return MAPS[id];
}

/* ---- the crowd: two people a tile on each tier, in the court's colors, each bobbing on its own ---- */
const CROWDS = {};
function crowdOf(id) {
  if (CROWDS[id]) return CROWDS[id];
  const court = get('court', id), rows = [];
  TIERS.forEach((tier, ti) => {
    const people = [];
    for (let c = 1; c < MAP_COLS - 1; c++) for (const dx of [4, 12]) {
      const h = E.hash2(c * 3 + dx, ti * 7 + 1); if (h < .08) continue;
      people.push({ x: c * 16 + dx, shirt: court.crowd[Math.floor(h * 97) % court.crowd.length], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8', '#3a2418'][Math.floor(h * 131) % 5], hair: ['#1a1410', '#3a2a1a', '#e0c070', '#8a3a1a'][Math.floor(h * 53) % 4], ph: h * 9, side: h < .5 ? 0 : 1, big: h > .9 });
    }
    rows.push({ y: tier.row * 16 + 9, z: tier.h, people });
  });
  return (CROWDS[id] = rows);
}
function drawCrowd(r, id, t, react) {
  for (const row of crowdOf(id)) r.queue(XM, row.y, row.z, g => {
    for (const f of row.people) {
      const up = react.jump > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 * react.jump : react.slump > 0 ? -1 : Math.sin(t * 2.2 + f.ph) * .6 + (react.beat ? Math.max(0, Math.sin(react.beat * Math.PI)) * 1.2 : 0);
      const [x, y] = r.w(f.x, row.y, row.z + up), X = Math.round(x), Y = Math.round(y);
      if (X < -6 || X > r.W + 6) continue;
      px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 2, Y - 6, 1, 6, E.shade(f.shirt, -.25));
      px.rect(g, X - 1, Y - 10, 3, 4, f.skin); px.rect(g, X - 1, Y - 11, 3, 1, f.hair);
      if (react.jump > .3 && f.ph > 4) { px.rect(g, X - 3, Y - 12, 1, 4, f.skin); px.rect(g, X + 3, Y - 12, 1, 4, f.skin); }   // arms up
      if (f.big && react.flash > 0 && E.hash2(f.x, Math.floor(t * 8)) > .7) px.rect(g, X, Y - 13, 2, 2, '#ffffff');   // camera flashes
    }
  }, { bias: .2 });
}

/* ---- the hoops ---- */
const HOOP_FX = [{ bend: 0, bv: 0, net: 0, nv: 0, sway: 0, glow: 0, shattered: false, shards: 0 }, { bend: 0, bv: 0, net: 0, nv: 0, sway: 0, glow: 0, shattered: false, shards: 0 }];
function hoopStep(dt, wind) {
  for (const f of HOOP_FX) {
    f.bv += (-f.bend * 260 - f.bv * 12) * dt; f.bend += f.bv * dt;
    f.nv += (-f.net * 180 - f.nv * 9) * dt; f.net += f.nv * dt;
    f.sway = approach(f.sway, (wind || 0) * 2, dt * 3); f.glow = Math.max(0, f.glow - dt);
  }
}
function drawHoop(r, i, team) {
  const h = HOOPS[i], f = HOOP_FX[i], dir = h.dir, bx = h.board, out = bx - dir * 54, tc = team ? team.jersey : '#c8202a';
  // the stanchion: a padded base outside the baseline, a pole and an arm to the board
  r.queue(out, YM, 0, g => {
    const t = E.tones(tc);
    r.box(g, out - 9, YM - 10, 0, out + 9, YM + 10, 22, t.lt, t.sh);
    const [px0, py0] = r.w(out, YM, 22), [px1, py1] = r.w(out, YM, 104), [ax, ay] = r.w(bx - dir * 3, YM, 100);
    px.line(g, px0, py0, px1, py1, '#3a3a44', 4); px.line(g, px0 - 1, py0, px1 - 1, py1, '#6a6a78', 1);
    px.line(g, px1, py1, ax, ay, '#3a3a44', 3); px.line(g, px1, py1 - 1, ax, ay - 1, '#6a6a78', 1);
    E.font.text(g, 'BLAM', Math.round(r.w(out, YM + 10, 14)[0]) - 9, Math.round(r.w(out, YM + 10, 14)[1]) - 3, '#ffffff', { font: 'tiny', outline: false });
  }, { bias: -.5 });
  // the glass (turned 30 degrees toward the camera so its face shows)
  const s30 = .5, c30 = Math.cos(Math.PI / 6), nearX = bx + (i === 0 ? -1 : 1) * s30 * 24, farX = bx - (i === 0 ? -1 : 1) * s30 * 24;
  const near = [nearX, YM + c30 * 24], far = [farX, YM - c30 * 24];
  r.queue(bx, YM - 7, BOARD.z0, g => {
    const P4 = [r.w(near[0], near[1], BOARD.z0), r.w(near[0], near[1], BOARD.z1), r.w(far[0], far[1], BOARD.z1), r.w(far[0], far[1], BOARD.z0)];
    if (f.shattered) {   // jagged shards left in the frame
      px.line(g, P4[1][0], P4[1][1], P4[2][0], P4[2][1], '#e8eef8', 1);
      for (let k = 0; k < 6; k++) { const u = k / 5, a = [lerp(P4[1][0], P4[2][0], u), lerp(P4[1][1], P4[2][1], u)]; px.poly(g, [[a[0] - 2, a[1]], [a[0] + 2, a[1]], [a[0], a[1] + 3 + (k % 3) * 2]], '#cfe4ff'); }
      return;
    }
    px.blend(g, .35, 'screen', () => px.poly(g, P4, '#8ac8ff'));
    px.blend(g, .2, 'add', () => px.poly(g, [P4[1], P4[2], [P4[2][0], P4[2][1] + 6], [P4[1][0], P4[1][1] + 6]], '#ffffff'));
    for (let k = 0; k < 4; k++) px.line(g, P4[k][0], P4[k][1], P4[(k + 1) % 4][0], P4[(k + 1) % 4][1], '#f4f8ff', 1);
    // the shooter's square, centred over the rim
    const sq = (u, z) => { const xx = lerp(far[0], near[0], u), yy = lerp(far[1], near[1], u); return r.w(xx, yy, z); };
    const q = [sq(.32, 82), sq(.32, 92), sq(.68, 92), sq(.68, 82)];
    for (let k = 0; k < 4; k++) px.line(g, q[k][0], q[k][1], q[(k + 1) % 4][0], q[(k + 1) % 4][1], '#ff7a3a', 1);
  }, { bias: -.3 });
  // the rim: back half behind the ball's centre plane, front half in front; it bends down on hits
  const ring = (a0, a1, yq) => r.queue(h.x, yq, RIM_Z, g => {
    const tones = E.tones(f.glow > 0 ? '#ffe060' : '#ff6a1a');
    let prev = null;
    for (let k = 0; k <= 8; k++) {
      const a = a0 + (a1 - a0) * k / 8, x = h.x + Math.cos(a) * RIM_R, y = h.y + Math.sin(a) * RIM_R, front = Math.max(0, Math.cos(a) * dir);
      const p = r.w(x, y, RIM_Z - f.bend * front);
      if (prev) { px.line(g, prev[0], prev[1], p[0], p[1], tones.sh, 2); px.line(g, prev[0], prev[1] - 1, p[0], p[1] - 1, tones.lt, 1); }
      prev = p;
    }
    const [jx, jy] = r.w(h.x - dir * RIM_R, h.y, RIM_Z); px.rect(g, jx - 1, jy - 1, 3, 3, tones.deep);   // the bracket
  }, { bias: yq < h.y ? -.1 : .1 });
  ring(Math.PI, TAU, YM - 6); ring(0, Math.PI, YM + 6);
  // the net: strands from the rim to a lower ring, with knots that swing and ripple
  const net = (a0, a1, yq, col) => r.queue(h.x, yq, 66, g => {
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const a = a0 + (a1 - a0) * k / 5, sw = f.sway + Math.sin(game.time * 3 + k) * .3, rip = f.net * Math.sin(k * 1.7 + game.time * 20) * .5;
      const top = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z - .5), mid = r.w(h.x + Math.cos(a) * (RIM_R - 2 + rip) + sw * .5, h.y + Math.sin(a) * (RIM_R - 2), RIM_Z - 7 + f.net * 2), bot = r.w(h.x + Math.cos(a) * (5.5 + rip) + sw, h.y + Math.sin(a) * 5.5, 66 + f.net * 3);
      pts.push([top, mid, bot]);
    }
    for (let k = 0; k < pts.length; k++) {
      const [t, m, b] = pts[k]; px.line(g, t[0], t[1], m[0], m[1], col, 1); px.line(g, m[0], m[1], b[0], b[1], col, 1);
      if (k) { const [, m0, b0] = pts[k - 1]; px.line(g, m0[0], m0[1], b[0], b[1], col, 1); px.line(g, t[0], t[1], m0[0], m0[1], col, 1); }
    }
  }, { bias: yq < h.y ? -.12 : .12 });
  net(Math.PI, TAU, YM - 5, '#b8b8c4'); net(0, Math.PI, YM + 5, '#f4f4f8');
}

/* ---- the scene around the court: backdrop, extra silhouettes, props, lights ---- */
const BACKDROPS = {};
const backdropOf = id => BACKDROPS[id] || (BACKDROPS[id] = new E.Backdrop(get('court', id).sky));
function drawCourtScene(r, id, t, react) {
  const court = get('court', id), map = courtMap(id);
  backdropOf(id).draw(r);
  map.drawFloor(r); map.queueWalls(r);
  drawCrowd(r, id, t, react);
  // a rail and a scorer's table on the near apron (low, so it never hides play), benches west and east
  r.queue(XM, Y1 + 30, 0, g => { r.box(g, XM - 40, Y1 + 24, 0, XM + 40, Y1 + 36, 9, '#3a3448', '#26202e'); const [x, y] = r.w(XM, Y1 + 36, 6); E.font.text(g, 'CHANNEL BLAM', Math.round(x) - 26, Math.round(y) - 4, '#ffd23a', { font: 'tiny', outline: false }); });
  for (const bx of [X0 - 40, X1 + 40]) r.queue(bx, Y0 - 6, 0, g => r.box(g, bx - 20, Y0 - 12, 0, bx + 20, Y0 - 4, 7, '#5a4a3a', '#3a2e24'));
  for (const [name, x, y, o] of court.props) r.prop(name, x, y, 0, Object.assign({ size: 1.4 }, o || {}));
  drawSetPieces(r, id, t, react);
  if (id === 'dome') {   // the jumbotron over centre court
    r.queue(XM, Y0 - 40, 150, g => {
      const [x, y] = r.w(XM, Y0 - 40, 150), X = Math.round(x), Y = Math.round(y);
      E.ui.box(g, X - 40, Y - 22, 80, 30, { bg: '#0a0a14', border: '#ffd23a' });
      const m = S.match; E.font.text(g, m ? m.score[0] + ' - ' + m.score[1] : 'BLAM!', X, Y - 16, '#ffd23a', { align: 'center', scale: 2, outline: false });
      E.font.text(g, 'BLAM DOME', X, Y - 1, '#ff3a3a', { align: 'center', font: 'tiny', outline: false });
    }, { emissive: true });
  }
  if (id === 'skybox') {   // the BLAM COLA neon billboard, flickering
    const on = Math.sin(t * 13) > -.85;
    r.queue(XM + 150, 4, 70, g => { const [x, y] = r.w(XM + 150, 4, 70); if (on) E.font.text(g, 'BLAM COLA', Math.round(x) - 22, Math.round(y) - 10, '#ff5ad8', { outline: '#3a0a30' }); }, { emissive: true });
  }
  // lights: ambient by court; floodlights at the corners; the court's glows
  L.enabled = true; L.ambient = court.ambient;
  for (const [x, y] of [[X0 - 20, Y0 - 20], [X1 + 20, Y0 - 20], [X0 - 20, Y1 + 30], [X1 + 20, Y1 + 30]]) L.add(x, y, 140, 300, .7, { color: '#fff0d8' });
  court.glow.forEach((c, k) => L.add(k % 2 ? X1 - 80 : X0 + 80, Y0 - 30, 60, 200, .5, { color: c }));
  L.add(XM, YM, 120, 340, .35, { color: '#ffffff' });
}

/* ---- 21-setpieces.js ---- */
/* SET PIECES: the courts' own objects, drawn in code and depth sorted like props (a chain-link fence, a water tower, a
 * boombox, AC units; a beach umbrella, a lifeguard tower, surfboards; junk cars, tire stacks; tiki totems; pyro cannons,
 * TV cameras, the scorer's table and the Golden Blamboozle trophy), the Pier's Ferris wheel, the Scrapyard's crane, the
 * Caldera's glowing crater, and the Blam Dome's upper deck of fans. SHAPES.<id>(r, x, y, o) queues one. */
const SHAPES = {
  fence(r, x, y, o = {}) {
    const len = o.len || 200;
    r.queue(x, y, 0, g => {
      const [a0, b0] = r.w(x - len / 2, y, 0), [a1] = r.w(x + len / 2, y, 0), [, top] = r.w(x, y, 34);
      for (let k = Math.round(a0); k < a1; k += 3) for (let j = Math.round(top); j < b0; j += 3) if ((k + j) % 6 < 3) px.dot(g, k, j, '#7a8090');
      px.rect(g, Math.round(a0), Math.round(top), Math.round(a1 - a0), 2, '#a0a8b8');
      for (let k = Math.round(a0); k <= a1; k += 40) px.rect(g, k, Math.round(top), 2, Math.round(b0 - top), '#5a6070');
    }, { bias: -1 });
  },
  watertower(r, x, y) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 60), [, ty2] = r.w(x, y, 100), t = E.tones('#6a4a3a');
      for (const dx of [-12, 12]) px.line(g, bx + dx, by, bx + dx * .6, ty, '#3a2a24', 2);
      px.line(g, bx - 12, by - 20, bx + 12, ty + 10, '#3a2a24', 1); px.line(g, bx + 12, by - 20, bx - 12, ty + 10, '#3a2a24', 1);
      px.rect(g, bx - 16, ty2, 32, ty - ty2, t.base); px.rect(g, bx - 16, ty2, 6, ty - ty2, t.sh); px.rect(g, bx + 10, ty2, 6, ty - ty2, t.lt);
      px.poly(g, [[bx - 19, ty2], [bx, ty2 - 14], [bx + 19, ty2]], '#4a3028');
      txt(g, 'NEON', bx, ty2 + 8, '#ff5ad8', 1, 'center', { outline: false });
    }, { bias: -2 });
  },
  boombox(r, x, y) {
    r.queue(x, y, 6, g => {
      const [bx, by] = r.w(x, y, 8), b = Math.sin(game.time * 12) > 0 ? 1 : 0;
      px.rect(g, bx - 9, by - 7, 18, 9, '#2a2a34'); px.rect(g, bx - 8, by - 6, 16, 7, '#3a3a4a'); px.rect(g, bx - 6, by - 10, 12, 2, '#5a5a6a');
      px.disc(g, bx - 4, by - 2, 2 + b, '#101014'); px.disc(g, bx + 4, by - 2, 2 + b, '#101014'); px.dot(g, bx, by - 4, '#ff3ca6');
    });
  },
  acunit(r, x, y) { r.queue(x, y, 0, g => { r.box(g, x - 8, y - 6, 0, x + 8, y + 6, 14, '#b8bcc8', '#8a8e9a'); const [bx, by] = r.w(x, y + 6, 7); px.disc(g, bx, by, 4, '#5a5e6a'); px.line(g, bx - 3, by, bx + 3, by, '#2a2e3a', 1); }); },
  umbrella(r, x, y, o = {}) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 40), c = o.color || '#ff5a8a';
      px.line(g, bx, by, bx, ty, '#e0e0e0', 1);
      for (let k = 0; k < 6; k++) px.poly(g, [[bx, ty - 6], [bx - 22 + k * 7.3, ty + 4], [bx - 22 + (k + 1) * 7.3, ty + 4]], k % 2 ? '#ffffff' : c);
    });
  },
  lifeguard(r, x, y) {
    r.queue(x, y, 0, g => {
      const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 46);
      for (const dx of [-10, 10]) px.line(g, bx + dx, by, bx + dx * .7, ty, '#e8d8b0', 2);
      r.box(g, x - 12, y - 8, 46, x + 12, y + 8, 64, '#ff6a4a', '#c84a3a'); const [, ry] = r.w(x, y, 70); px.poly(g, [[bx - 16, ry + 4], [bx, ry - 6], [bx + 16, ry + 4]], '#ffffff');
      txt(g, 'LIFEGUARD', bx, by - 66, '#ffffff', 1, 'center', { font: 'tiny', outline: false });
    }, { bias: -2 });
  },
  surfboard(r, x, y, o = {}) { r.queue(x, y, 0, g => { const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 34); px.ell(g, bx, (by + ty) / 2, 4, (by - ty) / 2, o.color || '#2de2ff'); px.line(g, bx, ty + 3, bx, by - 3, '#ffffff', 1); }); },
  junkcar(r, x, y, o = {}) {
    const c = o.color || '#8a4a3a', t = E.tones(c);
    r.queue(x, y, 0, g => {
      r.box(g, x - 22, y - 9, 4, x + 22, y + 9, 16, t.lt, t.sh); r.box(g, x - 10, y - 8, 16, x + 12, y + 8, 26, t.base, t.deep);
      const [w1x, w1y] = r.w(x - 13, y + 9, 4), [w2x, w2y] = r.w(x + 13, y + 9, 4); px.disc(g, w1x, w1y, 4, '#1a1a1a'); px.disc(g, w2x, w2y, 4, '#1a1a1a');
      const [gx, gy] = r.w(x, y + 8, 22); px.rect(g, gx - 8, gy - 3, 16, 5, '#5a8aa0'); px.line(g, gx - 6, gy - 2, gx + 2, gy + 1, '#ffffff', 1);
    });
  },
  tires(r, x, y) { r.queue(x, y, 0, g => { for (let k = 0; k < 4; k++) { const [bx, by] = r.w(x, y, 4 + k * 7); px.ell(g, bx, by, 9, 4, '#1a1a1e'); px.ell(g, bx, by, 4, 2, '#3a3a3e'); } }); },
  totem(r, x, y) {
    r.queue(x, y, 0, g => {
      const cols = ['#8a4a2a', '#a05a2a', '#6a3a1a'];
      for (let k = 0; k < 3; k++) { const [bx, by] = r.w(x, y, k * 16); px.rect(g, bx - 7, by - 16, 14, 16, cols[k]); px.rect(g, bx - 4, by - 12, 3, 3, '#ffd23a'); px.rect(g, bx + 1, by - 12, 3, 3, '#ffd23a'); px.rect(g, bx - 4, by - 6, 8, 2, '#1a0a04'); }
      const [tx, ty] = r.w(x, y, 48); px.poly(g, [[tx - 12, ty], [tx, ty - 8], [tx + 12, ty]], '#3a8a3a');
    }, { bias: -1 });
  },
  pyro(r, x, y) {
    r.queue(x, y, 0, g => { r.box(g, x - 6, y - 6, 0, x + 6, y + 6, 16, '#4a4a54', '#2a2a34'); const [bx, by] = r.w(x, y, 16); px.rect(g, bx - 3, by - 6, 6, 6, '#1a1a20');
      if (FX.react.jump > .5) { px.blend(g, .8, 'add', () => { for (let k = 0; k < 6; k++) px.disc(g, bx + Math.sin(game.time * 30 + k) * 2, by - 10 - k * 8, 6 - k * .7, k < 3 ? '#ffe060' : '#ff5a1a'); }); L.add(x, y, 50, 120, .8, { color: '#ff9a3a' }); } }, { emissive: true });
  },
  tvcamera(r, x, y) {
    r.queue(x, y, 0, g => { const [bx, by] = r.w(x, y, 0), [, ty] = r.w(x, y, 26); for (const dx of [-7, 0, 7]) px.line(g, bx, ty, bx + dx, by, '#2a2a30', 1);
      px.rect(g, bx - 8, ty - 7, 16, 8, '#1e1e26'); px.rect(g, bx + 6, ty - 6, 5, 6, '#3a3a46'); px.dot(g, bx - 6, ty - 6, Math.sin(game.time * 4) > 0 ? '#ff3a3a' : '#5a1a1a'); txt(g, 'BLAM', bx - 1, ty - 6, '#ffd23a', 1, 'center', { font: 'tiny', outline: false }); });
  },
  trophy(r, x, y) {
    r.queue(x, y, 0, g => { r.box(g, x - 6, y - 6, 0, x + 6, y + 6, 22, '#3a2a5a', '#2a1a40'); const [bx, by] = r.w(x, y, 22), sh = Math.sin(game.time * 3) > .7;
      px.rect(g, bx - 3, by - 6, 6, 6, '#c8a020'); px.disc(g, bx, by - 13, 7, '#ffd23a'); px.disc(g, bx - 2, by - 15, 3, '#fff0a0'); px.line(g, bx - 5, by - 13, bx + 5, by - 13, '#a07010', 1); if (sh) px.dot(g, bx + 3, by - 17, '#ffffff'); }, { emissive: true });
  }
};
// where each court puts them ([shape, x, y, opts])
const SETPIECES = {
  skybox: [['fence', XM, Y0 - 20, { len: 700 }], ['watertower', 60, 40], ['boombox', X0 - 34, Y0 - 8], ['acunit', X1 + 40, Y1 + 30], ['acunit', X0 - 40, Y1 + 30]],
  pier: [['umbrella', X0 - 40, Y1 + 30, { color: '#ff5a8a' }], ['umbrella', X1 + 40, Y1 + 34, { color: '#2de2ff' }], ['lifeguard', X1 + 44, Y0 + 40], ['surfboard', X0 - 40, Y0 + 30, { color: '#ffd23a' }], ['surfboard', X0 - 30, Y0 + 40, { color: '#ff7a5c' }]],
  scrapyard: [['junkcar', X0 - 40, Y1 + 34, { color: '#5a7a9a' }], ['junkcar', X1 + 44, Y0 + 60, { color: '#8a4a3a' }], ['tires', X1 + 40, Y1 + 30], ['tires', X0 - 44, Y0 + 70], ['fence', XM, Y0 - 20, { len: 700 }]],
  caldera: [['totem', X0 - 38, Y0 + 60], ['totem', X1 + 38, Y0 + 60], ['totem', XM - 120, Y1 + 34], ['totem', XM + 120, Y1 + 34]],
  dome: [['pyro', X0 - 30, Y0 - 10], ['pyro', X1 + 30, Y0 - 10], ['pyro', X0 - 30, Y1 + 20], ['pyro', X1 + 30, Y1 + 20], ['tvcamera', XM - 120, Y1 + 34], ['tvcamera', XM + 120, Y1 + 34], ['trophy', XM + 60, Y1 + 32]]
};
/** each court's objects, its silhouettes beyond the arena, and the Dome's upper deck */
function drawSetPieces(r, id, t, react) {
  for (const [s, x, y, o] of SETPIECES[id] || []) SHAPES[s](r, x, y, o);
  if (id === 'pier') r.queue(XM + 220, 2, 0, g => {   // the Ferris wheel turning beyond the boardwalk
    const [cx, cy] = r.w(XM + 220, 2, 110); for (let k = 0; k < 10; k++) { const a = t * .3 + k * TAU / 10, x = cx + Math.cos(a) * 40, y = cy + Math.sin(a) * 40; px.line(g, cx, cy, x, y, '#5a3a5a', 1); px.rect(g, x - 3, y, 6, 5, ['#ff5a8a', '#ffd23a', '#2de2ff'][k % 3]); }
    px.disc(g, cx, cy, 3, '#3a2a3a'); const [, by] = r.w(XM + 220, 2, 40); px.line(g, cx, cy, cx - 20, by, '#3a2a3a', 2); px.line(g, cx, cy, cx + 20, by, '#3a2a3a', 2);
  }, { bias: -5 });
  if (id === 'scrapyard') r.queue(X1 - 80, 2, 0, g => {   // the crane with its swinging magnet
    const [bx, by] = r.w(X1 - 80, 2, 60), [tx, ty] = r.w(X1 - 80, 2, 150), sw = Math.sin(t * .8) * 18;
    px.line(g, bx, by, tx, ty, '#c89a2a', 3); px.line(g, tx, ty, tx - 90, ty + 10, '#c89a2a', 3); px.line(g, tx - 70, ty + 8, tx - 70 + sw, ty + 50, '#2a2a2a', 1); px.rect(g, tx - 78 + sw, ty + 50, 16, 6, '#4a4a5a');
  }, { bias: -5 });
  if (id === 'caldera') { const [cx, cy] = [XM - 160, 2]; r.queue(cx, cy, 0, g => { const [x, y] = r.w(cx, cy, 120); px.blend(g, .7, 'add', () => { px.ddisc(g, x, y, 22 + Math.sin(t * 2) * 3, '#ff5a1a', .8); px.ddisc(g, x, y, 10, '#ffd060', .9); }); }, { emissive: true, bias: -5 }); if (S.fxRng() < .2) P.add({ kind: 'ember', x: XM - 160 + (S.fxRng() - .5) * 20, y: 2, z: 120, vz: 40, vx: (S.fxRng() - .5) * 20, life: 1.5 }); }
  if (get('court', id).upperDeck) {   // the Blam Dome's upper deck: a second ring of fans above the back wall, under the rafters
    r.queue(XM, 4, 64, g => {
      const [x0, y0] = r.w(0, 4, 64), [x1] = r.w(MAP_COLS * 16, 4, 64), rows = 3;
      for (let j = 0; j < rows; j++) { const y = Math.round(y0 - 14 - j * 11); px.rect(g, Math.round(x0), y + 4, Math.round(x1 - x0), 3, j % 2 ? '#2a2032' : '#3a2c44');
        for (let x = Math.round(x0) + (j % 2) * 4; x < x1; x += 8) { if (x < -8 || x > r.W + 8) continue; const h = E.hash2(x, j), up = react.jump > 0 ? Math.abs(Math.sin(t * 9 + h * 9)) * 3 * react.jump : Math.sin(t * 2 + h * 9) * .6; px.rect(g, x - 2, y - 2 - up, 4, 5, get('court', id).crowd[Math.floor(h * 60) % 6]); px.rect(g, x - 1, y - 5 - up, 3, 3, ['#e0b090', '#a87050', '#6a4028'][Math.floor(h * 30) % 3]); } }
      for (let k = 0; k < 6; k++) { const a = t * .7 + k, xx = r.W / 2 + Math.sin(a) * r.W * .45; px.blend(g, .15, 'add', () => px.line(g, xx, 0, xx + Math.cos(a) * 60, Math.round(y0), ['#ff3ca6', '#2de2ff', '#ffd23a'][k % 3], 2)); }
    }, { bias: -3 });
  }
}

/* ---- 31-player.js ---- */
/* PLAYERS: the entity (body, ratings, state machine fields, turbo, juice), the rig factory (jerseys, shorts, numbers,
 * hair), the pose layer over the engine's solvePose (hands that hold, dribble, shoot, dunk, swat, shove and celebrate,
 * solved by IK), and the input sources that write each slot's command every step (local device, CPU, network, script). */
const juiceK = p => .85 + .15 * p.juice;
const rate = (p, k) => p.r[k] * (k === 'slam' && p.def.team === 'blambots' && S.match && S.match.overclock > 0 ? 1.1 : 1);
const fac = {
  zoom: p => (.86 + .028 * rate(p, 'zoom')) * juiceK(p), splash: p => (.78 + .045 * rate(p, 'splash')) * juiceK(p), deep: p => (.70 + .06 * rate(p, 'deep')) * juiceK(p),
  slam: p => (.75 + .05 * rate(p, 'slam')) * juiceK(p), swipe: p => (.55 + .09 * rate(p, 'swipe')) * juiceK(p)
};

/** a rig dressed from a player's or npc's spec */
function dressRig(spec, team, o = {}) {
  const rg = spec.rig || spec, tm = team ? get('team', team) : null;
  const colors = { skin: rg.skin, hair: rg.hairColor || '#1a1410', cloth: rg.cloth || (tm ? tm.jersey : '#8a8a94'), trim: rg.trim || (tm ? tm.trim : '#ffffff'), pants: tm ? tm.shorts : '#3a3a44',
    boot: tm ? tm.sneaker : '#f4f4f4', glove: tm ? tm.trim : rg.skin, belt: rg.belt || (tm ? tm.shorts : '#2a2a2a'), coat: rg.coat };
  if (rg.robot) Object.assign(colors, { skin: rg.skin, cloth: tm.jersey, glove: '#8a909a' });
  if (rg.gorilla) Object.assign(colors, { cloth: tm ? tm.jersey : '#f4f0ea' });
  const rig = new E.Humanoid(Object.assign({ size: rg.size || 1.6, build: rg.build || 'heroic', weapon: null, outfit: rg.outfit || 'shirt', sleeves: rg.outfit === 'coat' ? 'long' : 'none', hair: rg.hair || 'short',
    hat: rg.hat, colors, hunch: rg.hunch || 0, eyeGlow: rg.eyeGlow, speedRef: 90 }, rg.outfit === 'coat' ? {} : { shorts: { len: .78, sock: tm ? tm.sock : '#ffffff', sockLen: .4 } }, rg.legs ? { legUpper: 7.4 * rg.legs, legLower: 7.4 * rg.legs } : {}, o));
  rig.bb = { targets: null };
  const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); poseLayer(this); };
  rig._headR0 = rig.o.headR;
  return rig;
}
function setBigHeads(rig, on) { rig.o.headR = rig._headR0 * (on ? 1.9 : 1); }

/** the pose layer: hand targets ([forward, right, up] at size 1, in the rig's frame) solved by IK on top of the
 *  engine's pose. rig.bb.targets = { R, L } (either may be missing: that arm keeps the engine's pose) */
function poseLayer(rig) {
  const T = rig.bb && rig.bb.targets; if (!T) return;
  const o = rig.o, J = rig.J, kz = (o.hipZ + o.torso) / 23.9, kr = (o.armUpper + o.armLower) / 10.9;
  for (const side of ['R', 'L']) {
    const t = T[side]; if (!t) continue;
    const sh = J['sh' + side], s = side === 'R' ? 1 : -1;
    const target = [t[0] * kr + (T.lean || 0), t[1] * kr, t[2] * kz];
    const [el, hd] = E.ik3(sh, target, o.armUpper, o.armLower, [-.4, s * 1, -.6]);
    J['elbow' + side] = el; J['hand' + side] = hd;
  }
}
/** a local point of the rig in the world */
function rigPoint(rig, p) { const w = rig.worldOffset(p); return [rig.x + w[0], rig.y + w[1], rig.z + w[2]]; }
function handWorld(rig, side) { return rigPoint(rig, rig.J['hand' + side]); }

/* ---- the entity ---- */
function makePlayer(slot, id, team) {
  const def = get('player', id);
  const p = {
    slot, id, team, def, name: def.name, r: def.ratings, rig: dressRig(def, def.team),
    x: XM, y: YM, z: 0, vx: 0, vy: 0, vz: 0, facing: team === 0 ? 0 : Math.PI, state: 'run', st: 0,
    turbo: 1, turboIdle: 0, juice: 1, src: null, cmd: emptyCmd(), cool: { steal: 0, shove: 0, spin: 0, pass: 0, catch: 0 },
    nova: null, powerup: null, knock: 0, dizzy: 0, celebrate: 0, celebKind: null, taunt: 0, act: null, jump: null, dunk: null,
    dribPh: 0, dribSide: 1, cross: 0, hold: 0, stats: { PTS: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, DNK: 0, REB: 0, AST: 0, STL: 0, BLK: 0, KD: 0, SHT: 0, NOVA: 0 },
    knocks: [], reboot: 0, intent: '', human: null, onCourt: true, lastX: 0, slipT: 0, land: 0, expr: null
  };
  p.rig.update(0, { x: p.x, y: p.y, z: 0, facing: p.facing });
  return p;
}
const emptyCmd = () => ({ mx: 0, my: 0, sD: false, sP: false, sR: false, pP: false, pD: false, tD: false, vP: false, oP: false, aP: false });
const reach = p => 35 * p.rig.o.size * ((p.rig.o.hipZ + p.rig.o.torso + p.rig.o.armUpper + p.rig.o.armLower) / 34.8);   // standing reach (z of the raised hands)
const handsZ = p => p.z + reach(p);
const mates = p => S.players.filter(q => q.team === p.team && q !== p);
const mate = p => mates(p)[0];
const foes = p => S.players.filter(q => q.team !== p.team);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isAir = p => p.z > .5 || p.vz > 0;
const busy = p => ['dunk', 'hang', 'knocked', 'reboot', 'layup', 'jumpshot'].includes(p.state);

/* ---- input sources: each writes p.cmd every step ---- */
/** a local device (game.players[i]); the screen direction of the stick turns into the ground direction */
function LocalSource(input) {
  return { kind: 'local', input, read(p) {
    const I = input, c = p.cmd, m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
    c.mx = d[0]; c.my = d[1]; c.sD = I.down('shoot'); c.sP = I.pressed('shoot'); c.sR = I.released('shoot');
    c.pP = I.pressed('pass'); c.pD = I.down('pass'); c.tD = I.down('turbo'); c.vP = I.pressed('shove'); c.oP = I.pressed('oop'); c.aP = I.pressed('taunt');
  } };
}
/** a network seat: the host applies the stick, held bits and each edge event once (50-hub.js fills it) */
function NetSource(seat) {
  const st = { mx: 0, my: 0, held: 0, edges: [] };
  return { kind: 'net', seat, st, read(p) {
    const c = p.cmd, h = st.held, bit = k => !!(h & (1 << k)), ev = st.edges.splice(0);
    c.mx = st.mx; c.my = st.my; c.sD = bit(0); c.pD = bit(1); c.tD = bit(2);
    c.sP = c.sR = c.pP = c.vP = c.oP = c.aP = false;
    for (const [a, down] of ev) { if (a === 0) { if (down) c.sP = true; else c.sR = true; } if (a === 1 && down) c.pP = true; if (a === 3 && down) c.vP = true; if (a === 4 && down) c.oP = true; }
    if (c.sP && c.sR) { c.sR = false; st.edges.push([0, 0]); }   // a tap within one packet: release next step
  } };
}
/** the CPU (34-ai.js) */
function CpuSource() { return { kind: 'cpu', read(p) { brainStep(p); } }; }
/** a scripted human for tests and the attract director: fn(p, cmd) */
function ScriptSource(fn) { return { kind: 'script', read(p) { const c = p.cmd; Object.assign(c, emptyCmd()); fn(p, c); } }; }

/* ---- 32-play.js ---- */
/* PLAY: the ball (held, dribbled, passed, shot, loose; rim torus and backboard collisions with substeps; scoring), the
 * players' step (movement, turbo, juice, the state machine) and every action: jump shots with a release meter, layups,
 * dunks from a catalog, alley-oops, putbacks, passes, steals, shoves, spin moves, blocks, goaltending, rebounds. Outcomes
 * are decided at release from S.rng and then flown physically. */
const BALL = () => S.ball;
function newBall() { return { x: XM, y: YM, z: 40, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null, scored: false, last: null, spin: 0, trail: [], touched: false, deadT: 0 }; }
const owner = () => S.ball && S.ball.owner;
const hasBall = p => S.ball.owner === p;
const teamHas = team => S.ball.owner && S.ball.owner.team === team;
const cheat = k => !!S.cheats[k];

/* ---- the ball ---- */
function giveBall(p, how = 'catch') {
  const b = S.ball, prev = b.owner, prevTeam = b.lastTeam;
  b.owner = p; b.state = isAir(p) ? 'held' : 'dribble'; b.shot = null; b.pass = null; b.vx = b.vy = b.vz = 0; b.touched = false;
  p.cool.catch = .15; p.hold = 0;
  if (prevTeam !== undefined && prevTeam !== p.team) { S.match && (S.match.shotClock = tune('shotClock')); emit('possession', { team: p.team, slot: p.slot }); }
  b.lastTeam = p.team; b.last = p;
  if (how === 'catch') { sfxAt('catch', p.x); emit('catch', { slot: p.slot }); }
  return prev;
}
function looseBall(vx, vy, vz) { const b = S.ball; b.owner = null; b.state = 'loose'; b.vx = vx; b.vy = vy; b.vz = vz; b.pass = null; }
function ballStep(dt) {
  const b = S.ball, m = S.match; if (!b) return;
  b.spin += Math.hypot(b.vx, b.vy) * dt * .15;
  if (b.owner) return;   // attached to its owner's hands (playerStep, after the rig)
  if (b.state === 'pass') passFlight(dt);
  const nearRim = HOOPS.some(h => Math.hypot(b.x - h.x, b.y - h.y) < 44 && Math.abs(b.z - RIM_Z) < 44);
  const n = nearRim ? 4 : 1;
  for (let k = 0; k < n && !b.owner; k++) integrate(dt / n);
  if (b.state === 'shot' || b.state === 'pass' || Math.hypot(b.vx, b.vy) > 260) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift(); } else if (b.trail.length) b.trail.shift();
  if (b.state === 'loose' && b.z <= BALL_R + .5 && Math.hypot(b.vx, b.vy) < 6 && m && m.phase === 'live') { b.vx *= .9; b.vy *= .9; }
}
function integrate(h) {
  const b = S.ball, m = S.match, g = tune('ballGravity') * (cheat('moongrav') ? .55 : 1), pz = b.z, px0 = b.x;
  b.vz -= g * h;
  const wind = b.state === 'shot' && b.shot ? b.shot.wind : m && m.wind;   // a shot keeps the gust it was released into (its decided outcome holds)
  if (b.z > BALL_R + 1 && wind && b.state !== 'dead') { b.vx += wind.x * h; b.vy += wind.y * h; }
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  if (b.state !== 'dead') for (let i = 0; i < 2; i++) {
    const hp = HOOPS[i];
    const ghost = b.state === 'shot' && b.shot && b.shot.made;   // a decided make drops clean (a swish)
    if (!ghost) rimCollide(i);
    if (!HOOP_FX[i].shattered) boardCollide(i, px0);
    // a basket: the centre crosses the rim's plane going down inside the ring
    if (pz >= RIM_Z && b.z < RIM_Z && Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R - BALL_R * .5 && !b.scored) { b.scored = true; scoreBasket(i); }
    if (b.scored && b.z < RIM_Z - 18) b.scored = false;
    if (Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R && b.z < RIM_Z && b.z > RIM_Z - 14 && b.vz < 0) { const k = Math.exp(-h * 9); b.vx *= k; b.vy *= k; b.vz *= Math.exp(-h * 4); HOOP_FX[i].nv += h * 60; }
  } else if (pz >= RIM_Z && b.z < RIM_Z) for (const hp of HOOPS) if (Math.hypot(b.x - hp.x, b.y - hp.y) < RIM_R) { const i = HOOPS.indexOf(hp); HOOP_FX[i].nv += 30; }
  // the floor
  if (b.z < BALL_R) {
    b.z = BALL_R;
    if (b.vz < -45) { b.vz = -b.vz * tune('ballBounce'); sfxAt(b.state === 'dead' ? 'bounce' : 'bounce', b.x, { vol: clamp(-b.vz / 300, .2, 1) }); if (b.state === 'shot' || b.state === 'pass') toLoose(); }
    else b.vz = 0;
    const f = Math.exp(-h * 1.6); b.vx *= f; b.vy *= f;
  }
  // the arena walls (the crowd throws it back)
  if (b.x < X0 - WALL) { b.x = X0 - WALL; b.vx = Math.abs(b.vx) * .5; } if (b.x > X1 + WALL) { b.x = X1 + WALL; b.vx = -Math.abs(b.vx) * .5; }
  if (b.y < Y0 - WALL) { b.y = Y0 - WALL; b.vy = Math.abs(b.vy) * .5; } if (b.y > Y1 + WALL) { b.y = Y1 + WALL; b.vy = -Math.abs(b.vy) * .5; }
}
/** a hand's world point, or near the body when the rig has not caught up with a teleport */
function handAt(p, side = 'R') { const h = handWorld(p.rig, side); return Math.hypot(h[0] - p.x, h[1] - p.y) > 30 ? [p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, p.z + reach(p) * .8] : h; }
/** a point kept inside the arena's walls (a release at the wall must not start outside it) */
const inArena = o => (o.x = clamp(o.x, X0 - WALL + BALL_R, X1 + WALL - BALL_R), o.y = clamp(o.y, Y0 - WALL + BALL_R, Y1 + WALL - BALL_R), o);
function toLoose() { const b = S.ball; if (b.state === 'shot' || b.state === 'pass') { if (b.state === 'pass' && b.pass) emit('missedPass', {}); b.state = 'loose'; b.pass = null; } }
function rimCollide(i) {
  const b = S.ball, hp = HOOPS[i], dx = b.x - hp.x, dy = b.y - hp.y, d = Math.hypot(dx, dy) || 1e-6;
  const qx = hp.x + dx / d * RIM_R, qy = hp.y + dy / d * RIM_R, nx = b.x - qx, ny = b.y - qy, nz = b.z - RIM_Z, dist = Math.hypot(nx, ny, nz), min = BALL_R + TUBE;
  if (dist >= min || dist < 1e-6) return;
  const ux = nx / dist, uy = ny / dist, uz = nz / dist, push = min - dist;
  b.x += ux * push; b.y += uy * push; b.z += uz * push;
  const vn = b.vx * ux + b.vy * uy + b.vz * uz;
  if (vn < 0) {
    const e = tune('rimBounce'); b.vx -= (1 + e) * vn * ux; b.vy -= (1 + e) * vn * uy; b.vz -= (1 + e) * vn * uz;
    b.vx *= .92; b.vy *= .92;
    if (-vn > 30) { sfxAt('rim', hp.x, { vol: clamp(-vn / 300, .3, 1) }); HOOP_FX[i].bv -= Math.min(60, -vn * .2); P.sparks(qx, qy, RIM_Z, 3, null, { color: '#ffa040' }); emit('rim', { hoop: i }); }
  }
  touchRim();
}
function touchRim() {
  const b = S.ball;
  if (!b.touched) { b.touched = true; if (S.match) S.match.shotClock = tune('shotClock'); }
  if (b.state === 'shot') { b.state = 'loose'; if (b.shot) b.shot.rim = true; }
}
function boardCollide(i, px0) {
  const b = S.ball, hp = HOOPS[i], bx = hp.board + hp.dir * BALL_R;
  if (b.y < BOARD.y0 - 2 || b.y > BOARD.y1 + 2 || b.z < BOARD.z0 - 2 || b.z > BOARD.z1 + 2) return;
  if ((hp.dir > 0 && b.x < bx && px0 >= bx - 3) || (hp.dir < 0 && b.x > bx && px0 <= bx + 3)) {
    b.x = bx; if (b.vx * hp.dir < 0) { b.vx = -b.vx * tune('boardBounce'); sfxAt('backboard', hp.x, { vol: .7 }); emit('backboard', { hoop: i }); }
    touchRim();
  }
}

/* ---- scoring ---- */
function scoreBasket(i) {
  const b = S.ball, m = S.match; if (!m || m.phase === 'over') return;
  const team = i === 1 ? 0 : 1, shot = b.shot && b.shot.team === team ? b.shot : null, shooter = shot ? S.players[shot.slot] : null;
  if (m.phase !== 'live' && !(m.phase === 'clockout' && shot)) { b.shot = null; return; }
  if (shot && shot.late) { b.shot = null; return; }   // released after the buzzer: no good
  let pts = shot ? shot.points : 2, jack = false;
  if (shot && shot.jackpot) { pts += tune('jackpotBonus'); jack = true; }
  const gold = m.gold === team; if (gold) { pts *= 2; m.gold = null; }
  m.score[team] += pts; b.shot = null; b.state = 'loose';
  const hf = HOOP_FX[i]; hf.nv += 40; hf.glow = shooter && shooter.nova ? 2 : 0;
  if (!shot || !shot.dunk) sfxAt('swish', HOOPS[i].x);
  P.glints(HOOPS[i].x, HOOPS[i].y, RIM_Z - 6, 6, '#ffffff');
  const ev = emit('basket', { team, points: pts, slot: shooter ? shooter.slot : -1, dunk: !!(shot && shot.dunk), dunkId: shot && shot.dunk ? shot.dunk : null, three: !!(shot && shot.points === 3), dist: shot ? shot.dist : 0, perfect: !!(shot && shot.perfect), layup: !!(shot && shot.layup), jackpot: jack, gold, alleyoop: !!(shot && shot.oop), putback: !!(shot && shot.putback), goaltend: !!(shot && shot.goaltend), buzzer: m.clock <= 0 });
  if (shooter) {
    shooter.stats.PTS += pts; shooter.stats.FGM++; if (shot.points === 3) shooter.stats.TPM++;
    if (shot.assist !== undefined && S.players[shot.assist]) { S.players[shot.assist].stats.AST++; }
    const mt = mate(shooter); if (!shot.dunk && !shooter.human && mt) { /* a CPU scorer celebrates on its way back */ }
    shooter.celebrate = shot.dunk ? 0 : 1.1; shooter.celebKind = pick(['pointSky', 'chestPound', 'raiseRoof', 'flex']);
  }
  onBasket(team, shooter, ev);
}

/* ---- the release meter and the shot model ---- */
function baseChance(d) {
  if (d <= 40) return .85; if (d <= 80) return lerp(.85, .70, (d - 40) / 40); if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64); if (d <= 320) return lerp(.30, .08, (d - 200) / 120); return .03;
}
/** the make chance for p shooting now (with a release quality: 'perfect' | 'good' | 'bad'); returns { p, parts } */
function shotChance(p, rel, o = {}) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), three = isThree(o.tx !== undefined ? o.tx : p.x, o.ty !== undefined ? o.ty : p.y, h), m = S.match;
  let c = baseChance(d) * (three ? fac.deep(p) * tune('threeSkill') : fac.splash(p)) * tune('shotSkill');
  const pu = p.powerup && p.powerup.id;
  c *= rel === 'perfect' ? 1 + tune('perfectBonus') : rel === 'bad' ? 1 - tune('badReleasePenalty') : 1;
  // contest: the nearest defender between shooter and rim
  let contest = 1;
  for (const f of foes(p)) {
    const df = dist2(f, p), between = (f.x - p.x) * (h.x - p.x) + (f.y - p.y) * (h.y - p.y) > 0;
    if (f.state === 'knocked' || f.state === 'reboot') continue;
    if (df < 30 && between) contest = Math.min(contest, isAir(f) ? 1 - tune('contestPenalty') : .8); else if (df < 50) contest = Math.min(contest, .92);
  }
  c *= contest;
  if (p.cmd.tD) c *= 1.05;
  if (Math.hypot(p.vx, p.vy) > 120) c *= .9;
  if (m && m.wind) c *= 1 - .35 * Math.min(1, Math.hypot(m.wind.x, m.wind.y) / Math.max(1, tune('windStrength'))) * d / 320;
  if (p.nova) c += tune('novaShotBonus');
  if (pu === 'laser') c += .3;
  c += comebackBonus(p.team) * .12;
  if (o.layup) c = Math.max(c, .6 * fac.splash(p));
  return { p: clamp(c, .02, .97), d, three, contest };
}
function comebackBonus(team) {
  const m = S.match; if (!m || m.quarter < 2 || cheat('tournament') || S.mode === 'hub') return 0;
  const lvl = { off: 0, low: .2, normal: tune('comeback') }[setting('comeback')] ?? tune('comeback'), d = m.score[1 - team] - m.score[team];
  return d >= 4 ? lvl * Math.min(d, 15) / 15 : 0;
}
const perfectWin = p => tune('perfectWindow') * (p.powerup && p.powerup.id === 'laser' ? 2 : 1);

/** release the ball toward the hoop; decided now, flown physically */
function releaseShot(p, o = {}) {
  const b = S.ball, h = attackHoop(p.team), hi = HOOPS.indexOf(h), m = S.match;
  const apexT = p.jump ? p.jump.apexT : 0, dtRel = p.jump ? p.jump.t - apexT : 0, pw = perfectWin(p);
  const rel = o.layup || o.tip ? 'good' : Math.abs(dtRel) <= pw / 2 ? 'perfect' : Math.abs(dtRel) <= pw ? 'good' : 'bad';
  const takeoff = p.jump && p.jump.from ? p.jump.from : [p.x, p.y];
  const ch = shotChance(p, rel, { layup: o.layup, tx: takeoff[0], ty: takeoff[1] });
  let made = S.rng() < ch.p;
  if (S.cheats.shots === 'in') made = true; else if (S.cheats.shots === 'out') made = false;
  if (o.forceMade !== undefined) made = o.forceMade;
  if (S.cheats.missTeam === p.team) made = false;
  const points = ch.three && !o.layup ? 3 : 2, d = ch.d;
  const jackpot = !!(m && m.jackpot && Math.hypot(takeoff[0] - m.jackpot.x, takeoff[1] - m.jackpot.y) < 16 && !o.layup);
  const hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: hand[2] + 3 });
  let tx = h.x, ty = h.y, tz = RIM_Z - 3, airball = false;
  if (!made) {
    const r = S.rng(), toward = Math.atan2(p.y - h.y, p.x - h.x);
    if (d > 150 && r < .22) { airball = true; const short = S.rng() < .6 ? 1 : -1; tx = h.x + Math.cos(toward) * (34 * short); ty = h.y + Math.sin(toward) * 34 * short + (S.rng() - .5) * 30; tz = RIM_Z - 20; }
    else { const a = toward + (r < .45 ? 0 : r < .8 ? Math.PI : (S.rng() < .5 ? 1 : -1) * Math.PI / 2) + (S.rng() - .5) * .5; tx = h.x + Math.cos(a) * (RIM_R + 1.5); ty = h.y + Math.sin(a) * (RIM_R + 1.5); tz = RIM_Z + 2; }
  }
  const apex = Math.max(0, clamp(18 + d * .1, 18, 60) * tune('shotArc') * (o.layup ? .4 : 1));
  const g = tune('ballGravity') * (cheat('moongrav') ? .55 : 1), v = E.arc(from, { x: tx, y: ty, z: tz }, g, { apex: Math.max(4, apex) });
  if (m && m.wind) { v.vx -= .5 * m.wind.x * v.t; v.vy -= .5 * m.wind.y * v.t; }
  b.owner = null; b.state = 'shot'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.touched = false; b.scored = false;
  b.shot = { slot: p.slot, team: p.team, made, points, dist: d, perfect: rel === 'perfect', rel, chance: ch.p, layup: !!o.layup, dunk: false, jackpot, airball, t: 0, late: !!(m && m.phase === 'clockout'), assist: p.assistFrom, putback: !!o.putback, hoop: hi, wind: m && m.wind ? { x: m.wind.x, y: m.wind.y } : null };
  p.assistFrom = undefined;
  p.stats.FGA++; if (points === 3) p.stats.TPA++;
  if (p.powerup && p.powerup.id === 'laser' && --p.powerup.shots <= 0) endPowerup(p);
  sfxAt('release', p.x); emit('release', { slot: p.slot, made, chance: +ch.p.toFixed(3), perfect: rel === 'perfect', rel, three: points === 3, dist: Math.round(d), layup: !!o.layup });
  S.lastShot = { name: p.name, chance: ch.p, rel, three: ch.three, contest: ch.contest, made };
  p.cool.catch = .4;
}

/* ---- movement and the state machine ---- */
function moveSpeed(p) {
  let s = tune('runSpeed') * fac.zoom(p);
  if (p.cmd.tD && (p.turbo > 0 || infTurbo(p))) s *= tune('turboMult');
  if (p.powerup && p.powerup.id === 'rocket') s *= 1.4;
  if (S.match && S.match.overclock > 0 && p.def.team === 'blambots') s *= 1.08;
  return s;
}
const infTurbo = p => p.nova || cheat('turbo' + p.team) || cheat('turboAll') || (S.mode === 'attract');
function playerStep(p, dt) {
  const c = p.cmd, b = S.ball, m = S.match, live = m && (m.phase === 'live' || m.phase === 'clockout');
  for (const k in p.cool) p.cool[k] = Math.max(0, p.cool[k] - dt);
  p.st += dt; p.celebrate = Math.max(0, p.celebrate - dt); p.taunt = Math.max(0, p.taunt - dt); p.dizzy = Math.max(0, p.dizzy - dt); p.land = Math.max(0, p.land - dt);
  if (p.reboot > 0) { p.reboot -= dt; p.vx = p.vy = 0; if (p.reboot <= 0) p.state = 'run'; poseAndBall(p, dt); return; }
  // turbo: drains while held and moving, refills after a pause
  const moving = Math.hypot(c.mx, c.my) > .2;
  if (c.tD && moving && !infTurbo(p)) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt); p.turboIdle = 0; p.juice = Math.max(0, p.juice - .01 * dt * tune('fatigue')); }
  else { p.turboIdle += dt; if (p.turboIdle > tune('turboRefillDelay')) p.turbo = Math.min(1, p.turbo + tune('turboRefill') * dt * (p.powerup && p.powerup.id === 'rocket' ? 2 : 1) * (1 + comebackBonus(p.team) * .5)); }
  if (infTurbo(p)) p.turbo = 1;
  if (live) p.juice = Math.max(0, p.juice - .004 * dt * tune('fatigue'));
  // the states
  switch (p.state) {
    case 'knocked': {
      p.knock -= dt; const f = Math.exp(-dt * 5); p.vx *= f; p.vy *= f;
      if (p.knock <= 0) { p.state = 'run'; p.st = 0; }
      break;
    }
    case 'dunk': dunkStep(p, dt); break;
    case 'hang': {
      const h = attackHoop(p.team); p.x = h.x - h.dir * 6; p.y = h.y; p.z = RIM_Z - reach(p) + 2 + Math.sin(p.st * 5) * 1.2; p.vx = p.vy = 0; p.vz = 0;
      if (p.st > p.hangT) { p.state = 'air'; p.vz = 0; p.vx = h.dir * 40; }
      break;
    }
    case 'spin': {
      p.vx = Math.cos(p.facing) * 90; p.vy = Math.sin(p.facing) * 90;
      if (p.st > .35) { p.state = 'run'; p.rig.spin = 0; }
      break;
    }
    default: {
      // on the ground or in the air under control
      const air = isAir(p);
      if (!air && p.state !== 'shove' && p.state !== 'steal' && p.state !== 'inbound' && !(m && m.freeze)) {
        let sp = moveSpeed(p), acc = tune('accel');
        if (m && m.phase === 'tipoff') sp = 0;
        const slick = onSlick(p); if (slick) acc *= .15;
        const tx = c.mx * sp, ty = c.my * sp;
        if (slick && c.tD && moving && Math.hypot(p.vx, p.vy) > 100 && (p.vx * tx + p.vy * ty) < 0 && p.slipT <= 0) { p.slipT = 1; if (S.rng() < .3) { slip(p); break; } }
        p.slipT = Math.max(0, p.slipT - dt);
        const sharp = (p.vx * tx + p.vy * ty) < -2000 && Math.hypot(p.vx, p.vy) > 80;
        p.vx = approach(p.vx, tx, acc * dt); p.vy = approach(p.vy, ty, acc * dt);
        if (sharp && p.cool.squeak === undefined) { sfxAt('squeak', p.x, { vol: .6 }); P.dust(p.x, p.y, 0, 3); }
        // facing: toward the move; a defender shuffles facing the ball handler
        const o = owner(), guarding = o && o.team !== p.team && dist2(o, p) < 70;
        const want = guarding ? Math.atan2(o.y - p.y, o.x - p.x) : moving ? Math.atan2(c.my, c.mx) : p.facing;
        p.facing = E.approachAng(p.facing, want, dt * (guarding ? 10 : 14));
      } else if (!air) { p.vx = approach(p.vx, 0, 1200 * dt); p.vy = approach(p.vy, 0, 1200 * dt); }
      if (p.state === 'shove' || p.state === 'steal') { actStep(p, dt); }
      if (live && !(m && m.freeze)) actions(p, dt);
      else if (m && m.phase === 'tipoff' && c.sP && !isAir(p) && m.jumpers.includes(p)) jump(p, 'tip');
      else if (m && m.phase === 'inbound' && p === m.inb.who && c.pP) m.inb.t = 0;
    }
  }
  // the body: gravity and the floor; the walls
  if (p.state !== 'dunk' && p.state !== 'hang') {
    if (isAir(p)) { p.vz -= tune('playerGravity') * (cheat('moongrav') ? .55 : 1) * (p.jump && p.jump.float ? .7 : 1) * dt; p.z += p.vz * dt; }
    if (p.z <= 0 && p.vz <= 0) { if (p.z < 0 || p.vz < -1) landed(p); p.z = 0; p.vz = 0; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  p.x = clamp(p.x, X0 - WALL + 4, X1 + WALL - 4); p.y = clamp(p.y, Y0 - WALL + 4, Y1 + WALL - 4);
  poseAndBall(p, dt);
}
function separate() {   // bodies push apart (no damage)
  const L = S.players;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], c = L[j]; if (a.state === 'dunk' || c.state === 'dunk' || a.state === 'hang' || c.state === 'hang') continue;
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), min = 11;
    if (d < min && d > 1e-3 && Math.abs(a.z - c.z) < 30) { const push = (min - d) / 2, ux = dx / d, uy = dy / d; const wa = a.r.bump >= c.r.bump ? .35 : .65; a.x -= ux * push * 2 * wa; a.y -= uy * push * 2 * wa; c.x += ux * push * 2 * (1 - wa); c.y += uy * push * 2 * (1 - wa); }
  }
}
function landed(p) {
  const was = p.state, j = p.jump;
  if (was === 'jumpshot' && hasBall(p)) {   // came down still holding it: a late release
    releaseShot(p);
  }
  if (j && j.kind === 'dunkfall') { p.land = .3; p.rig.kick(-1); P.dust(p.x, p.y, 0, 12); sfxAt('land_heavy', p.x); }
  else if (p.z < -1 || p.vz < -150) { P.dust(p.x, p.y, 0, 4); }
  if (['jumpshot', 'layup', 'air', 'jump'].includes(p.state)) { p.state = 'run'; p.st = 0; }
  p.jump = null; p.rig.spin = 0;
  if (hasBall(p)) S.ball.state = 'dribble';
}
function slip(p) { knockDown(p, .6, null); emit('slip', { slot: p.slot, name: p.name }); sfxAt('oil_slip', p.x); Caption.call('oil', { name: p.name }); }

/** the buttons, by context */
function actions(p, dt) {
  const c = p.cmd, b = S.ball, air = isAir(p), m = S.match;
  if (p.state === 'shove' || p.state === 'steal') return;
  if (hasBall(p)) {
    p.hold += dt;
    if (p.state === 'jumpshot') {   // in the air with the ball: let go of shoot to release; past the top + .25 it goes by itself
      p.jump.t += dt;
      if (c.sR || !c.sD || p.jump.t > p.jump.apexT + .25) releaseShot(p);
      return;
    }
    if (p.state === 'layup') { p.jump.t += dt; if (p.jump.t >= p.jump.relT) releaseShot(p, { layup: true }); return; }
    if (air) { if (c.sP) releaseShot(p, { putback: true }); return; }   // a catch in the air: shoot it on the way down
    if (c.sP) return startShot(p);
    if (c.pP && p.cool.pass <= 0) return passTo(p, mate(p), 'chest');
    if (c.oP && p.cool.pass <= 0) return alleyOop(p);
    if (c.vP && p.cool.spin <= 0 && (p.turbo >= tune('spinCost') || infTurbo(p))) return spinMove(p);
    if (c.aP && S.mode !== 'hub') { p.taunt = .8; emit('taunt', { slot: p.slot }); }
    return;
  }
  // without the ball
  const o = owner(), mateHas = o && o.team === p.team;
  if (mateHas && !o.human && p.human) {   // commands to a CPU teammate holding the ball
    if (c.pP) o.order = { kind: 'pass', t: .6 }; if (c.sP) o.order = { kind: 'shoot', t: .6 }; if (c.oP) o.order = { kind: 'oop', t: .8 };
    if (c.pP || c.sP || c.oP) emit('call', { slot: p.slot, kind: c.pP ? 'pass' : c.sP ? 'shoot' : 'oop' });
    if (c.sP && !air) return;
  }
  if (!air && c.sP && !mateHas) {
    const ventBoost = onVent(p) && m && m.twist && m.twist.kind === 'eruption';
    return jump(p, b.state === 'loose' || b.state === 'shot' ? 'rebound' : 'block', ventBoost ? 1.6 : 1);
  }
  if (!air && c.sP && mateHas) return;   // shoot without the ball beside a teammate who has it: the order above
  if (!mateHas && c.pP && p.cool.steal <= 0) return startSteal(p);
  if ((c.vP || (c.tD && c.pP)) && p.cool.shove <= 0 && (p.turbo >= .1 || infTurbo(p))) return startShove(p);
  if (c.aP && S.mode !== 'hub' && !o) { p.taunt = .8; emit('taunt', { slot: p.slot }); }
}

/* ---- shooting, layups and dunks ---- */
function dunkRange(p) {
  let r = tune('dunkRange') * fac.slam(p);
  if (p.nova) r += 40;
  if (p.powerup && p.powerup.id === 'moon') r = Math.max(r, THREE_R + 20);
  if (cheat('skydunks')) r = Math.max(r, CW / 2);
  if (S.match && S.match.overclock > 0 && p.def.team === 'blambots') r += 30;
  return r;
}
function canDunkFrom(p) { const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y); return d <= dunkRange(p) && (p.turbo >= .05 || infTurbo(p)) && (p.x - h.x) * h.dir > -6; }
function startShot(p) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), c = p.cmd;
  if (onVent(p) && S.match.twist && S.match.twist.kind === 'eruption' && S.match.twist.ventOn && c.tD && (p.x - XM) * h.dir < 0) return startDunk(p, { vent: true });
  if (c.tD && canDunkFrom(p)) return startDunk(p);
  if (d <= 40) return startLayup(p);
  jump(p, 'shot');
}
function jump(p, kind, boost = 1) {
  const vz = (tune('jumpShotVz') + 10 * rate(p, 'swat')) * (p.cmd.tD ? 1.15 : 1) * boost * (p.powerup && p.powerup.id === 'moon' ? 1.5 : 1) * (kind === 'shot' ? .92 : 1);
  p.vz = vz; p.z = .6; p.jump = { kind, t: 0, apexT: vz / tune('playerGravity'), from: [p.x, p.y], swatted: false };
  p.state = kind === 'shot' ? 'jumpshot' : 'air'; p.st = 0;
  if (kind === 'shot') { p.vx *= .25; p.vy *= .25; S.ball.state = 'held'; emit('shotStart', { slot: p.slot }); }
  else { p.vx *= .6; p.vy *= .6; }
  p.rig.kick(1); sfxAt('jump', p.x, { vol: .5 });
  if (kind === 'block') emit('blockJump', { slot: p.slot });
}
function startLayup(p) {
  const h = attackHoop(p.team);
  p.state = 'layup'; p.st = 0; p.vz = 270; p.z = .6;
  const a = Math.atan2(h.y - p.y, h.x - p.x); p.vx = Math.cos(a) * 50; p.vy = Math.sin(a) * 50; p.facing = a;
  p.jump = { kind: 'layup', t: 0, apexT: .3, relT: .26, from: [p.x, p.y] }; S.ball.state = 'held';
  sfxAt('jump', p.x, { vol: .5 }); emit('shotStart', { slot: p.slot, layup: true });
}
/** pick a dunk from the catalog: every dunk whose needs pass, weighted by its bonus and by the SLAM margin */
function chooseDunk(p, d, o = {}) {
  if (o.vent) return get('dunk', 'volcano');
  const m = S.match, bot = p.def.team === 'blambots', list = [];
  const quake = (bot && m && m.overclock > 0 && S.rng() < .5) || (p.powerup && p.powerup.id === 'moon' && S.rng() < .5) || (p.nova && S.rng() < .15) || o.quake;
  if (quake && d >= 60) return get('dunk', 'quake');
  for (const k of all('dunk')) {
    const n = k.need; if (n.vent || n.quake) continue;
    if (n.nova && !p.nova) continue; if (n.slam && rate(p, 'slam') < n.slam) continue;
    if (d < k.dist[0] - 10 || d > k.dist[1] + 10) continue;
    list.push([k, (1 + k.bonus / 60) * (rate(p, 'slam') - (n.slam || 6) + 1)]);
  }
  if (!list.length) return get('dunk', 'hammer');
  if (o.force) { const f = get('dunk', o.force); if (f) return f; }
  let tot = list.reduce((a, [, w]) => a + w, 0), r = S.rng() * tot;
  for (const [k, w] of list) { if ((r -= w) <= 0) return k; }
  return list[0][0];
}
function startDunk(p, o = {}) {
  const h = attackHoop(p.team), d = Math.hypot(p.x - h.x, p.y - h.y), dk = o.dunk || chooseDunk(p, d, o);
  const a = Math.atan2(p.y - h.y, p.x - h.x), slamX = h.x + Math.cos(a) * 7, slamY = h.y + Math.sin(a) * 7;
  const slamZ = Math.max(4, RIM_Z + 8 - reach(p)), g = tune('dunkGravity') * (cheat('moongrav') ? .6 : 1), hang = tune('dunkHang');
  const v = E.arc({ x: p.x, y: p.y, z: p.z }, { x: slamX, y: slamY, z: slamZ }, g / (hang * hang), { apex: dk.apexAbove * tune('dunkApex') });
  p.state = 'dunk'; p.st = 0; p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  p.dunk = { def: dk, t: 0, T: v.t, from: [p.x, p.y, p.z], v, g: g / (hang * hang), slammed: false, oop: !!o.oop, d, hoop: HOOPS.indexOf(h), turbo: p.cmd.tD, putback: !!o.putback, slowed: false };
  if (!o.oop) { S.ball.state = 'held'; } p.turbo = infTurbo(p) ? 1 : Math.max(0, p.turbo - .05);
  p.rig.kick(1); sfxAt('jump', p.x); if (rate(p, 'slam') > 0 && p.def.team === 'blambots') sfxAt('servo', p.x);
  emit('dunkStart', { slot: p.slot, dunk: dk.id, oop: !!o.oop, dist: Math.round(d) });
  if (o.vent) { S.match.twist.ventOn = false; P.smoke(p.x, p.y, 0, 12, { size: 1.6, color: '#e0e0e0' }); sfxAt('vent_puff', p.x); }
}
function dunkStep(p, dt) {
  const D = p.dunk, b = S.ball, dk = D.def; D.t += dt; const u = Math.min(1, D.t / D.T);
  p.x = D.from[0] + D.v.vx * D.t; p.y = D.from[1] + D.v.vy * D.t; p.z = Math.max(0, D.from[2] + D.v.vz * D.t - .5 * D.g * D.t * D.t);
  p.vx = D.v.vx; p.vy = D.v.vy; p.vz = D.v.vz - D.g * D.t;
  p.rig.spin = dk.spin * clamp((u - .2) / .65, 0, 1);
  // the alley-oop catch
  if (D.oop && !hasBall(p) && b.state === 'pass' && b.pass && b.pass.to === p) { const hd = handWorld(p.rig, 'R'); if (Math.hypot(b.x - hd[0], b.y - hd[1], b.z - hd[2]) < 18 || u > .72) { giveBall(p, 'catch'); b.state = 'held'; p.assistFrom = b.passer; } }
  if (!D.slammed && u >= .92) {
    if (!hasBall(p)) { p.state = 'air'; p.jump = { kind: 'dunkfall', t: 0 }; p.dunk = null; p.rig.spin = 0; return; }   // the oop never arrived
    slam(p);
  }
  if (D.slammed && u >= 1) {
    p.dunk = null; p.rig.spin = 0;
    if (dk.hang) { p.state = 'hang'; p.st = 0; p.hangT = dk.hang; }
    else { p.state = 'air'; p.jump = { kind: 'dunkfall', t: 0 }; p.vx = -attackHoop(p.team).dir * 30; p.vy = 0; p.vz = 60; }
  }
}
function slam(p) {
  const D = p.dunk, b = S.ball, h = HOOPS[D.hoop], dk = D.def, m = S.match;
  D.slammed = true;
  b.owner = null; b.state = 'shot'; b.x = h.x; b.y = h.y; b.z = RIM_Z + 6; b.vx = 0; b.vy = 0; b.vz = -220; b.scored = false; b.touched = true;
  b.shot = { slot: p.slot, team: p.team, made: true, points: 2, dist: D.d, dunk: dk.id, oop: D.oop, putback: D.putback, assist: p.assistFrom, t: 0, hoop: D.hoop, late: !!(m && m.phase === 'clockout') };
  p.assistFrom = undefined;
  p.stats.FGA++; p.stats.DNK++;
  HOOP_FX[D.hoop].bv -= 120; HOOP_FX[D.hoop].nv += 60;
  // shatter?
  let sh = dk.shatter || 0;
  if (p.nova) sh = Math.max(sh, .35); if (p.powerup && p.powerup.id === 'moon') sh = Math.max(sh, .5); if (rate(p, 'slam') >= 9 && D.turbo) sh = Math.max(sh, .03);
  if (m && m.forceShatter) { sh = 1; m.forceShatter = false; }
  sh *= tune('shatterChance');
  const shatter = m && m.shatters < 2 && S.rng() < sh;
  // posterized: a defender in front of the rim
  let victim = null;
  for (const f of foes(p)) if (Math.hypot(f.x - h.x, f.y - h.y) < 30 && f.state !== 'knocked' && dist2(f, p) < 34) { victim = f; break; }
  emit('slam', { slot: p.slot, dunk: dk.id, shatter, hoop: D.hoop });
  dunkFx(p, h, shatter);
  if (victim) { knockDown(victim, 1.2, p); victim.dizzy = 1.6; emit('posterized', { slot: p.slot, victim: victim.slot, name: p.name, victimName: victim.name }); }
  if (dk.id === 'quake') for (const q of S.players) if (q !== p && q.state !== 'knocked' && Math.hypot(q.x - h.x, q.y - h.y) < 60) knockDown(q, .8, p);
  if (shatter) shatterBoard(D.hoop, p);
}
/** a defender in the air meeting the ball: blocks shots in their first .25 s, layups, and dunks before the slam;
 *  touching a shot on its way down near the rim is goaltending */
function blockCheck(p) {
  if (!p.jump || p.jump.swatted || !isAir(p)) return;
  const b = S.ball, hz = handsZ(p), rch = tune('blockReach') + rate(p, 'swat');
  if (b.state === 'shot' && b.shot && b.shot.team !== p.team && !b.shot.dunk) {
    const d = Math.hypot(b.x - p.x, b.y - p.y), dz = Math.abs(b.z - hz);
    if (d < rch && dz < rch) {
      const h = HOOPS[b.shot.hoop];
      if (b.vz < 0 && Math.hypot(b.x - h.x, b.y - h.y) < 18 && b.z > RIM_Z) {   // coming down over the rim: goaltending
        if (!(p.nova || p.def.team === 'blambots')) { p.jump.swatted = true; b.shot.made = true; b.shot.goaltend = true; emit('goaltend', { slot: p.slot, name: p.name }); const v = E.arc(b, { x: h.x, y: h.y, z: RIM_Z - 4 }, tune('ballGravity'), { time: .25 }); b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; return; }
      } else if (b.shot.t < .3 || b.shot.layup) {
        p.jump.swatted = true;
        const shooter = S.players[b.shot.slot], chance = clamp(.45 + .05 * (rate(p, 'swat') - rate(shooter, 'splash')), .1, .85) * tune('blockChance');
        if (S.rng() < chance || S.forceBlock) { S.forceBlock = false; return swat(p, shooter); }
      }
    }
  }
  const o = owner();
  if (o && o.team !== p.team && (o.state === 'dunk' || o.state === 'layup' || o.state === 'jumpshot')) {
    const hd = handWorld(o.rig, 'R'), d = Math.hypot(hd[0] - p.x, hd[1] - p.y), dz = Math.abs(hd[2] - hz);
    if (d < rch + 4 && dz < rch + 6 && !(o.dunk && o.dunk.slammed)) {
      p.jump.swatted = true;
      const chance = o.state === 'dunk' ? clamp(.36 + .06 * (rate(p, 'swat') - rate(o, 'slam')), .08, .8) * tune('blockChance') * (cheat('unblockable') ? 0 : 1) * (o.def.team === 'blambots' && S.match.overclock > 0 ? .5 : 1)
        : clamp(.4 + .05 * (rate(p, 'swat') - rate(o, 'splash')), .1, .8) * tune('blockChance');
      if (S.rng() < chance) swat(p, o);
    }
  }
}
function swat(p, victim) {
  const b = S.ball, toward = XM - p.x, a = Math.atan2(YM - p.y + (S.rng() - .5) * 60, toward);
  if (victim && victim.state === 'dunk') { victim.state = 'air'; victim.dunk = null; victim.rig.spin = 0; victim.jump = { kind: 'dunkfall', t: 0 }; victim.vx *= -.3; }
  if (victim && (victim.state === 'jumpshot' || victim.state === 'layup')) { victim.state = 'air'; }
  b.owner = null; b.state = 'loose'; b.shot = null; b.vx = Math.cos(a) * 240; b.vy = Math.sin(a) * 160; b.vz = 120; b.touched = true;
  p.stats.BLK++;
  P.impact(b.x, b.y, b.z, 1.2, '#ff5a3a'); P.sparks(b.x, b.y, b.z, 8, a); game.shake(2); sfxAt('block', p.x); rumble(.4, .15);
  emit('block', { slot: p.slot, victim: victim ? victim.slot : -1, name: p.name, victimName: victim ? victim.name : '' });
}

/* ---- passing ---- */
function passTo(p, to, kind = 'chest', o = {}) {
  const b = S.ball; if (!to) return;
  const spd = (180 + 12 * rate(p, 'dime')) * 1.6, hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: Math.max(12, hand[2]) });
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  let t = o.time || clamp(d / spd, .12, 1.2);
  const tx = to.x + to.vx * t * .8, ty = to.y + to.vy * t * .8, tz = o.tz || (isAir(to) ? to.z + reach(to) * .8 : reach(to) * .6);
  const g = tune('ballGravity'), v = kind === 'lob' ? E.arc(from, { x: tx, y: ty, z: tz }, g, { apex: 28 }) : E.arc(from, { x: tx, y: ty, z: tz }, g, { time: t });
  b.owner = null; b.state = 'pass'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.passer = p.slot;
  b.pass = { to, t: 0, T: v.t, kind, tried: new Set(), passer: p, oop: !!o.oop, tip: !!o.tip };
  p.cool.pass = .3; p.act = { kind: kind === 'lob' ? 'passLob' : 'passChest', t: 0, T: .2 };
  if (p.state === 'jumpshot') p.state = 'air';
  sfxAt('release', p.x, { vol: .5 }); emit('pass', { slot: p.slot, to: to.slot, kind });
}
function passFlight(dt) {
  const b = S.ball, ps = b.pass; if (!ps) return; ps.t += dt;
  const to = ps.to;
  // the catch: the ball near the receiver's hands
  if (to && to.state !== 'knocked' && to.state !== 'reboot' && to.cool.catch <= 0 && !(ps.oop && to.state === 'dunk')) {
    const hz = to.z + reach(to) * .6;
    if (Math.hypot(b.x - to.x, b.y - to.y) < 14 && b.z < to.z + reach(to) + 8 && b.z > to.z) { giveBall(to); to.assistFrom = ps.passer.slot; if (to.state === 'air' && to.jump && to.jump.kind === 'rebound') to.state = 'air'; return; }
  }
  // interceptions: a defender near the ball's line, once each
  for (const f of ps.tip ? [] : foes(ps.passer)) {
    if (ps.tried.has(f) || f.state === 'knocked' || f.state === 'reboot') continue;
    const d = Math.hypot(b.x - f.x, b.y - f.y);
    if (d < 10 && b.z < handsZ(f) + 4 && b.z > f.z) {
      ps.tried.add(f);
      const ch = clamp(.15 + .04 * (rate(f, 'swipe') - rate(ps.passer, 'dime')) + .2, .15, .55) * (f.powerup && f.powerup.id === 'glue' ? 3 : 1);
      if (S.rng() < ch) { const from = ps.passer; giveBall(f); f.stats.STL++; emit('steal', { slot: f.slot, victim: from.slot, name: f.name, victimName: from.name, intercept: true }); sfxAt('steal', f.x); return; }
    }
  }
  if (ps.t > ps.T + .25) toLoose();
}
/** an alley-oop: the teammate leaps for the rim, the passer lobs to meet its hands; out of range, a lob pass */
function alleyOop(p) {
  const t = mate(p); if (!t) return;
  const h = attackHoop(p.team), d = Math.hypot(t.x - h.x, t.y - h.y), range = dunkRange(t) * 1.15 + rate(p, 'dime') * 4;
  if (d <= range && !isAir(t) && t.state === 'run' && (t.x - h.x) * h.dir > -6) {
    startDunk(t, { oop: true });
    const D = t.dunk, tc = D.T * .7, lead = .08;
    const at = { x: D.from[0] + D.v.vx * tc, y: D.from[1] + D.v.vy * tc, z: D.from[2] + D.v.vz * tc - .5 * D.g * tc * tc + reach(t) * .95 };
    const hand = handAt(p), from = inArena({ x: hand[0], y: hand[1], z: Math.max(14, hand[2]) }), v = E.arc(from, at, tune('ballGravity'), { time: Math.max(.2, tc - lead) });
    const b = S.ball; b.owner = null; b.state = 'pass'; b.x = from.x; b.y = from.y; b.z = from.z; b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.passer = p.slot;
    b.pass = { to: t, t: 0, T: v.t, kind: 'lob', tried: new Set(), passer: p, oop: true };
    t.assistFrom = p.slot;
    p.cool.pass = .4; p.act = { kind: 'passLob', t: 0, T: .25 }; sfxAt('release', p.x);
    emit('alleyoopStart', { slot: p.slot, to: t.slot });
  } else passTo(p, t, 'lob');
}

/* ---- defense: steals, shoves, spins ---- */
function startSteal(p) {
  p.state = 'steal'; p.st = 0; p.act = { kind: 'steal', t: 0, T: .4, hit: p.human ? .1 : .14 }; p.cool.steal = tune('stealCooldown');
  const o = owner(); if (o) p.facing = Math.atan2(o.y - p.y, o.x - p.x);
  p.vx += Math.cos(p.facing) * 40; p.vy += Math.sin(p.facing) * 40; sfxAt('spin', p.x, { vol: .4 });
}
function startShove(p) {
  p.state = 'shove'; p.st = 0; p.act = { kind: 'shove', t: 0, T: .45, hit: p.human ? .06 : .1 }; p.cool.shove = tune('shoveCooldown');
  if (!infTurbo(p)) p.turbo = Math.max(0, p.turbo - tune('shoveCost'));
  const tg = foes(p).filter(f => f.state !== 'knocked').sort((a, c) => dist2(a, p) - dist2(c, p))[0];
  if (tg && dist2(tg, p) < 40) p.facing = Math.atan2(tg.y - p.y, tg.x - p.x);
  p.vx += Math.cos(p.facing) * 70; p.vy += Math.sin(p.facing) * 70;
}
function actStep(p, dt) {
  const a = p.act; if (!a) { p.state = 'run'; return; }
  a.t += dt;
  if (!a.done && a.t >= a.hit) {
    a.done = true;
    if (a.kind === 'steal') stealHit(p); else if (a.kind === 'shove') shoveHit(p);
  }
  if (a.t >= a.T) { p.state = 'run'; p.act = null; p.st = 0; }
}
function stealHit(p) {
  const o = owner(); if (!o || o.team === p.team) return;
  const d = dist2(o, p), rch = tune('stealReach') + rate(p, 'swipe') * .6, facing = Math.abs(E.angDiff(p.facing, Math.atan2(o.y - p.y, o.x - p.x)));
  if (d > rch || facing > 1.3 || o.state === 'spin' || (o.state === 'dunk' && o.z > 20)) { emit('stealMiss', { slot: p.slot }); return; }
  // angle: from behind or the dribble-hand side is easier
  const fromAng = E.angDiff(o.facing, Math.atan2(p.y - o.y, p.x - o.x)), behind = Math.abs(fromAng) > 2, dribbleSide = Math.sign(fromAng) === o.dribSide;
  let ch = tune('stealChance') * fac.swipe(p) * (1.25 - .05 * rate(o, 'dime')) * (behind || dribbleSide ? 1.4 : .6) * (o.cmd.tD ? 1.15 : 1);
  if (p.nova) ch *= 1.2; if (p.def.team === 'blambots' && S.match && S.match.twist && S.match.twist.kind === 'boss') ch *= 1.15;
  if (o.state === 'jumpshot' || o.state === 'layup') ch = 0;
  if (p.powerup && p.powerup.id === 'glue' && !(o.powerup && o.powerup.id === 'glue')) ch = 1;
  if (o.powerup && o.powerup.id === 'glue' && !(p.powerup && p.powerup.id === 'glue')) ch = 0;
  if (S.rng() < ch) {
    if (d < 9) giveBall(p, 'steal'); else { looseBall((p.x - o.x) * 3, (p.y - o.y) * 3, 80); S.ball.x = o.x; S.ball.y = o.y; S.ball.z = 20; S.ball.lastTeam = o.team; }
    p.stats.STL++; P.glints(o.x, o.y, 20, 6, '#5aff8a'); sfxAt('steal', p.x); rumble(.3, .1, p);
    emit('steal', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name });
  } else emit('stealMiss', { slot: p.slot });
}
function shoveHit(p) {
  const bomb = p.powerup && p.powerup.id === 'bomb';
  if (bomb) {
    endPowerup(p); P.explosion(p.x, p.y, 10, 1.4, { freeze: false }); game.shake(5);
    for (const f of foes(p)) if (dist2(f, p) < 60) { const fum = hasBall(f); knockDown(f, tune('knockdownTime') * 1.3, p); if (fum) fumble(f, p); }
    emit('bomb', { slot: p.slot }); return;
  }
  const tg = foes(p).filter(f => f.state !== 'knocked' && f.state !== 'reboot' && dist2(f, p) < 22 + 6 && Math.abs(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) < 1.05 && Math.abs(f.z - p.z) < 26)[0];
  if (!tg) { emit('shoveMiss', { slot: p.slot }); return; }
  const k = (tune('knockdownTime') + .04 * (rate(p, 'bump') - rate(tg, 'bump'))) * (cheat('oneShove') ? 1.5 : 1);
  const had = hasBall(tg), inAir = tg.state === 'jumpshot' || tg.state === 'layup';
  knockDown(tg, clamp(k, .3, 1.4), p);
  const force = tune('shoveForce') * (.75 + .05 * rate(p, 'bump')), a = p.facing; tg.vx = Math.cos(a) * force; tg.vy = Math.sin(a) * force;
  P.impact((p.x + tg.x) / 2, (p.y + tg.y) / 2, 24, 1, '#ffd23a'); game.shake(2); sfxAt('shove', p.x); rumble(.5, .15, tg);
  tg.juice = Math.max(0, tg.juice - .06 * tune('fatigue'));
  emit('shove', { slot: p.slot, victim: tg.slot, name: p.name, victimName: tg.name });
  if (had) { const fch = inAir ? .7 : clamp(tune('shoveFumble') + .04 * (rate(p, 'bump') - rate(tg, 'bump')), .2, .95); if (S.rng() < fch || cheat('oneShove')) fumble(tg, p); }
}
function fumble(v, by) { const b = S.ball; if (b.owner !== v) return; looseBall(v.vx * .5 + (S.rng() - .5) * 80, v.vy * .5 + (S.rng() - .5) * 80, 120); b.z = Math.max(b.z, 20); b.lastTeam = v.team; emit('fumble', { slot: v.slot, by: by ? by.slot : -1 }); }
function knockDown(p, t, by) {
  if (p.state === 'dunk') { p.dunk = null; p.rig.spin = 0; }
  if (hasBall(p) && (p.state === 'jumpshot' || p.state === 'layup')) fumble(p, by);
  p.state = 'knocked'; p.knock = t; p.st = 0; p.act = null; p.jump = null; p.stats.KD++;
  sfxAt('fall', p.x); P.dust(p.x, p.y, 0, 8);
  if (by && p.def.team === 'blambots' && S.match && S.match.twist && S.match.twist.kind === 'boss') {   // two knockdowns within 10 s: SYSTEM REBOOT
    const now = S.match.time; p.knocks = p.knocks.filter(k => now - k < 10); p.knocks.push(now);
    if (p.knocks.length >= 2) { p.knocks = []; p.reboot = 3 + t; emit('reboot', { slot: p.slot, name: p.name }); sfxAt('reboot', p.x); P.sparks(p.x, p.y, 30, 16, null, { color: '#5ac8ff' }); }
  }
  emit('knockdown', { slot: p.slot, by: by ? by.slot : -1 });
}
function spinMove(p) {
  p.state = 'spin'; p.st = 0; p.cool.spin = tune('spinCooldown'); if (!infTurbo(p)) p.turbo = Math.max(0, p.turbo - tune('spinCost'));
  sfxAt('spin', p.x); emit('spin', { slot: p.slot });
  for (const f of foes(p)) {
    const d = dist2(f, p), ahead = Math.abs(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) < .9;
    if (d < 22 && ahead && f.state !== 'knocked' && !isAir(f) && S.rng() < clamp(.35 + .04 * (rate(p, 'dime') - rate(f, 'swipe')), .15, .7)) { knockDown(f, .45, null); f.dizzy = .6; emit('ankles', { slot: p.slot, victim: f.slot, name: p.name, victimName: f.name }); }
  }
}

/* ---- loose balls, rebounds, catches ---- */
function grabCheck(p) {
  const b = S.ball, m = S.match;
  if (b.owner || p.state === 'knocked' || p.state === 'reboot' || p.state === 'dunk' || p.cool.catch > 0) return;
  if (b.state !== 'loose' && !(b.state === 'shot' && b.shot && b.shot.t > .35 && b.touched)) return;
  if (m && m.phase !== 'live' && m.phase !== 'clockout') return;
  const d = Math.hypot(b.x - p.x, b.y - p.y), top = p.z + reach(p) + 4;
  if (d < 11 && b.z <= top && b.z >= p.z - 2) {
    const was = b.lastTeam, off = b.shot ? b.shot.team === p.team : was === p.team, air = isAir(p), touched = b.touched;
    const shotT = b.shot; giveBall(p, 'catch'); if (air) b.state = 'held';
    if (shotT || touched) { p.stats.REB++; emit('rebound', { slot: p.slot, offensive: off, air }); }
    // a putback: an offensive rebound in the air near the rim with turbo slams it home
    const h = attackHoop(p.team);
    if (air && off && p.cmd.tD && Math.hypot(p.x - h.x, p.y - h.y) < 40) { startDunk(p, { putback: true }); }
  }
}

/* ---- power-ups ---- */
function givePowerup(p, id) {
  const def = get('powerup', id); if (p.powerup) endPowerup(p, true);
  p.powerup = { id, t: def.seconds, shots: def.shots || 0 };
  if (id === 'gold') S.match.gold = p.team;
  P.glints(p.x, p.y, 20, 12, def.color); P.text(p.x, p.y, 50, '+' + def.name, def.color, { scale: 1 }); sfxAt('powerup', p.x);
  emit('powerupPick', { slot: p.slot, id, name: p.name });
}
function endPowerup(p, quiet) { if (!p.powerup) return; if (!quiet) { sfxAt('pu_end', p.x); emit('powerupEnd', { slot: p.slot, id: p.powerup.id }); } p.powerup = null; }

/* ---- the twists' geometry ---- */
function onSlick(p) { const m = S.match; return !!(m && m.twist && m.twist.slicks && !isAir(p) && m.twist.slicks.some(s => Math.hypot((p.x - s.x) / s.rx, (p.y - s.y) / s.ry) < 1)); }
const VENTS = [{ x: X0 + 200, y: Y0 + 60 }, { x: X0 + 440, y: Y0 + 228 }];
function onVent(p) { const m = S.match; return !!(m && m.twist && m.twist.kind === 'eruption' && VENTS.some(v => Math.hypot(p.x - v.x, p.y - v.y) < 18)); }

/* ---- rumble on the pads of the players involved ---- */
function rumble(strength, seconds, p) {
  if (S.net && S.net.role === 'server') return;
  const list = p ? [p] : S.players; for (const q of list) if (q.human && q.human.rumble) { try { q.human.rumble(strength, seconds); } catch (e) { /* no vibration */ } }
}

/* ---- 33-anim.js ---- */
/* ANIMATION: each step a player's state becomes the engine rig's own inputs (run, air, down, flip, spin, pose, expr) plus
 * hand targets for the pose layer; the ball rides the hands. The dribble is procedural and synced to the ball: a phase
 * that falls to the floor and back, crossing over when the handler turns hard or a defender reaches the dribble side. */
const keyLerp = (keys, u) => {   // eased interpolation between [u, {R, L, B}] keys
  let a = keys[0], c = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (u >= keys[i][0] && u <= keys[i + 1][0]) { a = keys[i]; c = keys[i + 1]; break; }
  const span = c[0] - a[0] || 1, t = E.ease.inOutSine(clamp((u - a[0]) / span, 0, 1)), out = {};
  for (const k of ['R', 'L', 'B']) { const A0 = a[1][k], C0 = c[1][k]; if (A0 && C0) out[k] = [lerp(A0[0], C0[0], t), lerp(A0[1], C0[1], t), lerp(A0[2], C0[2], t)]; else if (A0 || C0) out[k] = (A0 || C0).slice(); }
  return out;
};
const both = (B, w = 1.6) => ({ R: [B[0], B[1] + w, B[2]], L: [B[0], B[1] - w, B[2]] });
/** the celebrations and taunts: hand targets over time */
const MOVES = {
  raiseRoof: t => { const k = Math.sin(t * 19) > 0 ? 42 : 34; return { R: [2, 5, k], L: [2, -5, k] }; },
  chestPound: t => Math.floor(t * 6) % 2 ? { R: [4, -1, 25], L: [3, -4, 18] } : { R: [3, 4, 18], L: [4, 1, 25] },
  flex: () => ({ R: [1, 7, 30], L: [1, -7, 30] }),
  pointSky: () => ({ R: [2, 3, 46], L: [3, -4, 18] }),
  fingerGuns: t => ({ R: [10, 2, 26 + (Math.floor(t * 4) % 2) * 3], L: [10, -2, 26] }),
  surf: t => ({ R: [0, 11, 24 + Math.sin(t * 6) * 3], L: [0, -11, 24 - Math.sin(t * 6) * 3] }),
  goggles: () => ({ R: [6, 1.5, 29], L: [6, -1.5, 29] }),
  fingerWag: t => ({ R: [7, 2 + Math.sin(t * 16) * 2, 34], L: [3, -4, 16] }),
  shimmy: t => ({ R: [4, 5 + Math.sin(t * 20) * 2, 20], L: [4, -5 + Math.sin(t * 20) * 2, 20] }),
  watch: () => ({ R: [6, -1, 22], L: [6, 1, 21] }),
  stoneFace: () => ({ R: [3, -3, 20], L: [3, 3, 20] }),
  blowFingers: () => ({ R: [7, 1, 28], L: [3, -4, 16] }),
  pogo: () => ({ R: [2, 4, 34], L: [2, -4, 34] }),
  robot: t => Math.floor(t * 4) % 2 ? { R: [6, 4, 24], L: [0, -6, 14] } : { R: [0, 6, 14], L: [6, -4, 24] },
  tilt: () => ({ R: [3, 3, 18], L: [3, -3, 18] }),
  glitchWave: t => ({ R: [2, 7, 34 + (Math.floor(t * 12) % 3) * 3], L: [3, -4, 16] }),
  micDrop: t => t < .5 ? { R: [5, 4, 30], L: [3, -4, 18] } : { R: [5, 6, 14], L: [3, -4, 18] },
  pointCam: () => ({ R: [12, 4, 26], L: [3, -4, 18] }),
  gorilla: t => Math.floor(t * 8) % 2 ? { R: [4, -2, 26], L: [3, -5, 22] } : { R: [3, 5, 22], L: [4, 2, 26] }
};
const POSE_HOP = { pogo: t => Math.abs(Math.sin(t * 10)) * 6, gorilla: () => 0, raiseRoof: t => Math.abs(Math.sin(t * 9.5)) * 1.5 };

/** the rig's inputs for p this step, then the ball on its hands */
function poseAndBall(p, dt) {
  const b = S.ball, rig = p.rig, has = b && b.owner === p, st = p.state, sz = rig.o.size;
  let T = null, pose = null, expr = p.expr, air = isAir(p) && st !== 'hang', down = 0, flip = 0, hurt = false, run = 0, land = 0;
  const o = owner(), defending = o && o.team !== p.team && !has;
  // the dribble's phase
  if (has && b.state === 'dribble' && !isAir(p)) {
    const sp = Math.hypot(p.vx, p.vy), hz = sp > 140 ? 3.8 : sp > 30 ? 3 : 2.2, prev = p.dribPh;
    p.dribPh = (p.dribPh + dt * hz) % 1;
    if (prev < .5 && p.dribPh >= .5) { sfxAt('dribble_' + (S.court ? get('court', S.court).dribble : 'maple'), p.x, { vol: .55 }); }
    if (prev > p.dribPh) {   // a new bounce: cross over when turning hard or a defender reaches the dribble side
      const ang = Math.atan2(p.vy, p.vx), turned = sp > 40 && Math.abs(E.angDiff(ang, p.lastAng || ang)) > 1.75;
      const threat = foes(p).some(f => dist2(f, p) < 20 && Math.sign(E.angDiff(p.facing, Math.atan2(f.y - p.y, f.x - p.x))) === p.dribSide);
      if (turned || threat) { p.dribSide = -p.dribSide; p.cross = .25; }
      p.lastAng = ang;
    }
    p.cross = Math.max(0, p.cross - dt);
  }
  switch (st) {
    case 'knocked': down = p.knock > .25 ? Math.min(1, p.st / .15) : Math.max(0, p.knock / .25); hurt = p.st < .3; expr = 'wince'; break;
    case 'dunk': {
      const D = p.dunk, u = D.t / D.T, k = keyLerp(D.def.keys, u);
      T = k.B ? both(k.B) : { R: k.R, L: k.L }; expr = 'shout'; flip = D.def.flip ? clamp((u - .25) / .5, 0, 1) : 0; if (flip >= 1) flip = 0;
      if (D.oop && !has) T = { R: [4, 2, 44], L: [4, -2, 42] };
      break;
    }
    case 'hang': T = both([2, 0, 40], 4); expr = 'shout'; break;
    case 'jumpshot': {
      const j = p.jump, u = clamp(j.t / Math.max(.05, j.apexT), 0, 1.3);
      T = { R: [3, 1, lerp(22, 34, Math.min(1, u))], L: [2.5, -2.2, lerp(22, 31, Math.min(1, u))] }; break;
    }
    case 'layup': { const u = clamp(p.jump.t / p.jump.relT, 0, 1); T = { R: [lerp(5, 7, u), 2, lerp(18, 42, u)], L: [3, -3, 26] }; break; }
    case 'spin': T = { R: [3, 9, 20], L: [3, -9, 22] }; rig.spin = (p.st / .35) * TAU * -p.dribSide; break;
    case 'shove': { const a = p.act, u = a ? a.t : 0; T = u < .08 ? both([3, 0, 20], 3.5) : both([12, 0, 21], 3); expr = 'angry'; break; }
    case 'steal': { const a = p.act, u = a ? a.t / a.T : 0; T = { R: u < .5 ? [lerp(4, 11, u * 2), 2, lerp(18, 13, u * 2)] : [lerp(11, 4, (u - .5) * 2), 2, 14], L: [3, -5, 18] }; break; }
    case 'air': {
      const j = p.jump;
      if (j && j.kind === 'block') { T = j.swatted ? { R: [8, 1, 32], L: [1, -3, 40] } : both([1, 0, 40], 3); expr = 'shout'; }
      else if (j && (j.kind === 'rebound' || j.kind === 'tip')) T = j.kind === 'tip' ? { R: [2, 2, 44], L: [2, -4, 20] } : both([3, 0, 40], 2);
      else if (has) T = both([4, 0, 26]);
      break;
    }
    case 'inbound': T = both([5, 0, 30], 1.8); break;
  }
  // the reboot: frozen with arms out, sparking
  if (p.reboot > 0) { T = { R: [6, 6, 20], L: [6, -6, 22] }; expr = 'wince'; }
  // the ball handler's hands: the dribble, or holding it
  if (has && !T) {
    if (b.state === 'dribble' && !isAir(p)) {
      const s = p.dribSide, u = p.dribPh, f = (2 * u - 1) * (2 * u - 1), hip = rig.o.hipZ, bz = BALL_R / sz + (hip - BALL_R / sz) * f;
      const bl = [5 + (p.cross > 0 ? 0 : 0), s * (p.cross > 0 ? lerp(-6, 6, 1 - p.cross / .25) : 6), bz];
      p._ballLocal = bl;
      const handZ = Math.max(bz + BALL_R / sz + .5, hip + 1 - (1 - f) * 3);
      const handOn = [bl[0], bl[1] + s * .5, handZ], guard = [6, -s * 5, 19];
      T = s > 0 ? { R: handOn, L: guard } : { L: handOn, R: guard };
    } else T = both([5, 0, 18]);
  }
  if (!has) p._ballLocal = null;
  if (!T && defending && dist2(o, p) < 60 && !isAir(p) && st === 'run') { T = both([3, 0, 22], 8); pose = 'crouch'; }
  if (!T && p.celebrate > 0) { T = (MOVES[p.celebKind] || MOVES.pointSky)(1.1 - p.celebrate); expr = 'smile'; }
  if (!T && p.taunt > 0) { const fn = MOVES[p.def.taunt] || MOVES.flex; T = fn(.8 - p.taunt); expr = 'shout'; }
  if (!T && b && !b.owner && b.state === 'pass' && b.pass && b.pass.to === p) {   // reaching for a pass
    T = both([6, 0, clamp((b.z - p.z) / sz, 14, 40)], 2);
  }
  if (p.act && (p.act.kind === 'passChest' || p.act.kind === 'passLob')) {
    p.act.t += dt; const u = clamp(p.act.t / p.act.T, 0, 1), z0 = p.act.kind === 'passLob' ? 22 : 19, z1 = p.act.kind === 'passLob' ? 38 : 20;
    T = both([lerp(4, 11, u), 0, lerp(z0, z1, u)], 1.5); if (p.act.t >= p.act.T) p.act = null;
  }
  // dizzy stars after being posterized show as a wince
  if (p.dizzy > 0 && st !== 'knocked') expr = 'wince';
  const hop = p.taunt > 0 && POSE_HOP[p.def.taunt] ? POSE_HOP[p.def.taunt](.8 - p.taunt) : 0;
  rig.bb.targets = T;
  if (st !== 'spin' && st !== 'dunk') rig.spin = approach(rig.spin, 0, dt * 20);
  if (p.land > 0) land = 1;
  rig.update(dt, { x: p.x, y: p.y, z: p.z + hop, vx: st === 'hang' ? 0 : p.vx, vy: st === 'hang' ? 0 : p.vy, facing: p.facing, air: air && st !== 'hang', down, flip, hurt, pose, expr, land, run });
  // the ball rides the hands
  if (has) {
    if (b.state === 'dribble' && p._ballLocal && !isAir(p)) { const w = rigPoint(rig, p._ballLocal); b.x = w[0]; b.y = w[1]; b.z = Math.max(BALL_R, w[2]); }
    else {
      const R = handWorld(rig, 'R'), Lh = handWorld(rig, 'L'), oneHand = st === 'dunk' && p.dunk.def.ball === 'R' && !(p.dunk.def.keys[0][1].B);
      const at = oneHand || st === 'layup' || st === 'jumpshot' ? R : [(R[0] + Lh[0]) / 2, (R[1] + Lh[1]) / 2, (R[2] + Lh[2]) / 2];
      b.x = at[0]; b.y = at[1]; b.z = at[2] + (st === 'jumpshot' || st === 'layup' || (st === 'dunk' && oneHand) ? BALL_R : 0);
    }
    b.vx = p.vx; b.vy = p.vy; b.vz = 0;
  }
}

/* ---- 34-ai.js ---- */
/* CPU AI: a brain per CPU player decides at 10 Hz (staggered) and steers every step, writing the same command a human's
 * controls would. Roles: handler (dunk / shoot / drive / pass / oop / spin, committed for at least .3 s), off the ball
 * (spot up, cut, call for it, chase power-ups), defender (man to man, steals, shoves, blocks), rebounder. Difficulty sets
 * decision noise, reaction, release timing and aggression; the comeback assist helps a trailing team. */
function newBrain(p, diffName) {
  return { diff: diffName || setting('difficulty') || 'pro', next: (p.slot * .025), plan: null, planT: 0, releaseAt: null, react: 0, mark: null, intent: '', jumpAt: -1, wait: 0 };
}
function diffOf(p) {
  const d = DIFF[p.brain.diff] || DIFF.pro, cb = comebackBonus(p.team) * .1;
  return { q: clamp(d.q + tune('cpuSkill') + cb, .05, 1), react: d.react * tune('cpuReaction'), rel: d.rel, blk: d.blk, steal: d.steal * tune('cpuAggression') * (p.def.team === 'blambots' ? 1.2 : 1), shove: d.shove * tune('cpuAggression') * (p.def.team === 'blambots' ? 1.3 : 1), turbo: d.turbo };
}
const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += S.rng(); return (u - 2) / .58; };
/** how open p is: distance to the nearest defender */
const openness = p => Math.min(...foes(p).filter(f => f.state !== 'knocked' && f.reboot <= 0).map(f => dist2(f, p)), 200);
function laneClear(p, h) {
  for (const f of foes(p)) {
    if (f.state === 'knocked' || f.reboot > 0) continue;
    const vx = h.x - p.x, vy = h.y - p.y, L = Math.hypot(vx, vy) || 1, u = ((f.x - p.x) * vx + (f.y - p.y) * vy) / L;
    if (u > 0 && u < L && Math.abs((f.x - p.x) * vy - (f.y - p.y) * vx) / L < 16) return false;
  }
  return true;
}
function steer(c, p, tx, ty, o = {}) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < (o.stop || 5)) { c.mx = 0; c.my = 0; return d; }
  let mx = dx / d, my = dy / d;
  // keep clear of oil slicks and lava rings when it can
  const t = S.match && S.match.twist;
  if (t && (t.slicks || t.bombs)) for (const h of [...(t.slicks || []).map(s => ({ x: s.x, y: s.y, r: s.rx + 14 })), ...t.bombs.filter(b => !b.hit).map(b => ({ x: b.x, y: b.y, r: 30 }))]) {
    const hx = h.x - p.x, hy = h.y - p.y, hd = Math.hypot(hx, hy); if (hd < h.r && hd > 1) { mx -= hx / hd * .9; my -= hy / hd * .9; }
  }
  const l = Math.hypot(mx, my) || 1, k = o.slow ? clamp(d / o.slow, .3, 1) : 1; c.mx = mx / l * k; c.my = my / l * k; return d;
}
function brainStep(p, passive) {
  const B = p.brain, c = p.cmd, m = S.match, dt = 1 / 120, b = S.ball;
  const keep = { sD: c.sD };
  Object.assign(c, emptyCmd()); if (!m || !B) return;
  const D = diffOf(p), h = attackHoop(p.team), own = defendHoop(p.team), o = owner();
  B.next -= dt; const decide = B.next <= 0; if (decide) B.next = .1;
  if (p.reboot > 0 || p.state === 'knocked') return;
  if (p.force && forcedStep(p)) return;
  if (S.cheats.cpuPassive && !p.human && p.team !== 0 && !(p.order && hasBall(p))) { if (p.state === 'jumpshot') { c.sD = p.jump.t < p.jump.apexT; c.sR = !c.sD; } return; }
  p.intent = '';
  // the tip-off: jump when the ball comes down toward the hands' reach
  if (m.phase === 'tipoff') {
    if (m.jumpers.includes(p) && m.tip && m.tip.tossed && !p.jump) {
      if (B.jumpAt < 0) B.jumpAt = .12 + gauss() * D.blk;
      if (m.tipT >= B.jumpAt) c.sP = true;
    } else B.jumpAt = -1;
    p.intent = 'TIP'; return;
  }
  B.jumpAt = -1;
  if (m.phase === 'inbound') {
    const I = m.inb;
    if (p === I.to) steer(c, p, I.rx, I.ry);
    else if (p.team !== I.team) { const mk = foes(p).filter(f => f !== I.who)[0] || I.to; steer(c, p, lerp(mk.x, own.x, .3), lerp(mk.y, own.y, .3)); }
    p.intent = 'INBOUND'; return;
  }
  if (passive || m.phase === 'scored') {   // heading back: the scored-on team to attack, the scorers to defend
    const tx = lerp(XM, own.x, .55), ty = YM + (p.slot % 2 ? 50 : -50); steer(c, p, tx, ty); p.intent = 'BACK'; return;
  }
  const want = (p.turbo > .25 || infTurbo(p)) && S.rng() < D.turbo;
  // a pass on its way to me: meet the ball
  if (b.state === 'pass' && b.pass && b.pass.to === p && !b.pass.oop) { const t2 = Math.max(0, b.pass.T - b.pass.t); steer(c, p, b.x + b.vx * t2, b.y + b.vy * t2, { stop: 4, slow: 20 }); p.intent = 'CATCH'; return; }
  /* ---- with the ball ---- */
  if (o === p) {
    if (p.state === 'jumpshot') {   // hold, release at the top (with its timing error)
      if (B.releaseAt === null) B.releaseAt = p.jump.apexT + gauss() * D.rel - .01;
      c.sD = p.jump.t < B.releaseAt; c.sR = !c.sD; p.intent = 'SHOOT'; if (!c.sD) B.releaseAt = null; return;
    }
    if (busy(p) || isAir(p)) { c.sD = keep.sD; return; }
    const d = Math.hypot(p.x - h.x, p.y - h.y), t = mate(p);
    // a human teammate's orders
    if (p.order && (p.order.t -= dt) > 0) {
      const k = p.order.kind; p.order = null;
      if (k === 'pass') { c.pP = true; return; } if (k === 'oop') { c.oP = true; return; } if (k === 'shoot') { if (canDunkFrom(p) && want) { c.tD = true; } c.sP = true; return; }
    }
    if (decide || !B.plan || B.planT <= 0) {
      const opts = [];
      const urgent = m.shotClock < 4 || (m.clock < 3 && m.phase === 'live');
      const lane = laneClear(p, h), dunkable = (p.turbo >= .1 || infTurbo(p)) && d <= dunkRange(p) && (p.x - h.x) * h.dir > -6;
      if (dunkable) { const guarded = foes(p).some(f => f.state === 'run' && Math.hypot(f.x - h.x, f.y - h.y) < Math.hypot(p.x - h.x, p.y - h.y) && dist2(f, p) < 45); opts.push(['dunk', (lane ? .62 : .3) * (.55 + rate(p, 'slam') * .045) - (guarded ? .25 : 0) + (urgent ? .4 : 0)]); }
      const ch = shotChance(p, 'good'), pts = isThree(p.x, p.y, h) ? 3 : 2;
      opts.push(['shoot', ch.p * pts * .55 + (urgent ? .8 : 0) - (d > 230 ? .6 : 0) - (d < 60 && dunkable ? .15 : 0)]);
      if (d > 50 && lane) opts.push(['drive', .5 + (d > 120 ? .2 : 0)]);
      if (t && t.state === 'run') {
        const open = openness(t), mine = openness(p), risk = foes(p).some(f => segDistAI(f, p, t) < 12) ? .35 : 0, td = Math.hypot(t.x - h.x, t.y - h.y);
        opts.push(['pass', (open - mine) / 80 + .25 - risk + (td < d - 40 ? .25 : 0) + (p.hold > 3 ? .3 : 0)]);
        if (td <= dunkRange(t) * 1.15 + rate(p, 'dime') * 4 && open > 22 && (t.x - h.x) * h.dir > -6) opts.push(['oop', .6 + rate(p, 'dime') * .03 - risk]);
      }
      const ahead = foes(p).find(f => dist2(f, p) < 22 && Math.abs(E.angDiff(Math.atan2(h.y - p.y, h.x - p.x), Math.atan2(f.y - p.y, f.x - p.x))) < .8);
      if (ahead && (p.turbo > .25 || infTurbo(p)) && p.cool.spin <= 0) opts.push(['spin', .7]);
      if (!lane && d > 60) opts.push(['probe', .45]);
      if (m.twist && m.twist.kind === 'wind' && m.wind && m.shotClock > 6 && d > 100) opts.push(['wait', .7]);
      // the vent: a VOLCANO LAUNCH from a puffing vent in the offensive half
      if (m.twist && m.twist.kind === 'eruption') { const v = VENTS.find(v => (v.x - XM) * h.dir < 0 === false && Math.hypot(v.x - p.x, v.y - p.y) < 90 && (v.x - XM) * h.dir > 0); if (v) opts.push(['vent', .9]); }
      for (const op of opts) op[1] += (S.rng() - .5) * (1 - D.q) * 1.4;
      opts.sort((a, c2) => c2[1] - a[1]);
      B.plan = opts[0][0]; B.planT = .3;
    }
    B.planT -= dt; p.intent = B.plan.toUpperCase();
    switch (B.plan) {
      case 'dunk': steer(c, p, h.x - h.dir * 4, h.y); c.tD = true; if (d <= dunkRange(p) * (.6 + S.rng() * .4)) c.sP = true; break;
      case 'shoot': c.mx = c.my = 0; c.sP = true; c.sD = true; B.releaseAt = null; B.plan = null; break;
      case 'drive': steer(c, p, h.x - h.dir * 10, h.y + (p.y - h.y) * .3); c.tD = want && d > 70; break;
      case 'probe': { const side = p.y < YM ? 1 : -1; steer(c, p, lerp(p.x, h.x, .3), YM + side * 80); c.tD = want; break; }
      case 'pass': c.pP = true; B.plan = null; break;
      case 'oop': c.oP = true; B.plan = null; break;
      case 'spin': c.vP = true; steer(c, p, h.x, h.y); B.plan = null; break;
      case 'wait': steer(c, p, p.x - h.dir * 10, p.y, { stop: 8 }); break;
      case 'vent': { const v = VENTS.find(v => (v.x - XM) * h.dir > 0) || VENTS[0]; const dd = steer(c, p, v.x, v.y, { stop: 4 }); if (dd < 14 && m.twist.ventOn) { c.tD = true; c.sP = true; } break; }
    }
    return;
  }
  /* ---- the ball loose or a shot in the air: rebound or chase ---- */
  if (!o && (b.state === 'loose' || b.state === 'shot' || (b.state === 'pass' && b.pass && b.pass.to.team !== p.team))) {
    const mine = S.players.filter(q => q.team === p.team), near = mine.sort((a, c2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c2.x - b.x, c2.y - b.y))[0];
    let tx = b.x, ty = b.y;
    if (b.state === 'shot' && b.shot) { const hh = HOOPS[b.shot.hoop]; tx = hh.x + hh.dir * 30; ty = hh.y + (p.slot % 2 ? 16 : -16); }
    if (b.state === 'pass') { tx = b.x + b.vx * .2; ty = b.y + b.vy * .2; }
    if (near === p || b.state === 'shot') {
      steer(c, p, tx, ty); c.tD = want && Math.hypot(tx - p.x, ty - p.y) > 40; p.intent = b.state === 'shot' ? 'BOX OUT' : 'CHASE';
      const hd = Math.hypot(b.x - p.x, b.y - p.y);
      if (hd < 16 && b.z > p.z + reach(p) * .9 && b.z < p.z + reach(p) + 40 && b.vz < 60 && !isAir(p) && S.rng() < .2 + D.q * .4) c.sP = true;
    } else { steer(c, p, lerp(b.x, own.x, .4), YM + (p.slot % 2 ? 40 : -40)); p.intent = 'GET BACK'; }
    return;
  }
  /* ---- teammate has it: get open ---- */
  if (o && o.team === p.team) {
    const d = Math.hypot(o.x - h.x, o.y - h.y), cutting = d < 140 && o.state === 'run';
    let tx, ty;
    if (cutting) { tx = h.x - h.dir * 40; ty = h.y + (o.y < YM ? 50 : -50); p.intent = 'CUT'; }
    else { tx = h.x - h.dir * 120; ty = o.y < YM ? Y1 - 50 : Y0 + 50; p.intent = 'SPOT UP'; }
    const pu = m.powerups.find(q => Math.hypot(q.x - p.x, q.y - p.y) < 120);
    if (pu) { tx = pu.x; ty = pu.y; p.intent = 'POWER-UP'; }
    if (Math.hypot(o.x - p.x, o.y - p.y) < 60) { ty += p.y < o.y ? -40 : 40; }
    steer(c, p, tx, ty, { slow: 30 }); c.tD = want && Math.hypot(tx - p.x, ty - p.y) > 80;
    if (o.human && openness(p) > 50 && decide && S.rng() < .05) emit('call', { slot: p.slot, kind: 'open' });
    return;
  }
  /* ---- defense: man to man ---- */
  if (o && o.team !== p.team) {
    const fs = foes(p), t = mate(p);
    // marks: the pairing with the least running; the nearer defender takes the handler when it drives
    if (decide || !B.mark || !fs.includes(B.mark)) {
      const [a1, a2] = fs, other = t;
      const cost1 = Math.hypot(p.x - a1.x, p.y - a1.y) + (other ? Math.hypot(other.x - a2.x, other.y - a2.y) : 0);
      const cost2 = Math.hypot(p.x - a2.x, p.y - a2.y) + (other ? Math.hypot(other.x - a1.x, other.y - a1.y) : 0);
      B.mark = cost1 <= cost2 ? a1 : a2;
      if (other && other.human) B.mark = fs.sort((x, y) => dist2(p, x) - dist2(p, y))[0];
    }
    const mk = B.mark, onBall = mk === o, gap = onBall ? 16 : 30;
    const vx = own.x - mk.x, vy = own.y - mk.y, L = Math.hypot(vx, vy) || 1, gx = mk.x + vx / L * gap, gy = mk.y + vy / L * gap;
    steer(c, p, gx, gy, { stop: 3 }); c.tD = want && Math.hypot(gx - p.x, gy - p.y) > 50;
    p.intent = onBall ? 'MARK ' + o.name : 'HELP';
    // blocks: the shooter rising nearby, after the reaction delay
    if (onBall || dist2(o, p) < 40) {
      if (o.state === 'jumpshot' || o.state === 'layup' || o.state === 'dunk') {
        B.react += dt;
        if (B.react > D.react + Math.abs(gauss()) * D.blk && !isAir(p) && dist2(o, p) < 46 && S.rng() < .5 + D.q * .4) { c.sP = true; p.intent = 'BLOCK'; }
      } else B.react = 0;
      // steals and shoves
      const dd = dist2(o, p);
      if (dd < tune('stealReach') + 4 && p.cool.steal <= 0 && o.state === 'run' && S.rng() < D.steal * dt * (.6 + rate(p, 'swipe') * .06)) { c.pP = true; p.intent = 'STEAL'; }
      const paint = Math.hypot(o.x - own.x, o.y - own.y) < 90;
      if (dd < 24 && p.cool.shove <= 0 && (p.turbo > .3 || infTurbo(p)) && (paint || o.state === 'jumpshot') && S.rng() < D.shove * dt * 2.2) { c.vP = true; p.intent = 'SHOVE'; }
    } else {
      // knock down the off-ball cutter now and then (it's legal)
      if (dist2(mk, p) < 22 && p.cool.shove <= 0 && p.turbo > .5 && S.rng() < D.shove * dt * .4) c.vP = true;
    }
    return;
  }
  // nobody has it (a pass in flight to our team): drift toward the rim
  steer(c, p, lerp(p.x, h.x, .3), p.y);
}
const segDistAI = (o, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l = vx * vx + vy * vy || 1, u = clamp(((o.x - a.x) * vx + (o.y - a.y) * vy) / l, 0, 1); return Math.hypot(a.x + vx * u - o.x, a.y + vy * u - o.y); };

/* ---- 35-match.js ---- */
/* MATCH: one match's flow (tip-off, quarters, the game and shot clocks, possession, inbounds, breaks, overtime and
 * SUDDEN BLAM), Supernova, shatters and the sponsor break, the power-up spawner, the court twists, juice and subs,
 * stats and style points. startMatch(cfg) builds it; matchStep(dt) runs one fixed step. */
const PHASE_LIVE = new Set(['live', 'clockout']);
/** cfg: { court, teams: [{ id, lineup: [3 ids], starters: [2 ids] } x2], mode, quarter (s), periods (4; hub 2),
 *  humans: [{ input | src, slot }], difficulty, powerups, twists, cheats, seed, tour, segment } */
function startMatch(cfg) {
  if (S.testQuarter && cfg.mode !== 'camp') cfg = Object.assign({}, cfg, { quarter: S.testQuarter });
  const seed = cfg.seed !== undefined ? cfg.seed : (Date.now() & 0xffff) ^ 0x5bb;
  S.rng = E.rng(seed); S.fxRng = E.rng(seed ^ 0x9e37);
  S.court = cfg.court; S.mode = cfg.mode || 'exhibition'; S.cheats = Object.assign({}, cfg.cheats || {});
  S.events.length = 0; Caption.clear();
  if (cfg.quarter) setTune('quarterLength', cfg.quarter);
  for (const f of HOOP_FX) Object.assign(f, { bend: 0, bv: 0, net: 0, nv: 0, shattered: false });
  S.players = [];
  cfg.teams.forEach((t, team) => {
    const starters = t.starters || get('team', t.id).players.slice(0, 2);
    starters.forEach((id, k) => S.players.push(makePlayer(team * 2 + k, id, team)));
  });
  S.bench = cfg.teams.map((t, team) => (t.lineup || get('team', t.id).players).filter(id => !(t.starters || get('team', t.id).players.slice(0, 2)).includes(id)).map(id => ({ id, juice: 1 })));
  for (const p of S.players) { p.src = CpuSource(); p.brain = newBrain(p, cfg.difficulty); if (setting('bigHeads') || cheat('bigheads')) setBigHeads(p.rig, true); }
  for (const h of cfg.humans || []) { const p = S.players[h.slot]; if (!p) continue; p.src = h.src || LocalSource(h.input); p.human = h.input || null; p.seat = h.seat; p.tag = h.tag || (h.input ? h.input.name : 'P'); p.tagColor = h.color || (h.input ? h.input.color : '#ffffff'); }
  S.ball = newBall();
  const periods = cfg.periods || 4;
  S.match = {
    cfg, phase: 'tipoff', phaseT: 0, quarter: 1, periods, clock: tune('quarterLength'), shotClock: tune('shotClock'), score: [0, 0], time: 0, arrow: 1, ot: 0, sudden: false,
    streak: { slot: -1, n: 0 }, gold: null, shatters: 0, style: [0, 0], inb: null, jumpers: [], powerups: [], puTimer: 8, wind: null, jackpot: null, twist: null, overclock: 0,
    overclockDone: false, breakT: 0, freeze: false, plays: [], over: false, winner: -1, powerOn: cfg.powerups !== false && !cheat('tournament'), twistOn: cfg.twists !== false && !cheat('notwists') && !cheat('tournament'),
    beeps: 0, clutch: false, sponsorT: 0, sponsorLine: '', firstReboot: false, novaCount: 0, lastScoreTeam: -1
  };
  if (cheat('powerups')) S.match.powerOn = true;
  setupTwist();
  tipoffSetup();
  emit('matchStart', { court: cfg.court, mode: S.mode });
  return S.match;
}
const baselineX = h => h.dir > 0 ? X0 - 8 : X1 + 8;
const teamOf = t => get('team', S.match.cfg.teams[t].id);
const teamName = t => teamOf(t).short;

/* ---- the tip-off ---- */
function tipoffSetup() {
  const m = S.match; m.phase = 'tipoff'; m.phaseT = 0;
  const jumpers = [0, 1].map(t => S.players.filter(p => p.team === t).sort((a, c) => rate(c, 'swat') - rate(a, 'swat'))[0]);
  m.jumpers = jumpers; m.tip = { tossed: false, done: false };
  for (const p of S.players) {
    const j = jumpers.includes(p), dir = p.team === 0 ? -1 : 1;
    p.x = XM + dir * (j ? 9 : 70); p.y = YM + (j ? 0 : (p.slot % 2 ? 50 : -50)); p.z = 0; p.vx = p.vy = p.vz = 0; p.state = 'run'; p.facing = p.team === 0 ? 0 : Math.PI; p.jump = null; p.dunk = null;
  }
  const b = S.ball; Object.assign(b, { x: XM, y: YM + 14, z: 36, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, shot: null, pass: null });
  Caption.call('tipoff', {}, { force: true });
}
function tipoffStep(dt) {
  const m = S.match, b = S.ball, tip = m.tip;
  if (!tip.tossed && m.phaseT > .8) { tip.tossed = true; b.state = 'dead'; b.x = XM; b.y = YM; b.vz = Math.sqrt(2 * tune('ballGravity') * 84); sfxAt('whistle', XM); sting('tip'); m.tipT = 0; }
  if (!tip.tossed) { b.z = 36; return; }
  m.tipT += dt;
  // the ball: straight up and down; the jumpers' hands meet it near its top
  const g = tune('ballGravity'); b.vz -= g * dt; b.z += b.vz * dt;
  if (!tip.done && b.vz < 0 && b.z < 104) {
    tip.done = true;
    const sc = m.jumpers.map(p => p.jump ? -Math.abs(handsZ(p) - b.z) + S.rng() * 3 : -999);
    const win = sc[0] === sc[1] ? (S.rng() < .5 ? 0 : 1) : sc[0] > sc[1] ? 0 : 1, wp = m.jumpers[win], to = mate(wp);
    b.state = 'loose'; b.lastTeam = win; m.arrow = 1 - win;
    passTo(wp, to, 'chest', { time: .45, tz: 26, tip: true }); S.ball.x = XM + (win === 0 ? -2 : 2); S.ball.z = Math.max(S.ball.z, 90);
    m.phase = 'live'; m.shotClock = tune('shotClock');
    emit('tipoff', { team: win, slot: wp.slot });
  }
  if (b.z < BALL_R) { b.z = BALL_R; b.vz = 0; }
}

/* ---- inbounds: after a basket under the hoop the scoring team attacked; elsewhere after a violation or a break ---- */
function inboundSetup(team, x, y, o = {}) {
  const m = S.match, b = S.ball;
  m.phase = 'inbound'; m.phaseT = 0;
  const near = S.players.filter(p => p.team === team).sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y));
  const who = near[0], to = near[1], dir = attackHoop(team).dir;
  m.inb = { team, who, to, x, y, t: o.wait !== undefined ? o.wait : .8, rx: clamp(x + dir * 70, X0 + 40, X1 - 40), ry: y < YM - 100 ? y + 70 : y > YM + 100 ? y - 70 : YM + (S.rng() - .5) * 80 };
  who.x = x; who.y = y; who.z = 0; who.vx = who.vy = 0; who.state = 'inbound'; who.jump = null; who.dunk = null; who.facing = Math.atan2(m.inb.ry - y, m.inb.rx - x);
  b.owner = who; b.state = 'held'; b.shot = null; b.pass = null; b.lastTeam = team; b.touched = false;
  m.shotClock = tune('shotClock');
  emit('inbound', { team, slot: who.slot });
}
function inboundStep(dt) {
  const m = S.match, I = m.inb, b = S.ball;
  for (const f of S.players) if (f.team !== I.team) { const d = Math.hypot(f.x - I.x, f.y - I.y); if (d < 24) { const a = Math.atan2(f.y - I.y, f.x - I.x); f.x = I.x + Math.cos(a) * 24; f.y = I.y + Math.sin(a) * 24; } }
  if (m.phaseT > .35) I.t -= dt;
  if (I.t <= 0 && b.owner === I.who) {
    I.who.state = 'run'; m.phase = 'live'; b.state = 'held';
    passTo(I.who, I.to, 'chest');
  }
}

/* ---- a step ---- */
function matchStep(dt) {
  const m = S.match; if (!m) return;
  m.phaseT += dt;
  if (m.phase === 'over') { m.overT = (m.overT || 0) + dt; for (const p of S.players) { p.cmd = emptyCmd(); playerStep(p, dt); } ballStep(dt); return; }
  if (m.phase === 'break' || m.phase === 'sponsor') { if (m.phase === 'sponsor') sponsorStep(dt); else breakStep(dt); return; }
  // commands, then players
  for (const p of S.players) { if (m.phase === 'scored' && !p.human) { p.cmd = emptyCmd(); brainStep(p, true); } else p.src.read(p); }
  for (const p of S.players) playerStep(p, dt);
  separate();
  for (const p of S.players) { if (isAir(p)) blockCheck(p); grabCheck(p); }
  if (m.phase === 'tipoff') tipoffStep(dt); else ballStep(dt);
  if (S.ball.shot) S.ball.shot.t += dt;
  if (m.phase === 'inbound') inboundStep(dt);
  if (m.phase === 'scored' && m.phaseT > .9) afterScore();
  // the clocks run only while the ball is live
  if (m.phase === 'live' && !m.sudden) {
    if (!cheat('freezeClock')) m.clock -= dt;
    if (!cheat('freezeShot') && owner()) m.shotClock -= dt;
    const sc = Math.ceil(m.shotClock); if (m.shotClock < 3.05 && sc !== m.beeps && sc >= 0) { m.beeps = sc; sfxAt('shotclock_beep'); }
    if (m.shotClock <= 0 && owner()) shotClockViolation();
    if (m.clock <= 10 && !m.clutchSaid && m.quarter >= m.periods && Math.abs(m.score[0] - m.score[1]) <= 6) { m.clutchSaid = true; Caption.call('clutch'); }
    if (m.clock <= 30 && m.quarter >= m.periods && Math.abs(m.score[0] - m.score[1]) <= 6 && !m.clutch) { m.clutch = true; layer('clutch', 1); try { A.tempo((A.pos.bpm || 120) + 6); } catch (e) { /* no song */ } }
    if (m.clock <= 0) { m.clock = 0; m.phase = 'clockout'; m.phaseT = 0; sfxAt('buzzer'); sting('buzzer'); }
  }
  if (m.phase === 'clockout') {   // a shot in the air when the buzzer sounds still counts
    const b = S.ball, flying = b.state === 'shot' || (b.state === 'loose' && b.shot && !b.touched && b.z > 20) || S.players.some(p => p.state === 'dunk' || (p.state === 'jumpshot' && hasBall(p)));
    if (!flying && m.phaseT > .3) endPeriod();
  }
  if (m.phase === 'live' || m.phase === 'clockout') { m.time += dt; powerupStep(dt); twistStep(dt); novaStep(dt); }
  for (const p of S.players) if (p.powerup) { p.powerup.t -= dt; if (p.powerup.t <= 0) endPowerup(p); }
}

/* ---- baskets ---- */
function onBasket(team, shooter, ev) {
  const m = S.match;
  if (m.phase === 'live') { m.phase = 'scored'; m.phaseT = 0; }
  m.lastScoreTeam = team;
  // Supernova: a player's streak of team baskets; the other team's basket breaks it
  for (const p of S.players) if (p.team !== team && p.nova) novaOff(p);
  if (shooter) {
    if (m.streak.slot === shooter.slot) m.streak.n++; else m.streak = { slot: shooter.slot, n: 1 };
    if (shooter.nova) { shooter.nova.baskets++; if (shooter.nova.baskets > tune('novaMaxBaskets')) novaOff(shooter); }
    else if (m.streak.n >= tune('novaBaskets')) novaOn(shooter);
  } else m.streak = { slot: -1, n: 0 };
  // style points
  const add = (v, what) => { m.style[team] += v; m.plays.push({ v, what, name: shooter ? shooter.name : '', team }); };
  if (ev.dunk) { const dk = get('dunk', ev.dunkId || '') || null; add(200 + (dk ? dk.bonus : 0), 'dunk'); }
  if (ev.three) add(150, 'three'); if (ev.alleyoop) add(250, 'alley-oop'); if (ev.putback) add(150, 'putback'); if (ev.jackpot) add(250, 'jackpot');
  if (ev.buzzer) Caption.call('buzzer', { name: shooter && shooter.name }, { force: true });
  if (m.sudden) { m.phase = 'scored'; m.phaseT = 0; m.endAfterScore = true; }
  Crowd.hype(ev.dunk ? .35 : .15);
}
function afterScore() {
  const m = S.match;
  if (m.endAfterScore) return endGame();
  if (m.clock <= 0 && !m.sudden) return endPeriod();
  if (m.pendingSponsor) { m.pendingSponsor = false; return sponsorStart(); }
  if (S.mode === 'camp') return lessonStep(true);   // Camp: the drill resets with the ball back where the lesson wants it
  const team = 1 - m.lastScoreTeam, h = defendHoop(team);
  inboundSetup(team, baselineX(h), YM + (S.rng() < .5 ? 26 : -26));
}
function shotClockViolation() {
  const m = S.match, o = owner(), team = o ? 1 - o.team : 1 - (S.ball.lastTeam || 0);
  sfxAt('buzzer'); Caption.call('shotClock'); emit('shotClockViolation', { team: 1 - team });
  if (o && o.state === 'jumpshot') o.state = 'air';
  inboundSetup(team, clamp(S.ball.x, X0 + 30, X1 - 30), S.ball.y < YM ? Y0 - 10 : Y1 + 10);
}

/* ---- Supernova ---- */
function novaOn(p) {
  const m = S.match; p.nova = { baskets: 0, t: 0 }; p.stats.NOVA++; m.novaCount++;
  sfxAt('nova_on', p.x); sting('nova'); layer('nova', 1); P.ring(p.x, p.y, 4, 40, '#c080ff', .6); P.fire(p.x, p.y, 20, 20);
  Caption.call('novaOn', { name: p.name }, { force: true }); emit('supernovaOn', { slot: p.slot, name: p.name });
  m.style[p.team] += 300; m.plays.push({ v: 300, what: 'supernova', name: p.name, team: p.team }); Crowd.hype(.4);
}
function novaOff(p) { if (!p.nova) return; p.nova = null; if (!S.players.some(q => q.nova)) layer('nova', 0); Caption.call('novaOff', { name: p.name }); emit('supernovaOff', { slot: p.slot }); }
function novaStep(dt) {
  const m = S.match;
  for (const p of S.players) if (p.nova) { p.nova.t += dt; if (p.nova.t > tune('novaTime') && !(m.overclock > 0 && p.def.team === 'blambots')) novaOff(p); }
  if (m.overclock > 0) { m.overclock -= dt; if (m.overclock <= 0) { for (const p of S.players) if (p.def.team === 'blambots' && p.nova) novaOff(p); layer('overclock', 0); } }
}

/* ---- shatter and the sponsor break ---- */
function shatterBoard(i, p) {
  const m = S.match, h = HOOPS[i]; m.shatters++; HOOP_FX[i].shattered = true; p.stats.SHT++;
  P.bits(h.board, YM, 86, 60, ['#cfe4ff', '#ffffff', '#8ac8ff']); P.glints(h.board, YM, 86, 30, '#ffffff'); P.ring(h.board, YM, 4, 50, '#cfe4ff', .5);
  sfxAt('shatter', h.x); sting('shatter'); game.freeze(.15); game.flash('#e0f0ff', .12, .8); game.shake(6); rumble(1, .4);
  if (!game.settings.motion) { slowMo(.3, .5); }
  Caption.call('shatter', { name: p.name }, { force: true });
  emit('shatter', { slot: p.slot, hoop: i, name: p.name });
  m.style[p.team] += 1000; m.plays.push({ v: 1000, what: 'shatter', name: p.name, team: p.team });
  m.pendingSponsor = true; Crowd.hype(.6);
}
function sponsorStart() { const m = S.match; m.phase = 'sponsor'; m.sponsorT = 0; m.sponsorLine = SPONSOR_BREAKS[(m.shatters - 1) % SPONSOR_BREAKS.length]; sting('sponsor'); emit('sponsorBreak', {}); }
function sponsorStep(dt) {
  const m = S.match; m.sponsorT += dt;
  if (m.sponsorT > 4) { for (const f of HOOP_FX) f.shattered = false; const team = 1 - m.lastScoreTeam, h = defendHoop(team); inboundSetup(team, baselineX(h), YM + 26); }
}

/* ---- the period's end, breaks, overtime, the final ---- */
function endPeriod() {
  const m = S.match;
  if (m.quarter >= m.periods && m.score[0] !== m.score[1]) return endGame();
  if (m.quarter >= m.periods) {   // tied: overtime, twice, then SUDDEN BLAM (the next basket wins)
    if (m.ot >= 2 || S.mode === 'hub') { m.sudden = true; Caption.call('sudden', {}, { force: true }); emit('overtime', { sudden: true }); sfxAt('horn'); m.quarter++; return inboundSetup(m.arrow, XM, Y1 + 10, { wait: 1.2 }); }
    m.ot++; m.quarter++; m.clock = 60; Caption.call('overtime', {}, { force: true }); emit('overtime', { ot: m.ot }); sfxAt('horn');
    tipoffSetup(); return;
  }
  m.phase = 'break'; m.phaseT = 0; m.breakT = S.mode === 'hub' ? 3 : m.quarter === m.periods / 2 ? 12 : 6; m.breakKind = m.quarter === m.periods / 2 ? 'halftime' : 'quarter';
  if (S.mode === 'attract') m.breakT = 2;
  emit(m.breakKind === 'halftime' ? 'halftime' : 'quarterEnd', { quarter: m.quarter });
  Caption.call(m.breakKind === 'halftime' ? 'halftime' : 'quarterEnd', {}, { force: true });
  m.gag = HALFTIME_GAGS[Math.floor(S.fxRng() * HALFTIME_GAGS.length)];
  if (m.breakKind === 'halftime' && S.mode !== 'hub' && S.mode !== 'attract') music('halftime');
  // juice: rest on the bench, a breather on court; CPU teams bench the most tired
  for (const p of S.players) p.juice = Math.min(1, p.juice + .25);
  for (const t of [0, 1]) for (const bn of S.bench[t]) bn.juice = Math.min(1, bn.juice + .5);
  if (S.mode !== 'hub' && S.mode !== 'attract' && S.mode !== 'camp') for (const t of [0, 1]) { const tired = S.players.filter(p => p.team === t && !p.human).sort((a, c) => a.juice - c.juice)[0]; const bn = S.bench[t].sort((a, c) => c.juice - a.juice)[0]; if (tired && bn && bn.juice > tired.juice + .15) substitute(tired, bn.id); }
}
function substitute(p, id) {
  const t = p.team, bi = S.bench[t].findIndex(b => b.id === id); if (bi < 0) return;
  const bn = S.bench[t][bi], np = makePlayer(p.slot, id, t);
  Object.assign(np, { x: p.x, y: p.y, juice: bn.juice, src: p.src, human: p.human, seat: p.seat, tag: p.tag, tagColor: p.tagColor });
  np.brain = newBrain(np, S.match.cfg.difficulty); if (setting('bigHeads') || cheat('bigheads')) setBigHeads(np.rig, true);
  S.bench[t][bi] = { id: p.id, juice: p.juice }; S.players[p.slot] = np;
  emit('sub', { team: t, out: p.id, in: id });
}
function breakStep(dt) {
  const m = S.match; m.breakT -= dt;
  if (m.breakT <= 0 && !m.holdBreak) {
    m.quarter++; m.clock = tune('quarterLength'); m.clutch = false; m.clutchSaid = false;
    if (m.breakKind === 'halftime' && S.mode !== 'hub' && S.mode !== 'attract') music(get('court', S.court).music);
    setupTwistQuarter();
    if (m.cfg.boss && m.quarter === 4 && !m.overclockDone) overclock();
    const team = m.arrow; m.arrow = 1 - m.arrow;
    for (const p of S.players) { p.x = XM + (p.team === team ? -1 : 1) * attackHoop(team).dir * 50 + (p.slot % 2 ? 0 : 0); p.y = YM + (p.slot % 2 ? 60 : -60); p.vx = p.vy = 0; p.z = 0; p.state = 'run'; p.jump = null; }
    inboundSetup(team, XM, Y1 + 10, { wait: 1 });
  }
}
function endGame() {
  const m = S.match; if (m.over) return;
  m.over = true; m.phase = 'over'; m.overT = 0; m.winner = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1;
  sfxAt('buzzer'); for (const p of S.players) { p.celebrate = p.team === m.winner ? 6 : 0; p.celebKind = p.def.taunt; p.nova = null; }
  if (m.winner >= 0) { m.style[m.winner] += 2000 + 50 * Math.abs(m.score[0] - m.score[1]); Caption.call('final', { team: teamName(m.winner) }, { force: true }); }
  layer('nova', 0); layer('overclock', 0);
  emit('gameEnd', { score: m.score.slice(), winner: m.winner });
}

/* ---- power-ups on the floor ---- */
function powerupStep(dt) {
  const m = S.match; if (!m.powerOn) return;
  m.puTimer -= dt;
  const max = S.mode === 'attract' ? 2 : 1;
  if (m.puTimer <= 0 && m.powerups.length < max) {
    m.puTimer = tune('powerupInterval') + (S.rng() - .5) * 12 * (S.mode === 'attract' ? .2 : 1) * (S.mode === 'attract' ? 0 : 1);
    if (S.mode === 'attract' || cheat('puFast')) m.puTimer = 5;
    spawnPowerup(POWERUPS[Math.floor(S.rng() * POWERUPS.length)]);
  }
  for (const pu of m.powerups) pu.t -= dt;
  m.powerups = m.powerups.filter(pu => {
    if (pu.t <= 0) return false;
    for (const p of S.players) if (!isAir(p) && p.state !== 'knocked' && Math.hypot(p.x - pu.x, p.y - pu.y) < 12) { givePowerup(p, pu.id); Caption.call(pu.id, { name: p.name }); return false; }
    return true;
  });
}
function spawnPowerup(id, x, y) {
  const m = S.match;
  if (x === undefined) { for (let k = 0; k < 10; k++) { x = X0 + 100 + S.rng() * (CW - 200); y = Y0 + 40 + S.rng() * (CH - 80); if (!(m.twist && m.twist.slicks && m.twist.slicks.some(s => Math.hypot(x - s.x, y - s.y) < 40))) break; } }
  m.powerups.push({ id, x, y, t: 10 }); P.ring(x, y, 2, 20, get('powerup', id).color, .5); P.glints(x, y, 6, 8, '#ffffff'); sfxAt('pu_spawn', x);
  emit('powerupSpawn', { id, x: Math.round(x), y: Math.round(y) });
}

/* ---- the court twists ---- */
function setupTwist() {
  const m = S.match, court = get('court', S.court), kind = court.twist;
  m.twist = null; m.jackpot = null; m.wind = null;
  if (m.twistOn && kind !== 'boss') m.twist = { kind, next: 8 * tune('hazardInterval'), bombs: [], slicks: null, gustT: 0, ventT: 0, ventOn: false, w: 0 };
  if (m.cfg.boss) m.twist = { kind: 'boss', bombs: [] };
  if ((kind === 'jackpot' && m.twistOn) || (setting('jackpotAll') && m.twistOn && S.mode === 'exhibition')) moveJackpot();
  setupTwistQuarter();
}
function setupTwistQuarter() {
  const m = S.match, t = m.twist; if (!t || t.kind !== 'oil') return;
  t.slicks = [];
  for (let k = 0; k < 3; k++) {
    let x, y; for (let n = 0; n < 20; n++) { x = X0 + 60 + S.rng() * (CW - 120); y = Y0 + 30 + S.rng() * (CH - 60); if (Math.hypot(x - XM, y - YM) > 70 && !inKey(x, y)) break; }
    t.slicks.push({ x, y, rx: 20 + S.rng() * 16, ry: 12 + S.rng() * 8 });
  }
}
function moveJackpot() {
  const m = S.match, team = S.rng() < .5 ? 0 : 1, h = attackHoop(team), a = (S.rng() - .5) * 2.2 + (h.dir > 0 ? 0 : Math.PI), d = 50 + S.rng() * 70;
  m.jackpot = { x: clamp(h.x + Math.cos(a) * d, X0 + 20, X1 - 20), y: clamp(h.y + Math.sin(a) * d, Y0 + 20, Y1 - 20), t: 20 };
  emit('jackpotMove', {});
}
function twistStep(dt) {
  const m = S.match, t = m.twist;
  if (m.jackpot) { m.jackpot.t -= dt; if (m.jackpot.t <= 0) moveJackpot(); }
  if (!t) return;
  if (t.kind === 'wind') {
    t.next -= dt;
    if (t.next <= 0 && t.gustT <= 0) { t.gustT = 4; t.next = (15 + S.rng() * 10) * tune('hazardInterval'); const a = (S.rng() < .5 ? 0 : Math.PI) + (S.rng() - .5) * .87; t.wa = a; t.wp = .5 + S.rng() * .5; sfxAt('wind_gust'); Caption.call('wind'); emit('twist', { kind: 'gust' }); }
    if (t.gustT > 0) { t.gustT -= dt; const env = Math.sin(clamp(1 - t.gustT / 4, 0, 1) * Math.PI); t.w = env * t.wp; m.wind = { x: Math.cos(t.wa) * t.w * tune('windStrength'), y: Math.sin(t.wa) * t.w * tune('windStrength') }; }
    else { t.w = 0; m.wind = null; }
  }
  if (t.kind === 'eruption') {
    t.next -= dt; t.ventT += dt;
    t.ventOn = (t.ventT % 5) > 3;
    if (t.ventOn && !t.puffed) { t.puffed = true; for (const v of VENTS) P.smoke(v.x, v.y, 0, 6, { size: 1.4, color: '#f0f0f0' }); sfxAt('vent_puff', VENTS[0].x, { vol: .5 }); }
    if (!t.ventOn) t.puffed = false;
    if (t.next <= 0) {
      t.next = (25 + S.rng() * 10) * tune('hazardInterval'); game.shake(1.5); sfxAt('rumble'); Caption.call('eruption'); emit('twist', { kind: 'eruption' });
      const b = S.ball; for (let k = 0; k < 3; k++) { const near = k === 0; t.bombs.push({ x: near ? clamp(b.x + (S.rng() - .5) * 30, X0 + 20, X1 - 20) : X0 + 40 + S.rng() * (CW - 80), y: near ? clamp(b.y + (S.rng() - .5) * 30, Y0 + 20, Y1 - 20) : Y0 + 30 + S.rng() * (CH - 60), t: 1.2 + k, max: 1.2 + k }); }
      sfxAt('bomb_whistle');
    }
    for (const bm of t.bombs) {
      bm.t -= dt;
      if (bm.t <= 0 && !bm.hit) {
        bm.hit = true; P.explosion(bm.x, bm.y, 0, 1.4, { freeze: false, shake: 2 }); P.fire(bm.x, bm.y, 4, 12);
        for (const p of S.players) if (Math.hypot(p.x - bm.x, p.y - bm.y) < 22 && p.z < 20) { const had = hasBall(p); knockDown(p, .8, null); if (had) fumble(p, null); }
      }
    }
    t.bombs = t.bombs.filter(bm => bm.t > -.5);
  }
  if (t.kind === 'boss' && m.cfg.boss && !m.overclockDone && m.quarter === 3) {
    const bots = m.cfg.teams.findIndex(x => x.id === 'blambots');
    if (bots >= 0 && m.score[1 - bots] - m.score[bots] >= 8) overclock();
  }
}
function overclock() {
  const m = S.match; m.overclockDone = true; m.overclock = 30;
  for (const p of S.players) if (p.def.team === 'blambots') { p.nova = { baskets: -99, t: 0 }; P.sparks(p.x, p.y, 30, 12, null, { color: '#ff3a2a' }); }
  layer('overclock', 1); sfxAt('servo'); Caption.call('overclock', {}, { force: true });
  storyCaptions('overclock');
  emit('twist', { kind: 'overclock' });
}
function storyCaptions(key) {
  const lines = IN_PLAY_STORY[key]; if (!lines) return;
  const team = S.mode === 'tour' && S.progress ? get('team', S.progress.tour.team).short : 'HUMANS';
  lines.forEach(([who, text], i) => game.after(i * 3.2, () => Caption.show(who, fill(text, { team }), { big: true })));
}
on('reboot', () => { const m = S.match; Caption.call('reboot', { name: '' }); if (m && !m.firstReboot) { m.firstReboot = true; storyCaptions('reboot'); } });

/* ---- stats and style points from events ---- */
const STYLE = { block: 100, steal: 80, posterized: 200, ankles: 100 };
on('*', ev => {
  const m = S.match; if (!m) return;
  const p = ev.slot !== undefined && ev.slot >= 0 ? S.players[ev.slot] : null;
  if (STYLE[ev.type] && p) { m.style[p.team] += STYLE[ev.type]; m.plays.push({ v: STYLE[ev.type], what: ev.type, name: p.name, team: p.team }); }
});

/* ---- 36-fx.js ---- */
/* FX: the camera director (follows the ball with a lead, the dunk cam, slow motion), comic banners by priority, the
 * effect recipes for every impact, the crowd's reactions and the announcers' calls, all driven by match events. */
const FX = { banner: null, slow: 0, slowScale: 1, zoom: 1, zoomTarget: 1, focusX: XM, react: { jump: 0, slump: 0, flash: 0, beat: 0 }, dunkCam: null };
const BANNER_PRI = { shatter: 10, supernova: 9, posterized: 8, dunk: 7, alleyoop: 6, block: 5, jackpot: 4, three: 3, steal: 2, ankles: 1, goaltend: 4, sudden: 9, overtime: 9, reboot: 6, overclock: 9, buzzer: 8, eruption: 5 };
const BANNER_COL = { shatter: ['#ffffff', '#cfe4ff', '#6ab0ff'], supernova: ['#ffffff', '#d8a0ff', '#ffd23a'], posterized: ['#ffe0ff', '#ff5ad8', '#a0208a'], dunk: ['#fffbe8', '#ffd23a', '#ff7a1a'], alleyoop: ['#fffbe8', '#ffe08a', '#ff9a3a'],
  block: ['#ffe8e0', '#ff5a3a', '#a01a10'], jackpot: ['#fffbe8', '#ffd23a', '#c88a10'], three: ['#e8ffff', '#5ae8ff', '#1a8ab0'], steal: ['#e8ffe8', '#5aff8a', '#1a8a3a'], ankles: ['#ffffe8', '#ffe05a', '#c8a010'], goaltend: ['#ffffff', '#ffb0b0', '#c84040'],
  sudden: ['#ffffff', '#ffd23a', '#ff3a3a'], overtime: ['#ffffff', '#ffd23a', '#ff7a1a'], reboot: ['#e8f8ff', '#5ac8ff', '#2a6ab0'], overclock: ['#ffe0e0', '#ff3a2a', '#8a0a0a'], buzzer: ['#ffffff', '#ffd23a', '#ff7a1a'], eruption: ['#ffe0c0', '#ff7a2a', '#a02a0a'] };
function banner(kind, text, o = {}) {
  const cur = FX.banner; if (cur && cur.t < 1 && (BANNER_PRI[cur.kind] || 0) > (BANNER_PRI[kind] || 0)) return;
  FX.banner = { kind, text, t: 0, sub: o.sub || '' };
}
function slowMo(scale, seconds) { if (game.settings.motion) return; FX.slow = seconds; FX.slowScale = scale; }
function dunkFx(p, h, shatter) {
  game.freeze(shatter ? .15 : .08); game.shake(4); game.flash('#ffffff', .06, .6);
  P.ring(h.x, h.y, 4, 26, '#fff6c0', .4); P.sparks(h.x, h.y, RIM_Z, 16); P.glints(h.x, h.y, RIM_Z, 10, '#ffe08a');
  sfxAt('slam', h.x); sfxAt('crowd_roar', h.x); rumble(.6, .2); FX.react.jump = 1.4; FX.react.flash = 1;
}
/** the camera: x follows the ball (or its holder) with a lead toward where play goes; the dunk cam zooms in */
function cameraStep(dt) {
  const m = S.match, b = S.ball; if (!m || !b) return;
  const o = b.owner, tx0 = o ? o.x + attackHoop(o.team).dir * 48 : b.x;
  let tx = tx0, zoom = 1;
  const dunker = S.players.find(p => p.state === 'dunk');
  if (dunker && !game.settings.motion && S.mode !== 'hub') { const h = attackHoop(dunker.team); tx = (dunker.x + h.x) / 2; zoom = 1.22; }
  if (m.phase === 'tipoff') { tx = XM; zoom = 1.12; }
  FX.focusX = approach(FX.focusX, clamp(tx, X0 + 60, X1 - 60), Math.max(60, Math.abs(tx - FX.focusX) * 4) * dt);
  FX.zoom = approach(FX.zoom, zoom, dt * (zoom > FX.zoom ? 1.6 : 1));
  const camY = game.view.id === HIGH ? YM + 10 : YM - 30;
  game.focus(FX.focusX, camY, dunker ? 30 : 0);
  if (Math.abs((FX.applied || 1) - FX.zoom) > .005) { game.setZoom(FX.zoom); FX.applied = FX.zoom; }
  // slow motion around a dunk's apex, and after shatters
  let ts = tune('gameSpeed');
  if (FX.slow > 0) { FX.slow -= dt / Math.max(.1, FX.slowScale); ts *= FX.slowScale; }
  else if (dunker && dunker.dunk && !game.settings.motion && S.mode !== 'hub') { const u = dunker.dunk.t / dunker.dunk.T; if (u > .45 && u < .85) ts *= tune('dunkSlowMo'); }
  game.timeScale = ts;
  for (const k of ['jump', 'slump', 'flash']) FX.react[k] = Math.max(0, FX.react[k] - dt);
  if (FX.banner) { FX.banner.t += dt; if (FX.banner.t > 1.3) FX.banner = null; }
}

/* ---- events → banners, captions, crowd, sounds ---- */
const nameOf = slot => (S.players[slot] || {}).name;
const DUNK_BANK = { power: 'dunkPower', spin: 'dunkSpin', flip: 'dunkFlip', hang: 'dunkHang', long: 'dunkLong', nova: 'dunkNova', volcano: 'dunkVolcano', quake: 'dunkQuake' };
on('basket', ev => {
  const p = S.players[ev.slot], ctx = { name: p && p.name, team: teamName(ev.team) };
  if (ev.goaltend) { banner('goaltend', 'GOALTEND!'); Caption.call('goaltend', ctx); }
  else if (ev.dunk) { const dk = get('dunk', ev.dunkId); banner(ev.alleyoop ? 'alleyoop' : 'dunk', ev.alleyoop ? 'ALLEY-OOP!' : (dk ? dk.banner : 'SLAM!'), { sub: ev.alleyoop && dk ? dk.banner : '' }); Caption.call(ev.alleyoop ? 'alleyoop' : DUNK_BANK[dk ? dk.family : 'power'], ctx); }
  else if (ev.three) { banner('three', ev.dist > 220 ? 'FROM DOWNTOWN!' : 'THREE!'); Caption.call(ev.dist > 220 ? 'deepThree' : 'three', ctx); }
  else if (ev.layup) Caption.call('layup', ctx);
  else Caption.call('jumper', ctx);
  if (ev.jackpot) { banner('jackpot', 'JACKPOT!'); Caption.call('jackpot', ctx); sfxAt('jackpot'); }
  if (ev.gold) P.text(XM, YM, 60, 'GOLD BALL x2', '#ffd23a', { scale: 2 });
  if (ev.buzzer) banner('buzzer', 'AT THE BUZZER!');
  FX.react.jump = Math.max(FX.react.jump, ev.dunk ? 1.4 : .8);
  const m = S.match, diff = m.score[ev.team] - m.score[1 - ev.team];
  if (diff >= 15 && S.fxRng() < .3) Caption.call('blowout', { team: teamName(ev.team) });
  else if (diff >= -3 && diff <= 0 && m.quarter >= 3 && S.fxRng() < .25) Caption.call('comeback', { team: teamName(ev.team) });
});
on('release', ev => { const m = S.match; if (ev.rel === 'perfect') { const p = S.players[ev.slot]; if (p) P.text(p.x, p.y, p.z + 60, 'PERFECT', '#5ae8ff', { scale: 1, bounce: false }); } });
on('rim', () => { const b = S.ball; if (b.shot && b.shot.airball === false && S.fxRng() < .2) sfxAt('crowd_ooh', b.x, { vol: .5 }); });
on('block', ev => { banner('block', 'REJECTED!'); Caption.call('block', { name: ev.name, victim: ev.victimName }); FX.react.jump = .8; sfxAt('crowd_ooh'); });
on('steal', ev => { banner('steal', 'PICKPOCKET!'); Caption.call('steal', { name: ev.name, victim: ev.victimName }); const p = S.players[ev.slot]; if (p && S.fxRng() < .4) bark(p); });
on('shove', ev => { Caption.call('shove', { name: ev.name, victim: ev.victimName }); FX.react.jump = Math.max(FX.react.jump, .3); });
on('ankles', ev => { banner('ankles', 'ANKLES BROKEN!'); Caption.call('ankles', { name: ev.name, victim: ev.victimName }); });
on('posterized', ev => { banner('posterized', 'POSTERIZED!'); Caption.call('posterized', { name: ev.name, victim: ev.victimName }, { force: true }); bark(S.players[ev.slot]); });
on('supernovaOn', ev => banner('supernova', 'SUPERNOVA!', { sub: ev.name }));
on('shatter', () => banner('shatter', 'SHATTERED!'));
on('reboot', ev => banner('reboot', 'SYSTEM REBOOT!', { sub: ev.name }));
on('twist', ev => { if (ev.kind === 'overclock') banner('overclock', 'OVERCLOCK!'); if (ev.kind === 'eruption') banner('eruption', 'ERUPTION!'); });
on('overtime', ev => banner(ev.sudden ? 'sudden' : 'overtime', ev.sudden ? 'SUDDEN BLAM!' : 'OVERTIME!'));
on('release', ev => { const b = S.ball; if (b.shot && b.shot.airball) game.after(.8, () => { if (S.ball && !S.ball.touched) { Caption.call('airball', { name: nameOf(ev.slot) }); FX.react.slump = 1; } }); });
on('taunt', ev => { const p = S.players[ev.slot]; if (p) bark(p); });
on('dunkStart', ev => { const p = S.players[ev.slot]; if (p && p.nova) P.fire(p.x, p.y, p.z + 20, 6); });
function bark(p) { if (!p || !p.def.barks) return; const line = pick(p.def.barks); Voice.say(line, p.def.voice, { vol: .7 }); P.text(p.x, p.y, p.z + 64, line.toUpperCase(), '#ffffff', { scale: 1, bounce: false }); }

/* ---- 40-ui.js ---- */
/* UI KIT: 10-foot widgets drawn on the canvas. Glyphs follow each player's last device: PlayStation symbols by default
 * (Settings: Xbox), keycaps on the keyboard, a mouse with the bound button lit after mouse use. Prompt lines swap
 * {action} tokens for icons. FocusList: a list of big buttons that the stick, d-pad, arrows/WASD, Enter/Esc, the mouse
 * (hover moves the focus, click picks, right click backs out) and the wheel all drive. */
const UI = { ink: '#fff7ec', dim: '#b8acd8', accent: '#ff3ca6', accent2: '#2de2ff', gold: '#ffd23a', panel: '#140c24', line: '#3a2a5a', bad: '#ff5a3a', good: '#5aff8a' };
const T1 = { outline: '#0a0612' };
function txt(g, s, x, y, col = UI.ink, scale = 1, align = 'left', o = {}) { E.font.text(g, String(s), Math.round(x), Math.round(y), col, Object.assign({ scale, align, outline: '#0a0612' }, o)); }
const tw = (s, scale = 1) => E.font.width(String(s), { scale });
const lh = (scale = 1) => E.font.lineHeight({ scale });
/** the code an action is bound to on a device */
function codeFor(input, action, device) {
  const m = input && input.map && input.map[action]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis')), pads = real.filter(c => c.startsWith('Pad')), keys = real.filter(c => !c.startsWith('Pad'));
  if (device === 'gamepad') return pads[0] || keys[0];
  if (device === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys.find(c => !c.startsWith('Mouse')) || pads[0];
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0];
}
const deviceOf = input => { const d = input ? input.lastDevice : 'keyboard'; return d === 'touch' ? 'keyboard' : d; };
const padStyleOf = () => setting('symbols') === 'xbox' ? 'xbox' : 'playstation';
const PS = { Pad0: ['cross', '#5a8aff'], Pad1: ['circle', '#ff5a5a'], Pad2: ['square', '#ff7ad8'], Pad3: ['triangle', '#4ae0a0'] };
const XB = { Pad0: ['A', '#4ad860'], Pad1: ['B', '#ff4a4a'], Pad2: ['X', '#4a8aff'], Pad3: ['Y', '#ffd040'] };
const SHOULDER = { Pad4: ['L1', 'LB'], Pad5: ['R1', 'RB'], Pad6: ['L2', 'LT'], Pad7: ['R2', 'RT'], Pad8: ['CREATE', 'VIEW'], Pad9: ['OPTIONS', 'MENU'], Pad10: ['L3', 'LS'], Pad11: ['R3', 'RS'], Pad12: ['↑', '↑'], Pad13: ['↓', '↓'], Pad14: ['←', '←'], Pad15: ['→', '→'] };
/** draw one glyph for a code; returns its width. s: 1 (prompt lines) or 2 (How to Play) */
function glyph(g, code, x, y, s = 1, style = padStyleOf()) {
  x = Math.round(x); y = Math.round(y);
  const R = 5 * s;
  if (!code) return 0;
  if (code.startsWith('Pad') && PS[code]) {
    if (style === 'xbox') { const [l, c] = XB[code]; px.disc(g, x + R, y + R, R, '#1a1a22'); px.disc(g, x + R, y + R, R - 1, E.shade(c, -.3)); txt(g, l, x + R + 1, y + R - 3 * s, '#ffffff', s, 'center', { outline: false }); return R * 2 + 2; }
    const [k, c] = PS[code]; px.disc(g, x + R, y + R, R, '#14141c'); px.disc(g, x + R, y + R, R - 1, '#2a2a36');
    const cx = x + R, cy = y + R, q = Math.round(2.5 * s);
    if (k === 'cross') { px.line(g, cx - q, cy - q, cx + q, cy + q, c, s); px.line(g, cx - q, cy + q, cx + q, cy - q, c, s); }
    if (k === 'circle') { px.disc(g, cx, cy, q + .5, c); px.disc(g, cx, cy, Math.max(.5, q - s + .5), '#2a2a36'); }
    if (k === 'square') { px.rect(g, cx - q, cy - q, q * 2 + 1, s, c); px.rect(g, cx - q, cy + q - s + 1, q * 2 + 1, s, c); px.rect(g, cx - q, cy - q, s, q * 2 + 1, c); px.rect(g, cx + q - s + 1, cy - q, s, q * 2 + 1, c); }
    if (k === 'triangle') { px.line(g, cx, cy - q, cx - q, cy + q - 1, c, s); px.line(g, cx, cy - q, cx + q, cy + q - 1, c, s); px.line(g, cx - q, cy + q - 1, cx + q, cy + q - 1, c, s); }
    return R * 2 + 2;
  }
  if (code.startsWith('Pad') && SHOULDER[code]) {
    const l = SHOULDER[code][style === 'xbox' ? 1 : 0], w = tw(l, s) + 6 * s;
    E.ui.box(g, x, y, w, R * 2, { bg: '#2a2a36', border: '#8a8aa0', gradient: false }); txt(g, l, x + w / 2, y + R - 3 * s, '#ffffff', s, 'center', { outline: false }); return w + 2;
  }
  if (code.startsWith('Mouse')) {   // a mouse with the button lit
    const w = 8 * s, h = R * 2, lit = code === 'Mouse0' ? 0 : code === 'Mouse2' ? 1 : 2;
    px.rect(g, x, y, w, h, '#d8d8e0'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#8a8a98');
    px.rect(g, x + (lit === 1 ? w / 2 : 1), y + 1, w / 2 - 1, h / 2 - 1, lit === 2 ? '#8a8a98' : '#ffd23a'); px.rect(g, x + w / 2, y + 1, 1, h / 2, '#3a3a44');
    return w + 2;
  }
  // a keycap with the key's name
  const name = keyName(code), w = Math.max(R * 2, tw(name, s) + 6 * s);
  E.ui.box(g, x, y, w, R * 2, { bg: ['#f4f0ea', '#c8c0d0'], border: '#3a3448' }); txt(g, name, x + w / 2, y + R - 3 * s, '#1a1420', s, 'center', { outline: false });
  return w + 2;
}
function keyName(code) {
  const map = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB', F2: 'F2' };
  if (map[code]) return map[code]; if (code.startsWith('Key')) return code.slice(3); if (code.startsWith('Digit')) return code.slice(5); if (code.startsWith('Numpad')) return 'NUM' + code.slice(6);
  return code.toUpperCase().slice(0, 5);
}
/** the glyph(s) for an action on this player's device; 'move' shows the stick or WASD; 'confirm' / 'cancel' the menu buttons */
function actionGlyph(g, action, x, y, input, s = 1) {
  const dev = deviceOf(input);
  if (action === 'move') {
    if (dev === 'gamepad') { const R = 5 * s; px.disc(g, x + R, y + R, R, '#14141c'); px.disc(g, x + R, y + R, R - 2, '#4a4a58'); px.disc(g, x + R, y + R - 1, R - 3, '#6a6a78'); return R * 2 + 2; }
    const keys = input && input.map && input.map.up && input.map.up.includes('KeyW') ? 'WASD' : '↑↓←→'; const w = tw(keys, s) + 6 * s;
    E.ui.box(g, x, y, w, 10 * s, { bg: ['#f4f0ea', '#c8c0d0'], border: '#3a3448' }); txt(g, keys, x + w / 2, y + 5 * s - 3 * s, '#1a1420', s, 'center', { outline: false }); return w + 2;
  }
  if (action === 'confirm' && dev === 'gamepad') return glyph(g, 'Pad0', x, y, s);
  if (action === 'cancel' && dev === 'gamepad') return glyph(g, 'Pad1', x, y, s);
  if (action === 'confirm' && dev === 'mouse') return glyph(g, 'Mouse0', x, y, s);
  if (action === 'cancel' && dev === 'mouse') return glyph(g, 'Mouse2', x, y, s);
  if (action === 'confirm') return glyph(g, 'Enter', x, y, s);
  if (action === 'cancel') return glyph(g, 'Escape', x, y, s);
  if (action === 'pause') return glyph(g, dev === 'gamepad' ? 'Pad9' : 'Escape', x, y, s);
  if (action === 'tabs') { if (dev === 'gamepad') { const a = glyph(g, 'Pad4', x, y, s); return a + glyph(g, 'Pad5', x + a, y, s); } const a = glyph(g, 'KeyQ', x, y, s); return a + glyph(g, 'KeyE', x + a, y, s); }
  return glyph(g, codeFor(input, action, dev), x, y, s);
}
/** a prompt line: 'Hold {turbo} + {shoot} to DUNK' with icons; returns its width (draw: false measures) */
function promptLine(g, text, x, y, input, o = {}) {
  const s = o.scale || 1, parts = String(text).split(/(\{[a-zA-Z]+\})/), col = o.color || UI.ink;
  let w = 0; const measure = !g;
  const items = parts.filter(Boolean).map(pt => { const m = pt.match(/^\{([a-zA-Z]+)\}$/); return m ? { a: m[1] } : { t: pt }; });
  // widths first (alignment)
  const wid = it => it.a ? measureGlyph(it.a, input, s) : tw(it.t, s);
  const total = items.reduce((a, it) => a + wid(it), 0);
  if (measure) return total;
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  for (const it of items) { if (it.a) { actionGlyph(g, it.a, cx, y - 2 * s, input, s); cx += wid(it); } else { txt(g, it.t, cx, y, col, s); cx += tw(it.t, s); } }
  return total;
}
function measureGlyph(a, input, s) {
  const dev = deviceOf(input);
  if (a === 'move') return dev === 'gamepad' ? 12 * s : tw(input && input.map && input.map.up && input.map.up.includes('KeyW') ? 'WASD' : '↑↓←→', s) + 8 * s;
  if (a === 'tabs') return dev === 'gamepad' ? 2 * (tw('L1', s) + 8 * s) : 2 * 12 * s;
  let code = a === 'confirm' ? (dev === 'gamepad' ? 'Pad0' : dev === 'mouse' ? 'Mouse0' : 'Enter') : a === 'cancel' ? (dev === 'gamepad' ? 'Pad1' : dev === 'mouse' ? 'Mouse2' : 'Escape') : a === 'pause' ? (dev === 'gamepad' ? 'Pad9' : 'Escape') : codeFor(input, a, dev);
  if (!code) return 0;
  if (code.startsWith('Pad') && PS[code]) return 12 * s;
  if (code.startsWith('Pad') && SHOULDER[code]) return tw(SHOULDER[code][padStyleOf() === 'xbox' ? 1 : 0], s) + 8 * s;
  if (code.startsWith('Mouse')) return 10 * s;
  return Math.max(10 * s, tw(keyName(code), s) + 6 * s) + 2;
}
/** the bottom bar of a menu screen */
function promptBar(g, r, text, input = game.input) {
  const y = r.H - 18; px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 6, r.W, 24, '#0a0612'));
  promptLine(g, text, r.W / 2, y, input, { align: 'center' });
}

/* ---- FocusList: big buttons; one obvious focus (an outline, a ▸, a pulse, a brighter fill) ---- */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.boxes = []; this.t = 0; this.horizontal = !!o.horizontal; }
  get cur() { return this.items[this.i]; }
  /** returns true when it handled a pick or back this step */
  update(dt, inputs = game.players) {
    this.t += dt; const n = this.items.length; if (!n) return false;
    const fw = this.horizontal ? ['left', 'right'] : ['up', 'down'];
    for (const I of inputs) {
      if (I.repeat(fw[0], .35, .12)) { this.move(-1); }
      if (I.repeat(fw[1], .35, .12)) { this.move(1); }
      if (this.o.side && (I.repeat(this.horizontal ? 'up' : 'left', .35, .12) || I.repeat(this.horizontal ? 'down' : 'right', .35, .12))) { const it = this.cur; if (it && it.side) { it.side(I.down(this.horizontal ? 'up' : 'left') ? -1 : 1); A.sfx('select'); } }
    }
    // the mouse: hover moves the focus, a click picks, the wheel turns a slider under the pointer
    const I0 = game.input, ptr = I0.pointer && I0.pointer();
    if (ptr && (ptr[0] !== this._px || ptr[1] !== this._py)) { this._px = ptr[0]; this._py = ptr[1]; const k = this.hit(ptr); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; A.sfx('select'); if (this.o.onMove) this.o.onMove(this.i); } }
    const cl = I0.clicked && I0.clicked();
    if (cl) { const k = this.hit(cl); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(I0); } }
    for (const I of inputs) {
      if (I.pressed('confirm') || (this.o.startPicks !== false && I.pressed('start'))) { if (this.cur && !this.cur.disabled) return this.pick(I); }
      if (I.pressed('cancel') && this.o.onBack) { I.consumeAll(); A.sfx('cancel'); this.o.onBack(I); return true; }
    }
    return false;
  }
  move(d) { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; A.sfx('select'); if (this.o.onMove) this.o.onMove(this.i); } }
  pick(I) { const it = this.cur; for (const P0 of game.players) P0.consumeAll(); A.sfx('confirm'); if (it.onPick) it.onPick(I); else if (this.o.onPick) this.o.onPick(this.i, it, I); return true; }
  hit(p) { for (let k = 0; k < this.boxes.length; k++) { const b = this.boxes[k]; if (b && p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3]) return k; } return -1; }
  /** draw at (x, y): vertical rows of w x h, or a horizontal strip */
  draw(g, x, y, w, h, o = {}) {
    const gap = o.gap === undefined ? 4 : o.gap, s = o.scale || 2;
    this.boxes = [];
    this.items.forEach((it, k) => {
      const bx = this.horizontal ? x + k * (w + gap) : x, by = this.horizontal ? y : y + k * (h + gap), sel = k === this.i, pulse = sel ? Math.sin(this.t * 6) * .5 + .5 : 0;
      this.boxes.push([bx, by, w, h]);
      const bg = it.disabled ? ['#1a1426', '#120c1c'] : sel ? [E.mix(o.hi || UI.accent, '#ffffff', .1 + pulse * .1), E.shade(o.hi || UI.accent, -.35)] : ['#2a1e44', '#1a1230'];
      E.ui.box(g, bx, by, w, h, { bg, border: sel ? '#ffffff' : UI.line });
      if (sel) { px.rect(g, bx - 2, by - 2, w + 4, 1, '#ffffff'); px.rect(g, bx - 2, by + h + 1, w + 4, 1, '#ffffff'); }
      const label = (sel ? '▸ ' : '') + (typeof it.label === 'function' ? it.label() : it.label);
      const ty = by + Math.round(h / 2 - lh(s) / 2) + 1;
      if (o.center) txt(g, label, bx + w / 2, ty, it.disabled ? '#5a4e70' : UI.ink, s, 'center'); else txt(g, label, bx + 8, ty, it.disabled ? '#5a4e70' : UI.ink, s);
      if (it.value) { const v = typeof it.value === 'function' ? it.value() : it.value; txt(g, v, bx + w - 8, ty, sel ? '#ffffff' : UI.gold, s, 'right'); }
    });
  }
}
/** a big panel with a title */
function panel(g, x, y, w, h, title, o = {}) {
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1e1436', '#0e0a1c'], border: o.border || UI.line, alpha: o.alpha || .94 });
  if (title) txt(g, title, x + w / 2, y + 6, o.titleColor || UI.gold, o.titleScale || 2, 'center');
}
/** a rating as ten pips with its name (never a raw number on the 10-foot screens) */
function pips(g, x, y, label, v, col = UI.accent2) {
  txt(g, label, x, y, UI.dim, 1);
  for (let k = 0; k < 10; k++) px.rect(g, x + 42 + k * 6, y + 1, 5, 5, k < v ? col : '#2a2440');
}
/** a title-safe frame: 5% of every side */
const safe = r => ({ x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) });
/** the logo */
function logo(g, x, y, scale = 4, t = 0) {
  const sc = scale + Math.sin(t * 2) * .0;
  // the comic star behind BLAM
  const W = tw('BASKETBLAM', scale), cx = x + W / 2 - tw('BLAM', scale) / 2, cy = y + 4 * scale, R = 9 * scale;
  const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * TAU + t * .3, rr = k % 2 ? R * .62 : R; pts.push([cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr]); }
  px.poly(g, pts, '#ff3ca6'); const p2 = pts.map(([px0, py0]) => [cx + (px0 - cx) * .86, cy + (py0 - cy) * .86]); px.poly(g, p2, '#ffd23a');
  E.font.title(g, 'BASKETBLAM', x, y, { scale: sc, colors: ['#ffffff', '#ffe08a', '#ff9a3a', '#e04a1a'], depth: Math.round(scale * .8), depthColor: '#3a0a2a', align: 'center' });
}

/* ---- 41-draw.js ---- */
/* DRAW: the match in the world (court scene, twists, power-ups, hoops, players, the ball and its shadow and trail, the
 * referee at the tip) and the broadcast HUD (score bug with player plates, the clocks, the release meter, the
 * announcers' lower third, banners, break cards, the sponsor break, the final). */
const NPC_RIGS = {};
const npcRig = id => NPC_RIGS[id] || (NPC_RIGS[id] = (() => { const n = get('npc', id), p = get('player', id); return n ? dressRig(n, null) : p ? dressRig(p, p.team) : dressRig(get('npc', 'vinnie'), null); })());
const BALL_ART = (() => { const frames = []; for (let f = 0; f < 4; f++) frames.push(f); return frames; })();
function drawBallAt(g, x, y, rot, glow) {
  const X = Math.round(x), Y = Math.round(y);
  px.disc(g, X, Y, 5, '#3a1606'); px.disc(g, X, Y, 4, glow ? '#ffb040' : '#e8641a'); px.disc(g, X - 1, Y - 1, 2, glow ? '#fff0a0' : '#ff9a4a');
  const a = rot % Math.PI, c = Math.cos(a) * 3.5, s = Math.sin(a) * 3.5;
  px.line(g, X - c, Y - s, X + c, Y + s, '#3a1606', 1); px.line(g, X - s * .6, Y + c * .6, X + s * .6, Y - c * .6, '#3a1606', 1);
  px.dot(g, X - 2, Y - 2, '#ffd0a0');
}
function puIcon(g, id, x, y, s = 1) {
  const c = get('powerup', id).color, X = Math.round(x), Y = Math.round(y);
  px.disc(g, X, Y, 6 * s, '#0a0612'); px.disc(g, X, Y, 5 * s, E.shade(c, -.2));
  const k = s;
  switch (id) {
    case 'rocket': px.rect(g, X - 3 * k, Y, 6 * k, 2 * k, '#ffffff'); px.rect(g, X + k, Y - 2 * k, 2 * k, 2 * k, '#ffffff'); px.rect(g, X - 4 * k, Y + 2 * k, 2 * k, 2 * k, '#ffd23a'); break;
    case 'glue': px.rect(g, X - 2 * k, Y - 2 * k, 4 * k, 4 * k, '#d8ffd8'); px.rect(g, X - 2 * k, Y + 2 * k, k, 2 * k, '#d8ffd8'); break;
    case 'laser': px.rect(g, X - 4 * k, Y, 8 * k, k, '#ffffff'); px.rect(g, X, Y - 4 * k, k, 8 * k, '#ffffff'); break;
    case 'moon': px.disc(g, X, Y - k, 3 * k, '#ffffff'); px.disc(g, X + k, Y - 2 * k, 2 * k, E.shade(c, -.2)); px.rect(g, X - 2 * k, Y + 2 * k, 4 * k, k, '#ffffff'); break;
    case 'bomb': px.disc(g, X, Y + k, 3 * k, '#1a1a1a'); px.rect(g, X + k, Y - 3 * k, k, 2 * k, '#ffd23a'); px.dot(g, X + 2 * k, Y - 4 * k, '#ff5a1a'); break;
    case 'gold': px.disc(g, X, Y, 3 * k, '#fff0a0'); px.dot(g, X - k, Y - k, '#ffffff'); break;
  }
}
function drawMatchWorld(r) {
  const m = S.match, b = S.ball, t = game.time; if (!m) return;
  drawCourtScene(r, S.court, t, FX.react);
  // twists on the floor
  if (m.jackpot) { const j = m.jackpot, pulse = .6 + Math.sin(t * 6) * .3; r.decal(() => { r.groundDisc(j.x, j.y, 16, '#ffd23a', .25 * pulse); r.groundRing(j.x, j.y, 16, '#ffd23a', 1); r.groundRing(j.x, j.y, 12, '#fff0a0', .6); }); L.add(j.x, j.y, 10, 50, .5, { color: '#ffd23a' }); }
  const tw0 = m.twist;
  if (tw0 && tw0.slicks) r.decal(g => { for (const s of tw0.slicks) { const pts = []; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; pts.push(r.w(s.x + Math.cos(a) * s.rx, s.y + Math.sin(a) * s.ry, 0)); } px.poly(g, pts, '#0e0c10'); const sh = (t * .4 + s.x * .01) % 1; px.blend(g, .35, 'add', () => { const q = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; q.push(r.w(s.x + Math.cos(a) * s.rx * .5 + (sh - .5) * s.rx, s.y + Math.sin(a) * s.ry * .3, 0)); } px.poly(g, q, ['#ff5ad8', '#5ae8ff', '#ffe05a'][Math.floor(t * 2 + s.x) % 3]); }); } });
  if (tw0 && tw0.kind === 'eruption') {
    for (const v of VENTS) { r.decal(() => { r.groundDisc(v.x, v.y, 12, '#1a0a08', .9); r.groundRing(v.x, v.y, 12, tw0.ventOn ? '#ffffff' : '#ff6a2a', .8); }); if (tw0.ventOn && S.fxRng() < .5) P.smoke(v.x + (S.fxRng() - .5) * 8, v.y, 4, 1, { size: 1.2, color: '#f0f0f0' }); }
    for (const bm of tw0.bombs) if (!bm.hit) { const k = 1 - bm.t / bm.max, pulse = Math.sin(t * 18) > 0; r.decal(() => { r.groundRing(bm.x, bm.y, 22, pulse ? '#ff3a1a' : '#ffb020', 1); r.groundDisc(bm.x, bm.y, 22 * k, '#ff3a1a', .3); }); r.queue(bm.x, bm.y, 160 * (1 - k), g => { const [x, y] = r.w(bm.x, bm.y, 160 * (bm.t / bm.max) + 4); px.disc(g, x, y, 4, '#ff7a1a'); px.disc(g, x, y, 2, '#fff0a0'); }, { emissive: true }); }
    L.add(XM, Y0 - 60, 80, 260, .4 + Math.sin(t * 3) * .1, { color: '#ff4a1a' });
  }
  // power-ups: a pulsing ring and the icon bobbing over it
  for (const pu of m.powerups) { const def = get('powerup', pu.id); r.decal(() => r.groundRing(pu.x, pu.y, 9 + Math.sin(t * 8) * 1.5, def.color, 1)); r.queue(pu.x, pu.y, 14, g => { const [x, y] = r.w(pu.x, pu.y, 14 + Math.sin(t * 4) * 3); puIcon(g, pu.id, x, y); }, { emissive: true }); L.add(pu.x, pu.y, 12, 40, .6, { color: def.color }); }
  // the hoops (each in the colors of the team that defends it)
  drawHoop(r, 0, teamOf(0)); drawHoop(r, 1, teamOf(1));
  // the referee at the tip
  if (m.phase === 'tipoff') { const ref = npcRig('roscoe'); ref.update(1 / 60, { x: XM, y: YM + 20, z: 0, facing: Math.PI / 2, pose: m.tip && m.tip.tossed ? null : 'cheer' }); r.shadow(XM, YM + 20, 7, .35); r.actor(XM, YM + 20, 0, (g, ox, oy) => ref.draw(g, ox, oy, E.charView(r.view))); }
  // players
  const view = E.charView(r.view);
  for (const p of S.players) {
    r.shadow(p.x, p.y, 7 - Math.min(3, p.z * .04), .4);
    if (p.cmd.tD && !isAir(p) && Math.hypot(p.vx, p.vy) > 40 && (p.turbo > 0 || infTurbo(p))) r.decal(() => r.groundRing(p.x, p.y, 9, '#ffd23a', .5));
    if (hasBall(p)) r.decal(() => r.groundRing(p.x, p.y, 8, '#ffffff', .4));
    if (p.human && hasBall(p) && p.cmd.tD && setting('meter')) { const h = attackHoop(p.team); r.decal(() => r.groundArc(h.x, h.y, dunkRange(p) - 1, dunkRange(p) + 1, 0, TAU, canDunkFrom(p) ? '#ff7a1a' : '#5a4a6a', .5)); }
    const opts = { xray: p.human ? { color: p.tagColor || '#ffffff' } : false };
    if (p.nova) opts.ghost = { color: '#c080ff', life: .25, alpha: .45, owner: p };
    if (p.reboot > 0) opts.flash = Math.sin(t * 30) > 0 ? '#5ac8ff' : undefined;
    r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), opts);
    if (p.nova && S.fxRng() < .3) P.add({ kind: 'ember', x: p.x + (S.fxRng() - .5) * 8, y: p.y, z: p.z + 20 + S.fxRng() * 20, vz: 30, life: .5, color: '#c080ff' });
    if (p.dizzy > 0 || p.reboot > 0) r.queue(p.x, p.y, p.z + 56, g => { for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3, [x, y] = r.w(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 4, p.z + reach(p) * .95); px.rect(g, x - 1, y - 1, 3, 3, p.reboot > 0 ? '#5ac8ff' : '#ffe05a'); } }, { emissive: true });
    // the player tag over humans (P1..P4 in their color)
    if (p.human || p.seat !== undefined) r.queue(p.x, p.y, p.z + 70, g => { const [x, y] = r.w(p.x, p.y, p.z + reach(p) + 10), X = Math.round(x), Y = Math.round(y), c = p.tagColor || '#ffffff', lab = p.tag || 'P1', w = tw(lab) + 4; px.rect(g, X - w / 2, Y - 10, w, 9, '#0a0612'); px.rect(g, X - w / 2 + 1, Y - 9, w - 2, 7, c); txt(g, lab, X, Y - 9, '#0a0612', 1, 'center', { outline: false }); px.poly(g, [[X - 2, Y - 1], [X + 2, Y - 1], [X, Y + 2]], c); }, { emissive: true, bias: 2 });
  }
  // the ball, its shadow (how players read its height) and the trail
  if (b && !(m.phase === 'tipoff' && !m.tip.tossed && false)) {
    r.shadow(b.x, b.y, Math.max(2, 4.5 - b.z * .02), clamp(.5 - b.z * .002, .15, .5));
    const hot = b.owner && b.owner.nova || (b.shot && S.players[b.shot.slot] && S.players[b.shot.slot].nova);
    if (b.trail.length > 2) r.queue(b.x, b.y, b.z, g => { b.trail.forEach(([x, y, z], k) => { const [sx, sy] = r.w(x, y, z); px.ddisc(g, sx, sy, 2 + k * .5, hot ? '#c080ff' : '#ffb060', k / b.trail.length * .5); }); }, { emissive: true, bias: -.01 });
    const handBias = b.owner ? (Math.sin(b.owner.facing) > 0 ? .5 : -.5) * (b.owner.dribSide || 1) : 0;
    r.queue(b.x, b.y, b.z, g => { const [x, y] = r.w(b.x, b.y, b.z); drawBallAt(g, x, y, b.spin, hot); }, { bias: handBias });
    if (hot) L.add(b.x, b.y, b.z, 50, .6, { color: '#c080ff' });
  }
}

/* ---- the HUD ---- */
function plate(g, x, y, w, p, right) {
  const nm = p.name.length > 10 ? p.name.slice(0, 10) : p.name, m = S.match;
  txt(g, nm, right ? x + w - 1 : x + 1, y, p.nova ? '#ffd23a' : UI.ink, 1, right ? 'right' : 'left');
  // turbo bar and the three heat pips under the name
  const bw = Math.min(46, w - 22), bx = right ? x + w - 1 - bw : x + 1;
  E.ui.bar(g, bx, y + 9, bw, 3, p.turbo, infTurbo(p) ? '#c080ff' : p.turbo < .2 ? '#ff5a3a' : '#ffd23a');
  const heat = p.nova ? 3 : m.streak.slot === p.slot ? m.streak.n : 0, hx = right ? bx - 16 : bx + bw + 2;
  for (let k = 0; k < 3; k++) px.rect(g, hx + k * 5, y + 9, 4, 3, k < heat ? (p.nova ? '#c080ff' : '#ff7a1a') : '#2a2440');
  if (p.powerup) { const ix = right ? x + 6 : x + w - 6; puIcon(g, p.powerup.id, ix, y + 3); }
  if (p.human || p.seat !== undefined) { const c = p.tagColor || '#ffffff', lab = p.tag || 'P', bw2 = tw(lab) + 3, bx2 = right ? x + w - 1 - tw(nm) - bw2 - 2 : x + tw(nm) + 3; px.rect(g, bx2, y, bw2, 8, c); txt(g, lab, bx2 + bw2 / 2, y, '#0a0612', 1, 'center', { outline: false }); }
}
function drawHud(g, r) {
  const m = S.match; if (!m) return;
  const ca = game.cornerArea && game.cornerArea(), rightEdge = ca && ca.y1 > 2 && ca.y0 < 36 ? Math.floor(ca.x0) - 2 : r.W - 4;
  const W = r.W, pw = Math.min(clamp(Math.floor((W - 92) / 2) - 6, 130, 200), Math.min(W - 4, rightEdge) - (W / 2 + 40) - 4), top = 3, H0 = 34;
  for (const t of [0, 1]) {
    const tm = teamOf(t), x = t === 0 ? 4 : Math.min(W - 4, rightEdge) - pw, right = t === 1;
    E.ui.box(g, x, top, pw, H0, { bg: [E.shade(tm.jersey, -.25), E.shade(tm.jersey, -.62)], border: tm.trim, alpha: .88 });
    txt(g, tm.short, right ? x + pw - 5 : x + 5, top + 3, '#ffffff', 1, right ? 'right' : 'left');
    txt(g, m.score[t], right ? x + 5 : x + pw - 5, top + 2, '#ffffff', 2, right ? 'left' : 'right');
    if (m.gold === t) puIcon(g, 'gold', right ? x + 36 : x + pw - 36, top + 7);
    const pl = S.players.filter(p => p.team === t), half = Math.floor((pw - 8) / 2);
    pl.forEach((p, k) => plate(g, x + 4 + (right ? (1 - k) : k) * (half + 1), top + 19, half - 2, p, right));
  }
  const cx = W / 2, per = m.sudden ? 'SUDDEN BLAM' : m.quarter > m.periods ? 'OT' + (m.ot > 1 ? m.ot : '') : m.periods === 2 ? (m.quarter === 1 ? '1ST HALF' : '2ND HALF') : 'Q' + m.quarter;
  E.ui.box(g, cx - 38, top, 76, H0, { bg: ['#1a1230', '#0a0612'], border: UI.gold, alpha: .9 });
  txt(g, per, cx - 18, top + 3, UI.gold, 1, 'center');
  const sc = Math.max(0, Math.ceil(m.shotClock)); E.ui.box(g, cx + 8, top + 2, 24, 11, { bg: sc <= 5 ? '#6a0a0a' : '#1a1a24', border: sc <= 5 ? '#ff5a3a' : '#5a5a6a', gradient: false });
  txt(g, sc, cx + 20, top + 4, sc <= 5 ? '#ffd0c0' : '#ffffff', 1, 'center');
  txt(g, m.sudden ? '--' : fmtClock(m.clock), cx, top + 16, m.clock < 10 && !m.sudden ? '#ff7a5a' : '#ffffff', 2, 'center');
  // the release meter by a human shooter
  for (const p of S.players) if (p.human && p.state === 'jumpshot' && p.jump && setting('meter')) {
    const [sx, sy] = r.w(p.x, p.y, p.z + reach(p) + 16), u = clamp(p.jump.t / (p.jump.apexT * 2), 0, 1), pw2 = perfectWin(p) / (p.jump.apexT * 2), X = Math.round(sx) + 12, Y = Math.round(sy);
    px.rect(g, X, Y, 5, 30, '#0a0612'); px.rect(g, X + 1, Y + 15 - Math.round(pw2 * 30 / 2), 3, Math.max(2, Math.round(pw2 * 30)), '#5ae8ff');
    px.rect(g, X + 1, Y + 29 - Math.round(u * 28), 3, 2, u > .5 - pw2 / 2 && u < .5 + pw2 / 2 ? '#ffffff' : '#ffd23a');
  }
  // edge arrows for humans off screen
  for (const p of S.players) if (p.human || p.seat !== undefined) { const [sx] = r.w(p.x, p.y, 20); if (sx < 0 || sx > W) { const left = sx < 0, X = left ? 6 : W - 6, Y = r.H * .6; px.poly(g, left ? [[X, Y], [X + 8, Y - 6], [X + 8, Y + 6]] : [[X, Y], [X - 8, Y - 6], [X - 8, Y + 6]], p.tagColor || '#fff'); txt(g, p.tag || '', left ? X + 10 : X - 10, Y - 3, p.tagColor || '#fff', 1, left ? 'left' : 'right'); } }
  // the windsock at the Pier
  if (m.twist && m.twist.kind === 'wind') { const x = 30, y = r.H - 60, w = m.wind ? Math.hypot(m.wind.x, m.wind.y) / Math.max(1, tune('windStrength')) : 0, a = m.wind ? Math.atan2(m.wind.y * .5, m.wind.x) : 0;
    E.ui.box(g, x - 20, y - 16, 44, 32, { bg: '#0a0612', border: UI.line, alpha: .7 }); px.line(g, x - 10, y + 10, x - 10, y - 10, '#c8c8d0', 1);
    px.poly(g, [[x - 10, y - 10], [x - 10 + Math.cos(a) * 22 * (.3 + w), y - 6 + Math.sin(a) * 6], [x - 10, y - 2]], '#ff7a3a');
    for (let k = 0; k < Math.ceil(w * 3); k++) txt(g, m.wind.x > 0 ? '>' : '<', x + 6 + k * 5, y + 6, '#ffffff', 1); }
  // banners
  const bn = FX.banner;
  if (bn) {
    const k = bn.t < .25 ? E.ease.outBack(bn.t / .25) : 1, a = bn.t > 1.1 ? 1 - (bn.t - 1.1) / .2 : 1, s = Math.max(1, Math.round(3 * k)), y = Math.round(r.H * .3);
    if (a > .1) { E.font.title(g, bn.text, W / 2, y, { scale: s, colors: BANNER_COL[bn.kind] || BANNER_COL.dunk, depth: 2, depthColor: '#1a0612', align: 'center' }); if (bn.sub) txt(g, bn.sub, W / 2, y + s * 9 + 4, '#ffffff', 1, 'center'); }
  }
  // tip-off and inbound prompts for humans
  const hum = S.players.find(p => p.human);
  if (m.phase === 'tipoff' && hum && m.jumpers.includes(hum)) promptLine(g, 'TIP-OFF! {shoot} TO JUMP AT THE TOP', W / 2, r.H * .4, hum.human, { align: 'center' });
  if (m.phase === 'inbound' && m.inb && m.inb.who.human) promptLine(g, '{pass} INBOUND', W / 2, r.H * .4, m.inb.who.human, { align: 'center' });
  if (S.mode === 'exhibition' || S.mode === 'tour') {   // the first possession's hint for a human handler
    const hh = S.players.find(p => p.human && hasBall(p));
    if (hh && m.time < 25 && !m.hintShown) promptLine(g, 'HOLD {turbo} + {shoot} NEAR THE RIM TO DUNK   {pass} PASS   {shove} SPIN', W / 2, r.H - 50, hh.human, { align: 'center', color: UI.dim });
  }
  drawCaption(g, r);
  if (m.phase === 'break') drawBreak(g, r);
  if (m.phase === 'sponsor') drawSponsor(g, r);
  if (m.phase === 'over' && S.mode !== 'attract') { E.font.title(g, 'FINAL', W / 2, r.H * .32, { scale: 4, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 3, align: 'center' }); txt(g, teamName(0) + ' ' + m.score[0] + '  -  ' + m.score[1] + ' ' + teamName(1), W / 2, r.H * .32 + 42, '#ffffff', 2, 'center'); }
}
function drawCaption(g, r) {
  const c = Caption.cur; if (!c) return;
  const w = Math.min(r.W - 40, 330), x = Math.round(r.W / 2 - w / 2), h = 30, y = r.H - h - 6, k = Math.min(1, c.t / .15);
  if (k < 1) return E.ui.box(g, x + w / 2 - w * k / 2, y, w * k, h, { bg: '#140c24', border: UI.accent });
  E.ui.box(g, x, y, w, h, { bg: ['#2a1a48', '#140c24'], border: UI.accent, alpha: .92 });
  const rig = npcRig(c.speaker); try { rig._talk = c.t < c.left; rig.drawPortrait(g, x + 3, y + 3, 24, { bg: '#3a2a5a' }); } catch (e) { /* portrait */ }
  txt(g, c.name, x + 31, y + 2, UI.gold, 1);
  const lines = E.font.wrap(c.text, w - 36, {}); lines.slice(0, 2).forEach((ln, i) => txt(g, ln, x + 31, y + 11 + i * 9, '#ffffff', 1, 'left', { outline: false }));
}
function drawBreak(g, r) {
  const m = S.match, half = m.breakKind === 'halftime', w = Math.min(r.W - 30, 380), h = half ? 170 : 130, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2) + 10;
  panel(g, x, y, w, h, half ? 'HALFTIME REPORT' : 'END OF Q' + m.quarter);
  txt(g, teamName(0) + '  ' + m.score[0] + '  -  ' + m.score[1] + '  ' + teamName(1), x + w / 2, y + 26, '#ffffff', 2, 'center');
  // the leaders
  const lead = [0, 1].map(t => S.players.filter(p => p.team === t).sort((a, c) => c.stats.PTS - a.stats.PTS)[0]);
  lead.forEach((p, t) => { const lx = x + (t ? w * .55 : 12); txt(g, p.name + ': ' + p.stats.PTS + ' PTS', lx, y + 50, UI.dim, 1); txt(g, 'DUNKS ' + p.stats.DNK + '  BLK ' + p.stats.BLK + '  STL ' + p.stats.STL, lx, y + 60, UI.dim, 1); });
  // juice bars of everyone on court and the bench
  S.players.forEach((p, k) => { const lx = x + (p.team ? w * .55 : 12), ly = y + 76 + (k % 2) * 12; txt(g, p.name.slice(0, 10), lx, ly, '#ffffff', 1); E.ui.bar(g, lx + 70, ly + 2, 60, 4, p.juice, p.juice > .5 ? UI.good : '#ff7a3a'); });
  if (S.subUI && S.subUI.list) { const hint = S.subUI.text; promptLine(g, hint, x + w / 2, y + h - 30, S.subUI.input, { align: 'center' }); }
  if (half) { const lines = E.font.wrap(m.gag, w - 24, {}); lines.slice(0, 2).forEach((ln, i) => txt(g, ln, x + w / 2, y + 112 + i * 10, UI.gold, 1, 'center')); }
  txt(g, 'BACK IN ' + Math.ceil(Math.max(0, m.breakT)), x + w / 2, y + h - 14, UI.dim, 1, 'center');
}
function drawSponsor(g, r) {
  const m = S.match, w = Math.min(r.W - 20, 400), h = 120, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
  E.ui.box(g, x, y, w, h, { bg: ['#f4e8c8', '#e0c890'], border: '#c8202a' });
  E.font.title(g, 'GLOBO-BLAM', r.W / 2, y + 10, { scale: 3, colors: ['#ff5a3a', '#c8202a', '#6a0a0a'], depth: 2, align: 'center' });
  E.font.wrap(m.sponsorLine, w - 30, {}).forEach((ln, i) => txt(g, ln, r.W / 2, y + 48 + i * 11, '#2a1a10', 1, 'center', { outline: false }));
  // the cleaning bot rolling out with new glass
  const u = clamp(m.sponsorT / 4, 0, 1), bx = x + 20 + u * (w - 40); px.rect(g, bx - 8, y + h - 24, 16, 10, '#8a90a0'); px.disc(g, bx - 5, y + h - 13, 3, '#2a2a2a'); px.disc(g, bx + 5, y + h - 13, 3, '#2a2a2a'); px.rect(g, bx - 3, y + h - 34, 10, 10, '#cfe4ff');
  txt(g, "WE'LL BE RIGHT BACK", r.W / 2, y + h - 10, '#c8202a', 1, 'center', { outline: false });
}

/* ---- 42-matchscene.js ---- */
/* THE MATCH SCENE: runs a match (any mode), the camera, captions, the crowd, then hands over to the results. In a
 * break a human team may swap its CPU teammate with the bench (△ / F). */
const SCENES = {};
let lastMatchCfg = null;
SCENES.match = {
  isMatch: true, pausable: !HUB, camera: { zoom: [.8, 1.4] }, input: KEYS,
  enter(cfg) {
    cfg = cfg || lastMatchCfg || exhibitionDefault(); lastMatchCfg = cfg;
    S.scene = 'match';
    game.setView(setting('camera') === 'high' ? HIGH : 'broadcast');
    startMatch(cfg);
    const court = get('court', cfg.court); game.weather = court.weather ? Object.assign({}, court.weather) : null;
    if (S.mode !== 'hub' || !S.net || S.net.role !== 'server') music(court.music, { restart: true });
    FX.focusX = XM; FX.zoom = 1; FX.banner = null; FX.applied = 0; game.setZoom(1);
    if (cfg.onEnter) cfg.onEnter();
  },
  exit() { game.timeScale = 1; game.weather = null; Crowd.update(1, false); layer('nova', 0); game.setZoom(1); FX.applied = 1; },
  update(dt) {
    const m = S.match; if (!m) return;
    if (S.devOpen) devAutopilot(true);
    subsUI(dt);
    matchStep(dt);
    cameraStep(dt); Caption.update(dt); hoopStep(dt, m.wind ? m.wind.x / Math.max(1, tune('windStrength')) : 0); Crowd.update(dt, true);
    if (m.cfg.onStep) m.cfg.onStep(dt);
    if (m.phase === 'over' && m.overT > 3 && !m.handed) { m.handed = true; if (m.cfg.onEnd) m.cfg.onEnd(m); else go('results', { cfg: m.cfg }); }
  },
  draw(r) {
    drawMatchWorld(r);
    r.overlay(g => { drawHud(g, r); if (S.mode === 'attract') drawAttractOverlay(g, r); if (S.devOpen || DEV.overlays.any) drawDev(g, r); if (S.match.cfg.overlay) S.match.cfg.overlay(g, r); });
  }
};
/** in a break, a human may swap the CPU teammate with a rested bench player */
function subsUI() {
  const m = S.match; S.subUI = null;
  if (!m || m.phase !== 'break' || S.mode === 'hub' || S.mode === 'attract' || S.mode === 'camp') return;
  const hum = S.players.find(p => p.human); if (!hum) return;
  const t = hum.team, cpuMate = S.players.find(p => p.team === t && !p.human), bench = S.bench[t];
  if (!cpuMate || !bench.length) return;
  S.subUI = { list: true, input: hum.human, text: '{oop} SUB ' + cpuMate.name + ' FOR ' + get('player', bench[0].id).name + '   {confirm} CONTINUE' };
  if (hum.human.pressed('oop')) { substitute(cpuMate, bench[0].id); A.sfx('confirm'); m.breakT = Math.max(m.breakT, 3); }
  if (hum.human.pressed('confirm')) m.breakT = Math.min(m.breakT, .2);
}
function restartMatch() { if (lastMatchCfg) go('match', lastMatchCfg); }
function exhibitionDefault() {
  return { court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [{ input: game.input, slot: 0 }], quarter: setting('quarter') || 120, difficulty: setting('difficulty'), powerups: setting('powerups'), twists: setting('twists') };
}

/* ---- 43-screens.js ---- */
/* SCREENS: title, main menu, join (1-4 players), team select (with each human's player), court and rules, the matchup
 * card (the cheat-code window), results (MVP, the Blam of the Game, the box score, initials for the Hall of Blam), Hall of
 * Blam, How to Play (3 pages), About/Credits (with the report pages). Every screen works with any one device alone. */
const MENU_BG = new E.Backdrop({ sky: ['#07051a', '#1e1040', '#4a1a5a'], moon: { x: .85, y: .16, r: 9 }, stars: 70, layers: [{ kind: 'city', color: '#2a1a48', y: .62, height: .4, parallax: .05, windows: '#ff7ad8' }, { kind: 'city', color: '#140c28', y: .76, height: .32, parallax: .15, windows: '#5ae8ff', seed: 6 }] });
function menuBackdrop(r, t) {
  game.focus(t * 20, 0, 0); MENU_BG.draw(r); L.enabled = false;
  r.overlay(g => { for (let k = 0; k < 6; k++) { const y = (k * 47 + t * 18) % (r.H + 40) - 20; px.blend(g, .08, 'add', () => px.rect(g, 0, Math.round(y), r.W, 6, k % 2 ? '#ff3ca6' : '#2de2ff')); } });
}
const menuScene = (o) => Object.assign({ view: 'side', input: KEYS, pausable: false, menuScreen: true, back() { if (this.onBack) { this.onBack(); return true; } return false; } }, o);
function anyPause() { return game.players.some(I => I.pressed('pause')); }
const players = () => game.players;

/* ---- TITLE ---- */
const TITLE = { t: 0, rigs: null };
function titleRigs() {
  if (TITLE.rigs) return TITLE.rigs;
  TITLE.rigs = [dressRig(get('player', 'volt'), 'hightops'), dressRig(get('player', 'riptide'), 'breakers'), dressRig(get('player', 'torque'), 'crushers'), dressRig(get('player', 'ember'), 'magma')];
  return TITLE.rigs;
}
SCENES.title = menuScene({
  enter() { S.scene = 'title'; TITLE.t = 0; music('title'); game.weather = null; idleReset(); },
  update(dt) {
    TITLE.t += dt;
    if (S.touchOnly) { const cl = game.input.clicked(); if (cl && TITLE.btn && hitBox(cl, TITLE.btn)) game.menu('settings'); return; }
    if (players().some(I => I.pressed('start') || I.pressed('confirm')) || game.input.clicked()) { players().forEach(I => I.consumeAll()); A.sfx('confirm'); go('menu'); }
    if (anyPause()) game.menu('settings');
    const rigs = titleRigs(), t = TITLE.t;
    rigs.forEach((rg, k) => { const u = (t * .5 + k * .25) % 1, jump = Math.max(0, Math.sin(u * TAU)) * 14 * (k % 2 ? 1 : .4); rg.bb.targets = k === 0 ? (u < .5 ? both([3, 0, 30 + jump], 2) : { R: [2, 3, 44], L: [3, -4, 18] }) : MOVES[['raiseRoof', 'chestPound', 'blowFingers', 'flex'][k]](t); rg.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: 'smile' }); });
  },
  draw(r) {
    menuBackdrop(r, TITLE.t);
    r.overlay(g => {
      const t = TITLE.t, cy = Math.round(r.H * .3);
      logo(g, r.W / 2, cy - 20, Math.max(4, Math.floor(r.W / 90)), t);
      txt(g, 'NO FOULS. NO MERCY. ALL BLAM.', r.W / 2, cy + 30, UI.accent2, 1, 'center');
      // the four crews
      const rigs = titleRigs(), sp = Math.min(80, r.W / 5);
      rigs.forEach((rg, k) => { const x = r.W / 2 + (k - 1.5) * sp + (k > 1 ? 30 : -30), y = r.H - 16; rg.draw(g, Math.round(x), Math.round(y), E.charView(E.VIEWS.side)); });
      if (S.touchOnly) {
        txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .5, '#ffffff', tw('CONTROLLER OR KEYBOARD REQUIRED', 2) < r.W - 16 ? 2 : 1, 'center');
        const bw = 120, bx = Math.round(r.W / 2 - bw / 2), by = Math.round(r.H * .5 + 26); TITLE.btn = [bx, by, bw, 26];
        E.ui.box(g, bx, by, bw, 26, { bg: [UI.accent, E.shade(UI.accent, -.4)], border: '#ffffff' }); txt(g, 'SETTINGS', r.W / 2, by + 6, '#ffffff', 2, 'center');
      } else if (Math.floor(t * 2) % 2 === 0) promptLine(g, 'PRESS {confirm} TO START', r.W / 2, cy + 46, game.input, { align: 'center', scale: 1 });
      txt(g, 'BASKETBLAM ' + VERSION + '  -  ENGINE ' + E.versionLabel().replace(/·/g, '-'), 6, r.H - 10, '#6a5e8a', 1, 'left', { outline: false });
    });
  }
});
const hitBox = (p, b) => p[0] >= b[0] && p[0] < b[0] + b[2] && p[1] >= b[1] && p[1] < b[1] + b[3];

/* ---- MAIN MENU ---- */
const MAIN = new FocusList([
  { label: 'BLAM TOUR', id: 'tour', about: 'Four games, five courts, one Golden Blamboozle. Beat the street crews, then the robots.', onPick: () => go('tourstart') },
  { label: 'EXHIBITION', id: 'exhibition', about: 'Any teams, any court, one to four players on this machine.', onPick: () => go('join') },
  { label: 'BLAM CAMP', id: 'camp', about: 'Ten quick lessons with Dee Dee. Learn every move in five minutes.', onPick: () => go('camplist') },
  { label: 'HALL OF BLAM', id: 'hall', about: 'The best Tour scores and the records.', onPick: () => go('hall') },
  { label: 'HOW TO PLAY', id: 'howto', about: 'The controls, the rules, the courts and the power-ups.', onPick: () => go('howto', { back: 'menu' }) },
  { label: 'OPTIONS', id: 'options', about: 'Sound, voices, button symbols, camera, difficulty and more.', onPick: () => game.menu('settings') },
  { label: 'ABOUT', id: 'about', about: 'Credits, and how this game was made.', onPick: () => go('about') }
], { onBack: () => go('title') });
SCENES.menu = menuScene({
  enter() { S.scene = 'menu'; music('title'); idleReset(); },
  onBack() { go('title'); },
  update(dt) { MAIN.update(dt); if (anyPause()) game.menu('settings'); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), w = Math.min(190, r.W * .42), h = 22;
      logo(g, sf.x + w / 2, sf.y, 2, game.time);
      MAIN.draw(g, sf.x, sf.y + 30, w, h, { gap: 3, scale: 2 });
      // the preview panel
      const px0 = sf.x + w + 14, pw = sf.x + sf.w - px0, it = MAIN.cur;
      if (pw > 120) {
        panel(g, px0, sf.y + 30, pw, 7 * 25 - 3, it.label);
        E.font.wrap(it.about, pw - 20, { scale: 1 }).forEach((ln, i) => txt(g, ln, px0 + 10, sf.y + 54 + i * 10, UI.ink, 1));
        previewArt(g, it.id, px0 + pw / 2, sf.y + 30 + 7 * 25 - 30, pw);
      }
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {cancel} BACK');
    });
  }
});
function previewArt(g, id, cx, by, pw) {
  const t = game.time;
  if (id === 'tour') { const n = 4; for (let k = 0; k < n; k++) { const x = cx + (k - 1.5) * Math.min(34, pw / 6), won = S.progress && S.progress.tour && S.progress.tour.stop > k; px.disc(g, x, by - 10, 9, won ? UI.gold : '#3a2a5a'); txt(g, k < 3 ? String(k + 1) : 'F', x, by - 14, '#ffffff', 1, 'center'); if (k) px.line(g, x - Math.min(34, pw / 6) + 9, by - 10, x - 9, by - 10, '#6a5a8a', 1); } }
  else if (id === 'exhibition') { const a = titleRigs(); a[0].drawPortrait(g, cx - 50, by - 44, 40); a[2].drawPortrait(g, cx + 10, by - 44, 40); txt(g, 'VS', cx, by - 30, UI.gold, 2, 'center'); }
  else if (id === 'camp') npcRig('deedee').drawPortrait(g, cx - 20, by - 44, 40);
  else if (id === 'hall') E.font.title(g, '★', cx, by - 40, { scale: 4, colors: ['#fff6c0', '#ffd23a', '#c88a10'], align: 'center' });
  else if (id === 'about') npcRig('vinnie').drawPortrait(g, cx - 20, by - 44, 40);
  else if (id === 'options') { glyph(g, 'Pad9', cx - 20, by - 30, 2); }
  else if (id === 'howto') { glyph(g, 'Pad2', cx - 40, by - 30, 2); glyph(g, 'Pad0', cx - 12, by - 30, 2); glyph(g, 'Pad1', cx + 16, by - 30, 2); }
}

/* ---- JOIN (Exhibition): P1-P4 slide to HOME or AWAY, confirm to be ready; CPU fills the rest ---- */
const JOIN = { side: [], ready: [] };
SCENES.join = menuScene({
  enter() {
    S.scene = 'join'; idleReset(); music('menu');
    while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
    JOIN.side = [0]; JOIN.ready = [false];
    game.allowJoin({ max: 4, onJoin: (I, n) => { JOIN.side[n - 1] = (n - 1) % 2; JOIN.ready[n - 1] = false; I.glyphs = setting('symbols'); A.sfx('confirm'); } });
  },
  exit() { game.allowJoin(false); },
  onBack() { go('menu'); },
  update(dt) {
    const P0 = game.players;
    P0.forEach((I, k) => {
      if (I.pressed('left')) { JOIN.side[k] = 0; JOIN.ready[k] = false; A.sfx('select'); }
      if (I.pressed('right')) { JOIN.side[k] = 1; JOIN.ready[k] = false; A.sfx('select'); }
      if (I.pressed('confirm')) { if (JOIN.ready[k] && k === 0) startTeams(); else { JOIN.ready[k] = true; A.sfx('confirm'); } }
      if (I.pressed('cancel')) { if (k === 0) { if (JOIN.ready[0]) JOIN.ready[0] = false; else go('menu'); } else { game.removePlayer(I); JOIN.side.splice(k, 1); JOIN.ready.splice(k, 1); A.sfx('cancel'); } }
      if (I.pressed('start') && k === 0) startTeams();
    });
    const cl = game.input.clicked(); if (cl && JOIN.go && hitBox(cl, JOIN.go)) startTeams();
    // at most two humans a side
    for (const s of [0, 1]) { const on = JOIN.side.map((v, k) => v === s ? k : -1).filter(k => k >= 0); if (on.length > 2) JOIN.side[on[2]] = 1 - s; }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); txt(g, 'EXHIBITION: WHO\'S PLAYING?', r.W / 2, sf.y, UI.gold, 2, 'center');
      const colW = Math.min(150, sf.w / 3); txt(g, 'HOME', r.W / 2 - colW, sf.y + 24, UI.accent, 2, 'center'); txt(g, 'AWAY', r.W / 2 + colW, sf.y + 24, UI.accent2, 2, 'center');
      for (let k = 0; k < 4; k++) {
        const I = game.players[k], y = sf.y + 48 + k * 26;
        if (!I) { txt(g, 'P' + (k + 1) + ': PRESS START (PAD) OR ' + (k === 1 ? '2 (KEYBOARD)' : 'START'), r.W / 2, y + 6, '#6a5e8a', 1, 'center'); continue; }
        const x = r.W / 2 + (JOIN.side[k] ? colW : -colW) - 50;
        E.ui.box(g, x, y, 100, 22, { bg: JOIN.ready[k] ? [I.color, E.shade(I.color, -.4)] : '#2a1e44', border: I.color });
        txt(g, 'P' + (k + 1) + (JOIN.ready[k] ? ' READY' : ''), x + 50, y + 4, '#ffffff', 2, 'center');
        txt(g, '←', x - 10, y + 6, UI.dim, 1); txt(g, '▸', x + 104, y + 6, UI.dim, 1);
      }
      const n = game.players.length;
      txt(g, 'CPU FILLS THE EMPTY SEATS.  ' + (n < 4 ? 'KEYBOARD P2: PRESS 2, THEN ARROWS + . / ,' : ''), r.W / 2, sf.y + 160, UI.dim, 1, 'center');
      const bw = 130, bx = Math.round(r.W / 2 - bw / 2), by = sf.y + 176; JOIN.go = [bx, by, bw, 22];
      E.ui.box(g, bx, by, bw, 22, { bg: JOIN.ready[0] ? [UI.accent, E.shade(UI.accent, -.4)] : '#2a1e44', border: '#ffffff' }); txt(g, 'CONTINUE', r.W / 2, by + 4, '#ffffff', 2, 'center');
      promptBar(g, r, '{move} SIDE   {confirm} READY   {confirm} AGAIN: CONTINUE   {cancel} BACK');
    });
  }
});
function startTeams() {
  const humans = game.players.map((I, k) => ({ input: I, side: JOIN.side[k] || 0 }));
  S.setup = { mode: 'exhibition', humans, teams: ['hightops', 'breakers'], pick: [0, 0], court: null };
  A.sfx('confirm'); go('teams');
}

/* ---- TEAM SELECT: a card per side; left/right cycles the team, up/down picks the human's player ---- */
const unlocked = id => !get('team', id).locked || (S.progress && S.progress.unlocked && S.progress.unlocked.teams) || DEV.unlockAll;
function teamList() { return all('team').filter(t => !t.hidden && unlocked(t.id)).map(t => t.id); }
const TS = { side: 0, locked: [false, false] };
SCENES.teams = menuScene({
  enter() { S.scene = 'teams'; idleReset(); TS.locked = [false, false]; TS.side = 0; if (S.setup.mode === 'tour') TS.locked[1] = true; },
  onBack() { go(S.setup.mode === 'tour' ? 'menu' : 'join'); },
  update(dt) {
    const st = S.setup, list = teamList();
    for (const side of [0, 1]) {
      if (TS.locked[side]) continue;
      const ctl = st.humans.filter(h => h.side === side).map(h => h.input), inputs = ctl.length ? ctl : (side === TS.side ? [game.input] : []);
      for (const I of inputs) {
        if (I.pressed('left') || I.pressed('right')) { const k = list.indexOf(st.teams[side]); let n = (k + (I.pressed('left') ? -1 : 1) + list.length) % list.length; if (list[n] === st.teams[1 - side] && st.mode !== 'exhibition') n = (n + 1) % list.length; st.teams[side] = list[n]; st.pick[side] = 0; A.sfx('select'); }
        if (I.pressed('up') || I.pressed('down')) { st.pick[side] = (st.pick[side] + (I.pressed('up') ? 2 : 1)) % 3; A.sfx('select'); }
        if (I.pressed('confirm')) { TS.locked[side] = true; A.sfx('confirm'); if (!ctl.length) TS.side = 1 - side; }
        if (I.pressed('cancel')) { A.sfx('cancel'); if (side === 1 && !ctl.length && TS.locked[0] && st.mode === 'exhibition') { TS.locked[0] = false; TS.side = 0; } else go(st.mode === 'tour' ? 'menu' : 'join'); return; }
      }
      // the mouse: click a side's arrows, or its card to lock it
      const cl = game.input.clicked(); if (cl && TS.boxes) { const b = TS.boxes[side]; if (b) { if (hitBox(cl, b.l)) { const k = list.indexOf(st.teams[side]); st.teams[side] = list[(k - 1 + list.length) % list.length]; A.sfx('select'); } else if (hitBox(cl, b.r)) { const k = list.indexOf(st.teams[side]); st.teams[side] = list[(k + 1) % list.length]; A.sfx('select'); } else if (hitBox(cl, b.card)) { TS.locked[side] = true; A.sfx('confirm'); } } }
    }
    if (TS.locked[0] && TS.locked[1]) { if (st.mode === 'tour') return tourBegin(); go('courtsel'); }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const st = S.setup, sf = safe(r), cw = Math.min(200, (sf.w - 16) / 2);
      txt(g, st.mode === 'tour' ? 'BLAM TOUR: PICK YOUR CREW' : 'PICK YOUR TEAMS', r.W / 2, sf.y, UI.gold, 2, 'center');
      TS.boxes = [];
      for (const side of [0, 1]) {
        if (st.mode === 'tour' && side === 1) continue;
        const x = st.mode === 'tour' ? Math.round(r.W / 2 - cw / 2) : side ? r.W / 2 + 8 : r.W / 2 - 8 - cw, y = sf.y + 22, h = sf.h - 50, tm = get('team', st.teams[side]);
        const humans = st.humans.filter(hh => hh.side === side);
        E.ui.box(g, x, y, cw, h, { bg: [E.shade(tm.jersey, -.3), E.shade(tm.jersey, -.7)], border: TS.locked[side] ? '#ffffff' : tm.trim });
        TS.boxes[side] = { l: [x, y, 20, 30], r: [x + cw - 20, y, 20, 30], card: [x + 20, y + 30, cw - 40, h - 30] };
        txt(g, '←', x + 6, y + 6, '#ffffff', 2); txt(g, '▸', x + cw - 16, y + 6, '#ffffff', 2);
        txt(g, side ? 'AWAY' : 'HOME', x + cw / 2, y + 4, '#ffffff', 1, 'center');
        txt(g, tm.short, x + cw / 2, y + 14, '#ffffff', 2, 'center');
        txt(g, tm.style.toUpperCase(), x + cw / 2, y + 32, tm.trim, 1, 'center');
        const ps = tm.players.map(id => get('player', id));
        ps.forEach((p, k) => {
          const py = y + 46 + k * Math.min(56, (h - 70) / 3), chosen = humans.length && st.pick[side] === k;
          if (chosen) E.ui.box(g, x + 4, py - 2, cw - 8, 52, { bg: '#ffffff22', border: humans[0].input.color });
          npcRig(p.id).drawPortrait(g, x + 8, py, 24);
          txt(g, p.name, x + 36, py, '#ffffff', 1); txt(g, p.role, x + 36, py + 9, UI.dim, 1);
          RATINGS.forEach((rk, i) => { const cx2 = x + 36 + (i % 4) * Math.floor((cw - 44) / 4), cy2 = py + 20 + Math.floor(i / 4) * 12; txt(g, RATING_NAMES[rk].slice(0, 4), cx2, cy2, UI.dim, 1, 'left', { font: undefined }); for (let q = 0; q < 10; q += 2) px.rect(g, cx2 + q * 1.4, cy2 + 8, 2, 2, q < p.ratings[rk] ? tm.trim : '#2a2440'); });
          if (chosen) txt(g, humans.map(hh => 'P' + hh.input.player).join(' '), x + cw - 8, py, humans[0].input.color, 1, 'right');
        });
        if (TS.locked[side]) txt(g, 'LOCKED IN', x + cw / 2, y + h - 14, UI.good, 1, 'center');
        else if (!humans.length && side !== TS.side) txt(g, 'CPU', x + cw / 2, y + h - 14, UI.dim, 1, 'center');
      }
      promptBar(g, r, '{move} TEAM / PLAYER   {confirm} LOCK IN   {cancel} BACK');
    });
  }
});

/* ---- COURT & RULES ---- */
const CS = { i: 0, row: 0 };
const courtUnlocked = id => id !== 'dome' || (S.progress && S.progress.unlocked && S.progress.unlocked.teams) || DEV.unlockAll || S.setup.teams.includes('blambots') || S.setup.teams.includes('allstars');
const RULE_ROWS = [
  { label: 'QUARTER', key: 'quarter', vals: [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00']] },
  { label: 'CPU', key: 'difficulty', vals: [['rookie', 'ROOKIE'], ['pro', 'PRO'], ['allstar', 'ALL-STAR'], ['blam', 'BLAM']] },
  { label: 'POWER-UPS', key: 'powerups', vals: [[true, 'ON'], [false, 'OFF']] },
  { label: 'TWISTS', key: 'twists', vals: [[true, 'ON'], [false, 'OFF']] }
];
SCENES.courtsel = menuScene({
  enter() { S.scene = 'courtsel'; idleReset(); CS.row = 0; const home = get('team', S.setup.teams[0]).court; CS.i = Math.max(0, COURTS.indexOf(home)); if (!courtUnlocked(COURTS[CS.i])) CS.i = 0; },
  onBack() { go('teams'); },
  update(dt) {
    const rows = 1 + RULE_ROWS.length + 1;
    for (const I of game.players) {
      if (I.repeat('up', .35, .12)) { CS.row = (CS.row + rows - 1) % rows; A.sfx('select'); }
      if (I.repeat('down', .35, .12)) { CS.row = (CS.row + 1) % rows; A.sfx('select'); }
      const d = I.repeat('left', .35, .15) ? -1 : I.repeat('right', .35, .15) ? 1 : 0;
      if (d) { A.sfx('select'); if (CS.row === 0) { do { CS.i = (CS.i + d + COURTS.length) % COURTS.length; } while (!courtUnlocked(COURTS[CS.i])); } else if (CS.row <= RULE_ROWS.length) cycleRule(RULE_ROWS[CS.row - 1], d); }
      if (I.pressed('confirm') || I.pressed('start')) { if (CS.row === rows - 1 || I.pressed('start') || CS.row === 0) { A.sfx('confirm'); return beginExhibition(); } else cycleRule(RULE_ROWS[CS.row - 1], 1); }
      if (I.pressed('cancel')) { A.sfx('cancel'); return go('teams'); }
    }
    const ptr = game.input.pointer(), cl = game.input.clicked();
    if (CS.boxes) { if (ptr) CS.boxes.forEach((b, k) => { if (b && hitBox(ptr, b.box) && CS.row !== b.row) { CS.row = b.row; } }); if (cl) for (const b of CS.boxes) if (b && hitBox(cl, b.box)) { if (b.court !== undefined) { if (courtUnlocked(COURTS[b.court])) CS.i = b.court; } else if (b.row <= RULE_ROWS.length && b.row > 0) cycleRule(RULE_ROWS[b.row - 1], 1); else if (b.row === rows - 1) beginExhibition(); A.sfx('select'); } }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); txt(g, 'COURT AND RULES', r.W / 2, sf.y, UI.gold, 2, 'center');
      CS.boxes = [];
      const cw = Math.min(76, (sf.w - 20) / 5);
      COURTS.forEach((id, k) => {
        const c = get('court', id), x = Math.round(r.W / 2 + (k - 2.5) * (cw + 4)), y = sf.y + 22, sel = k === CS.i, lock = !courtUnlocked(id);
        E.ui.box(g, x, y, cw, 54, { bg: lock ? '#120c1c' : [c.sky.sky[1], c.sky.sky[2]], border: sel ? '#ffffff' : (CS.row === 0 ? UI.line : '#2a2040') });
        const fl = c.base; px.rect(g, x + 3, y + 30, cw - 6, 20, 'rgb(' + fl.map(Math.round).join(',') + ')'); px.rect(g, x + 3, y + 39, cw - 6, 1, c.line);
        txt(g, lock ? 'LOCKED' : c.name.replace('THE ', ''), x + cw / 2, y + 4, lock ? '#5a4e70' : '#ffffff', 1, 'center');
        if (sel) txt(g, '↓', x + cw / 2, y - 9, '#ffffff', 1, 'center');
        CS.boxes.push({ box: [x, y, cw, 54], row: 0, court: k });
      });
      const c = get('court', COURTS[CS.i]);
      txt(g, c.place.toUpperCase() + '  -  TWIST: ' + { jackpot: 'THE JACKPOT SPOT', wind: 'SEA BREEZE', oil: 'OIL SLICKS', eruption: 'ERUPTIONS AND STEAM VENTS', boss: 'THE BOSS' }[c.twist], r.W / 2, sf.y + 82, UI.dim, 1, 'center');
      RULE_ROWS.forEach((row, k) => {
        const y = sf.y + 98 + k * 20, sel = CS.row === k + 1, v = row.vals.find(x => x[0] === setting(row.key)) || row.vals[0], w = 220, x = Math.round(r.W / 2 - w / 2);
        E.ui.box(g, x, y, w, 17, { bg: sel ? [UI.accent, E.shade(UI.accent, -.4)] : '#2a1e44', border: sel ? '#ffffff' : UI.line });
        txt(g, (sel ? '▸ ' : '') + row.label, x + 6, y + 4, '#ffffff', 1); txt(g, '← ' + v[1] + ' →', x + w - 6, y + 4, UI.gold, 1, 'right');
        CS.boxes.push({ box: [x, y, w, 17], row: k + 1 });
      });
      const y = sf.y + 98 + RULE_ROWS.length * 20 + 4, w = 160, x = Math.round(r.W / 2 - w / 2), sel = CS.row === RULE_ROWS.length + 1;
      E.ui.box(g, x, y, w, 22, { bg: sel ? [UI.good, E.shade(UI.good, -.5)] : '#2a1e44', border: '#ffffff' }); txt(g, 'TIP IT OFF!', r.W / 2, y + 4, '#ffffff', 2, 'center');
      CS.boxes.push({ box: [x, y, w, 22], row: RULE_ROWS.length + 1 });
      promptBar(g, r, '{move} CHOOSE   {confirm} START   {cancel} BACK');
    });
  }
});
function cycleRule(row, d) { const k = row.vals.findIndex(x => x[0] === setting(row.key)); game.settings.set(row.key, row.vals[(k + d + row.vals.length) % row.vals.length][0]); }
function beginExhibition() {
  const st = S.setup; st.court = COURTS[CS.i];
  go('matchup', { cfg: buildCfg(st) });
}
/** a match config from a setup: humans to slots; each human's chosen player starts */
function buildCfg(st, extra = {}) {
  const teams = st.teams.map((id, side) => {
    const tm = get('team', id), lineup = tm.players.slice(), first = lineup[st.pick[side] || 0];
    const humans = st.humans.filter(h => h.side === side);
    const starters = humans.length ? [first, ...lineup.filter(x => x !== first)].slice(0, 2) : lineup.slice(0, 2);
    return { id, lineup, starters };
  });
  const humans = [];
  for (const side of [0, 1]) st.humans.filter(h => h.side === side).forEach((h, k) => humans.push({ input: h.input, slot: side * 2 + k }));
  return Object.assign({ court: st.court, mode: st.mode, teams, humans, quarter: setting('quarter'), difficulty: setting('difficulty'), powerups: setting('powerups'), twists: setting('twists') }, extra);
}

/* ---- THE MATCHUP CARD: the starters face off; the cheat-code window ---- */
const MU = { t: 0, cfg: null, codes: [] };
SCENES.matchup = menuScene({
  enter(d) { S.scene = 'matchup'; MU.t = 0; MU.cfg = d.cfg; MU.codes = []; MU.cfg.cheats = MU.cfg.cheats || {}; music('menu'); idleReset(); },
  onBack() { if (MU.cfg.mode === 'tour') go('tourmap'); else go('courtsel'); },
  update(dt) {
    MU.t += dt;
    for (const I of game.players) for (const c of all('code')) if (I.sequence(c.steps, { window: 1.2 })) {
      if (MU.cfg.cheats[c.id]) continue; MU.cfg.cheats[c.id] = true; MU.codes.push(c.name); A.sfx('code_ok'); MU.t = Math.min(MU.t, 2);
      if (c.id === 'turbo') { const h = MU.cfg.humans.find(hh => hh.input === I); MU.cfg.cheats['turbo' + (h ? Math.floor(h.slot / 2) : 0)] = true; }
      if (c.id === 'tournament') { MU.cfg.cheats = { tournament: true }; MU.codes = ['TOURNAMENT MODE']; }
    }
    const skip = game.players.some(I => I.pressed('confirm') || I.pressed('start')) || game.input.clicked();
    if (MU.t > 7 || (skip && MU.t > .5)) { game.players.forEach(I => I.consumeAll()); const cfg = MU.cfg; cfg.starred = Object.keys(cfg.cheats).some(k => k !== 'tournament'); go('match', cfg); }
    if (game.players.some(I => I.pressed('cancel'))) this.onBack();
  },
  draw(r) {
    const cfg = MU.cfg, court = get('court', cfg.court);
    backdropOf(cfg.court).draw(r); game.focus(XM, 0, 0); L.enabled = false;
    r.overlay(g => {
      const sf = safe(r);
      E.font.title(g, "TONIGHT'S MATCHUP", r.W / 2, sf.y, { scale: 2, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      txt(g, court.name + '  -  ' + court.place.toUpperCase(), r.W / 2, sf.y + 22, UI.ink, 1, 'center');
      cfg.teams.forEach((t, side) => {
        const tm = get('team', t.id), x = side ? r.W / 2 + 14 : r.W / 2 - 14, al = side ? 'left' : 'right', slide = Math.min(1, MU.t * 3), ox = (1 - slide) * (side ? 200 : -200);
        txt(g, tm.name, x + ox, sf.y + 40, tm.jersey, 1, al);
        t.starters.forEach((id, k) => { const p = get('player', id), px1 = side ? x + ox : x + ox - 60, py = sf.y + 54 + k * 66; npcRig(id).drawPortrait(g, Math.round(px1), py, 60, { turn: side ? -.5 : .5 }); txt(g, p.name, side ? px1 + 64 : px1 - 4, py + 8, '#ffffff', 1, side ? 'left' : 'right'); txt(g, p.role, side ? px1 + 64 : px1 - 4, py + 18, UI.dim, 1, side ? 'left' : 'right'); const h = cfg.humans.find(hh => hh.slot === side * 2 + k); if (h) txt(g, h.input.name, side ? px1 + 64 : px1 - 4, py + 28, h.input.color, 1, side ? 'left' : 'right'); });
      });
      E.font.title(g, 'VS', r.W / 2, sf.y + 90, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff3a1a'], depth: 2, align: 'center' });
      MU.codes.forEach((c, i) => txt(g, c + ': ON', r.W / 2, sf.y + 130 + i * 10, UI.good, 1, 'center'));
      if (cfg.stopLabel) txt(g, cfg.stopLabel, r.W / 2, sf.y + 32, UI.gold, 1, 'center');
      txt(g, 'TIP-OFF IN ' + Math.max(0, Math.ceil(7 - MU.t)), r.W / 2, r.H - 34, UI.dim, 1, 'center');
      promptBar(g, r, '{confirm} TIP IT OFF   ENTER CODES NOW...');
    });
  }
});

/* ---- RESULTS ---- */
const RS = { page: 0, list: null, initials: null };
function mvpOf() { return S.players.slice().sort((a, b) => (b.stats.PTS + b.stats.BLK * 2 + b.stats.STL * 2 + b.stats.DNK) - (a.stats.PTS + a.stats.BLK * 2 + a.stats.STL * 2 + a.stats.DNK))[0]; }
SCENES.results = menuScene({
  enter(d) {
    S.scene = 'results'; RS.page = 0; const m = S.match, cfg = (d && d.cfg) || m.cfg; RS.cfg = cfg;
    const humanTeam = (cfg.humans[0] && Math.floor(cfg.humans[0].slot / 2)), won = m.winner === humanTeam;
    sting(won || humanTeam === undefined ? 'victory' : 'defeat'); music('menu');
    const items = [];
    if (cfg.mode === 'tour') items.push({ label: won ? 'CONTINUE' : 'REMATCH', onPick: () => tourAfterMatch(won) });
    else { items.push({ label: 'REMATCH', onPick: () => go('matchup', { cfg: Object.assign({}, cfg, { seed: undefined, cheats: {} }) }) }); items.push({ label: 'NEW TEAMS', onPick: () => { S.setup.humans = cfg.humans.map(h => ({ input: h.input, side: Math.floor(h.slot / 2) })); go('teams'); } }); }
    if (cfg.mode === 'tour' && !won) items.push({ label: 'QUIT TOUR', onPick: () => tourQuit() });
    items.push({ label: 'MAIN MENU', onPick: () => go('menu') });
    RS.list = new FocusList(items, { horizontal: true, onBack: () => {} });
    recordGame(m, cfg);
  },
  update(dt) {
    if (RS.initials) return initialsStep();
    for (const I of game.players) if (I.pressed('oop')) { RS.page = 1 - RS.page; A.sfx('select'); }
    RS.list.update(dt);
  },
  draw(r) {
    menuBackdrop(r, game.time);
    const m = S.match;
    r.overlay(g => {
      const sf = safe(r), mvp = mvpOf();
      E.font.title(g, 'FINAL', r.W / 2, sf.y, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      txt(g, teamName(0) + '  ' + m.score[0] + '   -   ' + m.score[1] + '  ' + teamName(1), r.W / 2, sf.y + 30, '#ffffff', 2, 'center');
      if (RS.cfg.starred) txt(g, '★ CHEATS USED: NO HALL OF BLAM', r.W / 2, sf.y + 48, UI.gold, 1, 'center');
      if (RS.page === 0) {
        npcRig(mvp.id).drawPortrait(g, Math.round(r.W / 2 - 110), sf.y + 60, 56);
        txt(g, 'MVP: ' + mvp.name, r.W / 2 - 46, sf.y + 64, UI.gold, 2);
        txt(g, mvp.stats.PTS + ' PTS  ' + mvp.stats.DNK + ' DUNKS  ' + mvp.stats.BLK + ' BLK  ' + mvp.stats.STL + ' STL', r.W / 2 - 46, sf.y + 84, '#ffffff', 1);
        const best = m.plays.slice().sort((a, b) => b.v - a.v)[0];
        txt(g, 'BLAM OF THE GAME: ' + (best ? best.name + ' - ' + best.what.toUpperCase() + ' (' + best.v + ')' : 'NOBODY. AWKWARD.'), r.W / 2, sf.y + 126, UI.accent2, 1, 'center');
        txt(g, 'STYLE POINTS  ' + m.style[0] + '  -  ' + m.style[1], r.W / 2, sf.y + 140, UI.dim, 1, 'center');
      } else {
        const cols = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'DNK'], x0 = Math.round(r.W / 2 - 140);
        cols.forEach((c, k) => txt(g, c, x0 + 120 + k * 28, sf.y + 60, UI.gold, 1, 'center'));
        S.players.forEach((p, i) => { const y = sf.y + 74 + i * 14; txt(g, p.name, x0, y, p.team ? UI.accent2 : UI.accent, 1); cols.forEach((c, k) => txt(g, p.stats[c], x0 + 120 + k * 28, y, '#ffffff', 1, 'center')); });
      }
      const w = Math.min(110, (sf.w - 20) / RS.list.items.length); RS.list.draw(g, Math.round(r.W / 2 - (w + 4) * RS.list.items.length / 2), r.H - 56, w, 20, { scale: 1, center: true });
      if (RS.initials) drawInitials(g, r);
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {oop} BOX SCORE');
    });
  }
});
/** records and the Hall of Blam entry */
function recordGame(m, cfg) {
  const prog = S.progress, rec = prog.records;
  for (const p of S.players) if (p.human && p.stats.PTS > (rec.mostPoints || 0) && !cfg.starred) { rec.mostPoints = p.stats.PTS; rec.mostPointsBy = p.name; }
  const best = m.plays.filter(x => x.what === 'dunk' || x.what === 'shatter' || x.what === 'alley-oop').sort((a, b) => b.v - a.v)[0];
  if (best && best.v > (rec.bestDunk || 0) && !cfg.starred) { rec.bestDunk = best.v; rec.bestDunkBy = best.name; }
  saveProgress();
}
const hallList = () => store.get('bb:hall', [{ i: 'VNX', team: 'ALL-STARS', score: 9000 }, { i: 'DDD', team: 'ALL-STARS', score: 7000 }, { i: 'GGW', team: 'BLAMBOTS', score: 5000 }, { i: 'RSC', team: 'HIGHTOPS', score: 3000 }, { i: 'BLM', team: 'MAGMA', score: 1500 }]);
function qualifies(score) { const l = hallList(); return l.length < 10 || score > l[l.length - 1].score; }
function startInitials(score, team, onDone) { RS.initials = { score, team, letters: [0, 0, 0], k: 0, onDone }; }
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ★';
function initialsStep() {
  const S0 = RS.initials;
  for (const I of game.players) {
    if (I.repeat('up', .3, .1)) { S0.letters[S0.k] = (S0.letters[S0.k] + 1) % ABC.length; A.sfx('select'); }
    if (I.repeat('down', .3, .1)) { S0.letters[S0.k] = (S0.letters[S0.k] + ABC.length - 1) % ABC.length; A.sfx('select'); }
    if (I.pressed('left')) S0.k = Math.max(0, S0.k - 1); if (I.pressed('right')) S0.k = Math.min(2, S0.k + 1);
    if (I.pressed('confirm')) { if (S0.k < 2) { S0.k++; A.sfx('confirm'); } else { const l = hallList(); l.push({ i: S0.letters.map(k => ABC[k]).join(''), team: S0.team, score: S0.score }); l.sort((a, b) => b.score - a.score); store.set('bb:hall', l.slice(0, 10)); RS.initials = null; A.sfx('code_ok'); if (S0.onDone) S0.onDone(); emit('hallEntry', {}); } }
  }
}
function drawInitials(g, r) {
  const S0 = RS.initials, w = 220, h = 90, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
  panel(g, x, y, w, h, 'NEW HALL OF BLAM SCORE!');
  txt(g, String(S0.score), r.W / 2, y + 24, '#ffffff', 2, 'center');
  S0.letters.forEach((k, i) => { const lx = r.W / 2 + (i - 1) * 26; txt(g, ABC[k], lx, y + 48, i === S0.k ? UI.gold : '#ffffff', 3, 'center'); if (i === S0.k) txt(g, '↑', lx, y + 72, UI.gold, 1, 'center'); });
  promptLine(g, '{move} LETTERS   {confirm} NEXT', r.W / 2, y + h + 6, game.input, { align: 'center' });
}

/* ---- HALL OF BLAM ---- */
SCENES.hall = menuScene({
  enter() { S.scene = 'hall'; idleReset(); music('menu'); },
  onBack() { go('menu'); },
  update() { if (game.players.some(I => I.pressed('cancel') || I.pressed('confirm')) || game.input.clicked()) { A.sfx('cancel'); go('menu'); } },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => drawHall(g, r));
    r.overlay(g => promptBar(g, r, '{cancel} BACK'));
  }
});
function drawHall(g, r) {
  const sf = safe(r), l = hallList(), rec = S.progress.records;
  E.font.title(g, 'HALL OF BLAM', r.W / 2, sf.y, { scale: 3, colors: ['#fff6c0', '#ffd23a', '#c88a10'], depth: 2, align: 'center' });
  l.slice(0, 10).forEach((e, k) => { const y = sf.y + 34 + k * 13; txt(g, (k + 1) + '.', r.W / 2 - 110, y, UI.dim, 1, 'right'); txt(g, e.i, r.W / 2 - 100, y, k ? '#ffffff' : UI.gold, 1); txt(g, e.team, r.W / 2 - 60, y, UI.dim, 1); txt(g, e.score, r.W / 2 + 110, y, '#ffffff', 1, 'right'); });
  const y = sf.y + 34 + 10 * 13 + 6;
  txt(g, 'MOST POINTS IN A GAME: ' + (rec.mostPoints ? rec.mostPoints + ' (' + rec.mostPointsBy + ')' : '--'), r.W / 2, y, UI.accent2, 1, 'center');
  txt(g, 'BEST DUNK: ' + (rec.bestDunk ? rec.bestDunk + ' STYLE (' + rec.bestDunkBy + ')' : '--') + '   TOURS WON: ' + (rec.toursWon || 0), r.W / 2, y + 11, UI.accent2, 1, 'center');
}

/* ---- HOW TO PLAY (3 pages, following the last device) ---- */
const HT = { page: 0, back: 'menu' };
SCENES.howto = menuScene({
  enter(d) { S.scene = 'howto'; HT.page = 0; HT.back = (d && d.back) || 'menu'; idleReset(); },
  onBack() { leaveHowto(); },
  update() {
    for (const I of game.players) { if (I.pressed('right') || I.pressed('confirm')) { if (HT.page < 2) { HT.page++; A.sfx('select'); } else if (I.pressed('confirm')) leaveHowto(); } if (I.pressed('left')) { HT.page = Math.max(0, HT.page - 1); A.sfx('select'); } if (I.pressed('cancel')) leaveHowto(); }
    const cl = game.input.clicked(); if (cl) { if (cl[0] > game.W / 2) { if (HT.page < 2) HT.page++; else leaveHowto(); } else HT.page = Math.max(0, HT.page - 1); }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), I = game.input;
      txt(g, ['THE CONTROLS', 'THE RULES', 'COURTS AND POWER-UPS'][HT.page] + '  (' + (HT.page + 1) + '/3)', r.W / 2, sf.y, UI.gold, 2, 'center');
      if (HT.page === 0) {
        const rows = [['move', 'RUN (DRIBBLES WITH THE BALL)'], ['turbo', 'TURBO: FASTER, HIGHER. NEEDED TO DUNK'], ['shoot', 'HOLD TO JUMP, RELEASE AT THE TOP TO SHOOT'], ['shoot', 'WITH TURBO NEAR THE RIM: DUNK!   ON DEFENSE: BLOCK'], ['pass', 'PASS   ON DEFENSE: STEAL'], ['shove', 'SPIN MOVE   ON DEFENSE: SHOVE (IT\'S LEGAL!)'], ['oop', 'ALLEY-OOP TO A CUTTING TEAMMATE / CALL FOR IT'], ['taunt', 'TAUNT'], ['pause', 'PAUSE (DEV MODE IS IN THERE)']];
        rows.forEach(([a, t2], k) => { const y = sf.y + 26 + k * 19; actionGlyph(g, a, r.W / 2 - 150, y - 2, I, 1); txt(g, t2, r.W / 2 - 110, y, '#ffffff', 1); });
        txt(g, 'A CPU TEAMMATE WITH THE BALL: {pass} = PASS IT TO ME, {shoot} = SHOOT, {oop} = THROW THE OOP'.replace(/\{[a-z]+\}/g, ''), r.W / 2, sf.y + 26 + 9 * 19, UI.dim, 1, 'center');
      } else if (HT.page === 1) {
        ['2 ON 2, FULL COURT, FOUR QUARTERS.', 'NO FOULS. SHOVES, STEALS AND BODY CONTACT ARE LEGAL.', 'NO TRAVELING, NO BACKCOURT, NO OUT OF BOUNDS: THE CROWD THROWS IT BACK.', 'TWO POINTS, THREE FROM BEYOND THE ARC. DUNKS ARE TWO.', '20-SECOND SHOT CLOCK. IT RESETS WHEN A SHOT HITS THE RIM.', 'GOALTENDING (TOUCHING A SHOT ON ITS WAY DOWN) COUNTS FOR THE SHOOTER.', 'RELEASE AT THE TOP OF THE JUMP FOR A PERFECT SHOT.', 'SCORE THREE IN A ROW: SUPERNOVA! UNLIMITED TURBO, HOT SHOTS,', 'BIGGER DUNKS, AND THE GLASS MAY SHATTER.', 'TIED AFTER FOUR? OVERTIME. TWICE TIED? SUDDEN BLAM: NEXT BUCKET WINS.']
          .forEach((ln, k) => txt(g, ln, r.W / 2, sf.y + 28 + k * 14, k === 7 || k === 8 ? UI.gold : '#ffffff', 1, 'center'));
      } else {
        COURTS.forEach((id, k) => { const c = get('court', id); txt(g, c.name + ': ' + { jackpot: 'THE JACKPOT SPOT (+2 FOR A MADE JUMPER IN THE RING)', wind: 'SEA BREEZE (GUSTS BEND SHOTS)', oil: 'OIL SLICKS (SLIDE AND SLIP)', eruption: 'LAVA BOMBS AND STEAM VENTS (VOLCANO LAUNCH!)', boss: 'THE BLAMBOTS OVERCLOCK. KNOCK ONE DOWN TWICE: REBOOT' }[c.twist], sf.x + 6, sf.y + 28 + k * 12, '#ffffff', 1); });
        POWERUPS.forEach((id, k) => { const d = get('powerup', id), y = sf.y + 96 + k * 14; puIcon(g, id, sf.x + 14, y + 3); txt(g, d.name + ': ' + d.help.toUpperCase(), sf.x + 26, y, '#ffffff', 1); });
      }
      promptBar(g, r, '{move} PAGE   {confirm} NEXT   {cancel} BACK');
    });
  }
});
function leaveHowto() { A.sfx('cancel'); go(HT.back || 'menu'); }
/** How to Play inside the pause menu (the engine's help screen): the keys or buttons of the device used last */
function helpSpec() {
  const I = game.input, L0 = a => I.label(a) || a;
  return { title: 'How to Play', keys: [[I.lastDevice === 'gamepad' ? 'Left stick' : 'WASD', 'Run (dribble with the ball)'], [L0('turbo'), 'Turbo: faster, higher; needed to dunk'], [L0('shoot'), 'Hold to jump, release at the top to shoot. With turbo near the rim: DUNK. On defense: block'],
    [L0('pass'), 'Pass. On defense: steal'], [L0('shove'), 'Spin move. On defense: shove (legal!)'], [L0('oop'), 'Alley-oop to a cutting teammate, or call for it'], [L0('taunt'), 'Taunt']],
    sections: [['Rules', 'No fouls. 2 or 3 points; dunks 2. 20-second shot clock. Goaltending counts for the shooter. Three straight baskets: SUPERNOVA.']] };
}

/* ---- ABOUT / CREDITS (one topic a page) ---- */
const AB = { page: 0, scroll: 0 };
function aboutPages() {
  const pages = [['CREDITS', CREDITS.map(([a, b]) => a + ': ' + b)]];
  for (const [title, lines] of REPORT) pages.push([title, lines]);
  if ((S.progress.unlocked && S.progress.unlocked.secrets) || DEV.unlockAll) pages.push(['SECRETS', ['CHEAT CODES (ENTER ON THE MATCHUP CARD):', ...all('code').map(c => c.name + ': ' + c.steps.map(s => s.toUpperCase()).join(', '))]]);
  return pages;
}
SCENES.about = menuScene({
  enter(d) { S.scene = 'about'; AB.page = (d && d.page) || 0; AB.scroll = 0; idleReset(); },
  onBack() { go('menu'); },
  update(dt) {
    const n = aboutPages().length;
    for (const I of game.players) {
      if (I.pressed('right') || I.pressed('oop')) { AB.page = (AB.page + 1) % n; AB.scroll = 0; A.sfx('select'); }
      if (I.pressed('left')) { AB.page = (AB.page + n - 1) % n; AB.scroll = 0; A.sfx('select'); }
      if (I.down('down')) AB.scroll += dt * 60; if (I.down('up')) AB.scroll = Math.max(0, AB.scroll - dt * 60);
      if (I.pressed('cancel')) { A.sfx('cancel'); go('menu'); }
    }
    const cl = game.input.clicked(); if (cl) { AB.page = (AB.page + (cl[0] > game.W / 2 ? 1 : n - 1)) % n; AB.scroll = 0; }
  },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), pages = aboutPages(), [title, lines] = pages[AB.page % pages.length];
      txt(g, title + '  (' + (AB.page % pages.length + 1) + '/' + pages.length + ')', r.W / 2, sf.y, UI.gold, 2, 'center');
      panel(g, sf.x, sf.y + 20, sf.w, sf.h - 44);
      const out = []; for (const ln of lines) for (const w of E.font.wrap(ln, sf.w - 24, {})) out.push(w);
      const maxRows = Math.floor((sf.h - 56) / 10), off = Math.min(Math.floor(AB.scroll / 10), Math.max(0, out.length - maxRows));
      out.slice(off, off + maxRows).forEach((ln, i) => txt(g, ln, sf.x + 12, sf.y + 28 + i * 10, '#ffffff', 1, 'left', { outline: false }));
      if (out.length > maxRows) txt(g, '↓ MORE', sf.x + sf.w - 10, sf.y + sf.h - 34, UI.dim, 1, 'right');
      promptBar(g, r, '{move} PAGE / SCROLL   {cancel} BACK');
    });
  }
});

/* ---- 44-tour.js ---- */
/* THE BLAM TOUR, STORY BEATS AND BLAM CAMP. The Tour: pick a crew, the prologue, three stops at the other crews' courts,
 * the reveal, the final against the BLAMBOTS at the Blam Dome, the ending, credits, unlocks and the Hall of Blam. Story
 * beats are E.Dialog lines with live portraits and gibberish voices on a staged set. Camp: ten lessons, each a few goals
 * checked by match events. */
function loadProgress() {
  const d = { tour: null, unlocked: {}, camp: [], records: {}, seenCamp: false };
  S.progress = Object.assign(d, store.get('bb:progress', {}));
  S.progress.records = S.progress.records || {}; S.progress.unlocked = S.progress.unlocked || {}; S.progress.camp = S.progress.camp || [];
}
function saveProgress() { store.set('bb:progress', S.progress); }
const tourStops = team => STREET_TEAMS.filter(t => t !== team).map(t => ({ opp: t, court: get('team', t).court })).concat([{ opp: 'blambots', court: 'dome', boss: true }]);
const TOUR_DIFF = ['rookie', 'pro', 'allstar', 'blam'];
function stopDiff(stop) { const k = Math.max(0, TOUR_DIFF.indexOf(setting('difficulty'))), shift = [-1, 0, 1, 1][stop]; return TOUR_DIFF[clamp(k + shift, 0, 3)]; }

/* ---- the Tour's start: continue or new; P2 may join the same crew ---- */
const TSTART = { list: null };
SCENES.tourstart = menuScene({
  enter() {
    S.scene = 'tourstart'; idleReset(); music('tourmap');
    while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
    game.allowJoin({ max: 2, onJoin: (I) => { I.glyphs = setting('symbols'); A.sfx('confirm'); } });
    const t = S.progress.tour, items = [];
    if (t && t.team && t.stop < 4) items.push({ label: 'CONTINUE TOUR', value: 'STOP ' + (t.stop + 1), onPick: () => go('tourmap') });
    items.push({ label: 'NEW TOUR', onPick: () => { S.setup = { mode: 'tour', humans: game.players.map(I => ({ input: I, side: 0 })), teams: ['hightops', 'breakers'], pick: [0, 0] }; go('teams'); } });
    items.push({ label: 'BACK', onPick: () => go('menu') });
    TSTART.list = new FocusList(items, { onBack: () => go('menu') });
  },
  exit() { game.allowJoin(false); },
  onBack() { go('menu'); },
  update(dt) { TSTART.list.update(dt); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r); E.font.title(g, 'THE BLAM TOUR', r.W / 2, sf.y, { scale: 3, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 2, align: 'center' });
      TSTART.list.draw(g, Math.round(r.W / 2 - 110), sf.y + 40, 220, 24, { scale: 2 });
      txt(g, game.players.length > 1 ? 'P2 JOINED: YOU PLAY TOGETHER ON ONE CREW' : 'A FRIEND? P2 PRESS START (PAD) OR 2 (KEYBOARD) TO JOIN YOUR CREW', r.W / 2, sf.y + 130, UI.dim, 1, 'center');
      promptBar(g, r, '{move} CHOOSE   {confirm} SELECT   {cancel} BACK');
    });
  }
});
function tourBegin() {
  const st = S.setup, team = st.teams[0];
  S.progress.tour = { team, pick: st.pick[0], stop: 0, score: 0, cheats: false, two: st.humans.length > 1 };
  S.tourHumans = st.humans.map(h => h.input);
  saveProgress();
  playBeat('prologue', () => { if (!S.progress.seenCamp) { S.progress.seenCamp = true; saveProgress(); playBeat('campOffer', () => go('tourmap'), { onChoice: i => { if (i === 1) { S.campFromTour = true; go('camplist'); return true; } return false; } }); } else go('tourmap'); });
}
function tourCfg() {
  const t = S.progress.tour, stops = tourStops(t.team), s = stops[t.stop], tm = get('team', t.team), humans = (S.tourHumans && S.tourHumans.length ? S.tourHumans : [game.input]);
  const first = tm.players[t.pick || 0], starters = [first, ...tm.players.filter(x => x !== first)].slice(0, 2);
  return { court: s.court, mode: 'tour', teams: [{ id: t.team, lineup: tm.players.slice(), starters }, { id: s.opp }], humans: humans.slice(0, 2).map((I, k) => ({ input: I, slot: k })),
    quarter: 90, difficulty: stopDiff(t.stop), powerups: t.stop > 0, twists: true, boss: !!s.boss, stopLabel: s.boss ? 'THE FINAL' : 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR' };
}
function tourPlayStop() {
  const t = S.progress.tour, stops = tourStops(t.team), s = stops[t.stop], vars = tourVars();
  const intro = { stage: s.court, lines: [['vinnie', 'STOP ' + (t.stop + 1) + ' OF THE BLAM TOUR: ' + get('team', t.team).short + ' VERSUS ' + get('team', s.opp).short + ' AT ' + get('court', s.court).name + '!'], ['deedee', COURT_LINES[s.court]]] };
  if (s.boss) { playBeat('finalPre', () => go('matchup', { cfg: tourCfg() })); return; }
  const rv = RIVAL[s.opp], cap = get('team', t.team).players[t.pick || 0];
  intro.lines.push([rv[0], rv[1]], [cap, rv[2][t.team] || "Let's play."]);
  playBeat(intro, () => go('matchup', { cfg: tourCfg() }));
}
function tourVars() { const t = S.progress.tour; return t ? { team: get('team', t.team).short, captain: get('player', get('team', t.team).players[t.pick || 0]).name, reply: REVEAL_REPLY[t.team] } : {}; }
function tourAfterMatch(won) {
  const t = S.progress.tour, m = S.match, stops = tourStops(t.team), s = stops[t.stop];
  if (!won) { playBeat(s.boss ? 'lossFinal' : 'lossStop', () => go('matchup', { cfg: tourCfg() })); return; }
  t.score += m.style[0]; if (m.cfg.starred) t.cheats = true;
  t.stop++; saveProgress(); emit('tourStop', { stop: t.stop });
  if (s.boss) return tourWon();
  const next = () => go('tourmap');
  if (t.stop === 1) { const b = BEATEN[s.opp]; playBeat({ stage: 'studio', lines: [b, ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']] }, next); }
  else if (t.stop === 2) playBeat('post2', next);
  else if (t.stop === 3) playBeat('reveal', next);
  else next();
}
function tourWon() {
  const t = S.progress.tour, rec = S.progress.records;
  rec.toursWon = (rec.toursWon || 0) + 1; S.progress.unlocked = Object.assign(S.progress.unlocked, { teams: true, bigHeads: true, secrets: true }); saveProgress();
  playBeat('ending', () => go('credits', { then: () => { const score = t.score; const done = () => { S.progress.tour = null; saveProgress(); go('hall'); }; if (!t.cheats && qualifies(score)) { go('results', { cfg: S.match.cfg }); startInitials(score, get('team', t.team).short, done); } else done(); } }));
}
function tourQuit() {
  const t = S.progress.tour; if (t && t.score > 0 && !t.cheats && qualifies(t.score)) { startInitials(t.score, get('team', t.team).short, () => { S.progress.tour = null; saveProgress(); go('menu'); }); return; }
  S.progress.tour = null; saveProgress(); go('menu');
}

/* ---- the tour map: a painted map with stop medallions (mouse hover and click) ---- */
const TM = { i: 0, boxes: [] };
const MAP_SPOTS = { skybox: [.22, .38], pier: [.15, .72], scrapyard: [.48, .55], caldera: [.82, .78], dome: [.68, .25] };
SCENES.tourmap = menuScene({
  enter() { S.scene = 'tourmap'; idleReset(); music('tourmap'); TM.i = S.progress.tour ? S.progress.tour.stop : 0; },
  onBack() { go('menu'); },
  update(dt) {
    const t = S.progress.tour; if (!t) return go('menu');
    for (const I of game.players) { if (I.pressed('confirm') || I.pressed('start')) { A.sfx('confirm'); return tourPlayStop(); } if (I.pressed('cancel')) { A.sfx('cancel'); return go('menu'); } }
    const cl = game.input.clicked(); if (cl) for (const b of TM.boxes) if (hitBox(cl, b.box) && b.k === t.stop) { A.sfx('confirm'); return tourPlayStop(); }
    const ptr = game.input.pointer(); TM.hover = -1; if (ptr) for (const b of TM.boxes) if (hitBox(ptr, b.box)) TM.hover = b.k;
  },
  draw(r) {
    const t = S.progress.tour; if (!t) return;
    r.sky(['#1a3a6a', '#2a6a9a', '#3a8ab0']); game.focus(0, 0, 0); L.enabled = false;
    r.overlay(g => {
      const sf = safe(r), mx = sf.x, my = sf.y + 20, mw = sf.w, mh = sf.h - 60;
      // the land: coast, hills, the island, the city skyline
      px.poly(g, [[mx, my + mh * .2], [mx + mw * .6, my], [mx + mw * .75, my + mh * .1], [mx + mw * .7, my + mh * .6], [mx + mw * .45, my + mh * .85], [mx + mw * .1, my + mh * .9], [mx, my + mh * .6]], '#4a8a4a');
      px.poly(g, [[mx + mw * .05, my + mh * .25], [mx + mw * .55, my + mh * .08], [mx + mw * .65, my + mh * .5], [mx + mw * .4, my + mh * .75], [mx + mw * .12, my + mh * .7]], '#6aaa5a');
      px.disc(g, mx + mw * .84, my + mh * .76, mh * .14, '#5a3a2a'); px.poly(g, [[mx + mw * .79, my + mh * .8], [mx + mw * .84, my + mh * .58], [mx + mw * .89, my + mh * .8]], '#3a2018'); px.disc(g, mx + mw * .84, my + mh * .6, 3, '#ff5a1a');
      for (let k = 0; k < 7; k++) px.rect(g, mx + mw * (.16 + k * .025), my + mh * (.3 - (k % 3) * .04), mw * .02, mh * (.1 + (k % 3) * .04), '#3a3a5a');
      const stops = tourStops(t.team), order = stops.map(s => s.court);
      let prev = null; TM.boxes = [];
      order.forEach((c, k) => {
        const [u, v] = MAP_SPOTS[c], x = Math.round(mx + mw * u), y = Math.round(my + mh * v);
        if (prev) for (let q = 0; q <= 10; q++) if (q % 2 === 0) px.rect(g, Math.round(lerp(prev[0], x, q / 10)), Math.round(lerp(prev[1], y, q / 10)), 2, 2, '#ffffff');
        prev = [x, y];
        const won = k < t.stop, next = k === t.stop, R = next ? 11 + Math.sin(game.time * 6) * 2 : 10;
        px.disc(g, x, y, R + 2, '#0a0612'); px.disc(g, x, y, R, won ? UI.gold : next ? UI.accent : '#5a5070');
        txt(g, k < 3 ? String(k + 1) : 'F', x, y - 4, '#ffffff', 1, 'center');
        if (won) txt(g, 'W', x + 10, y - 14, UI.good, 2);
        txt(g, get('court', c).name.replace('THE ', ''), x, y + 13, next || TM.hover === k ? '#ffffff' : UI.dim, 1, 'center');
        TM.boxes.push({ box: [x - 14, y - 14, 28, 28], k });
      });
      // the side panel
      const s = stops[t.stop], tm = get('team', t.team);
      const py0 = sf.y + sf.h - 96; panel(g, sf.x + sf.w - 150, py0, 150, 70, null);
      txt(g, tm.short, sf.x + sf.w - 75, py0 + 6, tm.jersey, 1, 'center');
      txt(g, 'TOUR SCORE ' + t.score, sf.x + sf.w - 75, py0 + 18, '#ffffff', 1, 'center');
      txt(g, 'RECORD ' + t.stop + '-0', sf.x + sf.w - 75, py0 + 30, UI.dim, 1, 'center');
      if (s) { txt(g, 'NEXT: ' + get('team', s.opp).short, sf.x + sf.w - 75, py0 + 44, UI.gold, 1, 'center'); txt(g, get('court', s.court).name, sf.x + sf.w - 75, py0 + 55, UI.dim, 1, 'center'); }
      E.font.title(g, 'THE BLAM TOUR', sf.x, sf.y - 4, { scale: 2, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 1 });
      promptBar(g, r, '{confirm} PLAY THE NEXT STOP   {cancel} MAIN MENU');
    });
  }
});

/* ---- story beats: a staged set, then Dialog lines with portraits and voices ---- */
const STORY = { beat: null, i: 0, talk: null, done: null, hold: 0, cast: [] };
function playBeat(beat, done, o = {}) { const b = typeof beat === 'string' ? Object.assign({ id: beat }, BEATS[beat]) : beat; go('story', { beat: b, done, o }); }
function skipStory() { if (S.scene === 'story' && STORY.done) { const d = STORY.done; STORY.done = null; d(); } }
SCENES.story = menuScene({
  pausable: true,
  enter(d) {
    S.scene = 'story'; STORY.beat = d.beat; STORY.done = d.done; STORY.o = d.o || {}; STORY.i = -1; STORY.hold = 0; STORY.t = 0;
    STORY.talk = new E.Dialog(game, { lines: 3, place: 'bottom', border: UI.accent, bg: ['#2a1a48', '#140c24'] });
    if (d.beat.music) music(d.beat.music); else music('story');
    if (d.beat.villain) game.after(.5, () => layer('villain', 1));
    STORY.cast = [...new Set(d.beat.lines.map(l => l[0]))].map(id => id === '{CAPTAIN}' ? captainId() : id);
    emit('beat', { beat: d.beat.id || 'stop' });
    nextLine();
  },
  update(dt) {
    STORY.t += dt;
    if (game.players.some(I => I.down('confirm'))) { STORY.hold += dt; if (STORY.hold > 1) { STORY.hold = 0; game.players.forEach(I => I.consumeAll()); return skipStory(); } } else STORY.hold = 0;
    if (game.players.some(I => I.pressed('start'))) { game.players.forEach(I => I.consumeAll()); return skipStory(); }
    if (STORY.talk.update(dt)) return;
  },
  draw(r) {
    const b = STORY.beat, t = STORY.t, stage = b.stage;
    game.focus(0, 0, 0);
    if (stage === 'studio') { r.sky(['#0a0820', '#1a1040', '#2a1850']); }
    else backdropOf(get('court', stage) ? stage : 'dome').draw(r);
    L.enabled = false;
    r.overlay(g => {
      if (stage !== 'studio') { const c = get('court', stage) || get('court', 'dome'), fy = Math.round(r.H * .6); px.rect(g, 0, fy, r.W, r.H - fy, 'rgb(' + c.base.map(v => Math.round(v * .7)).join(',') + ')'); px.rect(g, 0, fy, r.W, 2, c.line); for (let k = 0; k < 8; k++) px.rect(g, 0, fy + 8 + k * 14, r.W, 1, 'rgb(' + c.base.map(v => Math.round(v * .55)).join(',') + ')'); }
      if (stage === 'studio') {   // the Channel BLAM studio desk; the monitor shows the Commissioner
        const dy = Math.round(r.H * .62); px.rect(g, 0, dy, r.W, r.H - dy, '#1a1230'); E.ui.box(g, Math.round(r.W * .2), dy - 20, Math.round(r.W * .6), 34, { bg: ['#3a2a6a', '#1a1230'], border: UI.gold });
        txt(g, 'CHANNEL BLAM', r.W / 2, dy - 12, UI.gold, 2, 'center');
        const mx = Math.round(r.W * .72), my = Math.round(r.H * .14); E.ui.box(g, mx - 34, my, 68, 54, { bg: '#0a0a14', border: '#6a6a8a' }); npcRig('gigawatt').drawPortrait(g, mx - 24, my + 5, 44, { bg: '#2a1a3a' });
      }
      const cast = STORY.cast.filter(id => id !== 'gigawatt' || stage !== 'studio'), sp = Math.min(70, r.W / (cast.length + 1));
      cast.forEach((id, k) => { const rg = npcRig(id), x = Math.round(r.W / 2 + (k - (cast.length - 1) / 2) * sp), y = Math.round(r.H * (stage === 'studio' ? .6 : .66)); const cur = STORY.cur === id; rg.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: cur ? 'shout' : null, pose: cur && Math.floor(t * 2) % 2 ? 'cheer' : null }); rg.bb.targets = null; rg.draw(g, x, y, E.charView(E.VIEWS.side)); if (cur) txt(g, '↓', x, y - 70, UI.gold, 1, 'center'); });
      promptLine(g, 'HOLD {confirm} SKIP', r.W - 8, 8, game.input, { align: 'right', color: UI.dim });
    });
    STORY.talk.draw(r);
  }
});
const captainId = () => { const t = S.progress.tour; return t ? get('team', t.team).players[t.pick || 0] : 'volt'; };
function nextLine() {
  const b = STORY.beat; STORY.i++;
  if (STORY.i >= b.lines.length) {
    if (b.choices) { STORY.talk.say([fill(b.lines[b.lines.length - 1][1], tourVars())], { name: 'DEE DEE DECIBEL', portrait: npcRig('deedee'), choices: b.choices, onChoice: i => { if (STORY.o.onChoice && STORY.o.onChoice(i)) return; skipStory(); } }); STORY.i = 999; return; }
    return skipStory();
  }
  if (STORY.i >= b.lines.length) return;
  let [who, line] = b.lines[STORY.i]; if (who === '{CAPTAIN}') who = captainId();
  if (b.choices && STORY.i === b.lines.length - 1) { STORY.i++; return nextLine(); }
  const rig = npcRig(who), prof = voiceOf(who), name = (get('npc', who) || get('player', who) || { name: who }).name;
  STORY.cur = who; STORY.talk.voice = ch => Voice.letter(ch, prof);
  STORY.talk.say([fill(line, tourVars())], { name, portrait: rig, onDone: () => nextLine() });
}

/* ---- credits: a scroll over confetti, then the unlock cards ---- */
const CR = { t: 0, then: null };
SCENES.credits = menuScene({
  enter(d) { S.scene = 'credits'; CR.t = 0; CR.then = d && d.then; music('credits'); sting('unlock'); },
  update(dt) { CR.t += dt; if (S.fxRng() < .5) P.add({ kind: 'bit', x: S.fxRng() * game.W, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1 }); if ((CR.t > 26 || (CR.t > 2 && game.players.some(I => I.pressed('confirm') || I.pressed('start')))) && CR.then) { const f = CR.then; CR.then = null; f(); } },
  draw(r) {
    menuBackdrop(r, CR.t);
    r.overlay(g => {
      for (let k = 0; k < 60; k++) { const x = (k * 53 + CR.t * 30 * (k % 3 + 1)) % r.W, y = (k * 37 + CR.t * 40 * (k % 4 + 1)) % r.H; px.rect(g, Math.round(x), Math.round(y), 2, 3, ['#ff3ca6', '#ffd23a', '#2de2ff', '#5aff8a'][k % 4]); }
      let y = r.H - CR.t * 22;
      for (const [a, b] of CREDITS) { txt(g, a, r.W / 2, Math.round(y), UI.gold, 2, 'center'); E.font.wrap(b, r.W - 60, {}).forEach((ln, i) => txt(g, ln, r.W / 2, Math.round(y + 18 + i * 10), '#ffffff', 1, 'center')); y += 50; }
      ['UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN'].forEach((u, i) => { if (CR.t > 14 + i * 2) txt(g, u, r.W / 2, r.H * .3 + i * 14, UI.good, 1, 'center'); });
      promptBar(g, r, '{confirm} CONTINUE');
    });
  }
});

/* ---- BLAM CAMP ---- */
def('team', 'interns', { name: 'GLOBO-BLAM INTERNS', short: 'INTERNS', jersey: '#8a8a94', trim: '#c8c8d0', shorts: '#4a4a54', sneaker: '#f4f4f4', sock: '#c8c8d0', court: 'skybox', players: ['intern1', 'intern2', 'intern3'], style: 'Practice partners', hidden: true, locked: true });
PL('intern1', 'INTERN 1', 'interns', 1, 'PRACTICE PARTNER', [5, 6, 5, 5, 7, 4, 4, 4], { build: 'chibi', size: 1.6, hair: 'short', hairColor: '#5a3a1a', skin: '#e0b090' }, { pitch: 180, wave: 'triangle', rate: 12 }, 'flex', ['Nice!', 'Got it!']);
PL('intern2', 'INTERN 2', 'interns', 2, 'PRACTICE PARTNER', [4, 4, 3, 3, 4, 4, 4, 3], { build: 'chibi', size: 1.6, hair: 'ponytail', hairColor: '#1a1a1a', skin: '#8a5a3c' }, { pitch: 210, wave: 'triangle', rate: 12 }, 'flex', ['Eep!', 'Ow.']);
PL('intern3', 'INTERN 3', 'interns', 3, 'PRACTICE PARTNER', [4, 4, 3, 3, 4, 4, 4, 3], { build: 'chibi', size: 1.6, hair: 'spiky', hairColor: '#e0b040', skin: '#f0c8a0' }, { pitch: 200, wave: 'triangle', rate: 12 }, 'flex', ['Hey!', 'Aw.']);
const me = ev => ev.slot === 0;
const LESSONS = [
  { id: 'move', title: 'MOVE AND TURBO', steps: [
    { text: '{move} RUN THROUGH THE THREE GOLD CONES', goal: 3, cones: [[XM - 100, YM - 60], [XM + 60, YM + 70], [XM + 180, YM - 40]] },
    { text: 'HOLD {turbo} AND CROSS THE WHOLE COURT IN UNDER 4 SECONDS', goal: 1, race: true }] },
  { id: 'pass', title: 'PASS', steps: [
    { text: '{pass} PASS TO YOUR TEAMMATE (TWICE)', goal: 2, ev: e => e.type === 'pass' && me(e) },
    { text: 'TEAMMATE HAS IT: {pass} CALLS FOR IT. GET IT BACK', goal: 1, ev: e => e.type === 'catch' && me(e) && S.ball.passer === 1 }] },
  { id: 'jumper', title: 'JUMP SHOT', steps: [
    { text: 'HOLD {shoot}, RELEASE AT THE TOP. MAKE TWO JUMPERS', goal: 2, ev: e => e.type === 'basket' && me(e) && !e.dunk && !e.layup },
    { text: 'NOW A PERFECT ONE: LET GO RIGHT AT THE TOP', goal: 1, ev: e => e.type === 'basket' && me(e) && e.perfect }] },
  { id: 'three', title: 'THREE-POINTER', steps: [{ text: 'STEP BEYOND THE ARC. {shoot} MAKE A THREE', goal: 1, ev: e => e.type === 'basket' && me(e) && e.three }] },
  { id: 'dunk', title: 'DUNK', steps: [{ text: 'HOLD {turbo}, DRIVE, PRESS {shoot} INSIDE THE RING: TWO DUNKS', goal: 2, ev: e => e.type === 'basket' && me(e) && e.dunk }] },
  { id: 'oop', title: 'ALLEY-OOP', steps: [
    { text: 'YOUR TEAMMATE CUTS. {oop} LOB THE ALLEY-OOP', goal: 1, ev: e => e.type === 'basket' && e.alleyoop && e.slot === 1 },
    { text: 'NOW YOU CUT: RUN AT THE RIM AND PRESS {oop} TO CALL FOR IT', goal: 1, ev: e => e.type === 'basket' && e.alleyoop && me(e), mateBall: true }] },
  { id: 'steal', title: 'STEAL AND SPIN', steps: [
    { text: '{pass} SWIPE THE BALL FROM AN INTERN (FROM THE SIDE WORKS BEST)', goal: 1, ev: e => e.type === 'steal' && me(e), foeBall: true },
    { text: 'WITH THE BALL, {shove} SPIN PAST AN INTERN', goal: 1, ev: e => (e.type === 'ankles' || e.type === 'spin') && me(e) }] },
  { id: 'block', title: 'BLOCK AND SHOVE', steps: [
    { text: '{shoot} JUMP AND BLOCK AN INTERN\'S SHOT', goal: 1, ev: e => e.type === 'block' && me(e), foeBall: true, foeShoot: true },
    { text: '{shove} SHOVE AN INTERN. IT\'S LEGAL!', goal: 1, ev: e => e.type === 'shove' && me(e), foeBall: true }] },
  { id: 'rebound', title: 'REBOUND', steps: [
    { text: 'THE INTERNS ARE BRICKING. {shoot} JUMP FOR THE REBOUND', goal: 1, ev: e => e.type === 'rebound' && me(e), foeBall: true, foeShoot: true, foeMiss: true },
    { text: 'OFFENSIVE BOARD + {turbo}: A PUTBACK SLAM (OR ANY BASKET OFF A REBOUND)', goal: 1, ev: e => e.type === 'basket' && me(e) && (e.putback || S.campReb), mateMiss: true }] },
  { id: 'nova', title: 'SUPERNOVA AND THE RULES', steps: [
    { text: 'SCORE THREE IN A ROW: GO SUPERNOVA!', goal: 1, ev: e => e.type === 'supernovaOn' && me(e), passive: true },
    { text: 'NO FOULS. GOALTENDING COUNTS. 20-SECOND SHOT CLOCK. DUNKS NEED TURBO. {confirm} YOU\'RE READY!', goal: 1, card: true }] }
];
const CAMP = { lesson: 0, step: 0, n: 0, nice: 0, done: false, raceT: -1, cones: [] };
const CL = { list: null };
SCENES.camplist = menuScene({
  enter() { S.scene = 'camplist'; idleReset(); music('camp'); const done = S.progress.camp; CL.list = new FocusList(LESSONS.map((l, k) => ({ label: (k + 1) + '. ' + l.title, value: () => done.includes(l.id) ? '•' : '', onPick: () => startLesson(k) })).concat([{ label: S.campFromTour ? 'ON TO THE TOUR' : 'BACK', onPick: () => campExit() }]), { onBack: () => campExit() }); },
  onBack() { campExit(); },
  update(dt) { CL.list.update(dt); },
  draw(r) {
    menuBackdrop(r, game.time);
    r.overlay(g => {
      const sf = safe(r), w = Math.min(260, sf.w * .6), h = Math.max(12, Math.floor((sf.h - 40) / 11) - 2);
      txt(g, 'BLAM CAMP', sf.x, sf.y, UI.gold, 2);
      CL.list.draw(g, sf.x, sf.y + 22, w, h, { gap: 2, scale: 1 });
      if (sf.w - w > 120) { npcRig('deedee').drawPortrait(g, sf.x + w + 30, sf.y + 30, 64); E.font.wrap("I'M DEE DEE. TEN LESSONS, NO HOMEWORK. PICK ONE, OR START AT THE TOP!", sf.w - w - 40, {}).forEach((ln, i) => txt(g, ln, sf.x + w + 20, sf.y + 104 + i * 10, '#ffffff', 1)); }
      promptBar(g, r, '{move} CHOOSE   {confirm} START   {cancel} BACK');
    });
  }
});
function campExit() { if (S.campFromTour) { S.campFromTour = false; go('tourmap'); } else go('menu'); }
function campCfg() {
  const team = S.progress.tour ? S.progress.tour.team : 'hightops', tm = get('team', team);
  return { court: tm.court, mode: 'camp', teams: [{ id: team, lineup: [tm.players[0], 'intern1'], starters: [tm.players[0], 'intern1'] }, { id: 'interns', lineup: ['intern2', 'intern3'], starters: ['intern2', 'intern3'] }],
    humans: [{ input: game.input, slot: 0 }], quarter: 300, difficulty: 'rookie', powerups: false, twists: false, cheats: { freezeClock: true, freezeShot: true },
    onEnter: () => lessonStep(), onStep: campStep, overlay: campOverlay, onEnd: () => {} };
}
function startLesson(k) { CAMP.lesson = k; CAMP.step = 0; CAMP.n = 0; CAMP.done = false; go('match', campCfg()); }
function lessonStep(keep) {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[Math.min(CAMP.step, L0.steps.length - 1)], m = S.match; if (!keep) { CAMP.n = 0; S.campReb = false; } CAMP.raceT = -1;
  S.cheats = Object.assign({}, m.cfg.cheats, st.passive ? { cpuPassive: true } : {}, st.foeMiss ? { missTeam: 1 } : {}, st.mateMiss ? { missTeam: 0 } : {});
  CAMP.cones = st.cones ? st.cones.map(c => ({ x: c[0], y: c[1], hit: false })) : [];
  m.phase = 'live'; m.clock = 300; m.shotClock = 20;
  const me0 = S.players[0], mate0 = S.players[1], f = S.players.slice(2);
  Object.assign(me0, { x: XM - 60, y: YM, z: 0, vx: 0, vy: 0, state: 'run' }); Object.assign(mate0, { x: XM + 80, y: YM + 60, z: 0, vx: 0, vy: 0, state: 'run' });
  f.forEach((p, k) => Object.assign(p, { x: XM + 140, y: YM + (k ? 50 : -50), z: 0, vx: 0, vy: 0, state: 'run' }));
  if (st.foeBall) giveBall(f[0], 'give'); else if (st.mateBall || CAMP.lesson === 1 && CAMP.step === 1) giveBall(mate0, 'give'); else if (!st.cones && !st.race) giveBall(me0, 'give');
  if (st.race) { me0.x = X0 + 40; }
  if (st.foeShoot) f[0].order = { kind: 'shoot', t: 2 };
  // the interns stay out of the way in the first lessons
  S.cheats.cpuPassive = S.cheats.cpuPassive || CAMP.lesson <= 5 || st.passive;
  if (!keep) Caption.show('deedee', st.text.replace(/\{[a-z]+\}/g, '').replace(/\s+/g, ' ').trim(), { big: true });
  emit('lessonStep', { lesson: L0.id, step: CAMP.step });
}
on('*', ev => {
  if (S.mode !== 'camp' || !S.match || CAMP.done) return;
  const st = LESSONS[CAMP.lesson].steps[CAMP.step];
  if (ev.type === 'rebound' && ev.slot === 0) S.campReb = true;
  if (st.ev && st.ev(ev)) campProgress();
  if (st.foeShoot && (ev.type === 'basket' || ev.type === 'rebound' || ev.type === 'steal') && ev.slot !== 0) game.after(.8, () => { if (S.mode === 'camp' && LESSONS[CAMP.lesson].steps[CAMP.step] === st) lessonStep(); });
  if (ev.type === 'basket' && S.mode === 'camp' && !st.ev) return;
});
function campProgress() {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[CAMP.step];
  CAMP.n++; CAMP.nice = 1.2; A.sfx('code_ok');
  if (CAMP.n < st.goal) return;
  CAMP.step++;
  if (CAMP.step >= L0.steps.length) {
    CAMP.done = true; if (!S.progress.camp.includes(L0.id)) S.progress.camp.push(L0.id); saveProgress(); sting('unlock'); emit('lessonDone', { lesson: L0.id });
    Caption.show('deedee', CAMP.lesson === LESSONS.length - 1 ? "YOU'RE READY! GO GET 'EM!" : 'LESSON COMPLETE! ON TO THE NEXT ONE!', { big: true });
    game.after(2.2, () => { if (S.mode !== 'camp') return; if (CAMP.lesson < LESSONS.length - 1) startLesson(CAMP.lesson + 1); else go('camplist'); });
  } else game.after(.9, () => { if (S.mode === 'camp' && !CAMP.done) lessonStep(); });
}
function campStep(dt) {
  const st = LESSONS[CAMP.lesson].steps[CAMP.step], p = S.players[0]; CAMP.nice = Math.max(0, CAMP.nice - dt);
  if (!st || CAMP.done) return;
  for (const c of CAMP.cones) if (!c.hit && Math.hypot(p.x - c.x, p.y - c.y) < 14) { c.hit = true; campProgress(); }
  if (st.race) { if (p.x < X0 + 80) CAMP.raceT = 0; else if (CAMP.raceT >= 0) { CAMP.raceT += dt; if (p.x > X1 - 80) { if (CAMP.raceT < 4) campProgress(); CAMP.raceT = -1; } } }
  if (st.card && game.input.pressed('confirm')) campProgress();
  if (st.foeShoot) { const f = S.players[2]; if (hasBall(f) && !f.order) f.order = { kind: 'shoot', t: 1 }; }
  if (st.mateMiss || st.foeMiss) { /* the shooting team always misses: rebounds galore */ }
  if (!owner() && S.ball.state === 'loose' && S.ball.z <= BALL_R + .5 && Math.hypot(S.ball.vx, S.ball.vy) < 5 && !st.foeShoot) { /* a dead ball rolls back to you */ giveBall(st.foeBall ? S.players[2] : p, 'give'); }
}
function campOverlay(g, r) {
  const L0 = LESSONS[CAMP.lesson], st = L0.steps[CAMP.step] || L0.steps[L0.steps.length - 1];
  const w = Math.min(r.W - 20, 420), x = Math.round(r.W / 2 - w / 2), y = 42;
  E.ui.box(g, x, y, w, 30, { bg: ['#2a1a48', '#140c24'], border: UI.gold, alpha: .92 });
  txt(g, 'LESSON ' + (CAMP.lesson + 1) + '/10: ' + L0.title + (st.goal > 1 ? '   ' + CAMP.n + '/' + st.goal : ''), x + 6, y + 3, UI.gold, 1);
  promptLine(g, st.text, x + 6, y + 16, game.input, {});
  if (CAMP.nice > 0) E.font.title(g, CAMP.done ? 'LESSON COMPLETE!' : 'NICE!', r.W / 2, r.H * .32, { scale: 3, colors: ['#ffffff', '#5aff8a', '#1a8a3a'], depth: 2, align: 'center' });
  for (const c of CAMP.cones) if (!c.hit) { const [sx, sy] = r.w(c.x, c.y, 0); px.poly(g, [[sx, sy - 12], [sx - 5, sy], [sx + 5, sy]], UI.gold); }
  if (st.race && CAMP.raceT >= 0) txt(g, CAMP.raceT.toFixed(1) + 's', r.W / 2, 76, CAMP.raceT < 4 ? '#ffffff' : UI.bad, 2, 'center');
}

/* ---- 45-attract.js ---- */
/* ATTRACT MODE: ten seconds without input on the title or any menu screen starts "CHANNEL BLAM DEMO": five segments of
 * real CPU-vs-CPU play that cheat freely (infinite turbo, forced dunks, spawned power-ups, scripted twists) so every
 * feature shows, a card between segments, the Hall of Blam and the logo; it loops. Any input leaves at once, back to the
 * screen it interrupted (a touch-only device keeps it running and shows the notice on a tap). */
const IDLE = { t: 0, px: null };
function idleReset() { IDLE.t = 0; }
/** called every step (90-start.js): any input from any player resets the timer; 10 s idle on a menu screen starts it */
function idleTick(dt) {
  const sc = game.scene; if (!sc || HUB) return;
  if (inputSeen()) IDLE.t = 0; else IDLE.t += dt;
  if (sc.menuScreen && IDLE.t > 10 && !game.paused && !(game.shell && game.shell._stack && game.shell._stack.length) && !(RS.initials)) { IDLE.t = 0; go('attract', { from: game.sceneName }); }
}
function inputSeen() {
  for (const I of game.players) { if (I.anyPressed()) return true; const m = I.move(); if (Math.abs(m[0]) > .3 || Math.abs(m[1]) > .3) return true; }
  const I0 = game.input, p = I0.pointer && I0.pointer();
  if (p && IDLE.px && Math.hypot(p[0] - IDLE.px[0], p[1] - IDLE.px[1]) > 4) { IDLE.px = p; return true; } if (p) IDLE.px = p;
  if (I0.clicked && I0.clicked()) return true;
  if (I0.held && I0.held.size) return true;
  return false;
}
const SEGMENTS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [14, 12], quarter: 2, title: 'NEON HEIGHTS: HIGH-FLYING AT THE SKYBOX',
    script: [[1, 'tip'], [5, 'command', [0, 'dunk']], [12, 'command', [1, 'oop']], [18, 'command', [2, 'spin']], [24, 'command', [1, 'three', true]], [29, 'command', [0, 'dunk', 'windmill']]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [22, 25], quarter: 3, title: 'SEA BREEZE AT THE PIER',
    script: [[1, 'spawn', ['rocket', 0]], [1.5, 'spawn', ['laser', 1]], [3, 'twist', 'gust'], [7, 'command', [1, 'three', true]], [13, 'command', [2, 'steal']], [20, 'command', [0, 'dunk', 'tomahawk']]] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [31, 30], quarter: 3, title: 'OIL AND FIRE AT THE SCRAPYARD',
    script: [[1, 'spawn', ['bomb', 0]], [4, 'command', [0, 'shove']], [10, 'command', [3, 'slip']], [14, 'command', [2, 'block']], [21, 'command', [1, 'dunk', 'reverse']]] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [40, 38], quarter: 4, title: 'ERUPTION AT THE CALDERA',
    script: [[3, 'twist', 'eruption'], [9, 'command', [0, 'vent']], [19, 'shatterNext'], [19.2, 'command', [3, 'dunk', 'flip']]] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [55, 52], quarter: 4, boss: true, title: 'HUMANS VS HARDWARE AT THE BLAM DOME',
    script: [[2, 'nova', 2], [3, 'command', [2, 'dunk', 'nova720']], [10, 'overclock'], [14, 'command', [0, 'posterize']], [21, 'spawn', ['moon', 1]], [22, 'command', [1, 'dunk', 'quake']], [28, 'command', [2, 'reboot']]] }
];
const ATT = { seg: 0, t: 0, phase: 'card', from: 'title', notice: 0, script: [] };
SCENES.attract = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: false,
  enter(d) { S.scene = 'attract'; ATT.from = (d && d.from) || ATT.from || 'title'; ATT.seg = (d && d.segment) || 0; ATT.loops = 0; attractCard(); IDLE.px = game.input.pointer && game.input.pointer(); },
  exit() { game.timeScale = 1; game.weather = null; Crowd.update(1, false); S.match = null; S.mode = 'exhibition'; game.setZoom(1); FX.applied = 1; },
  update(dt) {
    // any input leaves, back where it came from (the input is used up)
    if (ATT.t > .3 && inputSeen()) {
      const cl = game.input.clicked && game.input.clicked(); if (S.touchOnly && cl && ATT.notice > 0 && TITLE.btn && hitBox(cl, TITLE.btn)) game.menu('settings');
      if (S.touchOnly) { ATT.notice = 4; }
      else { game.players.forEach(I => I.consumeAll()); idleReset(); go(ATT.from === 'attract' ? 'title' : ATT.from); return; }
    }
    ATT.notice = Math.max(0, ATT.notice - dt);
    ATT.t += dt;
    if (ATT.phase === 'card') { if (ATT.t > 2) attractPlay(); return; }
    if (ATT.phase === 'hall') { if (ATT.t > 6) { ATT.phase = 'logo'; ATT.t = 0; } return; }
    if (ATT.phase === 'logo') { if (ATT.t > 4) { ATT.seg = 0; ATT.loops++; attractCard(); } return; }
    // play: the director's script, then the real match machinery
    const seg = SEGMENTS[ATT.seg];
    while (ATT.script.length && ATT.script[0][0] <= ATT.t) { const [, a, args] = ATT.script.shift(); direct(a, args); }
    matchStep(dt); cameraStep(dt); Caption.update(dt); hoopStep(dt, S.match.wind ? S.match.wind.x / Math.max(1, tune('windStrength')) : 0); Crowd.update(dt, true);
    if (ATT.t > seg.seconds || S.match.phase === 'over') { ATT.seg++; if (ATT.seg >= SEGMENTS.length) { ATT.phase = 'hall'; ATT.t = 0; music('title'); S.match = null; } else attractCard(); }
  },
  draw(r) {
    if (ATT.phase === 'play' && S.match) { drawMatchWorld(r); r.overlay(g => { drawHud(g, r); drawAttractOverlay(g, r); }); return; }
    menuBackdrop(r, game.time);
    r.overlay(g => {
      if (ATT.phase === 'card') { E.font.title(g, 'TONIGHT ON', r.W / 2, r.H * .3, { scale: 2, colors: ['#ffffff', '#c8c0e0'], align: 'center' }); E.font.title(g, 'CHANNEL BLAM', r.W / 2, r.H * .3 + 24, { scale: 4, colors: ['#ffffff', '#ffd23a', '#ff3ca6'], depth: 3, align: 'center' }); txt(g, SEGMENTS[ATT.seg].title, r.W / 2, r.H * .3 + 70, UI.accent2, 1, 'center'); }
      if (ATT.phase === 'hall') drawHall(g, r);
      if (ATT.phase === 'logo') { logo(g, r.W / 2, r.H * .35, Math.max(4, Math.floor(r.W / 90)), game.time); txt(g, 'NO FOULS. NO MERCY. ALL BLAM.', r.W / 2, r.H * .35 + 50, UI.accent2, 1, 'center'); }
      drawAttractOverlay(g, r);
    });
  }
};
function attractCard() { ATT.phase = 'card'; ATT.t = 0; S.match = null; S.mode = 'attract'; music('title'); }
function attractPlay() {
  const seg = SEGMENTS[ATT.seg];
  ATT.phase = 'play'; ATT.t = 0; ATT.script = seg.script.slice();
  startMatch({ court: seg.court, mode: 'attract', teams: [{ id: seg.home }, { id: seg.away }], humans: [], quarter: 90, difficulty: 'blam', powerups: true, twists: true, boss: !!seg.boss, seed: 100 + ATT.seg + ATT.loops * 7, cheats: {} });
  const m = S.match; m.score = seg.score.slice(); m.quarter = seg.quarter; m.clock = 70;
  const court = get('court', seg.court); game.weather = court.weather ? Object.assign({}, court.weather) : null; music(court.music);
  game.setView(setting('camera') === 'high' ? HIGH : 'broadcast'); FX.focusX = XM;
  if (!seg.script.some(s => s[1] === 'tip')) { m.phase = 'live'; giveBall(S.players[0], 'give'); }
  emit('attractSegment', { segment: ATT.seg });
}
/** the director's actions */
function direct(a, args) {
  const m = S.match; if (!m) return;
  switch (a) {
    case 'tip': break;
    case 'spawn': { const p = S.players[args[1]], id = args[0]; spawnPowerup(id, clamp(p.x, X0 + 10, X1 - 10), clamp(p.y, Y0 + 10, Y1 - 10)); game.after(.6, () => { const k = S.match ? S.match.powerups.findIndex(x => x.id === id) : -1; if (k >= 0) { S.match.powerups.splice(k, 1); givePowerup(p, id); } }); break; }
    case 'twist': if (args === 'gust' && m.twist) { m.twist.next = 0; } if (args === 'eruption' && m.twist) m.twist.next = 0; break;
    case 'nova': novaOn(S.players[args]); break;
    case 'overclock': overclock(); break;
    case 'shatterNext': m.forceShatter = true; break;
    case 'command': { const [slot, kind, extra] = args; S.players[slot].force = { kind, extra, t: 0 }; Caption.show('vinnie', ATTRACT_CALLS[kind] || 'WATCH THIS!', { big: true }); break; }
  }
}
const ATTRACT_CALLS = { dunk: 'TURBO DUNK INCOMING!', oop: 'ALLEY-OOP! ALLEY-OOP!', spin: 'SPIN MOVE! ANKLES BEWARE!', three: 'FROM DOWNTOWN!', steal: 'PICKPOCKET ALERT!', shove: 'BLAM BOMB SHOVE!', slip: 'OIL SLICK! WHOOPS!', block: 'REJECTION TIME!', vent: 'VOLCANO LAUNCH!', posterize: 'POSTER ON THE WAY!', reboot: 'SHOVE THE ROBOT! TWICE!' };
/** a forced play: the director moves people where they need to be and presses the buttons (it may cheat freely) */
function forcedStep(p) {
  const F = p.force, c = p.cmd, h = attackHoop(p.team), m = S.match; F.t += 1 / 120;
  if (F.t > 6) { p.force = null; return true; }
  const take = () => { if (!hasBall(p)) { const o = owner(); if (o && o.state !== 'run' && o.state !== 'inbound') return false; giveBall(p, 'give'); if (m.phase !== 'live') m.phase = 'live'; } return true; };
  switch (F.kind) {
    case 'dunk': case 'posterize': {
      if (busy(p) && p.state === 'dunk') { p.force = null; return true; }
      if (!take()) return true;
      if (F.t < .05) { p.x = h.x - h.dir * 110; p.y = h.y + 30; if (F.kind === 'posterize') { const f = foes(p)[0]; f.x = h.x - h.dir * 14; f.y = h.y; f.state = 'run'; } }
      steer(c, p, h.x, h.y); c.tD = true;
      if (Math.hypot(p.x - h.x, p.y - h.y) < 95) { if (F.extra) startDunk(p, { dunk: get('dunk', F.extra) }); else startDunk(p); p.force = null; }
      return true;
    }
    case 'oop': { if (!take()) return true; const t = mate(p); if (F.t < .05) { t.x = h.x - h.dir * 70; t.y = h.y - 20; t.state = 'run'; } c.oP = F.t > .3; if (F.t > .35) p.force = null; return true; }
    case 'three': { if (!take()) return true; if (F.t < .05) { p.x = h.x - h.dir * 150; p.y = h.y - 30; } if (p.state === 'jumpshot') { c.sD = p.jump.t < p.jump.apexT; c.sR = !c.sD; if (!c.sD) { if (F.extra) S.cheats.shots = 'in'; p.force = null; game.after(1.5, () => { if (S.cheats) S.cheats.shots = null; }); } } else c.sP = c.sD = F.t > .2; return true; }
    case 'spin': { if (!take()) return true; if (F.t < .05) { const f = foes(p)[0]; f.x = p.x + Math.cos(p.facing) * 14; f.y = p.y + Math.sin(p.facing) * 14; f.state = 'run'; p.turbo = 1; } c.vP = F.t > .15; if (F.t > .2) p.force = null; return true; }
    case 'steal': { const o = foes(p)[0]; if (!hasBall(o)) { giveBall(o, 'give'); m.phase = 'live'; } if (F.t < .05) { p.x = o.x - Math.cos(o.facing) * 12; p.y = o.y - Math.sin(o.facing) * 12 + 4; givePowerup(p, 'glue'); } c.pP = F.t > .2; if (F.t > .25) p.force = null; return true; }
    case 'shove': { const o = foes(p)[0]; if (hasBall(p)) passTo(p, mate(p)); if (F.t < .05) { o.x = p.x + Math.cos(p.facing) * 14; o.y = p.y + Math.sin(p.facing) * 14; o.state = 'run'; p.turbo = 1; } if (F.t > .15 && !hasBall(p) && p.state === 'run') { p.cool.shove = 0; startShove(p); p.force = null; } return true; }
    case 'slip': { if (F.t > .1) { slip(p); p.force = null; } return true; }
    case 'block': { const o = foes(p)[0]; if (F.t < .05) { giveBall(o, 'give'); m.phase = 'live'; const oh = attackHoop(o.team); o.x = oh.x - oh.dir * 90; o.y = oh.y; p.x = o.x + oh.dir * 12; p.y = o.y; o.force = { kind: 'three', t: 0 }; S.forceBlock = true; } if (o.state === 'jumpshot' && !isAir(p)) { c.sP = true; p.force = null; } return true; }
    case 'vent': { if (!take()) return true; const v = VENTS.find(v => (v.x - XM) * h.dir > 0) || VENTS[0]; if (F.t < .05) { p.x = v.x; p.y = v.y; } if (m.twist) { m.twist.ventOn = true; m.twist.ventT = 3.5; } startDunk(p, { vent: true }); p.force = null; return true; }
    case 'reboot': { const bots = foes(p).filter(f => f.def.team === 'blambots'), o = bots[0]; if (!o) { p.force = null; return true; } if (F.t > .2 && !F.k1) { F.k1 = true; o.x = p.x + 12; o.y = p.y; knockDown(o, .5, p); emit('shove', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name }); } if (F.t > 1.4 && !F.k2) { F.k2 = true; o.reboot = 0; o.state = 'run'; o.x = p.x + 12; o.y = p.y; knockDown(o, .5, p); emit('shove', { slot: p.slot, victim: o.slot, name: p.name, victimName: o.name }); p.force = null; } return true; }
  }
  p.force = null; return false;
}
function drawAttractOverlay(g, r) {
  if (Math.floor(game.real * 2) % 2 === 0) promptLine(g, S.touchOnly ? 'DEMO' : 'DEMO - PRESS ANY BUTTON', r.W / 2, r.H - 12, game.input, { align: 'center', color: UI.gold });
  txt(g, 'CHANNEL BLAM DEMO', 6, r.H - 12, '#ff3ca6', 1);
  if (ATT.notice > 0 || S.touchOnly && ATT.notice > 0) { E.ui.box(g, r.W / 2 - 150, r.H / 2 - 30, 300, 60, { bg: '#140c24', border: UI.accent }); txt(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 22, '#ffffff', 1, 'center'); const bx = r.W / 2 - 50, by = r.H / 2 - 4; TITLE.btn = [bx, by, 100, 22]; E.ui.box(g, bx, by, 100, 22, { bg: [UI.accent, E.shade(UI.accent, -.4)], border: '#ffffff' }); txt(g, 'SETTINGS', r.W / 2, by + 6, '#ffffff', 1, 'center'); }
}

/* ---- 46-dev.js ---- */
/* DEV MODE (from the pause menu's Dev Mode, or #dev): a panel docked on the right third of the screen while the match
 * keeps running on autopilot. Tabs: TUNING (every important number as a live slider, reset one or all, save, copy as
 * JSON), CHEATS, MATCH, SCENES, DEBUG (overlays), TIME, CAMERA. Pad, keys and mouse all drive it. */
const DEV = { tab: 0, row: 0, group: 0, scroll: 0, overlays: { any: false }, speed: 1, freeze: false, step: false, slowDunks: true, unlockAll: false, confirm: null, note: '', noteT: 0, saved: null };
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
const GROUPS = [...new Set(Object.values(TUNING).map(t => t.group))];
function openDev() {
  if (HUB) return;
  if (!S.match || !(game.scene && game.scene.isMatch) || S.mode === 'attract') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.devOpen = true; devAutopilot(true); } })); return; }
  S.devOpen = true; devAutopilot(true); game.players.forEach(I => I.consumeAll()); emit('devOpen', {});
}
/** before a scene jump: the panel closes and time runs normally again */
function devJump() { closeDev(); DEV.freeze = false; DEV.speed = 1; game.timeScale = 1; }
function closeDev() { S.devOpen = false; devAutopilot(false); game.players.forEach(I => I.consumeAll()); emit('devClose', {}); }
/** while the panel has the focus, the humans' slots are played by CPU brains (and given back on close) */
function devAutopilot(on) {
  for (const p of S.players) {
    if (on && p.human && p.src.kind === 'local') { p._src = p.src; p.src = CpuSource(); if (!p.brain) p.brain = newBrain(p); }
    if (!on && p._src) { p.src = p._src; p._src = null; }
  }
}
const devNote = s => { DEV.note = s; DEV.noteT = 2.5; };
const onOff = v => v ? 'ON' : 'OFF';
function cheatRow(label, key, val = true) { return { label, value: () => onOff(S.cheats[key] === val), act: () => { S.cheats[key] = S.cheats[key] === val ? false : val; if (S.match) S.match.cfg.starred = true; } }; }
function devRows() {
  const m = S.match, tab = DEV_TABS[DEV.tab];
  if (tab === 'TUNING') {
    const grp = GROUPS[DEV.group], keys = Object.keys(TUNING).filter(k => TUNING[k].group === grp);
    return [{ label: 'GROUP', value: () => grp, side: d => { DEV.group = (DEV.group + d + GROUPS.length) % GROUPS.length; DEV.scroll = 0; } }]
      .concat(keys.map(k => { const t = TUNING[k]; return { label: t.label, key: k, value: () => (t.v !== t.def ? '• ' : '') + (+t.v.toFixed(3)), help: t.help + ' (default ' + t.def + ')', side: d => setTune(k, t.v + d * t.step), reset: () => setTune(k, t.def), slider: t }; }))
      .concat([{ label: 'RESET ALL TO DEFAULTS', act: () => { resetTuning(); devNote('EVERY VALUE IS BACK TO ITS DEFAULT'); } },
        { label: 'SAVE AS MY DEFAULTS', act: () => { const o = {}; for (const [k, t] of Object.entries(TUNING)) if (t.v !== t.def) o[k] = t.v; store.set('bb:tuning', o); devNote('SAVED ' + Object.keys(o).length + ' CHANGED VALUES'); } },
        { label: 'COPY AS JSON', act: () => { const o = {}; for (const [k, t] of Object.entries(TUNING)) o[k] = t.v; const s = JSON.stringify(o); DEV.saved = s; try { navigator.clipboard.writeText(s); devNote('COPIED TO THE CLIPBOARD'); } catch (e) { devNote('JSON IN THE CONSOLE'); } console.log(s); } }]);
  }
  if (tab === 'CHEATS') return [
    { label: 'INFINITE TURBO: P1 TEAM', value: () => onOff(S.cheats.turbo0), act: () => { S.cheats.turbo0 = !S.cheats.turbo0; } },
    { label: 'INFINITE TURBO: EVERYONE', value: () => onOff(S.cheats.turboAll), act: () => { S.cheats.turboAll = !S.cheats.turboAll; } },
    { label: 'ALWAYS SUPERNOVA: HOME', value: () => onOff(S.players.filter(p => p.team === 0).every(p => p.nova)), act: () => S.players.filter(p => p.team === 0).forEach(p => p.nova ? novaOff(p) : novaOn(p)) },
    { label: 'ALWAYS SUPERNOVA: AWAY', value: () => onOff(S.players.filter(p => p.team === 1).every(p => p.nova)), act: () => S.players.filter(p => p.team === 1).forEach(p => p.nova ? novaOff(p) : novaOn(p)) },
    cheatRow('CPU PASSIVE (AWAY)', 'cpuPassive'),
    { label: 'SHOTS', value: () => (S.cheats.shots || 'normal').toUpperCase(), side: d => { const o = [null, 'in', 'out'], k = o.indexOf(S.cheats.shots || null); S.cheats.shots = o[(k + d + 3) % 3]; } },
    cheatRow('UNBLOCKABLE DUNKS', 'unblockable'), cheatRow('ONE-SHOVE KNOCKDOWNS', 'oneShove'),
    { label: 'BIG HEADS', value: () => onOff(S.cheats.bigheads), act: () => { S.cheats.bigheads = !S.cheats.bigheads; for (const p of S.players) setBigHeads(p.rig, S.cheats.bigheads); } },
    cheatRow('POWER-UPS EVERY 5 S', 'puFast'),
    { label: 'TWISTS', value: () => onOff(m && m.twistOn), act: () => { if (!m) return; m.twistOn = !m.twistOn; setupTwist(); } },
    cheatRow('FREEZE GAME CLOCK', 'freezeClock'), cheatRow('FREEZE SHOT CLOCK', 'freezeShot'),
    { label: 'UNLOCK EVERYTHING', value: () => onOff(DEV.unlockAll), act: () => { DEV.unlockAll = !DEV.unlockAll; S.progress.unlocked = Object.assign(S.progress.unlocked, { teams: true, bigHeads: true, secrets: true }); saveProgress(); } },
    { label: DEV.confirm === 'reset' ? 'REALLY RESET? CONFIRM AGAIN' : 'RESET SAVE DATA', act: () => { if (DEV.confirm === 'reset') { DEV.confirm = null; store.set('bb:progress', {}); store.set('bb:hall', null); store.set('bb:tuning', {}); loadProgress(); devNote('SAVE DATA RESET'); } else DEV.confirm = 'reset'; } }
  ];
  if (tab === 'MATCH') return !m ? [] : [
    { label: 'HOME SCORE', value: () => m.score[0], side: d => { m.score[0] = Math.max(0, m.score[0] + d); } },
    { label: 'AWAY SCORE', value: () => m.score[1], side: d => { m.score[1] = Math.max(0, m.score[1] + d); } },
    { label: 'QUARTER', value: () => m.quarter, side: d => { m.quarter = clamp(m.quarter + d, 1, m.periods); } },
    { label: 'GAME CLOCK', value: () => fmtClock(m.clock), side: d => { m.clock = Math.max(1, m.clock + d * 10); } },
    { label: 'SHOT CLOCK', value: () => Math.ceil(m.shotClock), side: d => { m.shotClock = clamp(m.shotClock + d, 1, 30); } },
    { label: 'GIVE BALL TO', value: () => S.players[DEV.slot || 0].name, side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => { giveBall(S.players[DEV.slot || 0], 'give'); m.phase = 'live'; } },
    { label: 'SUPERNOVA FOR', value: () => S.players[DEV.slot || 0].name, side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => novaOn(S.players[DEV.slot || 0]) },
    { label: 'FORCE A TIP-OFF', act: () => tipoffSetup() },
    { label: 'END THE QUARTER', act: () => { m.clock = .05; } },
    { label: 'END GAME: HOME WINS', act: () => { m.score[0] = m.score[1] + 2; endGame(); } },
    { label: 'END GAME: AWAY WINS', act: () => { m.score[1] = m.score[0] + 2; endGame(); } },
    { label: 'SHATTER THE NEXT DUNK', act: () => { m.forceShatter = true; m.shatters = Math.min(m.shatters, 1); devNote('THE NEXT DUNK SHATTERS'); } },
    { label: 'SPAWN POWER-UP', value: () => get('powerup', POWERUPS[DEV.pu || 0]).name, side: d => { DEV.pu = ((DEV.pu || 0) + d + 6) % 6; }, act: () => { const p = S.players[0]; spawnPowerup(POWERUPS[DEV.pu || 0], clamp(p.x + 24, X0 + 10, X1 - 10), p.y); } },
    { label: 'PLACE THE JACKPOT SPOT', act: () => moveJackpot() },
    { label: 'TRIGGER TWIST', value: () => ['GUST', 'OIL SLICKS', 'ERUPTION', 'VENT PUFF', 'OVERCLOCK', 'REBOOT'][DEV.tw || 0], side: d => { DEV.tw = ((DEV.tw || 0) + d + 6) % 6; }, act: () => devTwist(DEV.tw || 0) },
    { label: 'SLOT CPU / HUMAN', value: () => S.players[DEV.slot || 0].name + ': ' + ((S.players[DEV.slot || 0]._src || S.players[DEV.slot || 0].src).kind === 'local' ? 'HUMAN' : 'CPU'), side: d => { DEV.slot = ((DEV.slot || 0) + d + 4) % 4; }, act: () => { const p = S.players[DEV.slot || 0]; if (p.human) { const keep = p.human; p.human = null; p._keep = keep; p.src = CpuSource(); p._src = null; } else { p.human = p._keep || game.input; p._src = LocalSource(p.human); p.tag = p.human.name; p.tagColor = p.human.color; } } }
  ];
  if (tab === 'SCENES') return [
    ...COURTS.map(c => ({ label: 'PLAY AT ' + get('court', c).name, act: () => { devJump(); go('match', Object.assign(exhibitionDefault(), { court: c, teams: c === 'dome' ? [{ id: 'hightops' }, { id: 'blambots' }] : [{ id: get('court', c).home }, { id: c === 'skybox' ? 'breakers' : 'hightops' }], boss: c === 'dome' })); } })),
    { label: 'TOUR STOP', value: () => String((DEV.stop || 0) + 1), side: d => { DEV.stop = ((DEV.stop || 0) + d + 4) % 4; }, act: () => { devJump(); S.progress.tour = { team: 'hightops', pick: 0, stop: DEV.stop || 0, score: 0, cheats: true }; saveProgress(); go('tourmap'); } },
    { label: 'STORY BEAT', value: () => Object.keys(BEATS)[DEV.beat || 0].toUpperCase(), side: d => { const n = Object.keys(BEATS).length; DEV.beat = ((DEV.beat || 0) + d + n) % n; }, act: () => { devJump(); playBeat(Object.keys(BEATS)[DEV.beat || 0], () => go('menu')); } },
    { label: 'CREDITS', act: () => { devJump(); go('credits', { then: () => go('menu') }); } },
    { label: 'RESULTS', act: () => { devJump(); endGame(); go('results', { cfg: S.match.cfg }); } },
    { label: 'ATTRACT SEGMENT', value: () => String((DEV.seg || 0) + 1), side: d => { DEV.seg = ((DEV.seg || 0) + d + 5) % 5; }, act: () => { devJump(); go('attract', { from: 'menu', segment: DEV.seg || 0 }); } },
    { label: 'CAMP LESSON', value: () => String((DEV.lesson || 0) + 1), side: d => { DEV.lesson = ((DEV.lesson || 0) + d + 10) % 10; }, act: () => { devJump(); startLesson(DEV.lesson || 0); } },
    { label: 'ANIMATION LAB', act: () => { devJump(); go('animlab'); } },
    { label: 'SHOOTAROUND (RIM PHYSICS)', act: () => { devJump(); go('shootaround'); } },
    { label: 'MAIN MENU', act: () => { devJump(); go('menu'); } }
  ];
  if (tab === 'DEBUG') return ['hitboxes', 'intents', 'shot', 'path', 'twists', 'events', 'snapshot'].map(k => ({ label: { hitboxes: 'HITBOXES', intents: 'AI INTENTS', shot: 'SHOT CHANCE', path: 'BALL PATH', twists: 'TWIST AREAS', events: 'EVENT LOG', snapshot: 'STATE SNAPSHOT' }[k], value: () => onOff(DEV.overlays[k]), act: () => { DEV.overlays[k] = !DEV.overlays[k]; DEV.overlays.any = Object.keys(DEV.overlays).some(q => q !== 'any' && DEV.overlays[q]); } }));
  if (tab === 'TIME') return [
    { label: 'GAME SPEED', value: () => DEV.speed + 'x', side: d => { const o = [.1, .25, .5, 1, 2], k = o.indexOf(DEV.speed); DEV.speed = o[clamp(k + d, 0, 4)]; } },
    { label: 'FREEZE', value: () => onOff(DEV.freeze), act: () => { DEV.freeze = !DEV.freeze; } },
    { label: 'STEP ONE FRAME', act: () => { DEV.freeze = true; DEV.step = true; } },
    { label: 'SLOW MOTION ON DUNKS', value: () => onOff(TUNING.dunkSlowMo.v < 1), act: () => setTune('dunkSlowMo', TUNING.dunkSlowMo.v < 1 ? 1 : TUNING.dunkSlowMo.def) }
  ];
  return [
    { label: 'VIEW', value: () => game.view.id === HIGH ? 'HIGH' : 'BROADCAST', act: () => game.settings.set('camera', setting('camera') === 'high' ? 'broadcast' : 'high') },
    { label: 'ZOOM', value: () => (game.settings.zoom || 1).toFixed(2), side: d => game.settings.set('zoom', clamp((game.settings.zoom || 1) + d * .1, .8, 1.4)) },
    { label: 'FREE CAMERA', value: () => onOff(!!game.cam.free), act: () => { game.cam.free = game.cam.free ? null : { keys: true, edge: 0, speed: 300 }; } },
    { label: 'RESET CAMERA', act: () => { game.cam.free = null; game.settings.set('zoom', 1); game.resetCamera(); } }
  ];
}
function devTwist(k) {
  const m = S.match; if (!m) return;
  const want = ['wind', 'oil', 'eruption', 'eruption', 'boss', 'boss'][k];
  if (!m.twist || m.twist.kind !== want) { m.twist = { kind: want, next: 0, bombs: [], slicks: null, gustT: 0, ventT: 0, ventOn: false, w: 0 }; if (want === 'oil') setupTwistQuarter(); }
  if (k === 0) m.twist.next = 0; if (k === 1) setupTwistQuarter(); if (k === 2) m.twist.next = 0; if (k === 3) m.twist.ventT = 3.01;
  if (k === 4) { m.overclockDone = false; m.overclock = 0; overclock(); }
  if (k === 5) { const bot = S.players.find(p => p.def.team === 'blambots'); if (bot) { bot.reboot = 3; emit('reboot', { slot: bot.slot, name: bot.name }); } else devNote('NO BLAMBOTS ON THE COURT'); }
}
/** the panel's input (called from the match scene while open) */
function devUpdate(dt) {
  DEV.noteT = Math.max(0, DEV.noteT - dt);
  const rows = devRows(), I = game.input;
  for (const P0 of game.players) {
    if (P0.pressed('pause') || P0.pressed('cancel')) { closeDev(); return; }
    if (P0.pressed('devNext')) { DEV.tab = (DEV.tab + 1) % DEV_TABS.length; DEV.row = 0; DEV.scroll = 0; A.sfx('select'); }
    if (P0.pressed('devPrev')) { DEV.tab = (DEV.tab + DEV_TABS.length - 1) % DEV_TABS.length; DEV.row = 0; DEV.scroll = 0; A.sfx('select'); }
    if (P0.repeat('up', .3, .08)) DEV.row = (DEV.row + rows.length - 1) % Math.max(1, rows.length);
    if (P0.repeat('down', .3, .08)) DEV.row = (DEV.row + 1) % Math.max(1, rows.length);
    const r = rows[DEV.row]; if (!r) continue;
    const d = P0.repeat('left', .3, .06) ? -1 : P0.repeat('right', .3, .06) ? 1 : 0;
    if (d && r.side) { r.side(d); A.sfx('select'); }
    if (P0.pressed('confirm') && r.act) { r.act(); A.sfx('confirm'); }
    if (P0.pressed('oop') && r.reset) { r.reset(); A.sfx('cancel'); }
  }
  // the mouse: hover moves the focus; a click on a row acts, on its left or right half turns a slider
  const ptr = I.pointer && I.pointer(), cl = I.clicked && I.clicked();
  if (ptr && DEV.boxes) DEV.boxes.forEach((b, k) => { if (b && hitBox(ptr, b) && DEV.row !== k) DEV.row = k; });
  if (cl && DEV.tabBoxes) DEV.tabBoxes.forEach((b, k) => { if (hitBox(cl, b)) { DEV.tab = k; DEV.row = 0; } });
  if (cl && DEV.boxes) DEV.boxes.forEach((b, k) => { if (b && hitBox(cl, b)) { const r = rows[k]; if (r.side && !r.act) r.side(cl[0] < b[0] + b[2] * .6 ? -1 : 1); else if (r.act) r.act(); A.sfx('confirm'); } });
  if (DEV.row < DEV.scroll) DEV.scroll = DEV.row; if (DEV.row >= DEV.scroll + 9) DEV.scroll = DEV.row - 8;
}
function drawDev(g, r) {
  if (DEV.overlays.any) drawOverlays(g, r);
  if (!S.devOpen) return;
  const w = Math.max(150, Math.round(r.W / 3)), x = r.W - w, y = 40, h = r.H - 46;
  E.ui.box(g, x, y, w, h, { bg: ['#140c24', '#0a0612'], border: UI.accent2, alpha: .93 });
  txt(g, 'DEV MODE', x + 6, y + 4, UI.accent2, 1);
  promptLine(g, '{devPrev}{devNext} TABS', x + w - 4, y + 3, game.input, { align: 'right', color: UI.dim });
  DEV.tabBoxes = [];
  const tbw = Math.floor((w - 8) / 4);
  DEV_TABS.forEach((t, k) => { const tx = x + 4 + (k % 4) * tbw, ty = y + 15 + Math.floor(k / 4) * 11; DEV.tabBoxes.push([tx, ty, tbw - 2, 10]); E.ui.box(g, tx, ty, tbw - 2, 10, { bg: k === DEV.tab ? UI.accent : '#2a1e44', border: k === DEV.tab ? '#ffffff' : UI.line, gradient: false }); txt(g, t, tx + (tbw - 2) / 2, ty + 1, '#ffffff', 1, 'center', { outline: false }); });
  const rows = devRows(); DEV.boxes = [];
  rows.slice(DEV.scroll, DEV.scroll + 9).forEach((row, i) => {
    const k = i + DEV.scroll, ry = y + 42 + i * 17, sel = k === DEV.row; DEV.boxes[k] = [x + 4, ry, w - 8, 15];
    E.ui.box(g, x + 4, ry, w - 8, 15, { bg: sel ? [UI.accent, E.shade(UI.accent, -.4)] : '#1e1436', border: sel ? '#ffffff' : '#2a2040', gradient: false });
    txt(g, (sel ? '▸' : '') + row.label, x + 7, ry + 4, '#ffffff', 1, 'left', { outline: false });
    if (row.value) txt(g, (row.side ? '←' : '') + row.value() + (row.side ? ' →' : ''), x + w - 7, ry + 4, sel ? '#ffffff' : UI.gold, 1, 'right', { outline: false });
    if (row.slider) { const t = row.slider, u = (t.v - t.min) / (t.max - t.min), du = (t.def - t.min) / (t.max - t.min); px.rect(g, x + 7, ry + 12, w - 14, 2, '#3a2a5a'); px.rect(g, x + 7, ry + 12, Math.round((w - 14) * u), 2, UI.accent2); px.rect(g, x + 7 + Math.round((w - 14) * du), ry + 11, 1, 4, '#ffffff'); }
  });
  if (DEV.scroll + 9 < rows.length) txt(g, '↓ ' + (rows.length - DEV.scroll - 9) + ' MORE', x + w / 2, y + 42 + 9 * 17, UI.dim, 1, 'center');
  const cur = rows[DEV.row];
  if (cur && cur.help) E.font.wrap(cur.help, w - 12, {}).slice(0, 2).forEach((ln, i) => txt(g, ln, x + 6, y + h - 46 + i * 9, UI.dim, 1, 'left', { outline: false }));
  promptLine(g, '{confirm} DO {oop} RESET {cancel} CLOSE', x + w / 2, y + h - 12, game.input, { align: 'center' });
  if (DEV.noteT > 0) txt(g, DEV.note, x + w / 2, y + h - 26, UI.good, 1, 'center');
}
function drawOverlays(g, r) {
  const m = S.match, b = S.ball; if (!m) return;
  if (DEV.overlays.hitboxes) {
    for (const p of S.players) { const pts = r.groundPts(p.x, p.y, 6, 12, 0); for (let k = 0; k < pts.length; k++) px.line(g, pts[k][0], pts[k][1], pts[(k + 1) % pts.length][0], pts[(k + 1) % pts.length][1], '#5aff8a', 1); const [hx, hy] = r.w(p.x, p.y, handsZ(p)); px.rect(g, hx - 1, hy - 1, 3, 3, '#ff5a5a'); const st = r.groundPts(p.x, p.y, tune('stealReach'), 16, 0); for (let k = 0; k < st.length; k += 2) px.dot(g, st[k][0], st[k][1], '#ffd23a'); }
    for (const h of HOOPS) { const pts = r.groundPts(h.x, h.y, RIM_R, 16, RIM_Z); for (let k = 0; k < pts.length; k++) px.line(g, pts[k][0], pts[k][1], pts[(k + 1) % pts.length][0], pts[(k + 1) % pts.length][1], '#5ae8ff', 1); const a = r.w(h.board, BOARD.y0, BOARD.z0), c = r.w(h.board, BOARD.y1, BOARD.z1); px.line(g, a[0], a[1], c[0], c[1], '#5ae8ff', 1); }
    if (b) { const [bx, by] = r.w(b.x, b.y, b.z); px.line(g, bx - 4, by, bx + 4, by, '#ffffff', 1); px.line(g, bx, by - 4, bx, by + 4, '#ffffff', 1); }
  }
  if (DEV.overlays.intents) for (const p of S.players) { const [x, y] = r.w(p.x, p.y, p.z + reach(p) + 18); txt(g, (p.src.kind === 'cpu' ? p.intent : 'HUMAN') || '-', x, y, '#ffffff', 1, 'center', { font: 'tiny' }); }
  if (DEV.overlays.shot && S.lastShot) { const s = S.lastShot; txt(g, 'LAST SHOT ' + s.name + ': ' + Math.round(s.chance * 100) + '% ' + s.rel.toUpperCase() + (s.three ? ' 3PT' : '') + ' CONTEST x' + s.contest.toFixed(2) + (s.made ? ' MADE' : ' MISSED'), 6, 42, '#ffffff', 1); const o = owner(); if (o) { const c = shotChance(o, 'good'); txt(g, o.name + ' NOW: ' + Math.round(c.p * 100) + '%', 6, 52, UI.gold, 1); } }
  if (DEV.overlays.path && b && !b.owner) { let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz; const gg = tune('ballGravity'); for (let k = 0; k < 40; k++) { vz -= gg / 60; x += vx / 60; y += vy / 60; z += vz / 60; if (z < 0) break; const [sx, sy] = r.w(x, y, z); px.dot(g, sx, sy, '#ffffff'); } }
  if (DEV.overlays.twists && m.twist) { if (m.twist.slicks) for (const s of m.twist.slicks) { const [sx, sy] = r.w(s.x, s.y, 0); txt(g, 'SLICK', sx, sy, '#ff5ad8', 1, 'center'); } for (const v of VENTS) { const [sx, sy] = r.w(v.x, v.y, 0); txt(g, 'VENT', sx, sy, '#ff7a1a', 1, 'center'); } if (m.jackpot) { const [sx, sy] = r.w(m.jackpot.x, m.jackpot.y, 0); txt(g, 'JACKPOT ' + Math.ceil(m.jackpot.t), sx, sy, UI.gold, 1, 'center'); } }
  if (DEV.overlays.events) S.events.slice(-10).forEach((e, i) => txt(g, e.t + ' ' + e.type + (e.slot !== undefined && e.slot >= 0 ? ' ' + nameOf(e.slot) : ''), 6, 70 + i * 9, UI.accent2, 1, 'left', { font: 'tiny' }));
  if (DEV.overlays.snapshot) { const s = JSON.stringify(game.debug.snapshot()).slice(0, 600); E.font.wrap(s, r.W * .6, { font: 'tiny' }).slice(0, 14).forEach((ln, i) => txt(g, ln, 6, r.H - 140 + i * 7, '#c8c8d0', 1, 'left', { font: 'tiny', outline: false })); }
}

/* ---- the animation lab: every dunk, celebration and taunt on a rig, at full or slow speed ---- */
const LAB = { clip: 0, slow: false, t: 0, player: 0 };
const LAB_CLIPS = () => all('dunk').map(d => ['dunk', d.id]).concat(Object.keys(MOVES).map(k => ['move', k]), [['dribble'], ['jumpshot'], ['block'], ['shove'], ['knocked'], ['defense']]);
const LAB_PLAYERS = () => all('player').map(p => p.id);
SCENES.animlab = menuScene({
  enter() { S.scene = 'animlab'; LAB.t = 0; LAB.rig = null; LAB.ball = newBall(); },
  onBack() { go('menu'); },
  update(dt) {
    const clips = LAB_CLIPS(), ids = LAB_PLAYERS();
    for (const I of game.players) {
      if (I.pressed('right')) { LAB.clip = (LAB.clip + 1) % clips.length; LAB.t = 0; } if (I.pressed('left')) { LAB.clip = (LAB.clip + clips.length - 1) % clips.length; LAB.t = 0; }
      if (I.pressed('down')) { LAB.player = (LAB.player + 1) % ids.length; LAB.rig = null; } if (I.pressed('up')) { LAB.player = (LAB.player + ids.length - 1) % ids.length; LAB.rig = null; }
      if (I.pressed('confirm')) LAB.slow = !LAB.slow; if (I.pressed('cancel')) return go('menu');
    }
    if (!LAB.rig) { const d = get('player', ids[LAB.player]); LAB.rig = dressRig(d, d.team); }
    const sdt = dt * (LAB.slow ? .25 : 1); LAB.t += sdt;
    const [kind, id] = clips[LAB.clip], rig = LAB.rig, st = { x: 0, y: 0, z: 0, facing: 0 };
    rig.bb.targets = null; rig.spin = 0;
    if (kind === 'dunk') { const d = get('dunk', id), u = (LAB.t % 1.6) / 1.2, k = keyLerp(d.keys, Math.min(1, u)); rig.bb.targets = k.B ? both(k.B) : { R: k.R, L: k.L }; rig.spin = d.spin * clamp((u - .2) / .65, 0, 1); st.z = Math.sin(Math.min(1, u) * Math.PI) * 40; st.air = u < 1; st.flip = d.flip ? clamp((u - .25) / .5, 0, .999) : 0; st.expr = 'shout'; }
    else if (kind === 'move') { rig.bb.targets = MOVES[id](LAB.t % 1.4); st.expr = 'smile'; }
    else if (kind === 'dribble') { const u = (LAB.t * 2.2) % 1, f = (2 * u - 1) ** 2, hip = rig.o.hipZ; rig.bb.targets = { R: [5, 6.5, Math.max(hip * f + 3, hip - 2)], L: [6, -5, 19] }; }
    else if (kind === 'jumpshot') { const u = (LAB.t % 1.2) / .8; rig.bb.targets = { R: [3, 1, lerp(22, 38, Math.min(1, u))], L: [2.5, -2.2, 30] }; st.z = Math.sin(Math.min(1, u) * Math.PI) * 30; st.air = true; }
    else if (kind === 'block') { rig.bb.targets = both([1, 0, 40], 3); st.z = Math.abs(Math.sin(LAB.t * 2.5)) * 34; st.air = true; st.expr = 'shout'; }
    else if (kind === 'shove') { const u = LAB.t % .8; rig.bb.targets = u < .1 ? both([3, 0, 20], 3.5) : both([12, 0, 21], 3); st.expr = 'angry'; }
    else if (kind === 'knocked') { const u = LAB.t % 1.6; st.down = u < .9 ? Math.min(1, u / .15) : Math.max(0, 1 - (u - .9) / .3); st.hurt = u < .3; }
    else if (kind === 'defense') { rig.bb.targets = both([3, 0, 22], 8); st.pose = 'crouch'; st.vx = Math.sin(LAB.t * 3) * 40; }
    rig.update(sdt, st);
  },
  draw(r) {
    menuBackdrop(r, LAB.t);
    r.overlay(g => {
      const clips = LAB_CLIPS(), [kind, id] = clips[LAB.clip], d = get('player', LAB_PLAYERS()[LAB.player]);
      txt(g, 'ANIMATION LAB', r.W / 2, 10, UI.gold, 2, 'center');
      txt(g, (kind === 'dunk' ? get('dunk', id).banner : (id || kind).toUpperCase()) + '   ' + d.name + (LAB.slow ? '   SLOW x.25' : ''), r.W / 2, 30, '#ffffff', 1, 'center');
      if (LAB.rig) { const x = r.W / 2, y = Math.round(r.H * .72); px.blend(g, .4, 'normal', () => px.ddisc(g, x, y + 2, 14, '#000000', .5)); LAB.rig.draw(g, x, y - Math.round(LAB.rig.z * .87), E.charView(E.VIEWS.side)); }
      promptBar(g, r, '{move} CLIP / PLAYER   {confirm} SLOW MOTION   {cancel} BACK');
    });
  }
});

/* ---- the shootaround: a rim-physics bench. A shooter fires seeded shots from spots all over the half court; the table
 * compares the decided outcome with what the ball actually did (they should agree), with the rim and board bounce live ---- */
const SA = { n: 0, dec: 0, made: 0, agree: 0, t: 0, chance: 0, last: '', pending: null };
SCENES.shootaround = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: true,
  enter() {
    S.scene = 'shootaround'; Object.assign(SA, { n: 0, dec: 0, made: 0, agree: 0, t: 0, chance: 0, last: '', pending: null });
    startMatch({ court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [], quarter: 300, seed: 77, powerups: false, twists: false, cheats: { freezeClock: true, freezeShot: true } });
    for (const p of S.players) { p.src = { kind: 'bench', read(q) { Object.assign(q.cmd, emptyCmd()); } }; if (p.slot) { p.x = 160 + p.slot * 40; p.y = Y0 + 20; } }
    S.match.phase = 'live'; SA.rng = E.rng(5); music('camp'); FX.focusX = HOOPS[1].x - 120;
  },
  update(dt) {
    const m = S.match, p = S.players[0], h = HOOPS[1], b = S.ball; m.phase = 'live'; SA.t += dt;
    for (const I of game.players) {
      if (I.repeat('left', .3, .08)) setTune('rimBounce', tune('rimBounce') - .01); if (I.repeat('right', .3, .08)) setTune('rimBounce', tune('rimBounce') + .01);
      if (I.repeat('up', .3, .08)) setTune('boardBounce', tune('boardBounce') + .01); if (I.repeat('down', .3, .08)) setTune('boardBounce', tune('boardBounce') - .01);
      if (I.pressed('cancel')) return go('menu');
    }
    if (SA.pending) {   // the shot in the air: settled when it scores or comes to the floor
      const pd = SA.pending; pd.t += dt;
      if (m.score[0] !== pd.score || (b.z <= BALL_R + 1 && b.state === 'loose') || pd.t > 4) { const went = m.score[0] !== pd.score; SA.n++; if (pd.made) SA.dec++; if (went) SA.made++; if (went === pd.made) SA.agree++; SA.last = (pd.made ? 'DECIDED MAKE' : 'DECIDED MISS') + ' -> ' + (went ? 'IN' : 'OUT'); SA.pending = null; SA.t = 0; m.score = [0, 0]; }
    } else if (SA.t > .5) {
      const a = (SA.rng() - .5) * 2.6, d = 40 + SA.rng() * 200; p.x = h.x - Math.cos(a) * d; p.y = clamp(h.y + Math.sin(a) * d, Y0 + 6, Y1 - 6); p.state = 'run'; p.facing = Math.atan2(h.y - p.y, h.x - p.x);
      p.rig.update(1 / 120, { x: p.x, y: p.y, z: 0, facing: p.facing }); giveBall(p, 'give'); m.score = [0, 0];
      const was = S.cheats.shots; releaseShot(p); S.cheats.shots = was; SA.chance += S.lastShot.chance; SA.pending = { made: S.ball.shot.made, score: m.score[0], t: 0 };
    }
    for (const q of S.players) playerStep(q, dt); ballStep(dt); if (S.ball.shot) S.ball.shot.t += dt;
    hoopStep(dt, 0); FX.focusX = approach(FX.focusX, HOOPS[1].x - 110, dt * 200); game.focus(FX.focusX, YM - 30, 0); Caption.update(dt);
  },
  draw(r) {
    drawMatchWorld(r);
    r.overlay(g => {
      panel(g, 8, 8, 200, 92, 'SHOOTAROUND');
      const pct = (a, b2) => b2 ? Math.round(a / b2 * 100) + '%' : '--';
      txt(g, 'SHOTS ' + SA.n + '   DECIDED MAKES ' + pct(SA.dec, SA.n), 16, 30, '#ffffff', 1);
      txt(g, 'BALL WENT IN ' + pct(SA.made, SA.n) + '   AVG CHANCE ' + (SA.n ? Math.round(SA.chance / Math.max(1, SA.n + (SA.pending ? 1 : 0)) * 100) + '%' : '--'), 16, 41, '#ffffff', 1);
      txt(g, 'PHYSICS AGREES ' + pct(SA.agree, SA.n), 16, 52, SA.n && SA.agree / SA.n < .9 ? UI.bad : UI.good, 1);
      txt(g, 'RIM ' + tune('rimBounce').toFixed(2) + '   BOARD ' + tune('boardBounce').toFixed(2), 16, 63, UI.gold, 1);
      txt(g, SA.last, 16, 76, UI.dim, 1);
      promptBar(g, r, '{move} RIM / BOARD BOUNCE   {cancel} BACK');
    });
  }
};

/* ---- 50-hub.js ---- */
/* AI HUB (Session Protocol v1, shared world): straight into "HUB SHOWDOWN", two halves. The host's copy runs the match;
 * each other copy sends its player's stick, held buttons and button edges 15 times a second and renders the host's
 * snapshots (100 ms behind, interpolated; its own player predicted and pulled toward the host). Our own card, ready with no
 * key press, leaving players turn CPU, time-up and the end are handled here. Outside a session nothing here runs. */
const NET = { role: null, info: null, card: null, started: false, startAt: 0, seq: 0, edges: [], edgeId: 0, lastSnap: 0, snaps: [], seen: new Set(), over: false, ended: null, hostLeft: false, sentAt: 0, overlay: false, lastEdge: {}, finished: false, rx: 0, tx: 0 };
const STATES = ['run', 'air', 'jumpshot', 'layup', 'dunk', 'hang', 'knocked', 'spin', 'shove', 'steal', 'inbound'];
const BSTATES = ['dead', 'held', 'dribble', 'pass', 'shot', 'loose'];
const PHASES = ['tipoff', 'live', 'clockout', 'scored', 'inbound', 'break', 'sponsor', 'over'];
const EV_KEYS = ['type', 'slot', 'victim', 'name', 'victimName', 'dunkId', 'dunk', 'three', 'alleyoop', 'dist', 'kind', 'team', 'points', 'layup', 'jackpot', 'goaltend', 'id', 'perfect', 'rel', 'made', 'gold', 'hoop', 'shatter'];
const NET_EVENTS = new Set(['basket', 'block', 'steal', 'shove', 'ankles', 'posterized', 'supernovaOn', 'supernovaOff', 'shatter', 'reboot', 'twist', 'overtime', 'dunkStart', 'slam', 'rim', 'backboard', 'release', 'powerupPick', 'powerupSpawn', 'quarterEnd', 'halftime', 'gameEnd', 'tipoff', 'goaltend', 'caption', 'knockdown', 'shotClockViolation']);
const seatSlot = seat => [0, 2, 1, 3][seat];
function hubRoster(n) {
  const R = AIHub.rng('roster'), a = Math.floor(R() * 4); let b = Math.floor(R() * 3); if (b >= a) b++;
  return { home: STREET_TEAMS[a], away: STREET_TEAMS[b], court: get('team', STREET_TEAMS[a]).court, seed: Math.floor(R() * 1e9) };
}
async function hubBoot() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) { S.hubFallback = true; go('title'); return; }
  NET.info = info; NET.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; S.net = NET;
  AIHub.on('card', c => { NET.card = c; });
  AIHub.on('start', () => { NET.started = true; NET.cardDone = true; });
  AIHub.on('message', (d, from) => hubMessage(d, from));
  AIHub.on('leave', e => hubLeave(e));
  AIHub.on('time-up', () => { if (NET.role !== 'client') hubFinish(); });
  AIHub.on('end', e => { NET.ended = e || { reason: 'finished' }; A.music(null); musicName = null; Crowd.stop(); game.players.forEach(I => I.clear && I.clear()); });
  go('hub', {}, { fade: 0 });
  AIHub.ready();
  addEventListener('keydown', e => {   // the card's answers, straight from the keys (Enter: ready; T: more time)
    if (NET.cardDone || NET.ended) return;
    if (e.key === 'Enter') AIHub.answer('ready'); if (e.key === 't' || e.key === 'T') AIHub.answer('more');
  });
}
/** the match config every copy builds the same way (from AIHub.rng) */
function hubCfg() {
  const info = NET.info, ro = hubRoster(info.players.length), limit = info.limitMs ? info.limitMs / 1000 : 240, half = clamp(Math.floor((limit - 14) / 2), 12, 90);
  const humans = info.players.map((pl, seat) => {
    const slot = seatSlot(seat), mine = pl.id === info.me && NET.role !== 'server';
    return { slot, seat: pl.id, tag: (pl.name || 'P' + (seat + 1)).toUpperCase().slice(0, 8), color: pl.color || E.PLAYER_COLORS[seat], input: mine ? game.input : null, src: mine ? null : NetSource(pl.id) };
  });
  return { court: ro.court, mode: 'hub', teams: [{ id: ro.home }, { id: ro.away }], humans, quarter: half, periods: 2, difficulty: 'pro', powerups: true, twists: true, seed: ro.seed, cheats: {} };
}
SCENES.hub = {
  isMatch: true, view: 'broadcast', input: KEYS, pausable: false,
  enter() {
    S.scene = 'hub'; const cfg = hubCfg(); lastMatchCfg = cfg; startMatch(cfg); S.mode = 'hub';
    for (const p of S.players) if (p.seat !== undefined && !p.human) p.human = null;
    S.match.phase = 'tipoff'; S.match.hold = true;
    const court = get('court', cfg.court); if (NET.role !== 'server') { game.weather = court.weather ? Object.assign({}, court.weather) : null; music('menu'); }
    FX.focusX = XM;
    if (NET.role === 'host' || NET.role === 'server') AIHub.send({ t: 'r', home: cfg.teams[0].id, away: cfg.teams[1].id, court: cfg.court }, { reliable: true });
  },
  update(dt) {
    const m = S.match; if (!m) return;
    if (NET.ended) { cameraStep(dt); return; }
    // the session overlay (not a pause): Options/Esc, not while Create is held
    if (!NET.cardDone) return hubCardStep(dt);
    if (game.input.pressed('pause') && !(game.input.held && game.input.held.has('Pad8'))) NET.overlay = !NET.overlay;
    if (NET.overlay) hubOverlayStep();
    const t = AIHub.time();
    if (m.hold) { if (t >= 0) { m.hold = false; if (NET.role !== 'server') music(get('court', S.court).music); } else { cameraStep(dt); poseOnly(dt); return; } }
    if (NET.role === 'client') { clientStep(dt); return; }
    // host and server: run the world
    matchStep(dt);
    if (m.sudden) { m.suddenT = (m.suddenT || 0) + dt; if (m.suddenT > 30 && m.phase !== 'over') endGame(); }
    if (m.phase === 'over' && !NET.finished && m.overT > .8) hubFinish();
    if (NET.role !== 'server') { cameraStep(dt); Caption.update(dt); Crowd.update(dt, true); }
    hoopStep(dt, m.wind ? m.wind.x / Math.max(1, tune('windStrength')) : 0);
    if (game.real - NET.sentAt >= .066) { NET.sentAt = game.real; hostSend(); }
  },
  draw(r) {
    if (NET.role === 'server') { r.sky(['#05040a', '#0a0814', '#10101a']); r.overlay(g => { txt(g, 'HOSTING', r.W / 2, r.H / 2 - 8, UI.gold, 2, 'center'); const m = S.match; if (m) txt(g, teamName(0) + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + teamName(1), r.W / 2, r.H / 2 + 14, '#ffffff', 1, 'center'); }); return; }
    drawMatchWorld(r);
    r.overlay(g => {
      if (!NET.cardDone) return drawHubCard(g, r);
      drawHud(g, r);
      const t = AIHub.time();
      if (S.match.hold && t > -4) E.font.title(g, t < 0 ? String(Math.ceil(-t / 1000)) : 'BLAM!', r.W / 2, r.H * .35, { scale: 5, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 3, align: 'center' });
      if (NET.role === 'client' && game.real - NET.lastSnap > 1 && !NET.ended && !S.match.hold) txt(g, NET.hostLeft ? 'HOST LEFT' : 'WAITING FOR HOST', r.W / 2, r.H * .45, UI.gold, 2, 'center');
      if (NET.hostLeft) txt(g, 'HOST LEFT', r.W / 2, r.H * .45, UI.gold, 2, 'center');
      if (NET.ended) { const m = S.match; E.ui.box(g, r.W / 2 - 120, r.H * .3, 240, 60, { bg: '#140c24', border: UI.gold }); txt(g, 'FINAL', r.W / 2, r.H * .3 + 8, UI.gold, 2, 'center'); txt(g, teamName(0) + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + teamName(1), r.W / 2, r.H * .3 + 32, '#ffffff', 1, 'center'); }
      if (NET.overlay) drawHubOverlay(g, r);
    });
  }
};
function poseOnly(dt) { for (const p of S.players) poseAndBall(p, dt); }

/* ---- our card: the court at night, both crews lined up, names over the players they will control ---- */
function hubCardStep(dt) {
  const I = game.input;
  if (I.pressed('confirm')) AIHub.answer('ready');
  if (I.pressed('oop')) AIHub.answer('more');
  const cl = I.clicked(); if (cl && NET.cardBtns) { if (hitBox(cl, NET.cardBtns.ready)) AIHub.answer('ready'); if (hitBox(cl, NET.cardBtns.more)) AIHub.answer('more'); }
  cameraStep(dt); poseOnly(dt);
}
function drawHubCard(g, r) {
  const info = NET.info, c = NET.card || {}, sf = safe(r), m = S.match;
  px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a'));
  logo(g, r.W / 2, sf.y, 3, game.real);
  txt(g, 'HUB SHOWDOWN: ' + teamName(0) + ' VS ' + teamName(1) + ' AT ' + get('court', S.court).name, r.W / 2, sf.y + 34, UI.accent2, 1, 'center');
  txt(g, 'OUTSCORE THE OTHER CREW OVER TWO HALVES. NO FOULS!', r.W / 2, sf.y + 46, '#ffffff', 1, 'center');
  info.players.forEach((pl, k) => { const p = S.players[seatSlot(k)], ready = (c.ready || []).includes(pl.id), y = sf.y + 62 + k * 14; txt(g, (pl.name || 'P' + (k + 1)).toUpperCase().slice(0, 12), r.W / 2 - 10, y, pl.color || '#fff', 1, 'right'); txt(g, (p ? p.name + ' (' + teamName(p.team) + ')' : '') + (ready ? '  READY' : ''), r.W / 2 + 4, y, ready ? UI.good : UI.dim, 1); });
  const cpu = S.players.filter(p => p.seat === undefined).map(p => p.name); if (cpu.length) txt(g, 'CPU: ' + cpu.join(', '), r.W / 2, sf.y + 62 + info.players.length * 14, UI.dim, 1, 'center');
  const y2 = sf.y + 130;
  promptLine(g, '{move} RUN  {shoot} SHOOT  {turbo}+{shoot} DUNK  {pass} PASS/STEAL  {shove} SHOVE/SPIN  {oop} OOP', r.W / 2, y2, game.input, { align: 'center' });
  const left = c.paused ? 'PAUSED' : c.left != null ? 'STARTS IN ' + Math.ceil(c.left / 1000) : c.starting ? 'STARTING...' : '';
  txt(g, left, r.W / 2, y2 + 16, UI.gold, 2, 'center');
  if (NET.role !== 'server') {
    const bw = 110, by = y2 + 38; NET.cardBtns = { ready: [r.W / 2 - bw - 6, by, bw, 22], more: [r.W / 2 + 6, by, bw, 22] };
    E.ui.box(g, r.W / 2 - bw - 6, by, bw, 22, { bg: [UI.good, E.shade(UI.good, -.5)], border: '#ffffff' }); promptLine(g, '{confirm} READY', r.W / 2 - bw / 2 - 6, by + 6, game.input, { align: 'center' });
    E.ui.box(g, r.W / 2 + 6, by, bw, 22, { bg: c.asked ? [UI.gold, E.shade(UI.gold, -.5)] : '#2a1e44', border: '#ffffff' }); promptLine(g, (game.input.lastDevice === 'gamepad' ? '{oop}' : 'T') + ' MORE TIME', r.W / 2 + bw / 2 + 6, by + 6, game.input, { align: 'center' });
    if (c.asking) txt(g, c.asking + ' ASKED FOR MORE TIME', r.W / 2, by + 28, UI.dim, 1, 'center');
  }
}
/* ---- the session overlay: sound, voices, button symbols; the world keeps going ---- */
const HUB_OV = new FocusList([
  { label: 'SOUND', value: () => Math.round((game.settings.volume || 0) * 10) + '/10', side: d => game.settings.set('volume', clamp((game.settings.volume || 0) + d * .1, 0, 1)) },
  { label: 'VOICES', value: () => Math.round(setting('voiceVol') * 10) + '/10', side: d => game.settings.set('voiceVol', clamp(setting('voiceVol') + d * .1, 0, 1)) },
  { label: 'SYMBOLS', value: () => setting('symbols') === 'xbox' ? 'XBOX' : 'PLAYSTATION', side: () => game.settings.set('symbols', setting('symbols') === 'xbox' ? 'playstation' : 'xbox') },
  { label: 'CLOSE', onPick: () => { NET.overlay = false; } }
], { side: true, onBack: () => { NET.overlay = false; } });
function hubOverlayStep() { HUB_OV.update(1 / 120, [game.input]); }
function drawHubOverlay(g, r) { const w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3); panel(g, x - 6, y - 24, w + 12, 4 * 20 + 30, 'SESSION'); HUB_OV.draw(g, x, y, w, 17, { scale: 1, gap: 3 }); }

/* ---- the host: snapshots out; inputs in ---- */
function hostSend() {
  const m = S.match, b = S.ball, R = Math.round;
  const ev = S.events.filter(e => NET_EVENTS.has(e.type) && e.t >= m.time - 1).slice(-6).map(e => EV_KEYS.filter(k => e[k] !== undefined && e[k] !== '' && e[k] !== false).reduce((o, k) => (o[k] = typeof e[k] === 'number' ? Math.round(e[k] * 10) / 10 : e[k], o), {}));
  const pl = S.players.map(p => {
    const st = STATES.indexOf(p.state);
    let xa = 0, xb = 0;
    if (p.state === 'dunk' && p.dunk) { xa = all('dunk').indexOf(p.dunk.def); xb = R(p.dunk.t / p.dunk.T * 100); }
    else if (p.jump && (p.state === 'jumpshot' || p.state === 'layup')) { xa = R(p.jump.t * 100); xb = R((p.jump.apexT || p.jump.relT || .3) * 100); }
    else if (p.state === 'air' && p.jump) xa = ['block', 'rebound', 'tip', 'shot', 'dunkfall'].indexOf(p.jump.kind);
    else if (p.act) xa = R(p.act.t * 100);
    else if (p.state === 'knocked') xa = R(p.knock * 100);
    const flags = (p.nova ? 1 : 0) | (p.reboot > 0 ? 2 : 0) | (p.cmd.tD ? 4 : 0) | (p.dizzy > 0 ? 8 : 0) | ((p.powerup ? POWERUPS.indexOf(p.powerup.id) + 1 : 0) << 4);
    return [R(p.x), R(p.y), R(p.z), R(p.vx), R(p.vy), R(p.facing * 100), st, xa, xb, R(p.turbo * 100), flags, p.dribSide, R(p.dribPh * 100), p.id];
  });
  const g = [PHASES.indexOf(m.phase), m.quarter, R(m.clock * 10), R(m.shotClock * 10), m.score[0], m.score[1], (m.sudden ? 1 : 0) | (m.gold === 0 ? 2 : 0) | (m.gold === 1 ? 4 : 0) | (HOOP_FX[0].shattered ? 8 : 0) | (HOOP_FX[1].shattered ? 16 : 0), m.streak.slot, m.streak.n, R(m.breakT || 0), R(m.overclock)];
  const tw = m.twist ? { w: m.wind ? [R(m.wind.x), R(m.wind.y)] : 0, b: (m.twist.bombs || []).filter(x => !x.hit).map(x => [R(x.x), R(x.y), R(x.t * 10), R(x.max * 10)]), s: m.twist.slicks ? m.twist.slicks.map(s => [R(s.x), R(s.y), R(s.rx), R(s.ry)]) : 0, v: m.twist.ventOn ? 1 : 0 } : 0;
  const msg = { t: 's', n: ++NET.seq, a: R(AIHub.time()), g, b: [R(b.x), R(b.y), R(b.z), R(b.vx), R(b.vy), R(b.vz), b.owner ? b.owner.slot : -1, BSTATES.indexOf(b.state)], p: pl, pu: m.powerups.map(x => [POWERUPS.indexOf(x.id), R(x.x), R(x.y)]), j: m.jackpot ? [R(m.jackpot.x), R(m.jackpot.y)] : 0, tw, ev };
  if (m.phase === 'over') msg.over = 1;
  AIHub.send(msg, { reliable: m.phase === 'over' });
}
function hubMessage(d, from) {
  NET.rx++;
  if (!d || typeof d !== 'object') return;
  if (d.t === 'i' && NET.role !== 'client') {   // a client's input
    const p = S.players.find(q => q.seat === from); if (!p || !p.src || p.src.kind !== 'net') return;
    const st = p.src.st, last = NET.lastEdge[from] || 0;
    st.mx = clamp((d.m && d.m[0] || 0) / 64, -1, 1); st.my = clamp((d.m && d.m[1] || 0) / 64, -1, 1); st.held = d.h | 0;
    for (const [id, bit, down] of d.e || []) if (id > last) { st.edges.push([bit, down]); NET.lastEdge[from] = Math.max(NET.lastEdge[from] || 0, id); }
  }
  if (d.t === 's' && NET.role === 'client') { NET.snaps.push(Object.assign(d, { at: game.real })); if (NET.snaps.length > 12) NET.snaps.shift(); NET.lastSnap = game.real; if (S.match && S.match.hold && d.g[0] !== 0) S.match.hold = false; }
}
function hubLeave(e) {
  if (!e) return;
  if (NET.info && e.id === NET.info.host) { NET.hostLeft = true; return; }
  const p = S.players.find(q => q.seat === e.id); if (p) { p.src = CpuSource(); p.brain = p.brain || newBrain(p); p.human = null; p.seat = undefined; p.tag = null; emit('leave', { slot: p.slot }); }
}
function hubFinish() {
  if (NET.finished || NET.role === 'client') return; NET.finished = true;
  const m = S.match; if (!m) return;
  if (m.phase !== 'over') { m.winner = m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1; m.phase = 'over'; }
  hostSend();
  const humans = S.players.filter(p => p.seat !== undefined), ids = t => humans.filter(p => p.team === t).map(p => p.seat);
  const standings = m.winner < 0 ? [humans.map(p => p.seat)] : [ids(m.winner), ids(1 - m.winner)].filter(a => a.length);
  const scores = {}, stats = {}; for (const p of humans) { scores[p.seat] = m.score[p.team]; stats[p.seat] = { PTS: p.stats.PTS, DUNKS: p.stats.DNK, STL: p.stats.STL, BLK: p.stats.BLK }; }
  const awards = [];
  const best = (k, title, detail) => { const p = humans.slice().sort((a, b) => b.stats[k] - a.stats[k])[0]; if (p && p.stats[k] > 0) awards.push({ id: p.seat, title, detail: detail(p) }); };
  best('DNK', 'Dunk of the Round', p => p.stats.DNK + ' dunks'); best('STL', 'Pickpocket', p => p.stats.STL + ' steals'); best('BLK', 'The Wall', p => p.stats.BLK + ' blocks');
  const res = { standings, scores, stats, awards };
  if (humans.length === 1) res.won = m.winner === humans[0].team;
  try { AIHub.finish(res); } catch (e) { game.fail('hub finish', e); }
}

/* ---- a client: send the stick and buttons; render the host's world ---- */
const BITS = { shoot: 0, pass: 1, turbo: 2, shove: 3, oop: 4 };
function clientStep(dt) {
  const I = game.input, m = S.match;
  for (const [a, bit] of Object.entries(BITS)) { if (I.pressed(a)) NET.edges.push([++NET.edgeId, bit, 1]); if (I.released(a)) NET.edges.push([++NET.edgeId, bit, 0]); }
  if (NET.edges.length > 8) NET.edges.splice(0, NET.edges.length - 8);
  if (game.real - NET.sentAt >= .066) {
    NET.sentAt = game.real; const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
    const h = (I.down('shoot') ? 1 : 0) | (I.down('pass') ? 2 : 0) | (I.down('turbo') ? 4 : 0);
    AIHub.send({ t: 'i', s: ++NET.seq, a: Math.round(AIHub.time()), m: [Math.round(d[0] * 64), Math.round(d[1] * 64)], h, e: NET.edges.slice() }, { reliable: false }); NET.tx++;
  }
  applySnapshots(dt);
  cameraStep(dt); Caption.update(dt); Crowd.update(dt, true); hoopStep(dt, 0);
}
function applySnapshots(dt) {
  const L0 = NET.snaps; if (!L0.length) { poseOnly(dt); return; }
  const target = game.real - .1; let a = L0[0], b = L0[L0.length - 1];
  for (let i = 0; i < L0.length - 1; i++) if (L0[i].at <= target && L0[i + 1].at >= target) { a = L0[i]; b = L0[i + 1]; break; }
  const u = b.at > a.at ? clamp((target - a.at) / (b.at - a.at), 0, 1) : 1, m = S.match, ball = S.ball, me = S.players.find(p => p.seat === NET.info.me);
  // the match
  const G = b.g; m.phase = PHASES[G[0]] || 'live'; m.quarter = G[1]; m.clock = G[2] / 10; m.shotClock = G[3] / 10; m.score = [G[4], G[5]]; m.sudden = !!(G[6] & 1); m.gold = G[6] & 2 ? 0 : G[6] & 4 ? 1 : null;
  HOOP_FX[0].shattered = !!(G[6] & 8); HOOP_FX[1].shattered = !!(G[6] & 16); m.streak = { slot: G[7], n: G[8] }; m.breakT = G[9]; m.overclock = G[10];
  if (m.phase === 'break') m.breakKind = m.quarter === 1 ? 'halftime' : 'quarter';
  // players
  b.p.forEach((pb, k) => {
    const p = S.players[k], pa = a.p[k] || pb; if (!p) return;
    if (pb[13] && pb[13] !== p.id) { const np = makePlayer(k, pb[13], p.team); Object.assign(np, { seat: p.seat, tag: p.tag, tagColor: p.tagColor, human: p.human, src: p.src }); S.players[k] = np; return; }
    const st = STATES[pb[6]] || 'run', x = lerp(pa[0], pb[0], u), y = lerp(pa[1], pb[1], u);
    if (p === me && st === 'run' && Math.hypot(p.x - x, p.y - y) < 48) {   // our own player: predicted from the stick, pulled toward the host
      const mv = game.input.move(), d = game.view.screenDirToGround(mv[0], mv[1]), sp = moveSpeed(p);
      p.vx = approach(p.vx, d[0] * sp, tune('accel') * dt); p.vy = approach(p.vy, d[1] * sp, tune('accel') * dt);
      p.x += p.vx * dt; p.y += p.vy * dt; p.x = lerp(p.x, x, .15); p.y = lerp(p.y, y, .15);
    } else { p.x = x; p.y = y; p.vx = pb[3]; p.vy = pb[4]; }
    p.z = lerp(pa[2], pb[2], u); p.facing = pb[5] / 100; p.state = st; p.turbo = pb[9] / 100; p.dribSide = pb[11] || 1; p.dribPh = pb[12] / 100;
    const fl = pb[10]; p.nova = fl & 1 ? (p.nova || { baskets: 0, t: 0 }) : null; p.reboot = fl & 2 ? 1 : 0; p.cmd.tD = !!(fl & 4); p.dizzy = fl & 8 ? 1 : 0; const pu = (fl >> 4) - 1; p.powerup = pu >= 0 ? { id: POWERUPS[pu], t: 10 } : null;
    p.dunk = st === 'dunk' ? { def: all('dunk')[pb[7]] || get('dunk', 'hammer'), t: pb[8] / 100, T: 1, slammed: pb[8] > 92, oop: false } : null;
    p.jump = st === 'jumpshot' || st === 'layup' ? { kind: 'shot', t: pb[7] / 100, apexT: pb[8] / 100, relT: pb[8] / 100 } : st === 'air' ? { kind: ['block', 'rebound', 'tip', 'shot', 'dunkfall'][pb[7]] || 'rebound', t: 0 } : null;
    p.act = st === 'shove' || st === 'steal' ? { kind: st, t: pb[7] / 100, T: .45 } : null;
    if (st === 'knocked') { p.knock = pb[7] / 100; p.st = Math.max(0, .8 - p.knock); }
  });
  // the ball
  const ba = a.b, bb = b.b; ball.owner = bb[6] >= 0 ? S.players[bb[6]] : null; ball.state = BSTATES[bb[7]] || 'loose';
  for (const p of S.players) poseAndBall(p, dt);
  if (!ball.owner) { ball.x = lerp(ba[0], bb[0], u); ball.y = lerp(ba[1], bb[1], u); ball.z = lerp(ba[2], bb[2], u); ball.vx = bb[3]; ball.vy = bb[4]; ball.vz = bb[5]; }
  ball.spin += Math.hypot(ball.vx, ball.vy) * dt * .15;
  // floor things and twists
  m.powerups = (b.pu || []).map(([i, x, y]) => ({ id: POWERUPS[i], x, y, t: 5 }));
  m.jackpot = b.j ? { x: b.j[0], y: b.j[1], t: 10 } : null;
  if (b.tw) { m.twist = m.twist || { kind: get('court', S.court).twist, bombs: [] }; m.wind = b.tw.w ? { x: b.tw.w[0], y: b.tw.w[1] } : null; m.twist.bombs = (b.tw.b || []).map(([x, y, t, mx]) => ({ x, y, t: t / 10, max: mx / 10 })); m.twist.slicks = b.tw.s ? b.tw.s.map(([x, y, rx, ry]) => ({ x, y, rx, ry })) : null; m.twist.ventOn = !!b.tw.v; }
  // events: each plays its sounds, captions and effects once
  for (const s of L0) for (const e of s.ev || []) if (!NET.seen.has(e.id)) { NET.seen.add(e.id); const ev = Object.assign({}, e); clientEvent(ev); }
}
function clientEvent(ev) {
  const t = ev.type;
  if (t === 'caption') return;
  const fake = Object.assign({}, ev); delete fake.id;
  if (t === 'slam') { const h = HOOPS[ev.hoop || (S.players[ev.slot] && S.players[ev.slot].team === 0 ? 1 : 0)]; if (h) dunkFx(S.players[ev.slot] || S.players[0], h, ev.shatter); }
  if (t === 'basket') sfxAt('swish');
  if (t === 'rim') sfxAt('rim');
  if (t === 'block') sfxAt('block'); if (t === 'steal') sfxAt('steal'); if (t === 'shove') sfxAt('shove');
  for (const fn of (LISTENERS[t] || []).slice()) { try { fn(fake); } catch (e) { /* a listener that needs host state */ } }
}

/* ---- 90-start.js ---- */
/* START: every step's shared hooks (idle detection for the attract mode, the button symbols, the dev panel, touch-only
 * detection), the debug handle, deep links, and the boot. In an AI Hub session the game opens straight into the round. */
function stepHooks(dt) {
  const sym = setting('symbols'); for (const I of game.players) if (I.glyphs !== sym) I.glyphs = sym;
  idleTick(dt);
  if (S.touchOnly && (game.input.lastDevice === 'keyboard' || game.input.lastDevice === 'gamepad') && game.input.anyPressed()) S.touchOnly = false;
}
/** touch-only: a touch screen with no fine pointer and no hover, and no gamepad or key seen yet */
function detectTouchOnly() {
  try {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0, fine = mm('(any-pointer: fine)'), hover = mm('(any-hover: hover)');
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads() || []).some(Boolean) : false;
    return touch && !fine && !hover && !pads;
  } catch (e) { return false; }
}
SCENES.boot = { update() { if (HUB) { if (!S.hubStarted) { S.hubStarted = true; hubBoot().catch(e => { try { AIHub.fail(String(e && e.message || e)); } catch (e2) { /* no hub */ } }); } return; } if (!deepLink()) go('title', null, { fade: 0 }); }, draw(r) { r.sky(['#05040a', '#0a0814', '#140c24']); } };
// wrap every scene's update: the hooks first; the dev panel takes the input while it is open
for (const [name, sc] of Object.entries(SCENES)) {
  const up = sc.update;
  sc.update = function (dt) {
    stepHooks(dt);
    if (S.devOpen && sc.isMatch) devUpdate(dt);
    return up.call(this, dt);
  };
  sc.touch = [];
}
// dev time controls ride on the camera's time scale
const camStep0 = cameraStep;
cameraStep = function (dt) { camStep0(dt); if (DEV.speed !== 1) game.timeScale *= DEV.speed; if (DEV.freeze) { game.timeScale = DEV.step ? 1 : 0; DEV.step = false; } };

game.debug = {
  snapshot() {
    const m = S.match, b = S.ball;
    return { scene: game.sceneName, mode: S.mode, court: S.court, phase: m && m.phase, quarter: m && m.quarter, clock: m && +m.clock.toFixed(1), shotClock: m && +m.shotClock.toFixed(1), score: m && m.score.slice(), possession: b && b.owner ? b.owner.team : null,
      ball: b && { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.state, owner: b.owner ? b.owner.slot : -1 },
      players: S.players.map(p => ({ slot: p.slot, id: p.id, team: p.team, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: !!p.nova, powerup: p.powerup && p.powerup.id, source: p.src && p.src.kind, intent: p.intent })),
      lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, dev: S.devOpen, touchOnly: S.touchOnly }, attract: { segment: ATT.seg, phase: ATT.phase }, net: { role: NET.role, seat: NET.info && NET.info.me } };
  },
  teleport(slot, x, y) { const p = S.players[slot]; if (p) { p.x = x; p.y = y; } },
  give(slot) { giveBall(S.players[slot], 'give'); if (S.match) S.match.phase = 'live'; },
  setScore(a, b) { S.match.score = [a, b]; }, setClock(s) { S.match.clock = s; }, setQuarter(q) { S.match.quarter = q; },
  go(scene, data) { go(scene, data, { fade: 0 }); }, spawnPowerup(id, x, y) { spawnPowerup(id, x, y); }, cheat(name, on) { S.cheats[name] = on; }, tune(k, v) { setTune(k, v); }
};
if (typeof window !== 'undefined') window.__bb = { REPORT_INFO, TESTING_FEEDBACK, ENGINE_FEEDBACK, PROMPT_FEEDBACK, S, game, TUNING, emit, on, debug: game.debug, setTune, resetTuning, startMatch, giveBall, startDunk, releaseShot, jump, knockDown, novaOn, spawnPowerup, playBeat, startLesson, LESSONS, CAMP, ATT, SEGMENTS, DEV, devRows, openDev, closeDev, Voice, LINES, BEATS, get, all, REG, isThree, HOOPS, X0, X1, Y0, Y1, XM, YM, RIM_Z, buildCfg, exhibitionDefault, NET, brainStep, newBrain, emptyCmd, SCENES, hubBoot, matchStep, owner, hasBall, dunkRange, canDunkFrom, attackHoop, STATES, COURTS, POWERUPS, Caption, setupTwist, overclock, endGame, hubCfg, shotChance, tourStops, tourCfg, saveProgress, loadProgress, MAIN, FX, glyph, codeFor, actionGlyph, promptLine, measureGlyph, HOOP_FX, detectTouchOnly, inputSeen, IDLE, hallList, qualifies, setting, RS, initialsStep };

/** deep links: #title #attract #exhibition/<court>/<home>-<away> #tour/<stop> #story/<beat> #camp/<lesson> #results #credits #about #dev #animlab #howto #hall */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1), [a, b, c] = h.split('/');
  if (!a) return false;
  if (a === 'exhibition') { const [home, away] = (c || 'hightops-breakers').split('-'); go('match', Object.assign(exhibitionDefault(), { court: b || 'skybox', teams: [{ id: home || 'hightops' }, { id: away || 'breakers' }], boss: home === 'blambots' || away === 'blambots' }), { fade: 0 }); return true; }
  if (a === 'dev') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.devOpen = true; devAutopilot(true); } }), { fade: 0 }); return true; }
  if (a === 'tour') { S.progress.tour = { team: 'hightops', pick: 0, stop: clamp((+b || 1) - 1, 0, 3), score: 0, cheats: true }; go('tourmap', null, { fade: 0 }); return true; }
  if (a === 'story') { playBeat(b && BEATS[b] ? b : 'prologue', () => go('menu')); return true; }
  if (a === 'camp') { const k = Math.max(0, LESSONS.findIndex(l => l.id === b)); startLesson(k); return true; }
  if (a === 'attract') { go('attract', { from: 'title', segment: clamp((+b || 1) - 1, 0, 4) }, { fade: 0 }); return true; }
  if (a === 'results') { go('match', Object.assign(exhibitionDefault(), { onEnter: () => { S.match.score = [42, 38]; endGame(); S.match.overT = 9; } }), { fade: 0 }); return true; }
  if (a === 'credits') { go('credits', { then: () => go('menu') }, { fade: 0 }); return true; }
  if (SCENES[a] && ['title', 'menu', 'about', 'howto', 'hall', 'animlab', 'shootaround', 'join', 'camplist', 'tourstart'].includes(a)) { go(a, a === 'about' ? { page: +b || 0 } : {}, { fade: 0 }); return true; }
  return false;
}
game.start({
  scenes: SCENES, scene: 'boot',
  boot: { title: 'BASKETBLAM', steps: [
    ['Reading the playbook', () => { loadProgress(); loadTuning(); S.touchOnly = !HUB && detectTouchOnly(); game.input.touchEnabled = false; }],
    ['Painting the courts', () => { for (const id of COURTS) courtMap(id); }],
    ['Lacing up the crews', () => { for (const t of all('team')) for (const id of t.players) npcRig(id); for (const n of all('npc')) npcRig(n.id); }]
  ] }
});
if (typeof addEventListener === 'function') { addEventListener('gamepadconnected', () => { S.touchOnly = false; IDLE.t = 0; }); addEventListener('keydown', () => { if (S.touchOnly) S.touchOnly = false; }); }

})();
