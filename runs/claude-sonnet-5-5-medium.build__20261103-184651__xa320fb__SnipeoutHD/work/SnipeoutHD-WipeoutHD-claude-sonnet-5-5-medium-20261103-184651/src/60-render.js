(() => {
const E = My3D2dge, SN = globalThis.SN, U = SN.U;
const { clamp, mod, lerp } = SN;
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
const shade = (c, k) => [clamp(c[0] * k, 0, 1), clamp(c[1] * k, 0, 1), clamp(c[2] * k, 0, 1)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---- mesh builder: engine-axis points (x east, y south, z up) scaled, drawn as three.js (x, z, y) -----------------------
class MB {
  constructor(scale = 1) { this.k = scale; this.pos = []; this.col = []; }
  tri(a, b, c, col) { for (const p of [a, b, c]) { this.pos.push(p[0] * this.k, p[2] * this.k, p[1] * this.k); this.col.push(col[0], col[1], col[2]); } }
  quad(a, b, c, d, col, col2) { this.tri(a, b, c, col); this.tri(a, c, d, col2 || col); }
  // box with centre c and three half-extent axis vectors (so it can lean)
  box(c, ax, ay, az, col, tops) {
    const P = (sx, sy, sz) => [c[0] + ax[0] * sx + ay[0] * sy + az[0] * sz, c[1] + ax[1] * sx + ay[1] * sy + az[1] * sz, c[2] + ax[2] * sx + ay[2] * sy + az[2] * sz];
    const t = tops || col, f = (a, b, c2, d, cc) => this.quad(a, b, c2, d, cc);
    f(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), t); f(P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1), shade(col, .6));
    f(P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1), shade(col, .85)); f(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), shade(col, .85));
    f(P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), shade(col, .75)); f(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), shade(col, .75));
  }
  abox(cx, cy, cz, sx, sy, sz, col, tops) { this.box([cx, cy, cz], [sx / 2, 0, 0], [0, sy / 2, 0], [0, 0, sz / 2], col, tops); }
  pyramid(base, apex, col) { const n = base.length; for (let i = 0; i < n; i++) this.tri(base[i], base[(i + 1) % n], apex, shade(col, .8 + .2 * (i % 2))); this.quad(base[0], base[1], base[2], base[3], shade(col, .5)); }
  mesh(mat) { const T = E.THREE, g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); const m = new T.Mesh(g, mat); m.frustumCulled = false; return m; }
}
SN.MB = MB;

const R = SN.R = { world: null, trackId: null, ships: [], cam: null, mats: {}, tvT: 0, shipSets: [], themeProps: [], frame: 0 };

R.mats = () => {
  const T = E.THREE; if (R._mats) return R._mats;
  return R._mats = {
    lit: new T.MeshLambertNodeMaterial({ vertexColors: true, side: T.DoubleSide }),
    glow: new T.MeshBasicNodeMaterial({ vertexColors: true, side: T.DoubleSide })
  };
};

