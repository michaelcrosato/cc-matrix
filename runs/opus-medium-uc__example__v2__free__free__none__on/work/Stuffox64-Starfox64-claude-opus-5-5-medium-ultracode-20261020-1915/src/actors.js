// Actors: tin-armada enemies & their movement patterns, wingmates, rival aces, bosses.
import * as THREE from 'three/webgpu';
import { makeEnemy, makeFighter, makeColossus, makeMusicBox, toon, glow } from './models.js';
import { ACES } from './levels.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const rnd = (a, b) => a + Math.random() * (b - a);

const STATS = {
  drone: { hp: 2, r: 2.8, score: 100, hits: 1, fire: 2.6 },
  dart: { hp: 2, r: 2.6, score: 120, hits: 1, fire: 2.0 },
  turret: { hp: 4, r: 3.2, score: 120, hits: 1, fire: 2.2 },
  tank: { hp: 5, r: 3.6, score: 150, hits: 1, fire: 2.8 },
  bomber: { hp: 16, r: 7, score: 500, hits: 3, fire: 2.2 },
  carrier: { hp: 5, r: 3.6, score: 200, hits: 1, fire: 0 },
  ace: { hp: 34, r: 3.4, score: 1500, hits: 5, fire: 0.9 },
  mine: { hp: 1, r: 2.6, score: 50, hits: 1, fire: 0 },
  pillar: { hp: 3, r: 2.4, score: 100, hits: 1, fire: 0 },
  satellite: { hp: 5, r: 3.4, score: 200, hits: 1, fire: 3.0 },
  missile: { hp: 1, r: 1.8, score: 50, hits: 1, fire: 0 },
};

// ---------------- generic entity ----------------
function makeEntity(g, type, pos, extra = {}) {
  const st = STATS[type];
  let model;
  if (type === 'missile') {
    const root = new THREE.Group();
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3, 8), toon(0xd63c3c)); b.rotation.x = -Math.PI / 2; root.add(b);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), glow(0xffaa33, 4)); f.position.z = 1.6; root.add(f);
    model = { root, parts: {} };
  } else model = makeEnemy(type);
  model.root.position.copy(pos);
  g.root.add(model.root);
  const hp = Math.max(1, Math.round(st.hp * g.diff.enemyHp));
  const e = {
    type, obj: model.root, parts: model.parts, hp, maxHp: hp, r: st.r, t: 0, score: st.score, hitsWorth: st.hits,
    fireT: rnd(0.6, 1.4) * (st.fire || 1), fireEvery: st.fire / g.diff.enemyFire, dead: false, lockable: true, countsForClear: true,
    vel: new THREE.Vector3(), fwd: new THREE.Vector3(0, 0, 1), flash: 0, ...extra,
  };
  e.col = g.physics.addActor(e.r, { kind: 'enemy', e });
  e.col.setTranslation(pos);
  g.enemies.push(e);
  return e;
}
export function removeEnemy(g, e) {
  e.dead = true;
  if (e.col) { g.physics.remove(e.col); e.col = null; }
  if (e.shaftCol) { g.physics.remove(e.shaftCol); e.shaftCol = null; }
  if (!e.keepMesh || (e.type === 'pillar' && !e.toppled)) g.root.remove(e.obj);
}
export function nearestEnemy(g, pos, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of g.enemies) { if (e.dead) continue; const d = (e.aimPos || e.obj.position).distanceToSquared(pos); if (d < bd) { bd = d; best = e; } }
  return best;
}

// ---------------- rail spawning ----------------
export function spawnEnemy(g, s) {
  const p = g.player, d = g.d;
  const pos = new THREE.Vector3();
  let e;
  switch (s.pattern) {
    case 'headon': pos.set(s.x, s.y, -(d + 560)); e = makeEntity(g, s.type, pos); e.vel.set(0, 0, 50); e.fired = false; break;
    case 'cross': pos.set(s.x, s.y, -(d + 300)); e = makeEntity(g, s.type, pos); e.rel = true; e.ahead = 300; e.dir = s.dir || 1; break;
    case 'behind': pos.set(s.x, s.y, p.pos.z + 45); e = makeEntity(g, s.type, pos); e.vel.set(0, 0, -(g.speed + 62)); e.turned = false; break;
    case 'ahead_hold': pos.set(s.x, s.y + 30, -(d + 460)); e = makeEntity(g, s.type, pos); e.rel = true; e.ahead = 460; e.ox = s.x; e.oy = s.y; e.life = s.life || 9; break;
    case 'dive': pos.set(s.x, s.y, -(d + 330)); e = makeEntity(g, s.type, pos); e.rel = true; e.ahead = 330; e.ox = s.x; e.oy = s.y; break;
    case 'circle': pos.set(s.x, s.y, -(d + 420)); e = makeEntity(g, s.type, pos); e.rel = true; e.ahead = 420; e.ox = s.x; e.oy = s.y; e.idx = s.idx; e.count = s.count; break;
    case 'ground': {
      const z = -(d + (s.ahead || 420));
      pos.set(s.x, Math.max(0, g.world.heightAt(s.x, z)), z); e = makeEntity(g, s.type, pos); e.roam = s.roam; e.baseX = s.x; e.r += 0.5;
      break;
    }
    case 'float': { const z = -(d + (s.ahead || 420)); pos.set(s.x, s.y, z); e = makeEntity(g, s.type, pos); e.baseY = s.y; break; }
    default: pos.set(s.x || 0, s.y || 20, -(d + 400)); e = makeEntity(g, s.type, pos); e.rel = true; e.ahead = 400; e.ox = s.x || 0; e.oy = s.y || 20; e.life = 8; s.pattern = 'ahead_hold';
  }
  e.pattern = s.pattern; e.drop = s.drop;
  if (s.type === 'carrier') { e.lockable = true; e.fireEvery = 0; }
  if (s.target) e.target = s.target;
  return e;
}

export function spawnPillar(g, x, z) {
  const pos = new THREE.Vector3(x, 0, z);
  const e = makeEntity(g, 'pillar', pos, { pattern: 'pillar', keepMesh: true });
  e.aimPos = new THREE.Vector3(x, 3, z + 2.4);
  e.col.setTranslation(e.aimPos);
  // the shaft blocks lasers and the player
  e.shaftCol = g.physics.addStaticBox({ x, y: 17, z }, { x: 2.6, y: 17, z: 2.6 }, 0, { kind: 'static' });
  e.onKill = () => topplePillar(g, e);
  return e;
}
function topplePillar(g, e) {
  e.toppled = true;
  g.physics.remove(e.shaftCol); e.shaftCol = null;
  const side = Math.sign(e.obj.position.x) || 1;
  const rec = g.physics.addDynamic(e.obj, { type: 'box', x: 2.6, y: 18, z: 2.6, oy: 18 }, {
    hazard: true, density: 2, ang: { x: 0, y: 0, z: side * 0.9 }, vel: { x: -side * 2, y: 0, z: 0 }, life: 14,
    data: { kind: 'static' }, onExpire: () => g.root.remove(e.obj),
  });
  void rec;
  g.audio.thud();
  if (!g.attract) g.say('bramble', 'TIMBER! Ha!');
  g.toppled = (g.toppled || 0) + 1;
  setTimeout(() => {
    if (g.disposed) return;
    g.audio.thud(); g.shake = Math.min(1.4, g.shake + 0.8);
    const base = e.obj.position;
    let crushed = 0;
    for (const o of g.enemies) {
      if (o.dead || o === e) continue;
      const op = o.obj.position;
      const along = (op.x - base.x) * -side;
      if (Math.abs(op.z - base.z) < 12 && along > -6 && along < 42 && op.y < 20) { if (damageEnemy(g, o, 99, 'crush')) crushed++; }
    }
    g.fx.explosion(_a.set(base.x - side * 20, 2, base.z), 1.6);
    if (crushed > 0) g.bonus(crushed, _a);
  }, 1300);
}

