// SNIPEOUT HD: the craft, built from code. Six designs lofted through cross-sections (flat-shaded, toon light), team
// liveries in vertex colours, swept wings, fins, engine pods with glowing discs, hinged airbrake flaps, a boost flame,
// a shield shell that flashes on a hit, an exhaust trail, translucent ghosts, and the rescue drone.
(() => {
const E = My3D2dge, SN = globalThis.SN, U = 16;
const L = 96;   // every craft is 96 u long (6 m), nose at +x

/** a builder in the craft's own frame (x ahead, y up, z right; engine units), faces turned outward from a centre */
class CB {
  constructor() { this.p = []; this.n = []; this.c = []; }
  tri(a, b, c, col, ctr) {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (ctr) { const mx = (a[0] + b[0] + c[0]) / 3 - ctr[0], my = (a[1] + b[1] + c[1]) / 3 - ctr[1], mz = (a[2] + b[2] + c[2]) / 3 - ctr[2]; if (nx * mx + ny * my + nz * mz < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; } }
    this.p.push(...a, ...b, ...c); const k = SN.lin(col); for (let i = 0; i < 3; i++) { this.n.push(nx, ny, nz); this.c.push(k[0], k[1], k[2]); }
  }
  quad(a, b, c, d, col, ctr) { this.tri(a, b, c, col, ctr); this.tri(a, c, d, col, ctr); }
  /** a box from its centre and half sizes, turned by yaw (about y) */
  box(cx, cy, cz, hx, hy, hz, col, rotZ = 0) {
    const cs = Math.cos(rotZ), sn = Math.sin(rotZ), P = (x, y, z) => [cx + x * cs - y * sn, cy + x * sn + y * cs, cz + z], ctr = [cx, cy, cz];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    for (const [a, b, c, d] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]]) this.quad(v[a], v[b], v[c], v[d], col, ctr);
  }
  /** a cylinder along x from x0 to x1 at (y, z), radius r */
  cyl(x0, x1, y, z, r, col, n = 8, colEnd) {
    const ctr = [(x0 + x1) / 2, y, z];
    for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, p = (x, a) => [x, y + Math.sin(a) * r, z + Math.cos(a) * r];
      this.quad(p(x0, a0), p(x1, a0), p(x1, a1), p(x0, a1), col, ctr); this.tri([x1, y, z], p(x1, a0), p(x1, a1), colEnd || col, [x0, y, z]); this.tri([x0, y, z], p(x0, a0), p(x0, a1), col, [x1, y, z]); }
  }
  geo() { const THREE = E.THREE, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.computeBoundingSphere(); return g; }
}

/** a hull lofted through 6 octagonal sections (half-width w, height h), from the nose (+x) to the tail */
function loft(b, D, cols, zOff = 0, scaleW = 1, lenK = 1, facet = false) {
  const n = facet ? 4 : 8, secs = D.w.map((w, k) => {
    const x = L / 2 - k / (D.w.length - 1) * L * lenK, h = D.h[k], pts = [];
    for (let j = 0; j < n; j++) { const a = (j + .5) / n * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); pts.push([x, (s > 0 ? s * h : s * h * .45) + 2, zOff + c * w * scaleW]); }
    return pts;
  });
  const ctr = [0, 2, zOff];
  for (let k = 0; k < secs.length - 1; k++) for (let j = 0; j < n; j++) {
    const a = secs[k][j], bb = secs[k][(j + 1) % n], c = secs[k + 1][(j + 1) % n], d = secs[k + 1][j];
    const top = (a[1] + bb[1]) / 2 > 4, side = Math.abs((a[2] + bb[2]) / 2 - zOff) > 0;
    const stripe = top && Math.abs(((a[2] + bb[2]) / 2) - zOff) < 3;
    b.quad(a, bb, c, d, stripe ? cols.accent : top ? cols.primary : cols.secondary, ctr);
  }
  const tail = secs[secs.length - 1], tx = tail[0][0];
  for (let j = 0; j < n; j++) b.tri([tx - .5, 2, zOff], tail[j], tail[(j + 1) % n], '#202024', [tx + 10, 2, zOff]);
  return secs;
}

