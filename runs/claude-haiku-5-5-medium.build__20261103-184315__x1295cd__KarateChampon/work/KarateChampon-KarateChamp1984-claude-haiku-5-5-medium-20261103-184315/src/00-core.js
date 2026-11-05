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
