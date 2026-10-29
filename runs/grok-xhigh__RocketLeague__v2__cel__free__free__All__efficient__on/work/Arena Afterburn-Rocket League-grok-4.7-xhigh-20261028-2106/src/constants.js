/** Shared scale for the arena, cars, ball, and match clock. Meters, Y up. */

export const ARENA = {
  length: 102,
  width: 74,
  height: 22,
  goalWidth: 18.6,
  goalHeight: 6.6,
  goalDepth: 8.5,
  gravity: -14.5,
};

export const BALL = {
  radius: 1.2,
  restitution: 0.64,
  maxSpeed: 46,
};

export const CAR = {
  half: { x: 0.95, y: 0.42, z: 1.45 },
  hitRadius: 1.55,
  gravity: -14.5,
  throttleAccel: 34,
  brakeAccel: 48,
  boostAccel: 28,
  boostDrain: 33.3,
  boostMax: 100,
  boostStart: 34,
  smallPad: 12,
  driveMax: 23.5,
  boostMaxSpeed: 33,
  supersonic: 26.5,
  steerRate: 2.85,
  jumpSpeed: 7.6,
  dodgeSpeed: 11.2,
  dodgeUp: 3.5,
  dodgeWindow: 1.45,
  demoRespawn: 3,
  lateralGrip: 12,
  slideGrip: 2.4,
};

export const MATCH = {
  countdown: 3,
  goalPause: 2.4,
  defaultDuration: 150,
};

export const ATTRACT_DELAY = 10;
