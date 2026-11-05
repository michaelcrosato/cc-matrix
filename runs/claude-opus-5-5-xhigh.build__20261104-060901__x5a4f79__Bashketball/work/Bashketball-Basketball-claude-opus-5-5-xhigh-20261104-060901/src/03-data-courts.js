/* 03-data-courts: the five courts (PLAN 10.1). Each is data: its floor's material and colors, the line colors, the logo,
 * the backdrop, the silhouettes behind the stands, props, the crowd's colors, lights, weather, the dribble's sound, its
 * song and its twist. 20-court-build and 21-court-draw read these; 22-twists runs the twists. Props are placed in world
 * units (the arena is 768 x 400: the court 64..704 x 64..352, three tiers of stands north of it, aprons around). */
def('court', 'skybox', {
  name: 'THE SKYBOX', home: 'hightops', setting: 'A NEON HEIGHTS ROOFTOP AT NIGHT', floor: 'asphalt',
  floorColors: { a: '#2a2734', b: '#363242', grain: '#1c1a24', key: '#4a1a3e', apron: '#1e1c26' }, lines: '#2de2ff', paint: '#ff3ca6', logo: 'sneaker',
  backdrop: { sky: ['#07061a', '#1d1240', '#3a1a5a'], stars: 60, starsY: .6, moon: { x: .78, y: .16, r: 11, color: '#f4f0d8' },
    layers: [{ kind: 'city', color: '#140c2a', y: .58, height: .34, parallax: .08, seed: 3 }, { kind: 'city', color: '#21143a', y: .7, height: .26, parallax: .2, seed: 7 }] },
  silhouettes: 'skyline', standFace: 'brick', standColors: ['#2a2238', '#33293f', '#3c3048', '#45384f'],
  props: [['streetlamp', 30, 56, { light: true, size: 1.4 }], ['streetlamp', 738, 56, { light: true, size: 1.4 }], ['shape:ac-unit', 22, 112], ['shape:ac-unit', 746, 252],
    ['trashcan', 36, 332, { size: 1.3 }], ['shape:boombox', 740, 148], ['shape:bench', 740, 182], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380], ['trashcan', 732, 344, { size: 1.3 }]],
  crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a', '#8a4aff'], skins: ['#8a5a3c', '#f0c8a0', '#4a2c1e', '#d8a070', '#6a4028'],
  ambient: .45, lightColor: '#ffd8b0', glows: [['#ff3ca6', 180, 40], ['#2de2ff', 560, 40]], weather: null,
  dribble: 'dribble_asphalt', music: 'skybox', twist: 'jackpot',
  intro: 'THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!'
});
def('court', 'pier', {
  name: 'THE PIER', home: 'breakers', setting: 'A BOARDWALK AT SUNSET', floor: 'planks',
  floorColors: { a: '#a87a50', b: '#b88a5a', grain: '#6a4a30', key: '#3a8a84', apron: '#d8c08a' }, lines: '#f4ecd8', paint: '#18c8b8', logo: 'wave',
  backdrop: { sky: ['#2a1a4a', '#c8506a', '#ff7a5c', '#ffd27a'], sun: { x: .3, y: .5, r: 22, color: '#fff0b0' },
    layers: [{ kind: 'clouds', color: '#ffb0a0', y: .22, height: .1, parallax: .04, seed: 2 }, { kind: 'sea', color: '#3a4a8a', y: .62, height: .4, parallax: .12, seed: 4 }] },
  silhouettes: 'boardwalk', standFace: 'plank', standColors: ['#7a5236', '#86603e', '#926a46', '#9e744e'],
  props: [['palm', 24, 56, { size: 1.5 }], ['palm', 744, 56, { size: 1.5 }], ['shape:beach-umbrella', 30, 172], ['shape:lifeguard-tower', 740, 142], ['shape:surfboard', 20, 282],
    ['shape:surfboard', 750, 312], ['awning', 30, 352, { color: '#ff7ab0' }], ['lantern', 200, 50, { anchor: 'top', light: true }], ['lantern', 568, 50, { anchor: 'top', light: true }], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#ff5a8a', '#2ad8c8', '#ffd23a', '#ffffff', '#ff8a3a'], skins: ['#f0c8a0', '#d8a070', '#8a5a3c', '#e8b890', '#6a4028'],
  ambient: .82, lightColor: '#ffe0b0', glows: [], weather: null, wind: true,
  dribble: 'dribble_planks', music: 'pier', twist: 'wind',
  intro: 'WATCH THE WIND, FOLKS. AND THE SEAGULLS. MOSTLY THE SEAGULLS.'
});
def('court', 'scrapyard', {
  name: 'THE SCRAPYARD', home: 'crushers', setting: 'A JUNKYARD AT DUSK IN LIGHT RAIN', floor: 'concrete',
  floorColors: { a: '#5a5654', b: '#66615e', grain: '#3a3634', key: '#5a3a24', apron: '#3e3a36' }, lines: '#ffd23a', paint: '#d8641e', logo: 'wrench',
  backdrop: { sky: ['#120e1a', '#4a2e36', '#b0603a'],
    layers: [{ kind: 'clouds', color: '#3a2a30', y: .18, height: .14, parallax: .05, seed: 5 }, { kind: 'mountains', color: '#2a2024', y: .66, height: .3, parallax: .1, seed: 9 }, { kind: 'hills', color: '#1e181c', y: .76, height: .2, parallax: .2, seed: 4 }] },
  silhouettes: 'junkyard', standFace: 'rock', standColors: ['#3a3634', '#44403c', '#4e4944', '#58524c'],
  props: [['shape:junk-car', 28, 102, { facing: 0, color: '#8a3a2a' }], ['shape:tire-stack', 30, 212], ['firedrum', 26, 292, { light: true, size: 1.3 }], ['firedrum', 744, 92, { light: true, size: 1.3 }],
    ['shape:junk-car', 740, 232, { facing: PI, color: '#3a6a8a' }], ['barrel', 748, 332, { color: '#5a6a3a', size: 1.3 }], ['shape:tire-stack', 30, 352], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#d8641e', '#ffd23a', '#3a5a8a', '#5a5a5a', '#8a6a3a'], skins: ['#c8a080', '#3a2418', '#e0b090', '#8a5a3c', '#6a4028'],
  ambient: .6, lightColor: '#ffd8a0', glows: [['#ffffff', 120, 60], ['#ffffff', 640, 60]], weather: { kind: 'rain', amount: .4, wind: .15 }, dog: true,
  dribble: 'dribble_concrete', music: 'scrapyard', twist: 'oil',
  intro: 'OIL ON THE FLOOR AND FIRE IN THEIR EYES!'
});
def('court', 'caldera', {
  name: 'THE CALDERA', home: 'magma', setting: 'KABOOM ISLAND\'S VOLCANO AT NIGHT', floor: 'basalt',
  floorColors: { a: '#2a2226', b: '#34282c', grain: '#1a1416', key: '#4a1a14', apron: '#221a1c', seam: '#ff6a1a' }, lines: '#ffb020', paint: '#ff3a1a', logo: 'volcano',
  backdrop: { sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 25, starsY: .4,
    layers: [{ kind: 'mountains', color: '#1e0c0e', y: .5, height: .5, parallax: .05, seed: 12 }, { kind: 'sea', color: '#2a0c14', y: .74, height: .3, parallax: .15, seed: 6 }] },
  silhouettes: 'volcano', standFace: 'plank', standColors: ['#4a3020', '#563a26', '#62442c', '#6e4e32'],
  props: [['torch', 26, 56, { light: true, size: 1.6 }], ['torch', 742, 56, { light: true, size: 1.6 }], ['shape:tiki-totem', 28, 152], ['shape:tiki-totem', 742, 172], ['palm', 24, 272, { size: 1.4 }],
    ['torch', 26, 352, { light: true, size: 1.6 }], ['torch', 742, 352, { light: true, size: 1.6 }], ['palm', 746, 272, { size: 1.4 }], ['shape:tv-camera', 300, 384], ['shape:scorer-table', 384, 380]],
  crowd: ['#ff3a1a', '#ffb020', '#ffffff', '#3ad08a', '#ff7ab0'], skins: ['#8a5030', '#3a2216', '#f0c090', '#6a4028', '#c89070'],
  ambient: .42, lightColor: '#ffb070', glows: [['#ff4a1a', 384, -40]], weather: { kind: 'ash', amount: .3, wind: .1 },
  dribble: 'dribble_stone', music: 'caldera', twist: 'volcano',
  intro: 'THE FLOOR IS HOT, THE VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!'
});
def('court', 'dome', {
  name: 'THE BLAM DOME', home: 'blambots', setting: 'THE CHAMPIONSHIP ARENA', floor: 'maple',
  floorColors: { a: '#c8904a', b: '#d49c56', grain: '#a87038', key: '#8a2020', apron: '#2a1a24' }, lines: '#f4f0e8', paint: '#d02a2a', logo: 'globo',
  backdrop: { sky: ['#05040a', '#0e0a18', '#1a1028'], indoor: true, layers: [] },
  silhouettes: 'arena', standFace: 'stone', standColors: ['#2a2234', '#322840', '#3a2e4a', '#423454'], upperDeck: true,
  props: [['shape:pyro-cannon', 40, 60], ['shape:pyro-cannon', 728, 60], ['shape:pyro-cannon', 40, 356], ['shape:pyro-cannon', 728, 356], ['shape:tv-camera', 300, 384], ['shape:tv-camera', 470, 384],
    ['shape:scorer-table', 384, 380], ['shape:trophy', 384, 362], ['shape:bench', 30, 202], ['shape:bench', 738, 202]],
  crowd: ['#d02a2a', '#ffd23a', '#2a5ad0', '#ffffff', '#3ad08a', '#ff7a2a'], skins: ['#f0c8a0', '#8a5a3c', '#4a2c1e', '#d8a070', '#6a4028', '#e0b090'],
  ambient: .72, lightColor: '#fff0d8', glows: [], weather: null, spots: true,
  dribble: 'dribble_maple', music: 'dome', twist: 'boss',
  intro: 'THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS JUMBOTRON!'
});
const COURT_ORDER = ['skybox', 'pier', 'scrapyard', 'caldera', 'dome'];
const TWIST_INFO = {
  jackpot: ['JACKPOT SPOT', 'A glowing ring moves around the court. Make a jumper with your feet in it: +2 points.'],
  wind: ['SEA BREEZE', 'Gusts blow across the Pier and bend every shot. Watch the windsock; wait out a big one.'],
  oil: ['OIL SLICKS', 'Slick spots each quarter. You slide on them, and a hard turn at turbo speed slips you.'],
  volcano: ['ERUPTIONS & STEAM VENTS', 'Lava bombs fall on the red rings. Ride a puffing steam vent with turbo + shoot: VOLCANO LAUNCH.'],
  boss: ['THE BLAMBOTS', 'They OVERCLOCK in the 4th. Knock a bot down twice in 10 seconds and it reboots.']
};