// ---------------- all-range spawning ----------------
export function spawnAR(g, type, radius, s = {}) {
  const a = Math.random() * Math.PI * 2, r = radius * rnd(0.55, 1);
  const pos = new THREE.Vector3(Math.cos(a) * r, rnd(-110, 110), Math.sin(a) * r);
  const e = makeEntity(g, type, pos);
  e.pattern = type === 'satellite' ? 'sat' : type === 'mine' ? 'float' : 'ar';
  e.baseY = pos.y;
  e.speed = type === 'dart' ? 62 : type === 'carrier' ? 30 : 48;
  e.turn = type === 'dart' ? 1.4 : 0.9;
  e.fwd.set(rnd(-1, 1), 0, rnd(-1, 1)).normalize();
  if (s.drop) e.drop = s.drop;
  g.fx.ring(pos, 10, 0xffffff);
  return e;
}

export function spawnJackals(g) {
  const p = g.player;
  const keys = ['vex', 'snarl', 'quill'];
  keys.forEach((k, i) => {
    _a.copy(p.fwd).multiplyScalar(420).add(p.pos); _a.x += (i - 1) * 60; _a.y += 30;
    const e = makeEntity(g, 'ace', _a);
    const A = ACES[k];
    e.hp = e.maxHp = Math.round(A.hp * g.diff.enemyHp);
    e.ace = k; e.name = A.name; e.pattern = 'ace'; e.speed = 70; e.turn = 1.7; e.fwd.copy(p.fwd).multiplyScalar(-1);
    e.obj.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x6b2cbd) o.material = toon(A.color); });
    e.target = null; e.evade = 0; e.burst = 0; e.taunted = 0;
    g.fx.explosion(_a, 1.2, { light: 0xd05cff, color: 'p' });
  });
  g.audio.warning();
  g.ui.banner('', 'TIN JACKALS', 'Rival squadron incoming', 2.4, 'warn');
  g.say('vex', 'Well, well. Baron Ratchet\'s stuffed-toy problem. Jackals, shred them!');
  g.say('tod', 'The Tin Jackals! Watch yourselves, team!');
  g.say('snarl', 'Hehehe! I call dibs on the bunny!');
  g.audio.playSong('boss');
}

// ---------------- enemy update ----------------
export function updateEnemies(g, dt) {
  const p = g.player;
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.parts.key) e.parts.key.rotation.y += dt * 6;
    if (e.parts.props) for (const pr of e.parts.props) pr.rotation.z += dt * 25;
    if (e.parts.flame) e.parts.flame.scale.y = 0.8 + Math.random() * 0.4;
    if (e.flash > 0) { e.flash -= dt; e.obj.scale.setScalar(1 + e.flash * 1.5); } else if (!e.boss) e.obj.scale.setScalar(1);
    if (e.boss) continue; // boss parts are driven by updateBoss
    const fn = PATTERNS[e.pattern];
    if (fn) fn(g, e, dt, p);
    if (e.dead) continue;
    const ap = e.aimPos || e.obj.position;
    if (e.col) e.col.setTranslation(ap);
    // despawn rules (rail)
    if (g.mode === 'rail' && !e.boss) {
      const rel = e.obj.position.z - p.pos.z;
      if (rel > 80 || rel < -1600 || Math.abs(e.obj.position.x) > 260 || e.obj.position.y > 260) { e.escaped = true; removeEnemy(g, e); }
    }
  }
  if (g.enemies.length > 80 || g.t % 2 < dt) g.enemies = g.enemies.filter((e) => !e.dead);
}

function faceDir(obj, dir) { _c.copy(obj.position).sub(dir); obj.lookAt(_c); }
function tryFire(g, e, dt, from, opts = {}) {
  if (!e.fireEvery || g.phase !== 'play') return;
  e.fireT -= dt;
  if (e.fireT > 0) return;
  e.fireT = e.fireEvery * rnd(0.8, 1.3);
  const p = g.player;
  const dz = from.z - p.pos.z;
  if (g.mode === 'rail' && (dz > -40 || dz < -420) && !opts.any) return;
  if (opts.spread) for (let i = -2; i <= 2; i++) { _b.copy(p.pos); _b.x += i * 10; g.enemyFire(from, _b, opts.speed || 110, 0, { dmg: 8 }); }
  else g.enemyFire(from, p.pos, opts.speed || 120, opts.inacc ?? 0.04, { dmg: opts.dmg || 8 });
}

