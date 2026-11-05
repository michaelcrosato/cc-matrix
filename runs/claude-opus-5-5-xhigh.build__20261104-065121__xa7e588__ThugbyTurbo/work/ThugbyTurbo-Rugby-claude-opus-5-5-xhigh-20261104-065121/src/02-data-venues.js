/* ---- VENUES: { id, name, time, weather, wind, grass, stands, sky, skyline, boards, hazard, music } (one twist each) ---- */
TT.VENUES = {
  muddington: {
    id: 'muddington', name: 'MUDDINGTON PARK', short: 'Muddington Park', time: 'day', weather: { kind: 'rain', amount: .7, wind: .15 },
    hazard: 'mud', music: 'mud', grass: [96, 150, 70], ingoal: [86, 140, 64], apron: [76, 120, 58],
    stand: { face: 'plank', side: '#6a4a30', top: '#8a6a48', tiers: ['#5a3e28', '#6a4a30', '#7a5638'] },
    sky: ['#7a8898', '#a0acb8', '#c0c8cc'], skyline: 'hills', skyCol: ['#5a6a58', '#46584a', '#3a4a3e'],
    boards: [['THE MUDDY DUCK', '#5a3a1e', '#f0e0a0'], ['PIES & PINTS', '#2a5a2a', '#f8f0d0'], ['BIG DAVE\'S BUSES', '#e8e030', '#1a1a1a'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .55, ambient: .95, tint: '#fff4e0', lights: false
  },
  docks: {
    id: 'docks', name: 'PORT GRUMBLE DOCKS', short: 'Port Grumble Docks', time: 'dusk', weather: { kind: 'leaves', amount: .15, wind: .6 },
    hazard: 'chicken', wind: true, music: 'shanty', grass: [92, 140, 72], ingoal: [80, 128, 66], apron: [70, 106, 60],
    stand: { face: 'stone', side: '#6a6a72', top: '#8a8a92', tiers: ['#5a5a64', '#66666e', '#727278'] },
    sky: ['#2a2a5a', '#c8603a', '#f0a050'], skyline: 'docks', skyCol: ['#3a2a3a', '#2a2030', '#1e1828'],
    boards: [['SEAGULL-PROOF CHIPS', '#1fa89a', '#ffffff'], ['KRAKEN INSURANCE', '#1e2a50', '#f0c040'], ['GRUMBLE\'S GRAVY', '#6a3a1a', '#f8e8c0'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .75, ambient: .68, tint: '#ffc890', lights: true
  },
  furnace: {
    id: 'furnace', name: 'THE FURNACE', short: 'The Furnace', time: 'night', weather: { kind: 'ash', amount: .35, wind: .1 },
    hazard: 'flames', music: 'forge', grass: [70, 112, 54], ingoal: [62, 100, 50], apron: [56, 72, 50],
    stand: { face: 'stone', side: '#2a2a30', top: '#3a3a42', tiers: ['#222228', '#2a2a30', '#32323a'] },
    sky: ['#0a0608', '#2a0e0a', '#5a1a0e'], skyline: 'chimneys', skyCol: ['#1a1014', '#140c10', '#100a0c'],
    boards: [['FORGEWORKS STEEL', '#3a3a44', '#f07a1e'], ['TURBO TONIC', '#2ac850', '#101010'], ['MEGA MEAT PIES', '#c8602a', '#fff0c0'], ['CHANNEL THUD', '#c82a2a', '#ffffff']],
    crowd: .85, ambient: .5, tint: '#ffb070', lights: true
  },
  megadome: {
    id: 'megadome', name: 'THE MEGADOME', short: 'The Megadome', time: 'night', weather: { kind: 'rain', amount: .9, wind: .3, lightning: .25 },
    hazard: 'lightning', music: 'mega', grass: [84, 138, 76], ingoal: [92, 64, 130], apron: [52, 40, 70],
    stand: { face: 'stone', side: '#3a1a5a', top: '#5a2a8a', tiers: ['#2e1448', '#3a1a5a', '#46206a'] },
    sky: ['#06060e', '#141428', '#2a2a48'], skyline: 'city', skyCol: ['#1a1a30', '#141428', '#10101e'],
    boards: [['GOLDBRICK HOLDINGS', '#5a2a8a', '#e8c040'], ['CHANNEL THUD', '#c82a2a', '#ffffff'], ['TURBO TONIC', '#2ac850', '#101010'], ['MEGA MEAT PIES', '#c8602a', '#fff0c0']],
    crowd: 1, ambient: .48, tint: '#d0c0ff', lights: true, jumbotron: true
  }
};
TT.VENUE_ORDER = ['muddington', 'docks', 'furnace', 'megadome'];
/** Exhibition weather choices: venue default, or one of these */
TT.WEATHERS = {
  venue: { label: 'VENUE DEFAULT' },
  clear: { label: 'CLEAR', w: null },
  rain: { label: 'RAIN', w: { kind: 'rain', amount: .7, wind: .15 } },
  wind: { label: 'GALE', w: { kind: 'leaves', amount: .25, wind: .8 }, wind: true },
  storm: { label: 'STORM', w: { kind: 'rain', amount: .95, wind: .4, lightning: .3 }, wind: true }
};
TT.TIMES = { day: { label: 'DAY', ambient: .95 }, dusk: { label: 'DUSK', ambient: .66 }, night: { label: 'NIGHT', ambient: .46 } };
/** the Mega Cup: four rounds */
TT.CUP = [
  { round: 'ROUND ONE', opp: 'bad', venue: 'muddington', pre: 'r1', half: 'r1h', won: 'r1w' },
  { round: 'QUARTER-FINAL', opp: 'gul', venue: 'docks', pre: 'r2', half: 'r2h', won: 'r2w' },
  { round: 'SEMI-FINAL', opp: 'irn', venue: 'furnace', pre: 'r3', half: 'r3h', won: 'r3w' },
  { round: 'GRAND FINAL', opp: 'meg', venue: 'megadome', pre: 'r4', half: 'r4h', won: 'victory' }
];
