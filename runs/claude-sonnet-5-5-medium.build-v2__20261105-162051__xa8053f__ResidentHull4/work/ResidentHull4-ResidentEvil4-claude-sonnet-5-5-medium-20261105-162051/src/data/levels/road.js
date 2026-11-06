// CLAIM 2 begins: the Salt Road in the rain, a roadblock, a bridge, a rowboat shop, then the cannery door.
import { TANNOY_LINES } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { cp, nearXZ, inCells, hintUntil, alive, waitAllDead, shake } from '../../game/kit.js';
import { app } from '../../core/app.js';

function* road(a) {
  a.setObjective('FOLLOW THE SALT ROAD TO THE CANNERY'); a.autosave();
  // roadblock at the first clearing
  const [rx, rz] = cp(a, 10, 50);
  const block = [];
  for (let i = 0; i < 6; i++) block.push(a.spawn('gaffer', rx + (i % 3) * 2 - 2, rz - 2 - Math.floor(i / 3) * 2, { work: true, state: S.WORK, group: 'roadblock' }));
  const wagon = a.spawn('bottler', rx + 3, rz - 5, { work: true, state: S.WORK, group: 'roadblock' }); wagon.stationary = true; block.push(wagon);
  for (const [bx, bz] of [[rx - 3, rz - 1], [rx + 4, rz - 3], [rx, rz - 4]]) a.addBrineBarrel(bx, bz);
  while (!nearXZ(a, rx, rz, 11)) yield 0.25;
  a.showHint('BRINE BARRELS EXPLODE. SHOOT ONE WHEN THEY BUNCH UP', 8);
  yield* waitAllDead(block, 240);
  a.hintT = 0;
  // alcove ambush
  const [ax, az] = cp(a, 2, 38);
  a.scripts.start(function* () { while (!nearXZ(a, ax, az, 3)) yield 0.4; for (let i = 0; i < 3; i++) a.spawn('gaffer', ax + 4 + i, az - 1 + i, { state: S.APPROACH }); }, 'alcove');
  // the bridge: bottlers on ledges ahead, unreachable
  const [bx, bz] = cp(a, 10, 30);
  const ledges = [cp(a, 5, 21), cp(a, 16, 13), cp(a, 5, 20)];
  const bots = ledges.map(([x, z], i) => { const e = a.spawn('bottler', x, z, { work: false, state: S.APPROACH }); e.stationary = true; e.speedBase = 0; e.elev = 1.0; return e; });
  while (!nearXZ(a, bx, bz + 6, 8)) yield 0.4;
  a.showHint('BOTTLERS ON THE LEDGES. SHOOT THE BOTTLES. KICK ENEMIES OFF THE EDGE', 9);
  while (!nearXZ(a, bx, bz - 8, 4)) yield 0.4;
  // north clearing: Fathom in a beached rowboat, four deckhands, a far Tannoy
  const [nx, nz] = cp(a, 10, 18);
  const dk = []; for (let i = 0; i < 4; i++) dk.push(a.spawn('runner', nx - 4 + i * 2.5, nz - 3, { work: true, state: S.WORK, group: 'deck' }));
  while (!nearXZ(a, nx, nz, 7)) yield 0.4;
  a.showHint('DECKHANDS RUN. THEY THROW OFF YOUR AIM. BACK UP AND SHOOT', 8);
  yield* waitAllDead(dk, 240);
  a.hintT = 0;
  const [dx, dz] = cp(a, 10, 1);
  while (!nearXZ(a, dx, dz, 3)) yield 0.4;
  yield* a.finishArea({ next: 'cannery', claim: false });
}
export const roadDef = {
  id: 'road', name: 'THE SALT ROAD', mapId: 'road', mood: 'rain', music: 'explore', chapter: 1, startYaw: 0,
  theme: { floors: { ',': 'dirt', '.': 'cobbles', '=': 'planks' }, walls: { '#': 'dry-stone' } },
  tannoyLines: TANNOY_LINES.slice(6, 8), dress: ['barrel', 'crate', 'sack', 'reeds', 'bucket'],
  lamps: [[0, 30], [0, 10], [0, -10], [-3, 27]], scripts: [road], backdropKinds: ['sea-stack'],
  botPlan(a) {
    const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o });
    return [P(10, 55), P(10, 48), P(10, 36), P(10, 34), P(10, 24), P(10, 20), P(6, 16, { r: 2, shop: true }), P(10, 12), P(10, 4), P(10, 1, { r: 1.5 })];
  },
};
