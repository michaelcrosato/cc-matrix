/* TARGET 01 · 01E THE GLACIER ARCHIVE (§11.7): blue ice, dark, cyan glows; deposit boxes and people frozen in the walls.
 * The ice gallery (Pim, a frozen house phone), Echo crystals (Kasimir) in the corridor and on a side branch (Pin 7), the
 * ledger vault (Mireille's flash: the reveal), ice locks on the Room 7 door and the inner vault (the Ember Charm), the
 * first Bloom, and Brigid's seracs before the freight elevator. */
S7.area('01E', {
  title: 'THE GLACIER ARCHIVE', sub: 'ARTICLE NINE', target: 1, music: 'archive', ambience: 'archive', pinNo: 7, cold: true,
  world: { kind: 'level', w: 48, h: 36, wallH: 5.5,
    rooms: [[2, 7, 10, 10], [10, 4, 20, 14], [12, 1, 18, 4], [12, 14, 17, 20], [20, 7, 30, 10], [30, 4, 42, 14], [32, 14, 40, 22], [34, 22, 38, 32], [20, 28, 34, 32]],
    ground: 'plain', colors: { base: '#a8d8ec', dark: '#4a7a9a', light: '#d8f4ff' }, side: 'block', wallColor: '#6ab8dc', wallTop: '#c8f0ff', wallLine: '#2a6a8a',
    sky: '#000204', fog: { color: '#02060a', near: 140, far: 620 }, ambient: ['#3a7a9a', '#04121a', 1.15], lights: 6, postcard: ['#021018', '#2a6a8a'] },
  nodes: {
    gl: { t: [4, 8.5], kind: 'exit', label: 'THE GONDOLA', to: ['01D', 'gl'] },
    ig: { t: [15, 8.5], kind: 'junction', label: 'ICE GALLERY' },
    pc: { t: [15, 2.5], kind: 'stop', label: 'A SIDE VAULT' },
    r7e: { t: [14.5, 18.5], kind: 'door', label: 'ROOM 7 · IN THE ICE' },
    ec: { t: [25, 8.5], kind: 'stop', label: 'THE CORRIDOR' },
    lv: { t: [36, 8.5], kind: 'junction', label: 'LEDGER VAULT' },
    iv: { t: [36, 18.5], kind: 'junction', label: 'INNER VAULT' },
    sr: { t: [36, 27], kind: 'stop', label: 'SERACS' },
    fe: { t: [23, 30], kind: 'exit', label: 'FREIGHT ELEVATOR', to: ['01F', 'p3'], open: true }
  },
  edges: [
    { a: 'gl', b: 'ig' }, { a: 'ig', b: 'pc', gate: 'sidecrystals' }, { a: 'ig', b: 'r7e', gate: 'r7lock' }, { a: 'ig', b: 'ec' }, { a: 'ec', b: 'lv', gate: 'crystals' },
    { a: 'lv', b: 'iv', gate: 'vaultlock' }, { a: 'iv', b: 'sr' }, { a: 'sr', b: 'fe', gate: 'seracs', via: [[35, 30]] }
  ],
  gates: {
    sidecrystals: { kind: 'spot', label: 'HUMMING ICE', solver: 'kasimir', line: 'The ice hums. It wants a note.', block: [13, 3, 17, 4, 0, 5] },
    crystals: { kind: 'spot', label: 'HUMMING ICE', solver: 'kasimir', line: 'The ice hums. It wants a note.', block: [28, 7, 30, 10, 0, 5] },
    r7lock: { kind: 'icelock', label: 'FROZEN SHUT', solver: null },
    vaultlock: { kind: 'icelock', label: 'FROZEN SHUT', solver: null },
    seracs: { kind: 'spot', label: 'SERACS', solver: 'brigid', line: 'Too much ice. Not enough engineer.', block: [27, 28, 31, 32, 0, 5] }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'r7e', label: 'Room 7 · in the ice' },
    { id: 'phone', kind: 'phone', at: [11.2, 9.5], talk: 'concierge_vault', label: 'A house phone in the ice', reach: 3 },
    { id: 'pim', kind: 'pim', at: [17.5, 6], talk: 'pim_01E', label: 'Pim', reach: 3.4 },
    { id: 'd1', kind: 'tableau', at: [11, 5], who: 'tableau', label: 'Account 4417', line: 'Account 4417. Contents: a journalist, 1961.', reach: 3 },
    { id: 'd2', kind: 'tableau', at: [19, 5], who: 'tableau', label: 'Account 2210', line: 'Account 2210. Contents: a quarrel between two countries. Unopened.', reach: 3 },
    { id: 'd3', kind: 'tableau', at: [11, 12.8], who: 'tableau', label: 'Account 0889', line: 'Account 0889. Contents: the truth about a war. Interest accrues.', reach: 3 },
    { id: 'sidec', kind: 'crystal', target: true, at: [15, 3.6], atZ: 1.4, r: 1.6, opens: 'sidecrystals', label: 'HUMMING CRYSTALS' },
    { id: 'pin7', kind: 'pin', pin: 7, node: 'pc' },
    { id: 'cry', kind: 'crystal', target: true, at: [29, 8.5], atZ: 1.4, r: 1.6, opens: 'crystals', flag: 'crystalsDone', label: 'HUMMING CRYSTALS' },
    { id: 'ledger', kind: 'exposure', target: true, at: [40.5, 8.5], atZ: 1.5, r: 1.4, exposure: 'exposure2', flag: 'ledgerRead', dossier: 'exposure2', beat: 'ledger_reveal', label: 'THE FROZEN LEDGER' },
    { id: 'vaultrime', kind: 'rime', n: 15, node: 'iv' },
    { id: 'orders', kind: 'dossier', dossier: 'standingorders', edge: 'iv-sr', s: .2 },
    { id: 'serac', kind: 'serac', target: true, at: [29, 30], atZ: 1.5, r: 2.4, opens: 'seracs', flag: 'seracsDown', beat: 'seracs_down', label: 'SERACS' },
    { id: 'red1', kind: 'red', n: 10, edge: 'gl-ig', s: .5 }, { id: 'red2', kind: 'red', n: 12, edge: 'ig-ec', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'lv-iv', s: .6 },
    { id: 'rime1', kind: 'rime', n: 4, edge: 'ig-ec', s: .8 }, { id: 'rime2', kind: 'rime', n: 4, node: 'sr' }, { id: 'rime3', kind: 'rime', n: 4, edge: 'ec-lv', s: .7 }
  ],
  spawns: { g1: [18.5, 12.5], g2: [11.5, 12.5], g3: [18.5, 5], gt: [13, 6], v1: [36, 21], v2: [33, 16], v3: [39, 16], l1: [40, 12], l2: [32, 5] },
  waves: {
    gallery: { spawn: [['giggler', 'g1', 0], ['giggler', 'g2', .8], ['twins', 'gt', 1.5], ['giggler', 'g3', 2.5]] },
    ledger: { spawn: [['giggler', 'l1', 0], ['bellboy', 'l2', 1]] },
    vault: { spawn: [['bloom', 'v1', 0], ['giggler', 'v2', 1], ['giggler', 'v3', 1.5]] }
  },
  triggers: [
    { id: 'gallery', node: 'ig', wave: 'gallery' },
    { id: 'ledger', node: 'lv', wave: 'ledger' },
    { id: 'vault', node: 'iv', wave: 'vault' },
    { id: 'done', node: 'sr', set: 'archiveSeen' }
  ],
  props: [
    ['thing', 'icewall', 15, 4.6, 0, { n: 5 }], ['thing', 'icewall', 15, 13.4, 0, { n: 5 }], ['thing', 'icewall', 36, 4.6, 0, { n: 6 }],
    ['shape', 'S7:deposit-box', 11, 4.6, .5, { facing: Math.PI / 2 }], ['shape', 'S7:deposit-box', 19, 4.6, .5, { facing: Math.PI / 2 }], ['shape', 'S7:deposit-box', 11, 13.4, .5, { facing: -Math.PI / 2 }],
    ['shape', 'S7:frozen-case', 13, 13.3, 0, {}], ['shape', 'S7:frozen-case', 17, 4.7, 0, {}], ['shape', 'S7:frozen-case', 33, 4.7, 0, {}], ['shape', 'S7:frozen-case', 39, 4.7, 0, {}],
    ['shape', 'S7:crystal-cluster', 15, 3.6, 0, {}], ['shape', 'S7:crystal-cluster', 29, 8, 0, { facing: .4 }], ['shape', 'S7:crystal-cluster', 29, 9.3, 0, { facing: -.6 }],
    ['shape', 'S7:lectern', 40.5, 8.5, 0, { facing: Math.PI }],
    ['shape', 'S7:serac', 28.5, 29, 0, {}], ['shape', 'S7:serac', 30, 31, 0, { facing: 1 }],
    ['shape', 'S7:glacier-gate', 4, 7.2, 0, {}], ['shape', 'S7:room7-door', 14.5, 19.9, 0, { facing: -Math.PI / 2 }],
    ['thing', 'icelock', 14.5, 14.2, 0, { gate: 'r7lock' }], ['thing', 'icelock', 36, 14.2, 0, { gate: 'vaultlock' }],
    ['light', 15, 8.5, 3.5, { color: '#60d0ff', reach: 180, power: 3 }], ['light', 25, 8.5, 3, { color: '#80e0ff', reach: 140, power: 2.4 }],
    ['light', 36, 8.5, 3.6, { color: '#a0e8ff', reach: 200, power: 3.2 }], ['light', 36, 18.5, 3, { color: '#40c0ff', reach: 150, power: 2.6 }],
    ['light', 30, 30, 3, { color: '#60d0ff', reach: 160, power: 2.6 }], ['light', 23, 30, 3, { color: '#ffd8a0', reach: 120, power: 2 }]
  ],
  people: [{ who: 'pim', at: [17.5, 6], z: .8 }]
});

