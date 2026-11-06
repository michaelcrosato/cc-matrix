/**
 * @file The island's standing things: the cast, the station props, plaques, hidden pebbles, the cairn; and each step's
 * world work (hidden pebbles picked up, the sea drifting, the story tilt's drinks and drifting props).
 *
 * Game code, sim-side.
 *
 * @example
 * // buildIsland(w); // once, in setup
 */
import { spawnProp } from '../../../engine/sim-api';
import { spawnCast } from '../cast/roster';
import type { GameWorld } from './components';
import { HIDDEN_PEBBLES, PLAQUES } from './data/plaques';
import { ANNEX_OFFSETS, FLAT_Y, MAT_OFFSETS, PLUMB_AT, SEA_Y, STATIONS } from './data/stations';
import { castOf } from './events/kit';
import { flowOf, groundAt, islandOf } from './flow';
import { spawnCritters, spawnJudges } from './critters';

/** The most pebbles the cairn draws. */
const CAIRN_MAX = 60;
/** Where the cairn stands. */
export const CAIRN_AT = [-4, 39] as const;
/** The world's step, as a number. */
const tickOf = (w: GameWorld): number => w.tick;

/** Where each person spends each day: x, z. */
export function homeOf(who: string, day: number): [number, number] {
  const spots: Record<string, readonly (readonly [number, number])[]> = {
    gerald: [
      [-8, 28],
      [40, 18],
      [-44, 70],
      [10, -52],
      [62, 12],
    ],
    bex: [
      [10, 40],
      [-40, 24],
      [-52, 78],
      [24, -44],
      [66, 8],
    ],
    nan: [
      [-14, 36],
      [46, 30],
      [-60, 80],
      [-6, -74],
      [74, 4],
    ],
    plumb: [
      [-52, 14],
      [-52, 14],
      [52, 14],
      [-4, -68],
      [-52, 14],
    ],
    tare: [
      [3, 40],
      [3, 40],
      [3, 40],
      [3, 40],
      [3, 40],
    ],
  };
  const list = spots[who] ?? [[0, 30]];
  return [list[Math.min(day, list.length) - 1][0], list[Math.min(day, list.length) - 1][1]];
}

/** Dresses the Guest: their body and build, by id, on the actor already standing. */
export function respawnGuest(w: GameWorld, body: string, build: string): void {
  const guest = w.query('cast', 'puppet', 'animator').find((e) => e.cast.who === 'guest');
  if (!guest) return;
  guest.puppet.body = body;
  guest.animator.build = build;
}

/** The stands: where each standing prop goes, on the ground. */
const STANDING: readonly (readonly [string, number, number, number?])[] = [
  ['prop:platform', 0, 35],
  ['prop:noticeboard', 7, 27],
  ['prop:pavilion', STATIONS.pavilion.x, STATIONS.pavilion.z],
  ['prop:annex', STATIONS.annex.x, STATIONS.annex.z],
  ['prop:annexWall', STATIONS.annex.x, STATIONS.annex.z - 8.6],
  ['prop:hut', 64, 52, Math.PI],
  ['prop:hut', 56, 58, Math.PI],
  ['prop:hut', 72, 60, Math.PI],
  ['prop:lighthouse', STATIONS.lighthouse.x, STATIONS.lighthouse.z],
  ['prop:centreStone', STATIONS.centre.x, STATIONS.centre.z],
  ['prop:retreatBench', -8, 46, Math.PI],
  ['prop:retreatBench', 36, -34, 0.5],
  ['prop:retreatBench', -48, 44, -0.4],
  ['prop:parasol', -30, 92],
  ['prop:parasol', 44, 92],
  ['prop:parasol', 70, 80],
  ['prop:terraceMark', STATIONS.eastTerrace.x, STATIONS.eastTerrace.z],
  ['prop:drink', -12, 30],
  ['prop:drink', 12, 30],
  ['prop:drink', 60, 40],
];

/** Palms and rocks, for the brochure. */
const SCENERY: readonly (readonly [string, number, number])[] = [
  ['prop:palm', -24, 62], ['prop:palm', 22, 68], ['prop:palm', 78, 44], ['prop:palm', -78, 40], ['prop:palm', -44, 56],
  ['prop:palm', 40, 74], ['prop:palm', -18, 80], ['prop:palm', 88, 34], ['prop:palm', 28, -74], ['prop:palm', -44, -62],
  ['prop:palm', -66, 60], ['prop:palm', 60, -36], ['prop:palm', -92, 22], ['prop:palm', 96, -20],
  ['prop:rock', -86, -44], ['prop:rock', 92, -52], ['prop:rock', 40, -88], ['prop:rock', -40, -88], ['prop:rock', 94, 40], ['prop:rock', -100, 40],
]; // prettier-ignore