// ---- track scene -------------------------------------------------------------------------------------------------
R.buildTrackMeshes = (tr, def) => {
  const T = E.THREE, M = R.mats(), lit = new MB(1 / U), glow = new MB(1 / U), th = def.theme;
  const pal = { coast: { deck: '#3e4658', stripe: '#59637a', wall: '#d8d2c4', neon: '#33d6ff', neon2: '#ffb347' }, desert: { deck: '#4a3b34', stripe: '#6c554a', wall: '#c9a06b', neon: '#ff7a2b', neon2: '#ffe08a' }, city: { deck: '#202034', stripe: '#34345a', wall: '#2b2b4a', neon: '#ff2fb4', neon2: '#2fe6ff' }, ice: { deck: '#35506a', stripe: '#4f7090', wall: '#cdeaf6', neon: '#58ffd0', neon2: '#a8ffe8' } }[th];
  const deck = hex(pal.deck), stripe = hex(pal.stripe), wall = hex(pal.wall), neon = hex(pal.neon), neon2 = hex(pal.neon2);
  const n = tr.n, fr = tr.frameAt(0), P = (s, u, h) => { const f = tr.frameAt(s, fr); return [f.C[0] + f.R[0] * u + f.U[0] * h, f.C[1] + f.R[1] * u + f.U[1] * h, f.C[2] + f.R[2] * u + f.U[2] * h]; };
  const step = 1;   // every slice
  for (let i = 0; i < n; i += step) {
    const s0 = i * tr.ds, s1 = (i + step) * tr.ds, w0 = tr.w[i], w1 = tr.w[(i + step) % n];
    const lanes = [-1, -.62, -.2, .2, .62, 1];
    if (tr.inGap(s0 + tr.ds / 2)) { for (const sd of [-1, 1]) glow.quad(P(s0, sd * w0, 0), P(s1, sd * w1, 0), P(s1, sd * w1, 60), P(s0, sd * w0, 60), [1, .2, .2]); continue; }
    const band = (Math.floor(i / 6) % 2) ? stripe : deck;
    for (let l = 0; l < lanes.length - 1; l++) {
      const c = (l === 2) ? mix(band, neon, .08) : band;
      lit.quad(P(s0, lanes[l] * w0, 0), P(s0, lanes[l + 1] * w0, 0), P(s1, lanes[l + 1] * w1, 0), P(s1, lanes[l] * w1, 0), c);
    }
    // underside
    lit.quad(P(s0, -w0, -30), P(s1, -w1, -30), P(s1, w1, -30), P(s0, w0, -30), shade(deck, .4));
    for (const sd of [-1, 1]) {
      // wall: from the deck edge up and slightly out
      lit.quad(P(s0, sd * w0, 0), P(s1, sd * w1, 0), P(s1, sd * (w1 + 10), 38), P(s0, sd * (w0 + 10), 38), wall);
      lit.quad(P(s0, sd * w0, -30), P(s1, sd * w1, -30), P(s1, sd * w1, 0), P(s0, sd * w0, 0), shade(wall, .5));
      // neon strips: on the top of the wall and a thin line on the deck edge
      const k = (i % 2) ? neon : neon2;
      glow.quad(P(s0, sd * (w0 + 10), 38), P(s1, sd * (w1 + 10), 38), P(s1, sd * (w1 + 14), 46), P(s0, sd * (w0 + 14), 46), k);
      glow.quad(P(s0, sd * (w0 - 8), 1.5), P(s1, sd * (w1 - 8), 1.5), P(s1, sd * (w1 - 20), 1.5), P(s0, sd * (w0 - 20), 1.5), mix(k, [0, 0, 0], .35));
    }
    // dashed centre line
    if (Math.floor(i / 3) % 2 === 0) glow.quad(P(s0, -3, 1), P(s1, -3, 1), P(s1, 3, 1), P(s0, 3, 1), mix(neon, [1, 1, 1], .5));
  }
  // pads
  for (const p of tr.pads) {
    const f = tr.frameAt(p.s), pu = p.u * (f.w - 80);
    if (p.kind === 'boost') {
      for (let k = 0; k < 4; k++) { const a = p.s - 60 + k * 36, c = k % 2 ? [.2, .8, 1] : [.6, .95, 1]; glow.quad(P(a, pu - 44, 1.8), P(a + 24, pu, 1.8), P(a + 10, pu, 1.8), P(a - 14, pu - 44, 1.8), c); glow.quad(P(a, pu + 44, 1.8), P(a + 24, pu, 1.8), P(a + 10, pu, 1.8), P(a - 14, pu + 44, 1.8), c); }
    } else { for (let k = 0; k < 4; k++) { const a = p.s - 24 + k * 16; glow.quad(P(a, pu - 40, 1.8), P(a + 10, pu - 40, 1.8), P(a + 10, pu + 40, 1.8), P(a, pu + 40, 1.8), k % 2 ? [1, .72, .1] : [1, .45, .05]); } }
  }
  // pit strip (green) beside the right wall
  { const a = tr.pit.s0, b = tr.pit.s1; for (let s = a; s < b; s += tr.ds) { const w = tr.frameAt(s).w; glow.quad(P(s, w * tr.pit.u0, 1.6), P(s + tr.ds, w * tr.pit.u0, 1.6), P(s + tr.ds, w - 30, 1.6), P(s, w - 30, 1.6), (Math.floor(s / tr.ds) % 2) ? [.1, .9, .4] : [.05, .6, .3]); } }
  // start line (chequers)
  { const w = tr.frameAt(0).w; for (let c = 0; c < 10; c++) for (let r = 0; r < 2; r++) { const u0 = -w + c * w * 2 / 10, u1 = u0 + w * 2 / 10, s0 = r * 14 - 14, s1 = s0 + 14; glow.quad(P(s0, u0, 2), P(s1, u0, 2), P(s1, u1, 2), P(s0, u1, 2), (c + r) % 2 ? [.95, .95, .95] : [.05, .05, .05]); } }
  // tunnel: an ice tunnel on Borealis and a city underpass on Meridian (walls, roof, glowing ribs)
  const tun = def.theme === 'ice' ? [.30, .38] : def.theme === 'city' ? [.52, .58] : null;
  if (tun) for (let s = tun[0] * tr.L; s < tun[1] * tr.L; s += tr.ds) {
    const f = tr.frameAt(s), w = f.w + 12, rib = Math.floor(s / tr.ds) % 6 === 0, roofC = shade(wall, .55);
    for (const sd of [-1, 1]) lit.quad(P(s, sd * w, 0), P(s + tr.ds, sd * w, 0), P(s + tr.ds, sd * w, 330), P(s, sd * w, 330), shade(wall, .8));
    lit.quad(P(s, -w, 330), P(s + tr.ds, -w, 330), P(s + tr.ds, w, 330), P(s, w, 330), roofC);
    if (rib) { glow.quad(P(s, -w + 2, 318), P(s, w - 2, 318), P(s, w - 2, 306), P(s, -w + 2, 306), neon); for (const sd of [-1, 1]) glow.quad(P(s, sd * (w - 2), 0), P(s, sd * (w - 2), 330), P(s, sd * (w - 14), 330), P(s, sd * (w - 14), 0), neon2); }
  }
  // gantries and supports
  const groundZ = tr.heightRange[0] - 24 * U;
  def._groundZ = groundZ;
  for (let g = 0; g < 12; g++) {
    const s = (g + .5) * tr.L / 12, f = tr.frameAt(s), w = f.w + 14, col = g % 2 ? neon : neon2;
    for (const sd of [-1, 1]) lit.box(P(s, sd * w, 120), [8, 0, 0], [0, 8, 0], [0, 0, 120], shade(wall, .7));
    const L = P(s, -w, 250), Rr = P(s, w, 250); const mid = [(L[0] + Rr[0]) / 2, (L[1] + Rr[1]) / 2, (L[2] + Rr[2]) / 2];
    lit.box(mid, [f.F[0] * 12, f.F[1] * 12, 0], [f.R[0] * w, f.R[1] * w, f.R[2] * w], [0, 0, 14], shade(deck, 1.2));
    glow.quad(P(s - 14, -w, 236), P(s - 14, w, 236), P(s - 14, w, 224), P(s - 14, -w, 224), col);
  }
  for (let i = 0; i < n; i += 14) {
    const c = tr.C[i], hgt = c[2] - groundZ; if (hgt < 12 * U) continue;
    const f = tr.frameAt(i * tr.ds);
    lit.box([c[0], c[1], c[2] - 30 - (hgt - 30) / 2], [14, 0, 0], [0, 14, 0], [0, 0, (hgt - 30) / 2], shade(wall, .45), shade(wall, .5));
  }
  // scenery
  R.buildScenery(tr, def, lit, glow, groundZ, pal);
  // ground
  const gcol = hex(def.ground), G = 60000; lit.quad([-G, -G, groundZ], [G, -G, groundZ], [G, G, groundZ], [-G, G, groundZ], gcol);
  const grp = new T.Group(); grp.add(lit.mesh(M.lit)); grp.add(glow.mesh(M.glow));
  return grp;
};
R.buildScenery = (tr, def, lit, glow, groundZ, pal) => {
  const rnd = SN.rng(SN.hashStr(def.id)), cell = 120 * U, grid = new Set();
  for (let i = 0; i < tr.n; i += 2) { const c = tr.C[i]; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) grid.add((Math.floor(c[0] / cell) + a) + ',' + (Math.floor(c[1] / cell) + b)); }
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9; for (const c of tr.C) { minx = Math.min(minx, c[0]); maxx = Math.max(maxx, c[0]); miny = Math.min(miny, c[1]); maxy = Math.max(maxy, c[1]); }
  const pad = 700 * U, th = def.theme, N = th === 'city' ? 420 : 260;
  for (let k = 0; k < N; k++) {
    const x = minx - pad + rnd() * (maxx - minx + 2 * pad), y = miny - pad + rnd() * (maxy - miny + 2 * pad);
    if (grid.has(Math.floor(x / cell) + ',' + Math.floor(y / cell))) continue;
    const base = groundZ;
    if (th === 'city') {
      const w = (10 + rnd() * 26) * U, h = (30 + rnd() * rnd() * 260) * U, c = shade(hex(['#2a2250', '#1e2a5a', '#3a1f58'][Math.floor(rnd() * 3)]), .7 + rnd() * .5);
      lit.abox(x, y, base + h / 2, w, w, h, c, shade(c, 1.3));
      for (let f = 0; f < 3; f++) { const gz = base + h * (.2 + rnd() * .7), gc = [hex('#ff2fb4'), hex('#2fe6ff'), hex('#ffd23c')][Math.floor(rnd() * 3)]; glow.abox(x, y - w / 2 - 6, gz, w * .8, 6, 14, gc); }
      glow.abox(x, y, base + h + 12, 10, 10, 10, hex('#ff3b3b'));
    } else if (th === 'desert') {
      const w = (20 + rnd() * 50) * U, h = (20 + rnd() * 90) * U, c = shade(hex('#b5773a'), .6 + rnd() * .5);
      lit.abox(x, y, base + h / 2, w, w * (.7 + rnd() * .5), h, c, shade(c, 1.25)); lit.abox(x, y, base + h + 20, w * .6, w * .5, 40, shade(c, 1.1), shade(c, 1.4));
    } else if (th === 'ice') {
      const w = (12 + rnd() * 30) * U, h = (30 + rnd() * 120) * U, c = shade(hex('#bfe8ff'), .7 + rnd() * .4);
      const b = [[x - w, y - w, base], [x + w, y - w, base], [x + w, y + w, base], [x - w, y + w, base]]; lit.pyramid(b, [x + (rnd() - .5) * w, y + (rnd() - .5) * w, base + h], c);
      if (rnd() < .25) glow.pyramid([[x - w / 4, y - w / 4, base + h * .6], [x + w / 4, y - w / 4, base + h * .6], [x + w / 4, y + w / 4, base + h * .6], [x - w / 4, y + w / 4, base + h * .6]], [x, y, base + h * 1.02], hex('#58ffd0'));
    } else {  // coast: rocks, a lighthouse every now and then, cranes
      if (rnd() < .06) { const h = 120 * U; lit.abox(x, y, base + h / 2, 14 * U, 14 * U, h, hex('#f2efe6'), hex('#ffffff')); lit.abox(x, y, base + h + 10 * U, 18 * U, 18 * U, 20 * U, hex('#d8283c')); glow.abox(x, y, base + h + 26 * U, 12 * U, 12 * U, 12 * U, hex('#fff2a0')); }
      else { const w = (12 + rnd() * 40) * U, h = (6 + rnd() * 40) * U, c = shade(hex('#6f7b8a'), .6 + rnd() * .6); lit.abox(x, y, base + h / 2, w, w * .8, h, c, shade(c, 1.2)); }
    }
  }
};

