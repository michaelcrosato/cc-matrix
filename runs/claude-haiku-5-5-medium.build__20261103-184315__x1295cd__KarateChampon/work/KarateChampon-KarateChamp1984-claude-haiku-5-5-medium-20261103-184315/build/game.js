(() => {
'use strict';
const E = My3D2dge;
// ---- src/00-core.js
// KARATE CHAMPON: a point-sparring karate game inspired by Karate Champ (1984).
// Core loop: read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land
// theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the match.
// Win to earn a belt and the next stage, with a bonus stage after every second win.
const VERSION = '1.0.0';
const KC = { VERSION };
window.KC = KC;

// ---------------------------------------------------------------- tuning (live sliders in dev mode read KC.TUNE every step)
KC.TUNE_DEFAULTS = {
  gameSpeed: 1, techSpeed: 1, walk: 72, jump: 360, gravity: 1100, hitstop: 0.10, fullAt: 600, counterMul: 2,
  reachScale: 1, blockWindow: 14, clock: 30, pointsToWin: 2, roundsToWin: 2, cpuLevel: 0, cpuReact: 1,
  cpuAggression: -1, refPace: 1, potSpeed: 1, bullSpeed: 1, kiSpeed: 1, sessionTarget: 5
};
KC.TUNE = Object.assign({}, KC.TUNE_DEFAULTS);
KC.TOGGLES_DEFAULTS = { hitBoxes: false, frameData: false, inputDisplay: false, aiThoughts: false, p1Invincible: false,
  p2Control: 'cpu', infiniteTime: false, freezeCpu: false, slowMo: false, mute: false, unlockAll: false };
KC.TOGGLES = Object.assign({}, KC.TOGGLES_DEFAULTS);
KC.tuneChanged = () => Object.keys(KC.TUNE_DEFAULTS).some(k => KC.TUNE[k] !== KC.TUNE_DEFAULTS[k]);
KC.resetTune = () => { Object.assign(KC.TUNE, KC.TUNE_DEFAULTS); Object.assign(KC.TOGGLES, KC.TOGGLES_DEFAULTS); };

// ---------------------------------------------------------------- small helpers
KC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
KC.lerp = (a, b, t) => a + (b - a) * t;
KC.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
KC.seeded = seed => E.rng(seed >>> 0);
KC.rngOf = seed => E.rng(seed >>> 0);
KC.hashState = arr => { let h = 2166136261; for (const v of arr) { h ^= (Math.round(v * 1000) | 0) & 0xffffffff; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
// the 4-way quantizer: dominant axis, hysteresis between press (0.5) and release (0.35)
KC.quantize = (x, y, prev) => {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (Math.max(ax, ay) < 0.35) return null;
  if (ax >= ay) return x > 0 ? 'r' : 'l';
  return y > 0 ? 'd' : 'u';
};

// ---------------------------------------------------------------- data: techniques (4.2)
// f = [startup, active, recovery] in 60 fps frames (the sim steps at 120 Hz, so each frame is two steps).
// travel = forward displacement during the strike (+ toward the foe); reach = [min, max] contact gap; pts = [lo, hi].
KC.DATA = {};
KC.DATA.techniques = {
  frontKick: { name: 'FRONT KICK', jp: 'mae-geri', height: 'mid', f: [11, 5, 28], travel: 0, reach: [6, 30], pts: [100, 200], move: 'kick', limb: 'leg', kiai: 'light', bull: true, potHeights: ['mid'] },
  revPunch: { name: 'REVERSE PUNCH', jp: 'gyaku-zuki', height: 'mid', f: [6, 4, 18], travel: 4, reach: [0, 14], pts: [100, 200], move: 'cross', limb: 'arm', kiai: 'light', potHeights: ['mid'] },
  roundKick: { name: 'ROUND KICK', jp: 'mawashi-geri', height: 'high', f: [10, 5, 22], travel: 0, reach: [6, 30], pts: [300, 600], move: 'roundhouse', limb: 'leg', kiai: 'heavy', potHeights: ['high'] },
  lowKick: { name: 'LOW KICK', jp: 'gedan-geri', height: 'low', f: [10, 5, 28], travel: 0, reach: [4, 28], pts: [100, 200], move: 'kick', limb: 'leg', kiai: 'light', unblockable: true, potHeights: ['low'] },
  backKick: { name: 'BACK KICK', jp: 'ushiro-geri', height: 'mid', f: [13, 5, 23], travel: 6, reach: [10, 34], pts: [200, 400], move: 'kick', limb: 'leg', kiai: 'heavy', spin: Math.PI, bull: true, potHeights: ['mid'] },
  upLunge: { name: 'UPPER LUNGE PUNCH', jp: 'jodan oi-zuki', height: 'high', f: [15, 5, 26], travel: 40, reach: [18, 60], pts: [500, 1000], move: 'jab', limb: 'arm', kiai: 'heavy', bull: true, potHeights: ['high'] },
  midLunge: { name: 'MIDDLE LUNGE PUNCH', jp: 'chudan oi-zuki', height: 'mid', f: [14, 5, 26], travel: 40, reach: [18, 60], pts: [200, 400], move: 'cross', limb: 'arm', kiai: 'light', potHeights: ['mid'] },
  frontSweep: { name: 'FRONT FOOT SWEEP', jp: 'ashi-barai', height: 'low', f: [16, 8, 36], travel: 10, reach: [4, 34], pts: [200, 400], move: 'sweep', limb: 'leg', kiai: 'light', unblockable: true, knockdown: true, potHeights: ['low'] },
  turnBackKick: { name: 'TURN BACK KICK', jp: 'ura-mawashi', height: 'mid', f: [17, 5, 26], travel: 12, reach: [12, 40], pts: [500, 1000], move: 'roundhouse', limb: 'leg', kiai: 'heavy', spin: Math.PI * 2, potHeights: ['mid'] },
  backRound: { name: 'BACK ROUND KICK', jp: 'ushiro-mawashi', height: 'high', f: [15, 5, 23], travel: 0, reach: [8, 34], pts: [500, 1000], move: 'roundhouse', limb: 'leg', kiai: 'heavy', spin: Math.PI * 2, potHeights: ['high'] },
  backSweep: { name: 'BACK FOOT SWEEP', jp: 'ushiro-ashibarai', height: 'low', f: [16, 8, 36], travel: 0, reach: [6, 34], pts: [100, 200], move: 'sweep', limb: 'leg', kiai: 'light', unblockable: true, knockdown: true, spin: Math.PI, potHeights: ['low'] },
  jumpSide: { name: 'JUMPING SIDE KICK', jp: 'tobi yoko-geri', height: 'high', air: true, f: [16, 10, 26], travel: 60, reach: [30, 90], pts: [500, 1000], move: 'flyingkick', limb: 'leg', kiai: 'heavy', bull: false, potHeights: ['high'] },
  jumpBack: { name: 'JUMPING BACK KICK', jp: 'tobi ushiro-geri', height: 'high', air: true, f: [14, 8, 22], travel: 20, reach: [8, 48], pts: [500, 1000], move: 'flyingkick', limb: 'leg', kiai: 'heavy', spin: Math.PI, potHeights: ['high'] },
  upperPunch: { name: 'UPPER PUNCH', jp: 'age-zuki', height: 'high', f: [8, 7, 30], travel: 0, reach: [0, 18], pts: [300, 600], move: 'uppercut', limb: 'arm', kiai: 'heavy', bull: true, antiAir: true, potHeights: ['high'] },
  squatPunch: { name: 'SQUATTING REVERSE LUNGE PUNCH', jp: 'shikyo-zuki', height: 'mid', f: [13, 5, 30], travel: 20, reach: [10, 44], pts: [400, 800], move: 'cross', limb: 'arm', kiai: 'heavy', bull: true, hitsCrouch: true, potHeights: ['mid', 'low'] },
  frontFlip: { name: 'FRONT SOMERSAULT', jp: 'mae-tembo', height: 'evasive', flip: true, f: [6, 40, 12], travel: 95, reach: null, pts: null, move: 'flip', potHeights: [] },
  backFlip: { name: 'BACK SOMERSAULT', jp: 'ushiro-tembo', height: 'evasive', flip: true, f: [6, 40, 12], travel: -85, reach: null, pts: null, move: 'flip', potHeights: [] },
  jump: { name: 'JUMP', jp: 'tobu', height: 'evasive', air: true, f: [4, 39, 5], travel: 0, reach: null, pts: null, move: 'jump' },
  crouch: { name: 'CROUCH', jp: 'shagamu', height: 'evasive', f: [3, 0, 5], travel: 0, reach: null, pts: null, move: 'crouch' },
  backRoll: { name: 'BACK ROLL', jp: 'ushiro-kaiten', height: 'evasive', roll: true, f: [4, 28, 8], travel: -90, reach: null, pts: null, move: 'roll' },
  block: { name: 'BLOCK', jp: 'uke', height: 'evasive', block: true, f: [1, 14, 4], travel: 0, reach: null, pts: null, move: 'block' }
};
// the technique matrix (4.1/3.1): posture (n, t=toward the foe, a=away, u=up, d=down) x technique stick (u, t, d, a)
KC.DATA.matrix = {
  n: { u: 'roundKick', t: 'frontKick', d: 'lowKick', a: 'backKick' },
  t: { u: 'upLunge', t: 'midLunge', d: 'frontSweep', a: 'turnBackKick' },
  a: { u: 'backRound', t: 'block', d: 'backSweep', a: 'backFlip' },
  u: { u: 'frontFlip', t: 'jumpSide', d: 'jump', a: 'jumpBack' },
  d: { u: 'upperPunch', t: 'squatPunch', d: 'crouch', a: 'backRoll' }
};
// close substitutions: [technique, maxGap, replacement]
KC.DATA.substitutes = { midLunge: [[12, 'revPunch'], [18, 'frontKick']], upLunge: [[18, 'roundKick']], squatPunch: [[12, 'upperPunch']] };
KC.DATA.techFor = (posture, stick, gap) => {
  let id = (KC.DATA.matrix[posture] || {})[stick];
  if (!id) return null;
  if (id === 'frontKick' && stick === 't' && posture === 'n' && gap !== undefined && gap < 12) id = 'revPunch';
  const subs = KC.DATA.substitutes[id];
  if (subs && gap !== undefined) for (const [max, alt] of subs) if (gap < max) { id = alt; break; }
  return id;
};
KC.DATA.techniqueIds = Object.keys(KC.DATA.techniques);
KC.DATA.scoring = KC.DATA.techniqueIds.filter(id => KC.DATA.techniques[id].pts);

// ---------------------------------------------------------------- data: roster (7.1, 6.2)
KC.DATA.roster = {
  taro: { id: 'taro', name: 'TARO MOYASHI', short: 'TARO', title: 'THE HERO', size: 2.15, build: 'heroic', hair: 'spiky', hat: { style: 'band', color: '#f4f4ee' }, skin: '#e8b890', cloth: '#ffffff', unlock: 'start', stats: { walk: 1, reach: 1, speed: 1 }, sig: 'roundKick', voice: { f0: 190, formant: 1.05, rate: 15, wave: 'pulse', rough: 0 }, intro: 'I WILL BE CHAMP!', win: 'OSU!', lose: 'AGAIN...', style: 'Balanced. Strikes well from any range.',
    ai: { level: 6, aggr: .5, patience: .4, jump: .1, block: .3, gap: 36, weights: { roundKick: 2, frontKick: 2, midLunge: 1, revPunch: 1, backKick: 1, lowKick: 1, upperPunch: 1, squatPunch: 1 } } },
  kamaboko: { id: 'kamaboko', name: 'KAMABOKO', short: 'KAMABOKO', title: 'DOJO CLASSMATE', size: 2.0, build: 'chibi', hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, skin: '#f0c8a0', cloth: '#f2eee4', unlock: 'start', stats: { walk: .95, reach: .92, speed: .95 }, sig: 'frontKick', voice: { f0: 240, formant: 1.15, rate: 17, wave: 'pulse', rough: 0 }, intro: 'I ATE THREE BOWLS. I AM READY!', style: 'Clumsy. Kicks wildly.',
    ai: { level: 1, aggr: .7, patience: .2, jump: .05, block: .1, gap: 30, weights: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } }, tip: null },
  negi: { id: 'negi', name: 'SENPAI NEGI', short: 'NEGI', title: 'DOJO SENIOR', size: 2.35, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, skin: '#e0b088', cloth: '#f2eee4', unlock: 'start', stats: { walk: 1, reach: 1.04, speed: 1 }, sig: 'backKick', voice: { f0: 150, formant: 1.0, rate: 13, wave: 'saw', rough: 0 }, intro: 'SHOW ME WHAT I TAUGHT YOU.', style: 'Textbook. Patient and precise.',
    ai: { level: 2, aggr: .5, patience: .4, jump: .1, block: .35, gap: 36, weights: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } }, tip: null },
  ebi: { id: 'ebi', name: 'EBI', short: 'EBI', title: 'HARBOR FISHERMAN', size: 2.15, build: 'heroic', hair: 'short', hat: { style: 'band', color: '#e0702a' }, skin: '#c98a5a', cloth: '#f2eee4', unlock: 'start', stats: { walk: 1.1, reach: .98, speed: 1.05 }, sig: 'jumpSide', voice: { f0: 210, formant: 1.08, rate: 19, wave: 'pulse', rough: 0 }, intro: 'THE SEA MADE ME QUICK. CATCH ME!', style: 'Jumper. Leaps over low attacks.',
    ai: { level: 3, aggr: .6, patience: .2, jump: .35, block: .2, gap: 70, weights: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } }, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.' },
  kikurage: { id: 'kikurage', name: 'KIKURAGE', short: 'KIKURAGE', title: 'BAMBOO HERMIT', size: 2.1, build: 'heroic', hair: 'bald', hood: true, hunch: .3, beard: true, hat: null, skin: '#d8a880', cloth: '#6a4024', unlock: 'start', stats: { walk: .9, reach: 1, speed: .95 }, sig: 'revPunch', voice: { f0: 110, formant: .92, rate: 9, wave: 'saw', rough: .2 }, intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', style: 'Counter-puncher. Waits, then strikes.',
    ai: { level: 4, aggr: .25, patience: .8, jump: .05, block: .65, gap: 40, weights: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } }, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.' },
  ika: { id: 'ika', name: 'IKA', short: 'IKA', title: 'LOG-BRIDGE ACROBAT', size: 2.15, build: 'heroic', hair: 'long', hat: null, skin: '#e8d8f0', cloth: '#f2eee4', unlock: 'start', stats: { walk: 1.05, reach: 1.02, speed: 1.02 }, sig: 'backRound', voice: { f0: 200, formant: 1.1, rate: 14, wave: 'tri', rough: 0 }, intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', style: 'Cross-ups. Flips over you.',
    ai: { level: 5, aggr: .5, patience: .3, jump: .25, block: .3, gap: 44, weights: { backRound: 3, turnBackKick: 3, backKick: 2, frontFlip: 2, backFlip: 2 } }, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.' },
  buta: { id: 'buta', name: 'CAPTAIN BUTA', short: 'BUTA', title: 'SHIP\'S STERN', size: 2.6, build: 'bulky', hair: 'short', hat: { style: 'cap', color: '#1d2b52' }, skin: '#e0a880', cloth: '#f2eee4', unlock: 'start', stats: { walk: .83, reach: 1.1, speed: .92 }, sig: 'upLunge', voice: { f0: 85, formant: .85, rate: 11, wave: 'saw', rough: .1 }, intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', style: 'Lunges from far away. Heavy and slow.',
    ai: { level: 6, aggr: .8, patience: .2, jump: .05, block: .2, gap: 60, walk: 60, reach: 1.1, weights: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } }, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.' },
  asari: { id: 'asari', name: 'ASARI', short: 'ASARI', title: 'NIGHT-MARKET STALL', size: 2.1, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#2a9a9a' }, skin: '#e8b890', cloth: '#f2eee4', unlock: 'start', stats: { walk: 1, reach: .96, speed: 1.04 }, sig: 'squatPunch', voice: { f0: 170, formant: 1.0, rate: 15, wave: 'square', rough: 0 }, intro: 'MY SHELL IS SHUT. GO HOME.', style: 'Low and quick. Crouches half the time.',
    ai: { level: 7, aggr: .4, patience: .5, jump: .05, block: .5, gap: 34, crouch: .5, weights: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } }, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.' },
  kyabetsu: { id: 'kyabetsu', name: 'MASTER KYABETSU', short: 'KYABETSU', title: 'FUJI GARDEN', size: 2.15, build: 'heroic', hair: 'bald', beard: true, hunch: .2, hat: null, skin: '#e0b088', cloth: '#f2eee4', unlock: 'match8', stats: { walk: .95, reach: 1.02, speed: 1.03 }, sig: 'turnBackKick', voice: { f0: 120, formant: .9, rate: 10, wave: 'saw', rough: .05 }, intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', style: 'Patient. Punishes every miss.',
    ai: { level: 8, aggr: .4, patience: .7, jump: .1, block: .6, gap: 42, habit: true, readBoost: .05, weights: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } }, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.' },
  mei: { id: 'mei', name: 'MEI', short: 'MEI', title: 'THE IRON LADLE', size: 2.15, build: 'heroic', hair: 'ponytail', hat: null, skin: '#f0c8a0', cloth: '#c8302a', unlock: 'finish', stats: { walk: 1.05, reach: 1, speed: 1.05 }, sig: 'frontSweep', voice: { f0: 290, formant: 1.18, rate: 16, wave: 'pulse', rough: 0 }, intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', style: 'Reigning champion. Mixes high and low.',
    ai: { level: 9, aggr: .65, patience: .4, jump: .2, block: .5, gap: 46, habit: true, weights: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } }, tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.' },
  genkotsu: { id: 'genkotsu', name: 'JUDGE GENKOTSU', short: 'GENKOTSU', title: 'REFEREE', size: 2.1, build: 'bulky', hair: 'bald', beard: true, hat: null, skin: '#e8c0a0', cloth: '#1d2b52', unlock: null, voice: { f0: 105, formant: .9, rate: 11, wave: 'saw', rough: .18 } }
};
KC.DATA.playableIds = ['taro', 'kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];
KC.DATA.opponentOrder = ['kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];

// ---------------------------------------------------------------- data: stages (7.2). The arena is x 0..400; the marks are 150 (white) and 250 (red).
KC.DATA.stages = {
  dojo: { id: 'dojo', name: 'HON-DOJO', sub: 'Senpai Negi\'s dojo', music: 'dojo', sky: ['#1a0c06', '#4a2410', '#8a4a20'], floor: '#b98a58', floorDark: '#8a6038', mood: 'warm', ambient: .55, lanterns: true, crowd: 'seiza', props: ['lantern', 'drum'] },
  harbor: { id: 'harbor', name: 'NAGASAKI PIER', sub: 'dawn over the harbor', music: 'harbor', sky: ['#2a3a6a', '#d88a5a', '#f8c890'], floor: '#8a6a4a', floorDark: '#5a4530', mood: 'dawn', ambient: .7, layers: ['sea', 'hills'], props: ['crate', 'barrel', 'cart'], crowd: 'dock' },
  bamboo: { id: 'bamboo', name: 'BAMBOO FOREST', sub: 'midday shade', music: 'bamboo', sky: ['#4a7a58', '#8ab880', '#c8e8a0'], floor: '#6a5a30', floorDark: '#3e3418', mood: 'shade', ambient: .6, layers: ['forest'], props: ['bamboo', 'toro'], crowd: null },
  log: { id: 'log', name: 'LOG BRIDGE', sub: 'a tree trunk over the gorge', music: 'gorge', sky: ['#3a4a6a', '#7a8aa0', '#b8c4cc'], floor: '#6a4a2a', floorDark: '#3a2814', mood: 'mist', ambient: .6, layers: ['mountains', 'fog'], props: ['vines'], crowd: null },
  ship: { id: 'ship', name: 'SHIP\'S STERN', sub: 'sunset at sea', music: 'ship', sky: ['#4a1a3a', '#e0603a', '#ffb050'], floor: '#8a5a34', floorDark: '#4e3018', mood: 'sunset', ambient: .55, layers: ['sea'], props: ['barrel', 'mast'], crowd: 'dock' },
  market: { id: 'market', name: 'CHAMPON STREET', sub: 'night market', music: 'market', sky: ['#0a0818', '#2a1a40', '#4a2a50'], floor: '#5a5258', floorDark: '#342e34', mood: 'night', ambient: .35, lanterns: true, layers: ['city'], props: ['stall', 'lantern'], crowd: 'market' },
  fuji: { id: 'fuji', name: 'FUJI GARDEN', sub: 'dusk, cherry petals', music: 'fuji', sky: ['#3a2a58', '#c07090', '#f0a8b8'], floor: '#b8b0a0', floorDark: '#8a8270', mood: 'dusk', ambient: .6, layers: ['mountains', 'hills'], props: ['toro', 'torii'], crowd: null },
  stadium: { id: 'stadium', name: 'NATIONAL STADIUM', sub: 'the Champon Cup final', music: 'stadium', sky: ['#050510', '#101028', '#1a1a40'], floor: '#2a4a9a', floorDark: '#1a3070', mood: 'arena', ambient: .45, lanterns: false, crowd: 'stands', props: ['bowl'] }
};
KC.DATA.bonusStages = {
  courtyard: { id: 'courtyard', name: 'DOJO COURTYARD', sky: ['#4a8ab0', '#8ac0d8', '#d8ecf0'], floor: '#a88a60', music: 'bonus' },
  fishmarket: { id: 'fishmarket', name: 'FISH-MARKET ALLEY', sky: ['#506890', '#90a8c0', '#d0dce8'], floor: '#8a9098', music: 'bonus' },
  pasture: { id: 'pasture', name: 'FUJI PASTURE', sky: ['#6aa0d8', '#a8d0f0', '#e8f4ff'], floor: '#6aa048', music: 'bonus' }
};

// ---------------------------------------------------------------- data: the Champon Road ladder (7.3)
KC.DATA.ladder = [
  { id: 'prologue', kind: 'cutscene', script: 'prologue', title: 'NAGASAKI' },
  { id: 'lessonI', kind: 'practice', lesson: 'I', stage: 'dojo', title: 'LESSON I' },
  { id: 'kamaboko', kind: 'match', opponent: 'kamaboko', stage: 'dojo', promote: 'yellow', hints: true, title: 'KAMABOKO' },
  { id: 'negi', kind: 'match', opponent: 'negi', stage: 'dojo', promote: 'green', hints: true, title: 'SENPAI NEGI' },
  { id: 'boards1', kind: 'bonus', bonus: 'boards', stage: 'courtyard', title: 'BREAK THE BOARDS' },
  { id: 'harborMei', kind: 'cutscene', script: 'harborMei', title: 'HARBOR' },
  { id: 'ebi', kind: 'match', opponent: 'ebi', stage: 'harbor', promote: 'blue', title: 'EBI' },
  { id: 'lessonII', kind: 'practice', lesson: 'II', stage: 'harbor', title: 'LESSON II' },
  { id: 'kikurage', kind: 'match', opponent: 'kikurage', stage: 'bamboo', promote: 'brown', title: 'KIKURAGE' },
  { id: 'pots1', kind: 'bonus', bonus: 'pots', stage: 'fishmarket', title: 'POTS AHOY!' },
  { id: 'ika', kind: 'match', opponent: 'ika', stage: 'log', promote: 'black1', title: 'IKA' },
  { id: 'lessonIII', kind: 'practice', lesson: 'III', stage: 'log', title: 'LESSON III' },
  { id: 'buta', kind: 'match', opponent: 'buta', stage: 'ship', promote: 'dan3', title: 'CAPTAIN BUTA' },
  { id: 'bull1', kind: 'bonus', bonus: 'bull', stage: 'pasture', title: 'STOP THE BULL' },
  { id: 'asari', kind: 'match', opponent: 'asari', stage: 'market', promote: 'dan5', title: 'ASARI' },
  { id: 'kyabetsu', kind: 'match', opponent: 'kyabetsu', stage: 'fuji', promote: 'dan8', title: 'MASTER KYABETSU' },
  { id: 'finalEntrance', kind: 'cutscene', script: 'finalEntrance', title: 'THE FINAL' },
  { id: 'mei', kind: 'match', opponent: 'mei', stage: 'stadium', promote: 'champ', title: 'MEI' },
  { id: 'ending', kind: 'cutscene', script: 'ending', title: 'ENDING' }
];
KC.DATA.belts = {
  white: { name: 'WHITE BELT', color: '#f4f4ee' }, yellow: { name: 'YELLOW BELT', color: '#f0c830' }, green: { name: 'GREEN BELT', color: '#3aa050' },
  blue: { name: 'BLUE BELT', color: '#2f5fd0' }, brown: { name: 'BROWN BELT', color: '#6a4024' }, black1: { name: 'BLACK BELT, 1ST DAN', color: '#16161c' },
  dan3: { name: 'BLACK BELT, 3RD DAN', color: '#16161c' }, dan5: { name: 'BLACK BELT, 5TH DAN', color: '#16161c' }, dan8: { name: 'BLACK BELT, 8TH DAN', color: '#16161c' }, champ: { name: 'CHAMP', color: '#e8c040' }
};
KC.DATA.beltOrder = ['white', 'yellow', 'green', 'blue', 'brown', 'black1', 'dan3', 'dan5', 'dan8', 'champ'];
KC.DATA.lessons = {
  I: { id: 'I', title: 'LESSON I', stage: 'dojo', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'] },
  II: { id: 'II', title: 'LESSON II', stage: 'harbor', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'] },
  III: { id: 'III', title: 'LESSON III', stage: 'log', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'] },
  ALL: { id: 'ALL', title: 'ALL TECHNIQUES', stage: 'dojo', drills: KC.DATA.techniqueIds.slice() }
};
KC.DATA.bonus = {
  boards: { board: 'pine', n: 5, worth: 200, perfectBonus: 2000 },
  pots: { objects: 16, catchBonus: 1000, breakPenalty: -500, perfectBonus: 3000, pointPer: 200 },
  bull: { charges: [150, 190, 240], win: 3000, perfectBonus: 1000 }
};

// ---------------------------------------------------------------- text (Appendix A and the call table)
KC.TEXT = {
  calls: {
    begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'],
    half: ['HALF POINT!', 'WAZA-ARI!'], full: ['FULL POINT!', 'IPPON!'], nopoint: ['NO POINT!', 'TORIMASEN!'],
    aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'], judges: ['JUDGES!', 'HANTEI!'],
    whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'], redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'],
    decide: ['DECIDING ROUND!', 'SHOBU!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!'], forfeit: ['FORFEIT!', 'KIKEN!']
  },
  hints: ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.',
    'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', 'LOW KICKS AND SWEEPS CAN\'T BE BLOCKED. JUMP THEM.', 'CROUCH UNDER HIGH KICKS.'],
  prologue: [['NAGASAKI HARBOR. SPRING 1984.', null], ['THE CHAMPON CUP RETURNS.', null], ['THE PRIZE: THE GOLDEN BOWL.', null],
    ['TARO', 'I AM TARO MOYASHI. WHITE BELT.'], ['TARO', 'I WILL BE CHAMP!'], ['NEGI', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['MEI', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['TARO', '...I AM A BEAN SPROUT.'], ['MEI', 'EAT. THEN FIGHT.']],
  afterHarbor: [['MEI', 'NOT BAD, MOYASHI.']],
  potsIntro: [['MEI', 'DON\'T BREAK MY BOWLS! BLOCK TO CATCH!']],
  marketMei: [['MEI', 'THE FINAL IS TOMORROW. DON\'T BE LATE.']],
  finalEntrance: [['GENKOTSU', 'THE FINAL. THE CHAMPION ENTERS.'], ['MEI', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['TARO', '...YOU?'], ['MEI', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['GENKOTSU', 'WHITE WINS! A NEW CHAMP!'], ['MEI', 'A BEAN SPROUT BECAME A CHAMP.'], ['MEI', 'NEXT YEAR I TAKE IT BACK.'], ['TARO', 'OSU!'], ['CARD', 'YOU ARE THE KARATE CHAMPON.']],
  lessonEnd: 'LESSON COMPLETE.', lessonNegi: 'YOU ARE READY. FIGHT KAMABOKO.', lessonIIEnd: 'STEP IN. STRIKE THROUGH.', lessonIIIEnd: 'TURN YOUR BACK. NEVER YOUR EYES.',
  drillWatch: 'WATCH.', drillNow: 'NOW YOU.', drillGood: 'GOOD!', drillSharp: 'SHARP!', drillNo: 'NO. WATCH AGAIN.',
  bonusTitles: { boards: 'BONUS STAGE! BREAK THE BOARDS!', pots: 'BONUS STAGE! POTS AHOY!', bull: 'BONUS STAGE! STOP THE BULL!' },
  continueLine: 'GET UP, MOYASHI!', gameOverLine: 'TRAIN. RETURN.',
  touchGate: 'CONTROLLER OR KEYBOARD REQUIRED',
  onlineCard: { kach: 'KACHINUKI! WINNER STAYS ON.', firstTo: 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.' }
};
KC.TEXT.tips = {};
for (const id of KC.DATA.playableIds) if (KC.DATA.roster[id].tip) KC.TEXT.tips[id] = KC.DATA.roster[id].tip;

// ---------------------------------------------------------------- the fighters' gi and belts
KC.BELT_BY_RANK = { 0: 'white', 1: 'yellow', 2: 'green', 3: 'blue', 4: 'brown', 5: 'black1', 6: 'dan3', 7: 'dan5', 8: 'dan8', 9: 'champ' };
KC.SIDE_CLOTH = { white: '#f2eee4', red: '#c8302a' };
// the gap Senpai stands at for each drill (the matrix reads the gap for a few techniques)
KC.DRILL_GAP = { revPunch: 6, upperPunch: 6, backSweep: 16, frontSweep: 18, squatPunch: 20, frontKick: 20, midLunge: 22, upLunge: 26, backKick: 22, roundKick: 22, turnBackKick: 24, backRound: 22, lowKick: 20, jumpSide: 40, jumpBack: 22 };

// ---- src/10-sim.js
// ---------------------------------------------------------------- the fight simulation (no drawing; deterministic; 120 Hz steps)
// Positions: x 0..400 (the arena), z is height. A fighter's "front" is the foe's side (facing), so 't' is toward the foe.
KC.ARENA = { x0: 0, x1: 400, marks: [150, 250] };
KC.BODY_W = 18;           // push box width: contact means a gap of 0
KC.WALK_AWAY = 56;        // units per second, walking back
KC.KNOCK_STEPS = 96;      // a full point or a sweep: lying down for this many steps
KC.HITSTOP_CALLS = true;

// a screen direction ('l' | 'r' | 'u' | 'd' | 'n') to a relative one for a fighter whose foe is on side foeDir (+1 right, -1 left)
KC.relDir = (screen, foeDir) => {
  if (screen === 'r') return foeDir > 0 ? 't' : 'a';
  if (screen === 'l') return foeDir > 0 ? 'a' : 't';
  return screen;
};

// a human's intent: posture from the left stick / WASD (held); the technique from the right stick or face buttons (press edges)
KC.readControl = (input, foeDir, prev) => {
  const held = (a) => input.down(a);
  let px = 'n';
  if (held('up') && !held('down')) px = 'u';
  else if (held('down') && !held('up')) px = 'd';
  else if (held('left') && !held('right')) px = 'l';
  else if (held('right') && !held('left')) px = 'r';
  let edge = null;
  if (input.pressed('tUp')) edge = 'u';
  else if (input.pressed('tDown')) edge = 'd';
  else if (input.pressed('tLeft')) edge = 'l';
  else if (input.pressed('tRight')) edge = 'r';
  // the right stick, read directly: a 4-way gate on its dominant axis, a press on the edge
  const aim = input.padAim;
  const q = aim ? KC.quantize(aim[0], -aim[1]) : null;
  if (prev) { if (q && q !== prev.padQ && !edge) edge = q; prev.padQ = q; }
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};

// ---------------------------------------------------------------- Karateka: one fighter
KC.Karateka = class Karateka {
  constructor(o) {
    this.id = o.id; this.r = KC.DATA.roster[o.id]; this.side = o.side;
    this.stats = Object.assign({ walk: 1, reach: 1, speed: 1 }, this.r.stats || {});
    this.score = 0; this.bestPts = 0; this.hitsMade = { full: 0, half: 0, counters: 0 };
    this.intent = null;
    this.reset(false);
  }
  reset() {
    this.x = this.side === 'w' ? KC.ARENA.marks[0] : KC.ARENA.marks[1];
    this.z = 0; this.vz = 0; this.vx = 0;
    this.facing = this.side === 'w' ? 1 : -1;
    this.state = 'idle'; this.tech = null; this.crouch = false; this.flipping = false;
    this.stun = 0; this.downT = 0; this.recoilT = 0; this.pending = null; this.pendingT = 0; this.pendingPost = 'n';
    this.travel = 0; this.lastTech = null; this.guardOn = false;
  }
  get dir() { return this.facing; }
  get airborne() { return this.z > 0.01 || this.vz > 0.01; }
  // frames at 60 Hz to steps at 120 Hz, scaled by this fighter's speed and the tuning
  steps(frames) { return Math.max(1, Math.round(frames * 2 / (this.stats.speed * KC.TUNE.techSpeed))); }
  techSteps(id) {
    const T = KC.DATA.techniques[id];
    if (T.block) return { s: 1, a: Math.max(1, Math.round(KC.TUNE.blockWindow * 2)), r: 8 };
    return { s: this.steps(T.f[0]), a: this.steps(T.f[1]), r: this.steps(T.f[2]) };
  }
  // the foe's relative height rule (4.3): can this technique hit this foe right now?
  hittableBy(T, foe) {
    if (foe.state === 'down' || foe.state === 'rise') return false;
    if (foe.airborne) {
      if (T.antiAir) return foe.vz > 0;     // upper punch: only the first half of an airborne arc
      return T.height === 'high';           // only high techniques reach a jumper or a flipper
    }
    if (foe.crouch) {
      if (T.height === 'high') return false;
      if (T.height === 'mid') return !!T.hitsCrouch;
      return true;
    }
    return true;
  }
  startTech(id) {
    const T = KC.DATA.techniques[id], d = this.techSteps(id);
    this.tech = { id, ph: 0, t: 0, s: d.s, a: d.a, r: d.r, hit: false, gap: 0 };
    this.lastTech = id; this.state = 'tech';
    this.travel = T.travel ? T.travel * this.facing / (d.s + d.a) : 0;
    this.crouch = false;
    if (T.flip) { this.vz = 370; this.vx = T.travel * this.facing / 0.67; this.flipping = true; }
    else if (T.roll) { this.vx = T.travel * this.facing / 0.75; this.travel = 0; }
    else if (T.air || id === 'jump') { this.vz = KC.TUNE.jump; this.travel = T.travel ? T.travel * this.facing / (d.s + d.a) : 0; }
    if (id === 'crouch') { this.crouch = true; this.state = 'crouch'; this.tech = null; }
    if (id === 'block') this.guardOn = false;
  }
  // a press (rel posture + rel stick) while free starts a technique; returns true if it did
  tryStart(stick, posture, foe) {
    const gap = Math.abs(foe.x - this.x) - KC.BODY_W;
    const id = KC.DATA.techFor(posture || 'n', stick, gap);
    if (!id) return false;
    const T = KC.DATA.techniques[id];
    if (this.airborne && !T.air && !T.flip) return false;
    if (id === 'crouch') { if (!this.airborne) { this.startTech('crouch'); return true; } return false; }
    if (id === 'jump') { if (this.airborne) return false; this.startTech('jump'); return true; }
    this.startTech(id);
    return true;
  }
  // the intent of a free fighter (no technique) is walking, crouching or jumping
  moveIntent(dt, foe) {
    const p = this.intent ? this.intent.posture : 'n';
    const s = foe.x > this.x ? 1 : -1;
    let vx = 0;
    if (p === 't') vx = s * KC.TUNE.walk * this.stats.walk;
    else if (p === 'a') vx = -s * KC.WALK_AWAY * this.stats.walk;
    if (p === 'd' && !this.airborne) { this.crouch = true; this.state = 'crouch'; }
    else if (this.state === 'crouch') { this.crouch = false; this.state = 'idle'; }
    if (p === 'u' && !this.airborne) { this.vz = KC.TUNE.jump; this.state = 'idle'; }
    if (!this.airborne) { this.vx = vx; this.state = (this.state === 'crouch') ? 'crouch' : (vx !== 0 ? 'walk' : 'idle'); }
    this.x += this.vx * dt;
    this.clampX();
  }
  clampX() { this.x = KC.clamp(this.x, KC.ARENA.x0 + KC.BODY_W / 2, KC.ARENA.x1 - KC.BODY_W / 2); }
  knock(dir) { this.state = 'down'; this.downT = KC.KNOCK_STEPS; this.tech = null; this.crouch = false; this.flipping = false; this.x -= dir * 18; this.clampX(); }
  stagger(dir) { this.state = 'hit'; this.stun = 30; this.tech = null; this.crouch = false; this.x -= dir * 10; this.clampX(); }
  // the sim's input step: a press starts a technique; a press while busy is buffered for 0.15 s (18 steps)
  control(intent, foe) {
    this.intent = intent || { posture: 'n', tech: null };
    if (!intent || !intent.tech) return;
    if (this.state === 'down' || this.state === 'hit' || this.state === 'rise') return;
    if (this.state === 'tech' || this.airborne && this.state !== 'idle') { this.pending = intent.tech; this.pendingPost = intent.posture; this.pendingT = 18; return; }
    if (!this.tryStart(intent.tech, intent.posture, foe)) { this.pending = intent.tech; this.pendingPost = intent.posture; this.pendingT = 18; }
  }
  // one step of this fighter. live: the fight is on (movement and techniques); otherwise only the body settles.
  tick(dt, foe, live) {
    if (this.state === 'down') { this.downT--; if (this.downT <= 0) { this.state = 'rise'; this.stun = 36; } return; }
    if (this.state === 'rise') { this.stun--; if (this.stun <= 0) this.state = 'idle'; return; }
    if (this.state === 'hit') { this.stun--; if (this.stun <= 0) this.state = 'idle'; return; }
    if (this.recoilT > 0) this.recoilT -= dt;
    // flight
    if (this.z > 0 || this.vz !== 0) {
      this.vz -= KC.TUNE.gravity * dt; this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; this.flipping = false; this.vx = 0; if (this.tech && this.tech.ph < 2 && (KC.DATA.techniques[this.tech.id].air || KC.DATA.techniques[this.tech.id].flip)) { this.tech.ph = 2; this.tech.t = 0; } }
    }
    if (this.state === 'tech' && this.tech) {
      const T = KC.DATA.techniques[this.tech.id], k = this.tech;
      if (k.ph === 0) { k.t++; if (k.t >= k.s) { k.ph = 1; k.t = 0; } }
      if (k.ph === 1) {
        k.t++;
        if (!this.airborne && this.travel) this.x += this.travel;
        if (T.block) this.guardOn = true;
        if (k.t >= k.a) { k.ph = 2; k.t = 0; this.guardOn = false; }
      }
      if (k.ph === 2) {
        k.t++;
        if (T.roll || T.flip) { this.x += this.vx * dt; }
        if (k.t >= k.r) this.endTech();
      }
      if (T.roll && this.tech && this.tech.ph === 2) this.vx *= 0.9;
      if (this.tech && (T.flip || T.air)) this.x += this.vx * dt;
    }
    if (this.state === 'tech' && this.tech && this.tech.ph === 1 && this.tech.id === 'block') this.guardOn = true;
    if (this.pendingT > 0) { this.pendingT--; if (this.pendingT <= 0) this.pending = null; }
    if (live && this.state !== 'tech' && this.intent) {
      // a buffered press fires on the first free step
      if (this.pending && this.state !== 'crouch' && !this.airborne) {
        const st = this.pending; this.pending = null; this.pendingT = 0;
        if (this.tryStart(st, this.pendingPost, foe)) return this.afterStart(foe);
      }
      if (this.intent.tech) { this.intent.tech = null; } // the press was spent on the start in control()
      this.moveIntent(dt, foe);
    } else if (this.state !== 'tech' && this.state !== 'down' && this.state !== 'hit' && this.state !== 'rise') {
      this.clampX();
    }
    if (this.state !== 'tech' && !this.airborne && foe) this.facing = foe.x >= this.x ? 1 : -1;
    if (this.state === 'tech' && this.tech && this.tech.id === 'block') this.facing = foe.x >= this.x ? 1 : -1;
    if (this.state !== 'tech' && this.state !== 'down' && this.state !== 'rise') this.clampX();
    if (this.state === 'tech' && !this.airborne && this.tech && !KC.DATA.techniques[this.tech.id].air && !KC.DATA.techniques[this.tech.id].flip) this.vx = 0;
  }
  afterStart() { }
  endTech() {
    this.tech = null; this.state = this.z > 0 ? 'idle' : 'idle';
    this.guardOn = false; this.travel = 0; this.flipping = this.z > 0 && this.flipping;
    if (!this.airborne) this.vx = 0;
  }
  // rig state: serializable (6.1), so a replay or a guest poses the same way
  poseState() {
    const k = this.tech;
    return { id: this.id, x: this.x, z: this.z, facing: this.facing, state: this.state, tech: k ? k.id : null, ph: k ? k.ph : -1, t: k ? k.t : 0, crouch: this.crouch, down: this.state === 'down' ? 1 : 0, flip: this.flipping, guard: this.guardOn };
  }
};

// ---------------------------------------------------------------- Bout: the referee's state machine (5.2), the scoring (4.5), the hantei (5.2)
KC.PHASE_SEC = { intro: 1.2, rei: 0.9, card: 0.9, ready: 0.4, hajime: 0.6, yame: 0.9, award: 1.2, roundEnd: 2.0, time: 0.8, hantei: 2.4, matchEnd: 2.5 };
KC.Bout = class Bout {
  constructor(o) {
    this.a = o.white; this.b = o.red;               // a = white, the left mark
    this.seed = (o.seed >>> 0) || 1;
    this.judgeRng = [E.rng(this.seed + 1), E.rng(this.seed + 2)];
    this.roundsToWin = o.roundsToWin || KC.TUNE.roundsToWin;
    this.pointsToWin = o.pointsToWin || KC.TUNE.pointsToWin;
    this.listeners = {};
    this.round = 1; this.roundWins = [0, 0]; this.matchOver = null; this.roundWinner = null; this.rounds = [];
    this.pace = KC.TUNE.refPace || 1;
    this.clockStart = KC.TUNE.clock; this.clock = this.clockStart;
    this.points = [0, 0]; this.stats = [this.emptyStats(), this.emptyStats()];
    this.attempts = [0, 0]; this.techPts = [0, 0]; this.blocksRound = [0, 0];
    this.pending = null; this.hitstopT = 0; this.lastCall = null; this.lastPoint = null; this.lastLanded = null;
    this.steps = 0; this.log = []; this.intro = o.intro !== false;
    this.setPhase(this.intro ? 'intro' : 'rei');
  }
  emptyStats() { return { full: 0, half: 0, blocks: 0, counters: 0 }; }
  on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); return this; }
  emit(name, data) {
    this.log.push(name); if (this.log.length > 200) this.log.shift();
    (this.listeners[name] || []).forEach(f => f(data));
  }
  call(id, sub) {
    const pair = KC.TEXT.calls[id]; const text = pair ? pair[KC.callLang()] : id;
    this.lastCall = { id, text, sub: sub || null, step: this.steps };
    this.emit('call', this.lastCall);
    return text;
  }
  setPhase(p) {
    this.phase = p; this.phaseT = 0;
    this.phaseLen = KC.PHASE_SEC[p] !== undefined ? KC.PHASE_SEC[p] * this.pace : 0;
    if (p === 'intro') { this.a.x = 8; this.b.x = 392; this.a.facing = 1; this.b.facing = -1; }
    if (p === 'rei') { this.a.state = this.b.state = 'bow'; this.call('bow'); }
    if (p === 'ready') { this.a.reset(); this.b.reset(); }
    if (p === 'hajime') { this.call('begin'); }
    if (p === 'fight') { this.clock = this.clockStart; this.attempts = [0, 0]; this.techPts = [0, 0]; this.blocksRound = [0, 0]; this.emit('fight', {}); }
    if (p === 'yame') { this.call('stop'); }
    if (p === 'roundEnd') { this.emit('roundEnd', { winner: this.roundWinner }); }
    if (p === 'matchEnd') { this.emit('matchEnd', { winner: this.matchOver }); }
  }
  get fighters() { return [this.a, this.b]; }
  get frozen() { return this.hitstopT > 0; }
  // one fixed step; ctl = { a(): intent, b(): intent } read during the fight
  step(dt, ctl) {
    this.steps++; this.phaseT += dt;
    const p = this.phase;
    if (p === 'intro') { this.walkToMarks(dt, 60); if (this.phaseT >= this.phaseLen) this.setPhase('rei'); return; }
    if (p === 'rei') { if (this.phaseT >= this.phaseLen) this.setPhase('card'); return; }
    if (p === 'card') { this.a.state = this.b.state = 'idle'; if (this.phaseT >= this.phaseLen) this.setPhase('ready'); return; }
    if (p === 'ready') { this.a.state = this.b.state = 'idle'; if (this.phaseT >= this.phaseLen) this.setPhase('hajime'); return; }
    if (p === 'hajime') { if (this.phaseT >= this.phaseLen) this.setPhase('fight'); return; }
    if (p === 'fight') return this.fight(dt, ctl);
    if (p === 'yame') { this.tickBoth(dt, false); if (this.phaseT >= this.phaseLen) this.setPhase('award'); return; }
    if (p === 'award') { this.tickBoth(dt, false); if (this.phaseT >= this.phaseLen) this.afterAward(); return; }
    if (p === 'reset') { this.walkToMarks(dt, 144); if (this.atMarks() || this.phaseT > 1.8) this.setPhase('card'); return; }
    if (p === 'roundEnd') { if (this.phaseT >= this.phaseLen) (this.matchOver !== null ? this.setPhase('matchEnd') : this.nextRound()); return; }
    if (p === 'time') { if (this.phaseT >= this.phaseLen) this.setPhase('hantei'); return; }
    if (p === 'hantei') { if (this.phaseT >= this.phaseLen) this.afterHantei(); return; }
    if (p === 'matchEnd') { if (this.phaseT >= this.phaseLen) this.emit('done', { winner: this.matchOver }); return; }
  }
  atMarks() { return Math.abs(this.a.x - KC.ARENA.marks[0]) < 0.5 && Math.abs(this.b.x - KC.ARENA.marks[1]) < 0.5; }
  walkToMarks(dt, speed) {
    for (const [f, t] of [[this.a, KC.ARENA.marks[0]], [this.b, KC.ARENA.marks[1]]]) {
      const d = t - f.x, s = Math.min(Math.abs(d), speed * dt);
      f.x += Math.sign(d) * s; f.state = Math.abs(d) > 0.5 ? 'walk' : 'idle';
      f.facing = f === this.a ? 1 : -1;
    }
  }
  tickBoth(dt, live) { this.a.tick(dt, this.b, live); this.b.tick(dt, this.a, live); }
  nextRound() { this.round++; this.points = [0, 0]; this.setPhase('reset'); }
  afterAward() {
    if (this.points[0] >= this.pointsToWin || this.points[1] >= this.pointsToWin) {
      return this.endRound(this.points[0] >= this.pointsToWin ? 0 : 1, 'points');
    }
    if (this.clock <= 0) { this.setPhase('time'); return; }
    this.setPhase('reset');
  }
  endRound(side, why) {
    this.roundWinner = side; this.roundWins[side]++;
    const bonus = (this.clock > 0 && why === 'points') ? Math.floor(this.clock) * 100 : 0;
    if (bonus) this.stats[side].bonus = (this.stats[side].bonus || 0) + bonus;
    this.rounds.push({ winner: side, points: this.points.slice(), why, stats: this.stats.map(s => Object.assign({}, s)) });
    this.matchOver = this.roundWins[side] >= this.roundsToWin ? side : null;
    this.call(side === 0 ? 'whiteWins' : 'redWins');
    this.setPhase('roundEnd');
  }
  fight(dt, ctl) {
    if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
    if (!KC.TOGGLES.infiniteTime && !this.pending) this.clock = Math.max(0, this.clock - dt * KC.TUNE.gameSpeed);
    if (this.clock <= 0 && !this.pending) { this.call('time'); return this.setPhase('time'); }
    // a short run with a settled score: nothing new is awarded while the pending hit is in its window
    if (this.phaseT >= 0.35 * this.pace) {
      const iA = ctl && ctl.a ? ctl.a() : null, iB = ctl && ctl.b ? ctl.b() : null;
      this.a.control(iA, this.b); this.b.control(iB, this.a);
    }
    this.tickBoth(dt, true);
    const hits = [this.checkHit(this.a, this.b), this.checkHit(this.b, this.a)].filter(Boolean);
    if (this.pending) {
      if (hits.some(h => h.side !== this.pending.first.side)) { return this.aiuchi(); }
      this.pending.t--;
      if (this.pending.t <= 0) this.award(this.pending.first);
      return;
    }
    if (hits.length) {
      this.pending = { first: hits[0], t: 6 };
      if (hits.length > 1) return this.aiuchi();
    }
  }
  aiuchi() {
    this.pending = null;
    this.call('aiuchi'); this.emit('aiuchi', {});
    this.stats.forEach(s => s.aiuchi = (s.aiuchi || 0) + 1);
    this.hitstopT = KC.TUNE.hitstop;
    this.setPhase('yame');
  }
  // a technique has connected: score it (4.5), or the block (4.4); returns the landed record, or null
  checkHit(att, def) {
    if (att.state !== 'tech' || !att.tech || att.tech.hit || att.tech.ph !== 1) return null;
    const T = KC.DATA.techniques[att.tech.id];
    if (!T.reach) return null;
    if (KC.TOGGLES.p1Invincible && att === this.b && def === this.a) return null;   // dev: the CPU cannot score on P1
    const dirOk = T.spin || T.flip || (def.x - att.x) * att.facing >= 0;
    if (!dirOk) return null;
    const gap = Math.abs(def.x - att.x) - KC.BODY_W;
    const maxR = T.reach[1] * KC.TUNE.reachScale * att.stats.reach;
    if (gap > maxR) return null;
    if (!att.hittableBy(T, def)) return null;
    att.tech.hit = true; att.tech.gap = gap;
    const side = att === this.a ? 0 : 1;
    // a guard stops high and mid techniques (not the unblockable low ones); the attacker is pushed back and recovers 10 frames later
    if (def.tech && def.tech.id === 'block' && def.guardOn && !T.unblockable) {
      this.stats[1 - side].blocks++; this.blocksRound[1 - side]++;
      att.x -= att.facing * 14; att.tech.r += this.steps10(); att.recoilT = 0.2;
      def.tech.ph = 2; def.tech.t = def.tech.r; def.guardOn = false;
      this.emit('block', { by: 1 - side, tech: T.name });
      this.lastBlock = { by: 1 - side, step: this.steps };
      return null;
    }
    const k = att.tech;
    const frac = k.a > 1 ? Math.min(1, (k.t - 1) / (k.a - 1)) : 0;
    const timingQ = frac <= 0.4 ? 1 : Math.max(0.3, 1 - (frac - 0.4) / 0.6 * 0.7);
    const r0 = T.reach[0], r1 = Math.max(r0 + 1, T.reach[1] * KC.TUNE.reachScale * att.stats.reach);
    const spacingQ = Math.min(1, KC.clamp((gap - r0) / (r1 - r0), 0, 1) / 0.7);
    let q = Math.max(0.15, 0.5 * timingQ + 0.5 * spacingQ);
    if (att.r.sig === k.id) q = Math.min(1, q + 0.1);
    if (T.antiAir && def.airborne) q = Math.min(1, q + 0.25);
    let pts = KC.clamp(T.pts[0] + Math.round((T.pts[1] - T.pts[0]) * q / 100) * 100, T.pts[0], T.pts[1]);
    const counter = (def.state === 'tech' && def.tech && def.tech.id !== 'block') || def.recoilT > 0;
    if (counter) pts = Math.min(1000, Math.round(pts * KC.TUNE.counterMul));
    const full = pts >= KC.TUNE.fullAt;
    return { att, def, side, T, id: k.id, pts, full, counter, q, timingQ, spacingQ, gap, knock: full || !!T.knockdown };
  }
  steps10() { return 20; }
  award(p) {
    const sc = p.side;
    this.points[sc] += p.full ? 1 : 0.5;
    this.techPts[sc] += p.pts;
    this.attempts[sc]++;
    const st = this.stats[sc];
    if (p.full) st.full++; else st.half++;
    if (p.counter) st.counters++;
    p.att.score += p.pts; p.att.bestPts = Math.max(p.att.bestPts, p.pts);
    p.att.hitsMade[p.full ? 'full' : 'half']++; if (p.counter) p.att.hitsMade.counters++;
    this.lastPoint = { side: sc, pts: p.pts, full: p.full, counter: p.counter, tech: p.id, q: p.q, timingQ: p.timingQ, spacingQ: p.spacingQ, gap: p.gap };
    if (p.knock) p.def.knock(p.att.facing); else p.def.stagger(p.att.facing);
    this.hitstopT = KC.TUNE.hitstop;
    this.pending = null;
    this.emit('point', this.lastPoint);
    this.call(p.full ? 'full' : 'half', p.counter ? 'COUNTER' : null);
    this.setPhase('yame');
  }
  afterHantei() {
    const sA = this.techPts[0] + 60 * this.attempts[0] + 40 * this.blocksRound[0];
    const sB = this.techPts[1] + 60 * this.attempts[1] + 40 * this.blocksRound[1];
    const vA = sA + (this.judgeRng[0]() * 2 - 1) * 120, vB = sB + (this.judgeRng[1]() * 2 - 1) * 120;
    const winner = vA === vB ? (this.lastPoint ? this.lastPoint.side : 0) : (vA > vB ? 0 : 1);
    this.emit('hantei', { winner }); this.call('judges');
    if (this.points[0] !== this.points[1]) this.endRound(this.points[0] > this.points[1] ? 0 : 1, 'time');
    else this.endRound(winner, 'hantei');
  }
  timeOut() { return this.clock <= 0; }
};
KC.callLang = () => (KC.settings && KC.settings.calls === 'Japanese') ? 1 : 0;
KC.settings = { calls: 'English' };

// ---------------------------------------------------------------- the CPU (6.1). Its output is the same intent a human makes.
KC.levelParams = (L) => {
  const t = (L - 1) / 9, s = (a, b) => a + (b - a) * t;
  return { react: s(0.55, 0.12) * KC.TUNE.cpuReact, think: s(0.50, 0.14), readP: s(0.25, 0.92), mistake: s(0.30, 0.02) };
};
KC.DATA.inverse = (() => {
  const inv = {};
  for (const p of Object.keys(KC.DATA.matrix)) for (const s of Object.keys(KC.DATA.matrix[p])) {
    const id = KC.DATA.matrix[p][s]; if (!inv[id]) inv[id] = { posture: p, stick: s };
  }
  inv.revPunch = { posture: 'n', stick: 't' }; inv.frontKick = { posture: 'n', stick: 't' };
  return inv;
})();
KC.KarateAI = class KarateAI {
  constructor(fighter, seed, o = {}) {
    this.f = fighter; this.rng = E.rng((seed >>> 0) || 1);
    const base = fighter.r.ai || { level: 3, aggr: .5, patience: .4, jump: .1, block: .3, gap: 40, weights: { roundKick: 1 } };
    this.L = KC.TUNE.cpuLevel > 0 && !o.noOverride ? KC.TUNE.cpuLevel : (o.level || base.level);
    this.p = KC.levelParams(this.L);
    this.ai = base;
    this.aggr = KC.TUNE.cpuAggression >= 0 ? KC.TUNE.cpuAggression : base.aggr;
    this.think = 0; this.hold = { posture: 'n', tech: null }; this.holdT = 0;
    this.delayed = []; this.seen = null;
  }
  observe(foe) {
    return { tech: foe.tech ? foe.tech.id : null, ph: foe.tech ? foe.tech.ph : -1, air: foe.airborne, crouch: foe.crouch, down: foe.state === 'down' || foe.state === 'rise', gap: Math.abs(foe.x - this.f.x) - KC.BODY_W };
  }
  intent(foe, dt) {
    this.delayed.push(this.observe(foe));
    const delay = Math.max(1, Math.round(this.p.react * 120));
    while (this.delayed.length > delay) this.seen = this.delayed.shift();
    this.think -= dt;
    if (this.think > 0) return { posture: this.hold.posture, tech: null };
    this.think = this.p.think * (0.9 + 0.2 * this.rng());
    const seen = this.seen || this.observe(foe), gap = Math.abs(foe.x - this.f.x) - KC.BODY_W;
    let out = null;
    if (seen.tech && (seen.ph === 0 || seen.ph === 1) && this.rng() < this.p.readP) {
      const T = KC.DATA.techniques[seen.tech];
      if (T.height === 'low') out = this.rng() < this.ai.jump + 0.4 ? { posture: 'u', tech: null } : null;
      else if (T.height === 'high') out = this.rng() < 0.6 ? { posture: 'd', tech: null } : { posture: 'a', tech: null };
      else if (T.height === 'mid') out = this.rng() < this.ai.block ? { posture: 'a', tech: 't' } : { posture: 'a', tech: null };
      if (seen.air && gap < 40) out = { posture: 'd', tech: 'u' };
    }
    if (!out && seen.ph === 2 && gap <= 40 && this.rng() < 0.85) out = this.best(gap);
    if (!out) {
      const pick = this.pickWeighted(gap);
      if (pick && this.rng() < this.aggr) out = pick;
      else out = { posture: gap > this.ai.gap + 6 ? 't' : (gap < this.ai.gap - 6 ? 'a' : 'n'), tech: null };
    }
    if (this.rng() < this.p.mistake) out = { posture: 'n', tech: KC.pick(this.rng, ['u', 't', 'd', 'a']) };
    this.hold = { posture: out.posture, tech: null };
    return Object.assign({}, out);
  }
  best(gap) {
    let best = null, bestW = -1;
    for (const id of Object.keys(this.ai.weights)) {
      const T = KC.DATA.techniques[id]; if (!T || !T.reach || gap < T.reach[0] || gap > T.reach[1]) continue;
      if (this.ai.weights[id] > bestW) { bestW = this.ai.weights[id]; best = id; }
    }
    const inv = best && KC.DATA.inverse[best];
    return inv ? { posture: inv.posture, tech: inv.stick } : null;
  }
  pickWeighted(gap) {
    const ids = Object.keys(this.ai.weights).filter(id => { const T = KC.DATA.techniques[id]; return T && T.reach && gap >= T.reach[0] - 6 && gap <= T.reach[1] + 6; });
    if (!ids.length) return null;
    const total = ids.reduce((s, id) => s + this.ai.weights[id], 0);
    let r = this.rng() * total, pick = ids[0];
    for (const id of ids) { r -= this.ai.weights[id]; if (r <= 0) { pick = id; break; } }
    const inv = KC.DATA.inverse[pick];
    return inv ? { posture: inv.posture, tech: inv.stick } : null;
  }
};
KC.pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

// ---- src/20-view.js
// ---------------------------------------------------------------- the view: rigs, stages, HUD, glyphs (no game rules here)
KC.View = {};
const V = KC.View;

// a fighter's rig: built from the roster, in the side's gi colour (white on the left mark, red on the right) unless a palette says otherwise
V.gi = (side, mode) => mode === 'classic' ? (side === 'w' ? '#e8e4d8' : '#b83028') : (side === 'w' ? '#f2eee4' : '#c8302a');
V.rigFor = (k, side, colorsOverride) => {
  const R = KC.DATA.roster[k];
  const gi = colorsOverride || V.gi(side);
  const belt = (k === 'mei') ? '#e8c040' : (side === 'w' ? '#f4f4ee' : '#16161c');
  const rig = new E.Humanoid({
    size: R.size, build: R.build, hair: R.hair || 'short', hat: R.hat || null, hood: !!R.hood,
    sleeves: 'short', weapon: null, hunch: R.hunch || 0,
    colors: {
      skin: R.skin, hair: k === 'ika' ? '#f4f0ff' : (k === 'kyabetsu' || k === 'kikurage' || k === 'genkotsu' ? '#8a7a6a' : '#1a1418'),
      cloth: gi, coat: gi, pants: gi, trim: gi, belt, glove: R.skin, boot: R.skin, shirt: gi,
      metal: '#c8c8d0', plate: gi, hilt: '#c8a040', eye: '#1a1418', iris: '#2a1a10', cape: '#8a2020', capeIn: '#5a1010'
    }
  });
  rig.kId = k; rig.kSide = side;
  return rig;
};
// drive a rig from a fighter's serializable pose state (poseState), so puppets and replays look identical
V.applyPose = (rig, st, dt) => {
  const T = st.tech ? KC.DATA.techniques[st.tech] : null;
  const spec = T && T.move && E.MOVES[T.move] ? E.MOVES[T.move] : null;
  let attack = null;
  if (spec && st.ph >= 0) {
    const len = st.ph === 0 ? (T.f[0] || 1) : st.ph === 1 ? (T.f[1] || 1) : (T.f[2] || 1);
    const u = Math.min(1, (st.t || 0) / Math.max(1, len * 2 / (1 * KC.TUNE.techSpeed)));
    attack = { spec, phase: ['wind', 'active', 'recover'][st.ph], u: st.ph === 1 ? u : Math.min(1, u) };
  }
  let pose = null;
  if (st.down) pose = 'down';
  else if (st.guard) pose = 'guard';
  else if (st.crouch) pose = 'crouch';
  else if (st.state === 'bow') pose = 'kneel';
  else if (st.state === 'win') pose = 'cheer';
  const s = {
    x: st.x, y: 0, z: st.z, vx: 0, vy: 0, facing: st.facing > 0 ? 0 : Math.PI, air: st.z > 0.5,
    crouch: !!st.crouch, pose, attack, flip: st.flip ? Math.min(1, Math.max(0, (st.t || 0) / 60)) : 0,
    down: st.down || 0, run: 0
  };
  if (st.state === 'walk') s.run = 0.4;
  if (st.stance) s.stance = 'guard';
  if (st.hit) s.hurt = 1;
  rig.update(dt, s);
  if (T && T.spin && st.ph === 1) rig.spin = T.spin * Math.min(1, st.t / Math.max(1, KC.DATA.techniques[st.tech].f[1] * 2));
  else rig.spin = 0;
  return rig;
};

// ---------------------------------------------------------------- stages: a backdrop, a floor, props and a crowd (drawn behind the fight)
V.backdrops = {};
V.backdropFor = (st) => {
  if (V.backdrops[st.id]) return V.backdrops[st.id];
  const layers = (st.layers || []).map((kind, i) => ({ kind, color: st.floorDark || '#2a2a40', y: 0.62 + i * 0.05, height: 0.2 + i * 0.05, parallax: 0.2 + i * 0.1, seed: 11 + i }));
  const bd = new E.Backdrop({ sky: st.sky, layers, stars: st.mood === 'night' ? 30 : 0, starsY: 0.5 });
  V.backdrops[st.id] = bd;
  return bd;
};
// the floor band under the arena, the crowd and the stage's painted details
V.drawStage = (r, st, t) => {
  const g = r.ctx, bd = V.backdropFor(st);
  bd.draw(r);
  const floor = Math.round(r.w(0, 0, 0)[1]), W = r.bw, H = r.bh, sx = x => r.w(x, 0, 0)[0];
  // lanterns glow in the warm stages
  if (st.lanterns) for (let k = 0; k < 7; k++) { const lx = Math.round(sx(-60 + k * 95)), ly = floor - 70, glow = 0.6 + 0.4 * Math.sin(t * 3 + k); E.px.blend(g, 0.25 * glow, 'add', () => E.px.disc(g, lx, ly, 10, '#ff9a4a')); }
  // the floor: a band of boards, lit in the middle
  for (let y = floor; y < H; y++) { const k = (y - floor) / Math.max(1, H - floor); E.px.rect(g, 0, y, W, 1, E.mix(st.floor, st.floorDark, k)); }
  for (let k = -10; k <= 10; k++) { const x0 = sx(200 + k * 36); E.px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.8), H, st.floorDark); }
  E.px.blend(g, 0.15, 'add', () => E.px.ell(g, W / 2, floor + 12, W * 0.45, 9, st.mood === 'night' ? '#ff9a4a' : '#ffe0a0'));
  // crowd silhouettes behind the arena
  if (st.crowd) {
    const n = st.crowd === 'stands' ? 60 : 36;
    for (let i = 0; i < n; i++) {
      const row = i % 3, x = Math.round((sx(-60 + (i * 500 / n)) ) + E.hash2(i, 3) * 6), bob = Math.abs(Math.sin(t * (3 + E.hash2(i, 9) * 2) + i)) * (st.crowd === 'stands' ? 3 : 1);
      const y = floor - 14 - row * 8 - bob, c = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a'][i % 5];
      E.px.rect(g, x - 4, y - 8, 8, 9, c); E.px.disc(g, x, y - 10, 3, '#c8a080');
    }
  }
  E.px.rect(g, 0, floor - 1, W, 1, st.floorDark);
  // the stage's props, set just outside the arena
  // five slots either side of the arena (outside the 0..400 fight), filled from the stage's props in turn: 3-8 props on screen
  const list = (st.props && st.props.length) ? st.props : ['crate'];
  const slots = [-70, -40, 430, 455];
  slots.forEach((x, k) => { const p = list[k % list.length]; r.prop(V.propName[p] || 'crate', x, 16 + (k % 2) * 6, 0, { size: 1.4, light: !!st.lanterns }); });
};
V.propName = { lantern: 'lamp', drum: 'firedrum', crate: 'crate', barrel: 'barrel', cart: 'crate', bamboo: 'pine', toro: 'pillar', torii: 'banner', mast: 'pillar', stall: 'awning', bowl: 'pot', vines: 'vines' };

// ---------------------------------------------------------------- glyphs: PlayStation badges by default, Xbox letters, keycaps, mouse
V.PS = { cross: { c: '#7aa7ff' }, circle: { c: '#ff6a6a' }, square: { c: '#ff8ad8' }, triangle: { c: '#5ad8a0' } };
V.XB = { A: '#3ec260', B: '#e04a3a', X: '#4a8ae8', Y: '#f5c030' };
// KC.glyph(g, x, y, code, size): draws a button glyph. code: 'cross' 'circle' 'square' 'triangle' (PS) | 'A' 'B' 'X' 'Y' (Xbox) | 'stick-u/d/l/r' | 'key:<label>' | 'mouse'
KC.glyph = (g, x, y, code, size = 7) => {
  const P = E.px, h = Math.floor(size / 2);
  if (code && code.startsWith('key:')) {
    const label = code.slice(4), w = Math.max(size + 2, E.font.width(label, { scale: 1 }) + 4);
    P.rect(g, x - w / 2, y - h, w, size, '#d8d4e8'); P.rect(g, x - w / 2, y + h - 1, w, 1, '#8a84a0');
    E.font.text(g, label, x, y - 3, '#1a1420', { align: 'center', outline: false, font: 'tiny' });
    return w;
  }
  if (code === 'mouse') { P.rect(g, x - 3, y - 4, 7, 9, '#d8d4e8'); P.rect(g, x - 3, y - 4, 3, 4, '#ffd060'); return 7; }
  if (code && code.startsWith('stick')) {
    const d = code.slice(6), c = '#d8d4e8';
    P.disc(g, x, y, h, '#2a2636');
    const ax = d === 'l' ? -1 : d === 'r' ? 1 : 0, ay = d === 'u' ? -1 : d === 'd' ? 1 : 0;
    P.disc(g, x + ax * (h - 1), y + ay * (h - 1), 2, c);
    return size;
  }
  const isPS = !!V.PS[code], isXB = !!V.XB[code];
  const col = isPS ? V.PS[code].c : (isXB ? V.XB[code] : '#888');
  P.disc(g, x, y, h, '#15121e'); P.disc(g, x, y, h - 1, col);
  const k = '#15121e';
  if (code === 'cross') { P.line(g, x - 2, y - 2, x + 2, y + 2, k, 1); P.line(g, x + 2, y - 2, x - 2, y + 2, k, 1); }
  else if (code === 'circle') { P.disc(g, x, y, 2, k); P.disc(g, x, y, 1, col); }
  else if (code === 'square') { P.rect(g, x - 2, y - 2, 4, 4, k); }
  else if (code === 'triangle') { P.poly(g, [[x, y - 2], [x + 2, y + 2], [x - 2, y + 2]], k); }
  else if (isXB) { E.font.text(g, code, x, y - 3, '#15121e', { align: 'center', outline: false, font: 'tiny' }); }
  return size;
};
// the prompt for a technique: two icons (a stick and a button, or two keys)
KC.promptFor = (techId, device) => {
  const T = KC.DATA.techniques[techId];
  if (!T) return '';
  return T.jp;
};
// the labels for the technique sticks on this device
KC.stickIcons = () => ({ u: 'triangle', d: 'cross', l: 'square', r: 'circle' });

// ---------------------------------------------------------------- the fight HUD: point slots, the clock, the names, the calls
V.hud = (r, bout, opts) => {
  const g = null;
  r.overlay(gg => {
    const W = r.W, H = r.H;
    // clock
    E.ui.box(gg, W / 2 - 20, 4, 40, 16, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
    E.font.text(gg, String(Math.ceil(bout.clock)), W / 2, 8, bout.clock < 10 ? '#ff7a5a' : '#fff6d0', { align: 'center', outline: '#0b0814' });
    // names and point slots
    const slots = (sc, x0, dir) => {
      const f = sc === 0 ? bout.a : bout.b;
      E.font.text(gg, f.r.short, x0, 4, sc === 0 ? '#ffffff' : '#ffb8a8', { outline: '#0b0814' });
      for (let k = 0; k < KC.TUNE.pointsToWin; k++) {
        const cx = x0 + 4 + k * 12, cy = 22, p = bout.points[sc] - k;
        E.px.disc(gg, cx, cy, 4, '#15121e');
        if (p >= 1) E.px.disc(gg, cx, cy, 3, sc === 0 ? '#fff6e8' : '#ff5a4a');
        else if (p >= 0.5) { E.px.disc(gg, cx, cy, 3, '#2a2636'); E.px.rect(gg, cx - 3, cy - 3, 3, 6, sc === 0 ? '#fff6e8' : '#ff5a4a'); }
      }
      const rw = bout.roundWins[sc];
      for (let k = 0; k < bout.roundsToWin; k++) E.px.rect(gg, x0 + k * 6, 30, 4, 3, k < rw ? '#ffd060' : '#3a3450');
    };
    slots(0, 6, 1);
    const rightX = W - 6 - KC.TUNE.pointsToWin * 12;
    const fb = bout.b; E.font.text(gg, fb.r.short, W - 6, 4, '#ffb8a8', { align: 'right', outline: '#0b0814' });
    for (let k = 0; k < KC.TUNE.pointsToWin; k++) {
      const cx = W - 10 - k * 12, cy = 22, p = bout.points[1] - k;
      E.px.disc(gg, cx, cy, 4, '#15121e');
      if (p >= 1) E.px.disc(gg, cx, cy, 3, '#ff5a4a');
      else if (p >= 0.5) { E.px.disc(gg, cx, cy, 3, '#2a2636'); E.px.rect(gg, cx, cy - 3, 3, 6, '#ff5a4a'); }
    }
    for (let k = 0; k < bout.roundsToWin; k++) E.px.rect(gg, W - 10 - k * 6, 30, 4, 3, k < bout.roundWins[1] ? '#ffd060' : '#3a3450');
    // the call (the referee's words), in the title font
    const c = bout.lastCall;
    if (c && bout.phase !== 'fight' && c.text && bout.steps - c.step < 240) {
      const y = H * 0.2;
      E.font.title(gg, c.text, W / 2, y, { scale: 2, colors: ['#fffbe8', '#ffe08a', '#e8782a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
      if (c.sub) E.font.text(gg, c.sub, W / 2, y + 26, '#ffd060', { align: 'center', outline: '#0b0814' });
    }
    if (opts && opts.bottom) E.font.text(gg, opts.bottom, W / 2, H - 14, '#fff6d0', { align: 'center', outline: '#0b0814' });
    if (opts && opts.popup && opts.popup.t > 0) {
      const p = opts.popup;
      E.font.text(gg, p.text, p.x, p.y, p.color || '#ffe070', { align: 'center', outline: '#0b0814', scale: 1 });
    }
  });
};
// the point popup: a short floating text over the scorer
V.popupFor = (lp) => ({ t: 1, x: 0, y: 0, text: (lp.full ? 'FULL' : 'HALF') + ' · ' + KC.DATA.techniques[lp.tech].name + ' ' + lp.pts, color: lp.full ? '#ffe070' : '#ffffff' });
// the fight scene draws its fighters through this: the rigs were posed in the step (V.applyPose), so this only draws
V.drawFighters = (r, fighters, rigs) => {
  for (const f of fighters) {
    const rig = rigs[f.side];
    r.shadow(f.x, 0, 14, 0.5, '#0c0818', 0);
    r.actor(f.x, 0, f.z, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  }
};

// ---- src/30-audio.js
// ---------------------------------------------------------------- sound: sound effects, the music and the gibberish voices (all made in code)
KC.Audio = {};
const A = KC.Audio; KC.A = A;

// songs: the engine's sequencer format { bpm, steps, tracks: [{ wave, vol, notes }] }
A.songs = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: 0.14, notes: 'D5 - F5 - A5 - D6 - C6 - A5 - F5 - D5 | Bb4 - D5 - F5 - A5 - G5 - F5 - D5 - C5' },
    { wave: 'triangle', vol: 0.2, notes: 'D3 . D3 . A2 . A2 . Bb2 . Bb2 . A2 . A2 .' },
    { wave: 'drums', vol: 0.3, notes: 'k . h s h . k . h s h . h s k .' }] },
  dojo: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse12', vol: 0.12, notes: 'D4 . F4 . A4 . G4 . E4 . D4 . A3 . . | D4 . F4 . A4 . C5 . Bb4 . A4 . G4 . .' },
    { wave: 'drums', vol: 0.22, notes: 'k . . . s . . . k . . . s . . .' }] },
  harbor: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'G4 - B4 - D5 - G5 | E5 - D5 - B4 - G4 | A4 - C5 - E5 - A5 | G5 - E5 - D5 - B4' },
    { wave: 'triangle', vol: 0.18, notes: 'G2 . G2 . D2 . D2 . E2 . E2 . D2 . D2 .' },
    { wave: 'drums', vol: 0.2, notes: 'k h s h k h s h' }] },
  bamboo: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: 0.14, notes: 'A4 - - C5 - - E5 - - | D5 - - B4 - - - - | G4 - - A4 - - - - | E4 - - D4 - - - -' },
    { wave: 'drums', vol: 0.12, notes: 'h . . . h . . .' }] },
  gorge: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: 0.12, notes: 'E4 E4 E4 E4 E4 E4 E4 E4 | C4 C4 C4 C4 C4 C4 B3 B3' },
    { wave: 'drums', vol: 0.22, notes: 'k . k . s . k .' }] },
  ship: { bpm: 110, steps: 3, tracks: [
    { wave: 'square', vol: 0.12, notes: 'D5 - A4 | F5 - D5 | E5 - C5 | D5 - A4' },
    { wave: 'triangle', vol: 0.16, notes: 'D3 . . A2 . . D3 . . A2 . .' }] },
  market: { bpm: 124, steps: 4, tracks: [
    { wave: 'sine', vol: 0.14, notes: 'E5 - G5 - A5 - G5 | E5 - D5 - E5 - G5 | A5 - C6 - B5 - A5 | G5 - E5 - D5 - . ' },
    { wave: 'drums', vol: 0.22, notes: 'k h s h k h s h' }] },
  fuji: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: 0.1, notes: 'C4 E4 G4 C5 A4 E4 G4 C5 | F4 A4 C5 F5 D5 A4 C5 F5' },
    { wave: 'triangle', vol: 0.18, notes: 'C3 - - - F3 - - - G3 - - - C3 - - -' }] },
  stadium: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'C5 E5 G5 C6 B5 G5 E5 C5 | D5 F5 A5 D6 C6 A5 F5 D5' },
    { wave: 'saw', vol: 0.07, notes: 'C3 C3 G2 G2 A2 A2 F2 F2' },
    { wave: 'drums', vol: 0.28, notes: 'k s k s k s k s' }] },
  bonus: { bpm: 160, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'E5 . G5 . E5 . C5 . D5 . F5 . A4 .' },
    { wave: 'drums', vol: 0.2, notes: 'k h k h k h k h' }] },
  practice: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: 0.1, notes: 'D4 . . . F4 . . . A4 . . . G4 . . .' }] },
  select: { bpm: 128, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'G4 . B4 . D5 . G5 . F5 . D5 . B4 .' },
    { wave: 'drums', vol: 0.18, notes: 'k . h . k . h .' }] },
  continue: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'A4 A4 A4 A4 C5 C5 C5 C5 E5 E5 E5 E5 D5 D5 D5 D5' }] },
  gameover: { bpm: 80, steps: 4, tracks: [
    { wave: 'triangle', vol: 0.16, notes: 'E4 - D4 - C4 - B3 - A3 - - - -' }], loop: false },
  ending: { bpm: 104, steps: 4, tracks: [
    { wave: 'square', vol: 0.12, notes: 'D5 - A4 - D5 - F5 - A5 - G5 - F5 - D5 -' },
    { wave: 'triangle', vol: 0.18, notes: 'D3 . A2 . D3 . F3 . G3 . F3 . D3 .' }] },
  stingPromote: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: 0.14, notes: 'C5 E5 G5 C6 G5 C6 E6 C6' }], loop: false }
};
// the stage's music id -> song
A.musicFor = (id) => A.songs[id] ? id : 'dojo';

