/** @file Hospital sets and surgical framing, as ordinary engine props; no engine assets are modified. */
import { defineProp, spawnProp, type PropPart, type World } from '../../../engine/sim-api';
const box = (
  name: string,
  size: [number, number, number],
  at: [number, number, number],
  mat = 'teal',
  rotation: [number, number, number] = [0, 0, 0],
): Partial<PropPart> => ({
  name,
  geometry: 'geometry:box',
  params: { width: size[0], height: size[1], depth: size[2] },
  material: `material:hl-${mat}`,
  position: [at[0] + size[0] / 2, at[1], at[2] + size[2] / 2],
  rotation,
});
const tube = (
  name: string,
  radius: number,
  height: number,
  at: [number, number, number],
  mat = 'steel',
): Partial<PropPart> => ({
  name,
  geometry: 'geometry:limb',
  params: { radiusStart: radius, radiusEnd: radius, length: height, radialSegments: 16, capSegments: 2 },
  material: `material:hl-${mat}`,
  position: at,
});
const room: Partial<PropPart>[] = [
  box('floor', [24, 0.025, 22], [-12, 0.002, -10], 'floor'),
  box('back-wall', [24, 6, 0.3], [-12, 0, 7], 'teal'),
  box('left-wall', [0.3, 6, 18], [-10, 0, -10], 'teal'),
  box('window', [7, 3.7, 0.12], [0.7, 1.5, 6.8], 'window'),
  box('window-frame', [7.4, 0.09, 0.18], [0.5, 3.3, 6.6], 'brass'),
];
for (let i = 0; i < 12; i++) room.push(box(`tile-${i}`, [0.018, 0.01, 19], [-10 + i * 2, -0.02, -10], 'steel'));
for (let i = 0; i < 4; i++) room.push(box(`window-bar-${i}`, [0.06, 3.9, 0.18], [1.3 + i * 1.9, 1.4, 6.6], 'brass'));
defineProp('prop:harbor-room', { description: 'The rain-lit Harbor Light operating room.', parts: room });
defineProp('prop:operating-table', {
  description: 'Padded operating table and steel pedestal.',
  parts: [
    box('pedestal', [1.1, 1.15, 1.5], [-0.55, 0, -0.75], 'steel'),
    box('bed', [3.1, 0.2, 6], [-1.55, 1.15, -3], 'steel'),
    box('mattress', [2.9, 0.2, 5.9], [-1.45, 1.35, -2.95], 'navy'),
    box('drape', [2.85, 0.08, 4.1], [-1.42, 1.58, -1.45], 'teal'),
    box('pillow', [2, 0.14, 1.2], [-1, 1.55, -2.8], 'cream'),
  ],
});
defineProp('prop:surgical-lamp', {
  description: 'Six petal surgical lamp, a sculptural halo of warm light.',
  parts: [
    tube('stand', 0.06, 4.5, [0, 0, 0]),
    box('arm', [3.2, 0.08, 0.08], [0, 4.4, 0], 'steel'),
    ...Array.from({ length: 6 }, (_, i) =>
      tube(
        `petal-${i}`,
        0.38,
        0.12,
        [3 + Math.cos((i * Math.PI) / 3) * 0.65, 4.35, Math.sin((i * Math.PI) / 3) * 0.65],
        'lit',
      ),
    ),
  ],
  light: { tag: 'surgical', color: '#fff0da', intensity: 45, distance: 20, position: [3, 3.5, 0] },
});
defineProp('prop:heart-monitor', {
  description: 'Brass-framed bedside heart monitor.',
  parts: [
    tube('stem', 0.05, 1.4, [0, 0, 0]),
    box('monitor', [1.5, 1.05, 0.25], [-0.75, 1.4, 0], 'navy'),
    box('display', [1.3, 0.8, 0.03], [-0.65, 1.53, -0.04], 'window'),
    box('trace', [1.16, 0.025, 0.015], [-0.58, 1.92, -0.06], 'lit'),
    tube('foot', 0.45, 0.06, [0, 0, 0]),
  ],
  light: { tag: 'monitor', color: '#6affd4', intensity: 4, distance: 5, position: [0, 1.9, 0] },
});
defineProp('prop:iv', {
  description: 'IV stand with suspended stabilizer.',
  parts: [
    tube('pole', 0.035, 2.6, [0, 0, 0]),
    box('hook', [0.8, 0.04, 0.04], [-0.4, 2.55, 0], 'steel'),
    box('bag', [0.4, 0.6, 0.13], [-0.34, 1.85, 0], 'cream'),
    tube('base', 0.4, 0.04, [0, 0, 0]),
  ],
});
defineProp('prop:tray', {
  description: 'Sterile instrument trolley.',
  parts: [
    box('top', [2.2, 0.08, 1.1], [-1.1, 1.05, -0.55], 'steel'),
    box('liner', [2, 0.03, 0.9], [-1, 1.14, -0.45], 'teal'),
    ...[-0.9, 0.9].map((x, i) => tube(`leg-${i}`, 0.035, 1.08, [x, 0, 0])),
    ...Array.from({ length: 6 }, (_, i) =>
      box(`instrument-${i}`, [0.06, 0.03, 0.65], [-0.7 + i * 0.26, 1.19, -0.32], 'steel'),
    ),
  ],
});
defineProp('prop:desk', {
  description: 'The Chief’s heavy desk or the gala lectern.',
  parts: [
    box('desk', [4, 0.2, 1.6], [-2, 1.2, -0.8], 'brass'),
    box('leg-l', [0.18, 1.2, 1.3], [-1.8, 0, -0.65], 'navy'),
    box('leg-r', [0.18, 1.2, 1.3], [1.6, 0, -0.65], 'navy'),
    box('files', [0.8, 0.08, 0.6], [0.5, 1.43, -0.3], 'cream'),
  ],
});
defineProp('prop:television', {
  description: 'Halcyon ward screen.',
  parts: [
    box('tv', [3.8, 2.1, 0.25], [-1.9, 2, 0], 'navy'),
    box('screen', [3.5, 1.8, 0.03], [-1.75, 2.15, -0.04], 'window'),
    box('halcyon', [1.8, 0.06, 0.02], [-0.9, 3.1, -0.08], 'lit'),
  ],
});
const frame: Partial<PropPart>[] = [box('table', [60, 0.025, 40], [-30, 0.002, -20], 'navy')];
for (const x of [-7.4, 7.4])
  for (const z of [-2, 2]) {
    frame.push(box(`clamp-${x}-${z}`, [0.3, 0.12, 0.8], [x, 0.18, z], 'steel', [0, 0, x < 0 ? -0.15 : 0.15]));
    frame.push(tube(`screw-${x}-${z}`, 0.15, 0.1, [x, 0.35, z + 0.2], 'brass'));
  }
