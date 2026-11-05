/* BASKETBLAM - core: constants, tuning, settings, shared state, event bus */
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const PI = Math.PI, TAU = PI * 2;
const HAS_WIN = typeof window !== 'undefined';
const HUB = !!(HAS_WIN && window.AIHub && window.AIHub.active);
const NOW = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---- geometry (world units; one tile = 16; z up). World = court-local + (OX, OY) ---- */
const OX = 64, OY = 112, CW = 640, CH = 288;
const COURT = { x0: OX, x1: OX + CW, y0: OY, y1: OY + CH, cx: OX + CW / 2, cy: OY + CH / 2 };
const RIM_Z = 80, RIM_R = 9, BALL_R = 4.5;
const HOOPS = [{ x: OX + 52, y: OY + 144, dir: 1, side: 0 }, { x: OX + CW - 52, y: OY + 144, dir: -1, side: 1 }];
// team 0 (HOME) attacks the RIGHT hoop (index 1); team 1 attacks the LEFT hoop (index 0)
const attackHoop = team => HOOPS[team === 0 ? 1 : 0];
const defendHoop = team => HOOPS[team === 0 ? 0 : 1];
const THREE_R = 136;

const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);
E.VIEWS.broadcast = BROADCAST;
const HIGHCAM = new E.View('high', 'High', 0, 52, 1, 1);
E.VIEWS.high = HIGHCAM;

/* ---- controls ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], shove: ['KeyQ', 'KeyL', 'Pad1'],
  oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
const CONTROL_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt' };

/* ---- tuning: the single home of the important numbers (live dev sliders) ---- */
const TUNING = {};
const TUNE_DEFS = [
  // key, label, def, min, max, step, group, help
  ['runSpeed', 'Run speed', 92, 50, 160, 1, 'MOVEMENT', 'Top speed on foot'],
  ['accel', 'Acceleration', 900, 300, 2000, 25, 'MOVEMENT', 'How fast players change speed'],
  ['turboMult', 'Turbo speed', 1.5, 1, 2.4, .05, 'MOVEMENT', 'Speed multiplier while turbo is held'],
  ['turboDrain', 'Turbo drain /s', .30, 0, 1.5, .05, 'MOVEMENT', 'Turbo used per second while sprinting'],
  ['turboRefill', 'Turbo refill /s', .20, 0, 1.5, .05, 'MOVEMENT', 'Turbo regained per second'],
  ['playerGravity', 'Player gravity', 900, 400, 1800, 20, 'MOVEMENT', 'How hard players fall'],
  ['jumpShotVz', 'Jump power', 250, 150, 420, 5, 'MOVEMENT', 'Takeoff speed of a jump shot or block'],
  ['ballGravity', 'Ball gravity', 760, 300, 1500, 20, 'BALL', 'How hard the ball falls'],
  ['ballBounce', 'Floor bounce', .62, .3, .9, .01, 'BALL', 'Floor restitution'],
  ['rimBounce', 'Rim bounce', .45, .2, .8, .01, 'BALL', 'Rim restitution'],
  ['shotBase', 'Shot accuracy', 1, .5, 1.4, .02, 'SHOOTING', 'Scales every make chance'],
  ['contestPenalty', 'Contest penalty', .35, 0, .8, .01, 'SHOOTING', 'Make chance lost to a tight defender'],
  ['perfectBonus', 'Perfect release', 1.15, 1, 1.5, .01, 'SHOOTING', 'Make chance multiplier on a green release'],
  ['threeBonus', 'Three-point worth', 3, 2, 5, 1, 'SHOOTING', 'Points for a shot from beyond the arc'],
  ['dunkRange', 'Dunk range', 72, 30, 140, 1, 'DUNKS', 'Distance a dunk can start from'],
  ['dunkReject', 'Dunk block chance', .5, 0, 1, .01, 'DUNKS', 'Chance a airborne defender rejects a dunk'],
  ['stealChance', 'Steal chance', .28, 0, .9, .01, 'DEFENSE', 'Base chance a swipe takes the ball'],
  ['shoveForce', 'Shove force', 150, 60, 320, 5, 'DEFENSE', 'How far a shove flings a player'],
  ['knockdownTime', 'Knockdown time', .75, .2, 2, .05, 'DEFENSE', 'Seconds a shoved player stays down'],
  ['blockChance', 'Block chance', .78, 0, 1, .01, 'DEFENSE', 'Chance a well-timed jump swats the shot'],
  ['novaStreak', 'Supernova streak', 3, 1, 6, 1, 'FLOW', 'Straight baskets before a team goes SUPERNOVA'],
  ['shotClock', 'Shot clock', 20, 8, 40, 1, 'FLOW', 'Seconds to get a shot up'],
  ['powerupEvery', 'Power-up every', 18, 5, 60, 1, 'FLOW', 'Seconds between power-up drops'],
  ['cpuSkill', 'CPU skill', 1, .4, 1.6, .02, 'CPU', 'How sharp the CPU is (reflexes, shots)'],
  ['comeback', 'Comeback help', .5, 0, 1, .05, 'CPU', 'How much the trailing side is helped'],
  ['gameSpeed', 'Game speed', 1, .4, 1.6, .05, 'FLOW', 'Time scale of the whole game']
];
for (const [key, label, def, min, max, step, group, help] of TUNE_DEFS) TUNING[key] = { key, label, v: def, def, min, max, step, group, help };
const tune = k => TUNING[k].v;
const resetTuning = () => { for (const k in TUNING) TUNING[k].v = TUNING[k].def; };
const saveTuning = () => { const o = {}; for (const k in TUNING) o[k] = TUNING[k].v; E.store.set('bb:tuning', o); return o; };
const loadTuning = () => { const o = E.store.get('bb:tuning', null); if (o) for (const k in o) if (TUNING[k]) TUNING[k].v = clamp(+o[k] || TUNING[k].def, TUNING[k].min, TUNING[k].max); };

