/* Monsters, generators, enemy shots, the Tithe, the Dinner Bell, King Famish. */
const monSpeed = m => m.T.spd[m.rank - 1] * TUNE.monsterSpeed * (m.state === 'rush' ? 1.25 : 1);
const monDmg = m => (m.T.dmg[m.rank - 1] || 0) * TUNE.monsterDamage * (RUN.descent2 ? 1.1 : 1);
const unveiled = (h, m) => !(h.amulet === 'veil' && h.amuletT > 0) || Math.hypot(h.x - m.x, h.y - m.y) < 16;

function nearestHero(m, onlyVisible) {
  let best = null, bd = 1e9;
  if (W.menuHero && !W.menuHero.down && W.menuHero.bell > 0) return W.menuHero;
  for (const h of W.heroes) { if (h.down || h.gone) continue; if (!unveiled(h, m)) continue; const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; best = h; } }
  return best;
}
function steerTo(m, tx, ty, flow, dt, spd, direct) {
  let dx, dy;
  const d = Math.hypot(tx - m.x, ty - m.y);
  if (direct || (d < 7 * TS && W.map.los(m.x, m.y, tx, ty))) { dx = (tx - m.x) / (d || 1); dy = (ty - m.y) / (d || 1); }
  else { const v = flow.dir(m.x, m.y); if (v) { dx = v[0]; dy = v[1]; } else { dx = (tx - m.x) / (d || 1); dy = (ty - m.y) / (d || 1); } }
  m.vx += (dx * spd - m.vx) * Math.min(1, dt * 10); m.vy += (dy * spd - m.vy) * Math.min(1, dt * 10);
  if (Math.abs(dx) + Math.abs(dy) > .01) m.facing = Math.atan2(dy, dx);
}

