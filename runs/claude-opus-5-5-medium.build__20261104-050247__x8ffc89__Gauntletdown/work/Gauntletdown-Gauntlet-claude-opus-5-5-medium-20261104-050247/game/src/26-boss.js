/* 26-boss: King Famish. Phase 1 "Dinner is served" (plates and the stomp; tureens breed ghosts), phase 2 "Second
 * helpings" (he walks to a platter and eats, healing; shoot the food; gnasher waves), phase 3 "The Gaunt hungers"
 * (ribs open: hits from the front count double; charges, famine fog, the Tithe). Then the Iron Gauntlet. */

function setupBoss(w) {
  const k = w.p.boss || { x: w.map.w * T / 2, y: 3 * T }, n = Math.max(1, PARTY.length);
  const hp = Math.round(400 * (1 + .5 * (n - 1)) * (RUN.loop > 1 ? 1.3 : 1));
  w.boss = { x: k.x, y: k.y + 8, r: 12, hp, maxHp: hp, phase: 1, alive: true, intro: 2.5, state: 'idle', st: 0, t: 0, face: Math.PI / 2, throwT: 2, waveT: 6, eatT: 0, plate: null, fogT: 4, chargeT: 3,
    vx: 0, vy: 0, body: new E.Body({ x: k.x, y: k.y + 8, r: 12, gravity: 0 }), home: { x: k.x, y: k.y + 10 }, denied: 0, titheSent: false, fogAt: null,
    inFog(h) { const f = this.fogAt; if (!f || W.t > f.until) return false; const d = Math.hypot(h.x - f.x, h.y - f.y), a = Math.abs(E.angDiff(f.a, Math.atan2(h.y - f.y, h.x - f.x))); return d < 110 && a < .5; } };
  happen('king', { what: 'intro' });
}

