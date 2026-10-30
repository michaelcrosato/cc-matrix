import { ARENA, BALL } from './constants.js';

export function createBall() {
  return {
    pos: { x: 0, y: BALL.radius, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
  };
}

export function inGoalMouth(ball, arena = ARENA) {
  return Math.abs(ball.pos.x) < arena.goalWidth / 2 && ball.pos.y < arena.goalHeight && ball.pos.y > 0;
}

/** Blue scores in the +Z goal. Orange scores in the −Z goal. */
export function detectScorer(ball, arena = ARENA) {
  if (!inGoalMouth(ball, arena)) return null;
  if (ball.pos.z > arena.length / 2) return 'blue';
  if (ball.pos.z < -arena.length / 2) return 'orange';
  return null;
}

export function resolveBallArena(ball, arena = ARENA) {
  const r = BALL.radius;
  const hx = arena.width / 2;
  const hz = arena.length / 2;
  const hy = arena.height;
  const rest = BALL.restitution;

  if (ball.pos.y < r) {
    ball.pos.y = r;
    if (ball.vel.y < 0) ball.vel.y *= -rest;
  }
  if (ball.pos.y > hy - r) {
    ball.pos.y = hy - r;
    if (ball.vel.y > 0) ball.vel.y *= -rest;
  }
  if (ball.pos.x > hx - r) {
    ball.pos.x = hx - r;
    if (ball.vel.x > 0) ball.vel.x *= -rest;
  } else if (ball.pos.x < -hx + r) {
    ball.pos.x = -hx + r;
    if (ball.vel.x < 0) ball.vel.x *= -rest;
  }

  resolveEnd(ball, arena, 1, rest);
  resolveEnd(ball, arena, -1, rest);
  return ball;
}

function resolveEnd(ball, arena, sign, rest) {
  const r = BALL.radius;
  const goalPlane = sign * (arena.length / 2);
  const back = sign * (arena.length / 2 + arena.goalDepth);
  const crossed = sign > 0 ? ball.pos.z > goalPlane - r : ball.pos.z < goalPlane + r;
  if (!crossed) return;
  if (inGoalMouth(ball, arena)) {
    const pastBack = sign > 0 ? ball.pos.z > back - r : ball.pos.z < back + r;
    if (pastBack) {
      ball.pos.z = back - sign * r;
      if (sign > 0 && ball.vel.z > 0) ball.vel.z *= -rest;
      if (sign < 0 && ball.vel.z < 0) ball.vel.z *= -rest;
    }
    return;
  }
  const limit = goalPlane - sign * r;
  const through = sign > 0 ? ball.pos.z > limit : ball.pos.z < limit;
  if (through) {
    ball.pos.z = limit;
    if (sign > 0 && ball.vel.z > 0) ball.vel.z *= -rest;
    if (sign < 0 && ball.vel.z < 0) ball.vel.z *= -rest;
  }
}

export function stepBall(ball, dt, arena = ARENA) {
  ball.vel.y += arena.gravity * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;
  resolveBallArena(ball, arena);
  const sp = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
  if (sp > BALL.maxSpeed) {
    const s = BALL.maxSpeed / sp;
    ball.vel.x *= s;
    ball.vel.y *= s;
    ball.vel.z *= s;
  }
  return ball;
}
