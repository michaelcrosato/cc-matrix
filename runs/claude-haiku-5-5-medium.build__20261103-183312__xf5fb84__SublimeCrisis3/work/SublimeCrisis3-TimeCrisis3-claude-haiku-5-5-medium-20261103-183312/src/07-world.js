// 07-world.js: the stage builder. A stage's scenes are written in relative coordinates (dx from the area's base, y across),
// and this turns them into the world: the ground, one cover wall per player slot, a wall in front of every nest, the
// crates and barrels, and the bonus targets, all in absolute world units (plan 4.10).
//
// A world box is { id, b: [x0, y0, z0, x1, y1, z1], mat, solid, hp?, cover?, deco? }. Solid boxes stop shots and are
// drawn; non-solid boxes (the ground, the water) are drawn only.
TC.AREA_SPACING = 380;   // u between the bases of two areas
TC.AREA_LEAD = 40;       // u from the stage origin to the first area's base

TC.buildStage = function (sim, def) {
  const world = { boxes: [], barrels: [], scenes: [], id: def.id, env: def.env || {} };
  let nextId = 1;
  const add = (b, mat, o = {}) => {
    const box = { id: nextId++, b, mat, solid: o.solid !== false, hp: o.hp || 0, cover: !!o.cover, deco: o.deco || null, nest: o.nest || null };
    world.boxes.push(box);
    return box;
  };
  const n = sim.nPlayers;
  def.scenes.forEach((sc, i) => {
    const base = TC.AREA_LEAD + i * TC.AREA_SPACING;
    const ex = TC.EXTRAS[sc.id] || {};
    const abs = pt => [base + pt[0], pt[1], pt[2] === undefined ? 0 : pt[2]];
    const scene = Object.assign({}, sc, {
      index: i, base, final: !!sc.boss,
      nests: (sc.nests || []).concat(ex.nests || []).map(nst => Object.assign({}, nst, { x: base + nst.dx, y: nst.y, wall: null })),
      ride: sc.ride || ex.ride || null,
      bonus: (sc.bonus || []).map(bn => ({ kind: bn.kind, intel: bn.intel || null, at: abs(bn.at) })),
      waves: (sc.waves || []).concat(ex.waves || []).map(w => ({ when: w.when, spawn: w.spawn.map(([type, nest, extra]) => [type, nest, absExtra(extra, base)]) })),
    });
    // The ground of the area (and the water, where the stage has it).
    const gx0 = base - 60, gx1 = base + TC.AREA_SPACING - 20;
    add([gx0, -260, -2, gx1, 260, 0], def.ground || 'asphalt', { solid: false, deco: 'ground' });
    if (def.env && def.env.water !== undefined) add([gx0, -260, def.env.water - 6, gx1, 260, def.env.water], 'water', { solid: false, deco: 'water' });
    // One cover wall per player slot, a step in front of the camera: standing eyes see over it, crouched eyes do not.
    for (let k = 0; k < n; k++) {
      const y = (k - (n - 1) / 2) * TC.SLOT_GAP;
      const wall = add([base + 12, y - 12, 0, base + 16, y + 12, 16], 'sandbag', { cover: true, deco: 'slot' + k });
      Object.assign(wall, { slot: k, yc: y, scene: i });
    }
    // The wall in front of every nest: the enemy stands behind it, out of sight when it crouches.
    for (const nst of scene.nests) {
      const w = add([nst.x - 7, nst.y - 9, 0, nst.x - 3, nst.y + 9, 22], nst.mat || 'concrete', { cover: true, nest: nst.id });
      nst.wall = 'w' + w.id;
      nst.wallBox = w.id;
      if (nst.post) add([nst.x - 9, nst.y - 11, 0, nst.x - 7, nst.y - 9, 30], 'steel', { deco: 'post' });
    }
    // Props: crates (breakable), barrels (explosive), and plain boxes for the set.
    for (const pr of sc.props || []) {
      const x = base + pr.dx, y = pr.y;
      if (pr.kind === 'crate') add([x - 7, y - 7, 0, x + 7, y + 7, 14], 'crate', { hp: pr.hp || 3, cover: true });
      else if (pr.kind === 'barrel') {
        const b = [x - 4, y - 4, 0, x + 4, y + 4, 14];
        add(b, 'barrel', { hp: 0 });
        world.barrels.push({ id: nextId++, b, x, y, z: 7, hp: 2, gone: false, fuse: undefined });
      } else if (pr.kind === 'box') {
        add([x + (pr.x0 || 0), y + (pr.y0 || 0), pr.z0 || 0, x + (pr.x1 || 0), y + (pr.y1 || 0), pr.z1 || 20], pr.mat || 'concrete', { cover: !!pr.cover, solid: pr.solid !== false });
      }
    }
    if (sc.decorate) sc.decorate({ add, base, n, world, scene });
    world.scenes.push(scene);
  });
  return world;
};

// Turn a wave's spawn extras from relative to absolute coordinates (routes and starting points).
function absExtra(extra, base) {
  if (!extra) return {};
  const out = Object.assign({}, extra);
  if (extra.route) out.route = extra.route.map(p => [base + p[0], p[1]]);
  if (extra.from) out.from = [base + extra.from[0], extra.from[1]];
  if (extra.at) out.at = [base + extra.at[0], extra.at[1]];
  return out;
}

// The stage registry entry. Each stage's data is in its own fragment; a stage is built per Sim.
TC.stageFor = function (id) {
  return TC.get('stage', id);
};
