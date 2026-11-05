// Areas as data: level rows, rail graph (nodes + edges), spots, waves, triggers. Coordinates: x east, y south, in metres.
const mkgrid = (w, h) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? '#' : '.'));
const put = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; return g; };
const rows = g => g.map(r => r.join(''));
const A = (id, o) => S7.def('areas', id, Object.assign({ edges: [], spots: [], spawns: {}, waves: {}, triggers: [], props: [], blocks: [], nodes: {} }, o));

// ---------------------------------------------------------------- ROOM 7
{
  const g = mkgrid(18, 12);
  A('room7', {
    title: 'ROOM 7', sub: 'THE FEATHERBED', target: null, safe: true, music: 'room7', ambience: 'roomtone', mood: 'room',
    w: 18, h: 12, rows: rows(g), ground: 'planks', colors: { base: '#5a3a28', dark: '#3a2418', light: '#7a5238' }, wallColor: '#6a4a3a',
    sky: '#0a0608', fog: { color: '#120a0c', near: 40, far: 420 }, ambient: ['#6a5a6a', '#2a1a1c', 1.5],
    cam: { at: [9, 11.7, 5.8], look: [9, 5, 0.5], fov: 64 },
    nodes: { c: { t: [9, 6.2] }, clock: { t: [3.4, 3.4] }, bench: { t: [8.5, 3.0] }, ward: { t: [14.6, 3.4] }, bed: { t: [3.4, 8.3] }, ros: { t: [12.4, 9.1] }, door: { t: [15, 8.6], kind: 'exit', to: ['room7', 'door'] } },
    edges: [
      { id: 'c-clock', a: 'c', b: 'clock', kind: 'walk' }, { id: 'c-bench', a: 'c', b: 'bench', kind: 'walk' }, { id: 'c-ward', a: 'c', b: 'ward', kind: 'walk' },
      { id: 'c-bed', a: 'c', b: 'bed', kind: 'walk' }, { id: 'c-ros', a: 'c', b: 'ros', kind: 'walk' }, { id: 'c-door', a: 'c', b: 'door', kind: 'walk' }],
    spots: [
      { id: 'clock', node: 'clock', kind: 'save', label: 'CUCKOO CLOCK' }, { id: 'bench', node: 'bench', kind: 'bench', label: 'WAX BENCH' },
      { id: 'ward', node: 'ward', kind: 'wardrobe', label: 'WARDROBE' }, { id: 'bed', node: 'bed', kind: 'npc', who: 'oma', talk: 'oma', label: 'OMA HOLLE' },
      { id: 'ros', node: 'ros', kind: 'npc', who: 'rosalind', talk: 'rosalind', label: 'SISTER ROSALIND' }, { id: 'door', node: 'door', kind: 'leave', label: 'THE CORRIDOR' }],
    props: [['thing', 'bedbig', 3.4, 8.3, 0], ['thing', 'cuckoo', 3.4, 2.2, 1.2], ['thing', 'bench', 8.5, 2.2, 0], ['thing', 'wardrobe', 14.6, 2.0, 0], ['thing', 'rug', 9, 6.5, 0],
      ['thing', 'window', 9, 0.4, 1.4], ['light', 9, 6, 3, { color: '#ffd0a0', reach: 22, power: 1.4 }], ['light', 3.4, 3, 2, { color: '#ffb070', reach: 9, power: .9 }]]
  });
}

