// The car, drawn with the pen (the 3D engine's code-drawn parts) in the car's own frame, so it turns over in any way.
import { U, cross, add, scale } from '../lib/vec.js';

/** the Coyote: a red muscle car with a white roof, a spoiler and four dark wheels; at (c.p, the car's middle) */
export function drawCar(pen, c, body = '#e0532a', glass = '#f3ede0') {
  const r = cross(c.u, c.f);
  pen.frame(c.p[0], c.p[1], c.p[2], c.f, r, c.u, 1);
  pen.box(0, 0, 0, 4.2 * U, 1.9 * U, .7 * U, body);
  pen.box(-.4 * U, 0, .6 * U, 2.2 * U, 1.6 * U, .6 * U, glass);
  pen.box(-1.9 * U, 0, .55 * U, .5 * U, 2.1 * U, .12 * U, '#1e1e24');
  pen.box(0, 0, .42 * U, 4.25 * U, .22 * U, .08 * U, '#f7f4ea');     // a racing stripe
  // wheels: a tyre, and a spoke that turns with the distance the car has gone (c.spin, radians)
  const spin = c.spin || 0, bob = c.bob || 0;
  for (const [x, y] of [[1.35, -1], [1.35, 1], [-1.35, -1], [-1.35, 1]]) {
    const wx = x * U, wy = y * U, wz = (-.3 + bob) * U, r = .42 * U;
    pen.ball(wx, wy, wz, .45 * U, .45 * U, .45 * U, '#202026');
    pen.tube(wx + Math.cos(spin) * r, wy, wz + Math.sin(spin) * r, wx - Math.cos(spin) * r, wy, wz - Math.sin(spin) * r, .05 * U, '#c9c4b8');
  }
  pen.ball(2.1 * U, -.6 * U, .05 * U, .18 * U, .18 * U, .18 * U, '#fff5c4');
  pen.ball(2.1 * U, .6 * U, .05 * U, .18 * U, .18 * U, .18 * U, '#fff5c4');
  return pen;
}

/** a checkpoint gate across the road at sample T.P[i]: two pillars and a board (red and white for the finish) */
export function drawGate(pen, T, i, finish, time = 0) {
  const P = T.P[i], R = T.R[i], Up = T.U[i], F = T.F[i];
  const o = P.map(v => v * U), r = R, u = Up;
  pen.frame(o[0], o[1], o[2], F, r, u, 1);
  const half = 6.5 * U;
  pen.box(-half, 0, 3 * U, .5 * U, .5 * U, 6 * U, '#f4f1e4');
  pen.box(half, 0, 3 * U, .5 * U, .5 * U, 6 * U, '#f4f1e4');
  const pulse = .5 + .5 * Math.sin(time * 4 + i);   // the board pulses: a checkpoint is live
  const col = finish ? (pulse > .5 ? '#1d1d22' : '#3a3a44') : (pulse > .5 ? '#e7392c' : '#ff8a6a');
  pen.box(0, 0, 6.2 * U, 13 * U, .4 * U, 1.4 * U, col);
  return pen;
}
