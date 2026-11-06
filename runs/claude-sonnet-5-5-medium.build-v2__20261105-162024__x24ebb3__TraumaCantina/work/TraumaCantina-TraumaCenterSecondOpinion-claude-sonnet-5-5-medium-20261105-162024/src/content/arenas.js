// Arenas: ramps, organ shapes, surface height (a pure function: also places everything on the surface) and base painting.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const W = 480, H = 270;
const hex = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
function mkNoise(seed) { // value-noise fbm, deterministic
  const g = []; let s = seed; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < 64 * 64; i++) g.push(r());
  const at = (x, y) => g[((y & 63) * 64) + (x & 63)]; const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy; };
  return (x, y) => (n2(x, y) * 0.55 + n2(x * 2.1, y * 2.1) * 0.3 + n2(x * 4.3, y * 4.3) * 0.15);
}
const ell = (x, z, cx, cz, rx, rz) => 1 - Math.min(1, ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2);
const sm = (v) => Math.max(0, Math.min(1, v));
export const ARENAS = {
  forearm: { ramp: [0x8c5a3c, 0xb07a52, 0xcf9a6c, 0xe0b88a, 0xefd0a8], cavity: 0x1f6b73, shape: (x, z) => sm(ell(x, z, 0, 0, 7.6, 4.2) * 3), h: (x, z, t) => 0.25 * sm(ell(x, z, 0, 0, 7.6, 4.2) * 2) },
  stomach: { ramp: [0x8a3a3a, 0xb25550, 0xd3766a, 0xe99a86, 0xf6bfa8], cavity: 0x1f6b73, shape: (x, z) => sm(ell(x, z, 0, 0, 7.2, 4.0) * 3), h: (x, z, t) => 0.35 * sm(ell(x, z, 0, 0, 7, 4) * 2) + 0.06 * Math.sin(t * 1.4 + x * 0.7) },
  three: { ramp: [0x8c5a3c, 0xb07a52, 0xcf9a6c, 0xe0b88a, 0xefd0a8], cavity: 0x1f6b73, shape: (x, z) => sm(ell(x, z, 0, 0, 7.6, 4.2) * 3), h: (x, z, t) => 0.2 * sm(ell(x, z, 0, 0, 7, 4) * 2) },
  bone: { ramp: [0x3a1420, 0x5e1f2c, 0x8a3040, 0xa8484a, 0xc0645a], cavity: 0x1f6b73, shape: (x, z) => sm(ell(x, z, 0, 0, 7.4, 4.1) * 3), h: (x, z, t) => 0.3 * sm(ell(x, z, 0, 0, 7, 4) * 2) },
  liver: { ramp: [0x3c0d1c, 0x5a1424, 0x7a1f2e, 0x9a2e3a, 0xb6444a], cavity: 0x1a0a18, shape: (x, z) => sm(Math.max(ell(x, z, -2.6, 0.1, 4.4, 3.2), ell(x, z, 2.8, 0.2, 3.6, 2.8)) * 3.2), h: (x, z, t) => 0.55 * sm(Math.max(ell(x, z, -2.6, 0.1, 4.4, 3.2), ell(x, z, 2.8, 0.2, 3.6, 2.8)) * 1.6) },
  kidney: { ramp: [0x8a6a1a, 0xb08a24, 0xcfa83a, 0xe2c25a, 0xf0d98a], cavity: 0x1f6b73, shape: (x, z) => sm(ell(x, z, 0, 0, 7.2, 4.0) * 3), h: (x, z, t) => 0.2 * sm(ell(x, z, 0, 0, 7, 4) * 2) },
  lung: { ramp: [0x4a3a44, 0x6a5560, 0x8a7078, 0xa88c92, 0xc8aaaa], cavity: 0x1a0a18, shape: (x, z) => sm(Math.max(ell(x, z, -2.7, -0.2, 3.9, 3.4), ell(x, z, 2.7, -0.2, 3.9, 3.4)) * 3), h: (x, z, t) => (0.5 + 0.12 * Math.sin(t * 1.3)) * sm(Math.max(ell(x, z, -2.7, -0.2, 3.9, 3.4), ell(x, z, 2.7, -0.2, 3.9, 3.4)) * 1.5) },
  heart: { ramp: [0x3c0d24, 0x5e1430, 0x8a1f38, 0xb5343f, 0xd65c4f], cavity: 0x1c0a18, shape: (x, z) => sm(ell(x, z, 0, -0.2, 5.6, 3.7) * 3), h: (x, z, t, st) => (2.0 * sm(ell(x, z, 0, -0.2, 5.6, 3.7)) ** 0.8) * (1 + (st?.thump ?? 0) * 0.07) },
  chest: { ramp: [0x4a2a38, 0x6e3a48, 0x944e58, 0xb86a68, 0xd48a7c], cavity: 0x1a0a18, shape: (x, z) => sm(ell(x, z, 0, 0, 7.4, 4.1) * 3), h: (x, z, t) => 0.7 * sm(ell(x, z, 0, 0, 7, 4) * 1.5) + 0.1 * Math.sin(t * 1.2) * sm(ell(x, z, -3, 0, 3, 3) * 2) },
  spine: { ramp: [0x5a6272, 0x7a8494, 0xa0a8b4, 0xc8ccd0, 0xe8e4d8], cavity: 0x18202c, shape: (x, z) => sm(ell(x, z, 0, 0, 7.4, 4.1) * 3), h: (x, z, t) => 0.3 * sm(ell(x, z, 0, 0, 7, 4) * 2) },
};
export const heightAt = (arena, x, z, t = 0, st) => (ARENAS[arena] || ARENAS.forearm).h(x, z, t, st);

