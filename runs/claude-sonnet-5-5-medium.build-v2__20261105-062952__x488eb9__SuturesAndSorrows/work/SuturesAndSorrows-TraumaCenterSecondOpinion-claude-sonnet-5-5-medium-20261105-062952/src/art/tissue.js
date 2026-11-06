(() => {
const E = My3D2dge, G = (window.GAME ||= {});
// Bake once per site, stamp from the sim's state each frame, then shade(). Cosmetic only: the sim never reads it. Needs E = My3D2dge in scope.
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16 - .5);
const hex3 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function makeRamp(keys, n, slow) { // dark to light through hand-picked, hue-shifted keys. slow: the same ramp seen through Long Breath
  const c = keys.map(hex3), out = new Uint32Array(n);
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * (c.length - 1), j = Math.min(c.length - 2, t | 0), f = t - j; let r = c[j][0] + (c[j + 1][0] - c[j][0]) * f, g = c[j][1] + (c[j + 1][1] - c[j][1]) * f, b = c[j][2] + (c[j + 1][2] - c[j][2]) * f;
    if (slow) { const y = r * .3 + g * .59 + b * .11; r = y * .55 + 8; g = y * .95 + 14; b = y * 1.05 + 22; } out[i] = 0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r); }
  return out;
}
const MAT_KEYS = { // name: [ramp keys, specular strength]
  wall: [['#1c060c', '#4a0f18', '#7d1f26', '#a93a38'], .35], bowel: [['#3a0e1c', '#8a2f3e', '#c75f62', '#eb9486', '#ffc9b0'], 1], liver: [['#1e0610', '#4e1022', '#7c1e30', '#a83a42', '#d0645c'], .55],
  fat: [['#5a3a10', '#a8782a', '#dcb34c', '#f4d97e', '#fff2b8'], .7], vessel: [['#14103a', '#2c2a70', '#4a4aa0', '#7c78c8'], .8], artery: [['#3a0408', '#8c0f14', '#cf2a22', '#f4604a'], 1],
  skin: [['#6a3a22', '#a8683f', '#d39a68', '#eebf92'], .12], drape: [['#0c2c2a', '#14504a', '#1f7468', '#2f9a88'], 0], steel: [['#28303a', '#5a6a78', '#9aaab8', '#e8f0f8'], 1.6],
  blood: [['#180204', '#3c060a', '#680c10', '#8e1414'], 1.4], wound: [['#0c0104', '#2a0408', '#55090e', '#7a1216'], .5], char: [['#08070a', '#1c181a', '#332a28', '#4a3c34'], 0], gel: [['#0c4a38', '#1c8a64', '#54d0a0', '#b0ffe0'], 1.4],
  muscle: [['#2a0810', '#6a1424', '#a02c34', '#d4584c', '#f08a72'], .6], tendon: [['#6a5a50', '#a89888', '#d8ccb8', '#f8f0e0'], 1.1], brain: [['#4a2a3a', '#8a5a6a', '#c48c96', '#e8b8b4', '#ffe0d6'], .9], heart: [['#2a0610', '#6a0e1e', '#a82234', '#d84a50', '#f88a7c'], 1], hush: [['#0b2a30', '#1c6a6c', '#3ec4c0', '#8af4e8', '#d8fffa'], 1.2], pcb: [['#0c2018', '#144a30', '#1e7a4c', '#46b878'], .8], bone: [['#5a5448', '#948c78', '#cfc8b0', '#f6f0dc'], .5], gold: [['#4a3208', '#9a6c14', '#e0b030', '#fff0a0'], 1.5], lav: [['#2a1a44', '#5a3c8c', '#8a68c8', '#c8aaf4'], 1.1] };
const MAT_IDS = Object.keys(MAT_KEYS), MATS = MAT_IDS.map(k => ({ ramp: makeRamp(MAT_KEYS[k][0], 20), slow: makeRamp(MAT_KEYS[k][0], 20, true), spec: MAT_KEYS[k][1] }));
const matId = n => MAT_IDS.indexOf(n);
function makeNoise(seed) { let a = seed >>> 0; const R = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const L = new Float32Array(65536); for (let i = 0; i < L.length; i++) L[i] = R();
  const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy), s = (p, q) => L[(p & 255) | ((q & 255) << 8)]; return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - w) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * w; };
  return { R, fbm: (x, y, o = 4) => { let k = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { n += k * v(x * f, y * f); k *= .5; f *= 2.03; } return n; } }; }
