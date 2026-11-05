// Intents: what drives a hero each step. A human player's input and the autopilot both produce the same shape:
// { move: [x, y], aim: angle or null, fire, magic, plant }. Attract mode and the tests use the autopilot.

// From a player's input (keyboard, mouse or pad).
function intentFromInput(p, h) {
  const m = p.move();
  let aim = null;
  if (p.padAim && Math.hypot(p.padAim[0], p.padAim[1]) > .45) {
    const v = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(p.padAim[0], p.padAim[1]) : p.padAim;
    aim = Math.atan2(v[1], v[0]);
  } else if (p.aimSource === 'mouse') {
    const mg = game.mouseGround && game.mouseGround();
    if (mg) { const gx = Array.isArray(mg) ? mg[0] : mg.x, gy = Array.isArray(mg) ? mg[1] : mg.y; aim = Math.atan2(gy - h.body.y, gx - h.body.x); }
  }
  // aim assist: a shot snaps to the nearest monster or generator inside the cone (8 or 16 degrees) and 200 units
  if (aim != null && prefs.aim !== 'off' && p.down('fire')) {
    const cone = (prefs.aim === 'high' ? 16 : 8) * Math.PI / 180;
    let best = null, bd = 200;
    for (const t of [...WORLD.monsters.filter(m => m.alive), ...WORLD.gens.filter(g => g.alive)]) {
      const d = Math.hypot(t.x - h.body.x, t.y - h.body.y);
      if (d < bd && Math.abs(angleDiff(aim, Math.atan2(t.y - h.body.y, t.x - h.body.x))) < cone) { bd = d; best = t; }
    }
    if (best) aim = Math.atan2(best.y - h.body.y, best.x - h.body.x);
  }
  return { move: [m[0], m[1]], aim, fire: p.down('fire'), magic: p.pressed('magic'), plant: p.down('plant') };
}

// The autopilot: picks a goal every half second and walks there on a flow field. Goals in order: food when weak, a
// generator in reach, a food or treasure item, the stairs if they can be reached, and otherwise a cell beside a closed
// door when it holds a key (a closed door is a wall to the field, so the bot must stand beside it to open it).
function botIntent(h, t) {
  const W = WORLD, map = W.map, F = W.F;
  const B = h.bot || (h.bot = { t: -1, goal: null, flow: new E.FlowField(map), reach: new E.FlowField(map) });
  if (t - B.t > .5 || !B.goal) {
    B.t = t;
    B.reach.update(h.body.x, h.body.y);
    const cellOf = (x, y) => Math.floor(x / T) + Math.floor(y / T) * map.w;
    const reachable = (x, y) => { const d = B.reach.d[cellOf(x, y)]; return d !== undefined && d < 1e9; };
    const dist = (x, y) => Math.hypot(x - h.body.x, y - h.body.y);
    let goal = null, best = Infinity;
    const want = (x, y, d) => { if (d < best) { best = d; goal = { x, y }; } };
    if (h.hp < 350) for (const it of W.items) if (it.alive && (it.ch === 'f' || it.ch === 'b' || it.ch === 'j') && reachable(it.x, it.y)) want(it.x, it.y, dist(it.x, it.y) * .6);
    for (const g of W.gens) if (g.alive && reachable(g.x, g.y)) want(g.x, g.y, dist(g.x, g.y) * 1.1);
    const full = it => (it.def.key && h.keys >= 9) || (it.def.flask && h.flasks >= 9);   // (a full pack leaves it on the floor)
    for (const it of W.items) if (it.alive && !it.def.shootable && !full(it) && reachable(it.x, it.y)) want(it.x, it.y, dist(it.x, it.y) * .9);
    const stairs = { x: (F.stairs[0] + .5) * T, y: (F.stairs[1] + .5) * T };
    if (!goal && reachable(stairs.x, stairs.y)) goal = stairs;
    if (!goal && h.keys > 0) {
      // the nearest reachable cell beside a closed door
      for (const d of W.doors) {
        if (d.open) continue;
        for (const [x, y] of d.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
          const cx = (nx + .5) * T, cy = (ny + .5) * T;
          if (reachable(cx, cy) && dist(cx, cy) < best) { best = dist(cx, cy); goal = { x: cx, y: cy }; }
        }
      }
    }
    if (W.boss && W.boss.alive) goal = { x: W.boss.x, y: W.boss.y };   // the King is the goal on the banquet floor
    const gauntlet = W.items.find(i => i.ch === 'G' && i.alive);
    if (gauntlet) goal = { x: gauntlet.x, y: gauntlet.y };   // then the Iron Gauntlet
    if (!goal) goal = stairs;
    B.goal = goal; B.flow.update(goal.x, goal.y);
  }
  const dir = B.flow.dir(h.body.x, h.body.y, B.goal.x, B.goal.y);
  const dd = Math.hypot(B.goal.x - h.body.x, B.goal.y - h.body.y);
  let target = null, td = 150;
  for (const m of W.monsters) if (m.alive) { const d = Math.hypot(m.x - h.body.x, m.y - h.body.y); if (d < td) { td = d; target = m; } }
  for (const g of W.gens) if (g.alive) { const d = Math.hypot(g.x - h.body.x, g.y - h.body.y); if (d < td) { td = d; target = g; } }
  if (W.boss && W.boss.alive) { const d = Math.hypot(W.boss.x - h.body.x, W.boss.y - h.body.y); if (d < 260) { td = d; target = W.boss; } }
  const aim = target ? Math.atan2(target.y - h.body.y, target.x - h.body.x) : null;
  const near = dd < 6;
  return {
    move: near && !target ? [0, 0] : dir,
    aim,
    fire: !!target,
    magic: W.monsters.filter(m => m.alive).length >= 12 && (h.flasks > 0 || CHEATS.infinite || W.attract),
    plant: false
  };
}
