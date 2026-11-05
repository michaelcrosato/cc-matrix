// Craft built from code (§3.7, §4.1): lofted hulls, canopies, wings, fins, engine pods, hinged airbrake flaps, liveries
// in vertex colours, engine glow, shield shell. Local frame (metres): x forward (nose +3), y up, z right
(() => {
const SN = globalThis.SN, E = My3D2dge;
const DESIGNS = {
  fjord:     { w: [2, 9, 14, 16, 14, 10], h: [2, 6, 9, 9, 8, 6], span: 24, sweep: 40, fins: 2, finH: 10, cant: 20, eng: 2, er: 5 },
  anvil:     { w: [10, 16, 18, 18, 18, 16], h: [3, 6, 7, 7, 7, 6], span: 22, sweep: 10, fins: 0, eng: 3, er: 4, pods: true },
  tsubame:   { w: [1, 6, 10, 12, 10, 8], h: [2, 5, 7, 8, 7, 5], span: 26, sweep: 50, fins: 1, finH: 14, eng: 1, er: 7, canards: true },
  saetta:    { w: [1, 4, 8, 12, 14, 12], h: [1, 4, 6, 8, 9, 8], span: 20, sweep: 30, fins: 2, finH: 6, cant: 10, eng: 1, er: 9, rearWing: true },
  volcan:    { w: [3, 6, 7, 7, 7, 5], h: [2, 5, 7, 7, 6, 5], span: 24, sweep: 0, fins: 2, finH: 8, eng: 2, er: 7, booms: true },
  ghostline: { w: [4, 12, 18, 20, 20, 18], h: [2, 4, 6, 6, 5, 3], span: 0, sweep: 0, fins: 0, eng: 2, er: 0, slots: true, facet: true }
};
SN.DESIGNS = DESIGNS;
const M = 1 / 16;   // units -> metres

/** geometry builder: triangles with per-vertex colours, flat shaded */
function Geo() { this.p = []; this.c = []; }
Geo.prototype.tri = function (a, b, c, col) { this.p.push(...a, ...b, ...c); const k = SN.col3(col); for (let i = 0; i < 3; i++) this.c.push(k[0], k[1], k[2]); };
Geo.prototype.quad = function (a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); };
Geo.prototype.box = function (cx, cy, cz, sx, sy, sz, col, colTop) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, t = colTop || col;
  this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], t); this.quad([x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], col);
  this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], col); this.quad([x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], col);
  this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], col); this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], col);
};
/** a cylinder along x from x0 to x1 */
Geo.prototype.cyl = function (x0, x1, cy, cz, r0, r1, col, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
    const p = (x, r, t) => [x, cy + Math.sin(t) * r, cz + Math.cos(t) * r];
    this.quad(p(x0, r0, a), p(x1, r1, a), p(x1, r1, b), p(x0, r0, b), col);
  }
};
Geo.prototype.build = function () {
  const THREE = E.THREE, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  g.computeVertexNormals(); return g;
};
SN.Geo = Geo;
const _cc = new Map();
/** '#rrggbb' -> linear [r, g, b] */
SN.col3 = hex => { if (Array.isArray(hex)) return hex; let v = _cc.get(hex); if (!v) { const c = new E.THREE.Color(hex); v = [c.r, c.g, c.b]; _cc.set(hex, v); } return v; };

