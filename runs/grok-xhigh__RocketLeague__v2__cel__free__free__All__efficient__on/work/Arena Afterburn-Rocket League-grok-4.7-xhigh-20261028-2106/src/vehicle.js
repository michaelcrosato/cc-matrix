import { BALL, CAR } from './constants.js';
import { classifyNormal, geometricSurface } from './arena.js';
import { carAxes, clamp, dot, localToWorld, worldToLocal, wrapAngle } from './math3.js';

export function createCar(spec) {
  const pos = { x: spec.pos.x, y: spec.pos.y, z: spec.pos.z };
  return {
    id: spec.id,
    team: spec.team,
    name: spec.name,
    human: !!spec.human,
    pos,
    vel: { x: 0, y: 0, z: 0 },
    yaw: spec.yaw ?? 0,
    pitch: 0,
    roll: 0,
    boost: CAR.boostStart,
    canDodge: false,
    dodgeTimer: 0,
    jumpLatch: false,
    driveState: 'ground',
    driving: true,
    supersonic: false,
    demolished: false,
    respawnTimer: 0,
    spawn: { x: pos.x, y: pos.y, z: pos.z },
    spawnYaw: spec.yaw ?? 0,
    didJump: false,
    didDodge: false,
    didBoost: false,
    ballCam: true,
  };
}

/** Small pads add a partial charge. Big pads fill the tank. */
export function applyBoostPad(car, kind) {
  if (kind === 'big') car.boost = CAR.boostMax;
  else car.boost = Math.min(CAR.boostMax, car.boost + CAR.smallPad);
  return car;
}

export function markDemo(car) {
  car.demolished = true;
  car.respawnTimer = CAR.demoRespawn;
  car.vel.x = 0;
  car.vel.y = 0;
  car.vel.z = 0;
  car.supersonic = false;
  car.canDodge = false;
  car.dodgeTimer = 0;
  car.didDodge = false;
  return car;
}

