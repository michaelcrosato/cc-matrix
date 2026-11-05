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
KC.ABOUT = /*__ABOUT__*/null;
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
