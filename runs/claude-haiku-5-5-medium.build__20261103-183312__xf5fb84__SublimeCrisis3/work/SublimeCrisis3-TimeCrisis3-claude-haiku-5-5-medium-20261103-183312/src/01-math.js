// 01-math.js: vectors, the camera basis (plan 3.3: x east, y south, z up; yaw 0 = east), ray tests against boxes and
// spheres, and the view-unit aim model. Pure functions: the sim, the renderer and the tests all use them.
TC.V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// The camera basis for yaw psi and pitch theta (plan 3.3). Returns { f, r, u } as vectors.
TC.basis = function (yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return {
    f: [cp * cy, cp * sy, sp],
    r: [-sy, cy, 0],
    u: [-sp * cy, -sp * sy, cp],
  };
};

// The ray for an aim (ax, ay) in view units from a camera pose {yaw, pitch, fov}: direction in world space.
// ax spans [-aspect, aspect] and ay [-1, 1]; a point at (ax, ay) is where the reticle draws.
TC.aimRay = function (cam, ax, ay) {
  const b = TC.basis(cam.yaw, cam.pitch);
  const t = Math.tan((cam.fov * Math.PI / 180) / 2);
  const d = [
    b.f[0] + b.r[0] * ax * t + b.u[0] * ay * t,
    b.f[1] + b.r[1] * ax * t + b.u[1] * ay * t,
    b.f[2] + b.r[2] * ax * t + b.u[2] * ay * t,
  ];
  return TC.V.norm(d);
};

// Ray (o, d) against an axis-aligned box [x0,y0,z0,x1,y1,z1]. Returns the entry distance, or -1 when it misses. A ray
// that starts inside the box returns 0.
TC.rayBox = function (o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    const lo = b[i], hi = b[i + 3];
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo || o[i] > hi) return -1;
    } else {
      let t1 = (lo - o[i]) / d[i], t2 = (hi - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
  }
  if (tmax < 0) return -1;
  return tmin < 0 ? 0 : tmin;
};

// Ray against a sphere (centre c, radius r). Returns the entry distance or -1.
TC.raySphere = function (o, d, c, r) {
  const m = TC.V.sub(o, c);
  const b = TC.V.dot(m, d);
  const cc = TC.V.dot(m, m) - r * r;
  if (cc > 0 && b > 0) return -1;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? 0 : t;
};

// Project a world point to view units for a camera pose and a viewport aspect. Returns [ax, ay, depth] or null when
// the point is behind the camera. ax in [-aspect, aspect], ay in [-1, 1] when on screen.
TC.toView = function (cam, p, aspect) {
  const b = TC.basis(cam.yaw, cam.pitch);
  const d = TC.V.sub(p, [cam.x, cam.y, cam.z]);
  const z = TC.V.dot(d, b.f);
  if (z <= 0.5) return null;
  const t = Math.tan((cam.fov * Math.PI / 180) / 2);
  return [TC.V.dot(d, b.r) / (z * t), TC.V.dot(d, b.u) / (z * t), z];
};

// Angle of a ground vector (dx, dy) in radians, 0 = east, pi/2 = south.
TC.angleOf = (dx, dy) => Math.atan2(dy, dx);