// ---------------------------------------------------------------- 00A HOTEL NADA LOBBY
{
  const g = mkgrid(40, 28);
  for (const [x, y] of [[13, 9], [27, 9], [13, 17], [27, 17], [20, 21], [6, 14]]) put(g, x, y, x, y, 'P');
  A('00A', {
    title: 'GRAND HOTEL NADA', sub: 'THE LOBBY', target: 0, music: 'hotel', ambience: 'hotel', mood: 'hotel',
    w: 40, h: 28, rows: rows(g), ground: 'tiles', colors: { base: '#e6e2da', dark: '#2a2226', light: '#f4efe6', size: 8 }, wallColor: '#4a2a32',
    sky: '#05040a', fog: { color: '#0a0608', near: 60, far: 520 }, ambient: ['#7a6a74', '#241a22', 1.7],
    nodes: {
      start: { t: [35.5, 24.5], kind: 'entry' }, j1: { t: [28.5, 21.5], kind: 'junction' }, j2: { t: [20.5, 14.5], kind: 'junction' }, j3: { t: [9.5, 21.5], kind: 'junction' },
      j4: { t: [20.5, 6.5] }, j5: { t: [7.5, 11.5] }, east: { t: [35.5, 13.5] }, bar: { t: [4.5, 25] }, cloak: { t: [4.5, 5] }, elev: { t: [20.5, 2.6], kind: 'exit', to: ['00C', 'n0'], needs: 'servicekey' }
    },
    edges: [
      { id: 'e1', a: 'start', b: 'j1', kind: 'walk' }, { id: 'e2', a: 'j1', b: 'j2', kind: 'walk', via: [[24, 18.5]] }, { id: 'e3', a: 'j2', b: 'j3', kind: 'walk', via: [[15, 18.5]] },
      { id: 'e4', a: 'j1', b: 'j3', kind: 'walk', via: [[20, 24.5]] }, { id: 'e5', a: 'j2', b: 'j4', kind: 'walk' }, { id: 'e6', a: 'j2', b: 'east', kind: 'walk', via: [[28, 13.5]] },
      { id: 'e7', a: 'j3', b: 'bar', kind: 'walk', gate: 'rope' }, { id: 'e8', a: 'j3', b: 'j5', kind: 'walk', via: [[8, 16.5]] },
      { id: 'e9', a: 'j5', b: 'cloak', kind: 'walk', gate: 'glass' }, { id: 'e10', a: 'j4', b: 'elev', kind: 'walk', gate: 'lock' }],
    gates: { rope: { kind: 'buyout', price: 25, who: 'gustav', label: 'MEMBERS ONLY', text: 'A velvet rope. Members only. Membership costs 25 Red.' },
      glass: { kind: 'echowall', who: 'jodl', label: 'GLASS WALL', text: 'A wall of hotel glass hums at one note. Someone with the right voice could shatter it.' },
      lock: { kind: 'key', item: 'servicekey', label: 'STAFF LIFT', text: 'The staff lift. It wants a brass Service Key.' } },
    spots: [
      { id: 'murmel', node: 'east', kind: 'npc', who: 'murmel', talk: 'murmel_00A', label: 'MURMEL' },
      { id: 'phone', node: 'j4', kind: 'phone', talk: 'concierge_00A', label: 'HOUSE PHONE' },
      { id: 'pin1', node: 'bar', kind: 'pickup', item: 'pin1', label: 'LIFT PIN' }, { id: 'rime1', node: 'bar', kind: 'pickup', item: 'rime', n: 4, label: 'RIME' },
      { id: 'key', node: 'cloak', kind: 'pickup', item: 'servicekey', label: 'SERVICE KEY' }, { id: 'pin2', node: 'east', kind: 'pickup', item: 'pin2', label: 'LIFT PIN' },
      { id: 'v1', edge: 'e2', s: .5, kind: 'pickup', item: 'red', n: 14, label: 'RED' }, { id: 'v2', edge: 'e4', s: .5, kind: 'pickup', item: 'red', n: 12, label: 'RED' },
      { id: 'v3', edge: 'e6', s: .6, kind: 'pickup', item: 'red', n: 14, label: 'RED' }, { id: 'v4', edge: 'e8', s: .5, kind: 'pickup', item: 'red', n: 14, label: 'RED' }],
    spawns: { a: [18, 11], b: [23, 11], c: [14, 14], d: [26, 15], e: [12, 25], f: [14, 20], g: [8, 8], h: [10, 14], i: [18, 4], k: [23, 4], l: [22, 9], m: [18, 9] },
    waves: {
      w1: { spawn: [['giggler', 'a', 0], ['giggler', 'b', 1.8]] },
      w2: { spawn: [['giggler', 'e', 0], ['bellhop', 'f', 1.5]] },
      w3: { spawn: [['giggler', 'g', 0], ['giggler', 'h', 1.2], ['thrower', 'g', 2.5]] },
      w4: { spawn: [['bellhop', 'i', 0], ['bellhop', 'k', 2], ['giggler', 'l', 3]] },
      w5: { spawn: [['giggler', 'c', 0], ['skier', 'd', 1], ['giggler', 'm', 2]] }
    },
    triggers: [
      { id: 'card', node: 'start', once: true, beat: 't00_card' },
      { id: 'tut_scan', edge: 'e1', s: .95, once: true, beat: 't00_first', wave: 'w5' },
      { id: 'tw1', node: 'j2', once: true, wave: 'w1', beat: 't00_junction' }, { id: 'tw2', node: 'j3', once: true, wave: 'w2' },
      { id: 'tw3', node: 'j5', once: true, wave: 'w3' }, { id: 'tw4', node: 'j4', once: true, wave: 'w4', beat: 't00_phone' }],
    props: [['thing', 'chandelier', 20, 14, 5.4], ['thing', 'desk', 31.5, 18.5, 0], ['thing', 'bar', 4.5, 23, 0], ['thing', 'liftdoor', 20.5, 1.3, 0], ['thing', 'runner', 20, 14, 0],
      ['thing', 'glasswall', 4.5, 8, 0], ['thing', 'rope', 5.5, 24, 0], ['thing', 'marmot', 36.5, 15, 0], ['thing', 'plant', 33, 4, 0], ['thing', 'plant', 37, 22, 0],
      ['shape', 'table', 33, 8, 0], ['shape', 'chair', 31.8, 8, 0], ['shape', 'chair', 34.2, 8, 3.14], ['shape', 'bookcase', 37.2, 9.5, 0],
      ['light', 20, 14, 4.8, { color: '#ffe0b0', reach: 30, power: 1.6, flicker: .03 }], ['light', 10, 22, 3.5, { color: '#ff9a70', reach: 14, power: 1 }], ['light', 6, 6, 3.5, { color: '#a0d0ff', reach: 12, power: .9 }], ['light', 32, 18, 3.5, { color: '#ffd8a0', reach: 14, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 00C BOSS: BELLCAPTAIN GRAU
{
  const g = mkgrid(26, 26);
  A('00C', {
    title: 'ELEVATOR SHAFT', sub: 'THE BELLCAPTAIN', target: 0, boss: 'grau', music: 'boss1', ambience: 'shaft', mood: 'shaft',
    w: 26, h: 26, rows: rows(g), ground: 'tiles', colors: { base: '#8a7a50', dark: '#241c14', light: '#b8a070', size: 8 }, wallColor: '#3a2c20',
    sky: '#04030a', fog: { color: '#0a0604', near: 50, far: 420 }, ambient: ['#6a5a50', '#201814', 1.5],
    cam: { at: [13, 25.0, 6.5], look: [13, 11, 1.2], fov: 70 },
    nodes: (() => { const n = {}; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4; n['n' + i] = { t: [13 + Math.cos(a) * 7.5, 14 + Math.sin(a) * 7.5] }; } n.out = { t: [13, 24.2], kind: 'exit', to: ['01A', 'start'] }; return n; })(),
    edges: (() => { const e = []; for (let i = 0; i < 8; i++) e.push({ id: 'r' + i, a: 'n' + i, b: 'n' + ((i + 1) % 8), kind: 'walk', arc: true }); e.push({ id: 'ro', a: 'n0', b: 'out', kind: 'walk', locked: 'boss' }); return e; })(),
    spots: [], spawns: { a: [8, 8], b: [18, 8], c: [6, 14], d: [20, 14] },
    waves: { hop: { spawn: [['bellhop', 'a', 0], ['giggler', 'b', 1]] }, hop2: { spawn: [['giggler', 'c', 0], ['giggler', 'd', .8], ['thrower', 'a', 2]] } },
    triggers: [{ id: 'bossstart', node: 'n0', once: true, beat: 't00_boss', boss: 'grau' }],
    props: [['thing', 'bellframe', 13, 4.2, 0], ['light', 13, 8, 5, { color: '#ffc080', reach: 26, power: 1.6, flicker: .08 }], ['light', 13, 20, 4, { color: '#ff8060', reach: 16, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 01A OBERGLÜCK VILLAGE
{
  const g = mkgrid(56, 40);
  A('01A', {
    title: 'OBERGLÜCK', sub: 'THE VILLAGE', target: 1, music: 'village', ambience: 'wind', mood: 'dusk', snow: true,
    w: 56, h: 40, rows: rows(g), ground: 'snow', colors: { base: '#eaf0f8', dark: '#9fb0cc', light: '#ffffff' }, wallColor: '#6a5a50',
    sky: ['#4a3a6a', '#e89a8a'], fog: { color: '#c8a6b8', near: 60, far: 600 }, ambient: ['#c8b8e0', '#5a5a7a', 1.7],
    nodes: {
      start: { t: [6.5, 34.5], kind: 'entry' }, v1: { t: [16.5, 30.5] }, v2: { t: [28.5, 28.5] }, v3: { t: [14.5, 20.5] }, v4: { t: [28.5, 18.5] }, v5: { t: [42.5, 22.5] },
      v6: { t: [30.5, 8.5] }, shop: { t: [49.5, 22.5] }, garden: { t: [6.5, 12.5] }, station: { t: [41.5, 5.5], kind: 'exit', to: ['01C', 'base'], needs: 'tbar' }
    },
    edges: [
      { id: 'a1', a: 'start', b: 'v1', kind: 'walk', via: [[11, 33.5]] }, { id: 'a2', a: 'v1', b: 'v2', kind: 'walk', via: [[22, 31]] }, { id: 'a3', a: 'v1', b: 'v3', kind: 'walk', via: [[15, 25.5]] },
      { id: 'a4', a: 'v2', b: 'v4', kind: 'walk' }, { id: 'a5', a: 'v3', b: 'v4', kind: 'walk', via: [[21, 19]] }, { id: 'a6', a: 'v4', b: 'v5', kind: 'walk', via: [[35, 21]] },
      { id: 'a7', a: 'v4', b: 'v6', kind: 'walk', via: [[28.5, 13]] }, { id: 'a8', a: 'v5', b: 'shop', kind: 'walk', gate: 'shopdoor' }, { id: 'a9', a: 'v3', b: 'garden', kind: 'walk', gate: 'garden' },
      { id: 'a10', a: 'v6', b: 'station', kind: 'walk', gate: 'serac' }],
    gates: {
      shopdoor: { kind: 'echowall', who: 'jodl', label: 'FROZEN SHOP', text: 'The shop window has frozen into one fragile note. Sing it down.' },
      garden: { kind: 'buyout', price: 30, who: 'gustav', label: 'PRIVATE GARDEN', text: 'A gardener demands 30 Red to "not look".' },
      serac: { kind: 'charge', who: 'mara', label: 'ICE SERAC', text: 'A serac blocks the lift station. A shaped charge would persuade it.' } },
    spots: [
      { id: 'murmel', node: 'v2', kind: 'npc', who: 'murmel', talk: 'murmel_01A', label: 'MURMEL' }, { id: 'pim', node: 'v3', kind: 'npc', who: 'pim', talk: 'pim_01A', label: 'PIM' },
      { id: 'phone', node: 'v4', kind: 'phone', talk: 'concierge_01A', label: 'RED PHONE BOX' },
      { id: 'tbar', node: 'shop', kind: 'pickup', item: 'tbar', label: 'T-BAR TOKEN' }, { id: 'pin3', node: 'garden', kind: 'pickup', item: 'pin3', label: 'LIFT PIN' }, { id: 'coatm', node: 'garden', kind: 'pickup', item: 'coat_mara', label: 'A COAT' }, { id: 'rime2', node: 'garden', kind: 'pickup', item: 'rime', n: 5, label: 'RIME' },
      { id: 'pin4', node: 'shop', kind: 'pickup', item: 'pin4', label: 'LIFT PIN' }, { id: 'coat', node: 'v6', kind: 'pickup', item: 'coat_vesper', label: 'A COAT' },
      { id: 'v1', edge: 'a2', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }, { id: 'v2', edge: 'a5', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }, { id: 'v3', edge: 'a7', s: .5, kind: 'pickup', item: 'red', n: 16, label: 'RED' }],
    spawns: { a: [20, 24], b: [24, 22], c: [12, 28], d: [34, 24], e: [38, 14], f: [24, 12], g: [32, 10], h: [10, 16], i: [44, 26], k: [36, 8], l: [20, 14], m: [30, 24] },
    waves: {
      w1: { spawn: [['giggler', 'c', 0], ['giggler', 'a', 1], ['skier', 'b', 2.5]] },
      w2: { spawn: [['skier', 'd', 0], ['skier', 'e', .7], ['thrower', 'm', 2], ['giggler', 'l', 3]] },
      w3: { spawn: [['sumo', 'f', 0], ['giggler', 'g', 2]] },
      w4: { spawn: [['bellhop', 'k', 0], ['thrower', 'g', 1], ['skier', 'f', 2]] },
      w5: { spawn: [['sumo', 'i', 0], ['skier', 'd', 2]] }
    },
    triggers: [
      { id: 'card', node: 'start', once: true, beat: 't01_card' },
      { id: 'tw1', node: 'v1', once: true, wave: 'w1', beat: 't01_arrive' }, { id: 'tw2', node: 'v4', once: true, wave: 'w2' },
      { id: 'tw3', node: 'v3', once: true, wave: 'w3', beat: 't01_pim' }, { id: 'tw4', node: 'v6', once: true, wave: 'w4' }, { id: 'tw5', node: 'v5', once: true, wave: 'w5' }],
    props: [['thing', 'chalet', 9, 28, 0], ['thing', 'chalet', 20, 36, 0], ['thing', 'chalet', 20, 10, 0], ['thing', 'chalet', 36, 31, 0], ['thing', 'chalet', 48, 28, 0], ['thing', 'chalet', 8, 5, 0], ['thing', 'chalet', 46, 14, 0],
      ['thing', 'fir', 4, 30, 0], ['thing', 'fir', 36, 12, 0], ['thing', 'fir', 24, 4, 0], ['thing', 'fir', 50, 36, 0], ['thing', 'fir', 12, 38, 0], ['thing', 'fir', 52, 8, 0], ['thing', 'fir', 3, 20, 0],
      ['thing', 'snowman', 33, 28, 0], ['thing', 'marmot', 29.8, 29, 0], ['thing', 'phonebox', 29.6, 18, 0], ['thing', 'serac', 36.5, 7, 0], ['thing', 'tstation', 43.5, 4, 0], ['thing', 'frozenshop', 51, 22, 0], ['thing', 'gardengate', 7.8, 13.5, 0],
      ['light', 28, 18, 4, { color: '#ff6a5a', reach: 10, power: 1 }], ['light', 14, 22, 4, { color: '#ffd090', reach: 14, power: 1 }], ['light', 40, 22, 4, { color: '#ffd090', reach: 14, power: 1 }], ['light', 8, 33, 4, { color: '#ffd090', reach: 14, power: 1 }]]
  });
}

// ---------------------------------------------------------------- 01C THE BLACK RUN (terrain: lift up, then ski down)
S7.blackRunHeight = (x, y) => (250 - y) * .2 + Math.sin(x * .07 + y * .02) * 2.2 + Math.sin(y * .06) * 1.4;
A('01C', {
  title: 'THE BLACK RUN', sub: 'T-BAR AND DOWNHILL', target: 1, music: 'blackrun', ambience: 'wind', mood: 'night', snow: true, terrain: true,
  w: 160, h: 270, height: S7.blackRunHeight, ground: 'snow',
  sky: ['#05060f', '#2a3a6a'], fog: { color: '#0a1020', near: 90, far: 700 }, ambient: ['#8a9ad0', '#2a3050', 1.5],
  nodes: {
    base: { t: [70, 246], kind: 'entry' }, top: { t: [64, 14], kind: 'junction' }, mid: { t: [62, 128], kind: 'junction' }, rest: { t: [70, 252], kind: 'exit', to: ['01F', 'f0'] },
    fork: { t: [50, 66] }, join: { t: [60, 190] }
  },
  edges: [
    { id: 'lift', a: 'base', b: 'top', kind: 'lift', via: [[70, 130]] },
    { id: 's1', a: 'top', b: 'mid', kind: 'ski', via: [[44, 40], [52, 84], [70, 108]] },
    { id: 's1b', a: 'top', b: 'mid', kind: 'ski', via: [[74, 52], [64, 90]], steep: true },
    { id: 's2', a: 'mid', b: 'join', kind: 'ski', via: [[34, 150], [76, 172]] },
    { id: 's2b', a: 'mid', b: 'join', kind: 'ski', via: [[90, 150], [74, 172]], steep: true },
    { id: 's3', a: 'join', b: 'rest', kind: 'ski', via: [[44, 214], [78, 236]] }],
  spots: [
    { id: 'murmel', node: 'top', kind: 'npc', who: 'murmel', talk: 'murmel_01C', label: 'MURMEL' }, { id: 'pin5', edge: 's1', s: .5, kind: 'pickup', item: 'pin5', label: 'LIFT PIN' },
    { id: 'pin6', edge: 's2b', s: .5, kind: 'pickup', item: 'pin6', label: 'LIFT PIN' }, { id: 'rime3', edge: 's1b', s: .5, kind: 'pickup', item: 'rime', n: 5, label: 'RIME' },
    { id: 'r1', edge: 's1', s: .3, kind: 'pickup', item: 'red', n: 12, label: 'RED' }, { id: 'r2', edge: 's2', s: .4, kind: 'pickup', item: 'red', n: 12, label: 'RED' }, { id: 'r3', edge: 's3', s: .4, kind: 'pickup', item: 'red', n: 12, label: 'RED' }],
  spawns: {},
  waves: {},
  triggers: [
    { id: 'tl', edge: 'lift', s: .15, once: true, beat: 't01_lift', run: { type: 'lift1' } },
    { id: 'tl2', edge: 'lift', s: .55, once: true, run: { type: 'lift2' } },
    { id: 'tk1', edge: 's1', s: .1, once: false, run: { type: 'ski1' } }, { id: 'tk1b', edge: 's1b', s: .1, run: { type: 'ski1' } },
    { id: 'tk2', edge: 's2', s: .1, run: { type: 'ski2' } }, { id: 'tk2b', edge: 's2b', s: .1, run: { type: 'ski2' } }, { id: 'tk3', edge: 's3', s: .1, run: { type: 'ski3' } }],
  props: []
});

// ---------------------------------------------------------------- 01F THE SUMMIT: POWDER KING
{
  const g = mkgrid(34, 34);
  A('01F', {
    title: 'THE SUMMIT', sub: 'THE POWDER KING', target: 1, boss: 'king', music: 'boss2', ambience: 'wind', mood: 'ice', snow: true,
    w: 34, h: 34, rows: rows(g), ground: 'snow', colors: { base: '#d8e8f8', dark: '#7a9ac8', light: '#ffffff' }, wallColor: '#6a90c0',
    sky: ['#0a0a22', '#5a7ac0'], fog: { color: '#2a3a6a', near: 60, far: 520 }, ambient: ['#a0b8f0', '#2a3a6a', 1.7],
    cam: { at: [17, 33.0, 8.0], look: [17, 13, 3.4], fov: 74 },
    nodes: (() => { const n = {}; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4; n['f' + i] = { t: [17 + Math.cos(a) * 9, 19 + Math.sin(a) * 9] }; } n.f0 = { t: [17, 28], kind: 'entry' }; n.out = { t: [17, 31.4], kind: 'exit', to: ['room7', 'door'] }; return n; })(),
    edges: (() => { const e = []; for (let i = 0; i < 8; i++) e.push({ id: 'q' + i, a: 'f' + i, b: 'f' + ((i + 1) % 8), kind: 'walk', arc: true }); e.push({ id: 'qo', a: 'f0', b: 'out', kind: 'walk', locked: 'boss' }); return e; })(),
    spots: [], spawns: { a: [8, 10], b: [26, 10], c: [6, 20], d: [28, 20] },
    waves: { add1: { spawn: [['skier', 'a', 0], ['skier', 'b', .5], ['giggler', 'c', 1.5]] }, add2: { spawn: [['thrower', 'a', 0], ['thrower', 'b', .4], ['giggler', 'd', 2]] } },
    triggers: [{ id: 'bossstart', node: 'f0', once: true, beat: 't01_boss', boss: 'king' }],
    props: [['thing', 'colossus', 17, 8, 0], ['light', 17, 10, 6, { color: '#a0c0ff', reach: 30, power: 1.6 }], ['light', 17, 24, 4, { color: '#ffffff', reach: 16, power: 1 }]]
  });
}
{   // trees along the Black Run: scattered by a seeded stream, kept clear of the rails
  const A = S7.reg.areas['01C'], rng = S7.rng(99), segs = [];
  for (const e of A.edges) { const pts = [A.nodes[e.a].t, ...(e.via || []), A.nodes[e.b].t]; for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]); }
  const dseg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = S7.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
  let n = 0;
  for (let k = 0; k < 900 && n < 80; k++) { const x = rng.range(8, 150), y = rng.range(6, 262); if (segs.some(s => dseg(x, y, s[0], s[1]) < 9)) continue; A.props.push(['thing', 'fir', x, y, 0]); n++; }
  A.props.push(['thing', 'tstation', 66, 248, 0], ['thing', 'tstation', 60, 8, 0], ['light', 64, 16, 5, { color: '#ffd090', reach: 20, power: 1 }], ['light', 70, 247, 5, { color: '#ffd090', reach: 20, power: 1 }]);
}
S7.AREA_ORDER = ['room7', '00A', '00C', '01A', '01C', '01F'];
