/* ---- DATA: designers extend the game by editing these tables (KC.validateData checks them at boot) ---- */
const M = E.MOVES, mv = (base, o) => Object.assign({}, M[base], o || {});
KC.DATA = {};
/* TECHNIQUES. L posture: n neutral, t toward, a away, u up, d down. R technique: u high, t toward, d low, a away/spin.
 * f: [startup, active, recovery] in 60 fps frames. reach: [min, max] contact gap between push boxes. travel: x toward
 * the foe over startup+active. pts: [lo, hi]; points = lo + round((hi-lo) * quality / 100) * 100. */
KC.DATA.techniques = [
  { id: 'frontKick', name: 'FRONT KICK', jp: 'MAE-GERI', L: 'n', R: 't', height: 'mid', f: [11, 5, 28], travel: 0, reach: [6, 30], pts: [100, 200], closeAlt: 'revPunch', closeGap: 12, move: mv('kick', { z0: .6, z1: .9 }), kiai: 'light', bull: true },
  { id: 'revPunch', name: 'REVERSE PUNCH', jp: 'GYAKU-ZUKI', L: 'n', R: 't', alt: true, height: 'mid', f: [6, 4, 18], travel: 4, reach: [0, 14], pts: [100, 200], move: mv('cross'), kiai: 'light' },
  { id: 'roundKick', name: 'ROUND KICK', jp: 'MAWASHI-GERI', L: 'n', R: 'u', height: 'high', f: [10, 5, 22], travel: 0, reach: [6, 30], pts: [300, 600], move: mv('roundhouse'), kiai: 'heavy' },
  { id: 'lowKick', name: 'LOW KICK', jp: 'GEDAN-GERI', L: 'n', R: 'd', height: 'low', f: [10, 5, 28], travel: 0, reach: [4, 28], pts: [100, 200], unblockable: true, move: mv('kick', { z0: .1, z1: .25 }), kiai: 'light' },
  { id: 'backKick', name: 'BACK KICK', jp: 'USHIRO-GERI', L: 'n', R: 'a', height: 'mid', f: [13, 5, 23], travel: 6, reach: [10, 34], pts: [200, 400], spin: .5, move: mv('kick', { z0: .55, z1: .75, reach: 7.5 }), kiai: 'heavy', bull: true },
  { id: 'upLunge', name: 'UPPER LUNGE PUNCH', jp: 'JODAN OI-ZUKI', L: 't', R: 'u', height: 'high', f: [15, 5, 26], travel: 30, reach: [18, 44], pts: [500, 1000], closeAlt: 'roundKick', closeGap: 18, move: mv('cross', { z0: -.3, z1: .4, lunge: 4 }), kiai: 'heavy', bull: true },
  { id: 'midLunge', name: 'MIDDLE LUNGE PUNCH', jp: 'CHUDAN OI-ZUKI', L: 't', R: 't', height: 'mid', f: [14, 5, 26], travel: 30, reach: [18, 44], pts: [200, 400], closeAlt: 'frontKick', closeGap: 18, move: mv('cross', { lunge: 4 }), kiai: 'heavy' },
  { id: 'frontSweep', name: 'FRONT FOOT SWEEP', jp: 'ASHI-BARAI', L: 't', R: 'd', height: 'low', f: [16, 8, 36], travel: 10, reach: [4, 34], pts: [200, 400], unblockable: true, knock: true, move: mv('sweep'), kiai: 'heavy' },
  { id: 'turnBackKick', name: 'TURN BACK KICK', jp: 'URA-GERI', L: 't', R: 'a', height: 'mid', f: [17, 5, 26], travel: 12, reach: [12, 40], pts: [500, 1000], spin: 1, move: mv('kick', { z0: .6, z1: .8, reach: 7.5 }), kiai: 'heavy' },
  { id: 'backRound', name: 'BACK ROUND KICK', jp: 'USHIRO-MAWASHI', L: 'a', R: 'u', height: 'high', f: [15, 5, 23], travel: 0, reach: [8, 34], pts: [500, 1000], spin: 1, move: mv('roundhouse', { z0: 1.1, z1: 1.5 }), kiai: 'heavy' },
  { id: 'backSweep', name: 'BACK FOOT SWEEP', jp: 'USHIRO-BARAI', L: 'a', R: 'd', height: 'low', f: [16, 8, 36], travel: 0, reach: [6, 34], pts: [100, 200], unblockable: true, knock: true, spin: 1, move: mv('sweep'), kiai: 'light' },
  { id: 'jumpSide', name: 'JUMPING SIDE KICK', jp: 'TOBI YOKO-GERI', L: 'u', R: 't', height: 'air', f: [16, 10, 26], travel: 0, air: { vz: 330, vx: 150 }, reach: [0, 30], pts: [300, 700], move: mv('flyingkick'), kiai: 'heavy' },
  { id: 'jumpBack', name: 'JUMPING BACK KICK', jp: 'TOBI USHIRO-GERI', L: 'u', R: 'a', height: 'air', f: [14, 8, 22], travel: 0, air: { vz: 340, vx: 50 }, reach: [0, 40], pts: [500, 1000], spin: .5, move: mv('flyingkick', { z0: .6, z1: .7 }), kiai: 'heavy' },
  { id: 'upperPunch', name: 'UPPER PUNCH', jp: 'AGE-ZUKI', L: 'd', R: 'u', height: 'rising', f: [8, 7, 30], travel: 0, reach: [0, 18], pts: [300, 600], move: mv('uppercut'), kiai: 'heavy', bull: true },
  { id: 'squatPunch', name: 'SQUATTING REVERSE LUNGE PUNCH', short: 'SQUAT PUNCH', jp: 'GEDAN GYAKU-ZUKI', L: 'd', R: 't', height: 'midlow', f: [13, 5, 30], travel: 20, reach: [10, 44], pts: [400, 800], move: mv('cross', { crouch: .9, z0: -2.2, z1: -2, lunge: 3 }), kiai: 'heavy', bull: true },
  // evasive and defensive actions
  { id: 'block', name: 'BLOCK', jp: 'UKE', L: 'a', R: 't', kind: 'block', f: [1, 14, 4] },
  { id: 'frontFlip', name: 'FRONT SOMERSAULT', jp: 'ZENPO KAITEN', L: 'u', R: 'u', kind: 'flip', f: [6, 40, 12], air: { vz: 370, vx: 140 } },
  { id: 'backFlip', name: 'BACK SOMERSAULT', jp: 'KOHO KAITEN', L: 'a', R: 'a', kind: 'flip', f: [6, 40, 12], air: { vz: 370, vx: -126 } },
  { id: 'jump', name: 'JUMP', jp: 'TOBI', L: 'u', R: 'd', kind: 'jump', f: [4, 39, 5], air: { vz: 0, vx: 0 } },
  { id: 'crouch', name: 'CROUCH', jp: 'SHAGAMI', L: 'd', R: 'd', kind: 'crouch', f: [3, 0, 5] },
  { id: 'backRoll', name: 'BACK ROLL', jp: 'KOHO UKEMI', L: 'd', R: 'a', kind: 'roll', f: [4, 28, 8], travel: -90 }
];
KC.TECH = {}; for (const t of KC.DATA.techniques) KC.TECH[t.id] = t;
KC.SCORING = KC.DATA.techniques.filter(t => t.pts).map(t => t.id);
// the posture x technique matrix (block sits at away + toward; revPunch is the close form of frontKick)
KC.MATRIX = { n: { u: 'roundKick', t: 'frontKick', d: 'lowKick', a: 'backKick' }, t: { u: 'upLunge', t: 'midLunge', d: 'frontSweep', a: 'turnBackKick' },
  a: { u: 'backRound', t: 'block', d: 'backSweep', a: 'backFlip' }, u: { u: 'frontFlip', t: 'jumpSide', d: 'jump', a: 'jumpBack' },
  d: { u: 'upperPunch', t: 'squatPunch', d: 'crouch', a: 'backRoll' } };
