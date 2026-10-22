/* ============================== player: shared combat ============================== */
const _rn = V3(), _re = V3();
function updateLock(dt) {
  const maxLocks = 1 + Math.floor(P.charge * 6.99);
  for (let i = P.locks.length - 1; i >= 0; i--) if (P.locks[i].dead) P.locks.splice(i, 1);
  P.lockT -= dt;
  if (P.lockT > 0 || P.locks.length >= maxLocks) return;
  toNDC(reticlePos(false), _rn);
  const rad = S.aimAssist ? 0.3 : 0.18, aspect = camera.aspect; let best = null, bd = rad;
  for (const e of G.enemies) {
    if (e.dead || !e.lock || e.noHit || P.locks.includes(e)) continue;
    const dist = e.pos.distanceTo(P.pos);
    if (dist < 15 || dist > 560) continue;
    if (G.mode === 'rail' && e.pos.z > P.pos.z - 8) continue;
    if (!toNDC(e.pos, _re)) continue;
    if (Math.abs(_re.x) > 1 || Math.abs(_re.y) > 1) continue;
    const d = Math.hypot((_re.x - _rn.x) * aspect * 0.6, _re.y - _rn.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) { P.locks.push(best); Snd.lock(); P.lockT = 0.13; } else P.lockT = 0.05;
}
function updateCombat(dt) {
  P.fireCD -= dt; P.inv -= dt; P.rollCD -= dt; P.obsCD -= dt;
  const I = Input;
  if (I.p.fire && P.fireCD <= 0) { firePrimary(); Input.rumble(0.0, 0.15, 40); }
  if (I.cur.fire) {
    P.hold += dt;
    if (P.hold > 0.28) { P.charge = clamp((P.hold - 0.28) / 1.4, 0, 1); if (!P.charging) { P.charging = true; Snd.charge(true); } updateLock(dt); }
  } else {
    if (P.charging) {
      if (P.locks.length) fireHoming(P.locks.slice()); else if (P.charge > 0.55) fireCharged();
      P.locks = [];
    }
    P.hold = 0; P.charge = 0; if (P.charging) { P.charging = false; Snd.charge(false); }
  }
  if (I.p.bomb && (P.bombs > 0 || G.cheat) && !G.bomb) {
    if (!G.cheat) P.bombs--; G.usedBombs++;
    G.bomb = { t: 0, hit: new Set() }; Snd.bomb(); G.shake = 1; G.whiteout = Math.max(G.whiteout, 0.5); Input.rumble(1, 1, 500);
    Fx.ring(P.pos, 320, 0xffffff, 0.9); Fx.ring(P.pos, 260, 0x66ddff, 0.7); Fx.flash(P.pos, 60, 0xffffff, 0.5);
  }
  if ((I.p.rollL || I.p.rollR) && P.rollCD <= 0 && P.rollT <= 0 && P.uT <= 0) {
    P.rollT = 0.6; P.rollDir = I.p.rollL ? -1 : 1; P.rollCD = 1.0; Snd.roll();
  }
  if (P.rollT > 0) P.rollT -= dt;
  if (G.bomb) {
    const b = G.bomb; b.t += dt; const r = 320 * Math.min(1, b.t / 0.9);
    for (const e of G.enemies) if (!e.dead && !b.hit.has(e) && e.pos.distanceTo(P.pos) < r) { b.hit.add(e); damageEnemy(e, e.type === 'part' ? 14 : 12, 'player'); }
    for (let i = G.eb.length - 1; i >= 0; i--) if (G.eb[i].pos.distanceTo(P.pos) < r) { Fx.emit(G.eb[i].pos, 4, { color: 0xffffff, speed: 10, size: 1, life: 0.3 }); removeEB(i); }
    if (b.t > 1.0) G.bomb = null;
  }
  if (G.chainT > 0) { G.chainT -= dt; if (G.chainT <= 0) G.hits = 0; }
  // thruster flames + trail
  const fl = P.mesh.userData.flames; const boost = P.boosting;
  if (fl) fl.forEach((c) => c.scale.set(1, (boost ? 2.2 : P.braking ? 0.5 : 1) * (0.85 + Math.random() * 0.3), 1));
  if (!P.dead) { const back = V3(0, 0, 4).applyQuaternion(P.mesh.quaternion).add(P.pos); Fx.emit(back, 1, { color: boost ? 0x9fe8ff : 0x66ccff, speed: 3, size: boost ? 1.6 : 1, life: 0.3, drag: 3 }); }
}
function boostBrake(dt) {
  const I = Input;
  P.braking = I.cur.brake && !I.cur.boost;
  const want = I.cur.boost && (P.boost > 0 || G.cheat) && !P.boostLock;
  if (want && !P.boosting) Snd.boost();
  if (P.braking && !P.wasBrake) Snd.brake();
  P.wasBrake = P.braking; P.boosting = want;
  if (want) { if (!G.cheat) P.boost -= 0.4 * dt; if (P.boost <= 0) { P.boost = 0; P.boostLock = true; } }
  else P.boost = Math.min(1, P.boost + (P.braking ? 0.45 : 0.2) * dt);
  if (P.boostLock && P.boost > 0.3) P.boostLock = false;
}

/* ============================== rail ship ============================== */
function railBounds() {
  const d = -G.railZ, cf = canyonCf(d);
  const bx = cf > 0.3 ? Math.min(34, canyonW(d) - 6) : 38;
  return { bx, ymin: -16, ymax: 18 };
}
function updateShipRail(dt) {
  const I = Input, B = railBounds();
  boostBrake(dt);
  const target = G.base * (P.boosting ? 1.7 : P.braking ? 0.55 : 1);
  G.speed = damp(G.speed, target, 3, dt);
  G.railZ -= G.speed * dt;
  const sp = 46 * S.sens, rollBoost = P.rollT > 0 ? 1.5 : 1;
  const ay = I.moveY * (G.demo ? 1 : 1);
  P.vx = damp(P.vx, I.moveX * sp * rollBoost + (P.rollT > 0 ? P.rollDir * 14 : 0), 7, dt); P.vy = damp(P.vy, ay * sp * 0.8, 7, dt);
  P.lx += P.vx * dt; P.ly += P.vy * dt;
  P.lx = clamp(P.lx, -B.bx, B.bx); P.ly = clamp(P.ly, B.ymin, B.ymax);
  // ground scrape
  const gh = terrainH(P.lx, G.railZ);
  if (P.ly < gh + 2.4) {
    P.ly = gh + 2.4; P.vy = Math.max(P.vy, 0);
    if (!G.cheat && gh > -26 && P.obsCD <= 0) { hurtPlayer(8, 'hit'); P.obsCD = 0.8; Fx.emit(P.pos, 10, { color: 0xffcc88, speed: 18, size: 1.4, life: 0.5 }); }
  }
  P.pos.set(P.lx, P.ly, G.railZ);
  P.fwd.set(0, 0, -1);
  // obstacles
  if (!G.cheat) {
    const o = World.hitTest(P.pos, 1.9, 0.9, 2.2);
    if (o && P.obsCD <= 0) {
      if (o.gate) o.gate.clean = false;
      hurtPlayer(22, 'hit'); P.obsCD = 0.9; Fx.explosion(P.pos, 1.2, 0xffbb77); Snd.explode(1);
      const pr = o.max.x - (P.lx - 1.9), pl = (P.lx + 1.9) - o.min.x, pu = o.max.y - (P.ly - 0.9), pd = (P.ly + 0.9) - o.min.y, m = Math.min(pr, pl, pu, pd);
      if (m === pr) P.lx += pr + 1; else if (m === pl) P.lx -= pl + 1; else if (m === pu) P.ly += pu + 1; else P.ly -= pd + 1;
      P.lx = clamp(P.lx, -B.bx, B.bx); P.ly = clamp(P.ly, B.ymin, B.ymax); P.pos.set(P.lx, P.ly, G.railZ);
    }
  }
  for (const g of G.gates) if (!g.passed && G.railZ < g.z - 6) { g.passed = true; if (g.clean) { addScore(400); HUD.flashText('GATE CLEAR +400'); } }
  // visuals
  const roll = -P.vx * 0.022 + (P.rollT > 0 ? -P.rollDir * (1 - P.rollT / 0.6) * Math.PI * 2 : 0);
  P.mesh.position.copy(P.pos); P.mesh.rotation.set(P.vy * 0.008, -P.vx * 0.006, roll, 'YXZ');
  P.mesh.visible = !P.dead && !(P.inv > 0 && Math.floor(G.t * 18) % 2 === 0 && P.inv < 5 && !G.cheat);
}

/* ============================== free-flight ship ============================== */
const wrapA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
function fwdFrom(yaw, pitch, out) { return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }
function updateShipFree(dt) {
  const I = Input; boostBrake(dt);
  const py = I.moveY * (S.pitchStyle === 1 ? -1 : 1);
  if (P.uT > 0) { P.uT -= dt; P.yaw += P.uDir * Math.PI * dt / 1.0; P.pitch = damp(P.pitch, 0, 6, dt); }
  else {
    P.yaw -= I.moveX * 1.75 * S.sens * dt;
    if (P.rollT > 0) P.yaw -= 0; // roll handled below
    P.pitch = clamp(P.pitch + py * 1.4 * S.sens * dt, -1.2, 1.2);
    if (Math.abs(py) < 0.1) P.pitch *= 1 - 0.35 * dt;
    if (I.p.uturn && !P.dead) { P.uT = 1.0; P.uDir = I.moveX > 0.3 ? -1 : 1; Snd.uturn(); }
  }
  const tspd = P.boosting ? 170 : P.braking ? 58 : 105;
  P.speed = damp(P.speed, tspd, 2.5, dt);
  fwdFrom(P.yaw, P.pitch, P.fwd);
  const right = _t1.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  P.pos.addScaledVector(P.fwd, P.speed * dt);
  if (P.rollT > 0) P.pos.addScaledVector(right, P.rollDir * 40 * dt);
  P.bank = damp(P.bank, -I.moveX * 0.9, 6, dt);
  // bounds
  const rr = Math.hypot(P.pos.x, P.pos.z);
  if (rr > 740) { P.oob += dt; HUD.warn('RETURN TO COMBAT AREA', 0.3); if (P.oob > 1.5) P.yaw += wrapA(Math.atan2(P.pos.x, P.pos.z) - P.yaw) * Math.min(1, 2 * dt); } else P.oob = 0;
  if (P.pos.y > 420) P.pos.y = 420;
  if (P.pos.y < -50) { P.pos.y = -50; P.pitch = Math.max(P.pitch, 0.15); if (!G.cheat && P.obsCD <= 0) { hurtPlayer(8, 'hit'); P.obsCD = 1; } }
  // carrier collision
  if (!G.cheat && G.arena && !G.arena.dead) {
    for (const b of CARRIER_BOXES) {
      const cx = b[0] + CARRIER_POS.x, cy = b[1] + CARRIER_POS.y + (G.arena.sink || 0), cz = b[2] + CARRIER_POS.z;
      const hx = b[3] / 2 + 3, hy = b[4] / 2 + 3, hz = b[5] / 2 + 3;
      const dx = P.pos.x - cx, dy = P.pos.y - cy, dz = P.pos.z - cz;
      if (Math.abs(dx) < hx && Math.abs(dy) < hy && Math.abs(dz) < hz) {
        const px = hx - Math.abs(dx), py2 = hy - Math.abs(dy), pz = hz - Math.abs(dz), m = Math.min(px, py2, pz);
        if (m === px) P.pos.x += Math.sign(dx || 1) * (px + 1); else if (m === py2) P.pos.y += Math.sign(dy || 1) * (py2 + 1); else P.pos.z += Math.sign(dz || 1) * (pz + 1);
        if (P.obsCD <= 0) { hurtPlayer(25, 'hit'); P.obsCD = 1; Fx.explosion(P.pos, 1.5, 0xffbb77); P.speed *= 0.4; }
        break;
      }
    }
  }
  P.vel.copy(P.fwd).multiplyScalar(P.speed);
  const spin = P.rollT > 0 ? -P.rollDir * (1 - P.rollT / 0.6) * Math.PI * 2 : 0, flip = P.uT > 0 ? P.uDir * (1 - P.uT) * Math.PI * 2 : 0;
  P.mesh.position.copy(P.pos); P.mesh.rotation.set(P.pitch, P.yaw, P.bank + spin + flip, 'YXZ');
  P.mesh.visible = !P.dead && !(P.inv > 0 && Math.floor(G.t * 18) % 2 === 0 && !G.cheat);
}

/* ============================== arena (all-range mode) ============================== */
AI.fighterFree = (e, dt) => {
  const o = e.o; e.t += dt; e.prev.copy(e.pos);
  if (!e.dirv) e.dirv = V3(-e.pos.x, 0, -e.pos.z).normalize();
  let tgt = P.pos, isP = true;
  if (o.ally && o.ally.hp > 0 && o.ally.mode === 'free' && o.ally.respawn <= 0) { tgt = o.ally.pos; isP = false; }
  const to = _t1.copy(tgt).sub(e.pos), dist = to.length();
  if (!e.fmode) e.fmode = 'pursue';
  let desired;
  if (e.fmode === 'break') { e.brT -= dt; desired = e.breakDir; if (e.brT <= 0) e.fmode = 'pursue'; }
  else {
    desired = to.clone().addScaledVector(isP ? P.fwd : o.ally.dirv || V3(0, 0, 0), dist * 0.18).normalize();
    if (dist < 38) { e.fmode = 'break'; e.brT = rnd(1.6, 2.8); e.breakDir = V3(rnd(-1, 1), rnd(-0.4, 0.6), rnd(-1, 1)).normalize(); }
  }
  const rr = Math.hypot(e.pos.x, e.pos.z); if (rr > 760) desired = V3(-e.pos.x, 0, -e.pos.z).normalize();
  if (e.pos.y < -35) desired = V3(desired.x, 0.6, desired.z).normalize(); if (e.pos.y > 300) desired = V3(desired.x, -0.5, desired.z).normalize();
  e.dirv.lerp(desired, 1 - Math.exp(-(o.turn || 1.9) * dt)).normalize();
  e.pos.addScaledVector(e.dirv, (o.speed || 92) * dt);
  if (e.mesh) { faceDir(e.mesh, e.dirv); e.mesh.position.copy(e.pos); e.mesh.scale.setScalar(e.flash > 0 ? 1.18 : 1); const bank = clamp(to.clone().cross(e.dirv).y * 0.02, -0.8, 0.8); e.mesh.rotateZ(bank); }
  e.fireT -= dt;
  if (e.fmode === 'pursue' && dist < 190 && e.fireT <= 0) {
    const ang = e.dirv.angleTo(to);
    if (ang < 0.2) {
      if (isP) { const tp = predictTarget(e.pos, 130).clone(); const dir = tp.sub(e.pos).normalize(); dir.x += rnd(-dif().spread, dif().spread); dir.y += rnd(-dif().spread, dif().spread); enemyBullet(e.pos, dir.normalize().multiplyScalar(130), { dmg: 7, life: 3 }); }
      else { Fx.emit(e.pos, 3, { color: 0xffe080, speed: 3, size: 0.8, life: 0.3, vel: to.clone().normalize().multiplyScalar(150) }); if (Math.random() < 0.4) o.ally.hp -= 4; }
      e.fireT = 0.34 * dif().fire;
    }
  }
  if (isP && dist < 130 && _t2.copy(e.pos).sub(P.pos).dot(P.fwd) < 0) G.tailCount++;
};
function spawnFighter(a, ally) {
  const r = 560, pos = V3(Math.cos(a) * r, rnd(-5, 140), Math.sin(a) * r);
  const e = spawnEnemy('fighter', pos, { ai: 'fighterFree', speed: rnd(86, 100), turn: rnd(1.6, 2.1), ally, onDeath: (en, src) => { if (G.arena && !en.gone) G.arena.fKills++; } });
  return e;
}
function startArena() {
  G.mode = 'free'; World.clearRail(); World.setMode('free'); setEnv('arena'); Music.set('arena');
  const car = buildCarrier(); car.position.copy(CARRIER_POS); scene.add(car);
  const A = { stage: 1, car, t: 0, fKills: 0, spawnedF: 0, spawnCD: 2, gens: [], turrets: [], core: null, missT: 4, ringT: 6, reinfT: 10, dead: false, sink: 0, endT: 0, shieldBubble: null, tailT: 0, introT: 0, said: {} };
  G.arena = A;
  const toW = (x, y, z) => V3(x, y, z).add(CARRIER_POS);
  [[-150, 38, -40], [-150, 38, 40], [20, 38, -40], [20, 38, 40]].forEach(([x, y, z]) => {
    const m = new THREE.Group(); m.add(cyl(3, 4, 12, M(0x556080), 0, 0, 0, 8)); m.add(mesh(new THREE.SphereGeometry(5.5, 12, 10), GLOW(0x44ddff, 2.4), 0, 9, 0));
    const g = spawnEnemy('part', toW(x, y, z), { hp: 30, r: 9, mesh: m, score: 1200, noScale: false }); g.def = Object.assign({}, ENEMY.part, { expl: 2.4 });
    g.mesh.position.copy(g.pos); g.pos.y += 8; g.onDeath = () => { HUD.flashText(`GENERATOR DOWN ${A.gens.filter((q) => q.dead).length}/4`); Snd.shield(); };
    A.gens.push(g);
  });
  [[-240, 30, -30], [-200, 30, 34], [-100, 30, -32], [-60, 30, 30], [60, 30, -34], [100, 30, 32], [170, 30, -30], [210, 30, 32]].forEach(([x, y, z]) => {
    const m = Mdl.turret(); m.scale.setScalar(1.7);
    A.turrets.push(spawnEnemy('turret', toW(x, y, z), { world: true, ai: 'carrierTurret', hp: 5, r: 5, mesh: m, score: 300 }));
  });
  const cm = new THREE.Group(); cm.add(mesh(new THREE.SphereGeometry(9, 14, 12), GLOW(0xff4030, 2.8), 0, 0, 0)); cm.add(mesh(new THREE.TorusGeometry(13, 0.8, 6, 24), GLOW(0xffaa40, 2), 0, 0, 0));
  const bub = new THREE.Mesh(new THREE.SphereGeometry(21, 18, 14), new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cm.add(bub);
  A.shieldBubble = bub;
  const core = spawnEnemy('part', toW(110, 92, 0), { hp: 90, r: 14, mesh: cm, score: 8000, shield: () => A.gens.some((q) => !q.dead), onDeath: () => arenaCoreDown() });
  core.def = Object.assign({}, ENEMY.part, { expl: 4 }); core.mesh.position.copy(core.pos); A.core = core;
  G.boss = { name: 'GLOOM LEVIATHAN', arenaBoss: true };
  P.pos.set(0, 70, 620); P.yaw = 0; P.pitch = 0; P.speed = 105; P.fwd.set(0, 0, -1); P.bank = 0;
  for (const a of G.allies) { a.mode = 'free'; a.mesh.visible = true; a.hp = 100; a.respawn = 0; a.pos.set((a.idx - 1) * 40, 70 + a.idx * 8, 660); a.dirv = V3(0, 0, -1); a.fireT = rnd(0.3, 1); }
  HUD.phase('LEVIATHAN FLEET'); HUD.objective('DESTROY GLOOM FIGHTERS  0 / 12');
  HUD.say('control', 'All-range mode engaged! Stick steers freely — U-turn with the triangle button.', 4.2);
  setTimeout(() => HUD.hint(`Free flight: ${gl('uturn')} U-turn  ·  ${gl('boost')} boost  ·  ${gl('brake')} brake`, 6), 800);
}
AI.carrierTurret = (e, dt) => {
  e.t += dt; const head = e.mesh.userData.head;
  if (head) { const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z; head.rotation.y = Math.atan2(-dx, -dz); }
  e.fireT -= dt; const d = e.pos.distanceTo(P.pos);
  if (d < 420 && d > 40 && e.fireT <= 0 && !P.dead) { const org = e.pos.clone(); org.y += 5; aimShot({ pos: org }, 100, undefined, { dmg: 8 }); e.fireT = rnd(2.2, 3.4) * dif().fire; }
  e.mesh.scale.setScalar(e.flash > 0 ? 1.85 : 1.7);
};
function arenaCoreDown() {
  const A = G.arena; if (!A) return; A.stage = 4; A.dead = true; A.endT = 0; addScore(8000);
  HUD.say('wick', "The Leviathan is breaking up! Ember, you did it!", 3.5); HUD.objective(''); Music.set('victory'); Snd.clear();
  for (const e of G.enemies) if (!e.dead && e.type === 'fighter') killEnemy(e, 'bomb');
  for (let i = G.eb.length - 1; i >= 0; i--) removeEB(i);
}
function allyFreeUpdate(a, dt) {
  if (a.respawn > 0) { a.respawn -= dt; if (a.respawn <= 0) { a.hp = 100; a.mesh.visible = true; a.pos.copy(P.pos).addScaledVector(P.fwd, -50).add(V3(rnd(-20, 20), 10, 0)); HUD.say(a.key, "Back in the fight!", 2); } return; }
  if (a.hp <= 0) { Fx.explosion(a.pos, 1.8); Snd.explode(1.5); a.mesh.visible = false; a.respawn = 14; HUD.say(a.key, "Taking heavy fire — falling back to repair!", 2.4); return; }
  if (a.mode !== 'free') return;
  a.t += dt; a.prev = a.prev || a.pos.clone(); a.prev.copy(a.pos);
  let tgt = null, bd = 520 * 520;
  for (const e of G.enemies) { if (e.dead || e.type !== 'fighter') continue; const d = e.pos.distanceToSquared(a.pos) * (e.o.ally === a ? 0.4 : 1); if (d < bd) { bd = d; tgt = e; } }
  let desired;
  if (tgt) { desired = _t1.copy(tgt.pos).sub(a.pos); } else { desired = _t1.copy(P.pos).addScaledVector(P.fwd, -30).add(V3(Math.cos(a.t * 0.5 + a.idx * 2) * 30 + (a.idx - 1) * 30, 10 + a.idx * 6, 0)).sub(a.pos); }
  const dist = desired.length(); desired.normalize();
  if (tgt && dist < 30) desired.add(V3(rnd(-1, 1), 0.5, rnd(-1, 1)).multiplyScalar(1.5)).normalize();
  const rr = Math.hypot(a.pos.x, a.pos.z); if (rr > 740) desired.set(-a.pos.x, 0, -a.pos.z).normalize();
  if (a.pos.y < -30) desired.y = 0.6; desired.normalize();
  a.dirv.lerp(desired, 1 - Math.exp(-2.2 * dt)).normalize();
  a.pos.addScaledVector(a.dirv, 108 * dt);
  faceDir(a.mesh, a.dirv); a.mesh.position.copy(a.pos); allyFlames(a.mesh, dt);
  a.fireT -= dt;
  if (tgt && dist < 230 && a.dirv.angleTo(_t1.copy(tgt.pos).sub(a.pos)) < 0.12 && a.fireT <= 0) {
    const m = new THREE.Mesh(BOLT.g, BOLT.ally); faceDir(m, a.dirv); m.position.copy(a.pos); scene.add(m);
    G.pb.push({ mesh: m, pos: a.pos.clone(), prev: a.pos.clone(), vel: a.dirv.clone().multiplyScalar(380), life: 1.0, dmg: 1, type: 'ally', target: null, pierce: false });
    a.fireT = 0.22; Snd.allyLaser();
  }
}
function updateArena(dt) {
  const A = G.arena; if (!A) return; A.t += dt;
  const fighters = G.enemies.filter((e) => !e.dead && e.type === 'fighter');
  // allies in trouble callouts
  A.tailT -= dt;
  if (A.tailT <= 0) {
    const tr = G.allies.find((a) => a.mode === 'free' && a.respawn <= 0 && a.hp > 0 && a.hp < 55);
    if (tr) { HUD.say(tr.key, "Ember, I've got one on me! Get him off!", 2.6); A.tailT = 14; }
    else if (G.tailCount > 0 && !P.dead) { HUD.say('pike', 'Bogey on your tail! Brake or U-turn!', 2.4); A.tailT = 12; }
  }
  if (A.stage === 1) {
    A.spawnCD -= dt;
    HUD.objective(`DESTROY GLOOM FIGHTERS  ${Math.min(12, A.fKills)} / 12`);
    if (fighters.length <= 1 && A.spawnedF < 12 && A.spawnCD <= 0) {
      const n = Math.min(4, 12 - A.spawnedF), base = Math.random() * 6.28;
      for (let i = 0; i < n; i++) { spawnFighter(base + i * 0.4, i === 0 && Math.random() < 0.6 ? pick(G.allies) : null); A.spawnedF++; }
      A.spawnCD = 4; if (A.spawnedF === 4) HUD.say('wick', 'Fighter screen! Keep them off the wingmen.', 3);
    }
    if (A.fKills >= 12) {
      A.stage = 2; HUD.say('control', 'Screen broken! Disable the four shield generators on the carrier deck!', 4.5);
      HUD.objective(''); Snd.clear(); spawnPickup('repair', P.pos.x + P.fwd.x * 150, P.pos.y + 10, 0).pos.set(P.pos.x + P.fwd.x * 160, Math.max(10, P.pos.y), P.pos.z + P.fwd.z * 160); A.reinfT = 12;
    }
  } else if (A.stage === 2) {
    const down = A.gens.filter((g) => g.dead).length;
    HUD.objective(`DESTROY SHIELD GENERATORS  ${down} / 4`);
    A.reinfT -= dt; if (A.reinfT <= 0 && fighters.length < 3) { const b = Math.random() * 6.28; spawnFighter(b, null); spawnFighter(b + 0.5, pick(G.allies)); A.reinfT = 16; }
    if (down >= 4) { A.stage = 3; HUD.say('juno', 'Shields are down! Hit the core on the bridge, everything you have!', 4); HUD.objective('DESTROY THE LEVIATHAN CORE'); HUD.flashText('SHIELD DOWN'); A.shieldBubble.visible = false; spawnPickup('bomb', P.pos.x + P.fwd.x * 160, 20, 0).pos.set(P.pos.x + P.fwd.x * 160, Math.max(10, P.pos.y), P.pos.z + P.fwd.z * 160); }
  } else if (A.stage === 3) {
    const f = dif().fire;
    A.reinfT -= dt; if (A.reinfT <= 0 && fighters.length < 2) { const b = Math.random() * 6.28; spawnFighter(b, null); A.reinfT = 20; }
    A.missT -= dt;
    if (A.missT <= 0) { for (let i = 0; i < 2; i++) { const org = A.core.pos.clone().add(V3(i ? 12 : -12, 12, 0)); const dir = V3(rnd(-1, 1), 0.7, rnd(-1, 1)).normalize(); enemyBullet(org, dir.multiplyScalar(40), { big: true, dmg: 12, life: 10, home: 1.3 }); G.eb[G.eb.length - 1].speed = 66; } A.missT = 4.2 * f; Snd.missile(); }
    A.ringT -= dt;
    if (A.ringT <= 0) { const n = 20, c = A.core.pos.clone(); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; enemyBullet(c, V3(Math.cos(a), rnd(-0.1, 0.5), Math.sin(a)).normalize().multiplyScalar(55), { big: true, dmg: 9, life: 9 }); } A.ringT = 7 * f; HUD.warn('SHOCKWAVE', 1); Snd.warn(); }
  } else if (A.stage === 4) {
    A.endT += dt; A.sink += dt * dt * 3; A.car.position.y = CARRIER_POS.y - A.sink; A.car.rotation.z = Math.min(0.5, A.endT * 0.07);
    if (Math.random() < dt * 14) { const p = V3(rnd(-250, 250), rnd(-20, 60), rnd(-50, 50)).add(CARRIER_POS); p.y -= A.sink; Fx.explosion(p, rnd(1.5, 3.5)); Snd.explode(2); G.shake = 0.6; Input.rumble(0.6, 0.6, 150); }
    if (A.endT > 6 && !G.finished) { G.whiteout = 1; finishMission(true); }
  }
  for (const a of G.allies) allyFreeUpdate(a, dt);
  A.car.visible = true;
}
function cleanupArena() { if (G.arena) { scene.remove(G.arena.car); G.arena = null; } }

/* ============================== camera ============================== */
const camTarget = V3(), camLook = V3();
function updateCamera(dt) {
  const shake = G.shake * S.shake; G.shake = Math.max(0, G.shake - dt * 1.6);
  const boost = P.boosting && S.fovFx, wantFov = 64 + (boost ? 14 : 0) - (P.braking ? 5 : 0) + (G.mode === 'free' ? 4 : 0);
  camera.fov = damp(camera.fov, wantFov, 4, dt); camera.updateProjectionMatrix();
  if (G.mode === 'rail') {
    camTarget.set(P.lx * 0.62, P.ly * 0.62 + 4.2, G.railZ + 13);
    if (G.introT > 0) { G.introT -= dt; const u = G.introT / 3; G.camOff.set(Math.sin(u * 2) * 26 * u, 6 * u, -8 * u * u); } else G.camOff.set(0, 0, 0);
    camTarget.add(G.camOff);
    camera.position.x = damp(camera.position.x, camTarget.x, 6, dt); camera.position.y = damp(camera.position.y, camTarget.y, 6, dt); camera.position.z = camTarget.z;
    camLook.set(P.lx * 0.3, P.ly * 0.3 + 0.8, G.railZ - 55);
    camera.up.set(0, 1, 0);
    if (G.introT > 0) camLook.set(P.lx, P.ly, G.railZ - 10);
  } else {
    const back = P.uT > 0 ? 14 : 15 + (P.boosting ? 4 : 0);
    camTarget.copy(P.pos).addScaledVector(P.fwd, -back).add(V3(0, 5.2 - P.pitch * 4, 0));
    camera.position.lerp(camTarget, 1 - Math.exp(-7 * dt));
    camLook.copy(P.pos).addScaledVector(P.fwd, 40);
    camera.up.set(Math.sin(-P.bank * 0.25), 1, 0).normalize();
    if (P.dead) camLook.copy(P.pos);
  }
  if (shake > 0.01) camera.position.add(V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake * 0.9));
  camera.lookAt(camLook);
  updateEnvFollow(camera);
  sun.position.copy(P.pos).addScaledVector(SUN_DIR, 220); sun.target.position.copy(P.pos); sun.target.updateMatrixWorld();
}

