/* 23-monsters: monster AI kinds, generators, projectiles, crowding, and the floor's features over time (beams,
 * spikes, impatience, the Tithe's coming, the hoard clock). */

const monCap = () => { const n = Math.max(1, W.heroes.length); let c = TUNE.maxMonsters * (1 + .3 * (n - 1)); c = Math.min(c, 300); return W.net === 'host' || W.net === 'server' ? Math.min(c, 100) : c; };
const monSpeed = m => m.D.speed[m.rank - 1] * TUNE.monsterSpeed * (W.attract ? 1 : 1);
const monDmg = m => m.D.dmg[m.rank - 1];

function targetFor(m) {
  let best = null, bd = 1e9;
  for (const h of W.heroes) {
    if (!h.alive) continue;
    if (W.bell && W.bell.pi !== h.pi && m.type !== 'snatcher') continue;
    const d = Math.hypot(h.x - m.x, h.y - m.y);
    if (h.amulet === 'veil' && d > 24) continue;
    if (d < bd) { bd = d; best = h; }
  }
  return [best, bd];
}

function stepMonsters(dt) {
  if (CHEAT.freeze && !W.attract) return;
  const F = heroField(), heroes = living();
  for (const m of W.mons) {
    if (m.dead) continue;
    m.t += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.shrink = Math.max(0, m.shrink - dt);
    for (const k in m.cd) m.cd[k] -= dt;
    if (m.emerge > 0) { m.emerge -= dt; continue; }
    const [h, d] = targetFor(m);
    if (!m.wake) { if (h && d < 20 * T) m.wake = true; else { m.vx = m.vy = 0; continue; } }
    if (h && d > 22 * T && m.type !== 'snatcher') { m.vx = m.vy = 0; continue; }   // asleep in the dark
    let dir = null, speed = monSpeed(m);
    // stench: flee from that hero
    const stinky = heroes.find(s => s.amulet === 'stench' && Math.hypot(s.x - m.x, s.y - m.y) < 64);
    if (stinky) { const a = Math.atan2(m.y - stinky.y, m.x - stinky.x); dir = [Math.cos(a), Math.sin(a)]; }
    else if (h) dir = AI[m.D.ai](m, h, d, F, dt);
    else { const a = m.t * .7 + m.id; dir = [Math.cos(a) * .3, Math.sin(a) * .3]; }
    if (m.wind > 0) speed *= .25;
    if (dir) { m.vx = dir[0] * speed; m.vy = dir[1] * speed; if (Math.abs(dir[0]) + Math.abs(dir[1]) > .2) m.face = Math.atan2(dir[1], dir[0]); }
    else { m.vx = m.vy = 0; }
    if (m.dead) continue;
    const b = m.body; b.x = m.x; b.y = m.y; b.vx = m.vx + (m.kx || 0); b.vy = m.vy + (m.ky || 0);
    m.kx = (m.kx || 0) * Math.max(0, 1 - dt * 8); m.ky = (m.ky || 0) * Math.max(0, 1 - dt * 8);
    b.update(dt, W.map); m.x = b.x; m.y = b.y;
  }
  // crowding: monsters part softly, heroes are shoved out of them (a horde can box a hero in)
  const list = W.mons.filter(m => !m.dead && m.emerge <= 0);
  W.hash = W.hash || new E.SpatialHash(32); W.hash.build(list);
  for (const m of list) W.hash.near(m.x, m.y, 12, o => {
    if (o === m || o.id < m.id) return;
    const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy), mn = m.r + o.r - 1;
    if (d >= mn || d < .01) return;
    const k = (mn - d) / d * .25; m.x -= dx * k; m.y -= dy * k; o.x += dx * k; o.y += dy * k;
  });
  for (const h of heroes) {
    if (CHEAT.noclip && !W.attract) continue;
    W.hash.near(h.x, h.y, 14, m => {
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy), mn = h.r + m.r - 1;
      if (d >= mn || d < .01 || m.D.fly) return;
      const k = (mn - d) / d; h.x += dx * k * .7; h.y += dy * k * .7; m.x -= dx * k * .3; m.y -= dy * k * .3;
    });
    for (const g of W.gens) if (!g.dead) { const dx = h.x - g.x, dy = h.y - g.y, d = Math.hypot(dx, dy), mn = h.r + g.r; if (d < mn && d > .01) { h.x += dx / d * (mn - d); h.y += dy / d * (mn - d); } }
    h.body.x = h.x; h.body.y = h.y; W.map.collide(h.body); h.x = h.body.x; h.y = h.body.y;
  }
  for (const m of list) { m.body.x = m.x; m.body.y = m.y; W.map.collide(m.body); m.x = m.body.x; m.y = m.body.y; }
  W.mons = W.mons.filter(m => !m.dead);
}