const PATTERNS = {
  headon(g, e, dt, p) {
    e.obj.position.addScaledVector(e.vel, dt);
    e.obj.position.x += Math.sin(e.t * 2 + e.obj.position.y) * dt * 6;
    faceDir(e.obj, _a.set(0, 0, 1));
    e.obj.rotateZ(Math.sin(e.t * 3) * 0.4);
    const dz = e.obj.position.z - p.pos.z;
    if (!e.fired && dz > -300 && dz < -160) { e.fired = true; g.enemyFire(e.obj.position, p.pos, 115, 0.03); }
  },
  cross(g, e, dt, p) {
    e.ahead = Math.max(150, e.ahead - dt * 35);
    const pos = e.obj.position;
    pos.x += e.dir * 44 * dt; pos.y += Math.sin(e.t * 2.5) * dt * 8; pos.z = -(g.d + e.ahead);
    faceDir(e.obj, _a.set(e.dir, 0, 0.3).normalize()); e.obj.rotateZ(-e.dir * 0.5);
    tryFire(g, e, dt, pos);
  },
  behind(g, e, dt, p) {
    const pos = e.obj.position;
    if (!e.turned && pos.z < p.pos.z - 140) { e.turned = true; e.vel.x = (Math.sign(pos.x) || 1) * rnd(20, 45); e.vel.y = rnd(-4, 14); e.vel.z = -(g.speed + 15); }
    pos.addScaledVector(e.vel, dt);
    faceDir(e.obj, _a.copy(e.vel).normalize());
    e.obj.rotateZ(e.turned ? -Math.sign(e.vel.x) * 0.6 : 0);
    if (e.turned) { e.fireT -= dt; if (!e.fired && e.fireT < 0) { e.fired = true; g.enemyFire(pos, p.pos, 110, 0.05); } }
  },
  ahead_hold(g, e, dt, p) {
    const pos = e.obj.position;
    e.life -= dt;
    if (e.life > 0) e.ahead = damp(e.ahead, 130 + Math.sin(e.t * 0.7) * 25, 1.2, dt);
    else { e.ahead += dt * 120; e.oy += dt * 30; }
    const tx = e.ox + Math.sin(e.t * 1.1 + e.ox) * 14, ty = e.oy + Math.sin(e.t * 1.7) * 6;
    pos.x = damp(pos.x, tx, 2, dt); pos.y = damp(pos.y, ty, 2, dt); pos.z = -(g.d + e.ahead);
    faceDir(e.obj, _a.set(0, 0, 1)); e.obj.rotateZ(Math.sin(e.t * 1.1) * 0.3);
    if (e.type === 'bomber') tryFire(g, e, dt, pos, { spread: true, speed: 95 });
    else if (e.type !== 'carrier') tryFire(g, e, dt, pos);
    if (e.type === 'carrier' && e.life < -4) removeEnemy(g, e);
  },
  dive(g, e, dt, p) {
    const pos = e.obj.position;
    if (e.t < 1.8) { e.ahead = damp(e.ahead, 170, 1.5, dt); pos.y = damp(pos.y, p.pos.y + 4, 2.2, dt); }
    else { e.ahead -= dt * 160; pos.y += dt * 30; }
    pos.x = damp(pos.x, e.ox * 0.5 + p.pos.x * 0.5, 1, dt); pos.z = -(g.d + e.ahead);
    faceDir(e.obj, _a.set(0, e.t < 1.8 ? -0.6 : 0.5, e.t < 1.8 ? 0.4 : 1).normalize());
    if (!e.fired && e.t > 1.4) { e.fired = true; g.enemyFire(pos, p.pos, 120, 0.03); }
  },
  circle(g, e, dt, p) {
    const pos = e.obj.position;
    e.ahead = damp(e.ahead, 170, 0.9, dt);
    const a = e.idx / e.count * Math.PI * 2 + e.t * 1.3;
    const R = e.t < 8 ? 20 : 20 + (e.t - 8) * 60;
    pos.set(e.ox + Math.cos(a) * R, e.oy + Math.sin(a) * R * 0.8, -(g.d + e.ahead));
    faceDir(e.obj, _a.set(-Math.sin(a), Math.cos(a), 0.4).normalize());
    if (e.idx % 2 === 0) tryFire(g, e, dt, pos);
  },
  ground(g, e, dt, p) {
    const pos = e.obj.position;
    if (e.type === 'tank') {
      if (e.roam) { pos.x = e.baseX + Math.sin(e.t * 0.5) * 18; }
      pos.y = Math.max(0, g.world.heightAt(pos.x, pos.z));
    }
    if (e.parts.head) {
      _a.copy(p.pos).sub(pos);
      e.parts.head.rotation.y = Math.atan2(-_a.x, -_a.z);
    }
    e.aimPos = e.aimPos || new THREE.Vector3();
    e.aimPos.copy(pos); e.aimPos.y += 2.2;
    tryFire(g, e, dt, e.aimPos, { speed: 110 });
  },
  float(g, e, dt, p) {
    const pos = e.obj.position;
    pos.y = e.baseY + Math.sin(e.t * 1.5 + pos.x) * 2;
    e.obj.rotation.y += dt; e.obj.rotation.x += dt * 0.5;
    if (e.parts.light) e.parts.light.visible = Math.floor(e.t * 4) % 2 === 0;
    if (pos.distanceTo(p.pos) < 9 && !p.dead) { g.hurt(14, pos, 'mine'); killEnemy(g, e, 'mine'); }
  },
  chaseWing(g, e, dt, p) {
    const w = e.target; const pos = e.obj.position;
    if (!w || !w.active || e.flee) { e.flee = true; pos.y += dt * 40; pos.z -= dt * 120; pos.x += Math.sign(pos.x || 1) * dt * 40; faceDir(e.obj, _a.set(0, 0.3, -1).normalize()); return; }
    _a.set(w.pos.x + Math.sin(e.t * 2 + e.slot) * 6, w.pos.y + Math.cos(e.t * 1.7 + e.slot) * 4, w.pos.z + 16 + e.slot * 8);
    pos.x = damp(pos.x, _a.x, 2.5, dt); pos.y = damp(pos.y, _a.y, 2.5, dt); pos.z = damp(pos.z, _a.z, 3, dt);
    faceDir(e.obj, _b.copy(w.pos).sub(pos).normalize());
    e.fireT -= dt;
    if (e.fireT <= 0) { e.fireT = rnd(0.7, 1.3); _b.copy(w.pos).sub(pos).normalize().multiplyScalar(160); g.spawnShot(pos, _b, { dmg: 3, color: 0xff5a5a, size: 0.8 }); }
  },
  homing(g, e, dt, p) {
    const pos = e.obj.position;
    _a.copy(p.pos).sub(pos).normalize();
    if (e.t < 4) e.fwd.lerp(_a, 1 - Math.exp(-dt * 1.6)).normalize();
    pos.addScaledVector(e.fwd, (55 + e.t * 10) * dt);
    if (g.mode === 'rail') pos.z -= g.speed * dt * 0.9;
    faceDir(e.obj, e.fwd);
    if (Math.random() < dt * 20) g.fx.smoke(_b.copy(pos).addScaledVector(e.fwd, -2), 0.6);
    if (pos.distanceTo(p.pos) < 4) { g.hurt(10, pos, 'missile'); killEnemy(g, e, 'self'); }
    if (e.t > 7) killEnemy(g, e, 'self');
  },
  // all-range: generic dogfighter
  ar(g, e, dt, p) {
    const pos = e.obj.position;
    const tgt = p.dead ? null : p.pos;
    if (tgt) {
      _a.copy(tgt).sub(pos);
      const dist = _a.length(); _a.normalize();
      // orbit at mid-range rather than ram
      if (dist < 70) _a.addScaledVector(e.fwd, 1.5).add(_b.set(0, 0.5, 0)).normalize();
      _a.x += Math.sin(e.t * 0.7 + e.col.handle) * 0.4; _a.y += Math.cos(e.t * 0.5) * 0.2;
      e.fwd.lerp(_a.normalize(), 1 - Math.exp(-dt * e.turn)).normalize();
      if (e.fireEvery && dist < 320 && e.fwd.dot(_b.copy(tgt).sub(pos).normalize()) > 0.93) tryFire(g, e, dt, pos, { any: true, speed: 140 });
    }
    // keep inside arena
    if (pos.length() > 1000) e.fwd.lerp(_a.copy(pos).multiplyScalar(-1).normalize(), dt).normalize();
    pos.addScaledVector(e.fwd, e.speed * dt);
    faceDir(e.obj, e.fwd);
    e.obj.rotateZ(Math.sin(e.t * 1.3) * 0.5);
  },
  sat(g, e, dt, p) {
    e.obj.rotation.y += dt * 0.8;
    const pos = e.obj.position;
    pos.y = e.baseY + Math.sin(e.t) * 3;
    if (pos.distanceTo(p.pos) < 380) {
      e.fireT -= dt;
      if (e.fireT <= 0 && !p.dead) { e.fireT = e.fireEvery; for (let i = 0; i < 3; i++) setTimeout(() => { if (!e.dead && !g.disposed) g.enemyFire(pos, p.pos, 150, 0.05, { color: 0xff3355 }); }, i * 160); }
    }
  },
  ace(g, e, dt, p) {
    const pos = e.obj.position;
    const tgtObj = e.target && e.target.active ? e.target : p;
    const tgt = tgtObj.pos;
    _a.copy(tgt).sub(pos); const dist = _a.length(); _a.normalize();
    // evade when the player sits on our tail
    _b.copy(pos).sub(p.pos);
    const playerBehind = !p.dead && _b.length() < 160 && p.fwd.dot(_b.normalize()) > 0.85;
    if (playerBehind && e.evade <= 0 && Math.random() < dt * 1.2) { e.evade = rnd(1.2, 2.2); e.evadeDir = new THREE.Vector3(rnd(-1, 1), rnd(-0.6, 0.6), rnd(-1, 1)).normalize(); g.fx.sparkBurst(pos, 4, 'p', 10); }
    if (e.evade > 0) { e.evade -= dt; _a.copy(e.evadeDir); }
    else if (dist < 50) _a.addScaledVector(e.fwd, 2).add(_c.set(0, 0.8, 0)).normalize();
    if (pos.length() > 950) _a.lerp(_c.copy(pos).multiplyScalar(-1).normalize(), 0.6).normalize();
    e.fwd.lerp(_a, 1 - Math.exp(-dt * e.turn)).normalize();
    const spd = e.speed * (e.evade > 0 ? 1.35 : 1);
    pos.addScaledVector(e.fwd, spd * dt);
    faceDir(e.obj, e.fwd);
    e.obj.rotateZ(e.evade > 0 ? e.t * 8 : Math.sin(e.t * 2) * 0.6);
    // bursts when lined up
    e.fireT -= dt;
    if (e.fireT <= 0 && dist < 300 && e.fwd.dot(_c.copy(tgt).sub(pos).normalize()) > 0.95) {
      e.fireT = e.fireEvery * rnd(0.8, 1.4);
      if (tgtObj === p) g.enemyFire(pos, p.pos, 170, 0.03, { color: 0xd05cff, dmg: 9 });
      else { _c.copy(tgt).sub(pos).normalize().multiplyScalar(170); g.spawnShot(pos, _c, { color: 0xd05cff, dmg: 5 }); }
    }
    e.taunted -= dt;
    if (e.taunted <= 0 && Math.random() < dt * 0.05) { e.taunted = 14; if (!g.attract) g.say(e.ace, ACES[e.ace].taunts[Math.floor(Math.random() * 2)]); }
  },
};

