/* TARGET 01 · 01C THE BLACK RUN (§11.7): a terrain. The T-bar up (Snowballers on the slope, aim from the lift), the top
 * station (Room 7, Murmel), the patrol rope (Ansel), the ridge's cornice (Brigid) that becomes a snow bridge, the
 * avalanche shelter (Edelweiss 3, Pin 5), Dagny's jump onto the avalanche slope (LAWINE!), and the downhill: BLUE,
 * BLACK or THE JUMP, down to the village. Units in the data: metres (tiles); the height function works in units. */
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
S7.blackRunHeight = (x, y) => {
  const m = x / M, n = y / M;
  let z = 520 - smooth(170, 260, n) * (n - 170) * .42 - smooth(260, 1300, n) * 0;   // the plateau, then the run
  z = Math.max(z, 30 + (1300 - Math.min(n, 1300)) * .02);
  const vx = (m - 470) / 300; z += vx * vx * 80;                                       // the valley's walls
  z -= smooth(18, 0, Math.abs(m - 340)) * smooth(195, 150, n) * smooth(120, 150, n) * 26;   // the crevasse under the ridge
  z -= smooth(26, 0, Math.hypot(m - 545, n - 560)) * 18;                              // the gully under the jump
  z += (E.noise2(m / 70, n / 70) - .5) * 12 + (E.noise2(m / 19, n / 19) - .5) * 2.2;   // moguls and swells
  return z * M;
};
S7.snowColor = (tint) => (x, y, z, nz, out) => {
  const n = E.noise2(x / 400, y / 400), k = E.noise2(x / 60, y / 60), lit = .82 + nz * .18;
  const base = tint || [232, 238, 248];
  out = out || [0, 0, 0];
  out[0] = Math.min(255, base[0] * lit - 14 * n - 6 * k); out[1] = Math.min(255, base[1] * lit - 10 * n - 4 * k); out[2] = Math.min(255, base[2] * lit - 4 * n);
  return out;
};
S7.area('01C', {
  title: 'THE BLACK RUN', sub: 'PIZ NADA', target: 1, music: 'blackrun', ambience: 'wind', outdoor: true, skis: true, sweepNode: 'ts', pinNo: 5,
  world: { kind: 'terrain', height: S7.blackRunHeight, color: S7.snowColor(), size: 32768, far: 16000,
    terrainLook: { rock: { colors: ['#3a3a44', '#4a4a56', '#2a2a32', '#5a5a66'], band: 30, slope: [.55, .8] }, speckle: .1, mottle: .2 },
    sky: { top: '#02030a', horizon: '#1a2240', ground: '#0a0c18', sun: '#c8d8ff', haze: .25 }, fog: { color: '#0a1020', near: 1600, far: 9000 },
    ambient: ['#8090c0', '#202838', 1.3], sun: { color: '#c8d8ff', intensity: 1.4, dir: [.3, .5, -.8], shadow: true }, lights: 6, snow: 500, wind: [.2, .6], postcard: ['#04060e', '#2a3458'] },
  nodes: {
    tbot: { t: [560, 1080], kind: 'stop', label: 'T-BAR' },
    ttop: { t: [560, 232], kind: 'stop', label: 'T-BAR TOP' },
    ts: { t: [500, 168], kind: 'junction', label: 'TOP STATION' },
    st: { t: [500, 200], kind: 'stop', label: 'START GATE' },
    pr: { t: [442, 168], kind: 'stop', label: 'PATROL ROPE' },
    cr: { t: [382, 168], kind: 'stop', label: 'THE RIDGE' },
    as: { t: [300, 168], kind: 'stop', label: 'AVALANCHE SHELTER' },
    jp: { t: [300, 204], kind: 'stop', label: 'THE DROP' },
    kick: { t: [318, 248], kind: 'pass' },
    av0: { t: [352, 318], kind: 'pass', onLand: 'lawine' },
    av1: { t: [395, 450], kind: 'pass' },
    av2a: { t: [358, 580], kind: 'pass' }, av2b: { t: [445, 580], kind: 'pass' },
    f1: { t: [500, 400], kind: 'pass' },
    bl1: { t: [395, 640], kind: 'pass' }, bk1: { t: [503, 660], kind: 'pass' }, jk: { t: [552, 478], kind: 'pass' },
    f2: { t: [500, 900], kind: 'pass' },
    vb: { t: [500, 1095], kind: 'exit', label: 'THE VILLAGE', to: ['01A', 'ls'], open: true }
  },
  edges: [
    { a: 'tbot', b: 'ttop', kind: 'lift', ground: true, speed: 300, aimOnTheMove: true, label: 'T-BAR', via: [[562, 800], [560, 500]] },
    { a: 'ttop', b: 'ts', via: [[540, 190]] }, { a: 'ts', b: 'st' },
    { a: 'ts', b: 'pr', gate: 'rope' }, { a: 'pr', b: 'cr' }, { a: 'cr', b: 'as', lerpZ: true, label: 'SNOW BRIDGE' }, { a: 'as', b: 'jp' },
    { a: 'jp', b: 'kick', kind: 'ski' }, { a: 'kick', b: 'av0', kind: 'jump', apex: 7, slowmo: true, label: 'THE JUMP' },
    { a: 'av0', b: 'av1', kind: 'ski', via: [[372, 380]] }, { a: 'av1', b: 'av2a', kind: 'ski', label: 'LEFT' }, { a: 'av1', b: 'av2b', kind: 'ski', label: 'RIGHT' },
    { a: 'av2a', b: 'f2', kind: 'ski', via: [[410, 760]] }, { a: 'av2b', b: 'f2', kind: 'ski', via: [[480, 740]] },
    { a: 'st', b: 'f1', kind: 'ski', via: [[492, 300]] },
    { a: 'f1', b: 'bl1', kind: 'ski', label: 'BLUE', via: [[440, 520]] }, { a: 'bl1', b: 'f2', kind: 'ski', via: [[420, 780]] },
    { a: 'f1', b: 'bk1', kind: 'ski', label: 'BLACK', via: [[505, 540]] }, { a: 'bk1', b: 'f2', kind: 'ski', via: [[510, 780]] },
    { a: 'f1', b: 'jk', kind: 'ski', label: 'THE JUMP', via: [[535, 440]] }, { a: 'jk', b: 'bk1', kind: 'jump', apex: 4, slowmo: true },
    { a: 'f2', b: 'vb', kind: 'ski', via: [[498, 1000]] }
  ],
  gates: {
    rope: { kind: 'patrol', label: 'CLOSED — PATROL ONLY', solver: 'ansel' },
    cornice: { kind: 'spot', label: 'A CREVASSE', solver: 'brigid', hides: 'cr-as', line: 'Too much snow. Not enough engineer.' }
  },
  spots: [
    { id: 'door7', kind: 'door7', node: 'ts', label: 'Room 7 · the top station' },
    { id: 'murmel', kind: 'murmel', at: [506, 164], label: 'Murmel', reach: 3.4 },
    { id: 'cornice', kind: 'cornice', target: true, at: [366, 158], up: 4, r: 2.2, opens: 'cornice', flag: 'corniceDown', beat: 'cornice_down', label: 'THE CORNICE' },
    { id: 'ew3', kind: 'item', item: 'edelweiss', node: 'as', needs: { flag: 'shelterOpen' } },
    { id: 'pin5', kind: 'pin', pin: 5, node: 'as' },
    { id: 'clip', kind: 'dossier', dossier: 'avalanche1926', node: 'as' },
    { id: 'red1', kind: 'red', n: 12, edge: 'ts-st', s: .5 }, { id: 'red2', kind: 'red', n: 10, edge: 'pr-cr', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'st-f1', s: .6 }, { id: 'red4', kind: 'red', n: 14, edge: 'bl1-f2', s: .5 },
    { id: 'rime1', kind: 'rime', n: 5, edge: 'as-jp', s: .5 }, { id: 'rime2', kind: 'rime', n: 4, edge: 'jk-bk1', s: .9 },
    { id: 'netsign', kind: 'sign', node: 'pr', line: 'CLOSED — AVALANCHE DANGER — PATROL ONLY. The rope is orange and very sure of itself.' }
  ],
  spawns: { tb1: [530, 820], tb2: [600, 640], tb3: [530, 430], sh1: [290, 185], sh2: [312, 190], b1: [372, 590], b2: [415, 600], b3: [395, 560], b4: [400, 700], b5: [425, 690], bk: [503, 590], k1: [505, 760], k2: [520, 790], k3: [490, 800] },
  waves: {
    tbar: { spawn: [['snowballer', 'tb1', 0], ['snowballer', 'tb2', 0], ['snowballer', 'tb3', 0]], until: 'clear' },
    shelter: { spawn: [['giggler', 'sh1', 0], ['giggler', 'sh2', .8]] },
    blue1: { spawn: [['skier', 'b1', 0], ['skier', 'b2', .5], ['skier', 'b3', 1]] },
    blue2: { spawn: [['tobogganer', 'b4', 0], ['tobogganer', 'b5', .8]] },
    black1: { spawn: [['plow', 'bk', 0]] },
    black2: { spawn: [['tobogganer', 'k1', 0], ['tobogganer', 'k2', .5], ['tobogganer', 'k3', 1]] }
  },
  triggers: [
    { id: 'tbar', edge: 'tbot-ttop', s: .06, wave: 'tbar', tut: 'lift' },
    { id: 'shelter', node: 'as', set: 'shelterOpen' },
    { id: 'shelterdone', node: 'as', set: 'shelterDone' },
    { id: 'leave', edge: 'as-jp', s: .2, wave: 'shelter' },
    { id: 'ropecross', node: 'pr', set: 'ropeCrossed' },
    { id: 'blue1', edge: 'f1-bl1', s: .5, wave: 'blue1' }, { id: 'blue2', edge: 'bl1-f2', s: .2, wave: 'blue2' },
    { id: 'black1', edge: 'f1-bk1', s: .15, wave: 'black1' }, { id: 'black2', edge: 'bk1-f2', s: .25, wave: 'black2' },
    { id: 'skitip', edge: 'st-f1', s: .05, tut: 'ski' },
    { id: 'jumptip', node: 'jp', tut: 'jump' }
  ],
  props: [
    ['shape', 'S7:lift-hut', 506, 156, 0, {}], ['shape', 'S7:room7-door', 500, 158.6, 0, { facing: Math.PI / 2 }], ['shape', 'S7:shelter-hut', 296, 156, 0, {}],
    ['shape', 'S7:cornice', 366, 156, 0, {}], ['shape', 'S7:net', 442, 168, 0, { facing: Math.PI / 2 }], ['shape', 'S7:lift-hut', 560, 1094, 0, {}], ['shape', 'S7:lift-hut', 560, 222, 0, {}],
    ['shape', 'S7:floodlight', 488, 300, 0, {}], ['shape', 'S7:floodlight', 520, 520, 0, {}], ['shape', 'S7:floodlight', 420, 620, 0, {}], ['shape', 'S7:floodlight', 520, 820, 0, {}], ['shape', 'S7:floodlight', 486, 1000, 0, {}],
    ['shape', 'S7:snow-cannon', 470, 450, 0, { facing: 1 }], ['shape', 'S7:snow-cannon', 530, 700, 0, { facing: 2 }],
    ['thing', 'pistepoles', 0, 0, 0], ['thing', 'avalanche', 0, 0, 0],
    ['light', 488, 300, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 520, 520, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 420, 620, 7, { color: '#fff4d0', reach: 900, power: 6 }],
    ['light', 520, 820, 7, { color: '#fff4d0', reach: 900, power: 6 }], ['light', 500, 168, 3, { color: '#ffd8a0', reach: 200, power: 3 }], ['light', 300, 168, 3, { color: '#ff9060', reach: 160, power: 2.4 }]
  ],
  people: [{ who: 'murmel', at: [506, 164], z: .4 }],
  update(sim, dt) { S7.lawineUpdate(sim, dt); },
  camera(sim, h) { return S7.lawineCamera(sim, h); }
});
