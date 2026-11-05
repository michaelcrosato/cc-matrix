// Monsters, generators and the shots. Every monster follows the flow field of its nearest target (a hero, or the hero
// the Dinner Bell marked); a monster far from every hero waits. The kinds: hungerghosts touch and drain, gnashers swing
// clubs, pot-lobbers keep their distance and lob crocks over walls, cinder imps spit fireballs with sight, fryars hide
// and strike, snatchers steal an item and run, and the Tithe drains health and only magic can kill it.

function spawnMonster(kind, x, y, rank, placed, gen) {
  const def = MONSTERS[kind];
  const m = {
    kind, def, x, y, r: 6, rank: rank || 1, spawnRank: rank || 1, hp: def.base * (rank || 1), alive: true,
    cd: .3 + SIM() * .3, wind: 0, flash: 0, shrink: 0, gen: gen || null, bob: SIM() * 6, fade: 0, age: 0,
    body: new E.Body({ x, y, r: 6 }), hidden: false, visT: 2 + SIM(), fleeT: 0, loot: null, facing: 0
  };
  m.body.gravity = 0; m.body.friction = 0;
  m.id = WORLD.mid = (WORLD.mid || 0) + 1;   // a stable id, for the snapshots of a shared world
  if (placed) m.rank = 1 + (SIM() < .3 ? 1 : 0) + (WORLD.stage && WORLD.stage.rank > 1 && SIM() < .25 ? 1 : 0);
  if (WORLD.loop) m.rank = Math.min(3, m.rank + 1);   // Descent II: every rank up
  if (kind === 'tithe') { m.rank = 1; m.hp = 1; }
  m.hp = def.base * m.rank; m.spawnRank = m.rank;
  if (!placed && gen) gen.children++;
  if (m.rank > 3) m.rank = 3;
  WORLD.monsters.push(m);
  return m;
}

