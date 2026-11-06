/* Tissue, sites, busts, instruments, and the title stage. Drawing never writes the sim. */
(() => {
  const E = My3D2dge;
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
  const hex3 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function makeRamp(keys, n, slow) {
    const c = keys.map(hex3), out = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) * (c.length - 1), j = Math.min(c.length - 2, t | 0), f = t - j;
      let r = c[j][0] + (c[j + 1][0] - c[j][0]) * f, g = c[j][1] + (c[j + 1][1] - c[j][1]) * f, b = c[j][2] + (c[j + 1][2] - c[j][2]) * f;
      if (slow) { const y = r * 0.3 + g * 0.59 + b * 0.11; r = y * 0.55 + 8; g = y * 0.95 + 14; b = y * 1.05 + 22; }
      out[i] = 0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
    }
    return out;
  }
  const MAT_KEYS = {
    wall: [['#1c060c', '#4a0f18', '#7d1f26', '#a93a38'], 0.35],
    bowel: [['#3a0e1c', '#8a2f3e', '#c75f62', '#eb9486', '#ffc9b0'], 1],
    liver: [['#1e0610', '#4e1022', '#7c1e30', '#a83a42', '#d0645c'], 0.55],
    fat: [['#5a3a10', '#a8782a', '#dcb34c', '#f4d97e', '#fff2b8'], 0.7],
    vessel: [['#14103a', '#2c2a70', '#4a4aa0', '#7c78c8'], 0.8],
    artery: [['#3a0408', '#8c0f14', '#cf2a22', '#f4604a'], 1],
    skin: [['#6a3a22', '#a8683f', '#d39a68', '#eebf92'], 0.12],
    drape: [['#0c2c2a', '#14504a', '#1f7468', '#2f9a88'], 0],
    steel: [['#28303a', '#5a6a78', '#9aaab8', '#e8f0f8'], 1.6],
    blood: [['#180204', '#3c060a', '#680c10', '#8e1414'], 1.4],
    wound: [['#0c0104', '#2a0408', '#55090e', '#7a1216'], 0.5],
    char: [['#08070a', '#1c181a', '#332a28', '#4a3c34'], 0],
    gel: [['#0c4a38', '#1c8a64', '#54d0a0', '#b0ffe0'], 1.4],
    muscle: [['#4a1820', '#8a3038', '#c45a58', '#e88878'], 0.4],
    tendon: [['#c8b89a', '#e4d2b0', '#f4e6cc', '#fff6e8'], 0.3],
    brain: [['#c48aa0', '#e0a8b8', '#f0c8d0', '#f8e0e6'], 0.5],
    heart: [['#6a1020', '#a82030', '#e04548', '#ff8878'], 1],
    hush: [['#143038', '#1e6870', '#3ec8b0', '#d8fff4'], 1.2],
    gold: [['#6a4a10', '#c8a040', '#f0d070', '#fff0b0'], 1.3],
  };
  const MAT_IDS = Object.keys(MAT_KEYS);
  const MATS = MAT_IDS.map(k => ({ ramp: makeRamp(MAT_KEYS[k][0], 20), slow: makeRamp(MAT_KEYS[k][0], 20, true), spec: MAT_KEYS[k][1] }));
  const matId = n => MAT_IDS.indexOf(n);

  function makeNoise(seed) {
    let a = seed >>> 0;
    const R = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const L = new Float32Array(65536);
    for (let i = 0; i < L.length; i++) L[i] = R();
    const v = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy);
      const s = (p, q) => L[(p & 255) | ((q & 255) << 8)];
      return (s(xi, yi) * (1 - u) + s(xi + 1, yi) * u) * (1 - w) + (s(xi, yi + 1) * (1 - u) + s(xi + 1, yi + 1) * u) * w;
    };
    return { R, fbm: (x, y, o = 4) => { let k = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { n += k * v(x * f, y * f); k *= 0.5; f *= 2.03; } return n; } };
  }

  class TissueField {
    constructor(W, H, seed = 7) {
      this.W = W; this.H = H;
      const N = W * H;
      this.h = new Float32Array(N); this.m = new Uint8Array(N); this.pulse = new Float32Array(N);
      this.ao = new Float32Array(N).fill(1); this.dyn = new Float32Array(N); this.over = new Uint8Array(N);
      this.noise = makeNoise(seed);
      this.cv = E.mkCanvas(W, H); this.g = this.cv.getContext('2d');
      this.img = this.g.createImageData(W, H); this.u = new Uint32Array(this.img.data.buffer);
    }
    blob(x, y, rx, ry, rot, hgt, mat, o = {}) {
      const { W, H, h, m, pulse, noise } = this, c = Math.cos(rot), s = Math.sin(rot);
      const R = Math.max(rx, ry) + (o.warp || 0) + 2, id = matId(mat), warp = o.warp || 0, base = o.base || 0, add = !!o.add;
      for (let py = Math.max(0, y - R | 0); py < Math.min(H, y + R + 1); py++) {
        for (let px = Math.max(0, x - R | 0); px < Math.min(W, x + R + 1); px++) {
          const wx = warp ? (noise.fbm(px * 0.03, py * 0.03, 2) - 0.5) * warp : 0;
          const wy = warp ? (noise.fbm(px * 0.03 + 40, py * 0.03, 2) - 0.5) * warp : 0;
          const dx = px - x + wx, dy = py - y + wy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d = u * u + v * v;
          if (d >= 1) continue;
          const i = py * W + px, top = base + hgt * Math.sqrt(1 - d);
          if (add) { h[i] += hgt * (1 - d); m[i] = id; if (o.pulse) pulse[i] = Math.max(pulse[i], o.pulse * (1 - d)); }
          else if (top > h[i]) { h[i] = top; m[i] = id; if (o.pulse) pulse[i] = o.pulse * (1 - d); }
        }
      }
    }
    tube(pts, r, hgt, mat, o = {}) {
      const step = Math.max(1, r * 0.35);
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / step | 0);
        for (let i = 0; i <= n; i++) this.blob(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, 0, hgt, mat, o);
      }
    }
    finish(detail = 1.1) {
      const { W, H, h, ao, noise } = this, N = W * H, blur = new Float32Array(N), tmp = new Float32Array(N), R = 7;
      for (let i = 0, y = 0; y < H; y++) for (let x = 0; x < W; x++, i++) h[i] += (noise.fbm(x * 0.11, y * 0.11, 3) - 0.5) * detail;
      for (let y = 0; y < H; y++) {
        let s = 0;
        for (let x = -R; x <= R; x++) s += h[y * W + Math.max(0, x)];
        for (let x = 0; x < W; x++) { tmp[y * W + x] = s / (2 * R + 1); s += h[y * W + Math.min(W - 1, x + R + 1)] - h[y * W + Math.max(0, x - R)]; }
      }
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let y = -R; y <= R; y++) s += tmp[Math.max(0, y) * W + x];
        for (let y = 0; y < H; y++) { blur[y * W + x] = s / (2 * R + 1); s += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x]; }
      }
      for (let i = 0; i < N; i++) ao[i] = Math.max(0.42, Math.min(1.08, 1 - (blur[i] - h[i]) * 0.055));
    }
    stampDisc(x, y, r, hgt, mat) {
      const { W, H, dyn, over } = this, id = mat ? matId(mat) + 1 : 0;
      for (let py = Math.max(1, y - r | 0); py < Math.min(H - 1, y + r + 1); py++) {
        for (let px = Math.max(1, x - r | 0); px < Math.min(W - 1, x + r + 1); px++) {
          const d = ((px - x) ** 2 + (py - y) ** 2) / (r * r);
          if (d < 1) {
            const i = py * W + px;
            dyn[i] = hgt < 0 ? Math.min(dyn[i], hgt * (1 - d)) : Math.max(dyn[i], hgt * (1 - d));
            if (id) over[i] = id;
          }
        }
      }
    }
    stampLine(pts, r, hgt, mat) {
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / Math.max(1, r * 0.5) | 0);
        for (let i = 0; i <= n; i++) this.stampDisc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, hgt, mat);
      }
    }
    shade(fx = {}) {
      const { W, H, h, m, ao, pulse, dyn, over, u } = this;
      const beat = fx.beat || 0, off = Math.round(fx.breath || 0) * W, slow = !!fx.slow, lens = fx.lens;
      const lr2 = lens ? lens.r * lens.r : 0, dim = fx.dim || 0, spot = fx.spot, sr2 = spot ? spot.r * spot.r : 0;
      const lx = fx.light ? fx.light[0] : -0.42, ly = fx.light ? fx.light[1] : -0.52;
      const lz = Math.sqrt(Math.max(0.1, 1 - lx * lx - ly * ly)), hl = Math.hypot(lx, ly, lz + 1);
      const hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1, i = y * W + 1; x < W - 1; x++, i++) {
          const j = Math.max(W + 1, Math.min(W * H - W - 2, i + off)), k = 1 + beat * pulse[j];
          const dx = (h[j - 1] - h[j + 1]) * k * 0.5 + (dyn[i - 1] - dyn[i + 1]) * 0.5;
          const dy = (h[j - W] - h[j + W]) * k * 0.5 + (dyn[i - W] - dyn[i + W]) * 0.5;
          const nl = 1 / Math.sqrt(dx * dx + dy * dy + 1), nx = dx * nl, ny = dy * nl, nz = nl;
          const diff = Math.max(0, nx * lx + ny * ly + nz * lz), sh = Math.max(0, nx * hx + ny * hy + nz * hz);
          const ov = over[i], M = MATS[ov ? ov - 1 : m[j]];
          const cold = slow || (lens && (x - lens.x) ** 2 + (y - lens.y) ** 2 < lr2);
          const r = cold ? M.slow : M.ramp, n = r.length, s2 = sh * sh, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8, s32 = s16 * s16;
          const lit = dim && !(spot && (x - spot.x) ** 2 + (y - spot.y) ** 2 < sr2) ? 1 - dim : 1;
          const lum = (diff * 0.92 + s8 * 0.16 * M.spec + beat * pulse[j] * 0.6) * (ov ? 1 : ao[j]) * lit;
          const c = Math.max(0, Math.min(n - 1, (lum * (n - 1) + BAYER[(x & 3) | ((y & 3) << 2)] * 1.15 + 0.5) | 0));
          u[i] = s32 * s8 * M.spec * lit > 0.42 ? (cold ? 0xffffffe0 : 0xfff4f0ff) : r[c];
        }
      }
      this.g.putImageData(this.img, 0, 0); dyn.fill(0); over.fill(0);
    }
  }

  function cavity(F, W, H, wall) {
    const cx = W / 2, cy = H / 2 - 4, rx = 171, ry = 91;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const fold = Math.sin(x * 0.09 + 1.6 * Math.sin(y * 0.05)) * 1.6;
      if (d < 1) { F.h[i] = -16 + 12 * d * d; F.m[i] = matId(wall || 'wall'); }
      else if (d < 1.28) { const e = (d - 1) / 0.28; F.h[i] = 4 + 7 * Math.sin(e * Math.PI); F.m[i] = matId('skin'); }
      else { F.h[i] = 6 + fold; F.m[i] = matId('drape'); }
    }
    return { cx, cy, rx, ry };
  }

  function bakeAbdomen(W, H, seed) {
    const F = new TissueField(W, H, seed), n = F.noise, box = cavity(F, W, H, 'wall'), { cx, cy, rx, ry } = box;
    F.blob(cx - rx * 0.55, cy - ry * 0.5, rx * 0.55, ry * 0.55, -0.3, 17, 'liver', { base: -11, warp: 12 });
    for (let i = 0; i < 9; i++) {
      const a = n.R() * 6.28, r = 0.55 + n.R() * 0.32;
      F.blob(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 9 + n.R() * 14, 7 + n.R() * 9, n.R() * 3, 8, 'fat', { base: -10, warp: 8 });
    }
    const coil = (x0, y0, len, dir, r) => {
      const pts = [[x0, y0]]; let a = dir, x = x0, y = y0;
      for (let i = 0; i < len; i++) {
        a += (n.R() - 0.5) * 1.5 + Math.sin(i * 0.9) * 0.5;
        x += Math.cos(a) * r * 1.3; y += Math.sin(a) * r * 1.3;
        if (((x - cx) / (rx * 0.92)) ** 2 + ((y - cy) / (ry * 0.92)) ** 2 > 1) { a += 2.4; x += Math.cos(a) * r; y += Math.sin(a) * r; }
        pts.push([x, y]);
      }
      return pts;
    };
    F.tube(coil(cx + rx * 0.05, cy - ry * 0.25, 34, 0.2, 9), 11, 14, 'bowel', { base: -8 });
    F.tube(coil(cx + rx * 0.45, cy + ry * 0.25, 26, 2.6, 9), 10, 15, 'bowel', { base: -7 });
    F.tube(coil(cx - rx * 0.35, cy + ry * 0.45, 22, -0.3, 9), 10, 15, 'bowel', { base: -6 });
    F.finish(1.1);
    return F;
  }

  function bakeForearm(W, H, seed) {
    const F = new TissueField(W, H, seed), box = cavity(F, W, H, 'muscle'), { cx, cy, rx, ry } = box;
    for (let i = -3; i <= 3; i++) F.blob(cx, cy + i * 16, rx * 0.72, 7, 0.15, 9, i % 2 ? 'muscle' : 'tendon', { base: -8, warp: 6 });
    F.tube([[cx - rx * 0.6, cy], [cx + rx * 0.6, cy - 8]], 3, 4, 'gold', { add: true });
    F.finish(0.8);
    return F;
  }

  function bakeFlank(W, H, seed) {
    const F = new TissueField(W, H, seed), { cx, cy, rx, ry } = cavity(F, W, H, 'muscle');
    for (let i = 0; i < 6; i++) F.blob(cx - rx * 0.3 + i * 22, cy + 10, 16, 10, 0.2, 8, 'fat', { base: -8 });
    F.tube([[cx - rx * 0.7, cy + ry * 0.2], [cx + rx * 0.7, cy - ry * 0.15]], 4, 3, 'wound', { add: true });
    F.finish(0.9);
    return F;
  }

  function bakeHeart(W, H, seed) {
    const F = new TissueField(W, H, seed), { cx, cy, rx, ry } = cavity(F, W, H, 'wall');
    F.blob(cx, cy, rx * 0.42, ry * 0.55, 0.2, 22, 'heart', { base: -6, pulse: 0.8, warp: 6 });
    F.tube([[cx - 20, cy - 10], [cx + 30, cy + 16], [cx + 10, cy + 28]], 3, 3, 'artery', { add: true, pulse: 0.5 });
    F.finish(0.7);
    return F;
  }

  function bakeBrain(W, H, seed) {
    const F = new TissueField(W, H, seed), n = F.noise, { cx, cy, rx, ry } = cavity(F, W, H, 'brain');
    for (let i = 0; i < 14; i++) {
      const a = n.R() * 6.28;
      F.blob(cx + Math.cos(a) * rx * 0.35, cy + Math.sin(a) * ry * 0.35, 28, 10, a, 8, 'brain', { base: -6, warp: 10 });
    }
    F.tube([[cx - 40, cy - 20], [cx + 10, cy], [cx + 36, cy + 18]], 2, 2, 'gold', { add: true });
    F.finish(1);
    return F;
  }

  function bakeImplant(W, H, seed) {
    const F = new TissueField(W, H, seed), { cx, cy } = cavity(F, W, H, 'muscle');
    F.blob(cx, cy, 46, 28, 0, 16, 'steel', { base: -2 });
    F.tube([[cx - 30, cy], [cx + 30, cy]], 2, 2, 'gold', { add: true });
    F.tube([[cx, cy - 16], [cx, cy + 16]], 2, 2, 'gold', { add: true });
    F.finish(0.4);
    return F;
  }

  function bakeMediastinum(W, H, seed) {
    const F = bakeHeart(W, H, seed);
    const cx = W / 2, cy = H / 2 - 4;
    F.blob(cx, cy - 6, 70, 36, 0, 10, 'hush', { base: 2, warp: 8, add: true });
    return F;
  }

  const BAKERS = {
    forearm: bakeForearm, abdomen: bakeAbdomen, flank: bakeFlank, heart: bakeHeart,
    brain: bakeBrain, implant: bakeImplant, mediastinum: bakeMediastinum, ship: bakeAbdomen,
  };
  const cache = new Map();
  function fieldFor(site, seed, W, H) {
    const key = (site || 'abdomen') + ':' + (seed || 1) + ':' + W + 'x' + H;
    let F = cache.get(key);
    if (!F) {
      const bake = BAKERS[site] || bakeAbdomen;
      F = bake(W, H, (seed || 1) + (site === 'ship' ? 19 : 0));
      cache.set(key, F);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
    }
    return F;
  }

  function drawBust(g, c, o = {}) {
    const px = E.px, P = (pts, col) => px.poly(g, pts, col), T = E.tones;
    const skin = T(c.skin), hair = T(c.hair), cloth = T(c.cloth);
    let expr = o.expr || 'neutral';
    const cry = expr === 'cry', smirk = expr === 'smirk', tired = expr === 'tired';
    if (cry) expr = 'sad';
    if (smirk) expr = 'smile';
    if (tired) expr = 'sad';
    const blink = o.blink || 0, talk = o.talk || 0, cx = 56, top = 20;
    const jaw = c.jaw || 1, wide = c.wide || 1, f = (x, y) => [cx + x * wide, top + y];
    if (c.backHair) for (const s of c.backHair) P(s.map(([x, y]) => f(x, y)), hair.sh);
    P([[6, 128], [10, 104], [30, 92], [46, 88], [66, 88], [82, 92], [102, 104], [106, 128]], cloth.base);
    P([[6, 128], [10, 104], [30, 92], [34, 128]], cloth.sh);
    P([[78, 128], [82, 92], [102, 104], [106, 128]], cloth.lt);
    P([[46, 66], [66, 66], [68, 92], [56, 104], [44, 92]], skin.sh);
    P([[42, 88], [56, 110], [70, 88], [66, 86], [56, 100], [46, 86]], cloth.deep);
    P([[46, 86], [56, 100], [66, 86], [64, 92], [56, 104], [48, 92]], c.undershirt || skin.sh);
    if (c.coat) {
      P([[6, 128], [10, 104], [30, 92], [42, 88], [52, 128]], c.coat);
      P([[106, 128], [102, 104], [82, 92], [70, 88], [60, 128]], c.coat);
    }
    P([f(-27, 30), f(-31, 34), f(-30, 42), f(-26, 45)], skin.sh);
    P([f(27, 30), f(31, 34), f(30, 42), f(26, 45)], skin.base);
    const J = jaw;
    P([f(-26, 12), f(-27, 34), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(11, 60 * J), f(22, 48 * J), f(27, 34), f(26, 12), f(14, 2), f(-14, 2)], skin.base);
    P([f(-27, 30), f(-22, 48 * J), f(-11, 60 * J), f(0, 64 * J), f(-6, 54 * J), f(-16, 44), f(-22, 30)], skin.sh);
    if (c.blush) { px.ell(g, ...f(-15, 41), 4, 2, c.blush); px.ell(g, ...f(16, 41), 4, 2, c.blush); }
    if (c.lines || tired) {
      px.line(g, ...f(-11, 45), ...f(-6, 50), skin.sh, 1);
      px.line(g, ...f(11, 45), ...f(6, 50), skin.sh, 1);
    }
    const eye = (sx) => {
      const x = sx * 13, y = 30 + (expr === 'shock' ? -1 : 0) + (tired ? 1 : 0), w = 7;
      const hh = expr === 'shock' ? 8 : expr === 'angry' ? 5 : tired ? 3 : 7;
      if (blink > 0.5) { px.line(g, ...f(x - w, y + 1), ...f(x + w, y + 1), c.lash || '#1a1016', 2); return; }
      P([f(x - w, y), f(x - w + 3, y - hh + 2), f(x + w - 3, y - hh + 2), f(x + w, y), f(x + w - 2, y + 4), f(x - w + 2, y + 4)], '#f8f4ee');
      const ix = x + (o.look || 0) * 2;
      px.ell(g, ...f(ix, y - 1), 4, expr === 'shock' ? 4 : 5, c.iris || '#3a5a7a');
      px.ell(g, ...f(ix, y), 2, 3, c.pupil || '#120c14');
      px.rect(g, ...f(ix - 3, y - 4), 3, 2, '#ffffff');
    };
    eye(-1); eye(1);
    const by = 17 + (c.browDrop || 0), br = expr === 'angry' ? 3 : expr === 'sad' ? -3 : smirk ? 2 : 0;
    const bc = c.brow || hair.deep, bw = c.browW || 2;
    px.line(g, ...f(-20, by - br), ...f(-7, by + br), bc, bw);
    px.line(g, ...f(7, by + (smirk ? -2 : br)), ...f(20, by - br), bc, bw);
    px.line(g, ...f(1, 40), ...f(-1, 45), skin.sh, 1);
    const my = 53, mo = talk > 0.5 || expr === 'shout' || expr === 'shock';
    if (mo) {
      const a = expr === 'shout' || expr === 'shock' ? 7 : 4, w = expr === 'shout' ? 7 : 5;
      P([f(-w, my - 1), f(w, my - 1), f(w - 2, my + a), f(-w + 2, my + a)], '#5a1a24');
    } else if (expr === 'smile') {
      px.line(g, ...f(-7, my - 1), ...f(0, my + 2), skin.deep, 1);
      px.line(g, ...f(0, my + 2), ...f(7, my - 1), skin.deep, 1);
    } else if (expr === 'sad' || expr === 'angry') {
      px.line(g, ...f(-5, my + 2), ...f(0, my), skin.deep, 1);
      px.line(g, ...f(0, my), ...f(5, my + 2), skin.deep, 1);
    } else px.line(g, ...f(-4, my), ...f(4, my), skin.deep, 1);
    if (cry) { px.line(g, ...f(-13, 36), ...f(-12, 48), '#8ec8e8', 1); px.line(g, ...f(13, 36), ...f(14, 50), '#8ec8e8', 1); }
    if (c.moustache) P([f(-13, 50), f(-6, 46), f(0, 48), f(6, 46), f(13, 50), f(8, 52), f(0, 50), f(-8, 52)], c.moustache);
    if (c.frontHair) for (const [s, tone] of c.frontHair) P(s.map(([x, y]) => f(x, y)), hair[tone || 'base']);
    if (c.cap) {
      const k = T(c.cap);
      P([f(-29, 16), f(-27, 2), f(-14, -9), f(14, -9), f(27, 2), f(29, 16), f(16, 11), f(-16, 11)], k.base);
      P([f(-29, 16), f(-16, 11), f(16, 11), f(29, 16), f(27, 18), f(16, 14), f(-16, 14), f(-27, 18)], k.deep);
    }
    if (c.glasses) {
      const m = c.glasses;
      for (const sx of [-1, 1]) {
        const x = sx * 13;
        px.line(g, ...f(x - 9, 25), ...f(x + 9, 25), m, 1);
        px.line(g, ...f(x - 9, 25), ...f(x - 8, 33), m, 1);
        px.line(g, ...f(x + 9, 25), ...f(x + 8, 33), m, 1);
        px.line(g, ...f(x - 8, 34), ...f(x + 8, 34), m, 1);
      }
      px.line(g, ...f(-4, 27), ...f(4, 27), m, 1);
    }
    if (o.maskUp && c.mask) {
      const k = T(c.mask);
      P([f(-27, 36), f(27, 36), f(25, 54), f(0, 68), f(-25, 54)], k.base);
    }
    if (c.scar) px.line(g, ...f(c.scar[0], c.scar[1]), ...f(c.scar[2], c.scar[3]), skin.deep, 1);
    E.px.reset(g);
  }

  const CAST = {
    vale: { skin: '#f6d0b2', hair: '#c9562a', iris: '#3f8a58', cloth: '#2f9c8e', cap: '#2bb0a2', mask: '#bfe6dc', undershirt: '#e9fff6', blush: '#f0a48c', wide: 0.95,
      backHair: [[[-27, 14], [-30, 40], [-24, 52], [-16, 40], [-16, 14]], [[27, 14], [30, 40], [24, 52], [16, 40], [16, 14]]],
      frontHair: [[[[-27, 12], [-24, 24], [-16, 16], [-10, 22], [-3, 14], [3, 21], [10, 14], [18, 22], [27, 12], [14, 8], [-14, 8]], 'base']] },
    quill: { skin: '#dcae8e', hair: '#8d8a88', iris: '#4a4a55', cloth: '#3d62a6', cap: '#35558f', undershirt: '#dfe6f2', moustache: '#a7a3a0', lines: true, wide: 1.08, jaw: 1.04, browW: 3, brow: '#7c7875', browDrop: 2, mask: '#a9cfe0', frontHair: [] },
    oyelaran: { skin: '#7c4a2e', hair: '#c9c5bb', iris: '#2a1a12', cloth: '#2e2c36', coat: '#ece7da', undershirt: '#3a3644', lines: true, jaw: 0.98, glasses: '#d8c070',
      frontHair: [[[[-27, 18], [-27, 2], [-14, -8], [14, -8], [27, 2], [27, 18], [20, 10], [8, 6], [-8, 6], [-20, 10]], 'base']] },
    sokolova: { skin: '#e8c6aa', hair: '#dedad2', iris: '#6a8aa8', cloth: '#6b7a48', undershirt: '#f0ece0', lines: true, wide: 1.02, jaw: 1.02, scar: [10, 14, 17, 40], browW: 3,
      backHair: [[[-28, 6], [-34, 34], [-30, 58], [-20, 50], [-20, 10]], [[28, 6], [36, 26], [32, 48], [22, 10]]],
      frontHair: [[[[-27, 16], [-26, 2], [-12, -8], [14, -8], [27, 2], [27, 16], [16, 6], [-16, 8]], 'base']] },
    percy: { skin: '#f0c8a4', hair: '#6a3a22', iris: '#3a6a38', cloth: '#245c78', cap: '#1d4e68', glasses: '#d8d2c4', blush: '#e09080', wide: 0.98, jaw: 0.96,
      frontHair: [[[[-24, 14], [-20, 4], [-8, 0], [8, 2], [22, 6], [24, 16], [10, 8], [-10, 8]], 'base']] },
    odalys: { skin: '#c4845a', hair: '#2a140e', iris: '#2a2418', cloth: '#1f6a62', undershirt: '#f4e2c8', blush: '#d07060', wide: 1.02,
      backHair: [[[-26, 10], [-32, 48], [-18, 40], [-16, 12]], [[26, 10], [34, 36], [24, 52], [18, 12]]],
      frontHair: [[[[-26, 14], [-22, 2], [-6, -4], [12, 0], [26, 8], [20, 16], [-8, 12]], 'base']] },
    hale: { skin: '#e4c2a4', hair: '#b8b4ae', iris: '#5a6a78', cloth: '#3a342c', coat: '#1c1a22', undershirt: '#d8d0c4', lines: true, jaw: 1.06, browDrop: 3, glasses: '#c8c0b0',
      frontHair: [[[[-26, 16], [-24, 4], [-8, -2], [16, 2], [26, 14], [8, 8], [-12, 10]], 'base']] },
    clementine: { skin: '#f6d8c4', hair: '#1a120e', iris: '#6a4038', cloth: '#e8e2d8', undershirt: '#f4f0ea', blush: '#f0a0a0', wide: 0.92, jaw: 0.9,
      backHair: [[[-24, 12], [-28, 50], [-16, 36], [-14, 12]], [[24, 12], [30, 44], [18, 36], [14, 12]]],
      frontHair: [[[[-22, 16], [-18, 6], [-4, 2], [8, 4], [20, 10], [16, 18], [-10, 14]], 'base']] },
  };

  function bust(g, id, o, x, y, size) {
    const c = CAST[id] || CAST.vale;
    const sc = size && size !== 112 ? size / 112 : 1;
    const can = g && typeof g.save === 'function';
    if (can) {
      g.save();
      if (x || y) g.translate(x || 0, y || 0);
      if (sc !== 1) g.scale(sc, sc);
    }
    drawBust(g, c, o || {});
    if (can) g.restore();
    E.px.reset(g);
  }

  function toolIcon(g, name, x, y, s) {
    const px = E.px, c = '#d5dee6', a = '#9aa8b4';
    s = s || 1;
    const X = (n) => x + n * s, Y = (n) => y + n * s;
    if (name === 'forceps') { px.line(g, X(2), Y(16), X(8), Y(4), c, 1); px.line(g, X(14), Y(16), X(8), Y(4), c, 1); }
    else if (name === 'scalpel') { px.line(g, X(3), Y(16), X(12), Y(4), c, 1); px.poly(g, [[X(12), Y(2)], [X(16), Y(6)], [X(11), Y(6)]], '#e8eef4'); }
    else if (name === 'suture') { px.line(g, X(4), Y(14), X(14), Y(4), '#7eb6e8', 1); px.disc(g, X(14), Y(4), 2, c); }
    else if (name === 'salve') { px.rect(g, X(4), Y(6), 8, 8, '#3ecf8e'); px.rect(g, X(6), Y(3), 4, 3, c); }
    else if (name === 'syringe') { px.rect(g, X(3), Y(7), 12, 4, '#d8ecf4'); px.rect(g, X(3), Y(8), 7, 2, '#49b6d6'); px.line(g, X(15), Y(9), X(18), Y(9), c, 1); }
    else if (name === 'cautery') { px.line(g, X(4), Y(16), X(12), Y(5), c, 1); px.disc(g, X(13), Y(4), 2, '#ffb45a'); }
    else if (name === 'suction') { px.rect(g, X(7), Y(4), 3, 12, c); px.disc(g, X(8), Y(4), 3, a); }
    else { px.disc(g, X(8), Y(8), 5, '#12343a'); px.disc(g, X(8), Y(8), 2, '#5ff0e0'); }
  }

  function drawHand(g, p, ox, oy) {
    const px = E.px, x = p.x + ox, y = p.y + oy, open = (p.trig || 0) < 0.3;
    px.disc(g, x - 6, y + 4, 5, '#f0c8a8');
    toolIcon(g, p.tool || 'forceps', x - 2, y - 16, 1);
    if (p.tool === 'forceps' && !open) px.line(g, x + 4, y - 4, x + 8, y - 8, '#d5dee6', 1);
    if (p.tool === 'cautery' && p.trig > 0.3) px.disc(g, x + 10, y - 12, 3, '#ffcf70');
    px.disc(g, x, y, 2, p.color || '#e8443a');
  }

  function titleBackdrop(g, W, H, t) {
    const px = E.px;
    px.rect(g, 0, 0, W, H, '#071018');
    px.rect(g, 0, H * 0.62 | 0, W, H, '#0c1c28');
    px.rect(g, 0, (H * 0.72) | 0, W, 8, '#16324a');
    for (let i = 0; i < 8; i++) {
      const x = 18 + i * ((W - 30) / 8), h = 40 + ((i * 17) % 28);
      px.rect(g, x, (H * 0.62) - h, 16, h, i % 2 ? '#102838' : '#173448');
      for (let wy = 6; wy < h - 4; wy += 7) if ((i + wy) % 3 === 0) px.rect(g, x + 3, (H * 0.62) - h + wy, 3, 2, '#f0d78a');
    }
    px.rect(g, W * 0.55, 28, 4, (H * 0.62) - 20, '#1a3044');
    px.rect(g, W * 0.72, 18, 3, (H * 0.62) - 10, '#1a3044');
    const sweep = (t * 40) % (W + 40) - 20;
    px.rect(g, sweep, (H * 0.78) | 0, 18, 6, '#c84848');
    px.rect(g, sweep + 22, (H * 0.78) | 0, 10, 6, '#d8d2c4');
    for (let i = 0; i < 28; i++) {
      const x = (i * 47 + t * 30) % W, y = (i * 29 + t * 70) % H;
      px.line(g, x, y, x + 1, y + 4, '#8fb8c8', 1);
    }
  }

  function stage(g, name, W, H, t) {
    const px = E.px;
    const sky = name === 'harbor' ? '#071018' : name === 'chapel' ? '#140e18' : '#07141c';
    px.rect(g, 0, 0, W, H, sky);
    px.rect(g, 0, 150, W, H - 150, '#102028');
    if (name === 'theatre') {
      px.rect(g, 20, 20, W - 40, 90, '#0c2428');
      for (let i = 0; i < 6; i++) px.rect(g, 36 + i * 36, 36, 18, 10, '#1a4a44');
      px.rect(g, W / 2 - 30, 18, 60, 8, '#f2f0e6');
    } else if (name === 'office') {
      px.rect(g, 30, 40, 80, 50, '#1a2830');
      px.rect(g, 40, 70, 28, 16, '#c8a45a');
    } else if (name === 'harbor' || name === 'ship') {
      titleBackdrop(g, W, H, t);
    } else if (name === 'chapel') {
      px.rect(g, W / 2 - 8, 24, 16, 70, '#2a2030');
      px.rect(g, W / 2 - 20, 40, 40, 6, '#3a3040');
    } else {
      px.rect(g, 16, 30, W - 32, 70, '#102830');
      for (let i = 0; i < 5; i++) px.rect(g, 28 + i * 40, 44, 22, 14, '#d8e4dc');
    }
    const lamp = 80 + Math.sin(t) * 10;
    px.rect(g, lamp, 8, 18, 4, '#f0e2b0');
  }

  GAME.Art = { TissueField, fieldFor, bust, drawBust, CAST, toolIcon, drawHand, titleBackdrop, stage, matId };
})();