const DESIGN_CACHE = {};
/** a craft's geometry for a team (the livery baked in): { hull, canopy, glow, flapL, flapR, engines: [[x, y, z, r]] } */
SN.craftGeo = (teamId, champion = false, color = null) => {
  const key = teamId + (champion ? ':c' : '') + (color || ''); if (DESIGN_CACHE[key]) return DESIGN_CACHE[key];
  const T = SN.TEAMS[teamId], D = SN.DESIGNS[T.design], C = Object.assign({}, T.colors);
  if (color) { C.primary = color; C.secondary = SN.mix(color, '#000000', .45); C.accent = '#ffffff'; }
  if (champion) C.accent = '#ffd23f';
  const hull = new CB(), canopy = new CB(), glow = new CB(), flapL = new CB(), flapR = new CB(), engines = [];
  if (D.booms) {
    loft(hull, { w: D.w.map(w => w * .9), h: D.h }, C, -D.booms.x, 1, 1); loft(hull, { w: D.w.map(w => w * .9), h: D.h }, C, D.booms.x, 1, 1);
    loft(hull, { w: [1, 5, 7, 7, 5, 3], h: [2, 6, 8, 8, 6, 3] }, C, 0, 1, D.pod.len);
  } else loft(hull, D, C, 0, 1, 1, !!D.facet);
  if (D.pods) for (const z of [-D.pods.x, D.pods.x]) hull.cyl(L / 2 - 30, L / 2 + 2, 2, z, D.pods.r, C.secondary, 8, C.accent);
  // canopy: a dark glass bubble a third back, with a glowing rim
  const cz0 = 0, cx = L / 2 - L * .33, ch = (D.h[2] || 7) + 2;
  for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI, a1 = (k + 1) / 6 * Math.PI, p = (x, a, s) => [x, ch + Math.sin(a) * 3.6 * s, cz0 + Math.cos(a) * 4.4 * s]; canopy.quad(p(cx + 9, a0, .4), p(cx + 9, a1, .4), p(cx - 9, a1, 1), p(cx - 9, a0, 1), '#101622', [cx, ch, cz0]); }
  glow.box(cx - 9, ch, cz0, .6, .8, 4.6, T.colors.glow);
  // wings: swept wedges with team-coloured tips
  if (D.wing) {
    const W = D.wing, rx = L / 2 - L * W.at, sw = Math.tan(W.sweep * Math.PI / 180), chord = 26;
    for (const sd of [-1, 1]) {
      const root0 = [rx + chord / 2, 1, sd * 6], root1 = [rx - chord / 2, 1, sd * 6], tip0 = [rx + chord / 2 - W.span * sw, 0, sd * W.span], tip1 = [rx - chord / 2 - W.span * sw + 8, 0, sd * W.span];
      const up = v => [v[0], v[1] + 1.6, v[2]], ctr = [rx, 1.8, sd * W.span / 2];
      hull.quad(up(root0), up(tip0), up(tip1), up(root1), C.secondary, ctr); hull.quad(root0, tip0, tip1, root1, C.secondary, ctr);
      hull.quad(root0, tip0, up(tip0), up(root0), C.secondary, ctr); hull.quad(tip0, tip1, up(tip1), up(tip0), C.accent, ctr); hull.quad(tip1, root1, up(root1), up(tip1), C.secondary, ctr);
      glow.box(tip1[0] + 2, .8, sd * (W.span - .5), 4, .6, .8, T.colors.glow);
      // the airbrake flap, hinged at the wing's trailing edge (rotated by the brake, about its own hinge)
      const fb = sd < 0 ? flapL : flapR; fb.box(-5, .8, 0, 5, .7, 7, C.primary); fb.box(-9.5, .8, 0, .6, 1, 7, C.accent);
      fb._hinge = [rx - chord / 2 - 2, 1.5, sd * 13];
    }
  } else {
    for (const sd of [-1, 1]) { const fb = sd < 0 ? flapL : flapR; fb.box(-5, .5, 0, 5, .6, 6, C.primary); fb._hinge = [-L / 2 + 14, (D.h[4] || 5) + 2, sd * ((D.w[4] || 14) - 4)]; }
  }
  if (D.canards) for (const sd of [-1, 1]) hull.quad([L / 2 - L * D.canards.at + 6, 2.5, sd * 4], [L / 2 - L * D.canards.at - 4, 2.5, sd * D.canards.span], [L / 2 - L * D.canards.at - 8, 2.5, sd * D.canards.span], [L / 2 - L * D.canards.at - 4, 2.5, sd * 4], C.accent, [L / 2 - L * D.canards.at, 0, 0]);
  // fins
  const F = D.fins || { n: 0 };
  const finAt = F.booms ? [-D.booms.x, D.booms.x] : F.n === 1 ? [0] : F.n === 2 ? [-8, 8] : [];
  for (const z0 of finAt) {
    const cant = (F.cant || 0) * Math.PI / 180 * Math.sign(z0 || 1), tall = F.tall || 8, x0 = -L / 2 + 4, top = (D.h[4] || 6) + 2;
    const P = (x, y) => [x, top + y * Math.cos(cant), z0 + y * Math.sin(cant)];
    hull.quad(P(x0, 0), P(x0 + 20, 0), P(x0 + 6, tall), P(x0, tall), C.primary, [x0 + 8, top + tall / 3, z0 - 3 * Math.sign(z0 || 1)]);
    hull.quad(P(x0, 0), P(x0 + 20, 0), P(x0 + 6, tall), P(x0, tall), C.primary, [x0 + 8, top + tall / 3, z0 + 3 * Math.sign(z0 || 1)]);
    glow.box(x0 + 2, top + tall - .5, z0 + Math.sin(cant) * tall, 2.5, .6, .6, T.colors.glow);
  }
  // engines: pods at the tail with glowing discs
  const EN = D.engines, ez = EN.n === 1 ? [0] : EN.n === 2 ? (D.booms ? [-D.booms.x, D.booms.x] : [-9, 9]) : [-12, 0, 12];
  for (const z of ez) {
    const r = EN.r, y = 3, x1 = -L / 2 - 2, x0 = x1 + 22;
    if (EN.slot) { hull.box((x0 + x1) / 2, y, z, 11, EN.slot[1] / 2 + 1, EN.slot[0] / 2, '#18181c'); glow.box(x1 - .4, y, z, .5, EN.slot[1] / 2, EN.slot[0] / 2 - 1, T.colors.glow); engines.push([x1 - 1, y, z, EN.slot[0] / 2]); }
    else { hull.cyl(x1, x0, y, z, r, '#2a2c34', 10, '#18181c'); glow.cyl(x1 - .6, x1 - .2, y, z, r * .72, T.colors.glow, 10); engines.push([x1 - 1, y, z, r]); }
  }
  // the race number's panel on the nose (a lit square)
  glow.box(L / 2 - 18, (D.h[1] || 5) + 2.2, 0, 3, .3, 2.2, T.colors.glow);
  return (DESIGN_CACHE[key] = { hull: hull.geo(), canopy: canopy.geo(), glow: glow.geo(), flapL: flapL.geo(), flapR: flapR.geo(), hingeL: flapL._hinge, hingeR: flapR._hinge, engines, glowColor: T.colors.glow });
};

