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
