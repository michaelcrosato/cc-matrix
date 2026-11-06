import { DEG } from '../physics/balancer.js';

export function screenOf(state, maxDeg) {
  const m = Math.max(1e-4, maxDeg) * DEG;
  return { x: state.leanX / m, y: -state.leanZ / m };
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a, b, u) {
  return a + (b - a) * clamp(u, 0, 1);
}
