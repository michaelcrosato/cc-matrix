/* ---- THE SIMULATION: one world, one place. Roles: 'local' (solo and couch co-op), 'attract', 'host' and 'server' run
   everything; a 'client' moves only its own hero and shows the rest from the host's snapshots ---- */


function newHero(seat, cls, o = {}) {
  const D = get('heroes', cls);
  return Object.assign(new E.Body({ x: 0, y: 0, r: 5 }), {
    id: seat, seat, cls, D, name: o.name || 'P' + (seat + 1), color: o.color || SEAT_COLORS[seat], input: o.input || null, bot: o.bot || null, remote: !!o.remote,
    hp: startHealth(), score: 0, keys: 0, flasks: 0, specials: {}, amulet: null, alive: true, deadT: 0, continues: 0,
    facing: Math.PI / 2, aim: Math.PI / 2, aimAt: null, stun: 0, runeImmune: 0, queasy: 0, inv: 0, cool: 0, grace: {}, hurtT: 0, eatT: 0, castT: 0, throwT: 0, riseT: 0,
    stair: 0, padLock: -1, pushT: 0, pushCell: null, wallStair: 0, drained: 0, onMenu: 0, joinT: 0,
    combo: new E.Combo(D.melee.moves.map(m => new E.Attack(m, { hold: .1 })), { window: .35 }),
    intent: { move: [0, 0], aim: null, fire: false, magic: false, plant: false },
    stats: { kills: 0, treasure: 0, food: 0, floors: 0, foodShot: 0, gens: 0 }, deepest: 1, warned: {}
  });
}
const heroLimit = h => h.specials.deeppockets ? 12 : 9;
const liveHeroes = () => W ? W.heroes.filter(h => h.alive) : [];

/** build the world for a floor (FLOOR_ORDER index) with the party placed on its starts */
function buildWorld(index, o = {}) {
  const id = FLOOR_ORDER[index], F = get('floors', id), p = parseFloor(F), dec = decorate(F, p), realm = F.realm || 'larder';
  const descent = (RUN && RUN.descent) || 1;
  const map = new E.TileMap({ rows: F.rows, legend: mapLegend(), types: realmTypes(realm), floorTex: floorTexFor(realm, F), ao: 6, outside: '#05040a' });
  for (const d of dec.deco) map.block(d.cx, d.cy, true);
  const w = {
    F, p, id, index, realm, map, descent, role: o.role || 'local', auth: o.role !== 'client', serial: (o.serial || 0),
    t: 0, real: 0, nextId: 1000, heroes: [], monsters: [], gens: [], items: [], fx: [], dec,
    shots: new E.Bullets(game, { plane: 'ground', sparks: true }), eshots: new E.Bullets(game, { plane: 'ground', sparks: true }),
    flow: new E.FlowField(map), bellFlow: new E.FlowField(map), fleeFlows: {},
    doors: p.doors.map(d => Object.assign({ open: false, openT: 0 }, d)), plates: p.plates.map(q => Object.assign({ used: false }, q)),
    pads: p.pads, runes: p.runes, spikes: p.spikes.map(s => Object.assign({ phase: E.hash2(s.cx, s.cy) * 1.6 }, s)), beams: beamGroups(p),
    cracked: new Map(p.cracked.map(c => [c.cx + ',' + c.cy, 4])), fake: new Set(p.fake.map(c => c.cx + ',' + c.cy)),
    stairs: p.stairs, bell: p.bell ? { x: mid(p.bell.cx), y: mid(p.bell.cy), rung: false, target: null, t: 0, swing: 0 } : null,
    impatience: 0, titheDone: false, treasure: F.treasure ? { t: TUNE.hoardTime, total: 0 } : null, boss: null,
    done: null, over: false, events: [], devUsed: !!(RUN && RUN.dev), firsts: {}, magicFlash: 0, quake: 0
  };
  W = w;
  rng.seed((o.seed || 1) * 7919 + index * 104729 + descent * 31);
  // items: ids in reading order (the same on every copy)
  for (const it of p.items) {
    const D = get('items', it.type); if (!D) continue;
    w.items.push({ id: it.id, type: it.type, D, x: mid(it.cx), y: mid(it.cy), z: D.onTable ? 10 : 0, cx: it.cx, cy: it.cy, sub: it.sub, gone: false, open: false, t: E.hash2(it.cx, it.cy) * 6 });
  }
  if (w.treasure) w.treasure.total = w.items.filter(i => ['treasure', 'chest'].includes(i.D.kind)).length;
  const up = descent > 1 ? 1 : 0;
  p.gens.forEach((g, i) => addGen(g.type, mid(g.cx), mid(g.cy), Math.min(3, g.rank + up), 500 + i));   // on every copy, the same ids
  if (F.boss && p.king) startBoss(mid(p.king.cx), mid(p.king.cy));
  if (w.auth) for (const m of p.monsters) spawnMonster(m.type, mid(m.cx), mid(m.cy), Math.min(3, m.rank + up), { asleep: true });
  // heroes on the starts
  const starts = p.starts.map(s => ({ x: mid(s.cx), y: mid(s.cy) }));
  PARTY.forEach((h, i) => { placeHero(h, starts[i % starts.length]); w.heroes.push(h); });
  w.flow.updateMany(liveHeroes().length ? liveHeroes() : starts);
  bus.emit('floor', { w });
  return w;
}
function placeHero(h, s) {
  Object.assign(h, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, stair: 0, padLock: -1, stun: 0, queasy: 0, inv: 1, cool: .2, pushT: 0, wallStair: 0, drained: 0, onMenu: 0, grace: {}, sinkT: 0 });
  if (h.amulet) h.amulet.t = Math.min(h.amulet.t, AMULET_TIME);
  h.combo.cancel && h.combo.cancel();
}

