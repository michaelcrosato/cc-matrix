/* =====================================================================================================================
 * DATA: techniques, roster, stages, the story ladder, lessons, bonus stages, ranks. Designers extend the game by editing
 * these tables; systems never hard-code content (KC.validateData checks every reference at boot and in the tests).
 * ===================================================================================================================== */
KC.DATA = {};

/* ---- TECHNIQUES. f: [startup, active, recovery] in frames at 60 fps. reach: the gap (push-box edge to edge) a hit
 * needs. pts: [lo, hi] (100 steps; 600 or more is a full point). input: [posture, technique] relative to the foe
 * (n neutral, f toward, b away, u up, d down). prof: the body's profile while it plays (stand, crouch, air, flip).
 * spin: turns of the body (.5 = a back kick's half turn, 1 = a full turn). move: the rig's attack spec ---- */
const TECH = (id, name, jp, input, height, f, reach, pts, o = {}) => Object.assign({ id, name, jp, input, height, f, reach, pts, travel: 0, air: null, spin: 0, prof: 'stand', unblockable: height === 'low', knockdown: false, kiai: 'light', limb: 'foot', bull: false, scoring: true }, o);
KC.DATA.techniques = [
  TECH('frontKick', 'FRONT KICK', 'MAE-GERI', ['n', 'f'], 'mid', [11, 5, 28], [6, 30], [100, 200], { close: { gap: 12, id: 'revPunch' }, bull: true, move: { rel: true, kick: true, a0: .1, a1: 0, z0: .5, z1: .95, reach: 7.2, lean: -.25, lunge: .5 } }),
  TECH('revPunch', 'REVERSE PUNCH', 'GYAKU-ZUKI', ['n', 'f'], 'mid', [6, 4, 18], [0, 14], [100, 200], { travel: 4, limb: 'hand', alt: true, move: { rel: true, a0: .25, a1: 0, z0: -1, z1: -.9, r0: 2.5, r1: 9, lunge: 2, lean: .35, twist: 1.8, blade: 0 } }),
  TECH('roundKick', 'ROUND KICK', 'MAWASHI-GERI', ['n', 'u'], 'high', [10, 5, 22], [6, 30], [300, 600], { kiai: 'heavy', move: { rel: true, kick: true, a0: 1.7, a1: -.3, z0: 1, z1: 1.6, reach: 7.4, twist: 1.3, lean: -.35 } }),
  TECH('lowKick', 'LOW KICK', 'GEDAN-GERI', ['n', 'd'], 'low', [10, 5, 28], [4, 28], [100, 200], { move: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .28, reach: 7.2, lean: -.12, lunge: .4 } }),
  TECH('backKick', 'BACK KICK', 'USHIRO-GERI', ['n', 'b'], 'mid', [13, 5, 23], [10, 34], [200, 400], { travel: 6, spin: .5, bull: true, kiai: 'heavy', move: { rel: true, kick: true, a0: PI, a1: PI, z0: .65, z1: .95, reach: 7.6, lean: .45 } }),
  TECH('upLunge', 'UPPER LUNGE PUNCH', 'JODAN OI-ZUKI', ['f', 'u'], 'high', [15, 5, 26], [18, 60], [500, 1000], { travel: 40, limb: 'hand', close: { gap: 18, id: 'roundKick' }, bull: true, kiai: 'heavy', move: { rel: true, a0: .15, a1: 0, z0: 0, z1: 1.7, r0: 2.5, r1: 9.6, lunge: 5, lean: .3, twist: 1.6, blade: 0 } }),
  TECH('midLunge', 'MIDDLE LUNGE PUNCH', 'CHUDAN OI-ZUKI', ['f', 'f'], 'mid', [14, 5, 26], [18, 60], [200, 400], { travel: 40, limb: 'hand', close: { gap: 18, id: 'frontKick' }, kiai: 'heavy', move: { rel: true, a0: .15, a1: 0, z0: -1, z1: -1.3, r0: 2.5, r1: 9.6, lunge: 5, lean: .4, twist: 1.6, blade: 0 } }),
  TECH('frontSweep', 'FRONT FOOT SWEEP', 'ASHI-BARAI', ['f', 'd'], 'low', [16, 8, 36], [4, 34], [200, 400], { travel: 10, knockdown: true, prof: 'crouch', move: { rel: true, kick: true, a0: 1.2, a1: -.6, z0: .06, z1: .06, reach: 8, crouch: .9, lean: .3 } }),
  TECH('turnBackKick', 'TURN BACK KICK', 'USHIRO-MAWASHI', ['f', 'b'], 'mid', [17, 5, 26], [12, 40], [500, 1000], { travel: 12, spin: 1, kiai: 'heavy', move: { rel: true, kick: true, a0: 0, a1: 0, z0: .7, z1: 1, reach: 7.6, lean: -.3 } }),
  TECH('backRound', 'BACK ROUND KICK', 'URA-MAWASHI', ['b', 'u'], 'high', [15, 5, 23], [8, 34], [500, 1000], { spin: 1, kiai: 'heavy', move: { rel: true, kick: true, a0: 1.6, a1: -.4, z0: 1.1, z1: 1.6, reach: 7.5, twist: 1.3, lean: -.35 } }),
  TECH('backSweep', 'BACK FOOT SWEEP', 'USHIRO-BARAI', ['b', 'd'], 'low', [16, 8, 36], [6, 34], [100, 200], { knockdown: true, spin: 1, prof: 'crouch', move: { rel: true, kick: true, a0: 1.9, a1: -1.7, z0: .08, z1: .08, reach: 8, crouch: .9, lean: .3 } }),
  TECH('jumpSide', 'JUMPING SIDE KICK', 'TOBI YOKO-GERI', ['u', 'f'], 'high', [16, 10, 26], [26, 62], [500, 1000], { air: { travel: 60 }, prof: 'air', kiai: 'heavy', move: { rel: true, kick: true, a0: .1, a1: 0, z0: .6, z1: .8, reach: 8.6, lean: -.5 } }),
  TECH('jumpBack', 'JUMPING BACK KICK', 'TOBI USHIRO-GERI', ['u', 'b'], 'high', [14, 8, 22], [8, 32], [500, 1000], { air: { travel: 20 }, spin: .5, prof: 'air', kiai: 'heavy', move: { rel: true, kick: true, a0: PI, a1: PI, z0: .6, z1: .85, reach: 8, lean: .4 } }),
  TECH('upperPunch', 'UPPER PUNCH', 'AGE-ZUKI', ['d', 'u'], 'rising', [8, 7, 30], [0, 18], [300, 600], { limb: 'hand', bull: true, move: { rel: true, plane: 'side', a0: -1.15, a1: 1.25, reach: 7.6, crouch: .7, hop: 2, lunge: 1.2, lean: .2, blade: 0 } }),
  TECH('squatPunch', 'SQUATTING REVERSE LUNGE PUNCH', 'GEDAN GYAKU-ZUKI', ['d', 'f'], 'midlow', [13, 5, 30], [10, 44], [400, 800], { travel: 20, limb: 'hand', prof: 'crouch', bull: true, kiai: 'heavy', move: { rel: true, a0: .2, a1: 0, z0: -2, z1: -3.2, r0: 2.5, r1: 9.6, crouch: .85, lunge: 3, lean: .5, twist: 1.5, blade: 0 } }),
  // the evasions and the block (no points)
  TECH('block', 'BLOCK', 'UKE', ['b', 'f'], 'none', [1, 14, 4], [0, 0], [0, 0], { scoring: false, unblockable: false, limb: 'hand', kiai: null }),
  TECH('frontFlip', 'FRONT SOMERSAULT', 'ZENPO KAITEN', ['u', 'u'], 'none', [6, 40, 12], [0, 0], [0, 0], { scoring: false, unblockable: false, flip: { vz: 370, travel: 95 }, prof: 'flip', kiai: null }),
  TECH('backFlip', 'BACK SOMERSAULT', 'KOHO KAITEN', ['b', 'b'], 'none', [6, 40, 12], [0, 0], [0, 0], { scoring: false, unblockable: false, flip: { vz: 370, travel: -85 }, prof: 'flip', kiai: null }),
  TECH('backRoll', 'BACK ROLL', 'KOHO UKEMI', ['d', 'b'], 'none', [4, 28, 8], [0, 0], [0, 0], { scoring: false, unblockable: false, travel: -90, prof: 'roll', kiai: null }),
  TECH('jump', 'JUMP', 'TOBI', ['u', 'd'], 'none', [4, 39, 5], [0, 0], [0, 0], { scoring: false, unblockable: false, jumpOnly: true, prof: 'air', kiai: null }),
  TECH('crouch', 'CROUCH', 'SHAGAMI', ['d', 'd'], 'none', [3, 0, 5], [0, 0], [0, 0], { scoring: false, unblockable: false, hold: true, prof: 'crouch', kiai: null })
];
KC.TECH = {}; for (const t of KC.DATA.techniques) KC.TECH[t.id] = t;
// the technique matrix: posture (left stick) x technique (right stick); alt cells by the gap are in each entry's close
KC.MATRIX = {
  n: { u: 'roundKick', f: 'frontKick', d: 'lowKick', b: 'backKick' },
  f: { u: 'upLunge', f: 'midLunge', d: 'frontSweep', b: 'turnBackKick' },
  b: { u: 'backRound', f: 'block', d: 'backSweep', b: 'backFlip' },
  u: { u: 'frontFlip', f: 'jumpSide', d: 'jump', b: 'jumpBack' },
  d: { u: 'upperPunch', f: 'squatPunch', d: 'crouch', b: 'backRoll' }
};
KC.SCORING = KC.DATA.techniques.filter(t => t.scoring).map(t => t.id);
// the techniques' cell in the matrix (posture, technique), for the AI, the drills and the prompts
KC.cellOf = id => { if (id === 'revPunch') return ['n', 'f']; for (const p in KC.MATRIX) for (const t in KC.MATRIX[p]) if (KC.MATRIX[p][t] === id) return [p, t]; return null; };

