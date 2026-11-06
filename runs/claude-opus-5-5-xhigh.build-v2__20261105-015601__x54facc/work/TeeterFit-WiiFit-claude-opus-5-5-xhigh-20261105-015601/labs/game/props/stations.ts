/**
 * @file The retreat's standing props (PLAN.md section 10): mats, Tare's Platform, the Noticeboard, plaques, the Pavilion,
 * the Annex with its mirror wall, huts, the ferry and pier, benches, loungers, parasols, palms, rocks, the lighthouse,
 * the jetty, the sea and the Centre Stone. Everything is geometry and materials by id.
 *
 * Game code, sim-side data.
 *
 * @example
 * // spawnProp(w, { prop: 'prop:pavilion', position: [-52, 8, 18] });
 */
import { defineProp } from '../../../engine/sim-api';
import { box, cyl, rbox, ring } from './kit';

/** Defines a prop with no body. */
const free = (id: string, description: string, parts: object[]) => defineProp(id, { description, parts } as never);
/** Defines a prop with a fixed box body. */
const solid = (id: string, description: string, parts: object[], size: readonly [number, number, number]) =>
  defineProp(id, { description, parts, body: { type: 'fixed', shape: 'box', size: [...size] } } as never);

free('prop:platform', "Tare's Platform: a low round plinth the Morning Check stands on.", [
  cyl('base', 1.5, 1.4, 0.16, 'material:clinical'),
  cyl('top', 1.26, 1.26, 0.06, 'material:mint', [0, 0.16, 0]),
  ring('rim', 1.26, 1.4, 0.03, 'material:slate', [0, 0.17, 0]),
]);

solid('prop:noticeboard', 'The Noticeboard: a white board on two posts, under a small mint roof.', [
  box('postL', 0.14, 2.3, 0.14, 'material:clinical', [-1.5, 0, 0]),
  box('postR', 0.14, 2.3, 0.14, 'material:clinical', [1.5, 0, 0]),
  box('board', 3.2, 1.5, 0.08, 'material:white', [0, 0.75, 0]),
  box('roof', 3.7, 0.1, 0.7, 'material:mint', [0, 2.3, 0]),
  box('notice1', 0.9, 0.6, 0.02, 'material:skyPale', [-0.9, 1.3, 0.05]),
  box('notice2', 0.7, 0.8, 0.02, 'material:coral', [0.1, 1.15, 0.05]),
  box('notice3', 0.9, 0.5, 0.02, 'material:mint', [1, 1.5, 0.05]),
], [3.3, 2.4, 0.4]); // prettier-ignore

free('prop:plaque', 'A "Did you know?" plaque on a short stake, always slightly further down than it was.', [
  box('stake', 0.06, 0.8, 0.06, 'material:sandstone'),
  box('face', 0.6, 0.42, 0.04, 'material:brass', [0, 0.7, 0], [-0.35, 0, 0]),
]);

/** The Annex's pillars. */
const annexPillars = [-13, -6.5, 0, 6.5, 13].map((x, i) =>
  cyl(`pillar${i}`, 0.2, 0.18, 4.2, 'material:clinical', [x, 0, 8]),
);

free('prop:annex', 'The Annex: Reps Hall and Step Class under one long open roof, with a mirror wall.', [
  box('floor', 30, 0.1, 18, 'material:floorWhite'),
  ...annexPillars,
  box('roof', 31, 0.3, 18.6, 'material:mint', [0, 4.2, 0]),
  box('fascia', 31, 0.5, 0.2, 'material:clinical', [0, 3.9, 9.3]),
]);

solid(
  'prop:annexWall',
  "The Annex's back wall, and its mirror: walkers stop at it.",
  [box('wall', 30, 4.2, 0.4, 'material:clinical'), box('mirror', 28, 3.2, 0.06, 'material:mirror', [0, 0.5, 0.24])],
  [30, 4.2, 0.4],
);

solid('prop:hut', 'A guest hut: white walls, a mint roof, a very small door.', [
  rbox('walls', 4.4, 2.5, 3.8, 0.1, 'material:clinical'),
  cyl('roof', 3.7, 0.5, 1.5, 'material:mint', [0, 2.5, 0], [0, Math.PI / 4, 0], '#ffffff', false),
  box('door', 0.9, 1.9, 0.08, 'material:coral', [0, 0, 1.92]),
  box('window', 0.8, 0.8, 0.06, 'material:skyPale', [1.4, 1.1, 1.92]),
], [4.4, 3, 3.8]); // prettier-ignore

free('prop:ferry', 'The ferry that does not return: a white hull, a blue line, one funnel.', [
  rbox('hull', 5, 2, 15, 0.8, 'material:ferry'),
  box('line', 5.04, 0.3, 15.04, 'material:ferryTrim', [0, 1.2, 0]),
  rbox('cabin', 3.6, 1.8, 6, 0.3, 'material:ferry', [0, 2, -1]),
  box('windows', 3.66, 0.5, 5, 'material:skyPale', [0, 2.8, -1]),
  cyl('funnel', 0.6, 0.5, 1.8, 'material:coral', [0, 3.8, -2]),
]);

/** The pier's legs. */
const pierLegs = [-16, -8, 0, 8, 16].flatMap((z, i) => [
  cyl(`legW${i}`, 0.16, 0.16, 4, 'material:palmTrunk', [-1.6, -3.6, z]),
  cyl(`legE${i}`, 0.16, 0.16, 4, 'material:palmTrunk', [1.6, -3.6, z]),
]);

solid(
  'prop:pier',
  'The Ferry Pier: bleached planks out over the south shore.',
  [box('deck', 4, 0.2, 36, 'material:deck'), ...pierLegs],
  [4, 0.2, 36],
);

