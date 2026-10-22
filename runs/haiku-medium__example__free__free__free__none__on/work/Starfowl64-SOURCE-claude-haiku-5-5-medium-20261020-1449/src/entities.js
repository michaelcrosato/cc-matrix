import * as THREE from 'three';
import { world, burst, addShake } from './world.js';
import { sfx } from './audio.js';

// Enemies, projectiles and pickups. Everything lives in world space; the ship only moves in x/y.
// Ship facing is +1 (flying into -z) or -1 after a U-turn; `flow` is the signed scroll speed.

export const enemies = [];
export const enemyShots = [];
export const playerShots = [];
export const missiles = [];
export const pickups = [];
export const events = { kills: 0, bossDown: false };

const geo = {};
const mat = {};

function G() {
  if (geo.box) return;
  geo.box = new THREE.BoxGeometry(1, 1, 1);
  geo.cone = new THREE.ConeGeometry(0.5, 1, 6);
  geo.sphere = new THREE.SphereGeometry(0.5, 12, 8);
  geo.torus = new THREE.TorusGeometry(0.9, 0.12, 8, 24);
  geo.octa = new THREE.OctahedronGeometry(0.6, 0);
  mat.venom = new THREE.MeshStandardMaterial({ color: 0x6b1d2e, metalness: 0.4, roughness: 0.5, flatShading: true });
  mat.venomGlow = new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff2244, emissiveIntensity: 1.5 });
  mat.steel = new THREE.MeshStandardMaterial({ color: 0x5a6a80, metalness: 0.7, roughness: 0.35, flatShading: true });
  mat.steelDark = new THREE.MeshStandardMaterial({ color: 0x2a3446, metalness: 0.8, roughness: 0.4, flatShading: true });
  mat.bossGlow = new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff6622, emissiveIntensity: 2 });
  mat.shotEnemy = new THREE.MeshBasicMaterial({ color: 0xff5566 });
  mat.shotPlayer = new THREE.MeshBasicMaterial({ color: 0x66ffcc });
  mat.missile = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  mat.ring = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffaa00, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.2 });
  mat.bomb = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 1.4 });
  mat.shield = new THREE.MeshStandardMaterial({ color: 0x66aaff, emissive: 0x3366ff, emissiveIntensity: 1.4 });
}

