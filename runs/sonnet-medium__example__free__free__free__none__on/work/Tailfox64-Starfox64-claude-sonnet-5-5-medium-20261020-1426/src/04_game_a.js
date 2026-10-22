/* ============================== game state ============================== */
const DIFFS = [
  { name: 'EASY', dmg: 0.6, fire: 1.35, spread: 0.09, hp: 0.8 },
  { name: 'NORMAL', dmg: 1, fire: 1, spread: 0.05, hp: 1 },
  { name: 'HARD', dmg: 1.4, fire: 0.75, spread: 0.03, hp: 1.25 },
];
const dif = () => DIFFS[S.difficulty] || DIFFS[1];
const CP_D = [0, 4200, 8950];
const BOSS_D = 9000;
const AHEAD = 500;
const G = {
  state: 'off', mode: 'rail', demo: false, cheat: false, t: 0, railZ: 0, base: 62, speed: 62, shake: 0,
  enemies: [], pb: [], eb: [], pickups: [], allies: [], events: [], evI: 0, nextFill: 0, noFill: false,
  score: 0, hits: 0, chainT: 0, maxHits: 0, kills: 0, spawned: 0, dmgTaken: 0, time: 0, cp: 0, startCp: 0,
  bomb: null, boss: null, bossDone: false, arena: null, camOff: V3(), endT: 0, whiteout: 0, tailCount: 0,
  introT: 0, shielded: 0, juno: null, demoT: 0, cpBanner: 0, finished: false, deadT: 0, usedBombs: 0, ringsGot: 0, ringsTotal: 0, lastMusic: '',
};
const P = {
  mesh: null, pos: V3(), vel: V3(), lx: 0, ly: 0, vx: 0, vy: 0, hp: 100, max: 100, inv: 0, bombs: 3, laser: 1, boost: 1, boostLock: false,
  fireCD: 0, hold: 0, charge: 0, lockT: 0, locks: [], rollT: 0, rollDir: 1, rollCD: 0, yaw: 0, pitch: 0, bank: 0, speed: 70, uT: 0, uDir: 1,
  fwd: V3(0, 0, -1), obsCD: 0, dead: false, braking: false, boosting: false, oob: 0, wasBoost: false, wasBrake: false, chargeLevel: 0,
};
const _m4 = new THREE.Matrix4(), _o = V3(), _up = V3(0, 1, 0), _qq = new THREE.Quaternion(), _t1 = V3(), _t2 = V3();
// orient obj so its forward (-z) points along dir
function faceDir(obj, dir, k = 1) {
  if (Math.abs(dir.y) > 0.999) return;
  _m4.lookAt(_o, dir, _up); _qq.setFromRotationMatrix(_m4);
  if (k >= 1) obj.quaternion.copy(_qq); else obj.quaternion.slerp(_qq, k);
}
const gpos = () => G.railZ; // alias

