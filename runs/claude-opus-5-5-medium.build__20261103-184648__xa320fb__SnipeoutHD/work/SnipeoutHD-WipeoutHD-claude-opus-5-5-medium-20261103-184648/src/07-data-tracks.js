// The four circuits (metres, x east, y south, z up, driving order) and their themes. Layouts checked by tools/trackcheck.mjs
(() => {
const SN = globalThis.SN;
SN.TRACKS = {
  solenne: {
    id: 'solenne', name: 'PORT SOLENNE', place: 'RIVIERA SPRAWL • MEDITERRANEAN ZONE', tier: 1, theme: 'coast', song: 'solenne', diff: 1, lengthKm: 3.84,
    blurb: 'Old stone, new money. The harbour lights are on a sponsorship contract.',
    origin: [2048, 2048, 0],
    points: [[0,0,3],[300,0,3],[600,0,4],[790,-50,7],[890,-210,14],[905,-420,24],[820,-600,32],[640,-690,36],[420,-670,38],
      [220,-705,36],[40,-645,30],[-110,-565,25.5],[-176,-470,23.6],[-188,-440,23.8],[-205,-375,15],[-195,-250,10],[-255,-120,6],
      [-320,60,4],[-300,260,3],[-200,340,3],[-100,280,3],[-80,120,3],[-40,35,3]],
    width: 28, widths: { 18: 30, 19: 30, 20: 30 }, start: 230,
    jumps: [{ from: 12, to: 14, kind: 'drop', name: 'THE HARBOUR STEP' }],
    tunnels: [{ a: { cp: 7, d: 30 }, b: { cp: 9, d: 40 }, style: 'stone' }],
    speedPads: [{ cp: 1, d: 120, u: 0 }, { cp: 4, d: 80, u: -4 }, { cp: 10, d: 80, u: 3 }, { cp: 16, d: 100, u: 0 }, { cp: 21, d: 30, u: -3 }],
    weaponPads: [{ cp: 2, d: 80 }, { cp: 7, d: -60 }, { cp: 11, d: 40 }, { cp: 17, d: 60 }],
    pit: { a: { cp: 0, d: 20 }, b: { cp: 1, d: 259 }, side: 'right', w: 8 },
    openEdges: [], banks: [], landmark: { cp: 3, text: 'SOLENNE 2161' }
  },
  karakum: {
    id: 'karakum', name: 'KARAKUM SPIRE', place: 'RED ROCK BASIN • CENTRAL DESERT ZONE', tier: 1, theme: 'desert', song: 'karakum', diff: 2, lengthKm: 4.59,
    blurb: 'A canyon the colour of rust, a spire nobody climbs, and a gorge that keeps what it catches.',
    origin: [2048, 2048, 0],
    points: [[0,0,0],[0,-330,0],[30,-575,2],[130,-740,8],[295,-820,18],[490,-820,29],[620,-778,32],[720,-712,36.5],[742,-696,37.5],
      [765,-680,28],[840,-610,21],[905,-525,16],[935,-360,11],[905,-195,9],[885,-65,7],[870,65,9],[790,165,15],[675,130,21],[655,15,26],
      [740,-50,30],[855,-50,32],[985,30,30],[1035,180,22],[945,310,14],[740,355,8],[490,345,4],[245,345,2],[50,295,0],[-25,165,0]],
    width: 26, start: 200,
    jumps: [{ from: 7, to: 9, kind: 'gap', name: 'THE GORGE', minSpeed: 75 }],
    tunnels: [{ a: { cp: 11, d: 60 }, b: { cp: 13, d: 40 }, style: 'rock' }],
    speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 6, d: 40, u: -3 }, { cp: 6, d: 80, u: 3 }, { cp: 13, d: 60, u: 0 }, { cp: 20, d: 40, u: 0 }, { cp: 24, d: 120, u: -4 }],
    weaponPads: [{ cp: 3, d: 40 }, { cp: 10, d: 60 }, { cp: 14, d: 60 }, { cp: 22, d: 60 }, { cp: 26, d: 60 }],
    pit: { a: { cp: 0, d: 10 }, b: { cp: 1, d: 0 }, side: 'left', w: 8 },
    openEdges: [{ a: { cp: 5, d: 0 }, b: { cp: 6, d: 60 }, side: 'left' }],
    banks: [{ from: 15, to: 20, deg: 28 }], landmark: { cp: 24, text: 'KARAKUM' }
  },
  meridian: {
    id: 'meridian', name: 'MERIDIAN STACK', place: 'VERTICAL DISTRICT 9 • MERIDIAN MEGACITY', tier: 2, theme: 'city', song: 'meridian', diff: 3, lengthKm: 4.18,
    blurb: 'Three hundred storeys of people who have never seen the ground. Tonight they watch you fall past their windows.',
    origin: [2048, 2048, 0],
    points: [[0,0,42],[250,-40,42],[480,-160,40],[615,-300,37],[650,-395,36.2],[653,-425,36.4],[655,-490,22],[630,-585,17],
      [460,-700,15],[240,-680,13],[100,-540,11],[0,-360,10],[-100,-180,10],[-260,-40,12],[-480,0,18],[-680,-80,24],[-780,-280,30],
      [-700,-480,36],[-500,-560,40],[-300,-480,42],[-160,-300,42],[-60,-120,42]],
    width: 24, start: 190,
    jumps: [{ from: 4, to: 6, kind: 'drop', name: 'THE STACK DROP' }],
    tunnels: [{ a: { cp: 8, d: 20 }, b: { cp: 9, d: 80 }, style: 'neon' }, { a: { cp: 13, d: 50 }, b: { cp: 14, d: 40 }, style: 'neon' }],
    speedPads: [{ cp: 1, d: 60, u: 0 }, { cp: 3, d: 50, u: 0 }, { cp: 10, d: 80, u: 3 }, { cp: 12, d: 30, u: 0 }, { cp: 17, d: 60, u: -3 }, { cp: 20, d: 60, u: 0 }],
    weaponPads: [{ cp: 2, d: 40 }, { cp: 7, d: 60 }, { cp: 12, d: 120 }, { cp: 15, d: 60 }, { cp: 19, d: -40 }],
    pit: { a: { cp: 19, d: 35 }, b: { cp: 20, d: 126 }, side: 'right', w: 8 },
    openEdges: [], banks: [], landmark: { cp: 1, text: 'MERIDIAN' }
  },
  borealis: {
    id: 'borealis', name: 'BOREALIS VAULT', place: 'POLAR RESEARCH BASIN • ARCTIC ZONE', tier: 3, theme: 'arctic', song: 'borealis', diff: 4, lengthKm: 5.03,
    blurb: 'Minus forty, plus aurora. The Authority recommends not stopping.',
    origin: [2048, 2048, 0],
    points: [[0,0,110],[-350,0,110],[-650,60,104],[-850,220,92],[-905,420,80],[-892,478,76.5],[-878,524,77.2],[-870,552,77.6],
      [-852,612,60],[-800,690,53],[-600,770,47],[-380,800,38],[-150,760,30],[60,820,22],[260,950,14],[480,1000,10],[700,960,10],
      [880,860,12],[1000,700,18],[1020,520,30],[930,380,44],[1000,250,58],[900,120,72],[720,140,84],[560,60,96],[380,0,106],[190,-15,110]],
    width: 26, start: 200,
    jumps: [{ from: 6, to: 8, kind: 'drop', name: 'THE VAULT' }],
    tunnels: [{ a: { cp: 12, d: 30 }, b: { cp: 14, d: 60 }, style: 'ice' }],
    speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 5, d: 15, u: 0 }, { cp: 10, d: 80, u: -3 }, { cp: 15, d: 100, u: 0 }, { cp: 24, d: 60, u: 3 }, { cp: 26, d: 80, u: 0 }],
    weaponPads: [{ cp: 3, d: 40 }, { cp: 11, d: 60 }, { cp: 14, d: 100 }, { cp: 17, d: 40 }, { cp: 22, d: 40 }],
    pit: { a: { cp: 0, d: 30 }, b: { cp: 1, d: -10 }, side: 'left', w: 8 },
    openEdges: [{ a: { cp: 15, d: 0 }, b: { cp: 16, d: 100 }, side: 'right' }],
    banks: [{ from: 19, to: 22, deg: 26 }], landmark: { cp: 2, text: 'BOREALIS' }
  }
};
SN.TRACK_IDS = ['solenne', 'karakum', 'meridian', 'borealis'];

