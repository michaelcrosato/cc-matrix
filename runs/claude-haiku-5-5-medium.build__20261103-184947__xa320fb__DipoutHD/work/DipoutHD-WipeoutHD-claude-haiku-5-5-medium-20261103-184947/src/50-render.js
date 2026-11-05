// Dipout HD: presentation of the race in World3D (browser only). Reads the sim, never writes to it.
// Units: the sim is in metres (x east, y south, z up). three.js is metres with y up, so a sim point (x, y, z)
// is drawn at three (x, z, y). World3D's camera takes engine units (16 per metre) with the same axes.
(() => {
  const SN = globalThis.SN;
  const M = (p) => [p[0], p[2], p[1]];     // sim metres -> three.js metres
  const ENG = 16;                           // engine units per metre

  // Geometry accumulator: one per material. Positions and vertex colours, triangles only.
  function Mesh() { this.p = []; this.c = []; this.i = []; }
  Mesh.prototype.tri = function (a, b, c, col) {
    const base = this.p.length / 3;
    for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.c.push(col[0], col[1], col[2]); }
    this.i.push(base, base + 1, base + 2);
  };
  Mesh.prototype.quad = function (a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); };
  Mesh.prototype.build = function (THREE) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    g.computeVertexNormals();
    return g;
  };

  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  // Road ribbon, walls, neon edges, pillars under the road, and pads. Built once per track.
  SN.buildTrackMeshes = (THREE, tr) => {
    const road = new Mesh(), glow = new Mesh(), wall = new Mesh(), pill = new Mesh(), pad = new Mesh();
    const base = hex('#1b1f2c'), lane = hex('#2b3350'), neon = hex(tr.neon);
    const step = 2;                     // sample every 2 m for the ribbon
    const W = tr.wallU;
    const at = (s, u, h) => {
      const f = SN.frameInto(tr, s, {});
      return M([f.C[0] + f.R[0] * u + f.U[0] * h, f.C[1] + f.R[1] * u + f.U[1] * h, f.C[2] + f.R[2] * u + f.U[2] * h]);
    };
    for (let s = 0; s < tr.L; s += step) {
      const s1 = s + step;
      const cLane = mix(base, lane, 0.5 + 0.5 * Math.sin(s / 14));
      const cEdge = scale(neon, 0.9);
      // Road surface, in three bands: the outer lanes, a striped centre, the outer lanes again (lifted a hair).
      for (const [a, b, col] of [[-W, -W + 3, base], [-W + 3, W - 3, cLane], [W - 3, W, base]]) {
        road.quad(at(s, a, 0.03), at(s, b, 0.03), at(s1, b, 0.03), at(s1, a, 0.03), col);
      }
      // Neon edge strips at the rails.
      glow.quad(at(s, -W, 0.05), at(s, -W + 0.6, 0.05), at(s1, -W + 0.6, 0.05), at(s1, -W, 0.05), cEdge);
      glow.quad(at(s, W - 0.6, 0.05), at(s, W, 0.05), at(s1, W, 0.05), at(s1, W - 0.6, 0.05), cEdge);
      // Walls: a low rail either side.
      wall.quad(at(s, -W, 0), at(s, -W, 1.6), at(s1, -W, 1.6), at(s1, -W, 0), scale(base, 0.7));
      wall.quad(at(s, W, 0), at(s1, W, 0), at(s1, W, 1.6), at(s, W, 1.6), scale(base, 0.7));
      // Pillars every 40 m, from the road down to a floor well below.
      if (s % 40 < step) {
        const pa = at(s, -W + 4, -0.2), pb = at(s, -W + 4.6, -0.2);
        const floor = (p) => [p[0], -60, p[2]];
        pill.quad(pa, pb, floor(pb), floor(pa), [0.1, 0.12, 0.18]);
      }
    }
    // Pads: chevron bands across the whole road, glowing.
    for (const p of tr.pads) {
      for (let d = 0; d < p.len; d += 2) {
        const s = p.s + d, s1 = s + 2, col = hex('#36c8ff');
        pad.quad(at(s, -W + 1, 0.06), at(s, W - 1, 0.06), at(s1, W - 1, 0.06), at(s1, -W + 1, 0.06), scale(col, 0.85 + 0.15 * Math.sin(d)));
      }
    }
    return { road, glow, wall, pill, pad };
  };

  // Craft: a body with a canopy, two fins and a glowing underside, in the team's livery.
  SN.buildCraftGroup = (THREE, team, human) => {
    const g = new THREE.Group();
    const body = hex(team.body), stripe = hex(team.stripe), glow = hex(team.glow);
    const mat = (c) => new THREE.MeshLambertNodeMaterial({ color: new THREE.Color(c[0], c[1], c[2]) });
    const basic = (c) => new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(c[0], c[1], c[2]) });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.4, 0.7), mat(body));
    const stripeM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 0.72), mat(stripe));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 6), mat(body));
    nose.rotation.x = Math.PI / 2; nose.position.y = 3.0;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.3), basic([0.12, 0.25, 0.4]));
    canopy.position.set(0, 0.6, 0.45);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.12), mat(body));
    finL.position.set(-1.6, -1.2, 0);
    const finR = finL.clone(); finR.position.x = 1.6;
    const under = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.0), basic(glow));
    under.rotation.x = -Math.PI / 2; under.position.set(0, 0, -0.42);
    const pulse = human ? new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 6), basic(hex('#ffffff'))) : null;
    for (const m of [hull, stripeM, nose, canopy, finL, finR, under]) g.add(m);
    if (pulse) { pulse.position.set(0, -1.7, -0.2); g.add(pulse); }
    // The craft's model is in its own frame: nose along +y in metres, up along +z (sim convention).
    // three.js reads it as nose +y (sim y is three z), so rotate the group to match M() later.
    return g;
  };

  // Put a craft group at a sim pose: position, forward (sim, horizontal), up (sim), roll.
  SN.placeCraft = (THREE, group, pos, fwd, up, roll) => {
    const f = [fwd[0], fwd[2], fwd[1]];
    const u = [up[0], up[2], up[1]];
    const r = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
    const m = new THREE.Matrix4();
    // Columns: right, nose (y of the model), up (z of the model).
    const cosR = Math.cos(roll), sinR = Math.sin(roll);
    const rr = [r[0] * cosR + u[0] * sinR, r[1] * cosR + u[1] * sinR, r[2] * cosR + u[2] * sinR];
    const uu = [u[0] * cosR - r[0] * sinR, u[1] * cosR - r[1] * sinR, u[2] * cosR - r[2] * sinR];
    m.set(rr[0], f[0], uu[0], pos[0], rr[1], f[1], uu[1], pos[2], rr[2], f[2], uu[2], pos[1], 0, 0, 0, 1);
    group.matrixAutoUpdate = false;
    group.matrix.copy(m);
    group.matrixWorldNeedsUpdate = true;
  };
})();
