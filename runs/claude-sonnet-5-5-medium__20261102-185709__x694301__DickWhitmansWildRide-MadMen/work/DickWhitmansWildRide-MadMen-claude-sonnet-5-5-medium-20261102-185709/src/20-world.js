/* DICK WHITMAN'S WILD RIDE: the two places (Pryce, Lowell & Dunn, and the Gilded Fig), built from data. */
(() => {
'use strict';
const game = window.__game, M = game.MAD, E = M.E;
const TS = 16, tc = (cx, cy) => [cx * TS + TS / 2, cy * TS + TS / 2];
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const tint = (c, k) => [clamp255(c[0] * k), clamp255(c[1] * k), clamp255(c[2] * k)];
const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));

/* ---------- shapes: 1963 furniture, as data ---------- */
Object.assign(E.SHAPES, {
  desk:   { about: 'steel-and-walnut office desk', mats: { w: 'walnut', m: 'steel', g: 'plain' },
            parts: [['box', 'w', [0, 0, 12], [30, 15, 2]], ['box', 'm', [-12, 0, 0], [5, 13, 12]], ['box', 'm', [12, 0, 0], [5, 13, 12]], ['box', 'm', [-6, 1, 14], [8, 6, 3]], ['box', 'g', [9, 0, 14], [6, 8, 1]]] },
  deskE:  { about: 'big partner desk', mats: { w: 'walnut', m: 'bronze', g: 'leather' },
            parts: [['box', 'w', [0, 0, 13], [38, 18, 2]], ['box', 'm', [-15, 0, 0], [6, 16, 13]], ['box', 'm', [15, 0, 0], [6, 16, 13]], ['box', 'g', [0, 3, 15], [14, 8, 1]], ['box', 'm', [11, -3, 15], [5, 4, 3]]] },
  sofa:   { about: 'leather lounge sofa', mats: { l: 'leather', w: 'walnut' },
            parts: [['box', 'l', [0, 0, 3], [32, 13, 6]], ['box', 'l', [0, -5, 8], [32, 3, 9]], ['box', 'l', [-14, 0, 8], [4, 12, 5]], ['box', 'l', [14, 0, 8], [4, 12, 5]], ['box', 'w', [-13, 4, 0], [2, 2, 3]], ['box', 'w', [13, 4, 0], [2, 2, 3]]] },
  rtable: { about: 'round bar table', mats: { w: 'walnut', m: 'metal', c: 'linen' },
            parts: [['cyl', 'c', [0, 0, 10], 8, 1.5], ['cyl', 'm', [0, 0, 1], 1.4, 9], ['cyl', 'm', [0, 0, 0], 5, 1]] },
  barcart:{ about: 'chrome drinks cart', mats: { m: 'steel', g: 'glazed', b: 'bronze' },
            parts: [['box', 'm', [0, 0, 3], [16, 9, 1]], ['box', 'm', [0, 0, 11], [16, 9, 1]], ['box', 'm', [-7, 0, 0], [1, 8, 12]], ['box', 'm', [7, 0, 0], [1, 8, 12]], ['cyl', 'g', [-4, 0, 12], 1.6, 7], ['cyl', 'b', [0, 1, 12], 1.6, 6], ['cyl', 'g', [4, 0, 12], 1.2, 5]] },
  counter:{ about: 'long walnut bar', mats: { w: 'walnut', b: 'bronze' },
            parts: [['box', 'w', [0, 0, 0], [96, 12, 13]], ['box', 'w', [0, 0, 13], [98, 14, 1.5]], ['box', 'b', [0, 6, 2], [96, 1, 1.5]]] },
  conf:   { about: 'conference table', mats: { w: 'walnut', m: 'steel' },
            parts: [['box', 'w', [0, 0, 12], [88, 30, 2]], ['box', 'm', [-34, 0, 0], [5, 24, 12]], ['box', 'm', [34, 0, 0], [5, 24, 12]]] },
  cabinet:{ about: 'steel filing cabinet', mats: { m: 'steel' }, parts: [['box', 'm', [0, 0, 0], [12, 10, 24]]] },
  phone:  { about: 'desk telephone', mats: { b: 'plain', m: 'steel' }, parts: [['box', 'b', [0, 0, 0], [5, 4, 2.5]], ['box', 'm', [0, 0, 2.5], [6, 2, 1]]] },
  piano:  { about: 'baby grand', mats: { b: 'slate', w: 'marble' },
            parts: [['box', 'b', [0, 0, 6], [34, 22, 3]], ['box', 'b', [-14, -7, 0], [3, 3, 6]], ['box', 'b', [14, -7, 0], [3, 3, 6]], ['box', 'b', [0, 8, 0], [3, 3, 6]], ['box', 'w', [0, 9, 9], [24, 3, 1]], ['box', 'b', [0, -7, 9], [30, 3, 7]]] },
  booth:  { about: 'red velvet booth bench', mats: { v: 'velvet', w: 'walnut' },
            parts: [['box', 'v', [0, 0, 2], [34, 10, 6]], ['box', 'v', [0, -4, 8], [34, 3, 9]], ['box', 'w', [0, 0, 0], [34, 10, 2]]] },
  elevator:{ about: 'brass elevator doors', mats: { b: 'bronze', m: 'steel' },
            parts: [['box', 'm', [-9, 0, 0], [17, 3, 34]], ['box', 'm', [9, 0, 0], [17, 3, 34]], ['box', 'b', [0, 0, 34], [38, 4, 4]], ['box', 'b', [-19, 0, 0], [2, 4, 38]], ['box', 'b', [19, 0, 0], [2, 4, 38]]] },
  plant:  { about: 'potted rubber plant', mats: { p: 'clay', g: 'leaves' },
            parts: [['cyl', 'p', [0, 0, 0], 5, 8], ['ball', 'g', [0, 0, 15], 7, { sz: 1.3 }]] }
});