KC.POSTURES = [['n', 'NEUTRAL', 'L:n'], ['t', 'STEP IN', 'L:r'], ['a', 'STEP BACK', 'L:l'], ['u', 'JUMP', 'L:u'], ['d', 'CROUCH', 'L:d']];

/* ROSTER: rig (beyond the gi), stats, AI personality, voice, lines */
const BELT = KC.BELT = { white: '#f4f4ee', yellow: '#f0c830', green: '#3aa050', blue: '#2f5fd0', brown: '#6a4024', black: '#16161c', gold: '#e8c040' };
KC.RANKS = [['WHITE BELT', 'white'], ['YELLOW BELT', 'yellow'], ['GREEN BELT', 'green'], ['BLUE BELT', 'blue'], ['BROWN BELT', 'brown'],
  ['BLACK BELT 1ST DAN', 'black'], ['3RD DAN', 'black'], ['5TH DAN', 'black'], ['8TH DAN', 'black'], ['CHAMP', 'gold']];
KC.DATA.roster = [
  { id: 'taro', name: 'TARO', full: 'TARO MOYASHI', title: 'THE BEAN SPROUT', style: 'ALL-ROUNDER', belt: 'white',
    rig: { size: 1.95, build: 'heroic', hair: 'spiky', hat: { style: 'band', color: '#f4f4f4' }, colors: { skin: '#f0c49a', hair: '#1a1418' } },
    stats: { walk: 1, reach: 1, speed: 1 }, signature: 'roundKick', voice: { f0: 190, formant: 1.05, rate: 15, wave: 'square' },
    ai: { level: 5, aggression: .55, patience: .35, jump: .15, block: .35, gap: 40, weights: { roundKick: 2, frontKick: 2, upLunge: 2, frontSweep: 2, jumpSide: 1, backKick: 1 } },
    quotes: { intro: 'I WILL BE CHAMP!', win: 'OSU!', lose: 'AGAIN...' } },
  { id: 'kamaboko', name: 'KAMABOKO', full: 'KAMABOKO', title: 'DOJO CLASSMATE', style: 'CLUMSY BRAWLER', belt: 'white',
    rig: { size: 1.85, hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, colors: { skin: '#f4caa8', hair: '#3a2a20' } },
    stats: { walk: .95, reach: .92, speed: .95 }, signature: 'frontKick', voice: { f0: 240, formant: 1.15, rate: 17, wave: 'square' },
    ai: { level: 1, aggression: .7, patience: .2, jump: .05, block: .1, gap: 30, weights: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } },
    quotes: { intro: 'I ATE THREE BOWLS. I AM READY!', win: 'MORE NOODLES!', lose: 'MY TUMMY...' }, tip: 'KAMABOKO KICKS FIRST. BLOCK, THEN STRIKE.' },
  { id: 'negi', name: 'NEGI', full: 'SENPAI NEGI', title: 'DOJO SENIOR', style: 'TEXTBOOK', belt: 'black',
    rig: { size: 2.1, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, colors: { skin: '#e8b890', hair: '#16141a' } },
    stats: { walk: 1, reach: 1.04, speed: 1 }, signature: 'backKick', voice: { f0: 150, formant: 1, rate: 13, wave: 'sawtooth' },
    ai: { level: 2, aggression: .5, patience: .4, jump: .1, block: .35, gap: 36, weights: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } },
    quotes: { intro: 'SHOW ME WHAT I TAUGHT YOU.', win: 'TRAIN HARDER.', lose: 'GOOD. VERY GOOD.' }, tip: 'NEGI IS PATIENT. LUNGE IN FROM FAR.' },
  { id: 'ebi', name: 'EBI', full: 'EBI', title: 'HARBOR FISHERMAN', style: 'JUMPER', belt: 'brown',
    rig: { size: 1.95, build: 'heroic', hair: 'short', hat: { style: 'band', color: '#ff8a2a' }, colors: { skin: '#c98a5a', hair: '#2a1a10' } },
    stats: { walk: 1.1, reach: .98, speed: 1.05 }, signature: 'jumpSide', voice: { f0: 210, formant: 1.08, rate: 19, wave: 'square' },
    ai: { level: 3, aggression: .6, patience: .2, jump: .35, block: .2, gap: 70, weights: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } },
    quotes: { intro: 'THE SEA MADE ME QUICK. CATCH ME!', win: 'TOO SLOW!', lose: 'THE TIDE TURNS...' }, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.' },
  { id: 'kikurage', name: 'KIKURAGE', full: 'KIKURAGE', title: 'BAMBOO HERMIT', style: 'COUNTER-PUNCHER', belt: 'black',
    rig: { size: 1.9, hunch: .3, hood: true, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { skin: '#d8b090', hair: '#5a4030', beard: '#d0d0c8' }, beard: true },
    stats: { walk: .9, reach: 1, speed: .95 }, signature: 'revPunch', voice: { f0: 110, formant: .92, rate: 9, wave: 'sawtooth' },
    ai: { level: 4, aggression: .25, patience: .8, jump: .05, block: .65, gap: 40, weights: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } },
    quotes: { intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', win: 'PATIENCE WINS.', lose: 'THE WIND WAS STRONG.' }, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.' },
  { id: 'ika', name: 'IKA', full: 'IKA', title: 'LOG-BRIDGE ACROBAT', style: 'CROSS-UPS', belt: 'black',
    rig: { size: 1.95, build: 'heroic', hair: 'long', sleeves: 'long', colors: { skin: '#e8d8f0', hair: '#f4f0f8' } },
    stats: { walk: 1.05, reach: 1.02, speed: 1.02 }, signature: 'backRound', voice: { f0: 200, formant: 1.1, rate: 14, wave: 'triangle', vib: 6 },
    ai: { level: 5, aggression: .5, patience: .3, jump: .25, block: .3, gap: 44, weights: { backRound: 3, turnBackKick: 3, backKick: 2, frontFlip: 2, backFlip: 2 } },
    quotes: { intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', win: 'INK IN YOUR EYES!', lose: 'TANGLED...' }, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.' },
  { id: 'buta', name: 'BUTA', full: 'CAPTAIN BUTA', title: "SHIP'S CAPTAIN", style: 'POWER LUNGER', belt: 'black',
    rig: { size: 2.3, build: 'bulky', hair: 'bald', hat: { style: 'cap', color: '#1e2a5a' }, stubble: '#5a3a2a', colors: { skin: '#e0a080', hair: '#3a2a20' } },
    stats: { walk: .83, reach: 1.1, speed: .92 }, signature: 'upLunge', voice: { f0: 85, formant: .85, rate: 11, wave: 'sawtooth' },
    ai: { level: 6, aggression: .8, patience: .2, jump: .05, block: .2, gap: 60, weights: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } },
    quotes: { intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', win: 'OVERBOARD!', lose: 'ABANDON SHIP...' }, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.' },
  { id: 'asari', name: 'ASARI', full: 'ASARI', title: 'NIGHT-MARKET KEEPER', style: 'LOW GAME', belt: 'black',
    rig: { size: 1.9, build: 'heroic', hair: 'ponytail', hat: { style: 'band', color: '#2ab0a0' }, colors: { skin: '#f0c8a8', hair: '#2a1a24' } },
    stats: { walk: 1, reach: .96, speed: 1.04 }, signature: 'squatPunch', voice: { f0: 170, formant: 1, rate: 15, wave: 'square' },
    ai: { level: 7, aggression: .4, patience: .5, jump: .05, block: .5, gap: 34, crouch: .5, weights: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } },
    quotes: { intro: 'MY SHELL IS SHUT. GO HOME.', win: 'CLAMMED UP!', lose: 'MY SHELL... CRACKED.' }, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.' },
  { id: 'kyabetsu', name: 'KYABETSU', full: 'MASTER KYABETSU', title: 'FUJI GARDEN MASTER', style: 'PUNISHER', belt: 'black', unlock: 'kyabetsu',
    rig: { size: 1.95, hair: 'bald', hunch: .2, build: 'heroic', colors: { skin: '#e0b898', hair: '#e8e8e0', beard: '#f4f4ee' }, beard: true },
    stats: { walk: .95, reach: 1.02, speed: 1.03 }, signature: 'turnBackKick', voice: { f0: 120, formant: .9, rate: 10, wave: 'sawtooth', vib: 5 },
    ai: { level: 8, aggression: .4, patience: .7, jump: .1, block: .6, gap: 42, readBonus: .05, habit: true, weights: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } },
    quotes: { intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', win: 'ANOTHER LAYER.', lose: 'THE CORE IS SWEET.' }, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.' },
  { id: 'mei', name: 'MEI', full: 'MEI', title: 'THE IRON LADLE', style: 'CHAMPION', belt: 'gold', unlock: 'mei',
    rig: { size: 1.95, build: 'heroic', hair: 'ponytail', colors: { skin: '#f4d0b0', hair: '#141018' } },
    stats: { walk: 1.05, reach: 1, speed: 1.05 }, signature: 'frontSweep', voice: { f0: 290, formant: 1.18, rate: 16, wave: 'square' },
    ai: { level: 9, aggression: .65, patience: .4, jump: .2, block: .5, gap: 46, habit: true, weights: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } },
    quotes: { intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', win: 'NEXT CUSTOMER!', lose: 'NEXT YEAR I TAKE IT BACK.' }, tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.' }
];
KC.ROSTER = {}; for (const f of KC.DATA.roster) KC.ROSTER[f.id] = f;
KC.DATA.genkotsu = { id: 'genkotsu', name: 'GENKOTSU', voice: { f0: 105, formant: .9, rate: 10, wave: 'sawtooth', rough: .18 } };

