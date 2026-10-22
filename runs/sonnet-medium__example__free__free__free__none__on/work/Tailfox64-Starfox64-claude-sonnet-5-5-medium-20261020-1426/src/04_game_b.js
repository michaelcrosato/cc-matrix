/* ============================== rail enemy AI ============================== */
const AI = {};
function gone(e) { e.dead = true; e.gone = true; removeEnemy(e); }
function railFace(e, dt) {
  if (!e.mesh) return;
  e.mesh.position.copy(e.pos);
  e.mesh.rotation.set(0, Math.PI, clamp(-e.vel.x * 0.02, -0.7, 0.7));
  e.mesh.scale.setScalar(e.flash > 0 ? 1.18 : 1);
}
AI.drone = (e, dt) => {
  const o = e.o; e.t += dt; e.prev.copy(e.pos);
  if (e.state === 'in') { e.rz = Math.max(o.holdRz, e.rz - (o.cin || 120) * dt); if (e.rz <= o.holdRz + 0.01) { e.state = 'hold'; e.stT = 0; } }
  else if (e.state === 'hold') { e.stT += dt; if (e.stT > o.hold) e.state = 'out'; }
  else { e.rz -= (o.cout || 130) * dt; e.outT = (e.outT || 0) + dt; }
  e.pos.z = G.railZ - e.rz;
  let x = o.fx ? o.fx(e.t, e) : o.x0 + Math.sin(e.t * o.wf + o.ph) * o.wa;
  let y = o.fy ? o.fy(e.t, e) : o.y0 + Math.cos(e.t * o.wf * 0.8 + o.ph) * o.wa * 0.5;
  if (e.state === 'out') { x += o.side * e.outT * e.outT * 22; y += e.outT * e.outT * 7; }
  e.pos.x = x; e.pos.y = y;
  e.vel.set((x - e.prev.x) / dt, (y - e.prev.y) / dt, 0);
  e.fireT -= dt;
  if (o.fire && e.state !== 'out' && e.fireT <= 0 && e.rz > 50 && e.rz < 360) {
    const f = dif().fire;
    if (o.pattern === 'fan') { for (const a of [-0.16, 0, 0.16]) { const tg = predictTarget(e.pos, 90).clone(); const dir = tg.sub(e.pos).normalize(); dir.x += a; dir.normalize(); enemyBullet(e.pos, dir.multiplyScalar(90), { dmg: 9 }); } e.fireT = rnd(2, 2.8) * f; }
    else if (o.pattern === 'burst') { e.burst = 3; e.burstT = 0; e.fireT = rnd(1.8, 2.6) * f; }
    else { aimShot(e, 100); e.fireT = rnd(1.3, 2.4) * f; }
  }
  if (e.burst > 0) { e.burstT -= dt; if (e.burstT <= 0) { aimShot(e, 120, 0.04); e.burst--; e.burstT = 0.14; } }
  railFace(e, dt);
  if (e.rz < -80) gone(e);
};
AI.interceptor = AI.drone;
AI.bomber = AI.drone;
AI.fighter = AI.drone;
AI.chaser = (e, dt) => {
  const o = e.o; e.t += dt; e.prev.copy(e.pos);
  if (e.state === 'in') {
    e.rz = clamp(e.rz + (G.base - G.speed) * dt * 1.05, -95, 1e9);
    e.pos.x = damp(e.pos.x, P.pos.x + Math.sin(e.t * 1.3) * 7, 2.5, dt); e.pos.y = damp(e.pos.y, P.pos.y + Math.cos(e.t * 1.7) * 3.5, 2.5, dt);
    G.tailCount++; e.fireT -= dt;
    if (e.fireT <= 0) { aimShot(e, 95, 0.03, { dmg: 7 }); e.fireT = rnd(1.0, 1.5) * dif().fire; }
    if (e.rz > 8) { e.state = 'out'; e.lock = true; HUD.say('pike', 'He overshot! Light him up, Ember!', 2.2); }
    if (e.t > o.life) { HUD.say('pike', 'Splash one! Your six is clear.', 2.2); Fx.explosion(e.pos, 1); killEnemy(e, 'ally'); return; }
    e.vel.set(0, 0, 0);
  } else {
    e.rz += 55 * dt; e.pos.x += o.side * 16 * dt; e.vel.set(o.side * 16, 0, 0);
    if (e.rz > 420) { gone(e); return; }
  }
  e.pos.z = G.railZ - e.rz;
  if (e.mesh) { e.mesh.position.copy(e.pos); e.mesh.rotation.set(0, 0, Math.sin(e.t * 2) * 0.25); e.mesh.scale.setScalar(e.flash > 0 ? 1.18 : 1); }
};
AI.turret = (e, dt) => {
  e.t += dt; const ahead = G.railZ - e.pos.z;
  if (ahead < -70) { gone(e); return; }
  const head = e.mesh.userData.head;
  if (head) { const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z; head.rotation.y = Math.atan2(-dx, -dz); }
  e.fireT -= dt;
  if (ahead > 70 && ahead < 320 && e.fireT <= 0) {
    const org = e.pos.clone(); org.y += e.type === 'tower' ? 20 : 3; const fake = { pos: org };
    if (e.o.missiles && Math.random() < 0.45) fireEnemyMissile(org); else aimShot(fake, 95, undefined, { dmg: 9 });
    e.fireT = rnd(1.8, 2.8) * dif().fire;
  }
  e.mesh.scale.setScalar(e.flash > 0 ? 1.1 : 1);
};
AI.tower = AI.turret;
AI.mine = (e, dt) => {
  e.t += dt; const ahead = G.railZ - e.pos.z;
  if (ahead < -70) { gone(e); return; }
  e.mesh.rotation.y += dt; e.mesh.rotation.x += dt * 0.6; e.mesh.position.set(e.pos.x, e.pos.y + Math.sin(e.t * 2) * 0.8, e.pos.z);
  if (!P.dead && e.pos.distanceTo(P.pos) < 5.5) { hurtPlayer(15, 'hit'); killEnemy(e, 'mine'); }
};
function fireEnemyMissile(org) {
  const e = spawnEnemy('missile', org, { ai: 'missile', noCount: true });
  e.vel.set(rnd(-10, 10), 14, 5); e.life = 8; e.spd = 56; return e;
}
AI.missile = (e, dt) => {
  e.t += dt; e.life -= dt; e.prev.copy(e.pos);
  const tg = predictTarget(e.pos, e.spd).clone(); const want = tg.sub(e.pos).normalize();
  if (e.t < 0.4) { e.pos.addScaledVector(e.vel, dt); } else { e.vel.normalize().lerp(want, 1 - Math.exp(-2.2 * dt)).normalize().multiplyScalar(e.spd); e.pos.addScaledVector(e.vel, dt); }
  if (e.mesh) { faceDir(e.mesh, _t2.copy(e.vel).normalize()); e.mesh.position.copy(e.pos); }
  Fx.emit(e.pos, 1, { color: 0xffaa44, speed: 3, size: 1.2, life: 0.4 });
  if (!P.dead && e.pos.distanceTo(P.pos) < 3.8) { hurtPlayer(14, 'hit'); killEnemy(e, 'mine'); return; }
  if (e.life <= 0 || e.pos.z > G.railZ + 40) gone(e);
};
AI.allyChaser = (e, dt) => {
  const o = e.o, j = o.ally; e.t += dt; e.prev.copy(e.pos);
  if (j.mode === 'chased') {
    e.pos.set(j.pos.x + Math.sin(e.t * 1.6 + o.idx * 2) * 9, j.pos.y + Math.cos(e.t * 1.3 + o.idx) * 4, j.pos.z + 24 + o.idx * 8);
    j.hp -= 3.6 * dt * (S.difficulty === 0 ? 0.6 : S.difficulty === 2 ? 1.25 : 1);
    e.fireT -= dt;
    if (e.fireT <= 0) { e.fireT = rnd(0.25, 0.5); const dir = _t1.copy(j.pos).sub(e.pos).normalize(); Fx.emit(e.pos, 3, { color: 0xffe080, speed: 4, size: 0.8, life: 0.35, vel: dir.clone().multiplyScalar(160) }); }
    e.vel.set(0, 0, 0);
  } else {
    // ally gone or saved: become an ordinary attacker
    e.ai = AI.drone; e.rz = G.railZ - e.pos.z;
    e.o = Object.assign({}, e.o, { holdRz: 110, hold: 6, x0: e.pos.x, y0: e.pos.y, wa: 4, wf: 1.4, ph: 0, fire: true, pattern: 'aim', side: 1, cin: 80, cout: 120 });
    return;
  }
  if (e.mesh) { e.mesh.position.copy(e.pos); e.mesh.rotation.set(0, 0, Math.sin(e.t * 2 + o.idx) * 0.3); e.mesh.scale.setScalar(e.flash > 0 ? 1.18 : 1); }
};

