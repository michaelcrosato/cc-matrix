// Site recipes: every operative field is a height map and materials baked once per site and screen size. Each reads at a glance.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { matId } = G;
const RX = 171, RY = 91;
function base(W, H, seed, wall = 'wall', bury = -16) { const F = new G.TissueField(W, H, seed), OX = (W - 426) >> 1, OY = (H - 240) >> 1, cx = 213 + OX, cy = 116 + OY;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = bury + 12 * d * d + Math.sin(x * .05 + y * .03) * 1.4; F.m[i] = matId(wall); } else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = matId('skin'); } else { F.h[i] = 6 + fold; F.m[i] = matId('drape'); } }
  return { F, cx, cy, n: F.noise, OX, OY }; }
const retractors = (F, cx, cy, list = [-.45, .5, 2.7, 3.6]) => { for (const a of list) { const ex = cx + Math.cos(a) * RX * 1.02, ey = cy + Math.sin(a) * RY * 1.02, ox = cx + Math.cos(a) * RX * 1.5, oy = cy + Math.sin(a) * RY * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } };
const inside = (x, y, cx, cy, k = .96) => ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2 < k;
const veins = (F, n, cx, cy, x, y, a, len, r, mat) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (!inside(x, y, cx, cy)) break; pts.push([x, y]); if (r > 1.2 && n.R() < .22) veins(F, n, cx, cy, x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat); } F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); };
const coil = (n, cx, cy, x0, y0, len, dir, r) => { const pts = [[x0, y0]]; let a = dir, x = x0, y = y0; for (let i = 0; i < len; i++) { a += (n.R() - .5) * 1.5 + Math.sin(i * .9) * .5; x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3; if (!inside(x, y, cx, cy, .85)) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; } pts.push([x, y]); } return pts; };
const SITES = G.SITES = {};
G.defSite = (id, bake) => { SITES[id] = bake; };
G.defSite('abdomen', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed);
  F.blob(cx - RX * .55, cy - RY * .5, RX * .55, RY * .55, -.3, 17, 'liver', { base: -11, warp: 12 });
  for (let i = 0; i < 9; i++) { const a = n.R() * 6.28, r = .55 + n.R() * .32; F.blob(cx + Math.cos(a) * RX * r, cy + Math.sin(a) * RY * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  F.tube(coil(n, cx, cy, cx + RX * .05, cy - RY * .25, 34, .2, 9), 11, 14, 'bowel', { base: -8 }); F.tube(coil(n, cx, cy, cx + RX * .45, cy + RY * .25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 }); F.tube(coil(n, cx, cy, cx - RX * .35, cy + RY * .45, 22, -.3, 9), 10, 15, 'bowel', { base: -6 });
  veins(F, n, cx, cy, cx - RX * .7, cy - RY * .05, -.2, 16, 2.2, 'vessel'); veins(F, n, cx, cy, cx + RX * .7, cy - RY * .6, 2.4, 14, 2, 'artery'); veins(F, n, cx, cy, cx + RX * .1, cy + RY * .75, -1.5, 12, 1.8, 'vessel');
  retractors(F, cx, cy); F.finish(1.1); return F; });
G.defSite('forearm', (W, H, seed, opt = {}) => { const { F, cx, cy, n } = base(W, H, seed, 'muscle', -14);
  for (let i = 0; i < 7; i++) { const y = cy - RY * .72 + i * RY * .24, L = RX * (.86 - Math.abs(i - 3) * .09); for (let k = 0; k < 5; k++) { const x = cx - L + k * L * .5; F.blob(x, y + (n.R() - .5) * 4, 44 + n.R() * 18, 8.5, (n.R() - .5) * .12, 11, 'muscle', { base: -9 }); } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (F.m[i] === matId('muscle')) F.h[i] += Math.sin(y * 1.3 + Math.sin(x * .05) * 2) * .55; }
  F.tube([[cx - RX * .9, cy - RY * .3], [cx - RX * .2, cy - RY * .24], [cx + RX * .9, cy - RY * .34]], 3.5, 6, 'tendon', { base: -4 }); F.tube([[cx - RX * .9, cy + RY * .42], [cx + RX * .1, cy + RY * .36], [cx + RX * .88, cy + RY * .4]], 3, 6, 'tendon', { base: -4 });
  veins(F, n, cx, cy, cx - RX * .8, cy + RY * .1, .1, 22, 1.8, 'vessel'); veins(F, n, cx, cy, cx + RX * .8, cy + RY * .12, 3.1, 18, 1.6, 'artery');
  for (let i = 0; i < 4; i++) { const a = n.R() * 6.28; F.blob(cx + Math.cos(a) * RX * .78, cy + Math.sin(a) * RY * .78, 12, 7, n.R() * 3, 6, 'fat', { base: -10, warp: 6 }); }
  retractors(F, cx, cy, [.3, 2.85]); F.finish(.9); return F; });
