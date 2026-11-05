// 81-bugle: BUGLE RIDGE, elk country at dusk: a high meadow ringed by aspens, a valley with a talus slope across it, a
// timberline saddle against the sunset, a lake below catching it. The Duke answers calls from the dark timber.
const bugleN = E.makeNoise(2202 * 5 + 1);
const BUGLE_MEADOW = [[400, 380], [600, 370], [640, 520], [420, 540]];
def('hunt', 'bugle', {
  name: 'Bugle Ridge', species: 'elk', seed: 2202, order: 2, when: 'Alpine dusk', blurb: 'Bull elk bugling down the high meadows.',
  sun: { yaw: 178, elev: 9, color: '#ffc088', ambient: '#9088b8', r: 8, glow: '#ff9a5a', disc: '#ffe0b0' },
  fog: { color: '#d8a0a0', near: 240, far: 2000 }, mist: { top: 118, color: '#c8a0b8', density: .25, range: 300 },
  sky: { sky: ['#1e2a5a', '#5a4a8a', '#c86a7a', '#f0a070', '#f8c888'], stars: 30, starsY: .25, layers: [
    { kind: 'clouds', color: '#f0a090', y: .2, height: .1, parallax: .02, drift: 2 },
    { kind: 'mountains', color: '#6a5a8a', y: .4, height: .2, parallax: .02, snow: '#f8d8e0' },
    { kind: 'mountains', color: '#4a3a6a', y: .47, height: .12, parallax: .04, seed: 11, snow: '#e8c0c8' }] },
  water: { deep: '#3a3058', shallow: '#6a5070', sky: '#e8a088', foam: '#f0d8d0' },
  grade: { mul: '#fff0e8', add: '#0a0408', gamma: 1.02 },
  outline: '#ff8a40', weather: null, ambience: 'bugle', host: 'loretta', call: 'bugle', echo: [.55, 1.15],
  terrain: { base: { amp: 34, scale: 330, octaves: 5, warp: 60, offset: 130, ridged: .35 }, features: [
    { kind: 'valley', path: [[120, 690], [400, 665], [700, 655], [960, 625]], width: 60, depth: 14 },
    { kind: 'ridge', path: [[120, 800], [450, 790], [800, 780], [1000, 760]], height: 16, width: 55 },
    { kind: 'ridge', path: [[170, 60], [185, 260], [178, 330]], height: 34, width: 45 }, { kind: 'ridge', path: [[178, 530], [170, 760], [160, 980]], height: 34, width: 45 },
    { kind: 'ridge', path: [[178, 330], [178, 530]], height: 14, width: 40 },
    { kind: 'flatten', poly: BUGLE_MEADOW, z: 'avg', falloff: 50, mark: 64 },
    { kind: 'plateau', at: [505, 588], r: 7, z: [520, 455, 7], falloff: 34 },
    { kind: 'lake', center: [660, 900], radii: [160, 80], depth: 6, shore: 30 },
    { kind: 'plateau', at: [565, 604], r: 6, z: [565, 560, 6], falloff: 24 }, { kind: 'mark', poly: [[420, 705], [720, 700], [730, 785], [410, 790]], bit: 32 },
    { kind: 'plateau', at: [600, 822], r: 7, falloff: 18 },
    { kind: 'trail', path: [[300, 430], [400, 470], [505, 588], [565, 604], [600, 822]], width: 1.6 }] },
  types: c => c.water ? GT.mud : c.mask & 16 ? GT.shore : c.mask & 32 ? (c.n2 > .1 ? GT.talus : GT.rock) : c.mask & 2 ? GT.dirt : c.slope > .9 ? GT.talus : c.slope > .62 ? GT.rock : c.h > 200 ? GT.snow : c.mask & 64 ? GT.dry : c.forest > .5 ? GT.needles : c.n > .2 ? GT.dry : GT.grass,
  forest: c => { const n = .5 + .5 * bugleN(c.x / 160, c.y / 160); if (c.mask & 88 || c.water || c.slope > .8 || c.h > 190) return 0; const ring = Math.hypot(c.x - 510, c.y - 450); return clamp((n - .38) * 2.4 + (ring > 150 && ring < 230 ? .5 : 0) + (c.x > 760 && c.x < 980 && c.y > 330 && c.y < 560 ? .7 : 0) - (c.x > 690 && c.x < 790 && c.y > 380 && c.y < 480 ? 1 : 0), 0, 1); },
  farForest: (x, y, h) => h > 180 ? 0 : .3 + .5 * (.5 + .5 * bugleN(x / 200, y / 200)),
  canopy: { min: 12, max: 22 },
  palette: {
    types: { 0: { a: '#909a44', b: '#a8a44c', c: '#d0b850', speck: .06, scale: 6 }, 1: { a: '#c0a84e', b: '#d4bc62', c: '#ead080', speck: .07, scale: 5 }, 3: { a: '#8a6a4a', b: '#7a5a40' }, 4: { a: '#8a8290', b: '#9a92a0', scale: 3 }, 5: { a: '#9a96a0', b: '#7a7680', c: '#b8b4bc', speck: .3, scale: 2 },
      6: { a: '#5a4a3a', b: '#6a5a44' }, 8: { a: '#e8e0ec', b: '#d8d0e0' }, 12: { a: '#8a7a6a', b: '#9a8a7a' }, 13: { a: '#5a5034', b: '#6a5e3c', scale: 4 } },
    canopy: ['#1e3a30', '#2a4a38', '#3a5a40'],
    farTypes: (h, s, n) => h > 190 ? GT.snow : s > .7 ? GT.rock : n > .2 ? GT.dry : GT.grass
  },
  scatter: [
    { where: c => c.forest * .9, spacing: 6.5, mix: [['spruce', .55], ['fir', .45]], scale: [.8, 1.25], inFan: .5 },
    { where: c => { const r = Math.hypot(c.x - 510, c.y - 455); return (c.mask & 88) || c.water ? 0 : r > 110 && r < 200 ? .75 : c.forest > .1 && c.forest < .5 ? .25 : 0; }, spacing: 5.5, prop: 'aspen', scale: [.8, 1.2], inFan: .4 },
    { where: c => (c.mask & 64) ? .22 : c.forest < .2 && !c.water ? .08 : 0, spacing: 4.2, prop: 'goldgrass', fanMargin: -8, fanP: .5, clearR: 5 },
    { where: c => c.type === GT.talus ? .55 : c.type === GT.rock ? .25 : 0, spacing: 5, mix: [['talus', .7], ['boulder', .3]], fanMargin: -200, fanP: .8 },
    { where: c => (c.mask & 88) || c.water ? 0 : c.forest < .4 ? .08 : .03, spacing: 12, mix: [['juniper', .6], ['rock', .25], ['log', .15]] }
  ],
  vantages: {
    knoll: { at: [505, 588], eye: 1.7, yaw: -92, kind: 'rock', name: 'the knoll' },
    rim: { at: [565, 604], eye: 1.7, yaw: 90, kind: 'rock', name: 'the valley rim' },
    saddle: { at: [300, 430], eye: 1.7, yaw: 180, kind: 'ground', name: 'the saddle meadow' },
    timber: { at: [700, 430], eye: 1.7, yaw: 0, kind: 'ground', name: 'the timber edge' },
    traphouse: { at: [600, 822], eye: 1.7, yaw: 62, kind: 'ground', name: "Loretta's trap house" },
    overlook: { at: [500, 980], eye: 90, yaw: -90, kind: 'air' }
  },
  props: [['traphouse', [607, 836]], ['sign', [592, 826]], ['shed', [580, 812]], ['haybale', [612, 818]]],
  sites: ['bugle-1', 'bugle-2', 'bugle-3'], trophy: 'duke', bonus: 'saucer-season', par: 7400,
  rivals: { earl: 4000, loretta: 6300, dwayne: 7500 },
  intro: 'bugle-intro', outro: 'bugle-outro', legendBeat: 'duke-legend', bonusBeat: 'saucer-brief',
  establish: { from: [480, 1000, 90, -95], to: [500, 720, 40, -92], secs: 7 }
});
def('site', 'bugle-1', {
  hunt: 'bugle', name: 'Aspen Park', vantage: 'knoll', frame: { bearings: [-36, 36], fov: 22, pitch: 6 }, distances: [38, 90], time: 75, bucks: 3,
  director: [[0, { bearing: -14 }], [5, { bearing: 6, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['aspen', [-30, 70]], ['aspen', [28, 78]], ['aspen', [-34, 96]], ['aspen', [36, 98]], ['juniper', [-10, 44]], ['boulder', [14, 50]]],
  critters: [['marmot', { pos: [14, 50], at: 4 }], ['grouse', { pos: [-12, 42], path: [[-12, 42], [-40, 30], [-70, 40]], at: 30, wait: 2 }], ['eagle', { path: [[-60, 200], [0, 150], [60, 200], [0, 260], [-60, 200]], at: 1, alt: 55 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    const herd = S.pattern('herdPass', { kinds: ['cow', 'cow', 'bull', 'cow', 'calf', 'cow', 'bull', 'cow'], path: [[-44, 70], [-18, 62], [6, 66], [30, 74], [48, 88]], gait: 'walk', spacing: 4.5, spread: 3, points: [0, 0, S.rng.int(10, 11), 0, 0, 0, S.rng.int(10, 12), 0], stop: [.4, 5] });
    yield 8;
    const sat = S.spawn('bull', { points: 12, path: [[34, 96], [26, 80], [10, 70], [-20, 74], [-46, 88]], orders: [['call', { secs: 2.4 }], ['wait', { secs: 3 }], ['call', { secs: 2.4 }], ['walk', { to: .3 }], ['look', { secs: 2 }], ['trot', { to: 1 }], ['exit']], calm: 1.5 });
    S.on('call', () => { if (sat.alive && sat.order && (sat.order[0] === 'wait' || sat.order[0] === 'call')) { sat.orders = [['walk', { to: .35 }], ['look', { secs: 2.5 }], ['trot', { to: 1 }], ['exit']]; sat.nextOrder(); } });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'bugle-2', {
  hunt: 'bugle', name: 'Talus Slope', vantage: 'rim', frame: { bearings: [-30, 30], fov: 18, pitch: 2.5 }, distances: [100, 190], fan: [10, 200], time: 75, bucks: 3, keepHills: true,
  director: [[0, { bearing: -12 }], [5, { bearing: 8, dur: 10 }], [12, { mode: 'follow' }]],
  props: [['boulder', [-20, 140]], ['boulder', [16, 160]], ['spruce', [-36, 170]], ['spruce', [34, 150]]],
  critters: [['coyote', { path: [[-40, 210], [-10, 200], [20, 205], [44, 215]], at: 18 }]],
  script: function* (S) {
    yield 1.2; S.bark('startBull');
    S.pattern('cross', { kind: 'cow', path: [[-38, 150], [-12, 142], [14, 146], [40, 160]], gait: 'walk' });
    S.pattern('cross', { kind: 'bull', points: S.rng.int(10, 12), path: [[-40, 160], [-14, 152], [12, 156], [40, 168]], gait: 'walk', delay: 3, stop: [.45, 3] });
    yield E.any([E.until(() => S.resolved >= 1), 22]);
    S.bark('tipBreath');
    S.pattern('herdPass', { kinds: ['cow', 'bull', 'cow'], path: [[40, 130], [14, 124], [-12, 130], [-40, 140]], gait: 'trot', spacing: 6, points: [0, S.rng.int(11, 12), 0] });
    yield 6;
    if (G.sfx) G.sfx.play('rockfall');   // a rockfall up the slope startles them
    for (const a of S.actors) if (a.alive && a.cat === 'animal') a.hear(a.x, a.y - 30 * M, .8, false);
    yield E.any([E.until(() => S.resolved >= 2), 14]);
    S.pattern('cross', { kind: 'bull', points: 12, path: [[-40, 180], [-10, 172], [16, 176], [40, 186]], gait: 'walk', stop: [.5, 3.5], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'bugle-3', {
  hunt: 'bugle', name: 'Timberline Saddle', vantage: 'saddle', frame: { bearings: [-32, 32], fov: 21, pitch: -1.5 }, distances: [50, 125], time: 70, bucks: 4,
  director: [[0, { bearing: 10 }], [5, { bearing: -6, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['spruce', [-34, 80]], ['spruce', [32, 86]], ['fir', [-24, 110]], ['juniper', [8, 52]]],
  critters: [['grouse', { pos: [8, 52], path: [[8, 52], [30, 40], [60, 50]], at: 12, wait: 3 }], ['marmot', { pos: [-18, 70], at: 26 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('herdPass', { kinds: ['bull', 'cow', 'cow'], path: [[-40, 118], [-14, 114], [12, 116], [40, 122]], gait: 'walk', spacing: 5, points: [S.rng.int(10, 11), 0, 0] });
    yield E.any([E.until(() => S.resolved >= 1), 14]);
    S.pattern('herdPass', { kinds: ['cow', 'bull', 'calf'], path: [[40, 110], [10, 106], [-14, 108], [-40, 116]], gait: 'trot', spacing: 5, points: [0, S.rng.int(10, 12), 0] });
    yield E.any([E.until(() => S.resolved >= 2), 14]);
    S.pattern('charge', { kind: 'bull', points: 12, path: [[-4, 120], [-2, 80], [2, 46], [30, 40], [48, 60]], gait: 'run', speedMul: .9 });
    yield 5;
    S.pattern('cross', { kind: 'bull', points: S.rng.int(10, 12), path: [[-40, 100], [-12, 96], [14, 98], [40, 104]], gait: 'walk', stop: [.5, 2.5] });
    yield E.until(() => S.allResolved);
  }
});
/* ---------- the trophy: The Duke of Bugle Ridge ---------- */
def('trophy', 'duke', {
  hunt: 'bugle', name: 'The Duke of Bugle Ridge', spotted: 'THE DUKE!', species: 'elk', vantage: 'timber', calls: 5, frame: { bearings: [-30, 30], fov: 21, pitch: 1 }, distances: [70, 125], fan: [10, 110], time: 50, bucks: 1,
  director: [[0, { bearing: -4 }]],
  openings: [[-22, 96], [-7, 104], [8, 100], [23, 92]],
  props: [['spruce', [-30, 100]], ['spruce', [-15, 108]], ['spruce', [0, 112]], ['spruce', [15, 104]], ['spruce', [30, 98]], ['fir', [-26, 118]], ['fir', [-4, 122]], ['fir', [20, 116]]],
  mount: { label: 'THE DUKE', story: 'Seven by seven. Answered every bugle in the timber, until yours.' },
  script: function* (S) {
    const D = reg('trophy', 'duke'), H = S.site.H;
    const A = S.spawn('bull', { points: 14, trophy: 'duke', antlerMul: 1.15, size: 1.1, hidden: true, delay: 1e9, path: [D.openings[0], D.openings[0]], orders: [['hold']], calm: 9 });
    H.trophyActor = A; S.site.duke = { calls: 0, at: -1, open: false, A };
    const behind = i => { const o = D.openings[Math.min(3, Math.max(0, i))]; return S.site.pts([[o[0], o[1] + 14]])[0]; };
    let bt = 0;
    while (S.time < D.time - 1 && !A.resolved) {
      yield .1; bt += .1;
      if (!S.site.duke.open && bt > 6.5) { bt = 0; const p = behind(S.site.duke.at + 1); G.sfx && G.sfx.call('bugle', { x: p.x, y: p.y }, .9); Barks.caption('dub', S.site.duke.calls ? 'Hear him? Answer him.' : 'That\'s the Duke. Call him in.'); }
    }
    if (!A.resolved) A.goneOut();
    yield E.until(() => S.allResolved);
  },
  rules: {
    call(a, c) {
      const s = G.hunt.site, d = s.duke; if (!d || a.resolved) return false;
      d.calls++;
      if (d.calls > 4) { Barks.caption('dub', 'Too much. He knows it\'s us.'); trophyShow(a, s.pts([reg('trophy', 'duke').openings[3], [40, 130]]), [['run', { to: 1 }], ['exit']]); return true; }
      if (d.open) return true;
      d.at = Math.min(3, d.at + 1); d.open = true; const o = reg('trophy', 'duke').openings[d.at];
      G.game.after(1.4, () => {
        if (a.resolved) return;
        if (d.at === 1) s.S.pattern('cross', { kind: 'cow', path: [[o[0] - 6, o[1] + 4], [o[0], o[1]], [o[0] + 8, o[1] + 6]], gait: 'walk', calm: 9 });
        G.game.after(d.at === 1 ? 2 : 0, () => {
          if (a.resolved) return;
          trophyShow(a, s.pts([[o[0] - 3, o[1] + 3], [o[0], o[1]], [o[0] + 3, o[1] + 4]]), [['walk', { to: .5 }], ['call', { secs: 1.6 }], ['look', { secs: 2.6 }], ['walk', { to: 1 }], ['hold']]);
          G.game.after(4.4, () => { if (!a.resolved && a.state !== 'hidden') { trophyHide(a); } d.open = false; });
        });
      });
      return true;
    },
    update(H, site, dt) { const d = site.duke; if (!d) return; const o = reg('trophy', 'duke').openings[Math.max(0, d.at)], tgt = clamp(o[0] * .8, -14, 14); site.camB = E.approach(site.camB, d.at >= 0 ? tgt : -4, dt * 14); },
    hear(a, heard, near) { const d = G.hunt.site.duke; if (a.state !== 'hidden' && !a.resolved) { a.orders = [['run', { to: 1 }], ['hold']]; a.nextOrder(); G.game.after(.7, () => { if (!a.resolved) trophyHide(a); if (d) d.open = false; }); } }
  }
});
