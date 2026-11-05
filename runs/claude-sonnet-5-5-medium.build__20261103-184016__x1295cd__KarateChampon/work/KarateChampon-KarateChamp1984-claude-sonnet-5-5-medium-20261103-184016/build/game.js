(() => {
'use strict';
const E = My3D2dge;
/* ---- 00-core.js ---- */
/* KARATE CHAMPON — a point-sparring karate game inspired by Karate Champ (1984).
 * CORE LOOP: Read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land
 * theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the
 * match. Win to earn a belt and the next stage, with a bonus stage after every second win. */
const { px, clamp, lerp, TAU } = E;
const KC = {}; window.KC = KC;
KC.VERSION = '1.0.0';
const HUB = typeof AIHub !== 'undefined' ? AIHub : null, SESSION = !!(HUB && HUB.active);
KC.SESSION = SESSION;

/* ---------- live tuning (dev sliders). Systems read KC.TUNE every step, never cached ---------- */
KC.TUNE_DEFS = [
  ['gameSpeed', 'GAME SPEED', .25, 2, 1, .05], ['techSpeed', 'TECHNIQUE SPEED', .5, 1.5, 1, .05], ['walk', 'WALK SPEED', 40, 120, 72, 2],
  ['jump', 'JUMP POWER', 250, 450, 360, 5], ['gravity', 'GRAVITY', 700, 1400, 1100, 25], ['hitstop', 'HIT STOP', 0, .3, .1, .01],
  ['fullAt', 'FULL POINT AT', 300, 1000, 600, 50], ['counterMul', 'COUNTER MULTIPLIER', 1, 3, 2, .1], ['reachScale', 'REACH SCALE', .7, 1.4, 1, .05],
  ['blockWindow', 'BLOCK FRAMES', 6, 30, 14, 1], ['clock', 'ROUND CLOCK', 10, 99, 30, 1], ['pointsToWin', 'POINTS TO WIN', 1, 5, 2, .5],
  ['roundsToWin', 'ROUNDS TO WIN', 1, 3, 2, 1], ['cpuLevel', 'CPU LEVEL (0=AUTO)', 0, 10, 0, 1], ['cpuReact', 'CPU REACTION X', .5, 2, 1, .05],
  ['cpuAggression', 'CPU AGGRESSION', -1, 1, -1, .05], ['refPace', 'REFEREE PACE X', .5, 2, 1, .05], ['potSpeed', 'POT SPEED X', .5, 2, 1, .05],
  ['bullSpeed', 'BULL SPEED X', .5, 2, 1, .05], ['kiSpeed', 'KI GAUGE SPEED X', .5, 2, 1, .05], ['sessionTarget', 'ONLINE BOUTS TO WIN', 1, 10, 5, 1]
];
KC.TUNE_DEFAULTS = {}; KC.TUNE_DEFS.forEach(d => { KC.TUNE_DEFAULTS[d[0]] = d[4]; });
KC.TUNE = Object.assign({}, KC.TUNE_DEFAULTS);
KC.tuned = () => KC.TUNE_DEFS.some(d => Math.abs(KC.TUNE[d[0]] - d[4]) > 1e-9);
KC.resetTune = () => { Object.assign(KC.TUNE, KC.TUNE_DEFAULTS); KC.applyTune(); };
KC.applyTune = () => { if (KC.game) KC.game.timeScale = KC.TUNE.gameSpeed; };
const T = () => KC.TUNE;

/* ---------- util ---------- */
const STEP = 1 / 120;
const fmt = (n, w = 7) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
const up = s => String(s == null ? '' : s).toUpperCase();
// names from the hub are drawn with the pixel font only: uppercase, unsupported characters become ?, 10 characters max
const safeName = s => up(s).replace(/[^A-Z0-9 .\-_!]/g, '?').slice(0, 10);
const hash32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];
const sgn = v => v < 0 ? -1 : 1;
KC.fmt = fmt; KC.hash32 = hash32;

/* ---------- belts and ranks ---------- */
KC.BELTS = [
  { id: 'white', name: 'WHITE BELT', short: 'BEGINNER', color: '#f4f4ee' }, { id: 'yellow', name: 'YELLOW BELT', short: 'YELLOW', color: '#f0c830' },
  { id: 'green', name: 'GREEN BELT', short: 'GREEN', color: '#3aa050' }, { id: 'blue', name: 'BLUE BELT', short: 'BLUE', color: '#2f5fd0' },
  { id: 'brown', name: 'BROWN BELT', short: 'BROWN', color: '#6a4024' }, { id: 'black1', name: 'BLACK BELT 1ST DAN', short: '1ST DAN', color: '#16161c' },
  { id: 'black3', name: '3RD DAN', short: '3RD DAN', color: '#16161c' }, { id: 'black5', name: '5TH DAN', short: '5TH DAN', color: '#16161c' },
  { id: 'black8', name: '8TH DAN', short: '8TH DAN', color: '#16161c' }, { id: 'champ', name: 'CHAMP', short: 'CHAMP', color: '#e8c040' }
];

/* ---------- techniques (authoritative data). f = [startup, active, recovery] at 60 fps; the engine steps at 120 Hz ----------
 * input = [posture, strike]; posture n/t(oward)/a(way)/u/d, strike u/t/d/a (screen up, toward the foe, down, away) */
const TQ = (id, name, jp, input, height, f, travel, reach, pts, o = {}) => Object.assign({ id, name, jp, input, height, f, travel, reach, pts, unblockable: false, knockdown: false, kiai: 'light', bull: false, full: false }, o);
KC.TECH = [
  TQ('frontKick', 'FRONT KICK', 'MAE-GERI', ['n', 't'], 'mid', [11, 5, 28], 0, [6, 30], [100, 200], { limb: 'foot', move: { base: 'kick', z0: .6, z1: .9, reach: 7 }, bull: true }),
  TQ('revPunch', 'REVERSE PUNCH', 'GYAKU-ZUKI', ['n', 't'], 'mid', [6, 4, 18], 4, [0, 14], [100, 200], { limb: 'hand', move: { base: 'cross', z0: -1, z1: -.5, reach: 8 }, closeAlt: true }),
  TQ('roundKick', 'ROUND KICK', 'MAWASHI-GERI', ['n', 'u'], 'high', [10, 5, 22], 0, [6, 30], [300, 600], { limb: 'foot', move: { base: 'roundhouse' }, full: true, kiai: 'heavy' }),
  TQ('lowKick', 'LOW KICK', 'GEDAN-GERI', ['n', 'd'], 'low', [10, 5, 28], 0, [4, 28], [100, 200], { limb: 'foot', move: { base: 'kick', z0: .1, z1: .25, reach: 7 }, unblockable: true }),
  TQ('backKick', 'BACK KICK', 'USHIRO-GERI', ['n', 'a'], 'mid', [13, 5, 23], 6, [10, 34], [200, 400], { limb: 'foot', move: { base: 'kick', z0: .5, z1: .7, reach: 7.5 }, spin: .5, kiai: 'heavy', bull: true }),
  TQ('upLunge', 'UPPER LUNGE PUNCH', 'JODAN OI-ZUKI', ['t', 'u'], 'high', [18, 5, 34], 32, [18, 56], [500, 1000], { limb: 'hand', move: { base: 'cross', z0: 1.2, z1: 1.8, reach: 8.5, lunge: 4 }, full: true, closeAlt: 'roundKick', closeGap: 18, bull: true, kiai: 'heavy' }),
  TQ('midLunge', 'MIDDLE LUNGE PUNCH', 'CHUDAN OI-ZUKI', ['t', 't'], 'mid', [14, 5, 26], 40, [18, 60], [200, 400], { limb: 'hand', move: { base: 'cross', z0: -1, z1: -.5, reach: 8.5, lunge: 4 }, closeAlt: 'frontKick', closeGap: 18 }),
  TQ('frontSweep', 'FRONT FOOT SWEEP', 'ASHI-BARAI', ['t', 'd'], 'low', [16, 8, 36], 10, [4, 34], [200, 400], { limb: 'foot', move: { base: 'sweep' }, unblockable: true, knockdown: true }),
  TQ('turnBackKick', 'TURN BACK KICK', 'USHIRO-GERI', ['t', 'a'], 'mid', [17, 5, 26], 12, [12, 40], [500, 1000], { limb: 'foot', move: { base: 'kick', z0: .5, z1: .75, reach: 7.5 }, spin: 1, full: true, kiai: 'heavy' }),
  TQ('backRound', 'BACK ROUND KICK', 'USHIRO-MAWASHI', ['a', 'u'], 'high', [15, 5, 23], 0, [8, 34], [500, 1000], { limb: 'foot', move: { base: 'roundhouse', z0: 1.1, z1: 1.6 }, spin: 1, full: true, kiai: 'heavy' }),
  TQ('backSweep', 'BACK FOOT SWEEP', 'USHIRO-BARAI', ['a', 'd'], 'low', [16, 8, 36], 0, [6, 34], [100, 200], { limb: 'foot', move: { base: 'sweep' }, spin: 1, unblockable: true, knockdown: true }),
  TQ('jumpSide', 'JUMPING SIDE KICK', 'TOBI YOKO-GERI', ['u', 't'], 'high', [16, 10, 26], 48, [26, 76], [500, 1000], { limb: 'foot', move: { base: 'flyingkick', z0: .8, z1: 1 }, full: true, air: { vz: 340, vx: 60 }, kiai: 'heavy' }),
  TQ('jumpBack', 'JUMPING BACK KICK', 'TOBI USHIRO-GERI', ['u', 'a'], 'high', [14, 8, 22], 20, [8, 48], [500, 1000], { limb: 'foot', move: { base: 'flyingkick', z0: .8, z1: 1 }, full: true, air: { vz: 340, vx: 20 }, spin: .5, kiai: 'heavy' }),
  TQ('upperPunch', 'UPPER PUNCH', 'AGE-ZUKI', ['d', 'u'], 'high', [8, 7, 30], 0, [0, 18], [300, 600], { limb: 'hand', move: { base: 'uppercut' }, full: true, rising: true, bull: true }),
  TQ('squatPunch', 'SQUATTING LUNGE PUNCH', 'SUWARI OI-ZUKI', ['d', 't'], 'mid', [13, 5, 30], 20, [10, 44], [400, 800], { limb: 'hand', move: { base: 'cross', z0: -2, z1: -1.5, reach: 8.5, crouch: .8 }, full: true, hitsCrouch: true, bull: true }),
  TQ('block', 'BLOCK', 'UKE', ['a', 't'], 'none', [1, 14, 4], 0, [0, 0], [0, 0], { util: true }),
  TQ('frontFlip', 'FRONT SOMERSAULT', 'MAE-TENKAI', ['u', 'u'], 'none', [6, 40, 12], 95, [0, 0], [0, 0], { util: true, air: { vz: 370, vx: 140 }, flip: 1 }),
  TQ('backFlip', 'BACK SOMERSAULT', 'USHIRO-TENKAI', ['a', 'a'], 'none', [6, 40, 12], -85, [0, 0], [0, 0], { util: true, air: { vz: 370, vx: -126 }, flip: -1 }),
  TQ('jump', 'JUMP', 'TOBI', ['u', 'd'], 'none', [4, 39, 5], 0, [0, 0], [0, 0], { util: true, air: { vz: 360, vx: 0 } }),
  TQ('crouch', 'CROUCH', 'SHAGAMI', ['d', 'd'], 'none', [3, 0, 5], 0, [0, 0], [0, 0], { util: true }),
  TQ('backRoll', 'BACK ROLL', 'USHIRO-KAITEN', ['d', 'a'], 'none', [4, 28, 8], -90, [0, 0], [0, 0], { util: true, roll: true })
];
KC.TECHS = {}; KC.TECH.forEach(t => { KC.TECHS[t.id] = t; });
KC.MATRIX = {}; KC.TECH.forEach(t => { if (!t.closeAlt || t.id !== 'revPunch') KC.MATRIX[t.input.join('')] = t.id; });
KC.MATRIX['nt'] = 'frontKick';
KC.SCORING = KC.TECH.filter(t => !t.util);

/* ---------- roster (fighter data) ---------- */
const SKIN = '#e8b088';
const R_ = (id, name, title, rig, stats, sig, ai, voice, o = {}) => Object.assign({ id, name, title, rig, stats, sig, ai, voice }, o);
KC.ROSTER = [
  R_('taro', 'TARO MOYASHI', 'THE HERO', { size: 2.15, build: 'heroic', hair: 'spiky', hat: { style: 'band', color: '#f4f4ee' }, colors: { hair: '#1a1418' } }, { walk: 1, reach: 1, speed: 1 }, 'roundKick', null, { f0: 190, fm: 1.05, rate: 15, wave: 'pulse' }, { intro: 'I WILL BE CHAMP!', style: 'ALL-ROUNDER' }),
  R_('kamaboko', 'KAMABOKO', 'DOJO CLASSMATE', { size: 2.0, build: 'chibi', hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, colors: { hair: '#3a2a22' } }, { walk: .95, reach: .92, speed: .95 }, 'frontKick', { level: 1, aggr: .7, pat: .2, jump: .05, block: .1, gap: 30, w: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } }, { f0: 240, fm: 1.15, rate: 17, wave: 'pulse' }, { intro: 'I ATE THREE BOWLS. I AM READY!', style: 'CLUMSY', unlock: 0 }),
  R_('negi', 'SENPAI NEGI', 'DOJO SENIOR', { size: 2.35, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, colors: { hair: '#2a2018' } }, { walk: 1, reach: 1.04, speed: 1 }, 'backKick', { level: 2, aggr: .5, pat: .4, jump: .1, block: .35, gap: 36, w: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } }, { f0: 150, fm: 1, rate: 13, wave: 'saw' }, { intro: 'SHOW ME WHAT I TAUGHT YOU.', style: 'TEXTBOOK', unlock: 0 }),
  R_('ebi', 'EBI', 'HARBOR FISHERMAN', { size: 2.15, build: 'heroic', hair: 'short', hat: { style: 'band', color: '#ff8a2a' }, colors: { skin: '#c98a5a', hair: '#2a1a10' } }, { walk: 1.1, reach: .98, speed: 1.05 }, 'jumpSide', { level: 3, aggr: .42, pat: .3, jump: .3, block: .25, gap: 70, w: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } }, { f0: 210, fm: 1.08, rate: 19, wave: 'pulse' }, { intro: 'THE SEA MADE ME QUICK. CATCH ME!', style: 'JUMPER', unlock: 0, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.' }),
  R_('kikurage', 'KIKURAGE', 'BAMBOO HERMIT', { size: 2.1, build: 'heroic', hair: 'bald', hunch: .3, hat: { style: 'band', color: '#6a4a2a' }, colors: { hair: '#e8e4dc' } }, { walk: .9, reach: 1, speed: .95 }, 'revPunch', { level: 4, aggr: .25, pat: .8, jump: .05, block: .65, gap: 40, w: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } }, { f0: 110, fm: .92, rate: 9, wave: 'saw' }, { intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', style: 'COUNTER-PUNCHER', unlock: 0, beard: true, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.' }),
  R_('ika', 'IKA', 'LOG-BRIDGE ACROBAT', { size: 2.15, build: 'heroic', hair: 'long', sleeves: 'long', colors: { skin: '#e8d8f0', hair: '#f0f0f8' } }, { walk: 1.05, reach: 1.02, speed: 1.02 }, 'backRound', { level: 5, aggr: .5, pat: .3, jump: .25, block: .3, gap: 44, w: { backRound: 3, turnBackKick: 3, backKick: 2, jumpBack: 2, frontFlip: 2, backFlip: 2 } }, { f0: 200, fm: 1.1, rate: 14, wave: 'triangle' }, { intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', style: 'CROSS-UPS', unlock: 0, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.' }),
  R_('buta', 'CAPTAIN BUTA', "SHIP'S CAPTAIN", { size: 2.6, build: 'bulky', hair: 'bald', hat: 'cap', colors: { hair: '#4a3a2a' } }, { walk: .83, reach: 1.1, speed: .92 }, 'upLunge', { level: 6, aggr: .8, pat: .2, jump: .05, block: .2, gap: 60, w: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } }, { f0: 85, fm: .85, rate: 11, wave: 'saw' }, { intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', style: 'LUNGER', unlock: 0, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.' }),
  R_('asari', 'ASARI', 'NIGHT-MARKET KEEPER', { size: 2.1, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#2aa8a0' }, colors: { hair: '#1a1a24' } }, { walk: 1, reach: .96, speed: 1.04 }, 'squatPunch', { level: 7, aggr: .4, pat: .5, jump: .05, block: .5, gap: 34, crouch: .5, w: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } }, { f0: 170, fm: 1, rate: 15, wave: 'square' }, { intro: 'MY SHELL IS SHUT. GO HOME.', style: 'CROUCHER', unlock: 0, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.' }),
  R_('kyabetsu', 'MASTER KYABETSU', 'FUJI GARDEN MASTER', { size: 2.15, build: 'heroic', hair: 'bald', hunch: .2, colors: { hair: '#f0f0f0' } }, { walk: .95, reach: 1.02, speed: 1.03 }, 'turnBackKick', { level: 8, aggr: .4, pat: .7, jump: .1, block: .6, gap: 42, habit: true, readBonus: .05, w: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } }, { f0: 120, fm: .9, rate: 10, wave: 'saw' }, { intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', style: 'PATIENT', unlock: 'story8', beard: true, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.' }),
  R_('mei', 'MEI', 'THE IRON LADLE', { size: 2.15, build: 'heroic', hair: 'ponytail', colors: { hair: '#14101a' } }, { walk: 1.05, reach: 1, speed: 1.05 }, 'frontSweep', { level: 9, aggr: .65, pat: .4, jump: .2, block: .5, gap: 46, habit: true, w: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } }, { f0: 290, fm: 1.18, rate: 16, wave: 'pulse' }, { intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', style: 'READS HABITS', unlock: 'story', tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.' })
];
KC.FIGHTER = {}; KC.ROSTER.forEach(r => { KC.FIGHTER[r.id] = r; });
KC.ROSTER[0].ai = { level: 5, aggr: .55, pat: .35, jump: .15, block: .35, gap: 42, w: { roundKick: 2, frontKick: 2, upLunge: 1, backRound: 1, turnBackKick: 1, upperPunch: 1, frontSweep: 1, midLunge: 1 } };
KC.GI = { white: '#f2eee4', red: '#c8302a' };
// referee Genkotsu and the corner judges
KC.REF = { id: 'genkotsu', name: 'JUDGE GENKOTSU', voice: { f0: 105, fm: .9, rate: 11, wave: 'saw', rough: .18 } };

/* ---------- stages (data). The arena is always x 0..400; marks at 150 (white) and 250 (red) ---------- */
KC.ARENA = { x0: 0, x1: 400, marks: [150, 250] };
KC.STAGES = [
  { id: 'dojo', name: 'HON-DOJO', music: 'dojo', time: 'evening', ambient: .55, sky: { sky: ['#2a1a2e', '#6a3a3a', '#c8783a'], layers: [] }, wall: ['#3a2418', '#c89860', '#f0d8a0'], floor: ['#a8743c', '#8a5c30'], crowd: { n: 8, palette: ['#f2eee4'], seiza: true, noSil: true }, props: [['lantern', 40, 0, 52], ['lantern', 360, 0, 52], ['banner', 100, 20, 40], ['banner', 300, 20, 40], ['barrel', -20, 10, 0]], lightsList: [[40, 52, '#ffb060'], [360, 52, '#ffb060'], [200, 70, '#ffd8a0']], jp: '空手道' },
  { id: 'harbor', name: 'NAGASAKI PIER', music: 'harbor', time: 'dawn', ambient: .72, sky: { sky: ['#6a88c8', '#f0b890', '#ffe0a0'], sun: { x: .3, y: .62, r: 16, color: '#fff0c0' }, layers: [{ kind: 'sea', color: '#4a78a8', y: .62, height: .2, parallax: .02 }, { kind: 'mountains', color: '#6a7aa0', y: .58, height: .12, parallax: .04 }] }, floor: ['#8a7658', '#6a5a42'], crowd: { n: 14, palette: ['#4a5a7a', '#7a5a3a', '#3a6a5a'] }, props: [['crate', 20, 10, 0], ['barrel', 380, 10, 0], ['lamp', 60, 14, 0], ['sign', 340, 14, 0], ['crate', -30, 12, 0]], lightsList: [[60, 50, '#ffd890']], cart: true },
  { id: 'bamboo', name: 'BAMBOO FOREST', music: 'bamboo', time: 'midday', ambient: .62, sky: { sky: ['#4a7a5a', '#8ac090', '#d8f0c0'], layers: [{ kind: 'forest', color: '#2f6a44', y: .55, height: .3, parallax: .06 }, { kind: 'forest', color: '#245a38', y: .65, height: .26, parallax: .15 }] }, floor: ['#7a6a44', '#5a4a32'], crowd: { n: 0 }, props: [['bush', 20, 10, 0], ['rock', 380, 8, 0], ['flowers', 330, 6, 0], ['tree', -40, 18, 0], ['tree', 440, 18, 0]], lightsList: [[200, 90, '#e8ffc0']], weather: { kind: 'leaves', amount: .35, wind: .2 }, bamboo: true },
  { id: 'log', name: 'LOG BRIDGE', music: 'gorge', time: 'afternoon', ambient: .6, sky: { sky: ['#8aa0c0', '#c0cce0', '#f0e8d8'], layers: [{ kind: 'mountains', color: '#7a8aa8', y: .5, height: .32, parallax: .04 }, { kind: 'mountains', color: '#5a6a88', y: .62, height: .26, parallax: .1 }, { kind: 'fog', color: '#e0e8f0' }] }, floor: ['#6a4a30', '#4a3220'], crowd: { n: 0 }, props: [['pine', -30, 14, 0], ['pine', 430, 14, 0], ['fence', 120, 8, 0], ['fence', 280, 8, 0]], lightsList: [[200, 80, '#e8f0ff']], gorge: true },
  { id: 'ship', name: "SHIP'S STERN", music: 'ship', time: 'sunset', ambient: .55, sky: { sky: ['#5a3a6a', '#d8643a', '#ffc070'], sun: { x: .68, y: .6, r: 20, color: '#ffe8a0' }, layers: [{ kind: 'sea', color: '#7a4a6a', y: .6, height: .25, parallax: .02 }] }, floor: ['#7a5230', '#5a3a22'], crowd: { n: 12, palette: ['#2a3a6a', '#6a2a2a', '#3a5a4a'] }, props: [['barrel', 20, 10, 0], ['barrel', 380, 10, 0], ['lantern', 80, 0, 50], ['lantern', 320, 0, 50], ['crate', 220, 14, 0]], lightsList: [[80, 50, '#ff9a4a'], [320, 50, '#ff9a4a']], sway: true },
  { id: 'market', name: 'CHAMPON STREET', music: 'market', time: 'night', ambient: .36, sky: { preset: 'city-night' }, floor: ['#5a5868', '#403e50'], crowd: { n: 16, palette: ['#6a3a5a', '#3a4a7a', '#7a6a3a', '#4a6a4a'] }, props: [['lantern', 30, 0, 56], ['lantern', 110, 0, 56], ['lantern', 200, 0, 56], ['lantern', 290, 0, 56], ['lantern', 370, 0, 56], ['crate', -20, 12, 0], ['barrel', 420, 12, 0]], lightsList: [[30, 56, '#ff5a4a'], [110, 56, '#ff5a4a'], [200, 56, '#ff7a5a'], [290, 56, '#ff5a4a'], [370, 56, '#ff5a4a']], shop: true },
  { id: 'fuji', name: 'FUJI GARDEN', music: 'fuji', time: 'dusk', ambient: .6, sky: { sky: ['#6a5a9a', '#e090a8', '#ffd0b0'], layers: [{ kind: 'hills', color: '#8a7ab0', y: .6, height: .14, parallax: .03 }, { kind: 'forest', color: '#5a4a78', y: .68, height: .12, parallax: .12 }] }, floor: ['#b8a888', '#9a8a6c'], crowd: { n: 6, palette: ['#c86a8a', '#6a8ac8'] }, props: [['lantern', 40, 4, 40], ['lantern', 360, 4, 40], ['bush', 10, 10, 0], ['flowers', 390, 8, 0], ['tree', -30, 16, 0], ['tree', 430, 16, 0]], lightsList: [[40, 44, '#ffc890'], [360, 44, '#ffc890']], weather: { kind: 'leaves', amount: .3, wind: .1 }, fuji: true, torii: true },
  { id: 'stadium', name: 'NATIONAL STADIUM', music: 'stadium', time: 'indoor night', ambient: .45, sky: { sky: ['#0a0a1a', '#1a1a3a', '#2a2a5a'], layers: [] }, floor: ['#2f5fb0', '#274f98'], crowd: { n: 30, palette: ['#c84a4a', '#4a6ac8', '#e8c84a', '#6ac86a', '#c86ac8'] }, props: [['banner', 60, 20, 60], ['banner', 340, 20, 60], ['banner', 200, 20, 70]], lightsList: [[100, 90, '#fff0d0'], [200, 100, '#ffffff'], [300, 90, '#fff0d0']], stadium: true },
  { id: 'courtyard', name: 'DOJO COURTYARD', music: 'bonus', time: 'morning', ambient: .72, sky: { sky: ['#78a8d8', '#b8d8f0', '#f0f0e0'], layers: [{ kind: 'hills', color: '#8aaa80', y: .62, height: .1, parallax: .03 }] }, floor: ['#a89068', '#8a7452'], crowd: { n: 0 }, props: [['pine', -20, 14, 0], ['barrel', 430, 10, 0], ['fence', 40, 12, 0]], lightsList: [], bonus: true },
  { id: 'fishmarket', name: 'FISH-MARKET ALLEY', music: 'bonus', time: 'morning', ambient: .66, sky: { sky: ['#88a8c8', '#c8d8e0', '#f0e8d0'], layers: [{ kind: 'city', color: '#7a8aa0', y: .6, height: .2, parallax: .04 }] }, floor: ['#6a7078', '#505660'], crowd: { n: 0 }, props: [['crate', 20, 10, 0], ['crate', 380, 10, 0], ['sign', 330, 14, 0], ['barrel', 60, 12, 0]], lightsList: [], bonus: true },
  { id: 'pasture', name: 'FUJI PASTURE', music: 'bonus', time: 'noon', ambient: .75, sky: { sky: ['#78b0e8', '#b8dcf8', '#f0f8f0'], layers: [{ kind: 'clouds', color: '#ffffff', y: .2, height: .1, parallax: .02 }, { kind: 'hills', color: '#78a868', y: .62, height: .12, parallax: .05 }], fuji: true }, floor: ['#6a9a48', '#4a7a34'], crowd: { n: 0 }, props: [['fence', 30, 12, 0], ['fence', 90, 12, 0], ['fence', 310, 12, 0], ['fence', 370, 12, 0], ['bush', 440, 10, 0]], lightsList: [], bonus: true, fuji: true }
];
KC.STAGE = {}; KC.STAGES.forEach(s => { KC.STAGE[s.id] = s; });

/* ---------- the Champon Road: the story ladder ---------- */
KC.LADDER = [
  { kind: 'cutscene', id: 'prologue', stage: 'dojo', label: 'PROLOGUE' },
  { kind: 'practice', id: 'lessonI', lesson: 'I', stage: 'dojo', label: 'LESSON I' },
  { kind: 'match', id: 'm1', stage: 'dojo', opponent: 'kamaboko', promote: 1, hints: true, label: 'DOJO: KAMABOKO' },
  { kind: 'match', id: 'm2', stage: 'dojo', opponent: 'negi', promote: 2, hints: true, label: 'DOJO: SENPAI NEGI' },
  { kind: 'bonus', id: 'boards', bonus: 'boards', stage: 'courtyard', label: 'BREAK THE BOARDS' },
  { kind: 'cutscene', id: 'harborMei', stage: 'harbor', label: 'HARBOR' },
  { kind: 'match', id: 'm3', stage: 'harbor', opponent: 'ebi', promote: 3, hints: true, label: 'NAGASAKI PIER: EBI' },
  { kind: 'practice', id: 'lessonII', lesson: 'II', stage: 'harbor', label: 'LESSON II' },
  { kind: 'match', id: 'm4', stage: 'bamboo', opponent: 'kikurage', promote: 4, label: 'BAMBOO FOREST: KIKURAGE' },
  { kind: 'bonus', id: 'pots', bonus: 'pots', stage: 'fishmarket', label: 'POTS AHOY!' },
  { kind: 'match', id: 'm5', stage: 'log', opponent: 'ika', promote: 5, label: 'LOG BRIDGE: IKA' },
  { kind: 'practice', id: 'lessonIII', lesson: 'III', stage: 'log', label: 'LESSON III' },
  { kind: 'match', id: 'm6', stage: 'ship', opponent: 'buta', promote: 6, label: "SHIP'S STERN: CAPTAIN BUTA" },
  { kind: 'bonus', id: 'bull', bonus: 'bull', stage: 'pasture', label: 'STOP THE BULL' },
  { kind: 'match', id: 'm7', stage: 'market', opponent: 'asari', promote: 7, label: 'CHAMPON STREET: ASARI', after: 'marketMei' },
  { kind: 'match', id: 'm8', stage: 'fuji', opponent: 'kyabetsu', promote: 8, label: 'FUJI GARDEN: KYABETSU' },
  { kind: 'cutscene', id: 'finalEntrance', stage: 'stadium', label: 'THE FINAL' },
  { kind: 'match', id: 'm9', stage: 'stadium', opponent: 'mei', promote: 9, label: 'NATIONAL STADIUM: MEI' },
  { kind: 'ending', id: 'ending', stage: 'stadium', label: 'THE ENDING' }
];
KC.LESSONS = {
  I: { title: 'LESSON I', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'], intro: 'WATCH. THEN DO.', outro: 'YOU ARE READY. FIGHT KAMABOKO.' },
  II: { title: 'LESSON II', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'], intro: 'STEP IN. STRIKE THROUGH.', outro: 'GOOD LEGS. NOW THE FOREST.' },
  III: { title: 'LESSON III', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'], intro: 'TURN YOUR BACK. NEVER YOUR EYES.', outro: 'THE SHIP AWAITS.' },
  ALL: { title: 'ALL TECHNIQUES', drills: KC.TECH.map(t => t.id), intro: 'ALL OF THEM. ONE BY ONE.', outro: 'YOU KNOW THEM ALL.' }
};
KC.BONUS = {
  boards: { title: 'BREAK THE BOARDS', stage: 'courtyard', variants: [{ n: 3 }, { n: 5 }, { n: 7 }, { n: 10 }], mats: [['PINE', 1, '#c8a060'], ['ROOF TILE', 1.5, '#a85a3a'], ['ICE', 2, '#a8d8f0']] },
  pots: { title: 'POTS AHOY!', stage: 'fishmarket', count: 16 },
  bull: { title: 'STOP THE BULL', stage: 'pasture', charges: 3 }
};

/* ---------- text (terse, ALL CAPS) ---------- */
KC.CALLS = {
  begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'], half: ['HALF POINT!', 'WAZA-ARI!'], full: ['FULL POINT!', 'IPPON!'],
  nopoint: ['NO POINT!', 'TORIMASEN!'], aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'], judges: ['JUDGES!', 'HANTEI!'], whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'],
  redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'], decide: ['DECIDING ROUND!', 'SHOBU!'], forfeit: ['FORFEIT!', 'KIKEN!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!']
};
KC.HINTS = ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.', 'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM.", 'CROUCH UNDER HIGH KICKS.'];
KC.SCRIPTS = {
  prologue: [['card', 'NAGASAKI HARBOR. SPRING 1984.'], ['card', 'THE CHAMPON CUP RETURNS.'], ['card', 'THE PRIZE: THE GOLDEN BOWL.'], ['taro', 'I AM TARO MOYASHI. WHITE BELT.'], ['taro', 'I WILL BE CHAMP!'], ['negi', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['mei', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['taro', '...I AM A BEAN SPROUT.'], ['mei', 'EAT. THEN FIGHT.']],
  marketMei: [['mei', 'THE FINAL IS TOMORROW. DON\'T BE LATE.']],
  potsIntro: [['mei', "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"]],
  afterHarbor: [['mei', 'NOT BAD, MOYASHI.']],
  finalEntrance: [['genkotsu', 'THE FINAL. THE CHAMPION ENTERS.'], ['mei', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['taro', '...YOU?'], ['mei', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['genkotsu', 'WHITE WINS! A NEW CHAMP!'], ['mei', 'A BEAN SPROUT BECAME A CHAMP.'], ['mei', 'NEXT YEAR I TAKE IT BACK.'], ['taro', 'OSU!'], ['card', 'YOU ARE THE KARATE CHAMPON.']]
};
KC.WHO = { taro: 'TARO', mei: 'MEI', negi: 'NEGI', genkotsu: 'GENKOTSU' };
KC.scenes = {};
KC.ABOUT = {"sourceInformation":{"date":"2026-11-03 18:40:16","source":"Karate Champ (1984 arcade, Data East; known in Japan as Karate Do)","plan":"PLAN.md (written by claude-opus-5-5 at max effort)","genre":"1-on-1 tournament karate fighting (point sparring) with arcade bonus stages and a mimic-the-master drill","perspective":"2D side view on a single-screen arena (the engine's side view, a locked camera that follows the fighters)","tech":"my-3D2dge v0.85.2 handoff engine, modified (PlayStation glyph default, live pause for sessions); AI Hub session client 1.4.0 unmodified; Web Audio; game in plain JavaScript; tests on Node 24 with Playwright 1.63.0","artDirection":"the engine's native HD humanoid rigs drawn as PS1-era pixel art at 320x240 (expanded to any screen): white gi against red gi on eight painted Japanese stages, code-drawn props, lanterns, crowds and a bull","animation":"the engine's procedural Humanoid rig driven by karate move specs built on E.MOVES (kicks, punches, sweeps), spins by turning the rig, somersaults and rolls with flip, plus referee signals, flags and a hand-posed bull","audio":"music, sound effects and voices are all written in code: chip songs on the engine sequencer in Japanese pentatonic scales, noise and sine effects, and an Animalese-style gibberish voice synth (formant filters, per-line deterministic syllables) for the referee, fighters and kiai","online":"AI Hub session protocol v1, shared-world: Kachinuki (winner stays on) for 2-4 players with the game's own card; plus local versus for 2 players and local Kachinuki for 3-4","testing":"headless game.advance suites behind one command (data, input, technique, bout, ai, bonus, drill, a scripted full playthrough, versus, an in-process fake hub, attract, dev, ui, audio, smoke), plus Playwright page checks and the real AI Hub harness (2 players; 4 players with latency 150, jitter 50, loss 5; host leaves; server host)","research":"the plan's research on Karate Champ (Wikipedia, TASVideos, Shacknews, arcade-history) for scoring, ranks, bonus stages and the referee; no further research in the build","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingFeedback":["About 16 real issues were caught by scripts: a stuck slow-motion time scale after a full point, scene singletons keeping a 'finished' flag so every cutscene after the first never ended, a scene hook name (exit) clashing with the engine's, the round clock resetting after every exchange, the lesson II reverse punch drill being unreachable, CONTINUE replaying the same seeded match forever, a tuning override that also weakened the autopilot, AI personalities dominated by one lunge or jump kick, getters run by Object.assign, two file-order initialization errors, a mouse hover and touch-gate lifting that only worked from DOM events, and several test-only mistakes.","Five were game-breaking: the stuck time scale, the cutscene finished flag (a soft lock in the story), the exit hook that threw the player into the dojo menu, the unreachable reverse punch drill (the story could not be finished) and the endless same-seed CONTINUE retry.","The scripted full playthrough of all 19 ladder nodes with real menu inputs, the autopilot and the dev toggles: it found most of the soft locks above, and the same run then served as the continue, game over, initials and unlock check. The real AI Hub harness run was a close second because it proved the protocol end to end.","The matrix and technique-table checks: they read the same data the game does, so they mostly confirmed the data against itself. The screenshots were also slow for what they gave, apart from the first look at each screen."],"engineFeedback":["The rig. A fully dressed, shaded, animated fighter from one constructor call, with E.MOVES giving credible kicks and punches, flip for somersaults and rolls, and portraits for free. Fixed-step update plus game.advance made every test deterministic, and the headless tools were excellent.","Yes. Guessed wrong that a scene's exit() is just my own helper (it is the engine's leave hook), that Object.assign on a scene copies getters by calling them, that game.go() takes effect on the next step (and through a fade, so tests must wait), that hit-stop timers die with a scene change and leave game.timeScale altered, and that input.pointer() moves only from DOM events (feed() does not touch mouse.t).","The whole fighting rule set: a karate Bout with the referee's phase machine, half and full points, counters, aiuchi, the clock and hantei; the twin-stick control reader; the CPU with reaction delay and personalities; the three bonus games; the gibberish voice synth; the glyph icons; 10-foot menus and the attract director.","Knowing which engine pieces to avoid. E.Fighter and E.Match assume life bars, game.freeze stalls update (which would stall networking), and the 5x7 font has no cross, circle, square or triangle, so none of the stock fighting helpers fit. Also hand-balancing the AI so levels and personalities ordered sensibly.","Two small edits, listed in engine/CHANGES.md: the button symbols default to PlayStation (setting and Input.glyphs) because TASK.md asks for it, and game.live keeps the scene update running while the pause menu is open so a shared-world host never stalls its network traffic. Everything else (right stick as the technique stick through input.padAim, glyph icons, voices) was done game-side.","A 'next step' hook-free way to change scenes: let game.go take effect at once in headless runs (or expose a flush), and make scene objects instances instead of shared singletons so state left on the object cannot leak into the next visit."],"promptFeedback":["The plan was a complete, ordered build document: exact technique tables, scoring formulas, phase timings, message formats and a traceability table. Having the numbers decided made the combat code straightforward, and the hub protocol section meant the harness passed at the first run.","The plan and TASK.md disagree on small things (file names in the plan carry the planner's model and time, the plan asks for edits like EC1 and EC7 that the engine did not need), and the plan's scale (all 11 locations, a Technique Lab, a 2.5D camera, the bull as a custom creature, 4 online roles, all tests) is bigger than one medium-effort pass, so every item needed a decision on how much to cut.","Making the CPU and the balance work: the plan's targets (a level curve, win rates, every technique landing, no technique over 35 percent) conflict with a roster where a single lunge or jump kick scores a full point from long range, so the data and the AI both needed tuning passes.","Say which parts of a long plan are mandatory and which are stretch, tell the builder that a plan's tables may be tuned for balance when a test says so, and give a total size budget. A line on the expected size of the final single file would also help."],"aiHub":{"name":"Karate Champon","tagline":"Two sticks. One clean strike.","description":"A point-sparring karate tournament inspired by Karate Champ: land one clean technique and let the referee call it. Climb from white belt to Champ, break boards, smash flying pots and stop a charging bull, then play winner-stays-on Kachinuki with friends.","type":"Game","genre":"Fighting","source":"Karate Champ (1984)","series":"","players":"1–4","controls":"Left stick/WASD: move, jump, crouch · Right stick, face buttons or IJKL: techniques · Options/Esc: pause","tags":["2d","arcade","versus","retro","pixel art","comedy"]}};
KC.about = () => KC.ABOUT;
KC.menuOpen = () => { const g = KC.game; return !!(g && (g.paused || (g.shell && g.shell.screen))); };
/* ---------- data validation (boot in dev, and the tests) ---------- */
KC.validateData = () => {
  const errs = [], bad = m => errs.push(m);
  KC.TECH.forEach(t => { if (!t.id || !t.name || !t.f || t.f.length !== 3) bad('technique shape ' + t.id); if (!t.util && !t.pts[1]) bad('points ' + t.id); if (!t.util && !t.move) bad('move ' + t.id); });
  for (const p of ['n', 't', 'a', 'u', 'd']) for (const s of ['u', 't', 'd', 'a']) if (!KC.MATRIX[p + s]) bad('matrix cell ' + p + s);
  KC.ROSTER.forEach(f => { if (!f.rig || !f.voice || !f.stats) bad('fighter ' + f.id); if (f.sig && !KC.TECHS[f.sig]) bad('signature ' + f.id); if (f.ai) for (const k in f.ai.w) if (!KC.TECHS[k]) bad('ai weight ' + f.id + ' ' + k); });
  KC.LADDER.forEach(n => { if (!KC.STAGE[n.stage]) bad('ladder stage ' + n.id); if (n.opponent && !KC.FIGHTER[n.opponent]) bad('ladder opponent ' + n.id); if (n.lesson && !KC.LESSONS[n.lesson]) bad('ladder lesson ' + n.id); if (n.bonus && !KC.BONUS[n.bonus]) bad('ladder bonus ' + n.id); if (n.kind === 'cutscene' && !KC.SCRIPTS[n.id]) bad('script ' + n.id); });
  for (const l in KC.LESSONS) KC.LESSONS[l].drills.forEach(d => { if (!KC.TECHS[d]) bad('drill ' + d); });
  KC.STAGES.forEach(s => { if (!KC.SONGS[s.music] && s.music !== 'bonus') bad('music ' + s.id); });
  return errs;
};
KC.autopilot = 0;   // a level (1-10) makes the player's slot play itself (tests, the attract mode's helpers); 0 = a human
// storage with an in-memory fallback (blocked storage, headless tests, AI Hub sessions' memory storage)
KC.store = { m: {}, get(k, d) { const v = E.store.get(k, undefined); return v !== undefined && v !== null ? v : (this.m[k] !== undefined ? JSON.parse(this.m[k]) : d); }, set(k, v) { this.m[k] = JSON.stringify(v); try { E.store.set(k, v); } catch (e) { /* blocked */ } } };

/* ---- 10-input.js ---- */
/* ---------- input: two sticks, no buttons ---------- */
// Posture = left stick / WASD. Technique = right stick, face buttons or IJKL. Menus: confirm / cancel.
const PAD_T = { tUp: 'Pad3', tDown: 'Pad0', tLeft: 'Pad2', tRight: 'Pad1' };
const KC_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], dummy: ['Tab', 'Pad8'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], devKey: ['F2', 'Backquote'], l3: ['Pad10'], r3: ['Pad11'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
// local 2 players on one keyboard: P1 WASD + T F G H, P2 arrows + I J K L (and the numpad)
const KC_P1 = Object.assign({}, KC_KEYS, { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'], tUp: ['KeyT', 'Pad3'], tDown: ['KeyG', 'Pad0'], tLeft: ['KeyF', 'Pad2'], tRight: ['KeyH', 'Pad1'] });
const KC_P2 = Object.assign({}, KC_KEYS, { up: ['ArrowUp', 'Pad12'], down: ['ArrowDown', 'Pad13'], left: ['ArrowLeft', 'Pad14'], right: ['ArrowRight', 'Pad15'], tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad5', 'Numpad2', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], pause: ['Pad9'], start: ['Pad9', 'NumpadEnter'] });
KC.KEYS = KC_KEYS;

/** Reader: turns one E.Input into a control intent per step: { posture: n|u|d|l|r, tech: null|u|d|l|r (a press edge) } in SCREEN directions */
class Reader {
  constructor(input) { this.input = input; this.rs = null; this.last = { posture: 'n', tech: null, held: null }; this.recent = []; this.hist = []; }
  read() {
    const I = this.input, d = n => I.down(n);
    // posture: vertical beats horizontal (W+D = up)
    const posture = d('up') ? 'u' : d('down') ? 'd' : d('left') ? 'l' : d('right') ? 'r' : 'n';
    // technique: face buttons / keys press edges; the right stick is a 4-way gate with hysteresis
    const edges = [];
    if (I.pressed('tUp')) edges.push('u'); if (I.pressed('tDown')) edges.push('d'); if (I.pressed('tLeft')) edges.push('l'); if (I.pressed('tRight')) edges.push('r');
    const a = I.padAim;
    if (a) {
      const m = Math.hypot(a[0], a[1]), dir = Math.abs(a[0]) > Math.abs(a[1]) ? (a[0] > 0 ? 'r' : 'l') : (a[1] > 0 ? 'd' : 'u');
      if (this.rs && m > .35 && dir === this.rs) { /* held */ } else if (m > .5) { if (dir !== this.rs) edges.push(dir); this.rs = dir; } else if (m < .35) this.rs = null;
    } else this.rs = null;
    // most recent press wins; truly simultaneous: up > down > horizontal
    const order = { u: 0, d: 1, l: 2, r: 2 };
    edges.sort((x, y) => order[x] - order[y]);
    const tech = edges.length ? edges[0] : null;
    const held = I.down('tUp') ? 'u' : I.down('tDown') ? 'd' : I.down('tLeft') ? 'l' : I.down('tRight') ? 'r' : this.rs;
    this.last = { posture, tech, held };
    if (tech) { this.hist.push({ p: posture, t: tech, at: I.clock || 0 }); if (this.hist.length > 12) this.hist.shift(); }
    return this.last;
  }
}
KC.Reader = Reader;

// device family for prompts: 'key' | 'mouse' | 'ps' | 'xbox'
KC.family = (I = KC.game.input) => {
  const dev = I.lastDevice;
  if (dev === 'gamepad') return I.padStyle() === 'playstation' ? 'ps' : 'xbox';
  return dev === 'mouse' ? 'mouse' : 'key';
};
KC.padKeys = { confirm: 0, cancel: 1, tUp: 3, tDown: 0, tLeft: 2, tRight: 1 };

/* ---------- glyph icons (the 5x7 font has no ✕ ○ □ △, so the badges are drawn) ---------- */
const GL = {
  ps: { '✕': '#7aa7ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ad8a0' },
  xbox: { A: '#5ad85a', B: '#ff5a5a', X: '#5a8aff', Y: '#ffd24a' }
};
const PS2X = { '✕': 'A', '○': 'B', '□': 'X', '△': 'Y' };
function drawBadge(g, ch, x, y, s, col) {
  const r = Math.round(s / 2);
  px.disc(g, x + r, y + r, r, '#10101c'); px.disc(g, x + r, y + r, r - 1, '#262638');
  const cx = x + r, cy = y + r, q = Math.max(2, Math.round(s * .26));
  if (ch === '✕') { px.line(g, cx - q, cy - q, cx + q, cy + q, col, 1); px.line(g, cx - q, cy + q, cx + q, cy - q, col, 1); }
  else if (ch === '○') { for (let a = 0; a < 16; a++) { const t = a / 16 * TAU; px.dot(g, Math.round(cx + Math.cos(t) * q * 1.15), Math.round(cy + Math.sin(t) * q * 1.15), col); } }
  else if (ch === '□') { px.line(g, cx - q, cy - q, cx + q, cy - q, col, 1); px.line(g, cx - q, cy + q, cx + q, cy + q, col, 1); px.line(g, cx - q, cy - q, cx - q, cy + q, col, 1); px.line(g, cx + q, cy - q, cx + q, cy + q, col, 1); }
  else if (ch === '△') { px.line(g, cx, cy - q - 1, cx - q - 1, cy + q, col, 1); px.line(g, cx, cy - q - 1, cx + q + 1, cy + q, col, 1); px.line(g, cx - q - 1, cy + q, cx + q + 1, cy + q, col, 1); }
  else E.font.text(g, ch, cx, cy - 3, col, { align: 'center', outline: false });
  return s;
}
function drawKey(g, label, x, y, h = 11) {
  const w = Math.max(h, E.font.width(label) + 6);
  px.rect(g, x, y + 1, w, h, '#05040a'); px.rect(g, x, y, w, h, '#d8d4e4'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#f4f2fa'); px.rect(g, x, y + h - 2, w, 2, '#9a96b0');
  E.font.text(g, label, x + w / 2, y + 2, '#1a1626', { align: 'center', outline: false });
  return w;
}
function drawStick(g, side, dir, x, y, s = 13) {
  const r = Math.round(s / 2), cx = x + r, cy = y + r;
  px.disc(g, cx, cy, r, '#10101c'); px.disc(g, cx, cy, r - 1, '#3a3a52');
  px.disc(g, cx + (dir === 'l' ? -2 : dir === 'r' ? 2 : 0), cy + (dir === 'u' ? -2 : dir === 'd' ? 2 : 0), r - 3, side === 'L' ? '#7aa7ff' : '#ff9a6a');
  E.font.text(g, side, cx, cy - 3, '#10101c', { align: 'center', outline: false });
  const ax = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir];
  if (ax) { const ex = cx + ax[0] * (r + 3), ey = cy + ax[1] * (r + 3); px.line(g, cx + ax[0] * (r - 1), cy + ax[1] * (r - 1), ex, ey, '#ffd060', 1); px.dot(g, ex, ey, '#ffd060'); }
  return s + 4;
}
function drawMouse(g, btn, x, y) {
  px.rect(g, x, y, 10, 14, '#10101c'); px.rect(g, x + 1, y + 1, 8, 12, '#d8d4e4');
  px.rect(g, btn === 'R' ? x + 5 : x + 1, y + 1, 4, 5, '#ff9a4a'); px.rect(g, x + 5, y + 1, 1, 6, '#10101c');
  return 12;
}
/** one icon for an action on the device in use. Returns its width. */
KC.glyphAction = (g, act, x, y, size = 13, measure = false) => {
  const I = KC.game.input, fam = KC.family(I);
  if (measure) { if (fam === 'ps' || fam === 'xbox') return act === 'start' || act === 'pause' ? E.font.width('OPT') + 8 : size + 2; if (fam === 'mouse' && (act === 'confirm' || act === 'cancel')) return 12; const lab0 = { confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', alt: 'T' }[act] || I.label(act) || '?'; return Math.max(size - 2, E.font.width(lab0) + 6) + 2; }
  if (fam === 'ps' || fam === 'xbox') {
    const psCh = { confirm: '✕', cancel: '○', tUp: '△', tDown: '✕', tLeft: '□', tRight: '○', start: 'OPT', pause: 'OPT', alt: '△' }[act] || '✕';
    if (psCh === 'OPT') { const w = E.font.width('OPT') + 6; px.rect(g, x, y + 2, w, size - 3, '#10101c'); E.font.text(g, 'OPT', x + w / 2, y + 4, '#d8d4e4', { align: 'center', outline: false }); return w + 2; }
    if (fam === 'ps') drawBadge(g, psCh, x, y, size, GL.ps[psCh]); else { const xb = PS2X[psCh]; drawBadge(g, xb, x, y, size, GL.xbox[xb]); }
    return size + 2;
  }
  if (fam === 'mouse' && (act === 'confirm')) return drawMouse(g, 'L', x, y);
  if (fam === 'mouse' && act === 'cancel') return drawMouse(g, 'R', x, y);
  const lab = { confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', alt: 'T' }[act] || I.label(act) || '?';
  return drawKey(g, lab, x, y, size - 2) + 2;
};
/** a stick pair for a technique: [posture icon] + [strike icon] */
KC.glyphTech = (g, tech, x, y, opt = {}) => {
  const fam = KC.family(), t = KC.TECHS[tech]; if (!t) return 0;
  const posture = t.input[0], strike = t.input[1], toward = opt.right !== false ? 1 : -1;
  const toScreen = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
  const pd = posture === 'n' ? null : toScreen(posture), sd = toScreen(strike);
  let w = 0;
  if (fam === 'ps' || fam === 'xbox') {
    w += drawStick(g, 'L', pd, x, y); E.font.text(g, '+', x + w - 2, y + 3, '#e8e0ff', { outline: false }); w += 6;
    w += drawStick(g, 'R', sd, x + w, y);
  } else {
    const kl = { u: 'W', d: 'S', l: 'A', r: 'D' }, kr = { u: 'I', d: 'K', l: 'J', r: 'L' };
    if (pd) { w += drawKey(g, kl[pd], x, y) + 1; E.font.text(g, '+', x + w, y + 2, '#e8e0ff', { outline: false }); w += 7; }
    w += drawKey(g, kr[sd], x + w, y) + 1;
  }
  return w;
};
KC.promptText = (tech) => {
  const t = KC.TECHS[tech]; if (!t) return ''; const fam = KC.family();
  if (fam === 'ps' || fam === 'xbox') { const P = { n: '', t: 'TOWARD', a: 'AWAY', u: 'UP', d: 'DOWN' }, S = { u: 'UP', t: 'TOWARD', d: 'DOWN', a: 'AWAY' }; return (t.input[0] === 'n' ? '' : 'L ' + P[t.input[0]] + ' + ') + 'R ' + S[t.input[1]]; }
  const kl = { u: 'W', d: 'S', t: 'D', a: 'A' }, kr = { u: 'I', d: 'K', t: 'L', a: 'J' };
  return (t.input[0] === 'n' ? '' : kl[t.input[0]] + ' + ') + kr[t.input[1]];
};
/** the prompt bar: [icon] LABEL ... right-aligned pairs at the bottom */
KC.promptBar = (r, items, y) => r.overlay(g => {
  const yy = y === undefined ? r.H - 16 : y; let w = 0;
  const parts = items.map(([act, label]) => ({ act, label, w: KC.glyphAction(null, act, 0, 0, 13, true) + 2 + E.font.width(label) + 10 })); w = parts.reduce((s, p) => s + p.w, 0);
  let x = Math.round((r.W - w) / 2);
  px.blend(g, .55, 'normal', () => px.rect(g, x - 8, yy - 2, w + 14, 16, '#07060d'));
  for (const p of parts) { const iw = KC.glyphAction(g, p.act, x, yy - 1, 13); E.font.text(g, p.label, x + iw + 1, yy + 2, '#e8e0ff', { outline: false, shadow: '#000' }); x += p.w; }
});
KC.touchOnly = () => KC._touchOnly === true;

/* ---- 20-audio.js ---- */
/* ---------- audio: everything is written in code. Chip music + sfx via game.audio, voices via our own Animalese synth ---------- */
KC.sfx = (n, o) => { try { if (KC.game && KC.game.audio) KC.game.audio.sfx(n, o); } catch (e) { /* audio is optional */ } };
const SFXDEFS = {
  whooshL: [{ wave: 'noise', freq: 1800, to: 700, dur: .14, vol: .22, filter: 'bandpass', q: .8 }],
  whooshH: [{ wave: 'noise', freq: 2400, to: 500, dur: .2, vol: .3, filter: 'bandpass', q: .7 }],
  thwackHalf: [{ wave: 'noise', freq: 2600, to: 900, dur: .09, vol: .4, q: 1.4 }, { wave: 'sine', freq: 150, to: 70, dur: .12, vol: .4 }],
  thwackFull: [{ wave: 'noise', freq: 3200, to: 800, dur: .16, vol: .55, q: 1.2 }, { wave: 'sine', freq: 120, to: 45, dur: .26, vol: .6 }, { wave: 'square', freq: 220, to: 80, dur: .1, vol: .2 }],
  clack: [{ wave: 'square', freq: 1400, to: 900, dur: .04, vol: .3 }, { wave: 'noise', freq: 3000, dur: .03, vol: .3 }],
  thudFall: [{ wave: 'sine', freq: 90, to: 40, dur: .3, vol: .6 }, { wave: 'noise', freq: 500, to: 150, dur: .25, vol: .3, filter: 'lowpass' }],
  land: [{ wave: 'noise', freq: 400, to: 150, dur: .08, vol: .25, filter: 'lowpass' }],
  stepBare: [{ wave: 'noise', freq: 900, dur: .03, vol: .1, q: 2 }],
  pivot: [{ wave: 'noise', freq: 1200, to: 600, dur: .06, vol: .12 }],
  flagSnap: [{ wave: 'noise', freq: 2200, to: 1200, dur: .07, vol: .3 }],
  whistle: [{ wave: 'sine', freq: 2500, dur: .5, vol: .25, vib: [28, .03], hold: true }],
  gong: [{ wave: 'sine', freq: 130, to: 120, dur: 1.4, vol: .5 }, { wave: 'sine', freq: 262, dur: 1.2, vol: .25 }, { wave: 'noise', freq: 900, dur: .2, vol: .1 }],
  taikoHit: [{ wave: 'sine', freq: 110, to: 55, dur: .25, vol: .7 }, { wave: 'noise', freq: 300, to: 100, dur: .1, vol: .3, filter: 'lowpass' }],
  crowdOoh: [{ wave: 'noise', freq: 700, to: 500, dur: .6, vol: .12, q: .6 }],
  crowdCheer: [{ wave: 'noise', freq: 1200, to: 1800, dur: .9, vol: .16, q: .5 }, { wave: 'noise', freq: 600, dur: .9, vol: .1, q: .5 }],
  crowdBoo: [{ wave: 'noise', freq: 400, to: 250, dur: .8, vol: .14, q: .5 }],
  boardCrack: [{ wave: 'noise', freq: 2400, to: 500, dur: .15, vol: .6, q: 1.6 }, { wave: 'square', freq: 300, to: 90, dur: .08, vol: .3 }],
  potShatter: [{ wave: 'noise', freq: 3500, to: 1500, dur: .25, vol: .45, q: 1.6 }, { wave: 'square', freq: 1800, to: 500, dur: .1, vol: .15 }],
  bowlDing: [{ wave: 'sine', freq: 1760, dur: .5, vol: .3 }, { wave: 'sine', freq: 2637, dur: .4, vol: .15 }],
  bowlSplash: [{ wave: 'noise', freq: 1200, to: 400, dur: .3, vol: .3, q: .6 }],
  bullSnort: [{ wave: 'noise', freq: 500, to: 300, dur: .25, vol: .35, q: .8 }],
  bullStomp: [{ wave: 'sine', freq: 80, to: 40, dur: .12, vol: .6 }],
  bullBellow: [{ wave: 'saw', freq: 90, to: 60, dur: .7, vol: .3, vib: [6, .04] }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .8 }, { wave: 'noise', freq: 600, to: 150, dur: .2, vol: .4, filter: 'lowpass' }],
  dizzy: [{ wave: 'triangle', freq: 600, to: 900, dur: .5, vol: .2, vib: [9, .08] }],
  gull: [{ wave: 'saw', freq: 900, to: 1400, dur: .25, vol: .05, vib: [14, .1] }],
  waves: [{ wave: 'noise', freq: 500, to: 300, dur: 1.5, vol: .04, q: .4 }],
  creak: [{ wave: 'saw', freq: 140, to: 100, dur: .5, vol: .05, vib: [20, .05] }],
  steamHiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .05, filter: 'highpass' }],
  cameraFlash: [{ wave: 'square', freq: 3000, to: 1000, dur: .04, vol: .1 }],
  beltTie: [{ wave: 'noise', freq: 1500, to: 600, dur: .25, vol: .25 }, { wave: 'triangle', freq: 660, to: 880, dur: .2, vol: .2, delay: .15 }],
  scoreTick: [{ wave: 'square', freq: 1500, dur: .02, vol: .08 }],
  menuMove: [{ wave: 'square', freq: 880, to: 1040, dur: .04, vol: .1 }],
  menuOk: [{ wave: 'square', freq: 660, dur: .05, vol: .13 }, { wave: 'square', freq: 990, dur: .08, vol: .13, delay: .05 }],
  menuBack: [{ wave: 'square', freq: 520, to: 330, dur: .09, vol: .12 }],
  countBeep: [{ wave: 'square', freq: 1000, dur: .1, vol: .2 }],
  good: [{ wave: 'pulse', freq: 880, dur: .08, vol: .2 }, { wave: 'pulse', freq: 1320, dur: .12, vol: .2, delay: .08 }],
  bad: [{ wave: 'square', freq: 200, to: 120, dur: .2, vol: .2 }]
};
KC.defineAudio = a => { for (const k in SFXDEFS) a.define(k, SFXDEFS[k]); for (const k in SONGS) { /* songs are passed by object */ } };
/* ---- music: Japanese pentatonic colour. in scale: D Eb G A Bb; yo scale: D E G A B ---- */
const rep = (s, n) => Array(n).fill(s).join(' ');
const SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D5 . D5 E5 G5 . A5 . | B5 A5 G5 . E5 . D5 . | D5 . D5 E5 G5 . A5 B5 | D6 B5 A5 G5 A5 . . . | G5 . G5 A5 B5 . D6 . | B5 A5 G5 E5 G5 . A5 . | D5 E5 G5 A5 B5 A5 G5 E5 | D5 . . . D5 . . .' },
    { wave: 'triangle', vol: .3, notes: 'D3 . D3 . A2 . A2 . | G2 . G2 . A2 . A2 . | D3 . D3 . A2 . A2 . | G2 . A2 . D3 . D3 .' },
    { wave: 'drums', vol: .12, notes: 't . h . s . h t | t . h . s . h h | t . h . s . h t | t t h . s . s s' }] },
  dojo: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'D5 . . . Eb5 . . . | G5 . . . A5 . . . | Bb5 . A5 . G5 . . . | Eb5 . D5 . . . . . | A4 . . . Bb4 . . . | D5 . . . Eb5 . G5 . | A5 . G5 . Eb5 . . . | D5 . . . . . . .' },
    { wave: 'triangle', vol: .22, notes: 'D3 . . . . . D3 . | G2 . . . . . G2 . | A2 . . . . . A2 . | D3 . . . . . . .' },
    { wave: 'drums', vol: .1, notes: 'k . . . . . t . | . . . . k . . . | t . . . . . t . | . . k . . . . .' }] },
  harbor: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G5 . A5 B5 D6 . B5 . | A5 . G5 . E5 . G5 . | A5 B5 D6 . B5 A5 G5 . | E5 . G5 A5 G5 . . . | D6 . D6 B5 A5 . G5 . | E5 G5 A5 . B5 . A5 . | G5 A5 B5 D6 B5 A5 G5 E5 | D5 . G5 . A5 . . .' },
    { wave: 'triangle', vol: .28, notes: 'G2 . G3 . D3 . G3 . | E3 . E2 . B2 . E3 . | A2 . A3 . E3 . A3 . | D3 . D2 . A2 . D3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k . h k s . s s' }] },
  bamboo: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, vib: [5, .01], notes: 'D5 . . . . . A4 . | . . G4 . . . . . | E5 . . . D5 . . . | B4 . . . A4 . . . | D5 . . . G5 . . . | A5 . . . . . E5 . | D5 . . . B4 . A4 . | G4 . . . . . . .' },
    { wave: 'sine', vol: .18, notes: 'D3 . . . . . . . | G2 . . . . . . . | A2 . . . . . . . | D3 . . . . . . .' },
    { wave: 'drums', vol: .06, notes: 'h . h . h . h . | h . h . h . h h' }] },
  gorge: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'D3 D3 . D3 Eb3 . D3 . | D3 D3 . D3 G3 . Eb3 . | D3 D3 . D3 Eb3 . D3 . | A3 . G3 . Eb3 . D3 .' },
    { wave: 'square', vol: .09, notes: 'D5 . . . . . Eb5 . | . . . . G5 . . . | A5 . . . Bb5 . A5 . | G5 . Eb5 . D5 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . t . k . t t | k . t . k k t t' }] },
  ship: { bpm: 110, steps: 3, tracks: [
    { wave: 'pulse', vol: .11, notes: 'G5 . A5 B5 . A5 | G5 . E5 D5 . . | E5 . G5 A5 . G5 | E5 . D5 D5 . . | G5 . A5 B5 D6 B5 | A5 . G5 E5 . . | D5 E5 G5 A5 G5 E5 | D5 . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . . D3 . . | G2 . . D3 . . | E2 . . B2 . . | D3 . . A2 . .' },
    { wave: 'drums', vol: .08, notes: 'k . . h . h | k . . h . h' }] },
  market: { bpm: 124, steps: 4, tracks: [
    { wave: 'sine', vol: .2, vib: [6, .015], notes: 'A5 . B5 . D6 . B5 A5 | G5 . A5 . E5 . . . | A5 . B5 . D6 . E6 D6 | B5 . A5 . G5 . . . | E6 . D6 . B5 . A5 . | G5 . E5 . D5 . . . | A5 B5 D6 E6 D6 B5 A5 G5 | A5 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . A2 . E3 . A2 . | G2 . G2 . D3 . G2 . | A2 . A2 . E3 . A2 . | D3 . E3 . A2 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h h t . h h | k . h h t . h t | k . h h t . h h | k h h h t t t h' }] },
  fuji: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'D4 A4 D5 A4 D4 A4 D5 A4 | E4 B4 E5 B4 E4 B4 E5 B4 | G4 D5 G5 D5 G4 D5 G5 D5 | A4 E5 A5 E5 A4 E5 A5 E5' },
    { wave: 'triangle', vol: .2, notes: 'D5 - - - - - E5 - | G5 - - - - - A5 - | B5 - - - A5 - - - | D6 - - - - - - -' },
    { wave: 'drums', vol: .06, notes: 't . . . h . . . | k . . . h . . .' }] },
  stadium: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D5 . D5 D5 G5 . A5 . | B5 . A5 G5 A5 . . . | D5 . D5 D5 G5 . A5 . | D6 . B5 A5 G5 . . . | E5 . E5 E5 A5 . B5 . | D6 . B5 A5 B5 . . . | G5 A5 B5 D6 E6 D6 B5 A5 | D6 . . . . . . .' },
    { wave: 'pulse', vol: .08, notes: 'D4 . A4 . D5 . A4 . | G4 . D5 . G5 . D5 . | E4 . B4 . E5 . B4 . | A4 . E5 . A5 . E5 .' },
    { wave: 'triangle', vol: .3, notes: 'D2 D2 D3 D2 D2 D2 D3 D2 | G2 G2 G3 G2 G2 G2 G3 G2 | E2 E2 E3 E2 E2 E2 E3 E2 | A2 A2 A3 A2 A2 A2 A3 A2' },
    { wave: 'drums', vol: .14, notes: 'k . h k s . h k | k . h k s . h k | k . h k s . h k | k k s s k k s s' }] },
  bonus: { bpm: 160, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . G5 . D5 . G5 . | A5 . G5 . E5 . . . | D5 . G5 . D5 . A5 . | B5 A5 G5 E5 D5 . . . | E5 . A5 . E5 . A5 . | B5 . A5 . G5 . . . | G5 A5 B5 . A5 G5 E5 . | D5 . . . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E3 . B2 . E3 . B2 . | A2 . E3 . A2 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h . s . h h' }] },
  practice: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: .07, notes: 'D5 . . . G5 . . . | A5 . . . G5 . . . | E5 . . . D5 . . . | B4 . . . D5 . . .' },
    { wave: 'triangle', vol: .18, notes: 'D3 . . . . . A2 . | G2 . . . . . D3 . | E3 . . . . . B2 . | A2 . . . . . . .' }] },
  select: { bpm: 128, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . E5 G5 A5 . G5 . | E5 . D5 . B4 . . . | D5 . E5 G5 A5 . B5 . | A5 . G5 . E5 . . . ' },
    { wave: 'triangle', vol: .26, notes: 'D3 . D3 . A2 . A2 . | G2 . G2 . A2 . A2 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  session: { bpm: 110, steps: 4, tracks: [
    { wave: 'pulse12', vol: .09, notes: 'D5 . . G5 . . A5 . | B5 . A5 . G5 . . . | E5 . . A5 . . B5 . | D6 . B5 . A5 . . .' },
    { wave: 'triangle', vol: .24, notes: 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | A2 . . . E3 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . . . t . . h | k . . . t . h h' }] },
  continue: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'D4 . . . D4 . . . | Eb4 . . . D4 . . .' }, { wave: 'drums', vol: .12, notes: 'k . . . k . . . | k . . . k . k k' }] },
  gameover: { bpm: 80, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .25, notes: 'A4 - - - G4 - - - | Eb4 - - - D4 - - - - - - -' }] },
  ending: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'D5 . D5 E5 G5 . A5 . | B5 A5 G5 . E5 . D5 . | G5 . G5 A5 B5 . D6 . | B5 A5 G5 E5 D5 . . .' },
    { wave: 'square', vol: .07, notes: 'D4 . A4 . D5 . A4 . | G4 . D5 . G5 . D5 . | E4 . B4 . E5 . B4 . | D4 . A4 . D5 . . .' },
    { wave: 'triangle', vol: .2, notes: 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | D3 . . . . . . .' }] }
};
const STINGS = {
  promotion: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .15, notes: 'D5 . G5 . A5 . D6 - - - B5 . D6 - - -' }, { wave: 'triangle', vol: .25, notes: 'D3 . G3 . A3 . D4 - - - G3 . D4 - - -' }] },
  victory: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .14, notes: 'G5 . G5 G5 B5 - D6 - - - -' }, { wave: 'triangle', vol: .24, notes: 'G3 . G3 G3 B3 - D4 - - - -' }] },
  defeat: { bpm: 80, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .24, notes: 'A4 - - - Eb4 - - - D4 - - -' }] },
  perfect: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .13, notes: 'D6 B5 D6 E6 G6 - - -' }, { wave: 'triangle', vol: .2, notes: 'D4 G4 B4 D5 G5 - - -' }] }
};
KC.SONGS = SONGS; KC.STINGS = STINGS;
KC.music = (id, o) => { try { const a = KC.game.audio; if (!id) { a.music(null); return; } a.music(SONGS[id] || id, o); } catch (e) { /* ok */ } };
KC.sting = id => { try { KC.game.audio.sting(STINGS[id], { at: 'now' }); } catch (e) { /* ok */ } };

/* ---- the voice: Animalese / Simlish-style gibberish. Deterministic per line; speak() returns the line's duration in seconds ---- */
const VOWELS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS_CLASS = c => 'pbtdkgq'.includes(c) ? 'plosive' : 'fszhxcjv'.includes(c) ? 'fric' : 'mnlrwy'.includes(c) ? 'nasal' : 'none';
KC.Voice = {
  volume: .8,
  /** the syllable plan for a line: [{ v: vowel, c: class, stress, t (s), dur }] */
  plan(text, prof, o = {}) {
    const s = String(text).toLowerCase(), words = s.split(/[^a-z!?]+/).filter(Boolean), rate = (o.rate || prof.rate || 14), sy = [];
    const h = hash32(s + (prof.f0 || 0));
    let k = 0;
    for (const w of words) {
      const letters = w.replace(/[!?]/g, ''); let cons = '';
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i];
        if ('aeiou'.includes(ch)) { sy.push({ v: ch, c: CONS_CLASS(cons[cons.length - 1] || ' '), stress: false }); cons = ''; k++; }
        else cons += ch;
      }
      if (cons && sy.length === 0) sy.push({ v: 'a', c: CONS_CLASS(cons[0]), stress: false });
      if (w.length > 5 && sy.length) sy.push({ v: 'aeiou'[(h >> sy.length) % 5], c: CONS_CLASS(letters[letters.length - 1]), stress: false });
    }
    if (!sy.length) sy.push({ v: 'a', c: 'none', stress: false });
    const stressEvery = 3; sy.forEach((x, i) => { x.stress = i % stressEvery === 0; });
    // fixed shapes for referee calls
    if (o.syllables) { while (sy.length > o.syllables) sy.pop(); while (sy.length < o.syllables) sy.push({ v: 'o', c: 'nasal', stress: false }); sy.forEach((x, i) => { x.stress = i === (o.stress || 0); }); }
    const dur = 1 / rate; let t = 0; sy.forEach(x => { x.t = t; x.dur = dur * (x.stress ? 1.25 : 1); t += x.dur; });
    const end = /!/.test(text) ? 'bang' : /\?/.test(text) ? 'ask' : /\.\.\./.test(text) ? 'slow' : 'flat';
    return { sy, dur: t + .05, end };
  },
  speak(text, prof, o = {}) {
    const pl = this.plan(text, prof, o); const A = KC.game && KC.game.audio;
    if (!A || !A._init || !A._init() || A.muted || !A.ctx || A.ctx.state !== 'running') return pl.dur;
    try { this.play(pl, prof, o); } catch (e) { /* no voice */ }
    return pl.dur;
  },
  bus() {
    const A = KC.game.audio; if (this._bus && this._bus.ctx === A.ctx) return this._bus.g;
    const g = A.ctx.createGain(); g.connect(A._master); this._bus = { ctx: A.ctx, g }; return g;
  },
  play(pl, prof, o) {
    const A = KC.game.audio, c = A.ctx, t0 = c.currentTime + .02, bus = this.bus(), vol = (o.vol === undefined ? 1 : o.vol) * (KC.game.settings.voices === undefined ? .8 : KC.game.settings.voices) * .5;
    bus.gain.value = 1; const n = pl.sy.length;
    pl.sy.forEach((x, i) => {
      const fm = prof.fm || 1, [f1, f2] = VOWELS[x.v], jitter = 1 + (hash32(x.v + i + (prof.f0 || 0)) % 60 - 30) / 1000;
      const prog = i / Math.max(1, n - 1), decl = 1 - .12 * prog, endMod = pl.end === 'bang' ? (prog > .7 ? 1.18 - (prog - .7) * 1.6 : 1) : pl.end === 'ask' ? 1 + prog * .25 : pl.end === 'slow' ? 1 - prog * .12 : 1;
      const f0 = (o.f0 || prof.f0) * decl * endMod * (x.stress ? 1.15 : 1) * jitter, t = t0 + x.t, dur = x.dur;
      const osc = c.createOscillator(); osc.type = ({ pulse: 'square', pulse12: 'square', saw: 'sawtooth', square: 'square', triangle: 'triangle' })[prof.wave] || 'sawtooth';
      osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (x.stress ? 1.04 : .97), t + dur);
      if (prof.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .05); }
      const env = c.createGain(); const peak = vol * (x.stress ? .5 : .35) * (prof.loud || 1);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(peak, t + .005); env.gain.setValueAtTime(peak, t + Math.max(.01, dur * .6)); env.gain.linearRampToValueAtTime(0, t + dur * .95);
      for (const [fr, q, g2] of [[f1 * fm, 6, 1], [f2 * fm, 8, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = g2; osc.connect(bp); bp.connect(gg); gg.connect(env); }
      env.connect(bus); osc.start(t); osc.stop(t + dur + .02);
      if (x.c !== 'none' && A._noise) {   // the consonant: a tiny noise burst
        const nb = c.createBufferSource(); nb.buffer = A._noise; const hp = c.createBiquadFilter(); hp.type = x.c === 'fric' ? 'highpass' : x.c === 'plosive' ? 'bandpass' : 'lowpass'; hp.frequency.value = x.c === 'fric' ? 5000 : x.c === 'plosive' ? 1800 : 300;
        const ng = c.createGain(); const cd = x.c === 'fric' ? .025 : x.c === 'plosive' ? .008 : .02; ng.gain.setValueAtTime(vol * .25, t); ng.gain.linearRampToValueAtTime(0, t + cd); nb.connect(hp); hp.connect(ng); ng.connect(bus); nb.start(t); nb.stop(t + cd + .01);
      }
      if (prof.rough) { const nb = c.createBufferSource(); nb.buffer = A._noise; nb.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1 * fm; const ng = c.createGain(); ng.gain.setValueAtTime(vol * prof.rough * .5, t); ng.gain.linearRampToValueAtTime(0, t + dur); nb.connect(bp); bp.connect(ng); ng.connect(bus); nb.start(t); nb.stop(t + dur + .01); }
    });
  },
  /** a loud 1-2 syllable shout with a pitch drop */
  kiai(prof, heavy) { const A = KC.game.audio; if (!A._init || !A._init() || A.muted || A.ctx.state !== 'running') return; try { this.play({ sy: [{ v: heavy ? 'o' : 'a', c: 'fric', stress: true, t: 0, dur: heavy ? .22 : .14 }], dur: .25, end: 'bang' }, Object.assign({}, prof, { loud: 1.6, rough: .25 }), { f0: (prof.f0 || 180) * 1.1 }); } catch (e) { /* ok */ } },
  crowd(kind) { KC.sfx(kind === 'ooh' ? 'crowdOoh' : kind === 'boo' ? 'crowdBoo' : 'crowdCheer'); }
};
// referee calls: fixed syllable counts and stress so each call has a recognisable rhythm
const CALL_SHAPE = { begin: [3, 1], stop: [2, 0], white: [2, 0], red: [2, 0], half: [4, 1], full: [3, 0], nopoint: [4, 1], aiuchi: [3, 1], time: [3, 1], judges: [3, 0], whiteWins: [4, 2], redWins: [3, 2], bow: [2, 0], decide: [4, 1], forfeit: [3, 0], matchPoint: [4, 2] };
KC.speakCall = id => { const sh = CALL_SHAPE[id] || [3, 0]; return KC.Voice.speak(KC.callText(id), KC.REF.voice, { syllables: sh[0], stress: sh[1], rate: 9, f0: KC.REF.voice.f0 }); };
KC.speakLine = (who, text) => { const prof = who === 'genkotsu' ? KC.REF.voice : (KC.FIGHTER[who] || KC.FIGHTER.taro).voice; return KC.Voice.speak(text, prof); };
KC.onCall = (c, bout) => { KC.speakCall(c.id); if (c.id === 'begin') KC.sfx('taikoHit'); if (c.id === 'judges') KC.sfx('whistle'); if (c.id === 'stop') KC.sfx('flagSnap'); if (c.id === 'full') KC.sfx('crowdCheer'); if (c.id === 'half') KC.sfx('crowdOoh'); if (c.id === 'bow') KC.sfx('gong', { vol: .4 }); };

/* ---- 30-karateka.js ---- */
/* ---------- Karateka: one fighter (body, technique state machine, boxes, pose) ---------- */
const PUSH = 18, FOE_Z = 24;   // push-box width; below this height a body counts as grounded for pushing
const secs = f => f * 2;       // 60 fps frames -> 120 Hz steps
const specOf = t => {
  if (t._spec) return t._spec;
  const m = t.move; if (!m) return null;
  const s = Object.assign({ name: t.id, wind: .1, active: .1, recover: .2, hold: .55 }, E.MOVES[m.base], m);
  s.wind = secs(t.f[0]) * STEP; s.active = secs(t.f[1]) * STEP; s.recover = secs(t.f[2]) * STEP; delete s.base;
  return (t._spec = s);
};
KC.riggedColors = (data, side, beltId) => {
  const gi = side === 0 ? KC.GI.white : KC.GI.red, skin = data.rig.colors && data.rig.colors.skin || SKIN;
  const belt = (KC.BELTS.find(b => b.id === beltId) || KC.BELTS[0]).color;
  if (KC.game && KC.game.settings.palette === 'Classic' && KC.unlocks.has('classic')) return { skin: '#f0b080', boot: '#f0b080', glove: '#f0b080', hair: '#101010', cloth: side === 0 ? '#ffffff' : '#e02a2a', pants: side === 0 ? '#ffffff' : '#e02a2a', coat: side === 0 ? '#ffffff' : '#e02a2a', belt: '#101010', trim: '#101010' };
  return Object.assign({ skin, boot: skin, glove: skin, belt, trim: side === 0 ? '#c8c4b8' : '#8a1e1a' }, data.rig.colors, { cloth: gi, pants: gi, coat: gi, belt, boot: skin, glove: skin, skin });
};
KC.makeRig = (data, side, beltId, size) => {
  const r = data.rig;
  return new E.Humanoid({ size: size || r.size, build: r.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: r.sleeves || 'short', hair: r.hair || 'short', hat: r.hat || undefined, hunch: r.hunch || 0, speedRef: 40, colors: KC.riggedColors(data, side, beltId) });
};

class Karateka {
  constructor(id, side, o = {}) {
    this.id = id; this.d = KC.FIGHTER[id] || KC.ROSTER[0]; this.side = side; this.o = o;
    this.belt = o.belt || 'white'; this.rig = o.rig || KC.makeRig(this.d, side, this.belt);
    this.mark = KC.ARENA.marks[side]; this.reset();
    this.score = 0; this.name = o.name || this.d.name; this.puppet = !!o.puppet;
  }
  reset() {
    this.x = this.mark; this.z = 0; this.vz = 0; this.vxw = 0; this.face = this.side === 0 ? 1 : -1; this.ang = this.face > 0 ? 0 : Math.PI; this.spinAng = 0;
    this.tech = null; this.t = 0; this.fr = null; this.crouching = false; this.state = 'free'; this.recoil = 0; this.hitDone = false; this.buf = null; this.bufT = 0;
    this.downW = 0; this.hurtT = 0; this.kime = 0; this.pivot = 0; this.upg = null; this.guard = false; this.flipU = 0; this.launched = false; this.posePose = null; this.exprT = 0; this.expr = null; this.air = false;
    this.lastTech = null; this.lastInfo = null; this.walking = 0; this.frozen = false; this.invuln = false; this.returning = false;
  }
  get stats() { return this.d.stats; }
  get busy() { return this.state === 'tech'; }
  get airborne() { return this.z > 1; }
  get hurtable() { return !this.invuln && !this.frozen && this.state !== 'down' && this.state !== 'rise' && this.state !== 'pose'; }
  get phase() { if (!this.tech || !this.fr) return null; const t = this.t, f = this.fr; return t < f[0] ? 'startup' : t < f[0] + f[1] ? 'active' : 'recovery'; }
  get isFlip() { return !!(this.tech && (this.tech.flip || this.tech.roll)); }
  // the foe is on this side: +1 right, -1 left
  foeDir(foe) { return foe.x >= this.x ? 1 : -1; }
  toward(foe, ch) { const fd = this.foeDir(foe); return ch === 'r' ? fd > 0 : ch === 'l' ? fd < 0 : false; }
  // resolve a (posture, strike) pair, in screen terms, into a technique id
  resolve(posture, strike, foe) {
    const fd = this.foeDir(foe), rel = c => c === 'n' ? 'n' : (c === 'u' || c === 'd') ? c : ((c === 'r') === (fd > 0) ? 't' : 'a');
    const p = rel(posture), s = strike === 'u' || strike === 'd' ? strike : ((strike === 'r') === (fd > 0) ? 't' : 'a');
    return this.closeFix(KC.MATRIX[p + s] || null, foe);
  }
  closeFix(id, foe) {
    const t = KC.TECHS[id]; if (!t) return id;
    const gap = Math.abs(foe.x - this.x) - PUSH;
    if (id === 'frontKick' && gap < 12) return 'revPunch';
    if (id === 'midLunge') return gap < 12 ? 'revPunch' : gap < 18 ? 'frontKick' : id;
    if (id === 'upLunge' && gap < 18) return 'roundKick';
    return id;
  }
  start(id, foe, posture, strike) {
    const t = KC.TECHS[id]; if (!t) return false;
    const spd = this.stats.speed * T().techSpeed;
    this.tech = t; this.t = 0; this.state = 'tech'; this.hitDone = false; this.recoil = 0; this.launched = false; this.crouching = false; this.guard = false; this.kime = 0;
    this.fr = t.f.map((f, i) => i === 1 && (t.id === 'block') ? T().blockWindow * 2 : Math.max(i === 1 && !f ? 0 : 1, Math.round(secs(f) / spd)));
    if (t.id === 'crouch') this.fr = [6, 0, 10];
    this.startPosture = posture || 'n'; this.pressR = strike || null; this.startGap = Math.abs(foe.x - this.x) - PUSH;
    this.spinAng = 0; this.lastTech = id; this.travelLeft = t.travel;
    if (t.air && !(t.id === 'jump' || t.flip)) this.launch();
    return true;
  }
  launch() {
    const t = this.tech, vz = t.air.vz * T().jump / 360, tair = 2 * vz / T().gravity;
    this.vz = vz; this.z = .01; this.vxw = t.travel / tair * this.face; this.launched = true; this.air = true;
  }
  // end the technique
  endTech() { this.tech = null; this.fr = null; this.state = 'free'; this.t = 0; this.spinAng = 0; this.flipU = 0; this.vxw = 0; this.upg = null; }
  /** one fixed step (1/120 s). ctrl = { posture, tech } in screen directions (or null: no input). foe = the other Karateka. walls inside the arena. */
  step(foe, ctrl, bout) {
    if (this.frozen) { this.vxw = 0; return; }
    const A = KC.ARENA, tune = T(), fd = this.foeDir(foe);
    this.walking = 0;
    if (this.kime > 0) this.kime--;
    if (this.state === 'down' || this.state === 'rise' || this.state === 'pose') { this.vxw = 0; return; }
    const c = ctrl || { posture: 'n', tech: null };
    // buffering: a strike pressed while busy fires on the first free step (0.15 s)
    if (this.state !== 'free') { if (c.tech) { this.buf = c.tech; this.bufT = 18; } else if (this.bufT > 0 && --this.bufT <= 0) this.buf = null; }
    if (this.state === 'free') {
      // facing: turn toward the foe when free and grounded
      if (!this.air && this.face !== fd) { this.face = fd; this.pivot = 12; }
      const posture = c.posture, press = c.tech || (this.bufT > 0 ? this.buf : null);
      if (press) {
        this.buf = null; this.bufT = 0;
        const id = this.resolve(posture, press, foe);
        if (id) this.start(id, foe, posture, press);
      } else if (posture === 'u' && !this.prevUp) this.start('jump', foe, 'u', null);
      this.prevUp = posture === 'u';
      if (this.state === 'free') {
        this.crouching = posture === 'd';
        if (posture === 'l' || posture === 'r') {
          const toward = (posture === 'r') === (fd > 0), sp = tune.walk * this.stats.walk * (toward ? 1 : .78);
          this.vxw = sp * (posture === 'r' ? 1 : -1); this.walking = toward ? 1 : -1;
        } else this.vxw = 0;
        if (this.crouching) this.vxw = 0;
        this.x += this.vxw * STEP; if (this.pivot > 0) this.pivot--;
      }
    }
    if (this.state === 'tech') this.stepTech(foe, c);
    // arena walls
    this.x = clamp(this.x, A.x0 + PUSH / 2, A.x1 - PUSH / 2);
  }
  stepTech(foe, c) {
    const t = this.tech, f = this.fr, tune = T(), fd = this.face, total = f[0] + f[1] + f[2] + this.recoil;
    // late-posture upgrade (8 steps = 4 frames): a standing technique swaps to the variant of the posture that arrives late
    if (this.t < 8 && this.startPosture === 'n' && this.pressR && !t.air && !t.util && c.posture !== 'n' && this.t > 0) {
      const id = this.resolve(c.posture, this.pressR, foe);
      if (id && id !== t.id) { const keep = this.t; this.start(id, foe, c.posture, this.pressR); this.t = Math.min(keep, this.fr[0] - 1); return; }
    }
    // a jump still in its squat becomes the posture+strike variant when the strike arrives
    if (t.id === 'jump' && !this.launched && c.tech) {
      const id = this.resolve('u', c.tech, foe);
      if (id && id !== 'jump') { const keep = this.t; this.buf = null; this.bufT = 0; this.start(id, foe, 'u', c.tech); this.t = keep; return; }
    }
    if (t.air && !this.launched && this.t >= f[0] && (t.id === 'jump' || t.flip)) this.launch();
    // body travel along the technique's startup+active (ground techniques)
    if (!t.air && t.travel && this.t < f[0] + f[1]) {
      const per = t.travel / (f[0] + f[1]), nx = this.x + per * fd;
      if (!(per > 0 && Math.abs(foe.x - nx) < PUSH && foe.z < FOE_Z)) this.x = nx;
    }
    if (this.air || this.z > 0) {
      this.vz -= tune.gravity * STEP; this.z += this.vz * STEP; this.x += this.vxw * STEP;
      if (this.z <= 0 && this.vz < 0) {
        this.z = 0; this.vz = 0; this.air = false; this.vxw = 0; this.landed = true;
        // landing lag: the rest of the recovery, at least a few steps
        const lag = t.util ? 10 : Math.max(24, Math.min(50, Math.round((total - this.t) * .5)));
        this.t = Math.max(this.t, f[0] + f[1]); this.fr = [f[0], f[1], this.t - f[0] - f[1] + lag]; 
      }
      if (this.flipU !== undefined && t.flip) this.flipU = clamp((this.t - f[0]) / Math.max(1, 2 * this.vzStart() * 120 / tune.gravity), 0, 1);
    }
    this.t++;
    if (t.id === 'crouch') { this.crouching = true; }
    if (this.t >= f[0] + f[1] + f[2] + this.recoil && !this.air) this.endTech();
    else if (this.air && this.t > 600) { this.air = false; this.z = 0; this.endTech(); }
  }
  vzStart() { return this.tech && this.tech.air ? this.tech.air.vz * T().jump / 360 : 360; }
  // can this fighter currently be hit by a technique of the given height? returns 'hit' | 'whiff' | 'block'
  vulnerable(tech, atk) {
    if (!this.hurtable) return 'whiff';
    const dt = this.tech, h = tech.height;
    const crouchLow = this.crouching || (dt && dt.roll) || (dt && dt.id === 'crouch');
    const flipping = dt && dt.flip && this.z > 1;
    const inAir = this.z > 6;
    if (dt && dt.id === 'block' && this.t >= 1 && this.t < this.fr[0] + this.fr[1] && (h === 'high' || h === 'mid') && !tech.unblockable) return 'block';
    if (flipping) return (h === 'high' || tech.rising) ? 'hit' : 'whiff';
    if (h === 'high' && crouchLow && !tech.rising) return 'whiff';
    if (h === 'low' && inAir) return 'whiff';
    if (tech.rising && inAir) return this.vz > -40 || this.z < 40 ? 'hit' : 'whiff';
    if (h === 'mid' && crouchLow && !tech.hitsCrouch) return 'whiff';
    if (dt && dt.roll && h !== 'low') return 'whiff';
    return 'hit';
  }
  counterable() { return this.state === 'tech' && this.tech && (this.tech.id !== 'jump' && this.tech.id !== 'crouch') && !this.tech.util || this.recoil > 0; }
  /** the rig input from serializable state only */
  riggedState(dt, foe) {
    const t = this.tech, f = this.fr, s = { x: this.x, y: 0, z: this.z, vx: this.vxw, vy: 0 };
    const base = this.face > 0 ? 0 : Math.PI, k = clamp(dt * 14, 0, 1);
    let want = base, spin = 0;
    if (t && f) {
      const sp = t.spin || 0;
      if (sp) { const u0 = sp === .5 ? .35 : 0, u = clamp((this.t / Math.max(1, f[0]) - u0) / (1 - u0), 0, 1); spin = (this.face > 0 ? -1 : 1) * TAU * E.ease.inOut(u); }
    }
    this.ang = want; s.facing = base + spin;
    if (this.pivot > 0 && !t) s.facing = base + (this.face > 0 ? -1 : 1) * Math.PI * (this.pivot / 12) * .5;
    if (t && f && t.move) {
      const ph = this.phase, tt = this.t;
      s.attack = ph === 'startup' ? { spec: specOf(t), phase: 'wind', u: clamp(tt / f[0], 0, 1) } : ph === 'active' ? { spec: specOf(t), phase: 'active', u: clamp((tt - f[0]) / Math.max(1, f[1]), 0, 1) } : { spec: specOf(t), phase: 'recover', u: clamp((tt - f[0] - f[1]) / Math.max(1, f[2] + this.recoil), 0, 1) };
      if (t.rising && ph !== 'startup') s.attack.spec = Object.assign({}, specOf(t), {});
    }
    if (t && t.id === 'block') s.pose = 'block';
    else if (this.crouching || (t && (t.id === 'crouch' || t.roll || (t.id === 'squatPunch')))) s.pose = this.state === 'tech' && t.move ? undefined : 'crouch';
    if (t && (t.air || this.air) && this.z > 1) { s.air = true; }
    if (t && t.flip && this.z > 1) { s.flip = clamp(this.flipU, .02, .98) * (t.flip < 0 ? 1 : 1); s.air = true; }
    if (t && t.roll) { s.flip = clamp((this.t - f[0]) / Math.max(1, f[1]), .02, .98); }
    if (this.state === 'down') { s.down = this.downW; }
    else if (this.downW > 0) s.down = this.downW;
    if (this.state === 'hurt' || this.hurtT > 0) s.hurt = true;
    if (this.posePose) s.pose = this.posePose;
    if (!t && !this.posePose && this.state === 'free' && !s.pose) s.stance = 'guard';
    if (this.expr) s.expr = this.expr;
    return s;
  }
  update(dt, foe) { this.rig.update(dt, this.riggedState(dt, foe)); if (this.hurtT > 0) this.hurtT--; }
  // serializable snapshot for netplay (positions in 0.1 units)
  snap() { return [this.id, Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, this.state, this.tech ? this.tech.id : '', this.t, this.fr ? this.fr.join(',') : '', this.recoil, this.crouching ? 1 : 0, Math.round(this.downW * 100) / 100, this.posePose || '', this.kime]; }
  apply(s) {
    this.x = s[1]; this.z = s[2]; this.face = s[3]; this.state = s[4]; this.tech = s[5] ? KC.TECHS[s[5]] : null; this.t = s[6]; this.fr = s[7] ? s[7].split(',').map(Number) : null; this.recoil = s[8]; this.crouching = !!s[9]; this.downW = s[10]; this.posePose = s[11] || null; this.kime = s[12];
    this.air = this.z > 1; this.flipU = this.tech && this.tech.flip ? clamp((this.t - (this.fr ? this.fr[0] : 0)) / 78, 0, 1) : 0;
  }
  draw(r, o = {}) {
    r.shadow(this.x, 0, 9 * (1 - clamp(this.z / 120, 0, .5)), .5);
    r.actor(this.x, 0, this.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), o);
  }
}
KC.Karateka = Karateka;
KC.PUSH = PUSH;

/* ---- 31-referee.js ---- */
/* ---------- Judge Genkotsu and the two corner judges: signals, flags ---------- */
const blazer = (size, hair) => new E.Humanoid({ size, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair, colors: { skin: '#e0b090', hair: '#dcdcdc', coat: '#1f2a4a', cloth: '#f0f0f0', pants: '#6a6a74', trim: '#c8302a', boot: '#2a2a30', belt: '#1f2a4a', glove: '#e0b090' } });
KC.makeReferee = () => ({ ref: blazer(2.1, 'bald'), j: [blazer(1.6, 'short'), blazer(1.6, 'short')], sig: 'idle', t: 0, votes: null, voteT: 0 });
KC.updateReferee = (b, dt) => {
  const R = b.refActor || (b.refActor = KC.makeReferee()); R.t += dt;
  const ph = b.phase, lp = b.lastPoint || {}, mid = (b.f[0].x + b.f[1].x) / 2;
  let rp = 'hips', atk = null, jp = [undefined, undefined];
  if (ph === 'hajime') { atk = E.move('overhead', clamp(b.pt / (b.dur * .8), 0, 1), b.pt < b.dur * .4 ? 'wind' : 'active'); rp = null; }
  else if (ph === 'yame' || (ph === 'award' && b.pt < 20)) rp = 'wave';
  else if (ph === 'award') rp = lp.aiuchi ? 'cast' : lp.full ? 'cheer' : 'wave';
  else if (ph === 'rei' || ph === 'matchEnd') rp = 'crouch';
  else if (ph === 'roundEnd') rp = 'cheer';
  else if (ph === 'hantei' && b.hantei) { const k = Math.floor(b.pt / b.pace(.5)); rp = k >= 3 ? 'cheer' : 'point'; jp = [k >= 0 && b.hantei.votes[0] != null ? 'cheer' : undefined, k >= 1 ? 'cheer' : undefined]; R.votes = b.hantei.votes.slice(0, k + 0); R.vcount = Math.min(3, k + 1); }
  else R.votes = null;
  const st = { x: mid, y: 14, z: 0, facing: Math.PI / 2 * 0, vx: 0, vy: 0, pose: rp || undefined, attack: atk || undefined, stance: undefined };
  st.facing = 0; // faces the camera sideways like the fighters (a profile referee)
  R.ref.update(dt, st);
  R.j[0].update(dt, { x: 18, y: 34, z: 0, facing: 0, vx: 0, vy: 0, pose: ph === 'hantei' && b.pt > b.pace(.5) ? 'cheer' : 'hips' });
  R.j[1].update(dt, { x: 382, y: 34, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: ph === 'hantei' && b.pt > b.pace(1) ? 'cheer' : 'hips' });
  R.flag = ph === 'award' && b.pt > 20 ? (lp.side === 0 ? 'white' : lp.side === 1 ? 'red' : null) : ph === 'roundEnd' ? (b.winner === 0 ? 'white' : 'red') : null;
  R.mid = mid; R.hantei = ph === 'hantei' ? b.hantei : null; R.hp = ph === 'hantei' ? b.pt : 0; R.pace = b.pace(.5);
};
KC.drawReferee = (r, b) => {
  const R = b.refActor; if (!R) return;
  const wob = Math.sin(KC.game.time * 6) * 2;
  // the main referee, behind the fighters (y = +14)
  const gap = Math.abs(b.f[0].x - b.f[1].x), fade = clamp(.35 + .65 * (gap - 30) / 90, .35, 1);   // see-through while the fighters are close, so he never hides the action
  r.actor(R.mid, 14, 0, (g, ox, oy) => { R.ref.draw(g, ox, oy, r.view); }, fade < .99 ? { alpha: fade } : {});
  // a white beard overlay at the head joint
  r.queue(R.mid, 13.5, 0, g => { const hd = R.ref.worldOffset(R.ref.J.head), [sx, sy] = r.w(R.mid + hd[0], 14 + hd[1], hd[2]); px.rect(g, Math.round(sx) - 3, Math.round(sy) + 1, 6, 3, '#f0f0f0'); });
  for (let i = 0; i < 2; i++) r.actor(i === 0 ? 18 : 382, 34, 0, (g, ox, oy) => R.j[i].draw(g, ox, oy, r.view));
  // flags: a pole from the hand and a waving cloth, red and white
  const flag = (rig, x, y, col, up) => r.queue(x, y - .5, 0, g => {
    const h = rig.hand('R'), [sx, sy] = r.w(h[0], h[1], h[2]), len = 15, k = Math.sin(KC.game.time * 9 + x) * 2;
    px.line(g, Math.round(sx), Math.round(sy), Math.round(sx + (up ? 2 : 6)), Math.round(sy - len), '#c8a060', 1);
    px.poly(g, [[sx + (up ? 2 : 6), sy - len], [sx + (up ? 14 : 18) + k, sy - len + 2], [sx + (up ? 13 : 17) + k, sy - len + 8], [sx + (up ? 2 : 6), sy - len + 7]], col === 'white' ? '#f4f4f4' : '#d8302a');
  });
  const raised = R.hantei ? R.hantei.votes : null;
  flag(R.j[0], 18, 34, raised && R.hp > R.pace ? (raised[0] === 0 ? 'white' : 'red') : 'white', raised && R.hp > R.pace);
  flag(R.j[1], 382, 34, raised && R.hp > R.pace * 2 ? (raised[1] === 0 ? 'white' : 'red') : 'red', raised && R.hp > R.pace * 2);
  if (R.flag) flag(R.ref, R.mid, 14, R.flag, true);
  if (raised && R.hp > R.pace * 3) flag(R.ref, R.mid, 14, raised[2] === 0 ? 'white' : 'red', true);
};

/* ---- 32-bout.js ---- */
/* ---------- Bout: referee rules, scoring, the phase machine. Deterministic: no RNG except the seeded judges ---------- */
const PH = { intro: 1.2, rei: .9, card: .9, ready: .4, hajime: .6, yame: .9, award: 1.2, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.5 };
class Bout {
  /** o: { white, black ids, belts, ctrl:[fn,fn], seed, rounds (null = TUNE), intro, onMatchEnd, mode } */
  constructor(o) {
    this.o = o; this.f = [new Karateka(o.ids[0], 0, { belt: o.belts && o.belts[0], name: o.names && o.names[0] }), new Karateka(o.ids[1], 1, { belt: o.belts && o.belts[1], name: o.names && o.names[1] })];
    this.ctrl = o.ctrl || [null, null]; this.rng = E.rng(o.seed || 1); this.single = !!o.single; this.mode = o.mode || 'versus';
    this.pts = [0, 0]; this.rounds = [0, 0]; this.round = 1; this.phase = 'none'; this.pt = 0; this.acc = 0; this.clock = T().clock; this.hs = 0; this.pending = null;
    this.listeners = {}; this.calls = []; this.lastCall = null; this.lastPoint = null; this.steps = 0; this.in = [{ posture: 'n', tech: null }, { posture: 'n', tech: null }];
    this.stats = [0, 1].map(() => ({ full: 0, half: 0, blocks: 0, attempts: 0, raw: 0, best: null, bestPts: 0, conceded: 0, counters: 0 }));
    this.score = [0, 0]; this.lastScorer = -1; this.winner = -1; this.matchWinner = -1; this.done = false; this.log = []; this.freezeAll = false; this.slide = [null, null];
    this.noInput = false; this.infiniteTime = false; this.invincible = [false, false]; this.hantei = null; this.inputGate = 0; this.slow = 0;
    this.hintT = 0; this.seq = 0;
  }
  on(n, fn) { (this.listeners[n] = this.listeners[n] || []).push(fn); return this; }
  emit(n, d) { this.seq++; this.log.push([n, d]); if (this.log.length > 60) this.log.shift(); (this.listeners[n] || []).forEach(fn => fn(d)); }
  call(id, extra) { this.lastCall = { id, t: this.steps }; this.emit('call', Object.assign({ id }, extra)); }
  get target() { return T().pointsToWin; }
  get needRounds() { return this.single ? 1 : T().roundsToWin; }
  pace(sec) { return Math.max(1, Math.round(sec * 120 * T().refPace * (this.o.practice ? .45 : 1))); }
  start() { this.round = 1; this.pts = [0, 0]; this.rounds = [0, 0]; this.f.forEach(f => f.reset()); this.setPhase(this.o.intro === false ? 'rei' : 'intro'); }
  setPhase(p) {
    this.phase = p; this.pt = 0; this.dur = this.pace(PH[p] || 1);
    const [a, b] = this.f;
    if (p === 'intro') { a.x = -30; b.x = 430; a.frozen = b.frozen = false; this.walkIn = true; this.f.forEach(f => { f.state = 'free'; }); }
    if (p === 'rei') { this.f.forEach(f => { f.posePose = 'crouch'; f.frozen = true; f.x = f.mark; }); this.call('bow'); }
    if (p === 'card') { this.clock = T().clock; this.f.forEach(f => { f.posePose = null; f.frozen = true; }); this.emit('card', { round: this.round, deciding: this.round === this.needRounds * 2 - 1 && this.needRounds > 1 }); if (this.needRounds > 1 && this.round === this.needRounds * 2 - 1) this.call('decide'); }
    if (p === 'ready') { this.f.forEach(f => { f.posePose = null; f.frozen = true; f.crouching = false; }); }
    if (p === 'hajime') { this.call('begin'); this.inputGate = this.pace(.35); this.f.forEach(f => { f.frozen = true; }); this.emit('hajime', {}); }
    if (p === 'fight') { this.f.forEach(f => { f.frozen = false; }); this.fightSteps = 0; }
    if (p === 'yame') { this.call('stop'); }
    if (p === 'award') { /* set by finishHit */ }
    if (p === 'roundEnd') { this.f.forEach(f => { f.frozen = true; f.tech = null; f.state = 'free'; f.z = 0; f.vz = 0; f.air = false; }); const w = this.winner; this.f[w].posePose = 'cheer'; this.f[w].expr = 'shout'; this.f[1 - w].posePose = 'kneel'; this.f[1 - w].downW = 0; this.call(w === 0 ? 'whiteWins' : 'redWins'); this.emit('roundEnd', { winner: w, rounds: this.rounds.slice() }); }
    if (p === 'time') { this.call('time'); this.f.forEach(f => { f.frozen = true; }); }
    if (p === 'hantei') { this.call('judges'); this.hantei = this.judge(); this.emit('hantei', this.hantei); }
    if (p === 'matchEnd') { this.f.forEach(f => { f.posePose = null; f.expr = null; f.state = 'free'; f.downW = 0; f.x = f.mark; f.face = f.side === 0 ? 1 : -1; f.frozen = true; }); const w = this.matchWinner; this.f[w].posePose = 'cheer'; this.f[1 - w].posePose = 'crouch'; this.call('bow'); }
    if (p === 'reset') { this.f.forEach(f => { f.tech = null; f.fr = null; f.state = 'free'; f.recoil = 0; f.z = 0; f.vz = 0; f.air = false; f.posePose = null; f.kime = 0; f.hurtT = 0; f.crouching = false; f.frozen = true; f.downW = f.downW; }); }
  }
  judge() {
    const votes = [], sc = [0, 1].map(i => ({ pts: this.stats[i].roundRaw || 0, att: this.stats[i].roundAtt || 0, blk: this.stats[i].roundBlk || 0 }));
    for (let j = 0; j < 3; j++) {
      const s = sc.map(x => x.pts + 60 * x.att + 40 * x.blk + (this.rng() * 2 - 1) * 120);
      votes.push(s[0] === s[1] ? (this.lastScorer >= 0 ? this.lastScorer : 0) : s[0] > s[1] ? 0 : 1);
    }
    const w = votes.filter(v => v === 0).length >= 2 ? 0 : 1;
    return { votes, winner: w };
  }
  // ---- per update: read inputs once, then fixed 1/120 steps ----
  update(dt) {
    if (this.done) return;
    const ts = this.slow ? .35 : 1; this.acc += dt / STEP * (this.slow > 0 ? 1 : 1);
    // inputs are read once per update; a press is kept until a step consumes it
    for (let i = 0; i < 2; i++) {
      const c = this.ctrl[i]; if (!c || this.noInput) continue;
      const r = c(this.f[i], this.f[1 - i], this); if (!r) continue;
      const cur = this.in[i]; cur.posture = r.posture; if (r.tech) cur.tech = r.tech;
    }
    let guard = 0;
    while (this.acc >= 1 && guard++ < 8) { this.acc -= 1; this.step(); }
    if (this.acc > 4) this.acc = 0;
    for (const f of this.f) { f.update(dt, this.f[1 - f.side]); }
  }
  take(i) { const r = this.in[i], out = { posture: r.posture, tech: r.tech }; r.tech = null; return out; }
  step() {
    this.steps++;
    if (this.hs > 0) { this.hs--; return; }
    this.pt++;
    const [a, b] = this.f;
    switch (this.phase) {
      case 'intro': {
        const sp = 400 / (1.2 * 120 * T().refPace) * 0; a.x = lerp(a.x, a.mark, .03); b.x = lerp(b.x, b.mark, .03); a.walking = b.walking = 1; a.vxw = (a.mark - a.x) * 2.4; b.vxw = (b.mark - b.x) * 2.4;
        if (this.pt >= this.dur) { a.x = a.mark; b.x = b.mark; a.vxw = b.vxw = 0; this.setPhase('rei'); } break; }
      case 'rei': if (this.pt >= this.dur) this.setPhase('card'); break;
      case 'card': if (this.pt >= this.dur) this.setPhase('ready'); break;
      case 'ready': if (this.pt >= this.dur) this.setPhase('hajime'); break;
      case 'hajime': if (this.pt >= this.inputGate) { this.f.forEach(f => { f.frozen = false; }); } if (this.pt >= this.dur) this.setPhase('fight'); break;
      case 'fight': this.fightStep(); break;
      case 'yame': this.yameStep(); break;
      case 'award': if (this.afterCall && this.pt >= this.callAt) { this.call(this.afterCall); this.afterCall = null; } if (this.pt >= this.dur || (this.skipReq && this.pt > this.pace(.6))) { this.skipReq = false; this.afterAward(); } break;
      case 'reset': this.resetStep(); break;
      case 'time': if (this.pt >= this.dur) { if (this.pts[0] !== this.pts[1]) this.endRound(this.pts[0] > this.pts[1] ? 0 : 1); else this.setPhase('hantei'); } break;
      case 'hantei': if (this.pt >= this.dur) this.endRound(this.hantei.winner); break;
      case 'roundEnd': if (this.pt >= this.dur) this.afterRoundEnd(); break;
      case 'matchEnd': if (this.pt >= this.dur) { this.done = true; this.phase = 'done'; this.emit('matchEnd', { winner: this.matchWinner, stats: this.stats, score: this.score }); if (this.o.onMatchEnd) this.o.onMatchEnd(this.matchWinner, this.stats); } break;
    }
  }
  fightStep() {
    const [a, b] = this.f;
    this.fightSteps++;
    if (!this.infiniteTime && this.fightSteps > (T().clock + 5) * 120 * 4) throw new Error('bout soft-lock');
    for (let i = 0; i < 2; i++) { const f = this.f[i]; f.step(this.f[1 - i], this.noInput ? null : this.take(i), this); }
    this.separate();
    // attempts (techniques thrown toward the foe within reach)
    for (let i = 0; i < 2; i++) { const f = this.f[i]; if (f.tech && !f.tech.util && f.t === 1) { const gap = Math.abs(f.x - this.f[1 - i].x) - PUSH; this.stats[i].attempts++; this.stats[i].roundAtt = (this.stats[i].roundAtt || 0) + (gap <= f.tech.reach[1] * 1.4 ? 1 : 0); } }
    this.resolveHits();
    if (!this.infiniteTime) this.clock -= STEP;
    if (this.pending) { this.pending.t++; if (this.pending.t >= 6) this.finishHit(); }
    else if (this.clock <= 0) { this.clock = 0; this.setPhase('time'); }
  }
  separate() {
    const [a, b] = this.f;
    if (a.z < FOE_Z && b.z < FOE_Z) {
      const d = b.x - a.x, ov = PUSH - Math.abs(d);
      if (ov > 0) { const s = d >= 0 ? 1 : -1; a.x -= s * ov / 2; b.x += s * ov / 2; }
    }
    for (const f of this.f) f.x = clamp(f.x, KC.ARENA.x0 + PUSH / 2, KC.ARENA.x1 - PUSH / 2);
    // if clamping pushed one into the other, push the other back
    if (a.z < FOE_Z && b.z < FOE_Z && Math.abs(b.x - a.x) < PUSH - .01) { if (a.x <= KC.ARENA.x0 + PUSH / 2 + .01) b.x = a.x + (b.x >= a.x ? PUSH : -PUSH); else b.x = clamp(b.x, KC.ARENA.x0 + PUSH / 2, KC.ARENA.x1 - PUSH / 2); }
  }
  resolveHits() {
    const res = [null, null];
    for (let i = 0; i < 2; i++) {
      const A = this.f[i], D = this.f[1 - i], t = A.tech;
      if (!t || t.util || A.state !== 'tech' || A.phase !== 'active' || A.hitDone) continue;
      if ((D.x - A.x) * A.face < -4 && !(t.air && A.z > 4)) continue;
      const gap = Math.abs(D.x - A.x) - PUSH, rmax = t.reach[1] * A.stats.reach * T().reachScale;
      if (gap > rmax) continue;
      if (this.invincible[1 - i]) continue;
      const v = D.vulnerable(t, A);
      if (v === 'whiff') continue;
      A.hitDone = true;
      if (v === 'block') { this.doBlock(A, D); continue; }
      res[i] = { a: i, d: 1 - i, tech: t, gap, tAct: A.t - A.fr[0] };
    }
    for (let i = 0; i < 2; i++) {
      if (!res[i]) continue;
      if (!this.pending) this.pending = { t: 0, hits: [] };
      this.pending.hits.push(res[i]);
    }
  }
  doBlock(A, D) {
    const stats = this.stats[D.side]; stats.blocks++; stats.roundBlk = (stats.roundBlk || 0) + 1;
    A.recoil += 20; A.x = clamp(A.x - A.face * 14, 9, 391); if (D.fr) D.fr[2] = Math.max(2, D.fr[2] - 12);
    this.hs = Math.round(.05 * 120); this.emit('block', { side: D.side, x: (A.x + D.x) / 2, tech: A.tech.id });
  }
  quality(hit) {
    const A = this.f[hit.a], D = this.f[hit.d], t = hit.tech, act = Math.max(1, A.fr[1]);
    const fracT = clamp(hit.tAct / act, 0, 1), timingQ = fracT <= .4 ? 1 : lerp(1, .3, (fracT - .4) / .6);
    const rmin = t.reach[0] * A.stats.reach * T().reachScale, rmax = t.reach[1] * A.stats.reach * T().reachScale;
    const pos = rmax - rmin < 1 ? 1 : clamp((hit.gap - rmin) / (rmax - rmin), 0, 1), spacingQ = pos >= .7 ? 1 : pos / .7;
    let q = .5 * timingQ + .5 * spacingQ;
    if (A.d.sig === t.id) q += .1;
    if (t.rising && D.z > 6) q += .25;
    q = clamp(q, .15, 1);
    return { q, timingQ, spacingQ };
  }
  finishHit() {
    const p = this.pending; this.pending = null; if (!p || !p.hits.length) return;
    const [a, b] = this.f;
    if (p.hits.length > 1) {
      this.call('aiuchi'); this.emit('aiuchi', {}); this.lastPoint = { aiuchi: true };
      this.f.forEach(f => { f.frozen = true; f.state = 'hurt'; f.tech = null; f.hurtT = 40; }); this.f[0].x -= 8; this.f[1].x += 8;
      this.nextAward = { aiuchi: true }; this.hs = Math.round(T().hitstop * 120); this.setPhase('yame'); return;
    }
    const h = p.hits[0], A = this.f[h.a], D = this.f[h.d], t = h.tech, qi = this.quality(h);
    if (this.directorQ !== undefined && this.directorQ !== null) { qi.q = this.directorQ; this.directorQ = null; }
    let pts = t.pts[0] + Math.round((t.pts[1] - t.pts[0]) * qi.q / 100) * 100;
    pts = clamp(pts, t.pts[0], t.pts[1]);
    const counter = D.counterable(); if (counter) pts = Math.min(1000, pts * T().counterMul);
    const full = pts >= T().fullAt, val = full ? 1 : .5;
    const info = { side: h.a, tech: t.id, pts, full, counter, q: qi.q, timingQ: qi.timingQ, spacingQ: qi.spacingQ, gap: h.gap, x: (A.x + D.x) / 2 };
    this.lastPoint = info; this.lastScorer = h.a;
    const st = this.stats[h.a]; if (full) st.full++; else st.half++; st.raw += pts; st.roundRaw = (st.roundRaw || 0) + pts; if (counter) st.counters++; if (pts > st.bestPts) { st.bestPts = pts; st.best = t.name; }
    this.stats[h.d].conceded += val;
    this.pts[h.a] += val; this.score[h.a] += pts;
    // reactions
    this.f.forEach(f => { f.frozen = true; });
    A.kime = 99999; D.tech = null; D.fr = null; D.state = 'hurt'; D.hurtT = 60; D.crouching = false;
    const knock = full || t.knockdown; D.knock = knock;
    this.slide = [null, null]; this.slide[h.d] = { dist: knock ? 18 : 10, dir: -D.face * (D.x < A.x ? -1 : 1) * -1, n: 40 };
    this.slide[h.d].dir = A.x < D.x ? 1 : -1;
    if (knock) { D.state = 'down'; D.downW = Math.max(D.downW, .01); }
    this.hs = Math.round(T().hitstop * 120);
    this.nextAward = info; this.emit('point', info);
    this.setPhase('yame');
  }
  yameStep() {
    for (let i = 0; i < 2; i++) { const s = this.slide[i]; if (s && s.n > 0) { this.f[i].x = clamp(this.f[i].x + s.dir * s.dist / 40, 9, 391); s.n--; } const f = this.f[i]; if (f.z > 0) { f.vz -= T().gravity * STEP; f.z = Math.max(0, f.z + f.vz * STEP); } }
    if (this.pt >= this.dur) this.setPhase('award'), this.beginAward();
  }
  beginAward() {
    const n = this.nextAward || {};
    if (n.aiuchi) { this.call('nopoint'); return; }
    this.call(n.side === 0 ? 'white' : 'red'); this.calls.push(n.full ? 'full' : 'half');
    this.afterCall = n.full ? 'full' : 'half'; this.callAt = this.pace(.55);
  }
  afterAward() {
    const n = this.nextAward || {};
    if (n.aiuchi) { this.nextAward = null; this.setPhase('reset'); return; }
    const s = n.side;
    if (!this.o.practice && this.pts[s] >= this.target) { this.endRound(s); } else { this.nextAward = null; this.setPhase('reset'); }
  }
  resetStep() {
    const sp = T().walk * 2 * STEP, [a, b] = this.f; let done = true;
    for (const f of this.f) { f.downW = Math.max(0, f.downW - 0.012); const d = f.mark - f.x; if (Math.abs(d) > sp) { f.x += Math.sign(d) * sp; done = false; f.walking = 1; f.vxw = Math.sign(d) * T().walk * 2; } else { f.x = f.mark; f.vxw = 0; } if (f.downW > .02) done = false; f.expr = null; f.hurtT = 0; f.state = 'free'; f.kime = 0; }
    this.f.forEach(f => { f.face = f.side === 0 ? 1 : -1; });
    if (done || this.pt >= this.dur * 1.6) { this.f.forEach(f => { f.x = f.mark; f.downW = 0; f.vxw = 0; }); this.setPhase('ready'); }
  }
  endRound(w) {
    this.winner = w; this.rounds[w]++;
    const secs = Math.floor(this.clock); let bonus = secs * 100; this.score[w] += bonus; this.roundBonus = bonus;
    this.setPhase('roundEnd');
  }
  afterRoundEnd() {
    const w = this.winner;
    if (this.rounds[w] >= this.needRounds) {
      this.matchWinner = w; const lw = this.stats[1 - w].conceded === 0 ? 5000 : 0; this.perfect = lw > 0 || (this.stats[1 - w].conceded === 0 && this.stats[w].raw > 0); if (this.perfect) this.score[w] += 5000;
      this.setPhase('matchEnd');
    } else {
      this.round++; this.pts = [0, 0]; this.stats.forEach(s => { s.roundRaw = 0; s.roundAtt = 0; s.roundBlk = 0; }); this.f.forEach(f => { f.posePose = null; f.expr = null; f.downW = 0; }); this.setPhase('reset'); this.afterReset = 'card';
    }
  }
}
// after the reset walk a new round shows its card
const _resetStep = Bout.prototype.resetStep;
Bout.prototype.resetStep = function () {
  const was = this.phase; _resetStep.call(this);
  if (this.phase === 'ready' && this.afterReset === 'card') { this.afterReset = null; this.setPhase('card'); }
};
KC.Bout = Bout;

/* ---- 33-ai.js ---- */
/* ---------- CPU AI: the same control intent a human produces, with reaction delay, personalities and a habit tracker ---------- */
const LV = (L, a, b) => lerp(a, b, clamp((L - 1) / 9, 0, 1));
class KarateAI {
  /** o: { id (personality from the roster), level (1..10), seed, mode: 'normal' | 'showcase' } */
  constructor(o = {}) {
    const d = (KC.FIGHTER[o.id] || KC.ROSTER[0]).ai || KC.ROSTER[0].ai;
    this.p = d; this.rng = E.rng((o.seed || 1) * 7919 + 13); this.mode = o.mode || 'normal'; this.fixedLevel = o.level || 0;
    this.obs = []; this.cool = 0; this.plan = null; this.habit = {}; this.lastFoeTech = null; this.thought = ''; this.showIdx = o.start || 0; this.walkT = 0; this.walkDir = 'n'; this.prevFoeT = 0;
    this.ignoreTune = !!o.ignoreTune; this.diff = o.diff || 'Normal'; this.stepN = 0; this.queue = []; this.used = {};
  }
  get level() { const t = this.ignoreTune ? 0 : T().cpuLevel; let L = t > 0 ? t : (this.fixedLevel || this.p.level); if (this.diff === 'Easy') L = Math.max(1, L - 2); if (this.diff === 'Hard') L = Math.min(10, L + 1); return L; }
  get react() { const m = this.diff === 'Easy' ? 1.25 : this.diff === 'Hard' ? .85 : 1; return LV(this.level, .34, .1) * T().cpuReact * m; }
  get think() { return LV(this.level, .5, .14); }
  get readP() { return clamp(LV(this.level, .3, .95) + (this.p.readBonus || 0), 0, 1); }
  get mistake() { return LV(this.level, .45, .02); }
  get aggr() { return T().cpuAggression >= 0 ? T().cpuAggression : this.p.aggr; }
  // a technique as a (posture, strike) intent in screen terms
  intentFor(id, me, foe) {
    const t = KC.TECHS[id], fd = foe.x >= me.x ? 1 : -1, conv = c => c === 'n' ? 'n' : c === 'u' || c === 'd' ? c : (c === 't') === (fd > 0) ? 'r' : 'l';
    const s = t.input[1] === 'u' || t.input[1] === 'd' ? t.input[1] : conv(t.input[1]);
    return { posture: conv(t.input[0]), tech: s, id };
  }
  inRange(id, gap, me) { const t = KC.TECHS[id]; return gap <= t.reach[1] * me.stats.reach * T().reachScale + 4 && gap >= Math.max(0, t.reach[0] - 8) - (t.closeAlt ? 8 : 0); }
  pickWeighted(me, gap, ids) {
    const w = this.p.w, opts = (ids || Object.keys(w)).filter(id => KC.TECHS[id] && this.inRange(id, gap, me));
    if (!opts.length) return null;
    const ww = id => (w[id] || 1) / (1 + (this.used[id] || 0) * .45);
    let tot = 0; opts.forEach(id => { tot += ww(id); }); let r = this.rng() * tot, pickId = opts[opts.length - 1];
    for (const id of opts) { r -= ww(id); if (r <= 0) { pickId = id; break; } }
    this.used[pickId] = (this.used[pickId] || 0) + 1; return pickId;
  }
  stateOf(foe) { return { tech: foe.tech ? foe.tech.id : null, phase: foe.phase, air: foe.z > 6, crouch: foe.crouching, down: foe.state === 'down', recoil: foe.recoil > 0, x: foe.x, h: foe.tech ? foe.tech.height : null, util: foe.tech ? !!foe.tech.util : false, st: foe.tech ? foe.t : 0 }; }
  /** called each update with (me, foe, bout); returns { posture, tech } */
  intent(me, foe, bout) {
    this.stepN++;
    const o = this.stateOf(foe); o.gap = Math.abs(foe.x - me.x) - PUSH; this.obs.push(o); const lag = Math.round(this.react * 120); if (this.obs.length > lag + 2) this.obs.shift();
    const seen = this.obs[Math.max(0, this.obs.length - 1 - lag)] || o;
    if (foe.tech && !foe.tech.util && foe.t === 1) { this.habit[foe.tech.id] = (this.habit[foe.tech.id] || 0) + 1; }
    if (bout.phase !== 'fight' && bout.phase !== 'hajime') return { posture: 'n', tech: null };
    if (me.frozen) return { posture: 'n', tech: null };
    if (this.mode === 'showcase') return this.showcase(me, foe, bout, o);
    const fd = foe.x >= me.x ? 1 : -1, towardKey = fd > 0 ? 'r' : 'l', awayKey = fd > 0 ? 'l' : 'r';
    // an action in progress: hold its posture, press its strike once
    if (this.plan) {
      const pl = this.plan; pl.ttl--;
      if (pl.ttl <= 0 || (me.state === 'tech' && pl.fired)) { this.plan = null; }
      else { const out = { posture: pl.posture, tech: null }; if (!pl.fired && pl.delay-- <= 0) { out.tech = pl.tech; pl.fired = true; } return out; }
    }
    if (me.state !== 'free') return { posture: 'n', tech: null };
    this.cool--;
    const gap = o.gap, p = this.p;
    // 1. react to a technique the CPU can see
    if (seen.tech && !seen.util && seen.phase !== 'recovery' && this.rng() < this.readP && (seen.phase === 'startup' || seen.phase === 'active') && seen.gap < 150) {
      const ids = this.counterTo(seen, me, foe, gap); if (ids) { this.thought = 'READ ' + seen.tech + ' -> ' + ids; return this.begin(ids, me, foe, 6); }
    }
    if (this.cool > 0) return this.move(me, foe, gap, towardKey, awayKey);
    this.cool = Math.round((this.think + this.rng() * .08) * 120); for (const k in this.used) this.used[k] *= .93;
    // 2. punish a technique in recovery
    if (seen.tech && !seen.util && (seen.phase === 'recovery' || seen.recoil) && gap < 70 && this.rng() < this.readP + .1) {
      const fullIds = Object.keys(p.w).filter(id => KC.TECHS[id].full || KC.TECHS[id].pts[1] >= 500);
      const id = this.pickWeighted(me, gap, fullIds.length ? fullIds : null) || this.pickWeighted(me, gap); if (id) { this.thought = 'PUNISH ' + id; return this.begin(id, me, foe, 2); }
    }
    // 3. mistakes
    if (this.rng() < this.mistake * .5) { const id = KC.SCORING[Math.floor(this.rng() * KC.SCORING.length)].id; this.thought = 'MISTAKE ' + id; return this.begin(id, me, foe, 0); }
    // 4. proactive: throw something that reaches, or reposition
    if (this.rng() < this.aggr) {
      const id = this.pickWeighted(me, gap); if (id) { this.thought = 'ATTACK ' + id; return this.begin(id, me, foe, 0); }
    }
    if (p.crouch && this.rng() < p.crouch * .3) { this.plan = { posture: 'd', tech: null, ttl: 90, fired: true, delay: 0 }; return { posture: 'd', tech: null }; }
    if (this.rng() < p.pat) { this.walkT = 20 + Math.floor(this.rng() * 40); this.walkDir = this.rng() < .5 ? towardKey : awayKey; }
    return this.move(me, foe, gap, towardKey, awayKey);
  }
  counterTo(seen, me, foe, gap) {
    const p = this.p, h = seen.h, d = this.level >= 8 && p.habit;
    if (seen.air) return gap <= 24 && !seen.down ? 'upperPunch' : (seen.h === 'high' && this.rng() < .7 ? 'crouch' : null);
    if (h === 'low') return this.rng() < p.jump + .35 ? (this.rng() < .5 ? 'jumpSide' : 'jump') : (this.rng() < .5 ? 'frontFlip' : 'jump');
    if (h === 'high') return this.rng() < .7 ? 'crouch' : (gap < 40 ? 'squatPunch' : 'crouch');
    if (h === 'mid') return this.rng() < p.block + .15 ? 'block' : (gap > 24 ? 'backFlip' : 'block');
    return null;
  }
  begin(id, me, foe, delay) {
    const it = this.intentFor(id, me, foe);
    if (id === 'crouch') { this.plan = { posture: 'd', tech: null, ttl: 70, fired: true, delay: 0 }; return { posture: 'd', tech: null }; }
    if (id === 'jump') { this.plan = { posture: 'u', tech: null, ttl: 12, fired: true, delay: 0 }; return { posture: 'u', tech: null }; }
    this.plan = { posture: it.posture, tech: it.tech, ttl: 140, fired: false, delay };
    return { posture: it.posture, tech: null };
  }
  move(me, foe, gap, towardKey, awayKey) {
    const pref = this.p.gap;
    if (this.walkT > 0) { this.walkT--; return { posture: this.walkDir, tech: null }; }
    if (gap > pref + 10) return { posture: towardKey, tech: null };
    if (gap < pref - 14) return { posture: awayKey, tech: null };
    return { posture: 'n', tech: null };
  }
  /** attract mode: a cheating, showy AI that cycles every technique in range, with perfect reads */
  showcase(me, foe, bout, o) {
    const list = KC.SCORING.map(t => t.id).concat(['frontFlip', 'backFlip']), fd = foe.x >= me.x ? 1 : -1, towardKey = fd > 0 ? 'r' : 'l', awayKey = fd > 0 ? 'l' : 'r';
    if (this.plan) { const pl = this.plan; pl.ttl--; if (pl.ttl <= 0 || (me.state === 'tech' && pl.fired)) this.plan = null; else { const out = { posture: pl.posture, tech: null }; if (!pl.fired && pl.delay-- <= 0) { out.tech = pl.tech; pl.fired = true; } return out; } }
    if (me.state !== 'free') return { posture: 'n', tech: null };
    const id = (this.queue && this.queue.length ? this.queue[0] : null) || this.forced || list[this.showIdx % list.length], t = KC.TECHS[id], gap = o.gap;
    // reads: a perfect block of anything coming
    if (o.tech && !o.util && (o.phase === 'startup') && o.h !== 'low' && this.rng() < .5 && gap < 50 && !this.noBlock) return this.begin('block', me, foe, 0);
    if (t.util && gap < 90 && gap > 20 && this.rng() < .4) { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; return this.begin(id, me, foe, 0); }
    if (id === 'revPunch') { if (gap > 9) return { posture: towardKey, tech: null }; if (me.state === 'free') { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; return this.begin(id, me, foe, 0); } }
    if (this.inRange(id, gap, me) && gap >= t.reach[0] + 2 && this.rng() < .3) { if (this.queue && this.queue.length) this.queue.shift(); else this.showIdx++; this.forced = null; return this.begin(id, me, foe, 0); }
    if (gap > t.reach[1] * .7 + 6) return { posture: towardKey, tech: null };
    if (gap < t.reach[0] + 2) return { posture: awayKey, tech: null };
    return { posture: 'n', tech: null };
  }
}
KC.KarateAI = KarateAI;

/* ---- 34-hud.js ---- */
/* ---------- fight HUD: clock, point slots, round pips, score, calls, popups ---------- */
class FightHUD {
  constructor(bout, o = {}) {
    this.b = bout; this.o = o; this.call = null; this.pop = []; this.hint = null; this.names = o.names || [bout.f[0].name, bout.f[1].name]; this.tags = o.tags || ['WHITE', 'RED']; this.inputs = [];
    bout.on('call', c => { this.call = { id: c.id, t: KC.game.real, text: KC.callText(c.id) }; KC.onCall && KC.onCall(c, bout); });
    bout.on('point', p => { this.pop.push({ t: KC.game.real, text: (KC.game.settings.techNames !== false ? KC.TECHS[p.tech].name + ' ' : '') + p.pts + (p.counter ? ' COUNTER!' : ''), side: p.side, full: p.full }); });
  }
  draw(r) {
    const b = this.b, now = KC.game.real;
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2;
      // clock
      KC.panel(g, cx - 24, 4, 48, 26, { alpha: .8 });
      E.font.title(g, String(Math.ceil(b.clock)).padStart(2, '0'), cx, 8, { scale: 2, align: 'center', colors: b.clock < 6 ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 1 });
      // sides
      for (let s = 0; s < 2; s++) {
        const left = s === 0, pw = clamp(Math.floor((W - 64) / 2), 96, 150), al = left ? 'left' : 'right', col = left ? '#fff6e8' : '#ff7a6a';
        KC.panel(g, left ? 4 : W - 4 - pw, 4, pw, 40, { alpha: .6 });
        KC.text(g, up(this.names[s]).slice(0, Math.floor((pw - 12) / 6)), left ? 10 : W - 10, 8, col, { align: al }); KC.text(g, this.tags[s], left ? 14 + 20 * Math.ceil(T().pointsToWin) + 2 : W - 14 - 20 * Math.ceil(T().pointsToWin) - 2, 27, left ? '#b8b0d8' : '#ff9a8a', { align: al });
        const n = Math.ceil(T().pointsToWin);
        for (let i = 0; i < n; i++) {
          const x = left ? 12 + i * 20 : W - 12 - 16 - i * 20, y = 21, v = clamp(b.pts[s] - i, 0, 1);
          px.disc(g, x + 7, y + 7, 8, '#10101c'); px.disc(g, x + 7, y + 7, 6, '#2a2a40');
          if (v >= 1) px.disc(g, x + 7, y + 7, 6, col); else if (v > 0) { for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 0; xx++) if (xx * xx + yy * yy <= 36) px.dot(g, x + 7 + (left ? xx : -xx), y + 7 + yy, col); }
        }
        const rn = b.needRounds; if (rn > 1 || !b.single) for (let i = 0; i < rn; i++) { const x = left ? 12 + i * 10 : W - 22 - i * 10; px.disc(g, x + 3, 40, 3, '#10101c'); px.disc(g, x + 3, 40, 2, b.rounds[s] > i ? '#ffd060' : '#3a3a50'); }
      }
      // scores
      if (!this.o.hideScore) { KC.text(g, '1P ' + fmt(b.score[0]), 8, H - 14, '#fff6e8'); KC.text(g, 'HI ' + fmt(KC.hiScore ? KC.hiScore() : 0), W - 8, H - 14, '#ffd060', { align: 'right' }); }
      // calls: title font, big
      if (this.call && now - this.call.t < 1.4) {
        const k = now - this.call.t, sc = this.call.text.length > 13 ? 2 : 3, a = clamp(1.4 - k, 0, 1);
        px.blend(g, Math.min(1, a * 1.6), 'normal', () => E.font.title(g, this.call.text, cx, Math.round(H * .3), { scale: sc, align: 'center', colors: k < .1 ? ['#fff', '#fff', '#ffe8a0'] : GOLD, depth: 3 }));
      }
      this.pop = this.pop.filter(p => now - p.t < 1.6);
      for (const p of this.pop) {
        const k = now - p.t, sc = 1, w = E.font.width(p.text, { scale: sc }), lines = w > W - 24 ? E.font.wrap(p.text, Math.floor(W / 2 - 12), { scale: sc }) : [p.text], x = clamp(p.side === 0 ? W * .3 : W * .7, Math.min(W / 2, Math.max(...lines.map(l => E.font.width(l, { scale: sc }))) / 2 + 8), W - Math.max(...lines.map(l => E.font.width(l, { scale: sc }))) / 2 - 8);
        lines.forEach((l, i) => KC.text(g, l, Math.round(x), Math.round(H * .5 - k * 14 + i * 10), p.full ? '#ffe070' : '#fff', { align: 'center', scale: sc }));
      }
      if (b.phase === 'card') { const t = b.round; E.font.title(g, b.needRounds > 1 ? 'ROUND ' + t : 'BOUT', cx, Math.round(H * .42), { scale: 3, align: 'center', colors: GOLD, depth: 3 }); }
      if (this.hint) KC.text(g, this.hint, cx, H - 44, '#ffe8a0', { align: 'center' });
      if (KC.tuned()) KC.text(g, 'DEV', cx, 34, '#ff6a6a', { align: 'center' });
      if (this.o.inputDisplay || KC.game.settings.inputDisplay || KC.dev.showInput) this.drawInputs(g, r);
    });
  }
  drawInputs(g, r) {
    const rd = this.o.readers && this.o.readers[0]; if (!rd) return; let x = 8; const y = r.H - 40;
    for (const h of rd.hist.slice(-8)) { KC.text(g, (h.p === 'n' ? '' : h.p.toUpperCase()) + '+' + h.t.toUpperCase(), x, y, '#9ad8ff', { scale: 1 }); x += 36; }
  }
}
KC.FightHUD = FightHUD;
KC.callText = id => (KC.CALLS[id] || ['?', '?'])[KC.game.settings.calls === 'Japanese' ? 1 : 0];

/* ---- 35-stage.js ---- */
/* ---------- stages: backdrop, floor, props, crowd, lights, weather ---------- */
const hash2 = E.hash2 || ((a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; });
class Stage {
  constructor(data) {
    this.d = typeof data === 'string' ? KC.STAGE[data] : data;
    const s = this.d.sky; this.bg = new E.Backdrop(s.preset ? s.preset : s);
    this.crowd = []; const cr = this.d.crowd || { n: 0 };
    for (let i = 0; i < (cr.noSil ? 0 : cr.n || 0); i++) this.crowd.push({ x: -80 + (i + .5) * (560 / cr.n) + (hash2(i, 3) - .5) * 14, row: i % 3, h: 16 + hash2(i, 5) * 8, c: cr.palette[Math.floor(hash2(i, 7) * cr.palette.length)], ph: hash2(i, 9) * 6 });
    this.cheer = 0; this.shake = 0; this.t = 0;
    this.front = [];
    if (cr.n && !cr.seiza) for (let i = 0; i < 4; i++) { const x = -60 + i * 150 + 20 * hash2(i, 4); this.front.push({ x, rig: new E.Humanoid({ style: 'classic', size: 1.1, hair: ['short', 'spiky', 'ponytail'][i % 3], colors: { cloth: cr.palette[i % cr.palette.length], pants: '#2a2a3a' } }) }); }
    if (['bamboo', 'log', 'ship', 'market', 'fuji', 'stadium'].includes(this.d.id)) this.front.push({ x: 40, mei: true, rig: KC.makeRig(KC.FIGHTER.mei, 1, 'black5', 2.0) });   // Mei cheers from the front row of every stage after the harbor
    if (cr.seiza) for (let i = 0; i < Math.min(8, cr.n); i++) this.front.push({ x: -50 + i * 70, rig: new E.Humanoid({ style: 'classic', size: 1.05, hair: 'short', colors: { cloth: '#f2eee4', pants: '#f2eee4', belt: ['#f0c830', '#3aa050', '#2f5fd0', '#f4f4ee'][i % 4] } }), seiza: true });
  }
  react(kind) { this.cheer = Math.min(1, this.cheer + (kind === 'full' ? .9 : kind === 'half' ? .5 : .25)); }
  update(dt) {
    this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .45);
    for (const f of this.front) f.rig.update(dt, { x: f.x, y: 14, z: 0, facing: 0, vx: 0, vy: 0, pose: f.seiza ? 'kneel' : this.cheer > .35 ? 'cheer' : 'hips', expr: f.mei && this.cheer > .35 ? 'smile' : undefined });
    if (this.d.weather) game_.weather = this.d.weather;
  }
  floorY(r) { return Math.round(r.w(0, 0, 0)[1]); }
  draw(r, lights = true) {
    const g = r.ctx, d = this.d, W = r.bw, H = r.bh, floor = this.floorY(r), sx = x => r.w(x, 0, 0)[0], t = this.t;
    this.bg.draw(r);
    // ---- stage-specific backdrop pieces ----
    if (d.id === 'dojo') {   // shoji wall, beams, kamidana shelf
      px.rect(g, 0, floor - 92, W, 92, '#2a1a12'); const wallC = '#e8d4a0';
      for (let k = -4; k < 12; k++) { const x0 = Math.round(sx(k * 60) * .96 + W * .02); px.rect(g, x0, floor - 86, 54, 76, wallC); px.blend(g, .25, 'add', () => px.rect(g, x0, floor - 86, 54, 76, '#ffb060')); for (let i = 0; i <= 3; i++) px.rect(g, x0 + i * 18, floor - 86, 1, 76, '#5a3a22'); for (let j = 0; j <= 3; j++) px.rect(g, x0, floor - 86 + j * 25, 54, 1, '#5a3a22'); }
      px.rect(g, 0, floor - 96, W, 6, '#3a2418'); px.rect(g, 0, floor - 10, W, 10, '#4a2e1a');
      const sc = Math.round(sx(200)); px.rect(g, sc - 34, floor - 126, 68, 24, '#e8d8a8'); px.rect(g, sc - 34, floor - 126, 68, 2, '#6a2a1a'); px.rect(g, sc - 34, floor - 104, 68, 2, '#6a2a1a'); E.font.text(g, 'KARATE-DO', sc, floor - 119, '#14100c', { align: 'center', outline: false });
    }
    if (d.bamboo) {
      for (let k = 0; k < 40; k++) { const par = .35 + (k % 3) * .25, x = Math.round((sx(-120 + k * 18) - W / 2) * par + W / 2 + hash2(k, 1) * 8), w = 3 + (k % 3), col = ['#2c7a4a', '#3a9a5a', '#4aaa66'][k % 3]; px.rect(g, x, 0, w, floor, E.shade(col, -.15 * (2 - k % 3))); for (let y = 14 + (k * 7) % 18; y < floor; y += 34) px.rect(g, x - 1, y, w + 2, 2, E.shade(col, -.3)); }
      px.blend(g, .1, 'add', () => { for (let k = 0; k < 4; k++) px.poly(g, [[sx(40 + k * 100), 0], [sx(70 + k * 100), 0], [sx(10 + k * 100), floor], [sx(-20 + k * 100), floor]], '#ffffd0'); });
    }
    if (d.gorge) {   // cliffs, waterfall, gorge below the log
      const wx = Math.round(sx(80)); px.rect(g, wx - 6, floor - 120, 12, 100, '#cfe6f8'); for (let y = 0; y < 100; y += 6) px.rect(g, wx - 5 + ((y + Math.floor(t * 40)) % 8) / 2, floor - 120 + y, 2, 4, '#ffffff');
      px.blend(g, .3, 'normal', () => px.rect(g, 0, floor + 2, W, H - floor, '#2a3a5a'));
    }
    if (d.fuji) {   // Mount Fuji with a snow cap, behind the hills
      const fx = Math.round(sx(300) * .9 + W * .05), top = floor - 150; px.poly(g, [[fx - 120, floor - 40], [fx, top], [fx + 120, floor - 40]], '#6a6a9a'); px.poly(g, [[fx - 36, top + 36], [fx, top], [fx + 36, top + 36], [fx + 18, top + 28], [fx, top + 40], [fx - 18, top + 28]], '#f4f4ff');
    }
    if (d.torii) { const tx = Math.round(sx(330)); px.rect(g, tx - 30, floor - 90, 5, 90, '#d8402a'); px.rect(g, tx + 25, floor - 90, 5, 90, '#d8402a'); px.rect(g, tx - 40, floor - 96, 80, 7, '#d8402a'); px.rect(g, tx - 34, floor - 80, 68, 4, '#b82a1a'); px.rect(g, tx - 44, floor - 100, 88, 4, '#2a1a1a'); }
    if (d.shop) { const sx0 = Math.round(sx(300)); px.rect(g, sx0 - 70, floor - 88, 140, 88, '#4a2a22'); px.rect(g, sx0 - 70, floor - 88, 140, 8, '#8a2a22'); for (let k = 0; k < 7; k++) px.rect(g, sx0 - 60 + k * 20, floor - 78, 14, 44, k % 2 ? '#1a2a5a' : '#2a3a7a'); E.font.text(g, 'NOODLES', sx0, floor - 112, '#ffd060', { align: 'center', scale: 1, outline: false }); E.font.text(g, 'CHAMPON-TEI', sx0, floor - 98, '#ffe8a0', { align: 'center', outline: false }); }
    if (d.stadium) {   // tiered crowd, scoreboard, spotlights
      for (let tier = 0; tier < 5; tier++) { px.rect(g, 0, floor - 100 + tier * 14, W, 14, E.shade('#2a2a4a', -.06 * tier)); }
      px.rect(g, W / 2 - 70, floor - 150, 140, 36, '#08080f'); px.rect(g, W / 2 - 68, floor - 148, 136, 32, '#142a48'); E.font.text(g, "CHAMPON CUP '84", W / 2, floor - 140, '#ffd060', { align: 'center', outline: false }); E.font.text(g, 'GOLDEN BOWL FINAL', W / 2, floor - 128, '#e8f0ff', { align: 'center', outline: false });
      px.blend(g, .1, 'add', () => { for (const x of [.25, .5, .75]) px.poly(g, [[W * x - 4, 0], [W * x + 4, 0], [W * x + 60, floor], [W * x - 60, floor]], '#fff8d0'); });
    }
    if (d.cart) { const cx = Math.round(sx(380)); px.rect(g, cx - 16, floor - 26, 32, 20, '#8a3a22'); px.rect(g, cx - 20, floor - 34, 40, 8, '#d8402a'); px.disc(g, cx - 10, floor - 4, 5, '#2a1a12'); px.disc(g, cx + 10, floor - 4, 5, '#2a1a12'); }
    // ---- crowd silhouettes ----
    for (const p of this.crowd) {
      const par = [.7, .82, .94][p.row], x = Math.round((sx(p.x) - W / 2) * par + W / 2), bob = Math.abs(Math.sin(t * (3 + this.cheer * 6) + p.ph)) * (1 + this.cheer * 4), y = floor - 24 - p.row * 9 - p.h + 18 - bob - (d.stadium ? 10 : 0);
      const c = E.shade(p.c, -.12 * (2 - p.row)); px.rect(g, x - 5, y + 6, 10, p.h, c); px.disc(g, x, y + 3, 4, E.shade(c, .15));
      if (this.cheer > .3 && hash2(Math.floor(p.ph * 10), 1) > .5) { px.rect(g, x - 7, y - 4 - bob, 2, 8, c); px.rect(g, x + 5, y - 4 - bob, 2, 8, c); }
    }
    // ---- floor ----
    this.drawFloor(g, r, floor, sx, W, H);
    // ---- lights ----
    if (lights) { game_.lights.enabled = true; game_.lights.ambient = d.ambient; for (const [lx, lz, col] of d.lightsList || []) game_.lights.add(lx, 0, lz, 60, .3, { color: col }); }
    // ---- props and front crowd ----
    for (const [kind, x, y, z] of d.props) r.prop(kind, x, y, z, { size: kind === 'lantern' ? 1.3 : 1.4, light: false });
    if (d.id === 'ship') { /* sway handled by the camera */ }
    for (const f of this.front) r.actor(f.x, 14, 0, (gg, ox, oy) => f.rig.draw(gg, ox, oy, r.view), { every: 2, key: f });
  }
  drawFloor(g, r, floor, sx, W, H) {
    const d = this.d, [c1, c2] = d.floor, id = d.id;
    const mat = ['dojo', 'harbor', 'ship'].includes(id) ? 'planks' : ['market', 'fishmarket', 'fuji'].includes(id) ? 'stone' : id === 'stadium' ? 'mat' : id === 'log' ? 'bark' : 'earth';
    for (let y = floor; y < H; y++) { const k = (y - floor) / Math.max(1, H - floor); px.rect(g, 0, y, W, 1, E.mix(c1, c2, k)); }
    if (mat === 'planks') { for (let k = -14; k <= 36; k++) { const x0 = sx(k * 20); px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.5), H, E.shade(c2, -.25)); } px.rect(g, 0, floor, W, 1, E.shade(c1, .25)); }
    if (mat === 'stone') { for (let j = 0; j < 6; j++) { const y = floor + 3 + j * j * 1.4; px.rect(g, 0, Math.round(y), W, 1, E.shade(c2, -.25)); } for (let k = -10; k <= 30; k++) { const x0 = sx(k * 32); px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.7), H, E.shade(c2, -.2)); } }
    if (mat === 'mat') { px.rect(g, Math.round(sx(0)), floor, Math.round(sx(400) - sx(0)), 2, '#e8e8f4'); for (const x of [150, 250]) px.rect(g, Math.round(sx(x)) - 1, floor, 3, H - floor, x < 200 ? '#f4f4f4' : '#e8483a'); }
    if (mat === 'earth') { for (let i = 0; i < 90; i++) { const x = Math.floor(hash2(i, 2) * W), y = floor + 2 + Math.floor(hash2(i, 6) * (H - floor)); px.dot(g, x, y, E.shade(c1, hash2(i, 8) > .5 ? .15 : -.2)); } }
    if (mat === 'bark') { for (let y = floor; y < floor + 40; y += 5) px.rect(g, 0, y, W, 1, E.shade(c2, -.2)); px.rect(g, 0, floor, W, 3, E.shade(c1, .2)); }
    // marks
    for (const x of KC.ARENA.marks) { const mx = Math.round(sx(x)); px.rect(g, mx - 6, floor + 3, 12, 1, 'rgba(255,255,255,0.35)'.length ? '#d8d0c0' : '#fff'); }
    px.blend(g, .12, 'add', () => px.ell(g, Math.round(sx(200)), floor + 12, Math.round(W * .4), 9, '#ffe0a0'));
  }
}
KC.Stage = Stage;
let game_ = null;   // the Game, set at start

/* ---- 36-ui.js ---- */
/* ---------- 10-foot UI: big menus, hover + click, prompt bars ---------- */
const GOLD = ['#fff6d0', '#ffd060', '#e8782a'], PALE = '#e8e0ff';
class Menu {
  /** items: [{ label, onPick, disabled, sub }]; o: { y, scale, title, onCancel, x, w } */
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = Object.assign({ scale: 2, y: 90, x: 'center', gap: 4 }, o); this.rects = []; this._mt = -1; this.t = 0; }
  setItems(items) { this.items = items; this.i = clamp(this.i, 0, Math.max(0, items.length - 1)); this._skip(1); }
  _skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  get cur() { return this.items[this.i]; }
  /** returns true when it consumed a pick or cancel */
  update(dt, game = KC.game) {
    this.t += dt; const P = game._players || [game.input], I = P[0], n = this.items.length; if (!n) return false;
    this.layout(game.W, game.H); const any = f => P.some(f), old = this.i;
    if (any(p => p.repeat('up', .35, .12))) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (any(p => p.repeat('down', .35, .12))) { this.i = (this.i + 1) % n; this._skip(1); }
    { const p = I.pointer(); if (p && (p[0] !== this._px || p[1] !== this._py)) { this._px = p[0]; this._py = p[1]; const k = this.hit(p); if (k >= 0) this.i = k; } }
    const tap = this.hit(I.clicked()); if (tap >= 0) this.i = tap;
    if (this.i !== old) KC.sfx('menuMove');
    const left = any(p => p.repeat('left', .35, .12)), right = any(p => p.repeat('right', .35, .12));
    if ((left || right) && this.cur && this.cur.adjust) { this.cur.adjust(left ? -1 : 1); KC.sfx('menuMove'); }
    if ((any(p => p.pressed('confirm') || p.pressed('start')) || tap >= 0) && this.cur && !this.cur.disabled) { KC.sfx('menuOk'); P.forEach(p => p.consumeAll()); if (this.cur.onPick) this.cur.onPick(this.cur, this.i); else if (this.o.onPick) this.o.onPick(this.cur, this.i); return true; }
    if (any(p => p.pressed('cancel')) && this.o.onCancel) { KC.sfx('menuBack'); P.forEach(p => p.consumeAll()); this.o.onCancel(); return true; }
    return false;
  }
  hit(p) { if (!p) return -1; for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (r && p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) return k; } return -1; }
  // where the rows sit (also used for mouse hits before the first draw, and in tests): fills this.rects
  layout(RW, RH) {
    const o = this.o, sc = o.scale, lh = E.font.lineHeight() * sc + o.gap * sc, y = typeof o.y === 'function' ? o.y({ W: RW, H: RH }) : o.y;
    const n = this.items.length, vis = Math.min(n, o.max || n), top = clamp(this.i - Math.floor(vis / 2), 0, Math.max(0, n - vis));
    const labels = this.items.map(it => typeof it.label === 'function' ? it.label() : it.label), W = Math.max(...labels.map(l => E.font.width(l, { scale: sc })), 40) + 40, x0 = o.x === 'center' ? Math.round((RW - W) / 2) : o.x;
    this.rects = []; for (let k = top; k < top + vis; k++) this.rects[k] = this.items[k].disabled ? null : { x: x0, y: Math.round(y + (k - top) * lh) - 2, w: W, h: lh };
    return { o, sc, lh, y, n, vis, top, labels, W, x0 };
  }
  draw(r) {
    const L = this.layout(r.W, r.H), { o, sc, lh, y, n, vis, top, labels, W, x0 } = L;
    r.overlay(g => {
      if (o.title) { E.font.title(g, o.title, r.W / 2, y - 22 * (sc / 2), { scale: 2, align: 'center', colors: GOLD, depth: 2 }); }
      for (let k = top; k < top + vis; k++) {
        const it = this.items[k], l = labels[k], sel = k === this.i, yy = Math.round(y + (k - top) * lh);
        if (sel) { const pulse = .5 + .5 * Math.sin(this.t * 7); px.blend(g, .55 + .15 * pulse, 'normal', () => px.rect(g, x0, yy - 2, W, lh - 1, '#6a2a1a')); px.rect(g, x0, yy - 2, 3, lh - 1, '#ffd060'); E.font.text(g, '▸', x0 + 6, yy + (sc - 1), '#ffd060', { scale: sc, outline: false }); }
        E.font.text(g, l, r.W / 2, yy, it.disabled ? '#6a6488' : sel ? '#fff6d0' : '#cfc8e8', { scale: sc, align: 'center', shadow: '#000', outline: false });
      }
      if (top > 0) E.font.text(g, '↑', r.W / 2, y - 9, '#ffd060', { align: 'center', outline: false }); if (top + vis < n) E.font.text(g, '↓', r.W / 2, Math.round(y + vis * lh), '#ffd060', { align: 'center', outline: false });
      const cur = this.items[this.i], sub = cur && (typeof cur.sub === 'function' ? cur.sub() : cur.sub); if (sub) E.font.text(g, sub, r.W / 2, r.H - 34, '#ffd8a0', { align: 'center', shadow: '#000', outline: false });
    });
  }
}
KC.Menu = Menu;
// any input at all this step (keys, buttons, sticks past the dead zone, mouse move or click, touch)
KC.anyInput = (game = KC.game) => {
  const P = game._players || [game.input];
  return P.some(I => {
    const p = I.pointer(), moved = !!p && (p[0] !== I._kcPx || p[1] !== I._kcPy); if (p) { I._kcPx = p[0]; I._kcPy = p[1]; }
    return I.anyPressed() || moved || Math.hypot(I.padMove[0], I.padMove[1]) > .05 || !!I.padAim || !!I.clicked();
  });
};
// a panel with a big title, used by every simple screen
KC.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1c1236', '#0e0a20'], border: '#e8e4ff' }, o));
KC.title = (g, str, x, y, scale = 2, align = 'center') => E.font.title(g, str, x, y, { scale, align, colors: GOLD, depth: 2 });
KC.text = (g, str, x, y, color = PALE, o = {}) => E.font.text(g, str, x, y, color, Object.assign({ shadow: '#000', outline: false }, o));
KC.shadowText = KC.text;
// paged text helper for About/Credits
KC.wrap = (str, w, opt) => E.font.wrap(str, w, opt || {});

const simpleScene = (name, o) => { KC.scenes[name] = Object.assign({ view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false } }, o); };
const backDrop = (r, scn) => { scn.stage.draw(r); r.overlay(g => px.blend(g, .62, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d'))); };
const menuScene = (name, stageId, title, build, music = 'select') => simpleScene(name, {
  enter(d) { this.stage = new Stage(stageId); this.stage.d = Object.assign({}, this.stage.d, { ambient: .35 }); this.d = d || {}; this.menu = new Menu(build.call(this, this.d), { y: r => Math.round(r.H * .34), scale: 2, onCancel: () => this.back() }); KC.idle.t = 0; KC.music(music); KC.game.follow(null); KC.current = this; },
  back() { KC.game.go('title', { menu: true }); },
  update(dt) {
    this.stage.update(dt); KC.game.focus(200, 0, 50); if (KC.anyInput()) KC.idle.t = 0; else KC.idle.t += dt; if (KC.idle.t >= 10 && !SESSION) { KC.idle.t = 0; KC.game.go('attract'); return; }
    this.menu.update(dt); if (this.tick) this.tick(dt);
  },
  draw(r) { backDrop(r, this); r.overlay(g => KC.title(g, title, r.W / 2, 14, 3)); this.menu.draw(r); if (this.extra) this.extra(r); KC.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }
});

/* ---- 40-bonus.js ---- */
/* ---------- bonus games: Break the Boards, Pots Ahoy!, Stop the Bull ---------- */
const mkFoe = (x) => ({ x, z: 0, crouching: false, state: 'free', tech: null, stats: { reach: 1, speed: 1, walk: 1 }, hurtable: true, recoil: 0, phase: null, face: 1 });
class BonusBase {
  constructor(o) { this.o = o; this.t = 0; this.state = 'card'; this.score = 0; this.msg = null; this.msgT = 0; this.done = false; this.auto = !!o.auto; this.me = new Karateka('taro', 0, { belt: o.belt || 'white' }); this.me.reset(); this.foe = mkFoe(300); this.reader = o.reader || null; this.steps = 0; this.accum = 0; this.events = []; this.rng = E.rng((o.seed || 1) * 31 + 5); this.result = null; this.cardT = 1.6; }
  say(text, good) { this.msg = text; this.msgT = 1.3; this.msgGood = good !== false; }
  ctrl() { return this.reader ? this.reader.read() : { posture: 'n', tech: null, held: null }; }
  stepMe(c, k) { this.foe.x = this.me.x + this.me.face * 60; this.me.step(this.foe, { posture: c.posture, tech: k === 0 ? c.tech : null }); }
  finish(res) { this.state = 'result'; this.t = 0; this.result = res; if (res.perfect) { KC.sting('perfect'); } else KC.sting('victory'); }
}
/* ---- BREAK THE BOARDS ---- */
class Boards extends BonusBase {
  constructor(o) {
    super(o); const v = o.params || {}; this.n = v.n || 5; this.mat = KC.BONUS.boards.mats[v.mat || 0]; this.gauge = 0; this.over = 0; this.broken = 0; this.boards = Array.from({ length: this.n }, () => ({ alive: true, a: 0, vx: 0, vz: 0, rot: 0 })); this.hold = false; this.chopT = -1; this.power = 0; this.me.x = 170; this.me.mark = 170; this.flash = 0; this.autoTarget = 96; this.lastW = 0; this.me.face = 1;
  }
  get kiMul() { return T().kiSpeed; }
  update(dt, k0) {
    this.t += dt;
    if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'charge'; this.t = 0; } this.me.update(dt, this.foe); return; }
    const c = this.ctrl(); this.msgT -= dt;
    if (this.state === 'charge') {
      const hold = this.auto ? (this.gauge + (this.wob || 0)) < 96.5 : c.held === 'd';
      if (hold) { this.hold = true; this.gauge += 55 * this.kiMul * dt; this.wob = Math.sin(this.t * 2.2 * TAU) * 6; const g = this.gauge + this.wob; if (g > 100) { this.over += dt; if (this.over > .3) { this.say('TOO MUCH!', false); this.gauge = 60; this.over = 0; KC.sfx('bad'); } } else this.over = 0; }
      else if (this.hold) { this.hold = false; this.release(); }
      this.me.posePose = hold ? 'crouch' : null;
    } else if (this.state === 'chop') {
      this.chopT += dt; const u = clamp(this.chopT / .35, 0, 1);
      if (!this.hitFx && this.chopT > .12) { this.hitFx = true; this.breakBoards(); }
      if (this.chopT > .5) { this.state = 'after'; this.t = 0; }
    } else if (this.state === 'after') {
      if (this.t > 1.4) { const perfect = this.power >= 95; this.finish({ score: this.score, perfect, label: perfect ? 'PERFECT!' : this.broken >= this.n ? 'ALL BROKEN!' : this.broken === 0 ? 'WEAK!' : this.broken + ' BOARDS' }); }
    } else if (this.state === 'result') { if (this.t > 3) this.done = true; }
    // board halves fly
    for (const b of this.boards) if (!b.alive) { b.a += dt; b.vz -= 500 * dt; b.z = (b.z || 0) + b.vz * dt; b.x = (b.x || 0) + b.vx * dt; b.rot += dt * 6 * Math.sign(b.vx || 1); }
    const att = this.state === 'chop' ? { spec: Object.assign({}, E.MOVES.overhead, { wind: .1, active: .1, recover: .3 }), phase: this.chopT < .12 ? 'wind' : this.chopT < .3 ? 'active' : 'recover', u: clamp(this.chopT < .12 ? this.chopT / .12 : this.chopT < .3 ? (this.chopT - .12) / .18 : (this.chopT - .3) / .25, 0, 1) } : null;
    this.me.rig.update(dt, { x: this.me.x, y: 0, z: 0, facing: 0, vx: 0, vy: 0, attack: att || undefined, pose: this.state === 'charge' && this.hold ? 'crouch' : this.state === 'result' && this.result && this.result.perfect ? 'cheer' : undefined, stance: this.state === 'charge' && !this.hold ? 'guard' : undefined });
  }
  release() {
    this.power = clamp(this.gauge + (this.wob || 0), 0, 100); this.state = 'chop'; this.chopT = 0; this.hitFx = false; KC.sfx('whooshH'); KC.Voice.kiai(KC.FIGHTER.taro.voice, true);
  }
  breakBoards() {
    const perfect = this.power >= 95, cnt = perfect ? this.n : Math.min(this.n, Math.floor(this.power / 100 * (this.n + .99)));
    this.broken = cnt; let pts = cnt * 200 * this.mat[1]; if (perfect) pts += 2000; this.score += pts; this.slow = true;
    for (let i = 0; i < cnt; i++) { const b = this.boards[this.n - 1 - i]; b.alive = false; b.vx = (i % 2 ? 1 : -1) * (30 + i * 10); b.vz = 80 + i * 12; b.z = 0; b.x = 0; b.a = 0; }
    this.say(perfect ? 'PERFECT!' : cnt === 0 ? 'WEAK!' : cnt + (cnt === 1 ? ' BOARD!' : ' BOARDS!'), cnt > 0); KC.sfx(cnt ? 'boardCrack' : 'bad');
    if (cnt) { KC.game.particles.bits(240, 0, 20 + cnt * 6, 14 + cnt * 3, [this.mat[2], E.shade(this.mat[2], -.2), '#fff6d0']); KC.game.particles.dust(240, 0, 4, 8); KC.game.shake(perfect ? 4 : 2); if (cnt) KC.game.flash('#fff', .06); }
    if (perfect) KC.game.audio.sfx('bowlDing');
  }
  draw(r) {
    r.queue(240, 0, 0, g => {
      const sx = r.w(240, 0, 0); const base = Math.round(sx[1]), x = Math.round(sx[0]);
      px.rect(g, x - 20, base - 10, 14, 10, '#8a8a92'); px.rect(g, x + 6, base - 10, 14, 10, '#8a8a92'); px.rect(g, x - 20, base - 10, 14, 2, '#b8b8c0'); px.rect(g, x + 6, base - 10, 14, 2, '#b8b8c0');
      let y = base - 14;
      this.boards.forEach((b, i) => { if (b.alive) { px.rect(g, x - 24, y - 5, 48, 5, E.shade(this.mat[2], -.25)); px.rect(g, x - 24, y - 5, 48, 3, this.mat[2]); px.rect(g, x - 24, y - 5, 48, 1, E.shade(this.mat[2], .25)); y -= 5; } });
      this.boards.forEach((b, i) => { if (!b.alive) { const yy = base - 14 - 5 * (this.n - 1 - i) - (b.z || 0) * 0 ; const bx = x + (b.x || 0), by = Math.round(yy - 5 - (b.z || 0)); if (by < base + 20) { px.rect(g, bx - 24 - Math.abs(b.x || 0) * .3, by, 22, 4, this.mat[2]); px.rect(g, bx + 2 + Math.abs(b.x || 0) * .3, by + 2, 22, 4, E.shade(this.mat[2], -.2)); } } });
    });
    this.me.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      // the KI gauge beside the fighter
      const gx = Math.round(r.w(120, 0, 0)[0]), gy = Math.round(r.w(120, 0, 0)[1]) - 80; px.rect(g, gx, gy, 10, 72, '#05040a'); px.rect(g, gx + 1, gy + 1, 8, 70, '#1a1a2a');
      const fill = clamp(this.gauge, 0, 100) / 100 * 68; px.rect(g, gx + 1, Math.round(gy + 69 - fill), 8, Math.round(fill), this.gauge >= 95 && this.gauge <= 100 ? '#ffe070' : this.gauge > 100 ? '#ff5a4a' : '#5ad8a0');
      px.rect(g, gx - 2, gy + 3, 14, 1, '#ffe070'); KC.text(g, 'KI', gx + 5, gy - 10, '#ffd060', { align: 'center' });
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8');
      if (this.state === 'charge') KC.text(g, 'HOLD ' + (KC.family() === 'key' ? 'K' : KC.family() === 'xbox' ? 'R STICK DOWN OR A' : 'R STICK DOWN OR ✕') + ' TO BREATHE IN, RELEASE TO CHOP', W / 2, H - 46, '#ffe8a0', { align: 'center' });
    });
  }
}
/* ---- POTS AHOY! ---- */
const LANES = { high: 52, mid: 36, low: 10 };
class Pots extends BonusBase {
  constructor(o) {
    super(o); const rng = E.rng(((o.visit || 1) * 97) + 3); this.me.x = 200; this.me.mark = 200; this.seq = [];
    const kinds = ['clay', 'clay', 'bonsai', 'boulder', 'bowl', 'clay', 'bonsai', 'boulder'], lanes = ['high', 'mid', 'low'];
    for (let i = 0; i < KC.BONUS.pots.count; i++) { let k = kinds[Math.floor(rng() * kinds.length)]; if (i === 3 || i === 9) k = 'bowl'; if (i === 0) k = 'clay'; this.seq.push({ kind: k, lane: lanes[Math.floor(rng() * 3)], side: rng() < .5 ? -1 : 1 }); }
    this.objs = []; this.spawned = 0; this.handled = 0; this.nextAt = 1.2; this.hit = false; this.hurt = false; this.ptsBreak = 0;
  }
  speed() { const k = this.spawned / 15; return lerp(150, 230, clamp(k, 0, 1)) * T().potSpeed; }
  interval() { return lerp(1.4, .8, clamp(this.spawned / 15, 0, 1)) / T().potSpeed; }
  update(dt) {
    this.t += dt; if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'play'; this.t = 0; } this.me.update(dt, this.foe); return; }
    this.msgT -= dt;
    if (this.state === 'play') {
      const steps = Math.max(1, Math.round(dt * 120)), c = this.auto ? this.autoCtrl() : this.ctrl();
      for (let k = 0; k < steps; k++) { this.stepMe(c, k); this.stepObjs(1 / 120); }
      this.me.update(dt, this.foe);
      if (this.spawned < this.seq.length && this.t >= this.nextAt) { const s = this.seq[this.spawned++]; this.objs.push({ kind: s.kind, lane: s.lane, side: s.side, x: s.side > 0 ? 440 : -40, vx: 0, tele: .7, live: false, id: this.spawned }); this.nextAt = this.t + this.interval(); }
      if (this.hit) { this.state = 'hit'; this.t = 0; this.say('OUCH! POT HIT YOU', false); KC.sfx('bad'); this.me.posePose = 'down'; this.me.downW = 1; }
      else if (this.spawned >= this.seq.length && this.handled >= this.seq.length) { const perfect = true; this.score += 3000; this.say('PERFECT! +3000', true); KC.sting('perfect'); this.finish({ score: this.score, perfect: true, label: 'PERFECT!' }); }
    } else if (this.state === 'hit') { this.me.rig.update(dt, { x: this.me.x, y: 0, z: 0, facing: 0, vx: 0, vy: 0, down: 1 }); if (this.t > 1.6) this.finish({ score: this.score, perfect: false, label: this.handled + '/' + this.seq.length }); }
    else if (this.state === 'result') { this.me.update(dt, this.foe); if (this.t > 3) this.done = true; }
    this.objs = this.objs.filter(o => !o.dead);
  }
  autoCtrl() {
    const me = this.me, o = this.objs.filter(q => !q.dead && q.live).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0]; const out = { posture: 'n', tech: null };
    const tele = this.objs.filter(q => !q.dead && !q.live)[0];
    if (!o) { if (tele) { me.face = tele.side; } return out; }
    const d = Math.abs(o.x - me.x) - PUSH; me.face = o.side; const toward = o.side > 0 ? 'r' : 'l', away = o.side > 0 ? 'l' : 'r';
    if (me.state !== 'free') return out;
    if (o.kind === 'bowl') { if (d < 55) return { posture: away, tech: toward }; return out; }   // block catches it
    if (o.kind === 'boulder') { if (d < 70) { if (o.lane === 'low') return { posture: 'u', tech: null }; if (o.lane === 'high') return { posture: 'd', tech: null }; return { posture: 'u', tech: null }; } return out; }
    if (d < 36) return { posture: 'n', tech: o.lane === 'high' ? 'u' : o.lane === 'mid' ? toward : 'd' };
    return out;
  }
  stepObjs(dt) {
    const me = this.me;
    for (const o of this.objs) {
      if (o.dead) continue; if (!o.live) { o.tele -= dt; if (o.tele <= 0) { o.live = true; o.vx = -o.side * this.speed(); KC.sfx('whooshL'); } continue; }
      o.x += o.vx * dt; o.rot = (o.rot || 0) + dt * 8; const z = LANES[o.lane], d = o.x - me.x;
      // broken by an active technique of its height
      if (me.tech && me.phase === 'active' && !me.tech.util && !me.hitDone && me.face === o.side) {
        const reach = PUSH / 2 + me.tech.reach[1] * me.stats.reach + 10, hgt = me.tech.height, okH = hgt === (o.lane === 'high' ? 'high' : o.lane === 'mid' ? 'mid' : 'low') || (me.tech.rising && o.lane === 'high') || (me.tech.hitsCrouch && o.lane === 'low');
        if (Math.abs(d) < reach && okH && o.kind !== 'boulder' && (o.kind !== 'bonsai' || me.tech.limb === 'foot')) { me.hitDone = true; this.breakObj(o); continue; }
      }
      if (me.tech && me.tech.id === 'block' && me.t < me.fr[0] + me.fr[1] && Math.abs(d) < PUSH / 2 + 24 && o.kind === 'bowl' && me.face === o.side) { o.dead = true; this.handled++; this.score += 1000; this.say('NICE CATCH! +1000', true); KC.sfx('bowlDing'); KC.game.particles.glints(o.x, 0, 40, 8, '#ffe070'); continue; }
      if (Math.abs(d) < 12) {
        if (o.kind === 'bowl') { o.dead = true; this.handled++; KC.sfx('bowlSplash'); KC.game.particles.smoke(o.x, 0, 20, 6); continue; }
        const evade = o.kind === 'boulder' ? (o.lane === 'low' ? me.z > 14 : o.lane === 'high' ? (me.crouching || (me.tech && me.tech.roll)) : (me.z > 30 || (me.tech && me.tech.flip && me.z > 20))) : (o.lane === 'high' ? (me.crouching || (me.tech && me.tech.roll)) : o.lane === 'low' ? me.z > 14 : false);
        if (evade) { o.passed = true; } else if (!o.passed) { o.dead = true; this.hit = true; KC.game.particles.impact(o.x, 0, z, 1.2, '#ffe070'); KC.game.shake(3); continue; }
      }
      if (o.x < -60 || o.x > 460) { o.dead = true; if (!o.counted) { this.handled++; } }
    }
  }
  breakObj(o) {
    o.dead = true; this.handled++; const z = LANES[o.lane];
    if (o.kind === 'bowl') { this.score -= 500; this.say('MOTTAINAI! -500', false); KC.sfx('bowlSplash'); KC.game.particles.smoke(o.x, 0, z, 8); }
    else { this.score += 200; KC.sfx('potShatter'); KC.game.particles.bits(o.x, 0, z, 14, o.kind === 'bonsai' ? ['#a85a3a', '#4a9a4a', '#6a3a22'] : ['#c87a4a', '#a85a3a', '#e8a070']); KC.game.particles.impact(o.x, 0, z, .9, '#fff'); this.say('+200', true); }
  }
  draw(r) {
    for (const o of this.objs) { if (!o.live) continue; r.queue(o.x, 0, LANES[o.lane], g => { const [x, y] = r.w(o.x, 0, LANES[o.lane]), X = Math.round(x), Y = Math.round(y);
      if (o.kind === 'boulder') { px.disc(g, X, Y, 8, '#4a4a54'); px.disc(g, X - 2, Y - 2, 6, '#7a7a86'); px.dot(g, X + 2 + Math.round(Math.sin(o.rot) * 3), Y, '#2a2a30'); }
      else if (o.kind === 'bowl') { px.ell(g, X, Y + 2, 8, 4, '#f4f0e0'); px.rect(g, X - 8, Y - 3, 16, 6, '#f4f0e0'); px.rect(g, X - 8, Y - 3, 16, 2, '#d8402a'); px.ell(g, X, Y - 3, 7, 2, '#f0b040'); px.dot(g, X + Math.round(Math.sin(o.rot) * 2), Y - 8, '#fff'); }
      else { px.ell(g, X, Y, 7, 7, o.kind === 'bonsai' ? '#a85a3a' : '#c87a4a'); px.rect(g, X - 6, Y - 7, 12, 3, E.shade(o.kind === 'bonsai' ? '#a85a3a' : '#c87a4a', -.2)); if (o.kind === 'bonsai') { px.disc(g, X, Y - 10, 5, '#4a9a4a'); px.disc(g, X - 3, Y - 12, 3, '#6aba5a'); } px.dot(g, X + Math.round(Math.cos(o.rot) * 3), Y + 2, '#6a3a22'); } }); }
    this.me.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      for (const o of this.objs) if (!o.live) { const [, y] = r.w(0, 0, LANES[o.lane]), edge = o.side > 0 ? W - 10 : 10, blink = Math.floor(KC.game.real * 10) % 2; if (blink) { px.poly(g, [[edge + o.side * 6, y], [edge - o.side * 4, y - 7], [edge - o.side * 4, y + 7]], o.kind === 'bowl' ? '#ffd060' : o.kind === 'boulder' ? '#9a9aa8' : '#ff6a4a'); KC.text(g, o.kind === 'boulder' ? 'DODGE' : o.kind === 'bowl' ? 'BLOCK' : o.lane === 'high' ? 'HIGH' : o.lane === 'mid' ? 'MID' : 'LOW', edge - o.side * 24, y - 3, '#fff', { align: 'center' }); } }
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8'); KC.text(g, 'OBJECTS ' + Math.min(this.handled, 16) + '/' + this.seq.length, W - 8, H - 14, '#ffd060', { align: 'right' });
    });
  }
}
/* ---- STOP THE BULL ---- */
class Bull {
  constructor() { this.x = 520; this.state = 'idle'; this.t = 0; this.phase = 0; this.stars = 0; this.face = -1; this.leg = 0; this.eye = '#201010'; }
  update(dt, speed) { this.t += dt; if (this.state === 'charge') { this.x -= speed * dt; this.phase += dt * speed / 22; } else if (this.state === 'walkBack') { this.x += 70 * dt; this.phase += dt * 3; } else this.phase += dt * 1; }
  draw(r, o = {}) {
    const g = r.ctx, [sx, sy] = r.w(this.x, 0, 0), X = Math.round(sx), Y = Math.round(sy), dir = this.face, charge = this.state === 'charge', ph = this.phase;
    const tones = E.tones('#7a4a34');
    r.shadow(this.x, 0, 28, .5);
    r.queue(this.x, 0, 0, gg => {
      const legs = [[-24, 0], [-14, .5], [18, .25], [28, .75]];
      for (const [lx, off] of legs) { const sw = charge ? Math.sin((ph + off) * TAU) : this.state === 'walkBack' ? Math.sin((ph + off) * TAU) * .5 : 0, fx = X + dir * lx, up = Math.max(0, -Math.cos((ph + off) * TAU)) * (charge ? 8 : 3); px.line(gg, fx, Y - 22, fx + Math.round(sw * 8), Y - Math.round(up), tones.sh, 3); px.rect(gg, fx + Math.round(sw * 8) - 2, Y - Math.round(up) - 1, 5, 3, '#1a1010'); }
      const bob = charge ? Math.round(Math.sin(ph * TAU * 2) * 1.5) : 0;
      px.ell(gg, X, Y - 32 + bob, 36, 16, tones.base); px.ell(gg, X + dir * 6, Y - 36 + bob, 28, 10, tones.lt); px.ell(gg, X - dir * 8, Y - 27 + bob, 22, 6, E.shade('#7a4a34', -.1));
      const hx = X + dir * (charge ? 40 : 38), hy = Y - 34 + bob + (charge || this.state === 'paw' ? 6 : -2);
      px.ell(gg, X + dir * 28, Y - 36 + bob, 12, 10, tones.base);
      px.ell(gg, hx, hy, 12, 9, tones.base); px.ell(gg, hx + dir * 8, hy + 4, 6, 5, '#8a5a4a'); px.dot(gg, hx + dir * 10, hy + 6, '#e8c8b8'); px.line(gg, hx + dir * 12, hy + 7, hx + dir * 12, hy + 11, '#d8c860', 1);
      px.poly(gg, [[hx - dir * 2, hy - 6], [hx + dir * 4, hy - 14], [hx + dir * 10, hy - 11], [hx + dir * 3, hy - 8]], '#e8dcc0');
      px.dot(gg, hx + dir * 4, hy - 1, charge ? '#ff3a2a' : '#201010'); px.dot(gg, hx + dir * 5, hy - 1, charge ? '#ff8a6a' : '#201010');
      const tl = X - dir * 32, tw = Math.round(Math.sin(this.t * 6) * 4); px.line(gg, tl, Y - 36 + bob, tl - dir * 6 + tw, Y - 22, tones.sh, 2); px.disc(gg, tl - dir * 6 + tw, Y - 21, 2, '#1a1010');
      if (this.state === 'stopped') for (let k = 0; k < 3; k++) { const a = this.t * 5 + k * 2.1; E.font.text(gg, '★', Math.round(hx + Math.cos(a) * 14), Math.round(hy - 18 + Math.sin(a) * 3), '#ffe070', { outline: false, align: 'center' }); }
    }, o);
    if ((charge || this.state === 'paw') && KC.game.particles) { if (Math.floor(this.t * 30) % 5 === 0) KC.game.particles.smoke(this.x + this.face * 44, 0, 28, 1, { size: .6 }); }
  }
}
class BullStage extends BonusBase {
  constructor(o) {
    super(o); this.bull = new Bull(); this.me.x = 130; this.me.mark = 130; this.charges = KC.BONUS.bull.charges; this.k = 0; this.sub = 'pause'; this.subT = 1.4; this.speeds = [150, 190, 240]; this.hits = 0; this.perfects = 0; this.trample = 0; this.dizzy = 0; this.me.face = 1;
  }
  update(dt) {
    this.t += dt; if (this.state === 'card') { this.cardT -= dt; if (this.cardT <= 0) { this.state = 'play'; this.t = 0; } this.me.update(dt, this.foe); return; }
    this.msgT -= dt; const B = this.bull;
    if (this.state === 'play') {
      const c = this.auto ? this.autoCtrl() : this.ctrl(), steps = Math.max(1, Math.round(dt * 120)), sp = this.speeds[Math.min(2, this.k)] * T().bullSpeed;
      this.subT -= dt;
      if (this.sub === 'pause' && this.subT <= 0) { this.sub = 'paw'; this.subT = 1.2; B.state = 'paw'; KC.sfx('bullSnort'); this.pawN = 0; }
      else if (this.sub === 'paw') { const n = Math.floor((1.2 - this.subT) / .4); if (n > (this.pawN || 0)) { this.pawN = n; KC.sfx('bullStomp'); KC.game.shake(1); } if (this.subT <= 0) { this.sub = 'charge'; B.state = 'charge'; KC.sfx('bullBellow'); } }
      else if (this.sub === 'dizzy') { B.state = 'stopped'; if (this.subT <= 0) { this.sub = 'walk'; B.state = 'walkBack'; } }
      else if (this.sub === 'walk' && B.x > 520) { this.k++; if (this.k >= this.charges) { this.finishAll(); } else { this.sub = 'pause'; this.subT = 1; B.state = 'idle'; } }
      B.update(dt, sp);
      for (let k = 0; k < steps; k++) {
        this.stepMe(c, k);
        if (this.sub === 'charge') {
          const me = this.me, head = B.x - 44, dist = head - (me.x + PUSH / 2);
          if (me.tech && me.phase === 'active' && !me.hitDone && !me.tech.util) {
            if (dist >= 8 && dist <= 40 && me.tech.bull) { me.hitDone = true; this.stop(Math.abs(dist - 24) <= 6); }
            else if (dist < 40) { me.hitDone = true; }
          }
          if (this.sub === 'charge' && dist < 4 && !(me.z > 36)) { this.trampled(); break; }
          if (this.sub === 'charge' && dist < -40) { /* jumped clean over */ B.state = 'walkBack'; this.sub = 'walk'; this.say('MISSED IT!', false); B.x += 5; }
        }
      }
      this.me.update(dt, this.foe);
    } else if (this.state === 'trample') { this.trample += dt; this.me.rig.update(dt, { x: this.me.x + this.trample * 80, y: 0, z: Math.max(0, 40 * Math.sin(Math.min(1, this.trample * 1.2) * Math.PI)), facing: 0, vx: 0, vy: 0, down: clamp(this.trample * 2, 0, 1), flip: clamp(this.trample * 1.2, 0, .95) }); B.update(dt, 0); B.state = 'walkBack'; if (this.trample > 1.8) this.finish({ score: this.score, perfect: false, label: 'TRAMPLED!' }); }
    else if (this.state === 'result') { this.me.update(dt, this.foe); B.update(dt, 0); if (this.t > 3) this.done = true; }
  }
  autoCtrl() { const me = this.me, B = this.bull, c = { posture: 'n', tech: null }; if (this.sub !== 'charge') return c; const dist = B.x - 44 - (me.x + PUSH / 2), fire = dist < 24 + 92 * (B.state === 'charge' ? this.speeds[Math.min(2, this.k)] / 240 : 1) * .35; if (me.state === 'free' && dist < 24 + this.autoLead()) return { posture: 'd', tech: 'u' }; return c; }
  autoLead() { const sp = this.speeds[Math.min(2, this.k)] * T().bullSpeed; return sp * (8 / 120 + 7 / 120); }
  stop(perfect) { this.sub = 'dizzy'; this.subT = 1.5; this.bull.state = 'stopped'; this.score += 3000 + (perfect ? 1000 : 0); this.say(perfect ? 'PERFECT THUD! +4000' : 'THUD! +3000', true); KC.sfx('bullThud'); KC.sfx('dizzy'); KC.game.particles.impact(this.bull.x - 44, 0, 36, 1.5, '#ffe070'); KC.game.shake(4); this.hits++; if (perfect) this.perfects++; }
  trampled() { this.state = 'trample'; this.trample = 0; this.say('TRAMPLED!', false); KC.sfx('bullThud'); KC.sfx('bad'); this.bull.state = 'charge'; }
  finishAll() { const perfect = this.perfects >= this.charges; this.finish({ score: this.score, perfect, label: this.hits + '/' + this.charges + ' STOPPED' }); }
  draw(r) {
    this.bull.draw(r); this.me.draw(r);
    r.overlay(g => { const W = r.W, H = r.H; KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8'); KC.text(g, 'CHARGE ' + Math.min(this.k + 1, this.charges) + '/' + this.charges, W - 8, H - 14, '#ffd060', { align: 'right' });
      if (this.sub === 'charge' || this.sub === 'paw') KC.text(g, 'STRIKE WHEN THE HORNS ARE CLOSE: UPPER PUNCH, FRONT KICK, BACK KICK, LUNGE', W / 2, H - 46, '#ffe8a0', { align: 'center' }); });
  }
}
KC.Bonus = { Boards, Pots, BullStage };
KC.scenes.bonus = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; const kind = d.kind || 'boards', st = KC.BONUS[kind].stage; this.stage = new Stage(d.stage || st); KC.game.follow(null); this.visit = (KC.store.get('kc:visits', 0) | 0) + 1; KC.store.set('kc:visits', this.visit);
    const o = { reader: d.auto ? null : new Reader(KC.game.input), auto: !!d.auto || !!KC.autopilot, params: d.params, visit: d.visit || this.visit, belt: KC.Story && KC.Story.s ? KC.BELTS[KC.Story.s.belt].id : 'white' };
    this.g = kind === 'boards' ? new Boards(o) : kind === 'pots' ? new Pots(o) : new BullStage(o); this.kind = kind; KC.music('bonus'); this.spoke = false; this.end = false; KC.current = this; this.camX = 200;
  },
  update(dt) {
    const G = this.g; this.stage.update(dt); KC.game.focus(200, 0, 52);
    if (!this.spoke) { this.spoke = true; KC.speakLine('genkotsu', 'BONUS STAGE!'); KC.sfx('gong'); }
    KC.devPoll(); if (KC.overlayStep(dt)) return; if (KC.dev.open) { KC.devUpdate(dt, this); return; }
    G.update(dt); if (G.msgT > 0 && G.msg && G.msgShown !== G.msg + G.msgT.toFixed(0)) { /* voices */ }
    if (G.done && !this.end) { this.end = true; this.finish(); }
  },
  finish() {
    const G = this.g, d = this.d, score = G.score; KC.cab && 0;
    if (d.onEnd) { d.onEnd(score, G.result); return; }
    if (d.story) { KC.Story.s.score += Math.max(0, score); KC.Story.s.node++; KC.save.write(KC.Story.s); KC.game.go('road'); }
    else KC.finishRun(Math.max(0, score), this.kind, () => KC.game.go('bonusMenu'));
  },
  draw(r) {
    const G = this.g; this.stage.draw(r); G.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, T0 = KC.BONUS[this.kind].title;
      if (G.state === 'card') { px.blend(g, .5, 'normal', () => px.rect(g, 0, H * .3, W, 60, '#05040a')); KC.title(g, 'BONUS STAGE!', W / 2, Math.round(H * .3) + 8, 2); KC.title(g, up(T0) + '!'.slice(0, T0.endsWith('!') ? 0 : 1), W / 2, Math.round(H * .3) + 30, 2); }
      if (G.msgT > 0 && G.msg) E.font.title(g, G.msg, W / 2, Math.round(H * .26), { scale: 2, align: 'center', colors: G.msgGood ? GOLD : ['#fff', '#ff8a6a', '#e0302a'], depth: 2 });
      if (G.state === 'result' && G.result) { px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, G.result.label, W / 2, H / 2 - 24, 3); KC.text(g, 'SCORE ' + fmt(G.score), W / 2, H / 2 + 8, '#fff', { align: 'center', scale: 2 }); }
      if (KC.tuned()) KC.text(g, 'DEV', W / 2, 6, '#ff6a6a', { align: 'center' });
    });
    if (KC.dev.open) KC.drawDev(r, this);
    KC.overlayDraw(r);
  }
};

/* ---- 43-drill.js ---- */
/* ---------- Senpai's drill: watch, then do. It doubles as the tutorial ---------- */
KC.scenes.practice = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; const L = KC.LESSONS[d.lesson || 'ALL']; this.lesson = L; this.stage = new Stage(d.stage || 'dojo'); this.i = 0; this.misses = 0; this.score = 0; this.good = 0; this.state = 'intro'; this.t = 0; this.msg = ''; this.msgT = 0; this.results = [];
    this.me = new Karateka('taro', 0, { belt: KC.Story && KC.Story.s ? KC.BELTS[KC.Story.s.belt].id : 'white' }); this.sen = new Karateka('negi', 1, { belt: 'black1' }); this.me.reset(); this.sen.reset(); this.reader = new Reader(KC.game.input);
    this.talk = null; KC.music('practice'); KC.game.follow(null); this.hist = { crouch: 0 }; this.spoke = false; this.sparring = false; KC.current = this; this.demoT = 0;
    this.say('negi', L.intro);
  },
  say(who, text) { this.line = { who, text, t: 0 }; KC.speakLine(who, text); },
  drill_() { return KC.TECHS[this.lesson.drills[this.i]]; },
  begin(state) { this.state = state; this.t = 0; this.autoFired = false; this.autoHold = 0; this.pressed = null; this.me.endTech(); this.sen.endTech(); this.me.reset(); this.sen.reset(); this.sen.face = -1; this.me.crouching = false; this.senX = this.drill_() && this.drill_().id === 'revPunch' ? 150 + PUSH + 6 : 250; this.sen.x = this.senX; },
  update(dt) {
    KC.devPoll(); if (KC.overlayStep(dt)) return; if (KC.dev.open) { KC.devUpdate(dt, this); this.stage.update(dt); return; } const g = KC.game, I = g.input; this.t += dt; this.msgT -= dt; if (this.line) this.line.t += dt; this.stage.update(dt); g.focus(200, 0, 50);
    const steps = Math.min(4, Math.max(1, Math.round(dt * 120))); const dr = this.drill_();
    if (I.pressed('start') && this.state !== 'done') { I.consumeAll(); this.skip(); return; }
    for (let k = 0; k < steps; k++) {
      let c = this.reader.read(); if (KC.autopilot && this.state === 'now' && this.nowAt > .3 && this.me.state === 'free' && !this.autoFired) { this.autoFired = true; const it = KC.KarateAI.prototype.intentFor.call(null, this.drill_().id, this.me, this.sen); c = { posture: it.posture, tech: it.tech }; if (this.drill_().id === 'jump') c = { posture: 'u', tech: null }; if (this.drill_().id === 'crouch') c = { posture: 'd', tech: null }; this.autoHold = this.drill_().id === 'crouch' ? 40 : 4; this.autoC = c; } else if (KC.autopilot && this.state === 'now' && this.autoHold > 0) { this.autoHold--; c = this.autoC; } const tch = k === 0 ? c.tech : null;
      if (this.state === 'now' || this.state === 'done') this.me.step(this.sen, { posture: c.posture, tech: tch }); else this.me.step(this.sen, null);
      this.sen.step(this.me, null);
      this.sen.face = -1; this.sen.x = this.senX || this.sen.mark; if (this.state !== 'done') { this.me.x = clamp(this.me.x, 40, 330); }
      if (Math.abs(this.sen.x - this.me.x) < PUSH) this.me.x = this.sen.x - PUSH;
    }
    this.me.update(dt, this.sen); this.sen.update(dt, this.me);
    if (this.state === 'intro' && this.t > 1.6) { this.begin('watch'); this.say('negi', 'WATCH.'); }
    else if (this.state === 'watch') {
      if (this.t > .8 && !this.sen.tech && !this.demoed) { this.demoed = true; this.demoT = this.t; const t = dr; this.sen.start(t.id, this.me, t.input[0] === 'n' ? 'n' : 'x', null); if (t.id === 'crouch') this.sen.crouching = true; }
      if (this.demoed && !this.sen.tech && this.t > this.demoT + .3 && !this.sen.crouching || (this.demoed && this.sen.crouching && this.t > this.demoT + 1.2)) { this.demoed = false; this.sen.crouching = false; this.begin('now'); this.say('negi', 'NOW YOU.'); this.nowAt = 0; }
    } else if (this.state === 'now') {
      this.nowAt += dt; const me = this.me;
      let did = null;
      if (me.tech && me.t === 1 && me.lastTech) did = me.lastTech;
      if (dr.id === 'crouch') { if (me.crouching) { this.hist.crouch += dt; } else this.hist.crouch = 0; if (this.hist.crouch > .25) did = 'crouch'; }
      if (did) { if (did === dr.id) this.success(); else this.fail(); }
      else if (this.nowAt > 4) this.fail(true);
      if (this.state === 'now' && me.state === 'free' && this.nowAt > 4.2) this.fail(true);
    } else if (this.state === 'result') {
      if (this.t > 1.4) { this.i++; if (this.i >= this.lesson.drills.length) this.finish(); else { this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); this.misses = 0; } }
    } else if (this.state === 'wait') {
      if (this.t > 1.3) { this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); }
    } else if (this.state === 'done') { if (this.t > 2.5 && (I.pressed('confirm') || I.clicked())) { I.consumeAll(); this.leave(); } }
    // free movement is locked during watch; clean up
    if (this.state === 'watch') { this.me.x = this.me.mark; }
  },
  success() { const sharp = this.nowAt < 50 / 60 * 1.0 + 0; const pts = sharp ? 400 : 200; this.score += pts; this.good++; this.msg = sharp ? 'SHARP! +' + pts : 'GOOD! +' + pts; this.msgT = 1.3; this.results.push(sharp); KC.sfx('good'); this.state = 'result'; this.t = 0; this.say('negi', sharp ? 'SHARP!' : 'GOOD!'); KC.game.particles.glints(this.me.x, 0, 40, 8, '#ffe070'); },
  fail(timeout) { this.misses++; this.msg = 'NO. WATCH AGAIN.'; this.msgT = 1.3; KC.sfx('bad'); this.state = 'wait'; this.t = 0; this.say('negi', 'NO. WATCH AGAIN.'); },
  skip() { this.i++; this.misses = 0; if (this.i >= this.lesson.drills.length) { this.finish(); return; } this.begin('watch'); this.demoed = false; this.say('negi', 'WATCH.'); },
  finish() {
    this.state = 'done'; this.t = 0; this.senX = 250; this.me.endTech(); this.me.reset(); this.sen.reset(); this.sen.face = -1; KC.sting('victory'); this.say('negi', this.lesson.outro);
    if (this.d.story && KC.Story.s) { KC.Story.s.score += this.score; }
  },
  leave() { if (this.d.story) { KC.Story.s.node++; KC.save.write(KC.Story.s); KC.game.go('road'); } else KC.game.go('dojoMenu'); },
  draw(r) {
    this.stage.draw(r); this.me.draw(r); this.sen.draw(r);
    const dr = this.drill_();
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2;
      KC.panel(g, cx - 120, 6, 240, 46, { alpha: .75 });
      if (this.state === 'done') { KC.title(g, 'LESSON COMPLETE', cx, 12, 2); KC.text(g, this.good + '/' + this.lesson.drills.length + '   +' + this.score + ' POINTS', cx, 36, '#ffe8a0', { align: 'center' }); }
      else {
        KC.text(g, this.lesson.title + '-' + (this.i + 1) + ': ' + dr.name, cx, 10, '#ffd060', { align: 'center' });
        const w = KC.glyphTech(g, dr.id, Math.round(cx - 20), 22, {}); KC.text(g, KC.promptText(dr.id), cx, 40, '#cfc8e8', { align: 'center' });
        const lab = this.state === 'watch' ? 'WATCH.' : this.state === 'now' ? 'NOW YOU.' : this.msg; if (this.state === 'watch' || this.state === 'now') E.font.title(g, lab, cx, Math.round(H * .3), { scale: 2, align: 'center', colors: GOLD, depth: 2 });
      }
      if (this.msgT > 0) E.font.title(g, this.msg, cx, Math.round(H * .3), { scale: 2, align: 'center', colors: this.msg.startsWith('NO') ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 2 });
      if (this.misses >= 3 && this.state !== 'done') KC.text(g, 'HINT: ' + KC.promptText(dr.id) + (dr.input[0] === 'n' ? '' : ' (LEFT STICK FIRST)'), cx, H - 40, '#9ad8ff', { align: 'center' });
      if (this.line && this.line.t < 3) KC.text(g, 'NEGI: "' + this.line.text + '"', cx, H - 30, '#fff6d0', { align: 'center' });
      KC.text(g, 'SCORE ' + this.score, 8, H - 14, '#fff6e8');
    });
    KC.promptBar(r, this.state === 'done' ? [['confirm', 'NEXT']] : [['start', 'SKIP DRILL']]); if (KC.dev.open) KC.drawDev(r, this); KC.overlayDraw(r);
  }
};

/* ---- 50-scene-title.js ---- */
/* ---------- title, main menu, touch gate, idle timer ---------- */
KC.idle = { t: 0 };
KC.touchGate = () => {
  const g = KC.game; if (KC._gateLifted) return false;
  let fine = true, pts = 0; try { fine = typeof matchMedia === 'function' ? matchMedia('(any-pointer: fine)').matches : true; pts = (typeof navigator !== 'undefined' && navigator.maxTouchPoints) || 0; } catch (e) { /* keep defaults */ }
  const pad = typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(p => p);
  return !fine && pts > 0 && !pad;
};
KC.scenes.title = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    const g = KC.game; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .32 }); this.t = 0; this.screen = d && d.menu ? 'menu' : 'press'; KC.idle.t = 0; g.follow(null); g.cam.bounds = null;
    this.taro = KC.makeRig(KC.FIGHTER.taro, 0, 'white'); this.mei = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); this.bowT = 0;
    KC.music('title'); g.input.touchEnabled = false; KC.input && 0; this.buildMenu(); this.qs = null; KC.current = this;
  },
  buildMenu() {
    const has = KC.save.has(), S = KC.Story;
    const items = [];
    if (has) items.push({ label: 'CONTINUE', sub: KC.save.summary(), onPick: () => S.continueGame() });
    items.push({ label: 'CHAMPON ROAD', sub: 'THE STORY: WHITE BELT TO CHAMP', onPick: () => S.newGame() });
    items.push({ label: 'VERSUS', sub: '2 PLAYERS, OR PLAY A CPU', onPick: () => KC.game.go('versusSetup') });
    items.push({ label: 'DOJO', sub: 'LESSONS, FREE SPAR, MOVE LIST', onPick: () => KC.game.go('dojoMenu') });
    items.push({ label: 'BONUS GAMES', sub: 'BOARDS, POTS, BULL', onPick: () => KC.game.go('bonusMenu') });
    items.push({ label: 'RECORDS', sub: 'THE TOP TEN', onPick: () => KC.game.go('records') });
    items.push({ label: 'OPTIONS', sub: 'SETTINGS AND CONTROLS', onPick: () => KC.game.menu('settings') });
    items.push({ label: 'ABOUT', sub: 'CREDITS AND SOURCE INFORMATION', onPick: () => KC.game.go('about') });
    this.menu = new Menu(items, { y: r => Math.round(r.H * .43), scale: 2, gap: 1, max: 5, onCancel: () => { this.screen = 'press'; } });
  },
  update(dt) {
    const g = KC.game, I = g.input; this.t += dt; this.bowT += dt;
    const gate = KC.touchGate(); this.gate = gate; if (!gate && KC._touchOnly) KC._touchOnly = false;
    if (KC.anyInput(g)) { KC.idle.t = 0; if (gate && g.input.lastDevice !== 'touch') { /* a real key or pad lifts the gate */ KC._gateLifted = true; } } else KC.idle.t += dt;
    if (KC.idle.t >= 10 && !SESSION) { KC.idle.t = 0; g.go('attract'); return; }
    this.stage.update(dt);
    const bow = Math.floor(this.bowT / 3) % 2;
    this.taro.update(dt, { x: 85, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard', pose: (this.bowT % 6) > 5 ? 'crouch' : undefined });
    this.mei.update(dt, { x: 315, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard', pose: (this.bowT % 6) > 5 ? 'crouch' : undefined });
    g.focus(200, 0, 50);
    if (gate) { if (g.input.pressed('start') || g.input.pressed('confirm')) { /* nothing: the gate lifts only on keyboard or pad */ } return; }
    if (this.screen === 'press') { if (I.pressed('start') || I.pressed('confirm') || I.clicked()) { I.consumeAll(); KC.sfx('menuOk'); this.screen = 'menu'; } }
    else this.menu.update(dt);
  },
  draw(r) {
    const g = KC.game;
    this.stage.draw(r);
    r.actor(85, 0, 0, (gg, ox, oy) => this.taro.draw(gg, ox, oy, r.view)); r.actor(315, 0, 0, (gg, ox, oy) => this.mei.draw(gg, ox, oy, r.view));
    r.overlay(gg => {
      const W = r.W, cx = W / 2, t = this.t;
      px.blend(gg, .35, 'normal', () => px.rect(gg, 0, 0, W, r.H, '#07060d'));
      E.font.title(gg, 'KARATE', cx, 10, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      const LC = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], wA = E.font.width('CHAMP', { scale: 4 }), wN = E.font.width('N', { scale: 4 }), gap = 30, tot = wA + gap + wN + 6, lx = Math.round(cx - tot / 2), by = 52;
      E.font.title(gg, 'CHAMP', lx, by, { scale: 4, align: 'left', colors: LC, depth: 3 }); E.font.title(gg, 'N', lx + wA + gap + 6, by, { scale: 4, align: 'left', colors: LC, depth: 3 });
      // the O of CHAMPON is a noodle bowl with chopsticks and rising steam
      const bx = lx + wA + 4, bb = by + 6; px.rect(gg, bx, bb + 10, 26, 14, '#10101c'); px.rect(gg, bx + 1, bb + 11, 24, 12, '#f4f0e0'); px.rect(gg, bx + 1, bb + 11, 24, 3, '#d8402a'); px.ell(gg, bx + 13, bb + 10, 12, 4, '#f0b040'); px.ell(gg, bx + 13, bb + 10, 9, 2, '#ffe090'); px.rect(gg, bx + 6, bb + 24, 14, 3, '#c8c0a8');
      px.line(gg, bx + 4, bb - 8, bx + 20, bb + 9, '#2a1a12', 2); px.line(gg, bx + 8, bb - 8, bx + 24, bb + 7, '#6a3a22', 2);
      for (let k = 0; k < 3; k++) { const a = (t * .8 + k * .33) % 1; px.blend(gg, (1 - a) * .7, 'normal', () => px.disc(gg, Math.round(bx + 6 + k * 7 + Math.sin(a * 6 + k) * 2), Math.round(bb + 6 - a * 22), 2, '#fff')); }
      KC.text(gg, "TWO STICKS. ONE CLEAN STRIKE.", cx, 84, '#ffe8a0', { align: 'center' });
      if (this.gate) {
        KC.panel(gg, cx - 140, r.H / 2 - 4, 280, 44); KC.title(gg, 'CONTROLLER OR KEYBOARD REQUIRED', cx, r.H / 2 + 8, 1);
        KC.text(gg, 'TOUCH CONTROLS ARE NOT SUPPORTED. SETTINGS: TOP RIGHT.', cx, r.H / 2 + 26, '#cfc8e8', { align: 'center' });
        return;
      }
      if (this.screen === 'press') {
        if (Math.floor(t * 2) % 2 === 0) { const lab = 'PRESS '; const w = E.font.width(lab, { scale: 2 }) + 18; E.font.text(gg, lab, cx - w / 2 + 1, Math.round(r.H * .52), '#fff6d0', { scale: 2, shadow: '#000', outline: false }); KC.glyphAction(gg, 'start', Math.round(cx - w / 2 + E.font.width(lab, { scale: 2 }) + 4), Math.round(r.H * .52) - 1, 15); }
        KC.text(gg, 'ENGINE MY-3D2DGE V' + E.version + '   GAME ' + KC.VERSION, cx, r.H - 12, '#7a6aa8', { align: 'center' });
      }
    });
    if (this.screen === 'menu' && !this.gate) { this.menu.draw(r); KC.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }
  }
};

/* ---- 51-attract.js ---- */
/* ---------- attract mode: an exhibition bout, the bonus reel, how to fight, the scores, the title; any input exits ---------- */
KC.attractSteps = ['bout', 'bonus', 'howto', 'scores', 'title'];
KC.scenes.attract = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    const g = KC.game; this.loop = (d && d.loop) || ((KC._attractLoop = (KC._attractLoop || 0) + 1)); this.step = -1; this.t = 0; this.quit = false; KC._attractLoop = this.loop; g.follow(null); g.audio.duck && g.audio.duck(true);
    this.calls = []; KC.current = this; this.stepName = null; this.seen = {}; KC.idle.t = 0; this.next();
  },
  exit() { KC.game.audio.duck && KC.game.audio.duck(false); KC.game.timeScale = T().gameSpeed; },
  rng() { return this.R; },
  next() {
    this.step++; this.t = 0; const g = KC.game, name = KC.attractSteps[this.step % KC.attractSteps.length]; this.stepName = name; this.R = E.rng(this.loop * 977 + this.step * 31 + 5);
    if (this.step >= KC.attractSteps.length) { this.loop++; KC._attractLoop = this.loop; this.step = 0; this.stepName = KC.attractSteps[0]; this.R = E.rng(this.loop * 977 + 5); }
    const n = this.stepName; this.bout = null; this.bonus = null;
    if (n === 'bout') this.startBout(); else if (n === 'bonus') this.startBonus(); else if (n === 'howto') this.startHowto(); else if (n === 'scores') { this.stage = new Stage('stadium'); KC.music('title'); } else if (n === 'title') { this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .32 }); KC.music('title'); this.tr = KC.makeRig(KC.FIGHTER.taro, 0, 'white'); this.mr = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); }
  },
  startBout() {
    const R = this.R, ids = [], pool = KC.ROSTER.map(f => f.id); ids.push(pool[Math.floor(R() * pool.length)]); do { ids[1] = pool[Math.floor(R() * pool.length)]; } while (ids[1] === ids[0]);
    const stages = KC.STAGES.slice(0, 8).map(s => s.id), stg = stages[Math.floor(R() * stages.length)]; this.stage = new Stage(stg);
    this.ais = ids.map((id, i) => new KarateAI({ id, level: 10, seed: this.loop * 13 + i, mode: 'showcase', start: i * 7 + this.loop * 3 }));
    this.bout = new Bout({ ids, seed: this.loop * 5 + 1, single: true, ctrl: this.ais.map(a => (m, f, b) => a.intent(m, f, b)), mode: 'attract' });
    this.hud = new FightHUD(this.bout, { names: ids.map(i => KC.FIGHTER[i].name.split(' ')[0]), hideScore: true }); this.bout.on('point', p => KC.scenes.fight.onPoint.call(this, p)); this.bout.on('block', p => KC.scenes.fight.onBlock.call(this, p));
    this.bout.on('call', c => { this.seen[c.id] = (this.seen[c.id] || 0) + 1; }); this.bout.on('aiuchi', () => KC.sfx('crowdOoh')); this.d = { noSlow: true };
    // the director: half, full, aiuchi, a sweep, a flip, a time-out hantei
    this.dir = { ex: 0, mode: 'fresh' }; this.bout.o.single = true; this.bout.start(); this.camX = undefined; KC.music(this.stage.d.music);
    this.bout.on('hajime', () => this.directExchange()); this.bout.on('card', () => {});
    this.bout.on('point', () => { this.dir.ex++; }); this.bout.on('aiuchi', () => { this.dir.ex++; });
  },
  directExchange() {
    const b = this.bout, ex = this.dir.ex, A = this.ais; b.invincible = [false, false]; b.directorQ = null; A.forEach(a => { a.queue = []; });
    const plan = [['half', 0, ['frontSweep']], ['full', 1, ['frontFlip', 'upLunge']], ['aiuchi', 0, []], ['full', 0, ['jumpSide']], ['half', 1, ['frontKick']], ['time', 0, []]][Math.min(ex, 5)];
    let [kind, who, q] = plan;
    if ((kind === 'half' || kind === 'full') && b.pts[who] + (kind === 'full' ? 1 : .5) >= T().pointsToWin) kind = 'time';
    if (kind === 'half') { b.invincible[1 - who] = true; b.invincible[who] = false; b.directorQ = .15; A[who].queue = q.slice(); A[1 - who].noBlock = true; }
    else if (kind === 'full') { b.invincible[1 - who] = true; b.directorQ = 1; A[who].queue = q.slice(); A[1 - who].noBlock = true; }
    else if (kind === 'aiuchi') { b.f[0].x = 185; b.f[1].x = 215; this.forceAiuchi = 60; }
    else if (kind === 'time') { b.invincible = [true, true]; const m = Math.max(b.pts[0], b.pts[1]); b.pts = [m, m]; b.clock = 6; }
    A.forEach(a => { a.noBlock = kind !== 'aiuchi' && false; });
  },
  startBonus() {
    this.sub = ['boards', 'pots', 'bull'][0]; this.subIdx = 0; this.mkBonus(0); KC.music('bonus');
  },
  mkBonus(i) {
    const kinds = ['boards', 'pots', 'bull']; this.subIdx = i; const k = kinds[i]; this.stage = new Stage(KC.BONUS[k].stage); const o = { auto: true, seed: this.loop, params: k === 'boards' ? { n: 5, mat: 0 } : undefined, visit: this.loop };
    this.bonus = k === 'boards' ? new Boards(o) : k === 'pots' ? new Pots(o) : new BullStage(o); this.bonus.cardT = .8; this.bt = 0; if (k === 'bull') { this.bonus.charges = 1; } if (k === 'pots') { this.bonus.seq = this.bonus.seq.slice(0, 9); }
  },
  startHowto() {
    this.stage = new Stage('dojo'); this.me = new Karateka('negi', 0, { belt: 'black1' }); this.dum = new Karateka('kamaboko', 1, { belt: 'white' }); this.list = ['frontKick', 'roundKick', 'lowKick', 'upLunge', 'frontSweep', 'upperPunch', 'backRound', 'jumpSide', 'frontFlip', 'block']; this.li = 0; this.lt = 0; this.me.reset(); this.dum.reset(); this.dum.face = -1; KC.music('practice');
  },
  update(dt) {
    const g = KC.game; this.t += dt;
    if (KC.anyInput(g)) { KC.idle.t = 0; if (this.t > .25) { if (KC.touchGate() && g.input.lastDevice !== 'touch') KC._gateLifted = true; g.go('title'); return; } }
    this.stage && this.stage.update(dt); g.focus(200, 0, 50);
    const n = this.stepName;
    if (n === 'bout' && this.bout) {
      if (this.forceAiuchi > 0 && this.bout.phase === 'fight') { this.forceAiuchi = 0; const [a, b] = this.bout.f; a.x = 183; b.x = 217; a.start('roundKick', b, 'n', 'r'); b.start('roundKick', a, 'n', 'l'); }
      this.bout.update(dt); KC.updateReferee(this.bout, dt); KC.fightCamera(this, dt, this.bout); KC.scenes.fight.footsteps.call(this);
      if (this.bout.done || this.t > 70) this.next();
    } else if (n === 'bonus' && this.bonus) {
      this.bt += dt; this.bonus.update(dt); if (this.bonus.done || this.bt > (this.subIdx === 1 ? 15 : 14)) { if (this.subIdx < 2) this.mkBonus(this.subIdx + 1); else this.next(); }
    } else if (n === 'howto') {
      this.lt += dt; const id = this.list[this.li % this.list.length], t = KC.TECHS[id]; this.me.frozen = false; this.me.x = 150; this.dum.x = 150 + PUSH + 36;
      if (this.lt > 2.6) { this.lt = 0; this.li++; this.me.endTech(); this.me.start(this.list[this.li % this.list.length], this.dum, 'n', null); }
      if (this.me.tech) this.me.step(this.dum, null); this.me.update(dt, this.dum); this.dum.update(dt, this.me); if (this.t > 30 || this.li >= this.list.length) this.next();
    } else if (n === 'scores') { if (this.t > 6) this.next(); }
    else if (n === 'title') { this.tr.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' }); this.mr.update(dt, { x: 250, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard' }); if (this.t > 5) this.next(); }
  },
  draw(r) {
    const n = this.stepName; this.stage && this.stage.draw(r);
    if (n === 'bout' && this.bout) { for (const f of this.bout.f) f.draw(r); KC.drawReferee(r, this.bout); this.hud.draw(r); }
    else if (n === 'bonus' && this.bonus) { this.bonus.draw(r); r.overlay(g => { if (this.bonus.msgT > 0 && this.bonus.msg) E.font.title(g, this.bonus.msg, r.W / 2, Math.round(r.H * .26), { scale: 2, align: 'center', colors: GOLD, depth: 2 }); if (this.bonus.state === 'card') { KC.title(g, 'BONUS STAGE!', r.W / 2, Math.round(r.H * .3), 2); } }); }
    else if (n === 'howto') {
      const id = this.list[this.li % this.list.length], t = KC.TECHS[id]; this.me.draw(r); this.dum.draw(r);
      r.overlay(g => { KC.panel(g, r.W / 2 - 120, 8, 240, 50, { alpha: .8 }); KC.title(g, 'HOW TO FIGHT', r.W / 2, 12, 1); KC.text(g, t.name, r.W / 2, 28, '#ffd060', { align: 'center' }); KC.glyphTech(g, id, Math.round(r.W / 2 - 24), 40, {}); });
    } else if (n === 'scores') { r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d'))); KC.cab.drawTable(r, 'story', 24, 'CHAMPON ROAD - HIGH SCORES'); }
    else if (n === 'title') { r.actor(150, 0, 0, (g, ox, oy) => this.tr.draw(g, ox, oy, r.view)); r.actor(250, 0, 0, (g, ox, oy) => this.mr.draw(g, ox, oy, r.view)); r.overlay(g => { px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#07060d')); E.font.title(g, 'KARATE', r.W / 2, 14, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 }); E.font.title(g, 'CHAMPON', r.W / 2, 50, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 }); }); }
    r.overlay(g => { if (Math.floor(KC.game.real * 1.6) % 2 === 0 || true) KC.text(g, 'DEMO - PRESS ' + (KC.family() === 'key' ? 'ENTER' : 'START'), r.W / 2, r.H - 14, Math.floor(KC.game.real * 2) % 2 ? '#ffd060' : '#fff6e8', { align: 'center', scale: 1 }); });
  }
};

/* ---- 52-scene-road.js ---- */
/* ---------- the story: save, the Champon Road, VS cards, cutscenes, promotions, continue, game over, ending ---------- */
KC.save = {
  data: null,
  load() { this.data = KC.store.get('kc:save', null); return this.data; },
  has() { const d = this.data || this.load(); return !!(d && typeof d.node === 'number' && d.node > 0 && d.node < KC.LADDER.length); },
  summary() { const d = this.data || this.load(); if (!d) return ''; const n = KC.LADDER[d.node]; return up(KC.BELTS[d.belt].short) + ' - ' + up(KC.STAGE[n.stage].name); },
  write(s) { if (SESSION) return; this.data = { node: s.node, belt: s.belt, score: s.score, difficulty: s.difficulty, unlocks: s.unlocks, stats: s.stats }; KC.store.set('kc:save', this.data); },
  erase() { this.data = null; KC.store.set('kc:save', null); }
};
KC.unlocks = { get() { return KC.store.get('kc:unlocks', { kyabetsu: false, mei: false, classic: false }); }, set(k) { const u = this.get(); u[k] = true; KC.store.set('kc:unlocks', u); }, has(k) { return KC.dev.unlocked || !!this.get()[k]; } };
KC.fighterOpen = f => { const u = KC.FIGHTER[f].unlock; return !u || (u === 'story8' ? KC.unlocks.has('kyabetsu') : KC.unlocks.has('mei')); };
KC.cab = null; KC.hiScore = () => { try { const t = KC.cab.table('story'); return t[0] ? t[0].score : 0; } catch (e) { return 0; } };

KC.Story = {
  s: null,
  fresh() { return { node: 0, belt: 0, score: 0, difficulty: KC.game.settings.difficulty || 'Normal', unlocks: {}, stats: { full: 0, half: 0, perfects: 0 }, losses: {}, continues: 0 }; },
  newGame() { this.s = this.fresh(); KC.save.erase(); KC.game.go('road'); },
  continueGame() { const d = KC.save.load(); this.s = Object.assign(this.fresh(), JSON.parse(JSON.stringify(d))); KC.game.go('road'); },
  get node() { return KC.LADDER[this.s.node]; },
  launch() {
    const n = this.node, g = KC.game; if (!n) return;
    KC.save.write(this.s);
    if (n.kind === 'cutscene') g.go('cutscene', { id: n.id, stage: n.stage, story: true, after: () => this.advance() });
    else if (n.kind === 'practice') g.go('practice', { lesson: n.lesson, stage: n.stage, story: true });
    else if (n.kind === 'match') g.go('vscard', { node: n });
    else if (n.kind === 'bonus') { if (n.bonus === 'pots') g.go('cutscene', { id: 'potsIntro', stage: n.stage, story: true, after: () => g.go('bonus', { kind: n.bonus, story: true, stage: n.stage }) }); else g.go('bonus', { kind: n.bonus, story: true, stage: n.stage }); }
    else if (n.kind === 'ending') g.go('cutscene', { id: 'ending', stage: n.stage, story: true, after: () => g.go('credits', { story: true }) });
  },
  advance() { this.s.node++; KC.save.write(this.s); if (this.s.node >= KC.LADDER.length) { g_end(); } else KC.game.go('road'); },
  matchDone(win, bout, node) {
    const S = this.s; S.score += bout.score[0]; S.stats.full += bout.stats[0].full; S.stats.half += bout.stats[0].half; if (bout.perfect && win) S.stats.perfects++;
    if (win) {
      S.belt = Math.max(S.belt, node.promote); S.score += 1000 * node.promote;
      if (node.opponent === 'kyabetsu' || node.id === 'm8') KC.unlocks.set('kyabetsu');
      if (node.opponent === 'mei') { KC.unlocks.set('mei'); KC.unlocks.set('classic'); }
      KC.game.go('promotion', { node, belt: S.belt });
    } else { S.losses[node.id] = (S.losses[node.id] || 0) + 1; KC.game.go('continue', { node }); }
  }
};
const g_end = () => { KC.game.go('credits', { story: true }); };

/* ---- the Champon Road: a painted scroll ---- */
KC.scenes.road = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() {
    this.t = 0; this.stage = new Stage('harbor'); this.stage.d = Object.assign({}, this.stage.d, { props: [], ambient: .8 }); this.scroll = KC.Story.s.node * 56; KC.idle.t = 0; KC.game.follow(null); KC.music('select');
    this.menu = new Menu([{ label: 'GO', onPick: () => KC.Story.launch() }, { label: 'SAVE AND QUIT', onPick: () => { KC.save.write(KC.Story.s); KC.game.go('title'); } }], { y: r => r.H - 70, scale: 2, onCancel: () => KC.game.go('title') });
    this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); KC.current = this;
  },
  update(dt) {
    this.t += dt; const S = KC.Story.s; const tgt = S.node * 56; this.scroll = lerp(this.scroll, tgt, clamp(dt * 4, 0, 1)); this.stage.update(dt);
    const I = KC.game.input; this.mouseHit = null; const pt = I.pointer(); if (pt) { this.nodes && this.nodes.forEach(n => { if (Math.hypot(pt[0] - n.x, pt[1] - n.y) < 9) this.mouseHit = n; }); }
    const c = I.clicked(); if (c && this.mouseHit && this.mouseHit.i === S.node) { KC.sfx('menuOk'); KC.Story.launch(); return; }
    this.menu.update(dt);
    this.rig.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' });
    KC.game.focus(200, 0, 50);
  },
  draw(r) {
    const S = KC.Story.s, L = KC.LADDER; r.sky(['#1c2a58', '#6a4a7a', '#e89a6a']);
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, H * .42, W, H, '#2a1a12');
      for (let i = 0; i < 60; i++) px.dot(g, (i * 53) % W, (i * 31) % Math.floor(H * .4), '#ffffff');
      px.rect(g, 0, Math.round(H * .46), W, 3, '#8a6a3a'); px.rect(g, 0, Math.round(H * .46) + 3, W, 2, '#4a3220');
      KC.title(g, 'CHAMPON ROAD', W / 2, 8, 2);
      this.nodes = [];
      const y0 = Math.round(H * .46) + 1;
      L.forEach((n, i) => {
        const x = Math.round(W / 2 + i * 56 - this.scroll), cur = i === S.node, done = i < S.node; if (x < -20 || x > W + 20) return;
        const col = n.kind === 'match' ? '#e8483a' : n.kind === 'bonus' ? '#ffd060' : n.kind === 'practice' ? '#5ad8a0' : '#9ab8ff';
        px.disc(g, x, y0, cur ? 9 : 6, '#10101c'); px.disc(g, x, y0, cur ? 8 : 5, done ? KC.BELTS[Math.min(9, (L.slice(0, i + 1).filter(m => m.promote).length))].color : col);
        if (cur) { const p = .5 + .5 * Math.sin(this.t * 6); px.blend(g, .3 + .3 * p, 'add', () => px.disc(g, x, y0, 13, '#ffd060')); }
        const ic = n.kind === 'match' ? '拳' : n.kind === 'bonus' ? '★' : n.kind === 'practice' ? '学' : '・'; E.font.text(g, n.kind === 'match' ? 'VS' : n.kind === 'bonus' ? '★' : n.kind === 'practice' ? 'LV' : '•', x, y0 - 3, '#10101c', { align: 'center', outline: false });
        this.nodes.push({ x, y: y0, i, n });
      });
      this.nodes.forEach(nd => { if (this.mouseHit === nd) KC.text(g, KC.LADDER[nd.i].label, nd.x, y0 - 28, '#fff', { align: 'center' }); });
      const n = S.node < L.length ? L[S.node] : null;
      if (n) { KC.text(g, 'NEXT: ' + up(n.label) + (n.kind === 'match' ? ' - ' + up(KC.STAGE[n.stage].name) : ''), W / 2, Math.round(H * .46) + 22, '#ffe8a0', { align: 'center', scale: 1 }); }
      KC.text(g, KC.BELTS[S.belt].name + '   SCORE ' + fmt(S.score), W / 2, Math.round(H * .46) + 36, '#cfc8e8', { align: 'center' });
      // rank road
      for (let k = 0; k < 10; k++) { const bx = W / 2 - 5 * 18 + k * 18; px.rect(g, bx, 22, 14, 6, '#10101c'); px.rect(g, bx + 1, 23, 12, 4, KC.BELTS[k].color); if (k === S.belt) px.rect(g, bx - 1, 30, 16, 2, '#ffd060'); }
    });
    r.actor(70, 0, 0, () => {}); this.menu.draw(r); KC.promptBar(r, [['confirm', 'GO'], ['cancel', 'TITLE']]);
  }
};

/* ---- VS card ---- */
KC.scenes.vscard = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.n = d.node; this.t = 0; this.opp = KC.FIGHTER[this.n.opponent]; this.rigA = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); this.rigB = KC.makeRig(this.opp, 1, 'black1');
    const loss = KC.Story.s.losses[this.n.id] || 0; this.tip = loss >= 1 && this.opp.tip ? this.opp.tip : null;
    this.line = ''; KC.music('select'); KC.game.follow(null); this.spoke = false; KC.current = this;
  },
  update(dt) {
    this.t += dt; const I = KC.game.input; KC.game.focus(200, 0, 50);
    const full = this.opp.rig.intro || this.opp.intro; const txt = this.opp.intro; this.line = txt.slice(0, Math.floor(this.t * 22));
    if (!this.spoke && this.t > .5) { this.spoke = true; KC.speakLine(this.opp.id, txt); }
    this.rigA.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard' }); this.rigB.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard' });
    if (this.t > 2.5 || (this.t > .7 && (I.pressed('start') || I.pressed('confirm') || I.clicked()))) { I.consumeAll(); this.go(); }
  },
  go() {
    const S = KC.Story.s, n = this.n, opp = this.opp, diffMod = S.difficulty;
    KC.game.go('fight', { mode: 'story', stage: n.stage, ids: ['taro', n.opponent], belts: [KC.BELTS[S.belt].id, KC.BELTS[Math.min(9, n.promote + 2)].id], names: ['TARO', opp.name.split(' ')[opp.name.split(' ').length - 1] === 'MOYASHI' ? 'TARO' : opp.name.replace('MASTER ', '').replace('SENPAI ', '').replace('CAPTAIN ', '')], players: ['human', 'cpu'], hints: n.hints, seed: 1000 + S.node * 7 + (S.losses[n.id] || 0) * 131 + S.continues * 17,
      onEnd: (w, st, bout) => KC.Story.matchDone(w === 0, bout, n) });
  },
  draw(r) {
    r.sky(['#10101c', '#2a1a3a', '#10101c']);
    r.overlay(g => {
      const W = r.W, H = r.H, k = clamp(this.t / .4, 0, 1), ease = 1 - Math.pow(1 - k, 3);
      px.rect(g, 0, 0, Math.round(W / 2 * ease), H, '#e8e4dc'); px.rect(g, Math.round(W - W / 2 * ease), 0, Math.ceil(W / 2 * ease), H, '#a82a22');
      px.poly(g, [[W / 2 - 14, 0], [W / 2 + 14, 0], [W / 2 - 14 + 6, H], [W / 2 - 14 - 22, H]], '#10101c');
      E.font.title(g, 'VS', W / 2, H / 2 - 20, { scale: 4, align: 'center', colors: GOLD, depth: 3 });
      KC.title(g, 'TARO', W * .25, 16, 2); KC.title(g, up(this.opp.name), W * .75, 16, 1);
      KC.text(g, KC.BELTS[KC.Story.s.belt].name, W * .25, 38, '#10101c', { align: 'center' }); KC.text(g, up(this.opp.title), W * .75, 38, '#fff', { align: 'center' });
      KC.text(g, '"' + this.line + '"', W / 2, H - 52, '#fff6d0', { align: 'center' });
      KC.text(g, up(KC.STAGE[this.n.stage].name), W / 2, H - 38, '#ffd060', { align: 'center' });
      if (this.tip) KC.text(g, 'TIP: ' + this.tip, W / 2, H - 24, '#ffe8a0', { align: 'center' });
      // the portraits
      this.rigA.drawPortrait(g, Math.round(W * .25 - 28), 52, 56, { zoom: 3 }); this.rigB.drawPortrait(g, Math.round(W * .75 - 28), 52, 56, { zoom: 3, turn: -.3 });
    });
    KC.promptBar(r, [['start', 'SKIP']]);
  }
};

/* ---- promotion ceremony ---- */
KC.scenes.promotion = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.t = 0; this.belt = d.belt; this.node = d.node; this.stage = new Stage(d.node.stage === 'dojo' ? 'dojo' : d.node.stage); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[d.belt - (d.node.promote === d.belt ? 1 : 0)].id); this.ref = KC.makeRig({ rig: { size: 2.1, build: 'heroic', hair: 'bald', colors: { skin: '#e8b088' } } }, 1, 'black8'); this.tied = false; KC.sting('promotion'); KC.music(null); KC.game.follow(null); KC.current = this;
    this.cab = null; this.perfect = false;
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); const I = KC.game.input;
    if (!this.tied && this.t > 1.8) { this.tied = true; KC.sfx('beltTie'); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[this.belt].id); KC.game.particles.glints(150, 0, 30, 14, '#ffe070'); }
    this.rig.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: this.tied ? 'cheer' : undefined, stance: this.tied ? undefined : 'guard', expr: this.tied ? 'smile' : undefined });
    this.ref.update(dt, { x: 200, y: 8, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: this.t < 1.6 ? 'hips' : 'wave' });
    KC.game.focus(200, 0, 50);
    if (this.t > 3.2 && (I.pressed('start') || I.pressed('confirm') || I.clicked() || this.t > 9)) { I.consumeAll(); const N = this.node; KC.Story.s.node++; KC.save.write(KC.Story.s); if (N.after) KC.game.go('cutscene', { id: N.after, stage: N.stage, story: true, after: () => KC.game.go('road') }); else if (N.id === 'm3') KC.game.go('cutscene', { id: 'afterHarbor', stage: N.stage, story: true, after: () => KC.game.go('road') }); else KC.game.go('road'); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); r.actor(200, 8, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, 60, '#07060d'));
      KC.title(g, 'PROMOTED!', W / 2, 8, 3); if (this.tied) E.font.title(g, up(KC.BELTS[this.belt].name), W / 2, 40, { scale: 2, align: 'center', colors: ['#fff', KC.BELTS[this.belt].color === '#16161c' ? '#c8c8d8' : KC.BELTS[this.belt].color, KC.BELTS[this.belt].color], depth: 2 });
      KC.text(g, 'RANK UP BONUS +' + (1000 * this.node.promote), W / 2, H - 56, '#ffe8a0', { align: 'center' }); KC.text(g, 'SCORE ' + fmt(KC.Story.s.score), W / 2, H - 44, '#fff', { align: 'center' });
      for (let k = 0; k < 10; k++) { const bx = W / 2 - 5 * 18 + k * 18; px.rect(g, bx, H - 32, 14, 7, '#10101c'); px.rect(g, bx + 1, H - 31, 12, 5, k <= this.belt ? KC.BELTS[k].color : '#2a2a3a'); if (k === this.belt) px.rect(g, bx - 1, H - 23, 16, 2, '#ffd060'); }
    });
    if (this.t > 3.2) KC.promptBar(r, [['confirm', 'NEXT']]);
  }
};

/* ---- continue / game over / initials ---- */
KC.scenes.continue = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.node = d.node; this.left = 10; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .3 }); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s.belt].id); KC.music('continue'); KC.game.follow(null); this.mei = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); this.spoke = false; KC.sting('defeat'); KC.current = this; },
  update(dt) {
    this.t += dt; this.left -= dt; this.stage.update(dt); const I = KC.game.input; KC.game.focus(200, 0, 50);
    this.rig.update(dt, { x: 150, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel', expr: 'wince' }); this.mei.update(dt, { x: 260, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, pose: 'hips' });
    if (!this.spoke && this.t > .8) { this.spoke = true; KC.speakLine('mei', 'GET UP, MOYASHI!'); }
    if (Math.ceil(this.left) !== this.lastN) { this.lastN = Math.ceil(this.left); KC.sfx('countBeep'); }
    if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { I.consumeAll(); const S = KC.Story.s; S.score = 0; S.continues++; KC.game.go('vscard', { node: this.node }); return; }
    if (I.pressed('cancel') || this.left <= 0) { I.consumeAll(); KC.game.go('gameover', { score: KC.Story.s.score }); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(150, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); r.actor(260, 0, 0, (g, ox, oy) => this.mei.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#07060d')); KC.title(g, 'CONTINUE?', W / 2, 20, 3); E.font.title(g, String(Math.max(0, Math.ceil(this.left))), W / 2, 62, { scale: 6, align: 'center', colors: this.left < 4 ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 3 }); KC.text(g, '"GET UP, MOYASHI!"  - MEI', W / 2, H - 56, '#ffe8a0', { align: 'center' }); KC.text(g, 'CONTINUING RESETS YOUR SCORE. RANK IS KEPT.', W / 2, H - 44, '#cfc8e8', { align: 'center' }); });
    KC.promptBar(r, [['confirm', 'CONTINUE'], ['cancel', 'GIVE UP']]);
  }
};
KC.scenes.gameover = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.score = d.score || 0; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .2 }); this.rig = KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story.s ? KC.Story.s.belt : 0].id); KC.music('gameover', { loop: false }); this.spoke = false; KC.game.follow(null); KC.game.weather = { kind: 'rain', amount: .6, wind: .1 }; KC.current = this; },
  update(dt) {
    this.t += dt; const I = KC.game.input; this.stage.update(dt); KC.game.focus(200, 0, 50);
    this.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel', expr: 'wince' });
    if (!this.spoke && this.t > 1.5) { this.spoke = true; KC.speakLine('genkotsu', 'TRAIN. RETURN.'); }
    if (this.t > 4 && (I.pressed('confirm') || I.pressed('start') || I.clicked() || this.t > 9)) { I.consumeAll(); KC.game.weather = null; KC.finishRun(this.score, 'story', () => KC.game.go('title')); }
  },
  draw(r) {
    this.stage.draw(r); r.actor(200, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .4, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, 'GAME OVER', W / 2, 30, 4); if (this.t > 1.5) KC.text(g, '"TRAIN. RETURN."  - JUDGE GENKOTSU', W / 2, 90, '#ffe8a0', { align: 'center', scale: 1 }); KC.text(g, 'SCORE ' + fmt(this.score), W / 2, H - 50, '#fff', { align: 'center' }); });
    if (this.t > 4) KC.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};
// record a run on a table (initials on E.Arcade's letter wheel), unless the dev tuning is active
KC.finishRun = (score, mode, done) => {
  const g = KC.game, cab = KC.cab;
  if (!cab || KC.tuned() || SESSION || score <= 0 || !cab.qualifies(score, mode)) { done(); return; }
  g.go('initials', { score, mode, done });
};
KC.scenes.initials = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.opened = false; KC.music('select'); KC.game.follow(null); KC.current = this; },
  update(dt) {
    const cab = KC.cab; cab.update(dt); KC.game.focus(200, 0, 50);
    if (!this.opened) { this.opened = true; cab.enter(this.d.score, this.d.mode, () => { KC.game.go('records', { mode: this.d.mode, after: this.d.done }); }); }
  },
  draw(r) { r.sky(['#10101c', '#2a1a3a', '#10101c']); KC.cab.draw(r); }
};

/* ---- cutscenes: E.Dialog with portraits and gibberish voices ---- */
KC.scenes.cutscene = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; this.fin = false; this.stage = new Stage(d.stage || 'dojo'); this.script = KC.SCRIPTS[d.id] || []; this.i = -1; this.t = 0; this.card = null; this.talk = new E.Dialog(KC.game, { speed: 30 });
    this.rigs = { taro: KC.makeRig(KC.FIGHTER.taro, 0, KC.BELTS[KC.Story ? (KC.Story.s ? KC.Story.s.belt : 0) : 0].id), mei: KC.makeRig(KC.FIGHTER.mei, 1, 'black5'), negi: KC.makeRig(KC.FIGHTER.negi, 1, 'green'), genkotsu: KC.makeRig({ rig: { size: 2.1, build: 'heroic', hair: 'bald', colors: { skin: '#e8b088' } } }, 1, 'black8') };
    KC.music(d.id === 'ending' ? 'ending' : 'dojo'); KC.game.follow(null); KC.current = this; this.advance();
  },
  advance() {
    this.i++;
    if (this.i >= this.script.length || KC.dev.skipCut) { this.finish(); return; }
    const [who, text] = this.script[this.i];
    if (who === 'card') { this.card = { text, t: 0 }; this.talk.close(); KC.speakLine('negi', text); return; }
    this.card = null; const rig = this.rigs[who];
    KC.speakLine(who, text);
    this.talk.say([text], { name: KC.WHO[who] || up(who), portrait: rig, place: 'bottom', onDone: () => this.advance() });
  },
  finish() { if (this.fin) return; this.fin = true; const a = this.d.after; if (a) a(); else KC.game.go('title'); },
  update(dt) {
    this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input;
    const poses = { taro: { x: 140, f: 0 }, mei: { x: 260, f: Math.PI }, negi: { x: 260, f: Math.PI }, genkotsu: { x: 260, f: Math.PI } };
    for (const k in this.rigs) this.rigs[k].update(dt, { x: poses[k].x, y: 0, z: 0, facing: poses[k].f, vx: 0, vy: 0, pose: 'hips' });
    if (this.card) { this.card.t += dt; if (this.card.t > 1.2 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.card.t > 3.2) { I.consumeAll(); this.advance(); } return; }
    if (I.pressed('start')) { I.consumeAll(); this.talk.close(); this.finish(); return; }
    this.talk.update(dt);
  },
  draw(r) {
    this.stage.draw(r);
    const cur = this.script[this.i];
    const show = cur && this.d.id !== 'prologue' || (cur && cur[0] !== 'card');
    if (this.d.id === 'finalEntrance' || this.d.id === 'ending') { r.actor(140, 0, 0, (g, ox, oy) => this.rigs.taro.draw(g, ox, oy, r.view)); r.actor(260, 0, 0, (g, ox, oy) => this.rigs.mei.draw(g, ox, oy, r.view)); }
    else { r.actor(140, 0, 0, (g, ox, oy) => this.rigs.taro.draw(g, ox, oy, r.view)); const o = this.script.some(s => s[0] === 'negi') ? 'negi' : this.script.some(s => s[0] === 'mei') ? 'mei' : 'negi'; r.actor(260, 0, 0, (g, ox, oy) => this.rigs[o].draw(g, ox, oy, r.view)); }
    if (this.d.id === 'ending') r.overlay(g => { const gx = r.W / 2, gy = r.H * .55; px.rect(g, gx - 10, gy + 12, 20, 4, '#8a6a20'); px.ell(g, gx, gy + 6, 12, 7, '#ffd060'); px.ell(g, gx, gy + 3, 10, 3, '#fff0a0'); });
    r.overlay(g => { if (this.card) { px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, this.card.text, r.W / 2, r.H / 2 - 12, { scale: 2, align: 'center', colors: GOLD, depth: 2, wrap: r.W - 40 }); } });
    this.talk.draw(r); KC.promptBar(r, [['confirm', 'NEXT'], ['start', 'SKIP']]);
  }
};

/* ---- credits and the cast parade (the ending) ---- */
KC.scenes.credits = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d || {}; this.fin = false; this.t = 0; this.stage = new Stage('stadium'); this.rigs = KC.ROSTER.map((f, i) => ({ f, rig: KC.makeRig(f, i % 2, 'black1') })); KC.music('ending'); KC.game.follow(null); KC.current = this;
    const ab = KC.about(); this.lines = ['YOU ARE THE KARATE CHAMPON', '', 'KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY', 'KARATE CHAMP (1984, DATA EAST)', '', 'BUILT WITH MY-3D2DGE v0.85.2', 'ASSETS: CODE-DRAWN. KENNEY AND KAYKIT (CC0) THANKS', 'MODEL: ' + up(ab.sourceInformation.model), '', 'THANK YOU FOR PLAYING'];
  },
  update(dt) {
    this.t += dt; this.stage.update(dt); const I = KC.game.input; KC.game.focus(200, 0, 50);
    const idx = Math.floor(this.t / 2.2) % this.rigs.length, a = this.rigs[idx];
    this.rigs.forEach((o, i) => { o.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: i === idx ? ((this.t % 2.2) < 1.4 ? 'cheer' : 'crouch') : undefined }); });
    if (this.t > 6 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.t > this.rigs.length * 2.2 + 6) { I.consumeAll(); this.finish(); }
  },
  finish() {
    if (this.fin) return; this.fin = true; const S = KC.Story.s, done = () => { KC.game.go('title'); };
    if (this.d.story && S) { const sc = S.score + 10000; KC.save.erase(); KC.finishRun(sc, 'story', done); } else done();
  },
  draw(r) {
    this.stage.draw(r); const idx = Math.floor(this.t / 2.2) % this.rigs.length, a = this.rigs[idx];
    r.actor(200, 0, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
    r.overlay(g => { const W = r.W, H = r.H; px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.title(g, up(a.f.name), W / 2, H - 34, 1); KC.text(g, up(a.f.title), W / 2, H - 22, '#cfc8e8', { align: 'center' }); this.lines.forEach((l, i) => { const y = Math.round(H - 20 - (this.t * 12 - i * 14) + H * .2); if (y > -10 && y < H - 30) KC.text(g, l, W / 2, y, i === 0 ? '#ffd060' : '#fff', { align: 'center' }); }); });
    KC.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};

/* ---- 53-scene-fight.js ---- */
/* ---------- the fight scene: story, versus, attract, free spar and online all run through it ---------- */
KC.dev = { open: false, showBoxes: false, showInput: false, showFrame: false, aiThoughts: false, invincible: false, infinite: false, freezeCpu: false, step: 0, slow: false, muteVoices: false, p2mode: 'cpu', unlocked: false, skipCut: false, tab: 0, row: 0, fps: false };
const camTarget = (b, W) => { const a = b.f[0].x, c = b.f[1].x; return clamp((a + c) / 2, 150, 250); };
KC.fightCamera = (scene, dt, b, r) => {
  const g = KC.game, cx = camTarget(b), k = clamp(dt * 6, 0, 1); scene.camX = scene.camX === undefined ? cx : lerp(scene.camX, cx, k);
  const sway = scene.stage && scene.stage.d.sway && !g.reduceMotion ? Math.sin(g.time * 1.3) * .6 : 0;
  g.focus(scene.camX, 0, 50 + sway);
};

KC.scenes.fight = {
  view: 'side', views: ['side', 'brawler'], input: KC_KEYS, res: 'ps1', pausable: !SESSION, touch: [], camera: { zoom: false },
  enter(d) {
    KC.game.setView(KC.game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
    const g = KC.game; d = d || {}; this.d = d; this.mode = d.mode || 'versus'; this.stage = new Stage(d.stage || 'dojo'); this.camX = undefined; this.done = false; this.t = 0; this.resultT = 0;
    g.follow(null); g.cam.bounds = null; g.cam.snap = true; if (g.cam.room !== undefined) g.cam.room = null;
    const ids = d.ids || ['taro', 'kamaboko'];
    this.readers = [null, null]; this.ais = [null, null];
    const ctrl = [null, null];
    for (let i = 0; i < 2; i++) {
      const who = d.players ? d.players[i] : (i === 0 ? 'human' : 'cpu');
      if ((who === 'human') && KC.autopilot) { const ai = new KarateAI({ id: ids[i], level: KC.autopilot, seed: (d.seed || 1) * 3 + i, mode: 'normal', ignoreTune: true }); this.ais[i] = ai; ctrl[i] = (m, f, b) => ai.intent(m, f, b); }
      else if (who === 'human' || who === 'human2') { const inp = who === 'human2' ? (g.players[1] || g.input) : g.players[0] || g.input; this.readers[i] = new Reader(inp); ctrl[i] = () => (this.paused() ? { posture: 'n', tech: null } : this.readers[i].read()); }
      else if (who === 'cpu' || who === 'showcase' || who === 'dummy') {
        const ai = new KarateAI({ id: ids[i], level: d.level && d.level[i], seed: (d.seed || 1) + i, mode: who === 'showcase' ? 'showcase' : 'normal', diff: g.settings.difficulty, start: d.start ? d.start[i] : 0 });
        this.ais[i] = ai; ctrl[i] = (m, f, b) => KC.dev.freezeCpu || who === 'dummy' ? this.dummy(m, f, b) : ai.intent(m, f, b);
      } else if (typeof who === 'function') ctrl[i] = who;
    }
    this.bout = new Bout({ ids, belts: d.belts, names: d.names, seed: d.seed || 7, ctrl, single: !!d.single, mode: this.mode, intro: d.intro !== false, onMatchEnd: (w, st) => this.onEnd(w, st) });
    this.hud = new FightHUD(this.bout, { names: d.names, tags: d.tags, hideScore: d.hideScore, readers: this.readers });
    this.bout.on('point', p => this.onPoint(p)); this.bout.on('block', p => this.onBlock(p)); this.bout.on('roundEnd', () => this.stage.react('full')); this.bout.on('aiuchi', () => KC.sfx('crowdOoh'));
    this.bout.on('card', () => {}); this.hintIdx = 0; this.hintT = 0;
    if (KC.dev.invincible) this.bout.invincible[1] = true;
    this.bout.infiniteTime = KC.dev.infinite;
    this.bout.start(); KC.music(this.stage.d.music); if (this.d.onStart) this.d.onStart(this.bout, this);
    this.dummyMode = d.dummyMode || 'stand'; KC.current = this;
  },
  exit() { KC.game.timeScale = T().gameSpeed; KC.game.weather = null; },
  paused() { return KC.dev.open; },
  dummy(m, f, b) {
    const mode = this.dummyMode, tgt = { posture: 'n', tech: null };
    if (mode === 'crouch') tgt.posture = 'd'; else if (mode === 'jump' && m.state === 'free') tgt.posture = (b.steps % 160 < 6) ? 'u' : 'n'; else if (mode === 'block' && f.tech && !f.tech.util && f.phase === 'startup') { const fd = f.x > m.x ? 1 : -1; return { posture: fd > 0 ? 'l' : 'r', tech: fd > 0 ? 'r' : 'l' }; }
    else if (mode === 'attack' && m.state === 'free' && b.steps % 200 === 0) { const fd = f.x > m.x ? 'r' : 'l'; return { posture: 'n', tech: fd }; }
    return tgt;
  },
  onPoint(p) {
    const g = KC.game, b = this.bout, A = b.f[p.side], D = b.f[1 - p.side], x = p.x, tech = KC.TECHS[p.tech];
    g.particles.impact(x, 0, 40, p.full ? 1.6 : 1, p.full ? '#ffe070' : '#ffffff'); g.particles.sparks(x, 0, 40, p.full ? 14 : 8, 0);
    g.particles.dust(D.x, 0, 4, 6);
    if (!g.reduceMotion) g.shake(p.full ? 4 : 2); if (p.full) g.flash('#ffffff', .08);
    KC.sfx(p.full ? 'thwackFull' : 'thwackHalf'); KC.sfx('thudFall', { vol: p.full ? 1 : 0 }); this.stage.react(p.full ? 'full' : 'half');
    if (g.input.rumble) g.input.rumble(p.full ? .8 : .4, .15);
    if (p.full && !g.reduceMotion && !this.d.noSlow) { g.timeScale = .35 * T().gameSpeed; g.after(.35 * .35, () => { g.timeScale = T().gameSpeed; }); }
    if (KC.Voice) KC.Voice.kiai(A.d.voice, tech.kiai === 'heavy');
    if (this.d.onPoint) this.d.onPoint(p, b);
  },
  onBlock(p) { KC.game.particles.sparks(p.x, 0, 44, 8, 0); KC.sfx('clack'); this.stage.react('block'); KC.sfx('crowdOoh', { vol: .5 }); },
  onEnd(w, st) { if (this.done) return; this.done = true; if (this.d.onEnd) this.d.onEnd(w, st, this.bout); },
  update(dt) {
    const g = KC.game, b = this.bout; this.t += dt; KC.devPoll(); if (KC.overlayStep(dt)) { this.stage.update(dt); return; }
    if (KC.dev.open && !KC.dev.step) { KC.devUpdate(dt, this); this.stage.update(dt); KC.fightCamera(this, dt, b); return; }
    if (KC.dev.open) KC.devUpdate(dt, this);
    if (KC.dev.step) { KC.dev.step = 0; for (let i = 0; i < 1; i++) b.update(STEP); }
    else if (!(KC.dev.freezeAll)) { this.bout.infiniteTime = KC.dev.infinite; b.update(dt); }
    // skip the reset walk with start after 0.6 s of award
    if (b.phase === 'award' && g.input.pressed('start') && b.pt > b.pace(.6)) b.skipReq = true;
    this.stage.update(dt); KC.updateReferee(b, dt); this.footsteps(); this.hints(dt); KC.fightCamera(this, dt, b);
    if (this.d.update) this.d.update(dt, this);
  },
  footsteps() { const b = this.bout; for (const f of b.f) { if (f.walking && f.state === 'free' && f.z === 0) { f._st = (f._st || 0) + 1; if (f._st % 38 === 0) KC.sfx('stepBare'); } if (f.landed) { f.landed = false; KC.sfx('land'); KC.game.particles.dust(f.x, 0, 2, 3); } if (f.tech && f.t === 2 && !f.tech.util) { KC.sfx(f.tech.height === 'high' || f.tech.spin ? 'whooshH' : 'whooshL'); if (this.d.mode !== 'attract' || true) { if (!this._k) this._k = 0; } } } },
  hints(dt) {
    if (!this.d.hints || KC.game.settings.hints === false) { this.hud.hint = null; return; }
    this.hintT += dt; this.hud.hint = KC.HINTS[Math.floor(this.hintT / 7) % KC.HINTS.length];
  },
  draw(r) {
    const g = KC.game, b = this.bout;
    this.stage.draw(r);
    for (const f of b.f) f.draw(r, {});
    KC.drawReferee && KC.drawReferee(r, b, this.stage);
    if (KC.dev.showBoxes) this.drawBoxes(r);
    this.hud.draw(r);
    if (KC.dev.showFrame || this.mode === 'freeSpar') this.drawFrame(r);
    if (KC.dev.aiThoughts) r.overlay(gg => { this.ais.forEach((a, i) => { if (a) KC.text(gg, 'AI' + (i + 1) + ' L' + a.level + ' ' + a.thought, 8, 56 + i * 10, '#9ad8ff'); }); });
    if (KC.dev.open) KC.drawDev(r, this);
    else if (this.d.prompts !== false) this.drawPrompt(r);
    KC.overlayDraw(r);
    if (this.d.draw) this.d.draw(r, this);
  },
  drawPrompt(r) {
    const b = this.bout; if (b.phase === 'fight' || this.mode === 'attract' || SESSION) return;
    if (b.phase === 'award') KC.promptBar(r, [['start', 'SKIP']]);
  },
  drawBoxes(r) {
    const b = this.bout;
    r.overlay(g => { for (const f of b.f) { const [sx, sy] = r.w(f.x, 0, f.z), w = 9, h = f.crouching ? 30 : 64; px.rect(g, Math.round(sx - w), Math.round(sy - h), w * 2, 1, '#44ff88'); px.rect(g, Math.round(sx - w), Math.round(sy), w * 2, 1, '#44ff88'); px.rect(g, Math.round(sx - w), Math.round(sy - h), 1, h, '#44ff88'); px.rect(g, Math.round(sx + w), Math.round(sy - h), 1, h, '#44ff88');
      if (f.tech && f.phase === 'active' && !f.tech.util) { const reach = f.tech.reach[1] * f.stats.reach * T().reachScale, x1 = f.x + f.face * (PUSH / 2 + reach), [ex, ey] = r.w(x1, 0, f.tech.height === 'high' ? 54 : f.tech.height === 'low' ? 8 : 34); px.disc(g, Math.round(ex), Math.round(ey), 4, '#ff4466'); } } });
  },
  drawFrame(r) {
    const f = this.bout.f[0], l = f.lastInfo || {}; const t = f.tech || KC.TECHS[f.lastTech];
    r.overlay(g => { if (!t) return; const fr = f.fr || t.f.map(v => v * 2); KC.text(g, t.name + '  S' + (fr[0] >> 1) + ' A' + (fr[1] >> 1) + ' R' + (fr[2] >> 1) + '  REACH ' + t.reach.join('-') + '  PTS ' + t.pts.join('-'), 8, r.H - 28, '#ffd060'); });
  }
};

/* ---- 54-scene-versus.js ---- */
/* ---------- versus: setup, character select, stage select, results; local Kachinuki (winner stays on) ---------- */
class Kachinuki {
  constructor(ids, target) { this.ids = ids.slice(); this.q = ids.slice(); this.target = target || 5; this.s = {}; ids.forEach(id => { this.s[id] = { wins: 0, pts: 0, conc: 0, full: 0, half: 0, blocks: 0, streak: 0, best: 0 }; }); this.over = false; this.bouts = 0; this.leaders = null; }
  get pair() { return this.q.length >= 2 ? [this.q[0], this.q[1]] : null; }
  /** the bout between pair[0] and pair[1] ended: w = 0|1 (the winner's index in the pair), stats = Bout.stats */
  result(w, stats) {
    const [a, b] = this.pair, win = w === 0 ? a : b, lose = w === 0 ? b : a; this.bouts++;
    [a, b].forEach((id, i) => { const S = this.s[id], st = stats[i]; S.pts += st.raw; S.conc += st.conceded; S.full += st.full; S.half += st.half; S.blocks += st.blocks; });
    this.s[win].wins++; this.s[win].streak++; this.s[win].best = Math.max(this.s[win].best, this.s[win].streak); this.s[lose].streak = 0;
    this.q = [win, ...this.q.slice(2), lose]; if (this.s[win].wins >= this.target) this.over = true; return win;
  }
  leave(id) { this.q = this.q.filter(x => x !== id); this.left = (this.left || []).concat(id); if (this.q.length < 2) this.over = true; }
  standings() {
    const ids = this.ids.filter(id => !(this.left || []).includes(id)).concat(this.left || []), cmp = (x, y) => { const a = this.s[x], b = this.s[y]; return b.wins - a.wins || b.pts - a.pts || a.conc - b.conc; };
    const sorted = ids.slice().sort(cmp), out = []; sorted.forEach(id => { const last = out[out.length - 1]; if (last && cmp(last[0], id) === 0) last.push(id); else out.push([id]); }); return out;
  }
}
KC.Kachinuki = Kachinuki;
const padOnly = m => { const o = {}; for (const a in m) o[a] = m[a].filter(c => /^Pad\d+$/.test(c)); return o; };
KC.applyMaps = () => {
  const g = KC.game, P = g.players; if (P.length < 2) { P[0].use(KC_KEYS); return; }
  P.forEach((p, i) => { if (p.half === 'right' || (i === 1 && !p.pad && p.half !== 'left')) p.use(KC_P2); else if (p.half === 'left' || i === 0) p.use(P.some(q => q.half === 'right') ? KC_P1 : KC_KEYS); else p.use(padOnly(KC_KEYS)); });
};
KC.resetPlayers = () => { const g = KC.game; while (g.players.length > 1) g.removePlayer(g.players[g.players.length - 1]); g.players[0].use(KC_KEYS); };
const GRID = ['taro', 'kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];
const VS_STAGES = ['dojo', 'harbor', 'bamboo', 'log', 'ship', 'market', 'fuji', 'stadium'];
KC.vs = { mode: 'cpu', cpu: 5, picks: [], stage: 'dojo', last: null, k: null };
simpleScene('versusSetup', {
  enter(d) {
    const g = KC.game; this.d = d || {}; this.stage = new Stage('stadium'); this.screen = this.d.screen || 'mode'; this.t = 0; this.rigs = {}; GRID.forEach(id => { this.rigs[id] = KC.makeRig(KC.FIGHTER[id], 0, 'black1'); });
    g.allowJoin({ max: 4, onJoin: () => { KC.applyMaps(); KC.sfx('good'); } }); KC.idle.t = 0; KC.music('select'); g.follow(null); this.cur = []; this.locked = []; this.stSel = Math.max(0, VS_STAGES.indexOf(KC.vs.stage)); this.buildMode(); KC.current = this;
    if (this.screen === 'select') this.initSelect(); this.hot = [];
  },
  exit() { KC.game.allowJoin(false); },
  buildMode() {
    const V = KC.vs, modes = ['cpu', '2p', 'kachi'], names = { cpu: '1 PLAYER VS CPU', '2p': '2 PLAYERS', kachi: 'KACHINUKI (3-4 PLAYERS)' };
    this.menu = new Menu([
      { label: () => names[V.mode], sub: 'LEFT/RIGHT CHANGES THE MODE', adjust: d => { V.mode = modes[(modes.indexOf(V.mode) + d + 3) % 3]; }, onPick: () => { V.mode = modes[(modes.indexOf(V.mode) + 1) % 3]; } },
      { label: () => 'CPU LEVEL ' + V.cpu, sub: 'LEFT/RIGHT: 1 (EASY) TO 10 (MEAN)', disabled: false, adjust: d => { V.cpu = clamp(V.cpu + d, 1, 10); }, onPick: () => { V.cpu = V.cpu % 10 + 1; } },
      { label: 'START', sub: () => '', onPick: () => this.start() },
      { label: 'BACK', onPick: () => KC.game.go('title', { menu: true }) }
    ], { y: r => Math.round(r.H * .3), scale: 2, onCancel: () => KC.game.go('title', { menu: true }) });
  },
  need() { const V = KC.vs; return V.mode === 'kachi' ? 3 : V.mode === '2p' ? 2 : 1; },
  start() { const n = KC.game.players.length, V = KC.vs; if (n < this.need()) { this.warn = 2.5; KC.sfx('bad'); return; } this.initSelect(); },
  initSelect() { const V = KC.vs, n = V.mode === 'kachi' ? Math.min(4, KC.game.players.length) : 2; this.screen = 'select'; this.cur = Array.from({ length: n }, (_, i) => i * 2 % 10); this.locked = Array(n).fill(false); this.kinds = Array.from({ length: n }, (_, i) => V.mode === 'cpu' && i === 1 ? 'cpu' : 'human'); KC.sfx('menuOk'); },
  open(id) { return KC.fighterOpen(id); },
  update(dt) {
    const g = KC.game, I = g.input, P = g.players; this.t += dt; this.stage.update(dt); g.focus(200, 0, 50); this.warn = Math.max(0, (this.warn || 0) - dt);
    if (KC.anyInput()) KC.idle.t = 0; else KC.idle.t += dt; if (KC.idle.t >= 10) { KC.idle.t = 0; g.go('attract'); return; }
    if (this.screen === 'mode') { this.menu.update(dt); return; }
    if (this.screen === 'select') this.updateSelect(dt); else if (this.screen === 'stage') this.updateStage(dt);
  },
  updateSelect(dt) {
    const g = KC.game, P = g.players, V = KC.vs, n = this.cur.length, mouse = P[0];
    for (let i = 0; i < n; i++) {
      if (this.locked[i]) { if (this.kinds[i] === 'human' && P[i] && P[i].pressed('cancel')) { this.locked[i] = false; KC.sfx('menuBack'); P[i].consumeAll(); } continue; }
      const cpuNow = this.kinds[i] === 'cpu'; if (cpuNow && !this.locked.slice(0, i).every(Boolean)) continue;
      const I = cpuNow ? P[0] : P[i]; if (!I) continue; let c = this.cur[i], x = c % 5, y = Math.floor(c / 5);
      if (I.repeat('left', .35, .12)) x = (x + 4) % 5; if (I.repeat('right', .35, .12)) x = (x + 1) % 5; if (I.repeat('up', .35, .12) || I.repeat('down', .35, .12)) y = 1 - y;
      if (y * 5 + x !== c) { this.cur[i] = y * 5 + x; KC.sfx('menuMove'); }
      if (i === 0 || cpuNow) { const p = I.pointer(); if (p && (p[0] !== this._px || p[1] !== this._py)) { this._px = p[0]; this._py = p[1]; const k = this.hitCell(p); if (k >= 0) this.cur[i] = k; } }
      const click = (i === 0 || cpuNow) ? this.hitCell(I.clicked()) : -1; if (click >= 0) this.cur[i] = click;
      if (I.pressed('confirm') || click >= 0) { const id = GRID[this.cur[i]]; if (this.open(id)) { this.locked[i] = true; KC.sfx('menuOk'); I.consumeAll(); } else { KC.sfx('bad'); } }
      if (cpuNow && I.pressed('cancel')) { this.locked[0] = false; I.consumeAll(); }
      if (!cpuNow && I.pressed('cancel') && i === 0) { I.consumeAll(); KC.sfx('menuBack'); this.screen = 'mode'; return; }
    }
    if (this.locked.every(Boolean)) { KC.vs.picks = this.cur.map(c => GRID[c]); this.screen = 'stage'; KC.sfx('menuOk'); }
  },
  hitCell(p) { if (!p || !this.cells) return -1; for (let k = 0; k < this.cells.length; k++) { const c = this.cells[k]; if (p[0] >= c.x && p[0] < c.x + c.s && p[1] >= c.y && p[1] < c.y + c.s) return k; } return -1; },
  updateStage(dt) {
    const g = KC.game, I = g.input, n = VS_STAGES.length + 1;
    if (I.repeat('left', .35, .12)) { this.stSel = (this.stSel + n - 1) % n; KC.sfx('menuMove'); } if (I.repeat('right', .35, .12)) { this.stSel = (this.stSel + 1) % n; KC.sfx('menuMove'); }
    const c = I.clicked(); if (c) { if (c[0] < g.W * .25) { this.stSel = (this.stSel + n - 1) % n; return; } if (c[0] > g.W * .75) { this.stSel = (this.stSel + 1) % n; return; } }
    if (this.stSel < VS_STAGES.length && this.stage.d.id !== VS_STAGES[this.stSel]) this.stage = new Stage(VS_STAGES[this.stSel]);
    if (I.pressed('cancel')) { I.consumeAll(); this.screen = 'select'; this.locked = this.locked.map(() => false); return; }
    if (I.pressed('confirm') || (c && c[0] >= g.W * .25 && c[0] <= g.W * .75)) { I.consumeAll(); const stg = this.stSel >= VS_STAGES.length ? VS_STAGES[Math.floor(Math.random() * VS_STAGES.length)] : VS_STAGES[this.stSel]; KC.vs.stage = stg; KC.startVersus(); }
  },
  draw(r) {
    backDrop(r, this); const V = KC.vs;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.screen === 'mode') {
        KC.title(g, 'VERSUS', W / 2, 14, 3);
        const n = KC.game.players.length; KC.text(g, 'PLAYERS JOINED: ' + n + (n < this.need() ? '   (NEED ' + this.need() + ')' : ''), W / 2, Math.round(H * .3) + 118, n < this.need() ? '#ff8a6a' : '#9ad8ff', { align: 'center' });
        KC.text(g, 'PLAYER 2: PRESS 2 ON THE KEYBOARD (ARROWS + IJKL) OR START ON ANOTHER PAD', W / 2, Math.round(H * .3) + 130, '#cfc8e8', { align: 'center' });
        KC.text(g, 'KEYBOARD 2P: P1 = WASD + T F G H    P2 = ARROWS + I J K L', W / 2, Math.round(H * .3) + 140, '#8a84a8', { align: 'center' });
        if (this.warn > 0) KC.text(g, 'NOT ENOUGH PLAYERS YET', W / 2, H - 40, '#ff6a6a', { align: 'center', scale: 2 });
      } else if (this.screen === 'select') {
        KC.title(g, 'CHOOSE YOUR FIGHTER', W / 2, 6, 2); this.cells = []; const s = 40, gx = Math.round(W / 2 - 5 * (s + 4) / 2), gy = 30;
        GRID.forEach((id, k) => { const x = gx + (k % 5) * (s + 4), y = gy + Math.floor(k / 5) * (s + 4); this.cells[k] = { x, y, s }; const open = this.open(id); px.rect(g, x - 1, y - 1, s + 2, s + 2, '#05040a'); px.rect(g, x, y, s, s, '#241a40'); this.rigs[id].drawPortrait(g, x, y, s, { tint: open ? undefined : '#101018', zoom: 2.6 }); if (!open) E.font.text(g, '?', x + s / 2, y + s / 2 - 4, '#ffd060', { align: 'center', scale: 2, outline: false }); });
        const cols = ['#fff6e8', '#ff5a4a', '#5ad8ff', '#ffd060'];
        this.cur.forEach((c, i) => { const x = gx + (c % 5) * (s + 4), y = gy + Math.floor(c / 5) * (s + 4), col = cols[i], wait = this.kinds[i] === 'cpu' && !this.locked.slice(0, i).every(Boolean); px.rect(g, x - 2 - i, y - 2 - i, s + 4 + 2 * i, 2, col); px.rect(g, x - 2 - i, y + s + i, s + 4 + 2 * i, 2, col); px.rect(g, x - 2 - i, y - 2 - i, 2, s + 4 + 2 * i, col); px.rect(g, x + s + i, y - 2 - i, 2, s + 4 + 2 * i, col); KC.text(g, (this.kinds[i] === 'cpu' ? 'CPU' : 'P' + (i + 1)) + (this.locked[i] ? ' OK' : wait ? ' ...' : ''), x + s / 2, y + s + 3 + i * 8, col, { align: 'center' }); });
        // big info panels for the first two cursors
        for (let i = 0; i < Math.min(2, this.cur.length); i++) { const f = KC.FIGHTER[GRID[this.cur[i]]], x = i === 0 ? 10 : W - 120, y = gy + 2 * (s + 4) + 8; KC.panel(g, x, y, 110, 70, { alpha: .8 }); KC.text(g, f.name, x + 6, y + 6, i === 0 ? '#fff6e8' : '#ff9a8a'); KC.text(g, up(f.intro ? f.intro.replace(/^.*$/, '') + f.style : ''), x + 6, y + 17, '#cfc8e8'); [['SPEED', f.stats.speed], ['REACH', f.stats.reach], ['WALK', f.stats.walk]].forEach(([n2, v], k) => { KC.text(g, n2, x + 6, y + 30 + k * 11, '#9ad8ff'); px.rect(g, x + 44, y + 31 + k * 11, 60, 6, '#10101c'); px.rect(g, x + 45, y + 32 + k * 11, Math.round(clamp((v - .7) / .5, .05, 1) * 58), 4, '#ffd060'); }); this.rigs[f.id].drawPortrait(g, x + 66, y - 2, 44, { zoom: 2 }); }
        if (V.mode === 'cpu') KC.text(g, 'CPU LEVEL ' + V.cpu, W / 2, H - 52, '#9ad8ff', { align: 'center' });
      } else {
        KC.title(g, 'CHOOSE THE STAGE', W / 2, 8, 2); const nm = this.stSel >= VS_STAGES.length ? 'RANDOM' : KC.STAGE[VS_STAGES[this.stSel]].name;
        KC.text(g, '◂   ' + nm + '   ▸', W / 2, H - 56, '#ffd060', { align: 'center', scale: 2 }); KC.text(g, (this.stSel + 1) + '/' + (VS_STAGES.length + 1), W / 2, H - 40, '#cfc8e8', { align: 'center' });
      }
    });
    if (this.screen === 'mode') this.menu.draw(r);
    KC.promptBar(r, [['confirm', this.screen === 'mode' ? 'SELECT' : 'PICK'], ['cancel', 'BACK']]);
  }
});
KC.startVersus = () => {
  const g = KC.game, V = KC.vs, P = g.players, picks = V.picks.slice();
  if (V.mode === 'kachi') { const ids = picks.map((_, i) => 'P' + (i + 1)); KC.localK = { k: new Kachinuki(ids, T().sessionTarget), picks, stage: V.stage }; KC.nextKachi(); return; }
  const classic = g.settings.palette === 'Classic';
  const d = { mode: 'versus', stage: V.stage, ids: picks.slice(0, 2), names: V.mode === '2p' ? ['P1', 'P2'] : ['P1', 'CPU'], tags: ['WHITE', 'RED'], players: V.mode === '2p' ? ['human', 'human2'] : ['human', 'cpu'], level: [0, V.cpu], hideScore: true, seed: 11 + Math.floor(Math.random() * 1000), single: false,
    onEnd: (w, st, bout) => g.go('results', { w, st, bout: { stats: bout.stats, rounds: bout.rounds.slice(), pts: bout.pts }, d, names: d.names }) };
  g.go('fight', d);
};
KC.nextKachi = () => {
  const g = KC.game, L = KC.localK, k = L.k, pr = k.pair; if (!pr || k.over) { g.go('results', { kachi: L, w: 0 }); return; }
  const idx = id => k.ids.indexOf(id), P = g.players;
  g.go('kachiCard', { next: () => g.go('fight', { mode: 'kachinuki', stage: L.stage, ids: pr.map(id => L.picks[idx(id)]), names: pr, tags: ['WHITE', 'RED'], players: pr.map(id => (() => { const ri = idx(id); const rd = new Reader(P[ri] || P[0]); return (m, f, b) => rd.read(); })()), single: true, hideScore: true, seed: 5 + k.bouts, prompts: false,
    onEnd: (w, st, bout) => { k.result(w, bout.stats); g.go('kachiCard', { done: true, next: () => KC.nextKachi() }); } }) });
};
simpleScene('kachiCard', {
  enter(d) { this.d = d; this.t = 0; this.stage = new Stage(KC.localK.stage); KC.music('select'); KC.game.follow(null); KC.current = this; this.rigs = KC.localK.picks.map((id, i) => KC.makeRig(KC.FIGHTER[id], i % 2, 'black1')); },
  update(dt) { this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel' })); const I = KC.game.input; if (this.t > 2.4 || (this.t > .6 && (I.pressed('confirm') || I.pressed('start') || I.clicked()))) { I.consumeAll(); this.d.next(); } },
  draw(r) {
    backDrop(r, this); const k = KC.localK.k;
    r.overlay(g => {
      const W = r.W, H = r.H; KC.title(g, this.d.done ? 'BOUT OVER' : 'KACHINUKI!', W / 2, 12, 3); const pr = k.pair;
      if (pr && !this.d.done) KC.text(g, pr[0] + ' (WHITE)  VS  ' + pr[1] + ' (RED)', W / 2, 44, '#fff', { align: 'center', scale: 2 });
      KC.text(g, 'WINNER STAYS ON. FIRST TO ' + k.target + ' BOUT WINS.', W / 2, 66, '#ffe8a0', { align: 'center' });
      k.q.forEach((id, i) => { const S = k.s[id]; KC.text(g, (i + 1) + '. ' + id + '  WINS ' + S.wins + '  STREAK ' + S.streak, W / 2, 90 + i * 14, i < 2 ? '#fff6d0' : '#8a84a8', { align: 'center' }); });
    });
    KC.promptBar(r, [['confirm', 'NEXT']]);
  }
});
simpleScene('results', {
  enter(d) {
    this.d = d; this.t = 0; this.stage = new Stage(d.kachi ? d.kachi.stage : d.d.stage); KC.game.follow(null); KC.music('ending'); KC.sting('victory'); KC.current = this; const K = d.kachi;
    if (K) { this.items = [{ label: 'MAIN MENU', onPick: () => { KC.resetPlayers(); KC.game.go('title', { menu: true }); } }, { label: 'VERSUS MENU', onPick: () => KC.game.go('versusSetup') }]; this.rig = KC.makeRig(KC.FIGHTER[K.picks[0]], 0, 'black1'); }
    else { const w = d.w; this.rig = KC.makeRig(KC.FIGHTER[d.d.ids[w]], w, 'black1'); this.items = [{ label: 'REMATCH', onPick: () => KC.game.go('fight', Object.assign({}, d.d, { seed: (d.d.seed || 1) + 1 })) }, { label: 'CHARACTER SELECT', onPick: () => KC.game.go('versusSetup', { screen: 'select' }) }, { label: 'STAGE SELECT', onPick: () => { KC.game.go('versusSetup', { screen: 'stage' }); } }, { label: 'MAIN MENU', onPick: () => { KC.resetPlayers(); KC.game.go('title', { menu: true }); } }]; }
    this.menu = new Menu(this.items, { y: r => r.H - 82, scale: 2 }); this.menu.o.scale = 1;
  },
  update(dt) { this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); this.rig.update(dt, { x: 200, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'cheer', expr: 'shout' }); if (this.t > .8) this.menu.update(dt); },
  draw(r) {
    backDrop(r, this); r.actor(200, 0, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view)); const d = this.d;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (d.kachi) { const K = d.kachi.k, st = K.standings(); KC.title(g, 'ROUND OVER', W / 2, 10, 2); st.forEach((grp, i) => KC.text(g, (i + 1) + '. ' + grp.join(' = ') + '   BOUT WINS ' + K.s[grp[0]].wins + '  FULL ' + K.s[grp[0]].full, W / 2, 34 + i * 12, i === 0 ? '#ffd060' : '#cfc8e8', { align: 'center' })); return; }
      const w = d.w, st = d.bout.stats[w], nm = w === 0 ? 'WHITE' : 'RED'; KC.title(g, nm + ' WINS ' + d.bout.rounds.join('-'), W / 2, 8, 3);
      const lines = ['FULL POINTS  ' + d.bout.stats[w].full, 'HALF POINTS  ' + d.bout.stats[w].half, 'BLOCKS  ' + d.bout.stats[w].blocks, 'BEST TECHNIQUE  ' + (st.best || '-')]; lines.forEach((l, i) => KC.text(g, l, W / 2, 44 + i * 12, '#fff', { align: 'center' }));
    });
    this.menu.draw(r); KC.promptBar(r, [['confirm', 'SELECT']]);
  }
});

/* ---- 55-scene-misc.js ---- */
/* ---------- dojo menu, bonus menu, records, about, move list ---------- */
menuScene('dojoMenu', 'dojo', 'DOJO', () => [
  { label: 'LESSON I', sub: '7 DRILLS: THE BASICS', onPick: () => KC.game.go('practice', { lesson: 'I', stage: 'dojo' }) },
  { label: 'LESSON II', sub: '6 DRILLS: STEP IN, STRIKE THROUGH', onPick: () => KC.game.go('practice', { lesson: 'II', stage: 'harbor' }) },
  { label: 'LESSON III', sub: '8 DRILLS: SPINS, FLIPS, SWEEPS', onPick: () => KC.game.go('practice', { lesson: 'III', stage: 'log' }) },
  { label: 'ALL TECHNIQUES', sub: 'ALL 21 DRILLS, ONE BY ONE', onPick: () => KC.game.go('practice', { lesson: 'ALL', stage: 'dojo' }) },
  { label: 'FREE SPAR', sub: 'HIT A DUMMY. BOXES AND FRAME DATA ON', onPick: () => KC.startFreeSpar() },
  { label: 'TECHNIQUE LAB', sub: 'FRAME DATA AND MEASURED REACH, TECHNIQUE BY TECHNIQUE', onPick: () => KC.game.go('lab', { id: 'frontKick' }) },
  { label: 'MOVE LIST', sub: 'EVERY TECHNIQUE, LIVE', onPick: () => KC.game.go('moveList', { back: 'dojoMenu' }) }
]);
KC.startFreeSpar = () => { const g = KC.game; KC.dev.showBoxes = true; KC.dev.showInput = true; KC.dev.showFrame = true; g.go('fight', { mode: 'freeSpar', stage: 'dojo', ids: ['taro', 'kamaboko'], players: ['human', 'dummy'], intro: false, single: true, practice: true, hideScore: true, seed: 3, noSlow: true, onEnd: () => g.go('dojoMenu'), onStart: (b, sc) => { b.o.practice = true; b.infiniteTime = true; sc.dummyMode = 'stand'; }, draw: (r, sc) => r.overlay(gg => { KC.text(gg, 'DUMMY: ' + sc.dummyMode.toUpperCase() + '   (' + (KC.family() === 'key' ? 'TAB' : 'CREATE') + ' CHANGES IT)', r.W / 2, r.H - 30, '#ffd060', { align: 'center' }); }), update: (dt, sc) => { const I = KC.game.input; if (I.pressed('dummy')) { const L = ['stand', 'crouch', 'jump', 'block', 'attack']; sc.dummyMode = L[(L.indexOf(sc.dummyMode) + 1) % L.length]; KC.sfx('menuMove'); } if (sc.bout.phase === 'done') g.go('dojoMenu'); } }); };
const BONUS_OPTS = { boards: { n: 1, mat: 0 }, pots: {}, bull: {} };
menuScene('bonusMenu', 'courtyard', 'BONUS GAMES', function () {
  const o = this.opts = this.opts || { n: 1, mat: 0 }, ns = [3, 5, 7, 10], mats = KC.BONUS.boards.mats;
  return [
    { label: () => 'BREAK THE BOARDS  ' + ns[o.n] + ' ' + mats[o.mat][0], sub: 'LEFT/RIGHT: BOARDS (' + ns.join(',') + ') - UP/DOWN THEN LEFT/RIGHT FOR MATERIAL', adjust: d => { o.n = (o.n + d + ns.length) % ns.length; }, onPick: () => KC.game.go('bonus', { kind: 'boards', params: { n: ns[o.n], mat: o.mat } }) },
    { label: () => 'MATERIAL  ' + mats[o.mat][0] + ' X' + mats[o.mat][1], sub: 'PINE, ROOF TILE X1.5, ICE X2 - SCORE MULTIPLIER', adjust: d => { o.mat = (o.mat + d + mats.length) % mats.length; }, onPick: () => { o.mat = (o.mat + 1) % mats.length; } },
    { label: 'POTS AHOY!', sub: '16 FLYING POTS, BOULDERS AND BOWLS', onPick: () => KC.game.go('bonus', { kind: 'pots' }) },
    { label: 'STOP THE BULL', sub: 'THREE CHARGES. WATCH THE HORNS', onPick: () => KC.game.go('bonus', { kind: 'bull' }) },
    { label: 'RECORDS', sub: 'THE BONUS TABLES', onPick: () => KC.game.go('records', { mode: 'boards', after: () => KC.game.go('bonusMenu') }) }
  ];
});
/* ---- records ---- */
simpleScene('records', {
  enter(d) { this.d = d || {}; this.modes = ['story', 'boards', 'pots', 'bull']; this.i = Math.max(0, this.modes.indexOf(this.d.mode || 'story')); this.stage = new Stage('stadium'); this.t = 0; KC.music('select'); KC.game.follow(null); KC.current = this; },
  update(dt) {
    this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input, p = I.pointer(), c = I.clicked();
    if (I.pressed('left') || (I.pressed('tLeft')) || I.pressed('dummy')) { this.i = (this.i + 3) % 4; KC.sfx('menuMove'); }
    if (I.pressed('right') || I.pressed('tRight')) { this.i = (this.i + 1) % 4; KC.sfx('menuMove'); }
    if (c) { for (let k = 0; k < 4; k++) if (this.tabs && Math.abs(c[0] - this.tabs[k]) < 36 && c[1] < 34) this.i = k; }
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); if (this.d.after) this.d.after(); else KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    backDrop(r, this); const names = { story: 'CHAMPON ROAD', boards: 'BOARDS', pots: 'POTS AHOY!', bull: 'STOP THE BULL' };
    r.overlay(g => { KC.title(g, 'RECORDS', r.W / 2, 8, 2); this.tabs = []; this.modes.forEach((m, k) => { const x = r.W / 2 + (k - 1.5) * 78; this.tabs[k] = x; KC.text(g, names[m], x, 30, k === this.i ? '#ffd060' : '#8a84a8', { align: 'center' }); if (k === this.i) px.rect(g, x - 34, 40, 68, 2, '#ffd060'); }); });
    KC.cab.drawTable(r, this.modes[this.i], 48, names[this.modes[this.i]]); KC.promptBar(r, [['confirm', 'BACK']]);
  }
});
/* ---- about / credits, paged ---- */
KC.aboutPages = () => {
  const A = KC.about(), si = A.sourceInformation, secs = [], lab = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  const flat = [];
  for (const k in lab) flat.push([lab[k], si[k]]);
  secs.push({ title: 'SOURCE INFORMATION', items: flat });
  const Q = (qs, as) => qs.map((q, i) => [q, as[i]]);
  secs.push({ title: 'TESTING FEEDBACK', items: Q(['ISSUES CAUGHT', 'GAME BREAKING', 'MOST HELPFUL TEST', 'LEAST HELPFUL TEST'], A.testingFeedback) });
  secs.push({ title: 'ENGINE FEEDBACK', items: Q(['LIKED MOST', 'STUCK OR GUESSED WRONG', 'BUILT MYSELF', 'HARDEST PART', 'WHAT I CHANGED', 'CHANGE ONE THING'], A.engineFeedback) });
  secs.push({ title: 'PROMPT FEEDBACK', items: Q(['LIKED MOST', 'CONFUSING', 'HARDEST THING', 'WHAT I WOULD CHANGE'], A.promptFeedback) });
  secs.push({ title: 'CREDITS', items: [['GAME', 'KARATE CHAMPON, AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984, DATA EAST)'], ['ENGINE', 'MY-3D2DGE V0.85.2 BY MICHAEL CROSATO (MIT)'], ['ONLINE', 'AI HUB SESSION PROTOCOL V1 (CLIENT 1.4.0)'], ['OBJECTS', 'KENNEY AND KAYKIT CC0 ASSETS (CREDITED, NOT BUNDLED)'], ['MODEL', up(si.model)], ['MUSIC, SFX, VOICES', 'ALL WRITTEN IN CODE. NO AUDIO FILES']] });
  return secs;
};
simpleScene('about', {
  enter() {
    this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .3 }); KC.music('select'); KC.game.follow(null); this.pi = 0; this.scroll = 0; KC.current = this; this.build = null; KC.idle.t = 0; this.P = this.pages(KC.game.W);
  },
  pages(RW) {
    const W = RW - 40, out = [];
    for (const sec of KC.aboutPages()) { const lines = []; for (const [k, v] of sec.items) { const w = E.font.wrap(String(v), W - 10, {}); lines.push({ k, w }); } let page = { title: sec.title, rows: [], n: 0 }; for (const it of lines) { const h = it.w.length + 1; if (page.n + h > 11 && page.rows.length) { out.push(page); page = { title: sec.title + ' (CONT.)', rows: [], n: 0 }; } page.rows.push(it); page.n += h; } out.push(page); }
    return out;
  },
  update(dt) {
    this.stage.update(dt); KC.game.focus(200, 0, 50); const I = KC.game.input; if (!this.P) return;
    if (I.repeat('right', .4, .15) || I.pressed('tRight')) { this.pi = (this.pi + 1) % this.P.length; KC.sfx('menuMove'); }
    if (I.repeat('left', .4, .15) || I.pressed('tLeft')) { this.pi = (this.pi + this.P.length - 1) % this.P.length; KC.sfx('menuMove'); }
    const c = I.clicked(); if (c) { this.pi = c[0] > this.W2 / 2 ? (this.pi + 1) % this.P.length : (this.pi + this.P.length - 1) % this.P.length; KC.sfx('menuMove'); }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    this.W2 = r.W; if (!this.P) this.P = this.pages(r.W); backDrop(r, this); const pg = this.P[this.pi];
    r.overlay(g => {
      KC.panel(g, 10, 8, r.W - 20, r.H - 40, { alpha: .85 }); KC.title(g, pg.title, r.W / 2, 14, 1);
      let y = 32; for (const row of pg.rows) { KC.text(g, row.k, 22, y, '#ffd060'); y += 10; for (const ln of row.w) { KC.text(g, ln, 28, y, '#e8e0ff'); y += 9; } y += 2; }
      KC.text(g, 'PAGE ' + (this.pi + 1) + '/' + this.P.length + '   ◂ ▸', r.W / 2, r.H - 46, '#cfc8e8', { align: 'center' });
    });
    KC.promptBar(r, [['cancel', 'BACK']]);
  }
});
/* ---- the move list: one posture at a time, around a big R-stick icon. A view, so it works as a scene and as a pause overlay ---- */
class MoveListView {
  constructor(onClose) { this.onClose = onClose; this.post = 0; this.sel = 't'; this.me = new Karateka('taro', 0, {}); this.dum = new Karateka('negi', 1, {}); this.postures = ['n', 't', 'a', 'u', 'd']; this.t = 0; this.play = 0; this.rd = new Reader(KC.game.input); this.hot = []; this.rows = []; }
  update(dt) {
    this.t += dt; const I = KC.game.input;
    if (I.repeat('up', .4, .15)) { this.post = (this.post + 4) % 5; KC.sfx('menuMove'); } if (I.repeat('down', .4, .15)) { this.post = (this.post + 1) % 5; KC.sfx('menuMove'); }
    const R = this.rd.read(); if (R.tech) { this.sel = ({ u: 'u', d: 'd', l: 'a', r: 't' })[R.tech]; this.preview(); }
    const c = I.clicked(); if (c) { for (const h of this.hot) if (Math.hypot(c[0] - h.x, c[1] - h.y) < 14) { this.sel = h.s; this.preview(); } this.rows.forEach((x, i) => { if (Math.abs(c[1] - x.y) < 8 && c[0] < 120) { this.post = i; KC.sfx('menuMove'); } }); }
    if (I.pressed('cancel') || I.pressed('start')) { I.consumeAll(); KC.sfx('menuBack'); this.onClose(); return true; }
    this.me.x = 150; this.dum.x = 150 + PUSH + 28; this.me.frozen = false;
    if (this.play) { this.play--; this.me.step(this.dum, null); if (!this.me.tech) this.play = 0; }
    this.me.update(dt, this.dum); this.dum.update(dt, this.me); return false;
  }
  preview() { const id = KC.MATRIX[this.postures[this.post] + this.sel]; if (!id) return; KC.sfx('menuMove'); this.me.reset(); this.dum.reset(); this.me.x = 150; this.dum.x = 150 + PUSH + 30; this.me.start(id, this.dum, 'n', null); this.play = 600; }
  draw(r, bare) {
    const P = this.postures[this.post], id = KC.MATRIX[P + this.sel], t = KC.TECHS[id];
    r.actor(150, 0, 0, (g, ox, oy) => this.me.rig.draw(g, ox, oy, r.view)); r.actor(this.dum.x, 0, 0, (g, ox, oy) => this.dum.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H; if (bare) px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#07060d')); KC.title(g, 'MOVE LIST', W / 2, 6, 2);
      const names = { n: 'STAND', t: 'STEP IN', a: 'STEP BACK', u: 'JUMP', d: 'CROUCH' }; this.rows = [];
      this.postures.forEach((p, i) => { const y = 36 + i * 22; this.rows[i] = { y: y + 6 }; if (i === this.post) px.rect(g, 6, y - 3, 130, 19, '#4a2a3a'); drawStick(g, 'L', p === 'n' ? null : p === 't' ? 'r' : p === 'a' ? 'l' : p, 10, y, 13); KC.text(g, names[p], 34, y + 2, i === this.post ? '#ffd060' : '#cfc8e8'); });
      const cx = W - 90, cy = 90; this.hot = []; px.disc(g, cx, cy, 14, '#10101c'); px.disc(g, cx, cy, 12, '#3a3a52'); E.font.text(g, 'R', cx, cy - 3, '#ff9a6a', { align: 'center', outline: false });
      for (const [s, dx, dy] of [['u', 0, -34], ['t', 46, 0], ['d', 0, 34], ['a', -46, 0]]) { const tid = KC.MATRIX[P + s], tt = KC.TECHS[tid]; this.hot.push({ x: cx + dx, y: cy + dy, s }); px.rect(g, cx + dx - 34, cy + dy - 6, 68, 12, s === this.sel ? '#8a3a1a' : '#201830'); KC.text(g, tt ? tt.name.replace('LUNGE ', '').slice(0, 17) : '-', cx + dx, cy + dy - 3, tt ? (s === this.sel ? '#fff6d0' : '#cfc8e8') : '#5a5478', { align: 'center' }); }
      if (t) { KC.panel(g, 6, H - 84, W - 12, 42, { alpha: .85 }); KC.text(g, t.name + '  (' + t.jp + ')', 12, H - 80, '#ffd060'); KC.text(g, 'POINTS ' + t.pts.join('-') + (t.full ? '   * FULL POINT' : t.util ? '' : '   HALF POINT') + '   ' + up(t.height).replace('NONE', 'MOVE'), 12, H - 68, '#fff'); if (!t.util) KC.text(g, 'REACH ' + t.reach.join('-') + '  FRAMES ' + t.f.join('/') + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, H - 57, '#9ad8ff'); KC.glyphTech(g, id || 'frontKick', W - 70, H - 80, {}); }
    });
    KC.promptBar(r, [['cancel', 'BACK']]);
  }
}
KC.MoveListView = MoveListView;
simpleScene('moveList', {
  enter(d) { this.d = d || {}; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .4 }); KC.game.follow(null); KC.current = this; KC.music('practice'); this.view = new MoveListView(() => KC.game.go('title', { menu: true })); if (this.d.back === 'dojoMenu') this.view.onClose = () => KC.game.go('dojoMenu'); },
  update(dt) { this.stage.update(dt); KC.game.focus(200, 0, 50); this.view.update(dt); },
  draw(r) { backDrop(r, this); this.view.draw(r); }
});
// the pause menu's Move list: an overlay over the running scene
KC.overlay = null;
KC.overlayStep = dt => { if (KC.overlay) { KC.overlay.update(dt); return true; } return false; };
KC.overlayDraw = r => { if (KC.overlay) KC.overlay.draw(r, true); };
KC.openMoveList = () => { KC.overlay = new MoveListView(() => { KC.overlay = null; }); KC.game.resume && KC.game.resume(); };

/* ---- the Technique Lab: the hero against a standing dummy; frame data and the measured contact gap ---- */
KC.measureGap = id => {
  let best = -1;
  for (let g = 0; g <= 150; g++) {
    const b = new Bout({ ids: ['taro', 'ebi'], seed: 3, ctrl: [null, null], intro: false }); b.start(); while (b.phase !== 'fight') b.step();
    const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + PUSH + g; a.frozen = d.frozen = false; a.start(id, d, 'n', 'r'); let hit = false; b.on('point', () => { hit = true; });
    for (let n = 0; n < 500 && (a.tech || b.pending); n++) { b.fightStep(); if (b.phase !== 'fight') break; } if (hit) best = g;
  }
  return best;
};
simpleScene('lab', {
  pausable: true,
  enter(d) { this.stage = new Stage('dojo'); this.i = Math.max(0, KC.SCORING.findIndex(t => t.id === (d && d.id))); this.me = new Karateka('taro', 0, {}); this.dum = new Karateka('kamaboko', 1, {}); this.gaps = {}; this.t = 0; this.slow = false; this.boxes = true; KC.music('practice'); KC.game.follow(null); KC.current = this; this.play(); },
  cur() { return KC.SCORING[this.i]; },
  play() { const t = KC.SCORING[this.i]; this.me.reset(); this.dum.reset(); this.me.x = 150; this.dum.x = 150 + PUSH + Math.round((t.reach[0] + t.reach[1]) / 2); this.dum.face = -1; this.me.frozen = false; this.me.start(t.id, this.dum, 'n', 'r'); if (this.gaps[t.id] === undefined) this.gaps[t.id] = KC.measureGap(t.id); this.run = true; },
  update(dt) {
    const I = KC.game.input; this.t += dt; this.stage.update(dt); KC.game.focus(200, 0, 50);
    if (I.pressed('tabR')) { this.i = (this.i + 1) % KC.SCORING.length; this.play(); } if (I.pressed('tabL')) { this.i = (this.i + KC.SCORING.length - 1) % KC.SCORING.length; this.play(); }
    // live sliders for this technique: up/down picks startup, active, recovery or max reach; left/right change it; start copies the JSON
    const T0 = this.cur(); this.fld = this.fld || 0;
    if (I.repeat('up', .4, .15)) this.fld = (this.fld + 3) % 4; if (I.repeat('down', .4, .15)) this.fld = (this.fld + 1) % 4;
    const dx = I.repeat('left', .35, .08) ? -1 : I.repeat('right', .35, .08) ? 1 : 0;
    if (dx) { if (this.fld < 3) T0.f[this.fld] = Math.max(1, T0.f[this.fld] + dx); else T0.reach[1] = Math.max(T0.reach[0] + 1, T0.reach[1] + dx); T0._spec = null; this.gaps[T0.id] = undefined; this.play(); }
    if (I.pressed('start')) { try { navigator.clipboard.writeText(JSON.stringify({ id: T0.id, f: T0.f, reach: T0.reach, pts: T0.pts, travel: T0.travel })); this.note = 'COPIED JSON'; } catch (e) { this.note = 'CLIPBOARD BLOCKED'; } }
    if (I.pressed('confirm') || I.pressed('tDown')) { this.play(); } if (I.pressed('tLeft')) this.slow = !this.slow; if (I.pressed('tUp')) this.boxes = !this.boxes;
    if (I.pressed('cancel')) { I.consumeAll(); KC.game.go('dojoMenu'); return; }
    const steps = this.slow ? (Math.floor(this.t * 120) % 4 === 0 ? 1 : 0) : Math.max(1, Math.round(dt * 120));
    for (let k = 0; k < steps; k++) { if (this.me.tech) this.me.step(this.dum, null); }
    this.me.update(dt, this.dum); this.dum.update(dt, this.me); if (!this.me.tech && this.t % 3 < dt) this.play();
  },
  draw(r) {
    this.stage.draw(r); this.me.draw(r); this.dum.draw(r); const t = this.cur(), f = this.me.fr || t.f.map(v => v * 2);
    r.overlay(g => {
      const W = r.W, H = r.H; KC.panel(g, 6, 6, W - 12, 62, { alpha: .85 }); KC.title(g, 'TECHNIQUE LAB', W / 2, 9, 1);
      KC.text(g, (this.i + 1) + '/15  ' + t.name + '  (' + t.jp + ')', 12, 24, '#ffd060'); KC.text(g, 'STARTUP ' + (f[0] >> 1) + '  ACTIVE ' + (f[1] >> 1) + '  RECOVERY ' + (f[2] >> 1) + ' FRAMES   ' + up(t.height) + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, 35, '#fff');
      KC.text(g, 'TABLE REACH ' + t.reach.join('-') + ' + TRAVEL ' + t.travel + '   MEASURED CONTACT GAP ' + this.gaps[t.id], 12, 46, '#9ad8ff'); KC.text(g, 'POINTS ' + t.pts.join('-') + (t.full ? '  FULL' : '  HALF') + '   EDIT: ' + ['STARTUP', 'ACTIVE', 'RECOVERY', 'MAX REACH'][this.fld || 0] + ' (UP/DOWN, LEFT/RIGHT)  START = COPY JSON ' + (this.note || ''), 12, 57, '#ffe8a0');
      if (this.boxes) for (const q of [this.me, this.dum]) { const [sx, sy] = r.w(q.x, 0, q.z); px.rect(g, Math.round(sx - 9), Math.round(sy - 64), 18, 1, '#44ff88'); px.rect(g, Math.round(sx - 9), Math.round(sy), 18, 1, '#44ff88'); px.rect(g, Math.round(sx - 9), Math.round(sy - 64), 1, 64, '#44ff88'); px.rect(g, Math.round(sx + 9), Math.round(sy - 64), 1, 64, '#44ff88'); }
    });
    KC.promptBar(r, [['confirm', 'REPLAY'], ['cancel', 'BACK']]);
  }
});

/* ---- 60-online.js ---- */
/* ---------- AI Hub session (protocol v1, shared-world): the host runs Kachinuki, guests send input and render snapshots ---------- */
const HUBCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], SEAT_FIGHTERS = ['taro', 'kamaboko', 'negi', 'ebi'];
const PCODE = { n: 0, u: 1, d: 2, l: 3, r: 4 }, PCHAR = ['n', 'u', 'd', 'l', 'r'];
const SEND_BUDGET = { last: 0 };
class Net {
  constructor(hub) {
    this.h = hub; this.t0 = performance.now(); this.state = 'card'; this.card = null; this.started = false; this.ended = false; this.endInfo = null; this.me = hub.me; this.host = hub.isHost; this.server = !!hub.server;
    this.players = (hub.players || []).map(p => ({ id: p.id, name: safeName(p.name), color: p.color || HUBCOL[p.id % 4], fighter: SEAT_FIGHTERS[p.id % 4] }));
    this.inputs = {}; this.players.forEach(p => { this.inputs[p.id] = { posture: 'n', edges: [], held: 'n' }; });
    this.reader = new Reader(KC.game.input); this.seq = 0; this.lastSend = 0; this.lastHb = 0; this.lastSnap = 0; this.evq = []; this.snap = null; this.snaps = []; this.delay = 0; this.delayQ = []; this.lat = {}; this.finished = false; this.counts = { sent: 0, recv: 0 }; this.pred = null; this.prevPosture = 'n'; this.pend = []; this.t = 0; this.puppets = null;
    hub.on('card', c => { this.card = c; }); hub.on('start', s => { this.started = true; this.startIn = s.in; }); hub.on('message', (d, from) => this.onMessage(d, from)); hub.on('leave', e => this.onLeave(e)); hub.on('time-up', e => this.onTimeUp(e)); hub.on('end', e => this.onEnd(e));
  }
  now() { return typeof this.h.time === 'function' ? this.h.time() : 0; }
  clock() { const c = this.now(); return isFinite(c) ? c + 1e6 : performance.now(); }   // real-time cadence: the hub's clock when it runs, else the wall clock
  send(d, rel) { const ok = this.h.send(d, { reliable: rel !== false }); if (ok !== false) this.counts.sent++; return ok; }
  // ---------- host ----------
  startWorld() {
    if (this.world) return; this.world = true; const ids = this.players.map(p => p.id); this.K = new Kachinuki(ids, T().sessionTarget); this.bouts = 0; this.view = null; this.newBout(); this.over = false; this.sessionStart = true;
  }
  fighterOf(id) { const p = this.players.find(q => q.id === id); return p ? p.fighter : 'taro'; }
  nameOf(id) { const p = this.players.find(q => q.id === id); return p ? p.name : '?'; }
  ctrlFor(id) {
    return (m, f, b) => {
      let inp = this.inputs[id]; if (!inp) return null;
      if (id === this.me && !this.server) { // the host's own fighter, through the fairness delay
        const c = this.reader.read(); this.delayQ.push({ at: this.clock(), c }); const dly = this.delay; let out = null;
        while (this.delayQ.length && this.clock() - this.delayQ[0].at >= dly) { const e = this.delayQ.shift(); inp.posture = e.c.posture; if (e.c.tech) inp.edges.push(e.c.tech); }
        if (KC.dev.open || (KC.menuOpen())) { inp.posture = 'n'; inp.edges.length = 0; }
      }
      return { posture: inp.posture, tech: inp.edges.length ? inp.edges.shift() : null };
    };
  }
  newBout() {
    const K = this.K, pr = K.pair; if (!pr || K.over) { this.finishNow(); return; }
    this.pair = pr.slice(); this.bout = new Bout({ ids: pr.map(id => this.fighterOf(id)), names: pr.map(id => this.nameOf(id)), seed: 100 + this.bouts, single: true, intro: this.bouts === 0, ctrl: pr.map(id => this.ctrlFor(id)), mode: 'session' });
    this.bouts++; this.bout.on('call', c => this.queue({ k: 'call', id: c.id })); this.bout.on('point', p => this.queue({ k: 'point', side: p.side, tech: p.tech, pts: p.pts, full: p.full, counter: p.counter, x: p.x }));
    this.bout.on('block', p => this.queue({ k: 'block', side: p.side, x: p.x })); this.bout.on('aiuchi', () => this.queue({ k: 'aiuchi' })); this.bout.on('hantei', h => this.queue({ k: 'hantei', v: h.votes, w: h.winner }));
    this.bout.on('matchEnd', e => this.boutEnded(e.winner)); this.queue({ k: 'bout', pair: this.pair, f: this.pair.map(id => this.fighterOf(id)), q: this.K.q.slice() });
    this.hud = new FightHUD(this.bout, { names: this.pair.map(id => this.nameOf(id)), hideScore: true }); this.stageReact = this.stage; this.bout.start();
    this.bout.on('point', p => KC.scenes.fight.onPoint.call(this.sceneRef, p)); this.bout.on('block', p => KC.scenes.fight.onBlock.call(this.sceneRef, p));
    this.forfeit = false;
  }
  boutEnded(w) {
    const K = this.K; const win = K.result(w, this.bout.stats); this.queue({ k: 'boutEnd', winner: win, wins: K.s[win].wins, q: K.q.slice(), forfeit: this.forfeit }); this.queue({ k: 'stand', st: K.standings() });
    if (K.over) { this.finishNow(); return; } this.newBout();
  }
  queue(e) { this.evq.push(e); }
  flush() { if (this.evq.length) { this.send({ t: 'ev', list: this.evq.splice(0, 20) }, true); } }
  forfeitBout(leaverIdx) {
    const b = this.bout; if (!b || b.done) return; this.forfeit = true; b.call('forfeit'); b.done = true; b.phase = 'done'; b.matchWinner = 1 - leaverIdx; b.emit('matchEnd', { winner: 1 - leaverIdx, stats: b.stats, score: b.score });
  }
  finishNow() {
    if (this.finished || !this.K) return; this.finished = true; const K = this.K;
    // a bout in progress counts only if a side leads on points
    if (this.bout && !this.bout.done && this.bout.pts[0] !== this.bout.pts[1]) { const w = this.bout.pts[0] > this.bout.pts[1] ? 0 : 1; K.result(w, this.bout.stats); }
    const st = K.standings(), scores = {}, stats = {}, awards = [], pl = this.players.filter(p => true);
    K.ids.forEach(id => { scores[id] = K.s[id].wins; stats[id] = { 'Bouts won': K.s[id].wins, 'Full points': K.s[id].full, 'Half points': K.s[id].half, 'Best streak': K.s[id].best }; });
    const most = (key) => { let best = null, v = 0; K.ids.forEach(id => { if (K.s[id][key] > v) { v = K.s[id][key]; best = id; } }); return best === null ? null : { id: best, v }; };
    const ih = most('full'), iw = most('blocks'), ks = most('best'); if (ih) awards.push({ id: ih.id, title: 'IPPON HUNTER', detail: ih.v + ' full points' }); if (iw) awards.push({ id: iw.id, title: 'IRON WALL', detail: iw.v + ' blocks' }); if (ks && ks.v >= 3) awards.push({ id: ks.id, title: 'KACHINUKI', detail: ks.v + ' bouts in a row' });
    this.standings = st; this.queue({ k: 'over', st }); this.flush();
    try { this.h.finish({ standings: st, scores, stats, awards }); } catch (e) { /* ok */ }
  }
  onLeave(e) {
    if (!this.host || !this.K || this.finished) return; const id = e.id, K = this.K, idx = this.pair ? this.pair.indexOf(id) : -1;
    if (idx >= 0) this.forfeitBout(idx); else K.leave(id);
    if (idx >= 0 && !this.finished) { K.leave(id); if (K.q.length < 2) { K.over = true; this.finishNow(); } }
    else if (K.q.length < 2) { K.over = true; this.finishNow(); }
  }
  onTimeUp() { if (this.host) this.finishNow(); }
  onEnd(e) { this.ended = true; this.endInfo = e || {}; KC.music(null); try { KC.game.audio.stopMusic && KC.game.audio.stopMusic(); KC.game.audio.mute(true); } catch (er) { /* ok */ } if (KC.Voice._bus) KC.Voice._bus.g.gain.value = 0; }
  // ---------- messages ----------
  onMessage(d, from) {
    this.counts.recv++; if (this.ended || !d) return;
    if (d.t === 'in' && this.host) {
      const inp = this.inputs[from]; if (!inp) return; inp.posture = PCHAR[d.p] || 'n'; inp.held = PCHAR[d.h] || 'n'; (d.e || []).forEach(e => inp.edges.push(PCHAR[e[0]])); inp.edges = inp.edges.slice(-6);
      const lat = Math.max(0, this.now() - d.a); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2; this.updateDelay();
    } else if (d.t === 'hb') { /* heartbeat */ }
    else if (d.t === 's' && !this.host) { this.snaps.push({ at: this.clock(), s: d }); if (this.snaps.length > 6) this.snaps.shift(); this.snap = d; }
    else if (d.t === 'ev' && !this.host) (d.list || []).forEach(e => this.onEvent(e));
  }
  updateDelay() { if (!this.pair) return; const other = this.pair.find(id => id !== this.me); this.delay = clamp(this.lat[other] || 0, 0, 150); }
  onEvent(e) {
    const sc = this.sceneRef; if (!sc) return;
    if (e.k === 'bout') { this.pair = e.pair; this.fighters = e.f; this.queueIds = e.q; this.makePuppets(e.f, e.pair); }
    else if (e.k === 'call') { const v = this.view; if (v) { sc.hud && (sc.hud.call = { id: e.id, t: KC.game.real, text: KC.callText(e.id) }); } KC.onCall({ id: e.id }); }
    else if (e.k === 'point') { const p = { side: e.side, tech: e.tech, pts: e.pts, full: e.full, counter: e.counter, x: e.x }; KC.scenes.fight.onPoint.call(sc, Object.assign(p, {})); if (sc.hud) sc.hud.pop.push({ t: KC.game.real, text: KC.TECHS[e.tech].name + ' ' + e.pts + (e.counter ? ' COUNTER!' : ''), side: e.side, full: e.full }); }
    else if (e.k === 'block') KC.scenes.fight.onBlock.call(sc, { x: e.x, side: e.side });
    else if (e.k === 'boutEnd') { this.queueIds = e.q; this.lastWinner = e.winner; }
    else if (e.k === 'over') { this.standings = e.st; this.overSeen = true; }
    else if (e.k === 'stand') { this.stand = e.st; }
  }
  makePuppets(fighters, pair) {
    const P = this.puppets || (this.puppets = {}); this.view = this.view || { phase: 'ready', pt: 0, dur: 100, clock: 30, pts: [0, 0], rounds: [0, 0], round: 1, needRounds: 1, single: true, score: [0, 0], f: null, lastPoint: null, hantei: null, winner: -1, pace: () => 60, on() { }, stats: [{}, {}] };
    this.view.f = fighters.map((fid, i) => { const key = fid + ':' + i; if (!P[key]) { const k = new Karateka(fid, i, { puppet: true, name: this.nameOf(pair[i]) }); k.reset(); P[key] = k; } return P[key]; });
    this.view.names = pair.map(id => this.nameOf(id));
    if (this.sceneRef) { this.sceneRef.hud = new FightHUD(this.view, { names: this.view.names, hideScore: true }); this.sceneRef.hud.call = null; }
  }
  // guests: apply the newest snapshot to the puppets (positions smoothed, state from the snapshot)
  applySnapshot(dt) {
    const s = this.snap, v = this.view; if (!s || !v || !v.f) return;
    v.phase = s.ph; v.clock = s.c; v.pts = s.sc; v.rounds = s.rw; v.pt = s.pt || 0; v.dur = s.dur || 100; v.lastPoint = s.lp || null; v.hantei = s.hv ? { votes: s.hv, winner: s.hw } : null; v.winner = s.w === undefined ? -1 : s.w; v.round = 1;
    const mine = this.pair ? this.pair.indexOf(this.me) : -1;
    s.f.forEach((a, i) => {
      const f = v.f[i]; if (!f || f.id !== a[0]) return; const tx = a[1]; const old = f.x;
      const keepPred = this.pred && i === mine && this.clock() - this.pred.at < 250 && !a[5];
      f.apply(a); f.x = Math.abs(tx - old) > 40 ? tx : lerp(old, tx, clamp(dt * 14, 0, 1));
      if (keepPred) { f.tech = this.pred.tech; f.t = this.pred.t; f.fr = this.pred.fr; f.state = 'tech'; }
      f.frozen = false;
    });
    this.snap = null;
  }
  advancePuppets() { const v = this.view; if (!v || !v.f) return; for (const f of v.f) { if (f.tech && f.fr) { f.t = Math.min(f.t + 1, f.fr[0] + f.fr[1] + f.fr[2] + f.recoil); } if (this.pred && f === v.f[this.pair ? this.pair.indexOf(this.me) : -1] && this.pred.tech) { this.pred.t = Math.min(this.pred.t + 1, 400); if (f.tech === this.pred.tech) f.t = Math.max(f.t, this.pred.t * 0); } } }
  // ---------- per frame ----------
  update(dt, scene) {
    this.t += dt; this.sceneRef = scene; const nowT = this.clock();
    if (this.ended) return;
    const hubT = this.now();
    if (this.state === 'card') {
      if (this.started && hubT > -Infinity && hubT >= -3000) this.state = 'count';
    }
    if (this.state === 'count') { if (hubT >= 0) { this.state = 'play'; this.cntShow = nowT; if (this.host) this.startWorld(); KC.sfx('taikoHit'); KC.music('session' === 'x' ? null : scene.stage.d.music); } else { const n = Math.ceil(-hubT / 1000); if (n !== this.lastN) { this.lastN = n; KC.sfx('taikoHit'); } } }
    if (this.state === 'play' && this.host && !this.world) this.startWorld();
    // everyone: send heartbeats; guests: send input
    if (!this.host && !this.ended) this.sendInput(nowT);
    if (this.host && this.world && this.bout && !this.finished) {
      // the live menu never stops the world, but the local fighter's input is neutral while it is open
      this.bout.update(dt); KC.updateReferee(this.bout, dt);
      if (nowT - this.lastSnap >= 83) { this.lastSnap = nowT; this.sendSnapshot(); }
      this.flush();
      if (this.hud) this.hud.names = this.pair.map(id => this.nameOf(id));
    }
    if (this.host && !this.ended && nowT - this.lastHb >= 500 && !this.world) { this.lastHb = nowT; this.send({ t: 'hb', a: hubT }, false); }
    if (!this.host) { if (nowT - this.lastHb >= 500) { this.lastHb = nowT; this.send({ t: 'hb', a: hubT }, false); } this.applySnapshot(dt); const steps = Math.max(1, Math.round(dt * 120)); for (let k = 0; k < steps; k++) this.advancePuppets(); if (this.view && this.view.f) { for (const f of this.view.f) f.update(dt, this.view.f[1 - f.side]); KC.updateReferee(this.view, dt); } }
    else if (this.world && this.bout && this.bout.f) { /* bout updates its fighters */ }
  }
  sendInput(nowT) {
    if (this.server || !this.players.find(p => p.id === this.me)) return;
    const c = KC.dev.open || KC.menuOpen() ? { posture: 'n', tech: null, held: null } : this.reader.read();
    if (c.tech) { this.pend.push([PCODE[c.tech], Math.round(this.now())]); if (this.pend.length > 6) this.pend.shift(); if (this.view && this.view.f && this.pair) { const i = this.pair.indexOf(this.me); const f = this.view.f[i]; if (f && f.state === 'free' && !this.pred) { const id = f.resolve(c.posture, c.tech, this.view.f[1 - i]); if (id) { f.start(id, this.view.f[1 - i], c.posture, c.tech); this.pred = { tech: f.tech, t: 0, fr: f.fr, at: this.clock() }; KC.sfx(KC.TECHS[id].height === 'high' || KC.TECHS[id].spin ? 'whooshH' : 'whooshL'); KC.Voice.kiai(f.d.voice, KC.TECHS[id].kiai === 'heavy'); } } } }
    if (this.pred && this.clock() - this.pred.at > 500) this.pred = null;
    const changed = c.posture !== this.prevPosture;
    if ((changed || this.pend.length) && nowT - this.lastSend >= 66) { this.lastSend = nowT; this.prevPosture = c.posture; const e = this.pend.splice(0, 6); this.send({ t: 'in', s: ++this.seq, a: Math.round(this.now()), p: PCODE[c.posture], h: PCODE[c.held || 'n'] || 0, e }, true); }
    else if (changed) { /* wait for the next slot; posture is re-read each frame */ }
    if (!changed && !this.pend.length && nowT - this.lastSend > 400) { this.lastSend = nowT; this.send({ t: 'in', s: ++this.seq, a: Math.round(this.now()), p: PCODE[c.posture], h: PCODE[c.held || 'n'] || 0, e: [] }, true); }
  }
  sendSnapshot() {
    const b = this.bout; if (!b || !this.pair) return;
    const lp = b.lastPoint && !b.lastPoint.aiuchi ? { side: b.lastPoint.side, tech: b.lastPoint.tech, pts: b.lastPoint.pts, full: b.lastPoint.full, aiuchi: false } : b.lastPoint ? { aiuchi: true } : null;
    this.send({ t: 's', a: Math.round(this.now()), k: b.steps, ph: b.phase, pt: b.pt, dur: b.dur, c: Math.round(b.clock * 10) / 10, sc: b.pts, rw: b.rounds, q: this.K.q, pair: this.pair, f: b.f.map(f => f.snap()), lp, hv: b.hantei ? b.hantei.votes : null, hw: b.hantei ? b.hantei.winner : undefined, w: b.winner, ref: [b.phase, b.pt] }, false);
  }
}
KC.Net = Net;
const SESSION_KEYS = KC_KEYS;
KC.scenes.session = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter() {
    const g = KC.game; this.stage = new Stage('stadium'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .5 }); this.net = null; this.connecting = true; this.t = 0; g.follow(null); KC.current = this; g.live = true;
    this.rigs = SEAT_FIGHTERS.map((f, i) => KC.makeRig(KC.FIGHTER[f], i % 2, 'white'));
    KC.music('session'); this.boot();
  },
  async boot() {
    const info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true });
    if (!info) { this.connecting = false; KC.game.go('title'); return; }
    this.net = new Net(HUB); KC.net = this.net; this.connecting = false;
    this.pcols = this.net.players.map(p => p.color);
    HUB.ready();
  },
  update(dt) {
    const g = KC.game, I = g.input; this.t += dt; this.stage.update(dt); g.focus(200, 0, 50);
    const n = this.net; if (!n) return;
    n.sceneRef = this;
    // Options opens the menu over the running world, unless Create is held (that chord is the hub's)
    if (g.paused) { let create = false; try { create = Array.from(navigator.getGamepads() || []).some(p => p && p.buttons && p.buttons[8] && p.buttons[8].pressed); } catch (e) { /* none */ } if (create) g.resume(); }
    // the game's own card: Ready (confirm) and More time (△, T, a click)
    if (n.state === 'card' && !n.ended) {
      if (I.pressed('confirm') || I.pressed('start')) { HUB.answer('ready'); KC.sfx('menuOk'); }
      if (I.pressed('tUp') || I.pressed('tabL')) { HUB.answer('more'); KC.sfx('menuMove'); }
      const c = I.clicked(); if (c && this.btn) { if (c[0] >= this.btn.ready.x && c[0] < this.btn.ready.x + this.btn.ready.w && c[1] >= this.btn.ready.y && c[1] < this.btn.ready.y + 20) { HUB.answer('ready'); KC.sfx('menuOk'); } else if (c[0] >= this.btn.more.x && c[0] < this.btn.more.x + this.btn.more.w && c[1] >= this.btn.more.y && c[1] < this.btn.more.y + 20) { HUB.answer('more'); KC.sfx('menuMove'); } }
    }
    this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: 0, vx: 0, vy: 0, pose: 'kneel' }));
    // the Options button opens the engine's menu (unless Create is held), without stopping the world
    n.update(dt, this);
    if (n.host && n.bout) { KC.fightCamera(this, dt, n.bout); this.stage.react && 0; n.sceneRef = this; this.bout = n.bout; this.hud = n.hud; }
    else if (n.view && n.view.f) { KC.fightCamera(this, dt, n.view); this.bout = null; this.hud = n.hud || this.hud; }
    if (n.ended) this.endT = (this.endT || 0) + dt;
  },
  draw(r) {
    const n = this.net, g = KC.game; this.stage.draw(r); if (!n) { r.overlay(gg => KC.text(gg, 'CONNECTING...', r.W / 2, r.H / 2, '#fff', { align: 'center', scale: 2 })); return; }
    const playing = n.state === 'play' || n.state === 'count';
    if (playing && (n.bout || (n.view && n.view.f))) {
      const b = n.host ? n.bout : n.view; if (!b || !b.f) return;
      for (const f of b.f) f.draw(r); if (b.refActor || !n.host) KC.drawReferee(r, b);
      r.overlay(gg => { const nm = n.view && !n.host ? n.view.names : n.pair && n.pair.map(id => n.nameOf(id)); (b.f || []).forEach((f, i) => { const [sx, sy] = r.w(f.x, 0, f.z + 78); const id = n.pair && n.pair[i], col = (n.players.find(p => p.id === id) || {}).color || '#fff'; KC.text(gg, safeName(nm ? nm[i] : '?'), Math.round(sx), Math.round(sy), col, { align: 'center' }); if (id === n.me) E.font.text(gg, '▾', Math.round(sx), Math.round(sy) + 8, col, { align: 'center', outline: false }); }); });
      if (this.hud) { if (n.host && n.hud) n.hud.draw(r); else this.hud && this.hud.draw(r); }
      r.overlay(gg => { const W = r.W, H = r.H; const K = n.host ? n.K : null, q = (n.host && K) ? K.q : (n.queueIds || []);
        KC.text(gg, 'KACHINUKI  FIRST TO ' + T().sessionTarget + ' BOUT WINS', W / 2, H - 28, '#ffe8a0', { align: 'center' }); const nextId = q[2]; if (nextId !== undefined) KC.text(gg, 'NEXT: ' + (nextId === n.me ? 'YOU' : n.nameOf(nextId)), W / 2, H - 16, nextId === n.me ? '#ffd060' : '#cfc8e8', { align: 'center' });
        if (n.state === 'count') { const hubT = n.now(), k = Math.ceil(-hubT / 1000); if (k > 0) E.font.title(gg, String(k), W / 2, H * .32, { scale: 6, align: 'center', colors: GOLD, depth: 3 }); }
        else if (n.cntShow && n.clock() - n.cntShow < 900) E.font.title(gg, 'BEGIN!', W / 2, H * .32, { scale: 4, align: 'center', colors: GOLD, depth: 3 }); });
      return;
    }
    // the card
    const c = n.card || { ready: [], left: null };
    r.overlay(gg => {
      const W = r.W, H = r.H; px.blend(gg, .45, 'normal', () => px.rect(gg, 0, 0, W, H, '#05040a')); KC.title(gg, 'KARATE CHAMPON', W / 2, 6, 2); KC.title(gg, 'KACHINUKI! WINNER STAYS ON.', W / 2, 26, 1);
      KC.text(gg, 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', W / 2, 40, '#ffe8a0', { align: 'center' });
      n.players.forEach((p, i) => { const x = Math.round(W / 2 + (i - (n.players.length - 1) / 2) * 88), y = 62; this.rigs[i].drawPortrait(gg, x - 20, y, 40, { zoom: 2.4 }); px.rect(gg, x - 22, y + 42, 44, 3, p.color); KC.text(gg, p.name + (p.id === n.me ? ' (YOU)' : ''), x, y + 48, p.color, { align: 'center' }); KC.text(gg, (c.ready || []).includes(p.id) ? 'READY' : '...', x, y + 58, (c.ready || []).includes(p.id) ? '#5ad8a0' : '#8a84a8', { align: 'center' }); });
      const ctl = KC.family() === 'key' ? 'MOVE: WASD    STRIKE: IJKL' : 'MOVE: LEFT STICK    STRIKE: RIGHT STICK OR FACE BUTTONS'; KC.text(gg, 'YOUR CONTROLS  ' + ctl, W / 2, H - 52, '#9ad8ff', { align: 'center' });
      const left = c.left === null || c.left === undefined ? '' : Math.ceil(c.left / 1000) + 'S'; if (left) KC.text(gg, 'STARTS IN ' + left, W / 2, H - 40, '#fff', { align: 'center' }); if (c.paused) KC.text(gg, 'WAITING: MORE TIME', W / 2, H - 40, '#ffd060', { align: 'center' });
      this.btn = { ready: { x: W / 2 - 100, y: H - 26, w: 90 }, more: { x: W / 2 + 10, y: H - 26, w: 90 } };
      KC.panel(gg, this.btn.ready.x, this.btn.ready.y, 90, 20, { alpha: .9 }); KC.panel(gg, this.btn.more.x, this.btn.more.y, 90, 20, { alpha: c.asked ? 1 : .6 });
      let ix = KC.glyphAction(gg, 'confirm', this.btn.ready.x + 4, this.btn.ready.y + 3, 13); KC.text(gg, 'READY', this.btn.ready.x + 8 + ix, this.btn.ready.y + 7, '#fff'); ix = KC.glyphAction(gg, 'alt', this.btn.more.x + 4, this.btn.more.y + 3, 13); KC.text(gg, 'MORE TIME', this.btn.more.x + 8 + ix, this.btn.more.y + 7, '#fff');
      if (n.state === 'count') { const k = Math.ceil(-n.now() / 1000); if (k > 0 && isFinite(k)) E.font.title(gg, String(k), W / 2, H * .5 - 20, { scale: 6, align: 'center', colors: GOLD, depth: 3 }); }
    });
    if (n.ended) this.drawEnd(r);
  },
  drawEnd(r) { const n = this.net; r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); const hl = n.endInfo && n.endInfo.reason === 'host-left'; KC.title(g, hl ? 'HOST LEFT' : 'ROUND OVER', r.W / 2, 20, 3); const st = (n.endInfo && n.endInfo.standings) || n.standings || []; st.forEach((grp, i) => KC.text(g, (i + 1) + '. ' + (Array.isArray(grp) ? grp : [grp]).map(id => n.nameOf(id)).join(' = '), r.W / 2, 60 + i * 14, i === 0 ? '#ffd060' : '#cfc8e8', { align: 'center', scale: 1 })); }); }
};
// the ended session draws its own results over everything; drawEnd for the in-play layout
const _sd = KC.scenes.session.draw; KC.scenes.session.draw = function (r) { _sd.call(this, r); if (this.net && this.net.ended && (this.net.state === 'play' || this.net.state === 'count')) this.drawEnd(r); };

/* ---- 70-dev.js ---- */
/* ---------- dev mode: live sliders, toggles, warps, info. Reached from the pause menu; F2 / ` / L3+R3 afterwards ---------- */
KC.dev.tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'];
KC.dev.save = () => { try { KC.store.set('kc:dev', { tune: KC.TUNE, t: { showBoxes: KC.dev.showBoxes, showInput: KC.dev.showInput, showFrame: KC.dev.showFrame, aiThoughts: KC.dev.aiThoughts, invincible: KC.dev.invincible, infinite: KC.dev.infinite, muteVoices: KC.dev.muteVoices, skipCut: KC.dev.skipCut, unlocked: KC.dev.unlocked, enabledOnce: KC.dev.enabledOnce, p2mode: KC.dev.p2mode } }); } catch (e) { /* storage blocked */ } };
KC.dev.load = () => { const d = KC.store.get('kc:dev', null); if (!d) return; for (const k in (d.tune || {})) if (k in KC.TUNE && typeof d.tune[k] === 'number') KC.TUNE[k] = d.tune[k]; Object.assign(KC.dev, d.t || {}); KC.applyTune(); };
KC.dev.rows = () => {
  const D = KC.dev, G = KC.game, S = KC.Story, cur = KC.current, rows = [];
  if (D.tab === 0) {
    rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { KC.resetTune(); KC.dev.save(); KC.sfx('good'); } });
    KC.TUNE_DEFS.forEach(([k, lab, lo, hi, def, st]) => rows.push({ key: k, label: lab, slider: [lo, hi, def, st], get: () => KC.TUNE[k], set: v => { KC.TUNE[k] = Math.round(v / st) * st; KC.applyTune(); KC.dev.save(); } }));
    rows.push({ label: 'COPY TUNING JSON', act: () => { const j = KC.exportTuning(); try { navigator.clipboard.writeText(j); D.note = 'COPIED'; } catch (e) { D.note = 'CLIPBOARD BLOCKED'; } } });
  } else if (D.tab === 1) {
    const T2 = (k, lab, f) => rows.push({ label: lab, toggle: true, get: () => !!D[k], set: v => { D[k] = v; if (f) f(v); KC.dev.save(); } });
    T2('showBoxes', 'SHOW HIT / HURT / PUSH BOXES'); T2('showFrame', 'FRAME DATA'); T2('showInput', 'INPUT DISPLAY'); T2('aiThoughts', 'AI THOUGHTS');
    T2('invincible', 'P1 INVINCIBLE (CPU CANNOT SCORE)', v => { if (cur && cur.bout) cur.bout.invincible[0] = v; }); T2('infinite', 'INFINITE TIME', v => { if (cur && cur.bout) cur.bout.infiniteTime = v; });
    T2('freezeCpu', 'FREEZE CPU'); T2('slow', 'SLOW MOTION 0.25X', v => { KC.TUNE.gameSpeed = v ? .25 : 1; KC.applyTune(); });
    rows.push({ label: 'P2 CONTROL: ' + up(D.p2mode), act: () => { const L = ['cpu', 'stand', 'crouch', 'jump', 'block', 'attack']; D.p2mode = L[(L.indexOf(D.p2mode) + 1) % L.length]; if (cur && cur.dummyMode !== undefined) { cur.dummyMode = D.p2mode === 'cpu' ? 'stand' : D.p2mode; D.freezeCpu = D.p2mode !== 'cpu'; } KC.dev.save(); } });
    T2('freezeAll', 'FREEZE GAME'); rows.push({ label: 'FRAME STEP (CONFIRM = 1 STEP)', act: () => { D.step = 1; }, hold: true });
    T2('fps', 'FPS AND STATS'); T2('muteVoices', 'MUTE VOICES', v => { G.settings.set && G.settings.set('voices', v ? 0 : .8); }); T2('skipCut', 'SKIP CUTSCENES'); T2('unlocked', 'UNLOCK ALL FIGHTERS');
  } else if (D.tab === 2) {
    const go = (scene, d) => { D.open = false; KC.ensureStory(); G.go(scene, d); };
    KC.LADDER.forEach((n, i) => rows.push({ label: (i + 1) + '. ' + up(n.label), act: () => { D.open = false; KC.ensureStory(); KC.Story.s.node = i; KC.Story.launch(); } }));
    rows.push({ label: 'FREE SPAR', act: () => { D.open = false; KC.startFreeSpar(); } }); rows.push({ label: 'TECHNIQUE LAB', act: () => { D.open = false; G.go('lab', { id: 'frontKick' }); } });
    KC.STAGES.slice(0, 8).forEach(s => rows.push({ label: 'QUICK BOUT: ' + s.name, act: () => { D.open = false; G.go('fight', { mode: 'versus', stage: s.id, ids: ['taro', KC.ROSTER[1 + Math.floor(Math.random() * 9)].id], players: ['human', 'cpu'], seed: 3, single: true, hideScore: true, onEnd: () => G.go('title', { menu: true }) }); } }));
    ['boards', 'pots', 'bull'].forEach(b => rows.push({ label: 'BONUS: ' + KC.BONUS[b].title, act: () => { D.open = false; G.go('bonus', { kind: b, onEnd: () => G.go('title', { menu: true }) }); } }));
    ['I', 'II', 'III', 'ALL'].forEach(l => rows.push({ label: 'LESSON ' + l, act: () => { D.open = false; G.go('practice', { lesson: l }); } }));
    rows.push({ label: 'THE ENDING', act: () => go('cutscene', { id: 'ending', stage: 'stadium', story: true, after: () => G.go('title') }) }); rows.push({ label: 'CREDITS', act: () => go('credits', {}) }); rows.push({ label: 'ATTRACT MODE', act: () => { D.open = false; G.go('attract'); } });
    rows.push({ label: 'RANK +1', act: () => { KC.ensureStory(); S.s.belt = Math.min(9, S.s.belt + 1); } }); rows.push({ label: 'RANK -1', act: () => { KC.ensureStory(); S.s.belt = Math.max(0, S.s.belt - 1); } });
    rows.push({ label: '+10000 SCORE', act: () => { KC.ensureStory(); S.s.score += 10000; } });
    rows.push({ label: 'WIN THIS ROUND', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.endRound(0); D.open = false; } } }); rows.push({ label: 'LOSE THIS ROUND', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.endRound(1); D.open = false; } } });
    rows.push({ label: 'WIN THIS MATCH', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.rounds[0] = cur.bout.needRounds - 1; cur.bout.endRound(0); D.open = false; } } }); rows.push({ label: 'LOSE THIS MATCH', act: () => { if (cur && cur.bout && cur.bout.phase === 'fight') { cur.bout.rounds[1] = cur.bout.needRounds - 1; cur.bout.endRound(1); D.open = false; } } });
    rows.push({ label: () => 'REFEREE CALL: ' + up(Object.keys(KC.CALLS)[D.callIdx || 0]), act: () => { const ids = Object.keys(KC.CALLS); D.callIdx = ((D.callIdx || 0) + 1) % ids.length; if (cur && cur.bout) cur.bout.call(ids[D.callIdx]); } });
    rows.push({ label: 'RESET THE SAVE', act: () => { KC.save.erase(); D.note = 'SAVE ERASED'; } });
  } else {
    const b = cur && cur.bout, a = cur && cur.ais && cur.ais.find(Boolean), lp = b && b.lastPoint;
    rows.push({ label: 'VERSION ' + KC.VERSION + ' / ' + (E.versionLabel ? E.versionLabel() : ''), info: true }); rows.push({ label: 'SCENE ' + (G.scene && G.scene.name) + ' MODE ' + (cur && cur.d && cur.d.mode), info: true });
    rows.push({ label: 'SEED ' + (cur && cur.d && cur.d.seed) + '  BOUT PHASE ' + (b ? b.phase : '-'), info: true }); rows.push({ label: 'FPS ' + Math.round(G.fps || 0), info: true });
    rows.push({ label: a ? 'AI LEVEL ' + a.level + ' ' + a.thought : 'AI -', info: true });
    rows.push({ label: lp && !lp.aiuchi ? 'LAST HIT ' + lp.tech + ' PTS ' + lp.pts + (lp.counter ? ' COUNTER' : '') : 'LAST HIT -', info: true });
    rows.push({ label: lp && !lp.aiuchi ? 'TIMING Q ' + lp.timingQ.toFixed(2) + ' SPACING Q ' + lp.spacingQ.toFixed(2) + ' Q ' + lp.q.toFixed(2) : '', info: true });
  }
  return rows;
};
KC.ensureStory = () => { if (!KC.Story.s) KC.Story.s = KC.Story.fresh(); };
KC.exportTuning = () => JSON.stringify(KC.TUNE, null, 1);
KC.dev.close = () => { KC.dev.open = false; KC.dev.save(); };
KC.devUpdate = (dt, scene) => {
  const D = KC.dev, I = KC.game.input; D.enabledOnce = true; const rows = D.rows(); D.row = clamp(D.row, 0, Math.max(0, rows.length - 1));
  if (I.pressed('tabR')) { D.tab = (D.tab + 1) % 4; D.row = 0; KC.sfx('menuMove'); } if (I.pressed('tabL')) { D.tab = (D.tab + 3) % 4; D.row = 0; KC.sfx('menuMove'); }
  if (I.repeat('up', .35, .1)) { D.row = (D.row + rows.length - 1) % rows.length; KC.sfx('menuMove'); } if (I.repeat('down', .35, .1)) { D.row = (D.row + 1) % rows.length; KC.sfx('menuMove'); }
  const R = rows[D.row]; D.hold = (D.hold || 0) + dt; const dir = I.repeat('left', .3, .04) ? -1 : I.repeat('right', .3, .04) ? 1 : 0;
  if (R && dir) { if (R.slider) { const [lo, hi, def, st] = R.slider; R.set(clamp(R.get() + dir * st, lo, hi)); } else if (R.toggle) { R.set(!R.get()); KC.sfx('menuMove'); } }
  if (R && I.pressed('reset') && R.slider) { R.set(R.slider[2]); KC.sfx('menuBack'); }
  if (R && (I.pressed('confirm') || (R.hold && I.repeat('confirm', .3, .05))) && !R.info) { if (R.act) R.act(); else if (R.toggle) R.set(!R.get()); else if (R.slider && false) { } KC.sfx('menuOk'); I.consumeAll(); }
  // mouse: click a tab, a row, or drag a slider
  const p = I.pointer(), c = I.clicked(); D.hit = D.hit || {};
  if (c && D.hit.tabs) D.hit.tabs.forEach((x, i) => { if (c[0] >= x.x0 && c[0] < x.x1 && c[1] < D.hit.y0) { D.tab = i; D.row = 0; } });
  if (p && D.hit.rows && (I.down('confirm') === false)) { /* hover */ }
  if (c && D.hit.rows) D.hit.rows.forEach((x, i) => { if (c[1] >= x.y && c[1] < x.y + x.h && c[0] >= D.hit.x0 && c[0] < D.hit.x1) { D.row = x.i; const rr = rows[x.i]; if (rr.slider) { const [lo, hi, def, st] = rr.slider, k = clamp((c[0] - D.hit.sx0) / (D.hit.sx1 - D.hit.sx0), 0, 1); rr.set(lo + (hi - lo) * k); } else if (rr.toggle) rr.set(!rr.get()); else if (rr.act && !rr.info) { rr.act(); } } });
  if (I.pressed('devKey') || I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); D.close(); }
  if (I.down('l3') && I.pressed('r3')) D.close();
  if (D.freezeAll && !D.open) { /* leaving the panel keeps freeze if on */ }
  if (D.invincible && scene.bout) scene.bout.invincible[0] = true;
};
KC.drawDev = (r, scene) => {
  const D = KC.dev, rows = D.rows(), perPage = 8, page = Math.floor(D.row / perPage), start = page * perPage;
  r.overlay(g => {
    const W = r.W, H = r.H, x0 = Math.round(W / 2 - 170), y0 = 16, w = 340, h = 140;
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a')); KC.panel(g, x0, y0, w, h, { alpha: .95 });
    D.hit = { tabs: [], rows: [], y0: y0 + 16, x0: x0, x1: x0 + w };
    KC.dev.tabs.forEach((t, i) => { const tx = x0 + 8 + i * 80; D.hit.tabs.push({ x0: tx, x1: tx + 76 }); KC.text(g, t, tx + 38, y0 + 5, i === D.tab ? '#ffd060' : '#8a84a8', { align: 'center' }); if (i === D.tab) px.rect(g, tx, y0 + 15, 76, 2, '#ffd060'); });
    rows.slice(start, start + perPage).forEach((rw, k) => {
      const i = start + k, y = y0 + 22 + k * 12, sel = i === D.row; D.hit.rows.push({ y: y - 1, h: 12, i }); if (sel) px.rect(g, x0 + 4, y - 1, w - 8, 12, '#5a2a3a');
      const lab = typeof rw.label === 'function' ? rw.label() : rw.label; KC.text(g, lab, x0 + 10, y, sel ? '#fff6d0' : '#cfc8e8');
      if (rw.slider) { const [lo, hi, def, st] = rw.slider, v = rw.get(), sx = x0 + 190, sw = 90; D.hit.sx0 = sx; D.hit.sx1 = sx + sw; px.rect(g, sx, y + 3, sw, 3, '#10101c'); px.rect(g, sx, y + 3, Math.round((v - lo) / (hi - lo) * sw), 3, v === def ? '#7a7a98' : '#ffd060'); px.rect(g, sx + Math.round((def - lo) / (hi - lo) * sw), y + 1, 1, 7, '#fff'); KC.text(g, String(+v.toFixed(2)), x0 + w - 10, y, v === def ? '#9ad8ff' : '#ffd060', { align: 'right' }); }
      else if (rw.toggle) KC.text(g, rw.get() ? 'ON' : 'OFF', x0 + w - 10, y, rw.get() ? '#5ad8a0' : '#8a84a8', { align: 'right' });
    });
    KC.text(g, 'PAGE ' + (page + 1) + '/' + Math.max(1, Math.ceil(rows.length / perPage)) + (D.note ? '   ' + D.note : ''), x0 + 10, y0 + h - 12, '#8a84a8');
    KC.text(g, 'DEV: UP/DOWN SELECT  LEFT/RIGHT ADJUST  RESET: ' + (KC.family() === 'key' ? 'R' : 'TRIANGLE') + '  TABS: Q/E OR L1/R1', W / 2, y0 + h + 6, '#9ad8ff', { align: 'center' });
  });
  KC.promptBar(r, [['confirm', 'DO'], ['cancel', 'CLOSE']]);
};
// hotkeys once dev mode has been enabled: F2 and ` (any fight / bonus scene); L3+R3 is read in devHotkeys each frame
KC.devHotkey = () => { const D = KC.dev, sc = KC.game.scene && KC.game.scene.name; if ((D.enabledOnce || /[?&]dev=1/.test(location.search)) && ['fight', 'bonus'].includes(sc)) { D.open = !D.open; D.enabledOnce = true; if (!D.open) D.save(); } };
// F2, backquote or L3+R3 toggle the panel once dev mode has been enabled (or with ?dev=1)
KC.devPoll = () => { if (SESSION) return; const I = KC.game.input; if (I.pressed('devKey') || (I.down('l3') && I.pressed('r3')) || (I.down('r3') && I.pressed('l3'))) KC.devHotkey(); };

/* ---- 90-start.js ---- */
/* ---------- start: the game, the pause menu, boot steps, deep links ---------- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon', autoPause: !SESSION, input: KC_KEYS,
  menu: {
    items: () => [!SESSION && KC.canMoveList() && ['Move list', () => KC.openMoveList()], !SESSION && KC.canRetry() && ['Retry match', () => KC.retry()], !SESSION && ['Dev mode', () => KC.openDev()]],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal', group: 'Game' },
      { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English', group: 'Game' },
      { key: 'hints', label: 'Tutorial hints', value: true, group: 'Game' },
      { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side', group: 'Game' },
      { key: 'techNames', label: 'Technique names', value: true, group: 'Game' },
      { key: 'inputDisplay', label: 'Input display', value: false, group: 'Game' },
      { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', group: 'Game' },
      { key: 'voices', label: 'Voices volume', type: 'slider', value: .8, min: 0, max: 1, step: .05, group: 'Sound' }
    ],
    controls: { tUp: 'Technique UP (high)', tDown: 'Technique DOWN (low)', tLeft: 'Technique LEFT', tRight: 'Technique RIGHT' },
    quit: SESSION ? false : 'title'
  }
});
KC.game = game; game_ = game;
KC.cab = new E.Arcade(game, { id: 'karate-champon', lives: 1, hud: false });
KC.retry = () => { const c = KC.current; if (c && c.d && c.d.mode === 'story' && c.bout) { KC.Story.s.score = KC.Story.s.score; game.go('fight', c.d); } };
KC.canRetry = () => !!(KC.current && KC.current.d && KC.current.d.mode === 'story' && KC.current.bout && !KC.current.done) && game.scene && game.scene.name === 'fight';
KC.canMoveList = () => game.scene && ['fight', 'practice', 'bonus', 'freeSpar'].includes(game.scene.name);
KC.openDev = () => { KC.dev.open = true; KC.dev.from = game.scene && game.scene.name; game.resume && game.resume(); };
KC.sessionStart = null;
if (typeof addEventListener === 'function') { addEventListener('keydown', () => { KC._gateLifted = true; }); addEventListener('gamepadconnected', () => { KC._gateLifted = true; }); }
const boot = [
  ['Sweeping the dojo floor', () => { KC.defineAudio(game.audio); }],
  ['Folding the gi', () => { }],
  ['Simmering the broth', () => { }],
  ['Tuning the referee\'s whistle', () => { }],
  ['Raking the gravel', () => { KC.save.load(); if (!SESSION) { try { KC.dev.load(); } catch (e) { /* no stored tuning */ } if (/[?&]dev=1/.test(location.search)) KC.dev.enabledOnce = true; } const errs = KC.validateData(); if (errs.length) throw new Error('data: ' + errs.join('; ')); }]
];
const scenes = {};
for (const k in KC.scenes) scenes[k] = Object.assign({ name: k }, KC.scenes[k]);
KC.registered = scenes;
KC.touchOnlyInit = () => {};
let first = SESSION ? 'session' : 'title'; const hash = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/'); let firstData;
if (!SESSION && hash[0] && scenes[hash[0]]) {
  first = hash[0]; KC.Story.s = KC.Story.fresh();
  if (first === 'fight') firstData = { stage: hash[1] || 'dojo', ids: ['taro', hash[2] || 'kamaboko'], players: ['human', 'cpu'], mode: 'versus', seed: 4, belts: ['white', 'black1'] };
  else if (first === 'road') { KC.Story.s.node = +hash[1] || 0; KC.Story.s.belt = Math.min(9, KC.LADDER.slice(0, KC.Story.s.node).filter(n => n.promote).length); }
  else if (first === 'vscard') firstData = { node: KC.LADDER[+hash[1] || 2] };
  else if (first === 'promotion') firstData = { node: KC.LADDER[+hash[1] || 2], belt: 2 };
  else if (first === 'practice') firstData = { lesson: hash[1] || 'I' };
  else if (first === 'bonus') firstData = { kind: hash[1] || 'boards', auto: hash[2] === 'auto' };
  else if (first === 'cutscene') firstData = { id: hash[1] || 'prologue', stage: 'dojo', after: () => game.go('title') };
  else if (first === 'lab') firstData = { id: hash[1] };
  else if (first === 'results') { first = 'title'; }
  else if (first === 'continue') firstData = { node: KC.LADDER[2] };
  else if (first === 'gameover') firstData = { score: 1234 };
  else if (first === 'initials') firstData = { score: 1234, mode: 'story', done: () => game.go('title') };
  else if (first === 'credits') firstData = { story: false };
  else if (first === 'kachiCard') first = 'title';
}
game.start({ scenes, scene: first, data: firstData, boot: { title: 'KARATE CHAMPON', steps: boot } });
KC.test = { Bout, Karateka, KarateAI, Stage, Reader, Menu, Boards, Pots, BullStage, Net, Kachinuki };

})();