/* ============================== allies ============================== */
const WING = [
  { name: 'WICK', key: 'wick', pal: { body: 0xcfd6e6, acc: 0x5b6f9a, hot: 0xffa030 }, off: V3(-15, 3, 4) },
  { name: 'JUNO', key: 'juno', pal: { body: 0xf4e6f0, acc: 0x2cc4a0, hot: 0xff6aa8 }, off: V3(16, 2, 6) },
  { name: 'PIKE', key: 'pike', pal: { body: 0xf0d0d0, acc: 0xd0384a, hot: 0xffd040 }, off: V3(0, 11, 10) },
];
function makeAllies() {
  for (const a of G.allies) scene.remove(a.mesh);
  G.allies = WING.map((w, i) => {
    const m = Mdl.hero(w.pal); m.scale.setScalar(0.9); scene.add(m); addShadow(m);
    return { name: w.name, key: w.key, mesh: m, pos: P.pos.clone().add(w.off), off: w.off.clone(), hp: 100, max: 100, mode: 'form', rz: 0, t: rnd(6), fireT: rnd(1, 2.5), idx: i, vel: V3(), respawn: 0 };
  });
}
function updateAlliesRail(dt) {
  for (const a of G.allies) {
    a.t += dt; const prevx = a.pos.x;
    if (a.mode === 'form') {
      const tx = P.pos.x + a.off.x + Math.sin(a.t * 0.8 + a.idx) * 3, ty = P.pos.y * 0.6 + a.off.y + Math.cos(a.t * 0.6 + a.idx) * 2;
      a.pos.x = damp(a.pos.x, clamp(tx, -48, 48), 1.6, dt); a.pos.y = damp(a.pos.y, clamp(ty, -16, 22), 1.6, dt); a.pos.z = G.railZ - (10 - a.off.z) + 6 - 6;
      a.pos.z = G.railZ + a.off.z * 0.2 - 4;
    } else if (a.mode === 'chased') {
      a.rz = damp(a.rz, 118, 1.4, dt);
      a.pos.set(Math.sin(a.t * 0.9) * 26, 2 + Math.sin(a.t * 1.3) * 7, G.railZ - a.rz);
      if (a.hp <= 0) failJuno();
    } else if (a.mode === 'away') {
      a.pos.y += 25 * dt; a.pos.z -= 40 * dt; a.mesh.visible = a.pos.y < 150;
    }
    a.mesh.position.copy(a.pos);
    const vx = (a.pos.x - prevx) / dt;
    a.mesh.rotation.set(0, 0, clamp(-vx * 0.03, -0.8, 0.8));
    allyFlames(a.mesh, dt);
    // supporting fire
    a.fireT -= dt;
    if (a.mode === 'form' && a.fireT <= 0) {
      const tg = G.enemies.find((e) => !e.dead && e.lock && !e.shield && e.pos.z < a.pos.z - 40 && G.railZ - e.pos.z < 260 && Math.abs(e.pos.x - a.pos.x) < 60);
      a.fireT = rnd(1.2, 2.4);
      if (tg) {
        const dir = tg.pos.clone().sub(a.pos).normalize(); const m = new THREE.Mesh(BOLT.g, BOLT.ally); faceDir(m, dir); m.position.copy(a.pos); scene.add(m);
        G.pb.push({ mesh: m, pos: a.pos.clone(), prev: a.pos.clone(), vel: dir.multiplyScalar(320), life: 1.2, dmg: 1, type: 'ally', target: null, pierce: false }); Snd.allyLaser();
      }
    }
  }
}
function allyFlames(m, dt) { const f = m.userData.flames; if (f) f.forEach((c) => c.scale.set(1, 0.8 + Math.random() * 0.5, 1)); }
function failJuno() {
  const j = G.juno; if (!j || j.done) return;
  j.done = true; j.failed = true; j.ally.mode = 'away';
  HUD.say('juno', "I'm hit! Pulling out — you're on your own, Ember!", 3.5); Snd.warn();
  setTimeout(() => { G.noFill = false; }, 3500);
}
function junoEvent() {
  const j = G.allies.find((a) => a.name === 'JUNO'); if (!j) return;
  j.mode = 'chased'; j.rz = 60; j.hp = 100; G.noFill = true;
  G.juno = { ally: j, chasers: [], done: false, failed: false };
  HUD.say('juno', "Ember, three bogeys on my tail! I can't shake them!", 3.5); HUD.warn('ALLY UNDER FIRE', 2.6); Snd.warn();
  for (let i = 0; i < 3; i++) {
    const e = spawnEnemy('interceptor', V3(0, 0, G.railZ - 140), { ai: 'allyChaser', ally: j, idx: i, noScale: true }); e.fireT = rnd(0.2, 0.6);
    e.onDeath = () => {
      const J = G.juno; if (!J || J.done) return;
      if (J.chasers.every((c) => c.dead)) {
        J.done = true; j.mode = 'form'; addScore(1500); G.noFill = false;
        HUD.say('juno', 'Thanks, Ember — that was close! Take this!', 3.2);
        spawnPickup('laser', 0, 2, 190); HUD.flashText('ALLY RESCUED +1500');
      }
    };
    G.juno.chasers.push(e);
  }
}

