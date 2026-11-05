/* TEAMS, FORMATIONS, TACTICS, REFEREES, SUPERS, CELEBRATIONS (section 7.1): content as data. Adding a team means
 * adding an entry here (and its stadium in 51); the code reads it all by id. */
const ST = (pace, shoot, pass, tackle, skill, keep, weight, temper) => ({ pace, shoot, pass, tackle, skill, keep, weight, temper });
const pl = (id, name, num, pos, o, stats) => Object.assign({ id, name, num, pos, build: 'heroic', size: 1.1, hair: 'short', skin: '#e8b890', hairColor: '#4a3020', stats, voice: { f0: 140, wave: 'saw' } }, o);
EF.def('team', 'kipperton', { name: 'KIPPERTON ATHLETIC', short: 'KIP', nick: 'THE KIPPERS', city: 'KIPPERTON', stadium: 'smokehouse', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'fishslap', crowd: { factor: 1 }, manager: 'mags', tifo: 'KIPPER ARMY',
  kits: { home: { shirt: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', shorts: '#1c2a5a', socks: '#f08a24', number: '#ffffff' }, away: { shirt: '#eef0f4', color2: '#f08a24', pattern: 'sash', shorts: '#eef0f4', socks: '#1c2a5a', number: '#1c2a5a' }, keeper: { shirt: '#3ac06a', color2: '#1a5a30', pattern: 'plain', shorts: '#1a1a1a', socks: '#3ac06a', glove: '#f4f4f0' } },
  crest: { shape: 'shield', field: '#1c2a5a', ring: '#f08a24', charges: ['kipper', 'anchor'] },
  players: [
    pl('crabb', 'WALLY CRABB', 1, 'GK', { build: 'bulky', size: 1.18, hair: 'bald', skin: '#e0b090', hairColor: '#c8c8c8', voice: { f0: 110, wave: 'pulse' }, bio: 'Forty-one. A part-time lighthouse keeper with enormous gloves.' }, ST(60, 30, 55, 40, 20, 76, 80, 30)),
    pl('okafor', 'SANDRA OKAFOR', 4, 'DEF', { short: 'OKAFOR', nick: 'THE HARBOUR WALL', build: 'bulky', size: 1.16, hair: 'short', skin: '#7a4a2a', hairColor: '#1a1210', voice: { f0: 190, wave: 'saw' }, bio: 'Barges like a trawler. The coach of the defending drills.' }, ST(70, 50, 62, 88, 45, 10, 95, 40)),
    pl('nowak', 'AGGIE NOWAK', 6, 'MID', { build: 'heroic', size: 1.1, hair: 'ponytail', skin: '#f0c8a8', hairColor: '#c8a050', voice: { f0: 220, wave: 'saw' }, bio: 'The brains. Her grandmother never misses a match.' }, ST(74, 66, 90, 60, 70, 10, 55, 35)),
    pl('tran', 'TOMMY TRAN', 7, 'FWD', { short: 'TRAN', nick: 'TWINKLETOES', build: 'heroic', size: 1.06, hair: 'spiky', skin: '#e8c098', hairColor: '#141010', voice: { f0: 175, wave: 'saw' }, celebration: 'backflip', bio: 'Step-overs for breakfast.' }, ST(95, 72, 70, 40, 92, 10, 45, 45)),
    pl('pilchard', 'DAZ PILCHARD', 9, 'FWD', { captain: true, super: 'smoked-kipper', build: 'heroic', size: 1.14, hair: 'short', skin: '#f0c8a8', hairColor: '#5a3a22', voice: { f0: 150, wave: 'saw' }, celebration: 'fishslap', bio: 'Captain, local hero, part-time fish-van driver.' }, ST(80, 90, 70, 45, 75, 10, 60, 50))
  ] });
EF.def('team', 'hoofington', { name: 'AFC HOOFINGTON', short: 'HOO', nick: 'THE HOOFERS', city: 'HOOFINGTON', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'hoofington', celebration: 'cheer', crowd: { factor: .9 }, tifo: 'HOOF IT',
  kits: { home: { shirt: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', shorts: '#2a1a10', socks: '#e8a830', number: '#ffffff' }, away: { shirt: '#e8a830', color2: '#6a4a2a', pattern: 'plain', shorts: '#6a4a2a', socks: '#6a4a2a', number: '#2a1a10' }, keeper: { shirt: '#3a3a48', color2: '#e8a830', pattern: 'plain', shorts: '#1a1a1a', socks: '#3a3a48', glove: '#e8a830' } },
  crest: { shape: 'roundel', field: '#6a4a2a', ring: '#e8a830', charges: ['boot'] },
  players: [
    pl('stoppard', 'ALF STOPPARD', 1, 'GK', { build: 'bulky', size: 1.14, hair: 'short', skin: '#e8b890', hairColor: '#8a6a4a', voice: { f0: 105, wave: 'pulse' } }, ST(55, 30, 40, 40, 15, 70, 82, 50)),
    pl('hooper', 'GAZ HOOPER', 3, 'DEF', { build: 'bulky', size: 1.14, hair: 'bald', skin: '#f0c8a8', voice: { f0: 120, wave: 'pulse' } }, ST(62, 40, 45, 75, 30, 10, 84, 60)),
    pl('dunstable', 'DUNCAN DUNSTABLE', 5, 'DEF', { build: 'bulky', size: 1.2, hair: 'short', skin: '#d8a880', hairColor: '#3a2a1a', voice: { f0: 100, wave: 'pulse' } }, ST(58, 35, 40, 78, 25, 10, 92, 65)),
    pl('lump', 'KEV LUMP', 8, 'FWD', { build: 'bulky', size: 1.12, hair: 'spiky', skin: '#f0c8a8', hairColor: '#c86a2a', voice: { f0: 125, wave: 'saw' } }, ST(66, 62, 50, 55, 35, 10, 78, 60)),
    pl('needham', 'NORMAN NEEDHAM', 9, 'FWD', { short: 'NEEDHAM', nick: 'THE NODDER', captain: true, super: 'row-z', build: 'heroic', size: 1.2, hair: 'short', skin: '#e8b890', hairColor: '#2a1a10', voice: { f0: 115, wave: 'pulse' }, header: 95 }, ST(68, 80, 50, 50, 40, 10, 80, 55))
  ] });
EF.def('team', 'pasapasa', { name: 'REAL PASAPASA', short: 'RPP', nick: 'LOS PASITOS', city: 'SOLERA', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'pasapasa', celebration: 'cornerflag', crowd: { factor: 1 }, tifo: 'OLÉ OLÉ',
  kits: { home: { shirt: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', shorts: '#f4f2ec', socks: '#9a7ad0', number: '#6a4aa0' }, away: { shirt: '#9a7ad0', color2: '#f4f2ec', pattern: 'sash', shorts: '#5a4a80', socks: '#f4f2ec', number: '#ffffff' }, keeper: { shirt: '#e86a3a', color2: '#f4f2ec', pattern: 'plain', shorts: '#2a2a2a', socks: '#e86a3a', glove: '#f4f2ec' } },
  crest: { shape: 'circle', field: '#f4f2ec', ring: '#9a7ad0', charges: ['sun', 'arrows'] },
  players: [
    pl('portero', 'PACO PORTERO', 1, 'GK', { size: 1.12, hair: 'short', skin: '#d8a070', hairColor: '#1a1210', voice: { f0: 135, wave: 'saw' } }, ST(64, 30, 70, 40, 40, 72, 60, 30)),
    pl('rondo', 'RAFA RONDO', 4, 'DEF', { size: 1.1, hair: 'long', skin: '#d8a070', hairColor: '#2a1a10', voice: { f0: 145, wave: 'saw' } }, ST(72, 45, 82, 68, 65, 10, 60, 40)),
    pl('toque', 'TITO TOQUE', 6, 'MID', { size: 1.06, hair: 'spiky', skin: '#e8b890', hairColor: '#3a2a1a', voice: { f0: 170, wave: 'saw' } }, ST(76, 60, 94, 55, 82, 10, 45, 30)),
    pl('interior', 'IKER INTERIOR', 8, 'MID', { size: 1.08, hair: 'short', skin: '#c89060', hairColor: '#1a1210', voice: { f0: 155, wave: 'saw' } }, ST(78, 66, 88, 52, 80, 10, 50, 30)),
    pl('pasarela', 'PEPITO PASARELA', 10, 'FWD', { captain: true, super: 'pasodoble', build: 'chibi', size: 1.02, hair: 'spiky', skin: '#e0b080', hairColor: '#141010', voice: { f0: 230, wave: 'saw' }, celebration: 'cornerflag' }, ST(86, 80, 92, 40, 94, 10, 35, 40))
  ] });
EF.def('team', 'stahlpresse', { name: 'SV STAHLPRESSE 04', short: 'SVS', nick: 'DIE PRESSEN', city: 'EISENHUTTE', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'stahlpresse', celebration: 'robot', crowd: { factor: 1.05 }, tifo: 'STAHL!',
  kits: { home: { shirt: '#6a7078', color2: '#ff7a1a', pattern: 'halves', shorts: '#2a2e34', socks: '#ff7a1a', number: '#ffffff' }, away: { shirt: '#ff7a1a', color2: '#2a2e34', pattern: 'plain', shorts: '#2a2e34', socks: '#2a2e34', number: '#2a2e34' }, keeper: { shirt: '#c8e040', color2: '#2a2e34', pattern: 'plain', shorts: '#2a2e34', socks: '#c8e040', glove: '#2a2e34' } },
  crest: { shape: 'shield', field: '#2a2e34', ring: '#ff7a1a', charges: ['cog', 'hammer'] },
  players: [
    pl('mauer', 'MANNI MAUER', 1, 'GK', { build: 'bulky', size: 1.16, hair: 'short', skin: '#f0d0b0', hairColor: '#e0c060', voice: { f0: 110, wave: 'pulse' } }, ST(60, 30, 60, 45, 30, 78, 84, 40)),
    pl('fleiss', 'FRANZI FLEISS', 2, 'DEF', { size: 1.08, hair: 'ponytail', skin: '#f0d0b0', hairColor: '#e8d080', voice: { f0: 205, wave: 'saw' } }, ST(90, 50, 70, 80, 55, 10, 60, 50)),
    pl('umschalt', 'UWE UMSCHALT', 5, 'MID', { size: 1.12, hair: 'short', skin: '#e8c0a0', hairColor: '#5a4030', voice: { f0: 130, wave: 'pulse' } }, ST(84, 62, 78, 74, 60, 10, 66, 55)),
    pl('jagd', 'JÜRGEN JAGD', 7, 'FWD', { size: 1.1, hair: 'spiky', skin: '#f0d0b0', hairColor: '#2a2a2a', voice: { f0: 145, wave: 'saw' } }, ST(92, 76, 64, 66, 66, 10, 60, 60)),
    pl('hammerschmidt', 'KLAUS HAMMERSCHMIDT', 9, 'FWD', { short: 'HAMMERSCHMIDT', captain: true, super: 'hammerschlag', build: 'bulky', size: 1.24, hair: 'bald', skin: '#f0d0b0', voice: { f0: 95, wave: 'pulse' } }, ST(76, 88, 62, 70, 50, 10, 90, 60))
  ] });
EF.def('team', 'lucchetto', { name: 'AC LUCCHETTO', short: 'ACL', nick: 'I LUCCHETTI', city: 'CASTELFORTEZZA', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'lucchetto', celebration: 'badgekiss', crowd: { factor: 1 }, tifo: 'LA CHIAVE SIAMO NOI',
  kits: { home: { shirt: '#7a1a2a', color2: '#c8ccd4', pattern: 'plain', shorts: '#7a1a2a', socks: '#c8ccd4', number: '#c8ccd4' }, away: { shirt: '#c8ccd4', color2: '#7a1a2a', pattern: 'stripes', shorts: '#c8ccd4', socks: '#7a1a2a', number: '#7a1a2a' }, keeper: { shirt: '#1a1a1a', color2: '#7a1a2a', pattern: 'plain', shorts: '#1a1a1a', socks: '#1a1a1a', glove: '#c8ccd4' } },
  crest: { shape: 'shield', field: '#7a1a2a', ring: '#c8ccd4', charges: ['padlock', 'laurel'] },
  players: [
    pl('riparo', 'ROCCO RIPARO', 1, 'GK', { size: 1.16, hair: 'long', skin: '#d8a880', hairColor: '#1a1210', voice: { f0: 120, wave: 'pulse' } }, ST(62, 30, 60, 50, 30, 80, 70, 55)),
    pl('difesa', 'DINO DIFESA', 3, 'DEF', { build: 'bulky', size: 1.14, hair: 'short', skin: '#d8a880', hairColor: '#1a1210', voice: { f0: 110, wave: 'pulse' } }, ST(66, 40, 62, 86, 40, 10, 80, 75)),
    pl('marcatura', 'MARCO MARCATURA', 5, 'DEF', { size: 1.12, hair: 'short', skin: '#e0b090', hairColor: '#3a2a1a', voice: { f0: 125, wave: 'pulse' } }, ST(72, 45, 64, 84, 45, 10, 74, 80)),
    pl('fallo', 'FABIO FALLO', 7, 'MID', { size: 1.08, hair: 'long', skin: '#e0b090', hairColor: '#2a1a10', voice: { f0: 160, wave: 'saw' }, bio: 'The diver. Goes down at the first touch.' }, ST(78, 62, 76, 60, 72, 10, 50, 90)),
    pl('serratura', 'SALVATORE SERRATURA', 10, 'FWD', { short: 'SERRATURA', captain: true, super: 'chiave', size: 1.12, hair: 'short', skin: '#d8a070', hairColor: '#141010', voice: { f0: 135, wave: 'saw' } }, ST(86, 86, 72, 50, 80, 10, 60, 65))
  ] });
EF.def('team', 'opulence', { name: 'OLYMPIQUE OPULENCE', short: 'OPU', nick: 'LES MILLIARDAIRES', city: 'AURELIA', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: 'opulence', celebration: 'helicopter', crowd: { factor: 1.3 }, owner: 'baron', tifo: 'MONEY TALKS', boss: true,
  kits: { home: { shirt: '#e8c040', color2: '#141414', pattern: 'stripes', shorts: '#141414', socks: '#e8c040', number: '#141414' }, away: { shirt: '#141414', color2: '#e8c040', pattern: 'sash', shorts: '#141414', socks: '#e8c040', number: '#e8c040' }, keeper: { shirt: '#8a3ad0', color2: '#e8c040', pattern: 'plain', shorts: '#141414', socks: '#8a3ad0', glove: '#e8c040' } },
  crest: { shape: 'shield', field: '#141414', ring: '#e8c040', charges: ['crown', 'coins'] },
  players: [
    pl('vault', 'GUNNAR VAULT', 1, 'GK', { short: 'VAULT', nick: 'THE VAULT', boss: true, build: 'bulky', size: 1.5, hair: 'short', skin: '#f0d0b0', hairColor: '#e8e0c0', voice: { f0: 80, wave: 'pulse' }, bio: 'The boss keeper. Reach +40%. Catches anything under 300.' }, ST(62, 40, 60, 60, 30, 90, 95, 40)),
    pl('cash', 'CASPIAN CASH', 4, 'DEF', { size: 1.14, hair: 'short', skin: '#e8c0a0', hairColor: '#c8a050', voice: { f0: 130, wave: 'saw' } }, ST(82, 60, 80, 84, 70, 10, 75, 45)),
    pl('bling', 'BENTLEY BLING', 8, 'MID', { size: 1.1, hair: 'spiky', skin: '#8a5a3a', hairColor: '#e8c040', voice: { f0: 160, wave: 'saw' } }, ST(86, 78, 88, 60, 90, 10, 55, 50)),
    pl('sovereign', 'SERGEI SOVEREIGN', 11, 'FWD', { size: 1.12, hair: 'short', skin: '#f0d0b0', hairColor: '#2a1a10', voice: { f0: 140, wave: 'saw' } }, ST(96, 84, 74, 45, 86, 10, 60, 50)),
    pl('dor', "MAXIMILIEN D'OR", 10, 'FWD', { short: "D'OR", captain: true, super: 'botte-dor', build: 'heroic', size: 1.16, hair: 'long', skin: '#e8c0a0', hairColor: '#e8c040', voice: { f0: 150, wave: 'saw' }, celebration: 'helicopter' }, ST(90, 94, 86, 40, 92, 10, 58, 70))
  ] });

/* formations: u from the own goal line (0) to the other (1), v across from the north touchline (0) */
EF.def('formation', '2-2', { name: '2-2', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.22, .3] }, DEFR: { base: [.22, .7] }, FWDL: { base: [.6, .32] }, FWDR: { base: [.6, .68] } }, drop: 'FWDR' });
EF.def('formation', '1-2-1', { name: '1-2-1', roles: { GK: { base: [.03, .5], keeper: true }, DEF: { base: [.22, .5] }, MIDL: { base: [.42, .28] }, MIDR: { base: [.42, .72] }, FWD: { base: [.64, .5] } }, drop: 'MIDR' });
EF.def('formation', '2-1-1', { name: '2-1-1', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.22, .32] }, DEFR: { base: [.22, .68] }, MID: { base: [.45, .5] }, FWD: { base: [.68, .5] } }, drop: 'MID' });
EF.def('formation', '3-1', { name: '3-1', roles: { GK: { base: [.03, .5], keeper: true }, DEFL: { base: [.16, .25] }, DEF: { base: [.13, .5] }, DEFR: { base: [.16, .75] }, FWD: { base: [.55, .5] } }, drop: 'DEFL' });