/* ============================== mission control ============================== */
function resetEntities() {
  for (const e of G.enemies) removeEnemy(e); G.enemies = [];
  for (const b of G.pb) scene.remove(b.mesh); G.pb = [];
  for (const b of G.eb) scene.remove(b.mesh); G.eb = [];
  for (const p of G.pickups) scene.remove(p.mesh); G.pickups = [];
  if (G.boss && G.boss.group) { scene.remove(G.boss.group); if (G.boss.beam) scene.remove(G.boss.beam.mesh); }
  G.boss = null; cleanupArena(); Fx.clear(); World.clearRail(); G.gates = []; G.bomb = null; G.juno = null;
  Snd.charge(false);
}
function startMission(cp, opts = {}) {
  resetEntities();
  const demo = !!opts.demo;
  if (opts.fresh) G.saves = [];
  const sv = !demo && G.saves && G.saves[cp];
  Object.assign(G, { demo, cheat: demo, t: 0, shake: 0, evI: 0, noFill: false, bossDone: false, camOff: V3(), endT: 0, whiteout: 0, tailCount: 0, finished: false, deadT: 0, juno: null, cp, startCp: cp, speed: G.base });
  const base = sv || { score: 0, kills: 0, spawned: 0, dmg: 0, time: 0, laser: [1, 2, 2, 3][cp], bombs: 3, maxHits: 0, rings: 0, ringsTotal: 0 };
  Object.assign(G, { score: base.score, kills: base.kills, spawned: base.spawned, dmgTaken: base.dmg, time: base.time, maxHits: base.maxHits, ringsGot: base.rings, ringsTotal: base.ringsTotal, hits: 0, chainT: 0, usedBombs: 0 });
  Object.assign(P, { hp: 100, max: 100, inv: 1, bombs: base.bombs, laser: base.laser, boost: 1, boostLock: false, fireCD: 0, hold: 0, charge: 0, charging: false, locks: [], rollT: 0, rollCD: 0, uT: 0, dead: false, vx: 0, vy: 0, lx: 0, ly: 0, yaw: 0, pitch: 0, bank: 0, oob: 0, obsCD: 0, boosting: false, braking: false });
  if (!demo && sv) { P.max = sv.max || 100; P.hp = P.max; }
  P.mesh.visible = true;
  makeAllies();
  World.setMode('rail');
  if (cp >= 3) { G.mode = 'free'; G.railZ = -CP_D[2] - 600; setEnv('arena'); camera.position.set(0, 80, 700); startArena(); }
  else {
    G.mode = 'rail'; G.railZ = -CP_D[cp]; G.events = buildEvents(); G.evI = 0;
    while (G.evI < G.events.length && G.events[G.evI].at < CP_D[cp]) G.evI++;
    G.nextFill = CP_D[cp] + (cp === 0 ? 330 : 120);
    setEnv(cp === 0 ? 'sea' : 'canyon'); Music.set(cp === 0 ? 'calm' : 'combat');
    P.pos.set(0, 0, G.railZ); camera.position.set(0, 4, G.railZ + 14);
    G.introT = cp === 0 ? 3 : 1.4;
    HUD.phase(cp === 0 ? 'HALCYON SEA' : 'GATE CUT CANYON');
    World.update(camera, G.railZ);
    if (cp === 2) G.noFill = true;
  }
  G.state = 'play'; G.cpBanner = 0;
  HUD.reset();
  HUD.show(true);
  if (!demo) { if (cp > 0) HUD.checkpoint(cp, true); }
  Input.ai = demo ? { moveX: 0, moveY: 0 } : null;
}
function saveCheckpoint(n) {
  G.cp = n; G.saves = G.saves || [];
  G.saves[n] = { score: G.score, kills: G.kills, spawned: G.spawned, dmg: G.dmgTaken, time: G.time, laser: P.laser, bombs: Math.max(3, P.bombs), max: P.max, maxHits: G.maxHits, rings: G.ringsGot, ringsTotal: G.ringsTotal };
}
function finishMission(win) {
  if (G.finished) return; G.finished = true; G.state = 'ended';
  if (!win) return;
  const killPct = G.spawned ? G.kills / G.spawned : 1;
  const pts = killPct * 60 + Math.max(0, 40 - G.dmgTaken / 6);
  const rank = pts >= 88 ? 'S' : pts >= 74 ? 'A' : pts >= 56 ? 'B' : 'C';
  const result = { score: G.score, kills: G.kills, spawned: G.spawned, killPct, time: G.time, dmg: Math.round(G.dmgTaken), maxHits: G.maxHits, rings: G.ringsGot, ringsTotal: G.ringsTotal, rank, demo: G.demo };
  Snd.charge(false);
  if (!G.demo) setTimeout(() => UI.showResults(result), 1200);
  else G.demoEnded = true;
}