// The target a monster follows: the bell's hero while the bell rings, else the nearest hero (veiled heroes are
// ignored unless adjacent). Stench heroes make the monsters near them flee.
function pickTarget(m) {
  if (WORLD.bellHero && WORLD.bellT > 0 && !WORLD.bellHero.down) return WORLD.bellHero;
  let best = null, bd = Infinity;
  for (const h of WORLD.heroes) {
    if (h.down || !h.alive) continue;
    const d = Math.hypot(h.body.x - m.x, h.body.y - m.y);
    if (h.amulet && h.amulet.type === 'veil' && d > 40) continue;
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
function stenchHero(m) {
  for (const h of WORLD.heroes) if (!h.down && h.amulet && h.amulet.type === 'stench' && Math.hypot(h.body.x - m.x, h.body.y - m.y) < 64) return h;
  return null;
}

function stepMonsters(dt) {
  const W = WORLD, map = W.map;
  if (W.bellT > 0) W.bellT -= dt;
  if (W.bellT <= 0 && W.bellHero) W.bellHero = null;
  // the bell: a hero touching it rings it, and every monster takes that hero for twelve seconds
  if (W.bell && W.bell.alive) {
    const h = nearestHero(W.bell.x, W.bell.y, 10);
    if (h) { W.bell.alive = false; W.bellHero = h; W.bellT = 12; say('bell', h, true); game.audio.sfx('powerup', { pitch: .5 }); }
  }
  const monsterSpeedMul = TUNE.monsterSpeed * (CHEATS.freeze ? 0 : 1);
  const mdiff = DIFFICULTY[prefs.difficulty].monsterDamage * TUNE.monsterDamage;
  for (const m of W.monsters) {
    if (!m.alive) { m.fade -= dt; continue; }
    m.age += dt; m.bob += dt * 6; m.flash = Math.max(0, m.flash - dt); m.shrink = Math.max(0, m.shrink - dt);
    m.cd = Math.max(0, m.cd - dt); m.fleeT = Math.max(0, m.fleeT - dt);
    const target = pickTarget(m);
    if (!target) { m.body.vx = 0; m.body.vy = 0; continue; }
    const bd = Math.hypot(target.body.x - m.x, target.body.y - m.y);
    if (bd > 320 && !m.loot) { m.body.vx = 0; m.body.vy = 0; continue; }
    const hi = W.heroes.indexOf(target);
    if (!W.flows[hi]) W.flows[hi] = new E.FlowField(map);
    W.flows[hi].update(target.body.x, target.body.y);
    const toward = () => W.flows[hi].dir(m.x, m.y, target.body.x, target.body.y);
    const away = () => { const d = toward(); return [-d[0], -d[1]]; };
    let spd = m.def.speed[m.rank - 1] * monsterSpeedMul, dir = toward();
    const st = stenchHero(m);
    if (st) { dir = [m.x - st.body.x, m.y - st.body.y]; const l = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / l, dir[1] / l]; spd *= 1.2; }
    switch (m.def.ai) {
      case 'club': {
        if (m.wind > 0) { m.wind -= dt; spd = 0; if (m.wind <= 0 && bd < m.def.reach + target.body.r + 4) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; } }
        else if (m.cd <= 0 && bd < m.def.reach + target.body.r + 4) { m.wind = .32; spd = 0; }
        break;
      }
      case 'chase': {
        if (m.kind === 'ghost' && bd < m.def.reach + target.body.r + 3 && m.cd <= 0) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; m.bob += 1; game.audio.sfx('hurt', { vol: .15, pitch: 2 }); }
        break;
      }
      case 'lob': {
        if (bd < 56) { dir = away(); spd *= 1.1; m.fleeT = .5; }
        else if (bd < 110) spd = 0;
        if (m.cd <= 0 && bd < 200) {
          m.cd = m.def.cooldown * (m.rank === 3 ? .75 : 1);
          const lead = .8, tx = target.body.x + (target.body.vx || 0) * lead, ty = target.body.y + (target.body.vy || 0) * lead;
          W.crocks.push({ sx: m.x, sy: m.y, tx, ty, t: 0, dur: .8, dmg: m.def.damage[m.rank - 1] * mdiff, shadow: true });
          say('tip_lobber', target);
        }
        break;
      }
      case 'imp': {
        if (bd < 60) spd = 0;
        if (m.cd <= 0 && bd < 240 && map.sight({ x: m.x, y: m.y, z: 12 }, { x: target.body.x, y: target.body.y, z: 12 })) {
          m.cd = 1.8; m.wind = .35;
          const d = Math.hypot(target.body.x - m.x, target.body.y - m.y) || 1, sp = 110;
          W.foeShots.fire({ x: m.x, y: m.y, z: 12, vx: (target.body.x - m.x) / d * sp, vy: (target.body.y - m.y) / d * sp, vz: 0, r: 3, dmg: m.def.damage[m.rank - 1] * mdiff, life: 2.2, team: 'foe', color: '#ff8040', core: '#ffe0a0', data: { owner: m } });
          game.audio.sfx('hit', { vol: .2, pitch: 1.8 });
          say('tip_imp', target);
        }
        if (m.wind > 0) m.wind -= dt;
        break;
      }
      case 'fryar': {
        m.visT -= dt;
        if (m.visT <= 0) { m.hidden = !m.hidden; m.visT = m.hidden ? 1.4 : 2.0; }
        if (!m.hidden && m.wind > 0) { m.wind -= dt; spd = 0; if (m.wind <= 0 && bd < m.def.reach + target.body.r + 4) { damageHero(target, m.def.damage[m.rank - 1] * mdiff, m); m.cd = m.def.cooldown; } }
        else if (!m.hidden && m.cd <= 0 && bd < m.def.reach + target.body.r + 4) m.wind = .3;
        break;
      }
      case 'snatch': {
        if (!m.loot) {
          if (bd < m.def.reach + target.body.r) {
            // the snatch: a flask, else a key, else the active amulet
            let loot = null;
            if (target.flasks > 0) { target.flasks--; loot = { ch: 'm' }; }
            else if (target.keys > 0) { target.keys--; loot = { ch: 'k' }; }
            else if (target.amulet) { loot = { ch: 'a', amulet: target.amulet.type }; target.amulet = null; }
            if (loot) { m.loot = loot; m.fleeT = 20; say('tip_snatcher', target); say('stolen', target, true); game.audio.sfx('hurt', { pitch: 2 }); }
          }
        } else {
          // running with the loot: away from the hero, to the far side of the floor; it escapes after twenty seconds
          dir = away(); spd = m.def.speed[0];
          if (m.fleeT <= 0) { m.alive = false; m.fade = .3; m.loot = null; say('stolen', null, true); }
        }
        break;
      }
      case 'tithe': {
        if (bd < m.def.reach + target.body.r + 2) {
          m.drainT = (m.drainT || 0) - dt;
          if (m.drainT <= 0) {
            m.drainT = .1;
            target.titheDrain = (target.titheDrain || 0) + 6;
            if (!(target.amulet && target.amulet.type === 'ironskin') && !CHEATS.god) target.hp -= 6;
            target.hurt = .2;
            if (target.titheDrain >= 200) {
              m.alive = false; m.fade = .4; say('tithe_paid', null, true);
              game.hitFx(m.x, m.y, 6, { power: .8, damage: null, sound: 'explode' });
            }
          }
          spd = 0;
        }
        break;
      }
    }
    // move: the monster's own speed along its direction (waits while winding up or hidden in a stance)
    if (m.wind > 0 && m.def.ai !== 'imp' && m.def.ai !== 'lob') spd = 0;
    m.body.vx = dir[0] * spd; m.body.vy = dir[1] * spd;
    m.body.update(dt, map);
    m.x = m.body.x; m.y = m.body.y;
    if (m.def.ai === 'chase' || m.def.ai === 'club' || m.def.ai === 'fryar') m.facing = Math.atan2(dir[1], dir[0]);
    // the nearest monsters say their line once, for the tips
    if (m.kind === 'ghost' && bd < 60 && !W.said_ghost) { W.said_ghost = true; say('tip_ghost', target); }
    if (m.kind === 'gnasher' && bd < 90 && !W.said_gnasher) { W.said_gnasher = true; say('tip_gnasher', target); }
    if (m.kind === 'snatcher' && bd < 120 && !W.said_snatch) { W.said_snatch = true; say('tip_snatcher', target); }
  }
  // soft separation between monsters and from generators
  const ms = W.monsters.filter(m => m.alive);
  for (let i = 0; i < ms.length; i++) {
    const a = ms[i];
    for (let j = i + 1; j < ms.length; j++) {
      const b = ms[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, R = 9;
      if (d2 < R * R && d2 > .0001) { const d = Math.sqrt(d2), push = (R - d) * .5 / d; a.body.x -= dx * push; a.body.y -= dy * push; b.body.x += dx * push; b.body.y += dy * push; }
    }
    for (const g of W.gens) if (g.alive) { const dx = a.x - g.x, dy = a.y - g.y, d = Math.hypot(dx, dy); if (d < g.r + 5 && d > .01) { const p = (g.r + 5 - d) / d; a.body.x += dx * p; a.body.y += dy * p; } }
    a.x = a.body.x; a.y = a.body.y;
  }
  W.monsters = W.monsters.filter(m => m.alive || m.fade > -.5);
}