/* ---- RANKS and belts ---- */
KC.DATA.ranks = [
  { id: 'white', name: 'WHITE BELT', belt: '#f4f4ee' }, { id: 'yellow', name: 'YELLOW BELT', belt: '#f0c830' },
  { id: 'green', name: 'GREEN BELT', belt: '#3aa050' }, { id: 'blue', name: 'BLUE BELT', belt: '#2f5fd0' },
  { id: 'brown', name: 'BROWN BELT', belt: '#6a4024' }, { id: 'dan1', name: 'BLACK BELT 1ST DAN', belt: '#16161c' },
  { id: 'dan3', name: '3RD DAN', belt: '#16161c', stripes: 3 }, { id: 'dan5', name: '5TH DAN', belt: '#16161c', stripes: 5 },
  { id: 'dan8', name: '8TH DAN', belt: '#16161c', stripes: 8 }, { id: 'champ', name: 'CHAMP', belt: '#e8c040' }
];
KC.rankIndex = id => Math.max(0, KC.DATA.ranks.findIndex(r => r.id === id));

/* ---- ROSTER. stats: walk, reach, speed multipliers. ai: the CPU's personality (KC.KarateAI). voice: the gibberish
 * voice (f0 Hz, formant scale, syllables a second, wave). Gi colours follow the side, never the fighter ---- */
