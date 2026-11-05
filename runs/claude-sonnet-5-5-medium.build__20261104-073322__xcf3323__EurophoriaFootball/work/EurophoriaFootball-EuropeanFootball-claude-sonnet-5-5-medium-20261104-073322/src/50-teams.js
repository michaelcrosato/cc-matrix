/* ============ 50-teams: formations, tactics, referees, teams, stadiums, supers, celebrations (all data) ============ */
// formation slots: [role, u (0 own goal .. 1 their goal), v (0..1 across)]
EF.def('formation', '2-2', { slots: [['GK', .03, .5], ['DEF', .22, .3], ['DEF', .22, .7], ['FWD', .6, .32], ['FWD', .6, .68]], drop: 4 });
EF.def('formation', '1-2-1', { slots: [['GK', .03, .5], ['DEF', .22, .5], ['MID', .42, .28], ['MID', .42, .72], ['FWD', .64, .5]], drop: 3 });
EF.def('formation', '2-1-1', { slots: [['GK', .03, .5], ['DEF', .22, .32], ['DEF', .22, .68], ['MID', .45, .5], ['FWD', .68, .5]], drop: 3 });
EF.def('formation', '3-1', { slots: [['GK', .03, .5], ['DEF', .16, .25], ['DEF', .13, .5], ['DEF', .16, .75], ['FWD', .55, .5]], drop: 1 });
EF.ROLE = { GK: { att: [0, 0], def: [0, 0], range: [0, .1] }, DEF: { att: [.14, 0], def: [0, 0], range: [.08, .62] }, MID: { att: [.12, 0], def: [-.12, 0], range: [.15, .85] }, FWD: { att: [.18, 0], def: [-.12, 0], range: [.35, .95] } };

EF.def('tactic', 'plucky', { press: .55, line: .45, tempo: .7, passRisk: .5, longBall: .15, foul: .2, dive: .05, shootRange: 170 });
EF.def('tactic', 'routeone', { press: .4, line: .4, tempo: .5, passRisk: .7, longBall: .6, foul: .25, dive: .05, shootRange: 200 });
EF.def('tactic', 'keepball', { press: .55, line: .5, tempo: .85, passRisk: .2, longBall: .02, foul: .08, dive: .05, shootRange: 140, shortBias: .9 });
EF.def('tactic', 'gegenpress', { press: .95, line: .7, tempo: 1, passRisk: .5, longBall: .12, foul: .3, dive: .05, shootRange: 170, pressers: 2 });
EF.def('tactic', 'catenaccio', { press: .3, line: .15, tempo: .6, passRisk: .4, longBall: .35, foul: .55, dive: .5, shootRange: 150 });
EF.def('tactic', 'galacticos', { press: .6, line: .6, tempo: .9, passRisk: .6, longBall: .1, foul: .1, dive: .15, shootRange: 210, vain: true });

EF.def('referee', 'haltwhistle', { name: 'ARTHUR HALTWHISTLE', strict: 1.3, gull: .2, varHappy: .5, skin: '#e0b090' });
EF.def('referee', 'patience', { name: 'PIERRE PATIENCE', strict: .7, gull: .5, varHappy: .4, skin: '#f0c8a8' });
EF.def('referee', 'ironside', { name: 'INGRID IRONSIDE', strict: 1.1, gull: .3, varHappy: .5, skin: '#c89070' });
EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strict: 1.2, gull: .7, varHappy: .9, skin: '#a87050' });