/** the hull, wings and fins of one design in one livery: { body, flapL, flapR, engines: [[x, y, z, r]], len } */
function craftGeometry(design, colors, o = {}) {
  const D = DESIGNS[design], [prim, sec, acc, glow] = colors, g = new Geo(), L = 96 * M, champion = o.champion;
  const trim = champion ? '#ffd23f' : acc;
  const sect = (f, w, h, zc = 0) => {   // an octagon cross-section at fraction f (nose 0 .. tail 1)
    const x = L / 2 - L * f, pts = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8, cz = Math.cos(a), sy = Math.sin(a); pts.push([x, (sy > 0 ? sy * h * M : sy * h * M * .45) + 6 * M, zc + cz * w * M]); }
    return pts;
  };
  const loft = (ws, hs, zc = 0, cols) => {
    const S = ws.map((w, k) => sect(k / (ws.length - 1), w, hs[k], zc));
    for (let k = 0; k < S.length - 1; k++) for (let j = 0; j < 8; j++) {
      const a = S[k][j], b = S[k][(j + 1) % 8], c = S[k + 1][(j + 1) % 8], d = S[k + 1][j];
      const top = j < 4 ? 1 : 0, band = k === 2 || (D.facet && (k + j) % 3 === 0);
      g.quad(a, d, c, b, cols ? cols(k, j) : band && top ? sec : top ? prim : SN.shade(prim, -.35));
    }
    const tail = S[S.length - 1], cx = tail[0][0], cy = 6 * M; for (let j = 0; j < 8; j++) g.tri([cx, cy, zc], tail[(j + 1) % 8], tail[j], SN.shade(prim, -.5));
    const nose = S[0]; for (let j = 0; j < 8; j++) g.tri([L / 2 + 1 * M, 6 * M, zc], nose[j], nose[(j + 1) % 8], prim);
  };
  if (D.booms) {   // a catamaran: two booms and a centre pod
    for (const s of [-1, 1]) loft([2, 5, 6, 6, 6, 5], [2, 5, 6, 6, 6, 5], s * 15 * M);
    loft([1, 6, 7, 7, 5, 2], [2, 6, 8, 8, 6, 3], 0);
  } else loft(D.w, D.h);
  // canopy: a dark glossy wedge with a bright rim
  const cf = D.booms ? .25 : .3, cx = L / 2 - L * cf, cw = Math.max(3, (D.booms ? 6 : D.w[1]) * .5) * M, ch = (D.booms ? 8 : D.h[2]) * M + 6 * M;
  g.quad([cx + 10 * M, ch - 2 * M, -cw * .4], [cx + 10 * M, ch - 2 * M, cw * .4], [cx - 14 * M, ch + 2.5 * M, cw], [cx - 14 * M, ch + 2.5 * M, -cw], '#14182a');
  g.tri([cx - 14 * M, ch + 2.5 * M, cw], [cx - 26 * M, ch - 1 * M, cw * 1.1], [cx - 14 * M, ch + 2.5 * M, -cw], '#1a2038');
  g.tri([cx - 14 * M, ch + 2.5 * M, -cw], [cx - 26 * M, ch - 1 * M, cw * 1.1], [cx - 26 * M, ch - 1 * M, -cw * 1.1], '#1a2038');
  // wings
  if (D.span) {
    const sw = Math.tan(D.sweep * Math.PI / 180), rootX = D.rearWing ? -L * .2 : L * .05, rootL = L * .42, y = 5 * M;
    for (const s of [-1, 1]) {
      const tipX = rootX - D.span * M * sw - rootL * .3, tz = s * D.span * M, rz = s * ((D.booms ? 15 : D.w[3] * .8)) * M;
      g.tri([rootX, y, rz], [rootX - rootL, y, rz], [tipX, y + 1 * M, tz], sec); g.tri([rootX, y - .5 * M, rz], [tipX, y + .5 * M, tz], [rootX - rootL, y - .5 * M, rz], SN.shade(sec, -.4));
      g.box(tipX - 4 * M, y + 1.5 * M, tz, 12 * M, 3 * M, 2 * M, trim);
    }
  }
  if (D.canards) for (const s of [-1, 1]) g.tri([L * .32, 5 * M, s * 3 * M], [L * .18, 5 * M, s * 3 * M], [L * .2, 5 * M, s * 10 * M], sec);
  if (D.pods) for (const s of [-1, 1]) { g.cyl(L / 2 - 2 * M, L / 2 - 40 * M, 5 * M, s * 14 * M, 2 * M, 5 * M, sec); g.box(L / 2 - 4 * M, 5 * M, s * 14 * M, 4 * M, 3 * M, 3 * M, trim); }
  // fins
  for (let k = 0; k < (D.fins || 0); k++) {
    const s = D.fins === 1 ? 0 : k ? 1 : -1, z = (D.booms ? 15 : D.fins === 1 ? 0 : 6) * s * M, can = (D.cant || 0) * Math.PI / 180 * s, top = D.finH * M;
    const bx = -L / 2 + 4 * M, fx = -L * .1, yb = 10 * M;
    g.tri([fx, yb, z], [bx, yb, z], [bx - 4 * M, yb + top * Math.cos(can), z + top * Math.sin(can)], sec);
    g.tri([fx, yb, z], [bx - 4 * M, yb + top * Math.cos(can), z + top * Math.sin(can)], [bx, yb, z], sec);
    g.box(bx - 4 * M, yb + top * Math.cos(can), z + top * Math.sin(can), 6 * M, 1.5 * M, 1.5 * M, trim);
  }
  // engine pods
  const engines = [], ex = -L / 2;
  if (D.slots) for (const s of [-1, 1]) { g.box(ex + 6 * M, 6 * M, s * 8 * M, 12 * M, 3 * M, 14 * M, SN.shade(prim, -.2)); engines.push([ex, 6 * M, s * 8 * M, 3 * M, 'slot']); }
  else {
    const zs = D.eng === 1 ? [0] : D.eng === 2 ? (D.booms ? [-15, 15] : [-7, 7]) : [-12, 0, 12];
    for (const z of zs) { g.cyl(ex + 22 * M, ex - 2 * M, 7 * M, z * M, D.er * .8 * M, D.er * M, '#3a3c44', 10); engines.push([ex - 2.2 * M, 7 * M, z * M, D.er * .8 * M]); }
  }
  // the race number plate and the stripe
  g.box(L * .05, (D.h[2] + 6.2) * M, 0, 10 * M, .4 * M, 6 * M, trim);
  const body = g.build();
  const flap = () => { const f = new Geo(); f.box(-4 * M, 0, 0, 8 * M, 1 * M, 7 * M, sec, trim); return f.build(); };
  return { body, flap: flap(), engines, len: L, flapZ: (D.booms ? 18 : Math.max(8, D.w[5] * .9)) * M, flapX: -L / 2 + 6 * M, flapY: 8 * M, glow };
}