// ---- craft meshes ------------------------------------------------------------------------------------------------------
R.buildShip = (team, color) => {
  const T = E.THREE, M = R.mats(), lit = new MB(1), glow = new MB(1), main = hex(color || team.main), alt = hex(team.alt), gl = hex(team.glow), sh = team.shape;
  const L = 4.0 + (sh === 1 ? .6 : 0), W = 1.0 + (sh === 1 ? .3 : 0);
  lit.abox(0, 0, 0, L, W, .5, main, shade(main, 1.2));
  lit.pyramid([[L / 2, -W / 2, .25], [L / 2, W / 2, .25], [L / 2, W / 2, -.25], [L / 2, -W / 2, -.25]].reverse(), [L / 2 + (sh === 2 ? 2.2 : 1.6), 0, -.05], alt);
  const sep = 1.05 + (sh === 4 ? .3 : 0) - (sh === 0 ? .1 : 0);
  for (const sd of [-1, 1]) {
    lit.abox(-.5, sd * sep, -.05, 2.8 + (sh === 3 ? .6 : 0), .5, .36, alt, shade(alt, 1.3));
    lit.pyramid([[.9 + 1.4, sd * sep - .25, .13], [2.3, sd * sep + .25, .13], [2.3, sd * sep + .25, -.23], [2.3, sd * sep - .25, -.23]].reverse().map(p => [p[0], p[1], p[2]]), [3.2, sd * sep, -.05], main);
    lit.abox(-1.6, sd * sep, .45, .9, .08, .6 + (sh === 5 ? .35 : 0), main);        // fins
    glow.abox(-1.9, sd * sep, -.05, .12, .35, .22, gl);                           // thruster
    lit.abox(-.1, sd * (sep / 2), .1, 1.6, sep - .55, .12, shade(main, .8));      // strut
  }
  if (sh === 0 || sh === 2) lit.abox(-1.8, 0, .55, 1.0, .12, .7, alt);
  if (sh === 1 || sh === 3) lit.abox(-1.6, 0, .35, 1.2, W * 1.8, .1, alt);
  if (sh === 4) { lit.abox(.2, 0, .5, 2.2, .1, .5, main); lit.abox(-1.6, 0, .4, .8, 2.6, .08, alt); }
  if (sh === 5) lit.abox(1.2, 0, .45, 1.2, .5, .3, main);
  glow.abox(.9, 0, .3, 1.1, .6, .25, mix(gl, [.05, .08, .14], .6));              // canopy
  glow.abox(-2.0, 0, 0, .1, .7, .3, gl);
  const g = new T.Group(); g.add(lit.mesh(M.lit)); g.add(glow.mesh(M.glow)); g.scale.setScalar(1.35); return g;
};