const P = (num, name, pos, o) => Object.assign({ num, name, pos, build: 'heroic', size: 1.1, hair: 'short', skin: '#e0b090', hairColor: '#4a3020', pace: 70, shoot: 70, pass: 70, tackle: 70, skill: 70, keep: 60, weight: 70, temper: 40 }, o);
EF.def('team', 'kip', { name: 'KIPPERTON ATHLETIC', short: 'KIPPERTON', code: 'KIP', nick: 'The Kippers', city: 'Kipperton', stadium: 'smokehouse', formation: '1-2-1', tactic: 'plucky', chant: 'KIP-PER-TON!', celebration: 'fishslap', manager: 'MAGS MULLIGAN',
  kit: { cloth: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', pants: '#1c2a5a', boot: '#14182a', belt: '#1c2a5a', trim: '#f08a24', glove: '#ffd34a', number: '#ffffff' },
  away: { cloth: '#f4f2ec', color2: '#f08a24', pattern: 'sash', pants: '#f4f2ec', boot: '#14182a', belt: '#f4f2ec', trim: '#f08a24', glove: '#ffd34a', number: '#1c2a5a' },
  crest: { shape: 'shield', c1: '#1c2a5a', c2: '#f08a24', sym: 'fish' }, superId: 'kipper',
  players: [P(1, 'WALLY CRABB', 'GK', { build: 'bulky', size: 1.2, hair: 'bald', keep: 76, weight: 80, pace: 50 }), P(4, 'SANDRA OKAFOR', 'DEF', { build: 'bulky', size: 1.2, skin: '#6a4028', tackle: 88, weight: 95, temper: 40, pace: 58, nick: 'THE HARBOUR WALL' }),
    P(6, 'AGGIE NOWAK', 'MID', { size: 1.12, hair: 'ponytail', hairColor: '#d8b060', pass: 90, skill: 70 }), P(7, 'TOMMY TRAN', 'MID', { size: 1.08, hair: 'spiky', hairColor: '#14100c', skin: '#e8c090', pace: 95, skill: 92, nick: 'TWINKLETOES' }),
    P(9, 'DAZ PILCHARD', 'FWD', { size: 1.15, shoot: 90, pace: 80, captain: true, hairColor: '#8a4a20' })] });
EF.def('team', 'hoo', { name: 'AFC HOOFINGTON', short: 'HOOFINGTON', code: 'HOO', nick: 'The Hoofers', city: 'Hoofington', stadium: 'smokehouse', formation: '2-2', tactic: 'routeone', chant: 'HOOOOF!', celebration: 'cheer', manager: 'BRIAN BOOT',
  kit: { cloth: '#6a4a2a', color2: '#e8a830', pattern: 'stripes', pants: '#3a2a1a', boot: '#1a1208', belt: '#3a2a1a', trim: '#e8a830', glove: '#c8c8c8', number: '#ffffff' },
  away: { cloth: '#e8a830', color2: '#6a4a2a', pattern: 'halves', pants: '#6a4a2a', boot: '#1a1208', belt: '#6a4a2a', trim: '#6a4a2a', glove: '#c8c8c8', number: '#ffffff' },
  crest: { shape: 'shield', c1: '#6a4a2a', c2: '#e8a830', sym: 'boot' }, superId: 'meteor',
  players: [P(1, 'ALF STOPPARD', 'GK', { hair: 'bald', keep: 62, pace: 45 }), P(3, 'GAZ HOOPER', 'DEF', { hair: 'spiky', hairColor: '#c89a4a', tackle: 70 }), P(5, 'DUNCAN DUNSTABLE', 'DEF', { build: 'bulky', size: 1.2, weight: 92, tackle: 78, pace: 55, hair: 'bald' }),
    P(8, 'KEV LUMP', 'FWD', { hairColor: '#2a2a2a', pass: 45, shoot: 66 }), P(9, 'NORMAN NEEDHAM', 'FWD', { size: 1.18, hairColor: '#8a8a8a', shoot: 84, captain: true, nick: 'THE NODDER' })] });
EF.def('team', 'rpp', { name: 'REAL PASAPASA', short: 'PASAPASA', code: 'RPP', nick: 'Los Pasitos', city: 'Solera', stadium: 'pasapasa', formation: '1-2-1', tactic: 'keepball', chant: 'OLE!', celebration: 'flagdance', manager: 'DON DIEGO DUENDE',
  kit: { cloth: '#f4f2ec', color2: '#9a7ad0', pattern: 'plain', pants: '#f4f2ec', boot: '#2a2040', belt: '#9a7ad0', trim: '#9a7ad0', glove: '#9a7ad0', number: '#4a3a80' },
  away: { cloth: '#9a7ad0', color2: '#f4f2ec', pattern: 'plain', pants: '#9a7ad0', boot: '#f4f2ec', belt: '#f4f2ec', trim: '#f4f2ec', glove: '#f4f2ec', number: '#ffffff' },
  crest: { shape: 'round', c1: '#f4f2ec', c2: '#9a7ad0', sym: 'sun' }, superId: 'pasodoble',
  players: [P(1, 'PACO PORTERO', 'GK', { keep: 70, hairColor: '#14100c', skin: '#c89070' }), P(4, 'RAFA RONDO', 'DEF', { pass: 82, skin: '#c89070', hairColor: '#14100c' }), P(6, 'TITO TOQUE', 'MID', { pass: 92, skin: '#d8a880', hairColor: '#2a1a10', hair: 'spiky' }),
    P(8, 'IKER INTERIOR', 'MID', { pass: 88, skin: '#c89070', hairColor: '#14100c', hair: 'ponytail' }), P(10, 'PEPITO PASARELA', 'MID', { build: 'chibi', size: 1.0, skill: 96, pass: 94, pace: 82, shoot: 78, captain: true, skin: '#d8a880', hairColor: '#14100c' })] });
EF.def('team', 'svs', { name: 'SV STAHLPRESSE 04', short: 'STAHLPRESSE', code: 'SVS', nick: 'Die Pressen', city: 'Eisenhutte', stadium: 'stahlpresse', formation: '1-2-1', tactic: 'gegenpress', chant: 'HEY! HEY! HEY!', celebration: 'robot', manager: 'DR. HEIKE HOCHDRUCK',
  kit: { cloth: '#6a7078', color2: '#ff7a1a', pattern: 'halves', pants: '#3a3e44', boot: '#ff7a1a', belt: '#ff7a1a', trim: '#ff7a1a', glove: '#ff7a1a', number: '#ffffff' },
  away: { cloth: '#ff7a1a', color2: '#6a7078', pattern: 'halves', pants: '#3a3e44', boot: '#14181c', belt: '#6a7078', trim: '#6a7078', glove: '#6a7078', number: '#14181c' },
  crest: { shape: 'round', c1: '#6a7078', c2: '#ff7a1a', sym: 'cog' }, superId: 'hammer',
  players: [P(1, 'MANNI MAUER', 'GK', { keep: 74, hair: 'bald', skin: '#f0c8a8' }), P(2, 'FRANZI FLEISS', 'DEF', { pace: 88, tackle: 78, hair: 'ponytail', hairColor: '#d8c080', skin: '#f0c8a8' }), P(5, 'UWE UMSCHALT', 'MID', { pace: 84, pass: 76, hairColor: '#c8a050', skin: '#f0c8a8' }),
    P(7, 'JURGEN JAGD', 'MID', { pace: 90, tackle: 76, hair: 'spiky', hairColor: '#4a4a4a', skin: '#f0c8a8' }), P(9, 'KLAUS HAMMERSCHMIDT', 'FWD', { build: 'bulky', size: 1.25, shoot: 92, weight: 92, pace: 66, captain: true, hairColor: '#c89a4a', skin: '#f0c8a8' })] });
EF.def('team', 'acl', { name: 'AC LUCCHETTO', short: 'LUCCHETTO', code: 'ACL', nick: 'I Lucchetti', city: 'Castelfortezza', stadium: 'lucchetto', formation: '2-1-1', tactic: 'catenaccio', chant: 'Mmmmm...', celebration: 'badgekiss', manager: 'MAESTRO MASSIMO MURO',
  kit: { cloth: '#7a1a2a', color2: '#c8ccd4', pattern: 'stripes', pants: '#c8ccd4', boot: '#1a0a10', belt: '#7a1a2a', trim: '#c8ccd4', glove: '#c8ccd4', number: '#ffffff' },
  away: { cloth: '#c8ccd4', color2: '#7a1a2a', pattern: 'sash', pants: '#7a1a2a', boot: '#1a0a10', belt: '#c8ccd4', trim: '#7a1a2a', glove: '#7a1a2a', number: '#7a1a2a' },
  crest: { shape: 'shield', c1: '#7a1a2a', c2: '#c8ccd4', sym: 'lock' }, superId: 'chiave',
  players: [P(1, 'ROCCO RIPARO', 'GK', { keep: 82, hairColor: '#14100c', skin: '#d8a880' }), P(3, 'DINO DIFESA', 'DEF', { tackle: 80, hairColor: '#14100c', skin: '#d8a880' }), P(5, 'MARCO MARCATURA', 'DEF', { tackle: 84, hair: 'spiky', hairColor: '#14100c', skin: '#d8a880', markman: true }),
    P(7, 'FABIO FALLO', 'MID', { temper: 90, skill: 80, hair: 'ponytail', hairColor: '#14100c', skin: '#d8a880', diver: true }), P(10, 'SALVATORE SERRATURA', 'FWD', { pace: 90, shoot: 88, captain: true, hairColor: '#14100c', skin: '#d8a880' })] });
EF.def('team', 'opu', { name: 'OLYMPIQUE OPULENCE', short: 'OPULENCE', code: 'OPU', nick: 'Les Milliardaires', city: 'Aurelia', stadium: 'euphorium', formation: '1-2-1', tactic: 'galacticos', chant: '*polite clapping*', celebration: 'helicopter', manager: 'BARON VON BULLION',
  kit: { cloth: '#e8c040', color2: '#141414', pattern: 'stripes', pants: '#141414', boot: '#f4f4f4', belt: '#e8c040', trim: '#e8c040', glove: '#141414', number: '#141414' },
  away: { cloth: '#141414', color2: '#e8c040', pattern: 'hoops', pants: '#141414', boot: '#e8c040', belt: '#e8c040', trim: '#e8c040', glove: '#e8c040', number: '#e8c040' },
  crest: { shape: 'round', c1: '#e8c040', c2: '#141414', sym: 'crown' }, superId: 'botte',
  players: [P(1, 'GUNNAR VAULT', 'GK', { build: 'bulky', size: 1.7, hair: 'bald', keep: 94, weight: 95, pace: 45, nick: 'THE VAULT', boss: true, skin: '#f0c8a8' }), P(4, 'CASPIAN CASH', 'DEF', { tackle: 84, hairColor: '#d8c080', skin: '#f0c8a8' }), P(8, 'BENTLEY BLING', 'MID', { skill: 90, pass: 86, hair: 'spiky', hairColor: '#d8c080', skin: '#e0b090' }),
    P(11, 'SERGEI SOVEREIGN', 'MID', { pace: 96, hair: 'spiky', hairColor: '#2a2a2a', skin: '#f0c8a8' }), P(10, 'MAXIMILIEN D\'OR', 'FWD', { size: 1.16, skill: 94, shoot: 94, pace: 88, captain: true, hairColor: '#d8c080', skin: '#e0b090', vain: true })] });
EF.def('team', 'gulls', { name: 'GULL ROVERS', short: 'GULLS', code: 'GUL', nick: 'The Gulls', city: 'Gullsbury', stadium: 'rec', formation: '2-2', tactic: 'plucky', chant: 'SQUAWK!', celebration: 'cheer',
  kit: { cloth: '#eef0f6', color2: '#2a5ab8', pattern: 'plain', pants: '#2a5ab8', boot: '#1e2030', belt: '#2a5ab8', trim: '#2a5ab8', glove: '#eef0f6', number: '#2a5ab8' },
  away: { cloth: '#2a5ab8', color2: '#eef0f6', pattern: 'plain', pants: '#eef0f6', boot: '#1e2030', belt: '#eef0f6', trim: '#eef0f6', glove: '#eef0f6', number: '#ffffff' },
  crest: { shape: 'round', c1: '#eef0f6', c2: '#2a5ab8', sym: 'sun' }, superId: 'wobble',
  players: [P(1, 'NOOR BEACH', 'GK', {}), P(2, 'BEX TIDE', 'DEF', { hair: 'spiky' }), P(3, 'SAL SANDS', 'DEF', { hair: 'ponytail' }), P(7, 'DRAGO WAVE', 'FWD', {}), P(9, 'KIT SURF', 'FWD', { captain: true })] });
EF.def('team', 'dummies', { name: 'TRAINING DUMMIES', short: 'DUMMIES', code: 'DUM', nick: 'The Dummies', city: 'The Rec', stadium: 'rec', formation: '2-2', tactic: 'plucky', chant: '...', celebration: 'cheer',
  kit: { cloth: '#8a8a8a', color2: '#5a5a5a', pattern: 'plain', pants: '#5a5a5a', boot: '#3a3a3a', belt: '#5a5a5a', trim: '#8a8a8a', glove: '#8a8a8a', number: '#ffffff' }, away: null,
  crest: { shape: 'round', c1: '#8a8a8a', c2: '#5a5a5a', sym: 'cog' }, superId: 'wobble',
  players: [P(1, 'DUMMY', 'GK', {}), P(2, 'DUMMY', 'DEF', {}), P(3, 'DUMMY', 'DEF', {}), P(4, 'DUMMY', 'FWD', {}), P(5, 'DUMMY', 'FWD', {})] });
EF.CUP = ['hoo', 'rpp', 'svs', 'acl', 'opu'];
EF.REFS = ['haltwhistle', 'patience', 'ironside', 'severo', 'haltwhistle'];

/* ---- stadiums ---- */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'Kipperton', time: 'dusk', ambient: .62, weather: { kind: 'rain', amount: .7, wind: .4 }, grass: [[96, 134, 64], [84, 122, 56]], wet: true, mud: true, friction: 1.15, sky: ['#2a2a48', '#6a4a60', '#c8805a'], events: ['seagull', 'flicker', 'keith'], crowd: 600, homeShare: .8, tiers: 3,
  boards: ['SMOKY JOE\'S KIPPERS', 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'EUROPHORIA COLA'], standColor: '#5a4a5a', roof: '#6a5a4a', music: 'smoke', skyline: 'harbour' });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'Solera', time: 'day', ambient: 1, weather: null, grass: [[128, 170, 74], [110, 154, 64]], wet: false, friction: .85, sky: ['#6aa8e8', '#a8d0f0', '#f0e8c8'], events: ['beachball'], crowd: 1400, homeShare: .85, tiers: 4,
  boards: ['EUROPHORIA COLA', 'PIE-O-MATIC', 'SOLERA SUN CREAM', 'BULLION BANK: MONEY TALKS'], standColor: '#e8e0d0', roof: '#c8603a', music: 'olé', skyline: 'palms' });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'Eisenhutte', time: 'night', ambient: .5, weather: { kind: 'snow', amount: .6, wind: .2 }, grass: [[196, 208, 220], [180, 194, 208]], wet: false, snow: true, friction: .7, sky: ['#0a1020', '#1a2438', '#3a4658'], events: ['invader', 'flicker'], crowd: 1600, homeShare: .85, tiers: 4, ball: 'orange',
  boards: ['STAHLPRESSE: WE PRESS HARDER', 'PIE-O-MATIC', 'EUROPHORIA COLA', 'HAMMER & SON FORGE'], standColor: '#4a5058', roof: '#3a3e44', music: 'forge', skyline: 'steel' });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'Castelfortezza', time: 'dusk', ambient: .55, weather: { kind: 'fog' }, grass: [[88, 124, 66], [78, 114, 58]], wet: false, friction: 1, uneven: true, sky: ['#1a1830', '#4a2a48', '#c0705a'], events: ['flare'], crowd: 1200, homeShare: .85, tiers: 3,
  boards: ['CASTELFORTEZZA LOCKSMITHS', 'PIE-O-MATIC', 'EUROPHORIA COLA', 'MURO & FIGLI DEFENCE'], standColor: '#6a5048', roof: '#7a3a2a', music: 'curva', skyline: 'walls' });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'Aurelia', time: 'night', ambient: .58, weather: null, grass: [[70, 140, 74], [60, 126, 66]], wet: false, friction: 1, sky: ['#05060f', '#141838', '#3a2a58'], events: ['drone', 'fireworks'], crowd: 1600, homeShare: .5, tiers: 4,
  boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLD-PLATED EVERYTHING', 'PIE-O-MATIC (PREMIUM)'], standColor: '#8a7a40', roof: '#c8a838', music: 'gold', skyline: 'dome' });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'Kipperton', time: 'day', ambient: .95, weather: null, grass: [[104, 134, 70], [96, 126, 64]], wet: false, friction: 1, sky: ['#8a9ab0', '#b0bcc8', '#d0d4d4'], events: [], crowd: 8, homeShare: 1, tiers: 1,
  boards: ['KIPPERTON REC', 'NO BALL GAMES', 'DOGS ON LEADS', 'MIND THE GULLS'], standColor: '#6a6a60', roof: '#5a5a50', music: 'rec', skyline: 'sea' });

