// SNIPEOUT HD: the four circuits. Metres, x east, y south, z up, origin added (keeps them inside the terrain square),
// in driving order. Layouts and jump flights were checked with a script during planning (PLAN.md 4.3, App. C).
(() => {
const SN = globalThis.SN;
SN.TRACKS = {
  solenne: {
    id: 'solenne', name: 'PORT SOLENNE', place: 'RIVIERA SPRAWL · MEDITERRANEAN ZONE', tier: 1, difficulty: 1, theme: 'coast', song: 'solenne', lengthKm: 3.84,
    blurb: 'Old stone, new money. The harbour lights are on a sponsorship contract.',
    width: 28, origin: [2048, 2048, 0], start: 230, widths: { 18: 30, 19: 30, 20: 30 },
    points: [[0,0,3],[300,0,3],[600,0,4],[790,-50,7],[890,-210,14],[905,-420,24],[820,-600,32],[640,-690,36],[420,-670,38],
      [220,-705,36],[40,-645,30],[-110,-565,25.5],[-176,-470,23.6],[-188,-440,23.8],[-205,-375,15],[-195,-250,10],[-255,-120,6],
      [-320,60,4],[-300,260,3],[-200,340,3],[-100,280,3],[-80,120,3],[-40,35,3]],
    jumps: [{ from: 12, to: 14, kind: 'drop', name: 'THE HARBOUR STEP' }],
    tunnels: [{ a: { cp: 7, d: 30 }, b: { cp: 9, d: 40 }, style: 'stone' }],
    speedPads: [{ cp: 1, d: 120, u: 0 }, { cp: 4, d: 80, u: -4 }, { cp: 10, d: 80, u: 3 }, { cp: 16, d: 100, u: 0 }, { cp: 21, d: 30, u: -3 }],
    weaponPads: [{ cp: 2, d: 80 }, { cp: 7, d: -60 }, { cp: 11, d: 40 }, { cp: 17, d: 60 }],
    pit: { a: { cp: 0, d: 20 }, b: { cp: 1, d: 259 }, side: 'right', w: 8 },
    openEdges: [], banks: [],
    medals: null
  },
  karakum: {
    id: 'karakum', name: 'KARAKUM SPIRE', place: 'RED BASIN · CENTRAL ASIA ZONE', tier: 1, difficulty: 2, theme: 'desert', song: 'karakum', lengthKm: 4.59,
    blurb: 'A canyon the colour of rust, a spire nobody climbs, and a gorge that keeps what it catches.',
    width: 26, origin: [2048, 2048, 0], start: 200,
    points: [[0,0,0],[0,-330,0],[30,-575,2],[130,-740,8],[295,-820,18],[490,-820,29],[620,-778,32],[720,-712,36.5],[742,-696,37.5],
      [765,-680,28],[840,-610,21],[905,-525,16],[935,-360,11],[905,-195,9],[885,-65,7],[870,65,9],[790,165,15],[675,130,21],[655,15,26],
      [740,-50,30],[855,-50,32],[985,30,30],[1035,180,22],[945,310,14],[740,355,8],[490,345,4],[245,345,2],[50,295,0],[-25,165,0]],
    jumps: [{ from: 7, to: 9, kind: 'gap', name: 'THE GORGE', minSpeed: 75 }],
    tunnels: [{ a: { cp: 11, d: 60 }, b: { cp: 13, d: 40 }, style: 'rock' }],
    speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 6, d: 40, u: -3 }, { cp: 6, d: 80, u: 3 }, { cp: 13, d: 60, u: 0 }, { cp: 20, d: 40, u: 0 }, { cp: 24, d: 120, u: -4 }],
    weaponPads: [{ cp: 3, d: 40 }, { cp: 10, d: 60 }, { cp: 14, d: 60 }, { cp: 22, d: 60 }, { cp: 26, d: 60 }],
    pit: { a: { cp: 0, d: 10 }, b: { cp: 1, d: 0 }, side: 'left', w: 8 },
    openEdges: [{ a: { cp: 5, d: 0 }, b: { cp: 6, d: 60 }, side: 'left' }],
    banks: [{ from: 15, to: 20, deg: 28 }],
    medals: null
  },
  meridian: {
    id: 'meridian', name: 'MERIDIAN STACK', place: 'VERTICAL DISTRICT 9 · PACIFIC RIM ZONE', tier: 2, difficulty: 3, theme: 'city', song: 'meridian', lengthKm: 4.18,
    blurb: 'Three hundred storeys of people who have never seen the ground. Tonight they watch you fall past their windows.',
    width: 24, origin: [2048, 2048, 0], start: 190,
    points: [[0,0,42],[250,-40,42],[480,-160,40],[615,-300,37],[650,-395,36.2],[653,-425,36.4],[655,-490,22],[630,-585,17],
      [460,-700,15],[240,-680,13],[100,-540,11],[0,-360,10],[-100,-180,10],[-260,-40,12],[-480,0,18],[-680,-80,24],[-780,-280,30],
      [-700,-480,36],[-500,-560,40],[-300,-480,42],[-160,-300,42],[-60,-120,42]],
    jumps: [{ from: 4, to: 6, kind: 'drop', name: 'THE STACK DROP' }],
    tunnels: [{ a: { cp: 8, d: 20 }, b: { cp: 9, d: 80 }, style: 'neon' }, { a: { cp: 13, d: 50 }, b: { cp: 14, d: 40 }, style: 'neon' }],
    speedPads: [{ cp: 1, d: 60, u: 0 }, { cp: 3, d: 50, u: 0 }, { cp: 10, d: 80, u: 3 }, { cp: 12, d: 30, u: 0 }, { cp: 17, d: 60, u: -3 }, { cp: 20, d: 60, u: 0 }],
    weaponPads: [{ cp: 2, d: 40 }, { cp: 7, d: 60 }, { cp: 12, d: 120 }, { cp: 15, d: 60 }, { cp: 19, d: -40 }],
    pit: { a: { cp: 19, d: 35 }, b: { cp: 20, d: 126 }, side: 'right', w: 8 },
    openEdges: [], banks: [],
    medals: null
  },
  borealis: {
    id: 'borealis', name: 'BOREALIS VAULT', place: 'ARCTIC BASIN STATION · POLAR ZONE', tier: 3, difficulty: 4, theme: 'arctic', song: 'borealis', lengthKm: 5.03,
    blurb: 'Minus forty, plus aurora. The Authority recommends not stopping.',
    width: 26, origin: [2048, 2048, 0], start: 200,
    points: [[0,0,110],[-350,0,110],[-650,60,104],[-850,220,92],[-905,420,80],[-892,478,76.5],[-878,524,77.2],[-870,552,77.6],
      [-852,612,60],[-800,690,53],[-600,770,47],[-380,800,38],[-150,760,30],[60,820,22],[260,950,14],[480,1000,10],[700,960,10],
      [880,860,12],[1000,700,18],[1020,520,30],[930,380,44],[1000,250,58],[900,120,72],[720,140,84],[560,60,96],[380,0,106],[190,-15,110]],
    jumps: [{ from: 6, to: 8, kind: 'drop', name: 'THE VAULT' }],
    tunnels: [{ a: { cp: 12, d: 30 }, b: { cp: 14, d: 60 }, style: 'ice' }],
    speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 5, d: 15, u: 0 }, { cp: 10, d: 80, u: -3 }, { cp: 15, d: 100, u: 0 }, { cp: 24, d: 60, u: 3 }, { cp: 26, d: 80, u: 0 }],
    weaponPads: [{ cp: 3, d: 40 }, { cp: 11, d: 60 }, { cp: 14, d: 100 }, { cp: 17, d: 40 }, { cp: 22, d: 40 }],
    pit: { a: { cp: 0, d: 30 }, b: { cp: 1, d: -10 }, side: 'left', w: 8 },
    openEdges: [{ a: { cp: 15, d: 0 }, b: { cp: 16, d: 100 }, side: 'right' }],
    banks: [{ from: 19, to: 22, deg: 26 }],
    medals: null
  }
};
SN.TRACK_ORDER = ['solenne', 'karakum', 'meridian', 'borealis'];
/** medal targets: TIME TRIAL (3 laps) and HOT LAP (1 lap) per track and class, in seconds: gold, silver, bronze.
 *  Measured with tools/medals.mjs (the player bot at skill 1, no rubber band): gold = best x 1.04, silver x 1.10, bronze x 1.20 */