/* ============================== pickups ============================== */
function spawnPickup(kind, x, y, rz) {
  const col = kind === 'repair' ? 0xffd040 : kind === 'bomb' ? 0x40a0ff : 0x60ff90;
  const mesh = kind === 'laser' ? Mdl.pod(col) : Mdl.ring(col, kind === 'bomb' ? 4.2 : 5.5);
  const p = { kind, mesh, pos: V3(x, y, G.railZ - rz), r: kind === 'laser' ? 4.2 : 6.5, t: 0, got: false };
  mesh.position.copy(p.pos); scene.add(mesh); G.pickups.push(p); if (kind !== 'laser') G.ringsTotal++;
  return p;
}
function collectPickup(p) {
  p.got = true; Snd.pickup(p.kind === 'laser'); Fx.ring(p.pos, 10, 0xffffff, 0.5); Fx.flash(p.pos, 14, 0xffffff, 0.35);
  G.ringsGot++; addScore(150);
  if (p.kind === 'repair') { healPlayer(30); HUD.flashText('SHIELD REPAIR'); }
  else if (p.kind === 'bomb') { P.bombs = Math.min(5, P.bombs + 1); HUD.flashText('NOVA BOMB +1'); }
  else { if (P.laser < 3) { P.laser++; HUD.flashText(P.laser === 2 ? 'TWIN LASER' : 'HYPER LASER'); } else { healPlayer(15); HUD.flashText('LASER MAXED +15 SHIELD'); } }
}
function updatePickups(dt) {
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt; p.mesh.position.copy(p.pos); p.mesh.rotation.y += dt * 1.4; if (p.mesh.userData.r) p.mesh.userData.r.rotation.x += dt * 3;
    if (G.mode === 'free') {
      if (!P.dead && p.pos.distanceTo(P.pos) < p.r + 3) { collectPickup(p); scene.remove(p.mesh); G.pickups.splice(i, 1); continue; }
      p.life = (p.life === undefined ? 40 : p.life) - dt; if (p.life < 0) { scene.remove(p.mesh); G.pickups.splice(i, 1); }
      continue;
    }
    const dz = p.pos.z - P.pos.z;
    if (!P.dead && Math.abs(dz) < 4 && Math.hypot(p.pos.x - P.pos.x, p.pos.y - P.pos.y) < p.r) { collectPickup(p); scene.remove(p.mesh); G.pickups.splice(i, 1); continue; }
    if (dz > 30) { scene.remove(p.mesh); G.pickups.splice(i, 1); }
  }
}

