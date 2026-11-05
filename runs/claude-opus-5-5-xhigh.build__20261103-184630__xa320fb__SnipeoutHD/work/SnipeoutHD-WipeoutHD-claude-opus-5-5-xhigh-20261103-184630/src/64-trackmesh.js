// SNIPEOUT HD: the track's meshes, built from the slices in chunks of 40 (80 m): the deck (panels, edge lines, centre
// dashes, the chequer, the grid boxes, the pit strip), walls with a neon top strip and corner chevrons, the underside
// and pylons, tunnels (arches, ribs, light strips, portals), jump lips and far edges, speed and weapon pads, the start
// gantry with its lights and timing board, a landmark arch. The overclock skin is the same build in black and neon.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16, M = 16;
const srgb = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
const LIN = {}; const lin = hex => LIN[hex] || (LIN[hex] = SN.hexToRgb(hex).map(v => srgb(v / 255)));

/** a geometry builder in engine coordinates: triangles with flat normals (turned to face `up`), vertex colours */
class GB {
  constructor() { this.p = []; this.c = []; this.n = []; }
  tri(a, b, c, col, up) {
    const ax = a[0] / U, ay = a[2] / U, az = a[1] / U, bx = b[0] / U, by = b[2] / U, bz = b[1] / U, cx = c[0] / U, cy = c[2] / U, cz = c[1] / U;
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    let flip = false; if (up) { const ux = up[0], uy = up[2], uz = up[1]; if (nx * ux + ny * uy + nz * uz < 0) flip = true; }
    if (flip) { nx = -nx; ny = -ny; nz = -nz; this.p.push(ax, ay, az, cx, cy, cz, bx, by, bz); } else this.p.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    const k = typeof col === 'string' ? lin(col) : col;
    for (let i = 0; i < 3; i++) { this.c.push(k[0], k[1], k[2]); this.n.push(nx, ny, nz); }
  }
  quad(a, b, c, d, col, up) { this.tri(a, b, c, col, up); this.tri(a, c, d, col, up); }
  get empty() { return !this.p.length; }
  mesh(mat, o = {}) {
    const THREE = E.THREE, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, mat); m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false; if (o.order) m.renderOrder = o.order; return m;
  }
}
SN.GB = GB; SN.lin = lin;

const P3 = () => [0, 0, 0];
/** the deck's point at (slice i, u, h): the lower deck in a drop */
function deckPt(T, i, u, h = 0, out = P3()) {
  const fl = T.flags[i];
  if (fl & SN.TFLAG.DROP) {
    const rx = T.Rx[i], ry = T.Ry[i], rh = Math.hypot(rx, ry) || 1, b = T.dropB[i];
    return V.set(out, T.Cx[i] + rx / rh * u + rx / rh * Math.sin(b) * h, T.Cy[i] + ry / rh * u + ry / rh * Math.sin(b) * h, T.dropZ[i] - Math.sin(b) * u + Math.cos(b) * h);
  }
  return V.set(out, T.Cx[i] + T.Rx[i] * u + T.Ux[i] * h, T.Cy[i] + T.Ry[i] * u + T.Uy[i] * h, T.Cz[i] + T.Rz[i] * u + T.Uz[i] * h);
}
const kindOf = (T, i) => T.flags[i] & SN.TFLAG.GAP ? 'gap' : T.flags[i] & SN.TFLAG.DROP ? 'drop' : 'deck';
const upOf = (T, i) => kindOf(T, i) === 'drop' ? [Math.sin(T.dropB[i]) * T.Rx[i], Math.sin(T.dropB[i]) * T.Ry[i], Math.cos(T.dropB[i])] : [T.Ux[i], T.Uy[i], T.Uz[i]];
const rOf = (T, i) => [T.Rx[i], T.Ry[i], T.Rz[i]];

