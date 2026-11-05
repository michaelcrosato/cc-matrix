// Combat: aim mode, weapons, Whiteouts, projectiles, scan, skills, drops, damage, freezing.
const sim2 = S7.sim, st2 = S7.st;
const WPN = id => S7.reg.weapons[id];
sim2.weapon = () => WPN(S7.reg.personas[st2.persona].weapon);
const rost = () => st2.roster[st2.persona];
const toast = (text, kind) => { st2.toasts.push({ text, kind: kind || '', t: 2.6 }); if (st2.toasts.length > 4) st2.toasts.shift(); S7.bus.emit('toast', { text }); };
sim2.toast = toast;

// ---------------------------------------------------------------- enemies
let EID = 1;
sim2.spawnEnemy = function (type, x, y, opts = {}) {
  const def = S7.reg.enemies[type]; const A = S7.graph().A;
  const hp = def.hp * S7.T('enemyHp') * (st2.difficulty === 'easy' ? .8 : st2.difficulty === 'hard' ? 1.3 : 1);
  const z = A.height ? A.height(x, y) : (A.floorZ || 0);
  const e = { id: EID++, type, def, x, y, z, hp, hpMax: hp, vx: 0, vy: 0, face: 0, visible: 0, stun: 0, hit: 0, t: S7.R('spawn')() * 6, laughT: S7.R('laugh').range(.3, 1.4), dead: false, deadT: 0, dodgeT: 0, dodgeDir: 1, throwT: 2, shield: false, warm2: !!def.warm2, spawnT: .6, from: opts.from || 'wave', still: !!opts.still, anim: 'run' };
  st2.enemies.push(e); S7.bus.emit('spawn', { enemy: e }); return e;
};
sim2.startWave = function (id) {
  const A = S7.graph().A, w = A.waves[id]; if (!w) return;
  const k = S7.T('spawnRate');
  for (const [type, key, delay] of w.spawn) {
    const pos = A.spawns[key]; const reps = k >= 1.5 ? 2 : k < .5 ? (S7.R('spawn')() < k * 2 ? 1 : 0) : 1;
    for (let r = 0; r < reps; r++) st2.queueSpawn.push({ t: delay + r * .9, type, x: pos[0] + r * 1.2, y: pos[1] + (r ? 1 : 0) });
  }
  S7.bus.emit('wave', { id });
};
sim2.alive = () => st2.enemies.filter(e => !e.dead).length;
function worldTo(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.vx = dx / d * speed; e.vy = dy / d * speed; e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(dy, dx);
}
function clampToArea(e) {
  const A = S7.graph().A; e.x = S7.clamp(e.x, 1, A.w - 1); e.y = S7.clamp(e.y, 1, A.h - 1);
  e.z = A.height ? A.height(e.x, e.y) : (A.floorZ || 0);
}
function updateEnemy(e, dt) {
  e.t += dt; e.hit = Math.max(0, e.hit - dt); e.visible = Math.max(0, e.visible - dt);
  if (e.dead) { e.deadT -= dt; return; }
  if (e.dummy) { e.visible = 1; return; }
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  e.stun = Math.max(0, e.stun - dt);
  const def = e.def, hx = st2.x, hy = st2.y, hz = st2.z, dx = hx - e.x, dy = hy - e.y, dist = Math.hypot(dx, dy);
  const hasFlare = st2.flare > 0 && dist < 18; if (hasFlare) e.visible = Math.max(e.visible, .4);
  e.laughT -= dt;
  if (e.laughT <= 0) { e.laughT = S7.R('laugh').range(.8, 1.9) / Math.max(.2, 1); S7.bus.emit('laugh', { enemy: e, style: def.laugh, x: e.x, y: e.y, z: e.z + 1.3, loud: Math.max(0, 1 - dist / 28), dist }); }
  if (def.shield) { const cyc = (e.t + e.id * 1.3) % def.shield.period; e.shieldUp = cyc > def.shield.open; }
  if (e.stun > 0) { e.vx = e.vy = 0; e.anim = 'stun'; return; }
  if (e.still && dist > 14 && !e.alerted) { e.anim = 'idle'; return; }
  e.alerted = true;
  const slow = st2.mode === 'ring' ? 1 : 1;
  let sp = def.speed * S7.T('enemySpeed') * slow;
  if (e.hit > 0) sp *= .25;
  if (def.id === 'giggler' || def.id === 'thrower') { const shake = Math.sin(e.t * 2.1 + e.id) > .86; if (shake) { sp *= .08; e.anim = 'laugh'; } else e.anim = 'run'; }
  if (def.ranged) {
    if (dist > def.ranged.range) worldTo(e, hx, hy, sp, dt); else { e.vx = e.vy = 0; e.face = Math.atan2(dy, dx); e.anim = 'throw'; e.throwT -= dt;
      if (e.throwT <= 0) { e.throwT = def.ranged.every * (.8 + S7.R('spread')() * .4); sim2.fireProjectile(e.x, e.y, e.z + 1.5, hx, hy, hz + 1.2, def.ranged.speed, def.dmg, 'snow', e); } }
  } else if (def.dodge) {
    e.dodgeT -= dt; if (e.dodgeT <= 0) { e.dodgeT = .5 + S7.R('spread')() * .8; e.dodgeDir = S7.R('spread')() < .5 ? -1 : 1; }
    const a = Math.atan2(dy, dx) + e.dodgeDir * Math.min(.9, dist * .07);
    const tx = e.x + Math.cos(a) * 5, ty = e.y + Math.sin(a) * 5; worldTo(e, tx, ty, sp, dt); e.face = Math.atan2(dy, dx);
  } else worldTo(e, hx, hy, sp, dt);
  if (S7.graph().A.rows) { // keep Whiteouts out of walls: slide back on solid tiles
    if (sim2.solidAt(e.x, e.y)) { e.x -= e.vx * dt; e.y -= e.vy * dt; if (!sim2.solidAt(e.x + e.vx * dt, e.y)) e.x += e.vx * dt; else if (!sim2.solidAt(e.x, e.y + e.vy * dt)) e.y += e.vy * dt; }
  }
  clampToArea(e);
  const dz = Math.abs(hz - e.z - (st2.mode === 'lift' ? 5 : 0));
  if (Math.hypot(e.x - hx, e.y - hy) < (st2.mode === 'lift' ? 2.2 : 1.35) && dz < 6.5) sim2.enemyBlast(e);
}
sim2.enemyBlast = function (e) {
  e.dead = true; e.deadT = .3; e.boom = true;
  S7.bus.emit('explode', { x: e.x, y: e.y, z: e.z + 1, radius: 2, dmg: e.def.dmg, source: 'whiteout' });
  sim2.hurtHero(e.def.dmg * S7.T('enemyDmg') * (st2.difficulty === 'easy' ? .7 : st2.difficulty === 'hard' ? 1.35 : 1), 'blast', e.x, e.y);
};
sim2.killEnemy = function (e, crit, byMine) {
  if (e.dead) return; e.dead = true; e.deadT = 1.4; e.crit = !!crit;
  st2.stats.kills++; if (crit) st2.stats.crits++;
  if (e.from === 'echo' && st2.echo && !st2.echo.finished) { st2.echo.hits++; S7.sim.toast('TARGET THAWED: -2 SECONDS'); }
  S7.bus.emit('kill', { enemy: e, type: e.type, crit: !!crit, x: e.x, y: e.y, z: e.z });
  const d = e.def.drop; if (!st2.cheats.noDrops) {
    const red = Math.round(d[0] * S7.T('redDrop') * (crit ? 1.5 : 1)); if (red > 0) sim2.dropPickup('red', red, e.x, e.y, e.z + .6);
    const rime = (crit ? d[1] : (S7.R('loot')() < .25 ? 1 : 0)) * S7.T('rimeDrop'); if (Math.round(rime) > 0) sim2.dropPickup('rime', Math.round(rime), e.x + .4, e.y, e.z + .6);
  }
  if (!st2.dossier.includes('d_whiteout')) sim2.unlockDossier('d_whiteout');
};
sim2.dropPickup = function (kind, n, x, y, z) { st2.pickups.push({ id: st2.nextId++, drop: true, kind, n, x, y, z, magnet: .4 }); };