function monStep(m, dt) {
  if (m.dead) { m.dying += dt; return; }
  m.flash = Math.max(0, m.flash - dt);
  if (m.emerge > 0) { m.emerge -= dt; m.alpha = 1 - m.emerge / .4; return; }
  m.alpha = 1; m.t += dt; m.cool -= dt;
  if (DEV.freeze) { m.vx = m.vy = 0; return; }
  if (m.stun > 0) { m.stun -= dt; m.vx *= .8; m.vy *= .8; m.update(dt, W.map); return; }
  if (m.isBoss) return bossStep(m, dt);
  const hs = W.heroes.filter(h => !h.down && !h.gone);
  if (!hs.length) { m.vx *= .9; m.vy *= .9; return; }
  const tgt = nearestHero(m);
  let near = 1e9; for (const h of hs) near = Math.min(near, Math.hypot(h.x - m.x, h.y - m.y));
  if (near > 20 * TS && m.ch !== 't') { m.vx = m.vy = 0; return; }
  const fl = W.menuHero && W.menuHero.bell > 0 ? W.bellFlow : W.flow;
  const spd = monSpeed(m);
  // stench: flee
  for (const h of hs) if (h.amulet === 'stench' && h.amuletT > 0 && Math.hypot(h.x - m.x, h.y - m.y) < 64 && m.ch !== 't') {
    const a = Math.atan2(m.y - h.y, m.x - h.x); m.vx = Math.cos(a) * spd; m.vy = Math.sin(a) * spd; m.facing = a + Math.PI; m.update(dt, W.map); return;
  }
  if (!tgt) { m.vx *= .9; m.vy *= .9; return; }
  const td = Math.hypot(tgt.x - m.x, tgt.y - m.y), ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  switch (m.ch) {
    case 'g': {
      steerTo(m, tgt.x, tgt.y, fl, dt, spd); m.z = 4 + Math.sin(m.t * 4) * 1.5;
      if (td < m.r + tgt.r + 1) { if (hurtHero(tgt, monDmg(m), m, { src: m, force: true })) { m.hp = 0; m.dead = true; m.dying = .01; if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1); game.particles.smoke(m.x, m.y, 8, 4, { color: '#dde' }); sfx('wail', { vol: .4 }); } }
      break;
    }
    case 'n': case 'y': {
      if (m.ch === 'y') {
        m.vis -= dt;
        if (m.vis <= -1.4) { m.vis = 2; const v = fl.dir(m.x, m.y); if (v) { const k = Math.min(48, td - 14); if (k > 0) { const nx = m.x + v[0] * k, ny = m.y + v[1] * k; if (!W.map.solidAt(nx, ny)) { m.x = nx; m.y = ny; } } } game.particles.smoke(m.x, m.y, 6, 4, { dark: true }); }
        m.alpha = m.vis > 0 ? 1 : .0;
      }
      if (m.tell > 0) { m.tell -= dt; m.vx *= .7; m.vy *= .7; m.facing = ang; if (m.tell <= 0) { m.swingActive = .12; } }
      else if (m.swingActive > 0) {
        m.swingActive -= dt; const reach = 14 + tgt.r;
        if (td < reach + 4 && !m.hitDone) { m.hitDone = true; hurtHero(tgt, monDmg(m), m, { src: m }); sfx('thud'); }
      } else {
        m.hitDone = false; steerTo(m, tgt.x, tgt.y, fl, dt, spd);
        if (td < 12 + tgt.r && m.cool <= 0) { m.tell = m.ch === 'y' ? .3 : .32; m.cool = .9; m.swing.start(); m.swing.t = 0; }
      }
      m.swing.update(dt);
      break;
    }
    case 'o': {
      const keep = td > 110 ? 1 : td < 56 ? -1.3 : 0;
      if (keep > 0) steerTo(m, tgt.x, tgt.y, fl, dt, spd);
      else if (keep < 0) { m.vx += (-Math.cos(ang) * spd * 1.3 - m.vx) * Math.min(1, dt * 8); m.vy += (-Math.sin(ang) * spd * 1.3 - m.vy) * Math.min(1, dt * 8); }
      else { m.vx *= .85; m.vy *= .85; }
      m.facing = ang;
      if (m.tell > 0) { m.tell -= dt; if (m.tell <= 0) lobPot(m, m.aimAt); }
      else if (m.cool <= 0 && td < 130 && td > 30) { m.tell = .6; m.cool = [2.2, 1.9, 1.6][m.rank - 1]; m.aimAt = { x: tgt.x + (tgt.vx || 0) * .6, y: tgt.y + (tgt.vy || 0) * .6 }; }
      break;
    }
    case 'i': {
      if (m.tell > 0) { m.tell -= dt; m.vx *= .8; m.vy *= .8; m.facing = ang; if (m.tell <= 0) fireball(m, tgt); }
      else {
        steerTo(m, tgt.x, tgt.y, fl, dt, spd); m.z = 6 + Math.sin(m.t * 5) * 1.2;
        if (td < 12 + tgt.r && m.cool <= 0) { m.cool = .9; hurtHero(tgt, monDmg(m), m, { src: m }); sfx('bite'); }
        else if (td > 30 && td < 160 && m.cool <= 0 && W.map.los(m.x, m.y, tgt.x, tgt.y)) { m.tell = .35; m.cool = 1.8; }
      }
      break;
    }
    case 'x': snatcherStep(m, dt, hs); break;
    case 't': titheStep(m, dt, hs); break;
  }
  m.update(dt, W.map);
}
function lobPot(m, at) {
  const T = Math.hypot(at.x - m.x, at.y - m.y) / 80 + .4;
  W.foe.push({ kind: 'pot', x: m.x, y: m.y, z: 10, sx: m.x, sy: m.y, tx: at.x, ty: at.y, t: 0, T, dmg: monDmg(m), from: m });
  sfx('lob');
}
function fireball(m, tgt) {
  const a = Math.atan2(tgt.y - m.y, tgt.x - m.x), sp = 110, d = (m.T.fire[m.rank - 1] || 8) * TUNE.monsterDamage;
  W.foe.push({ kind: 'fire', x: m.x + Math.cos(a) * 6, y: m.y + Math.sin(a) * 6, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2.4, dmg: d, from: m });
  sfx('fire');
}
function foeStep(dt) {
  for (const f of W.foe) {
    if (f.dead) continue;
    if (f.kind === 'pot') {
      f.t += dt; const u = Math.min(1, f.t / f.T); f.x = f.sx + (f.tx - f.sx) * u; f.y = f.sy + (f.ty - f.sy) * u; f.z = 6 + Math.sin(u * Math.PI) * 40;
      if (u >= 1) { f.dead = true; game.particles.dust(f.tx, f.ty, 3, 6, { color: '#c8a870' }); sfx('smash'); for (const h of W.heroes) if (!h.down && Math.hypot(h.x - f.tx, h.y - f.ty) < 13) hurtHero(h, f.dmg, { x: f.tx, y: f.ty }, { src: f }); for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - f.tx, it.y - f.ty) < 10) it.gone = true; }
      continue;
    }
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (f.life <= 0 || (W.map.solidAt(f.x, f.y) && W.map.heightAt(f.x, f.y) > f.z)) { f.dead = true; game.particles.fire(f.x, f.y, 6, 3); continue; }
    for (const h of W.heroes) if (!h.down && Math.hypot(h.x - f.x, h.y - f.y) < h.r + 3) { hurtHero(h, f.dmg, f, { src: f }); f.dead = true; game.particles.fire(f.x, f.y, 6, 4); break; }
    if (!f.dead) for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - f.x, it.y - f.y) < 6) { it.gone = true; f.dead = true; puff(it.x, it.y, 6, 6, '#a64'); ftext(it.x, it.y, 'TOAST', '#fa6'); break; }
  }
  W.foe = W.foe.filter(f => !f.dead);
}
function snatcherStep(m, dt, hs) {
  if (m.stolen) {
    if (!m.fleeFlow) m.fleeFlow = new Flow(W.map);
    if (!m.escape) { const pts = (W.meta.points && W.meta.points.escape) || []; m.escape = pts.length ? pts[0] : (m.home || { x: m.x, y: m.y }); }
    m.fleeFlow.update([[Math.floor(m.escape.x / TS), Math.floor(m.escape.y / TS)]]);
    const v = m.fleeFlow.dir(m.x, m.y), sp = monSpeed(m) * 1.1; if (v) { m.vx = v[0] * sp; m.vy = v[1] * sp; m.facing = Math.atan2(v[1], v[0]); }
    if (Math.hypot(m.escape.x - m.x, m.escape.y - m.y) < 10) { m.escapedWith = true; m.dead = true; m.dying = .01; if (m.gen) m.gen.kids--; puff(m.x, m.y, 6, 8, '#223'); say('stolen', { force: true, item: m.stolen.kind.toUpperCase() }); }
    return;
  }
  const tgt = nearestHero(m); if (!tgt) return;
  steerTo(m, tgt.x, tgt.y, W.flow, dt, monSpeed(m));
  if (Math.hypot(tgt.x - m.x, tgt.y - m.y) < m.r + tgt.r + 1) {
    let item = null;
    if (tgt.flasks > 0) { tgt.flasks--; item = { kind: 'flask' }; } else if (tgt.keys > 0) { tgt.keys--; item = { kind: 'key' }; } else if (tgt.amulet) { item = { kind: 'amulet', sub: tgt.amulet }; tgt.amulet = null; tgt.amuletT = 0; }
    if (item) { m.stolen = item; if (!m.home) m.home = { x: m.x, y: m.y }; m.escape = (W.meta.points && W.meta.points.escape && W.meta.points.escape[0]) || m.home; sfx('steal'); say('stolen', { force: true, item: item.kind.toUpperCase() }); ftext(m.x, m.y, 'STOLEN!', '#f88'); }
    else { m.cool = 2; m.vx = -m.vx; }
  }
}
function titheStep(m, dt, hs) {
  const tgt = nearestHero(m); if (!tgt) return;
  steerTo(m, tgt.x, tgt.y, W.flow, dt, monSpeed(m), true);
  m.z = 6 + Math.sin(m.t * 3) * 2;
  let leave = true;
  for (const h of hs) {
    if (h.amulet === 'ironskin' && h.amuletT > 0) continue;
    if (Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + 2) {
      m.drainT = (m.drainT || 0) + dt;
      const done = m.drained.get(h) || 0;
      if (done < 200) { while (m.drainT >= .1 && (m.drained.get(h) || 0) < 200) { m.drainT -= .1; h.hp -= 6; m.drained.set(h, (m.drained.get(h) || 0) + 6); h.flash = .1; if (h.hp <= 0 && !DEV.god) { heroFall(h); break; } } }
      if ((m.drained.get(h) || 0) >= 200) { m.dead = true; m.dying = .01; W.tithe = null; say('tithePaid', { force: true }); puff(m.x, m.y, 8, 10, '#a8c'); sfx('wail'); break; }
    }
  }
}

