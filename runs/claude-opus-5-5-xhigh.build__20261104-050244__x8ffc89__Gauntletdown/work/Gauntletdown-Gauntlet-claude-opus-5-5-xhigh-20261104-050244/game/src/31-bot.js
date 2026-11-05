/* ---- THE AUTOPILOT: intents from the world's state (the attract mode, the playthrough tests, Dev's "bot plays P1").
   Goals each 0.25 s: eat when hungry; fight what is near; break generators; keys and doors on the way; treasure; the
   stairs. Its own path search knows transporter pads. Stuck: it sidesteps, and (only with cheats) jumps ahead ---- */
function makeBot(o = {}) { return { t: 0, goal: 'stairs', path: null, wp: null, lastPos: null, stuckT: 0, side: 0, sideT: 0, cheat: !!o.cheat, target: null, jumps: 0 }; }
/** a breadth-first search over walkable cells from the hero's cell, with pads joined to their pairs */
function botSearch(h) {
  const M = W.map, w = M.w, hh = M.h, n = w * hh, dist = botSearch.d && botSearch.d.length === n ? botSearch.d : (botSearch.d = new Int32Array(n)), from = botSearch.f && botSearch.f.length === n ? botSearch.f : (botSearch.f = new Int32Array(n));
  dist.fill(-1); from.fill(-1);
  const ok = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < hh && !M.cell(cx, cy) && M.walkable(cx, cy), padAt = new Map(W.pads.map((p, i) => [p.cy * w + p.cx, i]));
  const start = cellOf(h.y) * w + cellOf(h.x); if (start < 0 || start >= n) return null;
  const q = [start]; dist[start] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], cx = i % w, cy = (i / w) | 0;
    const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]].filter(([x, y]) => ok(x, y)).map(([x, y]) => y * w + x);
    if (padAt.has(i)) { const p = W.pads[padAt.get(i) ^ 1]; if (p) nb.push(p.cy * w + p.cx); }
    for (const j of nb) if (dist[j] < 0) { dist[j] = dist[i] + 1; from[j] = i; q.push(j); }
  }
  return { dist, from, w, at: (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < hh ? dist[cy * w + cx] : -1 };
}
/** the cell path to a goal cell, start first */
function botPathTo(S, gx, gy) { const out = []; let i = gy * S.w + gx; if (S.dist[i] < 0) return null; while (i >= 0) { out.push([i % S.w, (i / S.w) | 0]); i = S.from[i]; } return out.reverse(); }
/** the nearest of a list of things by path ({ cx, cy } or x, y); near: also a cell beside it (doors, tables) */
function botNearest(S, list, adj) {
  let best = null, bd = 1e9;
  for (const q of list) {
    const cx = q.cx !== undefined ? q.cx : cellOf(q.x), cy = q.cy !== undefined ? q.cy : cellOf(q.y);
    const cands = adj ? [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] : [[cx, cy]];
    for (const [x, y] of cands) { const d = S.at(x, y); if (d >= 0 && d < bd) { bd = d; best = { q, cx: x, cy: y, d }; } }
  }
  return best;
}
function botIntent(h, dt) {
  const B = h.bot, I = h.intent;
  if (!h.alive) { idleIntent(h); if (B.cheat || W.role === 'attract' || h.deadT > 1.5) rise(h); return; }
  B.t -= dt; B.sideT = Math.max(0, B.sideT - dt);
  if (B.t <= 0) { B.t = .25; botThink(h, B); }
  // stuck: under 8 units of progress in 3 s
  B.stuckT += dt;
  if (B.stuckT >= 3) { const p = B.lastPos; if (p && Math.hypot(h.x - p[0], h.y - p[1]) < 8 && B.goal !== 'fight' && B.goal !== 'hold') { B.side = B.side ? -B.side : 1; B.sideT = .6; B.jumps++; if (B.cheat && B.jumps > 1 && B.path && B.path.length > 3) { const [cx, cy] = B.path[Math.min(4, B.path.length - 1)]; h.x = mid(cx); h.y = mid(cy); B.jumps = 0; } } else B.jumps = 0; B.lastPos = [h.x, h.y]; B.stuckT = 0; }
  // walk the path: the farthest of the next few cells in a straight line
  let mx = 0, my = 0;
  if (B.wp) { const dx = B.wp[0] - h.x, dy = B.wp[1] - h.y, d = Math.hypot(dx, dy); if (d > 2) { mx = dx / d; my = dy / d; } }
  if (B.goal === 'hold') mx = my = 0;
  if (B.sideT > 0) { const a = Math.atan2(my, mx) + B.side * Math.PI / 2; mx = Math.cos(a); my = Math.sin(a); }
  if (B.kite && B.target) { const a = angTo(B.target, h); mx = mx * .3 + Math.cos(a) * .9; my = my * .3 + Math.sin(a) * .9; }
  I.move = [mx, my]; I.plant = false;
  const t = B.target && !B.target.dead ? B.target : null;
  I.aim = t ? Math.atan2(t.y - h.y, t.x - h.x) : null; I.fire = !!t;
  if (B.magic) { I.magic = true; B.magic = false; }
}
function botThink(h, B) {
  const S = botSearch(h); if (!S) return;
  const hp = h.hp, live = W.monsters.filter(m => !m.dead && !m.rise && !(m.ai === 'fryar' && m.hidden)), sees = q => shotClear(h, q);
  let goal = null, why = '';
  // fight: the nearest monster within 7 tiles in sight (not the Tithe: it can't be shot; flee it instead)
  let foe = null, fd = 7 * T;
  for (const m of live) { if (m.D.immune) continue; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < fd && sees(m)) { fd = d; foe = m; } }
  let gen = null, gd = 10 * T; for (const g of W.gens) { if (g.dead) continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < gd && sees(g)) { gd = d; gen = g; } }
  const K = W.boss && !W.boss.dead && W.boss.phase > 0 ? W.boss : null;
  const platter = K && K.state === 'eat' && K.eating ? K.eating : null;
  const kingFirst = K && sees(K) && Math.hypot(K.x - h.x, K.y - h.y) < 190 && !(foe && fd < 2.5 * T);
  B.target = platter || (kingFirst ? K : null) || foe || (K && sees(K) ? K : null) || gen || null;
  B.kite = !!foe && fd < 3.2 * T && (h.cls === 'ranger' || h.cls === 'hexer') && !foe.D.fly;
  const onScreen = live.filter(m => Math.abs(m.x - h.x) < 12 * T && Math.abs(m.y - h.y) < 8 * T).length;
  if ((onScreen >= 12 || (K && K.phase >= 2 && (onScreen >= 6 || K.phase === 3))) && (h.flasks > 0 || W.role === 'attract') && (B.magicT = (B.magicT || 0) - .25) <= 0) { B.magic = true; B.magicT = 3; }
  const tithe = live.find(m => m.ai === 'tithe' && near(m, h, 40));
  if (tithe && h.flasks > 0) { B.magic = true; }
  // where to walk
  const items = W.items.filter(i => !i.gone && !i.pending);
  const food = items.filter(i => i.D.kind === 'food' && i.type !== 'platter');
  const gauntlet = items.find(i => i.type === 'gauntlet');
  if (gauntlet) { goal = botNearest(S, [gauntlet]); why = 'the gauntlet'; }
  // a party of bots on one screen keeps together: the first leads, the others follow when they drift
  const lead = W.heroes.find(q => q.alive && q.bot && !q.remote);
  if (!goal && lead && lead !== h && W.role !== 'host' && Math.hypot(lead.x - h.x, lead.y - h.y) > (W.leash ? Math.min(6 * T, W.leash[0] * .4) : 6 * T)) { goal = botNearest(S, [lead]); if (goal) why = 'follow'; }
  if (!goal && (hp < 250 || hp < 450 && W.F.no >= 4)) { const f = botNearest(S, food); if (f && f.d <= (hp < 250 ? 40 : 14)) { goal = f; why = 'eat'; } }
  const reach = lead && lead !== h ? 6 : 14;
  if (!goal && (h.keys < 9 || h.flasks < 9)) { const pick = botNearest(S, items.filter(i => (i.type === 'flask' && h.flasks < 3) || i.D.kind === 'special' || i.D.kind === 'amulet' && !h.amulet)); if (pick && pick.d <= reach) { goal = pick; why = 'potion'; } }
  const stairs = W.stairs.filter(s => !s.to), anyStairs = botNearest(S, stairs.length ? stairs : W.stairs);
  if (!goal && W.treasure) { const tr = botNearest(S, items.filter(i => ['treasure', 'chest'].includes(i.D.kind) && !(i.D.locked && h.keys === 0))); if (tr && W.treasure.t > 3) { goal = tr; why = 'hoard'; } }
  if (!goal && W.F.boss) { if (K) { goal = kingSpot(S, K, h); why = 'the King'; } else if (W.boss && !W.boss.dead) { goal = botNearest(S, [{ x: W.boss.x, y: W.boss.y + 60 }]); why = 'wake the King'; } }
  if (!goal && !anyStairs && !W.F.boss) {
    // the stairs are behind something: a door (with a key), a key, a plate, a pad
    const closed = W.doors.filter(d => !d.open), doorGoal = h.keys > 0 || CHEATS.infinite ? botNearest(S, closed.flatMap(d => d.cells.map(([cx, cy]) => ({ cx, cy }))), true) : null;
    if (doorGoal) { goal = doorGoal; goal.push = [doorGoal.q.cx, doorGoal.q.cy]; why = 'open a door'; }
    else { const k = botNearest(S, items.filter(i => i.type === 'key')); if (k) { goal = k; why = 'fetch a key'; } }
    if (!goal) { const p = botNearest(S, W.plates.filter(p => !p.used)); if (p) { goal = p; why = 'a plate'; } }
    if (!goal) { const ck = botNearest(S, [...W.cracked.keys()].map(k => { const [cx, cy] = k.split(',').map(Number); return { cx, cy }; }), true); if (ck) { goal = ck; B.target = { x: mid(ck.q.cx), y: mid(ck.q.cy), dead: false }; why = 'break a wall'; } }
  }
  if (!goal && W.impatience < 2) { const tr = botNearest(S, items.filter(i => ['treasure', 'chest'].includes(i.D.kind) && !(i.D.locked && h.keys === 0) || i.type === 'key' && h.keys < 2)); if (tr && tr.d <= 10) { goal = tr; why = 'treasure'; } }
  if (!goal && gen && gd < 7 * T) { goal = null; why = 'break the generator'; B.wp = null; }
  if (!goal && anyStairs) { goal = anyStairs; why = 'the stairs'; }
  if (!goal) { const any = botNearest(S, items.filter(i => i.D.kind !== 'stew')); if (any) { goal = any; why = 'look around'; } }
  B.goal = why || 'hold';
  if (!goal) { B.wp = null; B.path = null; if (!why) B.goal = 'hold'; return; }
  const path = botPathTo(S, goal.cx, goal.cy); B.path = path;
  if (!path || path.length < 2) { B.wp = goal.push ? [mid(goal.push[0]), mid(goal.push[1])] : [mid(goal.cx), mid(goal.cy)]; if (goal.q && goal.q.x !== undefined && !goal.push) B.wp = [goal.q.x, goal.q.y]; return; }
  // the farthest of the next cells it can walk straight to (a padded path stays a cell at a time)
  let k = 1; for (let j = Math.min(path.length - 1, 4); j > 1; j--) { const [cx, cy] = path[j]; if (Math.abs(cx - path[j - 1][0]) + Math.abs(cy - path[j - 1][1]) > 1) continue; if (W.map.los(h.x, h.y, mid(cx), mid(cy)) && clearLine(h, mid(cx), mid(cy))) { k = j; break; } }
  B.wp = [mid(path[k][0]), mid(path[k][1])];
}
/** is the straight walk free of walls for a body's width (both sides of the line)? */
function clearLine(h, x, y) { const a = Math.atan2(y - h.y, x - h.x), ox = -Math.sin(a) * h.r, oy = Math.cos(a) * h.r; return W.map.los(h.x + ox, h.y + oy, x + ox, y + oy) && W.map.los(h.x - ox, h.y - oy, x - ox, y - oy); }

/** a shot from a to b at throwing height clears every top on the way (low tables don't stop it) */
function shotClear(a, b, z = 12) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), n = Math.ceil(d / 4);
  for (let i = 1; i < n; i++) { const x = a.x + dx * i / n, y = a.y + dy * i / n; if (W.map.heightAt(x, y) > z) return false; }
  return true;
}
/** where to stand against the King: a reachable cell 4-7 tiles away with a clear shot, nearest first */
function kingSpot(S, K, h) {
  const kx = cellOf(K.x), ky = cellOf(K.y); let best = null, bd = 1e9;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const r = Math.hypot(dx, dy); if (r < 4 || r > 7) continue;
    const cx = kx + dx, cy = ky + dy, d = S.at(cx, cy); if (d < 0 || d >= bd) continue;
    if (!shotClear({ x: mid(cx), y: mid(cy) }, K)) continue;
    bd = d; best = { cx, cy, d };
  }
  return best || { cx: kx, cy: ky + 5, d: 0 };
}
