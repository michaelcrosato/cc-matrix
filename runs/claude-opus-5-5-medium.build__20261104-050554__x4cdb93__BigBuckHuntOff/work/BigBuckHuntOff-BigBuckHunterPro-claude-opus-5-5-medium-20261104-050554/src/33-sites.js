// The nine sites (three per hunt), each with its frame, director keyframes, spawns and critters.
// Points are [bearing (deg, negative = left), distance (m)] from the site's vantage; a third entry 'jump' marks a leap.
(() => {
const B = BB, def = B.def;
const doe = (S, p) => S.rng() < p * S.doe();

// ======================= HOLLOW CREEK (whitetail) =======================
def('site', 'hollow-1', {
  hunt: 'hollow', name: 'Creek Crossing', vantage: 'creekStand', time: 60, bucks: 3,
  frame: { bearings: [-42, 42], fov: 30, pitch: 7 },
  director: [[0, { bearing: -14 }], [2, { bearing: 6, dur: 7 }], [16, { mode: 'follow' }]],
  intro: 'A tree stand over the ford. Bucks cross here at first light.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 3 });
    if (doe(S, 1)) { S.pattern('cross', { kind: 'doe', path: [[-62, 50], [-32, 40], [-8, 31, 'jump'], [18, 24], [58, 30]], gait: 'walk' }); S.pattern('cross', { kind: 'fawn', path: [[-62, 50], [-32, 40], [-8, 31, 'jump'], [18, 24], [58, 30]], gait: 'walk', delay: 1.6 }); }
    yield 5;
    S.pattern('graze', { kind: 'buck', at: [6, 44], secs: 5, from: [55, 54], to: [-58, 62] });
    yield [() => S.bucksLeft <= 2, 13];
    S.pattern('herdPass', { kinds: doe(S, .9) ? ['buck', 'doe', 'buck'] : ['buck', 'buck'], path: [[60, 33], [28, 30, 'jump'], [4, 30], [-26, 36], [-64, 46]], gait: 'bound', spacing: 1.1 });
    yield () => S.allResolved;
  },
  critters: [['squirrel', { at: 7, path: [[-30, 17], [-24, 19], [-16, 21]], orders: [['run', { to: .5 }], ['stand', 2], ['run', { to: 1 }], ['exit']] }], ['rabbit', { at: 22, path: [[34, 15], [12, 13], [-6, 16], [-40, 18]], gait: 'run' }]]
});
def('site', 'hollow-2', {
  hunt: 'hollow', name: 'Cornfield Edge', vantage: 'fieldBlind', time: 70, bucks: 4,
  frame: { bearings: [-50, 50], fov: 28, pitch: 1.5 },
  director: [[0, { bearing: -22 }], [3, { bearing: 4, dur: 6 }], [14, { mode: 'follow' }]],
  intro: "Granny Mae's corn. Deer bed in the rows and bust out at the edge.",
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 4 });
    S.pattern('emerge', { kind: 'buck', path: [[-26, 70], [-8, 56], [14, 52], [38, 64], [64, 88]], wait: 1.5, gait: 'trot' });
    S.pattern('emerge', { kind: doe(S, 1) ? 'doe' : 'buck', path: [[-34, 76], [-14, 60], [10, 56], [36, 70], [64, 96]], wait: 2.3, gait: 'trot', points: 6 });
    yield [() => S.bucksLeft <= 3, 12];
    // the fence jumper
    S.pattern('cross', { kind: 'buck', path: [[62, 66], [30, 60], [6, 50, 'jump'], [-14, 44], [-44, 52], [-66, 62]], gait: 'run' });
    yield [() => S.bucksLeft <= 2, 12];
    S.pattern('emerge', { kind: 'buck', path: [[-40, 86], [-20, 66], [8, 62], [44, 80], [66, 104]], wait: 1.2, gait: 'run' });
    yield 4;
    S.pattern('stand', { kind: 'buck', from: [-60, 110], at: [-4, 84], to: [60, 120], secs: 2.5, points: 10 });
    yield () => S.allResolved;
  },
  critters: [
    ['turkey', { at: 4, path: [[42, 40], [30, 44], [18, 50], [4, 56]], orders: [['walk', { to: .5 }], ['stand', 4], ['walk', { to: 1 }], ['exit']], strut: true }],
    ['turkey', { at: 5, path: [[46, 44], [34, 47], [22, 52], [8, 60]], orders: [['walk', { to: .5 }], ['stand', 3], ['walk', { to: 1 }], ['exit']] }],
    ['turkey', { at: 6, path: [[48, 38], [36, 41], [26, 46], [12, 54]], orders: [['walk', { to: .6 }], ['stand', 3], ['walk', { to: 1 }], ['exit']] }],
    ['cow', { at: 0, path: [[30, 92], [24, 96], [18, 98]], orders: [['walk', { to: .3 }], ['graze', 30], ['walk', { to: 1 }], ['graze', 60]] }],
    ['skunk', { at: 26, path: [[-24, 20], [-8, 18], [8, 19], [30, 24]], orders: [['walk', { to: 1 }], ['exit']] }]
  ]
});
def('site', 'hollow-3', {
  hunt: 'hollow', name: 'Hardwood Ridge', vantage: 'ridgeRock', time: 75, bucks: 4,
  frame: { bearings: [-46, 46], fov: 32, pitch: 4 },
  director: [[0, { bearing: 16 }], [3, { bearing: -6, dur: 7 }], [15, { mode: 'follow' }]],
  intro: 'Oak and maple on the ridge. Wait for a gap between the trunks.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 4 });
    S.pattern('bolt', { kind: 'buck', path: [[-6, 37], [-20, 44], [-40, 56], [-62, 64]], wait: 30 });
    S.pattern('cross', { kind: 'buck', path: [[60, 44], [30, 38], [8, 34], [-18, 40], [-46, 52], [-64, 60]], gait: 'walk', orders: [['walk', { to: .35 }], ['look', 1.5], ['walk', { to: 1 }], ['exit']] });
    yield [() => S.bucksLeft <= 3, 11];
    if (doe(S, 1)) S.pattern('cross', { kind: 'doe', path: [[-62, 30], [-30, 27], [0, 28], [30, 32], [62, 40]], gait: 'trot' });
    S.pattern('cross', { kind: 'buck', path: [[-64, 40], [-34, 37], [-4, 38], [26, 44], [62, 52]], gait: 'trot', delay: 1.2 });
    yield [() => S.bucksLeft <= 2, 12];
    S.pattern('herdPass', { kinds: ['buck', 'doe'], path: [[62, 60], [30, 54], [0, 50], [-30, 56], [-64, 66]], gait: 'run', spacing: .9 });
    yield () => S.allResolved;
  },
  critters: [['raccoon', { at: 6, path: [[-8, 33], [-7, 33.5]], orders: [['stand', 3], ['hide', 2], ['stand', 3], ['hide', 30]], peek: true }], ['squirrel', { at: 14, path: [[24, 24], [20, 26], [12, 27], [4, 30]], gait: 'run' }], ['squirrel', { at: 40, path: [[-30, 20], [-18, 23], [-6, 22]], gait: 'run' }]]
});

