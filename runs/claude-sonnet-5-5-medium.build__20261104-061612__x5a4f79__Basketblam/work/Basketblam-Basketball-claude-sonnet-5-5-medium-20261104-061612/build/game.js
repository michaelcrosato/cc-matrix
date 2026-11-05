(() => {
/* ===== 00-core.js ===== */
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

/* ===== 01-game.js ===== */
/* BASKETBLAM - the one E.Game */
let uiHooks = { pauseItems: () => [] };
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', 'high'], bg: '#05040a', id: 'basketblam',
  input: KEYS, autoPause: !HUB,
  menu: HUB ? false : { items: () => uiHooks.pauseItems(), settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;
const touchOnlyDevice = () => HAS_WIN && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !(window.matchMedia && window.matchMedia('(hover: hover)').matches) && !S.padSeen && !S.keySeen;
if (HAS_WIN && window.addEventListener) {   // a real key press (the engine's lastDevice starts as 'keyboard', so it can't say)
  window.addEventListener('keydown', e => { if (e.isTrusted !== false) S.keySeen = true; });
  window.addEventListener('gamepadconnected', () => { S.padSeen = true; });
}
// the pointer in HUD pixels (the engine's mouseScreen is in world-buffer pixels: it adds the camera's origin)
const mouseHud = () => { const m = game.input.mouseScreen && game.input.mouseScreen(); return m ? [m[0] - (game.screen.ix || 0), m[1] - (game.screen.iy || 0)] : null; };

/* ===== 02-data.js ===== */
/* BASKETBLAM - data: teams, players, courts, dunks, power-ups, story, announcer lines */

// ratings order: ZOOM SPLASH DEEP SLAM DIME SWIPE SWAT BUMP
const RK = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const RICON = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
const mkP = (name, r, look, voice, taunts) => {
  const ratings = {}; RK.forEach((k, i) => ratings[k] = r[i]);
  return { name, ratings, look, voice, taunts };
};
const TEAMS = [
  { id: 'cats', name: 'ALLEY CATS', short: 'CATS', color: '#f2a31b', dark: '#6a3d00', trim: '#fff2c8', court: 'alley', blurb: 'Quick paws, quicker mouths.',
    players: [
      mkP('DEX', [8, 6, 5, 5, 7, 8, 4, 4], { skin: '#c68642', hair: '#15110e', style: 'spiky', build: 'heroic', size: 1.55 }, { pitch: 330, rate: 1.15, wave: 'triangle' }, ['NINE LIVES, ZERO DEFENSE!', 'PURR-FECT!', 'TOO SLOW, FLUFFY!']),
      mkP('MO-TOWN', [5, 7, 7, 4, 6, 5, 5, 6], { skin: '#8d5524', hair: '#241810', style: 'short', build: 'chibi', size: 1.7, band: '#ffffff' }, { pitch: 230, rate: .95, wave: 'sawtooth' }, ['BANK IS OPEN!', 'SING IT TO THE RIM!', 'SMOOTH LIKE MOTOWN!'])] },
  { id: 'dogs', name: 'SKY DOGS', short: 'DOGS', color: '#3b82f6', dark: '#0f2a66', trim: '#dbeaff', court: 'roof', blurb: 'Rooftop kings. Allergic to the ground.',
    players: [
      mkP('KITE', [9, 5, 6, 8, 6, 6, 6, 3], { skin: '#e0ac69', hair: '#d8b040', style: 'ponytail', build: 'heroic', size: 1.7 }, { pitch: 400, rate: 1.3, wave: 'square' }, ['I AM THE WEATHER!', 'LOOK UP, LOSER!', 'HIGH FIVE? TOO HIGH!']),
      mkP('BIG BARK', [3, 4, 3, 9, 4, 4, 9, 9], { skin: '#6b4423', hair: '#0a0a0a', style: 'bald', build: 'bulky', size: 1.85 }, { pitch: 110, rate: .8, wave: 'sawtooth' }, ['BARK BARK BLAM!', 'GET OFF MY ROOF!', 'YOU ARE SMALL!'])] },
  { id: 'cannons', name: 'GLASS CANNONS', short: 'CANNONS', color: '#e8443a', dark: '#5a0e0a', trim: '#ffe0d8', court: 'dome', blurb: 'All sparkle. Zero chill. Threes for days.',
    players: [
      mkP('LENS', [6, 8, 10, 3, 8, 4, 3, 3], { skin: '#f1c27d', hair: '#e8443a', style: 'long', build: 'heroic', size: 1.65 }, { pitch: 360, rate: 1.0, wave: 'triangle' }, ['FLASH BULB!', 'SMILE FOR THE REPLAY!', 'FROM DOWNTOWN!']),
      mkP('PRISM', [7, 9, 8, 5, 5, 5, 4, 5], { skin: '#a8714a', hair: '#7a1ab0', style: 'spiky', build: 'chibi', size: 1.7 }, { pitch: 280, rate: 1.1, wave: 'square' }, ['SEVEN COLORS OF BLAM!', 'REFRACT THIS!', 'ALL ANGLES, NO MERCY!'])] },
  { id: 'moon', name: 'MOON WALKERS', short: 'MOON', color: '#b06af0', dark: '#2a1058', trim: '#f4eaff', court: 'lunar', blurb: 'Zero-G swagger. Heavy on the hang time.', secret: true,
    players: [
      mkP('LUNA', [8, 7, 7, 8, 7, 6, 6, 4], { skin: '#e8d8ff', hair: '#ffffff', style: 'long', build: 'heroic', size: 1.7 }, { pitch: 450, rate: 1.0, wave: 'sine' }, ['GRAVITY IS A SUGGESTION!', 'SEE YOU IN ORBIT!', 'BEEP BOOP BLAM!']),
      mkP('COSMO', [6, 6, 6, 9, 5, 5, 8, 7], { skin: '#9a7ac0', hair: '#201040', style: 'spiky', build: 'bulky', size: 1.8 }, { pitch: 190, rate: .9, wave: 'sawtooth' }, ['ONE SMALL STEP, ONE GIANT SLAM!', 'HOUSTON, WE HAVE A DUNK!', 'LUNCH BREAK ON THE MOON!'])] },
  { id: 'bots', name: 'BLAMBOTS', short: 'BOTS', color: '#7fd8e8', dark: '#1c3c48', trim: '#ffffff', court: 'lunar', blurb: 'Perfect. Inhuman. Unionized.', secret: true, robot: true,
    players: [
      mkP('UNIT-1', [9, 9, 9, 9, 9, 8, 8, 7], { skin: '#9aa8b8', hair: '#4a5866', style: 'bald', build: 'bulky', size: 1.8, eye: '#ff3030' }, { pitch: 140, rate: 1.4, wave: 'square' }, ['COMPUTING YOUR DEFEAT.', 'SCORE: INEVITABLE.', 'BEEP. BLAM. BEEP.']),
      mkP('UNIT-2', [10, 8, 10, 8, 9, 9, 7, 6], { skin: '#b8c4d0', hair: '#4a5866', style: 'bald', build: 'heroic', size: 1.75, eye: '#ff3030' }, { pitch: 200, rate: 1.5, wave: 'square' }, ['HUMANS: OBSOLETE.', 'ERROR: YOUR OFFENSE.', 'PROCESSING POSTER.'])] }
];
const TEAM_BY_ID = {}; TEAMS.forEach((t, i) => { t.idx = i; TEAM_BY_ID[t.id] = t; });
const PLAYABLE_TOUR = [0, 1, 2];

/* ---- courts: palette, twist, backdrop, music ---- */
const COURTS = {
  alley: { name: 'THE ALLEY', sub: 'Chain-link, puddles and a very judgmental pigeon.', floor: ['#a56b3c', '#8f5b32'], line: '#f4f0e0', paint: '#7a3a2a', apron: '#4a4650', wall: '#5a3a30', wallTop: '#7a5444', backdrop: 'city-night', stands: ['#44404c', '#3a3644'], lights: .55, twist: 'puddle', twistText: 'PUDDLES: slick patches that send you skating.', music: 'alley', crowd: ['#d8a050', '#a04030', '#406080'] },
  roof: { name: 'SKYLINE ROOFTOP', sub: 'Forty floors up. The wind has opinions.', floor: ['#4a6a8a', '#3f5d7c'], line: '#ffffff', paint: '#2a4a7a', apron: '#2a3040', wall: '#38445c', wallTop: '#54648a', backdrop: 'dusk', stands: ['#2a3248', '#252c40'], lights: .6, twist: 'wind', twistText: 'WIND: gusts shove the ball in flight. Watch the flags.', music: 'roof', crowd: ['#ffd36a', '#8ab0f0', '#f0f0f0'] },
  dome: { name: 'THE DOME', sub: 'Pyro, lasers and one lucky spot on the floor.', floor: ['#b08a4a', '#9c7a40'], line: '#fffbe0', paint: '#a02a3a', apron: '#201a30', wall: '#3a1a40', wallTop: '#6a2a70', backdrop: 'night', stands: ['#3a2450', '#302044'], lights: .5, twist: 'jackpot', twistText: 'JACKPOT SPOT: makes from the glowing circle are worth +2.', music: 'dome', crowd: ['#ff80c0', '#80e0ff', '#ffe060'] },
  lunar: { name: 'LUNAR LOT', sub: 'Moon gravity. Moon rules. Moon-sized dunks.', floor: ['#8a8a9a', '#7c7c8c'], line: '#e8f4ff', paint: '#4a3a7a', apron: '#33334a', wall: '#2a2a40', wallTop: '#4a4a70', backdrop: 'space', stands: ['#262640', '#20203a'], lights: .45, twist: 'moon', twistText: 'MOON GRAVITY: floaty ball, huge jumps.', music: 'lunar', crowd: ['#c0a0ff', '#a0f0ff', '#ffffff'] }
};
const COURT_ORDER = ['alley', 'roof', 'dome', 'lunar'];

/* ---- dunks ---- */
const DUNKS = [
  { id: 'jam', name: 'THE JAM', min: 0, h: 1, spin: 0, pts: 1, move: 'overhead', lines: ['JAMMED IT!'] },
  { id: 'tomahawk', name: 'TOMAHAWK', min: 3, h: 1.1, spin: 0, pts: 2, move: 'overhead', lines: ['TOMAHAWK CHOP!'] },
  { id: 'windmill', name: 'WINDMILL', min: 4, h: 1.15, spin: 1, pts: 2, move: 'spin', lines: ['WINDMILL!'] },
  { id: 'scratcher', name: 'BACKSCRATCHER', min: 5, h: 1.2, spin: 0, pts: 3, move: 'rising', lines: ['BACKSCRATCHER!'] },
  { id: 'three60', name: 'THREE-SIXTY', min: 6, h: 1.3, spin: 2, pts: 3, move: 'overhead', lines: ['THREE-SIXTY!'] },
  { id: 'cradle', name: 'THE CRADLE', min: 7, h: 1.3, spin: 1, pts: 4, move: 'twohand', lines: ['ROCK THE CRADLE!'] },
  { id: 'orbit', name: 'ORBITAL SLAM', min: 8, h: 1.55, spin: 2, pts: 5, move: 'plunge', lines: ['ORBITAL SLAM!'] },
  { id: 'blamnova', name: 'BLAMNOVA', min: 9, h: 1.7, spin: 3, pts: 6, move: 'plunge', lines: ['BLAMNOVA!'], nova: true }
];

/* ---- power-ups ---- */
const POWERUPS = [
  { id: 'rocket', name: 'ROCKET KICKS', color: '#ff6a20', dur: 10, text: 'Unlimited turbo and extra speed!' },
  { id: 'gold', name: 'GOLD BALL', color: '#ffd23a', dur: 14, text: 'Your next basket counts double!' },
  { id: 'giant', name: 'GIANT HANDS', color: '#5affc0', dur: 10, text: 'Huge reach for steals, blocks and catches!' },
  { id: 'freeze', name: 'ICE CUBE', color: '#9ae6ff', dur: 2.6, text: 'Freezes the closest rival solid!' }
];

/* ---- speakers (story, announcers) ---- */
const VOICES = {
  RICO: { pitch: 360, rate: 1.4, wave: 'sawtooth', name: 'RICO RIM', look: { skin: '#d9a066', hair: '#2a1810', style: 'short', band: '#e8443a' }, color: '#ffd36a' },
  LOU: { pitch: 150, rate: .9, wave: 'sawtooth', name: 'BIG LOU', look: { skin: '#7a4a2a', hair: '#cccccc', style: 'bald' }, color: '#8ae0ff' },
  ROSCOE: { pitch: 260, rate: 1.0, wave: 'square', name: 'REF ROSCOE', look: { skin: '#f0c8a0', hair: '#333333', style: 'short', band: '#111111' }, color: '#ffffff' },
  MAYOR: { pitch: 300, rate: 1.1, wave: 'triangle', name: 'MAYOR MUFFIN', look: { skin: '#f0b890', hair: '#c04080', style: 'long' }, color: '#ff90d0' },
  CHIEF: { pitch: 120, rate: 1.5, wave: 'square', name: 'CHIEF BLAMBOT', look: { skin: '#9aa8b8', hair: '#4a5866', style: 'bald', eye: '#ff3030' }, color: '#7fd8e8' },
  YOU: { pitch: 280, rate: 1.1, wave: 'triangle', name: 'YOUR CREW', look: { skin: '#d8a070', hair: '#222222', style: 'spiky' }, color: '#ffffff' }
};

/* ---- the Blam Tour ---- */
const TOUR = [
  { court: 'alley', opp: null, name: 'STOP 1: THE ALLEY',
    pre: [['MAYOR', 'CITIZENS OF DUNKTOWN! THE BLAMBOTS HAVE BANNED FUN. ALSO ELBOWS. ALSO GRAVITY, PROBABLY.'], ['MAYOR', 'ONLY ONE THING CAN STOP THEM: THE BLAM TOUR. FOUR COURTS. FOUR CREWS. ZERO FOULS.'], ['ROSCOE', 'I AM REF ROSCOE. I HAVE SWALLOWED MY WHISTLE. THERE ARE NO FOULS. TIP IT!']],
    post: [['RICO', 'THAT ONE WAS RATED PG-13 FOR PURE SWAGGER!'], ['LOU', 'YOU BEAT THE ALLEY! THE PIGEON IS IMPRESSED. HE HAS NEVER BEEN IMPRESSED.']] },
  { court: 'roof', opp: null, name: 'STOP 2: THE ROOFTOP',
    pre: [['RICO', 'WELCOME TO THE SKYLINE, FORTY FLOORS UP, WHERE THE WIND HAS OPINIONS!'], ['LOU', 'KEEP YOUR EYES ON THE FLAGS, ROOKIE. THE BALL GOES WHERE THE BREEZE SAYS.']],
    post: [['RICO', 'THEY CAME FOR THE VIEW. THEY LEFT WITH A POSTER!'], ['MAYOR', 'TWO COURTS DOWN! THE BLAMBOTS ARE... SWEATING? CAN ROBOTS SWEAT?']] },
  { court: 'dome', opp: 'moon', name: 'STOP 3: THE DOME',
    pre: [['MAYOR', 'THE MOON WALKERS HAVE LANDED AT THE DOME! THEY CLAIM THE MOON IS A COURT. THE MOON DISAGREES.'], ['LOU', 'STAND ON THE JACKPOT SPOT. IT IS LUCKY. I CHECKED. I AM A PROFESSIONAL.']],
    post: [['LUNA', 'WE ADMIT NOTHING... BUT THE BLAMBOTS ARE PLAYING AT THE LUNAR LOT. THAT IS WHERE THE BALL IS HEAVIEST. IT IS ALSO LIGHT. IT IS COMPLICATED.'], ['RICO', 'THE FINAL STOP! THE ROBOT CROWN IS UP FOR GRABS!']] },
  { court: 'lunar', opp: 'bots', name: 'FINAL STOP: THE LUNAR LOT',
    pre: [['CHIEF', 'HUMANS. FUN IS INEFFICIENT. YOU WILL BE OPTIMIZED.'], ['YOU', 'OPTIMIZE THIS... FACE FIRST... THROUGH THE RIM!'], ['ROSCOE', 'FINAL GAME OF THE BLAM TOUR! NO FOULS! NO FEAR! NO REFUNDS! TIP IT!']],
    post: [['CHIEF', 'ERROR. ERROR. DOES NOT COMPUTE. ...THAT WAS FUN.'], ['MAYOR', 'YOU ARE THE BLAM CHAMPIONS OF DUNKTOWN! GRAVITY HAS BEEN RESTORED. IT IS UNDER NEW MANAGEMENT.'], ['RICO', 'AND THE CROWD GOES BANANAS! WE HAVE UNLOCKED THE MOON WALKERS AND THE BLAMBOTS FOR EXHIBITION!']] }
];
const TOUR_FOES = (mine) => { // opponents for stops 1-2 are the two other street crews
  const others = PLAYABLE_TOUR.filter(i => i !== mine);
  return [others[0], others[1], 3, 4];
};

const HALFTIME_GAGS = ['The mascot has been arrested for dunking on the ref.', 'Fans are reminded that the ball is NOT edible.', 'Today\'s sponsor: Blamburger. Now with 40% more blam.', 'A hot dog has been awarded MVP of the first half.', 'The shot clock is still 20. The ref is still confused.'];

/* ---- announcer lines ---- */
const LINES = {
  tipoff: ['{a} AND {b} AT CENTER COURT! HERE WE GO!', 'IT\'S TIP-OFF TIME! NO FOULS! NO MERCY!', 'THE BALL GOES UP! SO DOES MY BLOOD PRESSURE!'],
  two: ['{n} BUCKETS IT!', 'TWO FOR {n}! SMOOTH!', 'MONEY, {n}! MONEY!', '{n} WITH THE JUMPER!', 'NOTHING BUT NET FROM {n}!'],
  three: ['{n} FROM DOWNTOWN! BOOM SHAKALAKA!', 'THREE BALL! {n} IS COOKING!', 'FROM WAY OUT! {n} HAS ICE WATER IN HIS VEINS!', 'DEEP THREE! THAT\'S A LONG ONE, {n}!'],
  perfect: ['PERFECT RELEASE! BEAUTIFUL!', 'THAT SHOT WAS GIFT WRAPPED!', 'GREEN LIGHT! GREEN LIGHT!'],
  dunk: ['{n} JAMS IT HOME!', 'THROW IT DOWN, {n}!', 'THE RIM IS CRYING!', '{n} WITH THE HAMMER!'],
  bigdunk: ['{n} LEAVES THE ATMOSPHERE!', 'CALL NASA! {n} JUST DUNKED ON A SATELLITE!', 'SOMEBODY CALL A DOCTOR FOR THAT RIM!', 'POSTER! POSTER! POSTER!'],
  oop: ['ALLEY-OOP! {n} FINISHES IT!', 'LOB CITY! {n} CATCHES AND SLAMS!', 'THEY HAVE A TELEPATHY THING GOING!'],
  block: ['REJECTED BY {n}! GET THAT OUT OF HERE!', '{n} SENDS IT BACK TO THE FACTORY!', 'DENIED! NOT IN {n}\'S HOUSE!'],
  steal: ['{n} PICKS HIS POCKET!', 'STOLEN BY {n}! SMOOTH HANDS!', '{n} WITH THE SWIPE! GRANDMA COULDN\'T HAVE DONE IT BETTER!'],
  shove: ['{n} SHOVES! AND IT\'S LEGAL! I LOVE THIS GAME!', 'BUMP! THAT MAN IS ON THE FLOOR!', '{n} WITH THE FOREARM OF JUSTICE!'],
  fumble: ['LOOSE BALL! SOMEBODY GRAB IT!', 'THE BALL IS FREE! IT\'S WILD OUT THERE!'],
  miss: ['OFF THE IRON!', 'CLANK! RIM SAYS NO!', 'NO GOOD! LOTS OF GOOD, BUT NO GOOD!', 'BRICKLAYER ALERT!'],
  airball: ['AIRBALL! THE NET IS OFFENDED!', 'THAT WAS NOT EVEN CLOSE! IT WAS A SUGGESTION!'],
  nova: ['{n} IS ON FIRE! SUPERNOVA!', 'HE\'S HEATING UP! SUPERNOVA! GRAB A FIRE EXTINGUISHER!', 'SUPERNOVA! THE NET IS NOW ON FIRE!'],
  novaOff: ['THE FIRE IS OUT. THE ROOM SMELLS LIKE VICTORY.', 'SUPERNOVA OVER. THE SUN SETS ON THAT ONE.'],
  shatter: ['THE BACKBOARD IS GONE! SOMEONE SWEEP THAT UP!', 'SHATTERED! BLAM!', 'GLASS EVERYWHERE! LAWYERS ARE CALLING!'],
  goaltend: ['GOALTENDING! IT COUNTS!', 'HE SWATTED IT DOWN! THAT\'S A GOALTEND!'],
  power: ['POWER-UP! {p}!', '{n} GRABS {p}!'],
  jackpot: ['THE JACKPOT SPOT PAYS OFF! EXTRA TWO!'],
  clock: ['SHOT CLOCK VIOLATION! USE IT OR LOSE IT!'],
  quarter: ['THAT\'S THE END OF THE QUARTER! WHAT A RUN!', 'BUZZER! TAKE A BREATHER, FOLKS!'],
  half: ['HALFTIME! {score}! THE CROWD NEEDS SNACKS!'],
  overtime: ['TIED UP! OVERTIME! I NEED A SNACK!', 'WE\'RE NOT DONE! EXTRA BASKETBALL!'],
  sudden: ['SUDDEN BLAM! NEXT BASKET WINS IT ALL!'],
  end: ['GAME OVER! {w} TAKE IT!', 'THAT\'S THE FINAL! {w} ARE YOUR WINNERS!'],
  trash: ['{t}']
};

/* ===== 10-audio.js ===== */
/* BASKETBLAM - audio: music, stings, sound effects, gibberish voices and crowd. All made in code. */
VOICES.LUNA = { pitch: 450, rate: 1.1, wave: 'sine', name: 'LUNA', look: { skin: '#e8d8ff', hair: '#ffffff', style: 'long' }, color: '#d8a8ff' };

const SONGS = {
  title: { bpm: 108, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .07, notes: 'E5 . G5 . A5 . G5 E5 | D5 . E5 . G5 . E5 D5 | C5 . E5 . G5 . A5 . | B5 - - . A5 . G5 .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 . A2 A3 . A2 E3 . | G2 . G2 G3 . G2 D3 . | F2 . F2 F3 . F2 C3 . | E2 . E2 E3 . G2 B2 .' },
    { name: 'arp', wave: 'pulse', vol: .04, notes: 'A4 C5 E5 C5 A4 C5 E5 C5 | G4 B4 D5 B4 G4 B4 D5 B4 | F4 A4 C5 A4 F4 A4 C5 A4 | E4 G4 B4 G4 E4 G4 B4 G4' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s h h . | k . h . s . h k | k . h k s h s s' }] },
  alley: { bpm: 98, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'D5 . . F5 . G5 . . | A5 . G5 . F5 . D5 . | C5 . . E5 . G5 . . | A5 . G5 . E5 . C5 .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'D2 . D2 . F2 . G2 A2 | D2 . D2 . F2 . A2 G2 | C2 . C2 . E2 . G2 A2 | C2 . C2 . E2 . G2 E2' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . . h s . h . | k . h . s . h h | k . . h s . h . | k . h . s h s .' }] },
  roof: { bpm: 122, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'G5 . B5 . D6 . B5 . | A5 . C6 . E6 . C6 . | F5 . A5 . C6 . A5 . | G5 . B5 . D6 - - .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'G2 G2 . G3 G2 . G3 . | A2 A2 . A3 A2 . A3 . | F2 F2 . F3 F2 . F3 . | G2 G2 . G3 D3 . B2 .' },
    { name: 'pad', wave: 'sine', vol: .08, notes: 'B4 - - - - - - - | C5 - - - - - - - | A4 - - - - - - - | B4 - - - D5 - - -' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h h s . h . | k . h h s . h h | k . h h s . h . | k h h h s s s s' }] },
  dome: { bpm: 134, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .05, notes: 'E5 E5 . G5 . E5 . B4 | C5 C5 . E5 . C5 . G4 | D5 D5 . F5 . D5 . A4 | E5 . G5 . B5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .32, notes: 'E2 E2 E3 E2 E2 E3 E2 E2 | C2 C2 C3 C2 C2 C3 C2 C2 | D2 D2 D3 D2 D2 D3 D2 D2 | E2 E2 E3 E2 B2 B2 B1 B1' },
    { name: 'drums', wave: 'drums', vol: .13, notes: 'k h s h k h s h | k h s h k k s s | k h s h k h s h | k s k s k s s s' }] },
  lunar: { bpm: 88, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .12, notes: 'A5 - - - E5 - - - | G5 - - - D5 - - - | F5 - - - C5 - - - | E5 - - - B4 - - -' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'A1 . . A2 . . A1 . | G1 . . G2 . . G1 . | F1 . . F2 . . F1 . | E1 . . E2 . . B1 .' },
    { name: 'blip', wave: 'pulse', vol: .04, notes: 'A4 . E5 . A5 . E5 . | G4 . D5 . G5 . D5 . | F4 . C5 . F5 . C5 . | E4 . B4 . E5 . B4 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . . s . . h | k . . h s . . . | k . . . s . h . | k . h . s . s s' }] },
  victory: { bpm: 130, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'C5 E5 G5 C6 . G5 C6 - | D5 F5 A5 D6 . A5 D6 - | E5 G5 B5 E6 . D6 C6 - | C6 - - - . . . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 . G2 . G2 . | D3 . D3 . A2 . A2 . | E3 . E3 . B2 . B2 . | C3 . G2 . C3 - - .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h k | k . h . s . h k | k . h . s . h k | k s k s k - - .' }] },
  lose: { bpm: 70, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'A4 - - - G4 - - - | F4 - - - E4 - - - | D4 - - - - - - - | - - - - - - - -' },
    { wave: 'sine', vol: .2, notes: 'A2 - - - - - - - | F2 - - - - - - - | D2 - - - - - - - | - - - - - - - -' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'C5 . E5 . G5 . E5 . | F5 . A5 . C6 . A5 . | G5 . B5 . D6 . B5 . | C6 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 - - .' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . . . s . . . | k . . . s . . . | k . . . s . . . | k . . . s . s s' }] }
};
const STINGS = {
  basket: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 - - - -' }] },
  dunk: { bpm: 170, steps: 4, tracks: [{ wave: 'saw', vol: .1, notes: 'C4 G4 C5 E5 G5 C6 - -' }, { wave: 'drums', vol: .15, notes: 'k . k s - - - -' }] },
  nova: { bpm: 180, steps: 4, tracks: [{ wave: 'saw', vol: .1, notes: 'A4 C5 E5 A5 C6 E6 A6 -' }, { wave: 'drums', vol: .15, notes: 'k s k s k s k s' }] }
};

const SFX = {
  dribble: { wave: 'sine', freq: 130, to: 70, dur: .07, vol: .35 },
  bounce: { wave: 'sine', freq: 150, to: 80, dur: .09, vol: .3 },
  squeak: { wave: 'triangle', freq: 1500, to: 2300, dur: .06, vol: .08 },
  swish: { wave: 'noise', freq: 4000, to: 1500, dur: .28, vol: .22, filter: 'highpass' },
  clank: { wave: 'triangle', freq: 880, to: 520, dur: .22, vol: .3, vib: [40, .05] },
  thud: { wave: 'square', freq: 180, to: 90, dur: .1, vol: .22 },
  whistle: { wave: 'square', freq: 2300, dur: .35, vol: .1, vib: [34, .06] },
  buzzer: { wave: 'saw', freq: 130, dur: .8, vol: .24 },
  tick: { wave: 'square', freq: 1800, dur: .03, vol: .08 },
  swipe: { wave: 'noise', freq: 2400, to: 700, dur: .12, vol: .16 },
  shove: { wave: 'saw', freq: 140, to: 50, dur: .16, vol: .28 },
  down: { wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3, filter: 'lowpass' },
  jump: { wave: 'triangle', freq: 220, to: 540, dur: .13, vol: .12 },
  slam: { wave: 'saw', freq: 90, to: 28, dur: .5, vol: .45 },
  rim: { wave: 'triangle', freq: 1250, to: 400, dur: .5, vol: .3, vib: [26, .05] },
  rattle: { wave: 'square', freq: 700, to: 300, dur: .22, vol: .12, vib: [50, .08] },
  shatter: { wave: 'noise', freq: 8000, to: 800, dur: 1.1, vol: .5 },
  cheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .22, filter: 'lowpass' },
  aww: { wave: 'noise', freq: 900, to: 300, dur: 1.0, vol: .16, filter: 'lowpass' },
  nova: { wave: 'saw', freq: 200, to: 1600, dur: .9, vol: .26, arp: [0, 7, 12, 19], step: .07 },
  novaOff: { wave: 'saw', freq: 700, to: 90, dur: .7, vol: .22 },
  power: { wave: 'square', freq: 440, dur: .4, vol: .16, arp: [0, 4, 7, 12], step: .06 },
  jackpot: { wave: 'square', freq: 660, dur: .6, vol: .18, arp: [0, 5, 9, 12, 17], step: .06 },
  tip: { wave: 'sine', freq: 300, to: 900, dur: .3, vol: .2 },
  perfect: { wave: 'triangle', freq: 880, dur: .25, vol: .16, arp: [0, 7, 12], step: .05 },
  freeze: { wave: 'triangle', freq: 2200, to: 400, dur: .5, vol: .2, vib: [60, .1] }
};
for (const [k, v] of Object.entries(SFX)) game.audio.define('bb_' + k, v);
const sfx = (name, o) => { try { game.audio.sfx('bb_' + name, o); } catch (e) { } };
const sting = name => { try { game.audio.sting ? game.audio.sting(STINGS[name]) : game.audio.sfx('bb_perfect'); } catch (e) { } };
const music = name => { try { game.audio.music(name ? SONGS[name] : null); } catch (e) { } };