// ---- load a world for a track ----------------------------------------------------------------------------------------
R.dispose = () => { if (R.world) { try { R.world.dispose(); } catch (e) { console.warn(e); } } R.world = null; R.trackId = null; R.ships.length = 0; R._mats = null; };
R.load = (game, trackId) => {
  if (R.world && R.trackId === trackId) return R.world;
  R.dispose();
  const def = SN.TRACKS[trackId], tr = SN.getTrack(trackId), T = E.THREE;
  const night = def.theme === 'city' || def.theme === 'ice';
  const world = R.world = new E.World3D(game, { level: { rows: ['..'], legend: { '.': { pit: true } }, ground: 'plain' }, res: 'pixels', sky: def.sky, fog: { color: def.fog, near: 90 * U, far: 1500 * U },
    ambient: [night ? '#6a78c8' : '#ffffff', night ? '#2a2050' : '#c8a070', night ? .85 : .9], sun: { color: night ? '#9ab0ff' : '#fff0d0', intensity: night ? 1.0 : 1.6, dir: [.4, .3, -.8], shadow: false },
    filter: { look: 'clean', bloom: true }, camera: { mode: 'fixed', fixed: { x: 0, y: 0, z: 400, yaw: 0, pitch: -.1, fov: 70 }, near: 6, far: 2600 * U } });
  R.trackId = trackId; R.track = tr; R.def = def;
  world.scene.add(R.buildTrackMeshes(tr, def));
  R.shipPool = [];
  R.camState = null; R.camStates = []; R.camMode = R.camMode || 0;
  world.prepare();
  return world;
};
R.ensureShips = (race) => {
  const T = E.THREE;
  if (R._shipsFor === race) return;
  for (const o of R.ships) { if (o.group.parent) o.group.parent.remove(o.group); }
  R.ships.length = 0; R._shipsFor = race;
  for (const sh of race.ships) { const g = R.buildShip(sh.team, sh.color); R.world.scene.add(g); R.ships.push({ ship: sh, group: g }); }
  for (const gh of race.ghostShips || []) { const g = R.buildShip(SN.TEAMS.kestrel, gh.color || '#9fd8ff'); g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .35; } }); R.world.scene.add(g); R.ships.push({ ghost: gh, group: g }); }
};
const _m = () => R._m4 || (R._m4 = new (E.THREE.Matrix4)());
const _v = () => R._v3 || (R._v3 = [new (E.THREE.Vector3)(), new (E.THREE.Vector3)(), new (E.THREE.Vector3)()]);
// local basis of a craft in engine axes: forward, right, up
R.basis = (sh, fr) => {
  const c = Math.cos(sh.psi), s = Math.sin(sh.psi);
  let F = [fr.F[0] * c + fr.R[0] * s, fr.F[1] * c + fr.R[1] * s, fr.F[2] * c + fr.R[2] * s], Rr = [fr.R[0] * c - fr.F[0] * s, fr.R[1] * c - fr.F[1] * s, fr.R[2] * c - fr.F[2] * s], Up = fr.U.slice();
  const p = sh.pitchVis, cp = Math.cos(p), sp = Math.sin(p);
  const F2 = [F[0] * cp + Up[0] * sp, F[1] * cp + Up[1] * sp, F[2] * cp + Up[2] * sp], U2 = [Up[0] * cp - F[0] * sp, Up[1] * cp - F[1] * sp, Up[2] * cp - F[2] * sp];
  const r = sh.roll, cr = Math.cos(r), sr = Math.sin(r);
  const R3 = [Rr[0] * cr + U2[0] * sr, Rr[1] * cr + U2[1] * sr, Rr[2] * cr + U2[2] * sr], U3 = [U2[0] * cr - Rr[0] * sr, U2[1] * cr - Rr[1] * sr, U2[2] * cr - Rr[2] * sr];
  return { F: F2, R: R3, U: U3 };
};
R.setGroup = (g, pos, b) => {
  const T = E.THREE, m = _m(), [x, y, z] = _v(); const tt = (a, o) => o.set(a[0], a[2], a[1]);
  tt(b.F, x); tt(b.U, y); tt(b.R, z); m.makeBasis(x, y, z); m.setPosition(pos[0] / U, pos[2] / U, pos[1] / U);
  g.matrixAutoUpdate = false; g.matrix.copy(m); g.matrixWorldNeedsUpdate = true;
};

