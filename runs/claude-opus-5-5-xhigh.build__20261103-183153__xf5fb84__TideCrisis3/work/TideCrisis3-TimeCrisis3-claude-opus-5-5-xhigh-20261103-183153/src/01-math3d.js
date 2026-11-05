/* 01-math3d: vec3 helpers, the camera basis (yaw 0 = east, +pi/2 = south, pitch up, vertical fov), projection and
 * unprojection, aim (view units) <-> rays, ray vs sphere / capsule / box / oriented box, springs. Pure math; no state.
 * View units: ax in [-A, A], ay in [-1, 1], y up, A = the viewport's aspect. */
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
};
TC.V3 = V3;

/** the camera basis for a pose { x, y, z, yaw, pitch, roll, fov } and a viewport of w x h pixels */
function camBasis(cam, w, h, B = {}) {
  const ps = Math.cos(cam.yaw), sn = Math.sin(cam.yaw), ct = Math.cos(cam.pitch || 0), st = Math.sin(cam.pitch || 0);
  B.x = cam.x; B.y = cam.y; B.z = cam.z;
  B.fx = ct * ps; B.fy = ct * sn; B.fz = st;
  let rx = -sn, ry = ps, rz = 0, ux = -st * ps, uy = -st * sn, uz = ct;
  const rl = cam.roll || 0;
  if (rl) { const c = Math.cos(rl), s = Math.sin(rl), nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s; ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s; rx = nrx; ry = nry; rz = nrz; }
  B.rx = rx; B.ry = ry; B.rz = rz; B.ux = ux; B.uy = uy; B.uz = uz;
  B.w = w; B.h = h; B.cx = w / 2; B.cy = h / 2;
  B.fov = (cam.fov || 55) * DEG; B.tanH = Math.tan(B.fov / 2);
  B.F = (h / 2) / B.tanH; B.near = 2;
  return B;
}
/** world point -> [sx, sy, viewZ] (null behind the near plane) */
function project(B, x, y, z) {
  const dx = x - B.x, dy = y - B.y, dz = z - B.z, Z = dx * B.fx + dy * B.fy + dz * B.fz;
  if (Z < B.near) return null;
  const X = dx * B.rx + dy * B.ry + dz * B.rz, Y = dx * B.ux + dy * B.uy + dz * B.uz;
  return [B.cx + X * B.F / Z, B.cy - Y * B.F / Z, Z];
}
/** view-space of a world point [X, Y, Z] */
function toView(B, x, y, z) {
  const dx = x - B.x, dy = y - B.y, dz = z - B.z;
  return [dx * B.rx + dy * B.ry + dz * B.rz, dx * B.ux + dy * B.uy + dz * B.uz, dx * B.fx + dy * B.fy + dz * B.fz];
}
/** aim (view units) -> a world ray { o, d } from the camera pose */
function aimRay(cam, ax, ay) {
  const B = camBasis(cam, 2, 2, {}), t = B.tanH, X = ax * t, Y = ay * t, Z = 1, l = Math.hypot(X, Y, Z);
  const d = [(B.rx * X + B.ux * Y + B.fx * Z) / l, (B.ry * X + B.uy * Y + B.fy * Z) / l, (B.rz * X + B.uz * Y + B.fz * Z) / l];
  return { o: [cam.x, cam.y, cam.z], d };
}
/** world point -> aim (view units) [ax, ay, Z] for a camera pose, or null behind it */
function worldToAim(cam, p) {
  const B = camBasis(cam, 2, 2, TC._wa || (TC._wa = {})), v = toView(B, p[0], p[1], p[2]);
  if (v[2] < 1) return null;
  return [v[0] / v[2] / B.tanH, v[1] / v[2] / B.tanH, v[2]];
}
TC.camBasis = camBasis; TC.project = project; TC.aimRay = aimRay; TC.worldToAim = worldToAim;

/* ---- rays ---- */
function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc; if (disc < 0) return -1;
  const s = Math.sqrt(disc), t = -b - s; return t >= 0 ? t : (-b + s >= 0 ? 0 : -1);
}
function rayCapsule(o, d, a, b, r) {
  // closest approach between the ray and the segment, then a sphere test there (good enough for hit volumes)
  const ba = V3.sub(b, a), oa = V3.sub(o, a), baba = V3.dot(ba, ba), bard = V3.dot(ba, d), baoa = V3.dot(ba, oa), rdoa = V3.dot(d, oa), oaoa = V3.dot(oa, oa);
  const A = baba - bard * bard; let B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba;
  let h = B * B - A * C;
  if (h >= 0 && A > 1e-9) {
    const t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
    if (y > 0 && y < baba && t >= 0) return t;
    const cap = y <= 0 ? a : b, ts = raySphere(o, d, cap, r); return ts;
  }
  const t1 = raySphere(o, d, a, r), t2 = raySphere(o, d, b, r);
  return t1 < 0 ? t2 : t2 < 0 ? t1 : Math.min(t1, t2);
}
/** ray vs axis-aligned box [x0, y0, z0, x1, y1, z1] -> t or -1 */
function rayBox(o, d, bx) {
  let t0 = -1e9, t1 = 1e9;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / (d[i] || 1e-12), ta = (bx[i] - o[i]) * inv, tb = (bx[i + 3] - o[i]) * inv;
    t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
  }
  return t1 >= Math.max(t0, 0) ? Math.max(t0, 0) : -1;
}
/** ray vs a collider { box: [x0..z1] (local, about its centre cx, cy), yaw } */
function rayCollider(o, d, c) {
  if (!c.yaw) return rayBox(o, d, c.box);
  const cs = Math.cos(-c.yaw), sn = Math.sin(-c.yaw), lx = o[0] - c.cx, ly = o[1] - c.cy;
  const lo = [lx * cs - ly * sn + c.cx, lx * sn + ly * cs + c.cy, o[2]], ld = [d[0] * cs - d[1] * sn, d[0] * sn + d[1] * cs, d[2]];
  return rayBox(lo, ld, c.box);
}
TC.raySphere = raySphere; TC.rayCapsule = rayCapsule; TC.rayBox = rayBox; TC.rayCollider = rayCollider;
function pointInCollider(p, c, pad = 0) {
  let x = p[0], y = p[1];
  if (c.yaw) { const cs = Math.cos(-c.yaw), sn = Math.sin(-c.yaw), lx = x - c.cx, ly = y - c.cy; x = lx * cs - ly * sn + c.cx; y = lx * sn + ly * cs + c.cy; }
  const b = c.box; return x > b[0] - pad && x < b[3] + pad && y > b[1] - pad && y < b[4] + pad && p[2] > b[2] - pad && p[2] < b[5] + pad;
}
TC.pointInCollider = pointInCollider;

/* ---- springs and noise for the camera ---- */
function spring(s, target, k, damp, dt) { const a = (target - s.x) * k - s.v * damp; s.v += a * dt; s.x += s.v * dt; return s.x; }
const vnoise = t => { const i = Math.floor(t), f = t - i, h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; const u = f * f * (3 - 2 * f); return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1; };
TC.spring = spring; TC.vnoise = vnoise;