G.defSite('flank', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed, 'muscle', -15);
  for (let i = 0; i < 14; i++) { const a = n.R() * 6.28, r = .3 + n.R() * .6; F.blob(cx + Math.cos(a) * RX * r, cy + Math.sin(a) * RY * r, 16 + n.R() * 20, 9 + n.R() * 11, n.R() * 3, 10, 'fat', { base: -9, warp: 10 }); }
  for (let i = 0; i < 6; i++) { const y = cy - RY * .5 + i * RY * .2; F.tube([[cx - RX * .8, y + 16], [cx - RX * .1, y - 4], [cx + RX * .8, y - 18]], 4, 6, 'muscle', { base: -8 }); }
  F.tube([[cx - RX * .55, cy - RY * .1], [cx + RX * .2, cy + RY * .12]], 7, -5, 'wound', { add: true });
  veins(F, n, cx, cy, cx - RX * .6, cy + RY * .6, -.5, 18, 2, 'artery'); retractors(F, cx, cy, [-.4, 3.5]); F.finish(1.2); return F; });
G.defSite('heart', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed, 'wall', -18);
  for (const a of [-1, 1]) for (let i = 0; i < 5; i++) { const y = cy - RY * .72 + i * RY * .36, x0 = cx + a * RX * .62, x1 = cx + a * RX * (.98 - Math.abs(i - 2) * .06); F.tube([[x0, y], [(x0 + x1) / 2, y - 4], [x1, y + 2]], 4, 6, 'bone', { base: -4 }); }
  F.blob(cx, cy - 2, RX * .55, RY * .82, -.25, 30, 'heart', { base: -16, warp: 10, pulse: 1 });
  for (let i = 0; i < 8; i++) { const a = n.R() * 6.28, r = .3 + n.R() * .4; F.blob(cx + Math.cos(a) * RX * r * .9, cy + Math.sin(a) * RY * r, 10 + n.R() * 14, 4 + n.R() * 5, a + 1.3, 4, 'fat', { add: true, pulse: .6 }); }
  F.tube([[cx - 12, cy - RY * .8], [cx - 22, cy - 24], [cx - 6, cy + 18], [cx + 26, cy + RY * .68]], 3.4, 3, 'artery', { add: true, pulse: .9 }); F.tube([[cx - 22, cy - 24], [cx + 34, cy - 10], [cx + 66, cy + 20]], 2.4, 2.4, 'artery', { add: true, pulse: .9 }); F.tube([[cx + 40, cy - RY * .7], [cx + 28, cy - 16], [cx + 48, cy + 36]], 2.2, 2.2, 'vessel', { add: true, pulse: .8 });
  for (const s of [-1, 1]) { F.tube([[cx + s * RX * .94, cy - RY * .6], [cx + s * RX * 1.34, cy - RY * .8]], 5, 6, 'steel', { base: 10 }); F.tube([[cx + s * RX * .94, cy + RY * .6], [cx + s * RX * 1.34, cy + RY * .8]], 5, 6, 'steel', { base: 10 }); F.tube([[cx + s * RX * .94, cy - RY * .6], [cx + s * RX * .94, cy + RY * .6]], 3, 6, 'steel', { base: 8 }); }
  F.finish(.9); return F; });
