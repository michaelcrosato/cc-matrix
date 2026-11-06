/** @file Procedural surfaces, grass geometry, daylight grading and smoke. No bitmap or audio assets are loaded. */
import {
  defineMaterial,
  defineTexture,
  defineGeometry,
  boxGeometry,
  defineLook,
  cellHash,
  defineEmitter,
} from '../../../engine';

defineMaterial('material:field', { color: '#ffffff', roughness: 0.92 });
defineMaterial('material:grass', { color: '#ffffff', roughness: 1, side: 'double' });
for (const [id, tone] of [
  ['savanna', [171, 146, 92]],
  ['laterite', [145, 79, 49]],
  ['ironstone', [91, 80, 63]],
  ['mud', [173, 147, 108]],
  ['tin', [131, 133, 114]],
] as const) {
  defineTexture(`texture:${id}`, {
    description: `Seeded ${id} grains and weathering.`,
    size: [128, 128],
    density: 10,
    look: 'smooth',
    create:
      ({ seed }) =>
      (x, y, t) => {
        const n = (cellHash(x, y, seed) - 0.5) * 27,
          line = id === 'tin' ? (x % 12 < 3 ? 20 : -6) : 0;
        t.color = [tone[0] + n + line, tone[1] + n + line, tone[2] + n + line];
        t.height = 0.6 + n / 150;
        t.roughness = 0.9;
      },
  });
  defineMaterial(`material:${id}`, { color: '#ffffff', roughness: 0.95, map: `texture:${id}` });
}
for (const [id, scale] of [
  ['field-grass', 1],
  ['field-stubble', 0.28],
] as const)
  defineGeometry(`geometry:${id}`, {
    description: 'A patch of individual crossed, tapered savanna blades.',
    budget: 1800,
    create: () => {
      const g = boxGeometry({ width: 1, height: 1, depth: 1 }),
        pos: number[] = [],
        norm: number[] = [],
        uv: number[] = [],
        indices: number[] = [];
      for (let i = 0; i < 110; i++) {
        const x = cellHash(i, 7, 104) * 15 - 7.5,
          z = cellHash(i, 13, 104) * 15 - 7.5,
          h = (0.45 + cellHash(i, 2, 104) * 1.1) * scale;
        for (let cross = 0; cross < 2; cross++) {
          const dx = cross ? 0 : 0.085,
            dz = cross ? 0.085 : 0,
            k = pos.length / 3;
          pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + 0.2, h, z + 0.13);
          norm.push(0.2, 0.9, 0.1, 0.2, 0.9, 0.1, 0.2, 0.9, 0.1);
          uv.push(0, 0, 1, 0, 0.5, 1);
          indices.push(k, k + 1, k + 2);
        }
      }
      const Attr = g.getAttribute('position').constructor as new (a: Float32Array, n: number) => never;
      g.setAttribute('position', new Attr(new Float32Array(pos), 3));
      g.setAttribute('normal', new Attr(new Float32Array(norm), 3));
      g.setAttribute('uv', new Attr(new Float32Array(uv), 2));
      g.setIndex(indices);
      g.clearGroups();
      return g;
    },
  });
defineLook('look:dry-season', {
  description: 'Bleached dry-season light, warm earth and cool shadows.',
  sky: 'sky:daylight',
  resolution: 'full',
  textures: 'smooth',
  filters: {
    grade: { scope: 'all', temperature: 0.18, saturation: 0.88, contrast: 1.06 },
    vignette: { scope: 'all', amount: 0.24 },
    aa: { scope: 'all' },
    grain: { scope: 'all', amount: 0.025 },
  },
});
defineLook('look:fever', {
  description: 'Blackwater fever: a slow optical bleed.',
  filters: { chroma: { scope: 'all', amount: 0.35 }, vignette: { scope: 'all', amount: 0.75 } },
});
for (let k = 0; k < 8; k++)
  defineEmitter(`emitter:smoke-${k}`, {
    description: 'Wind-carried smoke from a fuel cell.',
    gpu: true,
    rate: 4,
    life: [3, 6],
    size: [0.8, 2.5],
    color: ['#4f4b3d', '#817d6b'],
    velocity: [Math.sin((k * Math.PI) / 4) * 2, 2.4, Math.cos((k * Math.PI) / 4) * 2],
    spread: 1.4,
    gravity: 0,
  });

defineEmitter('emitter:field-rain', {
  description: 'A moving rain front over the basin.',
  gpu: true,
  rate: 150,
  area: [24, 10, 24],
  velocity: [1, -16, 0],
  spread: 0.4,
  gravity: -0.1,
  life: [0.8, 1.5],
  size: [0.008, 0.005],
  color: ['#bdc9c4', '#8faba7'],
  alpha: [0.4, 0.05],
  stretch: true,
  additive: false,
});
