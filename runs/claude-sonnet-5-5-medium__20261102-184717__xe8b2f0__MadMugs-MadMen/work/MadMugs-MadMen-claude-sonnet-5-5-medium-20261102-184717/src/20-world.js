// ---------------------------------------------------------------------------------------------------------------------
// THE GAME OBJECT, THE FLOOR PLAN, THE PEOPLE
// ---------------------------------------------------------------------------------------------------------------------
const MENU = E.Input.DEFAULT;
const PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  interact: ['KeyE', 'Pad0'], notebook: ['KeyN', 'Tab', 'Pad2'], view: ['KeyV', 'Pad3'],
  start: MENU.start, pause: MENU.pause, confirm: MENU.confirm, cancel: MENU.cancel
};
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], id: 'mad-mugs-1963', input: PRESET,
  menu: {
    controls: { interact: 'Talk and use', notebook: 'Notebook', view: 'Change view' },
    quit: IN_SESSION ? false : 'title', saves: !IN_SESSION,
    settings: [
      { key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], help: 'PlayStation: ✕ ○ □ △. Xbox: A B X Y', apply: (g, v) => { g.input.glyphs = v; } },
      { key: 'padInvertX', group: 'Controller', label: 'Invert stick left and right', type: 'toggle', value: false, help: 'If your stick feels flipped sideways', apply: (g, v) => { AXIS.invX = !!v; } },
      { key: 'padInvertY', group: 'Controller', label: 'Invert stick up and down', type: 'toggle', value: false, help: 'If your stick feels flipped upside down', apply: (g, v) => { AXIS.invY = !!v; } },
      { key: 'hints', group: 'Game', label: 'Show hints', type: 'toggle', value: true, help: 'Objective and prompts on screen' },
      { key: 'timing', group: 'Game', label: 'Pitch timing', type: 'select', value: 'standard', options: [['relaxed', 'Relaxed'], ['standard', 'Standard'], ['tough', 'Tough']], help: 'How wide the sweet spot is when you deliver a line' }
    ]
  }
});
const I = game.input;

