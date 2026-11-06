// Sites are recipes on the tissue painter: each reads at a glance and differs from the rest (section 16). defSite(id, bake).
// Design space is 426 x 240 about the screen's centre; a bigger screen only shows more drape, never a bigger cavity.
(() => {
const E = My3D2dge, G = (window.GAME ||= {});
const SITES = G.SITES = {};
G.defSite = (id, spec) => { SITES[id] = spec; };
const CACHE = new Map();
/** the baked field for a site at this screen size (one instance per site, size and seed) */
G.siteField = (id, W, H, seed = 11) => { const key = id + '|' + W + '|' + H + '|' + seed; let f = CACHE.get(key); if (!f) { if (CACHE.size > 6) CACHE.delete(CACHE.keys().next().value); f = SITES[id].bake(W, H, seed); CACHE.set(key, f); } return f; };
G.clearSiteCache = () => CACHE.clear();

const RX = 171, RY = 91;
const mid = (W, H) => [W / 2, H / 2 - 4];
function shell(F, W, H, cavity = 'wall', skin = 'skin') {
  const [cx, cy] = mid(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, d = ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = -16 + 12 * d * d + Math.sin(x * .05 + y * .03) * 1.4; F.m[i] = G.matId(cavity); }
    else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = G.matId(skin); }
    else { F.h[i] = 6 + fold; F.m[i] = G.matId('drape'); }
  }
  return [cx, cy];
}
function retractors(F, cx, cy, list = [-.45, .5, 2.7, 3.6]) { for (const a of list) { const ex = cx + Math.cos(a) * RX * 1.02, ey = cy + Math.sin(a) * RY * 1.02, ox = cx + Math.cos(a) * RX * 1.5, oy = cy + Math.sin(a) * RY * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } }
function veins(F, cx, cy, x, y, a, len, r, mat, depth = 0) { const n = F.noise, pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2 > .96) break; pts.push([x, y]); if (r > 1.2 && depth < 3 && n.R() < .22) veins(F, cx, cy, x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat, depth + 1); } if (pts.length > 1) F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); }
function coil(F, cx, cy, x0, y0, len, dir, r) { const n = F.noise, pts = [[x0, y0]]; let a = dir, x = x0, y = y0; for (let i = 0; i < len; i++) { a += (n.R() - .5) * 1.5 + Math.sin(i * .9) * .5; x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3; if (((x - cx) / (RX * .92)) ** 2 + ((y - cy) / (RY * .92)) ** 2 > 1) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; } pts.push([x, y]); } return pts; }
/** fibers: stripes of height along a direction, for muscle */
function fibers(F, cx, cy, ang, amp, freq) { const { W, H, h, m } = F, ca = Math.cos(ang), sa = Math.sin(ang), mu = G.matId('muscle'), nz = F.noise; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i] !== mu) continue; const u = -(x - cx) * sa + (y - cy) * ca, v = (x - cx) * ca + (y - cy) * sa; h[i] += Math.sin(u * freq + nz.fbm(v * .02, u * .1, 2) * 6) * amp; } }

G.defSite('forearm', { label: 'Forearm', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'muscle'), n = F.noise;
  for (let i = 0; i < 9; i++) { const y = cy - RY * .75 + i * RY * .19 + (n.R() - .5) * 8, x = cx + (n.R() - .5) * 60; F.blob(x, y, RX * (.58 + n.R() * .3), 10 + n.R() * 6, .04 * (i - 4) + (n.R() - .5) * .08, 9, 'muscle', { base: -12, warp: 6 }); }
  fibers(F, cx, cy, .04, .32, 1.25);
  for (const [dy, r, a, b] of [[-38, 2.6, -.84, .2], [26, 2.8, -.1, .84], [50, 2.2, -.7, -.05]]) { const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([cx + (a + (b - a) * u) * RX, cy + dy + Math.sin(u * 7 + dy) * 7]); } F.tube(pts, r, 4, 'tendon', { base: -5 }); }
  for (let i = 0; i < 7; i++) { const a = n.R() * 6.28, r = .84 + n.R() * .12; F.blob(cx + Math.cos(a) * RX * r, cy + Math.sin(a) * RY * r, 12 + n.R() * 14, 6 + n.R() * 5, a + 1.57, 6, 'fat', { base: -8, warp: 6 }); }
  veins(F, cx, cy, cx - RX * .7, cy + RY * .5, .1, 18, 2, 'vessel'); veins(F, cx, cy, cx + RX * .7, cy - RY * .5, 3, 16, 1.8, 'artery');
  retractors(F, cx, cy); F.finish(1); return F; } });