// ---------- generators ----------
function gensStep(dt) {
  const n = W.heroes.filter(h => !h.down).length || 1, cap = Math.min(Math.round(TUNE.maxMonsters * (1 + .3 * (n - 1))), W.net ? 100 : 999);
  const alive = W.mons.filter(m => !m.dead).length;
  for (const g of W.gens) {
    if (g.dead) continue; g.flash = Math.max(0, g.flash - dt); g.breathe += dt;
    if (DEV.gensOff) continue;
    g.t -= dt; if (g.t > 0) continue;
    const dist0 = Math.min(...W.heroes.filter(h => !h.down).map(h => Math.hypot(h.x - g.x, h.y - g.y)), 1e9);
    const iv = [3, 2.2, 1.5][g.rank - 1] * TUNE.spawnInterval / (1 + .25 * (n - 1));
    g.t = iv * rnd(.85, 1.15);
    if (dist0 > 15 * TS || g.kids >= 8 || alive >= cap) continue;
    const opts = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const cx = Math.floor(g.x / TS) + dx, cy = Math.floor(g.y / TS) + dy; if (W.map.walkable(cx, cy)) opts.push([(cx + .5) * TS, (cy + .5) * TS]); }
    if (!opts.length) continue;
    const [sx, sy] = pick(opts), m = newMonster(g.G.spawn, sx, sy, g.rank, { emerge: .4, home: { x: g.x, y: g.y } }); m.gen = g; g.kids++;
    W.mons.push(m); puff(sx, sy, 3, 3, '#a98');
  }
}

