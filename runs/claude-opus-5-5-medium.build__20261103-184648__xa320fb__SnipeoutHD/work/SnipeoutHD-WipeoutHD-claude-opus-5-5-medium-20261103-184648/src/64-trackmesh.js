// Track meshes (§3.7): the banked deck (graphite panels, edge lines, centre dashes, the chequered line, grid boxes, the
// pit strip), its underside and pylons, walls with a neon top and turn chevrons, hazard edges, tunnels with ribs and
// light strips, speed and weapon pads, the start gantry (lights, timing board), sponsor gantries, sector boards, the
// landmark arch, jump lips and faces. Built in three.js metres from the track's slices
(() => {
const SN = globalThis.SN, E = My3D2dge;
const M = 1 / 16;
const t3 = (x, y, z) => [x * M, z * M, y * M];   // engine units -> three metres

/** a canvas texture drawn with the engine's pixel font (crisp: nearest filter) */
SN.textTexture = (w, h, draw) => {
  const THREE = E.THREE, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  draw(g, w, h); const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.canvas = cv; t.g = g;
  return t;
};
SN.SPONSORS = [
  ['QWIK-FUEL', 'FILL UP. FALL UP.', '#ff5a2a', '#ffe23a'], ['OKTA NOODLE', 'EAT AT 600 KM/H', '#ffb000', '#1a1a20'], ['HALCYON BANK', 'YOUR MONEY, FASTER', '#2a6aff', '#ffffff'],
  ['AXON AIR', 'BREATHE PREMIUM', '#3ae8d0', '#0a2030'], ['VANTA PAINTS', 'DARKER THAN NOTHING', '#0a0a0e', '#e8e8f0'], ['MERIDIAN TELECOM', 'ALWAYS ON. ALWAYS.', '#ff3ab4', '#ffffff'],
  ['POLARIS COLD STORAGE', 'WE KEEP IT FROM YOU', '#9ad8ff', '#0a2a4a'], ['NOVA-CHROME', 'SHINE RESPONSIBLY', '#d8d8e8', '#2a2a3a'], ['KIBO TEA', 'STEEPED IN THE FUTURE', '#5aaa3a', '#f0f0d0'],
  ['ORBIT SOCKS', 'KEEP YOUR FEET IN ORBIT', '#ff4a8a', '#ffffff'], ['THE AUTHORITY', 'DO NOT LOOK DIRECTLY AT THE FUTURE', '#f0f0f0', '#c8202a'], ['SOLENNE TOURISM', 'COME FOR THE SEA. STAY FOR THE SPEED.', '#29c8e8', '#ffffff']
];
SN.sponsorTexture = (k, wide = 256) => {
  const [name, slogan, bg, fg] = SN.SPONSORS[k % SN.SPONSORS.length];
  return SN.textTexture(wide, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
    // a geometric mark
    g.fillStyle = fg; for (let i = 0; i < 3; i++) g.fillRect(8 + i * 7, 14 + i * 4, 5, 26 - i * 8);
    E.font.text(g, name, 36, 10, fg, { scale: name.length > 14 ? 2 : 3, outline: false });
    E.font.text(g, slogan, 36, 44, fg, { scale: 1, outline: false });
  });
};

/** the deck, walls, neon and the rest of a track as meshes added to the world's scene; returns the animated parts */
function build(world, T, themeId, o = {}) {
  const THREE = E.THREE, th = SN.THEMES[themeId], sc = world.scene, own = x => world._own(x), n = T.n;
  const C = T.C, R = T.R, Up = T.Up, F = T.F, hw = T.hw, kind = T.kind, flags = T.flags, overclock = themeId === 'overclock';
  const pt = (i, u, h = 0) => [C[i * 3] + R[i * 3] * u + Up[i * 3] * h, C[i * 3 + 1] + R[i * 3 + 1] * u + Up[i * 3 + 1] * h, C[i * 3 + 2] + R[i * 3 + 2] * u + Up[i * 3 + 2] * h];
  const P3 = (i, u, h) => { const p = pt(i, u, h); return t3(p[0], p[1], p[2]); };
  const mats = {
    deck: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    neon: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    grid: own(new THREE.MeshBasicNodeMaterial({ color: th.neon, side: THREE.DoubleSide })),
    deco: own(new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    pad: [0, 1, 2].map(() => own(new THREE.MeshBasicNodeMaterial({ color: '#3ad8ff', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))),
    wpad: own(new THREE.MeshBasicNodeMaterial({ color: '#ffb000', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
    padBase: own(new THREE.MeshBasicNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })),
    lights: [0, 1, 2].map(() => own(new THREE.MeshBasicNodeMaterial({ color: '#300808' })))
  };
  const out = { mats, meshes: [], boards: [], theme: th };
  const add = (geo, mat, shadow = false) => { const m = new THREE.Mesh(own(geo.build ? geo.build() : geo), mat); m.receiveShadow = shadow; m.castShadow = false; sc.add(m); out.meshes.push(m); return m; };
  const deckCol = th.deck, neon = th.neon, edge = overclock ? neon : '#d8dce4';
  // chunks of 40 slices
  const LAT = [-1, -.95, -.55, -.04, .04, .55, .95, 1];
  for (let c0 = 0; c0 < n; c0 += 40) {
    const g = new SN.Geo(), gl = new SN.Geo(), gu = new SN.Geo();
    for (let i = c0; i < Math.min(n, c0 + 40); i++) {
      const j = (i + 1) % n; if (kind[i] === 1 || kind[j] === 1) continue;
      const step = kind[i] !== kind[j];   // the lip of a drop: no deck across it
      if (step) continue;
      const s = i * T.ds, panel = (i >> 2) & 1, pit = flags[i] & 2, startLine = Math.abs(SN.wrapDiff(0, s, T.L)) < 3 * 16;
      for (let k = 0; k < 7; k++) {
        const ua = LAT[k] * hw[i], ub = LAT[k + 1] * hw[i], uc = LAT[k + 1] * hw[j], ud = LAT[k] * hw[j];
        let col = overclock ? '#050508' : deckCol[panel];
        if (k === 0 || k === 6) col = (flags[i] & (k === 0 ? 4 : 8)) ? (((i >> 1) & 1) ? '#ffd020' : '#181818') : edge;
        else if (k === 3) col = (i >> 2) % 3 === 0 && !overclock ? '#c8ccd4' : col;
        if (pit && !overclock && T.pit && ((T.pit.side > 0 && k >= 5 && k < 6) || (T.pit.side < 0 && k === 1))) col = (i % 6 < 2) ? '#5aff9a' : '#1f5a3a';
        if (startLine && !overclock) col = ((k + (i >> 0)) & 1) ? '#f4f4f4' : '#141414';
        for (const gs of T.grid) if (Math.abs(SN.wrapDiff(gs.s, s, T.L)) < T.ds * .8 && ((gs.u < 0 && (k === 1 || k === 2)) || (gs.u > 0 && (k === 4 || k === 5)))) col = '#e8e8e8';
        const shade = overclock ? col : SN.shade(col, ((E.hash2(i >> 2, k) - .5) * .12));
        g.quad(P3(i, ua, 0), P3(j, ud, 0), P3(j, uc, 0), P3(i, ub, 0), shade);
      }
      // underside and deck sides
      const dark = overclock ? '#020204' : '#2a2c34';
      gu.quad(P3(i, -hw[i], -19), P3(i, hw[i], -19), P3(j, hw[j], -19), P3(j, -hw[j], -19), dark);
      for (const sd of [-1, 1]) gu.quad(P3(i, sd * hw[i], 0), P3(j, sd * hw[j], 0), P3(j, sd * hw[j], -19), P3(i, sd * hw[i], -19), SN.shade(dark, .3));
      // walls (1.6 m) with a neon top; chevrons on the outside of curves
      for (const sd of [-1, 1]) {
        if (flags[i] & (sd < 0 ? 4 : 8)) continue;
        const wc = overclock ? '#0a0a12' : th.wall;
        g.quad(P3(i, sd * hw[i], 0), P3(i, sd * hw[i], 26), P3(j, sd * hw[j], 26), P3(j, sd * hw[j], 0), SN.shade(wc, sd * .05 - ((i >> 3) & 1) * .08));
        g.quad(P3(i, sd * (hw[i] + 10), 26), P3(i, sd * hw[i], 26), P3(j, sd * hw[j], 26), P3(j, sd * (hw[j] + 10), 26), SN.shade(wc, -.3));
        g.quad(P3(i, sd * (hw[i] + 10), 0), P3(i, sd * (hw[i] + 10), 26), P3(j, sd * (hw[j] + 10), 26), P3(j, sd * (hw[j] + 10), 0), SN.shade(wc, -.4));
        gl.quad(P3(i, sd * (hw[i] - .5), 22), P3(i, sd * (hw[i] - .5), 27), P3(j, sd * (hw[j] - .5), 27), P3(j, sd * (hw[j] - .5), 22), neon);
        const kap = T.kappa[i], outer = Math.sign(kap) === -sd && Math.abs(kap) > 1 / (220 * 16);
        if (outer && i % 3 === 0 && !(flags[i] & 1)) {   // a chevron pointing the way through the turn
          const u = sd * (hw[i] - .8), a = P3(i, u, 6), b = P3((i + 2) % n, u, 13), c = P3(i, u, 20), d = P3((i + 1) % n, u, 13);
          gl.tri(a, b, d, ((i / 3) & 1) ? '#ffffff' : neon); gl.tri(d, b, c, ((i / 3) & 1) ? '#ffffff' : neon);
        }
      }
    }
    if (g.p.length) add(g, mats.deck, true);
    if (gl.p.length) add(gl, mats.neon);
    if (gu.p.length) add(gu, mats.deck);
  }
  // overclock: an emissive grid over the deck (lines along every quarter width, a cross line every 4 m)
  if (overclock) {
    const lines = new SN.Geo(), mid = (A, B, k) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n; if (kind[i] === 1 || kind[j] === 1 || kind[i] !== kind[j]) continue;
      for (const f of [-.75, -.5, -.25, 0, .25, .5, .75]) lines.quad(P3(i, f * hw[i] - 1, .7), P3(j, f * hw[j] - 1, .7), P3(j, f * hw[j] + 1, .7), P3(i, f * hw[i] + 1, .7), '#ffffff');
      if (i % 2 === 0) { const a0 = P3(i, -hw[i], .7), a1 = P3(i, hw[i], .7), b0 = P3(j, -hw[j], .7), b1 = P3(j, hw[j], .7); lines.quad(a0, a1, mid(a1, b1, .12), mid(a0, b0, .12), '#ffffff'); }
    }
    out.gridMeshes = [add(lines, mats.grid)];
  }
  // jump lips and faces (a hazard stripe on the lip, the lip face down, the far face of a gap)
  for (const j of T.jumps) {
    const g = new SN.Geo(), li = (j.lipI - 1 + n) % n, fi = j.farI, depth = j.kind === 'gap' ? 70 * 16 : (j.zLip - j.z1);
    for (let k = 0; k < 8; k++) { const u0 = -hw[li] + k * hw[li] / 4, u1 = u0 + hw[li] / 4; g.quad(P3(li, u0, .8), P3(li, u1, .8), P3((li - 1 + n) % n, u1, .8), P3((li - 1 + n) % n, u0, .8), k & 1 ? '#ffd020' : '#141414'); }
    const face = (i, d, col) => { for (let k = 0; k < 4; k++) { const u0 = -hw[i] + k * hw[i] / 2, u1 = u0 + hw[i] / 2; g.quad(P3(i, u0, -19), P3(i, u1, -19), P3(i, u1, -d), P3(i, u0, -d), SN.shade(col, k % 2 ? -.1 : 0)); } };
    face(li, depth, overclock ? '#101018' : '#4a4a52');
    if (j.kind === 'gap') face(fi, depth, overclock ? '#101018' : '#5a3a2a');
    add(g, mats.deck);
    if (j.kind === 'gap') { const gl = new SN.Geo(); gl.quad(P3(fi, -hw[fi], .9), P3(fi, hw[fi], .9), P3((fi + 1) % n, hw[fi], .9), P3((fi + 1) % n, -hw[fi], .9), '#ff3a3a'); add(gl, mats.neon); }
  }
  // pads
  const padsG = [new SN.Geo(), new SN.Geo(), new SN.Geo()], base = new SN.Geo(), wg = new SN.Geo();
  const sP = (s, u, h) => { const p = T.point(s, u, h); return t3(p[0], p[1], p[2]); };
  for (const p of T.speedPads) {
    base.quad(sP(p.s - p.hl, p.u - p.hwid, .5), sP(p.s - p.hl, p.u + p.hwid, .5), sP(p.s + p.hl, p.u + p.hwid, .5), sP(p.s + p.hl, p.u - p.hwid, .5), '#0a2a4a');
    for (let k = 0; k < 3; k++) { const s0 = p.s - p.hl + 8 + k * (p.hl * 2 - 16) / 3, s1 = s0 + 18, s2 = s0 + 30; const g = padsG[k]; g.quad(sP(s0, p.u - p.hwid + 6, 1), sP(s1, p.u, 1), sP(s2, p.u, 1), sP(s0 + 12, p.u - p.hwid + 6, 1), '#ffffff'); g.quad(sP(s1, p.u, 1), sP(s0, p.u + p.hwid - 6, 1), sP(s0 + 12, p.u + p.hwid - 6, 1), sP(s2, p.u, 1), '#ffffff'); }
  }
  for (const p of T.weaponPads) {
    base.quad(sP(p.s - p.hl, p.u - p.hwid, .5), sP(p.s - p.hl, p.u + p.hwid, .5), sP(p.s + p.hl, p.u + p.hwid, .5), sP(p.s + p.hl, p.u - p.hwid, .5), '#4a2a00');
    wg.quad(sP(p.s - p.hl + 4, p.u - p.hwid + 4, .8), sP(p.s - p.hl + 4, p.u + p.hwid - 4, .8), sP(p.s - p.hl + 10, p.u + p.hwid - 4, .8), sP(p.s - p.hl + 10, p.u - p.hwid + 4, .8), '#ffffff');
    wg.quad(sP(p.s + p.hl - 10, p.u - p.hwid + 4, .8), sP(p.s + p.hl - 10, p.u + p.hwid - 4, .8), sP(p.s + p.hl - 4, p.u + p.hwid - 4, .8), sP(p.s + p.hl - 4, p.u - p.hwid + 4, .8), '#ffffff');
    wg.tri(sP(p.s + 18, p.u, 1), sP(p.s - 14, p.u - 18, 1), sP(p.s - 14, p.u + 18, 1), '#ffffff');
  }
  if (base.p.length) add(base, mats.padBase);
  padsG.forEach((g, k) => { if (g.p.length) add(g, mats.pad[k]); });
  if (wg.p.length) add(wg, mats.wpad);
  // tunnels: an arch with ribs, light strips and portals
  const styles = { stone: ['#b8a888', '#8a7a60', '#ffd8a0'], rock: ['#8a4a2a', '#5a2a18', '#ffb347'], neon: ['#1a1a2e', '#101020', '#ff3ab4'], ice: ['#9ad0f0', '#6aa0c8', '#7af0ff'] };
  out.tunnelLights = [];
  for (const tn of T.tunnels) {
    const [c1, c2, lc] = overclock ? ['#06060a', '#000000', neon] : styles[tn.style] || styles.stone, g = new SN.Geo(), gl = new SN.Geo();
    const i0 = T.idx(tn.a), i1 = T.idx(tn.b), arc = (i, k) => { const a = Math.PI - k / 10 * Math.PI, u = Math.cos(a) * (hw[i] + 12), h = 26 + Math.sin(a) * (12 * 16 - 26); return P3(i, u, h); };
    for (let i = i0; i !== i1; i = (i + 1) % n) {
      const j = (i + 1) % n;
      for (let k = 0; k < 10; k++) g.quad(arc(i, k), arc(j, k), arc(j, k + 1), arc(i, k + 1), SN.shade(((i >> 2) & 1) ? c1 : c2, (E.hash2(i, k) - .5) * .1));
      if (i % 6 === 0) for (let k = 0; k < 10; k++) { const a = arc(i, k), b = arc(i, k + 1), aa = arc(j, k), bb = arc(j, k + 1); gl.quad(a, b, [b[0] + (bb[0] - b[0]) * .3, b[1] + (bb[1] - b[1]) * .3, b[2] + (bb[2] - b[2]) * .3], [a[0] + (aa[0] - a[0]) * .3, a[1] + (aa[1] - a[1]) * .3, a[2] + (aa[2] - a[2]) * .3], tn.style === 'neon' || overclock ? lc : SN.shade(c2, -.3)); }
      for (const k of [2.5, 7.5]) { const a = Math.PI - k / 10 * Math.PI, w = .25; const p = (ii, kk) => arc(ii, kk); gl.quad(p(i, k - w), p(j, k - w), p(j, k + w), p(i, k + w), lc); }
    }
    for (const [ii, dir] of [[i0, -1], [i1, 1]]) {   // portal frame
      const pg = new SN.Geo(), pc = overclock ? neon : tn.style === 'neon' ? neon : SN.shade(c1, -.25);
      for (let k = 0; k < 10; k++) { const a = arc(ii, k), b = arc(ii, k + 1), up = (q, d) => [q[0], q[1] + d, q[2]]; pg.quad(a, b, up(b, 1.5), up(a, 1.5), pc); }
      const L = arc(ii, 0), Rr = arc(ii, 10); pg.quad([L[0], L[1] - 3, L[2]], [L[0], L[1] + 14, L[2]], [Rr[0], Rr[1] + 14, Rr[2]], [Rr[0], Rr[1] + 13, Rr[2]], pc);
      add(pg, tn.style === 'neon' || overclock ? mats.neon : mats.deco);
    }
    add(g, mats.deco); add(gl, mats.neon);
    out.tunnelLights.push(lc);
  }
  // pylons under elevated deck (skipped where they would stand in another section)
  const hgt = o.height || (() => -1e9), pg = new SN.Geo();
  if (!overclock) for (let i = 0; i < n; i += 20) {
    if (kind[i] === 1) continue;
    for (const sd of [-1, 1]) {
      const p = pt(i, sd * (hw[i] - 16), -19), gz = hgt(p[0], p[1]); if (p[2] - gz < 4 * 16) continue;
      let blocked = false; for (const k of T.near(p[0], p[1], 40 * 16)) { if (Math.abs(SN.wrapDiff(k * T.ds, i * T.ds, T.L)) < 100 * 16) continue; const dx = p[0] - C[k * 3], dy = p[1] - C[k * 3 + 1]; if (Math.abs(dx * R[k * 3] + dy * R[k * 3 + 1]) < hw[k] + 3 * 16 && C[k * 3 + 2] < p[2]) blocked = true; }
      if (blocked) continue;
      const a = t3(p[0], p[1], gz - 8), b = t3(p[0], p[1], p[2]), w = 1.2;
      pg.box(a[0], (a[1] + b[1]) / 2, a[2], w, b[1] - a[1], w, overclock ? '#101018' : '#6a6c74', '#8a8c94');
      if (i % 40 === 0) { const b2 = t3(...pt(i, -sd * (hw[i] - 16), -19)); pg.box((a[0] + b2[0]) / 2, b[1] - .4, (a[2] + b2[2]) / 2, Math.max(1, Math.abs(a[0] - b2[0])) , .8, Math.max(1, Math.abs(a[2] - b2[2])), '#5a5c64'); }
    }
  }
  if (pg.p.length) add(pg, mats.deco, true);
  // the start gantry: posts, a crossbar, three start lights, the timing board, team flags
  const gantry = (s, h, boardTex, opts = {}) => {
    const i = T.idx(s), g = new SN.Geo(), lw = hw[i] + 24, a = pt(i, -lw, 0), b = pt(i, lw, 0), top = h * 16, A = t3(...a), B = t3(...b);
    const zA = t3(...pt(i, -lw, top)), zB = t3(...pt(i, lw, top));
    g.box(A[0], (A[1] + zA[1]) / 2, A[2], 1.4, zA[1] - A[1] + 20, 1.4, opts.col || '#c8c8d0'); g.box(B[0], (B[1] + zB[1]) / 2, B[2], 1.4, zB[1] - B[1] + 20, 1.4, opts.col || '#c8c8d0');
    add(g, mats.deco, true);
    if (boardTex) {
      const W = Math.hypot(zB[0] - zA[0], zB[2] - zA[2]), geo = own(new THREE.PlaneGeometry(W * .9, W * .9 / 4)), mt = own(new THREE.MeshBasicNodeMaterial({ map: boardTex, side: THREE.DoubleSide }));
      const m = new THREE.Mesh(geo, mt); m.position.set((zA[0] + zB[0]) / 2, (zA[1] + zB[1]) / 2 - 1, (zA[2] + zB[2]) / 2);
      const f = [F[i * 3], F[i * 3 + 2], F[i * 3 + 1]]; m.lookAt(m.position.x - f[0], m.position.y - f[1], m.position.z - f[2]); sc.add(m); out.meshes.push(m);
      const m2 = new THREE.Mesh(geo, mt); m2.position.copy(m.position); m2.lookAt(m.position.x + f[0], m.position.y + f[1], m.position.z + f[2]); m2.position.x += f[0] * .05; m2.position.y += f[1] * .05; m2.position.z += f[2] * .05; sc.add(m2);
      const bar = new SN.Geo(); bar.box(0, 0, 0, W, 1.2, 1, '#2a2a34'); const bm = add(bar, mats.deco); bm.position.copy(m.position); bm.position.y += W * .9 / 8 + .8; bm.lookAt(bm.position.x - f[0], bm.position.y - f[1], bm.position.z - f[2]); bm.rotateY(Math.PI / 2);
      return m;
    }
  };
  if (!overclock) {
    const board = SN.textTexture(256, 64, (g, w, h) => { g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h); E.font.text(g, 'SNIPEOUT HD', w / 2, 8, '#ffffff', { scale: 3, align: 'center', outline: false }); E.font.text(g, T.name, w / 2, 40, th.neon, { scale: 2, align: 'center', outline: false }); });
    out.timing = board; gantry(0, 11, board);
    // start lights on the gantry
    const i = 0, lg = new SN.Geo();
    out.startLights = [0, 1, 2].map(k => { const p = t3(...pt(i, (k - 1) * 48, 11 * 16 + 26)); const geo = new SN.Geo(); geo.box(p[0], p[1], p[2], 1.6, 1.6, 1.6, '#ffffff'); return add(geo, mats.lights[k]); });
    // sponsor gantries every ~350 m (not in tunnels or jumps)
    let k = 0;
    for (let s = 350 * 16; s < T.L - 200 * 16; s += 350 * 16) { if (T.inTunnel(s) || T.jumpAt(s) || T.jumpAt(s + 60 * 16) || T.jumpAt(s - 60 * 16)) continue; out.boards.push(gantry(s, 9, SN.sponsorTexture(k++ + T.id.length))); }
    // sector boards
    for (let q = 1; q < 8; q++) { const s = T.sectors[q], i2 = T.idx(s); if (flags[i2] & 1 || kind[i2]) continue; const side = (flags[i2] & 4) ? 1 : -1, p = t3(...pt(i2, side * (hw[i2] + 30), 40)); const tex = SN.textTexture(32, 32, (g) => { g.fillStyle = '#101018'; g.fillRect(0, 0, 32, 32); g.fillStyle = th.neon; g.fillRect(0, 0, 32, 2); E.font.text(g, String(q + 1), 16, 8, '#ffffff', { scale: 2, align: 'center', outline: false }); E.font.text(g, 'SECTOR', 16, 24, th.neon, { font: 'tiny', align: 'center', outline: false }); }); const m = new THREE.Mesh(own(new THREE.PlaneGeometry(2.4, 2.4)), own(new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide }))); m.position.set(p[0], p[1], p[2]); m.lookAt(p[0] - F[i2 * 3], p[1] - F[i2 * 3 + 2], p[2] - F[i2 * 3 + 1]); sc.add(m); }
    // the landmark arch
    const lm = T.def.landmark;
    if (lm) {
      const s = SN.wrap(T.knots[lm.cp] + 40 * 16, T.L), tex = SN.textTexture(256, 32, (g, w, h) => { g.fillStyle = '#000000'; g.fillRect(0, 0, w, h); E.font.text(g, lm.text, w / 2, 6, th.neon, { scale: 3, align: 'center', outline: false }); });
      const i2 = T.idx(s), g = new SN.Geo(), lw = hw[i2] + 40;
      for (let k = 0; k <= 12; k++) { const a = Math.PI - k / 12 * Math.PI, b = Math.PI - (k + 1) / 12 * Math.PI; if (k === 12) break; const p0 = t3(...pt(i2, Math.cos(a) * lw, Math.sin(a) * 22 * 16)), p1 = t3(...pt(i2, Math.cos(b) * lw, Math.sin(b) * 22 * 16)); g.box((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2, Math.max(1.5, Math.abs(p0[0] - p1[0]) + 1.5), Math.max(1.5, Math.abs(p0[1] - p1[1]) + 1.5), Math.max(1.5, Math.abs(p0[2] - p1[2]) + 1.5), '#e8e8f0'); }
      add(g, mats.deco, true);
      const p = t3(...pt(i2, 0, 22 * 16 + 30)), m = new THREE.Mesh(own(new THREE.PlaneGeometry(26, 3.2)), own(new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide }))); m.position.set(p[0], p[1], p[2]); m.lookAt(p[0] - F[i2 * 3], p[1] - F[i2 * 3 + 2], p[2] - F[i2 * 3 + 1]); sc.add(m);
    }
  }
  return out;
}
SN.TrackMesh = { build, t3 };
})();