defineProp('prop:field-frame', {
  description: 'The sterile drape’s machined clamps.',
  parts: frame,
  light: { tag: 'surgical', color: '#ffedd2', intensity: 12, distance: 28, position: [0, 8, -1] },
});
for (const id of ['sheet', 'wet', 'thread', 'glow', 'steel', 'glove'])
  defineProp(`prop:live-${id}`, {
    description: `Live surgical ${id} surface.`,
    parts: [
      {
        geometry: `geometry:live-${id}`,
        material:
          id === 'sheet'
            ? 'material:tissue'
            : id === 'wet'
              ? 'material:wet'
              : id === 'thread'
                ? 'material:thread'
                : id === 'glow'
                  ? 'material:field-glow'
                  : id === 'steel'
                    ? 'material:field-steel'
                    : 'material:field-glove',
      },
    ],
  });
export function stage<C extends object>(w: World<C>, set: string): void {
  if (set === 'field') {
    for (const id of ['sheet', 'wet', 'thread', 'glow', 'steel', 'glove'])
      spawnProp(w, { prop: `prop:live-${id}`, at: [0, 0, 0], yaw: 0 });
    spawnProp(w, { prop: 'prop:field-frame', at: [0, 0, 0], yaw: 0 });
    return;
  }
  spawnProp(w, { prop: 'prop:harbor-room', at: [0, 0, 0], yaw: 0 });
  spawnProp(w, { prop: 'prop:operating-table', at: [0, 0, 1], yaw: 0.25 });
  spawnProp(w, { prop: 'prop:surgical-lamp', at: [-4, 0, 1], yaw: 0 });
  for (const [prop, x, z] of [
    ['heart-monitor', 3, 1],
    ['iv', -2.7, 2],
    ['tray', 3, -2],
  ] as [string, number, number][])
    spawnProp(w, { prop: `prop:${prop}`, at: [x, 0, z], yaw: 0 });
  spawnProp(w, { prop: 'prop:television', at: [4, 0, 6.3], yaw: 0 });
  if (['chief', 'gala', 'ship'].includes(set)) spawnProp(w, { prop: 'prop:desk', at: [-3, 0, 2], yaw: 0 });
}