// ---- cameras -------------------------------------------------------------------------------------------------------------
R.CAMS = ['CHASE', 'FAR', 'COCKPIT'];
R.pose = (cam, target, snap, idx = 0) => {
  // cam: {x,y,z,lx,ly,lz,fov,roll} in engine units; smoothed in R.camState
  const sts = R.camStates || (R.camStates = []); const st = sts[idx] || (sts[idx] = { p: null }); const dt = 1 / 120;
  const k = snap || !st.p ? 1 : 1 - Math.exp(-dt * (cam.follow || 14));
  if (!st.p) st.p = [cam.x, cam.y, cam.z]; if (!st.l) st.l = [cam.lx, cam.ly, cam.lz];
  st.p[0] += (cam.x - st.p[0]) * k; st.p[1] += (cam.y - st.p[1]) * k; st.p[2] += (cam.z - st.p[2]) * k;
  st.l[0] += (cam.lx - st.l[0]) * k; st.l[1] += (cam.ly - st.l[1]) * k; st.l[2] += (cam.lz - st.l[2]) * k;
  st.fov = st.fov == null || snap ? cam.fov : st.fov + (cam.fov - st.fov) * (1 - Math.exp(-dt * 4)); st.roll = st.roll == null || snap ? cam.roll : st.roll + (cam.roll - st.roll) * (1 - Math.exp(-dt * 5));
  const dx = st.l[0] - st.p[0], dy = st.l[1] - st.p[1], dz = st.l[2] - st.p[2];
  (R.world.cameras[idx] || R.world.camera).fixed = { x: st.p[0], y: st.p[1], z: st.p[2], yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, Math.hypot(dx, dy)), roll: st.roll, fov: st.fov };
};
R.chaseCam = (sh, mode, snap, idx = 0) => {
  const fr = sh.fr || R.track.frameAt(sh.s), b = R.basis(sh, fr), mps = SN.kmh(sh.v) / 3.6, kick = clamp(mps / 150, 0, 1);
  const dist = mode === 1 ? 17 : 10.5, hgt = mode === 1 ? 5.5 : 3.6;
  // camera sits behind along the track direction (not the craft's skew), so it keeps a TV-like stability
  const Fc = [fr.F[0] * .7 + b.F[0] * .3, fr.F[1] * .7 + b.F[1] * .3, fr.F[2] * .7 + b.F[2] * .3], l = Math.hypot(...Fc) || 1; Fc[0] /= l; Fc[1] /= l; Fc[2] /= l;
  const P = sh.pos, Uc = fr.U;
  if (mode === 2) { return R.pose({ x: P[0] + b.F[0] * 1.4 * U + b.U[0] * .55 * U, y: P[1] + b.F[1] * 1.4 * U + b.U[1] * .55 * U, z: P[2] + b.F[2] * 1.4 * U + b.U[2] * .55 * U, lx: P[0] + b.F[0] * 40 * U, ly: P[1] + b.F[1] * 40 * U, lz: P[2] + b.F[2] * 40 * U + b.U[2] * 4 * U, fov: 84 + kick * 14, roll: -Math.atan2(b.R[2], 1) * .9, follow: 40 }, sh, snap, idx); }
  const back = (R.lookBack ? -1 : 1);
  R.pose({ x: P[0] - Fc[0] * dist * U * back + Uc[0] * hgt * U, y: P[1] - Fc[1] * dist * U * back + Uc[1] * hgt * U, z: P[2] - Fc[2] * dist * U * back + Uc[2] * hgt * U,
    lx: P[0] + Fc[0] * 22 * U * back + Uc[0] * 1.2 * U, ly: P[1] + Fc[1] * 22 * U * back + Uc[1] * 1.2 * U, lz: P[2] + Fc[2] * 22 * U * back + Uc[2] * 1.2 * U, fov: 70 + kick * 22, roll: -Math.atan2(fr.R[2], fr.U[2]) * .3, follow: R.lookBack ? 30 : 11 }, sh, snap, idx);
};
// trackside TV camera: parked ahead of the craft, swapping when it has passed
R.tvCam = (sh, snap) => {
  const tr = R.track, st = R.tv || (R.tv = { s: -1e9, side: 1, t: 0 });
  const d = mod(sh.s - st.s + tr.L / 2, tr.L) - tr.L / 2;
  if (snap || d > 150 * U || d < -200 * U || st.t > 6) { st.s = sh.s + (70 + (SN.hashStr(String(Math.floor(sh.dist / U / 100))) % 80)) * U; st.side = (Math.floor(sh.dist / (400 * U)) % 2) ? 1 : -1; st.t = 0; st.h = 6 + (SN.hashStr('h' + Math.floor(sh.dist / (200 * U))) % 18); st.far = 22 + (SN.hashStr('f' + Math.floor(sh.dist / (300 * U))) % 40); }
  st.t += 1 / 120;
  const f = tr.frameAt(st.s), w = f.w;
  const P = [f.C[0] + f.R[0] * st.side * (w + st.far * U) + f.U[0] * st.h * U, f.C[1] + f.R[1] * st.side * (w + st.far * U) + f.U[1] * st.h * U, f.C[2] + f.R[2] * st.side * (w + st.far * U) + f.U[2] * st.h * U];
  const g = (v, a, b) => v; R.pose({ x: P[0], y: P[1], z: P[2], lx: sh.pos[0], ly: sh.pos[1], lz: sh.pos[2] + 1 * U, fov: 58, roll: 0, follow: 30 }, sh, snap || st.t < .05);
};
R.update = (race, focus, tvMode, snap) => {
  if (!R.world) return;
  R.ensureShips(race);
  for (const o of R.ships) {
    if (o.ship) {
      const sh = o.ship; if (!sh.fr) continue; const b = R.basis(sh, sh.fr);
      o.group.visible = sh.alive; R.setGroup(o.group, sh.pos, b);
    } else if (o.ghost) { const gp = o.ghost.pose; if (gp) { o.group.visible = true; R.setGroup(o.group, gp.pos, gp.basis); } else o.group.visible = false; }
  }
  if (focus && focus.fr) { if (tvMode) R.tvCam(focus, snap); else R.chaseCam(focus, R.camMode, snap); }
};
// ghost craft pose from (dist, u) samples
R.ghostPose = (tr, dist, u, v) => { const fr = tr.frameAt(mod(dist, tr.L)), pos = [fr.C[0] + fr.R[0] * u, fr.C[1] + fr.R[1] * u, fr.C[2] + fr.R[2] * u + 20]; return { pos, basis: R.basis({ psi: 0, pitchVis: 0, roll: 0 }, fr) }; };
// per-frame glows: thrusters, pickups, projectiles, shields (drawn through world.glow before world.draw)
R.glows = (race, r) => {
  const w = R.world; if (!w) return; const tr = R.track, t = performance.now() / 1000;
  for (const sh of race.ships) {
    if (!sh.alive || !sh.fr) continue; const b = R.basis(sh, sh.fr), sep = 1.05, boost = sh.boostT > 0, gc = boost ? '#8fe0ff' : sh.team.glow;
    for (const sd of [-1, 1]) { const x = sh.pos[0] - b.F[0] * 2 * U + b.R[0] * sd * sep * U, y = sh.pos[1] - b.F[1] * 2 * U + b.R[1] * sd * sep * U, z = sh.pos[2] - b.F[2] * 2 * U + b.R[2] * sd * sep * U - 1; w.glow(x, y, z, (boost ? 8 : 5) + sh.v / 600, gc); }
    if (sh.shieldT > 0) w.glow(sh.pos[0], sh.pos[1], sh.pos[2], 56, '#4aa8ff', { core: .1 });
    if (sh.control === 'human' && sh.weapon) w.glow(sh.pos[0], sh.pos[1], sh.pos[2] + 26, 6, SN.WEAPONS[sh.weapon].color);
  }
  for (const p of race.projectiles) {
    const f = tr.frameAt(p.dist, race._tmpf), x = f.C[0] + f.R[0] * p.u + f.U[0] * 24, y = f.C[1] + f.R[1] * p.u + f.U[1] * 24, z = f.C[2] + f.R[2] * p.u + f.U[2] * 24;
    const col = p.kind === 'mine' ? (Math.floor(t * 6) % 2 ? '#b6ff3a' : '#ff3b3b') : p.kind === 'tremor' ? '#c07aff' : p.kind === 'cannon' ? '#ffe14a' : '#ff6a3a';
    if (p.kind === 'tremor') { for (let k = -2; k <= 2; k++) { const ff = tr.frameAt(p.dist, race._tmpf); w.glow(ff.C[0] + ff.R[0] * k * 80 + ff.U[0] * 10, ff.C[1] + ff.R[1] * k * 80 + ff.U[1] * 10, ff.C[2] + ff.R[2] * k * 80 + ff.U[2] * 10, 12, col); } }
    else w.glow(x, y, z, p.kind === 'mine' ? 8 : 9, col, p.kind === 'mine' ? undefined : { light: true });
  }
  // pad glows
  const hf = race.human ? race.human.dist : 0;
  for (const p of tr.pads) { const dd = mod(p.s - hf % tr.L + tr.L / 2, tr.L) - tr.L / 2; if (dd < -200 || dd > 2200 * 1) { if (!(dd < -200)) continue; } if (dd < -200 || dd > 1800) continue; const f = tr.frameAt(p.s, race._tmpf), pu = p.u * (f.w - 80); w.glow(f.C[0] + f.R[0] * pu + f.U[0] * 14, f.C[1] + f.R[1] * pu + f.U[1] * 14, f.C[2] + f.R[2] * pu + f.U[2] * 14, 10, p.kind === 'boost' ? '#40d0ff' : '#ffb02e'); }
  for (const e of race._beams || []) { if (e.life > 0) { const a = e.from, bb = e.to; w.pen.tube(a[0], a[1], a[2], bb[0], bb[1], bb[2], 2, e.color); } }
};
})();