// ---------------------------------------------------------------- projectiles (snowballs, luggage, volleys)
sim2.fireProjectile = function (x, y, z, tx, ty, tz, speed, dmg, kind, src) {
  const dx = tx - x, dy = ty - y, dz = tz - z, d = Math.hypot(dx, dy, dz) || 1;
  const p = { id: st2.nextId++, x, y, z, vx: dx / d * speed, vy: dy / d * speed, vz: dz / d * speed, dmg, kind, r: kind === 'suit' ? .7 : .38, life: 6, src };
  st2.projectiles.push(p); S7.bus.emit('throw', { p }); return p;
};
function updateProjectiles(dt) {
  for (const p of st2.projectiles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.dead) continue;
    if (Math.hypot(p.x - st2.x, p.y - st2.y) < 1.0 && Math.abs(p.z - st2.z - 1) < 1.6) { p.dead = true; sim2.hurtHero(p.dmg * S7.T('enemyDmg') * (p.kind === 'suit' ? S7.T('bossDmg') : 1), 'projectile', p.x, p.y); S7.bus.emit('splat', { p }); }
    else if (p.life <= 0 || p.z < (S7.graph().A.height ? S7.graph().A.height(p.x, p.y) - .2 : -.2)) { p.dead = true; S7.bus.emit('splat', { p, miss: true }); }
  }
  st2.projectiles = st2.projectiles.filter(p => !p.dead);
}

