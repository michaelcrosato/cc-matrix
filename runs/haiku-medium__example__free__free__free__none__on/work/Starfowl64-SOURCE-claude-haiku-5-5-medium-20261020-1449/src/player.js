import * as THREE from 'three';
import { world, spawnParticle } from './world.js';
import { enemies, firePlayerShot, fireMissile } from './entities.js';
import { sfx } from './audio.js';
import { settings } from './input.js';

// The Arwing: flight model, barrel roll, U-turn, boost/brake, lasers, lock-on and shield.

const BASE_SPEED = 38;
const BOOST_MULT = 1.65;
const BRAKE_MULT = 0.45;
const MAX_LOCKS = 6;
const LOCK_TIME = 0.42;
const ROLL_TIME = 0.7;
const UTURN_TIME = 1.2;
const FIRE_INTERVAL = 0.11;
const BOUNDS = { minX: -9, maxX: 9, minY: -1.5, maxY: 7 };
export const MAX_SHIELD = 100;

export const player = {
  x: 0,
  y: 2.5,
  vx: 0,
  vy: 0,
  shield: MAX_SHIELD,
  bombs: 3,
  maxBombs: 5,
  invuln: 0,
  dead: false,
  godMode: false,
  speed: 0,
  flow: BASE_SPEED,
  facing: 1,
  turnAngle: 0,
  roll: { active: false, t: 0 },
  uturn: { active: false, t: 0, start: 0 },
  locks: [],
  lockProgress: new Map(),
  lockWasHeld: false,
  fireT: 0,
  fireSide: 1,
  root: null,
  body: null,
  wingLeft: null,
  wingRight: null,
  prevBomb: false,
  prevRoll: false,
  prevUturn: false,
  stats: { shotsFired: 0, shotsHit: 0, deflects: 0, rolls: 0, uturns: 0, missiles: 0 },
};

let engineGlows = [];

export function buildArwing(scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xd8dde8, metalness: 0.5, roughness: 0.35, flatShading: true });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2e62c8, metalness: 0.5, roughness: 0.4, flatShading: true });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x66d8ff, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.8, emissive: 0x114466, emissiveIntensity: 0.4 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x66ffee });

  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.6, 8), hullMat);
  fuselage.rotation.x = -Math.PI / 2;
  fuselage.castShadow = true;
  body.add(fuselage);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), canopyMat);
  canopy.scale.set(0.9, 0.5, 1.6);
  canopy.position.set(0, 0.35, -0.6);
  body.add(canopy);

  const wingGeo = new THREE.BoxGeometry(3.6, 0.1, 2.2);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, hullMat);
    wing.position.set(s * 1.9, 0, 0.6);
    wing.rotation.z = s * -0.12;
    wing.rotation.y = s * 0.3;
    wing.castShadow = true;
    body.add(wing);
    if (s < 0) player.wingLeft = wing; else player.wingRight = wing;

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.2), accentMat);
    tail.position.set(s * 1.1, 0.7, 1.3);
    tail.rotation.z = s * 0.35;
    tail.castShadow = true;
    body.add(tail);

    const engine = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat);
    engine.position.set(s * 0.8, -0.05, 1.5);
    body.add(engine);
    engineGlows.push(engine);
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 3.2), accentMat);
  stripe.position.set(0, 0.36, 0.2);
  body.add(stripe);

  root.position.set(0, 2.5, 0);
  root.rotation.order = 'YXZ';
  scene.add(root);
  player.root = root;
  player.body = body;
  return root;
}

function inBounds(x, y) {
  return { x: Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x)), y: Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, y)) };
}

// Lock candidates are enemies in front of the ship (relative to facing) and inside the screen cone.
function inLockCone(e) {
  const ahead = -e.z * player.facing;
  if (ahead < -10 || ahead > 260) return false;
  const v = new THREE.Vector3(e.x, e.y, e.z).project(world.camera);
  return Math.abs(v.x) < 0.7 && Math.abs(v.y) < 0.65 && v.z < 1;
}