/** force-field beams: runs of | or - cells, each run cycling on its own phase */
function beamGroups(p) {
  const left = new Set(p.beams.map(b => b.cx + ',' + b.cy)), groups = [];
  for (const b of p.beams) {
    if (!left.has(b.cx + ',' + b.cy)) continue;
    const cells = [], q = [b]; left.delete(b.cx + ',' + b.cy);
    while (q.length) { const c = q.pop(); cells.push(c); for (const n of p.beams) { const k = n.cx + ',' + n.cy; if (left.has(k) && n.dir === b.dir && Math.abs(n.cx - c.cx) + Math.abs(n.cy - c.cy) === 1) { left.delete(k); q.push(n); } } }
    groups.push({ dir: b.dir, cells, phase: (groups.length % 2) * 2, on: false });
  }
  return groups;
}

/* ---- events: the bus hears them at once; a host also sends them to the other copies ---- */
function emit(type, data, net) { bus.emit(type, data); if (W && W.role === 'host' && net) W.events.push(net); }
/** the Gaunt says a line (the narrator queue decides when); hero: who it is about */
function say(key, hero, prio, vars) { bus.emit('say', { key, hero, prio, vars }); if (W && W.role === 'host') W.events.push(['say', key, hero ? hero.id : -1, vars && vars.thing ? vars.thing : 0]); }
/** the first time something happens on this run (teaching tips); kept per game in RUN */
function first(what) { if (!RUN) return false; RUN.firsts = RUN.firsts || {}; if (RUN.firsts[what]) return false; RUN.firsts[what] = true; return true; }

/* ---- scoring ---- */
function award(h, points, at, why) {
  if (!h || !points) return;
  h.score += Math.round(points);
  bus.emit('points', { h, points: Math.round(points), at, why });
}