// ---------------------------------------------------------------- hurting, freezing
sim2.hurtHero = function (dmg, src, fx, fy) {
  if (st2.cheats.god || st2.switchT > 0 || st2.mode === 'transition' || st2.mode === 'frozen' || st2.mode === 'cutscene' || st2.over) return;
  const r = rost(); r.hp -= dmg; st2.hurtT = .45; st2.stats.damage += dmg; S7.bus.emit('hurt', { persona: st2.persona, dmg, src, x: fx, y: fy });
  if (r.hp <= 0) sim2.freezePersona();
};
sim2.freezePersona = function () {
  const r = rost(); r.hp = 0; r.frozen = true; st2.stats.freezes++;
  st2.frozenAt = { persona: st2.persona, x: st2.x, y: st2.y, z: st2.z };
  S7.bus.emit('freeze', { persona: st2.persona, x: st2.x, y: st2.y, z: st2.z });
  if (st2.mode === 'aim') { st2.mode = st2.preAim || 'rail'; }
  st2.prevMode = st2.mode; st2.mode = 'frozen'; st2.frozenT = 1.7; st2.aimMove = false;
};
sim2.afterFreeze = function () {
  const next = S7.ROSTER.find(id => st2.roster[id].unlocked && !st2.roster[id].frozen && st2.roster[id].hp > 0);
  if (next) { st2.persona = next; st2.mode = st2.prevMode === 'frozen' || !st2.prevMode ? 'rail' : st2.prevMode; if (st2.mode === 'aim') st2.mode = 'rail'; st2.switchT = .9; S7.bus.emit('switch', { to: next, auto: true });
    toast(S7.reg.personas[next].name.toUpperCase() + ' STEPS OUT OF THE WARDROBE'); }
  else { st2.mode = 'gameover'; st2.over = true; S7.bus.emit('gameover', {}); }
};
sim2.reviveFrozen = function (silent) {
  let n = 0;
  for (const id of S7.ROSTER) { const r = st2.roster[id]; if (r.frozen) { r.frozen = false; r.hp = Math.max(r.hp, Math.round(sim2.personaMax(id) * .5)); n++; } }
  if (n && !silent) { S7.bus.emit('rescue', { n }); toast('THE SWEEP CHIPPED ' + n + (n > 1 ? ' COATS' : ' COAT') + ' OUT OF THE ICE'); sim2.unlockDossier('d_sweep'); }
  return n;
};