solid('prop:retreatBench', 'A bench with a view, slightly too tidy.', [
  box('seat', 1.8, 0.08, 0.5, 'material:clinical', [0, 0.45, 0]),
  box('back', 1.8, 0.5, 0.06, 'material:clinical', [0, 0.6, -0.24]),
  box('legL', 0.08, 0.45, 0.46, 'material:slate', [-0.8, 0, 0]),
  box('legR', 0.08, 0.45, 0.46, 'material:slate', [0.8, 0, 0]),
], [1.8, 1, 0.5]); // prettier-ignore

free('prop:lounger', 'A sun lounger. It slides when the island does.', [
  box('bed', 0.7, 0.08, 1.7, 'material:clinical', [0, 0.28, 0]),
  box('rest', 0.7, 0.08, 0.6, 'material:coral', [0, 0.4, -0.9], [0.5, 0, 0]),
  box('frame', 0.6, 0.28, 1.4, 'material:slate', [0, 0, 0]),
]);

free('prop:parasol', 'A parasol: coral and white, an inch off vertical.', [
  cyl('pole', 0.04, 0.04, 2.4, 'material:clinical'),
  cyl('shade', 1.3, 0.04, 0.5, 'material:coral', [0, 2.1, 0], [0, 0, 0], '#ffffff', false),
]);

free('prop:palm', 'A palm: a limb trunk and flattened boxes for leaves.', [
  cyl('trunk', 0.22, 0.13, 4.4, 'material:palmTrunk'),
  ...[0, 1, 2, 3, 4, 5].map((i) => {
    const yaw = (i * Math.PI) / 3;
    return rbox(
      `leaf${i}`,
      0.5,
      0.06,
      2.6,
      0.02,
      'material:palmLeaf',
      [Math.sin(yaw) * 1.05, 4.3 - (i % 2) * 0.1, Math.cos(yaw) * 1.05],
      [0.3 * Math.cos(yaw), yaw, -0.3 * Math.sin(yaw)],
    );
  }),
]);

solid('prop:rock', 'A rock.', [
  rbox('rock', 2.4, 1.5, 2, 0.6, 'material:rock'),
  rbox('chip', 1.2, 0.9, 1, 0.3, 'material:rockDark', [0.7, 0, 0.5]),
], [2.4, 1.5, 2]); // prettier-ignore

defineProp('prop:lighthouse', {
  description: 'The Lighthouse: white and coral rings, a lamp that never quite points straight.',
  parts: [
    cyl('tower', 2.4, 1.4, 11, 'material:clinical'),
    cyl('band1', 2.2, 2.0, 1.4, 'material:coral', [0, 3.4, 0]),
    cyl('band2', 1.8, 1.6, 1.4, 'material:coral', [0, 7.4, 0]),
    cyl('gallery', 2, 2, 0.3, 'material:slate', [0, 11, 0]),
    cyl('lamp', 1, 1, 1.6, 'material:wet', [0, 11.3, 0]),
    cyl('cap', 1.3, 0.2, 1, 'material:coral', [0, 12.9, 0]),
  ],
  body: { type: 'fixed', shape: 'cylinder', radius: 2.2, height: 12 },
} as never);

free('prop:jetty', 'The Still Pond jetty: a short deck, three posts and a mat.', [
  box('deck', 2.2, 0.14, 7, 'material:deck', [0, 0.32, 0]),
  cyl('postW', 0.08, 0.08, 1, 'material:palmTrunk', [-1, -0.5, 3]),
  cyl('postE', 0.08, 0.08, 1, 'material:palmTrunk', [1, -0.5, 3]),
  cyl('postS', 0.08, 0.08, 1, 'material:palmTrunk', [0, -0.5, -3]),
  rbox('mat', 1.1, 0.04, 1.4, 0.02, 'material:mat.plain', [0, 0.46, 0]),
]);

free('prop:pondWater', 'The pond: a disc of still water in the hollow.', [
  cyl('water', 13, 13, 0.1, 'material:seawater', [0, 0, 0], [0, 0, 0], '#cfe8e0'),
]);

defineProp('prop:centreStone', {
  description: 'The Centre Stone: a plain stone with a brass plate reading "Do not".',
  parts: [
    rbox('stone', 2.2, 0.7, 2, 0.28, 'material:rock'),
    rbox('plate', 0.9, 0.04, 0.5, 0.02, 'material:brass', [0, 0.7, 0.2]),
  ],
} as never);

for (let i = 0; i < 6; i++) {
  free(`prop:pebble${i}`, 'A cairn pebble: a squashed rounded box.', [
    rbox('stone', 0.56 - i * 0.03, 0.2, 0.5 - i * 0.025, 0.09, `material:stone${i}`),
  ]);
}

free('prop:hiddenPebble', 'A hidden pebble: small, smooth, and pleased with itself.', [
  rbox('stone', 0.34, 0.18, 0.3, 0.08, 'material:marbleRed'),
]);

free('prop:drink', 'A drink on a little white table. If it slides, that is a feature of the drink.', [
  cyl('leg', 0.05, 0.05, 0.75, 'material:slate'),
  cyl('top', 0.42, 0.42, 0.04, 'material:clinical', [0, 0.75, 0]),
]);
free('prop:glass', 'A tall glass, on the move.', [
  cyl('glass', 0.05, 0.06, 0.2, 'material:glassDrink'),
  cyl('straw', 0.008, 0.008, 0.26, 'material:coral', [0.02, 0.02, 0], [0, 0, -0.2]),
]);

free('prop:sign', 'A sign on the path from the pier. It says "Please keep to the centre."', [
  box('post', 0.1, 1.4, 0.1, 'material:clinical'),
  box('face', 1.3, 0.6, 0.06, 'material:mint', [0, 1.2, 0]),
]);