/* ---- the AI kinds: each returns the direction to move ---- */
const chase = (m, h, d, F) => d < 20 ? [(h.x - m.x) / (d || 1), (h.y - m.y) / (d || 1)] : (fieldDir(F, m.x, m.y) || [(h.x - m.x) / d, (h.y - m.y) / d]);
const touching = (m, h, extra = 0) => Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + extra;
function meleeAI(m, h, d, F, dt, reach) {
  if (m.wind > 0) {
    m.wind -= dt; m.face = angTo(m, h);
    if (m.wind <= 0) { m.atk = m.D.every; m.swingT = W.t; if (d < m.r + h.r + reach + 4) hurtHero(h, monDmg(m), { from: m, kind: 'melee' }); happen('monswing', { id: m.id, x: m.x, y: m.y }); }
    return null;
  }
  m.atk -= dt;
  if (d < m.r + h.r + reach && m.atk <= 0) { m.wind = m.D.wind; m.windT = W.t; return null; }
  return chase(m, h, d, F);
}
const AI = {
  ghost(m, h, d, F) {
    if (touching(m, h, 1)) { hurtHero(h, monDmg(m), { from: m, kind: 'ghost' }); m.dead = true; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); happen('ghostbite', { id: m.id, x: m.x, y: m.y }); return null; }
    return chase(m, h, d, F);
  },
  melee(m, h, d, F, dt) { return meleeAI(m, h, d, F, dt, m.D.reach); },
  fryar(m, h, d, F, dt) {
    m.visT -= dt;
    if (m.visT <= 0) {
      if (m.vis > .5) { m.vis = 0; m.visT = 1.4; happen('blink', { id: m.id, x: m.x, y: m.y }); }
      else {   // reappear closer along the path
        for (let i = 0; i < 3; i++) { const dir = fieldDir(F, m.x, m.y); if (!dir) break; const nx = m.x + dir[0] * 16, ny = m.y + dir[1] * 16; if (!W.map.walkable(Math.floor(nx / T), Math.floor(ny / T))) break; m.x = nx; m.y = ny; }
        m.vis = 1; m.visT = 2; m.body.x = m.x; m.body.y = m.y; happen('blink', { id: m.id, x: m.x, y: m.y, on: true });
      }
    }
    if (m.vis < .5) return chase(m, h, d, F).map(v => v * .5);
    return meleeAI(m, h, d, F, dt, m.D.reach);
  },
  lob(m, h, d, F, dt) {
    m.atk -= dt;
    if (m.atk <= 0 && d < 130) {
      m.atk = m.D.every[m.rank - 1]; m.swingT = W.t;
      const lead = .5, tx = h.x + h.vx * lead, ty = h.y + h.vy * lead, v = E.arc({ x: m.x, y: m.y, z: 14 }, { x: tx, y: ty, z: 0 }, 300, { apex: 40 });
      W.shots.push({ id: nid(), team: 'foe', kind: 'crock', x: m.x, y: m.y, z: 14, vx: v.vx, vy: v.vy, vz: v.vz, grav: 300, r: 3, dmg: monDmg(m), life: v.t + .05, tx, ty, land: W.t + v.t, splash: 12, by: m.id, rot: 0 });
      happen('lob', { id: m.id, x: m.x, y: m.y });
    }
    if (d < 56) { const a = fieldDir(F, m.x, m.y, true); return a || [(m.x - h.x) / d, (m.y - h.y) / d]; }
    if (d > 110) return chase(m, h, d, F);
    const s = Math.sin(m.t * 1.3 + m.id) * .5, a = angTo(h, m) + Math.PI / 2; return [Math.cos(a) * s, Math.sin(a) * s];
  },
  imp(m, h, d, F, dt) {
    if (m.spit > 0) { m.spit -= dt; m.face = angTo(m, h); if (m.spit <= 0) { const a = angTo(m, h), sp = 110; W.shots.push({ id: nid(), team: 'foe', kind: 'fireball', x: m.x, y: m.y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, r: 3, dmg: m.D.fire[m.rank - 1], life: 2, by: m.id, rot: 0 }); happen('spit', { id: m.id, x: m.x, y: m.y }); } return null; }
    m.fireCD = (m.fireCD || R() * 1.8) - dt;
    if (m.fireCD <= 0 && d > 30 && d < 140 && W.map.los(m.x, m.y, h.x, h.y)) { m.fireCD = m.D.every; m.spit = .35; m.spitT = W.t; return null; }
    return meleeAI(m, h, d, F, dt, m.D.reach);
  },
  snatch(m, h, d, F, dt) {
    if (m.carry) {   // run home with the loot
      const goal = m.home || W.p.starts[0];
      const gd = Math.hypot(goal.x - m.x, goal.y - m.y);
      if (gd < 10) { m.dead = true; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); happen('escape', { id: m.id, x: m.x, y: m.y }); return null; }
      m.fleeF = m.fleeF && m.fleeKey === W.map.version ? m.fleeF : buildField([{ cx: Math.floor(goal.x / T), cy: Math.floor(goal.y / T), i: 0 }]); m.fleeKey = W.map.version;
      return fieldDir(m.fleeF, m.x, m.y) || [(goal.x - m.x) / (gd || 1), (goal.y - m.y) / (gd || 1)];
    }
    if (touching(m, h, 2)) {
      let what = null;
      if (h.flasks > 0) { h.flasks--; what = { kind: 'flask' }; } else if (h.keys > 0) { h.keys--; what = { kind: 'key' }; } else if (h.amulet) { what = { kind: 'amulet', sub: h.amulet }; h.amulet = null; }
      if (what) { m.carry = what; say('stolen', h, 3); happen('stolen', { pi: h.pi, id: m.id, kind: what.kind, x: h.x, y: h.y }); m.home = m.home || farthestStart(h); }
      else { m.atk = 1.5; }
      return null;
    }
    m.atk = (m.atk || 0) - dt;
    return m.atk > 0 ? null : chase(m, h, d, F);
  },
  tithe(m, h, d, F, dt) {
    for (const o of living()) if (touching(m, o, 3)) {
      m.drain = (m.drain || 0) + dt;
      if (m.drain >= .1) {
        m.drain -= .1; const got = m.drained[o.pi] || 0, take = Math.min(6, 200 - got);
        if (take > 0) { o.hp -= CHEAT.god || W.attract ? 0 : take; m.drained[o.pi] = got + take; happen('drain', { pi: o.pi, x: o.x, y: o.y, mx: m.x, my: m.y }); if (o.hp <= 0) heroFalls(o); }
        if (got + take >= 200) { m.dead = true; say('tithe_paid', o, 3); happen('tithe', { gone: true, x: m.x, y: m.y }); return null; }
      }
    }
    return [(h.x - m.x) / (d || 1), (h.y - m.y) / (d || 1)];   // it glides through everything but walls
  }
};
function farthestStart(h) { let b = null, bd = -1; for (const g of W.gens) if (!g.dead && g.type === 'sacks') { const d = Math.hypot(g.x - h.x, g.y - h.y); if (d > bd) { bd = d; b = { x: g.x, y: g.y }; } } return b || W.p.starts[0]; }