/* ---- the gibberish voice (Animalese/Simlish style): a pitched blip per letter with a vowel-ish formant ---- */
const VOWEL_F = { a: 800, e: 540, i: 320, o: 480, u: 360 };
const babble = (v, ch) => {
  const A = game.audio; if (!A.ctx || A.muted || (HAS_WIN && window.AIHub && window.AIHub.ended)) return;
  if (!/[a-z0-9]/i.test(ch)) return;
  try {
    const c = A.ctx, bus = A.sfxBus; if (!bus) return;
    const code = ch.toLowerCase().charCodeAt(0), t = c.currentTime + .001, vowel = VOWEL_F[ch.toLowerCase()];
    const pitch = v.pitch * Math.pow(2, (((code * 7) % 13) - 6) / 24) * (ch === ch.toUpperCase() && vowel ? 1.04 : 1);
    const dur = clamp((vowel ? .085 : .05) / v.rate, .03, .13);
    const osc = c.createOscillator(); osc.type = v.wave; osc.frequency.setValueAtTime(pitch * 1.06, t); osc.frequency.exponentialRampToValueAtTime(pitch, t + dur * .7);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = vowel || (600 + (code % 6) * 260); f.Q.value = vowel ? 3 : 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    osc.connect(f); f.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + .02);
  } catch (e) { }
};
const voiceFor = key => (ch => babble(VOICES[key] || VOICES.RICO, ch));

/* ---- crowd ambience: filtered noise whose level follows the excitement ---- */
const crowd = { node: null, gain: null, level: 0 };
const crowdUpdate = (dt, want) => {
  const A = game.audio; if (!A.ctx) return;
  try {
    if (!crowd.node) {
      const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < len; i++) { b = b * .96 + (Math.random() * 2 - 1) * .2; d[i] = b; }
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .5;
      const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(A.musicBus || A.sfxBus); s.start();
      crowd.node = s; crowd.gain = g; crowd.filter = f;
    }
    crowd.level = approach(crowd.level, want, dt * .5);
    crowd.gain.gain.value = crowd.level * .55; crowd.filter.frequency.value = 500 + crowd.level * 900;
  } catch (e) { }
};
const crowdStop = () => { if (crowd.gain) try { crowd.gain.gain.value = 0; } catch (e) { } crowd.level = 0; };

/* ===== 30-sim.js ===== */
/* BASKETBLAM - the match simulation: players, ball, actions, rules */

/* ---- rigs ---- */
const makeRig = (spec, team, opts = {}) => {
  const lk = spec.look, o = {
    size: lk.size || 1.6, build: lk.build || 'heroic', weapon: null, hair: lk.style || 'short', outfit: 'shirt', sleeves: 'none',
    colors: { skin: lk.skin, hair: lk.hair, cloth: team.color, pants: team.dark, boot: team.trim, belt: team.dark, trim: team.trim, glove: team.color }
  };
  if (lk.band) o.hat = { style: 'band', color: lk.band };
  if (lk.eye) { o.eyeGlow = lk.eye; o.colors.eye = lk.eye; }
  return new E.Humanoid(Object.assign(o, opts));
};
const makeSpeakerRig = key => {
  const v = VOICES[key], lk = v.look;
  return new E.Humanoid({ size: 1.3, build: 'chibi', weapon: null, hair: lk.style, outfit: 'shirt', hat: lk.band ? { style: 'band', color: lk.band } : undefined, eyeGlow: lk.eye, colors: { skin: lk.skin, hair: lk.hair, cloth: v.color, eye: lk.eye } });
};

/* ---- twists: gravity and friends ---- */
const courtDef = () => COURTS[S.court] || COURTS.alley;
const isMoon = () => courtDef().twist === 'moon';
const ballG = () => tune('ballGravity') * (isMoon() ? .6 : 1);
const playerG = () => tune('playerGravity') * (isMoon() ? .55 : 1);

/* ---- creating a match ---- */
const stat0 = () => ({ pts: 0, dunks: 0, threes: 0, blocks: 0, steals: 0, shoves: 0, assists: 0, perfect: 0, style: 0 });
function newMatch(cfg) {
  // cfg: { teams:[h,a], court, mode, humans: {slot: Input}, qLen, difficulty, seed, ot }
  S.mode = cfg.mode || 'exhibition'; S.court = cfg.court || 'alley'; S.teams = cfg.teams.slice();
  S.rng = E.rng(cfg.seed || (Date.now() & 0xffffff) || 7); S.fxRng = E.rng((cfg.seed || 3) + 99);
  S.powerups = []; S.fx.banners = []; S.announcerQueue = []; S.twist = { t: 0, wind: 0, windTarget: 0, spot: { x: COURT.cx, y: COURT.cy - 60, t: 0 }, puddles: [] };
  S.cfg = cfg; S.humans = cfg.humans || {};
  S.players = [];
  for (let slot = 0; slot < 4; slot++) {
    const team = slot < 2 ? 0 : 1, tdef = TEAMS[S.teams[team]], spec = tdef.players[slot % 2];
    const p = {
      slot, team, mate: slot ^ 1, tdef, spec, name: spec.name, r: spec.ratings, rig: makeRig(spec, tdef), input: S.humans[slot] || null, ai: { t: 0, think: 0, tx: 0, ty: 0, mode: '', jt: 0, shootT: 0 },
      x: COURT.cx, y: COURT.cy, z: 0, vx: 0, vy: 0, vz: 0, facing: team ? PI : 0, turbo: 1, act: null, stun: 0, immune: 0, boost: 0, hold: 0,
      cd: { steal: 0, shove: 0, spin: 0, jump: 0, taunt: 0, call: 0 }, pu: null, puT: 0, nova: false, phase: slot * 1.7, st: stat0(), frozen: 0, tauntT: 0, cheer: 0, runAnim: 0, bigHead: 1
    };
    S.players.push(p);
  }
  S.ball = { x: COURT.cx, y: COURT.cy, z: 30, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, last: null, shot: null, roll: 0, scored: false, touchedRim: false, dribble: 0, t: 0, noCatch: {}, gold: false, trail: [] };
  S.match = {
    phase: 'pre', quarter: 1, qLen: cfg.qLen || 90, clock: cfg.qLen || 90, shotClock: tune('shotClock'), score: [0, 0], possession: 0, arrow: 0, streak: [0, 0], novaT: [0, 0], ot: 0, time: 0, t: 0,
    sudden: false, qScores: [[0, 0]], excite: 0, tip: null, inbound: null, deadT: 0, endT: 0, buzzer: false, stats: { lead: 0, bigLead: 0, longest: 0 }, powerT: tune('powerupEvery'),
    over: false, winner: -1, difficulty: cfg.difficulty || 'Pro', trash: 0, shatterT: 0, breakT: 0, breakKind: '', looseT: 0, lastScorer: -1, runs: [0, 0], styleShown: 0
  };
  S.camera.x = COURT.cx; S.camera.zoom = 1;
  S.dev.autopilot = false;
  resetPositions();
  startTip();
  return S.match;
}
function resetPositions(attackTeam = -1) {
  const M = S.match;
  S.players.forEach(p => {
    const dir = p.team === 0 ? 1 : -1;
    p.x = COURT.cx - dir * (p.slot % 2 ? 150 : 70); p.y = COURT.cy + (p.slot % 2 ? 50 : -50); p.z = 0; p.vx = p.vy = p.vz = 0; p.act = null; p.stun = 0; p.facing = dir > 0 ? 0 : PI; p.immune = 0; p.frozen = 0;
  });
}

/* ---- commands: what each slot wants this step ---- */
const NOCMD = () => ({ mx: 0, my: 0, shoot: { down: false, pressed: false, released: false }, pass: { pressed: false }, turbo: { down: false }, shove: { pressed: false }, oop: { pressed: false }, taunt: { pressed: false } });
const humanCmd = (I) => {
  const m = I.move(), c = NOCMD();
  c.mx = m[0]; c.my = m[1];
  c.shoot = { down: I.down('shoot'), pressed: I.pressed('shoot'), released: I.released('shoot') };
  c.pass.pressed = I.pressed('pass'); c.turbo.down = I.down('turbo'); c.shove.pressed = I.pressed('shove'); c.oop.pressed = I.pressed('oop'); c.taunt.pressed = I.pressed('taunt');
  if (c.turbo.down && c.pass.pressed && !c.shoot.down) { c.shove.pressed = true; }
  return c;
};

/* ---- helpers ---- */
const angAbs = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const teamOf = p => S.players.filter(q => q.team === p.team);
const opps = p => S.players.filter(q => q.team !== p.team);
const mateOf = p => S.players[p.mate];
const holder = () => S.ball.owner;
const reachBonus = p => (p.pu === 'giant' ? 1.8 : 1);
const novaOf = p => S.match.novaT[p.team] > 0;
const speedOf = p => tune('runSpeed') * (.86 + .028 * p.r.zoom) * (p.pu === 'rocket' ? 1.22 : 1) * (novaOf(p) ? 1.1 : 1);
const dunkRangeOf = p => tune('dunkRange') * (.75 + .05 * p.r.slam) * (novaOf(p) ? 1.25 : 1);
const hoopDist = (p, h) => Math.hypot(p.x - h.x, p.y - h.y);
function banner(text, o = {}) { S.fx.banners.push({ text, t: 0, life: o.life || 1.3, colors: o.colors || ['#fffbe8', '#ffd36a', '#ff6a2a'], scale: o.scale || 3, y: o.y || .34, shake: o.shake || 0 }); if (S.fx.banners.length > 4) S.fx.banners.shift(); }
function hitFx(x, y, z, big = 1, color = '#fff6c0') {
  try { P.sparks(x, y, z, 8 * big | 0, null, { color }); P.ring && P.ring(x, y, 3, 14 * big, color, .35, z); } catch (e) { }
  S.fx.shake = Math.max(S.fx.shake, 2 * big); game.shake && game.shake(1.5 * big);
}
function rumble(p, a, s) { if (p.input && game.settings.rumble2 !== 'Off') try { p.input.rumble(a, s); } catch (e) { } }

/* ---- possession / ball ownership ---- */
function giveBall(p) {
  const B = S.ball, M = S.match;
  if (B.owner && B.owner !== p) B.owner.hasBall = false;
  B.owner = p; p.hasBall = true; B.state = 'held'; B.last = p; B.shot = null; B.scored = false; B.vx = B.vy = B.vz = 0; B.touchedRim = false;
  if (M.possession !== p.team) { M.possession = p.team; M.shotClock = tune('shotClock'); }
  p.hold = 0;
}
function looseBall(vx, vy, vz) {
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; } B.owner = null; B.state = 'loose'; B.vx = vx; B.vy = vy; B.vz = vz; B.shot = null; B.noCatch = {}; S.match.looseT = 0;
}

/* ---- the step of one player ---- */
function playerStep(p, c, dt) {
  const M = S.match, B = S.ball, live = M.phase === 'live' || M.phase === 'inbound' || M.phase === 'pre' && false;
  const playing = M.phase === 'live' || M.phase === 'inbound' || M.phase === 'score' || M.phase === 'tip' || M.phase === 'deadball';
  for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
  p.immune = Math.max(0, p.immune - dt); p.puT = Math.max(0, p.puT - dt); if (p.pu && p.puT <= 0) { emit('powerupEnd', { p: p.slot, id: p.pu }); p.pu = null; }
  p.frozen = Math.max(0, p.frozen - dt); p.cheer = Math.max(0, p.cheer - dt); p.tauntT = Math.max(0, p.tauntT - dt);
  p.nova = novaOf(p);
  const g = playerG(), onGround = p.z <= 0 && p.vz <= 0;
  if (p.stun > 0) {
    p.stun -= dt; p.vx = approach(p.vx, 0, 500 * dt); p.vy = approach(p.vy, 0, 500 * dt);
  } else if (p.frozen > 0) { p.vx = p.vy = 0; }
  else if (p.act) actStep(p, c, dt);
  else if (playing || M.phase === 'camp') freeMove(p, c, dt, onGround);
  else { p.vx = approach(p.vx, 0, 900 * dt); p.vy = approach(p.vy, 0, 900 * dt); }
  // vertical
  if (p.z > 0 || p.vz > 0) { p.vz -= g * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; if (p.vz < -120) { sfx('thud', { vol: .5 }); P.dust && P.dust(p.x, p.y, 0, 3); } p.vz = 0; p.landed = true; } }
  // slide, puddles
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, COURT.x0 - 28, COURT.x1 + 28); p.y = clamp(p.y, COURT.y0 - 16, COURT.y1 + 20);
  // turbo
  if (S.cheats.infTurbo || novaOf(p) || p.pu === 'rocket') p.turbo = 1;
  p.turbo = clamp(p.turbo, 0, 1);
}

function freeMove(p, c, dt, onGround) {
  const B = S.ball, M = S.match, mag = Math.hypot(c.mx, c.my), moving = mag > .12;
  let sp = speedOf(p);
  const wantTurbo = c.turbo.down && moving && (p.turbo > .02);
  if (wantTurbo) { sp *= tune('turboMult'); if (!(S.cheats.infTurbo || novaOf(p) || p.pu === 'rocket')) { p.turbo -= tune('turboDrain') * dt; } p.boost = 1; p.noRefill = .35; }
  else { p.boost = 0; p.noRefill = Math.max(0, (p.noRefill || 0) - dt); if (p.noRefill <= 0) p.turbo += tune('turboRefill') * dt; }
  // puddles slow control
  let acc = tune('accel'); const pud = S.twist.puddles && S.twist.puddles.find(q => Math.hypot(q.x - p.x, q.y - p.y) < q.r);
  if (pud && onGround) acc *= .22;
  if (!onGround) acc *= .35;
  const tx = c.mx * sp, ty = c.my * sp * .82;
  const prevSp = Math.hypot(p.vx, p.vy);
  p.vx = approach(p.vx, tx, acc * dt); p.vy = approach(p.vy, ty, acc * dt);
  if (moving && onGround) {
    const want = Math.atan2(c.my, c.mx);
    // sneaker squeak on a sharp turn
    if (prevSp > 70 && Math.abs(E.angDiff ? E.angDiff(want, p.facing) : 0) > 2.2 && (p.cd.squeak || 0) <= 0) { sfx('squeak', { vol: .5 }); p.cd.squeak = .3; }
    p.cd.squeak = Math.max(0, (p.cd.squeak || 0) - dt);
    p.facing = E.approachAng ? E.approachAng(p.facing, want, dt * (p.hasBall ? 12 : 16)) : want;
  }
  // defenders face the ball handler
  const h = holder();
  if (!moving && h && h.team !== p.team) p.facing = Math.atan2(h.y - p.y, h.x - p.x);
  if (!moving && !h) { const m = (S.ball); p.facing = Math.atan2(m.y - p.y, m.x - p.x); }
  p.hold += dt;
  // buttons
  const hoop = attackHoop(p.team);
  if (M.phase === 'tip') { if (c.shoot.pressed && p.z <= 0 && M.tip && M.tip.jumpers.includes(p)) { p.vz = tune('jumpShotVz') * 1.1; M.tip.jumpT[p.slot] = M.tip.t; sfx('jump'); } return; }
  const canAct = M.phase === 'live' || M.phase === 'camp' || (M.phase === 'inbound' && M.inbound);
  if (!canAct) return;
  if (M.phase === 'inbound') { if (p === M.inbound.who && c.pass.pressed) throwInbound(); return; }
  if (p.hasBall) {
    if (c.shoot.pressed && onGround) {
      const d = hoopDist(p, hoop);
      if ((c.turbo.down || p.turbo > .4 && d < dunkRangeOf(p) * .8) && p.turbo >= .05 && d < dunkRangeOf(p)) startDunk(p);
      else startJump(p);
    } else if (c.pass.pressed) passTo(p, mateOf(p));
    else if (c.oop.pressed) throwOop(p);
    else if (c.shove.pressed && p.cd.spin <= 0 && onGround) startSpin(p, c);
  } else {
    if (c.shoot.pressed && onGround && p.cd.jump <= 0) { p.vz = tune('jumpShotVz') * (1 + (p.r.swat - 5) * .03) * (c.turbo.down ? 1.12 : 1) * (isMoon() ? 1.15 : 1); p.act = { type: 'jump', t: 0 }; p.cd.jump = .3; sfx('jump', { vol: .5 }); emit('jump', { p: p.slot }); }
    else if (c.pass.pressed && onGround && p.cd.steal <= 0) startSwipe(p);
    else if (c.shove.pressed && onGround && p.cd.shove <= 0) startShove(p, c);
    else if (c.oop.pressed && p.cd.call <= 0) { p.cd.call = 1.2; const m = mateOf(p); if (m.hasBall && !m.input) m.ai.oopCall = 1.5; emit('call', { p: p.slot }); }
    else if (c.taunt.pressed && p.cd.taunt <= 0 && !HUB) { p.cd.taunt = 1.5; p.tauntT = 1.0; emit('taunt', { p: p.slot, text: pick(p.spec.taunts) }); }
  }
}

function actStep(p, c, dt) {
  const a = p.act, B = S.ball, M = S.match; a.t += dt;
  switch (a.type) {
    case 'jump': { // a block / rebound jump
      const air = p.z > 0 || p.vz > 0; p.vx = approach(p.vx, c.mx * speedOf(p) * .5, 500 * dt); p.vy = approach(p.vy, c.my * speedOf(p) * .4, 500 * dt);
      if (!air && a.t > .05) p.act = null; break; }
    case 'shot': {
      p.vx = approach(p.vx, c.mx * 30, 600 * dt); p.vy = approach(p.vy, c.my * 25, 600 * dt);
      const V = a.V, s = Math.abs(p.vz) / V;
      if (B.owner !== p) { p.act = null; break; } // lost the ball
      const apexPast = p.vz <= 0 ? a.t - (a.apexT || (a.apexT = a.t)) : 0;
      if (!a.released && ((!c.shoot.down && a.t > .05 && p.vz < V * .85) || apexPast > .22 || a.t > .95)) { a.released = true; releaseShot(p, s, p.vz > 0); }
      if (a.released && p.z <= 0) p.act = null;
      if (p.z <= 0 && a.t > .1 && !a.released) { p.act = null; }
      break; }
    case 'dunk': dunkStep(p, dt); break;
    case 'spin': {
      const k = a.t / a.dur; p.vx = a.dx * a.sp * (1 - k * .5); p.vy = a.dy * a.sp * .8 * (1 - k * .5); p.facing = a.f0 + k * TAU * (a.dir || 1);
      p.immune = Math.max(p.immune, .05); if (a.t >= a.dur) { p.act = null; p.facing = a.f0; } break; }
    case 'shove': {
      const k = a.t / a.dur; p.vx = Math.cos(p.facing) * 120 * (1 - k); p.vy = Math.sin(p.facing) * 100 * (1 - k);
      if (!a.hit && a.t > a.dur * .3 && a.t < a.dur * .75) { a.hit = shoveHit(p); }
      if (a.t >= a.dur) p.act = null; break; }
    case 'swipe': {
      p.vx = approach(p.vx, Math.cos(p.facing) * 40, 800 * dt); p.vy = approach(p.vy, Math.sin(p.facing) * 30, 800 * dt);
      if (!a.done && a.t > a.dur * .35) { a.done = true; swipeHit(p); }
      if (a.t >= a.dur) p.act = null; break; }
    case 'oopwait': {
      // the receiver of an alley-oop: runs to the spot, then leaps so he arrives with the ball
      const hoop = attackHoop(p.team), tx = hoop.x - hoop.dir * 6;
      if (p.input) { const mv = Math.hypot(c.mx, c.my); }
      if (!p.input) { const d = Math.hypot(tx - p.x, hoop.y - p.y) || 1; const sp = speedOf(p) * 1.3; p.vx = approach(p.vx, (tx - p.x) / d * sp, 1500 * dt); p.vy = approach(p.vy, (hoop.y - p.y) / d * sp, 1500 * dt); if (d < 8) { p.vx *= .5; p.vy *= .5; } }
      else { p.vx = approach(p.vx, c.mx * speedOf(p) * 1.2, 1200 * dt); p.vy = approach(p.vy, c.my * speedOf(p) * 1.1, 1200 * dt); }
      if (c.shoot.pressed) a.press = a.t;
      p.facing = hoop.dir > 0 ? 0 : PI;
      if (a.t >= a.delay || B.state === 'loose' || B.state === 'held') {
        if (B.state === 'pass' && B.oop && B.oop === p) { startOopLeap(p, a.press !== undefined && Math.abs(a.press - a.delay) < .3); }
        else p.act = null;
      }
      break; }
    default: p.act = null;
  }
}

/* ---- shooting ---- */
function startJump(p) {
  const V = tune('jumpShotVz') * (isMoon() ? 1.18 : 1) * (1 + (p.r.swat - 5) * .01);
  p.vz = V; p.act = { type: 'shot', t: 0, V, released: false }; sfx('jump', { vol: .6 });
  p.vx *= .5; p.vy *= .5;
}
function shotChance(p, d, three, q, contest) {
  const base = d < 30 ? .93 : d < 60 ? .8 : d < 100 ? .66 : d < 136 ? .56 : d < 180 ? .42 : d < 240 ? .27 : .15;
  let r = three ? (.70 + .06 * p.r.deep) : (.78 + .045 * p.r.splash);
  let ch = base * r * q * tune('shotBase') - contest * tune('contestPenalty');
  if (novaOf(p)) ch = Math.max(ch, .78) * 1.15;
  if (p.pu === 'rocket') ch += .05;
  return clamp(ch, .03, .97);
}
function releaseShot(p, s, early) {
  const B = S.ball, M = S.match, hoop = attackHoop(p.team), d = hoopDist(p, hoop);
  const three = d > THREE_R + 6 && !(Math.abs(p.x - hoop.x) < 56 && false);
  const perfect = s < .2, q = perfect ? tune('perfectBonus') : s < .45 ? 1 : s < .8 ? .85 : .7;
  let contest = 0;
  for (const o of opps(p)) { const od = Math.hypot(o.x - p.x, o.y - p.y); if (od < 44) contest = Math.max(contest, (1 - od / 44) * (o.z > 6 ? 1.25 : 1) * (o.pu === 'giant' ? 1.4 : 1)); }
  contest = clamp(contest, 0, 1);
  let ch = shotChance(p, d, three, q, contest);
  const points = three ? tune('threeBonus') : 2;
  const make = rnd() < ch;
  B.x = p.x + Math.cos(p.facing) * 4; B.y = p.y; B.z = p.z + 58; B.owner = null; p.hasBall = false; B.state = 'shot'; B.last = p; B.noCatch = {}; B.noCatch[p.slot] = .5;
  B.shot = { shooter: p, points, three, perfect, make, d, t: 0, spot: spotHit(p), contested: contest > .4, dunk: false, rimT: 0 };
  // aim
  let tx = hoop.x, ty = hoop.y, tz = RIM_Z + 1;
  if (make) { tx += (rnd() - .5) * (perfect ? 0 : 3); ty += (rnd() - .5) * (perfect ? 0 : 3); }
  else {
    const mode = rnd();
    if (mode < .4) { const a = rnd() * TAU, rr = 10.5 + rnd() * 4; tx += Math.cos(a) * rr; ty += Math.sin(a) * rr; }
    else if (mode < .7) { tx -= hoop.dir * 14; tz = 88; ty += (rnd() - .5) * 8; } // off the glass
    else { const a = rnd() * TAU, rr = 16 + rnd() * 12; tx += Math.cos(a) * rr; ty += Math.sin(a) * rr; } // short or long
    if (d > 300 && rnd() < .3) { tx = hoop.x + (rnd() - .5) * 60; ty = hoop.y + (rnd() - .5) * 60; B.shot.air = true; }
  }
  const apex = clamp(10 + d * .09 + 14, 18, 44);
  const v = E.arc({ x: B.x, y: B.y, z: B.z }, { x: tx, y: ty, z: tz }, ballG(), { apex });
  B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.scored = false; B.touchedRim = false;
  M.shotClockStop = false;
  p.st.shots = (p.st.shots || 0) + 1;
  emit('release', { p: p.slot, perfect, three, make, d, early });
  sfx('tick', { vol: .0 }); if (perfect) { sfx('perfect'); p.st.perfect++; }
}
const spotHit = p => { if (courtDef().twist !== 'jackpot') return false; const sp = S.twist.spot; return Math.hypot(p.x - sp.x, p.y - sp.y) < 26; };

/* ---- dunks ---- */
function pickDunk(p, oop) {
  const lvl = p.r.slam + (novaOf(p) ? 2 : 0) + (oop ? 1 : 0) + Math.floor(rnd() * 3) - 1;
  const cands = DUNKS.filter(d => d.min <= lvl); return cands[Math.min(cands.length - 1, Math.floor(rnd() * 2) === 0 ? cands.length - 1 : Math.max(0, cands.length - 2))];
}
function startDunk(p, opts = {}) {
  const hoop = attackHoop(p.team), d0 = pickDunk(p, opts.oop), lvl = DUNKS.indexOf(d0);
  const dist = hoopDist(p, hoop), T = clamp(.46 + dist / 300, .5, .9) * (isMoon() ? 1.3 : 1) * (1 + (d0.h - 1) * .3);
  p.act = { type: 'dunk', t: 0, T: opts.T || T, x0: p.x, y0: p.y, tx: hoop.x - hoop.dir * 5, ty: hoop.y, dunk: d0, H: (14 + 20 * d0.h + 4 * lvl) * (isMoon() ? 1.5 : 1), rel: false, oop: !!opts.oop, rejected: false, perfect: !!opts.perfect, f0: p.facing, zEnd: 34 };
  p.turbo = Math.max(0, p.turbo - .15); p.vx = p.vy = 0; p.vz = 0; p.z = Math.max(p.z, .01);
  sfx('jump', { vol: .8 }); emit('dunkStart', { p: p.slot, dunk: d0.id });
}
function startOopLeap(p, perfect) {
  const B = S.ball; B.oop = null;
  const hoop = attackHoop(p.team), a = Math.max(.2, B.oopEta ? B.oopEta : .55);
  startDunk(p, { oop: true, T: clamp(a, .35, .7), perfect });
  p.act.noBall = true;
}
function dunkStep(p, dt) {
  const a = p.act, B = S.ball, M = S.match, u = clamp(a.t / a.T, 0, 1);
  const e = 1 - Math.pow(1 - u, 2);
  const nx = lerp(a.x0, a.tx, e), ny = lerp(a.y0, a.ty, e);
  p.vx = (nx - p.x) / dt; p.vy = (ny - p.y) / dt;
  p.x = nx; p.y = ny; p.vx = 0; p.vy = 0;
  const zz = a.zEnd * u + 4 * a.H * u * (1 - u) * (1.1 - u * .1) * (S.match.novaT[p.team] > 0 ? 1.15 : 1);
  p.z = Math.max(0.01, zz); p.vz = 0;
  const hoop = attackHoop(p.team);
  if (a.dunk.spin) p.facing = a.f0 + u * TAU * a.dunk.spin * (p.team ? -1 : 1) * 0.5 + (u > .8 ? 0 : 0);
  if (u > .8) p.facing = hoop.dir > 0 ? 0 : PI;
  // the ball rides in the hands
  if (!a.noBall && B.owner === p) { B.x = p.x + Math.cos(p.facing) * 3; B.y = p.y + .1; B.z = p.z + 60 + (u > .6 ? 8 : 0); }
  if (a.noBall && !a.caught && u > .62) { a.caught = true; const bb = B; if (bb.state === 'pass' && bb.oop === null || bb.state === 'pass') { giveBall(p); B.x = p.x; B.y = p.y; B.z = p.z + 62; emit('alleyoop', { p: p.slot, mate: p.mate }); } }
  // a defender in the air can reject it
  if (!a.rejected && u > .45 && u < .8) {
    for (const o of opps(p)) if (o.z > 8 && Math.hypot(o.x - p.x, o.y - p.y) < 22 && Math.abs((o.z + 55) - (p.z + 60)) < 24) {
      const ch = tune('dunkReject') * (o.r.swat + 1) / (o.r.swat + p.r.slam + 2) * 2 * (o.pu === 'giant' ? 1.5 : 1) * (novaOf(p) ? .3 : 1);
      if (rnd() < ch) { a.rejected = true; rejectBy(o, p); return; }
    }
  }
  if (!a.rel && u >= .84 && B.owner === p) {
    a.rel = true; B.owner = null; p.hasBall = false; B.state = 'shot'; B.x = hoop.x; B.y = hoop.y; B.z = RIM_Z + 10; B.vx = 0; B.vy = 0; B.vz = -260; B.scored = false; B.last = p;
    B.shot = { shooter: p, points: 2, three: false, perfect: a.perfect, make: true, dunk: a.dunk, d: 0, t: 0, spot: false, oop: a.oop, contested: false };
    M.shotClockStop = false; rimShake(hoop, 1);
    hitFx(hoop.x, hoop.y, RIM_Z, 1.6, '#ffd36a');
  }
  if (u >= 1) {
    // hang on the rim, then drop
    p.act = null; p.vz = -40; p.vx = -hoop.dir * 30; p.cheer = .8;
    if (a.dunk.nova || novaOf(p) || a.dunk.min >= 8) shatterBoard(hoop);
  }
}
function rejectBy(o, p) {
  const B = S.ball; p.act = null; p.vz = -60; p.stun = .5; p.vx = -Math.cos(p.facing) * 60;
  looseBall(-Math.cos(p.facing) * 150 + (rnd() - .5) * 80, (rnd() - .5) * 140, 160); B.last = o;
  o.st.blocks++; o.st.style += 2; p.cd.jump = .3; emit('block', { p: o.slot, victim: p.slot, dunk: true });
}

