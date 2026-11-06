// What each operating field is: its shape (a pure function, used to place everything on the surface),
// and how it is painted. No engine here.
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Value noise, for the painters. Deterministic and local.
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * a; a *= 0.5; f *= 2; }
  return s / (1 - Math.pow(0.5, oct));
}

const ellipse = (x, z, cx, cz, rx, rz) => 1 - Math.hypot((x - cx) / rx, (z - cz) / rz);

export const ARENAS = {
  forearm: {
    ramp: [0x7a3f2a, 0x9c5a3a, 0xbf7d55, 0xd89f73, 0xeac198], cavity: 0x12343a, kind: 'skin',
    mask: (x, z) => smooth(3.05, 2.5, Math.abs(z + Math.sin(x * 0.22) * 0.15)),
    height: (x, z) => 0.55 * Math.max(0, Math.cos(z / 2.9)) ** 0.8,
    shade: (x, z) => 0.1 + 0.8 * Math.max(0, Math.cos((z + 0.5) / 2.4)) ** 1.2 + Math.sin(x * 0.5) * 0.06,
    hair: 0x4a2a1a, drape: true, lampTint: 0xfff0e0,
  },
  leg: {
    ramp: [0x6e3a2c, 0x8f5639, 0xb07a57, 0xcd9b75, 0xdfbc99], cavity: 0x12343a, kind: 'skin',
    mask: (x, z) => smooth(3.2, 2.7, Math.abs(z)),
    height: (x, z) => 0.5 * Math.max(0, Math.cos(z / 3.1)),
    shade: (x, z) => 0.1 + 0.8 * Math.max(0, Math.cos((z + 0.4) / 2.6)),
    hair: 0x3b2418, drape: true,
  },
  hull: {
    ramp: [0x4c2626, 0x76423a, 0x9b6650, 0xbd8f6f, 0xd4b292], cavity: 0x10282f, kind: 'skin',
    mask: (x, z) => smooth(3.2, 2.7, Math.abs(z)),
    height: (x, z) => 0.4 * Math.max(0, Math.cos(z / 3.1)),
    shade: (x, z) => 0.1 + 0.78 * Math.max(0, Math.cos((z + 0.4) / 2.6)),
    soot: true, drape: true,
  },
  chestwound: {
    ramp: [0x5b2e30, 0x87503f, 0xa97355, 0xc99872, 0xdcb892], cavity: 0x10282f, kind: 'skin',
    mask: (x, z) => smooth(3.4, 2.8, Math.abs(z)),
    height: (x, z) => 0.6 * Math.max(0, Math.cos(z / 3.3)),
    shade: (x, z) => 0.12 + 0.78 * Math.max(0, Math.cos((z + 0.4) / 2.7)),
    bruise: true, drape: true,
  },
  stomach: {
    ramp: [0x7c2c3a, 0xa8434c, 0xcc6661, 0xe58c7e, 0xf3b3a0], cavity: 0x1c0a18, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, -0.2, 6.8, 3.6)),
    height: (x, z) => 0.9 * Math.max(0, ellipse(x, z, 0, -0.2, 7.4, 4.2)) ** 0.7,
    rugae: true, fat: true, vessels: 0.9, sheen: 260,
  },
  bone: {
    ramp: [0x3a1220, 0x571c29, 0x7a2b34, 0x9c4140, 0xb95d50], cavity: 0x1c0a18, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, -0.1, 7, 3.7)),
    height: (x, z) => 0.5 - 0.35 * smooth(1.6, 0.2, Math.abs(z)) + 0.4 * smooth(1.2, 3, Math.abs(z)),
    boneShaft: true, vessels: 0.5, sheen: 120,
  },
  liver: {
    ramp: [0x2c0c1a, 0x47121f, 0x691b29, 0x8a2a33, 0xa84240], cavity: 0x160812, kind: 'organ',
    mask: (x, z) => smooth(0, 0.28, Math.max(ellipse(x, z, -2.2, -0.4, 4.4, 3.1), ellipse(x, z, 2.5, 0.1, 3.8, 2.8))),
    height: (x, z) => 1.15 * Math.max(0, Math.max(ellipse(x, z, -2.2, -0.4, 4.8, 3.5), ellipse(x, z, 2.5, 0.1, 4.2, 3.2))) ** 0.75,
    vessels: 0.7, sheen: 300, fat: true, cleft: true,
  },
  kidneybed: {
    ramp: [0x8d5a2a, 0xb07d36, 0xcf9f48, 0xe6c264, 0xf2da8c], cavity: 0x1c0a18, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, 0, 7, 3.8)),
    height: (x, z) => 0.5 * Math.max(0, ellipse(x, z, 0, 0, 7.6, 4.4)) - 0.25 * smooth(2.4, 0.4, Math.hypot((x) / 1.4, (z - 0.7) / 1)),
    fatBed: true, vesselsPair: true, vessels: 0.5, sheen: 200,
  },
  lung: {
    ramp: [0x5e4552, 0x7f6170, 0xa0808c, 0xbf9fa6, 0xd9bfc1], cavity: 0x18101c, kind: 'organ',
    mask: (x, z) => smooth(0, 0.28, Math.max(ellipse(x, z, -2.6, -0.3, 4.3, 3.5), ellipse(x, z, 2.6, -0.3, 4.3, 3.5))),
    height: (x, z) => 1.05 * Math.max(0, Math.max(ellipse(x, z, -2.6, -0.3, 4.8, 3.9), ellipse(x, z, 2.6, -0.3, 4.8, 3.9))) ** 0.7,
    alveoli: true, vessels: 0.5, sheen: 150, breathes: 0.14,
  },
  heart: {
    ramp: [0x3c0d24, 0x5e1430, 0x8a1f38, 0xb5343f, 0xd65c4f], cavity: 0x1c0a18, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, -0.1, 5.8, 3.6)),
    height: (x, z) => 2.0 * Math.max(0, ellipse(x, z, 0, -0.1, 6.4, 4)) ** 0.62,
    vessels: 1.2, fat: true, sheen: 340, beats: 0.18,
  },
  chest: {
    ramp: [0x4a1a26, 0x6e2a33, 0x92433f, 0xb4624f, 0xcf8768], cavity: 0x160a14, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, -0.2, 7.3, 3.9)),
    height: (x, z) => 0.7 * Math.max(0, ellipse(x, z, 0, -0.2, 7.9, 4.3)) ** 0.7 + 0.9 * Math.max(0, ellipse(x, z, 0.4, -0.3, 2.9, 2.3)) ** 0.8,
    ribs: true, heartPatch: true, lungPatch: true, vessels: 0.6, sheen: 220, beats: 0.08, breathes: 0.06,
  },
  spine: {
    ramp: [0x6a6878, 0x8c8a96, 0xaeabab, 0xcfc9bd, 0xe8e2d0], cavity: 0x161420, kind: 'organ',
    mask: (x, z) => smooth(0, 0.3, ellipse(x, z, 0, 0, 7.4, 3.6)),
    height: (x, z) => 0.5 + 0.55 * smooth(1.4, 0, Math.abs(z - 0.2)) * (0.8 + 0.2 * Math.cos(x * 4)),
    spineRow: true, sheen: 90, vessels: 0.2, breathes: 0.04,
  },
};

/** The surface height at a field point. Pure. */
export const heightAt = (arena, x, z) => (ARENAS[arena] ?? ARENAS.forearm).height(x, z);
