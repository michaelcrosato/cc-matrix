/* 51-stadiums: each ground's name, time and weather, pitch, stands and skyline, crowd, lights, sponsor boards and
 * matchday events. The training ground is one too. */
EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'KIPPERTON', capacity: 3112, time: 'dusk', referee: 'haltwhistle', seed: 11,
  weather: { kind: 'rain', amount: .7, wind: .4 }, surface: 'wet', mud: [[.04, .5, 36], [.96, .5, 36]], puddles: 6,
  look: { grass: ['#3a7030', '#448038'], wear: .6, lines: '#e0e4d8', tiers: [12, 22, 32, 42], standSide: '#3a3a48', standTop: '#4a4a58', seats: ['#2a3a6a', '#f08a24'], boards: '#1c2a5a', apron: '#2e3238', sky: ['#1a1a3a', '#4a3050', '#c06040'], roof: 'corrugated' },
  skyline: [['chimney', .1, 70, { smoke: true }], ['chimney', .2, 90, { smoke: true }], ['harbour', .5, 30], ['lighthouse', .86, 110, { beam: true }], ['chimney', .7, 60, { smoke: true }]],
  crowd: { size: 600, home: .8 }, lights: { ambient: .6, flood: true, color: '#fff0d0' },
  boards: ["SMOKY JOE'S KIPPERS", 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC', 'KIPPERTON FISH OIL: IT POWERS THE LIGHTS'],
  events: ['seagull', 'floodlight', 'invader-keith'] });
EF.def('stadium', 'pasapasa', { name: 'ESTADIO PASAPASA', city: 'SOLERA', capacity: 48000, time: 'day', referee: 'patience', seed: 22,
  weather: null, surface: 'hard', mud: [], puddles: 0,
  look: { grass: ['#5a9a3a', '#6aac44'], wear: .1, lines: '#f4f4ec', tiers: [14, 27, 40, 53], standSide: '#e8e0d0', standTop: '#f4ecdc', seats: ['#f4f2ec', '#9a7ad0'], boards: '#6a4aa0', apron: '#b06a40', sky: ['#4a9ae8', '#8ac8f0', '#f0e8c0'], roof: 'terracotta' },
  skyline: [['palm', .08, 60], ['dome', .3, 90], ['hills', .55, 50], ['palm', .78, 70], ['palm', .92, 55]],
  crowd: { size: 1400, home: .75 }, lights: { ambient: 1, flood: false },
  boards: ['EUROPHORIA COLA', 'SOLERA SUNSCREEN FACTOR 90', 'PASAPASA PAELLA PALACE', 'TIKI TAKA TAXIS'],
  events: ['beachball'] });
EF.def('stadium', 'stahlpresse', { name: 'STAHLPRESSE ARENA', city: 'EISENHUTTE', capacity: 61000, time: 'night', referee: 'ironside', seed: 33,
  weather: { kind: 'snow', amount: .6, wind: .2 }, surface: 'snow', mud: [], puddles: 0, ballStyle: 'orange',
  look: { grass: ['#3a6a34', '#447a3c'], wear: 0, lines: '#ffffff', tiers: [16, 31, 46, 61], standSide: '#4a4e56', standTop: '#5a5e66', seats: ['#6a7078', '#ff7a1a'], boards: '#3a3e44', apron: '#e8ecf0', sky: ['#05060e', '#10142a', '#2a2a40'], roof: 'truss' },
  skyline: [['chimney', .12, 110, { glow: true, smoke: true }], ['mountains', .4, 80], ['chimney', .62, 90, { glow: true, smoke: true }], ['mountains', .85, 100]],
  crowd: { size: 1600, home: .8 }, lights: { ambient: .45, flood: true, color: '#e8f0ff' },
  boards: ['STAHLPRESSE: WE PRESS HARDER', 'EISENHUTTE BOLTS', 'HEAVY METAL INSURANCE', 'SNOW CHAINS 4 U'],
  events: ['invader-stag', 'floodlight'] });
EF.def('stadium', 'lucchetto', { name: 'STADIO LUCCHETTO', city: 'CASTELFORTEZZA', capacity: 38000, time: 'dusk', referee: 'severo', seed: 44, uneven: true,
  weather: null, fogSecondHalf: true, surface: 'grass', mud: [], puddles: 0,
  look: { grass: ['#3e7434', '#488240'], wear: .3, lines: '#e8e8dc', tiers: [14, 26, 38, 50], standSide: '#7a6a5a', standTop: '#8a7a6a', seats: ['#7a1a2a', '#c8ccd4'], boards: '#7a1a2a', apron: '#5a4a3a', sky: ['#2a1a3a', '#6a3a4a', '#d0806a'], roof: 'old' },
  skyline: [['walls', .15, 50], ['tower', .4, 110], ['cypress', .6, 60], ['cypress', .66, 70], ['walls', .85, 50]],
  crowd: { size: 1200, home: .85 }, lights: { ambient: .6, flood: true, color: '#fff0d8' },
  boards: ['CASTELFORTEZZA LOCKSMITHS', 'CATENACCIO CAPPUCCINO', 'PARK YOUR BUS HERE', 'PADLOCK PIZZERIA'],
  events: ['flaresmoke'] });
EF.def('stadium', 'euphorium', { name: 'THE EUPHORIUM', city: 'AURELIA', capacity: 99000, time: 'night', referee: 'haltwhistle', seed: 55,
  weather: null, surface: 'grass', mud: [], puddles: 0,
  look: { grass: ['#3a8a3a', '#46a046'], wear: 0, lines: '#ffffff', tiers: [16, 32, 48, 64], standSide: '#3a3020', standTop: '#c8a040', seats: ['#e8c040', '#141414'], boards: '#141414', apron: '#2a2418', sky: ['#04040c', '#120c28', '#3a1a4a'], roof: 'dome' },
  skyline: [['ribs', .2, 120], ['searchlight', .35, 100], ['ribs', .5, 140], ['searchlight', .68, 100], ['ribs', .8, 120]],
  crowd: { size: 1600, home: .5 }, lights: { ambient: .45, flood: true, color: '#fff8e0' }, jumbotron: true,
  boards: ['BULLION BANK: MONEY TALKS', 'EUROPHORIA COLA', 'GOLD-PLATED JET SKIS', 'AURELIA CAVIAR CO.'],
  events: ['drone', 'fireworks'] });
EF.def('stadium', 'rec', { name: 'KIPPERTON REC', city: 'KIPPERTON', capacity: 8, time: 'day', referee: 'haltwhistle', seed: 66, training: true,
  weather: null, surface: 'grass', mud: [[.5, .5, 30]], puddles: 2,
  look: { grass: ['#4a7a3a', '#527e40'], wear: .8, lines: '#d8dcd0', tiers: [10, 10, 10, 10], standSide: '#6a6a5a', standTop: '#7a7a6a', seats: ['#5a6a4a', '#6a7a5a'], boards: '#4a5a3a', apron: '#5a6a4a', sky: ['#8a9ab0', '#b0bccc', '#d8dce0'], roof: 'none' },
  skyline: [['seawall', .5, 20], ['lighthouse', .9, 90]],
  crowd: { size: 8, home: 1 }, lights: { ambient: .9, flood: false },
  boards: ['KIPPERTON REC', 'NO BALL GAMES (EXCEPT THIS ONE)'], events: [] });
