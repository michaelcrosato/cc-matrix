import { ARENA, CAR } from './constants.js';

const NAMES = {
  blue: ['VESPER', 'HALO'],
  orange: ['CINDER', 'WICK'],
};

export function teamNames(team, index) {
  return NAMES[team][index] ?? `${team.toUpperCase()} ${index + 1}`;
}

/** Blue defends −Z and faces +Z (yaw π). Orange defends +Z and faces −Z (yaw 0). */
export function kickoffSpawns(teamSize) {
  const zBlue = -ARENA.length / 2 + 16;
  const zOrange = ARENA.length / 2 - 16;
  const y = CAR.half.y;
  if (teamSize === 1) {
    return [
      { team: 'blue', x: 0, y, z: zBlue, yaw: Math.PI },
      { team: 'orange', x: 0, y, z: zOrange, yaw: 0 },
    ];
  }
  return [
    { team: 'blue', x: -8, y, z: zBlue, yaw: Math.PI },
    { team: 'blue', x: 8, y, z: zBlue, yaw: Math.PI },
    { team: 'orange', x: -8, y, z: zOrange, yaw: 0 },
    { team: 'orange', x: 8, y, z: zOrange, yaw: 0 },
  ];
}

export function createPads() {
  const L = ARENA.length / 2;
  const W = ARENA.width / 2;
  const pads = [];
  const big = [
    [-W * 0.72, -L * 0.72],
    [W * 0.72, -L * 0.72],
    [-W * 0.72, L * 0.72],
    [W * 0.72, L * 0.72],
  ];
  for (const [x, z] of big) pads.push({ x, z, kind: 'big', r: 2.3, ready: true, timer: 0 });
  const small = [
    [0, -L * 0.42],
    [0, L * 0.42],
    [-W * 0.48, -L * 0.42],
    [W * 0.48, -L * 0.42],
    [-W * 0.48, L * 0.42],
    [W * 0.48, L * 0.42],
    [-W * 0.48, 0],
    [W * 0.48, 0],
    [0, -L * 0.18],
    [0, L * 0.18],
  ];
  for (const [x, z] of small) pads.push({ x, z, kind: 'small', r: 1.7, ready: true, timer: 0 });
  return pads;
}

/** Surface normal pointing out of the surface into the field, or null if airborne. */
export function geometricSurface(car, arena = ARENA) {
  const h = CAR.half;
  const hx = arena.width / 2;
  const hz = arena.length / 2;
  const hy = arena.height;
  const inMouth =
    Math.abs(car.pos.x) < arena.goalWidth / 2 - h.x && car.pos.y < arena.goalHeight - h.y;
  if (car.pos.y <= h.y + 0.14 && car.vel.y <= 1.4) return { x: 0, y: 1, z: 0 };
  if (car.pos.y >= hy - h.y - 0.08) return { x: 0, y: -1, z: 0 };
  if (car.pos.x >= hx - h.x - 0.08) return { x: -1, y: 0, z: 0 };
  if (car.pos.x <= -hx + h.x + 0.08) return { x: 1, y: 0, z: 0 };
  if (!inMouth && car.pos.z >= hz - h.z - 0.08) return { x: 0, y: 0, z: -1 };
  if (!inMouth && car.pos.z <= -hz + h.z + 0.08) return { x: 0, y: 0, z: 1 };
  return null;
}

export function classifyNormal(normal) {
  if (!normal) return 'air';
  const length = Math.hypot(normal.x, normal.y, normal.z);
  if (length < 0.5) return 'air';
  if (normal.y > 0.72) return 'ground';
  if (normal.y < -0.72) return 'ceiling';
  return 'wall';
}