/** build every mesh of a track into a world. skin: 'normal' | 'overclock'. Returns handles for animation */
SN.buildTrackMeshes = (world, T, themeId, o = {}) => {
  const THREE = E.THREE, th = SN.THEMES[themeId], oc = themeId === 'overclock', N = T.N;
  const own = x => world._own(x);
  const mats = {
    deck: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    wall: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    glow: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: !oc })),
    decal: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: !oc })),
    paint: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
    tunnel: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    pads: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: !oc }))
  };
  const neon = th.neon, panel = th.panel, out = { mats, chunks: [], padMeshes: [], lights: [], board: null };
  const CH = 40, WALL = 1.6 * M, THICK = 1.2 * M, RISE = 1;
  for (let c0 = 0; c0 < N; c0 += CH) {
    const deck = new GB(), wall = new GB(), glow = new GB(), paint = new GB(), decal = new GB(), tun = new GB();
    const c1 = Math.min(N, c0 + CH);
    for (let i = c0; i < c1; i++) {
      const j = (i + 1) % N, ki = kindOf(T, i), kj = kindOf(T, j), hwi = T.hw[i], hwj = T.hw[j], s = i * T.ds;
      const upI = upOf(T, i);
      const same = ki === kj && ki !== 'gap';
      if (same) {
        // the deck: 6 strips across, panels alternating every 8 m, the edge lanes a little lighter
        const cols = 6;
        for (let k = 0; k < cols; k++) {
          const ua = -1 + 2 * k / cols, ub = -1 + 2 * (k + 1) / cols;
          const a = deckPt(T, i, ua * hwi), b = deckPt(T, j, ua * hwj), cc = deckPt(T, j, ub * hwj), d = deckPt(T, i, ub * hwi);
          const alt = (Math.floor(i / 4) + k) & 1;
          let col = oc ? (alt ? '#05050a' : '#08080e') : panel[alt];
          if (!oc && (k === 0 || k === cols - 1)) col = SN.mix(panel[alt], '#4a5060', .35);
          deck.quad(a, b, cc, d, col, upI);
        }
        // the underside and the deck's thickness (a bridge), on solid decks
        const a0 = deckPt(T, i, -hwi, -THICK), b0 = deckPt(T, j, -hwj, -THICK), c2 = deckPt(T, j, hwj, -THICK), d0 = deckPt(T, i, hwi, -THICK);
        wall.quad(a0, b0, c2, d0, oc ? '#000000' : '#16181e', upI.map(v => -v));
        for (const side of [-1, 1]) { const e0 = deckPt(T, i, side * hwi), e1 = deckPt(T, j, side * hwj), f0 = deckPt(T, i, side * hwi, -THICK), f1 = deckPt(T, j, side * hwj, -THICK); wall.quad(e0, e1, f1, f0, oc ? '#000000' : '#2a2e38', rOf(T, i).map(v => v * side)); }
        // markings: edge lines (1 m in), centre dashes, the chequer at the line, the pit strip
        const lineC = oc ? '#ffffff' : '#c8d4e8';
        for (const side of [-1, 1]) {
          const u0 = side * (hwi - 1.4 * M), u1 = side * (hwi - .9 * M), w0 = side * (hwj - 1.4 * M), w1 = side * (hwj - .9 * M);
          decal.quad(deckPt(T, i, u0, RISE), deckPt(T, j, w0, RISE), deckPt(T, j, w1, RISE), deckPt(T, i, u1, RISE), lineC, upI);
        }
        if (Math.floor(i / 3) % 2 === 0) decal.quad(deckPt(T, i, -.25 * M, RISE), deckPt(T, j, -.25 * M, RISE), deckPt(T, j, .25 * M, RISE), deckPt(T, i, .25 * M, RISE), oc ? '#ffffff' : '#7a8498', upI);
        if (oc && i % 2 === 0) for (let k = -3; k <= 3; k++) decal.quad(deckPt(T, i, k * 4 * M - .15 * M, RISE), deckPt(T, j, k * 4 * M - .15 * M, RISE), deckPt(T, j, k * 4 * M + .15 * M, RISE), deckPt(T, i, k * 4 * M + .15 * M, RISE), '#ffffff', upI);
        if (oc && i % 2 === 0) decal.quad(deckPt(T, i, -hwi, RISE), deckPt(T, i, -hwi, RISE + 2), deckPt(T, i, hwi, RISE + 2), deckPt(T, i, hwi, RISE), '#ffffff', upI);
        const sd = T.dS(0, s);
        if (sd > -2 * M && sd < 2 * M && !oc) for (let k = -7; k < 7; k++) { const u0 = k * hwi / 7, u1 = (k + 1) * hwi / 7; paint.quad(deckPt(T, i, u0, RISE), deckPt(T, j, u0, RISE), deckPt(T, j, u1, RISE), deckPt(T, i, u1, RISE), ((k + (i & 1)) & 1) ? '#f4f4f4' : '#101010', upI); }
        if (T.pit && T.flags[i] & SN.TFLAG.PIT && T.flags[j] & SN.TFLAG.PIT) {
          const sg = T.pit.side, u0 = sg * (hwi - T.pit.w), u1 = sg * (hwi - .3 * M);
          decal.quad(deckPt(T, i, u0, RISE + .5), deckPt(T, j, u0, RISE + .5), deckPt(T, j, u1, RISE + .5), deckPt(T, i, u1, RISE + .5), i % 6 < 3 ? '#103a26' : '#144a30', upI);
          if (i % 6 === 0) { const um = (u0 + u1) / 2; decal.quad(deckPt(T, i, um - .3 * M, RISE + 1), deckPt(T, j, um - .3 * M, RISE + 1), deckPt(T, j, um + .3 * M, RISE + 1), deckPt(T, i, um + .3 * M, RISE + 1), '#3aff8a', upI); decal.quad(deckPt(T, i, um - 1.2 * M, RISE + 1), deckPt(T, i, um - 1.2 * M, RISE + 1), deckPt(T, i, um + 1.2 * M, RISE + 1), deckPt(T, i, um + 1.2 * M, RISE + 1), '#3aff8a', upI); }
        }
        // walls: a barrier panel 1.6 m tall (inner face, top, outer face), a neon strip along the top; chevrons on the
        // outside of corners pointing the way of the turn
        const tunnelHere = T.flags[i] & SN.TFLAG.TUNNEL;
        for (const side of [-1, 1]) {
          const open = side < 0 ? T.flags[i] & SN.TFLAG.OPEN_L : T.flags[i] & SN.TFLAG.OPEN_R;
          if (open) { if (i % 2 === 0) decal.quad(deckPt(T, i, side * (hwi - .4 * M), RISE), deckPt(T, j, side * (hwj - .4 * M), RISE), deckPt(T, j, side * hwj, RISE), deckPt(T, i, side * hwi, RISE), '#ffd23f', upI); continue; }
          const e0 = deckPt(T, i, side * hwi), e1 = deckPt(T, j, side * hwj), t0 = deckPt(T, i, side * hwi, WALL), t1 = deckPt(T, j, side * hwj, WALL);
          const o0 = deckPt(T, i, side * (hwi + .5 * M), WALL), o1 = deckPt(T, j, side * (hwj + .5 * M), WALL), b0 = deckPt(T, i, side * (hwi + .5 * M), -THICK), b1 = deckPt(T, j, side * (hwj + .5 * M), -THICK);
          const inward = rOf(T, i).map(v => -v * side), pc = oc ? '#06060c' : (Math.floor(i / 3) & 1 ? '#3a4050' : '#454c5e');
          wall.quad(e0, e1, t1, t0, pc, inward); wall.quad(t0, t1, o1, o0, oc ? '#000000' : '#5a6070', upI); wall.quad(o0, o1, b1, b0, oc ? '#000000' : '#30343e', inward.map(v => -v));
          const g0 = deckPt(T, i, side * (hwi - .05 * M), WALL - .35 * M), g1 = deckPt(T, j, side * (hwj - .05 * M), WALL - .35 * M), h0 = deckPt(T, i, side * (hwi - .05 * M), WALL - .05 * M), h1 = deckPt(T, j, side * (hwj - .05 * M), WALL - .05 * M);
          glow.quad(g0, g1, h1, h0, neon, inward);
          const kap = T.kappa[i], outside = Math.sign(kap) === -side;
          if (!tunnelHere && Math.abs(kap) > 1 / (180 * M) && outside && i % 3 === 0) {
            // an arrow on the inner face: pointing toward the turn's way (along the track, bending to the inside)
            const m0 = deckPt(T, i, side * (hwi - .1 * M), .3 * M), m1 = deckPt(T, j, side * (hwj - .1 * M), .8 * M), m2 = deckPt(T, i, side * (hwi - .1 * M), 1.3 * M);
            glow.tri(m0, m1, m2, oc ? '#ffffff' : '#ffb000', inward);
          }
        }
        // tunnels: an arch from the walls' tops to 12 m, ribs every 12 m, light strips high on both sides
        if (tunnelHere) {
          const style = (T.tunnels.find(t => T.dS(t.s0, s) >= 0 && T.dS(s, t.s1) >= 0) || { style: 'stone' }).style;
          const base = oc ? '#04040a' : { stone: '#6a5a4a', rock: '#7a4a30', neon: '#1a1a28', ice: '#7ab8e0' }[style] || '#5a5a60';
          const SEG = 10, rib = i % 6 === 0;
          for (let k = 0; k < SEG; k++) {
            const a0 = k / SEG * Math.PI, a1 = (k + 1) / SEG * Math.PI;
            const pt = (ii, hw, a) => deckPt(T, ii, Math.cos(a) * (hw + .3 * M), WALL + (12 * M - WALL) * Math.sin(a));
            const col = rib ? SN.mix(base, '#000000', .35) : (k & 1 ? base : SN.mix(base, '#ffffff', .06));
            tun.quad(pt(i, hwi, a0), pt(j, hwj, a0), pt(j, hwj, a1), pt(i, hwi, a1), col, upI.map(v => -v));
            if (k === 2 || k === SEG - 3) glow.quad(pt(i, hwi - .2 * M, a0 + .05), pt(j, hwj - .2 * M, a0 + .05), pt(j, hwj - .2 * M, a1 - .05), pt(i, hwi - .2 * M, a1 - .05), oc ? '#ffffff' : style === 'neon' ? (i % 12 < 6 ? '#ff3ab4' : '#7af0ff') : style === 'ice' ? '#bff8ff' : '#ffd8a0', upI.map(v => -v));
          }
        }
      }
      // jump faces: the lip's drop to the lower deck or into the gap, the far edge's face, the hazard stripe at the lip
      if (ki !== kj) {
        const from = ki === 'deck' ? i : j, to = ki === 'deck' ? j : i, down = (kj === 'gap' || ki === 'gap') ? 30 * M : null;
        for (let k = 0; k < 6; k++) {
          const u0 = (-1 + 2 * k / 6) * T.hw[from], u1 = (-1 + 2 * (k + 1) / 6) * T.hw[from];
          const a = deckPt(T, from, u0), b = deckPt(T, from, u1), bz = down ? null : deckPt(T, to, 0)[2];
          const c = [b[0], b[1], down ? b[2] - down : bz], d = [a[0], a[1], down ? a[2] - down : bz];
          wall.quad(a, b, c, d, oc ? '#000000' : '#3a3e48', [T.Fx[from] * (ki === 'deck' ? 1 : -1), T.Fy[from] * (ki === 'deck' ? 1 : -1), 0]);
        }
        if (ki === 'deck') for (let k = -6; k < 6; k++) { const ii = (i - 2 + N) % N, u0 = k * hwi / 6, u1 = (k + 1) * hwi / 6; decal.quad(deckPt(T, ii, u0, RISE), deckPt(T, i, u0, RISE), deckPt(T, i, u1, RISE), deckPt(T, ii, u1, RISE), (k & 1) ? '#ffd23f' : '#1a1a1a', upI); }
      }
    }
    for (const [g, mat, opt] of [[deck, mats.deck, {}], [wall, mats.wall, {}], [glow, mats.glow, { shadow: false }], [decal, mats.decal, { shadow: false, order: 1 }], [paint, mats.paint, { shadow: false, order: 1 }], [tun, mats.tunnel, {}]]) {
      if (g.empty) continue; const m = g.mesh(mat, opt); world.scene.add(m); out.chunks.push(m);
    }
  }
  // tunnel portals: a facade round each end of the arch, by style
  {
    const g = new GB(), gl = new GB();
    for (const tn of T.tunnels) for (const end of [tn.s0, tn.s1]) {
      const i = T.idx(end), hw = T.hw[i], up = upOf(T, i), f = [T.Fx[i] * (end === tn.s0 ? -1 : 1), T.Fy[i] * (end === tn.s0 ? -1 : 1), 0];
      const base = oc ? '#04040a' : { stone: '#8a7a64', rock: '#8a5a3a', neon: '#22222e', ice: '#a8d8f4' }[tn.style] || '#6a6a70';
      const SEG = 12, W2 = hw + 9 * M, H2 = 17 * M;
      for (let k = 0; k < SEG; k++) {
        const a0 = k / SEG * Math.PI, a1 = (k + 1) / SEG * Math.PI;
        const ip = a => deckPt(T, i, Math.cos(a) * (hw + .3 * M), WALL + (12 * M - WALL) * Math.sin(a)), op = a => deckPt(T, i, Math.cos(a) * W2, a < .01 || a > Math.PI - .01 ? 0 : H2 * Math.min(1, Math.sin(a) * 2.2));
        g.quad(ip(a0), ip(a1), op(a1), op(a0), base, f);
      }
      for (const side of [-1, 1]) g.quad(deckPt(T, i, side * (hw + .3 * M), 0), deckPt(T, i, side * (hw + .3 * M), WALL), deckPt(T, i, side * W2, WALL), deckPt(T, i, side * W2, 0), base, f);
      const glc = oc ? '#ffffff' : tn.style === 'neon' ? '#ff3ab4' : tn.style === 'ice' ? '#bff8ff' : '#ffb347';
      for (let k = 0; k < SEG; k++) { const a0 = k / SEG * Math.PI, a1 = (k + 1) / SEG * Math.PI, p = (a, r) => deckPt(T, i, Math.cos(a) * (hw + r), WALL + (12 * M - WALL + r) * Math.sin(a)); gl.quad(p(a0, .4 * M), p(a1, .4 * M), p(a1, 1 * M), p(a0, 1 * M), glc, f); }
    }
    if (!g.empty) { const m = g.mesh(mats.wall); world.scene.add(m); out.chunks.push(m); }
    if (!gl.empty) { const m = gl.mesh(mats.glow, { shadow: false }); world.scene.add(m); out.chunks.push(m); }
  }
  // pylons where the deck stands more than 4 m above the ground, kept out of other sections' driving space
  if (!oc && o.terrain) {
    const items = [];
    for (let i = 0; i < N; i += 20) {
      if (T.flags[i] & (SN.TFLAG.GAP | SN.TFLAG.TUNNEL)) continue;
      for (const side of [-1, 1]) {
        const p = deckPt(T, i, side * (T.hw[i] - 1 * M), -THICK), gz = o.terrain.height(p[0], p[1]);
        if (p[2] - gz < 4 * M) continue;
        let clash = false; for (const j of T.bucketAt(p[0], p[1])) { if (Math.abs(T.dS(i * T.ds, j * T.ds)) < 100 * M) continue; if (Math.hypot(p[0] - T.Cx[j], p[1] - T.Cy[j]) < T.hw[j] + 3 * M && T.Cz[j] < p[2]) clash = true; }
        if (clash) continue;
        items.push({ x: p[0], y: p[1], z: gz - 2 * M, sx: 2.2 * M, sy: 2.2 * M, sz: p[2] - gz + 2 * M, color: '#5a5e6a', yaw: T.heading[i] });
      }
    }
    if (items.length) SN.instanced(world, own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshLambertNodeMaterial({ color: '#ffffff' })), items);
  }
  // the pads: speed pads (a dark base and three chevrons whose colours run front to back) and weapon pads (amber, a
  // triangle sigil, a light post at the edge); one mesh each for the whole track, recoloured as they animate
  {
    const base = new GB(), chev = new GB(), wp = new GB(), chevInfo = [];
    for (const p of T.pads) {
      const i = T.idx(p.s), up = upOf(T, i), at = (ds, du, h = 1.5) => { const ii = T.idx(p.s + ds); return deckPt(T, ii, p.u + du, h); };
      if (p.kind === 'speed') {
        base.quad(at(-p.hl, -p.hw), at(p.hl, -p.hw), at(p.hl, p.hw), at(-p.hl, p.hw), oc ? '#000000' : '#0a2a4a', up);
        for (let k = 0; k < 3; k++) {
          const s0 = -p.hl + (k + .5) * p.hl * 2 / 3, L = p.hl * .45;
          const v0 = chev.c.length; chev.quad(at(s0 - L, -p.hw * .8, 2), at(s0 + L * .4, 0, 2), at(s0 + L * .4 + L * .5, 0, 2), at(s0 - L + L * .5, -p.hw * .8, 2), '#3ad8ff', up);
          chev.quad(at(s0 - L, p.hw * .8, 2), at(s0 + L * .4, 0, 2), at(s0 + L * .4 + L * .5, 0, 2), at(s0 - L + L * .5, p.hw * .8, 2), '#3ad8ff', up);
          chevInfo.push({ from: v0, to: chev.c.length, k });
        }
      } else {
        wp.quad(at(-p.hl, -p.hw), at(p.hl, -p.hw), at(p.hl, p.hw), at(-p.hl, p.hw), '#ffb000', up);
        wp.quad(at(-p.hl + 8, -p.hw + 8, 2), at(p.hl - 8, -p.hw + 8, 2), at(p.hl - 8, p.hw - 8, 2), at(-p.hl + 8, p.hw - 8, 2), '#3a2400', up);
        wp.tri(at(-p.hl * .5, -p.hw * .55, 2.5), at(p.hl * .6, 0, 2.5), at(-p.hl * .5, p.hw * .55, 2.5), '#ffd23f', up);
      }
    }
    if (!base.empty) { const m = base.mesh(mats.pads, { shadow: false, order: 2 }); world.scene.add(m); }
    if (!wp.empty) { const m = wp.mesh(mats.pads, { shadow: false, order: 2 }); world.scene.add(m); out.weaponPadMesh = m; }
    if (!chev.empty) { const m = chev.mesh(mats.pads, { shadow: false, order: 3 }); world.scene.add(m); out.chev = { mesh: m, info: chevInfo }; }
  }
  // the start gantry: two towers, a beam, three start lights, a timing board, team flags
  {
    const g = new GB(), i = T.idx(4 * M), hw = T.hw[i] + 2 * M, up = upOf(T, i);
    for (const side of [-1, 1]) for (const [du, w] of [[0, 1.6 * M]]) {
      const a = deckPt(T, i, side * hw, -2 * M), f = [T.Fx[i], T.Fy[i], 0], r = rOf(T, i);
      const box = (c, sx, sy, sz, col) => { const hx = [f[0] * sx / 2, f[1] * sx / 2, 0], hy = [r[0] * sy / 2, r[1] * sy / 2, r[2] * sy / 2], hz = [0, 0, sz]; const p = (a1, b1, c1) => [c[0] + hx[0] * a1 + hy[0] * b1 + hz[0] * c1, c[1] + hx[1] * a1 + hy[1] * b1 + hz[1] * c1, c[2] + hx[2] * a1 + hy[2] * b1 + hz[2] * c1];
        g.quad(p(-1, -1, 0), p(1, -1, 0), p(1, -1, 1), p(-1, -1, 1), col, hy.map(v => -v)); g.quad(p(-1, 1, 0), p(1, 1, 0), p(1, 1, 1), p(-1, 1, 1), col, hy); g.quad(p(-1, -1, 0), p(-1, 1, 0), p(-1, 1, 1), p(-1, -1, 1), col, hx.map(v => -v)); g.quad(p(1, -1, 0), p(1, 1, 0), p(1, 1, 1), p(1, -1, 1), col, hx); g.quad(p(-1, -1, 1), p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), col, [0, 0, 1]); };
      box(a, w, w, 14 * M, oc ? '#05050a' : '#2a2e3a');
    }
    const top = deckPt(T, i, 0, 11 * M); const f = [T.Fx[i], T.Fy[i], 0], r = rOf(T, i);
    const beam = (c, len, hh, col) => { const p = (u, z) => [c[0] + r[0] * u, c[1] + r[1] * u, c[2] + z]; g.quad(p(-len, 0), p(len, 0), p(len, hh), p(-len, hh), col, f.map(v => -v)); g.quad(p(-len, 0), p(len, 0), p(len, hh), p(-len, hh), col, f); };
    beam(top, hw, 3 * M, oc ? '#05050a' : '#1a1e28');
    const m = g.mesh(mats.wall); world.scene.add(m);
    // the three start lights (their own materials: red, then green at GO) and a timing board (a canvas texture)
    const lightMats = [0, 1, 2].map(() => own(new THREE.MeshBasicNodeMaterial({ color: '#300000' })));
    const geo = own(new THREE.CircleGeometry(1.1, 16));
    out.startLights = lightMats.map((mt, k) => { const ms = new THREE.Mesh(geo, mt), p = [top[0] + r[0] * (k - 1) * 4 * M - f[0] * 8, top[1] + r[1] * (k - 1) * 4 * M - f[1] * 8, top[2] + 1.5 * M]; ms.position.set(p[0] / U, p[2] / U, p[1] / U); ms.lookAt((p[0] - f[0] * 400) / U, p[2] / U, (p[1] - f[1] * 400) / U); world.scene.add(ms); return mt; });
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const tex = own(SN.canvasTex(cv));
    const bm = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), own(new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide })));
    const bp = [top[0] + r[0] * (hw * .62) - f[0] * 8, top[1] + r[1] * (hw * .62) - f[1] * 8, top[2] + 1.5 * M]; bm.position.set(bp[0] / U, bp[2] / U, bp[1] / U); bm.lookAt((bp[0] - f[0] * 400) / U, bp[2] / U, (bp[1] - f[1] * 400) / U); bm.scale.set(8, 2, 1); world.scene.add(bm);
    out.board = { cv, tex, last: '' };
    // team flags over the beam
    const fl = new GB(); SN.TEAM_ORDER.forEach((t, k) => { const c = SN.TEAMS[t].colors, u = (k - 2.5) * hw / 3.2, p = (du, z) => [top[0] + r[0] * (u + du) + f[0] * 4, top[1] + r[1] * (u + du) + f[1] * 4, top[2] + 3 * M + z]; fl.quad(p(-1.4 * M, 0), p(1.4 * M, 0), p(1.4 * M, 2.4 * M), p(-1.4 * M, 2.4 * M), c.primary, f); fl.quad(p(-1.4 * M, .8 * M), p(1.4 * M, .8 * M), p(1.4 * M, 1.6 * M), p(-1.4 * M, 1.6 * M), c.secondary, f); });
    world.scene.add(fl.mesh(mats.glow, { shadow: false }));
  }
  // a landmark arch over the track (Port Solenne's "SOLENNE 2161" at cp3, others at their third control point)
  if (!oc) {
    const s = T.sOf({ cp: 3, d: 0 }), i = T.idx(s), hw = T.hw[i] + 4 * M, g = new GB(), up = upOf(T, i), f = [T.Fx[i], T.Fy[i], 0];
    if (!(T.flags[i] & (SN.TFLAG.GAP | SN.TFLAG.DROP | SN.TFLAG.TUNNEL))) {
      const SEG = 14; for (let k = 0; k < SEG; k++) { const a0 = k / SEG * Math.PI, a1 = (k + 1) / SEG * Math.PI, p = (a, r) => deckPt(T, i, Math.cos(a) * r, 22 * M * Math.sin(a)); g.quad(p(a0, hw), p(a1, hw), p(a1, hw + 2 * M), p(a0, hw + 2 * M), neon, f); }
      world.scene.add(g.mesh(mats.glow, { shadow: false }));
    }
  }
  return out;
};

