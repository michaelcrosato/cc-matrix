// CRACKMANIA cars drawn with the pen (PLAN §7.3): COYOTE (muscle coupe), PEBBLE (rally hatch), MOOSE (boxy 4x4), in any
// orientation (pen.frame, engine change E1), metres in the car's frame (x ahead, y right, z up). Paint: body, accent,
// pattern (8), pattern colour, number, rims, helmet. Ghosts: the same parts translucent (pen.ghost, E3), paler
import { CFG } from '../config.js';
import { DOTS } from '../track/view.js';
import { rotate, add, mul, cross, norm } from '../lib/v3.js';
const U = 16;
export const PATTERNS = ['SOLID', 'TWIN STRIPES', 'SIDE STRIPE', 'CHECKER ROOF', 'FLAMES', 'LIGHTNING', 'NUMBER PANEL', 'TWO-TONE'];
export const SWATCHES = ['#e8402a', '#ff7a1a', '#ffc21a', '#f4e84a', '#9ae03a', '#3ac850', '#1a9a6a', '#2ad0c0', '#3ab0f0', '#2a6ae8', '#3a3ac8', '#7a4ae8',
  '#b84ae0', '#e84ab0', '#ff8aa8', '#f4f4f4', '#c8c8d0', '#8a8a98', '#4a4a58', '#1a1a22', '#8a5a32', '#c8a070', '#5a7a3a', '#a01a2a'];
export const RIMS = ['#d8d8e0', '#2a2a30', '#ffc21a', '#e8402a', '#3ab0f0', '#f4f4f4'];
export const DEFAULT_PAINT = {
  coyote: { body: '#e8402a', accent: '#f4f4f4', pattern: 1, patternColor: '#f4f4f4', number: 7, rims: 0, helmet: '#ffc21a' },
  pebble: { body: '#3ab0f0', accent: '#f4f4f4', pattern: 2, patternColor: '#ffc21a', number: 23, rims: 5, helmet: '#e8402a' },
  moose: { body: '#3ac850', accent: '#1a1a22', pattern: 7, patternColor: '#f4f4f4', number: 44, rims: 1, helmet: '#ff7a1a' }
};
const _ghostCache = new Map();
const pale = c => { let v = _ghostCache.get(c); if (!v) { const n = parseInt(c.slice(1), 16), m = k => Math.round(k + (255 - k) * .45); v = '#' + ((1 << 24) | (m(n >> 16 & 255) << 16) | (m(n >> 8 & 255) << 8) | m(n & 255)).toString(16).slice(1); _ghostCache.set(c, v); } return v; };
const GLASS = '#1a2a3a', CHROME = '#d8dce8', TYRE = '#1c1c20', DARK = '#2a2a30', LIGHT = '#fff6d0', RED = '#c81a1a';

/** a car's pose to draw: { p, f, r, u (world metres), steer (radians), spin (wheel angle), d: [4] suspension lengths,
 *  brake, boost, lights, lean: [pitch, roll], kmh } */