/* ---------- map building ---------- */
function grid(W, H) { return Array.from({ length: H }, () => Array(W).fill('.')); }
function rect(g, x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; }
function border(g, ch) { const H = g.length, W = g[0].length; rect(g, 0, 0, W - 1, 0, ch); rect(g, 0, H - 1, W - 1, H - 1, ch); rect(g, 0, 0, 0, H - 1, ch); rect(g, W - 1, 0, W - 1, H - 1, ch); }
const rows = g => g.map(r => r.join(''));

const WALL_TYPES = {
  1: { h: 46, top: '#4a3a2c', side: '#8b6a46', face: 'plank', cut: true },
  2: { h: 36, top: '#7e9690', side: '#b4cbc2', face: 'plaster', cut: true },
  3: { h: 12, top: '#a89878', side: '#cdb894', face: 'timber' },
  4: { h: 46, top: '#2e1418', side: '#7a1e2e', face: 'plaster', cut: true }
};

function officeFloor(x, y) {
  const cx = Math.floor(x / TS), cy = Math.floor(y / TS), n = .96 + hash(Math.floor(x / 4), Math.floor(y / 4)) * .06;
  let c;
  if (cy >= 22) c = ((cx + cy) & 1) ? [226, 214, 190] : [48, 44, 52];              // lobby: marble checker
  else if (cy <= 8) c = cx >= 21 && cx <= 37 ? [58, 42, 52] : cx >= 11 && cx <= 19 ? [112, 96, 70] : [92, 56, 56];   // offices
  else c = ((cx >> 1) + (cy >> 1)) & 1 ? [112, 138, 122] : [102, 128, 112];         // bullpen: green linoleum
  const edge = (x % TS < 1 || y % TS < 1) ? .94 : 1;
  return tint(c, n * edge);
}
function barFloor(x, y) {
  const cx = Math.floor(x / TS), cy = Math.floor(y / TS), n = .93 + hash(Math.floor(x / 3) * 3.1, cy * 5.7) * .12;
  const plank = (Math.floor(y / 4) + cx * 3) & 3 ? 1 : .86;
  const c = cx > 22 ? [96, 24, 36] : [78, 48, 32];
  return tint(c, n * plank);
}

function rigFor(id, extra) { const c = M.CAST[id]; return new E.Humanoid(Object.assign({ size: 1.05, weapon: null, build: 'chibi' }, c.rig, extra || {})); }

M.rigFor = rigFor;
M.worlds = {};

