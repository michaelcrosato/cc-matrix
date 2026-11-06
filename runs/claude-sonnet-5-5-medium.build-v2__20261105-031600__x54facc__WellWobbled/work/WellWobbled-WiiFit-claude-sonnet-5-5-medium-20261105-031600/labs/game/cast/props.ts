/**
 * @file The retreat's props as data (mats, platform, noticeboard, pavilion, cairn pebbles, huts, lighthouse, buoys,
 * trays, marbles, hoops, carts and more), each a few parts of the engine's geometry in the retreat's materials. Moving
 * ones are kinematic bodies the scenes drive. Sim-side: imports only engine/sim-api.ts.
 * @example
 * PROP_IDS.length; // the number of retreat props
 */
import { defineProp } from '../../../engine/sim-api';

type Part = { name: string; geometry?: string; params?: Record<string, number | boolean>; material?: string; tint?: string; position?: [number, number, number]; rotation?: [number, number, number] }; // prettier-ignore
type Body = {
  type: 'fixed' | 'dynamic' | 'kinematic';
  shape?: 'box' | 'cylinder' | 'ball';
  size?: [number, number, number];
  radius?: number;
  height?: number;
};
export const PROP_IDS: string[] = [];
const prop = (name: string, description: string, parts: Part[], body?: Body) => {
  PROP_IDS.push(`prop:${name}`);
  return defineProp(`prop:${name}`, { description, parts: parts.map((p) => ({ geometry: 'geometry:box', material: 'material:rwhite', ...p })), ...(body ? { body } : {}) } as never); // prettier-ignore
};
const box = (name: string, w: number, h: number, d: number, material: string, position: [number, number, number] = [0, 0, 0], tint = '#ffffff'): Part => ({ name, geometry: 'geometry:roundedBox', params: { width: w, height: h, depth: d, radius: Math.min(0.06, w / 3, h / 3, d / 3) }, material, position, tint }); // prettier-ignore
const cyl = (name: string, r: number, h: number, material: string, position: [number, number, number] = [0, 0, 0], tint = '#ffffff', top = r): Part => ({ name, geometry: 'geometry:frustum', params: { radiusBottom: r, radiusTop: top, height: h, radialSegments: 16, smooth: true }, material, position, tint }); // prettier-ignore