// the sound effects, named for the sim's events
A.defineAll = (audio) => {
  if (!audio || A.defined) return;
  A.defined = true;
  audio.define('whoosh', { wave: 'noise', freq: 900, to: 300, dur: 0.12, vol: 0.10 });
  audio.define('whooshH', { wave: 'noise', freq: 1600, to: 500, dur: 0.16, vol: 0.12 });
  audio.define('thwackHalf', { wave: 'noise', freq: 600, to: 120, dur: 0.12, vol: 0.28 });
  audio.define('thwackFull', { wave: 'saw', freq: 240, to: 60, dur: 0.22, vol: 0.34 });
  audio.define('clack', { wave: 'pulse', freq: 1400, to: 900, dur: 0.05, vol: 0.2 });
  audio.define('thud', { wave: 'sine', freq: 120, to: 40, dur: 0.3, vol: 0.4 });
  audio.define('flagSnap', { wave: 'square', freq: 800, to: 400, dur: 0.06, vol: 0.18 });
  audio.define('whistle', { wave: 'sine', freq: 2500, to: 2600, dur: 0.6, vol: 0.18, vib: [6, 0.03] });
  audio.define('gong', { wave: 'sine', freq: 180, to: 90, dur: 1.2, vol: 0.32 });
  audio.define('taiko', { wave: 'sine', freq: 90, to: 50, dur: 0.25, vol: 0.45 });
  audio.define('crowdOoh', { wave: 'triangle', freq: 320, to: 420, dur: 0.5, vol: 0.12 });
  audio.define('crowdCheer', { wave: 'noise', freq: 1200, to: 900, dur: 0.9, vol: 0.14 });
  audio.define('boardCrack', { wave: 'noise', freq: 2000, to: 300, dur: 0.18, vol: 0.4 });
  audio.define('potShatter', { wave: 'noise', freq: 2400, to: 900, dur: 0.22, vol: 0.32 });
  audio.define('bowlDing', { wave: 'sine', freq: 1320, to: 1200, dur: 0.5, vol: 0.2 });
  audio.define('bowlSplash', { wave: 'noise', freq: 800, to: 200, dur: 0.4, vol: 0.25 });
  audio.define('bullSnort', { wave: 'saw', freq: 110, to: 70, dur: 0.5, vol: 0.3 });
  audio.define('bullStomp', { wave: 'sine', freq: 80, to: 40, dur: 0.25, vol: 0.45 });
  audio.define('bullBellow', { wave: 'saw', freq: 90, to: 60, dur: 0.8, vol: 0.3 });
  audio.define('dizzy', { wave: 'triangle', freq: 1500, to: 1500, dur: 0.4, vol: 0.14, arp: [0, 7, 12], step: 0.07 });
  audio.define('perfect', { wave: 'square', freq: 660, to: 990, dur: 0.3, vol: 0.2, arp: [0, 4, 7], step: 0.08 });
  audio.define('kiai', { wave: 'saw', freq: 300, to: 180, dur: 0.22, vol: 0.2 });
  audio.define('countBeep', { wave: 'square', freq: 880, dur: 0.08, vol: 0.14 });
  audio.define('scoreTick', { wave: 'square', freq: 1200, dur: 0.03, vol: 0.1 });
  audio.define('beltTie', { wave: 'triangle', freq: 500, to: 900, dur: 0.25, vol: 0.2 });
  audio.define('menuMove', { wave: 'square', freq: 700, dur: 0.03, vol: 0.08 });
  audio.define('menuOk', { wave: 'square', freq: 520, to: 780, dur: 0.1, vol: 0.12 });
  audio.define('menuBack', { wave: 'square', freq: 360, to: 200, dur: 0.1, vol: 0.12 });
  audio.define('gull', { wave: 'sine', freq: 2000, to: 2400, dur: 0.2, vol: 0.06 });
  audio.define('steamHiss', { wave: 'noise', freq: 3000, to: 2000, dur: 0.5, vol: 0.06 });
  audio.define('cameraFlash', { wave: 'square', freq: 3000, to: 3000, dur: 0.03, vol: 0.12 });
};
A.sfx = (game, name, o) => { try { if (game && game.audio && game.audio.ready !== undefined && !KC.TOGGLES.mute) game.audio.sfx(name, o); } catch (e) { } };
A.music = (game, id, o) => {
  if (!game || !game.audio) return;
  const song = A.songs[id] || A.songs.dojo;
  game.audio.music(KC.TOGGLES.mute ? null : song, Object.assign({ loop: song.loop !== false }, o || {}));
};