/* ============================== enemy framework ============================== */
const ENEMY = {
  drone: { hp: 2, r: 2.6, score: 100, model: () => Mdl.drone(), lock: true },
  interceptor: { hp: 3, r: 2.6, score: 200, model: () => Mdl.interceptor(), lock: true },
  bomber: { hp: 9, r: 4.4, score: 400, model: () => Mdl.bomber(), lock: true, expl: 1.8 },
  turret: { hp: 2, r: 3, score: 150, model: () => Mdl.turret(), lock: true },
  tower: { hp: 6, r: 3.6, score: 350, model: () => Mdl.tower(), lock: true, expl: 1.6 },
  mine: { hp: 1, r: 2.2, score: 50, model: () => Mdl.mine(), lock: true },
  missile: { hp: 1, r: 1.8, score: 75, model: () => Mdl.missile(), lock: true, noCount: true },
  chaser: { hp: 3, r: 2.6, score: 250, model: () => Mdl.interceptor(), lock: false },
  fighter: { hp: 3, r: 2.8, score: 200, model: () => Mdl.drone(), lock: true },
  part: { hp: 20, r: 6, score: 800, model: null, lock: true, expl: 2 },
};
function spawnEnemy(type, pos, o = {}, parent = null) {
  const def = ENEMY[type];
  const hp = (o.hp || def.hp) * (o.noScale ? 1 : dif().hp);
  const e = { type, def, o, pos: pos.clone(), prev: pos.clone(), vel: V3(), hp, maxHp: hp, r: o.r || def.r, score: o.score === undefined ? def.score : o.score,
    t: 0, dead: false, flash: 0, fireT: rnd(0.6, 1.6), lock: o.lock === undefined ? def.lock : o.lock, mesh: null, state: 'in', stT: 0, rz: 0, world: !!o.world, shield: o.shield || null, parent, ai: AI[o.ai || type] || null, scale: 1 };
  const m = o.mesh || (def.model ? def.model() : null);
  if (m) { e.mesh = m; m.position.copy(pos); (parent || scene).add(m); addShadow(m); if (parent) m.position.copy(o.off || pos); }
  if (o.onDeath) e.onDeath = o.onDeath;
  if (!def.noCount && !o.noCount) G.spawned++;
  G.enemies.push(e); return e;
}
function removeEnemy(e) { if (e.mesh) e.mesh.parent && e.mesh.parent.remove(e.mesh); e.mesh = null; }
function addHit() { G.hits++; G.chainT = 3; if (G.hits > G.maxHits) G.maxHits = G.hits; }
function addScore(n) { G.score += Math.round(n * (1 + Math.min(G.hits, 50) / 25)); }
function damageEnemy(e, amt, src = 'player') {
  if (e.dead) return;
  if (e.shield && e.shield()) { Snd.shield(); Fx.emit(e.pos, 6, { color: 0x66ddff, speed: 25, size: 1.2, life: 0.4 }); Fx.flash(e.pos, 8, 0x66ddff, 0.2); return; }
  e.hp -= amt; e.flash = 0.14; Snd.hit();
  Fx.emit(e.pos, 5, { color: 0xffee88, speed: 22, size: 0.9, life: 0.4 });
  if (src === 'player') addHit();
  if (e.hp <= 0) killEnemy(e, src);
}
function killEnemy(e, src) {
  if (e.dead) return; e.dead = true;
  Fx.explosion(e.pos, e.def.expl || 1); Snd.explode(e.def.expl || 1);
  if (src === 'player') { addScore(e.score); if (!e.def.noCount && !e.o.noCount) G.kills++; }
  if (src === 'player' || src === 'bomb') Input.rumble(0.3, 0.5, 120);
  removeEnemy(e);
  if (e.onDeath) e.onDeath(e, src);
  const i = P.locks.indexOf(e); if (i >= 0) P.locks.splice(i, 1);
}
function hurtPlayer(amt, kind = 'bullet') {
  if (P.dead || G.state !== 'play') return;
  if (G.cheat) { Fx.flash(P.pos, 6, 0xff5050, 0.15); return; }
  if (P.inv > 0) return;
  const a = amt * dif().dmg;
  P.hp -= a; G.dmgTaken += a; P.inv = kind === 'bullet' ? 0.7 : 1.1; G.hits = 0; G.chainT = 0;
  G.shake = Math.max(G.shake, kind === 'bullet' ? 0.5 : 1); Snd.damage(); Input.rumble(1, 0.8, 260); HUD.flashDamage();
  Fx.emit(P.pos, 14, { color: 0xffaa44, speed: 20, size: 1.3, life: 0.6 });
  if (P.hp <= 0) { P.hp = 0; playerDie(); }
}
function playerDie() {
  P.dead = true; G.deadT = 0; Fx.explosion(P.pos, 3, 0xffaa55); Snd.explode(3); Input.rumble(1, 1, 600); P.mesh.visible = false; Snd.charge(false);
  HUD.say('control', 'Ember! Mayday, mayday... we lost her!', 3);
}
function healPlayer(a) {
  if (P.hp >= P.max) { P.max = Math.min(140, P.max + 10); HUD.flashText('SHIELD CAPACITY +10'); }
  P.hp = Math.min(P.max, P.hp + a); HUD.flashHeal();
}