// ---- the floor plan (a tile is 16 units) ------------------------------------------------------------------------------
const MW = 40, MH = 23;
const WALLS = {
  1: { h: 44, top: '#d8cfbc', side: '#a89f8a', face: 'plaster', roof: 'plain', cut: true },
  2: { h: 11, top: '#946e46', side: '#5e442c', face: 'plank', roof: 'plain' },          // desk
  3: { h: 22, top: '#8a8d92', side: '#5a5d64', face: 'plaster', roof: 'plain', cut: true },   // filing cabinet
  4: { h: 8, top: '#5a8a78', side: '#2f5a4a', face: 'plaster', roof: 'plain' },           // sofa
  5: { h: 11, top: '#7a5434', side: '#43301f', face: 'plank', roof: 'plain' },            // conference table
  6: { h: 13, top: '#b99472', side: '#6a5038', face: 'plank', roof: 'plain' },            // reception counter
  7: { h: 30, top: '#6a4a36', side: '#3a281c', face: 'plank', roof: 'plain', cut: true }, // bookshelf
  8: { h: 14, top: '#4a6a8a', side: '#3a5470', face: 'plaster', roof: 'plain' },          // cooler, planter
  9: { h: 11, top: '#9a9fa5', side: '#656b72', face: 'plaster', roof: 'plain' },          // terrace rail
  10: { h: 12, top: '#d0aa6a', side: '#54382a', face: 'plank', roof: 'plain' },           // bar cart
  11: { h: 6, top: '#6a4a30', side: '#43301f', face: 'plank', roof: 'plain' },            // low table
  12: { h: 7, top: '#8a3a32', side: '#5a2420', face: 'plaster', roof: 'plain' }           // chair
};
const noise = (x, y) => (((x * 374761393 + y * 668265263) ^ (x * 1274126177)) >>> 0) % 100 / 100;
function floorTex(x, y, tag) {
  const ix = Math.floor(x), iy = Math.floor(y), n = noise(ix, iy), c = (r, g, b, k = 1) => [r * k, g * k, b * k];
  switch (tag) {
    case 'l': { const plank = Math.floor(ix / 8) + (Math.floor(iy / 24) % 2) * 3, edge = ix % 8 === 0 ? .8 : 1; return c(150 + (plank % 3) * 7, 104 + (plank % 3) * 5, 66, edge * (.94 + n * .1)); }
    case 'o': return c(54, 84, 66, .92 + n * .16);
    case 'c': { const edge = iy % 16 === 0 ? .78 : 1, plank = Math.floor(iy / 16); return c(104 + (plank % 2) * 8, 70, 46, edge * (.95 + n * .08)); }
    case 'b': { const chk = (Math.floor(ix / 16) + Math.floor(iy / 16)) % 2; return chk ? c(186, 180, 150, .96 + n * .08) : c(168, 162, 134, .96 + n * .08); }
    case 't': { const joint = ix % 32 === 0 || iy % 32 === 0 ? .8 : 1; return c(140, 138, 134, joint * (.95 + n * .08)); }
    default: return c(112, 86, 62, .95 + n * .1);   // doorways
  }
}
const map = new E.TileMap({ w: MW, h: MH, types: WALLS, floorTex, outside: '#0e0c16', ao: 4 });
map.fill(0, 0, MW, MH, 1);
const ROOMS = [['l', 1, 1, 11, 8], ['o', 13, 1, 10, 8], ['c', 24, 1, 15, 8], ['b', 1, 10, 29, 12], ['t', 31, 10, 8, 12]];
for (const [tag, x, y, w, h] of ROOMS) { map.fill(x, y, w, h, 0); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map.setFloor(i, j, tag); }
for (const [x, y] of [[6, 9], [17, 9], [27, 9], [30, 15], [30, 16]]) { map.fill(x, y, 1, 1, 0); map.setFloor(x, y, 'd'); }
map.fill(39, 10, 1, 12, 9); map.fill(31, 22, 9, 1, 9);   // the terrace's rail
const FURN = [  // [type, x, y, w, h]
  [10, 1, 1, 3, 1], [4, 8, 7, 3, 1], [11, 8, 5, 2, 1], [12, 7, 7, 1, 1],                                    // lounge: bar cart, sofa, low table, chair
  [7, 13, 1, 3, 1], [7, 20, 1, 3, 1], [2, 16, 3, 4, 1],                                                      // Hollis: shelves, desk
  [5, 27, 3, 9, 3], [12, 28, 2, 1, 1], [12, 31, 2, 1, 1], [12, 34, 2, 1, 1], [12, 28, 6, 1, 1], [12, 31, 6, 1, 1], [12, 34, 6, 1, 1], [12, 37, 4, 1, 1], [12, 25, 4, 1, 1],   // conference
  [6, 4, 18, 4, 1],                                                                                          // reception counter
  [2, 5, 13, 4, 1], [2, 12, 12, 4, 1], [2, 21, 14, 4, 1], [3, 19, 10, 4, 1], [2, 9, 17, 3, 1], [2, 20, 18, 3, 1], // desks, files
  [8, 27, 19, 1, 1], [8, 2, 10, 1, 1], [8, 36, 19, 1, 1], [4, 33, 20, 3, 1]                                  // cooler, planters, a bench
];
for (const [t, x, y, w, h] of FURN) map.fill(x, y, w, h, t);
const T16 = 16, at = (tx, ty) => [tx * T16, ty * T16];

// where people stand and sit (tile coordinates; the 0.5s are cell centres)
const SPOTS = {
  dot_desk: [6.5, 12.3], walt_desk: [13.5, 11.2], teddy_lounge: [6.6, 4.2], teddy_desk: [26, 16.6], hollis_desk: [17.5, 2.5], hollis_terrace: [35, 15.8],
  lorraine: [5.5, 19.5], garland: [36.5, 4.5], conf_gil: [26, 4.5], conf_hollis: [28.5, 6.9], conf_teddy: [33, 6.9], hero_start: [4, 16.4]
};
const SCHED = {
  dot: [[0, 'dot_desk']], walt: [[0, 'walt_desk']], lorraine: [[0, 'lorraine']],
  teddy: [[0, 'teddy_lounge'], [12 * 60 + 30, 'teddy_desk']],
  hollis: [[0, 'hollis_desk'], [12 * 60 + 30, 'hollis_terrace'], [15 * 60, 'hollis_desk']],
  garland: [[0, null], [MIN_ARRIVE, 'garland']]
};