/* ============================== waves ============================== */
function dr(o) {
  const d = Object.assign({ x0: 0, y0: 0, rz: AHEAD, holdRz: rnd(120, 170), hold: rnd(2.5, 4), wa: rnd(3, 8), wf: rnd(1, 2), ph: rnd(6), cin: 130, cout: 130, fire: true, pattern: 'aim' }, o);
  d.side = d.side || (d.x0 >= 0 ? 1 : -1);
  const e = spawnEnemy(d.type || 'drone', V3(d.x0, d.y0, G.railZ - d.rz), d); e.rz = d.rz; if (e.mesh) e.mesh.rotation.y = Math.PI; return e;
}
const WV = {
  line(n = 5, y = 4, o = {}) { for (let i = 0; i < n; i++) dr(Object.assign({ x0: (i - (n - 1) / 2) * 15, y0: y, rz: AHEAD + i * 14 }, o)); },
  vee(n = 5, o = {}) { for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; dr(Object.assign({ x0: k * 13, y0: 8 - Math.abs(k) * 3, rz: AHEAD + Math.abs(k) * 24 }, o)); } },
  ring(n = 8, R = 22) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dr({ fx: (t) => Math.cos(t * 1.6 + a) * R, fy: (t) => 3 + Math.sin(t * 1.6 + a) * R * 0.6, hold: 5.5, holdRz: 150, x0: 0, side: i % 2 ? 1 : -1 }); } },
  cross(side = 1, n = 4) { for (let i = 0; i < n; i++) dr({ fx: (t) => side * (84 - (t - i * 0.6) * 36), fy: (t) => 6 + Math.sin(t * 2 + i) * 6, hold: 5, holdRz: 130 + i * 8, x0: side * 80, side }); },
  bombers(n = 2) { for (let i = 0; i < n; i++) dr({ type: 'bomber', x0: (i - (n - 1) / 2) * 34, y0: 5, holdRz: 175, hold: 8, wa: 3, pattern: 'fan', cin: 90, cout: 100 }); },
  interceptors(n = 4) { for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1; dr({ type: 'interceptor', fx: (t) => lerp(s * 75, P.pos.x * 0.5 + s * 10, smooth(0, 1.8, t)) + Math.sin(t * 3 + i) * 5, fy: (t) => lerp(40, 4, smooth(0, 1.8, t)) + Math.sin(t * 2 + i) * 3, holdRz: 70, hold: 2.5, pattern: 'burst', cin: 190, cout: 170, rz: AHEAD + i * 40, x0: s * 60 }); } },
  turrets(n = 5, type = 'turret', missiles = false) {
    for (let i = 0; i < n; i++) {
      const x = (i % 2 ? 1 : -1) * rnd(22, 56), z = G.railZ - (AHEAD + 20) - i * 24; let y = Math.max(terrainH(x, z), -27) + 1.2;
      if (canyonCf(-z) > 0.5) { const hw = canyonW(-z); const xx = (i % 2 ? 1 : -1) * (hw - 8); const e = spawnEnemy(type, V3(xx, -30 + 0.5, z), { world: true, ai: type, missiles }); e.mesh.position.copy(e.pos); continue; }
      const e = spawnEnemy(type, V3(x, y, z), { world: true, ai: type, missiles }); e.mesh.position.copy(e.pos);
    }
  },
  mines(n = 7) { for (let i = 0; i < n; i++) { const z = G.railZ - AHEAD - i * 28 - rnd(0, 14); const e = spawnEnemy('mine', V3(rnd(-30, 30), rnd(-8, 12), z), { world: true, ai: 'mine' }); e.mesh.position.copy(e.pos); } },
  tail(n = 2) { for (let i = 0; i < n; i++) { const e = spawnEnemy('chaser', V3(P.pos.x + (i ? 6 : -6), P.pos.y, G.railZ + 50), { ai: 'chaser', life: 11 + i * 1.8, side: i ? 1 : -1, noScale: false }); e.rz = -50 - i * 14; } },
  rings(kind, x = 0, y = 2, rz = AHEAD) { spawnPickup(kind, x, y, rz); },
};
function gate(at, gx, gy) {
  const z = -(at + 700); const g = { z, clean: true, passed: false };
  G.gates.push(g); World.wallHole(z, gx, gy, 10, 8, g);
}
function pillars(at, xs, top = 8) { xs.forEach((x, i) => World.pillar(x, -(at + 700) - i * 18, top + Math.random() * 6)); }
G.gates = [];

