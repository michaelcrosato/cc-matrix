/* 50-teams: the clubs, formations, tactics, referees, super strikes and celebrations. All original. Adding a team is
 * adding an entry: its players, kits, crest, formation, tactic, chant and celebration. */
const pl = (id, name, num, pos, o) => Object.assign({ id, name, num, pos }, o);
const S = (pace, shoot, pass, tackle, skill, keep, weight, temper) => ({ pace, shoot, pass, tackle, skill, keep, weight, temper });
EF.def('team', 'kipperton', { name: 'KIPPERTON ATHLETIC', short: 'KIP', nick: 'THE KIPPERS', city: 'KIPPERTON', stadium: 'smokehouse', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'fishslap', manager: 'mags', crowd: { factor: 1 },
  kits: { home: { shirt: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', shorts: '#1c2a5a', socks: '#f08a24' }, away: { shirt: '#eef0f4', color2: '#f08a24', pattern: 'sash', shorts: '#eef0f4', socks: '#1c2a5a' }, keeper: { shirt: '#3ac06a', color2: '#1a5a30', shorts: '#1a1a1a', socks: '#3ac06a', glove: '#f4f4f0' } },
  crest: { shape: 'shield', field: '#1c2a5a', ring: '#f08a24', charges: ['kipper', 'anchor'] }, tifo: 'KIPPER ARMY',
  players: [
    pl('crabb', 'WALLY CRABB', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'bald', skin: '#e0b090', hairColor: '#c8c8c8', stats: S(55, 30, 55, 40, 20, 78, 80, 30), voice: { f0: 110, wave: 'pulse' }, bio: 'A part-time lighthouse keeper. Huge gloves.' }),
    pl('okafor', 'SANDRA OKAFOR', 4, 'DEF', { nick: 'THE HARBOUR WALL', build: 'bulky', size: 1.14, hair: 'short', skin: '#7a4a2a', hairColor: '#1a1210', stats: S(66, 45, 60, 88, 45, 10, 95, 40), voice: { f0: 190, wave: 'saw' }, bio: 'Barges like a trawler.' }),
    pl('nowak', 'AGGIE NOWAK', 6, 'MID', { build: 'heroic', size: 1.08, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#e0b060', stats: S(74, 66, 90, 60, 70, 10, 55, 30), voice: { f0: 230, wave: 'saw' }, bio: 'The brains. Her grandmother never misses a game.' }),
    pl('tran', 'TOMMY TRAN', 7, 'FWD', { nick: 'TWINKLETOES', build: 'heroic', size: 1.04, hair: 'spiky', skin: '#e8c098', hairColor: '#1a1a1a', stats: S(95, 72, 70, 40, 92, 10, 45, 45), voice: { f0: 200, wave: 'pulse' }, bio: 'Step-overs for breakfast.' }),
    pl('pilchard', 'DAZ PILCHARD', 9, 'FWD', { captain: true, super: 'smoked-kipper', build: 'heroic', size: 1.12, hair: 'short', skin: '#f0c8a8', hairColor: '#5a3a22', stats: S(82, 90, 70, 45, 75, 10, 62, 50), voice: { f0: 150, wave: 'saw' }, celebration: 'fishslap', bio: 'Captain. Asked if Europe has chips.' })] });
EF.def('team', 'hoofington', { name: 'AFC HOOFINGTON', short: 'HOO', nick: 'THE HOOFERS', city: 'HOOFINGTON', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'hoofington', celebration: 'twohands', crowd: { factor: .9 },
  kits: { home: { shirt: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', shorts: '#3a2a1a', socks: '#e8a830' }, away: { shirt: '#e8a830', color2: '#6a4a2a', pattern: 'plain', shorts: '#e8a830', socks: '#6a4a2a' }, keeper: { shirt: '#3a3a3a', color2: '#e8a830', shorts: '#222', socks: '#3a3a3a', glove: '#e8a830' } },
  crest: { shape: 'roundel', field: '#6a4a2a', ring: '#e8a830', charges: ['boot'] }, tifo: 'HOOF IT!',
  players: [
    pl('stoppard', 'ALF STOPPARD', 1, 'GK', { build: 'bulky', size: 1.14, hair: 'short', skin: '#e8b898', hairColor: '#8a6a4a', stats: S(50, 40, 40, 40, 20, 66, 80, 40), bio: 'Long kicks only.' }),
    pl('hooper', 'GAZ HOOPER', 3, 'DEF', { build: 'bulky', size: 1.12, hair: 'bald', skin: '#f0c8a8', hairColor: '#aa8866', stats: S(60, 45, 45, 75, 30, 10, 85, 55), bio: 'Heads everything.' }),
    pl('dunstable', 'DUNCAN DUNSTABLE', 5, 'DEF', { build: 'bulky', size: 1.16, hair: 'short', skin: '#c89070', hairColor: '#2a1a10', stats: S(56, 40, 45, 78, 25, 10, 92, 60), bio: 'Weight 92. Mostly pies.' }),
    pl('lump', 'KEV LUMP', 8, 'FWD', { build: 'heroic', size: 1.08, hair: 'spiky', skin: '#f0c8a8', hairColor: '#c8a060', stats: S(70, 60, 50, 60, 40, 10, 70, 60), bio: '"Lump it!"' }),
    pl('needham', 'NORMAN NEEDHAM', 9, 'FWD', { nick: 'THE NODDER', captain: true, super: 'row-z', build: 'heroic', size: 1.14, hair: 'long', skin: '#e0b090', hairColor: '#4a3020', stats: S(66, 78, 50, 50, 45, 10, 80, 50), bio: 'Headers 95. Feet 40.' })] });
EF.def('team', 'pasapasa', { name: 'REAL PASAPASA', short: 'RPP', nick: 'LOS PASITOS', city: 'SOLERA', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'pasapasa', celebration: 'flagdance', crowd: { factor: 1 },
  kits: { home: { shirt: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', shorts: '#f4f2ec', socks: '#9a7ad0' }, away: { shirt: '#9a7ad0', color2: '#f4f2ec', pattern: 'plain', shorts: '#6a4aa0', socks: '#f4f2ec' }, keeper: { shirt: '#e8d040', color2: '#3a3a3a', shorts: '#3a3a3a', socks: '#e8d040', glove: '#3a3a3a' } },
  crest: { shape: 'circle', field: '#f4f2ec', ring: '#9a7ad0', charges: ['sun', 'arrows'] }, tifo: 'OLE OLE',
  players: [
    pl('portero', 'PACO PORTERO', 1, 'GK', { build: 'heroic', size: 1.1, hair: 'short', skin: '#c89070', hairColor: '#1a1210', stats: S(60, 30, 70, 40, 40, 70, 60, 30) }),
    pl('rondo', 'RAFA RONDO', 4, 'DEF', { build: 'heroic', size: 1.08, hair: 'long', skin: '#d8a880', hairColor: '#2a1a10', stats: S(70, 50, 82, 72, 70, 10, 60, 35) }),
    pl('toque', 'TITO TOQUE', 6, 'MID', { build: 'heroic', size: 1.04, hair: 'short', skin: '#e0b090', hairColor: '#3a2418', stats: S(76, 60, 92, 55, 82, 10, 50, 30), bio: 'One touch, always.' }),
    pl('interior', 'IKER INTERIOR', 8, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#d0a078', hairColor: '#1a1a1a', stats: S(78, 66, 88, 55, 80, 10, 52, 35) }),
    pl('pasarela', 'PEPITO PASARELA', 10, 'FWD', { captain: true, super: 'pasodoble', build: 'chibi', size: 1.14, hair: 'spiky', skin: '#e8c098', hairColor: '#2a1a10', stats: S(86, 80, 94, 40, 95, 10, 35, 40), bio: 'Tiny. Never loses the ball.' })] });
EF.def('team', 'stahlpresse', { name: 'SV STAHLPRESSE 04', short: 'SVS', nick: 'DIE PRESSEN', city: 'EISENHUTTE', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'stahlpresse', celebration: 'robot', crowd: { factor: 1.05 },
  kits: { home: { shirt: '#6a7078', color2: '#ff7a1a', pattern: 'halves', shorts: '#3a3e44', socks: '#ff7a1a' }, away: { shirt: '#ff7a1a', color2: '#3a3e44', pattern: 'plain', shorts: '#ff7a1a', socks: '#3a3e44' }, keeper: { shirt: '#2a8ad0', color2: '#1a1a1a', shorts: '#1a1a1a', socks: '#2a8ad0', glove: '#f0f0f0' } },
  crest: { shape: 'shield', field: '#6a7078', ring: '#ff7a1a', charges: ['cog', 'hammer'] }, tifo: 'STAHL!',
  players: [
    pl('mauer', 'MANNI MAUER', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'short', skin: '#f0d0b0', hairColor: '#e0c080', stats: S(55, 30, 55, 40, 30, 74, 85, 30) }),
    pl('fleiss', 'FRANZI FLEISS', 2, 'DEF', { build: 'heroic', size: 1.08, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#c86030', stats: S(84, 50, 70, 80, 55, 10, 65, 55), bio: 'Never stops running.' }),
    pl('umschalt', 'UWE UMSCHALT', 5, 'MID', { build: 'heroic', size: 1.08, hair: 'short', skin: '#e8c0a0', hairColor: '#6a4a2a', stats: S(80, 62, 78, 76, 62, 10, 70, 55) }),
    pl('jagd', 'JURGEN JAGD', 7, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#f0c8a8', hairColor: '#1a1a1a', stats: S(86, 70, 70, 70, 66, 10, 60, 60), bio: 'The hunter.' }),
    pl('hammerschmidt', 'KLAUS HAMMERSCHMIDT', 9, 'FWD', { captain: true, super: 'hammerschlag', build: 'bulky', size: 1.2, hair: 'bald', skin: '#e8b898', hairColor: '#aa8866', stats: S(72, 88, 60, 66, 55, 10, 92, 60) })] });
EF.def('team', 'lucchetto', { name: 'AC LUCCHETTO', short: 'ACL', nick: 'THE PADLOCKS', city: 'CASTELFORTEZZA', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'lucchetto', celebration: 'badgekiss', crowd: { factor: 1 },
  kits: { home: { shirt: '#7a1a2a', color2: '#c8ccd4', pattern: 'plain', shorts: '#c8ccd4', socks: '#7a1a2a' }, away: { shirt: '#c8ccd4', color2: '#7a1a2a', pattern: 'sash', shorts: '#7a1a2a', socks: '#c8ccd4' }, keeper: { shirt: '#1a1a1a', color2: '#e0e040', shorts: '#1a1a1a', socks: '#1a1a1a', glove: '#e0e040' } },
  crest: { shape: 'shield', field: '#7a1a2a', ring: '#c8ccd4', charges: ['padlock', 'laurel'] }, tifo: 'LA CHIAVE SIAMO NOI',
  players: [
    pl('riparo', 'ROCCO RIPARO', 1, 'GK', { build: 'heroic', size: 1.12, hair: 'long', skin: '#d8a880', hairColor: '#1a1210', stats: S(58, 30, 60, 40, 30, 80, 70, 40) }),
    pl('difesa', 'DINO DIFESA', 3, 'DEF', { build: 'bulky', size: 1.12, hair: 'short', skin: '#d0a078', hairColor: '#2a1a10', stats: S(64, 40, 60, 90, 40, 10, 80, 75) }),
    pl('marcatura', 'MARCO MARCATURA', 5, 'DEF', { build: 'heroic', size: 1.1, hair: 'short', skin: '#e0b090', hairColor: '#3a2418', stats: S(70, 40, 62, 86, 45, 10, 75, 70), bio: 'Man-marks your best player.' }),
    pl('fallo', 'FABIO FALLO', 7, 'MID', { build: 'heroic', size: 1.06, hair: 'spiky', skin: '#e8c098', hairColor: '#1a1a1a', stats: S(78, 60, 72, 66, 70, 10, 50, 90), bio: 'Goes down at the first touch.' }),
    pl('serratura', 'SALVATORE SERRATURA', 10, 'FWD', { captain: true, super: 'la-chiave', build: 'heroic', size: 1.1, hair: 'short', skin: '#d8a880', hairColor: '#1a1210', stats: S(86, 86, 70, 45, 80, 10, 60, 70) })] });
EF.def('team', 'opulence', { name: 'OLYMPIQUE OPULENCE', short: 'OPU', nick: 'LES MILLIARDAIRES', city: 'AURELIA', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: 'opulence', celebration: 'helicopter', crowd: { factor: 1.3 }, boss: true,
  kits: { home: { shirt: '#e8c040', color2: '#141414', pattern: 'stripes', shorts: '#141414', socks: '#e8c040' }, away: { shirt: '#141414', color2: '#e8c040', pattern: 'plain', shorts: '#141414', socks: '#e8c040' }, keeper: { shirt: '#8a2ad0', color2: '#e8c040', shorts: '#141414', socks: '#8a2ad0', glove: '#e8c040' } },
  crest: { shape: 'shield', field: '#141414', ring: '#e8c040', charges: ['crown', 'coins'] }, tifo: 'MONEY TALKS',
  players: [
    pl('vault', 'GUNNAR VAULT', 1, 'GK', { nick: 'THE VAULT', boss: true, build: 'bulky', size: 1.55, hair: 'bald', skin: '#f0d0b0', hairColor: '#e0c080', stats: S(60, 30, 60, 40, 30, 90, 99, 40), bio: 'The boss keeper. Reach plus forty per cent.' }),
    pl('cash', 'CASPIAN CASH', 4, 'DEF', { build: 'heroic', size: 1.1, hair: 'long', skin: '#f0c8a8', hairColor: '#e8c870', stats: S(80, 60, 75, 82, 70, 10, 72, 50) }),
    pl('bling', 'BENTLEY BLING', 8, 'MID', { build: 'heroic', size: 1.08, hair: 'spiky', skin: '#8a5a3a', hairColor: '#e8c040', stats: S(84, 76, 86, 60, 90, 10, 60, 50) }),
    pl('sovereign', 'SERGEI SOVEREIGN', 11, 'MID', { build: 'heroic', size: 1.1, hair: 'short', skin: '#f0d0b0', hairColor: '#2a1a10', stats: S(96, 80, 72, 50, 84, 10, 62, 50) }),
    pl('dor', "MAXIMILIEN D'OR", 10, 'FWD', { captain: true, super: 'botte-dor', build: 'heroic', size: 1.14, hair: 'long', skin: '#e8c098', hairColor: '#e8c040', stats: S(90, 94, 84, 45, 92, 10, 65, 70), bio: 'Three Golden Boots. Vain.' })] });

/* ---- formations: base [u, v] per role; u from own goal (0) to theirs (1), v across ---- */
const R_DEF = { att: [.14, 0], def: [0, 0], pull: [.45, .55], uRange: [.08, .62] }, R_FWD = { att: [.18, 0], def: [-.12, 0], pull: [.5, .6], uRange: [.35, .95] };
const R_MID = (out) => ({ att: [.12, .06 * out], def: [-.12, -.04 * out], pull: [.55, .45], uRange: [.15, .85] });
EF.def('formation', '2-2', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.22, .3] }, R_DEF), DEFR: Object.assign({ base: [.22, .7] }, R_DEF), FWDL: Object.assign({ base: [.6, .32] }, R_FWD), FWDR: Object.assign({ base: [.6, .68] }, R_FWD) }, drop: 'FWDR' });
EF.def('formation', '1-2-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEF: Object.assign({ base: [.22, .5] }, R_DEF), MIDL: Object.assign({ base: [.42, .28] }, R_MID(-1)), MIDR: Object.assign({ base: [.42, .72] }, R_MID(1)), FWD: Object.assign({ base: [.64, .5] }, R_FWD) }, drop: 'MIDR' });
EF.def('formation', '2-1-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.22, .32] }, R_DEF), DEFR: Object.assign({ base: [.22, .68] }, R_DEF), MID: Object.assign({ base: [.45, .5] }, R_MID(0)), FWD: Object.assign({ base: [.68, .5] }, R_FWD) }, drop: 'MID' });
EF.def('formation', '3-1', { roles: { GK: { base: [.03, .5], keeper: true }, DEFL: Object.assign({ base: [.16, .25] }, R_DEF), DEF: Object.assign({ base: [.13, .5] }, R_DEF), DEFR: Object.assign({ base: [.16, .75] }, R_DEF), FWD: Object.assign({ base: [.55, .5] }, R_FWD) }, drop: 'DEFL' });

/* ---- tactics ---- */
EF.def('tactic', 'plucky', { press: .55, pressers: 1, line: .45, width: .8, tempo: .7, passRisk: .5, shortBias: .8, longBall: .2, dribble: .45, skill: .4, shootRange: 200, shootBias: 1, foul: .2, dive: .05, gimmick: null });
EF.def('tactic', 'routeone', { press: .4, pressers: 1, line: .4, width: .85, tempo: .5, passRisk: .7, shortBias: .4, longBall: .6, dribble: .25, skill: .1, shootRange: 210, shootBias: 1.1, foul: .25, dive: .02, gimmick: 'routeone' });
EF.def('tactic', 'keepball', { press: .55, pressers: 1, line: .5, width: .6, tempo: .85, passRisk: .2, shortBias: .9, longBall: .05, dribble: .25, skill: .3, shootRange: 170, shootBias: .8, foul: .1, dive: .1, gimmick: 'keepball' });
EF.def('tactic', 'gegenpress', { press: .9, pressers: 2, line: .7, width: .8, tempo: 1, passRisk: .5, shortBias: .7, longBall: .2, dribble: .4, skill: .3, shootRange: 210, shootBias: 1.1, foul: .3, dive: .05, gimmick: 'gegenpress' });
EF.def('tactic', 'catenaccio', { press: .3, pressers: 1, line: .15, width: .7, tempo: .6, passRisk: .4, shortBias: .6, longBall: .35, dribble: .35, skill: .3, shootRange: 200, shootBias: 1, foul: .6, dive: .5, gimmick: 'catenaccio' });
EF.def('tactic', 'galacticos', { press: .6, pressers: 1, line: .55, width: .8, tempo: .85, passRisk: .5, shortBias: .7, longBall: .15, dribble: .7, skill: .8, shootRange: 220, shootBias: 1.2, foul: .2, dive: .15, gimmick: 'galacticos' });

/* ---- referees ---- */
EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strictness: 1.3, gullibility: .2, varHappy: .4, voice: { f0: 135, wave: 'saw' } });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strictness: .7, gullibility: .5, varHappy: .3, voice: { f0: 150, wave: 'pulse' } });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strictness: 1.1, gullibility: .3, varHappy: .5, voice: { f0: 200, wave: 'saw' } });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strictness: 1.2, gullibility: .7, varHappy: .9, voice: { f0: 120, wave: 'saw' } });