/* tactics (section 6.13) */
EF.def('tactic', 'plucky', { name: 'PLUCKY', press: .55, pressers: 1, line: .45, width: .8, tempo: .7, passRisk: .5, shortBias: .6, longBall: .2, dribble: .45, skill: .4, shootRange: 175, shootBias: 1, foul: .2, dive: .05, gimmick: null });
EF.def('tactic', 'routeone', { name: 'ROUTE ONE', press: .4, pressers: 1, line: .4, width: .85, tempo: .5, passRisk: .6, shortBias: .3, longBall: .6, dribble: .25, skill: .1, shootRange: 190, shootBias: 1.1, foul: .25, dive: 0, gimmick: 'routeone' });
EF.def('tactic', 'keepball', { name: 'KEEP BALL', press: .55, pressers: 1, line: .5, width: .6, tempo: .85, passRisk: .2, shortBias: .9, longBall: .05, dribble: .25, skill: .3, shootRange: 170, shootBias: .8, foul: .1, dive: .1, gimmick: 'keepball' });
EF.def('tactic', 'gegenpress', { name: 'GEGENPRESS', press: .9, pressers: 2, line: .7, width: .8, tempo: 1, passRisk: .5, shortBias: .6, longBall: .15, dribble: .4, skill: .3, shootRange: 180, shootBias: 1, foul: .3, dive: .05, aggr: 1.2, gimmick: 'gegenpress' });
EF.def('tactic', 'catenaccio', { name: 'CATENACCIO', press: .3, pressers: 1, line: .15, width: .7, tempo: .6, passRisk: .4, shortBias: .5, longBall: .35, dribble: .35, skill: .35, shootRange: 175, shootBias: 1, foul: .6, dive: .5, aggr: 1.1, gimmick: 'catenaccio' });
EF.def('tactic', 'galacticos', { name: 'GALACTICOS', press: .55, pressers: 1, line: .55, width: .85, tempo: .9, passRisk: .5, shortBias: .6, longBall: .15, dribble: .7, skill: .8, shootRange: 190, shootBias: 1.1, foul: .2, dive: .1, gimmick: 'galacticos' });