// Generators: each spawns its monsters while a hero is near, up to its own cap and the floor's cap.
function stepGenerators(dt) {
  const W = WORLD, map = W.map;
  for (const g of W.gens) {
    if (!g.alive) continue;
    g.flash = Math.max(0, g.flash - dt); g.shake = Math.max(0, g.shake - dt);
    const near = nearestHero(g.x, g.y, 120);
    if (!near || CHEATS.noGen) continue;
    g.timer -= dt * TUNE.spawnInterval / (1 + .25 * (W.heroes.length - 1));
    if (g.timer <= 0) {
      g.timer = g.def.interval;
      const live = W.monsters.filter(m => m.alive).length;
      if (g.children < g.def.cap && live < TUNE.maxMonsters) {
        const a = SIM() * Math.PI * 2, x = g.x + Math.cos(a) * 12, y = g.y + Math.sin(a) * 12;
        if (!map.solidAt(x, y)) {
          spawnMonster(g.def.spawn, x, y, g.hp / g.max > .66 ? 3 : g.hp / g.max > .33 ? 2 : 1, false, g);
          game.audio.sfx('hit', { vol: .15, pitch: 2.1 });
        }
      }
    }
  }
}

// The shots: the heroes' shots hit monsters, generators, shootable food and cracked walls (and ricochet off walls);
// the monsters' fireballs and the lobbed crocks hit the heroes.
function stepShots(dt) {
  const W = WORLD, map = W.map;
  // remember where each shot was, so a shot that dies on a wall can be read
  const before = W.shots.list.slice();
  for (const b of before) { b._px = b.x; b._py = b.y; }
  W.shots.update(dt, map);
  const after = new Set(W.shots.list);
  for (const b of before) {
    if (after.has(b)) continue;
    // it died on a wall: a cracked wall next to it breaks; a ricochet bounces off the wall it hit
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const cx = Math.floor((b._px + dx * T * .6) / T), cy = Math.floor((b._py + dy * T * .6) / T), key = cx + ',' + cy;
      if (W.cracks.has(key)) crackWall(key);
    }
    if (b.data && b.data.bounces > 0) {
      const sx = map.solidAt(b._px + Math.sign(b.vx) * 8, b._py), sy = map.solidAt(b._px, b._py + Math.sign(b.vy) * 8);
      let vx = b.vx, vy = b.vy;
      if (sx || !sy) vx = -vx;
      if (sy) vy = -vy;
      const nb = W.shots.fire({ x: b._px, y: b._py, z: 12, vx, vy, vz: 0, r: b.r, dmg: b.dmg, life: b.life * .8, team: 'hero', color: b.color, core: b.core, pierce: b.pierce, data: { owner: b.data.owner, kind: b.data.kind, bounces: b.data.bounces - 1 } });
      if (nb) nb.life = b.life * .8;
    }
  }
  // the Dinner Bell passes to a friend who touches the hero it marked
  if (W.bellHero && W.bellT > 0) for (const h of W.heroes) if (h !== W.bellHero && !h.down && Math.hypot(h.body.x - W.bellHero.body.x, h.body.y - W.bellHero.body.y) < 8) { W.bellHero = h; W.bellT = 12; say('bell_pass', h, true); break; }
  // from the sixth floor on, a shot that touches a friend stuns the friend for a third of a second
  if (W.index >= 5) for (const b of W.shots.list) for (const h of W.heroes) {
    if (h.down || h === b.data.owner || Math.hypot(h.body.x - b.x, h.body.y - b.y) > 7) continue;
    h.stun = Math.max(h.stun, .35);
    if (!W.allyTold) { W.allyTold = 1; say('ally_stun_on', null, true); }
    say('ally_shot', h);
  }
  const liveMonsters = W.monsters.filter(m => m.alive && m.kind !== 'tithe' && !(m.kind === 'fryar' && m.hidden));
  W.shots.hit(liveMonsters, (b, m) => {
    const o = b.data.owner;
    if (b.data.kind === 'hex' && o.def.splash) for (const n of liveMonsters) if (n !== m && n.alive && Math.hypot(n.x - m.x, n.y - m.y) < o.def.splash) damageMonster(n, b.dmg * .5, o);
    damageMonster(m, b.dmg, o);
    game.hitFx(m.x, m.y, 6, { power: .4, damage: null, sound: 'hit' });
  }, 'hero');
  W.shots.hit(W.gens.filter(g => g.alive), (b, g) => damageGen(g, b.dmg, b.data.owner), 'hero');
  const shootable = W.items.filter(i => i.alive && i.def.shootable);
  W.shots.hit(shootable, (b, it) => {
    removeItem(it);
    if (it.def.shot === 'cider') say('shot_cider', b.data.owner, true);
    if (it.def.shot === 'stew') game.audio.sfx('explode', { vol: .2, pitch: 2 });
    if (it.def.shot === 'feast') say('shot_feast', b.data.owner, true);
    WORLD.events.push({ type: 'shot-food', ch: it.ch });
  }, 'hero');
  if (W.boss && W.boss.alive) bossShot(W.shots);
  // the monsters' shots, and the crocks
  const targets = W.heroes.filter(h => !h.down).map(h => ({ x: h.body.x, y: h.body.y, r: 5, h }));
  W.foeShots.update(dt, map);
  W.foeShots.hit(targets, (b, t) => damageHero(t.h, b.dmg, b.data.owner), 'foe');
  for (const c of W.crocks) {
    c.t += dt;
    if (c.t >= c.dur) {
      for (const h of W.heroes) if (!h.down && Math.hypot(h.body.x - c.tx, h.body.y - c.ty) < 12) damageHero(h, c.dmg, null);
      W.blasts.push({ x: c.tx, y: c.ty, t: .3, color: '#e8e0d0' });
      game.audio.sfx('explode', { vol: .25, pitch: 1.8 });
      c.done = true;
    }
  }
  W.crocks = W.crocks.filter(c => !c.done);
}
