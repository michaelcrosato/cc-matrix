// 80-hollow: HOLLOW CREEK, an autumn morning in the hardwoods: whitetails, Granny Mae's farm, the creek, Fog Glade.
const HOLLOW_CREEK = [[505, -20], [492, 110], [526, 250], [512, 360], [528, 425], [556, 520], [598, 640], [584, 780], [622, 900], [640, 1040]];
const HOLLOW_CORN = [[700, 560], [862, 556], [866, 682], [702, 688]];
const HOLLOW_PASTURE = [[598, 556], [698, 558], [700, 690], [600, 694]];
const HOLLOW_YARD = [[760, 700], [920, 700], [924, 800], [764, 806]];
const hollowN = E.makeNoise(1101 * 5 + 1);
def('hunt', 'hollow', {
  name: 'Hollow Creek', species: 'whitetail', seed: 1101, order: 1, when: 'Autumn morning', blurb: 'Whitetails in the hardwoods, mist on the creek.',
  sun: { yaw: -20, elev: 13, color: '#ffe2b8', ambient: '#7a84a4', r: 6, glow: '#ffe0b0', disc: '#fff4dc' },
  fog: { color: '#d4d8dc', near: 140, far: 1500 }, mist: { top: 46, color: '#e6e4e0', density: .55, range: 90 },
  sky: { sky: ['#6a98d8', '#a8c4e4', '#e8d8c8', '#f4d0a8'], layers: [
    { kind: 'clouds', color: '#fbf0e4', y: .16, height: .1, parallax: .02, drift: 2 },
    { kind: 'hills', color: '#9aa6bc', y: .47, height: .1, parallax: .03 },
    { kind: 'hills', color: '#8a90a0', y: .5, height: .08, parallax: .05, seed: 9 }] },
  water: { deep: '#2a4446', shallow: '#4a6a62', sky: '#b8c8d0', foam: '#e8ecec' },
  grade: { mul: '#fff4ea', add: '#060402', gamma: .96 },
  outline: '#2a1a10', weather: { kind: 'leaves', amount: .1 }, ambience: 'hollow', host: 'granny', call: 'grunt',
  terrain: { base: { amp: 13, scale: 230, octaves: 5, warp: 40, offset: 40 }, features: [
    { kind: 'valley', path: HOLLOW_CREEK, width: 60, depth: 7 },
    { kind: 'ridge', path: [[230, 110], [255, 330], [248, 520], [228, 700], [252, 900]], height: 15, width: 52 },
    { kind: 'ridge', path: [[760, 260], [900, 330], [1000, 300]], height: 9, width: 70 },
    { kind: 'flatten', poly: HOLLOW_CORN, z: 'avg', falloff: 26 },
    { kind: 'flatten', poly: HOLLOW_PASTURE, z: 'avg', falloff: 18, mark: 64 },
    { kind: 'flatten', poly: HOLLOW_YARD, z: 'avg', falloff: 22, mark: 128 },
    { kind: 'field', poly: HOLLOW_CORN },
    { kind: 'flatten', poly: [[255, 160], [345, 150], [360, 235], [270, 262]], z: 'avg', falloff: 30, mark: 32 },
    { kind: 'river', path: HOLLOW_CREEK, width: 7, depth: 1.1, banks: 6, drop: .6, fall: .004, ford: [[528, 425, 8]] },
    { kind: 'trail', path: [[420, 430], [500, 428], [528, 425], [560, 426], [640, 440]], width: 2 },
    { kind: 'trail', path: [[560, 470], [600, 560], [650, 640], [676, 668]], width: 1.6 },
    { kind: 'trail', path: [[700, 700], [760, 740], [820, 740]], width: 2.4 },
    { kind: 'plateau', at: [676, 668], r: 3, falloff: 10 },
    { kind: 'plateau', at: [252, 470], r: 4, dz: .4, falloff: 8 }] },
  types: c => c.water ? GT.mud : c.mask & 16 ? (c.n2 > .3 ? GT.shore : GT.mud) : c.mask & 1 ? GT.soil : c.mask & 128 ? GT.yard : c.mask & 2 ? GT.dirt : c.mask & 64 ? GT.pasture : c.slope > .75 ? GT.rock : c.wdist < 14 ? (c.n > .1 ? GT.dry : GT.grass) : c.forest > .45 ? GT.leaves : c.n > .3 ? GT.dry : GT.grass,
  forest: c => hollowForest(c), farForest: (x, y) => .25 + .6 * (.5 + .5 * hollowN(x / 160, y / 160)),
  crop: c => c.mask & 1 && !(c.mask & 2) ? 2.2 + c.n2 * .3 : 0,
  canopy: { min: 11, max: 18 },
  palette: {
    types: { 0: { a: '#6e8236', b: '#93964a', c: '#c0ac52', speck: .07, scale: 5 }, 1: { a: '#a89a50', b: '#b4a45a', c: '#c8b46a', speck: .05, scale: 6 }, 2: { a: '#8a5a2a', b: '#a06a2e', c: '#c8481e', speck: .12, scale: 4 },
      3: { a: '#8a6a44', b: '#7a5e3c', scale: 3 }, 4: { a: '#86827a', b: '#9a958a', scale: 3 }, 6: { a: '#5e4c34', b: '#6a5638', scale: 3 }, 10: { a: '#7a5a3a', b: '#8a6a44', scale: 2 }, 12: { a: '#8a7a62', b: '#9a8a70', c: '#b0a088', speck: .2, scale: 2 },
      14: { a: '#668636', b: '#86984a', c: '#e8e4a0', speck: .03, scale: 5 }, 15: { a: '#8a7458', b: '#9a8264', scale: 4 }, 5: { a: '#8a867e', b: '#9a968e' }, 13: { a: '#6a5a3a', b: '#7a6a44' } },
    canopy: ['#a8421c', '#c86a2a', '#8a7a2a'], crop: { 10: { c: ['#a88a4a', '#c8a85a', '#d8bc6a'], rows: true, rowsDeg: 90 } },
    farTypes: (h, s, n) => s > .6 ? GT.rock : n > .2 ? GT.dry : GT.grass
  },
  scatter: [
    { where: c => c.forest * .95, spacing: 6.5, mix: [['oak', .42], ['maple', .32], ['birch', .26]], scale: [.8, 1.2], inFan: .5 },
    { where: c => (c.mask & 233) || c.water ? 0 : c.forest < .2 ? .02 : 0, spacing: 22, mix: [['oak', .6], ['maple', .4]], scale: [.9, 1.25] },
    { where: c => (c.mask & 233) || c.water || hollowNearField(c) ? 0 : (c.forest > .15 && c.forest < .7 ? .5 : c.forest < .15 ? .06 : .12), spacing: 7, mix: [['bush', .55], ['sumac', .3], ['fern', .15]], fanMargin: 0 },
    { where: c => (c.mask & 1) || c.water || hollowNearField(c) ? 0 : c.wdist < 12 ? .55 : (c.mask & 64) ? .08 : c.forest < .3 ? .16 : 0, spacing: 3.2, prop: 'tallgrass', fanMargin: -6, fanP: .55, clearR: 6 },
    { where: c => (c.mask & 1) && c.r < .99 ? hollowCornEdge(c) : 0, spacing: 1.7, prop: 'corn', fanMargin: -100, fanP: 1 },
    { where: c => (c.mask & 233) || c.water || hollowNearField(c) ? 0 : c.forest > .3 ? .05 : .01, spacing: 16, mix: [['log', .5], ['rock', .3], ['stump', .2]], fanMargin: 2 },
    { where: c => c.type === GT.rock ? .3 : 0, spacing: 7, prop: 'rock' }
  ],
  vantages: {
    creekStand: { at: [542, 455], eye: 4.6, yaw: -100, kind: 'treestand', name: 'the creek stand' },
    fieldBlind: { at: [676, 668], eye: 1.35, yaw: -95, kind: 'blind', name: 'the cornfield blind' },
    ridgeRock: { at: [252, 470], eye: 2.3, yaw: 10, kind: 'rock', name: 'the ridge outcrop' },
    gladeEdge: { at: [306, 300], eye: 1.7, yaw: -92, kind: 'ground', name: 'the edge of Fog Glade' },
    porch: { at: [820, 728], eye: 2.2, yaw: -90, kind: 'porch', name: "Granny Mae's porch" },
    overlook: { at: [560, 1000], eye: 70, yaw: -95, kind: 'air' }
  },
  props: [
    ['farmhouse', [820, 744], { facing: 0 }], ['barn', [886, 772], { facing: 0 }], ['shed', [770, 776], { facing: 0 }], ['haybale', [860, 748]], ['haybale', [866, 752]], ['haybale', [902, 742]],
    ['stand', [544, 458]], ['sign', [690, 700]], ['boulder', [254, 474]], ['boulder', [247, 466]],
    ...Array.from({ length: 15 }, (_, i) => ['fence', [699, 686 - i * 8.6], { facing: Math.PI / 2 }]),
    ...Array.from({ length: 11 }, (_, i) => ['fence', [604 + i * 8.6, 692], { facing: 0 }])
  ],
  sites: ['hollow-1', 'hollow-2', 'hollow-3'], trophy: 'iron-rack', bonus: 'crow-patrol', par: 6200,
  rivals: { earl: 3400, loretta: 5300, dwayne: 6300 },
  intro: 'hollow-intro', outro: 'hollow-outro', legendBeat: 'iron-rack-legend', bonusBeat: 'crow-patrol-brief',
  establish: { from: [560, 1000, 70, -95], to: [560, 760, 45, -100], secs: 7 }
});
function hollowForest(c) {
  const base = .5 + .5 * hollowN(c.x / 140, c.y / 140), d = c.mask & 233 ? 0 : 1, glade = Math.hypot(c.x - 305, c.y - 205) < 70 ? 0 : 1;
  const ridge = Math.abs(c.x - 245) < 120 ? .35 : 0, creek = c.wdist < 10 ? 0 : 1;
  return clamp((base - .35) * 2.2 + ridge, 0, 1) * d * glade * creek;
}
function hollowNearField(c) { return c.x > 680 && c.x < 885 && c.y > 535 && c.y < 708 && E.polyDist(c.x, c.y, HOLLOW_CORN) < 6; }
function hollowCornEdge(c) { const d = E.polyDist(c.x, c.y, HOLLOW_CORN); return d < 3.5 ? .9 : 0; }