/** materials shared by every craft (made with the world: no shader built mid-race) */
function materials() {
  const THREE = E.THREE;
  return {
    hull: new THREE.MeshToonNodeMaterial({ vertexColors: true }),
    ghost: new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }),
    glow: new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }),
    shell: new THREE.MeshBasicNodeMaterial({ color: '#7ac8ff', transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  };
}
/** one craft's visual: a group with hull, flaps, engine glows and shield shell */
function makeCraft(world, team, mats, o = {}) {
  const THREE = E.THREE, T = SN.TEAM[team], geo = craftGeometry(T.design, o.colors || T.colors, o), grp = new THREE.Group();
  const own = x => world._own(x);
  own(geo.body); own(geo.flap);
  const body = new THREE.Mesh(geo.body, o.ghost ? mats.ghost : mats.hull); body.castShadow = !o.ghost; grp.add(body);
  const flaps = [-1, 1].map(s => { const pivot = new THREE.Group(); pivot.position.set(geo.flapX, geo.flapY, s * geo.flapZ); const m = new THREE.Mesh(geo.flap, o.ghost ? mats.ghost : mats.hull); m.position.set(0, 0, 0); pivot.add(m); grp.add(pivot); return pivot; });
  const glowMat = own(new THREE.MeshBasicNodeMaterial({ color: o.ghost ? o.ghostColor || '#aaffff' : T.colors[3] })); if (o.ghost) { glowMat.transparent = true; glowMat.opacity = .5; }
  const discs = geo.engines.map(([x, y, z, r, kind]) => { const d = new THREE.Mesh(kind === 'slot' ? own(new THREE.BoxGeometry(.1, r * 1.0, 12 / 16)) : own(new THREE.CircleGeometry(r, 10)), glowMat); d.position.set(x - .02, y, z); d.rotation.y = -Math.PI / 2; grp.add(d); return d; });
  const shellMat = own(mats.shell.clone()); shellMat.opacity = 0;
  const shell = new THREE.Mesh(own(new THREE.SphereGeometry(1, 16, 10)), shellMat); shell.scale.set(3.6, 1.2, 1.9); shell.position.y = .4; grp.add(shell);
  grp.matrixAutoUpdate = false;
  return { group: grp, body, flaps, discs, glowMat, shell, shellMat, team, geo, ghost: !!o.ghost, engines: geo.engines, len: geo.len };
}
const _m = { F: null, U: null, R: null };
/** put a craft visual where a frame says (engine units P, unit F and U), rolled by roll about its nose */
function poseCraft(v, P, F, U, roll = 0, scale = 1) {
  const THREE = E.THREE, m = v.group.matrix;
  const Ft = _m.F || (_m.F = new THREE.Vector3()), Ut = _m.U || (_m.U = new THREE.Vector3()), Rt = _m.R || (_m.R = new THREE.Vector3());
  Ft.set(F[0], F[2], F[1]).normalize(); Ut.set(U[0], U[2], U[1]);
  // R = cross(U, F) in engine axes -> three
  const rx = U[1] * F[2] - U[2] * F[1], ry = U[2] * F[0] - U[0] * F[2], rz = U[0] * F[1] - U[1] * F[0];
  Rt.set(rx, rz, ry).normalize(); Ut.crossVectors(Rt, Ft).normalize();   // (re-orthogonalise; three: up = right x forward)
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const ux = Ut.x * c + Rt.x * s, uy = Ut.y * c + Rt.y * s, uz = Ut.z * c + Rt.z * s; const rx2 = Rt.x * c - Ut.x * s, ry2 = Rt.y * c - Ut.y * s, rz2 = Rt.z * c - Ut.z * s;   /* (roll > 0: the right side dips) */ Ut.set(ux, uy, uz); Rt.set(rx2, ry2, rz2); }
  m.makeBasis(Ft.multiplyScalar(scale), Ut.multiplyScalar(scale), Rt.multiplyScalar(scale)); m.setPosition(P[0] / 16, P[2] / 16, P[1] / 16);
  v.group.matrixWorldNeedsUpdate = true;
}
SN.shade = (hex, k) => { const c = SN.col3(hex), f = 1 + k; const to = v => Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, Math.min(1, v * f)), 1 / 2.2) * 255))); return '#' + [to(c[0]), to(c[1]), to(c[2])].map(v => v.toString(16).padStart(2, '0')).join(''); };
SN.ShipKit = { craftGeometry, materials, makeCraft, poseCraft, DESIGNS };
})();