/* STAGES: painters in 35-stage.js read these */
KC.DATA.stages = [
  { id: 'dojo', name: 'HON-DOJO', sub: "SENPAI NEGI'S DOJO", music: 'dojo', ambient: .55, crowd: 'seiza', floor: 'planks' },
  { id: 'harbor', name: 'NAGASAKI PIER', sub: 'DAWN AT THE HARBOR', music: 'harbor', ambient: .7, crowd: 'dock', floor: 'deck', mei: true },
  { id: 'bamboo', name: 'BAMBOO FOREST', sub: 'THE HERMIT WAITS', music: 'bamboo', ambient: .6, crowd: null, floor: 'dirt', weather: 'leaves' },
  { id: 'log', name: 'LOG BRIDGE', sub: 'A TRUNK OVER THE GORGE', music: 'gorge', ambient: .6, crowd: null, floor: 'log' },
  { id: 'ship', name: "SHIP'S STERN", sub: 'SUNSET ON THE BAY', music: 'ship', ambient: .55, crowd: 'crew', floor: 'deck', mei: true },
  { id: 'market', name: 'CHAMPON STREET', sub: 'THE NIGHT MARKET', music: 'market', ambient: .35, crowd: 'street', floor: 'stone', mei: true },
  { id: 'fuji', name: 'FUJI GARDEN', sub: 'DUSK UNDER THE MOUNTAIN', music: 'fuji', ambient: .6, crowd: 'garden', floor: 'gravel', mei: true },
  { id: 'stadium', name: 'NATIONAL STADIUM', sub: "THE CHAMPON CUP '84", music: 'stadium', ambient: .45, crowd: 'stadium', floor: 'mat', mei: false },
  { id: 'courtyard', name: 'DOJO COURTYARD', sub: 'BONUS STAGE', music: 'bonus', ambient: .75, crowd: null, floor: 'earth', bonus: true },
  { id: 'fishmarket', name: 'FISH-MARKET ALLEY', sub: 'BONUS STAGE', music: 'bonus', ambient: .7, crowd: null, floor: 'wet', bonus: true },
  { id: 'pasture', name: 'FUJI PASTURE', sub: 'BONUS STAGE', music: 'bonus', ambient: .8, crowd: null, floor: 'grass', bonus: true }
];
KC.STAGE = {}; for (const s of KC.DATA.stages) KC.STAGE[s.id] = s;
KC.FIGHT_STAGES = KC.DATA.stages.filter(s => !s.bonus).map(s => s.id);