// ---------------- damage ----------------
const PLAYER_SRC = new Set(['laser', 'charge', 'bomb', 'deflect', 'ram', 'crush', 'mine']);
export function damageEnemy(g, e, dmg, src, part, pos) {
  if (e.dead) return false;
  if (e.invulnerable) { if (pos) g.fx.sparkBurst(pos, 4, 'w', 12); g.audio.hit(); return false; }
  e.hp -= dmg; e.flash = 0.08;
  g.audio.hit();
  if (e.onHit) e.onHit(dmg, src);
  if (e.hp <= 0) { killEnemy(g, e, src); return true; }
  if (e.ace && e.hp < e.maxHp * 0.35 && !e.hurtLine && !g.attract) { e.hurtLine = true; g.say(e.ace, ACES[e.ace].taunts[2]); }
  return false;
}
export function killEnemy(g, e, src) {
  if (e.dead) return;
  const pos = (e.aimPos || e.obj.position).clone();
  const size = e.type === 'bomber' ? 2.4 : e.type === 'ace' ? 2 : e.type === 'missile' ? 0.5 : e.boss ? 2.2 : 1;
  g.fx.explosion(pos, size);
  g.audio.explode(size);
  if (PLAYER_SRC.has(src)) {
    g.hits += e.hitsWorth; g.score += e.score;
    if (e.hitsWorth > 1) g.ui.popup(`+${e.hitsWorth}`, pos, '#7affb0');
    g.app.input.rumble(0.3, 0.5, 80);
  } else if (src === 'wing') g.stats.killsWing++;
  if (e.drop) g.addPickup(e.drop, pos);
  if (!e.boss && e.type !== 'pillar' && e.type !== 'missile') spawnDebris(g, pos, e.type === 'bomber' ? 6 : 3, e.type === 'drone' ? 0xd63c3c : 0x9aa4b2);
  if (e.ace) { if (!g.attract) g.say(e.ace, e.ace === 'vex' ? 'Argh! This isn\'t over, Patchwell!' : ACES[e.ace].taunts[2]); }
  const onKill = e.onKill;
  removeEnemy(g, e);
  if (onKill) onKill(src);
}
function spawnDebris(g, pos, n, colorHex) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(g._debrisGeo ||= new THREE.BoxGeometry(1.2, 0.6, 1.6), toon(i % 2 ? colorHex : 0x3b4252));
    m.position.copy(pos); m.castShadow = true;
    g.root.add(m);
    const vz = g.mode === 'rail' ? -g.speed * 0.5 : 0;
    g.physics.addDynamic(m, { type: 'box', x: 0.6, y: 0.3, z: 0.8 }, {
      vel: { x: rnd(-20, 20), y: rnd(0, 20), z: vz + rnd(-15, 15) }, ang: { x: rnd(-8, 8), y: rnd(-8, 8), z: rnd(-8, 8) }, life: 2.6, restitution: 0.5,
      onExpire: () => g.root.remove(m),
    });
  }
}
export function damageAsteroid(g, rec, dmg, byPlayer) {
  rec.hp = (rec.hp ?? Math.ceil(rec.size / 4)) - dmg;
  if (rec.hp > 0 || rec.size < 9) return;
  // split big asteroids into two smaller tumbling chunks
  const t = rec.body.translation(); const pos = new THREE.Vector3(t.x, t.y, t.z);
  g.fx.explosion(pos, rec.size / 10);
  g.audio.explode(1);
  g.physics.removeDynamic(rec);
  g.world.root.remove(rec.obj);
  g.world.asteroids.splice(g.world.asteroids.indexOf(rec), 1);
  if (byPlayer) { g.score += 50; }
  for (let i = 0; i < 2; i++) {
    const s = rec.size * 0.5;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), toon(0x8a7a6a));
    m.position.copy(pos).add(_a.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(s));
    m.castShadow = true;
    g.world.root.add(m);
    const r2 = g.physics.addDynamic(m, { type: 'ball', r: s * 0.85 }, { hazard: true, linDamp: 0, angDamp: 0, density: 0.4, restitution: 0.8,
      vel: { x: rnd(-20, 20), y: rnd(-10, 10), z: rnd(-20, 20) }, ang: { x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(-1, 1) }, data: { kind: 'asteroid' } });
    r2.size = s; r2.data = g.physics.data.get(r2.col.handle); r2.data.rec = r2;
    g.world.asteroids.push(r2);
  }
}