/* ---- filler director ---- */
function fillWave() {
  const d = -G.railZ, canyon = d > CANYON_START;
  const pool = canyon
    ? [() => WV.interceptors(4), () => WV.vee(5, { pattern: 'burst' }), () => WV.cross(rsign(), 4), () => WV.bombers(2), () => WV.turrets(4, 'tower', true), () => WV.tail(1), () => WV.line(6, 6), () => WV.ring(8), () => WV.mines(6)]
    : [() => WV.line(5), () => WV.vee(5), () => WV.cross(rsign(), 4), () => WV.mines(6), () => WV.turrets(4), () => WV.line(3, 8, { pattern: 'burst' }), () => WV.ring(6, 18), () => WV.bombers(1)];
  pick(pool)();
  if (Math.random() < 0.35) WV.rings(pick(['repair', 'bomb', 'repair']), rnd(-24, 24), rnd(-4, 10), AHEAD - 40);
}

/* ============================== level script ============================== */
function buildEvents() {
  const E = [];
  const ev = (at, fn) => E.push({ at, fn });
  const say = (at, who, text, dur) => ev(at, () => HUD.say(who, text, dur));
  // ---- Phase A: Halcyon Sea ----
  say(10, 'control', 'Lantern Wing, you are cleared to launch. The Gloam fleet is massing over Halcyon Reach.', 4.5);
  ev(30, () => HUD.phase('HALCYON SEA'));
  say(90, 'wick', 'Stay on my wing, Ember. Pick off the scouts as they come in.', 3.5);
  ev(100, () => HUD.hint(`Steer with ${gl('move')}  ·  Fire with ${gl('fire')}`, 5));
  ev(150, () => WV.line(4));
  ev(175, () => HUD.hint(`Tap ${gl('fire')} to shoot. Fly through gold rings to repair shield`, 5));
  ev(300, () => { WV.vee(5); });
  ev(360, () => WV.rings('repair', 0, 4, AHEAD - 20));
  ev(520, () => { WV.line(6, 6, { hold: 5.5, holdRz: 150 }); HUD.say('juno', 'Hold fire to lock on, then release to launch homing shots!', 4); HUD.hint(`HOLD ${gl('fire')} over targets, then release`, 6); });
  ev(780, () => { WV.turrets(5); HUD.say('wick', 'Gun platforms on the water. Pick them off before they find the range.', 3.5); });
  ev(900, () => { WV.bombers(2); HUD.say('pike', 'Bombers! Barrel roll to bat their shots right back!', 3.5); });
  ev(920, () => HUD.hint(`Barrel roll with ${gl('roll')} to deflect enemy fire`, 6));
  ev(1100, () => WV.cross(1, 4));
  ev(1200, () => { WV.mines(8); WV.rings('bomb', -10, 2, AHEAD + 100); HUD.hint(`Nova bomb with ${gl('bomb')} clears everything nearby`, 5); });
  ev(1450, () => { WV.ring(8); HUD.say('wick', 'Ring formation! Lock on and clear them all in one go.', 3.5); });
  ev(1600, () => WV.rings('laser', 0, 3, AHEAD - 20));
  ev(1750, () => { WV.tail(2); HUD.say('pike', "Two on your six! Brake and let 'em overshoot — or I'll take them.", 4); });
  ev(1770, () => HUD.hint(`Brake with ${gl('brake')} to make tails overshoot  ·  Boost with ${gl('boost')}`, 6));
  ev(2150, () => WV.line(5, 4, { pattern: 'burst' }));
  ev(2350, () => { WV.interceptors(4); HUD.say('wick', 'Interceptors, diving in fast!', 2.5); });
  ev(2700, () => { WV.turrets(4, 'tower', true); HUD.say('juno', 'Missile towers ahead — shoot the missiles down or roll through them!', 3.8); });
  ev(2780, () => WV.rings('repair', 8, 0, AHEAD + 60));
  ev(3000, () => { WV.bombers(3); });
  ev(3200, () => { WV.vee(7); });
  ev(3500, () => { HUD.say('control', 'Canyon ahead. The Gate Cut leads straight to the fleet — fly clean.', 4); WV.rings('repair', 0, 2, AHEAD); });
  ev(3750, () => { WV.ring(10, 24); });
  ev(4000, () => { Fx.flash(P.pos, 1, 0xffffff, 0.01); G.whiteout = 0.7; setEnv('canyon'); Music.set('combat'); HUD.phase('GATE CUT CANYON'); });
  // ---- Phase B: Gate Cut Canyon ----
  ev(4210, () => { HUD.checkpoint(1); });
  ev(4260, () => HUD.say('wick', "Narrow walls. Thread the gates — and don't clip the rock.", 3.5));
  ev(4300, () => gate(4300, 0, 2));
  ev(4480, () => { gate(4480, -14, 4); WV.line(4, 6); });
  ev(4680, () => { gate(4680, 14, 0); pillars(4660, [-22, 20, -6]); });
  ev(4900, () => { WV.interceptors(4); });
  ev(5100, () => { WV.cross(-1, 5); gate(5100, 0, 6); });
  ev(5350, () => { junoEvent(); });
  ev(5800, () => { WV.turrets(5, 'tower', true); WV.rings('repair', 0, 2, AHEAD); });
  ev(6000, () => { gate(6000, 12, 4); WV.vee(5, { pattern: 'burst' }); });
  ev(6200, () => { gate(6200, -12, 6); pillars(6180, [10, -18]); });
  ev(6400, () => { gate(6400, 0, 0); WV.bombers(2); });
  ev(6650, () => { WV.tail(2); HUD.say('pike', 'More company on your tail, Ember!', 2.8); });
  ev(6900, () => { WV.turrets(6, 'tower', true); WV.rings('bomb', 0, 2, AHEAD); });
  ev(7150, () => { WV.interceptors(6); });
  ev(7450, () => { WV.rings('laser', 0, 3, AHEAD); WV.ring(10, 24); });
  ev(7700, () => { WV.rings('repair', 0, 2, AHEAD); WV.line(6, 6); });
  ev(7900, () => { gate(7900, -14, 2); });
  ev(8060, () => { gate(8060, 14, 6); });
  ev(8220, () => { gate(8220, -6, 0); WV.vee(7); });
  ev(8500, () => { WV.bombers(3); WV.cross(1, 4); });
  ev(8700, () => { WV.rings('repair', 0, 2, AHEAD); WV.rings('bomb', -14, 0, AHEAD + 40); });
  ev(8800, () => { G.noFill = true; HUD.say('control', 'Huge energy signature dead ahead! Ember, that is a Gloam Bastion!', 3.5); HUD.warn('WARNING', 3); Snd.warn(); });
  ev(8950, () => { HUD.checkpoint(2); });
  ev(BOSS_D, () => { spawnBastion(); });
  E.sort((a, b) => a.at - b.at);
  return E;
}