/* ============================== main update ============================== */
function runEvents() {
  const d = -G.railZ;
  while (G.evI < G.events.length && G.events[G.evI].at <= d) { G.events[G.evI].fn(); G.evI++; }
  if (!G.noFill && !G.boss && d >= G.nextFill && d < BOSS_D - 300 && !(d > 3900 && d < 4400)) {
    fillWave(); G.nextFill = d + (d > CANYON_START ? rnd(190, 250) : rnd(210, 290));
  }
  if (G.bossDone && !G.boss && d - G.bossDoneD > 520 && G.mode === 'rail' && !G.arenaGo) {
    G.arenaGo = true; G.whiteout = 1; HUD.say('control', 'Switching to all-range mode. Good hunting, Lantern Wing!', 3);
    setTimeout(() => { if (G.state === 'play') { resetEntitiesForArena(); } G.arenaGo = false; }, 700);
  }
}
function resetEntitiesForArena() {
  saveCheckpoint(3);
  const keep = { laser: P.laser, bombs: P.bombs, hp: P.hp, max: P.max };
  for (const e of G.enemies) removeEnemy(e); G.enemies = [];
  for (const b of G.pb) scene.remove(b.mesh); G.pb = [];
  for (const b of G.eb) scene.remove(b.mesh); G.eb = [];
  for (const p of G.pickups) scene.remove(p.mesh); G.pickups = [];
  World.clearRail(); G.gates = []; G.cp = 3; G.noFill = true; Fx.clear();
  P.pos.set(0, 70, 620); P.lx = 0; P.ly = 0; P.rollT = 0; P.locks = [];
  camera.position.set(0, 80, 700);
  startArenaKeep(keep);
  HUD.checkpoint(3);
}
function startArenaKeep(keep) { startArena(); P.laser = keep.laser; P.bombs = keep.bombs; P.hp = keep.hp; P.max = keep.max; }