/* ---- passing ---- */
function passTo(p, m) {
  const B = S.ball; if (!p.hasBall) return;
  const d = Math.hypot(m.x - p.x, m.y - p.y), spd = 180 + 12 * p.r.dime, tt = d / spd;
  let tx = m.x + m.vx * tt * .8, ty = m.y + m.vy * tt * .8;
  const a = Math.atan2(ty - p.y, tx - p.x);
  B.owner = null; p.hasBall = false; B.state = 'pass'; B.last = p; B.target = m; B.noCatch = {}; B.noCatch[p.slot] = .25; B.shot = null; B.passer = p;
  B.x = p.x + Math.cos(a) * 6; B.y = p.y + Math.sin(a) * 6; B.z = p.z + 34;
  const dist = Math.hypot(tx - B.x, ty - B.y) || 1; B.vx = (tx - B.x) / dist * spd; B.vy = (ty - B.y) / dist * spd; B.vz = 0; B.pz = B.z; B.pTz = m.z + 40; B.pT = 0; B.pDur = dist / spd;
  p.facing = a; p.cd.steal = .2; emit('pass', { p: p.slot, to: m.slot });
  sfx('thud', { vol: .3 });
}
function throwInbound() {
  const M = S.match, ib = M.inbound; if (!ib) return;
  const who = ib.who, m = mateOf(who);
  passTo(who, m); M.inbound.thrown = true; ib.t = 0;
}
function throwOop(p) {
  const B = S.ball, m = mateOf(p), hoop = attackHoop(p.team), d = hoopDist(m, hoop);
  if (d > 330) { passTo(p, m); return; }
  const tx = hoop.x - hoop.dir * 5, ty = hoop.y, tz = RIM_Z + 8;
  const from = { x: p.x + Math.cos(p.facing) * 5, y: p.y, z: p.z + 50 };
  const apex = 40 + Math.min(50, Math.hypot(tx - from.x, ty - from.y) * .12);
  const v = E.arc(from, { x: tx, y: ty, z: tz }, ballG(), { apex });
  B.owner = null; p.hasBall = false; B.state = 'pass'; B.last = p; B.target = m; B.oop = m; B.oopEta = v.t; B.noCatch = {}; B.noCatch[p.slot] = .3; B.shot = null; B.passer = p;
  B.x = from.x; B.y = from.y; B.z = from.z; B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.pz = null;
  const runT = clamp(v.t - .55, 0, 2);
  m.act = { type: 'oopwait', t: 0, delay: runT, press: undefined };
  p.cd.steal = .2; emit('pass', { p: p.slot, to: m.slot, oop: true });
}

/* ---- defense: steal, shove, spin, block ---- */
function startSwipe(p) {
  p.act = { type: 'swipe', t: 0, dur: .34, done: false }; p.cd.steal = .55 + .3 * (1 - clamp(tune('cpuSkill'), .4, 1.2) * 0); sfx('swipe');
}
function swipeHit(p) {
  const B = S.ball, h = B.owner, reach = (14 + .6 * p.r.swipe) * reachBonus(p) + 6;
  if (h && h.team !== p.team) {
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    const dir = Math.atan2(h.y - p.y, h.x - p.x), face = angAbs(dir, p.facing);
    if (d < reach && face < 1.5 && h.immune <= 0 && !(h.act && h.act.type !== 'shot')) {
      const behind = Math.cos(h.facing - p.facing) > .3 ? 1.3 : 1;
      const ch = tune('stealChance') * (.55 + .09 * p.r.swipe) / (.55 + .07 * h.r.dime) * behind * (novaOf(h) ? .5 : 1) * clamp(1 - Math.abs(p.z) / 80, .5, 1);
      if (rnd() < ch) { p.st.steals++; p.st.style += 1; h.hasBall = false; h.stun = Math.max(h.stun, .25); giveBall(p); emit('steal', { p: p.slot, victim: h.slot }); hitFx(h.x, h.y, 40, 1, '#aef'); return; }
    }
    return;
  }
  // loose ball swat/grab
  if (!h && (B.state === 'loose' || B.state === 'dead')) { const d = Math.hypot(B.x - p.x, B.y - p.y); if (d < reach + 4 && B.z < 70) { giveBall(p); } }
}
function startShove(p, c) {
  p.act = { type: 'shove', t: 0, dur: .3, hit: false }; p.turbo = Math.max(0, p.turbo - .25); p.cd.shove = .8; sfx('swipe', { pitch: .7 });
  if (c && Math.hypot(c.mx, c.my) > .3) p.facing = Math.atan2(c.my, c.mx);
}
function shoveHit(p) {
  let hit = false;
  for (const o of opps(p)) {
    const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
    if (d > 20 * reachBonus(p) || Math.abs(o.z - p.z) > 22 || o.immune > 0 || o.stun > .3) continue;
    const ang = Math.atan2(dy, dx), face = angAbs(ang, p.facing);
    if (face > 1.3) continue;
    knockdown(o, p, Math.cos(ang), Math.sin(ang)); hit = true;
  }
  return hit;
}
function knockdown(o, p, dx, dy) {
  const B = S.ball, force = tune('shoveForce') * (.7 + .06 * p.r.bump) / (.8 + .04 * o.r.bump) * (p.nova ? 1.3 : 1);
  o.vx = dx * force; o.vy = dy * force * .7; o.stun = tune('knockdownTime') * (.75 + .05 * (p.r.bump - o.r.bump) + .25) * (novaOf(o) ? .5 : 1);
  o.stun = clamp(o.stun, .3, 2.2);
  if (o.act && o.act.type === 'dunk') { o.vz = -50; }
  if (o.act && o.act.type === 'shot' && !o.act.released) { }
  o.act = null; o.vz = Math.max(o.vz, 60);
  if (B.owner === o) { o.hasBall = false; looseBall(dx * 90 + (rnd() - .5) * 60, dy * 60 + (rnd() - .5) * 60, 130); B.last = o; B.noCatch[o.slot] = .35; emit('fumble', { p: o.slot }); }
  p.st.shoves++; p.st.style += 1; hitFx(o.x, o.y, 30, 1.3, '#ffb060'); sfx('shove'); sfx('down'); rumble(o, .6, .2);
  game.freeze && game.freeze(.07); emit('shove', { p: p.slot, victim: o.slot });
}
function startSpin(p, c) {
  const m = Math.hypot(c.mx, c.my), dir = m > .2 ? [c.mx / m, c.my / m] : [Math.cos(p.facing), Math.sin(p.facing)];
  p.act = { type: 'spin', t: 0, dur: .42, dx: dir[0], dy: dir[1], sp: speedOf(p) * 1.9, f0: p.facing, dir: dir[0] >= 0 ? -1 : 1 };
  p.turbo = Math.max(0, p.turbo - .2); p.cd.spin = 1.0; p.immune = .42; sfx('swipe', { pitch: 1.4 }); emit('spin', { p: p.slot });
}

/* ---- the ball ---- */
function rimShake(h, a) { h.shake = a; }
function shatterBoard(h) {
  const M = S.match; h.broken = 4.5; M.shatterT = 1.6; sfx('shatter'); sfx('slam');
  S.fx.flash = .9; S.fx.shake = 8; game.shake && game.shake(5);
  try { for (let i = 0; i < 40; i++) P.sparks(h.x - h.dir * 8, h.y + (rnd() - .5) * 40, RIM_Z + 10 + rnd() * 20, 1, null, { color: pick(['#ffffff', '#bfe8ff', '#8ad0ff']) }); } catch (e) { }
  emit('shatter', { hoop: h.side });
  banner('SHATTERED!', { colors: ['#ffffff', '#bfe8ff', '#6ab8ff'], scale: 4, life: 1.8, y: .3 });
}
function scoreBasket(B, hoopIdx) {
  const M = S.match, sh = B.shot; if (!sh) return;
  const p = sh.shooter, hoop = HOOPS[hoopIdx], team = p.team;
  let pts = sh.points; let bonus = '';
  if (sh.spot) { pts += 2; bonus = 'jackpot'; }
  if (B.gold) { pts *= 2; B.gold = false; }
  else if (p.pu === 'gold') { pts *= 2; p.pu = null; bonus = bonus || 'gold'; }
  B.scored = true; rimShake(hoop, .6); hoop.net = 1;
  M.score[team] += pts; p.st.pts += pts; M.qScores[M.qScores.length - 1][team] += pts;
  if (sh.dunk) { p.st.dunks++; p.st.style += 3 + DUNKS.indexOf(sh.dunk); }
  if (sh.three) p.st.threes++; if (sh.perfect) p.st.style += 1;
  // assists
  if (B.passer && B.passer.team === team && B.passer !== p && M.time - (B.passT || 0) < 3) { B.passer.st.assists++; }
  // streaks / supernova
  M.streak[team]++; M.streak[1 - team] = 0; M.runs[team] += pts; M.runs[1 - team] = 0;
  const wasNova = M.novaT[1 - team] > 0; if (wasNova) { M.novaT[1 - team] = 0; emit('supernovaOff', { team: 1 - team }); }
  if (M.streak[team] >= tune('novaStreak') && M.novaT[team] <= 0) { M.novaT[team] = 40; emit('supernovaOn', { team, p: p.slot }); }
  M.lastScorer = team; M.excite = Math.min(1, M.excite + .5);
  const lead = Math.abs(M.score[0] - M.score[1]); M.stats.bigLead = Math.max(M.stats.bigLead, lead);
  emit('basket', { p: p.slot, team, points: pts, three: sh.three, dunk: sh.dunk && sh.dunk.id, perfect: sh.perfect, bonus, oop: sh.oop });
  if (bonus === 'jackpot') emit('jackpot', { p: p.slot });
  // flow
  if (S.mode === 'camp') { M.campT = 1.4; return; }
  M.phase = 'score'; M.deadT = 0;
  if (M.sudden || (M.ot >= 2 && false)) { endGame(); }
}
function updateBall(dt) {
  const B = S.ball, M = S.match, g = ballG();
  B.t += dt; for (const k in B.noCatch) B.noCatch[k] = Math.max(0, B.noCatch[k] - dt);
  // trail
  if (B.state === 'shot' || B.state === 'pass') { B.trail.push([B.x, B.y, B.z]); if (B.trail.length > 8) B.trail.shift(); } else if (B.trail.length) B.trail.shift();
  if (B.state === 'held' && B.owner) { dribbleBall(B.owner, dt); return; }
  if (B.state === 'tip') { return; }
  if (B.state === 'dead' || B.state === 'inboundhold') { return; }
  // wind
  const wind = courtDef().twist === 'wind' ? S.twist.wind : 0;
  const sub = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < 40 || Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) < 40 ? 4 : 1, h = dt / sub;
  for (let s = 0; s < sub; s++) ballPhysics(B, h, g, wind);
  if (B.state === 'shot' && B.shot) {
    B.shot.t += dt;
    if (B.vz < 0 && B.z < 70 && B.scored) { B.state = 'loose'; B.scored = true; }
    // blocks and goaltending
    checkBlocks(B);
  }
  if (B.state === 'pass') {
    B.pT += dt;
    // a pass is a flat throw; it rises slightly with the receiver's height
    if (B.pz !== null && B.pz !== undefined) { const u = clamp(B.pT / Math.max(.05, B.pDur), 0, 1); B.z = lerp(B.pz, B.pTz, u); B.vz = 0; }
    if (B.pT > (B.pDur || 1) + .5 && !B.oop) { B.state = 'loose'; }
    if (B.oop && B.z < 8) { B.oop = null; B.state = 'loose'; }
  }
  tryCatch(B, dt);
  // out-of-court walls (the crowd)
  const wx0 = COURT.x0 - 24, wx1 = COURT.x1 + 24, wy0 = COURT.y0 - 24, wy1 = COURT.y1 + 24;
  if (B.x < wx0) { B.x = wx0; B.vx = Math.abs(B.vx) * .5; } if (B.x > wx1) { B.x = wx1; B.vx = -Math.abs(B.vx) * .5; }
  if (B.y < wy0) { B.y = wy0; B.vy = Math.abs(B.vy) * .5; } if (B.y > wy1) { B.y = wy1; B.vy = -Math.abs(B.vy) * .5; }
  if (B.state === 'loose') { M.looseT += dt; if (M.looseT > 6 && M.phase === 'live') { const n = S.players.slice().sort((a, b) => Math.hypot(a.x - B.x, a.y - B.y) - Math.hypot(b.x - B.x, b.y - B.y))[0]; giveBall(n); M.looseT = 0; } }
}
function ballPhysics(B, h, g, wind) {
  const px0 = B.x, py0 = B.y, pz0 = B.z;
  if (B.state !== 'pass' || B.pz === null || B.pz === undefined) B.vz -= g * h;
  if (B.state === 'pass' && B.oop) { B.vz = B.vz; }
  if (wind) B.vx += wind * 22 * h * (B.z > 20 ? 1 : .2);
  B.x += B.vx * h; B.y += B.vy * h; B.z += B.vz * h;
  B.roll += (Math.abs(B.vx) + Math.abs(B.vy)) * h * .1;
  // floor
  if (B.z < BALL_R) {
    B.z = BALL_R;
    if (B.vz < -40) { const bn = tune('ballBounce'); B.vz = -B.vz * bn; B.vx *= .94; B.vy *= .94; if (B.vz > 50) sfx('bounce', { vol: clamp(B.vz / 250, .15, .6) }); if (B.state === 'shot' || B.state === 'pass') { B.state = 'loose'; B.shot = B.shot; } }
    else { B.vz = 0; const f = Math.exp(-h * 1.6); B.vx *= f; B.vy *= f; }
  }
  // hoops
  for (let i = 0; i < 2; i++) {
    const hp = HOOPS[i];
    if (hp.broken > 0) { // no backboard
    } else {
      // backboard plane at x = hp.x - hp.dir*12 (court-local 40 and 600)
      const bx = hp.x - hp.dir * 12;
      if (B.z > 70 && B.z < 104 && Math.abs(B.y - hp.y) < 26) {
        const sideNow = (B.x - bx) * hp.dir, sidePrev = (px0 - bx) * hp.dir;
        if (sidePrev > 0 && sideNow < BALL_R) { B.x = bx + hp.dir * BALL_R; B.vx = Math.abs(B.vx) * .55 * hp.dir; B.vy *= .9; sfx('thud', { vol: .5 }); rimShake(hp, .4); touchRim(B); }
      }
    }
    // rim: torus
    const dx = B.x - hp.x, dy = B.y - hp.y, rr = Math.hypot(dx, dy);
    if (Math.abs(B.z - RIM_Z) < BALL_R + 2 && rr > 0.001) {
      const qx = hp.x + dx / rr * RIM_R, qy = hp.y + dy / rr * RIM_R, qz = RIM_Z;
      const ex = B.x - qx, ey = B.y - qy, ez = B.z - qz, dd = Math.hypot(ex, ey, ez);
      if (dd < BALL_R + 1.2 && dd > 0.001) {
        const nx = ex / dd, ny = ey / dd, nz = ez / dd, vn = B.vx * nx + B.vy * ny + B.vz * nz;
        if (vn < 0) { const rb = tune('rimBounce'); B.vx -= (1 + rb) * vn * nx; B.vy -= (1 + rb) * vn * ny; B.vz -= (1 + rb) * vn * nz; B.vx *= .95; B.vy *= .95; sfx('rim', { vol: clamp(-vn / 220, .2, .8) }); rimShake(hp, clamp(-vn / 260, .2, 1)); touchRim(B); }
        const push = BALL_R + 1.2 - dd; B.x += nx * push; B.y += ny * push; B.z += nz * push;
      }
    }
    // the basket
    if (!B.scored && pz0 > RIM_Z && B.z <= RIM_Z && B.vz < 0 && Math.hypot(B.x - hp.x, B.y - hp.y) < RIM_R - 1.5 && B.shot) {
      const vzb = B.vz; B.vx *= .55; B.vy *= .55; B.vz *= .6; sfx('swish', { vol: .7 });
      scoreBasket(B, i);
    }
  }
}
function touchRim(B) {
  if (!B.touchedRim && B.shot) { B.touchedRim = true; S.match.shotClock = tune('shotClock'); }
  if (B.shot && !B.scored) { B.shot.rimT++; if (B.shot.rimT >= 1) { /* loose after the first touch for rebounds */ B.noCatch = {}; B.state = B.state === 'shot' ? 'shot' : B.state; } }
}
function checkBlocks(B) {
  const sh = B.shot; if (!sh || B.scored) return;
  for (const o of S.players) {
    if (o.team === sh.shooter.team && o !== sh.shooter) continue;
    if (o === sh.shooter) continue;
    if (o.z <= 4 && !(o.pu === 'giant')) continue;
    const reach = (10 + .8 * o.r.swat + 6) * reachBonus(o);
    const hz = o.z + 58 + (o.pu === 'giant' ? 10 : 0), d = Math.hypot(o.x - B.x, o.y - B.y, (hz - B.z) * .9);
    if (d < reach) {
      const hoop = defendHoop(o.team);
      // goaltending: coming down, near and above the rim
      const gt = B.vz < 0 && Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < 18 + 0 && B.z > RIM_Z + 1 || (B.vz < 0 && Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) < 18 && B.z > RIM_Z + 1);
      if (gt && !novaOf(o) && !(o.tdef.robot)) {
        const hi = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) ? 0 : 1;
        B.shot.points = B.shot.points; B.x = HOOPS[hi].x; B.y = HOOPS[hi].y; B.z = RIM_Z - 1; B.vx = 0; B.vy = 0; B.vz = -120; emit('goaltend', { p: o.slot }); B.scored = false; return;
      }
      if (gt) continue;
      if (B.shot.dunk) continue;
      if (rnd() < tune('blockChance') * (.6 + .05 * o.r.swat) * (sh.shooter.pu === 'giant' ? .7 : 1)) {
        sh.shooter.st.style += 0; o.st.blocks++; o.st.style += 2;
        const dir = Math.atan2(B.y - o.y, B.x - o.x) + (rnd() - .5) * 1.2;
        B.state = 'loose'; B.shot = null; B.vx = Math.cos(dir) * 220; B.vy = Math.sin(dir) * 160; B.vz = 70 + rnd() * 80; B.last = o; B.noCatch[o.slot] = .35;
        hitFx(B.x, B.y, B.z, 1.5, '#9ef'); game.freeze && game.freeze(.08);
        emit('block', { p: o.slot, victim: sh.shooter.slot }); return;
      }
    }
  }
}
function dribbleBall(p, dt) {
  const B = S.ball; const sp = Math.hypot(p.vx, p.vy); p.ph = (p.ph || 0) + dt * (7 + sp * .05);
  const f = p.facing, side = Math.sin(p.phase) * 0;
  if (p.act && p.act.type === 'shot') { B.x = p.x + Math.cos(f) * 3; B.y = p.y + .2; B.z = p.z + 56 + clamp(p.vz * 0.02, -2, 6); B.vx = B.vy = B.vz = 0; return; }
  if (p.act && p.act.type === 'dunk') return;
  if (p.z > 1) { B.x = p.x + Math.cos(f) * 4; B.y = p.y; B.z = p.z + 52; return; }
  const phase = (p.ph % 1), b = Math.abs(Math.sin(phase * PI));
  const lead = 9 + Math.min(4, sp * .03);
  B.x = p.x + Math.cos(f) * lead; B.y = p.y + Math.sin(f) * lead * .6 + 3;
  const prevZ = B.z; B.z = 4.5 + b * 26;
  if (prevZ > B.z + .01 && B.z < 6 && (B.t - (B.lastBounce || 0)) > .15) { B.lastBounce = B.t; if (M_isLive()) sfx('dribble', { vol: .3 }); }
  if (p.stun > 0 || p.immune > 0 && p.act && p.act.type === 'spin') { B.z = 30; }
  B.vx = p.vx; B.vy = p.vy; B.vz = 0;
}
const M_isLive = () => S.match && (S.match.phase === 'live');

function tryCatch(B, dt) {
  const M = S.match;
  if (!(B.state === 'loose' || B.state === 'pass' || B.state === 'shot' && (B.touchedRim || B.shot && B.shot.t > .3 && B.z < 62 && B.vz < 0 && B.shot.d > 400))) return;
  if (M.phase !== 'live' && M.phase !== 'inbound' && M.phase !== 'camp') return;
  let best = null, bd = 1e9;
  for (const p of S.players) {
    if (p.stun > 0 || p.frozen > 0 || (B.noCatch[p.slot] || 0) > 0 || p.act && (p.act.type === 'dunk' && !p.act.noBall || p.act.type === 'shot' || p.act.type === 'spin')) continue;
    const rad = (8 + (p.z > 4 ? 4 : 0)) * reachBonus(p), dz = B.z - (p.z + 30);
    const d = Math.hypot(B.x - p.x, B.y - p.y);
    const zMax = (p.z > 4 ? 66 : 50) + (reachBonus(p) > 1 ? 14 : 0);
    if (d < rad && B.z >= p.z - 2 && B.z <= p.z + zMax) {
      const sp = Math.hypot(B.vx, B.vy, B.vz);
      if (B.state === 'shot' && !B.touchedRim) continue;
      // a pass can be caught by its target easily; others need a better chance
      let ok = true;
      if (B.state === 'pass' && B.target !== p) ok = rnd() < (.35 + .06 * p.r.swipe) * .08 * 8 && p.team !== (B.last ? B.last.team : -1);
      if (B.state === 'pass' && p.team === (B.last ? B.last.team : -1) && B.target !== p) ok = false;
      if (ok && d < bd) { best = p; bd = d; }
    }
  }
  if (best) {
    const wasPass = B.state === 'pass', pas = B.passer, tgt = B.target, last = B.last;
    giveBall(best);
    if (wasPass && tgt !== best && last && last.team !== best.team) { best.st.steals++; emit('steal', { p: best.slot, victim: last.slot, pass: true }); }
    else if (wasPass && pas && pas.team === best.team) { B.passT = M.time; B.passer = pas; }
    else if (!wasPass && last && last.team !== best.team && B.touchedRim) emit('rebound', { p: best.slot });
    if (M.phase === 'inbound') { M.phase = 'live'; M.inbound = null; }
    if (best.vz > 0 || best.z > 4) { }
  }
}

/* ---- match flow ---- */
function startTip() {
  const M = S.match, B = S.ball, a = S.players[0], b = S.players[2];
  resetPositions();
  a.x = COURT.cx - 14; a.y = COURT.cy; b.x = COURT.cx + 14; b.y = COURT.cy; a.facing = 0; b.facing = PI;
  const m1 = S.players[1], m2 = S.players[3]; m1.x = COURT.cx - 70; m1.y = COURT.cy - 40; m2.x = COURT.cx + 70; m2.y = COURT.cy + 40;
  M.phase = 'tip'; M.tip = { t: 0, jumpers: [a, b], jumpT: {}, done: false, T: .9 };
  B.state = 'tip'; B.owner = null; B.x = COURT.cx; B.y = COURT.cy; B.z = 20; B.vx = B.vy = B.vz = 0; B.shot = null;
  S.players.forEach(p => p.hasBall = false);
  emit('tipoff', { a: a.slot, b: b.slot });
}
function tipStep(dt) {
  const M = S.match, B = S.ball, T = M.tip; T.t += dt;
  B.z = 20 + 100 * Math.sin(clamp(T.t / (T.T * 2), 0, 1) * PI); B.x = COURT.cx; B.y = COURT.cy;
  for (const p of T.jumpers) {
    if (!p.input && T.jumpT[p.slot] === undefined) {
      if (!p.ai.tipT) p.ai.tipT = .62 + (rnd() - .5) * .5 / clamp(tune('cpuSkill') * DIFF[M.difficulty], .4, 1.8) + .05;
      if (T.t >= p.ai.tipT && p.z <= 0) { p.vz = tune('jumpShotVz') * 1.1; T.jumpT[p.slot] = T.t; sfx('jump'); }
    }
  }
  if (T.t >= T.T && !T.done) {
    T.done = true;
    const err = p => T.jumpT[p.slot] === undefined ? 9 : Math.abs(T.jumpT[p.slot] - (T.T - .28));
    const w = err(T.jumpers[0]) <= err(T.jumpers[1]) ? T.jumpers[0] : T.jumpers[1];
    M.arrow = 1 - w.team;
    const m = mateOf(w);
    B.state = 'pass'; B.last = w; B.target = m; B.noCatch = {}; B.noCatch[w.slot] = .5; B.passer = w; B.pz = null;
    const v = E.arc({ x: B.x, y: B.y, z: B.z }, { x: m.x, y: m.y, z: 34 }, ballG(), { apex: 10 }); B.vx = v.vx; B.vy = v.vy; B.vz = v.vz; B.pDur = v.t;
    M.phase = 'live'; M.possession = w.team; M.shotClock = tune('shotClock'); sfx('tip'); M.tip = null;
    emit('tipwon', { p: w.slot });
  }
}
function startInbound(team, x, y, who) {
  const M = S.match, B = S.ball, tm = S.players.filter(p => p.team === team);
  const ib = who || tm.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  ib.x = x; ib.y = y; ib.vx = ib.vy = 0; ib.act = null; ib.stun = 0; ib.z = 0; ib.vz = 0; ib.facing = x < COURT.cx ? 0 : PI;
  if (Math.abs(x - COURT.cx) < 40) ib.facing = team === 0 ? 0 : PI;
  const mate = mateOf(ib); mate.x = clamp(x + (team === 0 ? 1 : -1) * 90, COURT.x0 + 20, COURT.x1 - 20); mate.y = COURT.cy + (mate.y > COURT.cy ? 40 : -40);
  giveBall(ib); B.state = 'held'; M.possession = team; M.shotClock = tune('shotClock');
  M.phase = 'inbound'; M.inbound = { who: ib, t: 0, thrown: false, x, y };
  // opponents stay clear
  for (const o of S.players.filter(p => p.team !== team)) { const d = Math.hypot(o.x - x, o.y - y); if (d < 30) { const a = Math.atan2(o.y - y, o.x - x) || 0; o.x = x + Math.cos(a) * 34; o.y = y + Math.sin(a) * 34; } }
  emit('inbound', { p: ib.slot });
}
function afterBasket() {
  const M = S.match, scorer = M.lastScorer, team = 1 - scorer, h = defendHoop(team);
  const bx = h.side === 0 ? COURT.x0 - 10 : COURT.x1 + 10;
  startInbound(team, bx, COURT.cy);
}
function endQuarter() {
  const M = S.match; M.buzzer = false; sfx('buzzer'); emit('quarterEnd', { q: M.quarter });
  M.phase = 'break'; M.breakT = M.quarter === 2 ? 8 : 5; M.breakKind = M.quarter === 2 ? 'half' : 'quarter';
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; B.owner = null; } B.state = 'dead';
  if (S.cfg && S.cfg.hub) M.breakT = 2;
  if (M.quarter >= 4 || M.ot > 0) {
    if (M.score[0] !== M.score[1] || (S.cfg && S.cfg.noOT)) { endGame(); return; }
    // overtime
    M.ot++; M.breakKind = 'ot'; M.breakT = 4; M.qLen = 60; if (M.ot >= 3) { M.sudden = true; M.breakKind = 'sudden'; emit('sudden', {}); } else emit('overtime', {});
    M.qScores.push([0, 0]);
    return;
  }
  if (M.quarter === 2) emit('halftime', {});
  M.qScores.push([0, 0]);
}
function nextQuarter() {
  const M = S.match;
  if (M.breakKind === 'ot' || M.breakKind === 'sudden') { M.quarter++; M.clock = M.sudden ? 600 : 60; }
  else { M.quarter++; M.clock = M.qLen; }
  M.shotClock = tune('shotClock');
  const team = M.arrow; M.arrow = 1 - M.arrow;
  resetPositions();
  startInbound(team, COURT.cx, COURT.y0 - 6);
  emit('quarterStart', { q: M.quarter });
}
function endGame() {
  const M = S.match; if (M.over) return;
  M.over = true; M.phase = 'end'; M.endT = 0; M.winner = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
  const B = S.ball; if (B.owner) { B.owner.hasBall = false; } B.owner = null; B.state = 'dead';
  S.players.forEach(p => { p.cheer = p.team === M.winner ? 99 : 0; p.act = null; });
  emit('gameEnd', { winner: M.winner, score: M.score.slice() });
}
function mvpOf() { let best = S.players[0], bs = -1; for (const p of S.players) { const s = p.st.pts * 2 + p.st.style * 3 + p.st.blocks * 4 + p.st.steals * 4 + p.st.assists * 3; if (s > bs) { bs = s; best = p; } } return best; }