// ======================= BUGLE RIDGE (elk) =======================
def('site', 'bugle-1', {
  hunt: 'bugle', name: 'Aspen Park', vantage: 'knoll', time: 75, bucks: 3,
  frame: { bearings: [-46, 46], fov: 28, pitch: 2.5 },
  director: [[0, { bearing: 18 }], [2, { bearing: -4, dur: 8 }], [18, { mode: 'follow' }]],
  intro: 'A herd grazes the park at sundown. A bull is bugling in the aspens.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 3 });
    const herd = [['cow', [-14, 58]], ['cow', [-6, 66]], ['buck', [-10, 62]], ['cow', [4, 60]], ['calf', [8, 63]], ['cow', [14, 70]], ['buck', [18, 58]], ['cow', [-22, 72]]];
    for (const [k, at] of herd) { if ((k === 'cow' || k === 'calf') && !doe(S, 1)) continue; S.pattern('graze', { kind: k, at, secs: 8 + S.rng.range(0, 5), from: [at[0] + 30, at[1] + 30], to: [at[0] - 60, at[1] + 25] }); }
    yield [() => S.bucksLeft <= 2, 16];
    // the satellite bull, out of the aspens (sooner if called)
    const sat = S.pattern('emerge', { kind: 'buck', path: [[42, 72], [26, 60], [6, 52], [-24, 58], [-62, 70]], wait: 6, gait: 'walk', points: 12 });
    S.on('call', () => { if (sat.state === 'hide') sat.orders[0][1] = 0; });
    yield () => S.allResolved;
  },
  critters: [['marmot', { at: 5, path: [[-20, 13], [-20.2, 13.2]], orders: [['stand', 4], ['hide', 3], ['stand', 5], ['hide', 40]], peek: true }], ['grouse', { at: 20, path: [[30, 24], [10, 30], [-20, 40], [-60, 50]], alt: u => 1 + u * 9, gait: 'run' }], ['eagle', { at: 10, path: [[-60, 120], [-20, 110], [20, 105], [60, 115]], alt: () => 42, gait: 'walk' }]]
});
def('site', 'bugle-2', {
  hunt: 'bugle', name: 'Talus Slope', vantage: 'talus', time: 75, bucks: 3,
  frame: { bearings: [-34, 34], fov: 22, pitch: 1.5 },
  director: [[0, { bearing: -10 }], [3, { bearing: 6, dur: 8 }], [18, { mode: 'follow' }]],
  intro: 'Across the valley. Scope in, hold your breath, and squeeze.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 3 });
    S.pattern('cross', { kind: 'buck', path: [[-40, 150], [-16, 142], [6, 138], [24, 146], [44, 158]], gait: 'walk', orders: [['walk', { to: .4 }], ['graze', 4], ['walk', { to: 1 }], ['exit']] });
    if (doe(S, 1)) S.pattern('cross', { kind: 'cow', path: [[-42, 158], [-18, 150], [4, 146], [26, 154], [46, 166]], gait: 'walk', delay: 1.5 });
    yield [() => S.bucksLeft <= 2, 15];
    // a rockfall startles the next group
    S.pattern('herdPass', { kinds: doe(S, 1) ? ['buck', 'cow', 'buck'] : ['buck', 'buck'], path: [[40, 128], [18, 124], [0, 122], [-20, 130], [-42, 142]], gait: 'trot', spacing: 1.4 });
    yield 4; B.bus.emit('rockfall', { site: S.site, at: S.rel(4, 160) });
    yield () => S.allResolved;
  },
  critters: [['coyote', { at: 9, path: [[34, 182], [10, 186], [-14, 184], [-40, 190]], gait: 'trot' }]]
});
def('site', 'bugle-3', {
  hunt: 'bugle', name: 'Timberline Saddle', vantage: 'saddle', time: 70, bucks: 4,
  frame: { bearings: [-44, 44], fov: 26, pitch: 1 },
  director: [[0, { bearing: 14 }], [2, { bearing: -2, dur: 6 }], [16, { mode: 'follow' }]],
  intro: 'Into the sunset. They cross the saddle as shadows. One may come at you.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 4 });
    S.pattern('herdPass', { kinds: doe(S, 1) ? ['cow', 'buck', 'cow'] : ['buck'], path: [[-56, 70], [-26, 66], [0, 62], [24, 66], [56, 80]], gait: 'trot', spacing: 1.2 });
    yield [() => S.bucksLeft <= 3, 12];
    S.pattern('herdPass', { kinds: ['buck', 'buck'], path: [[56, 88], [28, 80], [0, 76], [-28, 82], [-58, 92]], gait: 'walk', spacing: 2 });
    yield [() => S.bucksLeft <= 1, 16];
    // the charger: downhill at the stand, then he veers
    S.pattern('charge', { kind: 'buck', path: [[10, 120], [6, 80], [2, 42], [-14, 26], [-50, 30], [-66, 44]], points: 12 });
    yield () => S.allResolved;
  },
  critters: [['grouse', { at: 8, path: [[-26, 22], [-6, 30], [20, 40], [60, 60]], alt: u => 1 + u * 8, gait: 'run' }], ['marmot', { at: 18, path: [[24, 18], [24.2, 18.2]], orders: [['stand', 5], ['hide', 3], ['stand', 4], ['hide', 40]], peek: true }]]
});