G.defSite('brain', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed, 'brain', -14);
  for (let i = 0; i < 26; i++) { const x0 = cx - RX * .85 + n.R() * RX * 1.7, y0 = cy - RY * .8 + n.R() * RY * 1.6; if (!inside(x0, y0, cx, cy, .8)) continue; let a = n.R() * 6.28, x = x0, y = y0; const pts = [[x, y]]; for (let k = 0; k < 18; k++) { a += Math.sin(k * 1.1 + i) * 1 + (n.R() - .5) * .8; x += Math.cos(a) * 9; y += Math.sin(a) * 7; if (!inside(x, y, cx, cy, .9)) break; pts.push([x, y]); } F.tube(pts, 7.5, 9, 'brain', { base: -9 }); }
  veins(F, n, cx, cy, cx - RX * .75, cy - RY * .35, .3, 22, 1.4, 'artery'); veins(F, n, cx, cy, cx + RX * .75, cy + RY * .3, 3.3, 22, 1.3, 'vessel'); veins(F, n, cx, cy, cx, cy - RY * .8, 1.5, 14, 1.2, 'vessel');
  retractors(F, cx, cy, [-.7, .7, 2.44, 3.84]); F.finish(.8); return F; });
G.defSite('implant', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed, 'muscle', -14);
  for (let i = 0; i < 8; i++) { const a = n.R() * 6.28; F.blob(cx + Math.cos(a) * RX * .72, cy + Math.sin(a) * RY * .72, 14 + n.R() * 16, 8 + n.R() * 8, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  F.blob(cx, cy, 86, 58, 0, 6, 'steel', { base: -3 });
  for (let y = -44; y <= 44; y++) for (let x = -66; x <= 66; x++) { const i = (cy + y | 0) * W + (cx + x | 0); if (Math.abs(x) < 62 && Math.abs(y) < 38) { F.h[i] = 1 + (Math.abs(x) > 58 || Math.abs(y) > 34 ? 2 : 0); F.m[i] = matId('board'); } }
  for (const t of [[[-52, -20], [-20, -20], [-8, -8], [20, -8]], [[-48, 22], [-16, 22], [0, 8], [40, 8]], [[50, -24], [30, -24], [18, -12]], [[-30, -30], [-30, -8]], [[34, 30], [34, 12]]]) F.tube(t.map(([x, y]) => [cx + x, cy + y]), 1, 1.2, 'gold', { add: true });
  retractors(F, cx, cy); F.finish(.5); return F; });
G.defSite('mediastinum', (W, H, seed) => { const { F, cx, cy, n } = base(W, H, seed, 'wall', -20);
  F.blob(cx, cy + 12, RX * .5, RY * .68, -.2, 24, 'heart', { base: -16, warp: 12, pulse: 1 });
  F.tube([[cx - 60, cy - RY * .84], [cx - 34, cy - 34], [cx - 6, cy - 8]], 13, 14, 'artery', { base: -10, pulse: .7 }); F.tube([[cx + 60, cy - RY * .84], [cx + 28, cy - 34], [cx + 4, cy - 10]], 11, 13, 'vessel', { base: -10, pulse: .7 }); F.tube([[cx, cy - RY * .88], [cx, cy - 30]], 11, 13, 'artery', { base: -10, pulse: .7 });
  for (let i = 0; i < 16; i++) { const a = n.R() * 6.28, r = .2 + n.R() * .7; F.tube([[cx + Math.cos(a) * RX * r * .7, cy + Math.sin(a) * RY * r * .7], [cx + Math.cos(a + .8) * RX * r * .8, cy + Math.sin(a + .8) * RY * r * .8], [cx + Math.cos(a + 1.5) * RX * r * .9, cy + Math.sin(a + 1.5) * RY * r * .9]], 3 + n.R() * 3, 5, 'hush', { base: -6, pulse: .5 }); }
  F.tube([[cx - RX * .94, cy - RY * .6], [cx - RX * .94, cy + RY * .6]], 3, 6, 'steel', { base: 8 }); F.tube([[cx + RX * .94, cy - RY * .6], [cx + RX * .94, cy + RY * .6]], 3, 6, 'steel', { base: 8 });
  retractors(F, cx, cy, [.4, 2.74]); F.finish(1); return F; });
const cache = new Map();
G.fieldFor = (site, W, H, seed, opt) => { const k = site + '|' + W + 'x' + H + '|' + seed; let F = cache.get(k); if (!F) { if (cache.size > 6) { cache.delete(cache.keys().next().value); } F = SITES[site](W, H, seed, opt); cache.set(k, F); } return F; };
})();
