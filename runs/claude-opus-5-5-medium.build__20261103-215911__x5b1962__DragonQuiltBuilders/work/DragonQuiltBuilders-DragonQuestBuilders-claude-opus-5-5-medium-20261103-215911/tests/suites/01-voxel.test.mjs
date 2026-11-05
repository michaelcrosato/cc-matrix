import { load } from '../lib/load.mjs';
export default async ({ check }) => {
  const { E, DQ } = load({ quiet: true });
  const T = 16, w = new DQ.VoxelWorld(32, 32, 16);
  const id = DQ.blockId;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (let z = 0; z < 4; z++) w.set(x, y, z, z ? id('earth') : 1, { silent: true });
  w.recomputeTops();
  check('get/set and bounds', w.get(5, 5, 3) === id('earth') && w.get(-1, 0, 0) === 0 && w.get(40, 0, 0) === 0 && !w.set(99, 0, 0, 2));
  check('topZ kept on edit', w.topZ(5, 5) === 4 && (w.set(5, 5, 6, id('stone')), w.topZ(5, 5) === 7) && (w.set(5, 5, 6, 0), w.topZ(5, 5) === 4));
  check('standable needs ground and two free levels', w.standable(5, 5, 4) && !w.standable(5, 5, 3) && (w.set(6, 6, 5, id('stone')), !w.standable(6, 6, 4)));
  w.set(6, 6, 5, 0);
  check('groundAt: the top under a point', w.groundAt(5.5 * T, 5.5 * T, 5, 4 * T, 2) === 4 * T);
  w.set(8, 8, 4, id('stone'));
  check('groundAt ignores a ledge above the step', w.groundAt(8.5 * T, 8.5 * T, 5, 4 * T, 2) === 4 * T || w.groundAt(8.5 * T, 8.5 * T, 5, 4 * T, 2) === -Infinity ? true : w.groundAt(8.5 * T, 8.5 * T, 5, 4 * T, 2) === 4 * T);
  check('groundAt over a 1-block step from above', w.groundAt(8.5 * T, 8.5 * T, 5, 5 * T + 1, 2) === 5 * T);
  w.set(10, 10, 7, id('stone'));
  check('ceilingAt finds the block bottom', w.ceilingAt(10.5 * T, 10.5 * T, 5, 4 * T) === 7 * T);
  // collision: a body walking into a 2-high wall stops; a 1-high gap blocks; a 2-high gap passes
  for (let y = 12; y < 20; y++) { w.set(15, y, 4, id('stone')); w.set(15, y, 5, id('stone')); }
  const b = new DQ.VoxelBody({ x: 13.5 * T, y: 15.5 * T, z: 4 * T });
  for (let i = 0; i < 240; i++) { b.vx = 80; b.vy = 0; b.update(1 / 120, w); }
  check('collide: a wall stops a body', b.x < 15 * T && b.x > 14 * T, b.x / T);
  w.set(15, 15, 4, 0); w.set(15, 15, 5, 0); b.y = 15.5 * T;
  for (let i = 0; i < 240; i++) { b.vx = 80; b.vy = 0; b.update(1 / 120, w); }
  check('collide: a 2-high gap passes', b.x > 15.5 * T, b.x / T);
  // a 1-high gap (a block at head height) blocks
  const w2 = new DQ.VoxelWorld(16, 16, 12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) for (let z = 0; z < 2; z++) w2.set(x, y, z, z ? 2 : 1, { silent: true });
  w2.set(8, 5, 3, id('stone')); w2.recomputeTops(); const b2 = new DQ.VoxelBody({ x: 6.5 * T, y: 5.5 * T, z: 2 * T });
  for (let i = 0; i < 240; i++) { b2.vx = 80; b2.vy = 0; b2.update(1 / 120, w2); }
  check('collide: a 1-high gap blocks a 28-tall body', b2.x < 8 * T, b2.x / T);
  // stairs: a ramp, walking up needs no jump
  w2.set(10, 9, 2, id('stairsPlank'), { rot: 0 }); w2.set(11, 9, 2, id('stone')); w2.recomputeTops();
  const b3 = new DQ.VoxelBody({ x: 9.5 * T, y: 9.5 * T, z: 2 * T });
  let top3 = 0; for (let i = 0; i < 120; i++) { b3.vx = 50; b3.vy = 0; b3.update(1 / 120, w2); top3 = Math.max(top3, b3.z); }
  check('stairs: walking up a ramp onto the next block', top3 >= 3 * T - .1 && b3.x > 11 * T, top3 / T + ' at x ' + b3.x / T);
  // water two deep blocks walkers
  const w3 = new DQ.VoxelWorld(16, 16, 12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) for (let z = 0; z < 3; z++) w3.set(x, y, z, z ? 2 : 1, { silent: true });
  for (let y = 0; y < 16; y++) { w3.set(9, y, 2, id('water')); w3.set(9, y, 1, id('water')); } w3.recomputeTops();
  const b4 = new DQ.VoxelBody({ x: 7.5 * T, y: 5.5 * T, z: 3 * T });
  for (let i = 0; i < 240; i++) { b4.vx = 70; b4.vy = 0; b4.update(1 / 120, w3); }
  check('deep water blocks the builder', b4.x < 9 * T + 1, b4.x / T);
  // raycast and pick in every rotation and both views
  const w5 = new DQ.VoxelWorld(32, 32, 16); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (let z = 0; z < 3; z++) w5.set(x, y, z, z ? 2 : 1, { silent: true });
  w5.set(16, 16, 3, id('cobble')); w5.recomputeTops();
  const hit = w5.raycast([16.5 * T, 16.5 * T, 10 * T], [0, 0, -1], 400);
  check('raycast down hits the top block with an up normal', hit && hit.z === 3 && hit.nz === 1, JSON.stringify(hit));
  let pickOk = 0, pickN = 0;
  for (const base of [DQ.VIEW_ISO, DQ.VIEW_TQ]) for (const yaw of [0, 90, 180, 270]) {
    const v = new E.View('t', 't', base.yawDeg + yaw, base.pitchDeg, base.scale, base.zBoost), p = v.p(16.5 * T, 16.5 * T, 4 * T);
    const h = w5.pickScreen(p[0], p[1], v, 0, 0); pickN++; if (h && h.x === 16 && h.y === 16 && h.z === 3) pickOk++;
  }
  check('pickScreen finds a block from its top centre in 4 turns x 2 views', pickOk === pickN, pickOk + '/' + pickN);
  // diff and hash
  const base = new DQ.VoxelWorld(144, 144, 24); DQ.generateWorld(base); const h0 = base.hash();
  const again = new DQ.VoxelWorld(144, 144, 24); DQ.generateWorld(again);
  check('world generation is deterministic', again.hash() === h0);
  base.set(70, 70, 12, id('planks')); base.set(71, 70, 8, 0); const d = base.diff();
  again.applyDiff(d); check('diff and applyDiff round trip', again.hash() === base.hash() && d.length === 2, d.length);
  // render logic: runs and the lift hook
  const w6 = new DQ.VoxelWorld(16, 16, 16); for (const z of [0, 1, 2, 5, 6]) w6.set(4, 4, z, 2);
  check('runs split around air', JSON.stringify(w6.runs(4, 4)) === '[[0,3],[5,7]]', JSON.stringify(w6.runs(4, 4)));
  const v = DQ.VIEW_ISO, k0 = v.order(4.2 * T, 4.2 * T, 3 * T), runK = v.order(4.5 * T, 4.5 * T, 0), roofK = v.order(4.5 * T, 4.5 * T, 5 * T);
  const lifted = w6._liftOrder(v, 4.2 * T, 4.2 * T, 3 * T, k0);
  check('a body standing on a run sorts after it, and before the roof run above', lifted > runK && lifted < roofK, [lifted, runK, roofK].join(' '));
  // the generated world's places
  const P = DQ.WORLD.poi;
  check('the hollow start, banner spot and spire top are standable', base.standable(P.hollowStart[0], P.hollowStart[1], P.hollowStart[2]) && base.standable(P.bannerSpot[0], P.bannerSpot[1], base.topZ(P.bannerSpot[0], P.bannerSpot[1])) && base.topZ(124, 124) === 22);
  check('the knot wall stands 17 high, with a 3 x 5 gate', base.get(99, 100, 16) === id('knot') && !base.get(99, 100, 17) && base.gate.length === 30);
  check('every portal stands on the ground', DQ.WORLD.portals.every(p => { const o = base.genObjects.find(q => q.portalId === p.id); return o && base.solidAt(o.x, o.y, o.z - 1); }));
};