prop('mat', 'A yoga mat: a thin mint rounded slab with a pale border.', [
  box('mat', 1.1, 0.04, 2, 'material:rmint'),
  box('edge', 1.2, 0.02, 2.1, 'material:rwhite', [0, -0.005, 0]),
]);
prop('platform', "Tare's Platform: a round white plinth with a brass ring.", [
  cyl('base', 1.4, 0.2, 'material:rwhite'),
  cyl('ring', 1.2, 0.22, 'material:rbrass', [0, 0, 0], '#ffffff', 1.1),
]);
prop(
  'noticeboard',
  'The Noticeboard: a slate board on two posts under a little roof.',
  [
    box('l', 0.12, 2.2, 0.12, 'material:rwood', [-1, 0, 0]),
    box('r', 0.12, 2.2, 0.12, 'material:rwood', [1, 0, 0]),
    box('board', 2.2, 1.3, 0.1, 'material:rslate', [0, 0.8, 0]),
    box('roof', 2.6, 0.12, 0.6, 'material:rcoral', [0, 2.2, 0]),
  ],
  { type: 'fixed', size: [2.2, 2.3, 0.3] },
);
prop('plaque', 'A did-you-know plaque on a short post.', [
  box('post', 0.1, 0.7, 0.1, 'material:rwood'),
  box('plate', 0.6, 0.35, 0.05, 'material:rbrass', [0, 0.65, 0]),
]);
prop('pebble', 'A cairn pebble: a squashed rounded box, tinted per stone.', [
  box('stone', 0.5, 0.2, 0.4, 'material:rwhite'),
]);
prop('pavilionPillar', 'A slim white pillar.', [cyl('p', 0.18, 3.2, 'material:rwhite')], {
  type: 'fixed',
  shape: 'cylinder',
  radius: 0.18,
  height: 3.2,
});
prop('pavilionRoof', 'A flat frustum roof in pale mint.', [
  {
    name: 'roof',
    geometry: 'geometry:frustum',
    params: { radiusBottom: 9, radiusTop: 7, height: 0.6, radialSegments: 4 },
    material: 'material:rmint',
    rotation: [0, 0.785, 0],
  },
]);
prop('curtain', 'A pale curtain panel.', [box('c', 2.2, 2.8, 0.04, 'material:rwhite', [0, 0, 0], '#e8f6ff')]);
prop('mirrorWall', 'The Annex mirror wall: a wide glassy panel in a frame.', [
  box('frame', 10, 3, 0.2, 'material:rwhite'),
  box('glass', 9.6, 2.7, 0.05, 'material:rglass', [0, 0.15, 0.12]),
]);
prop('annexRoof', 'A long open roof on four posts.', [
  box('roof', 16, 0.3, 8, 'material:rmint', [0, 3.2, 0]),
  box('p1', 0.2, 3.2, 0.2, 'material:rwhite', [-7.5, 0, -3.5]),
  box('p2', 0.2, 3.2, 0.2, 'material:rwhite', [7.5, 0, -3.5]),
  box('p3', 0.2, 3.2, 0.2, 'material:rwhite', [-7.5, 0, 3.5]),
  box('p4', 0.2, 3.2, 0.2, 'material:rwhite', [7.5, 0, 3.5]),
]);
prop(
  'hut',
  'A guest hut: white walls, coral roof, a door.',
  [
    box('wall', 4, 2.4, 3.4, 'material:rwhite'),
    {
      name: 'roof',
      geometry: 'geometry:frustum',
      params: { radiusBottom: 3.2, radiusTop: 0.4, height: 1.3, radialSegments: 4 },
      material: 'material:rcoral',
      position: [0, 2.4, 0],
      rotation: [0, 0.785, 0],
    },
    box('door', 0.9, 1.8, 0.1, 'material:rslate', [0, 0, 1.72]),
  ],
  { type: 'fixed', size: [4, 2.4, 3.4] },
);
prop('ferry', 'The ferry: a white hull with a little cabin.', [
  box('hull', 3, 1, 8, 'material:rwhite'),
  box('cab', 2, 1.4, 2.5, 'material:rmint', [0, 1, -0.5]),
  box('stripe', 3.05, 0.2, 8.05, 'material:rcoral', [0, 0.5, 0]),
]);
prop('pier', 'The pier: planks on posts.', [
  box('deck', 3, 0.25, 22, 'material:rwood', [0, 0.6, 0]),
  box('p', 0.25, 1, 0.25, 'material:rwood', [-1.3, 0, -9]),
  box('p2', 0.25, 1, 0.25, 'material:rwood', [1.3, 0, 9]),
]);
prop(
  'rbench',
  'A white bench facing the view.',
  [
    box('seat', 1.6, 0.1, 0.5, 'material:rwood', [0, 0.45, 0]),
    box('back', 1.6, 0.5, 0.08, 'material:rwood', [0, 0.55, -0.22]),
    box('l', 0.1, 0.45, 0.4, 'material:rwhite', [-0.7, 0, 0]),
    box('r', 0.1, 0.45, 0.4, 'material:rwhite', [0.7, 0, 0]),
  ],
  { type: 'fixed', size: [1.6, 0.9, 0.5] },
);
prop(
  'lounger',
  'A sun lounger that slides when the island tilts.',
  [
    box('bed', 0.7, 0.12, 1.8, 'material:rwhite', [0, 0.25, 0]),
    box('back', 0.7, 0.1, 0.7, 'material:rmint', [0, 0.45, -0.75], '#ffffff'),
  ],
  { type: 'dynamic', size: [0.7, 0.5, 1.8] },
);
prop('rcrate', 'A white crate for the finale.', [box('c', 0.7, 0.7, 0.7, 'material:rwhite')], {
  type: 'dynamic',
  size: [0.7, 0.7, 0.7],
});
prop(
  'drink',
  'A glass with a coral straw.',
  [cyl('g', 0.07, 0.18, 'material:rglass'), box('s', 0.02, 0.12, 0.02, 'material:rcoral', [0.02, 0.12, 0])],
  { type: 'dynamic', shape: 'cylinder', radius: 0.07, height: 0.18 },
);
prop('parasol', 'A parasol.', [
  cyl('pole', 0.04, 2.2, 'material:rwhite'),
  {
    name: 'top',
    geometry: 'geometry:frustum',
    params: { radiusBottom: 1.3, radiusTop: 0.1, height: 0.5, radialSegments: 8 },
    material: 'material:rcoral',
    position: [0, 2.1, 0],
  },
]);
prop(
  'palm',
  'A palm: a leaning trunk and flattened box fronds.',
  [
    cyl('trunk', 0.14, 3.6, 'material:rwood', [0, 0, 0], '#c8a878', 0.1),
    box('f1', 2.2, 0.06, 0.5, 'material:rlawn', [0, 3.5, 0], '#7cc46a'),
    box('f2', 0.5, 0.06, 2.2, 'material:rlawn', [0, 3.55, 0], '#8ad076'),
    box('f3', 1.6, 0.06, 0.5, 'material:rlawn', [0, 3.45, 0], '#6ab45c'),
  ].map((p, i) => (i > 1 ? { ...p, rotation: [0, 0.8 * i, 0.15] as [number, number, number] } : p)),
);
prop('rock', 'A smooth rock.', [box('r', 1.4, 0.9, 1.1, 'material:rsand', [0, 0, 0], '#d8d2c4')], {
  type: 'fixed',
  size: [1.4, 0.9, 1.1],
});
prop(
  'lighthouse',
  'The lighthouse: a banded white tower with a coral lamp room.',
  [
    cyl('t', 2.2, 12, 'material:rwhite', [0, 0, 0], '#ffffff', 1.4),
    cyl('band', 1.9, 1.2, 'material:rcoral', [0, 5, 0], '#ffffff', 1.8),
    box('lamp', 1.6, 1.2, 1.6, 'material:rglow', [0, 12, 0]),
  ],
  { type: 'fixed', shape: 'cylinder', radius: 2, height: 12 },
);
prop('buoy', 'A bobbing buoy.', [
  cyl('b', 0.35, 0.9, 'material:rcoral', [0, 0, 0], '#ffffff', 0.25),
  cyl('top', 0.1, 0.5, 'material:rwhite', [0, 0.9, 0]),
]);
prop('board', 'A paddleboard (kinematic).', [box('b', 0.8, 0.1, 2.4, 'material:rmint')], {
  type: 'kinematic',
  size: [0.8, 0.1, 2.4],
});
prop('post', 'A slackline post.', [
  cyl('p', 0.12, 2.2, 'material:rwood'),
  box('flag', 0.5, 0.3, 0.02, 'material:rcoral', [0.3, 1.9, 0]),
]);
prop('line', 'The slackline: a thin rope strip.', [box('rope', 0.04, 0.04, 40, 'material:rslate', [0, 2, 0])]);
prop(
  'tray',
  'The sand tray (kinematic): rim, sand, a stand.',
  [
    box('sand', 3, 0.12, 3, 'material:rsand', [0, 0.9, 0]),
    box('r1', 3.2, 0.2, 0.1, 'material:rwood', [0, 0.9, -1.55]),
    box('r2', 3.2, 0.2, 0.1, 'material:rwood', [0, 0.9, 1.55]),
    box('r3', 0.1, 0.2, 3, 'material:rwood', [-1.55, 0.9, 0]),
    box('r4', 0.1, 0.2, 3, 'material:rwood', [1.55, 0.9, 0]),
  ],
  { type: 'kinematic', size: [3.2, 0.3, 3.2] },
);
prop('trayStand', 'The tray stand.', [
  cyl('leg', 0.18, 0.9, 'material:rwood'),
  box('foot', 1.2, 0.08, 1.2, 'material:rwood'),
]);
prop('marble', 'A marble: a rounded box at maximum radius.', [
  {
    name: 'm',
    geometry: 'geometry:roundedBox',
    params: { width: 0.2, height: 0.2, depth: 0.2, radius: 0.1, segments: 3 },
    material: 'material:rglass',
    tint: '#9fd4ff',
  },
]);
prop(
  'hoop',
  'A hoop (kinematic ring).',
  [
    {
      name: 'h',
      geometry: 'geometry:ring',
      params: { innerRadius: 0.45, outerRadius: 0.55, height: 0.06 },
      material: 'material:rcoral',
    },
  ],
  { type: 'kinematic', size: [1.1, 0.1, 1.1] },
);
prop('stepPlatform', 'A step platform.', [box('s', 1.2, 0.25, 0.8, 'material:rcoral')]);
prop('floorTile', 'A floor tile that lights.', [box('t', 0.9, 0.03, 0.9, 'material:rglow')]);
prop(
  'cart',
  'A counterweight cart on rails.',
  [
    box('bed', 2, 0.4, 1.4, 'material:rwood', [0, 0.3, 0]),
    cyl('w1', 0.3, 0.1, 'material:rslate', [0.8, 0, 0.75]),
    cyl('w2', 0.3, 0.1, 'material:rslate', [-0.8, 0, 0.75]),
  ],
  { type: 'kinematic', size: [2, 0.7, 1.4] },
);
prop('rail', 'A rail.', [box('r', 0.2, 0.1, 14, 'material:rslate')]);
prop(
  'centreStone',
  'The Centre Stone with its brass plate.',
  [
    cyl('stone', 1.4, 0.6, 'material:rsand', [0, 0, 0], '#cfc7b4', 1.2),
    box('plate', 0.8, 0.03, 0.4, 'material:rbrass', [0, 0.6, 0]),
  ],
  { type: 'fixed', shape: 'cylinder', radius: 1.4, height: 0.6 },
);
prop('scoreCard', 'A judge Gull score card.', [
  box('c', 0.5, 0.65, 0.04, 'material:rwhite', [0, 0.2, 0]),
  box('n', 0.3, 0.3, 0.05, 'material:rcoral', [0, 0.45, 0.01]),
]);
prop('sea', 'The sea: one huge flat slab (kinematic).', [box('s', 900, 0.2, 900, 'material:rsea', [0, -0.2, 0])], {
  type: 'kinematic',
  size: [900, 0.2, 900],
});
prop('sign', 'A sign: "Please keep to the centre".', [
  box('post', 0.1, 1, 0.1, 'material:rwood'),
  box('b', 1.1, 0.5, 0.05, 'material:rwhite', [0, 0.9, 0]),
]);