export function drawCar(pen, model, pose, paint, o = {}) {
  const C = CFG.cars[model], g = !!o.ghost;
  pen.ghost = g;
  const col = c => g ? pale(c) : c;
  const P = paint || DEFAULT_PAINT[model];
  const { p, f, r, u } = pose;
  // the body leans a little with the acceleration (on top of the physics' frame)
  const [lp, lr] = pose.lean || [0, 0];
  let bf = f, bu = u;
  if (lp) { bf = rotate(f, r, -lp); bu = rotate(u, r, -lp); }
  if (lr) { bu = rotate(bu, bf, lr); }
  const br = cross(bu, bf), k = o.scale || 1;
  pen.frame(p[0] * U, p[1] * U, p[2] * U, bf, br, bu, U * k);
  const body = col(P.body), acc = col(P.accent), pat = col(P.patternColor), rim = col(RIMS[P.rims] || RIMS[0]);
  const z0 = -C.ride + C.wheelR * .55;   // the body's bottom
  if (model === 'coyote') coyote(pen, C, z0, body, acc, pat, P, col, pose, g);
  else if (model === 'pebble') pebble(pen, C, z0, body, acc, pat, P, col, pose, g);
  else moose(pen, C, z0, body, acc, pat, P, col, pose, g);
  // the driver: a helmet behind the windscreen
  const hx = model === 'coyote' ? -.35 : model === 'pebble' ? -.15 : -.1, hz = z0 + C.H - (model === 'moose' ? .55 : .42);
  pen.ball(hx, -.32, hz, .2, .19, .2, col(P.helmet)).box(hx + .14, -.32, hz + .01, .06, .3, .1, col('#202838'));
  // wheels in the unleaned frame
  pen.frame(p[0] * U, p[1] * U, p[2] * U, f, r, u, U * k);
  const wb = C.wheelbase / 2, tr = C.track / 2 + (model === 'moose' ? .08 : .02), R = C.wheelR, wide = model === 'coyote' ? [.26, .36] : model === 'moose' ? [.36, .36] : [.24, .24];
  const d = pose.d || [C.ride, C.ride, C.ride, C.ride];
  for (let i = 0; i < 4; i++) {
    const front = i < 2, side = i % 2 ? 1 : -1, x = front ? wb : -wb, y = side * tr, dz = Math.max(C.ride - .22, Math.min(C.ride + .28, d[i]));
    const z = -dz + R, w = front ? wide[0] : wide[1], st = front ? pose.steer || 0 : 0, cs = Math.cos(st), sn = Math.sin(st);
    // the tyre: a short tube across the car (turned by the steering)
    const ax = -sn * w / 2, ay = cs * w / 2;
    pen.tube(x - ax, y - ay, z, x + ax, y + ay, z, R, col(TYRE));
    // the rim and two spokes turning with the wheel
    const ox = x + ax * 1.06 * side, oy = y + ay * 1.06 * side, sp = pose.spin || 0;
    pen.tube(x + ax * .9 * side, y + ay * .9 * side, z, ox, oy, z, R * .62, rim);
    for (let s = 0; s < 2; s++) { const a = sp + s * Math.PI / 2, c = Math.cos(a) * R * .55, e = Math.sin(a) * R * .55; pen.slab(ox - c * cs, oy - c * sn * 0, z - e, ox + c * cs, oy, z + e, -sn, cs, 0, .04, .08, col(DARK)); }
    if (model === 'moose') for (let kk = 0; kk < 6; kk++) { const a = sp + kk * Math.PI / 3; pen.box(x + Math.cos(a) * R * .98 * cs, y + Math.cos(a) * R * .98 * sn, z + Math.sin(a) * R * .98, .12, w * 1.02, .1, col(TYRE)); }   // knobbly treads
  }
  pen.ghost = false;
}
function lightsAndExhaust(pen, C, z0, col, pose, g, front, back, pipes) {
  // headlights (glow at night or when told), brake lights, the exhaust flame while boosting
  for (const sd of [-1, 1]) {
    pen.box(front[0], sd * front[1], front[2], .08, .34, .2, col(LIGHT));
    if (pose.lights && !g) pen.glow(front[0] + .1, sd * front[1], front[2], .32, '#fff4c0');
    pen.box(back[0], sd * back[1], back[2], .08, .36, .16, pose.brake ? col('#ff3020') : col(RED));
    if (pose.brake && !g) pen.glow(back[0] - .08, sd * back[1], back[2], .22, '#ff3020');
  }
  for (const [px2, py, pz] of pipes) {
    pen.tube(px2 + .25, py, pz, px2 - .05, py, pz, .065, col(CHROME));
    if (pose.boost && !g) { const fl = .55 + Math.sin(pose.t * 50 + py) * .2; pen.glow(px2 - .25, py, pz, .14 + fl * .12, '#ffd060').cone(px2 - .05, py, pz, px2 - .45 - fl * .5, py, pz, .09, '#ff8a20'); }
  }
}
function numberOn(pen, P, col, x, y, z, s, side, colr) {
  const txt = String(P.number ?? 0).padStart(2, '0');
  for (let i = 0; i < txt.length; i++) { const gph = DOTS[txt[i]]; for (let rr = 0; rr < 5; rr++) for (let c2 = 0; c2 < 3; c2++) if (gph[rr * 3 + c2] === '1') pen.box(x + (side > 0 ? -1 : 1) * (i * 4 + c2 - 3) * s, y, z + (2 - rr) * s, s * .9, .02, s * .9, colr); }
}
function roofNumber(pen, P, col, x, z, s, colr) {
  const txt = String(P.number ?? 0).padStart(2, '0');
  for (let i = 0; i < txt.length; i++) { const gph = DOTS[txt[i]]; for (let rr = 0; rr < 5; rr++) for (let c2 = 0; c2 < 3; c2++) if (gph[rr * 3 + c2] === '1') pen.box(x + (2 - rr) * s, (i * 4 + c2 - 3) * s, z, s * .9, s * .9, .02, colr); }
}
/** the pattern's parts over a body: L long, W wide, top z, side faces at +-W/2 */
function pattern(pen, P, pat, acc, L, W, zTop, zMid, x0, roofX, roofL) {
  const k = P.pattern | 0;
  if (k === 1) for (const sd of [-1, 1]) pen.box(x0, sd * .2, zTop + .012, L * .98, .16, .02, pat);   // twin stripes
  else if (k === 2) for (const sd of [-1, 1]) pen.box(x0, sd * (W / 2 + .012), zMid, L * .9, .02, .14, pat);   // side stripe
  else if (k === 3) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) & 1) pen.box(roofX - roofL / 2 + (i + .5) * roofL / 4, -W * .36 + (j + .5) * W * .18, zTop + .45, roofL / 4, W * .18, .02, pat);   // checker roof
  else if (k === 4) for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) pen.slab(x0 + L * .45 - i * .32, sd * (W / 2 + .012), zMid - .12, x0 + L * .45 - i * .32 - .7, sd * (W / 2 + .012), zMid + .12 + (i % 2) * .1, 0, 0, 1, .02, .16 - i * .02, i % 2 ? acc : pat);   // flames
  else if (k === 5) for (const sd of [-1, 1]) { const pts = [[.9, .12], [.3, -.1], [-.1, .14], [-.7, -.12]]; for (let i = 0; i < 3; i++) pen.slab(x0 + pts[i][0], sd * (W / 2 + .012), zMid + pts[i][1], x0 + pts[i + 1][0], sd * (W / 2 + .012), zMid + pts[i + 1][1], 0, 1, 0, .02, .1, pat); }   // lightning
  else if (k === 6) for (const sd of [-1, 1]) pen.box(x0 - .1, sd * (W / 2 + .01), zMid, .9, .02, .5, pat);   // number panel
  else if (k === 7) pen.box(x0, 0, zMid - .14, L * 1.002, W * 1.004, .22, pat);   // two-tone: a lower band
}
function coyote(pen, C, z0, body, acc, pat, P, col, pose, g) {
  const L = C.L, W = C.W;
  // the long low body, its raised hood and scoop, the fastback cabin
  pen.box(0, 0, z0 + .3, L, W, .6, body);
  pen.box(1.15, 0, z0 + .68, 1.9, W * .86, .18, body).box(1.25, 0, z0 + .84, .7, .5, .16, col(DARK)).box(1.25, 0, z0 + .84, .6, .4, .18, body);
  pen.slab(.25, 0, z0 + .62, -.3, 0, z0 + 1.14, 0, 1, 0, W * .82, .1, col(GLASS));   // windscreen
  pen.box(-.55, 0, z0 + 1.14, .7, W * .78, .1, body);   // roof
  pen.slab(-.9, 0, z0 + 1.12, -1.75, 0, z0 + .66, 0, 1, 0, W * .8, .1, col(GLASS));   // fastback glass
  for (const sd of [-1, 1]) pen.slab(.15, sd * W * .41, z0 + .66, -.85, sd * W * .41, z0 + 1.08, 1, 0, 0, .7, .05, col(GLASS));   // side windows
  pen.box(-1.9, 0, z0 + .7, .5, W * .9, .1, body).box(-2.12, 0, z0 + .78, .1, W * .92, .14, acc);   // the tail and a ducktail
  pen.box(2.22, 0, z0 + .16, .12, W * 1.02, .14, col(CHROME)).box(-2.22, 0, z0 + .16, .12, W * 1.02, .14, col(CHROME));   // bumpers
  pen.box(2.17, 0, z0 + .38, .06, W * .5, .18, col(DARK));   // grille
  for (const sd of [-1, 1]) pen.box(1.35, sd * (W / 2 + .03), z0 + .5, .5, .06, .3, col(DARK));   // vents
  pattern(pen, P, pat, acc, L, W, z0 + .78, z0 + .34, 0, -.55, .7);
  if ((P.pattern | 0) !== 3) roofNumber(pen, P, col, -.5, z0 + 1.2, .07, col(P.pattern === 0 ? acc : pat));
  if ((P.pattern | 0) === 6 || (P.pattern | 0) === 1) for (const sd of [-1, 1]) numberOn(pen, P, col, -.1, sd * (W / 2 + .025), z0 + .34, .07, sd, col('#1a1a22'));
  lightsAndExhaust(pen, C, z0, col, pose, g, [2.2, W * .34, z0 + .4], [-2.22, W * .36, z0 + .48], [[-2.1, .5, z0 + .05], [-2.1, -.5, z0 + .05], [.8, W / 2 + .06, z0 + .04], [.8, -W / 2 - .06, z0 + .04]]);
}
function pebble(pen, C, z0, body, acc, pat, P, col, pose, g) {
  const L = C.L, W = C.W;
  pen.box(0, 0, z0 + .38, L, W, .76, body);
  pen.slab(1.0, 0, z0 + .78, .45, 0, z0 + 1.28, 0, 1, 0, W * .84, .1, col(GLASS));   // windscreen
  pen.box(-.35, 0, z0 + 1.26, 1.6, W * .84, .1, body).box(-.25, 0, z0 + 1.36, .5, .5, .12, col(DARK));   // roof + vent
  for (const sd of [-1, 1]) pen.slab(.85, sd * W * .43, z0 + .8, -1.0, sd * W * .43, z0 + 1.2, 1, 0, 0, .45, .05, col(GLASS));
  pen.box(-1.2, 0, z0 + .8, .1, W * .82, .46, col(GLASS));   // the hatch's window
  pen.box(-1.45, 0, z0 + 1.45, .4, W * 1.0, .06, acc).box(-1.4, -.6, z0 + 1.3, .08, .06, .3, col(DARK)).box(-1.4, .6, z0 + 1.3, .08, .06, .3, col(DARK));   // rally wing
  pen.box(1.92, 0, z0 + .2, .1, W * 1.02, .16, col(DARK)).box(-1.92, 0, z0 + .2, .1, W * 1.02, .16, col(DARK));
  // four-lamp pod on the bonnet
  pen.box(1.55, 0, z0 + .82, .2, 1.2, .2, col(DARK)); for (let i = 0; i < 4; i++) { pen.ball(1.67, -.45 + i * .3, z0 + .82, .06, .12, .12, col(LIGHT)); if (pose.lights && !g) pen.glow(1.75, -.45 + i * .3, z0 + .82, .16, '#fff4c0'); }
  for (const sd of [-1, 1]) pen.box(-1.65, sd * W * .42, z0 - .02, .04, .3, .34, col(DARK));   // mud flaps
  if ((P.pattern | 0) === 2 || (P.pattern | 0) === 0) for (const sd of [-1, 1]) pen.slab(1.3, sd * (W / 2 + .012), z0 + .2, -.4, sd * (W / 2 + .012), z0 + .7, 0, 1, 0, .02, .26, P.pattern ? pat : acc);   // the diagonal livery slab
  else pattern(pen, P, pat, acc, L, W, z0 + .78, z0 + .42, 0, -.35, 1.6);
  roofNumber(pen, P, col, -.6, z0 + 1.32, .07, col('#1a1a22'));
  for (const sd of [-1, 1]) numberOn(pen, P, col, -.2, sd * (W / 2 + .025), z0 + .46, .07, sd, col('#1a1a22'));
  lightsAndExhaust(pen, C, z0, col, pose, g, [1.92, W * .36, z0 + .5], [-1.92, W * .38, z0 + .6], [[-1.8, .5, z0 + .05]]);
}
function moose(pen, C, z0, body, acc, pat, P, col, pose, g) {
  const L = C.L, W = C.W;
  pen.box(0, 0, z0 + .42, L, W, .84, body);
  pen.box(-.35, 0, z0 + 1.2, 2.5, W * .94, .72, body);
  pen.box(.95, 0, z0 + 1.2, .08, W * .84, .56, col(GLASS));   // windscreen (upright)
  for (const sd of [-1, 1]) pen.box(-.35, sd * (W * .47 + .01), z0 + 1.24, 2.2, .04, .46, col(GLASS));
  // roll bar, roof rack with lamps
  for (const x of [-.2, -1.2]) pen.tube(x, -W * .44, z0 + 1.56, x, W * .44, z0 + 1.56, .05, col(DARK));
  pen.box(-.7, 0, z0 + 1.66, 1.6, W * .9, .06, col(DARK));
  for (let i = 0; i < 3; i++) { pen.ball(.2, -.5 + i * .5, z0 + 1.76, .1, .12, .12, col(LIGHT)); if (pose.lights && !g) pen.glow(.32, -.5 + i * .5, z0 + 1.76, .2, '#fff4c0'); }
  pen.tube(-2.15, 0, z0 + .78, -2.33, 0, z0 + .78, .4, col(TYRE)).tube(-2.33, 0, z0 + .78, -2.36, 0, z0 + .78, .24, col(RIMS[P.rims] || RIMS[1]));   // spare wheel
  pen.tube(.72, W * .5, z0 + .6, .72, W * .5, z0 + 1.7, .07, col(DARK));   // snorkel
  pen.box(2.1, 0, z0 + .22, .14, W * 1.06, .22, col(DARK)).box(-2.08, 0, z0 + .22, .14, W * 1.06, .22, col(DARK));
  pen.box(2.12, 0, z0 + .55, .06, W * .7, .3, acc);   // the grille guard
  pattern(pen, P, pat, acc, L, W, z0 + .84, z0 + .46, 0, -.35, 2.4);
  if ((P.pattern | 0) !== 3) roofNumber(pen, P, col, -1.15, z0 + 1.6, .065, col(acc));
  for (const sd of [-1, 1]) numberOn(pen, P, col, -.1, sd * (W / 2 + .025), z0 + .5, .075, sd, col(P.pattern === 7 ? body : '#1a1a22'));
  lightsAndExhaust(pen, C, z0, col, pose, g, [2.1, W * .38, z0 + .66], [-2.1, W * .42, z0 + .72], [[-1.98, .55, z0 + .04]]);
}
