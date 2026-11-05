(() => {
'use strict';
// ---- 00-core.js ----
// CRICKET KERFUFFLE: an over-the-top arcade cricket game on my-3D2dge. Every source file in src/ is concatenated in
// name order into one IIFE by tools/build.mjs. This file: shared helpers, units, the TUNING registry (live dev sliders),
// seeded random streams, the event bus and the saved profile.
const E = My3D2dge, { px, clamp, lerp } = E;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const HUB = (typeof AIHub !== 'undefined' && AIHub.active) ? AIHub : null;
const HEADLESS = typeof document === 'undefined';
const sgn = v => v < 0 ? -1 : 1;
const hyp = Math.hypot;
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const pick = (arr, R) => arr[Math.floor((R ? R() : Math.random()) * arr.length) % arr.length];
const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] !== undefined ? v[k] : m));
const upper = s => String(s).toUpperCase();

// ---- units and geometry (pitch frame: x across, 0 = middle stump line; y along the pitch: striker's stumps y 0,
// bowler's stumps y 320; z up; 16 units = 1 m). OX, OY place the pitch frame in the TileMap's world.
const OX = 1104, OY = 760;
const PITCH = { len: 320, crease: 20, bCrease: 300, halfW: 24, retX: 21 };
const STUMPS = { hw: 3.6, h: 12.5 };
const BALL_R = .6;

// ---- TUNING: the live gameplay variables (dev mode sliders). T(k) reads it with the difficulty multiplier applied;
// systems read T() at each use and never cache it.
const TUNE_DEFS = [
  ['ballSpeed', 'Ball speed scale', .62, .35, 1, .01], ['gravity', 'Gravity (u/s2)', 160, 100, 300, 5],
  ['pitchBounce', 'Pitch bounce', .55, .3, .8, .01], ['swing', 'Swing ×', 1, 0, 3, .05], ['spin', 'Spin turn ×', 1, 0, 3, .05],
  ['seam', 'Seam spread (deg)', 2.5, 0, 8, .1], ['perfectMs', 'Perfect window +/- ms', 40, 10, 120, 1], ['goodMs', 'Good window +/- ms', 85, 30, 200, 1],
  ['okMs', 'Mistime window +/- ms', 150, 60, 300, 1], ['batPower', 'Ground shot power ×', 1, .5, 2, .05], ['loftPower', 'Lofted power ×', 1, .5, 2, .05],
  ['edge', 'Edge zone ×', 1, 0, 3, .05], ['runSpeed', 'Batter run speed', 120, 70, 200, 1], ['fieldSpeed', 'Fielder speed', 105, 60, 180, 1],
  ['throwSpeed', 'Throw speed', 420, 250, 700, 5], ['throwError', 'Throw error', 6, 0, 30, .5], ['catchRing', 'Catch ring time (s)', .9, .3, 2, .05],
  ['catchWindow', 'Catch window +/- ms', 110, 30, 300, 5], ['aiBatSkill', 'CPU timing error (ms)', 55, 5, 200, 1], ['aiAggression', 'CPU aggression', .5, 0, 1, .05],
  ['aiBowlAccuracy', 'CPU bowling scatter', 10, 0, 40, .5], ['meterSpeed', 'Bowling meter speed (Hz)', 1.4, .5, 3, .05], ['meterSweet', 'Meter sweet zone', .18, .05, .5, .01],
  ['hypeGain', 'Hype gain ×', 1, 0, 4, .1], ['fireStreak', 'ON FIRE streak', 3, 2, 6, 1], ['boundaryScale', 'Boundary size ×', 1, .6, 1.3, .01],
  ['chaosRate', 'Chaos rate ×', 1, 0, 3, .1], ['commentaryRate', 'Commentary rate ×', 1, 0, 2, .1], ['camPitch', 'Broadcast pitch (deg)', 14, 8, 30, 1],
  ['camScale', 'Broadcast scale', 1.4, 1, 2.4, .05], ['wideScale', 'Wide cam scale', .62, .4, 1.2, .02], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const TUNE = {}, TUNE_DEFAULT = {};
for (const [k, , d] of TUNE_DEFS) { TUNE[k] = d; TUNE_DEFAULT[k] = d; }
const DIFF = {
  village: { perfectMs: 1.5, goodMs: 1.4, okMs: 1.2, ballSpeed: .85, aiBatSkill: 1.6, aiBowlAccuracy: 1.5, catchWindow: 1.5, meterSweet: 1.4 },
  county: {},
  test: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8 },
  kerfuffle: { perfectMs: .75, goodMs: .8, ballSpeed: 1.1, aiBatSkill: .7, catchWindow: .8, chaosRate: 2 }
};
let difficulty = 'county';
const T = k => TUNE[k] * ((DIFF[difficulty] || {})[k] || 1);
const tuneChanged = () => TUNE_DEFS.filter(([k]) => Math.abs(TUNE[k] - TUNE_DEFAULT[k]) > 1e-9).map(([k]) => k);
function tuneSet(k, v) { const d = TUNE_DEFS.find(x => x[0] === k); if (!d) return; TUNE[k] = clamp(Math.round(v / d[5]) * d[5], d[3], d[4]); TUNE[k] = +TUNE[k].toFixed(4); saveTune(); }
function tuneReset(k) { if (k) TUNE[k] = TUNE_DEFAULT[k]; else for (const [kk] of TUNE_DEFS) TUNE[kk] = TUNE_DEFAULT[kk]; saveTune(); }
function saveTune() { if (!HUB) E.store.set('kerfuffle:dev', Object.assign({}, TUNE)); }
function loadTune() { if (HUB) return; const s = E.store.get('kerfuffle:dev', null); if (s && typeof s === 'object') for (const [k, , , mn, mx] of TUNE_DEFS) if (typeof s[k] === 'number' && isFinite(s[k])) TUNE[k] = clamp(s[k], mn, mx); }
loadTune();

// ---- seeded random streams: play (gameplay), cosmetic (crowd, particles, line choice)
const RNG = { play: E.rng(1), cosmetic: E.rng(2), seed: 1 };
function reseed(seed) { RNG.seed = seed >>> 0; RNG.play = E.rng(RNG.seed); RNG.cosmetic = E.rng((RNG.seed * 7919 + 13) >>> 0); }
const rp = () => RNG.play(), rc = () => RNG.cosmetic();
const gauss = R => { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

// ---- the event bus: the rules emit; commentary, crowd, HUD, camera, hype, coverage listen
const BUS = { subs: {}, log: [] };
function on(type, fn) { (BUS.subs[type] = BUS.subs[type] || []).push(fn); }
function emit(type, data = {}) {
  BUS.log.push({ type, t: +(game ? game.time : 0).toFixed(2), data: Object.keys(data).slice(0, 3).map(k => k + ':' + (typeof data[k] === 'object' ? '...' : data[k])).join(' ') });
  if (BUS.log.length > 200) BUS.log.shift();
  COVER[type] = (COVER[type] || 0) + 1;
  for (const fn of (BUS.subs[type] || [])) { try { fn(data); } catch (e) { if (game) game.fail('bus:' + type, e); } }
  for (const fn of (BUS.subs['*'] || [])) { try { fn(type, data); } catch (e) { if (game) game.fail('bus:*', e); } }
}
// coverage: every feature marks itself here as it happens (tests and the attract mode assert on it)
const COVER = {};
const cover = k => { COVER[k] = (COVER[k] || 0) + 1; };

// ---- the saved profile: story progress (game.saves' autosave), unlocks, stats, lessons seen
const PROFILE_VER = 2;
const newProfile = () => ({ v: PROFILE_VER, unlocked: ['ker', 'mud'], stats: { sixes: 0, fours: 0, wickets: 0, fastest: 0, matches: 0 }, lessons: [], story: { chapter: 1, stars: {}, best: {}, done: false } });
let profile = newProfile();
function loadProfile() {
  if (HUB) { profile = newProfile(); return; }
  const p = E.store.get('kerfuffle:profile', null);
  if (p && typeof p === 'object' && p.v === PROFILE_VER && p.story && p.stats) profile = Object.assign(newProfile(), p);
  else if (p && typeof p === 'object' && p.story) { profile = Object.assign(newProfile(), { story: p.story }); }   // migrate an older save
  else profile = newProfile();
}
function saveProfile() { if (!HUB) E.store.set('kerfuffle:profile', profile); }
loadProfile();
let game = null;   // set in 99-start.js

// ---- 10-data.js ----
// ---- content as data, keyed by id: teams and players, grounds, deliveries, shots, specials, items, targets, chaos
// events, story chapters, commentary lines. Systems look things up by id; DESIGN-NOTES.md says how to add each kind.

// deliveries (8.4): km/h range, swing (+ away from a right-hander), seam, turn (degrees, + away from a right-hander),
// bounce and dip multipliers, the length band the AI aims at
const DELIVERIES = {
  express: { name: 'Express', fam: 'pace', kmh: [138, 148], swing: .1, seam: 1, turn: 0, bounce: 1, len: [70, 120] },
  bouncer: { name: 'Bouncer', fam: 'pace', kmh: [135, 145], swing: 0, seam: 1, turn: 0, bounce: 1.15, len: [140, 175] },
  yorker: { name: 'Yorker', fam: 'pace', kmh: [136, 146], swing: .15, seam: .5, turn: 0, bounce: .9, len: [8, 24] },
  slower: { name: 'Slower ball', fam: 'pace', kmh: [105, 115], swing: 0, seam: 1.2, turn: 0, bounce: .95, len: [50, 100], hideSpeed: true },
  outswing: { name: 'Outswinger', fam: 'swing', kmh: [125, 135], swing: 1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  inswing: { name: 'Inswinger', fam: 'swing', kmh: [125, 135], swing: -1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  wobble: { name: 'Wobble seam', fam: 'swing', kmh: [120, 130], swing: 0, wob: .3, seam: 3, turn: 0, bounce: 1, len: [60, 110] },
  dobber: { name: 'Dobber', fam: 'medium', kmh: [100, 110], swing: .1, seam: 1.5, turn: 0, bounce: .95, len: [60, 110] },
  cutter: { name: 'Cutter', fam: 'medium', kmh: [105, 115], swing: 0, seam: 1, turn: 3, bounce: .95, len: [60, 110] },
  knuckle: { name: 'Knuckle ball', fam: 'medium', kmh: [95, 105], swing: 0, wob: .5, seam: .5, turn: 0, bounce: .9, len: [40, 90] },
  legbreak: { name: 'Leg break', fam: 'spin', kmh: [78, 88], swing: -.3, seam: .3, turn: 9, bounce: 1.05, len: [50, 100] },
  googly: { name: 'Googly', fam: 'spin', kmh: [76, 86], swing: .2, seam: .3, turn: -8, bounce: 1.05, len: [50, 100] },
  topspin: { name: 'Topspinner', fam: 'spin', kmh: [80, 90], swing: 0, seam: .3, turn: 0, bounce: 1.2, len: [60, 110] },
  offbreak: { name: 'Off break', fam: 'spin', kmh: [80, 90], swing: .3, seam: .3, turn: -8, bounce: 1, len: [50, 100] },
  armball: { name: 'Arm ball', fam: 'spin', kmh: [88, 96], swing: .3, seam: .3, turn: 0, bounce: .95, len: [50, 100] },
  doosra: { name: 'Doosra', fam: 'spin', kmh: [78, 88], swing: 0, seam: .3, turn: 8, bounce: 1.05, len: [50, 100] },
  piston: { name: 'Piston Express', fam: 'machine', kmh: [160, 170], swing: 0, seam: .8, turn: 0, bounce: 1.05, len: [70, 120] },
  steamBouncer: { name: 'Steam Bouncer', fam: 'machine', kmh: [148, 152], swing: 0, seam: 1, turn: 0, bounce: 1.2, len: [145, 175] },
  spinCycle: { name: 'Spin Cycle', fam: 'machine', kmh: [94, 96], swing: 0, seam: 0, turn: 14, turnRand: true, bounce: 1.1, len: [50, 100] },
  banana: { name: 'Banana Swing', fam: 'machine', kmh: [128, 134], swing: 2.2, seam: .5, turn: 0, bounce: 1, len: [40, 80] }
};
const RUNUP = { pace: 2.0, swing: 1.7, medium: 1.5, spin: .9, machine: 1.2 };

// field presets (8.4.2): [position, angle from straight (+ off side), distance (b = boundary - 30)]
const FIELDS = {
  attacking: { name: 'Attacking', spots: [['slip', 165, 150], ['2nd slip', 158, 150], ['gully', 132, 150], ['point', 95, 230], ['cover', 58, 260], ['mid-off', 14, 300], ['mid-on', -14, 300], ['midwicket', -60, 240], ['fine leg', -162, 'b']] },
  balanced: { name: 'Balanced', spots: [['slip', 165, 150], ['point', 95, 240], ['cover', 55, 270], ['mid-off', 12, 320], ['mid-on', -12, 320], ['midwicket', -60, 270], ['square leg', -95, 250], ['fine leg', -160, 'b'], ['third man', 155, 'b']] },
  defensive: { name: 'Defensive', spots: [['point', 95, 250], ['deep cover', 55, 'b'], ['long-off', 12, 'b'], ['long-on', -12, 'b'], ['deep midwicket', -60, 'b'], ['deep square', -95, 'b'], ['fine leg', -160, 'b'], ['third man', 155, 'b'], ['cover', 40, 260]] },
  spin: { name: 'Spin attack', spots: [['slip', 160, 60], ['short leg', -100, 50], ['silly point', 100, 50], ['cover', 55, 240], ['mid-off', 12, 280], ['mid-on', -12, 280], ['midwicket', -60, 240], ['deep square', -95, 'b'], ['long-on', -15, 'b']] }
};
const FIELD_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];

// shots (8.5): button, lengths, sector (batter-frame degrees, + off side), the animation family, contactAt (s), launch
// (deg), speed (u/s), the zone (line: off-side offset from middle stump; z: height)
const SHOTS = [
  { id: 'straightDrive', name: 'Straight drive', b: 'shot', len: ['full', 'good'], sec: [-25, 25], fam: 'drive', at: .13, launch: 3, speed: 500, line: [-7, 9], z: [0, 15] },
  { id: 'coverDrive', name: 'Cover drive', b: 'shot', len: ['full'], sec: [25, 75], fam: 'drive', at: .13, launch: 4, speed: 510, line: [-4, 15], z: [0, 15] },
  { id: 'onDrive', name: 'On drive', b: 'shot', len: ['full', 'good'], sec: [-75, -25], fam: 'drive', at: .13, launch: 4, speed: 490, line: [-9, 7], z: [0, 15] },
  { id: 'flick', name: 'Flick off the pads', b: 'shot', len: ['full', 'good'], sec: [-130, -75], fam: 'flick', at: .12, launch: 6, speed: 460, line: [-11, 3], z: [0, 19] },
  { id: 'glance', name: 'Leg glance', b: 'shot', len: ['full', 'good', 'short'], sec: [-180, -130], fam: 'glance', at: .11, launch: 3, speed: 330, line: [-11, 1], z: [0, 22] },
  { id: 'punch', name: 'Back-foot punch', b: 'shot', len: ['good'], sec: [25, 75], fam: 'drive', at: .12, launch: 5, speed: 470, line: [-4, 15], z: [5, 23] },
  { id: 'pull', name: 'Pull', b: 'shot', len: ['short'], sec: [-130, -45], fam: 'pull', at: .12, launch: 8, speed: 520, line: [-7, 11], z: [12, 34] },
  { id: 'cut', name: 'Square cut', b: 'shot', len: ['short', 'good'], sec: [75, 125], fam: 'cut', at: .11, launch: 5, speed: 520, line: [4, 24], z: [5, 28] },
  { id: 'lateCut', name: 'Late cut', b: 'shot', len: ['full', 'good', 'short', 'yorker'], sec: [125, 180], fam: 'glance', at: .1, launch: 2, speed: 300, line: [3, 21], z: [2, 23] },
  { id: 'push', name: 'Push', b: 'shot', len: ['full', 'good', 'short', 'yorker'], sec: [-180, 180], fam: 'drive', at: .12, launch: 3, speed: 380, line: [-9, 13], z: [0, 25] },
  { id: 'loftStraight', name: 'Lofted straight hit', b: 'loft', len: ['full', 'good'], sec: [-30, 30], fam: 'loft', at: .14, launch: 36, speed: 360, line: [-7, 9], z: [0, 18] },
  { id: 'loftCover', name: 'Inside-out over cover', b: 'loft', len: ['full', 'good'], sec: [30, 85], fam: 'loft', at: .14, launch: 33, speed: 345, line: [-3, 17], z: [0, 18] },
  { id: 'slog', name: 'Slog sweep', b: 'loft', len: ['full', 'good', 'yorker'], sec: [-115, -30], fam: 'sweep', at: .15, launch: 35, speed: 360, line: [-11, 9], z: [0, 22] },
  { id: 'hook', name: 'Hook', b: 'loft', len: ['short'], sec: [-150, -45], fam: 'pull', at: .12, launch: 30, speed: 360, line: [-7, 11], z: [16, 40] },
  { id: 'upperCut', name: 'Upper cut', b: 'loft', len: ['short'], sec: [60, 140], fam: 'cut', at: .11, launch: 34, speed: 330, line: [3, 21], z: [16, 38] },
  { id: 'scoop', name: 'Scoop over the keeper', b: 'loft', len: ['full', 'good', 'yorker', 'short'], sec: [140, 180], sec2: [-180, -150], fam: 'scoop', at: .12, launch: 42, speed: 290, line: [-5, 7], z: [0, 22] },
  { id: 'helicopter', name: 'Helicopter shot', b: 'loft', len: ['yorker'], sec: [-40, 40], fam: 'heli', at: .12, launch: 38, speed: 370, line: [-5, 7], z: [0, 8] },
  { id: 'loftLeg', name: 'Lofted over midwicket', b: 'loft', len: ['full', 'good', 'short', 'yorker'], sec: [-180, 180], fam: 'loft', at: .14, launch: 32, speed: 335, line: [-9, 11], z: [0, 26] },
  { id: 'fwdDefence', name: 'Forward defence', b: 'block', len: ['full', 'good', 'yorker'], sec: [-180, 180], fam: 'block', at: .08, launch: 0, speed: 60, line: [-9, 13], z: [0, 21] },
  { id: 'backDefence', name: 'Back-foot defence', b: 'block', len: ['short'], sec: [-180, 180], fam: 'block', at: .08, launch: 0, speed: 50, line: [-9, 13], z: [7, 29] }
];
const SHOT = Object.fromEntries(SHOTS.map(s => [s.id, s]));
const lengthBand = d => d <= 24 ? 'yorker' : d <= 70 ? 'full' : d <= 130 ? 'good' : 'short';

// signature specials (8.6)
const SPECIALS = {
  kerfShot: { name: 'Kerfuffle Shot', kind: 'bat', text: 'A guaranteed PERFECT lofted hit, with a trail of fire' },
  kerfBall: { name: 'Kerfuffle Ball', kind: 'bowl', text: 'Green meter, +15% pace and double swing' },
  kettle: { name: 'Tea-Kettle Slog', kind: 'bat', text: 'PERFECT lofted hit, +25% distance, a steam whistle' },
  vicar: { name: "Vicar's Revenge", kind: 'bowl', text: 'A 155 km/h inswinging yorker with holy light' },
  grandad: { name: 'The Grandad', kind: 'bowl', text: 'A leg break that bounces three times' },
  stats: { name: 'Statistical Certainty', kind: 'bat', text: 'Shows the exact timing: GOOD guaranteed' },
  chirp: { name: 'The Chirp', kind: 'bowl', text: 'Flusters the batter: timing windows shrink' },
  longHandle: { name: 'The Long Handle', kind: 'bat', text: 'A lofted hit with power ×1.4' },
  dibbly: { name: 'Dibbly-Dobbly Doom', kind: 'bowl', text: 'An 80 km/h ball that wobbles in the air' },
  peregrine: { name: 'Peregrine Swoop', kind: 'bowl', text: 'Banana swing ×3, very late' },
  silverTray: { name: 'Silver Tray Save', kind: 'bowl', text: 'The next catch chance is guaranteed' },
  croquet: { name: 'The Croquet Drive', kind: 'bat', text: 'A ground shot no fielder can stop' },
  sunburn: { name: 'Sunburn Bouncer', kind: 'bowl', text: 'A 152 km/h bouncer in a heat haze' },
  bludgeon: { name: 'Boardwalk Bludgeon', kind: 'bat', text: 'A huge hit, +40% distance' },
  vanish: { name: 'Vanishing Ball', kind: 'bowl', text: 'Invisible for part of its flight' },
  sawn: { name: 'Sawn in Half', kind: 'bowl', text: 'A googly that saws the stumps in half' },
  lightning: { name: 'Lightning Stumping', kind: 'bowl', text: 'A spinner whose keeper stumps in a flash' },
  grudgeBall: { name: 'Grudge Ball', kind: 'bowl', text: 'An LBW-seeking yorker, full of resentment' },
  grudgeDrive: { name: 'Grudge Drive', kind: 'bat', text: 'A power drive straight back at the bowler' },
  triple: { name: 'Triple Threat', kind: 'bowl', text: 'Three balls released: only one is real' },
  ecto: { name: 'Ectoplasmic Edge', kind: 'bat', text: 'The ball passes through the first fielder' }
};

// items (8.7.1)
const ITEMS = {
  teapot: { name: 'Golden Teapot', side: 'bat', text: 'Next scoring shot: runs ×2', color: '#ffd23a' },
  horseshoe: { name: 'Lucky Horseshoe', side: 'bat', text: 'Next dismissal overturned', color: '#c8ccd8' },
  giantBat: { name: 'Giant Bat', side: 'bat', text: 'Bigger bat for 2 balls', color: '#e8d49a' },
  cake: { name: 'Cake Slice', side: 'any', text: 'Hype +40', color: '#ff8ad8' },
  sticky: { name: 'Sticky Gloves', side: 'bowl', text: 'Next catch guaranteed', color: '#8ad06a' },
  banana: { name: 'Banana Peel', side: 'bowl', text: 'Next run attempt: batters slip', color: '#ffe04a' },
  fogMachine: { name: 'Fog Machine', side: 'bowl', text: 'Next ball: the batter loses sight of it', color: '#a8b8c8' }
};
const BAT_ITEMS = ['teapot', 'horseshoe', 'giantBat', 'cake'], BOWL_ITEMS = ['sticky', 'banana', 'fogMachine', 'cake'];

// teams (8.2). Each player: bat (timing 1-10), pow, tech, bowl { del: [3 delivery ids], skill, fam }, fld, ctc, sp
// (special), look (rig options). Squads are filled to eleven from the name pool.
const TEAMS = [
  { id: 'ker', name: 'Kerfuffle CC', nick: 'The Teapots', code: 'KER', home: 'green', kit: { cloth: '#f2ead8', pants: '#efe6d2', trim: '#2f6b3a', cap: '#2f6b3a' }, chip: '#2f6b3a', strength: 6,
    pool: ['Hodge', 'Pemberton', 'Allsop', 'Twigg', 'Moss', 'Fairweather', 'Hobbs', 'Nettles'],
    stars: [
      { id: 'edie', name: 'Edie Pluckrose', short: 'PLUCKROSE', bat: 8, pow: 8, tech: 7, bowl: { del: ['express', 'bouncer', 'yorker'], skill: 8 }, fld: 7, ctc: 8, sp: 'kettle', bsp: 'vicar', voice: 240,
        look: { build: 'heroic', size: 1.2, hair: 'ponytail', colors: { hair: '#b0482a', skin: '#f2c8a0' } } },
      { id: 'dev', name: 'Dev Mistry', short: 'MISTRY', bat: 8, pow: 5, tech: 9, fld: 6, ctc: 6, sp: 'stats', voice: 170, look: { build: 'heroic', size: 1.18, hair: 'short', glasses: true, colors: { hair: '#1a1a22', skin: '#a8704a' } } },
      { id: 'pip', name: 'Pip Larkin', short: 'LARKIN', bat: 6, pow: 5, tech: 6, fld: 8, ctc: 9, keeper: true, sp: null, bsp: 'chirp', voice: 290, look: { build: 'chibi', size: 1.15, hair: 'spiky', colors: { hair: '#f0d060', skin: '#f2c8a0' } } },
      { id: 'basil', name: 'Basil Thwaite', short: 'THWAITE', bat: 3, pow: 3, tech: 5, bowl: { del: ['legbreak', 'googly', 'topspin'], skill: 9 }, fld: 3, ctc: 5, bsp: 'grandad', voice: 120, look: { build: 'chibi', size: 1.15, hair: 'bald', moustache: 'walrus', outfit: 'coat', colors: { coat: '#c8b48a', skin: '#e8b890', hair: '#d8d8d8' } } },
      { id: 'hodge', name: 'Ted Hodge', short: 'HODGE', bat: 5, pow: 6, tech: 5, bowl: { del: ['outswing', 'inswing', 'wobble'], skill: 7 }, fld: 6, ctc: 6, voice: 150, look: { build: 'heroic', size: 1.18, hair: 'short', colors: { hair: '#6a4a2a' } } }
    ] },
  { id: 'mud', name: 'Lower Muddleford Mutineers', nick: 'The Mutineers', code: 'MUD', home: 'green', kit: { cloth: '#6a4a2a', pants: '#5a3e24', trim: '#e07a2a', cap: '#e07a2a' }, chip: '#e07a2a', strength: 3,
    pool: ['Clod', 'Furrow', 'Bagshaw', 'Wurzel', 'Pratt', 'Muckle', 'Turnip', 'Haybale'],
    stars: [
      { id: 'gaz', name: 'Gaz Gristle', short: 'GRISTLE', bat: 5, pow: 9, tech: 3, fld: 4, ctc: 4, sp: 'longHandle', style: 'slogger', voice: 130, look: { build: 'bulky', size: 1.2, hair: 'bald', beard: true, colors: { skin: '#e8a882', facial: '#c8743a' } } },
      { id: 'terry', name: 'Big Terry Dunstable', short: 'DUNSTABLE', bat: 3, pow: 6, tech: 3, bowl: { del: ['dobber', 'cutter', 'knuckle'], skill: 6 }, fld: 3, ctc: 4, bsp: 'dibbly', voice: 110, look: { build: 'bulky', size: 1.22, hair: 'short', colors: { hair: '#3a2a1a' } } },
      { id: 'nan', name: 'Nan Gristle', short: 'N.GRISTLE', bat: 3, pow: 2, tech: 6, bowl: { del: ['offbreak', 'armball', 'topspin'], skill: 7 }, fld: 3, ctc: 6, voice: 230, look: { build: 'chibi', size: 1.1, hair: 'long', colors: { hair: '#e0e0e0' } } }
    ] },
  { id: 'gen', name: 'Gentlemen of Thrumpton', nick: 'The Gentlemen', code: 'GEN', home: 'hall', kit: { cloth: '#f4f4f0', pants: '#f0f0ea', trim: '#22305a', cap: '#d8b04a' }, chip: '#22305a', strength: 6,
    pool: ['Ffoulkes', 'Carstairs', 'Montague', 'St John-Smythe', 'Pargeter', 'Wimbourne', 'Ashby'],
    stars: [
      { id: 'peregrine', name: 'Hon. Peregrine Twistleton-Smythe', short: 'TWISTLETON', bat: 6, pow: 5, tech: 7, bowl: { del: ['outswing', 'inswing', 'express'], skill: 9 }, fld: 6, ctc: 6, bsp: 'peregrine', voice: 175, look: { build: 'heroic', size: 1.2, hair: 'short', moustache: 'handlebar', colors: { hair: '#d8b880' } } },
      { id: 'fortescue', name: 'Fortescue', short: 'FORTESCUE', bat: 4, pow: 3, tech: 6, bowl: { del: ['dobber', 'cutter', 'slower'], skill: 6 }, fld: 9, ctc: 10, bsp: 'silverTray', voice: 125, look: { build: 'heroic', size: 1.18, hair: 'bald', outfit: 'coat', colors: { coat: '#1a1a22', skin: '#e8c0a0' } } },
      { id: 'araminta', name: 'Lady Araminta Fitch', short: 'FITCH', bat: 9, pow: 6, tech: 8, fld: 6, ctc: 6, sp: 'croquet', voice: 250, look: { build: 'heroic', size: 1.16, hair: 'long', colors: { hair: '#2a1a12' } } }
    ] },
  { id: 'lar', name: 'Sunburnt Bay Larrikins', nick: 'The Larrikins', code: 'LAR', home: 'bay', kit: { cloth: '#1fb5a8', pants: '#ffd23a', trim: '#ffffff', cap: '#ffd23a' }, chip: '#1fb5a8', strength: 7,
    pool: ['Dunno', 'Bluey', 'Sandy', 'Robbo', 'Gazza', 'Davo', 'Stevo'],
    stars: [
      { id: 'shazza', name: 'Shazza Brannigan', short: 'BRANNIGAN', bat: 5, pow: 6, tech: 5, bowl: { del: ['express', 'bouncer', 'yorker'], skill: 9 }, fld: 7, ctc: 7, bsp: 'sunburn', voice: 245, look: { build: 'heroic', size: 1.2, hair: 'ponytail', colors: { hair: '#f8e080', skin: '#e8a070' } } },
      { id: 'kev', name: 'Kev "Thongs" Malone', short: 'MALONE', bat: 6, pow: 10, tech: 3, fld: 5, ctc: 5, sp: 'bludgeon', style: 'slogger', voice: 140, look: { build: 'bulky', size: 1.22, hair: 'spiky', colors: { hair: '#c89048', skin: '#e09060' } } },
      { id: 'wal', name: 'Big Wal', short: 'BIG WAL', bat: 5, pow: 7, tech: 4, fld: 7, ctc: 8, keeper: true, voice: 115, look: { build: 'bulky', size: 1.2, hair: 'short', colors: { hair: '#4a3020' } } }
    ] },
  { id: 'mag', name: 'Magic Circle XI', nick: 'The Conjurers', code: 'MAG', home: 'downs', kit: { cloth: '#5a2a7a', pants: '#3a1a52', trim: '#c8ccd8', cap: '#1a1a22' }, chip: '#5a2a7a', strength: 7,
    pool: ['Presto', 'Abra', 'Mystique', 'Prestidigitate', 'Sleight', 'Hocus', 'Pocus'],
    stars: [
      { id: 'spinaldo', name: 'The Great Spinaldo', short: 'SPINALDO', bat: 5, pow: 4, tech: 6, bowl: { del: ['legbreak', 'googly', 'doosra'], skill: 10 }, fld: 5, ctc: 6, bsp: 'vanish', voice: 135, look: { build: 'heroic', size: 1.22, hair: 'long', moustache: 'handlebar', hat: { style: 'pointed', color: '#1a1a22' }, cape: true, colors: { hair: '#1a1a22' } } },
      { id: 'zsazsa', name: 'Madame Zsa-Zsa Flick', short: 'FLICK', bat: 6, pow: 5, tech: 7, bowl: { del: ['googly', 'offbreak', 'armball'], skill: 8 }, fld: 6, ctc: 6, bsp: 'sawn', voice: 260, look: { build: 'heroic', size: 1.16, hair: 'long', colors: { hair: '#8a1a3a' } } },
      { id: 'houdini', name: 'Houdini Jnr', short: 'HOUDINI', bat: 6, pow: 5, tech: 6, fld: 8, ctc: 8, keeper: true, bsp: 'lightning', voice: 200, look: { build: 'chibi', size: 1.15, hair: 'spiky', colors: { hair: '#2a2a3a' } } }
    ] },
  { id: 'thr', name: "Thrumpton's Thunderbolts", nick: 'The Thunderbolts', code: 'THR', home: 'dome', kit: { cloth: '#1a1a22', pants: '#24242e', trim: '#7a3aff', cap: '#ffcf3a' }, chip: '#7a3aff', strength: 9,
    pool: ['Bartholomew', 'Silas', 'Ignatius', 'Obadiah', 'Cornelius', 'Ebenezer'], ghosts: true,
    stars: [
      { id: 'thrumpton', name: 'Lord Thrumpton-Vane', short: 'THRUMPTON', bat: 7, pow: 7, tech: 6, bowl: { del: ['inswing', 'yorker', 'slower'], skill: 7 }, fld: 4, ctc: 5, sp: 'grudgeDrive', bsp: 'grudgeBall', voice: 160, look: { build: 'bulky', size: 1.2, hair: 'short', moustache: 'handlebar', hat: { style: 'cap', color: '#6a5a3a' }, colors: { hair: '#8a8a8a', skin: '#f0c8b0' } } },
      { id: 'machine', name: 'The Thrumptonator 3000', short: 'THRUMPTONATOR', bat: 1, pow: 1, tech: 1, bowl: { del: ['piston', 'steamBouncer', 'spinCycle'], skill: 10 }, fld: 0, ctc: 0, machine: true, bsp: 'triple', voice: 90, look: { build: 'bulky' } },
      { id: 'grimble', name: 'Dr Ebenezer Grimble', short: 'GRIMBLE', bat: 8, pow: 7, tech: 8, fld: 7, ctc: 7, sp: 'ecto', ghost: true, voice: 100, look: { build: 'heroic', size: 1.2, hair: 'short', beard: true, colors: { hair: '#c8d8e8', skin: '#c8e0f0' } } }
    ] }
];
const TEAM = Object.fromEntries(TEAMS.map(t => [t.id, t]));
// a squad of eleven: the stars, then generated players from the pool (seeded by the team, so it is the same every time)
function squad(team) {
  if (team._squad) return team._squad;
  const R = E.rng(team.id.charCodeAt(0) * 131 + team.id.charCodeAt(2)), out = team.stars.map(p => Object.assign({ team: team.id, hand: 1 }, p));
  const fams = [['express', 'bouncer', 'yorker'], ['outswing', 'inswing', 'wobble'], ['dobber', 'cutter', 'knuckle'], ['offbreak', 'armball', 'topspin'], ['legbreak', 'googly', 'topspin']];
  const skins = ['#f2c8a0', '#e8b890', '#c88a5a', '#a8704a', '#7a4a2a', '#f0d0b0'], hairs = ['#1a1a22', '#4a3020', '#8a5a2a', '#d8b060', '#b0482a', '#8a8a8a'];
  let bowlers = out.filter(p => p.bowl).length, keeper = out.some(p => p.keeper);
  const used = new Set(out.map(p => p.short));
  for (let i = 0; out.length < 11; i++) {
    const nm = team.pool[i % team.pool.length]; if (used.has(upper(nm)) && i < team.pool.length * 2) continue; used.add(upper(nm));
    const first = 'ABCDEFGHJKLMNPRSTW'[Math.floor(R() * 18)];
    const needBowl = bowlers < 5 && out.length >= 4, lower = out.length >= 7;
    const p = { id: team.id + '_' + i, name: first + '. ' + nm, short: upper(nm), team: team.id, bat: lower ? 2 + Math.floor(R() * 3) : 4 + Math.floor(R() * 4), pow: 3 + Math.floor(R() * 5), tech: 3 + Math.floor(R() * 5), fld: 4 + Math.floor(R() * 5), ctc: 4 + Math.floor(R() * 5),
      hand: R() < .3 ? -1 : 1, voice: 140 + Math.floor(R() * 120), ghost: !!team.ghosts,
      look: { build: R() < .2 ? 'bulky' : R() < .35 ? 'chibi' : 'heroic', size: 1.15 + R() * .07, hair: pick(['short', 'spiky', 'bald', 'long', 'short'], R), beard: R() < .15, moustache: R() < .15 ? 'walrus' : null, colors: { skin: team.ghosts ? '#c8e0f0' : pick(skins, R), hair: team.ghosts ? '#d8e8f8' : pick(hairs, R) } } };
    if (!keeper && out.length === 5) { p.keeper = true; keeper = true; }
    if (needBowl) { p.bowl = { del: fams[(bowlers + team.id.length) % fams.length], skill: 5 + Math.floor(R() * 4) }; bowlers++; }
    out.push(p);
  }
  for (const p of out) { if (p.bowl) p.bowl.fam = DELIVERIES[p.bowl.del[0]].fam; p.special = p.sp || null; }
  return (team._squad = out);
}
const allPlayers = () => TEAMS.flatMap(squad);
const playerById = id => allPlayers().find(p => p.id === id);

// grounds (8.3): boundary rx × ry, pitch factors, outfield decay, palette, the ends, stadium targets, chaos pool
const GROUNDS = {
  green: { name: 'Kerfuffle Village Green', short: 'THE VILLAGE GREEN', rx: 560, ry: 600, bounce: 1, turn: 1, seam: 1.2, pace: .95, outfield: 1.25, time: 'day', weather: 'clear', song: 'green',
    ends: ['Pavilion End', 'Leaning Wicket End'], crowd: .6, grass: ['#6fae4a', '#5e9c3e'], pitch: '#c9b98a', sky: ['#8fc4ff', '#cfe6ff', '#ffe6b0'], accent: '#2f6b3a', rope: '#f4f4f4', surround: 'village',
    targets: [{ id: 'pub', name: 'The Leaning Wicket window', at: [-640, 120, 26], r: 34, bonus: 6, line: 'Through the window of the Leaning Wicket! Last orders, I fear, have been called by the ball.' },
      { id: 'greenhouse', name: 'the vicarage greenhouse', at: [600, 330, 14], r: 36, bonus: 10, line: 'Into the vicarage greenhouse. There goes the marrow competition.' },
      { id: 'weathervane', name: 'the church weathervane', at: [420, -520, 110], r: 40, bonus: 12, line: 'He has hit the weathervane! The wind is now officially from the south-south-Kerfuffle.' },
      { id: 'hive', name: 'the beehive in the oak', at: [-470, -330, 60], r: 34, bonus: 4, line: 'Into the beehive. Oh dear. Oh dear oh dear. Everyone stay very still.' }],
    chaos: ['cow', 'bees', 'bells', 'mascot'] },
  hall: { name: 'Thrumpton Hall', short: 'THRUMPTON HALL', rx: 620, ry: 620, bounce: 1, turn: .9, seam: 1.1, pace: 1, outfield: .8, time: 'day', weather: 'overcast', song: 'hall',
    ends: ['Hall End', 'Orangery End'], crowd: .5, grass: ['#5f9f55', '#4f8c48'], pitch: '#c4b892', sky: ['#7a8696', '#9aa6b4', '#cfd6dc'], accent: '#22305a', rope: '#d8b04a', surround: 'hall',
    targets: [{ id: 'fountain', name: 'the fountain', at: [-560, 360, 16], r: 40, bonus: 6, line: 'Into the fountain! Fortescue will fetch it with a silver net.' },
      { id: 'phantom', name: "the Phantom's windscreen", at: [580, 220, 14], r: 34, bonus: 10, line: "Straight through the windscreen of his Lordship's motor car! Oh, splendid. I mean, oh dear." },
      { id: 'hallWindow', name: 'the Long Gallery window', at: [60, -690, 70], r: 44, bonus: 8, line: 'Through a window of the Long Gallery. A portrait of an ancestor looks thoroughly put out.' }],
    chaos: ['peacocks', 'teaTray', 'mascot'] },
  bay: { name: 'Sunburnt Bay', short: 'SUNBURNT BAY', rx: 640, ry: 520, bounce: 1.25, turn: .9, seam: 1, pace: 1.15, outfield: 1.1, sand: true, time: 'day', weather: 'clear', song: 'bay',
    ends: ['Pier End', 'Dunes End'], crowd: .7, grass: ['#e8d39a', '#dcc287'], pitch: '#d8c49a', sky: ['#3fb8ff', '#7fd8ff', '#bff0ff'], accent: '#1fb5a8', rope: '#ffd23a', surround: 'beach',
    targets: [{ id: 'ferris', name: 'the Ferris wheel', at: [-560, -420, 90], r: 50, bonus: 12, line: 'Into the Ferris wheel! A family from Dorking now has a souvenir.' },
      { id: 'icecream', name: 'the ice-cream van', at: [600, 300, 20], r: 36, bonus: 6, line: 'Onto the ice-cream van! It is raining ninety-nines!' },
      { id: 'shark', name: 'the inflatable shark', at: [-640, 260, 12], r: 38, bonus: 8, line: 'He has popped the inflatable shark. Jaws, it turns out, was mostly air.' }],
    chaos: ['gulls', 'tide', 'mascot'] },
  downs: { name: 'Dustbowl Downs', short: 'DUSTBOWL DOWNS', rx: 600, ry: 600, bounce: 1.05, turn: 1.6, seam: .9, pace: .9, outfield: .85, time: 'day', weather: 'clear', song: 'downs', storm: true,
    ends: ['Top Hat End', 'Water Tower End'], crowd: .5, grass: ['#a8a85a', '#97974e'], pitch: '#d4b37a', sky: ['#e8a860', '#ffcf8a', '#ffe8b8'], accent: '#5a2a7a', rope: '#c8ccd8', surround: 'downs',
    targets: [{ id: 'tophat', name: 'the giant top hat', at: [-560, 300, 30], r: 40, bonus: 8, line: 'Into the giant top hat! And out come... doves. Of course they do.' },
      { id: 'tower', name: 'the water tower', at: [520, -470, 80], r: 44, bonus: 10, line: 'He has holed the water tower! A brief and very local shower.' },
      { id: 'balloon', name: 'the hot-air balloon', at: [0, -560, 150], r: 46, bonus: 15, moving: true, line: 'He has hit the BALLOON! Two magicians and a rabbit are descending, slowly.' }],
    chaos: ['dustDevil', 'rabbits', 'rain', 'mascot'] },
  dome: { name: 'The Thrumpton Megadome', short: 'THE MEGADOME', rx: 700, ry: 700, bounce: 1.1, turn: 1, seam: 1, pace: 1.2, outfield: .7, time: 'night', weather: 'fog', song: 'dome',
    ends: ['Jumbotron End', 'Old Pavilion End'], crowd: 1, grass: ['#2f7a3a', '#286a32'], pitch: '#b8a888', sky: ['#04040e', '#0a0a1e', '#1a1040'], accent: '#7a3aff', rope: '#ffcf3a', surround: 'dome',
    targets: [{ id: 'jumbotron', name: 'the jumbotron', at: [0, -760, 120], r: 60, bonus: 15, line: 'Onto the JUMBOTRON! It now shows, I believe, a very large crack.' },
      { id: 'vip', name: "Thrumpton's VIP box", at: [-640, 120, 70], r: 44, bonus: 12, line: "Into his Lordship's VIP box! The champagne has been, how shall I put it, opened." },
      { id: 'bell', name: 'the ghost bell', at: [620, -320, 90], r: 40, bonus: 12, line: 'He has rung the ghost bell! Somewhere, an old scorer wakes.' },
      { id: 'laser', name: 'the laser rig', at: [600, 380, 60], r: 40, bonus: 8, line: 'Off the laser rig! The light show is now an abstract light show.' }],
    chaos: ['ghosts', 'fogBank', 'advert', 'fireworks'] }
};
const GROUND_ORDER = ['green', 'hall', 'bay', 'downs', 'dome'];

// chaos events (8.7.3): id, its name, how long it lasts (overs), what it does (29-chaos.js runs them)
const CHAOS = {
  cow: { name: 'Doris the cow', overs: 2, line: "There's a cow on the outfield. A Friesian, I believe. She's at deep midwicket and better positioned than their fine leg." },
  bees: { name: 'The bees', overs: 1, line: 'The bees are out of the oak and after a fielder. He is running faster than he has all season.' },
  bells: { name: 'Church bells', overs: 0, line: 'And the church bells ring out. Either a wedding, or the vicar has sat on the rope again.' },
  mascot: { name: 'The chicken', overs: 1, line: 'A pitch invader! A man in a chicken costume, pursued by two stewards. The chicken is winning.' },
  peacocks: { name: 'Peacocks', overs: 2, line: 'Peacocks on the outfield. Proud, vain, and in the way. Rather like the home side.' },
  teaTray: { name: "Fortescue's tea tray", overs: 0, line: 'Fortescue brings out the tea tray. Play is suspended for Earl Grey.' },
  gulls: { name: 'Seagulls', overs: 1, line: 'The seagulls are circling. Keep an eye on your chips, and your cricket ball.' },
  tide: { name: 'The tide', overs: 2, line: 'The tide is coming in. The square leg boundary is, technically, now at sea.' },
  dustDevil: { name: 'Dust devils', overs: 1, line: 'A dust devil whirls across the square. The ball in the air may take a detour.' },
  rabbits: { name: 'Rabbits', overs: 0, line: 'Rabbits! Out of the top hat and across the outfield. Seven of them. No, eight.' },
  rain: { name: 'The rain delay', overs: 0, line: 'And down it comes. The covers are on, the umbrellas are up, and the crowd discuss the weather.' },
  ghosts: { name: 'Ghost fielders', overs: 2, line: 'The ghost fielders are flickering. One of them, I swear, just walked through the umpire.' },
  fogBank: { name: 'A fog bank', overs: 2, line: 'A fog bank rolls in. Somewhere out there is a fielder. Possibly two.' },
  advert: { name: 'Advert break', overs: 0, line: 'We are contractually obliged to take a short break for a word from our sponsor.' },
  fireworks: { name: 'Fireworks', overs: 0, line: 'Fireworks over the Megadome! Thrumpton spared no expense, and no eardrums.' }
};

// the cast's voices (5.13.3): base pitch Hz, speed (syllable length ×), character
const VOICES = {
  aubrey: { base: 105, speed: 1.25, vib: 5, color: '#ffd36a', name: 'SIR AUBREY' }, dazza: { base: 135, speed: .85, color: '#7ad0ff', name: 'DAZZA' },
  priya: { base: 210, speed: .9, color: '#ff9ad8', name: 'PROF. PRIYA' }, edie: { base: 240, speed: .9, color: '#8ae08a', name: 'EDIE' },
  basil: { base: 120, speed: 1.1, trem: 7, color: '#e8c890', name: 'BASIL' }, dev: { base: 170, speed: 1, color: '#a8c8ff', name: 'DEV' },
  pip: { base: 290, speed: .75, color: '#ffe060', name: 'PIP' }, crumb: { base: 220, speed: 1.05, color: '#ffb0a0', name: 'MRS CRUMB' },
  hollis: { base: 150, speed: 1.1, color: '#e0e0ff', name: 'REV. HOLLIS' }, thrumpton: { base: 160, speed: 1, nasal: true, color: '#c890ff', name: 'LORD THRUMPTON' },
  ghost: { base: 130, speed: 1.2, whisper: true, color: '#a8e0ff', name: 'THE GHOSTS' }, machine: { base: 90, speed: .9, ring: 30, color: '#ffcf3a', name: 'THRUMPTONATOR' },
  gaz: { base: 130, speed: .95, color: '#e07a2a', name: 'GAZ' }, peregrine: { base: 175, speed: 1.05, color: '#d8b04a', name: 'PEREGRINE' },
  shazza: { base: 245, speed: .85, color: '#1fb5a8', name: 'SHAZZA' }, spinaldo: { base: 135, speed: 1.15, vib: 4, color: '#c890ff', name: 'SPINALDO' },
  fortescue: { base: 125, speed: 1.2, color: '#c8ccd8', name: 'FORTESCUE' }, kev: { base: 140, speed: .85, color: '#ffd23a', name: 'KEV' }
};

for (const k in GROUNDS) GROUNDS[k].id = k;
for (const k in DELIVERIES) DELIVERIES[k].id = k;

// ---- 11-data-story.js ----
// ---- story: The Grand Kerfuffle (5 chapters), cutscenes as lists of [speaker, line] (speaker ids from VOICES; '*' is
// a stage direction drawn as a caption), and the commentary pools.
const PROLOGUE = [
  ['aubrey', 'Kerfuffle-on-the-Wold. Population: two hundred and twelve,{w=.3} and a cow called Doris.'],
  ['aubrey', 'Nothing of note has happened here since the hailstorm of 1953,{w=.4} which was rained off.'],
  ['*', 'A long black motor car crunches across the square. Mrs Crumb drops a scone.'],
  ['thrumpton', 'Fourth of June, 1975. First ball.{w=.3} Given out leg before by a vicar{w=.3} who was looking at a butterfly.'],
  ['edie', 'That was my grandfather umpiring.{w=.3} He still talks about that butterfly.'],
  ['thrumpton', 'I have purchased the deeds to this green.{w=.3} On Monday it becomes the Thrumpton Parking Plaza.'],
  ['thrumpton', 'Four hundred spaces.{w=.3} {shake}No cricket.{/shake}'],
  ['crumb', 'Over my dead sponge.'],
  ['thrumpton', 'Unless... you beat my teams in the Grand Kerfuffle.{w=.3} Five matches. My grounds. My rules.'],
  ['thrumpton', "Your umpires. I'm not a monster."],
  ['edie', "Done. We'll play you anywhere.{w=.3} {wave}Bring cake.{/wave}"]
];
// each chapter: a MatchConfig scenario, its scenes (pre, mid, win), the Kerfuffle Goals (stars: a test on the match)
const CHAPTERS = [
  { n: 1, title: 'A Gentle Knock', opp: 'mud', ground: 'green', overs: 2, wickets: 5, batFirst: 'ker', kerfuffle: false, lessons: ['aim', 'loft', 'defend', 'run', 'bowl'],
    blurb: 'A friendly against Lower Muddleford, on the green, before the parking plaza.',
    pre: [['gaz', 'Oi, Kerfuffle! Fancy a warm-up before his Lordship flattens you?{w=.3} By warm-up I mean a thrashing.'], ['crumb', 'Into the nets first, dear. Watch the ball, not the cake.']],
    mid: [['*', 'Lord Thrumpton watches from his car.'], ['aubrey', 'With the heater on, I notice. In July.']],
    win: [['thrumpton', 'Beginner\'s luck.{w=.3} Thrumpton Hall next.{w=.3} Dress code: impeccable.']],
    goals: [['Win the match', m => m.won], ['Smash the pub window', m => m.targetsHit.includes('pub')], ['Hit a six', m => m.sixes[0] > 0]] },
  { n: 2, title: 'Tea on the Lawn', opp: 'gen', ground: 'hall', overs: 2, wickets: 5, scenario: { innings: 2, target: 25, battingFirst: 'ker', firstRuns: 24 }, kerfuffle: true, lessons: ['aftertouch', 'special', 'catch', 'throw', 'review'],
    blurb: 'Kerfuffle posted 24 after a top-order collapse, chiefly due to peacocks. Bowl them out, or keep them under 25.',
    pre: [['peregrine', 'Do mind the peacocks.{w=.3} They bite.'], ['fortescue', 'Tea will be served at the fall of the third wicket,{w=.2} or at four,{w=.2} whichever is more dignified.']],
    mid: [['*', 'The ball comes back from the boundary strangely sticky.'], ['pip', 'Is that... marmalade?']],
    win: [['peregrine', 'I shall have Fortescue polish your trophy.{w=.3} With marmalade.'], ['edie', 'Two down. Where next?'], ['thrumpton', 'The seaside. I do hope you burn.']],
    goals: [['Win the match', m => m.won], ['Take a PERFECT-ring catch', m => m.flags.perfectCatch], ['Take a wicket with a special', m => m.flags.specialWicket]] },
  { n: 3, title: 'Sand in the Sandwiches', opp: 'lar', ground: 'bay', overs: 2, wickets: 5, scenario: { innings: 2, target: 30, battingFirst: 'lar', firstRuns: 29 }, kerfuffle: true, lessons: [],
    blurb: 'The Larrikins made 29 on a pitch like a trampoline. Chase 30 from two overs against pure pace.',
    pre: [['*', 'The minibus breaks down on the coast road. The team pushes.'], ['dev', "Statistically, sunscreen doesn't melt at-"], ['shazza', 'Mate.']],
    mid: [['aubrey', 'The tide is on the turn. The boundary on the sea side is, I am told, negotiable.']],
    win: [['shazza', "Good on ya. Watch out for his Lordship's lot.{w=.3} He's been buying ringers.{w=.3} Weird ones.{w=.3} See-through ones."]],
    goals: [['Win the match', m => m.won], ['Hook or pull a six', m => m.flags.hookSix], ['Make your ground with a dive', m => m.flags.diveSafe]] },
  { n: 4, title: 'Now You See It', opp: 'mag', ground: 'downs', overs: 2, wickets: 5, batFirst: 'mag', kerfuffle: true, rain: true, lessons: ['charge'],
    blurb: 'A full match against the Magic Circle XI, on a dustbowl that turns square. Rain is forecast. Of course it is.',
    pre: [['spinaldo', 'Pick a card.{w=.3} It will be the card of your downfall.'], ['basil', 'I bowled leg-spin to a magician once.{w=.3} He sawed my stumps in half.']],
    mid: [['*', 'Thunder over the Downs. The covers come on.'], ['crumb', 'Not to worry. I have done the sums.{w=.3} Carry the scone...']],
    win: [['spinaldo', 'Bravo. But for the final, his Lordship has booked the Megadome.{w=.3} At midnight.{w=.3} With the Eternal Eleven of 1882.'], ['basil', 'Ghosts. I knew it would be ghosts.']],
    goals: [['Win the match', m => m.won], ['Stump a batter', m => m.flags.stumping], ['Hit the hot-air balloon', m => m.targetsHit.includes('balloon')]] },
  { n: 5, title: 'The Midnight Final', opp: 'thr', ground: 'dome', overs: 3, wickets: 5, batFirst: 'thr', kerfuffle: true, boss: true, lessons: [],
    blurb: 'The Megadome. Midnight. Fog. Ghosts. And the Thrumptonator bowls the last over of the chase.',
    pre: [['thrumpton', 'Welcome to the Megadome.{w=.3} No tea.{w=.2} No cake.{w=.2} No interval.{w=.3} Just {shake}ADVERTS.{/shake}'], ['ghost', 'We have waited one hundred and forty-four years for a match that wasn\'t rained off.'], ['edie', "Then let's give you one."]],
    mid: [['*', 'The fog rolls in. A great brass machine is wheeled out, steaming.'], ['thrumpton', 'Steam-powered. Never misses.{w=.3} Never gives anyone out leg before on a butterfly.']],
    win: [['thrumpton', 'One more ball.{w=.3} An exhibition.{w=.3} Against the Reverend.'], ['*', 'Rev. Hollis bowls a gentle off break. It hits the pad. He raises his finger.'], ['hollis', "That's out."],
      ['thrumpton', '...{w=.6}Plumb.{w=.4} Absolutely plumb.{w=.3} {wave}Ha. Ha ha ha!{/wave}'], ['*', 'Lord Thrumpton tears up the deeds. The ghosts drift up into the floodlights.'], ['ghost', 'Worth the wait.'],
      ['aubrey', 'Lord Thrumpton-Vane now polishes the tea urn on Saturdays,{w=.3} and is said to be adequate at fine leg.']],
    goals: [['Win the Grand Kerfuffle', m => m.won], ['Survive the Thrumptonator\'s over without losing a wicket', m => m.flags.bossSurvived], ['Hit the jumbotron', m => m.targetsHit.includes('jumbotron')]] }
];
const LOSS_LINES = [['crumb', 'Never mind, dear. Even the best of us get a golden duck.{w=.3} Have a scone and go again.']];

// commentary pools (8.9.1): event -> [[speaker, line], ...]. {batter} {bowler} {fielder} {team} {opp} {ground} {runs}
// {need} {balls} {kmh} {item} {winner} fill from the match.
const LINES = {
  start: [['aubrey', 'Good afternoon from {ground}, where the tea is stewed and {team} are about to play cricket, after a fashion.'], ['dazza', 'Should be a cracker. Or a shambles. Probably both.'], ['aubrey', 'A fine day for it at {ground}. The pigeons have taken their seats.']],
  dot: [['aubrey', 'Defended. A stroke of great dignity and no ambition whatsoever.'], ['dazza', 'Nothing doing.'], ['aubrey', 'Left alone. The ball goes by like a gossip past a closed door.'], ['dazza', 'Dot ball. Pressure building, mate.'], ['aubrey', 'No run. {batter} pats the pitch as if it owes him money.']],
  beaten: [['aubrey', "Beaten all ends up! He couldn't have missed that more if he'd brought a map."], ['dazza', 'Played and missed. Dreadful. Lovely ball, mind.'], ['aubrey', 'Past the outside edge! {bowler} looks to the heavens, who are not interested.'], ['dazza', 'Squared him up there. Beauty.']],
  single: [['dazza', 'Tip and run.'], ['aubrey', 'A quick single, taken with all the urgency of a vicar late for a fete.'], ['dazza', 'Just the one. Keeps the board ticking.'], ['aubrey', 'Pushed for one. Polite, unhurried, almost apologetic.']],
  runs: [['dazza', '{runs} runs! Good running, that.'], ['aubrey', 'They come back for {runs}. Splendid hustle, for a Saturday.'], ['dazza', 'Pushing hard. {runs} more on the board.']],
  four: [['aubrey', 'FOUR! Struck with the elegance of a swan, and the violence of an angry swan.'], ['dazza', 'Too short, too wide, too bad. Four.'], ['aubrey', 'Racing away to the rope! The fielder gives chase in a purely ceremonial capacity.'], ['dazza', 'Cracking shot. Four all the way.']],
  six: [['aubrey', 'That is MAXIMUM! Somebody alert the air-traffic people.'], ['dazza', "That's gone into the next postcode, mate."], ['aubrey', 'SIX! Up, up, and into the crowd, where a gentleman catches it in his hat.'], ['dazza', 'Massive! Get that ball back, someone.']],
  bowled: [['aubrey', 'Bowled him! The stumps are doing cartwheels, which is more than the batsman managed.'], ['dazza', 'Timber!'], ['aubrey', 'Through the gate and the bails go flying! {bowler}, you beauty.'], ['dazza', 'Castled. Off you go.']],
  caught: [['dazza', 'Up, up... and taken. Safe as houses.'], ['aubrey', 'A catch of quiet magnificence. Someone get {fielder} a scone.'], ['dazza', 'Straight down his throat. Out.'], ['aubrey', 'Caught! {batter} departs, muttering about the light.']],
  screamer: [['aubrey', 'OH, WHAT A CATCH! {fielder} has taken a screamer and will be talked about in the pub for decades.'], ['dazza', "Full stretch! You don't see that every day, mate."], ['aubrey', 'A catch of such outrageous athleticism that I have spilled my tea.']],
  dropped: [['aubrey', 'Dropped! Butter, I think, would have had a firmer grip.'], ['dazza', "Oh, he'll be buying the drinks tonight."], ['aubrey', 'Put down! The ball escapes like a cat from a bath.']],
  lbw: [['aubrey', 'A huge appeal! The Reverend raises... raises... yes, eventually, the finger.'], ['dazza', 'Plumb. Plumber than a plumber.'], ['aubrey', 'Leg before! Trapped in front like a hedgehog on the B-road.']],
  runout: [['aubrey', 'Yes! No! Wait! Sorry! The four stages of grief, conducted at a sprint.'], ['dazza', 'Run out by a country mile.'], ['aubrey', 'Direct hit! He was still in the next county.']],
  stumped: [['aubrey', 'Down the pitch, through the gate, and the bails are off before you can say Kerfuffle.'], ['dazza', 'Stumped! Lightning hands behind the sticks.'], ['aubrey', 'He has wandered down the track like a man looking for his car keys. Stumped.']],
  hitwicket: [['aubrey', 'Oh, he has trodden on his own stumps. Hit wicket. One feels for him, but only slightly.'], ['dazza', 'Hit wicket! Kicked his own castle down.']],
  wide: [['dazza', 'Wide. Wide enough to land a plane.'], ['aubrey', 'Wide. The umpire spreads his arms like a man describing a fish.'], ['dazza', 'Way down leg. Extra.']],
  noball: [['aubrey', "No-ball! He's overstepped, which in this village is practically a felony. Free hit to come."], ['dazza', 'No-ball. Free hit, mate. Get swinging.'], ['aubrey', 'A beamer! Head high and frankly rude. No-ball.']],
  freehit: [['dazza', 'Free hit. He can only be run out. Have a go!'], ['aubrey', 'The free hit. Even the cow is watching.']],
  fire: [['dazza', 'The bat is literally smoking. Someone fetch a bucket.'], ['aubrey', 'Willow ablaze! Health and Safety will want a word.'], ['dazza', "He's ON FIRE! Can't bowl to him!"]],
  firebowl: [['dazza', "{bowler}'s on fire! The ball's leaving scorch marks on the pitch."], ['aubrey', 'The ball is ablaze. The groundsman is weeping into his roller.']],
  special: [['aubrey', "Oh, he's going for something special. I can't look. I'm looking."], ['dazza', "Here it comes. {item}!"], ['aubrey', "The {item}! I've only read about it in the Almanack."]],
  review: [['priya', 'Owl-Eye has it... pitching in line... hitting... and the verdict is in.'], ['priya', 'Let us see what the owl saw. The owl, I promise you, never blinks.']],
  overturned: [['priya', 'Overturned! The owl is unimpressed by the umpire.'], ['aubrey', 'The decision is reversed. The Reverend polishes his spectacles, thoughtfully.']],
  stands: [['priya', "Umpire's call. By a whisker of a whisker. The decision stands."], ['priya', 'Clipping the bails by a whisker of a whisker. It stands.'], ['aubrey', 'The review is lost. The captain kicks a daisy.']],
  rain: [['aubrey', 'And down it comes. The covers are on, the umbrellas are up, and the crowd discuss the weather.'], ['dazza', 'Rain. Course it is.']],
  item: [['aubrey', 'The ball has collected the {item}! Do not ask me how. I have no idea how.'], ['dazza', '{item} in play! That changes things.']],
  bonus: [['dazza', 'Kerfuffle bonus! {runs} extra for that, mate!']],
  maiden: [['aubrey', 'A maiden over. Six balls, no runs, and a great deal of meaningful staring.'], ['dazza', 'Maiden. Tight as a drum.']],
  hattrick: [['aubrey', 'A HAT-TRICK! Three in three! I may need to lie down.'], ['dazza', 'HAT-TRICK! Unbelievable scenes!']],
  overEnd: [['aubrey', 'End of the over. {team} {score}.'], ['dazza', "That's the over. {score}, and all to play for."], ['aubrey', 'Over completed. The fielders change ends at the pace of a church procession.']],
  chase: [['dazza', '{need} needed from {balls}. Game on.'], ['aubrey', 'They need {need} from {balls}. I shall be hiding behind the sofa.']],
  idle: [['aubrey', 'A Mrs Hepplewhite of Lower Muddleford has sent in a lemon drizzle. Mrs Hepplewhite, you are a saint.'], ['aubrey', 'There is a pigeon at short leg who has, I think, been there since Tuesday.'], ['dazza', 'Lovely day for it.'], ['aubrey', "Is it? I hadn't noticed. I've been looking at this cake."], ['aubrey', 'My late Aunt Hermione once bowled a googly to a bishop. He never recovered.'], ['aubrey', 'The number 47 bus has just gone past. It, too, looked disappointed with that over.']],
  edge: [['dazza', 'Edged! Through the gap!'], ['aubrey', 'A thick edge, which counts exactly the same as a thin one in the scorebook. Bless the scorebook.']],
  win: [['aubrey', 'And that is the match! Victory for {winner}, for common sense, and for the scone.'], ['dazza', "{winner} win it! Get the kettle on!"]],
  loss: [['dazza', "That's that, then. Shake hands, have a sandwich, try again."], ['aubrey', 'A defeat, but a dignified one. Mostly dignified. Partially.']],
  tie: [['aubrey', 'A TIE! Scores level! We go to a Super Over and I go to a darkened room.'], ['dazza', "Tied! Super Over! You couldn't write it, mate."]],
  ghost: [['aubrey', 'The ball has passed straight through the ghost fielder. That is surely a Law 42 matter.']]
};
const LOADING_LINES = ['Rolling the pitch', 'Whitening the creases', 'Brewing the tea', 'Polishing the ball on a trouser leg', "Counting the crowd's umbrellas", 'Moving Doris off the square', 'Oiling the Thrumptonator'];
// match report templates (8.9.3): picked by the shape of the result
const REPORTS = {
  bigWin: '{winner} were indebted to {topBat} ({topRuns}{notOut}, {sixes} six{sixPl}). {loser} never recovered from {collapse}.',
  bowlWin: '{loser} never recovered from {collapse}. {topBowl} took {wkts} for {bowlRuns} with a mixture of guile, swing and, in one instance, marmalade.',
  chase: '{winner} chased {target} with {spare} to spare, {topBat} making {topRuns}{notOut}. Play was briefly held up by {chaosThing}, who had to be persuaded off the square.',
  tie: 'A tie, decided by a Super Over of almost unbearable tension, at the end of which {topBat} was carried from the field on the shoulders of the scorer.',
  close: 'A finish of quite unreasonable tension. {winner} squeaked home by {margin}; {topBat} ({topRuns}{notOut}) is to have a bench named after him.'
};

// ---- 20-ball.js ----
// ---- ball physics and the trajectory predictor (5.1). One step function serves the simulation and the predictor; it
// draws no random numbers (the seam deviation is drawn at release and kept on the ball), so a prediction is exact.
function newBall() {
  return { x: 0, y: 300, z: 34, vx: 0, vy: 0, vz: 0, phase: 'held', pitched: false, bounces: 0, swingX: 0, wob: 0, turnRad: 0, seamDev: 0, bounceK: 1,
    age: 0, carried: false, landed: false, trail: [], fx: null, multi: 1, pitchX: 0, pitchY: 0, kmh: 0, lastTouch: null, rollK: .55, groundBounce: .42 };
}
const cloneBall = b => Object.assign({}, b, { trail: [] });
// env: the ground's factors, read once per match: { bounce, turn, seam, outfield, sand }
function stepBall(b, dt, env) {
  if (b.phase === 'held' || b.phase === 'dead' || b.phase === 'carried') return null;
  const g = T('gravity');
  b.age += dt;
  let ev = null;
  if (b.phase === 'rolling') {
    const k = b.rollK * env.outfield * (env.wet ? 1.6 : 1);
    const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z = 0; b.vz = 0;
    if (hyp(b.vx, b.vy) < 6) { b.vx = b.vy = 0; b.stopped = true; }
    return null;
  }
  b.vz -= g * dt;
  if (b.phase === 'delivery' && !b.pitched) {
    const ramp = Math.min(1, b.age / .35);
    b.vx += (b.swingX * ramp + (b.wob ? Math.sin(b.age * 23) * b.wob * 120 : 0)) * dt;
  }
  const dr = 1 - .02 * dt; b.vx *= dr; b.vy *= dr; b.vz *= dr;
  const x0 = b.x, y0 = b.y, z0 = b.z;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.z <= 0) {
    // where it met the ground inside this step (so a pitching point is exact, not one step's travel late)
    const f = z0 > 0 ? z0 / (z0 - b.z) : 1; b.x = x0 + (b.x - x0) * f; b.y = y0 + (b.y - y0) * f;
    b.z = 0;
    const onPitch = Math.abs(b.x) <= PITCH.halfW && b.y > -20 && b.y < 340;
    if (b.phase === 'delivery' && onPitch && (!b.pitched || b.multi > b.bounces)) {
      const first = !b.pitched;
      b.vz = -b.vz * T('pitchBounce') * env.bounce * b.bounceK * (first ? 1 : .8);
      const grip = b.spinGrip || 0, hs = .86 - grip;
      b.vx *= hs; b.vy *= hs;
      const rot = first ? b.turnRad + b.seamDev : b.turnRad * .7;
      const c = Math.cos(rot), s = Math.sin(rot), vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx; b.vy = vy;
      if (first) { b.pitched = true; b.pitchX = b.x; b.pitchY = b.y; ev = 'pitched'; }
      b.bounces++;
    } else {
      // grass (or the pitch after the bat): a softer bounce, then it rolls
      b.bounces++;
      if (b.phase === 'hit' || b.phase === 'throw') { if (!b.landed) { b.landed = true; ev = 'landed'; } b.carried = false; }
      b.vz = -b.vz * b.groundBounce;
      const f = env.sand ? .7 : .78; b.vx *= f; b.vy *= f;
      if (b.phase === 'delivery' && !b.pitched) { b.pitched = true; b.pitchX = b.x; b.pitchY = b.y; ev = 'pitched'; }
      if (b.vz < 25) { b.vz = 0; if (b.phase === 'delivery') b.wasDelivery = true; b.phase = 'rolling'; }
    }
  }
  return ev;
}
// predict: step a copy for seconds; samples every `every` seconds: [{ t, x, y, z, phase, carried }]
function predict(b, seconds, env, every = 1 / 120, stopAt) {
  const c = cloneBall(b), out = [], dt = 1 / 120; let t = 0, acc = 0;
  out.push({ t: 0, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched });
  while (t < seconds) {
    stepBall(c, dt, env); t += dt; acc += dt;
    if (acc >= every - 1e-9) { acc = 0; out.push({ t, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz }); }
    if (stopAt && stopAt(c, t)) { out.push({ t, x: c.x, y: c.y, z: c.z, phase: c.phase, carried: c.carried, pitched: c.pitched, vx: c.vx, vy: c.vy, vz: c.vz, stop: true }); break; }
    if (c.phase === 'rolling' && c.stopped) break;
  }
  return out;
}
// when does the delivery reach the plane y = py? -> { t, x, z, pitched, pitchX, pitchY } or null
function arrival(b, py, env) {
  const c = cloneBall(b), dt = 1 / 120; let t = 0, px0 = c.pitched ? c.pitchX : null, py0 = c.pitched ? c.pitchY : null;
  if (c.y <= py) return null;
  while (t < 4) {
    const ev = stepBall(c, dt, env); t += dt;
    if (ev === 'pitched') { px0 = c.pitchX; py0 = c.pitchY; }
    if (c.y <= py) return { t, x: c.x, z: c.z, pitched: c.pitched, pitchX: px0, pitchY: py0, vx: c.vx, vy: c.vy, vz: c.vz };
  }
  return null;
}
// solve a delivery's launch from the release point to land on (tx, ty) at speed (u/s), without swing
function solveDelivery(rx, ry, rz, tx, ty, speed) {
  const g = T('gravity');
  const raw = (ax, ay) => { const dx = ax - rx, dy = ay - ry, D = Math.max(1, hyp(dx, dy)), t = D / speed; return { vx: dx / t, vy: dy / t, vz: (.5 * g * t * t - rz) / t, t }; };
  // the drag moves the real pitching point a little short: aim, fly a plain copy, correct, three times
  let ax = tx, ay = ty, sol = raw(ax, ay);
  for (let it = 0; it < 3; it++) {
    const c = { x: rx, y: ry, z: rz, vx: sol.vx, vy: sol.vy, vz: sol.vz }, dt = 1 / 120; let n = 0;
    while (c.z > 0 && n++ < 1200) { c.vz -= g * dt; const dr = 1 - .02 * dt; c.vx *= dr; c.vy *= dr; c.vz *= dr; const x0 = c.x, y0 = c.y, z0 = c.z; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; if (c.z <= 0) { const f = z0 / (z0 - c.z); c.x = x0 + (c.x - x0) * f; c.y = y0 + (c.y - y0) * f; } }
    ax += tx - c.x; ay += ty - c.y; sol = raw(ax, ay);
  }
  return sol;
}
const kmhToU = kmh => kmh / 3.6 * 16 * T('ballSpeed');
// a throw from a to b (pitch frame) at speed, with an arc that keeps it under 60 high
function solveThrow(ax, ay, az, bx, by, bz, speed) {
  const D = Math.max(1, hyp(bx - ax, by - ay)), t = Math.max(.25, D / speed), g = T('gravity');
  return { vx: (bx - ax) / t, vy: (by - ay) / t, vz: (bz - az + .5 * g * t * t) / t, t };
}

// ---- 21-match.js ----
// ---- the match: config, sides, innings and scorecards, the laws (5.7), boundaries, result and Super Over, the Kerfuffle
// Method. The per-ball play (the delivery director) is in 22-play.js; controllers (human and CPU) in 23-ai.js.
const SETTINGS_DEFAULT = { assistField: 'Assisted', running: 'Manual', marker: true, timing: true, replays: 'Big moments', captions: true, voices: true };
function S(k) { const v = game && game.settings ? game.settings[k] : undefined; return v === undefined ? SETTINGS_DEFAULT[k] : v; }

function normConfig(c) {
  return Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, difficulty: difficulty, kerfuffle: true, timeOfDay: null, weather: null,
    humans: [[], []], seed: (Math.random() * 1e9) >>> 0, superOver: true, reviews: 1, chapter: null, scenario: null, batFirst: null, cheat: null, toss: false, script: null, noReplays: false }, c);
}

class Match {
  constructor(cfg) {
    this.cfg = cfg = normConfig(cfg);
    difficulty = cfg.difficulty || difficulty;
    reseed(cfg.seed);
    this.g = GROUNDS[cfg.ground];
    this.time = cfg.timeOfDay || this.g.time; this.weather = cfg.weather || this.g.weather;
    this.env = { bounce: this.g.bounce, turn: this.g.turn, seam: this.g.seam, outfield: this.g.outfield, sand: !!this.g.sand, wet: this.weather === 'rain' };
    this.teams = cfg.teams.map(id => TEAM[id]);
    this.squads = this.teams.map(squad);
    this.humans = cfg.humans.map(h => h.slice());
    this.inn = []; this.i = -1;
    this.hype = [0, 0]; this.items = [null, null]; this.fire = { bat: 0, bowl: 0, batOn: false, bowlOn: false, batBalls: 0, bowlBalls: 0 };
    this.targetsHit = []; this.flags = {}; this.sixes = [0, 0]; this.fours = [0, 0]; this.chaosActive = {}; this.chaosLog = [];
    this.ball = newBall(); this.holos = [];
    this.state = 'pre'; this.st = 0; this.t = 0;
    this.result = null; this.superOver = false; this.soStats = null;
    this.events = []; this.callouts = []; this.records = [];
    this.fieldPreset = ['balanced', 'balanced']; this.overRound = 'over';
    this.marker = { x: 0, y: 110 }; this.token = null; this.revisedTarget = null; this.rainDone = false;
    this.dev = { forceDelivery: null, forceOutcome: null, invincible: false, infiniteHype: false, alwaysFire: false, noChaos: false };
    this.special = null; this.pendingSpecial = [null, null]; this.effects = {};
    this.bonusThisBall = 0; this.ballNo = 0; this.lastDecision = null;
    this.reviewsLeft = [cfg.reviews, cfg.reviews];
    this.fielders = []; this.batters = []; this.umps = [];
    this.won = false;
    if (cfg.scenario) this._scenario(cfg.scenario); else this._startInnings(this._firstBat());
  }
  get I() { return this.inn[this.i]; }
  get batT() { return this.I.bat; }
  get bowlT() { return 1 - this.I.bat; }
  _firstBat() { const f = this.cfg.batFirst; if (f) return this.cfg.teams.indexOf(f) < 0 ? 0 : this.cfg.teams.indexOf(f); return 0; }
  _scenario(sc) {
    // a story chapter that starts in the second innings: the first innings is on the card already
    const first = this.cfg.teams.indexOf(sc.battingFirst);
    this._startInnings(first < 0 ? 0 : first);
    const I = this.I; I.runs = sc.firstRuns; I.legal = I.overs * 6; I.wkts = Math.min(this.cfg.wickets - 1, 4); I.done = true;
    const sq = this.squads[I.bat]; let left = sc.firstRuns;
    for (let k = 0; k < 6 && left > 0; k++) { const r = Math.min(left, k === 0 ? Math.ceil(sc.firstRuns * .4) : Math.ceil(left / 2)); I.cards[k].runs = r; I.cards[k].balls = Math.max(1, Math.round(r * .9)); left -= r; if (k < I.wkts) I.cards[k].out = 'caught'; }
    this._startInnings(1 - I.bat);
  }
  _startInnings(batT, o = {}) {
    const so = !!o.superOver, overs = so ? 1 : this.cfg.overs, wk = so ? 2 : Math.min(10, this.cfg.wickets);
    const sq = this.squads[batT];
    const I = { bat: batT, runs: 0, wkts: 0, legal: 0, extras: { wd: 0, nb: 0, b: 0, lb: 0 }, bonus: 0, fours: 0, sixes: 0, overs, wmax: wk, so,
      cards: sq.map(p => ({ p, runs: 0, balls: 0, fours: 0, sixes: 0, out: null })), next: 2, bowl: {}, bowler: null, lastBowler: null, over: [], overs_: [], log: [], freeHit: false, target: null, done: false, dotsThisOver: 0, runsThisOver: 0 };
    if (so) { const order = this._soOrder(batT); I.order = order; I.next = 2; }
    else I.order = sq.map((p, k) => k);
    const mi = sq.findIndex(p => p.machine); if (mi >= 0 && !so) I.order = I.order.filter(k => k !== mi).concat([mi]);
    const ov = this.cfg.order && this.cfg.order[this.teams[batT].id];
    if (ov && !so) { const first = ov.map(id => sq.findIndex(p => p.id === id)).filter(k => k >= 0); I.order = first.concat(I.order.filter(k => !first.includes(k))); }
    I.strikeCard = I.order[0]; I.nonCard = I.order[1];
    this.inn.push(I); this.i = this.inn.length - 1;
    if (this.i >= 1) { const prev = this.inn[this.i - 1]; if (!so || prev.so) I.target = prev.runs + 1; }
    if (so && !this.inn[this.i - 1].so) I.target = null;
    if (so && this.inn[this.i - 1].so) I.target = this.inn[this.i - 1].runs + 1;
    this.revisedTarget = null;
    this.reviewsLeft = [this.cfg.reviews, this.cfg.reviews];
    this.fire = { bat: 0, bowl: 0, batOn: false, bowlOn: false, batBalls: 0, bowlBalls: 0 };
    this.fieldPreset[this.bowlT] = 'balanced';
    this._newOver(true);
    emit('innings:start', { n: this.i, team: this.teams[batT].code });
  }
  _soOrder(t) { // the Super Over: the side's three best batters
    const sq = this.squads[t]; return sq.map((p, k) => [k, p.bat * 2 + p.pow]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  }
  target() { return this.revisedTarget || this.I.target; }
  need() { const t = this.target(); return t ? Math.max(0, t - this.I.runs) : null; }
  ballsLeft() { return this.I.overs * 6 - this.I.legal; }
  overStr(I = this.I) { return Math.floor(I.legal / 6) + '.' + (I.legal % 6); }
  striker() { return this.I.cards[this.I.strikeCard]; }
  nonStriker() { return this.I.cards[this.I.nonCard]; }
  bowlerP() { return this.squads[this.bowlT].find(p => p.id === this.I.bowler); }
  bowlCard(id = this.I.bowler) { const B = this.I.bowl; return B[id] || (B[id] = { balls: 0, runs: 0, wkts: 0, maidens: 0, overs: 0 }); }
  maxOvers() { return Math.max(1, Math.ceil(this.I.overs / 5)); }
  eligibleBowlers() {
    const sq = this.squads[this.bowlT], mx = this.maxOvers();
    let list = sq.filter(p => p.bowl && !p.keeper && (this.bowlCard(p.id).overs < mx) && p.id !== this.I.lastBowler);
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub' || this.cfg.netsMachine) { const m = sq.find(p => p.machine); if (m) return [m]; }
    if (this.cfg.boss && this.I.overs * 6 - this.I.legal <= 6 && this.teams[this.bowlT].id === 'thr') { const m = sq.find(p => p.machine); if (m) return [m]; }
    list = list.filter(p => !p.machine);
    if (!list.length) list = sq.filter(p => p.bowl && !p.keeper && !p.machine && p.id !== this.I.lastBowler);
    if (!list.length) list = sq.filter(p => p.bowl && !p.machine);
    return list;
  }
  _newOver(first) {
    const I = this.I;
    I.over = []; I.dotsThisOver = 0; I.runsThisOver = 0;
    this.overBallsBowled = 0;
    if (!first) { I.lastBowler = I.bowler; }
    I.bowler = null;   // chosen in 'between' by the captain (CPU) or the bowler picker (human)
  }
  setBowler(id) {
    const I = this.I; I.bowler = id; this.bowlCard(id);
    const p = this.bowlerP();
    if (p && p.bowl && p.bowl.fam === 'spin' && this.fieldPreset[this.bowlT] !== 'defensive') this.fieldPreset[this.bowlT] = 'spin';
    else if (this.fieldPreset[this.bowlT] === 'spin') this.fieldPreset[this.bowlT] = 'balanced';
    emit('bowler', { id, name: p ? p.short : id });
  }
  sideHumans(t) { return this.humans[t] || []; }
  isHumanSide(t) { return this.sideHumans(t).length > 0; }
  assistMode() { return this.cfg.assist || S('assistField'); }
  // the boundary: an ellipse centred on the middle of the pitch; the tide shrinks the sea side (x < 0) at the bay
  boundary() { const k = T('boundaryScale'); return { rx: this.g.rx * k, ry: this.g.ry * k, tide: this.tide || 0 }; }
  outside(x, y) { const b = this.boundary(), rx = x < 0 ? b.rx * (1 - b.tide) : b.rx; return (x / rx) ** 2 + ((y - 160) / b.ry) ** 2 > 1; }
  boundaryDist(dx, dy) { // distance from the striker's stumps (0, 0) to the rope along a direction
    let lo = 0, hi = 2000; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (this.outside(dx * m, dy * m)) hi = m; else lo = m; } return lo;
  }
  // apply a finished ball's record to the scorecard (pure bookkeeping): returns events
  applyBall(rec) {
    const I = this.I, ev = [], bc = this.bowlCard(), sc = I.cards[rec.strikerCard];
    const legal = !rec.wide && !rec.noBall;
    const extraRuns = (rec.wide ? 1 : 0) + (rec.noBall ? 1 : 0);
    let batRuns = rec.byes || rec.legByes ? 0 : rec.runs;
    let total = rec.runs + extraRuns + (rec.bonus || 0);
    if (rec.wide) { I.extras.wd += 1 + rec.runs; batRuns = 0; }
    if (rec.noBall) I.extras.nb += 1;
    if (rec.byes) I.extras.b += rec.runs;
    if (rec.legByes) I.extras.lb += rec.runs;
    I.runs += total; I.bonus += rec.bonus || 0;
    if (!rec.wide) { sc.balls++; sc.runs += batRuns; if (rec.boundary === 4 && !rec.byes) sc.fours++; if (rec.boundary === 6) sc.sixes++; }
    if (rec.boundary === 4 && !rec.byes) { I.fours++; this.fours[I.bat]++; }
    if (rec.boundary === 6) { I.sixes++; this.sixes[I.bat]++; }
    bc.runs += (rec.byes || rec.legByes) ? extraRuns : total - (rec.bonus || 0);
    if (legal) { I.legal++; bc.balls++; this.overBallsBowled++; }
    I.runsThisOver += total;
    if (rec.wicket) {
      I.wkts++;
      const out = I.cards[rec.wicket.card]; out.out = rec.wicket.how; out.by = rec.wicket.by;
      if (rec.wicket.how !== 'run out') bc.wkts++;
      ev.push(['wicket', rec.wicket]);
    }
    const sym = rec.wicket ? 'W' : rec.wide ? 'wd' : rec.noBall ? 'nb' : rec.boundary ? String(rec.boundary) : total ? String(total) : '•';
    I.over.push(sym); I.log.push(rec); this.records.push(rec);
    if (!rec.wicket && total === 0 && legal) I.dotsThisOver++;
    // the strike: odd runs swap it (the batters crossed); a new batter comes in at the end the dismissed one left
    const ends = rec.endsSwapped ? [I.nonCard, I.strikeCard] : [I.strikeCard, I.nonCard];
    if (rec.wicket) {
      const newCard = I.next < I.order.length ? I.order[I.next] : null; I.next++;
      const k = ends.indexOf(rec.wicket.card); if (k >= 0) ends[k] = newCard;
      if (newCard === null) I.allOut = true;
    }
    I.strikeCard = ends[0]; I.nonCard = ends[1];
    I.freeHit = !!rec.noBall;
    if (legal && I.legal % 6 === 0) {
      ev.push(['over:end', {}]);
      bc.overs++;
      if (I.runsThisOver === 0 && I.over.every(s => s === '•' || s === 'W')) { bc.maidens++; ev.push(['milestone', { kind: 'maiden' }]); }
      const s = I.strikeCard; I.strikeCard = I.nonCard; I.nonCard = s;   // a new over from the other end
    }
    if (this.inningsOver()) ev.push(['innings:end', {}]);
    return ev;
  }
  inningsOver() {
    const I = this.I, t = this.target();
    return I.wkts >= I.wmax || I.allOut || I.legal >= I.overs * 6 || (t && I.runs >= t) || I.wkts >= I.order.length - 1;
  }
  // after an innings: the next, a Super Over, or the result
  nextInnings() {
    const I = this.I; I.done = true;
    const so = I.so, n = this.inn.length;
    if (this.cfg.single && n === 1) return this._finish(I.bat, 'scored ' + I.runs + '/' + I.wkts);
    if (!so && n === 1) { this._startInnings(1 - I.bat); return 'innings'; }
    if (so && this.inn.filter(x => x.so).length === 1) { this._startInnings(1 - I.bat, { superOver: true }); return 'innings'; }
    // decide
    const a = this.inn[n - 2], b = this.inn[n - 1];
    if (a.runs === b.runs) {
      if (!so && this.cfg.superOver && this.cfg.mode !== 'showdown' && this.cfg.mode !== 'hub' && this.cfg.mode !== 'nets') {
        this.superOver = true; emit('superover', {});
        this._startInnings(b.bat, { superOver: true }); return 'superover';
      }
      if (so) {
        const ba = a.fours + a.sixes, bb = b.fours + b.sixes;
        if (ba !== bb) return this._finish(ba > bb ? a.bat : b.bat, 'on boundaries in the Super Over');
      }
      return this._finish(null, 'Match tied');
    }
    const wIdx = a.runs > b.runs ? a.bat : b.bat;
    let margin;
    if (wIdx === a.bat) margin = (a.runs - b.runs) + ' run' + (a.runs - b.runs === 1 ? '' : 's');
    else { const w = b.wmax - b.wkts; const spare = b.overs * 6 - b.legal; margin = w + ' wicket' + (w === 1 ? '' : 's') + (spare > 0 ? ', ' + spare + ' ball' + (spare === 1 ? '' : 's') + ' to spare' : ''); }
    return this._finish(wIdx, 'won by ' + margin + (so ? ' in the Super Over' : ''));
  }
  _finish(w, text) {
    const hum = this.humans.findIndex(h => h.length);
    this.result = { winner: w, text: w === null ? text : this.teams[w].name + ' ' + text, short: text };
    this.won = hum >= 0 ? w === hum : false;
    if (this.cfg.mode === 'story') this.won = w === this.cfg.teams.indexOf('ker');
    emit('match:end', { winner: w === null ? 'tie' : this.teams[w].code });
    return 'result';
  }
  // the Kerfuffle Method (5.7.5): resources R(o, w) = (o / O) (1 - 0.07 w)
  kerfuffleMethod(oversLost) {
    const I = this.I, O = I.overs, left = (O * 6 - I.legal) / 6, w = I.wkts, first = this.inn[this.i - 1];
    const Rb = (left / O) * (1 - .07 * w), Ra = (Math.max(0, left - oversLost) / O) * (1 - .07 * w);
    const t = Math.max(I.runs + 1, Math.floor(first.runs * Ra / Rb + 1e-9) + 1);   // the plan's formula: floor(first x R_after / R_before) + 1
    return { target: t, overs: Math.max(Math.ceil(I.legal / 6) || 1, O - oversLost) };
  }
  applyRain(oversLost) {
    const I = this.I; if (this.i < 1 || I.so) { I.overs = Math.max(Math.ceil((I.legal + 1) / 6), I.overs - oversLost); return null; }
    const r = this.kerfuffleMethod(oversLost);
    I.overs = Math.max(Math.ceil((I.legal + 1) / 6), r.overs); this.revisedTarget = r.target;
    return r;
  }
  // the batting/bowling human for a role: batting: the striker's player; bowling: alternate overs; fielding: the other
  ctlFor(role) {
    const I = this.I, tb = role === 'bat' || role === 'run' || role === 'runNon' ? I.bat : 1 - I.bat, hs = this.sideHumans(tb);
    if (this.cfg.cheat || (role === 'bat' || role === 'run' || role === 'runNon') && this.dev.autoBat || (role === 'bowl' || role === 'field') && this.dev.autoBowl) return null;
    if (!hs.length) return null;
    if (role === 'bat') return hs[(I.strikeCard) % hs.length];
    if (role === 'run') return hs[(I.strikeCard) % hs.length];
    if (role === 'runNon') return hs.length > 1 ? hs[(I.nonCard) % hs.length] : null;
    const ov = Math.floor(I.legal / 6);
    if (role === 'bowl') return hs[ov % hs.length];
    if (role === 'field') return hs[(ov + (hs.length > 1 ? 1 : 0)) % hs.length];
    if (role === 'review') return hs[0];
    return hs[0];
  }
  hypeAdd(t, n, why) {
    if (!this.cfg.kerfuffle) return;
    const before = this.hype[t]; this.hype[t] = clamp(this.hype[t] + n * T('hypeGain'), 0, 100);
    if (before < 100 && this.hype[t] >= 100) emit('hype:full', { team: t });
  }
  // what a ball would be called right now (for the HUD and commentary)
  scoreStr(I = this.I) { return I.runs + '/' + I.wkts; }
}

// ---- 22-play.js ----
// ---- the delivery director (5.7.3): setup -> runup -> flight -> inPlay -> dead -> between, every state with a timeout.
// Bowling (5.2), batting (5.3), running (5.4), fielding (5.5), umpiring (5.6). Each role reads a pad: a human player's
// input, or a virtual pad an AI brain presses (23-ai.js), so the CPU, the attract mode and the bots play through the
// same code as a person.
const ACTIONS = ['shot', 'loft', 'block', 'special', 'run', 'back', 'charge'];
function mkActor(p, role) { return { p, role, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, anim: 'idle', animT: 0, sw: null, expr: null, state: 'set', hasBall: false, slow: 1, home: [0, 0], tx: 0, ty: 0, alpha: 1, dive: 0, signal: null, end: 0, target: null, sp: 0, lane: 0 }; }
// batter-frame angle θ (+ off side, 0 straight at the bowler) <-> world direction, for a batter of hand h
const dirOf = (th, h) => [-h * Math.sin(th), Math.cos(th)];
const angOf = (dx, dy, h) => Math.atan2(-h * dx, dy);

Object.assign(Match.prototype, {
  // ---------------------------------------------------------------- per step
  update(dt) {
    this.t += dt; this.st += dt;
    this._think(dt);
    const s = this.state;
    if (s === 'pre') { if (this.st > (this.cfg.mode === 'hub' ? .1 : 1.2)) this._go('between'); }
    else if (s === 'between') this._between(dt);
    else if (s === 'setup') this._setup(dt);
    else if (s === 'runup') this._runup(dt);
    else if (s === 'flight') this._flight(dt);
    else if (s === 'inPlay') this._inPlay(dt);
    else if (s === 'dead') this._dead(dt);
    else if (s === 'break') this._break(dt);
    if (this.chaosStep) this.chaosStep(dt);
    this._actors(dt);
    this._record(dt);
    for (const v of Object.values(this.vpads || {})) v._tick();
  },
  _go(s) { this.state = s; this.st = 0; emit('state', { s }); },
  pad(role) { const h = this.ctlFor(role); return h || this.vpad(role); },
  vpad(role) { this.vpads = this.vpads || {}; return this.vpads[role] || (this.vpads[role] = new VPad()); },
  isHuman(role) { return !!this.ctlFor(role); },
  // ---------------------------------------------------------------- between balls
  _between(dt) {
    const I = this.I;
    if (this.result) { if (this.state !== 'over') this._go('over'); return; }
    if (!I.bowler) {
      const list = this.eligibleBowlers();
      if (this.isHuman('bowl') && list.length > 1 && this.cfg.mode !== 'hub') {
        this.needBowler = list;   // the scene shows the bowler picker; pickBowler(id) answers
        if (this.st < 20) return;
      }
      this.setBowler(this.aiPickBowler(list).id); this.needBowler = null;
      this._overStart();
    }
    if (this.holdFor > 0) { this.holdFor -= dt; return; }
    this._placeAll(); this._go('setup');
  },
  pickBowler(id) { if (!this.needBowler) return; this.needBowler = null; this.setBowler(id); this._overStart(); },
  _overStart() {
    // a new over: the CPU captain's field, chaos events, an item token
    const I = this.I, pb = this.bowlerP();
    if (!this.isHuman('field')) this.fieldPreset[this.bowlT] = this.aiPickField();
    this.keeperUp = pb && pb.bowl && pb.bowl.fam !== 'pace' && pb.bowl.fam !== 'machine' && pb.bowl.fam !== 'swing';
    if (this.chaosOverStart) this.chaosOverStart();
    if (this.cfg.kerfuffle && !this.dev.noChaos && this.cfg.mode !== 'hub' && rp() < .35 * T('chaosRate')) this.spawnToken();
    emit('over:start', { over: Math.floor(I.legal / 6) + 1, bowler: pb ? pb.short : '' });
  },
  spawnToken(id, at) {
    const th = (rp() * 2 - 1) * 2.6, d = 150 + rp() * 260, h = this.strikerHand(), w = dirOf(th, h);
    id = id || pick(BAT_ITEMS, rp);
    this.token = { id, x: at ? at[0] : w[0] * d, y: at ? at[1] : w[1] * d, z: at ? at[2] : (rp() < .5 ? 6 : 26), t: 0 };
    emit('token', { id });
  },
  strikerHand() { const c = this.striker(); return c ? (c.p.hand || 1) : 1; },
  // ---------------------------------------------------------------- the field
  _ensureActors() {
    if (this._actorsFor === this.i + ':' + this.I.bat) return;
    this._actorsFor = this.i + ':' + this.I.bat;
    const fs = this.squads[this.bowlT];
    this.fielders = fs.map(p => mkActor(p, 'field'));
    this.batters = [mkActor(null, 'bat'), mkActor(null, 'bat')];
    if (!this.umps.length) this.umps = [mkActor({ id: 'ump1', name: 'Rev. Hollis', short: 'HOLLIS', ump: true, voice: 150 }, 'ump'), mkActor({ id: 'ump2', name: 'Mr Plimsoll', short: 'PLIMSOLL', ump: true, voice: 140 }, 'ump')];
  },
  fieldSpots() {
    const pre = FIELDS[this.fieldPreset[this.bowlT]] || FIELDS.balanced, h = this.strikerHand();
    return pre.spots.map(([name, th, d]) => {
      const w = dirOf(th * DEG, h), dist = d === 'b' ? this.boundaryDist(w[0], w[1]) - 30 : d;
      return { name, x: w[0] * dist, y: w[1] * dist };
    });
  },
  _placeAll() {
    this._ensureActors();
    const I = this.I, h = this.strikerHand(), sc = this.striker(), ns = this.nonStriker(), pb = this.bowlerP();
    const [b0, b1] = this.batters;
    b0.card = I.strikeCard; b0.p = sc.p; b1.card = I.nonCard; b1.p = ns.p;
    Object.assign(b0, { x: 5 * h, y: 14, z: 0, vx: 0, vy: 0, facing: h > 0 ? Math.PI : 0, anim: 'stance', animT: 0, sw: null, end: 0, target: null, sp: 0, dive: 0, lane: 8 * h, charged: 0, expr: null, out: false, slip: 0 });
    Object.assign(b1, { x: -14, y: 318, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2, anim: 'backup', animT: 0, sw: null, end: 1, target: null, sp: 0, dive: 0, lane: -10, expr: null, out: false, slip: 0 });
    const fam = pb && pb.bowl ? pb.bowl.fam : 'pace';
    this.runLen = { pace: 170, swing: 140, medium: 110, spin: 40, machine: 30 }[fam] || 120;
    const spots = this.fieldSpots();
    let k = 0;
    const keeperIdx = this.fielders.findIndex(f => f.p.keeper);
    for (const f of this.fielders) {
      Object.assign(f, { vx: 0, vy: 0, z: 0, state: 'set', hasBall: false, anim: 'ready', animT: 0, dive: 0, expr: null, catchT: 0, alpha: f.p.ghost ? .6 : 1, slow: f.slow || 1 });
      if (f.p.machine && f.p.id !== I.bowler) { f.role = 'parked'; f.home = [-(this.g.rx + 70), 500]; f.facing = 0; f.anim = 'ready'; }
      else if (f.p.id === I.bowler) { f.role = 'bowler'; f.home = [this.overRound === 'over' ? 9 : -9, 300 + this.runLen]; f.facing = -Math.PI / 2; f.anim = 'mark'; }
      else if (f === this.fielders[keeperIdx]) { f.role = 'keeper'; f.home = [(this.keeperUp ? -9 : -5) * h, this.keeperUp ? -28 : -150]; f.facing = Math.PI / 2; f.anim = 'keep'; }
      else { f.role = 'field'; const s = spots[k++ % spots.length]; f.home = [s.x, s.y]; f.spot = s.name; f.facing = Math.atan2(-s.y, -s.x); }
      if (this.ball.phase !== 'held' || this.st === 0 || hyp(f.x - f.home[0], f.y - f.home[1]) > 120 || f.role !== 'field') { f.x = f.home[0]; f.y = f.home[1]; }
      f.tx = f.home[0]; f.ty = f.home[1];
    }
    // more than eleven-a-side spots go spare: the machine's team has no bowler to place, so it stands by the machine
    const [u1, u2] = this.umps;
    Object.assign(u1, { x: this.overRound === 'over' ? -24 : 24, y: 346, facing: -Math.PI / 2, anim: 'umpire', signal: null, animT: 0 });
    Object.assign(u2, { x: 200 * h, y: 12, facing: Math.PI, anim: 'umpire', signal: null, animT: 0 });
    const b = this.ball = newBall(); b.phase = 'held';
    this.holos = []; this.swing = null; this.ballRec = null; this.catchQTE = null; this.throwQ = null; this.runCalled = false;
    this.batSpecial = null; this.noBall = false; this.legByes = false; this.byes = false; this.appeal = null; this.stumpsDown = null; this.stumpingAt = null; this.aim = null;
    this.contact = null; this.padHit = null; this.wideCalled = false; this.decision = null; this.review = null; this.third = null; this.replay = null; this.runout = null; this.catcher = null;
    this.boundaryHit = 0; this.runs = 0; this.bananaUsed = false; this.flyT = 0; this.again = false; this.thrownBy = null; this.chaser = null; this.intercept = null; this.bowlPlan = null; this.aiMeter = null;
    for (const f of this.fielders) { f.misfielded = false; f.phantom = 0; }
  },
  bowler() { return this.fielders.find(f => f.role === 'bowler'); },
  keeper() { return this.fielders.find(f => f.role === 'keeper'); },
  // ---------------------------------------------------------------- setup: choose a delivery, place the marker
  _setup(dt) {
    const pad = this.pad('bowl'), pb = this.bowlerP(), human = this.isHuman('bowl');
    if (!pb) { this._go('between'); return; }
    const dels = pb.bowl.del;
    if (human) {
      const m = pad.move(), mg = pad.mouseGround ? pad.mouseGround() : null;
      if (mg) { this.marker.x = mg[0]; this.marker.y = mg[1]; }
      else { this.marker.x += m[0] * 70 * dt; this.marker.y += m[1] * 110 * dt; }
      this._clampMarker();
      if (pad.pressed('run') && !this.cfg.cheat) { const k = FIELD_ORDER.indexOf(this.fieldPreset[this.bowlT]); this.fieldPreset[this.bowlT] = FIELD_ORDER[(k + 1) % FIELD_ORDER.length]; this._placeAll(); emit('field', { preset: this.fieldPreset[this.bowlT] }); return; }
      if (pad.pressed('back')) { this.overRound = this.overRound === 'over' ? 'round' : 'over'; this._placeAll(); emit('overRound', { v: this.overRound }); return; }
    }
    let pickD = null, special = false;
    if (pad.pressed('shot')) pickD = dels[0]; else if (pad.pressed('loft')) pickD = dels[1]; else if (pad.pressed('block')) pickD = dels[2];
    else if (pad.pressed('special') && this.specialReady(this.bowlT)) { special = true; pickD = dels[0]; }
    if (this.dev.forceDelivery) { pickD = this.dev.forceDelivery.del || pickD || dels[0]; }
    if (!pickD && this.st > 20) pickD = dels[0];   // the nudge: nobody pressed for 20 s
    if (pickD) {
      this.del = { id: pickD, special: special ? this.bowlSpecialId() : null };
      if (special) this.useSpecial(this.bowlT, this.del.special);
      this.forceGrade = this.dev.forceDelivery && this.dev.forceDelivery.grade || null;
      if (this.dev.forceDelivery && this.dev.forceDelivery.target) { this.marker.x = this.dev.forceDelivery.target[0]; this.marker.y = this.dev.forceDelivery.target[1]; }
      if (this.dev.forceDelivery && !this.dev.forceDelivery.keep) this.dev.forceDelivery = null;
      this.meter = { p: 0, lock: null, on: false };
      const fam = DELIVERIES[pickD].fam;
      this.runupDur = RUNUP[fam] || 1.5;
      if (pb.machine) this.runupDur = 1.0;
      this.bowler().anim = 'runup'; this.bowler().animT = 0; if (pb.machine) sfx('steam');
      this._go('runup');
    }
  },
  _clampMarker() { this.marker.x = clamp(this.marker.x, -30, 30); this.marker.y = clamp(this.marker.y, 20, 240); },
  specialReady(t) { return this.cfg.kerfuffle && (this.hype[t] >= 100 || this.dev.infiniteHype) && !this.pendingSpecial[t]; },
  bowlSpecialId() { const p = this.bowlerP(); return (p && p.bsp) || 'kerfBall'; },
  batSpecialId() { const c = this.striker(); return (c && c.p.sp) || 'kerfShot'; },
  useSpecial(t, id) {
    this.hype[t] = id === 'chirp' ? Math.max(0, this.hype[t] - 50) : 0;
    if (this.dev.infiniteHype) this.hype[t] = 100;
    this.pendingSpecial[t] = id; cover('special:' + id); emit('special', { id, name: SPECIALS[id].name, team: t });
  },
  // ---------------------------------------------------------------- the run-up and the release meter
  _runup(dt) {
    const pad = this.pad('bowl'), human = this.isHuman('bowl'), bw = this.bowler(), dur = this.runupDur;
    const u = Math.min(1, this.st / dur);
    bw.y = 300 + this.runLen * (1 - u) + 4; bw.vy = -this.runLen / dur; bw.animT = this.st;
    if (human) { const m = pad.move(); this.marker.x += m[0] * 35 * dt; this.marker.y += m[1] * 55 * dt; const mg = pad.mouseGround ? pad.mouseGround() : null; if (mg) { this.marker.x = mg[0]; this.marker.y = mg[1]; } this._clampMarker(); }
    const mw = .7, special = !!this.del.special;
    if (this.st > dur - mw) {
      this.meter.on = true;
      const ph = (this.st - (dur - mw)) * T('meterSpeed'); this.meter.p = 1 - Math.abs(1 - (ph * 2) % 2);
      if (!this.meter.lock && (pad.pressed('shot') || pad.pressed('loft') || pad.pressed('block') || pad.pressed('special'))) this.meter.lock = this._meterGrade(this.meter.p);
      if (this.aiMeter && !human && !this.meter.lock && this.st >= dur - mw + this.aiMeter.at) this.meter.lock = this.aiMeter.grade;
    }
    // batting specials are armed during the run-up (or flight) by the batter
    this._batSpecialPress();
    this._chargePress();
    if (this.st >= dur) this._release(special ? 'green' : (this.meter.lock || 'amber'));
  },
  _meterGrade(p) {
    const pb = this.bowlerP(), sk = pb && pb.bowl ? pb.bowl.skill : 6, half = T('meterSweet') * (.8 + sk * .04) / 2;
    if (p > .94) return 'over';
    const d = Math.abs(p - .5);
    return d <= half ? 'green' : d <= half + .18 ? 'amber' : 'red';
  },
  _release(grade) {
    if (this.cfg.mode === 'hub') RNG.play = E.rng((this.cfg.seed + (this.ballNo + 1) * 7919) >>> 0);   // every copy draws this ball the same
    if (this.forceGrade) { grade = this.forceGrade; this.forceGrade = null; }
    const pb = this.bowlerP(), d0 = DELIVERIES[this.del.id], sp = this.del.special, h = this.strikerHand(), b = this.ball;
    let d = Object.assign({}, d0), kmh = d.kmh[0] + rp() * (d.kmh[1] - d.kmh[0]);
    const q = { green: [2, 1.02], amber: [10, .9], red: [18, .8], over: [10, .9] }[grade] || [10, .9];
    let tx = this.marker.x, ty = this.marker.y;
    const ang = rp() * TAU, sc = this.forced ? 0 : q[0] * Math.sqrt(rp()); tx += Math.cos(ang) * sc * .45; ty += Math.sin(ang) * sc * 1.4;
    kmh *= q[1] * (grade === 'green' ? 1 + rp() * .03 : 1);
    if (this.fire.bowlOn) kmh *= 1.1;
    b.multi = 1; b.fx = null; b.bounceK = d.bounce; b.wob = (d.wob || 0); b.spinGrip = d.fam === 'spin' ? .08 : 0;
    let swing = d.swing, turn = d.turn;
    if (d.turnRand) turn = (rp() < .5 ? -1 : 1) * turn;
    if (d.wob && d.fam === 'swing') swing = (rp() * 2 - 1) * d.wob;
    // the specials (8.6)
    this.effects = { edgeK: 1, winK: 1, aiK: 1, lbwSeek: false, vanish: false, sawn: false, sunburn: false };
    if (sp === 'kerfBall') { kmh *= 1.15; swing *= 2; b.fx = 'fire'; }
    if (sp === 'vicar') { d = DELIVERIES.yorker; kmh = 155; swing = -1.2; tx = 1.5 * h; ty = 28; b.fx = 'holy'; this.effects.edgeK = 1.5; b.bounceK = .9; }
    if (sp === 'grandad') { kmh = 62; turn = 7; b.multi = 3; ty = Math.max(ty, 150); tx = 4 * h; b.fx = 'dust'; this.effects.winK = .5; b.bounceK = 1.2; }
    if (sp === 'chirp') { this.effects.winK = .7; this.effects.aiK = 2; }
    if (sp === 'dibbly') { kmh = 80; b.wob = .6; this.effects.aiK = 2; b.fx = 'wobble'; }
    if (sp === 'peregrine') { swing = 3; b.fx = 'feather'; }
    if (sp === 'silverTray') { this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); }
    if (sp === 'sunburn') { d = DELIVERIES.bouncer; kmh = 152; ty = 175; b.bounceK = 1.35; b.fx = 'haze'; this.effects.sunburn = true; }
    if (sp === 'vanish') { this.effects.vanish = true; this.effects.aiK = 1.3; }
    if (sp === 'sawn') { d = DELIVERIES.googly; turn = -8; this.effects.sawn = true; }
    if (sp === 'lightning') { this.lightningOver = Math.floor(this.I.legal / 6); this.keeperUp = true; }
    if (sp === 'grudgeBall') { d = DELIVERIES.yorker; kmh = 138; tx = -1 * h; ty = 26; swing = -.5; this.effects.lbwSeek = true; b.fx = 'grudge'; }
    if (sp === 'triple') { kmh = 150; b.fx = 'glint'; }
    if (this.items[this.bowlT] === 'fogMachine') { this.effects.fog = true; this.effects.aiK *= 1.5; this.items[this.bowlT] = null; emit('item:use', { id: 'fogMachine' }); }
    const overstep = grade === 'over' && !sp;
    this.noBall = overstep;
    const rx = (this.overRound === 'over' ? 8 : -8), ry = 300, rz = 34;
    const v = kmhToU(kmh);
    const sol = solveDelivery(rx, ry, rz, tx, ty, v);
    Object.assign(b, { x: rx, y: ry, z: rz, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'delivery', pitched: false, bounces: 0, age: 0, carried: false, landed: false, kmh: Math.round(kmh), lastTouch: 'bowler' });
    const weather = this.weather === 'overcast' ? 1.5 : 1;
    b.swingX = -h * swing * 90 * T('swing') * weather * (sp === 'peregrine' ? 1.6 : 1);
    b.turnRad = -h * turn * DEG * this.env.turn * T('spin');
    b.seamDev = gauss(rp) * T('seam') * this.env.seam * d.seam * DEG;
    if (this.items[this.batT] === 'giantBat') this.effects.giant = (this.effects.giant || 0) + 1;
    this.delInfo = { id: d.id || this.del.id, name: sp ? SPECIALS[sp].name : d0.name, fam: d0.fam, kmh: Math.round(kmh), grade, special: sp, hideSpeed: d0.hideSpeed, target: [tx, ty] };
    if (sp === 'triple') {
      this.holos = [-1, 1].map(s => { const hb = cloneBall(b); const s2 = solveDelivery(rx, ry, rz, tx + s * 14, ty + s * 30, v * (1 + s * .05)); Object.assign(hb, s2, { vx: s2.vx, vy: s2.vy, vz: s2.vz, x: rx, y: ry, z: rz, phase: 'delivery' }); return hb; });
      cover('triple');
    }
    this.pendingSpecial[this.bowlT] = null;
    this.atouch = .25; this.bowler().anim = 'deliver'; this.bowler().animT = 0;
    this.crossed = false; this.contact = null; this.padHit = null; this.wideCalled = false; this.passedStumps = false; this.keeperHas = false;
    if (this.fire.bowlOn) b.fx = b.fx || 'fire';
    if (this.cheatBall) this.cheatBall(b);
    emit('ball:released', { kmh: Math.round(kmh), del: this.delInfo.name, grade });
    if (overstep) emit('extra', { kind: 'noBall' });
    this.ballNo++; this.releaseT = this.t;
    // the CPU batter reads the ball now
    this._go('flight');
  },
  // ---------------------------------------------------------------- flight: the batter's moment
  _batSpecialPress() {
    const pad = this.pad('bat');
    if (pad.pressed('special') && this.specialReady(this.batT) && !this.batSpecial && this.ball.phase !== 'hit') { this.batSpecial = this.batSpecialId(); this.useSpecial(this.batT, this.batSpecial); this.pendingSpecial[this.batT] = null; }
  },
  _chargePress() {
    const pad = this.pad('bat'), b0 = this.batters[0];
    if (pad.pressed('charge') && !b0.charged && !this.ball.pitched && !this.swing) { b0.charged = .001; b0.anim = 'charge'; b0.animT = 0; emit('charge', {}); cover('charge'); }
  },
  contactY() {
    const b0 = this.batters[0], b = this.ball;
    let len = null;
    if (b.pitched) len = b.pitchY - PITCH.crease;
    else { const a = arrival(b, 30, this.env); len = a && a.pitchY !== null && a.pitchY !== undefined ? a.pitchY - PITCH.crease : 0; }
    const band = lengthBand(Math.max(0, len));
    return { y: (band === 'short' ? 15 : 30) + (b0.charged ? 26 : 0), band, len };
  },
  timingWindows() {
    let k = this.effects.winK || 1;
    if (this.fire.batOn) k *= 1.5;
    if (this.effects.giant) k *= 1.4;
    if (this.teaTreat === 'tea' && this.I.bat === this.cfg.teams.indexOf('ker')) k *= 1.1;
    return { p: T('perfectMs') * k / 1000, g: T('goodMs') * k / 1000, ok: T('okMs') * k / 1000 };
  },
  resolveShot(btn, th, band, line, z) {
    const deg = th / DEG;
    const fits = s => s.b === btn && s.len.includes(band) && (deg >= s.sec[0] && deg <= s.sec[1] || (s.sec2 && deg >= s.sec2[0] && deg <= s.sec2[1]));
    if (btn === 'block') return band === 'short' ? SHOT.backDefence : SHOT.fwdDefence;
    let list = SHOTS.filter(fits);
    if (btn === 'loft' && band === 'short' && z > 26 && deg < 0) return SHOT.hook;
    if (!list.length) return btn === 'loft' ? SHOT.loftLeg : SHOT.push;
    // prefer the one whose zone holds the ball
    list.sort((a, b) => this._zoneMiss(a, line, z) - this._zoneMiss(b, line, z));
    return list[0];
  },
  _zoneMiss(s, line, z) { const k = this.effects.giant ? 1.4 : 1, l0 = s.line[0] * k, l1 = s.line[1] * k, z1 = s.z[1] * (k > 1 ? 1.2 : 1); return Math.max(0, l0 - line, line - l1, s.z[0] - z, z - z1); },
  naturalDir(btn, band, line) {
    if (btn === 'block') return 0;
    if (line > 9) return (band === 'short' ? 100 : 60) * DEG;
    if (line < -3) return (band === 'short' ? -95 : -100) * DEG;
    if (band === 'short') return (btn === 'loft' ? -80 : -70) * DEG;
    return (btn === 'loft' ? -10 : 5) * DEG;
  },
  // the aim from a pad: the stick in screen space, or the mouse's ground point -> batter-frame angle (or null)
  aimFrom(pad) {
    if (pad.aimTh !== undefined && pad.aimTh !== null) return pad.aimTh;
    const h = this.strikerHand(), mg = pad.mouseGround ? pad.mouseGround() : null, b0 = this.batters[0];
    if (mg) { const dx = mg[0] - b0.x, dy = mg[1] - b0.y; if (hyp(dx, dy) > 12) return angOf(dx, dy, h); }
    const m = pad.move(); if (hyp(m[0], m[1]) < .3) return null;
    const v = pad.groundDir ? pad.groundDir(m) : [m[0], m[1]];
    return angOf(v[0], v[1], h);
  },
  _flight(dt) {
    const b = this.ball, pad = this.pad('bat'), h = this.strikerHand(), b0 = this.batters[0];
    // aftertouch for 0.25 s after release: the bowler's stick adds swing or drift
    if (this.atouch > 0) { this.atouch -= dt; const bp = this.pad('bowl'); if (this.isHuman('bowl')) { const m = bp.move(); b.swingX += m[0] * 260 * dt; if (Math.abs(m[0]) > .5) cover('aftertouch'); } }
    this._batSpecialPress(); this._chargePress();
    if (b0.charged && b0.charged < 1) { b0.charged = Math.min(1, b0.charged + dt / .3); b0.y = 14 + 26 * b0.charged; }
    // the batter's aim, live (the aim arrow)
    const aim = this.aimFrom(pad); if (aim !== null) this.aim = aim; else if (!this.swing) this.aim = null;
    // a shot press: grade the timing now; the bat meets the ball when it reaches the contact plane
    if (!this.swing) {
      let btn = pad.pressed('shot') ? 'shot' : pad.pressed('loft') ? 'loft' : pad.pressed('block') ? 'block' : null;
      const sp = this.batSpecial, auto = sp && !btn;
      if (sp && auto) { // a special plays itself at the ideal moment
        const cy = this.contactY(), a = arrival(b, cy.y, this.env), sh = SHOT.loftStraight;
        if (a && a.t <= sh.at + 1 / 240) btn = sp === 'croquet' || sp === 'grudgeDrive' ? 'shot' : 'loft';
      }
      if (btn) this._press(btn);
    }
    const prevY = b.y, ev = stepBall(b, dt, this.env);
    for (const hb of this.holos) stepBall(hb, dt, this.env);
    if (ev === 'pitched') { emit('ball:pitched', { x: b.x, y: b.y }); if (this.cfg.mode !== 'hub' && hyp(b.x, b.y - 160) < 200) {} }
    // the popping crease: wides
    if (!this.crossed && b.y <= PITCH.crease) {
      this.crossed = true;
      const line = -h * b.x;
      if (!this.contact && (line > 30 || line < -20 || b.z > 40)) { this.wideCalled = true; emit('extra', { kind: 'wide' }); }
      if (!b.pitched && b.z > 26 && !this.noBall) { this.noBall = true; emit('extra', { kind: 'noBall', beamer: true }); }
    }
    // contact
    const sw = this.swing;
    if (sw && !this.contact && sw.grade !== 'MISS' && prevY > sw.cy && b.y <= sw.cy) this._contact(sw);
    if (b.phase === 'hit') { this._go('inPlay'); this.inPlayStart(); return; }
    // the pad (LBW) and the stumps
    if (!this.contact && !this.padHit) {
      const py = sw ? sw.cy : (b0.charged ? 40 : 24);
      if (prevY > py && b.y <= py) {
        const pxc = b0.x - 1.6 * h, ducking = b.z > 28 && (!sw || sw.shot.fam === 'block' || sw.grade === 'MISS');
        if (!ducking && Math.abs(b.x - pxc) < 2.6 && b.z < 18) { this._padImpact(); return; }
      }
    }
    if (!this.passedStumps && prevY > 0 && b.y <= 0) {
      this.passedStumps = true;
      if (Math.abs(b.x) < STUMPS.hw + BALL_R && b.z < STUMPS.h + BALL_R) { this._bowled(); return; }
      if (!sw || sw.grade === 'MISS') { if (Math.abs(b.x) < 14) emit('ball:beaten', {}); }
    }
    // the keeper
    const k = this.keeper();
    if (k && b.y < k.y + 3 && b.y > k.y - 30 && !this.keeperHas) {
      if (Math.abs(b.x - k.x) < 20 && b.z < 34) { this.keeperHas = true; k.hasBall = true; b.phase = 'carried'; k.anim = 'gather'; k.animT = 0; emit('keeper', {}); this._afterDelivery('keeper'); return; }
    }
    if (b.y < -330 || b.phase === 'rolling' && b.stopped || this.st > 6) { this._afterDelivery('past'); return; }
  },
  _press(btn) {
    const b = this.ball, h = this.strikerHand(), b0 = this.batters[0];
    const cy = this.contactY(), a = arrival(b, cy.y, this.env);
    if (!a) return;   // too late: the ball is past the bat
    const line = -h * a.x;
    const th = this.aim !== null && this.aim !== undefined ? this.aim : this.naturalDir(btn, cy.band, line);
    let shot = this.resolveShot(btn, th, cy.band, line, a.z);
    const sp = this.batSpecial;
    if (sp === 'croquet' || sp === 'grudgeDrive') shot = SHOT.straightDrive;
    if (sp && sp !== 'croquet' && sp !== 'grudgeDrive' && sp !== 'stats' && btn !== 'block') shot = (Math.abs(th) > 100 * DEG) ? SHOT.loftLeg : SHOT.loftStraight;
    const dlt = shot.at - a.t, w = this.timingWindows(), ad = Math.abs(dlt);
    let grade = ad <= w.p ? 'PERFECT' : ad <= w.g ? 'GOOD' : ad <= w.ok ? (dlt < 0 ? 'EARLY' : 'LATE') : 'MISS';
    if (sp && sp !== 'stats') grade = 'PERFECT';
    if (sp === 'stats') grade = ad <= w.p * 1.5 ? 'PERFECT' : 'GOOD';
    if (this.dev.forceOutcome) grade = 'PERFECT';
    // pressed far too early: the swing is over before the ball arrives (a miss); far too late: the ball is past
    this.swing = { btn, shot, grade, dlt, cy: cy.y, band: cy.band, th: sp === 'grudgeDrive' ? 0 : th, t0: this.t, at: shot.at };
    b0.anim = 'swing'; b0.animT = 0; b0.sw = { fam: shot.fam, at: shot.at, th: this.swing.th, h, grade };
    emit('bat:press', { grade, shot: shot.id });
    if (grade === 'MISS') b0.expr = 'wince';
  },
  _contact(sw) {
    const b = this.ball, h = this.strikerHand(), line = -h * b.x, z = b.z, s = sw.shot;
    let miss = this._zoneMiss(s, line, z);
    const edgeZ = 4 * T('edge') * (this.effects.edgeK || 1) * (this.fire.bowlOn ? 1.4 : 1);
    if (this.batSpecial && this.batSpecial !== 'stats') miss = 0;
    if (this.dev.forceOutcome || this.forced) miss = 0;
    if (miss > edgeZ) { emit('ball:beaten', { reach: true }); return; }   // played and missed: the ball goes on
    const vin = hyp(b.vx, b.vy, b.vz);
    let th = sw.th, speed, launch, kind = 'clean';
    if (miss > 0) {
      // an edge: thin to the keeper and slips, thick to third man and gully, inside onto the pad or the stumps
      if (line < s.line[0]) { kind = 'inside'; th = (-150 + rp() * 40) * DEG; speed = vin * (.2 + rp() * .2); launch = 2; if (Math.abs(b.x) < 4 && rp() < .45) { this.contact = { kind: 'dragged' }; this._bowled(true); return; } }
      else if (miss > edgeZ * .55) { kind = 'thin'; th = (150 + rp() * 25) * DEG; speed = vin * (.35 + rp() * .2); launch = 6 + rp() * 10; }
      else { kind = 'thick'; th = (115 + rp() * 30) * DEG; speed = vin * (.5 + rp() * .2); launch = 4 + rp() * 14; }
      emit('ball:edge', { kind });
    } else {
      const gk = { PERFECT: 1, GOOD: .85, EARLY: .6, LATE: .6 }[sw.grade];
      const p = this.striker().p;
      speed = s.speed * (.62 + (p.pow || 5) / 26) * gk * (1 + .25 * vin / 386) * T(sw.btn === 'loft' ? 'loftPower' : 'batPower');
      if (this.fire.batOn) speed *= 1.2;
      if (this.effects.giant) speed *= 1.1;
      launch = s.launch;
      if (sw.grade === 'GOOD') th += gauss(rp) * 6 * DEG;
      if (sw.grade === 'EARLY') { th -= 25 * DEG * (s.fam === 'block' ? .3 : 1); if (sw.btn === 'loft') launch += 8; }
      if (sw.grade === 'LATE') { th += 25 * DEG * (s.fam === 'block' ? .3 : 1); if (sw.btn === 'loft') launch += 12; speed *= .9; }
      th += gauss(rp) * 2 * DEG;
      if ((sw.grade === 'EARLY' || sw.grade === 'LATE') && sw.cy < 20 && !this.forced && !this.batSpecial && rp() < .015) { this.stumpsDown = [this.t, 0, 'hitwicket']; emit('stumps', { end: 0, how: 'hit wicket' }); cover('hitwicket'); this._dead('hitwicket'); return; }
      const sp = this.batSpecial;
      if (sp === 'kettle') speed *= 1.25; else if (sp === 'longHandle' || sp === 'bludgeon') speed *= 1.4; else if (sp === 'kerfShot') speed *= 1.2; else if (sp === 'grudgeDrive') speed *= 1.3;
      if (sp === 'croquet') { speed = 520; launch = 1; }
      if (this.effects.sunburn && (s.id === 'hook' || s.id === 'pull') && sw.grade !== 'PERFECT') { kind = 'topEdge'; th = (-150 - rp() * 20) * DEG; speed = 230; launch = 62; }
      if (s.fam === 'block') { speed = s.speed * (.6 + rp() * .6); launch = 0; }
    }
    const w = dirOf(th, h), lr = launch * DEG;
    b.vx = w[0] * speed * Math.cos(lr); b.vy = w[1] * speed * Math.cos(lr); b.vz = speed * Math.sin(lr) + (kind === 'clean' ? 0 : 20);
    b.phase = 'hit'; b.carried = true; b.landed = false; b.lastTouch = 'bat'; b.bounces = 0; b.rollK = .55; b.age = 0;
    if (this.batSpecial) b.fx = { kettle: 'steam', kerfShot: 'fire', longHandle: 'fire', bludgeon: 'fire', croquet: 'croquet', grudgeDrive: 'grudge', ecto: 'ecto', stats: null }[this.batSpecial] || b.fx;
    else b.fx = this.fire.batOn ? 'fire' : null;
    if (this.batSpecial === 'croquet') b.unstoppable = true;
    if (this.batSpecial === 'ecto') b.ectoLeft = 1;
    this.contact = { kind, grade: sw.grade, shot: s.id, th, speed, edge: kind !== 'clean' };
    cover('shot:' + s.fam); cover('grade:' + sw.grade);
    emit('bat:contact', { grade: sw.grade, shot: s.id, kind, name: s.name, special: this.batSpecial });
  },
  _padImpact() {
    const b = this.ball, h = this.strikerHand();
    this.padHit = { x: b.x, y: b.y, z: b.z, pitchX: b.pitched ? b.pitchX : null, pitchY: b.pitched ? b.pitchY : null, offered: !!this.swing };
    // the truth (5.6): pitched outside leg; impact outside off with a shot offered; then would it hit the stumps?
    const c = cloneBall(b); let hit = false, close = 1e9, t = 0;
    while (t < 1.2 && c.y > -4) { stepBall(c, 1 / 120, this.env); t += 1 / 120; if (Math.abs(c.y) < 2) { const ex = Math.abs(c.x) - (STUMPS.hw + BALL_R), ez = c.z - (STUMPS.h + BALL_R); close = Math.min(close, Math.max(ex, ez)); if (ex < 0 && ez < 0) hit = true; } }
    const pitchedLeg = this.padHit.pitchX !== null && h * this.padHit.pitchX > STUMPS.hw + BALL_R;
    const impOff = -h * b.x > STUMPS.hw + BALL_R && this.padHit.offered;
    if (this.forcedLbw) hit = true;   // a forced lbw (dev, attract) is plumb
    const truthOut = !pitchedLeg && !impOff && hit;
    const umpCall = Math.abs(close) < 1;
    this.padHit.truth = { out: truthOut, pitched: pitchedLeg ? 'outside leg' : 'in line', impact: impOff ? 'outside off' : 'in line', wickets: hit ? 'hitting' : 'missing', umpCall, path: predict(b, .5, this.env, 1 / 60, cc => cc.y < -2) };
    b.vx *= .15; b.vy *= .15; b.vz = Math.abs(b.vz) * .2 + 8; b.phase = 'hit'; b.carried = false; b.lastTouch = 'pad'; b.landed = true;
    const candidate = !pitchedLeg && (hit || close < 6) && !this.wideCalled;
    emit('ball:pad', { candidate });
    if (candidate || this.effects.lbwSeek) { this.appeal = { kind: 'lbw' }; emit('appeal', { kind: 'lbw' }); this._dead('lbw'); }
    else { this.legByes = true; this._go('inPlay'); this.inPlayStart(); }
  },
  _bowled(dragged) {
    const b = this.ball;
    b.vx *= .5; b.vy = Math.abs(b.vy) * -.3; b.phase = 'hit'; b.lastTouch = 'stumps';
    this.stumpsDown = [this.t, 0, this.effects.sawn ? 'sawn' : dragged ? 'dragged' : 'bowled'];
    emit('stumps', { end: 0, how: 'bowled' });
    this._dead('bowled');
  },
  _afterDelivery(why) {
    // the ball beat the bat: collected by the keeper (dead; a stumping if the striker charged), or byes past him
    const b0 = this.batters[0];
    if (why === 'keeper') {
      const window = (this.lightningOver === Math.floor(this.I.legal / 6) ? 3 : 1) * .35;
      if (b0.charged && this.keeperUp && (!this.swing || this.swing.grade === 'MISS' || !this.contact) && !this.wideCalled) {
        this.stumpingAt = this.t + Math.min(.25, window); this._go('inPlay'); this.inPlayStart(true); return;
      }
      this._dead('keeper'); return;
    }
    this.byes = true; this._go('inPlay'); this.inPlayStart();
  }
});

// ---- 23-field.js ----
// ---- the ball in play: fielders chase and intercept (5.5), catches (the ring for a human side), throws, overthrows;
// batters run (5.4); the boundary, items and stadium targets; then the dead ball, decisions, reviews and the record.
Object.assign(Match.prototype, {
  inPlayStart(stumping) {
    this.runs = 0; this.runStart = this.t; this.lastRunT = this.t; this.chaseT = 0; this.settleT = 0; this.boundaryHit = 0; this.overthrow = false;
    this.catchQTE = null; this.throwQ = null; this.thrown = null; this.runCalled = false; this.mixup = false;
    for (const bt of this.batters) { bt.target = null; bt.sp = 0; bt.grounded = true; }
    this.batters[0].end = 0; this.batters[1].end = 1;
    if (!stumping) this._assignChase(true);
    else { const k = this.keeper(); k.anim = 'stump'; k.animT = 0; }
  },
  // ---------------------------------------------------------------- interception
  _assignChase(first) {
    const b = this.ball; if (b.phase === 'carried' || b.phase === 'dead') return;
    const path = predict(b, 6, this.env, .05, c => this.outside(c.x, c.y));
    const fs = this.fielders.filter(f => f.state !== 'down' && !f.hasBall && f.role !== 'parked');
    let best = null, second = null;
    for (const f of fs) {
      if (f.role === 'bowler' && b.lastTouch === 'bat' && first && b.y > 200) {}
      const spd = T('fieldSpeed') * (f.slow || 1) * (.85 + (f.p.fld || 5) * .03);
      for (const q of path) {
        if (this.outside(q.x, q.y)) break;
        const air = q.z > 4, reach = air ? (q.carried && q.z < 40 ? 9 : 0) : 6;
        if (air && !reach) continue;
        const d = hyp(f.x - q.x, f.y - q.y);
        if (d <= spd * Math.max(0, q.t - .18) + reach) { const c = { f, t: q.t, x: q.x, y: q.y, z: q.z, air }; if (!best || c.t < best.t) { second = best; best = c; } else if (!second || c.t < second.t) second = c; break; }
      }
    }
    for (const f of this.fielders) if (f.state === 'chase' || f.state === 'backup') f.state = 'set';
    if (best) { best.f.state = 'chase'; best.f.tx = best.x; best.f.ty = best.y; this.chaser = best.f; this.intercept = best; }
    else {
      // nobody gets there before the rope: the nearest deep fielder chases anyway (it reads well)
      const end = path[path.length - 1]; let nf = null, nd = 1e9;
      for (const f of fs) { if (f.role !== 'field') continue; const d = hyp(f.x - end.x, f.y - end.y); if (d < nd) { nd = d; nf = f; } }
      if (nf) { nf.state = 'chase'; nf.tx = end.x; nf.ty = end.y; this.chaser = nf; }
      this.intercept = null;
    }
    if (second && second.f !== (best && best.f) && second.f.role === 'field') { second.f.state = 'backup'; second.f.tx = second.x + (second.x - b.x) * .2; second.f.ty = second.y + (second.y - b.y) * .2; }
    const k = this.keeper(), bw = this.bowler();
    if (k && k.state !== 'chase') { k.state = 'stumps'; k.tx = 0; k.ty = -7; }
    if (bw && bw.state !== 'chase') { bw.state = 'stumps'; bw.tx = 2; bw.ty = 328; }
    // a human fielding side: the catch ring for an aerial chance
    if (best && best.air && b.carried && this.isHuman('field') && this.assistMode() !== 'Auto' && !this.catchQTE) {
      const p = this.catchProb(best.f, b);
      if (!(this.assistMode() === 'Assisted' && p > .85)) this.catchQTE = { f: best.f, tCatch: this.t + best.t, start: this.t + best.t - T('catchRing'), press: null, juggle: false };
    }
  },
  catchProb(f, b) {
    const sp = hyp(b.vx, b.vy, b.vz), dive = f.dive > 0 ? 1 : 0;
    return clamp((f.p.ctc || 5) / 10 * (difficulty === 'village' ? 1.05 : 1) - .25 * (sp / 400) - .3 * dive + .25, .05, .97);
  },
  // ---------------------------------------------------------------- in play
  _inPlay(dt) {
    const b = this.ball;
    // a stumping: the keeper whips the bails off while the striker is out of his ground
    if (this.stumpingAt) { if (this.t >= this.stumpingAt) { this.stumpingAt = null; const b0 = this.batters[0]; if (b0.y > PITCH.crease) { this.stumpsDown = [this.t, 0, 'stumped']; emit('stumps', { end: 0, how: 'stumped' }); this.flags.stumping = true; this._dead('stumped'); return; } this._dead('keeper'); return; } return; }
    const prev = { x: b.x, y: b.y, z: b.z };
    if (b.phase !== 'carried') {
      const ev = stepBall(b, dt, this.env);
      if (ev === 'landed' && b.lastTouch === 'bat') emit('ball:landed', {});
      if (this.chaosBall) this.chaosBall(b, prev, dt);
      if (this.token && hyp(b.x - this.token.x, b.y - this.token.y, (b.z - this.token.z) * .6) < 16 && b.phase !== 'throw') this._collectToken();
      this._targets(b, prev);
      if (this.outside(b.x, b.y) && !this.boundaryHit) {
        const six = b.carried && b.lastTouch === 'bat';
        this.boundaryHit = six ? 6 : 4; b.carried = false;
        emit('boundary', { n: this.boundaryHit, over: this.overthrow });
        this.flyOn = true;
      }
      if (this.boundaryHit) { this.flyT = (this.flyT || 0) + dt; if (this.flyT > .9 || b.phase === 'rolling') { this.flyT = 0; this._dead('boundary'); } return; }
    }
    // the throw in the air: a direct hit, or someone at the stumps collects
    if (b.phase === 'throw' && this.thrown) this._throwFlight(prev);
    this._fielders(dt);
    this._running(dt);
    if (this.state !== 'inPlay') return;
    // re-plan the chase as the ball bounces
    this.chaseT += dt; if (this.chaseT > .25 && (b.phase === 'hit' || b.phase === 'rolling')) { this.chaseT = 0; this._assignChase(false); }
    // dead: the ball settled with a fielder near the stumps (or anywhere, the batters home), or the 15 s cap
    const holder = this.fielders.find(f => f.hasBall);
    const running = this.batters.some(bt => bt.target !== null);
    if (holder && !running && !this.throwQ) {
      const near = Math.min(hyp(holder.x, holder.y), hyp(holder.x, holder.y - 320)) < 40;
      this.settleT += dt; if (this.settleT > (near ? .6 : 1.4)) { this._dead('settled'); return; }
    } else this.settleT = 0;
    if (this.st > 15 || (b.phase === 'rolling' && b.stopped && !holder && this.st > 8)) { this._dead('cap'); return; }
  },
  _fielders(dt) {
    const b = this.ball;
    for (const f of this.fielders) {
      if (f.role === 'parked') continue;
      if (f.state === 'down') { f.downT -= dt; if (f.downT <= 0) { f.state = 'set'; f.dive = 0; } continue; }
      if (f.hasBall) { this._holding(f, dt); continue; }
      let tx = f.tx, ty = f.ty;
      if (f.state === 'chase') {
        // closing on the ball itself once it's near, else running to the interception point
        const d = hyp(f.x - b.x, f.y - b.y);
        if (d < 60 || b.phase === 'rolling') { tx = b.x; ty = b.y; }
        const human = this.isHuman('field') && this.catchQTE && this.catchQTE.f === f;
        if (!human && this.isHuman('field') && this.assistMode() === 'Manual' && this.thrownBy !== f) {
          // manual fielding: the stick steers the chaser (a nudge: the run still homes on the ball)
          const m = this.pad('field').move(); if (hyp(m[0], m[1]) > .3) { tx = f.x + m[0] * 60; ty = f.y + m[1] * 60; }
        }
      }
      if (f.state === 'set' && f.role === 'field' && this.state === 'inPlay') { tx = f.x; ty = f.y; }
      const spd = T('fieldSpeed') * (f.slow || 1) * (.85 + (f.p.fld || 5) * .03) * (f.state === 'chase' || f.state === 'stumps' || f.state === 'backup' ? 1 : .5);
      const dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
      if (d > 2) { const v = Math.min(spd, d / dt); f.vx = dx / d * v; f.vy = dy / d * v; f.facing = Math.atan2(dy, dx); } else { f.vx = f.vy = 0; if (f.state === 'stumps') f.facing = Math.atan2(160 - f.y, -f.x); }
      if (this.chaosAvoid) this.chaosAvoid(f);
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.anim = hyp(f.vx, f.vy) > 20 ? 'run' : f.role === 'keeper' ? 'keep' : 'ready';
      // the gather: a catch for a ball that carried, else a stop
      if (b.phase === 'carried' || b.phase === 'dead' || b.unstoppable || (b.passR && hyp(b.x, b.y) < b.passR)) continue;
      if (b.phase === 'throw' && this.thrown && this.thrown.by === f) continue;
      if (f.phantom > 0) continue;   // a ghost fielder, phasing: the ball passes through
      const dz = b.z, dd = hyp(f.x - b.x, f.y - b.y);
      const air = b.carried && b.lastTouch === 'bat';
      let reach = air ? (dz < 40 && dz > 1.5 ? 9 : 0) : (dz < 6 ? 6 : 0);
      if (!reach && b.phase === 'throw' && dz < 24 && (f.role === 'keeper' || f.role === 'bowler' || f.state === 'stumps')) reach = 10;
      if (!reach) continue;
      // a dive for one just out of reach
      if (dd > reach && dd < reach + 18 && (f.state === 'chase') && !f.dive && hyp(b.vx, b.vy) > 60) {
        const fut = predict(b, .25, this.env, .05); const q = fut.find(q => hyp(q.x - f.x, q.y - f.y) < reach + 16);
        if (q) { f.dive = .5; f.anim = 'dive'; f.animT = 0; f.facing = Math.atan2(q.y - f.y, q.x - f.x); f.x += (q.x - f.x) * .5; f.y += (q.y - f.y) * .5; }
      }
      if (hyp(f.x - b.x, f.y - b.y) > reach + (f.dive ? 14 : 0)) continue;
      if (b.ectoLeft && f.role === 'field') { b.ectoLeft = 0; f.phantom = .5; emit('ecto', {}); continue; }
      if (air) { this._catch(f); if (this.state !== 'inPlay') return; }
      else if (b.phase === 'throw') { this._collectThrow(f); }
      else this._gather(f);
    }
  },
  _catch(f) {
    const b = this.ball, side = this.bowlT;
    let caught, perfect = false;
    const guaranteed = this.items[side] === 'sticky' || (this.sideFlags && this.sideFlags.guaranteedCatch === side) || (this.cfg.cheat && this.cfg.cheat.catches && this.cheatSide === side);
    const q = this.catchQTE;
    if (guaranteed) { caught = true; if (this.items[side] === 'sticky') { this.items[side] = null; emit('item:use', { id: 'sticky' }); } if (this.sideFlags) this.sideFlags.guaranteedCatch = null; }
    else if (q && q.f === f) {
      const w = T('catchWindow') / 1000, dlt = q.press === null ? null : q.press - this.t;
      if (dlt !== null && Math.abs(dlt) <= w) { caught = true; perfect = Math.abs(dlt) <= w / 2; }
      else if (dlt !== null && Math.abs(dlt) <= w * 2.2) { caught = rp() < .5; emit('juggle', {}); }
      else caught = false;
      this.catchQTE = null;
    } else caught = rp() < this.catchProb(f, b);
    if (this.dev.forceOutcome === 'caught') caught = true;
    if (this.dev.forceOutcome && this.dev.forceOutcome !== 'caught') caught = false;
    if (this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide !== side) caught = false;
    if (caught) {
      b.phase = 'carried'; f.hasBall = true; f.anim = f.dive ? 'diveCatch' : 'catch'; f.animT = 0; f.expr = 'shout';
      const screamer = perfect && f.dive || (f.dive && hyp(b.vx, b.vy) > 250);
      if (perfect) this.flags.perfectCatch = true;
      this.catcher = f; emit('catch', { fielder: f.p.short, screamer, perfect, keeper: f.role === 'keeper' });
      this._dead('caught'); return;
    }
    // dropped: it pops out and runs on
    b.vx *= .25; b.vy *= .25; b.vz = 30; b.carried = false; b.lastTouch = 'field'; f.state = 'down'; f.downT = .6; f.anim = 'drop'; f.animT = 0; f.expr = 'wince';
    emit('catch:dropped', { fielder: f.p.short });
    this._assignChase(false);
  },
  _gather(f) {
    const b = this.ball;
    if (b.lastTouch === 'bat' && rp() < (1 - (f.p.fld || 5) / 10) * .1 && hyp(b.vx, b.vy) > 120 && !f.misfielded) { f.misfielded = true; b.vx *= .7; b.vy *= .7; emit('misfield', { fielder: f.p.short }); f.state = 'down'; f.downT = .4; return; }
    b.phase = 'carried'; b.vx = b.vy = b.vz = 0; f.hasBall = true; f.gatherT = this.t; f.anim = 'gather'; f.animT = 0; this.catchQTE = null;
    if (b.lastTouch === 'bat' && this.legByes) {}
    emit('fielded', { fielder: f.p.short });
  },
  _holding(f, dt) {
    const b = this.ball; b.x = f.x + Math.cos(f.facing) * 3; b.y = f.y + Math.sin(f.facing) * 3; b.z = 14;
    f.vx = f.vy = 0;
    if (this.throwQ && this.throwQ.f === f) { this.throwQ.t -= dt; if (this.throwQ.t <= 0) { const e = this.throwQ.end; this.throwQ = null; this._throw(f, e); } return; }
    const near0 = hyp(f.x, f.y) < 22, near1 = hyp(f.x, f.y - 320) < 22;
    // at the stumps: break them if a batter is short of that end
    for (const [e, near] of [[0, near0], [1, near1]]) {
      if (!near) continue;
      const bt = this._runner(e);
      if (bt && !this._grounded(bt, e)) { this._breakStumps(e, f); return; }
    }
    if (near0 || near1) { f.anim = 'ready'; return; }
    if (this.t - f.gatherT < .25) return;
    // a human fielding side picks the end; the CPU picks the better run-out chance
    const human = this.isHuman('field') && this.assistMode() !== 'Auto';
    let end = null;
    if (human) {
      const pad = this.pad('field'), mc = pad.clickedEnd ? pad.clickedEnd() : null;
      if (pad.pressed('shot') || mc === 0) end = 0; else if (pad.pressed('loft') || mc === 1) end = 1; else if (pad.pressed('block')) end = 'lob';
      if (end === null && this.t - f.gatherT > 1.3) end = this._bestEnd(f);
      if (end !== null && this.t - f.gatherT < .55) this.rocket = true;
    } else end = this._bestEnd(f);
    if (end !== null) { f.anim = 'throw'; f.animT = 0; this.throwQ = { f, end, t: .18 }; }
  },
  _bestEnd(f) {
    let best = null, bm = -1e9;
    for (const e of [0, 1]) {
      const bt = this._runner(e); if (!bt || this._grounded(bt, e)) continue;
      const tThrow = hyp(f.x, f.y - e * 320) / T('throwSpeed') + .2, tRun = Math.abs(bt.y - (e ? PITCH.bCrease : PITCH.crease)) / Math.max(30, T('runSpeed'));
      const m = tRun - tThrow; if (m > bm) { bm = m; best = e; }
    }
    if (best !== null && bm > -.6) return best;
    return 'lob';
  },
  _throw(f, end) {
    const b = this.ball, lob = end === 'lob', e = lob ? (hyp(f.x, f.y) < hyp(f.x, f.y - 320) ? 0 : 1) : end;
    const tx = 0, ty = e ? 320 : 0, tz = lob ? 14 : 8, dist = hyp(f.x - tx, f.y - ty);
    let speed = T('throwSpeed') * (.8 + (f.p.fld || 5) * .03) * (lob ? .6 : 1) * (this.rocket ? 1.2 : 1);
    this.rocket = false;
    const err = lob ? 0 : gauss(rp) * T('throwError') * dist / 480 * (1.4 - (f.p.fld || 5) * .06);
    const sol = solveThrow(f.x, f.y, 18, tx + err, ty + (e ? 1 : -1) * (lob ? 8 : 0) + gauss(rp) * err * .5, tz, speed);
    f.hasBall = false; f.anim = 'throw'; f.animT = .2;
    Object.assign(b, { x: f.x, y: f.y, z: 18, vx: sol.vx, vy: sol.vy, vz: sol.vz, phase: 'throw', carried: false, landed: false, lastTouch: 'throw', bounces: 0, stopped: false });
    this.thrown = { by: f, end: e, lob, t: this.t };
    this.thrownBy = f;
    emit('throw', { end: e, lob });
  },
  _throwFlight(prev) {
    const b = this.ball, e = this.thrown.end, sy = e ? 320 : 0;
    // through the plane of the stumps at its end: a direct hit?
    if ((prev.y - sy) * (b.y - sy) <= 0 && !this.thrown.lob) {
      if (Math.abs(b.x) < STUMPS.hw + BALL_R && b.z < STUMPS.h + BALL_R) {
        b.vx *= -.2; b.vy *= -.2; b.phase = 'rolling'; this.thrown = null;
        const bt = this._runner(e);
        emit('direct', { end: e }); cover('direct');
        this._breakStumps(e, null, true);
        if (this.state === 'inPlay') { this.overthrow = true; this._assignChase(false); }
        return;
      }
    }
    const past = (0 - b.x) * b.vx + (sy - b.y) * b.vy < 0, far = hyp(b.x, b.y - sy);
    if ((past && far > 40) || (b.phase === 'rolling' && (far > 30 || b.stopped))) {
      // a missed shy with nobody backing up: overthrows, the batters may run on
      if (this.thrown && !this.overthrow && past && !this.thrown.lob) { this.overthrow = true; emit('overthrow', {}); cover('overthrow'); }
      this.thrown = null; this._assignChase(false);
    }
  },
  _collectThrow(f) {
    const b = this.ball; b.phase = 'carried'; b.vx = b.vy = b.vz = 0; f.hasBall = true; f.gatherT = this.t - 1; f.anim = 'gather'; this.thrown = null;
  },
  _runner(e) {   // the batter heading for (or nearest to) end e
    const [a, c] = this.batters;
    const toward = this.batters.filter(bt => bt.target === e);
    if (toward.length) return toward.sort((p, q) => Math.abs(p.y - e * 320) - Math.abs(q.y - e * 320)).pop();
    return Math.abs(a.y - e * 320) < Math.abs(c.y - e * 320) ? a : c;
  },
  _grounded(bt, e) { const reach = bt.dive > 0 ? 12 : 4; return e === 0 ? bt.y - reach <= PITCH.crease : bt.y + reach >= PITCH.bCrease; },
  _breakStumps(e, by, direct) {
    this.stumpsDown = [this.t, e, 'runout'];
    emit('stumps', { end: e, how: 'runout' });
    const bt = this._runner(e);
    if (bt && !this._grounded(bt, e)) {
      const margin = Math.abs(bt.y - (e ? PITCH.bCrease : PITCH.crease)) / Math.max(40, T('runSpeed'));
      this.runout = { bt, card: bt.card, end: e, margin, direct, by: by ? by.p.short : 'direct hit' };
      if (this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide !== this.bowlT) { this.runout = null; return; }
      this._dead('runout'); return;
    }
    // stumps broken but everyone home: the ball is dead if it's in a fielder's hands
    if (by) this._dead('settled');
  },
  // ---------------------------------------------------------------- running between the wickets
  _running(dt) {
    const pads = [this.pad('run'), this.isHuman('runNon') ? this.pad('runNon') : null];
    const [s, n] = this.batters;
    const human = this.isHuman('run'), auto = !human || S('running') === 'Auto';
    if (this.byes && !this.contact && !this.legByes) {}
    // the call
    for (let k = 0; k < 2; k++) {
      const bt = this.batters[k], pad = k === 0 ? pads[0] : (pads[1] || null);
      if (!pad || (auto && k === 0 && !pads[1])) continue;
      if (pad.pressed('run')) {
        if (bt.target === null) this._call(k === 0 && !pads[1] ? 'both' : k, 'yes');
        else if (Math.abs(bt.y - (bt.target ? PITCH.bCrease : PITCH.crease)) < 50 && this.thrown) { bt.dive = .6; bt.anim = 'dive'; bt.animT = 0; emit('dive', {}); cover('dive'); }
        else this.again = true;
      }
      if (pad.pressed('back') && bt.target !== null) this._call(k === 0 && !pads[1] ? 'both' : k, 'back');
    }
    if (auto || !human) this._aiRun();
    // movement
    for (const bt of [s, n]) {
      if (bt.out) continue;
      if (bt.target === null) { bt.vx = bt.vy = 0; bt.anim = bt.anim === 'swing' && this.t - this.runStart < .5 ? 'swing' : (bt === s ? 'stanceIdle' : 'backupIdle'); continue; }
      const ty = bt.target ? PITCH.bCrease + 14 : PITCH.crease - 14;
      const dir = sgn(ty - bt.y), maxV = T('runSpeed') * (this.env.sand ? .85 : 1) * (this.teaTreat === 'sandwich' && this.I.bat === this.cfg.teams.indexOf('ker') ? 1.1 : 1) * (bt.slip > 0 ? .6 : 1) * (bt.dive > 0 ? 1.35 : 1);
      bt.sp = Math.min(maxV, bt.sp + 600 * dt);
      bt.y += dir * bt.sp * dt; bt.vy = dir * bt.sp; bt.x += (bt.lane - bt.x) * Math.min(1, dt * 4);
      bt.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2; bt.anim = bt.dive > 0 ? 'dive' : 'run';
      if (bt.slip > 0) bt.slip -= dt; if (bt.dive > 0) { bt.dive -= dt; if (bt.dive <= 0 && this._grounded(bt, bt.target)) cover('diveSafe'); }
      if ((dir > 0 && bt.y >= ty) || (dir < 0 && bt.y <= ty)) { bt.y = ty; bt.end = bt.target; bt.arrived = true; bt.sp = 0; }
    }
    // a run completes when both have made their ground at opposite ends
    if (s.target !== null && n.target !== null && s.arrived && n.arrived && s.end !== n.end) {
      this.runs++; this.lastRunT = this.t; s.arrived = n.arrived = false;
      emit('run', { n: this.runs });
      if (s.diveUsed || n.diveUsed) {}
      if (this.again) { this.again = false; this._call('both', 'yes'); }
      else { s.target = n.target = null; }
    }
    // a mix-up: both batters at one end
    if (s.target === null && n.target === null && s.end === n.end) this.mixup = true;
  },
  _call(who, what) {
    const list = who === 'both' ? this.batters : [this.batters[who]];
    if (what === 'yes') {
      if (this.items[this.bowlT] === 'banana' && !this.bananaUsed) { this.bananaUsed = true; this.items[this.bowlT] = null; for (const bt of this.batters) bt.slip = 1; emit('item:use', { id: 'banana' }); }
      for (const bt of list) { if (bt.out) continue; bt.target = 1 - bt.end; bt.arrived = false; bt.sp = Math.max(bt.sp, 20); }
      this.runCalled = true; emit('call', { what: 'YES' });
    } else {
      for (const bt of list) { bt.target = bt.end; bt.arrived = false; }
      emit('call', { what: 'NO' });
    }
  },
  // the YES / NO / WAIT judgment (also the bubble's hint): time to complete the run vs the fielding side's best throw
  runMargin() {
    const b = this.ball, [s, n] = this.batters;
    const left = Math.max(...this.batters.map(bt => bt.target === null ? 300 : Math.abs(bt.y - (bt.target ? PITCH.bCrease : PITCH.crease)))) + (s.target === null ? 0 : 0);
    const tRun = left / T('runSpeed') + (s.target === null ? .3 : 0);
    const holder = this.fielders.find(f => f.hasBall);
    let tField;
    const tThrow = (f, x, y) => Math.min(hyp(x, y), hyp(x, y - 320)) / T('throwSpeed') + .45;
    if (holder) tField = tThrow(holder, holder.x, holder.y) - .1;
    else if (this.intercept && this.chaser) tField = Math.max(0, this.intercept.t - (this.t - this.runStart)) + .25 + tThrow(this.chaser, this.intercept.x, this.intercept.y);
    else if (b.phase === 'throw') tField = .4;
    else tField = 6;   // nobody will reach it before the rope
    return tField - tRun;
  },
  callHint() { const m = this.runMargin(); return m > .35 ? 'YES' : m < -.15 ? 'NO' : 'WAIT'; },
  _aiRun() {
    const [s, n] = this.batters, b = this.ball;
    if (this.boundaryHit) return;
    const since = this.t - this.runStart;
    if (since < .3 && !this.byes) return;
    const idle = s.target === null && n.target === null && s.end !== n.end;
    const agg = this.cfg.cheat ? 1 : T('aiAggression');
    if (idle && since - (this.t - this.lastRunT) >= 0 && this.t - this.lastRunT > .15) {
      const m = this.runMargin(), thr = .15 - agg * .3;
      if (m > thr && this.runs < 4 && b.phase !== 'carried' || (this.cfg.cheat && this.cfg.cheat.runs && this.runs < this.cfg.cheat.runs)) this._call('both', 'yes');
      else if (this.fielders.some(f => f.hasBall)) { /* stay */ }
    } else if (!idle && s.target !== null) {
      // mid-run: send back if hopeless
      const m = this.runMargin(); if (m < -.6 && Math.abs(s.y - (s.target ? 320 : 0)) > 200 && !(this.cfg.cheat && this.cfg.cheat.runs)) this._call('both', 'back');
    }
  },
  // ---------------------------------------------------------------- items and stadium targets
  _collectToken() {
    const id = this.token.id; this.token = null;
    const side = ITEMS[id].side === 'bowl' ? this.bowlT : this.batT;
    if (id === 'cake') this.hypeAdd(side, 40); else this.items[side] = id;
    cover('item:' + id); emit('item', { id, name: ITEMS[id].name, team: side });
  },
  _targets(b, prev) {
    if (b.lastTouch !== 'bat' || !this.cfg.kerfuffle) return;
    for (const tg of this.g.targets) {
      if (this.targetsHit.includes(tg.id)) continue;
      const at = this.targetPos ? this.targetPos(tg) : tg.at, k = T('boundaryScale');
      const dx = b.x - at[0] * k, dy = b.y - at[1] * k, dz = b.z - at[2];
      if (hyp(dx, dy, dz) < tg.r) {
        this.targetsHit.push(tg.id); this.bonusThisBall += tg.bonus; this.hypeAdd(this.batT, 30);
        b.vx *= -.15; b.vy *= -.15; b.vz = Math.min(b.vz, 0);
        cover('target'); emit('target:hit', { id: tg.id, name: tg.name, bonus: tg.bonus, line: tg.line });
      }
    }
  },
  // ---------------------------------------------------------------- dead ball: decisions and the record
  _enterDead(why) {
    if (this.state === 'dead') return;
    this.deadWhy = why; this._go('dead');
    const b = this.ball; if (b.phase !== 'carried') { if (why !== 'boundary') { b.vx *= .3; b.vy *= .3; } }
    this.decision = null; this.review = null; this.reviewWin = 0; this.replay = null; this.third = null;
    const I = this.I, sc = this.batters[0], h = this.strikerHand();
    let out = null;
    const freeHit = I.freeHit || this.noBall;
    if (why === 'bowled' && !freeHit) out = { how: 'bowled', card: I.strikeCard, by: this.bowlerP().short };
    if (why === 'caught' && !freeHit) out = { how: 'caught', card: I.strikeCard, by: this.catcher.p.short, keeper: this.catcher.role === 'keeper' };
    if (why === 'stumped' && !freeHit) out = { how: 'stumped', card: I.strikeCard, by: this.keeper().p.short };
    if (why === 'hitwicket' && !freeHit) out = { how: 'hit wicket', card: I.strikeCard, by: this.bowlerP().short };
    if (why === 'runout') out = { how: 'run out', card: this.runout.card, by: this.runout.by };
    if (why === 'lbw' && !freeHit) {
      // the umpire's call: right with probability accuracy; the review system can fix it
      const tr = this.padHit.truth, acc = (this.effects.lbwSeek ? .1 : 0) + (this.umps[0].p.id === 'ump1' ? .86 : .92);
      const right = this.cfg.umpWrong ? false : this.forcedLbw ? true : rp() < acc;
      const given = right ? tr.out : !tr.out;
      this.decision = { kind: 'lbw', out: given, truth: tr.out, umpCall: tr.umpCall, tr };
      emit('decision', { out: given, kind: 'lbw' });
      if (given) out = { how: 'lbw', card: I.strikeCard, by: this.bowlerP().short };
      this.reviewWin = 4;
    }
    if (why === 'runout' && this.runout.margin < .15) { this.third = { t: 0, out: true }; cover('third'); emit('review:start', { kind: 'third' }); }
    if (out && this.items[this.batT] === 'horseshoe') { this.items[this.batT] = null; emit('item:use', { id: 'horseshoe', saved: true }); this.horseshoeSaved = true; out = null; if (this.decision) this.decision.out = false; this.reviewWin = 0; }
    if (out && this.dev.invincible && this.isHumanSide(this.batT)) { out = null; this.reviewWin = 0; }
    if (out && this.cfg.cheat && this.cfg.cheat.noOut && this.cheatSide === this.batT) { out = null; this.reviewWin = 0; }
    if (this.dev.forceOutcome) { const f = this.dev.forceOutcome; this.dev.forceOutcome = null; if (f === 'bowled' || f === 'lbw' || f === 'stumped' || f === 'caught') out = out || { how: f, card: I.strikeCard, by: this.bowlerP().short }; }
    this.outRec = out;
    // runs: completed runs, or the boundary
    let runs = this.boundaryHit ? this.boundaryHit + (this.overthrow ? this.runs : 0) : this.runs;
    if (why === 'boundary' && this.boundaryHit === 4 && this.overthrow) runs = 4 + this.runs;
    if (out && out.how !== 'run out') runs = 0;
    const wide = this.wideCalled, nb = this.noBall;
    const byes = !this.contact && !this.legByes && runs > 0 && !wide, lb = this.legByes && runs > 0;
    const endsSwapped = this.batters[0].end === 1 && this.batters[1].end === 0 || (this.batters[0].y > 160 && this.batters[1].y < 160);
    let bonus = this.bonusThisBall; this.bonusThisBall = 0;
    if (this.items[this.batT] === 'teapot' && runs > 0 && !out) { bonus += runs; this.items[this.batT] = null; emit('item:use', { id: 'teapot', bonus: runs }); }
    this.ballRec = { strikerCard: I.strikeCard, nonCard: I.nonCard, runs, boundary: this.boundaryHit && !out ? this.boundaryHit : 0, wide, noBall: nb, byes, legByes: lb, wicket: out, bonus,
      endsSwapped: out && out.how !== 'run out' ? false : endsSwapped, shot: this.contact ? this.contact.shot : null, grade: this.swing ? this.swing.grade : null, kmh: this.delInfo ? this.delInfo.kmh : 0,
      del: this.delInfo ? this.delInfo.name : '', special: this.delInfo && this.delInfo.special || this.batSpecial || null, bowler: I.bowler, over: Math.floor(I.legal / 6), ball: I.legal % 6 + 1, t: this.t, freeHit: I.freeHit };
    if (out && out.how === 'bowled') cover('out:bowled'); if (out) cover('out:' + out.how);
    this._signal();
    if (this.boundaryHit === 6) { this.sixDist = hyp(b.x, b.y); }
    this.deadDur = (this.third ? 3.4 : 0) + (this.reviewWin ? .5 : 0) + (out ? 2 : this.boundaryHit ? 1.8 : 1.1);
    if (this.cfg.mode === 'hub') this.deadDur = Math.min(this.deadDur, out ? 1.6 : 1.1);
    this.bigMoment = out || this.boundaryHit === 6 || (this.ballRec.bonus > 0) || (this.contact && this.batSpecial);
    const rp_ = S('replays'), want = rp_ === 'Always' || (rp_ === 'Big moments' && this.bigMoment);
    if (want && !this.cfg.noReplays && this.cfg.mode !== 'hub' && this.rec && this.rec.length) {
      const from = Math.max(0, this.rec.findIndex(f => f.t >= (this.releaseT || 0) - .5));
      const frames = this.rec.length - from;
      if (frames > 20) { const dur = Math.min(5, frames / 60 / .5); this.replay = { from, to: this.rec.length - 1, t: 0, delay: this.deadDur * .55, dur }; this.deadDur += dur; cover('replay'); }
    }
    emit('dead', { why, runs, out: out ? out.how : null });
  },
  _signal() {
    const u = this.umps[0], r = this.ballRec; let s = null;
    if (r.wicket) s = 'out'; else if (r.boundary === 6) s = 'six'; else if (r.boundary === 4) s = 'four'; else if (r.wide) s = 'wide'; else if (r.noBall) s = 'noball'; else if (r.byes) s = 'bye'; else if (r.legByes) s = 'legbye';
    if (this.decision && !this.decision.out) s = s || 'notout';
    u.signal = s; u.animT = 0; if (s) cover('signal:' + s);
  },
  // the review (KRS): the batting side on OUT, the fielding side on NOT OUT, within 4 seconds, one per innings
  canReview() { return this.decision && this.reviewWin > 0 && !this.review && this.reviewsLeft[this.decision.out ? this.batT : this.bowlT] > 0; },
  reviewSide() { return this.decision ? (this.decision.out ? this.batT : this.bowlT) : null; },
  startReview() {
    if (!this.canReview()) return false;
    const side = this.reviewSide(), d = this.decision, tr = d.tr;
    const verdict = tr.umpCall ? d.out : tr.out;
    this.review = { t: 0, side, verdict, before: d.out, lights: [tr.pitched === 'outside leg' ? 'red' : 'green', tr.impact === 'outside off' ? 'red' : 'green', tr.umpCall ? 'amber' : tr.wickets === 'hitting' ? 'green' : 'red'], tr };
    this.reviewWin = 0; this.deadDur += 4.2; cover('review');
    emit('review:start', { kind: 'krs', side });
    return true;
  },
  _deadStep(dt) {
    const d = this.decision;
    // the review window: human sides press special (REVIEW); the CPU reviews when it is confident the umpire erred
    if (this.reviewWin > 0) {
      this.reviewWin = Math.max(0, this.reviewWin - dt);
      const side = this.reviewSide();
      const hum = this.sideHumans(side).length && !this.cfg.cheat;
      if (hum) { const pad = side === this.batT ? this.pad('bat') : this.pad('bowl'); if (pad.pressed('special')) this.startReview(); }
      else if (this.st > .8 && this.reviewsLeft[side] > 0 && d.out !== d.truth && rp() < .7) this.startReview();
      else if (this.st > .8 && (!this.reviewsLeft[side] || d.out === d.truth || hum === 0)) this.reviewWin = 0;
    }
    if (this.review) {
      this.review.t += dt;
      if (this.review.t > 3.6 && !this.review.done) {
        const r = this.review; r.done = true;
        const overturned = r.verdict !== r.before;
        if (!overturned) this.reviewsLeft[r.side]--;
        d.out = r.verdict;
        if (overturned) { emit('review:result', { overturned: true, out: d.out }); }
        else emit('review:result', { overturned: false, out: d.out });
        if (overturned && r.side === this.bowlT) this.flags.reviewWon = true;
        if (overturned && r.side === this.isHumanSideIdx()) this.flags.reviewWon = true;
        // rewrite the record
        const I = this.I;
        if (d.out && !this.ballRec.wicket) { this.ballRec.wicket = { how: 'lbw', card: I.strikeCard, by: this.bowlerP().short }; this.ballRec.runs = 0; cover('out:lbw'); }
        if (!d.out && this.ballRec.wicket && this.ballRec.wicket.how === 'lbw') this.ballRec.wicket = null;
        this.umps[0].signal = d.out ? 'out' : 'notout'; this.umps[0].animT = 0;
      }
    }
    if (this.replay) { const rq = this.replay; if (this.st >= rq.delay) { rq.t += dt; rq.on = true; if (rq.t >= rq.dur) { this.replay = null; } } }
    if (this.third) { this.third.t += dt; if (this.third.t > 3.2 && !this.third.done) { this.third.done = true; emit('review:result', { third: true, out: !!this.ballRec.wicket }); } }
  },
  isHumanSideIdx() { return this.humans.findIndex(h => h.length); },
  skipDead() { if (this.state === 'dead' && !this.review && !this.reviewWin && !this.third) { this.st = Math.max(this.st, this.deadDur); this.replay = null; } },
  _deadCheck() { return this.st >= this.deadDur && !this.reviewWin && (!this.review || this.review.done) && (!this.third || this.third.done); },
  _finishBall() {
    const rec = this.ballRec; this.ballRec = null;
    if (!rec) return;
    const I = this.I, before = { runs: I.runs, wkts: I.wkts };
    const evs = this.applyBall(rec);
    this.lastRec = rec;
    // hype and ON FIRE (5.9)
    const bt = this.batT, bo = this.bowlT, total = rec.runs + (rec.bonus || 0);
    if (rec.boundary === 6) this.hypeAdd(bt, 25); else if (rec.boundary === 4) this.hypeAdd(bt, 15); else if (rec.runs >= 3) this.hypeAdd(bt, 10);
    if (rec.grade === 'PERFECT') this.hypeAdd(bt, 8);
    if (rec.wicket) this.hypeAdd(bo, 30); else if (!total && !rec.wide && !rec.noBall) this.hypeAdd(bo, 6);
    if (rec.boundary) { this.fire.bat++; } else if (!rec.wide && !rec.noBall) { if (!total || rec.wicket) this.fire.bat = 0; }
    if (!total || rec.wicket) this.fire.bowl++; else if (rec.boundary) this.fire.bowl = 0; else this.fire.bowl = Math.max(0, this.fire.bowl - 1);
    if (this.fire.batOn) { this.fire.batBalls++; if (this.fire.batBalls >= 6 || rec.wicket || (!total && !rec.wide)) { this.fire.batOn = false; this.fire.bat = 0; emit('fire:off', { side: 'bat' }); } }
    else if (this.fire.bat >= T('fireStreak') || this.dev.alwaysFire) { this.fire.batOn = true; this.fire.batBalls = 0; emit('fire:on', { side: 'bat' }); cover('fire'); }
    if (this.fire.bowlOn) { this.fire.bowlBalls++; if (this.fire.bowlBalls >= 6 || rec.boundary) { this.fire.bowlOn = false; this.fire.bowl = 0; emit('fire:off', { side: 'bowl' }); } }
    else if (this.fire.bowl >= 3) { this.fire.bowlOn = true; this.fire.bowlBalls = 0; emit('fire:on', { side: 'bowl' }); cover('fire'); }
    if (this.dev.infiniteHype) { this.hype[0] = this.hype[1] = 100; }
    if (rec.wicket && rec.special && this.delInfo && this.delInfo.special) this.flags.specialWicket = true;
    if (this.effects.giant) { this.effects.giant = 0; this.giantBalls = (this.giantBalls || 0) + 1; if (this.giantBalls >= 2) { this.giantBalls = 0; if (this.items[bt] === 'giantBat') { this.items[bt] = null; emit('item:use', { id: 'giantBat' }); } } }
    // hat-tricks
    const bw = this.bowlCard(); bw.streak = rec.wicket && rec.wicket.how !== 'run out' ? (bw.streak || 0) + 1 : (rec.wide || rec.noBall ? bw.streak : 0);
    if (bw.streak === 3) { emit('milestone', { kind: 'hattrick' }); cover('hattrick'); }
    // bowling items: two dot balls in an over earn one
    if (this.cfg.kerfuffle && I.dotsThisOver === 2 && !this.items[bo] && !rec.wicket && !total) { const id = pick(BOWL_ITEMS, rp); if (id === 'cake') this.hypeAdd(bo, 40); else this.items[bo] = id; emit('item', { id, name: ITEMS[id].name, team: bo }); cover('item:' + id); }
    emit('ball:done', { rec });
    for (const [type, data] of evs) emit(type, data);
    if (this.chaosBallDone) this.chaosBallDone(rec);
    const hum = this.isHumanSideIdx();
    if (rec.boundary === 6 && hum === bt) { profile.stats.sixes++; }
    if (rec.boundary === 4 && hum === bt) profile.stats.fours++;
    if (rec.wicket && hum === bo) profile.stats.wickets++;
    if (hum === bo && rec.kmh > profile.stats.fastest) profile.stats.fastest = rec.kmh;
    if (this.cfg.boss && this.bowlerP() && this.bowlerP().machine) { this.bossBalls = (this.bossBalls || 0) + 1; if (rec.wicket) this.bossWicket = true; }
    // what next
    if (this.inningsOver()) {
      if (this.cfg.boss && this.bossBalls && !this.bossWicket) this.flags.bossSurvived = true;
      const r = this.nextInnings();
      if (r === 'result') { this._go('over'); return; }
      this.breakKind = r; this._go('break'); return;
    }
    if (I.legal % 6 === 0 && !rec.wide && !rec.noBall) { this._newOver(); this.holdFor = this.cfg.mode === 'hub' ? .2 : .6; }
    this._go('between');
  },
  _break(dt) {
    // the innings break (or Super Over) card: the scene shows it; it waits for confirm or 6 s (the tea treat in story)
    if (this.needTea) return;
    if (this.st > (this.cfg.mode === 'attract' ? 2.5 : 6) || this.breakGo) { this.breakGo = false; this._go('between'); }
  }
});
// the dead state's update (one name for the director)
Match.prototype._dead = function (arg) {
  if (typeof arg === 'string') return Match.prototype._enterDead.call(this, arg);
  this._deadStep(arg);
  if (this.state === 'dead' && this._deadCheck()) this._finishBall();
};

// ---- 24-ai.js ----
// ---- controllers: a virtual pad the CPU presses (VPad), the CPU's batting, bowling and captaincy (5.8), the actors'
// animation state between events, and the recorder for replays (5.11.3).
class VPad {
  constructor() { this._p = {}; this._d = {}; this._m = [0, 0]; this.aimTh = null; this.mg = null; }
  tap(a) { this._p[a] = true; }
  hold(a, on = true) { this._d[a] = on; }
  pressed(a) { return !!this._p[a]; }
  down(a) { return !!this._d[a] || !!this._p[a]; }
  move() { return this._m; }
  mouseGround() { return this.mg; }
  _tick() { this._p = {}; }
}
// a human player's input, wrapped so the match reads one interface (move, presses, the mouse's ground point)
class HPad {
  constructor(I, primary) { this.I = I; this.primary = primary; this.lastMouseT = -9; }
  pressed(a) { return this.I.pressed(a); }
  down(a) { return this.I.down(a); }
  move() { return this.I.move(); }
  groundDir(m) { return game && game.view ? game.view.screenDirToGround(m[0], m[1]) : m; }
  // the mouse aims while it moved in the last second (player one only)
  mouseGround() {
    if (!this.primary || !game || HEADLESS) return null;
    const I = this.I; if (!I.mouse || I.lastDevice !== 'mouse') return null;
    if (game.real - (this._mt || 0) > 1 && I.mouse.t === this._lastT) return null;
    if (I.mouse.t !== this._lastT) { this._lastT = I.mouse.t; this._mt = game.real; }
    const g = game.mouseGround(); if (!g) return null;
    return [g[0] - OX, g[1] - OY];
  }
  clickedEnd() {
    if (!this.primary || HEADLESS || !game.input.clicked()) return null;
    const g = game.mouseGround(); if (!g) return null; const x = g[0] - OX, y = g[1] - OY;
    return hyp(x, y) < 60 ? 0 : hyp(x, y - 320) < 60 ? 1 : null;
  }
}
Object.assign(Match.prototype, {
  ctlForRaw: Match.prototype.ctlFor,
  ctlFor(role) { const I = this.ctlForRaw(role); if (!I) return null; this._hp = this._hp || new Map(); if (!this._hp.has(I)) this._hp.set(I, new HPad(I, I === (game && game.input))); return this._hp.get(I); },
  // ---------------------------------------------------------------- the CPU's thinking, each step before the play
  _think(dt) {
    const s = this.state;
    if (s === 'setup' && !this.isHuman('bowl')) {
      if (!this.bowlPlan) this.bowlPlan = this.aiPlanBowl();
      if (this.st >= this.bowlPlan.wait) { const v = this.vpad('bowl'); this.marker.x = this.bowlPlan.tx; this.marker.y = this.bowlPlan.ty; v.tap(this.bowlPlan.btn); this.aiMeter = this.bowlPlan.meter; this.bowlPlan = null; }
    }
    if (s === 'runup' && !this.isHuman('bat')) {
      const v = this.vpad('bat');
      if (this.st < dt * 1.5 && this.specialReady(this.batT) && (this.ballsLeft() <= 6 || rp() < .2) && !this.cfg.script) v.tap('special');
      if (this.st < dt * 1.5 && this.batPlanCharge === undefined) { const p = this.striker().p, pb = this.bowlerP(); this.batPlanCharge = pb && pb.bowl && pb.bowl.fam === 'spin' && rp() < .12 * (p.style === 'slogger' ? 2 : 1) * (T('aiAggression') + .5) && !this.cfg.script; }
      if (this.batPlanCharge && this.st > this.runupDur * .55) { v.tap('charge'); this.batPlanCharge = false; }
    }
    if (s === 'flight' && !this.isHuman('bat')) {
      const v = this.vpad('bat');
      if (!this.batPlan) this.batPlan = this.aiPlanBat();
      const pl = this.batPlan;
      if (pl && !pl.done && pl.btn) { v.aimTh = pl.th; if (this.st >= pl.at) { v.tap(pl.btn); pl.done = true; } }
    }
    if (s !== 'flight') { this.batPlan = null; const v = this.vpads && this.vpads.bat; if (v) v.aimTh = null; }
    if (s !== 'runup' && s !== 'flight') this.batPlanCharge = undefined;
    // a human fielder's catch ring press is read from his pad
    if (this.catchQTE && this.isHuman('field')) { const pad = this.pad('field'); if (pad.pressed('shot') && this.catchQTE.press === null && this.t >= this.catchQTE.start - .2) this.catchQTE.press = this.t; }
  },
  aiPlanBowl() {
    const p = this.bowlerP(), dels = p.bowl.del, h = this.strikerHand(), sk = p.bowl.skill || 6;
    const sc = this.cfg.script && this.cfg.script.next ? this.cfg.script.next('bowl', this) : null;
    let k = sc && sc.del ? Math.max(0, dels.indexOf(sc.del)) : (() => { const r = rp(); return r < .55 ? 0 : r < .8 ? 1 : 2; })();
    if (sc && sc.del && !dels.includes(sc.del)) this.dev.forceDelivery = { del: sc.del };
    if (sc && sc.special) this.hype[this.bowlT] = 100;
    if (!sc && this.ballsLeft() <= 3 && dels.includes('yorker') && rp() < .5) k = dels.indexOf('yorker');
    const d = DELIVERIES[dels[k]];
    const special = (sc && sc.special) || (!sc && this.specialReady(this.bowlT) && (this.ballsLeft() <= 6 || rp() < .3) && difficulty !== 'village');
    let lineOff = d.fam === 'spin' ? (d.turn > 0 ? -1 + rp() * 4 : 3 + rp() * 4) : 3 + rp() * 5;
    lineOff -= d.swing * 11 * T('swing') * (this.weather === 'overcast' ? 1.5 : 1);   // aim inside the swing
    if (d.turn) lineOff -= d.turn * .6 * this.env.turn;
    let len = d.len[0] + rp() * (d.len[1] - d.len[0]);
    const acc = T('aiBowlAccuracy') * (1.4 - sk * .07);
    let tx = -h * lineOff + gauss(rp) * acc * .3, ty = PITCH.crease + len + gauss(rp) * acc;
    if (sc && sc.target) { tx = sc.target[0] * h; ty = sc.target[1]; }
    const r = rp(), gp = .35 + sk * .055, grade = sc && sc.grade ? sc.grade : r < .015 ? 'over' : r < gp ? 'green' : r < gp + (1 - gp) * .75 ? 'amber' : 'red';
    const wait = this.cfg.mode === 'hub' || this.cfg.mode === 'showdown' ? .5 : this.cfg.mode === 'attract' ? .3 : this.cfg.mode === 'nets' ? 1.4 : .6 + rp() * .6;
    return { btn: special ? 'special' : ['shot', 'loft', 'block'][k], tx, ty: clamp(ty, 22, 240), wait, meter: { at: .2 + rp() * .4, grade } };
  },
  aiPlanBat() {
    const b = this.ball, h = this.strikerHand(), p = this.striker().p, env = this.env;
    const sc = this.cfg.script && this.cfg.script.next ? this.cfg.script.next('bat', this) : null;
    const cy = this.contactY(), a = arrival(b, cy.y, env);
    if (!a) return null;
    const line = -h * a.x, z = a.z, band = cy.band;
    const st = arrival(b, 0, env), onStumps = st && Math.abs(st.x) < STUMPS.hw + 1 && st.z < STUMPS.h + 1;
    let agg = T('aiAggression') + (p.style === 'slogger' ? .3 : 0) + ((p.pow || 5) - 5) * .03;
    const need = this.need(), left = this.ballsLeft();
    if (need !== null) { const rr = need / Math.max(1, left) * 6; agg += (rr - 9) / 9; if (need <= 0) agg = 0; }
    else agg += (this.I.legal / (this.I.overs * 6)) * .3;
    agg -= .15 * this.I.wkts / Math.max(1, this.I.wmax);
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') agg += .3;
    agg = clamp(agg, need !== null && need <= 0 ? 0 : .25, 1);
    let btn = null, th = 0;
    if (sc) { btn = sc.btn === 'leave' ? null : sc.btn; th = (sc.th || 0) * DEG; }
    else if (line > 13 && !onStumps) { if (band === 'short' && rp() < agg) { btn = 'shot'; th = 100 * DEG; } else if (band === 'full' && rp() < agg * .7) { btn = 'shot'; th = 65 * DEG; } }
    else if (band === 'short') { if (z > 28) { if (rp() < agg * .8) { btn = 'loft'; th = -80 * DEG; } } else { btn = rp() < agg * .5 ? 'loft' : 'shot'; th = (line > 6 ? 100 : -75) * DEG; } }
    else if (band === 'yorker') { btn = agg > .7 && p.style === 'slogger' ? 'loft' : 'block'; th = 0; if (agg > .5 && btn === 'block') { btn = 'shot'; th = -20 * DEG; } }
    else if (band === 'full') { btn = rp() < agg * .75 ? 'loft' : 'shot'; th = this.aiGap(btn, line); }
    else { if (onStumps || line > 2) btn = rp() < .35 + agg * .8 ? (rp() < agg * .5 ? 'loft' : 'shot') : 'block'; else btn = rp() < .5 + agg * .4 ? 'shot' : null; th = this.aiGap(btn || 'shot', line); }
    // a steep chase: swing at nearly everything in reach
    if (!btn && !sc && need !== null && need / Math.max(1, left) * 6 > 10 && line < 16) { btn = band === 'short' ? 'loft' : rp() < .7 ? 'loft' : 'shot'; th = band === 'short' ? -80 * DEG : this.aiGap(btn, line); }
    if (!btn) return { btn: null };
    const shot = this.resolveShot(btn, th, band, line, z);
    // out of the shot's reach: defend it if it threatens the stumps, else let it go
    if (this._zoneMiss(shot, line, z) > 6 && !sc) { if (onStumps) { btn = 'block'; } else return { btn: null }; }
    const sh2 = this.resolveShot(btn, th, band, line, z);
    // the autopilot playing for a human side (dev Auto-bat, the campaign bot) plays like a competent person, not the CPU at this difficulty
    let sig = (this.isHumanSide(this.batT) ? TUNE.aiBatSkill * .5 : T('aiBatSkill')) / 1000 * (this.effects.aiK || 1) * (13 - (p.tech || 5)) / 8 * (DELIVERIES[this.del.id].fam === 'spin' && (p.tech || 5) < 5 ? 1.2 : 1);
    if (this.effects.vanish) sig *= 1.3;
    let err = gauss(rp) * sig;
    if (sc) err = { PERFECT: 0, GOOD: .06, EARLY: -.12, LATE: .12, MISS: -.3 }[sc.grade || 'PERFECT'] || 0;
    if (this.cfg.cheat && this.cfg.cheat.perfect && this.cheatSide === this.batT) err = 0;
    return { btn, th, at: Math.max(0, a.t - sh2.at + err), done: false };
  },
  // the direction with the most room: ground shots into the widest gap, lofted ones over the fewest deep fielders
  aiGap(btn, line) {
    const h = this.strikerHand(), base = this.naturalDir(btn, line > 9 ? 'good' : 'full', line) / DEG;
    let best = base, bs = -1e9;
    for (let d = -60; d <= 60; d += 10) {
      const th = (base + d) * DEG; let sc = -Math.abs(d) * .3;
      for (const f of this.fielders) {
        if (f.role === 'keeper' || f.role === 'bowler') continue;
        const dist = hyp(f.x, f.y), fa = angOf(f.x, f.y, h), da = Math.abs(wrapA(fa - th)) / DEG;
        if (btn === 'loft') { if (dist > 250 && da < 25) sc -= 40; }
        else if (dist < 330 && da < 30) sc -= (30 - da) * 2;
      }
      if (sc > bs) { bs = sc; best = base + d; }
    }
    return best * DEG;
  },
  aiPickBowler(list) {
    const last = this.I.lastBowler ? this.squads[this.bowlT].find(p => p.id === this.I.lastBowler) : null;
    let best = list[0], bs = -1e9;
    for (const p of list) {
      const c = this.bowlCard(p.id); let s = (p.bowl.skill || 5) - c.overs * 3 + rp() * 2;
      if (last && last.bowl && last.bowl.fam !== p.bowl.fam) s += 1.5;
      if (p.bsp) s += .5;
      if (p.bowl.fam === 'spin' && this.env.turn > 1.2) s += 2;
      if (p.bowl.fam === 'swing' && this.weather === 'overcast') s += 2;
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  },
  aiPickField() {
    const p = this.bowlerP(), left = this.ballsLeft();
    if (p && p.bowl && p.bowl.fam === 'spin') return 'spin';
    if (left <= 6 && this.I.overs > 1) return 'defensive';
    const need = this.need();
    if (need !== null && need > left * 1.8) return 'attacking';
    return rp() < .35 ? 'attacking' : 'balanced';
  },
  // ---------------------------------------------------------------- the actors between events
  _actors(dt) {
    const all = [...this.batters, ...this.fielders, ...this.umps];
    for (const a of all) { a.animT += dt; if (a.phantom > 0) a.phantom -= dt; }
    const s = this.state, bw = this.bowler(), b0 = this.batters[0], b1 = this.batters[1];
    if (!bw) return;
    if (s === 'runup') {
      // the non-striker backs up; the fielders walk in a few steps, crouched
      b1.y = Math.max(300, 318 - this.st * 14); b1.anim = 'backup';
      for (const f of this.fielders) if (f.role === 'field') { const d = hyp(f.x, f.y); if (d > 40) { f.x -= f.x / d * 12 * dt; f.y -= f.y / d * 12 * dt; } f.anim = 'walkin'; }
    }
    if (s === 'flight' || s === 'inPlay' || s === 'dead') {
      // the follow-through: down the pitch and off to the side
      if (bw.anim === 'deliver' && !bw.hasBall && bw.state !== 'chase' && bw.state !== 'stumps') { const u = Math.min(1, bw.animT / .9); bw.y = 304 - u * 26; bw.x += (this.overRound === 'over' ? 1 : -1) * 18 * dt * (1 - u); }
    }
    if (s === 'flight') { const k = this.keeper(); if (k) { const pr = this._kpPlan || (this._kpPlan = arrival(this.ball, k.y + 2, this.env)); if (pr) k.x += clamp(pr.x - k.x, -140 * dt, 140 * dt); } }
    else this._kpPlan = null;
    if (s === 'dead') {
      const r = this.ballRec;
      if (r && r.wicket && this.st < dt * 1.5) {
        for (const f of this.fielders) { if (f.role !== 'keeper' || r.wicket.how !== 'bowled') { f.anim = 'cheer'; f.animT = rp() * .3; f.expr = 'smile'; } }
        const outB = this.batters.find(bt => bt.card === r.wicket.card) || b0; outB.anim = 'dejected'; outB.animT = 0; outB.expr = 'wince'; outB.out = true;
        bw.anim = 'appealWin'; bw.animT = 0; bw.expr = 'shout';
      }
      if (r && r.boundary && this.st < dt * 1.5) { b0.anim = 'celebrate'; b0.animT = 0; b0.expr = 'smile'; }
      if (this.appeal && this.st < dt * 1.5) { bw.anim = 'appeal'; bw.animT = 0; bw.expr = 'shout'; const k = this.keeper(); if (k) { k.anim = 'appeal'; k.animT = 0; k.expr = 'shout'; } }
    }
    if (s === 'flight' && b0.anim === 'swing' && b0.animT > .75) b0.anim = 'stanceIdle';
    if (s !== 'flight' && s !== 'inPlay' && s !== 'dead' && b0.anim === 'swing' && b0.animT > .75) b0.anim = 'stance';
  },
  // ---------------------------------------------------------------- the recorder: the last 10 s at 60 Hz
  _record(dt) {
    this._recT = (this._recT || 0) + dt;
    if (this._recT < 1 / 60 - 1e-6) return; this._recT = 0;
    if (this.replay) return;
    const fr = { t: this.t, ball: [this.ball.x, this.ball.y, this.ball.z, this.ball.phase, this.ball.fx], a: [] };
    for (const a of [...this.batters, ...this.fielders, ...this.umps]) fr.a.push([a.x, a.y, a.z, a.facing, a.anim, a.animT, a.sw, a.signal, a.expr, a.dive, a.hasBall]);
    this.rec = this.rec || []; this.rec.push(fr); if (this.rec.length > 600) this.rec.shift();
  }
});

// ---- 25-chaos.js ----
// ---- chaos events, weather and the rain delay (5.10). Each event starts between balls, never mid-delivery, ends by
// itself and puts the field back. Critters are simulation objects the scene draws (the cow, peacocks, gulls, the
// chicken, rabbits, dust devils, Fortescue with the tea tray).
Object.assign(Match.prototype, {
  critters: null,
  chaosOverStart() {
    this.critters = this.critters || [];
    const over = Math.floor(this.I.legal / 6);
    for (const id of Object.keys(this.chaosActive)) { const c = this.chaosActive[id]; if (c.until !== undefined && this.overCount() >= c.until) this.endChaos(id); }
    if (this.g.id === 'bay' || this.cfg.ground === 'bay') { if (this.chaosActive.tide) { this.tide = Math.min(.15, (this.tide || 0) + .05); emit('tide', { tide: this.tide }); } }
    // the scripted rain of chapter 4, and a Quick Match in the rain: a delay in the second innings
    if (!this.rainDone && this.i >= 1 && !this.I.so && (this.cfg.rain || this.weather === 'rain') && this.I.legal >= 6 && this.I.overs >= 2) { this.triggerChaos('rain'); return; }
    if (!this.cfg.kerfuffle || this.dev.noChaos || this.cfg.mode === 'hub' || this.cfg.mode === 'nets' || this.cfg.mode === 'showdown') return;
    if (this.cfg.mode === 'attract') return;
    if (rp() < .3 * T('chaosRate')) {
      const pool = (this.g.chaos || []).filter(id => id !== 'rain' && !this.chaosActive[id] && (id !== 'ghosts' || this.teams[this.bowlT].ghosts));
      if (pool.length) this.triggerChaos(pick(pool, rp));
    }
  },
  overCount() { return this.inn.reduce((a, I) => a + Math.floor(I.legal / 6), 0); },
  triggerChaos(id) {
    const C = CHAOS[id]; if (!C) return false;
    this.critters = this.critters || [];
    const until = this.overCount() + (C.overs || 0);
    const R = rp, side = R() < .5 ? -1 : 1;
    this.chaosActive[id] = { until, t: 0 };
    if (id === 'cow') this.critters.push({ kind: 'cow', x: side * 520, y: 40, vx: -side * 9, vy: 4, t: 0, until });
    if (id === 'peacocks') for (let k = 0; k < 2; k++) this.critters.push({ kind: 'peacock', x: (R() * 2 - 1) * 380, y: 160 + (R() * 2 - 1) * 330, vx: 0, vy: 0, t: R() * 5, until, fan: 0 });
    if (id === 'mascot') { this.critters.push({ kind: 'chicken', x: -560, y: 120, vx: 70, vy: 10, t: 0, until }); for (let k = 0; k < 2; k++) this.critters.push({ kind: 'steward', x: -620 - k * 30, y: 110 + k * 30, vx: 62, vy: 10, t: 0, until }); }
    if (id === 'rabbits') for (let k = 0; k < 8; k++) this.critters.push({ kind: 'rabbit', x: -520 + k * 6, y: 300 + R() * 40, vx: 110 + R() * 40, vy: (R() - .5) * 30, t: R(), until: this.overCount() + 1 });
    if (id === 'dustDevil') this.critters.push({ kind: 'devil', x: -300, y: 60, vx: 25, vy: 8, t: 0, until });
    if (id === 'gulls') for (let k = 0; k < 3; k++) this.critters.push({ kind: 'gull', x: (R() * 2 - 1) * 400, y: 160 + (R() * 2 - 1) * 300, z: 80 + R() * 40, t: R() * 6, until, carry: 0 });
    if (id === 'bees') { const fs = this.fielders.filter(f => f.role === 'field'); const f = pick(fs, R); if (f) { f.slow = .7; f.bees = true; this.chaosActive.bees.f = f; } }
    if (id === 'teaTray') { this.critters.push({ kind: 'fortescue', x: -560, y: 160, vx: 90, vy: 0, t: 0, until: this.overCount() + 1, tray: true }); this.holdFor = 3; }
    if (id === 'tide') this.tide = .05;
    if (id === 'fogBank') this.fogBank = 1;
    if (id === 'ghosts') this.ghostsOn = true;
    if (id === 'advert') { this.advert = 3.2; this.holdFor = 3.2; }
    if (id === 'rain') { this.rainDone = true; this.rain = { t: 0, dur: 6 }; this.holdFor = 6.5; this.weatherWas = this.weather; this.weather = 'rain'; this.env.wet = true; }
    if (id === 'fireworks') this.fireworks = 2.5;
    cover('chaos:' + id); emit('chaos', { id, name: C.name, line: C.line });
    return true;
  },
  endChaos(id) {
    const c = this.chaosActive[id]; delete this.chaosActive[id];
    if (id === 'bees' && c && c.f) { c.f.slow = 1; c.f.bees = false; }
    if (id === 'fogBank') this.fogBank = 0;
    if (id === 'ghosts') this.ghostsOn = false;
    this.critters = (this.critters || []).filter(k => !(k.kind === { cow: 'cow', peacocks: 'peacock', mascot: 'chicken' }[id]) && !(id === 'mascot' && k.kind === 'steward') && !(id === 'gulls' && k.kind === 'gull') && !(id === 'dustDevil' && k.kind === 'devil'));
    emit('chaos:end', { id });
  },
  chaosStep(dt) {
    const cs = this.critters || [];
    for (const k of cs) {
      k.t += dt;
      if (k.kind === 'cow') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t * .4) * 3 * dt; if (Math.abs(k.x) > 600) k.vx = -k.vx; }
      if (k.kind === 'peacock') { k.x += Math.cos(k.t * .3) * 10 * dt; k.y += Math.sin(k.t * .23) * 8 * dt; k.fan = Math.max(0, Math.sin(k.t * .5)); }
      if (k.kind === 'chicken' || k.kind === 'steward' || k.kind === 'rabbit' || k.kind === 'fortescue') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t * 3) * (k.kind === 'chicken' ? 30 : 6) * dt; if (k.kind === 'fortescue' && k.x > -40 && k.vx > 0 && k.t > 2) { k.vx = -90; k.tray = false; } }
      if (k.kind === 'devil') { k.x += k.vx * dt; k.y += k.vy * dt + Math.sin(k.t) * 20 * dt; if (Math.abs(k.x) > 500) k.vx = -k.vx; }
      if (k.kind === 'gull') { k.x += Math.cos(k.t * .5) * 60 * dt; k.y += Math.sin(k.t * .7) * 50 * dt; }
    }
    this.critters = cs.filter(k => !((k.kind === 'chicken' || k.kind === 'steward' || k.kind === 'rabbit') && Math.abs(k.x) > 700) && !(k.kind === 'fortescue' && k.x < -620 && k.vx < 0));
    if (this.advert > 0) this.advert -= dt;
    if (this.fireworks > 0) this.fireworks -= dt;
    if (this.rain) {
      this.rain.t += dt;
      if (this.rain.t > this.rain.dur && !this.rain.done) {
        this.rain.done = true; this.weather = this.weatherWas === 'rain' ? 'overcast' : (this.weatherWas || 'clear'); this.env.wet = true;
        const r = this.applyRain(1); this.rainResult = r; emit('rain:end', { target: r ? r.target : null, overs: this.I.overs });
        if (r) cover('kerfuffleMethod');
      }
      if (this.rain.t > this.rain.dur + 3.5) this.rain = null;
    }
  },
  // the ball meets the chaos: the cow's flank, a peacock, a dust devil, a seagull, a ghost
  chaosBall(b, prev, dt) {
    if (b.lastTouch !== 'bat' && b.phase !== 'rolling') return;
    for (const k of this.critters || []) {
      const d = hyp(b.x - k.x, b.y - k.y);
      if (k.kind === 'cow' && d < 18 && b.z < 22 && !k.hit) { k.hit = true; b.vx *= .15; b.vy *= .15; b.vz = 0; b.carried = false; emit('cow:hit', {}); cover('cowHit'); }
      if (k.kind === 'peacock' && d < 14 && b.z < 6 && !b.peacocked) { b.peacocked = true; const a = (rp() * 2 - 1) * 25 * DEG, c = Math.cos(a), s = Math.sin(a), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; emit('peacock', {}); }
      if (k.kind === 'devil' && d < 30 && b.z > 4 && !b.deviled) { b.deviled = true; const a = (rp() * 2 - 1) * 10 * DEG, c = Math.cos(a), s = Math.sin(a), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; emit('devil', {}); }
      if (k.kind === 'gull' && b.phase === 'rolling' && hyp(b.vx, b.vy) < 50 && hyp(b.x, b.y - 160) > 250 && !k.carry && !this.gulled && !this.fielders.some(f => f.hasBall || hyp(f.x - b.x, f.y - b.y) < 20)) {
        this.gulled = true; k.carry = 1; const d2 = hyp(b.x, b.y - 160) || 1; b.x += b.x / d2 * 30; b.y += (b.y - 160) / d2 * 30; k.x = b.x; k.y = b.y; this.bonusThisBall += 2; emit('gull', {}); cover('gull');
      }
    }
    if (this.ghostsOn && this.chaser && this.chaser.p.ghost && !this.ghostedBall && rp() < .3 * dt * 4) { this.ghostedBall = true; this.chaser.phantom = .5; emit('ghost', {}); cover('ghostPhase'); }
  },
  chaosAvoid(f) { for (const k of this.critters || []) if (k.kind === 'cow') { const dx = f.x - k.x, dy = f.y - k.y, d = hyp(dx, dy); if (d < 26 && d > .1) { f.x += dx / d * (26 - d) * .2; f.y += dy / d * (26 - d) * .2; } } },
  chaosBallDone(rec) {
    this.gulled = false; this.ghostedBall = false; for (const k of this.critters || []) k.hit = false;
    if (this.chaosActive.bells === undefined && this.g.chaos.includes('bells') && rec && !rec.runs && !rec.wicket && this.cfg.kerfuffle && rp() < .08 * T('chaosRate') && this.cfg.mode !== 'attract' && this.cfg.mode !== 'hub') { emit('chaos', { id: 'bells', name: CHAOS.bells.name, line: CHAOS.bells.line }); cover('chaos:bells'); }
    if (rec && rec.boundary === 6 && this.time === 'night') { this.fireworks = 2.5; cover('chaos:fireworks'); emit('fireworks', {}); }
  },
  targetPos(tg) { if (tg.moving) return [Math.sin(this.t * .12) * 280, tg.at[1], tg.at[2] + Math.sin(this.t * .3) * 10]; return tg.at; },
  fogLevel() { return (this.weather === 'fog' ? .55 : 0) + (this.fogBank ? .3 : 0) + (this.effects && this.effects.fog ? .2 : 0); }
});

// ---- 26-force.js ----
// ---- forced outcomes: dev mode's "force the next outcome" and the attract mode's showreel both play through this. A
// forced ball runs on the real machinery: the delivery is aimed, the shot is played at the ideal moment, then the ball
// is sent where the outcome needs it (a six over the rope, a catch into a fielder's hands, a direct hit).
const FORCE_LIST = ['six', 'four', 'one', 'dot', 'edge', 'bowled', 'caught', 'lbw', 'runout', 'stumped'];
Object.assign(Match.prototype, {
  forceNext(kind, o = {}) { this.forceQ = kind; this.forceOpts = o; },
  _forceRelease() {
    this.forced = this.forceQ || null; this.forcedOpts = this.forceOpts || {}; this.forceQ = null; this.forceOpts = null; this.forcedLbw = false; this.forceRuns = 0;
    const f = this.forced, h = this.strikerHand(), b0 = this.batters[0];
    if (!f) return;
    cover('forced:' + f);
    const aimAt = (xs, ty) => { this.marker.x = xs + ((this.overRound === 'over' ? 8 : -8) - xs) * (ty / 300); this.marker.y = ty; };
    if (f === 'bowled') aimAt(-2 * h, 45);
    if (f === 'lbw') { aimAt(2 * h, 42); this.forcedLbw = true; }
    if (f === 'stumped') { this.keeperUp = true; const k = this.keeper(); if (k) { k.y = -26; k.x = -6 * h; } aimAt(-7 * h, 70); }
    if (f === 'runout') this.forceRuns = 3;
    if (f === 'one') this.forceRuns = 1;
  },
  _forcePost(b) {
    const f = this.forced; if (!f) return;
    if (f === 'bowled' || f === 'lbw' || f === 'stumped') { b.swingX = 0; b.turnRad = 0; b.seamDev = 0; b.wob = 0; this.noBall = false; }
    const b0 = this.batters[0];
    if (f === 'stumped') { b0.charged = .001; b0.anim = 'charge'; b0.animT = 0; } else if (b0.charged) { b0.charged = 0; b0.y = 14; b0.anim = 'stance'; }
  },
  // the batter's shot for a forced ball: played at the ideal moment
  _forceFlight() {
    const f = this.forced; if (!f || this.swing) return;
    const btn = { six: 'loft', caught: 'loft', four: 'shot', one: 'shot', runout: 'shot', dot: 'block', edge: 'shot', stumped: 'block' }[f];
    if (!btn) return;
    const cy = this.contactY(), a = arrival(this.ball, cy.y, this.env), at = SHOT.straightDrive.at;
    if (!a) return;
    if (f === 'stumped') { if (a.t <= .02) { this._forcing = true; this._press('block'); this._forcing = false; if (this.swing) { this.swing.grade = 'MISS'; } } return; }
    if (a.t <= at + 1 / 240) { const save = this.dev.forceOutcome; this.dev.forceOutcome = 'forced'; this._press(btn); this.dev.forceOutcome = save; }
  },
  _forceContact() {
    const f = this.forced, b = this.ball, h = this.strikerHand(), b0 = this.batters[0], o = this.forcedOpts || {};
    if (!f || !this.contact) return;
    const g = T('gravity');
    const lob = (tx, ty, tz, vh) => { const D = Math.max(1, hyp(tx - b.x, ty - b.y)), t = D / vh * 1.02; b.vx = (tx - b.x) / t; b.vy = (ty - b.y) / t; b.vz = (tz - b.z + .5 * g * t * t) / t; };
    const gapDir = () => { const th = this.aiGap(f === 'six' ? 'loft' : 'shot', 0); return o.th !== undefined ? o.th * DEG : th; };
    if (o.target) { const tg = this.g.targets.find(t => t.id === o.target); if (tg) { const at = this.targetPos(tg), k = T('boundaryScale'); lob(at[0] * k, at[1] * k, at[2], 360); b.fx = b.fx || 'fire'; return; } }
    if (f === 'six') { const w = dirOf(gapDir(), h), D = this.boundaryDist(w[0], w[1]) + 140; lob(w[0] * D, w[1] * D, 0, 340); }
    if (f === 'four') { const w = dirOf(gapDir(), h); b.vx = w[0] * 560; b.vy = w[1] * 560; b.vz = 6; this.forceUnstoppable = true; }
    if (f === 'one') { const deep = this.fielders.filter(q => q.role === 'field').sort((p, q) => hyp(q.x, q.y) - hyp(p.x, p.y))[0]; if (deep) { const d = hyp(deep.x, deep.y), k = (d - 40) / d; lob(deep.x * k, deep.y * k, 0, 420); b.vz = 0; b.z = .5; b.rollK = .35; b.passR = d - 120; } }
    if (f === 'runout') { const fs = this.fielders.filter(q => q.role === 'field').sort((p, q) => Math.abs(hyp(p.x, p.y) - 190) - Math.abs(hyp(q.x, q.y) - 190)); const t = fs[0]; if (t) { lob(t.x * .85, t.y * .85, 0, 210); b.vz = 0; b.z = .5; b.rollK = .2; } }
    if (f === 'caught') { const fs = this.fielders.filter(q => q.role === 'field' && hyp(q.x, q.y) < 420).sort((p, q) => hyp(q.x, q.y) - hyp(p.x, p.y)); const t = fs[0]; if (t) { lob(t.x, t.y, 20, 240); this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); } }
    if (f === 'edge') { const sl = this.fielders.find(q => q.spot === 'slip') || this.keeper(); lob(sl.x, sl.y, 14, 300); this.contact.kind = 'thin'; this.contact.edge = true; emit('ball:edge', { kind: 'thin' }); this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); }
    if (f === 'dot') { b.vx *= .3; b.vy *= .3; b.vz = 0; }
  },
  _forceThrow(f, end) {
    if (this.forced !== 'runout') return null;
    const bt = this.batters.filter(x => x.target !== null).sort((p, q) => Math.abs(q.y - (q.target ? 320 : 0)) - Math.abs(p.y - (p.target ? 320 : 0)))[0];
    return bt ? bt.target : end;
  }
});
// hook the forcing into the director without touching its flow
(() => {
  const P = Match.prototype, rel = P._release, fl = P._flight, ct = P._contact, th = P._throw, pr = P._press, run = P._aiRun;
  P._release = function (grade) { this._forceRelease(); if (this.forced) grade = 'green'; rel.call(this, grade); this._forcePost(this.ball); };
  P._flight = function (dt) { this._forceFlight(); return fl.call(this, dt); };
  P._press = function (btn) { if ((this.forced === 'bowled' || this.forced === 'lbw' || (this.forced === 'stumped' && !this._forcing)) && !this.swing) return; return pr.call(this, btn); };
  P._contact = function (sw) { ct.call(this, sw); this._forceContact(); if (this.forced === 'four' && this.contact) this.ball.unstoppable = true; };
  P._throw = function (f, end) {
    const e = this._forceThrow(f, end);
    if (e === null || e === undefined) return th.call(this, f, end);
    th.call(this, f, e);
    const b = this.ball, sy = e ? 320 : 0, sol = solveThrow(f.x, f.y, 18, 0, sy, 6, T('throwSpeed')); b.vx = sol.vx; b.vy = sol.vy; b.vz = sol.vz;
  };
  P._aiRun = function () {
    if (this.forceRuns && !this.boundaryHit) {
      const [s, n] = this.batters, idle = s.target === null && n.target === null && s.end !== n.end;
      if (idle && this.runs < this.forceRuns && this.t - this.runStart > .25 && this.t - this.lastRunT > .1) this._call('both', 'yes');
      return;
    }
    return run.call(this);
  };
  const dead = P._enterDead;
  P._enterDead = function (why) { const r = dead.call(this, why); if (this.forced) { this.forced = null; this.forceUnstoppable = false; } return r; };
})();

// ---- 30-art.js ----
// ---- art: the cricket shapes (objects as data, drawn by the engine in every view, docs/ASSETS.md), the ground built
// from a recipe (a TileMap: mown stripes, the square, the pitch and its creases, the rope; buildings as walls), the
// far-end panorama for the broadcast camera, the crowd.
const M = (c, pat) => c + (pat ? ' ' + pat : '');
Object.assign(E.SHAPES, {
  ck_stumps: { about: 'three ash stumps and two bails', tags: 'cricket', mats: { s: M('#e8dcb8', 'planks bw=1'), b: '#f4ecd0' },
    parts: [['row', 3, [2.6, 0, 0], ['cyl', 's', [0, 0, 0], .55, 12.5, { seg: 6 }]], ['row', 2, [2.6, 0, 0], ['box', 'b', [0, 0, 12.5], [2.4, .6, .6]]]] },
  ck_stumpsDown: { about: 'stumps knocked back, bails gone', tags: 'cricket', mats: { s: M('#e8dcb8') },
    parts: [['cyl', 's', [-2.6, 0, 0], .55, 12, { seg: 6 }], ['box', 's', [0, -3, 0], [1.1, 1.1, 12], { rot: [0, -38, 0] }], ['box', 's', [2.6, -2, 0], [1.1, 1.1, 12], { rot: [0, -24, 20] }]] },
  ck_sightscreen: { about: 'white boarded sight screen on a scaffold', tags: 'cricket', mats: { w: M('#f4f4ee', 'planks bw=4'), f: M('#6a5a4a') },
    parts: [['box', 'w', [0, 0, 4], [64, 3, 34]], ['mirror', 'x', ['box', 'f', [30, 4, 0], [2, 2, 40]]], ['row', 3, [0, 0, 0], ['box', 'f', [0, 4, 0], [2, 2, 38]]]] },
  ck_adboard: { about: 'boundary advertising board', tags: 'cricket', params: { c: '#2f6b3a', len: 48 }, mats: { f: M('#3a3028') },
    make: p => [['box', p.c, [0, 0, 0], [p.len, 2, 9]], ['box', 'f', [0, 1.5, 0], [p.len, 1, 1.5]]] },
  ck_deckchair: { about: 'striped canvas deck chair', tags: 'village', params: { c: '#d84a3a' }, mats: { w: 'oak' },
    make: p => [['box', 'w', [-5, 0, 0], [1, 9, 8], { rot: [0, 0, 0] }], ['box', 'w', [5, 0, 0], [1, 9, 8]], ['box', p.c + ' cloth', [0, 0, 4], [10, 8, 1], { rot: [-25, 0, 0] }], ['box', p.c + ' cloth', [0, 4, 4], [10, 1, 10], { rot: [-20, 0, 0] }]] },
  ck_scoreboard: { about: 'village scoreboard hut with number plates', tags: 'cricket village', mats: { w: M('#3a5a3a', 'planks'), r: 'slate', n: '#1a1a1a' },
    parts: [['box', 'w', [0, 0, 0], [44, 18, 30]], ['prism', 'r', [0, 0, 30], [[-11, 0], [11, 0], [0, 8]], 48, { axis: 'x' }], ['box', 'n', [0, 9.5, 12], [36, 1, 14]]] },
  ck_pavilionClock: { about: 'pavilion clock tower', tags: 'village', mats: { w: M('#f2ead8', 'planks'), c: '#f8f4e0', r: 'tiles', g: 'gold' },
    parts: [['box', 'w', [0, 0, 0], [16, 16, 30]], ['cyl', 'c', [0, 8.5, 22], 5, 1, { rot: [90, 0, 0] }], ['prism', 'r', [0, 0, 30], [[-9, 0], [9, 0], [0, 10]], 18, { axis: 'x' }], ['cyl', 'g', [0, 0, 40], .8, 8]] },
  ck_church: { about: 'church tower and spire with a weathervane', tags: 'village', mats: { s: 'stone', r: 'slate', g: 'gold' },
    parts: [['box', 's', [0, 0, 0], [34, 34, 70]], ['cyl', 'r', [0, 0, 70], 22, 34, { r2: 0, seg: 4 }], ['cyl', 'g', [0, 0, 104], .8, 8], ['box', 'g', [0, 0, 110], [10, 1, 2]]] },
  ck_greenhouse: { about: 'vicarage greenhouse, glass panes', tags: 'village', mats: { gl: '#bfe8ff glaze', f: '#f4f4f0' },
    parts: [['box', 'gl', [0, 0, 0], [52, 26, 18]], ['prism', 'gl', [0, 0, 18], [[-13, 0], [13, 0], [0, 10]], 52, { axis: 'x' }], ['row', 5, [12, 0, 0], ['box', 'f', [0, 13.5, 0], [1, 1, 18]]]] },
  ck_oak: { about: 'great oak with a beehive', tags: 'village', params: { h: 80 }, mats: { t: 'bark', l: M('#3f7a32', 'foliage'), h: M('#d8a84a', 'thatch') },
    make: p => [['cyl', 't', [0, 0, 0], 6, p.h * .5, { r2: 4 }], ['ball', 'l', [0, 0, p.h * .62], 30, { sz: .75 }], ['ball', 'l', [-18, 6, p.h * .5], 20, { sz: .7 }], ['ball', 'l', [16, -4, p.h * .56], 22, { sz: .7 }], ['lathe', 'h', [8, 12, p.h * .44], [[0, 0], [4, 1], [5, 4], [4, 7], [0, 9]]]] },
  ck_pub: { about: 'The Leaning Wicket pub front, hanging sign', tags: 'village', mats: { b: 'brick', r: 'tiles', w: '#2a3a4a glaze', s: 'oak', p: '#8a2a2a' },
    parts: [['box', 'b', [0, 0, 0], [70, 34, 40]], ['prism', 'r', [0, 0, 40], [[-17, 0], [17, 0], [0, 16]], 74, { axis: 'x' }], ['row', 3, [22, 0, 0], ['box', 'w', [0, 17.5, 18], [12, 1, 12]]], ['box', 'p', [0, 17.5, 0], [12, 1, 16]], ['box', 's', [42, 14, 0], [1.5, 1.5, 34]], ['box', 'p', [42, 20, 22], [1, 12, 10]]] },
  ck_fountain: { about: 'tiered stone fountain', tags: 'hall', mats: { s: 'marble', w: '#6ab8e8 glaze' },
    parts: [['cyl', 's', [0, 0, 0], 22, 5], ['cyl', 'w', [0, 0, 4.5], 19, 1], ['cyl', 's', [0, 0, 5], 3, 14], ['cyl', 's', [0, 0, 18], 10, 2], ['cyl', 'w', [0, 0, 19.5], 8, 1], ['cyl', 's', [0, 0, 20], 1.5, 8]] },
  ck_car: { about: 'a long black vintage motor car with running boards', tags: 'hall', mats: { b: '#1a1a22 glaze', c: 'steel', w: '#2a2a2a', g: '#a8c8e8 glaze' },
    parts: [['box', 'b', [0, 0, 4], [56, 18, 9]], ['box', 'b', [-6, 0, 13], [26, 16, 10]], ['box', 'g', [8, 0, 14], [2, 14, 8]], ['box', 'c', [26, 0, 6], [4, 14, 6]], ['mirror', 'xy', ['cyl', 'w', [18, 9, 4], 4.5, 3, { rot: [90, 0, 0] }]], ['mirror', 'y', ['box', 'c', [0, 10, 3], [40, 3, 1]]]] },
  ck_beachhut: { about: 'striped beach hut', tags: 'beach', params: { c: '#3fb8ff' }, mats: { w: '#f4f4f0 planks bw=3', r: '#e04a3a' },
    make: p => [['box', p.c + ' planks bw=3', [0, 0, 0], [22, 20, 24]], ['prism', 'r', [0, 0, 24], [[-11, 0], [11, 0], [0, 9]], 22, { axis: 'y' }], ['box', 'w', [0, 10.5, 0], [10, 1, 18]]] },
  ck_ferris: { about: 'Ferris wheel on the pier', tags: 'beach', params: { a: 0 }, mats: { m: '#f4f4f0 metal', c: '#e04a3a', y: '#ffd23a' },
    make: p => { const out = [['mirror', 'x', ['box', 'm', [18, 0, 0], [2, 2, 70], { rot: [0, 14, 0] }]]]; for (let k = 0; k < 8; k++) { const a = p.a + k * Math.PI / 4; out.push(['box', 'm', [Math.cos(a) * 26, 0, 64 + Math.sin(a) * 26], [3, 3, 3]], ['box', k % 2 ? 'c' : 'y', [Math.cos(a) * 30, 3, 60 + Math.sin(a) * 30], [7, 6, 6]]); } out.push(['cyl', 'm', [0, 0, 64], 4, 4, { rot: [90, 0, 0] }]); return out; } },
  ck_icecream: { about: 'ice-cream van with a giant cone', tags: 'beach', mats: { v: '#f8f0f0 glaze', p: '#ff8ad8', c: '#d8a860', w: '#2a2a2a' },
    parts: [['box', 'v', [0, 0, 4], [44, 20, 22]], ['box', 'p', [0, 0, 18], [44, 20, 3]], ['cyl', 'c', [0, 0, 26], 5, 12, { r2: 1, rot: [180, 0, 0] }], ['ball', 'p', [0, 0, 39], 6], ['mirror', 'xy', ['cyl', 'w', [14, 10, 4], 4, 2, { rot: [90, 0, 0] }]]] },
  ck_shark: { about: 'inflatable shark', tags: 'beach', mats: { s: '#7a8a9a glaze', w: '#f4f4f0' },
    parts: [['ball', 's', [0, 0, 7], 9, { sz: .6 }], ['ball', 's', [12, 0, 7], 7, { sz: .55 }], ['box', 's', [-2, 0, 12], [6, 2, 10], { rot: [0, 30, 0] }], ['box', 's', [-16, 0, 8], [6, 2, 8], { rot: [0, -30, 0] }], ['box', 'w', [16, 0, 5], [6, 8, 2]]] },
  ck_tophat: { about: "a giant magician's top hat", tags: 'downs', mats: { b: '#1a1a22 cloth', r: '#8a1a3a' },
    parts: [['cyl', 'b', [0, 0, 0], 24, 2], ['cyl', 'b', [0, 0, 2], 15, 34], ['cyl', 'r', [0, 0, 8], 15.4, 5]] },
  ck_tower: { about: 'timber water tower on four braced stilts', tags: 'downs', mats: { w: 'plank', t: M('#8a6a4a', 'planks dir=v'), r: 'slate' },
    parts: [['mirror', 'xy', ['box', 'w', [10, 10, 0], [2.5, 2.5, 56]]], ['cyl', 't', [0, 0, 56], 17, 22], ['cyl', 'r', [0, 0, 78], 18, 8, { r2: 0 }], ['row', 2, [0, 0, 20], ['box', 'w', [0, 10, 18], [22, 1, 2]]]] },
  ck_balloon: { about: 'hot-air balloon', tags: 'downs', mats: { a: '#e04a3a cloth', b: '#ffd23a cloth', k: 'straw' },
    parts: [['ball', 'a', [0, 0, 34], 22, { sz: 1.15 }], ['cyl', 'b', [0, 0, 22], 21, 6], ['box', 'k', [0, 0, 0], [10, 10, 8]], ['mirror', 'xy', ['box', 'k', [4, 4, 8], [.6, .6, 8]]]] },
  ck_caravan: { about: "magician's painted caravan", tags: 'downs', mats: { w: '#5a2a7a planks', r: '#c8ccd8', y: '#ffd23a', k: '#3a2a1a' },
    parts: [['box', 'w', [0, 0, 6], [40, 20, 22]], ['cyl', 'r', [0, 0, 28], 10, 40, { rot: [0, 90, 0], sq: .5 }], ['mirror', 'xy', ['cyl', 'y', [12, 10, 6], 6, 2, { rot: [90, 0, 0] }]], ['box', 'k', [24, 0, 4], [12, 2, 2]]] },
  ck_floodlight: { about: 'lattice floodlight pylon with a lamp bank', tags: 'stadium', mats: { m: 'steel', l: '#fff8e0' },
    parts: [['cyl', 'm', [0, 0, 0], 3, 120, { r2: 1.6, seg: 4 }], ['box', 'm', [0, 0, 118], [26, 4, 16]], ['row', 3, [8, 0, 0], ['box', 'l', [0, 2.4, 122], [6, 1, 8]]]], lights: [[0, 0, 124, '#fff4dc', 220]] },
  ck_jumbotron: { about: 'a giant screen frame on legs', tags: 'dome', mats: { m: 'steel', s: '#1a2a4a glaze' },
    parts: [['mirror', 'x', ['box', 'm', [40, 0, 0], [5, 5, 70]]], ['box', 'm', [0, 0, 64], [100, 6, 56]], ['box', 's', [0, 3.5, 68], [92, 1, 48]]] },
  ck_bell: { about: 'a ghostly bronze bell on a frame', tags: 'dome', mats: { b: 'bronze', w: 'walnut' },
    parts: [['mirror', 'x', ['box', 'w', [14, 0, 0], [3, 3, 60]]], ['box', 'w', [0, 0, 58], [32, 3, 3]], ['lathe', 'b', [0, 0, 36], [[0, 0], [10, 0], [8, 6], [6, 16], [3, 20], [0, 21]]]] },
  ck_laser: { about: 'a stadium laser rig', tags: 'dome', mats: { m: 'steel', l: '#ff3aff glaze' },
    parts: [['box', 'm', [0, 0, 0], [16, 16, 40]], ['box', 'm', [0, 0, 40], [22, 10, 10]], ['row', 3, [6, 0, 0], ['cyl', 'l', [0, 6, 44], 1.5, 2, { rot: [90, 0, 0] }]]] },
  ck_machine: { about: 'the Thrumptonator 3000: a brass steam bowling machine', tags: 'dome', params: { a: 0 }, mats: { b: 'bronze', i: 'iron', g: '#f8f0d0', r: '#8a1a1a' },
    make: p => [['box', 'i', [0, 0, 0], [26, 30, 6]], ['cyl', 'b', [0, 4, 6], 9, 26, { rot: [90, 0, 0] }], ['cyl', 'b', [0, 4, 15], 8, 18], ['cyl', 'i', [0, 4, 33], 3, 10], ['cyl', 'g', [8, 0, 18], 3, 1, { rot: [0, 90, 0] }],
      ['group', [0, -14, 26], 0, [['cyl', 'i', [0, 0, 0], 8, 2, { rot: [90, 0, 0] }], ['box', 'r', [Math.cos(p.a) * 7, 0, Math.sin(p.a) * 7], [3, 3, 3]], ['box', 'r', [-Math.cos(p.a) * 7, 0, -Math.sin(p.a) * 7], [3, 3, 3]]]]] },
  ck_cow: { about: 'Doris, a Friesian cow', tags: 'village', params: { step: 0 }, mats: { w: '#f4f4f0', k: '#1a1a1a', p: '#f0a8a8', h: '#d8c8a0' },
    make: p => { const s = Math.sin(p.step / 16 * Math.PI * 2) * 3; return [['box', 'w', [0, 0, 12], [28, 13, 11]], ['box', 'k', [4, 0, 17], [10, 13.4, 6]], ['box', 'k', [-8, 3, 13], [6, 13.6, 7]], ['box', 'w', [18, 0, 15], [9, 8, 9]], ['box', 'p', [23, 0, 13], [3, 6, 4]], ['mirror', 'y', ['box', 'h', [17, 4, 22], [1, 1, 4]]],
      ['box', 'w', [11 + s, 4, 0], [3, 3, 12]], ['box', 'w', [11 - s, -4, 0], [3, 3, 12]], ['box', 'w', [-11 - s, 4, 0], [3, 3, 12]], ['box', 'w', [-11 + s, -4, 0], [3, 3, 12]], ['box', 'k', [-15, 0, 10], [1, 1, 10], { rot: [0, 20, 0] }]]; } },
  ck_minibus: { about: 'the Kerfuffle Express minibus', tags: 'map', mats: { b: '#2f6b3a glaze', c: '#f2ead8', g: '#a8c8e8 glaze', w: '#2a2a2a' },
    parts: [['box', 'b', [0, 0, 4], [44, 20, 14]], ['box', 'c', [0, 0, 18], [44, 20, 10]], ['row', 4, [10, 0, 0], ['box', 'g', [0, 10.5, 20], [7, 1, 6]]], ['mirror', 'xy', ['cyl', 'w', [14, 10, 4], 4, 2, { rot: [90, 0, 0] }]]] },
  ck_covers: { about: 'blue tarpaulin covers over the pitch', tags: 'cricket', params: { spread: 1 }, mats: { c: '#2a5ad8 cloth' },
    make: p => [['box', 'c', [0, 160 - 170 * p.spread, 0], [56, Math.max(4, 340 * p.spread), 2]], ['cyl', 'c', [0, 160 - 340 * p.spread, 3], 3, 56, { rot: [0, 90, 0] }]] },
  ck_urn: { about: 'a tea urn and cake stand on a trestle table', tags: 'village', mats: { t: 'linen', u: 'steel', c: '#f8d8a8', p: '#ff8ad8' },
    parts: [['box', 't', [0, 0, 10], [40, 14, 2]], ['mirror', 'xy', ['box', 'oak', [17, 5, 0], [2, 2, 10]]], ['cyl', 'u', [-10, 0, 12], 5, 12], ['cyl', 'c', [10, 0, 12], 6, 3], ['cyl', 'p', [10, 0, 15], 4, 3], ['cyl', 'c', [10, 0, 18], 2.5, 3]] },
  ck_hut: { about: 'a striped spectator awning', tags: 'stadium', params: { c: '#d84a3a' }, mats: { p: 'steel' },
    make: p => [['mirror', 'xy', ['box', 'p', [18, 8, 0], [1.5, 1.5, 22]]], ['box', p.c + ' cloth', [0, 0, 22], [40, 20, 2]]] }
});
const TEAM_SHAPE_COLORS = ['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#ff8ad8', '#f4f4f0'];

// ---- the ground: a TileMap from a recipe (OX, OY place the pitch frame in the map's world)
const MAP_W = 138, MAP_H = 120;
function groundRecipe(gid) {
  const G = GROUNDS[gid], B = [];
  // buildings as walls: [x0, y0, x1, y1] in the pitch frame, type
  const add = (x0, y0, x1, y1, t) => B.push([x0, y0, x1, y1, t]);
  const rx = G.rx, ry = G.ry, cy = 160;
  if (G.surround === 'village') { add(-180, cy + ry + 70, 160, cy + ry + 150, 1); add(-rx - 140, 60, -rx - 70, 200, 2); for (let a = 0; a < 40; a++) { const t = a / 40 * TAU, d = 1.18; const x = Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d; if (y < cy + ry * .7 && Math.abs(x + rx + 105) > 120) add(x - 14, y - 14, x + 14, y + 14, 8); } }
  if (G.surround === 'hall') { add(-260, cy - ry - 210, 260, cy - ry - 120, 3); add(-rx - 120, cy + 120, -rx - 70, cy + 300, 8); add(rx + 80, cy - 200, rx + 130, cy + 40, 8); add(-200, cy + ry + 60, 200, cy + ry + 100, 4); }
  if (G.surround === 'beach') { for (let k = 0; k < 9; k++) add(-260 + k * 60, cy - ry - 110, -230 + k * 60, cy - ry - 80, 6); add(-160, cy + ry + 60, 160, cy + ry + 110, 4); add(rx + 60, cy - 120, rx + 110, cy + 120, 4); }
  if (G.surround === 'downs') { add(-200, cy + ry + 60, 200, cy + ry + 100, 4); add(-rx - 110, cy - 200, -rx - 60, cy, 4); add(rx + 60, cy, rx + 110, cy + 200, 4); }
  if (G.surround === 'dome') { for (let a = 0; a < 64; a++) { const t = a / 64 * TAU; for (const [d, ty] of [[1.12, 7], [1.2, 9]]) { const x = Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d; add(x - 22, y - 22, x + 22, y + 22, ty); } } }
  return B;
}
const WALL_TYPES = {
  1: { h: 40, top: '#8a3a2a', side: '#f2ead8', face: 'timber', roof: 'tiles' },
  2: { h: 36, top: '#7a3a2a', side: '#9a4a3a', face: 'brick', roof: 'tiles' },
  3: { h: 64, top: '#6a6a72', side: '#c8bfa8', face: 'stone', roof: 'slab' },
  4: { h: 22, top: '#8a7a6a', side: '#6a5a4a', face: 'plank', roof: 'plain' },
  6: { h: 22, top: '#e04a3a', side: '#3fb8ff', face: 'plank', roof: 'plain' },
  7: { h: 34, top: '#3a3a4a', side: '#2a2a36', face: 'stone', roof: 'plain' },
  8: { h: 16, top: '#3f7a32', side: '#2f6a2a', face: 'hedge', roof: 'leaves' },
  9: { h: 64, top: '#2a2a3a', side: '#1a1a26', face: 'stone', roof: 'plain' }
};
function buildGround(gid) {
  const G = GROUNDS[gid], rows = [];
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('.'));
  for (const [x0, y0, x1, y1, t] of groundRecipe(gid)) {
    for (let cy = Math.floor((y0 + OY) / 16); cy <= Math.floor((y1 + OY) / 16); cy++) for (let cx = Math.floor((x0 + OX) / 16); cx <= Math.floor((x1 + OX) / 16); cx++) if (cy >= 1 && cy < MAP_H - 1 && cx >= 1 && cx < MAP_W - 1) grid[cy][cx] = String(t);
  }
  for (const r of grid) rows.push(r.join(''));
  const legend = { '.': { floor: 'grass' } }; const types = {};
  for (const k of Object.keys(WALL_TYPES)) { legend[k] = +k; types[+k] = Object.assign({}, WALL_TYPES[k]); }
  if (G.surround === 'dome') { types[7] = Object.assign({}, WALL_TYPES[7], { cut: true }); types[9] = Object.assign({}, WALL_TYPES[9], { cut: true }); }
  const grass = G.grass.map(E.hex), pitch = E.hex(G.pitch), rope = E.hex(G.rope), worn = E.hex(E.shade(G.pitch, -.12)), square = E.hex(E.shade(G.grass[0], .08));
  const k = T('boundaryScale'), brx = G.rx * k, bry = G.ry * k;
  const sur = { village: '#4f8a3a', hall: '#a8a090', beach: '#e8d39a', downs: '#b89a62', dome: '#24242e' }[G.surround];
  const surr = E.hex(sur), surr2 = E.hex(E.shade(sur, -.1)), sea = E.hex('#2a8ad0'), seaLt = E.hex('#5ab8f0');
  const noise = (x, y) => { const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return n - Math.floor(n); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, f) => [a[0] * f, a[1] * f, a[2] * f];
  const floorTex = (wx, wy) => {
    const x = wx - OX, y = wy - OY, n = noise(Math.floor(wx), Math.floor(wy));
    const e = (x / brx) ** 2 + ((y - 160) / bry) ** 2;
    if (e > 1) {
      const dd = Math.sqrt(e) - 1;
      if (dd < .012) return mul(rope, .96 + n * .04);
      if (dd < .02) return mul(grass[1], .7);
      if (G.surround === 'beach' && x < -brx - 40) return mix(sea, seaLt, (Math.sin(y * .05 + x * .02) > .7 ? .5 : 0) + n * .15);
      if (G.surround === 'village' && Math.abs(y - (160 + bry + 40)) < 14) return mul(E.hex('#c8b890'), .9 + n * .1);   // the lane past the pavilion
      if (G.surround === 'dome') return mix(surr, surr2, (Math.floor(x / 16) + Math.floor(y / 16)) & 1 ? .6 : 0);
      return mix(surr, surr2, n * .6 + (dd > .25 ? .3 : 0));
    }
    // the pitch
    if (Math.abs(x) <= PITCH.halfW && y > -22 && y < 342) {
      let c = pitch;
      const endWear = Math.min(Math.abs(y - 10), Math.abs(y - 310)) < 30 && Math.abs(x) < 12;
      if (endWear) c = mix(pitch, worn, .55 + n * .2);
      c = mul(c, .95 + n * .07);
      const line = (v, w) => Math.abs(v) <= w;
      if ((line(y - 20, .8) || line(y - 300, .8)) && Math.abs(x) <= PITCH.halfW) return [246, 244, 236];
      if ((line(y, .8) || line(y - 320, .8)) && Math.abs(x) <= 14) return [246, 244, 236];
      if (line(Math.abs(x) - PITCH.retX, .8) && ((y > -8 && y < 22) || (y > 298 && y < 328))) return [246, 244, 236];
      if (Math.abs(x) < 2.2 && (Math.abs(y) < 1.4 || Math.abs(y - 320) < 1.4)) return mul(worn, .7);
      return c;
    }
    // the square, then mown stripes
    if (Math.abs(x) < 110 && y > -50 && y < 370) { const st = (Math.floor((x + 1000) / 20) & 1); return mul(square, (st ? .97 : 1.02) + n * .05); }
    const stripe = gid === 'hall' ? (Math.floor((x + y + 4000) / 40) & 1) : (Math.floor((x + 1000) / 32) & 1);
    const base = stripe ? grass[0] : grass[1];
    return mul(base, .94 + n * .1 + (G.surround === 'downs' && n > .9 ? -.15 : 0));
  };
  const map = new E.TileMap({ rows, legend, types, floorTex, outside: sur, ao: 4, chunks: true });
  map._gid = gid;
  return map;
}
// props round each ground: [shape id, x, y, opts] in the pitch frame (targets carry their own landmark)
function groundProps(gid, m) {
  const G = GROUNDS[gid], P = [], k = T('boundaryScale'), rx = G.rx * k, ry = G.ry * k;
  const R = E.rng(gid.length * 97 + 3);
  // sight screens at both ends, just beyond the rope; boards round the rope
  P.push(['ck_sightscreen', 0, 160 - ry - 26, { facing: Math.PI / 2 }], ['ck_sightscreen', 0, 160 + ry + 26, { facing: -Math.PI / 2 }]);
  const ads = [['#2f6b3a', 'KERFUFFLE TEAS'], ['#c8402a', "CRUMB'S CAKES"], ['#22305a', 'THRUMPTON HOLDINGS'], ['#d8a03a', 'LEANING WICKET ALES']];
  for (let a = 0; a < 44; a++) { const t = a / 44 * TAU, x = Math.cos(t) * (rx + 12), y = 160 + Math.sin(t) * (ry + 12); if (Math.abs(x) < 50) continue; P.push(['ck_adboard', x, y, { facing: Math.atan2(160 - y, -x), params: { c: ads[a % 4][0], len: 44 } }]); }
  if (G.surround === 'village') {
    P.push(['ck_pub', -rx - 90, 120, { facing: 0 }], ['ck_greenhouse', rx + 50, 330, { facing: Math.PI }], ['ck_church', 420, -520, { facing: Math.PI / 2 }], ['ck_oak', -470, -330, {}], ['ck_scoreboard', 260, 160 + ry + 60, { facing: -Math.PI / 2 }], ['ck_pavilionClock', 0, 160 + ry + 100, { facing: -Math.PI / 2 }], ['ck_urn', -120, 160 + ry + 50, { facing: -Math.PI / 2 }]);
    for (let n = 0; n < 26; n++) { const t = R() * TAU, x = Math.cos(t) * (rx + 30 + R() * 20), y = 160 + Math.sin(t) * (ry + 30 + R() * 20); P.push(['ck_deckchair', x, y, { facing: Math.atan2(160 - y, -x), params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); }
    for (let n = 0; n < 14; n++) { const t = n / 14 * TAU + .2, x = Math.cos(t) * (rx + 170), y = 160 + Math.sin(t) * (ry + 170); P.push(['tree', x, y, { params: { h: 50 + R() * 30, seed: n } }]); }
  }
  if (G.surround === 'hall') { P.push(['ck_fountain', -rx + 60, 360, {}], ['ck_car', rx + 40, 220, { facing: Math.PI / 2 }]); for (let n = 0; n < 12; n++) { const t = n / 12 * TAU, x = Math.cos(t) * (rx + 160), y = 160 + Math.sin(t) * (ry + 160); P.push(['pine', x, y, { params: { h: 50 + R() * 20, tiers: 4 } }]); } for (let n = 0; n < 16; n++) { const t = R() * TAU; P.push(['ck_deckchair', Math.cos(t) * (rx + 36), 160 + Math.sin(t) * (ry + 36), { params: { c: n % 2 ? '#22305a' : '#d8b04a' } }]); } }
  if (G.surround === 'beach') { P.push(['ck_ferris', -560, -420, { params: { a: 0 } }], ['ck_icecream', rx - 40, 300, { facing: Math.PI }], ['ck_shark', -rx, 260, {}]); for (let n = 0; n < 12; n++) { const t = n / 12 * TAU + .3; const x = Math.cos(t) * (rx + 120), y = 160 + Math.sin(t) * (ry + 120); if (x > -rx) P.push(['palm', x, y, {}]); } for (let n = 0; n < 9; n++) P.push(['ck_beachhut', -260 + n * 60, 160 - ry - 70, { facing: Math.PI / 2, params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); for (let n = 0; n < 6; n++) P.push(['ck_hut', -200 + n * 80, 160 + ry + 50, { params: { c: TEAM_SHAPE_COLORS[n % 6] } }]); }
  if (G.surround === 'downs') { P.push(['ck_tophat', -rx + 40, 300, {}], ['ck_tower', 520, -470, {}], ['ck_caravan', rx + 60, -60, { facing: Math.PI }]); for (let n = 0; n < 14; n++) { const t = R() * TAU; P.push(['cactus', Math.cos(t) * (rx + 90 + R() * 80), 160 + Math.sin(t) * (ry + 90 + R() * 80), {}]); P.push(['rock', Math.cos(t + 1) * (rx + 70 + R() * 90), 160 + Math.sin(t + 1) * (ry + 70 + R() * 90), { params: { r: 6 + R() * 6, seed: n } }]); } }
  if (G.surround === 'dome') { P.push(['ck_jumbotron', 0, -760, { facing: Math.PI / 2 }], ['ck_bell', 620, -320, {}], ['ck_laser', 600, 380, {}]); }
  if (m && (m.time === 'night' || G.surround === 'dome')) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['ck_floodlight', sx * (rx + 90), 160 + sy * (ry + 90), { facing: Math.atan2(-sy, -sx) }]);
  return P;
}

// ---- 31-cast.js ----
// ---- the cast: a rig per player and role (team kit + personal look + role gear), and the cricket animation layer:
// rig.solvePose is wrapped so the bat's two-handed swings, the bowler's overarm windmill and the umpire's signals are
// placed by IK after the engine's own pose (7).
const RIGS = new Map();
const UMP_LOOK = { ump1: { build: 'heroic', size: 1.18, hair: 'short', face: { glasses: true }, colors: { hair: '#d8d8d8', skin: '#f0c8a8', coat: '#f4f4ee', cloth: '#f4f4ee', pants: '#2a2a32', trim: '#1a1a1a' } },
  ump2: { build: 'bulky', size: 1.18, hair: 'bald', face: { moustache: 'walrus' }, colors: { hair: '#8a6a4a', skin: '#e8b090', coat: '#f4f4ee', cloth: '#f4f4ee', pants: '#2a2a32' } } };
function rigFor(p, gear) {
  const key = (p ? p.id : 'x') + ':' + gear;
  if (RIGS.has(key)) return RIGS.get(key);
  let o;
  if (gear === 'ump') { const L = UMP_LOOK[p.id] || UMP_LOOK.ump1; o = Object.assign({ weapon: null, outfit: 'coat', sleeves: 'long', hat: { style: 'cap', color: '#f4f4ee' } }, L, { colors: Object.assign({ boot: '#1a1a1a' }, L.colors) }); }
  else {
    const team = TEAM[p.team], kit = team.kit, L = p.look || {};
    const colors = Object.assign({ cloth: kit.cloth, pants: kit.pants, trim: kit.trim, belt: kit.trim, boot: '#f4f4f0', glove: gear === 'keep' ? '#e8d8a0' : undefined, willow: '#ecd9a0', grip: kit.trim }, L.colors || {});
    if (L.outfit === 'coat' && L.colors && L.colors.coat) colors.coat = L.colors.coat;
    let hat = L.hat || null;
    if (gear === 'bat') hat = (p.id === 'basil' || p.id === 'edie' || p.id === 'thrumpton') ? { style: 'cap', color: kit.cap } : { style: 'helmet', color: kit.cap };
    else if (!hat && gear !== 'keep') hat = L.hair === 'bald' || L.hair === 'short' || p.id.length % 3 === 0 ? { style: 'cap', color: kit.cap } : null;
    if (gear === 'keep' && !hat) hat = { style: 'cap', color: kit.cap };
    const face = Object.assign({}, L.moustache ? { moustache: L.moustache } : {}, L.beard ? { beard: true } : {}, L.glasses ? { glasses: true } : {});
    o = { build: L.build || 'heroic', size: L.size || 1.18, hair: L.hair || 'short', hat, outfit: L.outfit || 'shirt', sleeves: gear === 'bat' || gear === 'keep' ? 'long' : 'short', face,
      weapon: gear === 'bat' ? 'bat' : null, bladeLen: 13.5, pads: gear === 'bat' || gear === 'keep', colors };
    if (L.cape) o.cape = { len: 6, width: 5, seg: 2.5 };
    if (p.ghost) o.eyeGlow = '#a8e0ff';
  }
  const rig = new E.Humanoid(o);
  const solve = rig.solvePose;
  rig.solvePose = function () { solve.call(this); if (this._k) { try { POSE[this._k.kind] && POSE[this._k.kind](this, this._k); } catch (e) { /* a pose that fails leaves the engine's */ } } };
  RIGS.set(key, rig);
  return rig;
}
const V = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
function setArm(rig, side, hand, hint) {
  const J = rig.J, o = rig.o, sh = side > 0 ? J.shR : J.shL;
  const [el, hd] = E.ik3(sh, hand, o.armUpper, o.armLower, hint || [-1, side * .7, -.2]);
  J[side > 0 ? 'elbowR' : 'elbowL'] = el; J[side > 0 ? 'handR' : 'handL'] = hd;
}
// keyframes [u, hands (rel. to the shoulder centre, in the shot frame: a = the shot's direction, b = across, z), bat dir]
const BAT_KEYS = {
  stance: [[0, [2.2, 1.2, -8.6], [.12, .35, -.93]]],
  back: [[0, [.4, 3.2, -1.6], [-.25, .6, .78]]],
  vert: [[0, [.4, 3.2, -1.6], [-.25, .6, .78], 'back'], [1, [2.6, .2, -7.8], [.18, .1, -.98], 'frame'], [1.9, [3.2, -.6, .8], [.55, -.1, .83], 'frame'], [2.8, [2.4, -.4, -.8], [.5, 0, .86], 'frame']],
  loft: [[0, [.2, 3.4, -.8], [-.3, .6, .75], 'back'], [1, [2.6, .2, -7], [.25, .1, -.96], 'frame'], [1.9, [2.6, -1, 3.6], [.4, -.3, .87], 'frame'], [2.8, [1.4, -2.6, 2.4], [-.2, -.6, .78], 'frame']],
  horiz: [[0, [.6, 3.4, -.4], [-.2, .7, .68], 'back'], [1, [3, .6, -3.2], [.15, -.98, -.1], 'frame'], [1.9, [1.2, -3, -1.4], [-.8, -.5, .2], 'frame'], [2.8, [.2, -3.4, 1], [-.6, -.4, .7], 'frame']],
  sweep: [[0, [.6, 3, -2], [-.2, .7, .68], 'back'], [1, [3.4, .6, -8.6], [.2, -.96, -.2], 'frame'], [1.9, [1, -3, -5], [-.8, -.5, .1], 'frame'], [2.8, [0, -3, 0], [-.6, -.4, .7], 'frame']],
  glance: [[0, [.6, 2.6, -2.4], [-.2, .5, .84], 'back'], [1, [2.6, .4, -7.2], [-.3, .2, -.93], 'frame'], [1.9, [2, .6, -4], [-.5, .3, .8], 'frame']],
  block: [[0, [.8, 2.4, -3], [-.1, .5, .86], 'back'], [1, [3.4, .2, -7.2], [.3, .05, -.95], 'frame'], [2.8, [3.4, .2, -7.2], [.3, .05, -.95], 'frame']],
  scoop: [[0, [1, 2, -6], [.2, .3, -.93], 'back'], [1, [3.2, .4, -6], [.6, .1, -.79], 'frame'], [1.9, [1.4, 2.2, 3], [-.6, .3, .74], 'frame']],
  heli: [[0, [.4, 3.2, -1.6], [-.25, .6, .78], 'back'], [1, [2.6, .2, -8], [.18, .1, -.98], 'frame'], [1.5, [2.6, -2, 1], [.2, -.8, .5], 'frame'], [2.1, [.6, 2.4, 3], [-.6, .6, .5], 'frame'], [2.8, [2.6, -1, 3], [.5, -.3, .8], 'frame']]
};
const FAM_KEYS = { drive: 'vert', flick: 'vert', loft: 'loft', pull: 'horiz', cut: 'horiz', sweep: 'sweep', glance: 'glance', block: 'block', scoop: 'scoop', heli: 'heli' };
function batPose(rig, k) {
  const J = rig.J, h = k.h || 1, sC = J.shC;
  // the shot frame in the rig's own frame (x forward = the off side, y right): a points where the ball goes
  const th = k.th || 0, a = [Math.sin(th), -h * Math.cos(th)], b = [-a[1], a[0]];
  const toLocal = (v, frame) => frame ? [v[0] * a[0] + v[1] * b[0], v[0] * a[1] + v[1] * b[1], v[2]] : [v[0], v[1] * h, v[2]];
  let H, D;
  if (k.ph === 'swing') {
    const keys = BAT_KEYS[FAM_KEYS[k.fam] || 'vert'], u = k.t / Math.max(.06, k.at);
    let i = 0; while (i < keys.length - 1 && keys[i + 1][0] < u) i++;
    const A = keys[i], B = keys[Math.min(keys.length - 1, i + 1)], t = B === A ? 0 : ease((u - A[0]) / (B[0] - A[0]));
    const ha = toLocal(A[1], A[3] === 'frame'), hb = toLocal(B[1], B[3] === 'frame'), da = toLocal(A[2], A[3] === 'frame'), db = toLocal(B[2], B[3] === 'frame');
    H = V.lerp(ha, hb, t); D = V.norm(V.lerp(da, db, t));
    if (u > 3.4) { const r = ease((u - 3.4) / 2); H = V.lerp(H, toLocal(BAT_KEYS.stance[0][1]), r); D = V.norm(V.lerp(D, toLocal(BAT_KEYS.stance[0][2]), r)); }
  } else {
    const s = BAT_KEYS.stance[0], bk = BAT_KEYS.back[0], l = ease(k.lift || 0);
    H = V.lerp(toLocal(s[1]), toLocal(bk[1]), l); D = V.norm(V.lerp(toLocal(s[2]), toLocal(bk[2]), l));
    if (!k.lift) { H[2] += Math.sin(rig.t * 5) * .25; }   // tapping the bat
  }
  const hand = V.add(sC, H);
  setArm(rig, 1, hand, [-1, .6, -.4]);
  setArm(rig, -1, V.add(J.handR, V.mul(D, -2.2)), [-1, -.7, -.3]);
  J.bladeDir = D;
}
const POSE = {
  bat: batPose,
  // the bowler's delivery stride: the front arm up, then the bowling arm windmills over the top (the release at the top front)
  bowl(rig, k) {
    const J = rig.J, o = rig.o, t = k.t, R = o.armUpper + o.armLower;
    const u = clamp((t - .02) / .26, 0, 1), al = (210 - 290 * ease(u)) * DEG;
    const hR = V.add(J.shR, [Math.cos(al) * R * .95, .6, Math.sin(al) * R * .95]);
    setArm(rig, 1, hR, [-.3, 1, 0]);
    const ul = clamp(t / .22, 0, 1), al2 = (80 - 140 * ease(ul)) * DEG;
    setArm(rig, -1, V.add(J.shL, [Math.cos(al2) * R * .9, -1.2, Math.sin(al2) * R * .9]), [-.3, -1, 0]);
  },
  // the umpire: hands behind the back; signals: OUT, FOUR, SIX, WIDE, NO BALL, BYE, LEG BYE, NOT OUT, FREE HIT, REVIEW
  signal(rig, k) {
    const J = rig.J, o = rig.o, R = o.armUpper + o.armLower, t = k.t, s = k.s, slow = k.slow || 1;
    const rest = side => V.add(side > 0 ? J.shR : J.shL, [-2.2, side * .2, -R * .75]);
    let hr = rest(1), hl = rest(-1);
    const up = ease(t / (.5 * slow));
    if (s === 'out') hr = V.lerp(hr, V.add(J.shR, [1.5, .4, R * .95]), up);
    if (s === 'six') { hr = V.lerp(hr, V.add(J.shR, [.5, 1.2, R * .95]), up); hl = V.lerp(hl, V.add(J.shL, [.5, -1.2, R * .95]), up); }
    if (s === 'four') { const w = Math.sin(t * 7); hr = V.lerp(hr, V.add(J.shR, [R * .8, -2 + w * 4, -1]), up); }
    if (s === 'wide') { hr = V.lerp(hr, V.add(J.shR, [0, R * .95, 0]), up); hl = V.lerp(hl, V.add(J.shL, [0, -R * .95, 0]), up); }
    if (s === 'noball') hr = V.lerp(hr, V.add(J.shR, [0, R * .95, 0]), up);
    if (s === 'bye') hr = V.lerp(hr, V.add(J.shR, [R * .5, .5, R * .7]), up);
    if (s === 'legbye') { hr = V.lerp(hr, V.add(J.hipR, [3, 1, 1]), up); }
    if (s === 'notout') { hr = V.lerp(hr, V.add(J.shR, [3, -1.5, -4]), up); hl = V.lerp(hl, V.add(J.shL, [3, 1.5, -4]), up); }
    if (s === 'freehit') { const c = t * 8; hr = V.lerp(hr, V.add(J.shR, [Math.cos(c) * 1.5, Math.sin(c) * 1.5, R * .9]), up); }
    if (s === 'review') { const c = clamp((t - .4) / .8, 0, 1); hr = V.lerp(hr, V.add(J.shC, [R * .8, 3 + (c < .5 ? -c * 8 : -4), 2 - (c > .5 ? (c - .5) * 10 : 0)]), up); hl = V.lerp(hl, V.add(J.shC, [R * .8, -3, 2]), up); }
    setArm(rig, 1, hr, [-1, .7, -.2]); setArm(rig, -1, hl, [-1, -.7, -.2]);
  },
  // fielder catching: hands cupped in front, at a height
  cup(rig, k) { const J = rig.J, z = k.z || 0; setArm(rig, 1, V.add(J.shC, [5.5, 1.2, z]), [-1, .7, -.3]); setArm(rig, -1, V.add(J.shC, [5.5, -1.2, z]), [-1, -.7, -.3]); },
  keep(rig, k) { const J = rig.J; setArm(rig, 1, V.add(J.shC, [4.2, 1.6, -5]), [-1, .7, -.3]); setArm(rig, -1, V.add(J.shC, [4.2, -1.6, -5]), [-1, -.7, -.3]); }
};
// what each actor's rig is told this step (rig.update's state and the post-pose)
function rigState(a, m) {
  const st = { x: a.x + OX, y: a.y + OY, z: a.z || 0, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing };
  let k = null;
  const an = a.anim, t = a.animT || 0;
  if (a.role === 'bat') {
    const h = (a.p && a.p.hand) || 1;
    if (an === 'stance' || an === 'stanceIdle') { let lift = 0; if (m && (m.state === 'flight' || (m.state === 'runup' && m.st > m.runupDur - .5))) lift = m.state === 'flight' ? 1 : (m.st - (m.runupDur - .5)) / .5; k = { kind: 'bat', ph: 'stance', lift, h }; st.vx = st.vy = 0; st.facing = h > 0 ? Math.PI : 0; }
    else if (an === 'swing' && a.sw) { k = { kind: 'bat', ph: 'swing', t, fam: a.sw.fam, at: a.sw.at, th: a.sw.th, h }; st.vx = st.vy = 0; st.facing = h > 0 ? Math.PI : 0; }
    else if (an === 'charge') { st.vy = 90; st.facing = Math.PI / 2 + (h > 0 ? .9 : -.9); }
    else if (an === 'dive') { st.down = .55; }
    else if (an === 'celebrate') { st.pose = 'cheer'; st.expr = 'smile'; }
    else if (an === 'dejected') { st.pose = t < 1.2 ? 'kneel' : null; st.hunch = true; if (t > 1.2) { st.vx = 30; st.facing = 0; } }
    else if (an === 'backup' || an === 'backupIdle') { st.facing = -Math.PI / 2; }
  } else if (a.role === 'bowler' || a.role === 'field' || a.role === 'keeper') {
    if (an === 'deliver') { k = { kind: 'bowl', t }; st.hop = t < .14 ? Math.sin(t / .14 * Math.PI) * 3 : 0; if (t > .3) st.pose = null; }
    else if (an === 'runup') { st.vx = 0; st.vy = a.vy || -200; st.facing = -Math.PI / 2; }
    else if (an === 'appeal' || an === 'appealWin' || an === 'cheer') { st.pose = 'cheer'; st.expr = 'shout'; }
    else if (an === 'throw') st.attack = E.move('throw', clamp(t / .42, 0, 1));
    else if (an === 'dive' || an === 'diveCatch') { st.down = t < .5 ? .6 : Math.max(0, .6 - (t - .5) * 2); if (an === 'diveCatch' && t > .7) st.pose = 'cheer'; }
    else if (an === 'catch') { if (t < .5) k = { kind: 'cup', z: 2 }; else st.pose = 'cheer'; }
    else if (an === 'gather') { st.pose = 'crouch'; k = { kind: 'cup', z: -6 }; }
    else if (an === 'drop') { st.pose = 'crouch'; st.expr = 'wince'; }
    else if (an === 'walkin') { st.crouch = true; st.vx = -Math.cos(a.facing) * 6; st.vy = -Math.sin(a.facing) * 6; st.vx = Math.cos(a.facing) * 8; st.vy = Math.sin(a.facing) * 8; }
    else if (an === 'keep') { st.pose = 'crouch'; k = { kind: 'keep' }; }
    else if (an === 'stump') { k = { kind: 'cup', z: -4 }; }
  } else if (a.role === 'ump') {
    k = { kind: 'signal', s: a.signal, t, slow: a.p && a.p.id === 'ump1' ? 1.6 : 1 };
  }
  if (a.expr && !st.expr) st.expr = a.expr;
  return { st, k };
}
function poseRig(rig, a, m, dt) { const { st, k } = rigState(a, m); rig._k = k; rig.update(dt, st); return rig; }
function gearOf(a) { return a.role === 'bat' ? 'bat' : a.role === 'keeper' ? 'keep' : a.role === 'ump' ? 'ump' : 'field'; }

// ---- 34-world.js ----
// ---- the match on screen: four fixed views cut like TV (5.11), the camera director, the ground and its props, the
// crowd, the actors, the ball with its trail and effects, the marker and aim arrow, the catch ring, Owl-Eye, critters,
// lights, fog and weather. Draw order: floor, decals, the depth-sorted queue, lighting, overlays (the HUD is 44-hud.js).
const VIEWS = {};
function makeViews() {
  VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, T('camPitch'), T('camScale'), 1);
  VIEWS.wide = new E.View('wide', 'Wide', 0, 52, T('wideScale'), 1);
  VIEWS.close = new E.View('close', 'Close-up', 0, 24, 2.3, 1);
  VIEWS.side = new E.View('sideon', 'Side-on', 90, 12, 2.1, 1);
  VIEWS.story = new E.View('story', 'Three-quarter', 0, 40, .9, 1);
  VIEWS._k = [T('camPitch'), T('camScale'), T('wideScale')].join();
}
const WORLD = { map: null, gid: null, props: [], crowd: [], pano: {}, shot: 'broadcast', shotT: 0, focus: [0, 70, 0] };
function useGround(gid, m) {
  if (WORLD.gid !== gid || !WORLD.map) { WORLD.map = buildGround(gid); WORLD.gid = gid; WORLD.crowd = makeCrowd(gid); }
  WORLD.props = groundProps(gid, m);
  if (!VIEWS.broadcast || VIEWS._k !== [T('camPitch'), T('camScale'), T('wideScale')].join()) makeViews();
}
function makeCrowd(gid) {
  const G = GROUNDS[gid], R = E.rng(gid.length * 31 + 7), out = [], k = T('boundaryScale'), rx = G.rx * k, ry = G.ry * k;
  const n = Math.round(160 + G.crowd * 260);
  for (let i = 0; i < n; i++) {
    const t = R() * TAU, d = 1.05 + R() * (G.surround === 'dome' ? .2 : .12);
    let x = Math.cos(t) * rx * d, y = 160 + Math.sin(t) * ry * d, z = 0;
    if (G.surround === 'dome') z = d > 1.15 ? 64 : 34;
    if (G.surround === 'beach' && x < -rx) continue;
    if (Math.abs(x) < 50 && Math.abs(y - 160) > ry) continue;   // the sight screens
    out.push({ x, y, z, c: pick(['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#8a5ad8', '#e8803a'], R), s: pick(['#f2c8a0', '#c88a5a', '#7a4a2a', '#e8b890'], R), h: pick(['#1a1a22', '#6a4020', '#d8b060', '#8a8a8a'], R), ph: R() * TAU, um: R() < .4 });
  }
  return out;
}
const SPR = {};
function spr() {
  if (SPR.ball) return SPR;
  SPR.ball = E.sprite(['.rr.', 'rRRr', 'rRRr', '.rr.'], { r: '#9a1a22', R: '#d83a3a' });
  SPR.ballW = E.sprite(['.ww.', 'wWWw', 'wWWw', '.ww.'], { w: '#d8d8d0', W: '#ffffff' });
  SPR.ballP = E.sprite(['.pp.', 'pPPp', 'pPPp', '.pp.'], { p: '#d8508a', P: '#ff8ad8' });
  SPR.holo = E.sprite(['.cc.', 'cCCc', 'cCCc', '.cc.'], { c: '#3ad8ff', C: '#c8f8ff' });
  SPR.peacock = [E.sprite(['..b.', '.bb.', 'bbbg', '.gg.', '.k.k'], { b: '#2a6ad8', g: '#2a9a5a', k: '#8a6a3a' }), E.sprite(['g.g.g.g', '.gbgbg.', '..bbb..', '..bbg..', '...g...', '..k.k..'], { b: '#2a6ad8', g: '#2a9a5a', k: '#8a6a3a' })];
  SPR.gull = [E.sprite(['w...w', '.wwww', '..ww.'], { w: '#f4f4f0' }), E.sprite(['.....', 'wwwww', '..ww.'], { w: '#f4f4f0' })];
  SPR.rabbit = E.sprite(['w.w', 'www', 'www'], { w: '#c8b8a8' });
  SPR.chicken = [E.sprite(['..rr', '.yyy', 'yyyy', 'yyyy', '.o.o'], { r: '#e03a2a', y: '#ffe060', o: '#e8a030' }), E.sprite(['..rr', '.yyy', 'yyyy', 'yyyy', 'o..o'], { r: '#e03a2a', y: '#ffe060', o: '#e8a030' })];
  SPR.bee = E.sprite(['yk', 'ky'], { y: '#ffd23a', k: '#1a1a1a' });
  const tok = (c, l) => E.sprite(['.dddddd.', 'dccccccd', 'dcllllcd', 'dclcclcd', 'dcllllcd', 'dccccccd', '.dddddd.'], { d: E.shade(c, -.4), c, l });
  for (const id in ITEMS) SPR['tok_' + id] = tok(ITEMS[id].color, '#ffffff');
  const fan = ['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#8a5ad8', '#e8803a'];
  SPR.fan = fan.map(c => [E.sprite(['.h.', 'hsh', 'ccc', 'ccc'], { h: '#3a2a1a', s: '#f2c8a0', c }), E.sprite(['c.c', 'hsh', 'ccc', 'ccc'], { h: '#3a2a1a', s: '#f2c8a0', c })]);
  SPR.umb = E.sprite(['.uuu.', 'uuuuu', '..k..'], { u: '#2a5ad8', k: '#1a1a1a' });
  return SPR;
}
// ---- the camera director (5.11.2)
function director(m, dt) {
  const s = m.state, b = m.ball, H = game.H || 240;
  let shot = 'broadcast';
  if (s === 'inPlay' || (s === 'dead' && (m.boundaryHit || m.deadWhy === 'caught' || m.deadWhy === 'runout' || m.deadWhy === 'settled' || m.deadWhy === 'cap'))) {
    const far = hyp(b.x, b.y - 80) > 150 || b.z > 50 || (m.contact && m.contact.speed > 300 && m.st > .12) || b.phase === 'throw';
    if (WORLD.shot === 'wide' || far) shot = 'wide';
  }
  if (s === 'dead' && m.ballRec && m.ballRec.wicket && m.st < 1.4 && !m.replay) shot = 'close';
  if (m.review && m.review.t < 3.9) shot = 'side';
  if (m.third && !m.third.done) shot = 'side';
  if (m.replay && m.replay.on) shot = m.replay.shot || (m.boundaryHit ? 'wide' : 'broadcast');
  if (m.rain && !m.rain.done) shot = 'wide';
  if (s === 'break' || s === 'over') shot = 'wide';
  if (WORLD.forceShot) shot = WORLD.forceShot;
  if (shot !== WORLD.shot) { WORLD.shot = shot; WORLD.shotT = 0; game.setView(VIEWS[shot]); emit('cam', { shot }); cover('cam:' + shot); }
  WORLD.shotT += dt;
  const v = VIEWS[shot], k = v.scale * Math.sin(v.pitchDeg * DEG);
  let fx = 0, fy = 70, fz = 0, smooth = 0;
  if (shot === 'broadcast') { fy = 14 + (.5 - .46) * H / k; fx = 0; }
  if (shot === 'wide') {
    const bb = m.replay && m.replay.on ? (m.replayFrame && m.replayFrame.ball) || [b.x, b.y, b.z] : [b.x, b.y, b.z];
    let tx = bb[0], ty = bb[1];
    if (!m.replay && m.intercept && s === 'inPlay') { tx = (b.x * 2 + m.intercept.x) / 3; ty = (b.y * 2 + m.intercept.y) / 3; }
    if (s === 'break' || s === 'over' || (m.rain && !m.rain.done)) { tx = 0; ty = 160; }
    fx = tx; fy = ty; fz = Math.min(40, bb[2] * .3); smooth = .22;
  }
  if (shot === 'close') { const r = m.ballRec; let tx = 0, ty = 10; if (r && r.wicket && r.wicket.how === 'caught' && m.catcher) { tx = m.catcher.x; ty = m.catcher.y; } if (r && r.wicket && r.wicket.how === 'run out' && m.runout) { ty = m.runout.end ? 310 : 10; } fx = tx; fy = ty; fz = 10; }
  if (shot === 'side') { fx = 0; fy = m.third ? (m.runout && m.runout.end ? 300 : 20) : 20; fz = 10; }
  if (WORLD.focusOverride) [fx, fy, fz] = WORLD.focusOverride;
  game.cam.smooth = smooth;
  WORLD.focus = [fx, fy, fz];
  game.focus(OX + fx, OY + fy, fz);
}
// ---- drawing the match world
const FRAME_ACTORS = [];
function drawWorld(r, m, dt) {
  const S_ = spr(), G = m.g, rf = m.replay && m.replay.on ? replayFrame(m) : null; m.replayFrame = rf;
  // lights by the time of day
  const L = game.lights; L.enabled = true;
  const amb = { day: .97, dusk: .72, night: .48 }[m.time] || .95;
  L.ambient = m.weather === 'overcast' ? Math.min(amb, .82) : m.weather === 'rain' ? Math.min(amb, .7) : amb;
  if (WORLD.shot === 'broadcast') drawPanoramaBack(r, m);
  WORLD.map.drawFloor(r); WORLD.map.queueWalls(r);
  if (WORLD.shot === 'broadcast') r.queue(OX, OY - 182, 0, g => drawPanorama(g, r, m), { bias: -1 });
  for (const [id, x, y, o] of WORLD.props) {
    if (E.SHAPES[id]) r.shape(id, OX + x, OY + y, 0, Object.assign({ light: m.time === 'night' }, o));
    else r.prop(id, OX + x, OY + y, 0, o);
  }
  // targets: broken ones show it
  for (const tg of G.targets) {
    const at = m.targetPos(tg), hit = m.targetsHit.includes(tg.id);
    if (tg.id === 'balloon') r.shape('ck_balloon', OX + at[0], OY + at[1], at[2] - 30, {});
    if (hit) r.queue(OX + at[0], OY + at[1], at[2], g => { const p = r.w(OX + at[0], OY + at[1], at[2]); if (Math.floor(game.time * 4) % 2) E.font.text(g, 'SMASHED', p[0], p[1] - 16, '#ffd23a', { align: 'center', shadow: '#000' }); }, { bias: 2 });
  }
  // the machine bowls in place of a rig
  const bw = m.bowler(), mach = bw && bw.p.machine;
  // stumps at both ends
  for (const e of [0, 1]) {
    const down = m.stumpsDown && m.stumpsDown[1] === e && (!rf || rf.t >= m.stumpsDown[0]);
    const sawn = down && m.stumpsDown[2] === 'sawn';
    if (sawn) {   // Sawn in Half: the stumps cut through, the top halves sliding apart, sawdust in the air
      const u = clamp((game.time - (m.sawnAt || (m.sawnAt = game.time))) / .6, 0, 1);
      r.shape('ck_stumps', OX, OY + e * 320, 0, { facing: Math.PI / 2, scale: 1.12, params: {} });
      r.queue(OX, OY + e * 320, 8, g => { const p = r.w(OX, OY + e * 320, 7); px.rect(g, p[0] - 8, p[1] - 1, 16, 2, '#4a3020'); for (const sd of [-1, 1]) { const ox = Math.round(sd * u * 7), oy = -Math.round(u * 4); px.rect(g, p[0] + ox - (sd < 0 ? 7 : 0), p[1] - 8 + oy, 7, 7, '#e8dcb8'); px.rect(g, p[0] + ox - (sd < 0 ? 7 : 0), p[1] - 8 + oy, 7, 1, '#f4ecd0'); } px.line(g, p[0] - 10, p[1] - 2, p[0] + 10, p[1] - 2, '#ffd23a'); }, { bias: 1 });
      if (Math.random() < .3) game.particles.bits(OX, OY + e * 320, 7, 2, ['#d8b880', '#f4e0b0']);
    } else { m.sawnAt = null; r.shape(down ? 'ck_stumpsDown' : 'ck_stumps', OX, OY + e * 320, 0, { facing: Math.PI / 2, scale: 1.12 }); }
  }
  // the crowd: fans round the rope and on the stands; they jump for boundaries, umbrellas in the rain
  const cheer = WORLD.cheer > 0, rain = m.weather === 'rain';
  for (const f of WORLD.crowd) {
    const bob = cheer ? Math.max(0, Math.sin(game.time * 12 + f.ph)) * 4 : Math.sin(game.time * 2 + f.ph) > .97 ? 1 : 0;
    const sp = rain && f.um ? S_.umb : S_.fan[(f.c.charCodeAt(2) + f.c.charCodeAt(4)) % S_.fan.length][cheer && Math.sin(game.time * 12 + f.ph) > 0 ? 1 : 0];
    r.sprite(OX + f.x, OY + f.y, f.z + bob, sp, { anchor: 'bottom' });
  }
  // critters
  for (const k of m.critters || []) {
    if (k.kind === 'cow') r.shape('ck_cow', OX + k.x, OY + k.y, 0, { facing: k.vx > 0 ? 0 : Math.PI, params: { step: Math.floor(k.t * 8) % 16 } });
    else if (k.kind === 'peacock') r.sprite(OX + k.x, OY + k.y, 0, S_.peacock[k.fan > .6 ? 1 : 0], { anchor: 'bottom', scale: 2 });
    else if (k.kind === 'gull') r.sprite(OX + k.x, OY + k.y, k.z, S_.gull[Math.floor(k.t * 5) % 2], { scale: 2 });
    else if (k.kind === 'rabbit') r.sprite(OX + k.x, OY + k.y, Math.abs(Math.sin(k.t * 9)) * 4, S_.rabbit, { anchor: 'bottom', scale: 2 });
    else if (k.kind === 'chicken') r.sprite(OX + k.x, OY + k.y, Math.abs(Math.sin(k.t * 10)) * 3, S_.chicken[Math.floor(k.t * 8) % 2], { anchor: 'bottom', scale: 4 });
    else if (k.kind === 'steward' || k.kind === 'fortescue') { const rig = rigFor({ id: k.kind, team: k.kind === 'fortescue' ? 'gen' : 'ker', look: k.kind === 'fortescue' ? TEAM.gen.stars[1].look : { build: 'bulky', colors: { cloth: '#f8d020' } } }, 'field'); rig._k = null; rig.update(dt, { x: OX + k.x, y: OY + k.y, z: 0, vx: k.vx, vy: k.vy, facing: Math.atan2(k.vy, k.vx), pose: k.tray ? 'cast' : null }); r.shadow(OX + k.x, OY + k.y, 6, .3); r.actor(OX + k.x, OY + k.y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); }
    else if (k.kind === 'devil') { if (Math.floor(game.time * 30) % 3 === 0) game.particles.dust(OX + k.x + Math.cos(game.time * 9) * 10, OY + k.y + Math.sin(game.time * 9) * 10, Math.random() * 40, 2); }
  }
  if (m.tide > 0) { const b = m.boundary(); r.decal(() => { for (let a = Math.PI * .55; a < Math.PI * 1.45; a += .05) { const x0 = Math.cos(a) * b.rx * (1 - m.tide), y0 = 160 + Math.sin(a) * b.ry; for (let k = 0; k < 3; k++) { const f = 1 + k * .02 + Math.sin(game.time * 1.5 + a * 9) * .01; r.groundDisc(OX + x0 * f - 6, OY + y0, 14, k ? '#5ab8f0' : '#f4f8ff', k ? .55 : .7); } } }); }
  // the item token
  if (m.token) { const t = m.token; r.sprite(OX + t.x, OY + t.y, t.z + Math.sin(game.time * 3) * 3, S_['tok_' + t.id], { glow: .6, scale: WORLD.shot === 'broadcast' ? 1 : 2 }); r.shadow(OX + t.x, OY + t.y, 5, .25); }
  // actors (live, or from the recorder in a replay)
  const list = [...m.batters, ...m.fielders, ...m.umps];
  for (let i = 0; i < list.length; i++) {
    let a = list[i];
    if (rf) { const q = rf.a[i]; if (!q) continue; a = Object.assign(FRAME_ACTORS[i] || (FRAME_ACTORS[i] = {}), { p: a.p, role: a.role, x: q[0], y: q[1], z: q[2], facing: q[3], anim: q[4], animT: q[5], sw: q[6], signal: q[7], expr: q[8], dive: q[9], hasBall: q[10], vx: 0, vy: 0 }); }
    if (!a.p) continue;
    if (a.role === 'parked') { r.shape('ck_machine', OX + a.x, OY + a.y, 0, { facing: 0, params: { a: game.time } }); continue; }
    if (a.role === 'bowler' && mach) { r.shape('ck_machine', OX + 6, OY + 318, 0, { facing: -Math.PI / 2, params: { a: game.time * (m.state === 'runup' ? 14 : 2) }, scale: 1.2 }); if (Math.random() < .3) game.particles.smoke(OX + 6, OY + 322, 46, 1, { size: 1 }); continue; }
    const rig = rigFor(a.p, gearOf(a));
    poseRig(rig, a, rf ? null : m, dt);
    const ghost = a.p.ghost, alpha = (ghost ? (.5 + .2 * Math.sin(game.time * 5 + i)) : 1) * (a.phantom > 0 ? .3 : 1);
    if (m.fogLevel && m.fogLevel() > .3 && hyp(a.x - WORLD.focus[0], a.y - WORLD.focus[1]) > 400) continue;
    r.shadow(OX + a.x, OY + a.y, 6, .3);
    const fire = m.fire.batOn && a.role === 'bat' && a === m.batters[0];
    r.actor(OX + a.x, OY + a.y, a.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { alpha: alpha < 1 ? alpha : undefined, ghost: ghost ? { color: '#a8e0ff', life: .2, alpha: .3, owner: a } : undefined, outline: a.role === 'field' && m.catchQTE && m.catchQTE.f === a ? '#ffd23a' : undefined });
    if (fire && Math.random() < .5) { const tp = rig.tip(); game.particles.fire(tp[0], tp[1], tp[2], 1, { size: .8 }); }
    if (a.bees && Math.random() < .4) game.particles.add({ kind: 'spark', x: OX + a.x + (Math.random() - .5) * 16, y: OY + a.y + (Math.random() - .5) * 16, z: 20 + Math.random() * 14, vx: 0, vy: 0, vz: 0, life: .2, color: '#ffd23a' });
    if (a.hasBall && !rf) r.queue(OX + a.x, OY + a.y, 14, g => { const p = r.w(OX + m.ball.x, OY + m.ball.y, m.ball.z); px.rect(g, p[0] - 1, p[1] - 1, 2, 2, '#c82a32'); }, { bias: 1 });
  }
  // the ball (and Triple Threat's holograms)
  const b = rf ? { x: rf.ball[0], y: rf.ball[1], z: rf.ball[2], phase: rf.ball[3], fx: rf.ball[4] } : m.ball;
  if (b.phase !== 'held' && b.phase !== 'carried') drawBall(r, m, b, S_, rf);
  for (const hb of m.holos) if (hb.phase === 'delivery' && Math.floor(game.time * 20) % 3) { r.sprite(OX + hb.x, OY + hb.y, hb.z, S_.holo, { anchor: 'center', glow: .7 }); }
  // the marker (a human bowler) and the aim arrow (a human batter)
  const st = m.state;
  if (!rf && (st === 'setup' || st === 'runup') && m.isHuman('bowl')) {
    const mk = m.marker; r.decal(() => { r.groundRing(OX + mk.x, OY + mk.y, 7, '#ffd23a', .9); r.groundRing(OX + mk.x, OY + mk.y, 3.5, '#ffffff', .8); });
    if (Math.floor(m.I.legal / 6) < 2) r.decal(() => { for (const [y0, y1, c] of [[20, 44, '#ff6a6a'], [44, 90, '#ffd23a'], [90, 150, '#7ae07a'], [150, 240, '#7ad0ff']]) r.groundDisc(OX, OY + (y0 + y1) / 2, 2, c, .5); });
  }
  if (!rf && (st === 'flight' || st === 'runup' || st === 'setup') && m.isHuman('bat') && m.aim !== null && m.aim !== undefined) {
    const b0 = m.batters[0], h = m.strikerHand(), w = dirOf(m.aim, h);
    r.decal(() => { for (let k = 1; k <= 6; k++) r.groundDisc(OX + b0.x + w[0] * (8 + k * 7), OY + b0.y + w[1] * (8 + k * 7), k === 6 ? 2.6 : 1.4, '#ffd23a', .85); });
  }
  if (!rf && m.effects && !m.effects.fog && S('marker') && m.isHuman('bat') && st === 'flight' && m.ball.phase === 'delivery' && !m.ball.pitched && m.cfg.mode !== 'attract') {
    const a = m._predPitch || (m._predPitch = arrival(m.ball, 30, m.env));
    if (a && a.pitchY) r.decal(() => r.groundRing(OX + a.pitchX, OY + a.pitchY, 3, '#ffffff', .5));
  }
  if (st !== 'flight') m._predPitch = null;
  // Statistical Certainty: a ring closing on the bat at the perfect moment
  if (!rf && m.batSpecial === 'stats' && st === 'flight' && !m.swing) { const cy = m.contactY(), a = arrival(m.ball, cy.y, m.env); if (a) { const tt = a.t - SHOT.straightDrive.at, b0 = m.batters[0]; r.decal(() => r.groundRing(OX + b0.x, OY + b0.y, 4 + Math.max(0, tt) * 60, '#7ae0ff', .9)); } }
  // the catch ring
  if (!rf && m.catchQTE && m.t >= m.catchQTE.start - .3) {
    const q = m.catchQTE, u = clamp((q.tCatch - m.t) / T('catchRing'), 0, 1), f = q.f;
    r.decal(() => { r.groundRing(OX + f.x, OY + f.y, 8, '#ffffff', .9); r.groundRing(OX + f.x, OY + f.y, 8 + u * 30, '#ffd23a', .9); });
  }
  // the throw picker over the stumps (a human fielding side holding the ball)
  // Owl-Eye: the ball's path, the pitching and impact discs (a review)
  if (m.review) drawOwlEye(r, m);
  // the rain covers
  if (m.rain && !m.rain.done) r.shape('ck_covers', OX, OY + 160 - 160, 0, { params: { spread: clamp(m.rain.t / 2, 0, 1) } });
  // night: floodlights and a glow on the ball
  if (m.time === 'night') { for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.add(OX + sx * (G.rx + 90), OY + 160 + sy * (G.ry + 90), 120, 900, .6, { color: '#fff4dc' }); L.add(OX, OY + 160, 30, 500, .35, { color: '#fff8e8' }); }
  if (m.time === 'dusk') L.add(OX - 400, OY - 300, 200, 1200, .25, { color: '#ffb060' });
  // fog: a stepped translucency, thicker toward the top of the screen (the far end), and in the wide shot all over
  const fogL = m.fogLevel ? m.fogLevel() : 0;
  if (fogL > 0) { cover('fog'); r.overlay(g => { const H = r.H, W = r.W; for (let y = 0; y < H; y += 8) { const k = WORLD.shot === 'broadcast' ? clamp(1 - y / (H * .9), 0, 1) : .55 + .25 * Math.sin(y * .05 + game.time * .3); const a = Math.round(fogL * k * 6) / 8; if (a > .05) px.blend(g, a, 'normal', () => px.rect(g, 0, y, W, 8, '#b8c4d4')); } }); }
  // fireworks and the weather
  if (m.fireworks > 0 && Math.random() < .12) { const x = OX + (Math.random() - .5) * 800, y = OY + 160 + (Math.random() - .5) * 600; game.particles.explosion(x, y, 160 + Math.random() * 80, .6, { debris: false, freeze: false, shake: 0 }); }
  const wantRain = m.weather === 'rain' || (m.rain && !m.rain.done);
  if (wantRain && (!game.weather || game.weather.kind !== 'rain')) game.weather = { kind: 'rain', amount: .8, wind: .2, lightning: G.storm ? .2 : 0 };
  else if (!wantRain && G.id === 'downs' && (!game.weather || game.weather.kind !== 'sand')) game.weather = { kind: 'sand', amount: .15, wind: .5 };
  else if (!wantRain && game.weather && game.weather.kind === 'rain') game.weather = null;
}
function drawBall(r, m, b, S_, rf) {
  const vanish = m.effects && m.effects.vanish && b.phase === 'delivery' && !rf, flight = vanish ? clamp((300 - b.y) / 300, 0, 1) : 0;
  r.shadow(OX + b.x, OY + b.y, b.z > 40 ? 3 : 2, .45);
  if (vanish && flight > .4 && flight < .65) { if (Math.random() < .3) game.particles.smoke(OX + b.x, OY + b.y, b.z, 1, { color: '#8a3aff', size: .8 }); return; }
  const sp = m.time === 'night' ? (m.g.id === 'dome' ? S_.ballP : S_.ballW) : S_.ball, fx = b.fx;
  const live = !rf;
  if (live) { b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 12) b.trail.shift(); }
  const trail = live ? b.trail.slice() : [];
  const tc = { fire: '#ff8a2a', steam: '#e8f4ff', holy: '#fff8b0', feather: '#f4e8d0', haze: '#ffb060', grudge: '#ff3a3a', ecto: '#a8e0ff', croquet: '#7ae07a', glint: '#ffffff', dust: '#d8c8a0', wobble: '#ffd23a' }[fx] || '#f4f0e0';
  r.queue(OX + b.x, OY + b.y, b.z, g => {
    for (let k = 1; k < trail.length; k++) { const p0 = r.w(OX + trail[k - 1][0], OY + trail[k - 1][1], trail[k - 1][2]), p1 = r.w(OX + trail[k][0], OY + trail[k][1], trail[k][2]); px.blend(g, .15 + k / trail.length * .45, fx ? 'add' : 'normal', () => px.line(g, p0[0], p0[1], p1[0], p1[1], tc)); }
    const p = r.w(OX + b.x, OY + b.y, b.z);
    if (fx === 'grudge') px.disc(g, p[0], p[1], 3, '#ff3a3a');
    if (fx || m.time === 'night') r.glowDisc(g, p[0], p[1], fx ? 7 : 5, tc, .6);
    px.sprite(g, sp, p[0] - 2, p[1] - 2);
  }, { emissive: !!fx || m.time === 'night' });
  if (live && fx && Math.random() < .5) {
    if (fx === 'fire') game.particles.fire(OX + b.x, OY + b.y, b.z, 1, { size: .7 });
    else if (fx === 'steam') game.particles.smoke(OX + b.x, OY + b.y, b.z, 1, { color: '#f4f8ff', size: .7 });
    else if (fx === 'ecto' || fx === 'holy' || fx === 'glint') game.particles.glints(OX + b.x, OY + b.y, b.z, 1, tc);
  }
}
function replayFrame(m) {
  const rq = m.replay, idx = Math.min(rq.to, rq.from + Math.floor(rq.t * 60 * .5));
  return m.rec[idx] || m.rec[m.rec.length - 1];
}
function drawOwlEye(r, m) {
  const rv = m.review, tr = rv.tr, p = m.padHit; if (!p) return;
  const path = (m.rec || []).filter(f => f.t >= (m.releaseT || 0) && f.t <= (m.releaseT || 0) + 3 && (f.ball[3] === 'delivery')).map(f => f.ball);
  const u = clamp(rv.t / 1.6, 0, 1);
  r.queue(OX, OY + 160, 0, g => {
    const pts = path.slice(0, Math.max(2, Math.floor(path.length * u))).map(q => r.w(OX + q[0], OY + q[1], q[2]));
    for (let k = 1; k < pts.length; k++) px.line(g, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], '#ff4a4a', 3);
    if (rv.t > 1.6) { const c = tr.path.slice(0, Math.floor(tr.path.length * clamp((rv.t - 1.6) / .9, 0, 1))).map(q => r.w(OX + q.x, OY + q.y, q.z)); for (let k = 1; k < c.length; k++) px.line(g, c[k - 1][0], c[k - 1][1], c[k][0], c[k][1], '#3ad8ff', 3); }
  }, { bias: 3 });
  r.decal(() => { if (p.pitchX !== null) r.groundDisc(OX + p.pitchX, OY + p.pitchY, 3, tr.pitched === 'outside leg' ? '#ff4a4a' : '#5fd38a', .9); r.groundDisc(OX + p.x, OY + p.y, 3, tr.impact === 'outside off' ? '#ff4a4a' : '#5fd38a', .9); });
}
// ---- the far-end panorama (broadcast only): sky, far scenery, the stands and crowd, the sight screen, the scoreboard
function panoramaFor(gid) {
  if (WORLD.pano[gid] || HEADLESS) return WORLD.pano[gid];
  const G = GROUNDS[gid], W = 760, Hh = 170, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d'), R = E.rng(gid.length * 13 + 1);
  const sky = G.sky, rows = Hh - 40;
  for (let y = 0; y < rows; y++) { const t = y / rows, c0 = t < .5 ? sky[0] : sky[1], c1 = t < .5 ? sky[1] : sky[2], k = t < .5 ? t * 2 : (t - .5) * 2; px.rect(g, 0, y, W, 1, E.mix ? E.mix(c0, c1, k) : (k < .5 ? c0 : c1)); }
  if (G.id === 'dome') for (let k = 0; k < 90; k++) px.dot(g, Math.floor(R() * W), Math.floor(R() * (rows - 20)), R() < .3 ? '#ffffff' : '#8a8ac8');
  // far scenery
  const hz = Hh - 46;
  const hill = (col, amp, base, f) => { for (let x = 0; x < W; x++) { const h = base + Math.sin(x * f + R() * .02) * amp + Math.sin(x * f * 2.7) * amp * .4; px.rect(g, x, hz - h, 1, h + 4, col); } };
  if (G.surround === 'village' || G.surround === 'hall') { hill(E.shade(G.grass[1], -.25), 8, 22, .012); hill(E.shade(G.grass[1], -.12), 6, 12, .02); for (let k = 0; k < 18; k++) { const x = R() * W, h = 10 + R() * 14; px.disc(g, x, hz - 12 - h * .5, h * .5, E.shade('#3f7a32', -.1 - R() * .2)); } }
  if (G.surround === 'village') { px.rect(g, W / 2 + 200, hz - 70, 14, 58, '#8a8478'); for (let k = 0; k < 8; k++) px.rect(g, W / 2 + 200 + k, hz - 70 - (7 - k) * 3, 14 - 2 * k, 3, '#4a4a58'); px.rect(g, W / 2 - 260, hz - 36, 60, 26, '#8a2a2a'); px.rect(g, W / 2 - 264, hz - 42, 68, 7, '#5a3a2a'); }
  if (G.surround === 'hall') { px.rect(g, W / 2 - 120, hz - 52, 240, 44, '#c8bfa8'); px.rect(g, W / 2 - 120, hz - 56, 240, 5, '#8a8478'); for (let k = 0; k < 12; k++) px.rect(g, W / 2 - 110 + k * 19, hz - 44, 8, 12, '#3a4a5a'); px.rect(g, W / 2 - 14, hz - 74, 28, 22, '#c8bfa8'); }
  if (G.surround === 'beach') { px.rect(g, 0, hz - 18, W, 18, '#2a8ad0'); for (let x = 0; x < W; x += 9) px.rect(g, x + (R() * 4 | 0), hz - 18 + (R() * 14 | 0), 4, 1, '#bff0ff'); px.disc(g, 120, hz - 50, 28, '#e04a3a'); px.disc(g, 120, hz - 50, 24, sky[1]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; px.line(g, 120, hz - 50, 120 + Math.cos(a) * 26, hz - 50 + Math.sin(a) * 26, '#f4f4f0'); } }
  if (G.surround === 'downs') { hill('#b88a5a', 16, 26, .008); hill('#a07a4a', 10, 12, .015); px.rect(g, W - 160, hz - 70, 8, 52, '#5a4a3a'); px.rect(g, W - 170, hz - 90, 28, 22, '#8a6a4a'); px.rect(g, 140, hz - 40, 30, 30, '#1a1a22'); px.rect(g, 130, hz - 12, 50, 4, '#1a1a22'); }
  if (G.surround === 'dome') { for (let k = 0; k < 6; k++) { const x = 60 + k * 130; px.line(g, x, hz, x + 40, 0, k % 2 ? '#7a3aff' : '#ff3aff'); } px.rect(g, W / 2 - 70, hz - 64, 140, 50, '#24243a'); px.rect(g, W / 2 - 66, hz - 60, 132, 42, '#1a2a4a'); }
  // the stands with their crowd, the sight screen, the boards, the rope, a sliver of outfield
  const sH = 34, sTop = Hh - 12 - sH;
  px.rect(g, 0, sTop, W, sH, G.id === 'dome' ? '#24243a' : G.id === 'hall' ? '#8a8478' : '#6a5a4a');
  for (let y = sTop + 3; y < sTop + sH - 2; y += 4) for (let x = 0; x < W; x += 3) if (R() < .82) { px.dot(g, x + (R() * 2 | 0), y, pick(['#d84a3a', '#3a7ad8', '#ffd23a', '#2f9a5a', '#f4f4f0', '#ff8ad8', '#e8803a', '#1a1a22'], R)); px.dot(g, x + 1, y - 1, pick(['#f2c8a0', '#c88a5a', '#7a4a2a'], R)); }
  if (G.id !== 'dome') px.rect(g, 0, sTop - 4, W, 4, G.accent);
  px.rect(g, W / 2 - 46, sTop - 10, 92, sH + 10, '#f4f4ee'); px.rect(g, W / 2 - 46, sTop - 10, 92, 1, '#ffffff'); px.rect(g, W / 2 - 46, sTop + sH - 2, 92, 2, '#b8b8b0');
  const bd = sTop + sH;
  for (let x = 0; x < W; x += 44) { const cc = ['#2f6b3a', '#c8402a', '#22305a', '#d8a03a'][(x / 44) % 4]; if (Math.abs(x + 22 - W / 2) > 60) { px.rect(g, x, bd, 43, 6, cc); px.rect(g, x + 6, bd + 2, 30, 1, '#f4f4f0'); } }
  px.rect(g, 0, bd + 6, W, 1, G.rope);
  px.rect(g, 0, bd + 7, W, Hh - bd - 7, G.grass[1]);
  // the scoreboard frame (numbers drawn live)
  px.rect(g, W / 2 + 120, sTop - 46, 110, 44, '#1a1a1a'); px.rect(g, W / 2 + 122, sTop - 44, 106, 40, '#2a3a2a');
  WORLD.pano[gid] = { c, W, H: Hh, sb: [W / 2 + 122, sTop - 44] };
  return WORLD.pano[gid];
}
function drawPanoramaBack(r, m) { r.sky([m.g.sky[0], m.g.sky[1], m.g.sky[2]]); }
function drawPanorama(g, r, m) {
  const P = panoramaFor(m.g.id); if (!P) return;
  const base = r.w(OX, OY - 182, 0), off = (WORLD.focus[0] || 0) * .3;
  const x0 = Math.round(base[0] - P.W / 2 - off), y0 = Math.round(base[1] - P.H + 3);
  g.drawImage(P.c, x0, y0);
  if (y0 > 0) px.rect(g, 0, 0, r.W, y0, m.g.sky[0]);
  const I = m.I, sx = x0 + P.sb[0], sy = y0 + P.sb[1];
  E.font.text(g, m.teams[I.bat].code + ' ' + I.runs + '-' + I.wkts, sx + 4, sy + 4, '#ffd23a');
  E.font.text(g, 'OVERS ' + m.overStr(), sx + 4, sy + 14, '#f4f4f0');
  if (m.target()) E.font.text(g, 'TARGET ' + m.target(), sx + 4, sy + 24, '#7ae07a');
}

// ---- 40-audio.js ----
// ---- audio, all synthesized in code (5.13): the sound effects (engine voices), the crowd engine and the gibberish
// voices (our own Web Audio graphs on the engine's context and its effects bus), and the music (the engine's step
// notation, songs in layers: base, drums when the Hype is up, fire when ON FIRE).
const SFX_DEFS = {
  bat: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35 }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .4 }, { wave: 'triangle', freq: 1240, dur: .05, vol: .15 }],
  batSweet: [{ wave: 'noise', freq: 2400, to: 900, dur: .04, vol: .35 }, { wave: 'sine', freq: 620, to: 380, dur: .09, vol: .45 }, { wave: 'sine', freq: 880, to: 1320, dur: .14, vol: .22 }],
  edge: [{ wave: 'noise', freq: 5200, dur: .02, vol: .25 }, { wave: 'square', freq: 1800, to: 1400, dur: .02, vol: .08 }],
  pitchThud: [{ wave: 'sine', freq: 140, to: 80, dur: .06, vol: .3 }, { wave: 'noise', freq: 400, dur: .03, vol: .08 }],
  stumps: [{ wave: 'triangle', freq: 700, to: 500, dur: .05, vol: .3 }, { wave: 'triangle', freq: 540, to: 420, dur: .06, vol: .25 }, { wave: 'triangle', freq: 860, to: 600, dur: .05, vol: .2 }, { wave: 'noise', freq: 1600, dur: .08, vol: .2 }],
  bails: [{ wave: 'square', freq: 2400, dur: .02, vol: .1 }, { wave: 'square', freq: 2900, dur: .02, vol: .08 }],
  gloves: [{ wave: 'noise', freq: 300, to: 120, dur: .06, vol: .3 }, { wave: 'sine', freq: 110, to: 70, dur: .06, vol: .2 }],
  throwWhoosh: [{ wave: 'noise', freq: 600, to: 2400, dur: .18, vol: .12 }],
  dive: [{ wave: 'noise', freq: 900, to: 200, dur: .3, vol: .14 }],
  board: [{ wave: 'triangle', freq: 220, to: 160, dur: .08, vol: .3 }, { wave: 'noise', freq: 500, dur: .05, vol: .12 }],
  glass: [{ wave: 'noise', freq: 4000, to: 1200, dur: .25, vol: .3 }, { wave: 'sine', freq: 2600, dur: .12, vol: .12 }, { wave: 'sine', freq: 3400, dur: .1, vol: .1 }],
  splash: [{ wave: 'noise', freq: 3000, to: 400, dur: .35, vol: .25 }, { wave: 'sine', freq: 90, to: 60, dur: .15, vol: .25 }],
  gull: [{ wave: 'saw', freq: 1400, to: 900, dur: .18, vol: .1, vib: [22, .06] }, { wave: 'saw', freq: 1300, to: 800, dur: .14, vol: .08, vib: [20, .05] }],
  moo: [{ wave: 'saw', freq: 110, to: 95, dur: .9, vol: .2, vib: [5, .03] }, { wave: 'triangle', freq: 220, to: 190, dur: .9, vol: .1 }],
  bees: [{ wave: 'saw', freq: 220, to: 240, dur: .8, vol: .08, vib: [30, .04] }],
  steam: [{ wave: 'noise', freq: 2000, to: 800, dur: .5, vol: .15 }, { wave: 'sine', freq: 70, to: 50, dur: .1, vol: .3 }],
  firework: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .08 }, { wave: 'noise', freq: 200, to: 60, dur: .5, vol: .35 }],
  hypeFull: { wave: 'square', freq: 'C5', dur: .4, vol: .2, arp: [0, 4, 7, 12], step: .07 },
  fireOn: { wave: 'saw', freq: 'G4', dur: .5, vol: .2, arp: [0, 7, 12, 19], step: .06 },
  special: { wave: 'pulse', freq: 'E5', dur: .5, vol: .2, arp: [0, 5, 9, 12, 17], step: .05 },
  bell: [{ wave: 'sine', freq: 660, dur: .9, vol: .15 }, { wave: 'sine', freq: 1320, dur: .6, vol: .06 }],
  coin: [{ wave: 'square', freq: 1800, to: 2200, dur: .05, vol: .1 }, { wave: 'triangle', freq: 1200, dur: .3, vol: .08, vib: [16, .05] }],
  whistle: [{ wave: 'sine', freq: 2400, to: 2600, dur: .35, vol: .12, vib: [30, .02] }],
  tick: { wave: 'square', freq: 1400, dur: .015, vol: .06 },
  stamp: [{ wave: 'noise', freq: 600, to: 100, dur: .12, vol: .35 }, { wave: 'square', freq: 90, to: 60, dur: .12, vol: .25 }],
  thunder: [{ wave: 'noise', freq: 200, to: 50, dur: 1.4, vol: .35 }]
};
function sfx(name, o) { if (game && game.audio) game.audio.sfx(name, o); }
function defineSfx() { for (const k in SFX_DEFS) game.audio.define(k, SFX_DEFS[k]); }

// ---- our own Web Audio: a voice bus (with its own volume and a compressor) and the crowd engine
const AU = { ready: false, voiceGain: null, crowd: null, voices: [], busyUntil: 0 };
function auCtx() { const A = game && game.audio; return A && A.ctx && !A.failed ? A.ctx : null; }
function auInit() {
  const c = auCtx(); if (!c || AU.ready) return !!c;
  try {
    const out = game.audio._sfxBus || c.destination;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(out);
    AU.voiceGain = c.createGain(); AU.voiceGain.connect(comp); AU.comp = comp;
    // a second of pink-ish noise, looped: the crowd's bed, applause and roars
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    AU.noise = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bed = c.createGain(); bed.gain.value = 0;
    for (const f of [200, 800, 2000]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .8; src.connect(bp); bp.connect(bed); }
    bed.connect(out); src.start();
    AU.crowd = { bed, level: 0, target: 0 };
    AU.ready = true;
  } catch (e) { AU.ready = false; }
  return AU.ready;
}
function voiceVol() { if (!S('voices')) return 0; const v = game.settings ? game.settings.voiceVolume : '100%'; return (parseInt(v, 10) || 100) / 100; }
// the crowd's mood follows events: a six roars for 2 s and keeps an excited murmur for a while
const CROWD = { size: .6, excite: 0, rain: false };
function crowdStep(dt) {
  if (!AU.ready) { if (auCtx()) auInit(); return; }
  CROWD.excite = Math.max(0, CROWD.excite - dt * .05);
  const lvl = (CROWD.size * .12 + CROWD.excite * .2) * (CROWD.rain ? .3 : 1) * (game.audio.muted ? 0 : 1);
  try { AU.crowd.bed.gain.setTargetAtTime(lvl, auCtx().currentTime, .4); } catch (e) { /* ignore */ }
}
function crowdSilence() { if (AU.ready) try { AU.crowd.bed.gain.setTargetAtTime(0, auCtx().currentTime, .05); } catch (e) { /* ignore */ } }
// a roar ('ah'), an 'ooh', a groan: detuned saws through two formant filters
function crowdVoice(kind, dur = 1.6, vol = .18) {
  const c = auCtx(); if (!c || !auInit() || game.audio.muted) return;
  const F = { roar: [750, 1250, 180], ooh: [400, 800, 160], groan: [500, 900, 110], chant: [700, 1150, 200] }[kind] || [750, 1250, 180];
  const t0 = c.currentTime, g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * game.audio.sfxVolume, t0 + .15); g.gain.setTargetAtTime(0, t0 + dur * .6, dur * .3);
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = f2.Q.value = 5;
  f1.connect(g); f2.connect(g); g.connect(AU.comp);
  for (let k = 0; k < 6; k++) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = F[2] * (1 + (k - 3) * .045) * (kind === 'groan' ? 1 : 1 + Math.random() * .05); if (kind === 'groan') o.frequency.linearRampToValueAtTime(F[2] * .7, t0 + dur); o.connect(f1); o.connect(f2); o.start(t0); o.stop(t0 + dur + .5); }
  const n = c.createBufferSource(); n.buffer = AU.noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1200; nf.Q.value = .6; n.connect(nf); nf.connect(g); n.start(t0); n.stop(t0 + dur + .5);
}
// applause: dense short noise grains (hand claps)
function applause(dur = 2, rate = 60, vol = .14) {
  const c = auCtx(); if (!c || !auInit() || game.audio.muted) return;
  const t0 = c.currentTime, n = c.createBufferSource(); n.buffer = AU.noise; n.loop = true;
  const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1800; hp.Q.value = 1.2;
  const g = c.createGain(); g.gain.value = 0; n.connect(hp); hp.connect(g); g.connect(AU.comp);
  const R = RNG.cosmetic;
  for (let t = 0; t < dur; t += 1 / rate) { const a = vol * game.audio.sfxVolume * (1 - t / dur * .7) * (.5 + R() * .5); g.gain.setValueAtTime(a, t0 + t); g.gain.setTargetAtTime(0, t0 + t + .004, .01); }
  n.start(t0); n.stop(t0 + dur + .2);
}
// ---- gibberish voices (Animalese / Simlish style): each syllable a saw through two vowel formants, plosive onsets
const VOWELS = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2100] };
function syllables(text) {
  const out = [], words = String(text).replace(/\{[^}]*\}/g, '').split(/(\s+|[,.!?;:\u2026\u2014-]+)/);
  let k = 0;
  for (const w of words) {
    if (!w) continue;
    if (/^\s+$/.test(w)) { out.push({ gap: .04 }); continue; }
    if (/^[,.!?;:\u2026\u2014-]+$/.test(w)) { out.push({ gap: .15, q: w.includes('?'), ex: w.includes('!') }); continue; }
    const caps = w === w.toUpperCase() && /[A-Z]/.test(w);
    const parts = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+[^aeiouy]*?(?=[^aeiouy]*[aeiouy]|$)|[^aeiouy]+$/g) || [w];
    for (const p of parts) { const v = (p.match(/[aeiouy]/) || ['a'])[0], on = p.match(/^[^aeiouy]+/); out.push({ v, plosive: on && /[pbtdkgcq]/.test(on[0]), fric: on && /[sfzhvxj]/.test(on[0]), caps, i: k++ }); }
  }
  // the pitch contour: a declination across the phrase, a rise at a question, up and louder for '!' and CAPS
  const n = Math.max(1, k); let last = null;
  for (const s of out) { if (s.gap) { if (s.q && last) last.rise = 1.25; if (s.ex && last) last.ex = true; continue; } s.pitch = 1 - .12 * (s.i / n); last = s; }
  for (const s of out) if (!s.gap) { if (s.rise) s.pitch *= s.rise; if (s.caps || s.ex) s.pitch *= 1.3; }
  return out;
}
function say(text, who, o = {}) {
  const c = auCtx(); const prof = typeof who === 'string' ? (VOICES[who] || VOICES.aubrey) : (who || VOICES.aubrey);
  const syl = syllables(text);
  let dur = 0; for (const s of syl) dur += s.gap || (.055 + .055 * (s.caps ? 1.2 : 1)) * (prof.speed || 1);
  if (!c || !auInit() || game.audio.muted || voiceVol() <= 0) return dur;
  const now = c.currentTime;
  if (AU.busyUntil > now + 1.5 && !o.urgent) return dur;   // at most a phrase or two queued
  let t = Math.max(now + .02, o.urgent ? now + .02 : AU.busyUntil);
  const R = RNG.cosmetic, base = prof.base * (o.pitch || 1), vol = .2 * voiceVol() * (o.vol || 1);
  for (const s of syl) {
    if (s.gap) { t += s.gap * (prof.speed || 1); continue; }
    const L = (.055 + R() * .055) * (prof.speed || 1) * (o.shout ? 1.4 : 1), f0 = base * s.pitch * (1 + (R() - .5) * .08) * (o.shout ? 1.25 : 1);
    const F = VOWELS[s.v] || VOWELS.a, nk = prof.nasal ? 1.2 : 1;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * (s.ex || s.caps ? 1.3 : 1), t + .008); g.gain.setValueAtTime(vol, t + L * .7); g.gain.linearRampToValueAtTime(0, t + L + .03);
    const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0] * nk; f2.frequency.value = F[1] * nk; f1.Q.value = f2.Q.value = prof.name === 'MRS CRUMB' ? 3 : 6;
    f1.connect(g); f2.connect(g); g.connect(AU.voiceGain);
    if (prof.whisper) { const n = c.createBufferSource(); n.buffer = AU.noise; n.connect(f1); n.connect(f2); n.start(t); n.stop(t + L + .05); }
    else {
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (prof.nasal ? .92 : .97), t + L);
      if (prof.vib || prof.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib || prof.trem; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + L + .05); }
      if (prof.ring) { const rm = c.createOscillator(), rg = c.createGain(); rm.frequency.value = prof.ring; rg.gain.value = .5; rm.connect(rg); rg.connect(g.gain); rm.start(t); rm.stop(t + L + .05); }
      osc.connect(f1); osc.connect(f2); osc.start(t); osc.stop(t + L + .05);
    }
    if (s.plosive || s.fric) { const n = c.createBufferSource(); n.buffer = AU.noise; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = s.fric ? 3000 : 1200; const ng = c.createGain(); ng.gain.setValueAtTime(vol * .6, t); ng.gain.linearRampToValueAtTime(0, t + (s.fric ? .05 : .02)); n.connect(hp); hp.connect(ng); ng.connect(AU.voiceGain); n.start(t); n.stop(t + .06); }
    t += L + .01;
  }
  AU.busyUntil = t;
  return dur;
}
function shout(text, who, o = {}) { return say(text, who, Object.assign({ shout: true, urgent: true }, o)); }

// ---- music: original songs in the engine's step notation, in layers
const SONGS = {
  title: { bpm: 120, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .1, notes: 'Bb4 . D5 . F5 - D5 . | Eb5 . G5 . F5 - - . | D5 . F5 . Bb5 - A5 G5 | F5 - Eb5 - D5 - . . | C5 . Eb5 . G5 - F5 . | Eb5 . D5 . C5 - Bb4 . | A4 . C5 . F5 - E5 Eb5 | D5 - C5 - Bb4 - . . ' },
    { name: 'base', wave: 'triangle', vol: .14, notes: 'Bb2 . F2 . Bb2 . F2 . | Eb2 . Bb2 . Eb2 . Bb2 . | Bb2 . F2 . Bb2 . F2 . | Bb2 . F2 . Bb2 . D3 . | Eb2 . Bb2 . Eb2 . G2 . | F2 . C3 . F2 . A2 . | F2 . C3 . F2 . A2 . | Bb2 . F2 . Bb2 . . . ' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k . s s ' }] },
  green: { bpm: 96, steps: 2, tracks: [
    { name: 'base', wave: 'pulse12', vol: .08, notes: 'G5 - E5 - . . G5 - E5 - . . C5 D5 E5 - | F5 - D5 - . . F5 - D5 - . . B4 C5 D5 - | E5 - C5 - G4 - A4 B4 C5 - E5 - D5 - . - | C5 - - - . . . . . . . . . . . . ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | A2 . E3 . F2 . C3 . | C3 . G2 . C3 . . . ' },
    { name: 'drums', wave: 'drums', vol: .08, on: false, notes: 'k . h . s . h . | k k h . s . h h ' },
    { name: 'fire', wave: 'saw', vol: .06, on: false, notes: 'C4 C4 . C4 E4 . G4 . | D4 D4 . D4 F4 . A4 . ' }] },
  hall: { bpm: 108, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .07, notes: 'D5 A4 F#4 A4 D5 A4 | E5 A4 G4 A4 E5 A4 | F#5 D5 A4 D5 F#5 D5 | E5 C#5 A4 C#5 E5 - | D5 - - - . . ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'D3 . . A2 . . | A2 . . E3 . . | D3 . . F#3 . . | A2 . . C#3 . . | D3 . . . . . ' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . h . h ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'D4 . F#4 . A4 . ' }] },
  bay: { bpm: 150, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'E4 E4 G4 A4 B4 . A4 G4 | E4 E4 G4 A4 D5 . B4 . | E4 E4 G4 A4 B4 . A4 G4 | A4 G4 E4 D4 E4 - - . ' },
    { name: 'base', wave: 'triangle', vol: .13, notes: 'E2 E2 E3 E2 E2 E2 E3 E2 | A2 A2 A3 A2 B2 B2 B3 B2 ' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k h s h k k s h ' },
    { name: 'fire', wave: 'square', vol: .05, on: false, notes: 'B5 . B5 . A5 . G5 . ' }] },
  downs: { bpm: 100, steps: 2, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'A4 - C5 E5 - D5 | C5 - B4 A4 - . | F4 - A4 C5 - B4 | G#4 - - E4 - . ' },
    { name: 'base', wave: 'square', vol: .05, notes: 'A2 . E3 . E3 . | A2 . E3 . E3 . | F2 . C3 . C3 . | E2 . B2 . G#2 . ' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . h . h . ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'A5 . G#5 . E5 . ' }] },
  dome: { bpm: 128, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'A4 . A4 . C5 . A4 . | G4 . G4 . E4 . G4 . | F4 . F4 . A4 . F4 . | E4 . G4 . B4 - - . ' },
    { name: 'base', wave: 'square', vol: .08, notes: 'A2 A2 . A2 A2 . A2 . | G2 G2 . G2 G2 . G2 . | F2 F2 . F2 F2 . F2 . | E2 E2 . E2 E2 . G#2 . ' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . s . k . s . | k k s . k . s s ' },
    { name: 'fire', wave: 'pulse', vol: .05, on: false, notes: 'E5 E5 . E5 G5 . A5 . ' }] },
  tea: { bpm: 90, steps: 1, tracks: [
    { name: 'base', wave: 'triangle', vol: .12, notes: 'G4 B4 D5 | C5 - B4 | A4 C5 E5 | D5 - - | G4 B4 D5 | E5 D5 C5 | B4 A4 F#4 | G4 - - ' },
    { name: 'base', wave: 'sine', vol: .1, notes: 'G2 D3 D3 | C3 G3 G3 | A2 E3 E3 | D3 A3 A3 | G2 D3 D3 | C3 G3 G3 | D3 A3 A3 | G2 D3 D3 ' }] },
  map: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'C5 . E5 G5 . E5 | F5 . A5 G5 . E5 | D5 . F5 E5 . C5 | D5 . B4 C5 - - ' },
    { name: 'base', wave: 'triangle', vol: .12, notes: 'C3 . . G2 . . | F2 . . C3 . . | G2 . . C3 . . | G2 . . C3 . . ' }] },
  showdown: { bpm: 140, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .06, notes: 'E4 . E4 . E4 . F4 . | E4 . E4 . E4 . D4 . ' },
    { name: 'base', wave: 'triangle', vol: .13, notes: 'E2 E2 E2 E2 E2 E2 F2 F2 | E2 E2 E2 E2 E2 E2 D2 D2 ' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h h ' },
    { name: 'fire', wave: 'saw', vol: .05, on: false, notes: 'B4 . . B4 . . C5 . ' }] }
};
SONGS.attract = Object.assign({}, SONGS.title, { bpm: 132 });
const STINGS = {
  four: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - . . ' }] },
  six: { bpm: 200, steps: 2, tracks: [{ wave: 'square', vol: .15, notes: 'G4 C5 E5 G5 C6 E6 G6 - - - ' }, { wave: 'drums', vol: .12, notes: 'k . s . k s s s ' }] },
  wicket: { bpm: 180, steps: 2, tracks: [{ wave: 'saw', vol: .12, notes: 'A5 . E5 . A4 - - - ' }, { wave: 'drums', vol: .12, notes: 'k . . . k . . . ' }] },
  over: { bpm: 160, steps: 2, tracks: [{ wave: 'triangle', vol: .12, notes: 'C5 G4 C5 - ' }] },
  win: { bpm: 140, steps: 2, tracks: [{ wave: 'square', vol: .14, notes: 'C5 . C5 . C5 . E5 - G5 - - . E5 . G5 - - - C6 - - - ' }, { wave: 'triangle', vol: .14, notes: 'C3 . G2 . C3 . E3 - G3 - - . C3 . G2 - - - C3 - - - ' }] },
  lose: { bpm: 90, steps: 2, tracks: [{ wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - ' }] },
  toss: { bpm: 220, steps: 2, tracks: [{ wave: 'pulse', vol: .1, notes: 'C5 D5 E5 F5 G5 A5 B5 C6 ' }] },
  chapter: { bpm: 120, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'Bb4 D5 F5 Bb5 - - A5 - Bb5 - - - ' }] }
};
let musicNow = null;
function music(id) { if (!game || !game.audio) return; if (musicNow === id) return; musicNow = id; game.audio.music(id ? SONGS[id] : null, { fade: .6 }); }
function sting(id) { if (game && game.audio && STINGS[id]) game.audio.sting(STINGS[id], { at: 'now', duck: .4 }); }
function musicLayers(m) {
  if (!game || !game.audio || !musicNow) return;
  const A = game.audio, song = SONGS[musicNow]; if (!song) return;
  const has = n => song.tracks.some(t => t.name === n);
  try {
    if (has('drums')) A.layer('drums', m && (m.hype[m.batT] > 50 || m.hype[m.bowlT] > 50 || m.state === 'inPlay') ? 1 : 0, .8);
    if (has('fire')) A.layer('fire', m && (m.fire.batOn || m.fire.bowlOn) ? 1 : 0, .5);
  } catch (e) { /* a song without layers */ }
}

// ---- 42-commentary.js ----
// ---- the commentary box (5.12): Sir Aubrey, Dazza and, for reviews, Prof. Priya. The director listens on the bus,
// picks at most one exchange a ball from the pools (no repeat within 20 balls), and shows it as a caption with the
// speaker's live portrait while the gibberish voice speaks it. The same listeners drive the crowd, the stings and
// the big centre callouts.
const COMM = { m: null, queue: [], cur: null, recent: [], lines: [], ballLine: false, filler: -1 };
const PORTRAITS = {};
function portraitRig(who) {
  if (PORTRAITS[who]) return PORTRAITS[who];
  const L = {
    aubrey: { build: 'heroic', hair: 'short', hat: { style: 'band', color: '#e8d8a0' }, face: { moustache: 'walrus' }, colors: { hair: '#c8c8c8', skin: '#f0c8a8', cloth: '#7a2a3a', trim: '#e8c060' } },
    dazza: { build: 'heroic', hair: 'spiky', hat: { style: 'cap', color: '#1fb5a8' }, colors: { hair: '#e8c070', skin: '#e89070', cloth: '#ffd23a' } },
    priya: { build: 'heroic', hair: 'short', face: { glasses: true }, colors: { hair: '#1a1a22', skin: '#b07a50', cloth: '#3a3a6a' } },
    edie: TEAM.ker.stars[0].look, basil: TEAM.ker.stars[3].look, dev: Object.assign({}, TEAM.ker.stars[1].look, { face: { glasses: true } }), pip: TEAM.ker.stars[2].look,
    crumb: { build: 'chibi', hair: 'long', outfit: 'robe', colors: { hair: '#c8c8d0', skin: '#f0c8a8', cloth: '#d87a9a', trim: '#f4f4f0' } },
    hollis: { build: 'heroic', hair: 'short', outfit: 'coat', face: { glasses: true }, colors: { hair: '#d8d8d8', coat: '#f4f4ee', cloth: '#1a1a1a', trim: '#f4f4f4' } },
    thrumpton: Object.assign({}, TEAM.thr.stars[0].look, { outfit: 'coat', colors: Object.assign({ coat: '#6a5a3a', cloth: '#4a3a2a' }, TEAM.thr.stars[0].look.colors) }),
    ghost: TEAM.thr.stars[2].look, machine: { build: 'bulky', hair: 'bald', hat: 'helmet', colors: { skin: '#c89a40', cloth: '#8a6a2a', hat: '#c89a40' } },
    gaz: TEAM.mud.stars[0].look, peregrine: TEAM.gen.stars[0].look, shazza: TEAM.lar.stars[0].look, spinaldo: TEAM.mag.stars[0].look, fortescue: TEAM.gen.stars[1].look, kev: TEAM.lar.stars[1].look
  }[who] || { build: 'heroic' };
  const o = Object.assign({ size: 1.2, weapon: null }, L, { face: Object.assign({}, L.face || {}, L.moustache ? { moustache: L.moustache } : {}, L.beard ? { beard: true } : {}, L.glasses ? { glasses: true } : {}) });
  if (who === 'ghost') o.eyeGlow = '#a8e0ff';
  return (PORTRAITS[who] = new E.Humanoid(o));
}
function commReset(m) { COMM.m = m; COMM.queue = []; COMM.cur = null; COMM.recent = []; COMM.filler = -1; }
function commVars(m, extra = {}) {
  if (!m || !m.I) return extra;
  const I = m.I, c = m.striker(), bp = m.bowlerP();
  return Object.assign({ batter: c ? c.p.short : '', bowler: bp ? bp.short : '', team: m.teams[I.bat].name, opp: m.teams[1 - I.bat].name, ground: m.g.name, score: m.scoreStr(), runs: '', need: m.need() || 0, balls: m.ballsLeft(), kmh: m.delInfo ? m.delInfo.kmh : '', item: '', fielder: m.catcher ? m.catcher.p.short : 'the fielder', winner: m.result && m.result.winner !== null && m.result.winner !== undefined ? m.teams[m.result.winner].name : 'nobody' }, extra);
}
function commSay(pool, vars, o = {}) {
  const m = COMM.m; if (!m || !m.I || !LINES[pool] || DEV.toggles.muteComm) return false;
  if (!o.force && T('commentaryRate') < 1 && RNG.cosmetic() > T('commentaryRate')) return false;
  const list = LINES[pool], fresh = list.filter(l => !COMM.recent.some(r => r.l === l && m.ballNo - r.n < 20));
  const pickL = (fresh.length ? fresh : list)[Math.floor(RNG.cosmetic() * (fresh.length || list.length))];
  COMM.recent.push({ l: pickL, n: m.ballNo }); if (COMM.recent.length > 60) COMM.recent.shift();
  const text = fmt(pickL[1], vars);
  if (o.urgent) COMM.queue = [];
  COMM.queue.push({ who: pickL[0], text, t: 0, dur: Math.max(2.4, Math.min(4.2, text.length * .055)) });
  COMM.lines.push(VOICES[pickL[0]].name + ': ' + text); if (COMM.lines.length > 10) COMM.lines.shift();
  if (COMM.queue.length > 2) COMM.queue.splice(1, COMM.queue.length - 2);
  return true;
}
function commStep(dt) {
  const m = COMM.m, quiet = m && (m.state === 'runup' || m.state === 'flight');
  if (quiet && COMM.cur && COMM.cur.t > 1.2) COMM.cur = null;
  if (!COMM.cur && COMM.queue.length && !quiet) { COMM.cur = COMM.queue.shift(); if (S('voices')) say(COMM.cur.text, COMM.cur.who); }
  if (COMM.cur) { COMM.cur.t += dt; if (COMM.cur.t > COMM.cur.dur) COMM.cur = null; }
}
function drawCaption(g, r, y) {
  const c = COMM.cur; if (!c || !S('captions')) return;
  const V_ = VOICES[c.who], w = Math.min(300, r.W - 20), x = Math.round((r.W - w) / 2), lines = E.font.wrap(c.text, w - 50).slice(0, 3), h = Math.max(36, 14 + lines.length * 9);
  panel(g, x, y - h, w, h, { alpha: .82, rule: V_.color });
  const rig = portraitRig(c.who); rig._talk = c.t < c.dur - .6; rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: c.who === 'thrumpton' ? 'angry' : null });
  rig.drawPortrait(g, x + 4, y - h + 3, 30, { zoom: 3, turn: .4, bg: '#1a1430', frame: V_.color });
  E.font.text(g, V_.name, x + 40, y - h + 4, V_.color, { shadow: '#000' });
  const shown = Math.floor(c.t * 45);
  let left = shown;
  lines.forEach((l, k) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; E.font.text(g, s, x + 40, y - h + 14 + k * 9, '#f4f0e0', { shadow: '#000' }); });
}
// ---- callouts: the big centre words (FOUR!, SIX! MAXIMUM!, WICKET!, FREE HIT, ON FIRE!, KERFUFFLE BONUS +10, PERFECT)
const CALL = { list: [] };
function callout(text, color = '#ffd23a', dur = 1.1, o = {}) { CALL.list.push(Object.assign({ text, color, t: 0, dur }, o)); if (CALL.list.length > 3) CALL.list.shift(); }
function slowmo(k, dur) { WORLD.slowK = k; WORLD.slowT = dur; }
function shake(n) { if (game && game.shake) game.shake(n); }
function flash(c, s) { if (game && game.flash) game.flash(c, s); }
// ---- the listeners (one set, for every match)
let listenersOn = false;
function presentationListeners() {
  if (listenersOn) return; listenersOn = true;
  const M_ = () => COMM.m, hub = () => COMM.m && COMM.m.cfg.mode === 'hub';
  on('ball:released', d => { sfx('throwWhoosh', { vol: .5 }); const m = M_(); if (m && m.delInfo && m.delInfo.special) callout(upper(m.delInfo.name), '#7ae0ff', 1.2, { small: true }); });
  on('ball:pitched', () => sfx('pitchThud'));
  on('bat:press', d => { if (S('timing') && d.grade && d.grade !== 'MISS') {} });
  on('bat:contact', d => {
    const m = M_(); sfx(d.grade === 'PERFECT' ? 'batSweet' : d.kind !== 'clean' ? 'edge' : 'bat');
    if (S('timing') && d.kind === 'clean') callout(d.grade, d.grade === 'PERFECT' ? '#ffd23a' : d.grade === 'GOOD' ? '#7ae07a' : '#ff9a6a', .6, { small: true, timing: true });
    if (d.grade === 'PERFECT' && m) game.particles.bits(OX + m.batters[0].x, OY + m.batters[0].y, 16, 6, ['#ecd9a0', '#c8a860', '#fff4d8']);
    if (d.grade === 'PERFECT') { game.freeze(.05); shake(1); }
    if (d.special) callout(upper(SPECIALS[d.special].name), '#ff9a3a', 1.2);
    CROWD.excite = Math.min(1, CROWD.excite + .15);
  });
  on('ball:edge', () => { crowdVoice('ooh', 1.2, .12); commSay('edge', commVars(M_())); });
  on('ball:beaten', () => { crowdVoice('ooh', 1.1, .1); const m = M_(); if (m) commSay('beaten', commVars(m)); });
  on('stumps', d => { sfx('stumps'); sfx('bails'); const m = M_(); if (m) { const y = d.end * 320; game.particles.bits(OX, OY + y, 12, 10, ['#e8dcb8', '#f4ecd0']); game.particles.dust(OX, OY + y, 2, 6); } shake(2); });
  on('keeper', () => sfx('gloves'));
  on('appeal', () => { const m = M_(); shout('HOWZAT!', 'gaz', { pitch: 1.1 }); crowdVoice('ooh', 1.4, .14); if (m) callout('HOWZAT!', '#ff6b6b', .9, { small: true }); });
  on('decision', d => { if (!d.out) callout('NOT OUT', '#c8c8d0', 1, { small: true }); });
  on('boundary', d => {
    const m = M_(); WORLD.cheer = 3; CROWD.excite = 1;
    if (d.n === 6) { callout('SIX! MAXIMUM!', '#ffd23a', 1.4); sting('six'); crowdVoice('roar', 2.2, .22); applause(3); flash('#fff4c8', .12); shake(2); }
    else { callout('FOUR!', '#7aa7ff', 1.2); sting('four'); crowdVoice('roar', 1.4, .16); applause(2.2); sfx('board'); }
    if (m) commSay(d.n === 6 ? 'six' : 'four', commVars(m), { urgent: true });
  });
  on('catch', d => { sfx('gloves'); if (d.screamer) { callout('SCREAMER!', '#ffd23a', 1.3); slowmo(.4, .5); } shout('CATCH IT!', 'pip'); });
  on('catch:dropped', d => { crowdVoice('groan', 1.4, .14); callout('DROPPED!', '#ff9a6a', 1, { small: true }); commSay('dropped', commVars(M_(), { fielder: d.fielder })); });
  on('throw', () => sfx('throwWhoosh'));
  on('direct', () => { callout('DIRECT HIT!', '#ffd23a', 1.1, { small: true }); });
  on('dive', () => sfx('dive'));
  on('call', d => { const m = M_(); if (m) { const h = m.batters[0]; const who = m.striker() && m.striker().p.id; shout(d.what + '!', VOICES[who] ? who : 'edie', { vol: .8 }); m.bubble = { text: d.what + '!', t: 0 }; } });
  on('run', d => { if (d.n >= 2) sfx('step'); });
  on('dead', d => { const m = M_(); if (!m) return; const r = m.ballRec; if (!r) return;
    if (r.wicket) { callout('WICKET!', '#ff4a4a', 1.4); sting('wicket'); crowdVoice('roar', 1.8, .2); applause(2.5, 70); const how = r.wicket.how; commSay(how === 'bowled' ? 'bowled' : how === 'caught' ? (m.catcher && m.catcher.dive ? 'screamer' : 'caught') : how === 'lbw' ? 'lbw' : how === 'run out' ? 'runout' : how === 'stumped' ? 'stumped' : how === 'hit wicket' ? 'hitwicket' : 'bowled', commVars(m), { urgent: true }); }
    else if (r.wide) commSay('wide', commVars(m)); else if (r.noBall) commSay('noball', commVars(m));
    else if (!r.boundary && r.runs === 1) commSay('single', commVars(m)); else if (!r.boundary && r.runs > 1) commSay('runs', commVars(m, { runs: r.runs }));
    else if (!r.boundary && !r.runs && RNG.cosmetic() < .5) commSay('dot', commVars(m));
    if (r.bonus > 0) callout('KERFUFFLE BONUS +' + r.bonus, '#ff8ad8', 1.4, { small: true });
  });
  on('extra', d => { if (d.kind === 'noBall') { callout(d.beamer ? 'BEAMER! NO BALL' : 'NO BALL', '#ffd23a', 1.1, { small: true }); sfx('whistle'); } if (d.kind === 'wide') callout('WIDE', '#c8c8d0', .9, { small: true }); });
  on('ball:done', d => { const m = M_(); if (m && m.I && m.I.freeHit) { callout('FREE HIT', '#ffd23a', 1.3); commSay('freehit', commVars(m)); } if (m && d.rec && d.rec.bonus > 0) commSay('bonus', commVars(m, { runs: d.rec.bonus })); });
  on('fire:on', d => { const m = M_(); callout('ON FIRE!', '#ff8a2a', 1.5); sfx('fireOn'); sting('six'); if (m) commSay(d.side === 'bat' ? 'fire' : 'firebowl', commVars(m), { urgent: true }); flash('#ff8a2a', .1); });
  on('hype:full', () => { sfx('hypeFull'); crowdVoice('chant', 1.6, .14); const m = M_(); if (m && !hub()) callout('SPECIAL READY', '#5fd38a', 1.2, { small: true }); });
  on('special', d => { sfx('special'); const m = M_(); if (m) commSay('special', commVars(m, { item: d.name })); });
  on('item', d => { sfx('coin'); callout(upper(d.name) + '!', ITEMS[d.id].color, 1.3, { small: true }); const m = M_(); if (m) commSay('item', commVars(m, { item: d.name })); });
  on('item:use', d => { if (d.id === 'horseshoe') callout('LUCKY HORSESHOE! NOT OUT!', '#c8ccd8', 1.6, { small: true }); if (d.id === 'teapot') callout('GOLDEN TEAPOT! RUNS ×2', '#ffd23a', 1.4, { small: true }); if (d.id === 'banana') callout('BANANA PEEL!', '#ffe04a', 1.1, { small: true }); });
  on('target:hit', d => { sfx(['fountain', 'shark', 'tower'].includes(d.id) ? 'splash' : 'glass'); flash('#ffffff', .1); shake(2); const m = M_(); if (m) { COMM.queue = []; COMM.queue.push({ who: 'aubrey', text: d.line, t: 0, dur: 4 }); } slowmo(.4, .4); });
  on('chaos', d => { const m = M_(); if (d.id === 'cow') sfx('moo'); if (d.id === 'bells') { sfx('bell'); game.after(.6, () => sfx('bell')); } if (d.id === 'bees') sfx('bees'); if (d.id === 'gulls') sfx('gull'); if (d.id === 'rain') { sfx('thunder'); CROWD.rain = true; } if (d.id === 'fireworks') sfx('firework');
    if (m && d.line) { COMM.queue = []; COMM.queue.push({ who: 'aubrey', text: d.line, t: 0, dur: 4 }); } callout(upper(d.name), '#c8f0ff', 1.4, { small: true }); });
  on('rain:end', d => { CROWD.rain = false; });
  on('cow:hit', () => { sfx('moo'); COMM.queue = [{ who: 'aubrey', text: "She's taken it on the flank, and seems rather pleased about it.", t: 0, dur: 3.4 }]; });
  on('gull', () => { sfx('gull'); callout('SEAGULL! +2', '#f4f4f0', 1.1, { small: true }); });
  on('ghost', () => { const m = M_(); if (m) commSay('ghost', commVars(m)); });
  on('fireworks', () => sfx('firework'));
  on('review:start', d => { sfx('stamp'); const m = M_(); if (d.kind === 'krs') { callout('REVIEW', '#7ae0ff', 1.2, { small: true }); if (m) commSay('review', commVars(m), { urgent: true, force: true }); } else callout('THIRD UMPIRE', '#7ae0ff', 1.2, { small: true }); });
  on('review:result', d => { sfx('stamp'); const m = M_(); callout(d.out ? 'OUT!' : 'NOT OUT!', d.out ? '#ff4a4a' : '#5fd38a', 1.4); if (m && !d.third) commSay(d.overturned ? 'overturned' : 'stands', commVars(m), { urgent: true, force: true }); });
  on('over:end', () => { const m = M_(); sting('over'); if (m && !m.inningsOver()) { if (m.need() !== null) commSay('chase', commVars(m)); else commSay('overEnd', commVars(m)); } if (m && RNG.cosmetic() < .35 && !hub()) game.after(4, () => { if (COMM.m === m && !COMM.cur && m.state !== 'over') commSay('idle', commVars(m)); }); });
  on('milestone', d => { const m = M_(); if (d.kind === 'hattrick') { callout('HAT-TRICK!', '#ffd23a', 1.8); commSay('hattrick', commVars(m), { urgent: true }); } if (d.kind === 'maiden') commSay('maiden', commVars(m)); });
  on('superover', () => { const m = M_(); callout('SUPER OVER!', '#ffd23a', 2); commSay('tie', commVars(m), { urgent: true, force: true }); });
  on('match:end', d => { const m = M_(); if (!m) return; const human = m.isHumanSideIdx(); if (m.result.winner === null) commSay('tie', commVars(m), { force: true }); else { commSay(human < 0 || m.result.winner === human || m.won ? 'win' : 'loss', commVars(m), { force: true, urgent: true }); } if (m.won || human < 0) sting('win'); else sting('lose'); });
  on('innings:start', d => { const m = M_(); if (m && m.i === 0) commSay('start', commVars(m), { force: true }); });
  on('cam', () => {});
}
function hudStep(dt) {
  for (const c of CALL.list) c.t += dt; CALL.list = CALL.list.filter(c => c.t < c.dur);
  if (WORLD.cheer > 0) WORLD.cheer -= dt;
  const m = COMM.m; if (m && m.bubble) { m.bubble.t += dt; if (m.bubble.t > 1.2) m.bubble = null; }
  commStep(dt); crowdStep(dt);
}

// ---- 43-ui.js ----
// ---- input map (5.14.1), glyph prompts that follow the last device (5.14.3), and 10-foot widgets (5.15): big menus
// with a cricket-ball cursor, option rows, cards, panels. Hover moves the focus; a click picks.
const KERFUFFLE_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  shot: ['KeyJ', 'Mouse0', 'Pad0'], loft: ['KeyK', 'Mouse2', 'Pad2'], block: ['KeyL', 'KeyQ', 'Pad1'], run: ['Space', 'Pad5'], back: ['ShiftLeft', 'ShiftRight', 'Pad4'],
  special: ['KeyI', 'KeyF', 'Pad3'], charge: ['KeyE', 'Pad7'], hubCreate: ['Pad8'], more: ['KeyT'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyL', 'Pad1']
};
const ACTION_NAMES = { shot: 'Ground shot / Bowl / Catch', loft: 'Lofted shot / Alt delivery', block: 'Defend / Alt delivery', run: 'Run / Field preset', back: 'Stay / Over-Round', special: 'Special / Review', charge: 'Charge', hubCreate: false, more: false };
const PAD_PS = { Pad0: 'cross', Pad1: 'circle', Pad2: 'square', Pad3: 'triangle', Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CREATE', Pad9: 'OPTIONS', Pad12: 'up', Pad13: 'down', Pad14: 'left', Pad15: 'right' };
const PAD_XB = { Pad0: 'A', Pad1: 'B', Pad2: 'X', Pad3: 'Y', Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU' };
// the code to show for an action on a device, from the player's own bindings
function codeFor(I, action, device) {
  const codes = (I.map && I.map[action]) || KERFUFFLE_KEYS[action] || [];
  const isPad = c => /^Pad\d+$/.test(c), isMouse = c => /^Mouse\d$/.test(c);
  if (device === 'gamepad') return codes.find(isPad) || null;
  if (device === 'mouse') return codes.find(isMouse) || codes.find(c => !isPad(c) && !isMouse(c)) || null;
  return codes.find(c => !isPad(c) && !isMouse(c)) || null;
}
function devOf(I) { const d = (I && I.lastDevice) || 'keyboard'; return d === 'touch' ? 'keyboard' : d; }
// draws the glyph for an action at (x, y) (its left, vertical centre); returns its width
function glyph(g, I, action, x, y, o = {}) {
  I = I || game.input;
  const dev = o.device || devOf(I), code = codeFor(I, action, dev) || codeFor(I, action, 'keyboard');
  return glyphCode(g, I, code, x, y, dev);
}
function glyphCode(g, I, code, x, y, dev) {
  if (!code) return 0;
  y = Math.round(y); x = Math.round(x);
  if (/^Pad\d+$/.test(code)) {
    const xb = I.padStyle && I.padStyle() === 'xbox';
    const n = xb ? PAD_XB[code] : PAD_PS[code];
    if (!xb && ['cross', 'circle', 'square', 'triangle'].includes(n)) {
      px.disc(g, x + 5, y, 5, '#1a1a24'); px.disc(g, x + 5, y, 4, '#2a2a36');
      const c = { cross: '#7aa7ff', circle: '#ff6b6b', square: '#ff8ad8', triangle: '#5fd38a' }[n];
      if (n === 'cross') { px.line(g, x + 3, y - 2, x + 7, y + 2, c); px.line(g, x + 7, y - 2, x + 3, y + 2, c); }
      if (n === 'circle') { px.disc(g, x + 5, y, 2.6, c); px.disc(g, x + 5, y, 1.6, '#2a2a36'); }
      if (n === 'square') { px.rect(g, x + 3, y - 2, 5, 5, c); px.rect(g, x + 4, y - 1, 3, 3, '#2a2a36'); }
      if (n === 'triangle') { px.line(g, x + 5, y - 3, x + 2, y + 2, c); px.line(g, x + 5, y - 3, x + 8, y + 2, c); px.line(g, x + 2, y + 2, x + 8, y + 2, c); }
      return 11;
    }
    if (xb && ['A', 'B', 'X', 'Y'].includes(n)) {
      const c = { A: '#5fd38a', B: '#ff6b6b', X: '#7aa7ff', Y: '#ffd23a' }[n];
      px.disc(g, x + 5, y, 5, '#1a1a24'); px.disc(g, x + 5, y, 4, c); E.font.text(g, n, x + 5, y - 3, '#101018', { align: 'center', outline: false, shadow: false });
      return 11;
    }
    if (['up', 'down', 'left', 'right'].includes(n)) { px.rect(g, x + 3, y - 4, 3, 9, '#3a3a46'); px.rect(g, x, y - 1, 9, 3, '#3a3a46'); const d = { up: [4, -3], down: [4, 3], left: [1, 0], right: [7, 0] }[n]; px.rect(g, x + d[0], y + d[1], 1, 1, '#ffffff'); return 11; }
    const w = E.font.width(n) + 6; px.rect(g, x, y - 5, w, 10, '#1a1a24'); px.rect(g, x + 1, y - 4, w - 2, 8, '#3a3a46'); E.font.text(g, n, x + 3, y - 3, '#f4f4f0'); return w + 1;
  }
  if (/^Mouse\d$/.test(code)) {
    const right = code === 'Mouse2';
    px.rect(g, x + 1, y - 5, 8, 11, '#1a1a24'); px.rect(g, x + 2, y - 4, 6, 9, '#d8d8e0'); px.rect(g, x + 2, y - 4, 6, 1, '#d8d8e0');
    px.rect(g, right ? x + 5 : x + 2, y - 4, 3, 4, '#ffd23a'); px.rect(g, x + 5, y - 4, 1, 4, '#6a6a76');
    return 11;
  }
  const lab = upper(I.codeLabel ? I.codeLabel(code) : code.replace(/^Key|^Digit/, ''));
  const w = Math.max(10, E.font.width(lab) + 6);
  px.rect(g, x, y - 6, w, 12, '#0a0a10'); px.rect(g, x + 1, y - 5, w - 2, 9, '#f0ece4'); px.rect(g, x + 1, y + 4, w - 2, 1, '#9a9488');
  E.font.text(g, lab, x + Math.round(w / 2), y - 4, '#14141c', { align: 'center', outline: false, shadow: false });
  return w + 1;
}
// a row of prompts: [[action, label], ...] at (x, y); align 'left' | 'center' | 'right'; returns its width
function prompts(g, I, items, x, y, o = {}) {
  const gap = 8, col = o.color || '#f4f4f0';
  const widths = items.map(([a, l]) => { const w = measureGlyph(I, a) + 3 + E.font.width(upper(l)); return w; });
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  items.forEach(([a, l], k) => { const w = glyph(g, I, a, cx, y); E.font.text(g, upper(l), cx + w + 2, y - 3, col, { shadow: '#000' }); cx += widths[k] + gap; });
  return total;
}
function measureGlyph(I, a) {
  I = I || game.input; const dev = devOf(I), code = codeFor(I, a, dev) || codeFor(I, a, 'keyboard');
  if (!code) return 0; if (/^Mouse/.test(code)) return 11;
  if (/^Pad/.test(code)) { const xb = I.padStyle && I.padStyle() === 'xbox', n = xb ? PAD_XB[code] : PAD_PS[code]; return ['cross', 'circle', 'square', 'triangle', 'A', 'B', 'X', 'Y', 'up', 'down', 'left', 'right'].includes(n) ? 11 : E.font.width(n) + 7; }
  return Math.max(9, E.font.width(upper(I.codeLabel ? I.codeLabel(code) : code)) + 6) + 1;
}
// which glyph family a prompt shows right now (tests read it)
function promptKind(I, a) { const dev = devOf(I), code = codeFor(I, a, dev) || codeFor(I, a, 'keyboard'); if (!code) return null; if (/^Pad/.test(code)) return (I.padStyle && I.padStyle() === 'xbox' ? 'xbox:' + PAD_XB[code] : 'ps:' + PAD_PS[code]); if (/^Mouse/.test(code)) return 'mouse:' + code; return 'key:' + upper(I.codeLabel ? I.codeLabel(code) : code); }

// ---- widgets: a big list (one decision per screen), with option rows (left / right change a value)
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.t = 0; this.rects = []; this.lastPtr = null; }
  get cur() { return this.items[this.i]; }
  update(dt, I = game.input) {
    this.t += dt;
    const n = this.items.length; if (!n) return null;
    const en = k => !this.items[k].disabled;
    const step = d => { let k = this.i; for (let c = 0; c < n; c++) { k = (k + d + n) % n; if (en(k)) { this.i = k; sfx('select'); return; } } };
    if (I.repeat('up', .35, .12)) step(-1);
    if (I.repeat('down', .35, .12)) step(1);
    const it = this.cur;
    if (it && it.options) {
      if (I.repeat('left', .35, .12)) { it.k = (it.k - 1 + it.options.length) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); }
      if (I.repeat('right', .35, .12)) { it.k = (it.k + 1) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); }
    }
    // the mouse: hover moves the focus, a click picks (or turns an option row)
    const p = HEADLESS ? null : I.pointer && I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { this.lastPtr = p.slice(); const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && en(k)) { this.i = k; sfx('select'); } }
    const c = I.clicked && I.clicked();
    if (c) { const k = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0 && en(k)) { this.i = k; const it2 = this.items[k]; if (it2.options) { const r = this.rects[k]; const d = c[0] < r[0] + r[2] / 2 ? -1 : 1; it2.k = (it2.k + d + it2.options.length) % it2.options.length; sfx('select'); it2.onChange && it2.onChange(it2.options[it2.k], it2); return null; } sfx('confirm'); return this._pick(it2); } }
    if (I.pressed('confirm') && it && !it.disabled) { if (it.options && !it.act) { it.k = (it.k + 1) % it.options.length; sfx('select'); it.onChange && it.onChange(it.options[it.k], it); return null; } sfx('confirm'); return this._pick(it); }
    if (I.pressed('cancel') && this.o.onBack) { sfx('cancel'); this.o.onBack(); return 'back'; }
    return null;
  }
  _pick(it) { if (it.act) it.act(it); return it; }
  draw(g, x, y, w, o = {}) {
    const lh = o.lh || 19, sc = o.scale || 2;
    this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * lh, foc = k === this.i, dis = it.disabled;
      this.rects[k] = [x - w / 2, yy - 3, w, lh - 2];
      if (foc) { px.blend(g, .55, 'normal', () => px.rect(g, x - w / 2, yy - 3, w, lh - 2, '#1a1430')); px.rect(g, x - w / 2, yy - 3, 3, lh - 2, '#ffd23a'); px.rect(g, x - w / 2, yy + lh - 6, w, 1, '#ffd23a'); }
      const label = upper(it.label) + (it.options ? '' : '');
      const col = dis ? '#6a6878' : foc ? '#ffe9a0' : '#f4f0e0';
      if (it.options) {
        E.font.text(g, upper(it.label), x - w / 2 + 10, yy, col, { scale: o.optScale || 1, shadow: '#000' });
        const v = upper(it.show ? it.show(it.options[it.k]) : it.options[it.k]);
        E.font.text(g, (foc ? '← ' : '') + v + (foc ? ' ▸' : ''), x + w / 2 - 10, yy, foc ? '#ffd23a' : '#d8d0c0', { align: 'right', scale: o.optScale || 1, shadow: '#000' });
      } else E.font.text(g, label, x, yy - (sc > 1 ? 2 : 0), col, { align: 'center', scale: sc, shadow: '#000' });
      if (foc) { const bx = x - w / 2 - 9, by = yy + (sc > 1 ? 4 : 2), spin = this.t * 6; px.disc(g, bx, by, 4, '#9a1a22'); px.disc(g, bx - 1, by - 1, 3, '#d83a3a'); px.line(g, bx + Math.cos(spin) * 3, by - 3, bx - Math.cos(spin) * 3, by + 3, '#f4e8c8'); }
      if (it.note && foc) E.font.text(g, it.note, x, y + this.items.length * lh + 2, '#c8c0e0', { align: 'center', shadow: '#000' });
    });
  }
}
const opt = (label, options, value, onChange, o = {}) => Object.assign({ label, options, k: Math.max(0, options.indexOf(value)), onChange }, o);
// a translucent panel with a gold rule
function panel(g, x, y, w, h, o = {}) { px.blend(g, o.alpha || .78, 'normal', () => px.rect(g, x, y, w, h, o.bg || '#0e0c1c')); px.rect(g, x, y, w, 1, o.rule || '#ffd23a'); px.rect(g, x, y + h - 1, w, 1, '#3a3450'); }
function bigTitle(g, text, x, y, o = {}) { E.font.title(g, text, x, y, Object.assign({ scale: 3, align: 'center', colors: ['#fff4c8', '#ffd23a', '#e8803a'], outline: '#2a1a0a', depth: 2, depthColor: '#5a2a1a' }, o)); }
function footer(g, r, items) { const y = r.H - 9; panel(g, 0, r.H - 18, r.W, 18, { alpha: .6, rule: '#3a3450' }); prompts(g, game.input, items, r.W / 2, y, { align: 'center' }); }
function wrapText(s, w) { return E.font.wrap(s, w); }
// is this a touch-only device (no fine pointer, a touch screen, no key or pad seen)?
const TOUCH = { gate: false, seenKey: false };
function touchOnly() {
  if (TOUCH.forced !== undefined) return TOUCH.forced && !TOUCH.seenKey;
  if (HEADLESS || typeof matchMedia === 'undefined') return false;
  try { return !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints || 0) > 0 && !TOUCH.seenKey; } catch (e) { return false; }
}

// ---- 44-hud.js ----
// ---- the match HUD (5.15.2), drawn in screen pixels over the world: the score bug, this over, the batter and bowler
// cards, the Kerfuffle meters, callouts, contextual prompts (by the action, in the player's own glyphs), the delivery
// panel and the release meter, the radar in the wide shot, the commentary caption, reviews, cards and pickers.
const HUD = { rects: {} };
function hudLayout(W, H, corner) {
  // every element's rectangle, so a test can check none overlap (or cover the corner's buttons)
  const top = 4, cw = corner ? Math.max(0, W - corner.x0) : 0;
  return { score: [4, top, 112, 30], over: [W - 4 - 96 - cw, top, 96, 14], striker: [4, H - 26, 120, 22], bowler: [W - 124, H - 26, 120, 22], meter: [W / 2 - 62, H - 16, 124, 12], caption: [W / 2 - 150, H - 74, 300, 44] };
}
function overlaps(L) { const ks = Object.keys(L), bad = []; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = L[ks[i]], b = L[ks[j]]; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) { if ((ks[i] === 'caption' || ks[j] === 'caption')) continue; bad.push(ks[i] + '/' + ks[j]); } } return bad; }
function drawHud(r, m) {
  r.overlay(g => {
    const W = r.W, H = r.H, I = m.I, corner = game.cornerArea ? game.cornerArea() : null, L = hudLayout(W, H, corner);
    const hum = m.isHumanSideIdx(), pB = m.isHuman('bat') ? m.pad('bat').I : null, pW = m.isHuman('bowl') ? m.pad('bowl').I : null, pF = m.isHuman('field') ? m.pad('field').I : null;
    const big = m.state === 'break' || m.state === 'over';
    // score bug
    if (!big) {
      const [x, y] = L.score, t = m.teams[I.bat];
      panel(g, x, y, 112, m.target() ? 30 : 21, { rule: t.chip });
      px.rect(g, x + 3, y + 4, 4, 13, t.chip);
      E.font.text(g, t.code, x + 10, y + 3, '#f4f0e0', { shadow: '#000' });
      E.font.text(g, I.runs + '/' + I.wkts, x + 34, y + 2, '#ffffff', { scale: 2, shadow: '#000' });
      E.font.text(g, m.overStr() + ' OV' + (I.so ? ' SO' : ''), x + 106, y + 9, '#c8c0e0', { align: 'right', shadow: '#000' });
      if (m.target()) { const n = m.need(), b = m.ballsLeft(), hard = n > b * 1.6; E.font.text(g, 'NEED ' + n + ' FROM ' + b, x + 4, y + 20, hard ? '#ff8a6a' : '#ffd23a', { shadow: '#000' }); }
      if (tuneChanged().length && m.cfg.mode !== 'attract') { px.rect(g, x + 116, y + 2, 22, 9, '#c82a32'); E.font.text(g, 'DEV', x + 127, y + 3, '#ffffff', { align: 'center' }); }
      // this over
      const [ox, oy] = L.over; panel(g, ox, oy, 96, 14, { alpha: .7, rule: '#3a3450' });
      I.over.slice(-7).forEach((s, k) => { const cx = ox + 8 + k * 13, c = s === 'W' ? '#ff4a4a' : s === '6' ? '#ffd23a' : s === '4' ? '#7aa7ff' : s === 'wd' || s === 'nb' ? '#8a8a9a' : s === '•' ? '#5a5870' : '#e8e4d8'; px.disc(g, cx, oy + 7, 5, c); E.font.text(g, s === '•' ? '' : s === 'wd' ? 'w' : s === 'nb' ? 'n' : s, cx, oy + 4, '#101018', { align: 'center' , outline: false, shadow: false }); });
      // the batter and the bowler
      const sc = m.striker(), bp = m.bowlerP(), bc = bp ? m.bowlCard(bp.id) : null;
      if (sc) { const [sx, sy] = L.striker; panel(g, sx, sy, 120, 22); const rig = rigFor(sc.p, 'bat'); rig.drawPortrait(g, sx + 2, sy + 2, 18, { zoom: 3, turn: .4, bg: '#1a1430' }); E.font.text(g, sc.p.short, sx + 24, sy + 3, '#f4f0e0', { shadow: '#000' }); E.font.text(g, sc.runs + '* (' + sc.balls + ')', sx + 24, sy + 12, '#ffd23a', { shadow: '#000' }); }
      if (bp && bc) { const [bx, by] = L.bowler; panel(g, bx, by, 120, 22); E.font.text(g, bp.short, bx + 116, by + 3, '#f4f0e0', { align: 'right', shadow: '#000' }); E.font.text(g, bc.wkts + '-' + bc.runs + '  ' + Math.floor(bc.balls / 6) + '.' + bc.balls % 6, bx + 116, by + 12, '#c8c0e0', { align: 'right', shadow: '#000' }); }
      // the Kerfuffle meters (batting left, bowling right)
      if (m.cfg.kerfuffle) {
        const [mx, my] = L.meter;
        for (const [t, x0] of [[m.batT, mx], [m.bowlT, mx + 64]]) {
          const v = m.hype[t] / 100, full = v >= 1;
          px.rect(g, x0, my, 60, 7, '#1a1430'); px.rect(g, x0 + 1, my + 1, Math.round(58 * v), 5, full ? (Math.floor(game.time * 6) % 2 ? '#5fd38a' : '#c8ffd8') : m.teams[t].chip === '#1a1a22' ? '#7a3aff' : E.shade(m.teams[t].chip, .2));
          if ((t === m.batT ? m.fire.batOn : m.fire.bowlOn)) for (let k = 0; k < 6; k++) px.dot(g, x0 + 4 + k * 10, my - 1 - Math.floor(Math.abs(Math.sin(game.time * 9 + k)) * 3), '#ff8a2a');
          E.font.text(g, m.teams[t].code, x0 + 30, my + 8, '#c8c0e0', { align: 'center' });
          if (full && m.isHumanSideIdx() === t && !m.pendingSpecial[t]) { glyph(g, t === m.batT ? pB : pW, 'special', x0 + 63 - (t === m.batT ? 0 : 128), my - 7); }
          const it = m.items[t]; if (it) { const s = spr()['tok_' + it]; px.sprite(g, s, x0 + (t === m.batT ? -12 : 62), my - 1); }
        }
      }
    }
    // centre callouts
    let cy = Math.round(H * .3);
    for (const c of CALL.list) { const u = c.t / c.dur, sc_ = c.small ? 2 : 3, y = c.timing ? 34 : cy; if (!c.timing) cy += c.small ? 18 : 26; const a = u > .8 ? (1 - u) * 5 : 1; if (a > .2) bigTitle(g, c.text, W / 2, y - (u < .1 ? (1 - u * 10) * 6 : 0), { scale: sc_, colors: ['#ffffff', c.color, E.shade(c.color, -.3)] }); }
    // the release speed
    if ((m.state === 'flight' || m.state === 'inPlay') && m.delInfo && !(m.delInfo.hideSpeed && !m.ball.pitched)) { E.font.text(g, m.delInfo.kmh + ' KM/H', W / 2, 6, '#ffffff', { align: 'center', scale: 1, shadow: '#000' }); E.font.text(g, upper(m.delInfo.name), W / 2, 15, '#c8c0e0', { align: 'center', shadow: '#000' }); }
    if (m.state === 'inPlay' && m.contact && m.contact.shot && m.st < 1.6) E.font.text(g, upper(SHOT[m.contact.shot] ? SHOT[m.contact.shot].name : ''), W / 2, 24, '#ffd23a', { align: 'center', shadow: '#000' });
    // contextual prompts
    const cap = H - 30;
    if (m.cfg.mode !== 'attract' && !big) {
      if ((m.state === 'setup') && pW) {
        const pb = m.bowlerP(), d = pb.bowl.del, sp = m.specialReady(m.bowlT);
        const items = [['shot', DELIVERIES[d[0]].name], ['loft', DELIVERIES[d[1]].name], ['block', DELIVERIES[d[2]].name]];
        panel(g, W / 2 - 150, H - 62, 300, 30, { alpha: .7 });
        prompts(g, pW, items, W / 2, H - 54, { align: 'center' });
        if (sp) prompts(g, pW, [['special', SPECIALS[m.bowlSpecialId()].name]], W / 2, H - 41, { align: 'center', color: '#5fd38a' });
        else prompts(g, pW, [['run', 'Field: ' + FIELDS[m.fieldPreset[m.bowlT]].name], ['back', m.overRound === 'over' ? 'Over the wicket' : 'Round the wicket']], W / 2, H - 41, { align: 'center', color: '#c8c0e0' });
        E.font.text(g, 'MOVE THE MARKER, THEN CHOOSE A DELIVERY', W / 2, H - 72, '#f4f0e0', { align: 'center', shadow: '#000' });
      }
      if (m.state === 'runup' && pW && m.meter) {
        const mx = W / 2 - 70, my = H - 48, half = T('meterSweet') * (.8 + (m.bowlerP().bowl.skill || 6) * .04) / 2;
        panel(g, mx - 4, my - 4, 148, 18, { alpha: .7 });
        px.rect(g, mx, my, 140, 10, '#c82a32'); px.rect(g, mx + Math.round(140 * (.5 - half - .18)), my, Math.round(140 * (2 * half + .36)), 10, '#e8a03a'); px.rect(g, mx + Math.round(140 * (.5 - half)), my, Math.round(140 * 2 * half), 10, '#5fd38a'); px.rect(g, mx + Math.round(140 * .94), my, Math.round(140 * .06), 10, '#5a0a10');
        const nx = mx + Math.round(140 * m.meter.p); px.rect(g, nx - 1, my - 3, 3, 16, m.meter.on ? '#ffffff' : '#6a6878');
        if (m.meter.lock) E.font.text(g, m.meter.lock === 'over' ? 'NO BALL!' : upper(m.meter.lock), W / 2, my - 12, m.meter.lock === 'green' ? '#5fd38a' : '#ffd23a', { align: 'center', shadow: '#000' });
        else prompts(g, pW, [['shot', 'Release']], W / 2, my - 9, { align: 'center' });
      }
      if ((m.state === 'setup' || m.state === 'runup' || m.state === 'flight') && pB && !m.swing) {
        const items = [['shot', 'Ground'], ['loft', 'Loft'], ['block', 'Defend']];
        if (!m.ball.pitched && !m.batters[0].charged) items.push(['charge', 'Charge']);
        if (m.specialReady(m.batT) && !m.batSpecial) items.push(['special', SPECIALS[m.batSpecialId()].name]);
        prompts(g, pB, items, W / 2, H - (pW ? 84 : 40), { align: 'center' });
        if (m.state === 'setup' && !pW) E.font.text(g, 'AIM WITH THE STICK OR MOUSE • NO BUTTON LEAVES IT', W / 2, H - 52, '#c8c0e0', { align: 'center', shadow: '#000' });
      }
      if (m.state === 'inPlay' && pB && !m.boundaryHit && S('running') !== 'Auto') {
        const b0 = m.batters[0], p = r.w(OX + b0.x, OY + b0.y, 34), hint = m.callHint();
        const items = b0.target === null ? [['run', 'Run'], ['back', 'Stay']] : [['run', m.thrown ? 'Dive / again' : 'Again'], ['back', 'Back!']];
        panel(g, p[0] - 52, p[1] - 22, 104, 22, { alpha: .7, rule: hint === 'YES' ? '#5fd38a' : hint === 'NO' ? '#ff6b6b' : '#ffd23a' });
        E.font.text(g, hint, p[0], p[1] - 20, hint === 'YES' ? '#5fd38a' : hint === 'NO' ? '#ff6b6b' : '#ffd23a', { align: 'center', shadow: '#000' });
        prompts(g, pB, items, p[0], p[1] - 7, { align: 'center' });
      }
      if (m.catchQTE && pF && m.t >= m.catchQTE.start - .3) { const f = m.catchQTE.f, p = r.w(OX + f.x, OY + f.y, 40); prompts(g, pF, [['shot', 'Catch!']], p[0], p[1] - 6, { align: 'center', color: '#ffd23a' }); }
      const holder = m.fielders.find(f => f.hasBall);
      if (m.state === 'inPlay' && holder && pF && m.assistMode() !== 'Auto' && !m.throwQ && !(Math.min(hyp(holder.x, holder.y), hyp(holder.x, holder.y - 320)) < 22)) {
        panel(g, W / 2 - 150, H - 58, 300, 18, { alpha: .75 });
        prompts(g, pF, [['shot', 'Keeper end'], ['loft', "Bowler's end"], ['block', 'Lob to keeper']], W / 2, H - 49, { align: 'center' });
      }
      if (m.canReview() && m.sideHumans(m.reviewSide()).length) { const pr = m.reviewSide() === m.batT ? pB : pW; panel(g, W / 2 - 70, H * .45, 140, 22, { rule: '#7ae0ff' }); prompts(g, pr || game.input, [['special', 'Review (' + Math.ceil(m.reviewWin) + ')']], W / 2, H * .45 + 11, { align: 'center', color: '#7ae0ff' }); }
      if (m.state === 'dead' && !m.review && !m.reviewWin && (m.replay || m.st > 1.2)) prompts(g, game.input, [['confirm', 'Skip']], W - 6, 24, { align: 'right', color: '#c8c0e0' });
    }
    // the speech bubble (YES! NO!)
    if (m.bubble) { const b0 = m.batters[0], p = r.w(OX + b0.x, OY + b0.y, 44); panel(g, p[0] - 16, p[1] - 30, 32, 11, { alpha: .9, bg: '#f4f0e0', rule: '#1a1a24' }); E.font.text(g, m.bubble.text, p[0], p[1] - 29, '#1a1a24', { align: 'center' , outline: false, shadow: false }); }
    // the radar in the wide shot
    if (WORLD.shot === 'wide' && !big) {
      const rx = W - 46, ry = 44, bb = m.boundary(), k = 34 / bb.ry;
      px.blend(g, .6, 'normal', () => px.disc(g, rx, ry, 30, '#0e1a10')); px.disc(g, rx, ry, 30, '#2a5a2a'); px.disc(g, rx, ry, 29, '#0e2a12');
      for (const f of m.fielders) px.rect(g, Math.round(rx + f.x * k * .85), Math.round(ry + (f.y - 160) * k * .85), 2, 2, m.teams[m.bowlT].chip === '#1a1a22' ? '#7a3aff' : m.teams[m.bowlT].chip);
      for (const b of m.batters) px.rect(g, Math.round(rx + b.x * k * .85), Math.round(ry + (b.y - 160) * k * .85), 2, 2, '#f4f0e0');
      px.rect(g, Math.round(rx + m.ball.x * k * .85), Math.round(ry + (m.ball.y - 160) * k * .85), 2, 2, '#ff4a4a');
    }
    if (m.replay && m.replay.on) { px.rect(g, 6, 40, 44, 11, '#c82a32'); E.font.text(g, 'REPLAY', 28, 42, '#ffffff', { align: 'center' }); }
    // the review: Owl-Eye's three lights, then the stamp
    if (m.review) {
      const rv = m.review, x = W / 2 - 80, y = 22; panel(g, x, y, 160, 46, { rule: '#7ae0ff' });
      E.font.text(g, 'OWL-EYE', W / 2, y + 3, '#7ae0ff', { align: 'center', shadow: '#000' });
      ['PITCHING', 'IMPACT', 'WICKETS'].forEach((n, k) => { const show = rv.t > .8 + k * .7, c = { green: '#5fd38a', red: '#ff4a4a', amber: '#ffb03a' }[rv.lights[k]]; px.disc(g, x + 30 + k * 50, y + 20, 6, show ? c : '#3a3450'); E.font.text(g, n, x + 30 + k * 50, y + 30, '#c8c0e0', { align: 'center' }); });
      if (rv.t > 3) bigTitle(g, rv.verdict ? 'OUT' : 'NOT OUT', W / 2, y + 52, { scale: 3, colors: rv.verdict ? ['#ffffff', '#ff4a4a', '#8a1a1a'] : ['#ffffff', '#5fd38a', '#1a6a3a'] });
      if (rv.tr.umpCall && rv.t > 2.4) E.font.text(g, "UMPIRE'S CALL", W / 2, y + 38, '#ffb03a', { align: 'center', shadow: '#000' });
    }
    if (m.third && !m.third.done || (m.third && m.third.t < 4.2)) {
      const t = m.third.t; px.rect(g, 10, 30, W - 20, 2, '#7ae0ff'); px.rect(g, 10, H - 40, W - 20, 2, '#7ae0ff');
      E.font.text(g, 'THIRD UMPIRE', W / 2, 36, '#7ae0ff', { align: 'center', scale: 2, shadow: '#000' });
      const reel = t < 2.2 ? (Math.floor(t * 10) % 2 ? 'OUT' : 'NOT OUT') : (m.ballRec && m.ballRec.wicket ? 'OUT' : 'NOT OUT');
      if (t > 1) bigTitle(g, reel, W / 2, H / 2 - 10, { scale: 3, colors: reel === 'OUT' ? ['#ffffff', '#ff4a4a', '#8a1a1a'] : ['#ffffff', '#5fd38a', '#1a6a3a'] });
    }
    // the bowler picker (a human captain)
    if (m.needBowler && m.state === 'between') drawBowlerPicker(g, r, m);
    // cards: the innings break, the Super Over, the rain and the Kerfuffle Method, the advert break
    if (m.state === 'break') drawBreakCard(g, r, m);
    if (m.rain) drawRainCard(g, r, m);
    if (m.advert > 0) { panel(g, 20, H / 2 - 40, W - 40, 80, { rule: '#ffcf3a', bg: '#1a0a2a' }); bigTitle(g, 'THRUMPTON PARKING', W / 2, H / 2 - 30, { scale: 2 }); E.font.text(g, 'PARK LIKE A LORD. FOUR HUNDRED SPACES. NO CRICKET.', W / 2, H / 2 + 2, '#f4f0e0', { align: 'center', shadow: '#000' }); E.font.text(g, 'A WORD FROM OUR SPONSOR', W / 2, H / 2 + 18, '#c8c0e0', { align: 'center' }); }
    drawCaption(g, r, H - 30);
    HUD.rects = L;
  });
}
const PICK = { i: 0 };
function drawBowlerPicker(g, r, m) {
  const list = m.needBowler, W = r.W, H = r.H, n = list.length, cw = Math.min(78, Math.floor((W - 20) / n) - 4), x0 = W / 2 - (n * (cw + 4)) / 2;
  panel(g, 0, H / 2 - 62, W, 124, { rule: '#ffd23a' });
  E.font.text(g, 'CHOOSE THE BOWLER', W / 2, H / 2 - 56, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' });
  HUD.pick = [];
  list.forEach((p, k) => {
    const x = Math.round(x0 + k * (cw + 4)), y = H / 2 - 36, foc = k === PICK.i, c = m.bowlCard(p.id);
    HUD.pick.push([x, y, cw, 84]);
    px.rect(g, x, y, cw, 84, foc ? '#3a2a5a' : '#1a1430'); if (foc) { px.rect(g, x, y, cw, 1, '#ffd23a'); px.rect(g, x, y + 83, cw, 1, '#ffd23a'); }
    rigFor(p, 'field').drawPortrait(g, x + cw / 2 - 14, y + 4, 28, { zoom: 3, turn: .4, bg: '#0e0c1c' });
    E.font.text(g, p.short.slice(0, 11), x + cw / 2, y + 36, foc ? '#ffe9a0' : '#f4f0e0', { align: 'center' });
    E.font.text(g, upper(p.bowl.fam), x + cw / 2, y + 46, '#7ad0ff', { align: 'center' });
    E.font.text(g, c.overs + '/' + m.maxOvers() + ' OV', x + cw / 2, y + 56, '#c8c0e0', { align: 'center' });
    if (p.bsp) E.font.text(g, SPECIALS[p.bsp].name.slice(0, 13), x + cw / 2, y + 68, '#5fd38a', { align: 'center' });
  });
  footer(g, r, [['left', ''], ['confirm', 'Bowl']]);
}
function drawBreakCard(g, r, m) {
  const W = r.W, H = r.H, prev = m.inn[m.i - 1] || m.I, kind = m.breakKind;
  panel(g, W / 2 - 150, H / 2 - 70, 300, 140, { rule: '#ffd23a' });
  bigTitle(g, kind === 'superover' ? 'SUPER OVER!' : m.I.so ? 'SUPER OVER' : 'TEA', W / 2, H / 2 - 62, { scale: 3 });
  const top = prev.cards.slice().sort((a, b) => b.runs - a.runs)[0];
  E.font.text(g, m.teams[prev.bat].name + ' ' + prev.runs + '/' + prev.wkts, W / 2, H / 2 - 28, '#f4f0e0', { align: 'center', scale: 1, shadow: '#000' });
  if (top) E.font.text(g, 'TOP SCORER: ' + top.p.short + ' ' + top.runs, W / 2, H / 2 - 16, '#c8c0e0', { align: 'center', shadow: '#000' });
  E.font.text(g, (m.teams[m.I.bat].name + ' NEED ' + (m.target() || 0) + ' TO WIN').toUpperCase(), W / 2, H / 2 - 2, '#ffd23a', { align: 'center', shadow: '#000' });
  if (kind === 'superover') E.font.text(g, 'ONE OVER EACH, TWO WICKETS. TIED AGAIN? MOST BOUNDARIES WINS.', W / 2, H / 2 + 10, '#c8c0e0', { align: 'center' });
  if (m.needTea) { const items = TEA_TREATS; items.forEach((t, k) => { const x = W / 2 - 138 + k * 94, y = H / 2 + 16, foc = k === PICK.tea; px.rect(g, x, y, 88, 40, foc ? '#3a2a5a' : '#1a1430'); if (foc) px.rect(g, x, y, 88, 1, '#ffd23a'); E.font.text(g, t.name, x + 44, y + 6, foc ? '#ffe9a0' : '#f4f0e0', { align: 'center' }); E.font.wrap(t.text, 82).slice(0, 2).forEach((l, j) => E.font.text(g, l, x + 44, y + 18 + j * 9, '#c8c0e0', { align: 'center' })); }); HUD.tea = items.map((t, k) => [W / 2 - 138 + k * 94, H / 2 + 16, 88, 40]); footer(g, r, [['left', ''], ['confirm', 'Choose a tea treat']]); }
  else footer(g, r, [['confirm', 'Continue']]);
}
const TEA_TREATS = [{ id: 'sponge', name: 'VICTORIA SPONGE', text: 'Hype +40, at once' }, { id: 'tea', name: "BUILDER'S TEA", text: 'Timing windows +10%' }, { id: 'sandwich', name: 'CUCUMBER SANDWICH', text: 'Run speed +10%' }];
function drawRainCard(g, r, m) {
  const W = r.W, H = r.H, rn = m.rain;
  if (!rn.done) { panel(g, W / 2 - 120, 40, 240, 30, { rule: '#7ad0ff' }); E.font.text(g, 'RAIN STOPS PLAY', W / 2, 46, '#7ad0ff', { align: 'center', scale: 2, shadow: '#000' }); return; }
  const res = m.rainResult;
  panel(g, W / 2 - 140, H / 2 - 60, 280, 110, { bg: '#1a2a1a', rule: '#f4f0e0' });
  E.font.text(g, "MRS CRUMB'S CHALKBOARD", W / 2, H / 2 - 54, '#f4f0e0', { align: 'center', shadow: '#000' });
  E.font.text(g, 'THE KERFUFFLE METHOD', W / 2, H / 2 - 42, '#c8c0a0', { align: 'center' });
  E.font.text(g, 'resources × (1 - 0.07 × wickets), carry the scone...', W / 2, H / 2 - 28, '#d8d8c8', { align: 'center' });
  if (res) { bigTitle(g, 'NEW TARGET ' + res.target, W / 2, H / 2 - 14, { scale: 2 }); E.font.text(g, 'FROM ' + m.I.overs + ' OVERS', W / 2, H / 2 + 10, '#ffd23a', { align: 'center', shadow: '#000' }); }
  else E.font.text(g, 'AN OVER LOST. PLAY ON!', W / 2, H / 2, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' });
}

// ---- 50-front.js ----
// ---- the front end (5.15.3): the title (and the touch-only gate), the main menu, story, setup, the versus lobby, the
// toss, the story map, cutscenes, results and About/Credits. One decision per screen, big type, the focus a cricket ball.
const SC = {};
const IDLE = { t: 0, sig: '' };
// any input resets the idle timer (an action, a key, the mouse, a pad's stick or buttons, a touch)
function inputSig() {
  const I = game.input; const m = I.mouse || {}; const pm = I.padMove || [0, 0];
  const mv = I.move(), touch = I.stickOn || (I.drag && I.drag()), ptr = I.pointer ? I.pointer() : null;
  return [I.anyPressed() ? game.time : '', m.t, Math.abs(pm[0]) > .3 || Math.abs(pm[1]) > .3 || hyp(mv[0], mv[1]) > .3 ? game.time : '', I.clicked && I.clicked() ? game.time : '', touch ? game.time : '', ptr ? ptr[0] + ',' + ptr[1] : '', I.lastDevice].join('|');
}
function anyInput() { const I = game.input; const s = inputSig(); const changed = s !== IDLE.sig; IDLE.sig = s; return changed || I.anyPressed(); }
function idleStep(dt, scene) {
  if (HUB) return;
  if (anyInput()) IDLE.t = 0; else IDLE.t += dt;
  if (IDLE.t >= 10) { IDLE.t = 0; game.go('attract', { from: scene }); }
}
// a scenery match: the ground with a batter knocking up, fielders and Doris, behind the menus
let BACK = null;
function backdrop(gid = 'green') {
  if (BACK && BACK.gid === gid) return BACK;
  const m = new Match({ teams: ['ker', 'mud'], ground: gid, overs: 2, mode: 'scenery', seed: 7, kerfuffle: false });
  m._placeAll(); m.setBowler(m.eligibleBowlers()[0].id); m._placeAll();
  m.critters = [{ kind: 'cow', x: 300, y: 380, vx: -6, vy: 2, t: 0 }];
  BACK = { gid, m, t: 0 };
  return BACK;
}
function drawBackdrop(r, dt, o = {}) {
  const B = backdrop(o.gid || 'green'), m = B.m; B.t += dt;
  useGround(B.gid, m);
  if (game.view !== VIEWS.story) game.setView(VIEWS.story);
  const ang = B.t * .05;
  game.cam.smooth = 0; game.focus(OX + Math.sin(ang) * 120, OY + 150 + Math.cos(ang) * 80, 0);
  m.chaosStep(dt);
  for (const k of m.critters) if (Math.abs(k.x) > 500) k.vx = -k.vx;
  const b0 = m.batters[0]; b0.animT += dt; if (b0.animT > 2.4) { b0.anim = 'swing'; b0.sw = { fam: pick(['drive', 'pull', 'loft']), at: .13, th: (Math.random() - .5) * 2, h: 1 }; b0.animT = 0; } else if (b0.anim === 'swing' && b0.animT > 1) b0.anim = 'stance';
  for (const f of m.fielders) f.animT += dt;
  m.time = o.time || 'dusk';
  drawWorld(r, m, dt);
}
// ---------------------------------------------------------------- the title
SC.title = {
  enter(d) { music('title'); this.phase = d && d.menu ? 'menu' : 'press'; this.t = 0; IDLE.t = 0; this.menu = mainMenu(); game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]); },
  update(dt) {
    this.t += dt; idleStep(dt, 'title');
    const I = game.input;
    if (I.anyPressed() && (I.lastDevice === 'gamepad' || I.lastDevice === 'keyboard')) TOUCH.seenKey = true;
    if (TOUCH.gate !== touchOnly()) TOUCH.gate = touchOnly();
    if (TOUCH.gate) { const c = I.clicked && I.clicked(); if (c && this.gateBtn && c[0] >= this.gateBtn[0] && c[0] < this.gateBtn[0] + this.gateBtn[2] && c[1] >= this.gateBtn[1] && c[1] < this.gateBtn[1] + this.gateBtn[3]) game.menu('settings'); return; }
    if (this.phase === 'press') { if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked()) || I.pressed('shot')) { sfx('confirm'); this.phase = 'menu'; I.consumeAll(); } return; }
    this.menu.update(dt);
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { time: 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      const menu = this.phase === 'menu' && !TOUCH.gate, ts = menu ? 3 : 4, ty = menu ? 8 : 22;
      bigTitle(g, 'CRICKET', W / 2, ty, { scale: ts }); bigTitle(g, 'KERFUFFLE', W / 2, ty + ts * 8, { scale: ts, colors: ['#ffffff', '#ff8a5a', '#c83a2a'] });
      E.font.text(g, 'EVERY BALL A COMMOTION. THE TEA IS ALWAYS STEWED.', W / 2, ty + ts * 16 + 6, '#f4f0e0', { align: 'center', shadow: '#000' });
      if (TOUCH.gate) {
        panel(g, W / 2 - 130, H / 2 - 10, 260, 90, { rule: '#ffd23a' });
        E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', W / 2, H / 2, '#ffd23a', { align: 'center', shadow: '#000' });
        // a pad and a keyboard, drawn
        px.rect(g, W / 2 - 70, H / 2 + 16, 40, 18, '#3a3a46'); px.disc(g, W / 2 - 64, H / 2 + 25, 5, '#3a3a46'); px.disc(g, W / 2 - 36, H / 2 + 25, 5, '#3a3a46'); px.disc(g, W / 2 - 40, H / 2 + 22, 2, '#7aa7ff'); px.disc(g, W / 2 - 60, H / 2 + 24, 2, '#c8c8d0');
        px.rect(g, W / 2 + 20, H / 2 + 16, 52, 18, '#3a3a46'); for (let k = 0; k < 8; k++) for (let j = 0; j < 3; j++) px.rect(g, W / 2 + 23 + k * 6, H / 2 + 19 + j * 5, 4, 3, '#d8d8e0');
        this.gateBtn = [W / 2 - 40, H / 2 + 46, 80, 18]; px.rect(g, ...this.gateBtn, '#ffd23a'); E.font.text(g, 'SETTINGS', W / 2, H / 2 + 51, '#1a1430', { align: 'center' , outline: false, shadow: false });
        return;
      }
      if (this.phase === 'press') { if (Math.floor(this.t * 2) % 2 === 0) { const w = measureGlyph(game.input, 'confirm'); E.font.text(g, 'PRESS', W / 2 - w / 2 - 4, H - 60, '#ffffff', { align: 'right', scale: 2, shadow: '#000' }); glyph(g, game.input, 'confirm', W / 2 - w / 2 + 2, H - 54); } E.font.text(g, E.versionLabel ? 'my-3D2dge ' + String(E.versionLabel()).replace(/[^\x20-\x7e]/g, '-') : '', W / 2, H - 12, '#8a84a8', { align: 'center' }); return; }
      this.menu.draw(g, W / 2, 76, 210, { lh: 18 });
      footer(g, r, [['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};
function mainMenu() {
  const hasSave = profile.story.chapter > 1 || Object.keys(profile.story.stars).length > 0;
  return new BigMenu([
    { label: 'Story', note: 'THE GRAND KERFUFFLE: FIVE MATCHES TO SAVE THE GREEN', act: () => game.go('story', { hasSave }) },
    { label: 'Quick Match', note: 'ANY TWO TEAMS, ANY GROUND, ONE TO FIVE OVERS', act: () => game.go('setup', { mode: 'quick' }) },
    { label: 'Versus', note: '2 TO 4 PLAYERS ON ONE SCREEN: PADS OR TWO ON A KEYBOARD', act: () => game.go('setup', { mode: 'versus' }) },
    { label: 'Super Over Showdown', note: 'ONE OVER. THE THRUMPTONATOR. HIGH SCORES.', act: () => game.go('showmenu') },
    { label: 'Nets', note: 'LESSONS WITH MRS CRUMB, PRACTICE, THE SIX MACHINE', act: () => game.go('netsmenu') },
    { label: 'Extras', note: 'SETTINGS, CONTROLS, ABOUT AND CREDITS', act: () => game.go('extras') }
  ], { onBack: () => { SC.title.phase = 'press'; } });
}
// a simple list screen over the backdrop
function listScene(name, titleText, items, back = 'title', o = {}) {
  return {
    enter(d) { this.d = d || {}; this.menu = new BigMenu(typeof items === 'function' ? items(this.d) : items, { onBack: () => game.go(back, { menu: true }) }); IDLE.t = 0; if (o.music) music(o.music); },
    update(dt) { idleStep(dt, name); this.menu.update(dt); },
    draw(r) { drawBackdrop(r, 1 / 60, { time: o.time || 'day', gid: o.gid }); r.overlay(g => { px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818')); bigTitle(g, titleText, r.W / 2, 18, { scale: 3 }); if (o.sub) E.font.text(g, o.sub(this.d), r.W / 2, 46, '#c8c0e0', { align: 'center', shadow: '#000' }); this.menu.draw(g, r.W / 2, 66, 240); footer(g, r, [['confirm', 'Select'], ['cancel', 'Back']]); }); }
  };
}
SC.story = listScene('story', 'THE GRAND KERFUFFLE', d => [
  { label: 'Continue', disabled: !d.hasSave, note: 'CHAPTER ' + profile.story.chapter + ': ' + upper((CHAPTERS[Math.min(4, profile.story.chapter - 1)] || CHAPTERS[0]).title), act: () => game.go('storymap') },
  { label: d.hasSave ? 'New Game (starts again)' : 'New Game', note: d.hasSave ? 'YOUR STARS ARE KEPT ON THE MAP. PRESS AGAIN TO CONFIRM.' : 'FROM THE PROLOGUE', act: it => { if (d.hasSave && !it.sure) { it.sure = true; it.label = 'Are you sure? Press again'; return; } profile.story = { chapter: 1, stars: profile.story.stars, best: {}, done: false }; saveProfile(); game.go('cutscene', { lines: PROLOGUE, ground: 'green', title: 'PROLOGUE', next: () => game.go('storymap') }); } },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
], 'title', { sub: () => 'SAVE THE VILLAGE GREEN FROM LORD THRUMPTON' });
SC.extras = listScene('extras', 'EXTRAS', [
  { label: 'Settings', act: () => game.menu('settings') }, { label: 'Controls', act: () => game.menu('controls') },
  { label: 'About and Credits', act: () => game.go('about') }, { label: 'Back', act: () => game.go('title', { menu: true }) }
]);
SC.showmenu = listScene('showmenu', 'SUPER OVER SHOWDOWN', [
  { label: 'Bat', note: 'SIX BALLS FROM THE THRUMPTONATOR 3000, TWO WICKETS. SCORE = RUNS.', act: () => startShowdown('bat') },
  { label: 'Bowl', note: 'DEFEND 14 AGAINST KEV "THONGS" MALONE. SCORE = (14 - RUNS) × 10 + 25 A WICKET.', act: () => startShowdown('bowl') },
  { label: 'High Scores', act: () => game.go('table', { modes: ['bat', 'bowl'] }) },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
], 'title', { gid: 'dome', time: 'night', music: 'showdown' });
SC.netsmenu = listScene('netsmenu', 'THE NETS', [
  { label: 'Lessons', note: 'ELEVEN LESSONS WITH MRS CRUMB', act: () => game.go('lessons') },
  { label: 'Free Practice: Bat', note: 'THE BOWLING MACHINE, ANY DELIVERY', act: () => startNets({ kind: 'bat' }) },
  { label: 'Free Practice: Bowl', note: 'BOWL AT A DUMMY BATTER', act: () => startNets({ kind: 'bowl' }) },
  { label: 'The Six Machine', note: 'TWELVE BALLS. RUNS PLUS TARGET BONUSES. A HIGH-SCORE TABLE.', act: () => startNets({ kind: 'six' }) },
  { label: 'Back', act: () => game.go('title', { menu: true }) }
]);
SC.lessons = listScene('lessons', 'LESSONS', () => LESSONS.map((L, k) => ({ label: (profile.lessons.includes(L.id) ? '★ ' : '') + (k + 1) + '. ' + L.title, note: upper(L.text[0]).slice(0, 60), act: () => startNets({ kind: 'lesson', lesson: k }) })).concat([{ label: 'Back', act: () => game.go('netsmenu') }]), 'netsmenu');
// ---------------------------------------------------------------- match setup (quick match and versus)
SC.setup = {
  enter(d) {
    this.mode = d.mode; IDLE.t = 0; this.joined = []; this.side = [];
    const unl = profile.unlocked, teams = TEAMS.map(t => t.id).filter(id => this.mode === 'versus' || unl.includes(id) || id === 'ker');
    const opp = TEAMS.map(t => t.id);
    this.cfg = { a: 'ker', b: this.mode === 'versus' ? 'gen' : 'mud', ground: 'green', overs: +(game.settings.overs || 2), wickets: +(game.settings.wickets || 5), diff: game.settings.difficulty || 'County', time: 'Default', weather: 'Default', kerf: game.settings.kerfuffle !== false };
    const tName = id => TEAM[id].name, gName = id => GROUNDS[id].name;
    this.items = [
      opt(this.mode === 'versus' ? 'Home side' : 'Your team', teams, 'ker', v => { this.cfg.a = v; }, { show: tName }),
      opt('Opponents', opp.filter(id => this.mode === 'versus' || profile.unlocked.includes(id) || id === 'mud' || true), this.cfg.b, v => { this.cfg.b = v; }, { show: id => tName(id) + (this.mode !== 'versus' && !profile.unlocked.includes(id) ? ' (beat them to unlock)' : '') }),
      opt('Ground', GROUND_ORDER, 'green', v => { this.cfg.ground = v; }, { show: gName }),
      opt('Overs', [1, 2, 3, 4, 5], this.cfg.overs, v => { this.cfg.overs = v; }),
      opt('Wickets', [2, 3, 5, 10], this.cfg.wickets, v => { this.cfg.wickets = v; }),
      opt('Difficulty', ['Village', 'County', 'Test', 'Kerfuffle!'], this.cfg.diff, v => { this.cfg.diff = v; }),
      opt('Time of day', ['Default', 'Day', 'Dusk', 'Night'], 'Default', v => { this.cfg.time = v; }),
      opt('Weather', ['Default', 'Clear', 'Overcast', 'Rain', 'Fog'], 'Default', v => { this.cfg.weather = v; }),
      opt('Kerfuffle rules', ['On', 'Off'], this.cfg.kerf ? 'On' : 'Off', v => { this.cfg.kerf = v === 'On'; }, { note: 'OFF: PURIST ARCADE. NO ITEMS, SPECIALS OR CHAOS.' }),
      { label: this.mode === 'versus' ? 'Start (players join first)' : 'Play', act: () => this.start() }
    ];
    this.menu = new BigMenu(this.items, { onBack: () => game.go('title', { menu: true }) });
    if (this.mode === 'versus') { game.allowJoin({ max: 4, onJoin: (inp, n) => { this.side[n - 1] = (n - 1) % 2; sfx('coin'); } }); this.side = [0]; }
    music('title');
  },
  exit() { if (this.mode === 'versus') game.allowJoin(false); },
  start() {
    const c = this.cfg, diff = { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[c.diff];
    const humans = [[], []];
    if (this.mode === 'versus') game.players.forEach((p, k) => humans[this.side[k] || 0].push(p)); else humans[0].push(game.input);
    if (this.mode === 'versus' && game.players.length < 2) { callout('A SECOND PLAYER: PRESS START ON A PAD, OR 2', '#ffd23a', 2, { small: true }); return; }
    const cfg = { mode: this.mode === 'versus' ? 'versus' : 'quick', teams: [c.a, c.b === c.a ? (c.a === 'ker' ? 'mud' : 'ker') : c.b], ground: c.ground, overs: c.overs, wickets: c.wickets, difficulty: diff, kerfuffle: c.kerf,
      timeOfDay: c.time === 'Default' ? null : c.time.toLowerCase(), weather: c.weather === 'Default' ? null : c.weather.toLowerCase(), humans, toss: true };
    game.go('toss', { cfg });
  },
  update(dt) {
    idleStep(dt, 'setup'); this.menu.update(dt); hudStep(dt);
    if (this.mode === 'versus') for (let k = 1; k < game.players.length; k++) { const p = game.players[k]; if (p.pressed('left')) this.side[k] = 0; if (p.pressed('right')) this.side[k] = 1; }
    if (this.mode === 'versus') { const p = game.input; if (this.menu.i === this.items.length - 1 && (p.pressed('left') || p.pressed('right'))) this.side[0] = 1 - (this.side[0] || 0); }
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: this.cfg.ground, time: 'day' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, this.mode === 'versus' ? 'VERSUS' : 'QUICK MATCH', W / 2, 8, { scale: 2 });
      this.menu.draw(g, W / 2, 34, Math.min(300, W - 40), { lh: 15, scale: 1 });
      // the team cards
      for (const [id, x] of [[this.cfg.a, 26], [this.cfg.b, W - 26]]) { const t = TEAM[id], st = squad(t)[0]; const rig = rigFor(st, 'bat'); rig.drawPortrait(g, x - 14, H - 64, 28, { zoom: 3, turn: .4, bg: t.chip }); E.font.text(g, t.code, x, H - 34, '#f4f0e0', { align: 'center', shadow: '#000' }); }
      if (this.mode === 'versus') {
        E.font.text(g, 'PLAYERS JOIN: START ON A FREE PAD, OR 2 ON THE KEYBOARD. LEFT / RIGHT PICKS A SIDE.', W / 2, H - 30, '#c8c0e0', { align: 'center', shadow: '#000' });
        game.players.forEach((p, k) => { const s = this.side[k] || 0, x = s ? W - 70 : 70; E.font.text(g, p.name || 'P' + (k + 1), x, H - 84 - (k >> 1) * 10 + (k & 1) * 10, p.color || E.PLAYER_COLORS[k], { align: 'center', shadow: '#000' }); });
      }
      footer(g, r, [['up', ''], ['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
      for (const c of CALL.list) E.font.text(g, c.text, W / 2, H / 2, c.color, { align: 'center', shadow: '#000' });
    });
  }
};
// ---------------------------------------------------------------- the toss
SC.toss = {
  enter(d) { this.cfg = d.cfg; this.t = 0; this.phase = 'call'; this.call = null; sting('toss'); const R = E.rng(this.cfg.seed || (Math.random() * 1e9) >>> 0); this.heads = R() < .5; this.cpuChoice = R() < .5 ? 'bat' : 'bowl'; this.vs = this.cfg.mode === 'versus'; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (this.phase === 'call') { if (I.pressed('confirm') || I.pressed('shot')) { this.call = 'heads'; this.phase = 'flip'; this.t = 0; sfx('coin'); } else if (I.pressed('cancel') || I.pressed('block')) { this.call = 'tails'; this.phase = 'flip'; this.t = 0; sfx('coin'); } else if (this.t > 15) { this.call = 'heads'; this.phase = 'flip'; this.t = 0; } return; }
    if (this.phase === 'flip' && this.t > 1.6) { this.won = (this.call === 'heads') === this.heads; this.phase = this.won ? 'choose' : 'lost'; this.t = 0; }
    if (this.phase === 'choose') { if (I.pressed('confirm') || I.pressed('shot')) this.go('bat'); else if (I.pressed('cancel') || I.pressed('block')) this.go('bowl'); }
    if (this.phase === 'lost' && (this.t > 2.2 || I.pressed('confirm'))) this.go(this.cpuChoice === 'bat' ? 'bowl' : 'bat');
  },
  go(choice) { const c = this.cfg; c.batFirst = choice === 'bat' ? c.teams[0] : c.teams[1]; startMatch(c); },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: this.cfg.ground, time: 'day' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, 'THE TOSS', W / 2, 20, { scale: 3 });
      const spin = this.phase === 'flip' ? this.t * 14 : 0, yy = H / 2 - 20 - (this.phase === 'flip' ? Math.sin(Math.min(1, this.t / 1.6) * Math.PI) * 50 : 0), wd = Math.max(1, Math.abs(Math.cos(spin)) * 16);
      const showHeads = this.phase === 'flip' ? Math.cos(spin) > 0 : this.heads;
      px.ell ? px.ell(g, W / 2, yy, wd, 16, '#c8a040') : px.disc(g, W / 2, yy, 16, '#c8a040'); px.disc(g, W / 2, yy, Math.min(wd, 13), '#e8c060'); if (wd > 8) E.font.text(g, this.phase === 'call' ? '?' : showHeads ? 'H' : 'T', W / 2, yy - 3, '#6a4a10', { align: 'center' , outline: false, shadow: false });
      const I = game.input;
      if (this.phase === 'call') prompts(g, I, [['confirm', 'Heads'], ['cancel', 'Tails']], W / 2, H - 50, { align: 'center' });
      if (this.phase === 'choose') { E.font.text(g, 'YOU WON THE TOSS', W / 2, H - 70, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); prompts(g, I, [['confirm', 'Bat first'], ['cancel', 'Bowl first']], W / 2, H - 44, { align: 'center' }); }
      if (this.phase === 'lost') { E.font.text(g, (this.vs ? 'THE OTHER SIDE WINS THE TOSS: THEY ' : 'THEY WIN THE TOSS AND ') + (this.cpuChoice === 'bat' ? 'BAT' : 'BOWL'), W / 2, H - 60, '#f4f0e0', { align: 'center', shadow: '#000' }); }
    });
  }
};
// ---------------------------------------------------------------- the story map
const MAP_PINS = [[.18, .7], [.36, .45], [.55, .74], [.72, .4], [.86, .62]];
SC.storymap = {
  enter() { music('map'); this.i = Math.min(4, profile.story.chapter - 1); this.t = 0; this.bus = this.i; IDLE.t = 0; if (!HUB) try { game.saves.autosave(); } catch (e) { /* storage blocked */ } },
  update(dt) {
    this.t += dt; idleStep(dt, 'storymap'); const I = game.input, max = Math.min(4, profile.story.chapter - 1);
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { this.i = Math.max(0, this.i - 1); sfx('select'); }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { this.i = Math.min(max, this.i + 1); sfx('select'); }
    const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked();
    if (this.pins) { if (p) { const k = this.pins.findIndex(q => hyp(q[0] - p[0], q[1] - p[1]) < 12); if (k >= 0 && k <= max && k !== this.i) { this.i = k; sfx('select'); } } if (c) { const k = this.pins.findIndex(q => hyp(q[0] - c[0], q[1] - c[1]) < 12); if (k >= 0 && k <= max) { this.i = k; this.play(); return; } } }
    this.bus += (this.i - this.bus) * Math.min(1, dt * 3);
    if (I.pressed('confirm')) this.play();
    if (I.pressed('cancel')) game.go('title', { menu: true });
  },
  play() { sfx('confirm'); sting('chapter'); startChapter(this.i + 1); },
  draw(r) {
    r.sky(['#6a9a4a', '#5a8a3a']);
    r.overlay(g => {
      const W = r.W, H = r.H;
      // a painted county: fields, hedges, a river, the road between the grounds
      const R = E.rng(5); for (let k = 0; k < 40; k++) { const x = R() * W, y = R() * H, w = 30 + R() * 60, h = 20 + R() * 40; px.rect(g, x, y, w, h, pick(['#7aaa52', '#6a9a48', '#8ab85a', '#c8b86a'], R)); px.rect(g, x, y, w, 1, '#3f6a2a'); }
      for (let x = 0; x < W; x++) px.rect(g, x, Math.round(H * .25 + Math.sin(x * .02) * 12), 1, 5, '#4a8ad0');
      this.pins = MAP_PINS.map(([fx, fy]) => [Math.round(fx * W), Math.round(fy * H)]);
      for (let k = 0; k < 4; k++) { const [x0, y0] = this.pins[k], [x1, y1] = this.pins[k + 1]; for (let s = 0; s <= 20; s++) px.rect(g, Math.round(x0 + (x1 - x0) * s / 20), Math.round(y0 + (y1 - y0) * s / 20), 3, 3, '#d8c8a0'); }
      const max = Math.min(4, profile.story.chapter - 1);
      CHAPTERS.forEach((C, k) => {
        const [x, y] = this.pins[k], open = k <= max, foc = k === this.i, stars = profile.story.stars[C.n] || 0;
        px.disc(g, x, y, foc ? 9 : 7, open ? (foc ? '#ffd23a' : '#f4f0e0') : '#6a6a6a'); px.disc(g, x, y, foc ? 6 : 4, open ? GROUNDS[C.ground].accent : '#3a3a3a');
        E.font.text(g, String(C.n), x, y - 3, '#ffffff', { align: 'center' });
        for (let s = 0; s < 3; s++) E.font.text(g, '★', x - 8 + s * 8, y + 10, s < stars ? '#ffd23a' : '#3a3a3a', { align: 'center' });
      });
      // the minibus
      const bi = Math.floor(this.bus), bf = this.bus - bi, a = this.pins[bi], b = this.pins[Math.min(4, bi + 1)], bx = a[0] + (b[0] - a[0]) * bf, by = a[1] + (b[1] - a[1]) * bf;
      px.rect(g, bx - 8, by - 20, 16, 8, '#2f6b3a'); px.rect(g, bx - 8, by - 24, 16, 4, '#f2ead8'); px.disc(g, bx - 5, by - 12, 2, '#1a1a1a'); px.disc(g, bx + 5, by - 12, 2, '#1a1a1a');
      const C = CHAPTERS[this.i];
      panel(g, 8, 8, W - 16, 52, { rule: GROUNDS[C.ground].accent });
      E.font.text(g, 'CHAPTER ' + C.n + ': ' + upper(C.title), 14, 13, '#ffd23a', { scale: 2, shadow: '#000' });
      E.font.text(g, upper(TEAM[C.opp].name) + ' AT ' + upper(GROUNDS[C.ground].name), 14, 31, '#f4f0e0', { shadow: '#000' });
      E.font.wrap(C.blurb, W - 40).slice(0, 2).forEach((l, k) => E.font.text(g, l, 14, 41 + k * 9, '#c8c0e0'));
      C.goals.forEach(([gname], k) => { const got = (profile.story.best[C.n] || []).includes(k); E.font.text(g, (got ? '★ ' : '• '.replace('•', '•') + ' ') + upper(gname), 14, H - 50 + k * 10, got ? '#ffd23a' : '#f4f0e0', { shadow: '#000' }); });
      footer(g, r, [['left', 'Choose'], ['confirm', 'Play'], ['cancel', 'Back']]);
    });
  }
};
// ---------------------------------------------------------------- cutscenes: a vignette on the ground with the cast posed
SC.cutscene = {
  enter(d) {
    this.d = d; this.i = 0; this.t = 0; this.hold = 0; this.finished = false; this.caption = null; this.waitCap = false; music('tea');
    this.talk = new E.Dialog(game, { lines: 3, place: 'bottom', voice: null, border: '#ffd23a', bg: ['#1a1430', '#0e0c1c'] });
    this.next();
  },
  next() {
    const L = this.d.lines;
    if (this.i >= L.length) { this.done(); return; }
    const [who, text] = L[this.i++];
    if (who === '*') { this.caption = text.replace(/\{[^}]*\}/g, ''); this.capT = 0; this.talk.close(); this.waitCap = true; return; }
    this.caption = null; this.waitCap = false;
    const V_ = VOICES[who] || VOICES.aubrey;
    this.talk.say(text, { name: V_.name, portrait: portraitRig(who), onDone: () => this.next() });
    say(text, who); this.who = who;
  },
  done() { if (this.finished) return; this.finished = true; const n = this.d.next; this.talk.close(); if (n) n(); else game.go('storymap'); },
  update(dt) {
    this.t += dt; const I = game.input;
    // hold confirm for a second to skip the scene (or cancel)
    if (I.down('confirm') || I.down('shot')) this.hold += dt; else this.hold = 0;
    if (this.hold > 1 || I.pressed('cancel')) { this.done(); return; }
    if (this.waitCap) { this.capT += dt; if (this.capT > 3 || (this.capT > .4 && (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())))) this.next(); return; }
    this.talk.update(dt);
  },
  draw(r) {
    const gid = this.d.ground || 'green';
    drawBackdrop(r, 1 / 60, { gid, time: gid === 'dome' ? 'night' : 'day' });
    // the speakers stand together near the pavilion
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .25, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      if (this.d.title) bigTitle(g, this.d.title, W / 2, 14, { scale: 2 });
      if (this.caption) { panel(g, 20, H / 2 - 24, W - 40, 40, { rule: '#c8c0e0' }); E.font.wrap(this.caption, W - 60).slice(0, 3).forEach((l, k) => E.font.text(g, l, W / 2, H / 2 - 16 + k * 10, '#f4f0e0', { align: 'center', shadow: '#000' })); }
      if (this.hold > 0) { const a = Math.round(this.hold * 16); E.font.text(g, 'SKIPPING', W - 50, 12, '#ffd23a'); px.rect(g, W - 50, 22, a * 2, 2, '#ffd23a'); }
      prompts(g, game.input, [['confirm', 'Next (hold: skip)']], W - 6, 30, { align: 'right', color: '#c8c0e0' });
    });
    this.talk.draw(r);
  }
};
// ---------------------------------------------------------------- results: banner, player of the match, the report
SC.results = {
  enter(d) {
    this.m = d.m; this.d = d; this.t = 0; music(null);
    const m = this.m, story = m.cfg.mode === 'story';
    this.report = matchReport(m);
    this.pom = playerOfMatch(m);
    if (story) this.stars = storyStars(m);
    if (m.won && m.cfg.mode === 'quick') { const opp = m.cfg.teams[1]; if (!profile.unlocked.includes(opp)) profile.unlocked.push(opp); }
    profile.stats.matches++; saveProfile();
    const items = [];
    if (m.highlights && m.highlights.length) items.push({ label: '▸ Highlights', act: () => { this.hl = { k: 0, t: 0 }; } });
    if (story) {
      if (m.won) items.push({ label: 'Continue', act: () => storyWin(m.cfg.chapter) });
      else items.push({ label: 'Retry', act: () => startChapter(m.cfg.chapter) }, { label: 'Retry on Village difficulty', act: () => startChapter(m.cfg.chapter, { difficulty: 'village' }) }, { label: 'Map', act: () => game.go('storymap') });
    } else if (m.cfg.mode === 'showdown') items.push({ label: 'Enter your initials', act: () => game.go('table', { mode: m.cfg.showdown, score: showdownScore(m) }) });
    else items.push({ label: 'Rematch', act: () => { const c = Object.assign({}, m.cfg, { seed: (Math.random() * 1e9) >>> 0, humans: m.humans }); startMatch(c); } }, { label: 'Main Menu', act: () => game.go('title', { menu: true }) });
    this.menu = new BigMenu(items, {});
    if (m.won) sting('win'); else if (m.result && m.result.winner !== null) sting('lose');
  },
  update(dt) {
    this.t += dt; hudStep(dt);
    if (this.hl) { this.hl.t += dt; const H_ = this.m.highlights[this.hl.k]; if (!H_ || game.input.pressed('confirm') || game.input.pressed('cancel')) { this.hl = null; game.input.consumeAll(); } else if (this.hl.t > H_.frames.length / 60 / .6) { this.hl.k++; this.hl.t = 0; if (this.hl.k >= this.m.highlights.length) this.hl = null; } return; }
    if (this.t > .6) this.menu.update(dt);
  },
  draw(r) {
    const m = this.m;
    if (this.hl) { const H_ = m.highlights[this.hl.k]; m.replay = { on: true, from: 0, to: H_.frames.length - 1, t: this.hl.t * 1.2, dur: 99, shot: 'wide' }; const save = m.rec; m.rec = H_.frames; director(m, 1 / 60); drawWorld(r, m, 1 / 60); m.rec = save; m.replay = null; r.overlay(g => { px.rect(g, 6, 8, 64, 11, '#c82a32'); E.font.text(g, 'HIGHLIGHTS', 38, 10, '#ffffff', { align: 'center' }); E.font.text(g, H_.label, r.W / 2, r.H - 20, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); }); return; }
    drawBackdrop(r, 1 / 60, { gid: m.g.id, time: m.time === 'night' ? 'night' : 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      const res = m.result || { text: 'Match abandoned' }, win = res.winner !== null && res.winner !== undefined ? m.teams[res.winner] : null;
      bigTitle(g, win ? (m.isHumanSideIdx() < 0 || m.won || m.cfg.mode === 'versus' ? upper(win.code) + ' WIN!' : 'DEFEAT') : 'TIED!', W / 2, 8, { scale: 3, colors: m.won || !m.humans[0].length ? ['#ffffff', '#ffd23a', '#e8803a'] : ['#ffffff', '#c8c8d0', '#6a6a7a'] });
      E.font.text(g, upper(res.text), W / 2, 36, '#f4f0e0', { align: 'center', shadow: '#000' });
      // the three numbers
      m.inn.filter(I => !I.so).forEach((I, k) => E.font.text(g, m.teams[I.bat].code + ' ' + I.runs + '/' + I.wkts + ' (' + m.overStr(I) + ')', W / 2 + (k ? 60 : -60), 48, '#c8c0e0', { align: 'center', shadow: '#000' }));
      if (this.pom) { panel(g, 10, 60, 120, 52, { rule: '#ffd23a' }); rigFor(this.pom.p, 'bat').drawPortrait(g, 14, 64, 30, { zoom: 3, turn: .4, bg: '#1a1430' }); E.font.text(g, 'PLAYER OF', 48, 64, '#ffd23a'); E.font.text(g, 'THE MATCH', 48, 73, '#ffd23a'); E.font.text(g, this.pom.p.short.slice(0, 12), 48, 84, '#f4f0e0'); E.font.text(g, this.pom.line, 14, 100, '#c8c0e0'); }
      const lines = E.font.wrap(this.report, Math.min(260, W - 160)).slice(0, 5);
      panel(g, 140, 60, Math.min(270, W - 150), 14 + lines.length * 9, { rule: '#c8c0e0' });
      E.font.text(g, 'THE KERFUFFLE ALMANACK REPORTS', 146, 63, '#c8c0e0');
      lines.forEach((l, k) => E.font.text(g, l, 146, 73 + k * 9, '#f4f0e0'));
      if (this.stars) { this.stars.goals.forEach(([n, got], k) => E.font.text(g, (got ? '★ ' : '- ') + upper(n), 146, 124 + k * 10, got ? '#ffd23a' : '#8a84a8', { shadow: '#000' })); }
      this.menu.draw(g, W / 2, H - 70, 220, { lh: 16, scale: 1 });
      footer(g, r, [['confirm', 'Select']]);
    });
  }
};
function playerOfMatch(m) {
  let best = null, bs = -1;
  for (const I of m.inn) { for (const c of I.cards) { const s = c.runs + c.sixes * 2; if (s > bs) { bs = s; best = { p: c.p, line: c.runs + (c.out ? '' : '*') + ' (' + c.balls + ')' }; } } for (const id in I.bowl) { const b = I.bowl[id], s = b.wkts * 12 - b.runs * .3; if (s > bs) { bs = s; best = { p: m.squads[1 - I.bat].find(p => p.id === id), line: b.wkts + ' for ' + b.runs }; } } }
  return best && best.p ? best : null;
}
function matchReport(m) {
  const res = m.result; if (!res) return 'Play was abandoned, and the tea was drunk regardless.';
  const w = res.winner, I0 = m.inn[0], I1 = m.inn[1] || I0;
  const winI = w === null ? I1 : m.inn.find(I => I.bat === w) || I0, loseI = w === null ? I0 : m.inn.find(I => I.bat !== w) || I1;
  const top = winI.cards.slice().sort((a, b) => b.runs - a.runs)[0];
  let tb = null; for (const id in loseI.bowl) { const b = loseI.bowl[id]; if (!tb || b.wkts > tb.wkts) tb = Object.assign({ id }, b); }
  const tbP = tb ? m.squads[1 - loseI.bat].find(p => p.id === tb.id) : null;
  const tgt = m.targetsHit.length ? m.g.targets.find(t => t.id === m.targetsHit[0]).name : 'the scorer\'s flask';
  const chaos = m.chaosLog.length ? CHAOS[m.chaosLog[0]].name.toLowerCase() : 'a pigeon';
  const v = { winner: w === null ? '' : m.teams[w].name, loser: w === null ? '' : m.teams[1 - w].name, topBat: top ? top.p.name : 'the tail', topRuns: top ? top.runs : 0, notOut: top && !top.out ? ' not out' : '', sixes: top ? top.sixes : 0, sixPl: top && top.sixes === 1 ? '' : 'es',
    collapse: loseI.wkts >= 3 ? 'a collapse of ' + loseI.wkts + ' wickets' : 'a sluggish start', topBowl: tbP ? tbP.name : 'the bowling', wkts: tb ? tb.wkts : 0, bowlRuns: tb ? tb.runs : 0, target: I1.target || I0.runs + 1, spare: (I1.overs * 6 - I1.legal) + ((I1.overs * 6 - I1.legal) === 1 ? ' ball' : ' balls'), chaosThing: chaos, margin: res.short.replace('won by ', ''), targetHit: tgt };
  let tpl = w === null ? REPORTS.tie : (m.inn.find(I => I.so) ? REPORTS.tie : (w === I1.bat && I1.target ? REPORTS.chase : (tb && tb.wkts >= 2 ? REPORTS.bowlWin : (Math.abs(I0.runs - I1.runs) <= 3 ? REPORTS.close : REPORTS.bigWin))));
  let s = fmt(tpl, v);
  if (m.targetsHit.length) s += ' One blow went through ' + tgt + '.';
  return s;
}
on('chaos', d => { if (COMM.m && d.id) COMM.m.chaosLog.push(d.id); });
// ---------------------------------------------------------------- About / Credits (paged)
SC.about = {
  enter(d) { this.p = d && d.page || 0; this.t = 0; this.fromEnding = d && d.ending; music('tea'); },
  update(dt) {
    this.t += dt; const I = game.input, n = ABOUT_PAGES.length;
    if (I.repeat('right', .3, .15) || I.pressed('run')) { this.p = (this.p + 1) % n; sfx('select'); }
    if (I.repeat('left', .3, .15) || I.pressed('back')) { this.p = (this.p - 1 + n) % n; sfx('select'); }
    const c = I.clicked && I.clicked(); if (c) { if (c[0] > game.W * .66) { this.p = (this.p + 1) % n; sfx('select'); } else if (c[0] < game.W * .33) { this.p = (this.p - 1 + n) % n; sfx('select'); } }
    if (I.pressed('cancel') || I.pressed('confirm')) game.go(this.fromEnding ? 'title' : 'extras', { menu: true });
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { time: 'dusk' });
    r.overlay(g => {
      const W = r.W, H = r.H, P = ABOUT_PAGES[this.p]; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
      bigTitle(g, P[0], W / 2, 8, { scale: 2 });
      let y = 30; const cw = Math.min(W - 24, 400);
      for (const line of P[1]) { const wr = E.font.wrap(line, cw); for (const l of wr) { if (y > H - 30) break; E.font.text(g, l, W / 2 - cw / 2, y, line.startsWith('•') ? '#c8c0e0' : '#f4f0e0', { shadow: '#000' }); y += 9; } y += 2; }
      E.font.text(g, (this.p + 1) + ' / ' + ABOUT_PAGES.length, W / 2, H - 28, '#8a84a8', { align: 'center' });
      footer(g, r, [['left', 'Page'], ['cancel', 'Back']]);
    });
  }
};

// ---- 51-match-scene.js ----
// ---- the match scene (pausable): it runs a Match, the camera director, the HUD, the pickers (bowler, tea treat), the
// story's beats and tips, the Nets' lessons, and keeps the highlights. Quick Match, Versus, Story, Nets, Showdown and
// the AI Hub round all play here.
let MATCH = null;
function startMatch(cfg, extra = {}) { game.go('match', Object.assign({ cfg }, extra)); }
SC.match = {
  pausable: true, camera: { zoom: false },
  enter(d) {
    const m = this.m = new Match(d.cfg); MATCH = m; this.d = d;
    commReset(m); useGround(m.cfg.ground, m); WORLD.shot = null; WORLD.forceShot = null; WORLD.focusOverride = null;
    m.highlights = []; this.prevState = null; this.tipsSeen = {}; this.tip = null; this.lesson = d.lesson !== undefined ? LESSONS[d.lesson] : null; this.lessonN = 0; this.lessonDone = false;
    CROWD.size = m.g.crowd; CROWD.rain = m.weather === 'rain'; PICK.i = 0; PICK.tea = 0;
    if (!m.cfg.noMusic) music(m.cfg.mode === 'showdown' || m.cfg.mode === 'hub' ? 'showdown' : m.g.song);
    this.talk = new E.Dialog(game, { lines: 3, place: 'top', voice: null, border: '#ffd23a', bg: ['#1a1430', '#0e0c1c'] });
    this.midDone = false; this.endT = 0; this.finished = false;
    if (this.lesson) { this.lessonEvents = []; this.offLesson = []; const L = this.lesson; this.offLesson.push(...L.on.map(ev => { const fn = data => { if (MATCH === m && !this.lessonDone && L.check(ev, data, m)) { this.lessonN++; sfx('coin'); if (this.lessonN >= L.goal) { this.lessonDone = true; sting('win'); if (!profile.lessons.includes(L.id)) { profile.lessons.push(L.id); saveProfile(); } cover('lesson:' + L.id); } } }; on(ev, fn); return [ev, fn]; })); if (L.setup) L.setup(m); }
    game.input.consumeAll();
    emit('match:start', { mode: m.cfg.mode });
  },
  exit() { if (this.offLesson) for (const [ev, fn] of this.offLesson) { const a = BUS.subs[ev]; if (a) a.splice(a.indexOf(fn), 1); } this.offLesson = null; game.timeScale = 1; game.weather = null; },
  update(dt) {
    const m = this.m, I = game.input;
    if (DEV.open) { devUpdate(dt); return; }
    if (this.talk.open) { this.talk.update(dt); return; }
    // the speed of the game: the dev slider, dev slow motion, a moment's slow motion for big moments
    if (WORLD.slowT > 0) WORLD.slowT -= 1 / 120;
    game.timeScale = T('timeScale') * (DEV.toggles.slowmo ? .25 : 1) * (WORLD.slowT > 0 ? WORLD.slowK : 1);
    // pickers and skips
    if (m.needBowler && m.state === 'between') this.pickBowler(m);
    if (m.state === 'break') {
      if (m.cfg.mode === 'story' && !this.midDone && m.i >= 1) { this.midDone = true; const C = CHAPTERS[m.cfg.chapter - 1]; if (C.mid && C.mid.length) this.storyTalk(C.mid); if (m.i === 1 && !m.I.so && !m.teaChosen) { m.needTea = true; } return; }
      if (m.needTea) this.pickTea(m);
      else if (I.pressed('confirm') || I.pressed('shot') || (I.clicked && I.clicked())) m.breakGo = true;
    }
    if (m.state === 'dead' && (I.pressed('confirm') || (I.clicked && I.clicked())) && m.st > .5) m.skipDead();
    if (m.cfg.mode === 'story' && m.cfg.chapter <= 2) this.tips(m);
    // the dev toggles that act on the match
    m.dev.infiniteHype = DEV.toggles.infHype; m.dev.alwaysFire = DEV.toggles.alwaysFire; m.dev.invincible = DEV.toggles.invincible; m.dev.autoBat = DEV.toggles.autoBat; m.dev.autoBowl = DEV.toggles.autoBowl; m.dev.noChaos = DEV.toggles.noChaos;
    if (DEV.toggles.alwaysFire) { m.fire.batOn = true; }
    if (DEV.toggles.infHype) m.hype[0] = m.hype[1] = 100;
    const before = m.state;
    m.update(dt);
    if (before === 'dead' && m.state !== 'dead') this.keepHighlight(m);
    director(m, dt); hudStep(dt); musicLayers(m);
    if (this.lesson && this.lessonDone) { this.endT += dt; if (this.endT > 2.5 || (this.endT > .8 && I.pressed('confirm'))) { const nx = this.d.after; if (nx) nx(); else game.go('lessons'); } }
    if (m.cfg.mode === 'nets' && m.cfg.nets === 'six' && m.I.legal >= 12 && m.state === 'between') { m.result = { winner: 0, text: 'The Six Machine: ' + (m.I.runs) + ' points' }; m._go('over'); }
    if (m.state === 'over') { this.endT += dt; if (this.endT > 3 || (this.endT > 1 && I.pressed('confirm'))) this.finish(m); }
  },
  finish(m) {
    if (this.finished) return; this.finished = true;
    const mode = m.cfg.mode;
    if (mode === 'nets' && m.cfg.nets === 'six') { game.go('table', { mode: 'six', score: m.I.runs }); return; }
    if (mode === 'nets') { game.go('netsmenu'); return; }
    game.go('results', { m });
  },
  storyTalk(lines, then) {
    const q = lines.slice(), next = () => { if (!q.length) { if (then) then(); return; } const [who, text] = q.shift(); if (who === '*') { this.talk.say(text, { name: 'THE ALMANACK', onDone: next }); return; } const V_ = VOICES[who] || VOICES.aubrey; this.talk.say(text, { name: V_.name, portrait: portraitRig(who), onDone: next }); say(text, who); };
    next();
  },
  pickBowler(m) {
    const pad = m.pad('bowl'), I = pad.I || game.input, n = m.needBowler.length;
    if (I.repeat('left', .3, .15) || I.repeat('up', .3, .15)) { PICK.i = (PICK.i - 1 + n) % n; sfx('select'); }
    if (I.repeat('right', .3, .15) || I.repeat('down', .3, .15)) { PICK.i = (PICK.i + 1) % n; sfx('select'); }
    const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked(), R = HUD.pick || [];
    const hit = q => R.findIndex(rc => q[0] >= rc[0] && q[0] < rc[0] + rc[2] && q[1] >= rc[1] && q[1] < rc[1] + rc[3]);
    if (p) { const k = hit(p); if (k >= 0 && k !== PICK.i) PICK.i = k; }
    if (c && hit(c) >= 0) { PICK.i = hit(c); m.pickBowler(m.needBowler[PICK.i].id); sfx('confirm'); I.consumeAll(); return; }
    if (I.pressed('confirm') || I.pressed('shot')) { PICK.i = Math.min(PICK.i, n - 1); m.pickBowler(m.needBowler[PICK.i].id); sfx('confirm'); I.consumeAll(); }
  },
  pickTea(m) {
    const I = game.input;
    if (I.repeat('left', .3, .15)) { PICK.tea = (PICK.tea + 2) % 3; sfx('select'); }
    if (I.repeat('right', .3, .15)) { PICK.tea = (PICK.tea + 1) % 3; sfx('select'); }
    const c = I.clicked && I.clicked(), R = HUD.tea || []; let k = -1; if (c) k = R.findIndex(rc => c[0] >= rc[0] && c[0] < rc[0] + rc[2] && c[1] >= rc[1] && c[1] < rc[1] + rc[3]);
    if (k >= 0) PICK.tea = k;
    if (I.pressed('confirm') || I.pressed('shot') || k >= 0) { const t = TEA_TREATS[PICK.tea]; m.teaTreat = t.id; m.teaChosen = true; m.needTea = false; if (t.id === 'sponge') m.hypeAdd(m.cfg.teams.indexOf('ker'), 40); sfx('confirm'); cover('tea:' + t.id); emit('tea', { id: t.id }); I.consumeAll(); m.breakGo = true; }
    if (m.st > 20) { m.needTea = false; m.breakGo = true; }
  },
  // tips for the first chapters (5.16.1): the first time each moment comes up
  tips(m) {
    const show = (k, text) => { if (this.tipsSeen[k]) return; this.tipsSeen[k] = true; this.tip = { text, t: 0 }; };
    if (m.state === 'flight' && m.isHuman('bat')) show('bat', 'BATTING: AIM WITH THE STICK, THEN TIME THE SHOT AS THE BALL ARRIVES');
    if (m.state === 'inPlay' && m.isHuman('run')) show('run', 'RUNNING: CALL A RUN, PRESS AGAIN TO TURN FOR TWO, OR SEND THEM BACK');
    if (m.state === 'setup' && m.isHuman('bowl')) show('bowl', 'BOWLING: PLACE THE MARKER, PICK A DELIVERY, RELEASE IN THE GREEN');
    if (m.state === 'flight' && m.isHuman('bowl') && m.atouch > 0) show('after', 'AFTERTOUCH: PUSH LEFT OR RIGHT JUST AFTER RELEASE TO SWING IT');
    if (m.catchQTE && m.isHuman('field')) show('catch', 'A CATCH! PRESS AS THE GOLD RING CLOSES ON THE WHITE ONE');
    if (m.canReview() && m.sideHumans(m.reviewSide()).length) show('review', 'THINK THE UMPIRE GOT IT WRONG? REVIEW IT: ONE PER INNINGS');
    if (m.specialReady(m.isHumanSideIdx())) show('special', 'THE KERFUFFLE METER IS FULL: YOUR SPECIAL IS READY');
    if (this.tip) { this.tip.t += 1 / 120; if (this.tip.t > 5) this.tip = null; }
  },
  keepHighlight(m) {
    const r = m.lastRec; if (!r || !m.rec) return;
    const w = (r.wicket ? 6 : 0) + (r.boundary === 6 ? 5 : r.boundary === 4 ? 2 : 0) + (r.bonus ? 4 : 0) + (r.special ? 3 : 0);
    if (w < 2) return;
    const from = Math.max(0, m.rec.findIndex(f => f.t >= (m.releaseT || 0) - .4)), frames = m.rec.slice(from);
    if (frames.length < 30) return;
    const label = r.wicket ? 'WICKET: ' + upper(r.wicket.how) : r.boundary === 6 ? 'SIX!' : r.bonus ? 'KERFUFFLE BONUS' : 'FOUR!';
    m.highlights.push({ frames, w, label }); m.highlights.sort((a, b) => b.w - a.w); if (m.highlights.length > 3) m.highlights.length = 3;
  },
  draw(r) {
    const m = this.m;
    drawWorld(r, m, 1 / 60);
    drawHud(r, m);
    r.overlay(g => {
      const W = r.W;
      if (this.tip) { panel(g, W / 2 - 160, 44, 320, 16, { rule: '#5fd38a' }); E.font.text(g, this.tip.text, W / 2, 48, '#f4f0e0', { align: 'center', shadow: '#000' }); }
      if (this.lesson) {
        const L = this.lesson; panel(g, W / 2 - 160, 40, 320, 32, { rule: '#ff8ad8' });
        E.font.text(g, 'MRS CRUMB: ' + upper(L.title) + '  ' + Math.min(this.lessonN, L.goal) + ' / ' + L.goal, W / 2, 44, '#ff8ad8', { align: 'center', shadow: '#000' });
        E.font.text(g, L.text[Math.min(L.text.length - 1, Math.floor(m.t / 6) % L.text.length)], W / 2, 56, '#f4f0e0', { align: 'center', shadow: '#000' });
        if (this.lessonDone) bigTitle(g, 'LESSON COMPLETE', W / 2, r.H / 2 - 20, { scale: 2 });
      }
      if (m.cfg.mode === 'nets' && m.cfg.nets === 'bat') prompts(g, game.input, [['back', ''], ['run', 'Machine: ' + DELIVERIES[NETS_DELS[NETS.k]].name]], W / 2, 70, { align: 'center' });
      if (m.cfg.mode === 'nets' && m.cfg.nets === 'six') E.font.text(g, 'THE SIX MACHINE  BALL ' + Math.min(12, m.I.legal + 1) + ' / 12', W / 2, 44, '#ffd23a', { align: 'center', shadow: '#000' });
      if (m.cfg.mode === 'hub') drawHubHud(g, r, m);
    });
    this.talk.draw(r);
    if (DEV.open) devDraw(r);
  }
};
// ---------------------------------------------------------------- story chapters
function startChapter(n, o = {}) {
  const C = CHAPTERS[n - 1];
  const cfg = { mode: 'story', chapter: n, teams: ['ker', C.opp], ground: C.ground, overs: C.overs, wickets: C.wickets, difficulty: o.difficulty || { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[game.settings.difficulty] || 'county',
    kerfuffle: C.kerfuffle, humans: [[game.input], []], batFirst: C.batFirst || null, scenario: C.scenario || null, rain: !!C.rain, boss: !!C.boss, superOver: true };
  const play = () => startMatch(cfg);
  const pre = () => game.go('cutscene', { lines: C.pre, ground: C.ground, title: 'CHAPTER ' + n + ': ' + upper(C.title), next: n === 1 && !profile.lessons.includes('aim') ? () => lessonChain(['aim', 'loft', 'defend', 'run', 'bowl'], play) : play });
  pre();
}
function lessonChain(ids, then) {
  const k = LESSONS.findIndex(L => L.id === ids[0]);
  if (k < 0 || !ids.length) { then(); return; }
  startNets({ kind: 'lesson', lesson: k, after: () => lessonChain(ids.slice(1), then) });
}
function storyStars(m) {
  const C = CHAPTERS[m.cfg.chapter - 1], goals = C.goals.map(([n, f]) => [n, !!f(m)]);
  const got = goals.map((g, k) => g[1] ? k : -1).filter(k => k >= 0);
  const best = new Set([...(profile.story.best[C.n] || []), ...got]);
  profile.story.best[C.n] = [...best]; profile.story.stars[C.n] = Math.max(profile.story.stars[C.n] || 0, best.size);
  if (m.won) profile.story.chapter = Math.max(profile.story.chapter, Math.min(5, C.n + 1));
  if (m.won && C.n === 5) profile.story.done = true;
  if (m.won && !profile.unlocked.includes(C.opp)) profile.unlocked.push(C.opp);
  saveProfile(); if (!HUB) try { game.saves.autosave(); } catch (e) { /* storage blocked */ }
  cover('storyChapter' + C.n);
  return { goals };
}
function storyWin(n) {
  const C = CHAPTERS[n - 1];
  game.go('cutscene', { lines: C.win, ground: C.ground, title: n === 5 ? 'THE END' : 'VICTORY', next: n === 5 ? () => { cover('ending'); game.go('about', { page: ABOUT_PAGES.length - 1, ending: true }); } : () => game.go('storymap') });
}
// ---------------------------------------------------------------- the Nets: lessons, free practice, the Six Machine
const NETS_DELS = ['express', 'outswing', 'inswing', 'bouncer', 'yorker', 'slower', 'dobber', 'legbreak', 'googly', 'offbreak'];
const NETS = { k: 0 };
const LESSONS = [
  { id: 'aim', title: 'Aim and the ground shot', role: 'bat', goal: 3, on: ['bat:contact'], check: (e, d) => d.kind === 'clean' && SHOT[d.shot].b === 'shot', text: ['Push the stick, or point the mouse, where the ball should go.', 'Press the ground shot as the ball reaches you. Three clean hits, dear.'] },
  { id: 'loft', title: 'The lofted shot', role: 'bat', goal: 2, on: ['bat:contact'], check: (e, d) => d.kind === 'clean' && SHOT[d.shot].b === 'loft', text: ['The lofted shot goes in the air. Over the fielders, ideally.', 'Two clean lofted hits. Mind the greenhouse.'] },
  { id: 'defend', title: 'Defend and leave', role: 'bat', goal: 3, on: ['ball:done'], check: (e, d) => !d.rec.wicket && (!d.rec.shot || SHOT[d.rec.shot].b === 'block'), text: ['Defend a straight one, or press nothing to leave a wide one.', 'Survive three balls without attacking them. Patience, dear.'] },
  { id: 'run', title: 'Running between the wickets', role: 'bat', goal: 3, on: ['run'], check: () => true, text: ['After you hit it, call the run. Press again at the crease for two.', 'Send them back if it looks tight. Complete three runs.'], setup: m => { m.cfg.lessonRun = true; } },
  { id: 'charge', title: 'Charging the spinner', role: 'bat', goal: 2, on: ['bat:contact'], check: (e, d, m) => m.batters[0].charged > 0 && d.kind === 'clean', text: ['Against spin, charge down the pitch before it lands.', 'It turns a good length into a half-volley. Miss, and you are stumped.'], del: ['legbreak', 'offbreak', 'googly'] },
  { id: 'bowl', title: 'Bowling: the marker and the meter', role: 'bowl', goal: 3, on: ['ball:released'], check: (e, d) => d.grade === 'green', text: ['Move the marker where the ball should land, then pick a delivery.', 'Press again with the needle in the green. Three green deliveries.'] },
  { id: 'aftertouch', title: 'Aftertouch', role: 'bowl', goal: 2, on: ['ball:done'], check: () => (COVER.aftertouch || 0) > (LESSONS[6]._a || 0) && (LESSONS[6]._a = COVER.aftertouch), text: ['Just after the release, push the stick left or right.', 'It adds swing, or drift for a spinner. Bowl two with aftertouch.'] },
  { id: 'special', title: 'Specials and the Kerfuffle meter', role: 'bat', goal: 1, on: ['special'], check: () => true, text: ['Big moments fill the Kerfuffle meter. Full, and your special is ready.', 'It is full now. Press the special button, then watch.'], setup: m => { m.hype[0] = 100; } },
  { id: 'catch', title: 'The catch ring', role: 'field', goal: 2, on: ['catch'], check: () => true, text: ['When the ball goes up, a gold ring closes on a white one.', 'Press as they meet. Two catches. Hands like a teapot, not a colander.'] },
  { id: 'throw', title: 'Throws and run-outs', role: 'field', goal: 2, on: ['throw'], check: () => true, text: ['When you field it, throw to the keeper or the bowler.', 'The end the batter is running to is the one to aim at. Two throws.'] },
  { id: 'review', title: 'Reviews', role: 'bowl', goal: 1, on: ['review:start'], check: (e, d) => d.kind === 'krs', text: ['If the umpire gets an LBW wrong, review it: one per innings.', 'Owl-Eye will show where it pitched, hit and was going.'] }
];
function startNets(o) {
  const kind = o.kind, L = kind === 'lesson' ? LESSONS[o.lesson] : null, role = L ? L.role : kind === 'bowl' ? 'bowl' : 'bat';
  const bowlHuman = role === 'bowl' || role === 'field';
  const script = { k: 0, next(what, m) {
    if (what !== 'bowl') { if (L && L.id === 'catch') return { btn: 'loft', th: pick([-60, 0, 60, -100, 100]), grade: 'PERFECT' }; if (L && L.id === 'throw') return { btn: 'shot', th: pick([-40, 40, 70, -70]), grade: 'GOOD' }; if (L && L.id === 'review') return { btn: null }; if (kind === 'bowl' || (L && L.role === 'bowl')) return null; return null; }
    if (L && L.del) return { del: L.del[this.k++ % L.del.length], grade: 'green' };
    if (kind === 'six') return { del: ['express', 'slower', 'outswing', 'legbreak', 'yorker', 'bouncer'][this.k++ % 6], grade: 'green' };
    return { del: NETS_DELS[NETS.k], grade: 'green' };
  } };
  const teams = bowlHuman ? ['mud', 'ker'] : ['ker', 'thr'];
  const cfg = { mode: 'nets', nets: kind === 'lesson' ? 'lesson' : kind, teams, ground: 'green', overs: 99, wickets: 99, kerfuffle: kind !== 'lesson' || L.id === 'special' || L.id === 'review', humans: bowlHuman ? [[], [game.input]] : [[game.input], []], single: true, superOver: false, script: bowlHuman ? (L && (L.id === 'catch' || L.id === 'throw' || L.id === 'review') ? script : null) : script, netsMachine: !bowlHuman, difficulty: 'village', noReplays: true };
  if (L && L.id === 'review') cfg.umpWrong = true;
  if (L && (L.id === 'catch' || L.id === 'throw')) cfg.assist = 'Manual';
  startMatch(cfg, { lesson: L ? o.lesson : undefined, after: o.after });
}
// the Nets' machine bowls the chosen delivery; L1 / R1 change it in free practice
on('state', d => { const m = MATCH; if (!m || m.cfg.mode !== 'nets' || m.cfg.nets !== 'bat' || d.s !== 'setup') return; });
const _netsSetup = Match.prototype._setup;
Match.prototype._setup = function (dt) {
  if (this.cfg.mode === 'nets' && this.cfg.nets === 'bat' && this.isHuman('bat')) { const I = game.input, was = NETS.k; if (I.pressed('run')) { NETS.k = (NETS.k + 1) % NETS_DELS.length; sfx('select'); } if (I.pressed('back')) { NETS.k = (NETS.k - 1 + NETS_DELS.length) % NETS_DELS.length; sfx('select'); } if (was !== NETS.k) { this.bowlPlan = null; this.dev.forceDelivery = null; this.st = 0; } }
  return _netsSetup.call(this, dt);
};
// ---------------------------------------------------------------- the Super Over Showdown
function startShowdown(kind, o = {}) {
  const R = E.rng(o.seed || ((Math.random() * 1e9) >>> 0));
  const balls = ['piston', 'steamBouncer', 'piston', 'spinCycle', 'steamBouncer', 'piston'].map((d, k) => ({ del: d, target: [-(2 + R() * 6), d === 'steamBouncer' ? 170 : d === 'spinCycle' ? 70 + R() * 30 : 60 + R() * 60], grade: 'green', special: k === 5 }));
  if (kind === 'bat') {
    const script = { k: 0, next(what) { if (what !== 'bowl') return null; return balls[Math.min(5, this.k++)]; } };
    startMatch({ mode: 'showdown', showdown: 'bat', teams: ['ker', 'thr'], ground: 'dome', timeOfDay: 'night', weather: 'clear', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], batFirst: 'ker', single: true, superOver: false, script, difficulty: 'county' });
  } else {
    startMatch({ mode: 'showdown', showdown: 'bowl', teams: ['ker', 'lar'], ground: 'bay', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], scenario: { innings: 2, target: 15, battingFirst: 'ker', firstRuns: 14 }, single: true, superOver: false, order: { lar: ['kev', 'shazza', 'wal'] }, difficulty: 'county' });
  }
}
function showdownScore(m) { const I = m.I; if (m.cfg.showdown === 'bat') return I.runs; return Math.max(0, (14 - I.runs) * 10 + I.wkts * 25); }
let ARCADE = null;
function arcade() { if (!ARCADE) ARCADE = new E.Arcade(game, { id: 'kerfuffle', lives: 1, hud: false, colors: ['#c8c0e0', '#ffd23a', '#ffffff'] }); return ARCADE; }
SC.table = {
  enter(d) { this.d = d; this.t = 0; this.entering = false; const A = arcade(); music('showdown');
    if (d.score !== undefined && A.qualifies(d.score, d.mode)) { this.entering = true; A.enter(d.score, d.mode, () => { this.entering = false; }); }
    this.modes = d.modes || [d.mode]; this.k = 0; IDLE.t = 0; },
  update(dt) { this.t += dt; const A = arcade(); A.update(dt); if (this.entering) return; idleStep(dt, 'table'); const I = game.input;
    if (this.modes.length > 1 && (I.pressed('left') || I.pressed('right'))) { this.k = (this.k + 1) % this.modes.length; sfx('select'); }
    if (this.t > .8 && (I.pressed('confirm') || I.pressed('cancel'))) game.go(this.d.mode === 'six' ? 'netsmenu' : 'showmenu'); },
  draw(r) { drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' }); const A = arcade(), md = this.modes[this.k];
    r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818')));
    if (!this.entering) A.drawTable(r, md, 34, md === 'bat' ? 'SHOWDOWN: BAT' : md === 'bowl' ? 'SHOWDOWN: BOWL' : 'THE SIX MACHINE');
    A.draw(r);
    r.overlay(g => { if (this.d.score !== undefined) E.font.text(g, 'YOUR SCORE: ' + this.d.score, r.W / 2, 16, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); if (!this.entering) footer(g, r, this.modes.length > 1 ? [['left', 'Table'], ['confirm', 'Back']] : [['confirm', 'Back']]); }); }
};

// ---- 52-attract.js ----
// ---- the attract mode (5.18): after 10 s without input on the title or a menu, a looping showreel of real play on the
// real machinery, both sides CPU and cheating freely (forced outcomes, guaranteed catches, never out). Ten segments,
// about 25 s each, then the high scores. Any input goes back to the title.
const SEGMENTS = [
  { name: 'THE VILLAGE GREEN', ground: 'green', teams: ['ker', 'mud'], chaos: 'cow', token: 'teapot', balls: [{ force: 'four', th: 55, token: true }, { force: 'six', th: -30 }, { force: 'one' }] },
  { name: 'THE LEANING WICKET', ground: 'green', time: 'dusk', teams: ['ker', 'mud'], balls: [{ force: 'six', target: 'pub', bat: 'kettle' }, { force: 'four', th: 80 }] },
  { name: 'A HUGE APPEAL', ground: 'green', teams: ['mud', 'ker'], bowler: 'basil', balls: [{ force: 'lbwReview', del: 'legbreak' }, { force: 'bowled', del: 'googly' }] },
  { name: 'THRUMPTON HALL', ground: 'hall', weather: 'overcast', teams: ['ker', 'gen'], bowler: 'peregrine', balls: [{ force: 'edge', del: 'outswing' }, { force: 'caught', del: 'inswing' }] },
  { name: 'SUNBURNT BAY', ground: 'bay', teams: ['ker', 'lar'], bowler: 'shazza', chaos: 'tide', balls: [{ force: 'dot', del: 'bouncer', leave: true }, { force: 'six', del: 'bouncer', target: 'shark' }, { force: 'four' }] },
  { name: 'YES! NO! SORRY!', ground: 'bay', teams: ['lar', 'ker'], balls: [{ force: 'one' }, { force: 'runout' }] },
  { name: 'DUSTBOWL DOWNS', ground: 'downs', teams: ['ker', 'mag'], bowler: 'spinaldo', second: true, chaos: 'rain', balls: [{ force: 'stumped', del: 'legbreak', special: true }, { force: 'four' }] },
  { name: 'ON FIRE', ground: 'green', time: 'dusk', teams: ['ker', 'mud'], balls: [{ force: 'four', th: 60 }, { force: 'four', th: -60 }, { force: 'four', th: 10 }, { force: 'six', target: 'weathervane', bat: 'kettle' }] },
  { name: 'THE MIDNIGHT FINAL', ground: 'dome', time: 'night', weather: 'fog', teams: ['ker', 'thr'], bowler: 'machine', chaos: 'ghosts', balls: [{ force: 'four', special: true }, { force: 'six', target: 'jumbotron' }], endCard: true },
  { name: 'HIGH SCORES', table: true }
];
SC.attract = {
  enter(d) {
    this.seg = d && d.seg !== undefined ? d.seg : (SC.attract.lastSeg + 1 || 0) % SEGMENTS.length; SC.attract.lastSeg = this.seg; this.from = d && d.from || (this.from || 'title');
    this.t = 0; this.k = 0; this.card = 0; music('attract');
    IDLE.sig = inputSig(); this.grace = d && d.chain ? 0 : .3;
    const S_ = SEGMENTS[this.seg]; this.S = S_; cover('attract:' + this.seg);
    if (S_.table) { this.m = null; return; }
    const cfg = { mode: 'attract', teams: S_.teams, ground: S_.ground, timeOfDay: S_.time || null, weather: S_.weather || null, overs: 2, wickets: 10, kerfuffle: true, humans: [[], []], seed: 100 + this.seg, superOver: false, cheat: { catches: true, noOut: false }, noMusic: true, difficulty: 'county' };
    if (S_.second) cfg.scenario = { innings: 2, target: 40, battingFirst: S_.teams[1], firstRuns: 39 };
    const m = this.m = new Match(cfg); MATCH = m; m.cheatSide = 0; commReset(m); useGround(m.cfg.ground, m); WORLD.shot = null;
    m.highlights = [];
    const self = this;
    if (S_.bowler) { const ob = m.aiPickBowler; m.aiPickBowler = function (list) { const p = this.squads[this.bowlT].find(q => q.id === S_.bowler); return p || ob.call(this, list); }; const oe = m.eligibleBowlers; m.eligibleBowlers = function () { const p = this.squads[this.bowlT].find(q => q.id === S_.bowler); return p ? [p] : oe.call(this); }; }
    m.cfg.script = { next(what, mm) { const B = S_.balls[Math.min(self.k, S_.balls.length - 1)]; if (what === 'bowl') return { del: B.del, grade: 'green', special: !!B.special }; return B.leave ? { btn: 'leave', grade: 'PERFECT' } : null; } };
    // each ball: aim the forcing before the release
    on('state', this._st = st => { if (MATCH !== m || st.s !== 'setup') return; const B = S_.balls[this.k]; if (!B) return;
      let f = B.force; const o = { th: B.th, target: B.target };
      if (f === 'lbwReview') { m.cfg.umpWrong = true; f = 'lbw'; } else m.cfg.umpWrong = false;
      m.forceNext(f, o);
      if (B.bat) { m.hype[m.batT] = 100; m.vpad('bat'); m._batAuto = B.bat; }
      if (B.token) { const h = m.strikerHand(), w = dirOf((B.th || 55) * DEG, h); m.spawnToken(S_.token, [w[0] * 140, w[1] * 140, 6]); }
    });
    on('ball:done', this._bd = () => { if (MATCH === m) this.k++; });
    if (S_.chaos) game.after(1.2, () => { if (MATCH === m) m.triggerChaos(S_.chaos); });
  },
  exit() { const off = (ev, fn) => { const a = BUS.subs[ev]; if (a && fn) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }; off('state', this._st); off('ball:done', this._bd); this._st = this._bd = null; game.weather = null; game.timeScale = 1; },
  update(dt) {
    this.t += dt; this.grace -= dt;
    // any input exits (and is consumed, so it does not also pick a menu item)
    if (this.grace <= 0 && anyInput()) { game.input.consumeAll(); IDLE.t = 0; game.go(this.from === 'attract' ? 'title' : this.from, { menu: this.from === 'title' }); return; }
    if (this.grace > 0) IDLE.sig = inputSig();
    const S_ = this.S, m = this.m;
    if (S_.table) { if (this.t > 8) this.next(); return; }
    // a special the batter arms (Tea-Kettle Slog on a forced six)
    if (m._batAuto && m.state === 'runup' && m.specialReady(m.batT)) { m.vpad('bat').tap('special'); m._batAuto = null; }
    if (WORLD.slowT > 0) WORLD.slowT -= 1 / 120;
    game.timeScale = WORLD.slowT > 0 ? WORLD.slowK : 1;
    m.update(dt); director(m, dt); hudStep(dt);
    if (m.state === 'dead' && m.st > 2.2 && !m.review && !m.reviewWin && !m.third) m.skipDead();
    if (m.state === 'break' && m.st > 1.5) m.breakGo = true;
    if (this.k >= S_.balls.length && m.state === 'between') { if (S_.endCard && !this.card) { this.card = .001; m.time = 'night'; WORLD.cheer = 4; sting('win'); cover('attract:endcard'); } }
    if (this.card) { this.card += dt; m.fireworks = 1; if (this.card > 4) this.next(); }
    else if ((this.k >= S_.balls.length && m.state === 'between') || this.t > 32) this.next();
  },
  next() { game.go('attract', { seg: (this.seg + 1) % SEGMENTS.length, from: this.from, chain: true }, { fade: 'wipe' }); },
  draw(r) {
    const S_ = this.S;
    if (S_.table) { drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' }); const A = arcade(); r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818'))); A.drawTable(r, 'bat', 34, 'HIGH SCORES: SHOWDOWN'); }
    else { drawWorld(r, this.m, 1 / 60); drawHud(r, this.m); }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!S_.table && this.t < 3) { panel(g, 0, 40, W, 22, { rule: '#ffd23a' }); E.font.text(g, S_.name, W / 2, 44, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); }
      if (this.card) { panel(g, W / 2 - 150, H / 2 - 50, 300, 90, { rule: '#ffd23a' }); bigTitle(g, 'KERFUFFLE WIN!', W / 2, H / 2 - 44, { scale: 2 }); E.font.wrap('Kerfuffle CC were indebted to a six onto the jumbotron, which now shows, we are told, a very large crack. Lord Thrumpton was seen laughing.', 280).slice(0, 4).forEach((l, k) => E.font.text(g, l, W / 2, H / 2 - 20 + k * 9, '#f4f0e0', { align: 'center' })); }
      if (Math.floor(game.real * 2) % 2) { E.font.text(g, 'DEMO', W / 2, H - 42, '#ff6b6b', { align: 'center', scale: 2, shadow: '#000' }); }
      const w = measureGlyph(game.input, 'confirm'); E.font.text(g, 'PRESS ANY BUTTON', W / 2 + w / 2 + 2, H - 20, '#ffffff', { align: 'center', shadow: '#000' }); glyph(g, game.input, 'confirm', W / 2 - E.font.width('PRESS ANY BUTTON') / 2 - w, H - 17);
    });
  }
};

// ---- 53-dev.js ----
// ---- dev mode (5.19): reached from the pause menu's Dev Mode (or the ` key), a full-screen 10-foot panel over the
// paused match. Tabs TUNING (live sliders, each against its default, Reset all first), TOGGLES, JUMP and INFO.
// L1 / R1 (or Tab, or a click) change tabs; up and down (or hover) pick a row; left and right adjust (held: faster;
// the mouse drags a knob); confirm toggles or acts; special resets the row; cancel closes.
const DEV = { open: false, tab: 0, i: 0, scroll: 0, toggles: { slowmo: false, invincible: false, infHype: false, alwaysFire: false, autoBat: false, autoBowl: false, noChaos: false, hitboxes: false, trajectory: false, aiIntent: false, skeleton: false, stats: false, muteComm: false }, sure: 0, force: 0, del: 0, chaos: 0, item: 0, chapter: 1, seg: 0, song: 0, score: [30, 2], hold: 0 };
const DEV_TABS = ['TUNING', 'TOGGLES', 'JUMP', 'INFO'];
function devOpen() { if (HUB) return false; DEV.open = true; DEV.i = 0; DEV.scroll = 0; if (game.paused) game.resume(); game.input.consumeAll(); cover('dev'); emit('dev:open', {}); return true; }
function devClose() { DEV.open = false; game.input.consumeAll(); }
function devRows() {
  const m = MATCH, t = DEV.tab, D = DEV;
  if (t === 0) return [{ label: 'Reset all to defaults', act: () => { tuneReset(); sfx('confirm'); } }].concat(TUNE_DEFS.map(([k, label, d, mn, mx, st]) => ({ slider: k, label, d, mn, mx, st })));
  if (t === 1) {
    const T_ = [['slowmo', 'Slow motion (×0.25)'], ['invincible', 'Invincible batter'], ['infHype', 'Infinite Hype'], ['alwaysFire', 'Always ON FIRE'], ['autoBat', 'Auto-bat (the CPU bats for you)'], ['autoBowl', 'Auto-bowl and field'], ['noChaos', 'No chaos events'], ['trajectory', 'Show the trajectory (Owl-Eye, live)'], ['hitboxes', 'Show stumps, pad and bat zones'], ['aiIntent', 'Show the CPU batter\'s read'], ['skeleton', 'Skeleton overlay'], ['stats', 'Frame stats'], ['muteComm', 'Mute commentary']];
    const rows = T_.map(([k, label]) => ({ label, toggle: k }));
    if (m) rows.push({ label: 'Weather', options: ['clear', 'overcast', 'rain', 'fog'], get: () => m.weather, set: v => { m.weather = v; m.env.wet = v === 'rain'; CROWD.rain = v === 'rain'; } }, { label: 'Time of day', options: ['day', 'dusk', 'night'], get: () => m.time, set: v => { m.time = v; useGround(m.g.id, m); } });
    return rows;
  }
  if (t === 2) {
    const rows = [
      { label: 'Story: chapter', options: [1, 2, 3, 4, 5], get: () => D.chapter, set: v => { D.chapter = v; } },
      { label: '  Play the chapter (from its scene)', act: () => { devClose(); startChapter(D.chapter); } },
      { label: '  Jump to its match', act: () => { devClose(); const C = CHAPTERS[D.chapter - 1]; startMatch({ mode: 'story', chapter: D.chapter, teams: ['ker', C.opp], ground: C.ground, overs: C.overs, wickets: C.wickets, kerfuffle: C.kerfuffle, humans: [[game.input], []], batFirst: C.batFirst || null, scenario: C.scenario || null, rain: !!C.rain, boss: !!C.boss }); } },
      { label: '  Jump to its ending scene', act: () => { devClose(); storyWin(D.chapter); } },
      { label: 'Start a Quick Match', act: () => { devClose(); startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', humans: [[game.input], []] }); } }
    ];
    if (m) rows.push(
      { label: 'Skip to the last over', act: () => { const I = m.I; if (I.overs > 1) { I.legal = (I.overs - 1) * 6; I.over = []; m._newOver(); m._go('between'); } } },
      { label: 'Win the innings', act: () => { const I = m.I; I.runs = m.target() ? m.target() : I.runs + 30; I.legal = Math.max(I.legal, 1); m.ballRec = null; m._go('between'); if (m.inningsOver()) { const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } } },
      { label: 'Lose the innings', act: () => { const I = m.I; I.wkts = I.wmax; const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } },
      { label: 'Set runs', options: [0, 5, 10, 20, 30, 40, 60, 80], get: () => D.score[0], set: v => { D.score[0] = v; } },
      { label: 'Set wickets', options: [0, 1, 2, 3, 4], get: () => D.score[1], set: v => { D.score[1] = v; } },
      { label: '  Apply the score', act: () => { m.I.runs = D.score[0]; m.I.wkts = Math.min(m.I.wmax - 1, D.score[1]); } },
      { label: 'Force the next outcome', options: FORCE_LIST, get: () => FORCE_LIST[D.force], set: v => { D.force = FORCE_LIST.indexOf(v); }, act: () => { m.forceNext(FORCE_LIST[D.force]); callout('NEXT: ' + upper(FORCE_LIST[D.force]), '#7ae0ff', 1.2, { small: true }); } },
      { label: 'Force the next delivery', options: Object.keys(DELIVERIES), get: () => Object.keys(DELIVERIES)[D.del], set: v => { D.del = Object.keys(DELIVERIES).indexOf(v); }, act: () => { m.dev.forceDelivery = { del: Object.keys(DELIVERIES)[D.del] }; } },
      { label: 'Force a review (a wrong LBW call)', act: () => { m.cfg.umpWrong = true; m.forceNext('lbw'); } },
      { label: 'Trigger a chaos event', options: Object.keys(CHAOS), get: () => Object.keys(CHAOS)[D.chaos], set: v => { D.chaos = Object.keys(CHAOS).indexOf(v); }, act: () => m.triggerChaos(Object.keys(CHAOS)[D.chaos]) },
      { label: 'Spawn an item token', options: Object.keys(ITEMS), get: () => Object.keys(ITEMS)[D.item], set: v => { D.item = Object.keys(ITEMS).indexOf(v); }, act: () => m.spawnToken(Object.keys(ITEMS)[D.item]) },
      { label: 'Trigger a Super Over (tie the scores)', act: () => { if (m.i >= 1) { const I = m.I, a = m.inn[m.i - 1]; I.runs = a.runs; I.legal = I.overs * 6; m.ballRec = null; const r = m.nextInnings(); m.breakKind = r; m._go(r === 'result' ? 'over' : 'break'); } else callout('IN THE SECOND INNINGS', '#ff6b6b', 1, { small: true }); } }
    );
    rows.push(
      { label: 'Play attract segment', options: SEGMENTS.map((s, k) => k + 1), get: () => D.seg + 1, set: v => { D.seg = v - 1; }, act: () => { devClose(); game.go('attract', { seg: D.seg, from: 'title' }); } },
      { label: 'Jukebox', options: Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)), get: () => (Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)))[D.song], set: v => { D.song = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s)).indexOf(v); }, act: () => { const id = Object.keys(SONGS).concat(Object.keys(STINGS).map(s => 'sting:' + s))[D.song]; if (id.startsWith('sting:')) sting(id.slice(6)); else { musicNow = null; music(id); } } },
      { label: 'Unlock everything', act: () => { profile.unlocked = TEAMS.map(t => t.id); profile.story.chapter = 5; saveProfile(); callout('UNLOCKED', '#5fd38a', 1, { small: true }); } },
      { label: D.sure ? 'Reset the save: press again to confirm' : 'Reset the save', act: () => { if (!D.sure) { D.sure = 1; return; } D.sure = 0; profile = newProfile(); saveProfile(); callout('SAVE RESET', '#ff6b6b', 1, { small: true }); } }
    );
    return rows;
  }
  return devInfo().map(l => ({ label: l, info: true }));
}
function devInfo() {
  const m = MATCH, out = [];
  out.push('Scene: ' + game.sceneName + '   Engine ' + (E.versionLabel ? E.versionLabel() : E.version) + '   Cricket Kerfuffle 1.0');
  out.push('Seeds: match ' + RNG.seed + '   difficulty ' + difficulty + '   tuning changed: ' + (tuneChanged().join(', ') || 'none'));
  if (m) { const I = m.I; out.push('Match: ' + m.cfg.mode + ' at ' + m.g.name + ', innings ' + (m.i + 1) + ', ' + m.teams[I.bat].code + ' ' + I.runs + '/' + I.wkts + ' (' + m.overStr() + ')' + (m.target() ? ' target ' + m.target() : '')); out.push('State: ' + m.state + ' ' + m.st.toFixed(1) + 's   ball ' + m.ball.phase + ' (' + Math.round(m.ball.x) + ', ' + Math.round(m.ball.y) + ', ' + Math.round(m.ball.z) + ')   cam ' + WORLD.shot); if (m.lastRec) out.push('Last ball: ' + JSON.stringify({ runs: m.lastRec.runs, b: m.lastRec.boundary, w: m.lastRec.wicket && m.lastRec.wicket.how, shot: m.lastRec.shot, grade: m.lastRec.grade, kmh: m.lastRec.kmh })); }
  out.push('Floor bakes: ' + (WORLD.map && WORLD.map.floors ? Object.keys(WORLD.map.floors).length : 0) + '   errors: ' + game.errors.length);
  out.push('Last events:'); for (const e of BUS.log.slice(-10)) out.push('• ' + e.t + ' ' + e.type + ' ' + e.data);
  out.push('Last commentary:'); for (const l of COMM.lines.slice(-5)) out.push('• ' + l);
  return out;
}
function devUpdate(dt) {
  const I = game.input, rows = devRows(), n = rows.length;
  if (I.pressed('cancel') || I.pressed('pause')) { devClose(); return; }
  if (I.pressed('run')) { DEV.tab = (DEV.tab + 1) % 4; DEV.i = 0; DEV.scroll = 0; sfx('select'); }
  if (I.pressed('back')) { DEV.tab = (DEV.tab + 3) % 4; DEV.i = 0; DEV.scroll = 0; sfx('select'); }
  if (I.repeat('up', .3, .07)) { DEV.i = (DEV.i - 1 + n) % n; sfx('tick'); }
  if (I.repeat('down', .3, .07)) { DEV.i = (DEV.i + 1) % n; sfx('tick'); }
  const p = !HEADLESS && I.pointer && I.pointer(), c = I.clicked && I.clicked();
  if (DEV.tabR && c) { const k = DEV.tabR.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0) { DEV.tab = k; DEV.i = 0; DEV.scroll = 0; return; } }
  if (DEV.rowR && p && (!DEV.lastP || p[0] !== DEV.lastP[0] || p[1] !== DEV.lastP[1])) { DEV.lastP = p.slice(); const k = DEV.rowR.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0) DEV.i = k; }
  const row = rows[DEV.i]; if (!row) return;
  // the mouse drags a slider's knob
  if (row.slider && p && DEV.sliderR && DEV.sliderR[DEV.i] && I.down('shot') && I.lastDevice === 'mouse') { const r = DEV.sliderR[DEV.i]; if (p[0] >= r[0] - 4 && p[0] <= r[0] + r[2] + 4 && p[1] >= r[1] - 6 && p[1] <= r[1] + 8) { const u = clamp((p[0] - r[0]) / r[2], 0, 1); tuneSet(row.slider, row.mn + u * (row.mx - row.mn)); applyTune(row.slider); return; } }
  const dir = (I.repeat('left', .3, .05) ? -1 : 0) + (I.repeat('right', .3, .05) ? 1 : 0);
  if (dir && (I.down('left') || I.down('right'))) DEV.hold += dt; else if (!I.down('left') && !I.down('right')) DEV.hold = 0;
  if (dir) {
    if (row.slider) { const mult = DEV.hold > 1.2 ? 10 : DEV.hold > .5 ? 3 : 1; tuneSet(row.slider, TUNE[row.slider] + dir * row.st * mult); applyTune(row.slider); }
    else if (row.options) { const cur = row.get(), k = row.options.indexOf(cur); row.set(row.options[(k + dir + row.options.length) % row.options.length]); sfx('tick'); }
  }
  if (I.pressed('confirm') || I.pressed('shot')) {
    if (row.toggle) { DEV.toggles[row.toggle] = !DEV.toggles[row.toggle]; sfx('select'); if (row.toggle === 'stats') game.settings.set && game.settings.set('showFps', DEV.toggles.stats); }
    else if (row.act) { row.act(); sfx('confirm'); }
    else if (row.options) { const k = row.options.indexOf(row.get()); row.set(row.options[(k + 1) % row.options.length]); }
  }
  if (I.pressed('special')) { if (row.slider) { tuneReset(row.slider); applyTune(row.slider); sfx('cancel'); } else if (row.toggle) DEV.toggles[row.toggle] = false; }
}
function applyTune(k) { if (k === 'camPitch' || k === 'camScale' || k === 'wideScale') { makeViews(); if (VIEWS[WORLD.shot]) game.setView(VIEWS[WORLD.shot]); } if (k === 'boundaryScale' && MATCH) { WORLD.gid = null; useGround(MATCH.g.id, MATCH); } }
function devDraw(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, rows = devRows();
    px.blend(g, .88, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0818'));
    E.font.text(g, 'DEV MODE', 8, 6, '#ff6b6b', { scale: 2, shadow: '#000' });
    DEV.tabR = [];
    DEV_TABS.forEach((tn, k) => { const x = 112 + k * Math.min(72, (W - 120) / 4), foc = k === DEV.tab; DEV.tabR.push([x - 2, 4, 68, 16]); px.rect(g, x - 2, 4, 68, 16, foc ? '#3a2a5a' : '#1a1430'); if (foc) px.rect(g, x - 2, 19, 68, 1, '#ffd23a'); E.font.text(g, tn, x + 32, 8, foc ? '#ffd23a' : '#c8c0e0', { align: 'center' }); });
    const lh = 12, top = 26, vis = Math.floor((H - top - 22) / lh);
    if (DEV.i < DEV.scroll) DEV.scroll = DEV.i; if (DEV.i >= DEV.scroll + vis) DEV.scroll = DEV.i - vis + 1;
    DEV.rowR = []; DEV.sliderR = [];
    rows.forEach((row, k) => {
      const y = top + (k - DEV.scroll) * lh; if (k < DEV.scroll || k >= DEV.scroll + vis) { DEV.rowR[k] = null; return; }
      const foc = k === DEV.i; DEV.rowR[k] = [6, y - 2, W - 12, lh];
      if (foc && !row.info) { px.rect(g, 6, y - 2, W - 12, lh, '#2a2048'); px.rect(g, 6, y - 2, 2, lh, '#ffd23a'); }
      E.font.text(g, row.label, 12, y, row.info ? (row.label.startsWith('•') ? '#c8c0e0' : '#f4f0e0') : foc ? '#ffe9a0' : '#f4f0e0');
      if (row.slider) {
        const v = TUNE[row.slider], sx = Math.round(W * .55), sw = Math.round(W * .3), u = (v - row.mn) / (row.mx - row.mn), du = (row.d - row.mn) / (row.mx - row.mn);
        DEV.sliderR[k] = [sx, y + 2, sw, 3];
        px.rect(g, sx, y + 2, sw, 3, '#3a3450'); px.rect(g, sx, y + 2, Math.round(sw * u), 3, v === row.d ? '#7a7490' : '#ffd23a'); px.rect(g, sx + Math.round(sw * du), y, 1, 7, '#7ae0ff'); px.rect(g, sx + Math.round(sw * u) - 1, y - 1, 3, 9, '#ffffff');
        E.font.text(g, (+v.toFixed(3)) + '', sx + sw + 6, y, v === row.d ? '#c8c0e0' : '#ffd23a'); E.font.text(g, '(' + row.d + ')', W - 10, y, '#7a7490', { align: 'right' });
      }
      if (row.toggle) E.font.text(g, DEV.toggles[row.toggle] ? 'ON' : 'OFF', W - 14, y, DEV.toggles[row.toggle] ? '#5fd38a' : '#7a7490', { align: 'right' });
      if (row.options) E.font.text(g, (foc ? '← ' : '') + upper(String(row.get())) + (foc ? ' ▸' : ''), W - 14, y, '#ffd23a', { align: 'right' });
    });
    footer(g, r, [['run', 'Tab'], ['left', 'Adjust'], ['confirm', 'Toggle / Do'], ['special', 'Reset row'], ['cancel', 'Close']]);
  });
}
// the debug overlays (dev toggles): the trajectory, the zones, the CPU's read, skeletons
function devOverlays(r, m) {
  const D = DEV.toggles; if (!m) return;
  if (D.trajectory && m.ball.phase !== 'held' && m.ball.phase !== 'carried') { const path = predict(m.ball, 2, m.env, 1 / 30); r.queue(OX, OY + 160, 0, g => { for (let k = 1; k < path.length; k++) { const a = r.w(OX + path[k - 1].x, OY + path[k - 1].y, path[k - 1].z), b = r.w(OX + path[k].x, OY + path[k].y, path[k].z); px.line(g, a[0], a[1], b[0], b[1], '#3ad8ff'); } }, { bias: 3 }); }
  if (D.hitboxes) { const b0 = m.batters[0], h = m.strikerHand(); r.decal(() => { r.groundRing(OX, OY, STUMPS.hw, '#ff4a4a', 1); r.groundRing(OX + b0.x - 3 * h, OY + (m.swing ? m.swing.cy : 24), 3.8, '#ffd23a', 1); for (const f of m.fielders) r.groundRing(OX + f.x, OY + f.y, 9, '#7ae07a', .5); }); }
  if (D.aiIntent && m.batPlan && m.batPlan.btn) { const b0 = m.batters[0], w = dirOf(m.batPlan.th, m.strikerHand()); r.decal(() => { for (let k = 1; k < 8; k++) r.groundDisc(OX + b0.x + w[0] * k * 10, OY + b0.y + w[1] * k * 10, 1.5, '#ff6bff', .9); }); }
}

// ---- 54-hub.js ----
// ---- AI Hub sessions (5.17): Session Protocol v1, parallel mode, 1-4 players. Each copy plays the same seeded over
// from the Thrumptonator at the Megadome; our own card before the start; progress after every ball; one result; an
// immediate result at time-up; at the end, no input and no sound.
const HUBS = { info: null, card: null, phase: 'connecting', sent: { progress: 0, result: 0 }, ended: null, deliveries: null, started: false };
function hubConnect() {
  if (!HUB) return;
  game.hubActive = true;
  HUB.connect({ mode: 'parallel', seats: [1, 4], card: true }).then(info => {
    if (!info) { HUBS.phase = 'none'; game.hubActive = false; game.go('title'); return; }
    HUBS.info = info; HUBS.phase = 'card';
    // the round from the seed: six deliveries, the same on every copy whatever anyone presses
    const R = HUB.rng('over'), kinds = ['piston', 'steamBouncer', 'spinCycle', 'piston', 'steamBouncer', 'piston'];
    HUBS.deliveries = kinds.map((d, k) => ({ del: d, target: [-(1 + R() * 7), d === 'steamBouncer' ? 165 + R() * 15 : d === 'spinCycle' ? 70 + R() * 30 : 50 + R() * 70], grade: 'green', special: k === 5 }));
    HUBS.seed = (info.seed >>> 0) || 1;
    HUB.on('card', c => { HUBS.card = c; });
    HUB.on('start', () => { HUBS.started = true; HUBS.phase = 'countdown'; game.go('match', { cfg: hubConfig() }, { fade: 0 }); });
    HUB.on('time-up', () => { hubResult(true); });
    HUB.on('end', d => { HUBS.ended = d && d.reason === 'sat-out' ? 'You sat this one out' : 'Round over'; HUBS.phase = 'end'; game.input.clear(); game.input.consumeAll(); try { game.audio.music(null); game.audio.mute && game.audio.mute(true); } catch (e) { /* no sound */ } crowdSilence(); });
    game.go('hubcard', {}, { fade: 0 });
    HUB.ready();
  });
}
function hubConfig() {
  const script = { k: 0, next(what) { if (what !== 'bowl') return null; return HUBS.deliveries[Math.min(5, this.k++)]; } };
  return { mode: 'hub', teams: ['ker', 'thr'], ground: 'dome', timeOfDay: 'night', weather: 'clear', overs: 1, wickets: 2, kerfuffle: true, humans: [[game.input], []], batFirst: 'ker', single: true, superOver: false, script, seed: HUBS.seed, order: { ker: ['edie', 'dev', 'pip'] }, noReplays: true, difficulty: 'county', reviews: 0 };
}
function hubProgress(m) {
  if (!HUB || !HUBS.info || HUBS.sent.result || HUBS.ended) return;
  const I = m.I; HUB.progress({ score: I.runs, label: I.runs + '/' + I.wkts + ' (' + I.legal + ' balls)' }); HUBS.sent.progress++;
}
function hubResult(now) {
  if (!HUB || !HUBS.info || HUBS.sent.result || HUBS.ended) return;
  const m = MATCH && MATCH.cfg.mode === 'hub' ? MATCH : null, I = m ? m.I : { runs: 0, wkts: 0, fours: 0, sixes: 0 };
  const best = m && m.records.filter(r => r.shot).sort((a, b) => (b.runs + (b.boundary || 0)) - (a.runs + (a.boundary || 0)))[0];
  HUB.result({ score: I.runs, stats: { boundaries: (I.fours || 0) + (I.sixes || 0), sixes: I.sixes || 0, 'best shot': best && SHOT[best.shot] ? SHOT[best.shot].name : 'none' } });
  HUBS.sent.result++; HUBS.phase = 'waiting';
}
on('ball:done', () => { if (MATCH && MATCH.cfg.mode === 'hub') hubProgress(MATCH); });
on('match:end', () => { if (MATCH && MATCH.cfg.mode === 'hub') hubResult(); });
on('match:start', d => { if (d.mode === 'hub' && MATCH) hubProgress(MATCH); });
SC.hubcard = {
  enter() { this.t = 0; music('showdown'); const R = HUB ? HUB.rng('card') : E.rng(3); this.stars = Array.from({ length: 40 }, () => [R(), R(), .3 + R()]); },
  update(dt) {
    this.t += dt; if (HUBS.ended) return;
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('shot') || I.pressed('start')) HUB && HUB.answer('ready');
    if (I.pressed('special') || I.pressed('more')) HUB && HUB.answer('more');
    const c = I.clicked && I.clicked();
    if (c && this.btns) { if (inR(c, this.btns[0])) HUB.answer('ready'); else if (inR(c, this.btns[1])) HUB.answer('more'); }
  },
  draw(r) {
    drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' });
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040e'));
      for (const [x, y, s] of this.stars) px.dot(g, Math.floor(x * W), Math.floor((y * H + this.t * 20 * s) % H), '#8a8ac8');
      bigTitle(g, 'CRICKET KERFUFFLE', W / 2, 10, { scale: 2 });
      E.font.text(g, 'SUPER OVER AT THE MEGADOME', W / 2, 30, '#c890ff', { align: 'center', shadow: '#000' });
      E.font.text(g, 'MOST RUNS FROM ONE OVER WINS: 6 BALLS, 2 WICKETS', W / 2, 44, '#ffd23a', { align: 'center', shadow: '#000' });
      const info = HUBS.info, card = HUBS.card || {};
      if (info) info.players.forEach((p, k) => { const y = 60 + k * 14, ready = (card.ready || []).includes(p.id); panel(g, W / 2 - 110, y, 220, 12, { alpha: .6, rule: p.color }); px.rect(g, W / 2 - 110, y, 4, 12, p.color); E.font.text(g, String(p.name).slice(0, 24) + (p.id === info.me ? ' (YOU)' : ''), W / 2 - 100, y + 3, '#f4f0e0'); E.font.text(g, ready ? 'READY •'.replace('•', '•') : '...', W / 2 + 104, y + 3, ready ? '#5fd38a' : '#8a84a8', { align: 'right' }); });
      const y0 = 124;
      prompts(g, game.input, [['left', 'Aim'], ['shot', 'Hit'], ['loft', 'Loft'], ['block', 'Defend'], ['run', 'Run']], W / 2, y0, { align: 'center' });
      let msg = 'GET READY...';
      if (card.starting) msg = 'STARTING...'; else if (card.paused) msg = 'PAUSED: MOST PLAYERS WANT MORE TIME'; else if (card.left !== null && card.left !== undefined) msg = 'STARTS IN ' + Math.ceil(card.left / 1000) + ' S';
      E.font.text(g, msg, W / 2, y0 + 16, card.paused ? '#ffd23a' : '#f4f0e0', { align: 'center', scale: 2, shadow: '#000' });
      const bw = 90; this.btns = [[W / 2 - bw - 6, H - 44, bw, 20], [W / 2 + 6, H - 44, bw, 20]];
      const asked = card.asked, me = info && (card.ready || []).includes(info.me);
      px.rect(g, ...this.btns[0], me ? '#2a6a3a' : '#5fd38a'); E.font.text(g, 'READY', this.btns[0][0] + bw / 2 + 14, H - 38, '#101018', { align: 'center' , outline: false, shadow: false }); glyph(g, game.input, 'confirm', this.btns[0][0] + 6, H - 34);
      px.rect(g, ...this.btns[1], asked ? '#8a6a1a' : '#ffd23a'); E.font.text(g, 'MORE TIME', this.btns[1][0] + bw / 2 + 8, H - 38, '#101018', { align: 'center' , outline: false, shadow: false }); glyph(g, game.input, 'special', this.btns[1][0] + 4, H - 34);
      if (HUBS.ended) { panel(g, 0, H / 2 - 16, W, 32); E.font.text(g, upper(HUBS.ended), W / 2, H / 2 - 6, '#ffd23a', { align: 'center', scale: 2 }); }
    });
  }
};
const inR = (p, r) => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
function hubTime() { return HUB && HUB.time ? HUB.time() : 0; }
function drawHubHud(g, r, m) {
  const W = r.W, H = r.H, t = hubTime();
  if (t < 0 && isFinite(t)) bigTitle(g, String(Math.ceil(-t / 1000)), W / 2, H / 2 - 30, { scale: 4 });
  else if (HUBS.phase === 'countdown' && m.t < 1) bigTitle(g, 'PLAY!', W / 2, H / 2 - 30, { scale: 4 });
  if (HUBS.phase === 'waiting' && !HUBS.ended) { panel(g, 0, H / 2 - 14, W, 28); E.font.text(g, 'WAITING FOR THE OTHERS...', W / 2, H / 2 - 6, '#f4f0e0', { align: 'center', scale: 2 }); }
  if (HUBS.ended) { panel(g, 0, H / 2 - 16, W, 32); E.font.text(g, upper(HUBS.ended), W / 2, H / 2 - 6, '#ffd23a', { align: 'center', scale: 2 }); }
}
// the hub's round waits for AIHub.time() >= 0 and stops for good at the end
const _matchUpdate = SC.match.update;
SC.match.update = function (dt) {
  const m = this.m;
  if (m && m.cfg.mode === 'hub') {
    if (HUBS.ended) { game.input.consumeAll(); return; }
    const t = hubTime(); if (t < 0) { director(m, dt); return; }
    if (m.state === 'over') { hubResult(); director(m, dt); hudStep(dt); return; }
  }
  return _matchUpdate.call(this, dt);
};

// ---- 55-about.js ----
// ---- About / Credits (5.21): the same Source Information and feedback as the builder's reply, paged, one topic each.
// The text lives in ABOUT (filled from the exit interview's answers) so the screen and exit-interview.json agree.
const ABOUT = {
  date: '2026-11-04 06:27:57', source: 'Cricket (over-the-top arcade style)', plan: 'PLAN.md',
  genre: 'Arcade sports (cricket), over the top, with a comedy story campaign',
  perspective: '2.5D in projected-3D views: a TV broadcast camera behind the bowler for every delivery, a high wide camera following the ball, close-ups and a side-on review camera; story scenes in a three-quarter view',
  tech: 'my-3D2dge v0.85.2 (the full engine, modified), AI Hub session client 1.4.0, plain JavaScript, Web Audio; tests on Node and Playwright 1.63.0',
  art: "The engine's HD Humanoid pixel style at 320x240 expanded, canvas lighting, engine shapes and materials, with new cricket assets (stumps, sight screens, the pub, the Thrumptonator, Doris the cow and more)",
  animation: "The engine's procedural Humanoid rigs, with a cricket layer of IK post-poses: two-handed bat swings by shot family, the bowler's overarm windmill, umpire signals; E.move throws, poses and dives",
  audio: 'Chip-synth music in layers (base, drums, fire), synthesized effects, a crowd engine (bed, applause, roars) and Animalese-style gibberish formant voices, all in code',
  online: 'AI Hub Session Protocol v1: a parallel Super Over at the Megadome for 1 to 4 players, with the game\'s own card',
  testing: 'Headless engine (game.advance, game.debug), scripted playthroughs and bot matches behind one command, Playwright browser checks, the AI Hub harness',
  research: 'None beyond the plan, the engine handoff docs and kits, and the AI Hub protocol README and example',
  environment: 'Claude Code CLI (headless); Linux; browser unknown', model: 'Anthropic, claude-opus-5-5, reasoning effort medium', usage: 'unknown',
  testingFeedback: [], engineFeedback: [], promptFeedback: []
};
let ABOUT_PAGES = [];
function aboutPages() {
  const A = ABOUT, q = (l, a) => a.map((x, k) => '• ' + l[k] + ' ' + x);
  ABOUT_PAGES = [
    ['SOURCE INFORMATION', ['Date: ' + A.date, 'Source: ' + A.source, 'Plan: ' + A.plan, 'Genre: ' + A.genre, 'Perspective: ' + A.perspective, 'Environment: ' + A.environment, 'Model: ' + A.model, 'Usage: ' + A.usage]],
    ['TECH AND ENGINE', ['Tech: ' + A.tech, 'Engine changes (engine/CHANGES-KERFUFFLE.md): a cricket bat weapon with a two-handed grip; batting pads; moustaches, beards and glasses; PlayStation button symbols by default with Xbox in Settings; Create + Options left to the AI Hub; ten cached floor bakes.']],
    ['ART, ANIMATION, AUDIO', ['Art direction: ' + A.art, 'Animation: ' + A.animation, 'Audio: ' + A.audio]],
    ['ONLINE AND TESTING', ['Online: ' + A.online, 'Testing: ' + A.testing, 'Research: ' + A.research]],
    ['TESTING FEEDBACK', q(['How many issues did testing catch?', 'How many were critical?', 'Most helpful test:', 'Least helpful test:'], A.testingFeedback)],
    ['ENGINE FEEDBACK', q(['Liked most:', 'Stuck or guessed wrong:', 'Built myself:', 'Hardest part:', 'Changed:', 'One change:'], A.engineFeedback)],
    ['PROMPT FEEDBACK', q(['Liked most:', 'Confusing:', 'Hardest:', 'Would change:'], A.promptFeedback)],
    ['CREDITS', ['CRICKET KERFUFFLE. Design, code, art, animation, music, sound and words: made with Claude (Anthropic) from TASK.md and PLAN.md.', 'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), modified for this game.', 'AI Hub Session Protocol v1, client 1.4.0, by Michael Crosato.', 'No asset files: every object, sprite, song, sound and voice is drawn or synthesized in code. Engine core shapes (trees, pines, rocks) and props (palms, cacti).', 'Thank you for playing. Lord Thrumpton-Vane is adequate at fine leg.']]
  ];
}
aboutPages();

// ---- 56-feedback.js ----
// ---- the builder's answers (the chat reply, exit-interview.json and the About pages carry the same words)
ABOUT.testingFeedback = [
  'About 41 issues: 25 gameplay or logic bugs, 7 visual or layout problems, 6 balance problems (wides, a passive CPU batter, a slow sandy outfield) and a few test-harness mistakes of my own.',
  '8 were game breaking: a dead ball that never ended (a review timer below zero), two scenes that could only finish once (stale flags), a misnamed dead-ball handler, the camera pointed thousands of units away (radians read as degrees), an engine floor-bake crash at the low broadcast pitch, long throws counted as overthrows (15-second balls), and a commentary crash in CPU-only matches.',
  'The forced-outcome scenarios (sim-field, sim-arcade, attract): they drive the real delivery director end to end, and found most of the logic bugs and all the stuck-ball ones.',
  'The solved-delivery accuracy check: it mostly measured the 1/120 s step quantization of the pitching point, not a game bug.'
];
ABOUT.engineFeedback = [
  'The Humanoid rig: a dressed, lit, animated cricketer from one options object, and solvePose open to wrapping, so bat swings and a bowling windmill could be added by IK.',
  'Yes: a custom View keeps its pitch in radians (pitchDeg holds the degrees), which put the camera thousands of units away; and a long press on a click kept clicked() null in a headless test.',
  'Cricket itself: the ball physics and predictor, the delivery director, fielding and running, the umpiring and reviews, plus the forced-outcome layer the attract mode and dev mode share.',
  'Framing a strongly foreshortened broadcast camera: the chunked floor bake broke at a low pitch, and the far end needed a painted panorama.',
  'A cricket bat weapon, batting pads, moustaches/beards/glasses, PlayStation glyphs by default with Xbox as the option, Create + Options left to the hub, ten cached floor bakes, and a fix for the chunked floor cache trim.',
  'A perspective (telephoto) camera option for ground views, so a TV-style sports camera needs no painted far-end panorama.'
];
ABOUT.promptFeedback = [
  'The clear, testable definition of done, and the freedom to change the engine.',
  'How much of a very large plan is binding when TASK.md says it wins on disagreement, and what "follow" means for the plan versus the AI Hub protocol.',
  'Fitting a full cricket simulation, five grounds, a story, local and online multiplayer, an attract mode and a dev mode into one session with honest testing.',
  'Give a target scope (minutes of play, number of modes) and say which plan features are required versus optional.'
];
aboutPages();

// ---- 99-start.js ----
// ---- the start: the game, its input map, the settings, the pause menu's items, the scenes, the boot steps, deep links
// for tools, and the game.debug handle for tests and tools.
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', group: 'Game', help: 'Village is forgiving; Kerfuffle! doubles the chaos' },
  { key: 'overs', label: 'Default overs', options: ['2', '1', '3', '5'], value: '2', group: 'Game' },
  { key: 'wickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5', group: 'Game' },
  { key: 'kerfuffle', label: 'Kerfuffle rules', value: true, group: 'Game', help: 'Items, specials and chaos events' },
  { key: 'marker', label: 'Pitch marker (batting)', value: true, group: 'Game', help: 'Where the ball will land, as it is bowled' },
  { key: 'timing', label: 'Timing feedback', value: true, group: 'Game' },
  { key: 'assistField', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', group: 'Game', help: 'Assisted catches the easy ones for you' },
  { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', group: 'Game' },
  { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments', group: 'Game' },
  { key: 'captions', label: 'Commentary captions', value: true, group: 'Game' },
  { key: 'voices', label: 'Commentary voices', value: true, group: 'Game' },
  { key: 'voiceVolume', label: 'Voices volume', options: ['100%', '75%', '50%', '25%'], value: '100%', group: 'Sound' }
];
game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: KERFUFFLE_KEYS, id: 'cricket-kerfuffle', autoPause: !HUB, headless: HEADLESS || undefined, propSize: 1.3,
  menu: { items: HUB ? [] : [['Restart', () => restartScene()], ['Dev Mode', () => devOpen()]], settings: SETTINGS, controls: ACTION_NAMES, quit: HUB ? false : 'title' } });
if (HUB) game.hubActive = true;
defineSfx(); presentationListeners();
difficulty = { Village: 'village', County: 'county', Test: 'test', 'Kerfuffle!': 'kerfuffle' }[game.settings.difficulty] || 'county';
try { const sv = game.saves; sv.write = () => ({ data: profile.story, place: (CHAPTERS[Math.min(4, profile.story.chapter - 1)] || CHAPTERS[0]).title, level: profile.story.chapter }); sv.read = s => { if (s && s.data && s.data.chapter) { profile.story = Object.assign(profile.story, s.data); saveProfile(); } }; } catch (e) { /* storage blocked */ }
function restartScene() { if (MATCH && game.sceneName === 'match') { const c = Object.assign({}, MATCH.cfg, { seed: (Math.random() * 1e9) >>> 0, humans: MATCH.humans }); game.resume(); game.go('match', { cfg: c, lesson: SC.match.d && SC.match.d.lesson, after: SC.match.d && SC.match.d.after }); } }
// the dev shortcut, keyboard only (`); touch-only detection (a key or a pad clears the gate)
if (!HEADLESS && typeof addEventListener === 'function') {
  addEventListener('keydown', e => { TOUCH.seenKey = true; if (e.code === 'Backquote' && !HUB && game.scene && game.scene.pausable) { if (DEV.open) devClose(); else devOpen(); } });
  addEventListener('gamepadconnected', () => { TOUCH.seenKey = true; });
}
const _devDrawHook = drawWorld;
drawWorld = function (r, m, dt) { _devDrawHook(r, m, dt); devOverlays(r, m); if (DEV.toggles.skeleton) for (const rig of RIGS.values()) if (rig.lastView) rig.debug(r); };
// a scene that waits for the hub's answer before anything else
SC.hubwait = { enter() { this.t = 0; }, update(dt) { this.t += dt; }, draw(r) { r.sky(['#05040e', '#1a1040']); r.overlay(g => { bigTitle(g, 'CRICKET KERFUFFLE', r.W / 2, r.H / 2 - 30, { scale: 2 }); E.font.text(g, 'CONNECTING TO THE HUB...', r.W / 2, r.H / 2, '#c8c0e0', { align: 'center' }); }); } };
// deep links for tools: #title #match #nets #about #dev #attract #story #hub
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1);
  if (HUB) return 'hubwait';
  return { match: 'match', nets: 'match', about: 'about', dev: 'match', attract: 'attract', story: 'storymap', setup: 'setup', results: 'match' }[h] ? h : 'title';
}
const START = deepLink();
const scenes = Object.assign({}, SC);
game.start({ scenes, scene: START === 'title' || START === 'about' || START === 'attract' || START === 'hubwait' ? (START === 'about' ? 'about' : START) : START === 'story' ? 'storymap' : 'title',
  boot: { title: 'CRICKET KERFUFFLE', version: '1.0', messages: LOADING_LINES,
    steps: [['Rolling the pitch', () => { for (const t of TEAMS) squad(t); }], ['Mowing the outfield', () => { useGround('green', null); }], ['Whitening the creases', () => { if (!HEADLESS) for (const gid of GROUND_ORDER) panoramaFor(gid); }], ['Brewing the tea', () => { spr(); }]] } });
Promise.resolve(game.booted).then(() => {
  if (START === 'match' || START === 'dev') startMatch({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', humans: [[game.input], []] });
  if (START === 'nets') startNets({ kind: 'bat' });
  if (START === 'setup') game.go('setup', { mode: 'quick' });
  if (START === 'dev') setTimeout(() => devOpen(), 600);
  if (HUB) hubConnect();
});
// ---- the handle for tests and tools
function snapshot() {
  const m = MATCH, I = game.input, sc = game.sceneName;
  const s = { scene: sc, mode: m ? m.cfg.mode : null, ui: { device: I.lastDevice, glyphs: I.padStyle ? I.padStyle() : null, touchGate: TOUCH.gate, prompts: { shot: promptKind(I, 'shot'), loft: promptKind(I, 'loft'), run: promptKind(I, 'run'), special: promptKind(I, 'special') }, menuFocus: game.scene && game.scene.menu ? game.scene.menu.i : null, hud: HUD.rects },
    dev: { open: DEV.open, changed: tuneChanged(), tab: DEV.tab }, coverage: Object.assign({}, COVER), errors: game.errors.length, attract: { active: sc === 'attract', segment: SC.attract.seg },
    hub: { active: !!HUB, phase: HUBS.phase, sent: Object.assign({}, HUBS.sent) }, story: { chapter: profile.story.chapter, stars: Object.assign({}, profile.story.stars) } };
  if (m) { const In = m.I; s.match = { innings: m.i, runs: In.runs, wkts: In.wkts, balls: In.legal, over: m.overStr(), target: m.target(), need: m.need(), freeHit: In.freeHit, striker: m.striker() && m.striker().p.short, bowler: m.bowlerP() && m.bowlerP().short, hype: m.hype.slice(), fire: Object.assign({}, m.fire), items: m.items.slice(), result: m.result, state: m.state, st: +m.st.toFixed(2), needBowler: !!m.needBowler, fieldPreset: m.fieldPreset[m.bowlT], overRound: m.overRound, review: !!m.review, decision: m.decision ? { out: m.decision.out, truth: m.decision.truth } : null, weather: m.weather, time: m.time, chaos: Object.keys(m.chaosActive), critters: (m.critters || []).length, targetsHit: m.targetsHit.slice(), tide: m.tide || 0 };
    s.ball = { phase: m.ball.phase, x: +m.ball.x.toFixed(1), y: +m.ball.y.toFixed(1), z: +m.ball.z.toFixed(1), pitched: m.ball.pitched, fx: m.ball.fx, kmh: m.ball.kmh }; s.last = m.lastRec || null; s.director = { state: m.state, shot: WORLD.shot }; s.swing = m.swing ? { grade: m.swing.grade, shot: m.swing.shot.id } : null; s.contact = m.contact; }
  return s;
}
function idealPress(btn = 'shot') { const m = MATCH; if (!m || m.state !== 'flight') return null; const cy = m.contactY(), a = arrival(m.ball, cy.y, m.env); if (!a) return null; return a.t - SHOT.straightDrive.at; }
game.debug = { snapshot, idealPress, E, Match, TUNE, T, COVER, BUS, RNG, LINES, SHOTS, SHOT, DELIVERIES, LESSONS, CHAPTERS, SEGMENTS, TEAMS, GROUNDS, ITEMS, CHAOS, SPECIALS, VOICES, SONGS, STINGS, SFX_DEFS, KERFUFFLE_KEYS, ABOUT, ABOUT_PAGES: () => ABOUT_PAGES, TOUCH, DEV, HUBS, WORLD,
  match: () => MATCH, profile: () => profile, setTuning: tuneSet, resetTuning: tuneReset, startMatch, startChapter, startNets, startShowdown, devOpen, devClose, devRows, devUpdate, forceOutcome: k => MATCH && MATCH.forceNext(k), triggerChaos: id => MATCH && MATCH.triggerChaos(id), spawnItem: (id, at) => MATCH && MATCH.spawnToken(id, at),
  syllables, hudLayout, overlaps, promptKind, matchReport, squad, lengthBand, predict, arrival, stepBall, newBall, solveDelivery, kmhToU, fmt, commVars, PICK, skipTo: s => MATCH && MATCH._go(s) };

})();
