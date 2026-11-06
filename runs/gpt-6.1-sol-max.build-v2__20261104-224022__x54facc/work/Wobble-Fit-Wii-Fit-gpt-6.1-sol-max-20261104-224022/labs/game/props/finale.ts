/** @file Original retreat props, registered when their scene is built. */
import { box, cone, prop } from './kit';
export function makeCounterCart(): void {
  prop('counterCart', [
    box('tray', [0, 0.45, 0], [1.8, 0.35, 2.4], '#b4c7ad'),
    ...[-0.8, 0.8].flatMap((x) =>
      [-0.8, 0.8].map((z) => ({
        ...cone(`wheel${x}${z}`, [x, 0.22, z], 0.26, 0.26, 0.12, '#687b69', 12),
        rotation: [0, 0, Math.PI / 2],
      })),
    ),
    ...Array.from({ length: 6 }, (_, i) =>
      box(`stone${i}`, [((i % 2) - 0.5) * 0.55, 0.8 + Math.floor(i / 2) * 0.17, 0], [0.7, 0.23, 0.8], '#d5c7a5', 0.1),
    ),
  ]);
}
export function makeCounterRails(): void {
  prop(
    'counterRails',
    [-0.8, 0.8].map((x) => box(`rail${x}`, [x, 0, 0], [0.08, 0.08, 20], '#9cae99')),
  );
}
export function makeBeacon(): void {
  prop('beacon', [
    {
      name: 'beam',
      geometry: 'geometry:frustum',
      params: { radiusBottom: 0.06, radiusTop: 7, height: 100, radialSegments: 16 },
      material: 'material:retreatBeam',
      rotation: [Math.PI / 2, 0, 0],
      shadow: false,
    },
  ]);
}