/** the shared materials for craft in a world (made with the world) */
SN.craftMats = world => {
  if (world._craftMats) return world._craftMats;
  const THREE = E.THREE, own = x => world._own(x);
  return (world._craftMats = {
    hull: own(new THREE.MeshToonNodeMaterial({ vertexColors: true })),
    canopy: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true })),
    glow: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true })),
    flame: own(new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
    trail: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })),
    ghost: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })),
    drone: own(new THREE.MeshLambertNodeMaterial({ color: '#d8dce4' })),
    beam: own(new THREE.MeshBasicNodeMaterial({ color: '#7af0ff', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))
  });
};

/** a craft's meshes (a Group in metres): its parts for animation. o: { ghost, color, champion } */
SN.buildCraft = (world, teamId, o = {}) => {
  const THREE = E.THREE, Mt = SN.craftMats(world), G = SN.craftGeo(teamId, o.champion, o.color);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(1 / U);
  const mk = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = !o.ghost; body.add(m); return m; };
  if (o.ghost) { mk(G.hull, Mt.ghost, false); mk(G.glow, Mt.ghost, false); }
  else { mk(G.hull, Mt.hull); mk(G.canopy, Mt.canopy); mk(G.glow, Mt.glow, false); }
  const flap = (geo, hinge) => { const p = new THREE.Group(); p.position.set(hinge[0], hinge[1], hinge[2]); const m = new THREE.Mesh(geo, o.ghost ? Mt.ghost : Mt.hull); m.castShadow = !o.ghost; p.add(m); body.add(p); return p; };
  const flapL = flap(G.flapL, G.hingeL), flapR = flap(G.flapR, G.hingeR);
  // boost flames (one per engine), a shield shell, its own material for the flash
  const flames = G.engines.map(([x, y, z, r]) => { const c = new THREE.Mesh(world._own(new THREE.ConeGeometry(r * .8, 1, 8)), Mt.flame); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); body.add(c); c.visible = false; return c; });
  const shellMat = world._own(new THREE.MeshBasicNodeMaterial({ color: '#7af0ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const shell = new THREE.Mesh(world._own(new THREE.SphereGeometry(1, 16, 10)), shellMat); shell.scale.set(58, 18, 30); shell.position.set(0, 4, 0); body.add(shell); shell.visible = false;
  // the exhaust trail: a ribbon of the tail's last positions
  const TN = 24, tpos = new Float32Array(TN * 2 * 3), tcol = new Float32Array(TN * 2 * 3), idx = [];
  for (let i = 0; i < TN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const tg = world._own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3)); tg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(tpos.length), 3)); tg.setIndex(idx);
  const trail = new THREE.Mesh(tg, Mt.trail); trail.frustumCulled = false; world.scene.add(trail);
  world.scene.add(root);
  return { root, body, flapL, flapR, flames, shell, shellMat, trail: { mesh: trail, pos: tpos, col: tcol, n: TN, pts: [], color: SN.lin(o.color || G.glowColor) }, ghost: !!o.ghost, glowColor: G.glowColor };
};

/** the rescue drone: four rotors and a tractor beam */
SN.buildDrone = world => {
  const THREE = E.THREE, Mt = SN.craftMats(world), b = new CB();
  b.box(0, 0, 0, 10, 3, 10, '#d8dce4'); for (const [x, z] of [[14, 14], [-14, 14], [14, -14], [-14, -14]]) { b.box(x / 2, 0, z / 2, 9, 1, 1.2, '#8a8e98', Math.atan2(z, x)); b.cyl(x - .5, x + .5, 2, z, 6, '#202028', 10); }
  b.box(0, -4, 0, 3, 2, 3, '#ffb000');
  const g = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(1 / U); g.add(body);
  const m = new THREE.Mesh(b.geo(), world._own(new THREE.MeshLambertNodeMaterial({ vertexColors: true }))); body.add(m);
  const beam = new THREE.Mesh(world._own(new THREE.ConeGeometry(1, 1, 16, 1, true)), Mt.beam); beam.position.set(0, -.5, 0); body.add(beam); beam.scale.set(30, 120, 30); beam.position.y = -64;
  g.visible = false; world.scene.add(g); return { root: g, beam };
};
})();