SN.MEDAL_TIMES = {
  "solenne/SPARK/timetrial":[140.1,148.2,161.7],
  "solenne/SPARK/hotlap":[46.3,49,53.4],
  "solenne/FLARE/timetrial":[113.8,120.3,131.3],
  "solenne/FLARE/hotlap":[37.5,39.7,43.3],
  "solenne/STORM/timetrial":[96.7,102.2,111.5],
  "solenne/STORM/hotlap":[31.7,33.5,36.6],
  "solenne/SINGULARITY/timetrial":[82.7,87.5,95.5],
  "solenne/SINGULARITY/hotlap":[27.2,28.7,31.4],
  "karakum/SPARK/timetrial":[166.8,176.4,192.5],
  "karakum/SPARK/hotlap":[55.2,58.4,63.7],
  "karakum/FLARE/timetrial":[135.2,143,156],
  "karakum/FLARE/hotlap":[44.6,47.2,51.5],
  "karakum/STORM/timetrial":[114.5,121.2,132.2],
  "karakum/STORM/hotlap":[37.8,39.9,43.6],
  "karakum/SINGULARITY/timetrial":[97,102.5,111.9],
  "karakum/SINGULARITY/hotlap":[32,33.8,36.9],
  "meridian/SPARK/timetrial":[146.4,154.8,168.9],
  "meridian/SPARK/hotlap":[48.2,51,55.6],
  "meridian/FLARE/timetrial":[117.8,124.6,135.9],
  "meridian/FLARE/hotlap":[38.7,40.9,44.7],
  "meridian/STORM/timetrial":[98.7,104.4,113.9],
  "meridian/STORM/hotlap":[32.6,34.4,37.6],
  "meridian/SINGULARITY/timetrial":[84.5,89.3,97.5],
  "meridian/SINGULARITY/hotlap":[27.8,29.4,32],
  "borealis/SPARK/timetrial":[181.1,191.6,209],
  "borealis/SPARK/hotlap":[60,63.5,69.2],
  "borealis/FLARE/timetrial":[145.2,153.6,167.6],
  "borealis/FLARE/hotlap":[48.2,51,55.6],
  "borealis/STORM/timetrial":[122.6,129.7,141.5],
  "borealis/STORM/hotlap":[40.5,42.9,46.7],
  "borealis/SINGULARITY/timetrial":[104.2,110.2,120.3],
  "borealis/SINGULARITY/hotlap":[34.5,36.5,39.8]
};
})();
