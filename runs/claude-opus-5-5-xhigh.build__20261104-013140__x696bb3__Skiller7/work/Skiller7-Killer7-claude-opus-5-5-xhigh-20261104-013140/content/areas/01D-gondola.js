/* TARGET 01 · 01D HIMMELSBAHN, THE GONDOLA (§11.7): a storm-fogged valley under one long cable. You ride a cabin (aim from
 * it: cabins pass on the down cable with Snowballers leaning out; Cable Crawlers come hand over hand; climbers at the
 * windows). At 55% the power cuts: the cabin swings, Pim sits on the roof, and three frozen insulators on the next
 * pylon, far, must be shot (Ignaz's scope) before the power comes back. */
S7.gondolaHeight = (x, y) => {
  const m = x / M, n = y / M, u = clamp((1900 - n) / 1800, 0, 1);
  let z = 100 + u * 1200 - Math.sin(u * Math.PI) * 260;
  const vx = (m - 1000) / 220; z += vx * vx * 160;
  z += (E.noise2(m / 90, n / 90) - .5) * 30 + (E.noise2(m / 23, n / 23) - .5) * 5;
  return z * M;
};
S7.CABLE = { a: [1000, 1880, 116], b: [1000, 120, 1332] };   // metres: the village station and the glacier station (z of the cable)
S7.cableZ = (n) => { const A = S7.CABLE.a, B = S7.CABLE.b, u = clamp((A[1] - n) / (A[1] - B[1]), 0, 1); return A[2] + (B[2] - A[2]) * u - Math.sin(u * Math.PI) * 30; };
S7.area('01D', {
  title: 'HIMMELSBAHN', sub: 'THE GONDOLA', target: 1, music: 'gondola', ambience: 'storm', outdoor: true, sweepNode: 'gs', pinNo: 6, cabin: true,
  world: { kind: 'terrain', height: S7.gondolaHeight, color: S7.snowColor([214, 222, 236]), size: 32768, far: 12000,
    terrainLook: { rock: { colors: ['#30343e', '#3a3e4a', '#262a32'], band: 40, slope: [.45, .7] }, speckle: .1, mottle: .3 },
    sky: { top: '#0a0e18', horizon: '#3a4458', ground: '#1a1e28', sun: '#8090b0', haze: .6 }, fog: { color: '#2a3040', near: 500, far: 4200 },
    ambient: ['#7080a0', '#20242c', 1.35], sun: { color: '#a0b0d0', intensity: 1.1, dir: [-.3, .4, -.8], shadow: true }, lights: 5, snow: 700, wind: [1.2, .3], postcard: ['#1a2030', '#5a6478'] },
  nodes: {
    gs: { t: [1000, 1880, 116], kind: 'stop', label: 'VILLAGE STATION' },
    mid: { t: [1000, 1880 - 1760 * .55, S7.cableZ(1880 - 1760 * .55)], kind: 'stop', label: 'POWER CUT', air: true },
    gl: { t: [1000, 120, 1332], kind: 'exit', label: 'GLACIER STATION', to: ['01E', 'gl'], open: true }
  },
  edges: [
    { a: 'gs', b: 'mid', kind: 'lift', speed: 240, label: 'HIMMELSBAHN', via: [[1000, 1500, S7.cableZ(1500)], [1000, 1200, S7.cableZ(1200)]] },
    { a: 'mid', b: 'gl', kind: 'lift', speed: 240, gate: 'power', via: [[1000, 600, S7.cableZ(600)], [1000, 350, S7.cableZ(350)]] }
  ],
  gates: { power: { kind: 'flag', flag: 'powerBack', label: 'NO POWER', solver: 'ignaz', line: 'The cabin swings. The power is out. Something on the next pylon is frozen.' } },
  spots: [
    { id: 'pin6', kind: 'pin', pin: 6, node: 'mid' },
    { id: 'pim', kind: 'pim', at: [1000, 1880 - 1760 * .55], atZ: S7.cableZ(1880 - 1760 * .55) + 3.2, talk: 'pim_01D', label: 'Pim, on the roof', reach: 5 },
    { id: 'ins1', kind: 'far', target: true, far: true, at: [1000 - 3, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 1.5, r: 1.2, flag: 'ins1', label: 'AN INSULATOR' },
    { id: 'ins2', kind: 'far', target: true, far: true, at: [1000 + 3, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 1.5, r: 1.2, flag: 'ins2', label: 'AN INSULATOR' },
    { id: 'ins3', kind: 'far', target: true, far: true, at: [1000, 1880 - 1760 * .55 - 80], atZ: S7.cableZ(1880 - 1760 * .55 - 80) + 4, r: 1.2, flag: 'ins3', label: 'AN INSULATOR' }
  ],
  spawns: {}, waves: {},
  triggers: [
    { id: 'board', onEnter: true, beat: 'gondola_board' },
    { id: 'cut', node: 'mid', beat: 'power_cut' }
  ],
  props: [
    ['shape', 'S7:gondola-station', 1000, 1892, 116 - 6, { facing: Math.PI / 2 }], ['shape', 'S7:gondola-station', 1000, 104, 1332 - 6, { facing: -Math.PI / 2 }],
    ['thing', 'cablecar', 0, 0, 0],
    ['light', 1000, 1880, 116 + 4, { color: '#ffb060', reach: 300, power: 4 }], ['light', 1000, 120, 1336, { color: '#ffb060', reach: 300, power: 4 }],
    ['light', 1000, 1880, 120, { color: '#ffe8c0', reach: 160, power: 3, tag: 'cabin' }]
  ],
  people: [{ who: 'pim', at: [1000, 1880 - 1760 * .55], z: S7.cableZ(1880 - 1760 * .55) + 2.6, always: true, cabinRoof: true }],
  update(sim, dt) { S7.gondolaUpdate(sim, dt); },
  camera(sim, h) { return S7.gondolaCamera(sim, h); }
});