// ---------------- wingmates ----------------
const WINGS = [
  { key: 'bramble', off: [-17, 3, 8] },
  { key: 'pippa', off: [17, 1, 6] },
  { key: 'gizmo', off: [0, 13, 16] },
];
const LINES = {
  trouble: { bramble: 'Kid! I\'ve got a pair of tin cans on my tail! Shake \'em loose!', pippa: 'Tod, help! Get this guy off me!', gizmo: 'Eep! Something\'s chewing on my stuffing! Help!' },
  saved: { bramble: 'Hmph. Thanks, kid. Didn\'t need it, but thanks.', pippa: 'Thanks, Tod! I owe you one!', gizmo: 'Phew! You\'re the best, Tod!' },
  hurt: { bramble: 'I\'m hit! Gotta drop out for re-stitching!', pippa: 'Ahh! My wing! Heading back to base!', gizmo: 'Systems unravelling! Retreating for repairs!' },
  ff: { bramble: ['Watch your fire, kid!', 'Hey! Aim at THEM!'], pippa: ['Ow! Tod, that\'s me!', 'Friendly fire! Careful!'], gizmo: ['My stuffing!', 'Hey! I\'m on your side!'] },
};
export function initWingmates(g) {
  const carryHp = g.carry && g.carry.wingHp;
  for (const W of WINGS) {
    const f = makeFighter(W.key, 0.95);
    g.root.add(f.root);
    const hp = carryHp ? carryHp[W.key] : 100;
    const w = { key: W.key, model: f, obj: f.root, pos: f.root.position, off: W.off, hp: hp > 0 ? Math.max(hp, 60) : 0, present: hp > 0, active: hp > 0,
      trouble: null, shootT: rnd(2, 4), ffT: 0, t: rnd(0, 6), fwd: new THREE.Vector3(0, 0, -1), leaving: 0 };
    if (!w.present) f.root.visible = false;
    else w.col = g.physics.addActor(2.2, { kind: 'wing', w });
    const p = g.player.pos;
    w.pos.set(p.x + W.off[0], p.y + W.off[1], p.z + W.off[2]);
    g.wingmates.push(w);
  }
}
export function updateWingmates(g, dt) {
  const p = g.player;
  for (const w of g.wingmates) {
    if (!w.present) continue;
    w.t += dt;
    if (!w.active) {
      // retreating after heavy damage
      if (w.leaving > 0) {
        w.leaving -= dt; w.pos.y += dt * 30; w.pos.addScaledVector(w.fwd, dt * 150);
        if (Math.random() < dt * 20) g.fx.smoke(w.pos, 1);
        if (w.leaving <= 0) w.obj.visible = false;
      }
      continue;
    }
    w.model.flame.scale.y = 0.9 + Math.random() * 0.3;
    if (g.mode === 'rail') {
      let tx, ty, tz;
      if (w.trouble) {
        tx = Math.sin(w.t * 0.9) * 30; ty = 30 + Math.sin(w.t * 1.4) * 12; tz = -(g.d + 120);
        w.trouble.t += dt;
        if (w.trouble.t > w.trouble.max) failTrouble(g, w);
      } else if (g.phase === 'intro') {
        tx = p.x + w.off[0] * 0.8; ty = p.y + w.off[1]; tz = p.pos.z + w.off[2] * 0.6;
      } else {
        tx = clamp(p.x * 0.35 + w.off[0] + Math.sin(w.t * 0.7) * 4, -60, 60);
        ty = Math.max(8, p.y * 0.45 + 12 + w.off[1] + Math.sin(w.t * 0.9) * 3);
        tz = -g.d + w.off[2] + 6 + Math.sin(w.t * 0.5) * 5;
      }
      const ox = w.pos.x, oy = w.pos.y;
      w.pos.x = damp(w.pos.x, tx, 1.6, dt); w.pos.y = damp(w.pos.y, ty, 1.6, dt); w.pos.z = damp(w.pos.z, tz, w.trouble ? 1.5 : 4, dt);
      const vx = (w.pos.x - ox) / dt, vy = (w.pos.y - oy) / dt;
      w.obj.rotation.set(clamp(vy * 0.02, -0.4, 0.4), clamp(-vx * 0.01, -0.3, 0.3), clamp(-vx * 0.04, -1, 1) + (w.trouble ? Math.sin(w.t * 4) * 0.5 : 0));
      w.fwd.set(0, 0, -1);
    } else {
      // all-range: escort the player and engage nearby enemies
      let tgt = null;
      if (!w.trouble) { const ne = nearestEnemy(g, w.pos, 280); if (ne && !ne.boss) tgt = ne.obj.position; }
      if (w.trouble) { _a.set(Math.sin(w.t * 0.6) * 300, Math.sin(w.t * 0.4) * 80, Math.cos(w.t * 0.6) * 300); }
      else if (tgt) _a.copy(tgt);
      else { const k = WINGS.findIndex((x) => x.key === w.key); _a.set(w.off[0] * 2, w.off[1] * 2 + 5, 30).applyQuaternion(p.obj.quaternion).add(p.pos); _a.addScaledVector(p.fwd, 20 + k * 6); }
      _b.copy(_a).sub(w.pos);
      const dist = _b.length();
      _b.normalize();
      if (dist < 30 && tgt) _b.add(_c.set(0, 0.6, 0)).normalize();
      w.fwd.lerp(_b, 1 - Math.exp(-dt * 1.6)).normalize();
      const spd = tgt || w.trouble ? 66 : clamp(dist * 1.2, 40, 110);
      w.pos.addScaledVector(w.fwd, spd * dt);
      faceDir(w.obj, w.fwd); w.obj.rotateZ(Math.sin(w.t) * 0.3);
      if (w.trouble) { w.trouble.t += dt; if (w.trouble.t > w.trouble.max) failTrouble(g, w); }
    }
    w.col.setTranslation(w.pos);
    w.ffT -= dt;
    // wingmate fire support
    w.shootT -= dt;
    if (w.shootT <= 0 && g.phase === 'play' && !w.trouble) {
      w.shootT = rnd(2.4, 4.5);
      const e = nearestEnemy(g, w.pos, 260);
      if (e && !e.boss && (g.mode === 'allrange' || e.obj.position.z < w.pos.z - 20)) {
        _a.copy(e.aimPos || e.obj.position).sub(w.pos).normalize();
        g.spawnLaser(_b.copy(w.pos).addScaledVector(_a, 4), _a, 0, 'wing');
      }
    }
  }
}
export function startTrouble(g, who, ev) {
  const w = g.wingmates.find((x) => x.key === who);
  if (!w || !w.active || w.trouble) return;
  w.trouble = { t: 0, max: g.mode === 'rail' ? 15 : 30, chasers: [] };
  g.say(who, LINES.trouble[who]);
  if (g.mode === 'rail') {
    for (let i = 0; i < (ev.n || 2); i++) {
      const e = makeEntity(g, ev.type || 'dart', _a.copy(w.pos).add(_b.set(rnd(-10, 10), rnd(-5, 5), 30 + i * 8)));
      e.pattern = 'chaseWing'; e.target = w; e.slot = i; e.fireT = 1.5;
      e.onKill = () => { if (w.trouble && w.trouble.chasers.every((c) => c.dead)) endTrouble(g, w, false); };
      w.trouble.chasers.push(e);
    }
    if (!g.attract) g.ui.hint(`Save ${who[0].toUpperCase() + who.slice(1)}! Shoot the pursuers`, 3.5);
  } else {
    const ace = g.enemies.find((e) => !e.dead && e.ace === ev.ace) || g.enemies.find((e) => !e.dead && e.ace);
    if (!ace) { w.trouble = null; return; }
    ace.target = w;
    w.trouble.chasers.push(ace);
    const prev = ace.onKill;
    ace.onKill = (src) => { if (prev) prev(src); if (w.trouble) endTrouble(g, w, false); };
  }
}
export function endTrouble(g, w, silent) {
  if (!w.trouble) return;
  for (const c of w.trouble.chasers) { if (c.target === w) c.target = null; if (!c.dead && g.mode === 'rail') c.flee = true; if (silent && !c.dead && g.mode === 'rail') removeEnemy(g, c); }
  w.trouble = null;
  if (!silent) { g.say(w.key, LINES.saved[w.key]); g.score += 300; if (!g.attract) g.ui.popup('WINGMATE SAVED +300', w.pos, '#7ad8ff'); }
}
function failTrouble(g, w) {
  const chasers = w.trouble.chasers;
  hurtWingmate(g, w, 35);
  if (w.trouble) {
    for (const c of chasers) { if (!c.dead) { c.target = null; if (g.mode === 'rail') c.flee = true; } }
    w.trouble = null;
    if (w.active) g.say(w.key, w.key === 'bramble' ? 'Took a few hits, but I shook \'em.' : 'Ouch... I got away, but I\'m pretty frayed.');
  }
}
export function hurtWingmate(g, w, dmg) {
  if (!w.active || g.attract) return;
  w.hp -= dmg;
  g.fx.sparkBurst(w.pos, 6, 'r', 12); g.fx.fluff(w.pos, 3);
  if (w.hp <= 0) {
    w.hp = 0; w.active = false; w.leaving = 3; w.trouble = null;
    g.say(w.key, LINES.hurt[w.key]);
    g.fx.explosion(w.pos, 0.8, { fluff: true });
    if (w.col) { g.physics.remove(w.col); w.col = null; }
    for (const e of g.enemies) if (e.target === w) { e.target = null; e.flee = true; }
  }
}
export function friendlyFire(g, w) {
  if (!w.active) return;
  hurtWingmate(g, w, 3);
  if (w.ffT <= 0 && w.active) { w.ffT = 4; const l = LINES.ff[w.key]; g.say(w.key, l[Math.floor(Math.random() * l.length)]); }
}