const SKIN = '#f0c49c';
KC.DATA.roster = [
  { id: 'taro', name: 'TARO MOYASHI', short: 'TARO', title: 'THE BEAN SPROUT', style: 'ALL-ROUND, CLEAN KICKS', rig: { build: 'heroic', size: 2.15, hair: 'spiky', hat: { style: 'band', color: '#f8f8f0' }, limbW: 1.8, colors: { skin: SKIN, hair: '#1a1418' } }, stats: { walk: 1, reach: 1, speed: 1 }, signature: 'roundKick', rank: 'white',
    ai: { level: 5, aggression: .55, patience: .35, jump: .15, block: .35, gap: 34, crouch: .1, weights: { roundKick: 3, frontKick: 2, lowKick: 2, backKick: 1, jumpSide: 1, upLunge: 1 } },
    voice: { f0: 190, formant: 1.05, rate: 15, wave: 'pulse' }, quotes: { intro: 'I WILL BE CHAMP!', win: 'OSU!', lose: 'AGAIN...' }, tip: 'TARO KICKS ROUND. CROUCH UNDER IT.', unlock: null },
  { id: 'kamaboko', name: 'KAMABOKO', short: 'KAMABOKO', title: 'DOJO CLASSMATE', style: 'CLUMSY, LOVES FRONT KICKS', rig: { build: 'chibi', size: 2.25, hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, torsoW: 3.8, colors: { skin: '#f6d0b0', hair: '#5a3020' } }, stats: { walk: .95, reach: .92, speed: .95 }, signature: 'frontKick', rank: 'white',
    ai: { level: 1, aggression: .7, patience: .2, jump: .05, block: .1, gap: 30, crouch: .05, weights: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } },
    voice: { f0: 240, formant: 1.15, rate: 17, wave: 'pulse' }, quotes: { intro: 'I ATE THREE BOWLS. I AM READY!', win: 'MORE NOODLES!', lose: 'MY TUMMY...' }, tip: 'KAMABOKO KICKS FRONT. BLOCK IT, THEN COUNTER.', unlock: null },
  { id: 'negi', name: 'SENPAI NEGI', short: 'NEGI', title: 'DOJO SENIOR', style: 'TEXTBOOK', rig: { build: 'heroic', size: 2.35, hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, colors: { skin: '#eac09a', hair: '#20242a' } }, stats: { walk: 1, reach: 1.04, speed: 1 }, signature: 'backKick', rank: 'brown',
    ai: { level: 2, aggression: .5, patience: .4, jump: .1, block: .35, gap: 36, crouch: .1, weights: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } },
    voice: { f0: 150, formant: 1.0, rate: 13, wave: 'saw' }, quotes: { intro: 'SHOW ME WHAT I TAUGHT YOU.', win: 'TRAIN HARDER.', lose: 'GOOD. VERY GOOD.' }, tip: 'NEGI BLOCKS HALF HIS FIGHTS. SWEEP HIM.', unlock: null },
  { id: 'ebi', name: 'EBI', short: 'EBI', title: 'HARBOR FISHERMAN', style: 'JUMPER', rig: { build: 'heroic', size: 2.15, hair: 'short', hat: { style: 'band', color: '#f08a2a' }, sleeves: 'none', colors: { skin: '#c98a5a', hair: '#2a1a10' } }, stats: { walk: 1.1, reach: .98, speed: 1.05 }, signature: 'jumpSide', rank: 'blue',
    ai: { level: 3, aggression: .6, patience: .2, jump: .35, block: .2, gap: 70, crouch: .05, weights: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } },
    voice: { f0: 210, formant: 1.08, rate: 19, wave: 'pulse' }, quotes: { intro: 'THE SEA MADE ME QUICK. CATCH ME!', win: 'TOO SLOW!', lose: 'BACK TO THE BOAT...' }, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.', unlock: null },
  { id: 'kikurage', name: 'KIKURAGE', short: 'KIKURAGE', title: 'BAMBOO HERMIT', style: 'COUNTER-PUNCHER', rig: { build: 'heroic', size: 2.1, hunch: .3, hood: true, hair: 'long', colors: { skin: '#d8b08a', hair: '#6a4a2a' } }, beard: '#e8e4d8', stats: { walk: .9, reach: 1, speed: .95 }, signature: 'revPunch', rank: 'dan1',
    ai: { level: 4, aggression: .25, patience: .8, jump: .05, block: .65, gap: 40, crouch: .15, weights: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } },
    voice: { f0: 110, formant: .92, rate: 9, wave: 'saw', breath: .25 }, quotes: { intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', win: 'STILL WATER.', lose: 'THE WIND WINS TODAY.' }, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.', unlock: null },
  { id: 'ika', name: 'IKA', short: 'IKA', title: 'LOG-BRIDGE ACROBAT', style: 'CROSS-UPS AND SPINS', rig: { build: 'heroic', size: 2.15, hair: 'long', sleeves: 'long', colors: { skin: '#e8d8f0', hair: '#f4f0fa' } }, stats: { walk: 1.05, reach: 1.02, speed: 1.02 }, signature: 'backRound', rank: 'dan1',
    ai: { level: 5, aggression: .5, patience: .3, jump: .25, block: .3, gap: 44, crouch: .05, weights: { backRound: 3, turnBackKick: 3, backKick: 2, frontFlip: 2, backFlip: 2 } },
    voice: { f0: 200, formant: 1.1, rate: 14, wave: 'triangle', vib: 6 }, quotes: { intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', win: 'INK IN YOUR EYES!', lose: 'TANGLED...' }, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.', unlock: null },
  { id: 'buta', name: 'CAPTAIN BUTA', short: 'BUTA', title: "SHIP'S CAPTAIN", style: 'LONG LUNGES', rig: { build: 'bulky', size: 2.45, hair: 'short', hat: { style: 'cap', color: '#1e2a52' }, stubble: '#3a2a20', colors: { skin: '#e0a080', hair: '#3a2a20' } }, stats: { walk: .83, reach: 1.1, speed: .92 }, signature: 'upLunge', rank: 'dan3',
    ai: { level: 6, aggression: .8, patience: .2, jump: .05, block: .2, gap: 60, crouch: .05, weights: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } },
    voice: { f0: 85, formant: .85, rate: 11, wave: 'saw' }, quotes: { intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', win: 'ALL HANDS, CHEER!', lose: 'ABANDON SHIP...' }, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.', unlock: null },
  { id: 'asari', name: 'ASARI', short: 'ASARI', title: 'NIGHT-MARKET STALL KEEPER', style: 'LOW AND SHUT TIGHT', rig: { build: 'heroic', size: 2.1, hair: 'ponytail', hat: { style: 'band', color: '#2ab0a0' }, colors: { skin: '#f2caa4', hair: '#2a1a28' } }, stats: { walk: 1, reach: .96, speed: 1.04 }, signature: 'squatPunch', rank: 'dan5',
    ai: { level: 7, aggression: .4, patience: .5, jump: .05, block: .5, gap: 34, crouch: .5, weights: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } },
    voice: { f0: 170, formant: 1.0, rate: 15, wave: 'square', clicks: true }, quotes: { intro: 'MY SHELL IS SHUT. GO HOME.', win: 'CLAM UP!', lose: 'YOU PRIED ME OPEN.' }, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.', unlock: null },
  { id: 'kyabetsu', name: 'MASTER KYABETSU', short: 'KYABETSU', title: 'FUJI GARDEN MASTER', style: 'PATIENT PUNISHER', rig: { build: 'heroic', size: 2.15, hair: 'bald', hunch: .2, colors: { skin: '#e8c0a0', hair: '#d8d8d0' } }, beard: '#f4f4ee', stats: { walk: .95, reach: 1.02, speed: 1.03 }, signature: 'turnBackKick', rank: 'dan8',
    ai: { level: 8, aggression: .4, patience: .7, jump: .1, block: .6, gap: 42, crouch: .1, readBonus: .05, habit: true, weights: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } },
    voice: { f0: 120, formant: .9, rate: 10, wave: 'saw', vib: 5 }, quotes: { intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', win: 'ANOTHER LAYER.', lose: 'YOU HAVE PEELED ME.' }, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.', unlock: 'kyabetsu' },
  { id: 'mei', name: 'MEI', short: 'MEI', title: 'THE IRON LADLE', style: 'REIGNING CHAMP, HIGH AND LOW', rig: { build: 'heroic', size: 2.15, hair: 'ponytail', colors: { skin: '#f4cca8', hair: '#141016' } }, stats: { walk: 1.05, reach: 1, speed: 1.05 }, signature: 'frontSweep', rank: 'champ',
    ai: { level: 9, aggression: .65, patience: .4, jump: .2, block: .5, gap: 46, crouch: .1, habit: true, weights: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } },
    voice: { f0: 290, formant: 1.18, rate: 16, wave: 'pulse12' }, quotes: { intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', win: 'EAT. THEN TRAIN.', lose: 'NEXT YEAR I TAKE IT BACK.' }, tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.', unlock: 'mei' }
];
KC.FIGHTER = {}; for (const f of KC.DATA.roster) KC.FIGHTER[f.id] = f;
KC.DATA.referee = { id: 'genkotsu', name: 'JUDGE GENKOTSU', voice: { f0: 105, formant: .9, rate: 11, wave: 'saw', rough: .18 } };
KC.DATA.narrator = { id: 'card', name: '', voice: { f0: 130, formant: 1, rate: 12, wave: 'triangle' } };
KC.GI = { white: { cloth: '#f2eee4', pants: '#ece6da', trim: '#d8d2c4' }, red: { cloth: '#c8302a', pants: '#b82a24', trim: '#e8584a' }, classicWhite: { cloth: '#fcfcfc', pants: '#fcfcfc', trim: '#bcbcbc' }, classicRed: { cloth: '#d82800', pants: '#d82800', trim: '#fc7460' } };