/** Stands everyone and everything. */
export function buildIsland(w: GameWorld): number[] {
  const { x, z } = STATIONS.plaza;
  const guest = spawnCast(w, 'guest', x, groundAt(w, x, z + 6), z + 6, Math.PI, { body: 'body:guest0.coral', build: 'build:guest0', speed: 5.4 }); // prettier-ignore
  const ids: Record<string, number> = {};
  for (const who of ['plumb', 'tare', 'gerald', 'bex', 'nan']) {
    const [hx, hz] = homeOf(who, 1);
    ids[who] = spawnCast(w, who, hx, groundAt(w, hx, hz), hz, Math.PI);
  }
  spawnCritters(w);
  spawnJudges(w);
  spawnProp(w, { prop: 'prop:sea', at: [0, SEA_Y, 0], yaw: 0 }, { components: { sea: {} } });
  spawnProp(w, { prop: 'prop:skirt', at: [0, 0, 0], yaw: 0 });
  spawnProp(w, { prop: 'prop:pondWater', at: [STATIONS.pond.x, 4.25, STATIONS.pond.z + 6], yaw: 0 });
  spawnProp(w, { prop: 'prop:jetty', at: [STATIONS.pond.x, STATIONS.pond.y - 0.1, STATIONS.pond.z + 1.8], yaw: 0 });
  spawnProp(w, { prop: 'prop:pier', at: [0, 3.2, 98], yaw: 0 });
  spawnProp(w, { prop: 'prop:ferry', at: [-12, SEA_Y - 0.6, 120], yaw: 0.2 }, { components: { ferry: {} } });
  for (const [id, sx, sz, yaw] of [...STANDING, ...SCENERY] as (readonly [string, number, number, number?])[]) {
    spawnProp(w, {
      prop: id,
      at: [sx, groundAt(w, sx, sz) + (id === 'prop:pavilion' || id === 'prop:annex' ? 0.02 : 0), sz],
      yaw: yaw ?? 0,
    });
  }
  for (let m = 0; m < 4; m++) {
    const [ox, oz] = MAT_OFFSETS[m];
    const [mx, mz] = [STATIONS.pavilion.x + ox, STATIONS.pavilion.z + oz];
    spawnProp(w, { prop: 'prop:mat.plain', at: [mx, groundAt(w, mx, mz) + 0.12, mz], yaw: 0 });
  }
  spawnProp(w, {
    prop: 'prop:mat.plain',
    at: [STATIONS.pavilion.x + PLUMB_AT[0], FLAT_Y + 0.12, STATIONS.pavilion.z + PLUMB_AT[1]],
    yaw: 0,
  });
  for (let i = 0; i < 4; i++) {
    const [ox, oz] = ANNEX_OFFSETS[i];
    const [mx, mz] = [STATIONS.annex.x + ox, STATIONS.annex.z + oz];
    spawnProp(w, { prop: 'prop:mat.plain', at: [mx, FLAT_Y + 0.12, mz], yaw: 0 });
  }
  PLAQUES.forEach(([px, pz], index) => {
    const prop = spawnProp(w, { prop: 'prop:plaque', at: [px, groundAt(w, px, pz), pz], yaw: Math.atan2(px, pz) });
    w.spawn({ plaque: { index, x: px, z: pz, prop } });
  });
  HIDDEN_PEBBLES.forEach(([px, pz], index) => {
    const prop = spawnProp(w, { prop: 'prop:hiddenPebble', at: [px, groundAt(w, px, pz) + 0.05, pz], yaw: index });
    w.spawn({ pebble: { index, prop } });
  });
  // Drinks on their little tables: they slide, a little more each day. That is a feature of the drink.
  for (const [dx, dz, phase] of [
    [-12, 30, 0],
    [12, 30, 1.7],
    [60, 40, 3.1],
  ] as const) {
    spawnProp(
      w,
      { prop: 'prop:glass', at: [dx, groundAt(w, dx, dz) + 0.79, dz], yaw: phase },
      { components: { slider: { x: dx, phase, span: 0.03 } } },
    );
  }
  // The display tray on the terrace: from Day 4 its marble rolls with nobody there.
  const [tx, tz] = [STATIONS.terrace.x + 5, STATIONS.terrace.z - 2];
  spawnProp(w, { prop: 'prop:tray', at: [tx, groundAt(w, tx, tz) + 0.5, tz], yaw: 0.2 });
  spawnProp(
    w,
    { prop: 'prop:marbleRed', at: [tx, -30, tz], yaw: 0 },
    { components: { roller: { x: tx, z: tz, y: groundAt(w, tx, tz) + 0.56 } } },
  );
  spawnProp(w, { prop: 'prop:sign', at: [6, groundAt(w, 6, 74), 74], yaw: Math.PI });
  return [guest, ids.gerald, ids.bex, ids.nan];
}