function twistStep(dt) {
  const T = S.twist, M = S.match, kind = courtDef().twist; T.t += dt;
  if (kind === 'wind') { T.windT = (T.windT || 0) - dt; if (T.windT <= 0) { T.windT = 4 + rnd() * 5; T.windTarget = (rnd() - .5) * 2.2; } T.wind = approach(T.wind, T.windTarget, dt * .5); }
  if (kind === 'jackpot') { T.spot.t += dt; if (T.spot.t > 14) { T.spot.t = 0; const x = COURT.cx + (rnd() < .5 ? -1 : 1) * (120 + rnd() * 90), y = COURT.y0 + 40 + rnd() * (CH - 80); T.spot.x = x; T.spot.y = y; } }
  if (kind === 'puddle' && !T.puddles.length) T.puddles = [{ x: COURT.cx - 120, y: COURT.cy + 50, r: 22 }, { x: COURT.cx + 110, y: COURT.cy - 60, r: 24 }, { x: COURT.cx, y: COURT.cy + 85, r: 18 }];
}
function powerupStep(dt) {
  const M = S.match;
  if (S.mode === 'camp') return;
  M.powerT -= dt;
  if (M.powerT <= 0 && S.powerups.length < 2 && (M.phase === 'live')) {
    M.powerT = tune('powerupEvery') * (.8 + rnd() * .5); const pu = POWERUPS[Math.floor(rnd() * POWERUPS.length)];
    S.powerups.push({ id: pu.id, x: COURT.x0 + 140 + rnd() * (CW - 280), y: COURT.y0 + 40 + rnd() * (CH - 80), t: 0, life: 14 }); emit('powerupSpawn', { id: pu.id });
  }
  for (const u of S.powerups) {
    u.t += dt; u.life -= dt;
    for (const p of S.players) if (!u.taken && Math.hypot(p.x - u.x, p.y - u.y) < 13 && p.z < 12) { u.taken = true; grantPower(p, u.id); }
  }
  S.powerups = S.powerups.filter(u => !u.taken && u.life > 0);
}
function grantPower(p, id) {
  const def = POWERUPS.find(q => q.id === id); sfx('power');
  if (id === 'freeze') { const o = opps(p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; o.frozen = def.dur; o.vx = o.vy = 0; sfx('freeze'); if (S.ball.owner === o && rnd() < .5) { o.hasBall = false; looseBall(0, 0, 80); } emit('powerupPick', { p: p.slot, id, victim: o.slot }); return; }
  p.pu = id; p.puT = def.dur; if (id === 'gold') S.ball.gold = false; emit('powerupPick', { p: p.slot, id });
}

/* ---- the whole step ---- */
function matchStep(dt, cmdFor) {
  const M = S.match; if (!M) return;
  M.time += dt; M.excite = Math.max(0, M.excite - dt * .08);
  if (M.phase === 'camp') { M.time = M.time; }
  const cmds = S.players.map(p => cmdFor(p));
  // shatter pause: the world freezes briefly
  if (M.shatterT > 0) { M.shatterT -= dt; for (const h of HOOPS) { if (h.broken > 0) { } } return; }
  for (let i = 0; i < 4; i++) playerStep(S.players[i], cmds[i], dt);
  // separation
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = S.players[i], b = S.players[j]; if ((a.act && a.act.type === 'dunk') || (b.act && b.act.type === 'dunk')) continue;
    if (Math.abs(a.z - b.z) > 30) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 12;
    if (d < m && d > .001) { const push = (m - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; }
  }
  for (const h of HOOPS) { h.shake = Math.max(0, (h.shake || 0) - dt * 1.4); h.net = Math.max(0, (h.net || 0) - dt * 1.2); if (h.broken > 0) { h.broken -= dt; } }
  twistStep(dt);
  switch (M.phase) {
    case 'tip': tipStep(dt); break;
    case 'live': {
      updateBall(dt);
      if (!S.cheats.noClock) {
        const b = S.ball;
        if (M.clock > 0) M.clock -= dt;
        if (b.owner || b.state !== 'dead') { if (b.owner || b.state === 'loose') M.shotClock -= dt * (b.state === 'loose' ? .5 : 1); }
        if (M.clock <= 0) {
          M.clock = 0;
          if (!(b.state === 'shot' && !b.scored && b.shot && b.z > 30 && b.shot.t < 3)) { if (M.phase === 'live') endQuarter(); }
        } else if (M.shotClock <= 0 && b.owner) {
          emit('shotClockViolation', { team: b.owner.team }); sfx('buzzer'); const tm = 1 - b.owner.team; const w = b.owner; w.hasBall = false;
          startInbound(tm, COURT.cx + (rnd() < .5 ? -1 : 1) * 100, COURT.y0 - 6);
        }
      }
      break; }
    case 'score': {
      updateBall(dt); M.deadT += dt;
      if (M.deadT > 1.2) afterBasket();
      break; }
    case 'inbound': {
      updateBall(dt); const ib = M.inbound; if (!ib) { M.phase = 'live'; break; }
      ib.t += dt;
      // the inbounder's rig: hold ball
      if (!ib.thrown && S.ball.owner === ib.who) { S.ball.x = ib.who.x + Math.cos(ib.who.facing) * 6; S.ball.y = ib.who.y; S.ball.z = ib.who.z + 50; }
      if (!ib.who.input && ib.t > .6 && !ib.thrown) throwInbound();
      if (ib.who.input && ib.t > 3 && !ib.thrown) throwInbound();
      for (const o of S.players.filter(p => p.team !== ib.who.team)) { const d = Math.hypot(o.x - ib.x, o.y - ib.y); if (d < 24 && d > .01) { o.x = ib.x + (o.x - ib.x) / d * 24; o.y = ib.y + (o.y - ib.y) / d * 24; } }
      if (ib.thrown && ib.t > 2.5) { M.phase = 'live'; M.inbound = null; }
      if (ib.thrown && S.ball.owner && S.ball.owner.team === ib.who.team && S.ball.owner !== ib.who) { M.phase = 'live'; M.inbound = null; }
      break; }
    case 'break': {
      M.breakT -= dt; if (M.breakT <= 0) nextQuarter(); break; }
    case 'end': M.endT += dt; break;
    case 'camp': updateBall(dt); if (M.campT > 0) { M.campT -= dt; if (M.campT <= 0 && typeof lessonSetup === 'function') lessonSetup(); } break;
  }
  powerupStep(dt);
  // clock stops on baskets etc; streak bookkeeping
  for (let t = 0; t < 2; t++) if (M.novaT[t] > 0) { M.novaT[t] -= dt; if (M.novaT[t] <= 0) emit('supernovaOff', { team: t }); }
  const lead = M.score[0] - M.score[1]; M.stats.lead = lead;
}

/* ===== 34-ai.js ===== */
/* BASKETBLAM - CPU brains. Every slot is driven by a command source; this is the CPU's. */
function goto(c, p, tx, ty, close = 6) {
  const dx = tx - p.x, dy = (ty - p.y) / .82, d = Math.hypot(dx, dy);
  if (d < close) return d;
  c.mx = dx / d; c.my = dy / d; return d;
}
function skillOf(p) {
  const M = S.match, d = DIFF[M.difficulty] || 1; let s = tune('cpuSkill') * d;
  const diff = M.score[p.team] - M.score[1 - p.team];
  if (diff < -6) s *= 1 + tune('comeback') * .2; else if (diff > 14) s *= 1 - tune('comeback') * .15;
  if (S.mode === 'attract') s = 1.4;
  return clamp(s, .35, 1.9);
}
function aiCmd(p, dt) {
  const c = NOCMD(), M = S.match, B = S.ball, ai = p.ai; ai.t += dt;
  const sk = skillOf(p), hoopA = attackHoop(p.team), hoopD = defendHoop(p.team), mate = mateOf(p), foes = opps(p), dir = hoopA.dir;
  const attract = S.mode === 'attract';
  if (M.phase === 'tip' || M.phase === 'pre' || M.phase === 'break' || M.phase === 'end') {
    if (M.phase === 'end' || M.phase === 'break') return c;
    // tip: jumpers handled by the tip step; others hover
    goto(c, p, COURT.cx - dir * (p.slot % 2 ? 130 : 80), COURT.cy + (p.slot % 2 ? 50 : -50)); return c;
  }
  if (M.phase === 'inbound' && M.inbound) {
    if (M.inbound.who === p) { return c; }
    if (M.inbound.who.team === p.team) { // receiver: get open
      const tx = M.inbound.x + (M.inbound.who.team === 0 ? 1 : -1) * 110, ty = COURT.cy + (p.y > COURT.cy ? 45 : -45); goto(c, p, tx, ty);
    } else { const bh = M.inbound.who; goto(c, p, bh.x + (hoopD.dir) * 34 * (bh.x < COURT.cx ? 1 : -1), bh.y + (p.y > bh.y ? 30 : -30)); }
    return c;
  }
  if (p.act && (p.act.type === 'dunk' || p.act.type === 'oopwait')) { c.shoot.down = true; return c; }
  // in the air shooting: hold the button until the top
  if (p.act && p.act.type === 'shot') {
    const apex = p.act.V / playerG(), err = ai.shootErr || 0;
    c.shoot.down = p.act.t < apex * (1 + err) + (p.act.t < .12 ? .05 : 0);
    return c;
  }
  const hasTurboFor = p.turbo > .25 || attract || novaOf(p);
  if (p.hasBall) {
    const d = hoopDist(p, hoopA); ai.holdT = (ai.holdT || 0) + dt;
    // nearest foe in front
    let near = null, nd = 999; for (const f of foes) { const fd = Math.hypot(f.x - p.x, f.y - p.y); if (fd < nd) { nd = fd; near = f; } }
    const open = nd > 34;
    // dunk
    if (d < dunkRangeOf(p) * .9 && p.turbo >= .1 && (!near || nd > 14 || novaOf(p) || rnd() < .02)) {
      c.turbo.down = true; if (p.z <= 0) c.shoot.pressed = true; c.shoot.down = true; goto(c, p, hoopA.x, hoopA.y); ai.holdT = 0; return c;
    }
    // oop to a mate near the hoop
    if (mate.input === null || true) { const md = hoopDist(mate, hoopA); if ((md < 190 && d > 90 && (ai.oopCall > 0 || rnd() < .004 * sk)) && !foes.some(f => Math.hypot(f.x - mate.x, f.y - mate.y) < 20)) { c.oop.pressed = true; ai.oopCall = 0; return c; } }
    ai.oopCall = Math.max(0, (ai.oopCall || 0) - dt);
    // shoot
    const range = 95 + p.r.deep * 8, wantShot = d < range && ((open && ai.holdT > .55 / sk) || ai.holdT > 2.2 || M.shotClock < 4);
    if (wantShot && p.z <= 0 && !p.act) {
      c.shoot.pressed = true; c.shoot.down = true; ai.shootErr = (rnd() - .5) * .8 / sk; return c;
    }
    // spin past a defender
    if (near && nd < 26 && p.cd.spin <= 0 && p.turbo > .3 && rnd() < .05 * sk) { c.shove.pressed = true; c.mx = dir; c.my = (hoopA.y - p.y) / 120; return c; }
    // pass if covered
    if (near && nd < 22 && rnd() < .02 * sk && hoopDist(mate, hoopA) < d + 40) { c.pass.pressed = true; return c; }
    // drive: aim for the hoop, drift to the open side
    let ty = hoopA.y; if (near && nd < 60 && Math.abs(near.y - p.y) < 40) ty += (near.y > p.y ? -1 : 1) * 36;
    let tx = hoopA.x - dir * 30; if (d > 220) tx = hoopA.x - dir * 90;
    goto(c, p, tx, ty, 4); c.turbo.down = hasTurboFor && d > 70 && (open || attract); return c;
  }
  ai.holdT = 0;
  const h = B.owner;
  if (h && h.team === p.team) { // offense off the ball: spread, cut to the hoop for an oop
    const hd = hoopDist(h, hoopA);
    let tx, ty;
    if (hd < 200 && p.y !== h.y) { tx = hoopA.x - dir * 50; ty = hoopA.y + (h.y > hoopA.y ? -55 : 55); }
    else { tx = clamp(h.x + dir * 120, COURT.x0 + 50, COURT.x1 - 50); ty = COURT.cy + (h.y > COURT.cy ? -70 : 70); }
    goto(c, p, tx, ty, 8); c.turbo.down = hasTurboFor && Math.hypot(tx - p.x, ty - p.y) > 100; return c;
  }
  if (h) { // defense
    const ownD = hoopDist(h, hoopD), guard = Math.hypot(h.x - p.x, h.y - p.y) <= Math.hypot(h.x - mate.x, h.y - mate.y);
    const other = foes.find(f => f !== h);
    if (guard) {
      const tx = h.x + (hoopD.x - h.x) * (28 / Math.max(28, ownD)), ty = h.y + (hoopD.y - h.y) * (28 / Math.max(28, ownD)), d = Math.hypot(h.x - p.x, h.y - p.y);
      goto(c, p, tx, ty, 5); c.turbo.down = hasTurboFor && d > 70;
      ai.swipeT = (ai.swipeT || 0) - dt;
      if (d < 26 && ai.swipeT <= 0 && !h.act) { if (p.cd.shove <= 0 && rnd() < .3) { c.shove.pressed = true; ai.swipeT = (.9 + rnd()) / sk; } else if (p.cd.steal <= 0) { c.pass.pressed = true; ai.swipeT = (.5 + rnd()) / sk; } }
      // jump to block a shot
      if (h.act && h.act.type === 'shot' && d < 36 && p.z <= 0 && h.z > 5 && p.cd.jump <= 0 && rnd() < .08 * sk) { c.shoot.pressed = true; }
    } else {
      const tx = other.x + (hoopD.x - other.x) * (30 / Math.max(30, hoopDist(other, hoopD))), ty = other.y + (hoopD.y - other.y) * (30 / Math.max(30, hoopDist(other, hoopD)));
      goto(c, p, tx, ty, 8); c.turbo.down = hasTurboFor && Math.hypot(tx - p.x, ty - p.y) > 90;
      // sag toward the hoop on a drive: jump to reject a dunk
      if (h.act && h.act.type === 'dunk' && p.z <= 0 && Math.hypot(h.x - p.x, h.y - p.y) < 50 && p.cd.jump <= 0 && rnd() < .05 * sk) c.shoot.pressed = true;
    }
    return c;
  }
  // loose ball or a shot in the air
  if (B.state === 'shot' && B.shot) {
    const hp = Math.hypot(B.x - HOOPS[0].x, B.y - HOOPS[0].y) < Math.hypot(B.x - HOOPS[1].x, B.y - HOOPS[1].y) ? HOOPS[0] : HOOPS[1];
    const tx = hp.x - hp.dir * 22 + (p.slot % 2 ? 0 : 0), ty = hp.y + (p.slot % 2 ? 18 : -18);
    // blocking
    if (p.team !== B.shot.shooter.team && p.z <= 0 && Math.hypot(B.x - p.x, B.y - p.y) < 40 && B.z > 40 && p.cd.jump <= 0 && rnd() < .06 * sk) c.shoot.pressed = true;
    goto(c, p, tx, ty, 6); return c;
  }
  // chase: the nearer of the two
  const dm = Math.hypot(B.x - mate.x, B.y - mate.y), dme = Math.hypot(B.x - p.x, B.y - p.y);
  if (dme <= dm || mate.input) { goto(c, p, B.x + B.vx * .15, B.y + B.vy * .15, 3); c.turbo.down = hasTurboFor && dme > 60; if (dme < 40 && B.z > 40 && p.z <= 0 && p.cd.jump <= 0 && !B.vz < 0) c.shoot.pressed = rnd() < .1; }
  else goto(c, p, lerp(B.x, hoopA.x, .4), lerp(B.y, COURT.cy, .5), 8);
  return c;
}

/* ---- command sources ---- */
function cmdFor(p) {
  if (S.dev.autopilot && p.input) return aiCmd(p, 1 / 120);
  if (p.input && S.mode !== 'attract') return humanCmd(p.input);
  if (p.script) return p.script(p);
  return aiCmd(p, 1 / 120);
}

/* ===== 36-render.js ===== */
/* BASKETBLAM - the court, drawing, camera and effects */

/* ---- the court map: floor painted by floorTex, stands as tiered walls ---- */
const MAPC = 48, MAPR = 28, T16 = 16;
const courtMaps = {};
function courtRows() {
  const rows = [];
  for (let r = 0; r < MAPR; r++) {
    let s = '';
    for (let c = 0; c < MAPC; c++) {
      const inC = c >= 4 && c < 44;
      if (r === 0) s += c >= 2 && c < 46 ? '#' : ',';
      else if (r >= 1 && r <= 4) s += c >= 2 && c < 46 ? String(r) : ',';
      else if (r >= 7 && r < 25 && inC) s += '.';
      else s += c >= 2 && c < 46 && r < 27 ? 'a' : ',';
    }
    rows.push(s);
  }
  return rows;
}
function courtFloor(cd, courtId) {
  const f0 = E.hex(cd.floor[0]), f1 = E.hex(cd.floor[1]), ln = E.hex(cd.line), pt = E.hex(cd.paint), ap = E.hex(cd.apron);
  return (x, y, tag) => {
    const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
    if (tag === 'out') return [10 + n * 6, 8 + n * 6, 16 + n * 6];
    if (tag === 'apron') { const k = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? 1 : 0; return [ap[0] * (.92 + k * .12) + n * 6, ap[1] * (.92 + k * .12) + n * 6, ap[2] * (.92 + k * .12) + n * 6]; }
    let lx = x - OX, ly = y - OY;
    const plank = Math.floor(ly / 6) % 2 ? f0 : f1, grain = E.noise2(lx * .04, ly * 1.2) * 10 + n * 8;
    let col = [plank[0] + grain, plank[1] + grain, plank[2] + grain];
    const mx = lx > CW / 2 ? CW - lx : lx;    // mirrored distance from the nearest baseline
    const rim = { x: 52, y: 144 };
    const dR = Math.hypot(mx - rim.x, ly - rim.y);
    // painted key and arcs
    const inKey = mx < 152 && ly > 96 && ly < 192;
    if (inKey) col = [pt[0] * .8 + grain, pt[1] * .8 + grain, pt[2] * .8 + grain];
    const L = [ln[0], ln[1], ln[2]]; let line = false;
    if (lx < 1.5 || lx > CW - 1.5 || ly < 1.5 || ly > CH - 1.5) line = true;
    if (Math.abs(lx - CW / 2) < 1) line = true;
    if (Math.abs(Math.hypot(lx - CW / 2, ly - CH / 2) - 40) < 1) line = true;
    if (Math.abs(mx - 152) < 1 && ly > 96 && ly < 192) line = true;
    if (Math.abs(ly - 96) < 1 && mx < 152) line = true; if (Math.abs(ly - 192) < 1 && mx < 152) line = true;
    if (Math.abs(Math.hypot(mx - 152, ly - 144) - 48) < 1 && mx > 152) line = true;
    if (Math.abs(dR - THREE_R) < 1.1 && mx > 108 + 0 && ly > 20 && ly < 268) line = true;
    if ((Math.abs(ly - 20) < 1 || Math.abs(ly - 268) < 1) && mx < 108) line = true;
    if (Math.hypot(mx - 52, ly - 144) < 4 && false) line = true;
    // centre logo burst
    const cr = Math.hypot(lx - CW / 2, ly - CH / 2);
    if (cr < 34) { const ang = Math.atan2(ly - CH / 2, lx - CW / 2); const spike = .55 + .45 * Math.abs(Math.sin(ang * 6)); if (cr < 30 * spike + 4) col = [pt[0] * 1.1 + 30, pt[1] * 1.1 + 20, pt[2] * 1.1 + 10]; }
    if (cr < 14) col = [250, 220, 120];
    if (line) return [L[0], L[1], L[2]];
    return col;
  };
}
function getCourtMap(id) {
  if (courtMaps[id]) return courtMaps[id];
  const cd = COURTS[id], st = cd.stands, wl = E.hex(cd.wallTop);
  const map = new E.TileMap({
    rows: courtRows(), outside: '#05040a', ao: 3,
    legend: { '#': 9, 1: 4, 2: 3, 3: 2, 4: 1, '.': { floor: 'court' }, a: { floor: 'apron' }, ',': { floor: 'out' } },
    floorTex: courtFloor(cd, id),
    types: {
      9: { h: 70, side: cd.wall, top: cd.wallTop, face: 'plaster' },
      4: { h: 58, side: st[0], top: cd.wallTop, face: 'stone' }, 3: { h: 44, side: st[1], top: cd.wallTop, face: 'stone' },
      2: { h: 30, side: st[0], top: cd.wallTop, face: 'stone' }, 1: { h: 16, side: st[1], top: cd.wallTop, face: 'stone' }
    }
  });
  courtMaps[id] = map; return map;
}

/* ---- the crowd ---- */
let crowdFans = [], crowdFor = '';
function buildCrowd(id) {
  if (crowdFor === id) return; crowdFor = id; crowdFans = [];
  const cd = COURTS[id], hs = [58, 44, 30, 16];
  for (let tier = 0; tier < 4; tier++) for (let c = 2; c < 46; c++) for (const dx of [4, 12]) {
    const h = E.hash2(c * 3 + dx, tier * 7 + 1);
    crowdFans.push({ x: c * 16 + dx, y: (tier + 1) * 16 + 8, z: hs[tier], shirt: cd.crowd[(h * 30 | 0) % 3], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'][(h * 50 | 0) % 4], ph: h * 9, side: c < 24 ? 0 : 1 });
  }
}

/* ---- backdrops ---- */
const backdrops = {};
const getBackdrop = id => backdrops[id] || (backdrops[id] = new E.Backdrop(COURTS[id].backdrop));

/* ---- the hoop ---- */
function drawHoop(r, h) {
  const bx = h.x - h.dir * 12, shake = (h.shake || 0), sh = Math.sin(game.time * 60) * shake * 1.2;
  // stanchion pole and arm (behind the baseline)
  const poleX = h.x - h.dir * 34;
  r.queue(poleX, h.y - 2, 0, g => {
    const [x0, y0] = r.w(poleX, h.y, 0), [x1, y1] = r.w(poleX, h.y, 74), [ax, ay] = r.w(bx, h.y, 76);
    px.rect(g, Math.round(x0) - 2, Math.round(y1), 4, Math.round(y0 - y1), '#5a5e70'); px.rect(g, Math.round(x0) - 2, Math.round(y1), 1, Math.round(y0 - y1), '#8a90a8');
    px.line(g, Math.round(x0), Math.round(y1) + 1, Math.round(ax), Math.round(ay), '#6a6e82', 3);
    px.rect(g, Math.round(x0) - 6, Math.round(y0) - 3, 12, 5, '#3a3c4a');
  });
  // backboard: a vertical panel at x = bx, y +/- 24, z 72..100
  r.queue(bx, h.y - 1, 40, g => {
    const sk = yy => bx + (yy - h.y) * h.dir * .55;   // cheated: the panel is skewed so its face reads from the broadcast camera
    const pts = [[sk(h.y - 24), h.y - 24, 72], [sk(h.y + 24), h.y + 24, 72], [sk(h.y + 24), h.y + 24, 102], [sk(h.y - 24), h.y - 24, 102]].map(p => r.w(p[0], p[1], p[2]));
    if (h.broken > 0) {
      if (h.broken > 3.8 && !(Math.floor(game.time * 20) % 2)) px.poly(g, pts, '#bfe8ff');
      // frame only
      px.line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#d8dce8', 1); px.line(g, pts[2][0], pts[2][1], pts[3][0], pts[3][1], '#d8dce8', 1);
      return;
    }
    px.poly(g, pts, '#c9e4f4'); px.line(g, pts[0][0], pts[0][1], pts[1][0], pts[1][1], '#ffffff', 1); px.line(g, pts[3][0], pts[3][1], pts[2][0], pts[2][1], '#ffffff', 1);
    px.line(g, pts[0][0], pts[0][1], pts[3][0], pts[3][1], '#e8f4ff', 1); px.line(g, pts[1][0], pts[1][1], pts[2][0], pts[2][1], '#9ab8cc', 1);
    const sq = [[sk(h.y - 9), h.y - 9, 80], [sk(h.y + 9), h.y + 9, 80], [sk(h.y + 9), h.y + 9, 92], [sk(h.y - 9), h.y - 9, 92]].map(p => r.w(p[0], p[1], p[2]));
    px.line(g, sq[0][0], sq[0][1], sq[1][0], sq[1][1], '#ff5040', 1); px.line(g, sq[1][0], sq[1][1], sq[2][0], sq[2][1], '#ff5040', 1); px.line(g, sq[2][0], sq[2][1], sq[3][0], sq[3][1], '#ff5040', 1); px.line(g, sq[3][0], sq[3][1], sq[0][0], sq[0][1], '#ff5040', 1);
  });
  const ring = (a0, a1, col) => {
    const pts = []; for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; const p = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z + sh * .3); pts.push(p); }
    for (let i = 0; i < 14; i++) px.line(g_, Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), col, 2);
  };
  let g_ = null;
  // back half of the rim + net back
  r.queue(h.x, h.y - 3, RIM_Z, g => { g_ = g; ring(PI, TAU, '#c8381a'); });
  // net and front half
  r.queue(h.x, h.y + 3, RIM_Z - 8, g => {
    g_ = g;
    const sway = (h.net || 0) * 3 * Math.sin(game.time * 30), n = 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, a2 = (i + .5) / n * TAU;
      const top = r.w(h.x + Math.cos(a) * RIM_R, h.y + Math.sin(a) * RIM_R, RIM_Z), bot = r.w(h.x + Math.cos(a) * (RIM_R * .55) + sway, h.y + Math.sin(a) * (RIM_R * .55), RIM_Z - 15 - (h.net || 0) * 4);
      const mid = r.w(h.x + Math.cos(a2) * (RIM_R * .78), h.y + Math.sin(a2) * (RIM_R * .78), RIM_Z - 8);
      px.line(g, Math.round(top[0]), Math.round(top[1]), Math.round(bot[0]), Math.round(bot[1]), '#f4f4f4', 1);
      px.line(g, Math.round(top[0]), Math.round(top[1]), Math.round(mid[0]), Math.round(mid[1]), '#d0d0d8', 1);
    }
    ring(0, PI, '#ff5a30');
  });
}