function updateGame(dt) {
  if (G.state !== 'play' && G.state !== 'ended') return;
  G.t += dt;
  if (G.state === 'play' && !P.dead) G.time += dt;
  if (G.demo) demoControl(dt);
  G.tailCount = 0;
  if (!P.dead) updateCombat(dt);
  if (G.mode === 'rail') {
    if (!P.dead) updateShipRail(dt); else G.railZ -= G.speed * dt * 0.3;
    runEvents();
    updateAlliesRail(dt);
  } else {
    if (!P.dead) updateShipFree(dt);
    updateArena(dt);
  }
  if (G.mode === 'rail') {
    World.update(camera, G.railZ);
  } else World.update(camera, 0);
  // enemies
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    if (e.ai) e.ai(e, dt);
    if (!e.dead && !e.noContact && !P.dead && e.type !== 'part' && e.type !== 'turret' && e.type !== 'tower' && e.type !== 'mine' && e.type !== 'missile' && P.rollT <= 0) {
      if (e.pos.distanceToSquared(P.pos) < (e.r + 2.2) * (e.r + 2.2)) { hurtPlayer(16, 'hit'); killEnemy(e, 'ram'); }
    }
  }
  if (G.boss && G.boss.group) updateBoss(dt);
  if (G.enemies.some((e) => e.dead)) G.enemies = G.enemies.filter((e) => !e.dead);
  updateBullets(dt); updatePickups(dt);
  if (P.dead && G.state === 'play') { G.deadT += dt; if (G.deadT > 2.2 && !G.demo) { G.state = 'dead'; UI.showGameOver(); } else if (G.deadT > 0.5 && G.demo) { P.dead = false; P.hp = P.max; P.mesh.visible = true; } }
  Fx.update(dt);
  G.whiteout = Math.max(0, G.whiteout - dt * 1.4);
  updateCamera(dt);
  if (G.state === 'play') HUD.update(dt);
}