function stepBoss(dt) {
  const B = W.boss;
  if (!B || !B.alive) return;
  B.t += dt;
  if (B.intro > 0) { B.intro -= dt; if (B.intro <= 0) { say('king_intro', null, 3); happen('king', { what: 'line', line: STORY.king.intro }); } return; }
  const heroes = living(); if (!heroes.length) return;
  const near = heroes.reduce((a, h) => Math.hypot(h.x - B.x, h.y - B.y) < Math.hypot(a.x - B.x, a.y - B.y) ? h : a, heroes[0]);
  const dn = Math.hypot(near.x - B.x, near.y - B.y), frac = B.hp / B.maxHp;
  // phases
  if (B.phase === 1 && frac < .7) { B.phase = 2; B.state = 'roar'; B.st = 1; happen('king', { what: 'phase', phase: 2, line: STORY.king.p2 }); say('king_eating', null, 3); }
  if (B.phase === 2 && frac < .35) { B.phase = 3; B.state = 'roar'; B.st = 1.2; happen('king', { what: 'phase', phase: 3, line: STORY.king.p3 }); say('king_open', null, 3); }
  if (B.phase === 3 && !B.titheSent) { B.titheSent = true; const s = W.p.starts[0]; spawnMon('tithe', s.x, s.y - 40, 1, { awake: true }); say('tithe_comes', null, 3); }
  B.st -= dt; B.vx = B.vy = 0;
  const go = (tx, ty, sp) => { const d = Math.hypot(tx - B.x, ty - B.y); if (d > 2) { B.vx = (tx - B.x) / d * sp; B.vy = (ty - B.y) / d * sp; B.face = Math.atan2(B.vy, B.vx); } return d; };
  switch (B.state) {
    case 'roar': if (B.st <= 0) B.state = 'idle'; break;
    case 'stomp': if (B.st <= 0) { happen('king', { what: 'stomp', x: B.x, y: B.y }); for (const h of heroes) if (Math.hypot(h.x - B.x, h.y - B.y) < 44) hurtHero(h, 15, { from: B, kind: 'stomp' }); B.state = 'idle'; B.throwT = Math.max(B.throwT, .8); } break;
    case 'eat': {
      const p = B.plate;
      if (!p || p.gone) { B.state = 'idle'; B.plate = null; break; }
      B.eatT -= dt; B.hp = Math.min(B.maxHp, B.hp + B.maxHp * .05 * dt);
      if (B.eatT <= 0) { p.gone = true; happen('gone', { id: p.id, by: -2, kind: p.kind, x: p.x, y: p.y }); happen('king', { what: 'gulp', x: p.x, y: p.y }); B.state = 'idle'; B.plate = null; }
      break;
    }
    case 'walk': {
      const p = B.plate;
      if (!p || p.gone) { B.state = 'idle'; B.plate = null; break; }
      const side = p.x < W.map.w * T / 2 ? -1 : 1, tx = p.x + side * 22, ty = p.y;
      if (go(tx, ty, 34) < 6 || B.st <= 0) { B.state = 'eat'; B.eatT = 2.5; happen('king', { what: 'eat', x: p.x, y: p.y }); say('king_eating', null, 2); }
      break;
    }
    case 'chargeWind': B.face = B.chargeA; if (B.st <= 0) { B.state = 'charge'; B.st = .9; } break;
    case 'charge': {
      B.vx = Math.cos(B.chargeA) * 170; B.vy = Math.sin(B.chargeA) * 170;
      for (const h of heroes) if (Math.hypot(h.x - B.x, h.y - B.y) < B.r + h.r + 2 && !(h.cd.charge > 0)) { h.cd.charge = .8; hurtHero(h, 15, { from: B, kind: 'charge' }); }
      if (B.st <= 0 || B.body.hitWall) { B.state = 'roar'; B.st = .6; if (B.body.hitWall) happen('king', { what: 'stomp', x: B.x, y: B.y, small: true }); }
      break;
    }
    case 'fogWind': if (B.st <= 0) { B.fogAt = { x: B.x, y: B.y, a: B.face, until: W.t + 3 }; happen('king', { what: 'fog', x: B.x, y: B.y, a: B.face }); B.state = 'idle'; } break;
    default: {   // idle: choose the next thing
      B.face = angTo(B, near);
      B.throwT -= dt; B.waveT -= dt; B.chargeT -= dt; B.fogT -= dt;
      if (dn < 40 && B.phase < 3) { B.state = 'stomp'; B.st = .5; happen('king', { what: 'stompwind', x: B.x, y: B.y }); break; }
      if (B.phase === 2) {
        const plates = W.items.filter(i => i.kind === 'platter' && !i.gone);
        if (plates.length && B.throwT < 1.2 && R() < .02) { B.plate = plates.reduce((a, p) => Math.hypot(p.x - B.x, p.y - B.y) < Math.hypot(a.x - B.x, a.y - B.y) ? p : a); B.state = 'walk'; B.st = 5; break; }
        if (!plates.length && !B.raged) { B.raged = true; say('king_rage', null, 3); B.state = 'roar'; B.st = .8; break; }
        if (B.waveT <= 0) { B.waveT = 12; bossWave(); }
      }
      if (B.phase === 3) {
        if (B.waveT <= 0) { B.waveT = 14; bossWave(); }
        if (B.chargeT <= 0) { B.chargeT = 4; B.chargeA = angTo(B, near); B.state = 'chargeWind'; B.st = .6; happen('king', { what: 'chargewind', x: B.x, y: B.y, a: B.chargeA }); break; }
        if (B.fogT <= 0) { B.fogT = 7; B.state = 'fogWind'; B.st = .5; break; }
      }
      if (B.throwT <= 0) { B.throwT = B.phase === 2 && B.raged ? 1.6 : 2.5; bossPlates(near); }
      if (B.phase === 1) go(B.home.x + Math.sin(B.t * .4) * 30, B.home.y + 20, 20);
      else if (dn > 70) go(near.x, near.y, 26);
    }
  }
  const b = B.body; b.x = B.x; b.y = B.y; b.vx = B.vx; b.vy = B.vy; b.update(dt, W.map); B.x = b.x; B.y = b.y;
  for (const h of heroes) { const dx = h.x - B.x, dy = h.y - B.y, d = Math.hypot(dx, dy), mn = h.r + B.r; if (d < mn && d > .01) { h.x += dx / d * (mn - d); h.y += dy / d * (mn - d); h.body.x = h.x; h.body.y = h.y; W.map.collide(h.body); h.x = h.body.x; h.y = h.body.y; } }
}
function bossPlates(h) {
  const B = W.boss; B.throwAt = W.t;
  for (const k of [-1, 0, 1]) {
    const a = angTo(B, h) + k * .35, d = Math.min(150, Math.hypot(h.x - B.x, h.y - B.y)), tx = B.x + Math.cos(a) * d, ty = B.y + Math.sin(a) * d;
    const v = E.arc({ x: B.x, y: B.y, z: 30 }, { x: tx, y: ty, z: 0 }, 300, { apex: 50 });
    W.shots.push({ id: nid(), team: 'foe', kind: 'plate', x: B.x, y: B.y, z: 30, vx: v.vx, vy: v.vy, vz: v.vz, grav: 300, r: 3, dmg: 10, life: v.t + .05, tx, ty, land: W.t + v.t, splash: 12, by: -1, rot: 0 });
  }
  happen('king', { what: 'throw', x: B.x, y: B.y });
}
function bossWave() {
  const pts = (W.fd.points && W.fd.points.wave) || [];
  for (const [cx, cy] of pts.slice(0, 3)) for (let i = 0; i < 2; i++) {
    const x = (cx + .5) * T + (i ? 6 : -6), y = (cy + .5) * T;
    if (W.map.walkable(Math.floor(x / T), Math.floor(y / T)) && W.mons.length < monCap()) spawnMon('gnasher', x, y, 2, { awake: true, emerge: true });
  }
  happen('king', { what: 'wave' });
}
function bossHurt(amt, by, kind, ang) {
  const B = W.boss; if (!B || !B.alive || B.intro > 0 || W.net === 'client') return;
  let dmg = amt;
  if (B.phase === 3 && kind !== 'magic' && ang !== undefined && Math.abs(E.angDiff(ang + Math.PI, B.face)) < .9) { dmg *= 2; happen('king', { what: 'ribhit', x: B.x, y: B.y }); }
  if (CHEAT.onehit) dmg = B.maxHp;
  B.hp -= dmg; B.hurtT = .15;
  happen('bosshit', { x: B.x, y: B.y, dmg: Math.round(dmg) });
  if (B.hp <= 0) {
    B.hp = 0; B.alive = false; B.state = 'dead';
    if (by) addScore(by, 10000, B);
    for (const m of W.mons) if (!m.dead) killMon(m, null);
    for (const g of W.gens) g.dead = true;
    happen('king', { what: 'dead', x: B.x, y: B.y, line: STORY.king.dead });
    say('king_dead', by, 3);
    let gx = B.x, gy = B.y + 14;
    for (let rr = 0; rr < 6 && !W.map.walkable(Math.floor(gx / T), Math.floor(gy / T)); rr++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = B.x + dx * 16 * (rr + 1), y = B.y + dy * 16 * (rr + 1); if (W.map.walkable(Math.floor(x / T), Math.floor(y / T))) { gx = x; gy = y; break; } }
    const g = dropItem('gauntlet', gx, gy);
    g.delay = 1.5;
  }
}
function bossGauntletTaken(h) { W.done = { by: h.pi, ending: true, at: { x: h.x, y: h.y } }; happen('stairs', { pi: h.pi, ending: true }); }

/* ---- the step order (each 1/120 s): heroes, generators, monsters, the boss, projectiles, features ---- */
function stepWorld(dt) {
  if (!W || W.done && W.doneT > 3) return;
  W.t += dt;
  if (W.done) W.doneT = (W.doneT || 0) + dt;
  for (const h of W.heroes) stepHero(h, dt);
  if (W.net === 'client') return;
  stepGens(dt);
  stepMonsters(dt);
  stepBoss(dt);
  stepShots(dt);
  stepFeatures(dt);
  // the Dinner Bell's hot potato: a marked hero who touches a friend passes it on
  if (W.bell) {
    const m = W.heroes[W.bell.pi] || W.heroes.find(h => h.pi === W.bell.pi);
    if (m) for (const o of W.heroes) if (o !== m && o.alive && Math.hypot(o.x - m.x, o.y - m.y) < 12 && !(m.cd.bell > 0)) { W.bell = { pi: o.pi }; o.menu = 12; m.menu = 0; o.cd.bell = 1; say('bell_pass', o, 3); happen('bell', { pi: o.pi, x: o.x, y: o.y, pass: true }); break; }
  }
  for (const it of W.items) if (it.delay > 0) it.delay -= dt;
  W.items = W.items.filter(i => !i.gone);
}