// ---------------------------------------------------------------- scan and skills
sim2.scanRadius = () => S7.T('scanRadius') * (1 + .2 * sim2.upgLv('lens'));
sim2.doScan = function () {
  if (st2.scanCd > 0) return false;
  st2.scanCd = S7.T('scanCooldown'); const R = sim2.scanRadius(), time = S7.T('scanTime') * (1 + .2 * sim2.upgLv('lens'));
  let n = 0; for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < R) { e.visible = Math.max(e.visible, time); n++; S7.bus.emit('reveal', { enemy: e, by: 'scan' }); }
  if (st2.boss) st2.boss.revealT = time;
  S7.bus.emit('scan', { x: st2.x, y: st2.y, z: st2.z + 1, r: R, n });
  if (!st2.dossier.includes('d_scan')) sim2.unlockDossier('d_scan');
  return true;
};
const skillCost = id => { const p = S7.reg.personas[id]; return Math.round(p.skillCost * S7.T('skillCost')); };
sim2.skillCost = skillCost;
function spendRed(n) { if (st2.cheats.infRed) return true; if (st2.red < n) return false; st2.red -= n; return true; }
sim2.spendRed = spendRed;
sim2.gateOf = () => { const A = S7.graph().A; return st2.blocked && A.gates ? A.gates[st2.blocked] : null; };
sim2.openGate = function (gid, how) {
  st2.gates[st2.area + ':' + gid] = true; st2.blocked = null; S7.bus.emit('gate', { ok: true, gate: gid, how }); toast('OPENED: ' + (S7.graph().A.gates[gid].label)); st2.hint = '';
  sim2.updateObjective();
};
sim2.onGateBlocked = function (e) {
  const g = S7.graph().A.gates[e.gate]; if (!g) return;
  if (g.kind === 'key' && st2.items[g.item]) { sim2.openGate(e.gate, 'key'); return; }
  const who = g.who && S7.reg.personas[g.who];
  st2.hint = g.text + (who ? '  [' + who.name.toUpperCase() + ': ' + who.skillName.toUpperCase() + ']' : '');
  S7.bus.emit('gate', { ok: false, gate: e.gate, text: st2.hint });
};
sim2.useSkill = function () {
  if (st2.skillCd > 0) return false;
  const id = st2.persona, p = S7.reg.personas[id], gate = sim2.gateOf();
  if (p.skill === 'charge' && st2.charge) return false;   // the fuse is already burning
  st2.skillCd = 1.2;
  if (p.skill === 'longlook') { if (st2.mode === 'aim') { st2.aim.zoom = !st2.aim.zoom; S7.bus.emit('skill', { persona: id, skill: 'longlook' }); return true; } toast('LONG LOOK: AIM FIRST'); return false; }
  if (p.skill === 'rain') {
    if (gate && gate.kind === 'buyout') { if (!spendRed(gate.price)) { toast('NOT ENOUGH RED (' + gate.price + ')'); S7.bus.emit('deny', {}); return false; } sim2.openGate(st2.blocked, 'rain'); S7.bus.emit('skill', { persona: id, skill: 'rain', big: true }); return true; }
    if (!spendRed(6)) { toast('NOT ENOUGH RED'); S7.bus.emit('deny', {}); return false; }
    for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < 10) { e.stun = Math.max(e.stun, 3); e.visible = Math.max(e.visible, 2); }
    S7.bus.emit('skill', { persona: id, skill: 'rain' }); return true;
  }
  const cost = skillCost(id);
  if (!spendRed(cost)) { toast('NEEDS ' + cost + ' RED'); S7.bus.emit('deny', {}); return false; }
  if (p.skill === 'flare') { st2.flare = 10; S7.bus.emit('skill', { persona: id, skill: 'flare' }); }
  else if (p.skill === 'tuck') { st2.tuck = 8; S7.bus.emit('skill', { persona: id, skill: 'tuck' }); }
  else if (p.skill === 'echo') {
    if (gate && gate.kind === 'echowall') sim2.openGate(st2.blocked, 'echo');
    for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - st2.x, e.y - st2.y) < 11) { e.stun = Math.max(e.stun, 3); e.visible = Math.max(e.visible, 3); sim2.damageEnemy(e, 1.5, false, true); }
    if (st2.boss && Math.hypot(st2.boss.x - st2.x, st2.boss.y - st2.y) < 16) st2.boss.stagger = 1.2;
    S7.bus.emit('skill', { persona: id, skill: 'echo', big: true });
  } else if (p.skill === 'flash') {
    const f = st2.mode === 'aim' ? st2.aim.yaw : st2.face;
    for (const e of st2.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - st2.x, e.y - st2.y); if (d < 18 && Math.abs(S7.angDiff(f, Math.atan2(e.y - st2.y, e.x - st2.x))) < 1.25) { e.stun = Math.max(e.stun, 3.5); e.visible = Math.max(e.visible, 5); } }
    if (st2.boss) st2.boss.revealT = 5;
    S7.bus.emit('skill', { persona: id, skill: 'flash', big: true });
  } else if (p.skill === 'charge') {
    if (gate && gate.kind === 'charge') { st2.charge = { t: 2.6, gate: st2.blocked, x: st2.x, y: st2.y }; S7.bus.emit('skill', { persona: id, skill: 'charge', gate: true }); }
    else { st2.mines.push({ x: st2.x, y: st2.y, z: st2.z, t: 0 }); S7.bus.emit('skill', { persona: id, skill: 'charge' }); toast('CHARGE SET'); }
  }
  return true;
};
function updateMines(dt) {
  if (st2.charge) { st2.charge.t -= dt; if (st2.charge.t <= 0) { const c = st2.charge; st2.charge = null; S7.bus.emit('explode', { x: c.x, y: c.y, z: st2.z + 1, radius: 5, dmg: 0, source: 'charge', big: true }); sim2.openGate(c.gate, 'charge'); } }
  for (const m of st2.mines) {
    m.t += dt; if (m.t < .6) continue;
    const hit = st2.enemies.filter(e => !e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 2.2);
    if (hit.length || (st2.boss && Math.hypot(st2.boss.x - m.x, st2.boss.y - m.y) < 3.2)) { m.done = true; S7.bus.emit('explode', { x: m.x, y: m.y, z: m.z + .5, radius: 3.4, dmg: 9, source: 'mine' }); for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < 3.6) sim2.damageEnemy(e, 9 * S7.T('playerDmg'), false, true); }
  }
  st2.mines = st2.mines.filter(m => !m.done);
}

