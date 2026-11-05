// ---- the bot: a potential-field contestant (attract mode, tests, the dev bot partner, autopilot) ----
// It returns the same intent a player's input gives; it may cheat (god mode etc.) through its contestant's flags.
const BOT = MT.bot = {};
BOT.intent = (world, c, dt) => {
  const o = c.botOpts || {}, it = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'bot' };
  let fx = 0, fy = 0;
  const add = (x, y, k) => { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || .01; fx += dx / d * k; fy += dy / d * k; };
  // enemies push it away (harder up close), bullets ahead of time, landing tomatoes, hazards
  let near = null, nd = 1e9, crowd60 = 0, crowd120 = 0;
  for (const e of world.enemies) {
    if (e.dead || ENEMIES[e.kind].harmless) continue;
    const d = dist(e, c); if (d < 60) crowd60++; if (d < 120) crowd120++;
    if (!e.entering && !e.leap && d < nd && (ENEMIES[e.kind].counted || e.kind === 'mime' || e.kind === 'snakeSeg')) { nd = d; near = e; }
    const R = 70 + e.r * 2; if (d < R) add(e.x, e.y, -2.4 * (R - d) / R * (ENEMIES[e.kind].big ? 1.6 : 1));
  }
  for (const t of world.targets) if (!t.dead && t.kind !== 'cage') { const d = dist(t, c); if (d < nd && !near) { near = t; } }
  if (!near && world.targets.length) { let best = 1e9; for (const t of world.targets) if (!t.dead && t.kind !== 'cage') { const d = dist(t, c); if (d < best) { best = d; near = t; } } }
  let danger = false;
  for (const b of world.fShots.list) {
    const px2 = b.x + b.vx * .3, py2 = b.y + b.vy * .3, d = Math.hypot(px2 - c.x, py2 - c.y);
    if (d < 34) add(px2, py2, -2.2 * (34 - d) / 34);
    for (const tt of [.08, .16, .25]) if (Math.hypot(b.x + b.vx * tt - c.x, b.y + b.vy * tt - c.y) < c.r + b.r + 2) danger = true;
  }
  for (const L of world.lobs) { const d = Math.hypot(L.tx - c.x, L.ty - c.y); if (d < 26) add(L.tx, L.ty, -3 * (26 - d) / 26); }
  const py = world.arena.pyro(); if (py) for (const v of py.vents) if (v.state !== 'idle') { const d = dist(v, c); if (d < 30) add(v.x, v.y, -3 * (30 - d) / 30); }
  for (const d of world.decals) if (d.kind === 'splat') { const k = dist(d, c); if (k < d.r + 8) add(d.x, d.y, -1); }
  const boss = world.boss;
  if (boss && !boss.dead) {
    const hl = boss.hitList(); let bp = null, bd = 1e9;
    for (const q of hl) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; bp = q; } }
    const bx = boss.rs.x, by = boss.rs.y, d = Math.hypot(bx - c.x, by - c.y);
    if (d < 100) add(bx, by, -2.5 * (100 - d) / 100); else if (d > 150) add(bx, by, .6);
    if (bp && (!near || bd < nd + 40)) { near = { x: bp.x, y: bp.y, vx: 0, vy: 0 }; nd = bd; }
    if (boss.cones) for (const cn of boss.cones) if (cn) add(c.x + Math.cos(cn.a + 1.6) * 10, c.y + Math.sin(cn.a + 1.6) * 10, 1.2);
    if (boss.micX > -900 && boss.micT > 0) { const k = Math.hypot(boss.micX - c.x, boss.micY - c.y); if (k < 50) add(boss.micX, boss.micY, -3); }
  }
  // pickups pull it in (by value); the room's centre a little; the exit once the room is clear
  for (const p of world.pickups) {
    if (p.locked && p.locked()) continue;
    const K = PICKUPS[p.kind], d = dist(p, c), v = K.cashy ? K.cash / 1000 + .3 : p.kind === 'key' || p.kind === 'statue' ? 4 : 1.2;
    if (d < 160) add(p.x, p.y, Math.min(2.4, v) * (160 - d) / 160 * (world.phase === 'EXIT' || world.phase === 'BONUS' ? 2 : 1));
  }
  add(AR.CX, AR.CY, .25);
  for (const q of world.contestants) if (q !== c && q.alive) { const d = dist(q, c); if (d < 34) add(q.x + (q.slot - c.slot) * .01, q.y, -1.2 * (34 - d) / 34); }
  const wall = 26; if (c.x < AR.X0 + wall) fx += 1; if (c.x > AR.X1 - wall) fx -= 1; if (c.y < AR.Y0 + wall) fy += 1; if (c.y > AR.Y1 - wall) fy -= 1;
  if (world.phase === 'EXIT' && !world.exitPick) {
    const doors = DOOR_IDS.filter(d => world.arena.doors[d].state === 'exit');
    let want = doors[0];
    if (o.route) { const r = typeof o.route === 'function' ? o.route(world, doors) : o.route; if (Array.isArray(r)) want = r.find(d => doors.includes(d)) || want; else if (doors.includes(r)) want = r; }
    const pick = world.pickups.filter(p => dist(p, c) < 120 && (p.kind === 'key' || PICKUPS[p.kind].cashy)).length;
    if (want && (world.phaseT > 3 || !pick || o.rush)) { const D = DOORS[want]; fx = 0; fy = 0; add(D.x, D.y, 3); }
  }
  if (o.hold) { fx = 0; fy = 0; add(o.hold[0], o.hold[1], dist({ x: o.hold[0], y: o.hold[1] }, c) > 12 ? 2 : 0); }
  const l = Math.hypot(fx, fy); if (l > .05) it.move = [fx / l, fy / l]; else it.move = [0, 0];
  // aim at the nearest enemy, leading it; always fire
  if (o.human) {   // a stand-in for a person: it re-picks its target a few times a second, aims with error, never leads
    c._hT = (c._hT || 0) - (dt || 1 / 120);
    if (c._hT <= 0 || !c._hAim) { c._hT = .35 + RNG.ai() * .3; c._hAim = near ? { x: near.x, y: near.y } : null; c._hErr = (RNG.ai() - .5) * .7; c._hFire = !!near && nd < 190 && RNG.ai() < .85; }
    if (c._hAim) { it.aim = Math.atan2(c._hAim.y - c.y, c._hAim.x - c.x) + c._hErr; it.fire = c._hFire; }
    if (danger && RNG.ai() < .5) danger = false;
    it.move = [it.move[0] * .85, it.move[1] * .85];
  } else if (near) { const tl = Math.min(.5, nd / MT.T.bulletSpeed); const tx = near.x + (near.vx || 0) * tl, ty = near.y + (near.vy || 0) * tl; it.aim = Math.atan2(ty - c.y, tx - c.x); it.fire = true; }
  else if (world.phase === 'WAVES' || world.phase === 'BOSS') { it.aim = c.aim; it.fire = false; }
  if (o.noFire) { it.fire = false; it.bomb = false; }
  if (danger && c.slideCD <= 0) it.slide = true;
  if ((crowd120 >= 25 || (o.bombAt && world.time > o.bombAt && !c._bombed)) && (c.pr.bombs > 0 || c.infBombs || MT.cheats.infBombs)) { it.bomb = true; c._bombed = true; }
  if (crowd60 >= 3 && c.hp >= maxHpNow() && c.boatCD <= 0 && !danger && (o.boats !== false)) it.showboat = true;
  if (o.boatAt && world.time > o.boatAt && !c._boated) { it.showboat = true; c._boated = true; }
  if (o.noFire) it.bomb = false;
  return it;
};