// ---------------- bosses ----------------
function partEntity(g, boss, name, hp, r, extra = {}) {
  const e = makeEntity(g, 'missile', new THREE.Vector3(), { boss: true, keepMesh: true, countsForClear: false, ...extra });
  g.root.remove(e.obj); // part entities are proxies; the boss model is rendered
  e.obj = new THREE.Object3D(); e.hp = e.maxHp = Math.round(hp * g.diff.enemyHp); e.r = r; e.part = name;
  g.physics.remove(e.col); e.col = g.physics.addActor(r, { kind: 'enemy', e, part: name });
  e.aimPos = new THREE.Vector3(); e.score = 500; e.hitsWorth = 2; e.bossRef = boss;
  return e;
}
export function spawnBoss(g, kind) {
  if (g.boss) return;
  if (kind === 'colossus') spawnColossus(g); else spawnMusicBox(g);
}
function spawnColossus(g) {
  const m = makeColossus();
  m.root.rotation.y = Math.PI;
  g.root.add(m.root);
  const boss = { kind: 'colossus', name: 'WINDUP COLOSSUS', obj: m.root, parts: m.parts, t: 0, phase: 0, ahead: 360, holdRail: true, x: 0, fireT: 2, eyeT: 3, missileT: 3, stompT: 5, droneT: 8, rings: [], dying: 0 };
  g.boss = boss;
  boss.arms = m.parts.arms.map((a, i) => {
    const e = partEntity(g, boss, i ? 'armR' : 'armL', 18, 4.5);
    e.arm = a;
    e.onKill = () => {
      a.fore.visible = false;
      a.fore.getWorldPosition(_a);
      g.fx.explosion(_a, 2.2); spawnDebris(g, _a, 6, 0xc0472f);
      if (boss.arms.every((x) => x.dead)) colossusPhase2(g, boss);
      else if (!g.attract) g.say('bramble', 'One arm down! Take out the other!');
    };
    return e;
  });
  boss.core = partEntity(g, boss, 'core', 46, 4.5, { invulnerable: true, lockable: false });
  boss.core.onKill = () => bossDefeated(g, boss);
  boss.armor = [-6, 6].map(() => g.physics.addActor(6.5, { kind: 'bossArmor' }));
  boss.maxHp = boss.arms.reduce((s, a) => s + a.maxHp, 0) + boss.core.maxHp;
  // intro cutscene
  g.camOverride = {
    t: 0, dur: 4.2, fn: (cam, t) => {
      const bp = boss.obj.position;
      const k = Math.min(1, t / 4.2);
      cam.position.set(bp.x + 30 - k * 30, 6 + k * 18, bp.z + 70 + k * 50);
      _a.set(bp.x, 22, bp.z); cam.lookAt(_a);
    },
  };
  g.ui.banner('BOSS', boss.name, 'Destroy the arm cannons, then the wind-up core', 3.6, 'boss');
  g.audio.playSong('boss'); g.audio.windup();
  g.say('ratchet', 'Hah! Meet my masterpiece, plushies! Wind it up, Colossus!');
  g.say('gizmo', 'I\'m scanning its armor. Hit the arm cannons first!');
}
function colossusPhase2(g, boss) {
  boss.phase = 2;
  boss.core.invulnerable = false; boss.core.lockable = true;
  g.audio.windup();
  if (!g.attract) { g.say('gizmo', 'Arms are scrap! It\'s exposing the wind-up key. Hit the glowing core on top!'); g.ui.hint('Fly high and target the glowing core', 3); }
}
function bossDefeated(g, boss) {
  boss.dying = 3.2; boss.phase = 9;
  g.say('ratchet', 'Nooo! My beautiful clockwork! You\'ll pay for this, Patchwell!');
  g.slowmo = 0.5; setTimeout(() => { if (!g.disposed) g.slowmo = 1; }, 1400);
}
export function bossHp(boss) {
  if (boss.kind === 'colossus') return (boss.arms.reduce((s, a) => s + Math.max(0, a.hp), 0) + Math.max(0, boss.core.hp)) / boss.maxHp;
  return (boss.gens.reduce((s, a) => s + Math.max(0, a.hp), 0) + Math.max(0, boss.core.hp)) / boss.maxHp;
}
export function updateBoss(g, dt) {
  const boss = g.boss;
  boss.t += dt;
  if (boss.kind === 'colossus') updateColossus(g, boss, dt); else updateMusicBox(g, boss, dt);
}
function updateColossus(g, boss, dt) {
  const P = boss.parts, p = g.player;
  if (boss.gone) return;
  boss.ahead = damp(boss.ahead, boss.phase === 2 ? 135 : 150, 0.8, dt);
  boss.x = Math.sin(boss.t * 0.35) * 22;
  const bp = boss.obj.position;
  bp.set(boss.x, Math.max(0, g.world.heightAt(boss.x, -(g.d + boss.ahead))), -(g.d + boss.ahead));
  // walk cycle
  const crouch = boss.phase === 2 ? 1 : 0;
  boss.crouch = damp(boss.crouch || 0, crouch, 1.5, dt);
  P.body.position.y = 18 - boss.crouch * 6 + Math.abs(Math.sin(boss.t * 3)) * 1.2;
  P.body.rotation.z = Math.sin(boss.t * 1.5) * 0.04;
  for (const L of P.legs) {
    L.hip.rotation.y = Math.sin(boss.t * 3 + L.phase) * 0.3;
    L.knee.rotation.z = L.side * (0.15 + Math.max(0, Math.sin(boss.t * 3 + L.phase)) * 0.35 - boss.crouch * 0.3);
  }
  P.keySpin.rotation.y += dt * (boss.phase === 2 ? 9 : 2);
  P.core.scale.setScalar(boss.phase === 2 ? 1.2 + Math.sin(boss.t * 10) * 0.12 : 0.8);
  for (const e of P.eyes) e.scale.setScalar(boss.core.hp < boss.core.maxHp * 0.4 ? 1 + Math.sin(boss.t * 20) * 0.3 : 1);
  boss.obj.updateMatrixWorld(true);
  boss.bodyPos ||= new THREE.Vector3(); boss.bodyR = 12;
  P.body.getWorldPosition(boss.bodyPos);
  // hitboxes
  for (const a of boss.arms) {
    if (a.dead) continue;
    // aim arms at player
    a.arm.shoulder.getWorldPosition(_a);
    const yaw = Math.atan2(p.pos.x - _a.x, -(p.pos.z - _a.z));
    a.arm.shoulder.rotation.y = damp(a.arm.shoulder.rotation.y, clamp(yaw * a.arm.side * 0.4, -0.5, 0.5), 3, dt);
    a.arm.fore.rotation.x = damp(a.arm.fore.rotation.x, clamp((p.pos.y - _a.y) * 0.01, -0.4, 0.4), 3, dt);
    a.arm.fore.getWorldPosition(a.aimPos);
    a.col.setTranslation(a.aimPos);
  }
  P.core.getWorldPosition(boss.core.aimPos); boss.core.col.setTranslation(boss.core.aimPos);
  [-6, 6].forEach((x, i) => { _a.set(x, 0, 0); P.body.localToWorld(_a); boss.armor[i].setTranslation(_a); });
  if (boss.dying > 0) {
    boss.dying -= dt;
    if (Math.random() < dt * 10) { _a.set(rnd(-14, 14), rnd(-4, 8), rnd(-10, 10)); P.body.localToWorld(_a); g.fx.explosion(_a, 1.4); g.audio.explode(1); }
    if (boss.dying <= 0) {
      P.body.getWorldPosition(_a);
      g.fx.explosion(_a, 5, { fluff: false }); g.audio.bomb(); g.shake = 1.5;
      for (let i = 0; i < 12; i++) spawnDebris(g, _a.clone().add(_b.set(rnd(-10, 10), rnd(-4, 4), rnd(-8, 8))), 1, i % 2 ? 0xc0472f : 0x9aa4b2);
      boss.gone = true; boss.obj.visible = false;
      for (const c of boss.armor) g.physics.remove(c);
      g.hits += 10; g.score += 5000; g.ui.popup('BOSS +10', _a, '#ffd34d');
      setTimeout(() => { if (!g.disposed) g.stageClear(); }, 1500);
    }
    return;
  }
  if (g.phase !== 'play' || g.camOverride) return;
  const rage = boss.core.hp < boss.core.maxHp * 0.4 && boss.phase === 2;
  const fr = g.diff.enemyFire * (rage ? 1.6 : 1);
  // arm cannons: alternating spreads
  boss.fireT -= dt * fr;
  const liveArms = boss.arms.filter((a) => !a.dead);
  if (boss.fireT <= 0 && liveArms.length) {
    boss.fireT = 1.5;
    const a = liveArms[Math.floor(boss.t * 7) % liveArms.length];
    a.arm.muzzle.getWorldPosition(_a);
    for (let i = -1; i <= 1; i++) { _b.copy(p.pos); _b.x += i * 9; g.enemyFire(_a, _b, 115, 0, { dmg: 9, size: 1.5, color: 0xffaa33 }); }
  }
  // eye lasers
  boss.eyeT -= dt * fr;
  if (boss.eyeT <= 0) {
    boss.eyeT = boss.phase === 2 ? 2.2 : 3.4;
    for (const eye of P.eyes) { eye.getWorldPosition(_a); g.enemyFire(_a, p.pos, 150, 0.02, { dmg: 7, color: 0xff3030 }); }
  }
  if (boss.phase === 2) {
    boss.missileT -= dt * fr;
    if (boss.missileT <= 0) {
      boss.missileT = 3.2;
      for (const s of [-1, 1]) {
        _a.set(s * 6, 10, 0); P.body.localToWorld(_a);
        const e = makeEntity(g, 'missile', _a, { pattern: 'homing', countsForClear: false });
        e.fwd.set(s * 0.5, 1, 0.3).normalize();
      }
    }
    boss.stompT -= dt * fr;
    if (boss.stompT <= 0) {
      boss.stompT = 5;
      g.audio.thud(); g.shake = Math.min(1.2, g.shake + 0.5);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 1.2, 6, 40), glow(0xffaa33, 3));
      ring.rotation.x = Math.PI / 2; ring.position.set(bp.x, 2, bp.z); g.root.add(ring);
      boss.rings.push({ mesh: ring, r: 4, hit: false });
      if (!g.attract && !boss.stompHint) { boss.stompHint = true; g.say('pippa', 'Shockwave! Climb above it!'); }
    }
    if (rage) {
      boss.droneT -= dt;
      if (boss.droneT <= 0) { boss.droneT = 7; for (let i = 0; i < 3; i++) spawnEnemy(g, { type: 'drone', pattern: 'ahead_hold', x: bp.x + (i - 1) * 20, y: 40, life: 6 }); }
    }
  }
  for (const r of boss.rings) {
    r.r += dt * 70; r.mesh.scale.setScalar(r.r); r.mesh.position.z = -(g.d + boss.ahead);
    const dist = Math.hypot(p.pos.x - r.mesh.position.x, p.pos.z - r.mesh.position.z);
    if (!r.hit && Math.abs(dist - r.r) < 5 && p.pos.y < 16) { r.hit = true; g.hurt(12, r.mesh.position, 'stomp'); }
    if (r.r > 260) { g.root.remove(r.mesh); r.done = true; }
  }
  boss.rings = boss.rings.filter((r) => !r.done);
}

