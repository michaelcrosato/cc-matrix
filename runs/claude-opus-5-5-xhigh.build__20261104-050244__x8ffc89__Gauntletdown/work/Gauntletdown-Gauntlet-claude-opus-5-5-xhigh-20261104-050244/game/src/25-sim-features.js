/* ---- PROJECTILES: hero shots hit monsters, generators, the King, shootable food and (from floor 6) friends ---- */
function stepShots(dt) {
  // lobbed crocks and plates land: a splash where they break
  for (const b of W.eshots.list) if (b.grav && !b.dead && b.t + dt >= b.life) { b.dead = true; landSplash(b); }
  W.shots.update(dt, W.map);
  W.eshots.update(dt, W.map);
  const heroTeam = W.shots.list;
  if (heroTeam.length) {
    const targets = W.monsters.filter(m => !m.dead && !m.rise && !(m.ai === 'fryar' && m.hidden));
    W.shots.hit(targets, (b, m) => {
      const h = HB(b.owner) || null;
      if (m.D.immune) { b.dead = true; damage(m, b.dmg, { by: h, kind: 'shot' }); return; }
      damage(m, b.dmg, { by: h, kind: 'shot' });
      if (b.splash) splash(b, h, m);
      if (--b.left <= 0) b.dead = true;
    }, 'hero');
    W.shots.hit(W.gens.filter(g => !g.dead), (b, g) => { const h = HB(b.owner); damage(g, b.dmg, { by: h, kind: 'shot' }); if (b.splash) splash(b, h, g); b.dead = true; }, 'hero');
    if (W.boss && !W.boss.dead) W.shots.hit([W.boss], (b, k) => { const h = HB(b.owner), front = k.open && Math.abs(E.angDiff(Math.atan2(-b.vy, -b.vx), k.facing)) < 1.1; damage(k, b.dmg * (front ? 2 : 1), { by: h, kind: 'shot' }); b.dead = true; }, 'hero');
    // shootable items: cider and platters are lost (the Gaunt names the culprit), stew is spilled (good), a flask goes off
    const shootable = W.items.filter(i => !i.gone && i.D.shoot);
    if (shootable.length) W.shots.hit(shootable.map(i => ({ x: i.x, y: i.y, r: 4, it: i })), (b, q) => { b.dead = true; shotItem(q.it, HB(b.owner)); }, 'hero');
    // friends: from floor 6 on (and in Descent II), a shot that touches an ally stuns them a moment
    if (game.settings.allyStun && (W.F.no >= 6 || W.descent > 1)) W.shots.hit(W.heroes.filter(q => q.alive), (b, q) => {
      if (q.id === b.owner) return;
      b.dead = true; if (q.stun <= 0) { q.stun = .35; say('ally_shot', HB(b.owner), 1); emit('allyStun', { h: q, by: HB(b.owner) }); }
    }, 'hero');
  }
  // enemy missiles hit heroes; fireballs cook the food they touch
  W.eshots.hit(W.heroes.filter(h => h.alive), (b, h) => { damage(h, b.dmg, { kind: 'fire', from: b }); emit('burn', { h, b }); }, 'foe');
  const food = W.items.filter(i => !i.gone && i.D.shoot && i.D.kind === 'food');
  if (food.length) W.eshots.hit(food.map(i => ({ x: i.x, y: i.y, r: 4, it: i })), (b, q) => { b.dead = true; q.it.gone = true; emit('cooked', { it: q.it }, ['gone', q.it.id, -1]); }, 'foe');
}
function landSplash(b) {
  for (const h of W.heroes) if (h.alive && Math.hypot(h.x - b.x, h.y - b.y) < (b.splash || 12) + h.r) damage(h, b.dmg, { kind: 'fire', from: b });
  emit('shatter', { x: b.x, y: b.y, kind: b.kind });
}
/** the Hexer's splash: 1 to everything else within 12 */
function splash(b, h, except) {
  for (const m of W.monsters) if (!m.dead && m !== except && !m.D.immune && Math.hypot(m.x - b.x, m.y - b.y) < 12 + m.r) damage(m, 1, { by: h, kind: 'shot' });
  emit('hexBurst', { x: b.x, y: b.y });
}
function shotItem(it, h) {
  if (it.gone) return;
  it.gone = true;
  if (it.type === 'flask') { blast(h, null, .5, { x: it.x, y: it.y, r: 80 }); say('shot_flask', h, 2); }
  else if (it.type === 'stew') { say('shot_stew', h, 1); }
  else { if (h) h.stats.foodShot++; say(it.type === 'cider' ? 'shot_cider' : (W.boss ? 'king_eating' : 'shot_feast'), h, 2); if (W.boss && it.type === 'platter') W.boss.denied = (W.boss.denied || 0) + 1; }
  emit('shotItem', { it, h }, ['gone', it.id, h ? h.id : -1]);
}
function hitCracked(cx, cy, dmg, h) {
  const k = cx + ',' + cy; if (!W.cracked.has(k)) return;
  const left = W.cracked.get(k) - dmg;
  if (left > 0) { W.cracked.set(k, left); emit('crack', { cx, cy }); return; }
  W.cracked.delete(k); W.map.set(cx, cy, 0);
  if (first('cracked')) say('tip_cracked', h, 1);
  emit('wall', { cx, cy, kind: 'cracked' }, ['wall', cx, cy]);
}