// ======================= MUSKEG LAKE (moose) =======================
def('site', 'muskeg-1', {
  hunt: 'muskeg', name: 'Reed Shallows', vantage: 'canoe', time: 70, bucks: 2,
  frame: { bearings: [-46, 46], fov: 30, pitch: 1.5 },
  director: [[0, { bearing: -16 }], [2, { bearing: 4, dur: 7 }], [16, { mode: 'follow' }]],
  intro: 'From the canoe. Moose wade the reeds, legs in the water.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 2 });
    S.pattern('cross', { kind: 'buck', path: [[-58, 70], [-30, 58], [-6, 52], [18, 58], [56, 74]], gait: 'walk', orders: [['walk', { to: .45 }], ['graze', 5], ['walk', { to: 1 }], ['exit']] });
    if (doe(S, 1)) { S.pattern('cross', { kind: 'cow', path: [[58, 40], [30, 36], [6, 34], [-20, 38], [-58, 48]], gait: 'walk', delay: 2 }); S.pattern('cross', { kind: 'calf', path: [[58, 40], [30, 36], [6, 34], [-20, 38], [-58, 48]], gait: 'walk', delay: 3.6 }); }
    yield [() => S.bucksLeft <= 1, 18];
    if (doe(S, .8)) S.pattern('cross', { kind: 'cow', path: [[60, 76], [30, 70], [0, 66], [-30, 72], [-60, 82]], gait: 'trot' });
    S.pattern('cross', { kind: 'buck', path: [[-60, 64], [-28, 60], [0, 58], [28, 64], [60, 76]], gait: 'trot', delay: 2, orders: [['trot', { to: .5 }], ['stand', 2.5], ['trot', { to: 1 }], ['exit']] });
    yield () => S.allResolved;
  },
  critters: [['loon', { at: 0, path: [[20, 26], [10, 28], [-4, 30], [-18, 31]], orders: [['walk', { to: 1 }], ['stand', 99]] }], ['beaver', { at: 6, path: [[-34, 46], [-20, 44], [-6, 46], [10, 50]], gait: 'walk', slapper: true }], ['duck', { at: 14, path: [[30, 34], [20, 40], [6, 60], [-20, 90]], alt: u => u * 18, gait: 'run' }], ['duck', { at: 14.4, path: [[32, 33], [24, 40], [10, 62], [-16, 92]], alt: u => u * 18, gait: 'run' }]]
});
def('site', 'muskeg-2', {
  hunt: 'muskeg', name: 'Spruce Bog', vantage: 'bog', time: 70, bucks: 3,
  frame: { bearings: [-48, 48], fov: 34, pitch: 2 }, fogBanks: true,
  director: [[0, { bearing: 12 }], [2, { bearing: -6, dur: 7 }], [16, { mode: 'follow' }]],
  intro: 'Fog banks roll through the bog. They loom out close. Some stand and stare.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 3 });
    S.pattern('cross', { kind: 'buck', path: [[-58, 44], [-28, 34], [-4, 30], [20, 34], [56, 46]], gait: 'walk', orders: [['walk', { to: .5 }], ['look', 3], ['walk', { to: 1 }], ['exit']] });
    yield [() => S.bucksLeft <= 2, 13];
    if (doe(S, 1)) S.pattern('cross', { kind: 'cow', path: [[58, 26], [28, 22], [0, 22], [-30, 26], [-60, 34]], gait: 'walk' });
    S.pattern('cross', { kind: 'buck', path: [[60, 40], [30, 36], [4, 34], [-26, 40], [-60, 50]], gait: 'trot', delay: 2.5 });
    yield [() => S.bucksLeft <= 1, 13];
    S.pattern('stand', { kind: 'buck', from: [-56, 30], at: [-2, 26], to: [56, 34], secs: 3, points: 12 });
    yield () => S.allResolved;
  },
  critters: [['hare', { at: 5, path: [[-30, 14], [-10, 12], [6, 13], [30, 16]], gait: 'run' }], ['raven', { at: 12, path: [[-60, 40], [-20, 34], [20, 30], [60, 34]], alt: () => 12, gait: 'walk' }]]
});
def('site', 'muskeg-3', {
  hunt: 'muskeg', name: 'Burn Clearing', vantage: 'burn', time: 75, bucks: 3,
  frame: { bearings: [-44, 44], fov: 26, pitch: 2 },
  director: [[0, { bearing: -12 }], [2, { bearing: 4, dur: 7 }], [17, { mode: 'follow' }]],
  intro: 'An old burn on the rise. Bulls fight here. Wolves hunt here.',
  script: function* (S) {
    yield 1.5; S.bark('start', { n: 3 });
    S.pattern('cross', { kind: 'buck', path: [[-56, 70], [-28, 62], [0, 58], [26, 64], [58, 78]], gait: 'trot' });
    yield [() => S.bucksLeft <= 2, 12];
    S.pattern('fight', { at: [6, 86], secs: 6 });
    yield [() => S.bucksLeft <= 0, 18];
    if (doe(S, 1)) {
      S.pattern('cross', { kind: 'cow', path: [[-60, 54], [-30, 48], [0, 46], [30, 52], [62, 64]], gait: 'run' });
      for (let k = 0; k < 3; k++) S.pattern('critter', { kind: 'wolf', path: [[-62 - k * 3, 58 + k * 3], [-30, 52 + k * 2], [0, 50 + k * 2], [30, 56 + k * 2], [64, 68 + k * 2]], gait: 'run', delay: 1.6 + k * .5 });
    }
    yield () => S.allResolved;
  },
  critters: [['raven', { at: 8, path: [[60, 60], [20, 50], [-20, 46], [-60, 52]], alt: () => 14, gait: 'walk' }]]
});
})();