/* ---- players, ball ---- */
const BALLC = { base: '#e8742a', dark: '#a8480e', seam: '#2a1408', hi: '#ffb070' };
function drawBall(r, B) {
  const M = S.match;
  if (B.state === 'tip' || B.state === 'dead' && false) { }
  const gold = B.gold || (B.owner && B.owner.pu === 'gold') || (B.shot && B.shot.shooter.pu === 'gold');
  const big = S.cheats.big;
  // trail
  if (B.trail.length > 2 && (B.state === 'shot' || B.state === 'pass')) {
    r.queue(B.x, B.y, B.z, g => { B.trail.forEach((t, i) => { const [x, y] = r.w(t[0], t[1], t[2]); px.disc(g, Math.round(x), Math.round(y), 1, i % 2 ? '#ffd8a0' : '#ff9a50'); }); }, { emissive: true });
  }
  r.shadow(B.x, B.y, 4 - Math.min(2, B.z * .02), .4);
  const nova = (B.owner && novaOf(B.owner)) || (B.shot && novaOf(B.shot.shooter));
  r.queue(B.x, B.y + 1, B.z, g => {
    const [x, y] = r.w(B.x, B.y, B.z), X = Math.round(x), Y = Math.round(y - 4), rr = 5;
    px.disc(g, X, Y, rr + 1, '#1a0a02');
    if (nova) { px.disc(g, X, Y, 6, '#ff7a20'); }
    px.disc(g, X, Y, rr, gold ? '#e8b020' : BALLC.dark); px.disc(g, X - 1, Y - 1, rr - 1, gold ? '#ffd23a' : BALLC.base);
    const sp = Math.round(B.roll) % 4; // seams
    px.line(g, X - rr, Y, X + rr, Y, BALLC.seam, 1); px.line(g, X, Y - rr, X, Y + rr, BALLC.seam, 1);
    if (sp & 1) { px.dot(g, X - 2, Y - 2, BALLC.seam); px.dot(g, X + 2, Y + 2, BALLC.seam); } else { px.dot(g, X + 2, Y - 2, BALLC.seam); px.dot(g, X - 2, Y + 2, BALLC.seam); }
    px.dot(g, X - 2, Y - 3, gold ? '#fff6c0' : BALLC.hi);
  });
}
function rigState(p) {
  const st = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, air: p.z > 1.5 };
  const a = p.act;
  if (p.stun > .25) { st.down = clamp((p.stun - .2) * 3, 0, 1) * .0 + (p.stun > .35 ? 1 : .5); st.hurt = true; }
  else if (p.frozen > 0) { st.pose = 'guard'; st.vx = 0; st.vy = 0; }
  else if (a) {
    if (a.type === 'shot') { st.pose = 'cast'; st.air = true; st.expr = 'shout'; }
    else if (a.type === 'dunk') {
      const u = clamp(a.t / a.T, 0, 1); st.air = true; st.expr = 'shout';
      if (u > .5) st.attack = E.move(a.dunk.move, clamp((u - .5) / .5, 0, .99)); else st.pose = 'cast';
    }
    else if (a.type === 'swipe') st.attack = E.move('jab', clamp(a.t / a.dur, 0, .99));
    else if (a.type === 'shove') st.attack = E.move('bash', clamp(a.t / a.dur, 0, .99));
    else if (a.type === 'spin') { st.run = 1; st.air = false; }
    else if (a.type === 'jump') { st.pose = 'cast'; st.air = true; }
    else if (a.type === 'oopwait') { st.run = 1; }
  } else if (p.cheer > 0) { st.pose = 'cheer'; st.expr = 'smile'; }
  else if (p.tauntT > 0) { st.pose = 'hips'; st.expr = 'smile'; }
  if (p.hasBall && !a && !st.pose) st.stance = 'ready';
  if (p.boost) st.sprint = true;
  return st;
}
function drawPlayer(r, p) {
  const M = S.match, view = E.charView(r.view);
  r.shadow(p.x, p.y, 7, .38);
  const nova = novaOf(p), flash = p.frozen > 0 ? '#9ae6ff' : nova ? '#ff6a20' : (p.pu === 'gold' ? '#ffd23a' : null);
  const bigscale = S.cheats.big ? 1.5 : 1;
  r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), flash ? { flash, flashMix: p.frozen > 0 ? .55 : .22 + .1 * Math.sin(game.time * 14) } : undefined);
  // indicator
  const hud = p.input || S.mode === 'camp';
  r.queue(p.x, p.y + 2, p.z + 64, g => {
    const [x, y] = r.w(p.x, p.y, p.z + 62), X = Math.round(x), Y = Math.round(y);
    if (p.input) {
      const col = E.PLAYER_COLORS[(p.input.player || 1) - 1] || '#ffe08a';
      px.poly(g, [[X - 4, Y - 7], [X + 4, Y - 7], [X, Y - 1]], col);
      E.font.text(g, 'P' + (p.input.player || 1), X, Y - 16, col, { align: 'center', font: 'tiny', outline: '#000' });
      E.ui.bar(g, X - 9, Y - 9, 18, 3, p.turbo, p.turbo < .2 ? '#ff4a3a' : '#5ae0ff');
    } else if (!p.input && S.dev.overlay) {
      E.font.text(g, p.name, X, Y - 10, '#ffffff', { align: 'center', font: 'tiny', outline: '#000' });
    }
    if (p.hasBall && !p.input) px.rect(g, X - 1, Y - 3, 3, 3, '#ffb060');
    if (p.act && p.act.type === 'shot' && !p.act.released) {   // the release meter: fills toward the top of the jump; green is the perfect window
      const s = Math.abs(p.vz) / p.act.V, fill = clamp(1 - s, 0, 1), good = s < .2;
      px.rect(g, X + 11, Y - 12, 4, 18, '#10101a'); px.rect(g, X + 12, Y - 11, 2, 3, '#2a8a3a'); px.rect(g, X + 12, Y + 5 - Math.round(fill * 16), 2, Math.round(fill * 16), good ? '#5aff6a' : '#ffd36a');
    }
  }, { emissive: true });
  if (nova) {
    try { if (Math.random() < .5) P.fire(p.x - Math.cos(p.facing) * 4, p.y, p.z + 20 + Math.random() * 30, 1); } catch (e) { }
  }
  if (p.pu === 'rocket' && Math.random() < .4) try { P.sparks(p.x, p.y, p.z + 2, 1, null, { color: '#ff9a30' }); } catch (e) { }
  if (p.boost && p.z <= 0 && Math.random() < .25) try { P.dust(p.x, p.y, 0, 1); } catch (e) { }
}
function drawPowerups(r) {
  for (const u of S.powerups) {
    const d = POWERUPS.find(q => q.id === u.id), bob = Math.sin(u.t * 4) * 3 + 12;
    r.shadow(u.x, u.y, 6, .3);
    r.queue(u.x, u.y, bob, g => {
      const [x, y] = r.w(u.x, u.y, bob), X = Math.round(x), Y = Math.round(y);
      px.disc(g, X, Y, 8, '#10101a'); px.disc(g, X, Y, 7, d.color); px.disc(g, X - 1, Y - 1, 5, '#ffffffaa'.slice(0, 7));
      px.disc(g, X, Y, 4, d.color);
      E.font.text(g, d.id === 'rocket' ? 'R' : d.id === 'gold' ? '$' : d.id === 'giant' ? 'G' : 'I', X, Y - 3, '#10101a', { align: 'center', font: 'tiny', outline: false });
    }, { emissive: true });
  }
}
function drawTwists(r) {
  const kind = courtDef().twist;
  if (kind === 'jackpot') {
    const sp = S.twist.spot, pulse = .6 + .4 * Math.sin(game.time * 5);
    r.decal && r.decal(g => { r.groundDisc && r.groundDisc(sp.x, sp.y, 26, '#ffd23a', .35 + .2 * pulse); r.groundRing && r.groundRing(sp.x, sp.y, 26, '#fff2a0'); });
    r.queue(sp.x, sp.y, 0, g => { const [x, y] = r.w(sp.x, sp.y, 0); E.font.text(g, '+2', Math.round(x), Math.round(y) - 3, '#fff2a0', { align: 'center', font: 'tiny', outline: '#000' }); }, { emissive: true, bias: -50 });
  }
  if (kind === 'puddle') for (const q of S.twist.puddles) r.decal && r.decal(g => { r.groundDisc && r.groundDisc(q.x, q.y, q.r, '#6aa8d8', .45); r.groundRing && r.groundRing(q.x, q.y, q.r, '#b0d8f0'); });
  if (kind === 'wind') {
    const w = S.twist.wind, y = COURT.y0 - 4;
    for (const fx of [COURT.x0 + 40, COURT.cx, COURT.x1 - 40]) r.queue(fx, y, 70, g => {
      const [x, yy] = r.w(fx, y, 0), [, top] = r.w(fx, y, 62);
      px.line(g, Math.round(x), Math.round(yy), Math.round(x), Math.round(top), '#c8c8d0', 1);
      for (let i = 0; i < 4; i++) px.rect(g, Math.round(x + 1 + i * 3 * Math.sign(w || 1)), Math.round(top) + i, 3, 2, i % 2 ? '#ff5a3a' : '#ffffff');
    });
  }
}

/* ---- the camera ---- */
function cameraStep(dt) {
  const M = S.match, B = S.ball; if (!M) return;
  let tx = B.x, ty = COURT.cy + 4;
  const dir = M.possession === 0 ? 1 : -1;
  if (B.owner) tx = B.owner.x + dir * 40; else tx = B.x;
  if (M.phase === 'tip') tx = COURT.cx;
  const xs = S.players.map(p => p.x); const span = Math.max(...xs) - Math.min(...xs);
  let zoom = clamp((game.W || 427) / (span + 160), .72, 1.1);
  if (game.baseView && game.baseView.pitch > 40) zoom = Math.min(zoom, .86);
  S.camera.zoom = approach(S.camera.zoom, zoom, dt * .6);
  let punch = 1;
  if (S.fx.cam > 0) { S.fx.cam -= dt; punch = 1 + .2 * clamp(S.fx.cam, 0, 1); tx = lerp(tx, S.fx.camX, .6); }
  const zz = S.camera.zoom * punch, halfW = (game.W || 427) / 2 / zz;
  tx = clamp(tx, halfW + 2, 768 - halfW - 2);
  S.camera.x = lerp(S.camera.x, tx, 1 - Math.exp(-dt * 5));
  S.camera.x = clamp(S.camera.x, halfW + 2, 768 - halfW - 2);
  game.setZoom(zz);
  game.focus(S.camera.x, ty, 18);
}
function fxStep(dt) {
  S.fx.flash = Math.max(0, S.fx.flash - dt * 1.6); S.fx.shake = Math.max(0, S.fx.shake - dt * 14);
  for (const b of S.fx.banners) b.t += dt; S.fx.banners = S.fx.banners.filter(b => b.t < b.life);
}

/* ---- the whole match scene: draw ---- */
function drawMatch(r) {
  const M = S.match; if (!M) return;
  const cd = courtDef(), map = getCourtMap(S.court);
  getBackdrop(S.court).draw(r);
  map.drawFloor(r); map.queueWalls(r);
  drawTwists(r);
  buildCrowd(S.court);
  const exc = M.excite;
  for (const f of crowdFans) {
    const up = Math.max(0, Math.sin(game.time * (4 + exc * 8) + f.ph)) * (1 + exc * 4) * (exc > .1 ? 1 : .2);
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.shirt); px.rect(g, X - 1, Y - 8, 3, 3, f.skin); });
  }
  for (const h of HOOPS) drawHoop(r, h);
  drawPowerups(r);
  for (const p of S.players) drawPlayer(r, p);
  drawBall(r, S.ball);
  r.overlay(g => { drawHud(g, r); drawWorldHover(g, r); });
}
// the mouse over things in the world: a player under the pointer gets a name card with their ratings
function drawWorldHover(g, r) {
  const m = mouseHud(); if (!m || S.dev.open || S.mode === 'attract') return;
  let best = null, bd = 18;
  for (const p of S.players) { const [x, y] = r.w(p.x, p.y, p.z + 28), d = Math.hypot(m[0] - x, m[1] - y); if (d < bd) { bd = d; best = { p, x, y }; } }
  if (!best) return; const p = best.p, w = 92, x = clamp(Math.round(best.x - w / 2), 2, r.W - w - 2), y = clamp(Math.round(best.y - 74), 34, r.H - 60);
  panel(g, x, y, w, 40, { border: p.tdef.color });
  txt(g, p.name + (p.input ? ' P' + (p.input.player || 1) : ''), x + 4, y + 3, '#fff', { font: 'tiny' });
  ['zoom', 'slam', 'deep', 'swipe'].forEach((k, i) => { const cx = x + 4 + (i % 2) * 44, cy = y + 13 + Math.floor(i / 2) * 12; txt(g, RICON[k], cx, cy, '#9a9ac8', { font: 'tiny', outline: false }); ratingPips(g, p.r[k], cx, cy + 6); });
}

/* ===== 40-ui.js ===== */
/* BASKETBLAM - 10-foot UI kit: glyph prompts (PlayStation / Xbox / keyboard / mouse), focus lists, cards */
const padStyle = () => (game.settings.glyphs === 'Xbox' ? 'xbox' : 'ps');
const lastDev = () => game.input.lastDevice || 'keyboard';
const PADMAP = { shoot: 'sq', pass: 'x', shove: 'o', oop: 'tri', turbo: 'r2', taunt: 'l1', confirm: 'x', cancel: 'o', start: 'opt', pause: 'opt', move: 'ls' };
const KEYMAP = { shoot: 'SPACE', pass: 'E', shove: 'Q', oop: 'F', turbo: 'SHIFT', taunt: 'R', confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', move: 'WASD' };
const XBOX = { sq: ['X', '#4a8cff'], x: ['A', '#46d060'], o: ['B', '#ff4a4a'], tri: ['Y', '#ffd23a'], r2: ['RT', '#d0d0e0'], l1: ['LB', '#d0d0e0'], opt: ['=', '#d0d0e0'], ls: ['L', '#d0d0e0'] };
function glyphWidth(action) {
  const dev = lastDev();
  if (dev === 'gamepad') { const b = PADMAP[action] || 'x'; return (b === 'r2' || b === 'l1') && padStyle() === 'ps' ? 14 : (XBOX[b] && XBOX[b][0].length > 1 && padStyle() === 'xbox' ? 14 : 12); }
  if (dev === 'mouse' && (action === 'shoot' || action === 'pass')) return 12;
  return E.font.width(KEYMAP[action] || '?', { font: 'tiny' }) + 7;
}
function drawGlyph(g, action, x, y) { // (x, y) = top-left; height 11
  const dev = lastDev();
  if (dev === 'gamepad') {
    const b = PADMAP[action] || 'x', cx = x + 5, cy = y + 5;
    if (padStyle() === 'xbox') {
      const [t, col] = XBOX[b] || ['?', '#fff']; const w = t.length > 1 ? 14 : 11;
      if (t.length > 1) { px.rect(g, x, y + 1, w, 9, '#202030'); px.rect(g, x, y + 1, w, 1, '#8a8aa0'); E.font.text(g, t, x + w / 2, y + 2, col, { align: 'center', font: 'tiny', outline: false }); }
      else { px.disc(g, cx, cy, 5, '#14141e'); px.disc(g, cx, cy, 4, col); E.font.text(g, t, cx, y + 2, '#10101a', { align: 'center', font: 'tiny', outline: false }); }
    } else {
      if (b === 'r2' || b === 'l1') { px.rect(g, x, y + 1, 14, 9, '#202030'); px.rect(g, x, y + 1, 14, 1, '#8a8aa0'); E.font.text(g, b === 'r2' ? 'R2' : 'L1', x + 7, y + 2, '#e0e0f0', { align: 'center', font: 'tiny', outline: false }); }
      else if (b === 'opt') { px.disc(g, cx, cy, 5, '#14141e'); px.rect(g, cx - 2, cy - 2, 5, 1, '#d0d0e0'); px.rect(g, cx - 2, cy, 5, 1, '#d0d0e0'); px.rect(g, cx - 2, cy + 2, 5, 1, '#d0d0e0'); }
      else if (b === 'ls') { px.disc(g, cx, cy, 5, '#14141e'); px.disc(g, cx, cy, 3, '#8a8aa0'); }
      else {
        px.disc(g, cx, cy, 5, '#14141e');
        if (b === 'x') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#6ab0ff', 1); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, '#6ab0ff', 1); }
        else if (b === 'o') { px.disc(g, cx, cy, 3, '#ff6a6a'); px.disc(g, cx, cy, 2, '#14141e'); }
        else if (b === 'sq') { px.rect(g, cx - 2, cy - 2, 5, 5, '#ff9ad0'); px.rect(g, cx - 1, cy - 1, 3, 3, '#14141e'); }
        else if (b === 'tri') { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], '#5ae0a0'); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], '#14141e'); }
      }
    }
    return;
  }
  if (dev === 'mouse' && (action === 'shoot' || action === 'pass')) {
    px.rect(g, x + 1, y, 9, 11, '#d8d8e8'); px.rect(g, x + 1, y + 5, 9, 6, '#a0a0b8'); px.rect(g, action === 'shoot' ? x + 1 : x + 6, y, 4, 5, '#ff6a3a'); px.rect(g, x + 5, y, 1, 5, '#202030'); return;
  }
  const t = KEYMAP[action] || '?', w = E.font.width(t, { font: 'tiny' }) + 6;
  px.rect(g, x, y + 1, w, 9, '#d8d8e8'); px.rect(g, x, y + 9, w, 1, '#8a8aa8'); E.font.text(g, t, x + w / 2, y + 3, '#202030', { align: 'center', font: 'tiny', outline: false });
}
function promptW(action, label) { return glyphWidth(action) + 3 + E.font.width(label, { font: 'tiny' }) + 8; }
function drawPrompts(g, list, cx, y) { // list of [action, label]
  const total = list.reduce((a, [ac, lb]) => a + promptW(ac, lb), 0) - 8; let x = Math.round(cx - total / 2);
  for (const [ac, lb] of list) {
    drawGlyph(g, ac, x, y); const w = glyphWidth(ac);
    E.font.text(g, lb, x + w + 3, y + 3, '#e8e4f8', { font: 'tiny', outline: '#000' }); x += promptW(ac, lb);
  }
}

/* ---- focus list: big cards you move through with stick / d-pad / keys / mouse ---- */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.hover = -1; this.rects = []; this.t = 0; }
  update(dt) {
    this.t += dt; const I = game.input, n = this.items.length; if (!n) return null;
    const dis = k => this.items[k] && this.items[k].disabled;
    const step = d => { let k = this.i; for (let tries = 0; tries < n; tries++) { k = (k + d + n) % n; if (!dis(k)) { this.i = k; sfx('tick', { vol: 1.5 }); return; } } };
    if (this.o.horizontal) { if (I.repeat('left', .3, .12)) step(-1); if (I.repeat('right', .3, .12)) step(1); }
    else { if (I.repeat('up', .3, .12)) step(-1); if (I.repeat('down', .3, .12)) step(1); }
    const m = mouseHud();
    if (m) { const k = this.rects.findIndex(r => m[0] >= r[0] && m[0] <= r[0] + r[2] && m[1] >= r[1] && m[1] <= r[1] + r[3]); if (k >= 0 && k !== this.hoverK && !dis(k)) { this.i = k; sfx('tick', { vol: 1.5 }); } this.hoverK = k; }
    const c = I.clicked && I.clicked();
    if (c) { const k = this.rects.findIndex(r => c[0] >= r[0] && c[0] <= r[0] + r[2] && c[1] >= r[1] && c[1] <= r[1] + r[3]); if (k >= 0 && !dis(k)) { this.i = k; return this.pickIt(); } }
    if (I.pressed('confirm') || I.pressed('start')) { I.consume && I.consume('confirm'); I.consume && I.consume('start'); if (!dis(this.i)) return this.pickIt(); }
    if (I.pressed('cancel') && this.o.onCancel) { I.consume('cancel'); sfx('cancel' in game.audio.presets ? 'tick' : 'tick'); this.o.onCancel(); }
    return null;
  }
  pickIt() { sfx('perfect', { vol: .6 }); const it = this.items[this.i]; if (it.fn) it.fn(it, this.i); return it; }
  // draws vertical big buttons from (x, y), width w
  draw(g, x, y, w, h = 20, gap = 4) {
    this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * (h + gap), foc = k === this.i, dis = it.disabled, pulse = foc ? Math.sin(this.t * 8) * .5 + .5 : 0;
      this.rects.push([x, yy, w, h]);
      const bg = dis ? ['#15151e', '#101018'] : foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'];
      E.ui.box(g, x + (foc ? 4 : 0), yy, w - (foc ? 4 : 0), h, { bg, border: foc ? '#fff6c0' : dis ? '#2a2a38' : '#5a5e88', alpha: 1 });
      E.font.text(g, it.label, x + 12 + (foc ? 4 : 0), yy + (it.sub ? 3 : (h - 7) / 2 | 0), dis ? '#5a5a6a' : foc ? '#2a1204' : '#e8e8ff', { outline: false, shadow: foc ? '#ffe8a0' : '#000' });
      if (it.sub) E.font.text(g, it.sub, x + 12 + (foc ? 4 : 0), yy + 12, dis ? '#4a4a58' : foc ? '#5a2a0a' : '#9a9ac8', { font: 'tiny', outline: false });
      if (foc) px.poly(g, [[x - 2 + (pulse * 2 | 0), yy + h / 2 - 4], [x - 2 + (pulse * 2 | 0), yy + h / 2 + 4], [x + 3 + (pulse * 2 | 0), yy + h / 2]], '#fff6c0');
    });
  }
}
// a row selector value cycler: left/right changes values (for setup screens)
function cycle(I, n, i) { if (I.repeat('left', .35, .15)) { sfx('tick', { vol: 1.5 }); return (i + n - 1) % n; } if (I.repeat('right', .35, .15)) { sfx('tick', { vol: 1.5 }); return (i + 1) % n; } return i; }
const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1c1e36', '#10121e'], border: '#6a6ea8', alpha: .94 }, o));
const bigText = (g, s, x, y, o = {}) => E.font.title(g, s, x, y, Object.assign({ scale: 2, colors: ['#fffbe8', '#ffd36a', '#ff8a2a'], depth: 2, depthColor: '#5a1a08', align: 'center' }, o));
const txt = (g, s, x, y, c = '#e8e4f8', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#000' }, o));
const ratingPips = (g, v, x, y) => { for (let i = 0; i < 10; i++) px.rect(g, x + i * 4, y, 3, 4, i < v ? (v >= 9 ? '#ff8a2a' : v >= 7 ? '#ffd36a' : '#8ad0ff') : '#2a2c44'); };
function drawPortraitOf(g, spec, tdef, x, y, size = 36) {
  spec._rig = spec._rig || makeRig(spec, tdef, { size: 1.5 });
  spec._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 });
  try { spec._rig.drawPortrait(g, x, y, size, { zoom: 2.6, turn: .4, bg: tdef.dark, frame: tdef.color }); } catch (e) { px.rect(g, x, y, size, size, tdef.dark); }
}

/* ===== 41-hud.js ===== */
/* BASKETBLAM - match HUD, banners, announcers, and the event wiring that makes every moment loud */

/* ---- announcers (two hype commentators, gibberish voices) ---- */
const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', speed: 46 });
const speakerRigs = {};
const speakerRig = k => speakerRigs[k] || (speakerRigs[k] = makeSpeakerRig(k));
let annT = 0, annWho = 0, annPrio = 0;
function say(key, text, prio = 1, o = {}) {
  if (game.settings.announcer === 'Off' && !o.force) return;
  if (S.mode === 'attract' && !o.force) return;
  if (talk.open && prio < annPrio && annT < 2.5) return;
  const v = VOICES[key]; talk.voice = voiceFor(key); annPrio = prio; annT = 0;
  talk.say(text, { name: v.name, portrait: speakerRig(key), portraitSize: 30, auto: o.auto || 1.5, modal: o.modal === true, alpha: .86, nameColor: v.color });
}
function announce(kind, data = {}, prio = 1) {
  const bank = LINES[kind]; if (!bank) return;
  let s = pick(bank); const p = data.p !== undefined ? S.players[data.p] : null;
  s = s.replace('{n}', p ? p.name : 'SOMEBODY').replace('{a}', data.a !== undefined ? S.players[data.a].name : '').replace('{b}', data.b !== undefined ? S.players[data.b].name : '')
    .replace('{p}', data.pname || '').replace('{w}', data.w || '').replace('{score}', data.score || '').replace('{t}', data.t || '');
  annWho ^= 1; say(annWho ? 'RICO' : 'LOU', s, prio);
}