class TissueField {
  constructor(W, H, seed = 7) { this.W = W; this.H = H; const N = W * H; this.h = new Float32Array(N); this.m = new Uint8Array(N); this.pulse = new Float32Array(N); this.ao = new Float32Array(N).fill(1); this.dyn = new Float32Array(N); this.over = new Uint8Array(N); this.noise = makeNoise(seed);
    this.cv = E.mkCanvas(W, H); this.g = this.cv.getContext('2d'); this.img = this.g.createImageData(W, H); this.u = new Uint32Array(this.img.data.buffer); }
  blob(x, y, rx, ry, rot, hgt, mat, o = {}) { const { W, H, h, m, pulse, noise } = this, c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry) + (o.warp || 0) + 2, id = matId(mat), warp = o.warp || 0, base = o.base || 0, add = !!o.add;
    for (let py = Math.max(0, y - R | 0); py < Math.min(H, y + R + 1); py++) for (let px = Math.max(0, x - R | 0); px < Math.min(W, x + R + 1); px++) {
      const wx = warp ? (noise.fbm(px * .03, py * .03, 2) - .5) * warp : 0, wy = warp ? (noise.fbm(px * .03 + 40, py * .03, 2) - .5) * warp : 0, dx = px - x + wx, dy = py - y + wy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d = u * u + v * v; if (d >= 1) continue;
      const i = py * W + px, top = base + hgt * Math.sqrt(1 - d); if (add) { h[i] += hgt * (1 - d); m[i] = id; if (o.pulse) pulse[i] = Math.max(pulse[i], o.pulse * (1 - d)); } else if (top > h[i]) { h[i] = top; m[i] = id; if (o.pulse) pulse[i] = o.pulse * (1 - d); } } }
  tube(pts, r, hgt, mat, o = {}) { const step = Math.max(1, r * .35); for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / step | 0); for (let i = 0; i <= n; i++) this.blob(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, 0, hgt, mat, o); } }
  finish(detail = 1.1) { const { W, H, h, ao, noise } = this, N = W * H, blur = new Float32Array(N), tmp = new Float32Array(N), R = 7;
    for (let i = 0, y = 0; y < H; y++) for (let x = 0; x < W; x++, i++) h[i] += (noise.fbm(x * .11, y * .11, 3) - .5) * detail;
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -R; x <= R; x++) s += h[y * W + Math.max(0, x)]; for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * R + 1); s += h[y * W + Math.min(W - 1, x + R + 1)] - h[y * W + Math.max(0, x - R)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y <= R; y++) s += tmp[Math.max(0, y) * W + x]; for (let y = 0; y < H; y++) { blur[y * W + x] = s / (2 * R + 1); s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x]; } }
    for (let i = 0; i < N; i++) ao[i] = Math.max(.42, Math.min(1.08, 1 - (blur[i] - h[i]) * .055)); }
  // what the sim's objects stamp each frame, before shade(): dynamic height, and an override material
  stampDisc(x, y, r, hgt, mat) { const { W, H, dyn, over } = this, id = mat ? matId(mat) + 1 : 0; for (let py = Math.max(1, y - r | 0); py < Math.min(H - 1, y + r + 1); py++) for (let px = Math.max(1, x - r | 0); px < Math.min(W - 1, x + r + 1); px++) { const d = ((px - x) ** 2 + (py - y) ** 2) / (r * r); if (d < 1) { const i = py * W + px; dyn[i] = hgt < 0 ? Math.min(dyn[i], hgt * (1 - d)) : Math.max(dyn[i], hgt * (1 - d)); if (id) over[i] = id; } } }
  stampLine(pts, r, hgt, mat) { for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r * .5) | 0); for (let i = 0; i <= n; i++) this.stampDisc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, hgt, mat); } }
  // fx: { beat 0..1, breath px, slow: Long Breath palette, lens: {x, y, r} shows the cold palette inside (Sonar), light: [lx, ly], dim: 0..1 darkness, spot: {x, y, r} stays lit while dim }
  shade(fx = {}) { const { W, H, h, m, ao, pulse, dyn, over, u } = this, beat = fx.beat || 0, off = Math.round(fx.breath || 0) * W, slow = !!fx.slow, lens = fx.lens, lr2 = lens ? lens.r * lens.r : 0, dim = fx.dim || 0, spot = fx.spot, sr2 = spot ? spot.r * spot.r : 0, lx = fx.light ? fx.light[0] : -.42, ly = fx.light ? fx.light[1] : -.52, lz = Math.sqrt(Math.max(.1, 1 - lx * lx - ly * ly)), hl = Math.hypot(lx, ly, lz + 1), hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;
    for (let y = 1; y < H - 1; y++) for (let x = 1, i = y * W + 1; x < W - 1; x++, i++) {
      const j = Math.max(W + 1, Math.min(W * H - W - 2, i + off)), k = 1 + beat * pulse[j], dx = (h[j - 1] - h[j + 1]) * k * .5 + (dyn[i - 1] - dyn[i + 1]) * .5, dy = (h[j - W] - h[j + W]) * k * .5 + (dyn[i - W] - dyn[i + W]) * .5, nl = 1 / Math.sqrt(dx * dx + dy * dy + 1), nx = dx * nl, ny = dy * nl, nz = nl;
      const diff = Math.max(0, nx * lx + ny * ly + nz * lz), sh = Math.max(0, nx * hx + ny * hy + nz * hz), ov = over[i], M = MATS[ov ? ov - 1 : m[j]], cold = slow || (lens && (x - lens.x) ** 2 + (y - lens.y) ** 2 < lr2), r = cold ? M.slow : M.ramp, n = r.length, s2 = sh * sh, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8, s32 = s16 * s16;
      const lit = dim && !(spot && (x - spot.x) ** 2 + (y - spot.y) ** 2 < sr2) ? 1 - dim : 1, lum = (diff * .92 + s8 * .16 * M.spec + beat * pulse[j] * .6) * (ov ? 1 : ao[j]) * lit, c = Math.max(0, Math.min(n - 1, (lum * (n - 1) + BAYER[(x & 3) | ((y & 3) << 2)] * 1.15 + .5) | 0));
      u[i] = s32 * s8 * M.spec * lit > .42 ? (cold ? 0xffffffe0 : 0xfff4f0ff) : r[c]; }
    this.g.putImageData(this.img, 0, 0); dyn.fill(0); over.fill(0); }
}

