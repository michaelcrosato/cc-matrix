// The three hunting grounds: palettes, sun, fog, sky, terrain (base noise and features, site fans), vantages and the
// scatter rules. Points in a feature with `site` are [bearing, dist] from that vantage.
(() => {
const B = BB, def = B.def;

def('hunt', 'hollow', {
  name: 'Hollow Creek', short: 'HOLLOW CREEK', species: 'whitetail', seed: 1101, when: 'Autumn morning', blurb: 'Whitetail deer in the hardwoods. A creek, a cornfield, a ridge, and fog in the glade.',
  palette: {
    sky: ['#5a86c8', '#8fb4e0', '#d8d4d0', '#f4c8a0'], fog: '#cdd2d8', outline: '#2a1a10',
    water: ['#203a3a', '#2e5a5c', '#e8f4f0'],
    ground: { grass: '#7a8a3a', dry: '#a89850', leaf: '#9a5a2a', dirt: '#7a5e40', rock: '#7a7670', mud: '#4a3e30', snow: '#e8eef6', corn: '#b8a04a', stubble: '#a89058', reeds: '#8a7a40', canopy: '#8a4a22', talus: '#8a8478', burn: '#3a3430', far: '#6a7a48' },
    crowns: ['#c86a2a', '#d8902a', '#a83a22', '#8a7a2a', '#b85a28', '#e0a840', '#6a6a2a']
  },
  sun: { azimuth: 15, elevation: 16, color: '#ffe0b0', ambient: '#8090b0', disc: '#fff8e0', glow: '#ffd8a0' },
  fog: { near: 200, far: 1300, max: .8, mistTop: 3, mistDepth: 8, mist: .3 },
  mountains: [{ base: .6, amp: 2.2, freq: 3, seed: 11, color: '#9aa8bc' }, { base: .2, amp: 1.3, freq: 6, seed: 12, color: '#8a9a8c' }],
  clouds: [{ el: 9, th: 3, freq: 4, cover: .58, color: '#fff4ea', alpha: .85, drift: .004, seed: 3 }, { el: 16, th: 4, freq: 3, cover: .62, color: '#f0f4ff', alpha: .7, drift: .003, seed: 4 }],
  weather: { kind: 'leaves', amount: .35, color: ['#c86a2a', '#d8902a', '#a83a22'] },
  terrain: { amp: 16, scale: 260, warp: 40, rim: 40, features: [
    { type: 'river', path: [[60, 470], [220, 430], [330, 412], [430, 409], [530, 414], [640, 445], [760, 500], [980, 560]], width: 7, depth: 1.2, banks: .35 },
    { type: 'ridge', path: [[120, 520], [200, 640], [240, 820], [300, 960]], height: 22, width: 70 },
    // site 1: creek crossing, from a tree stand
    { type: 'fan', site: 'creekStand', bearings: [-50, 50], prof: [[0, 0], [14, -.6], [26, -1.4], [34, -1.2], [55, .6], [100, 3], [160, 6]], soft: 22 },
    // site 2: the cornfield corner (a ground blind)
    { type: 'fan', site: 'fieldBlind', bearings: [-55, 45], prof: [[0, 0], [40, .3], [90, .6], [140, 1.5]], soft: 25, rough: .3 },
    { type: 'field', site: 'fieldBlind', poly: [[-48, 52], [-6, 55], [10, 95], [-40, 150], [-70, 90]], crop: 'corn' },
    { type: 'zone', site: 'fieldBlind', poly: [[10, 30], [45, 30], [55, 110], [20, 120]], ground: 1 },
    // site 3: hardwood ridge, from a rock outcrop
    { type: 'fan', site: 'ridgeRock', bearings: [-45, 45], prof: [[0, 0], [12, -1.5], [40, -4], [70, -3], [110, 2]], soft: 18, rough: 1 },
    { type: 'zone', site: 'ridgeRock', poly: [[-50, 8], [50, 8], [50, 90], [-50, 90]], ground: 3 },
    // the trophy: Fog Glade
    { type: 'fan', site: 'fogGlade', bearings: [-40, 40], prof: [[0, 0], [30, -2], [70, -3], [110, -1.5], [150, 2]], soft: 20 },
    // the bonus: Granny Mae's porch over her sweet corn
    { type: 'fan', site: 'porch', bearings: [-60, 60], prof: [[0, 0], [30, .2], [80, .5]], soft: 25, rough: .2 },
    { type: 'field', site: 'porch', poly: [[-50, 36], [50, 36], [55, 80], [-55, 80]], crop: 'corn' },
    { type: 'flatten', site: 'fieldBlind', poly: [[60, 100], [80, 100], [85, 150], [55, 150]], z: 'avg', falloff: 25 },
    { type: 'trail', path: [[430, 370], [520, 330], [620, 300], [700, 225]], width: 3 },
    { type: 'trail', path: [[430, 370], [330, 440], [260, 545], [255, 640], [262, 750]], width: 3 }
  ] },
  rules: { leaf: true, rockSlope: .8, shore: 6, forest: { scale: 140, bias: .12, h: 15, crown: 7 } },
  scatter: [
    { on: [1, 2, 3], kinds: [['oak', 3], ['maple', 3], ['birch', 2]], tries: 9000, max: 700, edge: true, size: [.8, 1.25] },
    { on: [1, 2, 3], kinds: [['oak', 2], ['maple', 2], ['birch', 1], ['bush', 3]], tries: 4000, max: 260, size: [.7, 1.2] },
    { on: [1, 2, 3, 4], kinds: [['rock', 2], ['stump', 1], ['log', 1], ['bush', 2]], tries: 6000, max: 260, size: [.6, 1.3] },
    { on: [3], kinds: [['oak', 2], ['maple', 2]], tries: 1500, max: 22, inFan: true, size: [.8, 1.1], fanOnly: 'ridgeRock' }
  ],
  vantages: {
    creekStand: { at: [430, 381], yaw: 90, eye: 4.6, kind: 'treestand', name: 'Creek Stand' },
    fieldBlind: { at: [628, 296], yaw: 75, eye: 1.45, kind: 'blind', name: 'Field Blind' },
    ridgeRock: { at: [262, 600], yaw: 20, eye: 2.6, kind: 'rock', name: 'Ridge Rock' },
    fogGlade: { at: [262, 760], yaw: 60, eye: 2.0, kind: 'rock', name: 'Fog Glade' },
    porch: { at: [706, 224], yaw: 90, eye: 4.2, kind: 'porch', name: "Granny's Porch" }
  },
  props: [
    ['barn', 'fieldBlind', [38, 125], { facing: 200 }], ['fence', 'fieldBlind', [-2, 48], { facing: 150 }], ['fence', 'fieldBlind', [8, 52], { facing: 150 }], ['fence', 'fieldBlind', [16, 58], { facing: 145 }],
    ['haybale', 'fieldBlind', [25, 70]], ['haybale', 'fieldBlind', [32, 76]],
    ['log', 'creekStand', [-22, 20], { facing: 30 }], ['bush', 'creekStand', [18, 22]], ['rock', 'creekStand', [8, 36]], ['rock', 'creekStand', [-12, 31], { size: .7 }],
    ['log', 'ridgeRock', [-6, 34], { facing: 80 }], ['rock', 'ridgeRock', [22, 26]], ['stump', 'ridgeRock', [-25, 22]],
    ['house', 'porch', [180, 9], { facing: 90 }], ['haybale', 'porch', [40, 20]], ['fence', 'porch', [-30, 27], { facing: 0 }], ['fence', 'porch', [30, 27], { facing: 0 }],
    ['rock', 'fogGlade', [-25, 40], { size: 1.4 }], ['log', 'fogGlade', [15, 55], { facing: 20 }]
  ],
  sites: ['hollow-1', 'hollow-2', 'hollow-3'], trophy: 'iron-rack', bonus: 'crow', par: 6200,
  rivals: { earl: 3400, loretta: 5200, dwayne: 6100 }, ambience: 'hollow', call: 'grunt', callName: 'GRUNT TUBE'
});

def('hunt', 'bugle', {
  name: 'Bugle Ridge', short: 'BUGLE RIDGE', species: 'elk', seed: 2207, when: 'Alpine dusk', blurb: 'Elk in the high meadows. Long shots across the valley at sundown.',
  palette: {
    sky: ['#2a3a78', '#5a5a98', '#c87a8a', '#f8a860'], fog: '#b89098', outline: '#2a1418',
    water: ['#2a2a48', '#4a4a78', '#ffd8a0'],
    ground: { grass: '#9a9440', dry: '#c0a050', leaf: '#8a6a30', dirt: '#7a5a40', rock: '#9a8670', mud: '#4a3e34', snow: '#e8e0f0', corn: '#a89050', stubble: '#a89058', reeds: '#8a7a40', canopy: '#2a4a3a', talus: '#a89478', burn: '#3a3430', far: '#5a6a48' },
    crowns: ['#2a4a3a', '#24402e', '#2e5040', '#d8a830', '#2a4a3a']
  },
  sun: { azimuth: 205, elevation: 9, color: '#ffb070', ambient: '#a090b8', disc: '#fff0c0', glow: '#ffa060' },
  fog: { near: 300, far: 1700, max: .75, mistTop: -30, mistDepth: 8, mist: .3 },
  rim: 1, rimColor: '#ffc080',
  mountains: [{ base: 2.5, amp: 7, freq: 2.2, seed: 21, color: '#6a5a88', edge: '#f8c0a0', snow: 6, snowColor: '#e8d0e0' }, { base: 1, amp: 3.5, freq: 4, seed: 22, color: '#4a4a6a', edge: '#e8a890' }],
  clouds: [{ el: 7, th: 2.5, freq: 3, cover: .55, color: '#f8a070', alpha: .85, drift: .003, seed: 7 }, { el: 14, th: 3, freq: 2.5, cover: .6, color: '#d88aa0', alpha: .75, drift: .002, seed: 8 }],
  weather: null,
  terrain: { amp: 30, scale: 320, warp: 60, rim: 160, offset: 0, features: [
    { type: 'lake', at: [700, 700], radii: [110, 80], depth: 6, level: -16 },
    { type: 'fan', site: 'knoll', bearings: [-50, 50], prof: [[0, 0], [14, -1.5], [40, -4.5], [80, -4], [130, 1]], soft: 20, rough: .25 },
    { type: 'fan', site: 'talus', bearings: [-40, 40], prof: [[0, 0], [25, -6], [60, -12], [95, -10], [130, -3], [175, 5], [230, 14]], soft: 22, rough: 1.2 },
    { type: 'zone', site: 'talus', poly: [[-40, 115], [40, 115], [40, 220], [-40, 220]], ground: 13 },
    { type: 'fan', site: 'saddle', bearings: [-45, 45], prof: [[0, 0], [30, -2], [70, -3], [100, -1], [140, 4], [200, 12]], soft: 20 },
    { type: 'fan', site: 'timber', bearings: [-40, 40], prof: [[0, 0], [40, -1], [80, 0], [125, 2]], soft: 14 },
    { type: 'fan', site: 'trap', bearings: [-60, 60], prof: [[0, 0], [30, -3], [80, -10], [150, -14]], soft: 25 },
    { type: 'trail', path: [[500, 280], [420, 380], [330, 470], [300, 520]], width: 2.5 }
  ] },
  rules: { rockSlope: .7, talus: .45, talusAbove: 10, snowAbove: 70, shore: 6, forest: { scale: 120, bias: .05, h: 17, crown: 5 } },
  scatter: [
    { on: [1, 2, 13], kinds: [['spruce', 4], ['aspen', 3], ['pine', 2]], tries: 9000, max: 600, edge: true, size: [.8, 1.3] },
    { on: [1, 2], kinds: [['aspen', 3], ['spruce', 1], ['bush', 2]], tries: 3000, max: 200, size: [.7, 1.2] },
    { on: [1, 2, 5, 13], kinds: [['rock', 3], ['boulder', 1], ['log', 1]], tries: 6000, max: 300, size: [.6, 1.4] }
  ],
  vantages: {
    knoll: { at: [500, 300], yaw: 95, eye: 3.2, kind: 'knoll', name: 'Aspen Knoll' },
    talus: { at: [300, 520], yaw: 160, eye: 1.7, kind: 'rock', name: 'Valley Rim' },
    saddle: { at: [560, 520], yaw: 205, eye: 1.7, kind: 'rock', name: 'Timberline' },
    timber: { at: [420, 760], yaw: 100, eye: 1.7, kind: 'knoll', name: 'Dark Timber' },
    trap: { at: [760, 420], yaw: 300, eye: 1.7, kind: 'trap', name: 'Trap House' }
  },
  props: [
    ['rock', 'knoll', [-20, 12]], ['log', 'knoll', [30, 45], { facing: 10 }], ['aspen', 'knoll', [-42, 70]], ['aspen', 'knoll', [-36, 78]], ['aspen', 'knoll', [40, 64]], ['aspen', 'knoll', [46, 72]], ['aspen', 'knoll', [52, 60]], ['aspen', 'knoll', [-30, 90]],
    ['boulder', 'talus', [-10, 145]], ['boulder', 'talus', [20, 160], { size: .8 }], ['rock', 'talus', [5, 120]],
    ['boulder', 'saddle', [-25, 55]], ['spruce', 'saddle', [35, 40]], ['spruce', 'saddle', [-40, 48]],
    ['traphouse', 'trap', [0, 16]], ['sign', 'trap', [-14, 8], { color: '#c83a32' }]
  ],
  sites: ['bugle-1', 'bugle-2', 'bugle-3'], trophy: 'duke', bonus: 'saucer', par: 7400,
  rivals: { earl: 4100, loretta: 6300, dwayne: 7300 }, ambience: 'bugle', call: 'bugle', callName: 'ELK BUGLE'
});

def('hunt', 'muskeg', {
  name: 'Muskeg Lake', short: 'MUSKEG LAKE', species: 'moose', seed: 3313, when: 'First snow', blurb: 'Moose in the bog. Reeds, fog banks, a burn, and Big Mo on the shore.',
  palette: {
    sky: ['#6a7488', '#8a94a6', '#a8b0bc', '#c0c6cc'], fog: '#b8bec6', outline: '#141820',
    water: ['#1a2228', '#2a3640', '#c8d4dc'],
    ground: { grass: '#d8dce4', dry: '#c8ccd4', leaf: '#b0a890', dirt: '#8a8478', rock: '#6a6a70', mud: '#4a4a48', snow: '#e8ecf2', corn: '#a89050', stubble: '#a89058', reeds: '#a8884a', canopy: '#1e3228', talus: '#7a7a80', burn: '#2a2624', far: '#c8ccd4' },
    crowns: ['#1e3228', '#24382c', '#c88a30', '#1a2c24']
  },
  sun: { azimuth: 140, elevation: 22, color: '#e8ecf4', ambient: '#a0a8b8', disc: '#f0f0f0', glow: '#d0d8e0' },
  fog: { near: 90, far: 700, max: .92, mistTop: 4, mistDepth: 6, mist: .6 },
  mountains: [{ base: .4, amp: 1.6, freq: 3.5, seed: 31, color: '#8a94a4' }],
  clouds: [{ el: 6, th: 4, freq: 2, cover: .4, color: '#9aa2b0', alpha: .7, drift: .002, seed: 9 }, { el: 14, th: 6, freq: 1.5, cover: .35, color: '#8a92a0', alpha: .6, drift: .002, seed: 10 }],
  weather: { kind: 'snow', amount: .55 },
  terrain: { amp: 9, scale: 220, warp: 50, rim: 40, offset: 2, features: [
    { type: 'lake', at: [470, 500], radii: [200, 150], depth: 2.2, level: 0 },
    { type: 'fan', site: 'bog', bearings: [-55, 55], prof: [[0, 0], [20, -.3], [45, -.5], [80, 0]], soft: 18, rough: .5 },
    { type: 'fan', site: 'burn', bearings: [-45, 45], prof: [[0, 0], [30, -2], [70, -3], [110, -1], [150, 2]], soft: 20 },
    { type: 'zone', site: 'burn', poly: [[-50, 20], [50, 20], [55, 150], [-55, 150]], ground: 14 },
    { type: 'fan', site: 'shore', bearings: [-40, 40], prof: [[0, 1.5], [15, .8], [40, .3], [120, .1]], soft: 18, rough: .2 },
    { type: 'fan', site: 'fire', bearings: [-60, 60], prof: [[0, 0], [20, .3], [50, .5], [90, 1]], soft: 20, rough: .3 },
    { type: 'trail', path: [[470, 760], [600, 700], [740, 620]], width: 2.5 }
  ] },
  rules: { snowAll: true, rockSlope: .75, shore: 11, reeds: true, forest: { scale: 110, bias: .08, h: 11, crown: 4 } },
  scatter: [
    { on: [8], kinds: [['blackspruce', 5], ['tamarack', 2]], tries: 9000, max: 650, edge: true, size: [.8, 1.3], snow: true },
    { on: [8], kinds: [['blackspruce', 3], ['rock', 2], ['snowdrift', 2], ['log', 1]], tries: 5000, max: 260, size: [.7, 1.2], snow: true },
    { on: [14], kinds: [['snag', 4], ['stump', 2], ['log', 1]], tries: 2000, max: 70, inFan: true, size: [.8, 1.3] },
    { on: [11, 6], kinds: [['cattail', 1]], tries: 6000, max: 140, inFan: true }
  ],
  vantages: {
    canoe: { at: [452, 396], yaw: 270, eye: .95, kind: 'canoe', name: 'The Canoe', onWater: true },
    bog: { at: [430, 760], yaw: 80, eye: 1.7, kind: 'bog', name: 'Bog Edge' },
    burn: { at: [770, 640], yaw: 20, eye: 2.0, kind: 'rock', name: 'Burn Rise' },
    shore: { at: [470, 690], yaw: 270, eye: 3.5, kind: 'treestand', name: 'Shore Stand' },
    fire: { at: [230, 360], yaw: 30, eye: 1.7, kind: 'fire', name: "Earl's Fire" }
  },
  props: [
    ['lodge', 'canoe', [-20, 62]], ['cattail', 'canoe', [10, 40]], ['cattail', 'canoe', [-8, 45]],
    ['blackspruce', 'bog', [-30, 18]], ['blackspruce', 'bog', [32, 22]], ['blackspruce', 'bog', [-48, 36]], ['blackspruce', 'bog', [45, 40]], ['snowdrift', 'bog', [8, 30]],
    ['snag', 'burn', [-15, 45]], ['snag', 'burn', [24, 70]], ['log', 'burn', [5, 60], { facing: 70 }],
    ['campfire', 'fire', [-30, 4]], ['snowdrift', 'fire', [-20, 24]], ['snowdrift', 'fire', [10, 28]], ['snowdrift', 'fire', [30, 22]], ['snowdrift', 'fire', [-5, 38], { size: 1.3 }], ['snowdrift', 'fire', [22, 42], { size: 1.2 }]
  ],
  sites: ['muskeg-1', 'muskeg-2', 'muskeg-3'], trophy: 'big-mo', bonus: 'snowball', par: 6600,
  rivals: { earl: 3700, loretta: 5600, dwayne: 6500 }, ambience: 'muskeg', call: 'moose', callName: 'MOOSE CALL'
});

// the Practice Range: Uncle Dub's field (a small hunt of its own)
def('hunt', 'range', {
  name: "Uncle Dub's Range", short: 'PRACTICE RANGE', species: 'paper', seed: 4409, when: 'Clear noon', blurb: 'Learn the rifle, the scope and the call on paper bucks.',
  palette: {
    sky: ['#4a7ac8', '#7aa8e0', '#c8dcf0', '#e8f0f4'], fog: '#c8d4e0', outline: '#1a1410',
    water: ['#203a3a', '#2e5a5c', '#e8f4f0'],
    ground: { grass: '#7a9a40', dry: '#a8a050', leaf: '#8a6a30', dirt: '#8a6a48', rock: '#7a7670', mud: '#4a3e30', snow: '#e8eef6', corn: '#b8a04a', stubble: '#a89058', reeds: '#8a7a40', canopy: '#3a5a2a', talus: '#8a8478', burn: '#3a3430', far: '#6a8a48' },
    crowns: ['#3a6a2a', '#4a7a30', '#2e5a26']
  },
  sun: { azimuth: 120, elevation: 45, color: '#fff4e0', ambient: '#90a0c0' },
  fog: { near: 300, far: 1400, max: .7 },
  mountains: [{ base: .3, amp: 1.5, freq: 3, seed: 41, color: '#8aa0b8' }],
  clouds: [{ el: 12, th: 3, freq: 3, cover: .6, color: '#ffffff', alpha: .85, drift: .004, seed: 5 }],
  terrain: { amp: 8, scale: 300, warp: 30, rim: 50, features: [
    { type: 'fan', site: 'line', bearings: [-55, 55], prof: [[0, 0], [40, 0], [100, .5], [170, 2], [220, 6]], soft: 20, rough: .1 },
    { type: 'zone', site: 'line', poly: [[-4, 0], [4, 0], [4, 160], [-4, 160]], ground: 4 }
  ] },
  rules: { forest: { scale: 140, bias: -.05, h: 13, crown: 6 } },
  scatter: [{ on: [1, 2], kinds: [['oak', 2], ['maple', 1], ['bush', 2]], tries: 5000, max: 400, edge: true, size: [.8, 1.2] }],
  vantages: { line: { at: [512, 400], yaw: 90, eye: 1.7, kind: 'bench', name: 'Firing Line' } },
  props: [['berm', 'line', [0, 30], { facing: 180 }], ['berm', 'line', [-30, 62], { facing: 150 }], ['berm', 'line', [0, 160], { facing: 180, size: 1.5 }], ['sign', 'line', [-12, 8], { color: '#f07020' }], ['haybale', 'line', [38, 16]]],
  sites: [], par: 1
});
})();