/* ---------- the sites ---------- */
def('site', 'hollow-1', {
  hunt: 'hollow', name: 'Creek Crossing', vantage: 'creekStand', frame: { bearings: [-38, 38], fov: 27, pitch: 4.5 }, distances: [16, 58], time: 60, bucks: 3,
  director: [[0, { bearing: -16 }], [4, { bearing: 4, dur: 6, ease: 'inOutSine' }], [10, { mode: 'follow' }]],
  props: [['log', [-24, 27]], ['bush', [16, 30]], ['tallgrass', [-6, 20]], ['tallgrass', [9, 22]], ['oak', [-36, 48], { variant: 1 }], ['maple', [34, 52]], ['birch', [26, 40]], ['rock', [-12, 38]]],
  critters: [['squirrel', { tree: [34, 44], at: 9 }], ['rabbit', { path: [[22, 17], [8, 15], [-4, 19]], at: 21 }]],
  script: function* (S) {
    yield 1.2; S.bark('start');
    const doe = S.pattern('cross', { kind: 'doe', path: [[-46, 42], [-16, 33], [14, 35], [44, 48]], gait: 'walk', stop: [.45, 2.2] });
    S.pattern('cross', { kind: 'fawn', follow: doe, back: 2.4 });
    yield 5;
    S.pattern('graze', { kind: 'buck', points: S.rng.int(5, 7), from: [42, 52], at: [14, 30], secs: 4.5, exit: [-44, 46] });
    yield E.any([E.until(() => S.bucksLeft <= 2), 15]);
    S.pattern('herdPass', { kinds: ['buck', 'doe', 'buck'], path: [[44, 30], [10, 34], [-16, 33], [-46, 40]], gait: 'bound', spacing: 5, points: [S.rng.int(6, 8), 0, S.rng.int(7, 9)], splash: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'hollow-2', {
  hunt: 'hollow', name: 'Cornfield Edge', vantage: 'fieldBlind', frame: { bearings: [-34, 40], fov: 24, pitch: 2.5 }, distances: [30, 95], time: 70, bucks: 4,
  director: [[0, { bearing: 26 }], [4, { bearing: 6, dur: 6 }], [12, { mode: 'follow' }]],
  props: [['haybale', [-10, 40]], ['bush', [-28, 52]], ['oak', [-38, 92]], ['tallgrass', [6, 31]], ['tallgrass', [-18, 34]]],
  critters: [['turkey', { path: [[-30, 60], [-8, 56], [10, 62]], at: 6, flock: 3 }], ['skunk', { path: [[18, 38], [0, 34], [-20, 40]], at: 30 }], ['bessie', { pos: [-14, 70], at: 0 }]],
  script: function* (S) {
    yield 1; S.bark('start');
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(5, 7), cover: [30, 62], path: [[30, 62], [8, 58], [-20, 64], [-40, 84]], gait: 'run' });
    S.pattern('emerge', { kind: 'doe', cover: [32, 70], path: [[32, 70], [6, 66], [-24, 70], [-42, 90]], gait: 'run', delay: .6 });
    yield E.any([E.until(() => S.resolved >= 1), 12]);
    yield 2.5;
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(6, 8), cover: [22, 48], path: [[22, 48], [0, 46], [-26, 56], [-40, 72]], gait: 'run', jump: .55 });
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(4, 6), cover: [26, 54], path: [[26, 54], [4, 50], [-22, 60], [-42, 78]], gait: 'run', delay: .9 });
    yield E.any([E.until(() => S.resolved >= 3), 16]);
    yield 2;
    S.pattern('decoyDoe', { path: [[38, 80], [10, 74], [-20, 80], [-44, 96]] });
    yield 2.2;
    S.pattern('emerge', { kind: 'buck', points: 10, cover: [36, 78], path: [[36, 78], [12, 72], [-16, 78], [-42, 94]], gait: 'trot', stop: [.4, 1.8], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'hollow-3', {
  hunt: 'hollow', name: 'Hardwood Ridge', vantage: 'ridgeRock', frame: { bearings: [-32, 32], fov: 26, pitch: 9 }, distances: [22, 75], time: 75, bucks: 4, fanTrees: .22,
  director: [[0, { bearing: -10 }], [6, { bearing: 8, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['oak', [-14, 34]], ['maple', [8, 44]], ['oak', [22, 30]], ['birch', [-26, 56]], ['birch', [16, 62]], ['log', [-4, 40]], ['bush', [28, 50]], ['oak', [-30, 26]], ['maple', [-6, 66]]],
  critters: [['raccoon', { log: [-4, 40], at: 12 }], ['squirrel', { tree: [-14, 34], at: 5 }], ['squirrel', { tree: [22, 30], at: 34 }]],
  script: function* (S) {
    yield 1; S.bark('start');
    S.pattern('cross', { kind: 'buck', points: S.rng.int(6, 8), path: [[-40, 50], [-18, 46], [-2, 52], [16, 46], [38, 56]], gait: 'walk', stop: [.35, 2] });
    S.pattern('cross', { kind: 'doe', path: [[-40, 60], [-14, 58], [10, 60], [40, 66]], gait: 'walk', delay: 2.5 });
    S.pattern('bolt', { kind: 'buck', points: S.rng.int(7, 9), bed: [-4, 43], path: [[-4, 43], [10, 50], [36, 66]], after: 14 });
    yield E.any([E.until(() => S.resolved >= 2), 16]);
    yield 2;
    S.pattern('decoyDoe', { path: [[38, 40], [12, 36], [-14, 40], [-40, 48]], gait: 'trot' });
    yield 1.6;
    S.pattern('cross', { kind: 'buck', points: S.rng.int(5, 8), path: [[38, 44], [12, 40], [-14, 44], [-40, 54]], gait: 'trot' });
    yield E.any([E.until(() => S.resolved >= 3), 14]);
    S.pattern('cross', { kind: 'buck', points: S.rng.int(8, 10), path: [[40, 70], [14, 64], [-10, 68], [-40, 72]], gait: 'walk', stop: [.5, 2.5], big: true });
    yield E.until(() => S.allResolved);
  }
});

/* ---------- the trophy: Old Iron Rack, in Fog Glade ---------- */
def('trophy', 'iron-rack', {
  hunt: 'hollow', name: 'Old Iron Rack', spotted: "THAT'S OLD IRON RACK!", species: 'whitetail', vantage: 'gladeEdge', frame: { bearings: [-30, 30], fov: 24, pitch: 2.5 }, distances: [55, 110], fan: [10, 110], time: 45, bucks: 1,
  director: [[0, { bearing: -10 }], [3, { bearing: -12, dur: 2 }], [12, { bearing: 6, dur: 4 }], [24, { bearing: -4, dur: 4 }]],
  props: [['oak', [-30, 70]], ['maple', [24, 64]], ['oak', [-12, 104]], ['birch', [10, 108]], ['bush', [-20, 80]], ['bush', [14, 78]], ['oak', [32, 96]]],
  windows: [[4, [[-30, 94], [-12, 88], [-2, 90]]], [15, [[18, 76], [4, 70], [-10, 72]]], [27, [[-22, 100], [-6, 96], [10, 98]]]],
  mount: { x: 0, label: 'OLD IRON RACK', story: 'Fourteen points, a kicker and a drop tine. Walked the fog in Fog Glade.' },
  script: function* (S) {
    const D = reg('trophy', 'iron-rack'), H = S.site.H;
    const A = S.spawn('buck', { points: 14, kicker: true, drop: true, trophy: 'iron-rack', antlerMul: 1.2, size: 1.12, hidden: true, delay: 1e9, path: D.windows[0][1], orders: [['hold']], calm: 9 });
    H.trophyActor = A; S.site.windowIdx = -1;
    for (let w = 0; w < 3; w++) {
      yield E.until(() => S.time >= D.windows[w][0] || !A.alive && A.state !== 'hidden');
      if (A.resolved) break;
      S.site.windowIdx = w; A.bolted = false;
      trophyShow(A, S.site.pts(D.windows[w][1]), [['walk', { to: .55 }], ['look', { secs: .9 }], ['walk', { to: 1 }], ['hold']]);
      if (w === 2) S.pattern('cross', { kind: 'doe', path: [[16, 80], [0, 76], [-18, 80], [-34, 88]], gait: 'walk', calm: 9 });
      yield E.any([3.5, E.until(() => A.bolted || A.resolved)]);
      if (A.resolved) break;
      if (A.bolted) { A.orders = [['run', { to: 1 }], ['hold']]; A.nextOrder(); yield .8; }
      S.site.windowIdx = -1; if (w < 2) trophyHide(A); else A.goneOut();
    }
    yield E.until(() => S.allResolved);
  },
  rules: {
    hear(a, heard, near) { a.bolted = true; a.fear = 0; },
    call(a, c) { const s = G.hunt.site; if (s.windowIdx === 2 && !a.calledOnce && a.state !== 'hidden') { a.calledOnce = true; a.frozenT = 1.0; a.lookAt = { x: c.x, y: c.y, z: 0 }; return true; } return false; },
    update(H, site, dt) { const open = site.windowIdx >= 0, k = site.fogK = E.approach(site.fogK === undefined ? 0 : site.fogK, open ? 0 : 1, dt * (open ? 1.6 : .5)); const F = H.world.fogFor(); H.world.vista.setLook({ fog: { color: '#e6e6e2', near: lerp(F.near, 18 * M, k), far: lerp(F.far, 135 * M, k), max: lerp(F.max, .97, k), fill: k > .35 } }); }
  }
});