/* ---- generators ---- */
function stepGens(dt) {
  if ((CHEAT.noGens || CHEAT.freeze) && !W.attract) return;
  const n = Math.max(1, W.heroes.length), cap = monCap(), alive = W.mons.length;
  for (const g of W.gens) {
    if (g.dead) continue;
    g.shake = Math.max(0, g.shake - dt);
    if (g.type === 'tureen' && W.boss && W.boss.intro) continue;
    const near = living().some(h => Math.hypot(h.x - g.x, h.y - g.y) < 15 * T);
    if (!near || g.kids >= 8 || alive >= cap) continue;
    g.t -= dt;
    if (g.t > 0) continue;
    g.t = [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / (1 + .25 * (n - 1));
    const type = get('gens', g.type).spawns, spot = freeNear(g);
    if (!spot) continue;
    const m = spawnMon(type, spot.x, spot.y, g.type === 'tureen' ? 2 : g.rank, { emerge: true, gen: g, home: { x: g.x, y: g.y }, awake: true });
    g.kids++; m.emergeFrom = { x: g.x, y: g.y };
    happen('spawn', { id: m.id, type, x: spot.x, y: spot.y, gx: g.x, gy: g.y });
  }
  W.gens = W.gens.filter(g => !g.dead);
}
function freeNear(g) {
  const cx = Math.floor(g.x / T), cy = Math.floor(g.y / T), opts = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const start = Math.floor(R() * 8);
  for (let i = 0; i < 8; i++) {
    const [dx, dy] = opts[(start + i) % 8], nx = cx + dx, ny = cy + dy;
    if (!W.map.walkable(nx, ny)) continue;
    const x = (nx + .5) * T, y = (ny + .5) * T;
    if (W.mons.some(m => Math.abs(m.x - x) < 8 && Math.abs(m.y - y) < 8)) continue;
    return { x, y };
  }
  return null;
}

/* ---- projectiles ---- */
function stepShots(dt) {
  const map = W.map;
  for (const s of W.shots) {
    if (s.dead) continue;
    s.life -= dt; s.rot += dt * 14;
    if (s.grav) s.vz -= s.grav * dt;
    const ox = s.x, oy = s.y;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (s.grav) {   // a lob: it breaks where it lands
      if (s.z <= 0 || s.life <= 0) { s.dead = true; landSplash(s); }
      continue;
    }
    if (s.life <= 0) { s.dead = true; continue; }
    // walls
    if (map.heightAt(s.x, s.y) > s.z) {
      const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T);
      if (s.team === 'hero') { const c = W.cracked.find(c => c.cx === cx && c.cy === cy); if (c) crackWall(c, 1); }
      if (s.bounce > 0) {
        s.bounce--;
        const hx = map.heightAt(s.x, oy) > s.z, hy = map.heightAt(ox, s.y) > s.z;
        if (hx || !hy) s.vx = -s.vx; if (hy || !hx) s.vy = -s.vy;
        s.x = ox; s.y = oy; s.hits.clear && s.hits.clear(); happen('ricochet', { x: s.x, y: s.y });
        continue;
      }
      s.dead = true; happen('shotwall', { x: ox, y: oy, team: s.team, kind: s.kind }); continue;
    }
    if (s.team === 'hero') heroShotHits(s);
    else foeShotHits(s);
  }
  W.shots = W.shots.filter(s => !s.dead);
}
function heroShotHits(s) {
  const h = s.owner;
  for (const m of W.mons) {
    if (m.dead || s.hits.has(m.id) || m.emerge > 0) continue;
    if (Math.abs(m.x - s.x) > m.r + s.r || Math.abs(m.y - s.y) > m.r + s.r) continue;
    if (m.type === 'fryar' && m.vis < .5) continue;
    s.hits.add(m.id);
    hurtMon(m, s.dmg, { by: h, kind: 'shot' });
    happen('shothit', { x: s.x, y: s.y, kind: s.kind, a: Math.atan2(s.vy, s.vx), m: m.type });
    if (s.splash) for (const o of W.mons) if (o !== m && !o.dead && Math.hypot(o.x - s.x, o.y - s.y) < 12) hurtMon(o, s.splash, { by: h, kind: 'shot' });
    if (m.D.immune || s.pierce-- <= 0) { s.dead = true; return; }
  }
  for (const g of W.gens) {
    if (g.dead || Math.hypot(g.x - s.x, g.y - s.y) > g.r + s.r) continue;
    hurtGen(g, s.dmg, h, 'shot'); s.dead = true; return;
  }
  if (W.boss && W.boss.alive && Math.hypot(W.boss.x - s.x, W.boss.y - s.y) < W.boss.r + s.r) { bossHurt(s.dmg, h, 'shot', Math.atan2(s.vy, s.vx)); s.dead = true; return; }
  for (const it of W.items) {
    if (it.gone || !get('items', it.kind).shoot) continue;
    if (Math.abs(it.x - s.x) > 6 || Math.abs(it.y - s.y) > 6) continue;
    shootItem(it, h); s.dead = true; return;
  }
  // allies: from floor 6 on a shot that touches a friend stuns them
  if (allyStunOn()) for (const o of W.heroes) {
    if (o === h || !o.alive || o.stun > 0) continue;
    if (Math.hypot(o.x - s.x, o.y - s.y) < o.r + s.r) { o.stun = .35; say('ally_shot', h, 1); happen('allyhit', { pi: o.pi, by: h.pi, x: o.x, y: o.y }); }
  }
}
const allyStunOn = () => S.allyStun && (W.no >= 6 || RUN.loop > 1) && W.heroes.length > 1;
function shootItem(it, h) {
  it.gone = true;
  happen('gone', { id: it.id, by: -1, kind: it.kind, x: it.x, y: it.y, shot: true });
  if (it.kind === 'cider') { say('shot_cider', h, 3); h.stats.foodShot++; happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); }
  else if (it.kind === 'platter') { if (W.boss) { say('king_eating', h, 2); W.boss.denied = (W.boss.denied || 0) + 1; } else say('shot_feast', h, 3); h.stats.foodShot++; happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); }
  else if (it.kind === 'stew') happen('shotfood', { x: it.x, y: it.y, kind: it.kind });
  else if (it.kind === 'flask') { say('shot_flask', h, 3); blast(h, it.x, it.y, 0, 0, .5, 80); }
}
function foeShotHits(s) {
  for (const h of W.heroes) {
    if (!h.alive || Math.hypot(h.x - s.x, h.y - s.y) > h.r + s.r) continue;
    hurtHero(h, s.dmg, { from: s, kind: s.kind }); s.dead = true; happen('foehit', { x: s.x, y: s.y, kind: s.kind }); return;
  }
  if (s.kind === 'fireball') for (const it of W.items) {   // imps cook what they spit on
    if (it.gone || !get('items', it.kind).food) continue;
    if (Math.abs(it.x - s.x) < 6 && Math.abs(it.y - s.y) < 6) { it.gone = true; s.dead = true; happen('gone', { id: it.id, by: -1, kind: it.kind, x: it.x, y: it.y, shot: true }); happen('shotfood', { x: it.x, y: it.y, kind: it.kind }); return; }
  }
}
function landSplash(s) {
  happen('crockbreak', { x: s.x, y: s.y, kind: s.kind });
  for (const h of W.heroes) if (h.alive && Math.hypot(h.x - s.x, h.y - s.y) < s.splash + h.r) hurtHero(h, s.dmg, { from: s, kind: s.kind });
}

