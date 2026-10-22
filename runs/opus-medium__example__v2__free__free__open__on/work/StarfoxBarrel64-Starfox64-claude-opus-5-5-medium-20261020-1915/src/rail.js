// Arc-length parameterised rail with a stable frame (tangent / right / up).
import { THREE } from './gfx.js';

const UP = new THREE.Vector3(0, 1, 0);

export class Rail {
  constructor(points, closed = false) {
    this.curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]))), closed, 'centripetal');
    this.curve.arcLengthDivisions = 4000;
    this.closed = closed;
    this.length = this.curve.getLength();
    this.p0 = this.curve.getPointAt(0); this.t0 = this.curve.getTangentAt(0);
    this.p1 = this.curve.getPointAt(1); this.t1 = this.curve.getTangentAt(1);
  }
  // fills out {p,t,r,u}
  frame(s, out) {
    out.p = out.p || new THREE.Vector3(); out.t = out.t || new THREE.Vector3();
    out.r = out.r || new THREE.Vector3(); out.u = out.u || new THREE.Vector3();
    const L = this.length;
    if (this.closed) {
      const u = (((s % L) + L) % L) / L;
      this.curve.getPointAt(u, out.p); this.curve.getTangentAt(u, out.t);
    } else if (s < 0) {
      out.t.copy(this.t0); out.p.copy(this.p0).addScaledVector(this.t0, s);
    } else if (s > L) {
      out.t.copy(this.t1); out.p.copy(this.p1).addScaledVector(this.t1, s - L);
    } else {
      const u = s / L;
      this.curve.getPointAt(u, out.p); this.curve.getTangentAt(u, out.t);
    }
    out.r.crossVectors(out.t, UP).normalize();
    out.u.crossVectors(out.r, out.t).normalize();
    return out;
  }
  // world position of rail-local (s, x, y)
  pos(s, x, y, out = new THREE.Vector3()) {
    const f = this.frame(s, _f);
    return out.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
  }
  // sample points for distance tests
  samples(step = 25) {
    const pts = [];
    for (let s = 0; s <= this.length; s += step) pts.push(this.curve.getPointAt(s / this.length));
    return pts;
  }
}
const _f = {};

// Circle rail that starts at point p heading along tangent t, turning right.
export function circleRail(p, t, radius, segments = 24) {
  const r = new THREE.Vector3().crossVectors(t, UP).normalize();
  const tt = t.clone().setY(0).normalize();
  const c = p.clone().addScaledVector(r, radius);
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(c.clone().addScaledVector(r, -Math.cos(a) * radius).addScaledVector(tt, Math.sin(a) * radius).setY(p.y));
  }
  const rail = new Rail(pts, true);
  rail.center = c; rail.radius = radius;
  return rail;
}