/* TARGET 01 · 01F THE SUMMIT (§11.7, §11.8): the summit plaza and its glass signing pavilion (an arc rail of five covers),
 * the glacier face below (the slalom: a ski rail beside Hansi's own line through six gates) and the old chairlift
 * station where the interview happens. */
S7.summitHeight = (x, y) => {
  const m = x / M, n = y / M;
  let z = 1600 - smooth(355, 420, n) * (n - 355) * .42;
  z = Math.max(z, 1240);
  const vx = (m - 1000) / 160; z += vx * vx * 90;
  z += smooth(330, 360, n) * (E.noise2(m / 40, n / 40) - .5) * 8;
  return z * M;
};
const SUMMIT_C = [1000, 290];
const arcNode = (deg) => [SUMMIT_C[0] + Math.cos(deg * Math.PI / 180) * 30, SUMMIT_C[1] + Math.sin(deg * Math.PI / 180) * 30];
const SL_X = 990, HANSI_X = 1010;
S7.area('01F', {
  title: 'THE SUMMIT', sub: 'MIDNIGHT', target: 1, music: 'powderking', ambience: 'fohn', outdoor: true, skis: true, sweepNode: 'p3',
  avalaugh: [1000, 290],
  world: { kind: 'terrain', height: S7.summitHeight, color: S7.snowColor([228, 226, 246]), size: 32768, far: 13000,
    terrainLook: { rock: { colors: ['#3a3048', '#4a4058', '#2a2438'], band: 30, slope: [.5, .75] }, speckle: .12, mottle: .25 },
    sky: { top: '#05030e', horizon: '#3a2a5a', ground: '#140e24', sun: '#ffb860', haze: .3 }, fog: { color: '#1a1430', near: 1400, far: 9000 },
    ambient: ['#8a7ab0', '#2a2038', 1.3], sun: { color: '#ffc880', intensity: 1.2, dir: [-.5, .3, -.6], shadow: true }, lights: 6, snow: 260, wind: [.6, -.2], postcard: ['#0a0618', '#5a3a6a'] },
  nodes: {
    p1: { t: arcNode(30), kind: 'stop', label: 'FLAGPOLE' }, p2: { t: arcNode(60), kind: 'stop', label: 'WEATHER MAST' }, p3: { t: arcNode(90), kind: 'stop', label: 'THE PLAZA' },
    p4: { t: arcNode(120), kind: 'stop', label: 'PAVILION PILLAR' }, p5: { t: arcNode(150), kind: 'stop', label: 'FLAGPOLE' },
    sl0: { t: [SL_X, 360], kind: 'stop', label: 'THE GLACIER FACE' },
    sl1: { t: [SL_X - 6, 470], kind: 'pass' }, sl2: { t: [SL_X + 4, 590], kind: 'pass' }, sl3: { t: [SL_X - 5, 720], kind: 'pass' }, sl4: { t: [SL_X + 3, 850], kind: 'pass' },
    sl9: { t: [SL_X, 1010], kind: 'stop', label: 'THE OLD CHAIRLIFT' },
    chair: { t: [1000, 1050, 1290], kind: 'stop', label: 'A STUCK CHAIR', air: true }, chair2: { t: [1000, 1062, 1291], kind: 'stop', air: true }
  },
  edges: [
    { a: 'p1', b: 'p2', via: [arcNode(45)] }, { a: 'p2', b: 'p3', via: [arcNode(75)] }, { a: 'p3', b: 'p4', via: [arcNode(105)] }, { a: 'p4', b: 'p5', via: [arcNode(135)] },
    { a: 'sl0', b: 'sl1', kind: 'ski', aimOnTheMove: true }, { a: 'sl1', b: 'sl2', kind: 'ski', aimOnTheMove: true }, { a: 'sl2', b: 'sl3', kind: 'ski', aimOnTheMove: true },
    { a: 'sl3', b: 'sl4', kind: 'ski', aimOnTheMove: true }, { a: 'sl4', b: 'sl9', kind: 'ski', aimOnTheMove: true },
    { a: 'chair', b: 'chair2', lerpZ: true }
  ],
  hansiPath: [[HANSI_X, 360], [HANSI_X + 12, 430], [HANSI_X - 4, 520], [HANSI_X + 14, 610], [HANSI_X - 2, 700], [HANSI_X + 12, 790], [HANSI_X - 4, 880], [HANSI_X + 8, 960], [HANSI_X, 1010]],
  slalomGates: [.12, .27, .42, .57, .72, .87],
  spots: [],
  spawns: {}, waves: {},
  triggers: [{ id: 'boss', onEnter: true, beat: 'summit_arrive', notFlag: 't01Done' }],
  props: [
    ['shape', 'S7:pavilion', 1000, 262, 0, {}], ['shape', 'S7:flagpole', arcNode(30)[0] + 2, arcNode(30)[1] + 2, 0, { params: { c: 'coastal' } }], ['shape', 'S7:flagpole', arcNode(150)[0] - 2, arcNode(150)[1] + 2, 0, { params: { c: 'steppe' } }],
    ['shape', 'S7:floodlight', arcNode(60)[0] + 2, arcNode(60)[1] + 2, 0, {}], ['shape', 'S7:chair-station', 1000, 1030, 0, {}],
    ['thing', 'slalomgates', 0, 0, 0], ['thing', 'avalaugh', 1000, 290, 0], ['thing', 'chairlift', 1000, 1050, 0],
    ['light', 1000, 262, 6, { color: '#ffb050', reach: 600, power: 5, tag: 'fohn' }], ['light', arcNode(60)[0], arcNode(60)[1], 7, { color: '#fff0d0', reach: 700, power: 4 }],
    ['light', 1000, 1030, 4, { color: '#ffd8a0', reach: 300, power: 3 }]
  ],
  people: [],
  camera(sim, h) { return S7.summitCamera(sim, h); }
});