// ---------------------------------------------------------------- the gibberish voices (Animalese / Simlish style, 6, 6.2 voice column)
// speak(line, who): a line's syllables, deterministic per line; returns the seconds it takes, which drives dialog timing.
A.syllables = (line) => {
  const s = String(line).toUpperCase().replace(/[^A-Z]/g, '');
  const out = [];
  let h = KC.hash(line);
  const vowels = 'AEIOU';
  for (let i = 0; i < s.length; i += 1 + ((h >>> (i % 16)) & 1)) {
    const c = s[i], v = s[i + 1] && vowels.includes(s[i + 1]) ? s[i + 1] : vowels[(s.charCodeAt(i) + i) % 5];
    out.push({ c, v, cls: 'SHTFPKGBDMNLRWYJZ'.includes(c) ? (('PKTBG'.includes(c)) ? 'plosive' : 'fricative') : 'none' });
    if (out.length > 24) break;
  }
  return out.length ? out : [{ c: 'A', v: 'a', cls: 'none' }];
};
A.F = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
A.speak = (game, line, who, o = {}) => {
  const prof = (KC.DATA.roster[who] && KC.DATA.roster[who].voice) || { f0: 180, formant: 1, rate: 14, wave: 'pulse', rough: 0 };
  const syl = A.syllables(line);
  const rate = o.rate || prof.rate;
  const dur = Math.max(0.35, syl.length / rate + 0.15);
  const ctx = game && game.audio && game.audio.ctx;
  if (!ctx || KC.TOGGLES.mute || !game.audio.ready) return dur;
  const t0 = ctx.currentTime + 0.02;
  const vol = (game.audio.voiceVolume !== undefined ? game.audio.voiceVolume : 0.5) * 0.25;
  syl.forEach((s, i) => {
    const t = t0 + i / rate;
    const f0 = prof.f0 * (1 + ((KC.hash(s.c + s.v + i) % 7) - 3) * 0.02);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = prof.wave === 'saw' ? 'sawtooth' : prof.wave === 'tri' ? 'triangle' : prof.wave === 'square' ? 'square' : 'sawtooth';
    osc.frequency.value = f0;
    const [f1, f2] = A.F[s.v.toLowerCase()] || [700, 1200];
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1 * prof.formant; bp.Q.value = 4;
    const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = f2 * prof.formant; bp2.Q.value = 6;
    const mix = ctx.createGain(); mix.gain.value = 0.7;
    osc.connect(bp); osc.connect(bp2); bp.connect(mix); bp2.connect(mix); mix.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    osc.start(t); osc.stop(t + 0.14);
  });
  return dur;
};
// the referee's calls: slower and louder, with the stress set per call
A.callSyllables = { begin: 3, stop: 2, white: 2, red: 2, half: 3, full: 3, nopoint: 3, aiuchi: 3, time: 2, judges: 3, whiteWins: 4, redWins: 4, bow: 2, decide: 4, matchPoint: 4, forfeit: 3 };

