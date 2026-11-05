/* STADIUMS (section 7.2): each with its weather, time of day, pitch, stands, skyline, crowd, events, boards and lights.
 * The training ground (rec) has no stands. */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'KIPPERTON', capacity: 3112, time: 'dusk', night2: true, referee: 'haltwhistle',
  weather: { kind: 'rain', amount: .7, wind: .4 }, surface: 'grass', mud: [[.04, .5, 40], [.96, .5, 40]], puddles: 6, grass: ['#3c7232', '#468238'], wear: .6, lines: '#e0e4d8', apron: '#3a3e36', outside: '#14161a',
  stands: { north: { tiers: 3, heights: [30, 40, 50], seats: '#2e3444', roof: 'corrugated' }, end: { tiers: 2, kind: 'terrace' } }, seats: '#2e3444', seats2: '#363c4c', standSide: '#3e4250', boardSide: '#1e2a46',
  crowd: { size: 600, home: .82 }, sky: ['#141a34', '#3a3050', '#c86a4a'], skyline: ['chimneys', 'harbour', 'lighthouse'], skyColor: '#1a1c28',
  lights: { ambient: .55, night: .42, color: '#fff0d0' }, boards: ["SMOKY JOE'S KIPPERS", 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'FISH-OIL FLOODLIGHTS LTD'],
  events: ['seagull', 'floodlight', 'invader-keith'], music: null, windDir: 1, thumb: '#3c7232' });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'SOLERA', capacity: 41000, time: 'day', referee: 'patience',
  weather: null, surface: 'hard', mud: [], puddles: 0, grass: ['#4a9a3a', '#58ac44'], wear: .15, lines: '#f4f4ec', apron: '#b08a5a', outside: '#c8a070',
  stands: { north: { tiers: 5, heights: [30, 40, 50, 60, 70], seats: '#e8e0d0' }, end: { tiers: 4 } }, seats: '#e8e0d0', seats2: '#d8c8b0', standSide: '#d8d0c0', standFace: 'plaster', boardSide: '#6a4aa0',
  crowd: { size: 1400, home: .75 }, sky: ['#3a7ad0', '#7ab0e8', '#e8d8b0'], skyline: ['palms', 'dome', 'hills'], skyColor: '#c89a6a',
  lights: { ambient: .95, color: '#fff8e0' }, boards: ['EUROPHORIA COLA', 'SIESTA MATTRESSES: SLEEP THROUGH THE SECOND HALF', 'PIE-O-MATIC', 'OLÉ AIRWAYS'],
  events: ['beachball'], music: null, thumb: '#58ac44' });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'EISENHUTTE', capacity: 52000, time: 'night', referee: 'ironside',
  weather: { kind: 'snow', amount: .6, wind: .1 }, surface: 'snow', mud: [], puddles: 0, grass: ['#3a6a3a', '#447444'], wear: .2, lines: '#e8ecf0', apron: '#5a5e66', outside: '#1a1c22',
  stands: { north: { tiers: 6, heights: [32, 44, 56, 68, 80, 92], seats: '#3a3e46' }, end: { tiers: 4 } }, seats: '#3a3e46', seats2: '#ff7a1a', standSide: '#4a4e58', standFace: 'stone', boardSide: '#2a2e34',
  crowd: { size: 1600, home: .8 }, sky: ['#05060c', '#121828', '#2a3048'], skyline: ['steelworks', 'mountains'], skyColor: '#141824',
  lights: { ambient: .4, night: .4, color: '#e8f0ff' }, boards: ['STAHLPRESSE: WE PRESS HARDER', 'GULL INSURANCE: WE COVER EVERYTHING', 'EUROPHORIA COLA', 'IRON LUNG THROAT SWEETS'],
  events: ['invader-stag', 'floodlight'], music: null, thumb: '#e8ecf0' });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'CASTELFORTEZZA', capacity: 38000, time: 'dusk', night2: true, fog2: true, uneven: true, referee: 'severo',
  weather: null, surface: 'grass', mud: [[.5, .5, 30]], puddles: 0, grass: ['#3e7634', '#48823c'], wear: .45, lines: '#e8e8dc', apron: '#5a4a3a', outside: '#1e1a18',
  stands: { north: { tiers: 4, heights: [32, 42, 52, 62], seats: '#5a2a30' }, end: { tiers: 4 } }, seats: '#5a2a30', seats2: '#6a3a3a', standSide: '#7a6a5a', standFace: 'stone', boardSide: '#4a1a22',
  crowd: { size: 1200, home: .8 }, sky: ['#1a1428', '#4a2a3a', '#d87a4a'], skyline: ['walls', 'belltower', 'cypress'], skyColor: '#2a1e1e',
  lights: { ambient: .55, night: .45, color: '#ffe0b0' }, boards: ['CASTELFORTEZZA LOCKSMITHS', 'NONNA GINA PASTA', 'EUROPHORIA COLA', 'VAR: VERY ANNOYING REPLAYS'],
  events: ['flaresmoke'], music: null, thumb: '#48823c' });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'AURELIA', capacity: 90000, time: 'night', referee: 'haltwhistle',
  weather: null, surface: 'grass', mud: [], puddles: 0, grass: ['#3e8a3a', '#4a9a44'], wear: 0, lines: '#ffffff', apron: '#2a2a3a', outside: '#0e0e16',
  stands: { north: { tiers: 6, heights: [34, 46, 58, 70, 82, 94], seats: '#c8a040' }, end: { tiers: 4 } }, seats: '#c8a040', seats2: '#e8c040', standSide: '#3a3448', standFace: 'stone', boardSide: '#141414',
  crowd: { size: 1600, home: .5 }, sky: ['#04040c', '#0c0c24', '#2a1a4a'], skyline: ['dome', 'searchlights'], skyColor: '#0c0a18', jumbotron: true,
  lights: { ambient: .45, night: .45, color: '#fff8f0' }, boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLDEN BOOT POLISH', 'CAVIAR EXPRESS'],
  events: ['drone', 'fireworks'], music: null, thumb: '#4a9a44' });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'KIPPERTON', capacity: 8, time: 'day', referee: 'haltwhistle', training: true,
  weather: null, surface: 'grass', mud: [[.3, .7, 24], [.7, .3, 20]], puddles: 0, grass: ['#4a7a3e', '#527e44'], wear: .5, lines: '#d8dcd0', apron: '#5a6a4a', outside: '#5a6450',
  stands: { north: { tiers: 1, heights: [16], seats: '#6a5a4a' }, end: { tiers: 1 } }, seats: '#6a5a4a', seats2: '#5a4a3a', standSide: '#6a6050', standFace: 'plank', boardSide: '#3a4a3a',
  crowd: { size: 8, home: 1 }, sky: ['#7a8aa0', '#a8b4c4', '#c8ccd0'], skyline: ['seawall'], skyColor: '#5a6470',
  lights: { ambient: .85, color: '#f0f0ff' }, boards: ['KIPPERTON REC: NO DOGS', 'MAGS MULLIGAN FISH: FRESH TODAY'], events: [], music: null, thumb: '#527e44' });
EF.CUP_STADIUMS = ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium'];
EF.TEAM_IDS = ['kipperton', 'hoofington', 'pasapasa', 'stahlpresse', 'lucchetto', 'opulence'];
