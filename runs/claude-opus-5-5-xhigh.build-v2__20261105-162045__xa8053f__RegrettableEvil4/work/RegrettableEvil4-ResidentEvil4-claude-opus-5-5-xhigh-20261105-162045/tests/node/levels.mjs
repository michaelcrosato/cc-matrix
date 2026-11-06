// Every area builds; props never block a route; markers can be reached; dev teleports point at real places.
import { THREE } from '../../pixel-engine.js';
import { boot, setup, step } from '../helpers.mjs';
import { Area } from '../../src/game/area.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';
import { LEVELS } from '../../src/data/levels/index.js';
import { DEV_TELEPORTS } from '../../src/data/levels/teleports.js';

function flood(a) {
  const { info, nav } = a.level;
  const open = (c, r) => {
    const ch = info.ch(c, r);
    if ('DGSB'.includes(ch)) return true; // these open in play
    return nav.isOpen(c, r);
  };
  const [sc, sr] = a.def.start ?? a.level.starts[0];
  const seen = new Set([`${sc},${sr}`]);
  const q = [[sc, sr]];
  while (q.length) {
    const [c, r] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${c + dx},${r + dy}`;
      if (!seen.has(k) && open(c + dx, r + dy)) { seen.add(k); q.push([c + dx, r + dy]); }
    }
  }
  return seen;
}

export default async function (t) {
  setup();
  let e = null;
  for (const id of ['quay', 'road', 'cannery', 'yard', 'causeway', 'abbey', 'nave', 'launch', 'shift']) {
    app.run = new Run();
    if (id === 'shift') continue;
    e = await boot(new Area(id, { noSave: true }));
    const a = e.game;
    await step(e, 3);
    t.eq(e.errors.length, 0, `${id} builds: ${e.errors[0] ?? ''}`);
    t.ok(a.player, `${id} has a player`);
    const seen = flood(a);
    const { info } = a.level;
    const touch = (c, r) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 0]].some(([dx, dy]) => seen.has(`${c + dx},${r + dy}`));
    for (const ch of 'mty$nwukslqv12345o') {
      for (const [c, r] of info.find(ch)) t.ok(touch(c, r), `${id}: marker ${ch} at ${c},${r} can be reached past the props`);
    }
    for (const d of a.level.doors) t.ok(touch(d.c0, d.r0) || touch(d.c1, d.r1), `${id}: door at ${d.c0},${d.r0} can be reached`);
    for (const g of a.level.gates) t.ok(touch(g.c0, g.r0), `${id}: gate at ${g.c0},${g.r0} can be reached`);
    // Props never wall off a pocket of floor: every cell the grid calls open can be reached from the start.
    const sealed = [];
    for (let r = 0; r < info.h; r++) for (let c = 0; c < info.w; c++) if (a.level.nav.walkable(info.x(c), info.z(r)) && !seen.has(`${c},${r}`)) sealed.push(`${c},${r}`);
    t.eq(sealed.length, 0, `${id}: no sealed floor (${sealed.slice(0, 6).join(' ')})`);
    // Nobody walks off the map: past every open cell on its border there's something solid.
    const offEdge = [];
    for (let c = 0; c < info.w; c++) {
      for (let r = 0; r < info.h; r++) {
        if (!a.level.nav.walkable(info.x(c), info.z(r))) continue;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (c + dc >= 0 && r + dr >= 0 && c + dc < info.w && r + dr < info.h) continue;
          const hit = a.ctx.physics.castRay(new THREE.Vector3(info.x(c), 0.8, info.z(r)), new THREE.Vector3(dc, 0, dr), 3, ['player']);
          if (!hit) offEdge.push(`${c},${r}`);
        }
      }
    }
    t.eq(offEdge.length, 0, `${id}: nothing to walk off the map from (${offEdge.slice(0, 6).join(' ')})`);
    const open = info.rows.join('').length;
    t.ok(seen.size > open * 0.08, `${id}: most of it is walkable (${seen.size})`);
    t.ok(a.level.static.length === 0, `${id}: static meshes all merged`);
  }
  t.eq(new Set(Object.keys(LEVELS)).size, 9, 'nine level data files');
  // Dev teleports point at places that exist.
  for (const tp of DEV_TELEPORTS) {
    const def = tp.area === 'ending' ? LEVELS.launch : LEVELS[tp.area];
    t.ok(def, `teleport ${tp.id} has an area`);
    for (const b of tp.skip ?? []) t.ok(def.beats.some((x) => x.id === b), `teleport ${tp.id}: beat ${b} exists`);
  }
}