export function paintBase(arena, seed = 5, tint = 0) {
  const A = ARENAS[arena] || ARENAS.forearm, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data, noise = mkNoise(seed * 13 + 1);
  const ramp = A.ramp.map(hex), cav = hex(A.cavity);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = (px / W - 0.5) * 16, z = (py / H - 0.5) * 9, m = A.shape(x, z), o = (py * W + px) * 4;
    let c;
    if (m <= 0.02) { const n = noise(x * 0.7, z * 0.7); c = n > 0.55 ? hex(0x2a8089) : n > 0.4 ? cav.length && hex(0x1f6b73) : hex(0x185a62); if (arena === 'liver' || arena === 'lung' || arena === 'heart' || arena === 'chest' || arena === 'spine') c = noise(x, z) > 0.58 ? hex(0x2a0f26) : cav; }
    else {
      const light = 0.25 + 0.75 * m + (noise(x * 0.9, z * 0.9) - 0.5) * 0.9 + (-z * 0.02);
      const idx = Math.max(0, Math.min(4, Math.floor(Math.max(0, Math.min(1, light)) * 5 + (BAYER[(px & 3) + (py & 3) * 4] / 16) * 0.9 - 0.2)));
      c = ramp[idx];
    }
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const px = (x) => Math.round(x * 30 + 240), pz = (z) => Math.round(z * 30 + 135);
  let s = seed * 7 + 3; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const dot = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  // vessels: random-walk branches
  const vessels = (n, col, col2, bounds) => {
    for (let i = 0; i < n; i++) {
      let x = 240 + (r() - 0.5) * 300, y = 135 + (r() - 0.5) * 170, h = r() * 6.28, w = 2;
      for (let k = 0; k < 90; k++) {
        if (A.shape((x - 240) / 30, (y - 135) / 30) < 0.5) break;
        g.fillStyle = col; g.fillRect(x | 0, y | 0, w, w); if (w === 2 && k % 3 === 0) { g.fillStyle = col2; g.fillRect((x | 0) + 1, (y | 0) + 1, 1, 1); }
        h += (r() - 0.5) * 0.55; x += Math.cos(h) * 1.6; y += Math.sin(h) * 1.6; if (k > 30) w = 1;
        if (r() < 0.045) { /* branch */ let bx = x, by = y, bh = h + (r() < 0.5 ? 0.9 : -0.9); for (let j = 0; j < 25; j++) { if (A.shape((bx - 240) / 30, (by - 135) / 30) < 0.5) break; g.fillRect(bx | 0, by | 0, 1, 1); bh += (r() - 0.5) * 0.6; bx += Math.cos(bh) * 1.5; by += Math.sin(bh) * 1.5; } }
      }
    }
  };
  switch (arena) {
    case 'forearm': case 'three': case 'bone': for (let i = 0; i < 260; i++) { const x = 40 + r() * 400, y = 30 + r() * 210; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.5) dot(x | 0, y | 0, arena === 'bone' ? '#3a1420' : '#6b4226'); } if (arena !== 'forearm') vessels(5, '#9d3b3b', '#c45858'); break;
    case 'stomach': for (let k = 0; k < 9; k++) { g.fillStyle = '#a04848'; for (let x = 50; x < 430; x++) { const y = 40 + k * 22 + Math.sin(x * 0.045 + k) * 6; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.5) g.fillRect(x, y | 0, 1, 1); } } vessels(4, '#f08a5d', '#f7b08a'); break;
    case 'liver': vessels(10, '#f08a5d', '#f7b08a'); vessels(6, '#2e1a52', '#4a2e7a'); for (let i = 0; i < 40; i++) dot(60 + r() * 360 | 0, 40 + r() * 190 | 0, '#d98a8a'); break;
    case 'kidney': for (let i = 0; i < 70; i++) { const x = 30 + r() * 420, y = 20 + r() * 230; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.5) { g.fillStyle = '#e9c46a'; g.fillRect(x | 0, y | 0, 3 + (r() * 4 | 0), 2); } } vessels(3, '#f08a5d', '#f7b08a'); break;
    case 'lung': for (let i = 0; i < 700; i++) { const x = 50 + r() * 380, y = 30 + r() * 210; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.5) dot(x | 0, y | 0, i % 2 ? '#5a4650' : '#d2b2b0'); } vessels(5, '#6a7ac0', '#8a9ae0'); break;
    case 'heart': for (let i = 0; i < 5; i++) { const x = 100 + r() * 280, y = 30 + r() * 220; if (A.shape((x - 240) / 30, (y - 135) / 30) < 0.5 && A.shape((x - 240) / 30, (y - 135) / 30) > 0.05) { g.fillStyle = '#e9c46a'; g.fillRect(x | 0, y | 0, 10, 5); } } vessels(9, '#f08a5d', '#f7b08a'); vessels(5, '#2e1a52', '#4a2e7a'); for (let i = 0; i < 260; i++) { const x = 70 + r() * 340 | 0, y = 40 + r() * 190 | 0; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.6 && x > 240) dot(x, y, '#f6d0c0'); } break;
    case 'chest': g.strokeStyle = '#e8d8c0'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(240, 135, 210 - k * 6, 80 + k * 6, 0, Math.PI * (1.1 + k * 0.05), Math.PI * (1.9 - k * 0.05)); g.stroke(); } vessels(8, '#f08a5d', '#f7b08a'); for (let i = 0; i < 300; i++) { const x = 60 + r() * 360, y = 40 + r() * 190; if (A.shape((x - 240) / 30, (y - 135) / 30) > 0.5) dot(x | 0, y | 0, i % 2 ? '#7a4a58' : '#e8c8c0'); } break;
    case 'spine': for (let k = 0; k < 11; k++) { const x = 70 + k * 34; g.fillStyle = '#e8e4d8'; g.fillRect(x, 120, 26, 28); g.fillStyle = '#a0a8b4'; g.fillRect(x, 142, 26, 6); g.fillStyle = '#c8ccd0'; g.fillRect(x + 8, 100, 10, 20); g.fillStyle = '#5a6272'; g.fillRect(x + 26, 126, 8, 16); } break;
  }
  return cv;
}
export const ARENA_LIGHT = { warm: { sun: 1.0, amb: 0.55 } };