/* ---- bullets ---- */
const predicted = new THREE.Vector3();
function predictTarget(from, speed) {
  const t = from.distanceTo(P.pos) / speed;
  if (G.mode === 'rail') predicted.set(P.pos.x, P.pos.y, P.pos.z - G.speed * t);
  else predicted.copy(P.pos).addScaledVector(P.fwd, P.speed * t * 0.9);
  return predicted;
}
function enemyBullet(pos, vel, o = {}) {
  const m = Mdl.enemyBullet(o.big); m.position.copy(pos); scene.add(m);
  G.eb.push({ mesh: m, pos: pos.clone(), prev: pos.clone(), vel: vel.clone(), life: o.life || 7, dmg: o.dmg || 10, r: o.big ? 1.8 : 1.1, home: o.home || 0 });
}
function aimShot(e, speed = 105, spread, o = {}) {
  const sp = spread === undefined ? dif().spread : spread;
  const tg = predictTarget(e.pos, speed).clone();
  const dir = tg.sub(e.pos).normalize(); dir.x += rnd(-sp, sp); dir.y += rnd(-sp, sp); dir.z += rnd(-sp, sp); dir.normalize();
  enemyBullet(e.pos, dir.multiplyScalar(speed), o);
}
function playerBolt(off, mat, dmg, speed, type = 'laser') {
  const m = new THREE.Mesh(BOLT.g, mat); const vel = V3();
  const pos = P.pos.clone();
  if (G.mode === 'rail') { pos.x += off; pos.z -= 3; vel.set(0, 0, -(speed + G.speed)); }
  else { const r = V3(1, 0, 0).applyQuaternion(P.mesh.quaternion); pos.addScaledVector(P.fwd, 3).addScaledVector(r, off); vel.copy(P.fwd).multiplyScalar(speed + P.speed * 0.5); faceDir(m, P.fwd); }
  m.position.copy(pos); scene.add(m);
  G.pb.push({ mesh: m, pos, prev: pos.clone(), vel, life: 2.2, dmg, type, target: null, pierce: false });
}
function firePrimary() {
  const l = P.laser; const mat = l === 1 ? BOLT.m1 : l === 2 ? BOLT.m2 : BOLT.m3;
  if (l === 1) playerBolt(0, mat, 1, 320); else if (l === 2) { playerBolt(-1.3, mat, 1, 320); playerBolt(1.3, mat, 1, 320); } else { playerBolt(-1.7, mat, 1.2, 340); playerBolt(0, mat, 1.5, 340); playerBolt(1.7, mat, 1.2, 340); }
  Snd.laser(l); P.fireCD = 0.1;
}
function fireHoming(list) {
  list.forEach((e, i) => {
    setTimeout(() => {
      if (G.state !== 'play') return;
      const m = new THREE.Mesh(BOLT.msl, BASIC(0x66f0ff)); m.scale.set(1.2, 1.4, 1.2); const pos = P.pos.clone(); pos.x += (i % 2 ? 1 : -1) * 1.5;
      const vel = G.mode === 'rail' ? V3((i % 2 ? 1 : -1) * 40, 18, -90) : P.fwd.clone().multiplyScalar(90).add(V3((i % 2 ? 1 : -1) * 40, 18, 0));
      m.position.copy(pos); scene.add(m); G.pb.push({ mesh: m, pos, prev: pos.clone(), vel, life: 3.5, dmg: 4, type: 'msl', target: e, pierce: false });
      Snd.missile();
    }, i * 55);
  });
}
function fireCharged() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), BASIC(0xffffff)); const pos = P.pos.clone(); const vel = V3();
  if (G.mode === 'rail') { pos.z -= 4; vel.set(0, 0, -(300 + G.speed)); } else { pos.addScaledVector(P.fwd, 4); vel.copy(P.fwd).multiplyScalar(420); }
  m.add(new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), BASIC(0x66ddff, { transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })));
  m.position.copy(pos); scene.add(m); G.pb.push({ mesh: m, pos, prev: pos.clone(), vel, life: 2.2, dmg: 6, type: 'big', target: null, pierce: true, hitSet: new Set() });
  Snd.missile(); Snd.laser(3);
}
function removePB(i) { scene.remove(G.pb[i].mesh); G.pb.splice(i, 1); }
function removeEB(i) { scene.remove(G.eb[i].mesh); G.eb.splice(i, 1); }

