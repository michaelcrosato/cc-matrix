// 83-range-map: UNCLE DUB'S RANGE: a mown field with earth berms behind the targets, woods round it, a bench to shoot from.
const rangeN = E.makeNoise(4404 * 5 + 1);
def('hunt', 'range', {
  name: "Uncle Dub's Range", species: 'whitetail', seed: 4404, order: 0, when: 'A clear afternoon', blurb: 'Paper don\'t run. No excuses.',
  sun: { yaw: -40, elev: 30, color: '#fff0d0', ambient: '#8a94b0', r: 6, glow: '#fff0c0', disc: '#fffbe8' },
  fog: { color: '#c8d4e0', near: 250, far: 1800 }, mist: null,
  sky: { sky: ['#4a88d8', '#8ab8e8', '#d0e4f0'], layers: [{ kind: 'clouds', color: '#ffffff', y: .16, height: .12, parallax: .02, drift: 3 }, { kind: 'hills', color: '#8aa0b8', y: .48, height: .08, parallax: .03 }] },
  water: { deep: '#2a4a5a', sky: '#a8c8e0' }, grade: { mul: '#fffaf0', gamma: 1 },
  outline: '#1a140c', weather: null, ambience: 'range', host: 'dub', call: 'grunt',
  terrain: { base: { amp: 6, scale: 300, octaves: 4, warp: 30, offset: 20 }, features: [
    { kind: 'flatten', poly: [[470, 400], [560, 400], [570, 640], [460, 640]], z: 'avg', falloff: 40, mark: 64 },
    { kind: 'flatten', poly: [[440, 300], [590, 300], [600, 410], [430, 410]], z: 'avg', falloff: 40, mark: 64 },
    { kind: 'trail', path: [[515, 640], [512, 700]], width: 2 }] },
  types: c => c.mask & 2 ? GT.dirt : c.mask & 64 ? GT.pasture : c.forest > .4 ? GT.leaves : c.n > .3 ? GT.dry : GT.grass,
  forest: c => { if (c.mask & 64) return 0; const n = .5 + .5 * rangeN(c.x / 120, c.y / 120); return clamp((n - .3) * 2.5, 0, 1) * (Math.abs(c.x - 512) > 90 || c.y < 290 ? 1 : 0); },
  farForest: () => .7, canopy: { min: 11, max: 16 },
  palette: { types: { 0: { a: '#6a8a3a', b: '#7a9444', speck: .03, scale: 8 }, 14: { a: '#7a9a44', b: '#86a44c', c: '#a8b85a', speck: .03, scale: 6 }, 1: { a: '#a89a50', b: '#b4a45a' }, 2: { a: '#7a5a2a', b: '#8a6a32' }, 3: { a: '#8a6a44', b: '#7a5e3c' } }, canopy: ['#2a4a2a', '#3a5a30', '#4a6a34'], farTypes: () => GT.grass },
  scatter: [{ where: c => c.forest * .9, spacing: 6.5, mix: [['oak', .5], ['maple', .3], ['birch', .2]], scale: [.8, 1.2] }, { where: c => c.mask & 64 ? 0 : c.forest < .3 ? .12 : 0, spacing: 4, prop: 'tallgrass' }],
  vantages: { bench: { at: [512, 620], eye: 1.5, yaw: -90, kind: 'range', name: 'the bench' }, overlook: { at: [512, 760], eye: 20, yaw: -90, kind: 'air' } },
  props: [['lowberm', [512, 594]], ['berm', [500, 574]], ['berm', [530, 574]], ['berm', [512, 462]], ['sign', [500, 616]], ['haybale', [490, 612]], ['haybale', [536, 612]], ['shed', [470, 630]]],
  sites: [], extraFans: [], trophy: null, bonus: null, par: 3000, rivals: null
});
