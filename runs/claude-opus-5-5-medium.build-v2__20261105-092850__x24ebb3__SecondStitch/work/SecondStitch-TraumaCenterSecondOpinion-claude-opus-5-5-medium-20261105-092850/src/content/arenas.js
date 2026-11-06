// Each arena: its ramp, shape and height. Pure: the sim's mouse aim and the view both read heightAt.
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dome = (x, z, cx, cz, rx, rz, h) => h * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
const blob = (x, z, cx, cz, rx, rz) => 1 - Math.hypot((x - cx) / rx, (z - cz) / rz);

export const ARENAS = {
  forearm: { ramp: [0x7a4a33, 0x9c6344, 0xbd7f58, 0xd69a70, 0xe9b98e], cavity: 0x1b4a54, drape: 'teal', hair: true,
    shape: (x, z) => sm(0, 0.8, 1 - Math.abs(z + 0.25) / (3.5 - Math.abs(x) * 0.04)), height: (x, z) => 0.45 * Math.max(0, 1 - ((z + 0.25) / 3.6) ** 2) },
  stomach: { ramp: [0x8a3c4a, 0xb45a5e, 0xd47b73, 0xe89d8c, 0xf5c0ab], cavity: 0x2a1020, drape: 'teal', rugae: true,
    shape: (x, z) => sm(0, 0.35, blob(x, z, 0, -0.3, 7.2, 3.9)), height: (x, z) => dome(x, z, 0, -0.4, 5.5, 3, 0.7) },
  tables: { ramp: [0x74463a, 0x976351, 0xb98267, 0xd09f80, 0xe6bd9b], cavity: 0x1b4a54, drape: 'teal',
    shape: (x, z) => sm(0, 0.5, 1 - Math.max(Math.abs(x) / 6.6, Math.abs(z + 0.3) / 3.9)), height: (x, z) => dome(x, z, 0, -0.3, 6, 3.6, 0.35), tints: [[0x74463a, 0x976351, 0xb98267, 0xd09f80, 0xe6bd9b], [0x5d2f30, 0x82423d, 0xa75d4a, 0xc67f60, 0xdd9d78], [0x5a3b40, 0x7d5457, 0xa17272, 0xc49590, 0xddb6aa]] },
  bone: { ramp: [0x4a1420, 0x6a1f2a, 0x8a2f36, 0xa64648, 0xbd6058], cavity: 0x1a0a14, drape: 'teal', bone: true,
    shape: (x, z) => sm(0, 0.45, 1 - Math.max(Math.abs(x) / 7.2, Math.abs(z + 0.2) / 3.9)), height: (x, z) => dome(x, z, 0, -0.3, 6, 1.8, 0.35) },
  liver: { ramp: [0x3a0d18, 0x591422, 0x77202c, 0x933139, 0xad4b48], cavity: 0x180814, drape: 'plum', sheen: 0xe08a80,
    shape: (x, z) => sm(0, 0.3, Math.max(blob(x, z, -2.6, -0.5, 4.7, 3.7), blob(x, z, 3, -0.2, 3.9, 3.1))), height: (x, z) => dome(x, z, -2.6, -0.5, 4, 2.8, 0.9) + dome(x, z, 3, -0.2, 3.2, 2.4, 0.7) },
  kidney: { ramp: [0x9c7030, 0xbd8f3e, 0xd6ac52, 0xe8c56a, 0xf3db8d], cavity: 0x2a1408, drape: 'teal', fat: true,
    shape: (x, z) => sm(0, 0.4, blob(x, z, 0, -0.5, 7.2, 4.2)), height: (x, z) => dome(x, z, 0, -0.6, 5, 3, 0.45) },
  lung: { ramp: [0x6a4a58, 0x8a6470, 0xa8818a, 0xc4a0a4, 0xdcc0c0], cavity: 0x1a1020, drape: 'teal', alveoli: true,
    shape: (x, z) => sm(0, 0.35, Math.max(blob(x, z, -2.8, -0.4, 4.6, 4.1), blob(x, z, 2.8, -0.4, 4.6, 4.1))), height: (x, z) => dome(x, z, -2.8, -0.4, 4, 3, 0.8) + dome(x, z, 2.8, -0.4, 4, 3, 0.8), breathes: 0.2 },
  heart: { ramp: [0x3c0d24, 0x5e1430, 0x8a1f38, 0xb5343f, 0xd65c4f], cavity: 0x1c0a18, drape: 'plum', vessels: true, fat2: true,
    shape: (x, z) => sm(0, 0.3, blob(x, z, 0, -0.5, 6.6, 3.9) - 0.2 * Math.max(0, z - 1.2) ** 2 / 2), height: (x, z) => dome(x, z, 0, -0.7, 4.8, 2.8, 2), beats: true },
  chest: { ramp: [0x54303e, 0x784452, 0x9a5f68, 0xb97d7f, 0xd39d98], cavity: 0x180a14, drape: 'plum', ribs: true, vessels: true,
    shape: (x, z) => sm(0, 0.3, blob(x, z, 0, -0.3, 7.4, 4.2)), height: (x, z) => dome(x, z, 2.2, -0.6, 3.2, 2.4, 0.9) + dome(x, z, -2.8, -0.4, 3.2, 2.8, 0.5), breathes: 0.12 },
  spine: { ramp: [0x8a8690, 0xa8a3a8, 0xc4bfb8, 0xddd6c4, 0xeee8d6], cavity: 0x20242e, drape: 'navy', spine: true,
    shape: (x, z) => sm(0, 0.4, 1 - Math.max(Math.abs(x) / 5.4, Math.abs(z + 0.2) / 4.1)), height: (x, z) => 0.4 * Math.max(0, 1 - (x / 2.2) ** 2) },
};
/** The surface height at a point, as drawn. `beat` and `breath` are 0..1 phases. */
export function heightAt(arena, x, z, beat = 0, breath = 0) {
  const a = ARENAS[arena] ?? ARENAS.forearm;
  let h = a.height(x, z);
  if (a.beats) h *= 1 + 0.12 * beat;
  if (a.breathes) h += a.breathes * breath * Math.max(0, a.shape(x, z));
  return h;
}