/* ---- super strikes (path of the ball is handled in the sim) ---- */
EF.def('super', 'kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', color: '#f08a24' });
EF.def('super', 'meteor', { name: 'ROW Z RETURN', path: 'meteor', color: '#e8a830' });
EF.def('super', 'pasodoble', { name: 'EL PASODOBLE', path: 'zigzag', color: '#9a7ad0' });
EF.def('super', 'hammer', { name: 'DER HAMMERSCHLAG', path: 'hammer', color: '#ff7a1a' });
EF.def('super', 'chiave', { name: 'LA CHIAVE', path: 'around', color: '#c8ccd4' });
EF.def('super', 'botte', { name: 'LA BOTTE D\'OR', path: 'wobble', color: '#e8c040', decoys: 3 });
EF.def('super', 'wobble', { name: 'THE WOBBLER', path: 'wobble', color: '#eef0f6' });

EF.CELEBRATIONS = [['fishslap', 'THE FISH SLAP'], ['cheer', 'ARMS UP'], ['robot', 'THE ROBOT'], ['flagdance', 'CORNER FLAG DANCE'], ['badgekiss', 'THE BADGE KISS'], ['helicopter', 'THE HELICOPTER'], ['slide', 'KNEE SLIDE']];
EF.BALLS = [{ id: 'classic', name: 'THE CLASSIC', c1: '#f4f4f0', c2: '#2a2a30' }, { id: 'orange', name: 'WINTER ORANGE', c1: '#ff9a2a', c2: '#7a3a08' }, { id: 'leather', name: 'THE OLD LEATHER', c1: '#c89a60', c2: '#5a3a18' }, { id: 'gold', name: 'GOLDEN BALL', c1: '#ffd84a', c2: '#a87a10' }];