/* ---- themes: sky, sun, fog, terrain colours, neon ---- */
SN.THEMES = {
  coast: { sky: { top: '#2a1a4a', horizon: '#ffb070', ground: '#c8506a', sun: '#ffd8a0', haze: .4 }, sun: { dir: [.8, -.3, -.35], color: '#ffc890', intensity: 2.4 },
    ambient: ['#ffd0c0', '#4a3a5a', 1.6], fog: { color: '#e89878', near: 9000, far: 26000 }, neon: '#29c8e8', deck: ['#22252c', '#2a2e36'], tint: '#3a3040', weather: null, wall: '#d8d8e0' },
  desert: { sky: { top: '#3a78d8', horizon: '#f0e0c0', ground: '#c89060', sun: '#fff2d0', haze: .3 }, sun: { dir: [.3, -.2, -.93], color: '#fff2d0', intensity: 3.0 },
    ambient: ['#f0e8ff', '#8a5a3a', 1.8], fog: { color: '#e8d0a0', near: 11000, far: 30000 }, neon: '#ffb347', deck: ['#2a2622', '#332e28'], tint: '#4a3020', weather: 'dust', wall: '#e8d8c0' },
  city: { sky: { top: '#05030f', horizon: '#3a1a5a', ground: '#1a0f3a', sun: false, haze: .2 }, sun: { dir: [.4, .5, -.75], color: '#8090ff', intensity: .7 },
    ambient: ['#5a5aaa', '#100818', 1.4], fog: { color: '#1a1035', near: 5000, far: 22000 }, neon: '#ff3ab4', deck: ['#1c1c26', '#24242e'], tint: '#20183a', weather: 'rain', wall: '#8a8aa0' },
  arctic: { sky: { top: '#020814', horizon: '#1a4a6a', ground: '#0a2a4a', sun: '#c0e0ff', haze: .3 }, sun: { dir: [-.5, .4, -.6], color: '#a0c8ff', intensity: 1.2 },
    ambient: ['#a0c0ff', '#203048', 1.6], fog: { color: '#9ab8d8', near: 8000, far: 26000 }, neon: '#7af0ff', deck: ['#262a32', '#2e333c'], tint: '#2a3a4a', weather: 'snow', wall: '#e0f0ff' },
  overclock: { sky: { top: '#000000', horizon: '#05000a', ground: '#000000', sun: false }, sun: { dir: [.3, .3, -.9], color: '#ffffff', intensity: .4 },
    ambient: ['#404060', '#000000', .8], fog: { color: '#000000', near: 2400, far: 9600 }, neon: '#ff3ab4', deck: ['#050508', '#08080c'], tint: '#000000', weather: null, wall: '#101018' }
};
})();