// ---------- the Dinner Bell ----------
function ringBell(h) {
  const b = W.bellObj; if (!b || b.rung) return; b.rung = true; b.t = 0;
  for (const o of W.heroes) o.bell = 0; h.bell = 12; W.menuHero = h; sfx('bell'); say('bell', { hero: h, force: true });
  W.bellFlow.update([[Math.floor(h.x / TS), Math.floor(h.y / TS)]]);
}
function bellStep(dt) {
  const b = W.bellObj; if (!b) return;
  if (b.rung) b.t += dt;
  if (!b.rung) for (const h of W.heroes) if (!h.down && Math.hypot(h.x - b.x, h.y - b.y) < 10) { ringBell(h); break; }
  const mh = W.menuHero;
  if (mh) {
    mh.bell -= dt;
    if (mh.bell <= 0 || mh.down) W.menuHero = null;
    else { for (const o of W.heroes) if (o !== mh && !o.down && Math.hypot(o.x - mh.x, o.y - mh.y) < 12) { mh.bell = 0; o.bell = 12; W.menuHero = o; sfx('bell'); } W.bellFlow.update([[Math.floor(W.menuHero ? W.menuHero.x / TS : 0), Math.floor(W.menuHero ? W.menuHero.y / TS : 0)]]); }
  }
}