/* ---- a client draws its own shots at once (cosmetic: they stop at walls, never deal damage) ---- */
function clientShot(h, aim) {
  const s = h.D.shot;
  W.shots.fire({ x: h.x + Math.cos(aim) * 7, y: h.y + Math.sin(aim) * 7, z: 12, vx: Math.cos(aim) * s.speed, vy: Math.sin(aim) * s.speed, r: 3, dmg: 0, life: 220 / s.speed, team: 'cosmetic', kind: s.kind, color: h.color, rot: aim, owner: h.id });
}
function stepClientShots(dt) {
  W.shots.update(dt, W.map);
  W.shots.hit(W.monsters.filter(m => !m.dead), b => { emit('sparkle', { x: b.x, y: b.y }); }, 'cosmetic');
  W.eshots.update(dt, W.map);
}
/** a client hides an item it touched at once; the host's 'gone' confirms it (or it shows again after half a second) */
function clientPickups(h) {
  for (const it of W.items) {
    if (it.gone || it.pending) continue;
    if (!near(h, it, it.D.onTable ? h.r + 12 : h.r + 5)) continue;
    if (it.D.kind === 'chest' && it.D.locked && h.keys <= 0) continue;
    it.pending = W.real + .5; emit('takeLocal', { h, it });
  }
  for (const it of W.items) if (it.pending && W.real > it.pending && !it.gone) it.pending = 0;
}

/* ---- LEVEL FEATURES ---- */
function stepFeatures(dt) {
  for (const h of W.heroes) {
    if (!h.alive) continue;
    const cx = cellOf(h.x), cy = cellOf(h.y);
    // plates drop their trap walls (one shot)
    for (const p of W.plates) if (!p.used && p.cx === cx && p.cy === cy) springTrap(p, h);
    // transporters: to the pair, once off the pad
    const pi = W.pads.findIndex(p => p.cx === cx && p.cy === cy);
    if (pi < 0) { if (h.padLock !== -2 || !W.pads.some(p => Math.abs(p.cx - cx) + Math.abs(p.cy - cy) <= 1)) h.padLock = -1; }
    else if (h.padLock < 0) {
      const to = W.pads[pi ^ 1];
      if (to) {
        h.x = mid(to.cx); h.y = mid(to.cy); h.padLock = pi ^ 1; h.inv = Math.max(h.inv, .5); if (first('tele')) say('tip_tele', h, 1); emit('teleport', { h, from: W.pads[pi], to }, ['tele', h.id]);
        // one shared screen (solo, couch co-op, the demo): the party goes through together, so no one is left off screen
        if (W.role === 'local' || W.role === 'attract') {
          let k = 0;
          for (const q of W.heroes) {
            if (q === h || !q.alive) continue;
            const spots = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]];
            for (; k < spots.length; k++) { const [dx, dy] = spots[k], nx = to.cx + dx, ny = to.cy + dy; if (!W.map.cell(nx, ny) && W.map.walkable(nx, ny)) { q.x = mid(nx); q.y = mid(ny); q.padLock = -2; q.inv = Math.max(q.inv, .5); k++; break; } }
          }
        }
      }
    }
    // stun runes
    if (h.runeImmune <= 0 && W.runes.some(r => r.cx === cx && r.cy === cy)) { h.stun = .8; h.runeImmune = 2.3; if (first('stun')) say('tip_stun', h, 1); emit('stun', { h }); }
  }
  // force fields: 2 s on, 2 s off, a flicker before they switch on; anything touching takes 12 and a shove
  for (const g of W.beams) {
    const u = (W.t + g.phase) % 4; g.on = u >= 2; g.warn = u >= 1.6 && u < 2;
    if (!g.on) continue;
    for (const b of [...W.heroes.filter(h => h.alive), ...W.monsters.filter(m => !m.dead && !m.rise && m.ai !== 'tithe')]) {
      const c = g.cells.find(c => (g.dir === 'v' ? Math.abs(b.x - mid(c.cx)) < b.r + 1.5 && cellOf(b.y) === c.cy : Math.abs(b.y - mid(c.cy)) < b.r + 1.5 && cellOf(b.x) === c.cx));
      if (!c || b.grace['field']) continue;
      b.grace['field'] = .5; damage(b, 12, { kind: 'trap', from: { x: mid(c.cx), y: mid(c.cy) } });
      const s = g.dir === 'v' ? Math.sign(b.x - mid(c.cx)) || 1 : Math.sign(b.y - mid(c.cy)) || 1; b.push(g.dir === 'v' ? s * 140 : 0, g.dir === 'v' ? 0 : s * 140);
      if (b.isHero && first('field')) say('tip_field', b, 1);
      emit('zap', { b, c });
    }
  }
  // spikes: 1.6 s cycles, up for 0.5 s after a 0.25 s tremble
  for (const s of W.spikes) {
    const u = (W.t + s.phase) % 1.6; s.up = u > 1.1; s.trem = u > .85 && u <= 1.1;
    if (!s.up) continue;
    for (const b of [...W.heroes.filter(h => h.alive), ...W.monsters.filter(m => !m.dead && !m.D.fly)]) {
      if (cellOf(b.x) !== s.cx || cellOf(b.y) !== s.cy || b.grace['spike']) continue;
      b.grace['spike'] = .5; damage(b, 15, { kind: 'trap' });
      if (b.isHero && first('spikes')) say('tip_spikes', b, 1);
      emit('spiked', { b, s });
    }
  }
}
function springTrap(p, h) {
  p.used = true;
  for (const t of W.p.trapWalls[p.kind]) W.map.set(t.cx, t.cy, 0);
  for (const q of W.plates) if (q.kind === p.kind) q.used = true;
  if (first('trap')) say('tip_trap', h, 1);
  emit('trap', { p, h }, ['trap', p.kind]);
}

