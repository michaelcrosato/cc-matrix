/**
 * @file Dresses the island: the sea, the pier and ferry, the Plaza (platform, noticeboard, cairn spot), the Pavilion,
 * the Annex, huts, lighthouse, benches, parasols, loungers, palms and rocks scattered by a seeded stream, twelve
 * plaques and twenty hidden pebbles. Sim-side.
 * @example
 * dressIsland(w); // in the island scene's setup
 */
import { STATIONS, SEA_Y, groundAt } from './data/world';
import { mark, stand } from './spawn';
import type { W } from './events/types';

/** Plaque sites (x, z): the plaques creep downhill across the days. */
export const PLAQUE_SITES: ReadonlyArray<readonly [number, number]> = [
  [6, 40],
  [-8, 30],
  [-44, 24],
  [-58, 8],
  [-64, -4],
  [44, 30],
  [60, 18],
  [58, 48],
  [34, -40],
  [20, -20],
  [10, 8],
  [76, -2],
];
/** Pebble sites (x, z): twenty hidden around the island. */
export const PEBBLE_SITES: ReadonlyArray<readonly [number, number]> = [
  [12, 60],
  [-20, 62],
  [-40, 50],
  [-80, 20],
  [-30, -30],
  [-10, -50],
  [22, -66],
  [50, -30],
  [80, -20],
  [88, 20],
  [70, 70],
  [40, 80],
  [-72, 52],
  [0, 76],
  [-26, 10],
  [26, 6],
  [14, -12],
  [-14, -10],
  [-60, -34],
  [64, 34],
];
const ring = (w: W, prop: string, cx: number, cz: number, r: number, n: number, y0: number, yawOff = 0): void => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.2832 + yawOff;
    stand(w, prop, cx + Math.sin(a) * r, cz + Math.cos(a) * r, a, y0);
  }
};
export function dressIsland(w: W): void {
  stand(w, 'prop:sea', 0, 0, 0, SEA_Y);
  const { pier, plaza, pavilion, annex, huts, lighthouse, stone, terrace } = STATIONS;
  stand(w, 'prop:pier', pier.at[0], pier.at[1] + 6, 0, 1.4);
  stand(w, 'prop:ferry', pier.at[0] + 6, pier.at[1] + 12, 0.3, SEA_Y - 0.4);
  stand(w, 'prop:platform', plaza.at[0], plaza.at[1] - 6, 0, plaza.y);
  stand(w, 'prop:noticeboard', plaza.at[0] + 9, plaza.at[1] - 4, Math.PI, plaza.y);
  stand(w, 'prop:sign', plaza.at[0] - 6, plaza.at[1] + 4, 0.2, plaza.y);
  stand(w, 'prop:centreStone', stone.at[0], stone.at[1], 0, stone.y);
  stand(w, 'prop:lighthouse', lighthouse.at[0], lighthouse.at[1], 0, lighthouse.y);
  // Pose Pavilion: four mats, pillars, roof, curtains
  const [px, pz] = pavilion.at;
  stand(w, 'prop:pavilionRoof', px, pz, 0, pavilion.y + 3.2);
  for (const [dx, dz] of [
    [-7, -7],
    [7, -7],
    [-7, 7],
    [7, 7],
  ])
    stand(w, 'prop:pavilionPillar', px + dx, pz + dz, 0, pavilion.y);
  for (let i = 0; i < 4; i++) stand(w, 'prop:mat', px - 4.5 + i * 3, pz, 0, pavilion.y);
  for (let i = 0; i < 3; i++) stand(w, 'prop:curtain', px - 4 + i * 4, pz - 7.2, 0, pavilion.y);
  // The Annex: long roof, mirror wall, step platforms
  const [ax, az] = annex.at;
  stand(w, 'prop:annexRoof', ax, az, 0, annex.y);
  stand(w, 'prop:mirrorWall', ax, az - 4.2, 0, annex.y);
  for (let i = 0; i < 3; i++) stand(w, 'prop:stepPlatform', ax - 3 + i * 3, az, 0, annex.y);
  for (let i = 0; i < 3; i++) stand(w, 'prop:hut', huts.at[0] + (i - 1) * 7, huts.at[1], Math.PI, huts.y);
  stand(w, 'prop:tray', terrace.at[0], terrace.at[1] - 2, 0, terrace.y + 0.8);
  // benches facing views, loungers, parasols
  stand(w, 'prop:rbench', 10, 40, Math.PI, plaza.y);
  stand(w, 'prop:rbench', 70, 12, Math.PI / 2, 5);
  stand(w, 'prop:rbench', -66, -2, -Math.PI / 2, 3.4);
  for (let i = 0; i < 4; i++) {
    stand(w, 'prop:lounger', 54 + i * 3, 80, 0.1);
    stand(w, 'prop:parasol', 54 + i * 3, 84, 0);
  }
  for (let i = 0; i < 3; i++) stand(w, 'prop:drink', plaza.at[0] + 2 + i * 0.6, plaza.at[1] + 5, 0, plaza.y + 0.5);
  // seeded scatter
  const rng = w.rng('dress');
  for (let i = 0, put = 0; i < 400 && put < 60; i++) {
    const x = rng.range(-95, 95),
      z = rng.range(-95, 100),
      y = groundAt(x, z);
    if (y < 3.2 || y > 11) continue;
    if (Object.values(STATIONS).some((s) => Math.hypot(s.at[0] - x, s.at[1] - z) < 14)) continue;
    stand(w, rng.chance(0.75) ? 'prop:palm' : 'prop:rock', x, z, rng.range(0, 6.28));
    put++;
  }
  PLAQUE_SITES.forEach(([x, z], no) => {
    const y = groundAt(x, z);
    w.spawn({ plaque: { x, y: y + 0.3, z, hx: x, hz: z, no, size: 0.5, material: 'material:rbrass', yaw: 0 } });
  });
  PEBBLE_SITES.forEach(([x, z], no) => {
    w.spawn({
      pebble: { x, y: groundAt(x, z) + 0.1, z, found: 0, no, size: 0.22, material: 'material:rcoral', yaw: 0.5 },
    });
  });
  void ring;
  void mark;
}
