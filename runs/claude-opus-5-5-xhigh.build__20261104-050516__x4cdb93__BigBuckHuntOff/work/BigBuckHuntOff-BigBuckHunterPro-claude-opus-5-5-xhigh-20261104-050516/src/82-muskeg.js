// 82-muskeg: MUSKEG LAKE under the first snow: a lake with reed shallows and a beaver lodge, a spruce bog in fog to the
// north, a burned clearing of charred snags to the east, a snowy shore. Big Mo charges the shore stand.
const muskegN = E.makeNoise(3303 * 5 + 1);
const MUSKEG_BURN = [[800, 380], [960, 400], [970, 660], [810, 650]];
const MUSKEG_BAY = [[640, 420], [720, 410], [740, 500], [660, 520]];
def('hunt', 'muskeg', {
  name: 'Muskeg Lake', species: 'moose', seed: 3303, order: 3, when: 'First snow, overcast', blurb: 'Bull moose in the bog and the burn.',
  sun: { yaw: 200, elev: 18, color: '#d8dce8', ambient: '#8a90a8', disc: false },
  fog: { color: '#c8ced8', near: 90, far: 900, max: .98 }, mist: { top: 62, color: '#d8dee6', density: .35, range: 120 },
  sky: { sky: ['#6a7488', '#8a94a6', '#aab2c0', '#c2c8d2'], layers: [
    { kind: 'clouds', color: '#d8dce4', y: .14, height: .16, parallax: .02, drift: 1 },
    { kind: 'hills', color: '#8a90a0', y: .48, height: .07, parallax: .03 },
    { kind: 'forest', color: '#5a6270', y: .5, height: .06, parallax: .05, seed: 4 }] },
  water: { deep: '#2a343e', shallow: '#4a5862', sky: '#9aa4b0', foam: '#e8eef2', ice: '#c8d8e4' },
  grade: { mul: '#f0f4fa', add: '#04060a', gamma: 1.04 },
  outline: '#141a22', weather: { kind: 'snow', amount: .55, wind: .2 }, ambience: 'muskeg', host: 'earl', call: 'moosecall', echo: [.3, .7], cold: true,
  terrain: { base: { amp: 9, scale: 260, octaves: 5, warp: 50, offset: 60 }, features: [
    { kind: 'lake', center: [520, 520], radii: [230, 170], depth: 5, shore: 30 },
    { kind: 'shallow', poly: MUSKEG_BAY, depth: .7, falloff: 26 },
    { kind: 'shallow', poly: [[290, 470], [380, 470], [390, 640], [300, 650]], depth: .6, falloff: 30 },
    { kind: 'bump', at: [790, 520], r: 18, h: 4 }, { kind: 'burn', poly: MUSKEG_BURN },
    { kind: 'valley', path: [[300, 120], [500, 200], [760, 150]], width: 60, depth: 3 },
    { kind: 'plateau', at: [520, 740], r: 8, falloff: 16 }, { kind: 'plateau', at: [505, 330], r: 5, falloff: 10 }] },
  types: c => c.water ? (c.wl - c.h < .3 ? GT.ice : GT.mud) : c.mask & 4 ? (c.n2 > .55 ? GT.snow : GT.burn) : c.mask & 16 ? (c.n2 > .2 ? GT.shore : GT.snow) : c.slope > .7 ? GT.rock : c.forest > .55 && c.n > .3 ? GT.needles : GT.snow,
  forest: c => { if (c.mask & 28 || c.water) return 0; const n = .5 + .5 * muskegN(c.x / 150, c.y / 150); return clamp((n - .4) * 2.2 + (c.y < 300 ? .55 : 0), 0, 1); },
  crop: c => c.water && c.wl - c.h < 1.2 && (c.x < 400 || (c.x > 630 && c.x < 745 && c.y > 400 && c.y < 525)) && c.n2 > -.4 ? 1.9 + c.n2 * .3 : 0,
  farForest: (x, y) => .35 + .5 * (.5 + .5 * muskegN(x / 200, y / 200)),
  canopy: { min: 9, max: 15 },
  palette: {
    types: { 8: { a: '#e8ecf2', b: '#dce2ea', c: '#f8fbff', speck: .05, scale: 8 }, 9: { a: '#c8d8e4', b: '#b8c8d8' }, 6: { a: '#4a4a44', b: '#5a5a50' }, 11: { a: '#3a3432', b: '#4a4240', c: '#8a8a8a', speck: .15, scale: 3 },
      12: { a: '#8a8a84', b: '#9a9a92', c: '#e8ecf0', speck: .3, scale: 2 }, 13: { a: '#cfd6de', b: '#bcc4cc', c: '#5a5a48', speck: .12, scale: 4 }, 4: { a: '#7a7a80', b: '#8a8a90', c: '#e8eef4', speck: .3 }, 0: { a: '#c8ced6', b: '#d8dee6' } },
    canopy: ['#1a2a24', '#22322a', '#2a3a30'], crop: { 9: { c: ['#8a7a58', '#a88a5a', '#6a5a40'] }, 6: { c: ['#8a7a58', '#a88a5a', '#6a5a40'] } },
    farTypes: (h, s) => s > .6 ? GT.rock : GT.snow
  },
  scatter: [
    { where: c => c.forest * .95, spacing: 5.5, mix: [['blackspruce', .5], ['snowspruce', .3], ['tamarack', .2]], scale: [.8, 1.25], inFan: .5 },
    { where: c => (c.mask & 4) && !c.water ? .5 : 0, spacing: 11, prop: 'snag', scale: [.6, 1], fanP: .12, fanMargin: -20 },
    { where: c => !c.water && !(c.mask & 4) && c.forest < .3 ? .07 : 0, spacing: 9, mix: [['willow', .5], ['drift', .3], ['snowrock', .2]] },
    { where: c => c.wdist < 6 && !c.water ? .45 : 0, spacing: 3, prop: 'reeds', fanMargin: -10, fanP: .6, clearR: 5 },
    { where: c => (c.mask & 4) && !c.water ? .06 : c.forest > .3 ? .04 : 0, spacing: 14, mix: [['snowlog', .6], ['snowrock', .4]] }
  ],
  vantages: {
    canoe: { at: [420, 560], eye: 1.0, yaw: 180, kind: 'canoe', name: 'the canoe' },
    bogEdge: { at: [505, 330], eye: 1.7, yaw: -90, kind: 'ground', name: 'the bog edge' },
    burnRise: { at: [790, 520], eye: 1.7, yaw: 2, kind: 'ground', name: 'the rise over the burn' },
    shoreStand: { at: [768, 462], eye: 4.2, yaw: 186, kind: 'treestand', name: 'the shore stand' },
    earlFire: { at: [520, 740], eye: 1.7, yaw: 90, kind: 'ground', name: "Earl's fire" },
    overlook: { at: [520, 1000], eye: 60, yaw: -90, kind: 'air' }
  },
  props: [['lodge', [356, 600]], ['stand', [770, 464]], ['shed', [500, 752]], ['snowlog', [534, 744]], ['drift', [500, 770]], ['drift', [548, 772]]],
  sites: ['muskeg-1', 'muskeg-2', 'muskeg-3'], trophy: 'bigmo', bonus: 'snowball-standoff', par: 7800,
  rivals: { earl: 4200, loretta: 6700, dwayne: 7900 },
  intro: 'muskeg-intro', outro: 'muskeg-outro', legendBeat: 'bigmo-legend', bonusBeat: 'snowball-brief',
  establish: { from: [520, 1000, 60, -90], to: [520, 800, 30, -90], secs: 7 }
});
def('site', 'muskeg-1', {
  hunt: 'muskeg', name: 'Reed Shallows', vantage: 'canoe', frame: { bearings: [-34, 34], fov: 24, pitch: 1.5 }, distances: [34, 90], time: 70, bucks: 2,
  director: [[0, { bearing: -12 }], [5, { bearing: 6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['reeds', [-10, 30]], ['reeds', [14, 34]]],
  critters: [['duck', { pos: [10, 40], path: [[10, 40], [30, 70], [60, 120]], at: 3, wait: 7, flock: 3 }], ['beaver', { path: [[-30, 50], [-10, 42], [10, 46], [24, 52]], at: 14 }], ['loon', { path: [[20, 60], [0, 56], [-20, 62]], at: 2 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('wade', { kind: 'cow', path: [[-40, 70], [-14, 66], [10, 70], [40, 78]] });
    S.pattern('wade', { kind: 'bull', points: S.rng.int(42, 52), path: [[-40, 84], [-12, 78], [12, 82], [40, 90]], delay: 3, stop: [.45, 4] });
    yield E.any([E.until(() => S.resolved >= 1), 22]);
    S.pattern('cross', { kind: 'cow', path: [[36, 42], [10, 38], [-16, 40], [-40, 48]], gait: 'walk' });
    S.pattern('cross', { kind: 'calf', follow: S.last, back: 3 });
    yield 4;
    S.pattern('wade', { kind: 'cow', path: [[40, 62], [14, 58], [-12, 60], [-40, 66]], delay: .5 });
    S.pattern('wade', { kind: 'bull', points: 55, path: [[40, 72], [16, 68], [-10, 70], [-40, 78]], delay: 2.5, stop: [.5, 3], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'muskeg-2', {
  hunt: 'muskeg', name: 'Spruce Bog', vantage: 'bogEdge', frame: { bearings: [-38, 38], fov: 29, pitch: 2.5 }, distances: [18, 55], time: 70, bucks: 3, fanTrees: .35,
  director: [[0, { bearing: 8 }], [5, { bearing: -6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['blackspruce', [-26, 24]], ['blackspruce', [20, 30]], ['tamarack', [-8, 44]], ['snowspruce', [30, 46]], ['willow', [6, 22]], ['snowlog', [-16, 32]]],
  critters: [['hare', { path: [[24, 18], [8, 16], [-10, 20], [-30, 26]], at: 8 }], ['raven', { path: [[-60, 80], [0, 60], [60, 80]], at: 20, alt: 18, flock: 2 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('cross', { kind: 'bull', points: S.rng.int(40, 50), path: [[-44, 46], [-16, 38], [10, 40], [44, 48]], gait: 'walk' });
    yield E.any([E.until(() => S.resolved >= 1), 16]);
    S.pattern('stand', { kind: 'bull', points: S.rng.int(44, 54), from: [36, 40], at: [6, 26], secs: 5, exit: [-44, 34], calm: 2.5 });
    yield 4;
    S.pattern('cross', { kind: 'cow', path: [[-44, 30], [-14, 26], [16, 30], [44, 38]], gait: 'walk' });
    yield E.any([E.until(() => S.resolved >= 2), 16]);
    S.pattern('cross', { kind: 'bull', points: S.rng.int(46, 55), path: [[44, 34], [16, 28], [-12, 30], [-44, 40]], gait: 'trot', stop: [.45, 2] });
    yield E.until(() => S.allResolved);
  },
  update: null
});
def('site', 'muskeg-3', {
  hunt: 'muskeg', name: 'Burn Clearing', vantage: 'burnRise', frame: { bearings: [-30, 30], fov: 21, pitch: 3 }, distances: [50, 115], time: 75, bucks: 3, fanTrees: .3,
  director: [[0, { bearing: -10 }], [5, { bearing: 6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['snag', [-20, 70]], ['snag', [14, 84]], ['snag', [-4, 100]], ['snowlog', [6, 62]]],
  critters: [['raven', { path: [[-50, 120], [0, 90], [50, 120]], at: 6, alt: 22 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('cross', { kind: 'bull', points: S.rng.int(42, 52), path: [[-40, 90], [-14, 84], [12, 88], [40, 96]], gait: 'trot' });
    yield E.any([E.until(() => S.resolved >= 1), 16]);
    S.pattern('fight', { fromA: [-36, 80], fromB: [36, 84], at: [-2, 80], exitA: [-42, 110], exitB: [42, 112], secs: 6, pointsA: S.rng.int(44, 54), pointsB: S.rng.int(44, 54) });
    yield E.any([E.until(() => S.resolved >= 3), 22]);
    // a wolf pack chases a cow through (don't hit her)
    S.pattern('cross', { kind: 'cow', path: [[40, 66], [10, 60], [-16, 64], [-44, 72]], gait: 'run' });
    const cow = S.last; for (let i = 0; i < 3; i++) S.spawn('wolf', { path: [[44 + i * 3, 70 + i * 2], [12, 64 + i], [-14, 68 - i], [-46, 76]], delay: 1.2 + i * .45, behavior: 'pack', speedMul: .85 });
    yield E.until(() => S.allResolved);
  }
});
/* ---------- the trophy: Big Mo ---------- */
def('trophy', 'bigmo', {
  hunt: 'muskeg', name: 'Big Mo', spotted: 'HERE COMES BIG MO!', species: 'moose', vantage: 'shoreStand', frame: { bearings: [-26, 26], fov: 26, pitch: 6 }, distances: [15, 115], fan: [10, 120], time: 45, bucks: 1,
  director: [[0, { bearing: 0 }]],
  props: [['reeds', [-14, 104]], ['reeds', [12, 108]], ['reeds', [-2, 112]]],
  mount: { label: 'BIG MO', story: 'A 72-inch spread and opinions to match. Charged the shore stand three times.' },
  script: function* (S) {
    const H = S.site.H, mo = { charges: 0 };
    const A = S.spawn('bull', { points: 72, trophy: 'bigmo', size: 1.15, antlerMul: 1.1, hidden: true, delay: 1e9, path: [[-6, 112], [0, 60], [0, 12]], orders: [['hold']], calm: 99, hpMul: 1 });
    H.trophyActor = A; S.site.mo = mo;
    while (mo.charges < 3 && !A.resolved) {
      yield mo.charges ? 2.5 : 3;
      mo.charges++; mo.slowed = false; mo.missed = false;
      const b = (mo.charges - 2) * 9; trophyShow(A, S.site.pts([[b - 4, 114], [b * .5, 70], [0, 30], [0, 13]]), [['run', { to: 1 }], ['hold']]);
      A.o.speedMul = 1.1; A.charging = true; if (G.sfx) G.sfx.call('moose', A, 1.2);
      Barks.caption('emcee', mo.charges === 1 ? 'HERE COMES BIG MO!' : 'HE\'S COMING AGAIN!');
      yield E.until(() => A.resolved || mo.missed || A.d >= A.path.len - 14);
      if (A.resolved) break;
      if (mo.missed) {   // a miss: he pulls up, turns, and goes back to the reeds to try again
        A.orders = [['hold']]; A.nextOrder(); A.want = 0; yield .8;
        trophyShow(A, [{ x: A.x, y: A.y }].concat(S.site.pts([[(mo.charges % 2 ? 20 : -20), 90], [b, 116]])), [['trot', { to: 1 }], ['hold']]); yield E.until(() => A.resolved || A.d >= A.path.len - 1); if (!A.resolved) trophyHide(A);
        continue;
      }
      // he reached the stand: BIG MO SAYS NO!
      H.moCrash = 1; G.game.shake(10); if (G.sfx) G.sfx.play('crash'); HUD.banner('BIG MO SAYS NO!', { scale: 3, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] }); G.game.flash('#ffffff', .2, .8);
      yield 1.6; trophyShow(A, [{ x: A.x, y: A.y }].concat(S.site.pts([[40, 30], [60, 90]])), [['run', { to: 1 }], ['exit']]); mo.charges = 9; break;
    }
    if (!A.resolved) { yield 3; if (!A.resolved) A.goneOut(); }
    yield E.until(() => S.allResolved);
  },
  rules: {
    hear(a, heard, near) { const mo = G.hunt.site.mo; if (mo && !a.resolved && a.state !== 'hidden') mo.missed = true; },
    call(a) { return false; },
    wounded(a, zone) { a.limp = zone === 'leg' ? 2 : -1; a.hurtT = .4; a.o.speedMul = .55; },
    update(H, site, dt) { if (H.moCrash > 0) H.moCrash = Math.max(0, H.moCrash - dt * .6); const A = H.trophyActor; if (A && A.wounds && !site.mo.slowed) { site.mo.slowed = true; A.o.speedMul = .55; } }
  }
});