function updateBullets(dt) {
  for (let i = G.pb.length - 1; i >= 0; i--) {
    const b = G.pb[i]; b.prev.copy(b.pos);
    if (b.type === 'msl') {
      if (b.target && b.target.dead) b.target = nearestEnemy(b.pos, 400, true);
      if (b.target) {
        const want = _t1.copy(b.target.pos).sub(b.pos).normalize(), sp = 230;
        b.vel.normalize().lerp(want, 1 - Math.exp(-7 * dt)).normalize().multiplyScalar(sp);
      }
      faceDir(b.mesh, _t2.copy(b.vel).normalize());
      if (Math.random() < 0.8) Fx.emit(b.pos, 1, { color: 0x66f0ff, speed: 3, size: 1, life: 0.3, vel: V3(0, 0, 0) });
    }
    b.pos.addScaledVector(b.vel, dt); b.life -= dt; b.mesh.position.copy(b.pos);
    let used = false;
    for (const e of G.enemies) {
      if (e.dead || e.noHit) continue;
      const rr = e.r + (b.type === 'big' ? 3 : 1);
      if (segDist2(b.prev, b.pos, e.pos) < rr * rr) {
        if (b.hitSet) { if (b.hitSet.has(e)) continue; b.hitSet.add(e); }
        damageEnemy(e, b.dmg, b.type === 'ally' ? 'ally' : 'player');
        if (!b.pierce) { used = true; break; }
      }
    }
    const behind = G.mode === 'rail' && b.pos.z > G.railZ + 40;
    if (used || b.life <= 0 || behind || (G.mode === 'free' && b.pos.y < -62)) removePB(i);
  }
  for (let i = G.eb.length - 1; i >= 0; i--) {
    const b = G.eb[i]; b.prev.copy(b.pos);
    if (b.home) { const want = _t1.copy(P.pos).sub(b.pos).normalize(); b.vel.normalize().lerp(want, 1 - Math.exp(-b.home * dt)).normalize().multiplyScalar(b.speed || 60); }
    b.pos.addScaledVector(b.vel, dt); b.life -= dt; b.mesh.position.copy(b.pos);
    // barrel roll deflect
    if (P.rollT > 0 && b.pos.distanceTo(P.pos) < 9) {
      const tgt = nearestEnemy(b.pos, 500, false);
      const dir = tgt ? _t1.copy(tgt.pos).sub(b.pos).normalize() : _t1.copy(G.mode === 'rail' ? V3(0, 0, -1) : P.fwd);
      b.vel.copy(dir).multiplyScalar(210);
      G.pb.push({ mesh: b.mesh, pos: b.pos.clone(), prev: b.pos.clone(), vel: b.vel.clone(), life: 2.5, dmg: 3, type: 'refl', target: null, pierce: false });
      b.mesh.scale.setScalar(1.3); G.eb.splice(i, 1); Snd.deflect(); Fx.flash(b.pos, 6, 0xffffff, 0.2); addScore(25);
      continue;
    }
    const rr = b.r + 2.1;
    if (!P.dead && segDist2(b.prev, b.pos, P.pos) < rr * rr) { hurtPlayer(b.dmg); Fx.flash(b.pos, 5, 0xff8040, 0.2); removeEB(i); continue; }
    if (b.life <= 0 || (G.mode === 'rail' && b.pos.z > G.railZ + 50)) removeEB(i);
  }
}
function nearestEnemy(p, range, needLock) {
  let best = null, bd = range * range;
  for (const e of G.enemies) { if (e.dead || e.noHit || (needLock && !e.lock)) continue; const d = e.pos.distanceToSquared(p); if (d < bd) { bd = d; best = e; } }
  return best;
}

/* ---- screen-space helpers ---- */
const _pv = new THREE.Vector3();
function toNDC(p, out) { _pv.copy(p).project(camera); out.x = _pv.x; out.y = _pv.y; out.z = _pv.z; return _pv.z < 1 && _pv.z > -1; }
function reticlePos(far) {
  const d = far ? 120 : 62;
  if (G.mode === 'rail') return V3(P.pos.x, P.pos.y, P.pos.z - d);
  return P.pos.clone().addScaledVector(P.fwd, d);
}