// ---- src/40-scenes.js
// ---------------------------------------------------------------- the save, the records and the story state
// the engine's store keeps the save in the browser; where it has no storage (Node tests) a memory copy keeps the run going
KC.mem = {};
KC.store = {
  get(k, fb) { const v = E.store.get(k, null); if (v !== null && v !== undefined) return v; return Object.prototype.hasOwnProperty.call(KC.mem, k) ? KC.mem[k] : fb; },
  set(k, v) { KC.mem[k] = JSON.parse(JSON.stringify(v)); E.store.set(k, v); return true; },
  remove(k) { delete KC.mem[k]; E.store.remove(k); }
};
KC.save = {
  load() { return KC.store.get('kc:save', null); },
  write(d) { KC.store.set('kc:save', d); },
  clear() { KC.store.remove('kc:save'); }
};
KC.records = {
  get() { return KC.store.get('kc:records', null) || { story: [], boards: [], pots: [], bull: [] }; },
  add(table, name, score, rank) {
    const r = this.get(); const list = r[table] || (r[table] = []);
    list.push({ name: name || 'TARO', score: Math.round(score), rank: rank || '' });
    list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, 10);
    KC.store.set('kc:records', r);
  },
  qualifies(table, score) { const l = this.get()[table] || []; return l.length < 10 || score > l[l.length - 1].score; }
};
KC.unlocked = (id) => {
  if (KC.TOGGLES.unlockAll) return true;
  if (id === 'kyabetsu') return KC.records && (KC.save.load() || {}).node >= KC.DATA.ladder.findIndex(n => n.id === 'kyabetsu');
  if (id === 'mei') return (KC.save.load() || {}).finished === true;
  return true;
};