// Advances the Arwing for one frame. Returns a list of events for game.js to resolve.
export function updatePlayer(dt, input, stageSpeedMult = 1) {
  const events = [];
  if (player.dead) return events;

  player.invuln = Math.max(0, player.invuln - dt);

  // Flight input: stick/keys move the ship in the view plane. Speed scales with boost/brake.
  const sens = settings.sensitivity;
  const sx = input.x * 15 * sens * dt;
  const sy = input.y * 11 * sens * dt;
  const next = inBounds(player.x + sx, player.y + sy);
  player.vx = (next.x - player.x) / Math.max(dt, 1e-4);
  player.vy = (next.y - player.y) / Math.max(dt, 1e-4);
  player.x = next.x;
  player.y = next.y;

  // Barrel roll: edge-triggered, deflects enemy shots while active.
  if (input.barrel && !player.prevRoll && !player.roll.active && !player.uturn.active) {
    player.roll = { active: true, t: 0 };
    player.stats.rolls++;
    events.push({ type: 'roll' });
    sfx('barrel');
  }
  player.prevRoll = input.barrel;
  if (player.roll.active) {
    player.roll.t += dt;
    if (player.roll.t >= ROLL_TIME) player.roll.active = false;
  }

  // U-turn: 180 degree turn. Flow slows to zero at the midpoint and reverses.
  if (input.uturn && !player.prevUturn && !player.uturn.active && !player.roll.active) {
    player.uturn = { active: true, t: 0, start: player.turnAngle };
    player.stats.uturns++;
    events.push({ type: 'uturn' });
    sfx('uturn');
  }
  player.prevUturn = input.uturn;
  // turnAngle is 0 (facing +1) or PI (facing -1) between turns; a turn advances it by PI.
  if (player.uturn.active) {
    player.uturn.t += dt;
    const f = Math.min(1, player.uturn.t / UTURN_TIME);
    player.turnAngle = player.uturn.start + f * Math.PI;
    if (f >= 1) {
      player.uturn.active = false;
      player.turnAngle = (player.uturn.start + Math.PI) % (Math.PI * 2);
    }
  }
  // Facing flips when the turn passes 90 degrees.
  const facing = Math.cos(player.turnAngle) >= 0 ? 1 : -1;
  if (facing !== player.facing) {
    player.facing = facing;
    events.push({ type: 'facing', facing });
  }

  // Speed: boost and brake are held; the scroll speed follows the turn angle.
  const mult = input.boost ? BOOST_MULT : input.brake ? BRAKE_MULT : 1;
  const target = BASE_SPEED * mult * stageSpeedMult;
  player.speed += (target - player.speed) * Math.min(1, dt * 4);
  player.flow = player.speed * Math.cos(player.turnAngle);

  // Visual: ship yaw follows the turn, pitch and bank follow the stick, roll adds spin.
  player.root.position.set(player.x, player.y, 0);
  const rollAngle = player.roll.active ? (player.roll.t / ROLL_TIME) * Math.PI * 2 : 0;
  player.root.rotation.set(input.y * 0.12, player.turnAngle, 0);
  player.body.rotation.set(0, 0, -input.x * 0.45 + rollAngle);
  if (player.wingLeft) player.wingLeft.rotation.z = -0.12 - input.x * 0.2;
  if (player.wingRight) player.wingRight.rotation.z = 0.12 + input.x * 0.2;

  // Engine glow flicker and boost trail.
  const glow = input.boost ? 1.4 : 0.8;
  for (const e of engineGlows) e.scale.setScalar(glow + Math.random() * 0.2);
  if (input.boost && Math.random() < 0.6) {
    const s = player.facing;
    spawnParticle(player.x + (Math.random() - 0.5) * 1.2, player.y, 1.5, 0, 0, s * 12, 0.4, 0.9, 1, 0.35);
  }

  // Lasers: held fire, alternating wings. Fire direction follows facing.
  player.fireT -= dt;
  if (input.fire && player.fireT <= 0) {
    player.fireT = FIRE_INTERVAL;
    const side = player.fireSide;
    player.fireSide *= -1;
    firePlayerShot(player.x + side * 1.5, player.y - 0.1, -0.5, player.facing);
    player.stats.shotsFired++;
    events.push({ type: 'fire' });
    sfx('laser');
  }

  updateLocks(dt, input, events);
  player.lockWasHeld = input.lock;

  // Bomb: edge-triggered; game.js applies the effect to the field.
  if (input.bomb && !player.prevBomb && player.bombs > 0) {
    player.bombs--;
    events.push({ type: 'bomb' });
  }
  player.prevBomb = input.bomb;

  return events;
}

// Lock-on: hold to scan. Release to fire homing missiles at every locked target.
function updateLocks(dt, input, events) {
  if (input.lock) {
    for (const e of enemies) {
      if (!e.alive || !e.lockable) continue;
      if (player.locks.find((l) => l.enemy === e)) continue;
      if (!inLockCone(e)) {
        player.lockProgress.delete(e);
        continue;
      }
      const p = (player.lockProgress.get(e) || 0) + dt;
      if (p >= LOCK_TIME && player.locks.length < MAX_LOCKS) {
        player.locks.push({ enemy: e });
        player.lockProgress.delete(e);
        sfx('lockOn');
      } else {
        player.lockProgress.set(e, p);
      }
    }
  }
  // Drop locks on destroyed enemies or ones that drifted out of the cone while held.
  player.locks = player.locks.filter((l) => l.enemy.alive && (input.lock || inLockCone(l.enemy)));

  if (player.lockWasHeld && !input.lock && player.locks.length > 0) {
    let k = 0;
    for (const l of player.locks) {
      if (!l.enemy.alive) continue;
      fireMissile(player.x + (k % 2 ? 1.2 : -1.2), player.y, -0.5, l.enemy, player.facing);
      player.stats.missiles++;
      k++;
    }
    sfx('lockFire');
    events.push({ type: 'missiles', count: k });
    player.locks = [];
  }
}

export function damagePlayer(dmg) {
  if (player.dead || player.invuln > 0 || player.godMode) return false;
  player.shield = Math.max(0, player.shield - dmg);
  player.invuln = 0.6;
  if (player.shield <= 0) {
    player.dead = true;
    return true;
  }
  return false;
}

export function healPlayer(amount) {
  player.shield = Math.min(MAX_SHIELD, player.shield + amount);
}

export function resetPlayer() {
  player.x = 0;
  player.y = 2.5;
  player.shield = MAX_SHIELD;
  player.bombs = 3;
  player.invuln = 0;
  player.dead = false;
  player.speed = BASE_SPEED;
  player.flow = BASE_SPEED;
  player.facing = 1;
  player.roll = { active: false, t: 0 };
  player.uturn = { active: false, t: 0, start: 0 };
  player.turnAngle = 0;
  player.locks = [];
  player.lockProgress = new Map();
  player.stats = { shotsFired: 0, shotsHit: 0, deflects: 0, rolls: 0, uturns: 0, missiles: 0 };
}