/* ---- super strikes ---- */
EF.def('super', 'smoked-kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', trail: 'smoke', color: '#f08a24', ball: 'kipper' });
EF.def('super', 'row-z', { name: 'ROW Z RETURN', path: 'meteor', trail: 'fire', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', trail: 'stars', color: '#9a7ad0' });
EF.def('super', 'hammerschlag', { name: 'DER HAMMERSCHLAG', path: 'hammer', trail: 'sparks', color: '#ff7a1a' });
EF.def('super', 'la-chiave', { name: 'LA CHIAVE', path: 'around', trail: 'stars', color: '#c8ccd4' });
EF.def('super', 'botte-dor', { name: "LA BOTTE D'OR", path: 'split', trail: 'gold', color: '#e8c040', ball: 'gold' });
EF.def('super', 'rocket', { name: 'ROCKET!', path: 'rocket', trail: 'fire', color: '#ff5a2a' });

/* ---- celebrations ---- */
EF.def('celebration', 'kneeslide', { name: 'KNEE SLIDE', anim: 'kneeslide', euphoria: 8 });
EF.def('celebration', 'backflip', { name: 'BACKFLIP', anim: 'backflip', euphoria: 12 });
EF.def('celebration', 'cartwheel', { name: 'CARTWHEEL', anim: 'cartwheel', euphoria: 10 });
EF.def('celebration', 'aeroplane', { name: 'AEROPLANE', anim: 'aeroplane', euphoria: 8 });
EF.def('celebration', 'robot', { name: 'THE ROBOT', anim: 'robot', euphoria: 10 });
EF.def('celebration', 'shirt', { name: 'SHIRT OVER HEAD', anim: 'shirt', euphoria: 15, yellow: true });
EF.def('celebration', 'flagdance', { name: 'CORNER FLAG DANCE', anim: 'dance', euphoria: 10 });
EF.def('celebration', 'badgekiss', { name: 'BADGE KISS', anim: 'badgekiss', euphoria: 6 });
EF.def('celebration', 'helicopter', { name: 'HELICOPTER', anim: 'helicopter', euphoria: 12 });
EF.def('celebration', 'fishslap', { name: 'THE FISH SLAP', anim: 'fishslap', euphoria: 14 });
EF.def('celebration', 'twohands', { name: 'BOTH ARMS UP', anim: 'cheer', euphoria: 6 });
EF.def('celebration', 'cheer', { name: 'FIST PUMP', anim: 'cheer', euphoria: 5, hidden: true });
