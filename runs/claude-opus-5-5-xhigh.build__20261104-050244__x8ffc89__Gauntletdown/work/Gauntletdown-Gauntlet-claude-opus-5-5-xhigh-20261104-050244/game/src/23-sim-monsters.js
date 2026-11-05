/* ---- MONSTERS: one multi-source flow field toward the nearest hero (engine change E1); each kind its own manners.
   Every attack winds up visibly (raised club, glowing mouth, a landing shadow, a pan drawn back) for at least 0.3 s ---- */
const ACTIVE_RANGE = 20 * T;

/** who a monster goes for: the Bell's victim, else the nearest hero it can track (Veil hides a hero unless adjacent) */
function targetOf(m, live) {
  const b = W.bell && W.bell.target && W.bell.target.alive ? W.bell.target : null;
  if (b && !veiled(b, m)) return { h: b, d: Math.hypot(b.x - m.x, b.y - m.y), bell: true };
  let best = null, bd = 1e9;
  for (const h of live) { if (veiled(h, m)) continue; const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; best = h; } }
  return best ? { h: best, d: bd } : null;
}
const veiled = (h, m) => h.amulet && h.amulet.type === 'veil' && Math.hypot(h.x - m.x, h.y - m.y) > h.r + m.r + 6;
const mSpeed = m => m.D.speed[m.rank - 1] * TUNE.monsterSpeed * (W.descent > 1 ? 1.08 : 1);
const mDmg = (m, list) => (list || m.D.dmg)[m.rank - 1];

function stepMonsters(dt) {
  const live = liveHeroes();
  if (W.bell) { stepBell(dt); if (W.bell.target && W.bell.target.alive) W.bellFlow.update(W.bell.target.x, W.bell.target.y); }
  const tracked = live.filter(h => !(h.amulet && h.amulet.type === 'veil'));
  if (tracked.length) W.flow.updateMany(tracked);
  for (const m of W.monsters) {
    if (m.dead) continue;
    m.hitT = Math.max(0, m.hitT - dt); m.t += dt;
    for (const k in m.grace) if ((m.grace[k] -= dt) <= 0) delete m.grace[k];
    if (m.rise > 0) { m.rise -= dt; m.vx = m.vy = 0; continue; }
    if (CHEATS.freeze) { m.vx = m.vy = 0; continue; }
    const tg = targetOf(m, live);
    if (m.asleep) { if (tg && tg.d < ACTIVE_RANGE) m.asleep = false; else { m.vx = m.vy = 0; continue; } }
    if (!tg || tg.d > ACTIVE_RANGE * 1.4) { wander(m, dt); move(m, dt); continue; }
    // Stench: flee from that hero
    const st = live.find(h => h.amulet && h.amulet.type === 'stench' && near(h, m, 64));
    if (st && m.ai !== 'tithe') { const a = angTo(st, m), s = mSpeed(m) * 1.1; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; m.facing = a; m.state = 'move'; move(m, dt); continue; }
    AI[m.ai](m, tg, dt);
    move(m, dt);
  }
}
function move(m, dt) { if (m.D.fly && m.ai === 'tithe') { m.x += m.vx * dt; m.y += m.vy * dt; W.map.collide(m); } else m.update(dt, W.map); }
function wander(m, dt) { if ((m.wanderT = (m.wanderT || 0) - dt) <= 0) { m.wanderT = 1 + rng.r() * 2; m.wa = rng.r() * TAU; } const s = mSpeed(m) * .4; m.vx = Math.cos(m.wa) * s; m.vy = Math.sin(m.wa) * s; }
/** walk toward the target along the flow field (straight at it when close) */
function chase(m, tg, speed, dt) {
  const h = tg.h, F = tg.bell ? W.bellFlow : W.flow;
  let d = tg.d < 22 || cellOf(h.x) === cellOf(m.x) && cellOf(h.y) === cellOf(m.y) ? [(h.x - m.x) / (tg.d || 1), (h.y - m.y) / (tg.d || 1)] : F.dir(m.x, m.y, h.x, h.y);
  m.vx = d[0] * speed; m.vy = d[1] * speed;
  if (speed > 0) m.facing = Math.atan2(d[1], d[0]);
}
const stand = m => { m.vx = m.vy = 0; };
const face = (m, h) => { m.facing = angTo(m, h); };