/* ---- features over time ---- */
const beamOn = t => { const p = (t % 4); return p < 2 ? 'on' : p > 3.6 ? 'flicker' : 'off'; };
const spikeUp = (sp, t) => { const p = (t + sp.ph) % 1.6; return p < .5 ? 'up' : p > 1.35 ? 'tremble' : 'down'; };
function stepFeatures(dt) {
  const t = W.t;
  const bodies = [...living(), ...W.mons.filter(m => !m.dead && m.emerge <= 0)];
  const zap = (e, dmg, kind, cd) => {
    if (e.cd[kind] > 0) return; e.cd[kind] = cd;
    if (e.pi !== undefined) hurtHero(e, dmg, { kind, from: { x: e.x - Math.cos(e.face) * 4, y: e.y - Math.sin(e.face) * 4 } }); else hurtMon(e, dmg / 6, { kind });
  };
  for (const e of bodies) for (const k in e.cd) if (e.pi !== undefined) e.cd[k] -= dt;
  if (W.beams.length && beamOn(t) === 'on') for (const b of W.beams) for (const e of bodies) if (Math.abs(e.x - b.x) < 8 + e.r && Math.abs(e.y - b.y) < 8 + e.r && (b.dir === 'v' ? Math.abs(e.x - b.x) < 4 + e.r : Math.abs(e.y - b.y) < 4 + e.r)) { zap(e, 12, 'beam', .5); if (e.pi !== undefined) say('tip_field', e, 1); }
  for (const sp of W.spikes) if (spikeUp(sp, t) === 'up') for (const e of bodies) if (!e.D || !e.D.fly) if (Math.abs(e.x - sp.x) < 7 && Math.abs(e.y - sp.y) < 7) { zap(e, 15, 'spike', .6); if (e.pi !== undefined) say('tip_spikes', e, 1); }
  if (W.hoard) {
    W.hoard.t -= dt;
    if (W.hoard.t <= 0 && !W.done) { say('hoard_shut', null, 3); W.done = { by: -1, to: null, hoard: true }; happen('stairs', { pi: -1, hoard: true }); }
    return;
  }
  if (W.boss) return;
  const imp = TUNE.impatience;
  if (W.stage < 1 && t >= imp - 30) { W.stage = 1; say('impatient', null, 3); }
  if (W.stage < 2 && t >= imp) { W.stage = 2; for (const g of W.doorGroups) if (!g.open) openDoors(g, null); say('doors_open', null, 3); }
  if (W.stage < 3 && t >= imp + 60) { W.stage = 3; say('walls_stairs', null, 3); happen('wallsglow', {}); }
  if (W.titheDue && !W.titheCame && t >= TUNE.titheAt && !W.mons.some(m => m.type === 'tithe')) {
    W.titheCame = true;
    const h = living()[0];
    if (h) { const s = W.p.starts[0]; const m = spawnMon('tithe', s.x, s.y, 1, { awake: true }); m.wake = true; say('tithe_comes', null, 3); happen('tithe', { x: m.x, y: m.y }); }
  }
}