/* ---- the damage pipeline: one function for every hit ---- */
// kind: shot | melee | magic | blast | contact | drain | trap | fire
function damage(t, amount, o = {}) {
  if (!W || !W.auth || !t || t.dead) return 0;
  const by = o.by || null;
  if (t.isHero) return hurtHero(t, amount, o);
  if (t.isGen) return hurtGen(t, amount, by, o);
  if (t.isBoss) return hurtBoss(t, amount, by, o);
  const D = t.D;
  if (D.immune && o.kind !== 'magic' && o.kind !== 'blast') { emit('clink', { m: t }); return 0; }
  if (t.ai === 'fryar' && t.hidden && o.kind !== 'magic' && o.kind !== 'blast') return 0;
  if (CHEATS.onehit && by) amount = 999;
  if (D.immune) amount = 999;
  t.hp -= amount; t.hitT = .12;
  const rank = Math.max(1, Math.ceil(t.hp / D.hp));
  if (t.hp > 0 && rank < t.rank) { t.rank = rank; emit('shrink', { m: t }); }
  if (t.hp <= 0) killMonster(t, by, o.kind);
  else emit('hit', { m: t, by, kind: o.kind, amount });
  return amount;
}
function killMonster(m, by, kind) {
  if (m.dead) return;
  m.dead = true;
  const pts = m.D.points * (m.D.immune ? rng.int(1, 5) : m.spawnRank);
  if (by && by.isHero) { award(by, pts, m, 'kill'); by.stats.kills++; }
  if (m.gen) m.gen.children = Math.max(0, m.gen.children - 1);
  if (m.ai === 'snatcher' && m.loot) dropLoot(m);
  if (m.ai === 'tithe') say('tithe_slain', by);
  emit('kill', { m, by, kind, points: pts }, ['kill', m.id, by ? by.id : -1, pts]);
}

/** spawn a monster (rank 1-3); rise: seconds it climbs out of a generator */
function spawnMonster(type, x, y, rank, o = {}) {
  const D = get('monsters', type); if (!D) return null;
  rank = D.rank1 ? 1 : clamp(rank, 1, 3);
  const m = Object.assign(new E.Body({ x, y, r: D.r, friction: 0 }), {
    id: o.id || W.nextId++, type, D, ai: D.ai, rank, spawnRank: rank, hp: D.hp * rank, facing: Math.PI / 2, t: rng.r() * 2, cool: .5 + rng.r(), state: 'move', stateT: 0,
    rise: o.rise || 0, asleep: !!o.asleep, gen: o.gen || null, hitT: 0, grace: {}, wind: 0, hidden: false, drain: {}, home: o.home || null, loot: null, gape: 0
  });
  m.isMonster = true;
  if (D.fly) m.gravity = 0;
  W.monsters.push(m);
  emit('spawn', { m, gen: o.gen });
  return m;
}

/** the visible ground around a point (the user's screen) in world units { x0, y0, x1, y1 } */
function screenRect(h, half) {
  if (half) return { x0: h.x - half[0] * T, x1: h.x + half[0] * T, y0: h.y - half[1] * T, y1: h.y + half[1] * T };
  const v = game.view, c = game.cam;
  if (v && v.toGround && c && isFinite(c.x) && game.W > 0) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [sx, sy] of [[0, 0], [game.W, 0], [0, game.H], [game.W, game.H]]) { const q = v.toGround(c.x + sx, c.y + sy); if (!q) continue; x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    if (x1 > x0 && y1 > y0 && x1 - x0 < 2000) return { x0, y0, x1, y1 };
  }
  return { x0: h.x - 13 * T, x1: h.x + 13 * T, y0: h.y - 9 * T, y1: h.y + 9 * T };
}
const inRect = (q, R) => q.x >= R.x0 && q.x <= R.x1 && q.y >= R.y0 && q.y <= R.y1;

/* ---- one step of the world (1/120 s) ---- */
function stepWorld(dt) {
  if (!W || W.over) return;
  W.t += dt; W.real += dt;
  W.magicFlash = Math.max(0, W.magicFlash - dt); W.quake = Math.max(0, W.quake - dt);
  for (const h of W.heroes) stepHero(h, dt);
  if (W.auth) {
    stepGens(dt);
    stepMonsters(dt);
    if (W.boss) stepBoss(dt);
    separate(dt);
    stepShots(dt);
    stepFeatures(dt);
    for (const h of W.heroes) if (h.alive) { pickups(h); doors(h); }
    stairs(dt);
    timers(dt);
    E.prune(W.monsters, m => m.dead && (m.deadT = (m.deadT || 0) + dt) > .01);
  } else {
    stepClientShots(dt);
    for (const h of W.heroes) if (h.alive && !h.remote) clientPickups(h);
  }
  narratorTriggers(dt);
}