/* ---- the game ---- */
const GAME_SETTINGS = [
  { key: 'glyphs', label: 'Button prompts', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'quarter', label: 'Quarter length', options: ['1:00', '1:30', '2:00', '3:00'], value: '1:30' },
  { key: 'difficulty', label: 'CPU difficulty', options: ['Rookie', 'Pro', 'All-Star', 'Legend'], value: 'Pro' },
  { key: 'camera', label: 'Camera', options: ['Broadcast', 'High'], value: 'Broadcast' },
  { key: 'announcer', label: 'Announcers', options: ['On', 'Off'], value: 'On' },
  { key: 'rumble2', label: 'Controller rumble on slams', options: ['On', 'Off'], value: 'On' }
];
const S = {
  scene: 'title', mode: 'exhibition', court: 'alley', teams: [0, 1], humans: {}, // slot -> input
  players: [], ball: null, match: null, rng: E.rng(1), fxRng: E.rng(2), events: [], powerups: [], twist: {}, cheats: { infTurbo: false, big: false, noClock: false, autopilot: false },
  progress: null, dev: { open: false, tab: 0, row: 0, overlay: false }, camera: { x: COURT.cx, zoom: 1 }, hub: null, lastInput: NOW(), padSeen: false, keySeen: false,
  fx: { banners: [], shake: 0, flash: 0, slow: 0, slowT: 0, zoomPunch: 0, shatter: 0, cam: 0 }, announcerQueue: []
};
const bus = {};
const on = (t, fn) => (bus[t] = bus[t] || []).push(fn);
const emit = (type, data = {}) => {
  data.type = type; data.t = S.match ? S.match.time : 0;
  S.events.push(data); if (S.events.length > 64) S.events.shift();
  for (const fn of bus[type] || []) { try { fn(data); } catch (e) { if (game) game.fail('event ' + type, e); } }
};
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = () => S.rng();
const frnd = () => S.fxRng();
const pick = (arr, r = frnd) => arr[Math.floor(r() * arr.length) % arr.length];
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const QUARTER_LEN = { '1:00': 60, '1:30': 90, '2:00': 120, '3:00': 180 };
const DIFF = { 'Rookie': .65, 'Pro': 1, 'All-Star': 1.25, 'Legend': 1.5 };