/* ---- STAGES: 8 fight stages and 3 bonus locations. Painters live in 35-stage.js (KC.PAINT[id]); the rest is data ---- */
KC.DATA.stages = [
  { id: 'dojo', name: 'HON-DOJO', place: "SENPAI NEGI'S DOJO", music: 'dojo', ambient: .62, floor: 'planks', crowd: 'seiza', weather: null, ambience: 'none', mei: false },
  { id: 'harbor', name: 'NAGASAKI PIER', place: 'THE HARBOR AT DAWN', music: 'harbor', ambient: .72, floor: 'deck', crowd: 'dock', weather: null, ambience: 'waves', mei: true },
  { id: 'bamboo', name: 'BAMBOO FOREST', place: 'THE BAMBOO FOREST', music: 'bamboo', ambient: .64, floor: 'dirt', crowd: null, weather: { kind: 'leaves', amount: .35, wind: .3 }, ambience: 'birds', mei: true },
  { id: 'log', name: 'LOG BRIDGE', place: 'A TRUNK OVER THE GORGE', music: 'gorge', ambient: .64, floor: 'log', crowd: null, weather: null, ambience: 'falls', mei: true },
  { id: 'ship', name: "SHIP'S STERN", place: 'THE STERN AT SUNSET', music: 'ship', ambient: .6, floor: 'deck', crowd: 'crew', weather: null, ambience: 'waves', mei: true },
  { id: 'market', name: 'CHAMPON STREET', place: 'THE NIGHT MARKET', music: 'market', ambient: .42, floor: 'stone', crowd: 'market', weather: null, ambience: 'market', mei: true },
  { id: 'fuji', name: 'FUJI GARDEN', place: 'THE GARDEN UNDER FUJI', music: 'fuji', ambient: .66, floor: 'gravel', crowd: 'garden', weather: { kind: 'leaves', amount: .45, wind: .15, color: '#ffb0c8' }, ambience: 'birds', mei: true },
  { id: 'stadium', name: 'NATIONAL STADIUM', place: 'THE CHAMPON CUP FINAL', music: 'stadium', ambient: .5, floor: 'mat', crowd: 'stadium', weather: null, ambience: 'crowd', mei: false },
  { id: 'courtyard', name: 'DOJO COURTYARD', place: 'BONUS: THE COURTYARD', music: 'bonus', ambient: .78, floor: 'earth', crowd: null, weather: null, ambience: 'birds', bonus: true },
  { id: 'fishmarket', name: 'FISH-MARKET ALLEY', place: 'BONUS: THE FISH MARKET', music: 'bonus', ambient: .74, floor: 'wetstone', crowd: null, weather: null, ambience: 'waves', bonus: true },
  { id: 'pasture', name: 'FUJI PASTURE', place: 'BONUS: THE PASTURE', music: 'bonus', ambient: .8, floor: 'grass', crowd: null, weather: null, ambience: 'birds', bonus: true }
];
KC.STAGE = {}; for (const s of KC.DATA.stages) KC.STAGE[s.id] = s;
KC.FIGHT_STAGES = KC.DATA.stages.filter(s => !s.bonus).map(s => s.id);
KC.ARENA = { x0: 0, x1: 400, marks: [150, 250] };