/** Keeps the cairn's pebbles up with the count: one by one, with a clack, leaning by your last Wobble Age. */
export function syncCairn(w: GameWorld, quiet = false): void {
  const flow = flowOf(w);
  const stones = w.query('cairnStone');
  const want = Math.min(flow.pebbles, CAIRN_MAX);
  const lean = flow.ages.length ? Math.max(0, (flow.ages[flow.ages.length - 1] - 18) / 64) : 0.5;
  for (let index = stones.length; index < want; index++) {
    const [px, py, pz] = cairnSpot(index, lean);
    const prop = spawnProp(w, { prop: `prop:pebble${index % 6}`, at: [px, py, pz], yaw: index * 1.7 });
    w.spawn({ cairnStone: { index, prop } });
    if (!quiet) w.emit('clack', { n: index, x: px, y: py, z: pz });
  }
  for (const e of stones) {
    const prop = w.get(e.cairnStone.prop);
    if (prop?.sceneProp) {
      const [px, py, pz] = cairnSpot(e.cairnStone.index, lean);
      Object.assign(prop.sceneProp, { x: px, y: py, z: pz });
    }
  }
}

/** Takes away hidden pebbles already found. */
export function syncFinds(w: GameWorld): void {
  const flow = flowOf(w);
  for (const e of w.query('pebble')) {
    const prop = w.get(e.pebble.prop);
    if (prop?.sceneProp && flow.found.includes(e.pebble.index)) prop.sceneProp.y = -30;
  }
}

/** Where the `index`th cairn pebble sits: a tall stack in the Plaza, leaning by `lean`. */
function cairnSpot(index: number, lean: number): [number, number, number] {
  const [cx, cz] = CAIRN_AT;
  const layer = Math.floor(index / 3);
  const a = index * 2.399;
  const r = Math.max(0.05, 0.42 - layer * 0.022);
  const y = FLAT_Y + 0.02 + layer * 0.17;
  const tip = layer * 0.012 * lean * 3;
  return [cx + Math.cos(a) * r * 0.6 + tip, y, cz + Math.sin(a) * r * 0.6 + tip * 0.4];
}

/** Picks up hidden pebbles; keeps the sea drifting; lets drinks slide. */
export function stepIsland(w: GameWorld): void {
  const flow = flowOf(w);
  const island = islandOf(w);
  const guest = castOf(w, 'guest');
  const actor = guest ? w.get(guest.id)?.actor : undefined;
  if (actor && flow.mode === 'roam') {
    for (const e of w.query('pebble')) {
      const { index } = e.pebble;
      if (flow.found.includes(index)) continue;
      const [px, pz] = HIDDEN_PEBBLES[index];
      if (Math.hypot(actor.x - px, actor.z - pz) < 1.3) {
        flow.found.push(index);
        flow.pebbles += 1;
        const prop = w.get(e.pebble.prop);
        if (prop?.sceneProp) prop.sceneProp.y = -30;
        w.emit('pebbleFound', { index, total: flow.found.filter((f) => f < 100).length });
        syncCairn(w);
      }
    }
  }
  for (const e of w.query('sea', 'sceneProp')) {
    e.sceneProp.x = Math.sin(island.seaX) * 6 + Math.cos(tickOf(w) * 0.0005) * 2;
    e.sceneProp.z = Math.cos(island.seaZ) * 6;
    e.sceneProp.y = SEA_Y + Math.sin(tickOf(w) * 0.02) * 0.04;
    // The sea counter-rotates, so the horizon stays level on screen while the island tips.
    const [ax, az] = [(island.tiltZ * 0.35 * Math.PI) / 360, (island.tiltX * 0.35 * Math.PI) / 360];
    const ww = Math.sqrt(Math.max(0, 1 - ax * ax - az * az));
    e.sceneProp.q = [ax, 0, az, ww];
  }
  for (const e of w.query('slider', 'sceneProp')) {
    // Drinks slide along tables: story tilt, a very little, a little more each day.
    const slide = Math.sin(tickOf(w) * 0.004 + e.slider.phase) * e.slider.span * island.tilt * 4;
    e.sceneProp.x = e.slider.x + slide;
  }
  for (const e of w.query('roller', 'sceneProp')) {
    // From Day 4 the marble rolls with nobody there.
    const on = flow.day >= 4;
    const t = tickOf(w) * 0.012;
    e.sceneProp.x = e.roller.x + Math.sin(t) * 0.9;
    e.sceneProp.z = e.roller.z + Math.cos(t * 0.7) * 0.8;
    e.sceneProp.y = on ? e.roller.y : -30;
  }
  for (const e of w.query('ferry', 'sceneProp')) {
    // The ferry leaves on Day 1, and is a dot from then on.
    e.ferry.t += 1;
    const u = flow.day === 1 && flow.done.length === 0 ? Math.min(1, e.ferry.t / 3600) : 1;
    e.sceneProp.z = 120 + u * 260;
    e.sceneProp.x = -12 - u * 60;
  }
}