function makeFighter() {
  G();
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo.cone, mat.venom);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.4, 2.2, 1.4);
  g.add(body);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(geo.box, mat.venom);
    wing.scale.set(2.8, 0.12, 1.1);
    wing.position.set(s * 1.4, 0, 0.2);
    wing.rotation.z = s * 0.25;
    g.add(wing);
    const tip = new THREE.Mesh(geo.sphere, mat.venomGlow);
    tip.scale.setScalar(0.22);
    tip.position.set(s * 2.7, 0, 0.2);
    g.add(tip);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeInterceptor() {
  G();
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo.box, mat.steel);
  body.scale.set(0.9, 0.6, 2.4);
  g.add(body);
  const nose = new THREE.Mesh(geo.cone, mat.steelDark);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.8;
  nose.scale.set(0.8, 1.4, 0.8);
  g.add(nose);
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(geo.box, mat.steelDark);
    fin.scale.set(1.8, 0.08, 0.9);
    fin.position.set(s * 1.1, 0, -0.5);
    g.add(fin);
  }
  const eye = new THREE.Mesh(geo.sphere, mat.venomGlow);
  eye.scale.setScalar(0.3);
  eye.position.z = 1.1;
  g.add(eye);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeTurret() {
  G();
  const g = new THREE.Group();
  const base = new THREE.Mesh(geo.box, mat.steelDark);
  base.scale.set(2.2, 1, 2.2);
  g.add(base);
  const dome = new THREE.Mesh(geo.sphere, mat.steel);
  dome.scale.setScalar(1.2);
  dome.position.y = 0.6;
  g.add(dome);
  const barrel = new THREE.Mesh(geo.box, mat.steelDark);
  barrel.scale.set(0.3, 0.3, 1.8);
  barrel.position.set(0, 1.1, 0.7);
  g.add(barrel);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeStriker() {
  G();
  const g = new THREE.Group();
  const hull = new THREE.Mesh(geo.box, mat.steel);
  hull.scale.set(5, 2.4, 9);
  g.add(hull);
  const bridge = new THREE.Mesh(geo.box, mat.steelDark);
  bridge.scale.set(2, 1.4, 2.4);
  bridge.position.set(0, 1.8, -1.5);
  g.add(bridge);
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(geo.box, mat.steelDark);
    pod.scale.set(1.1, 1.1, 6);
    pod.position.set(s * 4, -0.2, 0);
    g.add(pod);
    const eng = new THREE.Mesh(geo.sphere, mat.bossGlow);
    eng.scale.set(0.9, 0.9, 0.5);
    eng.position.set(s * 4, -0.2, -3.2);
    g.add(eng);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function makeWarden() {
  G();
  const g = new THREE.Group();
  const core = new THREE.Mesh(geo.box, mat.steelDark);
  core.scale.set(7, 3.4, 12);
  g.add(core);
  const crown = new THREE.Mesh(geo.octa, mat.bossGlow);
  crown.scale.set(3, 3, 3);
  crown.position.set(0, 3.2, 0);
  g.add(crown);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(geo.box, mat.steel);
    arm.scale.set(6, 1.6, 4);
    arm.position.set(s * 8, 0, 2);
    arm.rotation.z = s * 0.2;
    g.add(arm);
    const cannon = new THREE.Mesh(geo.sphere, mat.bossGlow);
    cannon.scale.setScalar(1.3);
    cannon.position.set(s * 8, 0, 5);
    g.add(cannon);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

const BUILDERS = {
  fighter: makeFighter,
  interceptor: makeInterceptor,
  turret: makeTurret,
  striker: makeStriker,
  warden: makeWarden,
};

const STATS = {
  fighter: { hp: 1, radius: 2.2, score: 150, lockable: true },
  interceptor: { hp: 2, radius: 2.0, score: 300, lockable: true },
  turret: { hp: 2, radius: 2.2, score: 200, lockable: true },
  striker: { hp: 8, radius: 5.0, score: 1200, lockable: true },
  warden: { hp: 90, radius: 9.0, score: 15000, lockable: true, boss: true },
};

export function spawnEnemy(type, x, y, z, extra = {}) {
  const s = STATS[type];
  const mesh = BUILDERS[type]();
  mesh.position.set(x, y, z);
  world.scene.add(mesh);
  const e = {
    type,
    mesh,
    x, y, z,
    vx: 0, vy: 0, vz: 0,
    hp: s.hp,
    maxHp: s.hp,
    radius: s.radius,
    score: s.score,
    lockable: s.lockable,
    boss: !!s.boss,
    t: 0,
    fireT: 1 + Math.random() * 1.5,
    baseX: x,
    baseY: y,
    phase: Math.random() * Math.PI * 2,
    alive: true,
    hitFlash: 0,
    ...extra,
  };
  enemies.push(e);
  return e;
}

export function removeEnemy(e) {
  e.alive = false;
  world.scene.remove(e.mesh);
}

function fireEnemyShot(e, px, py, pz, speed, dmg = 1, spread = 0) {
  const dx = px - e.x;
  const dy = py - e.y;
  const dz = pz - e.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const sx = (dx / len) * speed + (spread ? (Math.random() - 0.5) * spread : 0);
  const sy = (dy / len) * speed + (spread ? (Math.random() - 0.5) * spread : 0);
  const sz = (dz / len) * speed;
  const m = new THREE.Mesh(geo.sphere, mat.shotEnemy);
  m.scale.setScalar(0.5);
  m.position.set(e.x, e.y, e.z);
  world.scene.add(m);
  enemyShots.push({ mesh: m, x: e.x, y: e.y, z: e.z, vx: sx, vy: sy, vz: sz, life: 5, dmg, radius: 0.9 });
}

// Returns the shot so callers (wingmen) can tag it. Only the player's own shots count toward accuracy.
export function firePlayerShot(x, y, z, facing, owner = 'player') {
  const m = new THREE.Mesh(geo.box, mat.shotPlayer);
  m.scale.set(0.12, 0.12, 2.2);
  m.position.set(x, y, z);
  world.scene.add(m);
  const shot = { mesh: m, x, y, z, vx: 0, vy: 0, vz: -facing * 140, life: 1.2, owner };
  playerShots.push(shot);
  return shot;
}

export function fireMissile(x, y, z, target, facing) {
  const m = new THREE.Mesh(geo.octa, mat.missile);
  m.scale.setScalar(0.35);
  m.position.set(x, y, z);
  world.scene.add(m);
  missiles.push({ mesh: m, x, y, z, vx: 0, vy: 40, vz: -facing * 60, target, life: 3.5, facing });
}

export function spawnPickup(kind, x, y, z) {
  const color = kind === 'bomb' ? mat.bomb : kind === 'shield' ? mat.shield : mat.ring;
  const m = new THREE.Mesh(kind === 'ring' ? geo.torus : geo.octa, color);
  m.scale.setScalar(kind === 'ring' ? 1 : 0.9);
  m.position.set(x, y, z);
  world.scene.add(m);
  pickups.push({ kind, mesh: m, x, y, z, t: Math.random() * 6, radius: 2.2 });
}

export function clearAll() {
  for (const list of [enemies, enemyShots, playerShots, missiles, pickups]) {
    for (const o of list) world.scene.remove(o.mesh);
    list.length = 0;
  }
  events.kills = 0;
  events.bossDown = false;
}

// Advances enemies. `flow` is the signed scroll speed; `target` is the player's current position.
export function updateEnemies(dt, flow, target, facing) {
  // Enemy AI uses the ship's facing for its own bullet direction and pass-by removal.
  for (const e of enemies) {
    if (!e.alive) continue;
    e.t += dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
    e.z += flow * dt;

    if (e.type === 'fighter') {
      e.x = e.baseX + Math.sin(e.t * 1.6 + e.phase) * 5;
      e.y = e.baseY + Math.sin(e.t * 2.4 + e.phase) * 0.8;
      e.z += e.vz * dt;
      e.fireT -= dt;
      if (e.fireT <= 0 && Math.abs(e.z) < 160) {
        fireEnemyShot(e, target.x, target.y, target.z, 46);
        e.fireT = 2.4;
      }
    } else if (e.type === 'interceptor') {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), 14 * dt);
      e.y += Math.sign(dy) * Math.min(Math.abs(dy), 10 * dt);
      e.z += (e.vz || 0) * dt;
      e.vz = Math.min(e.vz + 20 * dt, 30);
      e.fireT -= dt;
      if (e.fireT <= 0 && Math.abs(e.z) < 120) {
        fireEnemyShot(e, target.x, target.y, target.z, 55);
        e.fireT = 2.0;
      }
    } else if (e.type === 'turret') {
      e.fireT -= dt;
      if (e.fireT <= 0 && Math.abs(e.z) < 150) {
        fireEnemyShot(e, target.x, target.y, target.z, 38, 1, 2);
        e.fireT = 1.9;
      }
    } else if (e.type === 'striker') {
      e.x = e.baseX + Math.sin(e.t * 0.7 + e.phase) * 3;
      e.fireT -= dt;
      if (e.fireT <= 0 && Math.abs(e.z) < 170) {
        for (let k = -1; k <= 1; k++) {
          fireEnemyShot(e, target.x + k * 3, target.y, target.z, 42);
        }
        e.fireT = 3.2;
      }
    } else if (e.type === 'warden') {
      // Hovers at a fixed range ahead of the ship, cancelling the scroll.
      e.z += (-facing * 130 - e.z) * Math.min(1, dt * 0.8);
      e.x = Math.sin(e.t * 0.5) * 6;
      e.y = 4 + Math.sin(e.t * 0.9) * 1.2;
      const frac = e.hp / e.maxHp;
      const rate = frac > 0.66 ? 2.2 : frac > 0.33 ? 1.4 : 0.9;
      e.fireT -= dt;
      if (e.fireT <= 0) {
        const count = frac > 0.33 ? 5 : 7;
        for (let k = 0; k < count; k++) {
          const off = (k - (count - 1) / 2) * 2.5;
          fireEnemyShot(e, target.x + off, target.y, target.z, 48, 1, 1);
        }
        e.fireT = rate;
      }
    }

    e.mesh.position.set(e.x, e.y, e.z);
    if (e.type === 'fighter') {
      e.mesh.rotation.set(0, 0, Math.cos(e.t * 1.6 + e.phase) * 0.35);
    } else if (e.type === 'interceptor') {
      e.mesh.lookAt(target.x, target.y, target.z);
    } else if (e.type === 'warden') {
      e.mesh.rotation.z = Math.sin(e.t * 0.5) * 0.08;
    }
    if (e.hitFlash > 0) {
      e.mesh.scale.setScalar(1 + e.hitFlash * 0.05);
    } else {
      e.mesh.scale.setScalar(1);
    }

    // Passed the ship (relative to facing) or left the draw distance: remove.
    if (e.z * facing > 40 || Math.abs(e.z) > 380) {
      removeEnemy(e);
    }
  }
  compact(enemies);
}

export function damageEnemy(e, dmg) {
  if (!e.alive) return false;
  e.hp -= dmg;
  e.hitFlash = 1;
  if (e.hp <= 0) {
    destroyEnemy(e);
    return true;
  }
  return false;
}

export function destroyEnemy(e) {
  if (!e.alive) return;
  removeEnemy(e);
  events.kills++;
  const big = e.boss || e.type === 'striker';
  burst(e.x, e.y, e.z, big ? 90 : 36, e.type === 'turret' ? 0xffaa55 : 0xff7744, big ? 30 : 16, big ? 1.8 : 0.9);
  addShake(big ? 1.2 : 0.4);
  sfx(big ? 'bigExplode' : 'explode');
  if (e.boss) events.bossDown = true;
  if (e.type !== 'warden' && Math.random() < 0.12) spawnPickup(Math.random() < 0.5 ? 'ring' : 'bomb', e.x, e.y, e.z);
  if (e.type === 'striker' && Math.random() < 0.5) spawnPickup('shield', e.x, e.y, e.z);
}

// Moves shots, removes expired ones, and returns nothing; collisions are resolved by game.js.
export function updateProjectiles(dt, flow) {
  for (const s of enemyShots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    // Enemy shots live in world space: their velocity was aimed at the ship's z, so no scroll is added.
    s.z += s.vz * dt;
    s.life -= dt;
    s.mesh.position.set(s.x, s.y, s.z);
    if (s.life <= 0) { world.scene.remove(s.mesh); s.dead = true; }
  }
  compact(enemyShots);

  for (const s of playerShots) {
    s.z += s.vz * dt;
    s.life -= dt;
    s.mesh.position.set(s.x, s.y, s.z);
    if (s.life <= 0) { world.scene.remove(s.mesh); s.dead = true; }
  }
  compact(playerShots);

  for (const m of missiles) {
    const t = m.target;
    if (t && t.alive) {
      const dx = t.x - m.x;
      const dy = t.y - m.y;
      const dz = t.z - m.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const turn = 9 * dt;
      m.vx += (dx / len * 70 - m.vx) * Math.min(1, turn);
      m.vy += (dy / len * 70 - m.vy) * Math.min(1, turn);
      m.vz += (dz / len * 70 - m.vz) * Math.min(1, turn);
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.z += m.vz * dt;
    m.life -= dt;
    m.mesh.position.set(m.x, m.y, m.z);
    m.mesh.rotation.x += dt * 10;
    if (m.life <= 0) { world.scene.remove(m.mesh); m.dead = true; }
  }
  compact(missiles);

  for (const p of pickups) {
    p.z += flow * dt;
    p.t += dt;
    p.mesh.position.set(p.x, p.y + Math.sin(p.t * 2) * 0.4, p.z);
    p.mesh.rotation.y += dt * 2;
    if (Math.abs(p.z) > 260) { world.scene.remove(p.mesh); p.dead = true; }
  }
  compact(pickups);
}

// Takes a shot, missile or pickup out of play and off the scene.
export function retire(o) {
  world.scene.remove(o.mesh);
  o.dead = true;
}

function compact(list) {
  let w = 0;
  for (let r = 0; r < list.length; r++) {
    if (!list[r].dead && list[r].alive !== false) list[w++] = list[r];
  }
  list.length = w;
}