const AI = {
  ghost(m, tg, dt) {
    const h = tg.h; m.gape = clamp(1 - tg.d / 70, 0, 1);
    chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) { damage(h, mDmg(m), { kind: 'contact', from: m }); emit('ghostBite', { m, h }); m.dead = true; if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1); emit('kill', { m, by: null, kind: 'contact', points: 0 }, ['kill', m.id, -1, 0]); }
  },
  melee(m, tg, dt) {   // gnasher: walk up, raise the club (wind), swing; recover
    const h = tg.h, D = m.D, reach = D.reach + h.r;
    if (m.state === 'move') { chase(m, tg, mSpeed(m), dt); if (tg.d < reach) { m.state = 'wind'; m.stateT = 0; emit('windup', { m }); } return; }
    stand(m); face(m, h); m.stateT += dt;
    if (m.state === 'wind' && m.stateT >= D.wind) { m.state = 'strike'; m.stateT = 0; if (tg.d < reach + 5) { damage(h, mDmg(m), { kind: 'contact', from: m }); emit('monsterHit', { m, h }); } else emit('whiff', { m }); }
    else if (m.state === 'strike' && m.stateT >= .12) { m.state = 'recover'; m.stateT = 0; }
    else if (m.state === 'recover' && m.stateT >= D.every - D.wind - .12) m.state = 'move';
  },
  imp(m, tg, dt) {   // bites up close; spits fire when it sees you (the mouth glows first)
    const h = tg.h, D = m.D; m.cool -= dt;
    if (m.state === 'spit') { stand(m); face(m, h); m.stateT += dt; if (m.stateT >= .35) { m.state = 'move'; m.cool = D.fireEvery; fireball(m, h); } return; }
    if (m.state === 'move' && m.cool <= 0 && tg.d > 30 && tg.d < 150 && W.map.los(m.x, m.y, h.x, h.y)) { m.state = 'spit'; m.stateT = 0; emit('windup', { m }); return; }
    AI.melee(m, tg, dt);
  },
  lobber(m, tg, dt) {   // keeps its distance, flees up close, lobs crocks over walls (a shadow marks where they land)
    const h = tg.h, D = m.D; m.cool -= dt;
    if (m.state === 'throw') { stand(m); face(m, h); m.stateT += dt; if (m.stateT >= .45) { m.state = 'move'; m.cool = D.every[m.rank - 1]; lob(m, h); } return; }
    if (tg.d < 56) { const a = angTo(h, m), s = D.flee * TUNE.monsterSpeed; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; m.facing = a; m.fleeing = true; return; }
    m.fleeing = false;
    if (tg.d > D.keep[1] || !W.map.los(m.x, m.y, h.x, h.y) && tg.d > 70) chase(m, tg, mSpeed(m), dt);
    else { const a = angTo(m, h) + Math.PI / 2 * (m.id % 2 ? 1 : -1), s = mSpeed(m) * .35; m.vx = Math.cos(a) * s; m.vy = Math.sin(a) * s; face(m, h); }
    if (m.cool <= 0 && tg.d < 160) { m.state = 'throw'; m.stateT = 0; emit('windup', { m }); }
  },
  fryar(m, tg, dt) {   // fades in and out; can't be hit while unseen; reappears closer, in smoke
    const D = m.D; m.visT = (m.visT === undefined ? D.seen * rng.r() : m.visT) + dt;
    if (!m.hidden && m.visT >= D.seen && m.state === 'move') { m.hidden = true; m.visT = 0; emit('blink', { m, out: true }); }
    else if (m.hidden && m.visT >= D.unseen) {
      m.hidden = false; m.visT = 0;
      for (let k = 0, moved = 0; k < 3 && moved < 48; k++) { const n = W.flow.next(m.x, m.y); if (!n) break; const step = Math.min(16, Math.hypot(n.x - m.x, n.y - m.y)); moved += step; if (Math.hypot(n.x - tg.h.x, n.y - tg.h.y) < 20) break; m.x = n.x; m.y = n.y; }
      emit('blink', { m, out: false });
    }
    if (m.hidden) { chase(m, tg, mSpeed(m), dt); return; }
    AI.melee(m, tg, dt);
  },
  snatcher(m, tg, dt) {   // runs in, steals a flask, a key or the amulet, and runs for the exit
    if (m.loot) {
      const p = m.escape || (m.escape = escapePoint(m)), F = fleeFlow(p);
      const d = Math.hypot(p.x - m.x, p.y - m.y), dir = d < 20 ? [(p.x - m.x) / (d || 1), (p.y - m.y) / (d || 1)] : F.dir(m.x, m.y, p.x, p.y), s = mSpeed(m);
      m.vx = dir[0] * s; m.vy = dir[1] * s; m.facing = Math.atan2(dir[1], dir[0]);
      if (d < 8) { m.dead = true; emit('escaped', { m }, ['kill', m.id, -2, 0]); if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1); }
      return;
    }
    const h = tg.h; chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) {
      const lim = CHEATS.infinite || W.role === 'attract';
      if (h.flasks > 0 && !lim) { h.flasks--; m.loot = { type: 'flask' }; }
      else if (h.keys > 0 && !lim) { h.keys--; m.loot = { type: 'key' }; }
      else if (h.amulet) { m.loot = { type: 'amulet', sub: h.amulet.type }; h.amulet = null; }
      else m.loot = { type: 'none' };
      m.victim = h.id;
      if (m.loot.type !== 'none') say('stolen', h, 2);
      emit('stolen', { m, h, loot: m.loot }, ['stolen', m.id, h.id]);
    }
  },
  tithe(m, tg, dt) {   // glides to the nearest hero; drains while touching, at most 200 a hero; only magic kills it
    const h = tg.h; chase(m, tg, mSpeed(m), dt);
    if (tg.d < h.r + m.r + 2) {
      const took = m.drain[h.id] || 0; if (took >= 200) return;
      const a = Math.min(60 * dt, 200 - took); m.drain[h.id] = took + a; damage(h, a, { kind: 'drain' }); m.draining = .2;
      if (m.drain[h.id] >= 200) { m.dead = true; say('tithe_paid', h, 2); emit('tithePaid', { m, h }, ['kill', m.id, -3, 0]); }
    }
    m.draining = Math.max(0, (m.draining || 0) - dt);
  }
};
/** where a snatcher runs to with its loot: its heap, or the floor's nearest escape point */
function escapePoint(m) {
  if (m.gen && !m.gen.dead) return { x: m.gen.x, y: m.gen.y + 12 };
  const pts = (W.F.points && W.F.points.escape) || [];
  let best = null, bd = 1e9; for (const [cx, cy] of pts) { const d = Math.hypot(mid(cx) - m.x, mid(cy) - m.y); if (d < bd) { bd = d; best = { x: mid(cx), y: mid(cy) }; } }
  if (best) return best;
  const s = W.p.starts[0]; return { x: mid(s.cx), y: mid(s.cy) };
}
function fleeFlow(p) { const k = cellOf(p.x) + ',' + cellOf(p.y); let F = W.fleeFlows[k]; if (!F) F = W.fleeFlows[k] = new E.FlowField(W.map); F.update(p.x, p.y); return F; }
function dropLoot(m) {
  const L = m.loot; if (!L || L.type === 'none') return;
  addItem(L.type === 'amulet' ? 'amulet' : L.type, m.x, m.y, L.sub);
  const h = HB(m.victim); if (h) say('recovered', h, 1);
}