export function resolveCarContact(a, b) {
  if (a.demolished || b.demolished) return null;
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dz = b.pos.z - a.pos.z;
  const dist = Math.hypot(dx, dy, dz);
  const reach = CAR.hitRadius * 2;
  if (dist > reach || dist < 1e-6) return null;
  if (a.supersonic || b.supersonic) {
    const victims = [];
    if (a.supersonic) victims.push(b);
    if (b.supersonic) victims.push(a);
    for (const v of victims) markDemo(v);
    return victims;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  const push = (reach - dist) * 0.5;
  a.pos.x -= nx * push;
  a.pos.y -= ny * push;
  a.pos.z -= nz * push;
  b.pos.x += nx * push;
  b.pos.y += ny * push;
  b.pos.z += nz * push;
  const rel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny + (b.vel.z - a.vel.z) * nz;
  if (rel < 0) {
    const impulse = -rel * 0.8;
    a.vel.x -= nx * impulse;
    a.vel.y -= ny * impulse;
    a.vel.z -= nz * impulse;
    b.vel.x += nx * impulse;
    b.vel.y += ny * impulse;
    b.vel.z += nz * impulse;
  }
  return null;
}

export function resolveCarBall(car, ball) {
  if (car.demolished) return false;
  const axes = carAxes(car.yaw, car.pitch, car.roll);
  const half = CAR.half;
  const local = worldToLocal(car.pos, axes, ball.pos);
  const clamped = {
    x: clamp(local.x, -half.x, half.x),
    y: clamp(local.y, -half.y, half.y),
    z: clamp(local.z, -half.z, half.z),
  };
  const lx = local.x - clamped.x;
  const ly = local.y - clamped.y;
  const lz = local.z - clamped.z;
  const dist = Math.hypot(lx, ly, lz);
  let nx;
  let ny;
  let nz;
  let pen;
  if (dist > BALL.radius) return false;
  if (dist < 1e-5) {
    const px = half.x - Math.abs(local.x);
    const py = half.y - Math.abs(local.y);
    const pz = half.z - Math.abs(local.z);
    if (px <= py && px <= pz) {
      nx = local.x >= 0 ? 1 : -1;
      ny = 0;
      nz = 0;
    } else if (py <= pz) {
      nx = 0;
      ny = local.y >= 0 ? 1 : -1;
      nz = 0;
    } else {
      nx = 0;
      ny = 0;
      nz = local.z >= 0 ? 1 : -1;
    }
    pen = BALL.radius;
  } else {
    nx = lx / dist;
    ny = ly / dist;
    nz = lz / dist;
    pen = BALL.radius - dist;
  }
  const normal = localToWorld({ x: 0, y: 0, z: 0 }, axes, { x: nx, y: ny, z: nz });
  ball.pos.x += normal.x * (pen + 0.02);
  ball.pos.y += normal.y * (pen + 0.02);
  ball.pos.z += normal.z * (pen + 0.02);
  const rel =
    (ball.vel.x - car.vel.x) * normal.x +
    (ball.vel.y - car.vel.y) * normal.y +
    (ball.vel.z - car.vel.z) * normal.z;
  if (rel < 0) {
    const bounce = (1 + BALL.restitution) * -rel;
    ball.vel.x += normal.x * bounce + car.vel.x * 0.25;
    ball.vel.y += normal.y * bounce + car.vel.y * 0.25;
    ball.vel.z += normal.z * bounce + car.vel.z * 0.25;
  }
  return true;
}

function stickToSurface(car, normal, state) {
  const into = car.vel.x * normal.x + car.vel.y * normal.y + car.vel.z * normal.z;
  if (into < 0) {
    car.vel.x -= normal.x * into;
    car.vel.y -= normal.y * into;
    car.vel.z -= normal.z * into;
  }
  if (state === 'ground') {
    car.pos.y = CAR.half.y;
    car.vel.y = Math.max(0, car.vel.y);
  }
}

function applyPlanarDrive(car, input, dt, forward, right, grip) {
  const fwdSpeed = car.vel.x * forward.x + car.vel.z * forward.z;
  const accel = input.throttle >= 0 ? CAR.throttleAccel : CAR.brakeAccel;
  car.vel.x += forward.x * accel * input.throttle * dt;
  car.vel.z += forward.z * accel * input.throttle * dt;
  const lat = car.vel.x * right.x + car.vel.z * right.z;
  const kill = Math.min(1, grip * dt);
  car.vel.x -= right.x * lat * kill;
  car.vel.z -= right.z * lat * kill;
  const cap = input.boost && car.boost > 0 ? CAR.boostMaxSpeed : CAR.driveMax;
  const planar = Math.hypot(car.vel.x, car.vel.z);
  if (planar > cap && planar > 1e-6) {
    const s = cap / planar;
    car.vel.x *= s;
    car.vel.z *= s;
  }
  const speed = Math.hypot(car.vel.x, car.vel.z);
  const rate = CAR.steerRate * (input.powerslide ? 1.35 : 1) * (1 - 0.4 * Math.min(1, speed / CAR.driveMax));
  const reverse = fwdSpeed < -1 ? -1 : 1;
  car.yaw = wrapAngle(car.yaw + input.steer * rate * reverse * dt);
}

/**
 * One vehicle step. `contacts.surfaceNormal` forces a surface (null = air).
 * Omit `contacts` to use the arena geometry.
 */
export function stepCar(car, input = {}, dt, contacts) {
  car.didJump = false;
  car.didDodge = false;
  car.didBoost = false;
  if (car.demolished) {
    car.respawnTimer -= dt;
    car.vel.x = 0;
    car.vel.y = 0;
    car.vel.z = 0;
    car.supersonic = false;
    car.driving = false;
    if (car.respawnTimer <= 0) {
      car.demolished = false;
      car.respawnTimer = 0;
      car.pos.x = car.spawn.x;
      car.pos.y = car.spawn.y;
      car.pos.z = car.spawn.z;
      car.yaw = car.spawnYaw;
      car.pitch = 0;
      car.roll = 0;
      car.boost = CAR.boostStart;
      car.canDodge = false;
      car.dodgeTimer = 0;
      car.driveState = 'ground';
      car.driving = true;
      car.jumpLatch = false;
    }
    return car;
  }

  const throttle = clamp(input.throttle || 0, -1, 1);
  const steer = clamp(input.steer || 0, -1, 1);
  const pitchIn = clamp(input.pitch || 0, -1, 1);
  const yawIn = clamp(input.yaw || 0, -1, 1);
  const rollIn = clamp(input.roll || 0, -1, 1);
  const jump = !!input.jump;
  const boost = !!input.boost;
  const powerslide = !!input.powerslide;
  const driveInput = { throttle, steer, boost, powerslide };

  const surface =
    contacts && Object.prototype.hasOwnProperty.call(contacts, 'surfaceNormal')
      ? contacts.surfaceNormal
      : geometricSurface(car);
  const state = classifyNormal(surface);
  const onSurface = state !== 'air';

  if (onSurface) {
    car.driveState = state;
    car.driving = true;
    car.canDodge = false;
    car.dodgeTimer = 0;
    stickToSurface(car, surface, state);
    if (state === 'ground') {
      car.pitch += (0 - car.pitch) * Math.min(1, dt * 10);
      car.roll += (0 - car.roll) * Math.min(1, dt * 10);
      const flat = carAxes(car.yaw, 0, 0);
      applyPlanarDrive(car, driveInput, dt, flat.forward, flat.right, powerslide ? CAR.slideGrip : CAR.lateralGrip);
    } else {
      const flat = carAxes(car.yaw, 0, 0);
      const fx = flat.forward.x - surface.x * dot(flat.forward, surface);
      const fz = flat.forward.z - surface.z * dot(flat.forward, surface);
      const fl = Math.hypot(fx, fz) || 1;
      const rx = flat.right.x - surface.x * dot(flat.right, surface);
      const rz = flat.right.z - surface.z * dot(flat.right, surface);
      const rl = Math.hypot(rx, rz) || 1;
      applyPlanarDrive(
        car,
        driveInput,
        dt,
        { x: fx / fl, y: 0, z: fz / fl },
        { x: rx / rl, y: 0, z: rz / rl },
        powerslide ? CAR.slideGrip : CAR.lateralGrip,
      );
      car.vel.y += CAR.gravity * dt * (state === 'ceiling' ? 0.05 : 0.2);
      car.vel.x -= surface.x * 3 * dt;
      car.vel.y -= surface.y * 3 * dt;
      car.vel.z -= surface.z * 3 * dt;
      car.roll = clamp(car.roll + (-surface.x * 1.2 - car.roll) * Math.min(1, dt * 6), -1.25, 1.25);
      car.pitch = clamp(car.pitch + (surface.z * 1.1 - car.pitch) * Math.min(1, dt * 6), -1.1, 1.1);
    }
  } else {
    car.driveState = 'air';
    car.driving = false;
    car.vel.y += CAR.gravity * dt;
    const airRate = 2.4;
    car.pitch = clamp(car.pitch + pitchIn * airRate * dt, -1.15, 1.2);
    car.yaw = wrapAngle(car.yaw + (yawIn + steer * 0.35) * airRate * dt);
    car.roll = clamp(car.roll + (rollIn - steer * 0.15) * airRate * dt, -1.4, 1.4);
    if (car.canDodge) {
      car.dodgeTimer -= dt;
      if (car.dodgeTimer <= 0) {
        car.canDodge = false;
        car.dodgeTimer = 0;
      }
    }
  }

  const pressed = jump && !car.jumpLatch;
  car.jumpLatch = jump;
  if (pressed && onSurface && surface) {
    car.vel.x += surface.x * CAR.jumpSpeed;
    car.vel.y += surface.y * CAR.jumpSpeed;
    car.vel.z += surface.z * CAR.jumpSpeed;
    car.pos.x += surface.x * 0.12;
    car.pos.y += surface.y * 0.12;
    car.pos.z += surface.z * 0.12;
    car.driveState = 'air';
    car.driving = false;
    car.canDodge = true;
    car.dodgeTimer = CAR.dodgeWindow;
    car.didJump = true;
  } else if (pressed && car.canDodge && car.driveState === 'air') {
    const flat = carAxes(car.yaw, 0, 0);
    const mag = Math.hypot(steer, pitchIn);
    if (mag < 0.25) {
      car.vel.y += CAR.jumpSpeed * 0.9;
    } else {
      const sx = steer / mag;
      const sz = -pitchIn / mag;
      const dirx = flat.right.x * sx + flat.forward.x * sz;
      const dirz = flat.right.z * sx + flat.forward.z * sz;
      car.vel.x += dirx * CAR.dodgeSpeed;
      car.vel.z += dirz * CAR.dodgeSpeed;
      car.vel.y += CAR.dodgeUp;
      car.roll = clamp(car.roll - sx * 0.8, -1.4, 1.4);
      car.pitch = clamp(car.pitch + pitchIn * 0.45, -1.15, 1.2);
    }
    car.canDodge = false;
    car.dodgeTimer = 0;
    car.didDodge = true;
  }

  if (boost && car.boost > 0) {
    const need = CAR.boostDrain * dt;
    const used = Math.min(car.boost, need);
    const ratio = need > 0 ? used / need : 0;
    car.boost -= used;
    const axes = carAxes(car.yaw, car.pitch, car.roll);
    car.vel.x += axes.forward.x * CAR.boostAccel * dt * ratio;
    car.vel.y += axes.forward.y * CAR.boostAccel * dt * ratio;
    car.vel.z += axes.forward.z * CAR.boostAccel * dt * ratio;
    if (used > 0) car.didBoost = true;
    const cap = CAR.boostMaxSpeed;
    const planar = Math.hypot(car.vel.x, car.vel.z);
    if (planar > cap) {
      const s = cap / planar;
      car.vel.x *= s;
      car.vel.z *= s;
    }
  }

  car.pos.x += car.vel.x * dt;
  car.pos.y += car.vel.y * dt;
  car.pos.z += car.vel.z * dt;

  if (!car.didJump && car.pos.y < CAR.half.y) {
    car.pos.y = CAR.half.y;
    if (car.vel.y < 0) car.vel.y = 0;
    if (car.driveState === 'air') {
      car.driveState = 'ground';
      car.driving = true;
      car.canDodge = false;
      car.dodgeTimer = 0;
    }
  }

  const planar = Math.hypot(car.vel.x, car.vel.z);
  car.supersonic = planar >= CAR.supersonic;
  return car;
}