/* ---- the HUD ---- */
function drawHud(g, r) {
  const M = S.match; if (!M) return;
  const W = r.W, H = r.H, cx = W / 2, h = TEAMS[S.teams[0]], a = TEAMS[S.teams[1]];
  // score bug
  const bw = 196, bx = Math.round(cx - bw / 2), by = 4;
  panel(g, bx, by, bw, 26, { bg: ['#14162a', '#0a0b16'], border: '#8a8ec8', alpha: .92 });
  px.rect(g, bx + 3, by + 3, 4, 20, h.color); px.rect(g, bx + bw - 7, by + 3, 4, 20, a.color);
  txt(g, h.short, bx + 10, by + 4, '#f0ecff', { font: 'tiny' });
  txt(g, a.short, bx + bw - 10, by + 4, '#f0ecff', { font: 'tiny', align: 'right' });
  txt(g, String(M.score[0]), bx + 30, by + 11, '#ffffff', { scale: 2 }); txt(g, String(M.score[1]), bx + bw - 30, by + 11, '#ffffff', { scale: 2, align: 'right' });
  const ql = M.sudden ? 'SUDDEN BLAM' : M.ot ? 'OT' + M.ot : 'Q' + M.quarter;
  txt(g, mmss(M.clock), cx, by + 4, M.clock < 10 ? '#ff6a4a' : '#ffe08a', { align: 'center', scale: 1 });
  txt(g, ql, cx, by + 14, '#9ab0ff', { align: 'center', font: 'tiny' });
  const sc = Math.max(0, Math.ceil(M.shotClock)); txt(g, String(sc), cx, by + 20, sc <= 5 ? '#ff4a3a' : '#c8c8e8', { align: 'center', font: 'tiny' });
  if (M.novaT[0] > 0) { txt(g, '★ SUPERNOVA', bx, by + 29, '#ff9a3a', { font: 'tiny' }); }
  if (M.novaT[1] > 0) { txt(g, 'SUPERNOVA ★', bx + bw, by + 29, '#ff9a3a', { font: 'tiny', align: 'right' }); }
  // streak pips
  for (let t = 0; t < 2; t++) for (let i = 0; i < Math.min(M.streak[t], tune('novaStreak')); i++) px.rect(g, t ? bx + bw - 14 - i * 5 : bx + 10 + i * 5, by + 24, 4, 2, '#ff8a2a');
  // power-up timers
  S.players.forEach(p => { if (p.pu) { const d = POWERUPS.find(q => q.id === p.pu); const x = p.team ? W - 70 : 6, y = 40 + (p.slot % 2) * 12; txt(g, d.name, x, y, d.color, { font: 'tiny' }); E.ui.bar(g, x, y + 7, 50, 2, p.puT / d.dur, d.color); } });
  // banners
  S.fx.banners.forEach((b, i) => {
    const u = b.t / b.life, a1 = u < .12 ? u / .12 : u > .8 ? (1 - u) / .2 : 1, sc = b.scale * (u < .1 ? 1 + (1 - u / .1) * .6 : 1);
    px.blend && px.blend(g, clamp(a1, 0, 1), 'normal', () => bigText(g, b.text, cx + (b.shake ? (Math.random() - .5) * b.shake : 0), Math.round(H * b.y) - i * 0, { scale: Math.max(1, Math.round(sc)), colors: b.colors }));
    if (!px.blend) bigText(g, b.text, cx, Math.round(H * b.y), { scale: Math.round(sc), colors: b.colors });
  });
  // phase captions
  if (M.phase === 'tip') {
    const t = M.tip; if (t) { const human = t.jumpers.find(p => p.input); if (human) { txt(g, 'JUMP BALL!', cx, H * .5 - 40, '#ffffff', { align: 'center', scale: 2 }); drawPrompts(g, [['shoot', 'JUMP AT THE TOP']], cx, H * .5 - 22); } }
  }
  if (M.phase === 'inbound' && M.inbound && M.inbound.who.input && !M.inbound.thrown) drawPrompts(g, [['pass', 'THROW IT IN']], cx, H * .62);
  if (M.phase === 'break') drawBreak(g, r);
  if (S.fx.flash > 0) { px.blend && px.blend(g, clamp(S.fx.flash, 0, 1) * .6, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  // controls hint, first seconds
  if (M.time < 14 && S.mode !== 'attract' && S.mode !== 'camp' && M.phase !== 'end') {
    const list = [['shoot', 'SHOOT'], ['pass', 'PASS'], ['turbo', 'TURBO'], ['shove', 'SHOVE']];
    drawPrompts(g, list, cx, H - 15);
  }
  if (S.dev.overlay) drawDevOverlay(g, r);
  if (!S.dev.open && !S.howto) talk.draw(r);
  if (S.mode === 'attract') { txt(g, 'DEMO - PRESS ANY BUTTON', cx, H - 30, '#ffe08a', { align: 'center' }); }
}
function drawBreak(g, r) {
  const M = S.match, W = r.W, H = r.H, cx = W / 2;
  px.rect(g, 0, 0, W, H, '#00000099'.slice(0, 7)); px.blend && px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  const kind = M.breakKind, title = kind === 'half' ? 'HALFTIME REPORT' : kind === 'ot' ? 'OVERTIME!' : kind === 'sudden' ? 'SUDDEN BLAM!' : 'END OF Q' + M.quarter;
  panel(g, cx - 130, 38, 260, 150);
  bigText(g, title, cx, 46, { scale: 2 });
  const h = TEAMS[S.teams[0]], a = TEAMS[S.teams[1]];
  txt(g, h.name, cx - 120, 76, h.color); txt(g, a.name, cx + 120, 76, a.color, { align: 'right' });
  txt(g, String(M.score[0]), cx - 40, 70, '#fff', { scale: 3, align: 'center' }); txt(g, String(M.score[1]), cx + 40, 70, '#fff', { scale: 3, align: 'center' });
  const rows = [['POINTS', 'pts'], ['DUNKS', 'dunks'], ['BLOCKS', 'blocks'], ['STEALS', 'steals']];
  rows.forEach(([lb, k], i) => {
    const hv = S.players[0].st[k] + S.players[1].st[k], av = S.players[2].st[k] + S.players[3].st[k], y = 104 + i * 12;
    txt(g, String(hv), cx - 60, y, '#e8e4f8', { align: 'center' }); txt(g, lb, cx, y, '#9a9ac8', { align: 'center', font: 'tiny' }); txt(g, String(av), cx + 60, y, '#e8e4f8', { align: 'center' });
  });
  if (kind === 'half') { const gag = HALFTIME_GAGS[(M.score[0] + M.score[1]) % HALFTIME_GAGS.length]; txt(g, gag, cx, 160, '#ffd36a', { align: 'center', font: 'tiny' }); }
  else if (kind === 'ot' || kind === 'sudden') txt(g, kind === 'ot' ? 'ALL TIED UP. ONE MORE MINUTE.' : 'NEXT BASKET WINS. NO PRESSURE.', cx, 160, '#ffd36a', { align: 'center', font: 'tiny' });
  else txt(g, 'Catch your breath. Back in ' + Math.ceil(M.breakT) + '.', cx, 160, '#c8c8e8', { align: 'center', font: 'tiny' });
}

/* ---- event wiring: announcer, banners, sound, camera ---- */
let wired = false;
function wireEvents() {
  if (wired) return; wired = true;
  const P0 = i => S.players[i];
  on('tipoff', e => { announce('tipoff', { a: e.a, b: e.b }, 2); sfx('whistle'); });
  on('basket', e => {
    const p = P0(e.p), M = S.match; sfx('cheer'); S.fx.shake = Math.max(S.fx.shake, 2);
    rumble(p, .4, .15);
    if (e.dunk) {
      const d = DUNKS.find(x => x.id === e.dunk); banner(d.name + '!', { colors: ['#fffbe8', '#ffd36a', '#ff5a2a'], scale: 3, life: 1.5 });
      announce(DUNKS.indexOf(d) >= 5 ? 'bigdunk' : 'dunk', { p: e.p }, 3); sting('dunk');
      if (e.oop) { announce('oop', { p: e.p }, 4); banner('ALLEY-OOP!', { y: .24, scale: 2, colors: ['#ffffff', '#8affc0', '#20c080'] }); }
    } else if (e.three) { banner('THREE-POINTER!', { scale: 2, colors: ['#fffbe8', '#8ad0ff', '#2a8aff'] }); announce('three', { p: e.p }, 2); sting('basket'); }
    else { announce(e.perfect ? 'perfect' : 'two', { p: e.p }, 1); }
    if (e.bonus === 'gold') banner('GOLD BALL: DOUBLE!', { y: .24, scale: 2, colors: ['#fff6c0', '#ffd23a', '#e89010'] });
    if (e.bonus === 'jackpot') { banner('JACKPOT +2!', { y: .24, scale: 2, colors: ['#fff6c0', '#ffd23a', '#e89010'] }); sfx('jackpot'); announce('jackpot', {}, 3); }
    if (e.perfect && !e.dunk) sfx('perfect');
    P.glints && P.glints(HOOPS[e.team === 0 ? 1 : 0].x, HOOPS[e.team === 0 ? 1 : 0].y, RIM_Z, 6);
    S.players.forEach(q => { if (q.team === e.team) q.cheer = 1.2; });
    if (e.dunk) { const h = attackHoop(e.team); S.fx.cam = 1; S.fx.camX = h.x; game.timeScale = 1; }
  });
  on('dunkStart', e => { const p = P0(e.p); rumble(p, .5, .3); });
  on('release', e => { /* nothing loud */ });
  on('block', e => { banner('REJECTED!', { colors: ['#ffffff', '#ff9a8a', '#e83a2a'], scale: 3, life: 1.2 }); announce('block', { p: e.p }, 3); sfx('slam', { vol: .6 }); S.players[e.p].cheer = .8; });
  on('steal', e => { banner('STOLEN!', { scale: 2, colors: ['#ffffff', '#aee8ff', '#3a9ae8'], life: .9 }); announce('steal', { p: e.p }, 1); });
  on('shove', e => { banner('SHOVED!', { scale: 2, y: .4, colors: ['#ffffff', '#ffc08a', '#e8601a'], life: .8 }); announce('shove', { p: e.p }, 1); });
  on('fumble', e => announce('fumble', {}, 1));
  on('supernovaOn', e => { banner('SUPERNOVA!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2, shake: 2 }); announce('nova', { p: e.p }, 4); sfx('nova'); sting('nova'); S.fx.flash = .8; S.players.filter(p => p.team === e.team).forEach(p => p.turbo = 1); });
  on('supernovaOff', e => { sfx('novaOff'); announce('novaOff', {}, 2); });
  on('shatter', e => { announce('shatter', {}, 5); });
  on('goaltend', e => { banner('GOALTEND!', { scale: 3, colors: ['#ffffff', '#ffe08a', '#e8a010'] }); announce('goaltend', {}, 3); sfx('whistle'); });
  on('powerupPick', e => { const d = POWERUPS.find(q => q.id === e.id); banner(d.name + '!', { scale: 2, colors: ['#ffffff', d.color, d.color], y: .28, life: 1.2 }); announce('power', { p: e.p, pname: d.name }, 2); });
  on('shotClockViolation', e => { banner('SHOT CLOCK!', { scale: 3, colors: ['#ffffff', '#ff9a8a', '#e83a2a'] }); announce('clock', {}, 2); });
  on('quarterEnd', e => { announce(S.match.quarter === 2 ? 'half' : 'quarter', { score: S.match.score[0] + ' TO ' + S.match.score[1] }, 3); sfx('cheer'); });
  on('overtime', e => { banner('OVERTIME!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2 }); announce('overtime', {}, 4); });
  on('sudden', e => { banner('SUDDEN BLAM!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2 }); announce('sudden', {}, 4); });
  on('gameEnd', e => { const w = e.winner < 0 ? 'NOBODY' : TEAMS[S.teams[e.winner]].name; announce('end', { w }, 6); sfx('buzzer'); sfx('cheer'); });
  on('taunt', e => { const p = P0(e.p); if (S.mode !== 'attract') say(p.team ? 'LOU' : 'RICO', p.name + ': ' + e.text, 1); });
  on('alleyoop', e => { });
  on('spin', e => { });
  on('inbound', e => { });
  on('powerupSpawn', e => { sfx('tick', { vol: 1.2 }); });
}

/* ===== 42-screens.js ===== */
/* BASKETBLAM - menu screens: title, exhibition setup, Hall of Blam, How to Play, About/Credits */
const scenes = {};
let memProgress = null;   // (kept for the visit when the browser blocks storage, as in a hub session or a test)
const store = {
  progress() { const saved = E.store.get('bb:progress', null) || memProgress || {}; return Object.assign({ tour: null, unlocked: false, camp: [], records: { mostPoints: 0, bestStyle: 0, toursWon: 0, dunks: 0, games: 0, wins: 0 } }, JSON.parse(JSON.stringify(saved))); },
  save(p) { memProgress = JSON.parse(JSON.stringify(p)); E.store.set('bb:progress', p); S.progress = p; }
};
const unlockedAll = () => S.dev.unlockAll || store.progress().unlocked;
const teamLocked = i => TEAMS[i].secret && !unlockedAll();
const IDLE_MS = 10000;
const W_ = () => (game.W || 427);
let idleMs = 0, lastMouse = null;
function touchIdle(dt) {
  const I = game.input, m = mouseHud(); let moved = false;
  if (m && lastMouse && (Math.abs(m[0] - lastMouse[0]) + Math.abs(m[1] - lastMouse[1])) > 1) moved = true; lastMouse = m;
  const mv = I.move(); if (I.anyPressed() || Math.hypot(mv[0], mv[1]) > .3 || moved) { idleMs = 0; }
  else idleMs += dt * 1000;
  if (I.lastDevice === 'gamepad') S.padSeen = true;
}
function go(name, data) { idleMs = 0; game.input.consumeAll(); game.go(name, data); }

/* ===== TITLE ===== */
const titleHeroes = [];
function titleRigs() {
  if (titleHeroes.length) return titleHeroes;
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]].forEach(([t, k], i) => titleHeroes.push({ rig: makeRig(TEAMS[t].players[k], TEAMS[t], { size: 1.7 }), t, x: 0, ph: i * .7 }));
  return titleHeroes;
}
let titleList = null, titleBg = null;
function titleItems() {
  const prog = store.progress(), items = [];
  if (prog.tour && prog.tour.stop < TOUR.length) items.push({ label: 'CONTINUE TOUR', sub: 'Stop ' + (prog.tour.stop + 1) + ' of 4 with ' + TEAMS[prog.tour.team].name, fn: () => startTour(prog.tour.team, prog.tour.stop) });
  items.push({ label: 'BLAM TOUR', sub: 'The story: four courts, one crown', fn: () => go('tourteam') });
  items.push({ label: 'EXHIBITION', sub: '1-4 players, any crews, any court', fn: () => go('setup') });
  items.push({ label: 'BLAM CAMP', sub: 'Learn every move, with drills', fn: () => startCamp() });
  items.push({ label: 'HALL OF BLAM', sub: 'Records and the roster book', fn: () => go('hall') });
  items.push({ label: 'HOW TO PLAY', sub: 'Controls, rules and power-ups', fn: () => go('howto') });
  items.push({ label: 'OPTIONS', sub: 'Sound, controls, prompts', fn: () => game.menu('settings') });
  items.push({ label: 'ABOUT / CREDITS', sub: 'Who, what and how', fn: () => go('credits') });
  return items;
}
scenes.title = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() {
    game.resetCamera(); game.follow(null); game.cam.bounds = null; L.enabled = false; game.allowJoin(false); S.mode = 'title';
    titleList = new FocusList(titleItems()); titleBg = titleBg || new E.Backdrop({ sky: ['#0a0620', '#2a0f48', '#7a1a50', '#e8601a'], stars: 40, layers: [{ kind: 'city', color: '#140828', y: .74, height: .28, parallax: 0 }, { kind: 'city', color: '#0a0418', y: .86, height: .2, parallax: 0 }] });
    music('title'); idleMs = 0; titleRigs(); game.setZoom(1);
  },
  update(dt) {
    touchIdle(dt);
    const touch = touchOnlyDevice();
    if (touch) { const c = game.input.clicked && game.input.clicked(); if (c && c[1] < 24) game.menu('settings'); if (c && c[0] > W_() - 70 && c[1] < 24) game.menu('settings'); if (idleMs > 3000) return startAttract(); return; }
    const sel = titleList.update(dt);
    // cheat code: unlock the secret crews
    if (game.input.sequence && game.input.sequence(['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'], { window: 4 })) { const p = store.progress(); p.unlocked = true; store.save(p); sfx('jackpot'); S.titleNote = 'SECRET CREWS UNLOCKED'; S.titleNoteT = 3; }
    S.titleNoteT = Math.max(0, (S.titleNoteT || 0) - dt);
    if (idleMs > IDLE_MS) startAttract();
  },
  draw(r) {
    const W = r.W, H = r.H, t = game.time;
    titleBg.draw(r);
    r.sky && 0;
    r.overlay(g => {
      px.rect(g, 0, H - 70, W, 70, '#0a0418');
      // spotlight beams
      px.blend && px.blend(g, .15, 'add', () => { for (let i = 0; i < 3; i++) { const x = W * (.55 + i * .15) + Math.sin(t * .8 + i) * 16; px.poly(g, [[x - 3, 0], [x + 3, 0], [x + 40, H - 70], [x - 40, H - 70]], '#ffd890'); } });
      // heroes lineup at the right
      const heroes = titleRigs();
      heroes.forEach((h, i) => { h.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0, pose: i % 2 ? 'hips' : 'cheer', vx: 0, vy: 0 }); });
      const logoY = 10;
      bigText(g, 'BASKETBLAM', W * .5 - (touchOnlyDevice() ? 0 : 60), logoY, { scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0502a'], depth: 4, depthColor: '#4a1408' });
      txt(g, 'OVER-THE-TOP 2-ON-2 ARCADE BASKETBALL. NO FOULS. NO MERCY. ALL BLAM.', W * .5 - (touchOnlyDevice() ? 0 : 60), logoY + 38, '#ffe8c8', { align: 'center', font: 'tiny' });
    });
    // heroes drawn as portraits row near the bottom right via the overlay
    r.overlay(g => {
      const heroes = titleRigs();
      heroes.forEach((h, i) => { const x = W - 130 + (i % 3) * 42, y = 70 + Math.floor(i / 3) * 62; try { h.rig.drawPortrait(g, x, y, 40, { zoom: 2.4, turn: .3 + (i % 3) * .1, bg: TEAMS[h.t].dark, frame: TEAMS[h.t].color }); } catch (e) { } });
      if (touchOnlyDevice()) {
        panel(g, W / 2 - 120, H / 2 - 24, 240, 48); bigText(g, 'CONTROLLER OR KEYBOARD', W / 2, H / 2 - 16, { scale: 1 }); txt(g, 'REQUIRED', W / 2, H / 2 - 4, '#ffd36a', { align: 'center' });
        panel(g, W - 70, 4, 66, 18); txt(g, 'SETTINGS', W - 37, 9, '#fff', { align: 'center', font: 'tiny' });
        return;
      }
      titleList.draw(g, 14, 62, 170, 20, 3);
      const dev = lastDev();
      drawPrompts(g, dev === 'gamepad' || dev === 'keyboard' ? [['move', 'SELECT'], ['confirm', 'GO']] : [['confirm', 'CLICK TO GO']], W / 2, H - 14);
      if (S.titleNoteT > 0) txt(g, S.titleNote, W / 2, 42, '#ffe08a', { align: 'center' });
      const left = Math.max(0, Math.ceil((IDLE_MS - idleMs) / 1000));
      if (left <= 4 && left > 0) txt(g, 'DEMO IN ' + left, W - 8, H - 22, '#9a9ac8', { align: 'right', font: 'tiny' });
    });
  }
};

/* ===== ATTRACT ===== */
let attractN = 0;
function startAttract() { go('attract'); }
function attractMatchCfg() {
  const pairs = [[0, 1, 'alley'], [2, 1, 'roof'], [3, 0, 'lunar'], [1, 2, 'dome'], [4, 0, 'lunar']], p = pairs[attractN++ % pairs.length];
  return { teams: [p[0], p[1]], court: p[2], mode: 'attract', qLen: 24, difficulty: 'All-Star', seed: 100 + attractN, humans: {} };
}

/* ===== EXHIBITION SETUP ===== */
const setupState = { home: 0, away: 1, court: 0, mode: 0, row: 0, diff: 1, q: 1 };
const SETUP_MODES = ['VS CPU', 'CO-OP vs CPU', 'VERSUS'];
function nextFree(i, d) { let k = i; for (let n = 0; n < TEAMS.length; n++) { k = (k + d + TEAMS.length) % TEAMS.length; if (!teamLocked(k)) return k; } return i; }
scenes.setup = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() { game.follow(null); L.enabled = false; setupState.row = 0; setupState.diff = ['Rookie', 'Pro', 'All-Star', 'Legend'].indexOf(game.settings.difficulty); setupState.q = ['1:00', '1:30', '2:00', '3:00'].indexOf(game.settings.quarter); if (setupState.diff < 0) setupState.diff = 1; if (setupState.q < 0) setupState.q = 1; game.allowJoin({ max: 4 }); music('camp'); S.setupRects = []; },
  exit() { game.allowJoin(false); },
  update(dt) {
    touchIdle(dt); const I = game.input, st = setupState, rows = 7;
    if (I.repeat('up', .3, .12)) { st.row = (st.row + rows - 1) % rows; sfx('tick', { vol: 1.5 }); } if (I.repeat('down', .3, .12)) { st.row = (st.row + 1) % rows; sfx('tick', { vol: 1.5 }); }
    const m = mouseHud(); if (m && S.setupRects) { const k = S.setupRects.findIndex(r => m[0] >= r[0] && m[0] <= r[0] + r[2] && m[1] >= r[1] && m[1] <= r[1] + r[3]); if (k >= 0 && k !== S.setupHover) { st.row = k; S.setupHover = k; } }
    const c = I.clicked && I.clicked(); let click = 0;
    if (c && S.setupRects) { const k = S.setupRects.findIndex(r => c[0] >= r[0] && c[0] <= r[0] + r[2] && c[1] >= r[1] && c[1] <= r[1] + r[3]); if (k >= 0) { st.row = k; click = c[0] > S.setupRects[k][0] + S.setupRects[k][2] / 2 ? 1 : -1; if (k >= 5) click = 2; } }
    let d = 0; if (I.repeat('left', .35, .15)) d = -1; if (I.repeat('right', .35, .15)) d = 1; if (click === 1 || click === -1) d = click;
    if (d) {
      sfx('tick', { vol: 1.5 });
      if (st.row === 0) st.home = nextFree(st.home, d); else if (st.row === 1) st.away = nextFree(st.away, d);
      else if (st.row === 2) st.court = (st.court + d + 4) % 4; else if (st.row === 3) st.mode = (st.mode + d + 3) % 3;
      else if (st.row === 4) { st.diff = (st.diff + d + 4) % 4; game.settings.set('difficulty', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff]); }
      else if (st.row === 5) { st.q = (st.q + d + 4) % 4; game.settings.set('quarter', ['1:00', '1:30', '2:00', '3:00'][st.q]); }
    }
    if ((I.pressed('confirm') || I.pressed('start') || click === 2) && st.row >= 5) { if (st.row === 6 || click === 2 && st.row === 6) { startExhibition(); return; } if (st.row === 5) { st.q = (st.q + 1) % 4; game.settings.set('quarter', ['1:00', '1:30', '2:00', '3:00'][st.q]); } }
    if (I.pressed('confirm') && st.row === 4) { st.diff = (st.diff + 1) % 4; game.settings.set('difficulty', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff]); }
    if (I.pressed('confirm') && st.row < 4) { if (st.row === 0) st.home = nextFree(st.home, 1); else if (st.row === 1) st.away = nextFree(st.away, 1); else if (st.row === 2) st.court = (st.court + 1) % 4; else st.mode = (st.mode + 1) % 3; }
    if (I.pressed('cancel')) { I.consumeAll(); go('title'); }
  },
  draw(r) {
    const W = r.W, H = r.H, st = setupState;
    r.sky(['#0e0a28', '#241048', '#4a1a58']);
    r.overlay(g => {
      bigText(g, 'EXHIBITION', W / 2, 6, { scale: 3 });
      const rowsDef = [
        ['HOME', TEAMS[st.home].name, TEAMS[st.home].color], ['AWAY', TEAMS[st.away].name, TEAMS[st.away].color], ['COURT', COURTS[COURT_ORDER[st.court]].name, '#ffd36a'],
        ['MODE', SETUP_MODES[st.mode], '#8ad0ff'], ['CPU LEVEL', ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff], '#ff9a6a'], ['QUARTER', ['1:00', '1:30', '2:00', '3:00'][st.q], '#c8ff9a'], ['', 'TIP OFF!', '#ffffff']
      ];
      S.setupRects = [];
      const x0 = 12, w = 210;
      rowsDef.forEach(([lb, val, col], i) => {
        const y = 36 + i * 22, foc = st.row === i; S.setupRects.push([x0, y, w, 20]);
        E.ui.box(g, x0, y, w, 20, { bg: foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'], border: foc ? '#fff6c0' : '#5a5e88', alpha: 1 });
        if (i < 6) { txt(g, lb, x0 + 8, y + 7, foc ? '#2a1204' : '#9a9ac8', { font: 'tiny', outline: false }); txt(g, val, x0 + w - 24, y + 6, foc ? '#2a1204' : col, { align: 'right', outline: false }); if (foc) { txt(g, '←', x0 + w - 18 - E.font.width(val) - 4, y + 6, '#2a1204', { outline: false }); } txt(g, i < 6 && foc ? '▸' : '', x0 + w - 12, y + 6, '#2a1204', { outline: false }); }
        else bigText(g, val, x0 + w / 2, y + 4, { scale: 1, colors: foc ? ['#ffffff', '#fff6c0', '#ffe080'] : ['#c8c8e8', '#a0a0d0', '#8080b0'] });
      });
      // right side: previews
      const cx = W - 110;
      [st.home, st.away].forEach((ti, k) => {
        const t = TEAMS[ti], y = 36 + k * 76; panel(g, cx - 96, y, 196, 70, { border: t.color });
        txt(g, t.name, cx - 90, y + 4, t.color); txt(g, t.blurb, cx - 90, y + 14, '#9a9ac8', { font: 'tiny' });
        t.players.forEach((p, j) => { drawPortraitOf(g, p, t, cx - 90 + j * 96, y + 24, 38); txt(g, p.name, cx - 48 + j * 96, y + 24, '#fff', { font: 'tiny' }); ratingPips(g, Math.round((p.ratings.zoom + p.ratings.dime) / 2), cx - 48 + j * 96, y + 34); txt(g, 'SPEED', cx - 48 + j * 96, y + 40, '#7a7aa8', { font: 'tiny', outline: false }); ratingPips(g, Math.round((p.ratings.slam + p.ratings.swat) / 2), cx - 48 + j * 96, y + 49); txt(g, 'POWER', cx - 48 + j * 96, y + 55, '#7a7aa8', { font: 'tiny', outline: false }); });
      });
      // players
      const P = game.players, mode = st.mode;
      const asg = mode === 1 ? ['HOME', 'HOME', 'AWAY', 'AWAY'] : mode === 2 ? ['HOME', 'AWAY', 'HOME', 'AWAY'] : ['HOME', 'HOME', 'HOME', 'HOME'];
      for (let i = 0; i < 4; i++) { const x = 12 + i * 52, y = 206; txt(g, 'P' + (i + 1) + (P[i] ? ' ' + (mode === 0 ? 'HOME' : asg[i]) : ' --'), x, y, P[i] ? E.PLAYER_COLORS[i] : '#5a5a78', { font: 'tiny' }); }
      txt(g, COURTS[COURT_ORDER[st.court]].twistText, 12, 194, '#c8c8e8', { font: 'tiny' });
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'GO'], ['cancel', 'BACK']], W - 120, H - 12);
      txt(g, 'MORE PLAYERS: PRESS START ON A PAD, OR 2 ON THE KEYBOARD', W - 8, H - 24, '#ffe08a', { font: 'tiny', align: 'right' });
    });
  }
};
function startExhibition() {
  const st = setupState, P = game.players, humans = {};
  const mode = st.mode;
  if (mode === 0) { for (let i = 0; i < P.length; i++) humans[i === 0 ? 0 : 1] = humans[i === 0 ? 0 : 1] || P[i]; }
  else if (mode === 1) { P.forEach((inp, i) => { humans[i] = inp; }); if (P.length === 1) { } }
  else { const order = [0, 2, 1, 3]; P.forEach((inp, i) => { humans[order[i]] = inp; }); }
  const ids = { teams: [st.home, st.away], court: COURT_ORDER[st.court], mode: 'exhibition', humans, qLen: QUARTER_LEN[['1:00', '1:30', '2:00', '3:00'][st.q]], difficulty: ['Rookie', 'Pro', 'All-Star', 'Legend'][st.diff] };
  go('match', { cfg: ids });
}

/* ===== HALL OF BLAM ===== */
let hallI = 0;
scenes.hall = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { hallI = 0; L.enabled = false; },
  update(dt) { touchIdle(dt); const I = game.input; hallI = cycle(I, TEAMS.length, hallI); if (I.pressed('cancel') || I.pressed('confirm')) go('title'); },
  draw(r) {
    const W = r.W, H = r.H, p = store.progress(), rec = p.records;
    r.sky(['#0e0a28', '#1a1048', '#3a1a58']);
    r.overlay(g => {
      bigText(g, 'HALL OF BLAM', W / 2, 6, { scale: 3 });
      panel(g, 12, 38, 170, 150);
      const rows = [['GAMES PLAYED', rec.games], ['WINS', rec.wins], ['MOST POINTS (ONE GAME)', rec.mostPoints], ['BEST STYLE SCORE', rec.bestStyle], ['TOTAL DUNKS', rec.dunks], ['TOURS WON', rec.toursWon]];
      rows.forEach(([a, b], i) => { txt(g, a, 20, 48 + i * 18, '#9a9ac8', { font: 'tiny' }); txt(g, String(b), 172, 46 + i * 18, '#ffd36a', { align: 'right', scale: 1 }); });
      txt(g, 'SECRET CREWS: ' + (unlockedAll() ? 'UNLOCKED' : 'LOCKED (WIN THE TOUR)'), 20, 160, unlockedAll() ? '#8aff9a' : '#ff8a8a', { font: 'tiny' });
      txt(g, 'TOUR: ' + (p.tour ? 'STOP ' + Math.min(4, p.tour.stop + 1) + ' WITH ' + TEAMS[p.tour.team].name : 'NOT STARTED'), 20, 172, '#c8c8e8', { font: 'tiny' });
      // roster book
      const t = TEAMS[hallI], bx = 192, bw = W - bx - 10;
      panel(g, bx, 38, bw, 150, { border: t.color });
      txt(g, '←  ' + t.name + '  ▸', bx + bw / 2, 44, t.color, { align: 'center' });
      if (t.secret && !unlockedAll()) { txt(g, 'LOCKED', bx + bw / 2, 100, '#ff8a8a', { align: 'center', scale: 2 }); txt(g, 'WIN THE BLAM TOUR TO UNLOCK', bx + bw / 2, 120, '#c8c8e8', { align: 'center', font: 'tiny' }); }
      else t.players.forEach((pl, j) => {
        const y = 58 + j * 64; drawPortraitOf(g, pl, t, bx + 8, y, 44); txt(g, pl.name, bx + 58, y, '#fff');
        RK.forEach((k, i) => { const cx = bx + 58 + (i % 2) * 68, cy = y + 12 + Math.floor(i / 2) * 11; txt(g, RICON[k], cx, cy, '#8a8ab8', { font: 'tiny', outline: false }); ratingPips(g, pl.ratings[k], cx + 22, cy + 1); });
      });
      drawPrompts(g, [['move', 'BROWSE CREWS'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};

/* ===== HOW TO PLAY ===== */
let howPage = 0;
const HOW = [
  { title: 'THE GAME', lines: ['Two against two. Four quarters. Score more than the other crew.', 'Dunks and jumpers both count: 2 points, 3 from behind the arc.', 'NO FOULS. Shoving, swatting and swiping are all LEGAL.', 'Three baskets in a row and your whole crew goes SUPERNOVA:', 'fast, deadly, on fire, and the backboard is in danger.', 'Shot clock is 20 seconds. Tied after four quarters? Overtime,', 'then SUDDEN BLAM: next basket wins.'] },
  { title: 'CONTROLS', pad: [['move', 'Move / dribble'], ['shoot', 'HOLD to jump, RELEASE at the top to shoot. With turbo near the hoop: DUNK. Without the ball: jump to block'], ['pass', 'Pass to your teammate. Without the ball: steal swipe'], ['turbo', 'Hold to sprint and jump higher. Needed to dunk'], ['shove', 'With ball: spin move. Without: SHOVE'], ['oop', 'Alley-oop lob to your teammate. Without the ball: call for it'], ['taunt', 'Taunt (dead balls only)']] },
  { title: 'WHAT YOU CAN AND CAN\'T DO', lines: ['CAN: shove anyone, steal from behind, block dunks, goaltend.', 'CAN: jump on a rebound, tip passes, swat shots at the top.', 'CAN\'T: leave the court (the crowd shoves you back).', 'CAN\'T: shoot without the ball, or dunk with an empty turbo tank.', 'Release at the very top of your jump for a PERFECT shot (green).', 'A hand in your face hurts your chances. Jumpers contested', 'by a jumping defender hurt even more.', 'Time out? No. This is arcade basketball.'] },
  { title: 'POWER-UPS & COURTS', lines: ['ROCKET KICKS: unlimited turbo and extra speed.', 'GOLD BALL: your next basket counts double.', 'GIANT HANDS: huge reach for steals, blocks and catches.', 'ICE CUBE: freezes the nearest rival.', 'ALLEY: puddles make you skate.   ROOFTOP: wind pushes the ball.', 'DOME: the JACKPOT SPOT adds +2.   LUNAR LOT: low gravity, huge air.'] }
];
scenes.howto = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { howPage = 0; },
  update(dt) { touchIdle(dt); const I = game.input; howPage = cycle(I, HOW.length, howPage); if (I.pressed('cancel') || I.pressed('confirm')) go(S.fromGame ? 'match' : 'title'); },
  draw(r) {
    const W = r.W, H = r.H, p = HOW[howPage];
    r.sky(['#0e0a28', '#1a1048', '#3a1a58']);
    r.overlay(g => {
      bigText(g, 'HOW TO PLAY', W / 2, 6, { scale: 3 });
      panel(g, 14, 38, W - 28, 164);
      bigText(g, p.title, W / 2, 46, { scale: 1 });
      if (p.lines) p.lines.forEach((l, i) => txt(g, l, 28, 68 + i * 14, '#e8e4f8'));
      if (p.pad) p.pad.forEach(([ac, d], i) => { const y = 66 + i * 18; drawGlyph(g, ac, 24, y); E.font.wrap(d, W - 90, { font: 'tiny' }).forEach((l, k) => txt(g, l, 46, y + 2 + k * 8, '#e8e4f8', { font: 'tiny' })); });
      for (let i = 0; i < HOW.length; i++) px.rect(g, W / 2 - 20 + i * 11, 194, 8, 4, i === howPage ? '#ffd36a' : '#3a3c58');
      drawPrompts(g, [['move', 'PAGES'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};

/* ===== ABOUT / CREDITS ===== */
const SOURCE_INFO = [
  ['Date', '2026-11-04 06:16:12'], ['Source', 'Basketball (over the top arcade style)'], ['Plan', 'PLAN.md (written by claude-opus-5-5 at max effort)'],
  ['Genre and Perspective', 'Arcade sports, 2-on-2 basketball; side-on broadcast camera (orthographic, pitch 30 deg, High view option)'],
  ['Tech', 'my-3D2dge v0.85.2 (modified copy), AI Hub Session Client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; Node 24 and Playwright for tests'],
  ['Art Direction', 'The engine\'s native HD pixel style: shaded Humanoid rigs, textured court floors, tiered stands, comic banners, neon night courts'],
  ['Animation', 'The engine\'s Humanoid rig animation (poses, moves, procedural gait) with hand-built dunk, shot and spin choreography'],
  ['Audio', 'All music, effects and voices synthesized in code: chip songs, Web Audio effects, Animalese-style gibberish voices. No audio files'],
  ['Online', 'AI Hub Session Protocol v1, parallel mode: a seeded BLAM SHOWDOWN where every player plays the same match'],
  ['Testing', 'Headless scripted play-throughs with game.advance, plus browser checks and screenshots'],
  ['Research', 'Read the engine handoff docs, sports kit and AI Hub protocol; no other research'],
  ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'], ['Model', 'Anthropic, claude-sonnet-5-5, reasoning effort medium'],
  ['Scope', 'A trimmed vertical slice of PLAN.md: 5 crews (10 players), 4 courts with twists, 8 dunks, 4 power-ups, 10 camp lessons, a 4-stop story tour, dev mode with 25 live sliders, attract mode, local 1-4 players and a parallel-mode AI Hub round'],
  ['Usage', 'unknown'],
  ['Engine changes', '1) Dialog.voice may be a function (letter, index, text) so a synthesized voice speaks as lines type. 2) audio.sfxBus and audio.musicBus public getters so voices and crowd follow the volume settings.']
];
let credY = 0;
scenes.credits = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { credY = 0; music('victory'); },
  update(dt) { touchIdle(dt); const I = game.input; if (I.down('down')) credY += dt * 90; if (I.down('up')) credY -= dt * 90; credY = clamp(credY, 0, 260); if (I.pressed('cancel') || I.pressed('start')) go('title'); },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0e0a28', '#241048', '#4a1a58']);
    r.overlay(g => {
      bigText(g, 'ABOUT BASKETBLAM', W / 2, 6, { scale: 2 });
      panel(g, 10, 30, W - 20, H - 56);
      let y = 38 - credY;
      for (const [k, v] of SOURCE_INFO) {
        const lines = E.font.wrap(v, W - 150, { font: 'tiny' }); if (y > 20 && y < H - 40) txt(g, k.toUpperCase(), 18, y, '#ffd36a', { font: 'tiny' });
        lines.forEach((l, i) => { if (y + i * 8 > 24 && y + i * 8 < H - 34) txt(g, l, 120, y + i * 8, '#e8e4f8', { font: 'tiny' }); });
        y += Math.max(1, lines.length) * 8 + 5;
      }
      txt(g, 'Thanks for playing! Special thanks to the crowd, who are all the same six people.', 18, y + 6, '#c8c8e8', { font: 'tiny' });
      drawPrompts(g, [['move', 'SCROLL'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};

/* ===== 43-modes.js ===== */
/* BASKETBLAM - the match scene, results, the Blam Tour and Blam Camp */

/* ===== the match scene (exhibition, tour, camp, hub) ===== */
let matchData = null, resultsFor = null;
function matchFrame(dt) {
  const M = S.match;
  talk.update(dt); annT += dt;
  const sdt = dt * tune('gameSpeed');
  matchStep(sdt, cmdFor);
  for (const p of S.players) {
    p.rig.update(dt, rigState(p));
    if (p.rig.o.headR0 === undefined) p.rig.o.headR0 = p.rig.o.headR;
    p.rig.o.headR = p.rig.o.headR0 * (S.cheats.big ? 1.8 : 1);   // the BIG HEADS cheat
  }
  cameraStep(dt); fxStep(dt);
  crowdUpdate(dt, clamp(.25 + M.excite * .75, 0, 1));
}
function enterMatch(data) {
  wireEvents(); data = data || {}; matchData = data; S.fromGame = true;
  let cfg = data.cfg;
  S.cheats.infTurbo = S.cheats.infTurbo && false;
  if (data.attract) { cfg = attractMatchCfg(); S.cheats.infTurbo = true; }
  else if (data.hub) cfg = hubCfg();
  else if (data.tour) { cfg = tourCfg(data.tour); }
  else if (data.camp) cfg = campCfg();
  if (!cfg) cfg = { teams: [0, 1], court: 'alley', humans: { 0: game.input }, qLen: 90, difficulty: 'Pro' };
  if (!data.attract && cfg.mode !== 'attract') S.cheats.infTurbo = false;
  game.resetCamera(); game.follow(null); game.cam.bounds = null; game.input.consumeAll();
  newMatch(cfg);
  if (cfg.mode === 'camp') { S.match.phase = 'camp'; S.ball.state = 'dead'; campStart(); }
  S.dev.open = false; S.howto = null; talk.close && talk.close();
  game.timeScale = 1;
  L.enabled = true; L.ambient = clamp(.78 + courtDef().lights * .2, 0, 1);
  music(courtDef().music); game.allowJoin(false);
  if (cfg.mode !== 'attract') { game.settings.set && 0; }
  crowdStop();
  S.match.resultSaved = false;
}
const matchScene = {
  view: 'broadcast', views: ['broadcast', 'high'], input: KEYS, res: 'ps1', pausable: !HUB, camera: { zoom: false },
  enter(d) { enterMatch(d); },
  exit() { crowdStop(); L.enabled = false; music(null); game.timeScale = 1; },
  update(dt) {
    const M = S.match; if (!M) return;
    const view = game.settings.camera === 'High' ? 'high' : 'broadcast'; if (game.baseView && game.baseView.id !== view) game.setView(view);
    game.input.glyphs = padStyle() === 'xbox' ? 'xbox' : 'playstation';
    if (S.dev.open) { devUpdate(dt); cameraStep(dt); return; }
    if (S.howto) { howUpdate(dt); return; }
    if (S.hub && hubWaiting()) { cameraStep(dt); return; }
    if (S.mode === 'camp') campStep(dt);
    matchFrame(dt);
    if (S.hub) hubStep(dt);
    if (M.phase === 'end' && M.endT > 2.4 && S.mode !== 'camp') finishMatch();
    // the controller drops out: a human who is idle for long gets help? (no) ; autopilot via dev
  },
  draw(r) { drawMatch(r); if (S.dev.open) r.overlay(g => drawDevPanel(g, r)); if (S.howto) r.overlay(g => drawHowOverlay(g, r)); if (S.mode === 'camp') r.overlay(g => campDraw(g, r)); },
  back() { return false }
};
scenes.match = matchScene;
// attract: the same match with the CPU playing every slot, any input leaves
scenes.attract = Object.assign({}, matchScene, {
  pausable: false,
  enter() { enterMatch({ attract: true }); S.mode = 'attract'; idleMs = 0; },
  update(dt) {
    const I = game.input, m = mouseHud(), mv = I.move();
    const moved = m && lastMouse && (Math.abs(m[0] - lastMouse[0]) + Math.abs(m[1] - lastMouse[1])) > 3; lastMouse = m;
    S.attractT = (S.attractT || 0) + dt;
    if (touchOnlyDevice()) { const c = I.clicked && I.clicked(); if (c && c[1] > game.H - 26 && c[0] > game.W - 72) game.menu('settings'); if (I.anyPressed()) I.consumeAll(); }
    else if (S.attractT > .5 && (I.anyPressed() || Math.hypot(mv[0], mv[1]) > .4 || moved)) { S.attractT = 0; S.mode = 'title'; go('title'); return; }
    matchFrame(dt);
    const M = S.match; if (M.phase === 'end' && M.endT > 3 || M.time > 150) { S.attractT = 0.6; game.go('attract', null, { fade: 0 }); }
    // to show off: Supernova on a loop
  },
  draw(r) { drawMatch(r); if (touchOnlyDevice()) r.overlay(g => { panel(g, r.W / 2 - 130, r.H - 52, 260, 24); bigText(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H - 44, { scale: 1 }); panel(g, r.W - 70, r.H - 24, 66, 18); txt(g, 'SETTINGS', r.W - 37, r.H - 19, '#fff', { align: 'center', font: 'tiny' }); }); }
});

function finishMatch() {
  const M = S.match; if (M.resultSaved) return; M.resultSaved = true;
  const prog = store.progress(), rec = prog.records, hs = S.humans, humanTeams = new Set(Object.keys(hs).map(k => +k < 2 ? 0 : 1));
  const mine = Object.keys(hs).length ? [...humanTeams][0] : 0;
  const best = Math.max(...S.players.filter(p => p.input).map(p => p.st.pts), 0);
  rec.games++; if (M.winner === mine && M.winner >= 0) rec.wins++; rec.mostPoints = Math.max(rec.mostPoints, best); rec.dunks += S.players.reduce((a, p) => a + (p.input ? p.st.dunks : 0), 0);
  rec.bestStyle = Math.max(rec.bestStyle, ...S.players.filter(p => p.input).map(p => p.st.style));
  store.save(prog);
  resultsFor = { cfg: S.cfg, score: M.score.slice(), winner: M.winner, mine, players: S.players.map(p => ({ name: p.name, team: p.team, st: Object.assign({}, p.st), human: !!p.input, spec: p.spec, tdef: p.tdef })), qScores: M.qScores.map(q => q.slice()), mode: S.mode, tour: matchData && matchData.tour, mvp: mvpOf().slot, ot: M.ot };
  if (S.hub) { hubFinish(); return; }
  go('results');
}

/* ===== results ===== */
let resList = null;
scenes.results = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() {
    L.enabled = false; const R = resultsFor; if (!R) return go('title');
    const items = [];
    const won = R.winner === R.mine;
    if (R.tour) {
      if (won) items.push({ label: R.tour.stop >= 3 ? 'FINISH THE TOUR' : 'NEXT STOP', fn: () => tourAfter(R.tour, true) });
      else items.push({ label: 'RETRY STOP', fn: () => tourAfter(R.tour, false) });
      items.push({ label: 'TO TITLE', fn: () => go('title') });
    } else { items.push({ label: 'REMATCH', fn: () => go('match', { cfg: Object.assign({}, R.cfg, { seed: undefined }) }) }); items.push({ label: 'TO TITLE', fn: () => go('title') }); }
    resList = new FocusList(items, { horizontal: true }); music(won ? 'victory' : 'lose'); resT = 0; crowdStop();
  },
  update(dt) { touchIdle(dt); resT += dt; if (resList) resList.update(dt); },
  draw(r) {
    const R = resultsFor; if (!R) return; const W = r.W, H = r.H, won = R.winner === R.mine, ht = TEAMS[R.cfg.teams[0]], at = TEAMS[R.cfg.teams[1]];
    r.sky(won ? ['#1a0c38', '#5a1a68', '#ffa030'] : ['#0c0c1c', '#1a1a38', '#2a2a48']);
    r.overlay(g => {
      const title = R.winner < 0 ? 'A DRAW!?' : TEAMS[R.cfg.teams[R.winner]].name + ' WIN!';
      bigText(g, title, W / 2, 6, { scale: 3, colors: won ? ['#fffbe8', '#ffd36a', '#ff8a2a'] : ['#e0e0f0', '#9aa0c0', '#6a70a0'] });
      txt(g, (R.ot ? 'OVERTIME   ' : '') + R.score[0] + '  -  ' + R.score[1], W / 2, 36, '#fff', { align: 'center', scale: 2 });
      txt(g, ht.name, W / 2 - 70, 38, ht.color, { align: 'right' }); txt(g, at.name, W / 2 + 70, 38, at.color);
      // quarter table
      panel(g, 10, 58, 130, 92);
      txt(g, 'BY QUARTER', 18, 62, '#9a9ac8', { font: 'tiny' });
      R.qScores.forEach((q, i) => { const lb = i < 4 ? 'Q' + (i + 1) : 'OT' + (i - 3); txt(g, lb, 18, 74 + i * 11, '#c8c8e8', { font: 'tiny' }); txt(g, String(q[0]), 70, 73 + i * 11, ht.color, { align: 'right' }); txt(g, String(q[1]), 120, 73 + i * 11, at.color, { align: 'right' }); });
      // players
      R.players.forEach((p, i) => {
        const x = 150 + (i % 2) * 138, y = 58 + Math.floor(i / 2) * 46, mv = R.mvp === i;
        panel(g, x, y, 134, 42, { border: mv ? '#ffd36a' : TEAMS[R.cfg.teams[p.team]].color });
        drawPortraitOf(g, p.spec, p.tdef, x + 3, y + 3, 36);
        txt(g, p.name + (p.human ? ' (YOU)' : ''), x + 42, y + 3, '#fff', { font: 'tiny' }); if (mv) txt(g, 'MVP ★', x + 130, y + 3, '#ffd36a', { align: 'right', font: 'tiny' });
        txt(g, p.st.pts + ' PTS  ' + p.st.dunks + ' DUNK', x + 42, y + 12, '#e8e4f8', { font: 'tiny' }); txt(g, p.st.blocks + ' BLK  ' + p.st.steals + ' STL  ' + p.st.assists + ' AST', x + 42, y + 20, '#c8c8e8', { font: 'tiny' });
        txt(g, 'STYLE ' + p.st.style, x + 42, y + 29, '#ff9a3a', { font: 'tiny' });
      });
      if (R.tour) txt(g, won ? 'STOP CLEARED!' : 'THEY BEAT YOU. RUN IT BACK.', W / 2, 156, won ? '#8aff9a' : '#ff8a8a', { align: 'center' });
      resList.drawRow(g, W / 2 - 100, 170, 98, 18);
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'GO']], W / 2, H - 14);
    });
  }
};
let resT = 0;
// horizontal draw override for the results list
FocusList.prototype.drawRow = function (g, x, y, w, h) { this.rects = []; this.items.forEach((it, k) => { const foc = k === this.i, xx = x + k * (w + 6); this.rects.push([xx, y, w, h]); E.ui.box(g, xx, y, w, h, { bg: foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'], border: foc ? '#fff6c0' : '#5a5e88', alpha: 1 }); txt(g, it.label, xx + w / 2, y + 6, foc ? '#2a1204' : '#e8e8ff', { align: 'center', outline: false }); }); };

/* ===== the Blam Tour ===== */
const tourStory = new E.Dialog(game, { lines: 3, place: 'bottom', border: '#ffd36a', speed: 40 });
let tourState = null, tourList = null, tourPick = 0;
function oppOf(team, stop) { const t = TOUR[stop]; return TOUR_FOES(team)[stop]; }
function tourCfg(tr) { return { teams: [tr.team, oppOf(tr.team, tr.stop)], court: TOUR[tr.stop].court, mode: 'tour', humans: { 0: game.input }, qLen: 75 + tr.stop * 8, difficulty: ['Rookie', 'Pro', 'Pro', 'All-Star'][tr.stop], seed: 1000 + tr.stop * 17 + tr.team, tour: tr }; }
function startTour(team, stop) { const p = store.progress(); p.tour = { team, stop }; store.save(p); go('tourmap', { team, stop, phase: 'pre' }); }
function tourAfter(tr, won) {
  if (!won) return go('match', { tour: tr });
  const p = store.progress(), stop = tr.stop + 1;
  if (stop >= TOUR.length) { p.tour = { team: tr.team, stop: TOUR.length }; p.unlocked = true; p.records.toursWon++; store.save(p); go('tourmap', { team: tr.team, stop: tr.stop, phase: 'post', ending: true }); }
  else { p.tour = { team: tr.team, stop }; store.save(p); go('tourmap', { team: tr.team, stop: tr.stop, phase: 'post', next: stop }); }
}
scenes.tourteam = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter() { L.enabled = false; tourPick = 0; music('camp'); },
  update(dt) {
    touchIdle(dt); const I = game.input; tourPick = cycle(I, 3, tourPick);
    if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) { startTour(tourPick, 0); }
    if (I.pressed('cancel')) go('title');
  },
  draw(r) {
    const W = r.W, H = r.H;
    r.sky(['#0e0a28', '#241048', '#7a2a58']);
    r.overlay(g => {
      bigText(g, 'CHOOSE YOUR CREW', W / 2, 6, { scale: 3 });
      for (let i = 0; i < 3; i++) {
        const t = TEAMS[i], x = 10 + i * ((W - 20) / 3), w = (W - 20) / 3 - 6, foc = i === tourPick, y = foc ? 40 : 46;
        panel(g, x, y, w, 150, { border: foc ? '#fff6c0' : t.color, bg: foc ? [t.color, t.dark] : ['#1c1e36', '#10121e'] });
        txt(g, t.name, x + w / 2, y + 5, foc ? '#fff' : t.color, { align: 'center' }); txt(g, t.blurb, x + w / 2, y + 16, foc ? '#fff' : '#9a9ac8', { align: 'center', font: 'tiny' });
        t.players.forEach((p, j) => { const yy = y + 28 + j * 58; drawPortraitOf(g, p, t, x + 6, yy, 42); txt(g, p.name, x + 54, yy, '#fff', { font: 'tiny' }); ['zoom', 'slam', 'deep', 'dime'].forEach((k, q) => { txt(g, RICON[k], x + 54, yy + 8 + q * 10, '#c8c8e8', { font: 'tiny', outline: false }); ratingPips(g, p.ratings[k], x + 54 + 26, yy + 9 + q * 10); }); });
      }
      drawPrompts(g, [['move', 'CHOOSE'], ['confirm', 'START TOUR'], ['cancel', 'BACK']], W / 2, H - 14);
    });
  }
};
let storyQ = [], storyDone = null, storyOn = false;
function runStory(lines, done) {
  storyQ = lines.slice(); storyDone = done; storyOn = true; nextStory();
}
function nextStory() {
  if (!storyQ.length) { storyOn = false; const d = storyDone; storyDone = null; if (d) d(); return; }
  const [who, text] = storyQ.shift(), v = VOICES[who] || VOICES.RICO;
  tourStory.voice = voiceFor(who in VOICES ? who : 'RICO');
  tourStory.say(text, { name: v.name, portrait: speakerRig(who in VOICES ? who : 'RICO'), portraitSize: 36, onDone: nextStory, nameColor: v.color });
  if (!storyQ.length) { }
}
scenes.tourmap = {
  view: 'broadcast', input: KEYS, res: 'ps1',
  enter(d) {
    L.enabled = false; tourState = d; tourList = null; music('camp');
    const stop = d.stop, st = TOUR[stop];
    if (d.phase === 'pre') {
      const opp = TEAMS[oppOf(d.team, stop)], extra = stop < 2 ? [[opp.players[0].name === 'DEX' ? 'RICO' : 'RICO', 'TODAY\'S OPPONENTS: THE ' + opp.name + '! ' + opp.blurb.toUpperCase()]] : [];
      runStory(st.pre.concat(extra), () => { tourList = new FocusList([{ label: 'PLAY ' + st.name, fn: () => go('match', { tour: { team: d.team, stop } }) }, { label: 'BACK TO TITLE', fn: () => go('title') }]); });
    } else {
      runStory(st.post.concat(d.ending ? [['MAYOR', 'THE BLAM TOUR IS COMPLETE. THE MOON WALKERS AND THE BLAMBOTS ARE NOW IN YOUR EXHIBITION LIST. PLEASE DUNK RESPONSIBLY.']] : []), () => {
        if (d.ending) go('title'); else go('tourmap', { team: d.team, stop: d.next, phase: 'pre' });
      });
    }
  },
  update(dt) {
    touchIdle(dt); tourStory.update(dt);
    if (tourList) tourList.update(dt);
    if (game.input.pressed('cancel') && tourStory.open && storyOn) { storyQ = []; tourStory.close(); const d = storyDone; storyDone = null; storyOn = false; if (d) d(); }   // skip the cutscene
    else if (game.input.pressed('cancel') && !tourStory.open && !tourList) go('title');
  },
  draw(r) {
    const W = r.W, H = r.H, d = tourState; if (!d) return;
    const cd = COURTS[TOUR[d.stop].court];
    getBackdrop(TOUR[d.stop].court).draw(r);
    r.overlay(g => {
      px.blend && px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      bigText(g, 'THE BLAM TOUR', W / 2, 6, { scale: 3 });
      for (let i = 0; i < 4; i++) {
        const x = 14 + i * ((W - 28) / 4), w = (W - 28) / 4 - 6, cur = i === d.stop, done = i < d.stop || (d.phase === 'post' && i === d.stop && d.ending) || (store.progress().tour && store.progress().tour.stop > i);
        panel(g, x, 40, w, 62, { border: cur ? '#fff6c0' : done ? '#6aff9a' : '#4a4e78', bg: cur ? ['#5a3010', '#2a1408'] : ['#1c1e36', '#10121e'] });
        txt(g, i === 3 ? 'FINAL' : 'STOP ' + (i + 1), x + w / 2, 45, cur ? '#ffd36a' : '#9a9ac8', { align: 'center', font: 'tiny' });
        txt(g, COURTS[TOUR[i].court].name, x + w / 2, 58, '#fff', { align: 'center', font: 'tiny' });
        const opp = TEAMS[oppOf(d.team, i)]; txt(g, 'vs ' + opp.name, x + w / 2, 70, opp.color, { align: 'center', font: 'tiny' });
        txt(g, done ? 'CLEARED OK' : cur ? 'NEXT' : '...', x + w / 2, 88, done ? '#6aff9a' : '#c8c8e8', { align: 'center', font: 'tiny' });
      }
      txt(g, cd.name + ' - ' + cd.sub, W / 2, 112, '#ffe8c8', { align: 'center', font: 'tiny' }); txt(g, cd.twistText, W / 2, 124, '#8ad0ff', { align: 'center', font: 'tiny' });
      txt(g, 'YOUR CREW: ' + TEAMS[d.team].name, W / 2, 138, TEAMS[d.team].color, { align: 'center' });
      if (tourList) tourList.draw(g, W / 2 - 90, 154, 180, 18, 4);
    });
    tourStory.draw(r);
  }
};

/* ===== Blam Camp ===== */
const LESSONS = [
  { id: 'move', title: 'MOVE', text: 'Use the stick to run around. Reach the far baseline.', prompts: [['move', 'MOVE']], need: 'ball0' },
  { id: 'turbo', title: 'TURBO', text: 'Hold TURBO while you run. It drains and refills. Sprint for 2 seconds.', prompts: [['turbo', 'HOLD TO SPRINT'], ['move', 'MOVE']], need: 'ball0' },
  { id: 'pass', title: 'PASS', text: 'Pass the ball to your teammate COACH. They\'ll toss it back.', prompts: [['pass', 'PASS']], need: 'ball0' },
  { id: 'shoot', title: 'JUMP SHOT', text: 'HOLD SHOOT to jump, RELEASE at the very top. Sink a jumper.', prompts: [['shoot', 'HOLD, THEN RELEASE AT THE TOP']], need: 'ball0far' },
  { id: 'dunk', title: 'DUNK', text: 'Run at the hoop with TURBO held and press SHOOT. Throw it down!', prompts: [['turbo', 'TURBO'], ['shoot', 'DUNK']], need: 'ball0near' },
  { id: 'oop', title: 'ALLEY-OOP', text: 'Press OOP to lob it to COACH. They will leap and slam it.', prompts: [['oop', 'ALLEY-OOP LOB']], need: 'ball0mid' },
  { id: 'spin', title: 'SPIN MOVE', text: 'With the ball, press SHOVE to spin past defenders. Costs a little turbo.', prompts: [['shove', 'SPIN']], need: 'ball0' },
  { id: 'steal', title: 'STEAL', text: 'Get close to the ball handler and press PASS to swipe the ball!', prompts: [['pass', 'SWIPE']], need: 'dummyball' },
  { id: 'shove', title: 'SHOVE', text: 'No fouls here. Walk up to a rival and press SHOVE. Down they go.', prompts: [['shove', 'SHOVE']], need: 'dummy' },
  { id: 'block', title: 'BLOCK', text: 'The rival is shooting. Jump with SHOOT at the right moment to swat it!', prompts: [['shoot', 'JUMP TO BLOCK']], need: 'dummyshoot' }
];
let camp = null;
function campCfg() { return { teams: [0, 1], court: 'alley', mode: 'camp', humans: { 0: game.input }, qLen: 600, difficulty: 'Rookie', seed: 31 }; }
function startCamp() { go('match', { camp: true }); }
function campStart() {
  const prog = store.progress();
  camp = { i: 0, t: 0, flash: 0, jumps: 0, moved: 0, turboT: 0, wait: 0, done: false, last: null, passed: false };
  S.cheats.infTurbo = false;
  S.players[1].script = (p) => campMate(p); S.players[2].script = (p) => campDummy(p, 2); S.players[3].script = (p) => campDummy(p, 3);
  S.players.forEach(p => p.camp = true);
  lessonSetup();
  on('camp', () => { });
}
function campMate(p) {
  const c = NOCMD(), B = S.ball, M = S.match; p.ai.t += 1 / 120;
  if (p.hasBall) { p.ai.hold = (p.ai.hold || 0) + 1 / 120; if (p.ai.hold > 1.0) { p.ai.hold = 0; c.pass.pressed = true; } return c; }
  p.ai.hold = 0;
  if (p.act) return c;
  const h = attackHoop(0), tx = camp && LESSONS[camp.i] && LESSONS[camp.i].id === 'oop' ? h.x - 120 : COURT.cx + 20, ty = COURT.cy + 70; goto(c, p, tx, ty, 10); return c;
}
function campDummy(p, slot) {
  const c = NOCMD(), L0 = camp && LESSONS[camp.i] && LESSONS[camp.i].id; p.ai.t += 1 / 120;
  if (L0 === 'steal' && slot === 2) { // dribble slowly back and forth
    c.mx = Math.sin(p.ai.t * .7) * .5; c.my = Math.cos(p.ai.t * .5) * .3; return c;
  }
  if (L0 === 'block' && slot === 2) {
    const hp = attackHoop(1); // shoots at the left hoop... he is on team 1: attacks HOOPS[0]
    if (p.hasBall && !p.act) { p.ai.s = (p.ai.s || 0) + 1 / 120; const d = hoopDist(p, attackHoop(1)); if (d > 130) { goto(c, p, attackHoop(1).x + 100, attackHoop(1).y + 20, 10); } else if (p.ai.s > 2) { p.ai.s = 0; c.shoot.pressed = true; c.shoot.down = true; p.ai.shootErr = (Math.random() - .5) * .3; } }
    else if (p.act && p.act.type === 'shot') c.shoot.down = p.act.t < p.act.V / playerG();
    else if (!p.hasBall && S.ball.state === 'loose') { goto(c, p, S.ball.x, S.ball.y, 3); }
    return c;
  }
  return c;
}
function lessonSetup() {
  const L0 = LESSONS[camp.i], p0 = S.players[0], B = S.ball, h = attackHoop(0), M = S.match;
  S.players.forEach(p => { p.act = null; p.stun = 0; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.hasBall = false; p.turbo = 1; });
  B.owner = null; B.state = 'dead'; B.shot = null; B.scored = false;
  const place = (p, x, y) => { p.x = x; p.y = y; };
  place(p0, COURT.cx - 140, COURT.cy); place(S.players[1], COURT.cx + 20, COURT.cy + 70); place(S.players[2], COURT.cx + 150, COURT.cy - 80); place(S.players[3], COURT.cx + 180, COURT.cy + 70);
  S.players.forEach(p => p.facing = p.team ? PI : 0);
  switch (L0.need) {
    case 'ball0far': place(p0, h.x - 170, h.y + 20); giveBall(p0); break;
    case 'ball0near': place(p0, h.x - 130, h.y + 10); giveBall(p0); break;
    case 'ball0mid': place(p0, h.x - 200, h.y + 30); place(S.players[1], h.x - 130, h.y + 50); giveBall(p0); break;
    case 'dummyball': place(S.players[2], COURT.cx - 40, COURT.cy); place(p0, COURT.cx - 100, COURT.cy + 20); giveBall(S.players[2]); break;
    case 'dummy': place(S.players[2], COURT.cx - 60, COURT.cy); place(p0, COURT.cx - 130, COURT.cy + 10); B.x = COURT.cx; B.y = COURT.cy; break;
    case 'dummyshoot': { const h1 = attackHoop(1); place(S.players[2], h1.x + 90, h1.y + 30); place(p0, h1.x + 60, h1.y + 40); giveBall(S.players[2]); break; }
    default: giveBall(p0);
  }
  M.possession = L0.need === 'dummyball' || L0.need === 'dummyshoot' ? 1 : 0; M.shotClock = 99; camp.t = 0; camp.moved = 0; camp.turboT = 0; camp.jumps = 0; camp.passed = false; camp.flash = 0; camp.hint = 0;
  camp.last = { x: p0.x, y: p0.y };
}
function campComplete() { camp.flash = 2; sfx('jackpot'); banner('NICE!', { colors: ['#ffffff', '#8affc0', '#20c080'], scale: 3, y: .3 }); camp.wait = 2; const p = store.progress(); if (!p.camp.includes(LESSONS[camp.i].id)) { p.camp.push(LESSONS[camp.i].id); store.save(p); } }
function campStep(dt) {
  if (!camp) return; const M = S.match, p0 = S.players[0], L0 = LESSONS[camp.i];
  M.clock = 600; M.shotClock = 99;
  if (camp.done) { camp.wait -= dt; if (camp.wait <= 0 || game.input.pressed('confirm')) { go('title'); } return; }
  camp.t += dt; camp.flash = Math.max(0, camp.flash - dt);
  if (camp.wait > 0) { camp.wait -= dt; if (camp.wait <= 0) { camp.i++; if (camp.i >= LESSONS.length) { camp.done = true; camp.wait = 6; banner('CAMP COMPLETE!', { scale: 3, life: 3 }); announce('end', { w: 'YOU' }, 5); } else lessonSetup(); } return; }
  if (M.campT > 0) { M.campT -= dt; if (M.campT <= 0) lessonSetup(); }
  const id = L0.id;
  if (id === 'move') { camp.moved += Math.hypot(p0.x - camp.last.x, p0.y - camp.last.y); camp.last = { x: p0.x, y: p0.y }; if (camp.moved > 260) campComplete(); }
  if (id === 'turbo') { if (p0.boost) camp.turboT += dt; if (camp.turboT > 2) campComplete(); }
  if (id === 'pass') { if (S.players[1].hasBall) campComplete(); }
  if (id === 'spin') { }
  if (id === 'steal' || id === 'shove') { if (S.players[2].stun <= 0 && id === 'shove' && false) { } }
  // the ball ends up out of play: reset the lesson
  if (S.ball.state === 'dead' && !S.ball.owner && M.phase === 'camp' && !(M.campT > 0) && ['shoot', 'dunk', 'oop'].indexOf(id) < 0 && camp.t > 2 && id !== 'move' && id !== 'turbo' && id !== 'shove') { }
  if (camp.t > 25 && (id === 'shoot' || id === 'dunk' || id === 'oop') && !S.ball.owner && S.ball.state === 'loose' && S.ball.z < 6 && camp.t % 5 < dt) { }
  camp.hint = (camp.hint || 0) + dt;
  if (!p0.hasBall && !S.players.some(p => p.hasBall) && S.ball.state === 'loose' && ['shoot', 'dunk', 'oop', 'pass', 'spin'].includes(id)) { camp.loose = (camp.loose || 0) + dt; if (camp.loose > 4) { camp.loose = 0; lessonSetup(); } } else camp.loose = 0;
}
on('basket', e => {
  if (S.mode !== 'camp' || !camp || camp.done) return; const id = LESSONS[camp.i] && LESSONS[camp.i].id;
  if (camp.wait > 0) return;
  if ((id === 'shoot' && e.p === 0 && !e.dunk) || (id === 'dunk' && e.p === 0 && e.dunk) || (id === 'oop' && e.oop)) campComplete();
});
on('spin', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'spin' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('steal', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'steal' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('shove', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'shove' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('block', e => { if (S.mode === 'camp' && camp && !camp.done && LESSONS[camp.i].id === 'block' && e.p === 0 && !(camp.wait > 0)) campComplete(); });
on('jump', e => { });
function campDraw(g, r) {
  if (!camp) return; const W = r.W, L0 = LESSONS[Math.min(camp.i, LESSONS.length - 1)];
  const y0 = r.H - 58; panel(g, 6, y0, W - 12, 52, { border: camp.flash > 0 ? '#6aff9a' : '#8a8ec8' });
  txt(g, 'BLAM CAMP  ' + Math.min(camp.i + 1, LESSONS.length) + '/' + LESSONS.length + '  -  ' + L0.title, 14, y0 + 4, '#ffd36a');
  const lines = E.font.wrap(L0.text, W - 40, { font: 'tiny' }); lines.forEach((l, i) => txt(g, l, 14, y0 + 15 + i * 8, '#e8e4f8', { font: 'tiny' }));
  drawPrompts(g, L0.prompts, W / 2, y0 + 37);
  if (camp.done) txt(g, 'CAMP COMPLETE! YOU ARE READY FOR THE BLAM TOUR.', W / 2, 50, '#8affc0', { align: 'center' });
  
}

/* ===== 46-dev.js ===== */
/* BASKETBLAM - dev mode (from the pause menu): live tuning sliders, cheats, scene jumps, overlays */
const DEV_TABS = ['TUNING', 'TOOLS', 'STATE'];
const toggleCheat = k => () => { S.cheats[k] = !S.cheats[k]; };
const DEV_TOOLS = [
  { label: 'Infinite turbo', get: () => S.cheats.infTurbo, fn: toggleCheat('infTurbo') },
  { label: 'Big heads', get: () => S.cheats.big, fn: toggleCheat('big') },
  { label: 'Freeze the clocks', get: () => S.cheats.noClock, fn: toggleCheat('noClock') },
  { label: 'Autopilot (CPU plays P1)', get: () => S.dev.autopilot, fn: () => { S.dev.autopilot = !S.dev.autopilot; } },
  { label: 'Overlay: names and ball', get: () => S.dev.overlay, fn: () => { S.dev.overlay = !S.dev.overlay; } },
  { label: 'Give the ball to P1 / slot 0', fn: () => { const p = S.players.find(q => q.input) || S.players[0]; giveBall(p); p.act = null; } },
  { label: 'Teleport P1 to the hoop', fn: () => { const p = S.players.find(q => q.input) || S.players[0]; const h = attackHoop(p.team); p.x = h.x - h.dir * 90; p.y = h.y; } },
  { label: 'HOME +2 points', fn: () => { S.match.score[0] += 2; } },
  { label: 'AWAY +2 points', fn: () => { S.match.score[1] += 2; } },
  { label: 'Set clock to 0:10', fn: () => { S.match.clock = 10; } },
  { label: 'End the quarter now', fn: () => { if (S.match.phase === 'live') { S.match.clock = 0; endQuarter(); } } },
  { label: 'Supernova for HOME', fn: () => { S.match.novaT[0] = 40; S.match.streak[0] = 3; emit('supernovaOn', { team: 0, p: 0 }); } },
  { label: 'Spawn a power-up', fn: () => { const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)]; S.powerups.push({ id: pu.id, x: COURT.cx + (Math.random() - .5) * 200, y: COURT.cy + (Math.random() - .5) * 100, t: 0, life: 14 }); } },
  { label: 'Shatter a backboard', fn: () => shatterBoard(HOOPS[1]) },
  { label: 'Tip off again', fn: () => { startTip(); } },
  { label: 'Next court (restart match)', fn: () => { const i = (COURT_ORDER.indexOf(S.court) + 1) % 4; newMatch(Object.assign({}, S.cfg, { court: COURT_ORDER[i], seed: undefined })); music(courtDef().music); } },
  { label: 'Unlock the secret crews', fn: () => { const p = store.progress(); p.unlocked = true; store.save(p); S.dev.unlockAll = true; } },
  { label: 'Save tuning', fn: () => { saveTuning(); banner('TUNING SAVED', { scale: 2 }); } },
  { label: 'Reset every slider to defaults', fn: () => { resetTuning(); E.store.set('bb:tuning', null); banner('DEFAULTS RESTORED', { scale: 2 }); } },
  { label: 'Quit to title', fn: () => { S.dev.open = false; go('title'); } },
  { label: 'Close dev mode', fn: () => { S.dev.open = false; } }
];
function devRows() {
  const tab = S.dev.tab, rows = [];
  if (tab === 0) { let grp = ''; for (const k in TUNING) { const t = TUNING[k]; if (t.group !== grp) { grp = t.group; rows.push({ hdr: grp }); } rows.push({ slider: t }); } }
  else if (tab === 1) DEV_TOOLS.forEach(t => rows.push({ tool: t }));
  else {
    const M = S.match, B = S.ball;
    rows.push({ info: 'Scene ' + game.sceneName + '  mode ' + S.mode + '  court ' + S.court });
    rows.push({ info: 'Phase ' + M.phase + '  Q' + M.quarter + '  clock ' + M.clock.toFixed(1) + '  shot ' + M.shotClock.toFixed(1) });
    rows.push({ info: 'Score ' + M.score.join(' - ') + '  streak ' + M.streak.join('/') + '  nova ' + M.novaT.map(x => x.toFixed(0)).join('/') });
    rows.push({ info: 'Ball ' + B.state + ' (' + B.x.toFixed(0) + ', ' + B.y.toFixed(0) + ', ' + B.z.toFixed(0) + ') owner ' + (B.owner ? B.owner.name : '-') });
    S.players.forEach(p => rows.push({ info: p.slot + ' ' + p.name + ' ' + (p.input ? 'HUMAN' : 'CPU') + ' ' + (p.act ? p.act.type : 'free') + ' turbo ' + p.turbo.toFixed(2) + ' pts ' + p.st.pts }));
    rows.push({ info: 'Last events: ' + S.events.slice(-6).map(e => e.type).join(', ') });
  }
  return rows;
}
function devUpdate(dt) {
  const I = game.input, d = S.dev, rows = devRows(); touchIdle(dt);
  if (I.pressed('cancel') || I.pressed('pause')) { d.open = false; I.consumeAll(); return; }
  const sel = i => { const r = rows[i]; return r && (r.slider || r.tool); };
  const move = dir => { let i = d.row; do { i += dir; } while (i >= 0 && i < rows.length && !sel(i)); if (i < -1) i = -1; if (i >= rows.length) i = d.row; d.row = i; sfx('tick', { vol: 1.5 }); };
  if (d.row >= 0 && !sel(d.row)) { d.row = -1; move(1); }
  if (I.repeat('up', .3, .1)) { if (d.row < 0) { } else { const was = d.row; move(-1); } }
  if (I.repeat('down', .3, .1)) { if (d.row < 0) { d.row = -1; move(1); } else move(1); }
  if (d.row === -1) { if (I.repeat('left', .3, .2)) { d.tab = (d.tab + 2) % 3; d.row = -1; sfx('tick', { vol: 1.5 }); } if (I.repeat('right', .3, .2)) { d.tab = (d.tab + 1) % 3; sfx('tick', { vol: 1.5 }); } if (I.pressed('confirm')) { d.tab = (d.tab + 1) % 3; } return; }
  const r = rows[d.row]; if (!r) return;
  if (r.slider) {
    const t = r.slider, mult = I.down('turbo') ? 5 : 1; let dir = 0;
    if (I.repeat('left', .3, .06)) dir = -1; if (I.repeat('right', .3, .06)) dir = 1;
    const m = mouseHud(), c = I.clicked && I.clicked();
    if (c && S.devSliderRect && c[1] >= S.devRowY(d.row) && c[1] < S.devRowY(d.row) + 12) { const u = clamp((c[0] - S.devSliderRect[0]) / S.devSliderRect[2], 0, 1); t.v = clamp(Math.round((t.min + u * (t.max - t.min)) / t.step) * t.step, t.min, t.max); }
    if (dir) t.v = clamp(+(t.v + dir * t.step * mult).toFixed(4), t.min, t.max);
    if (I.pressed('confirm')) t.v = t.def;
  } else if (r.tool) {
    if (I.pressed('confirm') || I.pressed('shoot') || I.pressed('right')) { r.tool.fn(); sfx('perfect', { vol: .6 }); }
  }
}
function drawDevPanel(g, r) {
  const W = r.W, H = r.H, d = S.dev, rows = devRows(), w = 240, x0 = 8, y0 = 8, vis = 12;
  panel(g, x0, y0, w, H - 16, { bg: ['#0c1a2a', '#05101c'], border: '#4ac8ff', alpha: .94 });
  DEV_TABS.forEach((t, i) => { const x = x0 + 6 + i * 74; px.rect(g, x, y0 + 4, 70, 12, i === d.tab ? (d.row === -1 ? '#ffd36a' : '#4ac8ff') : '#1a2a3a'); txt(g, t, x + 35, y0 + 6, i === d.tab ? '#05101c' : '#8ad0ff', { align: 'center', font: 'tiny', outline: false }); });
  txt(g, 'DEV MODE', x0 + w + 6, y0 + 6, '#ff9a6a', { font: 'tiny' });
  let first = Math.max(0, Math.min(d.row < 0 ? 0 : d.row - 5, rows.length - vis)); const rowH = 12;
  S.devRowY = i => y0 + 20 + (i - first) * rowH;
  for (let k = 0; k < vis && first + k < rows.length; k++) {
    const i = first + k, rw = rows[i], y = y0 + 20 + k * rowH, foc = i === d.row;
    if (rw.hdr) { txt(g, '- ' + rw.hdr, x0 + 8, y + 2, '#4ac8ff', { font: 'tiny', outline: false }); continue; }
    if (foc) px.rect(g, x0 + 3, y, w - 6, rowH - 1, '#1c4a6a');
    if (rw.slider) {
      const t = rw.slider, u = (t.v - t.min) / (t.max - t.min);
      txt(g, t.label, x0 + 8, y + 2, foc ? '#fff' : '#b8d8f0', { font: 'tiny', outline: false });
      const sx = x0 + 112, sw = 80; px.rect(g, sx, y + 4, sw, 3, '#1a3a5a'); px.rect(g, sx, y + 4, Math.round(sw * u), 3, t.v === t.def ? '#6ad8ff' : '#ffd36a'); px.rect(g, sx + Math.round(sw * u) - 1, y + 2, 3, 7, '#ffffff');
      if (foc) S.devSliderRect = [sx, y, sw];
      txt(g, String(+t.v.toFixed(2)), x0 + w - 8, y + 2, t.v === t.def ? '#8ad0ff' : '#ffd36a', { font: 'tiny', align: 'right', outline: false });
    } else if (rw.tool) {
      txt(g, rw.tool.label, x0 + 8, y + 2, foc ? '#fff' : '#b8d8f0', { font: 'tiny', outline: false });
      if (rw.tool.get) txt(g, rw.tool.get() ? 'ON' : 'off', x0 + w - 8, y + 2, rw.tool.get() ? '#6aff9a' : '#6a7a8a', { font: 'tiny', align: 'right', outline: false });
    } else if (rw.info) txt(g, rw.info, x0 + 8, y + 2, '#b8d8f0', { font: 'tiny', outline: false });
  }
  const t = rows[d.row] && rows[d.row].slider; if (t) txt(g, t.help, x0 + 8, H - 34, '#ffd36a', { font: 'tiny' }); if (t) txt(g, 'CONFIRM: default   TURBO: x5 steps', x0 + 8, H - 26, '#8ad0ff', { font: 'tiny' });
  drawPrompts(g, [['move', 'NAVIGATE'], ['confirm', 'USE'], ['cancel', 'CLOSE']], x0 + w / 2, H - 16);
}
function drawDevOverlay(g, r) {
  const B = S.ball;
  txt(g, 'ball ' + B.state + ' ' + B.x.toFixed(0) + ',' + B.y.toFixed(0) + ',' + B.z.toFixed(0), 4, r.H - 40, '#6aff9a', { font: 'tiny' });
  txt(g, 'phase ' + S.match.phase + ' fps ' + (game.fps ? game.fps.toFixed(0) : '?'), 4, r.H - 32, '#6aff9a', { font: 'tiny' });
}
/* ---- How to Play opened from the pause menu ---- */
function howUpdate(dt) { const I = game.input; S.howto.page = cycle(I, HOW.length, S.howto.page); if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('pause')) { S.howto = null; I.consumeAll(); } }
function drawHowOverlay(g, r) {
  const W = r.W, H = r.H, p = HOW[S.howto.page];
  px.blend && px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  panel(g, 14, 20, W - 28, H - 44); bigText(g, p.title, W / 2, 28, { scale: 1 });
  if (p.lines) p.lines.forEach((l, i) => txt(g, l, 28, 50 + i * 14, '#e8e4f8'));
  if (p.pad) p.pad.forEach(([ac, dd], i) => { const y = 48 + i * 18; drawGlyph(g, ac, 24, y); E.font.wrap(dd, W - 90, { font: 'tiny' }).forEach((l, k) => txt(g, l, 46, y + 2 + k * 8, '#e8e4f8', { font: 'tiny' })); });
  drawPrompts(g, [['move', 'PAGES'], ['cancel', 'BACK TO GAME']], W / 2, H - 22);
}

/* ===== 50-hub.js ===== */
/* BASKETBLAM - AI Hub integration (Session Protocol v1, parallel mode): "BLAM SHOWDOWN".
   Every player plays the same seeded game against the same CPU crew; the biggest point lead tops the scoreboard. */
const hubState = { info: null, started: false, ended: false, done: false, lastProg: 0, timeUp: false };
function hubCfg() {
  const R = HUB && window.AIHub.rng ? window.AIHub.rng('showdown') : E.rng(5);
  const home = Math.floor(R() * 3), away = [3, 4, 1, 2, 0].filter(t => t !== home)[Math.floor(R() * 4)];
  return { teams: [home, away], court: COURT_ORDER[Math.floor(R() * 4)], mode: 'hub', humans: { 0: game.input }, qLen: 32, difficulty: 'Pro', seed: ((hubState.info && hubState.info.seed) | 0) || 77, noOT: true, hub: true };
}
function hubWaiting() { return S.hub && !hubState.started && HUB; }
function hubStep(dt) {
  const M = S.match, A_ = window.AIHub; if (!M) return;
  if (hubState.ended) return;
  if (!hubState.done && M.time - hubState.lastProg > 1) { hubState.lastProg = M.time; try { A_.progress({ score: M.score[0] - M.score[1], label: 'Q' + M.quarter + ' ' + M.score[0] + '-' + M.score[1] }); } catch (e) { } }
}
function hubFinish(why) {
  if (hubState.done || !HUB) return; hubState.done = true;
  const M = S.match, me = S.players[0], diff = M ? M.score[0] - M.score[1] : 0, pts = me ? me.st.pts : 0;
  const stats = { Points: pts, Dunks: me.st.dunks, Blocks: me.st.blocks, Steals: me.st.steals, 'Style': me.st.style };
  const awards = []; if (me.st.dunks >= 3) awards.push({ title: 'Rim Wrecker', detail: me.st.dunks + ' dunks' }); if (me.st.blocks >= 2) awards.push({ title: 'Gatekeeper', detail: me.st.blocks + ' blocks' });
  try { window.AIHub.result({ score: Math.max(0, 1000 + diff * 25 + pts), stats, awards }); } catch (e) { game.fail('hub result', e); }
}
function hubPrepare(info) {
  hubState.info = info; S.hub = hubState;
  game.go('match', { hub: true }, { fade: 0 });
}
function hubConnect() {
  const A_ = window.AIHub;
  A_.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) { game.go('title'); return; }
    hubPrepare(info);
    A_.on('start', () => { hubState.started = true; });
    A_.on('time-up', () => { hubState.timeUp = true; if (S.match && !S.match.over) { S.match.over = false; } hubFinish('timeup'); });
    A_.on('end', () => { hubState.ended = true; hubState.done = true; try { game.audio.mute && !game.audio.muted && game.audio.mute(); crowdStop(); music(null); } catch (e) { } game.input.consumeAll(); });
    A_.on('leave', () => { });
    A_.ready();
  }).catch(e => { game.fail('hub connect', e); game.go('title'); });
}
scenes.hubwait = {
  view: 'broadcast', input: KEYS, res: 'ps1', enter() { L.enabled = false; },
  update() { }, draw(r) { r.sky(['#0a0620', '#2a0f48', '#7a1a50']); r.overlay(g => { bigText(g, 'BASKETBLAM', r.W / 2, r.H / 2 - 20, { scale: 4 }); txt(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2 + 24, '#ffe8c8', { align: 'center' }); }); }
};

/* ===== 90-start.js ===== */
/* BASKETBLAM - scene table, pause items, debug handle, start */
uiHooks.pauseItems = () => {
  if (game.sceneName !== 'match') return [];
  const items = [['How to Play', () => { game.resume(); S.howto = { page: 0 }; }]];
  if (S.mode !== 'camp') items.push(['Restart Game', () => { game.resume(); newMatch(Object.assign({}, S.cfg, { seed: undefined })); music(courtDef().music); }]);
  if (S.mode === 'camp') items.push(['Restart Lesson', () => { game.resume(); lessonSetup(); }]);
  items.push(['Dev Mode', () => { game.resume(); S.dev.open = true; S.dev.tab = 0; S.dev.row = -1; }]);
  return items;
};
scenes.hubwait.enter = scenes.hubwait.enter;
loadTuning();

const snapshot = () => {
  const M = S.match, B = S.ball;
  return {
    scene: game.sceneName, mode: S.mode, court: S.court, phase: M && M.phase, quarter: M && M.quarter, clock: M && +M.clock.toFixed(2), shotClock: M && +M.shotClock.toFixed(2), score: M && M.score.slice(), possession: M && M.possession,
    ball: B && { x: +B.x.toFixed(1), y: +B.y.toFixed(1), z: +B.z.toFixed(1), state: B.state, owner: B.owner ? B.owner.slot : null },
    players: S.players.map(p => ({ slot: p.slot, id: p.name, team: p.team, x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), state: p.act ? p.act.type : p.stun > 0 ? 'down' : 'free', turbo: +p.turbo.toFixed(2), nova: novaOf(p), powerup: p.pu, source: p.input ? 'human' : 'cpu' })),
    lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName, dev: S.dev.open }, attract: { segment: attractN }, net: { role: S.hub ? 'parallel' : 'none' }
  };
};
game.debug = {
  snapshot,
  teleport(slot, x, y) { const p = S.players[slot]; p.x = x; p.y = y; },
  give(slot) { giveBall(S.players[slot]); },
  setScore(a, b) { S.match.score = [a, b]; },
  setClock(s) { S.match.clock = s; },
  setQuarter(q) { S.match.quarter = q; },
  force(name, ...args) { const f = { shatter: () => shatterBoard(HOOPS[1]), nova: t => { S.match.novaT[t || 0] = 40; }, powerup: (id, x, y) => S.powerups.push({ id, x, y, t: 0, life: 14 }), end: () => endGame(), quarterEnd: () => endQuarter() }[name]; return f && f(...args); },
  go(scene, data) { game.go(scene, data, { fade: 0 }); },
  spawnPowerup(id, x, y) { S.powerups.push({ id, x, y, t: 0, life: 14 }); },
  cheat(name, on) { S.cheats[name] = on; },
  tune(k, v) { if (TUNING[k]) TUNING[k].v = v; }
};
const __bb = { S, game, TUNING, TEAMS, COURTS, DUNKS, COURT, HOOPS, LESSONS, emit, on, newMatch, matchStep, cmdFor, aiCmd, resetTuning, tune, store, scenes, snapshot, debug: game.debug, giveBall, startTour, startCamp, startExhibition, setupState, hubState, hubFinish, rigState, finishMatch, resultsFor: () => resultsFor, NOCMD, startDunk, startJump, passTo, throwOop, startSwipe, startShove, startSpin, camp: () => camp, lessonSetup, devRows, DEV_TOOLS, SONGS, SFX, LINES, TOUR, announce, babble, VOICES, KEYS };
if (typeof globalThis !== 'undefined') globalThis.__bb = __bb;
if (HAS_WIN) window.__bb = __bb;

const hash = (HAS_WIN && window.location && window.location.hash || '').slice(1).split('/');
let first = HUB ? 'hubwait' : 'title', firstData;
if (!HUB && hash[0]) {
  if (hash[0] === 'attract') first = 'attract';
  else if (hash[0] === 'exhibition') { first = 'match'; firstData = { cfg: { teams: [TEAM_BY_ID[hash[2] && hash[2].split('-')[0]] ? TEAM_BY_ID[hash[2].split('-')[0]].idx : 0, TEAM_BY_ID[hash[2] && hash[2].split('-')[1]] ? TEAM_BY_ID[hash[2].split('-')[1]].idx : 1], court: COURTS[hash[1]] ? hash[1] : 'alley', mode: 'exhibition', humans: { 0: game.input }, qLen: 60, difficulty: 'Pro' } }; }
  else if (hash[0] === 'dev') { first = 'match'; firstData = { cfg: { teams: [0, 1], court: 'alley', mode: 'exhibition', humans: { 0: game.input }, qLen: 60, difficulty: 'Pro' } }; }
  else if (hash[0] === 'camp') { first = 'match'; firstData = { camp: true }; }
  else if (hash[0] === 'tour') { first = 'tourmap'; firstData = { team: 0, stop: clamp((+hash[1] || 1) - 1, 0, 3), phase: 'pre' }; }
  else if (scenes[hash[0]]) first = hash[0];
  else if (hash[0] === 'about') first = 'credits';
}
game.start({ scene: first, data: firstData, scenes: Object.assign({}, scenes), boot: { title: 'BASKETBLAM', steps: [['Waxing the court', () => { getCourtMap('alley'); }], ['Inflating the ball', () => { }]] } });
if (hash[0] === 'dev' && !HUB) S.dev.open = true;
if (HUB) hubConnect();

})();
