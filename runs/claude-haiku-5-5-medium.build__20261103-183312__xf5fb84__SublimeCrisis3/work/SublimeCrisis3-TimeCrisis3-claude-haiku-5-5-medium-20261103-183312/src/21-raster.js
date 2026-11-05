// 21-raster.js: Rail3D, the renderer (plan 4.1). A software z-buffer rasterizer drawn into one pixel buffer per viewport,
// then put on the engine's low-resolution screen.
//   - triangles: perspective-correct (1/z, u/z, v/z), near-plane clipped, depth tested;
//   - light: a per-triangle level from the sun, the ambient and the point lights, quantized to the engine's five bands
//     and dithered with a 4x4 Bayer matrix;
//   - fog: quantized to eight steps with the same dither;
//   - the sky: a gradient, stars, a moon and a skyline silhouette, from the ray's elevation and azimuth;
//   - actors: the engine's rigs drawn with rig.draw from a view that faces the camera, composited where they are nearer.
// Everything runs in JS; nothing is read from the network. Canvas work happens only in present() and the billboards.

TC.NEAR = 2;                    // u
TC.FAR = 1400;                  // u, where fog is full
TC.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

TC.Raster = class Raster {
  constructor() {
    this.w = 0; this.h = 0;
    this.u32 = null; this.dep = null; this.cv = null; this.cx = null; this.img = null;
  }

  // (Re)allocate the buffer for a viewport of w x h pixels. Canvases are made only when drawing in a browser.
  size(w, h) {
    if (w === this.w && h === this.h && this.u32) return;
    this.w = w; this.h = h;
    this.dep = new Float32Array(w * h);
    if (typeof document !== 'undefined') {
      if (!this.cv) this.cv = document.createElement('canvas');
      this.cv.width = w; this.cv.height = h;
      this.cx = this.cv.getContext('2d');
      this.img = this.cx.createImageData(w, h);
      this.u32 = new Uint32Array(this.img.data.buffer);
    } else {
      this.u32 = new Uint32Array(w * h);
    }
  }

  // Begin a frame for a camera {x, y, z, yaw, pitch, fov, roll} and a viewport's aspect.
  begin(cam, env, t, lights) {
    const w = this.w, h = this.h;
    this.cam = cam;
    this.env = env;
    this.t = t;
    this.lights = lights || [];
    this.F = (h / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);
    this.cxp = w / 2; this.cyp = h / 2;
    this.b = TC.basis(cam.yaw, cam.pitch);
    this.dep.fill(0);
    this.drawSky();
  }

  // Sky: the gradient by elevation, the stars, the moon, and the skyline at the horizon, per pixel.
  drawSky() {
    const { w, h, F, cxp, cyp, b, env, u32 } = this;
    const top = TC.hex(env.top || '#060a1c'), hor = TC.hex(env.horizon || '#2a3a6a'), dark = TC.hex(env.silhouette || '#0a0e1e');
    const moon = env.moon ? TC.V.norm(env.moon) : null;
    for (let y = 0; y < h; y++) {
      const dy = -(y + 0.5 - cyp) / F;
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cxp) / F;
        const d = [b.f[0] + b.r[0] * dx + b.u[0] * dy, b.f[1] + b.r[1] * dx + b.u[1] * dy, b.f[2] + b.r[2] * dx + b.u[2] * dy];
        const el = Math.asin(TC.clamp(d[2] / TC.V.len(d), -1, 1));
        const az = Math.atan2(d[1], d[0]);
        const k = TC.clamp(el / 0.5 + 0.12, 0, 1);
        let r = TC.lerp(hor[0], top[0], k), g = TC.lerp(hor[1], top[1], k), bl = TC.lerp(hor[2], top[2], k);
        if (el > 0.08) {
          const sh = TC.texHash(Math.floor(az * 120), Math.floor(el * 120), 77);
          if (sh > 0.9965) { r = g = bl = 255; }
        }
        if (moon) {
          const dot = TC.V.dot(TC.V.norm(d), moon);
          if (dot > 0.9985) { r = 255; g = 245; bl = 200; }
          else if (dot > 0.985) { const s = (dot - 0.985) / 0.0135; r = TC.lerp(r, 255, s * 0.5); g = TC.lerp(g, 230, s * 0.5); bl = TC.lerp(bl, 180, s * 0.5); }
        }
        const sky = TC.skyline(az, env.skyline || 0);
        if (el < sky) { r = dark[0]; g = dark[1]; bl = dark[2]; }
        u32[y * w + x] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
  }

  // Lighting level of a point (0..1.2+) from the sun, the ambient and the point lights.
  light(n, p) {
    const env = this.env;
    let L = env.ambient;
    const sd = env.sunDir;
    if (sd) L += env.sunK * Math.max(0, TC.V.dot(n, sd));
    for (const li of this.lights) {
      const d = Math.hypot(li.x - p[0], li.y - p[1], li.z - p[2]);
      if (d < li.r) L += li.k * (1 - d / li.r) * (1 - d / li.r);
    }
    return L;
  }

  // Draw the world's triangles, each as { a, b, c, uv: [u,v,...], tile, nrm, L (static), glow, water, fogHalf } in
  // world space. The caller passes a static mesh and the dynamic boxes already expanded to triangles.
  drawTris(tris) {
    const { cam, b, F, cxp, cyp } = this;
    const near = TC.NEAR;
    for (const t of tris) {
      // World to view: x right, y up, z forward.
      const v = [t.a, t.b, t.c].map(p => {
        const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
        return [dx * b.r[0] + dy * b.r[1] + dz * b.r[2], dx * b.u[0] + dy * b.u[1] + dz * b.u[2], dx * b.f[0] + dy * b.f[1] + dz * b.f[2]];
      });
      const uv = t.uv;
      let poly = [0, 1, 2].map(i => ({ x: v[i][0], y: v[i][1], z: v[i][2], u: uv[i * 2], v: uv[i * 2 + 1] }));
      if (poly.every(p => p.z < near) || poly.every(p => p.z > TC.FAR * 1.5)) continue;
      if (poly.some(p => p.z < near)) poly = TC.clipNear(poly, near);
      if (poly.length < 3) continue;
      // Light from the world normal, rotated nothing (the normal is a world vector).
      const Lw = t.L !== undefined ? t.L : this.light(t.nrm, t.centre);
      const band = t.glow ? 4 : null;
      for (let i = 1; i + 1 < poly.length; i++) {
        this.fillTri(poly[0], poly[i], poly[i + 1], F, cxp, cyp, t, Lw, band);
      }
    }
  }

  // The rasterizer: a screen-space triangle with a top-left fill (pixel centres), perspective-correct interpolation.
  fillTri(p0, p1, p2, F, cxp, cyp, t, L, forcedBand) {
    const w = this.w, h = this.h;
    const s = [p0, p1, p2].map(p => {
      const iz = 1 / p.z;
      return { x: cxp + p.x * F * iz, y: cyp - p.y * F * iz, iz, uz: p.u * iz, vz: p.v * iz };
    });
    const minX = Math.max(0, Math.floor(Math.min(s[0].x, s[1].x, s[2].x)));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(s[0].x, s[1].x, s[2].x)));
    const minY = Math.max(0, Math.floor(Math.min(s[0].y, s[1].y, s[2].y)));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(s[0].y, s[1].y, s[2].y)));
    if (maxX < minX || maxY < minY) return;
    const area = (s[1].x - s[0].x) * (s[2].y - s[0].y) - (s[2].x - s[0].x) * (s[1].y - s[0].y);
    if (Math.abs(area) < 1e-9) return;
    const inv = 1 / area;
    const tile = t.tile, size = tile.size, mask = size - 1;
    const fogC = TC.hex(this.env.fog || '#101830');
    const fogNear = this.env.fogNear || 300;
    const u32 = this.u32, dep = this.dep;
    const band0 = forcedBand;
    const tileBands = tile.bands;
    const water = tile.water ? this.t * 0.9 : 0;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w0 = ((s[1].x - px) * (s[2].y - py) - (s[2].x - px) * (s[1].y - py)) * inv;
        const w1 = ((s[2].x - px) * (s[0].y - py) - (s[0].x - px) * (s[2].y - py)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const iz = w0 * s[0].iz + w1 * s[1].iz + w2 * s[2].iz;
        const idx = y * w + x;
        if (iz <= dep[idx]) continue;
        dep[idx] = iz;
        const z = 1 / iz;
        const uu = (w0 * s[0].uz + w1 * s[1].uz + w2 * s[2].uz) * z + water;
        const vv = (w0 * s[0].vz + w1 * s[1].vz + w2 * s[2].vz) * z;
        const tx = Math.floor((uu - Math.floor(uu)) * size) & mask;
        const ty = Math.floor((vv - Math.floor(vv)) * size) & mask;
        const bayer = TC.BAYER[((x & 3) << 2) | (y & 3)];
        let band = band0 !== null && band0 !== undefined ? band0 : Math.floor(TC.clamp(L, 0, 1.2) * 4 + bayer - 0.5);
        if (band < 0) band = 0; else if (band > 4) band = 4;
        let c = tileBands[band][ty * size + tx];
        // Fog: eight steps, dithered.
        let f = TC.clamp((z - fogNear) / (TC.FAR - fogNear), 0, 1);
        f = Math.pow(f, 1.2);
        if (tile.glow) f *= 0.5;
        const fq = Math.floor(f * 8 + bayer) / 8;
        if (fq > 0) {
          const cr = c & 255, cg = (c >> 8) & 255, cb = (c >> 16) & 255;
          const r = cr + (fogC[0] - cr) * fq, g = cg + (fogC[1] - cg) * fq, bl = cb + (fogC[2] - cb) * fq;
          c = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
        }
        u32[idx] = c;
      }
    }
  }

  // Composite a rig's picture (an ImageData of its scratch canvas) at (ox, oy), where the billboard is nearer than
  // the world: depth z is the billboard's view depth, a value per picture.
  billboard(img, ox, oy, pw, ph, z, tint) {
    const { w, h, u32, dep } = this;
    const data = img.data;
    for (let j = 0; j < ph; j++) {
      const y = oy + j;
      if (y < 0 || y >= h) continue;
      for (let i = 0; i < pw; i++) {
        const x = ox + i;
        if (x < 0 || x >= w) continue;
        const k = (j * pw + i) * 4;
        if (data[k + 3] < 128) continue;
        const idx = y * w + x;
        const iz = 1 / z;
        if (iz <= dep[idx]) continue;
        dep[idx] = iz;
        const r = Math.min(255, data[k] * tint), g = Math.min(255, data[k + 1] * tint), bl = Math.min(255, data[k + 2] * tint);
        u32[idx] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
  }

  // Put the picture on the page: the buffer's canvas, drawn into the engine's screen at (x, y).
  present(g, x, y) {
    if (!this.cx) return;
    this.cx.putImageData(this.img, 0, 0);
    g.drawImage(this.cv, x, y);
  }

  // Project a world point with the current camera: [sx, sy, z] in this viewport's pixels, or null behind the camera.
  project(p) {
    const { cam, b, F, cxp, cyp } = this;
    const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
    const z = dx * b.f[0] + dy * b.f[1] + dz * b.f[2];
    if (z < TC.NEAR) return null;
    const x = dx * b.r[0] + dy * b.r[1] + dz * b.r[2];
    const yv = dx * b.u[0] + dy * b.u[1] + dz * b.u[2];
    return [cxp + x * F / z, cyp - yv * F / z, z];
  }
};

// The skyline: a height (radians of elevation) along the azimuth, from a few sines; the stage sets its amplitude.
TC.skyline = function (az, amp) {
  if (!amp) return 0;
  return amp * (0.6 + 0.4 * Math.sin(az * 5.3) + 0.25 * Math.sin(az * 13.1 + 1.3)) * 0.15 + 0.01;
};

// Clip a polygon against the near plane z = near (Sutherland-Hodgman, in view space).
TC.clipNear = function (poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], bb = poly[(i + 1) % poly.length];
    const ina = a.z >= near, inb = bb.z >= near;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (near - a.z) / (bb.z - a.z);
      out.push({ x: TC.lerp(a.x, bb.x, t), y: TC.lerp(a.y, bb.y, t), z: near, u: TC.lerp(a.u, bb.u, t), v: TC.lerp(a.v, bb.v, t) });
    }
  }
  return out;
};

// A box as 12 triangles in world space, with the material's tile, the UV in world units (a 48-u tile), and a normal per
// face. Faces that are not visible from anywhere are still drawn (double-sided): simpler, and correct for thin props.
TC.boxTris = function (b, mat, out, o = {}) {
  const [x0, y0, z0, x1, y1, z1] = b;
  const tile = TC.tile(mat);
  const S = 1 / 48;
  const faces = [
    // normal, four corners (counter-clockwise seen from outside)
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]],
    [[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [[0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  ];
  for (const [n, q] of faces) {
    // Texture coordinates across the face, in tile units.
    const uv = q.map(p => {
      if (n[2] !== 0) return [p[0] * S, p[1] * S];
      if (n[0] !== 0) return [p[1] * S, p[2] * S];
      return [p[0] * S, p[2] * S];
    });
    const centre = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
    const base = { nrm: n, tile, glow: !!tile.glow, centre, L: o.L };
    const tris = [[0, 1, 2], [0, 2, 3]];
    for (const [i, j, k] of tris) {
      out.push(Object.assign({ a: q[i], b: q[j], c: q[k], uv: [uv[i][0], uv[i][1], uv[j][0], uv[j][1], uv[k][0], uv[k][1]] }, base));
    }
  }
  return out;
};