// ---- the people -------------------------------------------------------------------------------------------------------
function makeRig(id, extra) {
  const P = PEOPLE[id];
  return new E.Humanoid(Object.assign({ size: 1.3, weapon: null, face: { eyes: 'big' } }, P.rig, extra || {}));
}
const rigs = {}; for (const id of Object.keys(PEOPLE)) rigs[id] = makeRig(id);
const hero = new E.Body({ x: 0, y: 0, r: 4.5 }); hero.facing = Math.PI / 2;
const npcs = {};
for (const id of NPC_IDS) {
  const b = new E.Body({ x: 0, y: 0, r: 4.5 }); b.facing = Math.PI / 2;
  npcs[id] = { id, body: b, rig: rigs[id], spot: null, flow: new E.FlowField(map), moving: false, pose: null, shown: id !== 'garland' };
}
// background staff: they type, they have mortgages
const EXTRAS = [
  { rig: new E.Humanoid({ size: 1.3, weapon: null, build: 'chibi', outfit: 'tunic', hair: 'long', colors: { hair: '#3a2a20', cloth: '#b86a52', skin: '#e8c4a4' } }), x: 10.5, y: 16.4, f: Math.PI / 2 },
  { rig: new E.Humanoid({ size: 1.3, weapon: null, build: 'heroic', outfit: 'coat', hair: 'short', colors: { hair: '#4a3a2a', coat: '#5a5a66', cloth: '#e8e4da', skin: '#d4a07c' } }), x: 21.5, y: 19.4, f: -Math.PI / 2 },
  { rig: new E.Humanoid({ size: 1.3, weapon: null, build: 'chibi', outfit: 'robe', hair: 'ponytail', colors: { hair: '#c9a05a', cloth: '#5a7ab0', skin: '#f0d0b0' } }), x: 3.2, y: 12.5, f: 0 }
];
const REST_POSE = { dot: null, walt: 'hips', teddy: 'hips', hollis: null, lorraine: null, garland: null };

function spotXY(name) { const s = SPOTS[name]; return s ? at(s[0], s[1]) : null; }
function spotFor(id, min) { let cur = null; for (const [from, spot] of SCHED[id]) if (min >= from) cur = spot; return cur; }
function placeNpc(id, name) {
  const n = npcs[id], p = spotXY(name);
  n.spot = name; n.shown = !!p; n.route = null; n.moving = false;
  if (p) { n.body.x = p[0]; n.body.y = p[1]; n.body.vx = n.body.vy = 0; }
}
function setNpcSpot(id, name, walk) {
  const n = npcs[id], p = spotXY(name);
  if (n.spot === name) return;
  if (!p || !n.shown || !walk) return placeNpc(id, name);
  n.spot = name; n.target = p; n.moving = true;
}