G.defSite('abdomen', { label: 'Abdomen', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'wall'), n = F.noise;
  F.blob(cx - RX * .55, cy - RY * .5, RX * .55, RY * .55, -.3, 17, 'liver', { base: -11, warp: 12 });
  for (let i = 0; i < 9; i++) { const a = n.R() * 6.28, r = .55 + n.R() * .32; F.blob(cx + Math.cos(a) * RX * r, cy + Math.sin(a) * RY * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  F.tube(coil(F, cx, cy, cx + RX * .05, cy - RY * .25, 34, .2, 9), 11, 14, 'bowel', { base: -8 }); F.tube(coil(F, cx, cy, cx + RX * .45, cy + RY * .25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 }); F.tube(coil(F, cx, cy, cx - RX * .35, cy + RY * .45, 22, -.3, 9), 10, 15, 'bowel', { base: -6 });
  veins(F, cx, cy, cx - RX * .7, cy - RY * .05, -.2, 16, 2.2, 'vessel'); veins(F, cx, cy, cx + RX * .7, cy - RY * .6, 2.4, 14, 2, 'artery'); veins(F, cx, cy, cx + RX * .1, cy + RY * .75, -1.5, 12, 1.8, 'vessel');
  retractors(F, cx, cy); F.finish(1.1); return F; } });

G.defSite('flank', { label: 'Flank', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'muscle'), n = F.noise;
  for (let i = 0; i < 7; i++) { F.blob(cx - RX * .7 + i * RX * .24, cy + (n.R() - .5) * 40, 26, RY * .72, .5, 8, 'muscle', { base: -12, warp: 10 }); }
  fibers(F, cx, cy, .5 + 1.57, .7, 1);
  for (let i = 0; i < 11; i++) { const x = cx + (n.R() - .5) * RX * 1.7, y = cy + (n.R() - .5) * RY * 1.6; F.blob(x, y, 14 + n.R() * 18, 9 + n.R() * 10, n.R() * 3, 9, 'fat', { base: -8, warp: 9 }); }
  F.tube([[cx - RX * .55, cy - RY * .42], [cx - RX * .2, cy - RY * .1], [cx + RX * .25, cy + RY * .22], [cx + RX * .58, cy + RY * .4]], 8, -4, 'wound', { base: -12 });   // the gaff's long track
  veins(F, cx, cy, cx - RX * .6, cy + RY * .6, -.6, 14, 2, 'artery'); veins(F, cx, cy, cx + RX * .6, cy - RY * .6, 2.4, 14, 2, 'vessel');
  retractors(F, cx, cy, [-.5, .6, 2.6, 3.7]); F.finish(1.2); return F; } });

G.defSite('heart', { label: 'Heart', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'wall'), n = F.noise;
  F.blob(cx + 2, cy + 2, RX * .78, RY * .84, -.18, 30, 'heart', { base: -14, pulse: 1, warp: 8 });
  for (let i = 0; i < 12; i++) { const a = n.R() * 6.28, r = .25 + n.R() * .62; F.blob(cx + Math.cos(a) * RX * .7 * r, cy + Math.sin(a) * RY * .78 * r, 8 + n.R() * 16, 3 + n.R() * 4, a + 1.2, 3, 'fat', { add: true, pulse: .8 }); }
  const cor = (pts, r, mat) => F.tube(pts, r, 3, mat, { add: true, pulse: 1 });
  cor([[cx - 60, cy - 70], [cx - 36, cy - 40], [cx - 16, cy - 8], [cx - 4, cy + 28], [cx + 12, cy + 62]], 3.4, 'artery');
  cor([[cx - 28, cy - 38], [cx - 62, cy - 16], [cx - 88, cy + 16]], 2.3, 'artery'); cor([[cx - 16, cy - 8], [cx + 24, cy - 2], [cx + 70, cy + 18], [cx + 92, cy + 44]], 2.5, 'artery');
  cor([[cx + 40, cy - 72], [cx + 34, cy - 34], [cx + 50, cy + 4], [cx + 46, cy + 40]], 2.6, 'vessel');
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const y = cy - 66 + i * 44; F.tube([[cx + s * RX * .92, y - 4], [cx + s * RX * 1.08, y + 6]], 6, 5, 'bone', { base: 2 }); }  // ribs at the rim
  F.tube([[cx - RX * 1.04, cy - RY * .25], [cx - RX * 1.3, cy - RY * .25]], 4, 6, 'steel', { base: 12 }); F.tube([[cx + RX * 1.04, cy - RY * .25], [cx + RX * 1.3, cy - RY * .25]], 4, 6, 'steel', { base: 12 });
  F.tube([[cx - RX * 1.04, cy - RY * .6], [cx - RX * 1.04, cy + RY * .1]], 3, 6, 'steel', { base: 12 }); F.tube([[cx + RX * 1.04, cy - RY * .6], [cx + RX * 1.04, cy + RY * .1]], 3, 6, 'steel', { base: 12 });
  F.finish(.8); return F; } });