/** each frame: the speed pads' chevrons run front to back, the start lights, the timing board */
SN.animateTrack = (TM, race, t) => {
  if (!TM) return;
  if (TM.chev) {
    const col = TM.chev.mesh.geometry.attributes.color, a = col.array, phase = t * 6;
    for (const c of TM.chev.info) { const k = ((Math.floor(phase) - c.k) % 3 + 3) % 3, rgb = k === 0 ? [1, 1, 1] : k === 1 ? lin('#3ad8ff') : lin('#0a5a8a'); for (let v = c.from; v < c.to; v += 3) { a[v] = rgb[0]; a[v + 1] = rgb[1]; a[v + 2] = rgb[2]; } }
    col.needsUpdate = true;
  }
  if (TM.startLights && race) {
    const st = race.state, n = st === 'countdown' ? Math.min(3, Math.floor(race.stateT) + 1) : 0, go = st === 'racing' && race.t < 4;
    TM.startLights.forEach((m, k) => m.color.set(go ? '#3aff6a' : k < n ? '#ff2020' : '#300000'));
  }
  if (TM.board && race) {
    const txt = race.state === 'racing' || race.state === 'finished' ? SN.fmtTime(race.t) : race.state === 'countdown' ? 'READY' : SN.TRACKS[race.track.id].name.slice(0, 12);
    if (txt !== TM.board.last) {
      TM.board.last = txt; const g = TM.board.cv.getContext('2d'); g.fillStyle = '#05060a'; g.fillRect(0, 0, 128, 32);
      E.font.text(g, txt, 64, 9, '#ffd36a', { align: 'center', scale: 2, outline: false }); TM.board.tex.needsUpdate = true;
    }
  }
};
})();