// ---------- King Famish ----------
function bossPhaseCheck(m) {
  const f = m.hp / m.maxhp;
  if (m.phase === 1 && f < .66) { m.phase = 2; say('boss2', { force: true }); game.shake(6); sfx('roar'); m.stun = 1; }
  else if (m.phase === 2 && f < .33) { m.phase = 3; say('boss3', { force: true }); game.shake(6); sfx('roar'); W.fog = 1; m.stun = 1; }
}
function bossStep(m, dt) {
  const hs = W.heroes.filter(h => !h.down); if (!hs.length) return;
  if (m.state === 'sleep') { if (hs.some(h => Math.hypot(h.x - m.x, h.y - m.y) < 22 * TS || h.x > 12 * TS)) { m.state = 'idle'; m.cool = 1.5; say('boss', { force: true }); sfx('roar'); W.shake = 1; } return; }
  let tgt = hs[0], bd = 1e9; for (const h of hs) { const d = Math.hypot(h.x - m.x, h.y - m.y); if (d < bd) { bd = d; tgt = h; } }
  const ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
  m.facing = ang;
  if (m.chargeT > 0) { m.chargeT -= dt; m.vx = Math.cos(m.chargeA) * 130; m.vy = Math.sin(m.chargeA) * 130; for (const h of hs) if (Math.hypot(h.x - m.x, h.y - m.y) < m.r + h.r + 2 && !h.chargeHit) { h.chargeHit = 1; hurtHero(h, 14, m, { force: true }); h.push(Math.cos(m.chargeA) * 200, Math.sin(m.chargeA) * 200); } if (m.hitWall) m.chargeT = 0; if (m.chargeT <= 0) { m.stun = 1.2; for (const h of hs) h.chargeHit = 0; } m.update(dt, W.map); return; }
  if (m.tell > 0) {
    m.tell -= dt; m.vx *= .8; m.vy *= .8;
    if (m.tell <= 0) {
      switch (m.attack) {
        case 'plates': for (let k = -1; k <= 1; k++) { const a = ang + k * .35, d = Math.min(bd + 10, 150); W.foe.push({ kind: 'pot', x: m.x, y: m.y, z: 20, sx: m.x, sy: m.y, tx: m.x + Math.cos(a) * d, ty: m.y + Math.sin(a) * d, t: 0, T: d / 90 + .4, dmg: 12 * TUNE.monsterDamage, from: m }); } sfx('lob'); break;
        case 'stomp': W.rings = W.rings || []; W.rings.push({ x: m.x, y: m.y, t: 0, big: true, boss: true }); game.shake(8); sfx('boom'); for (const h of hs) if (Math.hypot(h.x - m.x, h.y - m.y) < 70) { hurtHero(h, 14 * TUNE.monsterDamage, m, { force: true }); h.stun = .5; } m.stun = .5; break;
        case 'charge': m.chargeT = 1.1; m.chargeA = ang; sfx('roar'); break;
        case 'eat': { let pl = null, pd = 1e9; for (const it of W.items) if (!it.gone && it.kind === 'platter') { const d = Math.hypot(it.x - m.x, it.y - m.y); if (d < pd) { pd = d; pl = it; } } if (pl) { pl.gone = true; m.hp = Math.min(m.maxhp, m.hp + 20); puff(pl.x, pl.y, 12, 8, '#fa8'); ftext(m.x, m.y, 'NOM +20', '#fa6'); sfx('chomp'); } m.stun = 1.5; break; }
      }
      m.cool = m.phase === 1 ? 2.2 : m.phase === 2 ? 1.7 : 1.3;
    }
    m.update(dt, W.map); return;
  }
  if (m.cool <= 0) {
    const opts = m.phase === 1 ? ['plates', 'stomp'] : m.phase === 2 ? ['plates', 'stomp', 'charge', 'eat'] : ['plates', 'stomp', 'charge', 'charge'];
    m.attack = pick(opts); if (m.attack === 'stomp' && bd > 80) m.attack = 'plates'; if (m.attack === 'eat' && !W.items.some(i => !i.gone && i.kind === 'platter')) m.attack = 'charge';
    m.tell = m.attack === 'charge' ? .9 : m.attack === 'stomp' ? .8 : m.attack === 'eat' ? .6 : 1; sfx('tell');
  } else { const v = W.flow.dir(m.x, m.y); const sp = 30 * TUNE.monsterSpeed; if (v && bd > 60) { m.vx = v[0] * sp; m.vy = v[1] * sp; } else { m.vx *= .9; m.vy *= .9; } }
  // tureens spill ghosts in phase 3 (generators do it); fog drains
  if (m.phase === 3) W.fog = Math.min(1, W.fog + dt * .5);
  m.update(dt, W.map);
}
function bossDie(m) {
  W.done = true; W.bossDown = true; say('bossDead', { force: true });
  game.particles.explosion(m.x, m.y, 10, 2); game.shake(10); game.flash('#fff', .8); sfx('bigboom');
  for (const h of W.heroes) h.score += h.bossDmg > 0 ? 1000 : 0;
  const top = W.heroes.slice().sort((a, b) => b.bossDmg - a.bossDmg)[0]; if (top) top.score += 10000;
  W.fog = 0; W.victoryT = 3;
  for (const g of W.gens) if (!g.dead) { g.dead = true; }
  for (const o of W.mons) if (o !== m && !o.dead) { o.dead = true; o.dying = .01; }
  W.stairs.length = 0;
}