// ---------------------------------------------------------------- the factories that need the game (set in 90-start)
KC.makeScenes = (game) => {
  const S = {};
  const talk = new E.Dialog(game);
  KC.talk = talk;
  const INPUT = KC.INPUT;
  const dt = () => 1 / 120;
  const fightState = { cur: null };
  let cutQueue = null, cutDone = null;
  const pickedW = { id: 'taro' };
  const cfg = { p2: 'cpu', stage: 'dojo', rounds: 2 };
  const touchOnly = () => {
    const mq = game.window && game.window.matchMedia;
    const coarse = mq ? mq('(any-pointer: fine)').matches === false : false;
    return coarse && (navigator.maxTouchPoints > 0) && !game.input.anyPressed && false;
  };
  const sayRig = (k, side) => (KC.rigs && KC.rigs[k]) || (KC.rigs = KC.rigs || {}, KC.rigs[k] = V_rig(k, side));
  const V_rig = (k, side) => KC.View.rigFor(k, side);
  S.talk = talk;

  // ------------------------------------------------ title and main menu
  const menuItems = () => {
    const save = KC.save.load();
    return [
      save && ['CONTINUE', () => game.go('road', { resume: true })],
      ['CHAMPON ROAD', () => { KC.save.write(Object.assign({ node: 0, rank: 0, score: 0, finished: false }, save && save.finished ? { finished: true } : {})); game.go('road', { fresh: true }); }],
      ['VERSUS', () => game.go('versus')],
      ['DOJO', () => game.go('dojo')],
      ['BONUS GAMES', () => game.go('bonusMenu')],
      ['RECORDS', () => game.go('records')],
      ['OPTIONS', () => game.menu('settings')],
      ['ABOUT', () => game.go('about')]
    ].filter(Boolean);
  };
  S.title = {
    pausable: false,
    enter() { this.idle = 0; this.blink = 0; this.menu = new E.Menu(game, menuItems().map(i => i[0]), { x: 'center', y: 118, onPick: (i) => menuItems()[i][1](), onCancel() { } }); KC.A.music(game, 'title'); this.rigs = { t: KC.View.rigFor('taro', 'w'), m: KC.View.rigFor('mei', 'r') }; this.bg = V_bg(); this.phase = 0; },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.anyPressed() && game.input.lastDevice !== 'touch') KC.inputSeen = true;
      KC.updateTouchGate();
      this.phase += d;
      const any = game.input.anyPressed() || game.input.pointer() && game.input.clicked();
      if (any) this.idle = 0; else this.idle += d;
      if (this.idle > 10) return game.go('attract');
      if (KC.touchGate) return;
      this.menu.update(d);
      this.menu.y = 118;
      const n = this.menu.items ? this.menu.items.length : 0;
      // the items are rebuilt on enter; keep the list in step with the save
    },
    draw(r) {
      this.bg.draw(r);
      const floor = Math.round(r.w(0, 0, 0)[1]);
      r.overlay(g => E.px.rect(g, 0, floor, r.W, r.H - floor, '#2a1a10'));
      this.rigs.t.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0, pose: 'kneel' });
      r.actor(-30, 0, 0, (g, ox, oy) => this.rigs.t.draw(g, ox, oy, r.view));
      r.actor(430, 0, 0, (g, ox, oy) => this.rigs.m.draw(g, ox, oy, r.view));
      r.overlay(g => {
        E.font.title(g, 'KARATE', r.W / 2, 22, { scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 3, depthColor: '#6a2a1a', align: 'center', outline: '#1a0c10' });
        E.font.title(g, 'CHAMPON', r.W / 2, 54, { scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3, depthColor: '#6a2a1a', align: 'center', outline: '#1a0c10' });
        if (KC.touchGate) E.font.text(g, KC.TEXT.touchGate, r.W / 2, r.H / 2, '#ffe08a', { align: 'center', outline: '#0b0814', scale: 2 });
        if (!KC.touchGate && Math.floor(this.phase * 2) % 2 === 0) E.font.text(g, 'PRESS START', r.W / 2, r.H - 60, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'v' + KC.VERSION + ' - ENGINE ' + (E.version || ''), 6, r.H - 10, '#8a84a0', { outline: false });
      });
      if (!KC.touchGate) r.overlay(g => { this.menu.draw(r); });
    }
  };
  const V_bg = () => new E.Backdrop({ sky: ['#120b1e', '#3a1a2a', '#8a3a24'], moon: { x: 0.7, y: 0.25, r: 12, color: '#f8e0c0' }, stars: 24, starsY: 0.6 });
  S.title.menuRefresh = () => { };

  // ------------------------------------------------ the attract loop: cheating, showcase bouts, a how-to card, the scores (13)
  // the attract loop (13): an exhibition bout (CPUs, cheating allowed), a bonus reel, a how-to card and the scores, then the title
  S.attract = {
    pausable: false,
    enter() { this.loop = 0; this.phase = 'bout'; this.t = 0; KC.A.music(game, 'dojo'); this.startBout(); },
    startBout() {
      const ids = KC.DATA.playableIds;
      const seed = 1000 + this.loop * 17;
      const R = E.rng(seed);
      const a = ids[Math.floor(R() * ids.length)];
      const b = ids.filter(x => x !== a)[Math.floor(R() * (ids.length - 1))];
      const stageIds = Object.keys(KC.DATA.stages);
      this.stage = KC.DATA.stages[stageIds[Math.floor(R() * stageIds.length)]];
      this.w = new KC.Karateka({ id: a, side: 'w' }); this.r = new KC.Karateka({ id: b, side: 'r' });
      this.rigs = { w: KC.View.rigFor(a, 'w'), r: KC.View.rigFor(b, 'r') };
      this.aiW = new KC.KarateAI(this.w, seed + 1, { level: 6, noOverride: true }); this.aiR = new KC.KarateAI(this.r, seed + 2, { level: 6, noOverride: true });
      this.bout = new KC.Bout({ white: this.w, red: this.r, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
      this.boutT = 0;
    },
    next(to) { this.phase = to; this.t = 0; },
    update(d) {
      if (game.input.anyPressed()) return game.go('title');
      game.focus(200, 0, 30);
      this.t += d;
      if (this.phase === 'bout') {
        this.boutT += d;
        const iA = this.aiW.intent(this.r, d), iB = this.aiR.intent(this.w, d);
        this.bout.step(d, { a: () => iA, b: () => iB });
        KC.stepPoses({ w: this.w, r: this.r, rigs: this.rigs }, d);
        if ((this.bout.phase === 'matchEnd' && this.bout.phaseT > this.bout.phaseLen) || this.boutT > 45) this.next('reel');
      } else if (this.phase === 'reel') {
        if (this.t > 8) this.next('howto');
      } else if (this.phase === 'howto') {
        if (this.t > 8) this.next('scores');
      } else if (this.phase === 'scores') {
        if (this.t > 6) { this.loop++; return game.go('title', { attract: true }); }
      }
    },
    draw(r) {
      if (this.phase === 'bout') {
        const st = this.stage || KC.DATA.stages.dojo;
        V_stage(r, st, game.time);
        KC.View.drawFighters(r, [this.w, this.r], { w: this.rigs.w, r: this.rigs.r });
        KC.View.hud(r, this.bout, { bottom: 'DEMO · PRESS START' });
        return;
      }
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      r.overlay(g => {
        if (this.phase === 'reel') {
          E.font.title(g, 'BONUS STAGE! BREAK THE BOARDS!', r.W / 2, r.H * 0.3, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          for (let k = 0; k < 5; k++) E.px.rect(g, r.W / 2 - 40 + k * 10, r.H * 0.5 - 30, 8, 40, k < 4 ? '#8a6038' : '#d8b080');
          E.font.text(g, 'PERFECT! 3000', r.W / 2, r.H * 0.75, '#ffe08a', { align: 'center', outline: '#0b0814' });
        } else if (this.phase === 'howto') {
          E.font.title(g, 'HOW TO FIGHT', r.W / 2, 30, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          E.font.text(g, 'LEFT STICK: MOVE AND POSTURE', r.W / 2, r.H * 0.35, '#fff6d0', { align: 'center', outline: '#0b0814' });
          E.font.text(g, 'RIGHT STICK: THE TECHNIQUE', r.W / 2, r.H * 0.35 + 22, '#fff6d0', { align: 'center', outline: '#0b0814' });
          E.font.text(g, 'FIRST TO 2 POINTS WINS THE ROUND', r.W / 2, r.H * 0.35 + 44, '#ffe08a', { align: 'center', outline: '#0b0814' });
        } else if (this.phase === 'scores') {
          E.font.title(g, 'HIGH SCORES', r.W / 2, 30, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          const top = (KC.records.get().story || []).slice(0, 3);
          if (!top.length) E.font.text(g, 'NO SCORES YET', r.W / 2, r.H * 0.5, '#fff6d0', { align: 'center', outline: '#0b0814' });
          top.forEach((e, i) => E.font.text(g, (i + 1) + '. ' + e.name + '  ' + String(e.score).padStart(7, '0'), r.W / 2, r.H * 0.4 + i * 18, '#fff6d0', { align: 'center', outline: '#0b0814' }));
        }
        E.font.text(g, 'DEMO · PRESS ANY BUTTON', r.W / 2, r.H - 16, '#a9a1c8', { align: 'center', outline: '#0b0814', font: 'tiny' });
      });
    }
  };

  // ------------------------------------------------ the fight (story, versus, attract, drills' free spar)
  S.fight = {
    pausable: true,
    enter(data) {
      const F = fightState.cur = fightState.cur && data && data.resume ? fightState.cur : KC.startFight(data || {});
      this.F = F;
      // the camera setting: the arcade side view, or the tatami 2.5D view (the engine's brawler view)
      game.setView(game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
      KC.A.music(game, F.stage.music);
    },
    update(d) {
      const F = this.F;
      if (!F || !F.bout) return;
      if (talk.update(d)) return;
      if (F.stopped) return;
      // a human plays the fighter it controls; a CPU plays the other
      const dirA = F.w.x < F.r.x ? 1 : -1;
      const iA = F.cpuW ? F.aiW.intent(F.r, d) : KC.readControl(game.input, dirA, F.prevW);
      const dirB = F.r.x < F.w.x ? 1 : -1;
      const iB = F.cpuR ? F.aiR.intent(F.w, d) : KC.readControl(F.p2Input || game.input, dirB, F.prevR);
      if (game.paused) return;
      F.bout.step(d, { a: () => iA, b: () => iB });
      KC.stepPoses(F, d);
      F.t += d;
      if (F.popup && F.popup.t > 0) F.popup.t -= d;
      if (F.bout.matchOver !== null && F.bout.phase === 'matchEnd' && F.bout.phaseT > F.bout.phaseLen - 0.01) {
        F.stopped = true; KC.endFight(F);
      }
      if (F.mode === 'attract' && game.input.anyPressed()) return game.go('title');
    },
    draw(r) {
      const F = this.F; if (!F) return;
      V_stage(r, F.stage, game.time);
      r.actor(200, 14, 0, (g, ox, oy) => F.judge.draw(g, ox, oy, r.view));
      KC.View.drawFighters(r, [F.w, F.r], { w: F.rigs.w, r: F.rigs.r });
      const hint = KC.TUNE.gameSpeed !== 1 ? 'SPEED ' + KC.TUNE.gameSpeed.toFixed(2) : null;
      KC.View.hud(r, F.bout, { popup: F.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, F.popup) : null, bottom: F.hint || hint });
      talk.draw(r);
    }
  };

  // ------------------------------------------------ the Champon Road: the ladder, with its stops and the next one (8.3)
  S.road = {
    pausable: false,
    enter(data) {
      if (data && data.advance) KC.advanceNode();
      const save = KC.save.load() || { node: 0, rank: 0, score: 0 };
      this.save = save; this.sel = Math.min(save.node || 0, KC.DATA.ladder.length - 1);
      KC.A.music(game, 'select');
      this.menu = null;
    },
    update(d) {
      if (talk.update(d)) return;
      const L = KC.DATA.ladder, save = this.save;
      if (game.input.pressed('left') || game.input.pressed('up')) { this.sel = Math.max(0, this.sel - 1); KC.A.sfx(game, 'menuMove'); }
      if (game.input.pressed('right') || game.input.pressed('down')) { this.sel = Math.min(save.node, this.sel + 1); KC.A.sfx(game, 'menuMove'); }
      if (game.input.pressed('confirm') || game.input.clicked()) {
        const node = L[save.node];
        if (!node) return game.go('ending');
        KC.A.sfx(game, 'menuOk');
        KC.startNode(save.node);
      }
      if (game.input.pressed('cancel')) game.go('title');
    },
    draw(r) {
      const L = KC.DATA.ladder, save = this.save || { node: 0 };
      r.sky(['#1a0c10', '#3a1820', '#6a2a1e']);
      r.overlay(g => {
        E.font.title(g, 'CHAMPON ROAD', r.W / 2, 14, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        // the road: one row of stops
        const x0 = 14, x1 = r.W - 14, step = (x1 - x0) / (L.length - 1), y = r.H / 2 - 8;
        E.px.rect(g, x0, y, x1 - x0, 3, '#8a6a4a');
        L.forEach((n, i) => {
          const x = Math.round(x0 + i * step);
          const done = i < save.node, cur = i === save.node;
          const col = done ? '#ffd060' : (cur ? '#ffffff' : '#4a3a4a');
          E.px.disc(g, x, y + 1, cur ? 6 : 4, '#15121e'); E.px.disc(g, x, y + 1, cur ? 5 : 3, col);
          if (cur && Math.floor(game.time * 3) % 2) E.px.disc(g, x, y + 1, 9, '#ffffff33');
          if (i === this.sel) E.px.rect(g, x - 1, y - 10, 3, 3, '#ffe08a');
        });
        const node = L[save.node];
        const label = node ? node.title : 'THE END';
        E.ui.box(g, r.W / 2 - 150, r.H - 84, 300, 50, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'NEXT: ' + label, r.W / 2, r.H - 76, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(save.score || 0).padStart(7, '0') + '   ' + KC.DATA.belts[KC.DATA.beltOrder[Math.min(9, save.rank || 0)]].name, r.W / 2, r.H - 50, '#e8e0c8', { align: 'center', outline: '#0b0814' });
        KC.prompt(g, r.W / 2 - 60, r.H - 18, [['cross', 'GO'], ['circle', 'TITLE']]);
      });
    }
  };

  // ------------------------------------------------ cutscenes: each [speaker, text] line is a page of the dialog (7.7)
  const playLines = (lines, done) => {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { return done && done(); }
      const [who, text] = lines[i++];
      if (who === 'CARD' || (text === null && who)) { KC.card(game, who, text, next); return; }
      const k = who === 'TARO' ? 'taro' : who === 'NEGI' ? 'negi' : who === 'MEI' ? 'mei' : who === 'GENKOTSU' ? 'genkotsu' : null;
      const rig = k ? KC.View.rigFor(k, k === 'mei' ? 'r' : 'w') : null;
      const text2 = text === null ? (who || '') : text;
      talk.say(text2, { name: who && text !== null ? who : undefined, portrait: rig || undefined, onDone: next });
    };
    next();
  };
  KC.playLines = playLines;
  S.cutscene = {
    pausable: false,
    enter(data) {
      this.script = data.script; this.node = data.node;
      KC.A.music(game, 'dojo');
      const lines = KC.TEXT[this.script] || [];
      playLines(lines, () => game.go('road', { resume: true, advance: true }));
    },
    update(d) { talk.update(d); },
    draw(r) { r.sky(['#101828', '#2a2a40', '#4a3a40']); talk.draw(r); }
  };

  // ------------------------------------------------ the continue, the game over and the initials (8.7)
  S.continue = {
    pausable: false,
    enter(data) { this.left = 10; this.data = data; KC.A.music(game, 'continue'); },
    update(d) {
      this.left -= d;
      if (game.input.pressed('confirm')) { KC.A.sfx(game, 'menuOk'); return KC.startNode(this.data.node, { retry: true }); }
      if (game.input.pressed('cancel') || this.left <= 0) return game.go('gameover', this.data);
    },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'CONTINUE?', r.W / 2, r.H / 2 - 60, { scale: 3, colors: ['#fffbe8', '#ff8a6a'], depth: 3, depthColor: '#5a1a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, String(Math.ceil(Math.max(0, this.left))), r.W / 2, r.H / 2 - 4, '#ffffff', { align: 'center', scale: 4, outline: '#0b0814' });
        E.font.text(g, KC.TEXT.continueLine, r.W / 2, r.H / 2 + 46, '#ffe08a', { align: 'center', outline: '#0b0814', scale: 2 });
        KC.prompt(g, r.W / 2 - 60, r.H - 18, [['cross', 'CONTINUE'], ['circle', 'GIVE UP']]);
      });
    }
  };
  S.gameover = {
    pausable: false,
    enter(data) { this.data = data; this.t = 0; KC.A.music(game, 'gameover', { loop: false }); },
    update(d) {
      this.t += d;
      if (this.t > 2.2 && (game.input.pressed('confirm') || this.t > 6)) {
        const sc = this.data.score || 0;
        if (KC.records.qualifies('story', sc)) return game.go('initials', { table: 'story', score: sc, rank: KC.DATA.beltOrder[this.data.rank || 0] });
        return game.go('title');
      }
    },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 3, depthColor: '#3a0810', align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.gameOverLine, r.W / 2, r.H / 2 + 22, '#e8e0c8', { align: 'center', outline: '#0b0814', scale: 2 });
      });
    }
  };
  // the initials: a letter wheel per slot, three slots (E.Arcade's rules, simplified)
  S.initials = {
    pausable: false,
    enter(data) { this.data = data; this.letters = [0, 0, 0]; this.slot = 0; KC.A.music(game, 'title'); },
    update(d) {
      const L = this.letters;
      if (game.input.pressed('up')) L[this.slot] = (L[this.slot] + 25) % 26;
      if (game.input.pressed('down')) L[this.slot] = (L[this.slot] + 1) % 26;
      if (game.input.pressed('confirm')) { if (this.slot < 2) this.slot++; else { KC.records.add(this.data.table, this.name(), this.data.score, this.data.rank); return game.go('title'); } }
      if (game.input.pressed('cancel') && this.slot > 0) this.slot--;
    },
    name() { return this.letters.map(i => String.fromCharCode(65 + i)).join(''); },
    draw(r) {
      r.sky(['#06040c', '#14101e', '#2a1a20']);
      r.overlay(g => {
        E.font.title(g, 'NEW RECORD!', r.W / 2, 40, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(this.data.score).padStart(7, '0'), r.W / 2, 96, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        for (let k = 0; k < 3; k++) {
          const x = r.W / 2 - 40 + k * 40, y = r.H / 2;
          E.ui.box(g, x - 14, y - 22, 26, 36, { bg: k === this.slot ? ['#4a3a1a', '#2a1a0a'] : ['#1a1428', '#0e0a18'], border: k === this.slot ? '#ffd060' : '#4a3a5a' });
          E.font.text(g, String.fromCharCode(65 + this.letters[k]), x, y - 10, '#ffffff', { align: 'center', scale: 3, outline: '#0b0814' });
        }
        E.font.text(g, 'UP/DOWN LETTER · CROSS NEXT', r.W / 2, r.H - 26, '#a9a1c8', { align: 'center', outline: '#0b0814' });
      });
    }
  };

  // ------------------------------------------------ the versus setup (9): fighters, a second player on the keyboard, the stage, Kachinuki
  S.versus = {
    pausable: false,
    enter() {
      this.stageIds = Object.keys(KC.DATA.stages); this.stageI = 0;
      this.p1 = 0; this.p2 = 1; this.mode = 'cpu'; this.seats = 2;
      this.menu = new E.Menu(game, [], { x: 'center', y: 96, onPick: (i) => this.pick(i), onCancel: () => game.go('title') });
      this.rebuild();
      KC.A.music(game, 'select');
    },
    rebuild() {
      const ids = KC.DATA.playableIds.filter(id => KC.unlocked(id));
      const pick = (idx) => KC.DATA.roster[ids[idx % ids.length]].name;
      this.ids = ids;
      this.menu.items = [
        'P1: ' + pick(this.p1), 'P2: ' + (this.mode === 'keys' ? 'KEYBOARD' : (this.mode === 'pad' ? 'PAD 1' : 'CPU ' + pick(this.p2))),
        'MODE: ' + (this.mode === 'kach' ? 'KACHINUKI ' + this.seats : (this.mode === 'keys' ? 'VERSUS 2P KEYBOARD' : (this.mode === 'pad' ? 'VERSUS 2P PAD' : 'VERSUS 1P'))),
        'STAGE: ' + KC.DATA.stages[this.stageIds[this.stageI]].name, 'START', 'BACK'
      ];
    },
    pick(i) {
      const ids = this.ids;
      if (i === 0) { this.p1 = (this.p1 + 1) % ids.length; }
      if (i === 1) { if (this.mode === 'keys') { this.mode = 'cpu'; } else { this.p2 = (this.p2 + 1) % ids.length; if (this.p2 === this.p1) this.p2 = (this.p2 + 1) % ids.length; } }
      if (i === 2) { const order = ['cpu', 'keys', 'pad', 'kach']; this.mode = order[(order.indexOf(this.mode) + 1) % 3]; this.seats = this.seats === 4 ? 3 : 4; if (this.mode !== 'kach') this.seats = 2; }
      if (i === 3) this.stageI = (this.stageI + 1) % this.stageIds.length;
      if (i === 4) {
        KC.A.sfx(game, 'menuOk');
        const st = KC.DATA.stages[this.stageIds[this.stageI]].id;
        if (this.mode === 'kach') return game.go('kach', { seats: this.seats, stage: st, roster: [ids[this.p1]].concat(this.others()) });
        return game.go('fight', Object.assign(KC.versusData(ids[this.p1], ids[this.p2], KC.DATA.stages[st], this.mode === 'keys' ? 'keys' : (this.mode === 'pad' ? 'pad' : 'cpu')), {}));
      }
      if (i === 5) return game.go('title');
      this.rebuild();
    },
    others() { const ids = this.ids; const out = []; for (let k = 1; k < this.seats; k++) out.push(ids[(this.p2 + k - 1) % ids.length]); return out; },
    update(d) { this.menu.update(d); },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      r.overlay(g => {
        E.font.title(g, 'VERSUS', r.W / 2, 14, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        this.ids.forEach((id, i) => {
          const x = 20 + (i % 5) * 62, y = 230 + Math.floor(i / 5) * 36;
          const on = i === this.p1 || i === this.p2;
          E.ui.box(g, x, y, 56, 30, { bg: ['#3a2a4a', '#1a1028'], border: on ? '#ffd060' : '#4a3a5a' });
          E.font.text(g, KC.DATA.roster[id].short, x + 28, y + 10, '#fff6d0', { align: 'center', outline: '#0b0814', font: 'tiny' });
        });
      });
      this.menu.draw(r);
    }
  };
  KC.versusData = (w, r, st, p2) => ({ mode: 'versus', w, r, stage: st.id, roundsToWin: 2, pointsToWin: KC.TUNE.pointsToWin, cpuW: false, cpuR: (p2 || 'cpu') === 'cpu', p2: p2 || 'cpu' });

  // ------------------------------------------------ the dojo: lessons and free spar (7.5), and the move list (8.6)
  S.dojo = {
    pausable: false,
    enter() {
      this.menu = new E.Menu(game, ['LESSON I', 'LESSON II', 'LESSON III', 'ALL TECHNIQUES', 'FREE SPAR', 'MOVE LIST', 'BACK'], {
        x: 'center', y: 90, onPick: (i) => {
          if (i < 4) return KC.startPractice(['I', 'II', 'III', 'ALL'][i]);
          if (i === 4) return game.go('fight', { mode: 'freeSpar', w: 'taro', r: 'kamaboko', stage: 'dojo', cpuR: true, cpuW: false, dummy: true });
          if (i === 5) return game.go('moveList', { back: 'dojo' });
          return game.go('title');
        }, onCancel: () => game.go('title')
      });
      KC.A.music(game, 'practice');
    },
    update(d) { this.menu.update(d); },
    draw(r) { r.sky(['#2a1a10', '#4a2a18', '#7a4a28']); r.overlay(g => E.font.title(g, 'DOJO', r.W / 2, 30, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' })); this.menu.draw(r); }
  };
  S.moveList = {
    pausable: false,
    enter(data) { this.back = data && data.back || 'title'; this.posture = 0; this.stick = 0; this.postures = ['n', 't', 'a', 'u', 'd']; this.sticks = ['u', 't', 'd', 'a']; this.prev = null; this.t = 0; },
    update(d) {
      if (game.input.pressed('cancel')) return game.go(this.back);
      if (game.input.pressed('up')) this.posture = (this.posture + 4) % 5;
      if (game.input.pressed('down')) this.posture = (this.posture + 1) % 5;
      if (game.input.pressed('left')) this.stick = (this.stick + 3) % 4;
      if (game.input.pressed('right')) this.stick = (this.stick + 1) % 4;
      this.t += d;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const p = this.postures[this.posture], s = this.sticks[this.stick];
      const id = KC.DATA.matrix[p] && KC.DATA.matrix[p][s] || null;
      const T = id && KC.DATA.techniques[id];
      r.overlay(g => {
        E.font.title(g, 'MOVE LIST', r.W / 2, 12, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const names = { n: 'STAND', t: 'WALK IN', a: 'WALK BACK', u: 'JUMP', d: 'CROUCH' };
        E.font.text(g, 'LEFT STICK: ' + names[p], r.W / 2, 56, '#ffe08a', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, 'UP/DOWN: POSTURE   LEFT/RIGHT: TECHNIQUE', r.W / 2, 82, '#a9a1c8', { align: 'center', outline: '#0b0814' });
        const cx = r.W / 2, cy = r.H / 2 + 40;
        ['u', 't', 'd', 'a'].forEach((k, i) => {
          const on = k === s, ox = [0, 56, 0, -56][i], oy = [-40, 0, 40, 0][i];
          E.ui.box(g, cx + ox - 46, cy + oy - 12, 92, 24, { bg: on ? ['#5a3a1a', '#2a1a0a'] : ['#1a1428', '#0e0a18'], border: on ? '#ffd060' : '#4a3a5a' });
          const id2 = KC.DATA.matrix[p] && KC.DATA.matrix[p][k];
          E.font.text(g, id2 ? KC.DATA.techniques[id2].name.slice(0, 16) : '-', cx + ox, cy + oy - 4, '#fff6d0', { align: 'center', outline: '#0b0814', font: 'tiny' });
        });
        if (T) {
          E.font.text(g, T.name, r.W / 2, r.H - 52, '#fffbe8', { align: 'center', scale: 2, outline: '#0b0814' });
          E.font.text(g, T.pts ? (T.pts[0] + '-' + T.pts[1] + (T.pts[1] >= 600 ? '  · FULL POINT' : '  · HALF POINT')) : 'DEFENCE', r.W / 2, r.H - 30, '#a9a1c8', { align: 'center', outline: '#0b0814' });
        }
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['circle', 'BACK']]);
      });
    }
  };

  // ------------------------------------------------ records and the about screen (8.8, 8.11)
  S.records = {
    pausable: false,
    enter() { this.tab = 0; this.tabs = ['story', 'boards', 'pots', 'bull']; },
    update(d) {
      if (game.input.pressed('cancel')) return game.go('title');
      if (game.input.pressed('right')) this.tab = (this.tab + 1) % 4;
      if (game.input.pressed('left')) this.tab = (this.tab + 3) % 4;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const list = KC.records.get()[this.tabs[this.tab]] || [];
      r.overlay(g => {
        E.font.title(g, 'RECORDS', r.W / 2, 12, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, this.tabs[this.tab].toUpperCase() + '  ← →', r.W / 2, 46, '#ffe08a', { align: 'center', outline: '#0b0814' });
        for (let i = 0; i < 10; i++) {
          const e = list[i], y = 66 + i * 14;
          E.font.text(g, (i + 1) + '.', r.W / 2 - 110, y, '#a9a1c8', { outline: false, scale: 1 });
          E.font.text(g, e ? e.name : '---', r.W / 2 - 90, y, '#fff6d0', { outline: false });
          E.font.text(g, e ? String(e.score).padStart(7, '0') : '0000000', r.W / 2 + 10, y, '#fff6d0', { outline: false });
          if (e && e.rank) E.font.text(g, e.rank, r.W / 2 + 80, y, '#ffb8a8', { outline: false, font: 'tiny' });
        }
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['circle', 'BACK']]);
      });
    }
  };
  S.about = {
    pausable: false,
    enter() { this.page = 0; this.pages = KC.aboutPages(); },
    update(d) {
      if (game.input.pressed('cancel')) return game.go('title');
      if (game.input.pressed('confirm') || game.input.pressed('right')) { this.page = (this.page + 1) % this.pages.length; }
      if (game.input.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const P = this.pages[this.page];
      r.overlay(g => {
        E.font.title(g, P.title, r.W / 2, 10, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        // every line wrapped to the screen, then set down in order (no overlap), up to the bottom bar
        let y = 40;
        for (const ln of P.lines) for (const part of E.font.wrap(ln, r.W - 24, {})) { if (y < r.H - 40) E.font.text(g, part, 12, y, '#fff6d0', { outline: false }); y += 13; }
        E.font.text(g, (this.page + 1) + '/' + this.pages.length, r.W - 10, r.H - 12, '#a9a1c8', { align: 'right', outline: false });
        KC.prompt(g, r.W / 2 - 60, r.H - 14, [['cross', 'NEXT'], ['circle', 'BACK']]);
      });
    }
  };
  S.ending = {
    pausable: false,
    enter() { this.t = 0; KC.A.music(game, 'ending'); playLines(KC.TEXT.ending, () => { this.credits = true; }); },
    update(d) { this.t += d; talk.update(d); if (this.credits && (game.input.pressed('confirm') || this.t > 60)) return game.go('title'); },
    draw(r) { r.sky(['#101828', '#2a2a40', '#4a3a40']); talk.draw(r); if (this.credits) r.overlay(g => { E.font.title(g, 'CREDITS', r.W / 2, 30, { scale: 3, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' }); E.font.text(g, 'CHAMPON, FIGHTERS AND CREW', r.W / 2, 80, '#fff6d0', { align: 'center', outline: '#0b0814' }); }); }
  };

  return S;
};

// ---------------------------------------------------------------- what the scenes share
KC.stepPoses = (F, d) => {
  const w = F.w || F.a, r = F.r || F.b;
  const rw = F.rigs.w || F.rigsW, rr = F.rigs.r || F.rigsR;
  if (rw) KC.View.applyPose(rw, w.poseState(), d);
  if (rr) KC.View.applyPose(rr, r.poseState(), d);
};
KC.prompt = (g, x, y, items) => {
  let cx = x;
  const XB = { cross: 'A', circle: 'B', square: 'X', triangle: 'Y' };
  for (const [icon, label] of items) {
    const dev = KC.device();
    const xbox = dev === 'gamepad' && KC.game.input.padStyle && KC.game.input.padStyle() === 'xbox';
    const ic = dev === 'keyboard' || dev === 'mouse' ? { cross: 'Enter', circle: 'Esc', square: 'Q', triangle: 'E' }[icon] : (xbox ? XB[icon] : icon);
    if (xbox) { KC.glyph(g, cx + 5, y, ic, 9); E.font.text(g, label, cx + 14, y - 3, '#fff6d0', { outline: '#0b0814' }); cx += 14 + E.font.width(label, {}) + 12; continue; }
    const kw = dev === 'keyboard' ? Math.max(9, E.font.width(ic, { font: 'tiny' }) + 4) : 9;
    KC.glyph(g, cx + kw / 2, y, dev === 'keyboard' ? 'key:' + ic : ic, 9);
    E.font.text(g, label, cx + kw + 4, y - 3, '#fff6d0', { outline: '#0b0814' });
    cx += kw + 4 + E.font.width(label, {}) + 12;
  }
};
KC.device = () => (KC.game && KC.game.input && KC.game.input.lastDevice) || 'keyboard';
KC.card = (game, title, text, next) => { KC.cardText = text; KC.cardNext = next; game.after(2.2, () => next()); };
// the about pages: the Source Information, the feedback and the credits (from data/about.json)
KC.aboutPages = () => {
  const A = KC.ABOUT || {};
  const pagesFrom = (title, obj) => ({ title, lines: Object.keys(obj || {}).map(k => k.toUpperCase() + ': ' + String(obj[k])) });
  const pages = [];
  if (A.sourceInformation) pages.push(pagesFrom('SOURCE INFORMATION', A.sourceInformation));
  if (A.testingFeedback) pages.push({ title: 'TESTING FEEDBACK', lines: A.testingFeedback });
  if (A.engineFeedback) pages.push({ title: 'ENGINE FEEDBACK', lines: A.engineFeedback });
  if (A.promptFeedback) pages.push({ title: 'PROMPT FEEDBACK', lines: A.promptFeedback });
  pages.push({ title: 'CREDITS', lines: A.credits || ['KARATE CHAMPON', 'ENGINE: MY-3D2DGE 0.85.2', 'KENNEY AND KAYKIT ASSETS: CC0'] });
  return pages;
};
// the stage paint from the view module
const V_stage = (r, st, t) => KC.View.drawStage(r, st, t);
KC.StagePaint = V_stage;

// the fight: build a bout from the scene data (story, versus, attract, the free spar)
KC.startFight = (d) => {
  const wId = d.w || 'taro', rId = d.r || 'kamaboko';
  const w = new KC.Karateka({ id: wId, side: 'w' }), r = new KC.Karateka({ id: rId, side: 'r' });
  const seed = d.seed || (Math.floor(Math.random() * 1e6) + 1);
  const cpuW = !!d.cpuW, cpuR = d.cpuR !== false;
  const lvl = (k) => KC.TUNE.cpuLevel > 0 ? KC.TUNE.cpuLevel : (d.level || (KC.DATA.roster[k].ai ? KC.DATA.roster[k].ai.level : 3));
  const F = {
    mode: d.mode || 'story', w, r, stage: KC.DATA.stages[d.stage || 'dojo'], cpuW, cpuR, t: 0, seed,
    rigs: { w: KC.View.rigFor(wId, 'w'), r: KC.View.rigFor(rId, 'r') },
    judge: KC.View.rigFor('genkotsu', 'w', '#1d2b52'),
    aiW: new KC.KarateAI(w, seed + 11, { level: lvl(wId) }), aiR: new KC.KarateAI(r, seed + 23, { level: lvl(rId) }),
    prevW: {}, prevR: {}, popup: null, hint: null, p2Input: null, p2: d.p2 || 'cpu', node: d.node, onEnd: d.onEnd || null
  };
  F.bout = new KC.Bout({ white: w, red: r, seed, roundsToWin: d.roundsToWin || KC.TUNE.roundsToWin, pointsToWin: d.pointsToWin || KC.TUNE.pointsToWin, intro: d.intro !== false });
  F.bout.on('point', (p) => { F.popup = { t: 1.2, text: (p.full ? 'FULL' : 'HALF') + (p.counter ? ' COUNTER' : '') + ' · ' + KC.DATA.techniques[p.tech].name + ' ' + p.pts, color: p.full ? '#ffe070' : '#ffffff' }; KC.A.sfx(KC.game, p.full ? 'thwackFull' : 'thwackHalf'); if (p.full) KC.game.flash('#ffffff', 0.08); KC.game.shake(p.full ? 4 : 2); });
  F.bout.on('block', () => KC.A.sfx(KC.game, 'clack'));
  F.bout.on('call', (c) => { KC.A.sfx(KC.game, 'flagSnap'); if (c.text) KC.A.speak(KC.game, c.text, 'genkotsu'); });
  F.bout.on('fight', () => KC.A.sfx(KC.game, 'whistle'));
  F.bout.on('matchEnd', () => KC.A.sfx(KC.game, 'gong'));
  F.bout.on('roundEnd', () => KC.A.sfx(KC.game, 'gong'));
  F.bout.on('aiuchi', () => { F.popup = { t: 1, text: 'AIUCHI! NO POINT', color: '#ffffff' }; });
  F.bout.on('time', () => KC.A.sfx(KC.game, 'whistle'));
  F.bout.on('hantei', () => KC.A.sfx(KC.game, 'whistle'));
  F.hint = d.hint || null;
  return F;
};
// the match's end: the story goes to its next step; versus and attract go to their results
KC.endFight = (F) => {
  const win = F.bout.matchOver;
  if (F.onEnd) return F.onEnd(win, F);
  if (F.mode === 'story') return KC.storyMatchEnd(F, win);
  if (F.mode === 'versus') return KC.game.go('results', { winner: win, F: { points: F.bout.points, rounds: F.bout.rounds, stats: F.bout.stats } });
  if (F.mode === 'attract') return KC.game.go('title');
  return KC.game.go('dojo');
};
KC.storyMatchEnd = (F, win) => {
  const game = KC.game;
  const save = KC.save.load() || { node: 0, rank: 0, score: 0 };
  const node = KC.DATA.ladder[save.node];
  if (win === 0) {
    save.score = (save.score || 0) + F.w.score + (F.bout.stats[0].full * 100);
    if (F.bout.points[0] === F.bout.pointsToWin && F.bout.stats[1].full + F.bout.stats[1].half === 0) save.score += 5000;
    if (node && node.promote) { const bi = KC.DATA.beltOrder.indexOf(node.promote); save.rank = Math.max(save.rank || 0, bi); }
    save.node = Math.min(save.node + 1, KC.DATA.ladder.length);
    save.score += 1000 * (save.rank || 0);
    KC.save.write(save);
    return game.go('promotion', { node: save.node - 1, promote: node && node.promote, rank: save.rank });
  }
  KC.save.write(save);
  return game.go('continue', { node: save.node, score: save.score, rank: save.rank });
};
KC.startNode = (idx, o = {}) => {
  const game = KC.game, node = KC.DATA.ladder[idx];
  if (!node) return game.go('ending');
  if (node.kind === 'cutscene') return game.go('cutscene', { script: node.script, node: idx });
  if (node.kind === 'practice') return KC.startPractice(node.lesson, { story: true, node: idx });
  if (node.kind === 'bonus') return game.go('bonus', { kind: node.bonus, stage: node.stage, node: idx });
  if (node.kind === 'match') {
    const save = KC.save.load() || {};
    const data = { mode: 'story', w: 'taro', r: node.opponent, stage: node.stage, cpuR: true, cpuW: false, hint: node.hints ? KC.TEXT.hints[0] : null, node: idx, roundsToWin: 2 };
    return game.go('vs', { data, title: node.title });
  }
  return game.go('road');
};
// the story match after the VS card
KC.startMatchNode = (data) => game.go('fight', data);
KC.startPractice = (lessonId, o = {}) => game.go('practice', { lesson: lessonId, story: !!o.story, node: o.node });

// ---- src/50-scenes2.js
// ---------------------------------------------------------------- the rest of the flow: VS card, promotion, results, Senpai's drill, the three bonus stages (7.4, 7.5)
KC.makeScenes2 = (game, S, talk) => {
  const stageNode = (idx) => KC.DATA.ladder[idx];
  const advance = () => { const s = KC.save.load() || { node: 0, rank: 0, score: 0 }; s.node = (s.node || 0) + 1; KC.save.write(s); return s; };
  KC.advanceNode = advance;

  // the VS card before a story match: split panels, names, the stage and the taunt
  S.vs = {
    pausable: false,
    enter(data) { this.data = data.data; this.title = data.title; this.t = 0; KC.A.music(game, 'select'); },
    update(d) { this.t += d; if (this.t > 2.5 || game.input.pressed('confirm')) return game.go('fight', this.data); },
    draw(r) {
      r.sky(['#101018', '#20102a', '#0a0a14']);
      const opp = KC.DATA.roster[this.data.r];
      r.overlay(g => {
        E.px.rect(g, 0, 0, r.W / 2, r.H, '#f2eee4'); E.px.rect(g, r.W / 2, 0, r.W / 2, r.H, '#c8302a');
        E.font.title(g, 'VS', r.W / 2, r.H / 2 - 20, { scale: 4, colors: ['#fffbe8', '#ffe08a'], depth: 3, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'TARO', r.W / 4, r.H - 60, '#0b0814', { align: 'center', scale: 2, outline: false });
        E.font.text(g, opp.short, r.W * 3 / 4, r.H - 60, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        E.font.text(g, this.title || opp.name, r.W / 2, 14, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.DATA.stages[this.data.stage].name, r.W / 2, r.H - 30, '#fff6d0', { align: 'center', outline: '#0b0814' });
        E.font.text(g, '"' + opp.intro + '"', r.W / 2, r.H - 16, '#ffe08a', { align: 'center', outline: '#0b0814' });
      });
    }
  };

  // the promotion ceremony (7.7): the belt, a fanfare, the rank road
  S.promotion = {
    pausable: false,
    enter(data) { this.data = data; this.t = 0; KC.A.music(game, 'ending', { loop: false }); KC.A.sfx(game, 'gong'); this.belt = data.promote ? KC.DATA.belts[data.promote] : null; },
    update(d) { this.t += d; if (this.t > 3 || game.input.pressed('confirm')) { const s = KC.save.load(); return game.go('road', { resume: true }); } },
    draw(r) {
      r.sky(['#2a1a10', '#4a2a18', '#7a4a28']);
      r.overlay(g => {
        if (this.belt) {
          E.px.rect(g, r.W / 2 - 80, r.H / 2 - 30, 160, 10, this.belt.color);
          E.font.title(g, 'PROMOTED!', r.W / 2, r.H / 2 - 74, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
          E.font.text(g, this.belt.name, r.W / 2, r.H / 2 + 14, '#fff6d0', { align: 'center', scale: 2, outline: '#0b0814' });
        } else E.font.text(g, 'ON TO THE NEXT FIGHT', r.W / 2, r.H / 2, '#fff6d0', { align: 'center', outline: '#0b0814' });
        // the rank road: ten icons from white belt to champ
        for (let i = 0; i < 10; i++) {
          const x = 30 + i * 30, col = KC.DATA.belts[KC.DATA.beltOrder[i]].color, on = i <= (this.data.rank || 0);
          E.px.rect(g, x, r.H - 40, 22, 6, on ? col : '#2a2636');
        }
      });
    }
  };

  // the results of a versus match (8.4): the winner, the score lines, and the menu
  S.results = {
    pausable: false,
    enter(data) {
      this.winner = data.winner; this.F = data.F; this.menu = new E.Menu(game, ['REMATCH', 'CHARACTER SELECT', 'STAGE SELECT', 'MAIN MENU'], {
        x: 'center', y: 150, onPick: (i) => { if (i === 0) return game.go('fight', KC.versusData('taro', 'kamaboko', KC.DATA.stages.dojo)); if (i === 1 || i === 2) return game.go('versus'); return game.go('title'); }, onCancel: () => game.go('title')
      });
      KC.A.music(game, 'select');
    },
    update(d) { this.menu.update(d); },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const P = this.F && this.F.points || [0, 0], st = this.F && this.F.stats || [{}, {}];
      r.overlay(g => {
        E.font.title(g, (this.winner === 0 ? 'WHITE' : 'RED') + ' WINS', r.W / 2, 40, { scale: 3, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, 'POINTS ' + P[0] + ' – ' + P[1], r.W / 2, 90, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'FULL ' + (st[0].full || 0) + '  HALF ' + (st[0].half || 0) + '  BLOCKS ' + (st[0].blocks || 0), r.W / 2, 118, '#e8e0c8', { align: 'center', outline: '#0b0814' });
      });
      this.menu.draw(r);
    }
  };

  // Senpai's drill (7.5): watch, then do it. Three misses give a hint; success scores 200 (GOOD) or 400 (SHARP, within 50 frames)
  S.practice = {
    pausable: false,
    enter(data) {
      this.lesson = KC.DATA.lessons[data.lesson] || KC.DATA.lessons.I; this.story = !!data.story; this.node = data.node;
      this.idx = 0; this.points = 0; this.w = new KC.Karateka({ id: 'taro', side: 'w' }); this.s = new KC.Karateka({ id: 'negi', side: 'r' });
      this.w.x = 150; this.s.x = 250; this.s.facing = -1; this.w.facing = 1;
      this.rigs = { w: KC.View.rigFor('taro', 'w'), r: KC.View.rigFor('negi', 'r') };
      this.beginDrill(); KC.A.music(game, 'practice');
      this.hintOn = false;
    },
    // Senpai stands at the gap the drill's technique needs (the matrix reads the gap for a few of them)
    placeSenpai() { const gap = KC.DRILL_GAP[this.drill] || 22; this.w.x = 150; this.w.facing = 1; this.s.x = this.w.x + KC.BODY_W + gap; this.s.facing = -1; },
    beginDrill() {
      this.drill = this.lesson.drills[this.idx]; this.phase = 'watch'; this.t = 0; this.misses = 0; this.msg = KC.TEXT.drillWatch;
      this.demoDone = false; this.lastObj = null; this.sharp = false; this.crouchSeen = false;
      this.placeSenpai();
    },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.pressed('start')) { return this.nextDrill(false); }
      if (game.input.pressed('cancel') && false) return;
      this.t += d;
      let iW = KC.readControl(game.input, -1, this.prev = this.prev || {});
      // the autoplay (the tests' playthrough): the drill's own technique, once per attempt
      if (KC.autoPlay && this.phase === 'now' && !this.w.tech && this.autoFired !== this.idx + ':' + this.misses) {
        const inv = KC.DATA.inverse[this.drill]; this.autoFired = this.idx + ':' + this.misses;
        iW = inv ? { posture: inv.posture, tech: inv.stick } : null;
      }
      this.w.control(iW, this.s);
      this.s.intent = { posture: 'n', tech: null };
      if (this.phase === 'watch') {
        if (!this.demoDone && this.t > 0.3) { this.s.startTech(this.drill === 'block' ? 'block' : this.drill); this.demoDone = true; this.msg = KC.TEXT.drillWatch; }
        this.s.tick(d, this.w, false);
        if (this.demoDone && this.s.state !== 'tech' && this.t > 1.8) { this.s.reset(); this.placeSenpai(); this.phase = 'now'; this.t = 0; this.msg = KC.TEXT.drillNow; KC.A.sfx(game, 'countBeep'); }
      } else if (this.phase === 'now') {
        this.s.tick(d, this.w, false);
        this.w.tick(d, this.s, true);
        const pt = this.w.tech;
        if (this.drill === 'crouch' && this.w.crouch && !this.crouchSeen) {
          this.crouchSeen = true; this.sharp = this.t <= 50 / 120; this.score(this.sharp ? 400 : 200); this.msg = this.sharp ? KC.TEXT.drillSharp : KC.TEXT.drillGood; this.phase = 'good'; this.t = 0;
        } else if (pt && pt !== this.lastObj) {
          this.lastObj = pt;
          const ok = this.matchDrill(this.w, pt.id);
          if (ok) { this.sharp = this.t <= 50 / 120; this.score(this.sharp ? 400 : 200); this.msg = this.sharp ? KC.TEXT.drillSharp : KC.TEXT.drillGood; this.phase = 'good'; this.t = 0; }
          else { this.misses++; this.msg = KC.TEXT.drillNo; this.phase = 'bad'; this.t = 0; }
        } else if (this.matchDrill(this.w, null) && this.t > 0.1 && false) { }
        if (this.t > 4 && this.phase === 'now') { this.misses++; this.msg = KC.TEXT.drillNo; this.phase = 'bad'; this.t = 0; }
      } else if (this.phase === 'good') { this.w.tick(d, this.s, true); this.s.tick(d, this.w, false); if (this.t > 1.2) this.nextDrill(true); }
      else if (this.phase === 'bad') { this.w.tick(d, this.s, true); this.s.tick(d, this.w, false); if (this.t > 1.2) { this.phase = 'watch'; this.t = 0; this.demoDone = false; this.w.reset(); this.s.reset(); this.placeSenpai(); if (this.misses >= 3) this.hintOn = true; } }
      KC.stepPoses({ w: this.w, r: this.s, rigs: this.rigs }, d);
      this.rigsOk = true;
    },
    matchDrill(f, id) { return id === this.drill; },
    score(n) { this.points += n; const s = KC.save.load(); if (this.story && s) { s.score = (s.score || 0) + n; KC.save.write(s); } },
    nextDrill(skipped) {
      this.idx++;
      if (this.idx >= this.lesson.drills.length) {
        const endLine = this.lesson.id === 'I' ? KC.TEXT.lessonEnd : this.lesson.id === 'II' ? KC.TEXT.lessonIIEnd : KC.TEXT.lessonIIIEnd;
        this.done = true; this.msg = KC.TEXT.lessonEnd + ' ' + this.points;
        this.endLine = endLine;
        return this.finish();
      }
      this.w.reset(); this.s.reset();
      this.beginDrill();
    },
    finish() {
      this.finished = true; this.t = 0;
      if (this.story) { advance(); return game.go('road', { resume: true }); }
      return game.go('dojo');
    },
    draw(r) {
      const st = KC.DATA.stages[this.lesson.stage] || KC.DATA.stages.dojo;
      V_stage(r, st, game.time);
      KC.View.drawFighters(r, [this.w, this.s], { w: this.rigs.w, r: this.rigs.r });
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, 26, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'LESSON ' + this.lesson.id + '-' + (this.idx + 1) + ': ' + KC.DATA.techniques[this.drill].name, 12, 12, '#fff6d0', { outline: '#0b0814' });
        E.font.title(g, this.msg, r.W / 2, r.H * 0.3, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        if (this.hintOn) E.font.text(g, 'HOLD POSTURE, THEN PRESS THE RIGHT STICK', r.W / 2, r.H - 28, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, 'POINTS ' + this.points, r.W - 12, 40, '#ffe08a', { align: 'right', outline: '#0b0814' });
      });
    }
  };
  return S;
};

// ---- src/60-bonus.js
// ---------------------------------------------------------------- the bonus stages: boards, pots, the bull (7.4). Pure rules first (testable), then the scene.
KC.Bonus = {};
const B = KC.Bonus;

// BREAK THE BOARDS: hold to breathe in (the KI gauge rises, wobbling); release to chop. Power decides how many boards break.
B.boardsNew = (o = {}) => ({ n: o.n || 5, ki: 0, dir: 1, held: false, over: 0, phase: 'ready', result: null, t: 0, wob: 0, mult: o.mult || 1 });
B.boardsStep = (s, dt, held, speed = 1) => {
  s.t += dt;
  if (s.phase === 'ready') { if (held) { s.phase = 'breathe'; s.ki = 0; s.over = 0; } return s; }
  if (s.phase === 'breathe') {
    if (!held) { return B.boardsChop(s); }
    s.wob = Math.sin(s.t * 2.2 * Math.PI * 2) * 0.06;
    s.ki += (55 * KC.TUNE.kiSpeed * speed * dt) * (1 + s.wob);
    if (s.ki > 100) { s.over += dt; if (s.over > 0.3) { s.ki = 60; s.over = 0; s.tooMuch = true; } }
    else s.over = 0;
    return s;
  }
  if (s.phase === 'result') { s.resultT = (s.resultT || 0) + dt; }
  return s;
};
B.boardsChop = (s) => {
  const power = KC.clamp(s.ki, 0, 100);
  s.broken = Math.min(s.n, Math.floor(power / 100 * (s.n + 0.99)));
  s.perfect = power >= 95;
  s.phase = 'result'; s.resultT = 0;
  s.points = s.broken * 200 + (s.perfect ? 2000 : 0);
  return s;
};

// POTS AHOY! (Evade): 16 objects from both sides, the interval 1.4 s down to 0.8 s, the speed 150 up to 230 u/s.
// Clay pots break with a technique of their height; bonsai pots with kicks; boulders are dodged; bowls are caught with a block.
B.potsNew = (visit = 1) => {
  const R = E.rng(visit * 7919);
  const lanes = ['high', 'mid', 'low'];
  const kinds = ['clay', 'clay', 'bonsai', 'boulder', 'bowl'];
  const seq = [];
  let t = 1.2;
  for (let i = 0; i < 16; i++) {
    const k = i === 0 ? 'clay' : kinds[Math.floor(R() * kinds.length)];
    const lane = k === 'bonsai' ? lanes[Math.floor(R() * 3)] : (k === 'boulder' ? lanes[Math.floor(R() * 3)] : lanes[Math.floor(R() * 3)]);
    const side = i % 2 === 0 ? 1 : -1;
    const speed = 150 + (230 - 150) * (i / 15);
    seq.push({ k, lane, side, speed, t, x: side > 0 ? 440 : -40, state: 'flying', id: i });
    t += 1.4 - 0.6 * (i / 15);
  }
  return { seq, now: 0, objs: [], idx: 0, score: 0, missed: false, handled: 0, ended: false, msg: null, msgT: 0 };
};
B.potsStep = (s, dt, f) => {
  s.now += dt; if (s.msgT > 0) s.msgT -= dt;
  while (s.idx < s.seq.length && s.seq[s.idx].t <= s.now) { s.objs.push(Object.assign({}, s.seq[s.idx])); s.idx++; }
  for (const o of s.objs) {
    if (o.state !== 'flying') continue;
    o.x += (o.side > 0 ? -1 : 1) * o.speed * KC.TUNE.potSpeed * dt;
    const dist = Math.abs(o.x - f.x);
    if (dist <= 24) { o.state = 'contact'; B.potsResolve(s, o, f); }
    if ((o.side > 0 && o.x < -40) || (o.side < 0 && o.x > 440)) { if (o.state === 'flying') o.state = 'gone'; }
  }
  if (s.handled >= s.seq.length && !s.ended) { s.ended = true; s.perfectPot = !s.missed; s.score += s.perfectPot ? 3000 : 0; }
  return s;
};
B.potsResolve = (s, o, f) => {
  const T = f.tech && KC.DATA.techniques[f.tech.id];
  const active = f.state === 'tech' && f.tech && f.tech.ph === 1;
  const kick = active && T && /KICK/.test(T.name) ? true : false;
  const block = f.state === 'tech' && f.tech && f.tech.id === 'block' && f.tech.ph === 1;
  let ok = false, msg = null;
  if (o.k === 'clay') { ok = active && T.height === o.lane; if (ok) { s.score += 200; msg = 'BREAK'; } }
  else if (o.k === 'bonsai') { ok = kick; if (ok) { s.score += 200; msg = 'BREAK'; } }
  else if (o.k === 'boulder') {
    ok = (o.lane === 'low' && f.airborne) || (o.lane === 'high' && f.crouch) || (o.lane === 'mid' && f.flipping && f.tech && f.tech.id === 'backFlip');
    msg = ok ? 'DODGE' : null;
  } else if (o.k === 'bowl') {
    if (block) { s.score += 1000; msg = 'NICE CATCH!'; ok = true; }
    else if (active) { s.score -= 500; msg = 'MOTTAINAI!'; ok = true; }
    else { msg = 'SPLASH'; ok = true; }
  }
  if (o.state === 'contact' && ok) { o.state = 'done'; s.handled++; }
  if (!ok) { // a clay, a bonsai or a boulder that gets through: the stage ends on the first hit
    if (o.k !== 'bowl') { s.missed = true; s.hitEnd = true; }
    o.state = 'done'; s.handled++;
  }
  if (msg) { s.msg = msg; s.msgT = 0.9; }
  return s;
};

// STOP THE BULL: three charges at 150, 190 and 240 u/s. A valid technique in the strike window stops it for 3,000 (+1,000 PERFECT).
B.bullNew = () => ({ charge: 0, state: 'paw', x: 440, t: 0, speed: 0, dizzy: 0, score: 0, done: false, end: null, msg: null, msgT: 0, tramples: 0, wins: 0 });
B.bullSpeeds = [150, 190, 240];
B.VALID_BULL = ['upperPunch', 'upLunge', 'squatPunch', 'frontKick', 'backKick'];
B.bullStep = (s, dt, f) => {
  s.t += dt; if (s.msgT > 0) s.msgT -= dt;
  if (s.done) return s;
  if (s.state === 'paw') { if (s.t > 1.2) { s.state = 'charge'; s.speed = B.bullSpeeds[s.charge] * KC.TUNE.bullSpeed; s.t = 0; } return s; }
  if (s.state === 'charge') {
    s.x -= s.speed * dt;
    const head = s.x - 22, front = f.x + 9, dist = head - front;
    const T = f.tech && KC.DATA.techniques[f.tech.id];
    const strike = f.state === 'tech' && f.tech && f.tech.ph === 1 && B.VALID_BULL.includes(f.tech.id);
    if (strike && dist >= 8 && dist <= 40) { s.state = 'stopped'; s.dizzy = 1.5; s.t = 0; s.wins++; const perf = Math.abs(dist - 24) <= 6; s.score += 3000 + (perf ? 1000 : 0); s.msg = perf ? 'PERFECT!' : 'THUD!'; s.msgT = 1.2; return s; }
    if (dist < 8) { s.state = 'trampled'; s.t = 0; s.tramples++; s.end = 'trampled'; s.msg = 'TRAMPLED!'; s.msgT = 2; s.done = true; return s; }
    return s;
  }
  if (s.state === 'stopped') { s.dizzy -= dt; if (s.dizzy <= 0) { s.charge++; if (s.charge >= 3) { s.done = true; s.end = 'clear'; return s; } s.state = 'walkBack'; s.t = 0; } return s; }
  if (s.state === 'walkBack') { s.x += 90 * dt; if (s.x >= 440) { s.x = 440; s.state = 'paw'; s.t = 0; } return s; }
  return s;
};

// the scene
KC.makeBonus = (game, S) => {
  S.bonusMenu = {
    pausable: false,
    enter() { this.menu = new E.Menu(game, ['BREAK THE BOARDS', 'POTS AHOY!', 'STOP THE BULL', 'BACK'], { x: 'center', y: 80, onPick: (i) => { if (i === 3) return game.go('title'); return game.go('bonus', { kind: ['boards', 'pots', 'bull'][i], stage: ['courtyard', 'fishmarket', 'pasture'][i] }); }, onCancel: () => game.go('title') }); KC.A.music(game, 'bonus'); },
    update(d) { this.menu.update(d); },
    draw(r) { r.sky(['#4a8ab0', '#8ac0d8', '#d8ecf0']); r.overlay(g => E.font.title(g, 'BONUS GAMES', r.W / 2, 22, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' })); this.menu.draw(r); }
  };
  S.bonus = {
    pausable: false,
    enter(data) {
      this.kind = data.kind; this.node = data.node; this.story = data.node !== undefined; this.t = 0; this.end = null;
      this.st = data.kind === 'boards' ? B.boardsNew({ n: 5 }) : data.kind === 'pots' ? B.potsNew(1 + (KC.save.load() || {}).node || 1) : B.bullNew();
      this.f = new KC.Karateka({ id: 'taro', side: 'w' }); this.f.x = 150; this.f.facing = 1;
      this.dummy = { x: 400, facing: -1, state: 'idle', z: 0, airborne: false, tech: null, crouch: false, flipping: false, guardOn: false, dir: -1, poseState: () => ({}) };
      this.rig = KC.View.rigFor('taro', 'w'); this.prevIn = {};
      this.stage = KC.DATA.bonusStages[data.stage] || KC.DATA.bonusStages.courtyard;
      this.title = KC.TEXT.bonusTitles[data.kind];
      KC.A.music(game, 'bonus');
    },
    update(d) {
      game.focus(200, 0, 30);
      this.t += d;
      const st = this.st, held = game.input.down('tDown') || game.input.down('confirm');
      const intent = KC.readControl(game.input, 1, this.prevIn);
      if (this.kind !== 'boards') { this.f.control(intent, this.dummy); this.f.tick(d, this.dummy, true); }
      if (this.kind === 'boards') {
        B.boardsStep(st, d, held);
        if (st.phase === 'result' && st.resultT > 0.02 && !this.judged) { this.judged = true; KC.A.sfx(game, st.perfect ? 'perfect' : 'boardCrack'); }
        if (st.phase === 'result' && st.resultT > 3) return this.finish(st.points, st.perfect ? 'PERFECT!' : 'WEAK!');
        if (st.phase === 'breathe' && !held) B.boardsChop(st);
      } else if (this.kind === 'pots') {
        B.potsStep(st, d, this.f);
        if (st.hitEnd && !this.endT) { this.endT = this.t; }
        if (this.endT && this.t - this.endT > 1.2) return this.finish(st.score + (st.perfectPot ? 3000 : 0), st.perfectPot ? 'PERFECT!' : 'OVER!');
        if (st.ended && !this.endT) { this.endT = this.t; }
      } else {
        B.bullStep(st, d, this.f);
        if (st.done && !this.endT) this.endT = this.t;
        if (this.endT && this.t - this.endT > 1.8) return this.finish(st.score, st.end === 'clear' ? 'CHAMP!' : 'TRAMPLED!');
      }
      KC.View.applyPose(this.rig, this.f.poseState(), d);
    },
    finish(score, word) {
      this.resultWord = word;
      const table = this.kind === 'boards' ? 'boards' : this.kind === 'pots' ? 'pots' : 'bull';
      KC.records.add(table, 'TARO', score, '');
      if (this.story) {
        KC.advanceNode();
        const s = KC.save.load() || { score: 0 }; s.score = (s.score || 0) + score; KC.save.write(s);
        return game.go('road', { resume: true });
      }
      return game.go('bonusMenu');
    },
    draw(r) {
      const sg = this.stage;
      r.sky(sg.sky);
      const floor = Math.round(r.w(0, 0, 0)[1]);
      r.overlay(g => { for (let y = floor; y < r.H; y++) E.px.rect(g, 0, y, r.W, 1, sg.floor); });
      if (this.kind === 'boards') this.drawBoards(r);
      else if (this.kind === 'pots') this.drawPots(r);
      else this.drawBull(r);
      KC.View.drawFighters(r, [this.f], { w: this.rig });
      r.overlay(g => {
        E.font.title(g, this.title, r.W / 2, 10, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        if (this.kind === 'pots' && this.st.msgT > 0) E.font.title(g, this.st.msg, r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        if (this.kind === 'bull' && this.st.msgT > 0) E.font.title(g, this.st.msg, r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(this.score()).padStart(6, '0'), r.W - 10, 30, '#ffe08a', { align: 'right', outline: '#0b0814' });
        if (this.resultWord) E.font.title(g, this.resultWord, r.W / 2, r.H * 0.6, { scale: 3, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
      });
    },
    score() { return this.kind === 'boards' ? (this.st.points || 0) : this.kind === 'pots' ? this.st.score : this.st.score; },
    drawBoards(r) {
      const g0 = null;
      r.overlay(g => {
        const x0 = r.W / 2 - 40, y0 = r.H * 0.5;
        for (let k = 0; k < this.st.n; k++) {
          const broken = this.st.phase === 'result' && k < this.st.broken;
          E.px.rect(g, x0 + k * 10, y0 - 40, 8, 40, broken ? '#8a6038' : '#d8b080');
        }
        E.ui.bar(g, 40, r.H - 40, 200, 8, this.st.ki / 100, this.st.ki > 100 ? '#ff5a4a' : '#ffd060');
        E.font.text(g, 'KI', 26, r.H - 42, '#fff6d0', { outline: '#0b0814' });
      });
    },
    drawPots(r) {
      r.overlay(g => {
        const floor = r.H * 0.7;
        E.px.rect(g, 0, floor, r.W, 2, '#8a6038');
        for (const o of this.st.objs) {
          if (o.state === 'done' || o.state === 'gone') continue;
          const sx = (r.W / 2) + (o.x - 150) * 1.0;
          const y = floor - (o.lane === 'high' ? 52 : o.lane === 'mid' ? 36 : 10);
          const c = o.k === 'clay' ? '#a06a40' : o.k === 'bonsai' ? '#3a7a3a' : o.k === 'boulder' ? '#7a7a7a' : '#e8e0c8';
          E.px.disc(g, sx, y, 7, c);
        }
      });
    },
    drawBull(r) {
      const bx = this.st.x;
      r.overlay(g => {
        const floor = r.H * 0.7, sx = (r.W / 2) + (bx - 150);
        E.px.rect(g, sx - 22, floor - 36, 44, 30, '#4a2e22');
        E.px.rect(g, sx + 14, floor - 52, 16, 18, '#4a2e22');
        E.px.rect(g, sx + 26, floor - 50, 4, 4, '#e8dcc0');
        if (this.st.state === 'stopped') E.font.text(g, '*  *  *', sx + 10, floor - 60, '#ffe08a', { outline: '#0b0814' });
      });
    }
  };
  return S;
};

// ---- src/65-online.js
// ---------------------------------------------------------------- online: an AI Hub session (shared world, Kachinuki, 2-4 players)
// The host's copy runs the world (the bouts and the queue) and sends snapshots and events; every other copy sends its own
// player's inputs to the host and draws the world from the host's snapshots. Only the hub's messages are used (AIHub.send).
KC.hubRef = (typeof AIHub !== 'undefined') ? AIHub : null;
KC.SESSION = !!(KC.hubRef && KC.hubRef.active);
KC.NET_CHARS = ['taro', 'kamaboko', 'negi', 'ebi'];   // by seat order
KC.Net = {
  info: null, host: false, server: false, me: null, ids: [], queue: [], wins: {}, pts: {}, conc: {}, streak: {}, full: {}, half: {},
  bout: null, boutN: 0, a: null, b: null, snap: null, inbox: {}, outEvents: [], lastSnapReal: 0, lastHb: 0, lastIn: {}, lastCall: null,
  endInfo: null, ended: false, began: false, status: 'connecting', popup: null, prevPosture: null, unsub: [], view: null, lastRoundAt: 0
};
const N = KC.Net;
N.connect = function (scene) {
  const hub = KC.hubRef;
  N.status = 'connecting';
  hub.connect({ mode: 'shared-world', seats: [2, 4], card: true }).then((info) => {
    if (!info) { N.status = 'alone'; return KC.game.go('title'); }
    N.info = info; N.host = !!info.isHost; N.server = !!info.server; N.me = info.me;
    N.ids = info.players.map(p => p.id);
    N.queue = N.ids.slice();
    for (const id of N.ids) { N.wins[id] = 0; N.pts[id] = 0; N.conc[id] = 0; N.streak[id] = 0; N.full[id] = 0; N.half[id] = 0; }
    N.unsub.push(hub.on('message', (data, from) => N.onMessage(data, from)));
    N.unsub.push(hub.on('start', () => N.begin()));
    N.unsub.push(hub.on('card', (c) => { N.card = c; }));
    N.unsub.push(hub.on('time-up', () => N.timeUp()));
    N.unsub.push(hub.on('leave', (m) => N.onLeave(m)));
    N.unsub.push(hub.on('end', (m) => N.onEnd(m)));
    N.status = 'waiting';
    hub.ready();
  }, () => { N.status = 'alone'; KC.game.go('title'); });
};
// the round begins on the hub's start: the host starts the first bout
N.begin = function () {
  if (N.began) return;
  N.began = true; N.status = 'playing';
  KC.game.go('online', { resume: true });
  if (N.host) N.startBout();
};
// who fights and how: the first two in the queue; the fighter of seat id gives the roster character
N.fighterId = (pid) => KC.NET_CHARS[N.ids.indexOf(pid) % KC.NET_CHARS.length];
N.startBout = function () {
  if (N.queue.length < 2) return N.finish('finished');
  const aId = N.queue[0], bId = N.queue[1];
  N.a = new KC.Karateka({ id: N.fighterId(aId), side: 'w' });
  N.b = new KC.Karateka({ id: N.fighterId(bId), side: 'r' });
  N.aId = aId; N.bId = bId;
  const seed = (N.info.seed >>> 0) + 17 * (N.boutN + 1);
  N.bout = new KC.Bout({ white: N.a, red: N.b, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
  N.boutN++;
  N.bout.on('point', (p) => { const e = { k: 'point', side: p.side, pts: p.pts, full: p.full, counter: p.counter, tech: p.tech }; N.outEvents.push(e); N.tally(p); N.applyEvent(e); });
  N.bout.on('call', (c) => { const e = { k: 'call', text: c.text, sub: c.sub }; N.outEvents.push(e); N.applyEvent(e); });
  N.bout.on('block', (b) => N.outEvents.push({ k: 'block', by: b.by, tech: b.tech }));
  N.bout.on('aiuchi', () => N.outEvents.push({ k: 'aiuchi' }));
  N.outEvents.push({ k: 'queue', q: N.queue.slice(), a: aId, b: bId });
};
N.tally = function (p) {
  const who = p.side === 0 ? N.aId : N.bId, other = p.side === 0 ? N.bId : N.aId;
  N.pts[who] += p.pts; N.conc[other] += p.pts;
  if (p.full) N.full[who]++; else N.half[who]++;
};
// the host's step: the bout, the inputs, the snapshots and the events
N.step = function (dt) {
  if (!N.host || !N.bout || N.ended) return;
  const ia = N.intentFor(N.aId, N.a, N.b), ib = N.intentFor(N.bId, N.b, N.a);
  N.bout.step(dt, { a: () => ia, b: () => ib });
  N.syncRigs();
  KC.stepPoses({ w: N.a, r: N.b, rigs: N.rigs }, dt);
  if (N.bout.phase === 'matchEnd' && N.bout.phaseT > N.bout.phaseLen - 0.01) N.boutEnd();
  N.sendEvents();
  N.snapTick = (N.snapTick || 0) + dt;
  if (N.snapTick >= 0.083) { N.snapTick = 0; N.sendSnapshot(); }
};
N.heldPost = {};
N.intentFor = function (pid, f, foe) {
  if (!N.server && pid === N.me) return KC.readControl(KC.game.input, foe.x < f.x ? -1 : 1, N.prevLocal || (N.prevLocal = {}));
  // a guest's posture holds until it changes; a technique press is used once, in order
  const q = N.inbox[pid] || (N.inbox[pid] = []);
  let tech = null;
  while (q.length) { const m = q.shift(); if (m.p !== undefined) N.heldPost[pid] = m.p; if (m.h) { tech = m.h; break; } }
  return { posture: N.heldPost[pid] || 'n', tech };
};
N.syncRigs = function () {
  N.rigs = N.rigs || { w: null, r: null };
  if (!N.rigs.w || N.rigs.w.kId !== N.a.id) N.rigs.w = KC.View.rigFor(N.a.id, 'w');
  if (!N.rigs.r || N.rigs.r.kId !== N.b.id) N.rigs.r = KC.View.rigFor(N.b.id, 'r');
};
N.boutEnd = function () {
  const side = N.bout.matchOver;
  const win = side === 0 ? N.aId : N.bId, lose = side === 0 ? N.bId : N.aId;
  N.wins[win]++; N.streak[win]++; N.streak[lose] = 0;
  N.outEvents.push({ k: 'bout', winner: win, loser: lose, wins: N.wins[win] });
  N.queue = [win].concat(N.queue.slice(2), [lose]);
  N.bout = null;
  if (N.wins[win] >= KC.TUNE.sessionTarget) return N.finish('finished');
  N.lastRoundAt = KC.game.time;
  N.nextAt = KC.game.time + 2.5;
};
N.standings = function () {
  const ids = N.ids.slice().sort((x, y) => (N.wins[y] - N.wins[x]) || (N.pts[y] - N.pts[x]) || (N.conc[x] - N.conc[y]));
  const groups = [];
  for (const id of ids) {
    const last = groups[groups.length - 1];
    if (last && N.wins[last[0]] === N.wins[id] && N.pts[last[0]] === N.pts[id] && N.conc[last[0]] === N.conc[id]) last.push(id);
    else groups.push([id]);
  }
  return groups;
};
N.finish = function (why) {
  if (!N.host || N.ended) return;
  N.ended = true;
  const standings = N.standings();
  const scores = {};
  for (const id of N.ids) scores[id] = N.wins[id];
  const stats = {}, awards = [];
  for (const id of N.ids) stats[id] = { 'Bouts won': N.wins[id], 'Full points': N.full[id], 'Half points': N.half[id], 'Best streak': N.streak[id] };
  let best = null; for (const id of N.ids) if (!best || N.full[id] > N.full[best]) best = id;
  if (best !== null && N.full[best] > 0) awards.push({ id: best, title: 'IPPON HUNTER', detail: N.full[best] + ' full points' });
  KC.hubRef.finish({ standings, scores, stats, awards });
  N.outEvents.push({ k: 'over', why });
  N.sendEvents();
};
N.timeUp = function () { if (N.host) N.finish('time-up'); };
N.onLeave = function (m) {
  if (!N.host) return;
  N.queue = N.queue.filter(id => id !== m.id);
  if (N.bout && (m.id === N.aId || m.id === N.bId)) {
    // a fighter who leaves forfeits the bout; the other side takes it
    const side = m.id === N.aId ? 1 : 0;
    N.bout.matchOver = side;
    N.bout.roundWins[side] = 1;
    N.boutEnd();
    return;
  }
  if (N.queue.length < 2) N.finish('finished');
};
N.onEnd = function (m) {
  N.ended = true; N.endInfo = m;
  KC.game.audio.stopMusic(0.3);
};
// the messages: a snapshot (from the host), the events, a player's inputs (to the host), and heartbeats
N.onMessage = function (data, from) {
  if (!data || typeof data !== 'object') return;
  if (data.t === 's') { if (!N.host) N.snap = data; }
  else if (data.t === 'ev') { if (!N.host) for (const e of data.list) N.applyEvent(e); }
  else if (data.t === 'in') { if (N.host) (N.inbox[from] || (N.inbox[from] = [])).push({ p: data.p, h: data.h }); }
};
N.applyEvent = function (e) {
  if (e.k === 'call') { N.lastCall = { text: e.text, sub: e.sub, at: KC.game.time }; KC.A.sfx(KC.game, 'flagSnap'); }
  if (e.k === 'point') { N.popup = { t: 1.2, text: (e.full ? 'FULL' : 'HALF') + (e.counter ? ' COUNTER' : '') + ' · ' + KC.DATA.techniques[e.tech].name + ' ' + e.pts, color: e.full ? '#ffe070' : '#ffffff' }; KC.A.sfx(KC.game, e.full ? 'thwackFull' : 'thwackHalf'); }
  if (e.k === 'block') KC.A.sfx(KC.game, 'clack');
  if (e.k === 'queue') { N.queue = e.q; N.aId = e.a; N.bId = e.b; }
  if (e.k === 'bout') { N.wins[e.winner] = e.wins; N.queue = [e.winner].concat(N.queue.slice(2), [e.loser]); }
  if (e.k === 'over') { N.ended = true; }
};
// the events go out together, reliably, in order
N.sendEvents = function () {
  if (!N.outEvents.length) return;
  KC.hubRef.send({ t: 'ev', list: N.outEvents.splice(0) }, { reliable: true });
};
N.sendSnapshot = function () {
  const pts = N.bout ? N.bout.points.slice() : [0, 0];
  KC.hubRef.send({
    t: 's', a: +KC.hubRef.time().toFixed(3), c: N.bout ? +N.bout.clock.toFixed(2) : 0, ph: N.bout ? N.bout.phase : 'between',
    pts, aId: N.aId, bId: N.bId, q: N.queue.slice(), w: N.ids.map(id => N.wins[id]),
    f: N.a && N.b ? [N.a.poseState(), N.b.poseState()] : null, steps: N.bout ? N.bout.steps : 0
  }, { reliable: false });
};
// the guest's own input: its posture and its technique presses, only when they change
N.guestStep = function (dt) {
  if (N.host || N.ended || !N.began) return;
  const me = N.me, sn = N.snap; if (!sn || !sn.f) return;
  const mine = sn.aId === me ? 0 : sn.bId === me ? 1 : -1;
  const foeDir = mine === 0 ? 1 : -1;
  if (mine < 0) return;
  const my = sn.f[mine];
  const intent = KC.readControl(KC.game.input, my.x < sn.f[1 - mine].x ? 1 : -1, N.prevLocal || (N.prevLocal = {}));
  const send = {};
  if (intent.posture !== N.lastIn.p) { send.p = intent.posture; N.lastIn.p = intent.posture; }
  if (intent.tech) send.h = intent.tech;
  if (Object.keys(send).length) KC.hubRef.send(Object.assign({ t: 'in' }, send), { reliable: true });
};
// heartbeats from everyone who is not the host, so traffic flows both ways
N.heartbeat = function (dt) {
  N.lastHb += dt;
  if (!N.host && N.lastHb >= 0.5) { N.lastHb = 0; KC.hubRef.send({ t: 'hb', a: +KC.hubRef.time().toFixed(3) }, { reliable: false }); }
};
// the scene: the card while the round waits, then the bouts (host) or the snapshots (guests)
KC.makeOnline = (game, S) => {
  S.session = {
    pausable: false,
    enter() { if (!N.info && N.status === 'connecting') N.connect(); KC.A.music(game, 'select'); this.t = 0; },
    // the game's own card (connect with card: true): the players, who is ready, the goal, the countdown; Enter or cross is Ready
    update(d) {
      this.t += d; game.focus(200, 0, 30);
      if (N.status === 'waiting' && N.info) {
        if (game.input.pressed('confirm')) { KC.hubRef.answer('ready'); KC.A.sfx(game, 'menuOk'); }
        if (game.input.pressed('triangle')) KC.hubRef.answer('more');
      }
    },
    draw(r) {
      r.sky(['#101828', '#2a2a40', '#4a3a40']);
      const c = N.card || {}, ready = c.ready || [];
      const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
      r.overlay(g => {
        E.font.title(g, 'KARATE CHAMPON', r.W / 2, 22, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.onlineCard.kach, r.W / 2, 70, '#ffe08a', { align: 'center', outline: '#0b0814' });
        E.font.text(g, KC.TEXT.onlineCard.firstTo, r.W / 2, 90, '#fff6d0', { align: 'center', outline: '#0b0814' });
        const players = N.info ? N.info.players : [];
        players.forEach((p, i) => {
          const x = r.W / 2 - 150 + i * 100, y = 130;
          E.ui.box(g, x, y, 90, 56, { bg: ['#1a1428', '#0e0a18'], border: colors[i % 4] });
          E.px.rect(g, x + 4, y + 4, 6, 48, colors[i % 4]);
          E.font.text(g, String(p.name || '?').toUpperCase().slice(0, 10), x + 14, y + 8, '#fff6d0', { outline: '#0b0814', font: 'tiny' });
          E.font.text(g, ready.includes(p.id) ? 'READY' : 'WAITING', x + 14, y + 32, ready.includes(p.id) ? '#8ef0a8' : '#a9a1c8', { outline: '#0b0814', font: 'tiny' });
          if (p.id === N.me) E.font.text(g, 'YOU', x + 14, y + 44, '#ffe08a', { outline: '#0b0814', font: 'tiny' });
        });
        const left = c.left != null ? Math.ceil(c.left / 1000) : null;
        E.font.text(g, left != null ? 'STARTS IN ' + left : (N.status === 'waiting' ? 'WAITING FOR THE HUB' : 'CONNECTING'), r.W / 2, r.H - 70, '#fff6d0', { align: 'center', outline: '#0b0814', scale: 2 });
        E.font.text(g, 'ENTER / CROSS: READY    TRIANGLE: MORE TIME', r.W / 2, r.H - 36, '#a9a1c8', { align: 'center', outline: '#0b0814', font: 'tiny' });
      });
    }
  };
  S.online = {
    pausable: false,
    enter() { game.focus(200, 0, 30); KC.A.music(game, 'stadium'); this.stadium = KC.DATA.stages.stadium; N.rigs = N.rigs || { w: null, r: null }; },
    update(d) {
      game.focus(200, 0, 30);
      if (N.host) { N.step(d); if (N.nextAt && game.time >= N.nextAt && !N.bout && !N.ended) { N.nextAt = 0; N.startBout(); } }
      else N.guestStep(d);
      N.heartbeat(d);
      if (N.popup && N.popup.t > 0) N.popup.t -= d;
    },
    draw(r) {
      const st = this.stage || KC.DATA.stages.stadium;
      if (N.bout) {
        N.syncRigs();
        KC.View.drawStage(r, st, game.time);
        KC.View.drawFighters(r, [N.a, N.b], { w: N.rigs.w, r: N.rigs.r });
        KC.View.hud(r, N.bout, { popup: N.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, N.popup) : null });
      } else if (N.snap && N.snap.f) {
        const sn = N.snap, fakeBout = N.fakeBout(sn);
        KC.View.drawStage(r, st, game.time);
        const rigA = N.rigFor(sn.aId, 'w'), rigB = N.rigFor(sn.bId, 'r');
        const fa = Object.assign({ side: 'w', x: sn.f[0].x, z: sn.f[0].z }, sn.f[0]), fb = Object.assign({ side: 'r', x: sn.f[1].x, z: sn.f[1].z }, sn.f[1]);
        KC.View.applyPose(rigA, sn.f[0], 1 / 120); KC.View.applyPose(rigB, sn.f[1], 1 / 120);
        KC.View.drawFighters(r, [fa, fb], { w: rigA, r: rigB });
        KC.View.hud(r, fakeBout, { popup: N.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, N.popup) : null });
      } else {
        KC.View.drawStage(r, st, game.time);
      }
      r.overlay(g => {
        const line = N.ended ? (N.endInfo && N.endInfo.reason === 'host-left' ? 'HOST LEFT' : 'ROUND OVER') : (N.bout ? '' : KC.TEXT.onlineCard.kach);
        if (line) E.font.title(g, line, r.W / 2, r.H * 0.42, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const q = (N.bout || !N.snap) ? N.queue : N.snap.q;
        const wins = N.wins;
        E.ui.box(g, 6, r.H - 30, r.W - 12, 24, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        const names = (q || []).map(id => (N.info ? (N.info.players.find(p => p.id === id) || { name: '?' }).name : '?') + ' ' + (wins[id] || 0));
        E.font.text(g, 'QUEUE: ' + names.join('  ·  ').replace(/·/g, '-'), 12, r.H - 24, '#fff6d0', { outline: '#0b0814' });
      });
    }
  };
  return S;
};
// the guests' rigs by character, and a bout-shaped record for the HUD from a snapshot
N.rigFor = (pid, side) => {
  N.rigCache = N.rigCache || {};
  const k = (side + ':' + N.fighterId(pid));
  if (!N.rigCache[k]) N.rigCache[k] = KC.View.rigFor(N.fighterId(pid), side);
  return N.rigCache[k];
};
N.fakeBout = (sn) => {
  const nameOf = (id) => N.info ? ((N.info.players.find(p => p.id === id) || { name: '?' }).name) : '?';
  return {
    phase: sn.ph, clock: sn.c, points: sn.pts, roundWins: [0, 0], roundsToWin: 1, steps: sn.steps,
    a: { r: { short: nameOf(sn.aId).slice(0, 10) } }, b: { r: { short: nameOf(sn.bId).slice(0, 10) } },
    lastCall: N.lastCall ? { text: N.lastCall.text, sub: N.lastCall.sub, step: sn.steps } : null
  };
};

// ---- src/66-kach.js
// ---------------------------------------------------------------- local Kachinuki (9, 12.1): 2-4 seats on one machine, the winner stays on
// Seat 0 is the keyboard player; the other seats are CPU rivals. The queue rotates: the winner stays, the loser goes to the back.
// The first to 5 bout wins is the champion.
KC.makeKach = (game, S) => {
  // seat 0: the keyboard (WASD, IJKL); seat 1: the keyboard's second half (arrows, numpad); seats 2 and 3: gamepads 0 and 1
  const K = { prevA: {}, prevB: {}, isHuman: (seat) => seat <= 1 || KC.padConnected(seat - 2), seatIntent: (seat, dir, prev) => seat === 0 ? KC.readControl(KC.game.input, dir, prev) : seat === 1 ? KC.readKeys(KC.game, prev, dir) : (KC.padIntent(seat - 2, dir, prev) || { posture: 'n', tech: null }), seats: 2, queue: [], wins: [], ids: [], bout: null, a: null, b: null, rigs: {}, boutN: 0, over: false, popup: null, t: 0, champion: null };
  KC.kach = K;
  const boutStart = () => {
    if (K.queue.length < 2) return;
    const aSeat = K.queue[0], bSeat = K.queue[1];
    K.a = new KC.Karateka({ id: K.ids[aSeat], side: 'w' }); K.b = new KC.Karateka({ id: K.ids[bSeat], side: 'r' });
    K.aSeat = aSeat; K.bSeat = bSeat;
    const seed = 500 + K.boutN * 31;
    K.bout = new KC.Bout({ white: K.a, red: K.b, seed, roundsToWin: 1, pointsToWin: 2, intro: true });
    K.boutN++;
    K.aiA = K.isHuman(aSeat) ? null : new KC.KarateAI(K.a, seed + 3, { level: KC.DATA.roster[K.ids[aSeat]].ai.level });
    K.aiB = K.isHuman(bSeat) ? null : new KC.KarateAI(K.b, seed + 5, { level: KC.DATA.roster[K.ids[bSeat]].ai.level });
    K.rigs = { w: KC.View.rigFor(K.ids[aSeat], 'w'), r: KC.View.rigFor(K.ids[bSeat], 'r') };
    K.bout.on('point', (p) => { K.popup = { t: 1.2, text: (p.full ? 'FULL' : 'HALF') + ' · ' + KC.DATA.techniques[p.tech].name + ' ' + p.pts, color: p.full ? '#ffe070' : '#ffffff' }; });
    K.bout.on('aiuchi', () => { K.popup = { t: 1, text: 'AIUCHI! NO POINT', color: '#ffffff' }; });
  };
  const boutEnd = () => {
    const side = K.bout.matchOver;
    const winSeat = side === 0 ? K.aSeat : K.bSeat, loseSeat = side === 0 ? K.bSeat : K.aSeat;
    K.wins[winSeat]++;
    K.queue = [winSeat].concat(K.queue.slice(2), [loseSeat]);
    K.bout = null;
    if (K.wins[winSeat] >= 5) { K.over = true; K.champion = winSeat; return; }
    K.nextAt = K.t + 2.5;
  };
  S.kach = {
    pausable: false,
    enter(data) {
      K.seats = data.seats || 2; K.ids = data.roster.slice(0, K.seats); K.stage = KC.DATA.stages[data.stage] || KC.DATA.stages.dojo;
      K.queue = K.ids.map((_, i) => i); K.wins = K.ids.map(() => 0); K.boutN = 0; K.over = false; K.t = 0; K.champion = null; K.nextAt = 0;
      K.prevA = {}; K.prevB = {};
      boutStart(); KC.A.music(game, K.stage.music);
    },
    update(d) {
      K.t += d; game.focus(200, 0, 30);
      if (K.over) { if (game.input.pressed('confirm')) return game.go('title'); return; }
      if (!K.bout) { if (K.t >= K.nextAt) boutStart(); return; }
      const dirA = K.a.x < K.b.x ? 1 : -1, dirB = -dirA;
      const iA = K.aiA ? K.aiA.intent(K.b, d) : K.seatIntent(K.aSeat, dirA, K.prevA);
      const iB = K.aiB ? K.aiB.intent(K.a, d) : K.seatIntent(K.bSeat, -dirA, K.prevB);
      K.bout.step(d, { a: () => iA, b: () => iB });
      KC.stepPoses({ w: K.a, r: K.b, rigs: K.rigs }, d);
      if (K.popup && K.popup.t > 0) K.popup.t -= d;
      if (K.bout.phase === 'matchEnd' && K.bout.phaseT > K.bout.phaseLen - 0.01) boutEnd();
    },
    draw(r) {
      KC.View.drawStage(r, K.stage, game.time);
      if (K.bout) {
        KC.View.drawFighters(r, [K.a, K.b], { w: K.rigs.w, r: K.rigs.r });
        KC.View.hud(r, K.bout, { popup: K.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, K.popup) : null });
      }
      r.overlay(g => {
        E.ui.box(g, 6, r.H - 30, r.W - 12, 24, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        const parts = K.queue.map(seat => (seat === 0 ? 'YOU' : 'CPU ' + KC.DATA.roster[K.ids[seat]].short) + ' ' + K.wins[seat]);
        E.font.text(g, 'KACHINUKI  ' + parts.join('  -  '), 12, r.H - 24, '#fff6d0', { outline: '#0b0814' });
        if (K.over) E.font.title(g, (K.champion === 0 ? 'YOU ARE CHAMP' : 'CPU ' + KC.DATA.roster[K.ids[K.champion]].short + ' WINS') + '!', r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        if (K.over) E.font.text(g, 'CROSS: TITLE', r.W / 2, r.H * 0.55, '#fff6d0', { align: 'center', outline: '#0b0814' });
      });
    }
  };
};

// ---- src/67-lab.js
// ---------------------------------------------------------------- the Technique Lab (dev, 14): the hero against a standing dummy.
// Choose a technique, set the gap to the dummy, play it: the lab says whether it connected, the gap, and the frame data.
KC.makeLab = (game, S) => {
  const LIST = KC.DATA.techniqueIds;
  S.lab = {
    pausable: false,
    enter(data) {
      this.i = Math.max(0, LIST.indexOf(data && data.tech) );
      this.gap = this.gap || 30; this.hero = new KC.Karateka({ id: 'taro', side: 'w' }); this.dummy = new KC.Karateka({ id: 'genkotsu', side: 'r' });
      this.rig = KC.View.rigFor('taro', 'w'); this.drig = KC.View.rigFor('kamaboko', 'r');
      this.result = null; this.reset();
      KC.A.music(game, 'practice');
    },
    reset() {
      this.hero.reset(); this.dummy.reset(); this.hero.x = 150; this.hero.facing = 1;
      this.dummy.x = 150 + KC.BODY_W + this.gap; this.dummy.facing = -1; this.dummy.state = 'idle';
      this.hit = false; this.hitGap = null; this.played = null;
    },
    update(d) {
      game.focus(200, 0, 30);
      if (game.input.pressed('right')) { this.i = (this.i + 1) % LIST.length; this.reset(); }
      if (game.input.pressed('left')) { this.i = (this.i + LIST.length - 1) % LIST.length; this.reset(); }
      if (game.input.pressed('up')) { this.gap = Math.min(90, this.gap + 2); this.reset(); }
      if (game.input.pressed('down')) { this.gap = Math.max(0, this.gap - 2); this.reset(); }
      if (game.input.pressed('confirm')) { this.reset(); this.hero.startTech(LIST[this.i]); this.played = LIST[this.i]; }
      if (game.input.pressed('cancel')) return game.go('dev', { back: 'title', resume: true });
      KC.TOGGLES.slowMo ? (game.timeScale = 0.25) : (game.timeScale = KC.TUNE.gameSpeed);
      if (this.played) {
        this.hero.tick(d, this.dummy, true); this.dummy.tick(d, this.hero, false);
        const T = KC.DATA.techniques[this.played];
        if (!this.hit && T.reach && this.hero.tech && this.hero.tech.ph === 1) {
          const gap = Math.abs(this.dummy.x - this.hero.x) - KC.BODY_W;
          if (gap <= T.reach[1] * KC.TUNE.reachScale && this.hero.hittableBy(T, this.dummy)) { this.hit = true; this.hitGap = gap; }
        }
        if (!this.hero.tech && this.hero.state !== 'tech') this.result = this.hit ? 'HIT at gap ' + this.hitGap.toFixed(1) : 'MISS';
      }
      KC.View.applyPose(this.rig, this.hero.poseState(), d);
      KC.View.applyPose(this.drig, this.dummy.poseState(), d);
    },
    draw(r) {
      const id = LIST[this.i], T = KC.DATA.techniques[id];
      KC.View.drawStage(r, KC.DATA.stages.dojo, game.time);
      KC.View.drawFighters(r, [this.hero, this.dummy], { w: this.rig, r: this.drig });
      r.overlay(g => {
        E.ui.box(g, 6, 6, r.W - 12, 46, { bg: ['#1a1428', '#0e0a18'], border: '#c8a060' });
        E.font.text(g, 'LAB  ' + T.name + '  (' + T.jp + ')', 12, 12, '#fffbe8', { outline: '#0b0814', scale: 2 });
        const f = T.f ? 'FRAMES ' + T.f[0] + ' / ' + T.f[1] + ' / ' + T.f[2] + '   ' : '';
        const band = T.reach ? 'REACH ' + T.reach[0] + '-' + T.reach[1] + '   POINTS ' + (T.pts ? T.pts[0] + '-' + T.pts[1] : '-') : '';
        E.font.text(g, f + band, 12, 34, '#fff6d0', { outline: '#0b0814' });
        E.font.text(g, 'DUMMY GAP ' + this.gap + '   ' + (this.result || (this.played ? '...' : 'PLAY TO TEST')), 12, r.H - 40, '#ffe08a', { outline: '#0b0814' });
        E.font.text(g, 'LEFT/RIGHT TECHNIQUE · UP/DOWN GAP · CROSS PLAY · CIRCLE BACK', 12, r.H - 18, '#a9a1c8', { outline: '#0b0814', font: 'tiny' });
      });
    }
  };
  return S;
};

// ---- src/68-pads.js
// ---------------------------------------------------------------- the gamepads for the second and later players (standard mapping)
// Pad i (0-based, in the order the browser lists them) plays one seat: left stick or D-pad posture, the right stick or the
// face buttons for the technique. Presses are edges, so holding a stick does not repeat a technique.
KC.padPads = () => (typeof navigator !== 'undefined' && navigator.getGamepads) ? Array.from(navigator.getGamepads() || []) : [];
KC.padConnected = (i) => { const p = KC.padPads()[i]; return !!(p && p.connected !== false); };
KC.padIntent = (i, foeDir, prev) => {
  const p = KC.padPads()[i];
  if (!p) return null;
  const b = p.buttons || [], ax = p.axes || [];
  const down = (k) => !!(b[k] && (b[k].pressed || b[k].value > 0.5));
  // posture: the left stick (dominant axis, 0.5 to press), or the D-pad
  let lq = KC.quantize(ax[0] || 0, ax[1] || 0);
  if (down(12)) lq = 'u'; else if (down(13)) lq = 'd'; else if (down(14)) lq = 'l'; else if (down(15)) lq = 'r';
  const px = lq || 'n';
  // technique: a press edge of a face button, or of the right stick's 4-way direction
  const rq = KC.quantize(ax[2] || 0, ax[3] || 0);
  const faces = [[3, 'u'], [0, 'd'], [2, 'l'], [1, 'r']];
  let edge = null;
  for (const [k, d] of faces) if (down(k) && !prev['f' + k]) edge = edge || d;
  for (const [k] of faces) prev['f' + k] = down(k);
  if (rq && rq !== prev.rq && !edge) edge = rq;
  prev.rq = rq;
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};

// ---- src/70-dev.js
// ---------------------------------------------------------------- dev mode (14): live sliders over KC.TUNE, toggles, warps, reset
KC.DEV_SLIDERS = [
  ['gameSpeed', 'Game speed', 0.25, 2, 0.05], ['techSpeed', 'Technique speed', 0.5, 1.5, 0.05], ['walk', 'Walk speed', 40, 120, 2],
  ['jump', 'Jump speed', 250, 450, 5], ['gravity', 'Gravity', 700, 1400, 10], ['hitstop', 'Hit-stop (s)', 0, 0.3, 0.01],
  ['fullAt', 'Full point at', 300, 1000, 50], ['counterMul', 'Counter multiplier', 1, 3, 0.1], ['reachScale', 'Reach scale', 0.7, 1.4, 0.02],
  ['blockWindow', 'Block window (frames)', 6, 30, 1], ['clock', 'Round clock (s)', 10, 99, 1], ['pointsToWin', 'Points to win', 1, 5, 0.5],
  ['roundsToWin', 'Rounds to win', 1, 3, 1], ['cpuLevel', 'CPU level (0 = per opponent)', 0, 10, 1], ['cpuReact', 'CPU reaction', 0.5, 2, 0.05],
  ['cpuAggression', 'CPU aggression (-1 = per opponent)', -1, 1, 0.05], ['refPace', 'Referee pace', 0.5, 2, 0.05], ['potSpeed', 'Pot speed', 0.5, 2, 0.05],
  ['bullSpeed', 'Bull speed', 0.5, 2, 0.05], ['kiSpeed', 'Ki speed', 0.5, 2, 0.05], ['sessionTarget', 'Session target (bout wins)', 1, 10, 1]
];
KC.DEV_TOGGLES = [['hitBoxes', 'Hit and push boxes'], ['frameData', 'Frame data'], ['inputDisplay', 'Input display'], ['aiThoughts', 'AI thoughts'],
  ['p1Invincible', 'P1 invincible'], ['infiniteTime', 'Infinite time'], ['freezeCpu', 'Freeze CPU'], ['slowMo', 'Slow motion 0.25x'], ['mute', 'Mute voices and sound'], ['unlockAll', 'Unlock all']];
KC.DEV_WARPS = [['Title', 'title'], ['Attract mode', 'attract'], ['Champon Road', 'road'], ['Dojo', 'dojo'], ['Bonus games', 'bonusMenu'], ['Technique Lab', 'lab'], ['Kachinuki (3 seats)', { kach: 3 }], ['Records', 'records'], ['Ending', 'ending'],
  ['Stage: Harbor', { stage: 'harbor' }], ['Stage: Stadium', { stage: 'stadium' }], ['Stage: Fuji', { stage: 'fuji' }], ['Stage: Market', { stage: 'market' }], ['Stage: Ship', { stage: 'ship' }], ['Stage: Log', { stage: 'log' }]];
KC.makeDev = (game, S) => {
  S.dev = {
    pausable: false,
    enter(data) { this.tab = 0; this.sel = 0; this.back = (data && data.back) || 'title'; this.msg = ''; KC.A.music(game, 'practice'); },
    rows() {
      const R = [{ kind: 'reset', label: 'RESET ALL TO DEFAULTS' }];
      if (this.tab === 0) for (const [k, label, min, max, step] of KC.DEV_SLIDERS) R.push({ kind: 'slider', k, label, min, max, step });
      if (this.tab === 1) for (const [k, label] of KC.DEV_TOGGLES) R.push({ kind: 'toggle', k, label });
      if (this.tab === 2) for (const [label, dest] of KC.DEV_WARPS) R.push({ kind: 'warp', label, dest });
      if (this.tab === 3) { R.push({ kind: 'info', label: 'VERSION ' + KC.VERSION + ' · ' + E.version }); R.push({ kind: 'info', label: 'SCENE ' + game.sceneName }); R.push({ kind: 'info', label: 'TUNING CHANGED: ' + (KC.tuneChanged() ? 'YES' : 'NO') }); R.push({ kind: 'copy', label: 'COPY TUNING JSON' }); }
      return R;
    },
    update(d) {
      const R = this.rows();
      if (game.input.pressed('cancel')) { KC.devOff = false; return game.go(this.back, { resume: true }); }
      if (game.input.pressed('left') || game.input.pressed('right')) {
        const row = R[this.sel], dir = game.input.pressed('left') ? -1 : 1;
        if (row && row.kind === 'slider') { KC.TUNE[row.k] = KC.clamp(+(KC.TUNE[row.k] + dir * row.step).toFixed(3), row.min, row.max); }
      }
      if (game.input.pressed('up')) this.sel = (this.sel + R.length - 1) % R.length;
      if (game.input.pressed('down')) this.sel = (this.sel + 1) % R.length;
      if (game.input.pressed('confirm') && R[this.sel]) this.act(R[this.sel]);
      if (game.input.pressed('triangle') || game.input.pressed('start') && false) { if (R[this.sel] && R[this.sel].kind === 'slider') KC.TUNE[R[this.sel].k] = KC.TUNE_DEFAULTS[R[this.sel].k]; }
      if (game.input.pressed('tUp')) { this.tab = (this.tab + 3) % 4; this.sel = 0; }
      if (game.input.pressed('tRight') || game.input.pressed('tLeft') && false) { this.tab = (this.tab + 1) % 4; this.sel = 0; }
      if (game.input.clicked && game.input.clicked()) { /* the rows are picked with the keyboard or a pad here */ }
      if (KC.TOGGLES.slowMo) game.timeScale = 0.25; else game.timeScale = KC.TUNE.gameSpeed;
      KC.TOGGLES.mute ? game.audio.mute(true) : game.audio.mute(false);
    },
    act(row) {
      if (row.kind === 'reset') { KC.resetTune(); this.msg = 'DEFAULTS RESTORED'; }
      if (row.kind === 'toggle') { KC.TOGGLES[row.k] = !KC.TOGGLES[row.k]; }
      if (row.kind === 'warp') {
        const d = row.dest;
        if (typeof d === 'string') return game.go(d, d === 'road' ? { resume: true } : undefined);
        if (d.kach) return game.go('kach', { seats: d.kach, stage: 'dojo', roster: ['taro', 'kamaboko', 'negi', 'ebi'] });
        if (d.stage) return game.go('fight', { mode: 'versus', w: 'taro', r: 'mei', stage: d.stage, cpuR: true, cpuW: true });
      }
      if (row.kind === 'copy') { this.msg = JSON.stringify(KC.TUNE).slice(0, 60); }
    },
    draw(r) {
      r.sky(['#0a0a18', '#14142a', '#1e1e3a']);
      const R = this.rows();
      r.overlay(g => {
        E.font.title(g, 'DEV MODE', r.W / 2, 8, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        const tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'];
        E.font.text(g, tabs.map((t, i) => (i === this.tab ? '[' + t + ']' : t)).join('  '), r.W / 2, 34, '#ffe08a', { align: 'center', outline: '#0b0814', font: 'tiny' });
        const top = 50, rowH = 12, max = Math.floor((r.H - 74) / rowH), start = Math.max(0, this.sel - max + 2);
        for (let i = 0; i < max && start + i < R.length; i++) {
          const row = R[start + i], y = top + i * rowH, on = start + i === this.sel;
          if (on) E.px.rect(g, 8, y - 2, r.W - 16, rowH, '#3a2a4a');
          let text = row.label, val = '';
          if (row.kind === 'slider') { val = String(KC.TUNE[row.k]); if (KC.TUNE[row.k] !== KC.TUNE_DEFAULTS[row.k]) val += ' *'; }
          if (row.kind === 'toggle') val = KC.TOGGLES[row.k] ? 'ON' : 'OFF';
          E.font.text(g, text, 14, y, on ? '#fffbe8' : '#c8c0e0', { outline: false });
          if (val) E.font.text(g, val, r.W - 14, y, '#ffe08a', { align: 'right', outline: false });
        }
        E.font.text(g, this.msg || 'UP/DOWN · LEFT/RIGHT · CROSS · CIRCLE BACK', 8, r.H - 14, '#a9a1c8', { outline: false, font: 'tiny' });
      });
    }
  };
  return S;
};

// ---- src/90-start.js
// ---------------------------------------------------------------- the input preset (Appendix B), the data check, the game, the scenes, the start
KC.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  triangle: ['KeyE', 'Pad3'], cross: ['Enter', 'Pad0']
};

// the data check (data 1 in the test plan): every id a table refers to exists
KC.validateData = () => {
  const errs = [];
  const R = KC.DATA.roster, S = KC.DATA.stages;
  for (const n of KC.DATA.ladder) {
    if (n.opponent && !R[n.opponent]) errs.push('opponent ' + n.opponent);
    if (n.stage && !S[n.stage] && !KC.DATA.bonusStages[n.stage]) errs.push('stage ' + n.stage);
    if (n.lesson && !KC.DATA.lessons[n.lesson]) errs.push('lesson ' + n.lesson);
  }
  for (const p of Object.keys(KC.DATA.matrix)) for (const s of Object.keys(KC.DATA.matrix[p])) if (!KC.DATA.techniques[KC.DATA.matrix[p][s]]) errs.push('matrix ' + p + s);
  for (const k of Object.keys(KC.DATA.lessons)) for (const d of KC.DATA.lessons[k].drills) if (!KC.DATA.techniques[d]) errs.push('drill ' + d);
  for (const id of KC.DATA.playableIds) if (!R[id]) errs.push('roster ' + id);
  return errs;
};

// the title's hub-less data check and the boot
KC.boot = () => {
  const game = KC.game;
  const errs = KC.validateData();
  if (errs.length) throw new Error('data: ' + errs.join(', '));
  KC.A.defineAll(game.audio);
  KC.View.drawStage;
  return true;
};

const KC_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
  { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
  { key: 'hints', label: 'Tutorial hints', value: true },
  { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side' },
  { key: 'techNames', label: 'Technique names', value: true },
  { key: 'inputDisplay', label: 'Input display', value: false },
  { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern' }
];

KC.game = null;
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon',
  defaults: { glyphs: 'playstation' },
  input: KC.INPUT,
  autoPause: !KC.SESSION,            // a session never pauses: the world goes on (the live pause)
  menu: {
    items: () => KC.SESSION ? [] : [
      ['Move list', () => game.go('moveList', { back: 'fight', resume: true })],
      KC.fightData && ['Retry match', () => game.go('fight', KC.fightData)],
      ['Dev mode', () => { KC.devReturn = KC.currentScene || 'fight'; game.go('dev', { back: KC.devReturn, resume: true }); }]
    ],
    settings: KC_SETTINGS,
    controls: { tUp: 'Technique up (high)', tDown: 'Technique down (low)', tLeft: 'Technique away', tRight: 'Technique toward' },
    quit: KC.SESSION ? false : 'title'
  }
});
KC.game = game;
KC.callLang = () => (game.settings && game.settings.calls === 'Japanese') ? 1 : 0;
KC.lastDevice = 'keyboard';
KC.touchGate = false;
KC.S = KC.makeScenes(game);
KC.makeScenes2(game, KC.S, KC.talk);
KC.makeBonus(game, KC.S);
KC.makeDev(game, KC.S);
KC.makeOnline(game, KC.S);
KC.makeKach(game, KC.S);
KC.makeLab(game, KC.S);
// the ladder's VS card for story matches and the fight's retry data
const wrapFight = KC.S.fight;
KC.S.fight.enter = function (data) {
  KC.currentScene = 'fight';
  if (data && !data.resume) KC.fightData = data;
  const F = KC.S.fight.F = (data && data.resume && KC.fightState) || KC.startFight(data || {});
  KC.fightState = F; this.F = F;
  KC.A.music(game, F.stage.music);
};
KC.S.fight.exit = () => { };
KC.S.fight.update = (function (orig) {
  return function (d) {
    const F = KC.fightState;
    game.focus(200, 0, 30);
    if (!F || !F.bout) return;
    if (KC.talk.update(d)) return;
    if (F.stopped) return;
    if (game.paused) return;
    const dirA = F.w.x < F.r.x ? 1 : -1, dirB = F.r.x < F.w.x ? 1 : -1;
    const iA = F.cpuW ? F.aiW.intent(F.r, d) : KC.readControl(game.input, dirA, F.prevW);
    const iB = F.cpuR ? F.aiR.intent(F.w, d) : (F.p2 === 'keys' ? KC.readKeys(game, F.prevR, dirB) : F.p2 === 'pad' ? (KC.padIntent(0, dirB, F.prevR) || { posture: 'n', tech: null }) : KC.readControl(game.input, dirB, F.prevR));
    if (iA && iA.tech) F.log = (F.log || []).concat([iA.tech]).slice(-12);
    if (KC.TOGGLES.freezeCpu && F.cpuR) { }
    F.bout.step(d, { a: () => iA, b: () => iB });
    KC.stepPoses(F, d);
    F.t += d;
    if (F.popup && F.popup.t > 0) F.popup.t -= d;
    if (F.bout.matchOver !== null && F.bout.phase === 'matchEnd' && F.bout.phaseT > F.bout.phaseLen - 0.01) { F.stopped = true; KC.endFight(F); }
    if (F.mode === 'attract' && game.input.anyPressed()) game.go('title');
  };
})();
KC.S.fight.draw = function (r) {
  const F = KC.fightState; if (!F) return;
  KC.View.drawStage ? KC.StagePaint(r, F.stage, game.time) : null;
  r.actor(200, 14, 0, (g, ox, oy) => F.judge.draw(g, ox, oy, r.view));
  KC.View.drawFighters(r, [F.w, F.r], { w: F.rigs.w, r: F.rigs.r });
  KC.View.hud(r, F.bout, { popup: F.popup ? Object.assign({ x: r.W / 2, y: r.H * 0.6 }, F.popup) : null, bottom: F.hint });
  KC.devOverlay(r, F);
  KC.talk.draw(r);
};
// the dev toggles drawn over the fight: hit boxes, frame data and the input display
KC.devOverlay = (r, F) => {
  if (!KC.TOGGLES.hitBoxes && !KC.TOGGLES.frameData && !KC.TOGGLES.inputDisplay) return;
  r.overlay(g => {
    if (KC.TOGGLES.hitBoxes) for (const f of [F.w, F.r]) {
      const p0 = r.w(f.x - KC.BODY_W / 2, 0, f.z), p1 = r.w(f.x + KC.BODY_W / 2, 0, f.z + 66);
      E.px.line(g, p0[0], p1[1], p1[0], p1[1], '#ffe070', 1); E.px.line(g, p0[0], p0[1], p1[0], p0[1], '#ffe070', 1);
      E.px.line(g, p0[0], p0[1], p0[0], p1[1], '#ffe070', 1); E.px.line(g, p1[0], p0[1], p1[0], p1[1], '#ffe070', 1);
    }
    let y = 42;
    if (KC.TOGGLES.frameData) for (const f of [F.w, F.r]) {
      const T = f.tech && KC.DATA.techniques[f.tech.id];
      const txt = T ? f.r.short + ' ' + T.name + ' ph' + f.tech.ph + ' t' + f.tech.t : f.r.short + ' idle';
      E.font.text(g, txt, 6, y, '#c8f0c8', { outline: '#0b0814', font: 'tiny' }); y += 9;
    }
    if (KC.TOGGLES.inputDisplay) E.font.text(g, 'INPUT ' + (F.log || []).map(id => KC.DATA.techniques[id].name.split(' ')[0]).join(' '), 6, y, '#a8d8ff', { outline: '#0b0814', font: 'tiny' });
  });
};
// the second human on the keyboard: arrows posture, I J K L (and the numpad) technique, or the held codes
KC.readKeys = (game, prev, foeDir) => {
  const h = game.input.held || new Set();
  const has = (c) => (h.has ? h.has(c) : !!h[c]);
  let px = 'n';
  if (has('ArrowUp') && !has('ArrowDown')) px = 'u'; else if (has('ArrowDown') && !has('ArrowUp')) px = 'd';
  else if (has('ArrowLeft') && !has('ArrowRight')) px = 'l'; else if (has('ArrowRight') && !has('ArrowLeft')) px = 'r';
  const down = (c) => has(c) && !(prev['_' + c]);
  const tk = { u: ['KeyI', 'Numpad8'], d: ['KeyK', 'Numpad2', 'Numpad5'], l: ['KeyJ', 'Numpad4'], r: ['KeyL', 'Numpad6'] };
  let edge = null;
  for (const k of ['u', 'd', 'l', 'r']) for (const c of tk[k]) { if (down(c)) edge = edge || k; }
  for (const c of Object.values(tk).flat()) prev['_' + c] = has(c);
  const pr = (s) => (s === 'u' || s === 'd') ? s : KC.relDir(s, foeDir);
  return { posture: pr(px), tech: edge ? pr(edge) : null };
};

KC.S.title.enter = KC.S.title.enter;
for (const k of Object.keys(KC.S)) if (!KC.S[k].pausable && !(k === 'fight')) KC.S[k].pausable = false;
KC.currentScene = 'title';

// the touch-only gate: a touch screen with no fine pointer, and no key or pad used yet
KC.updateTouchGate = () => {
  const mq = typeof window !== 'undefined' && window.matchMedia;
  const coarse = mq ? !window.matchMedia('(any-pointer: fine)').matches : false;
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  KC.touchGate = !!(coarse && touch && !KC.inputSeen);
  game.input.touchEnabled = false;
};
KC.updateTouchGate();

// the deep links (the tools and the tests use these), and the boot: the dojo's steps
const startName = KC.SESSION ? 'session' : (() => {
  const h = (typeof location !== 'undefined' && location.hash || '').replace('#', '').split('/')[0];
  return KC.S[h] ? h : 'title';
})();
game.start({
  scene: startName, scenes: KC.S,
  boot: {
    title: 'KARATE CHAMPON',
    steps: [
      ['Sweeping the dojo floor', () => { const e = KC.validateData(); if (e.length) throw new Error(e.join(', ')); }],
      ['Folding the gi', () => { KC.View.rigFor('taro', 'w'); }],
      ['Simmering the broth', () => { KC.A.defineAll(game.audio); }],
      ['Tuning the referee\'s whistle', () => { KC.A.speak; }],
      ['Raking the gravel', () => { KC.View.backdropFor(KC.DATA.stages.dojo); }]
    ]
  }
});

// the test and tools handle
game.debug = {
  snapshot() {
    const F = KC.fightState;
    return {
      scene: game.sceneName, version: KC.VERSION, node: (KC.save.load() || {}).node || 0,
      bout: F && F.bout ? { phase: F.bout.phase, clock: +F.bout.clock.toFixed(2), points: F.bout.points.slice(), roundWins: F.bout.roundWins.slice(), round: F.bout.round, matchOver: F.bout.matchOver } : null,
      fighters: F ? [F.w, F.r].map(f => ({ id: f.id, side: f.side, x: +f.x.toFixed(2), z: +f.z.toFixed(2), state: f.state, tech: f.tech ? f.tech.id : null })) : null,
      tune: Object.assign({}, KC.TUNE), touchGate: KC.touchGate
    };
  },
  setTune(k, v) { KC.TUNE[k] = v; },
  resetTune() { KC.resetTune(); }
};
KC.inputSeen = false;

KC.ABOUT = {
  "sourceInformation": {
    "date": "2026-11-03 18:43:15",
    "source": "Karate Champ (1984 arcade, Data East; Japanese title Karate Do)",
    "plan": "PLAN.md",
    "genre": "Fighting: 1-on-1 point-sparring karate with arcade bonus stages",
    "perspective": "2D side view (engine 'side' view, pitch 0)",
    "tech": "my-3D2dge engine v0.85.2 (handoff package, sparse-cloned), Web Audio, Node 24 for tests",
    "artDirection": "Engine's Humanoid rigs as PS1-style pixel art at 320x240 (res ps1, expand), with custom stage backdrops",
    "animation": "Engine's procedural Humanoid rig with E.MOVES karate-adjacent moves, driven from the fight's own state",
    "audio": "Code-generated sequencer music and sound effects; gibberish formant voices synthesized in Web Audio",
    "online": "AI Hub shared-world session, Kachinuki, 2-4 players (host runs the bouts; the game draws its own card; hub harness passes 4 configurations); local versus 1-2 players (keyboard, or keyboard + pad); local Kachinuki with up to 4 humans: keyboard P1, keyboard P2, pad 1, pad 2 (CPU fills empty seats)",
    "testing": "Headless Node suites (78 checks: data, input, technique, bout, AI, bonus, flow, modes, pads, audio, UI, story playthrough of all 17 nodes, dev), browser screenshots, the AI Hub harness (4 configurations)",
    "research": "Brief: the facts in PLAN.md section 1.1 (scoring, timer, bonus stages as summarized there); no other research",
    "environment": "Claude Code CLI (headless); Linux (WSL2); browser unknown",
    "model": "Anthropic, claude-haiku-5-5, reasoning effort medium",
    "usage": "unknown"
  },
  "testingFeedback": [
    "About 12 issues were caught by the early tests, screenshots and playthrough runs. Most were logic and wiring faults (a missing alias that broke boot, a dev scene field overwritten, a drill that matched the wrong technique, a fighter with no personality). Later, the hub harness and the modes suite caught a parser error on my side (wrong field names) and a title/attract loop assumption; both fixed.",
    "Four were breaking: the boot failure, the practice scene crash, the dev screen crash, and the store that kept no save headless, which stopped the story flow. All four are fixed and the suite is green.",
    "The most helpful test was the scripted story playthrough over the whole ladder, because it exercised every scene transition at once.",
    "The least helpful was the 20-seed CPU balance probe: it mostly showed the random stream dominating outcomes, and it was hard to read without the side and seed swap."
  ],
  "engineFeedback": [
    "The Humanoid rig and E.Backdrop, with the Dialog and Menu helpers, let a complete fight look right with no art files. The headless game.advance plus draw option made scene checks possible.",
    "Stuck or guessed wrong: game.go is a fade, so a state read right after it is one second early; the store returns false with no storage, so I added a memory fallback.",
    "Built myself: the fight simulation (technique matrix, timing, scoring, blocks, aiuchi, hantei), the CPU, the bonus rules, the drills, the online Kachinuki and the gibberish voice synth.",
    "Hardest part: getting the pose from fight state into the rig each step without drawing on every frame, and keeping the rig state serializable for guests.",
    "Engine changes: none. The game uses the engine as shipped and works around its gaps in game code.",
    "One thing to change: a headless store that keeps data in memory, so Node tests can use the same save path."
  ],
  "promptFeedback": [
    "The staged structure (read STAGE.md, then TASK.md wins over PLAN.md) and the explicit done-when list made the deliverables clear.",
    "Confusing: the plan's file names still say opus-max, while TASK.md says haiku-medium; I used TASK.md's names. Also the plan describes far more scope than one session can finish.",
    "Hardest: the online netcode and the test harness wiring, which both need exact protocol details.",
    "Change: state the scope cut-off explicitly (for example which features are must-have for a first build) and the expected test counts."
  ],
  "aiHub": {
    "name": "Karate Champon",
    "tagline": "Two sticks. One clean strike.",
    "description": "A point-sparring karate tournament inspired by Karate Champ: land one clean technique and let the referee call it. Climb from white belt to Champ, break boards, smash flying pots and stop a charging bull.",
    "type": "Game",
    "genre": "Fighting",
    "source": "Karate Champ (1984)",
    "series": "",
    "players": "1–4",
    "controls": "Left stick/WASD: move, jump, crouch · Right stick, face buttons or IJKL: techniques · Options/Esc: pause",
    "tags": [
      "2d",
      "arcade",
      "versus",
      "retro",
      "pixel art",
      "comedy"
    ]
  }
};
})();
