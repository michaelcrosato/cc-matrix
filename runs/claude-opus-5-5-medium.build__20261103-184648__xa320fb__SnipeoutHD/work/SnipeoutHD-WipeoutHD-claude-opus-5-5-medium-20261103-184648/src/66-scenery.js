// Terrain (each theme's natural ground carved around the track: cuttings, embankments, the gorge, rock over the tunnels)
// and scenery (instanced towns, towers, palms, turbines, the Spire, the lighthouse, aurora, weather near the camera)
(() => {
const SN = globalThis.SN, E = My3D2dge;
const M = 1 / 16, U = 16, t3 = (x, y, z) => [x * M, z * M, y * M];
const fbm = (x, y, oct = 4) => { let v = 0, a = .5, t = 0; for (let o = 0, f = 1; o < oct; o++, f *= 2.03) { v += a * E.noise2(x * f, y * f); t += a; a *= .5; } return v / t; };
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** the corridor grid: the ground near the track kept below the deck (and raised over tunnels) */
function corridor(T, themeId) {
  const cell = 16 * U, [bx0, by0, bx1, by1] = T.bounds, pad = 260 * U, x0 = bx0 - pad, y0 = by0 - pad;
  const W = Math.ceil((bx1 - bx0 + pad * 2) / cell) + 1, H = Math.ceil((by1 - by0 + pad * 2) / cell) + 1;
  const carve = new Float32Array(W * H).fill(1e7), roof = new Float32Array(W * H).fill(-1e7);
  const C = T.C, n = T.n, raiseTunnels = themeId !== 'city';
  for (let i = 0; i < n; i++) {
    const cx = C[i * 3], cy = C[i * 3 + 1], hw = T.hw[i], open = T.flags[i] & 12, gap = T.kind[i] === 1, tun = T.flags[i] & 1, jz = gap ? T.jumpAt(i * T.ds) : null;
    const deck = gap ? jz.zLip - 60 * U : C[i * 3 + 2] - (T.kind[i] === 2 ? 0 : 0), r = hw + 220 * U;
    const ix0 = Math.max(0, Math.floor((cx - r - x0) / cell)), ix1 = Math.min(W - 1, Math.ceil((cx + r - x0) / cell)), iy0 = Math.max(0, Math.floor((cy - r - y0) / cell)), iy1 = Math.min(H - 1, Math.ceil((cy + r - y0) / cell));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const px = x0 + ix * cell, py = y0 + iy * cell, d0 = Math.hypot(px - cx, py - cy); if (d0 > r) continue;
      const d = Math.max(0, d0 - hw), k = iy * W + ix;
      let v;
      if (gap) v = d < 40 * U ? deck : deck + (d - 40 * U) * 1.2;
      else { const clr = (open ? 14 : 3) * U; v = d < 60 * U ? deck - clr * (1 - d / (60 * U)) - (open && d < 30 * U ? 8 * U : 0) : deck + (d - 60 * U) * .8; }
      if (v < carve[k]) carve[k] = v;
      if (tun && raiseTunnels && d < 30 * U) { const top = C[i * 3 + 2] + 16 * U + d * .6; if (top > roof[k]) roof[k] = top; }
    }
  }
  const at = (A, x, y) => {
    const isC = A === carve, empty = isC ? 1e7 : -1e7, fx = (x - x0) / cell, fy = (y - y0) / cell, ix = Math.floor(fx), iy = Math.floor(fy);
    if (ix < 0 || iy < 0 || ix >= W - 1 || iy >= H - 1) return empty;
    const u = fx - ix, v = fy - iy, q = [A[iy * W + ix], A[iy * W + ix + 1], A[(iy + 1) * W + ix], A[(iy + 1) * W + ix + 1]], ok = q.filter(z => Math.abs(z) < 1e6);
    if (!ok.length) return empty;
    const fill = isC ? Math.max(...ok) + 50 * U : Math.min(...ok) - 50 * U; for (let k = 0; k < 4; k++) if (Math.abs(q[k]) >= 1e6) q[k] = fill;
    return (q[0] * (1 - u) + q[1] * u) * (1 - v) + (q[2] * (1 - u) + q[3] * u) * v;
  };
  return { carve: (x, y) => at(carve, x, y), roof: (x, y) => at(roof, x, y) };
}
/** each theme's natural ground (engine units) at local metres (lx, ly) from the track's origin */
const NATURAL = {
  coast: (lx, ly) => { const sea = sm(40, 160, ly); const hill = 2 + sm(60, -700, ly) * 80 + fbm(lx / 300, ly / 300) * 40 * sm(40, -200, ly); return (hill * (1 - sea) + (-8) * sea) * U; },
  desert: (lx, ly) => {
    let h = fbm(lx / 120, ly / 120, 3) * 6;
    for (const [mx, my, r, top] of MESAS) { const d = Math.hypot(lx - mx, ly - my) + fbm(lx / 40, ly / 40, 2) * 40; h = Math.max(h, top * (1 - sm(r - 20, r + 25, d))); }
    return h * U;
  },
  city: () => -40 * U,
  arctic: (lx, ly) => { const lake = 1 - sm(220, 300, Math.hypot(lx - 480, ly - 1100)); const ridge = 20 + fbm(lx / 380, ly / 380, 5) * 170; return (ridge * (1 - lake) + 2 * lake) * U; },
  overclock: () => -400 * U
};
const MESAS = [[-300, -400, 160, 70], [400, -300, 120, 55], [500, 600, 140, 45], [1300, -500, 200, 80], [-250, 600, 150, 60], [1250, 450, 130, 50], [300, -1150, 180, 75]];
const COLOR = {
  coast: (z, nz) => z < 2 * U ? [210, 196, 150] : z < 10 * U ? [190, 176, 120] : nz < .8 ? [150, 120, 96] : [96 + (z / U) * .2, 118, 70],
  desert: (z, nz) => nz < .75 ? [178, 92, 52] : z < 4 * U ? [214, 150, 96] : [200, 120, 70],
  city: (z, nz) => [38, 36, 52],
  arctic: (z, nz) => nz < .72 ? [70, 80, 96] : z < 4 * U ? [190, 220, 240] : [226, 236, 248],
  overclock: () => [0, 0, 0]
};
function terrainFor(T, themeId) {
  const O = T.def.origin, ox = O[0], oy = O[1], cor = themeId === 'overclock' ? null : corridor(T, themeId), nat = NATURAL[themeId] || NATURAL.coast;
  const height = (x, y) => {
    let h = nat(x / U - ox, y / U - oy);
    if (cor) { const c = cor.carve(x, y); if (c < h) h = c; const r = cor.roof(x, y); if (r > h) h = r; }
    return h;
  };
  const col = COLOR[themeId] || COLOR.coast;
  return { height, color: (x, y, z, nz, out) => { const c = col(z, nz); out = out || [0, 0, 0]; const k = 1 + (E.hash2(Math.floor(x / 64), Math.floor(y / 64)) - .5) * .08; out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; return out; } };
}

/* ---- scenery ---- */
function scenery(world, T, themeId, height) {
  const THREE = E.THREE, sc = world.scene, own = x => world._own(x), rnd = E.rng(SN.hashString(T.id + themeId)), O = T.def.origin, anim = [];
  const L = (lx, ly) => [(lx + O[0]) * U, (ly + O[1]) * U];
  const clearOfTrack = (x, y, m = 30) => { for (const i of T.near(x, y, (m + 40) * U)) { if (Math.hypot(x - T.C[i * 3], y - T.C[i * 3 + 1]) < T.hw[i] + m * U) return false; } return true; };
  const lam = own(new THREE.MeshLambertNodeMaterial({ color: '#ffffff' })), basic = own(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' })), vlam = own(new THREE.MeshLambertNodeMaterial({ vertexColors: true }));
  const _o = new THREE.Object3D(), _c = new THREE.Color();
  /** an instanced mesh of geo placed at engine (x, y, z) with scale [sx, sy(up), sz] and colours */
  const inst = (geo, mat, items, shadow = true) => {
    if (!items.length) return null;
    const m = new THREE.InstancedMesh(own(geo), mat, items.length);
    items.forEach((it, k) => { const p = t3(it.x, it.y, it.z); _o.position.set(p[0], p[1], p[2]); _o.rotation.set(0, it.rot || 0, 0); _o.scale.set(it.sx, it.sy, it.sz ?? it.sx); _o.updateMatrix(); m.setMatrixAt(k, _o.matrix); m.setColorAt(k, _c.set(it.color || '#ffffff')); });
    m.castShadow = shadow; m.receiveShadow = shadow; sc.add(m); return m;
  };
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, .5, 0);
  const cyl = new THREE.CylinderGeometry(.5, .5, 1, 10); cyl.translate(0, .5, 0);
  const cone = new THREE.ConeGeometry(.5, 1, 6); cone.translate(0, .5, 0);
  const roof = new THREE.ConeGeometry(.75, 1, 4); roof.rotateY(Math.PI / 4); roof.translate(0, .5, 0);
  const ball = new THREE.SphereGeometry(.5, 12, 8);
  const scatter = (n, area, f) => { const out = []; for (let k = 0, tries = 0; k < n && tries < n * 20; tries++) { const lx = area[0] + rnd() * (area[2] - area[0]), ly = area[1] + rnd() * (area[3] - area[1]), [x, y] = L(lx, ly); if (!clearOfTrack(x, y, area[4] || 30)) continue; const z = height(x, y); const it = f(x, y, z, lx, ly); if (it) { out.push(...[].concat(it)); k++; } } return out; };
  const single = (geo, mat, x, y, z, sx, sy, sz, color, rot = 0) => inst(geo.clone(), mat, [{ x, y, z, sx, sy, sz, color, rot }]);
  const group = (x, y, z) => { const g = new THREE.Group(), p = t3(x, y, z); g.position.set(p[0], p[1], p[2]); sc.add(g); return g; };
  const mesh = (geo, mat, parent, px, py, pz, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(own(geo), mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
  const colMat = c => own(new THREE.MeshLambertNodeMaterial({ color: c })), glowMat = c => own(new THREE.MeshBasicNodeMaterial({ color: c }));
  const addMat = (c, op = .5) => own(new THREE.MeshBasicNodeMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  // crowd stands beside the start
  if (themeId !== 'overclock') {
    const i0 = T.idx(SN.wrap(-60 * U, T.L)), side = T.flags[i0] & 4 ? 1 : (T.pit && T.pit.side > 0 ? -1 : 1), p = T.point(SN.wrap(-60 * U, T.L), side * (T.hw[i0] + 40 * U), 0), f = T.frameAt(SN.wrap(-60 * U, T.L));
    const rot = -Math.atan2(f.F[1], f.F[0]), items = [], dots = [];
    for (let r = 0; r < 6; r++) { const q = T.point(SN.wrap(-60 * U, T.L), side * (T.hw[i0] + (40 + r * 4) * U), 0); items.push({ x: q[0], y: q[1], z: Math.min(q[2], height(q[0], q[1])), sx: 120, sy: (q[2] - Math.min(q[2], height(q[0], q[1]))) * M + 1 + r * 1.5, sz: 4, color: r % 2 ? '#3a3a48' : '#4a4a58', rot }); for (let k = 0; k < 40; k++) { const s2 = SN.wrap((-120 + k * 3) * U, T.L), qq = T.point(s2, side * (T.hw[i0] + (40 + r * 4) * U), 0); dots.push({ x: qq[0], y: qq[1], z: q[2] + (1 + r * 1.5) * U, sx: .8, sy: 1.4, color: SN.TEAMS[(k + r) % 6].colors[(k % 2)] }); } }
    inst(box.clone(), lam, items); inst(box.clone(), lam, dots, false);
  }
  if (themeId === 'coast') {
    // the sea: a big plane at 0 m with glinting bands
    const sea = new THREE.Mesh(own(new THREE.PlaneGeometry(9000, 9000, 1, 1)), own(new THREE.MeshLambertNodeMaterial({ color: '#2a6a98' }))); sea.rotation.x = -Math.PI / 2; sea.position.set(O[0], 0, O[1] + 4000 + 100); sea.receiveShadow = true; sc.add(sea);
    const glint = new THREE.Mesh(own(new THREE.PlaneGeometry(900, 40)), addMat('#ffb070', .35)); glint.rotation.x = -Math.PI / 2; glint.position.set(O[0] - 1200, .2, O[1] + 900); sc.add(glint);
    // old town houses on the hill, roofs
    const houses = scatter(320, [-700, -950, 1000, -80, 24], (x, y, z) => ({ x, y, z: z - 16, sx: 6 + rnd() * 8, sy: 5 + rnd() * 8, sz: 6 + rnd() * 8, color: ['#f2ece0', '#e8c890', '#f0b8a8', '#e8d8b8'][Math.floor(rnd() * 4)], rot: rnd() * 3 }));
    inst(box.clone(), lam, houses);
    inst(roof.clone(), lam, houses.map(h => ({ x: h.x, y: h.y, z: h.z + h.sy * U + 16, sx: Math.max(h.sx, h.sz) * .95, sy: 3, sz: Math.max(h.sx, h.sz) * .95, color: '#c0583a', rot: h.rot })));
    // villas with pools, cranes, palms along the promenade, umbrellas
    const palms = []; for (let k = 0; k < 60; k++) { const s = SN.wrap((k * 14 - 200) * U, T.L), i = T.idx(s), side = T.pit && T.pit.side > 0 ? 1 : -1, q = T.point(s, side * (T.hw[i] + 26 * U), 0); palms.push({ x: q[0], y: q[1], z: Math.min(q[2], height(q[0], q[1])) - 16, sx: .7, sy: 9 + rnd() * 3, color: '#8a6a48' }); }
    inst(cyl.clone(), lam, palms); inst(cone.clone(), lam, palms.map(p => ({ x: p.x, y: p.y, z: p.z + p.sy * U, sx: 6, sy: 2.4, color: '#3a8a3a', rot: rnd() * 3 })));
    const umb = scatter(80, [-400, 70, 900, 140, 6], (x, y, z) => ({ x, y, z: Math.max(z, 0), sx: 3, sy: 2.2, color: ['#ff5a5a', '#ffffff', '#ffd23f', '#29c8e8'][Math.floor(rnd() * 4)] })); inst(cone.clone(), lam, umb);
    const boats = scatter(40, [-500, 300, 400, 700, 10], (x, y, z) => ({ x, y, z: 0, sx: 3, sy: 1.5, sz: 9, color: '#f4f4f4', rot: rnd() * .4 })); inst(box.clone(), lam, boats); inst(cyl.clone(), lam, boats.map(b => ({ x: b.x, y: b.y, z: 24, sx: .2, sy: 10, color: '#d8d8d8' })));
    const cranes = [[-120, 520], [60, 560], [250, 520]].map(([lx, ly]) => { const [x, y] = L(lx, ly); return { x, y, z: 0, sx: 3, sy: 45, color: '#ff8a1a' }; }); inst(box.clone(), lam, cranes); inst(box.clone(), lam, cranes.map(c => ({ x: c.x + 200, y: c.y, z: 44 * U, sx: 30, sy: 2, sz: 2, color: '#ff8a1a' })));
    // the lighthouse on the pier by the hairpin: red and white rings, a turning beam
    { const [x, y] = L(-170, 420), lh = group(x, y, 0); for (let k = 0; k < 8; k++) mesh(cyl.clone(), colMat(k % 2 ? '#d82a2a' : '#f4f4f4'), lh, 0, k * 4, 0, 6 - k * .3, 4, 6 - k * .3); mesh(ball.clone(), glowMat('#fff2c0'), lh, 0, 33.5, 0, 3, 3, 3); const beam = new THREE.Group(); beam.position.y = 33.5; lh.add(beam); const bg = new THREE.ConeGeometry(4, 80, 8, 1, true); bg.rotateZ(Math.PI / 2); bg.translate(-40, 0, 0); mesh(bg, addMat('#fff2c0', .18), beam, 0, 0, 0); anim.push(t => { beam.rotation.y = t * 1.2; }); }
    // the Ferris wheel behind the marina
    { const [x, y] = L(150, 760), fw = group(x, y, 0); mesh(box.clone(), colMat('#d8d8e0'), fw, -8, 0, 0, 1.5, 32, 1.5); mesh(box.clone(), colMat('#d8d8e0'), fw, 8, 0, 0, 1.5, 32, 1.5); const wheel = new THREE.Group(); wheel.position.y = 32; fw.add(wheel); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; mesh(box.clone(), glowMat(k % 2 ? '#ff3ab4' : '#29c8e8'), wheel, Math.cos(a) * 26, Math.sin(a) * 26 - 1, 0, 3, 3, 3); mesh(box.clone(), colMat('#c8c8d0'), wheel, Math.cos(a) * 13, Math.sin(a) * 13, 0, .5, .5, 26).rotation.set(0, Math.PI / 2, 0); } anim.push(t => { wheel.rotation.z = t * .12; }); }
  }
  if (themeId === 'desert') {
    // the Spire: stacked tapering rock drums in strata colours
    { const [x, y] = L(762, 72), g = group(x, y, 0), cols = ['#b85a30', '#d8884a', '#8a3a20', '#e8b070']; for (let k = 0; k < 22; k++) mesh(cyl.clone(), colMat(cols[k % 4]), g, Math.sin(k * 1.7) * 2, k * 10, Math.cos(k * 1.3) * 2, 70 - k * 2.4, 10, 70 - k * 2.4); }
    // wind turbines with turning rotors
    const tpos = scatter(24, [-500, -1100, 1400, 900, 40], (x, y, z) => (z > 30 * U || rnd() < .3) ? { x, y, z } : null);
    tpos.forEach((p, k) => { const g = group(p.x, p.y, p.z); mesh(cyl.clone(), colMat('#f0f0f0'), g, 0, 0, 0, 1.6, 40, 1.6); const rot = new THREE.Group(); rot.position.set(0, 40, 1.5); g.add(rot); for (let b = 0; b < 3; b++) { const bl = mesh(box.clone(), colMat('#f8f8f8'), rot, 0, 0, 0, 1.4, 18, .4); bl.rotation.z = b * Math.PI * 2 / 3; } g.rotation.y = k; anim.push(t => { rot.rotation.z = t * 1.6 + k; }); });
    // solar fields
    inst(box.clone(), own(new THREE.MeshLambertNodeMaterial({ color: '#2a3a7a' })), scatter(160, [-900, 500, 1500, 1200, 30], (x, y, z) => ({ x, y, z: z + 8, sx: 8, sy: .4, sz: 4, color: '#3a4aa8', rot: .3 })));
    // canyon banners and dust devils are FX; the wreck of an old craft at the gorge
    { const j = T.jumps[0]; if (j) { const q = T.point(j.a + (j.b - j.a) * .5, T.hw[j.lipI] + 60 * U, 0), geo = SN.ShipKit.craftGeometry('saetta', ['#5a4a3a', '#3a2a20', '#8a7a60', '#000000']).body, m = new THREE.Mesh(own(geo), own(new THREE.MeshToonNodeMaterial({ vertexColors: true }))), p = t3(q[0], q[1], height(q[0], q[1])); m.position.set(p[0], p[1] + 2, p[2]); m.scale.setScalar(5); m.rotation.set(.4, 1, .5); m.castShadow = true; sc.add(m); } }
    const rocks = scatter(140, [-1000, -1300, 1800, 1300, 20], (x, y, z) => ({ x, y, z: z - 16, sx: 4 + rnd() * 10, sy: 3 + rnd() * 8, color: ['#a85a30', '#c8784a', '#8a4a28'][Math.floor(rnd() * 3)], rot: rnd() * 3 })); inst(ball.clone(), lam, rocks);
  }
  if (themeId === 'city') {
    // megatowers with lit window grids
    const win = SN.textTexture(32, 64, (g) => { g.fillStyle = '#101018'; g.fillRect(0, 0, 32, 64); for (let y = 2; y < 64; y += 4) for (let x = 2; x < 32; x += 4) { const r = E.hash2(x * 7, y * 3); g.fillStyle = r < .55 ? '#ffe8b0' : r < .7 ? '#8ad8ff' : '#181824'; g.fillRect(x, y, 2, 2); } });
    win.wrapS = win.wrapT = THREE.RepeatWrapping;
    const tmat = own(new THREE.MeshBasicNodeMaterial({ map: win, color: '#ffffff' }));
    const towers = scatter(260, [-1300, -1300, 1500, 900, 26], (x, y, z) => { const h = 60 + rnd() * rnd() * 300; return { x, y, z: -40 * U, sx: 20 + rnd() * 30, sy: h, sz: 20 + rnd() * 30, color: ['#a8a8c8', '#c8b0d8', '#90b8d0'][Math.floor(rnd() * 3)], rot: Math.floor(rnd() * 4) * Math.PI / 2 }; });
    const tg = box.clone(); const uv = tg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 4, uv.getY(k) * 12);
    inst(tg, tmat, towers, false);
    inst(box.clone(), lam, towers.map(t => ({ x: t.x, y: t.y, z: -40 * U + t.sy * U, sx: t.sx * .9, sy: 2, sz: t.sz * .9, color: '#2a2a3a', rot: t.rot })), false);
    // buildings around the neon tunnels
    for (const tn of T.tunnels) { const s0 = tn.a, s1 = tn.b, len = SN.wrapDiff(s0, s1, T.L); for (let d = 0; d < len; d += 60 * U) { const s = SN.wrap(s0 + d, T.L), i = T.idx(s), f = T.frameAt(s), c = T.point(s, 0, 0); inst(box.clone(), tmat, [{ x: c[0], y: c[1], z: -40 * U, sx: 70, sy: (c[2] * M + 40) + 22 + rnd() * 60, sz: 64, color: '#b8b8d8', rot: -Math.atan2(f.F[1], f.F[0]) }], false); } }
    // the Meridian Spire with a beacon, rooftop helipad lights
    { const o = T.overpasses[0], q = o ? T.point(o.upper * T.ds, T.hw[o.upper] + 90 * U, 0) : L(0, -200).concat([0]), g = group(q[0], q[1], -40 * U); mesh(cyl.clone(), colMat('#d0d0e8'), g, 0, 0, 0, 30, 380, 30); mesh(cyl.clone(), colMat('#a0a0c0'), g, 0, 380, 0, 14, 120, 14); const b = mesh(ball.clone(), glowMat('#ff2a4a'), g, 0, 505, 0, 8, 8, 8); anim.push(t => { b.visible = (t % 1.4) < .7; }); }
    // neon signs on towers
    towers.slice(0, 40).forEach((t, k) => { const tex = SN.sponsorTexture(k, 128), m = new THREE.Mesh(own(new THREE.PlaneGeometry(t.sx * .9, t.sx * .9 / 2)), own(new THREE.MeshBasicNodeMaterial({ map: tex, side: THREE.DoubleSide }))), p = t3(t.x, t.y, -40 * U + t.sy * U * (.5 + rnd() * .3)); m.position.set(p[0], p[1], p[2] + t.sz / 2 + .3); m.rotation.y = 0; sc.add(m); });
    // maglev trains and flying traffic on loops; searchlights
    const traffic = []; for (let k = 0; k < 30; k++) { const r = 400 + rnd() * 900, h = 60 + rnd() * 160, ph = rnd() * 6.28, sp = (rnd() < .5 ? -1 : 1) * (.05 + rnd() * .08), m = new THREE.Mesh(own(new THREE.BoxGeometry(4, 1.2, 2)), glowMat(k % 3 ? '#ffe0a0' : '#ff3a6a')); sc.add(m); traffic.push([m, r, h, ph, sp]); }
    anim.push(t => { for (const [m, r, h, ph, sp] of traffic) { const a = ph + t * sp; m.position.set(O[0] + 200 + Math.cos(a) * r, h, O[1] - 200 + Math.sin(a) * r); m.rotation.y = -a + (sp > 0 ? -Math.PI / 2 : Math.PI / 2); } });
    const lights = []; for (let k = 0; k < 6; k++) { const [x, y] = L(-800 + k * 380, 600 + (k % 2) * 300), g = group(x, y, -40 * U), b = new THREE.Group(); g.add(b); const cg = new THREE.ConeGeometry(18, 600, 10, 1, true); cg.translate(0, 300, 0); mesh(cg, addMat('#8090ff', .08), b, 0, 0, 0); lights.push([b, k]); }
    anim.push(t => { for (const [b, k] of lights) { b.rotation.z = Math.sin(t * .4 + k) * .5; b.rotation.x = Math.cos(t * .3 + k * 2) * .4; } });
  }
  if (themeId === 'arctic') {
    // the research station at the start: domes, a turning radar dish, masts with blinking lights
    { const q = T.point(SN.wrap(-120 * U, T.L), -(T.hw[0] + 70 * U), 0), g = group(q[0], q[1], height(q[0], q[1])); for (let k = 0; k < 4; k++) mesh(ball.clone(), colMat('#e8eef8'), g, k * 22 - 30, 0, (k % 2) * 18, 18 - k * 2, 14 - k * 2, 18 - k * 2); mesh(cyl.clone(), colMat('#8a9aaa'), g, 40, 0, 0, 2, 20, 2); const dish = new THREE.Group(); dish.position.set(40, 22, 0); g.add(dish); const dg = new THREE.SphereGeometry(8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3); mesh(dg, colMat('#f0f0f0'), dish, 0, 0, 0).rotation.x = Math.PI / 2; anim.push(t => { dish.rotation.y = t * .6; }); for (let k = 0; k < 3; k++) { mesh(cyl.clone(), colMat('#c8c8d0'), g, -60 + k * 30, 0, 30, .6, 34, .6); const bl = mesh(ball.clone(), glowMat('#ff2a2a'), g, -60 + k * 30, 34, 30, 1.4, 1.4, 1.4); anim.push(t => { bl.visible = ((t + k * .3) % 1.2) < .5; }); } }
    // ice spikes
    inst(cone.clone(), own(new THREE.MeshLambertNodeMaterial({ color: '#b8e8ff' })), scatter(170, [-1400, -700, 1600, 1800, 24], (x, y, z) => ({ x, y, z: z - 16, sx: 4 + rnd() * 6, sy: 8 + rnd() * 24, color: rnd() < .5 ? '#c8f0ff' : '#9ad8f8', rot: rnd() * 3 })));
    // the frozen-in icebreaker on the lake
    { const [x, y] = L(560, 1180), g = group(x, y, 0); mesh(box.clone(), colMat('#c8302a'), g, 0, 0, 0, 14, 8, 60); mesh(box.clone(), colMat('#f0f0f0'), g, 0, 8, -8, 10, 10, 18); mesh(cyl.clone(), colMat('#202024'), g, 0, 18, -4, 3, 8, 3); g.rotation.y = .6; g.rotation.z = .08; }
    // aurora ribbons: tall translucent strips that wave
    for (let k = 0; k < 5; k++) {
      const geo = new THREE.PlaneGeometry(2600, 300, 40, 1), m = new THREE.Mesh(own(geo), addMat(['#3aff9a', '#5affd0', '#8a5aff', '#3affb0', '#5ab8ff'][k], .22)); m.position.set(O[0] + 200 + (k - 2) * 300, 900 + k * 60, O[1] - 1800 - k * 250); m.rotation.y = .2 * k; sc.add(m);
      const pos = geo.attributes.position, base = Float32Array.from(pos.array);
      anim.push(t => { for (let v = 0; v < pos.count; v++) { const x = base[v * 3]; pos.array[v * 3 + 2] = Math.sin(x / 300 + t * .5 + k) * 120 + Math.sin(x / 120 - t * .8) * 30; } pos.needsUpdate = true; });
    }
  }
  return { anim };
}

/** weather near the camera: an instanced cloud of flakes / streaks / dust repositioned every frame (cosmetic) */
function weather(world, kind) {
  if (!kind) return null;
  const THREE = E.THREE, own = x => world._own(x), N = 600;
  const geo = kind === 'rain' ? new THREE.BoxGeometry(.04, 1.6, .04) : kind === 'snow' ? new THREE.BoxGeometry(.18, .18, .18) : new THREE.BoxGeometry(.3, .3, .3);
  const mat = own(new THREE.MeshBasicNodeMaterial({ color: kind === 'rain' ? '#9ab0ff' : kind === 'snow' ? '#ffffff' : kind === 'dust' ? '#e8c890' : '#e0f0ff', transparent: true, opacity: kind === 'rain' ? .45 : .8, depthWrite: false }));
  const m = new THREE.InstancedMesh(own(geo), mat, N); m.frustumCulled = false; world.scene.add(m);
  const P = new Float32Array(N * 3); for (let k = 0; k < N; k++) { P[k * 3] = Math.random() * 120 - 60; P[k * 3 + 1] = Math.random() * 60 - 10; P[k * 3 + 2] = Math.random() * 120 - 60; }
  const _o = new THREE.Object3D(), fall = kind === 'rain' ? 40 : kind === 'snow' ? 3 : kind === 'spray' ? 1 : .6;
  return { mesh: m, on: true, update(cam, dt) {
    m.visible = this.on; if (!this.on || !cam) return;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (let k = 0; k < N; k++) {
      P[k * 3 + 1] -= fall * dt; P[k * 3] += (kind === 'dust' ? 6 : kind === 'snow' ? Math.sin(k + P[k * 3 + 1]) * .6 : 0) * dt;
      let x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
      if (y < -10) P[k * 3 + 1] = y + 60;
      x = ((x % 120) + 180) % 120 - 60; z = ((z % 120) + 180) % 120 - 60;
      _o.position.set(cx + x, cy + P[k * 3 + 1], cz + z); _o.updateMatrix(); m.setMatrixAt(k, _o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  } };
}
SN.Scenery = { terrainFor, scenery, weather, NATURAL };
})();