G.defSite('brain', { label: 'Brain', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'wall', 'bone'), n = F.noise;
  F.blob(cx, cy, RX * .95, RY * .95, 0, 12, 'brain', { base: -14, warp: 8 });
  for (let k = 0; k < 16; k++) { const x0 = cx + (n.R() - .5) * RX * 1.5, y0 = cy + (n.R() - .5) * RY * 1.4; F.tube(coil(F, cx, cy, x0, y0, 16, n.R() * 6.28, 6.5), 6.6, 9, 'brain', { base: -5 }); }
  for (let k = 0; k < 14; k++) { const a = n.R() * 6.28; veins(F, cx, cy, cx + Math.cos(a) * RX * .88, cy + Math.sin(a) * RY * .88, a + 3.14, 10, 1.3, k % 2 ? 'vessel' : 'artery'); }
  F.finish(.6); return F; } });

G.defSite('implant', { label: 'Chest wall', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'muscle'), n = F.noise;
  for (let i = 0; i < 6; i++) F.blob(cx, cy - RY * .8 + i * RY * .32, RX * .96, 14, -.08, 8, 'muscle', { base: -12, warp: 6 });
  fibers(F, cx, cy, -.08, .6, 1.1);
  for (let i = 0; i < 8; i++) { const a = n.R() * 6.28, r = .7 + n.R() * .25; F.blob(cx + Math.cos(a) * RX * r, cy + Math.sin(a) * RY * r, 12 + n.R() * 12, 8 + n.R() * 6, n.R() * 3, 7, 'fat', { base: -8, warp: 7 }); }
  F.blob(cx - 8, cy - 6, 84, 54, 0, 3, 'circuit', { base: -2 });   // the pocket the can sits in
  veins(F, cx, cy, cx - RX * .7, cy - RY * .6, .6, 12, 2, 'vessel'); veins(F, cx, cy, cx + RX * .7, cy + RY * .6, 3.7, 12, 2, 'artery');
  retractors(F, cx, cy); F.finish(.9); return F; } });

G.defSite('mediastinum', { label: 'Mediastinum', bake(W, H, seed) {
  const F = new G.TissueField(W, H, seed), [cx, cy] = shell(F, W, H, 'wall'), n = F.noise;
  F.blob(cx + 2, cy + 18, RX * .7, RY * .66, -.15, 24, 'heart', { base: -14, pulse: 1, warp: 8 });
  const great = (pts, r, mat) => F.tube(pts, r, 9, mat, { base: -3, pulse: .7 });
  great([[cx - 18, cy - 12], [cx - 34, cy - 46], [cx - 76, cy - 74], [cx - 130, cy - 78]], 13, 'artery'); great([[cx + 8, cy - 14], [cx + 30, cy - 48], [cx + 84, cy - 72], [cx + 136, cy - 64]], 12, 'vessel'); great([[cx - 2, cy - 8], [cx, cy - 50], [cx - 4, cy - 88]], 11, 'artery');
  for (let k = 0; k < 11; k++) { const x0 = cx + (n.R() - .5) * RX * 1.4, y0 = cy - 30 + (n.R() - .5) * RY * .9; F.tube(coil(F, cx, cy, x0, y0, 9, n.R() * 6.28, 7), 6.5, 6, k % 3 ? 'hush' : 'lav', { add: true, pulse: .9 }); }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const y = cy - 66 + i * 44; F.tube([[cx + s * RX * .92, y - 4], [cx + s * RX * 1.08, y + 6]], 6, 5, 'bone', { base: 2 }); }
  F.finish(.9); return F; } });
})();