/* ---- enemy missiles ---- */
function fireball(m, h) {
  const a = angTo(m, h), s = 110;
  W.eshots.fire({ x: m.x + Math.cos(a) * 6, y: m.y + Math.sin(a) * 6, z: 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 3, dmg: mDmg(m, m.D.fire), life: 2.2, team: 'foe', kind: 'fireball', color: '#ff7a2a', id: W.nextId++ });
  emit('spit', { m });
}
function lob(m, h) {
  const lead = .6, tx = h.x + h.vx * lead, ty = h.y + h.vy * lead, g = 260, arc = E.arc({ x: m.x, y: m.y, z: 14 }, { x: tx, y: ty, z: 0 }, g, { apex: 40 });
  W.eshots.fire({ x: m.x, y: m.y, z: 14, vx: arc.vx, vy: arc.vy, vz: arc.vz, grav: g, r: 2.5, dmg: mDmg(m), life: arc.t + .02, team: 'lob', kind: 'crock', lx: tx, ly: ty, color: '#c87a3a', id: W.nextId++, splash: 12 });
  emit('lob', { m });
}

/* ---- GENERATORS: breed while a hero is near, under the floor's cap; lose a rank (and a damage state) as they break ---- */
function addGen(type, x, y, rank, id) {
  const D = get('gens', type), hp = 4 * rank * TUNE.generatorHp;
  const g = { id: id || W.nextId++, type, D, x, y, r: 7, rank, rank0: rank, hp, max: hp, children: 0, t: .5 + rng.r() * 2, isGen: true, dmg: 0, shake: 0, breathe: 0, dead: false };
  W.gens.push(g); return g;
}
const genInterval = g => [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / scaleSpawn(Math.max(1, liveHeroes().length));
const monsterCap = () => { const c = scaleCap(Math.max(1, W.heroes.length)); return W.role === 'host' || W.role === 'server' ? Math.min(c, 100) : c; };
function stepGens(dt) {
  if (CHEATS.nogen) return;
  const live = liveHeroes(), alive = W.monsters.filter(m => !m.dead).length, cap = monsterCap();
  for (const g of W.gens) {
    if (g.dead) continue;
    g.shake = Math.max(0, g.shake - dt); g.breathe = Math.max(0, g.breathe - dt);
    if (!live.some(h => near(h, g, 15 * T))) continue;
    if (g.children >= 8 || alive >= cap) continue;
    g.t -= dt; if (g.t > 0) continue;
    g.t = genInterval(g);
    const spot = freeNear(g.x, g.y); if (!spot) continue;
    const m = spawnMonster(g.D.spawns, spot[0], spot[1], g.rank, { rise: .4, gen: g, home: { x: g.x, y: g.y } });
    if (m) { g.children++; g.breathe = .6; }
  }
}
/** a free floor point beside (x, y): its four neighbour cells first */
function freeNear(x, y) {
  const cx = cellOf(x), cy = cellOf(y), tries = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const start = rng.int(0, 7);
  for (let i = 0; i < 8; i++) {
    const [dx, dy] = tries[(i + start) % 8], nx = cx + dx, ny = cy + dy;
    if (W.map.cell(nx, ny) || !W.map.walkable(nx, ny)) continue;
    const px0 = mid(nx), py0 = mid(ny);
    if (W.monsters.filter(m => !m.dead && Math.abs(m.x - px0) < 8 && Math.abs(m.y - py0) < 8).length >= 2) continue;
    if (W.gens.some(q => !q.dead && q.x === px0 && q.y === py0)) continue;
    return [px0 + (rng.r() - .5) * 4, py0 + (rng.r() - .5) * 4];
  }
  return null;
}
function hurtGen(g, amount, by) {
  if (g.dead) return 0;
  if (CHEATS.onehit && by) amount = 999;
  g.hp -= amount; g.shake = .2;
  const per = 4 * TUNE.generatorHp;
  g.rank = Math.max(1, Math.ceil(g.hp / per)); const f = g.hp / g.max; g.dmg = f > .67 ? 0 : f > .34 ? 1 : 2;
  emit('genHit', { g, by, amount }, null);
  if (g.hp <= 0) {
    g.dead = true;
    if (by && by.isHero) { award(by, 25 * g.rank0, g, 'gen'); by.stats.gens++; }
    if (rng.r() < .1) addItem('loaf', g.x, g.y);
    emit('genDead', { g, by }, ['gen', g.id]);
  }
  return amount;
}