function spawnMusicBox(g) {
  const p = g.player;
  const m = makeMusicBox();
  _a.copy(p.fwd).setY(0).normalize().multiplyScalar(380).add(p.pos); _a.y = clamp(p.pos.y, -60, 60);
  m.root.position.copy(_a);
  m.root.lookAt(p.pos.x, _a.y, p.pos.z);
  g.root.add(m.root);
  m.root.updateMatrixWorld(true);
  const boss = { kind: 'musicbox', name: 'THE MUSIC BOX', obj: m.root, parts: m.parts, t: 0, phase: 1, ringT: 3, turretT: 1, droneT: 10, spiral: 0, dying: 0, lidOpen: 0 };
  g.boss = boss;
  const q = m.root.quaternion;
  boss.armorCol = g.physics.addStaticBox(m.root.position, { x: 45, y: 17, z: 30 }, Math.atan2(2 * (q.w * q.y), 1 - 2 * q.y * q.y), { kind: 'bossArmor' });
  boss.gens = m.parts.gens.map((gen, i) => {
    const e = partEntity(g, boss, 'gen' + i, 14, 4.5);
    e.gen = gen;
    e.onKill = () => {
      gen.g.visible = false; gen.g.getWorldPosition(_a); g.fx.explosion(_a, 2);
      const left = boss.gens.filter((x) => !x.dead).length;
      if (left === 0) musicBoxPhase2(g, boss);
      else if (!g.attract) g.say('gizmo', `Shield generator down! ${left} to go!`);
    };
    return e;
  });
  boss.turrets = m.parts.turrets.map((t, i) => { const e = partEntity(g, boss, 'tur' + i, 6, 3); e.tur = t; e.hitsWorth = 1; e.score = 200; e.onKill = () => { t.visible = false; t.getWorldPosition(_a); g.fx.explosion(_a, 1.2); }; return e; });
  boss.core = partEntity(g, boss, 'core', 60, 8, { invulnerable: true, lockable: false });
  boss.core.onKill = () => { boss.dying = 4; boss.phase = 9; g.say('ratchet', 'My Music Box! It was supposed to play my VICTORY SONG!'); g.slowmo = 0.5; setTimeout(() => { if (!g.disposed) g.slowmo = 1; }, 1600); };
  boss.maxHp = boss.gens.reduce((s, a) => s + a.maxHp, 0) + boss.core.maxHp;
  for (const e of [...boss.gens, ...boss.turrets, boss.core]) e.countsForClear = false;
  g.fx.explosion(m.root.position, 6, { light: 0xff4fa8, color: 'p' });
  g.camOverride = {
    t: 0, dur: 4.5, fn: (cam, t) => {
      const bp = boss.obj.position; const a = t * 0.35 + 0.6;
      cam.position.set(bp.x + Math.sin(a) * 170, bp.y + 50 - t * 4, bp.z + Math.cos(a) * 170);
      cam.up.set(0, 1, 0); cam.lookAt(bp);
    },
  };
  g.ui.banner('BOSS', boss.name, 'Destroy the 4 shield generators, then the core', 3.8, 'boss');
  g.audio.playSong('boss'); g.audio.warning();
  g.say('ratchet', 'You stuffed nuisances! Let my Music Box play your FINAL number!');
  g.say('gizmo', 'It\'s shielded! Take out the four generators on the corners!');
}
function musicBoxPhase2(g, boss) {
  boss.phase = 2;
  boss.core.invulnerable = false; boss.core.lockable = true;
  g.audio.windup();
  if (!g.attract) { g.say('bramble', 'Shield\'s down! The lid\'s opening... hit that core!'); g.ui.hint('The core is exposed: hit it with everything!', 3); }
}
function updateMusicBox(g, boss, dt) {
  const P = boss.parts, p = g.player;
  if (boss.gone) return;
  const bp = boss.obj.position;
  bp.y += Math.sin(boss.t * 0.6) * dt * 3;
  P.crank.rotation.x += dt * (boss.phase === 2 ? 4 : 1);
  P.shield.visible = boss.phase === 1;
  P.shield.material.opacity = 0.14 + Math.sin(boss.t * 4) * 0.05;
  boss.lidOpen = damp(boss.lidOpen, boss.phase >= 2 ? 1 : 0, 1.2, dt);
  P.lid.rotation.x = -boss.lidOpen * 1.3;
  P.core.position.y = 14 + boss.lidOpen * 16;
  P.core.rotation.y += dt * (1 + boss.lidOpen * 3);
  for (const gen of P.gens) gen.orb.scale.setScalar(1 + Math.sin(boss.t * 6) * 0.1);
  boss.obj.updateMatrixWorld(true);
  for (const e of boss.gens) if (!e.dead) { e.gen.orb.getWorldPosition(e.aimPos); e.col.setTranslation(e.aimPos); }
  for (const e of boss.turrets) if (!e.dead) { e.tur.getWorldPosition(e.aimPos); e.col.setTranslation(e.aimPos); }
  P.core.getWorldPosition(boss.core.aimPos); boss.core.col.setTranslation(boss.core.aimPos);
  if (boss.dying > 0) {
    boss.dying -= dt;
    if (Math.random() < dt * 12) { _a.set(rnd(-45, 45), rnd(-17, 17), rnd(-30, 30)); boss.obj.localToWorld(_a); g.fx.explosion(_a, 2.2); g.audio.explode(1.4); }
    if (boss.dying <= 0) {
      g.fx.explosion(bp, 8); g.audio.bomb(); g.shake = 1.5;
      // the lid flies off as a physics body
      P.lid.getWorldPosition(_a); P.lid.getWorldQuaternion(new THREE.Quaternion());
      const lid = P.lid; boss.obj.remove(lid); lid.position.copy(_a); g.root.add(lid);
      g.physics.addDynamic(lid, { type: 'box', x: 46, y: 2, z: 31, oz: -31 }, { vel: { x: rnd(-20, 20), y: 60, z: rnd(-20, 20) }, ang: { x: 1.5, y: 0.5, z: 0.8 }, life: 8, onExpire: () => g.root.remove(lid) });
      for (let i = 0; i < 16; i++) spawnDebris(g, bp.clone().add(_b.set(rnd(-40, 40), rnd(-15, 15), rnd(-25, 25))), 1, 0x7a3f8f);
      boss.gone = true; boss.obj.visible = false;
      g.physics.remove(boss.armorCol);
      g.hits += 15; g.score += 8000; g.ui.popup('BOSS +15', bp, '#ffd34d');
      setTimeout(() => { if (!g.disposed) g.stageClear(); }, 1800);
    }
    return;
  }
  if (g.phase !== 'play' || g.camOverride || p.dead) return;
  const rage = boss.phase === 2 && boss.core.hp < boss.core.maxHp * 0.4;
  const fr = g.diff.enemyFire;
  boss.turretT -= dt * fr;
  if (boss.turretT <= 0) {
    boss.turretT = 0.9;
    const live = boss.turrets.filter((t) => !t.dead);
    if (live.length) { const t = live[Math.floor(Math.random() * live.length)]; if (t.aimPos.distanceTo(p.pos) < 420) g.enemyFire(t.aimPos, p.pos, 140, 0.04, { color: 0xff4fa8, dmg: 7 }); }
  }
  if (boss.phase === 2) {
    boss.ringT -= dt * fr;
    if (boss.ringT <= 0) {
      boss.ringT = rage ? 2.2 : 3.4;
      const c = boss.core.aimPos; const n = rage ? 22 : 16;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; _a.set(Math.cos(a), Math.sin(boss.t) * 0.3, Math.sin(a)).normalize().multiplyScalar(80); g.spawnShot(c, _a, { color: 0xff4fa8, dmg: 8, size: 1.6, life: 6 }); }
      g.audio.tone && g.audio.ctx && g.audio.tone(g.audio.ctx.currentTime, 880, 0.3, 'triangle', 0.08, g.audio.sfxBus);
    }
    if (rage) {
      boss.spiral += dt;
      if (boss.spiral > 0.12) { boss.spiral = 0; const a = boss.t * 3; _a.set(Math.cos(a), 0.15, Math.sin(a)).normalize().multiplyScalar(90); g.spawnShot(boss.core.aimPos, _a, { color: 0xffd0ea, dmg: 6, life: 5 }); }
    }
    boss.droneT -= dt;
    if (boss.droneT <= 0) { boss.droneT = 14; for (let i = 0; i < 3; i++) { const e = spawnAR(g, 'drone', 120); e.obj.position.add(bp); e.countsForClear = false; } }
  }
}
// Area damage against boss proxies is already handled via g.enemies; this adds the shield feedback for splash hits.
export function bossSplash(g, pos, R) {
  const boss = g.boss;
  if (!boss || boss.gone || boss.kind !== 'musicbox' || boss.phase !== 1) return;
  if (pos.distanceTo(boss.obj.position) < R + 80) { boss.parts.shield.material.opacity = 0.5; g.fx.ring(pos, R, 0x55ccff); }
}