/* ============================== mid-boss: Bastion ============================== */
function spawnBastion() {
  const g = new THREE.Group(), dark = M(0x3b3f56), red = M(0xa82a40), plate = M(0x6a7090);
  g.add(box(16, 9, 24, dark, 0, 0, 0)); g.add(box(22, 3, 12, red, 0, 5, 3)); g.add(box(9, 5, 8, plate, 0, 1, 12));
  for (const sx of [-1, 1]) {
    g.add(box(6, 5, 20, dark, sx * 15, 0, -2)); g.add(box(2, 12, 10, red, sx * 21, 3, 4));
    const w = mesh(wingGeo(14, -4, 2, 8, 10, 0.6), plate); w.material.side = THREE.DoubleSide; w.scale.x = sx; w.position.set(sx * 8, 1.5, 3); g.add(w);
    const eng = mesh(new THREE.CircleGeometry(3, 10), GLOW(0xff7a30, 3.5), sx * 6, 0, 12.2); eng.rotation.y = Math.PI; g.add(eng);
  }
  g.add(mesh(new THREE.CircleGeometry(4, 10), GLOW(0xff7a30, 3.5), 0, 0, 12.2)); g.children[g.children.length - 1].rotation.y = Math.PI;
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), shieldMat); bubble.position.set(0, 0, -9); g.add(bubble);
  const wp = (x) => { const m = new THREE.Group(); const c = cyl(2.4, 3, 7, dark, 0, 0, 0, 8); c.rotation.x = Math.PI / 2; m.add(c); m.add(mesh(new THREE.SphereGeometry(2.6, 8, 6), GLOW(0xff3050, 3), 0, 0, -3.8)); return m; };
  const coreMesh = new THREE.Group(); coreMesh.add(mesh(new THREE.SphereGeometry(4.2, 12, 10), GLOW(0xff5030, 2.6), 0, 0, 0));
  g.position.set(0, 4, G.railZ - (AHEAD + 120)); scene.add(g);
  const B = { group: g, t: 0, rz: AHEAD + 120, p2: false, dying: false, bubble, cannonT: 2.5, missT: 6, ringT: 2, beamT: 6, spawnT: 8, side: 0, beam: null, name: 'BASTION WALKER', done: false };
  const cL = spawnEnemy('part', V3(), { hp: 22, r: 6, mesh: wp(), off: V3(-21, 3, -12), score: 800 }, g); const cR = spawnEnemy('part', V3(), { hp: 22, r: 6, mesh: wp(), off: V3(21, 3, -12), score: 800 }, g);
  const core = spawnEnemy('part', V3(), { hp: 60, r: 6.2, mesh: coreMesh, off: V3(0, 0, -11), score: 5000, shield: () => !(cL.dead && cR.dead), onDeath: () => bastionDeath(B) }, g);
  core.def = Object.assign({}, ENEMY.part, { expl: 3 });
  B.l = cL; B.r = cR; B.core = core; B.parts = [cL, cR, core]; B.maxTotal = cL.maxHp + cR.maxHp + core.maxHp;
  G.boss = B; Music.set('boss'); setEnv('boss'); G.whiteout = 0.5;
  HUD.say('wick', "That's the Bastion! Knock out the arm cannons first to crack its shield!", 4);
  HUD.hint(`Lock on to weak points: hold ${gl('fire')}, release`, 6);
  HUD.warn('BOSS', 2.2); Snd.warn(); HUD.phase('BOSS: BASTION WALKER');
}
function bastionDeath(B) {
  B.dying = true; B.dyingT = 0; G.bossDone = true; G.bossDoneD = -G.railZ; addScore(5000);
  HUD.say('juno', "Scratch one Bastion! Great shooting, Ember!", 3);
}
function updateBoss(dt) {
  const B = G.boss; if (!B || B.done) return;
  B.t += dt;
  const enrage = B.core.hp < B.core.maxHp * 0.4 ? 1 : 0;
  B.rz = damp(B.rz, 150, 1.2, dt);
  const x = Math.sin(B.t * 0.45) * (enrage ? 26 : 18), y = 4 + Math.sin(B.t * 0.7) * 7;
  B.group.position.set(x, y, G.railZ - B.rz); B.group.rotation.z = Math.cos(B.t * 0.45) * 0.12; B.group.rotation.y = Math.sin(B.t * 0.3) * 0.08;
  for (const p of B.parts) { if (!p.dead) { p.pos.copy(p.o.off).applyMatrix4(B.group.matrixWorld); p.mesh.scale.setScalar(p.flash > 0 ? 1.15 : 1); } }
  B.group.updateMatrixWorld(true);
  for (const p of B.parts) if (!p.dead) p.pos.copy(p.o.off).applyMatrix4(B.group.matrixWorld);
  B.bubble.visible = !(B.l.dead && B.r.dead); B.bubble.material.opacity = 0.2 + 0.1 * Math.sin(B.t * 5);
  if (B.dying) {
    B.dyingT += dt; B.group.position.y -= dt * 3; B.group.rotation.z += dt * 0.4;
    if (Math.random() < dt * 9) { const p = B.group.position.clone().add(V3(rnd(-14, 14), rnd(-5, 7), rnd(-12, 12))); Fx.explosion(p, rnd(1, 2.2)); Snd.explode(1.5); G.shake = 0.5; }
    if (B.dyingT > 3) {
      Fx.explosion(B.group.position, 5); Snd.explode(3); G.shake = 1.2; G.whiteout = 0.6; scene.remove(B.group); B.done = true; G.boss = null;
      spawnPickup('repair', 0, 2, 120); spawnPickup('bomb', -10, 4, 170); HUD.phase('GATE CUT CANYON');
      HUD.say('control', 'Bastion down! The Gloam flagship is anchored over the Reach — take it out, Lantern Wing!', 4.5);
    }
    return;
  }
  const alive = (B.l.dead ? 0 : 1) + (B.r.dead ? 0 : 1), f = dif().fire;
  const org = (p) => (p && !p.dead ? p.pos.clone() : B.group.position.clone());
  if (alive > 0) {
    B.cannonT -= dt;
    if (B.cannonT <= 0) {
      const src = alive === 2 ? (B.side++ % 2 ? B.l : B.r) : (B.l.dead ? B.r : B.l); const o = org(src);
      const tg = predictTarget(o, 100).clone(); const dir = tg.sub(o).normalize();
      for (const a of [-0.13, 0, 0.13]) { const d = dir.clone(); d.x += a; d.normalize(); enemyBullet(o, d.multiplyScalar(100), { dmg: 10 }); }
      Snd.laser(1); B.cannonT = (alive === 2 ? 1.25 : 0.85) * f;
    }
    B.missT -= dt;
    if (B.missT <= 0) { for (let i = 0; i < 2; i++) fireEnemyMissile(B.group.position.clone().add(V3(i ? 8 : -8, 5, -10))); B.missT = 6.5 * f; HUD.warn('MISSILES', 1.2); }
  } else {
    if (!B.p2) { B.p2 = true; HUD.say('juno', 'Cannons are down — the core is exposed! Hit it with everything!', 3.5); Snd.shield(); Fx.ring(B.group.position, 30, 0x66ddff, 0.8); HUD.flashText('SHIELD DOWN'); }
    B.ringT -= dt;
    if (B.ringT <= 0) {
      const n = enrage ? 18 : 12, c = B.core.pos.clone(), ph = Math.random() * 6;
      for (let i = 0; i < n; i++) { const a = ph + (i / n) * Math.PI * 2; const dir = V3(Math.cos(a) * 0.55, Math.sin(a) * 0.4, 1).normalize(); enemyBullet(c, dir.multiplyScalar(48), { dmg: 9, big: true, life: 9 }); }
      Snd.warn(); B.ringT = (enrage ? 2.4 : 3.4) * f;
    }
    B.beamT -= dt;
    if (B.beamT <= 0 && !B.beam) {
      const bx = clamp(P.pos.x, -26, 26); B.beam = { t: 0, x0: bx, dir: bx > 0 ? -1 : 1, mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 70, 1), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })) };
      scene.add(B.beam.mesh); HUD.warn('LASER SWEEP', 1.4); Snd.warn(); B.beamT = enrage ? 5 : 7;
    }
    B.spawnT -= dt;
    if (B.spawnT <= 0 && G.enemies.filter((e) => e.type === 'drone').length < 4) { for (let i = 0; i < 3; i++) dr({ x0: (i - 1) * 22, y0: 6, rz: 300, holdRz: 80, hold: 3 }); B.spawnT = 9; }
  }
  if (B.beam) {
    const bm = B.beam; bm.t += dt; const fire = bm.t > 1.3, u = clamp((bm.t - 1.3) / 1.4, 0, 1);
    const x = bm.x0 + bm.dir * 28 * u, len = Math.max(10, (G.railZ + 20) - (G.railZ - B.rz));
    bm.mesh.position.set(x, B.group.position.y * 0.3, G.railZ - B.rz + len / 2 - 6); bm.mesh.scale.set(fire ? 7 : 0.8, 1, len);
    bm.mesh.material.opacity = fire ? 0.85 : 0.35 + 0.2 * Math.sin(bm.t * 30);
    if (fire && Math.abs(P.pos.x - x) < 5.2 && !P.dead) hurtPlayer(22, 'hit');
    if (bm.t > 2.8) { scene.remove(bm.mesh); B.beam = null; }
  }
}