/* ---- LESSONS (Senpai's drill) and BONUS variants ---- */
KC.DATA.lessons = [
  { id: 'lessonI', title: 'LESSON I', stage: 'dojo', intro: 'WATCH. THEN DO.', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'] },
  { id: 'lessonII', title: 'LESSON II', stage: 'harbor', intro: 'STEP IN. STRIKE THROUGH.', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'] },
  { id: 'lessonIII', title: 'LESSON III', stage: 'log', intro: 'TURN YOUR BACK. NEVER YOUR EYES.', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'] },
  { id: 'lessonAll', title: 'ALL TECHNIQUES', stage: 'dojo', intro: 'EVERY TECHNIQUE. ONE BY ONE.', drills: ['frontKick', 'revPunch', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'midLunge', 'frontSweep', 'turnBackKick', 'backRound', 'backSweep', 'jumpSide', 'jumpBack', 'upperPunch', 'squatPunch', 'block', 'frontFlip', 'backFlip', 'backRoll', 'jump', 'crouch'] }
];
KC.LESSON = {}; for (const l of KC.DATA.lessons) KC.LESSON[l.id] = l;
KC.DATA.bonus = [
  { id: 'boards', kind: 'boards', name: 'BREAK THE BOARDS', stage: 'courtyard', params: { n: 5, mat: 'pine' } },
  { id: 'pots', kind: 'pots', name: 'POTS AHOY!', stage: 'fishmarket', params: { count: 16 } },
  { id: 'bull', kind: 'bull', name: 'STOP THE BULL', stage: 'pasture', params: { charges: 3 } }
];
KC.BONUS = {}; for (const b of KC.DATA.bonus) KC.BONUS[b.id] = b;
KC.DATA.boardMats = { pine: { name: 'PINE', mul: 1, color: '#d8b070' }, tile: { name: 'ROOF TILE', mul: 1.5, color: '#8a4a3a' }, ice: { name: 'ICE', mul: 2, color: '#b8e8f8' } };

/* ---- THE CHAMPON ROAD: the story ladder ---- */
KC.DATA.ladder = [
  { kind: 'cutscene', id: 'prologue', stage: 'harbor', script: 'prologue' },
  { kind: 'practice', id: 'lessonI', lesson: 'lessonI', stage: 'dojo' },
  { kind: 'match', id: 'm1', opponent: 'kamaboko', stage: 'dojo', promote: 'yellow', hints: true },
  { kind: 'match', id: 'm2', opponent: 'negi', stage: 'dojo', promote: 'green', hints: true },
  { kind: 'bonus', id: 'b1', bonus: 'boards', stage: 'courtyard' },
  { kind: 'match', id: 'm3', opponent: 'ebi', stage: 'harbor', promote: 'blue', hints: true, script: 'harborMei', after: 'afterHarbor' },
  { kind: 'practice', id: 'lessonII', lesson: 'lessonII', stage: 'harbor' },
  { kind: 'match', id: 'm4', opponent: 'kikurage', stage: 'bamboo', promote: 'brown' },
  { kind: 'bonus', id: 'b2', bonus: 'pots', stage: 'fishmarket', script: 'potsIntro' },
  { kind: 'match', id: 'm5', opponent: 'ika', stage: 'log', promote: 'dan1' },
  { kind: 'practice', id: 'lessonIII', lesson: 'lessonIII', stage: 'log' },
  { kind: 'match', id: 'm6', opponent: 'buta', stage: 'ship', promote: 'dan3' },
  { kind: 'bonus', id: 'b3', bonus: 'bull', stage: 'pasture' },
  { kind: 'match', id: 'm7', opponent: 'asari', stage: 'market', promote: 'dan5', after: 'marketMei' },
  { kind: 'match', id: 'm8', opponent: 'kyabetsu', stage: 'fuji', promote: 'dan8', unlock: 'kyabetsu' },
  { kind: 'match', id: 'm9', opponent: 'mei', stage: 'stadium', promote: 'champ', script: 'finalEntrance', unlock: 'mei' },
  { kind: 'ending', id: 'ending', stage: 'stadium', script: 'ending' }
];