/** the floor's clocks: the Gaunt's impatience, the Tithe's arrival, the hoard */
function timers(dt) {
  const F = W.F, imp = TUNE.impatience;
  if (!F.treasure && !F.boss) {
    if (W.impatience < 1 && W.t >= imp - 30) { W.impatience = 1; say('impatient', null, 2); emit('impatience', { stage: 1 }, ['imp', 1]); }
    if (W.impatience < 2 && W.t >= imp) { W.impatience = 2; for (const d of W.doors) if (!d.open) openDoor(d, null); say('doors_open', null, 2); emit('impatience', { stage: 2 }, ['imp', 2]); }
    if (W.impatience < 3 && W.t >= imp + 60) { W.impatience = 3; say('walls_stairs', null, 2); emit('impatience', { stage: 3 }, ['imp', 3]); }
    if (!W.titheDone && (F.no >= 5 || W.descent > 1) && W.t >= TUNE.titheAt && !W.monsters.some(m => m.ai === 'tithe' && !m.dead)) { W.titheDone = true; summonTithe(); }
  }
  if (W.treasure) {
    W.treasure.t -= dt;
    if (W.treasure.t <= 0 && !W.done) { say('hoard_shut', null, 2); emit('hoardShut', {}, ['hoard']); W.done = { to: W.index + 1, by: null, why: 'hoard' }; }
  }
}
function summonTithe() {
  const live = liveHeroes(); if (!live.length) return;
  let best = null, bd = -1;
  for (let i = 0; i < 60; i++) { const cx = rng.int(1, W.p.w - 2), cy = rng.int(1, W.p.h - 2); if (!W.map.walkable(cx, cy) || W.map.cell(cx, cy)) continue; const d = Math.min(...live.map(h => Math.hypot(mid(cx) - h.x, mid(cy) - h.y))); if (d > bd && W.flow.distAt(mid(cx), mid(cy)) < 1e9) { bd = d; best = [cx, cy]; } }
  if (!best) return;
  spawnMonster('tithe', mid(best[0]), mid(best[1]), 1);
  say('tithe_comes', null, 2);
}

/** bodies block each other: monsters push apart softly; heroes are pushed out of monsters (a horde can box you in) */
const HASH = new E.SpatialHash(32);
function separate(dt) {
  const ms = W.monsters.filter(m => !m.dead && !m.rise);
  HASH.build(ms);
  for (const a of ms) {
    if (a.ai === 'tithe' || a.ai === 'ghost') continue;
    HASH.near(a.x, a.y, 14, b => {
      if (b === a || b.dead || b.ai === 'ghost' || b.ai === 'tithe') return;
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), R = a.r + b.r - 1;
      if (d >= R || d < 1e-4) return;
      const k = (R - d) / d * .25; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
    });
  }
  for (const h of W.heroes) {
    if (!h.alive) continue;
    HASH.near(h.x, h.y, 16, m => {
      if (m.dead || m.ai === 'ghost' || m.ai === 'tithe') return;
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy), R = h.r + m.r;
      if (d >= R || d < 1e-4) return;
      const over = R - d, ux = dx / d, uy = dy / d;
      h.x += ux * over * .3; h.y += uy * over * .3; m.x -= ux * over * .7; m.y -= uy * over * .7;
    });
    if (!CHEATS.noclip) W.map.collide(h);
    for (const g of W.gens) { if (g.dead) continue; const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy), R = h.r + g.r; if (d < R && d > 1e-4) { h.x += dx / d * (R - d); h.y += dy / d * (R - d); } }
  }
  for (const m of ms) { W.map.collide(m); for (const g of W.gens) { if (g.dead) continue; const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy), R = m.r + g.r; if (d < R && d > 1e-4 && m.ai !== 'ghost') { m.x += dx / d * (R - d); m.y += dy / d * (R - d); } } }
}

/** the run: start it, with these heroes ([{ cls, input, bot, name, color }]) */
function startRun(list, o = {}) {
  RUN = { descent: o.descent || 1, floorIndex: o.floor || 0, firsts: {}, dev: false, started: game.real, mode: o.mode || 'local', seed: o.seed || ((Math.random() * 1e9) | 0) };
  PARTY = list.map((q, i) => newHero(q.seat !== undefined ? q.seat : i, q.cls, q));
  PARTY.forEach(h => { h.hp = startHealth(); });
}
/** the next floor (after the stairs), or the ending past the last */
function nextFloorIndex(to) {
  if (typeof to === 'number' && to >= 0) return to;
  return W.index + 1;
}