G.TissueField = TissueField; G.matId = matId; G.makeNoise = makeNoise; G.makeRamp = makeRamp; G.MATS = MATS; G.hex3 = hex3;
// A site recipe: the abdomen. Design space is 426 x 240 about the screen's centre; a bigger screen only shows more drape.
G.bakeAbdomen0 = bakeAbdomen; function bakeAbdomen(W, H, seed = 11) { const F = new TissueField(W, H, seed), cx = W / 2, cy = H / 2 - 4, n = F.noise, rx = 171, ry = 91;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, fold = Math.sin(x * .09 + 1.6 * Math.sin(y * .05)) * 1.6 + Math.sin(y * .17 + x * .03) * .8;
    if (d < 1) { F.h[i] = -16 + 12 * d * d + Math.sin(x * .05 + y * .03) * 1.4; F.m[i] = matId('wall'); }            // the cavity
    else if (d < 1.28) { const e = (d - 1) / .28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = matId('skin'); }  // lips of skin
    else { F.h[i] = 6 + fold; F.m[i] = matId('drape'); } }                                                            // drapes to any screen's edge
  F.blob(cx - rx * .55, cy - ry * .5, rx * .55, ry * .55, -.3, 17, 'liver', { base: -11, warp: 12 });
  for (let i = 0; i < 9; i++) { const a = n.R() * 6.28, r = .55 + n.R() * .32; F.blob(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 }); }
  const coil = (x0, y0, len, dir, r) => { const pts = [[x0, y0]]; let a = dir, x = x0, y = y0; for (let i = 0; i < len; i++) { a += (n.R() - .5) * 1.5 + Math.sin(i * .9) * .5; x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3; if (((x - cx) / (rx * .92)) ** 2 + ((y - cy) / (ry * .92)) ** 2 > 1) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; } pts.push([x, y]); } return pts; };
  F.tube(coil(cx + rx * .05, cy - ry * .25, 34, .2, 9), 11, 14, 'bowel', { base: -8 }); F.tube(coil(cx + rx * .45, cy + ry * .25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 }); F.tube(coil(cx - rx * .35, cy + ry * .45, 22, -.3, 9), 10, 15, 'bowel', { base: -6 });
  const veins = (x, y, a, len, r, mat) => { const pts = [[x, y]]; for (let i = 0; i < len; i++) { a += (n.R() - .5) * .8; x += Math.cos(a) * 7; y += Math.sin(a) * 7; if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > .96) break; pts.push([x, y]); if (r > 1.2 && n.R() < .22) veins(x, y, a + (n.R() < .5 ? .9 : -.9), len * .5 | 0, r * .7, mat); } F.tube(pts, r, 1.6, mat, { add: true, pulse: mat === 'artery' ? .35 : 0 }); };
  veins(cx - rx * .7, cy - ry * .05, -.2, 16, 2.2, 'vessel'); veins(cx + rx * .7, cy - ry * .6, 2.4, 14, 2, 'artery'); veins(cx + rx * .1, cy + ry * .75, -1.5, 12, 1.8, 'vessel');
  for (const a of [-.45, .5, 2.7, 3.6]) { const ex = cx + Math.cos(a) * rx * 1.02, ey = cy + Math.sin(a) * ry * 1.02, ox = cx + Math.cos(a) * rx * 1.5, oy = cy + Math.sin(a) * ry * 1.5; F.tube([[ex, ey], [ox, oy]], 4, 5, 'steel', { base: 10 }); F.tube([[ex - Math.sin(a) * 9, ey + Math.cos(a) * 9], [ex + Math.sin(a) * 9, ey - Math.cos(a) * 9]], 3, 5, 'steel', { base: 10 }); } // retractors
  F.finish(1.1); return F; }

G.bakeAbdomen0 = bakeAbdomen;
})();
