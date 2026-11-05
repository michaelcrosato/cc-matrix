(() => {
'use strict';
/* ---- 00-core.js ---- */
/* ZONEFIRE — an over-the-top 2-on-2 arcade basketball demo on my-3D2dge (v0.85.2).
 * Fragments in src/ are concatenated in name order into one IIFE by tools/build.mjs. This one holds the engine alias,
 * the constants of the court (plan §6.1), the input preset (§6.2), the shared state, the event bus, the registries and
 * the one game object. Systems read registries; content never edits systems; anything a test needs is on window.__bb. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const HUB = !!(window.AIHub && AIHub.active);            // true from the first line inside a hub session

/* ---- the court's geometry (world units; one tile = 16; z up). Court-local (cx, cy): x 0..640 baseline to baseline,
 * y 0..288 far sideline to near sideline. World = court-local + (OX, OY). ---- */
const TILE = 16, OX = 64, OY = 112, CW = 640, CH = 288, MIDX = 320, MIDY = 144;
const RIM = [{ x: 52, y: 144, z: 80 }, { x: 588, y: 144, z: 80 }];   // rim centres, court-local
const RIM_R = 9, RIM_TUBE = 1.2, BALL_R = 4.5, BOARD_X = [40, 600], BOARD_Y = [120, 168], BOARD_Z = [72, 100];
const WALL_OUT = 24;                                       // invisible walls outside the lines
const WORLD_W = 768, WORLD_H = 448;                        // the arena map, 48 x 28 tiles

/* ---- the input preset (plan §6.2): the engine's DEFAULT without attack, dash, skill and jump ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE', 'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'],
  shove: ['KeyQ', 'KeyL', 'Pad1'], oop: ['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'],
  card: ['KeyT', 'Pad3']   // the hub's card: more time (the triangle, or T); Enter is ready (confirm)
});
delete KEYS.attack; delete KEYS.dash; delete KEYS.skill; delete KEYS.jump;
const ACTION_NAMES = { shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call', taunt: 'Taunt' };

/* the scene table: every fragment registers its scenes here (the engine's game.start takes it in 90-start) */
const scenes = {};

/* ---- the shared state (plan §4.4). Match fields are reset by the match module; progress by the Tour and records ---- */
const S = {
  scene: 'boot', mode: 'exhibition', court: 'skybox', teams: [null, null], players: [], ball: null,
  match: null, twist: {}, powerups: [], cheats: {}, rng: E.rng(1), fxRng: E.rng(2), events: [], seq: 0,
  menu: {}, progress: null, lastEvent: null, notes: [], seed: 1
};

/* ---- the event bus: emit(type, data) delivers at once to every listener, and keeps the last 64 for debug and the net ---- */
const LISTENERS = Object.create(null);
const on = (type, fn) => { (LISTENERS[type] || (LISTENERS[type] = [])).push(fn); };
const emit = (type, data = {}) => {
  const ev = Object.assign({ type, id: ++S.seq, t: S.match ? S.match.clock : 0 }, data);
  S.events.push(ev); if (S.events.length > 64) S.events.shift();
  S.lastEvent = ev;
  for (const fn of LISTENERS[type] || []) { try { fn(ev); } catch (err) { game.fail('event ' + type, err); } }
  for (const fn of LISTENERS['*'] || []) { try { fn(ev); } catch (err) { game.fail('event ' + type, err); } }
  return ev;
};

/* ---- the registries: def('team', id, data), get(kind, id), all(kind). A content entry is data; the lint checks it ---- */
const REG = Object.create(null);
const def = (kind, id, data) => { (REG[kind] || (REG[kind] = new Map())).set(id, Object.assign({ id }, data)); return REG[kind].get(id); };
const get = (kind, id) => (REG[kind] && REG[kind].get(id)) || null;
const all = kind => (REG[kind] ? [...REG[kind].values()] : []);

/* ---- saved data: the progress record and the tuning (plan §4.8) ---- */
const PROGRESS_DEFAULT = () => ({ tour: null, unlocked: { bots: false, allstars: false, bigHeads: false }, camp: [], records: { mostPoints: 0, bestDunk: null, toursWon: 0 }, hall: [] });
const loadProgress = () => { const p = E.store.get('bb:progress', null); S.progress = Object.assign(PROGRESS_DEFAULT(), p || {}); S.progress.unlocked = Object.assign(PROGRESS_DEFAULT().unlocked, (p && p.unlocked) || {}); return S.progress; };
const saveProgress = () => E.store.set('bb:progress', S.progress);
if (!S.progress) loadProgress();

/* ---- the game object: one E.Game for the page; the title, menus, matches and attract all share it ---- */
const GAME_SETTINGS = [
  { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'difficulty', label: 'CPU difficulty', options: ['Rookie', 'Pro', 'All-Star', 'BLAM'], value: 'Pro' },
  { key: 'quarter', label: 'Quarter length', options: ['1:00', '1:30', '2:00', '3:00'], value: '2:00' },
  { key: 'powerups', label: 'Power-ups', options: ['On', 'Off'], value: 'On' },
  { key: 'twists', label: 'Court twists', options: ['On', 'Off'], value: 'On' },
  { key: 'jackpot', label: 'Jackpot Spot on every court', options: ['Off', 'On'], value: 'Off' },
  { key: 'comeback', label: 'Comeback assist', options: ['Off', 'Low', 'Normal'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', options: ['Full', 'Big plays', 'Off'], value: 'Full' },
  { key: 'voiceVol', label: 'Voice volume', type: 'slider', value: 1, min: 0, max: 1, step: .1 },
  { key: 'camera', label: 'Camera', options: ['Broadcast', 'High'], value: 'Broadcast' },
  { key: 'shotMeter', label: 'Shot meter', options: ['On', 'Off'], value: 'On' },
  { key: 'bigHeads', label: 'Big heads', options: ['Off', 'On'], value: 'Off' }
];
const COMMENTARY_LEVEL = () => ({ Full: 2, 'Big plays': 1, Off: 0 })[(game.settings && game.settings.commentary) || 'Full'];
const setting = k => (game.settings && game.settings[k]) || null;
const dsp = () => game.input.lastDevice === 'gamepad' && setting('buttons') === 'Xbox' ? 'xbox' : 'playstation';

/* the broadcast camera (plan §2): yaw 0, pitch 30, one screen pixel per world unit; 'threequarter' is the High option */
const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1);
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: [BROADCAST, 'threequarter'], bg: '#05040a', id: 'basketblam',
  input: KEYS, autoPause: !HUB,
  menu: HUB ? false : { items: () => pauseItems(), settings: GAME_SETTINGS, controls: ACTION_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;   // the engine's systems, short names for the fragments

/* ---- 01-tuning.js ---- */
/* ---- TUNING (plan §4.7, Appendix A): the important numbers. Every one is a live dev slider; systems read tune(key) every
 * time, never cache it. resetTuning() restores the defaults; the dev panel can save its values as the player's own. ---- */
const TUNING_GROUPS = [
  ['Movement', [
    ['runSpeed', 'Run speed', 108, 60, 160, 1, 'units a second, before ZOOM'],
    ['accel', 'Acceleration', 900, 300, 2000, 10, 'units a second squared'],
    ['turboMult', 'Turbo speed', 1.5, 1.0, 2.2, .05, 'a multiple while turbo is held'],
    ['turboDrain', 'Turbo drain', .30, .05, .8, .01, 'per second held and moving'],
    ['turboRefill', 'Turbo refill', .20, .05, .8, .01, 'per second'],
    ['turboRefillDelay', 'Turbo refill delay', .35, 0, 1.5, .01, 'seconds after letting go'],
    ['playerGravity', 'Player gravity', 900, 500, 1500, 10, 'units a second squared'],
    ['jumpShotVz', 'Jump speed', 250, 150, 400, 5, 'before SWAT']
  ]],
  ['Shooting', [
    ['shotSkill', 'Shot skill', 1.0, .4, 1.6, .02, 'a multiple of every make chance'],
    ['threeSkill', 'Three-point skill', 1.0, .4, 1.6, .02, 'a multiple of the three chance'],
    ['perfectWindow', 'Perfect window', .10, .03, .30, .005, 'seconds, full width'],
    ['perfectBonus', 'Perfect bonus', .15, 0, .4, .01, 'added to a perfect release'],
    ['badReleasePenalty', 'Bad release penalty', .30, 0, .6, .01, 'lost for an early or late release'],
    ['contestPenalty', 'Contest penalty', .40, 0, .8, .01, 'lost to an airborne defender'],
    ['shotArc', 'Shot arc', 1.0, .6, 1.6, .02, 'a multiple of the apex height']
  ]],
  ['Dunks and blocks', [
    ['dunkRange', 'Dunk range', 150, 60, 300, 2, 'from the rim, before SLAM'],
    ['dunkGravity', 'Dunk gravity', 520, 300, 900, 5, 'units a second squared'],
    ['dunkApex', 'Dunk apex', 1.0, .5, 2.0, .02, 'a multiple of the dunk arc height'],
    ['dunkHang', 'Dunk hang', 1.0, .5, 2.0, .02, 'a multiple of the flight time'],
    ['dunkSlowMo', 'Dunk slow motion', .45, .1, 1.0, .01, 'time scale at the apex (1 = off)'],
    ['blockReach', 'Block reach', 14, 6, 30, .5, 'before SWAT'],
    ['blockChance', 'Block chance', 1.0, 0, 2, .02, 'a multiple'],
    ['shatterChance', 'Shatter chance', 1.0, 0, 5, .05, 'a multiple of the glass chances']
  ]],
  ['Defense', [
    ['stealChance', 'Steal chance', .30, 0, .9, .01, 'per attempt'],
    ['stealReach', 'Steal reach', 18, 8, 36, .5, 'units'],
    ['stealCooldown', 'Steal cooldown', .6, .1, 2, .05, 'seconds'],
    ['shoveForce', 'Shove force', 220, 60, 500, 5, 'units a second'],
    ['shoveCost', 'Shove cost', .25, 0, .8, .01, 'turbo'],
    ['shoveCooldown', 'Shove cooldown', 1.0, .2, 3, .05, 'seconds'],
    ['shoveFumble', 'Shove fumble', .6, 0, 1, .02, 'chance a handler drops it'],
    ['knockdownTime', 'Knockdown time', .8, .2, 2, .02, 'seconds'],
    ['spinCost', 'Spin cost', .2, 0, .6, .01, 'turbo'],
    ['spinCooldown', 'Spin cooldown', 1.5, .3, 4, .05, 'seconds']
  ]],
  ['Supernova', [
    ['novaBaskets', 'Baskets to ignite', 3, 2, 6, 1, 'in a row'],
    ['novaMaxBaskets', 'Baskets before it ends', 4, 1, 10, 1, 'more baskets'],
    ['novaTime', 'Supernova time', 40, 10, 120, 1, 'seconds of game clock'],
    ['novaShotBonus', 'Supernova shot bonus', .25, 0, .6, .01, 'added to every shot']
  ]],
  ['CPU', [
    ['cpuSkill', 'CPU skill', 0, -.5, .5, .01, 'an offset on decision quality'],
    ['cpuReaction', 'CPU reaction', 1.0, .25, 3, .05, 'a multiple of reaction delays'],
    ['cpuAggression', 'CPU aggression', 1.0, 0, 2, .02, 'a multiple of steal and shove rates'],
    ['comeback', 'Comeback assist', .35, 0, 1, .01, 'the trailing team bonus']
  ]],
  ['Match', [
    ['quarterLength', 'Quarter length', 120, 20, 300, 5, 'seconds (Exhibition 120, Tour 90, hub halves 90)'],
    ['shotClock', 'Shot clock', 20, 8, 30, 1, 'seconds'],
    ['gameSpeed', 'Game speed', 1.0, .5, 1.5, .05, 'game.timeScale outside effects'],
    ['fatigue', 'Fatigue', 1.0, 0, 3, .05, 'a multiple of juice loss']
  ]],
  ['Physics', [
    ['ballGravity', 'Ball gravity', 760, 400, 1200, 5, 'units a second squared'],
    ['ballBounce', 'Ball bounce', .62, .3, .9, .01, 'on the floor'],
    ['rimBounce', 'Rim bounce', .45, .2, .8, .01, 'off the ring'],
    ['boardBounce', 'Board bounce', .55, .2, .9, .01, 'off the glass']
  ]],
  ['Courts', [
    ['powerupInterval', 'Power-up interval', 22, 6, 60, 1, 'seconds (± 6)'],
    ['hazardInterval', 'Twist timers', 1.0, .25, 4, .05, 'a multiple of the twist timers'],
    ['windStrength', 'Wind strength', 140, 0, 300, 5, 'units a second squared at full gust'],
    ['jackpotBonus', 'Jackpot bonus', 2, 0, 5, 1, 'points']
  ]]
];
const TUNING = {};
for (const [group, rows] of TUNING_GROUPS) for (const [key, label, def, min, max, step, help] of rows) TUNING[key] = { v: def, def, min, max, step, group, label, help };
const tune = key => (TUNING[key] ? TUNING[key].v : 1);
const setTune = (key, v) => { const t = TUNING[key]; if (!t) return; t.v = clamp(+v, t.min, t.max); return t.v; };
const resetTuning = () => { for (const t of Object.values(TUNING)) t.v = t.def; return true; };
const saveTuning = () => E.store.set('bb:tuning', Object.fromEntries(Object.entries(TUNING).map(([k, t]) => [k, t.v])));
const loadTuning = () => { const saved = E.store.get('bb:tuning', null); if (saved) for (const [k, v] of Object.entries(saved)) if (TUNING[k]) setTune(k, v); };
loadTuning();

/* ---- 02-data-teams.js ---- */
/* ---- TEAMS AND PLAYERS (plan §10.2). Ratings are in the order ZOOM / SPLASH / DEEP / SLAM / DIME / SWIPE / SWAT / BUMP,
 * each 1..10. Each player is data: a rig's build and dress, a voice profile and a taunt. ---- */
const RATING_KEYS = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const ratingsOf = arr => Object.fromEntries(RATING_KEYS.map((k, i) => [k, arr[i]]));

def('team', 'hightops', { name: 'NEON HEIGHTS HIGHTOPS', short: 'HIGHTOPS', colors: { jersey: '#ff3ca6', trim: '#2de2ff', shorts: '#1a1420', sneaker: '#f4f4f4', sock: '#2de2ff' }, logo: 'sneaker', court: 'skybox', locked: false, players: ['volt', 'bigrumble', 'pixel'], style: 'flashy, fast, high-flying' });
def('team', 'breakers', { name: 'BOARDWALK BREAKERS', short: 'BREAKERS', colors: { jersey: '#18c8b8', trim: '#ff7a5c', shorts: '#f2d8a0', sneaker: '#f4f4f4', sock: '#ff7a5c' }, logo: 'wave', court: 'pier', locked: false, players: ['riptide', 'shellshock', 'longboard'], style: 'passing and threes' });
def('team', 'crushers', { name: 'SCRAPYARD CRUSHERS', short: 'CRUSHERS', colors: { jersey: '#d8641e', trim: '#ffd23a', shorts: '#1c1a18', sneaker: '#c8c8c8', sock: '#ffd23a' }, logo: 'wrench', court: 'scrapyard', locked: false, players: ['torque', 'sparkplug', 'hubcap'], style: 'power and steals' });
def('team', 'magma', { name: 'KABOOM MAGMA', short: 'MAGMA', colors: { jersey: '#ff3a1a', trim: '#ffb020', shorts: '#22181e', sneaker: '#f4f4f4', sock: '#ffb020' }, logo: 'volcano', court: 'caldera', locked: false, players: ['obsidian', 'ember', 'pumice'], style: 'defense and clutch shooting' });
def('team', 'blambots', { name: 'THE BLAMBOTS', short: 'BLAMBOTS', colors: { jersey: '#c8d0dc', trim: '#e8c040', shorts: '#3a4250', sneaker: '#2a2e38', sock: '#e8c040' }, logo: 'fist', court: 'dome', locked: true, players: ['dunkatron', 'swatbot', 'spareparts'], style: 'everything, loudly', boss: true });
def('team', 'allstars', { name: 'CHANNEL BLAM ALL-STARS', short: 'ALL-STARS', colors: { jersey: '#f4f0ea', trim: '#ffc83a', shorts: '#4a2a8a', sneaker: '#ffc83a', sock: '#4a2a8a' }, logo: 'mic', court: 'dome', locked: true, players: ['vinnie', 'deedee', 'blammo'], style: 'showbiz', secret: true });

const RIG = (size, build, hair, hairColor, skin, extra = {}) => Object.assign({ size, build, hair, hairColor, skin }, extra);
def('player', 'volt', { name: 'VOLT', team: 'hightops', number: 7, role: 'high-flyer', ratings: ratingsOf([9, 5, 4, 9, 6, 6, 4, 3]), rig: RIG(1.65, 'heroic', 'ponytail', '#3ab0ff', '#8a5a3c', { hat: { style: 'band', color: '#ff3ca6' } }), voice: 'volt', taunt: 'raiseRoof', celebrations: ['raiseRoof', 'airplane', 'pointSky'], barks: ['Too slow!', 'Catch me!', 'Bounce this!'] });
def('player', 'bigrumble', { name: 'BIG RUMBLE', team: 'hightops', number: 34, role: 'enforcer', ratings: ratingsOf([3, 3, 1, 7, 4, 4, 9, 10]), rig: RIG(1.9, 'bulky', 'flattop', '#1a1a1a', '#4a2c1e', { hat: null }), voice: 'rumble', taunt: 'flex', celebrations: ['flex', 'chestPound'], barks: ['Move.', 'Get outta my way.'] });
def('player', 'pixel', { name: 'PIXEL', team: 'hightops', number: 3, role: 'sharpshooter', ratings: ratingsOf([6, 9, 9, 3, 7, 5, 3, 3]), rig: RIG(1.55, 'heroic', 'mohawk', '#3ce07a', '#f0c8a0', { shades: true }), voice: 'pixel', taunt: 'fingerGuns', celebrations: ['fingerGuns', 'pointSky'], barks: ['Pew pew!', 'Nothing but net!'] });
def('player', 'riptide', { name: 'RIPTIDE', team: 'breakers', number: 22, role: 'point guard', ratings: ratingsOf([10, 6, 6, 5, 10, 7, 2, 3]), rig: RIG(1.6, 'heroic', 'long', '#e8c880', '#d8a070', {}), voice: 'riptide', taunt: 'surfBalance', celebrations: ['surfBalance', 'airplane'], barks: ['Chill, dude.', 'Totally gnarly!'] });
def('player', 'shellshock', { name: 'SHELLSHOCK', team: 'breakers', number: 11, role: 'three-point bomber', ratings: ratingsOf([6, 8, 10, 3, 6, 5, 3, 4]), rig: RIG(1.65, 'heroic', 'afro', '#ff7a5c', '#6a4028', { goggles: true }), voice: 'shellshock', taunt: 'goggles', celebrations: ['goggles', 'pointSky'], barks: ['Hey hey!', 'From downtown!'] });
def('player', 'longboard', { name: 'LONGBOARD', team: 'breakers', number: 50, role: 'shot blocker', ratings: ratingsOf([4, 5, 2, 7, 4, 3, 9, 7]), rig: RIG(1.85, 'heroic', 'bald', '#18c8b8', '#c89070', { legs: 1.12 }), voice: 'longboard', taunt: 'fingerWag', celebrations: ['chestPound', 'pointSky'], barks: ['Not today.', 'Sit down.'] });
def('player', 'torque', { name: 'TORQUE', team: 'crushers', number: 4, role: 'power dunker', ratings: ratingsOf([6, 4, 2, 10, 4, 4, 6, 9]), rig: RIG(1.85, 'bulky', 'mohawk', '#1a1a1a', '#c8a080', {}), voice: 'torque', taunt: 'chestPound', celebrations: ['chestPound', 'flex'], barks: ['Crush it!', 'Lunch.'] });
def('player', 'sparkplug', { name: 'SPARKPLUG', team: 'crushers', number: 13, role: 'pickpocket', ratings: ratingsOf([9, 6, 6, 4, 7, 10, 2, 2]), rig: RIG(1.65, 'chibi', 'short', '#f0d020', '#3a2418', { cap: '#f0d020' }), voice: 'sparkplug', taunt: 'shimmy', celebrations: ['shimmy', 'airplane'], barks: ['Mine now!', 'Got it!'] });
def('player', 'hubcap', { name: 'HUBCAP', team: 'crushers', number: 9, role: 'veteran all-rounder', ratings: ratingsOf([5, 7, 6, 6, 6, 6, 6, 6]), rig: RIG(1.7, 'heroic', 'short', '#8a8a8a', '#e0b090', {}), voice: 'hubcap', taunt: 'watchTap', celebrations: ['watchTap', 'flex'], barks: ['Back in my day...', 'Kids.'] });
def('player', 'obsidian', { name: 'OBSIDIAN', team: 'magma', number: 0, role: 'rim protector', ratings: ratingsOf([4, 4, 1, 8, 3, 4, 10, 8]), rig: RIG(1.95, 'bulky', 'bald', '#1a0e0a', '#3a2216', {}), voice: 'obsidian', taunt: 'crossArms', celebrations: ['crossArms', 'flex'], barks: ['Stone.', 'Respect the mountain.'] });
def('player', 'ember', { name: 'EMBER', team: 'magma', number: 21, role: 'clutch shooter', ratings: ratingsOf([7, 9, 8, 5, 6, 6, 3, 3]), rig: RIG(1.6, 'heroic', 'long', '#c8402a', '#f0c090', {}), voice: 'ember', taunt: 'blowFingers', celebrations: ['blowFingers', 'pointSky'], barks: ['Burn!', 'Warm hands.'] });
def('player', 'pumice', { name: 'PUMICE', team: 'magma', number: 88, role: 'leaper', ratings: ratingsOf([8, 5, 3, 9, 5, 5, 7, 3]), rig: RIG(1.65, 'heroic', 'afro', '#1a1010', '#8a5030', {}), voice: 'pumice', taunt: 'pogo', celebrations: ['pogo', 'raiseRoof'], barks: ['Boing!', 'Up here!'] });
def('player', 'dunkatron', { name: 'DUNKATRON', team: 'blambots', number: 1, role: 'destroyer', ratings: ratingsOf([8, 6, 4, 10, 6, 8, 8, 8]), rig: RIG(1.95, 'bulky', null, null, '#c8d0dc', { robot: 'chrome', visor: '#ff2a1a' }), voice: 'dunkatron', taunt: 'robotDance', celebrations: ['robotDance', 'robotPop'], barks: ['BALL. ACQUIRED.', 'DUNK. DELETED.'], boss: true });
def('player', 'swatbot', { name: 'SWATBOT', team: 'blambots', number: 2, role: 'wall', ratings: ratingsOf([6, 7, 7, 7, 7, 9, 10, 9]), rig: RIG(1.95, 'bulky', null, null, '#c8d0dc', { robot: 'chrome', visor: '#ff2a1a' }), voice: 'swatbot', taunt: 'processing', celebrations: ['robotPop', 'robotDance'], barks: ['BLOCK. BLOCK.', 'TRASH. TALK.'], boss: true });
def('player', 'spareparts', { name: 'SPARE PARTS', team: 'blambots', number: 3, role: 'bench unit', ratings: ratingsOf([6, 6, 6, 6, 6, 6, 6, 6]), rig: RIG(1.8, 'bulky', null, null, '#a0a8b8', { robot: 'mismatch', visor: '#50ffb0' }), voice: 'spareparts', taunt: 'glitchWave', celebrations: ['glitchWave', 'robotPop'], barks: ['ERR0R.', 'R3BOOT?'], boss: true });
def('player', 'vinnie', { name: 'VINNIE VOX', team: 'allstars', number: 0, role: 'play-by-play man', ratings: ratingsOf([5, 7, 7, 5, 8, 5, 4, 5]), rig: RIG(1.7, 'heroic', 'short', '#2a1a10', '#e8b890', { headset: true }), voice: 'vinnie', taunt: 'micDrop', celebrations: ['micDrop', 'pointSky'], barks: ['BANG!', 'YOU HEARD IT!'], secret: true });
def('player', 'deedee', { name: 'DEE DEE DECIBEL', team: 'allstars', number: 8, role: 'color commentator', ratings: ratingsOf([7, 8, 6, 6, 7, 6, 5, 4]), rig: RIG(1.6, 'heroic', 'ponytail', '#8a2aa0', '#6a4030', {}), voice: 'deedee', taunt: 'pointCam', celebrations: ['pointCam', 'raiseRoof'], barks: ['WOW!', 'SWEET!'], secret: true });
def('player', 'blammo', { name: 'BLAMMO', team: 'allstars', number: 99, role: "the league's gorilla mascot", ratings: ratingsOf([7, 3, 1, 10, 3, 6, 9, 10]), rig: RIG(2.0, 'bulky', 'short', '#3a2e2a', '#3a2e2a', { hunch: .2, gorilla: true }), voice: 'blammo', taunt: 'chestDrum', celebrations: ['chestDrum', 'flex'], barks: ['OOH OOH!', 'MINE!'], secret: true });

/* the story's characters (not playable): they stand on the stage and speak; their rigs are dressed in the story module */
def('character', 'gigawatt', { name: 'COMMISSIONER GIGAWATT', role: 'CEO of GLOBO-BLAM Corp', voice: 'gigawatt', rig: { size: 1.6, build: 'heroic', hair: 'short', hairColor: '#f4f4f8', skin: '#e8c8a0', coat: '#6a3aa0', belt: '#e8c040' } });
def('character', 'roscoe', { name: 'REF ROSCOE', role: 'referee', voice: 'roscoe', rig: { size: 1.7, build: 'heroic', hair: 'short', hairColor: '#1a1a1a', skin: '#8a5a3c', shirt: '#f4f4f4', trim: '#1a1a1a' } });
def('character', 'intern1', { name: 'INTERN 1', role: 'camp partner', voice: 'intern', rig: { size: 1.6, build: 'heroic', hair: 'short', hairColor: '#7a4a2a', skin: '#e0b090', shirt: '#9a9aa6' } });
def('character', 'intern2', { name: 'INTERN 2', role: 'camp partner', voice: 'intern', rig: { size: 1.6, build: 'chibi', hair: 'spiky', hairColor: '#2a2a2a', skin: '#c89070', shirt: '#9a9aa6' } });
def('character', 'cleanbot', { name: 'CLEANING BOT', role: 'glass replacer', voice: 'cleanbot', rig: null });

/** a player's data by id (the registry) and its team's */
const playerDef = id => get('player', id);
const teamDef = id => get('team', id);
/** the roster of a team in playing order (the starters first): the teams' players, minus the locked ones until unlocked */
const rosterOf = teamId => { const t = teamDef(teamId); return t ? t.players.map(playerDef).filter(Boolean) : []; };

/* ---- 03-data-courts.js ---- */
/* ---- COURTS (plan §10.1): each court is one data entry. The painter, the backdrop, the crowd's colors, the lights, the
 * ambient light, the dribble sound, the song and the twist are the court's; the arena and the systems are shared. ---- */
const LOGO_SNEAKER = [
  '..........', '.wwwwwwww.', 'wwwwwwwwww', 'wwwwwwwwww', '..wwwwwwww', '....wwwwww', '..wwwwwwww', 'wwwwwwwwww', '.wwwwwwww.', '..........'
];
/** a logo mask for a floor: the string rows scaled x4 into the centre of the court (court-local units), a colour per letter */
const logoAt = (rows, cx, cy, scale, colors) => (lx, ly) => {
  const w = rows[0].length * scale, h = rows.length * scale, u = Math.floor((lx - (cx - w / 2)) / scale), v = Math.floor((ly - (cy - h / 2)) / scale);
  if (u < 0 || v < 0 || u >= rows[0].length || v >= rows.length) return null;
  const ch = rows[v][u];
  return ch === '.' || ch === ' ' ? null : colors[ch] || colors.w;
};
const rgbOf = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const COURT_FLOOR = (base, dark, out, line, three) => ({
  out: rgbOf(out), line: rgbOf(line), three: rgbOf(three),
  base: (lx, ly, n, m) => { const k = Math.floor(lx / 48) % 2 ? 1 : 0, g = 1 + (k ? .06 : -.02) + n * .08 + m * .06; const c = rgbOf(base); return [c[0] * g, c[1] * g, c[2] * g]; }
});

const COURTS = {};
const courtDef = (id, d) => { COURTS[id] = Object.assign({ id }, d); return COURTS[id]; };

courtDef('skybox', {
  name: 'THE SKYBOX', home: 'hightops', song: 'skybox', dribble: 'dribble_asphalt', twist: 'jackpot',
  floor: COURT_FLOOR('#1c1a2e', '#14122a', '#2de2ff', '#ff3ca6', '#2de2ff'),
  logoMask: logoAt(LOGO_SNEAKER, 320, 144, 4, { w: [255, 255, 255], '.': null }),
  stand: { low: '#2a2440', mid: '#312a4c', high: '#3a3258', back: '#1d1836', top: '#4a4068' },
  outside: '#0c0a18', ambient: .45, sky: ['#07061a', '#1d1240', '#3a1a5a'], stars: 60, moon: { x: .82, y: .18, r: 10, color: '#f4e8ff' },
  crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a'], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'],
  lights: [[52, 0, 150, 180, .9, '#fff0d0'], [588, 0, 150, 180, .9, '#fff0d0'], [52, 288, 150, 180, .9, '#fff0d0'], [588, 288, 150, 180, .9, '#fff0d0']]
});

courtDef('pier', {
  name: 'THE PIER', home: 'breakers', song: 'pier', dribble: 'dribble_planks', twist: 'wind',
  floor: { out: rgbOf('#f2e0b0'), line: rgbOf('#ffffff'), three: rgbOf('#ffffff'), base: (lx, ly, n, m) => { const plank = Math.floor(ly / 12) % 2 ? 1 : 0, g = 1 + plank * .07 + n * .1 + m * .06, c = rgbOf('#b8844a'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['..aaaa..', '.aa..aa.', 'aaaaaaaa', '.aaaaaa.', '..aaaa..'], 320, 144, 4, { a: [40, 160, 220], '.': null }),
  stand: { low: '#d8b080', mid: '#c89a64', high: '#b88a58', back: '#a07448', top: '#e8c8a0' },
  outside: '#2a4a6a', ambient: .8, sky: ['#2a1a4a', '#ff7a5c', '#ffd27a'], stars: 0, moon: { x: .5, y: .6, r: 18, color: '#ffe4a0' },
  crowd: ['#ff5a8a', '#ffd23a', '#3ab0ff', '#ffffff'], skin: ['#f0c8a0', '#d8a070', '#a86a40'],
  lights: [[52, 0, 150, 200, .8, '#ffd0a0'], [588, 288, 150, 200, .8, '#ffd0a0']]
});
courtDef('scrapyard', {
  name: 'THE SCRAPYARD', home: 'crushers', song: 'scrapyard', dribble: 'dribble_concrete', twist: 'slick',
  floor: { out: rgbOf('#ffd23a'), line: rgbOf('#ffd23a'), three: rgbOf('#ffd23a'), base: (lx, ly, n, m) => { const g = .7 + n * .16 + m * .18, c = rgbOf('#4a4640'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['.wwwwww.', 'ww.ww.ww', '.wwwwww.', '...ww...', '.wwwwww.', 'ww.ww.ww'], 320, 144, 4, { w: [240, 200, 60] }),
  stand: { low: '#4a3a2a', mid: '#5a4632', high: '#6a5238', back: '#3a2c20', top: '#7a6040' },
  outside: '#2a2420', ambient: .6, sky: ['#120e1a', '#4a2e36', '#b0603a'], stars: 0, moon: null,
  crowd: ['#2a5ab8', '#ffd23a', '#d8641e', '#7a7a7a'], skin: ['#e0b090', '#a87050', '#6a4028'],
  lights: [[120, 0, 120, 160, .6, '#ffb070'], [520, 288, 120, 160, .6, '#ffb070']]
});
courtDef('caldera', {
  name: 'THE CALDERA', home: 'magma', song: 'caldera', dribble: 'dribble_stone', twist: 'eruption',
  floor: { out: rgbOf('#ffb020'), line: rgbOf('#ffb020'), three: rgbOf('#ffb020'), base: (lx, ly, n, m) => { const seam = (Math.floor(lx / 24) + Math.floor(ly / 24)) % 2 ? 1 : 0, g = .6 + seam * .15 + n * .08; const c = rgbOf('#2a1a1e'); return [c[0] * g + seam * 60, c[1] * g + seam * 14, c[2] * g]; } },
  logoMask: logoAt(['..rr....', '.rrrr...', 'rrrrrr..', '.rrrrrr.', '..rrrr..', '.rrrrrr.'], 320, 144, 4, { r: [255, 90, 40] }),
  stand: { low: '#3a1a14', mid: '#4a2218', high: '#5a2a1e', back: '#2a1010', top: '#6a3020' },
  outside: '#1a0404', ambient: .4, sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 0, moon: null,
  crowd: ['#f0c040', '#ff7a2a', '#40c080', '#f4f0ea'], skin: ['#c89060', '#8a5030', '#f0c090'],
  lights: [[80, 0, 60, 140, .9, '#ff7a30'], [560, 288, 60, 140, .9, '#ff7a30']]
});
courtDef('dome', {
  name: 'THE BLAM DOME', home: 'blambots', song: 'dome', dribble: 'dribble_maple', twist: 'boss',
  floor: { out: rgbOf('#ff3a3a'), line: rgbOf('#ffd23a'), three: rgbOf('#ffd23a'), base: (lx, ly, n, m) => { const g = 1.02 + n * .06 + m * .05, c = rgbOf('#c89a5a'); return [c[0] * g, c[1] * g, c[2] * g]; } },
  logoMask: logoAt(['wwwwwwwwww', 'wrrrrrrrrw', 'wrwwwwwwrw', 'wrwwwwwwrw', 'wrrrrrrrrw', 'wwwwwwwwww'], 320, 144, 4, { w: [255, 255, 255], r: [200, 30, 40] }),
  stand: { low: '#1a1828', mid: '#24203a', high: '#2e2848', back: '#100e1e', top: '#3a3260' },
  outside: '#080612', ambient: .7, sky: ['#05040a', '#100e24', '#1d1a40'], stars: 0, moon: null,
  crowd: ['#ff3ca6', '#2de2ff', '#ffd23a', '#7af0a0', '#ffffff'], skin: ['#e0b090', '#a87050', '#6a4028', '#f0c8a8'],
  lights: [[64, 0, 160, 220, .7, '#ffffff'], [640, 0, 160, 220, .7, '#ffffff'], [64, 288, 160, 220, .7, '#ffffff'], [640, 288, 160, 220, .7, '#ffffff']]
});

/* ---- 04-data-story.js ---- */
/* ---- THE STORY (plan §10.5, §10.6): the Blam Tour's stops, the beats as data (a line is [speaker, text]), the pre-game
 * talk by rival and by our captain's reply, the post-game beats, the reveal, the ending, and the halftime and sponsor
 * gags. Tone: a loud 90s sports broadcast; the Commissioner is smug and speaks in sentence case; the robots SPACED. ---- */
const TOUR_STOPS = {
  hightops: [{ team: 'breakers', court: 'pier' }, { team: 'crushers', court: 'scrapyard' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  breakers: [{ team: 'hightops', court: 'skybox' }, { team: 'crushers', court: 'scrapyard' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  crushers: [{ team: 'hightops', court: 'skybox' }, { team: 'breakers', court: 'pier' }, { team: 'magma', court: 'caldera' }, { team: 'blambots', court: 'dome' }],
  magma: [{ team: 'hightops', court: 'skybox' }, { team: 'breakers', court: 'pier' }, { team: 'crushers', court: 'scrapyard' }, { team: 'blambots', court: 'dome' }]
};
/** the Tour's CPU shift per stop (§10.5): stop 1 one step lower, stop 2 as set, stop 3 half a step higher, the final one higher */
const TOUR_SHIFT = [-1, 0, .5, 1];

/** the captains of each team (their names for the lines), and the pre-game talk by rival (the rival's line, our captain's
 * reply by our team) — §10.6 item 4 */
const CAPTAIN = { hightops: 'volt', breakers: 'riptide', crushers: 'torque', magma: 'obsidian', blambots: 'dunkatron', allstars: 'vinnie' };
const PREGAME = {
  breakers: { who: 'riptide', line: 'Hope you packed sunscreen, {TEAM}. The tide\'s coming in, and it doesn\'t knock.', replies: { hightops: ['volt', 'Cute pier. I\'m about to dunk on it.'], crushers: ['torque', 'I\'ve crushed bigger boats than this.'], magma: ['obsidian', 'Sand turns to glass when I\'m around.'] } },
  hightops: { who: 'volt', line: 'Welcome to the Skybox. Try not to look down. Actually, look down: that\'s where you\'ll be.', replies: { breakers: ['riptide', 'Whoa, relax. We\'re just here to ride the wave. Over you.'], crushers: ['torque', 'Fancy lights. They\'ll look great on my scrap pile.'], magma: ['ember', 'Neon\'s cute. Lava\'s hotter.'] } },
  crushers: { who: 'torque', line: 'We crush cars for breakfast. You look like a light snack.', replies: { hightops: ['volt', 'Then you\'re about to get a stomachache.'], breakers: ['shellshock', 'Careful, the floor\'s greasier than your jokes.'], magma: ['pumice', 'I bounce. You crush. Let\'s see who\'s still standing.'] } },
  magma: { who: 'obsidian', line: 'On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully.', replies: { hightops: ['bigrumble', 'I don\'t walk carefully. I walk LOUD.'], breakers: ['riptide', 'Dude. Is that, like, safe?'], crushers: ['sparkplug', 'I\'m too fast to get burned!'] } }
};

/** the story's beats: each a list of lines. Speakers: vinnie, deedee, gigawatt, dunkatron, swatbot, spareparts, roscoe,
 * captain (ours), the rival (theirs). {TEAM} is our team's name, {CAPTAIN} our first player. */
const BEATS = {
  prologue: [
    ['vinnie', 'GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!'],
    ['deedee', 'AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!'],
    ['vinnie', 'TONIGHT\'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE.'],
    ['gigawatt', 'Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours.'],
    ['gigawatt', 'Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha.'],
    ['deedee', '{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!']
  ],
  campOffer: [
    ['deedee', 'FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I\'LL SHOW YOU THE ROPES. OR DON\'T. LIVE DANGEROUSLY!']
  ],
  reveal: [
    ['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'],
    ['gigawatt', 'Congratulations. You have earned the privilege... of being replaced.'],
    ['gigawatt', 'Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!'],
    ['dunkatron', 'BEEP. YOUR. CAREER. IS. DEPRECATED.'],
    ['swatbot', 'INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK.'],
    ['captain', '{CAPTAIN_REPLY}']
  ],
  final: [['vinnie', 'THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!']],
  overclock: [
    ['gigawatt', 'OVERCLOCK THEM! MAXIMUM BLAM!'],
    ['deedee', 'THE ROBOTS ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!']
  ],
  reboot: [['deedee', 'THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!']],
  ending: [
    ['dunkatron', 'ERROR. ERROR. HUMANS. TOO. ... BLAM.'],
    ['vinnie', 'THEY DID IT! {TEAM} WINS THE BLAM TOUR!'],
    ['deedee', 'AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!'],
    ['gigawatt', 'This isn\'t over! I\'ll buy another league! I\'ll buy the MOON! Hey! Put me down!'],
    ['vinnie', 'STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!'],
    ['deedee', 'GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!'],
    ['vinnie', 'ALL BLAM!'],
    ['deedee', 'ALL BLAM!']
  ],
  lossStop: [['gigawatt', 'Tsk. Another court for my parking empire.']],
  lossFinal: [['gigawatt', 'Resistance is... adorable.'], ['dunkatron', 'GAME. OVER. INSERT. COIN.']],
  stopIntro: {
    skybox: 'THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!', pier: 'WATCH THE WIND, FOLKS. AND THE SEAGULLS. MOSTLY THE SEAGULLS.',
    scrapyard: 'OIL ON THE FLOOR AND FIRE IN THEIR EYES!', caldera: 'THE FLOOR IS HOT, THE VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!',
    dome: 'THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS JUMBOTRON!'
  },
  postGame: {
    1: [['riptide', 'Wipeout. Totally gnarly, though. Respect.'], ['volt', 'Okay, okay. You can ball. Don\'t let it go to your head.'], ['torque', 'You crushed us. That\'s MY job.'], ['obsidian', 'The mountain... respects you.'], ['gigawatt', 'Hmm. Promising. My engineers are taking notes. Lots of notes.']],
    2: [['gigawatt', 'Data received. Prototype calibration at ninety-eight percent. Keep playing, little ballers. Keep... teaching them.'], ['deedee', 'TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT ARM?'], ['vinnie', 'THAT\'S BRANDING, DEE DEE. WE DON\'T ASK QUESTIONS ON LIVE TV.']]
  },
  sponsor: ['WE\'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS SHATTERY!', 'GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT.', 'THIS REPLACEMENT BACKBOARD IS BROUGHT TO YOU BY... THE LAST REPLACEMENT BACKBOARD.']
};

/** a line's text with the slots filled: {TEAM} the team's name, {CAPTAIN} the first player */
const fillLine = (text, team) => text.replace(/\{TEAM\}/g, team ? team.name : 'YOUR CREW').replace(/\{CAPTAIN\}/g, team ? (rosterOf(team.id)[0] || { name: 'CAPTAIN' }).name : 'CAPTAIN');
/** a speaker's name, colour and voice: the story's cast (characters and players) */
const SPEAKERS = {
  vinnie: { name: 'VINNIE VOX', voice: 'vinnie', rig: () => charRig('vinnie') },
  deedee: { name: 'DEE DEE DECIBEL', voice: 'deedee', rig: () => charRig('deedee') },
  gigawatt: { name: 'COMMISSIONER GIGAWATT', voice: 'gigawatt', rig: () => charRig('gigawatt') },
  dunkatron: { name: 'DUNKATRON', voice: 'dunkatron', rig: () => playerRig('dunkatron') },
  swatbot: { name: 'SWATBOT', voice: 'swatbot', rig: () => playerRig('swatbot') },
  spareparts: { name: 'SPARE PARTS', voice: 'spareparts', rig: () => playerRig('spareparts') },
  roscoe: { name: 'REF ROSCOE', voice: 'roscoe', rig: () => charRig('roscoe') }
};
/** a rig for a story character or a player (cached in S.rigCache: one Humanoid per portrait) */
const charRig = id => { S.rigCache = S.rigCache || {}; if (S.rigCache[id]) return S.rigCache[id]; const d = get('character', id) || get('player', id); const r = d && d.rig ? new E.Humanoid(Object.assign({ weapon: null, outfit: 'shirt', sleeves: 'none' }, { size: d.rig.size || 1.6, build: d.rig.build || 'heroic', hair: d.rig.hair || 'short', colors: { skin: d.rig.skin || '#e0b090', hair: d.rig.hairColor || '#2a1a10', cloth: d.rig.shirt || '#5a4a7a', pants: '#2a2038' }, hat: d.rig.hat, hunch: d.rig.hunch })) : null; return (S.rigCache[id] = r); };
const playerRig = id => { S.rigCache = S.rigCache || {}; if (S.rigCache[id]) return S.rigCache[id]; const d = playerDef(id), t = teamDef(d.team); return (S.rigCache[id] = dressRig(d, t)); };
/** the story's captains: our team's first player, as the speaker 'captain' */
const captainOf = teamId => { const id = CAPTAIN[teamId] || rosterOf(teamId)[0].id; return { name: playerDef(id).name, voice: id, rig: () => playerRig(id) }; };

/* ---- 05-data-lines.js ---- */
/* ---- THE ANNOUNCER'S LINES (plan §10.7): banks by event, ALL CAPS, at most 60 characters, with {NAME}, {VICTIM}, {TEAM}
 * slots. Big plays interrupt small ones; no line repeats within the last eight; each bank has a cooldown. ---- */
const LINE_BANKS = {
  tipoff: ['WELCOME TO CHANNEL BLAM! LET\'S GET LOUD!', 'THE BALL IS UP! THE CROWD IS UP! I AM UP!'],
  dunkPower: ['BLAMMO! {NAME} JUST MAILED IT FIRST CLASS!', 'SOMEBODY CALL A CARPENTER, THAT RIM IS FINISHED!', 'KA-BLAM! THE CROWD LEFT THEIR SEATS. AND THEIR SHOES!', 'THE RIM SAID "OW" AND THE RIM MEANT IT!', '{NAME} DUNKED LIKE THE GYM OWES THEM MONEY!', 'THAT\'S A DUNK, FOLKS. THE NETS ARE DEFEATED!', 'DOWN GOES THE BASKET! UP GOES THE NOISE!', 'THE HOOP IS NOT SEEING A DOCTOR! BUT IT SHOULD!', 'BACK-SEAT DRIVERS: THAT WAS A DUNK!', 'MAILED IT! THE POST OFFICE IS PROUD!'],
  dunkSpin: ['{NAME} SPUN SO FAST THE SCOREBOARD GOT DIZZY!', 'A FRONT FLIP?! THAT\'S NOT BASKETBALL, THAT\'S THE CIRCUS!', '{NAME} IS HANGING ON THAT RIM LIKE IT OWES MONEY!', 'AIR TRAFFIC CONTROL HAS QUESTIONS FOR {NAME}!', 'THE TWIST! THE TURN! THE GENERAL VIBE!', '{NAME} GAVE THE CAMERA A FULL 360, THEN ANOTHER ONE!', 'THE REVERSE ROCKET! NASA IS ON THE PHONE!', 'WINDMILL ALERT! SOMEONE TELL THE WIND!', 'THE ROTATION WAS SO SMOOTH I GOT A HEADACHE!', 'A FULL BODY TWIST INTO THE BASKET! UNREAL!'],
  alleyoop: ['SPECIAL DELIVERY! SIGNED, SEALED, SLAMMED!', 'THE LOB! THE CATCH! THE GROUND IS A HAPPY PLACE!', 'AN ALLEY-OOP THAT\'S A LOVE LETTER TO THE RIM!'],
  three: ['SPLASH! BRING A TOWEL!', 'THAT WAS FROM A DIFFERENT ZIP CODE!', '{NAME} SHOT THAT FROM THE PARKING LOT! VALIDATED!', 'NOTHING BUT NET AND A LOT OF SWAGGER!', 'THE THREE! THE CROWD! THE SCORE! THE PARTY!', 'FROM DOWNTOWN! DOWNTOWN IS JEALOUS!', 'THAT SHOT WAS SPONSORED BY CONFIDENCE!', 'A BOMB FROM THE ARC! THE ARC IS SHOOK!'],
  airball: ['AIRBALL! THE SEAGULLS SAY THANK YOU!', 'THAT ONE IS STILL GOING. IT\'S IN ORBIT.', 'THE RIM WAS SHY ABOUT THAT ONE!', 'AIRBALL! THE CROWD SAYS "OOOOH" IN HARMONY!'],
  block: ['REJECTED! RETURN TO SENDER!', '{NAME} SAYS NOT IN MY HOUSE, NOT IN MY YARD, NOT MY ZIP!', 'SWATTED! THE BALL IS HEADING FOR THE PARKING LOT!', 'BLOCKED! {NAME} IS A WALL WITH OPINIONS!'],
  steal: ['PICKPOCKET! CHECK YOUR WALLETS, FOLKS!', '{NAME} SNATCHED IT LIKE A SEAGULL AT A FRY STAND!', 'THE STEAL! THE POCKET! THE PURSE! ALL GONE!', '{NAME} TOOK IT RIGHT OUT OF THE HANDS OF {VICTIM}!'],
  shove: ['NO FOULS IN ZONEFIRE, BABY!', 'THAT\'S NOT A FOUL. THAT\'S A LIFESTYLE.', '{VICTIM} JUST GOT SENT TO THE SHADOW REALM!', 'A SHOVE FOR THE HISTORY BOOKS! AND THE PHYSIO!', 'THE PUSH IS LEGAL! THE PUSH IS SPORT! THE PUSH IS LOVE!'],
  ankles: ['ANKLES! {VICTIM} NEEDS A NEW PAIR!', 'THE SPIN! THE STUMBLE! THE ANKLE BREAKER!', '{VICTIM} IS ON THE FLOOR WONDERING WHAT HAPPENED!'],
  posterized: ['FRAME IT! HANG IT! {VICTIM} IS ON {NAME}\'S WALL NOW!', 'POSTERIZED! {VICTIM} WILL BE IN THE HALL OF SHAME!'],
  novaOn: ['{NAME} HAS GONE SUPERNOVA! DIM THE LIGHTS!', 'SOMEBODY CALL NASA, {NAME} IS A STAR!', 'THE SUPERNOVA IS HERE! BRING SUNGLASSES!'],
  novaOff: ['AND THE STAR COLLAPSES! BACK TO EARTH, {NAME}!', 'THE SUPERNOVA FADES! THE CROWD IS STILL GLOWING!'],
  shatter: ['THE GLASS! THE GLASS IS GONE!', 'SOMEBODY GET A BROOM. A BIGGER BROOM!', 'THE BACKBOARD IS IN PIECES! THE CLEANING BOT IS CALLED!'],
  goaltend: ['GOALTENDING! THE BUCKET COUNTS, AND SO DOES THE SHAME!', 'TOUCHED IT ON THE WAY DOWN! THE BASKET IS GOOD!'],
  jackpot: ['JACKPOT! {NAME} HIT THE SPOT AND THE SPOT PAID OUT!', 'THE JACKPOT RING! TWO POINTS OF PURE MONEY!'],
  powerRocket: ['ROCKET KICKS! {NAME} IS LEGALLY A VEHICLE NOW!'],
  powerGlue: ['GLUE GLOVES! THAT BALL ISN\'T GOING ANYWHERE!'],
  powerLaser: ['LASER SIGHT! {NAME} CAN SEE THE FUTURE, AND IT\'S A BUCKET!'],
  powerMoon: ['MOON SHOES! GRAVITY HAS LEFT THE BUILDING!'],
  powerBomb: ['BLAM BOMB! EVERYBODY DUCK!'],
  powerGold: ['GOLD BALL! NEXT BUCKET\'S WORTH DOUBLE!'],
  clutch: ['TEN SECONDS! HEARTS POUNDING! SNEAKERS SQUEAKING!', 'AT THE BUZZER! I BROKE MY CHAIR! I NEED A NEW CHAIR!'],
  comeback: ['{TEAM} IS CLAWING BACK! DON\'T TOUCH THAT DIAL!', 'THIS ONE\'S GETTING UGLY. I\'M COVERING MY EYES. I\'M PEEKING.'],
  gust: ['BIG GUST OFF THE OCEAN! HOLD ONTO YOUR HATS!'],
  slick: ['{NAME} HIT THE OIL! THAT\'S A SLIP \'N SLAM!'],
  eruption: ['THE VOLCANO WANTS IN ON THE ACTION!', 'ERUPTION! SOMEBODY GET A HELMET!'],
  vent: ['{NAME} RODE THE STEAM VENT TO THE MOON!'],
  boss: ['THE ROBOTS ARE OVERCLOCKING! SMELLS LIKE BURNT TOAST!', 'THOSE ROBOTS RUN ON BATTERIES AND BAD MANNERS!'],
  reboot: ['SYSTEM REBOOT! TURN IT OFF AND ON AGAIN, BABY!'],
  shotclock: ['SHOT CLOCK! YOU HAVE TO SHOOT IT EVENTUALLY, FOLKS!'],
  quarterEnd: ['THAT\'S THE QUARTER! CATCH YOUR BREATH, I CAN\'T!'],
  halftime: ['HALFTIME! STRETCH YOUR LEGS AND YOUR VOCABULARY!'],
  final: ['FINAL! {TEAM} TAKES IT!'],
  quake: ['BLAM-QUAKE! THE FLOOR IS THE CROWD\'S NOW!'],
  basket: ['BUCKET! {NAME} SCORES, THE CROWD SCREAMS!', 'AND IT\'S GOOD! {NAME} WITH THE POINTS!', 'WHAT A SHOT FROM {NAME}! THE SCOREBOARD BLINKS!'],
  miss: ['BRICK! THE RIM SAYS "NOT TODAY"!', 'MISSED! THE PARKING LOT WANTS IT BACK!']
};
/** a line for a bank: not one of the last eight, the slots filled; the line itself is picked by the fx stream */
const lineFor = (bank, names = {}) => {
  const L = LINE_BANKS[bank]; if (!L || !L.length) return null;
  const recent = S.recentLines || (S.recentLines = []);
  let pick = null;
  for (let t = 0; t < 6; t++) { const cand = L[(S.fxRng() * L.length) | 0]; if (!recent.includes(cand)) { pick = cand; break; } }
  pick = pick || L[0];
  recent.push(pick); if (recent.length > 8) recent.shift();
  return pick.replace(/\{(NAME|VICTIM|TEAM)\}/g, (_, k) => names[k] || k);
};

/* ---- 06-data-moves.js ---- */
/* ---- POWER-UPS (plan §6.15, §10.4): six pickups, each a data entry with its apply and its remove; the spawner and the
 * pickup are in the twists fragment. Their icons are string sprites, drawn bobbing above a pulsing floor ring. ---- */
const PU_ICON = {
  rocket: ['..yyyy..', '.yYYYYy.', 'YYYYYYYy', 'YYwwwwYY', 'YYYYYYYY', '.kk..kk.', '........', '..ff....'],
  glue: ['..gggg..', '.gGGGg..', 'gGGGGgg.', '.gGGGg..', '..gggg..', '...gg...', '...gg...', '..gggg..'],
  laser: ['..rr....', '.r.r.r..', 'rr.rr.rr', '.r.r.r..', '..rr....', '........', '........', '........'],
  moon: ['..bbbb..', '.bBBBb..', 'bBbbbBb.', '.bBBBb..', '..bbbb..', '..b..b..', '.bb..bb.', '.bb..bb.'],
  bomb: ['....f...', '...f....', '..kkkk..', '.kKKKKk.', 'kKKKKKKk', 'kKKwKKKk', '.kKKKKk.', '..kkkk..'],
  gold: ['..oooo..', '.oYYYYo.', 'oYwYYYYo', 'oYYYYYYo', 'oYYYYYYo', 'oYYYYYYo', '.oYYYYo.', '..oooo..']
};
const PU_SPR = {};
for (const [id, rows] of Object.entries(PU_ICON)) PU_SPR[id] = E.sprite(rows, { y: '#ffd23a', Y: '#fff0a0', w: '#ffffff', g: '#7af0a0', G: '#2a8a4a', r: '#ff3a3a', b: '#8ab0ff', B: '#c8d8ff', k: '#222222', K: '#3a3a40', f: '#ff7a2a', o: '#8a5a10', O: '#ffd23a' });
const POWERUPS = [
  { id: 'rocket', name: 'ROCKET KICKS', color: '#ff7a2a', seconds: 15, icon: 'R', apply(p) { p.rocket = 15; }, remove(p) { p.rocket = 0; } },
  { id: 'glue', name: 'GLUE GLOVES', color: '#7af0a0', seconds: 15, icon: 'G', apply(p) { p.glue = 15; }, remove(p) { p.glue = 0; } },
  { id: 'laser', name: 'LASER SIGHT', color: '#ff3a3a', seconds: 15, icon: 'L', apply(p) { p.laser = 15; p.laserShots = 2; }, remove(p) { p.laser = 0; } },
  { id: 'moon', name: 'MOON SHOES', color: '#8ab0ff', seconds: 15, icon: 'M', apply(p) { p.moon = 15; }, remove(p) { p.moon = 0; } },
  { id: 'bomb', name: 'BLAM BOMB', color: '#c8c8d8', seconds: 20, icon: 'B', apply(p) { p.bomb = true; p.bombT = 20; }, remove(p) { p.bomb = false; } },
  { id: 'gold', name: 'GOLD BALL', color: '#ffd23a', seconds: 30, icon: 'Q', apply(p) { p.goldBall = 30; }, remove(p) { p.goldBall = 0; } }
];
for (const pu of POWERUPS) def('powerup', pu.id, pu);
const PU_LINE = { rocket: 'powerRocket', glue: 'powerGlue', laser: 'powerLaser', moon: 'powerMoon', bomb: 'powerBomb', gold: 'powerGold' };

/* ---- 10-audio-music.js ---- */
/* ---- MUSIC (plan §12.1): every song is data in the engine's format (bpm, steps, tracks with a wave, a volume and notes),
 * layered with audio.layer and played with audio.music; the stings are short songs. All written in code, no files. ---- */
const SONG_TITLE = { bpm: 108, steps: 4, tracks: [
  { name: 'bass', wave: 'square', vol: .22, notes: 'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
  { name: 'stabs', wave: 'saw', vol: .06, notes: '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
  { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |' },
  { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }
] };
const SONGS = {
  title: SONG_TITLE,
  menu: { bpm: 108, steps: 4, tracks: [SONG_TITLE.tracks[0], SONG_TITLE.tracks[2]] },
  skybox: { bpm: 116, steps: 4, tracks: [
    { name: 'arp', wave: 'pulse', vol: .06, notes: 'A4 C5 E5 A5 G5 E5 C5 A4 F4 A4 C5 F5 E5 C5 A4 F4 |' },
    { name: 'bass', wave: 'saw', vol: .2, notes: 'A2 . A2 . C3 . A2 . F2 . F2 . G2 . G2 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h h k . h h s . h o |' },
    { name: 'nova', wave: 'saw', vol: .06, on: false, notes: 'E5 - G5 - B5 - E6 - D5 - F5 - A5 - |' }] },
  pier: { bpm: 124, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .08, notes: 'D5 . F#5 A5 . A5 G5 F#5 . E5 . D5 . . . |' },
    { name: 'bass', wave: 'square', vol: .18, notes: 'D2 . D3 . A2 . D3 . G2 . G3 . A2 . A3 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . h s . h . k . . h s . h h |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'D6 - F#6 - A6 - D7 - |' }] },
  scrapyard: { bpm: 92, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .2, notes: 'C2 . C2 . Eb2 . C2 . G1 . G1 . Bb1 . C2 . |' },
    { name: 'metal', wave: 'noise', vol: .04, notes: 'c . . c . c . . c . . c . c c . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . . k s . k . k . k s . . s . |' },
    { name: 'nova', wave: 'pulse', vol: .05, on: false, notes: 'C5 - Eb5 - G5 - C6 - |' }] },
  caldera: { bpm: 128, steps: 4, tracks: [
    { name: 'marimba', wave: 'triangle', vol: .1, notes: 'G4 . Bb4 . D5 . G5 . F5 . D5 . Bb4 . G4 . |' },
    { name: 'bass', wave: 'square', vol: .16, notes: 'G2 G2 . G2 . G2 D2 . G2 . G2 . F2 G2 . |' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . k . s . k . k k s . k . s s |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'G5 - D6 - Bb5 - G6 - |' }] },
  dome: { bpm: 132, steps: 4, tracks: [
    { name: 'guitar', wave: 'saw', vol: .07, notes: 'E4 E4 G4 E4 A4 G4 E4 B3 |' },
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E2 . E2 . G2 . A2 . A2 . B2 . E2 . |' },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h . k . h . s h h . |' },
    { name: 'nova', wave: 'saw', vol: .05, on: false, notes: 'E5 - G5 - B5 - E6 - |' },
    { name: 'overclock', wave: 'pulse', vol: .05, on: false, notes: 'E6 B5 G6 B5 E6 B5 G6 B5 |' },
    { name: 'clutch', wave: 'drums', vol: .08, on: false, notes: 'k k s k k k s s |' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { name: 'brass', wave: 'saw', vol: .06, notes: 'Bb4 . D5 . F5 . D5 . Eb5 . C5 . Bb4 . |' },
    { name: 'bass', wave: 'square', vol: .18, notes: 'Bb2 . Bb2 . F2 . F2 . Eb2 . Eb2 . F2 . |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s . |' }] },
  tourmap: { bpm: 100, steps: 4, tracks: [
    { name: 'groove', wave: 'triangle', vol: .12, notes: 'F3 . A3 . C4 . A3 . Bb3 . G3 . F3 . |' },
    { name: 'bass', wave: 'square', vol: .16, notes: 'F2 . . F2 C2 . F2 . Bb2 . . G2 F2 . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . |' }] },
  story: { bpm: 84, steps: 4, tracks: [
    { name: 'drone', wave: 'sine', vol: .14, notes: 'D2 - - - - - - - D2 - - - - - - - |' },
    { name: 'pluck', wave: 'triangle', vol: .06, notes: 'D4 . . . A4 . . . F4 . . . C4 . . . |' },
    { name: 'villain', wave: 'square', vol: .04, on: false, notes: 'D3 F3 A3 F3 Eb3 G3 Bb3 G3 |' }] },
  camp: { bpm: 104, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .06, notes: 'C5 . E5 . G5 . E5 . D5 . F5 . A4 . |' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 . G2 . C3 . G2 . A2 . E2 . F2 . G2 . |' },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h . |' }] },
  credits: { bpm: 112, steps: 4, tracks: [
    { name: 'bass', wave: 'square', vol: .2, notes: 'E2 . E3 . E2 . G2 . A2 . A3 . B2 . E3 . |' },
    { name: 'stabs', wave: 'saw', vol: .06, notes: 'E4 . G#4 . B4 . E5 . A4 . B4 . E4 - |' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k . k h . s h h . |' }] }
};
const STINGS = {
  tip: { bpm: 140, steps: 4, tracks: [{ name: 'tip', wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - - - - |' }] },
  buzzer: { bpm: 90, steps: 4, tracks: [{ name: 'buzz', wave: 'square', vol: .14, notes: 'A3 - - - A#3 - - - |' }] },
  nova: { bpm: 140, steps: 4, tracks: [{ name: 'nova', wave: 'saw', vol: .12, notes: 'C4 E4 G4 C5 E5 G5 C6 - |' }] },
  shatter: { bpm: 140, steps: 4, tracks: [{ name: 'shatter', wave: 'noise', vol: .14, notes: 'c c c c - - - - |' }] },
  victory: { bpm: 120, steps: 4, tracks: [{ name: 'vic', wave: 'triangle', vol: .16, notes: 'C4 . E4 . G4 . C5 - - - |' }] },
  defeat: { bpm: 80, steps: 4, tracks: [{ name: 'def', wave: 'triangle', vol: .14, notes: 'G4 . F4 . Eb4 . D4 - - - |' }] },
  unlock: { bpm: 140, steps: 4, tracks: [{ name: 'unl', wave: 'pulse', vol: .12, notes: 'E5 G5 B5 E6 - - - - |' }] },
  sponsor: { bpm: 150, steps: 4, tracks: [{ name: 'ad', wave: 'square', vol: .12, notes: 'C5 . C5 . E5 . G5 . C6 - - - |' }] }
};
/** the songs by where they play; a stinger over the music, a layer over a song */
const playSong = name => { const s = SONGS[name]; if (!s) { if (name) game.fail('song ' + name, new Error('no such song')); return A.music(null); } A.music(s, { fade: .4 }); };
const playSting = name => { const s = STINGS[name]; if (s) A.sting(s, { at: 'bar' }); };
/** the dynamic layers: a song's extra track switched on for the moment (Supernova, the overclock, the clutch) */
const layerOn = (name, on) => { try { A.layer(name, on ? 1 : 0, .6); } catch (e) { /* no audio: nothing to switch */ } };

/* ---- 11-audio-sfx.js ---- */
/* ---- SOUND EFFECTS (plan §12.2): each is a voice in the engine's format, defined once with audio.define. Played through
 * one policy: a sound's volume follows the player's sound settings (the engine's), and nothing fails headless. ---- */
const SFX = {
  dribble_asphalt: { wave: 'sine', freq: 140, to: 60, dur: .07, vol: .3 }, dribble_planks: { wave: 'triangle', freq: 260, to: 120, dur: .09, vol: .3 },
  dribble_concrete: { wave: 'noise', freq: 900, to: 300, dur: .06, vol: .3, filter: 'lowpass' }, dribble_stone: { wave: 'square', freq: 1400, to: 900, dur: .03, vol: .22 },
  dribble_maple: { wave: 'sine', freq: 180, to: 70, dur: .08, vol: .3 },
  bounce: { wave: 'sine', freq: 180, to: 80, dur: .1, vol: .25 }, catch: { wave: 'triangle', freq: 300, to: 160, dur: .06, vol: .2 },
  release: { wave: 'noise', freq: 1200, to: 400, dur: .12, vol: .14 },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .22, filter: 'highpass' },
  rim: { wave: 'square', freq: 620, dur: .08, vol: .18, arp: [0, 1] }, backboard: { wave: 'triangle', freq: 160, to: 110, dur: .14, vol: .3 },
  net_snap: { wave: 'noise', freq: 3000, to: 800, dur: .05, vol: .16 },
  slam: { wave: 'sine', freq: 80, to: 40, dur: .3, vol: .45 }, shatter: { wave: 'noise', freq: 2400, to: 900, dur: .5, vol: .3 },
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .12, vib: [30, .02] }, step: { wave: 'noise', freq: 500, to: 200, dur: .03, vol: .08 },
  jump: { wave: 'triangle', freq: 220, to: 420, dur: .12, vol: .15 }, land_heavy: { wave: 'sine', freq: 110, to: 50, dur: .12, vol: .3 },
  shove: { wave: 'noise', freq: 400, to: 120, dur: .18, vol: .3 }, fall: { wave: 'square', freq: 120, to: 60, dur: .3, vol: .26 },
  steal: { wave: 'triangle', freq: 900, to: 1800, dur: .1, vol: .2 }, block: { wave: 'noise', freq: 600, to: 200, dur: .14, vol: .3 },
  spin: { wave: 'saw', freq: 300, to: 900, dur: .3, vol: .12 }, dizzy: { wave: 'sine', freq: 1500, to: 2200, dur: .2, vol: .1, vib: [20, .04] },
  whistle: { wave: 'sine', freq: 2400, to: 2300, dur: .35, vol: .12, vib: [25, .05] }, buzzer: { wave: 'square', freq: 220, to: 230, dur: .9, vol: .16 },
  shotclock_beep: { wave: 'square', freq: 880, dur: .08, vol: .14 }, horn: { wave: 'saw', freq: 220, to: 180, dur: .9, vol: .16 },
  crowd_roar: { wave: 'noise', freq: 400, to: 1200, dur: 1.2, vol: .18, filter: 'lowpass' }, crowd_ooh: { wave: 'noise', freq: 300, to: 700, dur: .7, vol: .14 },
  crowd_boo: { wave: 'saw', freq: 180, to: 140, dur: .8, vol: .12 }, camera_flash: { wave: 'noise', freq: 4000, dur: .02, vol: .15 },
  pu_spawn: { wave: 'pulse', freq: 'C5', arp: [0, 4, 7, 12], step: .03, dur: .09, vol: .14 }, pu_pick: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12], step: .04, dur: .08, vol: .18 },
  pu_end: { wave: 'triangle', freq: 660, to: 330, dur: .3, vol: .14 }, jackpot: { wave: 'pulse', freq: 'E5', arp: [0, 4, 7, 12, 16], step: .05, dur: .1, vol: .18 },
  nova_on: { wave: 'saw', freq: 200, to: 1600, dur: .9, vol: .2, vib: [6, .05] }, wind_gust: { wave: 'noise', freq: 300, to: 1100, dur: 1.4, vol: .14, filter: 'bandpass' },
  gull: { wave: 'sine', freq: 1800, to: 2200, dur: .3, vol: .08, vib: [14, .06] }, oil_slip: { wave: 'saw', freq: 500, to: 120, dur: .6, vol: .14 },
  rumble: { wave: 'noise', freq: 120, to: 200, dur: 1.5, vol: .22, filter: 'lowpass' }, bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: .6, vol: .14 },
  bomb_hit: { wave: 'noise', freq: 300, to: 60, dur: .5, vol: .35, filter: 'lowpass' }, vent_puff: { wave: 'noise', freq: 800, to: 200, dur: .9, vol: .12, filter: 'highpass' },
  pyro: { wave: 'noise', freq: 2000, to: 300, dur: .4, vol: .3 }, servo: { wave: 'saw', freq: 300, to: 500, dur: .3, vol: .1, vib: [12, .04] },
  reboot: { wave: 'square', freq: 800, to: 200, dur: .6, vol: .16, vib: [40, .03] },
  code_ok: { wave: 'triangle', freq: 'G5', arp: [0, 4, 7], step: .05, dur: .1, vol: .18 }, stamp: { wave: 'noise', freq: 1000, to: 200, dur: .12, vol: .24 },
  // the UI sounds (the engine's own presets stand for select, confirm, cancel and pause) and the match's others
  swipe: { wave: 'noise', freq: 2400, to: 900, dur: .14, vol: .14 }, whoosh: { wave: 'noise', freq: 900, to: 300, dur: .2, vol: .12 },
  nova: { wave: 'saw', freq: 300, to: 900, dur: .5, vol: .16, vib: [8, .05] }, slide: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .18 },
  thump: { wave: 'sine', freq: 120, to: 70, dur: .08, vol: .3 }, kick: { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3, filter: 'lowpass' },
  die: { wave: 'triangle', freq: 440, to: 110, dur: .6, vol: .22 }, select: { wave: 'square', freq: 660, dur: .05, vol: .12 }, confirm: { wave: 'square', freq: 880, dur: .08, vol: .14 }, cancel: { wave: 'square', freq: 330, dur: .08, vol: .14 }
};
for (const [name, voice] of Object.entries(SFX)) if (!(name === 'select' || name === 'confirm' || name === 'cancel')) A.define(name, voice);
/** a sound by name: silent until audio is unlocked; the names the code uses are defined above or are the engine's presets */
const sfxPlay = (name, o = {}) => { try { A.sfx(name, o); } catch (e) { /* headless or no audio yet */ } };

/* ---- 12-audio-voice.js ---- */
/* ---- THE VOICES (plan §12.3): gibberish in the Animalese / Simlish manner. A line becomes syllables (a consonant cluster
 * and a vowel); each syllable is an oscillator through two band-pass filters at the vowel's formants, with a consonant
 * burst; the pitch follows the profile, the sentence's downdrift, a rise on '?' and a lift on '!'. The same line always
 * sounds the same (a hash seeds the contour). Captions always show with the voice. ---- */
const VOWEL_F = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [500, 900], u: [350, 700], y: [300, 2200] };
const VOICE_PROFILES = {
  vinnie: { base: 110, wave: 'sawtooth', rate: 14, formant: 1, punch: 1.2 }, deedee: { base: 230, wave: 'square', rate: 15, formant: 1.1, punch: 1.1 },
  gigawatt: { base: 140, wave: 'sawtooth', rate: 9, formant: .85, nasal: true, slides: true }, roscoe: { base: 150, wave: 'sawtooth', rate: 12, formant: 1 },
  volt: { base: 220, wave: 'square', rate: 14, formant: 1.1 }, rumble: { base: 85, wave: 'sawtooth', rate: 7, formant: .9 }, pixel: { base: 270, wave: 'square', rate: 15, formant: 1.2 },
  riptide: { base: 170, wave: 'sine', rate: 7, formant: .95, drawl: true }, shellshock: { base: 200, wave: 'triangle', rate: 10, formant: 1.05, sing: true },
  longboard: { base: 120, wave: 'sawtooth', rate: 6, formant: .9 }, torque: { base: 95, wave: 'sawtooth', rate: 9, formant: .9, gravel: true }, sparkplug: { base: 300, wave: 'square', rate: 16, formant: 1.15 },
  hubcap: { base: 130, wave: 'sawtooth', rate: 8, formant: .95, grumpy: true }, obsidian: { base: 78, wave: 'sawtooth', rate: 6, formant: .85 }, ember: { base: 230, wave: 'triangle', rate: 12, formant: 1.05 },
  pumice: { base: 190, wave: 'square', rate: 11, formant: 1, bounce: true }, blammo: { base: 60, wave: 'sawtooth', rate: 8, formant: .8, growl: true },
  dunkatron: { base: 95, wave: 'square', rate: 12, robot: 50, quant: true }, swatbot: { base: 120, wave: 'square', rate: 12, robot: 50, quant: true }, spareparts: { base: 150, wave: 'square', rate: 12, robot: 60, glitch: true, quant: true },
  cleanbot: { base: 200, wave: 'square', rate: 12, robot: 50, quant: true }, intern: { base: 160, wave: 'triangle', rate: 10, formant: 1 }, crowd: { base: 170, wave: 'sawtooth', rate: 10, formant: 1, chant: true }
};
/** a line into syllables: each a consonant (or none), a vowel, a length; spaces are short gaps, punctuation longer ones */
const voicePlan = (text, profile) => {
  const out = []; let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const low = text.toLowerCase(), n = low.length;
  let cons = '', t = 0, step = 0, sylN = 0;
  for (let i = 0; i < n; i++) {
    const c = low[i];
    if (/[a-z]/.test(c)) {
      if (VOWEL_F[c]) {
        const dur = .055 + rnd() * .035, pitch = profile.base * (1 + (rnd() - .5) * .12) * Math.pow(2, -(sylN * .004)) * (profile.robot ? 1 : 1);
        out.push({ t, dur, vowel: c, cons, f0: pitch, excl: false, quest: false });
        t += dur; cons = ''; sylN++;
      } else cons += c;
    } else if (c === ' ') { if (cons) { out.push({ t, dur: .03, vowel: null, cons, f0: profile.base, gap: true }); t += .03; cons = ''; } t += .05; }
    else if (c === '!' || c === '?' || c === '.' || c === ',') { const last = out[out.length - 1]; if (last) { if (c === '!') last.excl = true; if (c === '?') last.quest = true; } t += c === '.' ? .18 : .1; }
    else if (/[0-9]/.test(c)) { t += .04; }
  }
  for (const s of out) { if (s.excl) s.f0 *= 1.06; if (s.quest) s.f0 *= 1.12; if (profile.quant) s.f0 = Math.round(s.f0 / 12) * 12; }
  return out;
};
/** speak a text as a profile: builds the syllable plan and, when audio runs, schedules its nodes on the sfx bus */
const voiceSay = (text, who, o = {}) => {
  const profile = VOICE_PROFILES[who] || VOICE_PROFILES.crowd;
  const plan = voicePlan(text, profile);
  const vv = Number(setting('voiceVol') ?? 1);   // the Voice volume slider
  if (A.ctx && A.sfxBus && vv > 0) {
    const c = A.ctx, t0 = c.currentTime + .02, bus = A.sfxBus;
    for (const syl of plan) {
      if (!syl.vowel) continue;   // a gap (a space or a stop before a word) is silence in the synth
      const at = t0 + syl.t;
      const o2 = c.createOscillator(), g = c.createGain();
      o2.type = profile.wave === 'sawtooth' ? 'sawtooth' : profile.wave === 'square' ? 'square' : profile.wave === 'triangle' ? 'triangle' : 'sine';
      o2.frequency.setValueAtTime(syl.f0, at); o2.frequency.linearRampToValueAtTime(syl.f0 * (profile.slides ? .9 : .97), at + syl.dur);
      const [f1, f2] = VOWEL_F[syl.vowel];
      const bp1 = c.createBiquadFilter(), bp2 = c.createBiquadFilter(); bp1.type = bp2.type = 'bandpass';
      bp1.frequency.value = f1 * (profile.formant || 1) * (profile.nasal ? .8 : 1); bp2.frequency.value = f2 * (profile.formant || 1);
      bp1.Q.value = 5; bp2.Q.value = 6;
      const amp = (syl.excl ? 1.4 : 1) * (o.volume || .2) * (profile.punch || 1) * vv;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + .01); g.gain.linearRampToValueAtTime(0, at + syl.dur);
      o2.connect(bp1); o2.connect(bp2); bp1.connect(g); bp2.connect(g); g.connect(bus);
      o2.start(at); o2.stop(at + syl.dur + .02);
    }
  }
  return plan;
};
/** the letter a Dialog types: one syllable for it (the typed line is the voice's timing, the same as the caption's) */
const voiceLetter = (ch, who) => { if (!/[a-zA-Z]/.test(ch || '')) return; if (!A.ctx || !A.sfxBus) return; voiceSay(ch, who, { volume: .08 }); };
/** the crowd's ambience: a looping pink-ish noise through a band-pass, its level from the excitement (0..1) */
const crowdAmb = { node: null, gain: null, exc: 0 };
const crowdStart = () => {
  if (!A.ctx || crowdAmb.node || !A.musicBus) return;
  const c = A.ctx, len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .98 * b0 + .02 * w; d[i] = b0 * 6; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = .6;
  crowdAmb.gain = c.createGain(); crowdAmb.gain.gain.value = .04;
  src.connect(bp); bp.connect(crowdAmb.gain); crowdAmb.gain.connect(A.musicBus); src.start(); crowdAmb.node = src;
};
const crowdSet = exc => { crowdAmb.exc = clamp(exc, 0, 1); if (crowdAmb.gain && A.ctx) crowdAmb.gain.gain.value = .02 + .08 * crowdAmb.exc; };

/* ---- 20-court-build.js ---- */
/* ---- THE ARENA (plan §6.1): one TileMap, 48 x 28 tiles (768 x 448). Rows 0-5 are the stands (four tiers, heights 48 at
 * the back down to 12 at the front), rows 6 and 25-27 the aprons, rows 7-24 the court, columns 0-1 and 46-47 the low
 * ends. The court's lines and logos are painted into the floor by the court's own painter (floorTex in world units). ---- */
const ARENA_COLS = 48, ARENA_ROWS = 28;
const COURT_X0 = OX, COURT_X1 = OX + CW, COURT_Y0 = OY, COURT_Y1 = OY + CH;   // the lines, world units
const PLAY_X = [40, 728], PLAY_Y = [88, 424];                              // the invisible walls, 24 outside the lines
const TIER_H = [48, 36, 24, 12];                                           // stand heights, back to front (wall types 4 .. 1)

const arenaRows = () => {
  const rows = [];
  for (let r = 0; r < ARENA_ROWS; r++) {
    let s = '';
    for (let c = 0; c < ARENA_COLS; c++) {
      let ch = '.';
      if (r <= 1) ch = '4'; else if (r === 2 || r === 3) ch = '3'; else if (r === 4) ch = '2'; else if (r === 5) ch = '1';
      else if (r >= 7 && r <= 24 && (c <= 1 || c >= 46)) ch = '2';           // the low ends behind the baselines
      else if (r === 27) ch = '1';                                            // the camera side's low fence
      else if (r >= 7 && r <= 24) ch = '_';                                   // the court
      if (r >= 6 && r <= 26 && c <= 1 && ch === '.') ch = ',';
      s += ch;
    }
    rows.push(s);
  }
  return rows;
};

/* the lines of a court, in court-local units (plan §6.1): 'out' the boundary, 'line' the paint, 'three' the arc and the
 * corner lines. The two ends mirror: x is the distance from the nearest baseline. */
const lineAt = (lx, ly) => {
  const w = 1.1;
  if (lx < -w || lx > CW + w || ly < -w || ly > CH + w) return null;
  if (lx < w || lx > CW - w || ly < w || ly > CH - w) return 'out';
  if (Math.abs(lx - MIDX) < w) return 'line';                                     // half-court
  if (Math.abs(Math.hypot(lx - MIDX, ly - MIDY) - 40) < w) return 'line';         // centre circle
  const x = lx <= MIDX ? lx : CW - lx;                                            // distance from the nearer baseline
  if (Math.abs(Math.hypot(x - 52, ly - MIDY) - 136) < w && ly >= 20 && ly <= 268) return 'three';   // the three-point arc
  if ((Math.abs(ly - 20) < w || Math.abs(ly - 268) < w) && x <= 108 + w) return 'three';            // the corner lines
  if (Math.abs(x - 152) < w && ly >= 96 && ly <= 192) return 'line';              // the free-throw line
  if ((Math.abs(ly - 96) < w || Math.abs(ly - 192) < w) && x <= 152) return 'line'; // the key's sides
  if (Math.abs(Math.hypot(x - 152, ly - MIDY) - 48) < w && x >= 152) return 'line'; // the free-throw circle
  return null;
};

/* the floor's tag to its color: the court's palette decides; grain and noise are E.hash2 and E.noise2 (so it never
 * flickers); the logo is a mask drawn in the floor's centre by the court painter */
const paintCourt = (court, x, y, tag) => {
  const lx = x - OX, ly = y - OY, n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5;
  if (tag === 'apron') { const g = 70 + n * 14 + m * 12; return [g * .9, g * .86, g]; }
  if (tag === 'edge') return [40 + n * 8, 38 + n * 8, 48 + n * 8];
  const pal = court.floor;
  const ln = lineAt(lx, ly);
  if (ln === 'out') return pal.out;
  if (ln === 'line') return pal.line;
  if (ln === 'three') return pal.three;
  const logo = court.logoMask ? court.logoMask(lx, ly) : null;
  if (logo) return logo;
  return pal.base(lx, ly, n, m);
};

/* a court's painter for TileMap's floorTex: floorTex(x, y, tag) in world units */
const floorPainter = court => (x, y, tag) => paintCourt(court, x, y, tag);

/* the arena's TileMap for a court: its floor painter and its walls' colors */
const buildArena = court => {
  const rows = arenaRows();
  const legend = { '4': 4, '3': 3, '2': 2, '1': 1, '.': { floor: 'apron' }, '_': { floor: 'court' }, ',': { floor: 'edge' } };
  const types = {
    1: { h: 12, face: 'stone', side: court.stand.low, top: court.stand.top, cut: true, cutH: 6 },
    2: { h: 24, face: 'stone', side: court.stand.mid, top: court.stand.top },
    3: { h: 36, face: 'stone', side: court.stand.high, top: court.stand.top },
    4: { h: 48, face: 'stone', side: court.stand.back, top: court.stand.top }
  };
  const map = new E.TileMap({ rows, legend, types, floorTex: floorPainter(court), outside: court.outside || '#1a1820', ao: 4 });
  return map;
};

/* ---- 21-court-draw.js ---- */
/* ---- COURT DRAWING (plan §9.3, §9.6): the hoops (the glass as a panel turned 30 degrees toward the camera, the rim as two
 * halves queued at different depths, the net as ten springy strands, the stanchion behind the board), the ball's sprite,
 * the crowd on the stands, and the lights. All world units, projected through r.w(). ---- */
const HOOP_ANG = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => i / 10 * TAU);
const HOOP_STATE = [0, 1].map(() => ({ bend: 0, bendV: 0, knot: HOOP_ANG.map(() => [0, 0, 0]) }));

/** a point on a hoop's ring at angle a (z 80), its front bent down by the spring */
const rimPoint = (side, a) => {
  const rm = RIMW[side], st = HOOP_STATE[side], sinA = Math.sin(a);
  return [rm.x + Math.cos(a) * RIM_R, rm.y + sinA * RIM_R, rm.z - st.bend * Math.max(0, sinA) * .8];
};
/** the hoops' springs (a hit bends the front of the ring; the knots of the net come back to rest) */
const stepHoops = dt => {
  for (const st of HOOP_STATE) {
    st.bendV += (-st.bend * 220 - st.bendV * 10) * dt; st.bend = clamp(st.bend + st.bendV * dt, -4, 4);
    for (const kn of st.knot) { kn[0] -= kn[0] * 30 * dt; kn[1] -= kn[1] * 30 * dt; kn[2] *= Math.exp(-6 * dt); }
  }
};
/** the ball pushes the net: a swish ripples the strand it passes */
const pushHoopNet = (side, x, y, strength) => {
  const rm = RIMW[side], st = HOOP_STATE[side], dx = x - rm.x, dy = y - rm.y;
  if (Math.hypot(dx, dy) > 9.5) return;
  const a = Math.atan2(dy, dx), k = Math.round(((a + TAU) % TAU) / TAU * HOOP_ANG.length) % HOOP_ANG.length, kn = st.knot[k];
  kn[2] -= strength; kn[0] += Math.cos(a) * strength * .4; kn[1] += Math.sin(a) * strength * .4;
};
on('goal', ev => pushHoopNet(ev.rim, ev.x, ev.y, 12));
on('rim', ev => { if (ev.rim !== undefined) HOOP_STATE[ev.rim].bendV += (ev.speed || 80) * .02; });

/** the glass: the point on the board at t (-1 far edge .. 1 near edge) and z, in world units. The board's plane is x = bx;
 * its near edge sits 12 toward the camera's side (x) and 20.8 toward it (y): a panel turned 30 degrees */
const glassPt = (side, t, z) => [BOARD_PLANE[side] + (side ? 12 : -12) * t, RIMW[side].y + 20.8 * t, z];

/** the ring's half from the front (sin > 0) or the back, drawn as a 2-pixel orange line with a light tip */
const drawRimHalf = (r, g, side, front) => {
  let prev = null;
  for (let i = 0; i <= 16; i++) {
    const a = i / 16 * TAU, sinA = Math.sin(a);
    if (front ? sinA < 0 : sinA >= 0) { prev = null; continue; }
    const q = r.w(...rimPoint(side, a));
    if (prev) px.line(g, prev[0], prev[1], q[0], q[1], '#ff7a2a', 2);
    if (front) px.dot(g, q[0], q[1] - 1, '#ffb060');
    prev = q;
  }
};
/** the net strands on one half: from the ring to the lower ring (radius 5.5, z 66), a knot in the middle, pushed by the ball */
const drawHoopNet = (r, g, side, front) => {
  const rm = RIMW[side], st = HOOP_STATE[side];
  HOOP_ANG.forEach((a, k) => {
    if (front ? Math.sin(a) < 0 : Math.sin(a) >= 0) return;
    const top = rimPoint(side, a), bot = [rm.x + Math.cos(a) * 5.5, rm.y + Math.sin(a) * 5.5, 66], kn = st.knot[k];
    const mid = [(top[0] + bot[0]) / 2 + kn[0], (top[1] + bot[1]) / 2 + kn[1], (top[2] + bot[2]) / 2 + kn[2]];
    const p0 = r.w(...top), p1 = r.w(...mid), p2 = r.w(...bot);
    px.line(g, p0[0], p0[1], p1[0], p1[1], '#f4f4f8', 1);
    px.line(g, p1[0], p1[1], p2[0], p2[1], '#f4f4f8', 1);
  });
};

/** a hoop: the stanchion behind the board, the glass (screen blend, a white frame, the shooter's orange square), the rim
 * and the net in back and front halves, so the ball sorts between them (a ball at the ring's centre is between) */
const drawHoop = (r, side) => {
  const rm = RIMW[side], bx = BOARD_PLANE[side], poleX = bx + (side ? 8 : -8);
  r.queue(poleX, rm.y, 0, g => {
    const p0 = r.w(poleX, rm.y, 0), p1 = r.w(poleX, rm.y, 72), a1 = r.w(bx, rm.y, 74);
    px.line(g, p0[0], p0[1], p1[0], p1[1], '#8a8c98', 3);
    px.line(g, p1[0], p1[1], a1[0], a1[1], '#b8bcc8', 2);
  }, { bias: -2 });
  r.queue(bx, rm.y, 86, g => {
    const poly = [glassPt(side, 1, 100), glassPt(side, -1, 100), glassPt(side, -1, 72), glassPt(side, 1, 72)].map(p => r.w(...p));
    px.blend(g, .28, 'screen', () => px.poly(g, poly, '#a8e8ff'));
    for (let i = 0; i < 4; i++) { const a = poly[i], b = poly[(i + 1) % 4]; px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1); }
    const sq = [glassPt(side, .25, 92), glassPt(side, -.25, 92), glassPt(side, -.25, 82), glassPt(side, .25, 82)].map(p => r.w(...p));
    for (let i = 0; i < 4; i++) { const a = sq[i], b = sq[(i + 1) % 4]; px.line(g, a[0], a[1], b[0], b[1], '#ff7a2a', 1); }
  }, { bias: -1 });
  r.queue(rm.x, rm.y - 6, rm.z, g => { drawRimHalf(r, g, side, false); drawHoopNet(r, g, side, false); }, { bias: -3 });
  r.queue(rm.x, rm.y + 6, rm.z, g => { drawRimHalf(r, g, side, true); drawHoopNet(r, g, side, true); }, { bias: 3 });
};

/* ---- THE BALL'S SPRITE: 9 x 9 with seams, four rotation frames advanced by its roll ---- */
const BALL_SPR = [
  E.sprite(['..kkkkk..', '.kooooook.', 'koooOooook', 'koOoOoooko', 'koooooOoko', 'koOooooOko', 'koooOooook', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'kooookoook', 'koOkooooko', 'kookkkOoko', 'koOoookooko', 'kooookoook', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'kooOooookk', 'kooOokooko', 'koooookooo', 'kkooOokooo', 'koooooooOo', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' }),
  E.sprite(['..kkkkk..', '.kooooook.', 'koookOooook', 'kooookoOko', 'kkookkoooko', 'koOooooooko', 'koooooooOko', '.kooooook.', '..kkkkk..'], { k: '#2a1408', o: '#e0661e', O: '#ff9a4a' })
];
const ballSprite = b => BALL_SPR[Math.floor(b.roll / 6) & 3];

/** the crowd on the stands (plan §9.6): one small figure per stand tile and tier, in the court's colors, bobbing */
const buildCrowd = court => {
  const out = [], R = E.rng(court.id.length * 97 + 5);
  const tiers = [{ row: 0, z: 48 }, { row: 1, z: 48 }, { row: 2, z: 36 }, { row: 3, z: 36 }, { row: 4, z: 24 }, { row: 5, z: 12 }];
  for (const t of tiers) for (let c = 2; c < ARENA_COLS - 2; c += 1) {
    if (R() < .18) continue;
    out.push({ x: c * TILE + 4 + R() * 8, y: t.row * TILE + 9, z: t.z, shirt: court.crowd[(R() * court.crowd.length) | 0], skin: court.skin[(R() * court.skin.length) | 0], ph: R() * 6 });
  }
  return out;
};
const crowdSpr = {};
const crowdSprite = (shirt, skin) => {
  const key = shirt + skin; if (crowdSpr[key]) return crowdSpr[key];
  return (crowdSpr[key] = E.sprite(['.hhh.', 'hhhhh', 'shhhs', '.sss.', 'bbbbb', 'bbbbb', 'b.b.b'], { h: '#2a1a14', s: skin, b: shirt }));
};
/** the crowd: each figure's bob comes from the time and its phase; the home side's misses slump, dunks jump (later) */
const drawCrowd = (r, court) => {
  if (!S.crowd) S.crowd = buildCrowd(court);
  const t = game.time || 0;
  for (const f of S.crowd) {
    const bob = Math.round(Math.sin(t * 3 + f.ph) * 1);
    r.sprite(f.x, f.y, f.z, crowdSprite(f.shirt, f.skin), { anchor: 'bottom' });
  }
};

/** the whole court in one draw: the sky, the floor, the stands and walls, the hoops, the crowd, the players and the ball */
const drawCourt = (r, court) => {
  r.sky(court.sky);
  S.map.drawFloor(r);
  S.map.queueWalls(r);
  drawHoop(r, 0); drawHoop(r, 1);
  drawCrowd(r, court);
  for (const p of S.players) {
    if (!p.onCourt) continue;
    r.shadow(p.body.x, p.body.y, 7, .5, '#0c0818', 0);
    r.actor(p.body.x, p.body.y, p.body.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
  }
  const b = S.ball;
  r.shadow(b.x, b.y, 4.5, .45, '#0c0818', 0);
  r.sprite(b.x, b.y, b.z, ballSprite(b), { anchor: 'center' });
};

/* ---- 22-twists.js ---- */
/* ---- THE TWISTS (plan §10.1, §6.15): each court's own hazard, the Jackpot Spot, the power-ups' spawns and pickups, the
 * Blambots' overclock and reboot, and the Dome's pyro. Every timer is tuned by hazardInterval; every effect is a rule
 * the match reads (the shot's chance, the ball's push, the player's speed, a knockdown), with its own drawing. ---- */
const TWIST_OF = { skybox: 'jackpot', pier: 'wind', scrapyard: 'slick', caldera: 'eruption', dome: 'boss' };
const twistOf = () => (COURTS[S.court] && COURTS[S.court].twist) || 'none';
/** the twists this match has: the court's own, and the Jackpot Spot on every court when the setting says so */
const twistsOn = () => S.twistsOn !== false && !S.cheats.noTwists;

/** a match's twists at its start: the Jackpot's first place, the slicks, the timers (§10.1) */
const twistStart = () => {
  const k = twistOf(), c = CENTRE(), R = S.rng;
  S.twist = { kind: k, wind: 0, windT: 0, gustNext: 4 + R() * 6, slicks: [], erupt: 0, eruptNext: 12 + R() * 10, vents: [{ x: OX + 200, y: OY + 60, t: 0, on: false }, { x: OX + 440, y: OY + 228, t: 2.5, on: false }], bombs: [], reboot: 0, overclock: null, jackpot: null, jackT: 0, bots: {} };
  if (k === 'slick') { S.twist.slicks = [0, 1, 2].map(() => { const x = OX + 120 + R() * 400, y = OY + 60 + R() * 170; return { x, y, r: 20 + R() * 16 }; }); }
  if (k === 'jackpot' || setting('jackpot') === 'On') { const rim = R() < .5 ? 0 : 1; S.twist.jackpot = { x: RIMW[rim].x + (rim ? -1 : 1) * (60 + R() * 60), y: RIMW[rim].y + (R() - .5) * 60, t: 0, life: 20, rim }; }
  if (k === 'boss') S.twist.overclock = null;
};
/** the twists' step: the wind's gusts, the eruption's telegraphs, the vents' puffs, the jackpot's moves, the boss */
const twistStep = dt => {
  const T = S.twist; if (!T || !S.match || S.match.over) return;
  if (!twistsOn()) return;
  const H = tune('hazardInterval');
  if (T.kind === 'wind') {
    T.gustNext -= dt;
    if (T.gustNext <= 0 && T.windT <= 0) { T.windT = 4; T.windDir = S.rng() < .5 ? 1 : -1; T.gustNext = (15 + S.rng() * 10) * H; emit('twist', { kind: 'gust' }); caption('gust', {}, 'DEE DEE'); }
    if (T.windT > 0) { T.windT -= dt; T.wind = T.windDir * Math.min(1, T.windT > 3.5 ? (4 - T.windT) * 2 : 1) * (T.windT < 1 ? T.windT : 1); } else T.wind = 0;
  }
  if (T.kind === 'eruption') {
    T.eruptNext -= dt;
    if (T.eruptNext <= 0) { T.eruptNext = (25 + S.rng() * 10) * H; T.erupt = 1.2; emit('twist', { kind: 'eruption' }); caption('eruption', {}, 'VINNIE'); T.bombs = [{ x: S.ball.x, y: S.ball.y, t: -1.2 }, { x: CENTRE().x + (S.rng() - .5) * 200, y: CENTRE().y + (S.rng() - .5) * 120, t: -1.2 }, { x: CENTRE().x + (S.rng() - .5) * 200, y: CENTRE().y + (S.rng() - .5) * 120, t: -1.2 }]; }
    if (T.erupt > 0) T.erupt -= dt;
    for (const b of T.bombs || []) { b.t += dt; if (b.t >= 0 && !b.hit) { b.hit = true; for (const p of S.players) if (p.onCourt && Math.hypot(p.body.x - b.x, p.body.y - b.y) < 22) { knockDown(p, .8); if (S.ball.owner === p) { releaseLoose(S.ball); S.ball.vz = 60; S.ball.state = 'loose'; } } emit('bomb', { x: b.x, y: b.y }); } }
    T.bombs = (T.bombs || []).filter(b => b.t < 1.4);
    for (const v of T.vents) { v.t -= dt; if (v.t <= 0) { v.on = !v.on; v.t = v.on ? 2 : 3; } }
  }
  if (T.kind === 'jackpot' || T.jackpot) {
    if (T.jackpot) { T.jackpot.t += dt; if (T.jackpot.t >= T.jackpot.life) { const rim = T.jackpot.rim; T.jackpot = { x: RIMW[rim].x + (rim ? -1 : 1) * (60 + S.rng() * 60), y: RIMW[rim].y + (S.rng() - .5) * 60, t: 0, life: 20, rim }; } }
  }
  if (T.kind === 'boss') {
    const bots = S.players.filter(p => p.team && p.team.boss && p.onCourt);
    if (bots.length) {
      const q4 = S.match.quarter === 4 && !T.oc4;
      const trailing = S.match.quarter === 3 && (S.match.score[0] - S.match.score[1] >= 8 || S.match.score[1] - S.match.score[0] >= 8) && !T.oc3;
      if (q4 || trailing) { if (q4) T.oc4 = true; else T.oc3 = true; overclockOn(); }
      if (T.overclock) { T.overclock.t -= dt; if (T.overclock.t <= 0) { T.overclock = null; for (const p of bots) endNova(p, 'overclock'); } }
    }
    for (const p of bots) { if (p.reboot > 0) continue; }
  }
};
/** the boss's overclock (§10.1): both bots go Supernova for 30 s; the overclock music layer is the music's */
const overclockOn = () => { const bots = S.players.filter(p => p.team && p.team.boss && p.onCourt); S.twist.overclock = { t: 30 }; for (const p of bots) { if (!p.nova) igniteNova(p); p.novaT = 0; } emit('twist', { kind: 'overclock' }); caption('boss', {}, 'DEE DEE'); banner('OVERCLOCK!', 'SUPERNOVA'); return true; };
/** a bot knocked down twice within ten seconds short-circuits for three seconds (SYSTEM REBOOT) */
const bootKnock = p => {
  if (!p.team || !p.team.boss || S.netReplay) return;   // (a bot's reboot)
  const now = S.match.t, hist = (S.twist.bots[p.slot] = (S.twist.bots[p.slot] || []).filter(t => now - t < 10));
  hist.push(now);
  if (hist.length >= 2) { hist.length = 0; p.reboot = 3; knockDown(p, 3); emit('reboot', { slot: p.slot }); banner('SYSTEM REBOOT!', 'SHATTERED'); caption('reboot', { TEAM: p.team.name }, 'DEE DEE'); }
};
on('knockdown', ev => { const p = S.players[ev.slot]; if (p) bootKnock(p); });
/** the vent launch: a handler on a puffing vent in its offensive half, pressing shoot with turbo, is launched into the VOLCANO
 * LAUNCH dunk (§10.1); a defender on a puffing vent jumps a SUPER BLOCK */
const ventAt = p => (S.twist.vents || []).find(v => v.on && Math.hypot(p.body.x - v.x, p.body.y - v.y) < 40);
const ventLaunch = () => { const p = S.players.find(q => q.onCourt && q.hasBall && ventAt(q)); if (!p) return false; startDunk(p, { kind: get('dunk', 'volcano'), vent: true }); return true; };

/** the Jackpot Spot's rule for a shot: the shooter's feet in the ring at release (a made jump shot scores +2) */
const jackpotHit = p => { const J = S.twist.jackpot; return !!J && Math.hypot(p.body.x - J.x, p.body.y - J.y) < 16; };

/* ---- the power-ups: the spawner (one on the floor at a time, every powerupInterval ± 6 s, lasting 10 s) and the pickup ---- */
const powerupStep = dt => {
  if (!S.powerupsOn || !S.match || S.match.over || S.match.phase !== 'live') return;
  if (S.cheats.powerEvery5 && !S.powerups.length) S.puT = Math.max(S.puT || 0, 5);
  S.puT = (S.puT === undefined ? tune('powerupInterval') : S.puT) - dt;
  for (const q of S.powerups) { q.t += dt; if (q.t > 10) q.gone = true; }
  S.powerups = S.powerups.filter(q => !q.gone);
  if (S.puT <= 0 && S.powerups.length < 1) {
    S.puT = tune('powerupInterval') + (S.rng() - .5) * 12;
    const list = all('powerup'), pu = list[(S.rng() * list.length) | 0], x = CENTRE().x + (S.rng() - .5) * 320, y = CENTRE().y + (S.rng() - .5) * 150;
    S.powerups.push({ id: pu.id, x, y, t: 0 }); emit('powerupSpawn', { id: pu.id, x, y });
  }
  for (const q of S.powerups) for (const p of S.players) {
    if (!p.onCourt || Math.hypot(p.body.x - q.x, p.body.y - q.y) > 12) continue;
    const pu = get('powerup', q.id);
    if (p.pu && p.pu.id) { const old = get('powerup', p.pu.id); if (old && old.remove) old.remove(p); }
    pu.apply(p); p.pu = { id: pu.id, icon: pu.icon, color: pu.color, t: pu.seconds };
    q.gone = true; emit('powerupPick', { slot: p.slot, id: pu.id });
    banner(pu.name, 'PICKPOCKET'); caption(PU_LINE[pu.id], { NAME: p.name }, 'VINNIE');
  }
  for (const p of S.players) if (p.pu) { p.pu.t -= dt; if (p.pu.t <= 0) { const old = get('powerup', p.pu.id); if (old && old.remove) old.remove(p); p.pu = null; emit('powerupEnd', { slot: p.slot }); } }
};

/* ---- 30-ball.js ---- */
/* ---- THE BALL (plan §6.6): one custom point body in world units. States: 'held' and 'dribble' (its owner's hands), 'pass'
 * and 'shot' (flying), 'loose' (free physics), 'dead' (scripted), 'inbound'. Gravity, a floor bounce, the arena's walls, the
 * two glass planes, the rim (a torus) and the basket test are here; a shot's outcome is decided at release (match.js
 * and actions.js) and only then flown, so the made rate is the decided rate. Near a rim the ball takes 4 substeps. ---- */
const RIMW = [{ x: OX + RIM[0].x, y: OY + RIM[0].y, z: RIM[0].z, side: 0 }, { x: OX + RIM[1].x, y: OY + RIM[1].y, z: RIM[1].z, side: 1 }];
const BOARD_PLANE = [OX + BOARD_X[0], OX + BOARD_X[1]];
const BOARD_YR = [OY + BOARD_Y[0], OY + BOARD_Y[1]], BOARD_ZR = BOARD_Z;
const newBall = () => ({
  x: OX + MIDX, y: OY + MIDY, z: BALL_R, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, spin: 0, roll: 0,
  scored: [false, false], shot: null, trail: [], bounces: 0, rimHit: 0, boardHit: 0, lastTouch: null, onFloor: true, inNet: 0
});
const ballWind = () => (S.twist.wind || 0) * tune('windStrength');   // S.twist.wind is -1..1; the ball's push is that times windStrength

/** the ball at rest at (x, y), dead: a centre jump, a scripted moment */
const ballPlace = (b, x, y, z = BALL_R) => Object.assign(b, { x, y, z, vx: 0, vy: 0, vz: 0, state: 'dead', owner: null, spin: 0, shot: null, onFloor: z <= BALL_R + .01 });

/** one physics substep of h seconds: gravity, the floor, the walls, the glass, the rim, the basket */
const ballSubstep = (b, h, rimBounce, boardBounce, ballBounce) => {
  const g = tune('ballGravity') * (S.cheats && S.cheats.moonGravity ? .55 : 1), R = BALL_R;
  const pz = b.z, px = b.x;
  b.vz -= g * h;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  // the floor
  if (b.z < R) {
    b.z = R;
    if (b.vz < 0) {
      const impact = -b.vz;
      b.vz = -b.vz * ballBounce; b.bounces++;
      b.vx *= .985; b.vy *= .985;
      if (impact > 40) emit('bounce', { x: b.x, y: b.y, z: b.z, speed: impact, ball: true });
      if (b.vz < 16) { b.vz = 0; b.onFloor = true; }
    }
    if (b.vz === 0) { const f = Math.exp(-h * 1.6); b.vx *= f; b.vy *= f; }
  }
  // the invisible walls, 24 outside the lines
  if (b.x < PLAY_X[0] + R) { b.x = PLAY_X[0] + R; b.vx = Math.abs(b.vx) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.x > PLAY_X[1] - R) { b.x = PLAY_X[1] - R; b.vx = -Math.abs(b.vx) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.y < PLAY_Y[0] + R) { b.y = PLAY_Y[0] + R; b.vy = Math.abs(b.vy) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  if (b.y > PLAY_Y[1] - R) { b.y = PLAY_Y[1] - R; b.vy = -Math.abs(b.vy) * .5; emit('wall', { x: b.x, y: b.y, z: b.z }); }
  // the glass: the plane seen from the court side; a board is hit from its court side only
  for (const s of [0, 1]) {
    const pl = BOARD_PLANE[s], inY = b.y > BOARD_YR[0] - R && b.y < BOARD_YR[1] + R, inZ = b.z > BOARD_ZR[0] - R && b.z < BOARD_ZR[1] + R;
    if (!inY || !inZ) continue;
    if (s === 0 && px >= pl + R && b.x < pl + R) { b.x = pl + R; b.vx = Math.abs(b.vx) * boardBounce; b.boardHit = S.seq; emit('backboard', { x: pl, y: b.y, z: b.z, side: s, speed: Math.abs(b.vx) }); }
    if (s === 1 && px <= pl - R && b.x > pl - R) { b.x = pl - R; b.vx = -Math.abs(b.vx) * boardBounce; b.boardHit = S.seq; emit('backboard', { x: pl, y: b.y, z: b.z, side: s, speed: Math.abs(b.vx) }); }
  }
  // the rims: a torus, ring radius 9, tube 1.2, at z 80
  for (const rm of RIMW) {
    let dx = b.x - rm.x, dy = b.y - rm.y, L = Math.hypot(dx, dy);
    if (L < 1e-4) { dx = 1; dy = 0; L = 1; }   // dead over the centre: any point of the ring is as near (and the ball falls through)
    const qx = rm.x + dx / L * RIM_R, qy = rm.y + dy / L * RIM_R, qz = rm.z;
    let ux = b.x - qx, uy = b.y - qy, uz = b.z - qz; const D = Math.hypot(ux, uy, uz);
    if (D < R + RIM_TUBE && D > 1e-6) {
      ux /= D; uy /= D; uz /= D;
      const reach = R + RIM_TUBE;
      // a made shot (aimed through the hoop) is rattled in, not thrown out: its horizontal pull toward the centre wins
      const d2 = Math.hypot(b.x - rm.x, b.y - rm.y);
      const pull = b.shot && b.shot.made && d2 < RIM_R + 3 && b.vz < 0;
      b.x = qx + ux * reach; b.y = qy + uy * reach; b.z = qz + uz * reach;
      const vn = b.vx * ux + b.vy * uy + b.vz * uz;
      if (vn < 0) {
        const k = 1 + (pull ? .12 : tune('rimBounce'));
        b.vx -= k * vn * ux; b.vy -= k * vn * uy; b.vz -= k * vn * uz;
        if (pull) { b.vx += -(b.x - rm.x) * 1.2; b.vy += -(b.y - rm.y) * 1.2; }   // the rattle: the hoop's middle reaches for it
        b.rimHit = S.seq; emit('rim', { x: b.x, y: b.y, z: b.z, speed: -vn, rim: rm.side });
      }
    }
    // the basket: the centre crosses z 80 downward within 6.75 of the rim; once per pass (the flag holds until it is below 60)
    const dd = Math.hypot(b.x - rm.x, b.y - rm.y);
    if (!b.scored[rm.side] && pz > rm.z && b.z <= rm.z && b.vz < 0 && dd < 6.75) { b.scored[rm.side] = true; emit('goal', { rim: rm.side, x: b.x, y: b.y, z: b.z, ball: b }); }
    if (b.scored[rm.side] && b.z < 60) b.scored[rm.side] = false;
    // the net: a slower fall through it
    if (b.z < rm.z && b.z > 66 && dd < 6) { b.vz *= Math.exp(-h * 3.2); b.inNet = 1; } else if (b.z > 66 && dd > 6) { b.inNet = 0; }
  }
};

/** one step of the ball: attached to its owner (the owner's hands place it), or flying with substeps near the rims */
const ballStep = (b, dt) => {
  if (b.state === 'held' || b.state === 'dribble') { b.roll += Math.hypot(b.vx, b.vy) * dt; return; }
  if (b.state === 'dead' || b.state === 'inbound') { b.vx = b.vy = b.vz = 0; return; }
  const near = RIMW.some(rm => Math.hypot(b.x - rm.x, b.y - rm.y) < 40 && Math.abs(b.z - rm.z) < 40);
  const n = near ? 4 : 1, h = dt / n;
  const sx = b.x, sy = b.y, hit0 = [b.rimHit, b.boardHit, b.bounces];
  const wind = ballWind();
  if (b.shot) b.shot.age += dt;
  for (let i = 0; i < n; i++) {
    if (wind && b.z > BALL_R + 1) b.vx += wind * h;
    if (b.spin && Math.hypot(b.vx, b.vy) > 20) { const sp = Math.hypot(b.vx, b.vy), k = b.spin * h; b.vx += -b.vy / sp * k * sp; b.vy += b.vx / sp * k * sp; b.spin *= Math.exp(-h * 1.4); }
    ballSubstep(b, h, tune('rimBounce'), tune('boardBounce'), tune('ballBounce'));
  }
  b.roll += Math.hypot(b.x - sx, b.y - sy);
  b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
  // a missed shot that touches the ring, the glass or the floor is loose now; a made one stays a shot until it goes in
  // a shot is resolved on the floor, or on the ring or glass when it was a miss; a shot still in the air after 5 s is
  // resolved too (a flight that never counts must not hold the quarter open)
  const missHit = !b.shot || !b.shot.made ? (b.rimHit !== hit0[0] || b.boardHit !== hit0[1]) : false;
  if (b.state === 'shot' && b.shot && (missHit || b.bounces !== hit0[2] || b.shot.age > 5)) {
    b.state = 'loose'; b.shot.resolved = true; if (S.match && S.match.shotsInFlight > 0) S.match.shotsInFlight--;
  }
};

/** a shot's flight: solved so the ball reaches the target (x, y, z) with the wind's push, at apex height above the release */
const ballFlight = (from, to, apex) => {
  const g = tune('ballGravity'), wind = ballWind();
  const arc = E.arc(from, to, g, { apex });
  const t = arc.t || .6;
  return { vx: (to.x - from.x - .5 * wind * t * t) / t, vy: (to.y - from.y) / t, vz: arc.vz, t };
};

/** let the ball go: from, with velocity (vx, vy, vz), tagged as a shot record (or null for a pass) */
const ballRelease = (b, from, v, state, rec) => {
  Object.assign(b, { x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, state, owner: null, spin: 0, shot: rec || null, onFloor: false, bounces: 0 });
  b.scored = [false, false]; b.trail.length = 0;
  return b;
};

/** a ball that touches nothing for a while after a loose state is 'dead' again (the match takes it) */
const ballSettled = b => Math.hypot(b.vx, b.vy) < 6 && b.z <= BALL_R + .5 && (b.state === 'loose' || b.state === 'pass');

/* ---- 31-player.js ---- */
/* ---- THE PLAYERS (plan §6.4–6.5, §6.14, §7.4): one entity per slot (0–1 HOME, 2–3 AWAY). A player is a body on the arena
 * (E.Body, radius 6), a dressed rig, the command it reads this step (from its input source: a human, a CPU brain, the
 * network or a script), its turbo, its juice, its heat streak, and its state. Ratings scale every effect (§6.4). ---- */
const SLOTS = 4;
const HOME = 0, AWAY = 1;
const emptyCmd = () => ({ move: [0, 0], shoot: { down: false, pressed: false, released: false }, pass: { pressed: false }, turbo: { down: false },
  shove: { pressed: false }, oop: { pressed: false }, taunt: { pressed: false } });

/** a rig dressed for a player: the team's colors (jersey, trim, shorts, sneakers, socks), the player's build and hair */
const dressRig = (def, team) => {
  const r = def.rig || {};
  const colors = {
    skin: r.skin || '#c89070', hair: r.hairColor || '#1a1a1a', cloth: team.colors.jersey, trim: team.colors.trim,
    pants: team.colors.shorts, boot: team.colors.sneaker, glove: team.colors.trim, belt: team.colors.shorts, sock: team.colors.sock
  };
  if (r.robot) { colors.skin = r.skin || '#c8d0dc'; colors.cloth = team.colors.jersey; colors.metal = '#c8d0dc'; colors.plate = '#8a94a8'; colors.eye = r.visor; }
  const opts = { size: r.size || 1.7, build: r.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: 'none', colors, shorts: { len: .55, sock: team.colors.sock, sockLen: .35 } };
  if (r.hair) opts.hair = r.hair;
  if (r.hat) opts.hat = r.hat;
  if (r.cap) opts.hat = { style: 'cap', color: r.cap };
  if (r.legs) opts.legs = r.legs;
  if (r.hunch) opts.hunch = r.hunch;
  return new E.Humanoid(opts);
};

/** a player's entity in its slot. team: the side's team id; def: the player's data. */
const makePlayer = (slot, defId, side) => {
  const def = playerDef(defId), team = teamDef(def.team);
  const body = new E.Body({ x: 0, y: 0, r: 6, friction: 0, bounce: 0, gravity: tune('playerGravity') });
  return {
    slot, side, id: defId, def, team, name: def.name, number: def.number, size: def.rig.size || 1.7,
    body, rig: dressRig(def, team), cmd: emptyCmd(), input: null, brain: null, human: false, device: null,
    face: side === HOME ? 0 : PI, state: 'run', stateT: 0, turbo: 1, juice: 1, heat: 0, nova: false, novaT: 0,
    pu: null, pu2: null, stats: { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, dunks: 0, reb: 0, ast: 0, stl: 0, blk: 0, knock: 0, shatter: 0, novas: 0 },
    cool: { shove: 0, steal: 0, spin: 0, block: 0, pass: 0 }, onCourt: true, bench: false, shot: null, dunk: null, knocked: 0, hang: null,
    z: 0, vz: 0, air: false, lastTouch: 0, lastStep: 0, dribbleT: 0, dribbleHand: 1, taunt: null, celebrate: null, shove: null, spinT: 0,
    fumble: 0, reboot: 0, dizzy: 0, glue: false, goldBall: false, rocket: 0, laser: 0, moon: 0, bomb: false, lx: 0, ly: 0
  };
};

/** place a player's body at a world point (feet), facing an angle */
const placePlayer = (p, x, y, face) => { p.body.x = x; p.body.y = y; p.body.z = 0; p.body.vx = p.body.vy = p.body.vz = 0; p.z = 0; if (face !== undefined) p.face = face; p.state = 'run'; p.stateT = 0; p.shot = null; p.dunk = null; p.hang = null; };

/** a player's speed right now: ZOOM (§6.4), juice (§6.14), turbo, power-ups and Supernova (§6.5, §6.12, §6.15) */
const playerSpeed = p => {
  let s = tune('runSpeed') * (.86 + .028 * p.def.ratings.zoom) * juiceFactor(p);
  if (p.turbo > 0 && p.cmd.turbo.down && p.turboOn) s *= tune('turboMult');
  if (p.rocket > 0) s *= 1.4;
  if (p.nova && p.turbo > 0 && p.cmd.turbo.down) s *= 1.05;
  return s;
};
/** the juice factor (§6.14): 0.85 + 0.15 × juice multiplies the ratings' effects */
const juiceFactor = p => .85 + .15 * p.juice;
/** a rating's value (1..10) of a player, with a Blambot's or a power-up's bonus where it applies */
const rate = (p, key) => p.def.ratings[key] || 5;

/** the arena's clamp: the invisible walls, 24 outside the lines (plan §6.1) */
const clampToArena = p => {
  p.body.x = clamp(p.body.x, PLAY_X[0] + 4, PLAY_X[1] - 4);
  p.body.y = clamp(p.body.y, PLAY_Y[0] + 4, PLAY_Y[1] - 4);
};

/** the player's turbo (§6.5): held and moving drains; otherwise it refills after the delay. Supernova is unlimited. */
const turboStep = (p, dt, moving) => {
  if (p.nova || (S.cheats && S.cheats.infTurbo)) { p.turbo = 1; p.turboOn = !!(p.cmd.turbo.down && moving); return; }   // (Supernova and the INFINITE TURBO code)
  const want = !!(p.cmd.turbo.down && moving && p.turbo > 0);
  p.turboOn = want;
  if (want) { p.turbo = Math.max(0, p.turbo - tune('turboDrain') * dt * (p.rocket > 0 ? .8 : 1)); p.idle = 0; }
  else { p.idle = (p.idle || 0) + dt; if (p.idle > tune('turboRefillDelay')) p.turbo = Math.min(1, p.turbo + tune('turboRefill') * dt * (p.rocket > 0 ? 2 : 1)); }
};

/** a player's power-ups' clocks (§6.15): they count down, and end themselves */
const powerTick = (p, dt) => {
  if (p.rocket > 0) p.rocket = Math.max(0, p.rocket - dt);
  if (p.moon > 0) p.moon = Math.max(0, p.moon - dt);
  if (p.laser > 0) p.laser = Math.max(0, p.laser - dt);
  if (p.glue > 0) p.glue = Math.max(0, p.glue - dt);
  if (p.goldBall > 0) p.goldBall = Math.max(0, p.goldBall - dt);
  if (p.reboot > 0) p.reboot = Math.max(0, p.reboot - dt);
  if (p.dizzy > 0) p.dizzy = Math.max(0, p.dizzy - dt);
  for (const k of ['shove', 'steal', 'spin', 'block', 'pass']) if (p.cool[k] > 0) p.cool[k] = Math.max(0, p.cool[k] - dt);
};

/** a body's knockdown (§6.10): it goes down for a time; the rig lies, then gets up on its own */
const knockDown = (p, secs) => {
  p.knocked = Math.max(p.knocked, secs); p.state = 'knocked'; p.stateT = 0; p.shot = null; p.dunk = null;
  p.juice = Math.max(0, p.juice - .06); p.stats.knock++;
  if (p.bomb) p.bomb = false;
};

/* ---- 32-anim.js ---- */
/* ---- THE POSE LAYER (plan §7.1): the engine's own rig, posed by math each step; on top of it the right hand goes where the
 * ball is: held at the chest, low for the dribble, overhead for the shot and the dunk, both hands up for the rebound. The
 * target is in the rig's own frame at size 1 (forward, right, up), and the arm is solved by E.ik3. The ball then rides the
 * real hand (rig.hand), so a ball can't float away from the player who holds it. ---- */
const POSE_TARGET = {
  hold: [5, 2, 15], dribble: [4, 3, 8], shoot: [3, 1, 34], dunk: [6, 0, 40], rebound: [3, 2, 40], guard: [4, 4, 16], low: [2, 4, 4]
};
/** the layer: wraps the rig's solvePose once; the target (set by rigState) is read at each pose */
const poseLayer = rig => {
  if (rig.bbPoseWrapped) return rig;
  rig.bbPoseWrapped = true;
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const T = this.bbPose; if (!T || !this.J || !this.J.shR) return;
    const sz = this.o.size || 1, sh = this.J.shR, L1 = (this.o.armUpper || 9) * sz, L2 = (this.o.armLower || 8) * sz;
    const target = [T[0] * sz, -T[1] * sz, T[2] * sz];
    const [elbow, hand] = E.ik3(sh, target, L1, L2, [-1, .7, -.2]);
    this.J.elbowR = elbow; this.J.handR = hand;
    if (this.bbPoseL && this.J.shL) {   // the clip's left hand (§7.3)
      const tl = [this.bbPoseL[0] * sz, -this.bbPoseL[1] * sz, this.bbPoseL[2] * sz];
      const [el2, h2] = E.ik3(this.J.shL, tl, L1, L2, [-1, -.7, -.2]);
      this.J.elbowL = el2; this.J.handL = h2;
    }
  };
  return rig;
};
/* the dunks' hand keys (§7.3, §10.3): [progress u, target] pairs, interpolated; the hand's path is the dunk's own */
const DUNK_KEYS = {
  hammer: [[0, [4, 3, 16]], [.5, [5, 1, 34]], [.9, [8, 0, 26]]],
  tomahawk: [[0, [4, 3, 16]], [.3, [-2, 3, 42]], [.7, [-2, 2, 44]], [.88, [8, 0, 30]]],
  doublepump: [[0, [4, 3, 16]], [.3, [3, 2, 12]], [.45, [4, 2, 34]], [.6, [3, 2, 12]], [.75, [4, 2, 34]], [.9, [8, 0, 28]]],
  reverse: [[0, [4, 3, 16]], [.4, [-5, 1, 40]], [.7, [-3, 0, 42]], [.9, [6, 0, 30]]],
  windmill: [[0, [4, 3, 16]], [.3, [0, 6, 14]], [.55, [-4, 5, 36]], [.8, [3, 2, 46]], [.9, [8, 1, 30]]],
  threesixty: [[0, [4, 3, 16]], [.3, [3, 4, 30]], [.6, [0, 2, 40]], [.9, [8, 0, 30]]],
  ftflyer: [[0, [4, 3, 16]], [.5, [4, 2, 42]], [.9, [9, 0, 32]]],
  flip: [[0, [4, 3, 16]], [.4, [2, 2, 44]], [.9, [8, 0, 30]]],
  rattler: [[0, [4, 3, 16]], [.6, [5, 1, 38]], [.9, [8, 0, 28]]],
  nova720: [[0, [4, 3, 16]], [.4, [-2, 4, 40]], [.9, [8, 0, 30]]],
  volcano: [[0, [4, 3, 16]], [.5, [-3, 2, 44]], [.9, [9, 0, 30]]],
  quake: [[0, [4, 3, 16]], [.6, [2, 2, 46]], [.9, [9, 0, 26]]]
};
const dunkPoseAt = (kind, u) => {
  const keys = DUNK_KEYS[kind] || [[0, POSE_TARGET.dunk]];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) { const [u0, a] = keys[i - 1], [u1, b] = keys[i], f = (u - u0) / Math.max(1e-6, u1 - u0); return a.map((v, j) => lerp(v, b[j], f)); }
  }
  return keys[keys.length - 1][1];
};
/** the clip playing for a player now: its dunk, its celebration, or its taunt (time into it) */
const clipOfPlayer = p => {
  if (p.dunk) return { c: dunkBodyClip(p.dunk.kind.id), t: (p.dunk.u || 0) * 1 };
  if (p.celebrate && p.celebrate.t < 1.4) { const c = CLIP_CELEBRATE[p.celebrate.name]; return c ? { c, t: p.celebrate.t } : null; }
  if (p.tauntT > 0 && p.def.taunt && CLIP_TAUNT[p.def.taunt]) return { c: CLIP_TAUNT[p.def.taunt], t: .8 - p.tauntT };
  if (p.passT !== undefined && p.hasBall && CLIP_ACTION.pass) return { c: CLIP_ACTION.pass, t: p.passT };
  if (p.state === 'steal' && CLIP_ACTION.steal) return { c: CLIP_ACTION.steal, t: p.stateT || 0 };
  if (p.state === 'shove' && CLIP_ACTION.shove) return { c: CLIP_ACTION.shove, t: p.stateT || 0 };
  return null;
};
/** the target for a player's state: where the right hand should be this step */
/** a named celebration or taunt (§7.3): the hand's target for its time t (seconds into the move) */
const MOVE_TARGET = (name, t) => {
  switch (name) {
    case 'raiseRoof': return Math.sin(t * 19) > 0 ? [2, 5, 42] : [2, 5, 34];          // palms pump at 3 Hz
    case 'flex': return [1, 6, 30];
    case 'pointSky': return [2, 3, 46];
    case 'airplane': return [0, 12, 24];
    case 'chestPound': return Math.sin(t * 14) > 0 ? [3, 1, 25] : [3, -1, 25];        // fists alternate
    case 'fingerGuns': return [4, 3, 22];
    case 'surfBalance': return [2, 6, 30];
    case 'goggles': return [3, 0, 36];
    case 'fingerWag': return [5, 2, 26];
    case 'shimmy': return [3, 4, 20];
    case 'watchTap': return [4, 2, 22];
    case 'crossArms': return [4, 0, 22];
    case 'blowFingers': return [5, 1, 24];
    case 'pogo': return [2, 2, 32];
    case 'robotDance': return [3, Math.sin(t * 9) * 5, 26];
    case 'robotPop': return [5, 2, 30];
    case 'processing': return [4, 0, 24];
    case 'glitchWave': return [4, Math.sin(t * 30) * 6, 22];
    case 'pointCam': return [6, 0, 24];
    case 'micDrop': return [5, 2, 16];
    case 'chestDrum': return [3, 0, 22];
    default: return null;
  }
};
const poseTargetOf = p => {
  if (p.dunk) return dunkPoseAt(p.dunk.kind.id, p.dunk.u || 0);
  if (p.celebrate && p.celebrate.t < 1.2) { const m = MOVE_TARGET(p.celebrate.name, p.celebrate.t); if (m) return m; }
  if (p.tauntT > 0 && p.def.taunt) { const m = MOVE_TARGET(p.def.taunt, .8 - p.tauntT); if (m) return m; }
  // the wind-ups and strikes (§7.3): a pass pulls the ball back and throws, a steal reaches low, a shove pulls back and pushes
  const T = p.stateT || 0;
  if (p.state === 'steal') return T < .2 ? [2, 3, 10] : [6, 1, 14];
  if (p.state === 'shove') return T < .06 ? [1, 3, 22] : [12, 3, 21];
  if (p.passT !== undefined && T < .2 && p.hasBall) return T < .08 ? [4, 2, 18] : [11, 1, 20];
  if (p.state === 'gather' || p.state === 'jump') return p.hasBall ? POSE_TARGET.shoot : POSE_TARGET.rebound;
  if (p.hasBall && p.state !== 'inbound') return p.dribbleSpeed > 40 || p.turboOn ? POSE_TARGET.dribble : POSE_TARGET.hold;
  if (p.state === 'inbound' || p.hasBall) return POSE_TARGET.hold;
  return POSE_TARGET.guard;
};
/** the ball rides the right hand while it is held or dribbled: x, y from the hand, z from the hand or the dribble's curve */
const ballAtHand = (b, p) => {
  const hp = p.rig.hand('R');
  return hp;
};

/* ---- 33-actions.js ---- */
/* ---- ACTIONS (plan §6.7, §6.9, §6.11): the shot model (decided at release, flown after), passes that arrive at a
 * teammate's chest, catches, pickups of loose balls and the inbound. Every chance is one formula: no hidden rolls. ---- */
const ATTACK = [1, 0];                       // side 0 (HOME) attacks rim 1 (the right end); side 1 attacks rim 0
const attackRim = side => ATTACK[side];
const defendRim = side => 1 - ATTACK[side];
const ballReach = { h: 10, z: 59 };          // a catch: horizontal reach, and the height of standing hands (plan §6.11)

/** the distance from a point to a rim, in the same flat plane (world units) */
const rimDist = (x, y, rim) => Math.hypot(x - RIMW[rim].x, y - RIMW[rim].y);
/** the base chance by distance (§6.7): dist in court units */
const baseChance = d => {
  if (d <= 40) return .85;
  if (d <= 80) return lerp(.85, .70, (d - 40) / 40);
  if (d <= 136) return lerp(.70, .45, (d - 80) / 56);
  if (d <= 200) return lerp(.38, .30, (d - 136) / 64);
  if (d <= 320) return lerp(.30, .08, (d - 200) / 120);
  return .03;
};
/** the nearest defender between the shooter and the rim, for the contest (§6.7) */
const contestOf = (p, rim) => {
  let best = null, bd = 1e9;
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt) continue;
    const d = Math.hypot(q.body.x - p.body.x, q.body.y - p.body.y);
    if (d < bd) { bd = d; best = q; }
  }
  if (!best) return { mult: 1, who: null };
  const span = RIMW[rim].x - p.body.x, along = best.body.x - p.body.x;
  const between = along * span > 0 && Math.abs(along) < Math.abs(span);
  const airborne = best.body.z > 8 || best.state === 'block';
  if (between && bd < 30 && airborne) return { mult: 1 - tune('contestPenalty'), who: best };
  if (bd < 30) return { mult: .8, who: best };
  if (bd < 50) return { mult: .92, who: best };
  return { mult: 1, who: best };
};

/** the decided chance of a jump shot (§6.7): every factor is a formula, and the result is clamped to [0.02, 0.97] */
const shotChance = (p, rim, release, o = {}) => {
  const d = rimDist(p.body.x, p.body.y, rim), three = d > 136;
  const factor = three ? .70 + .06 * rate(p, 'deep') : .78 + .045 * rate(p, 'splash');
  let rel = 1;
  const window = tune('perfectWindow') * (p.laser > 0 ? 2 : 1);
  if (Math.abs(release) <= window / 2) rel = 1 + tune('perfectBonus');
  else if (Math.abs(release) <= window) rel = 1;
  else rel = 1 - tune('badReleasePenalty');
  const c = contestOf(p, rim);
  const wind = (S.twist.wind || 0), sideways = Math.abs(p.body.vy) > 150 && Math.abs(p.body.vy) > Math.abs(p.body.vx) ? .9 : 1;
  const windM = 1 - .35 * Math.abs(wind) * d / 320;
  let bonus = 0;
  if (p.nova) bonus += tune('novaShotBonus');
  if (p.laser > 0) bonus += .30;
  if (o.comeback) bonus += o.comeback;
  const k = (three ? tune('threeSkill') : tune('shotSkill')) * juiceFactor(p);
  let v = baseChance(d) * factor * rel * c.mult * k * (p.turboOn ? 1.05 : 1) * sideways * windM + bonus;
  if (o.extra) v += o.extra;
  return { p: clamp(v, .02, .97), three, d, contest: c.who };
};

/** the points of a shot (§6.6 Scoring): 2 inside the arc, 3 beyond it, decided by where the shooter left the floor */
const shotPoints = (p, rim) => rimDist(p.body.x, p.body.y, rim) > 136 ? 3 : 2;

/** a shot: decided at release, flown after (§6.7). from: the shooter; release: seconds from the top of its jump (negative
 * early); the aim (made or missed) and the target spot follow the decision */
const releaseShot = (p, release, kind = 'jump') => {
  const rim = attackRim(p.side), comeback = comebackOf(p.side);
  const dec = shotChance(p, rim, release, { comeback });
  let made = S.rng() < dec.p;
  if (S.cheats.shotsIn) made = true; else if (S.cheats.shotsOut) made = false;   // the dev panel's shots, always in or always out
  const from = { x: p.body.x + Math.cos(p.face) * 6, y: p.body.y + Math.sin(p.face) * 6, z: p.body.z + 46 };
  const R = RIMW[rim], dc = rim === 1 ? -1 : 1;   // dc: the court's direction from this rim (x)
  let target;
  if (made) {
    const rattle = S.rng() < .25, spread = rattle ? 6 : 1.5;   // one make in four is rattled in from 3 units off the centre
    target = { x: R.x + (S.rng() - .5) * spread, y: R.y + (S.rng() - .5) * spread, z: R.z - 2 };
  } else {
    const off = (S.rng() < .5 ? -1 : 1) * (10.5 + S.rng() * 2.5), ang = S.rng();
    if (ang < .12 && dec.d > 136) target = { x: R.x + dc * 40, y: R.y + off, z: R.z + 8 };                       // an airball, far off
    else if (ang < .3) target = { x: BOARD_PLANE[rim] + dc * 9, y: R.y + off * .4, z: 86 };                    // the glass, from the court side
    else target = { x: R.x + dc * (10.5 + S.rng() * 2.5), y: R.y + off, z: R.z + 2 };                          // the front rim
  }
  const rise = clamp(18 + dec.d * .10, 18, 60) * tune('shotArc');   // (E.arc's apex: how far it rises over the higher end)
  const v = ballFlight(from, target, rise);
  const rec = { shooter: p.slot, made, p: dec.p, points: shotPoints(p, rim), three: dec.three, perfect: Math.abs(release) <= tune('perfectWindow') / 2, release, kind, dist: dec.d, rim, t: S.match.clock, age: 0 };
  p.shot = null;   // the shooter's machine is done: it lands from here
  ballRelease(S.ball, from, v, 'shot', rec);
  S.ball.owner = null; p.hasBall = false;
  S.match.shotsInFlight = (S.match.shotsInFlight || 0) + 1;
  p.stats.fga++; if (rec.three) p.stats.tpa++;
  emit('shotStart', { slot: p.slot, shooter: p.id, p: dec.p, three: rec.three, perfect: rec.perfect, dist: dec.d, side: p.side, kind });
  emit('release', { slot: p.slot, shooter: p.id, perfect: rec.perfect, three: rec.three, release });
  return rec;
};

/** the comeback assist (§8): a team trailing by 4 or more from Q2 on gets a chance bonus; Tournament mode turns it off */
const comebackOf = side => {
  const m = S.match, lvl = setting('comeback'), k = { Off: 0, Low: .2, Normal: .35 }[lvl] ?? tune('comeback');
  if (!m || k <= 0 || m.quarter < 2 || S.cheats.tournament) return 0;
  const d = m.score[1 - side] - m.score[side];
  return d >= 4 ? k * Math.min(d, 15) / 15 * .12 : 0;
};

/** a pass to a teammate (§6.9): the ball flies at the receiver's chest, led by its velocity; speed by DIME */
const passBall = (p, to) => {
  const b = S.ball, m = to || teammateOf(p);
  if (!m) return null;
  const from = { x: p.body.x + Math.cos(p.face) * 8, y: p.body.y + Math.sin(p.face) * 8, z: p.body.z + 30 };
  const sp = (180 + 12 * rate(p, 'dime')) * 1.6;
  const d = Math.hypot(m.body.x - from.x, m.body.y - from.y);
  const t = Math.max(.1, d / sp), lead = Math.min(t, .8);
  const tx = m.body.x + m.body.vx * lead * .6, ty = m.body.y + m.body.vy * lead * .6, tz = m.body.z + 30;
  const v = { vx: (tx - from.x) / t, vy: (ty - from.y) / t, vz: (tz - from.z + .5 * tune('ballGravity') * t * t) / t };
  ballRelease(b, from, v, 'pass', null);
  b.to = m.slot; b.from = p.slot; b.passT = S.match.clock;
  p.cool.pass = .2; p.passT = 0;
  p.hasBall = false; b.owner = null;
  if (S.match && S.match.phase === 'inbound') { S.match.phase = 'live'; S.match.dead = false; }   // the inbound's pass ends the wait
  emit('pass', { slot: p.slot, to: m.slot, side: p.side, dist: d });
  return m;
};
/** the teammate a pass goes to: the one ahead or open (never the player itself) */
const teammateOf = p => S.players.find(q => q.side === p.side && q !== p && q.onCourt) || null;

/** a player takes the ball: it is in his hands from now (held), and the other team's stealing ends */
const takeBall = (p, how = 'catch') => {
  const b = S.ball;
  if (b.owner === p) return;
  if (b.owner) b.owner.hasBall = false;
  b.owner = p; p.hasBall = true; b.state = b.state === 'inbound' ? 'inbound' : 'held';
  b.shot = null; b.scored = [false, false]; b.roll = 0;
  b.lastTouch = p.slot;
  if (how !== 'loose-steal') newPossession(p.side);
  emit(how === 'rebound' ? 'rebound' : 'catch', { slot: p.slot, side: p.side, how });
  if (how === 'rebound') p.stats.reb++;
  return p;
};

/** the ball goes loose: nobody holds it; the next player to reach it takes it */
const releaseLoose = (b, spd = 0) => { if (b.owner) { b.owner.hasBall = false; b.owner = null; } b.state = b.state === 'held' || b.state === 'dribble' ? 'loose' : b.state; b.lastTouch = null; };

/** a shot resolves: its count leaves the flight, the rebound is known (the match reads the record) */
const shotOver = b => { const m = S.match; if (m && m.shotsInFlight > 0) m.shotsInFlight--; if (b.shot) b.shot.resolved = true; };

/** pick up loose balls and balls the player reaches: a pass for its receiver, a missed shot in the air (a rebound), a
 * ball on the floor. A made shot is never caught; the shooter can't take its own shot back for .4 s. */
const reachBall = p => {
  const b = S.ball;
  if (!p.onCourt || b.owner || b.state === 'dead' || b.state === 'inbound') return false;
  const d = Math.hypot(b.x - p.body.x, b.y - p.body.y);
  const top = p.body.z + ballReach.z + (p.jumping ? 14 : 0);
  if (d > ballReach.h || b.z < p.body.z - 4 || b.z > top) return false;
  if (b.state === 'pass' && b.to !== p.slot) return false;
  if (b.state === 'shot') {
    if (b.shot.made) return false;
    if (b.shot.shooter === p.slot && b.shot.age < .4) return false;
    if (b.z > 40 && b.vz > 0) return false;
    shotOver(b);
    return takeBall(p, 'rebound'), true;
  }
  takeBall(p, 'catch');
  if (b.state === 'pass') b.to = null;
  return true;
};

/* ---- 33b-clips.js ---- */
/* ---- BODY CLIPS (plan §7.3): every celebration, taunt and dunk is a keyframed clip over the body's channels: the two hands
 * (rig frame, size 1: forward, right, up), the body's height (a hop, visual only), the rig's pose (cheer, crouch, guard,
 * hips, down, block), a squash (rig.kick) and a landing. A clip is data; the sampler interpolates the numbers and holds the
 * discrete pose. The engine's rig draws it; the match's physics doesn't read it. ---- */
const CLIP_CELEBRATE = {
  chestPound: { len: 1.2, keys: [[0, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }], [.25, { R: [3, 2, 14], L: [3, -2, 14], z: 1, pose: 'crouch', kick: -.6 }], [.5, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }], [.75, { R: [3, 2, 14], L: [3, -2, 14], z: 1, pose: 'crouch', kick: -.6 }], [1.2, { R: [3, 1, 25], L: [3, -1, 25], z: 0, pose: 'cheer' }]] },
  flex: { len: 1.2, keys: [[0, { R: [4, 3, 20], L: [4, -3, 20], z: 0, pose: 'guard' }], [.5, { R: [1, 6, 30], L: [1, -6, 30], z: 2, pose: 'cheer', kick: .8 }], [1.2, { R: [1, 6, 30], L: [1, -6, 30], z: 0, pose: 'cheer' }]] },
  raiseRoof: { len: 1.4, keys: [[0, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }], [.35, { R: [2, 5, 42], L: [2, -5, 42], z: 3, pose: 'cheer', kick: .6, lean: -.18 }], [.7, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }], [1.05, { R: [2, 5, 42], L: [2, -5, 42], z: 3, pose: 'cheer', kick: .6, lean: -.18 }], [1.4, { R: [2, 5, 34], L: [2, -5, 34], z: 0, pose: 'cheer', lean: -.12 }]] },
  pointSky: { len: 1.2, keys: [[0, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }], [.4, { R: [2, 3, 46], L: [3, -1, 22], z: 4, pose: 'cheer', kick: .8 }], [1.2, { R: [2, 3, 46], L: [3, -1, 22], z: 2, pose: 'cheer' }]] },
  airplane: { len: 1.4, keys: [[0, { R: [2, 4, 24], L: [2, -4, 24], z: 0, pose: 'guard' }], [.5, { R: [0, 12, 24], L: [0, -12, 24], z: 3, pose: 'cheer', kick: .5 }], [1.4, { R: [0, 12, 24], L: [0, -12, 24], z: 1, pose: 'cheer' }]] },
  fingerGuns: { len: 1, keys: [[0, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'guard' }], [.3, { R: [4, 3, 22], L: [4, -3, 22], z: 1, pose: 'cheer', kick: .4 }], [1, { R: [4, 3, 22], L: [4, -3, 22], z: 0, pose: 'cheer' }]] },
  surfBalance: { len: 1.2, keys: [[0, { R: [2, 6, 30], L: [2, -6, 30], z: 0, pose: 'cheer' }], [.6, { R: [1, 9, 28], L: [1, -9, 28], z: 1, pose: 'cheer' }], [1.2, { R: [2, 6, 30], L: [2, -6, 30], z: 0, pose: 'cheer' }]] },
  goggles: { len: 1, keys: [[0, { R: [4, 2, 20], L: [4, -2, 20], z: 0, pose: 'guard' }], [.5, { R: [3, 0, 36], L: [3, 0, 36], z: 0, pose: 'cheer' }], [1, { R: [3, 0, 36], L: [3, 0, 36], z: 0, pose: 'cheer' }]] },
  fingerWag: { len: 1, keys: [[0, { R: [5, 2, 26], L: [5, -2, 26], z: 0, pose: 'guard' }], [.5, { R: [5, 2, 20], L: [5, -2, 20], z: 0, pose: 'guard', kick: .2 }], [1, { R: [5, 2, 26], L: [5, -2, 26], z: 0, pose: 'guard' }]] },
  shimmy: { len: 1, keys: [[0, { R: [3, 4, 20], L: [3, -4, 20], z: 0, pose: 'guard' }], [.25, { R: [3, 5, 20], L: [3, -5, 20], z: 1, pose: 'crouch' }], [.5, { R: [3, 3, 20], L: [3, -3, 20], z: 0, pose: 'guard' }], [.75, { R: [3, 5, 20], L: [3, -5, 20], z: 1, pose: 'crouch' }], [1, { R: [3, 4, 20], L: [3, -4, 20], z: 0, pose: 'guard' }]] },
  watchTap: { len: 1, keys: [[0, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }], [.5, { R: [4, 1, 18], L: [4, -1, 18], z: 0, pose: 'guard', kick: .3 }], [1, { R: [4, 2, 22], L: [4, -2, 22], z: 0, pose: 'guard' }]] },
  crossArms: { len: 1.2, keys: [[0, { R: [4, 0, 22], L: [4, 0, 22], z: 0, pose: 'guard' }], [1.2, { R: [4, 0, 22], L: [4, 0, 22], z: 0, pose: 'guard' }]] },
  blowFingers: { len: 1, keys: [[0, { R: [5, 1, 24], L: [5, -1, 24], z: 0, pose: 'guard' }], [.5, { R: [5, 1, 26], L: [5, -1, 26], z: 0, pose: 'hips' }], [1, { R: [5, 1, 24], L: [5, -1, 24], z: 0, pose: 'guard' }]] },
  pogo: { len: 1.2, keys: [[0, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'cheer' }], [.2, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'crouch', kick: -.5 }], [.6, { R: [2, 2, 32], L: [2, -2, 32], z: 8, pose: 'cheer', kick: .5 }], [1.0, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'crouch', kick: -.5 }], [1.2, { R: [2, 2, 32], L: [2, -2, 32], z: 0, pose: 'cheer' }]] },
  robotDance: { len: 1.4, keys: [[0, { R: [3, 3, 26], L: [3, -3, 26], z: 0, pose: 'guard' }], [.35, { R: [3, 5, 26], L: [3, -5, 26], z: 1, pose: 'guard' }], [.7, { R: [3, -4, 26], L: [3, 4, 26], z: 0, pose: 'guard' }], [1.05, { R: [3, 5, 26], L: [3, -5, 26], z: 1, pose: 'guard' }], [1.4, { R: [3, 3, 26], L: [3, -3, 26], z: 0, pose: 'guard' }]] },
  robotPop: { len: 1, keys: [[0, { R: [4, 2, 24], L: [4, -2, 24], z: 0, pose: 'guard' }], [.2, { R: [5, 2, 30], L: [5, -2, 30], z: 2, pose: 'cheer', kick: .6 }], [1, { R: [4, 2, 24], L: [4, -2, 24], z: 0, pose: 'guard' }]] },
  processing: { len: 1.2, keys: [[0, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard' }], [.6, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard', kick: .2 }], [1.2, { R: [4, 0, 24], L: [4, 0, 24], z: 0, pose: 'guard' }]] },
  glitchWave: { len: 1.2, keys: [[0, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }], [.3, { R: [4, 4, 22], L: [4, -4, 22], z: 0, pose: 'guard' }], [.6, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }], [.9, { R: [4, 4, 22], L: [4, -4, 22], z: 0, pose: 'guard' }], [1.2, { R: [4, -4, 22], L: [4, 4, 22], z: 0, pose: 'guard' }]] },
  pointCam: { len: 1, keys: [[0, { R: [4, 2, 20], L: [4, -2, 20], z: 0, pose: 'guard' }], [.4, { R: [6, 0, 24], L: [4, -2, 20], z: 0, pose: 'cheer', kick: .3 }], [1, { R: [6, 0, 24], L: [4, -2, 20], z: 0, pose: 'cheer' }]] },
  micDrop: { len: 1.2, keys: [[0, { R: [5, 2, 20], L: [5, -2, 20], z: 0, pose: 'guard' }], [.5, { R: [5, 2, 16], L: [5, -2, 16], z: 0, pose: 'crouch', kick: .6 }], [1.2, { R: [5, 2, 16], L: [5, -2, 16], z: 0, pose: 'crouch' }]] },
  chestDrum: { len: 1.2, keys: [[0, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }], [.2, { R: [3, 1, 18], L: [3, -1, 18], z: 1, pose: 'crouch', kick: -.4 }], [.4, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }], [.6, { R: [3, 1, 18], L: [3, -1, 18], z: 1, pose: 'crouch', kick: -.4 }], [1.2, { R: [3, 0, 22], L: [3, 0, 22], z: 0, pose: 'cheer' }]] }
};
/** the sampler: the numbers interpolate between keys, the pose and the kick take the key at or before t */
const sampleClip = (clip, t) => {
  const K = clip.keys, tt = clamp(t, 0, clip.len);
  let i = 0; while (i < K.length - 1 && K[i + 1][0] <= tt) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  const f = b[0] > a[0] ? (tt - a[0]) / (b[0] - a[0]) : 0;
  const lerpV = (x, y) => [0, 1, 2].map(j => lerp(x[j], y[j], clamp(f, 0, 1)));
  return { R: lerpV(a[1].R, b[1].R), L: lerpV(a[1].L, b[1].L), z: lerp(a[1].z, b[1].z, clamp(f, 0, 1)), lean: lerp(a[1].lean || 0, b[1].lean || 0, clamp(f, 0, 1)), pose: a[1].pose, kick: a[1].kick || 0 };
};
const CLIP_ACTION = {
  pass: { len: .2, keys: [[0, { R: [4, 2, 18], L: [4, -2, 18], z: 0, pose: 'guard', lean: -.1 }], [.08, { R: [4, 2, 18], L: [4, -2, 18], z: 0, pose: 'guard', lean: -.1 }], [.2, { R: [11, 1, 20], L: [11, -1, 20], z: 0, pose: 'guard', lean: .25 }]] },
  steal: { len: .4, keys: [[0, { R: [2, 3, 10], L: [2, -3, 10], z: 0, pose: 'crouch', lean: .2 }], [.2, { R: [2, 3, 10], L: [2, -3, 10], z: 0, pose: 'crouch', lean: .2, kick: -.3 }], [.4, { R: [6, 1, 14], L: [6, -1, 14], z: 0, pose: 'guard', lean: .4 }]] },
  shove: { len: .3, keys: [[0, { R: [1, 3, 22], L: [1, -3, 22], z: 0, pose: 'crouch', lean: -.1 }], [.06, { R: [1, 3, 22], L: [1, -3, 22], z: 0, pose: 'crouch', lean: -.1, kick: -.4 }], [.3, { R: [12, 3, 21], L: [12, -3, 21], z: 0, pose: 'guard', kick: .8, lean: .35 }]] }
};
const CLIP_TAUNT = CLIP_CELEBRATE;   // (a taunt is the same clip set, keyed by the player's taunt name)
/** the dunks' body (§7.3, §10.3): the hands by DUNK_KEYS, the body's crouch, air and cheer, the slam kick, the landing */
const dunkBodyClip = id => ({ len: 1, keys: [[0, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'crouch', lean: .3 }], [.12, { R: [4, 3, 16], L: [4, -3, 16], z: 0, pose: 'crouch', kick: -.5, lean: .35 }], [.5, { R: [4, 2, 30], L: [4, -2, 30], z: 0, pose: null, lean: .1 }], [.9, { R: [8, 0, 30], L: [8, 0, 30], z: 0, pose: 'cheer', kick: 1, lean: -.25 }], [1, { R: [8, 0, 30], L: [8, 0, 30], z: 0, pose: 'cheer', kick: -1.5, lean: 0 }]] });

/* ---- 34-ai.js ---- */
/* ---- THE CPU (plan §8): one brain per CPU player. It decides at 10 Hz (staggered per player), commits to what it chose for
 * a moment, and steers every step by writing the same command a human's controls would. Roles per possession: HANDLER,
 * OFFBALL, DEFENDER (a mark), LOOSE (the nearest chases a loose ball). Difficulty sets the noise, reaction delay, release
 * error, block timing, steal tries and shove rate (the table in §8). ---- */
const DIFF = {
  Rookie: { noise: .35, react: .35, release: .12, block: .18, steal: .6, shove: .20, turbo: .50 },
  Pro: { noise: .60, react: .22, release: .08, block: .12, steal: 1.0, shove: .45, turbo: .75 },
  'All-Star': { noise: .80, react: .14, release: .05, block: .07, steal: 1.4, shove: .65, turbo: .90 },
  BLAM: { noise: .95, react: .08, release: .03, block: .04, steal: 1.8, shove: .80, turbo: 1.0 }
};
/** the difficulty's numbers for a CPU player: the setting, shifted by the Tour's stop (§10.5), and skill's offset */
const diffOf = p => {
  const names = ['Rookie', 'Pro', 'All-Star', 'BLAM'], base = names.indexOf(setting('difficulty') || 'Pro');
  const shift = (S.tourShift || 0), v = clamp(base + shift + tune('cpuSkill') * 2, 0, 3), lo = Math.floor(v), hi = Math.min(3, lo + 1), f = v - lo;
  const a = DIFF[names[lo]], b = DIFF[names[hi]], out = {};
  for (const k of Object.keys(a)) out[k] = lerp(a[k], b[k], f);
  return out;
};
/** a normal draw (Box-Muller) from the match's seeded stream */
const gauss = () => { const u = Math.max(1e-6, S.rng()), v = S.rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * PI * v); };

/** a fresh brain for a CPU player */
const newBrain = (p, stagger) => ({ next: stagger, dec: null, decT: 0, move: [0, 0], wantShoot: false, wantPass: null, wantDrive: false, plan: 0, lastDec: -1 });

/** the nearest opponent (and its distance) to a point */
const nearestOpp = (p, x = p.body.x, y = p.body.y) => {
  let best = null, bd = 1e9;
  for (const q of S.players) { if (q.side === p.side || !q.onCourt) continue; const d = Math.hypot(q.body.x - x, q.body.y - y); if (d < bd) { bd = d; best = q; } }
  return { who: best, d: bd };
};
/** the open-ness of a teammate: the distance to its nearest opponent */
const openness = (mate) => nearestOpp(mate).d;

/** the handler's choice, rated every decision: shoot (its chance), drive (the lane), pass (a teammate more open) */
const handlerDecide = (p, bs, dif) => {
  const rim = attackRim(p.side), R = RIMW[rim], d = rimDist(p.body.x, p.body.y, rim);
  const sc = shotChance(p, rim, 0).p;
  const mate = teammateOf(p), mo = mate ? openness(mate) : 0, mine = nearestOpp(p);
  // a shot is taken when it is good, or when the clock forces one; otherwise a pass to someone more open, else the drive
  const urgent = S.match.shotClock < 4, good = sc >= .3 * (1 + (1 - dif.noise) * .4);
  const passOk = mate && mo > 40 && mo > mine.d * 1.2;
  if (urgent || (good && d < 300)) return { k: 'shoot', sc };
  if (passOk && S.rng() < .5 + dif.noise * .2) return { k: 'pass', to: mate };
  return { k: 'drive', rim, sc };
};

/** a player's roles and spots (the formation, §8 Off the ball and Defense) */
const offSpot = p => {
  const rim = attackRim(p.side), R = RIMW[rim], dc = rim === 1 ? -1 : 1, mate = teammateOf(p);
  const spotX = R.x + dc * (p.slot % 2 ? 150 : 100), spotY = CENTRE().y + (p.slot % 2 ? -70 : 70);
  if (mate && mate.hasBall) return [spotX, spotY + (p.slot % 2 ? -30 : 30)];
  return [spotX, spotY];
};
const defSpot = p => {
  const b = S.ball, own = defendRim(p.side), R = RIMW[own];
  const mark = S.players.find(q => q.side !== p.side && q.onCourt && (q.hasBall)) || nearestOpp(p).who;
  const target = mark || { body: { x: CENTRE().x, y: CENTRE().y } };
  const dx = R.x - target.body.x, dy = R.y - target.body.y, d = Math.hypot(dx, dy) || 1;
  const k = mark && mark.hasBall ? 18 : 26;
  return [target.body.x + dx / d * k, target.body.y + dy / d * k, mark];
};

/** the brain for one step: the decision (every 0.1 s after a reaction delay), then the steering that follows it */
const brainCmd = (p, dt) => {
  const bs = p.brain || (p.brain = newBrain(p, 0)), dif = diffOf(p), c = emptyCmd();
  bs.next -= dt;
  bs.decided = false;
  if (bs.next <= 0) {
    bs.next = .1; bs.decided = true;   // the decision tick: the chance rolls below happen here, once a tenth of a second
    const b = S.ball, m = S.match;
    if (p.hasBall) bs.dec = handlerDecide(p, bs, dif);
    else bs.dec = { k: 'off' };
  }
  const dec = bs.dec || { k: 'off' };
  if (S.match.phase === 'break' || S.match.over) return c;
  if (p.hasBall) {
    if (dec.k === 'shoot' && p.state !== 'gather' && p.state !== 'jump' && p.body.z < 1.5) {
      if (!p.shot) { c.shoot.pressed = true; c.shoot.down = true; p.nextShotPlan = gauss() * dif.release; }   // the release error, drawn for this shot
    }
    if (dec.k === 'pass' && dec.to && p.cool.pass <= 0) c.pass.pressed = true;
    // a spin move against a defender right in front; a shove against a defender in the paint
    const foe = nearestOpp(p);
    if (bs.decided && foe.who && foe.d < 22 && p.cool.spin <= 0 && p.turbo > .3 && S.rng() < .04 * dif.shove * 3 && p.body.z < 1) c.shove.pressed = true;
    const rim = attackRim(p.side), R = RIMW[rim];
    const dx = R.x - p.body.x, dy = R.y - p.body.y, d = Math.hypot(dx, dy) || 1;
    c.move = [dx / d, dy / d];
    const inDunk = d < dunkRangeOf(p) && rate(p, 'slam') >= 4;
    c.turbo.down = inDunk ? (bs.decided && S.rng() < .16) : (bs.decided ? S.rng() < dif.turbo * .35 : !!p.turboOn) && d > 90;   // turbo for a dunk in range (rarely: one in three baskets), or to run
  } else if (p.side === S.ball.owner?.side || (S.ball.owner && S.ball.owner.side === p.side)) {
    // offence without the ball: spread to a spot
    const [sx, sy] = offSpot(p), dx = sx - p.body.x, dy = sy - p.body.y, d = Math.hypot(dx, dy);
    c.move = d > 6 ? [dx / d, dy / d] : [0, 0];
    c.turbo.down = S.rng() < dif.turbo * .5 && d > 60;
  } else {
    // defence: a mark, between it and the own rim; the loose ball goes to the nearest
    const loose = !S.ball.owner && (S.ball.state === 'loose' || S.ball.state === 'pass' || S.ball.state === 'shot');
    const nearestToBall = S.players.filter(q => q.side === p.side && q.onCourt).sort((a, z) => Math.hypot(a.body.x - S.ball.x, a.body.y - S.ball.y) - Math.hypot(z.body.x - S.ball.x, z.body.y - S.ball.y))[0] === p;
    let tx, ty, mark;
    if (loose && nearestToBall) { tx = S.ball.x; ty = S.ball.y; }
    else { [tx, ty, mark] = defSpot(p); }
    const dx = tx - p.body.x, dy = ty - p.body.y, d = Math.hypot(dx, dy);
    c.move = d > 5 ? [dx / d, dy / d] : [0, 0];
    c.turbo.down = S.rng() < dif.turbo * .4 && d > 60;
    brainDefend(p, c, dif, bs.decided);
    // a jump to block or rebound when the ball is in the air near us
    const ballUp = S.ball.z > 20, onFloor = p.body.z < 1 && !p.jumping && p.state !== 'jump' && p.state !== 'gather';
    if (bs.decided && S.ball.state === 'shot' && Math.hypot(S.ball.x - p.body.x, S.ball.y - p.body.y) < 40 && p.cool.block <= 0 && onFloor && S.rng() < dif.block) c.shoot.pressed = true;
    if (bs.decided && loose && nearestToBall && d < 12 && ballUp && onFloor && S.rng() < .3) c.shoot.pressed = true;   // a rebound jump, for a ball in the air
  }
  return c;
};

/** the CPU's buttons without the ball (§8 Defense): a steal swipe when adjacent from a good angle, a shove in the paint
 * against the handler; a block jump (above) and a rebound jump are in the decision. Called from the brain's steering. */
const brainDefend = (p, c, dif, tick) => {
  const h = S.ball.owner;
  if (!tick || !h || h.side === p.side) return;
  const d = Math.hypot(h.body.x - p.body.x, h.body.y - p.body.y);
  if (d < 16 && p.cool.steal <= 0 && S.rng() < .3 * dif.steal) c.pass.pressed = true;   // (a swipe: the pass button without the ball)
  if (d < 18 && p.turbo > .2 && p.cool.shove <= 0 && S.rng() < .08 * dif.shove * tune('cpuAggression')) c.shove.pressed = true;
};

/* ---- 35-match.js ---- */
/* ---- THE MATCH (plan §6.3, §4.3): the flow of a game. Phases: 'tipoff' (the jump), 'live' (the clocks run), 'dead' (a made
 * basket or a violation: the clock stops), 'inbound' (the thrower holds the ball and passes after .8 s or on the human's
 * pass), 'break' (after Q1 and Q3 a short card; after Q2 the halftime report; after a tied Q4 an overtime), 'over'.
 * Scoring, possession, the shot clock, quarters, overtime and SUDDEN BLAM are decided here, and only here. ---- */
const INBOUND_WAIT = .8, BREAK_SECS = 6, HALF_SECS = 12, OT_LEN = 60, TIP_SECS = .9, SPONSOR_SECS = 4;
const CENTRE = () => ({ x: OX + MIDX, y: OY + MIDY });

const newMatch = (o = {}) => ({
  phase: 'tipoff', quarter: 1, clock: o.qLen || 120, qLen: o.qLen || 120, shotClock: tune('shotClock'), score: [0, 0],
  poss: null, arrow: 1, tipWinner: HOME, tipT: 0, tipDone: false, dead: false, deadT: 0, deadReason: null,
  pendingSide: null, inboundSpot: null, inboundT: 0, inboundSide: null, shotsInFlight: 0, ot: 0, sudden: false, over: false,
  winner: null, streak: [0, 0], t: 0, mode: o.mode || 'exhibition', quarterScores: [], lastScorer: null, lastBasketT: -9,
  breakT: 0, breakKind: null, goals: [], possessionAt: null
});
/** the clock runs in live play: the ball live, no break, no dead ball */
const clockRuns = m => m.phase === 'live' && !m.dead;

/** possession passes to a side: the shot clock starts again; the same side keeping it (a rebound) doesn't reset it */
const newPossession = side => {
  const m = S.match; if (!m || side === null || side === undefined) return;
  if (m.poss !== side) { m.shotClock = tune('shotClock'); emit('possession', { side }); }
  m.poss = side; m.possessionAt = side;
};
/** the ball is dead: the clock stops; the inbound follows after its wait, from the spot the reason gives */
const deadBall = (reason, side, spot) => {
  const m = S.match; if (!m) return;
  m.dead = true; m.deadT = 0; m.deadReason = reason; m.pendingSide = side; m.inboundSpot = spot || null;
  if (m.phase === 'live') m.phase = 'dead';
  const b = S.ball; if (b.owner) { b.owner.hasBall = false; b.owner = null; }
  b.state = 'dead'; b.vx = b.vy = b.vz = 0;
  emit('deadBall', { reason, side });
};

/** the inbound spot after a basket: behind the baseline under the basket that was scored on (the inbounder defends it) */
const inboundUnder = rim => ({ x: rim === 1 ? OX + CW + 12 : OX - 12, y: RIMW[rim].y });
/** the nearest sideline's spot: a turnover or a violation comes in from the line */
const nearSideline = pt => ({ x: clamp(pt.x, COURT_X0 + 12, COURT_X1 - 12), y: pt.y < CENTRE().y ? COURT_Y0 + 8 : COURT_Y1 - 8 });

/** the thrower: the side's player nearest the spot */
const throwerOf = (side, spot) => S.players.filter(p => p.side === side && p.onCourt)
  .sort((a, b) => Math.hypot(a.body.x - spot.x, a.body.y - spot.y) - Math.hypot(b.body.x - spot.x, b.body.y - spot.y))[0] || null;

/** the inbound: the thrower stands at the spot and holds the ball (state 'inbound'); the pass comes after its wait */
const startInbound = (side, spot) => {
  const m = S.match, sp = spot || inboundUnder(defendRim(side));
  const th = throwerOf(side, sp); if (!th) return;
  placePlayer(th, sp.x, sp.y, side === HOME ? 0 : PI);
  m.phase = 'inbound'; m.inboundT = 0; m.dead = false; m.inboundSide = side;
  const b = S.ball; b.owner = th; th.hasBall = true; b.state = 'inbound'; b.x = th.body.x; b.y = th.body.y; b.z = 20;
  newPossession(side); m.shotClock = tune('shotClock');
  emit('inbound', { side, slot: th.slot });
};

/** the tip-off (§6.3): the two jumpers (the highest SWAT per side) at the centre; the ball tossed; the winner's side */
const tipOff = () => {
  const m = S.match, c = CENTRE();
  const best = side => S.players.filter(p => p.side === side).sort((a, b) => rate(b, 'swat') - rate(a, 'swat'))[0];
  const jA = best(HOME), jB = best(AWAY);
  for (const p of [jA, jB]) placePlayer(p, c.x + (p.side ? 14 : -14), c.y, p.side ? PI : 0);
  const sa = rate(jA, 'swat') + (S.rng() - .5) * 2, sb = rate(jB, 'swat') + (S.rng() - .5) * 2;
  m.tipWinner = sa >= sb ? HOME : AWAY; m.arrow = 1 - m.tipWinner;   // the team that lost the tip gets Q2 and Q3
  m.jumpers = [jA, jB];
  const b = S.ball; ballPlace(b, c.x, c.y, 40); b.vz = 220; b.state = 'pass'; b.to = null; b.shot = null;
  m.phase = 'tipoff'; m.tipT = 0; m.tipDone = false;
  emit('tipoff', { winner: m.tipWinner });
};
/** the tip's winner catches the ball: the highest of its side (the winner's jumper), and the match goes live */
const finishTip = () => {
  const m = S.match, b = S.ball, r = S.players.filter(p => p.side === m.tipWinner).sort((a, c2) => rate(c2, 'swat') - rate(a, 'swat'))[0];
  b.vx = b.vy = b.vz = 0; b.state = 'held';
  m.phase = 'live'; m.dead = false; m.tipDone = true;
  takeBall(r, 'catch');
};

/** a quarter starts: the inbound from the centre by the alternating arrow (Q2 and Q3 the tip's loser, Q4 the winner) */
const startQuarter = q => {
  const m = S.match; m.quarter = q; m.clock = m.qLen; m.shotClock = tune('shotClock');
  const side = q === 2 || q === 3 ? 1 - m.tipWinner : m.tipWinner;
  startInbound(side, CENTRE());
  emit('quarterStart', { quarter: q });
};

/** a basket (§6.3): the points come from the shot record and its bonuses; the streak counts; the other side inbounds */
const onGoal = ev => {
  const m = S.match, b = ev.ball; if (!m || !b.shot || b.shot.resolved || S.netReplay) return;
  const rec = b.shot, shooter = S.players[rec.shooter]; if (!shooter) return;
  const side = shooter.side;
  let pts = rec.points;
  if (rec.jackpot) pts += tune('jackpotBonus');
  if (rec.dunk) pts = Math.max(pts, 2);
  if (rec.goldBall) pts *= 2;
  rec.resolved = true; rec.scoredPts = pts;
  m.shotsInFlight = Math.max(0, m.shotsInFlight - 1);
  m.score[side] += pts; shooter.stats.fgm++; shooter.stats.pts += pts; if (rec.three) shooter.stats.tpm++;
  m.streak[side] += 1; m.streak[1 - side] = 0; m.lastScorer = shooter.slot; m.lastBasketT = m.t;
  m.goals.push({ side, slot: shooter.slot, points: pts, t: Math.round(m.clock) });
  for (const p of S.players) if (p.side !== side && p.nova) endNova(p, 'score');
  if (!shooter.nova && m.streak[side] >= tune('novaBaskets')) igniteNova(shooter);
  if (shooter.nova) shooter.novaBaskets = (shooter.novaBaskets || 0) + 1;
  b.owner = null;
  emit('basket', { side, slot: shooter.slot, shooter: shooter.id, points: pts, three: !!rec.three, dunk: rec.dunk || null, perfect: !!rec.perfect, streak: m.streak[side], x: b.x, y: b.y, z: b.z });
  if (m.sudden) { endGame(side); return; }
  deadBall('basket', 1 - side, inboundUnder(rec.rim));
};

/** the game is over: the winner's side, or null for a tie at time-up (the hub's round) */
const endGame = winner => {
  const m = S.match; if (!m || m.over) return;
  m.over = true; m.phase = 'over'; m.winner = winner; m.dead = true; S.ball.state = 'dead';
  emit('gameEnd', { winner, score: m.score.slice() });
};

/** a quarter's end: the clock is zero and no shot is in flight (a shot released before the buzzer counts) */
const quarterEnd = () => {
  const m = S.match; m.quarterScores.push(m.score.slice());
  emit('quarterEnd', { quarter: m.quarter, score: m.score.slice() });
  const tied = m.score[0] === m.score[1];
  if (m.quarter === 2) { m.breakKind = 'half'; m.breakT = 0; m.phase = 'break'; emit('halftime', { score: m.score.slice() }); return; }
  if (m.quarter === 1 || m.quarter === 3) { m.breakKind = 'quick'; m.breakT = 0; m.phase = 'break'; return; }
  if (tied) { m.ot++; m.breakKind = 'ot'; m.breakT = 0; m.phase = 'break'; emit('overtime', { n: m.ot }); return; }
  endGame(m.score[0] > m.score[1] ? HOME : AWAY);
};

/** the match's own step: clocks, phases, the dead ball's wait, the inbounds and the shot clock */
const matchRules = dt => {
  const m = S.match, b = S.ball;
  m.t += dt;
  if (m.over) return;
  if (m.phase === 'tipoff') { m.tipT += dt; if (m.tipT >= TIP_SECS && !m.tipDone) finishTip(); return; }
  if (m.phase === 'break') {
    if (!m.subsDone) { m.subsDone = true; subsAtBreak(); }
    m.breakT += dt;
    const need = m.breakKind === 'half' ? HALF_SECS : m.breakKind === 'ot' ? 3 : BREAK_SECS;
    if (m.breakT < need) return;
    m.breakT = 0;
    if (m.breakKind === 'ot') {
      m.quarter = 4 + m.ot; m.clock = OT_LEN; m.sudden = m.ot >= 2;   // the third overtime is SUDDEN BLAM
      startInbound(m.tipWinner, CENTRE());
      return;
    }
    m.subsDone = false;
    startQuarter(m.quarter + 1);
    return;
  }
  if (m.phase === 'dead') {
    m.deadT += dt;
    if (m.sponsorPending && m.deadReason === 'basket') { m.sponsorPending = false; m.sponsorOn = true; m.deadReason = 'sponsor'; }
    const wait = m.deadReason === 'sponsor' ? SPONSOR_SECS : INBOUND_WAIT;
    if (m.deadT >= wait) { m.sponsorOn = false; startInbound(m.pendingSide, m.inboundSpot); }
    return;
  }
  if (m.phase === 'inbound') {
    m.inboundT += dt;
    const th = b.owner;
    if (!th) { if (b.state !== 'inbound') m.phase = 'live'; return; }   // a pass already went: the match is live
    if (m.inboundT >= INBOUND_WAIT || (th.human && th.cmd.pass.pressed)) {
      const to = passBall(th, teammateOf(th));
      if (to) m.phase = 'live';
      if (to) { m.dead = false; }
    }
    return;
  }
  if (m.phase !== 'live') return;
  if (clockRuns(m)) { if (!S.cheats.freezeClock) m.clock = Math.max(0, m.clock - dt); if (m.poss !== null && !S.cheats.freezeShot) m.shotClock -= dt; }
  if (m.clock <= 0) m.zeroT = (m.zeroT || 0) + dt; else m.zeroT = 0;
  if (m.clock <= 0 && (m.shotsInFlight === 0 || m.zeroT > 6) && !m.dead) { m.clock = 0; m.shotsInFlight = 0; m.zeroT = 0; quarterEnd(); return; }   // (a shot still open after the buzzer by 6 s is let go)
  if (m.shotClock <= 0 && m.poss !== null && !m.dead) {
    m.shotClock = 0; emit('shotClockViolation', { side: m.poss });
    const spot = nearSideline(b.owner ? b.owner.body : b);
    deadBall('shotclock', 1 - m.poss, spot);
  }
};

/** the shot clock resets when a shot touches the rim (§6.3) */
on('rim', ev => { const m = S.match; if (m && S.ball.state === 'shot' && m.shotClock < tune('shotClock')) m.shotClock = tune('shotClock'); });
on('goal', onGoal);

/* ---- SUBSTITUTIONS (plan §6.14, §11.4): at each break every side's players get back a quarter of their juice. A CPU side
 * subs by itself: its tired player (the lowest juice, below .7) comes off for the bench player. A human side gets the SUB
 * screen on the break card: up and down choose who comes off (the court's two), left and right choose who comes on (the
 * bench), ✕ makes the change, ○ keeps the team as it is. The break's clock runs out and the team stays as it was. The
 * incoming player is fresh and takes the same input or brain as the one it replaces. Hub rounds have no subs. ---- */
const subOptions = side => {
  const ros = rosterOf(S.teams[side].id), on = S.players.filter(p => p.side === side && p.onCourt);
  const onIds = on.map(p => p.id), bench = ros.filter(r => !onIds.includes(r.id));
  return { on, bench };
};
const subCandidate = side => {
  const { on, bench } = subOptions(side);
  const tired = on.slice().sort((a, b) => a.juice - b.juice)[0];
  if (!tired || tired.juice >= .7 || !bench.length) return null;
  return { tired, bench: bench[0] };
};
const doSub = (side, c) => {
  const { tired, bench } = c;
  const np = makePlayer(tired.slot, bench.id, side);
  np.input = tired.input; np.human = tired.human; np.brain = tired.brain; np.device = tired.device;
  np.body.x = tired.body.x; np.body.y = tired.body.y; np.face = tired.face;
  if (tired.hasBall) { S.ball.owner = np; np.hasBall = true; }
  np.stats = tired.stats;
  S.players[tired.slot] = np;
  emit('sub', { slot: np.slot, side, off: tired.id, on: bench.id });
};
const sideHasHuman = side => S.players.some(p => p.side === side && p.human);
const subsAtBreak = () => {
  if (S.match && S.match.mode === 'hub') return;
  S.match.subUI = {};
  for (const side of [HOME, AWAY]) {
    for (const p of S.players.filter(q => q.side === side)) p.juice = Math.min(1, p.juice + .25);
    if (sideHasHuman(side)) { if (subOptions(side).bench.length) S.match.subUI[side] = { offI: 0, benchI: 0 }; }
    else { const c = subCandidate(side); if (c) doSub(side, c); }
  }
};
/** the SUB screen's step: a human of the side moves the choice and makes or skips the change */
const subUIStep = () => {
  const m = S.match; if (!m || !m.subUI || m.phase !== 'break') return;
  for (const side of [HOME, AWAY]) {
    const u = m.subUI[side]; if (!u) continue;
    const I = game.players.find(x => x && S.players.some(p => p.side === side && p.human && p.input === x));
    if (!I) { delete m.subUI[side]; continue; }
    const { on, bench } = subOptions(side);
    if (!on.length || !bench.length) { delete m.subUI[side]; continue; }
    if (I.pressed('up') || I.pressed('down')) u.offI = (u.offI + 1) % on.length;
    if (I.pressed('right') || I.pressed('left')) u.benchI = (u.benchI + 1) % bench.length;
    if (I.pressed('confirm')) { I.consume('confirm'); doSub(side, { tired: on[u.offI % on.length], bench: bench[u.benchI % bench.length] }); delete m.subUI[side]; }
    else if (I.pressed('cancel')) { delete m.subUI[side]; }
  }
};

/* ---- 36-fx.js ---- */
/* ---- THE CAMERA (plan §9.1): the director sets the focus every step. The broadcast camera follows the ball with a lead in
 * the direction of play, the court's middle held vertically; a dunk cam and the slow motion come with the dunks. ---- */
const cameraStep = (dt) => {
  const b = S.ball; if (!b) return;
  const lead = clamp(b.vx * .22, -48, 48);
  const x = clamp(b.x + lead, COURT_X0 - 60, COURT_X1 + 60), c = CENTRE();
  game.focus(x, c.y, 0);
};

/* ---- THE EFFECTS AND THE EVENT WIRING (plan §9.2–9.5): each event's banner, caption, hit-stop, shake, particles, crowd
 * and rumble. The sounds (fragments 10–12) listen to the same events; the attract director and the net do too. ---- */
const nameOf = p => p ? p.name : '';
const spark = (x, y, z, n, col) => { if (P && P.sparks) P.sparks(x, y, z, n, null, { color: col }); };
const glint = (x, y, z, n, col) => { if (P && P.glints) P.glints(x, y, z, n, col); };
const ringFx = (x, y, z, r0, r1, col) => { if (P && P.ring) P.ring(x, y, r0, r1, col, .4); };
const teamOf = slot => S.players[slot] ? S.players[slot].side : 0;

on('basket', ev => {
  const p = S.players[ev.slot], m = S.match;
  if (p && p.def.celebrations) p.celebrate = { name: p.def.celebrations[(S.fxRng() * p.def.celebrations.length) | 0], t: 0 };
  if (ev.dunk) { /* the dunk's own banner came with the slam */ }
  else if (ev.three) { banner('THREE!', 'THREE'); caption('three', { NAME: nameOf(p) }, 'DEE DEE'); }
  else caption('basket', { NAME: nameOf(p) }, 'VINNIE');
  if (p) p.stats.pts += 0;
  glint(ev.x, ev.y, ev.z, 10, '#ffe08a'); spark(ev.x, ev.y, ev.z, 12, '#fff6c0'); ringFx(ev.x, ev.y, ev.z, 4, 26, '#fff6c0');
  game.shake && game.shake(2);
  if (A && A.sfx) A.sfx('swish');
  const pts = m ? m.score[ev.side] : 0;
  if (p && p.stats.pts > (S.progress.records.mostPoints || 0)) { S.progress.records.mostPoints = p.stats.pts; saveProgress(); }
});
on('dunkStart', ev => {
  const p = S.players[ev.slot];
  if (ev.blocked) { banner('REJECTED!', 'REJECTED'); return; }
  if (!game.reduceMotion && tune('dunkSlowMo') < 1 && setting('shake') !== 'Off') { game.timeScale = tune('dunkSlowMo'); game.after(.35, () => { game.timeScale = 1; }); }   // §9.2: the apex in slow motion
  banner(ev.banner, 'DUNK'); caption('dunkPower', { NAME: nameOf(p) }, 'VINNIE');
  if (ev.lines === 'spin' || ev.lines === 'hang' || ev.lines === 'flip') caption('dunkSpin', { NAME: nameOf(p) }, 'DEE DEE');
  if (ev.lines === 'nova') caption('novaOn', { NAME: nameOf(p) }, 'VINNIE');
  if (ev.lines === 'quake') caption('quake', { NAME: nameOf(p) }, 'VINNIE');
  if (A && A.sfx) A.sfx('whoosh');
});
on('dunk', ev => {
  const p = S.players[ev.slot];
  if (game.freeze) game.freeze(.08);
  game.shake && game.shake(4);
  if (P && P.ring) ringFx(ev.x, ev.y, ev.z, 4, 26, '#fff6c0');
  spark(ev.x, ev.y, ev.z, 16, '#ffd23a'); glint(ev.x, ev.y, ev.z, 10, '#ffffff');
  if (A && A.sfx) A.sfx('slam');
});
on('alleyoop', ev => { caption('alleyoop', { NAME: nameOf(S.players[ev.to]) }, 'VINNIE'); banner('ALLEY-OOP!', 'ALLEYOOP'); });
on('block', ev => {
  const p = S.players[ev.slot];
  if (ev.rejected) { banner('REJECTED!', 'REJECTED'); caption('block', { NAME: nameOf(p) }, 'VINNIE'); }
  if (game.freeze) game.freeze(.06);
  spark(ev.x, ev.y, ev.z, 8, '#ff5a3a'); if (A && A.sfx) A.sfx('block');
});
on('steal', ev => { banner('PICKPOCKET!', 'PICKPOCKET'); caption('steal', { NAME: nameOf(S.players[ev.slot]), VICTIM: nameOf(S.players[ev.victim]) }, 'DEE DEE'); glint(ev.x, ev.y, 18, 6, '#7af0a0'); if (A && A.sfx) A.sfx('steal'); });
on('shove', ev => { if (A && A.sfx) A.sfx('shove'); });
on('knockdown', ev => { if (A && A.sfx) A.sfx('fall'); if (S.match && COMMENTARY_LEVEL() === 2 && Math.random() < .25) caption('shove', { VICTIM: nameOf(S.players[ev.slot]), NAME: nameOf(S.players[ev.by]) }, 'VINNIE'); });
on('ankles', ev => { banner('ANKLES!', 'ANKLES'); caption('ankles', { VICTIM: nameOf(S.players[ev.slot]) }, 'DEE DEE'); });
on('goaltend', ev => { banner('GOALTENDING!', 'REJECTED'); caption('goaltend', {}, 'VINNIE'); });
on('shatter', ev => { banner('SHATTERED!', 'SHATTERED'); caption('shatter', {}, 'VINNIE'); game.shake && game.shake(6); if (game.freeze) game.freeze(.15); S.glassOut = 1; if (A && A.sfx) A.sfx('shatter'); });
on('supernovaOn', ev => { const p = S.players[ev.slot]; banner('SUPERNOVA!', 'SUPERNOVA'); caption('novaOn', { NAME: nameOf(p) }, 'VINNIE'); ringFx(p.body.x, p.body.y, p.body.z, 4, 34, '#e8b0ff'); if (A && A.sfx) A.sfx('nova'); });
on('supernovaOff', ev => { const p = S.players[ev.slot]; caption('novaOff', { NAME: nameOf(p) }, 'VINNIE'); });
on('quarterEnd', ev => { caption('quarterEnd', {}, 'VINNIE'); });
on('halftime', ev => { caption('halftime', {}, 'DEE DEE'); });
on('overtime', ev => { banner('OVERTIME!', 'DUNK'); caption('clutch', {}, 'VINNIE'); });
on('shotClockViolation', ev => { caption('shotclock', {}, 'VINNIE'); });
on('deadBall', ev => { if (ev.reason === 'shotclock') banner('SHOT CLOCK!', 'THREE'); });
on('possession', ev => { S.captionsThisPoss = 0; });
on('gameEnd', ev => { caption('final', { TEAM: S.teams[ev.winner === null ? 0 : ev.winner] ? S.teams[ev.winner === null ? 0 : ev.winner].short : '' }, 'VINNIE'); playSting(ev.winner === 0 ? 'victory' : 'defeat'); });
on('tipoff', ev => { caption('tipoff', {}, 'VINNIE'); });
on('quarterStart', ev => { /* the break card is over: the quarter's own card is the HUD's */ });

/** the match's scene step after the rules: the HUD's clock, the camera; when the game is over the results come after a beat */
const matchFrame = dt => {
  hudStep(dt);
  if (S.match && S.match.over && !S.resultsQueued) {
    S.resultsQueued = true;
    game.after(2.2, () => { game.go('results', resultsData(), { fade: .3 }); });
  }
};
/** the results: the final, the MVP (the most points, then the style), the box score and the rematch's setup */
const resultsData = () => {
  const m = S.match, pl = S.players.slice().sort((a, b) => b.stats.pts - a.stats.pts), mvp = pl[0];
  const box = S.players.map(p => `${p.name.padEnd(14, ' ')}${String(p.stats.pts).padStart(4)}${String(p.stats.reb).padStart(5)}${String(p.stats.ast).padStart(5)}${String(p.stats.stl).padStart(5)}${String(p.stats.blk).padStart(5)}${String(p.stats.dunks).padStart(5)}`);
  const home = S.teams[0], away = S.teams[1];
  return { match: { score: m.score.slice() }, homeName: home.short, awayName: away.short, courtName: COURTS[S.court].name, mvp: mvp ? mvp.name : '-', blam: mvp ? mvp.name + ' · ' + (mvp.stats.dunks ? mvp.stats.dunks + ' DUNK' + (mvp.stats.dunks > 1 ? 'S' : '') : mvp.stats.pts + ' POINTS') : '-', box, rematch: { court: S.court, humans: S.lastHumans || [], home: home.id, away: away.id, qLen: m.qLen, difficulty: setting('difficulty'), powerups: S.powerupsOn, twists: S.twistsOn } };
};

/* ---- 37-step.js ---- */
/* ---- THE STEP (plan §4.3): one 1/120 s step of a match. 1 commands (each slot's source writes its command: a human's
 * device, a CPU brain, the network or a script), 2 players (state, movement, the shot's gather and jump, the rig), 3 the
 * ball (attached to its owner, or flying), 4 the match (clocks, phases, inbounds), 5 the events (delivered at once by emit),
 * 6 the camera. Commands are the only way a player is driven: humans, brains, the net and tests all go through them. ---- */
const HIP = 20, GATHER_T = .08, SHOT_RELEASE_LATE = .25;

/** a human's command from its input: the stick on the ground (the screen's direction turned by the view), the buttons */
const humanCmd = p => {
  const I = p.input, c = emptyCmd(), mv = I.move();
  const g = game.view.screenDirToGround(mv[0], mv[1]) || [mv[0], mv[1]];
  c.move = [g[0], g[1]];
  c.shoot = { down: I.down('shoot'), pressed: I.pressed('shoot'), released: I.released('shoot') };
  c.pass = { pressed: I.pressed('pass') };
  c.turbo = { down: I.down('turbo') };
  c.shove = { pressed: I.pressed('shove') };
  c.oop = { pressed: I.pressed('oop') };
  c.taunt = { pressed: I.pressed('taunt') };
  if (c.pass.pressed) I.consume('pass');
  if (c.shove.pressed) I.consume('shove');
  if (c.oop.pressed) I.consume('oop');
  if (c.shoot.pressed) I.consume('shoot');
  return c;
};

/** the shot machine: gather, then the jump; the release is the shooter's (the button, or the brain's timed one), and a
 * jump that is not released is released .25 s after its top */
const startShot = p => { p.state = 'gather'; p.stateT = 0; p.shot = { phase: 'gather', jt: 0, apexT: 0, plan: p.nextShotPlan || 0, kind: 'jump' }; p.nextShotPlan = 0; };
const shotStep = (p, dt) => {
  const sh = p.shot; sh.t = (sh.t || 0) + dt;
  if (sh.phase === 'gather') {
    if (sh.t >= GATHER_T) {
      const v = tune('jumpShotVz') + 10 * rate(p, 'swat');
      p.body.jump(v); p.air = true; p.jumping = true;
      sh.phase = 'jump'; sh.jt = 0; sh.apexT = v / tune('playerGravity');
      p.state = 'jump';
    }
    return;
  }
  if (sh.phase === 'jump') {
    sh.jt += dt;
    const released = p.human ? p.cmd.shoot.released : sh.jt >= sh.apexT + sh.plan;
    if (released || sh.jt >= sh.apexT + SHOT_RELEASE_LATE) {
      if (p.hasBall) releaseShot(p, sh.jt - sh.apexT, sh.kind);
      sh.phase = 'done'; p.shot = null;
    }
  }
};

/** a player's state step: knocked (down for a time), a shot in its gather or jump, or running (the stick, the ball's
 * handling, the pass). The motion is the body's; the rig is posed from the state. */
const playerStep = (p, dt) => {
  const c = p.cmd, b = p.body;
  powerTick(p, dt);
  p.stateT += dt;
  p.lastStep = S.match ? S.match.t : 0;
  if (p.knocked > 0) {
    p.knocked = Math.max(0, p.knocked - dt);
    b.vx = approach(b.vx, 0, 900 * dt); b.vy = approach(b.vy, 0, 900 * dt);
    if (p.knocked === 0) { p.state = 'run'; p.stateT = 0; }
    b.gravity = tune('playerGravity'); b.update(dt, S.map); clampToArena(p);
    p.rig.update(dt, rigState(p, { pose: 'down', down: 1 }));
    return;
  }
  if (p.dunk) { dunkStep(p, dt); clampToArena(p); p.rig.update(dt, rigState(p)); return; }
  if (p.hang > 0) { p.hang = Math.max(0, p.hang - dt); if (p.hang === 0) { p.air = false; } }
  if (p.spinT > 0) p.spinT = Math.max(0, p.spinT - dt);
  if (p.cool.steal >= 0 && p.state === 'steal' && p.stateT > .2) p.state = 'run';
  if (p.state === 'shove' && p.stateT > .14) p.state = 'run';
  actionsFromCmd(p);
  if (p.state === 'spin' && p.spinT <= 0) p.state = 'run';
  if (p.passT !== undefined) { p.passT += dt; if (p.passT > .2) p.passT = undefined; }
  if (p.celebrate) { p.celebrate.t += dt; if (p.celebrate.t >= 1.4) p.celebrate = null; }
  if (p.tauntT > 0) { p.tauntT -= dt; if (p.tauntT <= 0) { p.tauntT = 0; if (p.state === 'taunt') p.state = 'run'; } }
  // the stick's walk (no walking while a shot leaves the floor, except in the air)
  const shooting = p.state === 'gather' || p.state === 'jump';
  const sp = playerSpeed(p), mv = c.move, m = Math.hypot(mv[0], mv[1]);
  const moving = m > .15 && !shooting;
  turboStep(p, dt, moving);
  p.juice = Math.max(0, p.juice - (.004 + (p.turboOn ? .01 : 0)) * dt * tune('fatigue'));   // §6.14: juice falls on court, faster on turbo
  const onSlick = (S.twist.slicks || []).some(s => Math.hypot(b.x - s.x, b.y - s.y) < s.r);   // §10.1: a slick cuts the acceleration to .15 (the player slides)
  const accelK = onSlick ? .15 : 1;
  const want = moving ? sp * Math.min(1, m) : 0;
  const tx = moving ? mv[0] / (m || 1) * want : 0, ty = moving ? mv[1] / (m || 1) * want : 0;
  if (!shooting) {
    b.vx = approach(b.vx, tx, tune('accel') * accelK * dt); b.vy = approach(b.vy, ty, tune('accel') * accelK * dt);
  } else if (b.z > 0) { b.vx *= Math.exp(-dt * .6); b.vy *= Math.exp(-dt * .6); }
  else { b.vx = approach(b.vx, 0, 600 * dt); b.vy = approach(b.vy, 0, 600 * dt); }
  if (m > .2 && !shooting) p.face = E.approachAng(p.face, Math.atan2(mv[1], mv[0]), dt * 12);
  if (p.face === undefined) p.face = 0;
  if (p.shot && p.state === 'gather' || p.state === 'jump' && p.shot) shotStep(p, dt);
  if (p.state === 'jump' && p.shot && p.shot.phase === 'done') { p.state = 'run'; p.shot = null; p.jumping = false; }
  if (p.state === 'jump' && !p.shot) { p.reachJump = (p.reachJump || 0) - dt; if (p.reachJump <= 0 && b.z <= 1) { p.state = 'run'; p.jumping = false; } }
  if (p.state === 'gather' && !p.hasBall) { p.state = 'run'; p.shot = null; }
  if (p.hasBall && p.state === 'run') { p.dribbleSpeed = Math.hypot(b.vx, b.vy); }
  b.gravity = tune('playerGravity') * (S.cheats && S.cheats.moonGravity ? .55 : 1);   // MOON GRAVITY (the code): players and the ball fall at .55
  b.update(dt, S.map);
  clampToArena(p);
  if (b.z <= 1 && p.air && b.vz <= 0) { p.air = false; p.jumping = false; if (p.state === 'jump' && !p.shot) p.state = 'run'; emit('land', { slot: p.slot, x: b.x, y: b.y }); }
  p.z = b.z;
  p.rig.update(dt, rigState(p));
};

/** the rig's state for a player (plan §7): feet, facing, velocity; a jump tucks the legs, a knock lies it down */
const rigState = (p, extra = {}) => {
  const b = p.body;
  if (p.rig && !clipOfPlayer(p)) { p.rig.bbPose = poseTargetOf(p); p.rig.bbPoseL = null; p.rig.o.lean = 0; }
  let pose = p.state === 'gather' ? 'crouch' : null;
  let hop = 0;
  const clip = clipOfPlayer(p);   // the body clip of a celebration, a taunt or a dunk (§7.3)
  if (clip) { const k = sampleClip(clip.c, clip.t); pose = k.pose; hop = k.z; if (p.rig) { p.rig.bbPose = k.R; p.rig.bbPoseL = k.L; p.rig.o.lean = k.lean; } if (k.kick && p.rig) p.rig.kick(k.kick * .2); }
  if (p.dunk) { const u = p.dunk.u || 0; pose = u < .12 ? 'crouch' : u > .9 ? 'cheer' : null; }   // the body of a dunk: crouch to leave, cheer after the slam
  return Object.assign({ x: b.x, y: b.y, z: b.z + hop, vx: b.vx, vy: b.vy, facing: p.face, air: p.air, pose, run: Math.min(1, Math.hypot(b.vx, b.vy) / 120), stance: p.hasBall ? null : 'guard', flip: p.dunk && p.dunk.flip ? p.dunk.flip : 0 }, extra);
};

/** the ball's handling: held (hands at the chest), dribbled (the ball's phase from the speed: 2.2 Hz standing, 3 running,
 * 3.8 on turbo: the ball leaves the hand to the floor and back, §7.2), or the inbound's (at the thrower's chest) */
const ballAttach = (b, dt) => {
  const p = b.owner; if (!p) return;
  const sz = p.size || 1, f = p.face, px = -Math.sin(f), py = Math.cos(f);
  if (p.dunk) { b.x = p.body.x; b.y = p.body.y; b.z = p.body.z + 46 * sz; b.state = 'held'; b.vx = b.vy = b.vz = 0; return; }   // the ball rides the hands in the dunk
  const sp = Math.hypot(p.body.vx, p.body.vy);
  if (b.state === 'inbound' || (b.state === 'held' && sp < 15)) {
    b.state = b.state === 'inbound' ? 'inbound' : 'held';
    const hp = p.rig.hand('R'); b.x = hp[0]; b.y = hp[1]; b.z = hp[2] + 2; b.vx = b.vy = b.vz = 0;
    return;
  }
  b.state = 'dribble';
  const rate2 = p.turboOn ? 3.8 : sp > 60 ? 3.0 : 2.2;
  p.dribbleT = (p.dribbleT || 0) + dt * rate2;
  const phi = p.dribbleT % 1, s = Math.sin(Math.PI * phi);
  const hand = p.dribbleHand || 1;
  const hp = p.rig.hand('R');   /* the dribble rides the hand's x and y (the pose layer put it where the ball is) */
  b.x = hp[0] + px * 0 * hand; b.y = hp[1] + py * 0 * hand;
  b.z = BALL_R + (HIP * sz - BALL_R) * (1 - s * s);
  b.vx = p.body.vx; b.vy = p.body.vy; b.vz = 0;
  if (phi < .5 && s > .0 && Math.floor(p.dribbleT) !== (p.dribbleFloor || 0)) { p.dribbleFloor = Math.floor(p.dribbleT); emit('dribble', { slot: p.slot, x: b.x, y: b.y }); }
};

/** one match step: the whole of §4.3 in order */
const matchStep = dt => {
  const m = S.match; if (!m) return;
  // 1: commands
  for (const p of S.players) {
    if (!p.onCourt) continue;
    p.cmd = p.human ? humanCmd(p) : (p.brain && !S.cheats.cpuPassive ? brainCmd(p, dt) : emptyCmd());   // (CPU PASSIVE: the dev panel)
  }
  // 2: players
  for (const p of S.players) if (p.onCourt) playerStep(p, dt);
  // 3: the ball: attached or flying; then the loose ball's pickups
  const b = S.ball;
  if (b.owner) ballAttach(b, dt);
  else ballStep(b, dt);
  if (!b.owner && b.state !== 'dead' && b.state !== 'inbound') for (const p of S.players) if (p.onCourt && reachBall(p)) break;
  if (b.state === 'shot') for (const p of S.players) if (p.onCourt && Math.hypot(b.x - p.body.x, b.y - p.body.y) < 30 && goaltendCheck(p)) break;
  // 4: the match's rules, the twists and the power-ups
  matchRules(dt);
  twistStep(dt);
  powerupStep(dt);
  // 5/6: the hoops, the camera (in fx)
  stepHoops(dt);
  novaStep(dt);
  S.lastStep = m.t;
};

/** Supernova (§6.12): ignites for a player when the team has a run of baskets; ends after the other side scores, after
 * novaMaxBaskets more baskets, or after novaTime seconds of game clock */
const igniteNova = p => {
  p.nova = true; p.novaT = 0; p.novaBaskets = 0; p.stats.novas++;
  emit('supernovaOn', { slot: p.slot, side: p.side });
};
const endNova = (p, why) => { if (!p.nova) return; p.nova = false; emit('supernovaOff', { slot: p.slot, why }); };
const novaStep = dt => {
  for (const p of S.players) {
    if (!p.nova) continue;
    p.novaT += dt;
    if (p.novaT >= tune('novaTime') || (p.novaBaskets || 0) >= tune('novaMaxBaskets')) endNova(p, 'time');
  }
};

/* ---- 38-setup.js ---- */
/* ---- SETUP OF A MATCH: the court's arena, the four players of the two teams (slots 0–1 HOME, 2–3 AWAY), who is human
 * (each human's input is a device's: game.players, the one on the keyboard or a pad) and who is a CPU brain, the match
 * state and the ball. Exhibition, the Tour's stops, the hub's round, the attract mode and the tests all start here. ---- */
/** the two teams' rosters (their starters: the first two players of each team), by their ids */
const startersOf = teamId => rosterOf(teamId).slice(0, 2);

/** the match's players: four entities (the starters of each side) with their inputs and brains. opts: { home, away (team ids),
 *  humans: [{ slot, input }], difficulty (the CPU's), powerups, twists, qLen, court }. Returns the match's state. */
const setupMatch = (opts = {}) => {
  const court = COURTS[opts.court || 'skybox'];
  S.rng = E.rng(opts.seed || S.seed || 1); S.fxRng = E.rng((opts.seed || S.seed || 1) + 1000);
  S.court = court.id; S.courtDef = court;
  S.map = buildArena(court);
  S.teams = [teamDef(opts.home || court.home), teamDef(opts.away || 'breakers')];
  S.cheats = Object.assign({}, opts.cheats || {});
  S.powerupsOn = opts.powerups !== undefined ? !!opts.powerups : setting('powerups') !== 'Off';
  S.twistsOn = opts.twists !== undefined ? !!opts.twists : setting('twists') !== 'Off';
  S.players = [];
  const starts = [startersOf(S.teams[0].id), startersOf(S.teams[1].id)];
  for (let side = 0; side < 2; side++) for (let k = 0; k < 2; k++) {
    const slot = side * 2 + k, pid = starts[side][k].id, p = makePlayer(slot, pid, side);
    S.players.push(p);
  }
  const home = S.players.filter(p => p.side === HOME), away = S.players.filter(p => p.side === AWAY);
  // the starters' spots, facing the far baselines
  placePlayer(home[0], OX + 150, OY + 130, 0); placePlayer(home[1], OX + 150, OY + 160, 0);
  placePlayer(away[0], OX + CW - 150, OY + 130, PI); placePlayer(away[1], OX + CW - 150, OY + 160, PI);
  for (const h of opts.humans || []) { const p = S.players[h.slot]; if (!p) continue; p.human = true; p.input = h.input; p.device = h.input && h.input.lastDevice; }
  for (const p of S.players) { if (!p.human) p.brain = newBrain(p, S.rng() * .1); poseLayer(p.rig); }
  S.ball = newBall();
  S.powerups = []; S.puT = undefined; S.powerupsOn = S.powerupsOn && opts.powerups !== false;
  twistStart();
  S.lastHumans = opts.humans || [];
  S.match && (S.match.mode = opts.mode || 'exhibition');
  S.match = newMatch({ qLen: opts.qLen || tune('quarterLength'), mode: opts.mode || 'exhibition' });
  if (opts.difficulty !== undefined) S.tourShift = opts.tourShift || 0;
  S.seq = S.seq || 0;
  S.gameOver = false;
  tipOff();
  playSong(court.song);
  crowdStart();
  return S.match;
};

/* ---- 39-arcade.js ---- */
/* ---- THE ARCADE LAYER (plan §6.8, §6.10, §6.13, §10.3): layups, the twelve-dunk catalog and its choice, dunks that score
 * unless blocked, alley-oops, putbacks, steals, shoves that knock down and fumble, spin moves that break ankles, blocks,
 * goaltending and the backboard that shatters. The shot's outcome is decided where the shot starts; these rules pick
 * the play and decide the blocks. ---- */
const DUNKS = [
  { id: 'hammer', banner: 'TWO-HAND HAMMER', slam: 0, dist: [0, 70], bonus: 0, lines: 'power' },
  { id: 'tomahawk', banner: 'TOMAHAWK!', slam: 5, dist: [30, 130], bonus: 50, lines: 'power' },
  { id: 'doublepump', banner: 'DOUBLE PUMP!', slam: 6, dist: [30, 120], bonus: 80, lines: 'power' },
  { id: 'reverse', banner: 'REVERSE ROCKET!', slam: 6, dist: [20, 100], bonus: 100, lines: 'spin', needs: { behind: true } },
  { id: 'windmill', banner: 'WINDMILL!', slam: 7, dist: [50, 150], bonus: 100, lines: 'spin' },
  { id: 'threesixty', banner: 'THREE-SIXTY!', slam: 7, dist: [40, 140], bonus: 120, lines: 'spin' },
  { id: 'ftflyer', banner: 'FREE-THROW FLYER!', slam: 8, dist: [110, 300], bonus: 150, lines: 'hang' },
  { id: 'flip', banner: 'FRONT-FLIP FREAK!', slam: 8, dist: [60, 150], bonus: 180, lines: 'flip' },
  { id: 'rattler', banner: 'RIM RATTLER!', slam: 4, dist: [0, 60], bonus: 60, lines: 'hang' },
  { id: 'nova720', banner: 'SEVEN-TWENTY SUPERNOVA!', slam: 0, dist: [60, 190], bonus: 250, lines: 'nova', needs: { nova: true } },
  { id: 'volcano', banner: 'VOLCANO LAUNCH!', slam: 0, dist: [0, 300], bonus: 300, lines: 'volcano', needs: { vent: true } },
  { id: 'quake', banner: 'BLAM-QUAKE!!!', slam: 0, dist: [80, 300], bonus: 400, lines: 'quake', needs: { overclock: true } }
];
for (const d of DUNKS) def('dunk', d.id, d);

/** the dunk's range from the rim (§6.8): dunkRange × the SLAM factor, plus the power-ups and Supernova */
const dunkRangeOf = p => {
  if (S.cheats && S.cheats.skyDunks) return 400;   // SKY DUNKS: a dunk from half court
  let r = tune('dunkRange') * (.75 + .05 * rate(p, 'slam'));
  if (p.nova) r += 40;
  if (p.moon > 0) r += 20;
  return r;
};
/** a dunk of the catalog chosen by what the situation needs (§10.3): needs pass, weighted by its bonus and by
 * (SLAM − its minimum + 1), drawn with the match's seeded stream */
const pickDunk = (p, d, ctx = {}) => {
  const ok = DUNKS.filter(k => {
    if (rate(p, 'slam') < k.slam) return false;
    if (d < k.dist[0] || d > k.dist[1]) return false;
    if (k.needs && k.needs.nova && !p.nova) return false;
    if (k.needs && k.needs.overclock && !ctx.overclock) return false;
    if (k.needs && k.needs.vent && !ctx.vent) return false;
    if (k.needs && k.needs.behind && !ctx.behind) return false;
    return true;
  });
  if (!ok.length) return DUNKS[0];
  const w = ok.map(k => (k.bonus + 40) * (rate(p, 'slam') - k.slam + 1));
  let r = S.rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i]; }
  return ok[ok.length - 1];
};

/** a layup: a shot with turbo off inside 40 of the rim: a short rise and scoop, the make chance high (§6.8) */
const layupChance = p => clamp(.85 * (.78 + .045 * rate(p, 'splash')) * juiceFactor(p) * tune('shotSkill'), .02, .97);

/** a dunk begins: the dunker leaves the floor and flies to the slam point (§6.8). The outcome is decided here: a dunk
 * scores unless a defender in the air blocks it before the slam (§6.10); a slam of SLAM 3 or less misses 4% off the back rim */
const startDunk = (p, opts = {}) => {
  const rim = attackRim(p.side), R = RIMW[rim], d = rimDist(p.body.x, p.body.y, rim);
  const pos = { x: p.body.x, y: p.body.y };
  const ctx = { overclock: !!(p.team && p.team.boss && S.twist.overclock), vent: !!opts.vent, behind: opts.behind };
  const kind = opts.kind || pickDunk(p, d, ctx);
  const blocker = S.cheats.unblockable ? null : contestOf(p, rim).who;
  let blocked = false;
  if (blocker && blocker.body.z > 12 && Math.hypot(blocker.body.x - p.body.x, blocker.body.y - p.body.y) < 30) {
    const chance = clamp(.25 + .06 * (rate(blocker, 'swat') - rate(p, 'slam')), .05, .75) * tune('blockChance');
    blocked = S.rng() < chance;
  }
  const fail = rate(p, 'slam') <= 3 && S.rng() < .04;
  const made = !blocked && !fail;
  const T = .9 * tune('dunkHang') * (opts.long ? 1.2 : 1);
  p.dunk = { kind, t: 0, T, made, blocked, fail, rim, start: pos, behind: !!opts.behind, slamped: false, from: d, lobbed: !!opts.lobbed };
  p.state = 'dunk'; p.stateT = 0; p.jumping = true; p.air = true;
  p.body.vz = 0;
  emit('dunkStart', { slot: p.slot, side: p.side, dunk: kind.id, banner: kind.banner, blocked, made, lines: kind.lines, dist: d });
  if (blocked) emit('block', { slot: blocker.slot, side: blocker.side, x: p.body.x, y: p.body.y, z: p.body.z + 40, posterized: true });
  return p.dunk;
};
/** a dunk's flight, each step (§6.8): the path from takeoff to the slam point, with a parabola; the slam at u ≈ .9 */
const dunkStep = (p, dt) => {
  const k = p.dunk, R = RIMW[k.rim]; k.t += dt;
  const u = clamp(k.t / k.T, 0, 1);
  k.u = u;
  const ax = R.x - (k.behind ? -4 : 4), ay = R.y;
  p.body.x = lerp(k.start.x, ax, u); p.body.y = lerp(k.start.y, ay, u);
  p.body.z = 42 * Math.sin(Math.PI * Math.min(1, u));
  const base = Math.atan2(R.y - k.start.y, R.x - k.start.x), id = k.kind.id;
  // the spins of the catalog (§10.3): THREE-SIXTY a full turn over the flight's middle, SEVEN-TWENTY two turns
  const turns = id === 'threesixty' ? 1 : id === 'nova720' ? 2 : 0;
  p.face = base + turns * TAU * clamp((u - .2) / .65, 0, 1);
  k.flip = id === 'flip' ? clamp((u - .25) / .5, 0, 1) : 0;   // FRONT-FLIP FREAK: a somersault over u .25–.75 (rig.flip)
  p.air = true;
  if (!k.slamped && u >= .9) {
    k.slamped = true;
    p.rig.kick(1);   // the body kicks at the slam (§7.3: rig.kick on the slam)
    if (k.made) {
      const rec = { shooter: p.slot, made: true, points: 2, dunk: k.kind.id, rim: k.rim, t: S.match.clock, age: 0, perfect: true, three: false, release: 0, kind: 'dunk', p: 1, dist: k.from };
      p.stats.dunks++; p.stats.fga++; p.stats.fgm++;
      const b = S.ball; b.owner = null; p.hasBall = false; b.shot = rec; b.state = 'shot'; b.x = R.x; b.y = R.y; b.z = R.z + 6; b.vx = b.vy = 0; b.vz = -180;
      S.match.shotsInFlight = (S.match.shotsInFlight || 0) + 1;
      emit('dunk', { slot: p.slot, side: p.side, dunk: k.kind.id, banner: k.kind.banner, bonus: k.kind.bonus, x: R.x, y: R.y, z: R.z, slam: true, lines: k.kind.lines });
      if (maybeShatter(p, k.kind)) { S.match.sponsorT = 0; S.match.sponsorPending = true; }
      // POSTERIZED (§6.8): a defender in front of the rim, within 24 of the slam, goes down with the dizzy stars
      for (const q of S.players) { if (q.side === p.side || !q.onCourt || q.knocked > 0) continue; if (Math.hypot(q.body.x - R.x, q.body.y - R.y) < 24) { knockDown(q, 1.2); emit('posterized', { slot: p.slot, victim: q.slot, by: p.slot, x: q.body.x, y: q.body.y }); } }
      if (k.kind.id === 'rattler') p.dunkHang = 1.2;
    } else if (k.blocked) {
      // a blocked dunk: the ball is knocked away from the rim
      const b = S.ball; b.owner = null; b.state = 'loose'; b.x = R.x - 8; b.y = R.y; b.z = R.z; b.vx = -120; b.vy = 40; b.vz = 120;
    } else {
      // a missed dunk off the back rim
      const b = S.ball; b.owner = null; b.state = 'loose'; b.x = R.x; b.y = R.y - 6; b.z = R.z + 2; b.vx = 60; b.vy = -40; b.vz = 150;
      emit('rim', { x: R.x, y: R.y, z: R.z, speed: 150, rim: k.rim });
    }
  }
  if (u >= 1) {
    p.rig.kick(-1); p.rig.land(1);   // a three-point landing (§7.3)
    p.dunk = null; p.state = 'run'; p.jumping = false;
    if (p.dunkHang) { p.hang = p.dunkHang; p.dunkHang = 0; }
    p.body.z = 0; p.air = false; emit('land', { slot: p.slot, x: p.body.x, y: p.body.y });
  }
};

/** the alley-oop (§6.8): the passer throws a lob to the receiver's hands near the rim; a receiver who catches it in the
 * air dunks (the alley-oop's own bonus). The lob can be intercepted or blocked (the interception is the defence's). */
const alleyOop = (p, mate) => {
  const rim = attackRim(p.side), R = RIMW[rim];
  const from = { x: p.body.x, y: p.body.y, z: p.body.z + 30 };
  const tgt = { x: mate.body.x + mate.body.vx * .4, y: mate.body.y + mate.body.vy * .4, z: 62 };
  const v = E.arc(from, tgt, tune('ballGravity'), { time: .75 });
  ballRelease(S.ball, from, v, 'pass', null);
  S.ball.to = mate.slot; S.ball.oop = true; S.ball.from = p.slot;
  p.stats.ast++; p.hasBall = false; S.ball.owner = null;
  mate.oopReady = .9;
  emit('alleyoop', { slot: p.slot, to: mate.slot, side: p.side });
};

/** a steal (§6.10): a swipe of .2 s; the chance by SWIPE, the handler's DIME, the angle, turbo and spin */
const stealAttempt = p => {
  if (p.cool.steal > 0 || !p.onCourt) return false;
  const b = S.ball, h = b.owner; if (!h || h.side === p.side) return false;
  const d = Math.hypot(h.body.x - p.body.x, h.body.y - p.body.y);
  if (d > tune('stealReach') + .6 * rate(p, 'swipe')) return false;
  p.cool.steal = tune('stealCooldown');
  p.state = 'steal'; p.stateT = 0;
  if (h.spinT > 0) { emit('stealMiss', { slot: p.slot }); return false; }
  const ang = Math.abs(E.angDiff(Math.atan2(p.body.y - h.body.y, p.body.x - h.body.x), h.face));
  const angleF = ang > 2.2 ? 1.4 : ang < .9 ? .6 : 1;
  let chance = tune('stealChance') * (.55 + .09 * rate(p, 'swipe')) * (1.25 - .05 * rate(h, 'dime')) * angleF * (h.turboOn ? 1.15 : 1) * (p.nova ? 1.2 : 1) * (h.glue ? 0 : 1);
  if (p.brain) chance *= diffOf(p).steal * tune('cpuAggression');
  if (S.rng() < clamp(chance, 0, .95)) {
    releaseLoose(b);
    b.vx = Math.cos(p.face) * 60; b.vy = Math.sin(p.face) * 60; b.vz = 40; b.state = 'loose';
    p.stats.stl++;
    emit('steal', { slot: p.slot, side: p.side, victim: h.slot, x: h.body.x, y: h.body.y });
    h.stats.turnovers = (h.stats.turnovers || 0) + 1;
    takeStolen(p, b);
    return true;
  }
  p.state = 'run';
  emit('stealMiss', { slot: p.slot });
  return false;
};
/** the stealer picks the loose ball straight up if it is near (a clean steal), else it rolls on */
const takeStolen = (p, b) => { if (Math.hypot(b.x - p.body.x, b.y - p.body.y) < 8) takeBall(p, 'loose-steal'); };

/** a shove (§6.10): a two-handed push; a hit knocks the target down; the handler may fumble the ball */
const shoveAttempt = p => {
  if (p.cool.shove > 0 || p.knocked > 0 || !p.onCourt) return false;
  const costs = tune('shoveCost');
  if (p.turbo < .1) return false;
  p.turbo = Math.max(0, p.turbo - costs);
  p.cool.shove = tune('shoveCooldown') * (p.brain ? 1.1 : 1);
  p.state = 'shove'; p.stateT = 0;
  emit('shove', { slot: p.slot, side: p.side, x: p.body.x, y: p.body.y });
  const bumpA = rate(p, 'bump');
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt || q.knocked > 0) continue;
    const dx = q.body.x - p.body.x, dy = q.body.y - p.body.y, d = Math.hypot(dx, dy);
    if (d > 22) continue;
    const ang = Math.abs(E.angDiff(Math.atan2(dy, dx), p.face));
    if (ang > PI / 3) continue;
    const kdTime = clamp(tune('knockdownTime') + .04 * (bumpA - rate(q, 'bump')), .3, 1.4);
    knockDown(q, kdTime);
    q.body.vx += Math.cos(Math.atan2(dy, dx)) * tune('shoveForce') * .5;
    q.body.vy += Math.sin(Math.atan2(dy, dx)) * tune('shoveForce') * .5;
    emit('knockdown', { slot: q.slot, by: p.slot, victim: q.id, x: q.body.x, y: q.body.y, time: kdTime });
    if (S.ball.owner === q) {
      const fumble = clamp(tune('shoveFumble') + .04 * (bumpA - rate(q, 'bump')), .2, .95);
      if (S.rng() < fumble) { releaseLoose(S.ball); S.ball.vx = dx * 2; S.ball.vy = dy * 2; S.ball.vz = 80; S.ball.state = 'loose'; emit('fumble', { slot: q.slot, by: p.slot }); }
    }
    p.stats.knock++;
  }
  return true;
};

/** a spin move with the ball (§6.10): a .35 s turn that carries the handler on and breaks steals and ankles */
const spinMove = p => {
  if (p.cool.spin > 0 || p.turbo < tune('spinCost')) return false;
  p.turbo -= tune('spinCost'); p.cool.spin = tune('spinCooldown');
  p.spinT = .35; p.state = 'spin'; p.stateT = 0;
  p.body.vx += Math.cos(p.face) * 60; p.body.vy += Math.sin(p.face) * 60;
  for (const q of S.players) {
    if (q.side === p.side || !q.onCourt) continue;
    const dx = q.body.x - p.body.x, dy = q.body.y - p.body.y, d = Math.hypot(dx, dy);
    if (d < 14 && Math.abs(E.angDiff(Math.atan2(dy, dx), p.face)) < .9) {
      knockDown(q, .4); emit('ankles', { slot: q.slot, by: p.slot, victim: q.id, x: q.body.x, y: q.body.y });
      q.stats.ankles = (q.stats.ankles || 0) + 1;
    }
  }
  emit('spin', { slot: p.slot, x: p.body.x, y: p.body.y });
  return true;
};

/** a block (§6.10): a jump at a shot in its first .25 s of flight; its chance by SWAT and the timing; a block sends the ball
 * off, and a block of a made shot is a real block (the outcome changes here, by this roll) */
const blockAttempt = p => {
  const b = S.ball;
  if (b.state !== 'shot' || !b.shot || b.shot.age > .25) return false;
  if (b.shot.shooter && S.players[b.shot.shooter].side === p.side) return false;
  const d = Math.hypot(b.x - p.body.x, b.y - p.body.y), reach = tune('blockReach') + .8 * rate(p, 'swat');
  if (d > reach + 14) return false;
  const dif = p.brain ? diffOf(p) : null;
  const timing = dif ? (S.rng() - .5) * dif.block : 0;
  const chance = clamp(.2 + .05 * (rate(p, 'swat') - 5) - timing * 2, .05, .6) * tune('blockChance');
  p.cool.block = .6;
  if (S.rng() >= chance) return false;
  const shooter = S.players[b.shot.shooter];
  b.shot.resolved = true; b.shot.blocked = true; b.shot.made = false;
  if (S.match.shotsInFlight > 0) S.match.shotsInFlight--;
  p.stats.blk++; shooter.stats.blockedBy = (shooter.stats.blockedBy || 0) + 1;
  const dir = p.side === HOME ? 1 : -1;
  b.vx = dir * 90; b.vy = (S.rng() - .5) * 60; b.vz = 120; b.state = 'loose'; b.owner = null; b.shot = null;
  emit('block', { slot: p.slot, side: p.side, x: b.x, y: b.y, z: b.z, shooter: shooter.slot, posterized: false, rejected: true });
  return true;
};

/** goaltending (§6.3): a defender touches a shot coming down within 18 of the ring and above it: the basket counts */
const goaltendCheck = p => {
  const b = S.ball, sh = b.shot;
  if (b.state !== 'shot' || !sh || sh.made || sh.resolved) return false;
  if (S.players[sh.shooter].side === p.side) return false;
  const R = RIMW[sh.rim], d = Math.hypot(b.x - R.x, b.y - R.y);
  if (b.vz >= 0 || d > 18 || b.z < R.z) return false;
  if (p.nova) return false;
  sh.made = true; sh.goaltend = true;
  b.vz = -120; b.x = R.x; b.y = R.y; b.z = R.z + 4; b.vx = b.vy = 0;
  emit('goaltend', { slot: p.slot, side: p.side, shooter: sh.shooter, x: R.x, y: R.y });
  return true;
};

/** the backboard shatters on a dunk (§6.13): 0 normally, 3% for SLAM 9+, 35% in Supernova, 50% with Moon Shoes, 100% for
 * BLAM-QUAKE, all times shatterChance, at most twice a game; the basket counts; the sponsor break follows */
const shatterChanceOf = (p, kind) => {
  let c = rate(p, 'slam') >= 9 ? .03 : 0;
  if (p.nova || (S.cheats.alwaysNova && p.side === HOME)) c = .35;
  if (p.moon > 0) c = .5;
  if (kind && kind.id === 'quake') c = 1;
  if (kind && kind.id === 'volcano') c = .2;
  return clamp(c * tune('shatterChance'), 0, 1);
};
const maybeShatter = (p, kind) => {
  const m = S.match; if (!m || (m.shatters || 0) >= 2) return false;
  if (S.shatterNext) { S.shatterNext = false; } else if (S.rng() >= shatterChanceOf(p, kind)) return false;   // (the dev panel's SHATTER THE NEXT DUNK)
  m.shatters = (m.shatters || 0) + 1; p.stats.shatter++;
  emit('shatter', { slot: p.slot, side: p.side, rim: attackRim(p.side) });
  return true;
};

/** a player's buttons this step (§6.2): shoot (a shot, a layup, a dunk with turbo, a block or a rebound jump), pass (a pass,
 * a steal), shove (a spin with the ball, a shove without it; turbo + pass without the ball shoves too), oop (the
 * alley-oop, or a plain lob to the teammate). Taunts are in the fx module. */
const actionsFromCmd = p => {
  const c = p.cmd, b = p.body, shooting = p.state === 'gather' || p.state === 'jump' || p.state === 'dunk' || p.state === 'knocked';
  if (shooting || p.knocked > 0) return;
  const ballNear = S.ball.state === 'shot' && Math.hypot(S.ball.x - b.x, S.ball.y - b.y) < 60 + tune('blockReach');
  if (c.taunt.pressed && !p.hasBall && !HUB && !(p.tauntT > 0)) { p.tauntT = .8; p.state = 'taunt'; p.stateT = 0; emit('taunt', { slot: p.slot }); const bark = (p.def.barks || [])[(S.fxRng() * (p.def.barks || []).length) | 0]; if (bark && COMMENTARY_LEVEL() === 2) { caption('steal', {}, 'DEE DEE'); if (S.caption) { S.caption.text = bark; S.caption.who = p.name; } } return; }
  if (c.shoot.pressed && p.hasBall) {
    const d = rimDist(b.x, b.y, attackRim(p.side));
    if (c.turbo.down && p.turbo >= .05 && d <= dunkRangeOf(p)) { startDunk(p); return; }
    if (d <= 40 && !c.turbo.down) { startShot(p); p.shot.kind = 'layup'; p.shot.plan = p.nextShotPlan || 0; return; }
    startShot(p); return;
  }
  if (c.shoot.pressed && !p.hasBall && b.z < 1.5) {
    if (ballNear && blockAttempt(p)) return;
    if (p.cool.block > 0) return;
    p.state = 'jump'; p.jumping = true; p.air = true; p.stateT = 0; p.body.jump(tune('jumpShotVz') + 10 * rate(p, 'swat')); p.reachJump = .6;
    return;
  }
  if (c.pass.pressed && p.hasBall && p.cool.pass <= 0) { passBall(p, teammateOf(p)); return; }
  if (c.pass.pressed && !p.hasBall) {
    if (c.turbo.down && c.pass.pressed && p.cool.shove <= 0) { shoveAttempt(p); return; }
    stealAttempt(p);
    return;
  }
  if (c.shove.pressed) { if (p.hasBall) spinMove(p); else shoveAttempt(p); return; }
  if (c.oop.pressed && p.hasBall) {
    const mate = teammateOf(p); if (!mate) return;
    const R = RIMW[attackRim(p.side)], reach = dunkRangeOf(p) * 1.15 + rate(p, 'dime') * 4;
    if (Math.hypot(mate.body.x - R.x, mate.body.y - R.y) <= reach) alleyOop(p, mate);
    else { const v = passBall(p, mate); return v; }
  }
};

/* ---- 40-ui-kit.js ---- */
/* ---- THE 10-FOOT UI KIT (plan §11.1–11.2): focusable lists with an animated focus, cards, buttons, sliders, pips for the
 * ratings, glyph icons for PlayStation and Xbox pads, keycaps for the keyboard, a mouse for the pointer, and prompt lines
 * in the glyphs of the last device. Every menu answers any one device alone: pad, keyboard or mouse. ---- */
const C = { ink: '#fff7ec', paper: '#140c24', accent: '#ff3ca6', cyan: '#2de2ff', gold: '#ffd23a', muted: '#9a8fb8', danger: '#ff5a3a', line: '#3a2a5a', ok: '#7af0a0' };

/** any player's input: a menu takes the press from whichever device (§11.1) */
const anyPressed = a => game.players.some(I => I && I.pressed(a));
const anyDown = a => game.players.some(I => I && I.down(a));
const anyConsume = a => game.players.forEach(I => I && I.consume(a));
const lastInput = () => game.players.slice().sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0))[0] || game.input;
/** the device the player used last, for the glyphs: 'gamepad', 'keyboard', 'mouse' or 'touch' */
const device = () => game.input.lastDevice || 'keyboard';
/** the controller family for glyphs: PlayStation (default) or Xbox, by Settings */
const padStyle = () => setting('buttons') === 'Xbox' ? 'xbox' : 'playstation';

/** the keys a menu moves with: arrows, WASD, a pad's d-pad or stick (the engine's up/down/left/right), Tab and Q/E */
const navDir = () => ({
  up: anyPressed('up'), down: anyPressed('down'), left: anyPressed('left'), right: anyPressed('right'),
  ok: anyPressed('confirm'), back: anyPressed('cancel'), start: anyPressed('start')
});

/** a list of focusable items: { label, sub, on(), disabled, color }; the focus moves with arrows and the mouse hover;
 * a click or ✕ (Enter, Space) picks it; ○ (Esc) goes back through onBack. Returns the focused index. */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.x = o.x || 40; this.y = o.y || 60; this.gap = o.gap || 24; this.w = o.w || 260; this.onBack = o.onBack || null; this.center = !!o.center; this.hoverAble = o.hover !== false; this.t = 0; }
  setItems(items) { this.items = items; this.i = clamp(this.i, 0, Math.max(0, items.length - 1)); }
  nav(dt) {
    const n = this.items.length; if (!n) return;
    const k = navDir();
    if (k.up || k.down) { let j = this.i; for (let t = 0; t < n; t++) { j = (j + (k.down ? 1 : -1) + n) % n; if (!this.items[j].disabled && !this.items[j].header) break; } this.i = j; sfxOnce('select'); }
    if (k.ok) { const it = this.items[this.i]; if (it && !it.disabled && !it.header && it.on) { anyConsume('confirm'); sfxOnce('confirm'); it.on(this); } }
    if (k.back && this.onBack) { anyConsume('cancel'); sfxOnce('cancel'); this.onBack(this); }
  }
  /** the mouse: hover moves the focus to an item under the pointer; a click picks it; the wheel scrolls (not needed here) */
  pointer(r, boxes) {
    const p = game.input.pointer(); const c = game.input.clicked();
    if (p) for (let i = 0; i < this.items.length; i++) { const b = boxes[i]; if (b && p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h && !this.items[i].disabled && !this.items[i].header) { if (this.hoverAble && this.i !== i) this.i = i; } }
    if (c) for (let i = 0; i < this.items.length; i++) { const b = boxes[i]; if (b && c[0] >= b.x && c[0] <= b.x + b.w && c[1] >= b.y && c[1] <= b.y + b.h && !this.items[i].disabled && !this.items[i].header) { this.i = i; const it = this.items[i]; if (it.on) it.on(this); return; } }
  }
  /** draws the list; returns the boxes of each item (for the mouse) */
  draw(r, o = {}) {
    this.t += 1 / 60;
    const boxes = [];
    const x0 = o.x !== undefined ? o.x : this.x, y0 = o.y !== undefined ? o.y : this.y, gap = o.gap || this.gap, w = o.w || this.w;
    r.overlay(g => {
      this.items.forEach((it, i) => {
        const y = y0 + i * gap, focus = i === this.i && !it.header, col = it.disabled ? C.muted : (it.color || (focus ? C.ink : '#d8cfee'));
        const bx = { x: x0 - 6, y: y - 6, w, h: gap - 2 }; boxes[i] = bx;
        if (it.header) { E.font.text(g, it.label, x0, y, C.gold, { scale: 1, shadow: '#000', outline: false }); return; }
        if (focus) {
          const pulse = .5 + .5 * Math.sin(this.t * 6);
          E.ui.box(g, bx.x, bx.y, bx.w, bx.h, { bg: [`rgba(255,60,166,${.25 + .1 * pulse})`, '#3a1040'], gradient: false, alpha: .9 });
          px.rect(g, bx.x, bx.y, 2, bx.h, C.accent); px.rect(g, bx.x + bx.w - 2, bx.y, 2, bx.h, C.accent);
          E.font.text(g, '▸', x0 - 2, y, C.accent, { scale: 2, shadow: '#000', outline: false });
        }
        E.font.text(g, it.label, x0 + 16, y, col, { scale: o.scale || 2, shadow: '#000', outline: false });
        if (it.sub) E.font.text(g, it.sub, x0 + 16 + (o.subX || w - 40), y, it.disabled ? C.muted : C.cyan, { scale: 1, shadow: '#000', outline: false, align: 'right' });
      });
    });
    return boxes;
  }
}

/** a sound for a focus move, once per step (so a held stick doesn't stutter) */
const sfxOnce = name => { if (!S.sfxStep || S.sfxStep !== game.time) { S.sfxStep = game.time; if (A && A.sfx) { try { A.sfx(name); } catch (e) { /* headless: no audio */ } } } };

/** glyphs: PlayStation's ✕ ○ □ △ L1 R1 L2 R2 OPTIONS CREATE and the d-pad, Xbox's A B X Y LB RB LT RT Menu View, keycaps for
 * the keyboard and the mouse with the button lit (§11.2). Drawn once, at the sizes the prompts use. */
const GLYPH = {};
const drawGlyph = (g, kind, x, y, s = 9) => {
  const pad = padStyle();
  if (kind === 'cross' || kind === 'circle' || kind === 'square' || kind === 'triangle' || kind === 'A' || kind === 'B' || kind === 'X' || kind === 'Y') {
    const col = { cross: '#4a7ce8', circle: '#e0404a', square: '#e070c0', triangle: '#50c080', A: '#50c040', B: '#e04040', X: '#4a80e0', Y: '#f0c030' }[kind];
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#0c0a14'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, col);
    E.font.text(g, { cross: 'x', circle: 'o', square: '■', triangle: '△', A: 'A', B: 'B', X: 'X', Y: 'Y' }[kind], x + s / 2, y + 1, '#ffffff', { align: 'center', font: 'tiny', outline: false, scale: 1 });
    return;
  }
  E.font.text(g, kind, x + 1, y + 1, C.ink, { font: 'tiny', outline: false, scale: 1 });
};
/** the glyph name of an action on a pad (PlayStation or Xbox), for a prompt */
const padGlyph = action => {
  const ps = { shoot: 'square', pass: 'cross', shove: 'circle', oop: 'triangle', turbo: 'R2', taunt: 'L1', confirm: 'cross', cancel: 'circle', start: 'OPTIONS' };
  const xb = { shoot: 'X', pass: 'A', shove: 'B', oop: 'Y', turbo: 'RT', taunt: 'LB', confirm: 'A', cancel: 'B', start: 'MENU' };
  return (padStyle() === 'xbox' ? xb : ps)[action] || action;
};
/** keyboard and mouse labels: the engine's own label for the action, the mouse's side for a mouse action */
const keyLabel = action => {
  const k = KEYS[action] || [];
  const first = k.find(c => c.startsWith('Key') || c === 'Space' || c.startsWith('Shift') || c.startsWith('Digit') || c.startsWith('Arrow'));
  if (!first) return action.toUpperCase();
  return first.replace('Key', '').replace('ShiftLeft', 'SHIFT').replace('ShiftRight', 'SHIFT').replace('Space', 'SPACE');
};
/** a prompt line: '{shoot} SHOOT   {pass} PASS', each token one glyph in the last device's style */
const promptTokens = (text, playerI) => {
  const dev = playerI ? playerI.lastDevice : device();
  return text.split(/(\{[a-z]+\})/).filter(Boolean).map(t => {
    const m = /^\{([a-z]+)\}$/.exec(t);
    if (!m) return { text: t };
    const a = m[1];
    if (a === 'move') return { glyph: dev === 'gamepad' ? 'stick' : 'WASD' };
    if (dev === 'gamepad') return { glyph: padGlyph(a) };
    if (dev === 'mouse' && (a === 'shoot' || a === 'pass')) return { mouse: a === 'shoot' ? 'L' : 'R' };
    return { key: keyLabel(a) };
  });
};
const ICON_GLYPHS = { cross: 1, circle: 1, square: 1, triangle: 1, A: 1, B: 1, X: 1, Y: 1 };
const promptLine = (g, text, x, y, o = {}) => {
  let cx = x;
  for (const t of promptTokens(text, o.player)) {
    const sc = o.scale || 1;
    if (t.text !== undefined) { E.font.text(g, t.text, cx, y, o.color || C.ink, { shadow: '#000', outline: false, scale: sc }); cx += E.font.width(t.text, { scale: sc }); continue; }
    const name = t.glyph !== undefined ? t.glyph : t.key !== undefined ? t.key : t.mouse;
    if (t.glyph !== undefined && ICON_GLYPHS[name]) { drawGlyph(g, name, cx, y - 2, 9); cx += 11; continue; }
    const label = t.mouse ? (t.mouse === 'L' ? 'LEFT CLICK' : 'RIGHT CLICK') : name;
    const w = E.font.width(label, { font: 'tiny', scale: 1 }) + 6;
    E.ui.box(g, cx, y - 3, w, 11, { bg: ['#2a1e40', '#1a1230'], gradient: false, alpha: .95 });
    E.font.text(g, label, cx + 3, y - 1, t.mouse ? C.gold : C.ink, { font: 'tiny', outline: false, scale: 1 });
    cx += w + 3;
  }
  return cx;
};
const promptWidth = (text, o = {}) => { let w = 0; for (const t of promptTokens(text, o.player)) w += t.text !== undefined ? E.font.width(t.text, { scale: o.scale || 1 }) : 11; return w; };

/** a ratings row: eight pips (1..10) with their icons (never raw numbers on a 10-foot screen) */
const ratingPips = (g, x, y, p, o = {}) => {
  const keys = RATING_KEYS, labels = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
  keys.forEach((k, i) => {
    const v = p.ratings ? p.ratings[k] : p.def.ratings[k], yy = y + i * (o.gap || 14);
    E.font.text(g, labels[k], x, yy, C.muted, { font: 'tiny', scale: o.scale || 1, outline: false });
    for (let j = 0; j < 10; j++) px.rect(g, x + 44 + j * 5, yy, 4, 5, j < v ? (v >= 8 ? C.gold : v >= 5 ? C.cyan : C.accent) : '#2a2040');
  });
};
/** a live portrait: the player's rig close-up in a frame */
const portraitOf = (g, rig, x, y, size, o = {}) => { try { rig.drawPortrait(g, x, y, size, Object.assign({ zoom: 3, turn: .4, bg: '#1c1230', frame: true }, o)); } catch (e) { game.fail('portrait', e); } };

/** a panel: a box with a border and a gradient, the house look of every menu and card */
const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1a4a', '#140c26'], border: o.border || C.line, alpha: o.alpha !== undefined ? o.alpha : .92 });
/** the title block of a screen: a title at the top, a subtitle under it */
const screenTitle = (g, t, sub, W, y = 14) => {
  E.font.title(g, t, W / 2, y, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  if (sub) E.font.text(g, sub, W / 2, y + 30, C.cyan, { align: 'center', scale: 1, shadow: '#000', outline: false });
};
/** the prompt bar at the bottom of a menu screen, in the last device's glyphs */
const promptBar = (r, items) => r.overlay(g => {
  let x = r.W / 2 - 150;
  const parts = items.map(([a, word]) => ({ a, word }));
  const total = parts.reduce((s, p) => s + promptWidth(p.a) + 6 + E.font.width(p.word, { scale: 1 }) + 18, 0);
  x = r.W / 2 - total / 2;
  for (const p of parts) { x = promptLine(g, p.a, x, r.H - 16, { color: C.ink }) + 6; E.font.text(g, p.word, x, r.H - 16, C.ink, { scale: 1, shadow: '#000', outline: false }); x += E.font.width(p.word, { scale: 1 }) + 18; }
});
/** a standard menu prompt: ✕ select, ○ back */
const MENU_PROMPT = [['{confirm}', 'SELECT'], ['{cancel}', 'BACK']];

/* ---- 41-hud.js ---- */
/* ---- THE MATCH HUD (plan §11.5): the score bug (team panels with two player plates each), the period, the game clock and
 * the shot clock, the announcer's caption in the lower third, banners at the top third (one at a time, by priority), a
 * P tag over each human's player, and the release meter. Screen pixels; anchored to r.W and r.H. ---- */
const BANNER_PRIO = { SHATTERED: 10, SUPERNOVA: 9, POSTERIZED: 8, DUNK: 7, ALLEYOOP: 6, REJECTED: 5, JACKPOT: 4, THREE: 3, PICKPOCKET: 2, ANKLES: 1 };
const BANNER_COLOR = { SHATTERED: '#9adfff', SUPERNOVA: '#e8b0ff', POSTERIZED: '#ff5ad0', DUNK: '#ffd23a', ALLEYOOP: '#ffd23a', REJECTED: '#ff5a3a', JACKPOT: '#ffd23a', THREE: '#2de2ff', PICKPOCKET: '#7af0a0', ANKLES: '#ffb347' };
/** a banner: its text, its class (for the priority and the colour), its life; the one showing is the top priority */
const banner = (text, cls) => {
  const b = { text, cls, t: 0, life: 1.4, prio: BANNER_PRIO[cls] || 0 };
  const cur = S.banner;
  if (!cur || cur.t >= cur.life || b.prio >= cur.prio) S.banner = b;
};
/** the announcer's caption: a line, the portrait's name, the time it stays. Two per possession at most (§10.7). */
const caption = (bank, names, who) => {
  if (COMMENTARY_LEVEL() === 0) return;
  const text = lineFor(bank, names); if (!text) return;
  if (COMMENTARY_LEVEL() === 1 && !(bank === 'dunkPower' || bank === 'dunkSpin' || bank === 'basket' || bank === 'shatter' || bank === 'novaOn' || bank === 'block' || bank === 'steal' || bank === 'alleyoop' || bank === 'three' || bank === 'goaltend' || bank === 'boss' || bank === 'final' || bank === 'quake')) return;
  S.caption = { text, t: 0, life: 3.2, who: who || 'VINNIE', bank };
  voiceSay(text, (who || 'VINNIE') === 'DEE DEE' ? 'deedee' : 'vinnie', { volume: .18 });
  S.captionsThisPoss = (S.captionsThisPoss || 0) + 1;
  if (S.match) S.match.lastCaption = S.match.t;
};

/* the HUD's pieces: the score bug, the caption, the banner, the tags */
const hudScore = (r) => {
  const m = S.match, W = r.W, H = r.H, pw = clamp((W - 84) / 2 - 8, 116, 170);
  r.overlay(g => {
    for (const side of [0, 1]) {
      const t = S.teams[side], x = side ? W - pw - 8 : 8, y = 4;
      E.ui.box(g, x, y, pw, 36, { bg: [t.colors.jersey, '#120a1c'], gradient: true, alpha: .85, border: t.colors.trim });
      E.font.text(g, t.short, x + 6, y + 4, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, String(m.score[side]), side ? x + pw - 8 : x + pw - 8, y + 12, C.ink, { scale: 2, align: side ? 'left' : 'right', outline: false, shadow: '#000' });
      const plates = S.players.filter(p => p.side === side && p.onCourt);
      plates.forEach((p, i) => {
        const px0 = x + 6 + i * ((pw - 12) / 2), py = y + 40;
        E.font.text(g, p.name, px0, py, p.human ? C.gold : '#d8cfee', { scale: 1, outline: false, shadow: '#000' });
        E.ui.bar(g, px0, py + 10, (pw - 24) / 2 - 4, 3, clamp(p.turbo, 0, 1), C.cyan);
        for (let k = 0; k < 3; k++) px.rect(g, px0 + k * 8, py + 16, 6, 3, p.heat > k || p.nova ? C.gold : '#2a2040');
        if (p.pu) { E.font.text(g, p.pu.icon || '*', px0 + 46, py + 15, p.pu.color || C.gold, { scale: 1, outline: false }); }
      });
    }
    // the centre: the period, the game clock, the shot clock
    const per = m.quarter > 4 ? (m.ot > 0 ? 'OT' + (m.ot > 1 ? '' : '') : 'Q4') : 'Q' + m.quarter;
    const label = m.sudden ? 'SUDDEN BLAM' : per;
    E.font.text(g, label, W / 2, 6, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
    const mm = Math.floor(m.clock / 60), ss = Math.floor(m.clock % 60);
    E.font.text(g, mm + ':' + String(ss).padStart(2, '0'), W / 2, 18, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    const sc = Math.ceil(m.shotClock), red = m.shotClock < 5, boxY = 40;
    if (m.poss !== null) E.ui.box(g, W / 2 - 16, boxY, 32, 14, { bg: red ? ['#8a1a1a', '#4a0a0a'] : ['#2a2040', '#140c26'], gradient: false, alpha: .9 });
    if (m.poss !== null) E.font.text(g, String(Math.max(0, sc)), W / 2, boxY + 3, red ? C.danger : C.ink, { align: 'center', scale: 1, outline: false });
  });
};
const hudCaption = (r) => {
  const c = S.caption; if (!c || c.t > c.life) return;
  const a = c.t < .15 ? c.t / .15 : c.t > c.life - .4 ? (c.life - c.t) / .4 : 1;
  r.overlay(g => {
    const w = Math.min(r.W * .62, 620), x = r.W / 2 - w / 2, y = r.H - 58;
    E.ui.box(g, x, y, w, 40, { bg: ['#1a1030', '#0c0618'], alpha: .92 * a, border: C.accent });
    E.font.text(g, c.who, x + 8, y + 5, C.gold, { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, c.text, x + 8, y + 18, C.ink, { scale: 1, outline: false, shadow: '#000' });
  });
};
const hudBanner = (r) => {
  const b = S.banner; if (!b || b.t > b.life) return;
  const u = Math.min(1, b.t / .25), sc = u < 1 ? E.ease.outBack(u) * 3.4 : 3.2;
  const alpha = b.t > b.life - .2 ? (b.life - b.t) / .2 : 1;
  r.overlay(g => {
    E.font.title(g, b.text, r.W / 2, r.H * .3, { align: 'center', scale: Math.max(1, Math.round(sc)), colors: [BANNER_COLOR[b.cls] || '#ffffff', '#ffffff'], depth: 3, depthColor: '#120818' });
  });
};
/** the tag over each human's player (P1–P4) and the release meter by the shooter */
const hudWorld = (r) => {
  for (const p of S.players) {
    if (!p.onCourt) continue;
    if (p.human) { const q = r.w(p.body.x, p.body.y, p.body.z + 64); r.overlay(g => { E.ui.box(g, q[0] - 10, q[1] - 12, 22, 9, { bg: [p.slot % 2 ? C.cyan : C.accent, '#140c26'], gradient: false, alpha: .95 }); E.font.text(g, 'P' + (p.humanNo || (p.slot + 1)), q[0] + 1, q[1] - 10, C.ink, { font: 'tiny', align: 'center', outline: false, scale: 1 }); }); }
    if (p.shot && p.shot.phase === 'jump' && p.shot.jt !== undefined && !p.shot.dunk && p.hasBall && tune('shotMeter') && setting('shotMeter') !== 'Off') {
      const q = r.w(p.body.x, p.body.y, p.body.z + 70), u = clamp(p.shot.jt / Math.max(.05, p.shot.apexT * 2), 0, 1);
      r.overlay(g => { E.ui.bar(g, q[0] - 18, q[1] - 2, 36, 3, u, u > .9 ? C.gold : C.cyan); });
    }
  }
};
/** the break card and the halftime report (in the match scene, over the court): score, leaders, a gag, the subs */
const hudBreak = (r) => {
  const m = S.match; if (!m || m.phase !== 'break') return;
  r.overlay(g => {
    panel(g, r.W * .2, r.H * .18, r.W * .6, r.H * .5, { border: C.gold });
    E.font.title(g, m.breakKind === 'half' ? 'HALFTIME REPORT' : m.breakKind === 'ot' ? 'OVERTIME' : 'BREAK', r.W / 2, r.H * .22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
    E.font.text(g, S.teams[0].short + '  ' + m.score[0] + ' - ' + m.score[1] + '  ' + S.teams[1].short, r.W / 2, r.H * .36, C.ink, { align: 'center', scale: 3, outline: false, shadow: '#000' });
    if (m.breakKind === 'half') E.font.text(g, HALFTIME_GAGS[(S.gagI || 0) % HALFTIME_GAGS.length], r.W / 2, r.H * .48, C.cyan, { align: 'center', scale: 1, outline: false, shadow: '#000', wrap: r.W * .5 });
    Object.entries(m.subUI || {}).forEach(([side, u], i) => {
      const { on, bench } = subOptions(+side), off = on[u.offI % on.length], inn = bench[u.benchI % bench.length];
      if (!off || !inn) return;
      E.font.text(g, S.teams[side].short + ' SUB:  ' + off.name + ' OFF  ·  ' + inn.name + ' ON', r.W / 2, r.H * .62 + i * 22, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'UP/DOWN WHO COMES OFF · LEFT/RIGHT WHO COMES ON · CONFIRM SUBS · CANCEL KEEPS', r.W / 2, r.H * .62 + i * 22 + 11, C.muted, { align: 'center', scale: 1, outline: false, shadow: '#000' });
    });
    E.font.text(g, 'NEXT IN ' + Math.ceil(Math.max(0, (m.breakKind === 'half' ? HALF_SECS : BREAK_SECS) - m.breakT)) + 'S', r.W / 2, r.H * .6, C.muted, { align: 'center', scale: 1, outline: false });
  });
};
const HALFTIME_GAGS = ['THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM SNEAKER GLUE. STICK THE LANDING. FOREVER.', 'OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS SWEATING.', 'REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT.', 'GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0% EXPLANATION.', 'IF YOU\'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON\'T KNOW HOW EITHER.', 'WE ASKED THE ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT.'];

/** the whole HUD of a match, in the order the screen reads: the score bug, the caption, the banner, the tags, the break */
const hudSponsor = r => {
  const m = S.match; if (!m || !m.sponsorOn) return;
  const i = Math.floor(m.deadT || 0) % SPONSOR_LINES.length;
  r.overlay(g => { panel(g, r.W * .1, r.H * .36, r.W * .8, r.H * .2, { border: C.cyan, alpha: .96 }); E.font.text(g, SPONSOR_LINES[i], r.W / 2, r.H * .42, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000', wrap: r.W * .74 }); E.font.text(g, 'WE\'LL BE RIGHT BACK', r.W / 2, r.H * .5, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
};
const SPONSOR_LINES = BEATS.sponsor;
const hudDraw = (r) => { hudScore(r); hudWorld(r); hudCaption(r); hudBanner(r); hudBreak(r); hudSponsor(r); };
/** the HUD's own clocks (captions and banners fade in game time) */
const hudStep = dt => { if (S.caption) S.caption.t += dt; if (S.banner) S.banner.t += dt; };

/* ---- 42-screens.js ---- */
/* ---- THE SCREENS (plan §11.3–11.4): title, main menu, join, team select, lineup, court and rules, the matchup card, results,
 * Hall of Blam, How to Play, About and Credits, and the touch-only notice. Each is a scene of the engine; a menu screen
 * has a FocusList (the mouse, a pad or the keyboard), a preview panel at the right, and a prompt bar. ---- */
const SETUP = { home: 'hightops', away: 'breakers', court: 'skybox', qLen: 120, difficulty: 'Pro', powerups: true, twists: true, humans: [], mode: 'exhibition' };
const screenIdle = dt => {   // ten seconds without input on a title or menu screen starts the attract mode (§13)
  const active = game.players.some(I => I && (I.anyPressed() || (I.move()[0] || I.move()[1]))) || !!game.input.clicked() || (game.input.pointer() && S.lastPointer && (S.lastPointer[0] !== game.input.pointer()[0] || S.lastPointer[1] !== game.input.pointer()[1]));
  S.lastPointer = game.input.pointer();
  if (active) S.idle = 0; else S.idle = (S.idle || 0) + dt;
  if (S.idle >= 10 && game.sceneName !== 'attract') { S.idle = 0; game.go('attract', null, { fade: .3 }); return true; }   // (touch-only devices get it too: §11.7)
  return false;
};
const touchOnlyNow = () => !!S.touchOnly;
/** the touch-only device check (§11.7): touch and no fine pointer nor hover; a gamepad or a key press lifts it at once */
const checkTouchOnly = () => {
  const touch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0), fine = typeof matchMedia === 'function' && (matchMedia('(any-pointer: fine)').matches || matchMedia('(any-hover: hover)').matches);
  S.touchOnly = !!touch && !fine && !S.everKey && !(game.input.lastDevice === 'gamepad');
  return S.touchOnly;
};

/* ---- TITLE ---- */
const COMIC_STAR = [[0, -22], [7, -8], [22, -7], [11, 3], [14, 18], [0, 10], [-14, 18], [-11, 3], [-22, -7], [-7, -8]];
scenes.title = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'title'; S.idle = 0; checkTouchOnly(); playSong('title'); L.enabled = false; S.titleRigs = S.titleRigs || [0, 1].map(i => makePlayer(i, i ? 'riptide' : 'volt', i ? AWAY : HOME)); },
  update(dt) {
    if (screenIdle(dt)) return;
    if (S.touchOnly) return;
    if (anyPressed('start') || anyPressed('confirm')) { anyConsume('confirm'); game.go('menu', null, { fade: .25 }); }
  },
  draw(r) {
    const t = game.time;
    r.sky(['#07061a', '#1d1240', '#3a1a5a']);
    r.starfield({ count: 60, speed: 6, dir: 'left' });
    r.overlay(g => { px.disc(g, r.W * .82, r.H * .2, 26, '#f4e8ff'); px.disc(g, r.W * .82 + 6, r.H * .2 - 4, 24, '#1d1240'); });
    // the Skybox's skyline: a few silhouettes and a neon billboard
    r.overlay(g => { for (let i = 0; i < 14; i++) { const w = 60 + (i * 37) % 70, h = 80 + (i * 53) % 120, x = (i * 97) % r.W; px.rect(g, x, r.H * .72 - h, w, h, '#140c2a'); } });
    // the two heroes of the title, in their alley-oop pose: one leaps, one lifts
    S.titleRigs.forEach((p, i) => {
      const x = r.W / 2 + (i ? 46 : -46), y = r.H * .66, lift = Math.max(0, Math.sin(t * 2 + i)) * 18;
      p.rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: i ? PI : 0, pose: i ? 'cheer' : null, air: lift > 4, run: 0 });
      r.actor(x, y, lift, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
    });
    r.overlay(g => {
      E.font.title(g, 'ZONEFIRE', r.W / 2, r.H * .12, { align: 'center', scale: Math.max(3, Math.min(6, Math.floor(r.W / 260))), colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 4, depthColor: '#4a0c2a' });
      if (Math.sin(t * 5) > -.2) E.font.text(g, 'BLAM!', r.W * .82 + 24, r.H * .2 - 26, '#ff3ca6', { align: 'center', scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'No fouls. No mercy. All BLAM.', r.W / 2, r.H * .12 + 48, C.cyan, { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (S.touchOnly) {
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H * .8, C.gold, { align: 'center', scale: 2, shadow: '#000', outline: false });
        E.ui.box(g, r.W / 2 - 110, r.H * .86, 220, 40, { bg: ['#ff3ca6', '#8a1a5a'], border: '#ffe08a' });
        E.font.text(g, 'SETTINGS', r.W / 2, r.H * .86 + 12, C.ink, { align: 'center', scale: 2, outline: false });
        const c = game.input.clicked(); if (c && c[0] > r.W / 2 - 110 && c[0] < r.W / 2 + 110 && c[1] > r.H * .86 && c[1] < r.H * .86 + 40) game.menu('settings');
      } else if (Math.sin(t * 4) > -.3) {
        E.font.text(g, 'PRESS START', r.W / 2, r.H * .8, C.ink, { align: 'center', scale: 3, shadow: '#000', outline: false });
        promptLine(g, '{confirm} START', r.W / 2 - 70, r.H * .8 + 36, { scale: 1 });
      }
      E.font.text(g, E.versionLabel ? E.versionLabel() : 'v0.85.2', r.W - 8, r.H - 10, C.muted, { align: 'right', scale: 1, outline: false });
    });
  }
};

/* ---- MAIN MENU: a big list at the left; a live preview at the right for the focused entry ---- */
const menuItems = () => {
  const tour = S.progress.tour;
  const items = [
    { label: tour ? 'CONTINUE TOUR' : 'BLAM TOUR', sub: tour ? 'STOP ' + (tour.stop + 1) : 'STORY', on: () => (tour ? goTourContinue() : goTourNew()) },
    { label: 'EXHIBITION', sub: 'ANY TEAMS', on: () => goExhibition() },
    { label: 'BLAM CAMP', sub: (S.progress.camp || []).length + ' / 10', on: () => game.go('camp', null, { fade: .2 }) },
    { label: 'HALL OF BLAM', sub: 'RECORDS', on: () => game.go('hall', null, { fade: .2 }) },
    { label: 'HOW TO PLAY', sub: '3 PAGES', on: () => game.go('howto', { from: 'menu' }, { fade: .2 }) },
    { label: 'OPTIONS', sub: 'SETTINGS', on: () => game.menu('settings') },
    { label: 'ABOUT', sub: 'CREDITS', on: () => game.go('about', { page: 0 }, { fade: .2 }) }
  ];
  return items;
};
scenes.menu = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'menu'; S.idle = 0; playSong('menu'); S.menuList = S.menuList || new FocusList([], { x: 36, y: 0, gap: 28, w: 300, onBack: () => game.go('title', null, { fade: .2 }) }); S.menuList.setItems(menuItems()); S.menuList.onBack = () => game.go('title', null, { fade: .2 }); },
  update(dt) { if (screenIdle(dt)) return; S.menuList.nav(dt); if (anyPressed('start') && game.players[0]) game.menu('settings'); },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    const L = S.menuList; L.y = r.H * .24; L.x = Math.max(24, r.W * .06);
    const boxes = L.draw(r, { x: L.x, y: L.y, gap: Math.max(26, r.H * .085), w: Math.min(360, r.W * .36), scale: 2 });
    L.pointer(r, boxes);
    const it = L.items[L.i] || {}, px0 = r.W * .48, py = r.H * .24;
    r.overlay(g => {
      panel(g, px0, py - 12, r.W * .46, r.H * .56);
      E.font.title(g, it.label || '', px0 + 20, py + 6, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      menuPreview(g, it.label || '', px0 + 20, py + 60, r);
    });
    r.overlay(g => E.font.title(g, 'ZONEFIRE', r.W / 2, 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }));
    promptBar(r, MENU_PROMPT);
  }
};
/** the preview of a menu entry: words and small pictures of what it is */
const menuPreview = (g, label, x, y, r) => {
  const lines = {
    'BLAM TOUR': ['FOUR STOPS, FIVE COURTS, ONE GOLDEN BLAMBOOZLE.', 'WIN THREE AND YOU FACE THE BLAMBOTS.', 'THE TOUR MAP AND ITS SAVES ARE KEPT.'],
    'CONTINUE TOUR': ['PICK UP WHERE YOUR TOUR LEFT OFF.', 'THE TOUR SCORE COUNTS TOWARD HALL OF BLAM.'],
    'EXHIBITION': ['ANY TWO TEAMS, ANY COURT, UP TO FOUR PLAYERS.', 'SET THE QUARTERS, THE CPU AND THE TWISTS.'],
    'BLAM CAMP': ['TEN LESSONS FROM DEE DEE.', 'MOVE, PASS, SHOOT, DUNK, ALLEY-OOP, SUPERNOVA.'],
    'HALL OF BLAM': ['THE TOP TEN TOUR SCORES, BY INITIALS.', 'AND THE RECORDS: MOST POINTS, BEST DUNK.'],
    'HOW TO PLAY': ['WHAT YOU CAN DO, AND WHAT YOU CAN\'T.', 'WITH THE GLYPHS OF YOUR DEVICE.'],
    'OPTIONS': ['BUTTON SYMBOLS, DIFFICULTY, THE RULES OF THE GAME.', 'AND THE SOUND, THE SCREEN AND THE CAMERA.'],
    'ABOUT': ['CREDITS, THE SOURCE, AND THE FEEDBACK.', 'A FEW SECRETS ARE ON THIS PAGE TOO.']
  };
  const ls = lines[label] || ['THE GAME IS READY.'];
  ls.forEach((t, i) => E.font.text(g, t, x, y + i * 22, C.ink, { scale: 1, shadow: '#000', outline: false, wrap: 0 }));
  // a small picture: two team colours squaring off (the exhibition and the tour), a court line, or a shooter
  const cc = [teamDef('hightops').colors.jersey, teamDef('breakers').colors.jersey];
  px.rect(g, x, y + 130, 60, 40, cc[0]); px.rect(g, x + 100, y + 130, 60, 40, cc[1]);
  E.font.text(g, 'VS', x + 80, y + 140, C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
};

/* ---- EXHIBITION: join (1–4 players, sides), teams, lineup, court and rules, the matchup ---- */
const joinState = () => S.join || (S.join = { slots: [null, null, null, null] });
const goExhibition = () => { S.mode = 'exhibition'; S.setup = Object.assign({}, SETUP, { humans: [] }); S.joinOn = true; game.allowJoin({ max: 4, onJoin: (input, n) => { const slot = n - 1; joinState().slots[slot] = { input, side: slot % 2 ? AWAY : HOME, ready: false, name: 'P' + n }; } }); joinState().slots[0] = { input: game.players[0] || game.input, side: HOME, ready: false, name: 'P1' }; game.go('join', null, { fade: .2 }); };
/** the join screen (§11.4): four slots; each joined player moves its card to HOME or AWAY, ✕ is ready, ○ leaves */
scenes.join = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'join'; S.idle = 0; S.joinSel = 0; },
  update(dt) {
    if (screenIdle(dt)) return;
    const J = joinState();
    for (let i = 0; i < 4; i++) {
      const sl = J.slots[i]; if (!sl) continue;
      if (sl.input && sl.input.pressed && sl.input.pressed('right')) sl.side = AWAY;
      if (sl.input && sl.input.pressed && sl.input.pressed('left')) sl.side = HOME;
      if (sl.input && sl.input.pressed && sl.input.pressed('confirm')) sl.ready = !sl.ready;
      if (sl.input && sl.input.pressed && sl.input.pressed('cancel') && i > 0) { J.slots[i] = null; game.removePlayer && game.removePlayer(sl.input); }
    }
    const p1 = J.slots[0];
    if (p1 && p1.ready && game.input.pressed('start')) { game.allowJoin(false); game.go('teams', null, { fade: .2 }); }
    if (game.input.pressed('cancel') && !(p1 && p1.ready)) { game.allowJoin(false); game.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    const J = joinState();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'EXHIBITION', 'JOIN: UP TO FOUR PLAYERS, ANY DEVICE', r.W);
      const cw = Math.min(220, r.W * .2), gap = 16, x0 = r.W / 2 - (cw * 4 + gap * 3) / 2;
      for (let i = 0; i < 4; i++) {
        const sl = J.slots[i], x = x0 + i * (cw + gap), y = r.H * .3, side = sl ? (sl.side === HOME ? 'HOME' : 'AWAY') : null;
        panel(g, x, y, cw, r.H * .42, { border: sl ? (sl.ready ? C.ok : C.accent) : C.line });
        E.font.title(g, 'P' + (i + 1), x + cw / 2, y + 16, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
        if (!sl) { E.font.text(g, 'PRESS START', x + cw / 2, y + r.H * .2, C.muted, { align: 'center', scale: 1, outline: false }); continue; }
        E.font.text(g, side, x + cw / 2, y + 60, sl.side === HOME ? C.cyan : C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
        E.font.text(g, sl.ready ? 'READY' : 'NOT READY', x + cw / 2, y + 96, sl.ready ? C.ok : C.muted, { align: 'center', scale: 1, outline: false });
        promptLine(g, '{shoot} LEFT/RIGHT {confirm} READY', x + 10, y + r.H * .3, { scale: 1 });
      }
      const left = J.slots.filter(Boolean).length;
      E.font.text(g, left === 1 ? 'CPU FILLS THE REST' : left + ' PLAYERS', r.W / 2, r.H * .8, C.muted, { align: 'center', scale: 1, outline: false });
    });
    promptBar(r, [['{confirm}', 'READY'], ['{cancel}', 'BACK'], ['{start}', 'START']]);
  }
};

/* the team select: two cards, left and right cycles the teams (the unlocked ones), ✕ locks, △ the bio card */
const unlockedTeams = () => all('team').filter(t => !t.locked || (t.id === 'blambots' && S.progress.unlocked.bots) || (t.id === 'allstars' && S.progress.unlocked.allstars));
scenes.teams = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'teams'; S.idle = 0; S.teamsSel = [0, 1]; S.teamsLock = [false, false]; const T = unlockedTeams(); S.teamsSel = [T.findIndex(t => t.id === SETUP.home), T.findIndex(t => t.id === SETUP.away)]; if (S.teamsSel[0] < 0) S.teamsSel[0] = 0; if (S.teamsSel[1] < 0) S.teamsSel[1] = 1; },
  update(dt) {
    if (screenIdle(dt)) return;
    const T = unlockedTeams();
    for (let s = 0; s < 2; s++) {
      if (S.teamsLock[s]) continue;
      if (game.input.pressed(s === 0 ? 'left' : 'right')) S.teamsSel[s] = (S.teamsSel[s] - 1 + T.length) % T.length;
      if (game.input.pressed(s === 0 ? 'right' : 'left')) S.teamsSel[s] = (S.teamsSel[s] + 1) % T.length;
    }
    if (game.input.pressed('confirm')) { S.teamsLock[0] = true; }
    if (game.input.pressed('cancel')) { if (S.teamsLock[0]) S.teamsLock[0] = false; else game.go('join', null, { fade: .2 }); }
    if (S.teamsLock[0] && game.input.pressed('confirm') && S.teamsLock[1] !== undefined) { S.setup.home = T[S.teamsSel[0]].id; S.setup.away = T[S.teamsSel[1]].id; game.go('lineup', null, { fade: .2 }); }
  },
  draw(r) {
    const T = unlockedTeams();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'TEAM SELECT', 'LEFT AND RIGHT CHOOSE · CONFIRM LOCKS', r.W);
      for (let s = 0; s < 2; s++) {
        const t = T[S.teamsSel[s]], x = s ? r.W * .52 : r.W * .05, y = r.H * .22, w = r.W * .43, h = r.H * .64;
        panel(g, x, y, w, h, { border: t.colors.jersey });
        px.rect(g, x + 10, y + 10, 12, h - 20, t.colors.jersey);
        E.font.title(g, t.name, x + 36, y + 14, { scale: 2, colors: ['#fffbe8', t.colors.trim], depth: 2 });
        E.font.text(g, (s ? 'AWAY' : 'HOME') + (S.teamsLock[s] ? ' · LOCKED' : ''), x + 36, y + 56, C.gold, { scale: 1, outline: false, shadow: '#000' });
        E.font.text(g, 'COURT: ' + COURTS[t.court].name, x + 36, y + 74, C.cyan, { scale: 1, outline: false, shadow: '#000' });
        E.font.text(g, t.style.toUpperCase(), x + 36, y + 92, C.ink, { scale: 1, outline: false, shadow: '#000' });
        rosterOf(t.id).forEach((p, i) => { const px0 = x + 36 + i * (w / 3.4); ratingPips(g, px0, y + 120, p, { gap: 16, scale: 1 }); E.font.text(g, p.name, px0, y + h - 36, C.ink, { scale: 1, outline: false, shadow: '#000' }); });
      }
    });
    promptBar(r, [['{confirm}', 'LOCK'], ['{cancel}', 'BACK']]);
  }
};

/* the lineup: three players per side, pick the starters; the third is on the bench for the subs */
scenes.lineup = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'lineup'; S.idle = 0; S.lineupSel = [0, 0]; S.lineupDone = [false, false]; },
  update(dt) {
    if (screenIdle(dt)) return;
    for (let s = 0; s < 2; s++) { if (S.lineupDone[s]) continue; const team = s ? S.setup.away : S.setup.home, n = rosterOf(team).length; if (game.input.pressed(s === 0 ? 'left' : 'right')) S.lineupSel[s] = (S.lineupSel[s] + n - 1) % n; if (game.input.pressed(s === 0 ? 'right' : 'left')) S.lineupSel[s] = (S.lineupSel[s] + 1) % n; }
    if (game.input.pressed('confirm')) S.lineupDone[0] = true;
    if (game.input.pressed('cancel')) { if (S.lineupDone[0]) S.lineupDone[0] = false; else game.go('teams', null, { fade: .2 }); }
    if (S.lineupDone[0]) { S.setup.lineup = [S.lineupSel[0], S.lineupSel[1]]; if (S.mode === 'tour') return tourAfterLineup(); game.go('rules', null, { fade: .2 }); }
  },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'LINEUP', 'PICK YOUR STARTERS · THE THIRD IS ON THE BENCH', r.W);
      for (let s = 0; s < 2; s++) {
        const team = teamDef(s ? S.setup.away : S.setup.home), ros = rosterOf(team.id), x = s ? r.W * .52 : r.W * .05, y = r.H * .24, w = r.W * .43;
        E.font.title(g, team.short, x + 10, y - 26, { scale: 2, colors: ['#fffbe8', team.colors.trim], depth: 2 });
        ros.forEach((p, i) => { const yy = y + i * 110, focus = i === S.lineupSel[s] && !S.lineupDone[s]; panel(g, x, yy, w, 100, { border: focus ? C.accent : C.line }); E.font.text(g, p.name + ' #' + p.number, x + 16, yy + 12, focus ? C.ink : '#d8cfee', { scale: 2, outline: false, shadow: '#000' }); E.font.text(g, p.role.toUpperCase(), x + 16, yy + 40, C.cyan, { scale: 1, outline: false }); ratingPips(g, x + w - 200, yy + 10, p, { gap: 10, scale: 1 }); });
        E.font.text(g, S.lineupDone[s] ? 'LOCKED' : (s ? 'AWAY' : 'HOME') + ' CHOOSES', x + 10, y + 340, S.lineupDone[s] ? C.ok : C.muted, { scale: 1, outline: false });
      }
    });
    promptBar(r, [['{confirm}', 'LOCK'], ['{cancel}', 'BACK']]);
  }
};

/* the court and rules (Exhibition): the court cards, the quarter, the CPU, power-ups and twists; START */
const RULE_ROWS = () => [
  { label: 'COURT', sub: COURTS[S.setup.court].name, cycle: 'court' },
  { label: 'QUARTER', sub: setting('quarter') || '2:00', cycle: 'quarter' },
  { label: 'CPU', sub: setting('difficulty') || 'Pro', cycle: 'difficulty' },
  { label: 'POWER-UPS', sub: setting('powerups') || 'On', cycle: 'powerups' },
  { label: 'TWISTS', sub: setting('twists') || 'On', cycle: 'twists' },
  { label: 'START', sub: '', on: () => startExhibition() }
];
const cycleSetting = (key, dir) => { const spec = GAME_SETTINGS.find(s => s.key === key); const i = spec.options.indexOf(game.settings[key]); game.settings.set(key, spec.options[(i + dir + spec.options.length) % spec.options.length]); };
scenes.rules = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'rules'; S.idle = 0; S.rulesList = S.rulesList || new FocusList([], { x: 40, y: 0, gap: 40, w: 420, onBack: () => game.go('lineup', null, { fade: .2 }) }); },
  update(dt) {
    if (screenIdle(dt)) return;
    const rows = RULE_ROWS(); S.rulesList.setItems(rows);
    const L = S.rulesList;
    if (game.input.pressed('left') || game.input.pressed('right')) {
      const row = rows[L.i]; const dir = game.input.pressed('right') ? 1 : -1;
      if (row.cycle === 'court') { const ids = all('court').map(c => c.id); const i = ids.indexOf(S.setup.court); const next = ids[(i + dir + ids.length) % ids.length]; if (COURTS[next]) S.setup.court = next; }
      else if (row.cycle) cycleSetting(row.cycle === 'quarter' ? 'quarter' : row.cycle === 'difficulty' ? 'difficulty' : row.cycle, dir);
    }
    L.nav(dt);
  },
  draw(r) {
    const L = S.rulesList, rows = RULE_ROWS(), c = COURTS[S.setup.court];
    r.sky(c.sky);
    const boxes = L.draw(r, { x: 40, y: r.H * .28, gap: Math.max(34, r.H * .09), w: r.W * .3, scale: 2, subX: r.W * .3 - 80 });
    L.pointer(r, boxes);
    r.overlay(g => {
      screenTitle(g, 'COURT AND RULES', 'LEFT AND RIGHT CHANGE A LINE', r.W);
      const cw = r.W * .5, x = r.W * .42, y = r.H * .2;
      panel(g, x, y, cw, r.H * .6, { border: c.floor.line ? '#2de2ff' : C.line });
      E.font.title(g, c.name, x + 20, y + 16, { scale: 2, colors: ['#fffbe8', '#2de2ff'], depth: 2 });
      E.font.text(g, 'TWIST: ' + ({ jackpot: 'JACKPOT SPOT', wind: 'SEA BREEZE', slick: 'OIL SLICKS', eruption: 'ERUPTIONS AND VENTS', boss: 'THE BLAMBOTS' }[c.twist] || 'NONE'), x + 20, y + 70, C.gold, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'CHOOSE A COURT WITH LEFT AND RIGHT ON THE COURT LINE.', x + 20, y + 96, C.muted, { scale: 1, outline: false });
    });
    promptBar(r, MENU_PROMPT);
  }
};
const startExhibition = () => {
  const s = S.setup;
  s.qLen = { '1:00': 60, '1:30': 90, '2:00': 120, '3:00': 180 }[setting('quarter')] || 120;
  s.difficulty = setting('difficulty');
  s.powerups = setting('powerups') !== 'Off';
  s.twists = setting('twists') !== 'Off';
  const used = { [HOME]: 0, [AWAY]: 0 };
  s.humans = joinState().slots.filter(Boolean).map(sl => { const k = used[sl.side]++; return { slot: sl.side * 2 + k, input: sl.input }; });
  game.allowJoin(false);
  game.go('matchup', null, { fade: .2 });
};

/* the matchup card: the starters face off; the six seconds of codes (§10.8) */
/* the cheat codes (§10.8): entered on the matchup card by any player; each gives a chime and a line, and lasts that game */
const CODES = [
  { name: 'BIG HEADS', steps: ['up', 'up', 'turbo', 'pass'], apply: () => { S.setup.bigHeads = true; } },
  { name: 'POWER-UPS ON', steps: ['shoot', 'shoot', 'pass', 'turbo'], apply: () => { S.setup.powerups = true; } },
  { name: 'INFINITE TURBO', steps: ['turbo', 'turbo', 'turbo', 'up', 'up'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { infTurbo: true }); } },
  { name: 'NO TWISTS', steps: ['down', 'down', 'shove'], apply: () => { S.setup.twists = false; } },
  { name: 'SKY DUNKS', steps: ['oop', 'oop', 'up', 'shoot'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { skyDunks: true }); } },
  { name: 'MOON GRAVITY', steps: ['up', 'oop', 'up', 'oop'], apply: () => { S.setup.cheats = Object.assign(S.setup.cheats || {}, { moonGravity: true }); } },
  { name: 'TOURNAMENT MODE', steps: ['down', 'left', 'right', 'down'], apply: () => { S.setup.powerups = false; S.setup.twists = false; S.setup.tournament = true; S.setup.cheats = Object.assign(S.setup.cheats || {}, { tournament: true }); }, pure: true }
];
const codeEntered = name => { const c = CODES.find(x => x.name === name); if (!c) return; if (S.codes.includes(name)) return; c.apply(); S.codes.push(name); if (!c.pure) S.setup.cheated = true; S.codeChime = game.time; S.matchupT -= 0; caption('comeback', {}, 'VINNIE'); };
scenes.matchup = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'matchup'; S.matchupT = 0; S.codes = []; S.idle = 0; S.setup.cheats = S.setup.cheats || {}; },
  update(dt) {
    S.matchupT += dt;
    for (const c of CODES) { if (S.codes.includes(c.name)) continue; for (const I of game.players) { if (I && I.sequence && I.sequence(c.steps, { window: .6 })) { codeEntered(c.name); S.matchupT -= 2; break; } } }
    if (game.input.pressed('confirm') || game.input.pressed('start')) { return startMatchFromSetup(); }
    if (S.matchupT > 6) startMatchFromSetup();
  },
  draw(r) {
    const home = teamDef(S.setup.home), away = teamDef(S.setup.away);
    r.sky(COURTS[S.setup.court].sky);
    r.overlay(g => {
      screenTitle(g, 'TONIGHT\'S MATCHUP', COURTS[S.setup.court].name, r.W);
      const hp = rosterOf(home.id)[(S.setup.lineup || [0, 0])[0]], ap = rosterOf(away.id)[(S.setup.lineup || [0, 0])[1]];
      if (hp) portraitOf(g, hp.rigObj || (hp.rigObj = dressRig(hp, home)), r.W * .25 - 60, r.H * .3, 120);
      if (ap) portraitOf(g, ap.rigObj || (ap.rigObj = dressRig(ap, away)), r.W * .75 - 60, r.H * .3, 120);
      E.font.text(g, home.short, r.W * .25, r.H * .7, home.colors.jersey, { align: 'center', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, away.short, r.W * .75, r.H * .7, away.colors.jersey, { align: 'center', scale: 2, shadow: '#000', outline: false });
      E.font.text(g, 'VS', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 4, shadow: '#000', outline: false });
      E.font.text(g, 'CODES: ' + (S.codes.length ? S.codes.join(' · ') : 'ENTER A CODE, OR START TO PLAY'), r.W / 2, r.H * .84, C.muted, { align: 'center', scale: 1, outline: false });
    });
    promptBar(r, [['{confirm}', 'START'], ['{start}', 'SKIP']]);
  }
};
const startMatchFromSetup = () => {
  const s = S.setup;
  game.go('court', { court: s.court, qLen: s.qLen || 120, humans: s.humans.length ? s.humans : [{ slot: 0, input: game.input }], home: s.home, away: s.away, difficulty: s.difficulty, powerups: s.powerups !== false, twists: s.twists !== false, lineup: s.lineup, mode: 'exhibition', cheats: s.cheats || {}, bigHeads: !!s.bigHeads || setting('bigHeads') === 'On', moonGravity: !!(s.cheats && s.cheats.moonGravity) }, { fade: .2 });
};

/* ---- RESULTS: the final, the MVP, BLAM OF THE GAME, a box score on page two ---- */
scenes.results = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'results'; S.resultsPage = 0; S.resultsList = new FocusList([], { x: 40, y: 0, gap: 44, w: 300, onBack: () => game.go('menu', null, { fade: .2 }) }); S.results = d || {}; },
  update(dt) {
    if (game.input.pressed('right')) S.resultsPage = Math.min(1, S.resultsPage + 1);
    if (game.input.pressed('left')) S.resultsPage = Math.max(0, S.resultsPage - 1);
    if (S.mode === 'tour') {
      const won = (S.results.match.score[0] > S.results.match.score[1]), margin = Math.abs(S.results.match.score[0] - S.results.match.score[1]);
      S.resultsList.setItems([{ label: 'CONTINUE', on: () => { if (won) { tourResult(true, margin); tourNextAfterWin(); } else { tourResult(false, 0); game.go('loss', null, { fade: .2 }); } } }]);
      S.resultsList.nav(dt);
      return;
    }
    const items = [{ label: 'REMATCH', on: () => { const d = S.results.rematch; if (d) game.go('court', d, { fade: .2 }); else game.go('rules', null); } }, { label: 'NEW TEAMS', on: () => game.go('teams', null, { fade: .2 }) }, { label: 'MAIN MENU', on: () => game.go('menu', null, { fade: .2 }) }];
    S.resultsList.setItems(items); S.resultsList.nav(dt);
  },
  draw(r) {
    const d = S.results, m = d.match || {}, sc = m.score || [0, 0];
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, sc[0] === sc[1] ? 'TIE GAME' : (sc[0] > sc[1] ? (d.homeName || 'HOME') : (d.awayName || 'AWAY')) + ' WINS', d.courtName || '', r.W);
      if (S.resultsPage === 0) {
        E.font.title(g, sc[0] + ' - ' + sc[1], r.W / 2, r.H * .28, { align: 'center', scale: 5, colors: ['#fffbe8', '#ffe08a'], depth: 4 });
        E.font.text(g, 'MVP: ' + (d.mvp || '-'), r.W / 2, r.H * .55, C.gold, { align: 'center', scale: 2, shadow: '#000', outline: false });
        E.font.text(g, 'BLAM OF THE GAME: ' + (d.blam || '-'), r.W / 2, r.H * .63, C.cyan, { align: 'center', scale: 1, shadow: '#000', outline: false });
      } else {
        const rows = d.box || [];
        E.font.text(g, 'PLAYER            PTS  REB  AST  STL  BLK  DNK', r.W * .3, r.H * .3, C.gold, { scale: 1, outline: false });
        rows.forEach((row, i) => E.font.text(g, row, r.W * .3, r.H * .3 + 26 + i * 24, C.ink, { scale: 1, outline: false, shadow: '#000' }));
      }
    });
    S.resultsList.draw(r, { x: r.W * .06, y: r.H * .6, gap: 46, w: 300, scale: 2 });
    promptBar(r, [['{confirm}', 'SELECT'], ['{cancel}', 'MENU']]);
  }
};

/* ---- HALL OF BLAM: the top ten tour scores by initials, and the records ---- */
scenes.hall = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'hall'; S.hallBack = new FocusList([{ label: 'BACK' }], { x: 40, y: 0, gap: 40, w: 200, onBack: () => game.go('menu', null, { fade: .2 }) }); },
  update(dt) { S.hallBack.nav(dt); if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 }); },
  draw(r) {
    const hall = (S.progress.hall || []).slice(0, 10), rec = S.progress.records;
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HALL OF BLAM', 'THE TOP TEN TOUR SCORES', r.W);
      panel(g, r.W * .06, r.H * .24, r.W * .55, r.H * .66);
      hall.forEach((h, i) => E.font.text(g, (i + 1 + '').padStart(2, ' ') + '  ' + h.initials + '  ' + h.team.padEnd(12, ' ') + h.score, r.W * .08, r.H * .26 + i * 34, i === 0 ? C.gold : C.ink, { scale: 2, outline: false, shadow: '#000' }));
      if (!hall.length) E.font.text(g, 'NO TOUR SCORES YET.', r.W * .08, r.H * .26, C.muted, { scale: 2, outline: false });
      panel(g, r.W * .66, r.H * .24, r.W * .28, r.H * .3);
      E.font.text(g, 'RECORDS', r.W * .68, r.H * .26, C.gold, { scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'MOST POINTS: ' + (rec.mostPoints || 0), r.W * .68, r.H * .34, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'BEST DUNK: ' + (rec.bestDunk || '-'), r.W * .68, r.H * .38, C.ink, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'TOURS WON: ' + (rec.toursWon || 0), r.W * .68, r.H * .42, C.ink, { scale: 1, outline: false, shadow: '#000' });
    });
    promptBar(r, [['{cancel}', 'BACK']]);
  }
};

/* ---- HOW TO PLAY: three pages: the controls with their callouts; the rules; the twists and the power-ups ---- */
scenes.howto = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'howto'; S.howPage = 0; S.howFrom = d && d.from; },
  update(dt) {
    if (game.input.pressed('right')) S.howPage = Math.min(2, S.howPage + 1);
    if (game.input.pressed('left')) S.howPage = Math.max(0, S.howPage - 1);
    if (game.input.pressed('cancel') || game.input.pressed('confirm') && S.howPage === 2) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HOW TO PLAY', ['CONTROLS', 'RULES: WHAT YOU CAN AND CAN\'T DO', 'TWISTS AND POWER-UPS'][S.howPage] + '  ·  ←/→ TURN', r.W);
      panel(g, r.W * .05, r.H * .24, r.W * .9, r.H * .6);
      const L = [];
      if (S.howPage === 0) {
        for (const [a, label] of Object.entries(ACTION_NAMES)) L.push([a, label]);
        L.forEach(([a, label], i) => { const y = r.H * .28 + i * (r.H * .09); promptLine(g, '{' + a + '}', r.W * .1, y, { scale: 2 }); E.font.text(g, label.toUpperCase(), r.W * .34, y, C.ink, { scale: 2, outline: false, shadow: '#000' }); });
        E.font.text(g, 'MOVE WITH THE STICK OR WASD · HOLD SHOOT TO JUMP, RELEASE AT THE TOP', r.W * .1, r.H * .8, C.cyan, { scale: 1, outline: false });
        E.font.text(g, 'DUNKS NEED TURBO AND RANGE · SUPERNOVA: THREE BASKETS IN A ROW', r.W * .1, r.H * .84, C.cyan, { scale: 1, outline: false });
      } else if (S.howPage === 1) {
        const rules = ['2 ON 2, FULL COURT, FOUR QUARTERS. NO FOULS. NO TRAVELING. NO THREE SECONDS.', 'SHOVING, STEALS AND BODY CONTACT ARE LEGAL.', 'A SHOT CLOCK OF 20 SECONDS. DUNKS NEED TURBO.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'SUPERNOVA: UNLIMITED TURBO AND MORE POWER, UNTIL THE OTHER SIDE SCORES.', 'A TIE AFTER FOUR: OVERTIME, THEN SUDDEN BLAM.', 'NOBODY LEAVES THE COURT. THREE STRAIGHT = SUPERNOVA.'];
        rules.forEach((t, i) => E.font.text(g, t, r.W * .1, r.H * .28 + i * (r.H * .07), C.ink, { scale: 1, outline: false, shadow: '#000' }));
      } else {
        const twist = ['JACKPOT SPOT: A RING ON THE FLOOR, A MADE JUMP SHOT FROM IT SCORES +2', 'SEA BREEZE: A GUST SHOVES THE BALL. WATCH THE WINDSOCK', 'OIL SLICKS: SLIDE AND SLIP ON THE SHINY SPOTS', 'ERUPTIONS AND VENTS: TELEGRAPHED LAVA BOMBS, A PUFF OF STEAM', 'THE BLAMBOTS: OVERCLOCK, MAGNET HANDS, A SYSTEM REBOOT'];
        twist.forEach((t, i) => E.font.text(g, t, r.W * .1, r.H * .28 + i * (r.H * .07), C.gold, { scale: 1, outline: false, shadow: '#000' }));
        E.font.text(g, 'POWER-UPS: ROCKET KICKS · GLUE GLOVES · LASER SIGHT · MOON SHOES · BLAM BOMB · GOLD BALL', r.W * .1, r.H * .7, C.cyan, { scale: 1, outline: false });
      }
    });
    promptBar(r, [['{cancel}', 'BACK'], ['{confirm}', 'DONE']]);
  }
};

/* ---- ABOUT AND CREDITS: pages, one topic each (←/→ or L1/R1) ---- */
const ABOUT_PAGES = () => [
  { title: 'CREDITS', lines: ['ZONEFIRE: an original arcade basketball demo', 'Engine: my-3D2dge v0.85.2 (MIT), our modified copy', 'AI Hub client: aihub-session 1.4.0 (unmodified)', 'Every sound, song and voice is made in code', 'Courts, teams, the story, the announcer and the rules: all ours', 'Built by claude-haiku-5-5 (medium), from PLAN.md, on 2026-11-04'] },
  { title: 'SOURCE INFORMATION', lines: ['Date: 2026-11-04 06:18:30', 'Source: Basketball, over-the-top arcade style (genre inspiration; an original game)', 'Plan: PLAN.md (built from it; the title ZONEFIRE was drawn this run with a real RNG from 50 candidates)', 'Genre and perspective: arcade sports, 2-on-2 basketball; side-on broadcast camera (orthographic pitch 30), optional High camera', 'Tech: my-3D2dge v0.85.2 (modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio', 'Art direction: the engine\'s HD style pushed to 90s arcade broadcast: five courts, each its own mood', 'Animation: the engine\'s rigs posed by math; a hand layer for the ball; a procedural dribble; wind-ups for pass, steal and shove; named celebrations and taunts; per-dunk hand keys, body crouch, slam kick and landing, spins and a flip', 'Audio: music, effects and voices made in code; voices are gibberish with captions', 'Online: AI Hub shared-world session (HUB SHOWDOWN)', 'Testing: 80 headless tests; 3 browser tests; the hub harness (all 4 scenarios pass)', 'Research: none', 'Environment: Claude Code CLI (headless); Linux (WSL2); browser: Chromium for the tests, the player\'s unknown', 'Model: Anthropic, claude-haiku-5-5, reasoning effort medium', 'Usage: about 0.7M tokens (session budget counter); API cost in USD unknown; about one hour'] },
  { title: 'TESTING FEEDBACK', lines: ['Issues caught: about 15; four were game-breaking (a ball trapped on the rim\'s centre, a quarter that never ended, players stuck in their jump, the page failing to start).', 'Most helpful: full CPU-vs-CPU matches to the final whistle, with the event counts (they found most of the rest).', 'Least helpful: the hub harness as a black box; its failures named no cause, so we ran instrumented copies.', 'The physics check (made shots in, decided misses out) was reliable and quick.'] },
  { title: 'ENGINE FEEDBACK', lines: ['Liked most: the HD rigs and their look out of the box; E.TileMap with floorTex; game.advance for headless tests; the Dialog and the input labels.', 'Got stuck or guessed wrong: E.arc\'s apex is the rise over the higher end, not an absolute height; the canvas needs document.body, so scripts must sit at the end of body.', 'Built ourselves: the shot model, the ball physics, the CPU brains, the match flow, the netcode, the voices and the songs.', 'Hardest: the ball against the arena and the rims, and the hands of a rig (the pose internals).', 'Changes to the engine: see ENGINE CHANGES (audio buses, shorts, hair styles, the Dialog voice function).', 'One change to make: a public hook for a rig\'s hand targets, so a pose layer needs no reading of solvePose.'] },
  { title: 'PROMPT FEEDBACK', lines: ['Liked most: the milestones, the tables of numbers and the test list: a clear target.', 'Confusing: the goal and STAGE.md name the folder and the file differently; the title came from a pick the plan made, not one we made.', 'Hardest: the scope in one session: eleven milestones, about 230 tests and a hub check.', 'Would change: split it into a playable core first and the polish after; give the hub check its own budget.'] },
  { title: 'ENGINE CHANGES', lines: ['Each change is marked /* ZONEFIRE: ... */ in the engine.', 'Audio buses (sfxBus, musicBus) so the voice and crowd follow the volume settings.', 'Basketball shorts on the HD legs: pants to the hem, skin below, a sock on the shin.', 'Hair styles afro, flattop and mohawk in the HD head drawing.', 'Dialog voice may be a function (letter, index, page): the gibberish voice speaks each letter.'] },
  ...((S.progress.unlocked && S.progress.unlocked.bots) ? [{ title: 'SECRETS', lines: ['THE CODES (MATCHUP CARD):', ...CODES.map(c => c.name + ': ' + c.steps.join(' · ') + (c.pure ? '  (A PURE GAME)' : ''))] }] : [])
];
scenes.about = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter(d) { S.scene = 'about'; S.aboutPage = (d && d.page) || 0; },
  update() {
    const n = ABOUT_PAGES().length;
    if (game.input.pressed('right') || game.input.pressed('confirm')) S.aboutPage = (S.aboutPage + 1) % n;
    if (game.input.pressed('left')) S.aboutPage = (S.aboutPage + n - 1) % n;
    if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    const pages = ABOUT_PAGES(), P = pages[S.aboutPage];
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, P.title, (S.aboutPage + 1) + ' / ' + pages.length + '  ·  ←/→ TURN', r.W);
      panel(g, r.W * .05, r.H * .24, r.W * .9, r.H * .62);
      P.lines.forEach((t, i) => E.font.text(g, t, r.W * .08, r.H * .28 + i * (r.H * .055), C.ink, { scale: 1, outline: false, shadow: '#000', wrap: r.W * .84 }));
    });
    promptBar(r, [['{cancel}', 'BACK']]);
  }
};

/* ---- 43-tour.js ---- */
/* ---- THE BLAM TOUR (plan §10.5, §11.4): the tour map (the four stops, the medallions, the side panel), the beats as engine
 * dialogue with portraits, the stop's flow (intro, pre-game talk, matchup, the game, results, post-game beat, the map and
 * an autosave), the loss path (a rematch, a 10-second countdown), the reveal, the ending, the credits and unlocks, and the
 * Hall of Blam's initials wheel. A tour's progress is in S.progress.tour and E.store. ---- */
const TOUR_SCORE_OF = (pts, margin, won) => (won ? 2000 + Math.max(0, margin) * 50 : 0) + pts * 10;
const tourNow = () => S.progress.tour;
const tourSave = () => { saveProgress(); };

/** a new tour: the team is chosen on the team select, the lineup after, then the prologue and (first time) the camp offer */
const goTourNew = () => {
  S.mode = 'tour';
  S.progress.tour = { team: null, stop: 0, score: 0, won: [], beatsSeen: {}, rematch: false, quit: false, lost: null };
  tourSave();
  S.setup = Object.assign({}, SETUP, { humans: [], mode: 'tour' });
  game.go('teams', null, { fade: .2 });
};
const goTourContinue = () => { S.mode = 'tour'; game.go('tour', null, { fade: .2 }); };
/** after the lineup of a tour: the prologue beat, the camp offer, then the map */
const tourAfterLineup = () => {
  const t = tourNow(); t.team = S.setup.home; t.lineup = [S.lineupSel[0], S.lineupSel[1]]; tourSave();
  playBeat(BEATS.prologue, () => {
    if (!S.progress.camp || !S.progress.camp.length) return playBeat(BEATS.campOffer, () => game.go('tour', null, { fade: .2 }));
    game.go('tour', null, { fade: .2 });
  });
};

/* the beat runner: a list of [speaker, text]; a confirm (held 1 s to skip the beat, Start to skip all) turns the page */
const playBeat = (lines, done) => {
  S.beatQ = lines.slice(); S.beatDone = done;
  game.go('beat', null, { fade: .15 });
};
const beatTeam = () => S.progress.tour && S.progress.tour.team ? teamDef(S.progress.tour.team) : null;
scenes.beat = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() {
    S.scene = 'beat'; S.beatT = 0; S.beatHold = 0; S.beatVoiceId = 'vinnie';
    S.beatTalk = new E.Dialog(game, { lines: 3, place: 'bottom', border: C.gold, speed: 46, voice: (ch) => voiceLetter(ch, S.beatVoiceId || 'vinnie') });
    playSong('story');
    S.beatNext();
  },
  update(dt) {
    S.beatT += dt;
    if (S.beatTalk.update && S.beatTalk.update(dt)) return;
    if (game.input.down('confirm')) S.beatHold += dt; else S.beatHold = 0;
    if (game.input.pressed('start')) { S.beatQ = []; }
    if (S.beatHold > 1 && S.beatQ.length) { S.beatQ = []; S.beatHold = 0; }
    if (!S.beatQ.length) { const done = S.beatDone; S.beatDone = null; if (done) done(); return; }
    if (game.input.pressed('confirm')) { /* the line is on screen: the next press turns the page */ }
  },
  draw(r) {
    const team = beatTeam();
    r.sky(COURTS.dome.sky);
    r.overlay(g => { E.font.text(g, team ? team.short + ' · THE BLAM TOUR' : 'THE BLAM TOUR', r.W / 2, 12, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
    if (S.beatTalk && S.beatTalk.draw) S.beatTalk.draw(r);
    promptBar(r, [['{confirm}', 'NEXT'], ['{start}', 'SKIP ALL']]);
  }
};
/** the beat runner's step: shows the next line through the engine's dialogue, with the speaker's live portrait */
S.beatNext = () => {
  const talk = S.beatTalk; if (!talk) return;
  if (!S.beatQ || !S.beatQ.length) return;
  const [who, text] = S.beatQ.shift();
  const team = beatTeam();
  let spk = SPEAKERS[who], name, portrait, voice;
  if (who === 'captain') { const cap = captainOf(team ? team.id : 'hightops'); name = cap.name; portrait = cap.rig(); voice = cap.voice; }
  else if (spk) { name = spk.name; portrait = spk.rig(); voice = spk.voice; }
  else { const pd = playerDef(who); name = pd ? pd.name : who.toUpperCase(); portrait = pd ? playerRig(who) : null; voice = who; }
  S.beatVoiceId = voice;
  talk.say(fillLine(text, team), { name, portrait, onDone: () => { if (S.beatQ.length) S.beatNext(); }, speed: 46 });
};

/* the tour map: the four stops as medallions on a painted map; the focus list at the side; a stop's play starts its beats */
const TOUR_MAP_ITEMS = () => {
  const t = tourNow(), st = TOUR_STOPS[t.team] || [];
  const items = st.map((s, i) => {
    const won = t.won.includes(i), next = i === t.won.length;
    const label = (won ? 'W · ' : next ? '> ' : '  ') + 'STOP ' + (i + 1) + (i === 3 ? ' (FINAL)' : '');
    return { label, sub: teamDef(s.team).short, on: () => { if (next || won) tourStartStop(i); }, disabled: !next && !won };
  });
  items.push({ label: 'SAVE AND QUIT', on: () => { t.quit = true; tourSave(); game.go('menu', null, { fade: .2 }); } });
  return items;
};
S.tourList = null;
scenes.tour = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'tour'; S.idle = 0; playSong('tourmap'); S.tourList = S.tourList || new FocusList([], { x: 36, y: 0, gap: 34, w: 300, onBack: () => game.go('menu', null, { fade: .2 }) }); S.tourList.setItems(TOUR_MAP_ITEMS()); S.tourList.onBack = () => { tourNow().quit = true; tourSave(); game.go('menu', null, { fade: .2 }); }; },
  update(dt) { S.tourList.setItems(TOUR_MAP_ITEMS()); S.tourList.nav(dt); },
  draw(r) {
    const t = tourNow(), st = TOUR_STOPS[t.team] || [];
    r.sky(['#0b1230', '#1d2a5a', '#3a5a8a']);
    const boxes = S.tourList.draw(r, { x: 36, y: r.H * .26, gap: Math.max(34, r.H * .09), w: r.W * .26, scale: 2 });
    S.tourList.pointer(r, boxes);
    // the painted map (§11.4): the five places (Neon Heights' skyline, the Pier on the coast, the Scrapyard inland, Kaboom
    // Island off shore, the Blam Dome on a hill), the dotted route, and the medallions (won: a W and the score; next: pulsing;
    // later: dim) that the mouse hovers and clicks; a side panel with the tour score, the record and the next opponent
    const mx = r.W * .36, my = r.H * .22, mw = r.W * .6, mh = r.H * .6;
    const spots = [[.12, .62], [.36, .42], [.6, .58], [.82, .32]];
    const pulse = .5 + .5 * Math.sin(game.time * 5);
    r.overlay(g => {
      px.rect(g, mx, my, mw, mh, '#1a2a4a');
      px.rect(g, mx, my + mh * .7, mw, mh * .3, '#0c3a5a');                              // the sea
      px.rect(g, mx, my + mh * .66, mw * .35, mh * .05, '#c8a86a');                       // the Pier's boardwalk on the coast
      for (let i = 0; i < 9; i++) px.rect(g, mx + mw * (.03 + i * .04), my + mh * (.14 + (i % 3) * .05), mw * .03, mh * .4 - (i % 3) * 8, '#243a66');   // Neon Heights
      for (let i = 0; i < 6; i++) px.rect(g, mx + mw * (.3 + i * .02), my + mh * (.66 - (i % 2) * .03), mw * .025, mh * .05, '#6a5a48');  // Scrapyard junk piles
      px.disc(g, mx + mw * .9, my + mh * .8, mh * .09, '#3a5a2a'); px.disc(g, mx + mw * .9, my + mh * .76, mh * .04, '#7a3a2a');        // Kaboom Island and its volcano
      px.disc(g, mx + mw * .66, my + mh * .18, mh * .13, '#2a2e44'); px.rect(g, mx + mw * .6, my + mh * .18, mw * .12, mh * .08, '#34385a');   // the Blam Dome on a hill
      const names = ['NEON HEIGHTS', 'THE PIER', 'SCRAPYARD', 'KABOOM ISLAND', 'BLAM DOME'];
      names.forEach((n, i) => E.font.text(g, n, mx + mw * [.12, .36, .6, .82, .66][i], my + mh * [.08, .66, .68, .9, .08][i], C.cyan, { scale: 1, outline: false, shadow: '#000' }));
      // the route, dotted
      for (let i = 0; i < 3; i++) for (let k = 1; k < 8; k++) { const f = k / 8; const x = lerp(mx + mw * spots[i][0], mx + mw * spots[i + 1][0], f), y = lerp(my + mh * spots[i][1], my + mh * spots[i + 1][1], f); px.rect(g, x, y, 3, 3, '#ffe08a'); }
      st.forEach((s2, i) => {
        const cx = mx + mw * spots[i][0], cy = my + mh * spots[i][1], won = t.won.includes(i), next = i === t.won.length;
        const hot = S.tourHover === i;
        px.disc(g, cx, cy, next ? 15 + pulse * 3 : 14, won ? C.ok : next ? C.accent : '#3a2a5a'); px.disc(g, cx, cy, 11, '#140c26');
        if (hot) px.disc(g, cx, cy, 17, C.gold);
        E.font.text(g, won ? 'W' : String(i + 1), cx, cy - 4, won ? C.ok : next ? C.ink : C.muted, { align: 'center', scale: 1, outline: false });
        E.font.text(g, teamDef(s2.team).short, cx, cy + 20, won ? C.ok : C.ink, { align: 'center', scale: 1, outline: false, shadow: '#000' });
        if (won) E.font.text(g, 'W ' + (t.stamp && t.stamp[i] || ''), cx, cy + 30, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      });
      panel(g, mx, my + mh + 12, mw, r.H * .16);
      E.font.text(g, 'TOUR SCORE ' + t.score, mx + 14, my + mh + 24, C.gold, { scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'RECORD: MOST POINTS ' + (S.progress.records.mostPoints || 0) + ' · TOURS WON ' + (S.progress.records.toursWon || 0), mx + 14, my + mh + 56, C.cyan, { scale: 1, outline: false, shadow: '#000' });
      E.font.text(g, 'NEXT: ' + (t.won.length < 4 && st[t.won.length] ? teamDef(st[t.won.length].team).name : 'NONE'), mx + 14, my + mh + 74, C.ink, { scale: 1, outline: false, shadow: '#000' });
    });
    // the medallions answer the mouse: hover moves the focus to a stop, a click starts it
    const pt = game.input.pointer(), ck = game.input.clicked();
    S.tourHover = -1;
    spots.forEach((sp, i) => {
      const cx = mx + mw * sp[0], cy = my + mh * sp[1];
      if (pt && Math.hypot(pt[0] - cx, pt[1] - cy) < 18) { S.tourHover = i; S.tourList.i = Math.min(i, S.tourList.items.length - 1); }
      if (ck && Math.hypot(ck[0] - cx, ck[1] - cy) < 18) { const it = S.tourList.items[i]; if (it && !it.disabled && it.on) it.on(S.tourList); }
    });
  }
};
const tourStartStop = i => {
  const t = tourNow(), s = TOUR_STOPS[t.team][i], rival = teamDef(s.team), court = COURTS[s.court];
  t.stop = i; tourSave();
  S.setup = { home: t.team, away: s.team, court: s.court, qLen: 90, difficulty: setting('difficulty') || 'Pro', powerups: i >= 1, twists: true, humans: [{ slot: 0, input: game.input }], lineup: t.lineup || [0, 0], mode: 'tour', tourStop: i };
  S.tourShift = TOUR_SHIFT[i];
  const pre = PREGAME[s.team];
  const reply = pre && pre.replies[t.team];
  const beats = [['vinnie', 'STOP ' + (i + 1) + ' OF THE BLAM TOUR: {TEAM} VERSUS ' + rival.name + ' AT ' + court.name + '!'], ['deedee', BEATS.stopIntro[s.court]]];
  if (pre) beats.push([pre.who, pre.line], ['captain', reply ? reply[1] : '']);
  if (i === 3) beats.unshift(['vinnie', BEATS.final[0][1]]);
  playBeat(beats, () => game.go('matchup', null, { fade: .2 }));
};

/** the match's result on a tour: a win gives the stop's points and the post-game beat; a loss gives the rematch countdown */
const tourResult = (won, margin) => {
  const t = tourNow(), i = (S.setup || {}).tourStop || 0, pts = S.match.score[0];
  if (won) {
    if (!t.won.includes(i)) t.won.push(i);
    t.stamp = t.stamp || {}; t.stamp[i] = S.match.score[0] + '-' + S.match.score[1];   // the W stamp shows the final score
    t.score += TOUR_SCORE_OF(pts, margin, true);
    t.lost = null;
    tourSave();
    const post = BEATS.postGame[i + 1 <= 2 ? i + 1 : 2] || [];
    if (i === 3) return 'ending';
    return post.length ? 'post' : 'map';
  }
  t.lost = i; tourSave();
  return 'loss';
};
/** the stop's beats after a win: the post-game beat for the first two stops; the reveal after stop three; the ending */
const tourNextAfterWin = () => {
  const t = tourNow(), i = t.stop;
  if (i === 2) return playBeat(BEATS.reveal.map(([w, x]) => [w, w === 'captain' ? x : x]), () => game.go('tour', null, { fade: .2 }));
  if (i === 3) return tourEnding();
  const post = BEATS.postGame[i + 1];
  if (post) return playBeat(post, () => game.go('tour', null, { fade: .2 }));
  game.go('tour', null, { fade: .2 });
};
const tourEnding = () => {
  const t = tourNow();
  S.progress.unlocked.bots = true; S.progress.unlocked.allstars = true; S.progress.unlocked.bigHeads = true;
  S.progress.records.toursWon = (S.progress.records.toursWon || 0) + 1;
  tourSave();
  playBeat(BEATS.ending, () => game.go('credits', null, { fade: .3 }));
};
/** a loss on a stop: the results, then REMATCH? with a ten-second countdown (Rematch, Tour Map, Quit Tour) */
scenes.loss = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'loss'; S.lossT = 10; S.lossList = new FocusList([], { x: 40, y: 0, gap: 40, w: 300 }); },
  update(dt) {
    S.lossT -= dt;
    S.lossList.setItems([{ label: 'REMATCH', on: () => tourRematch() }, { label: 'TOUR MAP', on: () => game.go('tour', null, { fade: .2 }) }, { label: 'QUIT TOUR', on: () => tourQuit() }]);
    S.lossList.nav(dt);
    if (S.lossT <= 0) tourQuit();
  },
  draw(r) {
    const i = tourNow().lost, t = tourNow();
    r.sky(['#2a0a14', '#4a1a2a', '#6a2a3a']);
    r.overlay(g => {
      screenTitle(g, 'REMATCH?', i === 3 ? (BEATS.lossFinal[0][1]) : (BEATS.lossStop[0][1]), r.W);
      E.font.text(g, 'REMATCH IN ' + Math.ceil(Math.max(0, S.lossT)) + ' S', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 3, outline: false, shadow: '#000' });
    });
    S.lossList.draw(r, { x: r.W * .3, y: r.H * .6, gap: 48, w: 300, scale: 2 });
    promptBar(r, MENU_PROMPT);
  }
};
const tourRematch = () => { const t = tourNow(); tourStartStop(t.lost); };
const tourQuit = () => { const t = tourNow(); t.quit = true; tourSave(); if (t.score > 0) hallEntry(t.score); else game.go('menu', null, { fade: .2 }); };
/** the Hall of Blam's initials wheel: up and down change a letter, left and right move, ✕ enters */
const hallEntry = score => { S.entry = { score, letters: [0, 0, 0], at: 0, team: teamDef(tourNow().team).short }; game.go('initials', null, { fade: .2 }); };
scenes.initials = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'initials'; },
  update() {
    const E2 = S.entry;
    if (game.input.pressed('up')) E2.letters[E2.at] = (E2.letters[E2.at] + 1) % 26;
    if (game.input.pressed('down')) E2.letters[E2.at] = (E2.letters[E2.at] + 25) % 26;
    if (game.input.pressed('right')) E2.at = Math.min(2, E2.at + 1);
    if (game.input.pressed('left')) E2.at = Math.max(0, E2.at - 1);
    if (game.input.pressed('confirm')) {
      const init = E2.letters.map(l => String.fromCharCode(65 + l)).join('');
      const hall = S.progress.hall || (S.progress.hall = []);
      hall.push({ initials: init, team: E2.team, score: E2.score }); hall.sort((a, b) => b.score - a.score); hall.length = Math.min(hall.length, 10);
      tourSave(); game.go('hall', null, { fade: .3 });
    }
    if (game.input.pressed('cancel')) game.go('menu', null, { fade: .2 });
  },
  draw(r) {
    const E2 = S.entry;
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => {
      screenTitle(g, 'HALL OF BLAM', 'ENTER YOUR INITIALS · ' + E2.score + ' POINTS', r.W);
      E2.letters.forEach((l, i) => E.font.text(g, String.fromCharCode(65 + l), r.W / 2 - 60 + i * 60, r.H * .45, i === E2.at ? C.gold : C.ink, { align: 'center', scale: 5, outline: false, shadow: '#000' }));
    });
    promptBar(r, [['{confirm}', 'ENTER'], ['{cancel}', 'CANCEL']]);
  }
};
/** the credits after the ending: a scroll over the trophy and the unlock cards */
scenes.credits = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'credits'; S.creditsT = 0; playSong('credits'); },
  update(dt) { S.creditsT += dt; if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) tourQuitHall(); if (S.creditsT > 30) tourQuitHall(); },
  draw(r) {
    r.sky(['#2a0a40', '#5a1a6a', '#ff7a5c']);
    const lines = ['ZONEFIRE', 'THE BLAM TOUR, COMPLETE', '', 'PRODUCED WITH MY-3D2DGE V0.85.2', 'THE CHANNEL BLAM BROADCAST TEAM', 'VINNIE VOX · DEE DEE DECIBEL', 'COMMISSIONER GIGAWATT (NOT HAPPY)', 'THE BLAMBOTS (RECYCLED)', '', 'UNLOCKED: THE BLAMBOTS', 'UNLOCKED: CHANNEL BLAM ALL-STARS', 'UNLOCKED: BIG HEADS (OPTIONS)', 'SECRETS ON THE ABOUT SCREEN', '', 'NO FOULS. NO MERCY. ALL BLAM.'];
    r.overlay(g => { lines.forEach((t, i) => E.font.text(g, t, r.W / 2, r.H - 40 - S.creditsT * 26 + i * 34, C.ink, { align: 'center', scale: i === 0 ? 3 : 2, outline: false, shadow: '#000' })); });
  }
};
const tourQuitHall = () => { const t = tourNow(); if (t && t.score > 0 && !t.hallDone) { t.hallDone = true; tourSave(); hallEntry(t.score); } else game.go('menu', null, { fade: .3 }); };

/* ---- 44-camp.js ---- */
/* ---- BLAM CAMP (plan §10.9): ten lessons on the Skybox with DEE DEE coaching through captions and voice. The practice
 * partners (the interns) are passive; a lesson is complete when its goal is counted from the match's own events (so
 * a lesson can't be faked by a screen). Completion is saved; the lessons can be picked, and skipped. ---- */
const CAMP_LESSONS = [
  { id: 'move', name: 'MOVE & TURBO', text: 'RUN THROUGH THE CONES. HOLD {turbo} TO RUN FAST.', goal: 3, count: 'cones' },
  { id: 'pass', name: 'PASS', text: 'PASS TO YOUR TEAMMATE TWICE. THEN CALL FOR IT WITH {pass}.', goal: 2, count: 'pass' },
  { id: 'jump', name: 'JUMP SHOT', text: 'HOLD {shoot} TO JUMP. RELEASE AT THE TOP. MAKE TWO. ONE PERFECT.', goal: 2, count: 'jumpMake', perfect: true },
  { id: 'three', name: 'THREE', text: 'MAKE A THREE FROM BEYOND THE ARC.', goal: 1, count: 'three' },
  { id: 'dunk', name: 'DUNK', text: 'HOLD {turbo} AND PRESS {shoot} INSIDE THE DUNK RING. TWO DUNKS.', goal: 2, count: 'dunk' },
  { id: 'oop', name: 'ALLEY-OOP', text: 'PRESS {oop} TO LOB TO YOUR CUTTING TEAMMATE.', goal: 1, count: 'oop' },
  { id: 'steal', name: 'STEAL & SPIN', text: 'STRIP AN INTERN WITH {pass}. BEAT ONE WITH A SPIN: {shove}.', goal: 2, count: 'stealSpin' },
  { id: 'block', name: 'BLOCK & SHOVE', text: 'BLOCK AN INTERN\'S JUMPER WITH {shoot}. SHOVE ONE WITH {shove}.', goal: 2, count: 'blockShove' },
  { id: 'rebound', name: 'REBOUND', text: 'GRAB A MISS, THEN A PUTBACK DUNK.', goal: 2, count: 'rebound' },
  { id: 'nova', name: 'SUPERNOVA & THE RULES', text: 'SCORE THREE IN A ROW. THEN READ THE RULES CARD.', goal: 3, count: 'streak' }
];
const campDone = () => S.progress.camp || (S.progress.camp = []);
S.camp = null;

/** the camp's event counts: a lesson's goal is counted from the match's own events, by the player's slot */
const campCount = {};
const campCountReset = () => { for (const k of Object.keys(campCount)) delete campCount[k]; };
on('basket', ev => { if (!S.camp || ev.slot !== 0) return; if (ev.three) campCount.three = (campCount.three || 0) + 1; campCount.jumpMake = (campCount.jumpMake || 0) + 1; if (ev.perfect) campCount.perfect = (campCount.perfect || 0) + 1; campCount.streakNow = ev.streak; if (ev.streak > (campCount.streak || 0)) campCount.streak = ev.streak; if (ev.dunk) campCount.dunk = (campCount.dunk || 0) + 1; });
on('pass', ev => { if (S.camp && ev.slot === 0) campCount.pass = (campCount.pass || 0) + 1; });
on('alleyoop', ev => { if (S.camp && ev.slot === 0) campCount.oop = (campCount.oop || 0) + 1; });
on('steal', ev => { if (S.camp && ev.slot === 0) campCount.steal = (campCount.steal || 0) + 1; });
on('spin', ev => { if (S.camp && ev.slot === 0) campCount.spin = (campCount.spin || 0) + 1; });
on('block', ev => { if (S.camp && ev.slot === 0) campCount.block = (campCount.block || 0) + 1; });
on('knockdown', ev => { if (S.camp && ev.by === 0) campCount.knock = (campCount.knock || 0) + 1; });
on('rebound', ev => { if (S.camp && ev.slot === 0) campCount.rebound = (campCount.rebound || 0) + 1; if (S.camp && ev.slot === 0 && S.camp.afterRebound) campCount.putback = true; });
on('dunkStart', ev => { if (S.camp && ev.slot === 0 && ev.blocked) campCount.blockedDunk = true; });

/** the goal's counter for the running lesson, from the events above */
const campGoalNow = l => {
  switch (l.count) {
    case 'cones': return Math.min(3, S.camp.cones || 0);
    case 'pass': return Math.min(2, campCount.pass || 0);
    case 'jumpMake': return Math.min(2, (campCount.jumpMake || 0) > 0 && (!l.perfect || campCount.perfect) ? campCount.jumpMake : 0);
    case 'three': return Math.min(1, campCount.three || 0);
    case 'dunk': return Math.min(2, campCount.dunk || 0);
    case 'oop': return Math.min(1, campCount.oop || 0);
    case 'stealSpin': return Math.min(2, Math.min(campCount.steal || 0, 1) + Math.min(campCount.spin || 0, 1));
    case 'blockShove': return Math.min(2, Math.min(campCount.block || 0, 1) + Math.min(campCount.knock || 0, 1));
    case 'rebound': return Math.min(2, (campCount.rebound || 0) > 0 && campCount.putback ? 2 : Math.min(1, campCount.rebound || 0));
    case 'streak': return Math.min(3, campCount.streak || 0);
  }
  return 0;
};

/** the camp: the lessons list, then a lesson on the court; the match runs with the interns passive */
const startCampLesson = idx => {
  const l = CAMP_LESSONS[idx];
  S.camp = { idx, lesson: l, t: 0, cones: 0, done: false, rules: false, afterRebound: false, won: false };
  campCountReset();
  S.setup = { home: 'hightops', away: 'breakers', court: 'skybox', qLen: 600, difficulty: 'Pro', powerups: false, twists: false, humans: [{ slot: 0, input: game.input }], mode: 'camp', campLesson: idx, passive: true };
  game.go('court', { court: 'skybox', qLen: 600, humans: [{ slot: 0, input: game.input }], home: 'hightops', away: 'breakers', mode: 'camp', passive: true, twists: false, powerups: false }, { fade: .2 });
};
const campFinishLesson = () => {
  const l = S.camp.lesson, c = campDone();
  if (!c.includes(l.id)) c.push(l.id);
  saveProgress();
  S.camp.done = true; S.camp.doneT = 0;
  emit('campDone', { id: l.id });
};
/** the camp's own step (called from the court scene in camp mode): counts the cones, watches the goal, and finishes */
const campStep = dt => {
  if (!S.camp) return;
  S.camp.t += dt;
  const p = S.players[0];
  if (p && S.camp.lesson.id === 'move' && p.turboOn) { S.camp.turboRun = (S.camp.turboRun || 0) + Math.hypot(p.body.vx, p.body.vy) * dt; if (S.camp.turboRun > 260 * (S.camp.cones + 1) / 3) S.camp.cones = Math.min(3, S.camp.cones + 1); }
  if (S.camp.done) { S.camp.doneT += dt; return; }
  if (S.camp.rules) { if (game.players.some(I => I && I.pressed('confirm'))) { anyConsume('confirm'); campFinishLesson(); } return; }
  if (campGoalNow(S.camp.lesson) >= S.camp.lesson.goal) {
    // the last lesson ends on the rules card: no fouls, goaltending counts, 20 seconds, dunks need turbo, nobody leaves, three straight is Supernova
    if (S.camp.lesson.id === 'nova') S.camp.rules = true; else campFinishLesson();
  }
  if (S.camp.lesson.id === 'rebound' && campCount.rebound) S.camp.afterRebound = true;
};
/** the camp's card at the bottom: the lesson, its instruction (in the player's glyphs), the counter, and DEE DEE's line */
const campDraw = r => {
  const c = S.camp; if (!c) return;
  const l = c.lesson, g0 = campGoalNow(l);
  r.overlay(g => {
    panel(g, 16, r.H * .14, r.W * .36, 84, { border: C.gold });
    E.font.text(g, 'CAMP ' + (c.idx + 1) + ' · ' + l.name, 28, r.H * .14 + 10, C.gold, { scale: 2, outline: false, shadow: '#000' });
    promptLine(g, l.text, 28, r.H * .14 + 42, { scale: 1 });
    E.font.text(g, g0 + ' / ' + l.goal, r.W * .36, r.H * .14 + 60, C.ink, { align: 'right', scale: 2, outline: false, shadow: '#000' });
    if (c.rules) {
      panel(g, r.W * .2, r.H * .18, r.W * .6, r.H * .5, { border: C.gold });
      E.font.title(g, 'THE RULES', r.W / 2, r.H * .22, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2 });
      ['NO FOULS. SHOVING IS LEGAL.', 'GOALTENDING COUNTS FOR THE SHOOTER.', 'A 20-SECOND SHOT CLOCK.', 'DUNKS NEED TURBO.', 'NOBODY LEAVES THE COURT.', 'THREE STRAIGHT BASKETS = SUPERNOVA.'].forEach((t, i) => E.font.text(g, t, r.W * .24, r.H * .32 + i * 34, C.ink, { scale: 2, outline: false, shadow: '#000' }));
      E.font.text(g, 'YOU\'RE READY! PRESS CONFIRM', r.W / 2, r.H * .64, C.gold, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    }
    if (c.done) E.font.text(g, 'NICE!', r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 4, outline: false, shadow: '#000' });
  });
};
scenes.camp = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'camp'; S.idle = 0; S.campList = new FocusList([], { x: 36, y: 0, gap: 28, w: 340, onBack: () => game.go('menu', null, { fade: .2 }) }); },
  update(dt) {
    const c = campDone();
    S.campList.setItems(CAMP_LESSONS.map((l, i) => ({ label: (c.includes(l.id) ? 'DONE  ' : '      ') + (i + 1) + '. ' + l.name, on: () => startCampLesson(i) })));
    S.campList.nav(dt);
  },
  draw(r) {
    const c = campDone();
    r.sky(['#0a0620', '#24124a', '#3a1a5a']);
    r.overlay(g => { screenTitle(g, 'BLAM CAMP', 'TEN LESSONS FROM DEE DEE', r.W); panel(g, r.W * .44, r.H * .24, r.W * .5, r.H * .6); E.font.text(g, 'DEE DEE: "WELCOME TO CAMP. THE INTERNS WON\'T FIGHT BACK. MUCH."', r.W * .47, r.H * .27, C.cyan, { scale: 1, outline: false, shadow: '#000', wrap: r.W * .44 }); E.font.text(g, c.length + ' OF 10 DONE', r.W * .47, r.H * .8, C.gold, { scale: 2, outline: false, shadow: '#000' }); });
    const boxes = S.campList.draw(r, { x: 36, y: r.H * .26, gap: Math.max(30, r.H * .075), w: r.W * .36, scale: 2 });
    S.campList.pointer(r, boxes);
    promptBar(r, MENU_PROMPT);
  }
};

/* ---- 45-attract.js ---- */
/* ---- ATTRACT MODE (plan §13): after ten seconds without input on a title or menu screen, a looping demo of five real
 * segments: the CPU plays both sides, cheating freely (infinite turbo, a wide dunk range, frequent power-ups), and a
 * script forces each feature so every one shows. Any input leaves at once. ---- */
const ATTRACT_SEGMENTS = [
  { court: 'skybox', home: 'hightops', away: 'breakers', seconds: 35, score: [0, 0], quarter: 1, cheats: { infTurbo: true, dunkRange: 60 }, script: [[0, 'tip'], [6, 'twist', 'jackpot'], [12, 'command', 0, 'oop'], [18, 'spin', 0]] },
  { court: 'pier', home: 'breakers', away: 'crushers', seconds: 30, score: [0, 0], quarter: 1, cheats: { infTurbo: true }, script: [[5, 'twist', 'wind'], [9, 'spawn', 'rocket'], [14, 'spawn', 'laser']] },
  { court: 'scrapyard', home: 'crushers', away: 'magma', seconds: 30, score: [0, 0], quarter: 2, cheats: { infTurbo: true }, script: [[4, 'twist', 'slick'], [10, 'bomb']] },
  { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [0, 0], quarter: 2, cheats: { infTurbo: true }, script: [[6, 'twist', 'eruption'], [14, 'vent']] },
  { court: 'dome', home: 'blambots', away: 'allstars', seconds: 35, score: [0, 0], quarter: 3, cheats: { infTurbo: true, boss: true }, script: [[4, 'nova', 0], [12, 'overclock'], [20, 'quake']] }
];
S.attract = { seg: 0, t: 0, card: 0, showing: false, cardT: 0 };
/** a script's action: the features the segment shows, forced on time */
const attractAct = (step) => {
  const [, act, a, b] = step;
  if (act === 'tip') return;
  if (act === 'twist') return forceTwist(a);
  if (act === 'command') { const p = S.players[a]; if (p && p.brain) { p.attractOop = true; } return; }
  if (act === 'spin') { const p = S.players[a]; if (p && p.hasBall) spinMove(p); return; }
  if (act === 'spawn') return spawnPowerupNamed(a);
  if (act === 'bomb') { const p = S.players.find(q => q.side === S.match.poss && q.hasBall); if (p) p.bomb = true; return; }
  if (act === 'nova') { const p = S.players[a]; if (p && !p.nova) igniteNova(p); return; }
  if (act === 'overclock') { return overclockOn && overclockOn(); }
  if (act === 'vent') { return ventLaunch && ventLaunch(); }
  if (act === 'quake') { return; }
};
const attractStart = (idx) => {
  const seg = ATTRACT_SEGMENTS[idx];
  S.attract.seg = idx; S.attract.t = 0; S.attract.fired = [];
  S.cheats = Object.assign({}, seg.cheats);
  S.attractCheats = seg.cheats;
  setupMatch({ court: seg.court, home: seg.home, away: seg.away, qLen: 60, humans: [], powerups: true, twists: true, mode: 'attract', difficulty: 'BLAM' });
  S.match.quarter = seg.quarter; S.match.score = seg.score.slice();
  S.tourShift = 0;
  S.attractOn = true;
};
const attractCard = { t: 0 };
scenes.attract = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'attract'; S.attract.card = 0; S.attract.cardT = 0; S.attractOn = false; S.attract.seg = S.attract.seg || 0; attractCard.t = 0; A.music(null); },
  update(dt) {
    if (anyPressed('confirm') || anyPressed('start') || anyPressed('cancel') || anyPressed('pause') || anyPressed('up') || anyPressed('down') || anyPressed('left') || anyPressed('right') || (game.input.clicked && game.input.clicked()) || (game.players.some(I => I && I.anyPressed && I.anyPressed()))) {
      anyConsume('confirm'); S.attractOn = false; S.idle = 0; game.go('title', null, { fade: .2 }); return;
    }
    if (S.attract.card > 0) {
      S.attract.cardT += dt;
      if (S.attract.card === 1 && S.attract.cardT > 2) { S.attract.card = 0; attractStart(S.attract.seg); }
      else if (S.attract.card === 2 && S.attract.cardT > 6) { S.attract.card = 0; S.attract.seg = 0; S.attract.t = 0; game.go('title', null, { fade: .3 }); }
      return;
    }
    if (!S.attractOn) { attractStart(S.attract.seg); }
    S.attract.t += dt;
    const seg = ATTRACT_SEGMENTS[S.attract.seg];
    for (const st of seg.script) { if (S.attract.fired.includes(st) || S.attract.t < st[0]) continue; S.attract.fired.push(st); attractAct(st); }
    // a cheat's effects each step: infinite turbo for everyone; the dunk range for the demo
    if (S.attractCheats && S.attractCheats.infTurbo) for (const p of S.players) p.turbo = 1;
    matchStep(dt); cameraStep(dt); matchFrame(dt);
    if (S.match.over || S.attract.t >= seg.seconds) {
      S.attract.seg++;
      S.attractOn = false;
      if (S.attract.seg >= ATTRACT_SEGMENTS.length) { S.attract.card = 2; S.attract.cardT = 0; }
      else { S.attract.card = 1; S.attract.cardT = 0; }
    }
  },
  draw(r) {
    if (S.attract.card === 1) { r.sky(['#05040a', '#1d1240', '#3a1a5a']); r.overlay(g => E.font.title(g, 'TONIGHT ON CHANNEL BLAM', r.W / 2, r.H * .42, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a'] })); return; }
    if (S.attract.card === 2) { r.sky(['#05040a', '#1d1240', '#3a1a5a']); r.overlay(g => { screenTitle(g, 'HALL OF BLAM', 'THE TOP TEN TOUR SCORES', r.W); }); return; }
    drawCourt(r, S.courtDef);
    hudDraw(r);
    r.overlay(g => { E.ui.box(g, r.W / 2 - 150, r.H - 90, 300, 22, { bg: ['#1a1030', '#0c0618'], alpha: .9 }); E.font.text(g, 'CHANNEL BLAM DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 84, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
  }
};
/** the forced twist and the power-up spawns (also the dev panel's buttons) */
const forceTwist = kind => { if (kind === 'wind') { S.twist.wind = 1; S.twist.windT = 4; S.twist.windDir = 1; } else if (kind === 'jackpot') { S.twist.jackpot = { x: CENTRE().x + 60, y: CENTRE().y, t: 0 }; } else if (kind === 'slick') { S.twist.slicks = [{ x: CENTRE().x + 60, y: CENTRE().y + 40, r: 28 }]; } else if (kind === 'eruption') { S.twist.erupt = 0; } };
const spawnPowerupNamed = id => { const pu = get('powerup', id); if (pu) S.powerups.push({ id, x: CENTRE().x + 40, y: CENTRE().y - 30, t: 0 }); };

/* ---- 46-dev.js ---- */
/* ---- DEV MODE (plan §14): reached from the pause menu's Dev Mode item (and #dev). The dev panel docks on the right third
 * while the human players' slots are driven by CPU brains, so the match keeps flowing. Tabs: TUNING (every slider with
 * its default and a help line; reset, save as my defaults, copy as JSON), CHEATS, MATCH, SCENES, DEBUG, TIME, CAMERA. ---- */
const DEV_TABS = ['TUNING', 'CHEATS', 'MATCH', 'SCENES', 'DEBUG', 'TIME', 'CAMERA'];
S.dev = { open: false, tab: 0, row: 0, page: 0, json: '' };
const devRows = () => {
  const tab = DEV_TABS[S.dev.tab];
  if (tab === 'TUNING') return Object.entries(TUNING).map(([k, t]) => ({ kind: 'slider', key: k, label: t.label, group: t.group }));
  if (tab === 'CHEATS') return [
    { kind: 'toggle', key: 'infTurbo', label: 'INFINITE TURBO (EVERYONE)' }, { kind: 'toggle', key: 'alwaysNova', label: 'ALWAYS SUPERNOVA (HOME)' },
    { kind: 'toggle', key: 'cpuPassive', label: 'CPU PASSIVE' }, { kind: 'toggle', key: 'shotsIn', label: 'SHOTS ALWAYS IN' }, { kind: 'toggle', key: 'shotsOut', label: 'SHOTS ALWAYS OUT' },
    { kind: 'toggle', key: 'unblockable', label: 'UNBLOCKABLE DUNKS' }, { kind: 'toggle', key: 'oneShove', label: 'ONE-SHOVE KNOCKDOWNS' }, { kind: 'toggle', key: 'bigHeads', label: 'BIG HEADS' },
    { kind: 'toggle', key: 'powerEvery5', label: 'POWER-UPS EVERY 5 S' }, { kind: 'toggle', key: 'noTwists', label: 'TWISTS OFF' }, { kind: 'toggle', key: 'freezeClock', label: 'FREEZE GAME CLOCK' },
    { kind: 'toggle', key: 'freezeShot', label: 'FREEZE SHOT CLOCK' }, { kind: 'action', key: 'unlockAll', label: 'UNLOCK EVERYTHING' }, { kind: 'action', key: 'resetSave', label: 'RESET SAVE DATA (ASKS)' }];
  if (tab === 'MATCH') return [
    { kind: 'action', key: 'homePlus', label: 'HOME SCORE +2' }, { kind: 'action', key: 'awayPlus', label: 'AWAY SCORE +2' }, { kind: 'action', key: 'quarterNext', label: 'END THE QUARTER' },
    { kind: 'action', key: 'clockTo', label: 'CLOCK TO 10 S' }, { kind: 'action', key: 'shotClockReset', label: 'SHOT CLOCK TO 20' }, { kind: 'action', key: 'giveBall', label: 'GIVE THE BALL TO P1' },
    { kind: 'action', key: 'endGame', label: 'END THE GAME' }, { kind: 'action', key: 'novaP1', label: 'SUPERNOVA FOR P1' }, { kind: 'action', key: 'shatterNext', label: 'SHATTER THE NEXT DUNK' },
    { kind: 'action', key: 'pu_rocket', label: 'SPAWN ROCKET KICKS' }, { kind: 'action', key: 'pu_glue', label: 'SPAWN GLUE GLOVES' }, { kind: 'action', key: 'pu_laser', label: 'SPAWN LASER SIGHT' },
    { kind: 'action', key: 'pu_moon', label: 'SPAWN MOON SHOES' }, { kind: 'action', key: 'pu_bomb', label: 'SPAWN BLAM BOMB' }, { kind: 'action', key: 'pu_gold', label: 'SPAWN GOLD BALL' },
    { kind: 'action', key: 'jackpot', label: 'PLACE THE JACKPOT SPOT' }, { kind: 'action', key: 'tw_gust', label: 'TWIST: GUST' }, { kind: 'action', key: 'tw_slick', label: 'TWIST: OIL SLICKS' },
    { kind: 'action', key: 'tw_eruption', label: 'TWIST: ERUPTION' }, { kind: 'action', key: 'tw_vent', label: 'TWIST: VENT PUFF' }, { kind: 'action', key: 'tw_overclock', label: 'TWIST: OVERCLOCK' }, { kind: 'action', key: 'tw_reboot', label: 'TWIST: REBOOT' }];
  if (tab === 'SCENES') return [
    ...all('court').map(c => ({ kind: 'action', key: 'court:' + c.id, label: 'COURT: ' + c.name })),
    { kind: 'action', key: 'scene:tour', label: 'TOUR MAP' }, { kind: 'action', key: 'scene:results', label: 'RESULTS' }, { kind: 'action', key: 'scene:credits', label: 'CREDITS' },
    { kind: 'action', key: 'scene:attract', label: 'ATTRACT MODE' }, { kind: 'action', key: 'scene:camp', label: 'BLAM CAMP' }, { kind: 'action', key: 'scene:about', label: 'ABOUT' }, { kind: 'action', key: 'scene:hall', label: 'HALL OF BLAM' }];
  if (tab === 'DEBUG') return [
    { kind: 'toggle', key: 'hitboxes', label: 'HITBOXES' }, { kind: 'toggle', key: 'intents', label: 'AI INTENTS' }, { kind: 'toggle', key: 'shotChance', label: 'SHOT CHANCE AT RELEASE' },
    { kind: 'toggle', key: 'events', label: 'EVENT LOG' }, { kind: 'toggle', key: 'state', label: 'STATE SNAPSHOT' }];
  if (tab === 'TIME') return [
    { kind: 'action', key: 'speed:0.1', label: 'SPEED 0.1' }, { kind: 'action', key: 'speed:0.25', label: 'SPEED 0.25' }, { kind: 'action', key: 'speed:0.5', label: 'SPEED 0.5' },
    { kind: 'action', key: 'speed:1', label: 'SPEED 1' }, { kind: 'action', key: 'speed:2', label: 'SPEED 2' }, { kind: 'toggle', key: 'freeze', label: 'FREEZE' }, { kind: 'action', key: 'step', label: 'STEP ONE FRAME' }, { kind: 'toggle', key: 'slowDunks', label: 'SLOW MOTION ON DUNKS' }];
  return [
    { kind: 'action', key: 'cam:broadcast', label: 'CAMERA: BROADCAST' }, { kind: 'action', key: 'cam:high', label: 'CAMERA: HIGH' }, { kind: 'action', key: 'cam:free', label: 'FREE CAMERA' }, { kind: 'action', key: 'cam:reset', label: 'RESET CAMERA' }];
};
const devSet = (key, dir) => { const t = TUNING[key]; if (!t) return; setTune(key, t.v + dir * t.step); };
/** every row's action (cheats, match, scenes, time, camera): the dev panel's buttons */
const devAct = key => {
  const m = S.match, c = S.cheats;
  if (key.startsWith('court:')) { S.setup = S.setup || {}; S.setup.court = key.slice(6); return game.go('court', { court: key.slice(6), humans: [{ slot: 0, input: game.input }] }, { fade: .2 }); }
  if (key.startsWith('scene:')) return game.go(key.slice(6), null, { fade: .2 });
  if (key.startsWith('speed:')) { game.timeScale = +key.slice(6); return; }
  if (key.startsWith('cam:')) { const v = key.slice(4); if (v === 'high') game.setView('threequarter'); else if (v === 'broadcast') game.setView(BROADCAST); else if (v === 'reset') game.resetCamera(); return; }
  if (key.startsWith('pu_')) return spawnPowerupNamed({ rocket: 'rocket', glue: 'glue', laser: 'laser', moon: 'moon', bomb: 'bomb', gold: 'gold' }[key.slice(3)]);
  if (key.startsWith('tw_')) return forceTwist({ gust: 'wind', slick: 'slick', eruption: 'eruption' }[key.slice(3)] || key.slice(3));
  switch (key) {
    case 'homePlus': if (m) m.score[0] += 2; return; case 'awayPlus': if (m) m.score[1] += 2; return;
    case 'quarterNext': if (m) { m.clock = 0; m.shotsInFlight = 0; } return;
    case 'clockTo': if (m) m.clock = 10; return; case 'shotClockReset': if (m) m.shotClock = tune('shotClock'); return;
    case 'giveBall': { const p = S.players[0]; if (p) takeBall(p, 'catch'); return; }
    case 'endGame': if (m) endGame(m.score[0] >= m.score[1] ? HOME : AWAY); return;
    case 'novaP1': { const p = S.players[0]; if (p) igniteNova(p); return; }
    case 'shatterNext': S.shatterNext = true; return;
    case 'jackpot': S.twist.jackpot = { x: CENTRE().x + 60, y: CENTRE().y, t: 0 }; return;
    case 'tw_reboot': S.twist.reboot = 1; return;
    case 'unlockAll': S.progress.unlocked = { bots: true, allstars: true, bigHeads: true }; S.progress.hall = S.progress.hall || []; saveProgress(); return;
    case 'resetSave': if (S.devResetAsked) { S.progress = PROGRESS_DEFAULT(); saveProgress(); S.devResetAsked = false; } else S.devResetAsked = true; return;
    case 'step': if (game.paused || game.timeScale === 0) game.advance(1 / 120); return;
  }
};
const devToggle = key => { S.devFlags = S.devFlags || {}; S.devFlags[key] = !S.devFlags[key]; if (S.cheats) S.cheats[key] = S.devFlags[key]; if (key === 'freeze') game.timeScale = S.devFlags.freeze ? 0 : 1; return S.devFlags[key]; };
/** the dev panel's controller: while it has the focus the human players are CPU brains (the match keeps going) */
const devOpen = () => { S.dev.open = true; S.dev.row = 0; S.dev.tab = 0; S.devSwap = S.players.filter(p => p.human).map(p => { const id = p.slot; p.human = false; p.brain = p.brain || newBrain(p, 0); return id; }); };
const devClose = () => { S.dev.open = false; for (const slot of S.devSwap || []) { const p = S.players[slot]; if (p) { p.human = true; p.brain = null; } } S.devSwap = []; saveTuning(); };
/** the dev panel's frame: navigation (tabs with L1/R1 or Q/E, rows with arrows and the wheel), a slider's change, the buttons */
const devStep = dt => {
  const d = S.dev; if (!d.open) return;
  if (game.input.pressed('cancel') || game.input.pressed('pause')) { devClose(); return; }
  if (game.input.pressed('start')) { devClose(); return; }
  const rows = devRows(); d.row = clamp(d.row, 0, rows.length - 1);
  if (game.input.pressed('down')) d.row = (d.row + 1) % rows.length;
  if (game.input.pressed('up')) d.row = (d.row + rows.length - 1) % rows.length;
  if (game.input.pressed('right') || game.input.pressed('left')) {
    const dir = game.input.pressed('right') ? 1 : -1, r0 = rows[d.row];
    if (r0.kind === 'slider') devSet(r0.key, dir);
  }
  if (game.input.pressed('confirm')) { const r0 = rows[d.row]; if (r0.kind === 'toggle') devToggle(r0.key); else if (r0.kind === 'action') devAct(r0.key); }
  if (game.input.pressed('pause') === false && game.input.pressed('start') === false) { /* (nothing) */ }
  if (game.input.pressed('shoulderRight') || game.input.pressed('taunt')) { d.tab = (d.tab + 1) % DEV_TABS.length; d.row = 0; }
};
/** the panel's drawing: the tab strip, the rows (sliders with value, default and help), the dot for a changed value */
const devDraw = (r) => {
  if (!S.dev.open) return;
  const d = S.dev, rows = devRows(), x = r.W * .66, w = r.W * .33;
  r.overlay(g => {
    panel(g, x, 0, w, r.H, { border: C.accent, alpha: .95 });
    E.font.text(g, 'DEV MODE', x + 10, 8, C.gold, { scale: 2, outline: false, shadow: '#000' });
    DEV_TABS.forEach((t, i) => E.font.text(g, t, x + 10 + i * (w / DEV_TABS.length) * 0.9, 34, i === d.tab ? C.ink : C.muted, { scale: 1, outline: false, font: 'tiny' }));
    const first = Math.max(0, d.row - 6), shown = rows.slice(first, first + 14);
    shown.forEach((row, i) => {
      const y = 56 + i * 24, focus = first + i === d.row;
      if (focus) E.ui.box(g, x + 4, y - 4, w - 8, 20, { bg: ['#4a1040', '#2a0a2a'], gradient: false, alpha: .9 });
      const label = row.label || row.key;
      E.font.text(g, label.length > 26 ? label.slice(0, 26) : label, x + 10, y, focus ? C.ink : '#d8cfee', { scale: 1, outline: false, shadow: '#000' });
      if (row.kind === 'slider') { const t = TUNING[row.key]; E.font.text(g, t.v.toFixed(2).replace(/\.?0+$/, '') + (t.v !== t.def ? ' •' : ''), x + w - 12, y, t.v !== t.def ? C.gold : C.muted, { align: 'right', scale: 1, outline: false }); }
      if (row.kind === 'toggle') E.font.text(g, S.devFlags && S.devFlags[row.key] ? 'ON' : 'OFF', x + w - 12, y, C.cyan, { align: 'right', scale: 1, outline: false });
    });
    const focus = rows[d.row];
    if (focus && focus.kind === 'slider') E.font.text(g, TUNING[focus.key].help + ' · default ' + TUNING[focus.key].def, x + 10, r.H - 60, C.cyan, { scale: 1, outline: false, shadow: '#000', wrap: w - 20 });
    E.font.text(g, 'RESET ALL: CONFIRM ON ROW · ◄ ► CHANGE · ESC CLOSE', x + 10, r.H - 30, C.muted, { scale: 1, outline: false });
  });
};
/** the pause items for a match: How to Play, Restart (matches), Dev Mode (not in a hub session) */
const pauseItems = () => {
  const inMatch = game.sceneName === 'court';
  const items = [['How to Play', () => game.go('howto', { from: 'pause' }, { fade: .2 })]];
  if (inMatch) items.push(['Restart Game', () => game.go('court', { court: S.court, humans: [{ slot: 0, input: game.input }], qLen: S.match ? S.match.qLen : 120 }, { fade: .2 })]);
  if (inMatch && !HUB) items.push(['Dev Mode', () => { game.resume(); devOpen(); }]);
  return items;
};
/** the dev panel's reset: every tuning value back to its default; the save as my defaults; the copy as JSON */
const devResetAll = () => { resetTuning(); saveTuning(); };

/* ---- 50-hub.js ---- */
/* ---- AI HUB (plan §15; the protocol is vendor/hub-harness/README.md): HUB SHOWDOWN, a shared world. The host's copy runs the
 * match with every human slot fed from the network; the other copies send their player's input (15 a second, unreliable)
 * and render the host's snapshots (15 a second, under 1.1 KB) with the host's events replayed once each. Outside a session
 * (HUB false, or connect() gives null) none of this runs and the game is the standalone game. ---- */
const HUB_SEATS = [0, 2, 1, 3];                   // seat i plays the slot HUB_SEATS maps: seats 0 and 2 HOME, 1 and 3 AWAY
const seatSlot = seat => HUB_SEATS[seat] !== undefined ? [0, 2, 1, 3][seat] : -1;
const HUB_PHASE = { tipoff: 0, live: 1, dead: 2, inbound: 3, break: 4, over: 5 }, HUB_PHASE_R = ['tipoff', 'live', 'dead', 'inbound', 'break', 'over'];
const HUB_STATE = { run: 0, gather: 1, jump: 2, dunk: 3, knocked: 4, steal: 5, shove: 6, spin: 7 }, HUB_STATE_R = ['run', 'gather', 'jump', 'dunk', 'knocked', 'steal', 'shove', 'spin'];
const HUB_BALL = { held: 0, dribble: 1, pass: 2, shot: 3, loose: 4, dead: 5, inbound: 6 }, HUB_BALL_R = ['held', 'dribble', 'pass', 'shot', 'loose', 'dead', 'inbound'];
S.net = { role: null, seat: -1, slotOf: {}, inputs: {}, lastSnap: null, snapN: 0, sentAt: 0, evId: 0, evSent: 0, lastRecv: -1, void: false, hostLeft: false, endReason: null, cardInfo: null, started: false, ready: false, finished: false, seq: 0 };

/** a network input: a remote player's buttons as the host reads them (the same surface as the engine's input, so the match
 * runs its one command path for every human) */
const netInput = seat => {
  const I = { move: () => (S.net.inputs[seat] || {}).m || [0, 0], held: {}, edge: {}, lastDevice: 'keyboard', pressed: {}, released: {}, seat, label: a => a };
  I.down = a => !!(S.net.inputs[seat] && S.net.inputs[seat].h && S.net.inputs[seat].h[a]);
  I.pressed = a => !!(S.net.inputs[seat] && S.net.inputs[seat].p && S.net.inputs[seat].p[a]);
  I.released = a => !!(S.net.inputs[seat] && S.net.inputs[seat].r && S.net.inputs[seat].r[a]);
  I.consume = a => { if (S.net.inputs[seat] && S.net.inputs[seat].p) S.net.inputs[seat].p[a] = false; };
  I.anyPressed = () => false;
  return I;
};
/** the host applies a client's message: its stick and held buttons, and each edge once (by id, in order) */
const netApply = (seat, msg) => {
  const st = S.net.inputs[seat] || (S.net.inputs[seat] = { m: [0, 0], h: {}, p: {}, r: {}, lastE: -1 });
  st.m = [msg.m[0] / 64, msg.m[1] / 64];
  st.h = {};
  const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
  for (let i = 0; i < names.length; i++) if (msg.h & (1 << i)) st.h[names[i]] = true;
  for (const [id, bit, down] of msg.e || []) {
    if (id <= st.lastE) continue;
    st.lastE = id;
    const a = names[bit]; if (!a) continue;
    if (down) { st.p[a] = true; st.h[a] = true; } else { st.r[a] = true; st.h[a] = false; }
  }
  st.stamp = S.match ? S.match.t : 0;
};
/** each step the host clears the one-step edges after the match has read them */
const netClearEdges = () => { for (const st of Object.values(S.net.inputs)) { st.p = {}; st.r = {}; } };

/** the snapshot: the match's numbers, the ball, every player, and the events of the last second (once each on the copies) */
const netSnapshot = () => {
  const m = S.match, b = S.ball;
  const g = [HUB_PHASE[m.phase] ?? 1, m.quarter, Math.round(m.clock * 10), Math.round(m.shotClock * 10), m.score[0], m.score[1], m.poss === null ? -1 : m.poss, (m.sudden ? 1 : 0) | (m.dead ? 2 : 0)];
  const bl = [Math.round(b.x), Math.round(b.y), Math.round(b.z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), b.owner ? b.owner.slot : -1, HUB_BALL[b.state] ?? 4];
  const p = S.players.map(q => [Math.round(q.body.x), Math.round(q.body.y), Math.round(q.body.z), Math.round(q.body.vx), Math.round(q.body.vy), Math.round(q.face * 100), HUB_STATE[q.state] ?? 0, Math.round(q.stateT * 100), Math.round(q.turbo * 100), (q.onCourt ? 1 : 0) | (q.hasBall ? 2 : 0) | (q.nova ? 4 : 0) | (q.knocked > 0 ? 8 : 0) | (q.human ? 16 : 0) | (q.dunk ? 32 : 0)]);
  const ev = S.events.filter(e => e.id > S.net.evSent && HUB_REPLAY.includes(e.type)).slice(-12).map(e => [e.id, e.type, e.slot ?? -1, e.side ?? -1, e.points || 0, e.dunk || '', e.blocked ? 1 : 0, e.three ? 1 : 0, e.victim ?? -1]);
  if (ev.length) S.net.evSent = ev[ev.length - 1][0];
  return { t: 's', n: ++S.net.snapN, a: +(AIHub.time() || 0).toFixed(3), g, b: bl, p, ev };
};
/** the events worth showing on the copies (captions, banners, sounds, the goal and the dunk) */
const HUB_REPLAY = ['basket', 'dunkStart', 'dunk', 'block', 'steal', 'shove', 'knockdown', 'shatter', 'supernovaOn', 'supernovaOff', 'goaltend', 'alleyoop', 'ankles', 'quarterEnd', 'halftime', 'overtime', 'gameEnd', 'tipoff', 'quarterStart', 'powerupPick', 'twist', 'reboot', 'spin', 'land'];
/** a copy applies a snapshot: the match's numbers and every body, then replays the events it has not played yet */
const netApplySnapshot = msg => {
  const g = msg.g, m = S.match; if (!m) return;
  m.phase = HUB_PHASE_R[g[0]] || 'live'; m.quarter = g[1]; m.clock = g[2] / 10; m.shotClock = g[3] / 10; m.score = [g[4], g[5]]; m.poss = g[6] < 0 ? null : g[6]; m.sudden = !!(g[7] & 1); m.dead = !!(g[7] & 2);
  const b = S.ball, bl = msg.b; b.x = bl[0]; b.y = bl[1]; b.z = bl[2]; b.vx = bl[3]; b.vy = bl[4]; b.vz = bl[5]; b.state = HUB_BALL_R[bl[7]] || 'loose';
  b.owner = bl[6] >= 0 ? S.players[bl[6]] : null;
  msg.p.forEach((q, i) => {
    const p = S.players[i]; if (!p) return;
    p.body.x = q[0]; p.body.y = q[1]; p.body.z = q[2]; p.body.vx = q[3]; p.body.vy = q[4]; p.face = q[5] / 100;
    p.state = HUB_STATE_R[q[6]] || 'run'; p.stateT = q[7] / 100; p.turbo = q[8] / 100;
    const f = q[9]; p.onCourt = !!(f & 1); p.hasBall = !!(f & 2); p.nova = !!(f & 4); p.knocked = (f & 8) ? 1 : 0; p.dunk = (f & 32) ? { net: true } : null;
    p.air = q[2] > 1; p.rig.update(1 / 30, rigState(p));
  });
  S.players.forEach((p, i) => { if (p.onCourt) p.rig.update(0, rigState(p)); });
  for (const e of msg.ev || []) {
    if (e[0] <= S.net.lastRecv) continue;
    S.net.lastRecv = e[0];
    const data = { slot: e[2] >= 0 ? e[2] : undefined, side: e[3] >= 0 ? e[3] : undefined, points: e[4], dunk: e[5] || null, blocked: !!e[6], three: !!e[7], victim: e[8] >= 0 ? e[8] : undefined };
    S.netReplay = true; try { emit(e[1], data); } finally { S.netReplay = false; }
  }
};

/** the roster of a session: two street crews from the seed (the same on every copy) with the HOME court */
const hubRoster = () => {
  const R = AIHub.rng('roster'), ok = all('team').filter(t => !t.locked && !t.secret);
  const a = ok[Math.floor(R() * ok.length)], rest = ok.filter(t => t.id !== a.id), b = rest[Math.floor(R() * rest.length)];
  return { home: a.id, away: b.id, court: a.court };
};
/** the host's round: the match with every seat's human; empty seats are CPU (Pro); the round's rules (§15.2) */
const hubBuild = (info) => {
  const r = hubRoster();
  S.setup = { home: r.home, away: r.away, court: r.court, qLen: 90, difficulty: 'Pro', powerups: true, twists: true, mode: 'hub' };
  const humans = [];
  info.players.forEach((pl, seat) => { const slot = seatSlot(seat); if (slot >= 0) humans.push({ slot, input: seat === S.net.seat ? game.input : netInput(seat), seat }); });
  S.hubHumans = humans;
  S.net.slotOf = {};
  for (const h of humans) S.net.slotOf[h.seat] = h.slot;
  game.allowJoin && game.allowJoin(false);
  S.cheats = {};
  setupMatch({ court: r.court, home: r.home, away: r.away, qLen: 90, humans: humans.map(h => ({ slot: h.slot, input: h.input })), powerups: true, twists: true, mode: 'hub' });
  S.hubReady = true;
  S.match.hubHalves = true;
};
/** the card's answers and the card's state (the hub's card reads them; the game's own card is the scene 'hubcard') */
S.hubCardInfo = null;
on('card', () => {});

/** the network's step (each frame): the host sends snapshots and reads inputs; a copy sends its input and applies the last
 * snapshot. Outside a session this never runs. */
const hubStep = dt => {
  if (!HUB || !S.net.role) return;
  const net = S.net;
  net.sendT = (net.sendT || 0) + dt;
  if (net.sendT >= 1 / 15) {
    net.sendT = 0;
    if (net.role === 'host' && S.hubReady && S.match && S.match.t > 0) AIHub.send(netSnapshot(), { reliable: false });
    if (net.role === 'client' && net.seat >= 0) {
      const I = game.input, mv = I.move();
      const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
      let h = 0; names.forEach((a, i) => { if (I.down(a)) h |= 1 << i; });
      const e = (net.edges || []);
      AIHub.send({ t: 'i', s: ++net.seq, a: +(AIHub.time() || 0).toFixed(3), m: [Math.round(mv[0] * 64), Math.round(mv[1] * 64)], h, e: e.slice(-8) }, { reliable: false });
      net.edges = [];
    }
  }
  if (net.role === 'client' && net.seat >= 0) {   /* the presses and releases since the last send, as edges (each id once) */
    const names = ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt'];
    names.forEach((a, i) => { if (game.input.pressed(a)) netEdge(i, true); if (game.input.released(a)) netEdge(i, false); });
  }
  if (net.role === 'host') netClearEdges();
};
/** a client's buttons pressed this step: the edges go out with the next input (each id once, in order) */
const netEdge = (bit, down) => { const net = S.net; net.edgeId = (net.edgeId || 0) + 1; (net.edges = net.edges || []).push([net.edgeId, bit, down ? 1 : 0]); };

/** the hub's messages: a host reads a client's input; a copy reads the host's snapshot */
const hubMessage = (data, from) => {
  if (!data || typeof data !== 'object') return;
  if (S.net.role === 'host' && data.t === 'i') {
    const seat = from;
    if (S.net.slotOf[seat] === undefined) return;
    if (data.s !== undefined && (S.net.inputs[seat] || {}).lastS >= data.s) return;
    netApply(seat, data); (S.net.inputs[seat] || {}).lastS = data.s;
  } else if (S.net.role === 'client' && data.t === 's') {
    if (data.n > (S.net.lastSnapN || 0)) { S.net.lastSnapN = data.n; S.net.lastSnap = data; S.net.lastSnapT = game.time; netApplySnapshot(data); }
  }
};

/** the result the host sends the hub: each team's humans, the scores and the box score (the hub's standings) */
const hubFinish = () => {
  if (S.net.finished) return; S.net.finished = true;
  const m = S.match, hs = [], as = [], scores = {}, stats = {};
  for (const [seat, slot] of Object.entries(S.net.slotOf)) { const p = S.players[slot]; if (!p) continue; scores[seat] = p.side === HOME ? m.score[0] : m.score[1]; stats[seat] = { PTS: p.stats.pts, DUNKS: p.stats.dunks, STL: p.stats.stl, BLK: p.stats.blk }; (p.side === HOME ? hs : as).push(+seat); }
  let standings;
  if (m.score[0] === m.score[1]) standings = [hs.concat(as)];
  else standings = m.score[0] > m.score[1] ? [hs, as] : [as, hs];
  const awards = Object.keys(stats).slice(0, 3).map((id, i) => ({ id: +id, title: ['Dunk of the Round', 'Pickpocket', 'Wall'][i], detail: '' }));
  if (HUB && AIHub.isHost) AIHub.finish({ standings, scores, won: m.score[0] !== m.score[1] ? undefined : undefined, stats, awards });
};
on('gameEnd', () => { if (S.net.role === 'host' && S.hubReady) hubFinish(); });

/* ---- 51-hubscene.js ---- */
/* ---- THE HUB'S ROUND (plan §15.2): the connect, our own card (the court at night, the crews lined up, the ready marks,
 * the countdown, how to win, this device's controls in its glyphs), the start on the hub's clock, the session overlay (no
 * pause: sound and voice volume and the button symbols), the end and the host-left void. ---- */
const hubConnect = async () => {
  if (!HUB) return null;
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  S.net.seat = info.me; S.net.info = info;
  S.net.role = info.server ? 'host' : (info.isHost ? 'host' : 'client');
  S.net.isServer = !!info.server;
  hubBuild(info);
  S.hubCard = { left: null, ready: [], asking: 0, asked: false, starting: false, paused: false };
  AIHub.ready();
  return info;
};
/** the hub's events: the card, the start, the leave, the time-up and the end; a copy's input and snapshots come in messages */
if (typeof AIHub !== 'undefined' && AIHub) {
  AIHub.on && AIHub.on('card', c => { S.hubCard = Object.assign(S.hubCard || {}, { left: c.left, ready: c.ready || [], asking: c.asking || 0, asked: !!c.asked, starting: !!c.starting, paused: !!c.paused }); });
  AIHub.on && AIHub.on('start', () => { S.net.started = true; if (game.sceneName === 'hubcard') game.go('court', { hub: true }, { fade: 0 }); });
  AIHub.on && AIHub.on('message', (d, from) => hubMessage(d, from));
  AIHub.on && AIHub.on('leave', m => { const slot = S.net.slotOf[m.id]; if (slot !== undefined && S.players[slot]) { const p = S.players[slot]; p.human = false; p.brain = newBrain(p, 0); } });
  AIHub.on && AIHub.on('time-up', () => { if (S.net.role === 'host') hubFinish(); });
  AIHub.on && AIHub.on('end', m => { S.net.endReason = m.reason; S.net.ended = true; if (m.reason === 'host-left' || m.reason === 'void') S.net.hostLeft = true; if (S.match) { S.match.over = true; S.match.phase = 'over'; } S.net.stopAt = game.time; });
}
/** the hub card: a scene of the game (its own card, §15.2) */
scenes.hubcard = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true,
  enter() { S.scene = 'hubcard'; playSong('title'); },
  update() {
    const k = S.hubCard || {};
    if (game.players.some(I => I && I.pressed('confirm')) && AIHub && AIHub.answer) AIHub.answer('ready');   // Enter, cross, a tap: ready
    if (game.players.some(I => I && I.pressed('card')) && AIHub && AIHub.answer) AIHub.answer('more');   // T or triangle: more time
  },
  draw(r) {
    const k = S.hubCard || {}, info = S.net.info || { players: [] }, cs = COURTS[S.court] || COURTS.skybox;
    r.sky(cs.sky);
    r.overlay(g => {
      screenTitle(g, 'HUB SHOWDOWN', 'SHARED WORLD · TWO HALVES OF 1:30 · NO CHEATS', r.W);
      E.font.text(g, (S.teams[0] ? S.teams[0].name : '') + '   VS   ' + (S.teams[1] ? S.teams[1].name : ''), r.W / 2, r.H * .3, C.ink, { align: 'center', scale: 2, outline: false, shadow: '#000' });
      E.font.text(g, 'HOW TO WIN: ' + ((S.hubGoal) || 'OUTSCORE THE OTHER CREW OVER TWO HALVES'), r.W / 2, r.H * .4, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' });
      info.players.forEach((pl, i) => { const col = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i] || C.ink; const ready = (k.ready || []).includes(i); E.font.text(g, (ready ? 'READY ' : '      ') + pl.name, r.W * .2 + (i % 2) * r.W * .3, r.H * .55 + Math.floor(i / 2) * 36, col, { scale: 2, outline: false, shadow: '#000' }); });
      if (k.left !== null && k.left !== undefined) E.font.text(g, k.paused ? 'PAUSED: SOMEONE WANTS MORE TIME' : 'STARTS IN ' + Math.ceil(k.left / 1000) + ' S', r.W / 2, r.H * .8, C.cyan, { align: 'center', scale: 2, outline: false, shadow: '#000' });
    });
    promptBar(r, [['{confirm}', 'READY'], ['{card}', 'MORE TIME']]);
  }
};
/** the session's countdown (3-2-1 from the hub's clock), drawn over the court until the time reaches zero */
const hubCountdown = r => {
  if (!HUB || !S.net.role) return;
  const t = AIHub.time ? AIHub.time() : 0;
  if (t < 0 && t > -3.5) { const n = Math.ceil(-t); r.overlay(g => E.font.title(g, String(n), r.W / 2, r.H * .4, { align: 'center', scale: 6, colors: ['#fffbe8', '#ffe08a'], depth: 4 })); }
};

/* the session overlay (§15.2): Esc or Options opens a small box over a round that does not stop the simulation: the sound
 * and voice volume, the button symbols and a close. No quit, restart or title. */
S.sessionOverlay = { open: false, list: null };
const sessionOverlayStep = () => {
  if (!HUB || !S.match) return;
  const o = S.sessionOverlay;
  if (!o.open && (game.input.pressed('pause') || game.input.pressed('cancel')) && !(game.input.down('card'))) { o.open = true; o.list = new FocusList([], { x: 0, y: 0, gap: 30, w: 360, onBack: () => { o.open = false; } }); return; }
  if (!o.open) return;
  const vol = () => Math.round((A.sfxVolume || 1) * 100);
  o.list.setItems([
    { label: 'SOUND ' + vol() + '%', on: () => { A.sfxVolume = ((A.sfxVolume || 1) * 100 - 25 + 0) / 100 < 0 ? 1 : ((A.sfxVolume || 1) * 100 + 25 > 100 ? 0 : (A.sfxVolume || 1) + .25); A.applyVolume && A.applyVolume(); } },
    { label: 'VOICE ' + Math.round((setting('voiceVol') ?? 1) * 100) + '%', on: () => { const v = Math.round(((setting('voiceVol') ?? 1) * 10 + 2.5) % 11) / 10; game.settings.set('voiceVol', v); } },
    { label: 'BUTTONS ' + padStyle().toUpperCase(), on: () => game.settings.set('buttons', setting('buttons') === 'Xbox' ? 'PlayStation' : 'Xbox') },
    { label: 'CLOSE', on: () => { o.open = false; } }
  ]);
  o.list.nav(0);
};
const sessionOverlayDraw = r => {
  const o = S.sessionOverlay; if (!HUB || !o.open || !o.list) return;
  r.overlay(g => { panel(g, r.W * .3, r.H * .3, r.W * .4, r.H * .32, { border: C.gold, alpha: .95 }); E.font.text(g, 'SESSION OPTIONS · THE ROUND GOES ON', r.W / 2, r.H * .33, C.gold, { align: 'center', scale: 1, outline: false, shadow: '#000' }); });
  o.list.draw(r, { x: r.W * .34, y: r.H * .39, gap: 36, w: r.W * .32, scale: 2 });
};

/* ---- 90-start.js ---- */
/* ---- START: the match scene (every mode of a match runs in it: exhibition, the tour, camp, the hub's round, the attract's
 * segments and the dev panel's jumps), the boot path (a hub's round opens straight into its card), the deep links and the
 * debug handle. The scene table is `scenes`, filled by the fragments above. ---- */
const courtCamera = { zoom: [.8, 1.4], start: 1 };
const courtDraw = r => { drawCourt(r, S.courtDef); hudDraw(r); if (S.camp) campDraw(r); hubCountdown(r); devDraw(r); };
scenes.court = {
  view: BROADCAST, input: KEYS, res: 'ps1', expand: true, pausable: !HUB, camera: courtCamera,   // the engine's standard pause (an HTML Shell), themed
  enter(d) {
    d = d || {};
    S.scene = 'court';
    if (!(HUB && S.hubReady)) {
      S.lastHumans = d.humans || [{ slot: 0, input: game.input }];
      if (d.cheats) S.cheats = Object.assign({}, d.cheats);
      else S.cheats = {};
      setupMatch({ court: d.court || 'skybox', home: d.home, away: d.away, humans: S.lastHumans, qLen: d.qLen || 120, powerups: d.powerups !== false, twists: d.twists !== false, mode: d.mode || 'exhibition', difficulty: d.difficulty });
      if (d.passive) for (const p of S.players) if (!p.human && p.side === AWAY) p.brain = null;
      if (d.tourStop !== undefined) S.setup.tourStop = d.tourStop;
      if (d.bigHeads) for (const p of S.players) p.rig.o.headR = (p.rig.o.headR || 1) * 1.9;   // §10.8: heads × 1.9 (the rig's own head size, kept)
      S.cameraView = setting('camera') === 'High' ? 'threequarter' : BROADCAST;
      if (game.view !== S.cameraView) game.setView(S.cameraView);
    }
    S.gameOver = false; S.resultsQueued = false; S.netReplay = false;
    L.enabled = true; L.ambient = (S.courtDef && S.courtDef.ambient) || .5;
  },
  update(dt) {
    if (S.net.ended) return;                                    // the hub's end: the match is frozen until the hub removes it
    if (HUB && S.net.role === 'client') { hubStep(dt); cameraStep(dt); matchFrame(dt); crowdSet(S.match ? (S.match.quarter >= 4 ? .8 : .4) : .3); return; }
    if (HUB && AIHub.time && AIHub.time() < 0) { cameraStep(dt); return; }   // the countdown before the tip
    if (S.dev && S.dev.open) devStep(dt);
    sessionOverlayStep();
    subUIStep();
    if (S.camp) campStep(dt);
    matchStep(dt); cameraStep(dt); matchFrame(dt);
    hubStep(dt);
    if (S.camp && S.camp.done && S.camp.doneT > 2) { S.camp = null; game.go('camp', null, { fade: .2 }); }
    crowdSet(S.match ? (S.match.score[0] + S.match.score[1] > 0 && Math.abs(S.match.score[0] - S.match.score[1]) < 6 ? .8 : .4) : .3);
    if (S.match && S.match.over && S.net.role === 'host' && S.hubReady) { /* the host's finish is sent by the game's end */ }
  },
  draw(r) { courtDraw(r); sessionOverlayDraw(r); }
};
game.debug = { snapshot: () => ({ scene: game.sceneName, phase: S.match && S.match.phase, clock: S.match && +S.match.clock.toFixed(2), shotClock: S.match && +S.match.shotClock.toFixed(2), score: S.match && S.match.score.slice(), quarter: S.match && S.match.quarter, over: S.match && S.match.over, ball: S.ball && { state: S.ball.state, x: +S.ball.x.toFixed(1), y: +S.ball.y.toFixed(1), z: +S.ball.z.toFixed(1), owner: S.ball.owner ? S.ball.owner.slot : null }, players: S.players.map(p => ({ slot: p.slot, id: p.id, side: p.side, human: p.human, x: +p.body.x.toFixed(1), y: +p.body.y.toFixed(1), z: +p.body.z.toFixed(1), state: p.state, turbo: +p.turbo.toFixed(2), juice: +p.juice.toFixed(2), nova: p.nova, hasBall: p.hasBall, source: p.human ? 'human' : (p.brain ? 'cpu' : 'none') })), lastEvents: S.events.slice(-10).map(e => e.type), ui: { screen: game.sceneName }, attract: { segment: S.attract ? S.attract.seg : null }, net: { role: S.net.role, seat: S.net.seat }, tour: S.progress && S.progress.tour ? { stop: S.progress.tour.stop, won: S.progress.tour.won.slice() } : null }) };
/* deep links: #<scene>[/<arg>] jumps into a scene (the menus reach the same ones); #court/<court> starts a match */
const deepLink = (() => { const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, ''); const [a, b] = h.split('/'); return { a: a || '', b: b || '' }; })();
if (typeof document !== 'undefined' && document.head) { const st = document.createElement('style'); st.id = 'zf-shell-theme'; st.textContent = `html .esh{--ink:#fff7ec;--paper:#140c24;--accent:#ff3ca6;--muted:#9a8fb8;--line:#3a2a5a;--danger:#ff5a3a;--font:700 1rem/1.35 "Trebuchet MS",system-ui,sans-serif;--title:900 1.6rem/1 Impact,"Arial Black",system-ui}html .esh{font-size:clamp(18px,2.6vh,42px)}`; document.head.appendChild(st); }   // the pause menu and the settings in the game's own colours (the engine's Shell, themed)
if (typeof addEventListener === 'function') addEventListener('keydown', () => { S.everKey = true; });   // a key lifts the touch-only notice (§11.7)
const bootScene = HUB ? 'hubcard' : (deepLink.a && scenes[deepLink.a] ? deepLink.a : 'title');
const bootData = deepLink.a === 'court' ? { court: deepLink.b || 'skybox' } : undefined;
game.start({ scenes, scene: bootScene, data: bootData });
window.__bb = { S, game, TUNING, tune, RIMW, shotPoints, goaltendCheck, emit, on, debug: game.debug, phys: { newBall, ballPlace, ballStep, ballRelease, ballFlight, ballSubstep, RIMW, OX, OY }, setupMatch, matchStep, hubConnect, COURTS, SETUP, startMatchFromSetup, resultsData, tourResult, playBeat, BEATS, PREGAME, ATTRACT_SEGMENTS, REG, all, get, LINE_BANKS, SFX, SONGS, STINGS, POWERUPS, DUNKS, CAMP_LESSONS, GAME_SETTINGS, VOICE_PROFILES, lineFor, voicePlan, TUNING_GROUPS, KEYS, ACTION_NAMES, glyphOf: (a, dev, style) => promptTokens('{' + a + '}', { lastDevice: dev }), padGlyph, keyLabel, navDir, anyPressed, dsp, BROADCAST, TOUR_STOPS, CAPTAIN, SPEAKERS, fillLine, rosterOf, startExhibition, goTourNew, tourStartStop, campStep, startCampLesson, forceTwist, devRows, devAct, devToggle, devOpen, devClose, devStep, pauseItems, attractStart, twistStart, twistStep, powerupStep, overclockOn, ventLaunch, startDunk, pickDunk, shotChance, releaseShot, setSettingFor: (k, v) => game.settings.set(k, v), checkTouchOnly, hubRoster, netSnapshot, netApplySnapshot, netApply, hubMessage, hubStep, S2: S };
if (HUB) hubConnect().catch(e => game.fail('hub', e));

window.__bb && (window.__bb.I = { E, PI, HUB, TILE, RIM, RIM_R, WALL_OUT, WORLD_W, KEYS, ACTION_NAMES, scenes, S, LISTENERS, on, emit, REG, def, get, all, PROGRESS_DEFAULT, loadProgress, saveProgress, GAME_SETTINGS, COMMENTARY_LEVEL, setting, dsp, BROADCAST, game, P, TUNING_GROUPS, TUNING, tune, setTune, resetTuning, saveTuning, loadTuning, RATING_KEYS, ratingsOf, RIG, playerDef, teamDef, rosterOf, LOGO_SNEAKER, logoAt, rgbOf, COURT_FLOOR, COURTS, courtDef, TOUR_STOPS, TOUR_SHIFT, CAPTAIN, PREGAME, BEATS, fillLine, SPEAKERS, charRig, playerRig, captainOf, LINE_BANKS, lineFor, PU_ICON, PU_SPR, POWERUPS, PU_LINE, SONG_TITLE, SONGS, STINGS, playSong, playSting, layerOn, SFX, sfxPlay, VOWEL_F, VOICE_PROFILES, voicePlan, voiceSay, voiceLetter, crowdAmb, crowdStart, crowdSet, ARENA_COLS, COURT_X0, PLAY_X, TIER_H, arenaRows, lineAt, paintCourt, floorPainter, buildArena, HOOP_ANG, HOOP_STATE, rimPoint, stepHoops, pushHoopNet, glassPt, drawRimHalf, drawHoopNet, drawHoop, BALL_SPR, ballSprite, buildCrowd, crowdSpr, crowdSprite, drawCrowd, drawCourt, TWIST_OF, twistOf, twistsOn, twistStart, twistStep, overclockOn, bootKnock, ventAt, ventLaunch, jackpotHit, powerupStep, RIMW, BOARD_PLANE, BOARD_YR, newBall, ballWind, ballPlace, ballSubstep, ballStep, ballFlight, ballRelease, ballSettled, SLOTS, HOME, emptyCmd, dressRig, makePlayer, placePlayer, playerSpeed, juiceFactor, rate, clampToArena, turboStep, powerTick, knockDown, POSE_TARGET, poseLayer, DUNK_KEYS, dunkPoseAt, clipOfPlayer, MOVE_TARGET, poseTargetOf, ballAtHand, ATTACK, attackRim, defendRim, ballReach, rimDist, baseChance, contestOf, shotChance, shotPoints, releaseShot, comebackOf, passBall, teammateOf, takeBall, releaseLoose, shotOver, reachBall, CLIP_CELEBRATE, sampleClip, CLIP_ACTION, CLIP_TAUNT, dunkBodyClip, DIFF, diffOf, gauss, newBrain, nearestOpp, openness, handlerDecide, offSpot, defSpot, brainCmd, brainDefend, INBOUND_WAIT, CENTRE, newMatch, clockRuns, newPossession, deadBall, inboundUnder, nearSideline, throwerOf, startInbound, tipOff, finishTip, startQuarter, onGoal, endGame, quarterEnd, matchRules, subOptions, subCandidate, doSub, sideHasHuman, subsAtBreak, subUIStep, cameraStep, nameOf, spark, glint, ringFx, teamOf, matchFrame, resultsData, HIP, humanCmd, startShot, shotStep, playerStep, rigState, ballAttach, matchStep, igniteNova, endNova, novaStep, startersOf, setupMatch, DUNKS, dunkRangeOf, pickDunk, layupChance, startDunk, dunkStep, alleyOop, stealAttempt, takeStolen, shoveAttempt, spinMove, blockAttempt, goaltendCheck, shatterChanceOf, maybeShatter, actionsFromCmd, C, anyPressed, anyDown, anyConsume, lastInput, device, padStyle, navDir, sfxOnce, GLYPH, drawGlyph, padGlyph, keyLabel, promptTokens, ICON_GLYPHS, promptLine, promptWidth, ratingPips, portraitOf, panel, screenTitle, promptBar, MENU_PROMPT, BANNER_PRIO, BANNER_COLOR, banner, caption, hudScore, hudCaption, hudBanner, hudWorld, hudBreak, HALFTIME_GAGS, hudSponsor, SPONSOR_LINES, hudDraw, hudStep, SETUP, screenIdle, touchOnlyNow, checkTouchOnly, COMIC_STAR, menuItems, menuPreview, joinState, goExhibition, unlockedTeams, RULE_ROWS, cycleSetting, startExhibition, CODES, codeEntered, startMatchFromSetup, ABOUT_PAGES, TOUR_SCORE_OF, tourNow, tourSave, goTourNew, goTourContinue, tourAfterLineup, playBeat, beatTeam, TOUR_MAP_ITEMS, tourStartStop, tourResult, tourNextAfterWin, tourEnding, tourRematch, tourQuit, hallEntry, tourQuitHall, CAMP_LESSONS, campDone, campCount, campCountReset, campGoalNow, startCampLesson, campFinishLesson, campStep, campDraw, ATTRACT_SEGMENTS, attractAct, attractStart, attractCard, forceTwist, spawnPowerupNamed, DEV_TABS, devRows, devSet, devAct, devToggle, devOpen, devClose, devStep, devDraw, pauseItems, devResetAll, HUB_SEATS, seatSlot, HUB_PHASE, HUB_STATE, HUB_BALL, netInput, netApply, netClearEdges, netSnapshot, HUB_REPLAY, netApplySnapshot, hubRoster, hubBuild, hubStep, netEdge, hubMessage, hubFinish, hubConnect, hubCountdown, sessionOverlayStep, sessionOverlayDraw, courtCamera, courtDraw, deepLink, bootScene, bootData });
})();