// ---------------------------------------------------------------- shooting
function rayTest(ox, oy, oz, dx, dy, dz, range) {
  let best = null; const wall = sim2.rayWallDist(ox, oy, oz, dx, dy, dz, range), max = Math.min(range, wall);
  const consider = (d, o) => { if (d >= 0 && d <= max && (!best || d < best.dist)) best = Object.assign({ dist: d }, o); };
  const scale = S7.T('warmSize');
  for (const e of st2.enemies) {
    if (e.dead || e.spawnT > 0) continue;
    const dd = Math.hypot(e.x - ox, e.y - oy);
    const spots = [e.def.warm].concat(e.def.warm2 ? [e.def.warm2] : []);
    const exposed = e.visible > 0 && !(e.def.shield && e.shieldUp);
    if (exposed) spots.forEach((w, i) => {
      const bx = e.x + Math.cos(e.face + w[0] * 0) * (i === 1 ? -e.def.r * .6 : e.def.r * .6), by = e.y + Math.sin(e.face) * (i === 1 ? -e.def.r * .6 : e.def.r * .6);
      const r = Math.max(w[2] * scale, dd * .012 * scale);
      consider(S7.raySphere(ox, oy, oz, dx, dy, dz, bx, by, e.z + w[1], r), { kind: 'warm', enemy: e, spot: i });
    });
    for (const hz of [.3, .62, .9]) consider(S7.raySphere(ox, oy, oz, dx, dy, dz, e.x, e.y, e.z + e.def.h * hz, e.def.r * (hz > .8 ? .8 : 1)), { kind: e.def.shield && e.shieldUp ? 'shield' : 'body', enemy: e });
  }
  for (const p of st2.projectiles) if (!p.dead) consider(S7.raySphere(ox, oy, oz, dx, dy, dz, p.x, p.y, p.z, p.r + .25), { kind: 'proj', proj: p });
  if (st2.boss) { const b = st2.boss; consider(S7.raySphere(ox, oy, oz, dx, dy, dz, b.x, b.y, b.z + b.cy, b.r), { kind: 'boss' });
    if (b.warmOpen()) { const w = b.warmPos(); consider(S7.raySphere(ox, oy, oz, dx, dy, dz, w[0], w[1], w[2], Math.max(b.warmR * scale, Math.hypot(b.x - ox, b.y - oy) * .015)), { kind: 'bosswarm' }); } }
  return best;
}
sim2.damageEnemy = function (e, dmg, crit, quiet) {
  if (e.dead) return;
  e.hit = .25; e.stun = Math.max(e.stun, crit ? 0 : .12);
  if (crit) {
    if (e.def.warm2) { e.hp -= e.hpMax * .5; } else e.hp = 0;
    if (!quiet) S7.bus.emit('crit', { enemy: e });
  } else e.hp -= dmg;
  S7.bus.emit('hit', { target: e, part: crit ? 'warm' : 'body', dmg, x: e.x, y: e.y, z: e.z + e.def.h * .6 });
  if (e.hp <= 0) sim2.killEnemy(e, crit);
};
sim2.shoot = function () {
  const r = rost(), w = sim2.weapon(), p = S7.reg.personas[st2.persona];
  if (r.reload > 0 || r.cool > 0) return false;
  if (r.ammo <= 0 && !st2.cheats.infAmmo) { sim2.startReload(); return false; }
  if (!st2.cheats.infAmmo) r.ammo--; r.cool = 1 / w.rate; st2.stats.shots++;
  const a = st2.aim, eye = [st2.x, st2.y, st2.z + 1.55];
  let hitAny = false, anyCrit = false;
  for (let i = 0; i < w.pellets; i++) {
    const sp = w.spread * (st2.aim.zoom ? .3 : 1), yaw = a.yaw + (S7.R('spread')() - .5) * 2 * sp, pit = a.pitch + (S7.R('spread')() - .5) * 2 * sp, cp = Math.cos(pit);
    const dx = Math.cos(yaw) * cp, dy = Math.sin(yaw) * cp, dz = Math.sin(pit);
    const h = rayTest(eye[0], eye[1], eye[2], dx, dy, dz, w.range);
    const dmg = w.dmg * S7.T('playerDmg') * (1 + .15 * sim2.upgLv('edge'));
    const endD = h ? h.dist : Math.min(w.range, sim2.rayWallDist(eye[0], eye[1], eye[2], dx, dy, dz, w.range));
    S7.bus.emit('shot', { persona: st2.persona, weapon: w.id, from: eye, dir: [dx, dy, dz], end: [eye[0] + dx * endD, eye[1] + dy * endD, eye[2] + dz * endD], hit: h ? h.kind : null });
    if (!h) continue;
    hitAny = true; st2.stats.hits++;
    if (h.kind === 'warm') { anyCrit = true; sim2.damageEnemy(h.enemy, dmg, true); }
    else if (h.kind === 'body') { sim2.damageEnemy(h.enemy, dmg, false); if (w.stun) h.enemy.stun = Math.max(h.enemy.stun, w.stun); if (w.reveal) h.enemy.visible = Math.max(h.enemy.visible, w.reveal); }
    else if (h.kind === 'shield') { S7.bus.emit('hit', { target: h.enemy, part: 'shield', dmg: 0, x: h.enemy.x, y: h.enemy.y, z: h.enemy.z + 1 }); }
    else if (h.kind === 'proj') { h.proj.dead = true; S7.bus.emit('splat', { p: h.proj, shot: true }); }
    else if (h.kind === 'boss') { sim2.hitBoss(dmg, false, w); }
    else if (h.kind === 'bosswarm') { anyCrit = true; sim2.hitBoss(dmg, true, w); }
    if (w.kind === 'blast') { const ex = eye[0] + dx * h.dist, ey = eye[1] + dy * h.dist; S7.bus.emit('explode', { x: ex, y: ey, z: eye[2] + dz * h.dist, radius: w.blast, dmg: w.dmg, source: 'launcher' });
      for (const e of st2.enemies) if (!e.dead && Math.hypot(e.x - ex, e.y - ey) < w.blast && h.enemy !== e) sim2.damageEnemy(e, dmg * .6, false, true); }
  }
  if (w.kind === 'blast' && !hitAny) { /* a miss still booms where it lands */ }
  if (r.ammo <= 0 && !st2.cheats.infAmmo) sim2.startReload();
  return true;
};
sim2.startReload = function () { const r = rost(), w = sim2.weapon(); if (r.reload > 0 || r.ammo >= w.mag) return; r.reload = w.reload * (1 - .2 * sim2.upgLv('quick')); S7.bus.emit('reload', { persona: st2.persona }); };

