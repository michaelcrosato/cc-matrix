import fs from 'node:fs';
import vm from 'node:vm';
vm.runInThisContext(
  fs.readFileSync(new URL('../vendor/my-3d2dge.js', import.meta.url), 'utf8'),
);
const rows = [
  '###################',
  '#.................#',
  '#...###...........#',
  '#.........###.....#',
  '#.................#',
  '#....B............#',
  'P.................P',
  '#.................#',
  '#....###..........#',
  '#.................#',
  '#...........###...#',
  '#.................#',
  '###################',
];
globalThis.WizardSim = {
  ROOMS: [{ rows, palette: ['#26333d', '#5b4b61', '#d6b77c'] }],
};
vm.runInThisContext(
  fs.readFileSync(new URL('../src/render.js', import.meta.url), 'utf8'),
);
const E = globalThis.My3D2dge,
  g = new E.Game({
    headless: true,
    draw: true,
    res: [640, 360],
    view: 'topdown',
    views: ['topdown'],
  }),
  renderer = new WizardRenderer(g);
const s = {
  roomIndex: 0,
  time: 4,
  phase: 'hunt',
  players: [
    { id: 1, seat: 1, x: 2, y: 5, face: 0, alive: true, lives: 3, protect: 0 },
    { id: 2, seat: 2, x: 4, y: 5, face: 3, alive: true, lives: 3, protect: 1 },
  ],
  enemies: [
    { id: 3, type: 'hopper', x: 5, y: 3, face: 1, visible: true },
    { id: 4, type: 'stalker', x: 8, y: 6, face: 2, visible: true },
    { id: 5, type: 'skitter', x: 13, y: 8, face: 3, visible: true },
  ],
  bolts: [{ id: 6, x: 6, y: 6, dir: 0, hostile: false }],
  posts: [{ id: 7, x: 5, y: 5, cooldown: 0, ring: 1 }],
  familiar: { id: 8, x: 7, y: 9, face: 2 },
  wizard: { id: 9, x: 10, y: 9, state: 'active', face: 1 },
  events: [],
};
g.start({
  view: 'topdown',
  camera: { zoom: false },
  update(dt) {
    renderer.update(s, dt);
    renderer.frame(s);
  },
  draw(r) {
    renderer.draw(s, r);
  },
});
g.advance(0.2, { draw: true });
if (g.errors.length) throw Error(JSON.stringify(g.errors));
g.dispose();
console.log('Native renderer smoke passed');