/* THE CHAMPON ROAD (story ladder) */
KC.DATA.ladder = [
  { kind: 'cutscene', id: 'prologue', stage: 'harbor', script: 'prologue', label: 'PROLOGUE' },
  { kind: 'practice', id: 'lessonI', stage: 'dojo', lesson: 'I', label: 'LESSON I' },
  { kind: 'match', id: 'm1', stage: 'dojo', opponent: 'kamaboko', promote: 1, hints: true, label: 'KAMABOKO' },
  { kind: 'match', id: 'm2', stage: 'dojo', opponent: 'negi', promote: 2, hints: true, label: 'SENPAI NEGI' },
  { kind: 'bonus', id: 'b1', bonus: 'boards', stage: 'courtyard', label: 'BREAK THE BOARDS' },
  { kind: 'match', id: 'm3', stage: 'harbor', opponent: 'ebi', promote: 3, hints: true, pre: 'harborMei', post: 'harborAfter', label: 'EBI' },
  { kind: 'practice', id: 'lessonII', stage: 'harbor', lesson: 'II', label: 'LESSON II' },
  { kind: 'match', id: 'm4', stage: 'bamboo', opponent: 'kikurage', promote: 4, label: 'KIKURAGE' },
  { kind: 'bonus', id: 'b2', bonus: 'pots', stage: 'fishmarket', label: 'POTS AHOY!', pre: 'potsIntro' },
  { kind: 'match', id: 'm5', stage: 'log', opponent: 'ika', promote: 5, label: 'IKA' },
  { kind: 'practice', id: 'lessonIII', stage: 'log', lesson: 'III', label: 'LESSON III' },
  { kind: 'match', id: 'm6', stage: 'ship', opponent: 'buta', promote: 6, label: 'CAPTAIN BUTA' },
  { kind: 'bonus', id: 'b3', bonus: 'bull', stage: 'pasture', label: 'STOP THE BULL' },
  { kind: 'match', id: 'm7', stage: 'market', opponent: 'asari', promote: 7, post: 'marketMei', label: 'ASARI' },
  { kind: 'match', id: 'm8', stage: 'fuji', opponent: 'kyabetsu', promote: 8, label: 'MASTER KYABETSU', unlock: 'kyabetsu' },
  { kind: 'match', id: 'm9', stage: 'stadium', opponent: 'mei', promote: 9, pre: 'finalEntrance', final: true, label: 'MEI' },
  { kind: 'ending', id: 'ending', stage: 'stadium', script: 'ending', label: 'THE GOLDEN BOWL', unlock: 'mei' }
];
KC.DATA.lessons = {
  I: { title: 'LESSON I', stage: 'dojo', intro: 'WATCH. THEN DO.', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'] },
  II: { title: 'LESSON II', stage: 'harbor', intro: 'STEP IN. STRIKE THROUGH.', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'] },
  III: { title: 'LESSON III', stage: 'log', intro: 'TURN YOUR BACK. NEVER YOUR EYES.', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'] },
  ALL: { title: 'ALL TECHNIQUES', stage: 'dojo', intro: 'EVERY TECHNIQUE. ONE BY ONE.', drills: ['frontKick', 'revPunch', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'midLunge', 'frontSweep', 'turnBackKick', 'backRound', 'backSweep', 'jumpSide', 'jumpBack', 'upperPunch', 'squatPunch', 'block', 'frontFlip', 'backFlip', 'jump', 'crouch', 'backRoll'] }
};
KC.DATA.bonus = {
  boards: { stage: 'courtyard', title: 'BREAK THE BOARDS', n: 5, mat: 'pine', rise: 55, wobble: 6 },
  pots: { stage: 'fishmarket', title: 'POTS AHOY!', n: 16, i0: 1.4, i1: .8, v0: 150, v1: 230 },
  bull: { stage: 'pasture', title: 'STOP THE BULL', charges: [150, 190, 240] }
};
KC.MATS = { pine: ['PINE', 1, '#d8b070'], tile: ['ROOF TILE', 1.5, '#a85a40'], ice: ['ICE', 2, '#bfe8ff'] };

/* TEXT (terse, ALL CAPS; voices are gibberish, these are the subtitles) */
KC.CALLS = {
  begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'], half: ['HALF POINT!', 'WAZA-ARI!'],
  full: ['FULL POINT!', 'IPPON!'], nopoint: ['NO POINT!', 'TORIMASEN!'], aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'], judges: ['JUDGES!', 'HANTEI!'],
  whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'], redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'], decide: ['DECIDING ROUND!', 'SHOBU!'],
  forfeit: ['FORFEIT!', 'KIKEN!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!'], perfect: ['PERFECT!', 'PERFECT!'], weak: ['WEAK!', 'WEAK!']
};
// fixed syllable counts and stress per call, so each call has a rhythm
KC.CALL_RHYTHM = { begin: [3, 1], stop: [2, 0], full: [3, 0], half: [3, 0], white: [2, 0], red: [2, 0], bow: [1, 0], time: [2, 0], judges: [3, 0], nopoint: [3, 1], aiuchi: [3, 1], decide: [4, 2], forfeit: [3, 0], matchPoint: [3, 0], whiteWins: [4, 0], redWins: [4, 0], perfect: [3, 1], weak: [1, 0] };
KC.SCRIPTS = {
  prologue: [['CARD', 'NAGASAKI HARBOR. SPRING 1984.'], ['CARD', 'THE CHAMPON CUP RETURNS.'], ['CARD', 'THE PRIZE: THE GOLDEN BOWL.'],
    ['taro', 'I AM TARO MOYASHI. WHITE BELT.'], ['taro', 'I WILL BE CHAMP!'], ['negi', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['mei', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['taro', '...I AM A BEAN SPROUT.'], ['mei', 'EAT. THEN FIGHT.']],
  harborAfter: [['mei', 'NOT BAD, MOYASHI.']],
  potsIntro: [['mei', "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"]],
  marketMei: [['mei', "THE FINAL IS TOMORROW. DON'T BE LATE."]],
  finalEntrance: [['genkotsu', 'THE FINAL. THE CHAMPION ENTERS.'], ['mei', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['taro', '...YOU?'], ['mei', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['genkotsu', 'WHITE WINS! A NEW CHAMP!'], ['mei', 'A BEAN SPROUT BECAME A CHAMP.'], ['mei', 'NEXT YEAR I TAKE IT BACK.'], ['taro', 'OSU!'], ['CARD', 'YOU ARE THE KARATE CHAMPON.']],
  lessonEndI: [['negi', 'YOU ARE READY. FIGHT KAMABOKO.']],
  lessonEndII: [['negi', 'GOOD. NOW THE BAMBOO FOREST.']],
  lessonEndIII: [['negi', 'NOW YOU SPIN LIKE THE SEA.']]
};
KC.HINTS = ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.',
  'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM.", 'CROUCH UNDER HIGH KICKS.'];

KC.validateData = () => {
  const errs = [], T = KC.TECH;
  for (const p in KC.MATRIX) for (const r in KC.MATRIX[p]) if (!T[KC.MATRIX[p][r]]) errs.push('matrix ' + p + r);
  for (const t of KC.DATA.techniques) { if (t.closeAlt && !T[t.closeAlt]) errs.push('closeAlt ' + t.id); if (t.pts && !(t.reach && t.reach[1] > t.reach[0])) errs.push('reach ' + t.id); if (!(t.f && t.f.length === 3)) errs.push('frames ' + t.id); }
  for (const n of KC.DATA.ladder) { if (n.opponent && !KC.ROSTER[n.opponent]) errs.push('opponent ' + n.id); if (n.stage && !KC.STAGE[n.stage]) errs.push('stage ' + n.id); if (n.lesson && !KC.DATA.lessons[n.lesson]) errs.push('lesson ' + n.id); if (n.bonus && !KC.DATA.bonus[n.bonus]) errs.push('bonus ' + n.id); for (const k of ['pre', 'post', 'script']) if (n[k] && !KC.SCRIPTS[n[k]]) errs.push('script ' + n.id); }
  for (const l in KC.DATA.lessons) for (const d of KC.DATA.lessons[l].drills) if (!T[d]) errs.push('drill ' + d);
  for (const f of KC.DATA.roster) for (const w in f.ai.weights) if (!T[w]) errs.push('weight ' + f.id + ':' + w);
  if (errs.length) throw new Error('KC data: ' + errs.join(', '));
  return true;
};