// ---------------------------------------------------------------- the per-step combat update
sim2.stepCombat = function (dt, I) {
  const r = rost(), w = sim2.weapon();
  st2.scanCd = Math.max(0, st2.scanCd - dt); st2.skillCd = Math.max(0, st2.skillCd - dt); st2.hurtT = Math.max(0, st2.hurtT - dt);
  st2.flare = Math.max(0, st2.flare - dt); st2.tuck = Math.max(0, st2.tuck - dt); st2.switchT = Math.max(0, st2.switchT - dt);
  for (const id of S7.ROSTER) { const q = st2.roster[id]; q.cool = Math.max(0, q.cool - dt); if (q.reload > 0) { q.reload -= dt; if (q.reload <= 0) { q.reload = 0; q.ammo = WPN(S7.reg.personas[id].weapon).mag; if (id === st2.persona) S7.bus.emit('reloaded', {}); } } }
  // aim in and out
  const canAim = ['rail', 'junction', 'ski', 'lift'].includes(st2.mode) && st2.switchT <= 0 && st2.turnT <= 0 && !(S7.graph().A.safe);
  if (I.aim && canAim && st2.mode !== 'aim') { st2.preAim = st2.mode; st2.mode = 'aim'; st2.aim.yaw = st2.face; st2.aim.pitch = 0; st2.aim.zoom = false; st2.speed = st2.mode === 'aim' && (st2.preAim === 'rail' || st2.preAim === 'junction') ? 0 : st2.speed; S7.bus.emit('aimon', {}); }
  else if (!I.aim && st2.mode === 'aim') { st2.mode = st2.preAim || 'rail'; st2.aim.zoom = false; st2.aimMove = false; S7.bus.emit('aimoff', {}); }
  if (st2.mode === 'aim') {
    const a = st2.aim, zk = a.zoom ? .35 : 1, ms = .0022 * S7.T('aimSensMouse') * zk, ss = S7.T('aimSensPad') * dt * zk;
    a.yaw += (I.lookMouse ? I.lookMouse[0] : 0) * ms + (I.lookStick ? I.lookStick[0] : 0) * ss;
    a.pitch = S7.clamp(a.pitch - (I.lookMouse ? I.lookMouse[1] : 0) * ms - (I.lookStick ? I.lookStick[1] : 0) * ss, -1.1, 1.1);
    if (w.rate >= 6 ? I.fire : I.firePressed) sim2.shoot();
    if (I.reload) sim2.startReload();
  }
  if (I.scan && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(st2.mode)) sim2.doScan();
  if (I.skill && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(st2.mode)) sim2.useSkill();
  // healing: hold heal to turn Red into health
  if (I.heal && ['rail', 'junction', 'ski', 'lift', 'aim'].includes(st2.mode) && st2.red > 0) {
    const max = sim2.personaMax(st2.persona);
    if (r.hp < max) { const rate = 18 * dt; const spend = Math.min(rate, st2.red); if (!st2.cheats.infRed) st2.red -= spend; r.hp = Math.min(max, r.hp + spend * 1.6 * S7.T('healRate') * (1 + .25 * sim2.upgLv('cold'))); if (!st2.healing) S7.bus.emit('healon', {}); st2.healing = true; } else st2.healing = false;
  } else st2.healing = false;
  for (const e of st2.enemies) updateEnemy(e, dt);
  st2.enemies = st2.enemies.filter(e => !(e.dead && e.deadT <= 0));
  updateProjectiles(dt); updateMines(dt);
  // queued spawns
  for (const q of st2.queueSpawn) { q.t -= dt; if (q.t <= 0) { q.done = true; sim2.spawnEnemy(q.type, q.x, q.y); } }
  st2.queueSpawn = st2.queueSpawn.filter(q => !q.done);
  // pickups
  for (const p of st2.pickups) {
    if (p.drop) { p.magnet -= dt; if (p.magnet <= 0) { const dx = st2.x - p.x, dy = st2.y - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(d, 9 * dt); p.x += dx / d * k; p.y += dy / d * k; p.z += ((st2.z + 1) - p.z) * Math.min(1, 6 * dt); } }
    if (Math.hypot(p.x - st2.x, p.y - st2.y) < 1.1) sim2.collect(p);
  }
  st2.pickups = st2.pickups.filter(p => !p.got);
  if (st2.mode === 'frozen') { st2.frozenT -= dt; if (st2.frozenT <= 0) sim2.afterFreeze(); }
  for (const t of st2.toasts) t.t -= dt; st2.toasts = st2.toasts.filter(t => t.t > 0);
};
