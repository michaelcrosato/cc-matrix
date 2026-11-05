/* 35-kit: prefabs on the geometry builder G, so stages are written as placements: piers, quays, stalls with lantern
 * strings, crates and stacks, containers, warehouses, lamp posts, bollards, boats, bridges, canal walls, houses,
 * market halls, catwalks, railings, skylines. Each takes world positions; a few return what they place (for covers). */
const KIT = {};
TC.KIT = KIT;
/** a wooden pier deck at z on piles, from (x0, y0) to (x1, y1) */
KIT.pier = (G, x0, y0, x1, y1, z = 0, mat = 'pier') => {
  G.box(mat, x0, y0, z - 4, x1, y1, z, { bottom: 'pier-dk', side: 'pier-dk' });
  for (let x = x0 + 8; x < x1; x += 48) for (const y of [y0 + 4, y1 - 4, (y0 + y1) / 2]) G.cyl('pier-dk', x, y, z - 60, 3, 56, { seg: 6, caps: false });
  for (let x = x0; x <= x1; x += 64) for (const y of [y0 + 2, y1 - 2]) G.cyl('pier-dk', x, y, z, 2.5, 10, { seg: 6, top: 'rope' });
};
/** a stone or concrete quay block (the ground) */
KIT.ground = (G, x0, y0, x1, y1, z = 0, mat = 'concrete', side = 'stone', depth = 60) => G.box(mat, x0, y0, z - depth, x1, y1, z, { side, solid: true });
KIT.crate = (G, x, y, z = 0, s = 15, yaw = 0) => G.box('crate', x - s / 2, y - s / 2, z, x + s / 2, y + s / 2, z + s * .93, { yaw, cover: true });
/** a stack of crates w x d cells, h high (returns its top z) */
KIT.crates = (G, x, y, z = 0, nx = 2, ny = 1, nz = 2, s = 15) => {
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx - (k > 0 ? 1 : 0); i++) for (let j = 0; j < ny; j++) KIT.crate(G, x + (i - (nx - 1) / 2) * s + (k > 0 ? s / 2 : 0), y + (j - (ny - 1) / 2) * s, z + k * s * .93, s);
  return z + nz * s * .93;
};
KIT.barrel = (G, x, y, z = 0, mat = 'barrel') => { G.cyl(mat, x, y, z, 6, 17, { seg: 10, top: 'oak', solid: true }); G.cyl('iron', x, y, z + 4, 6.3, 1.5, { seg: 10, caps: false }); G.cyl('iron', x, y, z + 12, 6.3, 1.5, { seg: 10, caps: false }); };
KIT.bollard = (G, x, y, z = 0) => { G.cyl('iron', x, y, z, 4, 10, { seg: 8, solid: true }); G.cyl('iron', x, y, z + 10, 5, 2, { seg: 8 }); };
KIT.lamp = (G, x, y, z = 0, color = 'glow-amber', h = 44, light = .7) => {
  G.cyl('iron', x, y, z, 2, h, { seg: 6 }); G.box('iron', x - 2, y - 2, z + h, x + 2, y + 2, z + h + 2, { solid: false });
  G.box(color, x - 3, y - 3, z + h - 6, x + 3, y + 3, z + h, { solid: false }); G.light(x, y, z + h - 3, 110, light);
};
/** a festival stall: counter (cover), posts, a striped awning, goods; facing: the side customers stand */
KIT.stall = (G, x, y, z = 0, yaw = 0, aw = 'awning-red') => {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (f, r) => [x + f * c - r * s, y + f * s + r * c];
  G.box('planks', x - 7, y - 16, z, x + 7, y + 16, z + 19, { yaw, top: 'oak', cover: true });
  for (const r of [-16, 16]) for (const f of [-8, 10]) { const p = P(f, r); G.cyl('oak', p[0], p[1], z, 1.2, 34, { seg: 5 }); }
  const a = P(-9, -19), b = P(13, -19), cc = P(13, 19), d = P(-9, 19);
  G.quad(aw, [a[0], a[1], z + 34], [d[0], d[1], z + 34], [cc[0], cc[1], z + 30], [b[0], b[1], z + 30]);
  G.quad(aw, [b[0], b[1], z + 30], [cc[0], cc[1], z + 30], [d[0], d[1], z + 34], [a[0], a[1], z + 34]);
  G.light(P(0, 0)[0], P(0, 0)[1], z + 26, 70, .45);
};
/** a string of festival lights between two points (sagging), colored bulbs */
KIT.lights = (G, a, b, n = 10, sag = 8) => {
  const cols = ['glow-red', 'glow-yellow', 'glow-cyan', 'glow-green', 'glow-magenta'];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = V3.lerp(a, b, u); p[2] -= Math.sin(u * Math.PI) * sag;
    G.box(cols[i % cols.length], p[0] - 1, p[1] - 1, p[2] - 2, p[0] + 1, p[1] + 1, p[2], { solid: false });
  }
};
/** a 98 x 39 x 42 shipping container, long axis along yaw */
KIT.container = (G, x, y, z = 0, yaw = 0, mat = 'corr-red') => G.box(mat, x - 49, y - 19.5, z, x + 49, y + 19.5, z + 42, { yaw, top: mat, cover: true });
/** a warehouse block with windows on a face, a door; returns nothing */
KIT.building = (G, x0, y0, x1, y1, h, o = {}) => {
  G.box(o.mat || 'brick', x0, y0, 0, x1, y1, h, { top: o.roof || 'slate', solid: true });
  if (o.windows) for (const w of o.windows) G.box('glass-lit', w[0], w[1], w[2], w[3], w[4], w[5], { solid: false });
};
/** a row of lit windows on a wall plane facing -x at x, from y0 to y1 */
KIT.windowsX = (G, x, y0, y1, z0, rows = 2, mat = 'glass-lit', dir = -1) => {
  for (let r = 0; r < rows; r++) for (let y = y0 + 12; y < y1 - 12; y += 30) G.box(mat, x + dir * .5 - .5, y, z0 + r * 36, x + dir * .5 + .5, y + 12, z0 + r * 36 + 16, { solid: false });
};
KIT.windowsY = (G, y, x0, x1, z0, rows = 2, mat = 'glass-lit', dir = -1) => {
  for (let r = 0; r < rows; r++) for (let x = x0 + 12; x < x1 - 12; x += 30) G.box(mat, x, y + dir * .5 - .5, z0 + r * 36, x + 12, y + dir * .5 + .5, z0 + r * 36 + 16, { solid: false });
};
/** a railing along a line (posts and a rail), h high */
KIT.rail = (G, a, b, h = 14, mat = 'iron') => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 16));
  for (let i = 0; i <= n; i++) { const p = V3.lerp(a, b, i / n); G.cyl(mat, p[0], p[1], p[2], .8, h, { seg: 4, caps: false }); }
  G.tube(mat, [a[0], a[1], a[2] + h], [b[0], b[1], b[2] + h], 1, { seg: 5 });
  G.tube(mat, [a[0], a[1], a[2] + h * .5], [b[0], b[1], b[2] + h * .5], .7, { seg: 4 });
};
/** a moored fishing boat (static): hull, cabin (its roof is a jump-off point) */
KIT.fishingBoat = (G, x, y, z, yaw = 0) => {
  const M = mat34(x, y, z, yaw), B = new Builder({ local: true });
  B.box('hull-white', -40, -14, -10, 40, 14, 6, { top: 'pier' }); B.box('hull-red', -40.5, -14.5, -10, 40.5, 14.5, -4, { skip: 'tb', solid: false });
  B.lathe('hull-white', 40, 0, -10, [[14, 0], [10, 8], [0, 16]], { seg: 4 });
  B.box('plaster', -26, -10, 6, -2, 10, 28, { top: 'hull-red' }); B.box('glass-lit', -2.6, -7, 16, -1.9, 7, 24, { solid: false });
  B.cyl('oak', 14, 0, 6, 1.2, 40, { seg: 5 });
  addMeshTo(G, B, M);
};
/** copy a local builder's triangles into G through a transform (and its colliders, as axis boxes of their corners) */
function addMeshTo(G, B, M) {
  for (const g of B.groups.values()) for (let i = 0; i < g.pos.length; i += 9) {
    const a = xform(M, [g.pos[i], g.pos[i + 1], g.pos[i + 2]]), b = xform(M, [g.pos[i + 3], g.pos[i + 4], g.pos[i + 5]]), c = xform(M, [g.pos[i + 6], g.pos[i + 7], g.pos[i + 8]]), j = i / 9 * 6;
    G.tri(g.tex, a, b, c, [g.uv[j], g.uv[j + 1]], [g.uv[j + 2], g.uv[j + 3]], [g.uv[j + 4], g.uv[j + 5]]);
  }
  for (const c of B.colliders) { const b = c.box, cs = [[b[0], b[1]], [b[3], b[1]], [b[3], b[4]], [b[0], b[4]]].map(p => xform(M, [p[0], p[1], 0])), z0 = xform(M, [0, 0, b[2]])[2], z1 = xform(M, [0, 0, b[5]])[2]; G.collider([Math.min(...cs.map(p => p[0])), Math.min(...cs.map(p => p[1])), Math.min(z0, z1), Math.max(...cs.map(p => p[0])), Math.max(...cs.map(p => p[1])), Math.max(z0, z1)], { impact: c.impact }); }
}
TC.addMeshTo = addMeshTo;
/** a far skyline of blocks (low-poly buildings with lit windows) along a line */
KIT.skyline = (G, x0, y0, x1, y1, seed = 1, h0 = 60, h1 = 160, mat = 'city-windows') => {
  const R = E.rng(seed), L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  for (let d = 0; d < L;) { const w = 40 + R() * 70, h = h0 + R() * (h1 - h0), dp = 40 + R() * 60, cx = x0 + ux * (d + w / 2), cy = y0 + uy * (d + w / 2); G.box(mat, cx - w / 2 * Math.abs(ux) - dp / 2 * Math.abs(uy), cy - w / 2 * Math.abs(uy) - dp / 2 * Math.abs(ux), -20, cx + w / 2 * Math.abs(ux) + dp / 2 * Math.abs(uy), cy + w / 2 * Math.abs(uy) + dp / 2 * Math.abs(ux), h, { top: 'slate', solid: false, maxEdge: 200 }); d += w + R() * 20; }
};
/** sea: a big water plane at z */
KIT.sea = (G, mat, x0, y0, x1, y1, z) => G.quad(mat, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], { maxEdge: 300 });
/** a timber or plaster house: walls, a pitched slate roof, door, windows (on the face toward -x by default) */
KIT.house = (G, x0, y0, x1, y1, h, o = {}) => {
  const mat = o.mat || 'plaster', roof = o.roof || 'slate';
  G.box(mat, x0, y0, 0, x1, y1, h, { top: roof, solid: true });
  if (o.timber) for (let y = y0 + 6; y < y1; y += 22) G.box('timber', x0 - .6, y, 0, x0, y + 3, h, { solid: false });
  const my = (y0 + y1) / 2, rz = h + (y1 - y0) * .35;
  G.quad(roof, [x0 - 3, y0 - 3, h], [x1 + 3, y0 - 3, h], [x1 + 3, my, rz], [x0 - 3, my, rz]);
  G.quad(roof, [x1 + 3, y1 + 3, h], [x0 - 3, y1 + 3, h], [x0 - 3, my, rz], [x1 + 3, my, rz]);
  G.tri(mat, [x0, y0, h], [x0, my, rz], [x0, y1, h], [0, 0], [1, 1], [2, 0]); G.tri(mat, [x1, y1, h], [x1, my, rz], [x1, y0, h], [0, 0], [1, 1], [2, 0]);
  if (o.door) G.box('timber', x0 - 1, o.door - 8, 0, x0 + .2, o.door + 8, 30, { solid: false });
  if (o.lit !== false) for (let y = y0 + 10; y < y1 - 14; y += 28) G.box(o.dark ? 'glass' : 'glass-lit', x0 - .7, y, h * .55, x0 + .1, y + 10, h * .55 + 14, { solid: false });
};
/** a steel catwalk deck with grating, railings on both sides */
KIT.catwalk = (G, x0, y0, x1, y1, z, rails = 'both') => {
  G.box('grate', x0, y0, z - 2, x1, y1, z, { side: 'steel-dk', solid: true });
  if (rails) { const along = (x1 - x0) > (y1 - y0); if (along) { KIT.rail(G, [x0, y0, z], [x1, y0, z]); KIT.rail(G, [x0, y1, z], [x1, y1, z]); } else { KIT.rail(G, [x0, y0, z], [x0, y1, z]); KIT.rail(G, [x1, y0, z], [x1, y1, z]); } }
};
/** sandbags: a low wall of rounded sacks (cover) */
KIT.sandbags = (G, x, y, z = 0, len = 40, yaw = 0, rows = 3) => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let r = 0; r < rows; r++) for (let i = 0; i < Math.round(len / 10); i++) { const f = -len / 2 + 5 + i * 10 + (r % 2) * 5; if (f > len / 2 - 4) continue; G.box('burlap', x + f * c - 5, y + f * s - 5, z + r * 5, x + f * c + 5, y + f * s + 5, z + r * 5 + 5.5, { solid: false }); }
  G.collider([x - Math.abs(c) * len / 2 - Math.abs(s) * 5, y - Math.abs(s) * len / 2 - Math.abs(c) * 5, z, x + Math.abs(c) * len / 2 + Math.abs(s) * 5, y + Math.abs(s) * len / 2 + Math.abs(c) * 5, z + rows * 5.5], { impact: 'cloth' });
};
/** a bridge deck across a canal (along y), with parapets */
KIT.bridge = (G, x, y0, y1, z, w = 30, mat = 'stone') => {
  G.box(mat, x - w / 2, y0, z - 6, x + w / 2, y1, z, { solid: true }); G.box(mat, x - w / 2, y0, z, x - w / 2 + 3, y1, z + 12); G.box(mat, x + w / 2 - 3, y0, z, x + w / 2, y1, z + 12);
};
