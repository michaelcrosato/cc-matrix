import { ARENA } from './constants.js';
import { emptyActions } from './input.js';
import { clamp, wrapAngle, yawFromFlatDirection } from './math3.js';

export function aiActions(car, world, cheat) {
  const a = emptyActions();
  if (car.demolished) return a;
  if (cheat) car.boost = 100;

  const ownSign = car.team === 'blue' ? -1 : 1;
  const goalZ = ownSign * (ARENA.length / 2);
  const ball = world.ball.pos;
  let tx = ball.x;
  let tz = ball.z;
  const ballOnOurHalf = (ball.z - goalZ) * -ownSign < ARENA.length * 0.55;
  const weAreGoalSide = Math.abs(car.pos.z - goalZ) < Math.abs(ball.z - goalZ);
  if (ballOnOurHalf && !weAreGoalSide) {
    tx = ball.x * 0.45;
    tz = (ball.z + goalZ) * 0.5;
  } else if (Math.abs(ball.z) < 8) {
    tx = ball.x + (ball.x - car.pos.x) * 0.05;
    tz = ball.z;
  } else {
    const ahead = car.team === 'blue' ? 1.6 : -1.6;
    tx = ball.x;
    tz = ball.z - ahead;
  }

  const toX = tx - car.pos.x;
  const toZ = tz - car.pos.z;
  const desired = yawFromFlatDirection({ x: toX, z: toZ });
  const diff = wrapAngle(desired - car.yaw);
  a.steer = clamp(diff / 0.4, -1, 1);
  a.throttle = Math.abs(diff) < 1.5 ? 1 : 0.25;
  const dist = Math.hypot(ball.x - car.pos.x, ball.z - car.pos.z);
  const aligned = Math.abs(diff) < 0.4;
  a.boost = (cheat || car.boost > 12) && aligned && dist > 10;
  const pulse = Math.sin(world.time * 7) > 0.35;
  const wantJump = car.driveState !== 'air' && ball.y > 2.2 && dist < 7;
  const wantDodge = car.canDodge && dist < 9 && aligned;
  if (wantDodge) {
    a.steer = clamp(diff * 3, -1, 1);
    a.pitch = ball.y > car.pos.y + 1.5 ? 0.15 : -0.85;
  }
  a.jump = pulse && (wantJump || wantDodge);
  if (!aligned && dist < 4) a.throttle = 0.4;
  if (cheat && dist > 6) a.boost = true;
  return a;
}