/* referees (section 7.1) */
EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strictness: 1.3, gullibility: .2, varHappy: .4, voice: { f0: 135, wave: 'saw' }, line: 'The best referee in Europe. He says so himself.' });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strictness: .7, gullibility: .5, varHappy: .3, voice: { f0: 150, wave: 'saw' }, line: 'Lets the game flow. And flow. And flow.' });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strictness: 1.1, gullibility: .3, varHappy: .5, voice: { f0: 200, wave: 'saw' }, line: 'Has never smiled on a pitch. Allegedly.' });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strictness: 1.2, gullibility: .7, varHappy: .9, voice: { f0: 140, wave: 'saw' }, line: 'Dramatic. Falls for everything. Loves VAR.' });

/* super strikes (section 6.9): one per captain, and the team super */
EF.def('super', 'smoked-kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', params: { amp: 18, freq: 3.5 }, trail: 'smoke', color: '#f08a24', ball: 'kipper' });
EF.def('super', 'row-z', { name: 'ROW Z RETURN', path: 'meteor', params: {}, trail: 'fire', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', params: { amp: 30 }, trail: 'sparkle', color: '#9a7ad0' });
EF.def('super', 'hammerschlag', { name: 'DER HAMMERSCHLAG', path: 'hammer', params: {}, trail: 'sparks', color: '#ff7a1a' });
EF.def('super', 'chiave', { name: 'LA CHIAVE', path: 'around', params: {}, trail: 'smoke', color: '#c8ccd4' });
EF.def('super', 'botte-dor', { name: "LA BOTTE D'OR", path: 'split', params: {}, trail: 'gold', color: '#e8c040' });
EF.def('super', 'rocket', { name: 'ROCKET', path: 'rocket', params: {}, trail: 'fire', color: '#ff6a3a' });

/* celebrations (section 6.21): clip and procedural recipe, how long, how much Euphoria */
EF.def('celebration', 'kneeslide', { name: 'KNEE SLIDE', clip: 'Slide_Loop', proc: 'armsOut', travel: 120, dur: 2.2, euphoria: 8 });
EF.def('celebration', 'backflip', { name: 'BACKFLIP', clip: 'Backflip', dur: 2.2, euphoria: 12 });
EF.def('celebration', 'cartwheel', { name: 'CARTWHEEL', clip: 'Cartwheel', dur: 2.4, euphoria: 10 });
EF.def('celebration', 'aeroplane', { name: 'AEROPLANE', proc: 'aeroplane', travel: 80, dur: 2.4, euphoria: 8 });
EF.def('celebration', 'robot', { name: 'THE ROBOT', clip: 'Dance_Simple', speed: .6, proc: 'robot', dur: 2.6, euphoria: 9 });
EF.def('celebration', 'shirt', { name: 'SHIRT OVER HEAD', clip: 'Cheering_Two_Hands', proc: 'hood', dur: 2.4, euphoria: 15, card: true });
EF.def('celebration', 'cornerflag', { name: 'CORNER-FLAG DANCE', clip: 'Dance_Simple', dur: 2.6, euphoria: 10 });
EF.def('celebration', 'badgekiss', { name: 'BADGE KISS', clip: 'Greeting', dur: 2.2, euphoria: 6 });
EF.def('celebration', 'helicopter', { name: 'HELICOPTER', clip: 'Breakdance_Helicopter', dur: 2.6, euphoria: 12 });
EF.def('celebration', 'fishslap', { name: 'THE FISH SLAP', proc: 'fishslap', dur: 2.6, euphoria: 14, prop: 'kipper' });
EF.def('celebration', 'cheer', { name: 'BOTH ARMS UP', clip: 'Cheering_Two_Hands', dur: 2.2, euphoria: 6 });
