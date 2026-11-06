/**
 * @file Every prop of Wee Tare, data only. Parts stand on the base, in metres, built from the engine's geometry kit with
 * materials by id. Props that move have no body: the sim writes their pose and nothing collides with them.
 */
import { defineProp } from '../../../engine/sim-api';

type Part = {
  g?: string;
  p: Record<string, number>;
  m?: string;
  at?: readonly [number, number, number];
  tint?: string;
  rot?: readonly number[];
};
const BOX = 'geometry:box';
const ROUND = 'geometry:roundedBox';
const LIMB = 'geometry:limb';
const FRUSTUM = 'geometry:frustum';
const PILLAR = 'geometry:pillar';
const RING = 'geometry:ring';

/** Short geometry numbers as the kit's parameters. */
function paramsOf(part: Part): Record<string, number | boolean> {
  const p = part.p;
  if (part.g === FRUSTUM)
    return { radiusBottom: p.bottom, radiusTop: p.top, height: p.height, radialSegments: 24, smooth: true };
  if (part.g === RING) return { innerRadius: p.radius - p.thickness, outerRadius: p.radius + p.thickness };
  return p;
}

/** Defines a prop from short parts. */
function prop(
  name: string,
  description: string,
  parts: readonly Part[],
  size?: readonly [number, number, number],
): void {
  defineProp(`prop:${name}`, {
    description,
    parts: parts.map((part, k) => ({
      name: `part${k}`,
      geometry: part.g ?? BOX,
      params: paramsOf(part),
      material: part.m ?? 'material:retreatWhite',
      ...(part.at ? { position: [...part.at] } : {}),
      ...(part.tint ? { tint: part.tint } : {}),
      ...(part.rot ? { rotation: [...part.rot] } : {}),
    })),
    ...(size ? { body: { type: 'fixed', shape: 'box', size: [...size] } } : {}),
  } as never);
}

const SEAT_COLOURS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
SEAT_COLOURS.forEach((tint, i) =>
  prop(`matSeat${i}`, 'A class mat in a seat’s colour.', [
    { g: ROUND, p: { width: 1.5, height: 0.05, depth: 2.3, radius: 0.02 }, m: 'material:retreatMat', tint },
  ]),
);