function build() {
  /* ===== the office ===== */
  {
    const W = 46, H = 30, g = grid(W, H); border(g, '#');
    rect(g, 1, 9, 44, 9, 'p'); [[5, 6], [15, 16], [28, 30], [41, 42]].forEach(([a, b]) => rect(g, a, 9, b, 9, '.'));
    [10, 20, 38].forEach(x => rect(g, x, 1, x, 8, 'p'));
    rect(g, 2, 8, 2, 8, '.'); rect(g, 1, 22, 44, 22, 'p'); rect(g, 18, 22, 27, 22, '.');
    rect(g, 15, 11, 15, 14, 'h'); rect(g, 31, 11, 31, 14, 'h'); rect(g, 15, 17, 15, 20, 'h'); rect(g, 31, 17, 31, 20, 'h');
    rect(g, 2, 16, 8, 16, 'h'); rect(g, 36, 16, 43, 16, 'h');
    const map = new E.TileMap({ rows: rows(g), legend: { '#': 1, p: 2, h: 3 }, types: WALL_TYPES, floorTex: officeFloor, ao: 4, outside: '#0a0810' });
    const solids = [];
    const S = (id, cx, cy, o) => { const [x, y] = tc(cx, cy); map.solid(id, x, y, 0, o || {}); solids.push({ id, x, y, o }); };
    S('barcart', 2, 2); S('deskE', 6, 3); S('sofa', 8, 1.4, {});
    S('desk', 15, 3.3); S('cabinet', 12, 1); S('cabinet', 18, 1);
    S('conf', 29.5, 4.2, { facing: Math.PI / 2 }); S('cabinet', 22, 1); S('cabinet', 36, 1);
    S('deskE', 41, 3); S('phone', 42.8, 2.8); S('cabinet', 44, 6);
    [[4, 12], [8, 12], [12, 12]].forEach(([x, y]) => S('desk', x, y));
    S('desk', 21.5, 12); S('desk', 35, 12); S('desk', 41, 12); S('desk', 6, 19); S('desk', 11, 19);
    S('desk', 24.5, 18); S('cabinet', 19, 18); S('cabinet', 29, 18); S('cabinet', 1.6, 18);
    S('desk', 23, 25.2); S('sofa', 4.5, 27.4); S('sofa', 9.5, 27.4); S('plant', 1.5, 23.5); S('plant', 44, 23.5); S('plant', 17.5, 28.2); S('plant', 28, 28.2);
    S('elevator', 42, 29.1, { facing: Math.PI / 2 });
    const flow = new E.FlowField(map);
    const props = [
      ['lamp', 14, 24.8], ['lamp', 32, 19.5], ['lamp', 9, 4.8], ['lamp', 43.5, 6.5], 
      ['pillar', 17.5, 22.5], ['pillar', 28, 22.5], ['sign', 25.2, 21.4]
    ];
    const lights = [];
    for (let cx = 3; cx < W; cx += 6) for (let cy = 4; cy < H; cy += 6) lights.push([cx * TS, cy * TS, 46, 118, .42, '#ffe9c0']);
    lights.push([42 * TS, 29 * TS, 30, 40, .8, '#ffd070'], [23 * TS, 25 * TS, 30, 50, .6, '#ffd8a0'], [29.5 * TS, 4 * TS, 30, 90, .8, '#fff0d0']);
    M.worlds.office = { id: 'office', name: 'Pryce, Lowell & Dunn', map, flow, props, lights, solids, music: 'office', ambient: .86, spawn: tc(40, 26), W, H };
  }
  /* ===== the Gilded Fig ===== */
  {
    const W = 32, H = 22, g = grid(W, H); border(g, '@');
    rect(g, 1, 1, 30, 1, '@'); rect(g, 22, 3, 22, 8, 'h');
    const map = new E.TileMap({ rows: rows(g).map(r => r.replace(/@/g, '#')), legend: { '#': 4, h: 3 }, types: WALL_TYPES, floorTex: barFloor, ao: 4, outside: '#0a0810' });
    const solids = [];
    const S = (id, cx, cy, o) => { const [x, y] = tc(cx, cy); map.solid(id, x, y, 0, o || {}); solids.push({ id, x, y, o }); };
    S('counter', 11.5, 4.4); [7, 9, 11, 13, 15].forEach(x => S('stool', x, 6.1));
    S('piano', 19.5, 3.4); [[6, 12], [12, 15], [17, 11], [8, 17], [20, 16]].forEach(([x, y]) => S('rtable', x, y));
    S('rtable', 26, 13.4); S('booth', 26, 11.9); S('booth', 26, 15, { facing: -Math.PI / 2 });
    S('booth', 26, 7.9); S('booth', 26, 5.5, { facing: -Math.PI / 2 }); S('rtable', 26, 6.8);
    S('plant', 1.6, 19.4); S('plant', 30.2, 19.4); S('plant', 1.6, 2.6);
    S('elevator', 16, 21.1, { facing: Math.PI / 2 });
    const flow = new E.FlowField(map);
    const props = [['lamp', 4, 9], ['lamp', 28, 18], ['candelabra', 26, 13.4, 14], ['candelabra', 6, 12, 14], ['candelabra', 17, 11, 14], ['candelabra', 12, 15, 14], ['sign', 11.5, 2.2, 20], ['pillar', 3.2, 10], ['pillar', 3.2, 16], ['banner', 22.4, 9.6, 4]];
    const lights = [];
    for (let cx = 4; cx < W; cx += 6) for (let cy = 5; cy < H; cy += 6) lights.push([cx * TS, cy * TS, 40, 100, .3, '#ffb870']);
    lights.push([11.5 * TS, 3.6 * TS, 30, 90, .9, '#ffc880'], [26 * TS, 13 * TS, 20, 60, .9, '#ff9050'], [19.5 * TS, 4 * TS, 25, 60, .8, '#ffb860']);
    M.worlds.bar = { id: 'bar', name: 'The Gilded Fig', map, flow, props, lights, solids, music: 'bar', ambient: .62, spawn: tc(16, 18.6), W, H };
  }

  /* ---------- people: where they stand, who they are ---------- */
  const NPC = (world, id, cast, cx, cy, o = {}) => {
    const w = M.worlds[world], [x, y] = tc(cx, cy);
    const npc = Object.assign({ id, cast, world, x, y, hx: x, hy: y, face: Math.PI / 2, talk: null, label: M.CAST[cast].name, show: () => true, r: 5 }, o, { rig: rigFor(cast, o.rig) });
    npc.rig.update(0, { x, y, z: 0, vx: 0, vy: 0, facing: npc.face });
    (w.npcs || (w.npcs = [])).push(npc); return npc;
  };
  const f = () => M.S.flags;
  NPC('office', 'gwen', 'gwen', 23, 26.9, { face: -Math.PI / 2, talk: () => M.T.gwen() });
  NPC('office', 'joyce', 'joyce', 24.5, 19.7, { face: -Math.PI / 2, talk: () => M.T.joyce() });
  NPC('office', 'margie', 'margie', 21.5, 13.4, { face: -Math.PI / 2, talk: () => M.T.margie() });
  NPC('office', 'percy', 'percy', 36.3, 14.2, { face: Math.PI, talk: () => M.T.percy() });
  NPC('office', 'roland', 'roland', 6, 5.2, { face: -Math.PI / 2, talk: () => M.T.roland() });
  NPC('office', 'dunn', 'dunn', 15, 5.6, { face: -Math.PI / 2, talk: () => M.T.dunn() });
  NPC('office', 'archie', 'archie', 6.8, 25.2, { face: Math.PI / 2, talk: () => M.T.archie(), show: () => f().margie && f().dunn && !f().pitch1, tag: 'a stranger in the lobby' });
  NPC('office', 'teague', 'teague', 33.2, 4.4, { face: Math.PI, talk: () => M.T.teagueIntro(), show: () => !!f().pitch1 && !f().pitch2, rigX: { pose: 'hips' } });
  NPC('office', 'dot', 'typist', 4, 13.5, { face: -Math.PI / 2, talk: () => M.T.typist('dot'), label: 'DOT', rig: { hair: 'long', colors: { hair: '#3a2a2e', cloth: '#d8c8e0', pants: '#4a3a5a', skin: '#e7b992' } } });
  NPC('office', 'lois', 'typist', 8, 13.5, { face: -Math.PI / 2, talk: () => M.T.typist('lois'), label: 'LOIS', rig: { hair: 'ponytail', colors: { hair: '#a05a2e', cloth: '#b8d8d0', pants: '#4a3a5a', skin: '#f2cfae' } } });
  NPC('office', 'bev', 'typist', 12, 13.5, { face: -Math.PI / 2, talk: () => M.T.typist('bev'), label: 'BEV', rig: { hair: 'short', colors: { hair: '#8a8a90', cloth: '#e0b8b8', pants: '#4a3a5a', skin: '#d9a57e' } } });
  NPC('office', 'mail', 'typist', 12, 24, { talk: () => [['typist', 'Mail for the sixth floor. Mail for the seventh. Nobody ever has mail for me.']], label: 'MAILBOY', wander: [[3, 24], [40, 24], [40, 20], [3, 20]], speed: 26, rig: { hair: 'spiky', outfit: 'shirt', hat: 'cap', colors: { hair: '#2a2418', cloth: '#7a8a9a', pants: '#2a2a3a', skin: '#e7b992' } } });
  NPC('bar', 'sully', 'sully', 11.5, 2.4, { face: Math.PI / 2, talk: () => M.T.sully(), label: 'SULLY' });
  NPC('bar', 'vera', 'vera', 9, 7.4, { face: -Math.PI / 2, talk: () => M.T.vera() });
  NPC('bar', 'hollis', 'hollis', 23.4, 13.4, { face: 0, talk: () => M.T.hollisIntro(), show: () => !f().pitch1 });
  NPC('bar', 'pianist', 'typist', 19.5, 5.2, { face: -Math.PI / 2, talk: () => [['narrator', 'The pianist nods without breaking the song. It is a song about someone else\'s regret.']], label: 'PIANIST', rig: { hair: 'short', outfit: 'coat', build: 'chibi', colors: { hair: '#2a2418', cloth: '#1c1c28', coat: '#1c1c28', pants: '#1c1c28', skin: '#c58d66' } } });
  NPC('bar', 'waiter', 'sully', 10, 10, { talk: () => [['sully', 'Excuse me, sir. Hot plates. Everyone in this room is hungry for something else.']], label: 'WAITER', wander: [[4, 10], [24, 10], [24, 18], [4, 18]], speed: 24, rig: { hair: 'bald', colors: { hair: '#e0e0e0', cloth: '#f4f0e8', pants: '#15151c', skin: '#d9a57e' } } });
  [[6, 13.3, '#7a4a6a', 'Table 4: two of them talk about a third.'], [12, 16.3, '#4a6a7a', 'Excuse us. This is a very private lunch.'], [17, 12.3, '#8a6a3a', 'We are not listening. We are just sitting next to each other.'], [8, 18.3, '#5a5a6a', 'The soup is a metaphor for the divorce.']].forEach(([cx, cy, col, txt], i) => {
    NPC('bar', 'patron' + i, 'typist', cx, cy, { face: -Math.PI / 2, talk: () => [['narrator', txt]], label: 'PATRON', rig: { hair: i % 2 ? 'short' : 'long', outfit: i % 2 ? 'coat' : 'tunic', colors: { hair: ['#c0b090', '#2a2418', '#8a4a2e', '#d8d0c0'][i], cloth: col, coat: col, pants: '#2a2a38', skin: ['#f2cfae', '#e7b992', '#d9a57e', '#c58d66'][i] } } });
  });

  /* ---------- things you can use ---------- */
  const THING = (world, id, cx, cy, label, use, o = {}) => { (M.worlds[world].things || (M.worlds[world].things = [])).push(Object.assign({ id, world, x: tc(cx, cy)[0], y: tc(cx, cy)[1], label, use, show: () => true, r: 7 }, o)); };
  THING('office', 'elevator', 42, 27.4, 'Elevator', () => M.useElevator('office'));
  THING('office', 'phone', 42.8, 4.4, 'Telephone', () => M.usePhone(), { show: () => !!M.S.flags.pitch2 && !M.S.flags.grace, r: 10 });
  THING('office', 'barcart', 2.6, 3.8, 'Drinks cart', () => M.useBarCart('Roland\'s drinks cart'), { r: 9 });
  THING('office', 'nap', 6.5, 25.5, 'Lobby sofa', () => M.useSofa(), { r: 12 });
  THING('office', 'desk', 41, 4.6, 'Your desk', () => M.useDesk(), { r: 9 });
  THING('bar', 'exit', 16, 19.6, 'Back to the office', () => M.useElevator('bar'));
  THING('bar', 'barstool', 13.5, 7.4, 'Bar', () => M.useBarCart('the bar at the Gilded Fig'), { r: 9 });
}
M.buildWorlds = build;
M.TS = TS; M.tc = tc;
})();