// ---- interaction targets -----------------------------------------------------------------------------------------------
// each: where it is, where you stand to use it, how it is called. NPC ones follow the person.
const OBJECTS = [
  { id: 'files', label: 'Search the files', x: 20.5 * 16, y: 11 * 16, stand: at(20.5, 12.2) },
  { id: 'bar', label: 'The bar cart', x: 2.5 * 16, y: 2.5 * 16, stand: at(2.5, 3.2) },
  { id: 'phone', label: 'The telephone', x: 21.6 * 16, y: 14.2 * 16, stand: at(21.8, 15.6) },
  { id: 'type', label: 'Sit at the typewriter', x: 23.6 * 16, y: 14.2 * 16, stand: at(23.4, 15.6) },
  { id: 'smoke', label: 'Step out for a smoke', x: 36 * 16, y: 13.5 * 16, stand: at(36, 14.6) },
  { id: 'elevator', label: 'The elevator', x: 0.7 * 16, y: 20 * 16, stand: at(1.6, 20.4) }
];
function targets() {
  const out = [];
  for (const id of NPC_IDS) {
    const n = npcs[id]; if (!n.shown || (id === 'garland' && S.mode !== 'walk')) continue;
    out.push({ id, kind: 'npc', label: 'Talk to ' + PEOPLE[id].name, get x() { return n.body.x; }, get y() { return n.body.y; }, stand: null });
  }
  for (const o of OBJECTS) out.push(Object.assign({ kind: 'obj' }, o));
  return out;
}
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- drawing the furniture's details and the skyline -------------------------------------------------------------------
function drawDetails(r) {
  const box = (x0, y0, z0, x1, y1, z1, top, side) => r.queue((x0 + x1) / 2, (y0 + y1) / 2, z1, g => r.box(g, x0, y0, z0, x1, y1, z1, top, side));
  // gil's desk: typewriter and phone
  box(21.1 * 16, 14.2 * 16, 11, 22.6 * 16, 14.9 * 16, 14, '#3a3a40', '#222228'); box(21.3 * 16, 14.3 * 16, 14, 22.4 * 16, 14.7 * 16, 15.2, '#6a6a72', '#2a2a30');
  box(23.1 * 16, 14.2 * 16, 11, 23.9 * 16, 14.9 * 16, 13, '#16161a', '#0e0e12');
  // dot's typewriter, walt's board, files, bar bottles, cooler bottle, ashtray, record player
  box(5.6 * 16, 13.2 * 16, 11, 7 * 16, 13.8 * 16, 13.4, '#3a3a40', '#222228');
  box(12.2 * 16, 12.1 * 16, 11, 15.7 * 16, 12.8 * 16, 16, '#e8e2d0', '#a8a290');
  for (let i = 0; i < 4; i++) box((19.2 + i) * 16, 10.2 * 16, 22, (19.2 + i) * 16 + 12, 10.8 * 16, 23, '#aeb2b8', '#6a6e76');
  [['#7a3a1a', 1.2], ['#2a5a3a', 1.7], ['#caa04a', 2.2], ['#8a2a2a', 2.7]].forEach(([c, dx]) => box(dx * 16, 1.3 * 16, 12, dx * 16 + 4, 1.3 * 16 + 4, 19, c, c));
  box(2.5 * 16, 1.6 * 16, 12, 3 * 16 + 4, 2 * 16, 14, '#d8e4f0', '#98a4b0');
  box(26.8 * 16, 19.4 * 16, 14, 27.6 * 16, 19.9 * 16, 22, '#bfe6ff', '#7aa6c8');
  box(35.8 * 16, 13.3 * 16, 0, 36.3 * 16, 13.8 * 16, 11, '#3a3a40', '#222228'); box(35.7 * 16, 13.2 * 16, 11, 36.4 * 16, 13.9 * 16, 12.3, '#cfc8b8', '#8a8478');
  box(11.1 * 16, 12.2 * 16, 11, 11.9 * 16, 12.8 * 16, 14, '#2a2218', '#1a140c');
  // hollis's blotter and decanter
  box(17 * 16, 3.2 * 16, 11, 19 * 16, 3.7 * 16, 11.6, '#2a3a2a', '#1a2a1a'); box(19.5 * 16, 3.1 * 16, 11, 19.9 * 16, 3.5 * 16, 17, '#c88a3a', '#8a5a1a');
  // conference: water pitcher and glasses, a legal pad at each seat
  box(31.2 * 16, 4.2 * 16, 11, 31.8 * 16, 4.7 * 16, 18, '#cfe8f4', '#8ab0c4');
  for (let i = 0; i < 4; i++) box((28 + i * 2.4) * 16, 3.3 * 16, 11, (28 + i * 2.4) * 16 + 8, 3.3 * 16 + 11, 11.6, '#f2eecf', '#c4c09c');
}
function drawAmbience(r) {
  // lamps and windows: warm pools of light, cool daylight from the glass on the north wall
  const lamps = [[3, 6], [10, 3], [15, 5], [21, 5], [27, 7], [37, 7], [8, 15], [16, 17], [24, 12], [4, 12], [36, 17]];
  for (const [x, y] of lamps) game.lights.add(x * 16, y * 16, 26, 74, .55, { color: '#ffb868' });
  r.prop('lamp', 3 * 16, 5.5 * 16, 0, { light: true }); r.prop('lamp', 21.6 * 16, 6.4 * 16, 0, { light: true });
  r.prop('lamp', 36.8 * 16, 7.4 * 16, 0, { light: true });
  for (const x of [5, 9, 15, 19, 26, 31, 35]) r.prop('window', x * 16 + 8, 0.6 * 16, 16, { size: 1, colors: ['#9fc4de', '#7fa8c8'] });
  r.prop('pot', 1.6 * 16, 12.2 * 16, 0); r.prop('bush', 27.2 * 16, 10.8 * 16, 0); r.prop('pot', 37.4 * 16, 11.5 * 16, 0); r.prop('flowers', 37.4 * 16, 20.4 * 16, 0);
}