/* ============================== attract-mode pilot ============================== */
const demoS = { bombT: 0, rollT: 0, boostT: 0 };
function demoControl(dt) {
  const A = Input.ai || (Input.ai = { moveX: 0, moveY: 0 }); if (!A) return;
  for (const k of ACTIONS) A[k] = false;
  demoS.bombT -= dt; demoS.rollT -= dt;
  let tx = 0, ty = 0, has = false;
  if (G.mode === 'rail') {
    let best = null, bd = 1e9;
    for (const p of G.pickups) { const a = P.pos.z - p.pos.z; if (a > 10 && a < 260 && a < bd) { bd = a; best = p; } }
    if (!best) for (const e of G.enemies) { if (e.dead || !e.lock || e.shield && e.shield()) continue; const a = P.pos.z - e.pos.z; if (a > 25 && a < 320 && a < bd) { bd = a; best = e; } }
    let gx = null; for (const g of G.gates) if (!g.passed && P.pos.z - g.z > 0 && P.pos.z - g.z < 140) gx = g;
    if (best) { tx = best.pos.x; ty = best.pos.y; has = true; }
    A.moveX = clamp((tx - P.lx) * 0.22, -1, 1) * (has ? 1 : 0); A.moveY = clamp((ty - P.ly) * 0.22, -1, 1) * (has ? 1 : 0);
    if (!has) { A.moveX = Math.sin(G.t * 0.7) * 0.6 - P.lx * 0.05; A.moveY = Math.cos(G.t * 0.9) * 0.4 - P.ly * 0.05; }
    const tt = G.t % 5; A.fire = tt < 3.0 ? (G.t * 9) % 1 < 0.5 : tt < 4.5;
    let near = 0; for (const e of G.enemies) if (!e.dead && Math.abs(P.pos.z - e.pos.z) < 150) near++;
    if (near >= 6 && demoS.bombT <= 0) { A.bomb = true; demoS.bombT = 9; }
    for (const b of G.eb) if (b.pos.distanceTo(P.pos) < 22 && demoS.rollT <= 0) { A[Math.random() < 0.5 ? 'rollL' : 'rollR'] = true; demoS.rollT = 2.2; break; }
    A.boost = (G.t % 11) > 8.5;
  } else {
    let best = null, bd = 1e9;
    const A2 = G.arena;
    const cand = [];
    if (A2) { if (A2.stage === 3 && A2.core && !A2.core.dead) cand.push(A2.core); if (A2.stage === 2) A2.gens.forEach((g) => { if (!g.dead) cand.push(g); }); }
    for (const e of G.enemies) if (!e.dead && e.type === 'fighter') cand.push(e);
    const stagePref = A2 && A2.stage >= 2;
    for (const e of cand) { let d = e.pos.distanceTo(P.pos); if (stagePref && e.type === 'part') d *= 0.4; if (d < bd) { bd = d; best = e; } }
    if (best) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ')).invert();
      const loc = best.pos.clone().sub(P.pos).applyQuaternion(q);
      const dist = loc.length();
      A.moveX = loc.z > 0 ? (loc.x >= 0 ? 1 : -1) : clamp(loc.x / Math.max(10, -loc.z) * 3, -1, 1);
      const up = clamp(loc.y / Math.max(10, Math.abs(loc.z)) * 3, -1, 1); A.moveY = S.pitchStyle === 1 ? -up : up;
      if (loc.z < 0 && Math.hypot(loc.x, loc.y) / Math.max(1, -loc.z) < 0.14 && dist < 400) A.fire = (G.t * 9) % 1 < 0.6;
      const tt = G.t % 6; if (tt > 4 && tt < 5.6 && loc.z < 0) { A.fire = true; }
      A.boost = dist > 280 && loc.z < 0; A.brake = dist < 60;
      if (dist < 70 && best.type === 'part') A.moveY = clamp(A.moveY + 0.5, -1, 1);
      if (P.pos.y < 8) A.moveY = S.pitchStyle === 1 ? -1 : 1;
    } else { A.moveX = 0.4; A.moveY = 0; }
    if (Math.hypot(P.pos.x, P.pos.z) > 650) { A.moveX = 1; }
    for (const b of G.eb) if (b.pos.distanceTo(P.pos) < 25 && demoS.rollT <= 0) { A.rollL = true; demoS.rollT = 2.5; break; }
  }
}