prop('platform', 'Tare’s Platform: a low round stage.', [
  { g: FRUSTUM, p: { bottom: 2.6, top: 2.4, height: 0.4 }, tint: '#f7fafc' },
  { g: RING, p: { radius: 2.2, thickness: 0.08 }, m: 'material:retreatMint', at: [0, 0.41, 0] },
]);
prop('matRing', 'The ring on a mat, matching the Balance Disc.', [
  { g: RING, p: { radius: 0.55, thickness: 0.03 }, m: 'material:retreatMint' },
]);
prop('beam', 'The lighthouse\u2019s beam, in the storm.', [
  { p: { width: 0.5, height: 0.5, depth: 90 }, at: [0, 0, 45], m: 'material:retreatLamp' },
]);
prop('platformRing', 'The bright ring of a Morning Check.', [
  { g: RING, p: { radius: 1.1, thickness: 0.05 }, m: 'material:retreatCoral' },
]);
prop('noticeboard', 'The Noticeboard.', [
  { p: { width: 3, height: 1.8, depth: 0.1 }, at: [0, 1, 0], tint: '#f7fafc' },
  { p: { width: 2.7, height: 1.5, depth: 0.12 }, at: [0, 1.15, 0], m: 'material:retreatMint' },
  { g: LIMB, p: { length: 1, radiusStart: 0.06, radiusEnd: 0.06 }, at: [-1.3, 0, 0] },
  { g: LIMB, p: { length: 1, radiusStart: 0.06, radiusEnd: 0.06 }, at: [1.3, 0, 0] },
]);
prop('plaque', 'A “Did you know?” plaque on a little post.', [
  { g: LIMB, p: { length: 0.8, radiusStart: 0.04, radiusEnd: 0.04 }, tint: '#a8b4bc' },
  { p: { width: 0.6, height: 0.36, depth: 0.05 }, at: [0, 0.8, 0], m: 'material:retreatBrass' },
]);
prop('hiddenPebble', 'A pebble somebody has placed with care.', [
  { g: ROUND, p: { width: 0.38, height: 0.2, depth: 0.3, radius: 0.09 }, m: 'material:retreatCoral' },
]);
['#d7dee2', '#b8c6cc', '#e8e1cf', '#9fb4a8'].forEach((tint, k) =>
  prop(`cairnPebble${k}`, 'A pebble of your cairn.', [
    { g: ROUND, p: { width: 0.34, height: 0.15, depth: 0.28, radius: 0.07 }, m: 'material:retreatStone', tint },
  ]),
);
prop('retreatBench', 'A clean white bench.', [
  { p: { width: 1.8, height: 0.08, depth: 0.5 }, at: [0, 0.45, 0] },
  { p: { width: 1.8, height: 0.5, depth: 0.08 }, at: [0, 0.6, -0.22] },
  { p: { width: 0.1, height: 0.45, depth: 0.45 }, at: [-0.8, 0, 0], tint: '#a8b4bc' },
  { p: { width: 0.1, height: 0.45, depth: 0.45 }, at: [0.8, 0, 0], tint: '#a8b4bc' },
]);
prop('pavilion', 'The Pose Pavilion: white floor, pale curtains, open sides.', [
  { p: { width: 22, height: 0.15, depth: 16 }, at: [0, 0, 1], tint: '#f7fafc' },
  ...[
    [-10, -6],
    [10, -6],
    [-10, 8],
    [10, 8],
    [0, -6],
    [0, 8],
  ].map(([x, z]) => ({ g: PILLAR, p: { width: 0.5, height: 5.2 }, at: [x, 0.15, z] as const })),
  { g: FRUSTUM, p: { bottom: 14, top: 2, height: 2.6 }, at: [0, 5.4, 1], tint: '#f7fafc' },
  { p: { width: 3, height: 4.6, depth: 0.1 }, at: [-6.5, 0.4, -6.2], m: 'material:retreatCurtain' },
  { p: { width: 3, height: 4.6, depth: 0.1 }, at: [6.5, 0.4, -6.2], m: 'material:retreatCurtain' },
]);
prop('roundFloor', 'The ground round a session’s pavilion.', [
  { p: { width: 120, height: 0.05, depth: 120 }, at: [0, -0.06, 0], m: 'material:retreatLawn' },
]);
prop('annex', 'The Annex: one long open roof over a mirror wall.', [
  { p: { width: 26, height: 0.15, depth: 18 }, at: [0, 0, 0], tint: '#f7fafc' },
  { p: { width: 26, height: 4.2, depth: 0.2 }, at: [0, 0.15, -9], m: 'material:retreatMirror' },
  { p: { width: 28, height: 0.3, depth: 20 }, at: [0, 4.6, 0], tint: '#f7fafc' },
  ...[
    [-12.5, 8.5],
    [12.5, 8.5],
    [-12.5, -8.5],
    [12.5, -8.5],
  ].map(([x, z]) => ({ g: PILLAR, p: { width: 0.4, height: 4.5 }, at: [x, 0.15, z] as const })),
]);
prop('stepPlatform', 'A low stepping platform.', [
  { g: ROUND, p: { width: 1.6, height: 0.16, depth: 1, radius: 0.05 }, m: 'material:retreatMint' },
]);
prop('floorTile', 'A floor tile that lights on the beat.', [
  { p: { width: 1.4, height: 0.03, depth: 1.4 }, m: 'material:retreatCoral' },
]);
prop('hut', 'A guest hut.', [
  { p: { width: 5, height: 2.6, depth: 4 } },
  { g: FRUSTUM, p: { bottom: 3.6, top: 0.4, height: 1.5 }, at: [0, 2.6, 0], m: 'material:retreatCoral' },
  { p: { width: 1, height: 1.9, depth: 0.1 }, at: [0, 0, 2.02], m: 'material:retreatMint' },
]);
prop('ferryPier', 'The pier.', [
  { p: { width: 4, height: 0.2, depth: 22 }, at: [0, 0.4, 2], m: 'material:retreatWood' },
  ...[-6, 2, 10].flatMap((z) =>
    [-1.8, 1.8].map((x) => ({
      g: PILLAR,
      p: { width: 0.3, height: 2.5 },
      at: [x, -2, z] as const,
      m: 'material:retreatWood',
    })),
  ),
]);
prop('lighthouse', 'The lighthouse.', [
  { g: FRUSTUM, p: { bottom: 2.6, top: 1.6, height: 11 } },
  { g: FRUSTUM, p: { bottom: 1.62, top: 1.5, height: 2 }, at: [0, 7, 0], m: 'material:retreatCoral' },
  { g: FRUSTUM, p: { bottom: 1.2, top: 1.1, height: 1.6 }, at: [0, 11, 0], m: 'material:retreatLamp' },
  { g: FRUSTUM, p: { bottom: 1.5, top: 0.2, height: 1 }, at: [0, 12.6, 0], m: 'material:retreatCoral' },
]);
prop('centreStone', 'A plain stone with a brass plate reading “Do not”.', [
  { g: FRUSTUM, p: { bottom: 1.5, top: 1.1, height: 0.4 }, m: 'material:retreatStone' },
  { p: { width: 0.6, height: 0.03, depth: 0.3 }, at: [0, 0.4, 0], m: 'material:retreatBrass' },
]);
prop('sandTerrace', 'A raked terrace of pale gravel.', [
  { p: { width: 22, height: 0.06, depth: 18 }, m: 'material:retreatSand' },
]);
prop('eastTerrace', 'The East Terrace: fully booked.', [
  { p: { width: 20, height: 0.12, depth: 16 }, tint: '#f7fafc' },
  { g: FRUSTUM, p: { bottom: 3, top: 0.1, height: 1 }, at: [-5, 2.6, -4], m: 'material:retreatCoral' },
  { g: LIMB, p: { length: 2.6, radiusStart: 0.05, radiusEnd: 0.05 }, at: [-5, 0, -4] },
]);
prop('cliffLip', 'The diving board at the cliff’s lip.', [
  { p: { width: 2.4, height: 0.1, depth: 3.5 }, at: [0, 0, -2], m: 'material:retreatWood' },
]);
prop('parasol', 'A parasol.', [
  { g: LIMB, p: { length: 2.5, radiusStart: 0.05, radiusEnd: 0.05 } },
  { g: FRUSTUM, p: { bottom: 2, top: 0.1, height: 0.8 }, at: [0, 2.3, 0], m: 'material:retreatCoral' },
]);
prop('lounger', 'A sun lounger.', [
  { g: ROUND, p: { width: 0.7, height: 0.1, depth: 1.9, radius: 0.04 }, at: [0, 0.3, 0], m: 'material:retreatMint' },
  { p: { width: 0.7, height: 0.3, depth: 0.1 }, at: [0, 0, 0.8] },
  { p: { width: 0.7, height: 0.3, depth: 0.1 }, at: [0, 0, -0.8] },
]);
prop('palm', 'A very tidy palm.', [
  { g: LIMB, p: { length: 5.4, radiusStart: 0.2, radiusEnd: 0.1 }, m: 'material:retreatWood' },
  ...[0, 1, 2, 3, 4].map((k) => ({
    g: ROUND,
    p: { width: 3.2, height: 0.08, depth: 0.7, radius: 0.03 },
    at: [Math.cos(k * 1.26) * 1.3, 5.3, Math.sin(k * 1.26) * 1.3] as const,
    m: 'material:retreatPalm',
    rot: [0, -k * 1.26, 0.24],
  })),
]);
prop('rock', 'A rock that seems to know.', [
  { g: ROUND, p: { width: 3.2, height: 1.6, depth: 2.4, radius: 0.5 }, m: 'material:retreatStone' },
]);
prop('jetty', 'The jetty at Still Pond.', [{ p: { width: 2, height: 0.12, depth: 7 }, m: 'material:retreatWood' }]);
prop(
  'jettyPosts',
  'The jetty’s posts.',
  [-0.9, 0.9].map((x) => ({
    g: PILLAR,
    p: { width: 0.2, height: 2 },
    at: [x, -0.3, 0] as const,
    m: 'material:retreatWood',
  })),
);
prop('pondWater', 'Still Pond’s still water.', [
  { g: FRUSTUM, p: { bottom: 12, top: 12, height: 0.02 }, m: 'material:retreatPond' },
]);
prop('sea', 'The sea: one huge flat sheet, drifting slowly.', [
  { p: { width: 9000, height: 0.02, depth: 9000 }, m: 'material:retreatSea' },
]);
prop('seaNear', 'The water near you, drifting.', [
  { p: { width: 192, height: 0.02, depth: 192 }, m: 'material:retreatSeaNear' },
]);
prop('drink', 'A drink. It is a feature of the drink.', [
  { g: FRUSTUM, p: { bottom: 0.07, top: 0.09, height: 0.2 }, m: 'material:retreatDrink' },
]);
prop('drinksTable', 'A drinks table.', [
  { p: { width: 2.2, height: 0.08, depth: 1.2 }, at: [0, 0.88, 0] },
  { g: LIMB, p: { length: 0.88, radiusStart: 0.06, radiusEnd: 0.06 } },
]);
prop('linePost', 'A post that holds the line.', [
  { g: PILLAR, p: { width: 0.5, height: 5.3 }, m: 'material:retreatWood' },
]);
prop('slackline', 'The Line: forty metres, very slack.', [
  { p: { width: 41, height: 0.05, depth: 0.08 }, m: 'material:retreatCoral' },
]);
prop('lineFlag', 'A flag on the line.', [
  { g: LIMB, p: { length: 1.2, radiusStart: 0.02, radiusEnd: 0.02 } },
  { p: { width: 0.5, height: 0.28, depth: 0.02 }, at: [0.25, 0.92, 0], m: 'material:retreatCoral' },
]);
prop('tareBoat', 'Tare’s little boat.', [
  { g: ROUND, p: { width: 2.4, height: 0.5, depth: 1.2, radius: 0.2 }, m: 'material:retreatMint' },
  { g: LIMB, p: { length: 1.6, radiusStart: 0.03, radiusEnd: 0.03 }, at: [0.6, 0.4, 0] },
  { p: { width: 0.5, height: 0.3, depth: 0.02 }, at: [0.86, 1.65, 0], m: 'material:retreatCoral' },
]);
prop('board', 'A paddleboard.', [
  { g: ROUND, p: { width: 0.85, height: 0.12, depth: 3.2, radius: 0.05 }, m: 'material:retreatCoral' },
]);
prop('buoy', 'A buoy gate.', [
  { g: FRUSTUM, p: { bottom: 0.5, top: 0.28, height: 1 }, m: 'material:retreatCoral' },
  { g: LIMB, p: { length: 1, radiusStart: 0.04, radiusEnd: 0.04 }, at: [0, 1, 0] },
]);
prop('turtle', 'A crossing turtle.', [
  { g: ROUND, p: { width: 1, height: 0.25, depth: 1.3, radius: 0.12 }, m: 'material:retreatPalm' },
  { g: ROUND, p: { width: 0.3, height: 0.2, depth: 0.3, radius: 0.1 }, at: [0, 0.05, 0.75], m: 'material:retreatLawn' },
]);
prop('tray', 'A raked sand tray.', [
  { p: { width: 3.2, height: 0.1, depth: 3.2 }, at: [0, -0.1, 0], m: 'material:retreatWood' },
  { p: { width: 3, height: 0.02, depth: 3 }, m: 'material:retreatSand' },
  { p: { width: 3.2, height: 0.12, depth: 0.1 }, at: [0, 0, -1.55], m: 'material:retreatWood' },
  { p: { width: 3.2, height: 0.12, depth: 0.1 }, at: [0, 0, 1.55], m: 'material:retreatWood' },
  { p: { width: 0.1, height: 0.12, depth: 3.2 }, at: [-1.55, 0, 0], m: 'material:retreatWood' },
  { p: { width: 0.1, height: 0.12, depth: 3.2 }, at: [1.55, 0, 0], m: 'material:retreatWood' },
]);
prop('trayStand', 'The tray’s stand.', [{ g: PILLAR, p: { width: 0.5, height: 0.7 } }]);
prop('trayHole', 'A hole in the sand.', [{ g: RING, p: { radius: 0.2, thickness: 0.05 }, m: 'material:retreatCoral' }]);
prop('trayRidge', 'A raked ridge.', [{ p: { width: 1.1, height: 0.08, depth: 0.08 }, m: 'material:retreatStone' }]);
prop('marble', 'A marble.', [
  { g: ROUND, p: { width: 0.22, height: 0.22, depth: 0.22, radius: 0.11 }, m: 'material:retreatMarble' },
]);
prop('hoop', 'A hoop.', [{ g: RING, p: { radius: 0.55, thickness: 0.04 }, m: 'material:retreatCoral' }]);
prop('scoreRaft', 'A gull judge’s raft.', [
  { g: ROUND, p: { width: 1.6, height: 0.2, depth: 1.2, radius: 0.08 }, m: 'material:retreatWood' },
  { p: { width: 1, height: 0.7, depth: 0.05 }, at: [0, 1, 0] },
  { g: LIMB, p: { length: 1, radiusStart: 0.03, radiusEnd: 0.03 }, at: [0, 0.2, -0.1] },
]);
prop('cart', 'A counterweight cart, full of your pebbles.', [
  { p: { width: 3, height: 0.8, depth: 1.6 }, at: [0, 0.3, 0], m: 'material:retreatWood' },
  { g: ROUND, p: { width: 2.6, height: 0.5, depth: 1.2, radius: 0.2 }, at: [0, 1, 0], m: 'material:retreatStone' },
]);
prop(
  'rails',
  'The rails.',
  [-0.7, 0.7, 1.5, 2.9].map((z) => ({
    p: { width: 30, height: 0.06, depth: 0.1 },
    at: [0, 0, z] as const,
    m: 'material:retreatWood',
  })),
);
prop('ferry', 'The ferry. It does not return.', [
  { p: { width: 5, height: 1.4, depth: 12 }, tint: '#f7fafc' },
  { p: { width: 3, height: 1.4, depth: 4 }, at: [0, 1.4, -2], m: 'material:retreatMint' },
]);
prop('nearMark', 'A soft ring round the thing you could use.', [
  { g: RING, p: { radius: 1.2, thickness: 0.06 }, m: 'material:retreatCoral' },
]);