/* ---- what the Gaunt notices: health crossing 400, 200 and 100; the first sight of each monster and generator ---- */
function narratorTriggers(dt) {
  for (const h of W.heroes) {
    if (!h.alive || (!W.auth && h.remote)) continue;
    const w = h.warned;
    for (const [lvl, key] of [[100, 'dying'], [200, 'starving'], [400, 'fading']]) {
      if (h.hp < lvl && !w[lvl]) { w[lvl] = true; if (W.auth) say(key, h, 3); break; }
      if (h.hp > lvl + 60) w[lvl] = false;
    }
  }
  if (!W.auth || (W.firstT = (W.firstT || 0) - dt) > 0) return;
  W.firstT = .5;
  const live = liveHeroes(); if (!live.length) return;
  const seen = q => live.some(h => near(h, q, 9 * T) && W.map.los(h.x, h.y, q.x, q.y));
  for (const m of W.monsters) if (!m.dead && m.D.tip && !RUN.firsts['m_' + m.type] && seen(m)) { RUN.firsts['m_' + m.type] = true; if (m.ai !== 'tithe') say(m.D.tip, null, 1); if (m.ai === 'gnasher' || m.type === 'gnasher') RUN.firsts.pendingMelee = W.t + 6; break; }
  if (RUN.firsts.pendingMelee && W.t > RUN.firsts.pendingMelee) { RUN.firsts.pendingMelee = 0; if (first('melee')) say('tip_melee', null, 1); }
  for (const g of W.gens) if (!g.dead && !RUN.firsts.gen && seen(g)) { RUN.firsts.gen = true; say('tip_generator', null, 1, { thing: g.D.name.replace(/^THE /, '') }); break; }
  for (const it of W.items) if (!it.gone && (it.type === 'cider' || it.type === 'platter') && !RUN.firsts.dontshoot && seen(it)) { RUN.firsts.dontshoot = true; say('tip_dontshoot', null, 1); break; }
  for (const s of W.stairs) if (live.some(h => Math.hypot(h.x - mid(s.cx), h.y - mid(s.cy)) < 7 * T && W.map.los(h.x, h.y, mid(s.cx), mid(s.cy)))) { W.firsts.stairsSeen = true; if (!RUN.firsts.stairs) { RUN.firsts.stairs = true; say('tip_stairs', null, 1); } break; }
  if (W.boss && !RUN.firsts.kingNear) { RUN.firsts.kingNear = true; }
}
